# DeepSeek Evidence Rewrite Orchestrator Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build an evidence-driven DeepSeek rewrite pipeline that starts from the governed data layer, generates unified calculation outputs and fact packs, rewrites all Portal, topic, evidence-map, and report-facing commentary from those packs, then validates and writes the results back into page state and report exports.

**Architecture:** Keep `ready_record_wide` / `data_ready.js` as the single governed data source, keep calculation models as the only place where metrics and peer comparisons are computed, and keep `layeredFactModel()` as the single evidence-pack source for language generation. Add a rewrite registry that lists every rewriteable content block, a planner that builds DeepSeek requests per block, a validator that rejects unsupported claims, and a writer that updates state/DOM/report model consistently.

**Tech Stack:** Static browser JavaScript, existing local DeepSeek proxy (`server/deepseek-commentary-proxy.js`), current prompt configs, `data_ready.js`, `ready_record_wide`, `ready_metric_quality`, `layeredFactModel()`, `reportDeliveryModel()`, Node contract tests.

---

## 1. Target Operating Flow

```text
用户确认分析
  ↓
读取统一 ready 数据层
  原主数据 / Tushare / 年报抓取数据
  ready_record_wide
  ready_metric_quality
  data_ready.js
  ↓
运行统一计算层
  目标银行指标
  对标组均值 / 中位数 / 分位
  类型均值
  趋势、异动、估值、专题计算
  数据质量状态
  ↓
生成统一证据包
  layeredFactModel()
  evidenceMapFactPack()
  bankCommentaryFactPack()
  reportDeliveryModel()
  每条事实保留 metricKey / value / unit / year / peerValue / source / qualityStatus
  ↓
生成 Rewrite Plan
  blockId / page / channel / factPack / prompt / writeTarget
  ↓
调用 DeepSeek
  每个 block 只拿自己的证据包和重写规则
  ↓
校验
  数字必须来自 factPack
  引用指标必须存在
  factPack 必须能回溯到 ready 数据层或计算层
  不允许方法论空话
  不允许投资建议
  数据不足则降级
  ↓
写回
  state.generatedNarratives
  state.bankCommentaries
  state.evidenceMapCommentary
  state.editedNarratives
  DOM panels
  reportDeliveryModel metadata
  ↓
报告导出
  HTML / PDF / PPTX 使用同一批 validated rewrite
```

---

## 2. Rewrite Scope

第一版不要让 DeepSeek 自由改整页 HTML，只改“可控文本块”。

| 层级 | Block 类型 | 当前来源 | 写回位置 |
| --- | --- | --- | --- |
| Launch | 选择摘要、项目说明 | selected inputs + data coverage summary | `#selectionSummary` / state |
| Executive | 30 秒结论、董事会议题、默认答案 | `step2DiagnosisModel()` + board questions from unified metrics | `#step2DecisionBrief` / state |
| Evidence Map | 同业位置解读、异动偏离解读、估值锚解读 | `evidenceMapFactPack()` with source lineage | `state.evidenceMapCommentary` |
| Topic | 董事会版、资本市场版、管理层行动版 | `layeredTopicFactModel(topicId)` from ready metrics | `state.editedNarratives` |
| Report Studio | 章节标题、图表读图结论、管理含义 | `reportDeliveryModel()` section blocks with rewrite ids | `state.reportRewrites` |
| Data & Validation | 数据边界说明、待补原因摘要 | `readyMetricQuality` + metric lineage | validation panel |

---

## 3. Data-to-Evidence Contract

DeepSeek 的输入必须来自统一证据包，统一证据包必须来自 ready 数据层和计算层。页面组件不能直接临时拼接数字给模型。

### Source Layer

| 数据来源 | 职责 | 进入 ready 层前必须保留 |
| --- | --- | --- |
| 原主数据 | 核心银行指标和历史口径 | bankName、standardBankName、year、metricKey、rawValue、sourceFile |
| Tushare | 市场、估值、行情类数据 | tsCode、tradeDate/year、metricKey、rawValue、sourceProvider |
| 年报抓取数据 | 报表明细、脚注、补充口径 | standardBankName、year、tableName、metricKey、rawValue、sourceTable |

### Ready Layer

`ready_record_wide` / `data_ready.js` 负责输出统一字段，不负责生成观点。

每个 ready 指标必须至少包含：

```javascript
{
  bankName: "苏州农村商业银行",
  standardBankName: "苏州农村商业银行",
  year: 2025,
  metricKey: "net_interest_margin",
  metricName: "净息差",
  value: 1.41,
  unit: "%",
  sourceTier: "master" | "tushare" | "annual_report",
  sourceFile: "file-or-table-name",
  qualityStatus: "ready" | "partial" | "missing",
  missingReason: ""
}
```

### Calculation Layer

计算层负责把 ready 指标变成可比较事实，不写自然语言观点。

每个计算结果必须包含：

```javascript
{
  metricKey: "net_interest_margin",
  targetValue: 1.41,
  peerMean: 1.68,
  peerMedian: 1.62,
  typeMean: 1.52,
  percentile: 28,
  direction: "below_peer",
  trend: "down",
  deviationLevel: "material",
  qualityStatus: "ready",
  sourceRefs: ["master:2025:net_interest_margin", "peer:net_interest_margin"]
}
```

### Evidence Pack Layer

证据包负责选择哪些事实可以进入 DeepSeek，不新增计算。

每条 fact 必须包含：

```javascript
{
  factId: "nim.peer_gap.2025",
  metricKey: "net_interest_margin",
  label: "净息差低于对标组",
  targetValue: "1.41%",
  compareValue: "1.68%",
  conclusionSignal: "息差底盘弱于对标组，利润修复不能只依赖规模扩张",
  sourceRefs: ["master:2025:net_interest_margin", "calc:peer_mean:net_interest_margin"],
  qualityStatus: "ready"
}
```

### Rewrite Layer

DeepSeek 只能读取 Evidence Pack Layer，不能读取原始表、不能自行计算差距、不能补数字。

---

## 4. File Structure

**Create**

- `outputs/vqa_template/js/37-deepseek-rewrite-orchestrator.js`  
  Owns rewrite registry, request planning, generation loop, validation, and write-back.

- `outputs/vqa_template/js/38-evidence-pack-builder.js`  
  Normalizes data-layer and calculation-layer outputs into DeepSeek-ready evidence packs with lineage.

- `outputs/vqa_template/tests/deepseek_rewrite_orchestrator_contract.test.js`  
  Contract test for registry, prompts, validation, state write-back, and post-confirm integration.

- `outputs/vqa_template/tests/evidence_pack_lineage_contract.test.js`  
  Contract test proving every DeepSeek fact can be traced to ready data or calculation output.

- `outputs/vqa_template/docs/deepseek-evidence-rewrite-contract.md`  
  Human-readable rewrite contract for product, data, and engineering.

**Modify**

- `outputs/vqa_template/index.html`  
  Load `js/38-evidence-pack-builder.js` before `js/37-deepseek-rewrite-orchestrator.js`.

- `outputs/vqa_template/js/36-layered-fact-model.js`  
  Route fact-pack creation through the shared evidence pack builder and preserve `sourceRefs`.

- `outputs/vqa_template/js/33-llm-commentary.js`  
  Replace scattered post-confirm generation calls with `runEvidenceRewriteOrchestrator()` after backward-compatible wrappers remain.

- `outputs/vqa_template/js/12-ai-narrative.js`  
  Route topic narrative generation through orchestrator when available.

- `outputs/vqa_template/js/35-report-model.js`  
  Attach rewrite ids, validation status, and generated text to report sections.

- `outputs/vqa_template/config/deepseek_explanation_prompts.json`  
  Add block-level rewrite instructions: conclusion-first, no methodology narration, evidence-bound, citation-required.

- `outputs/vqa_template/package.json`  
  Add `test:evidence-pack-lineage` and `test:rewrite-orchestrator`.

---

## 5. Core Contracts

### Rewrite Block

```javascript
{
  blockId: "evidence.map.deviation",
  page: "evidence",
  channel: "board",
  title: "异动偏离解读",
  factPack: {},
  prompt: {},
  writeTarget: {
    statePath: "evidenceMapCommentary",
    domId: "step2EvidenceCommentaryText",
    reportSectionId: "formal-v5-deviation-radar"
  },
  requiredCitations: ["metric-key-or-fact-name"],
  priority: "P0"
}
```

### Rewrite Result

```javascript
{
  blockId: "evidence.map.deviation",
  source: "deepseek" | "fallback",
  status: "valid" | "degraded" | "failed",
  text: "结论先行的解读正文",
  explanationPackage: {},
  citations: ["metric-key-or-fact-name"],
  qualityWarnings: [],
  generatedAt: "ISO string"
}
```

### Prompt Rules

Every request must include:

```javascript
{
  instruction: [
    "第一句必须直接给出当前银行相对对标组的结论。",
    "不要解释方法论、框架、计算过程或系统逻辑。",
    "每个核心判断必须绑定 factPack 中至少两个事实。",
    "如果证据不足，必须降低语气并写出缺口。",
    "不得编造事实包之外数字。"
  ],
  outputSchema: ["viewpoint", "conclusion", "evidence", "soWhat", "actions", "citations", "qualityWarnings"]
}
```

---

## 6. Implementation Tasks

### Task 1: Data-to-Evidence Contract Document

**Files:**
- Create: `outputs/vqa_template/docs/deepseek-evidence-rewrite-contract.md`

- [ ] **Step 1: Create the contract document**

```markdown
# DeepSeek 证据驱动重写契约

## 1. 总原则
DeepSeek 只能改写结构化文本块，不能直接改 HTML，也不能生成事实包之外数字。所有事实必须来自 ready 数据层或计算层。

## 2. 输入
输入链路为：原主数据 / Tushare / 年报抓取数据 → ready_record_wide / data_ready.js → calculation layer → evidence pack → DeepSeek。

## 3. 数据层契约
ready 指标必须包含 bankName、standardBankName、year、metricKey、value、unit、sourceTier、sourceFile、qualityStatus、missingReason。

## 4. 计算层契约
计算结果必须包含 metricKey、targetValue、peerMean、peerMedian、typeMean、percentile、direction、trend、deviationLevel、qualityStatus、sourceRefs。

## 5. 证据包契约
证据包只能从计算层选择事实，不新增计算；每条 fact 必须包含 factId、metricKey、label、targetValue、compareValue、conclusionSignal、sourceRefs、qualityStatus。

## 6. 输出
输出为 RewriteResult，包含 blockId、status、text、citations、qualityWarnings、generatedAt。

## 7. 校验
数字必须来自 factPack；引用指标必须存在；sourceRefs 必须能回溯到 ready 数据或计算结果；不允许方法论叙述；不允许投资建议；数据不足必须降级。

## 8. 写回
写回 state.generatedRewrites、state.bankCommentaries、state.evidenceMapCommentary、state.editedNarratives、state.reportRewrites，并刷新 Portal 和 reportDeliveryModel。
```

- [ ] **Step 2: Verify the document**

Run:

```bash
rg -n "ready_record_wide|sourceRefs|RewriteResult|layeredFactModel|evidenceMapFactPack|reportDeliveryModel|qualityWarnings" outputs/vqa_template/docs/deepseek-evidence-rewrite-contract.md
```

Expected: all terms appear.

---

### Task 2: Evidence Pack Lineage Contract Test

**Files:**
- Create: `outputs/vqa_template/tests/evidence_pack_lineage_contract.test.js`
- Create: `outputs/vqa_template/js/38-evidence-pack-builder.js`
- Modify: `outputs/vqa_template/js/36-layered-fact-model.js`

- [ ] **Step 1: Write the failing lineage test**

```javascript
const fs = require("fs");
const assert = require("assert/strict");

const builder = fs.readFileSync("js/38-evidence-pack-builder.js", "utf8");
const layered = fs.readFileSync("js/36-layered-fact-model.js", "utf8");

[
  "function normalizeReadyMetricFact",
  "function buildEvidencePack",
  "function validateEvidencePackLineage",
  "sourceRefs",
  "qualityStatus",
  "ready_record_wide",
  "ready_metric_quality"
].forEach((needle) => assert(builder.includes(needle), `missing ${needle}`));

assert(layered.includes("buildEvidencePack"), "layered fact model must route evidence through shared builder");
assert(layered.includes("sourceRefs"), "layered fact model must preserve sourceRefs");

console.log("evidence-pack-lineage-contract-ok");
```

- [ ] **Step 2: Run the failing test**

Run:

```bash
node tests/evidence_pack_lineage_contract.test.js
```

Expected: FAIL with missing `js/38-evidence-pack-builder.js`.

- [ ] **Step 3: Implement the evidence pack builder**

Implement:

```javascript
function normalizeReadyMetricFact(row) {
  return {
    metricKey: row.metricKey,
    metricName: row.metricName,
    value: row.value,
    unit: row.unit || "",
    year: row.year,
    sourceRefs: row.sourceRefs || [`${row.sourceTier || "unknown"}:${row.year || ""}:${row.metricKey || ""}`],
    qualityStatus: row.qualityStatus || "partial",
    missingReason: row.missingReason || ""
  };
}

function buildEvidencePack({ blockId, facts = [], calculations = [], quality = [] }) {
  return {
    blockId,
    facts: facts.map(normalizeReadyMetricFact),
    calculations,
    quality,
    lineageStatus: validateEvidencePackLineage({ facts, calculations, quality }) ? "ready" : "partial"
  };
}

function validateEvidencePackLineage(pack) {
  const facts = pack.facts || [];
  return facts.every((fact) => Array.isArray(fact.sourceRefs) && fact.sourceRefs.length > 0 && fact.qualityStatus);
}
```

- [ ] **Step 4: Route layered fact model through the builder**

Use `buildEvidencePack()` in `layeredFactModel()` and `layeredTopicFactModel()` outputs, while keeping backward-compatible fields for existing UI code.

---

### Task 3: Rewrite Orchestrator Contract Test

**Files:**
- Create: `outputs/vqa_template/tests/deepseek_rewrite_orchestrator_contract.test.js`

- [ ] **Step 1: Write the failing test**

```javascript
const fs = require("fs");
const assert = require("assert/strict");

const html = fs.readFileSync("index.html", "utf8");
const orchestrator = fs.readFileSync("js/37-deepseek-rewrite-orchestrator.js", "utf8");
const llm = fs.readFileSync("js/33-llm-commentary.js", "utf8");
const report = fs.readFileSync("js/35-report-model.js", "utf8");
const prompts = fs.readFileSync("config/deepseek_explanation_prompts.json", "utf8");

[
  "function rewriteBlockRegistry",
  "function buildRewritePlan",
  "function callRewriteBlock",
  "function validateRewriteResult",
  "function applyRewriteResult",
  "async function runEvidenceRewriteOrchestrator"
].forEach((needle) => assert(orchestrator.includes(needle), `missing ${needle}`));

[
  "bank.summary",
  "executive.answer",
  "evidence.map.deviation",
  "topic.board",
  "topic.market",
  "topic.action",
  "report.section"
].forEach((needle) => assert(orchestrator.includes(needle), `registry missing ${needle}`));

assert(html.includes("js/37-deepseek-rewrite-orchestrator.js"), "HTML must load rewrite orchestrator");
assert(html.includes("js/38-evidence-pack-builder.js"), "HTML must load evidence pack builder before rewrite orchestrator");
assert(llm.includes("runEvidenceRewriteOrchestrator"), "post-confirm generation must use rewrite orchestrator");
assert(report.includes("rewriteStatus"), "report model must expose rewriteStatus");
assert(prompts.includes("不要解释方法论"), "DeepSeek prompt must ban methodology narration");
assert(prompts.includes("第一句必须"), "DeepSeek prompt must enforce conclusion-first text");

console.log("deepseek-rewrite-orchestrator-contract-ok");
```

- [ ] **Step 2: Run the failing test**

Run:

```bash
node tests/deepseek_rewrite_orchestrator_contract.test.js
```

Expected: FAIL with missing `js/37-deepseek-rewrite-orchestrator.js`.

---

### Task 4: Rewrite Orchestrator

**Files:**
- Create: `outputs/vqa_template/js/37-deepseek-rewrite-orchestrator.js`
- Modify: `outputs/vqa_template/index.html`

- [ ] **Step 1: Implement state helpers**

```javascript
/* Bank VQA module: 37-deepseek-rewrite-orchestrator.js */

function ensureGeneratedRewrites() {
  if (!state.generatedRewrites) state.generatedRewrites = {};
  if (!state.reportRewrites) state.reportRewrites = {};
}
```

- [ ] **Step 2: Implement registry**

```javascript
function rewriteBlockRegistry() {
  const topics = typeof topicDefinitions === "function" ? topicDefinitions() : [];
  return [
    { blockType: "bank.summary", page: "answer", channel: "board", priority: "P0" },
    { blockType: "executive.answer", page: "answer", channel: "board", priority: "P0" },
    { blockType: "evidence.map.deviation", page: "evidence", channel: "board", priority: "P0" },
    ...topics.flatMap((topic) => [
      { blockType: "topic.board", topicId: topic.id, page: "topics", channel: "board", priority: "P0" },
      { blockType: "topic.market", topicId: topic.id, page: "topics", channel: "market", priority: "P1" },
      { blockType: "topic.action", topicId: topic.id, page: "topics", channel: "action", priority: "P0" }
    ]),
    { blockType: "report.section", page: "report", channel: "board", priority: "P1" }
  ];
}
```

- [ ] **Step 3: Implement fact pack selection**

```javascript
function rewriteFactPackForBlock(block) {
  if (block.blockType.startsWith("topic.") && typeof layeredTopicFactModel === "function") {
    return layeredTopicFactModel(block.topicId);
  }
  if (block.blockType === "evidence.map.deviation" && typeof evidenceMapFactPack === "function") {
    return evidenceMapFactPack();
  }
  if (block.blockType === "report.section" && typeof reportDeliveryModel === "function") {
    return reportDeliveryModel();
  }
  if (typeof bankCommentaryFactPack === "function") return bankCommentaryFactPack();
  return {};
}
```

- [ ] **Step 4: Implement prompt builder**

```javascript
function rewritePromptForBlock(block, factPack) {
  return {
    role: block.blockType,
    instruction: [
      "第一句必须直接给出当前银行相对对标组的结论。",
      "不要解释方法论、框架、计算过程或系统逻辑。",
      "每个核心判断必须绑定 factPack 中至少两个事实。",
      "如果证据不足，必须降低语气并写出缺口。",
      "不得编造事实包之外数字。"
    ].join("\n"),
    outputSchema: ["viewpoint", "conclusion", "evidence", "soWhat", "actions", "citations", "qualityWarnings"],
    factPack
  };
}
```

- [ ] **Step 5: Implement plan builder**

```javascript
function buildRewritePlan(options = {}) {
  const priority = options.priority || "all";
  return rewriteBlockRegistry()
    .filter((block) => priority === "all" || block.priority === priority)
    .map((block) => {
      const factPack = rewriteFactPackForBlock(block);
      return {
        ...block,
        blockId: [block.blockType, block.topicId || "global", block.channel || "board"].join("::"),
        factPack,
        prompt: rewritePromptForBlock(block, factPack)
      };
    });
}
```

- [ ] **Step 6: Implement call, validation, apply**

```javascript
async function callRewriteBlock(block) {
  const endpoint = aiProviderConfig?.http?.commentaryEndpoint || aiProviderConfig?.http?.endpoint;
  if (!endpoint || aiProviderConfig?.provider !== "http") {
    return { blockId: block.blockId, source: "fallback", status: "degraded", text: localRewriteFallback(block), citations: [], qualityWarnings: ["模型接口不可用，使用本地降级文本"], generatedAt: new Date().toISOString() };
  }
  const response = await fetch(endpoint, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ kind: "rewrite-block", channel: block.channel, prompt: block.prompt, factPack: block.factPack })
  });
  const payload = await response.json();
  const text = payload.text || payload.commentary || payload.content || "";
  return validateRewriteResult({ blockId: block.blockId, source: payload.source || "deepseek", status: "valid", text, explanationPackage: payload.explanationPackage || null, citations: payload.explanationPackage?.citations || [], qualityWarnings: payload.explanationPackage?.qualityWarnings || [], generatedAt: new Date().toISOString() }, block);
}

function validateRewriteResult(result, block) {
  const text = String(result.text || "");
  const banned = ["方法论", "框架逻辑", "系统计算", "综合分析"];
  const hasBanned = banned.some((word) => text.includes(word));
  const tooShort = text.length < 20;
  if (hasBanned || tooShort) {
    return { ...result, status: "degraded", text: localRewriteFallback(block), qualityWarnings: [...(result.qualityWarnings || []), "模型文本未通过结论型语言校验，已降级"] };
  }
  return result;
}

function applyRewriteResult(result, block) {
  ensureGeneratedRewrites();
  state.generatedRewrites[result.blockId] = result;
  if (block.blockType === "evidence.map.deviation") {
    state.evidenceMapCommentary = { text: result.text, source: result.source, generatedAt: result.generatedAt, validation: result.status };
    if (typeof updateEvidenceMapCommentaryPanel === "function") updateEvidenceMapCommentaryPanel();
  }
  if (block.blockType.startsWith("topic.") && block.topicId) {
    if (!state.editedNarratives) state.editedNarratives = {};
    state.editedNarratives[`${block.topicId}.${block.channel}`] = result.text;
  }
  if (block.blockType === "report.section") {
    state.reportRewrites[result.blockId] = result;
  }
}
```

- [ ] **Step 7: Implement fallback and runner**

```javascript
function localRewriteFallback(block) {
  const pack = block.factPack || {};
  if (block.blockType === "evidence.map.deviation" && typeof localEvidenceMapCommentaryDraft === "function") return localEvidenceMapCommentaryDraft(pack);
  if (block.blockType.startsWith("topic.") && typeof topicAiDraft === "function") {
    const topic = typeof topicDefinitions === "function" ? topicDefinitions().find((item) => item.id === block.topicId) : null;
    const facts = typeof topicFactPackRows === "function" ? topicFactPackRows(block.topicId) : [];
    const draft = topic && topicAiDraft(topic, facts);
    return draft?.[block.channel] || draft?.board || "当前证据不足，暂不形成强结论。";
  }
  if (typeof localBankCommentaryDraft === "function") return localBankCommentaryDraft(bankCommentaryFactPack(), block.channel || "board");
  return "当前证据不足，暂不形成强结论。";
}

async function runEvidenceRewriteOrchestrator(options = {}) {
  ensureGeneratedRewrites();
  const plan = buildRewritePlan(options);
  for (const block of plan) {
    const result = await callRewriteBlock(block);
    applyRewriteResult(result, block);
  }
  if (typeof renderTopicWorkbench === "function") renderTopicWorkbench();
  if (typeof renderStep2Diagnosis === "function") renderStep2Diagnosis();
  if (typeof renderFormalReport === "function") renderFormalReport();
  if (typeof buildPrintDeck === "function") buildPrintDeck();
  return { status: "done", count: plan.length, generatedAt: new Date().toISOString() };
}

if (typeof window !== "undefined") {
  window.runEvidenceRewriteOrchestrator = runEvidenceRewriteOrchestrator;
  window.buildRewritePlan = buildRewritePlan;
}
```

- [ ] **Step 8: Load the script**

Add after `js/36-layered-fact-model.js`:

```html
<script src="js/37-deepseek-rewrite-orchestrator.js?v=20260606-rewrite-v1"></script>
```

---

### Task 5: Post-Confirm Integration

**Files:**
- Modify: `outputs/vqa_template/js/33-llm-commentary.js`

- [ ] **Step 1: Use orchestrator after confirmation**

In `runPostConfirmModelGeneration(options = {})`, replace the loop that independently calls bank, evidence, and topic generation with:

```javascript
if (typeof runEvidenceRewriteOrchestrator === "function") {
  await runEvidenceRewriteOrchestrator({ reason: options.reason || "post-confirm", priority: "all" });
} else {
  for (const channel of channels) await generateBankCommentaryAsync(channel, true);
  await generateEvidenceMapCommentaryAsync(true);
  for (const topicId of topicIds) {
    if (typeof generateTopicNarrativesWithAiForTopic === "function") await generateTopicNarrativesWithAiForTopic(topicId);
  }
}
```

- [ ] **Step 2: Run tests**

Run:

```bash
node tests/deepseek_rewrite_orchestrator_contract.test.js
npm run test:deepseek
```

Expected: both pass.

---

### Task 6: Report Model Rewrite Status

**Files:**
- Modify: `outputs/vqa_template/js/35-report-model.js`

- [ ] **Step 1: Add rewrite metadata to report sections**

Inside `reportModelSerializeSection(item)`, after existing lineage fields:

```javascript
const rewriteId = ["report.section", item.id || "global", "board"].join("::");
const rewrite = state?.reportRewrites?.[rewriteId] || null;
```

Add to returned object:

```javascript
rewriteStatus: rewrite?.status || "not-generated",
rewriteText: rewrite?.text || null,
rewriteGeneratedAt: rewrite?.generatedAt || null,
```

- [ ] **Step 2: Run report tests**

Run:

```bash
node tests/report_model_contract.test.js
node tests/deepseek_rewrite_orchestrator_contract.test.js
```

Expected: both pass.

---

### Task 7: Validation Dashboard

**Files:**
- Modify: `outputs/vqa_template/index.html`
- Modify: `outputs/vqa_template/js/03-data-format.js`
- Modify: `outputs/vqa_template/styles/app.css`

- [ ] **Step 1: Add dashboard container**

In Data & Validation:

```html
<section class="rewrite-validation-panel" id="rewriteValidationPanel">
  <div class="section-head">
    <span>模型重写复核</span>
    <h3>所有 DeepSeek 文案必须能追溯到证据包</h3>
  </div>
  <div id="rewriteValidationBody"></div>
</section>
```

- [ ] **Step 2: Render rewrite validation rows**

```javascript
function renderRewriteValidationPanel() {
  const host = document.getElementById("rewriteValidationBody");
  if (!host) return;
  const rows = Object.values(state.generatedRewrites || {});
  host.innerHTML = rows.length ? rows.map((row) => `
    <div class="rewrite-validation-row tone-${row.status}">
      <b>${htmlSafe(row.blockId)}</b>
      <span>${htmlSafe(row.status)}</span>
      <em>${htmlSafe((row.citations || []).join("、") || "引用待补")}</em>
    </div>
  `).join("") : "<p>确认分析并生成模型解读后展示重写复核结果。</p>";
}
```

Call it inside `updateDataCoverage()`:

```javascript
renderRewriteValidationPanel();
```

- [ ] **Step 3: Add CSS**

```css
.rewrite-validation-panel {
  border: 1px solid #d9e5ef;
  background: #fff;
  padding: 14px;
}
.rewrite-validation-row {
  display: grid;
  grid-template-columns: minmax(240px, 1fr) 120px minmax(180px, 1fr);
  gap: 10px;
  padding: 8px 0;
  border-bottom: 1px solid #e5edf3;
  font-size: var(--font-caption);
  font-weight: 850;
}
```

---

### Task 8: Full Test Script

**Files:**
- Modify: `outputs/vqa_template/package.json`

- [ ] **Step 1: Add test script**

```json
"test:evidence-pack-lineage": "node --check js/38-evidence-pack-builder.js && node tests/evidence_pack_lineage_contract.test.js",
"test:rewrite-orchestrator": "npm run test:evidence-pack-lineage && node --check js/37-deepseek-rewrite-orchestrator.js && node tests/deepseek_rewrite_orchestrator_contract.test.js && npm run test:deepseek && npm run test:layered-pipeline"
```

- [ ] **Step 2: Run tests**

Run:

```bash
npm run test:rewrite-orchestrator
```

Expected: all checks pass.

---

## 7. Suggested Rollout

1. **P-1: Data-to-Evidence Lineage**  
   First make every evidence pack traceable to ready data and calculation outputs. This prevents DeepSeek text from drifting away from governed data.

2. **P0: Evidence Map + Topic + Bank Summary**  
   First rewrite the parts users read most: 30 秒结论、证据地图、专题三版本。

3. **P1: Report Section Rewrites**  
   Then rewrite formal report sections and chart readouts.

4. **P2: Data & Validation Commentary**  
   Finally rewrite data-boundary summaries and export QA notes.

This avoids giving DeepSeek too much surface area before validation is mature.

---

## 8. Self-Review

**Spec coverage:** The plan covers full data-to-evidence-to-language rewriting, including source data lineage, ready data requirements, calculation outputs, fact pack generation, prompts, validation, write-back, report integration, and monitoring.

**Placeholder scan:** No vague future-work placeholders are used. Each implementation task contains explicit file paths, function names, code snippets, and test commands.

**Type consistency:** `RewriteBlock`, `RewriteResult`, `blockId`, `factPack`, `citations`, `qualityWarnings`, and `rewriteStatus` are introduced once and reused consistently.
