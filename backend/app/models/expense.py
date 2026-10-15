from datetime import datetime, date
from sqlalchemy import (
    Column,
    Integer,
    String,
    Float,
    Boolean,
    DateTime,
    Date,
    ForeignKey,
    Text,
)
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func

from app.core.database import Base


class Expense(Base):
    """Represents an overall expense record."""

    __tablename__ = "expenses"

    id = Column(Integer, primary_key=True, index=True)
    title = Column(String(255), nullable=False)
    amount = Column(Float, nullable=False)
    currency = Column(String(10), default="LKR", nullable=False)
    category = Column(String(100), default="Other", index=True, nullable=False)
    date = Column(Date, default=date.today, nullable=False)
    merchant = Column(String(255), nullable=True, index=True)
    payment_method = Column(String(50), nullable=True)
    description = Column(Text, nullable=True)
    receipt_url = Column(String(500), nullable=True)
    is_recurring = Column(Boolean, default=False, nullable=False)
    raw_gemini_extraction = Column(Text, nullable=True)

    created_at = Column(DateTime, server_default=func.now(), nullable=False)
    updated_at = Column(
        DateTime, server_default=func.now(), onupdate=func.now(), nullable=False
    )

    # Relationships
    items = relationship(
        "ExpenseItem", back_populates="expense", cascade="all, delete-orphan"
    )

    def __repr__(self) -> str:
        return f"<Expense(id={self.id}, title='{self.title}', amount={self.amount}, category='{self.category}')>"


class ExpenseItem(Base):
    """Represents individual itemized line items from a receipt or breakdown."""

    __tablename__ = "expense_items"

    id = Column(Integer, primary_key=True, index=True)
    expense_id = Column(Integer, ForeignKey("expenses.id", ondelete="CASCADE"), nullable=False)
    name = Column(String(255), nullable=False)
    quantity = Column(Float, default=1.0, nullable=False)
    unit_price = Column(Float, nullable=True)
    total_price = Column(Float, nullable=False)

    # Relationship
    expense = relationship("Expense", back_populates="items")

    def __repr__(self) -> str:
        return f"<ExpenseItem(id={self.id}, name='{self.name}', total={self.total_price})>"


class Category(Base):
    """Predefined or user-defined categories for budgeting and classification."""

    __tablename__ = "categories"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100), unique=True, index=True, nullable=False)
    description = Column(String(255), nullable=True)
    color = Column(String(20), default="#4F46E5", nullable=False)
    icon = Column(String(50), default="receipt", nullable=False)

    def __repr__(self) -> str:
        return f"<Category(id={self.id}, name='{self.name}')>"


class Budget(Base):
    """Monthly budget limits per category for tracking and AI advisory."""

    __tablename__ = "budgets"

    id = Column(Integer, primary_key=True, index=True)
    category = Column(String(100), nullable=False, index=True)
    monthly_limit = Column(Float, nullable=False)
    month = Column(String(7), nullable=False, index=True)  # Format: "YYYY-MM"

    def __repr__(self) -> str:
        return f"<Budget(category='{self.category}', month='{self.month}', limit={self.monthly_limit})>"
