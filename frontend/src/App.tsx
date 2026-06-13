import { useState } from 'react'
import type { CSSProperties } from 'react'
import {
  LineChart,
  Line,
  Bar,
  BarChart,
  Cell,
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
const defaultMonteCarloRequest: ApiTypes.MonteCarloSimulationRequest = {
  ...defaultRequest,
  experiment: {
    new_users_per_month_delta: {
      min: -0.1,
      expected: 0.1,
      max: 0.25,
    },
    activation_rate_delta: {
      min: -0.04,
      expected: 0.04,
      max: 0.09,
    },
    monthly_retention_rate_delta: {
      min: -0.06,
      expected: 0.03,
      max: 0.05,
    },
    conversion_rate_delta: {
      min: 0,
      expected: 0.15,
      max: 0.4,
    },
    avg_revenue_per_paying_user_delta: {
      min: -0.07,
      expected: 0.05,
      max: 0.12,
    },
    customer_acquisition_cost_delta: {
      min: 0,
      expected: 0.03,
      max: 0.05,
    },
    gross_margin_rate_delta: {
      min: 0,
      expected: 0.01,
      max: 0.02,
    },
    fixed_monthly_cost_delta: {
      min: 0,
      expected: 0,
      max: 0,
    }
  },
  samples: 1000,
}

const baselineFields: Array<{
  title: string;
  fields: Array<{
    key: keyof ApiTypes.BaselineMetrics;
    label: string;
    step?: number;
    format?: "percent" | "money";
  }>
}> = [
    {
      title: "Userbase",
      fields: [
        { key: "starting_users", label: "Starting users" },
        { key: "new_users_per_month", label: "New users / month" },
        { key: "activation_rate", label: "Activation rate", step: 1, format: "percent" },
        { key: "monthly_retention_rate", label: "Monthly retention", step: 1, format: "percent" },
      ]
    },
    {
      title: "Monetisation",
      fields: [
        { key: "conversion_rate", label: "Conversion rate", step: 1, format: "percent" },
        { key: "avg_revenue_per_paying_user", label: "ARPPU", step: 0.01, format: "money" },
        { key: "customer_acquisition_cost", label: "CAC", step: 0.01, format: "money" },
        { key: "gross_margin_rate", label: "Gross margin", step: 1, format: "percent" },
        { key: "fixed_monthly_cost", label: "Fixed monthly cost", step: 0.01, format: "money" },
      ]
    }
  ];
const experimentFields: Array<{
  title: string;
  fields: Array<{
    key: keyof ApiTypes.ExperimentChanges;
    label: string;
    step?: number;
    format?: "percent" | "money";
    info?: string;
  }>
}> = [
    {
      title: "Userbase",
      fields: [
        { key: "new_users_per_month_delta", label: "New users lift", step: 1, format: "percent" },
        { key: "activation_rate_delta", label: "Activation lift", step: 1, format: "percent" },
        { key: "monthly_retention_rate_delta", label: "Retention point lift", step: 1, format: "percent", info: "Additive to base, not multiplicative! 10% base -> 3% delta = 13%, not 10.3!" },
      ],
    },
    {
      title: "Monetisation",
      fields: [
        { key: "conversion_rate_delta", label: "Conversion point lift", step: 1, format: "percent", info: "Additive to base, not multiplicative! 10% base -> 3% delta = 13%, not 10.3!" },
        { key: "avg_revenue_per_paying_user_delta", label: "ARPPU lift", step: 1, format: "percent" },
        { key: "customer_acquisition_cost_delta", label: "CAC change", step: 1, format: "percent" },
        { key: "gross_margin_rate_delta", label: "Gross margin point lift", step: 1, format: "percent", info: "Additive to base, not multiplicative! 10% base -> 3% delta = 13%, not 10.3!" },
        { key: "fixed_monthly_cost_delta", label: "Fixed cost change", step: 1, format: "percent" },
      ]
    }
  ];

type LineConfig = {
  key: string;
  name: string;
  colour: string;
};

type StandardLineChartProps = {
  title: string;
  data: Array<Record<string, number | string>>;
  lines: Array<LineConfig>;
  yTickFormatter: (value: number) => string;
  tooltipFormatter: (value: number) => string;
  monthTickInterval: number;
};

function StandardLineChart({ title, data, lines, yTickFormatter, tooltipFormatter, monthTickInterval }: StandardLineChartProps) {
  return (
    <section className="chart-section">
      <h2>{title}</h2>

      <div className="chart-frame">
        <ResponsiveContainer>
          <LineChart data={data} margin={{ top: 20, right: 32, left: 92, bottom: 36 }}>
            <CartesianGrid strokeDasharray="3 3" />

            <XAxis
              dataKey="month"
              interval={monthTickInterval}
              label={{ value: "Month", fontWeight: "Bold", position: "insideBottom", offset: -16 }}
            />

            <YAxis
              width={90}
              tickFormatter={(value) => yTickFormatter(Number(value))}
            />

            <Tooltip
              labelFormatter={(label) => `Month ${label}`}
              formatter={(value) => tooltipFormatter(Number(value))}
            />

            {lines.map((line) => (
              <Line
                key={line.key}
                type="monotone"
                dataKey={line.key}
                stroke={line.colour}
                strokeWidth={2}
                dot={false}
                name={line.name}
              />
            ))}
          </LineChart>
        </ResponsiveContainer>
      </div>
    </section>
  );
}
function InfoTip({ text }: { text: string }) {
  return (
    <span className="info-tip" tabIndex={0}>
      i
      <span className="info-tip-text">{text}</span>
    </span>
  );
}
function MetricCard({ label, value, tone = "neutral" }: { label: string, value: string, tone?: "neutral" | "good" | "bad" }) {
  return (
    <div className={`metric-card metric-card-${tone}`}>
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

function ResultsDashboard({ result, formatMoney, formatNumber }: { result: ApiTypes.ExperimentOutcome | null, formatMoney: (value: number, decPlaces?: number) => string, formatNumber: (value: number) => string }) {
  if (!result) {
    return null;
  }

  const cumulativeProfitChartData =
    result?.baseline.monthly_results.map((baselineMonth, index) => {
      const experimentMonth = result.experiment.monthly_results[index];

      return {
        month: baselineMonth.month,
        baseline: baselineMonth.cumulative_net_profit,
        experiment: experimentMonth.cumulative_net_profit,
      };
    }) ?? [];
  const netProfitChartData =
    result?.baseline.monthly_results.map((baselineMonth, index) => {
      const experimentMonth = result.experiment.monthly_results[index];

      return {
        month: baselineMonth.month,
        baseline: baselineMonth.monthly_net,
        experiment: experimentMonth.monthly_net
      }
    }) ?? [];
  const activeUsersChartData =
    result?.baseline.monthly_results.map((baselineMonth, index) => {
      const experimentMonth = result.experiment.monthly_results[index];

      return {
        month: baselineMonth.month,
        active_baseline: baselineMonth.active_users,
        active_experiment: experimentMonth.active_users,
        retained_baseline: baselineMonth.retained_users,
        retained_experiment: experimentMonth.retained_users
      }
    }) ?? [];
  const payingUsersChartData =
    result?.baseline.monthly_results.map((baselineMonth, index) => {
      const experimentMonth = result.experiment.monthly_results[index];

      return {
        month: baselineMonth.month,
        baseline: baselineMonth.paying_users,
        experiment: experimentMonth.paying_users
      }
    }) ?? [];
  const monthTickInterval = cumulativeProfitChartData.length > 24 ? Math.max(0, Math.floor(cumulativeProfitChartData.length / 12)) : 0

  return (
    <>
      <StandardLineChart
        title='Cumulative Net Profit'
        data={cumulativeProfitChartData}
        lines={[
          { key: "baseline", name: "Baseline", colour: "#64748b" },
          { key: "experiment", name: "Experiment", colour: "#2563eb" },
        ]}
        yTickFormatter={formatMoney}
        tooltipFormatter={formatMoney}
        monthTickInterval={monthTickInterval}
      />
      <StandardLineChart
        title='Monthly Net Profit'
        data={netProfitChartData}
        lines={[
          { key: "baseline", name: "Baseline", colour: "#64748b" },
          { key: "experiment", name: "Experiment", colour: "#2563eb" },
        ]}
        yTickFormatter={formatMoney}
        tooltipFormatter={formatMoney}
        monthTickInterval={monthTickInterval}
      />
      <StandardLineChart
        title='Active User Base'
        data={activeUsersChartData}
        lines={[
          { key: "active_baseline", name: "Active Baseline", colour: "#64748b" },
          { key: "active_experiment", name: "Active Experiment", colour: "#2563eb" },
          { key: "retained_baseline", name: "Retained Baseline", colour: "#bf0feb" },
          { key: "retained_experiment", name: "Retained Experiment", colour: "#f14f93" },
        ]}
        yTickFormatter={formatNumber}
        tooltipFormatter={formatNumber}
        monthTickInterval={monthTickInterval}
      />
      <StandardLineChart
        title='Paying User Base'
        data={payingUsersChartData}
        lines={[
          { key: "baseline", name: "Baseline", colour: "#03c423" },
          { key: "experiment", name: "Experiment", colour: "#7ee926" },
        ]}
        yTickFormatter={formatMoney}
        tooltipFormatter={formatMoney}
        monthTickInterval={monthTickInterval}
      />
    </>
  );
}
function MonteCarloResultsDashboard({ result, formatMoney, formatPercent }: { result: ApiTypes.MonteCarloSummary | null, formatMoney: (value: number, decPlaces?: number) => string, formatPercent: (value: number) => string }) {
  if (!result) {
    return null;
  }
  const histogramData =
    result?.uplift_histogram.map((bucket: ApiTypes.MonteCarloHistogramBucket) => ({
      range: `${formatMoney(bucket.min)} to ${formatMoney(bucket.max)}`,
      midpoint: (bucket.min + bucket.max) / 2,
      count: bucket.count,
      positive: bucket.max >= 1,
    }))

  return (
    <>
      <section className="chart-section">
        <h2>Uplift Distribution</h2>
        <div className="chart-frame chart-frame-wide">
          <ResponsiveContainer>
            <BarChart
              data={histogramData}
              margin={{ top: 20, right: 32, left: 48, bottom: 48 }}
            >
              <CartesianGrid strokeDasharray="3 3" />

              <XAxis
                dataKey="midpoint"
                tickFormatter={(value) => formatMoney(Number(value))}
              />

              <YAxis />

              <Tooltip
                labelFormatter={(_, payload) => {
                  const bucket = payload?.[0]?.payload;
                  return bucket?.range ?? "";
                }}
                formatter={(value) => [`${value} runs`, "Samples"]}
              />

              <Bar dataKey="count" name="Runs">
                {histogramData.map((bucket) => (
                  <Cell
                    key={bucket.range}
                    fill={bucket.positive ? "#16a34a" : "#dc2626"}
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </section>
      <section className="summary-section">
        <h2>Monte Carlo Risk Summary</h2>
        <div className="metric-grid">
          <MetricCard
            label={"P10 Uplift"}
            value={formatMoney(result.p10_net_profit_uplift)}
            tone={result.p10_net_profit_uplift > 0 ? "good" : result.p10_net_profit_uplift < 0 ? "bad" : "neutral"}
          />
          <MetricCard
            label={"Median Uplift"}
            value={formatMoney(result.median_net_profit_uplift)}
            tone={result.median_net_profit_uplift > 0 ? "good" : result.median_net_profit_uplift < 0 ? "bad" : "neutral"}
          />
          <MetricCard
            label={"P90 Uplift"}
            value={formatMoney(result.p90_net_profit_uplift)}
            tone={result.p90_net_profit_uplift > 0 ? "good" : result.p90_net_profit_uplift < 0 ? "bad" : "neutral"}
          />
          <MetricCard
            label="Chance to beat baseline"
            value={formatPercent(result.chance_to_beat_baseline)}
            tone={result.chance_to_beat_baseline >= 0.5 ? "good" : "bad"}
          />

          <MetricCard
            label="Chance to lose money"
            value={formatPercent(result.chance_to_lose_money)}
            tone={result.chance_to_lose_money <= 0.25 ? "good" : "bad"}
          />
        </div>
      </section>
    </>
  );
}


function NumberInput({ value, onCommit, step = 1, style }: { value: number, onCommit: (value: number) => void, step?: number, style?: CSSProperties }) {
  const [draft, setDraft] = useState(String(value));
  return (
    <input
      style={style}
      type="number"
      step={step}
      value={draft}
      onChange={(event) => setDraft(event.target.value)}
      onBlur={() => onCommit(Number(draft))}
      onKeyDown={(event) => {
        if (event.key === "Enter") {
          onCommit(Number(draft));
        }
      }}
    />
  );
}

type SimulationMode = "deterministic" | "monte-carlo"
const ExperimentBoundRange = ["min", "expected", "max"] as const

function App() {
  const [currencyType, setCurrencyType] = useState<"GBP" | "USD">("GBP");
  const [simulationMode, setSimulationMode] = useState<SimulationMode>("deterministic");
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
  const [monteCarloRequest, setMonteCarloRequest] = useState<ApiTypes.MonteCarloSimulationRequest>(defaultMonteCarloRequest)
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

  function setMonteCarloField(field: keyof ApiTypes.ExperimentChanges, bound: string, value: number) {
    setMonteCarloRequest((current) => ({
      ...current,
      experiment: {
        ...current.experiment,
        [field]: {
          ...current.experiment[field],
          [bound]: value
        }
      }
    })
    )
  }


  const [result, setResult] = useState<ApiTypes.ExperimentOutcome | null>(null)
  const [monteCarloResult, setMonteCarloResult] = useState<ApiTypes.MonteCarloSummary | null>(null)
  const driverChartData =
    result?.summary.driver_breakdown.map((driver) => ({
      name: driver.label,
      impact: driver.net_profit_uplift,
    })) ?? [];
  async function runSimulation() {
    console.log("running")
    const requesting = simulationMode === "deterministic" ? request : monteCarloRequest
    const url = simulationMode === "deterministic" ? "simulate" : "simulate-monte-carlo"
    const response = await fetch("http://127.0.0.1:8000/" + url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(requesting),
    });

    const data: any = await response.json(); {/* sloppy. in fact this whole function is quite sloppy. */ }
    if (!response.ok) {
      console.error("Simulation failed", data)
      return;
    }
    if (simulationMode === "deterministic") {
      setResult(data);
    } else {
      setMonteCarloResult(data);
    }
  }

  return (
    <main className="app-shell">
      <header className="app-header">
        <h1>Business Experiment Simulator</h1>
        <label className="select-control">
          Currency
          <select
            value={currencyType}
            onChange={(event) => setCurrencyType(event.target.value as "GBP" | "USD")}  // asserts type
          >
            <option value="GBP">GBP (£)</option>
            <option value="USD">USD ($)</option>
          </select>
        </label>
      </header>

      <div className='input-panel'>
        <div className='input-column'>
          <h2>Baseline</h2>
          {baselineFields.map((section) => (
            <section key={section.title}>
              <h3>{section.title}</h3>
              {section.fields.map((field) => (
                <label className="field-row" key={field.key}>
                  {field.label + ":\t" + (field.format === "money" ? (currencyType == "GBP" ? "£" : "$") + "\t" : "")}
                  <NumberInput
                    step={field.step ?? 1}
                    value={field.format === "percent" ? Math.round(request.baseline[field.key] * 100) : request.baseline[field.key]}
                    onCommit={(value) => {
                      updateBaselineField(field.key,
                        field.format === "percent" ? value / 100 : value
                      )
                    }}
                  />
                  <span className="field-suffix">{field.format === "percent" ? "%" : ""}</span>
                </label>
              ))}
            </section>
          ))}
        </div>  {/*really should just be made into a custom component used for baseline and experiment*/}
        <div className='input-column'>
          <h2>Experiment</h2>

          <label className="select-control simulation-mode-control">
            Simulation Mode:
            <select
              value={simulationMode}
              onChange={(event) => setSimulationMode(event.target.value as SimulationMode)}
            >
              <option value="deterministic">Deterministic</option>
              <option value="monte-carlo">Monte Carlo</option>
            </select>
          </label>


          {simulationMode === "deterministic" && experimentFields.map((section) => (
            <section key={section.title}>
              <h3>{section.title}</h3>
              {section.fields.map((field) => (
                <label className="field-row" key={field.key}>
                  {field.label + ":\t" + (field.format === "money" ? (currencyType == "GBP" ? "£" : "$") + "\t" : field.format === "percent" ? "+" : "")}
                  <NumberInput
                    step={field.step ?? 1}
                    value={field.format === "percent" ? Math.round(request.experiment[field.key] * 100) : request.experiment[field.key]}
                    onCommit={(value) => {
                      updateExperimentField(field.key,
                        field.format === "percent" ? value / 100 : value
                      )
                    }}
                  />
                  <span className="field-suffix">
                    {field.format === "percent" ? "%" : ""}
                    {field.info && <InfoTip text={field.info} />}
                  </span>
                </label>
              ))}
            </section>
          ))}
          {simulationMode === "monte-carlo" && experimentFields.map((section) => (
            <section key={section.title}>
              <h3>{section.title}</h3>
              {section.fields.map((field) => (
                <label className="range-field" key={field.key}>
                  <span className="range-field-title">
                    {field.label + "\t" + (field.format === "money" ? (currencyType == "GBP" ? "(£)" : "($)") + "\t" : field.format === "percent" ? "(%)" : "")} {field.info && <InfoTip text={field.info} />}
                  </span>
                  <div className="range-row">
                    {ExperimentBoundRange.map((bound) => (
                      <label className="range-bound" key={bound}>
                        {bound.at(0)?.toUpperCase() + bound.slice(1) + ":"}
                        <NumberInput
                          style={{ width: "56px" }}
                          key={bound}
                          step={field.step ?? 1}
                          value={field.format === "percent" ? Math.round(monteCarloRequest.experiment[field.key][bound] * 100) : monteCarloRequest.experiment[field.key][bound]}
                          onCommit={(value) => {
                            setMonteCarloField(field.key,
                              bound,
                              field.format === "percent" ? value / 100 : value
                            )
                          }}
                        />
                      </label>
                    ))}
                  </div>
                </label>
              ))}
            </section>
          ))}
        </div>
      </div>
      <div className="run-controls">
        <label className="months-control">
        <span>{"Months"}</span>
        <input
          type="number"
          step={1}
          value={request.months}
          onChange={(event) =>
            updateMonths(Math.max(1, Math.min(72, Number(event.target.value))))
          }
        />
        </label>
      <button className="primary-button" onClick={runSimulation}>
        Run Simulation
      </button>
      </div>
      {result && simulationMode === "deterministic" && (
        <>
          <section className="chart-section">
            <h2>Driver Breakdown</h2>
            <div className="chart-frame chart-frame-wide">
              <ResponsiveContainer>
                <BarChart
                  data={driverChartData}
                  margin={{ top: 20, right: 32, left: 64, bottom: 48 }}
                >
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis
                    dataKey={"name"}
                    interval={0}
                    angle={-10}
                    textAnchor='end'
                    height={70}
                  />
                  <YAxis
                    width={90}
                    tickFormatter={(value) => formatMoney(Number(value))}
                  />
                  <Tooltip
                    formatter={(value) => formatMoney(Number(value ?? 0))}
                  />
                  <Bar dataKey="impact" name="Net profit impact">
                    {driverChartData.map((entry) => (
                      <Cell
                        key={entry.name}
                        fill={entry.impact >= 0 ? "#16a34a" : "#dc2626"}
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </section>
          <ResultsDashboard
            result={result}
            formatMoney={formatMoney}
            formatNumber={formatNumber}
          />
        </>
      )}
      {monteCarloResult && simulationMode === "monte-carlo" && (
        <MonteCarloResultsDashboard
          result={monteCarloResult}
          formatMoney={formatMoney}
          formatPercent={formatPercent}
        />
      )}
    </main>
  )
}

export default App
