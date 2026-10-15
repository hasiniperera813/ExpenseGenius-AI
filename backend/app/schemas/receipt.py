from typing import List, Optional
from pydantic import BaseModel, Field


class ParsedLineItem(BaseModel):
    """Individual line item detected on receipt."""

    name: str = Field(description="Name or short description of the purchased item or service.")
    quantity: float = Field(default=1.0, description="Quantity of items purchased. Default to 1.0 if not specified.")
    unit_price: Optional[float] = Field(default=None, description="Price per individual unit, if specified.")
    total_price: float = Field(description="Total price for this line item.")


class ExtractedReceiptData(BaseModel):
    """Structured receipt data extracted by Gemini multimodal analysis."""

    merchant_name: Optional[str] = Field(
        default=None,
        description="The store, company, or vendor name where the transaction occurred."
    )
    transaction_date: Optional[str] = Field(
        default=None,
        description="Date of the receipt in YYYY-MM-DD format if identifiable, or original date string."
    )
    total_amount: float = Field(
        description="Final total amount charged on the receipt."
    )
    subtotal_amount: Optional[float] = Field(
        default=None,
        description="Subtotal amount before tax or discounts."
    )
    tax_amount: Optional[float] = Field(
        default=None,
        description="Tax or VAT amount charged."
    )
    tip_or_service_charge: Optional[float] = Field(
        default=None,
        description="Tip or service fee if present."
    )
    currency: str = Field(
        default="LKR",
        description="Currency code such as LKR, USD, EUR, GBP, INR, etc.; default to LKR."
    )
    payment_method: Optional[str] = Field(
        default=None,
        description="Payment method used (e.g., Visa, Mastercard, Cash, Debit, Apple Pay)."
    )
    suggested_category: str = Field(
        default="Other",
        description="Standard expense category: Food & Dining, Groceries, Transportation, Travel, Utilities, Office Supplies, Healthcare, Entertainment, Shopping, or Other."
    )
    line_items: List[ParsedLineItem] = Field(
        default_factory=list,
        description="List of individual items purchased on the receipt."
    )
    confidence_score: float = Field(
        default=1.0,
        description="Confidence score from 0.0 to 1.0 indicating clarity and extraction quality."
    )
    notes: Optional[str] = Field(
        default=None,
        description="Any additional notes or flags (e.g. blurry image, partial receipt, duplicate detected)."
    )


class ReceiptUploadResponse(BaseModel):
    """Response returned to client after uploading and parsing a receipt."""

    filename: str
    file_url: str
    mime_type: str
    file_size_bytes: int
    extracted_data: ExtractedReceiptData
    auto_created_expense_id: Optional[int] = None
