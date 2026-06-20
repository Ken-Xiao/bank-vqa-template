const fs = require("fs");
const assert = require("assert/strict");

const model = fs.readFileSync("js/63-three-page-diagnosis-model.js", "utf8");

[
  "function readThreePageEvidencePack",
  "function normalizePackStatus",
  "function buildThreePageDiagnosisModel",
  "function buildConclusionCards",
  "function buildConclusionPageModel",
  "function scoreEvidenceStrength",
  "function buildEvidenceMapPageModel",
  "function rankAttributionTopics",
  "function buildReportCandidates",
  "function buildAttributionPageModel",
  "function traceForEvidence",
  "function hasTrace",
  "GENERIC_LANGUAGE_PATTERNS",
  "status: \"missing-pack\"",
  "status: \"stale-pack\"",
  "status: \"partial-pack\"",
  "status: \"error-pack\"",
  "supportCount >= 2 && counterCount === 0",
  "window.buildThreePageDiagnosisModel = buildThreePageDiagnosisModel",
].forEach((needle) => {
  assert(model.includes(needle), `three-page model missing ${needle}`);
});

[
  "conclusion",
  "evidenceMap",
  "attribution",
  "targetBank",
  "peerGroup",
  "selectedIssues",
  "reportCandidates",
  "allTopics",
  "foldedTopics",
  "recommendedSlideLayout",
  "evidenceSentence",
  "trace",
].forEach((needle) => {
  assert(model.includes(needle), `three-page model must expose ${needle}`);
});

console.log("three-page-diagnosis-model-contract-ok");
