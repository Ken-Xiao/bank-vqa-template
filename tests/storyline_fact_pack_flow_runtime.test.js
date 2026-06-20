const fs = require("fs");
const vm = require("vm");
const assert = require("assert/strict");

const factPackSource = fs.readFileSync("js/65-storyline-fact-pack-model.js", "utf8");
const diagnosisSource = fs.readFileSync("js/63-three-page-diagnosis-model.js", "utf8");

function makeContext() {
  const store = {};
  const context = {
    window: {},
    localStorage: {
      getItem(key) { return store[key] || null; },
      setItem(key, value) { store[key] = String(value); },
      removeItem(key) { delete store[key]; },
    },
    console,
  };
  context.window = context;
  vm.createContext(context);
  vm.runInContext(factPackSource, context);
  vm.runInContext(diagnosisSource, context);
  return context;
}

const context = makeContext();

const sourcePack = {
  status: "confirmed",
  targetBank: { id: "target_001", name: "样本银行" },
  peerGroup: { banks: [{ name: "对标A" }, { name: "对标B" }, { name: "对标C" }] },
  year: "2025",
  selectedStorylineIds: ["nim_pressure"],
  recommendedIssues: [
    {
      issueId: "nim_pressure",
      title: "息差防守压力扩大",
      conclusion: "息差防守压力扩大，资产收益修复不足以覆盖负债成本刚性。",
      priority: 1,
      primaryMetric: "净息差",
      evidenceStrength: "强",
      evidence: [
        {
          factId: "nim_gap_2025",
          category: "anomaly",
          metric: "净息差",
          targetValue: "1.42%",
          peerValue: "1.71%",
          gap: "-29bp",
          signalDirection: "support",
          strength: "强",
          source: "2025对标数据",
          trace: [{ field: "benchmark.nim_gap", source: "fixture", value: "-29bp" }],
        },
        {
          factId: "loan_yield_gap_2025",
          category: "peerPosition",
          metric: "贷款收益率",
          targetValue: "4.12%",
          peerValue: "4.38%",
          gap: "-26bp",
          signalDirection: "support",
          strength: "中",
          source: "2025对标数据",
        },
      ],
      causalChain: {
        resultMetric: "净息差承压",
        directCause: "资产端收益率修复偏慢",
        structureCause: "存款成本刚性与重定价滞后",
        recommendedAction: "压降高成本负债并重估贷款定价策略",
      },
      charts: [{
        chartId: "nim_pressure_chart",
        title: "净息差压力对标",
        sourceFactIds: ["nim_gap_2025"],
        readingGuide: {
          whatToSee: "看目标行净息差与对标组差距是否扩大。",
          keyGap: "净息差低于对标组29bp。",
          supports: "支撑息差防守压力扩大。",
          reportUse: "适合作为专题归因页主图。",
          source: "2025对标数据",
        },
      }],
      reportCandidates: [{
        pageId: "report_nim_pressure",
        title: "息差防守压力专题页",
        evidenceSentence: "净息差较对标组低29bp，说明息差防守压力扩大。",
        sourceFactIds: ["nim_gap_2025"],
      }],
    },
    {
      issueId: "capital_buffer",
      title: "资本缓冲相对稳定",
      conclusion: "资本缓冲相对稳定。",
      priority: 2,
      primaryMetric: "资本充足率",
      evidence: [{
        factId: "capital_gap_2025",
        category: "valuationAnchor",
        metric: "资本充足率",
        targetValue: "13.2%",
        peerValue: "12.8%",
        gap: "+0.4pct",
      }],
    },
  ],
};

const storylineFactPack = context.buildStorylineFactPack(sourcePack);
context.saveStorylineFactPack(storylineFactPack);
const model = context.buildThreePageDiagnosisModel();
const serialized = JSON.stringify(model);

assert.equal(model.source, "storylineFactPack", "model should prefer selected storyline fact pack when called without explicit pack");
assert.deepEqual(model.context.targetBank, storylineFactPack.context.targetBank, "context target bank should come from fact pack");
assert.equal(model.context.year, storylineFactPack.context.year, "context year should come from fact pack");
assert.ok(serialized.includes("息差防守压力扩大"), "model JSON should include selected storyline title/conclusion");
assert.equal(model.conclusion.cards.length, 1, "conclusion cards should only come from selected storylines");
assert.equal(model.conclusion.cards[0].storylineId, "nim_pressure", "selected card should be nim_pressure");
assert.ok(model.conclusion.cards[0].sourceFactIds.includes("nim_gap_2025"), "conclusion card should carry sourceFactIds");
assert.ok(model.conclusion.cards[0].trace.length > 0, "conclusion card should carry trace");
assert.ok(!serialized.includes("资本缓冲相对稳定"), "unselected storylines should not enter the model");
assert.ok(model.evidenceMap.groups.some((group) => group.category === "anomaly"), "evidence groups should include fact category anomaly");
assert.equal(model.attribution.topics[0].storylineId, "nim_pressure", "attribution topic should keep storylineId");

const explicitEvidencePack = {
  status: "confirmed",
  targetBank: { name: "显式证据包银行" },
  peerGroup: { banks: ["A", "B", "C"] },
  year: "2025",
  selectedIssues: ["explicit_issue"],
  recommendedIssues: [{
    issueId: "explicit_issue",
    title: "显式证据包问题",
    priority: 1,
    primaryMetric: "不良率",
    conclusion: "显式传入 pack 时继续使用旧证据包行为。",
    evidence: [{
      evidenceId: "explicit_ev",
      category: "anomaly",
      metric: "不良率",
      targetValue: "1.2%",
      peerValue: "1.0%",
      gap: "+20bp",
      signalDirection: "support",
      strength: "强",
    }],
  }],
};
const explicitModel = context.buildThreePageDiagnosisModel(explicitEvidencePack);
assert.notEqual(explicitModel.source, "storylineFactPack", "explicit pack should preserve existing evidence pack behavior");
assert.equal(explicitModel.selectedIssues[0].issueId, "explicit_issue", "explicit evidence pack should drive selected issues");

console.log("storyline-fact-pack-flow-runtime-ok");
