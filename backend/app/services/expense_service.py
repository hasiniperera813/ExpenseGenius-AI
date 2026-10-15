from datetime import date
from typing import Dict, List, Optional, Tuple, Any
from sqlalchemy import func, desc, extract
from sqlalchemy.orm import Session, joinedload

from app.models.expense import Expense, ExpenseItem, Budget
from app.schemas.expense import ExpenseCreate, ExpenseUpdate, ExpenseFilterParams
from app.schemas.receipt import ExtractedReceiptData


class ExpenseService:
    """Business logic for expense management, filtering, and aggregation."""

    def create_expense(self, db: Session, expense_in: ExpenseCreate) -> Expense:
        """Create a new expense with optional line items."""
        db_expense = Expense(
            title=expense_in.title,
            amount=expense_in.amount,
            currency=expense_in.currency,
            category=expense_in.category,
            date=expense_in.date,
            merchant=expense_in.merchant,
            payment_method=expense_in.payment_method,
            description=expense_in.description,
            receipt_url=expense_in.receipt_url,
            is_recurring=expense_in.is_recurring,
            raw_gemini_extraction=expense_in.raw_gemini_extraction,
        )

        if expense_in.items:
            for item_in in expense_in.items:
                db_item = ExpenseItem(
                    name=item_in.name,
                    quantity=item_in.quantity,
                    unit_price=item_in.unit_price,
                    total_price=item_in.total_price,
                )
                db_expense.items.append(db_item)

        db.add(db_expense)
        db.commit()
        db.refresh(db_expense)
        return db_expense

    def create_from_extracted_receipt(
        self,
        db: Session,
        extracted: ExtractedReceiptData,
        receipt_file_url: Optional[str] = None,
    ) -> Expense:
        """Convert structured Gemini receipt extraction into a persisted Expense."""
        title = extracted.merchant_name or "Receipt Expense"
        if extracted.transaction_date:
            try:
                tx_date = date.fromisoformat(extracted.transaction_date[:10])
            except ValueError:
                tx_date = date.today()
        else:
            tx_date = date.today()

        db_expense = Expense(
            title=f"Receipt: {title}",
            amount=extracted.total_amount,
            currency=extracted.currency or "LKR",
            category=extracted.suggested_category or "Other",
            date=tx_date,
            merchant=extracted.merchant_name,
            payment_method=extracted.payment_method,
            description=extracted.notes,
            receipt_url=receipt_file_url,
            raw_gemini_extraction=extracted.model_dump_json(),
        )

        for item in extracted.line_items:
            db_item = ExpenseItem(
                name=item.name,
                quantity=item.quantity,
                unit_price=item.unit_price,
                total_price=item.total_price,
            )
            db_expense.items.append(db_item)

        db.add(db_expense)
        db.commit()
        db.refresh(db_expense)
        return db_expense

    def get_expense(self, db: Session, expense_id: int) -> Optional[Expense]:
        """Fetch single expense with related items."""
        return (
            db.query(Expense)
            .options(joinedload(Expense.items))
            .filter(Expense.id == expense_id)
            .first()
        )

    def list_expenses(
        self, db: Session, filters: ExpenseFilterParams
    ) -> Tuple[List[Expense], int, float]:
        """List expenses with filtering and pagination."""
        query = db.query(Expense).options(joinedload(Expense.items))

        if filters.category:
            query = query.filter(Expense.category.ilike(f"%{filters.category}%"))
        if filters.merchant:
            query = query.filter(Expense.merchant.ilike(f"%{filters.merchant}%"))
        if filters.start_date:
            query = query.filter(Expense.date >= filters.start_date)
        if filters.end_date:
            query = query.filter(Expense.date <= filters.end_date)
        if filters.min_amount is not None:
            query = query.filter(Expense.amount >= filters.min_amount)
        if filters.max_amount is not None:
            query = query.filter(Expense.amount <= filters.max_amount)
        if filters.search:
            search_pattern = f"%{filters.search}%"
            query = query.filter(
                (Expense.title.ilike(search_pattern))
                | (Expense.merchant.ilike(search_pattern))
                | (Expense.description.ilike(search_pattern))
            )

        total_count = query.count()

        # Compute total amount for the filtered set
        sum_query = db.query(func.coalesce(func.sum(Expense.amount), 0.0))
        if filters.category:
            sum_query = sum_query.filter(Expense.category.ilike(f"%{filters.category}%"))
        if filters.merchant:
            sum_query = sum_query.filter(Expense.merchant.ilike(f"%{filters.merchant}%"))
        if filters.start_date:
            sum_query = sum_query.filter(Expense.date >= filters.start_date)
        if filters.end_date:
            sum_query = sum_query.filter(Expense.date <= filters.end_date)
        if filters.min_amount is not None:
            sum_query = sum_query.filter(Expense.amount >= filters.min_amount)
        if filters.max_amount is not None:
            sum_query = sum_query.filter(Expense.amount <= filters.max_amount)
        if filters.search:
            search_pattern = f"%{filters.search}%"
            sum_query = sum_query.filter(
                (Expense.title.ilike(search_pattern))
                | (Expense.merchant.ilike(search_pattern))
                | (Expense.description.ilike(search_pattern))
            )
        total_amount = float(sum_query.scalar() or 0.0)

        # Pagination
        offset = (filters.page - 1) * filters.page_size
        expenses = (
            query.order_by(desc(Expense.date), desc(Expense.id))
            .offset(offset)
            .limit(filters.page_size)
            .all()
        )

        return expenses, total_count, total_amount

    def update_expense(
        self, db: Session, expense_id: int, expense_in: ExpenseUpdate
    ) -> Optional[Expense]:
        """Update an existing expense record."""
        db_expense = self.get_expense(db, expense_id)
        if not db_expense:
            return None

        update_data = expense_in.model_dump(exclude_unset=True)
        items_data = update_data.pop("items", None)

        for field, value in update_data.items():
            setattr(db_expense, field, value)

        if items_data is not None:
            # Replace existing items
            db_expense.items.clear()
            for item_in in items_data:
                db_item = ExpenseItem(
                    name=item_in["name"],
                    quantity=item_in.get("quantity", 1.0),
                    unit_price=item_in.get("unit_price"),
                    total_price=item_in["total_price"],
                )
                db_expense.items.append(db_item)

        db.commit()
        db.refresh(db_expense)
        return db_expense

    def delete_expense(self, db: Session, expense_id: int) -> bool:
        """Delete an expense record."""
        db_expense = self.get_expense(db, expense_id)
        if not db_expense:
            return False
        db.delete(db_expense)
        db.commit()
        return True

    def get_spending_analytics(
        self,
        db: Session,
        start_date: Optional[date] = None,
        end_date: Optional[date] = None,
    ) -> Dict[str, Any]:
        """Generate spending summaries, category breakdowns, and monthly trends."""
        base_query = db.query(Expense)
        if start_date:
            base_query = base_query.filter(Expense.date >= start_date)
        if end_date:
            base_query = base_query.filter(Expense.date <= end_date)

        total_spent = float(
            base_query.with_entities(func.coalesce(func.sum(Expense.amount), 0.0)).scalar()
            or 0.0
        )
        total_tx = base_query.count()
        avg_amount = (total_spent / total_tx) if total_tx > 0 else 0.0

        # Category breakdown
        category_rows = (
            base_query.with_entities(
                Expense.category,
                func.sum(Expense.amount).label("cat_total"),
                func.count(Expense.id).label("cat_count"),
            )
            .group_by(Expense.category)
            .order_by(desc("cat_total"))
            .all()
        )

        by_category = []
        top_category = category_rows[0][0] if category_rows else None
        for cat, cat_sum, cat_cnt in category_rows:
            pct = (cat_sum / total_spent * 100) if total_spent > 0 else 0.0
            by_category.append(
                {
                    "category": cat,
                    "total_amount": round(float(cat_sum), 2),
                    "percentage": round(pct, 1),
                    "transaction_count": cat_cnt,
                }
            )

        # Monthly trend (YYYY-MM)
        # Using string format or extract for SQLite / PostgreSQL
        month_expr = func.strftime("%Y-%m", Expense.date)
        monthly_rows = (
            base_query.with_entities(
                month_expr.label("month_str"),
                func.sum(Expense.amount).label("month_total"),
                func.count(Expense.id).label("month_count"),
            )
            .group_by("month_str")
            .order_by("month_str")
            .all()
        )

        by_month = [
            {
                "month": m,
                "total_amount": round(float(t), 2),
                "transaction_count": c,
            }
            for m, t, c in monthly_rows
            if m is not None
        ]

        return {
            "total_spent": round(total_spent, 2),
            "total_transactions": total_tx,
            "average_transaction_amount": round(avg_amount, 2),
            "top_spending_category": top_category,
            "currency": "LKR",
            "by_category": by_category,
            "by_month": by_month,
        }

    def get_recent_expenses_for_ai(
        self, db: Session, limit: int = 50
    ) -> List[Dict[str, Any]]:
        """Fetch serialized recent expenses to feed into Gemini AI advisor context."""
        expenses = (
            db.query(Expense)
            .order_by(desc(Expense.date), desc(Expense.id))
            .limit(limit)
            .all()
        )
        return [
            {
                "title": exp.title,
                "amount": exp.amount,
                "category": exp.category,
                "date": str(exp.date),
                "merchant": exp.merchant,
                "payment_method": exp.payment_method,
            }
            for exp in expenses
        ]

    def get_budgets_for_month(
        self, db: Session, month_str: str
    ) -> List[Dict[str, Any]]:
        """Fetch category budgets for a given month (YYYY-MM)."""
        budgets = db.query(Budget).filter(Budget.month == month_str).all()
        return [
            {
                "category": b.category,
                "monthly_limit": b.monthly_limit,
                "month": b.month,
            }
            for b in budgets
        ]


expense_service = ExpenseService()
