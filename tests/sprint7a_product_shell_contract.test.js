const fs = require("fs");
const assert = require("assert/strict");

const html = fs.readFileSync("index.html", "utf8");
const css = fs.readFileSync("styles/app.css", "utf8");
const rsmCss = fs.readFileSync("styles/rsm-consulting-ppt.css", "utf8");
const state = fs.readFileSync("js/01-state.js", "utf8");
const workspace = fs.readFileSync("js/19-product-workspace.js", "utf8");

[
  'id="globalBar"',
  'data-app-mode-target="setup"',
  'data-app-mode-target="analysis"',
  'data-app-mode-target="report"',
  'id="step1Content"',
  'id="step2Content"',
  'id="step3Content"',
  'class="step2-path-nav"',
  'data-step2-jump="summary"',
  'data-step2-jump="actions"',
  'id="toolDrawer"',
  'data-drawer-tab-target="data"',
  'data-drawer-tab-target="review"',
  'data-drawer-tab-target="project"',
  'data-drawer-tab-target="ai"'
].forEach((needle) => assert(html.includes(needle), `missing HTML shell marker: ${needle}`));

[
  "appMode",
  "drawerOpen",
  "activeDrawerTab"
].forEach((needle) => assert(state.includes(needle), `state must include ${needle}`));

[
  "function setAppMode",
  "function renderGlobalBar",
  "function bindGlobalBar",
  "function bindStep2PathNav",
  "function openToolDrawer",
  "function closeToolDrawer",
  "function setDrawerTab"
].forEach((needle) => assert(workspace.includes(needle), `workspace must include ${needle}`));

[
  "--global-bar-height",
  "--drawer-width",
  "body[data-app-state=\"setup\"]",
  "body[data-app-state=\"analysis\"]",
  "body[data-app-state=\"report\"]",
  "body[data-app-state=\"setup\"] .hero",
  "body[data-app-state=\"setup\"] #step1Content",
  "body.analysis-ready:not(.setup-expanded):not([data-app-state=\"setup\"])",
  ".global-bar",
  ".step-shell",
  ".step2-path-nav",
  ".tool-drawer"
].forEach((needle) => assert(css.includes(needle), `missing CSS shell marker: ${needle}`));

[
  "tool-drawer-link-list",
  "指标探索器",
  "导出页序 QA",
  "CEAM 结构"
].forEach((needle) => assert(workspace.includes(needle), `drawer must expose productized tool entry: ${needle}`));

[
  'body[data-app-state="setup"] .selection-intro',
  'body[data-app-state="setup"] .filters',
  'grid-template-areas:',
  '"target"',
  '"peer"'
].forEach((needle) => assert(rsmCss.includes(needle), `RSM theme must preserve setup flow override: ${needle}`));

[
  'if (typeof setAppMode === "function") setAppMode("analysis")',
  'if (typeof setAppMode === "function") setAppMode("setup")'
].forEach((needle) => assert(fs.readFileSync("js/04-ui-selection.js", "utf8").includes(needle), `selection flow must route through app mode: ${needle}`));

console.log("sprint7a-product-shell-contract-ok");
