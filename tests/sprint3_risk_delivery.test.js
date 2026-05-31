const fs = require("fs");
const vm = require("vm");

const root = process.cwd();

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

const context = {
  console,
  window: {},
  document: { getElementById: () => null, querySelectorAll: () => [], querySelector: () => null }
};
vm.createContext(context);

[
  "data.js",
  "js/01-state.js",
  "js/02-config.js",
  "js/03-data-format.js",
  "js/05-analysis.js",
  "js/11-fact-pack.js",
  "js/12-ai-narrative.js"
].forEach((file) => {
  vm.runInContext(fs.readFileSync(`${root}/${file}`, "utf8"), context, { filename: file });
});

context.analysisRules = JSON.parse(fs.readFileSync(`${root}/analysis_rules.json`, "utf8"));
context.metricDictionary = Object.fromEntries(
  JSON.parse(fs.readFileSync(`${root}/data_governance/metric_dictionary.json`, "utf8"))
    .map((item) => [item.metric_code, item])
);
context.languageDiscipline = { riskLanguage: {}, narrativeReplacements: {}, uiReplacements: {}, errorReplacements: {} };
context.state.target = "苏州农商行";
context.state.peers = ["常熟农商行", "瑞丰农商行", "上海农商行", "苏州"];
context.state.year = 2025;
context.state.types = ["国有大行", "股份行", "城市商业银行", "农村商业银行"];

assert(typeof context.buildStandardFactRow === "function", "fact pack builder should be defined");
assert(typeof context.narrativeRiskSuffix === "function", "narrative risk suffix should be defined");
assert(typeof context.downgradeNarrativeByRisk === "function", "narrative downgrade should be defined");

const row = context.targetRecord();
const fact = context.buildStandardFactRow("nim", row, context.peerRecords(), context.currentRecords(), context.currentRecords());
assert(fact.口径风险等级 && /^L[1-4]$/.test(fact.口径风险等级), "fact row should expose L1-L4 risk level");
assert(fact.报告使用建议, "fact row should expose report usage decision");
assert(fact.口径脚注, "fact row should expose footnote");

const topicFacts = context.topicFactPackRows("nim");
assert(topicFacts.some((item) => item.口径风险等级), "topic fact pack should carry L1-L4 risk levels");
assert(topicFacts.some((item) => item.报告使用建议), "topic fact pack should carry report usage decisions");

const l4Fact = {
  指标代码: "notARealMetric",
  指标名称: "缺失指标",
  目标值: "暂无"
};
const suffix = context.narrativeRiskSuffix([l4Fact]);
assert(suffix.includes("L4"), "narrative suffix should mention L4 for missing metrics");
assert(suffix.includes("待补"), "narrative suffix should downgrade missing metrics to pending data");

const downgraded = context.downgradeNarrativeByRisk("该指标高于对标均值，形成连续改善证据。", [l4Fact]);
assert(downgraded.includes("暂不形成强对标判断"), "L4 narrative should remove strong peer judgement");
assert(downgraded.includes("先补齐口径"), "L4 narrative should ask for metric validation");

console.log("sprint3-risk-delivery-ok");
