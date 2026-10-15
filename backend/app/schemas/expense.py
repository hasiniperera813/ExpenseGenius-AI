from datetime import date, datetime
from typing import List, Optional
from pydantic import BaseModel, ConfigDict, Field


class ExpenseItemBase(BaseModel):
    name: str
    quantity: float = 1.0
    unit_price: Optional[float] = None
    total_price: float


class ExpenseItemCreate(ExpenseItemBase):
    pass


class ExpenseItemResponse(ExpenseItemBase):
    id: int
    expense_id: int

    model_config = ConfigDict(from_attributes=True)


class ExpenseBase(BaseModel):
    title: str
    amount: float = Field(gt=0, description="Expense amount must be greater than zero")
    currency: str = "LKR"
    category: str = "Other"
    date: date
    merchant: Optional[str] = None
    payment_method: Optional[str] = None
    description: Optional[str] = None
    receipt_url: Optional[str] = None
    is_recurring: bool = False


class ExpenseCreate(ExpenseBase):
    items: Optional[List[ExpenseItemCreate]] = None
    raw_gemini_extraction: Optional[str] = None


class ExpenseUpdate(BaseModel):
    title: Optional[str] = None
    amount: Optional[float] = Field(default=None, gt=0)
    currency: Optional[str] = None
    category: Optional[str] = None
    date: Optional[date] = None
    merchant: Optional[str] = None
    payment_method: Optional[str] = None
    description: Optional[str] = None
    receipt_url: Optional[str] = None
    is_recurring: Optional[bool] = None
    items: Optional[List[ExpenseItemCreate]] = None


class ExpenseResponse(ExpenseBase):
    id: int
    raw_gemini_extraction: Optional[str] = None
    created_at: datetime
    updated_at: datetime
    items: List[ExpenseItemResponse] = []

    model_config = ConfigDict(from_attributes=True)


class ExpenseListResponse(BaseModel):
    total_count: int
    total_amount: float
    page: int
    page_size: int
    expenses: List[ExpenseResponse]


class ExpenseFilterParams(BaseModel):
    category: Optional[str] = None
    merchant: Optional[str] = None
    start_date: Optional[date] = None
    end_date: Optional[date] = None
    min_amount: Optional[float] = None
    max_amount: Optional[float] = None
    search: Optional[str] = None
    page: int = 1
    page_size: int = 50
