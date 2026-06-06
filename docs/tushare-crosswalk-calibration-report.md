# BenchmarkIQ × Tushare 字段交叉映射校准报告

生成日期：2026-06-03

本报告只做交叉校准和候选推荐，不自动替换任何 BenchmarkIQ 主字段。字段状态遵循 `docs/tushare-field-governance-rules.md`。

## 1. 样本范围

- BenchmarkIQ 主数据：57 家银行，342 条 bank-year 记录。
- 可与 A 股 Tushare ts_code 精确匹配：39 家银行，234 条记录。
- Tushare 缓存表：balancesheet(1516行), income(1333行), cashflow(1296行), fina_indicator(1633行), daily_basic(2889行)。

## 2. 可推荐替换/补齐字段（复核后执行）

|metric|status|source|BQ覆盖|Tushare覆盖|样本|中位差异|建议|
|---|---|---|---|---|---|---|---|
|revenue|direct_exact|income.revenue|100.0%|79.1%|185|0.0%|可推荐替换/补齐，待人工复核|
|netProfit|direct_exact|income.n_income|100.0%|79.1%|185|0.0%|可推荐替换/补齐，待人工复核|
|interestIncome|direct_exact|income.int_income|100.0%|79.1%|185|0.0%|可推荐替换/补齐，待人工复核|
|interestExpense|direct_exact|income.int_exp|100.0%|79.1%|185|0.0%|可推荐替换/补齐，待人工复核|
|feeIncome|direct_exact|income.n_commis_income|100.0%|79.1%|185|0.0%|可推荐替换/补齐，待人工复核|
|incomeTax|direct_exact|income.income_tax|100.0%|79.1%|185|0.0%|可推荐替换/补齐，待人工复核|
|basicEps|direct_exact|income.basic_eps|100.0%|79.1%|185|0.0%|可推荐替换/补齐，待人工复核|
|assets|direct_exact|balancesheet.total_assets|100.0%|79.1%|185|0.0%|可推荐替换/补齐，待人工复核|
|liabilities|direct_exact|balancesheet.total_liab|100.0%|79.1%|185|0.0%|可推荐替换/补齐，待人工复核|
|equity|direct_exact|balancesheet.total_hldr_eqy_inc_min_int|100.0%|79.1%|185|0.0%|可推荐替换/补齐，待人工复核|
|deposits|direct_exact|balancesheet.depos|100.0%|79.1%|185|1.6%|可推荐替换/补齐，待人工复核|
|operatingCashFlow|direct_exact|cashflow.n_cashflow_act|100.0%|79.1%|185|0.0%|可推荐替换/补齐，待人工复核|
|pb|direct_exact|daily_basic.pb year-end|97.9%|93.6%|219|0.0%|可推荐替换/补齐，待人工复核|
|pbMid|direct_exact|daily_basic.pb mid-year|97.4%|93.6%|218|0.3%|可推荐替换/补齐，待人工复核|
|netInterestIncome|derived_formula|income.int_income - income.int_exp|100.0%|79.1%|185|0.0%|可推荐替换/补齐，待人工复核|
|coreRevenue|derived_formula|netInterestIncome + feeIncome|100.0%|79.1%|185|0.0%|可推荐替换/补齐，待人工复核|
|nonInterestShare|derived_formula|(revenue - netInterestIncome) / revenue|100.0%|79.1%|185|0.0%|可推荐替换/补齐，待人工复核|
|feeAssetRatio|derived_formula|feeIncome / assets|100.0%|79.1%|185|0.0%|可推荐替换/补齐，待人工复核|
|depositLiabilityRatio|derived_formula|deposits / liabilities|100.0%|79.1%|185|1.6%|可推荐替换/补齐，待人工复核|
|cashProfitRatio|derived_formula|operatingCashFlow / netProfit|100.0%|79.1%|185|0.0%|可推荐替换/补齐，待人工复核|

## 3. 可作为新增字段的 Tushare 候选

|metric|status|source|BQ覆盖|Tushare覆盖|样本|中位差异|建议|
|---|---|---|---|---|---|---|---|
|peTtm|direct_exact|daily_basic.pe_ttm year-end|0.0%|93.6%|0||可作为新增字段，待人工复核|
|divYield|direct_exact|daily_basic.dv_ratio year-end|0.0%|89.7%|0||可作为新增字段，待人工复核|
|divYieldTtm|direct_exact|daily_basic.dv_ttm year-end|0.0%|90.2%|0||可作为新增字段，待人工复核|
|totalMarketValue|direct_exact|daily_basic.total_mv year-end|0.0%|93.6%|0||可作为新增字段，待人工复核|
|turnoverRate|direct_exact|daily_basic.turnover_rate year-end|0.0%|93.6%|0||可作为新增字段，待人工复核|

## 4. 可计算衍生字段

|metric|status|formula|coverage|review_note|
|---|---|---|---|---|
|adminExpense|proxy_candidate|yuan/10000|79.1%|需确认 BQ 管理费用是否为 admin_exp，不可沿用 biz_tax_surchg|
|netInterestIncome|derived_formula|(yuan-yuan)/10000|79.1%||
|coreRevenue|derived_formula|万元+万元|79.1%||
|nonInterestShare|derived_formula|%|79.1%||
|feeAssetRatio|derived_formula|%|79.1%||
|loanAssetRatio|derived_formula|%|76.5%||
|depositLiabilityRatio|derived_formula|%|79.1%||
|cashProfitRatio|derived_formula|%|79.1%||
|costIncomeRatio|proxy_candidate|%|79.1%|费用字段需业务确认|
|fvChangeRatio|derived_formula|%|79.1%||
|ocfToRevenue|derived_formula|%|79.1%||
|creditImpairLoss|proxy_candidate|yuan/10000|57.3%|现金流补充资料字段，不能直接替代利润表信用减值|
|depositGrowthCF|proxy_candidate|yuan/10000|78.6%|候选字段口径不同，需人工二选一|
|loanIssuanceCF|proxy_candidate|yuan/10000|78.6%|需确认是否为客户贷款及垫款增加|
|centralBankAdj|derived_formula|yuan/10000 YoY|63.2%|需跨期计算，见衍生字段表|

## 5. 需口径复核字段

|metric|status|source|BQ覆盖|Tushare覆盖|样本|中位差异|建议|
|---|---|---|---|---|---|---|---|
|loans|direct_exact|balancesheet.loanto_oth_bank_fi|100.0%|76.5%|179|96.6%|需口径复核|
|loanAssetRatio|derived_formula|loans / assets|100.0%|76.5%|179|96.6%|需口径复核|
|fvChangeRatio|derived_formula|income.fv_value_chg_gain / income.total_profit|0.0%|79.1%|0||需口径复核|
|fairValueChgGain|direct_exact|income.fv_value_chg_gain|0.0%|79.1%|0||需口径复核|
|ocfToRevenue|derived_formula|cashflow.n_cashflow_act / income.revenue|0.0%|79.1%|0||需口径复核|
|assetImpairLoss|direct_exact|income.assets_impair_loss|0.0%|4.7%|0||需口径复核|
|tradAsset|direct_exact|balancesheet.trad_asset|0.0%|79.1%|0||需口径复核|
|debtInvestment|direct_exact|balancesheet.debt_invest|0.0%|57.7%|0||需口径复核|
|otherDebtInvestment|direct_exact|balancesheet.oth_debt_invest|0.0%|59.4%|0||需口径复核|
|investIncome|direct_exact|income.invest_income|0.0%|79.1%|0||需口径复核|
|cashflowInvAct|direct_exact|cashflow.n_cashflow_inv_act|0.0%|79.1%|0||需口径复核|
|cashflowFncAct|direct_exact|cashflow.n_cash_flows_fnc_act|0.0%|79.1%|0||需口径复核|
|centralBankAdj|derived_formula|YoY balancesheet.cash_reser_cb|0.0%|63.2%|0||需口径复核|

## 6. 明确不允许用 Tushare 自动替代的字段

|metric|BQ覆盖|原因|
|---|---|---|
|nim|100.0%|Tushare 三表不直接披露披露口径 NIM|
|earningAssetYield|100.0%|缺平均生息资产口径|
|interestLiabilityCost|100.0%|缺平均计息负债口径|
|npl|100.0%|年报附注/监管口径|
|provisionCoverage|100.0%|年报附注/监管口径|
|overdueRatio|100.0%|年报附注|
|specialMentionRatio|100.0%|年报附注|
|cet1|100.0%|监管资本披露|
|cet1Buffer|100.0%|监管资本披露|
|carBuffer|100.0%|监管资本披露|
|rwaDensity|100.0%|RWA监管口径|
|liquidityCoverageRatio|92.7%|监管流动性指标|
|liquidityRatio|80.8%|监管流动性指标|

## 7. 输出文件

- `/Users/jinkunxiao/Documents/业务/银行财报分析/outputs/vqa_template/docs/tushare-crosswalk-calibration.csv`：逐字段交叉校准明细。
- `/Users/jinkunxiao/Documents/业务/银行财报分析/outputs/vqa_template/docs/tushare-derived-field-candidates.csv`：可计算衍生字段候选。
- `/Users/jinkunxiao/Documents/业务/银行财报分析/outputs/vqa_template/docs/tushare-derived-field-values.csv`：可计算衍生字段的 bank-year 数值。
- `/Users/jinkunxiao/Documents/业务/银行财报分析/outputs/vqa_template/docs/tushare-replacement-review-queue.csv`：复核后替换/补齐/新增候选清单。
- `/Users/jinkunxiao/Documents/业务/银行财报分析/outputs/vqa_template/docs/tushare-field-coverage-current.csv`：Tushare 当前缓存字段覆盖率。
