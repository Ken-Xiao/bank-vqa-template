const fs = require("fs");
const assert = require("assert/strict");

const decision = fs.readFileSync("js/34-decision-workbench.js", "utf8");
const workspace = fs.readFileSync("js/19-product-workspace.js", "utf8");
const portal = fs.readFileSync("js/21-portal-workflows.js", "utf8");
const css = fs.readFileSync("styles/app.css", "utf8");

[
  "function whatIfIsActive",
  "function decisionWorkbenchRow",
  "function whatIfSimulationBadge",
  "function whatIfLinkedRefresh",
  "whatIfScenario(row)",
  "__whatIfSimulation"
].forEach((needle) => {
  assert(decision.includes(needle), `Sprint 10C decision helper missing ${needle}`);
});

[
  "decisionWorkbenchRow",
  "whatIfSimulationBadge",
  "renderStep2PeerHeatmap(row)",
  "renderMetricContextRail"
].forEach((needle) => {
  assert(workspace.includes(needle), `Sprint 10C workspace linkage missing ${needle}`);
});

assert(portal.includes("whatIfLinkedRefresh"), "What-if slider should trigger linked Step 2 refresh");
assert(portal.includes("renderWhatIfControlPanel"), "What-if slider should still update local result cards");

[
  ".whatif-simulation-badge",
  ".metric-context-card.is-simulation",
  ".peer-heatmap-row.is-simulation"
].forEach((needle) => {
  assert(css.includes(needle), `Sprint 10C simulation style missing ${needle}`);
});

console.log("sprint10c-whatif-linkage-contract-ok");
