# 数据质量校验报告

- 数据源：`全行业银行综合分析2020-2025（含PB） (2).xlsx`
- 最新年份：2025
- 银行数量：57
- 指标数量：65
- 错误数量：0
- 警告数量：1

## 最新年份关键指标非空率

| 指标 | 非空率 |
| --- | ---: |
| roa | 96.5% |
| coreRevenueGrowth | 96.5% |
| nim | 100.0% |
| feeAssetRatio | 96.5% |
| npl | 100.0% |
| overdueNplDeviation | 100.0% |
| hiddenNplExposure | 100.0% |
| provisionCoverage | 100.0% |
| cet1Buffer | 100.0% |
| carBuffer | 100.0% |
| rwaDensity | 96.5% |
| liquidityCoverageRatio | 98.2% |
| pb | 100.0% |

## 问题样例

| 级别 | 类型 | 银行 | 年份 | 指标 | 说明 |
| --- | --- | --- | ---: | --- | --- |
| warning | range | 西安 | 2024 | liquidityCoverageRatio | liquidityCoverageRatio=1110.87 超出建议区间 [0, 1000] |
