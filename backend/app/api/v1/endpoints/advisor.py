from datetime import date
from typing import Optional
from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.schemas.advisor import (
    AdvisorChatRequest,
    FinancialAdviceResponse,
    BudgetAuditResponse,
)
from app.services.gemini_service import gemini_service
from app.services.expense_service import expense_service

router = APIRouter()


@router.post(
    "/chat",
    response_model=FinancialAdviceResponse,
    summary="Ask AI Financial Advisor a question with live expense context",
    description="Uses Gemini 3.8 Flash with structured output to analyze spending history and provide customized financial guidance.",
)
async def ask_financial_advisor(
    request: AdvisorChatRequest,
    db: Session = Depends(get_db),
):
    # Fetch spending summary & recent transactions to ground Gemini's analysis
    summary = expense_service.get_spending_analytics(
        db=db,
        start_date=request.start_date,
        end_date=request.end_date,
    )
    recent = expense_service.get_recent_expenses_for_ai(db=db, limit=40)

    advice = await gemini_service.generate_financial_advice(
        user_question=request.question,
        expenses_summary=summary,
        recent_expenses=recent,
    )
    return advice


@router.get(
    "/audit",
    response_model=BudgetAuditResponse,
    summary="Run AI budget audit and anomaly scan for a target month",
    description="Evaluates budget overruns, detects duplicate charges or unusual spikes, and calculates a financial health score.",
)
async def audit_monthly_budget(
    month: Optional[str] = Query(
        None,
        description="Target month in YYYY-MM format. Defaults to current month.",
    ),
    db: Session = Depends(get_db),
):
    target_month = month or date.today().strftime("%Y-%m")

    # Fetch monthly summary & transactions
    summary = expense_service.get_spending_analytics(db=db)
    budgets = expense_service.get_budgets_for_month(db=db, month_str=target_month)
    transactions = expense_service.get_recent_expenses_for_ai(db=db, limit=50)

    audit_result = await gemini_service.audit_budget_and_anomalies(
        month=target_month,
        category_breakdown=summary["by_category"],
        budgets=budgets,
        transactions=transactions,
    )
    return audit_result
