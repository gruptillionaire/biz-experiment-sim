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

class SimulationRequest(BaseModel):
    baseline: BaselineMetrics
    experiment: ExperimentChanges
    months: int = Field(ge=1, le=72)

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

class ExperimentSummary(BaseModel):
    baseline_net: float = 0
    experiment_net: float = 0
    net_profit_uplift: float = 0
    baseline_overtake_month: int | None
    main_driver: str
class ExperimentOutcome(BaseModel):
    baseline: SimulationResults
    experiment: SimulationResults
    summary: ExperimentSummary