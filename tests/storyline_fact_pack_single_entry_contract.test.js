const assert = require("assert");
const fs = require("fs");
const path = require("path");

const root = path.join(__dirname, "..");
const index = fs.readFileSync(path.join(root, "index.html"), "utf8");
const ui = fs.readFileSync(path.join(root, "js/66-storyline-fact-pack-ui.js"), "utf8");
const css = fs.readFileSync(path.join(root, "styles/app.css"), "utf8");

assert.ok(index.includes("legacy-fact-pack"), "old fact pack bar should be visually marked as legacy");
assert.ok(index.includes('data-legacy-fact-pack="debug-export"'), "old fact pack bar should be scoped to debug export");
assert.ok(index.includes("旧版事实清单导出"), "old fact pack copy should no longer present itself as the main report handoff");

assert.ok(ui.includes("removeStorylineFromFactPack"), "storyline fact pack should support removing selected storylines");
assert.ok(ui.includes("storyline-fact-pack-remove"), "drawer should render a remove button for each selected storyline");
assert.ok(ui.includes("生成报告页候选"), "drawer should expose report page candidate generation");
assert.ok(ui.includes("ensureReportPageLibrary"), "report candidate action should build the report page library");
assert.ok(ui.includes("#page/report"), "report candidate action should route to the report workspace");
assert.ok(!ui.includes(".innerHTML"), "storyline fact pack UI should avoid innerHTML");

assert.ok(css.includes(".legacy-fact-pack"), "CSS should include legacy fact pack styling");
assert.ok(css.includes(".storyline-fact-pack-remove"), "CSS should include remove button styling");
assert.ok(css.includes(".storyline-fact-pack-secondary"), "CSS should include secondary report action styling");

console.log("storyline fact pack single entry contract passed");
