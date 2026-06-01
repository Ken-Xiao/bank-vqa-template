const fs = require("fs");
const assert = require("assert/strict");

const decision = fs.readFileSync("js/34-decision-workbench.js", "utf8");
const workspace = fs.readFileSync("js/19-product-workspace.js", "utf8");

[
  "function metricTimeSeriesSnapshot",
  "targetSeries",
  "peerAverageSeries",
  "typeAverageSeries"
].forEach((needle) => {
  assert(decision.includes(needle), `Time-series helper missing ${needle}`);
});

[
  "metricTimeSeriesSnapshot",
  "metric-trend-mini",
  "renderMetricTrendLine"
].forEach((needle) => {
  assert(workspace.includes(needle), `Context rail should render time-series ${needle}`);
});

console.log("sprint10a-metric-timeseries-contract-ok");
