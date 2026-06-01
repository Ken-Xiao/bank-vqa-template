const fs = require("fs");
const assert = require("assert/strict");

const boardroom = fs.readFileSync("js/27-v6-boardroom-engine.js", "utf8");
const workspace = fs.readFileSync("js/19-product-workspace.js", "utf8");
const css = fs.readFileSync("styles/app.css", "utf8");
const html = fs.readFileSync("index.html", "utf8");

[
  "function v6AnomalySemanticTag",
  "function v6AnomalyWhyItMatters",
  "结构性信号",
  "周期扰动",
  "待验证混合信号",
  "管理含义"
].forEach((needle) => assert(boardroom.includes(needle), `missing anomaly semantic marker: ${needle}`));

[
  "function step2ChangeCardModel",
  "function step2PeerPositionReadout",
  "defaultCollapsed: true",
  "change-signal-pill",
  "step2-change-action",
  "step2-change-meta",
  "step2-change-stack",
  "step2-change-lane",
  "step2-change-card",
  "step2-sparc-readout",
  "step2PeerPositionReadout"
].forEach((needle) => assert(workspace.includes(needle), `workspace missing ${needle}`));

[
  ".step2-change-card",
  ".step2-change-action",
  ".step2-change-meta",
  ".step2-change-stack",
  ".step2-change-lane",
  ".step2-evidence-section.is-vertical",
  ".change-signal-pill",
  ".step2-sparc-readout",
  ".report-control-rail.is-docked"
].forEach((needle) => assert(css.includes(needle), `css missing ${needle}`));

assert(html.includes("report-control-rail is-docked is-collapsed"), "delivery rail should default to docked collapsed mode");
assert(html.includes("step2-evidence-section is-vertical\" id=\"step2TopChanges"), "top changes should use vertical evidence layout");
assert(html.includes("step2-evidence-section is-vertical\" id=\"step2PbAnswer"), "PB answer should use vertical evidence layout");
assert(html.includes("v5-two-column is-stacked"), "deep PB and anomaly radar cards should stack vertically");
assert(css.includes(".v5-two-column.is-stacked"), "stacked V5 deep module layout should be styled");

console.log("sprint7e-diagnostic-presentation-contract-ok");
