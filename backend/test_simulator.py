from app.simulator import simulate_business_experiment
from app.models import *

def test_simulate_returns_payload():
    result = simulate_business_experiment(SimulationRequest(
        baseline=BaselineMetrics(
            starting_users=100,
            new_users_per_month=5.0,
            activation_rate=0.5,
            monthly_retention_rate=0.5,
            conversion_rate=0.5,
            avg_revenue_per_paying_user=50,
            customer_acquisition_cost=30,
            gross_margin_rate=0.5,
            fixed_monthly_cost=300,
        ),
        experiment = ExperimentChanges(
            new_users_per_month_delta = 0.5,
            activation_rate_delta = 0.5,
            monthly_retention_rate_delta = 0.5,
            conversion_rate_delta = 0.5,
            avg_revenue_per_paying_user_delta = 0.5,
            customer_acquisition_cost_delta = 0.5,
            gross_margin_rate_delta = 0.5,
            fixed_monthly_cost_delta = 0.5,
        ),
        months=12,
        ),
    )
    print(result)
test_simulate_returns_payload()