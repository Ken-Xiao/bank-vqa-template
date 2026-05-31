const fs = require("fs");
const vm = require("vm");

const root = process.cwd();
const indexHtml = fs.readFileSync(`${root}/index.html`, "utf8");

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
  "js/06-charts.js",
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

assert(typeof context.benchmarkLineChart === "function", "core chart layer should expose benchmarkLineChart");
const benchmarkSvg = context.chartForTitle("多基准线｜净息差样本坐标");
assert(benchmarkSvg.includes("benchmark-line-chart"), "chartForTitle should route benchmark line titles to benchmark chart");
assert(benchmarkSvg.includes("样本N"), "benchmark chart should expose sample N");
assert(benchmarkSvg.includes("对标组N"), "benchmark chart should expose peer sample N");
assert(benchmarkSvg.includes("目标银行"), "benchmark chart should label target bank");
assert(indexHtml.includes('data-chart="benchmarkLine"'), "product page should expose benchmark line as a normal core chart");

assert(typeof context.topicMechanismChartPanelHtml === "function", "topic workbench should expose mechanism chart panel");
const profitPanel = context.topicMechanismChartPanelHtml("profit");
assert(profitPanel.includes("topic-profit-waterfall"), "profit topic should render a profit waterfall chart panel");
assert(profitPanel.includes("净利润归因瀑布"), "profit topic chart panel should name the waterfall");
assert(profitPanel.includes("经营含义"), "profit topic chart panel should provide consulting implication");

const nimPanel = context.topicMechanismChartPanelHtml("nim");
assert(nimPanel.includes("topic-benchmark-line"), "NIM topic should render a benchmark line chart panel");
assert(nimPanel.includes("样本N"), "NIM benchmark panel should expose sample N");

console.log("sprint4-core-topic-charts-ok");
