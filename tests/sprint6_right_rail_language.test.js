const fs = require("fs");
const vm = require("vm");

const root = process.cwd();

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

const css = fs.readFileSync(`${root}/styles/app.css`, "utf8");
assert(/\.analysis-roadmap\s*\{[^}]*float:\s*right/s.test(css), "analysis roadmap should live as a right-side rail in document flow");
assert(/\.analysis-roadmap\s*\{[^}]*width:\s*2\d{2}px/s.test(css), "analysis roadmap right rail should have a compact fixed width");
assert(!/\.analysis-roadmap\s*\{[^}]*position:\s*fixed/s.test(css), "analysis roadmap should not float over the page as a fixed overlay");
assert(/\.analysis-roadmap-steps\s*\{[^}]*grid-template-columns:\s*1fr/s.test(css), "analysis roadmap steps should stack vertically");
assert(/\.analysis-map-links\s*\{[^}]*grid-template-columns:\s*1fr/s.test(css), "analysis map links should stack vertically");

const context = {
  console,
  window: {},
  document: { getElementById: () => null, querySelector: () => null, querySelectorAll: () => [] },
  fetch: async () => ({ ok: false, json: async () => ({}) })
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
context.state.types = ["国有大行", "股份行", "城市商业银行", "农村商业银行"];

const topic = context.topicDefinitions().find((item) => item.id === "profit");
const facts = context.topicFactPackRows("profit");
const draft = context.generateTopicNarrativeDraft(topic, facts, "board");

assert(/苏州(农商行|农村商业银行)/.test(draft), "narrative should name the selected target bank");
assert(!/[CEA M]｜/.test(draft), "narrative should not expose mechanical CEAM labels");
assert(!draft.includes("证据包括："), "narrative should avoid stiff evidence-list phrasing");
assert(/这意味着|管理上|因此/.test(draft), "narrative should include a natural consulting implication");
assert(draft.length > 120, "narrative should remain substantive after natural-language rewrite");

console.log("sprint6-right-rail-language-ok");
