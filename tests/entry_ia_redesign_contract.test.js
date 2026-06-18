/* Entry IA redesign contract
 * Verifies that launch uses data-first workflow choices and role presets.
 */

const fs = require("fs");
const assert = require("assert/strict");

const html = fs.readFileSync("index.html", "utf8");
const css = fs.readFileSync("styles/app.css", "utf8");
const router = fs.readFileSync("js/42-portal-router.js", "utf8");

[
  'id="entryDecisionPanel"',
  'class="entry-primary-action"',
  'data-entry-route="benchmark-first"',
  "选数据，出报告",
  ">开始<",
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
  assert(html.includes(needle), `missing data-first entry marker: ${needle}`);
});

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
  assert(html.includes(needle), `role entry must route through benchmark: ${needle}`);
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
  'report: "报告工作室"',
  'launch: "入口说明"',
].forEach((needle) => {
  assert(router.includes(needle), `router labels must include ${needle}`);
});

[
  "function applyEntryIntent",
  'localStorage.setItem("benchmarkiq.entryRole"',
  'localStorage.setItem("benchmarkiq.audience"',
  'document.body.setAttribute("data-entry-role"',
].forEach((needle) => {
  assert(router.includes(needle), `router must persist entry intent via ${needle}`);
});

console.log("entry-ia-data-first-contract-ok");
