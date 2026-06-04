from fastapi import FastAPI

from app.models import SimulationRequest
from app.simulator import simulate_business_experiment

app = FastAPI(title = "Biz Experiment Simulator")

@app.get("/health")
def health():
    return {"status": "ok"}

@app.post("/simulate")
def simulate(request: SimulationRequest):
    return simulate_business_experiment(request)