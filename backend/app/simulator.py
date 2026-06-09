from app.models import *

def simulate():
    return {"message": "sim to-do"}

def clamp(x: int):
    return max(0, min(1, x)) 

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

def find_main_driver(experiment: ExperimentChanges):
    drivers = {
        "acquisition": abs(experiment.new_users_per_month_delta),
        "activation": abs(experiment.activation_rate_delta),
        "retention": abs(experiment.monthly_retention_rate_delta),
        "conversion": abs(experiment.conversion_rate_delta),
        "revenue_per_user": abs(experiment.avg_revenue_per_paying_user_delta),
        "acquisition_cost": abs(experiment.customer_acquisition_cost_delta)
    }
    return max(drivers, key=drivers.get)

def find_break_even_month(baseline: list[MonthSimulation], experiment: list[MonthSimulation]):
    for base_month, experiment_month in zip(baseline, experiment):
        if base_month.cumulative_net_profit <= experiment_month.cumulative_net_profit:
            return experiment_month.month


def simulate_business_experiment(request: SimulationRequest):
    baseline = request.baseline
    experiment = request.experiment
    months = request.months

    simulation = BaselineMetrics(
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

    baseline_results = simulate_metrics(baseline, months)
    experiment_results = simulate_metrics(simulation, months)

    ## set to pydantic method
    return ExperimentOutcome(
        baseline = baseline_results,
        experiment = experiment_results,
        summary = ExperimentSummary(
            baseline_net = baseline_results.net_profit,
            experiment_net = experiment_results.net_profit,
            net_profit_uplift = experiment_results.net_profit-baseline_results.net_profit,
            baseline_overtake_month = find_break_even_month(baseline_results.monthly_results, experiment_results.monthly_results),
            main_driver = find_main_driver(experiment)
        )
    )