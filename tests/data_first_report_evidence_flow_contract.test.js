const fs = require("fs");
const assert = require("assert/strict");

const html = fs.readFileSync("index.html", "utf8");
const bridge = fs.readFileSync("js/56-benchmark-state-bridge.js", "utf8");
const css = fs.readFileSync("styles/benchmark.css", "utf8");

[
  'id="bmReportEvidenceSelector"',
  "data-report-evidence-selector",
  'id="bmOpenReportEvidenceSelector"',
  "选择数据并进入报告",
  'id="benchmarkEvidencePackSummary"',
].forEach((needle) => {
  assert(html.includes(needle), `missing report evidence UI marker: ${needle}`);
});

[
  "function buildBenchmarkEvidencePack",
  "function matchReportAngles",
  "function saveBenchmarkEvidencePack",
  "function getBenchmarkEvidencePack",
  "function renderBenchmarkEvidencePackSummary",
  'localStorage.setItem("benchmarkiq.evidencePack"',
  'localStorage.getItem("benchmarkiq.evidencePack"',
  'setPortalPage("report"',
].forEach((needle) => {
  assert(bridge.includes(needle), `missing evidence pack bridge behavior: ${needle}`);
});

[
  "盈利能力分析",
  "负债结构与息差压力",
  "资产质量与风险抵补",
  "流动性与安全边际",
  "关键问题追溯",
].forEach((needle) => {
  assert(bridge.includes(needle), `missing report angle mapping: ${needle}`);
});

[
  ".bm-report-selector",
  ".bm-report-selector-grid",
  ".bm-evidence-pack-summary",
  ".bm-report-angle-chip",
].forEach((needle) => {
  assert(css.includes(needle), `missing evidence selector CSS hook: ${needle}`);
});

console.log("data-first-report-evidence-flow-contract-ok");
