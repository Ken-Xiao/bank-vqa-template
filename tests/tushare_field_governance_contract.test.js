const fs = require("fs");
const assert = require("assert/strict");

const rules = fs.readFileSync("docs/tushare-field-governance-rules.md", "utf8");

[
  "direct_exact",
  "derived_formula",
  "validation_only",
  "proxy_candidate",
  "blocked_missing",
].forEach((status) => {
  assert(rules.includes(status), `Missing governance status: ${status}`);
});

[
  "`nim`",
  "`npl`",
  "`provisionCoverage`",
  "`cet1` / `cet1Buffer` / `carBuffer`",
  "`liquidityCoverageRatio` / `liquidityRatio`",
].forEach((metric) => {
  assert(rules.includes(metric), `Missing no-auto-substitution metric: ${metric}`);
});

[
  "`dupontROAFromTushare`",
  "`creditImpairLoss`",
  "`ocfToRevenue`",
  "`fvChangeRatio`",
  "`nonOpRatio`",
  "`fairValueChgGain`",
  "`depositGrowthCF`",
  "`loanIssuanceCF`",
  "`centralBankAdj`",
  "`adminExpense`",
].forEach((metric) => {
  assert(rules.includes(metric), `Missing review item for risky mapping: ${metric}`);
});

[
  "Tushare sidecar 只能补充新增字段，不覆盖 `data.js` 已有 BenchmarkIQ 主字段。",
  "缺失字段保持 `null`，不能用同业均值、类型均值或 0 填充目标银行。",
  "银行别名只用于匹配，不生成重复 sidecar 记录。",
].forEach((rule) => {
  assert(rules.includes(rule), `Missing merge safety rule: ${rule}`);
});

console.log("tushare-field-governance-contract-ok");
