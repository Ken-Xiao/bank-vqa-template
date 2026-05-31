const fs = require("fs");
const vm = require("vm");

const root = process.cwd();
const source = fs.readFileSync(`${root}/js/13-pptx-export.js`, "utf8");

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
  "js/22-formal-report.js",
  "js/13-pptx-export.js"
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

assert(typeof context.addMechanismAttributionSlide === "function", "PPTX should define a mechanism attribution slide layout");
assert(typeof context.pptxMechanismModuleGroups === "function", "PPTX should group mechanism rows by module");
assert(typeof context.pptxProfitWaterfallRows === "function", "PPTX should expose profit waterfall chart data");
assert(typeof context.pptxBenchmarkLineRows === "function", "PPTX should expose benchmark line chart data");
assert(typeof context.pptxNimBridgeRows === "function", "PPTX should expose NIM bridge chart data");

const groups = context.pptxMechanismModuleGroups();
assert(groups.length >= 4, "mechanism PPTX groups should cover four modules");
assert(groups.some((group) => group.module === "DuPont三级分解"), "mechanism PPTX groups should include DuPont");
assert(groups.some((group) => group.module === "净利润归因瀑布"), "mechanism PPTX groups should include profit attribution");
assert(groups.some((group) => group.module === "NIM归因"), "mechanism PPTX groups should include NIM attribution");
assert(groups.every((group) => group.rows.length > 0), "each mechanism PPTX group should carry rows");

const waterfall = context.pptxProfitWaterfallRows();
assert(waterfall.length >= 4, "profit waterfall should contain multiple drivers");
assert(waterfall.every((row) => Number.isFinite(row.value)), "profit waterfall values should be numeric");
assert(waterfall.some((row) => ["positive", "negative"].includes(row.tone)), "profit waterfall should identify positive or negative drivers");

const benchmark = context.pptxBenchmarkLineRows("nim");
assert(benchmark.target.label.includes("净息差"), "benchmark line should keep metric label");
assert(Number.isFinite(benchmark.target.value), "benchmark line should expose numeric target value");
assert(benchmark.lines.length >= 3, "benchmark line should expose peer/type/sample benchmarks");

const nimBridge = context.pptxNimBridgeRows();
assert(nimBridge.length >= 3, "NIM bridge should include NIM drivers");
assert(nimBridge.some((row) => row.key === "earningAssetYield"), "NIM bridge should include asset yield");
assert(nimBridge.some((row) => row.key === "interestLiabilityCost"), "NIM bridge should include liability cost");

const fakeSection = {
  id: "formal-mechanism-attribution",
  className: "formal-section formal-mechanism-attribution",
  matches: () => false
};
assert(context.formalReportPageRole(fakeSection) === "mechanism", "formal report should classify mechanism section");
assert(context.formalReportDeckType(fakeSection) === "mechanism", "formal report should route mechanism section to dedicated PPTX deck type");
assert(source.includes('deckType === "mechanism"'), "PPTX export loop should route mechanism deck type");
assert(source.includes("addPptxProfitWaterfall"), "mechanism slide should draw profit waterfall");
assert(source.includes("addPptxBenchmarkLineChart"), "mechanism slide should draw benchmark lines");
assert(source.includes("addPptxNimBridge"), "mechanism slide should draw NIM bridge");

console.log("sprint1-pptx-mechanism-layout-ok");
