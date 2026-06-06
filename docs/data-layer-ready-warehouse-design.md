# Ready 数据层设计

生成日期：2026-06-05

## 1. 目标

Ready 数据层的目标是把三类数据来源整合成 Portal 可以直接读取、可以解释、可以复核的数据底座：

- 原主数据：保留 2020-2025 连续 bank-year 主表，是经营质量分析的历史底座。
- Tushare：补充标准三表、市场估值和行情字段，尤其是 PE、市值、股息率、换手率。
- 年报抓取明细：补充银行监管指标、附注明细、零售风险、IFRS9、重定价和流动性期限。

页面不应直接面对三源原始数据。三源进入系统后，应先经过标准化、校验、计算和质量标注，再生成 Ready 层。

## 2. 数据流

```text
三源输入
  原主数据 / Tushare / 年报抓取明细
        ↓
ODS 原始层
  保留原始名称、原始字段、原始单位、来源路径和页码
        ↓
标准化层
  银行标准名、指标标准名、单位、年份和字段映射
        ↓
校验层
  三源交叉校验、缺失识别、冲突识别、可信度评级
        ↓
计算层
  派生指标、对标均值、分位数、VQA 分数、专题事实包
        ↓
Ready 层
  Portal 宽表、专题明细、质量状态、报告事实包
```

## 3. 分层设计

| 层级 | 建议对象 | 作用 |
| --- | --- | --- |
| ODS 原始层 | `ods_main_bank_year_raw`、`ods_tushare_financial_raw`、`ods_tushare_market_raw`、`ods_annual_report_scraped_raw` | 保留证据，不覆盖、不推导 |
| 标准化层 | `dim_bank`、`dim_metric`、`map_source_metric`、`fact_metric_candidate` | 统一银行、指标、单位和来源字段 |
| 校验层 | `dq_metric_validation_result`、`dq_metric_conflict`、`dq_missing_reason` | 判断数据能否进入主报告 |
| 计算层 | `calc_bank_metric_annual`、`calc_peer_benchmark_annual`、`calc_vqa_score`、`calc_topic_fact_pack` | 生成经营质量判断所需事实 |
| Ready 层 | `mart_bank_vqa_record_wide`、`mart_bank_topic_fact_pack`、`mart_bank_data_quality` | 给 Portal、报告和导出模块直接读取 |

## 4. 来源优先级

不同指标不能使用同一套来源优先级。

| 指标类型 | 优先来源 | 说明 |
| --- | --- | --- |
| 核心三表 | 原主数据优先，Tushare 和年报抓取做校验 | 维持 2020-2025 连续性 |
| 市场估值 | Tushare 优先 | PE、市值、股息率、换手率更适合行情源 |
| PB | 原主数据优先，Tushare 或行情源校验 | PB 已是当前产品核心字段，短期不自动覆盖 |
| 监管指标 | 年报抓取优先校验，主数据保底 | NIM、不良率、拨备覆盖率、CET1、LCR |
| 零售风险 | 年报抓取优先 | 住房、消费、经营、信用卡贷款不良率 |
| IFRS9 / 重定价 / 流动性期限 | 年报抓取明细优先 | 更适合进入专题事实表 |
| 派生指标 | 计算层生成 | 例如手续费资产比、息差对冲缺口、零售风险剪刀差 |

## 5. 缺失原因口径

Ready 层不再只给页面一个笼统的“待补”。每个缺失或不可用字段都要带原因。

| 状态 | 含义 | 页面建议展示 |
| --- | --- | --- |
| `available` | Ready 层已有可用值 | 正常展示 |
| `source_missing` | 三源均未提供可用值 | 三源均缺 |
| `scraped_available_not_fieldized` | 年报明细已有相关行，但尚未稳定字段化 | 年报已抓取，待字段化 |
| `peer_insufficient` | 目标银行有值，但对标组缺口导致均值或分位不可算 | 对标组不足 |
| `calculation_input_missing` | 派生指标缺少输入字段 | 计算输入不足 |
| `source_conflict_review` | 多源差异超过阈值，需要人工复核 | 三源口径待复核 |

## 6. 第一版静态输出

第一版先不引入服务端数据库，用构建脚本生成静态 Ready 文件，兼容当前前端。

| 文件 | 作用 |
| --- | --- |
| `data_ready.js` | 前端可直接加载的 Ready sidecar |
| `data_governance/ready_record_wide.json` | Ready 宽表 JSON |
| `data_governance/ready_record_wide.csv` | Ready 宽表 CSV |
| `data_governance/ready_metric_quality.json` | 字段质量和缺失原因 |
| `data_governance/ready_metric_quality.csv` | 字段质量 CSV |

## 7. 第一版优先接入字段

第一版优先解决页面当前已经暴露的缺口：

- 别名：`瑞丰 -> 瑞丰农商行`，并保留 `瑞丰银行 -> 瑞丰农商行`。
- 市场估值：`peTtm`、`divYield`、`divYieldTtm`、`totalMarketValue`、`turnoverRate`。
- 监管指标：`nim`、`npl`、`provisionCoverage`、`cet1`、`liquidityCoverageRatio`、`liquidityRatio`、`loanDepositRatio`。
- 息差专题：`realLoanDepositSpread`、`earningAssetYield`、`interestLiabilityCost`。
- 零售风险：`housingLoanNpl`、`consumerLoanNpl`、`businessLoanNpl`、`creditCardLoanNpl`。
- 投资和非息明细：`tradAsset`、`debtInvestment`、`otherDebtInvestment`、`fairValueChgGain`、`fxGain`、`investIncome`、`otherNonInterestIncome`、`otherAssetImpairLoss`。

## 8. Portal 使用方式

短期前端继续读取 `data.js` 作为主表，新增读取 `data_ready.js` 作为增强 sidecar。页面展示时优先使用 Ready 层的质量状态解释“待补”原因；等 Ready 层稳定后，再把 `data.js` 改为由 Ready 宽表生成。

长期后端化时，Ready 层对应 API 为：

```text
GET /api/v1/ready/records
GET /api/v1/ready/metric-quality
POST /api/v1/analysis/fact-pack
```

