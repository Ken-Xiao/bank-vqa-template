const fs = require("fs");
const vm = require("vm");
const assert = require("assert/strict");

const modelSrc = fs.readFileSync("js/57-evidence-pack-model.js", "utf8");
const workspace = fs.readFileSync("js/19-product-workspace.js", "utf8");

[
  "evidencePackAnswerModel",
  "evidencePackMapModel",
  "evidencePackTopicModel",
].forEach((needle) => assert(modelSrc.includes(needle), "model missing page model helper: " + needle));

[
  "renderEvidencePackAnswer",
  "renderEvidencePackMap",
  "renderEvidencePackTopics",
  "readEvidencePack",
].forEach((needle) => assert(workspace.includes(needle), "workspace must render from evidence pack: " + needle));

const samplePack = {
  version: "20260619-1430",
  status: "confirmed",
  targetBank: { name: "苏州农商行" },
  year: 2025,
  peerGroup: { label: "全国同类 + 自选", banks: ["常熟农商行"] },
  recommendedIssues: [
    {
      issueId: "a",
      title: "盈利能力承压",
      priority: 1,
      confidence: "高",
      primaryMetric: "ROE",
      conclusion: "ROE 低于同业，主要受 NIM 拖累",
      evidence: [{ evidenceId: "ev_a", metric: "ROE", gap: "-2.2pct", strength: "强", direction: "低于同业", targetValue: "8.2%", peerValue: "10.4%" }],
      causalChain: ["ROE 低于同业", "因为 NIM 低于同业", "因为定期化率偏高"],
      action: "先拆解息差",
    },
    {
      issueId: "b",
      title: "资产质量分化",
      priority: 2,
      confidence: "中",
      primaryMetric: "不良率",
      conclusion: "不良率高于同业",
      evidence: [{ evidenceId: "ev_b", metric: "不良率", gap: "+0.2pct", strength: "中", direction: "高于同业", targetValue: "1.2%", peerValue: "1.0%" }],
      causalChain: ["不良率高于同业", "因为对公风险暴露偏高"],
      action: "复核贷款结构",
    },
  ],
  selectedIssues: ["a"],
  excludedIssues: ["b"],
};

const context = {
  window: {},
  localStorage: {
    getItem(key) { return key === "benchmarkiq.evidencePack" ? JSON.stringify(samplePack) : null; },
    setItem() {},
    removeItem() {},
  },
};
context.window = Object.assign(context.window, context);
vm.createContext(context);
vm.runInContext(modelSrc, context);

const answer = context.window.evidencePackAnswerModel(samplePack);
assert.equal(answer.issues.length, 1, "answer model only uses selectedIssues");
assert.equal(answer.issues[0].issueId, "a", "answer model excludes unselected issue");
assert(answer.summary.includes("ROE"), "answer summary cites selected issue");

const map = context.window.evidencePackMapModel(samplePack);
assert.equal(map.rows.length, 1, "evidence map only uses selected evidence");
assert.equal(map.rows[0].evidenceId, "ev_a", "evidence map carries evidence id");
assert.equal(map.rows[0].strength, "强", "evidence map carries strength");

const topics = context.window.evidencePackTopicModel(samplePack);
assert.equal(topics.topics.length, 1, "topic model only uses selected issue");
assert(topics.topics[0].causalChain.length >= 3, "topic model preserves causal chain");

const genericWords = ["值得关注", "持续跟踪", "结构承压"];
const renderedText = JSON.stringify(answer) + JSON.stringify(map) + JSON.stringify(topics);
genericWords.forEach((word) => {
  assert(!renderedText.includes(word), "evidence pack models should avoid generic phrase: " + word);
});
assert(renderedText.includes("ev_a"), "rendered models must cite evidence id");
assert(renderedText.includes("强"), "rendered models must carry evidence strength");

console.log("evidence-pack-driven-pages-contract-ok");
