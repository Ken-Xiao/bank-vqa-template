const fs = require("fs");
const assert = require("assert/strict");

const html = fs.readFileSync("index.html", "utf8");
const css = fs.readFileSync("styles/app.css", "utf8");
const router = fs.readFileSync("js/42-portal-router.js", "utf8");
const workspace = fs.readFileSync("js/19-product-workspace.js", "utf8");
const reportWorkbench = fs.readFileSync("js/24-prd-v3-workbench.js", "utf8");

[
  'data-step2-page="answer"',
  'data-step2-page="evidence"',
  'data-step2-page="topics"',
  'id="step2BridgeEvidence" data-portal-page="evidence"',
  'class="step2-evidence-grid" data-portal-page="evidence"',
  'id="step2BridgeTopics" data-portal-page="topics"',
  'id="step2BridgeActions" data-portal-page="answer topics"',
  'id="topicWorkbenchSection" data-workspace-tab="topics" data-portal-page="topics"',
  'id="analysisDeckShell" data-workspace-tab="legacy-report" data-portal-page="report"',
].forEach((needle) => assert(html.includes(needle), `IA-2 page boundary HTML missing: ${needle}`));

[
  'id="projectFlow" data-workspace-tab="governance" data-portal-page="data" data-portal-hidden-default="true"',
  'class="methodology analysis-content client-internal" data-workspace-tab="governance" data-portal-page="data" data-portal-hidden-default="true"',
  'class="method-card analysis-content" data-workspace-tab="overview" data-portal-page="report"',
].forEach((needle) => assert(html.includes(needle), `Legacy analysis block must be scoped or hidden: ${needle}`));

[
  'body[data-app-page="answer"] .step2-path-nav a:not([data-step2-page~="answer"])',
  'body[data-app-page="evidence"] .step2-path-nav a:not([data-step2-page~="evidence"])',
  'body[data-app-page="topics"] .step2-path-nav a:not([data-step2-page~="topics"])',
  "repeat(auto-fit, minmax(180px, 1fr))",
  'body[data-app-page]:not([data-app-page="launch"]) .selection-summary',
].forEach((needle) => assert(css.includes(needle), `IA-2 page boundary CSS missing: ${needle}`));

[
  "function syncStep2PathNavForPortalPage",
  "window.syncStep2PathNavForPortalPage",
].forEach((needle) => assert(workspace.includes(needle), `IA-2 nav sync missing: ${needle}`));

assert(router.includes("syncStep2PathNavForPortalPage(target)"), "Portal router must sync visible secondary navigation on page change");

[
  'sticky.dataset.workspaceTab = "report"',
  'sticky.dataset.portalPage = "report"',
  'workbench.dataset.portalPage = "report"',
].forEach((needle) => assert(reportWorkbench.includes(needle), `Report workbench must stay inside report page: ${needle}`));

console.log("portal-ia-v11-page-boundary-contract-ok");
