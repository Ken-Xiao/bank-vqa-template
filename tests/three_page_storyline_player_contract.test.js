const assert = require("assert");
const fs = require("fs");
const path = require("path");

const renderer = fs.readFileSync(path.join(__dirname, "../js/64-three-page-diagnosis-renderer.js"), "utf8");

[
  "buildConclusionPlayerPages",
  "buildEvidencePlayerPages",
  "buildAttributionPlayerPages",
  "renderStorylinePlayerSection",
  "window.renderStorylinePagePlayer",
  "model.source === \"storylineFactPack\"",
  "three-page-storyline-player-mount",
  "is-storyline-player",
].forEach((needle) => assert.ok(renderer.includes(needle), `renderer should include ${needle}`));

function functionBody(name) {
  const start = renderer.indexOf(`function ${name}`);
  assert.ok(start >= 0, `${name} should exist`);
  const next = renderer.indexOf("\n  function ", start + 1);
  return renderer.slice(start, next > start ? next : renderer.length);
}

assert.ok(functionBody("renderConclusionSummaryPage").includes("buildConclusionPlayerPages(model)"), "conclusion page should route storyline fact packs into the player");
assert.ok(functionBody("renderEvidenceMapPage").includes("buildEvidencePlayerPages(model)"), "evidence page should route storyline fact packs into the player");
assert.ok(functionBody("renderAttributionPage").includes("buildAttributionPlayerPages(model)"), "attribution page should route storyline fact packs into the player");

console.log("three page storyline player contract passed");
