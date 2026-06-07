const fs = require("fs");
const assert = require("assert/strict");

const html = fs.readFileSync("index.html", "utf8");
const css = fs.readFileSync("styles/app.css", "utf8");

[
  'id="triSourceValidationPanel"',
  'id="fieldLineageMap"',
  'id="calibrationRulesPanel"',
  'id="annualReportVerificationPanel"',
  'id="annualVerificationKpis"',
  'id="annualVerificationBody"'
].forEach((needle) => assert(html.includes(needle), `Data & Validation missing backend bridge container: ${needle}`));

[
  "主数据",
  "Tushare",
  "年报抓取",
  "仅校验",
  "可替换策略",
  "单位 / 符号 / 合并口径",
  "二零二五年报核验层",
  "主表值",
  "年报抓取值",
  "差异状态"
].forEach((needle) => assert(html.includes(needle), `Data & Validation bridge must explain source role: ${needle}`));

[
  ".data-validation-bridge",
  ".tri-source-grid",
  ".lineage-card",
  ".calibration-rule-list",
  ".annual-verification-panel",
  ".verification-badge",
  ".topic-verification-note",
  ".report-readiness-pill"
].forEach((needle) => assert(css.includes(needle), `Data & Validation bridge missing CSS: ${needle}`));

const dataFormat = fs.readFileSync("js/03-data-format.js", "utf8");
[
  "function annualVerificationRowsForBank",
  "function annualVerificationEvidenceSummary",
  "function reportReadinessFromVerification",
  "function verificationBadgeHtml",
  "可上会",
  "审慎表述",
  "附录披露"
].forEach((needle) => assert(dataFormat.includes(needle), `Verification frontstage helper missing: ${needle}`));

const workspace = fs.readFileSync("js/19-product-workspace.js", "utf8");
[
  "verificationBadgeHtml",
  "topicVerification",
  "reportReadinessFromVerification"
].forEach((needle) => assert(workspace.includes(needle), `Workspace must surface verification status: ${needle}`));

console.log("data-validation-bridge-contract-ok");
