from pydantic import BaseModel, Field ## pydantic enforces typed inputs/outputs rather than fastapi using loose json dicts
## ge >=, gt >, lt <, le <=

class BaselineMetrics(BaseModel):
    starting_users: int = Field(ge=0)
    new_users_per_month: float = Field(ge=0)
    activation_rate: float = Field(ge=0, le=1)
    monthly_retention_rate: float = Field(ge=0, le=1)
    conversion_rate: float = Field(ge=0, le=1)
    avg_revenue_per_paying_user: float = Field(ge=0)
    customer_acquisition_cost: float = Field(ge=0)
    gross_margin_rate: float = Field(ge=0, le=1)
    fixed_monthly_cost: float = Field(ge=0)

class ExperimentChanges(BaseModel):
    new_users_per_month_delta: float = 0
    activation_rate_delta: float = 0
    monthly_retention_rate_delta: float = 0
    conversion_rate_delta: float = 0
    avg_revenue_per_paying_user_delta: float = 0
    customer_acquisition_cost_delta: float = 0
    gross_margin_rate_delta: float = 0
    fixed_monthly_cost_delta: float = 0

class ExperimentRange(BaseModel):
    min: float
    expected: float
    max: float

class MonteCarloExperimentChanges(BaseModel):
    new_users_per_month_delta: ExperimentRange
    activation_rate_delta: ExperimentRange
    monthly_retention_rate_delta: ExperimentRange
    conversion_rate_delta: ExperimentRange
    avg_revenue_per_paying_user_delta: ExperimentRange
    customer_acquisition_cost_delta: ExperimentRange
    gross_margin_rate_delta: ExperimentRange
    fixed_monthly_cost_delta: ExperimentRange

class SimulationRequest(BaseModel):
    baseline: BaselineMetrics
    experiment: ExperimentChanges
    months: int = Field(ge=1, le=72)

class MonteCarloRequest(BaseModel):
    baseline: BaselineMetrics
    experiment: MonteCarloExperimentChanges
    months: int = Field(ge=1, le=72)
    samples: int = Field(default=1000, ge=100, le=50000)

class MonthSimulation(BaseModel):
    month: int = Field(ge=0, le=72)
    activated_users: float = Field(ge=0)
    active_users: float = Field(ge=0)
    paying_users: float = Field(ge=0)
    retained_users: float = Field(ge=0)
    monthly_revenue: float = Field(ge=0)
    monthly_net: float = 0
    cumulative_net_profit: float = 0

class SimulationResults(BaseModel):
    net_profit: float = 0
    total_active_users: float = Field(ge=0)
    monthly_results: list[MonthSimulation]

class DriverImpact(BaseModel):
    key: str
    label: str
    net_profit_uplift: float

class ExperimentSummary(BaseModel):
    baseline_net: float = 0
    experiment_net: float = 0
    net_profit_uplift: float = 0
    baseline_overtake_month: int | None
    driver_breakdown: list[DriverImpact]

class MonteCarloSummary(BaseModel):
    samples: int
    p10_net_profit_uplift: float
    median_net_profit_uplift: float
    p90_net_profit_uplift: float
    chance_to_beat_baseline: float
    chance_to_lose_money: float

class ExperimentOutcome(BaseModel):
    baseline: SimulationResults
    experiment: SimulationResults
    summary: ExperimentSummary