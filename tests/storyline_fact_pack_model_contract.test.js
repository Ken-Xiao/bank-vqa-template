const assert = require("assert");
const fs = require("fs");
const path = require("path");
const vm = require("vm");

function makeStorage() {
  const store = {};
  return {
    getItem(key) {
      return Object.prototype.hasOwnProperty.call(store, key) ? store[key] : null;
    },
    setItem(key, value) {
      store[key] = String(value);
    },
    removeItem(key) {
      delete store[key];
    },
    key(index) {
      return Object.keys(store)[index] || null;
    },
    get length() {
      return Object.keys(store).length;
    },
    _store: store
  };
}

function loadModel() {
  const code = fs.readFileSync(path.join(__dirname, "../js/65-storyline-fact-pack-model.js"), "utf8");
  const localStorage = makeStorage();
  const context = {
    window: {},
    console,
    localStorage
  };
  context.window.localStorage = localStorage;
  vm.createContext(context);
  vm.runInContext(code, context);
  return context;
}

const context = loadModel();

assert.strictEqual(typeof context.window.buildStorylineFactPack, "function");
assert.strictEqual(typeof context.window.saveStorylineFactPack, "function");
assert.strictEqual(typeof context.window.readStorylineFactPack, "function");
assert.strictEqual(typeof context.document, "undefined", "contract must not depend on DOM globals");

const sourcePack = {
  status: "confirmed",
  targetBank: { id: "target", name: "目标银行", type: "城商行", region: "浙江" },
  year: 2025,
  peerGroup: { banks: ["对标银行A", "对标银行B", "对标银行C"] },
  recommendedIssues: [
    {
      issueId: "nim_pressure",
      title: "息差防守压力扩大",
      priority: 1,
      primaryMetric: "净息差",
      conclusion: "目标行净息差低于对标组，且降幅更快。",
      category: "anomaly",
      evidenceStrength: "强",
      evidence: [
        {
          evidenceId: "fact_nim_gap",
          metric: "净息差",
          targetValue: "1.45%",
          peerValue: "1.68%",
          gap: "-0.23pct",
          category: "anomaly",
          signalDirection: "support",
          source: "2025 年年报结构化指标库"
        }
      ],
      causalChain: ["ROE 承压", "净息差低于对标组", "负债成本抬升", "复核负债结构"]
    },
    {
      issueId: "cost_pressure",
      title: "成本效率需要复核",
      priority: 2,
      primaryMetric: "成本收入比",
      conclusion: "成本收入比高于对标组。",
      evidence: [
        {
          metric: "成本收入比",
          targetValue: "36.20%",
          peerValue: "31.00%",
          gap: "+5.20pct",
          source: "2025 年年报结构化指标库"
        }
      ],
      causalChain: {
        directCause: "费用刚性高于对标组",
        structureCause: "网点与科技投入效率待复核"
      },
      action: "复核费用投入产出"
    }
  ],
  storylines: [
    {
      storylineId: "nim_pressure",
      title: "重复故事线不应覆盖推荐问题",
      priority: 99,
      conclusion: "这条重复项应被去重。",
      primaryMetric: "重复净息差",
      evidence: [
        {
          factId: "duplicate_fact",
          metric: "重复指标",
          gap: "重复差距",
          source: "重复故事线"
        }
      ]
    },
    {
      storylineId: "existing_story",
      title: "已有故事线可被统一接入",
      priority: 3,
      conclusion: "已有故事线仍应进入统一事实包。",
      primaryMetric: "ROA",
      evidence: [
        {
          factId: "existing_fact",
          metric: "ROA",
          gap: "-0.10pct",
          source: "历史故事线"
        }
      ]
    }
  ]
};

const model = context.window.buildStorylineFactPack(sourcePack, {
  selectedStorylineIds: ["nim_pressure", "existing_story"]
});

assert.strictEqual(model.version, "storyline-fact-pack-v1");
assert.strictEqual(model.status, "confirmed");
assert.deepStrictEqual(JSON.parse(JSON.stringify(model.selectedStorylineIds)), ["nim_pressure", "existing_story"]);
assert.deepStrictEqual(JSON.parse(JSON.stringify(model.context.targetBank)), sourcePack.targetBank);
assert.strictEqual(model.context.year, 2025);
assert.strictEqual(model.context.peerGroup.length, 3);

const selected = model.storylines.filter((storyline) => storyline.selected);
assert.strictEqual(selected.length, 2);
assert.strictEqual(model.storylines.find((storyline) => storyline.storylineId === "cost_pressure").selected, false);
assert.strictEqual(model.storylines.filter((storyline) => storyline.storylineId === "nim_pressure").length, 1);

const nimStory = model.storylines.find((storyline) => storyline.storylineId === "nim_pressure");
assert.strictEqual(nimStory.status, "confirmed");
assert.strictEqual(nimStory.title, "息差防守压力扩大");
assert.strictEqual(nimStory.priority, 1);
assert.strictEqual(nimStory.facts[0].factId, "fact_nim_gap");
assert.strictEqual(nimStory.causalChain.resultMetric, "净息差");
assert.strictEqual(nimStory.causalChain.directCause, "净息差低于对标组");
assert.strictEqual(nimStory.causalChain.structureCause, "负债成本抬升");
assert.strictEqual(nimStory.causalChain.recommendedAction, "复核负债结构");

assert.ok(nimStory.charts.length >= 1);
assert.strictEqual(nimStory.charts[0].sourceFactIds[0], "fact_nim_gap");
assert.ok(nimStory.charts[0].readingGuide.whatToSee.includes("净息差"));
assert.ok(nimStory.charts[0].readingGuide.keyGap.includes("-0.23pct"));
assert.ok(nimStory.charts[0].readingGuide.supports);
assert.ok(nimStory.charts[0].readingGuide.reportUse);
assert.ok(nimStory.charts[0].readingGuide.source);

assert.ok(nimStory.reportCandidates.length >= 1);
assert.ok(nimStory.reportCandidates[0].sourceFactIds.includes("fact_nim_gap"));
assert.ok(nimStory.reportCandidates[0].chartIds.includes(nimStory.charts[0].chartId));
assert.ok(nimStory.reportCandidates[0].evidenceSentence.includes("净息差"));
assert.strictEqual(nimStory.reportCandidates[0].readingGuideId, nimStory.charts[0].chartId);
assert.strictEqual(nimStory.reportCandidates[0].recommendedSlideLayout, "headline-evidence-chart");
assert.strictEqual(nimStory.reportCandidates[0].status, "confirmed");
assert.strictEqual(nimStory.reportCandidates[0].context.year, 2025);

const costStory = model.storylines.find((storyline) => storyline.storylineId === "cost_pressure");
assert.strictEqual(costStory.status, "partial");
assert.strictEqual(costStory.facts[0].factId, "cost_pressure_fact_1");
assert.strictEqual(costStory.causalChain.resultMetric, "成本收入比");
assert.strictEqual(costStory.causalChain.directCause, "费用刚性高于对标组");
assert.strictEqual(costStory.causalChain.structureCause, "网点与科技投入效率待复核");
assert.strictEqual(costStory.causalChain.recommendedAction, "复核费用投入产出");

context.window.saveStorylineFactPack(model);
assert.ok(context.localStorage._store["benchmarkiq.storylineFactPack"]);
const loaded = context.window.readStorylineFactPack();
assert.strictEqual(loaded.version, "storyline-fact-pack-v1");
assert.deepStrictEqual(JSON.parse(JSON.stringify(loaded.selectedStorylineIds)), ["nim_pressure", "existing_story"]);
assert.strictEqual(loaded.storylines[0].storylineId, "nim_pressure");

context.localStorage.setItem("benchmarkiq.storylineFactPack", "{bad json");
const errorPack = context.window.readStorylineFactPack();
assert.strictEqual(errorPack.status, "error");

console.log("storyline fact pack model contract passed");
