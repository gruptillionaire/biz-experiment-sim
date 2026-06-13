# biz-experiment-sim
Simulating outcomes for business experiments

Lightweight product-metric simulation tool for modelling how product and business experiments affecting acquisition, retention, conversion, revenue, cost metrics, and net profit over time.

This simulator compares a baseline model against an experimental scenario & visualises the difference through deterministic forecasts and Monte Carlo risk analysis

## Purpose

This project explores how product & business experiments can be compared through simple deterministic modelling. It is designed as an internal decision tool rather than a prediction engine.

It answers questions such as:
- If activation improves, does the experiment actually beat the baseline?
- What is the upside most driven by?
- How sensitive is the outcome to uncertainty?
- What is the probability that the experiment beats the baseline?
- What is the risk that this experiment loses money?

## Features

- Baseline metric inputs
- Experiment/change inputs
- 1-72 month simulation window
- Baseline vs experiment comparison
- Profit & userbase charts
- Driver impact breakdown
- Monte Carlo uncertainty simulation
- P10/median/P90 uplift baseline
- Probability of loss
- Uplift distribution histogram

## Simulation Model

The *deterministic* simulator applies experiment changes to the baseline model and projects the results month by month.

Core metrics:
- Starting users
- New users per month
- Activation rate
- Monthly retention rate
- Conversion rate
- Average revenue per paying user
- Customer acquisition cost
- Gross margin rate
- Fixed monthly cost

& the model tracks:

- Activated users
- Retained users
- Active users
- Paying users
- Monthly revenue
- Monthly net profit
- Cumulative net profit

## Monte Carlo Simulation Mode

The *Monte Carlo* simulator allows experiment assumptions to be entered as ranges rather than exact values.
For each run, the simulator samples values from the supplied ranges via a triangular randomness then runs the same simulation model. The resulting uplift values are aggregated into:
- P10 net profit uplift
- Median net profit uplift
- Chance to beat baseline
- Chance to lose money
- Histogram buckets for uplift distribution

Histogram buckets are bounded by zero and bucket amount is dynamic based off of the % of each sign.

## Stack

React + TSX // frontend
Python // backend
Rechart // charts
FastAPI // API endpoints
Pydantic // strict request/response validation
vite // local frontend development

## Planned Improvements
- Scenario comparison
- Deployment build (?)