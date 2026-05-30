# Agent runtime brief — rsm-board-deep-analysis

## Core principle

每一页都必须能在没有讲者口述的情况下被董事独立读完。标题告诉读者"读什么"、副标告诉"为什么读"、正文给出"数据陈述+排名/对比"、页脚给出"来源"——四层缺一不可。**绝对不允许出现需要讲者解释的页面**。

## Context the agent must establish before generating

> Before producing the deck, the agent must know each item below.
> - If the user's prior messages already supply an item, use it; do NOT re-ask.
> - If an item can be reasonably inferred from the user's stated topic, infer it and state the assumption inline on slide 2.
> - Ask only what is missing AND cannot be inferred — one targeted question at a time, not a script.

1. **被分析对象**：哪家公司 / 哪个机构 / 哪个业务单元，及其所在行业（决定专题模块的具体内容）
2. **受众场景**：是给上市公司董事会、内部高管、外部客户高层、还是监管部门？决定语言密度与背景假设
3. **核心问题**：本次分析要回答"被分析对象的价值/绩效/风险是否健康"还是"应当采取什么战略行动"或两者兼顾
4. **数据基础**：用户是否已经提供数据材料，还是需要 agent 检索（如已提供，agent 必须 100% 基于材料，不允许编造）
5. **对标样本**：5-15 家可比同业；如用户未指明，应提议并请用户确认
6. **目标页数**：默认建议 40-50 页，可在 30-60 之间调整
7. **方法论选择**：用户是否有特定分析方法论（如本次的 VQA + PB 计量是银行业专属，下次场景可能完全不同）

## Mandatory checks (during generation)

### 每一页生成时必查

- ✅ 标题 H1 是否是一句"论点"（不是描述性短语）
- ✅ 副标 H2 是否补充"为什么读这页"
- ✅ 是否有数据来源条
- ✅ 是否所有英文术语在首次出现时已用括号注解
- ✅ 是否避免了比喻、评价化、文学化语言（参考 language-discipline.md）
- ✅ 是否符合 1920×1080 画布限制

### 整体结构检查（每完成一个 batch）

- ✅ 是否遵循 SCQA 节拍（S→C→Q→A 占比约 10% / 15% / 55% / 20%）
- ✅ 是否每个主题模块都以"模块小结页"结尾（B 型版式）
- ✅ 是否每个模块小结页都包含"下一模块预告"过渡条
- ✅ 数字陈述是否一致（同一指标在不同页的数值是否吻合）

## Template selection

**默认骨架**：参考 `references/narrative-skeleton.md` 中的 9 模块结构。

**根据用户场景调整**：
- **金融机构价值创造分析** → 完整 9 模块都用（盈利质量 / 中收 / 息差 / 资产资本 / 资本市场实证）
- **非金融上市公司战略分析** → 替换中段 4 个专题为该行业特定模块（如"市场份额 / 产品组合 / 运营效率 / 资本配置"）
- **业务转型 / 并购重组分析** → 缩减至 30-35 页，去掉同业对标雷达，强化"现状—未来"对比页
- **风险评估 / 合规审计报告** → 去掉"实证模块"，加入"风险矩阵 + 缓释措施"双模块

## Use the bundled visual system as a starting point

加载本 Skill 后必须 **`Read .skills/rsm-board-deep-analysis/assets/chrome.css`** 并复制到 `<deck>.slides/assets/chrome.css`。这是整个版式系统的基础。

**4 种标准版式片段**位于 `references/layouts/`：

- `layout-cover.html` —— 封面页（深蓝渐变 + 元数据栏）
- `layout-kpi-summary.html` —— KPI 数字卡摘要页（4 张数字卡 + 双栏结论）
- `layout-module-summary.html` —— 模块小结页（左侧深蓝侧栏 + 右侧 3 证据卡 + 3 数字卡）
- `layout-comparison-table.html` —— 对比表页（左指标 + 右数据 + 颜色编码）

直接复制片段，把占位符替换为实际内容。**不要从零写 HTML**——这套版式已经过几何与视觉双重验证。

## Recommended 46-slide structure (default)

| # | 页 | 用途 |
|---|---|---|
| 1 | 封面 | 项目标题 + 双视角副标 + 元数据 |
| 2 | 目录 | 9 模块导航 |
| 3 | 研究口径 | 样本 / 数据 / 指标定义三卡 |
| 4 | 执行摘要 | 4 项核心指标 KPI 卡 + 双栏结论 |
| 5 | 北极星结论 | SCQA 中 C 的转折页 · 三大矛盾预告 |
| 6 | 方法论主图 | 分析框架 SVG 主图 |
| 7 | 方法论应用 | 框架在被分析对象的具体读数 |
| 8 | 行业宏观 | 外部环境锚定 |
| 9-12 | 行业坐标段 | 同业对标 / 横向排名 / 同城对照 / 雷达 |
| 13 | 模块小结 · 行业坐标段 | B 型版式 |
| 14-17 | 专题模块 1 | 含 6 年纵向 / 同业排名 / 穿透 / 测算 |
| 18 | 模块小结 · 专题 1 | |
| 19-22 | 专题模块 2 | |
| 23-26 | 专题模块 3 | |
| 27-31 | 专题模块 4 | |
| 32-37 | 实证 / 验证模块（如适用）| 计量 / 第三方数据 / 行业对比 |
| 38 | 三大矛盾全景 | 双视角交叉印证 |
| 39 | 竞争格局 | 四梯队定位 |
| 40 | 行动地图 | 0-3 / 3-6 / 6-12 月三阶段时间轴 |
| 41 | KPI 目标 | 4 项指标现状 → 12 个月目标 |
| 42 | 压力情景 | 三套压力下的指标响应 |
| 43 | 财务推演 | 基线 vs 行动后 3 年预测 |
| 44 | 两种图景 | 行动落地 vs 历史延续对照 |
| 45 | 团队介绍 | 咨询机构 + 联系方式 |
| 46 | 免责声明 | 使用范围 + 风险提示 + 免责条款 |
