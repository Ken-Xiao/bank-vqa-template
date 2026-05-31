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
  }
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

assert(typeof context.formalMechanismAttributionSection === "function", "formal mechanism section should be defined");
const section = context.formalMechanismAttributionSection(context.targetRecord());
assert(section.includes('id="formal-mechanism-attribution"'), "mechanism section should have stable report id");
assert(section.includes("DuPont三级分解"), "mechanism section should include DuPont module");
assert(section.includes("净利润归因瀑布"), "mechanism section should include profit attribution module");
assert(section.includes("NIM归因"), "mechanism section should include NIM module");
assert(section.includes("多基准线"), "mechanism section should include benchmark module");
assert(section.includes("口径风险"), "mechanism section should expose calibration risk");

const report = context.buildFormalReportHtml({ exportMode: true });
assert(report.includes('id="formal-mechanism-attribution"'), "formal report should include mechanism attribution section");
assert(report.indexOf('id="formal-mechanism-attribution"') < report.indexOf('id="formal-topic-'), "mechanism section should appear before topic deep dives");

console.log("sprint4-formal-mechanism-report-ok");
