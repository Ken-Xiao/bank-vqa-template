/* Benchmark 因果链 spec 契约测试
 * 覆盖：
 *   - 9 个 benchmark 域都有可渲染的 headline decomposition spec
 *   - loan_corp / loan_retail / deposit / liquidity 关键域具备专门 spec
 *   - ROE 能沿 NIM -> 负债成本 -> 定期化率做跨域链式追溯
 */

const fs = require("fs");
const assert = require("assert/strict");

const js = fs.readFileSync("js/55-benchmark-page.js", "utf8");

[
  'profitability: "profitability.roe"',
  'nim:           "nim.nim"',
  'quality:       "quality.npl"',
  'capital:       "capital.car"',
  'loan_corp:     "loan_corp.corp_hhi"',
  'loan_retail:   "loan_retail.retail_npl"',
  'deposit:       "deposit.dep_time_total"',
  'liquidity:     "liquidity.lcr"',
  'ifrs9:         "ifrs9.fa_s2_pct"',
].forEach((needle) => {
  assert(js.includes(needle), `DOMAIN_HEADLINE_METRIC must include ${needle}`);
});

[
  '"loan_corp.high_risk_combined"',
  '"loan_retail.retail_npl"',
  '"deposit.ldr"',
  '"liquidity.lcr"',
].forEach((needle) => {
  assert(js.includes(needle), `DECOMPOSITION_SPECS must include ${needle}`);
});

[
  "function buildCausalTraceChain",
  "function renderCausalTraceChain",
  "bm-causal-chain",
  "data-causal-chain-key",
  "data-drill-key",
  "renderDecompositionCard(nextDecomp",
].forEach((needle) => {
  assert(js.includes(needle), `causal chain renderer must include ${needle}`);
});

[
  "profitability.roe",
  "nim.nim",
  "nim.liab_cost",
  "deposit.dep_time_total",
].forEach((needle) => {
  assert(js.includes(needle), `ROE chain must be able to traverse ${needle}`);
});

console.log("benchmark-decomposition-specs-contract-ok");
