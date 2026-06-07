# BenchmarkIQ Portal 会话迁移与下一步计划

> 更新时间：2026-06-07  
> 项目路径：`/Users/jinkunxiao/Documents/业务/银行财报分析/outputs/vqa_template`

## 1. 迁移目的

本文件用于把当前会话迁移到新页面/新聊天后继续开发。新会话应优先阅读本文，然后再读取项目计划和设计样稿，避免重新梳理历史需求。

## 2. 项目当前目标

当前产品是银行财报 VQA / 经营质量分析 Portal，核心目标是把原先“一条很长的下拉式分析页面”重构成面向客户、董事会、管理层和分析师的多页面工作台。

关键方向：

- 默认首页直接进入 `Launch`，不再把最近项目作为首屏主入口。
- 用户先选择银行类型、区域、目标银行、对标组、年份和汇报场景。
- 汇报场景包括：董事会版、资本市场版、管理层行动版。
- 不同汇报场景会改变经营质量答案页的首屏语言。
- `Data & Validation` 作为左侧一级页面，而不是只从证据卡进入。
- `Report Studio` 保留报告编辑能力，包括章节、排序、语言强度和导出控制。
- 产品语言要更像咨询判断：不是只陈述指标和方法，而是解释“为什么、对这家银行意味着什么、管理层该看什么”。

## 3. 已完成的重要事项

### 3.1 Portal 信息架构设计

最新设计样稿文件：

- `docs/design-mockups/portal-ia-v10-mockup.html`

当前样稿包含 7 个一级页面：

| 页面 | 作用 |
| --- | --- |
| Launch / 设定口径 | 选择目标银行、银行类型、区域、对标组、年份和汇报场景 |
| Executive Answer / 经营质量答案 | 给出首屏结论、核心 KPI 和董事会议题 |
| Evidence Map / 证据地图 | 展示异动归因、同业位置和 PB 信号 |
| Topic Hub / 专题中心 | 作为专题入口，不承载长内容 |
| Topic Detail / 专题深钻 | 使用 SCR 结构承载单个专题的主问题、主图和行动建议 |
| Report Studio / 报告工作室 | 承载报告预览、章节编辑和导出 |
| Data & Validation / 数据复核 | 承载三源字段口径、血缘卡和后端对接信息 |

最近一轮样稿调整：

- 左侧任务流增加了二级导航。
- 每个一级页面下有 3 个二级入口。
- 左侧导航只展开当前一级页面下的二级入口，避免左栏过长。
- 整体做了更紧凑处理：顶部栏、主内容区 padding、页面标题、卡片、KPI、专题卡、表格和报告画布都压缩了一层。

注意：该 mock 文件当前可能仍是未跟踪文件，接手时需要先确认是否应纳入 Git。

### 3.2 下一步改进计划已汇总

主计划文件：

- `docs/next-improvement-plan-consolidated.md`

其中已经追加 PRD v10：Portal 信息架构与客户视角页面重排。

v10 的 Sprint 建议包括：

| Sprint | 主题 | 目标 |
| --- | --- | --- |
| IA-1 | Portal Shell 与导航 | 建立 Global Bar、左侧 Page Rail、页面路由状态和 breadcrumb |
| IA-2 | Launch + Executive Answer | 选择银行页一屏重排，经营质量答案首屏突出结论 |
| IA-3 | Evidence Map + Topic Hub | 把异动、同业位置、PB 信号拆成证据页和专题入口 |
| IA-4 | Topic Detail + Report Studio | 专题统一 SCR 模板，报告工作室集中承载编辑和导出 |
| IA-5 | Data & Validation | 三源复核页、字段血缘、口径标签和质量事件联动 |

### 3.3 杭州银行年报抓取数据已入库

用户在 `数据/抓取数据/` 中新增了杭州银行数据。当前已经完成：

- 将 `杭州银行` 归并为系统标准名 `杭州`。
- 新增别名规则：`杭州银行 -> 杭州`。
- 重新生成主数据和数据治理输出。
- 杭州银行主数据覆盖 `2020-2025` 共 6 年。

新增年报抓取数据明细库：

- `data_governance/annual_report_scraped_database.csv`
- `data_governance/annual_report_scraped_database.json`
- `data_governance/annual_report_scraped_bank_index.csv`
- `data_governance/annual_report_scraped_source_tables.csv`

当前抓取库状态：

- 原始 CSV 文件：728 个
- 读入成功：727 个
- 去重后明细记录：20,730 条
- 标准化银行：51 家
- Bank-year：51 个

已知提示：

- 重复目录中的 `苏州农商等15家银行数据抓取/杭州银行/杭州银行_2025_repricing_long.csv` 含 NUL 字符读取失败。
- 顶层 `数据/抓取数据/杭州银行/杭州银行_2025_repricing_long.csv` 已成功读入，所以不影响杭州银行数据纳入。

### 3.4 后端数据仓库对接文档已更新

文档：

- `docs/backend-data-warehouse-integration-guide.md`

其中已经补充抓取数据静态文件说明，包括：

- 年报抓取去重明细库
- 银行级索引
- 表类型索引
- 后端事实表对接方向

后续后端同事可根据该文档设计 `fact_bank_*` 明细事实表和 Portal 聚合视图。

## 4. 当前应优先读取的文件

新会话开始后，建议按以下顺序读取：

1. `docs/session-handoff-2026-06-07.md`
2. `docs/next-improvement-plan-consolidated.md`
3. `docs/design-mockups/portal-ia-v10-mockup.html`
4. `docs/backend-data-warehouse-integration-guide.md`
5. `index.html`
6. `data.js`
7. `data_governance/annual_report_scraped_bank_index.csv`

## 5. 当前最重要的产品判断

### 5.1 当前问题不是继续堆分析模块

Portal 已经有较多分析能力，用户明确反馈现在内容太多、页面太长、导航感不足。下一步的重点应从“继续增加模块”转向“重排信息架构和浏览路径”。

### 5.2 页面应从客户视角拆分

建议把真实产品也按 mock 中的 7 个页面重构，而不是在现有长页面里继续增加分区：

- 客户/董事会默认看 `Executive Answer`、`Evidence Map`、`Report Studio`。
- 分析师看 `Topic Detail` 和 `Data & Validation`。
- 后端同事主要看 `Data & Validation` 和数据仓库对接文档。

### 5.3 语言需要继续治理

用户多次反馈语言机械、生硬、像在陈述方法。后续所有页面文案都应遵循：

- 先说结论，再说证据。
- 每句话都要绑定目标银行和对标组。
- 少说“我们通过某方法分析”，多说“这个指标对管理层意味着什么”。
- 以咨询汇报语言表达：判断、原因、影响、动作。

## 6. 建议下一步执行计划

### Step 1：把 v10 mock 落到真实 Portal Shell

目标：

- 将 `portal-ia-v10-mockup.html` 的左侧导航、顶部状态栏和页面切换逻辑迁移到真实 `index.html`。
- 不要求一次性重写所有分析内容，先完成壳层和页面边界。

验收：

- 默认进入 `Launch`。
- 左侧有 7 个一级页面。
- 每个一级页面有 2-3 个二级导航入口。
- 页面之间不再依赖长滚动寻找内容。

### Step 2：重构 Launch 页面

目标：

- 选择银行页尽量在一个版面内完成。
- 先选银行类型：大行、股份制、城商行、农商行。
- 城农商继续通过区域筛选。
- 对标银行默认按选定银行类型和区域推荐。

验收：

- 选择银行页不遮挡。
- 不需要连续向下翻才能完成启动。
- 右上角不再固定显示苏农名称，而是跟随选定银行。

### Step 3：重构 Executive Answer 页面

目标：

- 首屏先给经营质量判断。
- 根据汇报场景调整语言：
  - 董事会版：风险、行动、关键议题
  - 资本市场版：估值、质量、市场信号
  - 管理层行动版：责任专题、节奏、抓手

验收：

- 首屏不超过 6 张核心卡。
- 第一眼看到的是结论，不是指标堆叠。
- 语言不再像指标说明，而像咨询判断。

### Step 4：重构 Evidence Map 与 Topic Hub

目标：

- 异动雷达 / Top Deviation 不再展示冗长列表。
- 用图表和短解释说明“为什么波动大、可能原因是什么”。
- 同业位置压缩成可读摘要。
- PB、零售风险、存贷深钻等进入专题中心和专题详情。

验收：

- 异动和偏离有信息量。
- 不出现过长、难读、无结论的列表。
- 用户能从证据页自然进入专题深钻。

### Step 5：重构 Report Studio

目标：

- 报告工作室集中承载预览、章节编辑、语言版本和导出。
- HTML/PDF/PPTX 后续共享同一故事线模型。
- PPTX 风格继续参考 RSM consulting ppt skills 的 reference 风格。

验收：

- 导出控制台不再遮挡主体。
- PPTX 预览不占默认分析页空间。
- 报告章节顺序和 Portal 页面逻辑一致。

### Step 6：补强 Data & Validation

目标：

- 展示原主数据、Tushare、年报抓取三源覆盖情况。
- 明确 Portal 当前用了哪些数据、哪些还没用。
- 给后端同事提供字段血缘、事实表建议和聚合视图建议。

验收：

- 后端能按文档建表。
- 分析师能追溯指标来源。
- 客户默认路径不被字段表干扰。

## 7. 接手注意事项

- 不要随意覆盖用户已有未提交改动。
- 修改前先查 `git status --short`。
- 如果要做真实页面落地，优先读 `index.html`、`data.js` 和现有 JS 函数，不要直接重写整站。
- `docs/design-mockups/portal-ia-v10-mockup.html` 当前是设计样稿，不一定已进入 Git。
- 浏览器中的本地 `file://` 页面可能被 app browser 策略限制，无法自动重新载入验证；必要时可使用本地 dev server 验证。

## 8. 新会话可直接使用的启动语

可以在新聊天中直接使用：

```text
请接着 `/Users/jinkunxiao/Documents/业务/银行财报分析/outputs/vqa_template/docs/session-handoff-2026-06-07.md` 的上下文继续开发。先读取 handoff、next-improvement-plan-consolidated.md 和 portal-ia-v10-mockup.html，然后把 v10 Portal IA 的壳层和导航逐步落到真实 index.html。
```
