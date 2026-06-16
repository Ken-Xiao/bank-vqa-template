/* Entry IA redesign contract
 * Verifies that launch starts with data/report workflow choices and role routes.
 */

const fs = require("fs");
const assert = require("assert/strict");

const html = fs.readFileSync("index.html", "utf8");
const css = fs.readFileSync("styles/app.css", "utf8");
const router = fs.readFileSync("js/42-portal-router.js", "utf8");

[
  'id="entryDecisionPanel"',
  'class="entry-workflow-grid"',
  'data-entry-route="data"',
  'data-entry-route="report"',
  'class="entry-role-grid"',
  'data-entry-role="board"',
  'data-entry-role="cfo"',
  'data-entry-role="cro"',
  'data-entry-role="expert"',
].forEach((needle) => {
  assert(html.includes(needle), `missing launch entry marker: ${needle}`);
});

[
  'data-page-link="benchmark"',
  'data-page-link="report"',
  'data-page-link="answer"',
  'data-page-link="topics"',
  'data-page-link="data"',
].forEach((needle) => {
  assert(html.includes(needle), `entry cards must use router link ${needle}`);
});

[
  ".entry-decision-panel",
  ".entry-workflow-grid",
  ".entry-route-card",
  ".entry-role-grid",
  ".entry-role-card",
].forEach((needle) => {
  assert(css.includes(needle), `missing entry CSS hook: ${needle}`);
});

[
  'launch: "入口工作台"',
  'answer: "董事会入口"',
  'topics: "专题与风控"',
  'report: "报告入口"',
  'benchmark: "数据入口"',
].forEach((needle) => {
  assert(router.includes(needle), `router labels must include ${needle}`);
});

console.log("entry-ia-redesign-contract-ok");
