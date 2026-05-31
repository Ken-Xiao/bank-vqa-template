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
  "js/04-ui-selection.js",
  "js/05-analysis.js",
  "js/20-pro-engine.js",
  "js/21-portal-workflows.js",
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
context.languageDiscipline = JSON.parse(fs.readFileSync(`${root}/config/language_discipline.json`, "utf8"));
context.state.target = "苏州农商行";
context.state.peers = ["常熟农商行", "瑞丰农商行", "上海农商行", "苏州"];
context.state.year = 2025;
context.state.types = ["农村商业银行", "城市商业银行"];

const topic = context.topicDefinitions().find((item) => item.id === "profit");
const text = context.generateTopicNarrativeDraft(topic, context.topicFactPackRows("profit"), "board");

assert(/苏州(农商行|农村商业银行)/.test(text), "must name target bank");
assert(!/[CEMA]｜/.test(text), "must not expose CEAM labels");
assert(!/(方法论|本专题用于|帮助判断|可用于)/.test(text), "must avoid method-only filler");
assert(/因为|这意味着|管理上|因此/.test(text), "must contain causal and management language");
assert(/对标|核心营收|净利润|手续费|拨备/.test(text), "must bind language to bank-specific evidence");
assert(typeof context.consultingNaturalParagraph === "function", "language engine should expose natural paragraph helper");

console.log("sprint6b-language-guardrail-ok");
