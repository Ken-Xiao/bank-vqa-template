# BenchmarkIQ × Tushare 字段映射治理规则

版本：2026-06-03  
适用范围：`data_tushare_cache/*`、`data_tushare.js`、`tushare_to_benchmarkiq.py`、`docs/tushare-field-mapping.csv`、`docs/unified-schema.csv`

## 1. 基本原则

Tushare 字段接入不能按字段名相似度直接替换 BenchmarkIQ 既有字段。每个映射必须先判断口径层级，再决定是否进入前端事实包。

字段状态分为五类：

| 状态 | 含义 | 是否可进入正式报告 |
|---|---|---|
| `direct_exact` | Tushare 字段与 BenchmarkIQ 指标口径一致，单位可明确换算 | 可以 |
| `derived_formula` | 由多个 Tushare 字段按明确公式推导，公式可复算 | 可以，但必须展示公式 |
| `validation_only` | 仅用于和 BenchmarkIQ 原字段交叉验证，不覆盖主口径 | 不作为主指标 |
| `proxy_candidate` | 只是候选代理，业务含义不完全一致 | 不进入正式报告，只进入数据工作台 |
| `blocked_missing` | Tushare 不覆盖或当前权限/缓存无字段 | 不接入，保留为空 |

## 2. 不允许自动替换的字段

以下字段不允许用 Tushare 通用报表字段“近似替代”，除非后续从年报附注、监管披露或人工复核表拿到同口径数据：

| BenchmarkIQ 字段 | 禁止原因 |
|---|---|
| `nim` | 净息差是银行披露口径，不能简单用利息净收入 / 总资产替代 |
| `earningAssetYield` | 生息资产平均余额口径复杂，不能用期末总资产替代 |
| `interestLiabilityCost` | 计息负债平均余额口径复杂，不能用期末总负债替代 |
| `npl` | 不良率来自资产质量披露，Tushare 三表不直接覆盖 |
| `provisionCoverage` | 拨备覆盖率需要贷款减值准备和不良贷款余额 |
| `overdueRatio` | 逾期贷款来自年报附注，不在 Tushare 三表主字段 |
| `specialMentionRatio` | 关注类贷款来自年报附注，不在 Tushare 三表主字段 |
| `cet1` / `cet1Buffer` / `carBuffer` | 资本充足率来自监管资本披露，不可由权益/资产粗算替代 |
| `estimatedRwa` / `rwaDensity` | RWA 需要监管口径，代理估算必须单列为 proxy |
| `liquidityCoverageRatio` / `liquidityRatio` | 流动性监管指标不在 Tushare 三表主字段 |
| 零售/对公/票据不良率 | 贷款分产品和分行业资产质量来自年报附注 |
| 公司/个人活期定期存款 | 存款结构明细来自年报附注 |

## 3. 可以接入但必须标注公式的字段

这些字段可以从 Tushare 推导，但不得标为“直读”：

| BenchmarkIQ 字段 | 推荐口径 | 状态 |
|---|---|---|
| `netInterestIncome` | `income.int_income - income.int_exp`，如存在同口径净额字段再优先直读 | `derived_formula` |
| `coreRevenue` | `netInterestIncome + feeIncome` | `derived_formula` |
| `coreRevenueGrowth` | `coreRevenue` 年度同比 | `derived_formula` |
| `revenueGrowth` | `income.revenue` 年度同比，或与 `fina_indicator.tr_yoy` 交叉验证 | `derived_formula` |
| `netProfitGrowth` | `income.n_income` 年度同比，或与 `fina_indicator.netprofit_yoy` 交叉验证 | `derived_formula` |
| `ppop` | 需要先确认拨备/减值字段口径；未确认前只做候选 | `proxy_candidate` |
| `costIncomeRatio` | 管理费用或业务及管理费 / 营业收入，费用字段需业务复核 | `derived_formula` |
| `nonInterestShare` | `(revenue - netInterestIncome) / revenue` | `derived_formula` |
| `feeAssetRatio` | `income.n_commis_income / balancesheet.total_assets` | `derived_formula` |
| `fvChangeRatio` | `income.fv_value_chg_gain / income.total_profit` | `derived_formula` |
| `ocfToRevenue` | `cashflow.n_cashflow_act / income.revenue`，不可直接寻找不存在字段 | `derived_formula` |
| `centralBankAdj` | `balancesheet.cash_reser_cb` 年度变化，不是现金流字段直读 | `derived_formula` |

## 4. 当前可疑映射清单

这些映射已有代码或文档记录，但在当前缓存中字段不存在、覆盖为 0，或口径需要人工确认。暂不允许直接替换为“相似字段”，必须按本表完成复核。

| 当前指标 | 当前映射 | 当前问题 | 推荐处理 |
|---|---|---|---|
| `dupontROAFromTushare` | `fina_indicator.roa` | 当前缓存该字段覆盖 0%，`roa_yearly` 覆盖 100% | 作为 `validation_only` 复核：确认 `roa_yearly` 与 BQ `roa` 单位一致后再改 |
| `creditImpairLoss` | `income.prov_depr_assets` | `income` 不存在该字段；`cashflow.credit_impa_loss` 覆盖约 37% | 不能直接作为利润表信用减值；需确认现金流补充资料字段含义 |
| `ocfToRevenue` | `fina_indicator.ocf_to_revenue` | 当前缓存不存在 | 改为公式候选：经营现金流 / 营业收入 |
| `fvChangeRatio` | `fina_indicator.valuechange_to_ebt` | 当前缓存不存在 | 改为公式候选：公允价值变动损益 / 利润总额 |
| `nonOpRatio` | `fina_indicator.op_to_ebt` | 当前缓存不存在 | 改为公式候选：营业外收支净额 / 利润总额，或不接入 |
| `fairValueChgGain` | `income.fair_value_chg_gain` | 实际字段为 `income.fv_value_chg_gain` | 字段名修正属于 `direct_exact` 候选，但仍需确认单位 |
| `depositGrowthCF` | `cashflow.n_incr_dep_cob` | 字段名拼写不匹配 | 候选字段 `n_incr_dep_cbob` / `n_depos_incr_fi` 口径不同，需二选一复核 |
| `loanIssuanceCF` | `cashflow.n_decr_loan_cb` | 当前缓存不存在 | 候选字段 `n_incr_clt_loan_adv`，需确认是否为客户贷款及垫款增加 |
| `centralBankAdj` | `cashflow.incr_money_oth_bank` | 当前缓存不存在 | 应改为 `balancesheet.cash_reser_cb` 年度变化候选 |
| `adminExpense` | `income.biz_tax_surchg` | 当前文档存在映射，但字段名含义更接近税金及附加 | 必须复核是否应使用 `income.admin_exp` |

## 5. 单位规则

| 来源 | 常见单位 | BenchmarkIQ 输出单位 | 规则 |
|---|---|---|---|
| `income` / `balancesheet` / `cashflow` 金额字段 | 元 | 万元 | `/ 10000` |
| `daily_basic.total_mv` | 万元 | 万元 | 不换算 |
| `daily_basic.pb / pe_ttm` | 倍 | 倍 | 不换算 |
| `daily_basic.dv_ratio / dv_ttm / turnover_rate` | % | % | 不换算 |
| `fina_indicator` 比率字段 | 多数已为 % 或倍 | 按字段逐项确认 | 不允许统一乘 100 或除 100 |

## 6. 时间口径规则

1. 年度财报字段优先取 `end_date = YYYY1231`。
2. 市场字段 `daily_basic` 的年末 PB/PE/市值取当年最后一个可得交易日。
3. `pbMid` 取当年 6 月最后一个可得交易日，不得用年末 PB 替代。
4. 年度同比必须使用同一银行、同一口径、相邻年度字段计算。
5. 2025 年如只有三季报或快照数据，必须在元数据中标注 `period_type = interim`，不应与年报直接混排。

## 7. 前端合并规则

1. Tushare sidecar 只能补充新增字段，不覆盖 `data.js` 已有 BenchmarkIQ 主字段。
2. 交叉验证字段必须以 `FromTushare` 或 `TushareCheck` 命名。
3. 代理字段必须以 `Proxy` 或在 metadata 中标记 `status = proxy_candidate`。
4. 缺失字段保持 `null`，不能用同业均值、类型均值或 0 填充目标银行。
5. 一家银行一年只能保留一条标准记录；银行别名只用于匹配，不生成重复 sidecar 记录。

## 8. 后续修映射的审批清单

每个字段从“待复核”进入“可接入”前，至少回答：

1. Tushare 表名和字段名是否真实存在？
2. 当前缓存覆盖率是多少？
3. 单位是否确认？
4. 财年/报告期是否确认？
5. 与 BenchmarkIQ 原字段口径是否一致？
6. 如果不一致，是不是只作为校验字段或代理字段？
7. 是否会覆盖主数据？如果会，禁止上线。
8. 是否有至少一家样本银行完成人工数值核对？

