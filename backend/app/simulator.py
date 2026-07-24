import math
import random

from .models import (
    BaselineMetrics,
    DriverImpact,
    ExperimentChanges,
    ExperimentOutcome,
    ExperimentRange,
    ExperimentSummary,
    MonteCarloExperimentChanges,
    MonteCarloHistogramBucket,
    MonteCarloRequest,
    MonteCarloSummary,
    MonthSimulation,
    SimulationRequest,
    SimulationResults,
)


DRIVER_FIELDS: tuple[tuple[str, str], ...] = (
    ("new_users_per_month_delta", "Acquisition"),
    ("activation_rate_delta", "Activation"),
    ("monthly_retention_rate_delta", "Retention"),
    ("conversion_rate_delta", "Conversion"),
    ("avg_revenue_per_paying_user_delta", "Average Revenue per Paying User"),
    ("customer_acquisition_cost_delta", "Acquisition Cost"),
    ("gross_margin_rate_delta", "Gross Margin"),
    ("fixed_monthly_cost_delta", "Fixed Costs"),
)


def clamp(value: float) -> float:
    return max(0.0, min(1.0, value))


def sample_range(value: ExperimentRange) -> float:
    return random.triangular(value.min, value.max, value.expected)


def simulate_metrics(metrics: BaselineMetrics, months: int) -> SimulationResults:
    active_users = float(metrics.starting_users)
    net_profit = 0.0
    month_results: list[MonthSimulation] = []

    for month in range(1, months + 1):
        new_users = metrics.new_users_per_month
        activated_users = new_users * metrics.activation_rate
        retained_users = active_users * metrics.monthly_retention_rate
        active_users = activated_users + retained_users

        paying_users = active_users * metrics.conversion_rate
        gross_revenue = paying_users * metrics.avg_revenue_per_paying_user
        acquisition_cost = new_users * metrics.customer_acquisition_cost
        monthly_net = (
            gross_revenue * metrics.gross_margin_rate
            - acquisition_cost
            - metrics.fixed_monthly_cost
        )
        net_profit += monthly_net

        month_results.append(
            MonthSimulation(
                month=month,
                activated_users=activated_users,
                active_users=active_users,
                paying_users=paying_users,
                retained_users=retained_users,
                monthly_revenue=gross_revenue,
                monthly_net=monthly_net,
                cumulative_net_profit=net_profit,
            )
        )

    return SimulationResults(
        net_profit=net_profit,
        total_active_users=active_users,
        monthly_results=month_results,
    )


def sample_experiment(
    experiment: MonteCarloExperimentChanges,
) -> ExperimentChanges:
    return ExperimentChanges(
        new_users_per_month_delta=sample_range(
            experiment.new_users_per_month_delta
        ),
        activation_rate_delta=sample_range(experiment.activation_rate_delta),
        monthly_retention_rate_delta=sample_range(
            experiment.monthly_retention_rate_delta
        ),
        conversion_rate_delta=sample_range(experiment.conversion_rate_delta),
        avg_revenue_per_paying_user_delta=sample_range(
            experiment.avg_revenue_per_paying_user_delta
        ),
        customer_acquisition_cost_delta=sample_range(
            experiment.customer_acquisition_cost_delta
        ),
        gross_margin_rate_delta=sample_range(
            experiment.gross_margin_rate_delta
        ),
        fixed_monthly_cost_delta=sample_range(
            experiment.fixed_monthly_cost_delta
        ),
    )


def apply_experiment(
    baseline: BaselineMetrics,
    experiment: ExperimentChanges,
) -> BaselineMetrics:
    return BaselineMetrics(
        starting_users=baseline.starting_users,
        new_users_per_month=max(
            0,
            baseline.new_users_per_month
            * (1 + experiment.new_users_per_month_delta),
        ),
        activation_rate=clamp(
            baseline.activation_rate * (1 + experiment.activation_rate_delta)
        ),
        monthly_retention_rate=clamp(
            baseline.monthly_retention_rate
            + experiment.monthly_retention_rate_delta
        ),
        conversion_rate=clamp(
            baseline.conversion_rate + experiment.conversion_rate_delta
        ),
        avg_revenue_per_paying_user=max(
            0,
            baseline.avg_revenue_per_paying_user
            * (1 + experiment.avg_revenue_per_paying_user_delta),
        ),
        customer_acquisition_cost=max(
            0,
            baseline.customer_acquisition_cost
            * (1 + experiment.customer_acquisition_cost_delta),
        ),
        gross_margin_rate=clamp(
            baseline.gross_margin_rate + experiment.gross_margin_rate_delta
        ),
        fixed_monthly_cost=max(
            0,
            baseline.fixed_monthly_cost
            * (1 + experiment.fixed_monthly_cost_delta),
        ),
    )


def get_driver_breakdown(
    baseline_metrics: BaselineMetrics,
    experiment: ExperimentChanges,
    baseline_net: float,
    months: int,
) -> list[DriverImpact]:
    impacts: list[DriverImpact] = []

    for field_name, label in DRIVER_FIELDS:
        value = getattr(experiment, field_name)
        if value == 0:
            continue

        isolated_experiment = ExperimentChanges()
        setattr(isolated_experiment, field_name, value)
        isolated_metrics = apply_experiment(
            baseline_metrics,
            isolated_experiment,
        )
        isolated_results = simulate_metrics(isolated_metrics, months)
        impacts.append(
            DriverImpact(
                key=field_name,
                label=label,
                net_profit_uplift=isolated_results.net_profit - baseline_net,
            )
        )

    return sorted(
        impacts,
        key=lambda impact: abs(impact.net_profit_uplift),
        reverse=True,
    )


def find_break_even_month(
    baseline: list[MonthSimulation],
    experiment: list[MonthSimulation],
) -> int | None:
    for baseline_month, experiment_month in zip(baseline, experiment):
        if (
            baseline_month.cumulative_net_profit
            <= experiment_month.cumulative_net_profit
        ):
            return experiment_month.month
    return None


def simulate_business_experiment(
    request: SimulationRequest,
) -> ExperimentOutcome:
    baseline_results = simulate_metrics(request.baseline, request.months)
    experiment_metrics = apply_experiment(
        request.baseline,
        request.experiment,
    )
    experiment_results = simulate_metrics(
        experiment_metrics,
        request.months,
    )

    driver_breakdown = get_driver_breakdown(
        request.baseline,
        request.experiment,
        baseline_results.net_profit,
        request.months,
    )

    return ExperimentOutcome(
        baseline=baseline_results,
        experiment=experiment_results,
        summary=ExperimentSummary(
            baseline_net=baseline_results.net_profit,
            experiment_net=experiment_results.net_profit,
            net_profit_uplift=(
                experiment_results.net_profit - baseline_results.net_profit
            ),
            baseline_overtake_month=find_break_even_month(
                baseline_results.monthly_results,
                experiment_results.monthly_results,
            ),
            driver_breakdown=driver_breakdown,
        ),
    )


def percentile(sorted_values: list[float], probability: float) -> float:
    if not sorted_values:
        raise ValueError("Cannot calculate a percentile of an empty list")
    if not 0 <= probability <= 1:
        raise ValueError("Probability must be between zero and one")

    rank = (len(sorted_values) - 1) * probability
    lower_index = math.floor(rank)
    upper_index = math.ceil(rank)
    if lower_index == upper_index:
        return sorted_values[lower_index]

    weight = rank - lower_index
    return (
        sorted_values[lower_index] * (1 - weight)
        + sorted_values[upper_index] * weight
    )


def build_fixed_range_buckets(
    minimum: float,
    maximum: float,
    bucket_count: int,
) -> list[MonteCarloHistogramBucket]:
    if bucket_count <= 0:
        return []

    if minimum == maximum:
        return [
            MonteCarloHistogramBucket(
                min=minimum,
                max=maximum,
                count=0,
            )
        ]

    bucket_size = (maximum - minimum) / bucket_count
    return [
        MonteCarloHistogramBucket(
            min=minimum + bucket_size * index,
            max=minimum + bucket_size * (index + 1),
            count=0,
        )
        for index in range(bucket_count)
    ]


def split_bucket_counts_around_zero(
    minimum: float,
    maximum: float,
    bucket_count: int,
) -> tuple[int, int]:
    negative_width = abs(minimum)
    total_width = negative_width + maximum
    negative_count = max(
        1,
        min(
            bucket_count - 1,
            round(bucket_count * negative_width / total_width),
        ),
    )
    return negative_count, bucket_count - negative_count


def build_histogram_buckets(
    values: list[float],
    bucket_count: int = 20,
) -> list[MonteCarloHistogramBucket]:
    if not values:
        return []

    minimum = min(values)
    maximum = max(values)
    if minimum == maximum:
        return [
            MonteCarloHistogramBucket(
                min=minimum,
                max=maximum,
                count=len(values),
            )
        ]

    if minimum < 0 < maximum:
        negative_count, positive_count = split_bucket_counts_around_zero(
            minimum,
            maximum,
            bucket_count,
        )
        buckets = build_fixed_range_buckets(
            minimum,
            0,
            negative_count,
        ) + build_fixed_range_buckets(
            0,
            maximum,
            positive_count,
        )
    else:
        buckets = build_fixed_range_buckets(
            minimum,
            maximum,
            bucket_count,
        )

    for value in values:
        for bucket in buckets:
            is_last_bucket = bucket is buckets[-1]
            if (
                bucket.min <= value < bucket.max
                or is_last_bucket
                and value == bucket.max
            ):
                bucket.count += 1
                break

    return buckets


def simulate_monte_carlo(request: MonteCarloRequest) -> MonteCarloSummary:
    uplifts: list[float] = []
    experiment_nets: list[float] = []

    for _ in range(request.samples):
        result = simulate_business_experiment(
            SimulationRequest(
                baseline=request.baseline,
                experiment=sample_experiment(request.experiment),
                months=request.months,
            )
        )
        uplifts.append(result.summary.net_profit_uplift)
        experiment_nets.append(result.summary.experiment_net)

    uplifts.sort()
    samples_beat_baseline = sum(uplift > 0 for uplift in uplifts)
    samples_lost_money = sum(net < 0 for net in experiment_nets)

    return MonteCarloSummary(
        samples=request.samples,
        p10_net_profit_uplift=percentile(uplifts, 0.10),
        median_net_profit_uplift=percentile(uplifts, 0.50),
        p90_net_profit_uplift=percentile(uplifts, 0.90),
        chance_to_beat_baseline=(
            samples_beat_baseline / request.samples
        ),
        chance_to_lose_money=samples_lost_money / request.samples,
        uplift_histogram=build_histogram_buckets(uplifts, 20),
    )
