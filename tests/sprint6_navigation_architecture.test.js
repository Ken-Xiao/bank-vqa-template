const fs = require("fs");
const vm = require("vm");

const root = process.cwd();

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

const indexHtml = fs.readFileSync(`${root}/index.html`, "utf8");
assert(indexHtml.includes('id="analysisRoadmap"'), "page should include a global analysis roadmap");
assert(indexHtml.includes('id="analysisRoadmapSteps"'), "roadmap should expose workflow steps");
assert(indexHtml.includes('id="analysisMapLinks"'), "roadmap should expose analysis map links");
assert(indexHtml.includes('id="analysisNextAction"'), "roadmap should expose next action");

const context = {
  console,
  window: {},
  document: {
    body: { dataset: {}, classList: { toggle: () => {}, contains: () => false } },
    getElementById: () => null,
    querySelector: () => null,
    querySelectorAll: () => []
  },
  state: {
    target: "苏州农商行",
    peers: ["常熟农商行", "瑞丰农商行", "上海农商行", "苏州"],
    year: 2025,
    confirmed: true
  },
  displayBankName: (name) => name,
  criticalMetricCompleteness: () => 0.86,
  computeVqaDiagnosis: () => ({ score: 72, signal: "结构性修复" }),
  targetRecord: () => ({ bank: "苏州农商行" }),
  peerRecords: () => [{ bank: "常熟农商行" }]
};
vm.createContext(context);
vm.runInContext(fs.readFileSync(`${root}/js/19-product-workspace.js`, "utf8"), context, { filename: "js/19-product-workspace.js" });

assert(typeof context.analysisNavigationItems === "function", "navigation item builder should be defined");
assert(typeof context.analysisStageItems === "function", "workflow stage builder should be defined");
assert(typeof context.analysisNextAction === "function", "next action helper should be defined");

const navItems = context.analysisNavigationItems();
assert(navItems.length >= 6, "navigation should cover the main work areas");
assert(navItems.some((item) => item.tab === "topics" && item.href === "#topicWorkbenchSection"), "navigation should link to topic workbench");
assert(navItems.some((item) => item.tab === "report" && item.href === "#formalReportShell"), "navigation should link to formal report");
assert(navItems.every((item) => item.status), "navigation items should expose status labels");

const stages = context.analysisStageItems();
assert(stages.length === 5, "workflow should expose five clear stages");
assert(stages[0].state === "done", "confirmed sample should mark first stage done");
assert(stages.some((item) => item.tab === "report"), "workflow should include report review stage");

const next = context.analysisNextAction("overview");
assert(next.href === "#topicWorkbenchSection", "overview next action should guide users to topic workbench");
assert(next.tab === "topics", "overview next action should switch to topic tab");

console.log("sprint6-navigation-architecture-ok");
