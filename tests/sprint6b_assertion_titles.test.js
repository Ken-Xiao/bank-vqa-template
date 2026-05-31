const fs = require("fs");
const vm = require("vm");

const root = process.cwd();

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

const reportSource = fs.readFileSync(`${root}/js/08-report.js`, "utf8");
const formalSource = fs.readFileSync(`${root}/js/22-formal-report.js`, "utf8");

assert(reportSource.includes("reportTitleSentence"), "deck report should use assertion title helper");
assert(formalSource.includes("formalAssertionTitle"), "formal report should expose assertion title helper");
assert(!/图表说明|指标展示/.test(formalSource), "formal report should not rely on generic method titles");
assert(formalSource.includes("formalAssertionTitle(topicKey, row)"), "formal topic sections should use assertion titles");

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
  "js/20-pro-engine.js",
  "js/21-portal-workflows.js",
  "js/22-formal-report.js"
].forEach((file) => {
  vm.runInContext(fs.readFileSync(`${root}/${file}`, "utf8"), context, { filename: file });
});

context.state.target = "苏州农商行";
context.state.peers = ["常熟农商行", "瑞丰农商行", "上海农商行", "苏州"];
context.state.year = 2025;

const title = context.formalAssertionTitle("profit", context.targetRecord());
assert(/苏州(农商行|农村商业银行)/.test(title), "assertion title should name target bank");
assert(/核心营收|净利润|盈利质量/.test(title), "profit assertion title should state a judgement");
assert(!/专题分析|指标展示|图表说明/.test(title), "assertion title should not be generic");

console.log("sprint6b-assertion-titles-ok");
