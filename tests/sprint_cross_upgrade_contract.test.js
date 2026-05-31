const fs = require("fs");
const vm = require("vm");

const root = process.cwd();
const html = fs.readFileSync(`${root}/index.html`, "utf8");

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

assert(html.includes('id="sprintBaselinePanel"'), "Sprint 0 should expose a baseline readiness panel");
assert(html.includes('id="overviewDepthToggle"'), "Sprint 2 should expose an overview depth toggle");
assert(html.includes('data-overview-depth="secondary"'), "Sprint 2 should mark secondary overview modules");
assert(html.includes('id="fieldCoverageMatrixPanel"'), "Sprint 3 should expose a field matrix detail panel");
assert(html.includes('id="fieldCoverageMatrixFilter"'), "Sprint 3 field matrix should provide a filter control");

const context = {
  console,
  window: {},
  document: {
    getElementById: () => null,
    querySelector: () => null,
    querySelectorAll: () => []
  },
  aiProviderConfig: { provider: "local" }
};
vm.createContext(context);

[
  "data.js",
  "js/01-state.js",
  "js/02-config.js",
  "js/03-data-format.js",
  "js/05-analysis.js",
  "js/20-pro-engine.js",
  "js/21-portal-workflows.js",
  "js/11-fact-pack.js",
  "js/13-pptx-export.js"
].forEach((file) => {
  vm.runInContext(fs.readFileSync(`${root}/${file}`, "utf8"), context, { filename: file });
});

context.analysisRules = JSON.parse(fs.readFileSync(`${root}/analysis_rules.json`, "utf8"));
context.metricDictionary = Object.fromEntries(
  JSON.parse(fs.readFileSync(`${root}/data_governance/metric_dictionary.json`, "utf8"))
    .map((item) => [item.metric_code, item])
);
context.fieldCoverageMatrix = JSON.parse(fs.readFileSync(`${root}/data_governance/field_coverage_matrix.json`, "utf8"));
context.state.target = "苏州农商行";
context.state.peers = ["常熟农商行", "瑞丰农商行", "上海农商行", "苏州"];
context.state.year = 2025;
context.state.types = ["国有大行", "股份行", "城市商业银行", "农村商业银行"];

assert(typeof context.sprintBaselineRows === "function", "Sprint 0 should define baseline rows");
assert(context.sprintBaselineRows().some((row) => row.key === "resources" && row.status === "pass"), "Sprint 0 baseline should include resource check");
assert(typeof context.fieldCoverageMatrixDetailRows === "function", "Sprint 3 should define field detail rows");
const pendingRows = context.fieldCoverageMatrixDetailRows("pending");
assert(pendingRows.length > 20, "Sprint 3 field detail should filter pending fields");
assert(pendingRows.every((row) => row.接入状态 === "pending"), "pending field detail should only include pending fields");

assert(typeof context.pptxMechanismSlideRows === "function", "Sprint 4 should expose PPTX mechanism rows");
const pptRows = context.pptxMechanismSlideRows();
assert(pptRows.some((row) => row.module === "DuPont三级分解"), "PPTX mechanism rows should include DuPont");
assert(pptRows.some((row) => row.module === "净利润归因瀑布"), "PPTX mechanism rows should include profit attribution");
assert(pptRows.some((row) => row.module === "NIM归因"), "PPTX mechanism rows should include NIM attribution");

console.log("sprint-cross-upgrade-contract-ok");
