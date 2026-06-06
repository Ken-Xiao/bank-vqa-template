# 年报抓取数据 × 原有数据 × Tushare 完整性分析

生成日期：2026-06-03

## 1. 数据范围

- 原有主数据：342 条 bank-year，57 家银行。
- Tushare sidecar：360 条 bank-year。
- 年报抓取数据：728 个 CSV，成功读取 727 个，识别到 51 家标准化银行。
- 抓取数据当前主要是 2025 年年报口径，适合补充监管指标、附注指标、期限结构和分产品/分行业风险字段。

## 2. 抓取数据表覆盖

|表类型|文件数|已映射到系统字段|
|---|---:|---|
|liquidity_risk_long.csv|52|暂未映射，建议入数据仓库明细表|
|loan_npl_product_long.csv|52|businessLoanNpl, consumerLoanNpl, creditCardLoanNpl, housingLoanNpl, personalLoanNpl|
|extraction_status.csv|52|暂未映射，建议入数据仓库明细表|
|loan_writeoff_long.csv|52|暂未映射，建议入数据仓库明细表|
|nim_long.csv|52|earningAssetYield, interestLiabilityCost, nim|
|loan_5class_migration_long.csv|52|暂未映射，建议入数据仓库明细表|
|fee_commission_long.csv|52|暂未映射，建议入数据仓库明细表|
|loan_npl_industry_long.csv|52|暂未映射，建议入数据仓库明细表|
|financials_core_long.csv|52|assets, creditImpairLoss, debtInvestment, deposits, equity, fairValueChgGain, feeIncome, incomeTax, interestExpense, interestIncome, investIncome, liabilities, loans, netInterestIncome, netProfit, otherDebtInvestment, revenue, totalProfit, tradAsset|
|special_metrics_long.csv|52|cet1, costIncomeRatio, liquidityCoverageRatio, liquidityRatio, loanDepositRatio, nim, npl, provisionCoverage, realLoanDepositSpread, roa, roe|
|other_noninterest_income_long.csv|52|fairValueChgGain, fxGain, investIncome, otherNonInterestIncome|
|provision_long.csv|52|assetImpairLoss, creditImpairLoss, otherAssetImpairLoss|
|ifrs9_stage_distribution_long.csv|51|暂未映射，建议入数据仓库明细表|
|repricing_long.csv|51|暂未映射，建议入数据仓库明细表|
|ifrs9_stage_distribution_long .csv|1|暂未映射，建议入数据仓库明细表|

## 3. 已可对标的字段完整性

|系统字段|抓取非空 bank-year|抓取覆盖|与主数据重叠|主数据差异>3%|与Tushare重叠|Tushare差异>3%|
|---|---:|---:|---:|---:|---:|---:|
|creditImpairLoss|51|100.0%|0|0|0|0|
|netProfit|50|98.0%|47|17|0|0|
|nim|50|98.0%|49|0|0|0|
|feeIncome|49|96.1%|46|16|0|0|
|netInterestIncome|49|96.1%|46|16|0|0|
|otherNonInterestIncome|47|92.2%|0|0|0|0|
|earningAssetYield|46|90.2%|45|1|0|0|
|fairValueChgGain|46|90.2%|0|0|0|0|
|fxGain|46|90.2%|0|0|0|0|
|interestLiabilityCost|46|90.2%|45|2|0|0|
|investIncome|46|90.2%|0|0|0|0|
|deposits|45|88.2%|44|18|0|0|
|roa|44|86.3%|42|1|0|0|
|revenue|41|80.4%|39|15|0|0|
|loans|40|78.4%|39|25|0|0|
|assets|39|76.5%|36|14|0|0|
|equity|39|76.5%|37|13|0|0|
|liabilities|39|76.5%|36|13|0|0|
|cet1|38|74.5%|37|0|0|0|
|npl|38|74.5%|37|0|0|0|
|provisionCoverage|38|74.5%|37|0|0|0|
|costIncomeRatio|36|70.6%|35|0|0|0|
|personalLoanNpl|36|70.6%|35|3|0|0|
|totalProfit|36|70.6%|0|0|0|0|
|incomeTax|32|62.7%|30|19|0|0|
|liquidityRatio|32|62.7%|30|0|0|0|
|interestExpense|31|60.8%|30|22|0|0|
|interestIncome|31|60.8%|30|9|0|0|
|liquidityCoverageRatio|27|52.9%|27|0|0|0|
|realLoanDepositSpread|25|49.0%|0|0|0|0|
|roe|24|47.1%|18|0|0|0|
|debtInvestment|21|41.2%|0|0|0|0|
|otherDebtInvestment|21|41.2%|0|0|0|0|
|tradAsset|21|41.2%|0|0|0|0|
|housingLoanNpl|20|39.2%|17|0|0|0|
|consumerLoanNpl|19|37.3%|15|0|0|0|
|businessLoanNpl|18|35.3%|16|1|0|0|
|loanDepositRatio|16|31.4%|0|0|0|0|
|otherAssetImpairLoss|16|31.4%|0|0|0|0|
|creditCardLoanNpl|12|23.5%|0|0|0|0|
|assetImpairLoss|3|5.9%|0|0|0|0|

## 4. 初步判断

1. 抓取数据最有价值的不是替代 Tushare，而是补 Tushare 不覆盖的附注/监管口径：不良率、拨备覆盖率、核心一级资本充足率、流动性覆盖率、分产品不良、IFRS9 三阶段、重定价期限、流动性期限。
2. 原有主数据仍适合作为 2020-2025 的主表，因为历史覆盖完整；抓取数据目前应作为 2025 年报核验层和附注明细层。
3. Tushare 适合做标准三表和市场行情补充；抓取年报适合做监管指标和深钻专题。两者职责应分开，避免互相强替。
4. 差异 >3% 的字段需要二次复核，常见原因是单位、集团/母公司口径、净额/总额口径、利润归母/净利润口径。
5. Tushare 当前财务三表侧重点仍是 2020-2024 完整年报；2025 抓取年报与 Tushare 财务字段重叠较少，市场行情字段则由 Tushare 单独补。

## 5. 建议的数据仓库分层

- `fact_bank_core_financials`：主表字段，保留原有口径，抓取/Tushare 只做补齐或校验。
- `fact_bank_regulatory_metrics`：NIM、不良、拨备、资本、流动性等监管指标，优先来自年报抓取。
- `fact_bank_retail_risk_product`：个人住房、经营、消费、信用卡贷款余额和不良率。
- `fact_bank_ifrs9_stage`：三阶段余额、减值准备、阶段占比、覆盖率。
- `fact_bank_repricing_gap`：资产/负债重定价期限桶。
- `fact_bank_liquidity_maturity`：流动性期限错配。
- `fact_bank_fee_commission_detail` 与 `fact_bank_noninterest_income_detail`：手续费与非息收入拆分。

## 6. 输出文件

- `/Users/jinkunxiao/Documents/业务/银行财报分析/outputs/vqa_template/docs/scraped-vs-main-tushare-field-completeness.csv`：字段级三源完整性和冲突统计。
- `/Users/jinkunxiao/Documents/业务/银行财报分析/outputs/vqa_template/docs/scraped-data-raw-table-coverage.csv`：抓取原始表覆盖和映射情况。
- `/Users/jinkunxiao/Documents/业务/银行财报分析/outputs/vqa_template/docs/scraped-vs-main-tushare-conflicts.csv`：字段差异 >3% 的银行级明细。
- `/Users/jinkunxiao/Documents/业务/银行财报分析/outputs/vqa_template/docs/scraped-bank-coverage.csv`：抓取银行覆盖与主数据/Tushare 是否可对标。
