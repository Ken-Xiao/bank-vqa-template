const fs = require("fs");
const assert = require("assert/strict");

const html = fs.readFileSync("index.html", "utf8");
const css = fs.readFileSync("styles/app.css", "utf8");
const selection = fs.readFileSync("js/04-ui-selection.js", "utf8");

[
  "quickLaunchPanel",
  "recommendedPeerPreview",
  "advancedSetupToggle",
  "analysisScenarioSelect"
].forEach((needle) => assert(html.includes(needle), `Launch HTML missing ${needle}`));

[
  ".quick-launch-panel",
  ".recommended-peer-preview",
  ".setup-advanced.is-collapsed"
].forEach((needle) => assert(css.includes(needle), `Launch CSS missing ${needle}`));

[
  "function renderRecommendedPeerPreview",
  "function toggleAdvancedSetup",
  "function selectedAnalysisScenario"
].forEach((needle) => assert(selection.includes(needle), `Launch JS missing ${needle}`));

console.log("sprint9a-launch-contract-ok");
