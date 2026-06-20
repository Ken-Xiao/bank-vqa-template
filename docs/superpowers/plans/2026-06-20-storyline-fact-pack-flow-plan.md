# Storyline Fact Pack Flow Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 打通“数据对标故事线 → 事实包 → 结论摘要 / 证据地图 / 专题归因 → 报告页候选”的统一流转，让后续报告只消费用户明确选入事实包的故事线、图表和读图指南。

**Architecture:** 新增 `storylineFactPack` 作为跨页面唯一状态，由模型层从现有 evidence pack 和 benchmark story data 中生成，再由数据对标页、三页诊断页和报告页库分别消费。Sprint 1 先实现事实包模型、故事线选择、图片放大读图指南和三页最小同步；后续 Sprint 再重排布局和接入 HTML 报告页库。

**Tech Stack:** 原生 JavaScript、现有 BenchmarkIQ portal、`localStorage`/`window.benchmarkiq` 状态、DOM API 渲染、Node 契约测试、Playwright 浏览器验证。

---

## File Structure

- Create: `js/65-storyline-fact-pack-model.js`  
  负责构建、读取、写入 `storylineFactPack`。只处理数据，不写 DOM。

- Create: `js/66-storyline-fact-pack-ui.js`  
  负责事实包抽屉、故事线按钮状态、图片放大层和读图指南。使用 DOM API 和 `textContent`。

- Modify: `index.html`  
  引入 `js/65-storyline-fact-pack-model.js` 和 `js/66-storyline-fact-pack-ui.js`；增加事实包抽屉挂载点和图片查看层挂载点。

- Modify: `js/55-benchmark-page.js`  
  在故事线或主题指标卡旁边增加 `加入事实包 / 查看大图 / 读图指南` 操作，并在 benchmark 页面渲染完成后调用 `renderStorylineFactPackControls()`。

- Modify: `js/63-three-page-diagnosis-model.js`  
  优先读取 `storylineFactPack.selectedStorylineIds`。若存在选中的故事线，三页模型只使用这些故事线；若不存在，回退到当前 evidence pack 逻辑并显示 `empty-selection` 或 `missing-pack`。

- Modify: `js/64-three-page-diagnosis-renderer.js`  
  在结论摘要、证据地图、专题归因页面顶部显示事实包上下文；专题页支持基于选中故事线的切换状态。

- Modify: `js/61-report-page-library-model.js`  
  报告页候选优先从 `storylineFactPack.storylines[].reportCandidates` 生成；缺少 `sourceFactIds / chartIds / evidenceSentence / readingGuideId` 的候选标记为 `待补证据`。

- Test: `tests/storyline_fact_pack_model_contract.test.js`  
  验证事实包数据契约、选中故事线、读图指南、报告候选字段。

- Test: `tests/storyline_fact_pack_ui_contract.test.js`  
  静态验证 UI 文件没有 `innerHTML` 风险，并包含抽屉、图片查看层、读图指南行为。

- Test: `tests/storyline_fact_pack_flow_runtime.test.js`  
  使用 VM 和轻量 DOM mock 验证选择故事线后，三页模型和报告页候选都能读取同一份事实包。

- Test: `tests/storyline_fact_pack_browser.spec.js`  
  浏览器验证：进入数据对标页，选择故事线，打开图表大图，进入结论摘要，确认选中故事线延续。

---

## Task 0: 勘察现有故事线和事实包字段

**Files:**
- Read: `js/55-benchmark-page.js`
- Read: `js/57-evidence-pack-model.js`
- Read: `js/63-three-page-diagnosis-model.js`
- Read: `js/61-report-page-library-model.js`

- [ ] **Step 1: Locate current story card renderers**

Run:

```bash
rg -n "story|故事|render.*Card|benchmark.*card|evidencePack|reportCandidates|readingGuide|chart" js/55-benchmark-page.js js/57-evidence-pack-model.js js/61-report-page-library-model.js js/63-three-page-diagnosis-model.js
```

Expected: output identifies the benchmark card renderer, existing evidence pack reader/writer, three-page diagnosis model entry, and report page library model entry.

- [ ] **Step 2: Record actual insertion points in implementation notes**

Create a local note during implementation, not committed unless useful:

```text
benchmark story renderer:
evidence pack builder:
three-page model builder:
report page library builder:
```

Expected: each line has an actual function name and file path. If no stable story renderer exists, Task 2 must create adapter functions that can wrap current metric cards.

---

## Task 1: 建立 Storyline Fact Pack 模型

**Files:**
- Create: `tests/storyline_fact_pack_model_contract.test.js`
- Create: `js/65-storyline-fact-pack-model.js`

- [ ] **Step 1: Write failing model contract test**

Create `tests/storyline_fact_pack_model_contract.test.js`:

```js
const assert = require("assert");
const fs = require("fs");
const path = require("path");
const vm = require("vm");

const code = fs.readFileSync(path.join(__dirname, "../js/65-storyline-fact-pack-model.js"), "utf8");
const context = { window: {}, console, localStorage: makeStorage() };
context.window.localStorage = context.localStorage;
vm.createContext(context);
vm.runInContext(code, context);

function makeStorage() {
  const store = {};
  return {
    getItem(key) { return Object.prototype.hasOwnProperty.call(store, key) ? store[key] : null; },
    setItem(key, value) { store[key] = String(value); },
    removeItem(key) { delete store[key]; }
  };
}

const sourcePack = {
  status: "confirmed",
  targetBank: { id: "target", name: "目标银行", type: "城商行", region: "浙江" },
  year: 2025,
  peerGroup: { banks: ["对标银行A", "对标银行B", "对标银行C"] },
  recommendedIssues: [
    {
      issueId: "nim_pressure",
      title: "息差防守压力扩大",
      priority: 1,
      primaryMetric: "净息差",
      conclusion: "目标行净息差低于对标组，且降幅更快。",
      category: "anomaly",
      evidence: [
        {
          evidenceId: "fact_nim_gap",
          metric: "净息差",
          targetValue: "1.45%",
          peerValue: "1.68%",
          gap: "-0.23pct",
          category: "anomaly",
          signalDirection: "support",
          source: "2025 年年报结构化指标库"
        }
      ],
      causalChain: ["ROE 承压", "净息差低于对标组", "负债成本抬升", "复核负债结构"]
    }
  ]
};

const model = context.window.buildStorylineFactPack(sourcePack, { selectedStorylineIds: ["nim_pressure"] });

assert.strictEqual(model.version, "storyline-fact-pack-v1");
assert.strictEqual(model.status, "confirmed");
assert.deepStrictEqual(model.selectedStorylineIds, ["nim_pressure"]);
assert.strictEqual(model.storylines[0].selected, true);
assert.strictEqual(model.storylines[0].facts[0].factId, "fact_nim_gap");
assert.ok(model.storylines[0].charts[0].readingGuide.whatToSee.includes("净息差"));
assert.ok(model.storylines[0].reportCandidates[0].sourceFactIds.includes("fact_nim_gap"));
assert.ok(model.storylines[0].reportCandidates[0].readingGuideId);

context.window.saveStorylineFactPack(model);
const loaded = context.window.readStorylineFactPack();
assert.strictEqual(loaded.storylines[0].storylineId, "nim_pressure");

console.log("storyline fact pack model contract passed");
```

- [ ] **Step 2: Run test to verify it fails**

Run:

```bash
node tests/storyline_fact_pack_model_contract.test.js
```

Expected: FAIL with `ENOENT` or `buildStorylineFactPack is not a function`.

- [ ] **Step 3: Implement model**

Create `js/65-storyline-fact-pack-model.js`:

```js
(function () {
  "use strict";

  var STORAGE_KEY = "benchmarkiq.storylineFactPack";

  function asArray(value) {
    return Array.isArray(value) ? value : [];
  }

  function firstText() {
    for (var i = 0; i < arguments.length; i += 1) {
      if (typeof arguments[i] === "string" && arguments[i].trim()) return arguments[i].trim();
    }
    return "";
  }

  function getIssueId(issue, index) {
    return firstText(issue.issueId, issue.id, issue.key, "storyline_" + (index + 1));
  }

  function normalizeContext(pack) {
    var peerGroup = pack && pack.peerGroup;
    var peerBanks = Array.isArray(peerGroup) ? peerGroup : asArray(peerGroup && peerGroup.banks);
    return {
      targetBank: pack && (pack.targetBank || pack.bank || pack.target) || null,
      peerGroup: peerBanks.map(function (bank) {
        return typeof bank === "string" ? { name: bank } : bank;
      }),
      year: pack && (pack.year || pack.reportYear || pack.selectedYear) || null
    };
  }

  function buildFacts(issue) {
    return asArray(issue.evidence).map(function (item, index) {
      var factId = firstText(item.factId, item.evidenceId, issue.issueId + "_fact_" + (index + 1));
      return {
        factId: factId,
        category: firstText(item.category, issue.category, "uncategorized"),
        metric: firstText(item.metric, item.primaryMetric, issue.primaryMetric, issue.title),
        targetValue: firstText(item.targetValue, item.target, item.value),
        peerValue: firstText(item.peerValue, item.peer, item.benchmark),
        gap: firstText(item.gap, item.delta, item.diff),
        signalDirection: firstText(item.signalDirection, item.directionType, "support"),
        trace: asArray(item.trace).length ? item.trace : [{ field: "evidence", source: firstText(item.source, "evidencePack"), value: firstText(item.metric, issue.primaryMetric, issue.title) }]
      };
    });
  }

  function buildReadingGuide(issue, fact) {
    var metric = firstText(fact && fact.metric, issue.primaryMetric, issue.title, "核心指标");
    var gap = firstText(fact && fact.gap, "当前差距");
    return {
      whatToSee: "先看" + metric + "的目标行与对标组差距，再看该差距是否能解释当前故事线。",
      keyGap: metric + "差距：" + gap,
      supports: firstText(issue.conclusion, issue.title),
      reportUse: "适合放入专题归因或证据地图页面，用于说明" + firstText(issue.title, "核心判断") + "。",
      source: firstText(fact && fact.trace && fact.trace[0] && fact.trace[0].source, "当前数据对标事实包")
    };
  }

  function buildCharts(issue, facts) {
    var primaryFact = facts[0] || null;
    var chartId = firstText(issue.chartId, issue.issueId + "_chart");
    return [{
      chartId: chartId,
      title: firstText(issue.chartTitle, issue.title, "故事线证据图"),
      src: firstText(issue.chartSrc, issue.visualAsset && issue.visualAsset.src),
      enlargedSrc: firstText(issue.enlargedSrc, issue.chartSrc, issue.visualAsset && issue.visualAsset.src),
      readingGuide: buildReadingGuide(issue, primaryFact),
      sourceFactIds: primaryFact ? [primaryFact.factId] : []
    }];
  }

  function getCausalChain(issue) {
    var chain = issue.causalChain || {};
    if (Array.isArray(chain)) {
      return {
        resultMetric: firstText(issue.primaryMetric, chain[0], "待确认结果指标"),
        directCause: firstText(issue.directDriver, chain[1], "待确认直接原因"),
        structureCause: firstText(issue.structureDriver, chain[2], "待确认结构原因"),
        recommendedAction: firstText(issue.recommendedAction, issue.action, chain[3], "待确认管理动作")
      };
    }
    return {
      resultMetric: firstText(issue.primaryMetric, chain.resultMetric, "待确认结果指标"),
      directCause: firstText(chain.directCause, issue.directDriver, "待确认直接原因"),
      structureCause: firstText(chain.structureCause, issue.structureDriver, "待确认结构原因"),
      recommendedAction: firstText(issue.recommendedAction, issue.action, chain.recommendedAction, "待确认管理动作")
    };
  }

  function buildReportCandidates(issue, facts, charts, context) {
    var firstFact = facts[0];
    var firstChart = charts[0];
    return [{
      pageId: "report_" + issue.issueId + "_story",
      title: firstText(issue.reportTitle, issue.title, "报告候选页"),
      layout: "headline-evidence-chart",
      sourceFactIds: firstFact ? [firstFact.factId] : [],
      chartIds: firstChart ? [firstChart.chartId] : [],
      evidenceSentence: firstText(issue.conclusion, issue.title),
      readingGuideId: firstChart ? firstChart.chartId : "",
      recommendedSlideLayout: "headline-evidence-chart",
      useScenario: "经营管理层专题复盘",
      status: firstFact && firstChart && firstText(issue.conclusion) ? "ready" : "待补证据",
      context: context
    }];
  }

  function normalizeIssue(issue, index, selectedIds, context) {
    var normalized = Object.assign({}, issue);
    normalized.issueId = getIssueId(issue, index);
    var facts = buildFacts(normalized);
    var charts = buildCharts(normalized, facts);
    return {
      storylineId: normalized.issueId,
      title: firstText(normalized.title, normalized.primaryMetric, "未命名故事线"),
      priority: Number(normalized.priority || index + 1),
      selected: selectedIds.indexOf(normalized.issueId) >= 0,
      conclusion: firstText(normalized.conclusion, normalized.summary, normalized.title),
      evidenceStrength: firstText(normalized.evidenceStrength, normalized.confidence, "中"),
      roleFit: asArray(normalized.roleFit).length ? normalized.roleFit : ["经营管理层"],
      sourceIssueId: normalized.issueId,
      facts: facts,
      charts: charts,
      causalChain: getCausalChain(normalized),
      reportCandidates: buildReportCandidates(normalized, facts, charts, context)
    };
  }

  function buildStorylineFactPack(pack, options) {
    var sourceIssues = asArray(pack && pack.recommendedIssues).concat(asArray(pack && pack.storylines));
    var selectedIds = asArray(options && options.selectedStorylineIds);
    var context = normalizeContext(pack || {});
    var storylines = sourceIssues.map(function (issue, index) {
      return normalizeIssue(issue, index, selectedIds, context);
    });
    return {
      version: "storyline-fact-pack-v1",
      status: pack && pack.status === "confirmed" ? "confirmed" : "partial",
      context: context,
      selectedStorylineIds: selectedIds,
      storylines: storylines
    };
  }

  function readStorylineFactPack() {
    try {
      var raw = window.localStorage && window.localStorage.getItem(STORAGE_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch (error) {
      return null;
    }
  }

  function saveStorylineFactPack(pack) {
    if (window.localStorage) window.localStorage.setItem(STORAGE_KEY, JSON.stringify(pack));
    window.benchmarkiq = window.benchmarkiq || {};
    window.benchmarkiq.storylineFactPack = pack;
    return pack;
  }

  window.buildStorylineFactPack = buildStorylineFactPack;
  window.readStorylineFactPack = readStorylineFactPack;
  window.saveStorylineFactPack = saveStorylineFactPack;
})();
```

- [ ] **Step 4: Run test to verify it passes**

Run:

```bash
node tests/storyline_fact_pack_model_contract.test.js
node --check js/65-storyline-fact-pack-model.js
```

Expected: PASS and no syntax errors.

- [ ] **Step 5: Commit**

```bash
git add js/65-storyline-fact-pack-model.js tests/storyline_fact_pack_model_contract.test.js
git commit -m "feat: add storyline fact pack model"
```

---

## Task 2: 增加事实包抽屉、图片放大和读图指南 UI

**Files:**
- Create: `tests/storyline_fact_pack_ui_contract.test.js`
- Create: `js/66-storyline-fact-pack-ui.js`
- Modify: `index.html`
- Modify: `styles/app.css`

- [ ] **Step 1: Write UI safety and behavior contract**

Create `tests/storyline_fact_pack_ui_contract.test.js`:

```js
const assert = require("assert");
const fs = require("fs");
const path = require("path");

const uiPath = path.join(__dirname, "../js/66-storyline-fact-pack-ui.js");
const ui = fs.readFileSync(uiPath, "utf8");

assert.ok(ui.includes("renderStorylineFactPackControls"));
assert.ok(ui.includes("openStorylineChartViewer"));
assert.ok(ui.includes("readingGuide"));
assert.ok(ui.includes("textContent"));
assert.ok(!ui.includes(".innerHTML"));
assert.ok(!ui.includes("insertAdjacentHTML"));

const html = fs.readFileSync(path.join(__dirname, "../index.html"), "utf8");
assert.ok(html.includes("storylineFactPackDrawer"));
assert.ok(html.includes("storylineChartViewer"));
assert.ok(html.includes("js/65-storyline-fact-pack-model.js"));
assert.ok(html.includes("js/66-storyline-fact-pack-ui.js"));

console.log("storyline fact pack ui contract passed");
```

- [ ] **Step 2: Run test to verify it fails**

Run:

```bash
node tests/storyline_fact_pack_ui_contract.test.js
```

Expected: FAIL because `js/66-storyline-fact-pack-ui.js` or mount nodes do not exist.

- [ ] **Step 3: Add mount points and script tags**

Modify `index.html`:

```html
<aside id="storylineFactPackDrawer" class="storyline-fact-pack-drawer" aria-label="故事线事实包"></aside>
<div id="storylineChartViewer" class="storyline-chart-viewer" hidden></div>
```

Add scripts after `js/65-storyline-fact-pack-model.js` and before downstream consumers:

```html
<script src="js/65-storyline-fact-pack-model.js"></script>
<script src="js/66-storyline-fact-pack-ui.js"></script>
```

- [ ] **Step 4: Implement UI file**

Create `js/66-storyline-fact-pack-ui.js`:

```js
(function () {
  "use strict";

  function el(tag, className, text) {
    var node = document.createElement(tag);
    if (className) node.className = className;
    if (typeof text === "string") node.textContent = text;
    return node;
  }

  function getPack() {
    if (window.readStorylineFactPack) return window.readStorylineFactPack();
    return window.benchmarkiq && window.benchmarkiq.storylineFactPack || null;
  }

  function selectedStorylines(pack) {
    if (!pack || !Array.isArray(pack.storylines)) return [];
    return pack.storylines.filter(function (story) { return story.selected; });
  }

  function renderStorylineFactPackControls() {
    var drawer = document.getElementById("storylineFactPackDrawer");
    if (!drawer) return;
    drawer.replaceChildren();
    var pack = getPack();
    var selected = selectedStorylines(pack);
    drawer.appendChild(el("h2", "storyline-fact-pack-title", "故事线事实包"));
    drawer.appendChild(el("p", "storyline-fact-pack-meta", selected.length ? "已选择 " + selected.length + " 条故事线" : "请先从数据对标页加入故事线"));
    selected.forEach(function (story) {
      var row = el("section", "storyline-fact-pack-item");
      row.appendChild(el("h3", "", story.title));
      row.appendChild(el("p", "", story.conclusion));
      drawer.appendChild(row);
    });
    var button = el("button", "storyline-fact-pack-next", "进入结论摘要");
    button.type = "button";
    button.disabled = selected.length === 0;
    button.addEventListener("click", function () {
      window.location.hash = "#page/answer";
      if (window.renderThreePageDiagnosis) window.renderThreePageDiagnosis();
    });
    drawer.appendChild(button);
  }

  function renderGuide(container, guide) {
    var items = [
      ["这张图看什么", guide && guide.whatToSee],
      ["关键差距", guide && guide.keyGap],
      ["支持的判断", guide && guide.supports],
      ["报告用途", guide && guide.reportUse],
      ["数据来源", guide && guide.source]
    ];
    items.forEach(function (item) {
      var block = el("div", "storyline-reading-guide-row");
      block.appendChild(el("strong", "", item[0]));
      block.appendChild(el("p", "", item[1] || "待补充"));
      container.appendChild(block);
    });
  }

  function openStorylineChartViewer(chart) {
    var host = document.getElementById("storylineChartViewer");
    if (!host) return;
    host.hidden = false;
    host.replaceChildren();
    var shell = el("div", "storyline-chart-viewer-shell");
    var media = el("div", "storyline-chart-viewer-media");
    if (chart && (chart.enlargedSrc || chart.src)) {
      var img = el("img", "storyline-chart-viewer-img");
      img.alt = chart.title || "故事线证据图";
      img.src = chart.enlargedSrc || chart.src;
      media.appendChild(img);
    } else {
      media.appendChild(el("p", "storyline-chart-viewer-missing", "该故事线暂未生成可放大的图片"));
    }
    var guide = el("aside", "storyline-chart-viewer-guide");
    guide.appendChild(el("h2", "", chart && chart.title || "读图指南"));
    renderGuide(guide, chart && chart.readingGuide);
    var close = el("button", "storyline-chart-viewer-close", "关闭");
    close.type = "button";
    close.addEventListener("click", function () {
      host.hidden = true;
      host.replaceChildren();
    });
    guide.appendChild(close);
    shell.appendChild(media);
    shell.appendChild(guide);
    host.appendChild(shell);
  }

  window.renderStorylineFactPackControls = renderStorylineFactPackControls;
  window.openStorylineChartViewer = openStorylineChartViewer;
})();
```

- [ ] **Step 5: Add minimal styles**

Append to `styles/app.css`:

```css
.storyline-fact-pack-drawer {
  position: fixed;
  right: 24px;
  top: 96px;
  z-index: 30;
  width: min(360px, calc(100vw - 32px));
  max-height: calc(100vh - 128px);
  overflow: auto;
  padding: 16px;
  border: 1px solid rgba(33, 49, 78, 0.16);
  border-radius: 8px;
  background: rgba(255, 255, 255, 0.96);
  box-shadow: 0 18px 50px rgba(16, 24, 40, 0.14);
}

.storyline-chart-viewer[hidden] {
  display: none;
}

.storyline-chart-viewer {
  position: fixed;
  inset: 0;
  z-index: 80;
  background: rgba(11, 18, 32, 0.72);
  display: grid;
  place-items: center;
  padding: 24px;
}

.storyline-chart-viewer-shell {
  width: min(1180px, 100%);
  height: min(720px, calc(100vh - 48px));
  display: grid;
  grid-template-columns: minmax(0, 1fr) 340px;
  background: #fff;
  border-radius: 8px;
  overflow: hidden;
}

.storyline-chart-viewer-media {
  display: grid;
  place-items: center;
  padding: 24px;
  background: #f6f8fb;
}

.storyline-chart-viewer-img {
  max-width: 100%;
  max-height: 100%;
  object-fit: contain;
}

.storyline-chart-viewer-guide {
  padding: 20px;
  overflow: auto;
  border-left: 1px solid rgba(33, 49, 78, 0.12);
}
```

- [ ] **Step 6: Run UI test**

Run:

```bash
node tests/storyline_fact_pack_ui_contract.test.js
node --check js/66-storyline-fact-pack-ui.js
```

Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add index.html styles/app.css js/66-storyline-fact-pack-ui.js tests/storyline_fact_pack_ui_contract.test.js
git commit -m "feat: add storyline fact pack drawer and chart guide"
```

---

## Task 3: 数据对标页故事线按钮接入

**Files:**
- Modify: `js/55-benchmark-page.js`
- Create: `tests/storyline_fact_pack_benchmark_entry_contract.test.js`

- [ ] **Step 1: Write static contract for story actions**

Create `tests/storyline_fact_pack_benchmark_entry_contract.test.js`:

```js
const assert = require("assert");
const fs = require("fs");
const path = require("path");

const code = fs.readFileSync(path.join(__dirname, "../js/55-benchmark-page.js"), "utf8");

assert.ok(code.includes("加入事实包"));
assert.ok(code.includes("查看大图"));
assert.ok(code.includes("读图指南"));
assert.ok(code.includes("buildStorylineFactPack"));
assert.ok(code.includes("saveStorylineFactPack"));
assert.ok(code.includes("renderStorylineFactPackControls"));
assert.ok(code.includes("openStorylineChartViewer"));

console.log("storyline benchmark entry contract passed");
```

- [ ] **Step 2: Run test to verify it fails**

Run:

```bash
node tests/storyline_fact_pack_benchmark_entry_contract.test.js
```

Expected: FAIL because `js/55-benchmark-page.js` does not yet contain the story actions.

- [ ] **Step 3: Add adapter helpers near benchmark page render helpers**

Add to `js/55-benchmark-page.js`:

```js
function ensureStorylineFactPackFromEvidencePack(selectedStorylineId) {
  if (typeof window === "undefined" || typeof window.buildStorylineFactPack !== "function") return null;
  var evidencePack = window.benchmarkiq && (window.benchmarkiq.evidencePack || window.benchmarkiq.currentEvidencePack);
  if (!evidencePack && typeof window.readEvidencePack === "function") evidencePack = window.readEvidencePack();
  var existing = typeof window.readStorylineFactPack === "function" ? window.readStorylineFactPack() : null;
  var selected = existing && Array.isArray(existing.selectedStorylineIds) ? existing.selectedStorylineIds.slice() : [];
  if (selectedStorylineId && selected.indexOf(selectedStorylineId) < 0) selected.push(selectedStorylineId);
  var pack = window.buildStorylineFactPack(evidencePack || { status: "partial", recommendedIssues: [] }, { selectedStorylineIds: selected });
  window.saveStorylineFactPack(pack);
  if (typeof window.renderStorylineFactPackControls === "function") window.renderStorylineFactPackControls();
  return pack;
}

function createStorylineFactPackActions(storylineId, chart) {
  var actions = document.createElement("div");
  actions.className = "benchmark-storyline-actions";
  [
    ["加入事实包", function () { ensureStorylineFactPackFromEvidencePack(storylineId); }],
    ["查看大图", function () { if (window.openStorylineChartViewer) window.openStorylineChartViewer(chart || {}); }],
    ["读图指南", function () { if (window.openStorylineChartViewer) window.openStorylineChartViewer(chart || {}); }]
  ].forEach(function (item) {
    var button = document.createElement("button");
    button.type = "button";
    button.className = "benchmark-storyline-action";
    button.textContent = item[0];
    button.addEventListener("click", item[1]);
    actions.appendChild(button);
  });
  return actions;
}
```

- [ ] **Step 4: Attach actions to each story or metric card**

At the end of the existing story card creation path, append:

```js
var storylineId = issue.issueId || issue.id || issue.key || ("storyline_" + (index + 1));
var chart = issue.charts && issue.charts[0] || issue.chart || null;
card.appendChild(createStorylineFactPackActions(storylineId, chart));
```

If the file does not use `issue / card / index`, adapt the variable names found in Task 0. The behavior must remain identical: each rendered story card gets the three buttons.

- [ ] **Step 5: Refresh drawer after benchmark render**

At the end of the benchmark page render function:

```js
if (typeof window !== "undefined" && typeof window.renderStorylineFactPackControls === "function") {
  window.renderStorylineFactPackControls();
}
```

- [ ] **Step 6: Run tests**

Run:

```bash
node tests/storyline_fact_pack_benchmark_entry_contract.test.js
node --check js/55-benchmark-page.js
```

Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add js/55-benchmark-page.js tests/storyline_fact_pack_benchmark_entry_contract.test.js
git commit -m "feat: add fact pack actions to benchmark storylines"
```

---

## Task 4: 三页模型读取故事线事实包

**Files:**
- Modify: `js/63-three-page-diagnosis-model.js`
- Modify: `js/64-three-page-diagnosis-renderer.js`
- Create: `tests/storyline_fact_pack_flow_runtime.test.js`

- [ ] **Step 1: Write flow runtime test**

Create `tests/storyline_fact_pack_flow_runtime.test.js`:

```js
const assert = require("assert");
const fs = require("fs");
const path = require("path");
const vm = require("vm");

const modelCode = fs.readFileSync(path.join(__dirname, "../js/63-three-page-diagnosis-model.js"), "utf8");
const factCode = fs.readFileSync(path.join(__dirname, "../js/65-storyline-fact-pack-model.js"), "utf8");

const storage = {};
const context = {
  window: {},
  console,
  localStorage: {
    getItem(key) { return storage[key] || null; },
    setItem(key, value) { storage[key] = String(value); }
  }
};
context.window.localStorage = context.localStorage;
context.window.benchmarkiq = {};
vm.createContext(context);
vm.runInContext(factCode, context);

const pack = context.window.buildStorylineFactPack({
  status: "confirmed",
  targetBank: { name: "目标银行" },
  year: 2025,
  peerGroup: { banks: ["A", "B", "C"] },
  recommendedIssues: [{
    issueId: "nim_pressure",
    title: "息差防守压力扩大",
    priority: 1,
    primaryMetric: "净息差",
    conclusion: "目标行净息差低于对标组。",
    evidence: [{ evidenceId: "fact_nim_gap", metric: "净息差", gap: "-0.23pct", category: "anomaly", signalDirection: "support" }]
  }]
}, { selectedStorylineIds: ["nim_pressure"] });
context.window.saveStorylineFactPack(pack);

vm.runInContext(modelCode, context);
const model = context.window.buildThreePageDiagnosisModel();

assert.ok(model.context);
assert.ok(JSON.stringify(model).includes("息差防守压力扩大"));
assert.ok(!JSON.stringify(model).includes("未选择故事线"));

console.log("storyline fact pack flow runtime passed");
```

- [ ] **Step 2: Run test to verify it fails or exposes current fallback**

Run:

```bash
node tests/storyline_fact_pack_flow_runtime.test.js
```

Expected: FAIL or model ignores `storylineFactPack`.

- [ ] **Step 3: Add fact pack branch to three-page model**

In `js/63-three-page-diagnosis-model.js`, before the existing evidence pack fallback:

```js
function readSelectedStorylineFactPack() {
  if (typeof window !== "undefined" && typeof window.readStorylineFactPack === "function") {
    var pack = window.readStorylineFactPack();
    if (pack && Array.isArray(pack.storylines)) {
      var selected = pack.storylines.filter(function (story) { return story.selected; });
      if (selected.length) return { pack: pack, selected: selected };
    }
  }
  return null;
}
```

Then inside `buildThreePageDiagnosisModel()`:

```js
var storylinePack = readSelectedStorylineFactPack();
if (storylinePack) {
  return buildThreePageDiagnosisFromStorylineFactPack(storylinePack.pack, storylinePack.selected);
}
```

Add:

```js
function buildThreePageDiagnosisFromStorylineFactPack(pack, selectedStorylines) {
  var top = selectedStorylines[0];
  return {
    status: pack.status === "confirmed" ? "confirmed" : "partial-pack",
    source: "storylineFactPack",
    context: pack.context,
    conclusion: {
      headline: top.conclusion || top.title,
      cards: selectedStorylines.slice(0, 3).map(function (story) {
        return {
          title: story.title,
          metric: story.facts && story.facts[0] && story.facts[0].metric || story.causalChain && story.causalChain.resultMetric || "",
          sentence: story.conclusion,
          sourceFactIds: story.facts ? story.facts.map(function (fact) { return fact.factId; }) : []
        };
      })
    },
    evidenceMap: {
      strength: top.evidenceStrength || "中",
      groups: selectedStorylines.reduce(function (groups, story) {
        (story.facts || []).forEach(function (fact) {
          var category = fact.category || "uncategorized";
          groups[category] = groups[category] || [];
          groups[category].push(Object.assign({ storylineTitle: story.title }, fact));
        });
        return groups;
      }, {})
    },
    attribution: {
      activeStorylineId: top.storylineId,
      topics: selectedStorylines.map(function (story) {
        return {
          storylineId: story.storylineId,
          title: story.title,
          causalChain: story.causalChain,
          charts: story.charts || [],
          reportCandidates: story.reportCandidates || []
        };
      })
    }
  };
}
```

- [ ] **Step 4: Update renderer to show source context**

In `js/64-three-page-diagnosis-renderer.js`, add a small context banner when `model.source === "storylineFactPack"`:

```js
function appendStorylineFactPackBanner(host, model) {
  if (!model || model.source !== "storylineFactPack") return;
  var banner = document.createElement("div");
  banner.className = "three-page-fact-pack-banner";
  var context = model.context || {};
  var target = context.targetBank && context.targetBank.name || "目标银行";
  var peerCount = Array.isArray(context.peerGroup) ? context.peerGroup.length : 0;
  banner.textContent = target + " · " + (context.year || "当前年份") + " · 已选事实包对标组 " + peerCount + " 家";
  host.appendChild(banner);
}
```

Call it at the top of each page render function after clearing the host.

- [ ] **Step 5: Run tests**

Run:

```bash
node tests/storyline_fact_pack_flow_runtime.test.js
node tests/three_page_diagnosis_behavior.test.js
node tests/three_page_diagnosis_renderer_contract.test.js
node --check js/63-three-page-diagnosis-model.js
node --check js/64-three-page-diagnosis-renderer.js
```

Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add js/63-three-page-diagnosis-model.js js/64-three-page-diagnosis-renderer.js tests/storyline_fact_pack_flow_runtime.test.js
git commit -m "feat: bind diagnosis pages to storyline fact pack"
```

---

## Task 5: 报告页候选绑定事实包

**Files:**
- Modify: `js/61-report-page-library-model.js`
- Create: `tests/storyline_fact_pack_report_candidates_contract.test.js`

- [ ] **Step 1: Write report candidate contract**

Create `tests/storyline_fact_pack_report_candidates_contract.test.js`:

```js
const assert = require("assert");
const fs = require("fs");
const path = require("path");

const code = fs.readFileSync(path.join(__dirname, "../js/61-report-page-library-model.js"), "utf8");

assert.ok(code.includes("readStorylineFactPack"));
assert.ok(code.includes("sourceFactIds"));
assert.ok(code.includes("chartIds"));
assert.ok(code.includes("readingGuideId"));
assert.ok(code.includes("待补证据"));

console.log("storyline report candidate contract passed");
```

- [ ] **Step 2: Run test to verify it fails**

Run:

```bash
node tests/storyline_fact_pack_report_candidates_contract.test.js
```

Expected: FAIL until report model reads `storylineFactPack`.

- [ ] **Step 3: Add candidate adapter**

In `js/61-report-page-library-model.js`, add:

```js
function buildReportPagesFromStorylineFactPack() {
  if (typeof window === "undefined" || typeof window.readStorylineFactPack !== "function") return [];
  var pack = window.readStorylineFactPack();
  if (!pack || !Array.isArray(pack.storylines)) return [];
  return pack.storylines
    .filter(function (story) { return story.selected; })
    .flatMap(function (story) {
      return (story.reportCandidates || []).map(function (candidate) {
        var ready = candidate.sourceFactIds && candidate.sourceFactIds.length && candidate.chartIds && candidate.chartIds.length && candidate.evidenceSentence && candidate.readingGuideId;
        return Object.assign({}, candidate, {
          storylineId: story.storylineId,
          status: ready ? "ready" : "待补证据",
          source: "storylineFactPack"
        });
      });
    });
}
```

At the start of the existing report page builder:

```js
var storylinePages = buildReportPagesFromStorylineFactPack();
if (storylinePages.length) return storylinePages;
```

- [ ] **Step 4: Run tests**

Run:

```bash
node tests/storyline_fact_pack_report_candidates_contract.test.js
node tests/report_page_library_model_contract.test.js
node --check js/61-report-page-library-model.js
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add js/61-report-page-library-model.js tests/storyline_fact_pack_report_candidates_contract.test.js
git commit -m "feat: source report candidates from storyline fact pack"
```

---

## Task 6: Browser validation

**Files:**
- Create: `tests/storyline_fact_pack_browser.spec.js`

- [ ] **Step 1: Create browser spec**

Create `tests/storyline_fact_pack_browser.spec.js`:

```js
const { chromium } = require("playwright");
const assert = require("assert");

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1440, height: 960 } });
  await page.goto("http://127.0.0.1:8798/", { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(1000);

  const hasDrawer = await page.locator("#storylineFactPackDrawer").count();
  assert.strictEqual(hasDrawer, 1, "fact pack drawer should exist");

  const addButton = page.getByText("加入事实包").first();
  await addButton.click();
  await page.waitForTimeout(300);
  const drawerText = await page.locator("#storylineFactPackDrawer").innerText();
  assert.ok(drawerText.includes("已选择") || drawerText.includes("故事线事实包"));

  const guideButton = page.getByText("读图指南").first();
  await guideButton.click();
  await page.waitForTimeout(300);
  const viewerText = await page.locator("#storylineChartViewer").innerText();
  assert.ok(viewerText.includes("这张图看什么") || viewerText.includes("读图指南"));

  await page.goto("http://127.0.0.1:8798/#page/answer", { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(500);
  const answerText = await page.locator("body").innerText();
  assert.ok(answerText.includes("事实包") || answerText.includes("30 秒诊断"));

  await browser.close();
  console.log("storyline fact pack browser spec passed");
})().catch(async (error) => {
  console.error(error);
  process.exit(1);
});
```

- [ ] **Step 2: Start local server**

Run:

```bash
python3 -m http.server 8798
```

Expected: server starts in `outputs/vqa_template`.

- [ ] **Step 3: Run browser spec**

Run in another terminal:

```bash
/Users/jinkunxiao/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin/node tests/storyline_fact_pack_browser.spec.js
```

Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add tests/storyline_fact_pack_browser.spec.js
git commit -m "test: add storyline fact pack browser validation"
```

---

## Self-Review

- Spec coverage:
  - 每条故事线事实包入口：Task 3。
  - 事实包统一状态：Task 1、Task 4、Task 5。
  - 图片放大和读图指南：Task 2。
  - 30 秒诊断和三页同步：Task 4。
  - 报告页候选绑定事实包：Task 5。
  - 浏览器验证：Task 6。

- Placeholder scan:
  - 本计划没有使用占位式实施描述或未定义函数作为最终实现要求。
  - Task 3 的变量名需要在 Task 0 依据真实 renderer 调整，这是现有代码结构差异导致的插入点确认，不改变验收行为。

- Type consistency:
  - `storylineId / factId / chartId / readingGuide / reportCandidates / selectedStorylineIds` 在所有任务中保持一致。
  - 报告候选字段与设计文档一致：`sourceFactIds / chartIds / evidenceSentence / readingGuideId / recommendedSlideLayout`。
