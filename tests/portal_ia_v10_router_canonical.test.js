const fs = require("fs");
const assert = require("assert/strict");

const html = fs.readFileSync("index.html", "utf8");
const router = fs.readFileSync("js/42-portal-router.js", "utf8");
const rail = fs.readFileSync("js/43-page-rail.js", "utf8");
const workspace = fs.readFileSync("js/19-product-workspace.js", "utf8");
const report = fs.readFileSync("js/08-report.js", "utf8");
const bootstrap = fs.readFileSync("js/10-bootstrap.js", "utf8");
const css = fs.readFileSync("styles/app.css", "utf8");

[
  'id="pageRail"',
  'data-app-page="launch"',
  'data-portal-page="launch"',
  'data-portal-page="answer"',
  'data-portal-page="evidence"',
  'data-portal-page="topics"',
  'data-portal-page="report"',
  'data-portal-page="data"'
].forEach((needle) => assert(html.includes(needle), `missing canonical page shell marker: ${needle}`));

[
  'src="js/42-portal-router.js',
  'src="js/43-page-rail.js',
  'src="js/10-bootstrap.js"'
].forEach((needle) => assert(html.includes(needle), `missing router script: ${needle}`));
assert(
  html.indexOf('src="js/42-portal-router.js') < html.indexOf('src="js/43-page-rail.js')
    && html.indexOf('src="js/43-page-rail.js') < html.indexOf('src="js/10-bootstrap.js"'),
  "portal router and page rail must load before bootstrap"
);

[
  'var PORTAL_PAGES = ["launch", "answer", "evidence", "topics", "report", "data"]',
  "function setPortalPage",
  "function getPortalPage",
  "function initPortalRouter",
  'document.body.setAttribute("data-app-page", target)',
  'document.body.dataset.appState !== "setup"',
  'localStorage.setItem("benchmarkiq.activePortalPage", target)',
  '"#page/" + target'
].forEach((needle) => assert(router.includes(needle), `router missing canonical behavior: ${needle}`));
assert(router.includes("skipPortal: true"), "router must sync app mode without recursively overriding the active page");

[
  "function renderPageRail",
  "function initPageRail",
  "function resolvePortalSubAnchor",
  "PORTAL_SUB_ANCHORS",
  "data-page-link",
  "data-sub-anchor",
  "data-sub-page",
  "stopPropagation",
  "setPortalPage(page, { skipScroll: true",
  "is-disabled",
  'document.body.dataset.appState !== "setup"'
].forEach((needle) => assert(rail.includes(needle), `page rail missing canonical behavior: ${needle}`));

[
  'verdict: "#clientCommandCenter"',
  'kpi: "#step2KpiStrip"',
  'questions: "#step2BoardQuestions"',
  'changes: "#step2TopChanges"',
  'peerPos: "#step2PeerPosition"',
  'preview: "#formalReportShell"',
  'triSource: "#triSourceValidationPanel"',
  'mainChart: "#profitQualityMount"',
  'action: "#ibEvidencePanel"'
].forEach((needle) => assert(rail.includes(needle), `page rail sub navigation must target real module anchors: ${needle}`));

[
  "initPageRail",
  "initPortalRouter"
].forEach((needle) => assert(bootstrap.includes(needle), `bootstrap must initialize ${needle}`));

[
  "getPortalPage() === \"launch\"",
  'setPortalPage("answer"',
  'setPortalPage("report"'
].forEach((needle) => assert(workspace.includes(needle), `workspace app mode sync must route to canonical page: ${needle}`));

[
  'body[data-app-page="launch"] [data-portal-page]:not([data-portal-page~="launch"])',
  'body[data-app-page="answer"] [data-portal-page]:not([data-portal-page~="answer"])',
  'body[data-app-page="evidence"] [data-portal-page]:not([data-portal-page~="evidence"])',
  'body[data-app-page="topics"] [data-portal-page]:not([data-portal-page~="topics"])',
  'body[data-app-page="report"] [data-portal-page]:not([data-portal-page~="report"])',
  'body[data-app-page="data"] [data-portal-page]:not([data-portal-page~="data"])'
].forEach((needle) => assert(css.includes(needle), `CSS missing page visibility rule: ${needle}`));

assert(router.includes('return "topics";'), "old topicDetail hashes must normalize into merged topics page");
assert(!css.includes('body[data-app-page="topicDetail"]'), "merged topic page must not keep independent topicDetail visibility rule");

[
  "function portalNavItems",
  "function portalItemById",
  "function portalPageForWorkspaceTab",
  "var activePortalPage"
].forEach((needle) => assert(!workspace.includes(needle), `workspace must not duplicate canonical portal router: ${needle}`));

[
  "portal-nav-group",
  "portal-nav-primary",
  "Portal 任务流"
].forEach((needle) => assert(!report.includes(needle), `report side nav must not duplicate canonical page rail: ${needle}`));

assert(!html.includes('id="sideNav"'), "legacy sideNav should not render alongside pageRail");

console.log("portal-ia-v10-router-canonical-ok");
