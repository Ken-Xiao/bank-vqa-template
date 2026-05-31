const fs = require("fs");
const vm = require("vm");

const root = process.cwd();

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

const context = {
  console,
  window: {},
  document: { getElementById: () => null, querySelector: () => null, querySelectorAll: () => [] }
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
  "js/11-fact-pack.js"
].forEach((file) => {
  vm.runInContext(fs.readFileSync(`${root}/${file}`, "utf8"), context, { filename: file });
});

context.analysisRules = JSON.parse(fs.readFileSync(`${root}/analysis_rules.json`, "utf8"));
context.metricDictionary = Object.fromEntries(
  JSON.parse(fs.readFileSync(`${root}/data_governance/metric_dictionary.json`, "utf8"))
    .map((item) => [item.metric_code, item])
);
context.state.target = "苏州农商行";
context.state.peers = ["常熟农商行", "瑞丰农商行", "上海农商行", "苏州"];
context.state.year = 2025;
context.state.types = ["国有大行", "股份行", "城市商业银行", "农村商业银行"];
context.isTopicIncluded = () => true;

assert(typeof context.topicMechanismPanelHtml === "function", "topic mechanism panel should be defined");
assert(typeof context.topicMechanismRows === "function", "topic mechanism rows should be defined");

const nimRows = context.topicMechanismRows("nim");
assert(nimRows.length >= 3, "NIM topic should expose mechanism rows");
assert(nimRows.some((row) => row.分析模块 === "NIM归因"), "NIM topic should use NIM attribution module");
assert(nimRows.some((row) => row.指标代码 === "nim" || row.指标名称.includes("净息差")), "NIM topic should keep NIM metric");

const profitRows = context.topicMechanismRows("profit");
assert(profitRows.some((row) => ["DuPont三级分解", "净利润归因瀑布"].includes(row.分析模块)), "profit topic should map to DuPont or profit attribution");

const capitalRows = context.topicMechanismRows("capital");
assert(capitalRows.some((row) => row.分析模块 === "多基准线"), "capital topic should include benchmark lines");

const html = context.topicMechanismPanelHtml("nim");
assert(html.includes("机制归因"), "panel should label mechanism attribution");
assert(html.includes("NIM归因"), "panel should render module name");
assert(html.includes("口径风险"), "panel should render calibration risk");

const exportRows = context.topicWorkbenchExportRows().filter((row) => row.专题 && row.类型 === "机制归因");
assert(exportRows.length >= 4, "topic export should include mechanism attribution rows");
assert(exportRows.some((row) => row.分析模块 === "NIM归因"), "topic export should include NIM attribution rows");

console.log("sprint4-topic-mechanism-panel-ok");
