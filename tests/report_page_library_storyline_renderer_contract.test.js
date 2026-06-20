const assert = require("assert");
const fs = require("fs");
const path = require("path");

const root = path.join(__dirname, "..");
const model = fs.readFileSync(path.join(root, "js/61-report-page-library-model.js"), "utf8");
const renderer = fs.readFileSync(path.join(root, "js/62-report-page-library-renderer.js"), "utf8");
const css = fs.readFileSync(path.join(root, "styles/app.css"), "utf8");

[
  "sourceFactIds",
  "readingGuideId",
  "evidenceSentence",
  "recommendedSlideLayout",
  "useScenario",
  "待补证据",
].forEach((needle) => assert.ok(model.includes(needle), `model should carry ${needle}`));

[
  "storylineEvidenceMetaHtml",
  "chartGuideButtonHtml",
  "data-open-report-chart-guide",
  "openStorylineChartViewer",
  "sourceFactIds",
  "readingGuideId",
  "evidenceSentence",
  "待补证据",
].forEach((needle) => assert.ok(renderer.includes(needle), `renderer should include ${needle}`));

[
  ".report-page-storyline-meta",
  ".report-page-chart-guide",
].forEach((needle) => assert.ok(css.includes(needle), `css should include ${needle}`));

console.log("report page library storyline renderer contract passed");
