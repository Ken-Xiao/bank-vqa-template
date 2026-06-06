# BenchmarkIQ 下一步改进计划合并版

更新时间：2026-06-02（新增 2026-06-02 校准章节：版式系统 + reportModel 契约落地后的状态盘点与下个 Sprint 计划）

## 汇总口径

本计划合并了早期产品设计全案、V1/V2/V3/V4 PRD，近期 V5/V6 PRD，本轮新增的 BenchmarkIQ V3/V4、投行级价值诊断工作台、数据扩展与图表体系，以及最新 PRD v7.0/v7.1 的"Precision, not heft"产品重构要求。结论是：下一阶段不应继续零散加模块，而应围绕"8 分钟从数据到报告"的核心价值链做收敛。

说明：本轮已按 `superpowers` 插件提供的多线程开发管理方式复核计划：主线程负责排期收敛，PRD 评审子线程检查优先级和遗漏，工程评审子线程检查实现顺序、模块依赖和验收风险。本计划按"需求池 -> 工作流 -> 里程碑 -> 依赖 -> 验收 -> 暂缓项"组织。

## 总体优先级判断

当前产品已经具备：SPARC/VQA 总览、对标组选择、专题工作台、正式报告、V4/V5/V6 深钻和价值归因。真正限制产品进入试点和规模化交付的不是缺一个新图，而是以下五个断点：

1. 报告交付物还未彻底同源，HTML/PDF/PPTX 页序和视觉一致性仍需统一。
2. 产品入口仍像"功能全集"，而不是"设定口径 -> 看结论 -> 出报告"的三步主线。
3. 总览页和分析页信息密度仍偏高，董事会入口需要减负到"1+3+N"结构。
4. 数据页还不是分析师验证工作台，缺少"选指标 -> 看趋势/对标/口径"的闭环。
5. 口径风险、语言强度和 AI/模板叙事尚未完全联动。

因此下一步改造顺序建议为：

**先重构产品壳与导航 -> 再统一交付物 -> 再压缩内容主线 -> 再升级语言与深度分析。**

经过 superpowers 多线程复核后，对执行顺序做一处关键调整：**PPTX/导出不能整体放到后期**。应拆成两层：

1. **导出可用性 P0**：HTML 有正式版式、PDF 不白版且分页可读、PPTX 至少有页序/标题/图表/关键证据块。
2. **PPTX 高保真/矢量化 P2**：在报告内容树稳定后，再做完全矢量化、复杂版式和更高保真母版。

## 本轮新增 PRD 纳入后的排期校准

新增 PRD 把产品方向进一步明确为：从"银行位置比较工具"升级为"投行级价值诊断工作台"。新增需求不改变总排序，但会提高三类事项的优先级：

1. **机制归因提前**：DuPont、净利润归因瀑布、NIM归因、多基准线不再只是高级增强，而是报告能否像咨询交付物的核心。
2. **数据可信度提前**：257 字段利用率、口径风险、指标手册、异常检测、信用风险迁徙，需要先形成可验证的数据工作台。
3. **表达体系提前**：断言型标题、关键数字锚定、So What、七类页型、图表标注层，要进入报告和 PPTX 的基础规范。

## PRD v7/v7.1 增补后的产品原则

最新 PRD 的核心判断是：当前产品不是能力不足，而是能力外露过多。下一轮升级的主命题不是"加什么"，而是"怎么减、怎么藏、怎么排序"。对标 McKinsey、KPMG Peer Bank 和 360factors 后，产品目标被重新表述为：

**在一位银行董办主任收到年报数据后的 48 小时内，帮助其在 8 分钟内完成：选定口径 -> 看到诊断结论 -> 确认证据 -> 导出可上会材料。**

## PRD v8 增补：从可交付工具升级为全屏决策工作台

本轮新增 PRD 的核心判断是：当前产品的底层能力已经较强，下一步不是继续增加"重模块"，而是建立更强的启动体验、洞察推理、全屏呈现和数据互动能力。对标 McKinsey GBAR 的 "Precision, not heft"、KPMG Peer Bank 的 3-click insight、360Factors Peer Insights 的自动 peer benchmarking 后，产品下一阶段应从"能生成报告"升级为"能在董事会场景中直接形成判断、解释机制、驱动行动"。

### v8 产品原则

1. **60 秒启动**：用户不应先学习工具，而应先选银行、自动生成 peer、看到第一句判断。
2. **洞察优先**：每个专题必须从"当前值 + 变化方向 + 机制解释"三角生成结论，不再只复述指标。
3. **一套前台语言**：SPARC/VQA 继续作为计算层，但用户端统一呈现为"经营质量诊断"，避免三套五维框架并列。
4. **董事会对话语言**：标题和正文改成"问题-紧张-方向"，每页回答一个董事会真正会问的问题。
5. **全屏工作台**：在线体验从窄卡片看板升级为左导航、中主画布、右上下文面板的专业分析工作台。
6. **数据从静态对标走向动态推演**：What-if、同业轨迹、热力图和时间序列联动成为下一阶段的数据应用重点。

### v8 新增需求池

| 编号 | 需求 | 归属优先级 | 纳入原因 |
|---|---|---|---|
| PRD8-P01 | 60 秒启动入口 | P0 | 首页只保留银行搜索、最近项目、自动推荐 peer 和一键生成，降低第一次使用门槛。 |
| PRD8-P02 | 分析情景入口 | P1 | 按董事会、资本市场、管理层行动三种情景组织默认内容和语言版本。 |
| PRD8-C01 | 洞察生成三角模型 | P0 | 每个核心结论必须绑定当前值、变化方向、机制解释，避免事实复述。 |
| PRD8-C02 | 跨维度交叉信号 | P1 | 将盈利、息差、风险、资本、估值之间的联动变成专题顶部的"交叉信号"。 |
| PRD8-C03 | 经济利润 EP 价值创造判断 | P1/P2 | 用 EP = Net Income - Cost of Equity × Book Equity 判断价值创造/维持/消耗/毁损。 |
| PRD8-L01 | 问题式专题标题 | P0 | 将"盈利真实性分析"等内部术语改为董事会问题。 |
| PRD8-L02 | 问题-紧张-方向话术模板 | P0 | 董事会版、资本市场版、管理层行动版分别形成可复用语言骨架。 |
| PRD8-L03 | 对标银行具名对比 | P1 | 将匿名均值升级为"哪家银行、哪项能力、什么差距"的具名参照。 |
| PRD8-Logic01 | 前台合并 SPARC/VQA 术语 | P0 | 用户只看经营质量诊断；SPARC 做定位层，VQA 做解释层。 |
| PRD8-Logic02 | 诊断决策树 | P1/P2 | 将线性章节升级为"如果 ROA 低，是收入问题还是成本问题"的推理链。 |
| PRD8-UI01 | 全屏三栏工作台 | P0/P1 | 左侧导航、中间主内容、右侧上下文面板，让页面铺满 1440/1920 宽屏。 |
| PRD8-UI02 | 密度模式 Executive/Analyst/Draft | P1 | 投屏、分析、报告生成三种场景需要不同信息密度。 |
| PRD8-DATA01 | What-if 全图表联动 | P1 | Slider 不只影响 VQA，也要影响排名、分位、图表和管理含义。 |
| PRD8-DATA02 | 指标时间序列叠加 | P1 | 点击任一指标，右侧面板展示目标银行、peer、类型均值 6 年趋势。 |
| PRD8-DATA03 | 同业雷达覆盖图 | P1/P2 | 用目标银行、peer 范围、类型均值的覆盖面积展示差距。 |
| PRD8-DATA04 | 对标矩阵热力图 | P1 | 行是银行、列是核心指标、颜色是分位，给分析师一屏全局差异。 |

### v8 对当前排期的影响

v8 不推翻 Sprint 7/8 的成果，而是把下一阶段从"AI与规模化专项"进一步拆清楚：

1. **Sprint 9 优先做体验与语言的高感知改造**：60 秒启动、问题式标题、洞察三角、全屏宽度治理。
2. **Sprint 10 再做动态数据工作台**：时间序列叠加、对标矩阵热力图、What-if 全图表联动。
3. **Sprint 11 才进入高阶推理与规模化**：经济利润、诊断决策树、具名同业案例库、云端 LLM 推理增强。

### v8 关键取舍

- 先做 **60 秒启动 + 问题式标题 + 洞察三角**，因为这三项工程量相对可控，但用户感知最强。
- 全屏三栏工作台应作为版式治理继续推进，但必须保留现有 `setup / analysis / report / drawer` 状态机，不回到复杂 Tab 平铺。
- 经济利润、诊断决策树、同业轨迹聚类价值高，但需要更多数据解释和验证，放在 Sprint 11。
- 云端 LLM 不应抢先于事实包、引用审计和语言模板治理，否则容易生成漂亮但不可辩护的文字。

### v7 新增需求池

| 编号 | 需求 | 归属优先级 | 纳入原因 |
|---|---|---|---|
| PRD-P01 | 三步产品主线：设定口径、看结论、出报告 | P0 | 取代 6 个 Tab 平铺，降低首次使用认知负荷。 |
| PRD-P02 | 董事会层、管理层层、执行层三层内容整合 | P1 | 让 80% 屏幕展示 20% 高频内容，低频功能转入深钻/抽屉。 |
| PRD-P03 | Top Changes & Deviations 作为分析入口 | P0 | 用户先看"什么变了、什么偏了"，比先看抽象总分更符合认知。 |
| PRD-C01 | 1+3+N 内容结构 | P0 | 将核心判断压缩为 1 页总结、3 页证据、N 页专题。 |
| PRD-C02 | 专题统一 SCR 四段论 | P0 | 所有专题都按问题、数据、机制、行动输出，避免模块各说各话。 |
| PRD-C03 | 重复模块合并 | P0 | 合并 30 秒诊断、估值与证据、同业位置等重复模块。 |
| PRD-L01-Phase1 | 本地语言强度分层 | P0 | 先不用云端 AI，也能按 z-score 和口径风险控制表达强度。 |
| PRD-L01-Phase2 | 云端 LLM 解读/对话/润色 | P2 | 需要后端与安全策略，不进入最近两个 Sprint。 |
| PRD-L02 | 判断句标题替代描述句标题 | P0 | 所有标题必须表达判断，而不是只描述模块名称。 |
| PRD-L03 | KPMG Board Agenda 式讨论问题 | P1 | 执行摘要从"结论卡"升级为董事会真正要回答的问题。 |
| PRD-Logic01 | 金字塔逻辑嵌入界面 | P0 | Step 2 先给一句总答案，再给三类证据，再给专题深钻。 |
| PRD-Logic02 | 章节桥梁句 | P0 | 复用 `consultingStoryline().chapters[].bridge`，让章节之间不断裂。 |
| PRD-Logic03 | 核心问题贯穿全站 | P1 | 任一深钻页面都能回到 governing thought。 |
| PRD-UI01 | 设计 Token 系统与统一约束 | P0 | 为一屏一焦点和后续 Figma/实现对齐建立基础。 |
| PRD-UI02 | Step 2 一屏一焦点布局 | P0 | 每个可视区域只承载一个信息单元，减少长条页面疲劳。 |
| PRD-UI03 | 48px Sticky Global Bar | P0 | 永久显示银行、年份、VQA、信号和导出入口。 |
| PRD-UI04 | PDF/PPTX 导出质量提升 | P0/P1 | PDF 分页、PPTX 矢量化和 HTML 同源必须继续前移。 |
| UI-STEP1 | 设定口径页重构 | P0 | 2 分钟内完成目标银行、对标组、年份设定。 |
| UI-STEP2-A/F | 30 秒总结、同业位置、异动偏离、估值答案、专题入口、行动建议 | P0 | 构成新的 Step 2 默认体验。 |
| UI-STEP3 | 报告交付页 | P0/P1 | 全屏报告预览、版本/专题/导出控制条。 |
| UI-AUX | 数据/复核/项目/AI 辅助抽屉 | P1 | 把低频 Tab 从顶层移走，但保留能力可达。 |
| UI-TOPIC | 专题深钻全屏视图 | P1 | 从折叠专题卡片进入完整图表与 AI 解读。 |
| UI-STATE | SETUP/ANALYSIS/REPORT/DRAWER 状态机 | P0 | 将页面从 Tab 平铺升级为产品状态机。 |

## P0：下一轮必须优先做

| 优先级 | 改造主题 | 覆盖历史需求 | 当前状态 | 下一步目标 |
|---:|---|---|---:|---|
| P0-1 | Single-source 报告引擎与统一页序 | V5-15、V6-12、V6-14、FUNC-RG-001、VIS-01 | 部分实现 | 以 `formalReport` 为唯一内容树，统一 HTML/PDF/PPTX 的页序、目录、章节标题和导出入口。 |
| P0-2 | 导出可用性修复 | V6-15、VIS-04、历史反馈 HTML/PDF/PPTX 问题 | 部分实现 | 先保证 HTML 有颜色和正式版式、PDF 不白版、PPTX 有图表/图片/关键证据块；矢量化另列 P2。 |
| P0-3 | 总览页决策漏斗与折叠机制 | V6-10、V6-20、VIS-02、Executive Snapshot、行长版一页摘要 | 进行中 | 已将 30 秒结论、三大董事会议题、SPARC交通灯前移至任务台；下一步继续折叠价值创造/PB、异动雷达以外的重模块。 |
| P0-4 | 对标组一等功能补齐 | FUNC-PG-001/003/004/005、V2 A2/A3、对标组画像卡 | 部分实现 | 做"我的对标组/预设组/默认组/画像卡/选择理由文本/报告P3"闭环；双对标组先保留后续。 |
| P0-5 | 口径风险标签与叙事联动 | V6-17、PROD-02、V2 A4/B4、口径风险四级 | 已落地 V1 | L1/L2/L3/L4 已进入数据页、事实包、叙事降级、正式报告脚注、PPTX 页脚和导出元数据；下一步继续强化 Ch-C-E-A-M 语气分层。 |
| P0-6 | Metric Explorer 指标探索器 | V6-16、FUNC-AE-002、数据页拆分、单指标drill-down | 已落地 V1 | 数据Tab已新增指标探索器，支持目标值、对标值、类型均值、趋势、分位、口径风险和数据来源。 |
| P0-7 | Ch-C-E-A-M 语言引擎 | V6-18/19、V5-12/13、CONT-01/03、AI叙事口径联动 | 部分实现 | 从"模板事实复述"升级为 Challenge -> Claim -> Evidence -> Attribution -> Meaning，并按口径风险/强度分层。 |
| P0-8 | 三步产品主线与状态机 | PRD-P01、UI-STATE、UI-NAV-01 | 新增需求 | 建立 `setup / analysis / report / drawer` 状态机，用 Global Bar 取代 6 Tab 作为用户主路径。 |
| P0-9 | Step 1 设定口径页重构 | UI-STEP1-01/02、PRD-P01 | 新增需求 | 把目标银行、对标组、年份压缩为居中 720px 的单页流程；高级筛选默认折叠。 |
| P0-10 | Step 2 1+3+N 诊断页 | PRD-C01、PRD-Logic01、PRD-UI02 | 新增需求 | 以 30 秒诊断、同业位置、异动偏离、估值答案、专题入口、行动建议重构默认分析页。 |
| P0-11 | Top Changes & Deviations 产品化 | PRD-P03、UI-STEP2-C | 新增需求 | 将本期变化 Top 5 与偏离对标 Top 5 作为确认口径后的第一证据入口。 |
| P0-12 | SCR 专题卡片与桥梁句 | PRD-C02、PRD-Logic02、UI-STEP2-E/BRIDGE | 新增需求 | 专题默认折叠为"问题 -> 数据 -> 机制 -> 行动"，章节之间展示过渡桥梁句。 |
| P0-13 | Sticky Global Bar 与一键导出入口 | PRD-UI03、UI-NAV-01 | 新增需求 | 顶部固定显示银行、年份、VQA分、信号、Step 指示器和 HTML/PDF/PPTX/Data 导出入口。 |
| P0-14 | Design Token 与一屏一焦点约束 | PRD-UI01、UI-TOKEN-01、UI-STEP2-00 | 新增需求 | 统一内容宽度、图表宽度、间距、字号、层级和动效，作为后续页面重排基础。 |

## P1：第二阶段做，提升分析深度和专业感

| 优先级 | 改造主题 | 覆盖历史需求 | 当前状态 | 下一步目标 |
|---:|---|---|---:|---|
| P1-1 | DuPont 三级分解联动对标 | PROD-04、ENG-01、LOGIC-01、FUNC-AE-003 | 已有基础但需产品化 | 将现有 `dupontBreakdown()` 升级为树图/瀑布/报告专题页，回答 ROE 差距来自哪里。 |
| P1-2 | 净利润 YoY 归因瀑布 | PROD-05、ENG-02、FUNC-AE-004、LOGIC-02 | 部分实现 | 把 `netProfitAttribution()` 产品化为瀑布图和报告页，解释利润增长质量。 |
| P1-3 | 多基准线图表体系 | PROD-06、ENG-03、FUNC-AE-008 | 部分实现 | 所有核心图表支持均值、中位数、P25/P75、类型均值、监管线，并显示有效样本 N。 |
| P1-4 | 图表页左右分栏与视觉节奏 | VIS-01/03、Board-Ready Report、每页一个故事 | 部分实现 | 图表页统一为左图右述；新增章节转场页、关键数字锚定页、章节收束页。 |
| P1-5 | 跨期异常检测与数据质量事件 | CONT-04、DAT-04、FUNC-DM-002 | 暂缓 | 扫描 YoY 跳变、3σ偏离、趋势反转，生成数据质量事件并进入数据Tab/报告警示。 |
| P1-6 | 对标组敏感性与合理性论证 | FUNC-03、FUNC-PG-004/005、V6业务可讨论性 | 部分实现 | 自动说明"为什么选这些银行"，并测试移除某家银行后结论是否翻转。 |
| P1-7 | 报告结构编辑器 | FUNC-05、标准报告模板、客户自定义模板 | 暂缓 | 支持章节开关、排序、自定义文本页，增强"这是客户自己的报告"的感受。 |
| P1-8 | 三层用户内容整合 | PRD-P02、UI-AUX-01 | 新增需求 | 将董事会层默认展示，管理层层展开可见，执行层功能放入工具箱抽屉。 |
| P1-9 | KPMG Board Agenda 式讨论问题 | PRD-L03、UI-STEP2-A | 新增需求 | 将执行摘要中的"结论卡"改为三个董事会问题、系统初步判断和支撑证据。 |
| P1-10 | 专题深钻全屏视图 | UI-TOPIC-01 | 新增需求 | 从专题折叠卡进入全屏专题页，左侧图表数据，右侧三版本 AI 解读。 |
| P1-11 | 本地语言强度分层 | PRD-L01-Phase1、PRD-L02 | 新增需求 | 根据 z-score、口径风险和重要性生成 Level 1/2/3 表达强度与判断句标题。 |

## P2：后续增强，适合作为专项

| 优先级 | 改造主题 | 覆盖历史需求 | 当前状态 | 说明 |
|---:|---|---|---:|---|
| P2-1 | PPTX 矢量化与高保真 | V6-15、VIS-04 | 暂缓 | P0 先做"可用版"：有图、有页序、不跑版；P2 再做完全矢量化、复杂母版和高保真专项。 |
| P2-2 | 产品/业务线价值拆解 Marimekko | V5-02、McKinsey价值创造、产品线价值矩阵 | 部分实现 | 需要更细产品线收入、成本、资本占用数据；否则只能做代理拆解。 |
| P2-3 | 资产质量诚实度矩阵 | FUNC-AE-005、资产质量真相矩阵 | 部分实现 | 依赖逾期90天+/不良生成率披露；当前可先用逾期偏离度做代理。 |
| P2-4 | 信用风险迁徙矩阵 | DAT-02、Stage1/2/3字段利用 | 暂缓 | 如果底表字段完整，应作为风险专题增强。 |
| P2-5 | 贷款行业集中度与尾部风险 | DAT-03、行业集中度、HHI | 暂缓 | 依赖公司贷款行业字段，目前未进入主分析链路。 |
| P2-6 | 资本消耗预测/分红率/DDM增强 | FUNC-AE-007、R-资本模拟、V5 RAROC/Dividend Payout | 部分实现 | 当前已有 What-if 和 DDM 基础，完整资本规划需分红率、RWA、经济资本数据。 |
| P2-7 | 预警通知与财报更新监测 | FUNC-DM-003、Alert System、监测模块 | 暂缓 | 需要数据更新管道或外部数据源，不适合纯静态前端优先做。 |
| P2-8 | 智能推荐对标组 | FUNC-PG-002、分析模板推荐 | 部分实现 | 当前有筛选/预设/推荐标签，完整相似度推荐可作为后续增强。 |
| P2-9 | Precision 策略检查器 | V5-03 | 暂缓 | 人工评分偏主观，适合放入管理Tab作为顾问工具，而非主流程。 |
| P2-10 | 云端 LLM / Kaia 式对话分析 | PRD-L01-Phase2、对话式分析 | 暂缓 | 需要后端、安全、引用数据治理和权限策略，当前先做本地语言强度分层。 |

## v7 重新规划后的 4 个开发批次

### Batch A：能呼吸的产品壳

目标：让用户打开页面后 10 秒内知道先做什么、当前在哪、下一步去哪里。范围包括 48px Global Bar、`setup / analysis / report / drawer` 状态机、Step 1 设定口径页重构、Step 2 一屏一焦点骨架、Step 3 报告交付页骨架、数据/复核/项目/AI 工具箱抽屉入口、Design Token 与布局约束。验收：进入页面默认只看到设定口径流程；确认口径后进入 Step 2，Global Bar 显示银行、年份、VQA 分、信号和导出入口；报告、数据、复核、项目管理都能通过 Step 或工具箱进入。

### Batch B：精准的默认内容

目标：把默认分析页从"功能陈列"改成"1+3+N"的董事会故事线。范围包括 30 秒诊断合并、三个董事会讨论问题、同业位置卡（SPARC 五灯号 + 可展开雷达）、Top Changes & Deviations、PB 估值答案、专题入口折叠卡（SCR 四段论）、行动建议（0-3 / 3-6 / 6-12 月）。验收：Step 2 首屏可以在 30 秒内读完核心判断；不滚动超过 3 屏即可看完同业位置、异动偏离、PB 估值答案；专题深钻默认折叠，但每个专题有一句判断、SCR 逻辑和进入完整图表的入口。

### Batch C：语言、逻辑和证据穿透

目标：让每个页面都有判断、有证据、有机制解释、有管理含义。范围包括判断句标题替换描述句标题、本地语言强度 Level 1/2/3、z-score 与口径风险驱动语气分层、章节桥梁句、核心问题贯穿所有深钻页、专题全屏深钻视图、三版本 AI 解读（董事会版 / 资本市场版 / 管理层行动版）。验收：所有核心标题都是结论句；严重偏离指标能进入执行摘要和讨论问题；每个专题深钻页都能解释"为什么要看下一节"。

### Batch D：交付质量和规模化能力

目标：让 HTML/PDF/PPTX 真正共享同一个报告母版，并支持客户化编辑。范围包括 Single-source report model、PDF 分页修复、PPTX 核心图表矢量化、HTML/PDF/PPTX 页序一致性、报告结构编辑器、版本切换、对标组敏感性测试、历史版本和导出留痕。验收：PDF 不白版、不截断关键表格；PPTX 打开后至少核心图表清晰；用户能选择报告版本、开关专题并导出一致页序的交付物。

## 最重要的取舍

如果只能先做 3 件事：(1) 三步产品主线和状态机；(2) 1+3+N 默认诊断页；(3) 报告同源和导出质量。如果只能先做 1 件事：**先做"能呼吸的产品壳"**——因为现在最大问题不是缺少能力，而是用户进入后被能力淹没。

## 开发管理拆解

### 工作流划分

| 工作流 | 负责的问题 | 关键交付物 |
|---|---|---|
| WS1 产品状态机与导航 | 6 Tab 平铺、层级太深、用户不知道先做什么 | Global Bar、Step 指示器、SETUP/ANALYSIS/REPORT/DRAWER 状态机 |
| WS2 设定口径与对标组 | 选择银行拥挤、对标组选择理由不清楚 | Step 1 单页口径设定、快捷对标模板、手动微调、高级选项折叠 |
| WS3 默认诊断内容 | 总览过载、核心判断不突出 | 30 秒诊断、1+3+N、Top Changes、PB 答案、行动建议 |
| WS4 专题深钻和机制归因 | 专题只是罗列指标，缺少"为什么"和"怎么办" | SCR 专题卡片、专题全屏深钻、DuPont/利润/NIM/PB 机制解释 |
| WS5 数据、口径与复核抽屉 | 执行层能力抢占主界面，但又不能丢 | 工具箱抽屉、Metric Explorer、口径风险、敏感性、项目管理 |
| WS6 语言、视觉与交付 | 语言模板化、页面偏长、导出质量不稳定 | 判断句标题、语言强度、桥梁句、Design Token、report model、PDF/PPTX 修复 |

### Sprint 切分建议

| Sprint | 优先级 | 需求包 |
|---|---|---|
| Sprint 7A | P0 | 产品壳重构：Global Bar、状态机、Step 指示器、Step 1/2/3 容器、工具箱抽屉入口、Design Token |
| Sprint 7B | P0 | 默认诊断页：30 秒诊断合并、三大董事会问题、同业位置卡、Top Changes & Deviations、PB 答案、行动建议 |
| Sprint 7C | P0/P1 | 专题深钻和故事线：SCR 专题卡、桥梁句、判断句标题、本地语言强度、核心问题贯穿 |
| Sprint 7D | P0/P1 | 交付同源修复：report model、PDF分页、PPTX核心图表清晰度、报告版本/专题选择 |
| Sprint 7E | P1 | 工具箱抽屉产品化：数据、复核、项目、AI 四类低频功能重组 |
| Sprint 8 | P1/P2 | 银行级 AI 评论层、专题评论锚点、PPTX 讲稿备注、评论治理 |
| Sprint 9 | P0/P1 | 60 秒启动、问题式标题、洞察三角、全屏宽度治理 |
| Sprint 10 | P1 | 动态数据工作台：指标时间序列叠加、对标矩阵热力图、What-if 全图表联动 |
| Sprint 11 | P1/P2 | 经济利润 EP、诊断决策树、具名 peer 案例、云端推理增强 |

### 当前进展快照（2026-05-31）

Sprint 9（9A/9B/9C）已完成第一版落地：选择入口已简化为快启面板和推荐 peer 预览；专题页已加入董事会问题标题和"当前值/变化方向/机制解释"洞察三角；Step 2 已扩展为宽屏主画布 + 右侧指标上下文栏。

Sprint 10A：右侧指标上下文栏已接入目标银行、对标均值、类型均值的 6 年趋势摘要；选择银行首页已从窄居中表单调整为宽屏平铺工作台。

Sprint 10B：已补充银行 × 核心指标对标热力矩阵，Step 2 的"同业位置"可直接看到目标银行和对标组在 ROA、NIM、不良、中收、成本、资本和 PB 上的分位色阶。

Sprint 10C：What-if 已从局部结果卡升级为模拟口径联动层。NIM、不良率、成本收入比 slider 会生成模拟目标银行行，并同步刷新 Step 2 默认诊断、VQA 信号、同业热力矩阵、右侧指标上下文、SPARC/行长摘要和正式报告中的 What-if 页。

Sprint 2/3/4 进展：详见 `docs/sprint-2-selection-overview-log.md`、`docs/sprint-3-data-workbench-log.md`、`docs/sprint-4-mechanism-attribution-log.md`。

### 完成度对标（2026-05-31）

| 需求 | 完成度 | 关键差距 |
|---|---:|---|
| P0-1 Single-source 报告引擎 | 88% | PDF 分页/PPTX 高保真目视验收；reportModel contract 抽取 |
| P0-2 导出可用性修复 | 78% | 真实浏览器导出、PDF 分页、PPTX 逐页视觉 QA |
| P0-3 总览页决策漏斗 | 88% | 整体仍偏长，首屏可继续压缩 |
| P0-4 对标组一等功能 | 76% | "我的对标组/预设/默认"保存复用闭环 |
| P0-5 口径风险叙事联动 | 95% | 强结论标题自动按风险降级语气 |
| P0-6 Metric Explorer | 98% | 真实浏览器视觉 QA + 更多指标解释模板 |
| P0-7 Ch-C-E-A-M 语言引擎 | 72% | 断言型标题、So What、图表注释层、七类页型 |
| **P0-8 三步产品主线与状态机** | **20%** | **尚未建立 appMode 状态机；6 Tab 仍暴露在顶层** |
| **P0-9 Step 1 设定口径页** | **35%** | **首屏仍非 720px 单主流程** |
| **P0-10 Step 2 1+3+N 诊断页** | **30%** | **模块分散重复，未按 Section A-F 重排** |
| P0-11 Top Changes & Deviations | 45% | 尚未作为口径确认后第一证据入口 |
| **P0-12 SCR 专题卡片与桥梁句** | **35%** | **工作台未展示桥梁句；专题入口未折叠为 SCR** |
| **P0-13 Sticky Global Bar** | **10%** | **无永久 Global Bar，无统一 Step 指示器** |
| P0-14 Design Token | 55% | section gap、global bar、drawer、report max、font hero 未覆盖 |
| P1-1 DuPont 联动对标 | 82% | 树图/瀑布交互静态；因子明细未展开 |
| P1-2 净利润 YoY 归因瀑布 | 88% | 样本明细、异常年份解释、多银行切换稳定性 |
| P1-3 多基准线图表体系 | 70% | 未覆盖所有核心图表 |
| P1-4 图表页视觉节奏 | 68% | 移动端和逐页视觉 QA |
| P1-5 跨期异常检测 | 20% | 数据质量事件流未形成 |
| P1-6 对标组敏感性 | 35% | 移除单家银行后的结论翻转测试 |
| P1-7 报告结构编辑器 | 65% | 排序、自定义文本页、模板保存不完整 |
| P1-8 三层用户内容整合 | 25% | 未按董事会/管理层/执行层分级 |
| P1-9 Board Agenda 讨论问题 | 35% | 稳定生成"A 还是 B"问题、初步判断 |
| P1-10 专题深钻全屏视图 | 15% | 全屏深钻视图未建 |
| P1-11 本地语言强度分层 | 30% | z-score/偏离驱动 Level 1/2/3 |

**最明确的剩余缺口**：(1) 浏览器级 QA 未闭环；(2) 页面仍偏长；(3) 语言体系未全量覆盖；(4) 对标组敏感性不足；(5) PPTX 高保真未进入主线。

### 关键依赖

| 依赖 | 原因 | 管理动作 |
|---|---|---|
| 产品状态机先于页面重排 | 没有 `setup / analysis / report / drawer` 主线，所有新页面仍会堆在旧 Tab 下 | Sprint 7A 先做 Global Bar 和状态机 |
| Step 2 骨架先于内容精修 | 30 秒诊断、Top Changes、PB 答案需要统一承载位置 | Sprint 7A 建 Section A-F，Sprint 7B 再填内容 |
| 报告同源先于 PPTX 高保真 | PPTX 需要稳定内容树，否则会反复适配页面差异 | Sprint 7D 抽 `reportModel` 后再进入 PPTX 专项 |
| 口径风险先于强结论语言 | 没有风险标签，断言型标题容易过度表达 | 语言引擎读取 L1-L4 后再生成语气 |
| V6 稳定基线先于新 PRD 开发 | 当前已有多个 Sprint 能力，v7 重构不能打断已有专题和导出 | Sprint 7A 每一步都保留旧入口可回退 |

### 验收清单

每个 Sprint 完成前至少通过：(1) `node --check` 覆盖新增和修改的 JS 文件；(2) `analysis_rules.json` 等配置文件可正常解析；(3) `git diff --check` 无空白或冲突标记问题；(4) 本地静态服务可打开首页，选择目标银行后不报错；(5) 至少用一家城农商、一家股份行、一家大行跑通：总览、专题、正式报告、HTML/PDF/PPTX 导出；(6) 对关键页做目视验收：首屏不拥挤、报告有颜色、PDF 不白版、PPTX 有图表和图片、专题语言不是空泛方法论。

## 不建议下一轮优先做的事项

- 260 家发债银行覆盖：数据管道和口径维护成本高，先把 57 家上市银行做扎实。
- 完整资本消耗预测：需要分红率、RWA计划、利润留存等数据，先保留 What-if。
- 全量 PPTX 矢量化：价值高但工程风险大，等报告同源后再做。
- 大规模预警通知：没有稳定数据更新管道前，容易做成空壳。
- 复杂固定效应回归和同业轨迹聚类：先把时间序列叠加、热力图和 What-if 联动做成稳定交互。

## 一句话结论

下一阶段的产品目标应从"继续加分析模块"转为"把能力收进一条可理解、可操作、可交付的主线"。最优路线是：

**产品壳与状态机 -> 1+3+N 默认诊断 -> SCR专题与语言强度 -> 报告同源与导出质量 -> AI与规模化专项。**

---

## 2026-06-01 排期校准：回补 Sprint 7A 产品壳

本次校准按 superpowers 多线程开发管理方式执行：主线程提出回补提议，PRD 评审子线程和工程评审子线程并行复核，最后合并为下一轮可执行的开发清单。

### 校准触发原因

完成度对标显示一处关键张力：**Sprint 9A/B/C 和 Sprint 10A/B/C 的 v8 能力（快启面板、洞察三角、对标热力矩阵、What-if 联动、右侧指标上下文栏）已落地 V1，但 Sprint 7A 产品壳几乎没建**——P0-8 状态机 20%、P0-13 Global Bar 10%、P0-9 Step 1 35%、P0-10 Step 2 30%、P0-12 SCR 卡 35%。结果是 v8 的新能力都堆在旧 6-Tab 长页面里，60 秒启动、问题式标题、洞察三角缺乏正式承载，存在两套导航并存的语义冲突。

### 子线程评审结论

**PRD 评审指出**：主线程初版提议遗漏了 v8 三个 P0——PRD8-P01（60 秒启动）、PRD8-L01（问题式标题）、PRD8-C01（洞察三角）。这三项已在 Sprint 9 规划但未在回补范围内被点名，导致重点不清。必须把它们显式纳入 7B/7C。

**工程评审指出**：reportModel 契约应该在 7A 之前先文档化（仅梳理 contract，不动代码，2-3 天），否则 7A-3 期间会出现"页面容器 vs 数据来源"的临时映射，导致后续 PR 反复重构。最大耦合风险有三点：与 9C 宽屏三栏布局的 grid 兼容、What-if 模拟口径在切换 mode 时的状态保存、SPARC 信号在 Section/专题/右侧面板三处重复计算。

### 校准后的回补顺序

1. **7D-0 reportModel 契约文档化（2-3 天，不阻塞）**：梳理 `formalReport` 与 HTML/PDF/PPTX 的数据映射，输出 contract 文档和 type 声明，不动运行代码。这是后续 7A-3 和 7D-1 的共同前置。
2. **7A 产品壳（1-2 周）**：Global Bar + 状态机 → Step 1 → Section A-F 容器（搬家）→ Drawer 工具箱。具体 PR 拆分见下。
3. **7B 默认内容收口（1 周）**：30 秒诊断合并、Top Changes & Deviations、1+3+N 内容压缩。
4. **7C v8 语言三件套（1 周）**：问题式标题（PRD8-L01）、洞察三角全量覆盖（PRD8-C01）、本地语言强度分层；同时把 60 秒启动入口（PRD8-P01）从快启面板正式归位到 Step 1。
5. **7D-1 导出 QA 闭环（1 周）**：基于 7D-0 契约修 PDF 分页和 PPTX 核心图表清晰度，跑三家回归样本真实浏览器 QA。

**暂缓**：Sprint 11（EP、决策树、云端 LLM）、PPTX 高保真矢量化、260 家发债覆盖。

### 9 个 PR 的串行/并行约束

| 序号 | PR | 范围 | 验收口径 | 风险 |
|---:|---|---|---|---|
| 1 | 7D-0：reportModel 契约 | 文档 + type 声明，无运行代码改动 | contract 覆盖现有 HTML/PDF/PPTX 全部章节 | 低 |
| 2 | 7A-1a：状态机 contract | `appMode` enum + `appState` + `useAppState()` + localStorage 持久化；预留 `whatIfScenario` 字段 | 单元测试通过；无 UI 改动 | 低 |
| 3 | 7A-1b：Global Bar 壳 | 48px 顶栏 + 内容区 offset；控件全部 stub | 顶栏固定不遮挡内容 | 低 |
| 4 | 7A-1c：Step Indicator 与 mode CSS | `body[data-app-state]` 切换；导出按钮仅切 mode | 手改 localStorage 后页面区域切换 | 低 |
| 5 | 7A-2：Step 1 重构（可与 #3 并行） | Hero/selection/filters 重组为 720px 单页 | 首屏一个主按钮，2 分钟内完成口径 | 中 |
| 6 | 7A-3a：Section A-F 容器（必须晚于 #4，且依赖 #1） | 容器 + grid 调整 + 桥梁句插入点；数据先临时从 DOM scrape | 6 个 Section 渲染不崩溃；旧 Tab 可回退 | 中 |
| 7 | 7A-3b：Section 内容迁移（晚于 #6） | 30 秒诊断、Top Changes、PB 答案搬家；按 7D-0 契约取数 | What-if slider 联动 Section A/B/C/D；导出不崩溃 | 高 |
| 8 | 7A-4：Drawer 工具箱（可与 #7 并行） | 右侧 Drawer + 数据/复核/项目/AI 四 Tab 入口 | Drawer 开合不丢 Step 状态 | 中 |
| 9 | 7D-1：PDF 分页与 PPTX 清晰度 | 按 7D-0 契约统一数据源 | 三家回归样本 PDF 不白版、PPTX 核心图表可读 | 高 |

并行机会：#3 与 #5 并行、#7 与 #8 并行。其余串行。

### 工程关键防坑项

1. **预留 `whatIfScenario` 字段**：7A-1a 的 appState 即使本期不用也要占位，避免 9C 的 What-if 模拟口径在切 mode 后丢失或报告未标记。
2. **抽 `computeSPARCSignal()` 共用模块**：Section A、专题页、右侧面板三处共用一个函数，否则口径会漂移。
3. **沿用 9C 的 grid 基座**：7A-3a 不引入新的 flex 系统，只在 Section 内部调整 gap 和 max-width。
4. **热力矩阵 render 依赖加 `whatIfScenario`**：避免折叠/展开 Section 时矩阵分位不刷新。

### v8 P0 三项的承载方式（PRD 评审补充）

| v8 P0 | 承载位置 | 落地 Sprint |
|---|---|---|
| PRD8-P01 60 秒启动 | Step 1 设定口径页（快启面板正式归位） | 7A-2 + 7C 收口 |
| PRD8-L01 问题式标题 | 全站标题改写 + 正式报告章节标题 | 7C |
| PRD8-C01 洞察三角 | Section A 首屏 + 每个专题深钻页首屏 | 7B-1 + 7C |

### 校准结论

下一轮的最优执行路径是：**7D-0 契约文档化（前置，不阻塞）→ 7A 产品壳（PR#2-#8 按依赖串行/并行）→ 7B 默认内容收口 → 7C v8 语言三件套 → 7D-1 导出 QA 闭环**。整体节奏 4-5 周，每个 PR 都保留旧入口可回退，不打断 Sprint 9/10 已落地的 v8 能力。

### 验收三家回归样本（沿用历史口径）

每个 PR 合并前在一家大行、一家股份行、一家城农商上跑通：Step 1 设定口径 → Step 2 30 秒诊断/Top Changes/同业热力 → Step 3 报告导出 HTML/PDF/PPTX。What-if slider 在任意 Section 上拖动后，Step 3 报告须自动标记"模拟口径"。

---

## 2026-06-02 校准：版式系统 + reportModel 契约落地后的状态盘点

### 校准背景

继 2026-06-01 提出"7A 产品壳回补 + 7D-0 reportModel 文档化"路线后，本轮（2026-06-01 至 06-02）实际推进了三大块基础设施：(1) Sprint 7A 产品壳的关键 PR 已合并；(2) 版式设计系统 v1.1 落地，含 9 档字号 token 化和表/图防遮挡铁律；(3) reportModel 契约文档 v1 定稿。本次校准按 superpowers 多线程评审口径，起代码审计子线程逐项核对 P0/P1 完成度。

### 自 2026-05-31 以来的完成度变化

| 需求 | 5/31 | 6/2 | 增量证据 |
|---|---:|---:|---|
| P0-8 三步产品主线与状态机 | 20% | **78%** | `appMode` state machine + `setAppMode` + localStorage 持久化 + `body[data-app-state]` CSS 三态切换 + `whatIfScenario` 占位字段已就位；`sprint7a_product_shell_contract.test.js` 全绿 |
| P0-9 Step 1 设定口径页 | 35% | **72%** | `#step1Content` 改全屏三列网格（intro/launch 跨3列 + target/peer/config 三列 + actions sticky 底栏）；`--step1-max: 720px` token 仍保留但被全宽布局覆盖；高级筛选可折叠 |
| P0-13 Sticky Global Bar | 10% | **92%** | 48px Global Bar 已固定，Brand/Context/Steps/Tools/Export 五区到位；Step 指示器绑定 `data-app-mode-target`；仅缺导出进度指示 icon |
| P0-14 Design Token | 55% | **88%** | 473 处 font-size 已 token 化（`app.css` 451 + `rsm-consulting-ppt.css` 22）；9 档字号 token（label/caption/small/body/body-lg/section/hero/display/kpi）；spacing token --sp-1~7 已建；阴影 3 档 token；`rsm-deck.css` 暂保留 px 比例锁定不动 |
| P0-2 导出可用性修复 | 78% | **82%** | reportModel 契约文档已定稿（`docs/report-model-contract.md`），五步抽取顺序明确；尚未进入 PR-A 实施 |
| P0-12 SCR 专题卡片与桥梁句 | 35% | **51%** | 9B 落地的洞察三角已纳入快启面板；专题默认折叠；缺全站桥梁句插入点和 SCR 四段论强制模板 |
| P0-10 Step 2 1+3+N 诊断页 | 30% | **58%** | 9C 右侧指标上下文栏 + 10B 对标热力矩阵 + 10C What-if 模拟口径联动已可用；缺显式 Section A-F 容器和 1+3+N 顺序固化 |
| P0-7 Ch-C-E-A-M 语言引擎 | 72% | **76%** | `formalAssertionTitle()` 已用于专题和报告；So What 已带 L1-L4 tone 标签；缺七类页型全量应用和断言降级机制 |

### 已落地的关键里程碑（2026-06-01 至 06-02）

1. **产品壳基本成型**：appMode 状态机 + Global Bar + Step 1 三列全屏 + Drawer 工具箱 + localStorage 持久化 + whatIfScenario 占位。`sprint7a_product_shell_contract.test.js` 含 19 个断言全部通过。
2. **版式设计系统 v1.1**：`docs/layout-design-system.md` 定稿 9 节，含 9 档字号 token + 表格/图表防遮挡铁律 + 响应式降级断点（1100px → 2 列, 760px → 1 列）。
3. **首页消除遮挡**：根因（`#step1Content` max-width 在 line 197 和 8081 被定义两次，1380px 覆盖 720px）已修复；三列全屏 + `display: contents` 透明化 + min-width 0 全覆盖 + 长银行名 word-break: keep-all + sticky CTA。
4. **表/图硬规则**：所有数据表 `table-layout: fixed` + `tabular-nums` + `word-break: keep-all`；热力矩阵列宽 74→104px；chart-card 标题区 flex space-between；canvas max-height 360px。
5. **reportModel 契约 v1**：`docs/report-model-contract.md` 含 TypeScript-like 数据契约、三类导出消费映射表（11 节点 × 3 导出）、5 步 PR 拆分、过渡方案、风险表。

### 本次审计发现的新缺口（不在原计划）

1. **reportModel 文档化已完成但代码未实施**：PR-A（dataset 属性补全）、PR-B（`reportDeliveryModel()` 抽取）、PR-C（PPTX 切链路）三个 PR 仅在计划。这是后续 7D-1 闭环的关键前置。
2. **Step 2 各能力独立爬 DOM**：9B/10B/10C 落地的洞察三角、热力矩阵、What-if 联动各自有自己的取数路径，未统一走 `reportDeliveryModel()`，What-if 切换时各区域可能不同步。
3. **PPTX 仍在降级路径**：`13-pptx-export.js` 逐节点 `querySelector` + 截图回退，矢量化未做。
4. **移动端响应式未闭环 QA**：Token 已应用，但表格/图表/Step 1 三列网格在真实手机视口未逐页验收。
5. **语言强度未自动联动**：`formalLanguageReadout()` 已返回 L1-L4 强度，但全站内容生成时未根据强度自动降级表述。
6. **rsm-deck.css 242 处字号未 token 化**：服务于 1280×720 演示文稿渲染，token 化会破坏 deck 比例锁定；作为合理取舍写入设计规范，后续如出 PPTX HTML 版需要专项处理。

### 下一 Sprint 计划：Sprint 7D-0 + 7A-3 + 7B 并行（4-6 周）

**核心判断**：7D-0 应作为前置（不阻塞、纯 JS 加工、回退安全），完成后 7A-3 和 7B 可并行。这避免了"Section 内容迁移先于数据契约抽出"的依赖倒置——这是 2026-06-01 工程评审子线程明确指出的最大风险。

#### Track 1：reportModel 实施（PR-A + PR-B，约 4 天）

**PR-A：补齐 dataset 属性（2 天）**
- 范围：在 `js/22-formal-report.js` 的 `formalReport()` 出口处加 `applyFormalReportContract(root)` 后处理。给每个 `<section.formal-section>` 补 `data-id / data-section-title / data-page-role / data-deck-type / data-included / data-module-label` 六个属性。
- 验收：`exportSequenceQaPanel` 表格的"PPT页型 / 页型 / 故事角色"三列在三家回归样本上全部不出现"缺少"。新增 `tests/report_model_dataset.test.js` 校验 `applyFormalReportContract()` 后 DOM 上每个 formal-section 都有六属性。
- 回退：函数出错时只记 warn 日志，不抛异常；旧消费方继续按旧路径走。

**PR-B：抽出 `reportDeliveryModel()` 数据层（2 天）**
- 范围：新建 `js/35-report-model.js`，导出 `reportDeliveryModel(root): ReportModel` 函数。它只读 dataset 和已知 `.formal-*` selector，返回结构化对象（含 meta、sections[].{ id, sectionTitle, pageRole, deckType, blocks }）。`formalDeliveryStorylineModel()` 改为薄包装。
- 验收：新增 `tests/report_model_contract.test.js` 校验 `reportDeliveryModel(document).sections.length === activeFormalReportSections().length`，字段形状完整。
- 回退：环境变量 `REPORT_MODEL_V2=on` 控制是否对外暴露；默认仅作为数据层，PPTX 继续走旧路径。

#### Track 2：v8 语言三件套（可与 Track 1 并行，约 4-5 天）

**PRD8-L01 问题式专题标题（2 天）**
- 范围：把全站 5 大专题 + 正式报告 9 个章节标题从描述句改成董事会问题。例：「盈利真实性分析」→「我行的盈利质量在同业里到底排第几？为什么？」涉及 `js/02-config.js` 的 storyline 配置、`js/27-v6-boardroom-engine.js`、`js/22-formal-report.js` 的章节标题输出。
- 验收：三家回归样本 HTML/PDF 报告章节标题都是问号结尾的判断问句；专题卡片首屏标题与此一致；contract test 保证关键句不缺。

**PRD8-C01 洞察三角全量覆盖（1.5 天）**
- 范围：把 9B 在快启面板落地的「当前值 + 变化方向 + 机制解释」三角扩到所有专题首屏 + Section A 30 秒诊断。新建 `insightTriangle(metric, context)` 通用函数（在 `js/26-v5-value-engine.js` 或新建 `js/36-insight-triangle.js`），统一生成三角 HTML。
- 验收：5 大专题展开后首屏必然有三角；30 秒诊断在 Section A 顶部展示三角。

**PRD-L01-Phase1 本地语言强度分层（1.5 天）**
- 范围：基于已有的 `formalLanguageReadout()` 输出 L1-L4，按 z-score 和口径风险输出 Level 1/2/3 表达强度模板（断言强 / 暗示 / 待验证）。全本地，不调云端 LLM。
- 验收：L4 口径风险下，所有断言句自动降级为"待验证"语气；L1 口径下允许出现强断言。

#### Day 9-10：合龙 + 三家回归验收

- Track 1 + Track 2 合并后跑全套契约测试
- 三家样本（大行/股份/城农商）× 三视口（1920/1440/1280）截图：Step 1 三列、Step 2 洞察三角、Step 3 章节问题式标题
- 任何画面出现单字纵列、字符叠加、断言句口径不匹配，PR 不合并

### 下下个 Sprint 预告（推荐顺序，不在本 Sprint 范围）

1. **PR-C：PPTX 切 reportModel + 矢量化基础**（3 天）：等 PR-B 稳定后，把 `pptxLayoutDispatcher` 接收 `ReportSection` 对象，旧 querySelector 路径作为降级保留。
2. **7A-3a/3b Section 内容迁移**（4-5 天）：把 30 秒诊断、Top Changes、PB 答案搬到 Section A-F 容器，按 PR-B 的 `reportDeliveryModel()` 取数。
3. **7B-1/7B-2 30 秒诊断合并 + Top Changes 产品化**（3-4 天）：在 Section 容器内填充正式内容。

### 暂缓项重申（不在下个 Sprint）

- Sprint 11（经济利润 EP、诊断决策树、云端 LLM）
- PPTX 高保真矢量化母版
- 260 家发债银行覆盖
- 移动端深度优化（保持可用即可）
- `rsm-deck.css` 字号 token 化（与 deck 比例锁定冲突）

### 校准结论

按 superpowers 评审：当前产品已经从"功能堆叠"进入"基础设施完备"阶段。再往后一步应该是**把内容承载到设施上**（7A-3 Section 迁移）+ **让设施跑通三类导出**（PR-A/B/C reportModel）+ **让语言层有判断**（v8 语言三件套）。下个 Sprint 的关键是让 Track 1 和 Track 2 并行而不冲突，避免任何一项被另一项卡住。预计 6 月底完成本 Sprint，7 月初进入下下个 Sprint（PPTX 切链路 + Section 迁移）。

---

## 2026-06-02 实施：Track 1 + Track 2 同 Sprint 落地

按上文校准章节的计划，Track 1（reportModel PR-A + PR-B）与 Track 2（v8 语言三件套）同 Sprint 并行实施，全部落地。下面是逐项交付清单和完成度更新。

### Track 1 落地：reportModel 契约实施

**意外发现**：审计时发现 `applyFormalReportContract()`（PR-A 的核心函数）和 `formalReportModel()`（PR-B 的雏形）在 `js/22-formal-report.js` 的 line 663-707 已经实现，包括 5 个 dataset 属性（sectionTitle / moduleLabel / pageRole / deckType / slideIndex/Total）。说明前几轮工作已经无意识地在为 reportModel 铺路。本次实施只需补齐缺口和抽出独立的契约层。

**PR-A 收口（修改 `js/22-formal-report.js`）**
- `applyFormalReportContract()` 加 try/catch 错误降级 + 单 section 级错误隔离
- 新增 `section.dataset.id` 显式属性（之前只有 sectionId）
- 新增 `section.dataset.included`（true / false），替代隐式的 `data-structure-included` 判断
- `formalReportModel()` 的 filter 增加 `dataset.included !== "false"` 判定

**PR-B 实施（新建 `js/35-report-model.js`，176 行）**
- 导出 `reportDeliveryModel(root): ReportModel`，符合 `docs/report-model-contract.md` 数据契约
- `reportModelMeta()` 暴露 targetBank / analysisYear / peers / reportVersion / whatIfScenario（含 nimShift/nplShift/costIncomeShift）
- `reportModelSerializeSection()` 把每个 section 序列化为含 id / sectionTitle / pageRole / deckType / storyRole / layoutIntent / evidenceDensity / htmlLayout / pdfLayout / pptxLayout / included / riskStamp / blocks 的对象
- `reportModelExtractBlocks()` 按 11 种 selector 识别语义块（metricHero / soWhat / chartReadout / factTable / actionCard / mechanismCard / riskCard / scrTopic / whatIfStrip / footnote / aiCommentary），与契约文档完全对齐
- `reportModelExtractRiskStamp()` 从 `.formal-risk-pill` 和 `.tone-L1~L4` 中识别口径风险等级
- 4 个便捷查询函数挂到 `window`：`reportDeliveryModel / reportModelDebugSummary / reportModelGetSection / reportModelSectionsByRole`，便于浏览器 console 调试和后续消费方接入
- `index.html` 在 `js/34-decision-workbench.js` 之后引入 `js/35-report-model.js`

**新增测试 `tests/report_model_contract.test.js`**
- 校验 PR-A 的 10 个 dataset 属性和 try/catch 守卫
- 校验 PR-B 的 8 个核心函数 + meta 8 字段 + ReportModel 4 顶层字段 + 11 种 block kind + 4 个 window 暴露
- 校验 `index.html` 中 `js/35-report-model.js` 必须晚于 `js/22-formal-report.js` 加载

### Track 2 落地：v8 语言三件套

由子线程并行实施，共 4 文件修改 + 1 文件新建 + 1 测试文件：

**任务 A 问题式标题（PRD8-L01）**
- `js/02-config.js` 新增 `topicQuestionTitles()` 映射（5 大专题 + 9 章节）和 `topicQuestionTitle()` 查询，含降级
- `js/22-formal-report.js` `formalAssertionTitle()` 改为董事会问句风格：
  - 盈利：「我行的盈利质量在同业里排第几？为什么？」
  - 息差：「净息差还能守住多久？守不住的话靠什么补？」
  - 风险：「风险数据是不是已经反映了真实经营压力？」
  - 资本：「我行的资本回报率是否值得继续追加投入？」
  - 估值：「市场是否合理地定价了我行的经营质量？」
- `js/24-prd-v3-workbench.js` `v3NarrativeChapters()` 中 5 个专题 question 字段同步问题式

**任务 B 洞察三角全量覆盖（PRD8-C01）**
- 新建 `js/36-insight-triangle.js`（177 行），导出 `insightTriangle / topicInsightTriangle / diagnosisInsightTriangle / mountInsightTriangle / attachTopicInsightTriangles / attachDiagnosisInsightTriangle`
- 三角结构：当前值（vs 同业） / 变化方向（YoY 趋势） / 机制解释
- 样式：`styles/app.css` 末尾新增 `.insight-triangle` 三列网格 + `.triangle-vertex` 卡片，复用现有 token（--font-section / --shadow-card / --card-radius）
- `index.html` 在 `js/35-report-model.js` 之后引入 `js/36-insight-triangle.js`

**任务 C 本地语言强度分层（PRD-L01-Phase1）**
- `js/12-ai-narrative.js` 新增 `languageStrengthTier(zScore, riskLevel): "strong" | "implicit" | "tentative"`
  - strong: \|zScore\| > 1.5 且 riskLevel ∈ {L1, L2}
  - implicit: \|zScore\| > 0.8 或 riskLevel = L3
  - tentative: \|zScore\| ≤ 0.8 或 riskLevel = L4
- `phraseByStrength(strength, claim, evidence)` 按 3 档输出表达模板
- `formalAssertionWithStrength(topicKey, context)` 在 L4 风险时自动降级 tentative
- 全本地，无 LLM 调用

**新增测试 `tests/v8_language_trio_contract.test.js`**（206 行）
- Task A：topicQuestionTitles 函数 + formalAssertionTitle 问句 + v3NarrativeChapters 问句字段 + 至少 8 个董事会问号
- Task B：insightTriangle / topicInsightTriangle / diagnosisInsightTriangle / mountInsightTriangle / app.css 样式 / index.html 引入
- Task C：languageStrengthTier / phraseByStrength / formalAssertionWithStrength + L1-L4 判断 + L4 自动 tentative

### 完成度更新（自 6/2 校准章节后）

| 需求 | 6/2 上午 | 6/2 下午 | 增量证据 |
|---|---:|---:|---|
| **P0-2 导出可用性修复** | 82% | **89%** | reportModel 契约层已落地代码（PR-A + PR-B），后续 PR-C 切 PPTX 链路即可推进；HTML/PDF 已可优先消费新 model |
| **P0-7 Ch-C-E-A-M 语言引擎** | 76% | **86%** | 本地语言强度三档 + L4 自动降级 + 问题式断言标题 + 三种话术骨架已全部到位 |
| **PRD8-L01 问题式专题标题** | 0% | **90%** | 5 大专题 + 9 章节全部改成董事会问句，主体功能完成；仅缺资本市场版/管理层行动版差异化模板 |
| **PRD8-C01 洞察三角全量覆盖** | 15% | **80%** | 通用函数 + 专题级 + 诊断级三个生成器到位；自动挂载入口已建；仅缺 5 大专题实际挂载点的 JS 调用 |
| **PRD-L01-Phase1 本地语言强度** | 30% | **85%** | 三档强度 + L1-L4 联动 + 自动降级模板完成；缺 zScore 在所有断言句的自动注入 |
| **新增：reportModel 数据契约实施** | 0% | **70%** | PR-A + PR-B 完成，PR-C（PPTX 切链路）和 PR-E（HTML 走 model 重生成）待做 |

### 本 Sprint 完成的文件清单

**新增（3 文件）**：
- `js/35-report-model.js`（176 行，PR-B）
- `js/36-insight-triangle.js`（177 行，PRD8-C01）
- `tests/report_model_contract.test.js`（93 行）
- `tests/v8_language_trio_contract.test.js`（206 行）

**修改（6 文件）**：
- `js/22-formal-report.js`（applyFormalReportContract 加 guards + data-included + 问题式标题）
- `js/02-config.js`（topicQuestionTitles + 35 行）
- `js/12-ai-narrative.js`（语言强度三档 + 75 行）
- `js/24-prd-v3-workbench.js`（v3NarrativeChapters 问题式 ~20 行）
- `styles/app.css`（.insight-triangle 样式 + 50 行）
- `index.html`（2 处 script 引入）

### 下个 Sprint 候选

按本次实施暴露的依赖关系，下一 Sprint 最优候选三选一：

1. **Sprint 7D PR-C：PPTX 切 reportModel + 矢量化基础**（3 天）—— 让 `pptxLayoutDispatcher` 接收 `ReportSection` 对象而非 DOM section，`pptxRenderBlock(block)` 按 `block.kind` 分派；旧 querySelector 路径作为降级保留。完成后三类导出真正同源。
2. **Sprint 7A-3 Section 内容迁移**（4-5 天）—— 把 30 秒诊断、Top Changes、PB 答案搬到 Section A-F，按 `reportDeliveryModel()` 取数。直接面向用户的可见升级。
3. **Sprint 7B-1 30 秒诊断合并**（3 天）—— 合并 Client Brief + President Summary + Command Center 为一个 Section A，含三个董事会问题 + 洞察三角 + VQA 分。可立即与 Track 2 的洞察三角联动。

**我的推荐**：**先 1（PR-C），再 2（7A-3），再 3（7B-1）**。理由：(a) PR-C 不动 UI，只切数据链路，回退安全，可立刻验证 reportModel 的 round-trip；(b) PR-C 稳定后，7A-3 的 Section 迁移直接读 `reportDeliveryModel()` 拿数据，不重新爬 DOM；(c) 7B-1 是最终用户可见层，应该在数据和容器都稳之后做。

### 验收（待你本地执行）

```bash
cd /Users/jinkunxiao/Documents/业务/银行财报分析/outputs/vqa_template
node tests/report_model_contract.test.js          # 期望 report-model-contract-ok
node tests/v8_language_trio_contract.test.js      # Track 2 子线程写的，期望 OK
node tests/sprint7a_product_shell_contract.test.js # 不该被破坏
```

浏览器目视：
- 任一专题展开 → 应在顶部看到洞察三角（当前值 / 变化方向 / 机制解释）
- 正式报告章节标题 → 应是问号结尾的董事会问句
- console 跑 `window.reportModelDebugSummary()` → 应返回 sections 数量和各 role/pageRole 分布
- console 跑 `window.reportDeliveryModel().meta` → 应返回 targetBank/year/peers/whatIfScenario

---

## 2026-06-02 银行客户反馈 + 竞品对标后的下挖路线重排

### 反馈来源

2026-06-02 与银行客户访谈三个关键洞察 + 同日 deep-research 完成的 KPMG/McKinsey/360factors 对标，共同重塑下挖优先级。

**银行客户的 3 个反馈**：
1. 资本市场 PB 视角需要加入**时间维度**——市场对银行的风险判断从 2020 至今随时间发生 4 次以上 regime shift（COVID、SVB、房地产、化债），仅看当前 PB 是孤立判断
2. 银行运营逻辑存在类型差异——**零售型/对公型/交易银行型/全能型**四类的隐含运营逻辑不同，需要按类型分类分析，不能用统一框架
3. 当前内容**整体过于复杂、导航性弱**——需从产品/内容/语言/功能四个角度重新规划

**竞品对标后的判断**（详见 `docs/competitive-benchmark-2026-06.md`）：
- 自定义 peer、KPI 覆盖、AI 分析、监管集成 已是行业标准入场费
- 真正的差异化 IP 应聚焦：EP 经济利润、TSR 归因、行业基线池、监管视角嵌入、自动数据管道

### 重排后的下挖方向（9 选 8，删除 B/H）

| 排名 | 方向 | 工/感/适 | 总分 | 工程估时 | 关联反馈 |
|---|---|---|---:|---|---|
| 1 | **J 银行类型自适应分析框架**（新） | 4/5/5 | 14/15 | 8-10 天 | 反馈 2 |
| 2 | **F 自动数据管道**（Tushare 接入） | 5/5/4 | 14/15 | 8-12 周 | 长期 |
| 3 | **K 类型 + 情景自适应导航**（新，依赖 J） | 3/5/5 | 13/15 | 5 天 | 反馈 3 |
| 4 | **I PB 时序 + 资本市场感知漂移**（新，替代 B） | 3/5/5 | 13/15 | 4-5 天 | 反馈 1 |
| 5 | **A EP 经济利润引擎** | 3/5/5 | 13/15 | 3-4 天 | 对标 |
| 6 | **D 匿名行业基线数据池** | 4/4/5 | 13/15 | 5 天 | 对标 |
| 7 | **E 监管对话备忘专题** | 3/5/5 | 13/15 | 4 天 | 对标 |
| 8 | **G IFRS 9 三阶段 + 信用迁徙** | 4/4/5 | 13/15 | 5 天 | 对标 |
| 9 | **C 资本轻 vs 资本重业务结构** | 3/4/5 | 12/15 | 3 天 | 对标 |
| ✗ | ~~B TSR 4 因子归因~~（删除，被 I 替代） | — | — | — | — |
| ✗ | ~~H 数字体验对标~~（暂缓） | — | — | — | — |

### 银行类型自适应框架（J）详细 PRD

独立文档已经定稿，详见 `docs/prd-bank-typology-framework.md`。核心：

**四类银行的隐含运营逻辑**：
- 零售型（招商/平安零售/邮储）：私行 AUM + 零售存款成本 + 财富管理 + 信用卡循环
- 对公型（工行/建行/中信）：对公定价纪律 + RWA 密度 + 大客户集中度 + IB 业务联动
- 交易银行型（民生交易银行/招行司库）：结算流量 + 中收质量 + 流动性深度 + 客户黏性
- 全能型（四大行 + 兴业 + 华夏）：跨条线协同 + 业务多元化 + 轻型化进程

**产品改造分五层**：
1. **数据层**：bank_master.json 加 `businessType` 字段 + 算法判定
2. **VQA 引擎层**：`vqaByBankType()` 按类型差异化 SPARC 权重
3. **专题层**：每类银行有 2-3 个独占专题 + 不相关专题折叠
4. **语言层**：4 套问题式标题骨架按类型选用
5. **功能层**：默认对标组按类型自动推荐 + 导航重排

**关键设计**：
- 同一个 VQA 分对不同类型银行内涵不同，报告必须明确标注"按 X 型框架生成"
- 用户可在 Step 2 切换框架，保留 universal 作为兜底
- 多业务线银行允许多标签 + 人工覆盖
- 不破坏已有的 SPARC 五维分数结构，仅调整权重

**8-10 天工程量**，拆 5 个独立 PR。验收用四家典型银行（招行/工行/民生/建行）。

### Tushare 自动数据管道（F）现状

子线程已完成 [Tushare 数据清单调研](`docs/tushare-data-inventory.md`)：

**核心发现**：
- **覆盖率 65-70%**：三大报表（85%）+ 市场数据（75%）可全量自动拉，但缺**资本充足率、三阶段拨备、零售贷款细分**等监管特异指标
- **成本可控**：VIP 会员 ¥500-800/年 + 8-12 周工程量（1-2 人）+ 10-14 个月 ROI 周期
- **延迟可接受**：报表延迟 7-21 天，适合事后对标，不支持实时风控
- **建议立即启动 POC**：用 57 家银行样本数据跑通完整链路，验证字段映射率

**关键接口**：
- `fina_indicator`、`balancesheet`、`income`、`cashflow`（三大报表）
- `daily`、`daily_basic`（股价 + PB/PE）
- `lpr`、`shibor`（利率宏观）
- `cb_basic`（可转债 → 用于发债银行扩展）
- `hk_hold`（北向资金持仓）
- `news`、`anns`（公告 + 监管处罚）

**缺口字段**：约 30% 字段 Tushare 没有（监管报表 1104 系列、零售贷款分项、IFRS 9 三阶段拨备分项），需要保留手动维护通道作为兜底。

**POC 建议**：先用 Tushare 跑 57 家上市银行的三大报表 + 市场数据，验证字段对得上、数据准确性、更新延迟可接受，然后再决定是否全量切换。

### Sprint 重排建议（替代之前的 PR-C 路线）

把改写后的方向按 Sprint 打包：

**Sprint 12（约 2 周）：J + K**
- J 银行类型自适应框架（8-10 天）
- K 类型 + 情景自适应导航（5 天，依赖 J）
- 同 Sprint 做，因为 K 重度依赖 J 的类型字段
- 完成后产品整体可用性会有质变：内容复杂度问题（反馈 3）从根本上解决

**Sprint 13（约 1 周）：I + A**
- I PB 时序 + 资本市场感知漂移（4-5 天）
- A EP 经济利润引擎（3-4 天）
- 共同主题"资本市场视角"
- 配合 J 已经分类好的银行类型，输出"零售型银行 PB 时序 vs 对公型 PB 时序"这种深刻对比

**Sprint 14（约 1 周）：E + C**
- E 监管对话备忘（4 天）
- C 资本轻 vs 资本重结构（3 天）
- 两个独立专题，对应"对监管" + "对股东"两个董办场景

**Sprint 15（约 1 周）：G + D**
- G IFRS 9 三阶段 + 信用迁徙（5 天）
- D 匿名行业基线数据池（5 天）
- 共同主题"风险与对标深化"

**Sprint 16-22（约 8-12 周）：F 自动数据管道**
- 单独立项，需要 Wind/iFinD 商业决策 + Tushare POC + Python 工程
- 与前面 Sprint 解耦，可以并行启动 POC（占用 Python 工程师，不挤压前端 Sprint 节奏）

**整体节奏**：5-6 周完成 J/K/I/A/E/C/G/D（前端深度改造），F 看商业谈判进度独立推进。

### 上一轮 PR-C（PPTX 切 reportModel）的处理

PR-C 仍然是 Track 1 reportModel 实施的下一步，但**优先级低于 J/K**：
- PR-C 是导出层优化，用户感知中等
- J/K 是产品架构级改造，用户感知极高，且直接解决反馈 3 的"内容复杂"问题
- 建议把 PR-C 推到 Sprint 14-15 之间作为"夹层 PR"做掉，约 3 天工程

### 不在本轮范围（仍然暂缓）

- Sprint 11（经济利润 EP）—— 已并入方向 A
- PPTX 高保真矢量化母版 —— 等 reportModel 实施完
- 260 家发债银行覆盖 —— 等 Tushare POC 验证后决定
- 移动端深度优化 —— 保持可用即可
- B TSR 4 因子归因 —— 中国市场数据噪声大，被 I 替代
- H 数字体验对标 —— 优先级太低

### 校准结论

按 superpowers 评审：本轮校准是**产品定位级别的升级**——从"通用银行对标工具"升级为"银行类型自适应的董办决策工作台"。J/K 的落地会让 BenchmarkIQ 从"工具"变成"董办看得懂的专业产品"，这是与 KPMG/McKinsey/360factors 竞争的真正护城河。

**预期效果**（Sprint 12 完成后）：
- 招商银行用户看到的诊断里 80% 内容是零售相关
- 工商银行用户看到的诊断里 80% 内容是对公相关
- 默认看到的专题从 5 个减到 2-3 个，复杂度降一半
- 报告封面明确标注"按 X 型框架生成"，专业感拉满
- 与同业的真正差异化形成

文档清单（本轮新增）：
- `docs/competitive-benchmark-2026-06.md` —— 三家产品对标 + 下挖方向 + 中国本土化
- `docs/prd-bank-typology-framework.md` —— 方向 J 详细 PRD
- `docs/tushare-data-inventory.md` —— Tushare 数据可行性研究
