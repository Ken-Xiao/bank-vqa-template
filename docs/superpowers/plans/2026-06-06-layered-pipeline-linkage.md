# Layered Pipeline Linkage Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a single auditable chain that connects data layer, calculation layer, display layer, and report layer so Portal pages, AI commentary, HTML/PDF/PPTX reports, and Data & Validation all consume the same governed fact packs.

**Architecture:** Keep the current static Portal while introducing explicit contracts between layers. The data layer emits Ready records and quality rows; the calculation layer converts those rows into analysis fact packs; the display layer renders those fact packs without recalculating source truth; the report layer serializes the same fact packs into `reportDeliveryModel()` for HTML/PDF/PPTX delivery.

**Tech Stack:** Python ETL (`build_ready_data_layer.py`), static JS data sidecars (`data_ready.js`), browser JS modules (`js/05-analysis.js`, `js/12-ai-narrative.js`, `js/35-report-model.js`), Node contract tests.

---

## File Structure

**Existing files to modify**

- `outputs/vqa_template/build_ready_data_layer.py`  
  Owns source ingestion, bank aliases, metric source policy, quality status, and generated Ready artifacts.

- `outputs/vqa_template/js/05-analysis.js`  
  Owns calculation-facing fact packs: topic facts, evidence filtering, judgement, VQA-adjacent topic scoring, and data-boundary separation.

- `outputs/vqa_template/js/12-ai-narrative.js`  
  Owns AI narrative inputs and must receive only evidence facts plus explicit data-boundary warnings.

- `outputs/vqa_template/js/35-report-model.js`  
  Owns the report-level contract consumed by HTML/PDF/PPTX.

- `outputs/vqa_template/styles/app.css`  
  Owns compact visual treatment for layer lineage, evidence tables, and boundary warnings.

- `outputs/vqa_template/package.json`  
  Owns test scripts for the full chain.

**New files to create**

- `outputs/vqa_template/docs/layered-pipeline-contract.md`  
  Human-readable contract for data, calculation, display, and report handoff.

- `outputs/vqa_template/js/36-layered-fact-model.js`  
  Single browser-side adapter that exposes `layeredFactModel()` and prevents display/report modules from rebuilding inconsistent facts.

- `outputs/vqa_template/tests/layered_pipeline_contract.test.js`  
  Static and behavior contract test for the four-layer handoff.

---

## Target Layer Contract

```text
三源输入
  ↓
数据层 Data
  outputs: ready records + metric quality
  contract: bank/year/metric/value/source/status/missingReason
  ↓
计算层 Calculation
  outputs: topic fact packs + VQA evidence + benchmark deltas + data boundaries
  contract: facts[] / evidenceFacts[] / boundaryFacts[] / judgement / citations
  ↓
显示层 Display
  outputs: Portal pages and interaction state
  contract: render only model fields; do not invent facts or reclassify missing data
  ↓
报告层 Report
  outputs: reportDeliveryModel sections + HTML/PDF/PPTX
  contract: same fact pack ids, same citations, same warnings, same scenario meta
```

---

### Task 1: Contract Document

**Files:**
- Create: `outputs/vqa_template/docs/layered-pipeline-contract.md`

- [ ] **Step 1: Write the contract document**

Create the document with this exact structure:

```markdown
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
```

- [ ] **Step 2: Verify the document**

Run:

```bash
rg -n "layeredFactModel|reportDeliveryModel|boundaryFacts|ready_metric_quality" outputs/vqa_template/docs/layered-pipeline-contract.md
```

Expected: all four terms appear.

---

### Task 2: Layered Fact Model Adapter

**Files:**
- Create: `outputs/vqa_template/js/36-layered-fact-model.js`
- Modify: `outputs/vqa_template/index.html`
- Test: `outputs/vqa_template/tests/layered_pipeline_contract.test.js`

- [ ] **Step 1: Write the failing test**

Create `outputs/vqa_template/tests/layered_pipeline_contract.test.js`:

```javascript
const fs = require("fs");
const assert = require("assert/strict");

const html = fs.readFileSync("index.html", "utf8");
const layered = fs.readFileSync("js/36-layered-fact-model.js", "utf8");
const analysis = fs.readFileSync("js/05-analysis.js", "utf8");
const report = fs.readFileSync("js/35-report-model.js", "utf8");

assert(html.includes("js/36-layered-fact-model.js"), "index.html must load layered fact model");
assert(layered.includes("function layeredFactModel("), "layeredFactModel must be exported");
assert(layered.includes("evidenceFacts"), "model must expose evidenceFacts");
assert(layered.includes("boundaryFacts"), "model must expose boundaryFacts");
assert(layered.includes("metricQuality"), "model must expose metricQuality");
assert(layered.includes("factPackId"), "model must expose factPackId");
assert(analysis.includes("topicAvailableFacts"), "analysis layer must separate available facts");
assert(analysis.includes("topicDataBoundaryFacts"), "analysis layer must separate data boundary facts");
assert(report.includes("factPackId"), "report model must preserve factPackId");
assert(report.includes("dataWarnings"), "report model must preserve dataWarnings");

console.log("layered-pipeline-contract-ok");
```

- [ ] **Step 2: Run the test and verify it fails**

Run:

```bash
node tests/layered_pipeline_contract.test.js
```

Expected: FAIL with `ENOENT: no such file or directory, open 'js/36-layered-fact-model.js'`.

- [ ] **Step 3: Implement the adapter**

Create `outputs/vqa_template/js/36-layered-fact-model.js`:

```javascript
/* Bank VQA module: 36-layered-fact-model.js */

function layeredFactPackId(topicId, bank = state.target, year = state.year) {
  return [bank || "unknown-bank", year || "unknown-year", topicId || "overview"].join("::");
}

function layeredMetricQualityRows(bank = state.target, year = state.year) {
  const rows = Array.isArray(readyMetricQuality) ? readyMetricQuality : [];
  return rows.filter((row) => {
    const sameBank = row.bank === bank || (typeof displayBankName === "function" && displayBankName(row.bank) === displayBankName(bank));
    return sameBank && Number(row.year) === Number(year);
  });
}

function layeredTopicFactModel(topicId = state.activeTopic) {
  const facts = typeof topicFactPackRows === "function" ? topicFactPackRows(topicId) : [];
  const evidenceFacts = typeof topicAvailableFacts === "function" ? topicAvailableFacts(facts) : facts.filter((fact) => fact.是否可用证据 === "是");
  const boundaryFacts = typeof topicDataBoundaryFacts === "function" ? topicDataBoundaryFacts(facts) : facts.filter((fact) => fact.是否可用证据 !== "是");
  const judgement = typeof topicJudgement === "function" ? topicJudgement(topicId, facts) : null;
  const topic = judgement?.topic || (typeof topicDefinitions === "function" ? topicDefinitions().find((item) => item.id === topicId) : null);
  const citations = topic && typeof topicCitationFacts === "function" ? topicCitationFacts(topic, facts) : [];
  return {
    factPackId: layeredFactPackId(topicId),
    topicId,
    targetBank: state.target,
    year: state.year,
    peers: Array.isArray(state.peers) ? state.peers.slice() : [],
    reportVersion: state.reportVersion,
    metricQuality: layeredMetricQualityRows(state.target, state.year),
    facts,
    evidenceFacts,
    boundaryFacts,
    judgement,
    citations,
    dataWarnings: boundaryFacts.map((fact) => ({
      metric: fact.指标代码,
      label: fact.指标名称,
      status: fact.数据状态,
      reason: fact.缺失原因,
      sourceHint: fact.抓取来源
    }))
  };
}

function layeredFactModel() {
  const topics = typeof topicDefinitions === "function" ? topicDefinitions() : [];
  return {
    version: "20260606-layered-v1",
    targetBank: state.target,
    year: state.year,
    peers: Array.isArray(state.peers) ? state.peers.slice() : [],
    reportVersion: state.reportVersion,
    topics: topics.map((topic) => layeredTopicFactModel(topic.id))
  };
}

if (typeof window !== "undefined") {
  window.layeredFactModel = layeredFactModel;
  window.layeredTopicFactModel = layeredTopicFactModel;
}
```

- [ ] **Step 4: Load the adapter in HTML**

In `outputs/vqa_template/index.html`, add this script after `js/35-report-model.js` or after `js/05-analysis.js` once both dependencies are loaded:

```html
<script src="js/36-layered-fact-model.js?v=20260606-layered-v1"></script>
```

- [ ] **Step 5: Run the test and verify the partial pass**

Run:

```bash
node tests/layered_pipeline_contract.test.js
```

Expected: FAIL on `report model must preserve factPackId`.

---

### Task 3: Report Model Carries Fact Pack Lineage

**Files:**
- Modify: `outputs/vqa_template/js/35-report-model.js`
- Test: `outputs/vqa_template/tests/layered_pipeline_contract.test.js`

- [ ] **Step 1: Update section serialization**

In `reportModelSerializeSection(item)`, add `factPackId`, `citationMetricKeys`, and `dataWarnings`:

```javascript
function reportModelSerializeSection(item) {
  const topicId = item.section?.dataset?.topicId || item.storyRole || item.id;
  const topicModel = typeof layeredTopicFactModel === "function" ? layeredTopicFactModel(topicId) : null;
  return {
    id: item.id,
    index: item.index,
    indexText: item.indexText,
    sectionTitle: item.title,
    moduleLabel: item.moduleLabel,
    pageRole: item.pageRole,
    deckType: item.deckType,
    storyRole: item.storyRole || null,
    layoutIntent: item.layoutIntent || null,
    evidenceDensity: item.evidenceDensity || null,
    htmlLayout: item.htmlLayout || null,
    pdfLayout: item.pdfLayout || null,
    pptxLayout: item.pptxLayout || item.deckType || null,
    included: item.included !== false,
    htmlRoute: item.htmlRoute || "formalReport",
    pdfRoute: item.pdfRoute || "browserPrintFormalReport",
    pptxRoute: item.pptxRoute || `pptx:${item.deckType || "content"}`,
    factPackId: topicModel?.factPackId || null,
    citationMetricKeys: topicModel?.citations?.map((fact) => fact.指标代码) || [],
    dataWarnings: topicModel?.dataWarnings || [],
    riskStamp: reportModelExtractRiskStamp(item.section),
    blocks: reportModelExtractBlocks(item.section)
  };
}
```

- [ ] **Step 2: Run the contract test**

Run:

```bash
node tests/layered_pipeline_contract.test.js
```

Expected: PASS and print `layered-pipeline-contract-ok`.

- [ ] **Step 3: Run existing report model test**

Run:

```bash
node tests/report_model_contract.test.js
```

Expected: PASS.

---

### Task 4: AI Narrative Uses Layered Fact Model

**Files:**
- Modify: `outputs/vqa_template/js/12-ai-narrative.js`
- Test: `outputs/vqa_template/tests/layered_pipeline_contract.test.js`

- [ ] **Step 1: Route AI topic packs through the adapter**

In `generateTopicNarrativeDraftAsync(topic, facts, channel)`, replace direct pack construction:

```javascript
const pack = buildTopicFactPackObject(topic.id);
```

with:

```javascript
const pack = typeof layeredTopicFactModel === "function"
  ? layeredTopicFactModel(topic.id)
  : buildTopicFactPackObject(topic.id);
```

- [ ] **Step 2: Add static assertion**

Append to `outputs/vqa_template/tests/layered_pipeline_contract.test.js`:

```javascript
const narrative = fs.readFileSync("js/12-ai-narrative.js", "utf8");
assert(narrative.includes("layeredTopicFactModel(topic.id)"), "AI narrative must use layered topic model when available");
```

- [ ] **Step 3: Run tests**

Run:

```bash
node tests/layered_pipeline_contract.test.js
npm run test:deepseek
```

Expected: both pass.

---

### Task 5: Data & Validation Shows Cross-Layer Tie-Out

**Files:**
- Modify: `outputs/vqa_template/index.html`
- Modify: `outputs/vqa_template/js/03-data-format.js`
- Modify: `outputs/vqa_template/styles/app.css`
- Test: `outputs/vqa_template/tests/layered_pipeline_contract.test.js`

- [ ] **Step 1: Add container**

In the Data & Validation page, add:

```html
<section class="layered-tieout-panel" id="layeredTieoutPanel">
  <div class="section-head">
    <span>分层链路</span>
    <h3>数据层、计算层、显示层、报告层串联复核</h3>
  </div>
  <div id="layeredTieoutBody"></div>
</section>
```

- [ ] **Step 2: Render tie-out rows**

Add to `outputs/vqa_template/js/03-data-format.js`:

```javascript
function renderLayeredTieout() {
  const host = document.getElementById("layeredTieoutBody");
  if (!host || typeof layeredFactModel !== "function") return;
  const model = layeredFactModel();
  host.innerHTML = model.topics.map((topic) => `
    <div class="layered-tieout-row">
      <b>${topic.topicId}</b>
      <span>核心证据 ${topic.evidenceFacts.length}</span>
      <span>数据边界 ${topic.boundaryFacts.length}</span>
      <span>引用 ${topic.citations.length}</span>
      <em>${topic.factPackId}</em>
    </div>
  `).join("");
}
```

Call it at the end of `updateDataCoverage()`:

```javascript
renderLayeredTieout();
```

- [ ] **Step 3: Style the panel**

Add to `outputs/vqa_template/styles/app.css`:

```css
.layered-tieout-panel {
  border: 1px solid #d9e5ef;
  background: #fff;
  padding: 14px;
}

.layered-tieout-row {
  display: grid;
  grid-template-columns: minmax(150px, 1fr) repeat(3, 110px) minmax(220px, 1.2fr);
  gap: 10px;
  align-items: center;
  padding: 9px 0;
  border-bottom: 1px solid #e5edf3;
  color: #334155;
  font-size: var(--font-caption);
  font-weight: 800;
}

.layered-tieout-row em {
  color: #64748b;
  font-style: normal;
  overflow-wrap: anywhere;
}
```

- [ ] **Step 4: Extend test**

Append to `outputs/vqa_template/tests/layered_pipeline_contract.test.js`:

```javascript
const format = fs.readFileSync("js/03-data-format.js", "utf8");
const css = fs.readFileSync("styles/app.css", "utf8");
assert(html.includes('id="layeredTieoutPanel"'), "Validation page must include layered tieout panel");
assert(format.includes("function renderLayeredTieout()"), "data validation must render layered tieout");
assert(format.includes("renderLayeredTieout();"), "updateDataCoverage must refresh layered tieout");
assert(css.includes(".layered-tieout-row"), "tieout panel must be styled");
```

- [ ] **Step 5: Run tests**

Run:

```bash
npm run test:data-bridge
node tests/layered_pipeline_contract.test.js
```

Expected: both pass.

---

### Task 6: End-to-End Verification Script

**Files:**
- Modify: `outputs/vqa_template/package.json`

- [ ] **Step 1: Add full chain script**

Add this script:

```json
"test:layered-pipeline": "node --check js/05-analysis.js && node --check js/12-ai-narrative.js && node --check js/35-report-model.js && node --check js/36-layered-fact-model.js && node tests/ready_portal_bridge_contract.test.js && node tests/topic_data_bridge_contract.test.js && node tests/layered_pipeline_contract.test.js && node tests/report_model_contract.test.js && node tests/llm_commentary_contract.test.js"
```

- [ ] **Step 2: Run full chain**

Run:

```bash
npm run test:layered-pipeline
```

Expected: all checks pass.

---

## Implementation Order

1. Build the contract document first so data, calculation, display, and report naming is fixed.
2. Add `layeredFactModel()` as the single browser adapter.
3. Let report model carry `factPackId`, citation keys, and data warnings.
4. Route AI narrative through the layered model.
5. Add Data & Validation tie-out so business users can see where evidence drops out.
6. Add one full-chain test command.

---

## Self-Review

**Spec coverage:** The plan covers all four requested layers and defines how data flows across them. It also covers AI commentary because the current product generates language after analysis.

**Placeholder scan:** No implementation step uses vague future-work language. Code snippets are concrete and file-specific.

**Type consistency:** `factPackId`, `evidenceFacts`, `boundaryFacts`, `dataWarnings`, and `metricQuality` are introduced in Task 2 and reused consistently in Tasks 3-6.
