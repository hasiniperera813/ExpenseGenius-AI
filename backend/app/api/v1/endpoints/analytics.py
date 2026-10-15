from datetime import date
from typing import Optional
from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.schemas.analytics import SpendingAnalyticsResponse
from app.services.expense_service import expense_service

router = APIRouter()


@router.get(
    "/summary",
    response_model=SpendingAnalyticsResponse,
    summary="Get aggregated spending analytics and breakdown",
)
def get_analytics_summary(
    start_date: Optional[date] = Query(None, description="Start date (YYYY-MM-DD)"),
    end_date: Optional[date] = Query(None, description="End date (YYYY-MM-DD)"),
    db: Session = Depends(get_db),
):
    analytics = expense_service.get_spending_analytics(
        db=db,
        start_date=start_date,
        end_date=end_date,
    )
    return SpendingAnalyticsResponse(**analytics)
