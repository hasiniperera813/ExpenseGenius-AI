from datetime import date
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.schemas.expense import (
    ExpenseCreate,
    ExpenseUpdate,
    ExpenseResponse,
    ExpenseListResponse,
    ExpenseFilterParams,
)
from app.services.expense_service import expense_service

router = APIRouter()


@router.get(
    "/",
    response_model=ExpenseListResponse,
    summary="List expenses with filtering & pagination",
)
def list_expenses(
    category: Optional[str] = Query(None, description="Filter by category"),
    merchant: Optional[str] = Query(None, description="Filter by merchant"),
    start_date: Optional[date] = Query(None, description="Filter by start date (YYYY-MM-DD)"),
    end_date: Optional[date] = Query(None, description="Filter by end date (YYYY-MM-DD)"),
    min_amount: Optional[float] = Query(None, description="Minimum amount"),
    max_amount: Optional[float] = Query(None, description="Maximum amount"),
    search: Optional[str] = Query(None, description="Search term in title, merchant, or notes"),
    page: int = Query(1, ge=1, description="Page number"),
    page_size: int = Query(20, ge=1, le=100, description="Items per page"),
    db: Session = Depends(get_db),
):
    filters = ExpenseFilterParams(
        category=category,
        merchant=merchant,
        start_date=start_date,
        end_date=end_date,
        min_amount=min_amount,
        max_amount=max_amount,
        search=search,
        page=page,
        page_size=page_size,
    )

    expenses, total_count, total_amount = expense_service.list_expenses(db, filters)

    return ExpenseListResponse(
        total_count=total_count,
        total_amount=total_amount,
        page=page,
        page_size=page_size,
        expenses=expenses,
    )


@router.post(
    "/",
    response_model=ExpenseResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Create a new expense manually",
)
def create_expense(
    expense_in: ExpenseCreate,
    db: Session = Depends(get_db),
):
    return expense_service.create_expense(db, expense_in)


@router.get(
    "/{expense_id}",
    response_model=ExpenseResponse,
    summary="Get expense by ID",
)
def get_expense(
    expense_id: int,
    db: Session = Depends(get_db),
):
    expense = expense_service.get_expense(db, expense_id)
    if not expense:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Expense with ID {expense_id} not found.",
        )
    return expense


@router.put(
    "/{expense_id}",
    response_model=ExpenseResponse,
    summary="Update an existing expense",
)
def update_expense(
    expense_id: int,
    expense_in: ExpenseUpdate,
    db: Session = Depends(get_db),
):
    updated = expense_service.update_expense(db, expense_id, expense_in)
    if not updated:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Expense with ID {expense_id} not found.",
        )
    return updated


@router.delete(
    "/{expense_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Delete an expense",
)
def delete_expense(
    expense_id: int,
    db: Session = Depends(get_db),
):
    success = expense_service.delete_expense(db, expense_id)
    if not success:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Expense with ID {expense_id} not found.",
        )
    return None
