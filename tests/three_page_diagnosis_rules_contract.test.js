const fs = require("fs");
const assert = require("assert/strict");

const model = fs.readFileSync("js/63-three-page-diagnosis-model.js", "utf8");

[
  "GENERIC_LANGUAGE_PATTERNS",
  "需要综合分析",
  "整体表现较好",
  "存在一定压力",
  "function buildConclusionCards",
  "function scoreEvidenceStrength",
  "function rankAttributionTopics",
  "function buildReportCandidates",
  "function normalizePackStatus",
  "function hasTrace",
  "partial-pack",
  "error-pack",
  "supportCount >= 2 && counterCount === 0",
  "foldedTopics",
  "allTopics",
  "recommendedSlideLayout",
  "evidenceSentence",
  "trace",
].forEach((needle) => {
  assert(model.includes(needle), `rule contract missing ${needle}`);
});

console.log("three-page-diagnosis-rules-contract-ok");
