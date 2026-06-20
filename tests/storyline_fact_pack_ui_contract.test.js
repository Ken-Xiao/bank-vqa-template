const assert = require("assert");
const fs = require("fs");
const path = require("path");

const root = path.join(__dirname, "..");
const ui = fs.readFileSync(path.join(root, "js/66-storyline-fact-pack-ui.js"), "utf8");
const index = fs.readFileSync(path.join(root, "index.html"), "utf8");
const css = fs.readFileSync(path.join(root, "styles/app.css"), "utf8");

assert.ok(ui.includes("renderStorylineFactPackControls"), "UI should expose renderStorylineFactPackControls");
assert.ok(ui.includes("openStorylineChartViewer"), "UI should expose openStorylineChartViewer");
assert.ok(ui.includes("readingGuide"), "UI should render chart readingGuide content");
assert.ok(ui.includes("textContent"), "UI should use textContent for user-visible copy");

[".innerHTML", "insertAdjacentHTML", "outerHTML"].forEach((token) => {
  assert.ok(!ui.includes(token), `UI should not use ${token}`);
});

assert.ok(index.includes("storylineFactPackDrawer"), "index should include the fact pack drawer mount");
assert.ok(index.includes("storylineChartViewer"), "index should include the chart viewer mount");
assert.ok(index.includes('script src="js/65-storyline-fact-pack-model.js"'), "index should load the fact pack model");
assert.ok(index.includes('script src="js/66-storyline-fact-pack-ui.js"'), "index should load the fact pack UI");
assert.ok(
  index.indexOf('script src="js/65-storyline-fact-pack-model.js"') <
    index.indexOf('script src="js/66-storyline-fact-pack-ui.js"'),
  "model script should load before UI script"
);

assert.ok(css.includes(".storyline-fact-pack-drawer"), "CSS should include drawer styles");
assert.ok(css.includes(".storyline-chart-viewer-shell"), "CSS should include chart viewer shell styles");

console.log("storyline fact pack UI contract passed");
