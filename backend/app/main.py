import os

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from .models import (
    ExperimentOutcome,
    MonteCarloRequest,
    MonteCarloSummary,
    SimulationRequest,
)
from .simulator import simulate_business_experiment, simulate_monte_carlo

app = FastAPI(title="Business Experiment Simulator")
app.add_middleware(
    CORSMiddleware,
    allow_origins=[os.getenv("FRONTEND_ORIGIN", "http://localhost:5173")],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok"}


@app.post("/simulate", response_model=ExperimentOutcome)
def simulate(request: SimulationRequest) -> ExperimentOutcome:
    return simulate_business_experiment(request)


@app.post("/simulate-monte-carlo", response_model=MonteCarloSummary)
def simulate_monte_carlo_endpoint(request: MonteCarloRequest) -> MonteCarloSummary:
    return simulate_monte_carlo(request)
