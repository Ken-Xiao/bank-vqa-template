const fs = require("fs");
const vm = require("vm");
const assert = require("assert/strict");

const source = fs.readFileSync("js/63-three-page-diagnosis-model.js", "utf8");
const fixture = JSON.parse(fs.readFileSync("tests/fixtures/three_page_evidence_pack_fixture.json", "utf8"));

function makeContext(pack) {
  const context = {
    window: {},
    localStorage: {
      getItem(key) { return key === "benchmarkiq.evidencePack" ? JSON.stringify(pack) : null; },
      setItem() {},
      removeItem() {},
    },
    console,
  };
  context.window = context;
  vm.createContext(context);
  vm.runInContext(source, context);
  return context;
}

const context = makeContext(fixture);
assert.equal(typeof context.buildThreePageDiagnosisModel, "function");
const model = context.buildThreePageDiagnosisModel(fixture);

assert.equal(model.evidenceMap.strength.label || model.evidenceMap.strength, "强", "3 support and 0 counter should be strong");
assert.equal(model.evidenceMap.peerPosition.category, "peerPosition", "peer position must use category label");
assert.equal(model.evidenceMap.anomalies[0].category, "anomaly", "anomaly must use category label");
assert.equal(model.evidenceMap.valuationAnchor.category, "valuationAnchor", "valuation anchor must use category label");
assert.ok(model.conclusion.topIssues.length <= 3, "conclusion cards must be at most 3");
assert.equal(new Set(model.conclusion.topIssues.map((item) => item.evidenceId || item.metric)).size, model.conclusion.topIssues.length, "conclusion cards must be deduplicated");
assert.ok(model.attribution.foldedTopics.length === 0, "3 topics should not be folded");
assert.ok(model.attribution.reportCandidates[0].recommendedAction, "report candidate should carry action path");

const weakPeerPack = JSON.parse(JSON.stringify(fixture));
weakPeerPack.peerGroup.banks = ["对标银行A", "对标银行B"];
const weakModel = makeContext(weakPeerPack).buildThreePageDiagnosisModel(weakPeerPack);
assert.equal(weakModel.evidenceMap.strength.label || weakModel.evidenceMap.strength, "弱", "peer group with only 2 banks should be weak");

const genericPack = JSON.parse(JSON.stringify(fixture));
genericPack.recommendedIssues[0].conclusion = "存在一定压力，需要进一步关注。";
const genericModel = makeContext(genericPack).buildThreePageDiagnosisModel(genericPack);
assert.ok(!genericModel.conclusion.topIssues.some((item) => /存在一定压力|需要进一步关注/.test(item.sentence || item.conclusion || "")), "generic language should be downgraded or hidden");

const fourTopicPack = JSON.parse(JSON.stringify(fixture));
fourTopicPack.recommendedIssues.push(Object.assign({}, fourTopicPack.recommendedIssues[0], { issueId: "capital_pressure", title: "资本约束", priority: 4, primaryMetric: "资本充足率" }));
fourTopicPack.selectedIssues.push("capital_pressure");
const fourTopicModel = makeContext(fourTopicPack).buildThreePageDiagnosisModel(fourTopicPack);
assert.equal(fourTopicModel.attribution.visibleTopics.length, 3, "4 topics should render 3 visible topics");
assert.equal(fourTopicModel.attribution.foldedTopics.length, 1, "4 topics should fold 1 topic");

console.log("three-page-diagnosis-behavior-ok");
