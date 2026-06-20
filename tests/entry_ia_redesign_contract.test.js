/* Benchmark-first entry contract
 * Verifies that the app enters data benchmark first; launch remains only as a legacy compatibility page.
 */

const fs = require("fs");
const assert = require("assert/strict");
const vm = require("vm");

const html = fs.readFileSync("index.html", "utf8");
const css = fs.readFileSync("styles/app.css", "utf8");
const router = fs.readFileSync("js/42-portal-router.js", "utf8");
const state = fs.readFileSync("js/01-state.js", "utf8");

[
  'data-app-page="benchmark"',
  'data-portal-page="benchmark"',
  'id="benchmarkPageShell"',
].forEach((needle) => {
  assert(html.includes(needle), `missing benchmark-first marker: ${needle}`);
});

[
  'activePortalPage: "benchmark"',
].forEach((needle) => {
  assert(state.includes(needle), `state must default to benchmark: ${needle}`);
});

[
  'var PORTAL_PAGES = ["benchmark", "answer", "evidence", "topics", "report", "data"]',
  'initialPage = "benchmark"',
  'return "benchmark"',
].forEach((needle) => {
  assert(router.includes(needle), `router must default to benchmark: ${needle}`);
});

[
  'class="field-label selector-field target-field"',
  'class="field-label selector-field peer-field"',
  'class="field-label selector-field year-field"',
  'class="field-label selector-field identity-field"',
  "目标银行",
  "对标银行",
  "分析年份",
  "身份",
  ">进入数据对标<",
  'class="entry-role-segment"',
  'data-entry-role="board"',
  'data-entry-role="cfo"',
  'data-entry-role="cro"',
  'data-entry-role="expert"',
  'data-entry-audience="board"',
  'data-entry-audience="cfo"',
  'data-entry-audience="cro"',
  'data-entry-audience="expert"',
].forEach((needle) => {
  assert(html.includes(needle), `legacy launch parameter marker should remain available: ${needle}`);
});

assert(!html.includes('id="entryDecisionPanel"'), "launch should not render a separate marketing-style entry panel");
assert(!html.includes('data-entry-route="report-after-benchmark"'), "launch must not show a parallel report entrance card");
assert(!html.includes('class="entry-workflow-grid"'), "launch must not render two equal workflow cards");
assert(!html.includes('class="entry-flow-steps"'), "launch should keep only the essential start action and role choices");
assert(!html.includes(">CFO<"), "launch visible role labels should not use English abbreviations");
assert(!html.includes(">CRO<"), "launch visible role labels should not use English abbreviations");

[
  'data-entry-role="board" data-entry-audience="board" data-page-link="benchmark"',
  'data-entry-role="cfo" data-entry-audience="cfo" data-page-link="benchmark"',
  'data-entry-role="cro" data-entry-audience="cro" data-page-link="benchmark"',
  'data-entry-role="expert" data-entry-audience="expert" data-page-link="benchmark"',
].forEach((needle) => {
  assert(html.includes(needle), `identity choice must persist role and route through benchmark: ${needle}`);
});

[
  ".entry-decision-panel",
  ".entry-primary-action",
  ".entry-role-segment",
  ".entry-role-pill",
].forEach((needle) => {
  assert(css.includes(needle), `missing entry CSS hook: ${needle}`);
});

[
  'benchmark: "数据对标"',
].forEach((needle) => {
  assert(router.includes(needle), `router labels must include ${needle}`);
});

assert(
  !router.includes('localStorage.getItem("benchmarkiq.activePortalPage")'),
  "cold start must not restore a stale downstream page from localStorage"
);
assert(
  !router.includes("window.location.hash.match"),
  "cold start must not restore a stale downstream page from URL hash"
);

let bodyPage = "answer";
let storedPage = null;
const context = {
  window: {
    location: { hash: "#page/answer" },
    addEventListener() {},
    scrollTo() {},
  },
  history: { replaceState(_a, _b, hash) { context.window.location.hash = hash; } },
  localStorage: {
    getItem(key) { return key === "benchmarkiq.activePortalPage" ? "answer" : null; },
    setItem(key, value) { if (key === "benchmarkiq.activePortalPage") storedPage = value; },
  },
  document: {
    body: {
      dataset: { appState: "setup" },
      getAttribute(name) { return name === "data-app-page" ? bodyPage : null; },
      setAttribute(name, value) { if (name === "data-app-page") bodyPage = value; },
      classList: { add() {} },
    },
    addEventListener() {},
  },
  state: { activePortalPage: "answer", confirmed: false },
  setAppMode(mode) { context.lastMode = mode; },
};
context.window = Object.assign(context.window, context);
vm.createContext(context);
vm.runInContext(router, context);
context.window.initPortalRouter();
assert.equal(context.state.activePortalPage, "benchmark", "cold start must land on data benchmark even after answer was stored");
assert.equal(bodyPage, "benchmark", "body page must be benchmark on cold start");
assert.equal(storedPage, "benchmark", "cold start should overwrite stale active page storage");

[
  "function applyEntryIntent",
  'localStorage.setItem("benchmarkiq.entryRole"',
  'localStorage.setItem("benchmarkiq.audience"',
  'document.body.setAttribute("data-entry-role"',
].forEach((needle) => {
  assert(router.includes(needle), `router must persist entry intent via ${needle}`);
});

console.log("entry-ia-data-first-contract-ok");
