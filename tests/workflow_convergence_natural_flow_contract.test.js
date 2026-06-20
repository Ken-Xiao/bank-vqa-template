const assert = require("assert");
const fs = require("fs");
const path = require("path");

const code = fs.readFileSync(path.join(__dirname, "../js/55-benchmark-page.js"), "utf8");
const firstLogicCode = fs.readFileSync(path.join(__dirname, "../js/60-benchmark-first-logic.js"), "utf8");

assert.ok(code.includes("selectBenchmarkTargetBank"), "target bank selection helper should exist");
assert.ok(code.includes("routeBenchmarkTargetToOverview"), "target bank selection route should be exposed for the first screen");
assert.ok(
  code.includes("setBenchmarkView(\"overview\"") || code.includes("setBenchmarkView('overview'"),
  "target selection should route into the storyline overview view"
);
assert.ok(
  firstLogicCode.includes("window.routeBenchmarkTargetToOverview(name"),
  "first-screen bank click should delegate into the unified benchmark overview route"
);
assert.ok(code.includes("renderBenchmarkOverview"), "overview should render recommended storylines");
assert.ok(code.includes("getRecommendedStories"), "recommended storylines should be generated after target selection");
assert.ok(code.includes("refreshStorylineFactPackControls"), "render flow should refresh the fact pack drawer");

console.log("workflow convergence natural flow contract passed");
