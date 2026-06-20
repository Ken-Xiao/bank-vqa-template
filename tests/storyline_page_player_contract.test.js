const assert = require("assert");
const fs = require("fs");
const path = require("path");

const root = path.join(__dirname, "..");
const player = fs.readFileSync(path.join(root, "js/68-storyline-page-player.js"), "utf8");
const index = fs.readFileSync(path.join(root, "index.html"), "utf8");
const css = fs.readFileSync(path.join(root, "styles/app.css"), "utf8");

assert.ok(player.includes("renderStorylinePagePlayer"), "player should expose renderStorylinePagePlayer");
assert.ok(player.includes("storyline-page-player-frame"), "player should render a fixed frame");
assert.ok(player.includes("上一页"), "player should include previous page control");
assert.ok(player.includes("下一页"), "player should include next page control");
assert.ok(player.includes("textContent"), "player should use textContent for copy");
[".innerHTML", "insertAdjacentHTML", "outerHTML"].forEach((token) => {
  assert.ok(!player.includes(token), `player should not use ${token}`);
});

assert.ok(index.includes('script src="js/68-storyline-page-player.js?v=20260620-workflow-convergence"'), "index should load the player script");
assert.ok(
  index.indexOf('script src="js/66-storyline-fact-pack-ui.js"') <
    index.indexOf('script src="js/68-storyline-page-player.js?v=20260620-workflow-convergence"'),
  "player should load after fact pack UI"
);
assert.ok(
  index.indexOf('script src="js/68-storyline-page-player.js?v=20260620-workflow-convergence"') <
    index.indexOf('script src="js/64-three-page-diagnosis-renderer.js'),
  "player should load before diagnosis renderer"
);

assert.ok(css.includes(".storyline-page-player"), "CSS should include player shell styles");
assert.ok(css.includes("aspect-ratio: 16 / 9"), "player frame should keep 16:9 aspect ratio");
assert.ok(css.includes(".storyline-page-slide"), "CSS should include slide styles");

console.log("storyline page player contract passed");
