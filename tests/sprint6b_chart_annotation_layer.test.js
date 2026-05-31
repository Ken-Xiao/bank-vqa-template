const fs = require("fs");
const vm = require("vm");

const root = process.cwd();

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

const analysisSource = fs.readFileSync(`${root}/js/05-analysis.js`, "utf8");
const chartsSource = fs.readFileSync(`${root}/js/06-charts.js`, "utf8");
const css = fs.readFileSync(`${root}/styles/app.css`, "utf8");

assert(analysisSource.includes("chartAnnotationBlock"), "topic pages should expose chart annotation block");
assert(chartsSource.includes("chartAnnotationText"), "chart module should expose annotation text helper");
assert(/\.chart-annotation\s*\{[^}]*display:\s*grid/s.test(css), "chart annotation should have a stable grid layout");
assert(/\.chart-annotation\s+b\s*\{[^}]*font-size:\s*1[3-5]px/s.test(css), "chart annotation should use compact report text");

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
  "js/06-charts.js",
  "js/04-ui-selection.js",
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
context.state.types = ["农村商业银行", "城市商业银行"];

const text = context.chartAnnotationText("净利润归因瀑布", context.targetRecord());
assert(/苏州(农商行|农村商业银行)/.test(text), "annotation should bind to target bank");
assert(/利润|核心营收|拨备|费用/.test(text), "profit annotation should explain how to read the chart");

const html = context.chartAnnotationBlock("净利润归因瀑布");
assert(html.includes("chart-annotation"), "annotation block should render stable class");
assert(html.includes("读图结论"), "annotation block should label reading conclusion");

console.log("sprint6b-chart-annotation-layer-ok");
