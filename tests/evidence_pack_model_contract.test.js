const fs = require("fs");
const vm = require("vm");
const assert = require("assert/strict");

const src = fs.readFileSync("js/57-evidence-pack-model.js", "utf8");

const context = {
  window: {},
  localStorage: {
    data: {},
    setItem(key, value) { this.data[key] = value; },
    getItem(key) { return this.data[key] || null; },
    removeItem(key) { delete this.data[key]; },
  },
  state: {
    target: "苏州农商行",
    peers: ["常熟农商行", "瑞丰农商行", "上海农商行"],
    year: 2025,
  },
  targetRecord() {
    return { bank: "苏州农商行", year: 2025, roe: 8.2, nim: 1.55, costIncome: 35.1, npl: 1.21, pb: 0.62 };
  },
  peerRecords() {
    return [
      { bank: "常熟农商行", year: 2025, roe: 10.4, nim: 1.86, costIncome: 31.2, npl: 0.95, pb: 0.74 },
      { bank: "瑞丰农商行", year: 2025, roe: 9.8, nim: 1.76, costIncome: 32.8, npl: 1.02, pb: 0.70 },
      { bank: "上海农商行", year: 2025, roe: 9.5, nim: 1.72, costIncome: 33.0, npl: 1.04, pb: 0.69 },
    ];
  },
  avg(rows, key) {
    const vals = rows.map((r) => r[key]).filter((v) => typeof v === "number");
    return vals.reduce((a, b) => a + b, 0) / vals.length;
  },
  metricDisplayValue(key, value) {
    if (value == null || Number.isNaN(value)) return "—";
    if (key === "pb") return value.toFixed(2) + "x";
    return value.toFixed(2) + "%";
  },
  displayBankName(name) { return name; },
};

context.window = Object.assign(context.window, context);
vm.createContext(context);
vm.runInContext(src, context);

const pack = context.window.buildRecommendedEvidencePack();
assert.equal(pack.status, "draft", "recommended pack starts as draft");
assert.equal(pack.targetBank.name, "苏州农商行", "pack keeps target bank");
assert.equal(pack.year, 2025, "pack keeps year");
assert(pack.recommendedIssues.length >= 3, "pack recommends at least three issues");
assert(pack.recommendedIssues.every((issue) => issue.evidence.length > 0), "every issue has evidence");
assert(pack.recommendedIssues.every((issue) => issue.causalChain.length >= 2), "every issue has causal chain");
assert(pack.recommendedIssues.every((issue) => issue.evidence.every((ev) => ev.evidenceId && ev.metric && ev.gap && ev.strength)), "evidence fields are complete");

const selected = context.window.confirmEvidencePack(pack, [pack.recommendedIssues[0].issueId, pack.recommendedIssues[1].issueId]);
assert.equal(selected.status, "confirmed", "confirmed pack has confirmed status");
assert.equal(selected.selectedIssues.length, 2, "confirmed pack stores selected issues");
assert(context.localStorage.data["benchmarkiq.evidencePack"], "confirmed pack is persisted");

const stale = context.window.markEvidencePackStale("target-change");
assert.equal(stale.status, "stale", "stale helper marks current pack stale");
assert.equal(stale.staleReason, "target-change", "stale helper records reason");

const html = fs.readFileSync("index.html", "utf8");
assert(html.includes('src="js/57-evidence-pack-model.js'), "evidence pack model is loaded by the page");
assert(html.includes('id="bmRestartAnalysis"'), "benchmark page exposes restart entry");
assert(html.includes('id="bmRestartDrawer"'), "benchmark page exposes restart drawer");
assert(html.includes('id="bmEvidencePackTray"'), "benchmark page exposes evidence pack tray");
assert(html.includes('id="bmConfirmEvidencePack"'), "benchmark page exposes evidence pack confirmation");

const benchmark = fs.readFileSync("js/55-benchmark-page.js", "utf8");
assert(benchmark.includes("renderEvidencePackTray"), "benchmark page renders evidence pack tray");
assert(benchmark.includes("buildRecommendedEvidencePack"), "benchmark page can build recommended evidence pack");
assert(benchmark.includes("confirmEvidencePack"), "benchmark page can confirm evidence pack");
assert(benchmark.includes("markEvidencePackStale"), "benchmark page marks pack stale after data changes");

const css = fs.readFileSync("styles/benchmark.css", "utf8");
assert(css.includes(".bm-restart-bar"), "restart bar styles exist");
assert(css.includes(".bm-restart-drawer"), "restart drawer styles exist");
assert(css.includes(".bm-evidence-pack-tray"), "evidence pack tray styles exist");
assert(css.includes(".bm-issue-card"), "issue card styles exist");

console.log("evidence-pack-model-contract-ok");
