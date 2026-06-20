const fs = require("fs");
const vm = require("vm");
const assert = require("assert/strict");

const renderer = fs.readFileSync("js/64-three-page-diagnosis-renderer.js", "utf8");
const router = fs.readFileSync("js/42-portal-router.js", "utf8");
const report = fs.readFileSync("js/08-report.js", "utf8");
const html = fs.readFileSync("index.html", "utf8");

assert(router.includes("renderThreePageDiagnosis"), "router must refresh three-page diagnosis on portal changes");
assert(report.includes("renderThreePageDiagnosis"), "renderAll flow must refresh three-page diagnosis after report rendering");
assert(html.includes("topicsAdvancedGroup") || html.includes("three-page-advanced"), "advanced topic content must remain grouped or folded");

function makeElement(tag) {
  return {
    tagName: tag.toUpperCase(),
    className: "",
    textContent: "",
    dataset: {},
    attributes: {},
    children: [],
    firstChild: null,
    type: "",
    setAttribute(name, value) { this.attributes[name] = String(value); },
    appendChild(child) { this.children.push(child); this.firstChild = this.children[0] || null; return child; },
    removeChild(child) { this.children = this.children.filter((item) => item !== child); this.firstChild = this.children[0] || null; return child; },
    replaceChildren(...nodes) { this.children = nodes; this.firstChild = this.children[0] || null; },
    closest() { return null; },
  };
}

let currentPage = "answer";
const host = makeElement("div");
const context = {
  window: {},
  document: {
    addEventListener() {},
    createElement: makeElement,
    getElementById(id) { return id === "threePageDiagnosisMount" ? host : null; },
    body: { getAttribute() { return currentPage; } },
  },
  setTimeout(fn) { fn(); },
  getPortalPage() { return currentPage; },
  setPortalPage(page) { currentPage = page; },
  console,
};
context.window = Object.assign(context, context.window);
context.window.buildThreePageDiagnosisModel = function () {
  return {
    status: "confirmed",
    context: { targetBank: { name: "甲银行" }, peerGroup: { banks: ["乙银行", "丙银行", "丁银行"] }, year: 2025, status: "confirmed" },
    conclusion: { headline: "甲银行主判断", topIssues: [], kpis: [] },
    evidenceMap: {
      headline: "证据地图",
      strength: { label: "强" },
      chainSummary: "ROE → NIM",
      peerPosition: { metric: "ROE", targetValue: "7.2%", peerValue: "8.4%", gap: "-1.2pct", trace: [] },
      anomalies: [{ metric: "NIM", targetValue: "1.45%", peerValue: "1.68%", gap: "-0.23pct", trace: [] }],
      valuationAnchor: { metric: "不良率", targetValue: "1.65%", peerValue: "1.20%", gap: "+0.45pct", trace: [] },
      counterEvidence: [],
    },
    attribution: {
      headline: "专题归因",
      chain: { result: "ROE", directCause: "NIM", structureCause: "定期化", action: "负债复盘" },
      evidence: [],
      reportCandidates: [],
    },
  };
};

vm.createContext(context);
vm.runInContext(renderer, context);

function textOf(node) {
  return [node.textContent || ""].concat((node.children || []).map(textOf)).join(" ");
}

context.window.renderThreePageDiagnosis();
assert(textOf(host).includes("甲银行主判断"), "answer page must render conclusion");

currentPage = "evidence";
context.window.renderThreePageDiagnosis();
assert(textOf(host).includes("证据地图"), "evidence page must render evidence map");

currentPage = "topics";
context.window.renderThreePageDiagnosis();
assert(textOf(host).includes("专题归因"), "topics page must render attribution");

console.log("three-page-diagnosis-flow-runtime-ok");
