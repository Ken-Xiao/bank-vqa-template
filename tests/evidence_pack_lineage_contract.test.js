const fs = require("fs");
const assert = require("assert/strict");

const builder = fs.readFileSync("js/38-evidence-pack-builder.js", "utf8");
const layered = fs.readFileSync("js/36-layered-fact-model.js", "utf8");

[
  "function normalizeReadyMetricFact",
  "function buildEvidencePack",
  "function validateEvidencePackLineage",
  "sourceRefs",
  "qualityStatus",
  "ready_record_wide",
  "ready_metric_quality",
  "function evidenceAnnualVerificationRows",
  "annual_report_verification_2025"
].forEach((needle) => assert(builder.includes(needle), `missing ${needle}`));

assert(layered.includes("buildEvidencePack"), "layered fact model must route evidence through shared builder");
assert(layered.includes("sourceRefs"), "layered fact model must preserve sourceRefs");

console.log("evidence-pack-lineage-contract-ok");
