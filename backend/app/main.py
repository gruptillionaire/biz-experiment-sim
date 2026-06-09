from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware


from app.models import SimulationRequest, SimulationResults
from app.simulator import simulate_business_experiment

app = FastAPI(title = "Biz Experiment Simulator")
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/health")
def health():
    return {"status": "ok"}

@app.post("/simulate")    ## response_model validates output too
def simulate(request: SimulationRequest):
    return simulate_business_experiment(request)