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


type ExperimentRange = {
    min: number
    expected: number
    max: number
}

type MonteCarloExperimentChanges = {
    new_users_per_month_delta: ExperimentRange
    activation_rate_delta: ExperimentRange
    monthly_retention_rate_delta: ExperimentRange
    conversion_rate_delta: ExperimentRange
    avg_revenue_per_paying_user_delta: ExperimentRange
    customer_acquisition_cost_delta: ExperimentRange
    gross_margin_rate_delta: ExperimentRange
    fixed_monthly_cost_delta: ExperimentRange
}

export type MonteCarloSimulationRequest = {
    baseline: BaselineMetrics;
    experiment: MonteCarloExperimentChanges;
    months: number;
    samples: number;
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

export type DriverImpact = {
    key: string
    label: string
    net_profit_uplift: number
}

export type MonteCarloHistogramBucket = {
    min: number
    max: number
    count: number
}
export type MonteCarloSummary = {
    samples: number;
    p10_net_profit_uplift: number;
    median_net_profit_uplift: number;
    p90_net_profit_uplift: number;
    chance_to_beat_baseline: number;
    chance_to_lose_money: number;
    uplift_histogram: [MonteCarloHistogramBucket];
}

export type ExperimentOutcome = {
    baseline: SimulationResults;
    experiment: SimulationResults;
    summary: {
        baseline_net: number;
        experiment_net: number;
        net_profit_uplift: number;
        baseline_overtake_month: number | null;
        driver_breakdown: Array<DriverImpact>;
    }
}