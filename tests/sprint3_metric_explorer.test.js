const fs = require("fs");
const vm = require("vm");

const root = process.cwd();
const html = fs.readFileSync(`${root}/index.html`, "utf8");

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

assert(html.includes('data-data-subtab="explorer"'), "data page should expose Metric Explorer subtab");
assert(html.includes('id="metricExplorerPanel"'), "Metric Explorer panel should exist");
assert(html.includes('id="metricExplorerSelect"'), "Metric Explorer should provide a metric selector");
assert(html.includes('id="fieldCoverageHeatmap"'), "data page should expose field coverage heatmap");

const context = {
  console,
  window: {},
  document: {
    getElementById: () => null,
    querySelector: () => null,
    querySelectorAll: () => []
  }
};
vm.createContext(context);

["data.js", "js/01-state.js", "js/02-config.js", "js/03-data-format.js"].forEach((file) => {
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

assert(typeof context.metricExplorerSnapshot === "function", "metricExplorerSnapshot should be defined");
assert(typeof context.metricCalibrationRisk === "function", "metricCalibrationRisk should be defined");
assert(typeof context.fieldCoverageHeatmapRows === "function", "fieldCoverageHeatmapRows should be defined");
assert(typeof context.fieldCoverageMatrixRows === "function", "fieldCoverageMatrixRows should be defined");

const nim = context.metricExplorerSnapshot("nim");
assert(nim.metricKey === "nim", "snapshot should keep metric key");
assert(nim.label.includes("净息差"), "snapshot should expose metric label");
assert(nim.target.valueText !== "暂无", "snapshot should expose target value");
assert(nim.peer.valueText !== "暂无", "snapshot should expose peer value");
assert(nim.type.valueText !== "暂无", "snapshot should expose type value");
assert(nim.percentileText.includes("分位"), "snapshot should expose percentile text");
assert(nim.trend.length >= 2, "snapshot should expose multi-year trend");
assert(/^L[1-4]$/.test(nim.risk.level), "snapshot should use L1-L4 risk levels");
assert(["主报告", "主报告+脚注", "附录", "待补"].includes(nim.decisionUse), "snapshot should classify report usage");

const missing = context.metricExplorerSnapshot("notARealMetric");
assert(missing.risk.level === "L4", "missing metric should be L4");
assert(missing.decisionUse === "待补", "missing metric should be held from report");

const heatmap = context.fieldCoverageHeatmapRows(["roa", "nim", "npl", "pb"]);
assert(heatmap.length >= 2, "heatmap should group metrics by theme");
assert(heatmap.every((row) => row.theme && row.level && row.rateText), "heatmap rows should expose theme, level and rate text");

const fieldRows = context.fieldCoverageMatrixRows();
assert(fieldRows.length >= 10, "field coverage matrix should group raw source fields");
assert(fieldRows.some((row) => row.theme === "个人贷款分产品(万元/%)"), "field heatmap should include raw source groups");
assert(fieldRows.every((row) => Number.isFinite(row.connected) && Number.isFinite(row.pending)), "field rows should expose connected and pending counts");
assert(fieldRows.some((row) => row.pending > 0 && row.recommendation), "field rows should expose recommendations for unconnected fields");

console.log("sprint3-metric-explorer-ok");
