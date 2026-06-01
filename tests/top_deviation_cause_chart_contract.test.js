const fs = require("fs");
const assert = require("assert/strict");

const v6 = fs.readFileSync("js/27-v6-boardroom-engine.js", "utf8");
const v5 = fs.readFileSync("js/26-v5-value-engine.js", "utf8");
const workspace = fs.readFileSync("js/19-product-workspace.js", "utf8");
const css = fs.readFileSync("styles/app.css", "utf8");

[
  "function anomalyCauseBars",
  "function anomalyLikelyReason",
  "function anomalyCauseChartHtml",
  "可能原因"
].forEach((needle) => {
  assert(v6.includes(needle), `V6 anomaly cause model missing ${needle}`);
});

assert(workspace.includes("anomalyCauseChartHtml"), "Step 2 Top Changes should render cause chart");
assert(v5.includes("anomalyCauseChartHtml"), "Formal V5 deviation radar should render cause chart");

[
  ".anomaly-cause-chart",
  ".anomaly-cause-bar",
  ".step2-change-reason"
].forEach((needle) => {
  assert(css.includes(needle), `Anomaly cause chart CSS missing ${needle}`);
});

console.log("top-deviation-cause-chart-contract-ok");
