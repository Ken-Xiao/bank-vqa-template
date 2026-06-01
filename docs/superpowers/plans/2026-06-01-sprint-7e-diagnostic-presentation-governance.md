# Sprint 7E Diagnostic Presentation Governance Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the next sprint fix the default diagnosis page’s evidence quality and spatial hierarchy: anomaly radar, peer position, change/deviation cards, and the delivery control rail.

**Architecture:** Keep the existing Step 2 containers and formal report structure. Add a compact evidence model in `js/19-product-workspace.js` and `js/27-v6-boardroom-engine.js`, then tune CSS in `styles/app.css` so the default analysis view reads as concise evidence cards instead of long text rows. Move the delivery control rail from a dominant sticky side rail toward a compact collapsed-by-default / drawer-like review surface.

**Tech Stack:** Static HTML/CSS/JS, existing SPARC/VQA functions, existing Superpowers contract tests, Playwright smoke validation.

---

## Current Diagnosis

The latest consolidated plan points to Sprint 7B/7E as the next work area:

- Sprint 7B still has unfinished polish around `Top Changes & Deviations`, `同业位置`, and the `1+3+N` default diagnosis page.
- Sprint 7E is supposed to productize lower-frequency controls into a toolbox/drawer. The current report delivery control rail is visible and sticky enough that it blocks the report reading surface.

User-observed issues map cleanly into one sprint:

- `异动雷达`: rows are too long, labels such as `周期` / `混合` are unclear, and the card does not explain why each anomaly matters.
- `同业位置`: SPARC cards repeat labels and show weak informational value; it should show position, weakest metric, and management implication in fewer words.
- `异动和偏离`: current Top Changes/Deviations rows show values but not interpretation; they should distinguish momentum, peer gap, and action signal.
- `交付控制台`: sticky right rail crowds the report and should default to a compact state while preserving access to review, PRD coverage, AI governance, export QA, and structure editor.

## Files

- Modify: `js/19-product-workspace.js`
  - Add compact Step 2 models for peer position and change/deviation rows.
  - Replace long row text with `metric / status / evidence / implication` cards.
- Modify: `js/27-v6-boardroom-engine.js`
  - Add anomaly classification labels that explain `结构性`, `周期性`, `混合`, and `待验证`.
  - Add short “why this matters” strings for each anomaly row.
- Modify: `styles/app.css`
  - Add compact evidence card styles.
  - Reduce SPARC card height and prevent long text from stretching rows.
  - Rework `.report-control-rail` to collapsed-by-default ergonomics for the report page.
- Modify: `styles/rsm-deck.css`
  - Keep formal-report and governance panel compatibility if app styles do not fully cover rail layout.
- Test: `tests/sprint7e_diagnostic_presentation_contract.test.js`
  - Contract-test new helper names, UI labels, and collapsed rail behavior.

## Task 1: Anomaly Signal Semantics

**Files:**
- Modify: `js/27-v6-boardroom-engine.js`
- Test: `tests/sprint7e_diagnostic_presentation_contract.test.js`

- [ ] **Step 1: Write the failing contract test**

```js
const fs = require("fs");
const assert = require("assert/strict");

const boardroom = fs.readFileSync("js/27-v6-boardroom-engine.js", "utf8");
const workspace = fs.readFileSync("js/19-product-workspace.js", "utf8");
const css = fs.readFileSync("styles/app.css", "utf8");

[
  "function v6AnomalySemanticTag",
  "function v6AnomalyWhyItMatters",
  "结构性信号",
  "周期扰动",
  "待验证混合信号",
  "管理含义"
].forEach((needle) => assert(boardroom.includes(needle), `missing anomaly semantic marker: ${needle}`));

assert(workspace.includes("function step2ChangeCardModel"), "Step 2 must have compact change card model");
assert(workspace.includes("change-signal-pill"), "Step 2 change cards must show a signal pill");
assert(css.includes(".step2-change-card"), "CSS must define compact change cards");
assert(css.includes(".report-control-rail.is-docked"), "delivery rail must support compact docked mode");

console.log("sprint7e-diagnostic-presentation-contract-ok");
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node tests/sprint7e_diagnostic_presentation_contract.test.js`

Expected: fails on missing `v6AnomalySemanticTag`.

- [ ] **Step 3: Add semantic tag helper**

Add to `js/27-v6-boardroom-engine.js` near `v6AnomalyRadar`:

```js
function v6AnomalySemanticTag(item = {}) {
  const absZ = Math.abs(item.z || 0);
  const absMomentum = Math.abs(item.momentumScore || 0);
  if (absZ >= 1.5 && absMomentum >= 20) {
    return { label: "结构性信号", tone: "red", help: "同时偏离同业且变化明显，优先进入董事会问题清单。" };
  }
  if (absZ >= 1.2) {
    return { label: "同业偏离", tone: item.isBad ? "red" : "green", help: "主要问题来自横向位置，需要解释为什么不同于对标组。" };
  }
  if (absMomentum >= 20) {
    return { label: "周期扰动", tone: item.momentumScore < 0 ? "amber" : "green", help: "主要问题来自本期变化，需要判断是否为短期扰动。" };
  }
  return { label: "待验证混合信号", tone: "neutral", help: "横向偏离和纵向变化均不极端，保留跟踪即可。" };
}

function v6AnomalyWhyItMatters(item = {}) {
  const targetText = `目标 ${metricDisplayValue(item.key, item.current)}`;
  const peerText = item.peer == null ? "" : `对标 ${metricDisplayValue(item.key, item.peer)}`;
  const momentumText = item.momentum?.direction ? `${item.momentum.direction}` : "趋势待判";
  const semantic = v6AnomalySemanticTag(item);
  return `${semantic.label}：${[targetText, peerText, momentumText].filter(Boolean).join("；")}。${semantic.help}`;
}
```

- [ ] **Step 4: Replace vague tag rendering in anomaly HTML**

In `v6AnomalyRadarHtml`, replace row internals with:

```js
const render = (items, showPeer = false) => items.map((item) => {
  const semantic = v6AnomalySemanticTag(item);
  const evidence = showPeer
    ? `目标 ${metricDisplayValue(item.key, item.current)}｜对标 ${metricDisplayValue(item.key, item.peer)}`
    : `${item.momentum.direction || "变化待判"}｜${item.momentum.acceleration || "动量待判"}`;
  return `
    <div class="v6-anomaly-row tone-${semantic.tone} ${item.absZ >= 1.5 ? "is-cross" : ""}">
      <b>${item.label}</b>
      <span>${evidence}</span>
      <em>${semantic.label}</em>
      <p>${v6AnomalyWhyItMatters(item)}</p>
    </div>`;
}).join("");
```

- [ ] **Step 5: Run focused checks**

Run:

```bash
node --check js/27-v6-boardroom-engine.js
node tests/sprint7e_diagnostic_presentation_contract.test.js
```

Expected: JS syntax passes; contract may still fail until Task 2/3 are done.

## Task 2: Compact Step 2 Change and Deviation Cards

**Files:**
- Modify: `js/19-product-workspace.js`
- Modify: `styles/app.css`
- Test: `tests/sprint7e_diagnostic_presentation_contract.test.js`

- [ ] **Step 1: Add Step 2 change card helper**

Add near `step2TopChangesModel`:

```js
function step2ChangeCardModel(item = {}, mode = "momentum") {
  const semantic = typeof v6AnomalySemanticTag === "function"
    ? v6AnomalySemanticTag(item)
    : { label: item.tag || "待判断", tone: "neutral", help: "保留跟踪。" };
  const evidence = mode === "peer"
    ? `目标 ${step2Metric(item.key, item.current)}｜对标 ${step2Metric(item.key, item.peer)}`
    : `${item.momentum?.direction || "变化待判"}｜${item.momentum?.acceleration || "动量待判"}`;
  const implication = typeof v6AnomalyWhyItMatters === "function"
    ? v6AnomalyWhyItMatters(item)
    : `${item.label || "指标"}需要结合趋势和对标位置复核。`;
  return {
    label: item.label || fieldName(item.key),
    evidence,
    signal: semantic.label,
    tone: semantic.tone || "neutral",
    implication: pptxShortText ? pptxShortText(implication, 58) : implication.slice(0, 58)
  };
}
```

- [ ] **Step 2: Replace long row rendering**

In `renderStep2TopChanges`, replace `.step2-change-row` with `.step2-change-card`:

```js
${items.length ? items.slice(0, 3).map((item) => {
  const card = step2ChangeCardModel(item, mode);
  return `
    <div class="step2-change-card tone-${card.tone}">
      <div><span>${step2Esc(card.label)}</span><em class="change-signal-pill">${step2Esc(card.signal)}</em></div>
      <b>${step2Esc(card.evidence)}</b>
      <p>${step2Esc(card.implication)}</p>
    </div>`;
}).join("") : "<p class=\"step2-change-empty\">暂无显著项目。</p>"}
```

- [ ] **Step 3: Add compact CSS**

Add to `styles/app.css` near `.step2-change-row` styles:

```css
.step2-change-card {
  display: grid;
  gap: 6px;
  min-height: 76px;
  padding: 10px 0;
  border-top: 1px solid #edf2f7;
}

.step2-change-card > div {
  align-items: center;
  display: flex;
  gap: 8px;
  justify-content: space-between;
  min-width: 0;
}

.step2-change-card span,
.step2-change-card b,
.step2-change-card p {
  overflow: hidden;
  text-overflow: ellipsis;
}

.step2-change-card span {
  color: #172331;
  font-size: 12px;
  font-weight: 900;
  white-space: nowrap;
}

.step2-change-card b {
  color: #34465a;
  font-size: 12px;
  line-height: 1.25;
  white-space: nowrap;
}

.step2-change-card p {
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 2;
  color: #64748b;
  display: -webkit-box;
  font-size: 11px;
  line-height: 1.35;
  margin: 0;
}

.change-signal-pill {
  border-radius: 999px;
  background: #eef7fd;
  color: var(--blue) !important;
  flex-shrink: 0;
  font-size: 10px !important;
  padding: 3px 7px;
}
```

- [ ] **Step 4: Run focused checks**

Run:

```bash
node --check js/19-product-workspace.js
node tests/sprint7e_diagnostic_presentation_contract.test.js
```

Expected: contract progresses to rail checks.

## Task 3: Peer Position Card Compression

**Files:**
- Modify: `js/19-product-workspace.js`
- Modify: `styles/app.css`

- [ ] **Step 1: Add compact peer position readout helper**

Add near `renderStep2PeerPosition`:

```js
function step2PeerPositionReadout(item = {}, signal = {}) {
  const metric = item.weakestMetric;
  const metricText = metric ? `${metric.label} ${step2Metric(metric.key, metric.value)}` : item.question || "需复核关键指标";
  const action = signal.level === "red"
    ? "先解释压力来源"
    : signal.level === "yellow"
      ? "保留专题跟踪"
      : "可作为支撑证据";
  return { metricText, action };
}
```

- [ ] **Step 2: Replace SPARC paragraph with two-line compact readout**

In `renderStep2PeerPosition`, replace the `<p>` line with:

```js
${(() => {
  const readout = step2PeerPositionReadout(item, signal);
  return `<p><b>${step2Esc(readout.metricText)}</b><span>${step2Esc(readout.action)}</span></p>`;
})()}
```

- [ ] **Step 3: Update peer card CSS**

Add:

```css
.step2-sparc-card p {
  display: grid;
  gap: 4px;
}

.step2-sparc-card p b {
  color: #203247;
  font-size: 12px;
  line-height: 1.25;
}

.step2-sparc-card p span {
  color: #667789;
  font-size: 11px;
  font-weight: 800;
}
```

- [ ] **Step 4: Run smoke checks**

Run:

```bash
node --check js/19-product-workspace.js
node tests/sprint7d_delivery_storyline_contract.test.js
```

Expected: syntax and prior storyline contract pass.

## Task 4: Delivery Console Rail Ergonomics

**Files:**
- Modify: `index.html`
- Modify: `styles/app.css`
- Test: `tests/sprint7e_diagnostic_presentation_contract.test.js`

- [ ] **Step 1: Make rail compact by default**

In `index.html`, change:

```html
<aside class="report-control-rail" id="reportControlRail" aria-label="报告交付控制台">
```

to:

```html
<aside class="report-control-rail is-docked is-collapsed" id="reportControlRail" aria-label="报告交付控制台">
```

Keep the existing toggle button and panel content unchanged.

- [ ] **Step 2: Add docked rail CSS**

Add to `styles/app.css` near `.report-control-rail`:

```css
.report-control-rail.is-docked {
  align-self: start;
  justify-self: end;
}

.report-control-rail:not(.is-collapsed) {
  max-width: min(420px, 32vw);
}

.report-control-rail.is-docked.is-collapsed {
  position: sticky;
  top: 86px;
}
```

- [ ] **Step 3: Reduce opened rail dominance**

Adjust existing rail panel styles:

```css
.report-control-rail .governance-panel,
.report-control-rail .governance-panel.is-wide {
  max-height: 320px;
  overflow: auto;
}

.report-control-rail .board-review-head h2 {
  font-size: 16px;
}
```

- [ ] **Step 4: Run contract check**

Run:

```bash
node tests/sprint7e_diagnostic_presentation_contract.test.js
git diff --check
```

Expected: contract passes, no whitespace errors.

## Task 5: Browser Smoke and Acceptance

**Files:**
- No source file changes unless smoke reveals issues.

- [ ] **Step 1: Start local server**

Run: `python3 -m http.server 8766`

Expected: server starts.

- [ ] **Step 2: Use Playwright to confirm analysis page**

Open `http://127.0.0.1:8766/`, confirm analysis, and evaluate:

```js
(() => {
  if (!state.confirmed && typeof confirmSelection === "function") confirmSelection();
  if (typeof renderAll === "function") renderAll();
  return JSON.stringify({
    changeCards: document.querySelectorAll(".step2-change-card").length,
    signalPills: document.querySelectorAll(".change-signal-pill").length,
    peerCards: document.querySelectorAll(".step2-sparc-card").length,
    railCollapsed: document.getElementById("reportControlRail")?.classList.contains("is-collapsed"),
    railDocked: document.getElementById("reportControlRail")?.classList.contains("is-docked")
  });
})()
```

Expected:

```json
{
  "changeCards": 12,
  "signalPills": 12,
  "peerCards": 5,
  "railCollapsed": true,
  "railDocked": true
}
```

- [ ] **Step 3: Stop local server**

Run: `lsof -ti tcp:8766`, then `kill <pid>`.

- [ ] **Step 4: Final test batch**

Run:

```bash
node --check js/19-product-workspace.js
node --check js/27-v6-boardroom-engine.js
node tests/sprint7e_diagnostic_presentation_contract.test.js
node tests/sprint7d_delivery_storyline_contract.test.js
node tests/export_sequence_qa_contract.test.js
git diff --check
```

Expected: all pass.

## Acceptance Criteria

- Step 2 `异动偏离` no longer shows vague `周期 / 混合` labels by themselves. Each row has a semantic signal and a short implication.
- `同业位置` shows five compact SPARC cards with clear position, weakest metric, and management action.
- `异动和偏离` fits in the evidence section without long wrapping rows.
- Delivery console defaults to a compact docked rail and does not block the report reading surface.
- Export QA and formal report remain unaffected.

## Scope Not Included

- No new data source.
- No full redesign of Step 1.
- No cloud LLM.
- No PPTX vectorization in this sprint.
- No report structure editor rewrite; only delivery rail ergonomics.

