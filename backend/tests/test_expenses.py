def test_health_check(client):
    response = client.get("/api/v1/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "online"
    assert data["database"] == "ok"


def test_create_and_get_expense(client):
    payload = {
        "title": "Grocery Shopping",
        "amount": 75.50,
        "currency": "USD",
        "category": "Groceries",
        "date": "2026-10-07",
        "merchant": "Trader Joe's",
        "payment_method": "Credit Card",
        "items": [
            {"name": "Bread", "quantity": 1, "unit_price": 3.50, "total_price": 3.50},
            {"name": "Cheese", "quantity": 2, "unit_price": 6.00, "total_price": 12.00},
        ],
    }
    response = client.post("/api/v1/expenses/", json=payload)
    assert response.status_code == 201
    data = response.json()
    assert data["id"] is not None
    assert data["title"] == "Grocery Shopping"
    assert data["amount"] == 75.50
    assert len(data["items"]) == 2

    expense_id = data["id"]
    get_res = client.get(f"/api/v1/expenses/{expense_id}")
    assert get_res.status_code == 200
    assert get_res.json()["merchant"] == "Trader Joe's"


def test_list_and_filter_expenses(client):
    # Create two expenses
    client.post(
        "/api/v1/expenses/",
        json={
            "title": "Lunch Cafe",
            "amount": 25.00,
            "category": "Food & Dining",
            "date": "2026-10-05",
        },
    )
    client.post(
        "/api/v1/expenses/",
        json={
            "title": "Metro Pass",
            "amount": 50.00,
            "category": "Transportation",
            "date": "2026-10-06",
        },
    )

    # List all
    res = client.get("/api/v1/expenses/")
    assert res.status_code == 200
    body = res.json()
    assert body["total_count"] == 2
    assert body["total_amount"] == 75.00

    # Filter by category
    filter_res = client.get("/api/v1/expenses/?category=Transportation")
    assert filter_res.status_code == 200
    assert filter_res.json()["total_count"] == 1
    assert filter_res.json()["expenses"][0]["title"] == "Metro Pass"


def test_update_and_delete_expense(client):
    create_res = client.post(
        "/api/v1/expenses/",
        json={
            "title": "Taxi",
            "amount": 30.00,
            "category": "Transportation",
            "date": "2026-10-07",
        },
    )
    exp_id = create_res.json()["id"]

    # Update
    update_res = client.put(
        f"/api/v1/expenses/{exp_id}",
        json={"amount": 35.00, "merchant": "City Cabs"},
    )
    assert update_res.status_code == 200
    assert update_res.json()["amount"] == 35.00
    assert update_res.json()["merchant"] == "City Cabs"

    # Delete
    del_res = client.delete(f"/api/v1/expenses/{exp_id}")
    assert del_res.status_code == 204

    # Verify 404
    get_res = client.get(f"/api/v1/expenses/{exp_id}")
    assert get_res.status_code == 404
