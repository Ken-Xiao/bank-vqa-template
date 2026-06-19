const fs = require("fs");
const vm = require("vm");
const assert = require("assert/strict");

const src = fs.readFileSync("js/61-report-page-library-model.js", "utf8");

const samplePack = {
  version: "20260619-1600",
  status: "confirmed",
  targetBank: { id: "CN033", name: "苏州农商行" },
  year: 2025,
  peerGroup: { label: "当前数据对标组", banks: ["常熟农商行", "瑞丰农商行"] },
  storyCards: [
    {
      domainKey: "nim",
      storyId: "nim_liability_cost",
      domainLabel: "息差与负债",
      title: "NIM 低于同业，需要回拆到负债成本和定期化率",
      lead: "目标行净息差落后，直接原因是负债成本偏高，结构原因是存款定期化率更高。",
      visualAsset: {
        src: "assets/figures/图3-3_息差缺口与负债成本对照.png",
        label: "息差与负债成本",
        caption: "资产负债传导图：生息资产收益率、负债成本和存款定期化共同解释 NIM。"
      },
      causalNodes: [
        { role: "结果", metric: "净息差", metricKey: "nim.nim", targetValue: "1.55", peerValue: "1.86", gap: "-0.31", pressure: true },
        { role: "原因 1", metric: "计息负债成本率", metricKey: "nim.liability_cost", targetValue: "2.25", peerValue: "1.96", gap: "+0.29", pressure: true },
        { role: "原因 2", metric: "定期存款占比", metricKey: "deposit.time_ratio", targetValue: "68.20", peerValue: "59.10", gap: "+9.10", pressure: true }
      ],
      chartTypes: ["waterfall"],
      metricKeys: ["nim.nim", "nim.liability_cost", "deposit.time_ratio"]
    },
    {
      domainKey: "quality",
      storyId: "npl_buffer",
      domainLabel: "资产质量",
      title: "风险确认压力需要结合拨备缓冲判断",
      lead: "不良和拨备共同决定风险抵补能力。",
      visualAsset: { src: "assets/figures/图4-6_区域风险缓冲热力矩阵.png", label: "风险缓冲" },
      causalNodes: [
        { role: "结果", metric: "不良率", targetValue: "1.21", peerValue: "1.02", gap: "+0.19", pressure: true },
        { role: "原因 1", metric: "拨备覆盖率", targetValue: "182.00", peerValue: "226.00", gap: "-44.00", pressure: true }
      ],
      chartTypes: ["matrix"],
      metricKeys: ["quality.npl", "quality.coverage"]
    }
  ]
};

const context = {
  window: {},
  localStorage: {
    data: { "benchmarkiq.evidencePack": JSON.stringify(samplePack) },
    getItem(key) { return this.data[key] || null; },
    setItem(key, value) { this.data[key] = value; },
    removeItem(key) { delete this.data[key]; }
  },
  console
};
context.window = Object.assign(context.window, context);
vm.createContext(context);
vm.runInContext(src, context);

const library = context.window.buildReportPageLibrary(samplePack);
assert.equal(library.status, "ready", "library is ready from confirmed pack");
assert.equal(library.targetBank.name, "苏州农商行", "library keeps target bank");
assert(library.pages.length >= 4, "storyCards generate multiple candidate pages");
assert(library.pages.some((page) => page.pageType === "executive"), "library has executive page");
assert(library.pages.some((page) => page.pageType === "attribution"), "library has attribution page");
assert(library.pages.some((page) => page.pageType === "visual"), "library has visual evidence page");
assert(library.pages.every((page) => page.pageId && page.chapterKey && page.title && page.quality), "every page has required fields");
assert(library.pages.every((page) => page.quality.hasTitle), "every page has title quality flag");
assert(library.pages.some((page) => page.causalNodes.length >= 3), "causal depth is preserved");
assert(library.pages.some((page) => page.visualAsset && page.visualAsset.src.includes("图3-3")), "visual asset is preserved");
assert(library.selectedPageIds.length >= 2, "ready pages are selected by default");

const saved = context.window.saveReportPageLibrary(library);
assert.equal(saved.version, library.version, "save returns saved library");
assert(context.localStorage.data["benchmarkiq.reportPageLibrary"], "library is persisted");

const reloaded = context.window.readReportPageLibrary();
assert.equal(reloaded.pages.length, library.pages.length, "read returns persisted library");

const toggled = context.window.toggleReportPageSelection(library.pages[0].pageId, false);
assert(!toggled.selectedPageIds.includes(library.pages[0].pageId), "selection can remove a page");

const empty = context.window.buildReportPageLibrary(null);
assert.equal(empty.status, "empty", "missing pack returns empty state");
assert.equal(empty.pages.length, 0, "empty state has no pages");

const diagnosisPack = {
  version: "diag-20260619",
  context: {
    targetBank: { id: "CN033", name: "苏州农商行" },
    peerBanks: ["常熟农商行", "瑞丰农商行"],
    year: 2025,
    role: "管理层诊断"
  },
  judgments: [
    {
      id: "roe_nim_chain",
      title: "盈利能力承压",
      conclusion: "ROE 低于对标组，主要受净息差偏低拖累。",
      primaryMetric: "ROE",
      metricGap: "-2.2pct",
      causeChain: ["ROE 低于对标组", "因为净息差低于对标组", "因为定期存款占比高于对标组"],
      evidenceRefs: ["ev_roe_gap", "ev_nim_gap"],
      recommendedAction: "优先调整负债结构。",
      reportReadiness: "ready",
      visualAsset: { src: "assets/figures/图3-3_息差缺口与负债成本对照.png", label: "息差传导图" }
    }
  ],
  evidenceMap: [
    { judgmentId: "roe_nim_chain", evidenceId: "ev_roe_gap", metricKey: "ROE", gap: "-2.2pct", dataQuality: "强", reportReadiness: "ready" }
  ],
  topicChains: [
    {
      id: "topic_roe_nim_chain",
      sourceJudgmentId: "roe_nim_chain",
      title: "盈利能力承压",
      nodes: ["ROE 低于对标组", "因为净息差低于对标组", "因为定期存款占比高于对标组"],
      action: "优先调整负债结构。",
      evidenceRefs: ["ev_roe_gap", "ev_nim_gap"],
      reportReadiness: "ready"
    }
  ],
  candidatePages: [
    { id: "candidate_roe_nim_chain_judgment", sourceType: "judgment", sourceId: "roe_nim_chain", title: "盈利能力承压", pageRole: "executive-judgment", status: "ready", selected: true },
    { id: "candidate_roe_nim_chain_action", sourceType: "topic-chain", sourceId: "topic_roe_nim_chain", title: "盈利能力承压：原因链与管理动作", pageRole: "management-action", status: "ready", selected: true }
  ]
};

assert.equal(typeof context.window.buildReportPageLibraryFromDiagnosisPack, "function", "diagnosis library builder is exported");
const diagnosisLibrary = context.window.buildReportPageLibraryFromDiagnosisPack(diagnosisPack);
assert.equal(diagnosisLibrary.status, "ready", "diagnosis pack creates ready library");
assert.equal(diagnosisLibrary.pages.length, 2, "candidate pages become report pages");
assert(diagnosisLibrary.pages.every((page) => page.sourceDiagnosisId), "pages keep diagnosis source id");
assert(diagnosisLibrary.pages.some((page) => page.pageType === "executive-judgment"), "judgment page is created");
assert(diagnosisLibrary.pages.some((page) => page.pageType === "management-action"), "action page is created");
assert(diagnosisLibrary.selectedPageIds.length === 2, "ready selected candidate pages are selected");

console.log("report-page-library-model-contract-ok");
