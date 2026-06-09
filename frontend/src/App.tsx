import { useState } from 'react'
import * as ApiTypes from './frontend_models.ts'
import './App.css'

const defaultRequest: ApiTypes.SimulationRequest = {
    baseline: {
      starting_users: 1000,
      new_users_per_month: 250,
      activation_rate: 0.5,
      monthly_retention_rate: 0.82,
      conversion_rate: 0.09,
      avg_revenue_per_paying_user: 35,
      customer_acquisition_cost: 3,
      gross_margin_rate: 0.75,
      fixed_monthly_cost: 1800,
    },
    experiment: {
      new_users_per_month_delta: 0.1,
      activation_rate_delta: 0.04,
      monthly_retention_rate_delta: 0.03,
      conversion_rate_delta: 0.015,
      avg_revenue_per_paying_user_delta: 0.05,
      customer_acquisition_cost_delta: 0.03,
      gross_margin_rate_delta: 0.01,
      fixed_monthly_cost_delta: 0,
    },
    months: 12,
}

function App() {
  const [result, setResult] = useState<ApiTypes.ExperimentOutcome | null>(null)
  async function runSimulation() {
    console.log("running")
    const response = await fetch("http://127.0.0.1:8000/simulate", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(defaultRequest),
    });

    const data: ApiTypes.ExperimentOutcome = await response.json();
    setResult(data);
  }

  return (
    <main>
      <h1>Business Experiment Simulator</h1>

      <button onClick={runSimulation}>
        Run Simulation
      </button>
      {result && (
        <pre>{JSON.stringify(result.summary, null, 2)}</pre>
      )}
    </main>
  )
}

export default App
