from app.models import *
import random


def simulate():
    return {"message": "sim to-do"}

def clamp(x: int):
    return max(0, min(1, x)) 

def sample_range(value: ExperimentRange) -> float:
    return random.triangular(value.min, value.max, value.expected)  ## better than uniform (essentially normally distributed)

def simulate_metrics(metrics: BaselineMetrics, months: int) -> SimulationResults:
    active_users = float(metrics.starting_users)
    net_profit = 0.0

    monthResults = []
    for month in range(1, months + 1):
        new_users = metrics.new_users_per_month
        activated_users = new_users * metrics.activation_rate
        retained_users = active_users * metrics.monthly_retention_rate
        active_users = activated_users + retained_users ## all user retention gradually decays

        paying_users = active_users * metrics.conversion_rate
        gross_revenue = paying_users * metrics.avg_revenue_per_paying_user
        acquisition_cost = new_users * metrics.customer_acquisition_cost
        monthly_net = gross_revenue * metrics.gross_margin_rate - acquisition_cost - metrics.fixed_monthly_cost
        net_profit += monthly_net

        monthResults.append(MonthSimulation(
            month=month,
            activated_users=activated_users,
            active_users=active_users,
            paying_users=paying_users,
            retained_users=retained_users,
            monthly_revenue=gross_revenue,
            monthly_net=monthly_net,
            cumulative_net_profit=net_profit,
        ))
    return SimulationResults(
        net_profit=net_profit,
        total_active_users=active_users,
        monthly_results=monthResults
    )

def sample_experiment(experiment: MonteCarloExperimentChanges) -> ExperimentChanges:
    return ExperimentChanges(
        new_users_per_month_delta=sample_range(experiment.new_users_per_month_delta),
        activation_rate_delta=sample_range(experiment.activation_rate_delta),
        monthly_retention_rate_delta=sample_range(experiment.monthly_retention_rate_delta),
        conversion_rate_delta=sample_range(experiment.conversion_rate_delta),
        avg_revenue_per_paying_user_delta=sample_range(experiment.avg_revenue_per_paying_user_delta),
        customer_acquisition_cost_delta=sample_range(experiment.customer_acquisition_cost_delta),
        gross_margin_rate_delta=sample_range(experiment.gross_margin_rate_delta),
        fixed_monthly_cost_delta=sample_range(experiment.fixed_monthly_cost_delta),
    )
def apply_experiment(baseline: BaselineMetrics, experiment: ExperimentChanges):
    return BaselineMetrics(
        starting_users=baseline.starting_users,
        new_users_per_month=max(0, baseline.new_users_per_month * (1 + experiment.new_users_per_month_delta)),
        activation_rate=clamp(baseline.activation_rate * (1 + experiment.activation_rate_delta)),
        monthly_retention_rate=clamp(baseline.monthly_retention_rate + experiment.monthly_retention_rate_delta),
        conversion_rate=clamp(baseline.conversion_rate + experiment.conversion_rate_delta),
        avg_revenue_per_paying_user=max(0, baseline.avg_revenue_per_paying_user * (1 + experiment.avg_revenue_per_paying_user_delta)),
        customer_acquisition_cost=max(0, baseline.customer_acquisition_cost * (1 + experiment.customer_acquisition_cost_delta)),
        gross_margin_rate=clamp(baseline.gross_margin_rate + experiment.gross_margin_rate_delta),
        fixed_monthly_cost=max(0, baseline.fixed_monthly_cost * (1 + experiment.fixed_monthly_cost_delta)),
    )

def get_driver_breakdown(baseline_metrics: BaselineMetrics, experiment: ExperimentChanges, baseline_net: int, months: int):
    impacts = []
    for field, label in {
        "Acquisition": "new_users_per_month_delta",
        "Activation": "activation_rate_delta",
        "Retention": "monthly_retention_rate_delta",
        "Conversion": "conversion_rate_delta",
        "Avg. Revenue per User": "avg_revenue_per_paying_user_delta",
        "Acquisition Cost": "customer_acquisition_cost_delta"
    }.items():
        value = getattr(experiment, label)
        if value == 0:
            continue
        isolated_experiment = ExperimentChanges()   ## empty experiment
        setattr(isolated_experiment, label, value)  ## and set only the one value
        isolated_metrics = apply_experiment(baseline_metrics, isolated_experiment)
        isolated_results = simulate_metrics(isolated_metrics, months)
        impacts.append(
            DriverImpact(
                key = field,
                label = field,
                net_profit_uplift = isolated_results.net_profit - baseline_net
            )
        )
    return sorted(impacts, key=lambda impact: abs(impact.net_profit_uplift), reverse=True)

def find_break_even_month(baseline: list[MonthSimulation], experiment: list[MonthSimulation]):
    for base_month, experiment_month in zip(baseline, experiment):
        if base_month.cumulative_net_profit <= experiment_month.cumulative_net_profit:
            return experiment_month.month

def simulate_business_experiment(request: SimulationRequest):
    baseline = request.baseline
    experiment = request.experiment
    months = request.months

    simulation = apply_experiment(baseline, experiment)

    baseline_results = simulate_metrics(baseline, months)
    experiment_results = simulate_metrics(simulation, months)

    driver_breakdown = get_driver_breakdown(baseline, experiment, baseline_results.net_profit, months)

    ## set to pydantic method
    return ExperimentOutcome(
        baseline = baseline_results,
        experiment = experiment_results,
        summary = ExperimentSummary(
            baseline_net = baseline_results.net_profit,
            experiment_net = experiment_results.net_profit,
            net_profit_uplift = experiment_results.net_profit-baseline_results.net_profit,
            baseline_overtake_month = find_break_even_month(baseline_results.monthly_results, experiment_results.monthly_results),
            driver_breakdown = driver_breakdown
        )
    )
def percentile(sorted_values: list[float], p: float) -> float:
    index = int((len(sorted_values) - 1) * p)
    return sorted_values[index]
def simulate_monte_carlo(request: MonteCarloRequest) -> MonteCarloSummary:
    uplifts = []
    experiment_nets = []

    for _ in range(request.samples):
        sampled_experiment = sample_experiment(request.experiment)

        result = simulate_business_experiment(
            SimulationRequest(
                baseline=request.baseline,
                experiment=sampled_experiment,
                months=request.months,
            )
        )

        uplifts.append(result.summary.net_profit_uplift)
        experiment_nets.append(result.summary.experiment_net)
    uplifts.sort()

    samples_beat_baseline = sum(1 for uplift in uplifts if uplift > 0) ## if it's better than base it's a win
    samples_lost_money = sum(1 for net in experiment_nets if net < 0) ## but that doesn't mean it's a win, as if net<0 it's still a loss.

    return MonteCarloSummary(
        samples=request.samples,
        p10_net_profit_uplift=percentile(uplifts, 0.10),
        median_net_profit_uplift=percentile(uplifts, 0.50),
        p90_net_profit_uplift=percentile(uplifts, 0.90),
        chance_to_beat_baseline=samples_beat_baseline / request.samples,
        chance_to_lose_money=samples_lost_money / request.samples,
    )