const fs = require("fs");
const assert = require("assert/strict");

const html = fs.readFileSync("index.html", "utf8");
const css = fs.readFileSync("styles/app.css", "utf8");
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
  ".global-bar",
  ".step-shell",
  ".tool-drawer"
].forEach((needle) => assert(css.includes(needle), `missing CSS shell marker: ${needle}`));

console.log("sprint7a-product-shell-contract-ok");
