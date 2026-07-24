import pytest

from app.models import (
    BaselineMetrics,
    ExperimentChanges,
    ExperimentRange,
    MonteCarloExperimentChanges,
    MonteCarloRequest,
    SimulationRequest,
)
from app.simulator import (
    apply_experiment,
    simulate_business_experiment,
    simulate_metrics,
    simulate_monte_carlo,
)


def make_baseline() -> BaselineMetrics:
    return BaselineMetrics(
        starting_users=100,
        new_users_per_month=10,
        activation_rate=0.5,
        monthly_retention_rate=0.8,
        conversion_rate=0.1,
        avg_revenue_per_paying_user=20,
        customer_acquisition_cost=2,
        gross_margin_rate=0.5,
        fixed_monthly_cost=5,
    )


def fixed_range(value: float) -> ExperimentRange:
    return ExperimentRange(min=value, expected=value, max=value)


def test_simulate_metrics_tracks_monthly_profit_and_users() -> None:
    result = simulate_metrics(make_baseline(), months=2)

    assert result.total_active_users == pytest.approx(73)
    assert result.net_profit == pytest.approx(108)
    assert result.monthly_results[0].monthly_net == pytest.approx(60)
    assert result.monthly_results[1].cumulative_net_profit == pytest.approx(108)


def test_zero_delta_matches_baseline() -> None:
    result = simulate_business_experiment(
        SimulationRequest(
            baseline=make_baseline(),
            experiment=ExperimentChanges(),
            months=12,
        )
    )

    assert result.experiment == result.baseline
    assert result.summary.net_profit_uplift == 0
    assert result.summary.driver_breakdown == []


def test_rate_changes_are_clamped_to_valid_probabilities() -> None:
    baseline = make_baseline().model_copy(
        update={
            "activation_rate": 0.9,
            "monthly_retention_rate": 0.9,
            "conversion_rate": 0.9,
            "gross_margin_rate": 0.9,
        }
    )
    changed = apply_experiment(
        baseline,
        ExperimentChanges(
            activation_rate_delta=0.5,
            monthly_retention_rate_delta=0.5,
            conversion_rate_delta=0.5,
            gross_margin_rate_delta=0.5,
        ),
    )

    assert changed.activation_rate == 1
    assert changed.monthly_retention_rate == 1
    assert changed.conversion_rate == 1
    assert changed.gross_margin_rate == 1


def test_driver_breakdown_supports_every_experiment_input() -> None:
    result = simulate_business_experiment(
        SimulationRequest(
            baseline=make_baseline(),
            experiment=ExperimentChanges(
                new_users_per_month_delta=0.1,
                activation_rate_delta=0.1,
                monthly_retention_rate_delta=0.01,
                conversion_rate_delta=0.01,
                avg_revenue_per_paying_user_delta=0.1,
                customer_acquisition_cost_delta=0.1,
                gross_margin_rate_delta=0.01,
                fixed_monthly_cost_delta=0.1,
            ),
            months=12,
        )
    )

    assert {impact.key for impact in result.summary.driver_breakdown} == {
        "new_users_per_month_delta",
        "activation_rate_delta",
        "monthly_retention_rate_delta",
        "conversion_rate_delta",
        "avg_revenue_per_paying_user_delta",
        "customer_acquisition_cost_delta",
        "gross_margin_rate_delta",
        "fixed_monthly_cost_delta",
    }


def test_fixed_monte_carlo_ranges_match_deterministic_result() -> None:
    experiment = ExperimentChanges(
        new_users_per_month_delta=0.1,
        activation_rate_delta=0.05,
        monthly_retention_rate_delta=0.02,
        conversion_rate_delta=0.01,
        avg_revenue_per_paying_user_delta=0.1,
        customer_acquisition_cost_delta=0.03,
        gross_margin_rate_delta=0.01,
        fixed_monthly_cost_delta=0.05,
    )
    deterministic = simulate_business_experiment(
        SimulationRequest(
            baseline=make_baseline(),
            experiment=experiment,
            months=12,
        )
    )
    monte_carlo = simulate_monte_carlo(
        MonteCarloRequest(
            baseline=make_baseline(),
            experiment=MonteCarloExperimentChanges(
                **{
                    field: fixed_range(value)
                    for field, value in experiment.model_dump().items()
                }
            ),
            months=12,
            samples=100,
        )
    )

    expected_uplift = deterministic.summary.net_profit_uplift
    assert monte_carlo.p10_net_profit_uplift == pytest.approx(expected_uplift)
    assert monte_carlo.median_net_profit_uplift == pytest.approx(expected_uplift)
    assert monte_carlo.p90_net_profit_uplift == pytest.approx(expected_uplift)
    assert sum(bucket.count for bucket in monte_carlo.uplift_histogram) == 100
