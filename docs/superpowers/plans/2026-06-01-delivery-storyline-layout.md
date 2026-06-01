# HTML PDF PPTX Delivery Storyline Layout Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build one shared delivery storyline model, then adapt it into HTML, PDF, and PPTX layouts that keep the same story order while respecting each format's reading behavior.

**Architecture:** `formalReportModel()` remains the canonical chapter list. A new delivery storyline layer will add narrative roles, layout intent, evidence density, and format-specific rendering hints to each chapter. HTML uses this for navigable reading, PDF uses it for pagination and print-safe blocks, and PPTX uses it for slide archetypes and evidence blocks.

**Tech Stack:** Static HTML/CSS/JavaScript, existing `formalReport` DOM contract, `pptxgenjs`, Playwright smoke checks, Node contract tests.

---

## File Map

- Modify: `js/22-formal-report.js`
  - Owns `formalReportModel()` and should expose `formalDeliveryStorylineModel()`.
  - Adds chapter story roles: `opening`, `answer`, `evidence`, `mechanism`, `topic`, `scenario`, `action`, `appendix`.

- Modify: `js/07-export.js`
  - Uses delivery storyline hints in the standalone HTML export navigation and print metadata.
  - Keeps HTML export readable as a long-form board report.

- Modify: `js/13-pptx-export.js`
  - Uses delivery storyline hints to route PPTX pages to slide archetypes.
  - Adds core evidence blocks: judgement title, key evidence, management implication, calibration note.

- Modify: `js/30-export-sequence-qa.js`
  - Adds storyline/layout QA across HTML, PDF, and PPTX.
  - Flags pages without a story role, missing evidence block, or unsupported PPTX slide archetype.

- Modify: `styles/app.css`
  - Adds on-screen report story markers and compact delivery chips.

- Modify: `styles/print.css`
  - Adds print-safe layout classes for the same story roles.

- Create: `tests/sprint7d_delivery_storyline_contract.test.js`
  - Contract test for delivery storyline model, role coverage, and route metadata.

- Create: `tests/sprint7d_pptx_evidence_blocks_contract.test.js`
  - Contract test for PPTX evidence block extraction and slide archetype routing.

---

## Delivery Storyline Target

All three deliverables must tell the same story:

1. **Cover / Scope:** What report this is, who it is for, and what sample boundary is used.
2. **Executive Answer:** The one board-level answer and the weakest value-quality constraint.
3. **Evidence 1 - Peer Position:** Where the bank sits versus peers and type anchors.
4. **Evidence 2 - Movement / Deviation:** What changed and what deviates from benchmark.
5. **Evidence 3 - Valuation:** Whether PB reflects value mismatch or quality discount.
6. **Mechanism:** Why the gap exists, using DuPont, profit attribution, NIM, PB attribution, and multi-benchmark lines.
7. **Topic Deep Dives:** Which topics explain the main constraint and what management can do.
8. **Scenario / Sensitivity:** Whether conclusions survive what-if and peer sensitivity checks.
9. **Action Path:** 0-3 / 3-6 / 6-12 month management sequence.
10. **Appendix:** Data source, calibration risk, field coverage, and audit trail.

Format adaptation:

- **HTML:** Best for navigation and review. Keep full text, right-side navigation, anchors, evidence chips, and expandable reading.
- **PDF:** Best for board pack circulation. Use A4 pagination, page-safe cards, table headers, and no broken So What / chart blocks.
- **PPTX:** Best for presentation. Convert chapters into slide archetypes with compact evidence blocks rather than long prose.

---

## Task 1: Add Delivery Storyline Model

**Files:**
- Modify: `js/22-formal-report.js`
- Test: `tests/sprint7d_delivery_storyline_contract.test.js`

- [ ] **Step 1: Write the failing test**

Create `tests/sprint7d_delivery_storyline_contract.test.js`:

```js
const fs = require("fs");
const assert = require("assert/strict");

const formal = fs.readFileSync("js/22-formal-report.js", "utf8");
const qa = fs.readFileSync("js/30-export-sequence-qa.js", "utf8");

[
  "function formalDeliveryStorylineModel",
  "storyRole",
  "layoutIntent",
  "evidenceDensity",
  "htmlLayout",
  "pdfLayout",
  "pptxLayout",
  "opening",
  "answer",
  "evidence",
  "mechanism",
  "scenario",
  "action",
  "appendix"
].forEach((needle) => assert(formal.includes(needle), `delivery storyline model missing: ${needle}`));

[
  "deliveryStorylineQaRows",
  "缺少故事角色",
  "PPTX页型"
].forEach((needle) => assert(qa.includes(needle), `sequence QA must inspect delivery storyline: ${needle}`));

console.log("sprint7d-delivery-storyline-contract-ok");
```

- [ ] **Step 2: Run test to verify it fails**

Run:

```bash
node tests/sprint7d_delivery_storyline_contract.test.js
```

Expected: FAIL because `formalDeliveryStorylineModel` is not defined yet.

- [ ] **Step 3: Implement `formalDeliveryStorylineModel()`**

Add after `formalReportModel()` in `js/22-formal-report.js`:

```js
function formalStoryRoleForSection(item) {
  const id = item.id || "";
  const role = item.pageRole || "";
  const title = item.title || "";
  if (role === "cover") return "opening";
  if (role === "executive" || id.includes("guided-path")) return "answer";
  if (id.includes("peer") || id.includes("matrix") || id.includes("watch") || id.includes("v6-anomaly") || id.includes("v5")) return "evidence";
  if (role === "mechanism" || id.includes("mechanism")) return "mechanism";
  if (id.includes("topic") || /专题|风险|息差|盈利|估值/.test(title)) return "topic";
  if (role === "scenario" || id.includes("whatif") || id.includes("sensitivity")) return "scenario";
  if (role === "action" || id.includes("action")) return "action";
  if (role === "appendix" || id.includes("appendix")) return "appendix";
  return "evidence";
}

function formalPptxLayoutForStoryRole(storyRole, deckType = "content") {
  const map = {
    opening: "cover",
    answer: "executive-answer",
    evidence: deckType === "chart" ? "chart-evidence" : "evidence-brief",
    mechanism: "mechanism-evidence",
    topic: "topic-scr",
    scenario: "scenario-check",
    action: "action-roadmap",
    appendix: "appendix"
  };
  return map[storyRole] || deckType || "content";
}

function formalDeliveryStorylineModel(root = document) {
  return formalReportModel(root).map((item) => {
    const storyRole = formalStoryRoleForSection(item);
    const pptxLayout = formalPptxLayoutForStoryRole(storyRole, item.deckType);
    return {
      ...item,
      storyRole,
      layoutIntent: storyRole === "opening" ? "establish-scope" : storyRole === "answer" ? "state-answer" : storyRole === "action" ? "commit-actions" : "prove-claim",
      evidenceDensity: ["mechanism", "topic", "scenario"].includes(storyRole) ? "high" : storyRole === "opening" ? "low" : "medium",
      htmlLayout: storyRole === "opening" ? "hero-cover" : "longform-section",
      pdfLayout: ["mechanism", "topic", "scenario"].includes(storyRole) ? "page-safe-evidence" : "standard-page",
      pptxLayout
    };
  });
}
```

- [ ] **Step 4: Run syntax and failing test again**

Run:

```bash
node --check js/22-formal-report.js
node tests/sprint7d_delivery_storyline_contract.test.js
```

Expected: still FAIL until Task 2 updates QA references.

---

## Task 2: Add Storyline QA Rows

**Files:**
- Modify: `js/30-export-sequence-qa.js`
- Test: `tests/sprint7d_delivery_storyline_contract.test.js`

- [ ] **Step 1: Add QA function**

Add after `reportSequenceRows()`:

```js
function deliveryStorylineQaRows(root = document) {
  const rows = typeof formalDeliveryStorylineModel === "function" ? formalDeliveryStorylineModel(root) : [];
  return rows.map((item) => {
    const issues = [];
    if (!item.storyRole) issues.push("缺少故事角色");
    if (!item.pptxLayout) issues.push("缺少PPTX页型");
    if (!item.htmlLayout || !item.pdfLayout) issues.push("缺少HTML/PDF版式口径");
    return {
      类型: "故事线版式",
      序号: item.index,
      页面ID: item.id,
      章节标题: item.title,
      故事角色: item.storyRole || "缺少故事角色",
      HTML版式: item.htmlLayout || "缺少",
      PDF版式: item.pdfLayout || "缺少",
      PPTX页型: item.pptxLayout || "缺少",
      状态: issues.length ? "提醒" : "通过",
      校验结论: issues.length ? issues.join("；") : `${item.storyRole}｜${item.layoutIntent}｜${item.evidenceDensity}`
    };
  });
}
```

- [ ] **Step 2: Export QA rows**

In `exportSequenceQaExportRows()`, append storyline QA rows:

```js
const storylineRows = typeof deliveryStorylineQaRows === "function" ? deliveryStorylineQaRows(root) : [];
return [
  ...routes.map((row) => ({
    类型: "链路校验",
    链路: row.链路,
    序号: "",
    页面ID: "",
    章节标题: "",
    页型: "",
    状态: sequenceQaStatusLabel(row.状态),
    校验结论: row.校验结论
  })),
  ...sequence.map((row) => ({
    类型: "章节页序",
    链路: "正式报告contract",
    序号: row.序号,
    页面ID: row.页面ID,
    章节标题: row.章节标题,
    页型: row.页型,
    状态: row.纳入状态,
    校验结论: `${row.模块 || "正式报告"}｜HTML ${row.HTML链路 || "formalReport"}｜PDF ${row.PDF链路 || "browserPrintFormalReport"}｜PPTX ${row.PPTX链路 || row.PPT页型}`
  })),
  ...storylineRows
];
```

- [ ] **Step 3: Run tests**

Run:

```bash
node --check js/30-export-sequence-qa.js
node tests/sprint7d_delivery_storyline_contract.test.js
node tests/export_sequence_qa_contract.test.js
```

Expected: PASS.

---

## Task 3: Make HTML Export Show Storyline Navigation

**Files:**
- Modify: `js/07-export.js`
- Modify: `styles/app.css`
- Test: `tests/sprint7d_delivery_storyline_contract.test.js`

- [ ] **Step 1: Extend HTML export nav**

In `reportHtmlDocument()`, replace `reportModel` with:

```js
const reportModel = typeof formalDeliveryStorylineModel === "function"
  ? formalDeliveryStorylineModel(wrapper)
  : typeof formalReportModel === "function"
    ? formalReportModel(wrapper)
    : [];
```

Change nav row rendering to:

```js
return `<a href="#${xmlEscape(id)}" data-story-role="${xmlEscape(item.storyRole || "content")}"><span>${xmlEscape(item.indexText)}</span><em>${xmlEscape(item.storyRole || "content")}</em>${xmlEscape(exportClientText(item.title))}</a>`;
```

- [ ] **Step 2: Add inline HTML export CSS**

Inside the HTML export `<style>` block, add:

```css
.html-report-nav a em {
  color: #8a95a3;
  font-size: 10px;
  font-style: normal;
  font-weight: 900;
  text-transform: uppercase;
}
.formal-report [data-story-role]::after {
  content: attr(data-story-role);
  position: absolute;
  right: 18px;
  top: 14px;
  color: #8a95a3;
  font-size: 10px;
  font-weight: 900;
  letter-spacing: .08em;
}
```

- [ ] **Step 3: Stamp story role on sections**

After `const exportSections = ...`, add:

```js
reportModel.forEach((item) => {
  if (item.section) item.section.dataset.storyRole = item.storyRole || "content";
});
```

- [ ] **Step 4: Run tests**

Run:

```bash
node --check js/07-export.js
node tests/sprint7d_delivery_storyline_contract.test.js
git diff --check
```

Expected: PASS.

---

## Task 4: Route PPTX by Storyline Layout

**Files:**
- Modify: `js/13-pptx-export.js`
- Test: `tests/sprint7d_pptx_evidence_blocks_contract.test.js`

- [ ] **Step 1: Write failing test**

Create `tests/sprint7d_pptx_evidence_blocks_contract.test.js`:

```js
const fs = require("fs");
const assert = require("assert/strict");

const pptx = fs.readFileSync("js/13-pptx-export.js", "utf8");

[
  "pptxStorylineLayout",
  "addStorylineEvidenceBlocks",
  "关键证据",
  "管理含义",
  "口径提示",
  "executive-answer",
  "mechanism-evidence",
  "topic-scr",
  "scenario-check",
  "action-roadmap"
].forEach((needle) => assert(pptx.includes(needle), `PPTX storyline evidence block missing: ${needle}`));

console.log("sprint7d-pptx-evidence-blocks-contract-ok");
```

- [ ] **Step 2: Run test to verify it fails**

Run:

```bash
node tests/sprint7d_pptx_evidence_blocks_contract.test.js
```

Expected: FAIL because functions are not defined yet.

- [ ] **Step 3: Add PPTX storyline helpers**

Add near `formalSlideTextBlocks()`:

```js
function pptxStorylineLayout(sectionEl, blocks = {}) {
  return sectionEl.dataset.pptxLayout
    || sectionEl.dataset.deckType
    || blocks.deckType
    || "content";
}

function addStorylineEvidenceBlocks(slide, pptx, theme, blocks, x, y, w, h) {
  const c = theme.colors;
  const evidence = pptxEvidenceLines(blocks, "content");
  const implication = pptxImplicationLines(blocks, "content");
  const calibration = blocks.riskFootnotes?.length ? blocks.riskFootnotes : ["口径提示：本页结论需结合样本边界和指标口径复核。"];
  const gap = 0.14;
  const cardW = (w - gap * 2) / 3;
  [
    ["关键证据", evidence.join("\n") || blocks.subtitle || "本页证据待补。", "0099D8"],
    ["管理含义", implication.join("\n") || "本页应服务于管理层排序。", "10B981"],
    ["口径提示", calibration.slice(0, 2).join("\n"), "F59E0B"]
  ].forEach(([heading, text, accent], index) => {
    addConsultingTextBlock(slide, pptx, theme, x + index * (cardW + gap), y, cardW, h, heading, [text], accent);
  });
}
```

- [ ] **Step 4: Stamp PPTX layout in `formalSlideTextBlocks()`**

Add to the returned object:

```js
storyRole: sectionEl.dataset.storyRole || "",
pptxLayout: pptxStorylineLayout(sectionEl, { deckType: sectionEl.dataset.deckType || "content" }),
```

- [ ] **Step 5: Use evidence blocks in content slides**

In the formal PPTX content slide renderer, after title/subtitle rendering and before footers, call:

```js
addStorylineEvidenceBlocks(slide, pptx, theme, blocks, 0.72, 8.25, 18.6, 1.45);
```

Keep existing mechanism-specific drawing logic unchanged.

- [ ] **Step 6: Run tests**

Run:

```bash
node --check js/13-pptx-export.js
node tests/sprint1_pptx_mechanism_layout.test.js
node tests/sprint7d_pptx_evidence_blocks_contract.test.js
```

Expected: PASS.

---

## Task 5: Visual Smoke and QA Gate

**Files:**
- Modify: `js/30-export-sequence-qa.js`
- Test: browser smoke via Playwright

- [ ] **Step 1: Start local server**

Run:

```bash
python3 -m http.server 8766
```

Expected: server runs at `http://127.0.0.1:8766`.

- [ ] **Step 2: Run browser smoke**

Run:

```bash
node -e "(async()=>{const { chromium }=await import('playwright'); const browser=await chromium.launch({headless:true}); const page=await browser.newPage({viewport:{width:1440,height:1100}}); await page.goto('http://127.0.0.1:8766/?v='+Date.now(),{waitUntil:'networkidle'}); await page.click('#confirmSelection'); await page.waitForTimeout(900); const result=await page.evaluate(()=>{ if(typeof setWorkspaceTab==='function') setWorkspaceTab('report'); if(typeof renderFormalReport==='function') renderFormalReport(); const model=typeof formalDeliveryStorylineModel==='function'?formalDeliveryStorylineModel():[]; const qa=typeof deliveryStorylineQaRows==='function'?deliveryStorylineQaRows():[]; return { count:model.length, roles:[...new Set(model.map(x=>x.storyRole))], pptxLayouts:[...new Set(model.map(x=>x.pptxLayout))], qaBad:qa.filter(x=>x['状态']!=='通过').map(x=>x['校验结论']).slice(0,5) }; }); console.log(JSON.stringify(result,null,2)); await browser.close();})().catch(e=>{console.error(e);process.exit(1);});"
```

Expected:

```json
{
  "count": 20,
  "roles": ["opening", "answer", "evidence", "mechanism", "scenario", "topic", "action", "appendix"],
  "qaBad": []
}
```

The exact count can be higher than 20. The important conditions are non-empty model, role coverage, and no QA blockers.

- [ ] **Step 3: Stop local server**

Run:

```bash
lsof -ti tcp:8766
kill <pid>
```

Expected: `lsof -ti tcp:8766` returns no process.

- [ ] **Step 4: Final verification**

Run:

```bash
node tests/sprint7d_delivery_storyline_contract.test.js
node tests/sprint7d_pptx_evidence_blocks_contract.test.js
node tests/sprint7d_report_model_contract.test.js
node tests/sprint7d_pdf_readability_contract.test.js
node tests/export_sequence_qa_contract.test.js
git diff --check
```

Expected: all pass.

---

## Acceptance Criteria

- HTML/PDF/PPTX still use the same `formalReportModel()` chapter base.
- `formalDeliveryStorylineModel()` adds role and layout metadata without duplicating content.
- HTML export navigation shows story roles and keeps a review-friendly long-form structure.
- PDF keeps A4 page-safe blocks, color, repeated table headers, and no forced gray layout.
- PPTX routes pages by story role and adds compact evidence blocks.
- Export QA includes route consistency plus storyline/layout checks.
- Browser smoke confirms model count, story roles, PPTX layouts, and QA status.

---

## Self-Review

Spec coverage:

- HTML story and layout: covered by Tasks 1, 3, and 5.
- PDF story and layout: covered by existing Sprint 7D-2 print rules plus Tasks 1, 2, and 5.
- PPTX story and layout: covered by Task 4.
- Shared storyline: covered by Task 1.
- QA and regression: covered by Tasks 2 and 5.

Placeholder scan:

- No deferred-work placeholders.
- Each implementation task names exact files and commands.

Type consistency:

- `formalDeliveryStorylineModel()` extends `formalReportModel()` rows.
- `storyRole`, `htmlLayout`, `pdfLayout`, and `pptxLayout` are consistently referenced by QA, HTML export, and PPTX export.
