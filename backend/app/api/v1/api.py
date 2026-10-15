from fastapi import APIRouter

from app.api.v1.endpoints import receipts, expenses, analytics, advisor, health

api_router = APIRouter()

api_router.include_router(health.router, tags=["Health"])
api_router.include_router(receipts.router, prefix="/receipts", tags=["Receipts & AI OCR"])
api_router.include_router(expenses.router, prefix="/expenses", tags=["Expenses"])
api_router.include_router(analytics.router, prefix="/analytics", tags=["Analytics & Trends"])
api_router.include_router(advisor.router, prefix="/advisor", tags=["AI Financial Advisor"])
