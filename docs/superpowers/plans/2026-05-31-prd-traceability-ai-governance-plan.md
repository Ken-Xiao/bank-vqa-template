# PRD Traceability AI Governance Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a local delivery-control layer that tracks PRD-01 through PRD-40, audits fact-pack-backed AI narratives, supports Draft/Review/Locked report states, and extends export readiness and workbook sheets.

**Architecture:** Add two focused browser modules: `js/28-prd-traceability.js` owns PRD matrix, delivery review state, and PRD dashboard; `js/29-ai-governance.js` owns fact-pack registry, AI citation audit, and narrative lock state. Existing export and readiness modules read these modules through small public functions.

**Tech Stack:** Static HTML/CSS/vanilla JS, localStorage persistence, existing workbook exporter, existing formal report and topic narrative helpers, Node syntax/static tests, in-app Browser smoke verification.

---

### Task 1: PRD Traceability Module

**Files:**
- Create: `js/28-prd-traceability.js`
- Modify: `index.html`
- Modify: `styles/rsm-deck.css`
- Test: `tests/prd_traceability_contract.test.js`

- [ ] **Step 1: Write the failing test**

```js
const fs = require("fs");
const assert = require("assert/strict");
const prd = fs.readFileSync("js/28-prd-traceability.js", "utf8");
const html = fs.readFileSync("index.html", "utf8");

for (let index = 1; index <= 40; index += 1) {
  assert(prd.includes(`PRD-${String(index).padStart(2, "0")}`), `missing PRD-${String(index).padStart(2, "0")}`);
}
assert(prd.includes("function prdRequirementRows"), "must expose prdRequirementRows");
assert(prd.includes("function renderPrdCoverageDashboard"), "must render dashboard");
assert(prd.includes("function deliveryGateChecks"), "must expose delivery gate checks");
assert(html.includes("prdCoverageDashboard"), "review UI must include PRD dashboard host");
console.log("prd-traceability-contract-ok");
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node tests/prd_traceability_contract.test.js`

Expected: FAIL because `js/28-prd-traceability.js` does not exist.

- [ ] **Step 3: Implement module and UI host**

Implement `prdRequirementRows()`, `prdCoverageSummary()`, `deliveryReviewState()`, `setDeliveryStatus()`, `resetDeliveryToDraft()`, `deliveryGateChecks()`, `renderPrdCoverageDashboard()`, and `renderDeliveryReviewPanel()`. Add hosts under `#boardReviewPanel` and load the script before bootstrap.

- [ ] **Step 4: Run test to verify it passes**

Run: `node tests/prd_traceability_contract.test.js`

Expected: `prd-traceability-contract-ok`

### Task 2: AI Governance Module

**Files:**
- Create: `js/29-ai-governance.js`
- Modify: `index.html`
- Modify: `styles/rsm-deck.css`
- Test: `tests/ai_governance_contract.test.js`

- [ ] **Step 1: Write the failing test**

```js
const fs = require("fs");
const assert = require("assert/strict");
const gov = fs.readFileSync("js/29-ai-governance.js", "utf8");
const html = fs.readFileSync("index.html", "utf8");

assert(gov.includes("function factPackRegistryRows"), "must expose factPackRegistryRows");
assert(gov.includes("function narrativeAuditRows"), "must expose narrativeAuditRows");
assert(gov.includes("function toggleNarrativeLock"), "must support narrative locking");
assert(gov.includes("function renderAiGovernancePanel"), "must render AI governance panel");
assert(html.includes("aiGovernancePanel"), "review UI must include AI governance host");
console.log("ai-governance-contract-ok");
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node tests/ai_governance_contract.test.js`

Expected: FAIL because `js/29-ai-governance.js` does not exist.

- [ ] **Step 3: Implement module and UI host**

Implement registry rows from `topicDefinitions()`, `buildTopicFactPackObject()`, `topicFactPackRows()`, and citation helpers. Implement audit rows for `board`, `market`, and `action`; lock state in `state.narrativeLocks`; render review UI and lock buttons.

- [ ] **Step 4: Run test to verify it passes**

Run: `node tests/ai_governance_contract.test.js`

Expected: `ai-governance-contract-ok`

### Task 3: Export Gate And Workbook Sheets

**Files:**
- Modify: `js/16-trial-checks.js`
- Modify: `js/07-export.js`
- Modify: `js/09-projects.js`
- Modify: `js/12-ai-narrative.js`
- Test: `tests/export_gate_governance_contract.test.js`

- [ ] **Step 1: Write the failing test**

```js
const fs = require("fs");
const assert = require("assert/strict");
const checks = fs.readFileSync("js/16-trial-checks.js", "utf8");
const exp = fs.readFileSync("js/07-export.js", "utf8");
const projects = fs.readFileSync("js/09-projects.js", "utf8");
const ai = fs.readFileSync("js/12-ai-narrative.js", "utf8");

assert(checks.includes("deliveryGateChecks"), "preflight must use delivery gate checks");
assert(exp.includes("PRD完成度"), "workbook must export PRD coverage");
assert(exp.includes("事实包注册表"), "workbook must export fact-pack registry");
assert(exp.includes("AI引用审计"), "workbook must export AI audit");
assert(exp.includes("文案锁定状态"), "workbook must export narrative locks");
assert(projects.includes("deliveryReview"), "project snapshot must persist delivery review");
assert(projects.includes("narrativeLocks"), "project snapshot must persist narrative locks");
assert(ai.includes("isNarrativeLocked"), "AI editor must respect narrative locks");
console.log("export-gate-governance-contract-ok");
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node tests/export_gate_governance_contract.test.js`

Expected: FAIL because export gate and workbook sheets are not wired.

- [ ] **Step 3: Implement integration**

Extend `trialReadinessChecks()` with governance rows. Extend `preflightExport()` to respect blockers. Add workbook sheets from governance export row functions. Persist `deliveryReview` and `narrativeLocks` in project snapshots. Disable locked narrative editors and reset delivery to Draft when text changes.

- [ ] **Step 4: Run test to verify it passes**

Run: `node tests/export_gate_governance_contract.test.js`

Expected: `export-gate-governance-contract-ok`

### Task 4: Verification

**Files:**
- All modified files.

- [ ] **Step 1: Run syntax checks**

Run:

```bash
for f in js/*.js; do node --check "$f" || exit 1; done
```

Expected: no output and exit 0.

- [ ] **Step 2: Run governance tests**

Run:

```bash
node tests/prd_traceability_contract.test.js
node tests/ai_governance_contract.test.js
node tests/export_gate_governance_contract.test.js
```

Expected: all three `*-ok` messages.

- [ ] **Step 3: Browser smoke**

Open `http://127.0.0.1:8765/index.html`, confirm analysis, verify PRD dashboard, AI governance panel, delivery state controls, and export warning/check status render without console errors.

