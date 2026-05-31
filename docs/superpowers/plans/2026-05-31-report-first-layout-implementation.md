# Report First Layout Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Re-layout the existing BenchmarkIQ HTML app so the post-analysis default experience is a report-first workspace instead of a long stacked page.

**Architecture:** Keep all analysis modules and existing IDs intact. Add a lightweight `report-first-workspace` wrapper around the formal report and review controls, then use CSS and a small workspace-tab default change to make the report canvas the primary surface. Supporting overview/topics/data/governance modules remain accessible through existing tabs.

**Tech Stack:** Static HTML, CSS, vanilla JavaScript, existing contract tests with Node `assert`.

---

### Task 1: Contract Test

**Files:**
- Create: `tests/report_first_layout_contract.test.js`
- Modify later: `index.html`, `styles/app.css`, `js/19-product-workspace.js`

- [ ] **Step 1: Write the failing test**

```js
const fs = require("fs");
const assert = require("assert/strict");

const html = fs.readFileSync("index.html", "utf8");
const css = fs.readFileSync("styles/app.css", "utf8");
const workspace = fs.readFileSync("js/19-product-workspace.js", "utf8");

assert(html.includes("reportFirstWorkspace"), "HTML must expose report-first workspace shell");
assert(html.includes("reportFirstMain"), "HTML must expose central report canvas column");
assert(html.includes("reportControlRail"), "HTML must expose persistent right report control rail");
assert(html.indexOf("formalReportShell") < html.indexOf("reportControlRail"), "report canvas must precede control rail in reading order");
assert(css.includes(".report-first-workspace"), "CSS must style report-first workspace");
assert(css.includes(".report-control-rail"), "CSS must style persistent report control rail");
assert(css.includes("body.analysis-ready:not(.setup-expanded) .control-surface"), "CSS must keep setup compact after analysis is ready");
assert(workspace.includes('state.activeWorkspaceTab = "report"'), "post-confirm default tab must be report");

console.log("report-first-layout-contract-ok");
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node tests/report_first_layout_contract.test.js`

Expected: FAIL with `HTML must expose report-first workspace shell`.

### Task 2: Mark Up Report-First Shell

**Files:**
- Modify: `index.html`

- [ ] **Step 1: Wrap the report and review controls**

Move the existing report tools, formal report shell, and board review panel into:

```html
<section class="report-first-workspace analysis-content" id="reportFirstWorkspace" data-workspace-tab="report" aria-label="正式报告工作台">
  <div class="report-first-main" id="reportFirstMain">
    <!-- existing report tools and formalReportShell -->
  </div>
  <aside class="report-control-rail" id="reportControlRail" aria-label="报告交付控制台">
    <!-- existing board review panel contents -->
  </aside>
</section>
```

Keep the existing child IDs unchanged: `formalReportShell`, `formalReport`, `boardReviewPanel`, `deliveryReviewPanel`, `prdCoverageDashboard`, `aiGovernancePanel`, `exportSequenceQaPanel`, and `reportStructureEditor`.

- [ ] **Step 2: Run contract test**

Run: `node tests/report_first_layout_contract.test.js`

Expected: still FAIL until CSS and JS default are added.

### Task 3: Add Report-First CSS

**Files:**
- Modify: `styles/app.css`

- [ ] **Step 1: Add layout styles**

Add CSS for:

```css
.report-first-workspace {
  align-items: start;
  display: grid;
  gap: 18px;
  grid-template-columns: minmax(0, 1fr) 360px;
}

.report-first-main { min-width: 0; }
.report-control-rail { position: sticky; top: 18px; }
```

Also keep `control-surface` compact after analysis is ready using the existing `body.analysis-ready:not(.setup-expanded)` selector.

- [ ] **Step 2: Add responsive behavior**

At desktop widths below 1180px, collapse the workspace to one column:

```css
@media (max-width: 1180px) {
  .report-first-workspace { grid-template-columns: 1fr; }
  .report-control-rail { position: static; }
}
```

### Task 4: Make Report The Default Post-Analysis Workspace

**Files:**
- Modify: `js/19-product-workspace.js`

- [ ] **Step 1: Change post-confirm default**

Find the code path that sets the active workspace after analysis is formed. Set:

```js
state.activeWorkspaceTab = "report";
```

The existing tab rendering logic should continue to show other tabs.

### Task 5: Verify And Commit

**Files:**
- Test: `tests/report_first_layout_contract.test.js`
- Verify affected JS and existing governance tests

- [ ] **Step 1: Run static checks**

Run:

```bash
node tests/report_first_layout_contract.test.js
for f in js/*.js; do node --check "$f" || exit 1; done
node tests/prd_traceability_contract.test.js && node tests/ai_governance_contract.test.js && node tests/export_sequence_qa_contract.test.js && node tests/ceam_structure_editor_contract.test.js
```

Expected: all commands exit 0.

- [ ] **Step 2: Browser smoke test**

Open `http://127.0.0.1:8765/index.html`, form analysis, and verify:

- body has `analysis-ready`
- active tab is `report`
- `reportFirstWorkspace` is visible
- `formalReportShell` and `reportControlRail` are visible in the same viewport on desktop
- console has no page errors

- [ ] **Step 3: Commit**

```bash
git add index.html styles/app.css js/19-product-workspace.js tests/report_first_layout_contract.test.js docs/superpowers/plans/2026-05-31-report-first-layout-implementation.md
git commit -m "Implement report-first workspace layout"
```

## Self-Review

Spec coverage: the plan covers the compact top bar indirectly through existing compact `control-surface`, central report canvas through `reportFirstMain`, right rail through `reportControlRail`, and default report priority through `state.activeWorkspaceTab = "report"`.

Placeholder scan: no placeholder tasks remain.

Type consistency: all IDs and selectors match existing DOM naming patterns.
