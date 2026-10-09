
from fastapi.testclient import TestClient
from backend.main import app

client = TestClient(app)


def test_root_endpoint():
    response = client.get("/")
    assert response.status_code == 200
    assert response.json()["message"] == "CloudPulse API is running"


def test_overview_endpoint():
    response = client.get("/api/overview")
    assert response.status_code == 200

    data = response.json()
    assert data["total_resources"] >= 0
    assert data["total_monthly_cost"] >= 0
    assert data["budget_limit"] > 0


def test_resources_endpoint():
    response = client.get("/api/resources")
    assert response.status_code == 200

    resources = response.json()
    assert isinstance(resources, list)

    if resources:
        assert "name" in resources[0]
        assert "service" in resources[0]
        assert "monthly_cost" in resources[0]


def test_get_budget():
    response = client.get("/api/budgets")
    assert response.status_code == 200
    assert response.json()["monthly_limit"] > 0


def test_update_budget():
    original_response = client.get("/api/budgets")
    original_budget = original_response.json()["monthly_limit"]

    try:
        response = client.put(
            "/api/budgets",
            json={"monthly_limit": 2000}
        )

        assert response.status_code == 200

        updated = client.get("/api/budgets")
        assert updated.json()["monthly_limit"] == 2000
    finally:
        client.put(
            "/api/budgets",
            json={"monthly_limit": original_budget}
        )


def test_invalid_budget_rejected():
    response = client.put(
        "/api/budgets",
        json={"monthly_limit": -100}
    )
    assert response.status_code in (400, 422)