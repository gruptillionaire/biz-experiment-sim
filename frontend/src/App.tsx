import { useState } from 'react'
 import {
    LineChart,
    Line,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
  } from "recharts";
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

const baselineFields: Array<{
  key: keyof ApiTypes.BaselineMetrics;
  label: string;
  step?: number;
}> = [
  { key: "starting_users", label: "Starting users" },
  { key: "new_users_per_month", label: "New users / month" },
  { key: "activation_rate", label: "Activation rate", step: 0.01 },
  { key: "monthly_retention_rate", label: "Monthly retention", step: 0.01 },
  { key: "conversion_rate", label: "Conversion rate", step: 0.01 },
  { key: "avg_revenue_per_paying_user", label: "ARPPU", step: 0.01 },
  { key: "customer_acquisition_cost", label: "CAC", step: 0.01 },
  { key: "gross_margin_rate", label: "Gross margin", step: 0.01 },
  { key: "fixed_monthly_cost", label: "Fixed monthly cost", step: 0.01 },
];
const experimentFields: Array<{
  key: keyof ApiTypes.ExperimentChanges;
  label: string;
  step?: number;
}> = [
  { key: "new_users_per_month_delta", label: "New users delta", step: 0.01 },
  { key: "activation_rate_delta", label: "Activation delta", step: 0.01 },
  { key: "monthly_retention_rate_delta", label: "Retention delta", step: 0.01 },
  { key: "conversion_rate_delta", label: "Conversion delta", step: 0.01 },
  { key: "avg_revenue_per_paying_user_delta", label: "ARPPU delta", step: 0.01 },
  { key: "customer_acquisition_cost_delta", label: "CAC delta", step: 0.01 },
  { key: "gross_margin_rate_delta", label: "Gross margin delta", step: 0.01 },
  { key: "fixed_monthly_cost_delta", label: "Fixed cost delta", step: 0.01 },
];


function App() {
  const [currencyType, setCurrencyType] = useState<"GBP" | "USD">("GBP");
  function formatMoney(value: number, decPlaces?: number) {
    return new Intl.NumberFormat(currencyType == "GBP" ? "en-GB" : "en-US", {
      style: "currency",
      currency: currencyType,
      maximumFractionDigits: decPlaces ?? 0,
    }).format(value);
  }
  function formatNumber(value: number) {
    return new Intl.NumberFormat(currencyType == "GBP" ? "en-GB" : "en-US", {
      maximumFractionDigits: 0,
    }).format(value);
  }
  
  function formatPercent(value: number) {
    return `${(value * 100).toFixed(1)}%`;
  }
  const [request, setRequest] = useState<ApiTypes.SimulationRequest>(defaultRequest)
  function updateBaselineField(field: keyof ApiTypes.BaselineMetrics, value: number) {
    setRequest((current) => ({
      ...current,
      baseline: {
        ...current.baseline,  
        [field]: value,
      },
    }))
  }
  function updateExperimentField(field: keyof ApiTypes.ExperimentChanges, value: number) {
    setRequest((current) => ({
      ...current,
      experiment: {
        ...current.experiment,
        [field]: value,
      },
    }))
  }
  function updateMonths(value: number) {
    setRequest((current) => ({
      ...current,
      months: value
    }))
  }
  const [result, setResult] = useState<ApiTypes.ExperimentOutcome | null>(null)
  async function runSimulation() {
    console.log("running")
    const response = await fetch("http://127.0.0.1:8000/simulate", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(request),
    });

    const data: ApiTypes.ExperimentOutcome = await response.json();
    setResult(data);
  }
  const profitChartData =
      result?.baseline.monthly_results.map((baselineMonth, index) => {
        const experimentMonth = result.experiment.monthly_results[index];

        return {
          month: baselineMonth.month,
          baseline: baselineMonth.cumulative_net_profit,
          experiment: experimentMonth.cumulative_net_profit,
        };
      }) ?? [];
  const userChartData =
    result?.experiment.monthly_results.map((month) => ({
      month: month.month,
      active: month.active_users,
      retained: month.retained_users,
      activated: month.activated_users,
      paying: month.paying_users,
    })) ?? [];
  const monthTickInterval = profitChartData.length > 24 ? Math.max(0, Math.floor(profitChartData.length/12)) : 0

  return (
    <main>
      <h1>Business Experiment Simulator</h1>

      <div>
        <label>
          Currency Type:{"\t"}
          <select
            value={currencyType}
            onChange={(event) => setCurrencyType(event.target.value as "GBP" | "USD")}  // asserts type
          >
            <option value="GBP">GBP (£)</option>
            <option value="USD">USD ($)</option>
          </select>
        </label>
        <h2>Baseline</h2>
        {baselineFields.map((field) => (
          <label key={field.key}>
            {field.label}
            <input
              type="number"
              step={field.step ?? 1}
              value={request.baseline[field.key]}
              onChange={(event) => 
                updateBaselineField(field.key, Number(event.target.value))
              }
            />
          </label>
        ))}
      </div>
      <div>
        <h2>Experiment</h2>
        {experimentFields.map((field) => (
          <label key={field.key}>
            {field.label}
            <input
              type="number"
              step={field.step ?? 1}
              value={request.experiment[field.key]}
              onChange={(event) => 
                updateExperimentField(field.key, Number(event.target.value))
              }
            />
          </label>
        ))}
      </div>
      <div>
        <h2>Months</h2>
        <input
          type="number"
          step={1}
          value={request.months}
          onChange={(event) =>
            updateMonths(Math.max(1, Math.min(72, Number(event.target.value))))
          }
        />
      </div>


      <button onClick={runSimulation}>
        Run Simulation
      </button>
      {result && (
        <section>
        <h2>Driver Breakdown</h2>
        {result?.summary.driver_breakdown.map((driver: ApiTypes.DriverImpact) => (
          <div key={driver.key}>
            <span>{driver.label + "\t"}</span>
            <strong>{formatMoney(driver.net_profit_uplift, 2)}</strong>
          </div>
        ))}
      </section>
      )}

      {result && (
    <section>
      <h2>Cumulative Net Profit</h2>

      <div style={{ width: "100%", height: 320, margin: "0 auto" }}>
        <ResponsiveContainer>
          <LineChart data={profitChartData} margin = {{ top: 20, right: 32, left: 92, bottom: 36 }}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis
              dataKey="month"
              interval={monthTickInterval}
              label={{ value: "Month", position: "insideBottom", offset: -16 }}
            />
            <YAxis width={90} tickFormatter={(value) => formatMoney(Number(value))} />
            <Tooltip labelFormatter={(label) => `Month ${label}`} formatter={(value) => formatMoney(Number(value))} />
            <Line
              type="monotone"
              dataKey="baseline"
              stroke="#64748b"
              strokeWidth={2}
              dot={false}
              name="Baseline"
            />
            <Line
              type="monotone"
              dataKey="experiment"
              stroke="#2563eb"
              strokeWidth={2}
              dot={false}
              name="Experiment"
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </section>
    )}
    {result && (
        <section>
          <h2>Experiment User Base</h2>

          <div style={{ width: "90%", maxWidth: 900, height: 320, margin: "0 auto" }}>
            <ResponsiveContainer>
              <LineChart data={userChartData} margin={{ top: 20, right: 32, left: 48, bottom: 36 }}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis
                  dataKey="month"
                  interval={monthTickInterval}
                  label={{ value: "Month", position: "insideBottom", offset: -24 }}
                />
                <YAxis
                  width={80}
                  tickFormatter={(value) => formatNumber(Number(value))}
                />
                <Tooltip
                  labelFormatter={(label) => `Month ${label}`}
                  formatter={(value, name) => [
                    formatNumber(Number(value)),
                    name,
                  ]}
                />
                <Line
                  type="monotone"
                  dataKey="active"
                  stroke="#2563eb"
                  strokeWidth={2}
                  dot={false}
                  name="Active users"
                />

                <Line
                  type="monotone"
                  dataKey="retained"
                  stroke="#64748b"
                  strokeWidth={2}
                  dot={false}
                  name="Retained users"
                />

                <Line
                  type="monotone"
                  dataKey="activated"
                  stroke="#16a34a"
                  strokeWidth={2}
                  dot={false}
                  name="Activated users"
                />

                <Line
                  type="monotone"
                  dataKey="paying"
                  stroke="#f59e0b"
                  strokeWidth={2}
                  dot={false}
                  name="Paying users"
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </section>
      )}

    </main>
  )
}

export default App