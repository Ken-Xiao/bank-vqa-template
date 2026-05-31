const fs = require("fs");
const assert = require("assert/strict");

const html = fs.readFileSync("index.html", "utf8");
const css = fs.readFileSync("styles/app.css", "utf8");
const workspace = fs.readFileSync("js/19-product-workspace.js", "utf8");

[
  'id="step2DiagnosisTitle"',
  'id="step2DiagnosisLead"',
  'id="step2KpiStrip"',
  'id="step2BoardQuestions"',
  'id="step2PeerPosition"',
  'id="step2TopChanges"',
  'id="step2PbAnswer"',
  'id="step2TopicCards"',
  'id="step2ActionPath"'
].forEach((needle) => assert(html.includes(needle), `missing Step 2 diagnosis marker: ${needle}`));

[
  "function step2DiagnosisModel",
  "function step2BoardQuestions",
  "function step2TopChangesModel",
  "function step2TopicCards",
  "function renderStep2Diagnosis"
].forEach((needle) => assert(workspace.includes(needle), `missing Step 2 renderer: ${needle}`));

[
  "boardroomDiscussionQuestions",
  "v6AnomalyRadar",
  "sparcDimensionScores",
  "pbDriverRanking",
  "theoreticalPB"
].forEach((needle) => assert(workspace.includes(needle), `Step 2 must reuse existing engine: ${needle}`));

[
  ".step2-diagnosis-hero",
  ".step2-kpi-strip",
  ".step2-evidence-grid",
  ".step2-topic-card",
  ".step2-action-path"
].forEach((needle) => assert(css.includes(needle), `missing Step 2 style marker: ${needle}`));

console.log("sprint7b-default-diagnosis-contract-ok");
