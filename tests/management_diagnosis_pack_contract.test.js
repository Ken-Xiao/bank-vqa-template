const fs = require("fs");
const vm = require("vm");
const assert = require("assert/strict");

const src = fs.readFileSync("js/57-evidence-pack-model.js", "utf8");

const samplePack = {
  version: "20260619-2200",
  status: "confirmed",
  targetBank: { id: "CN033", name: "苏州农商行" },
  year: 2025,
  peerGroup: { label: "当前对标组", banks: ["常熟农商行", "瑞丰农商行"] },
  recommendedIssues: [
    {
      issueId: "roe_nim_chain",
      title: "盈利能力承压",
      priority: 1,
      confidence: "高",
      primaryMetric: "ROE",
      conclusion: "ROE 低于对标组，主要受净息差偏低拖累。",
      evidence: [
        { evidenceId: "ev_roe_gap", metric: "ROE", gap: "-2.2pct", strength: "强", direction: "低于同业", targetValue: "8.2%", peerValue: "10.4%" },
        { evidenceId: "ev_nim_gap", metric: "净息差", gap: "-0.31pct", strength: "强", direction: "低于同业", targetValue: "1.55%", peerValue: "1.86%" },
        { evidenceId: "ev_deposit_time", metric: "定期存款占比", gap: "+9.1pct", strength: "中", direction: "高于同业", targetValue: "68.2%", peerValue: "59.1%" }
      ],
      causalChain: ["ROE 低于对标组", "因为净息差低于对标组", "因为定期存款占比高于对标组"],
      action: "优先调整负债结构和高成本存款占比。",
      domainKey: "nim",
      visualAsset: { src: "assets/figures/图3-3_息差缺口与负债成本对照.png", label: "息差传导图" }
    },
    {
      issueId: "asset_quality_buffer",
      title: "资产质量缓冲偏弱",
      priority: 2,
      confidence: "中",
      primaryMetric: "不良率",
      conclusion: "不良率高于对标组，需要结合拨备覆盖率判断风险缓冲。",
      evidence: [
        { evidenceId: "ev_npl_gap", metric: "不良率", gap: "+0.19pct", strength: "中", direction: "高于同业", targetValue: "1.21%", peerValue: "1.02%" },
        { evidenceId: "ev_coverage_gap", metric: "拨备覆盖率", gap: "-44.0pct", strength: "中", direction: "低于同业", targetValue: "182.0%", peerValue: "226.0%" }
      ],
      causalChain: ["不良率高于对标组", "因为对公风险暴露偏高", "拨备覆盖率低于对标组削弱缓冲"],
      action: "复核对公贷款结构和风险迁徙。",
      domainKey: "quality"
    },
    {
      issueId: "capital_efficiency",
      title: "资本效率待提升",
      priority: 3,
      confidence: "低",
      primaryMetric: "资本充足率",
      conclusion: "资本缓冲尚可，但资本回报效率偏低。",
      evidence: [
        { evidenceId: "ev_capital_gap", metric: "核心一级资本充足率", gap: "+0.8pct", strength: "弱", direction: "高于同业", targetValue: "12.1%", peerValue: "11.3%" }
      ],
      causalChain: ["资本缓冲高于对标组", "但 ROE 回报偏低"],
      action: "结合盈利修复评估资本使用效率。",
      domainKey: "capital"
    },
    {
      issueId: "liquidity_signal",
      title: "流动性信号作为附录",
      priority: 4,
      confidence: "低",
      primaryMetric: "流动性覆盖率",
      conclusion: "流动性覆盖率数据可作为附录观察。",
      evidence: [
        { evidenceId: "ev_lcr", metric: "流动性覆盖率", gap: "+5.0pct", strength: "弱", direction: "高于同业", targetValue: "135.0%", peerValue: "130.0%" }
      ],
      causalChain: ["流动性覆盖率高于对标组"],
      action: "暂不进入核心管理层判断。",
      domainKey: "liquidity"
    }
  ],
  selectedIssues: ["roe_nim_chain", "asset_quality_buffer", "capital_efficiency", "liquidity_signal"]
};

const context = {
  window: {},
  localStorage: {
    getItem() { return null; },
    setItem() {},
    removeItem() {}
  }
};
context.window = Object.assign(context.window, context);
vm.createContext(context);
vm.runInContext(src, context);

assert.equal(typeof context.window.buildManagementDiagnosisPack, "function", "buildManagementDiagnosisPack is exported");

const diagnosis = context.window.buildManagementDiagnosisPack(samplePack);

assert.equal(diagnosis.context.targetBank.name, "苏州农商行", "keeps target bank");
assert.equal(diagnosis.context.year, 2025, "keeps year");
assert.equal(diagnosis.judgments.length, 3, "keeps only top 3 management judgments");
assert(diagnosis.executiveAnswer.headline.includes("苏州农商行"), "headline names target bank");
assert(diagnosis.executiveAnswer.priorityJudgments.length === 3, "executive answer has 3 priorities");

const first = diagnosis.judgments[0];
assert.equal(first.id, "roe_nim_chain", "first judgment follows highest priority issue");
assert.equal(first.primaryMetric, "ROE", "first judgment carries primary metric");
assert(first.metricGap.includes("-2.2pct"), "first judgment carries metric gap");
assert(first.causeChain.length >= 3, "first judgment has multi-layer chain");
assert(first.evidenceRefs.includes("ev_roe_gap"), "first judgment references evidence id");
assert.equal(first.reportReadiness, "ready", "strong evidence with causal depth is ready");

assert(diagnosis.evidenceMap.every((row) => row.judgmentId), "evidence rows link to judgments");
assert(diagnosis.evidenceMap.some((row) => row.metricKey === "ROE" && row.dataQuality === "强"), "evidence map preserves strength");

assert(diagnosis.topicChains.length <= 3, "topic chains are capped at 3");
assert(diagnosis.topicChains[0].nodes.join(" -> ").includes("定期存款占比"), "topic chain preserves deep reason");

assert(diagnosis.candidatePages.length <= 12, "candidate pages are capped at 12");
assert(diagnosis.candidatePages.some((page) => page.sourceType === "judgment" && page.pageRole === "executive-judgment"), "candidate pages include judgment page");
assert(diagnosis.candidatePages.some((page) => page.sourceType === "topic-chain" && page.pageRole === "management-action"), "candidate pages include management action page");

const storyOnlyPack = {
  version: "20260619-2300",
  status: "confirmed",
  targetBank: { id: "CN033", name: "苏州农商行" },
  year: 2025,
  selectedIssues: [],
  recommendedIssues: [],
  storyCards: [
    {
      domainKey: "nim",
      storyId: "nim_liability_cost",
      domainLabel: "息差与负债",
      title: "净息差落后需要回拆负债成本",
      lead: "目标行净息差低于对标组，直接原因是负债成本偏高，深层原因是存款定期化率更高。",
      causalNodes: [
        { role: "结果", metric: "净息差", targetValue: "1.55%", peerValue: "1.86%", gap: "-0.31pct", pressure: true },
        { role: "直接原因", metric: "计息负债成本率", targetValue: "2.25%", peerValue: "1.96%", gap: "+0.29pct", pressure: true },
        { role: "深层原因", metric: "定期存款占比", targetValue: "68.2%", peerValue: "59.1%", gap: "+9.1pct", pressure: true }
      ],
      visualAsset: { src: "assets/figures/图3-3_息差缺口与负债成本对照.png", label: "息差传导图" }
    }
  ]
};
const storyDiagnosis = context.window.buildManagementDiagnosisPack(storyOnlyPack);
assert.equal(storyDiagnosis.judgments.length, 1, "storyCards-only pack creates one judgment");
assert(storyDiagnosis.judgments[0].causeChain.join(" -> ").includes("定期存款占比"), "storyCards judgment preserves deep metric");

const singleStrongPack = {
  version: "20260619-2310",
  status: "confirmed",
  targetBank: { id: "CN033", name: "苏州农商行" },
  year: 2025,
  peerGroup: { label: "当前对标组", banks: ["常熟农商行"] },
  recommendedIssues: [
    {
      issueId: "single_strong_deep_chain",
      title: "息差修复优先",
      priority: 1,
      confidence: "高",
      primaryMetric: "NIM",
      conclusion: "NIM 低于对标组，需要沿负债成本继续拆解。",
      evidence: [
        { evidenceId: "ev_single_nim", metric: "NIM", gap: "-0.31pct", strength: "强", direction: "低于同业", targetValue: "1.55%", peerValue: "1.86%" }
      ],
      causalChain: ["NIM 低于对标组", "因为负债成本高于对标组", "因为定期存款占比高于对标组"],
      action: "优先压降高成本定期存款占比。",
      domainKey: "nim"
    }
  ],
  selectedIssues: ["single_strong_deep_chain"]
};
const singleStrongDiagnosis = context.window.buildManagementDiagnosisPack(singleStrongPack);
assert.equal(singleStrongDiagnosis.judgments[0].reportReadiness, "ready", "single strong evidence with causal depth is ready");
assert(singleStrongDiagnosis.candidatePages.some((page) => page.sourceId === "single_strong_deep_chain" && page.selected), "ready candidate page is selected by default");

const emptyDiagnosis = context.window.buildManagementDiagnosisPack(null);
assert.equal(emptyDiagnosis.judgments.length, 0, "empty pack returns empty judgments");
const draftDiagnosis = context.window.buildManagementDiagnosisPack(Object.assign({}, samplePack, { status: "draft" }));
assert.equal(draftDiagnosis.judgments.length, 0, "draft pack returns empty judgments");

const serialized = JSON.stringify(diagnosis);
["值得关注", "持续跟踪", "结构承压"].forEach((word) => {
  assert(!serialized.includes(word), "diagnosis pack avoids generic phrase: " + word);
});

console.log("management-diagnosis-pack-contract-ok");
