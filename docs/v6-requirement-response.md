# PRD v6.0 逐条改进应对

更新时间：2026-05-31

## 本轮改造原则

v6 的主线不是继续堆指标，而是把产品前 3 页变成董事会可讨论的材料。本轮优先落地低耦合且高价值的部分：董事会议题、张力开场、异动雷达、业务逻辑一致性、市值管理行动页、对标矩阵 YoY 维度和打印 CSS 基础设施。

## 逐项应对

| 需求 | 应对状态 | 本轮实现 | 文件 |
|---|---:|---|---|
| V6-01 Boardroom Discussion Generator | 已实现 | 自动生成 3 个董事会讨论问题，绑定估值、最弱维度、异动预警和证据指标。 | `js/27-v6-boardroom-engine.js`, `index.html`, `js/22-formal-report.js` |
| V6-02 Tension-First Opening | 已实现 | 新增反直觉张力句生成，执行摘要第一结论改为“表面现象 vs 深层信号”。 | `js/27-v6-boardroom-engine.js`, `js/08-report.js` |
| V6-03 Discussion Facilitation Cards | 部分实现 | 章节转场页底部改为“讨论引导”，带入 2 个董事会议题。 | `js/08-report.js` |
| V6-04 Anomaly Radar Panel | 已实现 | 异动雷达升级为纵向正/负异动、横向偏离 Top 5、纵横交叉标记。 | `js/27-v6-boardroom-engine.js`, `index.html` |
| V6-05 Trend-Cross-Peer Matrix | 已实现 | 正式报告对标矩阵增加 YoY 变化列和变化方向颜色。 | `js/22-formal-report.js`, `styles/app.css` |
| V6-06 Structural vs. Cyclical Tag | 已实现 | 异动雷达和报告章节用结构性/周期性标签显性展示。 | `js/27-v6-boardroom-engine.js` |
| V6-07 Business Logic Consistency Check | 已实现 | 新增业务逻辑告警：扩表+拨备下降、净利/PPoP背离、量价风险背离、定期化推升负债成本。 | `js/27-v6-boardroom-engine.js` |
| V6-08 CSS Design Token System | 部分实现 | 在 `:root` 增加 `--sp-*`、`--content-max`、`--chart-max`、`--card-radius`、z-index tokens。 | `styles/app.css` |
| V6-09 Three-Mode Layout | 部分实现 | 继续沿用现有 Setup/Analysis/Report Tab 机制，本轮未重构全站布局。 | 后续需系统性 CSS 清理 |
| V6-10 One-Judgement-Per-Section | 未完全实现 | 本轮新增模块采用一页一判断和可扫描卡片；旧模块暂未加折叠机制。 | 后续可在 overview 模块加 details/summary |
| V6-11 Inter-Section Navigation Strip | 部分实现 | 章节转场页增加讨论引导；尚未在每个分析板块底部加上一页/下一页按钮。 | `js/08-report.js` |
| V6-12 Single-Source Report Engine | 部分实现 | V6 内容进入 formal report 内容树，HTML/PDF/PPTX 可继承正式报告抽取逻辑。 | `js/22-formal-report.js` |
| V6-13 Print-Optimized CSS | 已实现基础版 | 新增 `styles/print.css`，A4、分页、表头重复、页脚机密声明。 | `styles/print.css`, `index.html` |
| V6-14 Unified Page Sequence | 部分实现 | 正式报告页序新增董事会议题、异动雷达、业务逻辑一致性、市值行动页。目录全量统一仍需后续同步。 | `js/22-formal-report.js` |
| V6-15 PPTX Vectorized Charts | 暂缓 | 未做 SVG→Pptx shape 转换，风险较高且需要单独验证。 | 后续专项 |
| V6-16 Metric Explorer | 暂缓 | 未新增数据探索器，避免扩散本轮范围。 | 后续数据 Tab 专项 |
| V6-17 Data Gap Alert on Report | 暂缓 | 本轮保留现有风险降级与 caveat，未加视觉标签。 | 后续接入数据完整性评分 |
| V6-18 Narrative Intensity Engine | 已实现基础版 | 新增基于 z-score 的 Level 1/2/3 语言强度函数，可供后续叙事模板调用。 | `js/27-v6-boardroom-engine.js` |
| V6-19 CEAM+ Narrative Template | 部分实现 | 张力开场承担 Challenge 角色；完整 Ch-C-E-A-M 模板尚未重写 `12-ai-narrative.js`。 | 后续语言引擎专项 |
| V6-20 Decision Funnel Architecture | 部分实现 | 总览前置董事会议题、价值创造、异动雷达和PB行动，形成 30秒/5分钟决策入口。 | `index.html`, `js/27-v6-boardroom-engine.js` |
| V6-21 DDM Theoretical PB | 已实现 | 已有 `theoreticalPB()`，本轮新增 `ddmTheoreticalPB()` 兼容函数。 | `js/26-v5-value-engine.js`, `js/27-v6-boardroom-engine.js` |
| V6-22 PB Improvement Roadmap | 已实现 | 复用 `pbDriverRanking()`，市值行动页和 Tornado 显示 PB 改善路径。 | `js/26-v5-value-engine.js`, `js/27-v6-boardroom-engine.js` |
| V6-23 Capital Market Action Page | 已实现 | 正式报告新增市值管理行动页，按 0-3、3-6、6-12 个月绑定 KPI 和 PB 影响。 | `js/27-v6-boardroom-engine.js`, `js/22-formal-report.js` |

## 本轮新增文件

- `js/27-v6-boardroom-engine.js`：董事会议题、张力开场、异动雷达、业务逻辑一致性、市值行动页。
- `styles/print.css`：正式报告打印基础样式。
- `docs/v6-requirement-response.md`：本逐项应对文档。

## 保留边界

PPTX 矢量化、Metric Explorer、全站折叠机制、完整 CEAM+ 改写属于较大范围改造。本轮先保证董事会入口和正式报告主线显著提升，后续可按专项推进。
