# reportModel 契约文档 v1（PR #1 7D-0）

定稿：2026-06-01
范围：把 HTML / PDF / PPTX 三类导出从「各自从 DOM 爬数据」收敛到「共享同一份 reportModel 契约」。
本文档不包含运行代码改动，仅梳理 contract、消费映射、抽取顺序和过渡方案。

## 一、现状摘要（200 字）

当前产品的正式报告以 `formalReport`（`js/22-formal-report.js`）生成的 DOM 树为内容中心。HTML 直接渲染、PDF 走浏览器打印样式（`browserPrintFormalReport`）、PPTX 走 `js/13-pptx-export.js` 逐节点爬 `section.dataset.deckType` 和内部 `.formal-*` 子元素拼版式。三类导出都依赖 DOM 顺序作为页序，没有显式的数据契约层。这意味着任何 DOM 增删（即使只是临时隐藏一个 `.formal-section`）都会让 PDF/PPTX 页序漂移，且各导出降级路径不一致。`formalDeliveryStorylineModel()` 和 `exportSequenceQaRows()` 已经实质上扮演了 reportModel 的角色，但它们是只读视图，没有作为一等公民的 contract 定义。

## 二、reportModel 数据契约（TypeScript-like）

```ts
type ReportModel = {
  version: "v1";
  meta: {
    targetBank: string;          // state.target
    analysisYear: number;        // state.year
    peers: string[];             // state.peers
    reportVersion: string;       // state.reportVersion
    generatedAt: string;         // ISO 8601
    whatIfScenario?: {           // 与 state.whatIfScenario 同形
      active: boolean;
      nimShift: number;
      nplShift: number;
      costIncomeShift: number;
    };
  };
  sections: ReportSection[];     // 全局页序由此数组决定，不再依赖 DOM 顺序
};

type ReportSection = {
  id: string;                    // 必须，对应 DOM 的 section.id
  sectionTitle: string;          // 章节标题，对应 dataset.sectionTitle
  moduleLabel?: string;          // 模块归属（如"专题分析"），对应 dataset.moduleLabel
  pageRole: PageRole;            // 页面角色，对应 dataset.pageRole
  deckType: DeckType;            // PPTX 版式，对应 dataset.deckType
  storyRole?: StoryRole;         // 故事线角色（answer/topic/evidence/...）
  layoutIntent?: string;         // 版式意图描述，PPTX 校验用
  evidenceDensity?: "low" | "mid" | "high"; // 信息密度等级
  blocks: ReportBlock[];         // 章节内的语义块，按渲染顺序排列
  included: boolean;             // 是否纳入本次导出
  riskStamp?: RiskLevel;         // L1 / L2 / L3 / L4，与口径风险联动
};

type PageRole =
  | "cover" | "executive" | "topic" | "mechanism"
  | "evidence" | "scenario" | "action" | "appendix" | "content";

type DeckType =
  | "cover" | "executive-answer" | "chart-evidence" | "evidence-brief"
  | "mechanism-evidence" | "topic-scr" | "scenario-check"
  | "action-roadmap" | "appendix" | "content";

type StoryRole =
  | "answer" | "topic" | "evidence" | "mechanism"
  | "scenario" | "action" | "appendix";

type RiskLevel = "L1" | "L2" | "L3" | "L4";

type ReportBlock =
  | { kind: "metricHero"; metric: string; value: string; delta?: string; signal?: string }
  | { kind: "soWhat"; level: "high" | "mid" | "low"; text: string }
  | { kind: "chartReadout"; chartId: string; readoutText: string }
  | { kind: "factTable"; columns: string[]; rows: string[][]; footnotes?: string[] }
  | { kind: "actionCard"; horizon: "0-3m" | "3-6m" | "6-12m"; title: string; bullets: string[] }
  | { kind: "mechanismCard"; driver: string; magnitude: string; explanation: string }
  | { kind: "riskCard"; layer: string; label: string; explanation: string }
  | { kind: "scrTopic"; situation: string; complication: string; resolution: string }
  | { kind: "whatIfStrip"; scenarios: { label: string; delta: string }[] }
  | { kind: "footnote"; risk: RiskLevel; text: string }
  | { kind: "aiCommentary"; version: "board" | "market" | "action"; text: string };
```

**契约的最小不变量**：(1) 每个 `ReportSection` 必须有 `id / sectionTitle / pageRole / deckType / included`；(2) 任何导出消费方都不应直接 `querySelector` DOM，而应通过 `reportDeliveryModel()` 拿到结构化数据。

## 三、三类导出消费映射表

| reportModel 节点 | HTML 渲染 | PDF 渲染 | PPTX 渲染 | 风险 |
|---|---|---|---|---|
| meta.targetBank/year | header 区 + cover | header + cover 页 | cover slide title | ✓ 已一致 |
| meta.whatIfScenario | header 标签"模拟口径" | header + footer 加印 | 全局页脚水印 | ⚠ PPTX 水印未必逐页 |
| sections[].sectionTitle | `<h2>` | 打印同 HTML | slide title | ✓ |
| sections[].pageRole | DOM data 属性 | 控制打印分页 | 选择幻灯片模板 | ⚠ 不一致时 PPTX 降级 content |
| sections[].deckType | （HTML 不用） | （PDF 不用） | 选择 layout（cover/chart-evidence/...） | ⚠ 9 种 layout，缺失即降级 |
| blocks.metricHero | `.formal-metric-hero` | 同 HTML | KPI big number block | ✓ |
| blocks.soWhat | `.formal-so-what`，颜色按 level | 同 HTML | 单独 takeaway 块 | ✓ |
| blocks.chartReadout | `.formal-chart-readout` + canvas | 打印 canvas + readout | PPTX 用截图或矢量图 + readout 文字 | ❌ PPTX 矢量化未完成，目前用截图 |
| blocks.factTable | `<table.formal-fact-table>` | 同 HTML（table-layout fixed） | 真表（pptxgenjs table） | ⚠ 列宽估算不精确 |
| blocks.actionCard | `.formal-action-card` | 同 HTML | 单独 slide 卡片 | ✓ |
| blocks.mechanismCard | `.formal-mechanism-card` | 同 HTML | mechanism-evidence layout | ⚠ |
| blocks.riskCard | `.formal-risk-card` | 同 HTML | risk grid | ⚠ |
| blocks.scrTopic | `.formal-topic-scr` 三段 | 同 HTML | topic-scr layout 三段 | ⚠ PPTX 长文截断 |
| blocks.whatIfStrip | `.formal-whatif-strip` | 同 HTML | scenario-check layout | ⚠ |
| blocks.footnote | `.formal-risk-footnotes` + L1-L4 tag | 页脚 | 页脚文字 | ✓ |
| blocks.aiCommentary | `.formal-ai-commentary` 三版本切换 | 仅当前版本 | 当前版本 + 演讲者备注 | ⚠ 备注未必同步 |

最大风险是 **chartReadout**——PPTX 当前用截图回退导致清晰度问题，需要在 PR #3 解决。

## 四、抽取顺序（5 步可独立提交的 PR）

**PR-A：补齐 dataset 属性（P0，2 天）**
在 `formalReport` 生成 DOM 时，统一给每个 `<section.formal-section>` 补 `data-id / data-section-title / data-page-role / data-deck-type / data-included` 五个属性。当前部分 section 已有 deckType，但不全。增加 `applyFormalReportContract(root)` 后处理函数兜底补全。**不动消费方**，HTML/PDF/PPTX 还按旧路径走。验收：`exportSequenceQaRows()` 输出每行都不出现"缺少"。

**PR-B：抽出 reportDeliveryModel() 数据层（P0，2 天）**
新增 `js/35-report-model.js`，导出函数 `reportDeliveryModel(root): ReportModel`。它读 DOM 但只读 dataset 和已知的 `.formal-*` selectors，返回结构化对象。`formalDeliveryStorylineModel()` 改为薄包装层调用 `reportDeliveryModel()`。验收：新增 contract test `tests/report_model_contract.test.js`，比较 `reportDeliveryModel()` 输出与 `formalDeliveryStorylineModel()` 输出的 section 数量、id、deckType 一致。

**PR-C：PPTX 改为从 reportModel 取数（P0，3 天）**
`pptxLayoutDispatcher(section)` 改为接收 `ReportSection` 对象而不是 DOM section。新增 `pptxRenderBlock(block)` 按 `block.kind` 分派。旧 `querySelector` 路径作为降级保留。验收：PPTX 导出在三家回归样本上页序、标题、所有 9 种 layout 与 reportModel 输出一致。

**PR-D：PDF 页序 QA 收口（P1，2 天）**
扩展 `exportSequenceQaPanel` 增加"reportModel vs 实际渲染 DOM"diff 视图。任何漂移立即在 UI 报警。验收：手动隐藏一个 section 后，QA 面板能精确告警。

**PR-E：HTML 渲染走 reportModel 重生成（P1，2 天）**
HTML 报告改为 `renderHtmlFromReportModel(model)`，直接拼字符串生成，不再依赖 `formalReport()` 函数本身。`formalReport()` 退化为兼容层，仅在 dev 模式保留。验收：HTML 渲染结果与旧 formalReport DOM 在三家回归样本上视觉一致。

## 五、不动代码的过渡方案 / 回退安全

抽取期间确保三个回退点：

1. **PR-A 阶段**：`applyFormalReportContract()` 出错时不抛异常，记录 warn 日志；旧消费方不读新属性也能跑。
2. **PR-B 阶段**：`reportDeliveryModel()` 与旧 model 并存，环境变量 `REPORT_MODEL_V2=on` 控制 PPTX 是否切到新链路，默认关。
3. **PR-C 阶段**：PPTX dispatcher 优先读 `reportModel`，缺失字段自动降级到 `section.querySelector` 旧路径，每次降级记一条日志。

任何阶段发现回归问题，把 `REPORT_MODEL_V2` 切回 off 即可整体回退到旧链路。新增 contract test 在 PR-A 合并时就跑（仅检查 dataset 完整性），PR-B 之后扩展为检查数据形状一致性。

## 六、与 Sprint 7A/7B 的交叉

- **7A-3b（Section 内容迁移）依赖 PR-A**：迁移到 Section A-F 时，所有数据应通过 `reportDeliveryModel()` 取，不重新 DOM scrape。
- **7B-1（30 秒诊断合并）依赖 PR-B**：30 秒诊断的"一句答案 + VQA 分 + 最弱维度 + PB + 三问题"应该是 reportModel 的 `executive` section 的 blocks。
- **7D-1（PDF 分页与 PPTX 清晰度）依赖 PR-C**：等 PPTX 切到 reportModel 后再做矢量化才稳定。
- **9C 全屏三栏布局 + 10C What-if 联动**：reportModel 已纳入 `meta.whatIfScenario`，模拟口径标签由 model 统一管控，不再各页自己判断。

## 七、不在本契约范围

- DOM 渲染层的具体 HTML 结构不变（PR-A 只加属性，PR-E 才考虑重生成）。
- 字号/颜色/阴影属于版式设计规范（`layout-design-system.md`），不在本契约。
- 报告章节内容（写什么）由 `consultingStoryline()` / `ceamNarrativeBlock()` 决定，contract 只规范结构，不规范文本。
- PPTX 母版（slide master）的高保真矢量化是 Sprint 11 范畴，与 contract 解耦。

## 八、验收清单

PR-A 验收：`exportSequenceQaPanel` 显示所有 section 的「PPT页型 / 页型 / 故事角色」三列无空缺。
PR-B 验收：`tests/report_model_contract.test.js` 通过，覆盖三家回归样本的 sections 数量与字段。
PR-C 验收：三家样本 PPTX 导出页序与 `reportDeliveryModel(document).sections.map(s => s.id)` 完全一致；至少 8/9 种 layout 实际产出过样本。
PR-D 验收：手动改 DOM 模拟漂移后 QA 面板报警，且报警信息能定位到具体 section id。
PR-E 验收：旧 HTML vs 新 HTML 在三家样本上 diff 仅有空格/标签顺序差异，无字段缺失。

## 九、风险与依赖

| 风险 | 概率 | 影响 | 缓解 |
|---|---|---|---|
| dataset 属性漏补，PPTX 降级 content | 中 | PPTX 出现重复版式页 | PR-A 加 contract test 强校验 |
| reportDeliveryModel 序列化遗漏字段 | 中 | 新链路渲染缺块 | PR-B 加字段 round-trip 测试 |
| PPTX 表格列宽估算偏差 | 高 | 表格溢出或文字截断 | 沿用 layout-design-system 的 table 规范 + pptxgenjs autoColWidths |
| reportModel 与 9/10 的 What-if state 不同步 | 低 | 模拟口径页脚错位 | PR-A 即把 `state.whatIfScenario` 写入 `model.meta.whatIfScenario` |
