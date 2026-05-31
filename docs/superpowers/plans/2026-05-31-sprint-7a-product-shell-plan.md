# Sprint 7A Product Shell Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the v7 product shell so users move through `setup -> analysis -> report`, with low-frequency tools moved into a drawer instead of exposed as six top-level tabs.

**Architecture:** Keep the existing analysis/report engines intact and add a thin application shell around them. `state.appMode` becomes the product-level mode, while the existing `activeWorkspaceTab` remains a compatibility layer for deep views. New markup in `index.html` provides the Global Bar, Step containers, and Drawer hosts; `js/19-product-workspace.js` binds navigation and maps modes to existing tabs.

**Tech Stack:** Static HTML/CSS/vanilla JS, existing Node contract tests, existing `state` global and render pipeline.

---

## File Structure

- Modify: `js/01-state.js`
  - Add `appMode`, `drawerOpen`, and `activeDrawerTab` to global state.
- Modify: `js/19-product-workspace.js`
  - Add product-shell functions: `setAppMode`, `renderGlobalBar`, `bindGlobalBar`, `openToolDrawer`, `closeToolDrawer`, `setDrawerTab`.
  - Keep `setWorkspaceTab` as compatibility routing for existing deep content.
- Modify: `index.html`
  - Add `globalBar`.
  - Add wrapper classes/attributes for `step1Content`, `step2Content`, `step3Content`, and `toolDrawer`.
  - Reuse existing panels instead of rebuilding analysis logic.
- Modify: `styles/app.css`
  - Add v7 tokens, fixed Global Bar, app-state visibility rules, Step layout rules, Drawer rules, and responsive fallbacks.
- Create: `tests/sprint7a_product_shell_contract.test.js`
  - Contract test for required shell markup, CSS state rules, and JS state functions.
- Update if needed: `tests/sprint6_navigation_architecture.test.js`
  - Only if old assumptions about top-level tabs conflict with the v7 shell. Keep old navigation reachable through drawer/deep links.

---

### Task 1: Add Product Shell Contract Test

**Files:**
- Create: `tests/sprint7a_product_shell_contract.test.js`

- [ ] **Step 1: Write the failing test**

```js
const fs = require("fs");
const assert = require("assert/strict");

const html = fs.readFileSync("index.html", "utf8");
const css = fs.readFileSync("styles/app.css", "utf8");
const state = fs.readFileSync("js/01-state.js", "utf8");
const workspace = fs.readFileSync("js/19-product-workspace.js", "utf8");

[
  'id="globalBar"',
  'data-app-mode-target="setup"',
  'data-app-mode-target="analysis"',
  'data-app-mode-target="report"',
  'id="step1Content"',
  'id="step2Content"',
  'id="step3Content"',
  'id="toolDrawer"',
  'data-drawer-tab-target="data"',
  'data-drawer-tab-target="review"',
  'data-drawer-tab-target="project"',
  'data-drawer-tab-target="ai"'
].forEach((needle) => assert(html.includes(needle), `missing HTML shell marker: ${needle}`));

[
  "appMode",
  "drawerOpen",
  "activeDrawerTab"
].forEach((needle) => assert(state.includes(needle), `state must include ${needle}`));

[
  "function setAppMode",
  "function renderGlobalBar",
  "function bindGlobalBar",
  "function openToolDrawer",
  "function closeToolDrawer",
  "function setDrawerTab"
].forEach((needle) => assert(workspace.includes(needle), `workspace must include ${needle}`));

[
  "--global-bar-height",
  "--drawer-width",
  "body[data-app-state=\"setup\"]",
  "body[data-app-state=\"analysis\"]",
  "body[data-app-state=\"report\"]",
  ".global-bar",
  ".step-shell",
  ".tool-drawer"
].forEach((needle) => assert(css.includes(needle), `missing CSS shell marker: ${needle}`));

console.log("sprint7a-product-shell-contract-ok");
```

- [ ] **Step 2: Run test to verify it fails**

Run:

```bash
node tests/sprint7a_product_shell_contract.test.js
```

Expected: FAIL with `missing HTML shell marker: id="globalBar"`.

- [ ] **Step 3: Commit the failing contract test**

```bash
git add tests/sprint7a_product_shell_contract.test.js
git commit -m "Add Sprint 7A product shell contract"
```

---

### Task 2: Add App Mode State

**Files:**
- Modify: `js/01-state.js`
- Modify: `js/19-product-workspace.js`
- Test: `tests/sprint7a_product_shell_contract.test.js`

- [ ] **Step 1: Extend state**

In `js/01-state.js`, add these fields near the existing workspace-related fields:

```js
  appMode: "setup",
  drawerOpen: false,
  activeDrawerTab: "data",
```

- [ ] **Step 2: Add app mode functions**

In `js/19-product-workspace.js`, near the workspace tab helpers, add:

```js
function appModeForWorkspaceTab(tab = activeWorkspaceTab) {
  if (tab === "report") return "report";
  if (state?.confirmed) return "analysis";
  return "setup";
}

function setAppMode(mode = state?.appMode || "setup", options = {}) {
  const allowed = ["setup", "analysis", "report"];
  const nextMode = allowed.includes(mode) ? mode : "setup";
  state.appMode = nextMode;
  document.body.dataset.appState = nextMode;
  document.querySelectorAll("[data-app-mode-target]").forEach((button) => {
    const isActive = button.dataset.appModeTarget === nextMode;
    button.classList.toggle("is-active", isActive);
    button.setAttribute("aria-current", isActive ? "step" : "false");
    if (!state.confirmed && button.dataset.appModeTarget !== "setup") {
      button.setAttribute("aria-disabled", "true");
    } else {
      button.removeAttribute("aria-disabled");
    }
  });
  if (!options.skipRouting) {
    if (nextMode === "report") setWorkspaceTab("report");
    if (nextMode === "analysis" && activeWorkspaceTab === "report") setWorkspaceTab("overview");
  }
  renderGlobalBar();
}
```

- [ ] **Step 3: Wire app mode from workspace tabs**

At the end of `setWorkspaceTab()`, after existing render calls, add:

```js
  const nextMode = appModeForWorkspaceTab(tab);
  if (state.appMode !== nextMode) setAppMode(nextMode, { skipRouting: true });
  else renderGlobalBar();
```

- [ ] **Step 4: Run the contract test**

Run:

```bash
node tests/sprint7a_product_shell_contract.test.js
```

Expected: still FAIL because HTML/CSS shell markers are not added yet, but JS/state assertions should pass.

- [ ] **Step 5: Run syntax checks**

Run:

```bash
node --check js/01-state.js
node --check js/19-product-workspace.js
```

Expected: both commands exit 0.

- [ ] **Step 6: Commit**

```bash
git add js/01-state.js js/19-product-workspace.js
git commit -m "Add app mode state for product shell"
```

---

### Task 3: Add Global Bar Markup and Binding

**Files:**
- Modify: `index.html`
- Modify: `js/19-product-workspace.js`
- Test: `tests/sprint7a_product_shell_contract.test.js`

- [ ] **Step 1: Add Global Bar after `<body>`**

Insert immediately after `<body>`:

```html
  <header class="global-bar" id="globalBar" aria-label="BenchmarkIQ 全局导航">
    <button class="global-brand" id="globalBrandHome" type="button" data-app-mode-target="setup" aria-label="返回设定口径">BenchmarkIQ</button>
    <div class="global-context">
      <span id="globalBankContext">待选择银行</span>
      <b id="globalVqaSignal">确认口径后生成诊断</b>
    </div>
    <nav class="global-steps" aria-label="三步工作流">
      <button type="button" data-app-mode-target="setup"><span>1</span>设定口径</button>
      <button type="button" data-app-mode-target="analysis"><span>2</span>看结论</button>
      <button type="button" data-app-mode-target="report"><span>3</span>出报告</button>
    </nav>
    <div class="global-actions">
      <button class="global-tool-toggle" id="openToolDrawer" type="button" aria-controls="toolDrawer" aria-expanded="false">工具箱</button>
      <button class="global-export-toggle" id="globalExportToggle" type="button">导出</button>
    </div>
  </header>
```

- [ ] **Step 2: Add render and binding functions**

In `js/19-product-workspace.js`, add:

```js
function renderGlobalBar() {
  const bank = document.getElementById("globalBankContext");
  const signal = document.getElementById("globalVqaSignal");
  const row = typeof targetRecord === "function" ? targetRecord() : null;
  const diagnosis = typeof commandCenterDiagnosis === "function" ? commandCenterDiagnosis() : null;
  if (bank) {
    bank.textContent = state?.confirmed && row
      ? `${displayBankName(row.bank)} · ${state.year || ""}`
      : "待选择银行";
  }
  if (signal) {
    signal.textContent = state?.confirmed && diagnosis
      ? `VQA ${diagnosis.score} · ${diagnosis.signal || "待判断"}`
      : "确认口径后生成诊断";
  }
  document.querySelectorAll("[data-app-mode-target]").forEach((button) => {
    const isActive = button.dataset.appModeTarget === state.appMode;
    button.classList.toggle("is-active", isActive);
    button.setAttribute("aria-current", isActive ? "step" : "false");
  });
}

function bindGlobalBar() {
  document.querySelectorAll("[data-app-mode-target]").forEach((button) => {
    if (button.dataset.appModeBound) return;
    button.dataset.appModeBound = "1";
    button.addEventListener("click", () => {
      const mode = button.dataset.appModeTarget;
      if (!state.confirmed && mode !== "setup") return;
      setAppMode(mode);
    });
  });
  document.getElementById("globalExportToggle")?.addEventListener("click", () => {
    document.getElementById("clientExportToggle")?.click();
  });
  document.getElementById("openToolDrawer")?.addEventListener("click", () => openToolDrawer("data"));
}
```

- [ ] **Step 3: Call binding during init**

In `initProductWorkspace()`, before `setWorkspaceTab("report")`, add:

```js
  bindGlobalBar();
  setAppMode(state.confirmed ? "analysis" : "setup", { skipRouting: true });
```

Then change the existing default routing so it no longer forces the initial view to report:

```js
  state.activeWorkspaceTab = state.confirmed ? "overview" : "overview";
  setWorkspaceTab(state.activeWorkspaceTab);
```

- [ ] **Step 4: Run tests**

Run:

```bash
node tests/sprint7a_product_shell_contract.test.js
node tests/report_first_layout_contract.test.js
```

Expected: product shell test still fails only on missing CSS/drawer/step markers if those are not yet added; report-first contract remains PASS.

- [ ] **Step 5: Commit**

```bash
git add index.html js/19-product-workspace.js
git commit -m "Add global bar shell navigation"
```

---

### Task 4: Add Step Containers and Drawer Markup

**Files:**
- Modify: `index.html`
- Test: `tests/sprint7a_product_shell_contract.test.js`

- [ ] **Step 1: Mark existing setup area**

Wrap or mark the current setup area so the contract can find Step 1:

```html
    <section class="workspace step-shell step1-content" id="step1Content" data-step-shell="setup" aria-label="设定口径">
```

If the existing `<section class="workspace">` cannot be replaced cleanly in one pass, add `id="step1Content"` and `data-step-shell="setup"` to the current `.control-surface` as the first implementation step. Later Sprint 7A-2 can fully restructure it.

- [ ] **Step 2: Add Step 2 shell before current workspace tabs**

Insert before `workspaceTabs`:

```html
      <section class="step-shell step2-content analysis-content" id="step2Content" data-step-shell="analysis" aria-label="诊断结论">
        <section class="step-focus-section" id="step2SummarySection" aria-label="30秒总结">
          <span>Step 2 · 30 秒诊断</span>
          <h2>确认口径后，这里显示一句总答案、VQA 信号和三个董事会讨论问题</h2>
          <p>本区域将在 Sprint 7B 合并 Client Brief、President Summary 和 Client Command Center。</p>
        </section>
      </section>
```

- [ ] **Step 3: Mark report workspace as Step 3**

Add `step-shell step3-content` and `data-step-shell="report"` to `reportFirstWorkspace`:

```html
      <section class="report-first-workspace step-shell step3-content analysis-content" id="reportFirstWorkspace" data-step-shell="report" data-workspace-tab="report" aria-label="正式报告工作台">
```

- [ ] **Step 4: Add tool drawer near end of main app**

Add before `</main>`:

```html
    <aside class="tool-drawer" id="toolDrawer" aria-label="辅助工具箱" aria-hidden="true">
      <div class="tool-drawer-head">
        <div>
          <span>工具箱</span>
          <b>数据、复核、项目和 AI 辅助</b>
        </div>
        <button type="button" id="closeToolDrawer" aria-label="关闭工具箱">关闭</button>
      </div>
      <div class="tool-drawer-tabs" role="tablist" aria-label="工具箱分类">
        <button type="button" data-drawer-tab-target="data">数据</button>
        <button type="button" data-drawer-tab-target="review">复核</button>
        <button type="button" data-drawer-tab-target="project">项目</button>
        <button type="button" data-drawer-tab-target="ai">AI</button>
      </div>
      <div class="tool-drawer-panel" id="toolDrawerPanel">选择一个工具分类后显示对应入口。</div>
    </aside>
```

- [ ] **Step 5: Run contract test**

Run:

```bash
node tests/sprint7a_product_shell_contract.test.js
```

Expected: HTML assertions pass; CSS assertions may still fail.

- [ ] **Step 6: Commit**

```bash
git add index.html
git commit -m "Add step shell and drawer markup"
```

---

### Task 5: Add CSS for Product Shell

**Files:**
- Modify: `styles/app.css`
- Test: `tests/sprint7a_product_shell_contract.test.js`

- [ ] **Step 1: Extend tokens**

Add to `:root`:

```css
      --global-bar-height: 48px;
      --drawer-width: 480px;
      --section-gap: 64px;
      --step1-max: 720px;
      --report-max: 800px;
      --font-hero: 28px;
      --font-section: 20px;
      --font-body: 15px;
      --font-small: 13px;
      --font-label: 11px;
      --font-kpi: 36px;
      --z-global-bar: 200;
      --z-drawer: 150;
      --duration-normal: 300ms;
```

- [ ] **Step 2: Add Global Bar CSS**

Add near navigation styles:

```css
    .global-bar {
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      z-index: var(--z-global-bar);
      display: grid;
      grid-template-columns: auto minmax(220px, 1fr) auto auto;
      align-items: center;
      gap: var(--sp-3);
      height: var(--global-bar-height);
      padding: 0 var(--sp-4);
      background: var(--navy);
      color: #fff;
      box-shadow: 0 8px 24px rgba(6, 27, 58, .18);
    }
```

- [ ] **Step 3: Add app-state visibility rules**

Add:

```css
    body {
      padding-top: var(--global-bar-height);
    }

    body[data-app-state="setup"] .step2-content,
    body[data-app-state="setup"] .step3-content {
      display: none !important;
    }

    body[data-app-state="analysis"] .step3-content {
      display: none !important;
    }

    body[data-app-state="report"] .step2-content {
      display: none !important;
    }
```

Do not hide `step1Content` entirely in `analysis` until Sprint 7A-2 has moved setup controls safely; instead collapse the existing setup content using current `body.analysis-ready:not(.setup-expanded)` rules.

- [ ] **Step 4: Add Step and Drawer CSS**

Add:

```css
    .step-shell {
      max-width: var(--content-max);
      margin: 0 auto;
    }

    .step-focus-section {
      display: grid;
      gap: var(--sp-3);
      min-height: 42vh;
      padding: var(--sp-5);
      border: 1px solid var(--line);
      border-top: 5px solid var(--blue);
      background: #fff;
    }

    .tool-drawer {
      position: fixed;
      top: var(--global-bar-height);
      right: 0;
      bottom: 0;
      z-index: var(--z-drawer);
      width: min(var(--drawer-width), 100vw);
      transform: translateX(100%);
      transition: transform var(--duration-normal) ease;
      border-left: 1px solid var(--line);
      background: #fff;
      box-shadow: -18px 0 42px rgba(6, 27, 58, .14);
    }

    body.drawer-open .tool-drawer {
      transform: translateX(0);
    }
```

- [ ] **Step 5: Run tests**

Run:

```bash
node tests/sprint7a_product_shell_contract.test.js
git diff --check
```

Expected: product shell contract PASS; diff check exits 0.

- [ ] **Step 6: Commit**

```bash
git add styles/app.css
git commit -m "Style Sprint 7A product shell"
```

---

### Task 6: Implement Drawer Behavior

**Files:**
- Modify: `js/19-product-workspace.js`
- Test: `tests/sprint7a_product_shell_contract.test.js`

- [ ] **Step 1: Add drawer helpers**

Add:

```js
function drawerContent(tab = state.activeDrawerTab || "data") {
  const map = {
    data: { title: "数据工作台", text: "打开指标探索器、字段覆盖、口径说明和底表导出。", target: "dataCoverageSection", workspaceTab: "data" },
    review: { title: "交付复核", text: "检查导出页序、口径风险、PRD 覆盖和 AI 写稿治理。", target: "boardReviewPanel", workspaceTab: "review" },
    project: { title: "项目管理", text: "管理项目保存、对标组治理、版本记录和导出留痕。", target: "projectFlow", workspaceTab: "governance" },
    ai: { title: "AI 辅助", text: "查看叙事生成、CEAM 结构和后续云端 AI 接入口。", target: "aiGovernancePanel", workspaceTab: "governance" }
  };
  return map[tab] || map.data;
}

function setDrawerTab(tab = state.activeDrawerTab || "data") {
  state.activeDrawerTab = tab;
  document.querySelectorAll("[data-drawer-tab-target]").forEach((button) => {
    button.classList.toggle("is-active", button.dataset.drawerTabTarget === tab);
  });
  const content = drawerContent(tab);
  const host = document.getElementById("toolDrawerPanel");
  if (host) {
    host.innerHTML = `
      <div class="tool-drawer-card">
        <span>${content.title}</span>
        <p>${content.text}</p>
        <button type="button" data-drawer-jump="${content.target}" data-drawer-workspace="${content.workspaceTab}">进入</button>
      </div>`;
  }
}

function openToolDrawer(tab = state.activeDrawerTab || "data") {
  state.drawerOpen = true;
  document.body.classList.add("drawer-open");
  const drawer = document.getElementById("toolDrawer");
  drawer?.setAttribute("aria-hidden", "false");
  document.getElementById("openToolDrawer")?.setAttribute("aria-expanded", "true");
  setDrawerTab(tab);
}

function closeToolDrawer() {
  state.drawerOpen = false;
  document.body.classList.remove("drawer-open");
  const drawer = document.getElementById("toolDrawer");
  drawer?.setAttribute("aria-hidden", "true");
  document.getElementById("openToolDrawer")?.setAttribute("aria-expanded", "false");
}
```

- [ ] **Step 2: Bind drawer tabs and jumps**

In `bindGlobalBar()`, add:

```js
  document.getElementById("closeToolDrawer")?.addEventListener("click", closeToolDrawer);
  document.querySelectorAll("[data-drawer-tab-target]").forEach((button) => {
    if (button.dataset.drawerBound) return;
    button.dataset.drawerBound = "1";
    button.addEventListener("click", () => setDrawerTab(button.dataset.drawerTabTarget));
  });
  document.getElementById("toolDrawerPanel")?.addEventListener("click", (event) => {
    const button = event.target.closest("[data-drawer-jump]");
    if (!button) return;
    const tab = button.dataset.drawerWorkspace;
    const target = button.dataset.drawerJump;
    if (tab) setWorkspaceTab(tab);
    setAppMode(tab === "report" ? "report" : "analysis");
    closeToolDrawer();
    setTimeout(() => document.getElementById(target)?.scrollIntoView({ behavior: "smooth", block: "start" }), 50);
  });
```

- [ ] **Step 3: Run tests**

Run:

```bash
node tests/sprint7a_product_shell_contract.test.js
node tests/sprint6_navigation_architecture.test.js
node --check js/19-product-workspace.js
```

Expected: all PASS.

- [ ] **Step 4: Commit**

```bash
git add js/19-product-workspace.js
git commit -m "Add product shell drawer behavior"
```

---

### Task 7: Verification and Handoff

**Files:**
- No code changes unless verification reveals a specific issue.

- [ ] **Step 1: Run focused contracts**

Run:

```bash
node tests/sprint7a_product_shell_contract.test.js
node tests/collapsible_layout_controls_contract.test.js
node tests/report_first_layout_contract.test.js
node tests/sprint6_navigation_architecture.test.js
```

Expected: all print their `*-ok` messages.

- [ ] **Step 2: Run JS syntax checks**

Run:

```bash
for f in js/*.js; do node --check "$f" || exit 1; done
```

Expected: exits 0 with no output.

- [ ] **Step 3: Run full contract suite**

Run:

```bash
for f in tests/*.test.js; do node "$f" || exit 1; done
```

Expected: every test prints an `*-ok` line and command exits 0.

- [ ] **Step 4: Run whitespace check**

Run:

```bash
git diff --check
```

Expected: exits 0 with no output.

- [ ] **Step 5: Browser QA**

If the in-app browser can access the local server, open the preview and verify:

- Initial page shows Global Bar and setup mode.
- Confirming analysis moves into analysis mode.
- Step buttons route between setup, analysis, and report.
- Tool drawer opens and closes.
- Existing report workspace still appears in report mode.

If the browser is blocked by local URL policy, record that limitation in the final handoff.

- [ ] **Step 6: Final commit**

If any verification fixes were needed:

```bash
git add index.html styles/app.css js/01-state.js js/19-product-workspace.js tests/sprint7a_product_shell_contract.test.js
git commit -m "Verify Sprint 7A product shell"
```

If no fixes were needed, do not create an empty commit.
