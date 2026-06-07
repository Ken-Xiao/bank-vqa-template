const assert = require("assert");
const fs = require("fs");
const path = require("path");
const vm = require("vm");

const ROOT = path.resolve(__dirname, "..");
const GOV = path.join(ROOT, "data_governance");

function readJson(file) {
  return JSON.parse(fs.readFileSync(file, "utf8"));
}

function loadReadyJs() {
  const sandbox = { window: {} };
  const code = fs.readFileSync(path.join(ROOT, "data_ready.js"), "utf8");
  vm.runInNewContext(code, sandbox);
  return sandbox.window.VQA_DATA_READY;
}

const requiredFiles = [
  "data_ready.js",
  "data_governance/ready_record_wide.json",
  "data_governance/ready_record_wide.csv",
  "data_governance/ready_metric_quality.json",
  "data_governance/ready_metric_quality.csv",
  "data_governance/field_source_governance.json",
  "data_governance/field_source_governance.csv",
  "data_governance/annual_report_verification_2025.json",
  "data_governance/annual_report_verification_2025.csv",
];

for (const rel of requiredFiles) {
  const file = path.join(ROOT, rel);
  assert(fs.existsSync(file), `${rel} must be generated`);
  assert(fs.statSync(file).size > 0, `${rel} must not be empty`);
}

const ready = loadReadyJs();
const records = readJson(path.join(GOV, "ready_record_wide.json"));
const quality = readJson(path.join(GOV, "ready_metric_quality.json"));

assert.strictEqual(ready.version, "20260606-ready-v2", "ready version must be stable");
assert(Array.isArray(ready.records), "data_ready.js must expose records");
assert(Array.isArray(ready.metricQuality), "data_ready.js must expose metric quality");
assert(Array.isArray(ready.fieldGovernance), "data_ready.js must expose field governance");
assert(Array.isArray(ready.annualReportVerification), "data_ready.js must expose annual report verification");
assert(records.length >= 300, "ready wide records should cover the current bank-year base");
assert(quality.length > records.length, "quality table should have metric-level rows");

assert.strictEqual(ready.aliases["瑞丰"], "瑞丰农商行", "瑞丰 alias must map to canonical bank");
assert.strictEqual(ready.aliases["杭州银行"], "杭州", "杭州银行 alias must stay canonicalized");

const selectedBanks = ["苏州农商行", "常熟农商行", "瑞丰农商行", "上海农商行", "苏州"];
for (const bank of selectedBanks) {
  const row = records.find((item) => item.bank === bank && item.year === 2025);
  assert(row, `${bank} 2025 must exist in ready wide records`);
}

const suzhouRcb = records.find((item) => item.bank === "苏州农商行" && item.year === 2025);
assert(suzhouRcb.peTtm != null, "苏州农商行 should receive Tushare market PE");
assert(suzhouRcb.divYield != null, "苏州农商行 should receive Tushare dividend yield");
assert(suzhouRcb._readyFieldSources.peTtm === "tushare_market", "market field source must be marked");

const allowedStatuses = new Set([
  "available",
  "source_missing",
  "scraped_available_not_fieldized",
  "peer_insufficient",
  "calculation_input_missing",
  "source_conflict_review",
]);
for (const item of quality) {
  assert(allowedStatuses.has(item.status), `unexpected status ${item.status}`);
}

const sourceMissing = quality.find((item) => item.metric === "creditCardLoanNpl" && item.status !== "available");
assert(sourceMissing, "quality table should explain missing credit card loan NPL");
assert(
  ["source_missing", "scraped_available_not_fieldized", "calculation_input_missing"].includes(sourceMissing.status),
  "missing credit card loan NPL should use a governed missing status",
);

const fieldized = quality.find(
  (item) =>
    item.bank === "苏州农商行" &&
    item.year === 2025 &&
    item.metric === "housingLoanNpl",
);
assert(fieldized, "quality table should include 苏州农商行 housing loan NPL");
assert(
  fieldized.status === "scraped_available_not_fieldized" || fieldized.status === "available",
  "scraped product rows should be identified as available or awaiting fieldization",
);

console.log("ready_data_layer_contract passed");
