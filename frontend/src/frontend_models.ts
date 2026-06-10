// yes, the exact same as models but not pydantic. sub-optimal.
export type BaselineMetrics = {
    starting_users: number;
    new_users_per_month: number;
    activation_rate: number;
    monthly_retention_rate: number;
    conversion_rate: number;
    avg_revenue_per_paying_user: number;
    customer_acquisition_cost: number;
    gross_margin_rate: number;
    fixed_monthly_cost: number;
}

export type ExperimentChanges = {
    new_users_per_month_delta: number;
    activation_rate_delta: number;
    monthly_retention_rate_delta: number;
    conversion_rate_delta: number;
    avg_revenue_per_paying_user_delta: number;
    customer_acquisition_cost_delta: number;
    gross_margin_rate_delta: number;
    fixed_monthly_cost_delta: number;
}

export type SimulationRequest = {
    baseline: BaselineMetrics;
    experiment: ExperimentChanges;
    months: number;
}

type MonthSimulation = {
    month: number;
    activated_users: number;
    active_users: number;
    paying_users: number;
    retained_users: number;
    monthly_revenue: number;
    monthly_net: number;
    cumulative_net_profit: number;
}

type SimulationResults = {
    net_profit: number;
    total_active_users: number;
    monthly_results: [MonthSimulation]
}

export type ExperimentOutcome = {
    baseline: SimulationResults;
    experiment: SimulationResults;
    summary: {
        baseline_net: number;
        experiment_net: number;
        net_profit_uplift: number;
        baseline_overtake_month: number | null;
        main_driver: string;
    }
}