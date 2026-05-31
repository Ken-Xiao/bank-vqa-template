# Sprint 6B Consulting Language And Layout Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Turn the next iteration into a board-ready consulting report pass: natural language, assertion-led pages, readable chart annotation, and visual QA.

**Architecture:** Keep the current static front-end architecture. Add contract tests around narrative output and layout rules before each implementation change; avoid broad rewrites of the report engine until the report content tree is stabilized.

**Tech Stack:** Plain HTML/CSS/JS, Node VM contract tests, Playwright browser QA, existing `formalReport`, `topicWorkbench`, `netProfitAttribution`, `generateTopicNarrativeDraft`, and report/PPTX export modules.

---

## File Structure

- Modify: `js/12-ai-narrative.js` — language engine, channel-specific consulting paragraph generation, risk-calibrated wording.
- Modify: `js/08-report.js` — report page titles, chapter pages, chart proof copy, report section language.
- Modify: `js/22-formal-report.js` — formal report body copy, mechanism section commentary, risk footnotes and consulting implications.
- Modify: `js/05-analysis.js` — topic workbench language blocks and mechanism chart interpretation.
- Modify: `js/06-charts.js` — chart annotations and empty-state wording where the page needs direct reading guidance.
- Modify: `js/13-pptx-export.js` — PPTX title/subtitle and evidence/implication text extraction.
- Modify: `styles/app.css` — chart annotation layer, right rail final polish, table density, formal report page rhythm.
- Modify: `docs/next-improvement-plan-consolidated.md` — Sprint progress and residual risk tracking.
- Create/Modify tests under `tests/` — contract tests for natural language, title assertions, chart annotation, page density, and export text.

## Task 1: Language Regression Guardrail

**Files:**
- Create: `tests/sprint6b_language_guardrail.test.js`
- Modify: `js/12-ai-narrative.js`

- [ ] **Step 1: Write the failing test**

```js
const fs = require("fs");
const vm = require("vm");
const root = process.cwd();
function assert(condition, message) { if (!condition) throw new Error(message); }
const context = { console, window: {}, document: { getElementById: () => null, querySelector: () => null, querySelectorAll: () => [] } };
vm.createContext(context);
[
  "data.js", "js/01-state.js", "js/02-config.js", "js/03-data-format.js",
  "js/04-ui-selection.js", "js/05-analysis.js", "js/20-pro-engine.js",
  "js/21-portal-workflows.js", "js/11-fact-pack.js", "js/12-ai-narrative.js"
].forEach((file) => vm.runInContext(fs.readFileSync(`${root}/${file}`, "utf8"), context, { filename: file }));
context.analysisRules = JSON.parse(fs.readFileSync(`${root}/analysis_rules.json`, "utf8"));
context.metricDictionary = Object.fromEntries(JSON.parse(fs.readFileSync(`${root}/data_governance/metric_dictionary.json`, "utf8")).map((item) => [item.metric_code, item]));
context.languageDiscipline = JSON.parse(fs.readFileSync(`${root}/config/language_discipline.json`, "utf8"));
context.state.target = "苏州农商行";
context.state.peers = ["常熟农商行", "瑞丰农商行", "上海农商行", "苏州"];
context.state.year = 2025;
context.state.types = ["农村商业银行", "城市商业银行"];
const topic = context.topicDefinitions().find((item) => item.id === "profit");
const text = context.generateTopicNarrativeDraft(topic, context.topicFactPackRows("profit"), "board");
assert(/苏州(农商行|农村商业银行)/.test(text), "must name target bank");
assert(!/[CEMA]｜/.test(text), "must not expose CEAM labels");
assert(!/(方法论|本专题用于|帮助判断|可用于)/.test(text), "must avoid method-only filler");
assert(/因为|这意味着|管理上|因此/.test(text), "must contain causal and management language");
assert(/对标|核心营收|净利润|手续费|拨备/.test(text), "must bind language to bank-specific evidence");
console.log("sprint6b-language-guardrail-ok");
```

- [ ] **Step 2: Run test to verify it fails or protects current behavior**

Run: `node tests/sprint6b_language_guardrail.test.js`

Expected if current behavior regresses: FAIL on mechanical labels, method-only filler, or missing target-bank linkage.

- [ ] **Step 3: Implement minimal language helper improvements**

Update `js/12-ai-narrative.js` so `generateTopicNarrativeDraft()` routes through one helper:

```js
function consultingNaturalParagraph({ target, topic, claim, evidence, attribution, meaning, evidenceText }) {
  return [
    `${target}${topic.title.replace(/专题$/, "")}的本轮判断是：${claim}`,
    evidence,
    `形成这一判断的原因，不是单个指标高低，而是${narrativeShortText(attribution, 170)}。`,
    `${meaning}本段依据的核心指标为${evidenceText || "待补充"}。`
  ].join("");
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `node tests/sprint6b_language_guardrail.test.js`

Expected: `sprint6b-language-guardrail-ok`

## Task 2: Assertion-Led Report Titles

**Files:**
- Create: `tests/sprint6b_assertion_titles.test.js`
- Modify: `js/08-report.js`
- Modify: `js/22-formal-report.js`

- [ ] **Step 1: Write the failing test**

```js
const fs = require("fs");
function assert(condition, message) { if (!condition) throw new Error(message); }
const reportSource = fs.readFileSync(`${process.cwd()}/js/08-report.js`, "utf8");
const formalSource = fs.readFileSync(`${process.cwd()}/js/22-formal-report.js`, "utf8");
assert(reportSource.includes("reportTitleSentence"), "deck report should use assertion title helper");
assert(formalSource.includes("formalAssertionTitle"), "formal report should expose assertion title helper");
assert(!/图表说明|指标展示|专题分析/.test(formalSource), "formal report should not rely on generic method titles");
console.log("sprint6b-assertion-titles-ok");
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node tests/sprint6b_assertion_titles.test.js`

Expected: FAIL until `formalAssertionTitle` exists and generic titles are removed.

- [ ] **Step 3: Implement title helper**

Add to `js/22-formal-report.js`:

```js
function formalAssertionTitle(topicKey, row = targetRecord()) {
  const target = displayBankName(row?.bank || state.target);
  const map = {
    profit: `${target}盈利质量要先解释核心营收与净利润是否同向改善`,
    nim: `${target}息差判断要同时拆开资产收益、负债成本和存款结构`,
    risk: `${target}风险判断不能只看不良率，还要看逾期偏离和拨备缓冲`,
    capitalMarket: `${target}估值修复取决于经营质量、资本效率和风险确认的共同改善`,
    retailRisk: `${target}零售风险需要分产品识别真实压力来源`,
    depositLoanDeepDive: `${target}存贷结构决定息差防守和资产扩张质量`
  };
  return map[topicKey] || `${target}本页结论需要回到选定样本和口径边界验证`;
}
```

- [ ] **Step 4: Replace generic section titles**

Use `formalAssertionTitle(topic.id, row)` inside formal topic sections instead of generic “专题分析/图表说明” labels.

- [ ] **Step 5: Run test to verify it passes**

Run: `node tests/sprint6b_assertion_titles.test.js`

Expected: `sprint6b-assertion-titles-ok`

## Task 3: Chart Annotation Layer

**Files:**
- Create: `tests/sprint6b_chart_annotation_layer.test.js`
- Modify: `js/05-analysis.js`
- Modify: `js/06-charts.js`
- Modify: `styles/app.css`

- [ ] **Step 1: Write the failing test**

```js
const fs = require("fs");
function assert(condition, message) { if (!condition) throw new Error(message); }
const analysis = fs.readFileSync(`${process.cwd()}/js/05-analysis.js`, "utf8");
const charts = fs.readFileSync(`${process.cwd()}/js/06-charts.js`, "utf8");
const css = fs.readFileSync(`${process.cwd()}/styles/app.css`, "utf8");
assert(analysis.includes("chartAnnotationBlock"), "topic pages should expose chart annotation block");
assert(charts.includes("chartAnnotationText"), "chart module should expose annotation text helper");
assert(/\.chart-annotation\s*\{[^}]*display:\s*grid/s.test(css), "chart annotation should have a stable grid layout");
assert(/\.chart-annotation\s+b\s*\{[^}]*font-size:\s*1[3-5]px/s.test(css), "chart annotation should use compact report text");
console.log("sprint6b-chart-annotation-layer-ok");
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node tests/sprint6b_chart_annotation_layer.test.js`

Expected: FAIL until annotation helpers and CSS exist.

- [ ] **Step 3: Add chart annotation helper**

Add to `js/06-charts.js`:

```js
function chartAnnotationText(title, row = targetRecord()) {
  const target = displayBankName(row?.bank || state.target);
  if (/净利润|盈利|ROA|ROE/.test(title)) return `${target}本图先看利润结果，再回到核心营收、费用和拨备节奏验证。`;
  if (/息差|NIM|负债|存款|贷款/.test(title)) return `${target}本图需要把资产收益率和负债成本分开读，避免只看净息差终值。`;
  if (/风险|不良|拨备|逾期/.test(title)) return `${target}本图要同时观察风险暴露和风险缓冲，避免单一不良率误判。`;
  if (/PB|估值|市净率/.test(title)) return `${target}本图把估值差异回收到经营质量、资本效率和风险确认。`;
  return `${target}本图结论以选定目标银行、对标组和类型均值为边界。`;
}
```

- [ ] **Step 4: Render annotation in topic chart panels**

Add `chartAnnotationBlock(title)` in `js/05-analysis.js` and append it below mechanism/core chart cards.

- [ ] **Step 5: Add CSS**

Add to `styles/app.css`:

```css
.chart-annotation {
  display: grid;
  gap: 6px;
  margin-top: 10px;
  padding: 10px 12px;
  border-left: 4px solid #0099d8;
  background: #f7fbfe;
  color: #465b70;
}
.chart-annotation b {
  color: #061b3a;
  font-size: 14px;
}
```

- [ ] **Step 6: Run test to verify it passes**

Run: `node tests/sprint6b_chart_annotation_layer.test.js`

Expected: `sprint6b-chart-annotation-layer-ok`

## Task 4: Right-Rail And Layout Visual QA

**Files:**
- Create: `tests/sprint6b_layout_visual_contract.test.js`
- Modify: `styles/app.css`
- Modify: `docs/next-improvement-plan-consolidated.md`

- [ ] **Step 1: Write the failing/pinning test**

```js
const fs = require("fs");
function assert(condition, message) { if (!condition) throw new Error(message); }
const css = fs.readFileSync(`${process.cwd()}/styles/app.css`, "utf8");
assert(/\.analysis-roadmap\s*\{[^}]*float:\s*right/s.test(css), "analysis roadmap should remain right rail");
assert(/\.analysis-roadmap-steps\s*\{[^}]*grid-template-columns:\s*1fr/s.test(css), "roadmap steps should remain vertical");
assert(/@media\s*\(max-width:\s*900px\)[\s\S]*\.analysis-roadmap\s*\{[\s\S]*float:\s*none/s.test(css), "mobile should disable right float");
assert(/\.formal-peer-matrix\s*\{[^}]*table-layout:\s*fixed/s.test(css), "formal peer matrix should remain fixed layout");
assert(/\.metric-explorer-trend-table\s+th,\s*\.metric-explorer-trend-table\s+td\s*\{[^}]*overflow-wrap:\s*anywhere/s.test(css), "metric trend table should keep long text wrapping");
console.log("sprint6b-layout-visual-contract-ok");
```

- [ ] **Step 2: Run test to verify it passes or exposes drift**

Run: `node tests/sprint6b_layout_visual_contract.test.js`

Expected: PASS if current layout governance stays intact.

- [ ] **Step 3: Browser QA**

Run local server:

```bash
python3 -m http.server 8777
```

Open and inspect with Playwright:

```bash
/Users/jinkunxiao/.codex/skills/playwright/scripts/playwright_cli.sh open http://127.0.0.1:8777
/Users/jinkunxiao/.codex/skills/playwright/scripts/playwright_cli.sh run-code "async (page) => { await page.getByRole('button', { name: '形成分析结果' }).click(); await page.waitForTimeout(800); return await page.evaluate(() => ({ roadmap: getComputedStyle(document.querySelector('#analysisRoadmap')).cssFloat, steps: getComputedStyle(document.querySelector('#analysisRoadmapSteps')).gridTemplateColumns })); }"
```

Expected: `roadmap` is `right`; `steps` resolves to one column.

- [ ] **Step 4: Update progress**

Update `docs/next-improvement-plan-consolidated.md`:
- Sprint 6A-0 to 60% if browser QA passes.
- Sprint 6A-1 to 68% if page density contracts remain green.

## Task 5: Export Text Consistency Smoke

**Files:**
- Create: `tests/sprint6b_export_language_contract.test.js`
- Modify: `js/13-pptx-export.js`
- Modify: `js/08-report.js`

- [ ] **Step 1: Write the failing test**

```js
const fs = require("fs");
function assert(condition, message) { if (!condition) throw new Error(message); }
const pptx = fs.readFileSync(`${process.cwd()}/js/13-pptx-export.js`, "utf8");
const report = fs.readFileSync(`${process.cwd()}/js/08-report.js`, "utf8");
assert(pptx.includes("pptxConsultingTitle"), "PPTX export should keep consulting title routing");
assert(pptx.includes("管理含义"), "PPTX pages should extract management implication text");
assert(report.includes("管理含义"), "report pages should include management implication language");
assert(!/本页仅展示|方法论说明/.test(pptx), "PPTX export should not default to method-only copy");
console.log("sprint6b-export-language-contract-ok");
```

- [ ] **Step 2: Run test to verify it fails or pins current behavior**

Run: `node tests/sprint6b_export_language_contract.test.js`

Expected: PASS only if PPTX keeps consulting titles and implication extraction.

- [ ] **Step 3: Tighten PPTX fallback text**

Where `pptxConsultingTitle()` and `pptxConsultingSubtitle()` use generic fallback copy, replace with target-bank-specific language using `pptxCurrentTarget()`.

- [ ] **Step 4: Run test to verify it passes**

Run: `node tests/sprint6b_export_language_contract.test.js`

Expected: `sprint6b-export-language-contract-ok`

## Final Verification

- [ ] Run syntax checks:

```bash
for f in js/03-data-format.js js/05-analysis.js js/06-charts.js js/08-report.js js/12-ai-narrative.js js/13-pptx-export.js js/19-product-workspace.js js/20-pro-engine.js js/22-formal-report.js; do node --check "$f" || exit 1; done; echo syntax-ok
```

- [ ] Run Sprint 6B and regression tests:

```bash
node tests/sprint6_profit_attribution_integrity.test.js && \
node tests/sprint6_right_rail_language.test.js && \
node tests/sprint6b_language_guardrail.test.js && \
node tests/sprint6b_assertion_titles.test.js && \
node tests/sprint6b_chart_annotation_layer.test.js && \
node tests/sprint6b_layout_visual_contract.test.js && \
node tests/sprint6b_export_language_contract.test.js && \
node tests/sprint6_navigation_architecture.test.js && \
node tests/sprint6_layout_governance.test.js && \
node tests/sprint6_layout_governance_deep.test.js && \
node tests/sprint4_mechanism_fact_pack.test.js && \
node tests/sprint4_formal_mechanism_report.test.js && \
node tests/sprint4_core_topic_charts.test.js && \
node tests/sprint4_html_mechanism_charts.test.js && \
node tests/sprint4_topic_mechanism_panel.test.js && \
node tests/sprint_cross_upgrade_contract.test.js
```

- [ ] Run whitespace check:

```bash
git diff --check
```

- [ ] Run Playwright browser QA on one generated analysis page.

Expected browser evidence:
- Right rail is vertical and non-overlapping.
- Topic narrative names the selected bank.
- Profit attribution uses money units.
- Chart annotation appears below at least one topic chart.
- Console has no functional errors; `favicon.ico` 404 is acceptable until favicon is added.

## Recommended Next Order

1. Task 1: Language Regression Guardrail.
2. Task 3: Chart Annotation Layer.
3. Task 2: Assertion-Led Report Titles.
4. Task 5: Export Text Consistency Smoke.
5. Task 4: Right-Rail And Layout Visual QA.

This order keeps the user-visible writing quality moving first, while preserving layout and export stability.
