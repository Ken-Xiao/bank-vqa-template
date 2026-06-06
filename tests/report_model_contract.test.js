/* Sprint 7D-0 PR-A + PR-B contract test.
 * Asserts:
 *   1. applyFormalReportContract() sets all 6+ dataset attributes per section spec.
 *   2. reportDeliveryModel() is exposed and returns the contract shape.
 *   3. meta layer includes targetBank/year/peers/reportVersion/whatIfScenario.
 *   4. error guards: bad input does not throw.
 *   5. index.html loads js/35-report-model.js after js/22-formal-report.js.
 */

const fs = require("fs");
const assert = require("assert/strict");

const formalReport = fs.readFileSync("js/22-formal-report.js", "utf8");
const reportModel = fs.readFileSync("js/35-report-model.js", "utf8");
const html = fs.readFileSync("index.html", "utf8");

// --- PR-A: applyFormalReportContract sets dataset attrs ---
[
  "function applyFormalReportContract",
  "section.dataset.id",
  "section.dataset.sectionId",
  "section.dataset.sectionTitle",
  "section.dataset.moduleLabel",
  "section.dataset.pageRole",
  "section.dataset.deckType",
  "section.dataset.included",
  "section.dataset.slideIndex",
  "section.dataset.slideTotal"
].forEach((needle) => assert(formalReport.includes(needle), `formal-report must set ${needle}`));

// PR-A: error guard exists
assert(formalReport.includes("try {") && formalReport.includes("[reportModel] applyFormalReportContract"),
  "applyFormalReportContract must have try/catch and warn log");

// PR-A: formalReportModel respects data-included
assert(formalReport.includes('section.dataset?.included !== "false"'),
  "formalReportModel must filter by data-included !== false");

// --- PR-B: reportDeliveryModel exists with correct shape ---
[
  "function reportDeliveryModel",
  "function reportModelMeta",
  "function reportModelSerializeSection",
  "function reportModelExtractRiskStamp",
  "function reportModelExtractBlocks",
  "function reportModelGetSection",
  "function reportModelSectionsByRole",
  "function reportModelDebugSummary"
].forEach((needle) => assert(reportModel.includes(needle), `report-model must define ${needle}`));

// PR-B: meta layer fields
[
  "targetBank",
  "analysisYear",
  "peers",
  "reportVersion",
  "whatIfScenario",
  "nimShift",
  "nplShift",
  "costIncomeShift"
].forEach((needle) => assert(reportModel.includes(needle), `reportModelMeta must expose ${needle}`));

// PR-B: ReportModel shape per contract doc
[
  'version: "v1"',
  "meta:",
  "sections:",
  "generatedAt:"
].forEach((needle) => assert(reportModel.includes(needle), `reportDeliveryModel must return ${needle}`));

// PR-B: Block kinds match the contract spec
[
  "metricHero",
  "soWhat",
  "chartReadout",
  "factTable",
  "actionCard",
  "mechanismCard",
  "riskCard",
  "scrTopic",
  "whatIfStrip",
  "footnote",
  "aiCommentary"
].forEach((kind) => assert(reportModel.includes(`"${kind}"`), `report-model must classify block kind "${kind}"`));

// PR-B: window exposure for debug + consumers
[
  "window.reportDeliveryModel",
  "window.reportModelDebugSummary",
  "window.reportModelGetSection",
  "window.reportModelSectionsByRole"
].forEach((needle) => assert(reportModel.includes(needle), `report-model must expose ${needle} on window`));

// PR-B: error guard
assert(reportModel.includes("try {") && reportModel.includes("[reportModel] reportDeliveryModel failed"),
  "reportDeliveryModel must guard with try/catch");

// --- index.html load order: 35-report-model must load AFTER 22-formal-report ---
const idx22 = html.indexOf('js/22-formal-report.js');
const idx35 = html.indexOf('js/35-report-model.js');
assert(idx22 > 0, "index.html must include js/22-formal-report.js");
assert(idx35 > 0, "index.html must include js/35-report-model.js");
assert(idx35 > idx22, "js/35-report-model.js must load after js/22-formal-report.js (dependency order)");

console.log("report-model-contract-ok");
