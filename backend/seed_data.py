"""Seed script to populate database with initial sample expenses and categories."""

from datetime import date, timedelta
from app.core.database import SessionLocal, init_db
from app.models.expense import Expense, ExpenseItem, Category, Budget


def seed():
    init_db()
    db = SessionLocal()

    try:
        # Check if already seeded
        if db.query(Expense).count() > 0:
            print("Database already contains expenses. Skipping seed.")
            return

        print("Seeding initial categories...")
        categories_data = [
            {"name": "Food & Dining", "color": "#EF4444", "icon": "utensils"},
            {"name": "Groceries", "color": "#10B981", "icon": "shopping-cart"},
            {"name": "Transportation", "color": "#F59E0B", "icon": "car"},
            {"name": "Travel", "color": "#3B82F6", "icon": "plane"},
            {"name": "Utilities", "color": "#6366F1", "icon": "bolt"},
            {"name": "Office Supplies", "color": "#8B5CF6", "icon": "briefcase"},
            {"name": "Entertainment", "color": "#EC4899", "icon": "film"},
            {"name": "Healthcare", "color": "#14B8A6", "icon": "heart"},
            {"name": "Other", "color": "#6B7280", "icon": "receipt"},
        ]

        for cat in categories_data:
            existing = db.query(Category).filter(Category.name == cat["name"]).first()
            if not existing:
                db.add(Category(**cat))

        print("Seeding sample expenses and line items...")
        today = date.today()

        sample_expenses = [
            {
                "title": "Whole Foods Market Grocery Run",
                "amount": 142.50,
                "currency": "USD",
                "category": "Groceries",
                "date": today - timedelta(days=2),
                "merchant": "Whole Foods Market",
                "payment_method": "Credit Card",
                "description": "Weekly family groceries and fresh produce",
                "items": [
                    {"name": "Organic Milk", "quantity": 2, "unit_price": 4.50, "total_price": 9.00},
                    {"name": "Fresh Berries & Produce", "quantity": 1, "unit_price": 38.50, "total_price": 38.50},
                    {"name": "Olive Oil & Condiments", "quantity": 1, "unit_price": 25.00, "total_price": 25.00},
                    {"name": "Pantry Staples & Meat", "quantity": 1, "unit_price": 70.00, "total_price": 70.00},
                ],
            },
            {
                "title": "Starbucks Coffee & Snacks",
                "amount": 18.75,
                "currency": "USD",
                "category": "Food & Dining",
                "date": today - timedelta(days=3),
                "merchant": "Starbucks",
                "payment_method": "Apple Pay",
                "description": "Coffee meeting with colleague",
                "items": [
                    {"name": "Caramel Macchiato", "quantity": 2, "unit_price": 5.95, "total_price": 11.90},
                    {"name": "Almond Croissant", "quantity": 1, "unit_price": 4.95, "total_price": 4.95},
                    {"name": "Tax & Tip", "quantity": 1, "unit_price": 1.90, "total_price": 1.90},
                ],
            },
            {
                "title": "Monthly Cloud Server Hosting",
                "amount": 85.00,
                "currency": "USD",
                "category": "Utilities",
                "date": today - timedelta(days=6),
                "merchant": "AWS Cloud Services",
                "payment_method": "Corporate Card",
                "description": "EC2 and RDS monthly database instances",
                "items": [
                    {"name": "Cloud Compute & DB", "quantity": 1, "unit_price": 85.00, "total_price": 85.00},
                ],
            },
            {
                "title": "Delta Airlines Flight Ticket",
                "amount": 420.00,
                "currency": "USD",
                "category": "Travel",
                "date": today - timedelta(days=12),
                "merchant": "Delta Airlines",
                "payment_method": "Credit Card",
                "description": "Flight to Tech Conference 2026",
                "items": [
                    {"name": "Roundtrip Flight Ticket", "quantity": 1, "unit_price": 380.00, "total_price": 380.00},
                    {"name": "Baggage Fee", "quantity": 1, "unit_price": 40.00, "total_price": 40.00},
                ],
            },
            {
                "title": "Uber Rides to Airport & Office",
                "amount": 54.20,
                "currency": "USD",
                "category": "Transportation",
                "date": today - timedelta(days=13),
                "merchant": "Uber",
                "payment_method": "Credit Card",
                "description": "Airport pickup and dropoff",
                "items": [
                    {"name": "UberX Ride", "quantity": 1, "unit_price": 54.20, "total_price": 54.20},
                ],
            },
            {
                "title": "Office Ergonomic Chair",
                "amount": 289.99,
                "currency": "USD",
                "category": "Office Supplies",
                "date": today - timedelta(days=20),
                "merchant": "Herman Miller Authorized Dealer",
                "payment_method": "Bank Transfer",
                "description": "Ergonomic work desk setup",
                "items": [
                    {"name": "Ergonomic Mesh Chair", "quantity": 1, "unit_price": 289.99, "total_price": 289.99},
                ],
            },
        ]

        for exp_data in sample_expenses:
            items_data = exp_data.pop("items", [])
            expense = Expense(**exp_data)
            for itm in items_data:
                expense.items.append(ExpenseItem(**itm))
            db.add(expense)

        # Seed sample monthly budgets
        current_month = today.strftime("%Y-%m")
        sample_budgets = [
            {"category": "Groceries", "monthly_limit": 500.0, "month": current_month},
            {"category": "Food & Dining", "monthly_limit": 250.0, "month": current_month},
            {"category": "Transportation", "monthly_limit": 150.0, "month": current_month},
            {"category": "Travel", "monthly_limit": 600.0, "month": current_month},
            {"category": "Utilities", "monthly_limit": 200.0, "month": current_month},
        ]
        for b in sample_budgets:
            db.add(Budget(**b))

        db.commit()
        print(f"Successfully seeded {len(sample_expenses)} expenses and {len(sample_budgets)} budgets!")

    finally:
        db.close()


if __name__ == "__main__":
    seed()
