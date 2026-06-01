const fs = require("fs");
const assert = require("assert/strict");

const html = fs.readFileSync("index.html", "utf8");
const css = fs.readFileSync("styles/app.css", "utf8");
const workspace = fs.readFileSync("js/19-product-workspace.js", "utf8");

[
  'id="step2BridgeEvidence"',
  'id="step2BridgeTopics"',
  'id="step2BridgeActions"',
  'id="step2PeerTitle"',
  'id="step2ChangesTitle"',
  'id="step2PbTitle"',
  'id="step2TopicsTitle"',
  'id="step2ActionsTitle"'
].forEach((needle) => assert(html.includes(needle), `Step 2 storyline host missing: ${needle}`));

[
  "function step2LanguageIntensity",
  "function step2StorylinePack",
  "L3",
  "L2",
  "L1",
  "强判断",
  "审慎判断",
  "观察判断",
  "ceamNarrativeBlock",
  "languageLevel",
  "mechanismText",
  "step2BridgeEvidence",
  "step2TopicsTitle"
].forEach((needle) => assert(workspace.includes(needle), `Sprint 7C language/storyline marker missing: ${needle}`));

[
  "Evidence",
  "Attribution",
  "Meaning"
].forEach((needle) => assert(workspace.includes(needle), `Topic cards must consume CEAM block field: ${needle}`));

[
  ".step2-topic-card > em",
  ".step2-scr-list"
].forEach((needle) => assert(css.includes(needle), `Sprint 7C topic card style missing: ${needle}`));

console.log("sprint7c-language-storyline-contract-ok");
