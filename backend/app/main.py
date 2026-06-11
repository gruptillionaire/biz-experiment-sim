from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware


from app.models import SimulationRequest, ExperimentOutcome
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

@app.post("/simulate", response_model=ExperimentOutcome)    ## response_model validates output too
def simulate(request: SimulationRequest):   ## if input is out of range or otherwise invalid, will immediately error
    return simulate_business_experiment(request)