from app.schemas.receipt import ExtractedReceiptData, ParsedLineItem
from app.schemas.advisor import FinancialAdviceResponse, SpendingInsight


def test_extracted_receipt_schema_validation():
    sample_json = """{
        "merchant_name": "Target Superstore",
        "transaction_date": "2026-10-06",
        "total_amount": 89.45,
        "subtotal_amount": 82.50,
        "tax_amount": 6.95,
        "currency": "USD",
        "payment_method": "Mastercard",
        "suggested_category": "Shopping",
        "line_items": [
            {
                "name": "Desk Organizer",
                "quantity": 1.0,
                "unit_price": 24.50,
                "total_price": 24.50
            },
            {
                "name": "Wireless Mouse",
                "quantity": 1.0,
                "unit_price": 58.00,
                "total_price": 58.00
            }
        ],
        "confidence_score": 0.98,
        "notes": "Clear receipt image, all totals balanced"
    }"""

    data = ExtractedReceiptData.model_validate_json(sample_json)
    assert data.merchant_name == "Target Superstore"
    assert data.total_amount == 89.45
    assert len(data.line_items) == 2
    assert data.line_items[0].name == "Desk Organizer"


def test_financial_advice_schema_validation():
    advice_json = """{
        "summary_headline": "Spending is 15% higher than typical due to travel",
        "answer": "Your overall financial health is steady, but travel expenses drove up total spend this month.",
        "insights": [
            {
                "type": "saving_opportunity",
                "title": "Dining Out Optimization",
                "message": "Cooking twice more per week could save substantial funds.",
                "potential_monthly_savings": 120.0
            }
        ],
        "actionable_recommendations": [
            "Set a weekly dining cap of $60",
            "Review recurring streaming subscriptions"
        ],
        "top_spending_category": "Travel"
    }"""

    advice = FinancialAdviceResponse.model_validate_json(advice_json)
    assert advice.top_spending_category == "Travel"
    assert len(advice.insights) == 1
    assert advice.insights[0].potential_monthly_savings == 120.0
    assert len(advice.actionable_recommendations) == 2
