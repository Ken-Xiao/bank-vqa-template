const fs = require("fs");
const assert = require("assert/strict");

const workspace = fs.readFileSync("js/19-product-workspace.js", "utf8");
const css = fs.readFileSync("styles/app.css", "utf8");

[
  "renderManagementDiagnosisAnswer",
  "renderManagementDiagnosisEvidenceMap",
  "renderManagementDiagnosisTopics",
  "management-judgment-card",
  "management-evidence-index",
  "management-topic-chain",
  "data-jump-report-page",
  "展开证据"
].forEach((needle) => {
  assert(workspace.includes(needle), "workspace must include focused diagnosis rendering: " + needle);
});

[
  ".management-diagnosis-answer",
  ".management-judgment-grid",
  ".management-judgment-card",
  ".management-evidence-index",
  ".management-topic-chain",
  ".management-readiness-ready",
  ".management-readiness-review",
  ".management-readiness-appendix"
].forEach((needle) => {
  assert(css.includes(needle), "CSS must support focused diagnosis layout: " + needle);
});

assert(!workspace.includes("renderEvidencePackAnswer(evidencePackAnswerModel(evidencePack))"), "answer page should not render from old evidence pack model directly");
assert(!workspace.includes("renderEvidencePackMap(evidencePackMapModel(evidencePack))"), "evidence page should not render from old evidence map model directly");
assert(!workspace.includes("renderEvidencePackTopics(evidencePackTopicModel(evidencePack))"), "topic page should not render from old topic model directly");

console.log("management-diagnosis-rendering-contract-ok");
