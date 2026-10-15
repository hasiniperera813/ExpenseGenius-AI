from typing import List, Optional
from pydantic import BaseModel


class CategoryBreakdownItem(BaseModel):
    category: str
    total_amount: float
    percentage: float
    transaction_count: int


class MonthlyTrendItem(BaseModel):
    month: str  # Format: "YYYY-MM"
    total_amount: float
    transaction_count: int


class SpendingAnalyticsResponse(BaseModel):
    total_spent: float
    total_transactions: int
    average_transaction_amount: float
    top_spending_category: Optional[str] = None
    currency: str = "LKR"
    by_category: List[CategoryBreakdownItem]
    by_month: List[MonthlyTrendItem]
