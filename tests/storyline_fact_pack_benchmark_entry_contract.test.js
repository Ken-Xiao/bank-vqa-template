const assert = require("assert");
const fs = require("fs");
const path = require("path");

const code = fs.readFileSync(path.join(__dirname, "../js/55-benchmark-page.js"), "utf8");

assert.ok(code.includes("viewMode: \"overview\""), "benchmark should have overview/story view state");
assert.ok(code.includes("renderStorylineCard"), "benchmark should render storyline cards");
assert.ok(code.includes("加入事实包"), "storyline cards should expose add-to-pack action");
assert.ok(code.includes("查看大图"), "storyline cards should expose chart viewer action");
assert.ok(code.includes("读图指南"), "storyline cards should expose reading guide action");
assert.ok(code.includes("buildStorylineFactPack"), "benchmark should build storyline fact pack");
assert.ok(code.includes("saveStorylineFactPack"), "benchmark should save storyline fact pack");
assert.ok(code.includes("renderStorylineFactPackControls"), "benchmark should refresh drawer");
assert.ok(code.includes("openStorylineChartViewer"), "benchmark should open chart viewer");
assert.ok(code.includes("data-storyline-fact-action"), "buttons should use delegated fact action attribute");
assert.ok(code.includes("ensureStorylineFactPackFromBenchmarkStory"), "benchmark should have fact-pack adapter");
assert.ok(
  code.indexOf("var factAction = e.target.closest(\"[data-storyline-fact-action]\")") <
    code.indexOf("var openStory = e.target.closest(\"[data-open-story-detail]\")"),
  "fact action should be handled before story-detail navigation"
);

console.log("storyline benchmark entry contract passed");
