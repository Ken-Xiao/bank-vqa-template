const fs = require("fs");
const vm = require("vm");

const root = process.cwd();

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

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
  "js/07-export.js"
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
context.state.reportVersion = "董事会完整汇报版";
context.state.peerTemplate = "auto-region";
context.includedChartCount = () => 12;

assert(typeof context.exportMetadataRows === "function", "exportMetadataRows should be defined");
assert(typeof context.calibrationRiskExportRows === "function", "calibrationRiskExportRows should be defined");
assert(typeof context.fieldCoverageMatrixExportRows === "function", "fieldCoverageMatrixExportRows should be defined");

const meta = context.exportMetadataRows("selected")[0];
assert(meta.目标银行 === "苏州农商行", "metadata should keep target bank");
assert(meta.导出范围 === "选定银行与对标银行", "metadata should expose export scope");
assert(meta.L2口径风险指标数 >= 0, "metadata should count L2 risks");
assert(meta.L3口径风险指标数 >= 0, "metadata should count L3 risks");
assert(meta.L4口径风险指标数 >= 0, "metadata should count L4 risks");
assert(meta.字段矩阵总字段数 === 257, "metadata should expose raw field matrix total");
assert(meta.字段矩阵待接入字段数 > 0, "metadata should count pending fields");
assert(meta.需优先补齐字段数 > 0, "metadata should count priority pending fields");

const selectedRows = context.selectedBankRecords();
const riskRows = context.calibrationRiskExportRows(selectedRows);
assert(riskRows.length >= 10, "risk metadata should cover metric universe");
assert(riskRows.every((row) => /^L[1-4]$/.test(row.口径风险等级)), "risk rows should expose L1-L4 level");
assert(riskRows.some((row) => row.报告使用建议 === "主报告+脚注"), "risk rows should flag footnote metrics");
assert(riskRows.some((row) => row.口径脚注), "risk rows should expose footnotes");

const fieldRows = context.fieldCoverageMatrixExportRows();
assert(fieldRows.length === 257, "field matrix export should preserve every raw field");
assert(fieldRows.some((row) => row.字段组 === "个人贷款分产品(万元/%)"), "field matrix should include retail loan product fields");
assert(fieldRows.some((row) => row.接入状态 === "pending"), "field matrix should expose pending fields");
assert(fieldRows.some((row) => row.补数优先级 === "medium"), "field matrix should expose priority rows");

console.log("sprint3-export-metadata-ok");
