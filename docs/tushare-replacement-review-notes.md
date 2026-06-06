# Tushare 复核替换字段逐项意见

日期：2026-06-03  
依据：`docs/tushare-replacement-review-queue.csv`、`docs/tushare-crosswalk-calibration.csv`、`docs/tushare-field-governance-rules.md`

本文件只给复核建议，不执行字段替换。

## 1. 可优先复核通过的替换/补齐字段

这些字段在可匹配 A 股样本中与 BenchmarkIQ 原字段高度一致，中位差异为 0 或接近 0。复核重点是单位、报告期和银行名映射，不是口径大争议。

| 字段 | Tushare 来源 | 覆盖率 | 差异 | 建议 |
|---|---|---:|---:|---|
| `revenue` | `income.revenue` | 79.1% | 0.0% | 可作为补齐/替换候选 |
| `netProfit` | `income.n_income` | 79.1% | 0.0% | 可作为补齐/替换候选 |
| `interestIncome` | `income.int_income` | 79.1% | 0.0% | 可作为补齐/替换候选 |
| `interestExpense` | `income.int_exp` | 79.1% | 0.0% | 可作为补齐/替换候选 |
| `feeIncome` | `income.n_commis_income` | 79.1% | 0.0% | 可作为补齐/替换候选 |
| `incomeTax` | `income.income_tax` | 79.1% | 0.0% | 可作为补齐/替换候选 |
| `basicEps` | `income.basic_eps` | 79.1% | 0.0% | 可作为补齐/替换候选 |
| `assets` | `balancesheet.total_assets` | 79.1% | 0.0% | 可作为补齐/替换候选 |
| `liabilities` | `balancesheet.total_liab` | 79.1% | 0.0% | 可作为补齐/替换候选 |
| `equity` | `balancesheet.total_hldr_eqy_inc_min_int` | 79.1% | 0.0% | 可作为补齐/替换候选 |
| `operatingCashFlow` | `cashflow.n_cashflow_act` | 79.1% | 0.0% | 可作为补齐/替换候选 |
| `netInterestIncome` | `income.int_income - income.int_exp` | 79.1% | 0.0% | 可作为公式补齐候选 |
| `coreRevenue` | `netInterestIncome + feeIncome` | 79.1% | 0.0% | 可作为公式补齐候选 |
| `nonInterestShare` | `(revenue - netInterestIncome) / revenue` | 79.1% | 0.0% | 可作为公式补齐候选 |
| `feeAssetRatio` | `feeIncome / assets` | 79.1% | 0.0% | 可作为公式补齐候选 |
| `cashProfitRatio` | `operatingCashFlow / netProfit` | 79.1% | 0.0% | 可作为公式补齐候选 |

复核通过后的执行规则：

1. 只补齐缺失或经审批允许的字段。
2. 不覆盖已审定的年报/监管主口径字段。
3. 2025 年如不是完整年报期，必须单独标注。
4. 每个字段保留 `source_table/source_field/formula/unit_transform` 元数据。

## 2. 可通过但需要业务确认的字段

这些字段数值高度贴合，但名称或会计科目容易误解，建议业务确认后再转为正式映射。

| 字段 | Tushare 来源 | 覆盖率 | 差异 | 风险 | 建议 |
|---|---|---:|---:|---|---|
| `adminExpense` | `income.admin_exp` | 79.1% | 0.0% | 需确认 BenchmarkIQ 的“管理费用”是否等同 `admin_exp` | 建议通过；替换掉旧文档里 `biz_tax_surchg` 的错误候选 |
| `costIncomeRatio` | `income.admin_exp / income.revenue` | 79.1% | 中位 0.01%，P90 0.41% | 成本收入比是否只用管理费用，还是业务及管理费口径 | 建议作为公式候选，需确认成本口径 |
| `deposits` | `balancesheet.depos` | 79.1% | 中位 1.60%，P90 2.51% | 需确认是否等同吸收存款，是否含应计利息或表内重分类 | 可补齐，但建议不覆盖已审定原字段 |
| `depositLiabilityRatio` | `deposits / liabilities` | 79.1% | 中位 1.60%，P90 2.51% | 受 `deposits` 差异影响 | 跟随 `deposits` 审批结果 |

## 3. 适合作为新增字段，不作为替换字段

这些字段原 BenchmarkIQ 主表没有同名字段，适合新增到 PB/资本市场专题。

| 字段 | Tushare 来源 | 覆盖率 | 建议用途 |
|---|---|---:|---|
| `peTtm` | `daily_basic.pe_ttm` | 93.6% | PB 估值页补充 PE 视角 |
| `divYield` | `daily_basic.dv_ratio` | 89.7% | 分红吸引力、央国行/高股息对比 |
| `divYieldTtm` | `daily_basic.dv_ttm` | 90.2% | 动态分红水平 |
| `totalMarketValue` | `daily_basic.total_mv` | 93.6% | 市值规模、流动性、市场关注度 |
| `turnoverRate` | `daily_basic.turnover_rate` | 93.6% | 交易活跃度、估值弹性解释 |

## 4. 只能作为校验字段，不建议替换

| 字段 | Tushare 来源 | 结果 | 建议 |
|---|---|---|---|
| `roa` | `fina_indicator.roa_yearly` | 与 BQ `roa` 完全贴合 | 可作为交叉验证；暂不覆盖主字段 |
| `roe` | `fina_indicator.roe` | 中位差异 7.2%，P90 12.0% | 只做校验，不替换 |
| `revenueGrowth` | `fina_indicator.tr_yoy` | 中位差异 0.04% | 可校验；增长率仍建议由同源营收自行计算 |
| `netProfitGrowth` | `fina_indicator.netprofit_yoy` | 中位差异 3.1%，P90 30.7% | 不替换；需查归母/净利润口径差异 |
| `assetGrowth` | `fina_indicator.assets_yoy` | 高度贴合 | 可校验；仍建议由同源资产自行计算 |

## 5. 不建议替换或当前不能通过

| 字段 | 当前候选 | 问题 | 结论 |
|---|---|---|---|
| `loans` | `balancesheet.loanto_oth_bank_fi` | 与 BQ 贷款总额中位差异 96.6%，明显不是同一口径 | 禁止替换 |
| `loanAssetRatio` | `loans / assets` | 继承 `loans` 错口径 | 禁止替换 |
| `creditImpairLoss` | `cashflow.credit_impa_loss` | 现金流补充资料字段，不能直接替代利润表信用减值 | 仅专题代理候选 |
| `depositGrowthCF` | `cashflow.n_incr_dep_cbob` 或 `n_depos_incr_fi` | 两个候选口径不同 | 待二选一复核 |
| `loanIssuanceCF` | `cashflow.n_incr_clt_loan_adv` | 需确认是否为客户贷款及垫款增加 | 专题候选，不进主表 |
| `centralBankAdj` | `cash_reser_cb` 年度变化 | 可计算但不是现金流直读字段 | 只能作为专题衍生 |

## 6. 审批后的推荐执行顺序

1. 第一批：基础报表直读字段和高一致性公式字段。
2. 第二批：市场估值新增字段。
3. 第三批：`adminExpense`、`costIncomeRatio`、`deposits` 经业务确认后再处理。
4. 第四批：现金流专题代理字段，只进入专题页和数据工作台，不进入主指标替换。
5. 禁止批：贷款总额、NIM、风险、资本、流动性监管字段，不从 Tushare 三表自动替换。

