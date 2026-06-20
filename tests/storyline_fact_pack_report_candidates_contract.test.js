const fs = require("fs");
const vm = require("vm");
const assert = require("assert/strict");

const src = fs.readFileSync("js/61-report-page-library-model.js", "utf8");

function loadWithFactPack(factPack) {
  const context = {
    window: {},
    localStorage: {
      data: {},
      getItem(key) { return this.data[key] || null; },
      setItem(key, value) { this.data[key] = value; },
      removeItem(key) { delete this.data[key]; }
    },
    console
  };
  context.window = Object.assign(context.window, context, {
    readStorylineFactPack() {
      return factPack;
    }
  });
  vm.createContext(context);
  vm.runInContext(src, context);
  return context;
}

const selectedFactPack = {
  version: "storyline-fact-pack-v1",
  status: "confirmed",
  context: { targetBank: { name: "目标银行" }, year: 2025 },
  selectedStorylineIds: ["nim_pressure"],
  storylines: [{
    storylineId: "nim_pressure",
    selected: true,
    title: "息差防守压力扩大",
    reportCandidates: [{
      pageId: "report_nim_pressure_chain",
      title: "息差压力专题归因页",
      layout: "causal-chain-with-chart",
      sourceFactIds: ["fact_nim_gap"],
      chartIds: ["chart_nim_story"],
      evidenceSentence: "净息差低于对标组且降幅更快。",
      readingGuideId: "chart_nim_story",
      recommendedSlideLayout: "headline-evidence-chart",
      useScenario: "经营管理层专题复盘"
    }]
  }, {
    storylineId: "unselected_story",
    selected: false,
    title: "未选故事线",
    reportCandidates: [{ pageId: "should_not_appear", title: "不应出现" }]
  }]
};

const context = loadWithFactPack(selectedFactPack);
assert.equal(typeof context.window.buildReportPageLibrary, "function");
assert.equal(typeof context.window.buildReportPageLibraryFromStorylineFactPack, "function");

const library = context.window.buildReportPageLibrary();
assert.equal(library.status, "ready");
assert.equal(library.targetBank.name, "目标银行");
assert.equal(library.year, 2025);
assert.equal(library.pages.length, 1);

const page = library.pages[0];
assert.equal(page.pageId, "report_nim_pressure_chain");
assert.equal(page.source, "storylineFactPack");
assert.equal(page.storylineId, "nim_pressure");
assert.deepEqual(page.sourceFactIds, ["fact_nim_gap"]);
assert.deepEqual(page.chartIds, ["chart_nim_story"]);
assert.equal(page.evidenceSentence, "净息差低于对标组且降幅更快。");
assert.equal(page.readingGuideId, "chart_nim_story");
assert.equal(page.recommendedSlideLayout, "headline-evidence-chart");
assert.equal(page.useScenario, "经营管理层专题复盘");
assert.equal(page.reportReadiness, "ready");
assert.equal(page.status, "ready");
assert.equal(page.selected, true);
assert.equal(library.selectedPageIds.includes("report_nim_pressure_chain"), true);
assert.equal(library.pages.some((item) => item.pageId === "should_not_appear"), false);

const explicitPack = {
  version: "legacy-pack",
  status: "confirmed",
  targetBank: { name: "旧证据包目标行" },
  year: 2025,
  storyCards: []
};
const explicitLibrary = context.window.buildReportPageLibrary(explicitPack);
assert.equal(explicitLibrary.sourcePackVersion, "legacy-pack", "explicit pack keeps legacy path");
assert.equal(explicitLibrary.status, "empty", "explicit pack does not auto-source storyline candidates");

const missingEvidencePack = {
  version: "storyline-fact-pack-v1",
  status: "confirmed",
  context: { targetBank: { name: "目标银行" }, year: 2025 },
  selectedStorylineIds: ["nim_pressure"],
  storylines: [{
    storylineId: "nim_pressure",
    selected: true,
    title: "息差防守压力扩大",
    reportCandidates: [{
      pageId: "report_nim_pressure_incomplete",
      title: "息差压力待补证据页"
    }]
  }]
};

const missingContext = loadWithFactPack(missingEvidencePack);
const missingLibrary = missingContext.window.buildReportPageLibrary();
assert.equal(missingLibrary.pages.length, 1);
assert.equal(missingLibrary.status, "待补证据");
assert.equal(missingLibrary.pages[0].reportReadiness, "待补证据");
assert.equal(missingLibrary.pages[0].status, "待补证据");
assert.equal(missingLibrary.pages[0].selected, false);
assert.equal(missingLibrary.selectedPageIds.length, 0);

console.log("storyline-fact-pack-report-candidates-contract-ok");
