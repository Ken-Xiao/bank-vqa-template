const assert = require("assert");
const fs = require("fs");
const path = require("path");
const vm = require("vm");

const ROOT = path.resolve(__dirname, "..");
const GOV = path.join(ROOT, "data_governance");

function readJson(rel) {
  return JSON.parse(fs.readFileSync(path.join(ROOT, rel), "utf8"));
}

function loadReady() {
  const sandbox = { window: {} };
  vm.runInNewContext(fs.readFileSync(path.join(ROOT, "data_ready.js"), "utf8"), sandbox);
  return sandbox.window.VQA_DATA_READY;
}

[
  "data_governance/field_source_governance.json",
  "data_governance/field_source_governance.csv",
  "data_governance/annual_report_verification_2025.json",
  "data_governance/annual_report_verification_2025.csv",
].forEach((rel) => {
  const file = path.join(ROOT, rel);
  assert(fs.existsSync(file), `${rel} must be generated`);
  assert(fs.statSync(file).size > 0, `${rel} must not be empty`);
});

const ready = loadReady();
const governance = readJson("data_governance/field_source_governance.json");
const verification = readJson("data_governance/annual_report_verification_2025.json");

assert(Array.isArray(ready.fieldGovernance), "data_ready.js must expose fieldGovernance");
assert(Array.isArray(ready.annualReportVerification), "data_ready.js must expose annualReportVerification");
assert.strictEqual(ready.fieldGovernance.length, governance.length, "embedded governance rows must match generated JSON");
assert.strictEqual(ready.annualReportVerification.length, verification.length, "embedded verification rows must match generated JSON");

const roles = new Set(governance.map((row) => row.sourceRole));
["primary", "supplement", "validation", "detail-only"].forEach((role) => {
  assert(roles.has(role), `field governance must include ${role} role`);
});

const byMetric = Object.fromEntries(governance.map((row) => [row.metric, row]));
assert.strictEqual(byMetric.peTtm.sourceRole, "supplement", "market PE must be a supplement field");
assert.strictEqual(byMetric.nim.sourceRole, "validation", "NIM must be a 2025 annual report validation field");
assert.strictEqual(byMetric.housingLoanNpl.sourceRole, "detail-only", "retail loan NPL detail must stay in appendix/detail layer");
assert(byMetric.nim.detailTables.includes("nim_long.csv"), "NIM governance must keep scraped source table lineage");

const allowedStatuses = new Set([
  "matched",
  "source_conflict_review",
  "scraped_pending_fieldization",
  "main_only",
  "filled_from_validation",
  "missing",
]);
verification.forEach((row) => {
  assert.strictEqual(Number(row.year), 2025, "annual verification layer must be scoped to 2025");
  assert(allowedStatuses.has(row.verificationStatus), `unexpected annual verification status ${row.verificationStatus}`);
  assert(row.metricName, "verification rows must carry Chinese metric names");
  assert(row.managementAction, "verification rows must explain management action");
});

["nim", "npl", "cet1"].forEach((metric) => {
  assert(
    verification.some((row) => row.bank === "苏州农商行" && row.metric === metric),
    `苏州农商行 verification rows must include ${metric}`,
  );
});

assert(
  verification.some((row) => row.verificationStatus === "matched"),
  "annual verification should include matched rows",
);
assert(
  verification.some((row) => row.verificationStatus === "source_conflict_review" || row.verificationStatus === "main_only"),
  "annual verification should surface rows requiring review or source explanation",
);

console.log("sprint11a_ready_governance_contract passed");
