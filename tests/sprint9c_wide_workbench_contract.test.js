const fs = require("fs");
const assert = require("assert/strict");

const css = fs.readFileSync("styles/app.css", "utf8");
const html = fs.readFileSync("index.html", "utf8");
const workspace = fs.readFileSync("js/19-product-workspace.js", "utf8");

[
  "--workbench-max",
  "--context-rail-width",
  ".analysis-workbench-grid",
  ".analysis-main-canvas",
  ".metric-context-rail"
].forEach((needle) => {
  assert(css.includes(needle), `Wide workbench CSS missing ${needle}`);
});

[
  "analysisWorkbenchGrid",
  "analysisMainCanvas",
  "metricContextRail"
].forEach((needle) => {
  assert(html.includes(needle), `Wide workbench HTML missing ${needle}`);
});

assert(workspace.includes("renderMetricContextRail"), "workspace should render metric context rail");

console.log("sprint9c-wide-workbench-contract-ok");
