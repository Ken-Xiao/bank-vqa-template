# PRD V8 Decision Workbench Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Turn BenchmarkIQ from a report-capable analysis tool into a full-screen bank decision workbench with 60-second start, insight-triangle language, and dynamic data interaction.

**Architecture:** Keep the existing static frontend architecture and current `setup / analysis / report / drawer` state model. Add focused helpers for launch flow, insight-triangle readouts, wide-screen layout governance, and dynamic metric context rather than rewriting the analysis engine.

**Tech Stack:** Static HTML/CSS/JavaScript, existing `records` dataset, `analysis_rules.json`, local contract tests under `tests/`, browser smoke through local `python3 -m http.server` and headless Chrome.

---

## PRD V8 Scope

This plan incorporates the attached PRD into `docs/next-improvement-plan-consolidated.md` and schedules it after the already-started Sprint 8 AI/commentary work.

### Product Direction

BenchmarkIQ should answer three questions faster:

1. Which bank am I analyzing, and who is the right peer group?
2. What is the strongest defensible conclusion?
3. Which evidence and action should go into the board conversation?

### Non-Goals

- Do not expand to 260 bond-issuing banks in Sprint 9/10.
- Do not build fixed-effect regression or peer trajectory clustering before the time-series and heatmap UI are stable.
- Do not put model API keys in the browser.
- Do not rewrite SPARC/VQA engines; make them less visible to users and more coherent in presentation.

## File Structure

- Modify: `docs/next-improvement-plan-consolidated.md`  
  Holds PRD v8 requirement pool, sprint sequencing, and updated prioritization.

- Modify: `index.html`  
  Adds or rearranges launch, scenario, density, and metric-context host containers.

- Modify: `styles/app.css`  
  Adds wide-screen layout tokens, 60-second launch layout, topic insight triangle styles, and matrix/time-series containers.

- Modify: `js/04-ui-selection.js`  
  Owns target bank launch UX, recommended peer preview, and advanced setting collapse behavior.

- Modify: `js/05-analysis.js`  
  Owns topic question titles, insight-triangle data, cross-signal rows, and topic-level render hooks.

- Modify: `js/19-product-workspace.js`  
  Owns analysis section routing, drawer links, right context panel, and wide-screen workbench behavior.

- Create: `js/34-decision-workbench.js`  
  Focused helper for PRD v8: scenario labels, insight triangle generation, metric time-series snapshots, peer matrix data, and What-if projection snapshots.

- Modify: `js/10-bootstrap.js`  
  Initializes `initDecisionWorkbenchModule()` after current product workspace modules.

- Create: `tests/sprint9a_launch_contract.test.js`  
  Contract for 60-second launch, advanced setting collapse, and recommended peer preview.

- Create: `tests/sprint9b_insight_triangle_contract.test.js`  
  Contract for question-style topic titles and insight-triangle helper output.

- Create: `tests/sprint9c_wide_workbench_contract.test.js`  
  Contract for wide-screen layout tokens and right context panel hooks.

- Create: `tests/sprint10a_metric_timeseries_contract.test.js`  
  Contract for metric time-series snapshots.

- Create: `tests/sprint10b_peer_heatmap_contract.test.js`  
  Contract for peer matrix heatmap rows.

- Create: `tests/sprint10c_whatif_projection_contract.test.js`  
  Contract for What-if projection metadata and simulated readout labels.

---

## Sprint 9A: 60-Second Launch

**Goal:** Make the first screen feel like a fast start, not a full control console.

**Files:**
- Modify: `index.html`
- Modify: `styles/app.css`
- Modify: `js/04-ui-selection.js`
- Create: `tests/sprint9a_launch_contract.test.js`

- [ ] **Step 1: Write the failing launch contract**

Create `tests/sprint9a_launch_contract.test.js`:

```js
const fs = require("fs");
const assert = require("assert/strict");

const html = fs.readFileSync("index.html", "utf8");
const css = fs.readFileSync("styles/app.css", "utf8");
const selection = fs.readFileSync("js/04-ui-selection.js", "utf8");

[
  "quickLaunchPanel",
  "recommendedPeerPreview",
  "advancedSetupToggle",
  "analysisScenarioSelect"
].forEach((needle) => assert(html.includes(needle), `Launch HTML missing ${needle}`));

[
  ".quick-launch-panel",
  ".recommended-peer-preview",
  ".setup-advanced.is-collapsed"
].forEach((needle) => assert(css.includes(needle), `Launch CSS missing ${needle}`));

[
  "function renderRecommendedPeerPreview",
  "function toggleAdvancedSetup",
  "function selectedAnalysisScenario"
].forEach((needle) => assert(selection.includes(needle), `Launch JS missing ${needle}`));

console.log("sprint9a-launch-contract-ok");
```

- [ ] **Step 2: Run the failing test**

Run:

```bash
node tests/sprint9a_launch_contract.test.js
```

Expected: FAIL with missing `quickLaunchPanel` or `renderRecommendedPeerPreview`.

- [ ] **Step 3: Add launch containers**

In `index.html`, add:

```html
<section class="quick-launch-panel" id="quickLaunchPanel" aria-label="60秒启动">
  <div>
    <span>60秒启动</span>
    <h2>选择一家银行，系统自动生成推荐对标组和第一句诊断</h2>
    <p>高级筛选、报告版本和手动对标组默认收起，避免首次进入被配置项淹没。</p>
  </div>
  <label class="launch-scenario">
    <span>分析情景</span>
    <select id="analysisScenarioSelect">
      <option value="board">董事会判断</option>
      <option value="market">资本市场沟通</option>
      <option value="action">管理层行动</option>
    </select>
  </label>
  <div class="recommended-peer-preview" id="recommendedPeerPreview"></div>
  <button type="button" class="btn secondary" id="advancedSetupToggle">展开高级设置</button>
</section>
```

- [ ] **Step 4: Add launch styles**

In `styles/app.css`, add:

```css
.quick-launch-panel {
  display: grid;
  grid-template-columns: minmax(0, 1.35fr) minmax(220px, .45fr);
  gap: 16px;
  align-items: start;
  max-width: min(980px, 94vw);
  margin: 18px auto;
  padding: 18px;
  border: 1px solid #d9e4ef;
  border-left: 6px solid #0099d8;
  background: #fff;
  box-shadow: 0 18px 46px rgba(6, 27, 58, .1);
}

.recommended-peer-preview {
  grid-column: 1 / -1;
  display: grid;
  gap: 8px;
  padding: 12px;
  border: 1px solid #dce7ef;
  background: #f8fbfd;
}

.setup-advanced.is-collapsed {
  display: none;
}
```

- [ ] **Step 5: Add launch JS helpers**

In `js/04-ui-selection.js`, add:

```js
function selectedAnalysisScenario() {
  return document.getElementById("analysisScenarioSelect")?.value || "board";
}

function renderRecommendedPeerPreview() {
  const host = document.getElementById("recommendedPeerPreview");
  if (!host) return;
  const peers = state.peers?.length ? state.peers : recommendedPeersForTarget(state.target).slice(0, 5).map((row) => row.bank);
  host.innerHTML = `
    <b>推荐对标组</b>
    <p>${displayBankList(peers, "选择目标银行后自动推荐")}</p>
  `;
}

function toggleAdvancedSetup() {
  const panel = document.querySelector(".setup-advanced");
  if (!panel) return;
  panel.classList.toggle("is-collapsed");
  const button = document.getElementById("advancedSetupToggle");
  if (button) button.textContent = panel.classList.contains("is-collapsed") ? "展开高级设置" : "收起高级设置";
}
```

- [ ] **Step 6: Run the launch contract**

Run:

```bash
node tests/sprint9a_launch_contract.test.js
```

Expected: `sprint9a-launch-contract-ok`

---

## Sprint 9B: Question Titles And Insight Triangle

**Goal:** Make topic pages answer board-level questions and show current value, trend, and mechanism in the first view.

**Files:**
- Modify: `js/05-analysis.js`
- Create: `js/34-decision-workbench.js`
- Modify: `js/10-bootstrap.js`
- Modify: `styles/app.css`
- Create: `tests/sprint9b_insight_triangle_contract.test.js`

- [ ] **Step 1: Write the failing insight contract**

Create `tests/sprint9b_insight_triangle_contract.test.js`:

```js
const fs = require("fs");
const assert = require("assert/strict");

const analysis = fs.readFileSync("js/05-analysis.js", "utf8");
const workbench = fs.readFileSync("js/34-decision-workbench.js", "utf8");
const bootstrap = fs.readFileSync("js/10-bootstrap.js", "utf8");

[
  "function topicQuestionTitle",
  "function topicInsightTriangle",
  "currentValue",
  "trendDirection",
  "mechanismExplanation"
].forEach((needle) => assert(workbench.includes(needle), `Decision workbench missing ${needle}`));

[
  "topicQuestionTitle(topic.id)",
  "topic-insight-triangle"
].forEach((needle) => assert(analysis.includes(needle), `Topic render missing ${needle}`));

assert(bootstrap.includes("initDecisionWorkbenchModule"), "bootstrap should initialize decision workbench");

console.log("sprint9b-insight-triangle-contract-ok");
```

- [ ] **Step 2: Run test and verify failure**

Run:

```bash
node tests/sprint9b_insight_triangle_contract.test.js
```

Expected: FAIL because `js/34-decision-workbench.js` is missing.

- [ ] **Step 3: Create `js/34-decision-workbench.js`**

Add:

```js
/* Bank VQA module: 34-decision-workbench.js — PRD v8 decision workbench helpers */

function topicQuestionTitle(topicId = state.activeTopic) {
  const map = {
    profit: "利润是真的在改善，还是在吃老本？",
    nim: "负债端能否接住资产端的让价？",
    risk: "风险认定是不是已经滞后？",
    capital: "扩表有没有真正创造价值？",
    valuation: "市场低估了我们，还是经营质量还不够好？",
    capitalMarket: "资本市场到底在给哪类质量折价？",
    retailRisk: "零售风险是短期波动，还是客群质量变化？",
    depositLoanDeepDive: "存贷结构能不能支撑息差防守？"
  };
  return map[topicId] || "这个专题会不会改变董事会行动排序？";
}

function topicInsightTriangle(topicId = state.activeTopic) {
  const topic = topicDefinitions().find((item) => item.id === topicId) || topicDefinitions()[0];
  const facts = topicFactPackRows(topicId);
  const primary = facts[0] || {};
  const judgement = topicJudgement(topicId, facts);
  return {
    currentValue: `${primary.指标名称 || topic.title}：${primary.目标值 || "待补"}`,
    trendDirection: `变化方向：一年${primary.一年变化 || "待补"}，${primary.分位 || "分位待补"}`,
    mechanismExplanation: judgement?.headline || topic.mechanism || "机制解释待补充"
  };
}

function initDecisionWorkbenchModule() {
  if (typeof renderTopicWorkbench === "function" && !renderTopicWorkbench.__decisionWorkbenchWrapped) {
    const originalRenderTopicWorkbench = renderTopicWorkbench;
    renderTopicWorkbench = function renderTopicWorkbenchWithDecisionLayer() {
      const result = originalRenderTopicWorkbench.apply(this, arguments);
      return result;
    };
    renderTopicWorkbench.__decisionWorkbenchWrapped = true;
  }
}
```

- [ ] **Step 4: Render insight triangle in topic page**

In `js/05-analysis.js`, inside `renderTopicWorkbench()`, replace the topic heading with:

```js
const insight = typeof topicInsightTriangle === "function" ? topicInsightTriangle(topic.id) : null;
```

Then render:

```html
<h3>${typeof topicQuestionTitle === "function" ? topicQuestionTitle(topic.id) : topic.title}</h3>
<div class="topic-insight-triangle">
  <div><span>当前值</span><b>${insight?.currentValue || "待补"}</b></div>
  <div><span>变化方向</span><b>${insight?.trendDirection || "待补"}</b></div>
  <div><span>机制解释</span><b>${insight?.mechanismExplanation || "待补"}</b></div>
</div>
```

- [ ] **Step 5: Initialize module**

In `js/10-bootstrap.js`, add:

```js
if (typeof initDecisionWorkbenchModule === "function") initDecisionWorkbenchModule();
```

- [ ] **Step 6: Run contract**

Run:

```bash
node tests/sprint9b_insight_triangle_contract.test.js
```

Expected: `sprint9b-insight-triangle-contract-ok`

---

## Sprint 9C: Wide-Screen Workbench

**Goal:** Make the online analysis experience use wide screens like a professional workbench.

**Files:**
- Modify: `styles/app.css`
- Modify: `index.html`
- Modify: `js/19-product-workspace.js`
- Create: `tests/sprint9c_wide_workbench_contract.test.js`

- [x] **Step 1: Write failing layout contract**

Create `tests/sprint9c_wide_workbench_contract.test.js`:

```js
const fs = require("fs");
const assert = require("assert/strict");

const css = fs.readFileSync("styles/app.css", "utf8");
const html = fs.readFileSync("index.html", "utf8");
const workspace = fs.readFileSync("js/19-product-workspace.js", "utf8");

[
  "--workbench-max",
  "--context-rail-width",
  ".analysis-workbench-grid",
  ".metric-context-rail"
].forEach((needle) => assert(css.includes(needle), `Wide workbench CSS missing ${needle}`));

[
  "metricContextRail",
  "analysisWorkbenchGrid"
].forEach((needle) => assert(html.includes(needle), `Wide workbench HTML missing ${needle}`));

assert(workspace.includes("renderMetricContextRail"), "workspace should render metric context rail");

console.log("sprint9c-wide-workbench-contract-ok");
```

- [x] **Step 2: Run failing test**

Run:

```bash
node tests/sprint9c_wide_workbench_contract.test.js
```

Expected: FAIL with missing `--workbench-max`.

- [x] **Step 3: Add wide tokens and grid styles**

In `styles/app.css`, add:

```css
:root {
  --workbench-max: min(1480px, 94vw);
  --context-rail-width: 320px;
}

.analysis-workbench-grid {
  display: grid;
  grid-template-columns: minmax(0, 1fr) var(--context-rail-width);
  gap: 16px;
  max-width: var(--workbench-max);
  margin: 0 auto;
}

.metric-context-rail {
  position: sticky;
  top: calc(var(--global-bar-height) + 14px);
  align-self: start;
  max-height: calc(100vh - var(--global-bar-height) - 30px);
  overflow: auto;
  border: 1px solid #d9e5ef;
  background: #fff;
}
```

- [x] **Step 4: Add HTML hosts**

In `index.html`, wrap the Step 2 body with:

```html
<div class="analysis-workbench-grid" id="analysisWorkbenchGrid">
  <main id="analysisMainCanvas"></main>
  <aside class="metric-context-rail" id="metricContextRail" aria-label="指标上下文"></aside>
</div>
```

- [x] **Step 5: Add context rail renderer**

In `js/19-product-workspace.js`, add:

```js
function renderMetricContextRail(metricKey = "nim") {
  const host = document.getElementById("metricContextRail");
  if (!host) return;
  host.innerHTML = `
    <div class="metric-context-head">
      <span>指标上下文</span>
      <b>${fieldName(metricKey)}</b>
    </div>
    <p>后续 Sprint 10A 会在这里接入目标银行、对标银行和类型均值的 6 年趋势。</p>
  `;
}
```

- [x] **Step 6: Run contract**

Run:

```bash
node tests/sprint9c_wide_workbench_contract.test.js
```

Expected: `sprint9c-wide-workbench-contract-ok`

---

## Sprint 10A: Metric Time-Series Overlay

**Goal:** Clicking a metric should expose target bank, peer average, and type average trend without moving the user away from the current analysis.

**Files:**
- Modify: `js/34-decision-workbench.js`
- Modify: `js/19-product-workspace.js`
- Create: `tests/sprint10a_metric_timeseries_contract.test.js`

- [x] **Step 1: Write failing contract**

Create `tests/sprint10a_metric_timeseries_contract.test.js`:

```js
const fs = require("fs");
const assert = require("assert/strict");

const source = fs.readFileSync("js/34-decision-workbench.js", "utf8");
const workspace = fs.readFileSync("js/19-product-workspace.js", "utf8");

[
  "function metricTimeSeriesSnapshot",
  "targetSeries",
  "peerAverageSeries",
  "typeAverageSeries"
].forEach((needle) => assert(source.includes(needle), `Time-series helper missing ${needle}`));

assert(workspace.includes("metricTimeSeriesSnapshot"), "context rail should consume metric time series snapshot");

console.log("sprint10a-metric-timeseries-contract-ok");
```

- [x] **Step 2: Run failing test**

Run:

```bash
node tests/sprint10a_metric_timeseries_contract.test.js
```

Expected: FAIL with missing `metricTimeSeriesSnapshot`.

- [x] **Step 3: Add helper**

In `js/34-decision-workbench.js`, add:

```js
function metricTimeSeriesSnapshot(metricKey = "nim") {
  const bank = state.target;
  const years = [...new Set(records.map((row) => row.year))].sort();
  const targetSeries = years.map((year) => {
    const row = records.find((item) => item.bank === bank && item.year === year);
    return { year, value: row?.[metricKey] ?? null };
  });
  const peerAverageSeries = years.map((year) => {
    const rows = records.filter((item) => state.peers.includes(item.bank) && item.year === year);
    return { year, value: avg(rows, metricKey) };
  });
  const typeAverageSeries = years.map((year) => {
    const rows = records.filter((item) => state.types.includes(item.type) && item.year === year);
    return { year, value: avg(rows, metricKey) };
  });
  return { metricKey, targetSeries, peerAverageSeries, typeAverageSeries };
}
```

- [x] **Step 4: Render it in rail**

In `renderMetricContextRail`, call:

```js
const snapshot = typeof metricTimeSeriesSnapshot === "function" ? metricTimeSeriesSnapshot(metricKey) : null;
```

Render three compact lines using `snapshot.targetSeries`, `snapshot.peerAverageSeries`, and `snapshot.typeAverageSeries`.

- [x] **Step 5: Run contract**

Run:

```bash
node tests/sprint10a_metric_timeseries_contract.test.js
```

Expected: `sprint10a-metric-timeseries-contract-ok`

---

## Sprint 10B: Peer Matrix Heatmap

**Goal:** Analysts should see bank-by-metric relative position in one dense matrix.

**Files:**
- Modify: `js/34-decision-workbench.js`
- Modify: `styles/app.css`
- Create: `tests/sprint10b_peer_heatmap_contract.test.js`

- [x] **Step 1: Write failing contract**

Create `tests/sprint10b_peer_heatmap_contract.test.js`:

```js
const fs = require("fs");
const assert = require("assert/strict");

const source = fs.readFileSync("js/34-decision-workbench.js", "utf8");
const css = fs.readFileSync("styles/app.css", "utf8");

[
  "function peerHeatmapRows",
  "metricPercentile",
  "heatmapTone"
].forEach((needle) => assert(source.includes(needle), `Peer heatmap helper missing ${needle}`));

[
  ".peer-heatmap",
  ".peer-heatmap-cell"
].forEach((needle) => assert(css.includes(needle), `Peer heatmap style missing ${needle}`));

console.log("sprint10b-peer-heatmap-contract-ok");
```

- [x] **Step 2: Run failing test**

Run:

```bash
node tests/sprint10b_peer_heatmap_contract.test.js
```

Expected: FAIL with missing `peerHeatmapRows`.

- [x] **Step 3: Add heatmap helpers**

In `js/34-decision-workbench.js`, add:

```js
function metricPercentile(row, metricKey) {
  return rankPercentile(row?.[metricKey], currentRecords(), metricKey, metricDirection(metricKey));
}

function heatmapTone(percentile) {
  if (percentile == null || Number.isNaN(percentile)) return "neutral";
  if (percentile >= 70) return "strong";
  if (percentile >= 40) return "middle";
  return "weak";
}

function peerHeatmapRows(metricKeys = ["roa", "nim", "npl", "cet1", "pb"]) {
  const banks = [state.target, ...state.peers].filter(Boolean);
  return banks.map((bank) => {
    const row = currentRecords().find((item) => item.bank === bank);
    return {
      bank,
      cells: metricKeys.map((metricKey) => {
        const percentile = metricPercentile(row, metricKey);
        return { metricKey, percentile, tone: heatmapTone(percentile), value: row?.[metricKey] ?? null };
      })
    };
  });
}
```

- [x] **Step 4: Add heatmap styles**

In `styles/app.css`, add:

```css
.peer-heatmap {
  display: grid;
  gap: 4px;
  overflow: auto;
}

.peer-heatmap-cell {
  min-width: 74px;
  padding: 6px;
  color: #061b3a;
  font-size: 11px;
  font-weight: 900;
  text-align: center;
}
```

- [x] **Step 5: Run contract**

Run:

```bash
node tests/sprint10b_peer_heatmap_contract.test.js
```

Expected: `sprint10b-peer-heatmap-contract-ok`

---

## Sprint 10C: What-If Full Chart Projection

**Goal:** What-if sliders should create a visible simulated scenario that downstream charts and text can identify.

**Files:**
- Modify: `js/34-decision-workbench.js`
- Modify: `js/05-analysis.js`
- Create: `tests/sprint10c_whatif_projection_contract.test.js`

- [ ] **Step 1: Write failing contract**

Create `tests/sprint10c_whatif_projection_contract.test.js`:

```js
const fs = require("fs");
const assert = require("assert/strict");

const source = fs.readFileSync("js/34-decision-workbench.js", "utf8");
const analysis = fs.readFileSync("js/05-analysis.js", "utf8");

[
  "function whatIfProjectionSnapshot",
  "simulatedRecord",
  "simulationLabel"
].forEach((needle) => assert(source.includes(needle), `What-if projection missing ${needle}`));

assert(analysis.includes("simulationLabel"), "analysis should expose simulated readout label");

console.log("sprint10c-whatif-projection-contract-ok");
```

- [ ] **Step 2: Run failing test**

Run:

```bash
node tests/sprint10c_whatif_projection_contract.test.js
```

Expected: FAIL with missing `whatIfProjectionSnapshot`.

- [ ] **Step 3: Add projection helper**

In `js/34-decision-workbench.js`, add:

```js
function whatIfProjectionSnapshot(overrides = {}) {
  const base = targetRecord();
  if (!base) return null;
  const simulatedRecord = {
    ...base,
    nim: overrides.nim ?? base.nim,
    npl: overrides.npl ?? base.npl,
    costIncomeRatio: overrides.costIncomeRatio ?? base.costIncomeRatio
  };
  const peers = peerRecords();
  const diagnosis = computeVqaDiagnosis(simulatedRecord, peers);
  return {
    simulationLabel: "模拟口径",
    simulatedRecord,
    diagnosis,
    changedKeys: Object.keys(overrides)
  };
}
```

- [ ] **Step 4: Surface simulation label in analysis**

In `js/05-analysis.js`, wherever What-if readouts are rendered, include:

```js
const projection = typeof whatIfProjectionSnapshot === "function" ? whatIfProjectionSnapshot(state.whatIfOverrides || {}) : null;
const simulationLabel = projection?.simulationLabel || "";
```

Render `simulationLabel` near projected diagnosis text.

- [ ] **Step 5: Run contract**

Run:

```bash
node tests/sprint10c_whatif_projection_contract.test.js
```

Expected: `sprint10c-whatif-projection-contract-ok`

---

## Verification Bundle

After each task, run the task-specific contract. Before closing Sprint 9/10, run:

```bash
node tests/sprint9a_launch_contract.test.js
node tests/sprint9b_insight_triangle_contract.test.js
node tests/sprint9c_wide_workbench_contract.test.js
node tests/sprint10a_metric_timeseries_contract.test.js
node tests/sprint10b_peer_heatmap_contract.test.js
node tests/sprint10c_whatif_projection_contract.test.js
node tests/llm_commentary_contract.test.js
node tests/sprint8b_commentary_delivery_contract.test.js
git diff --check
```

Expected: all tests pass and no whitespace errors.

## Browser QA

Run a local server:

```bash
python3 -m http.server 8766
```

Verify:

1. Initial page shows the 60-second launch panel.
2. Selecting 苏州农商行 shows recommended peer preview.
3. Confirming setup enters analysis mode without losing selected bank.
4. Topic page shows question-style title and insight triangle.
5. 1440px and 1920px widths use the wider workbench layout.
6. Metric context rail renders without overlapping the main content.

## Self-Review

- Spec coverage: PRD v8 product, content, logic, language, presentation, and data-interaction requirements are mapped to Sprint 9/10/11.
- Placeholder scan: no open placeholders remain; lower-priority items are explicitly deferred to Sprint 11.
- Type consistency: helper names are stable across tasks: `topicInsightTriangle`, `metricTimeSeriesSnapshot`, `peerHeatmapRows`, `whatIfProjectionSnapshot`.
- Scope check: Sprint 9/10 remain frontend/static-data upgrades; cloud LLM, regression modeling, and bank universe expansion are deferred.
