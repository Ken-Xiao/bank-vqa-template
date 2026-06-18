const fs = require("fs");
const vm = require("vm");
const assert = require("assert/strict");

const bridge = fs.readFileSync("js/56-benchmark-state-bridge.js", "utf8");

let storedPack = null;
let portalCall = null;
let workspaceTab = null;

const button = {
  disabled: false,
  textContent: "生成报告证据包",
  attrs: {},
  setAttribute(name, value) { this.attrs[name] = value; },
  removeAttribute(name) { delete this.attrs[name]; },
};

const summary = { innerHTML: "" };

const context = {
  window: { addEventListener() {} },
  state: { appMode: "setup", confirmed: false, target: "苏州农商行", year: 2025 },
  localStorage: {
    setItem(key, value) {
      if (key === "benchmarkiq.evidencePack") storedPack = JSON.parse(value);
    },
    getItem(key) {
      if (key === "benchmarkiq.evidencePack" && storedPack) return JSON.stringify(storedPack);
      if (key === "benchmarkiq.audience") return "board";
      return null;
    },
  },
  document: {
    body: { getAttribute() { return "benchmark"; } },
    addEventListener() {},
    getElementById(id) {
      if (id === "benchmarkEvidencePackSummary") return summary;
      return null;
    },
    querySelectorAll(selector) {
      if (selector === "[data-report-metric]:checked") {
        return [
          { getAttribute() { return "ROE"; } },
          { getAttribute() { return "NIM"; } },
        ];
      }
      if (selector === "[data-report-chain]:checked") {
        return [{ getAttribute() { return "profitability-liability"; } }];
      }
      return [];
    },
  },
  setPortalPage(page, options) { portalCall = { page, options }; },
  setWorkspaceTab(tab) { workspaceTab = tab; },
  fetch() {
    return Promise.resolve({ ok: true, json: () => Promise.resolve({}) });
  },
  requestAnimationFrame(fn) { fn(); },
  setTimeout(fn) { fn(); },
  setInterval() { return 1; },
  clearInterval() {},
  MutationObserver: function MutationObserver() {
    this.observe = function observe() {};
  },
};

context.window = Object.assign(context, context.window);
vm.createContext(context);
vm.runInContext(bridge, context);

const pack = context.window.saveBenchmarkEvidencePack(context.window.buildBenchmarkEvidencePack());
context.window.goToReportWithEvidencePack(button);

assert.equal(pack.audience, "board", "pack should keep selected audience");
assert.equal(JSON.stringify(pack.reportAngles), JSON.stringify(["盈利能力分析", "关键问题追溯"]), "pack should map metrics and chain to report angles");
assert.equal(portalCall.page, "report", "evidence flow should navigate to report");
assert.equal(portalCall.options.force, true, "evidence flow should force report navigation before confirmed state");
assert.equal(workspaceTab, "report", "evidence flow should activate report workspace");
assert.equal(button.disabled, false, "button should recover after navigation");
assert.equal(button.textContent, "生成报告证据包", "button label should recover after navigation");
assert(summary.innerHTML.includes("报告证据包"), "report summary should render after navigation");

console.log("report-evidence-navigation-runtime-ok");
