/* Phase 1 Tushare 指标库扩展契约测试
 * 校验：
 *   1. js/35.5-tushare-metrics.js 定义 mergeTushareMetrics / extendMetricLabels / dupontDecomposeFromTushare
 *   2. js/35.5 暴露 5 个 window.* 函数
 *   3. index.html 在 data.js 之后引入 data_tushare.js（sidecar）
 *   4. index.html 在 35-report-model.js 之后引入 35.5-tushare-metrics.js
 *   5. 16 个 Phase 1 字段在 metric_dictionary.csv 中存在
 *   6. 16 个 Phase 1 metricLabel 在 35.5-tushare-metrics.js 中扩展
 *   7. tushare_to_benchmarkiq.py 包含 BANK_NAME_TO_TS_CODE 和 PHASE1_METRICS
 *   8. js/10-bootstrap.js 在 initApp 早期调用 mergeTushareMetrics
 */

const fs = require("fs");
const assert = require("assert/strict");

const tushareJs = fs.readFileSync("js/35.5-tushare-metrics.js", "utf8");
const html = fs.readFileSync("index.html", "utf8");
const bootstrap = fs.readFileSync("js/10-bootstrap.js", "utf8");
const dictCsv = fs.readFileSync("data_governance/metric_dictionary.csv", "utf8");
const py = fs.readFileSync("tushare_to_benchmarkiq.py", "utf8");

// --- 1 & 2: JS 函数定义 + window 暴露 ---
[
  "function mergeTushareMetrics",
  "function extendMetricLabels",
  "function tushareValue",
  "function dupontDecomposeFromTushare",
  "function profitQualityScore",
  "window.mergeTushareMetrics",
  "window.extendMetricLabels",
  "window.tushareValue",
  "window.dupontDecomposeFromTushare",
  "window.profitQualityScore",
  "window.TUSHARE_METRICS_META",
  "window.VQA_DATA_TUSHARE",
].forEach((needle) => assert(tushareJs.includes(needle), `35.5-tushare-metrics must include ${needle}`));

// --- 3 & 4: index.html 加载顺序 ---
const idxDataJs = html.indexOf('src="data.js"');
const idxSidecar = html.indexOf('data_tushare.js');
const idx35 = html.indexOf("js/35-report-model.js");
const idx355 = html.indexOf("js/35.5-tushare-metrics.js");
assert(idxDataJs > 0, "index.html must include data.js");
assert(idxSidecar > 0, "index.html must include data_tushare.js");
assert(idxSidecar > idxDataJs, "data_tushare.js must load after data.js");
assert(idx35 > 0 && idx355 > 0, "both 35 and 35.5 must be referenced");
assert(idx355 > idx35, "35.5-tushare-metrics.js must load after 35-report-model.js");

// --- 5: metric_dictionary.csv 16 个字段 ---
const phase1Fields = [
  "dupontNetMargin", "dupontAssetTurn", "dupontLeverage",
  "dupontROEFromTushare", "dupontROAFromTushare",
  "assetImpairLoss", "creditImpairLoss", "ocfToRevenue",
  "extraItemAmount", "fvChangeRatio", "nonOpRatio",
  "peTtm", "divYield", "divYieldTtm", "totalMarketValue", "turnoverRate",
];
phase1Fields.forEach((field) => {
  assert(dictCsv.includes(field), `metric_dictionary.csv must define ${field}`);
});

// --- 6: 16 个 metricLabel 在 35.5 中 ---
phase1Fields.forEach((field) => {
  assert(tushareJs.includes(`${field}:`), `35.5 must extend metricLabel.${field}`);
});

// --- 7: Python 生成器 ---
[
  "BANK_NAME_TO_TS_CODE",
  "PHASE1_METRICS",
  "601398.SH",
  "600036.SH",
  "fina_indicator",
  "daily_basic",
  "VQA_DATA_TUSHARE",
  "dupontNetMargin",
].forEach((needle) => assert(py.includes(needle), `tushare_to_benchmarkiq.py must include ${needle}`));

// --- 8: bootstrap 早期调用 ---
assert(
  bootstrap.includes("if (typeof mergeTushareMetrics") &&
    bootstrap.includes("mergeTushareMetrics()"),
  "10-bootstrap.js must call mergeTushareMetrics() in initApp"
);
assert(
  bootstrap.includes("if (typeof extendMetricLabels"),
  "10-bootstrap.js must call extendMetricLabels() in initApp"
);

// --- 9: Sidecar loading guard ---
assert(
  html.includes('onerror=') && html.includes('data_tushare.js'),
  "data_tushare.js script tag must have onerror guard (for graceful degradation)"
);

// --- 10: Phase 1B 衍生分析层 ---
const derivedJs = fs.readFileSync("js/37-tushare-derived-analyses.js", "utf8");
[
  "function profitQualityPanel",
  "function valuationWithDividend",
  "function profitQualityCardHTML",
  "function dividendValueCardHTML",
  "function mountTushareDerivedAnalyses",
  "function bindTushareDerivedRender",
  "window.profitQualityPanel",
  "window.mountTushareDerivedAnalyses",
  "__tushareDerivedWrapped",
].forEach((needle) => assert(derivedJs.includes(needle), `37-tushare-derived must include ${needle}`));

// --- 11: dupontBreakdown 加入 Tushare 双源对比字段 ---
const proEngine = fs.readFileSync("js/20-pro-engine.js", "utf8");
[
  "tushareDecomposition",
  "crossSourceDelta",
  "crossSourceWarning",
  "dupontDecomposeFromTushare",
].forEach((needle) => assert(proEngine.includes(needle), `20-pro-engine must expose ${needle}`));

// --- 12: index.html 三个挂载点 + script 引入 ---
[
  'id="profitQualityMount"',
  'id="dividendValueMount"',
  'data-tushare-mount="profit-quality"',
  'data-tushare-mount="dividend-value"',
  "js/37-tushare-derived-analyses.js",
].forEach((needle) => assert(html.includes(needle), `index.html must include ${needle}`));

// --- 13: 37 必须在 35.5 之后加载 ---
const idx37 = html.indexOf("js/37-tushare-derived-analyses.js");
assert(idx37 > idx355, "37-tushare-derived must load after 35.5-tushare-metrics");

// --- 14: CSS 样式存在 ---
const css = fs.readFileSync("styles/app.css", "utf8");
[
  ".profit-quality-card",
  ".profit-quality-layer",
  ".pq-score",
  ".pq-insight",
  ".dividend-value-card",
  ".dividend-value-table",
  ".dv-verdict",
].forEach((needle) => assert(css.includes(needle), `app.css must define ${needle}`));

// --- 15: Phase 2 数据生成器 + 12 字段 ---
const phase2Fields = [
  "tradAsset", "fvociAssets", "acAssets", "htmInvest", "afaAssets",
  "investIncome", "fairValueChgGain",
  "cashflowInvAct", "cashflowFncAct", "depositGrowthCF", "loanIssuanceCF", "centralBankAdj",
];
phase2Fields.forEach((field) => {
  assert(dictCsv.includes(field), `metric_dictionary.csv must include Phase 2 ${field}`);
  assert(py.includes(field), `tushare_to_benchmarkiq.py must include Phase 2 ${field}`);
});
assert(py.includes("PHASE2_METRICS"), "tushare_to_benchmarkiq.py must define PHASE2_METRICS");
assert(py.includes("phase1plus2_v1"), "tushare_to_benchmarkiq.py must emit phase1plus2_v1 version");
assert(py.includes('"cashflow", "balancesheet"'), "tushare_to_benchmarkiq.py must read cashflow + balancesheet");

// --- 16: Phase 2 衍生分析层（js/38）---
const phase2Js = fs.readFileSync("js/38-tushare-phase2-analyses.js", "utf8");
[
  "function assetClassificationPanel",
  "function cashFlowDepthPanel",
  "function assetClassificationCardHTML",
  "function cashFlowDepthCardHTML",
  "function mountTusharePhase2Analyses",
  "function bindTusharePhase2Render",
  "function formalIfrs9ClassificationSection",
  "function formalCashFlowDepthSection",
  "window.assetClassificationPanel",
  "window.cashFlowDepthPanel",
  "window.formalIfrs9ClassificationSection",
  "window.formalCashFlowDepthSection",
  "__tusharePhase2Wrapped",
].forEach((needle) => assert(phase2Js.includes(needle), `js/38 must include ${needle}`));

// --- 17: F 进正式报告：formal-section 桥接调用 ---
const formal = fs.readFileSync("js/22-formal-report.js", "utf8");
[
  "formalProfitQualitySection",
  "formalDividendValuationSection",
  "formalIfrs9ClassificationSection",
  "formalCashFlowDepthSection",
].forEach((needle) => {
  assert(formal.includes(needle), `22-formal-report must invoke ${needle}`);
});

// --- 18: 37 file 加入 formal section 生成器 ---
[
  "function formalProfitQualitySection",
  "function formalDividendValuationSection",
  "window.formalProfitQualitySection",
  "window.formalDividendValuationSection",
].forEach((needle) => assert(derivedJs.includes(needle), `37 must define ${needle}`));

// --- 19: Phase 2 metricLabel ---
phase2Fields.forEach((field) => {
  assert(tushareJs.includes(`${field}:`), `35.5 must extend metricLabel.${field} (Phase 2)`);
});

// --- 20: index.html 加载 38 + Phase 2 挂载点 ---
[
  "js/38-tushare-phase2-analyses.js",
  'id="assetClassificationMount"',
  'id="cashFlowDepthMount"',
].forEach((needle) => assert(html.includes(needle), `index.html must include ${needle}`));

// --- 21: 38 必须在 37 之后加载 ---
const idx38 = html.indexOf("js/38-tushare-phase2-analyses.js");
assert(idx38 > idx37, "38-tushare-phase2 must load after 37-tushare-derived");

// --- 22: Phase 2 CSS 样式 ---
[
  ".ifrs9-classification-card",
  ".ifrs9-bar-segment",
  ".ifrs9-table",
  ".cashflow-depth-card",
  ".cf-pattern",
  ".cf-flows-grid",
  ".cf-depth-rows",
  ".formal-section .ifrs9-classification-card",
].forEach((needle) => assert(css.includes(needle), `app.css must define ${needle}`));

console.log("metric-library-phase1and2-contract-ok");
