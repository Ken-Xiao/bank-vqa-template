# BenchmarkIQ 分层链路契约

## 1. 总原则

前台、AI 解读和报告导出必须共享同一套事实包。任何页面不得绕过 Ready 数据质量状态直接把 `null` 或 `暂无` 当成可解释事实。

## 2. 数据层

输入为原主数据、Tushare、年报抓取明细。输出为 `data_ready.js`、`ready_record_wide.*`、`ready_metric_quality.*`。

字段契约：

| 字段 | 含义 |
| --- | --- |
| bank | 标准银行名 |
| year | 会计年度 |
| metric | 标准指标代码 |
| value | Ready 后的可用值 |
| selectedSource | main / tushare / tushare_market / annual_report_scraped |
| status | available / source_missing / scraped_available_not_fieldized / calculation_input_missing / peer_insufficient / source_conflict_review |
| missingReason | 面向业务的缺失原因 |

## 3. 计算层

计算层只使用 `status=available` 且有实际值的指标生成证据。待字段化、三源缺失、计算输入不足只能进入 `boundaryFacts`，不能进入专题评分、AI 引用和报告核心证据。

## 4. 显示层

显示层读取 `layeredFactModel()`。核心证据、数据边界、口径风险、引用指标必须分区显示。

## 5. 报告层

报告层读取 `reportDeliveryModel()`，并在 `sections[].blocks[]` 中保留 factPackId、citationMetricKeys、dataWarnings，确保 HTML/PDF/PPTX 一致。

## 6. 验收

同一目标银行、年份、对标组下，Portal 专题页、AI 解读、正式报告和 Data & Validation 展示的可用证据数量必须一致。
