# 入口信息架构重构实施计划

> **给 agentic workers 的要求：** 执行本计划时使用 `superpowers:subagent-driven-development`（推荐）或 `superpowers:executing-plans`，逐项执行并更新 checkbox 状态。

**目标：** 在 Launch 页建立“数据入口 / 报告入口 / 角色入口”的第一屏决策层，让用户先选择工作流，再进入对应分析页面。

**架构：** 复用现有 `js/42-portal-router.js` 和 `data-page-link` 路由约定，不新增路由状态。新增静态入口 markup、作用域 CSS 和契约测试。

**技术栈：** 静态 HTML、CSS、原生 JavaScript router、Node `assert` 契约测试。

---

### Task 1：入口 IA 契约测试

**文件：**

- 新建：`tests/entry_ia_redesign_contract.test.js`

- [x] **Step 1：先写失败测试**

测试内容：

```js
const fs = require("fs");
const assert = require("assert/strict");

const html = fs.readFileSync("index.html", "utf8");
const css = fs.readFileSync("styles/app.css", "utf8");
const router = fs.readFileSync("js/42-portal-router.js", "utf8");

[
  'id="entryDecisionPanel"',
  'class="entry-workflow-grid"',
  'data-entry-route="data"',
  'data-entry-route="report"',
  'class="entry-role-grid"',
  'data-entry-role="board"',
  'data-entry-role="cfo"',
  'data-entry-role="cro"',
  'data-entry-role="expert"',
].forEach((needle) => assert(html.includes(needle), `missing launch entry marker: ${needle}`));

[
  'data-page-link="benchmark"',
  'data-page-link="report"',
  'data-page-link="answer"',
  'data-page-link="topics"',
  'data-page-link="data"',
].forEach((needle) => assert(html.includes(needle), `entry cards must use router link ${needle}`));

[
  ".entry-decision-panel",
  ".entry-workflow-grid",
  ".entry-route-card",
  ".entry-role-grid",
  ".entry-role-card",
].forEach((needle) => assert(css.includes(needle), `missing entry CSS hook: ${needle}`));

[
  'launch: "入口工作台"',
  'answer: "董事会入口"',
  'topics: "专题与风控"',
  'report: "报告入口"',
  'benchmark: "数据入口"',
].forEach((needle) => assert(router.includes(needle), `router labels must include ${needle}`));

console.log("entry-ia-redesign-contract-ok");
```

- [x] **Step 2：运行测试并确认失败原因正确**

命令：

```bash
node tests/entry_ia_redesign_contract.test.js
```

实际结果：失败在缺少 `entryDecisionPanel`，说明测试命中预期缺口。

### Task 2：实现入口面板与路由文案

**文件：**

- 修改：`index.html`
- 修改：`styles/app.css`
- 修改：`js/42-portal-router.js`

- [x] **Step 1：新增 Launch 页入口面板**

在 `#step1Content` 顶部、`launchDisclosureToggle` 之前插入 `entryDecisionPanel`，包含：

- 两个主工作流卡片：`数据入口`、`报告入口`
- 四个角色卡片：`董事会 / 行长室`、`CFO / 财务`、`CRO / 风控`、`研究 / 专家`

- [x] **Step 2：新增入口面板样式**

在 `styles/app.css` 中新增：

- `.entry-decision-panel`
- `.entry-workflow-grid`
- `.entry-route-card`
- `.entry-role-grid`
- `.entry-role-card`

样式要求：卡片扁平、边框清楚、6px 圆角、响应式网格、无装饰性背景。

- [x] **Step 3：更新路由标签与摘要**

在 `js/42-portal-router.js` 中更新：

- `launch`：入口工作台
- `answer`：董事会入口
- `topics`：专题与风控
- `report`：报告入口
- `benchmark`：数据入口

### Task 3：验证

**文件：**

- 测试：`tests/entry_ia_redesign_contract.test.js`
- 测试：`tests/portal_ia_v10_router_canonical.test.js`

- [x] **Step 1：运行新入口契约测试**

命令：

```bash
node tests/entry_ia_redesign_contract.test.js
```

实际结果：通过，输出 `entry-ia-redesign-contract-ok`。

- [x] **Step 2：运行路由语法和既有 router 契约**

命令：

```bash
node --check js/42-portal-router.js
node tests/portal_ia_v10_router_canonical.test.js
```

实际结果：通过。既有 router 契约已同步到包含 `benchmark` 的 7 页模型。

- [x] **Step 3：运行相关页面减载契约**

命令：

```bash
node tests/portal_launch_decongestion_contract.test.js
node --check js/19-product-workspace.js
node --check js/10-bootstrap.js
```

实际结果：通过。

### Task 4：角色入口意图持久化

**文件：**

- 修改：`index.html`
- 修改：`js/42-portal-router.js`
- 修改：`tests/entry_ia_redesign_contract.test.js`

- [x] **Step 1：先扩展失败测试**

在 `tests/entry_ia_redesign_contract.test.js` 中补充以下契约：

- 四个角色入口必须有 `data-entry-audience`
- router 必须定义 `applyEntryIntent`
- router 必须写入 `benchmarkiq.entryRole`
- router 必须写入 `benchmarkiq.audience`
- router 必须在 `body` 上设置 `data-entry-role`

命令：

```bash
node tests/entry_ia_redesign_contract.test.js
```

实际结果：失败在缺少 `data-entry-audience="board"`，说明测试命中预期缺口。

- [x] **Step 2：实现角色意图字段**

在四个角色入口按钮上增加：

- `data-entry-audience="board"`
- `data-entry-audience="cfo"`
- `data-entry-audience="cro"`
- `data-entry-audience="expert"`

- [x] **Step 3：实现 router 持久化**

在 `js/42-portal-router.js` 中新增 `applyEntryIntent(btn)`，并在 `data-page-link` 点击处理里先调用该函数，再调用 `setPortalPage(target)`。

持久化规则：

- `data-entry-role` 写入 `benchmarkiq.entryRole`
- `data-entry-audience` 写入 `benchmarkiq.audience`
- `data-entry-role` 同步到 `document.body[data-entry-role]`

- [x] **Step 4：重新运行验证**

命令：

```bash
node tests/entry_ia_redesign_contract.test.js
node --check js/42-portal-router.js
node tests/portal_ia_v10_router_canonical.test.js
```

实际结果：通过。
