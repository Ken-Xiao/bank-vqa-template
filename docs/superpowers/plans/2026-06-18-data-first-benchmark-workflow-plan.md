# 数据先行入口工作流 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 把产品主路径改成“先数据对标、选择入报告数据、再进入报告工作室”，并让报告页根据证据包展示分析角度和报告模块。

**Architecture:** 复用现有 `benchmark` 页面、`data-page-link` 路由、`benchmarkiq.entryRole` 角色状态和 `js/56-benchmark-state-bridge.js` 的报告附录桥接。新增轻量 `benchmarkiq.evidencePack` localStorage 状态，第一期用规则映射生成 `reportAngles` 和 `reportSections`，不引入后端或 AI 生成链路。

**Tech Stack:** 静态 HTML/CSS、原生 JavaScript、localStorage、Node contract tests。

---

## 文件结构

- Modify: `tests/entry_ia_redesign_contract.test.js`  
  验证首页改为数据先行、报告入口降级为第二阶段说明、四个角色入口全部进入 `benchmark`。

- Modify: `tests/portal_ia_v10_router_canonical.test.js`  
  验证 router 页面顺序、默认页和 Page Rail 语言改为数据先行。

- Create: `tests/data_first_report_evidence_flow_contract.test.js`  
  验证入报告选择面板、证据包字段、规则映射和报告页空态/证据态。

- Modify: `index.html`  
  改首页入口文案和角色路由；在 `benchmark` 页增加入报告选择区域；在报告附录区增加证据包摘要容器。

- Modify: `js/42-portal-router.js`  
  调整 `PORTAL_PAGES` 顺序、页面标签、页面摘要、默认首页、入口意图。

- Modify: `js/56-benchmark-state-bridge.js`  
  新增证据包构建、规则匹配、localStorage 读写、报告页渲染和 CTA 事件。

- Modify: `styles/benchmark.css`  
  增加入报告选择面板、证据包摘要、分析角度标签的样式。

---

### Task 1: 更新入口契约测试

**Files:**
- Modify: `tests/entry_ia_redesign_contract.test.js`

- [ ] **Step 1: 写失败测试**

把旧的并列入口断言改为数据先行断言：

```js
/* Entry IA redesign contract
 * Verifies that launch uses data-first workflow choices and role presets.
 */

const fs = require("fs");
const assert = require("assert/strict");

const html = fs.readFileSync("index.html", "utf8");
const css = fs.readFileSync("styles/app.css", "utf8");
const router = fs.readFileSync("js/42-portal-router.js", "utf8");

[
  'id="entryDecisionPanel"',
  'data-entry-route="benchmark-first"',
  'data-entry-route="report-after-benchmark"',
  'data-page-link="benchmark"',
  "先做数据对标",
  "再进入报告分析",
  "选择数据并进入报告",
].forEach((needle) => {
  assert(html.includes(needle), `missing data-first entry marker: ${needle}`);
});

[
  'data-entry-role="board" data-entry-audience="board" data-page-link="benchmark"',
  'data-entry-role="cfo" data-entry-audience="cfo" data-page-link="benchmark"',
  'data-entry-role="cro" data-entry-audience="cro" data-page-link="benchmark"',
  'data-entry-role="expert" data-entry-audience="expert" data-page-link="benchmark"',
].forEach((needle) => {
  assert(html.includes(needle), `role entry must route through benchmark: ${needle}`);
});

[
  ".entry-decision-panel",
  ".entry-workflow-grid",
  ".entry-route-card",
  ".entry-role-grid",
  ".entry-role-card",
].forEach((needle) => {
  assert(css.includes(needle), `missing entry CSS hook: ${needle}`);
});

[
  'benchmark: "数据对标"',
  'report: "报告工作室"',
  'launch: "入口说明"',
].forEach((needle) => {
  assert(router.includes(needle), `router labels must include ${needle}`);
});

[
  "function applyEntryIntent",
  'localStorage.setItem("benchmarkiq.entryRole"',
  'localStorage.setItem("benchmarkiq.audience"',
  'document.body.setAttribute("data-entry-role"',
].forEach((needle) => {
  assert(router.includes(needle), `router must persist entry intent via ${needle}`);
});

console.log("entry-ia-data-first-contract-ok");
```

- [ ] **Step 2: 运行测试确认失败**

Run: `node tests/entry_ia_redesign_contract.test.js`

Expected: FAIL，至少缺少 `data-entry-route="benchmark-first"` 或角色入口仍指向 `answer/topics/data`。

- [ ] **Step 3: 等 Task 3 和 Task 4 实现后重跑**

Run: `node tests/entry_ia_redesign_contract.test.js`

Expected: PASS，输出 `entry-ia-data-first-contract-ok`。

- [ ] **Step 4: Commit**

```bash
git add tests/entry_ia_redesign_contract.test.js index.html js/42-portal-router.js
git commit -m "feat: make entry IA data-first"
```

---

### Task 2: 更新 Router 和 Page Rail 契约测试

**Files:**
- Modify: `tests/portal_ia_v10_router_canonical.test.js`

- [ ] **Step 1: 写失败测试**

把 router 顺序断言改为数据先行，同时保留 `launch` shell 的存在性：

```js
[
  'var PORTAL_PAGES = ["benchmark", "answer", "evidence", "topics", "report", "data", "launch"]',
  "function setPortalPage",
  "function getPortalPage",
  "function initPortalRouter",
  'document.body.setAttribute("data-app-page", target)',
  'localStorage.setItem("benchmarkiq.activePortalPage", target)',
  '"#page/" + target',
  'initialPage = "benchmark"',
].forEach((needle) => assert(router.includes(needle), `router missing data-first behavior: ${needle}`));
```

保留 CSS 可见性断言，并增加页面标签断言：

```js
[
  'benchmark: "数据对标"',
  'answer: "结论摘要"',
  'evidence: "证据地图"',
  'topics: "专题归因"',
  'report: "报告工作室"',
  'data: "数据复核"',
  'launch: "入口说明"',
].forEach((needle) => assert(router.includes(needle), `router label missing: ${needle}`));
```

- [ ] **Step 2: 运行测试确认失败**

Run: `node tests/portal_ia_v10_router_canonical.test.js`

Expected: FAIL，当前 `PORTAL_PAGES` 仍以 `launch` 开头，默认页仍可能回到 `launch`。

- [ ] **Step 3: 等 Task 4 实现后重跑**

Run: `node tests/portal_ia_v10_router_canonical.test.js`

Expected: PASS，输出 `portal-ia-v10-router-canonical-ok`。

---

### Task 3: 首页改成数据先行入口

**Files:**
- Modify: `index.html`

- [ ] **Step 1: 修改入口面板文案和主卡片**

在 `#entryDecisionPanel` 中改成：

```html
<header class="entry-decision-head">
  <span>数据先行工作台</span>
  <h2>先完成数据对标，再生成报告分析</h2>
  <p>第一步进入数据对标选择银行、对标组、指标域和故事线；第二步选择要带入报告的数据，系统自动匹配分析角度和报告章节。</p>
</header>
<div class="entry-workflow-grid" aria-label="主工作流入口">
  <button type="button" class="entry-route-card is-data" data-entry-route="benchmark-first" data-page-link="benchmark">
    <span>先做数据对标</span>
    <b>从指标、同业和因果链开始</b>
    <em>选择目标银行、对标组、9 个数据域和可入报告的故事线。</em>
  </button>
  <button type="button" class="entry-route-card is-report" data-entry-route="report-after-benchmark" data-page-link="benchmark">
    <span>再进入报告分析</span>
    <b>先选择入报告数据</b>
    <em>从数据对标中勾选指标、故事线和因果链后，自动匹配报告角度。</em>
  </button>
</div>
```

- [ ] **Step 2: 修改角色入口全部进入 benchmark**

四个角色卡都设置 `data-page-link="benchmark"`：

```html
<button type="button" class="entry-role-card" data-entry-role="board" data-entry-audience="board" data-page-link="benchmark">
  <span>董事会 / 行长室</span>
  <b>先看经营总答案的数据证据</b>
  <em>ROE、规模、资本回报、核心结论和经营优先级。</em>
</button>
```

同样修改 CFO、CRO、专家卡片文案，分别突出财务、风险、数据复核视角。

- [ ] **Step 3: 运行入口契约测试**

Run: `node tests/entry_ia_redesign_contract.test.js`

Expected: 仍可能失败，因为 router 还没改；但 HTML 入口相关断言应不再失败。

---

### Task 4: Router 默认进入数据对标

**Files:**
- Modify: `js/42-portal-router.js`

- [ ] **Step 1: 调整页面顺序和标签**

把顶部配置改成：

```js
var PORTAL_PAGES = ["benchmark", "answer", "evidence", "topics", "report", "data", "launch"];

var PORTAL_PAGE_LABELS = {
  benchmark: "数据对标",
  answer: "结论摘要",
  evidence: "证据地图",
  topics: "专题归因",
  report: "报告工作室",
  data: "数据复核",
  launch: "入口说明",
};

var PORTAL_PAGE_SUMMARY = {
  benchmark: "选银行、定对标组、选入报告数据",
  answer: "30秒总判断、董事会议题、行动优先级",
  evidence: "异动归因、同业位置、市净率信号",
  topics: "风险机制、专题链路、行动节奏",
  report: "报告预览、证据包分析、章节编辑与导出",
  data: "字段口径、三源对照、血缘卡",
  launch: "数据先行入口说明与角色预设",
};
```

- [ ] **Step 2: 默认页改为 benchmark**

修改 `normalizePortalPage` 和 `getPortalPage` 的 fallback：

```js
function normalizePortalPage(p) {
  if (typeof p !== "string") return "benchmark";
  var key = p.trim();
  if (PORTAL_PAGES.indexOf(key) >= 0) return key;
  if (key === "topic-detail" || key === "topicdetail" || key === "topicDetail") return "topics";
  return "benchmark";
}

function getPortalPage() {
  if (typeof state !== "undefined" && state.activePortalPage) {
    return normalizePortalPage(state.activePortalPage);
  }
  return "benchmark";
}
```

- [ ] **Step 3: init 默认页改为 benchmark**

修改 `initPortalRouter()` 最后的默认逻辑：

```js
if (!initialPage) {
  initialPage = "benchmark";
}
```

- [ ] **Step 4: 未确认页面 fallback 改为 benchmark**

在 `setPortalPage` 中把未开放页面 fallback 从 `launch` 改为 `benchmark`：

```js
if (!portalPageEnabled(target) && !options.force) {
  target = "benchmark";
}
```

- [ ] **Step 5: 运行 router 契约测试**

Run: `node tests/portal_ia_v10_router_canonical.test.js`

Expected: PASS。

---

### Task 5: 新增入报告选择契约测试

**Files:**
- Create: `tests/data_first_report_evidence_flow_contract.test.js`

- [ ] **Step 1: 写失败测试**

创建测试文件：

```js
const fs = require("fs");
const assert = require("assert/strict");

const html = fs.readFileSync("index.html", "utf8");
const bridge = fs.readFileSync("js/56-benchmark-state-bridge.js", "utf8");
const css = fs.readFileSync("styles/benchmark.css", "utf8");

[
  'id="bmReportEvidenceSelector"',
  'data-report-evidence-selector',
  'id="bmOpenReportEvidenceSelector"',
  "选择数据并进入报告",
  'id="benchmarkEvidencePackSummary"',
].forEach((needle) => {
  assert(html.includes(needle), `missing report evidence UI marker: ${needle}`);
});

[
  "function buildBenchmarkEvidencePack",
  "function matchReportAngles",
  "function saveBenchmarkEvidencePack",
  "function getBenchmarkEvidencePack",
  "function renderBenchmarkEvidencePackSummary",
  'localStorage.setItem("benchmarkiq.evidencePack"',
  'localStorage.getItem("benchmarkiq.evidencePack"',
  'setPortalPage("report"',
].forEach((needle) => {
  assert(bridge.includes(needle), `missing evidence pack bridge behavior: ${needle}`);
});

[
  "盈利能力分析",
  "负债结构与息差压力",
  "资产质量与风险抵补",
  "流动性与安全边际",
  "关键问题追溯",
].forEach((needle) => {
  assert(bridge.includes(needle), `missing report angle mapping: ${needle}`);
});

[
  ".bm-report-selector",
  ".bm-report-selector-grid",
  ".bm-evidence-pack-summary",
  ".bm-report-angle-chip",
].forEach((needle) => {
  assert(css.includes(needle), `missing evidence selector CSS hook: ${needle}`);
});

console.log("data-first-report-evidence-flow-contract-ok");
```

- [ ] **Step 2: 运行测试确认失败**

Run: `node tests/data_first_report_evidence_flow_contract.test.js`

Expected: FAIL，因为 UI、bridge function 和 CSS 还没实现。

---

### Task 6: 增加入报告选择 UI

**Files:**
- Modify: `index.html`

- [ ] **Step 1: 在 benchmark 页顶部加入选择面板**

在 `#benchmarkPageShell` 开始处、左侧 aside 之前加入：

```html
<section class="bm-report-selector" id="bmReportEvidenceSelector" data-report-evidence-selector>
  <header class="bm-report-selector-head">
    <div>
      <span class="bm-pane-kicker">入报告数据</span>
      <h2>选择数据并进入报告</h2>
      <p>勾选要带入报告的指标、故事线和因果链，系统会自动匹配报告分析角度和章节位置。</p>
    </div>
    <button type="button" class="bm-primary-action" id="bmOpenReportEvidenceSelector">生成报告证据包</button>
  </header>
  <div class="bm-report-selector-grid">
    <label><input type="checkbox" data-report-metric="ROE" checked> ROE</label>
    <label><input type="checkbox" data-report-metric="NIM" checked> NIM</label>
    <label><input type="checkbox" data-report-metric="成本收入比"> 成本收入比</label>
    <label><input type="checkbox" data-report-metric="定期化率" checked> 定期化率</label>
    <label><input type="checkbox" data-report-metric="存款成本率" checked> 存款成本率</label>
    <label><input type="checkbox" data-report-metric="LDR"> LDR</label>
    <label><input type="checkbox" data-report-metric="对公不良率"> 对公不良率</label>
    <label><input type="checkbox" data-report-metric="零售不良率"> 零售不良率</label>
    <label><input type="checkbox" data-report-metric="拨备覆盖率"> 拨备覆盖率</label>
    <label><input type="checkbox" data-report-metric="LCR"> LCR</label>
    <label><input type="checkbox" data-report-metric="NSFR"> NSFR</label>
    <label><input type="checkbox" data-report-chain="profitability-liability"> ROE 低 → NIM 低 → 定期化率高</label>
  </div>
</section>
```

- [ ] **Step 2: 在 report 附录区加入证据包摘要容器**

在 `#benchmarkReportAppendix` header 后加入：

```html
<div class="bm-evidence-pack-summary" id="benchmarkEvidencePackSummary"></div>
```

---

### Task 7: 实现证据包规则和报告桥接

**Files:**
- Modify: `js/56-benchmark-state-bridge.js`

- [ ] **Step 1: 新增读写和匹配函数**

在 `renderBenchmarkReportAppendix` 前加入：

```js
function uniq(arr) {
  var seen = {};
  return (arr || []).filter(function(item){
    if (!item || seen[item]) return false;
    seen[item] = true;
    return true;
  });
}

function matchReportAngles(selectedMetrics, causalChains) {
  var metrics = selectedMetrics || [];
  var chains = causalChains || [];
  var angles = [];
  var sections = [];
  if (metrics.some(function(m){ return ["ROE", "NIM", "成本收入比"].indexOf(m) >= 0; })) {
    angles.push("盈利能力分析");
    sections.push("经营总览", "盈利能力");
  }
  if (metrics.some(function(m){ return ["定期化率", "存款成本率", "LDR"].indexOf(m) >= 0; })) {
    angles.push("负债结构与息差压力");
    sections.push("负债结构", "盈利能力");
  }
  if (metrics.some(function(m){ return ["对公不良率", "零售不良率", "拨备覆盖率"].indexOf(m) >= 0; })) {
    angles.push("资产质量与风险抵补");
    sections.push("资产质量", "风险提示");
  }
  if (metrics.some(function(m){ return ["LCR", "NSFR", "流动性缺口"].indexOf(m) >= 0; })) {
    angles.push("流动性与安全边际");
    sections.push("流动性", "风险提示");
  }
  if (chains.length) {
    angles.push("关键问题追溯");
    sections.push("管理建议");
  }
  return {
    reportAngles: uniq(angles),
    reportSections: uniq(sections),
  };
}

function buildBenchmarkEvidencePack() {
  var metrics = [];
  var chains = [];
  document.querySelectorAll("[data-report-metric]:checked").forEach(function(input){
    metrics.push(input.getAttribute("data-report-metric"));
  });
  document.querySelectorAll("[data-report-chain]:checked").forEach(function(input){
    chains.push(input.getAttribute("data-report-chain"));
  });
  var matched = matchReportAngles(metrics, chains);
  var pack = {
    bankId: (typeof state !== "undefined" && state.targetBank) || "",
    peerGroupId: (typeof state !== "undefined" && state.peerGroup) || "",
    year: (typeof state !== "undefined" && state.year) || "",
    audience: getStoredBenchmarkAudience(),
    selectedDomains: [],
    selectedMetrics: metrics,
    causalChains: chains,
    storyCards: [],
    reportAngles: matched.reportAngles,
    reportSections: matched.reportSections,
    updatedAt: new Date().toISOString(),
  };
  return pack;
}

function getStoredBenchmarkAudience() {
  try {
    if (typeof localStorage !== "undefined") {
      return localStorage.getItem("benchmarkiq.audience") || localStorage.getItem("benchmarkiq.entryRole") || "";
    }
  } catch (e) { /* silent */ }
  return "";
}

function saveBenchmarkEvidencePack(pack) {
  try {
    if (typeof localStorage !== "undefined") {
      localStorage.setItem("benchmarkiq.evidencePack", JSON.stringify(pack || {}));
    }
  } catch (e) { /* silent */ }
  window.__benchmarkEvidencePack = pack || {};
  return pack;
}

function getBenchmarkEvidencePack() {
  if (window.__benchmarkEvidencePack) return window.__benchmarkEvidencePack;
  try {
    if (typeof localStorage !== "undefined") {
      var raw = localStorage.getItem("benchmarkiq.evidencePack");
      if (raw) return JSON.parse(raw);
    }
  } catch (e) { /* silent */ }
  return null;
}
```

- [ ] **Step 2: 新增报告摘要渲染**

```js
function renderBenchmarkEvidencePackSummary() {
  var el = document.getElementById("benchmarkEvidencePackSummary");
  if (!el) return;
  var pack = getBenchmarkEvidencePack();
  if (!pack || !(pack.selectedMetrics || []).length) {
    el.innerHTML = '<div class="bm-appendix-empty">'
      + '<p>请先完成数据对标，并选择要进入报告的指标、故事线或因果链。</p>'
      + '<p><a href="#page/benchmark" data-page-link="benchmark">返回数据对标选择入报告数据</a></p>'
      + '</div>';
    return;
  }
  var angleHtml = (pack.reportAngles || []).map(function(a){
    return '<span class="bm-report-angle-chip">'+escapeXml(a)+'</span>';
  }).join("");
  el.innerHTML = '<section class="bm-evidence-pack-card">'
    + '<header><span>报告证据包</span><b>已选择 '+(pack.selectedMetrics || []).length+' 个指标</b></header>'
    + '<p>报告将优先围绕以下分析角度展开：</p>'
    + '<div class="bm-report-angle-row">'+angleHtml+'</div>'
    + '<p class="bm-evidence-pack-sections">建议章节：'+escapeXml((pack.reportSections || []).join("、") || "未匹配")+'</p>'
    + '</section>';
}
```

- [ ] **Step 3: 绑定按钮事件**

在已有 document click 代理中，移除按钮事件之前加入：

```js
var buildPackBtn = e.target.closest("#bmOpenReportEvidenceSelector");
if (buildPackBtn) {
  e.preventDefault();
  var pack = saveBenchmarkEvidencePack(buildBenchmarkEvidencePack());
  renderBenchmarkEvidencePackSummary();
  if (typeof setPortalPage === "function") setPortalPage("report");
  return;
}
```

- [ ] **Step 4: 报告页 observer 同步渲染摘要**

在切到 report 时同时调用：

```js
renderBenchmarkEvidencePackSummary();
```

- [ ] **Step 5: 暴露函数供测试和调试**

```js
window.buildBenchmarkEvidencePack = buildBenchmarkEvidencePack;
window.matchReportAngles = matchReportAngles;
window.saveBenchmarkEvidencePack = saveBenchmarkEvidencePack;
window.getBenchmarkEvidencePack = getBenchmarkEvidencePack;
window.renderBenchmarkEvidencePackSummary = renderBenchmarkEvidencePackSummary;
```

---

### Task 8: 增加样式

**Files:**
- Modify: `styles/benchmark.css`

- [ ] **Step 1: 加入入报告选择面板样式**

```css
.bm-report-selector {
  grid-column: 1 / -1;
  border: 1px solid var(--line);
  border-radius: 8px;
  background: #fff;
  padding: 16px;
  margin-bottom: 14px;
}

.bm-report-selector-head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
  margin-bottom: 12px;
}

.bm-report-selector-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
  gap: 8px;
}

.bm-report-selector-grid label {
  display: flex;
  gap: 8px;
  align-items: center;
  min-height: 36px;
  border: 1px solid var(--line);
  border-radius: 6px;
  padding: 8px 10px;
  background: #f8fafc;
  font-size: 13px;
}
```

- [ ] **Step 2: 加入证据包摘要样式**

```css
.bm-evidence-pack-summary {
  margin: 12px 0 16px;
}

.bm-evidence-pack-card {
  border: 1px solid var(--line);
  border-radius: 8px;
  background: #f8fafc;
  padding: 14px;
}

.bm-evidence-pack-card header {
  display: flex;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 8px;
}

.bm-report-angle-row {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin: 8px 0;
}

.bm-report-angle-chip {
  border: 1px solid #b7c7db;
  border-radius: 999px;
  background: #fff;
  color: #24415f;
  padding: 4px 9px;
  font-size: 12px;
}

.bm-evidence-pack-sections {
  color: var(--muted);
  font-size: 13px;
}
```

---

### Task 9: 验证并提交

**Files:**
- Test all modified files

- [ ] **Step 1: 运行语法检查**

Run:

```bash
node --check js/42-portal-router.js
node --check js/56-benchmark-state-bridge.js
```

Expected: no output, exit 0。

- [ ] **Step 2: 运行契约测试**

Run:

```bash
node tests/entry_ia_redesign_contract.test.js
node tests/portal_ia_v10_router_canonical.test.js
node tests/data_first_report_evidence_flow_contract.test.js
```

Expected:

```text
entry-ia-data-first-contract-ok
portal-ia-v10-router-canonical-ok
data-first-report-evidence-flow-contract-ok
```

- [ ] **Step 3: 检查暂存区只包含本次文件**

Run: `git status --short`

Expected: 本次相关文件包括：

```text
M index.html
M js/42-portal-router.js
M js/56-benchmark-state-bridge.js
M styles/benchmark.css
M tests/entry_ia_redesign_contract.test.js
M tests/portal_ia_v10_router_canonical.test.js
A tests/data_first_report_evidence_flow_contract.test.js
```

工作区可能还有用户既有改动，不要纳入本次提交。

- [ ] **Step 4: 提交实现**

```bash
git add index.html js/42-portal-router.js js/56-benchmark-state-bridge.js styles/benchmark.css tests/entry_ia_redesign_contract.test.js tests/portal_ia_v10_router_canonical.test.js tests/data_first_report_evidence_flow_contract.test.js
git commit -m "feat: add data-first report evidence flow"
```

- [ ] **Step 5: 推送分支**

```bash
git push
```

Expected: branch `codex/benchmark-causal-specs` pushed to GitHub。

