# BenchmarkIQ 银行 VQA 前后端数据对接说明

本文档面向后端数据仓库、清洗和 API 对接同事，用于说明当前前端产品的功能边界、数据契约、字段口径、建议 API 形态和交付验收标准。

当前产品是一个静态前端分析模板，核心目标是把银行年报与同业数据转化为“经营对标、价值质量诊断、专题深钻、正式报告和 PPTX 交付物”。后端下一步要承接的重点不是只提供明细表，而是提供可追溯、可复算、可解释、可持续更新的银行经营分析数据底座。

## 1. 产品功能概览

### 1.1 入口和银行选择

用户进入系统后先选择目标银行、对标银行、分析年份和报告版本。

当前前端已经支持：

- 按银行类型筛选：国有大行、股份制银行、城市商业银行、农村商业银行等。
- 城农商进一步按区域筛选：华东、华南、华中、华北、西南、西北、东北等。
- 目标银行选择后自动推荐对标银行。
- 对标银行用于后续所有同业分位、差距、偏离、专题深钻和导出报告。
- 银行主数据需要包含银行简称、银行类型、区域和别名，避免“苏农”“苏州农商行”等名称不一致导致匹配失败。

后端需要重点保证：

- `bank` 是前端展示与事实表关联的稳定主键之一。
- `type` 和 `region` 必须和前端枚举保持一致。
- 银行别名需要在银行主数据中统一维护，前端不应长期依赖硬编码别名。

### 1.2 30 秒诊断

该板块用于给董事会或行长快速判断目标银行的核心问题。

主要内容包括：

- 价值质量总览：ROE、ROA、NIM、不良率、拨备覆盖率、核心一级资本充足率、市净率等。
- 诊断结论：把目标银行放到同业组中，说明优势、短板和需要追问的经营问题。
- 董事会议题：自动生成 3 个左右管理层需要讨论的问题。
- SPARC 或红黄绿判断：把盈利、结构、风险、资本、估值等维度转化为可视化状态。

依赖数据包括：

- 目标银行当年指标。
- 对标银行当年指标。
- 目标银行上一年指标，用于同比变化。
- 指标方向配置，例如 ROE 越高越好、不良率越低越好、市净率需结合经营质量解释。

### 1.3 同业位置和差距分析

该板块回答“目标银行在同类银行里处于什么位置”。

主要内容包括：

- 同业分位：目标银行相对对标组的排名、分位数和差距。
- 热力矩阵：按照盈利质量、息差负债、风险拨备、资本估值等维度展示强弱。
- 关键偏离：识别目标银行与同业中位数、最佳实践、历史水平之间差异最大的指标。
- 解释性图表：不只展示波动大小，还要解释可能来自规模、息差、风险成本、资产结构或资本消耗。

后端需要提供或支持前端计算：

- 对标组指标分布。
- 同业均值、中位数、四分位、最佳值、最弱值。
- 同比变化和同业变化的交叉对比。

### 1.4 Top Changes & Deviations 异动和偏离

该板块用于识别“哪些指标变化最大、偏离最大、最值得管理层关注”。

当前前端希望该板块进一步从文本列表升级为图表化解释：

- 变化雷达：目标银行同比变化最大的指标。
- 偏离图：目标银行相对对标组中位数偏离最大的指标。
- 可能原因：把异动关联到财务驱动项，例如净利润下滑可能来自营收、成本、拨备、税费；NIM 变化可能来自生息资产收益率、付息负债成本、存款结构。
- 管理含义：说明该偏离对经营质量、资本市场估值或下一步经营动作的影响。

后端建议沉淀一张指标归因规则表，避免前端长期硬编码“哪个指标由哪些驱动项解释”。

### 1.5 PB 估值分析

该板块回答“目标银行的市净率折价是市场错杀，还是经营质量折价”。

主要内容包括：

- 当前 PB 与同业 PB 中位数、历史 PB 变化对比。
- ROE、资产质量、资本充足率、中收能力、NIM 等因素对 PB 的解释。
- 理论 PB 或 DDM 近似框架，用于判断估值是否偏离基本面。
- PB 归因：市净率折价可能来自盈利能力不足、风险确认压力、资本使用效率偏低、业务结构单一、市场流动性等。

依赖数据包括：

- `pb`、`pbMid`、`pbChange`。
- `roe`、`roa`、`nim`、`npl`、`provisionCoverage`、`cet1`、`rwaDensity`。
- 后续可接入市值、股价、每股净资产、股息率、市场指数、银行板块指数等资本市场字段。

### 1.6 专题深钻

专题板块面向更细的经营问题，目前主要包括：

- 盈利质量：营收、净利息收入、中收、核心收入、费用、拨备前利润、净利润。
- 息差负债：NIM、生息资产收益率、付息负债成本、存款结构、活期存款占比、定期存款占比。
- 风险拨备：不良率、逾期率、关注率、逾期不良偏离、隐含问题资产、拨备覆盖率。
- 零售风险：按揭、消费贷、经营贷等零售贷款结构和不良率。
- 存贷深钻：贷款占资产、存款占负债、公司/个人存款、活期/定期存款结构。
- 资本效率：CET1、资本缓冲、估算 RWA、RWA 密度、RWA 增速与利润增速差。
- 投资资产：债券、基金、信托资管、投资资产占总资产比例。
- 现金利润：经营现金流、现金利润比。
- PB 估值：估值水平、估值变化、估值驱动项。

每个专题都不应只输出“方法描述”，而要围绕目标银行生成有针对性的咨询表达：

- 先说管理结论。
- 再说证据指标。
- 再解释可能原因。
- 最后给出行动建议或需要追问的问题。

### 1.7 数据治理和数据工作台

该板块用于让业务和开发团队知道数据是否完整、是否可用、哪里需要补数。

当前前端已经读取：

- `data_governance/metric_dictionary.json`：指标字典，当前 65 个指标。
- `data_governance/field_coverage_matrix.json`：原始字段覆盖矩阵，当前 257 个字段。
- `data_governance/data_quality_issues.json`：数据质量问题。
- `data_governance/data_quality_rules.json`：数据质量规则。

后端需要逐步把这些静态文件升级为可查询的数据治理 API。

### 1.8 正式报告、PDF 和 PPTX

正式交付物包括：

- HTML 正式报告：当前由前端根据页面事实包生成。
- PDF：当前主要通过浏览器打印或导出 HTML 的方式形成。
- PPTX：当前由前端抽取正式报告章节并生成 RSM consulting 风格的咨询汇报页。
- 数据底稿：导出选定银行或全量银行指标、指标字典、字段覆盖、质量问题、结构化事实包。

后端不一定需要直接生成所有交付物，但需要提供稳定的事实包和图表数据，使 HTML、PDF、PPTX 三条链路使用同一套数据。

### 1.9 AI 评论和自然语言生成

当前前端已有本地规则化语言生成，也预留 LLM 评论接口。

AI 生成不能直接“自由发挥”，必须基于事实包：

- 输入目标银行、年份、对标组和指标事实。
- 输入语言纪律和禁用表达。
- 输出每段评论时绑定引用指标。
- 返回 warnings，说明哪些段落缺少数据支撑。

后端如承接 LLM，应把事实包、提示词版本、模型版本、生成时间和引用指标一起落库，方便审计。

## 2. 当前前端数据契约

### 2.1 静态主数据入口

当前前端通过 `data.js` 注入全量数据：

```javascript
window.VQA_DATA = {
  source: "全行业银行综合分析2020-2025（含PB） (2).xlsx",
  years: [2020, 2021, 2022, 2023, 2024, 2025],
  aliases: {},
  banks: [],
  records: []
};
```

其中：

- `source`：本次数据来源说明。
- `years`：可选年份。
- `aliases`：银行别名映射，建议后端主数据维护。
- `banks`：银行清单。
- `records`：银行年度宽表，一行代表一家银行某一年。

### 2.2 banks 字段

```json
{
  "bank": "上海农商行",
  "type": "农村商业银行",
  "region": "华东"
}
```

字段说明：

| 字段 | 类型 | 说明 | 是否必填 |
| --- | --- | --- | --- |
| `bank` | string | 银行展示名，也是当前事实表关联键 | 是 |
| `type` | string | 银行类型，例如国有大行、股份制银行、城市商业银行、农村商业银行 | 是 |
| `region` | string | 区域，例如全国、华东、华南等 | 是 |

### 2.3 records 主键

`records` 当前使用宽表结构，主键为：

```text
bank + year
```

建议后端内部使用稳定的 `bank_id + fiscal_year`，但对前端输出时仍保留 `bank` 和 `year`，以兼容当前页面。

### 2.4 当前规模

当前静态数据规模：

| 项目 | 当前值 |
| --- | ---: |
| 年份 | 2020-2025 |
| 银行数量 | 57 |
| 银行年度记录 | 342 |
| 指标字典 | 65 个指标 |
| 原始字段覆盖矩阵 | 257 个字段 |

## 3. 字段口径和单位约定

### 3.1 基础维度字段

| 字段 | 类型 | 口径 |
| --- | --- | --- |
| `bank` | string | 银行简称，需与银行主数据一致 |
| `type` | string | 银行类型 |
| `region` | string | 所属区域 |
| `year` | number | 财年，当前为自然年 |

### 3.2 利润表和盈利字段

| 字段 | 单位 | 口径 |
| --- | --- | --- |
| `revenue` | 万元 | 营业收入 |
| `netInterestIncome` | 万元 | 利息净收入 |
| `feeIncome` | 万元 | 手续费及佣金净收入 |
| `revenueGrowth` | % | 营业收入同比增速 |
| `netProfit` | 万元 | 净利润 |
| `netProfitGrowth` | % | 净利润同比增速 |
| `ppop` | 万元 | 拨备前利润 |
| `ppopGrowth` | % | 拨备前利润同比增速 |
| `coreRevenue` | 万元 | 核心收入，当前一般为利息净收入加手续费及佣金净收入 |
| `coreRevenueGrowth` | % | 核心收入同比增速 |
| `interestIncome` | 万元 | 利息收入 |
| `interestExpense` | 万元 | 利息支出 |
| `adminExpense` | 万元 | 管理费用 |
| `incomeTax` | 万元 | 所得税 |
| `operatingCashFlow` | 万元 | 经营活动现金流 |

### 3.3 盈利质量和结构字段

| 字段 | 单位 | 口径 |
| --- | --- | --- |
| `roe` | % | 加权或披露口径净资产收益率，以源表为准 |
| `roa` | % | 平均总资产收益率，以源表为准 |
| `nim` | % | 净息差 |
| `costIncomeRatio` | % | 成本收入比 |
| `nonInterestShare` | % | 非息收入占比 |
| `trueCoreNonInterest` | % | 核心非息占比，当前主要使用手续费及佣金净收入相关口径 |
| `volatileIncomeShare` | % | 波动性收入占比，部分银行可能为空 |
| `feeAssetRatio` | % | 手续费及佣金净收入 / 总资产 |
| `netInterestRevenueShare` | % | 利息净收入 / 营业收入 |
| `feeRevenueShare` | % | 手续费及佣金净收入 / 营业收入 |
| `coreRevenueShare` | % | 核心收入 / 营业收入 |
| `adminAssetRatio` | % | 管理费用 / 总资产 |
| `cashProfitRatio` | % | 经营现金流 / 净利润 |
| `profitPpopGap` | pct / % | 净利润与拨备前利润变化差，用于识别拨备、税费等利润释放因素 |

### 3.4 资产负债和规模字段

| 字段 | 单位 | 口径 |
| --- | --- | --- |
| `assets` | 万元 | 总资产 |
| `liabilities` | 万元 | 总负债 |
| `equity` | 万元 | 所有者权益 |
| `loans` | 万元 | 发放贷款和垫款 |
| `deposits` | 万元 | 吸收存款 |
| `earningAssets` | 万元 | 生息资产 |
| `interestLiabilities` | 万元 | 付息负债 |
| `loanAssetRatio` | % | 贷款 / 总资产 |
| `depositLiabilityRatio` | % | 存款 / 总负债 |
| `assetGrowth` | % | 总资产同比增速 |
| `assetsChange` | 万元 | 总资产同比增量 |

### 3.5 息差和存款结构字段

| 字段 | 单位 | 口径 |
| --- | --- | --- |
| `earningAssetYield` | % | 生息资产收益率 |
| `interestLiabilityCost` | % | 付息负债成本率 |
| `nimGapPoint` | pct | 披露或计算口径的息差缺口 |
| `nimGapPointComputed` | pct | 系统计算的生息收益率减付息成本率 |
| `nimGapBp` | bp | 息差缺口，基点口径 |
| `nimGapSource` | string | 息差缺口来源说明 |
| `realLoanDepositSpread` | pct | 贷款存款利差，若底表缺失可为空 |
| `demandDepositShare` | % | 活期存款占比 |
| `timeDepositShare` | % | 定期存款占比 |
| `corporateDeposit` | 万元 | 公司存款 |
| `corporateTimeDeposit` | 万元 | 公司定期存款 |
| `corporateDemandDeposit` | 万元 | 公司活期存款 |
| `personalDeposit` | 万元 | 个人存款 |
| `personalTimeDeposit` | 万元 | 个人定期存款 |
| `personalDemandDeposit` | 万元 | 个人活期存款 |
| `corporateDepositShare` | % | 公司存款 / 总存款 |
| `personalDepositShare` | % | 个人存款 / 总存款 |
| `corporateDemandDepositShare` | % | 公司活期存款 / 总存款 |
| `personalDemandDepositShare` | % | 个人活期存款 / 总存款 |

### 3.6 风险和拨备字段

| 字段 | 单位 | 口径 |
| --- | --- | --- |
| `npl` | % | 不良贷款率 |
| `provisionCoverage` | % | 拨备覆盖率 |
| `overdueRatio` | % | 逾期贷款率 |
| `specialMentionRatio` | % | 关注类贷款率 |
| `overdueNplDeviation` | 倍 / ratio | 逾期贷款率与不良贷款率偏离，具体公式以指标字典为准 |
| `hiddenNplExposure` | % | 隐含问题资产暴露，具体公式以指标字典为准 |
| `corporateLoanNpl` | % | 公司贷款不良率 |
| `personalLoanNpl` | % | 个人贷款不良率 |
| `billDiscountNpl` | % | 票据贴现不良率 |
| `housingLoanShare` | % | 按揭贷款占比 |
| `consumerLoanShare` | % | 消费贷款占比 |
| `businessLoanShare` | % | 经营贷款占比 |
| `housingLoanNpl` | % | 按揭贷款不良率 |
| `consumerLoanNpl` | % | 消费贷款不良率 |
| `businessLoanNpl` | % | 经营贷款不良率 |
| `retailRiskMax` | % | 零售子类风险最高值 |
| `retailRiskSpread` | pct | 零售子类不良率分化程度 |

### 3.7 资本、RWA 和流动性字段

| 字段 | 单位 | 口径 |
| --- | --- | --- |
| `cet1` | % | 核心一级资本充足率 |
| `cet1Buffer` | bp | 核心一级资本充足率相对监管底线或内部阈值的缓冲 |
| `carBuffer` | bp | 资本充足率缓冲 |
| `estimatedRwa` | 万元 | 估算风险加权资产 |
| `estimatedRwaChange` | 万元 | 估算 RWA 同比增量 |
| `estimatedRwaGrowth` | % | 估算 RWA 同比增速 |
| `rwaDensity` | % | 估算 RWA / 总资产 |
| `liquidityRatio` | % | 流动性比例 |
| `liquidityCoverageRatio` | % | 流动性覆盖率 |
| `rwaProfitGrowthGap` | pct | RWA 增速与利润增速差 |
| `rwaAssetGrowthGap` | pct | RWA 增速与资产增速差 |

### 3.8 投资资产和估值字段

| 字段 | 单位 | 口径 |
| --- | --- | --- |
| `bondInvestment` | 万元 | 债券投资 |
| `fundInvestment` | 万元 | 基金投资 |
| `trustWmInvestment` | 万元 | 信托、资管或理财相关投资 |
| `bondAssetRatio` | % | 债券投资 / 总资产 |
| `fundAssetRatio` | % | 基金投资 / 总资产 |
| `trustWmAssetRatio` | % | 信托资管投资 / 总资产 |
| `investmentAssetRatio` | % | 债券、基金、信托资管投资合计 / 总资产 |
| `basicEps` | 元 / 股 | 基本每股收益 |
| `pb` | x | 市净率 |
| `pbMid` | x | 同业或历史 PB 中位参照 |
| `pbChange` | x / pct | PB 变化，当前以前端字段为准 |

### 3.9 来源和质量字段

| 字段 | 类型 | 口径 |
| --- | --- | --- |
| `earningAssetsSource` | string | 生息资产数据来源 |
| `earningAssetYieldSource` | string | 生息资产收益率来源 |
| `interestLiabilityCostSource` | string | 付息负债成本率来源 |

建议后端对每个指标都维护：

- `source_system`：来源系统或文件。
- `source_table`：来源表。
- `source_field`：来源字段。
- `formula`：派生公式。
- `quality_status`：已接入、部分接入、待补数、需复核。
- `missing_policy`：缺失处理规则。

## 4. 计算口径建议

以下是前端常用派生指标，后端可以在数据集市层预计算，也可以提供原始字段让前端计算。为保证报告一致性，建议后端沉淀到指标字典。

| 指标 | 建议公式 |
| --- | --- |
| `coreRevenue` | `netInterestIncome + feeIncome` |
| `revenueGrowth` | `revenue / prior_year_revenue - 1` |
| `netProfitGrowth` | `netProfit / prior_year_netProfit - 1` |
| `ppopGrowth` | `ppop / prior_year_ppop - 1` |
| `coreRevenueGrowth` | `coreRevenue / prior_year_coreRevenue - 1` |
| `feeAssetRatio` | `feeIncome / assets` |
| `netInterestRevenueShare` | `netInterestIncome / revenue` |
| `feeRevenueShare` | `feeIncome / revenue` |
| `coreRevenueShare` | `coreRevenue / revenue` |
| `loanAssetRatio` | `loans / assets` |
| `depositLiabilityRatio` | `deposits / liabilities` |
| `adminAssetRatio` | `adminExpense / assets` |
| `cashProfitRatio` | `operatingCashFlow / netProfit` |
| `investmentAssetRatio` | `(bondInvestment + fundInvestment + trustWmInvestment) / assets` |
| `corporateDepositShare` | `corporateDeposit / deposits` |
| `personalDepositShare` | `personalDeposit / deposits` |
| `timeDepositShare` | `(corporateTimeDeposit + personalTimeDeposit) / deposits` |
| `nimGapPointComputed` | `earningAssetYield - interestLiabilityCost` |
| `nimGapBp` | `nimGapPointComputed * 100` |
| `rwaDensity` | `estimatedRwa / assets` |
| `rwaProfitGrowthGap` | `estimatedRwaGrowth - netProfitGrowth` |
| `rwaAssetGrowthGap` | `estimatedRwaGrowth - assetGrowth` |

注意：

- 当前前端百分比字段按“展示百分数”存储，例如 `nim = 1.41` 表示 1.41%，不是 0.0141。
- 金额字段当前延续源表单位，多数为万元。后端需要在 `metric_dictionary` 中显式标注单位。
- BP 字段按基点存储，例如 `cet1Buffer = 378` 表示 378bp。
- 数值缺失使用 `null`，不要用空字符串、`"--"` 或 `"N/A"`。
- 派生指标如果分母为 0 或缺失，应返回 `null`，并在质量说明中标记原因。
- 所有派生公式以 `metric_dictionary` 中最终版本为准，前端只做展示和轻量计算。

## 5. 建议数仓模型

### 5.1 ODS 原始层

保留所有来源表原始字段，不做强业务转换。

建议表：

- `ods_bank_annual_report_raw`
- `ods_bank_pb_market_raw`
- `ods_bank_financial_statement_raw`
- `ods_bank_asset_quality_raw`
- `ods_bank_deposit_loan_raw`

关键要求：

- 保留 `source_file`、`sheet_name`、`row_no`、`import_batch_id`、`imported_at`。
- 原始银行名称不要覆盖，另建标准化字段。
- 原始数值和清洗后数值都要保留。

### 5.2 DWD 明细标准层

建议表：

```text
dim_bank
dim_metric
fact_bank_metric_annual
fact_bank_market_valuation_annual
dq_data_quality_issue
dq_field_coverage
```

`dim_bank` 建议字段：

| 字段 | 说明 |
| --- | --- |
| `bank_id` | 稳定银行 ID |
| `bank_name` | 标准银行简称 |
| `bank_full_name` | 银行全称 |
| `bank_type` | 银行类型 |
| `region` | 所属区域 |
| `aliases` | 别名列表 |
| `listed_status` | 是否上市 |
| `ticker` | 股票代码，后续 PB 和市值分析使用 |

`dim_metric` 建议字段：

| 字段 | 说明 |
| --- | --- |
| `metric_code` | 指标编码，需与前端字段一致 |
| `metric_name` | 中文名称 |
| `theme` | 所属主题 |
| `unit` | 单位 |
| `direction` | 指标方向，higher_better / lower_better / contextual |
| `source_group` | 来源分组 |
| `source_field` | 来源字段 |
| `formula` | 计算公式 |
| `is_derived` | 是否派生 |
| `is_critical` | 是否核心指标 |
| `missing_policy` | 缺失处理 |

`fact_bank_metric_annual` 建议字段：

| 字段 | 说明 |
| --- | --- |
| `bank_id` | 银行 ID |
| `fiscal_year` | 财年 |
| `metric_code` | 指标编码 |
| `metric_value` | 标准化指标值 |
| `raw_value` | 原始值 |
| `unit` | 单位 |
| `source_system` | 来源 |
| `quality_status` | 数据质量状态 |
| `updated_at` | 更新时间 |

### 5.3 DWM / ADS 前端宽表层

前端短期最需要一张兼容当前 `records[]` 的宽表：

```text
mart_bank_vqa_record_wide
```

该表每行是一家银行某一年，字段与 `records` 保持一致。后端 API 或静态构建脚本可以从这张表生成当前 `data.js`。

建议同时保留长表和宽表：

- 长表适合指标治理、补数、审计和扩展。
- 宽表适合前端加载、图表渲染和快速导出。

## 6. 当前静态文件和未来 API 映射

### 6.1 当前静态文件

| 文件 | 用途 |
| --- | --- |
| `data.js` | 前端全量银行年度宽表 |
| `analysis_rules.json` | 指标阈值、专题规则、估值假设和分析规则 |
| `data_governance/metric_dictionary.json` | 指标字典 |
| `data_governance/field_coverage_matrix.json` | 原始字段覆盖矩阵 |
| `data_governance/data_quality_issues.json` | 数据质量问题 |
| `data_governance/data_quality_rules.json` | 数据质量规则 |
| `data_governance/annual_report_scraped_database.csv/json` | 年报抓取去重明细库，保留原始字段、标准银行名、表类型、页码、来源路径和重复来源 |
| `data_governance/annual_report_scraped_bank_index.csv` | 年报抓取银行级索引，展示每家银行/年份覆盖的表类型和明细行数 |
| `data_governance/annual_report_scraped_source_tables.csv` | 年报抓取表类型索引，展示各类抽取表文件数和去重后行数 |
| `config/language_discipline.json` | 咨询语言纪律 |
| `config/prompts.json` | AI 提示词配置 |
| `config/ai_provider.json` | AI 服务配置 |

### 6.2 建议 API 总览

后端可以先实现只读 API，逐步替代静态文件。

| API | 方法 | 用途 |
| --- | --- | --- |
| `/api/v1/banks` | GET | 查询银行主数据 |
| `/api/v1/records` | GET | 查询银行年度宽表 |
| `/api/v1/metrics/dictionary` | GET | 查询指标字典 |
| `/api/v1/data-quality/field-coverage` | GET | 查询字段覆盖矩阵 |
| `/api/v1/data-quality/issues` | GET | 查询数据质量问题 |
| `/api/v1/analysis/rules` | GET | 查询分析规则 |
| `/api/v1/analysis/fact-pack` | POST | 生成目标银行分析事实包 |
| `/api/v1/ai/commentary` | POST | 生成可审计 AI 评论 |
| `/api/v1/export/report-html` | POST | 可选，后端生成正式 HTML |
| `/api/v1/export/pptx` | POST | 可选，后端生成 PPTX |
| `/api/v1/export/xlsx` | POST | 可选，后端生成数据底稿 |

### 6.3 银行主数据 API

请求：

```http
GET /api/v1/banks?type=农村商业银行&region=华东&q=苏州
```

响应：

```json
{
  "dataVersion": "2026-06-01",
  "banks": [
    {
      "bankId": "BKSZRCB",
      "bank": "苏州农商行",
      "fullName": "江苏苏州农村商业银行股份有限公司",
      "type": "农村商业银行",
      "region": "华东",
      "aliases": ["苏农银行", "苏农", "苏州农商"]
    }
  ]
}
```

### 6.4 银行年度宽表 API

请求：

```http
GET /api/v1/records?years=2024,2025&banks=苏州农商行,常熟银行,张家港行
```

响应：

```json
{
  "dataVersion": "2026-06-01",
  "unitPolicy": "amount_fields_in_10k_rmb; percent_fields_as_display_percent",
  "records": [
    {
      "bank": "苏州农商行",
      "type": "农村商业银行",
      "region": "华东",
      "year": 2025,
      "revenue": 1234567,
      "netProfit": 234567,
      "roe": 10.2,
      "nim": 1.55,
      "npl": 0.91,
      "provisionCoverage": 420.5,
      "cet1": 12.3,
      "pb": 0.62
    }
  ]
}
```

### 6.5 指标字典 API

请求：

```http
GET /api/v1/metrics/dictionary
```

响应：

```json
{
  "rulesVersion": "2026-06-01",
  "metrics": [
    {
      "metric_code": "nim",
      "metric_name": "净息差",
      "theme": "息差负债",
      "direction": "higher_better",
      "unit": "%",
      "source_group": "盈利能力",
      "source_field": "净息差",
      "formula": "源字段直取",
      "is_derived": false,
      "is_critical": true,
      "missing_policy": "保留空值，不用均值替代目标银行"
    }
  ]
}
```

### 6.6 字段覆盖 API

请求：

```http
GET /api/v1/data-quality/field-coverage
```

响应：

```json
{
  "dataVersion": "2026-06-01",
  "coverage": [
    {
      "source_group": "资产质量",
      "source_field": "不良贷款率",
      "status": "已接入",
      "priority": "高",
      "recommendation": "当前应用和治理字典已使用"
    }
  ]
}
```

### 6.7 分析事实包 API

该接口是后端和前端未来最重要的对接点。它不只是返回原始数值，而是返回“报告可直接使用的事实”。

请求：

```http
POST /api/v1/analysis/fact-pack
Content-Type: application/json
```

```json
{
  "target": "苏州农商行",
  "year": 2025,
  "peers": ["常熟银行", "张家港行", "无锡银行", "江阴银行"],
  "topics": ["profit", "nim", "risk", "capital", "valuation"],
  "reportVersion": "president"
}
```

响应建议：

```json
{
  "dataVersion": "2026-06-01",
  "target": "苏州农商行",
  "year": 2025,
  "peerSet": ["常熟银行", "张家港行", "无锡银行", "江阴银行"],
  "summary": {
    "headline": "盈利韧性尚可，但估值修复需要先解释息差和风险确认压力",
    "keyFindings": [
      {
        "topic": "nim",
        "metric": "nim",
        "targetValue": 1.55,
        "peerMedian": 1.68,
        "interpretation": "净息差低于对标组中位数，负债成本或资产收益率是优先追问项"
      }
    ]
  },
  "metrics": {},
  "peerStats": {},
  "deviations": [],
  "topicPacks": [],
  "qualityWarnings": []
}
```

### 6.8 AI 评论 API

请求：

```http
POST /api/v1/ai/commentary
Content-Type: application/json
```

```json
{
  "channel": "formal_report",
  "target": "苏州农商行",
  "year": 2025,
  "peers": ["常熟银行", "张家港行"],
  "facts": {
    "nim": 1.55,
    "peerMedianNim": 1.68,
    "npl": 0.91,
    "pb": 0.62
  },
  "guardrails": {
    "mustCiteMetrics": true,
    "avoidGenericLanguage": true,
    "languageStyle": "consulting_boardroom"
  }
}
```

响应：

```json
{
  "provider": "backend-llm",
  "model": "configured-model",
  "promptVersion": "2026-06-01",
  "commentary": "苏州农商行的估值修复不能只解释为板块 Beta，当前更需要回答净息差低于同业中位数后，负债成本和资产收益率哪一端形成主要拖累。",
  "citations": ["nim", "peerMedianNim", "pb"],
  "warnings": []
}
```

## 7. 前端接入要求

### 7.1 兼容路径

第一阶段建议后端继续生成当前静态文件：

```text
data.js
analysis_rules.json
data_governance/metric_dictionary.json
data_governance/field_coverage_matrix.json
data_governance/data_quality_issues.json
```

这样前端无需大规模改造即可切换数据源。

第二阶段再切换为 API：

- 页面初始化读取 `/api/v1/banks` 和 `/api/v1/records`。
- 数据工作台读取 `/api/v1/metrics/dictionary` 和 `/api/v1/data-quality/*`。
- 正式报告读取 `/api/v1/analysis/fact-pack`。
- AI 评论读取 `/api/v1/ai/commentary`。

### 7.2 版本和缓存

所有 API 建议返回：

- `dataVersion`：数据版本。
- `rulesVersion`：规则版本。
- `generatedAt`：生成时间。
- `source`：来源说明。

HTTP 层建议：

- 配置 CORS，允许前端所在域名访问。
- 对主数据和字典使用 `ETag`。
- 对分析事实包可以短缓存或不缓存。
- 数据更新后版本号必须变化，避免前端看到旧数据。

### 7.3 错误处理

建议统一错误格式：

```json
{
  "error": {
    "code": "MISSING_REQUIRED_METRIC",
    "message": "目标银行缺少净息差字段，无法生成息差专题。",
    "details": {
      "bank": "苏州农商行",
      "year": 2025,
      "metric": "nim"
    }
  }
}
```

常见错误码建议：

| 错误码 | 场景 |
| --- | --- |
| `BANK_NOT_FOUND` | 银行不存在或别名未匹配 |
| `YEAR_NOT_AVAILABLE` | 目标年份无数据 |
| `MISSING_REQUIRED_METRIC` | 核心指标缺失 |
| `PEER_SET_TOO_SMALL` | 对标银行数量不足 |
| `DATA_VERSION_EXPIRED` | 数据版本已过期 |
| `LLM_PROVIDER_UNAVAILABLE` | AI 服务不可用 |

## 8. 数据质量和验收标准

### 8.1 数据完整性

上线前至少验证：

- 每个 `bank + year` 唯一。
- 每个 `record` 必须有 `bank`、`type`、`region`、`year`。
- 每个银行必须出现在 `banks` 主数据中。
- 每个核心指标都能在 `metric_dictionary` 找到口径。
- 所有数值字段要么是 number，要么是 `null`。
- 百分比字段不能同时混用 1.5 和 0.015 两种口径。

### 8.2 指标一致性

建议抽样校验：

- `coreRevenue = netInterestIncome + feeIncome`。
- `coreRevenueShare = coreRevenue / revenue`。
- `loanAssetRatio = loans / assets`。
- `depositLiabilityRatio = deposits / liabilities`。
- `investmentAssetRatio = (bondInvestment + fundInvestment + trustWmInvestment) / assets`。
- 增速字段和上一年数据可复算。
- PB 字段和市场估值源数据一致。

### 8.3 前端回归验收

后端数据接入后，用以下场景验收：

- 选择“苏州农商行 + 2025 + 农商行对标组”可以完整生成报告。
- 银行选择页类型和区域筛选正常。
- 30 秒诊断不出现空白结论。
- 同业位置和 Top Deviations 可以显示目标值、同业中位数和解释。
- PB 估值页有 PB、ROE、风险、资本等证据指标。
- 专题页至少盈利、息差、风险、资本、估值五类可正常显示。
- 数据工作台可读取指标字典和字段覆盖矩阵。
- HTML、PDF、PPTX 导出使用同一套事实包。

## 9. 后端交付优先级

### P0：先让前端稳定吃数

- 生成兼容当前 `data.js` 的银行年度宽表。
- 生成 `metric_dictionary.json`。
- 生成 `field_coverage_matrix.json`。
- 保证银行名称、类型、区域、年份稳定。
- 保证核心字段单位和百分比口径一致。

### P1：补齐分析事实包

- 提供目标银行、对标组、同比、同业中位数、分位数。
- 提供异动和偏离的排序结果。
- 提供每个专题的关键证据字段。
- 提供质量 warnings。

### P2：治理和审计

- 数据质量问题可查询。
- 指标口径可版本化。
- 派生指标可追溯公式。
- AI 评论可绑定引用指标和提示词版本。

### P3：交付物服务化

- 后端生成或协助生成正式 HTML。
- 后端生成 PPTX 或提供图表图片和结构化页数据。
- 后端提供导出任务状态和下载链接。

## 10. 对接清单

后端交付前请确认：

- [ ] 银行主数据表已包含银行简称、全称、类型、区域、别名。
- [ ] 年度指标宽表可输出当前 `records[]` 所有字段。
- [ ] 指标字典包含字段编码、中文名、单位、公式、来源、缺失策略。
- [ ] 字段覆盖矩阵可以说明哪些原始字段已接入、待补数、需复核。
- [ ] 百分比、金额、BP、倍数字段单位已统一。
- [ ] 核心派生指标可以复算。
- [ ] API 返回 `dataVersion` 和 `rulesVersion`。
- [ ] 缺失值统一为 `null`。
- [ ] 对标组不足、指标缺失、年份缺失时有明确错误信息。
- [ ] 能用一个目标银行样例跑通选择、分析、报告、导出全流程。

## 11. 建议的第一轮接口联调样例

建议第一轮固定样例：

```json
{
  "target": "苏州农商行",
  "year": 2025,
  "peerTypes": ["农村商业银行"],
  "peerRegion": "华东",
  "reportVersion": "president"
}
```

联调目标：

- 前端能拿到目标银行记录。
- 前端能拿到推荐对标银行。
- 前端能拿到 2024 和 2025 两年数据，用于同比。
- 前端能拿到对标组 2025 数据，用于分位和偏离。
- 前端能生成正式报告事实包。
- 导出 HTML、PDF、PPTX 时不重新计算另一套口径。

## 12. 备注

当前前端仍保留一定量的本地计算和本地规则语言生成。后端接入后，建议采取“先兼容、再收敛”的方式：

1. 第一阶段由后端生成静态数据文件，前端逻辑保持不变。
2. 第二阶段由后端提供分析事实包，前端减少重复计算。
3. 第三阶段把 AI 评论、导出任务、数据治理审计逐步服务化。

这样可以降低一次性改造风险，也能让数据仓库、前端页面和正式交付物使用同一套指标口径。
