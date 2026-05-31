# Sprint 4 机制归因工作台记录

更新时间：2026-05-31

## 已完成 V1

1. 统一机制归因 Fact Pack
   - 新增 `buildMechanismFactPackObject()`，把现有 DuPont、净利润归因、NIM 归因和多基准线收敛到同一内容树。
   - 每个模块统一输出目标银行、年份、对标组、指标/因子、目标值、对标值、差距、贡献、判断和口径风险。
   - 新增 `exportMechanismFactPackRows()`，支持直接进入 Excel 数据底稿。

2. DuPont 三级分解接入
   - 复用 `dupontBreakdown()`，输出 ROE、ROA、权益乘数、利息净收入/资产、手续费收入/资产、费用/资产、拨备及其他/资产等节点。
   - 模块标题自动提取主导驱动因子和贡献占比，用于后续报告页标题和 PPTX 页面。

3. 净利润归因瀑布接入
   - 复用 `netProfitAttribution()`，输出规模、息差、中收、成本、拨备及税费、其他等驱动。
   - 区分正贡献和拖累项，避免只陈述净利润同比变化。

4. NIM 归因与多基准线接入
   - 复用 `gapAttributionEngine("nim")`，并补充净息差、资产收益率、负债成本和定期存款占比底层指标。
   - 复用 `benchmarkLinesForMetric()`，为 ROA、ROE、NIM、风险、资本、估值等核心指标输出均值、中位数、P25/P75、类型/全样本和监管线。

5. 数据底稿联动
   - 数据底稿新增“机制归因事实包”表。
   - “结构化事实包”也合并纳入机制归因行，方便统一抽取报告证据。

6. 正式报告机制归因章节
   - 正式报告新增“机制归因总览”章节，位置前置在关键指标看板和专题深钻之前。
   - 章节内以四张机制卡展示 DuPont、净利润归因瀑布、NIM 归因和多基准线。
   - 每行展示目标值、基准、差距、读法和 L1-L4 口径风险，避免专题页只复述指标。

7. 专题页机制归因侧栏
   - 专题工作台新增“机制归因”侧栏，把 profit/nim/risk/capital/valuation 等专题映射到对应机制模块。
   - NIM 专题读取 NIM 归因和多基准线；盈利专题读取 DuPont 和净利润归因；资本和估值专题读取 DuPont 和多基准线。
   - 专题导出同步输出“机制归因”行，保证页面证据和 Excel 底稿一致。

8. PPTX 内容提取链
   - 新增 `pptxMechanismSlideRows()`，把 DuPont、净利润归因、NIM归因和多基准线整理为 PPTX 可读取的机制行。
   - PPTX 正式报告文本抽取已识别 `formal-mechanism-card` 和机制归因表格行，避免机制章节导出后只剩标题。
   - 新增 `addMechanismAttributionSlide()`，正式报告机制归因章节已进入 PPTX 四象限专用版式。
   - 新增净利润归因条形瀑布、多基准线横轴图和 NIM 四段式桥接卡，机制归因页不再只是文字列表。

9. HTML 正式报告机制图表
   - 正式报告机制归因章节新增净利润归因条形瀑布、多基准线横轴图和 NIM 四段式桥接卡。
   - 多基准线图同步展示样本 N：对标组N、类型N、全样本N。
   - 机制归因章节在 HTML 与 PPTX 中共享同一套 Fact Pack 口径，减少报告和汇报稿之间的解释偏差。

10. 核心图表层与专题页图表
   - 新增 `benchmarkLineChart()`，普通核心图表层可按 `data-chart="benchmarkLine"` 渲染多基准线。
   - 息差专题页新增“净息差多基准线”核心图表卡，展示目标银行、对标组、类型均值、全样本和样本 N。
   - 专题工作台新增 `topicMechanismChartPanelHtml()`，盈利专题展示净利润归因瀑布，NIM/存贷专题展示多基准线图。

## 与改进计划对标

| 计划项 | 当前状态 | 说明 |
|---|---|---|
| P1-1 DuPont 三级分解联动对标 | 已落地报告 V1 | 已有统一 Fact Pack，并进入正式报告机制归因章节。 |
| P1-2 净利润 YoY 归因瀑布 | 已落地产品 V1 | 已输出瀑布驱动项和正负贡献，并进入正式报告和盈利专题工作台。 |
| P1-3 多基准线图表体系 | 已落地产品 V1 | 已输出多基准线数据，并进入正式报告、PPTX、核心图表层和 NIM/存贷专题。 |
| NIM 归因 | 已落地报告 V1 | 已接入差距归因和底层息差指标，并形成报告章节。 |
| 专题页机制归因侧栏 | 已落地 V1 | 专题页和专题导出已读取统一机制归因 Fact Pack。 |
| PPTX 机制归因内容链 | 已落地 V1 | PPTX 导出可提取机制归因卡片和表格行，并有机制归因专用版式、瀑布/基准线/NIM桥轻量图形。 |
| HTML 机制归因图表 | 已落地 V1 | 正式报告已展示瀑布、基准线、NIM桥和样本 N。 |
| 核心图表层机制图表 | 已落地 V1 | `main-dynamic-chart` 已支持多基准线，专题页已新增净息差多基准线卡。 |

## 验证

- `node tests/sprint4_mechanism_fact_pack.test.js`
- `node tests/sprint4_formal_mechanism_report.test.js`
- `node tests/sprint4_topic_mechanism_panel.test.js`
- `node tests/sprint_cross_upgrade_contract.test.js`
- `node tests/sprint1_pptx_mechanism_layout.test.js`
- `node tests/sprint4_html_mechanism_charts.test.js`
- `node tests/sprint4_core_topic_charts.test.js`

## 待补

- 将多基准线继续扩展到 ROA、ROE、PB、风险、资本等更多核心指标，而不仅限于 NIM/PB 场景。
- 将专题页图表进一步做成可切换指标和可展开样本明细。
