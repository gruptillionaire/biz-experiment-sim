from fastapi.testclient import TestClient

from app.main import app


client = TestClient(app)


def baseline_payload() -> dict[str, float | int]:
    return {
        "starting_users": 100,
        "new_users_per_month": 10,
        "activation_rate": 0.5,
        "monthly_retention_rate": 0.8,
        "conversion_rate": 0.1,
        "avg_revenue_per_paying_user": 20,
        "customer_acquisition_cost": 2,
        "gross_margin_rate": 0.5,
        "fixed_monthly_cost": 5,
    }


def experiment_payload() -> dict[str, float]:
    return {
        "new_users_per_month_delta": 0.1,
        "activation_rate_delta": 0.05,
        "monthly_retention_rate_delta": 0.02,
        "conversion_rate_delta": 0.01,
        "avg_revenue_per_paying_user_delta": 0.1,
        "customer_acquisition_cost_delta": 0.03,
        "gross_margin_rate_delta": 0.01,
        "fixed_monthly_cost_delta": 0.05,
    }


def test_health_endpoint() -> None:
    response = client.get("/health")

    assert response.status_code == 200
    assert response.json() == {"status": "ok"}


def test_simulation_endpoint_returns_typed_result() -> None:
    response = client.post(
        "/simulate",
        json={
            "baseline": baseline_payload(),
            "experiment": experiment_payload(),
            "months": 12,
        },
    )

    assert response.status_code == 200
    data = response.json()
    assert len(data["baseline"]["monthly_results"]) == 12
    assert data["summary"]["experiment_net"] > data["summary"]["baseline_net"]


def test_monte_carlo_range_order_is_validated() -> None:
    ranges = {
        key: {"min": value, "expected": value, "max": value}
        for key, value in experiment_payload().items()
    }
    ranges["activation_rate_delta"] = {
        "min": 0.1,
        "expected": 0.05,
        "max": 0.2,
    }

    response = client.post(
        "/simulate-monte-carlo",
        json={
            "baseline": baseline_payload(),
            "experiment": ranges,
            "months": 12,
            "samples": 100,
        },
    )

    assert response.status_code == 422
