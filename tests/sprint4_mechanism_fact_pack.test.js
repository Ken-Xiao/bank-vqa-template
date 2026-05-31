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

assert(typeof context.buildMechanismFactPackObject === "function", "mechanism fact pack builder should be defined");
assert(typeof context.exportMechanismFactPackRows === "function", "mechanism fact pack export should be defined");

const pack = context.buildMechanismFactPackObject();
assert(pack.target === "苏州农商行", "pack should keep target bank");
assert(pack.year === 2025, "pack should keep selected year");
assert(pack.modules.dupont.rows.length >= 4, "pack should include DuPont rows");
assert(pack.modules.profit.rows.length >= 4, "pack should include profit attribution rows");
assert(pack.modules.nim.rows.length >= 3, "pack should include NIM attribution rows");
assert(pack.modules.benchmark.rows.length >= 10, "pack should include multi-benchmark rows");
assert(pack.modules.dupont.headline.includes("ROE") || pack.modules.dupont.headline.includes("回报"), "DuPont module should have a board headline");
assert(pack.modules.profit.headline.includes("净利润"), "profit module should have a board headline");
assert(pack.modules.nim.headline.includes("息差") || pack.modules.nim.headline.includes("NIM"), "NIM module should have a board headline");

const rows = context.exportMechanismFactPackRows();
const modules = new Set(rows.map((row) => row.分析模块));
assert(modules.has("DuPont三级分解"), "export should include DuPont module");
assert(modules.has("净利润归因瀑布"), "export should include profit waterfall module");
assert(modules.has("NIM归因"), "export should include NIM module");
assert(modules.has("多基准线"), "export should include benchmark line module");
assert(rows.every((row) => row.目标银行 === "苏州农商行"), "export rows should keep target bank");
assert(rows.some((row) => /^L[1-4]$/.test(row.口径风险等级)), "export rows should carry calibration risk when metric is known");

console.log("sprint4-mechanism-fact-pack-ok");
