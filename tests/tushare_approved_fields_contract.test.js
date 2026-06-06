const fs = require("fs");
const assert = require("assert/strict");

const py = fs.readFileSync("tushare_to_benchmarkiq.py", "utf8");
const metricsJs = fs.readFileSync("js/35.5-tushare-metrics.js", "utf8");
const derivedJs = fs.readFileSync("js/37-tushare-derived-analyses.js", "utf8");

[
  "APPROVED_REPLENISHMENT_METRICS",
  "BUSINESS_CONFIRMED_METRICS",
  "MARKET_ADDITION_METRICS",
  "governance_status",
  "source_table",
  "unit_transform",
].forEach((needle) => {
  assert(py.includes(needle), `tushare_to_benchmarkiq.py missing approved field contract: ${needle}`);
});

[
  "revenue",
  "netProfit",
  "interestIncome",
  "interestExpense",
  "feeIncome",
  "incomeTax",
  "basicEps",
  "assets",
  "liabilities",
  "equity",
  "operatingCashFlow",
  "netInterestIncome",
  "coreRevenue",
  "nonInterestShare",
  "feeAssetRatio",
  "cashProfitRatio",
].forEach((field) => {
  assert(py.includes(`"${field}"`), `approved replenishment field missing: ${field}`);
});

[
  "adminExpense",
  "costIncomeRatio",
  "deposits",
  "depositLiabilityRatio",
].forEach((field) => {
  assert(py.includes(`"${field}"`), `business-confirmed candidate missing: ${field}`);
});

[
  "peTtm",
  "divYield",
  "divYieldTtm",
  "totalMarketValue",
  "turnoverRate",
].forEach((field) => {
  assert(py.includes(`"${field}"`), `market addition field missing: ${field}`);
  assert(metricsJs.includes(`${field}:`), `metric label missing for ${field}`);
});

[
  "approvedReplenishmentFields",
  "businessConfirmedFields",
  "marketAdditionFields",
  "fieldGovernance",
].forEach((needle) => {
  assert(metricsJs.includes(needle), `merge metadata missing ${needle}`);
});

[
  "capitalMarketSignalPanel",
  "capitalMarketSignalCardHTML",
  "marketLiquidityVerdict",
  "totalMarketValue",
  "turnoverRate",
].forEach((needle) => {
  assert(derivedJs.includes(needle), `capital market analysis missing ${needle}`);
});

console.log("tushare-approved-fields-contract-ok");
