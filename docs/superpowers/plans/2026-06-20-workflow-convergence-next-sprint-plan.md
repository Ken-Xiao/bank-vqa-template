# Workflow Convergence Next Sprint Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 将已完成的 `storylineFactPack` 模型能力接到真实数据对标点击流上，统一事实包入口，并为三页故事播放器与报告页库 renderer 升级建立稳定基线。

**Architecture:** 先收口 `js/55-benchmark-page.js` 中混合的故事线入口改动，确保自然点击流能从目标银行选择进入故事线卡片并加入事实包；随后将旧 `bmFactPackBar` 降级为调试入口，新 `storylineFactPackDrawer` 成为主流程；最后在现有 `js/63/64/61/62` 上增量实现固定故事播放器和报告页 renderer 事实包展示，不重写已完成模型。

**Tech Stack:** 原生 JavaScript、现有 BenchmarkIQ portal、`storylineFactPack` localStorage 状态、Node 契约测试、Playwright 浏览器验证。

---

## File Structure

- Modify: `js/55-benchmark-page.js`  
  收口故事线卡片入口、目标银行自然点击流、事实包按钮事件委托。

- Modify: `tests/storyline_fact_pack_benchmark_entry_contract.test.js`  
  保留并强化故事线入口契约测试。

- Modify: `tests/storyline_fact_pack_browser.spec.js`  
  从脚本 seed fact pack 改为真实点击目标银行、故事线、事实包按钮。

- Modify: `js/66-storyline-fact-pack-ui.js`  
  增强抽屉：显示状态、支持移除故事线、提供报告候选入口。

- Modify: `index.html`  
  将旧 `bmFactPackBar` 标记为高级/调试入口，确保主流程视觉上不与新抽屉冲突；为新脚本补版本号。

- Modify: `styles/app.css` and optionally `styles/benchmark.css`  
  补齐抽屉、旧入口降级、故事播放器基础样式。

- Create: `js/68-storyline-page-player.js`  
  轻量固定比例故事播放器，供三页诊断与报告页预览复用。

- Modify: `js/64-three-page-diagnosis-renderer.js`  
  使用播放器渲染 `answer / evidence / topics` 的主内容。

- Modify: `js/62-report-page-library-renderer.js`  
  报告页库预览展示事实包图、证据句、读图指南和 `待补证据` 状态。

- Test: `tests/workflow_convergence_natural_flow_contract.test.js`  
  静态和轻量行为测试：目标行选择、故事线按钮、事实包抽屉主入口。

- Test: `tests/storyline_page_player_contract.test.js`  
  验证播放器接口、固定比例、上一页/下一页和安全渲染要求。

- Test: `tests/report_page_library_storyline_renderer_contract.test.js`  
  验证报告页库 renderer 消费 `storylineFactPack` 候选字段。

---

## Task 0: 收口 `js/55` 当前混合改动

**Files:**
- Modify: `js/55-benchmark-page.js`
- Modify: `tests/storyline_fact_pack_benchmark_entry_contract.test.js`

- [ ] **Step 1: Inspect current mixed diff**

Run:

```bash
git diff -- js/55-benchmark-page.js tests/storyline_fact_pack_benchmark_entry_contract.test.js | sed -n '1,260p'
```

Expected: diff shows existing story view changes plus fact-pack related additions such as `renderBenchmarkStorylineActions`, `ensureStorylineFactPackFromBenchmarkStory`, and `data-storyline-fact-action`.

- [ ] **Step 2: Decide commit boundary**

Use this rule:

```text
If the fact-pack action code depends on the new story overview/domain/story view functions, commit the current js/55 story view as one baseline commit with a clear message.
If the fact-pack action code can be isolated without breaking syntax, stage only fact-pack hunks.
```

Expected decision for current state: commit the `js/55` story view and fact-pack entry as one baseline because the fact-pack buttons are inside `renderStorylineCard`, which belongs to the new story view.

- [ ] **Step 3: Strengthen contract test**

Ensure `tests/storyline_fact_pack_benchmark_entry_contract.test.js` contains:

```js
const assert = require("assert");
const fs = require("fs");
const path = require("path");

const code = fs.readFileSync(path.join(__dirname, "../js/55-benchmark-page.js"), "utf8");

assert.ok(code.includes("viewMode: \"overview\""), "benchmark should have overview/story view state");
assert.ok(code.includes("renderStorylineCard"), "benchmark should render storyline cards");
assert.ok(code.includes("加入事实包"), "storyline cards should expose add-to-pack action");
assert.ok(code.includes("查看大图"), "storyline cards should expose chart viewer action");
assert.ok(code.includes("读图指南"), "storyline cards should expose reading guide action");
assert.ok(code.includes("buildStorylineFactPack"), "benchmark should build storyline fact pack");
assert.ok(code.includes("saveStorylineFactPack"), "benchmark should save storyline fact pack");
assert.ok(code.includes("renderStorylineFactPackControls"), "benchmark should refresh drawer");
assert.ok(code.includes("openStorylineChartViewer"), "benchmark should open chart viewer");
assert.ok(code.includes("data-storyline-fact-action"), "buttons should use delegated fact action attribute");
assert.ok(code.includes("ensureStorylineFactPackFromBenchmarkStory"), "benchmark should have fact-pack adapter");
assert.ok(code.indexOf("[data-storyline-fact-action]") < code.indexOf("[data-open-story-detail]"), "fact action should be handled before story-detail navigation");

console.log("storyline benchmark entry contract passed");
```

- [ ] **Step 4: Run contract and syntax checks**

Run:

```bash
node tests/storyline_fact_pack_benchmark_entry_contract.test.js
node --check js/55-benchmark-page.js
node tests/storyline_fact_pack_model_contract.test.js
node tests/storyline_fact_pack_ui_contract.test.js
```

Expected: all pass.

- [ ] **Step 5: Commit baseline**

Run:

```bash
git add js/55-benchmark-page.js tests/storyline_fact_pack_benchmark_entry_contract.test.js
git commit -m "feat: connect benchmark storylines to fact pack"
```

Expected: commit includes `js/55-benchmark-page.js` and benchmark entry test only. If unrelated files appear in `git diff --cached --name-only`, unstage them before committing.

---

## Task 1: 修复目标银行自然点击流

**Files:**
- Modify: `js/55-benchmark-page.js`
- Modify: `tests/storyline_fact_pack_browser.spec.js`
- Create: `tests/workflow_convergence_natural_flow_contract.test.js`

- [ ] **Step 1: Write static contract for natural flow**

Create `tests/workflow_convergence_natural_flow_contract.test.js`:

```js
const assert = require("assert");
const fs = require("fs");
const path = require("path");

const code = fs.readFileSync(path.join(__dirname, "../js/55-benchmark-page.js"), "utf8");

assert.ok(code.includes("selectBenchmarkTargetBank"), "target bank selection helper should exist");
assert.ok(code.includes("setBenchmarkView(\"domain\"") || code.includes("setBenchmarkView('domain'"), "target selection should route into a domain/story view");
assert.ok(code.includes("renderBenchmarkOverview"), "overview should render recommended storylines");
assert.ok(code.includes("getRecommendedStories"), "recommended storylines should be generated after target selection");
assert.ok(code.includes("refreshStorylineFactPackControls"), "render flow should refresh the fact pack drawer");

console.log("workflow convergence natural flow contract passed");
```

- [ ] **Step 2: Run test to verify current state**

Run:

```bash
node tests/workflow_convergence_natural_flow_contract.test.js
```

Expected: may fail if target selection does not route into overview/domain view.

- [ ] **Step 3: Update target selection render path**

In `js/55-benchmark-page.js`, ensure the bank click handler routes to overview after a successful selection:

```js
var bankItem = e.target.closest("#bmBankList .bm-bank-item");
if (bankItem) {
  if (selectBenchmarkTargetBank(bankItem.dataset.bankId || bankItem.dataset.bankName, "target-change")) {
    setBenchmarkView("overview", { returnContext: "overview" });
  }
  return;
}
```

If `setBenchmarkView` is unavailable at that point, call:

```js
_bm.viewMode = "overview";
_bm.activeStoryRef = null;
renderAll();
```

- [ ] **Step 4: Update browser spec to use real clicks**

Modify `tests/storyline_fact_pack_browser.spec.js` so the first half uses real UI:

```js
await page.goto("http://127.0.0.1:8798/", { waitUntil: "domcontentloaded" });
await page.waitForFunction(() => !!document.querySelector("#storylineFactPackDrawer"), null, { timeout: 10000 });
await page.locator("#bmBankList .bm-bank-item").filter({ hasText: "苏农银行" }).first().click();
await page.waitForFunction(() => document.querySelectorAll(".bm-storyline-card").length > 0, null, { timeout: 15000 });
await page.getByText("加入事实包").first().click();
```

Keep the later assertions for drawer, viewer, and answer page.

- [ ] **Step 5: Run tests**

Run:

```bash
node tests/workflow_convergence_natural_flow_contract.test.js
node tests/storyline_fact_pack_benchmark_entry_contract.test.js
node --check js/55-benchmark-page.js
```

Expected: all pass.

- [ ] **Step 6: Browser verification**

Start server:

```bash
python3 -m http.server 8798
```

In another terminal:

```bash
/Users/jinkunxiao/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin/node tests/storyline_fact_pack_browser.spec.js
```

Expected: `storyline-fact-pack-browser-ok`.

- [ ] **Step 7: Commit**

Run:

```bash
git add js/55-benchmark-page.js tests/workflow_convergence_natural_flow_contract.test.js tests/storyline_fact_pack_browser.spec.js
git commit -m "fix: route target selection into storyline workflow"
```

Expected: natural flow fix is committed separately from Task 0 baseline.

---

## Task 2: 统一事实包入口并降级旧事实清单

**Files:**
- Modify: `index.html`
- Modify: `js/66-storyline-fact-pack-ui.js`
- Modify: `styles/app.css`
- Create: `tests/storyline_fact_pack_single_entry_contract.test.js`

- [ ] **Step 1: Write single-entry contract**

Create `tests/storyline_fact_pack_single_entry_contract.test.js`:

```js
const assert = require("assert");
const fs = require("fs");
const path = require("path");

const html = fs.readFileSync(path.join(__dirname, "../index.html"), "utf8");
const ui = fs.readFileSync(path.join(__dirname, "../js/66-storyline-fact-pack-ui.js"), "utf8");
const css = fs.readFileSync(path.join(__dirname, "../styles/app.css"), "utf8");

assert.ok(html.includes("storylineFactPackDrawer"), "new drawer mount should exist");
assert.ok(html.includes("bmFactPackBar"), "legacy fact pack bar may remain as debug/export entry");
assert.ok(html.includes("data-legacy-fact-pack") || html.includes("legacy-fact-pack"), "legacy fact pack should be explicitly marked");
assert.ok(ui.includes("removeStorylineFromFactPack"), "drawer should support removing selected storylines");
assert.ok(ui.includes("生成报告页候选"), "drawer should expose report candidate action");
assert.ok(css.includes(".legacy-fact-pack"), "legacy fact pack should be visually downgraded");

console.log("storyline fact pack single entry contract passed");
```

- [ ] **Step 2: Run test to verify it fails**

Run:

```bash
node tests/storyline_fact_pack_single_entry_contract.test.js
```

Expected: fails until legacy bar and drawer enhancements are present.

- [ ] **Step 3: Mark old fact pack bar as legacy**

In `index.html`, change:

```html
<div class="fact-pack-bar collapsed" id="bmFactPackBar" data-portal-page="benchmark">
```

to:

```html
<div class="fact-pack-bar collapsed legacy-fact-pack" id="bmFactPackBar" data-portal-page="benchmark" data-legacy-fact-pack="debug-export">
```

Also change visible title text from:

```html
事实清单 · <b id="bmFactCount">0</b> 条待传入报告分析系统
```

to:

```html
旧版事实清单导出 · <b id="bmFactCount">0</b> 条
```

- [ ] **Step 4: Add drawer remove and report candidate actions**

In `js/66-storyline-fact-pack-ui.js`, add:

```js
function removeStorylineFromFactPack(storylineId) {
  var pack = readPack();
  if (!pack || !storylineId) return null;
  pack.selectedStorylineIds = asArray(pack.selectedStorylineIds).filter(function (id) {
    return String(id) !== String(storylineId);
  });
  asArray(pack.storylines).forEach(function (storyline) {
    if (String(storyline.storylineId) === String(storylineId)) storyline.selected = false;
  });
  if (typeof window.saveStorylineFactPack === "function") window.saveStorylineFactPack(pack);
  renderStorylineFactPackControls();
  if (typeof window.renderThreePageDiagnosis === "function") window.renderThreePageDiagnosis();
  return pack;
}
```

When rendering each selected story, append:

```js
var remove = document.createElement("button");
remove.type = "button";
remove.className = "storyline-fact-pack-remove";
remove.textContent = "移除";
remove.addEventListener("click", function () {
  removeStorylineFromFactPack(storyline.storylineId);
});
item.appendChild(remove);
```

Add a second drawer action:

```js
var report = document.createElement("button");
report.type = "button";
report.className = "storyline-fact-pack-secondary";
report.textContent = "生成报告页候选";
report.disabled = storylines.length === 0;
report.addEventListener("click", function () {
  window.location.hash = "#page/report";
  if (typeof window.renderReportPageLibrary === "function") window.renderReportPageLibrary();
});
actions.appendChild(report);
```

Expose:

```js
window.removeStorylineFromFactPack = removeStorylineFromFactPack;
```

- [ ] **Step 5: Add CSS**

Append to `styles/app.css`:

```css
.legacy-fact-pack {
  opacity: 0.72;
  transform: scale(0.98);
}

.legacy-fact-pack .fact-pack-toggle {
  background: #f6f8fb;
  color: #667085;
}

.storyline-fact-pack-remove,
.storyline-fact-pack-secondary {
  border: 1px solid rgba(33, 49, 78, 0.18);
  background: #fff;
  color: #344054;
  border-radius: 6px;
  padding: 8px 10px;
  font-weight: 700;
}
```

- [ ] **Step 6: Run tests**

Run:

```bash
node tests/storyline_fact_pack_single_entry_contract.test.js
node tests/storyline_fact_pack_ui_contract.test.js
node --check js/66-storyline-fact-pack-ui.js
```

Expected: all pass.

- [ ] **Step 7: Commit**

Run:

```bash
git add index.html js/66-storyline-fact-pack-ui.js styles/app.css tests/storyline_fact_pack_single_entry_contract.test.js
git commit -m "feat: unify storyline fact pack entry"
```

Expected: old fact pack is visually and semantically downgraded; drawer has remove/report actions.

---

## Task 3: 新增轻量故事播放器

**Files:**
- Create: `js/68-storyline-page-player.js`
- Modify: `index.html`
- Modify: `styles/app.css`
- Create: `tests/storyline_page_player_contract.test.js`

- [ ] **Step 1: Write player contract**

Create `tests/storyline_page_player_contract.test.js`:

```js
const assert = require("assert");
const fs = require("fs");
const path = require("path");

const player = fs.readFileSync(path.join(__dirname, "../js/68-storyline-page-player.js"), "utf8");
const html = fs.readFileSync(path.join(__dirname, "../index.html"), "utf8");
const css = fs.readFileSync(path.join(__dirname, "../styles/app.css"), "utf8");

assert.ok(player.includes("renderStorylinePagePlayer"), "player should expose renderStorylinePagePlayer");
assert.ok(player.includes("storyline-page-player"), "player should use stable CSS class");
assert.ok(player.includes("textContent"), "player should use textContent");
assert.ok(!player.includes(".innerHTML"), "player should not use innerHTML");
assert.ok(html.includes("js/68-storyline-page-player.js"), "index should load player script");
assert.ok(css.includes(".storyline-page-player"), "CSS should style player");
assert.ok(css.includes("aspect-ratio: 16 / 9"), "player should use 16:9 aspect ratio");

console.log("storyline page player contract passed");
```

- [ ] **Step 2: Run test to verify it fails**

Run:

```bash
node tests/storyline_page_player_contract.test.js
```

Expected: fails because player does not exist.

- [ ] **Step 3: Create player file**

Create `js/68-storyline-page-player.js`:

```js
(function () {
  "use strict";
  if (typeof window === "undefined" || typeof document === "undefined") return;

  function el(tag, className, text) {
    var node = document.createElement(tag);
    if (className) node.className = className;
    if (typeof text === "string") node.textContent = text;
    return node;
  }

  function asArray(value) {
    return Array.isArray(value) ? value : [];
  }

  function renderStorylinePagePlayer(host, options) {
    if (!host) return null;
    options = options || {};
    var pages = asArray(options.pages);
    var index = Math.max(0, Math.min(options.index || 0, Math.max(0, pages.length - 1)));
    var page = pages[index] || {};
    host.replaceChildren();

    var shell = el("section", "storyline-page-player");
    var top = el("div", "storyline-page-player-top");
    top.appendChild(el("span", "", options.kicker || "故事页"));
    top.appendChild(el("b", "", String(index + 1) + " / " + String(Math.max(1, pages.length))));
    shell.appendChild(top);

    var body = el("div", "storyline-page-player-body");
    body.appendChild(el("h2", "", page.title || "待选择故事线"));
    body.appendChild(el("p", "", page.subtitle || page.evidenceSentence || "请先从数据对标页加入故事线。"));
    asArray(page.bullets).slice(0, 4).forEach(function (text) {
      body.appendChild(el("div", "storyline-page-player-bullet", text));
    });
    shell.appendChild(body);

    var actions = el("div", "storyline-page-player-actions");
    var prev = el("button", "", "上一页");
    var next = el("button", "", "下一页");
    prev.type = "button";
    next.type = "button";
    prev.disabled = index === 0;
    next.disabled = index >= pages.length - 1;
    prev.addEventListener("click", function () {
      renderStorylinePagePlayer(host, Object.assign({}, options, { index: index - 1 }));
    });
    next.addEventListener("click", function () {
      renderStorylinePagePlayer(host, Object.assign({}, options, { index: index + 1 }));
    });
    actions.appendChild(prev);
    actions.appendChild(next);
    shell.appendChild(actions);

    host.appendChild(shell);
    return shell;
  }

  window.renderStorylinePagePlayer = renderStorylinePagePlayer;
})();
```

- [ ] **Step 4: Add script tag**

In `index.html`, after `js/66-storyline-fact-pack-ui.js` and before `js/64-three-page-diagnosis-renderer.js`, add:

```html
<script src="js/68-storyline-page-player.js?v=20260620-workflow-convergence"></script>
```

- [ ] **Step 5: Add CSS**

Append to `styles/app.css`:

```css
.storyline-page-player {
  width: min(1180px, 100%);
  aspect-ratio: 16 / 9;
  margin: 0 auto;
  display: grid;
  grid-template-rows: auto 1fr auto;
  border: 1px solid rgba(33, 49, 78, 0.14);
  border-radius: 8px;
  background: #fff;
  overflow: hidden;
}

.storyline-page-player-top,
.storyline-page-player-actions {
  display: flex;
  justify-content: space-between;
  gap: 12px;
  padding: 14px 18px;
  border-bottom: 1px solid rgba(33, 49, 78, 0.10);
}

.storyline-page-player-actions {
  border-top: 1px solid rgba(33, 49, 78, 0.10);
  border-bottom: 0;
}

.storyline-page-player-body {
  padding: 28px;
  display: grid;
  align-content: center;
  gap: 14px;
}

.storyline-page-player-body h2 {
  margin: 0;
  font-size: 28px;
  line-height: 1.22;
}

.storyline-page-player-bullet {
  padding: 10px 12px;
  border-left: 3px solid #009cde;
  background: #f6f8fb;
}
```

- [ ] **Step 6: Run tests**

Run:

```bash
node tests/storyline_page_player_contract.test.js
node --check js/68-storyline-page-player.js
```

Expected: all pass.

- [ ] **Step 7: Commit**

Run:

```bash
git add js/68-storyline-page-player.js index.html styles/app.css tests/storyline_page_player_contract.test.js
git commit -m "feat: add storyline page player"
```

---

## Task 4: 三页诊断优先使用故事播放器

**Files:**
- Modify: `js/64-three-page-diagnosis-renderer.js`
- Create: `tests/three_page_storyline_player_contract.test.js`

- [ ] **Step 1: Write renderer contract**

Create `tests/three_page_storyline_player_contract.test.js`:

```js
const assert = require("assert");
const fs = require("fs");
const path = require("path");

const renderer = fs.readFileSync(path.join(__dirname, "../js/64-three-page-diagnosis-renderer.js"), "utf8");

assert.ok(renderer.includes("renderStorylinePagePlayer"), "three-page renderer should use storyline page player");
assert.ok(renderer.includes("model.source === \"storylineFactPack\""), "player path should be tied to storyline fact pack");
assert.ok(renderer.includes("buildConclusionPlayerPages"), "renderer should convert conclusion to player pages");
assert.ok(renderer.includes("buildEvidencePlayerPages"), "renderer should convert evidence map to player pages");
assert.ok(renderer.includes("buildAttributionPlayerPages"), "renderer should convert attribution to player pages");

console.log("three page storyline player contract passed");
```

- [ ] **Step 2: Run test to verify it fails**

Run:

```bash
node tests/three_page_storyline_player_contract.test.js
```

Expected: fails until renderer uses player.

- [ ] **Step 3: Add page adapters**

In `js/64-three-page-diagnosis-renderer.js`, add:

```js
function buildConclusionPlayerPages(model) {
  var page = model.conclusion || {};
  return [{
    title: page.headline || "结论摘要",
    subtitle: "30 秒诊断",
    bullets: (page.cards || []).map(function (card) {
      return (card.title || card.metric || "判断") + "：" + (card.sentence || card.conclusion || "待确认");
    }).slice(0, 4)
  }];
}

function buildEvidencePlayerPages(model) {
  var page = model.evidenceMap || {};
  var groups = page.groups || [];
  return [{
    title: page.headline || "证据地图",
    subtitle: page.chainSummary || "事实包证据链",
    bullets: groups.slice(0, 4).map(function (group) {
      return (group.title || group.category || "证据") + "：" + ((group.items || []).length || 0) + " 条";
    })
  }];
}

function buildAttributionPlayerPages(model) {
  var page = model.attribution || {};
  var topics = page.topics || page.visibleTopics || [];
  return topics.slice(0, 3).map(function (topic) {
    var chain = topic.causalChain || {};
    return {
      title: topic.title || "专题归因",
      subtitle: "结果指标 → 直接原因 → 结构原因 → 管理动作",
      bullets: [
        "结果指标：" + (chain.resultMetric || "待确认"),
        "直接原因：" + (chain.directCause || "待确认"),
        "结构原因：" + (chain.structureCause || "待确认"),
        "管理动作：" + (chain.recommendedAction || "待确认")
      ]
    };
  });
}
```

- [ ] **Step 4: Use player for storyline fact pack path**

At the beginning of each page render function, after creating the section:

```js
if (model.source === "storylineFactPack" && typeof window.renderStorylinePagePlayer === "function") {
  var playerHost = el("div", "three-page-player-host");
  section.appendChild(playerHost);
  window.renderStorylinePagePlayer(playerHost, {
    kicker: "故事线事实包",
    pages: buildConclusionPlayerPages(model),
    index: 0
  });
  return section;
}
```

Use the corresponding adapter for evidence and attribution pages.

- [ ] **Step 5: Run tests**

Run:

```bash
node tests/three_page_storyline_player_contract.test.js
node tests/three_page_diagnosis_renderer_contract.test.js
node tests/storyline_fact_pack_flow_runtime.test.js
node --check js/64-three-page-diagnosis-renderer.js
```

Expected: all pass.

- [ ] **Step 6: Commit**

Run:

```bash
git add js/64-three-page-diagnosis-renderer.js tests/three_page_storyline_player_contract.test.js
git commit -m "feat: render diagnosis pages as storyline player"
```

---

## Task 5: 报告页库 renderer 展示事实包字段

**Files:**
- Modify: `js/62-report-page-library-renderer.js`
- Create: `tests/report_page_library_storyline_renderer_contract.test.js`

- [ ] **Step 1: Write renderer contract**

Create `tests/report_page_library_storyline_renderer_contract.test.js`:

```js
const assert = require("assert");
const fs = require("fs");
const path = require("path");

const renderer = fs.readFileSync(path.join(__dirname, "../js/62-report-page-library-renderer.js"), "utf8");

assert.ok(renderer.includes("sourceFactIds"), "renderer should display source fact ids");
assert.ok(renderer.includes("readingGuideId"), "renderer should display reading guide id");
assert.ok(renderer.includes("evidenceSentence"), "renderer should display evidence sentence");
assert.ok(renderer.includes("待补证据"), "renderer should display incomplete candidate status");
assert.ok(renderer.includes("openStorylineChartViewer"), "renderer should allow chart viewer reuse");

console.log("report page library storyline renderer contract passed");
```

- [ ] **Step 2: Run test to verify it fails**

Run:

```bash
node tests/report_page_library_storyline_renderer_contract.test.js
```

Expected: fails until renderer displays storyline fields.

- [ ] **Step 3: Add field display in preview**

In `js/62-report-page-library-renderer.js`, inside preview card/page render path, add visible fields for a selected page:

```js
if (page.source === "storylineFactPack") {
  meta.appendChild(el("p", "", "证据句：" + (page.evidenceSentence || "待补证据")));
  meta.appendChild(el("p", "", "事实编号：" + (page.sourceFactIds || []).join("、")));
  meta.appendChild(el("p", "", "读图指南：" + (page.readingGuideId || "待补证据")));
  if (page.reportReadiness === "待补证据" || page.status === "待补证据") {
    meta.appendChild(el("strong", "report-page-missing-evidence", "待补证据"));
  }
}
```

If the renderer uses string templates, escape with the existing escape helper before insertion.

- [ ] **Step 4: Add chart viewer action**

When `page.chartIds && page.chartIds.length`, render a button:

```js
button.textContent = "查看页面主图";
button.addEventListener("click", function () {
  if (typeof window.openStorylineChartViewer === "function") {
    window.openStorylineChartViewer({ title: page.title, readingGuide: { whatToSee: page.evidenceSentence, reportUse: page.useScenario, source: page.readingGuideId } });
  }
});
```

- [ ] **Step 5: Run tests**

Run:

```bash
node tests/report_page_library_storyline_renderer_contract.test.js
node tests/report_page_library_renderer_contract.test.js
node tests/storyline_fact_pack_report_candidates_contract.test.js
node --check js/62-report-page-library-renderer.js
```

Expected: all pass.

- [ ] **Step 6: Commit**

Run:

```bash
git add js/62-report-page-library-renderer.js tests/report_page_library_storyline_renderer_contract.test.js
git commit -m "feat: show storyline evidence in report page library"
```

---

## Task 6: Final browser verification

**Files:**
- Modify: `tests/storyline_fact_pack_browser.spec.js`

- [ ] **Step 1: Ensure browser spec covers natural flow**

Confirm `tests/storyline_fact_pack_browser.spec.js` includes this sequence:

```js
await page.locator("#bmBankList .bm-bank-item").filter({ hasText: "苏农银行" }).first().click();
await page.waitForFunction(() => document.querySelectorAll(".bm-storyline-card").length > 0);
await page.getByText("加入事实包").first().click();
await page.getByText("读图指南").first().click();
window.location.hash = "#page/answer";
```

- [ ] **Step 2: Run full focused test set**

Run:

```bash
node tests/storyline_fact_pack_model_contract.test.js
node tests/storyline_fact_pack_ui_contract.test.js
node tests/storyline_fact_pack_benchmark_entry_contract.test.js
node tests/workflow_convergence_natural_flow_contract.test.js
node tests/storyline_fact_pack_flow_runtime.test.js
node tests/storyline_fact_pack_report_candidates_contract.test.js
node tests/storyline_page_player_contract.test.js
node tests/three_page_storyline_player_contract.test.js
node tests/report_page_library_storyline_renderer_contract.test.js
```

Expected: all pass.

- [ ] **Step 3: Run syntax checks**

Run:

```bash
node --check js/55-benchmark-page.js
node --check js/61-report-page-library-model.js
node --check js/62-report-page-library-renderer.js
node --check js/64-three-page-diagnosis-renderer.js
node --check js/65-storyline-fact-pack-model.js
node --check js/66-storyline-fact-pack-ui.js
node --check js/68-storyline-page-player.js
```

Expected: all pass.

- [ ] **Step 4: Run browser test**

Start server:

```bash
python3 -m http.server 8798
```

Run:

```bash
/Users/jinkunxiao/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin/node tests/storyline_fact_pack_browser.spec.js
```

Expected: `storyline-fact-pack-browser-ok`.

- [ ] **Step 5: Commit browser spec adjustment if changed**

Run:

```bash
git add tests/storyline_fact_pack_browser.spec.js
git commit -m "test: verify natural storyline fact pack flow"
```

Expected: commit only if browser spec changed after Task 1.

---

## Self-Review

- Spec coverage: Task 0 covers `js/55` mixed state; Task 1 covers natural click flow; Task 2 covers single fact-pack entry; Task 3 and Task 4 cover fixed story player; Task 5 covers report page renderer; Task 6 covers browser verification.
- Placeholder scan: the plan uses explicit file paths, commands, expected results and code snippets for each implementation step.
- Type consistency: `storylineFactPack`, `selectedStorylineIds`, `storylineId`, `sourceFactIds`, `chartIds`, `evidenceSentence`, `readingGuideId`, and `recommendedSlideLayout` are used consistently with the existing model and report library contracts.
