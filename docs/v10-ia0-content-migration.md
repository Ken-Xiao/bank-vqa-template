# v10 IA-0：现有模块 → 6+1 页面内容迁移清单

定稿：2026-06-03
对应 PRD：`next-improvement-plan-consolidated.md` PRD v10
设计文档：`docs/superpowers/specs/2026-06-03-portal-information-architecture-design.md`
样稿：`docs/design-mockups/portal-ia-v10-mockup.html`

## 一、目标信息架构（Recap）

6 个客户一等页面 + 1 个分析师页面：

| Page | 主问题 | 默认用户 |
|---|---|---|
| **0 Launch** | 本次分析谁、和谁比、按什么场景看？ | 全部 |
| **1 Executive Answer** | 当前最关键的经营质量判断是什么？ | 行领导、董办 |
| **2 Evidence Map** | 这个判断由哪些证据支撑？ | 董办、部门负责人 |
| **3 Topic Hub** | 哪些专题需要深钻？ | 部门负责人、分析师 |
| **4 Topic Detail** | 单个专题的原因、证据和行动是什么？ | 分析师 |
| **5 Report Studio** | 如何形成可交付材料？ | 董办、分析师 |
| **6 Data & Validation** | 数字来自哪里，口径是否可信？ | 分析师、后端 |

## 二、现有模块完整清单（从 `index.html` 抓取）

按当前 6 个 workspace tab 分组：

### overview Tab（总览）—— 14 个模块
| ID | 模块名 | line | 备注 |
|---|---|---:|---|
| `#sprintBaselinePanel` | 稳定基线检查 | 237 | client-internal |
| `#clientCommandCenter` | 客户任务台 | 245 | |
| `#v6DiscussionStrip` | V6 董事会议题 | 266 | |
| `#presidentSummaryPanel` | 行长版一页摘要 | 298 | data-overview-depth=primary |
| `#v5ValuePanel` | 价值创造与估值归因 | 317 | data-overview-depth=secondary |
| `#benchmarkV1Panel` | BenchmarkIQ V1 总览 | 341 | |
| `#ibEvidencePanel` | 投行级证据页 | 368 | |
| `#step2Content` | 诊断结论容器 | 404 | |
| ↳ `#step2SummarySection` | 30 秒总结 + KPI + 三董事会问题 | 415 | |
| ↳ `#step2PeerPosition` | 同业位置 SPARC | 425 | |
| ↳ `#step2TopChanges` | Top Changes & Deviations | 430 | 刚重设计 |
| ↳ `#step2PbAnswer` | PB 估值答案 | 435 | |
| ↳ `#step2TopicCards` | 专题入口 grid | 442 | |
| ↳ `#step2ActionPath` | 0-3 / 3-6 / 6-12 月行动 | 454 | |
| `#analysisRoadmap` | 分析导航地图 | 466 | |
| `#clientBriefPanel` | 客户汇报摘要 | 478 | |
| `#boardWorkflow` | 董办工作台流程 | 495 | |

### topics Tab（专题）—— 已有专题入口
- `#step2TopicGrid` 渲染的专题卡（5 大专题：盈利/息差/风险/资本/估值）
- 利润质量卡（Phase 1B 落地，`#profitQualityMount`）
- 估值三维卡（Phase 1B 落地，`#dividendValueMount`）
- IFRS 9 资产分类卡（Phase 2 落地，`#assetClassificationMount`）
- 现金流深度卡（Phase 2 落地，`#cashFlowDepthMount`）
- V5 异动雷达 / V5 PB anchor / V5 Tornado
- V6 异动雷达 / V6 转型顺序 / V6 风险前瞻三层 / V6 宏观传导
- DuPont 分解、净利润归因瀑布、NIM 归因

### report Tab（报告）—— 报告工作台
| ID | 模块名 | line |
|---|---|---:|
| `#reportFirstWorkspace` | 正式报告工作台容器 | 851 |
| `#formalReportShell` | 正式报告 HTML 渲染 | 869 |
| `#reportControlRail` | 报告交付控制台（默认折叠）| 882 |
| `#boardReviewPanel` | 董办复核 | 884 |
| `#deliveryReviewPanel` | 交付状态 | 898 |
| `#prdCoverageDashboard` | PRD 完成度 | 899 |
| `#aiGovernancePanel` | AI 写稿治理 | 900 |
| `#exportSequenceQaPanel` | 导出页序 QA | 901 |
| `#reportStructureEditor` | 报告结构编辑器 | 902 |
| `#analysisDeckShell` / `#printDeck` | PPT 版式报告预览（legacy）| 909 |

### data Tab（数据）—— 数据复核
| ID | 模块名 | line |
|---|---|---:|
| `#dataCoverageSection` | 数据覆盖页 | 738 |
| 数据 subtab quality | 数据覆盖与质量 | 784 |
| 数据 subtab calibration | 口径统一与可比性 | 785 |
| 数据 subtab explorer | 指标探索器 | 786 |
| `#metricExplorerPanel` | 指标探索器主体 | （JS 注入）|
| `#fieldCoverageMatrixPanel` | 字段覆盖矩阵 | （JS 注入）|

### review Tab（复核）
- 用 `#sprintBaselinePanel` 等 review 类组件，目前与 overview 混在一起
- `#boardReviewPanel` 实际在 report 控制台里
- 三源治理（v9 待建）

### governance Tab（管理）
- `#aiGovernancePanel`、`#prdCoverageDashboard` 已被 report 控制台共享
- `#ceam-structure-editor`（CEAM）
- LLM commentary
- Decision workbench

### Drawer（4 tab）
- `data-drawer-tab-target=data` → 数据
- `data-drawer-tab-target=review` → 复核
- `data-drawer-tab-target=project` → 项目（项目流水 + 对标组治理 + 报告结构编辑）
- `data-drawer-tab-target=ai` → AI 辅助

## 三、6+1 页面的内容映射

### Page 0 · Launch / 设定口径

**主问题**：本次汇报分析谁、和谁比、按什么场景看？

**保留并迁入**（默认显示）：
- 目标银行选择（Step 1 现有 target-drilldown）
- 对标银行选择（peer-field）
- 年份选择（year-field）
- 分析情景下拉（quick-launch-panel 里的 scenario）
- **新增**：场景预设按钮（董事会 / 资本市场 / 管理层行动）
- 推荐对标组 chip 预览

**折叠（高级设置抽屉）**：
- 类型均值勾选（type-field）
- 报告口径切换（version-field）
- 对标组方式 drop（template-field）
- 已保存对标组（saved-peer-field）

**移除/不再使用**：
- ❌ `.hero` 大装饰区（topbar/eyebrow/brand/hero-main/meta-panel/route）
- ❌ `.selection-intro`（三大段说明文字）
- ❌ `.project-briefing-grid`（三张 briefing 卡）
- ❌ `.iteration-strip`（迭代 strip）

**为什么移除**：Launch 页是任务页，不是营销页。装饰区让默认路径更长且产生重复信息。

### Page 1 · Executive Answer / 经营质量答案

**主问题**：目标银行现在最关键的经营质量判断是什么？

**保留并迁入**：
- `#step2SummarySection` 30 秒总结（一句总判断 + 关键 KPI strip）
- `#step2BoardQuestions` 三大董事会问题（PRD8-L01 问题式标题）
- **新增**：洞察三角占位（当前值 / 变化方向 / 机制解释，已实现）
- 行动建议 0-3 个月（从 `#step2ActionPath` 拆出首段）

**整合（消除重复）**：
- 合并 `#clientCommandCenter` + `#presidentSummaryPanel` + `#clientBriefPanel` → 一个 "Executive Summary" 块（这三块当前内容高度重叠）

**移除/降级**：
- ❌ `#analysisRoadmap`（导航地图） → 由左侧 Page Rail 替代
- ❌ `#boardWorkflow`（董办工作台流程） → 流程提示移到 onboarding tooltip

**为什么这样**：行领导默认只看一句答案、三个问题、首要行动；其他下钻在 Evidence Map 和 Topic Hub。

### Page 2 · Evidence Map / 证据地图

**主问题**：这个判断由哪些证据支撑？

**保留并迁入**：
- `#step2PeerPosition` 同业位置（SPARC 五灯号 + 可展开雷达）
- `#step2TopChanges` Top Changes & Deviations（刚重设计为 chip + 段落）
- `#step2PbAnswer` PB 估值答案
- `#v5DeviationRadar` 异动雷达（V5）
- **新增**：证据置信度行（口径风险 L1-L4 标签 + 样本 N 摘要）

**整合**：
- 把 `#v6DiscussionStrip` 董事会议题的"指向证据"逻辑 → 每条证据上加"对应董事会哪个问题"反向链接

**移除**：
- ❌ `#ibEvidencePanel`（投行级证据页） → 内容拆到对应专题深钻

**为什么**：证据地图是"用户能看清判断的支撑路径"的页面，每条证据点击可深钻到 Topic Detail。

### Page 3 · Topic Hub / 专题中心

**主问题**：哪些专题需要深钻？

**保留并迁入**：
- `#step2TopicCards` 现有 5 大专题入口卡片
- **新增专题卡**（已实现的）：
  - 利润质量（Phase 1B）
  - 股息估值三维（Phase 1B）
  - IFRS 9 资产分类（Phase 2）
  - 现金流深度（Phase 2）
- **从 v6/v5 升级**的专题卡：
  - 转型顺序检查（V6）
  - 风险前瞻三层（V6）
  - 宏观传导（V6）
  - DuPont 三因子（升级版）
  - 净利润归因瀑布

**移除/降级**：
- ❌ `#benchmarkV1Panel` BenchmarkIQ V1 总览 → 内容拆到答案页
- ❌ `#v5ValuePanel` 价值创造与估值归因 → 改为 Topic Detail 一个专题（"价值创造 EP 引擎"）

**关键**：Topic Hub 只是入口列表，每张卡只显示标题 + 问题式副标 + 关键差异指标，不展开内容。

### Page 4 · Topic Detail / 专题深钻

**主问题**：单个专题的原因、证据和行动是什么？

**结构**：左图右述 + 下方底稿。每个专题独立路由（如 `#topic/profit-quality`、`#topic/ifrs9`）。

**保留并迁入**（每个专题独立页）：
- 利润质量（已实现 `profitQualityPanel`）
- 股息估值三维（已实现 `valuationWithDividend`）
- IFRS 9 资产分类（已实现 `assetClassificationPanel`）
- 现金流深度（已实现 `cashFlowDepthPanel`）
- DuPont 双源对比（已实现 `dupontBreakdown.tushareDecomposition`）
- V5/V6 各专题（异动雷达、转型顺序、风险前瞻、宏观传导）

**新增**（v9 后续 Sprint）：
- 零售风险归因（PRD9-RR01，Sprint 11B）
- 资产负债重定价（PRD9-ALM01，Sprint 12A）
- 流动性期限错配（PRD9-LIQ01）
- IFRS 9 三阶段迁徙（PRD9-IFRS01，Sprint 12B）
- 信用减值与核销回收（PRD9-PROV01）
- 投资结构与公允价值波动（PRD9-INV01）

**每个专题统一 SCR + Evidence Drill 模板**（v9 第 9 节）：
1. Situation（本行位置）
2. Complication（差异来自哪里）
3. Evidence（核心图表 + 字段 + 样本 N + 口径风险）
4. Recommendation（0-3 / 3-6 / 6-12 月）
5. Drill（右侧抽屉可展开明细表）

### Page 5 · Report Studio / 报告工作室

**主问题**：如何把当前结论变成可交付材料？

**保留并迁入**：
- `#reportFirstWorkspace` 容器
- `#formalReportShell` 正式报告渲染
- `#reportControlRail` 改为顶部 sticky toolbar（替代右侧折叠 rail）
- `#reportStructureEditor` 章节开关 + 排序 + 自定义文本页
- 导出按钮：`#exportReportHtml`、`#exportReportPptx`、`#exportReport`（PDF）

**整合（保留入口但移出默认视野）**：
- `#boardReviewPanel`、`#deliveryReviewPanel`、`#prdCoverageDashboard`、`#exportSequenceQaPanel` → 进入「治理 Drawer」（右侧抽屉），点击 toolbar 的"治理"按钮打开
- `#aiGovernancePanel` → 同上，作为"AI 文案"抽屉

**移除**：
- ❌ `#analysisDeckShell` / `#printDeck` legacy PPT 预览（hidden 状态，已经废弃）

**新增**：
- 版本切换 segmented control：董事会 / 资本市场 / 管理层行动
- 章节复选框列表（多选取舍）

### Page 6 · Data & Validation / 数据复核

**主问题**：这些数字来自哪里，口径是否可信？

**保留并迁入**：
- `#dataCoverageSection` 数据覆盖（quality / calibration / explorer 三 subtab）
- `#metricExplorerPanel` 指标探索器
- `#fieldCoverageMatrixPanel` 字段覆盖矩阵
- 三源校验表（v9 PRD9-DQ01/DQ02 新建）—— 主表值 vs Tushare 值 vs 年报抓取值
- 字段血缘 + 单位/符号差异说明
- `#ceam-structure-editor` CEAM 结构编辑（迁入复核场景）

**整合**：
- 把当前 drawer 的 `data` 和 `review` 两个 tab 合并到这页（同一页内左右分栏）

**移除/降级**：
- ❌ 当前 drawer 的 4-tab 结构 → drawer 改为单一"工具箱"承载 Report Studio 的子抽屉
- ❌ `#sprintBaselinePanel` Sprint baseline（client-internal，不进客户路径）

## 四、跨页面共享元素

**永久可见**：
- **48px Global Bar**（已实现）：保留品牌 / 目标银行+年份+VQA / 步骤指示器 → 改为"当前 Page 高亮" / 工具箱 + 导出（导出按钮根据所在页变化提示）
- **左侧 Page Rail**（v10 IA-1 新建，48-56 px 宽）：7 个 Page 入口图标 + 文字，当前页高亮，未生成数据的页 disabled

**按页面切换**：
- 顶部 breadcrumb：`目标银行 / 当前页 / 子专题`
- 右下浮动"返回答案页"快捷键（在 Evidence / Topic Detail 上常驻）

**抽屉式工具箱**（沿用现有 `#toolDrawer`）：
- 简化为单一抽屉
- 内部承载：项目流水 / 历史版本 / 对标组治理 / AI 文案治理 / PRD 覆盖

## 五、移除/合并的模块汇总

| 移除项 | 原因 |
|---|---|
| `.hero` 大装饰区 | Launch 是任务页不是营销页 |
| `.selection-intro` 三段说明文 | 重复 |
| `.project-briefing-grid` 三 briefing 卡 | 信息冗余 |
| `.iteration-strip` 迭代提示 | 用 tooltip 替代 |
| `#analysisRoadmap` 导航地图 | Page Rail 替代 |
| `#boardWorkflow` 董办工作台流程 | onboarding tooltip 替代 |
| `#ibEvidencePanel` 投行证据页 | 内容拆到对应专题 |
| `#benchmarkV1Panel` V1 总览 | 已被 Executive Answer 吸收 |
| `#v5ValuePanel` 价值创造归因 | 改为 Topic Detail 一个专题 |
| `#analysisDeckShell` / `#printDeck` | legacy PPT 预览，已弃用 |
| `#sprintBaselinePanel` Sprint baseline | 仅供内部使用，不进客户路径 |
| 现有 workspace-tabs（6 tab） | 被 Page Rail 替代 |
| 现有 drawer 4-tab 结构 | 改为单一抽屉 |

**整合（不是删除，是合并）**：
- `#clientCommandCenter` + `#presidentSummaryPanel` + `#clientBriefPanel` → 一个 Executive Summary 块

## 六、IA-0 验收

✅ 每个现有模块都有明确去向（保留/迁移/折叠/移除/合并）
✅ 6 个客户页面的内容边界清晰，主问题不重叠
✅ 移除项有明确理由（不是凭感觉）
✅ Data & Validation 不进入客户默认路径但可达

下一步：进入 **IA-1 实施**（详见末节）。

## 七、IA-1 实施任务（5-7 天工程）

### A. Page Rail + 路由壳（2-3 天）

**新增文件**：
- `js/42-portal-router.js`：实现 `appPage` 状态机（'launch' / 'answer' / 'evidence' / 'topics' / 'topic-detail' / 'report' / 'data'），URL hash 同步
- `js/43-page-rail.js`：左侧 48-56px 导航条 + breadcrumb

**HTML 改动**：
- 在 `<body>` 加 `data-app-page="launch"` 属性，CSS 控制各页显隐
- 加 `<nav class="page-rail">` 在 Global Bar 下方左侧
- 加 `<div class="breadcrumb">` 在 main 顶部

**CSS 改动**：
- 新增 `--page-rail-width: 56px` token
- `body[data-app-page]` 全套显隐规则（哪些 section 在哪个 page 显示）
- 现有内容 **不动**，只通过 `data-page` 属性归类，由 CSS 控制可见性

### B. 内容归类标签（2 天）

按本文档第 3 节，给现有所有 section 加 `data-page="launch|answer|evidence|topics|topic-detail|report|data"`。

新建 contract test `tests/portal_ia_v10_contract.test.js`：
- 每个 section 必须有 `data-page` 属性
- 每个 `data-page` 值至少有 1 个 section 归类
- Page Rail 7 个按钮存在

### C. 路由与导航（1-2 天）

实现 Page 切换逻辑：
- 点击 Page Rail → 调用 `setAppPage('xxx')` → 更新 `body[data-app-page]` + URL hash
- 浏览器后退/前进按钮处理
- Page 切换时滚动到顶部
- Evidence / Topic Detail 上的"返回答案页"按钮

### D. 整合 Global Bar 步骤指示器（0.5 天）

现有 Global Bar 的 3 步指示器（setup/analysis/report）改为 7-page 高亮逻辑，与 Page Rail 同步。

### E. 验收（1 天）

- 三家典型银行（招行/工行/民生）× 三视口（1920/1440/1280）目视验收
- 7 个 Page 切换流畅，每个 Page 默认只显示对应内容
- 当前实现的所有专题在 Topic Hub / Topic Detail 可达
- 报告导出按钮在 Report Studio 找得到
- 数据复核入口在 Page Rail 可达

## 八、与并行 v9 Sprint 11A 的对接

v10 IA-1 在做"页面壳"时，v9 Sprint 11A 在做"数据治理层"。两条线在 **Page 6 Data & Validation** 汇合：

- IA-1 把 Data & Validation 页面挂出来（容器）
- 11A 把三源校验表、字段血缘、口径差异内容填进去

**接口约定**（11A 输出的内容必须能挂载到这些 ID）：
- `#triSourceValidationPanel` — 三源校验表
- `#fieldLineageMap` — 字段血缘
- `#calibrationRulesPanel` — 单位/符号/合并口径规则

只要 11A 按这个 ID 约定输出 HTML，IA-1 不用等 11A 完成就能上线（先显示占位）。

## 九、不在 IA-0 范围

- IA-2 以后的页面内容精修（Launch / Answer / Evidence Map 的具体重排）
- 设计 token 调整（继续沿用现有 9 档字号 + 阴影 token）
- PPTX 矢量化（Sprint 11 之后）
- 后端数据仓库对接（v9 Sprint 13）

## 十、问题与决策点（需要你最后拍板）

1. **Page Rail 是否替代现有 Global Bar 步骤指示器？**
   推荐：替代。Global Bar 步骤指示器（3 步）功能被 Page Rail（7 page）超集覆盖。
2. **现有 6 个 workspace-tabs 是否一次性删除？**
   推荐：第一版 IA-1 把 tab 隐藏（`display: none`）但 DOM 保留，回退安全。下一个 Sprint 确认无回退后删除。
3. **PPT 预览 legacy（`#analysisDeckShell`）是否立即删除？**
   推荐：立即删除。已经 hidden 且没人用。
4. **三源校验表的具体 schema 等 v9 Sprint 11A 输出，还是 IA-1 先定占位结构？**
   推荐：IA-1 先定占位 schema，11A 按约定填充。这样两条线可以真并行。

如有不同看法在 IA-1 启动前告诉我，否则按以上推荐执行。
