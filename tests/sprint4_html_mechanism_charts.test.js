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
  "js/11-fact-pack.js",
  "js/08-report.js",
  "js/22-formal-report.js"
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

assert(typeof context.formalMechanismChartHtml === "function", "formal report should expose mechanism chart renderer");
assert(typeof context.formalBenchmarkSampleN === "function", "formal report should expose benchmark sample N helper");

const section = context.formalMechanismAttributionSection(context.targetRecord());
assert(section.includes("formal-profit-waterfall"), "formal mechanism section should render profit waterfall");
assert(section.includes("formal-benchmark-line"), "formal mechanism section should render benchmark line chart");
assert(section.includes("formal-nim-bridge"), "formal mechanism section should render NIM bridge");
assert(section.includes("formal-nim-bridge-table"), "NIM bridge should render as a stable data table");
assert(section.includes("NIM息差防守数据表"), "NIM bridge table should expose an accessible table label");
assert(section.includes("样本N"), "formal mechanism section should expose sample N");
assert(section.includes("对标组N"), "formal mechanism section should expose peer sample N");
assert(section.includes("全样本N"), "formal mechanism section should expose all sample N");

const benchmark = context.formalBenchmarkSampleN("nim");
assert(benchmark.peerN === 4, "benchmark sample N should count selected peers");
assert(benchmark.allN > benchmark.peerN, "benchmark sample N should count broader sample");

console.log("sprint4-html-mechanism-charts-ok");
