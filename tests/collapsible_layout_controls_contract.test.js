const fs = require("fs");
const assert = require("assert/strict");

const html = fs.readFileSync("index.html", "utf8");
const css = fs.readFileSync("styles/app.css", "utf8");
const workspace = fs.readFileSync("js/19-product-workspace.js", "utf8");

[
  "toggleSideNav",
  "toggleAnalysisRoadmap",
  "toggleReportControlRail"
].forEach((id) => assert(html.includes(id), `missing ${id}`));

assert(html.includes('data-layout-collapse-target="sideNav"'), "side nav must expose collapse target");
assert(html.includes('data-layout-collapse-target="analysisRoadmap"'), "analysis roadmap must expose collapse target");
assert(html.includes('data-layout-collapse-target="reportControlRail"'), "report control rail must expose collapse target");

[
  "layout-nav-collapsed",
  "layout-map-collapsed",
  "layout-rail-collapsed",
  ".layout-collapse-toggle",
  ".side-nav.is-collapsed",
  ".analysis-roadmap.is-collapsed",
  ".report-control-rail.is-collapsed"
].forEach((needle) => assert(css.includes(needle), `missing CSS ${needle}`));

[
  "function setLayoutPanelCollapsed",
  "function toggleLayoutPanel",
  "function bindLayoutPanelToggles",
  "layoutPanelStorageKey"
].forEach((needle) => assert(workspace.includes(needle), `missing JS ${needle}`));

console.log("collapsible-layout-controls-contract-ok");
