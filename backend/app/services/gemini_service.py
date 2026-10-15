import asyncio
import json
import logging
from typing import Any, Dict, List, Optional
from google import genai
from fastapi import HTTPException, status
import httpx

from app.core.config import settings
from app.schemas.receipt import ExtractedReceiptData
from app.schemas.advisor import FinancialAdviceResponse, BudgetAuditResponse
from app.utils.file_handler import get_gemini_input_part

logger = logging.getLogger(__name__)


class GeminiService:
    """Service wrapping Google Gemini API operations for receipt OCR and financial analysis."""

    def __init__(self) -> None:
        self.model = settings.GEMINI_MODEL
        self._client: Optional[genai.Client] = None

    @property
    def client(self) -> genai.Client:
        """Lazy-loaded Google GenAI client instance."""
        if self._client is None:
            if not settings.is_gemini_configured:
                raise HTTPException(
                    status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                    detail=(
                        "Gemini API key is not configured. Please set GEMINI_API_KEY in your "
                        "backend/.env file or environment variables."
                    ),
                )
            self._client = genai.Client(api_key=settings.GEMINI_API_KEY)
        return self._client

    async def extract_receipt_data(
        self,
        file_bytes: bytes,
        mime_type: str,
    ) -> ExtractedReceiptData:
        """
        Processes a receipt image or PDF document with Gemini 3.8 Flash,
        extracting line items, merchant, tax, totals, category, and date into structured JSON.
        """
        file_part = get_gemini_input_part(file_bytes, mime_type)

        extraction_prompt = (
            "You are an expert AI expense auditor and receipt scanner. "
            "Analyze the provided receipt or invoice image/document thoroughly. "
            "Extract all relevant transaction details, including merchant name, date, subtotal, tax, "
            "total amount, currency, payment method, category, and individual itemized line items. "
            "If any field is unclear, make your best reasonable inference based on the receipt layout "
            "and note it in the notes field. Always return valid structured data adhering to the schema."
        )

        models_to_try = [self.model]
        fallback_model = "gemini-3.5-flash-lite" if self.model != "gemini-3.5-flash-lite" else "gemini-3.8-flash"
        if fallback_model not in models_to_try:
            models_to_try.append(fallback_model)

        deadline = asyncio.get_running_loop().time() + 60.0
        last_error = None
        for current_model in models_to_try:
            remaining_timeout = deadline - asyncio.get_running_loop().time()
            if remaining_timeout <= 0:
                raise HTTPException(
                    status_code=status.HTTP_504_GATEWAY_TIMEOUT,
                    detail="Receipt scanning timed out. Check your internet connection and try again.",
                )
            try:
                interaction = await asyncio.to_thread(
                    self.client.interactions.create,
                    model=current_model,
                    input=[
                        {"type": "text", "text": extraction_prompt},
                        file_part,
                    ],
                    response_format={
                        "type": "text",
                        "mime_type": "application/json",
                        "schema": ExtractedReceiptData.model_json_schema(),
                    },
                    timeout=remaining_timeout,
                )

                if not interaction.output_text:
                    raise ValueError(f"Gemini ({current_model}) returned an empty response.")

                parsed_data = ExtractedReceiptData.model_validate_json(interaction.output_text)
                return parsed_data

            except httpx.TimeoutException as e:
                logger.error("Receipt extraction timed out using model %s.", current_model)
                raise HTTPException(
                    status_code=status.HTTP_504_GATEWAY_TIMEOUT,
                    detail="Receipt scanning timed out. Check your internet connection and try again.",
                ) from e
            except Exception as e:
                err_str = str(e).lower()
                logger.warning(f"Attempt with model {current_model} failed: {e}")
                last_error = e
                # If rate limited (429), try next model
                if "rate limit" in err_str or "429" in err_str or "too_many_requests" in err_str:
                    continue
                break

        logger.error(f"Error during Gemini receipt extraction: {last_error}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to extract receipt data using Gemini: {str(last_error)}",
        )

    async def generate_financial_advice(
        self,
        user_question: str,
        expenses_summary: Dict[str, Any],
        recent_expenses: List[Dict[str, Any]],
    ) -> FinancialAdviceResponse:
        """
        Provides AI financial advice, spending insights, and actionable tips
        based on real expense history.
        """
        context_prompt = (
            "You are a savvy, supportive personal finance assistant and spending optimizer. "
            "Analyze the user's spending data and answer their question with clear, empathetic, "
            "and highly actionable financial advice. Format monetary amounts in Sri Lankan rupees (Rs/LKR), "
            "not US dollars.\n\n"
            f"User Question: {user_question}\n\n"
            f"Overall Spending Summary: {json.dumps(expenses_summary, indent=2)}\n\n"
            f"Recent Expenses (sample): {json.dumps(recent_expenses[:30], indent=2, default=str)}\n\n"
            "Provide a crisp headline, thorough answer, distinct categorized insights (saving opportunities, "
            "warnings, anomalies), concrete next steps, and highlight their top spending category."
        )

        models_to_try = [self.model]
        fallback_model = "gemini-3.5-flash-lite" if self.model != "gemini-3.5-flash-lite" else "gemini-3.8-flash"
        if fallback_model not in models_to_try:
            models_to_try.append(fallback_model)

        last_error = None
        for current_model in models_to_try:
            try:
                interaction = self.client.interactions.create(
                    model=current_model,
                    input=context_prompt,
                    response_format={
                        "type": "text",
                        "mime_type": "application/json",
                        "schema": FinancialAdviceResponse.model_json_schema(),
                    },
                )

                if not interaction.output_text:
                    raise ValueError(f"Gemini ({current_model}) returned an empty advice response.")

                return FinancialAdviceResponse.model_validate_json(interaction.output_text)

            except Exception as e:
                err_str = str(e).lower()
                logger.warning(f"Advice attempt with model {current_model} failed: {e}")
                last_error = e
                if "rate limit" in err_str or "429" in err_str or "too_many_requests" in err_str:
                    continue
                break

        logger.error(f"Error during Gemini financial advice generation: {last_error}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to generate financial advice using Gemini: {str(last_error)}",
        )

    async def audit_budget_and_anomalies(
        self,
        month: str,
        category_breakdown: List[Dict[str, Any]],
        budgets: List[Dict[str, Any]],
        transactions: List[Dict[str, Any]],
    ) -> BudgetAuditResponse:
        """
        Audits monthly expenses, detecting abnormal spikes, recurring duplicate charges,
        budget overruns, and assigning an overall financial discipline health score.
        """
        audit_prompt = (
            f"You are an AI financial auditor. Perform a deep audit of the user's expenses for month: {month}.\n\n"
            f"Category Breakdown: {json.dumps(category_breakdown, indent=2)}\n\n"
            f"Monthly Budgets: {json.dumps(budgets, indent=2)}\n\n"
            f"Transactions: {json.dumps(transactions[:50], indent=2, default=str)}\n\n"
            "Determine an overall financial health score (0-100), identify overspent categories, "
            "detect suspicious or unusual anomalies (e.g. rapid repeat purchases, unusual amounts), "
            "and provide targeted corrective actions."
        )

        models_to_try = [self.model]
        fallback_model = "gemini-3.5-flash-lite" if self.model != "gemini-3.5-flash-lite" else "gemini-3.8-flash"
        if fallback_model not in models_to_try:
            models_to_try.append(fallback_model)

        last_error = None
        for current_model in models_to_try:
            try:
                interaction = self.client.interactions.create(
                    model=current_model,
                    input=audit_prompt,
                    response_format={
                        "type": "text",
                        "mime_type": "application/json",
                        "schema": BudgetAuditResponse.model_json_schema(),
                    },
                )

                if not interaction.output_text:
                    raise ValueError(f"Gemini ({current_model}) returned an empty audit response.")

                return BudgetAuditResponse.model_validate_json(interaction.output_text)

            except Exception as e:
                err_str = str(e).lower()
                logger.warning(f"Audit attempt with model {current_model} failed: {e}")
                last_error = e
                if "rate limit" in err_str or "429" in err_str or "too_many_requests" in err_str:
                    continue
                break

        logger.error(f"Error during Gemini budget audit: {last_error}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to audit budget using Gemini: {str(last_error)}",
        )


gemini_service = GeminiService()
