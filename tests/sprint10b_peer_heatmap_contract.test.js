const fs = require("fs");
const assert = require("assert/strict");

const decision = fs.readFileSync("js/34-decision-workbench.js", "utf8");
const workspace = fs.readFileSync("js/19-product-workspace.js", "utf8");
const css = fs.readFileSync("styles/app.css", "utf8");

[
  "function peerHeatmapRows",
  "function metricPercentile",
  "function heatmapTone",
  "targetRecord()"
].forEach((needle) => {
  assert(decision.includes(needle), `Peer heatmap helper missing ${needle}`);
});

[
  "renderStep2PeerHeatmap",
  "peerHeatmapRows"
].forEach((needle) => {
  assert(workspace.includes(needle), `Step 2 should render peer heatmap ${needle}`);
});

[
  ".peer-heatmap",
  ".peer-heatmap-cell",
  ".peer-heatmap-row"
].forEach((needle) => {
  assert(css.includes(needle), `Peer heatmap style missing ${needle}`);
});

console.log("sprint10b-peer-heatmap-contract-ok");
