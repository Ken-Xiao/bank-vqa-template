const fs = require("fs");
const vm = require("vm");
const assert = require("assert/strict");

const modelSrc = fs.readFileSync("js/57-evidence-pack-model.js", "utf8");
const workspace = fs.readFileSync("js/19-product-workspace.js", "utf8");
const css = fs.readFileSync("styles/app.css", "utf8");

[
  "evidencePackAnswerModel",
  "evidencePackMapModel",
  "evidencePackTopicModel",
].forEach((needle) => assert(modelSrc.includes(needle), "model missing page model helper: " + needle));

[
  "renderEvidencePackAnswer",
  "renderEvidencePackMap",
  "renderEvidencePackTopics",
  "evidencePackVisualHtml",
  "evidencePackChainHtml",
  "evidencePackCanvasPageHtml",
  "evidencePackPageVisualHtml",
  "evidencePackEvidenceRowsHtml",
  "readEvidencePack",
].forEach((needle) => assert(workspace.includes(needle), "workspace must render from evidence pack: " + needle));

[
  "issue.visualAsset",
  "row.visualAsset",
  "topic.visualAsset",
  "step2-pack-map-list",
  "step2-pack-chain",
  "report-page-canvas step2-pack-page",
  'pageType: "summary"',
  'pageType: "evidence-map"',
  'pageType: "topic-attribution"',
].forEach((needle) => assert(workspace.includes(needle), "workspace must render story pack field: " + needle));

[
  ".step2-pack-visual",
  ".step2-pack-chain",
  ".step2-pack-map-list",
  ".step2-pack-map-row",
  ".step2-pack-page-stack",
  ".step2-pack-page",
  ".step2-pack-page-visual",
  ".step2-pack-page-proof",
].forEach((needle) => assert(css.includes(needle), "CSS must support story evidence layout: " + needle));

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

const storyPack = {
  version: "20260619-1530",
  status: "confirmed",
  targetBank: { name: "苏州农商行" },
  year: 2025,
  selectedIssues: [],
  recommendedIssues: [],
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
      chartTypes: ["waterfall", "nim", "liability_cost"],
      metricKeys: ["nim.nim", "nim.liability_cost", "deposit.time_ratio"]
    }
  ]
};

const storyAnswer = context.window.evidencePackAnswerModel(storyPack);
assert.equal(storyAnswer.issues.length, 1, "storyCards are converted into answer issues");
assert(storyAnswer.summary.includes("净息差"), "story answer summary cites story metric");
assert(storyAnswer.issues[0].visualAsset.src.includes("图3-3_息差缺口与负债成本对照"), "story answer keeps visual asset");
assert(storyAnswer.issues[0].causalChain.length >= 3, "story answer keeps multi-layer causal chain");

const storyMap = context.window.evidencePackMapModel(storyPack);
assert(storyMap.rows.length >= 3, "story evidence map expands causal nodes into rows");
assert(storyMap.rows.some((row) => row.metric === "定期存款占比" && row.gap === "+9.10"), "story evidence map carries node metric gaps");

const storyTopics = context.window.evidencePackTopicModel(storyPack);
assert.equal(storyTopics.topics.length, 1, "storyCards are converted into topic cards");
assert(storyTopics.topics[0].visualAsset.src.includes("图3-3_息差缺口与负债成本对照"), "topic card keeps visual asset");
assert(storyTopics.topics[0].causalChain.join(" → ").includes("因为计息负债成本率"), "topic chain is phrased as causal tracing");

const genericWords = ["值得关注", "持续跟踪", "结构承压"];
const renderedText = JSON.stringify(answer) + JSON.stringify(map) + JSON.stringify(topics);
genericWords.forEach((word) => {
  assert(!renderedText.includes(word), "evidence pack models should avoid generic phrase: " + word);
});
assert(renderedText.includes("ev_a"), "rendered models must cite evidence id");
assert(renderedText.includes("强"), "rendered models must carry evidence strength");

const diagnosisPack = context.window.buildManagementDiagnosisPack(samplePack);
assert.equal(diagnosisPack.judgments.length, 1, "diagnosis pack respects selectedIssues");

assert.equal(typeof context.window.managementDiagnosisAnswerModel, "function", "answer model helper is exported");
assert.equal(typeof context.window.managementDiagnosisEvidenceMapModel, "function", "evidence map model helper is exported");
assert.equal(typeof context.window.managementDiagnosisTopicModel, "function", "topic model helper is exported");

const managementAnswer = context.window.managementDiagnosisAnswerModel(samplePack);
assert.equal(managementAnswer.judgments.length, 1, "management answer shows selected judgment only");
assert(managementAnswer.totalVerdict.includes("盈利能力承压"), "management answer keeps issue title");
assert(managementAnswer.judgments[0].evidenceRefs.includes("ev_a"), "management answer keeps evidence reference");

const managementMap = context.window.managementDiagnosisEvidenceMapModel(samplePack);
assert.equal(managementMap.judgments.length, 1, "evidence map keeps judgment list");
assert.equal(managementMap.rows.length, 1, "evidence map keeps selected evidence rows");
assert.equal(managementMap.rows[0].reportReadiness, "ready", "single selected issue with strong evidence becomes ready state");

const managementTopics = context.window.managementDiagnosisTopicModel(storyPack);
assert.equal(managementTopics.topicChains.length, 1, "topic model uses top story chain");
assert(managementTopics.topicChains[0].nodes.join(" → ").includes("定期存款占比"), "topic model preserves strongest chain");
assert(managementTopics.topicChains.length <= 3, "topic model is capped at three chains");

const emptyDiagnosisShape = { judgments: [], evidenceMap: [], topicChains: [] };
assert.doesNotThrow(() => context.window.managementDiagnosisAnswerModel(emptyDiagnosisShape), "answer model handles empty diagnosis shape");
assert.doesNotThrow(() => context.window.managementDiagnosisEvidenceMapModel(emptyDiagnosisShape), "evidence map model handles empty diagnosis shape");
assert.doesNotThrow(() => context.window.managementDiagnosisTopicModel(emptyDiagnosisShape), "topic model handles empty diagnosis shape");

const emptyManagementAnswer = context.window.managementDiagnosisAnswerModel(emptyDiagnosisShape);
assert.equal(emptyManagementAnswer.empty, true, "empty diagnosis answer returns empty true");

const emptyManagementMap = context.window.managementDiagnosisEvidenceMapModel(emptyDiagnosisShape);
assert.equal(emptyManagementMap.empty, true, "empty diagnosis evidence map returns empty true");
assert.deepEqual(emptyManagementMap.rows, [], "empty diagnosis evidence map rows default to empty array");

const emptyManagementTopics = context.window.managementDiagnosisTopicModel(emptyDiagnosisShape);
assert.equal(emptyManagementTopics.empty, true, "empty diagnosis topic model returns empty true");
assert.deepEqual(emptyManagementTopics.topicChains, [], "empty diagnosis topic chains default to empty array");

assert.doesNotThrow(() => context.window.managementDiagnosisAnswerModel(null), "answer model handles null input");
assert.doesNotThrow(() => context.window.managementDiagnosisEvidenceMapModel(null), "evidence map model handles null input");
assert.doesNotThrow(() => context.window.managementDiagnosisTopicModel(null), "topic model handles null input");

console.log("evidence-pack-driven-pages-contract-ok");
