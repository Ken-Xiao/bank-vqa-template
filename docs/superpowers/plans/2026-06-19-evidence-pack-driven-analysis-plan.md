# Evidence-Pack Driven Analysis Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 将数据对标页生成的证据包变成结论摘要、证据地图、专题归因的唯一输入，并补上重新选择目标银行的回退路径。

**Architecture:** 新增一个独立的证据包模型层，负责生成、确认、置为过期和读取证据包；数据对标页只负责推荐和确认，后续三页只消费已确认的 `selectedIssues`。现有 `js/55-benchmark-page.js` 和 `js/19-product-workspace.js` 不做大拆分，只通过小型适配层接入，避免破坏已有对标页和报告页。

**Tech Stack:** 原生 JavaScript、DOM 渲染、`localStorage`、现有 contract tests（Node + assert）、现有 HTML/CSS 结构。

---

## 文件结构与职责

- 新建 `js/57-evidence-pack-model.js`  
  负责证据包数据模型、推荐问题生成、确认、过期、读取、保存和页面模型转换。

- 修改 `index.html`  
  加载 `js/57-evidence-pack-model.js`；在数据对标页加入“重新选择目标银行”入口、重选抽屉和证据包托盘容器。

- 修改 `styles/benchmark.css`  
  增加顶部重选栏、证据包托盘、证据包状态条、三页空状态的样式。

- 修改 `js/55-benchmark-page.js`  
  在对标页渲染时调用证据包推荐与托盘渲染；目标银行、年份、对标组变化时把已确认证据包置为 `stale`；“下一步进入诊断”前要求证据包 confirmed。

- 修改 `js/56-benchmark-state-bridge.js`  
  在证据包确认后同步目标行、对标组、年份，并刷新后续页面。

- 修改 `js/19-product-workspace.js`  
  将 `renderStep2Diagnosis()` 的核心页面内容改为从证据包页面模型生成；没有 confirmed 证据包时显示返回数据对标空状态。

- 新建 `tests/evidence_pack_model_contract.test.js`  
  验证证据包结构、状态切换、推荐问题、确认和 stale 逻辑。

- 新建 `tests/evidence_pack_driven_pages_contract.test.js`  
  验证结论摘要、证据地图、专题归因只读取 `selectedIssues`，并包含证据编号、证据强度和因果链。

- 更新 `tests/benchmark_downstream_state_sync_contract.test.js`  
  验证从数据对标进入后续页面前会确认或校验证据包。

- 更新 `tests/portal_confirm_navigation_contract.test.js`  
  验证参数页旧入口仍是轻量跳转，不触发报告生成。

---

### Task 1: 新建证据包模型层

**Files:**
- Create: `js/57-evidence-pack-model.js`
- Test: `tests/evidence_pack_model_contract.test.js`

- [ ] **Step 1: 写失败测试，定义证据包模型契约**

Create `tests/evidence_pack_model_contract.test.js`:

```js
const fs = require("fs");
const vm = require("vm");
const assert = require("assert/strict");

const src = fs.readFileSync("js/57-evidence-pack-model.js", "utf8");

const context = {
  window: {},
  localStorage: {
    data: {},
    setItem(key, value) { this.data[key] = value; },
    getItem(key) { return this.data[key] || null; },
    removeItem(key) { delete this.data[key]; },
  },
  state: {
    target: "苏州农商行",
    peers: ["常熟农商行", "瑞丰农商行", "上海农商行"],
    year: 2025,
  },
  targetRecord() {
    return { bank: "苏州农商行", year: 2025, roe: 8.2, nim: 1.55, costIncome: 35.1, npl: 1.21, pb: 0.62 };
  },
  peerRecords() {
    return [
      { bank: "常熟农商行", year: 2025, roe: 10.4, nim: 1.86, costIncome: 31.2, npl: 0.95, pb: 0.74 },
      { bank: "瑞丰农商行", year: 2025, roe: 9.8, nim: 1.76, costIncome: 32.8, npl: 1.02, pb: 0.70 },
      { bank: "上海农商行", year: 2025, roe: 9.5, nim: 1.72, costIncome: 33.0, npl: 1.04, pb: 0.69 },
    ];
  },
  avg(rows, key) {
    const vals = rows.map((r) => r[key]).filter((v) => typeof v === "number");
    return vals.reduce((a, b) => a + b, 0) / vals.length;
  },
  metricDisplayValue(key, value) {
    if (value == null || Number.isNaN(value)) return "—";
    if (key === "pb") return value.toFixed(2) + "x";
    return value.toFixed(2) + "%";
  },
  displayBankName(name) { return name; },
};

context.window = Object.assign(context.window, context);
vm.createContext(context);
vm.runInContext(src, context);

const pack = context.window.buildRecommendedEvidencePack();
assert.equal(pack.status, "draft", "recommended pack starts as draft");
assert.equal(pack.targetBank.name, "苏州农商行", "pack keeps target bank");
assert.equal(pack.year, 2025, "pack keeps year");
assert(pack.recommendedIssues.length >= 3, "pack recommends at least three issues");
assert(pack.recommendedIssues.every((issue) => issue.evidence.length > 0), "every issue has evidence");
assert(pack.recommendedIssues.every((issue) => issue.causalChain.length >= 2), "every issue has causal chain");
assert(pack.recommendedIssues.every((issue) => issue.evidence.every((ev) => ev.evidenceId && ev.metric && ev.gap && ev.strength)), "evidence fields are complete");

const selected = context.window.confirmEvidencePack(pack, [pack.recommendedIssues[0].issueId, pack.recommendedIssues[1].issueId]);
assert.equal(selected.status, "confirmed", "confirmed pack has confirmed status");
assert.equal(selected.selectedIssues.length, 2, "confirmed pack stores selected issues");
assert(context.localStorage.data["benchmarkiq.evidencePack"], "confirmed pack is persisted");

const stale = context.window.markEvidencePackStale("target-change");
assert.equal(stale.status, "stale", "stale helper marks current pack stale");
assert.equal(stale.staleReason, "target-change", "stale helper records reason");

console.log("evidence-pack-model-contract-ok");
```

- [ ] **Step 2: 运行测试确认失败**

Run:

```bash
node tests/evidence_pack_model_contract.test.js
```

Expected: FAIL，错误应为 `ENOENT` 或 `buildRecommendedEvidencePack is not a function`。

- [ ] **Step 3: 新建最小证据包模型**

Create `js/57-evidence-pack-model.js`:

```js
/* Bank VQA module: 57-evidence-pack-model.js
 * 证据包模型：从数据对标结果生成、确认、置为过期，并给后续页面提供统一输入。
 */
(function () {
  if (typeof window === "undefined") return;

  var STORAGE_KEY = "benchmarkiq.evidencePack";

  var METRIC_CONFIGS = [
    {
      key: "roe",
      metric: "ROE",
      title: "盈利能力承压",
      issueId: "profitability_pressure",
      directDriver: "NIM 与成本收入比",
      structureDriver: "负债成本、收入结构和费用刚性",
      action: "先复核息差与费用效率，再确定盈利修复抓手",
      higherIsBetter: true,
    },
    {
      key: "nim",
      metric: "NIM",
      title: "息差水平承压",
      issueId: "nim_pressure",
      directDriver: "生息资产收益率与计息负债成本",
      structureDriver: "定期化率、存款成本率和贷款收益率",
      action: "拆解负债结构与资产定价，定位息差修复空间",
      higherIsBetter: true,
    },
    {
      key: "costIncome",
      metric: "成本收入比",
      title: "成本效率压力",
      issueId: "cost_efficiency_pressure",
      directDriver: "营业收入增长和费用刚性",
      structureDriver: "网点、人力、科技投入与中收贡献",
      action: "复核费用投入产出与收入结构改善路径",
      higherIsBetter: false,
    },
    {
      key: "npl",
      metric: "不良率",
      title: "资产质量分化",
      issueId: "asset_quality_divergence",
      directDriver: "不良生成和风险确认节奏",
      structureDriver: "对公贷款结构、区域行业暴露和零售客群风险",
      action: "按贷款结构和区域风险重新排序资产质量专题",
      higherIsBetter: false,
    },
    {
      key: "pb",
      metric: "PB",
      title: "估值折价需要解释",
      issueId: "valuation_discount",
      directDriver: "ROE、资产质量和分红预期",
      structureDriver: "盈利可持续性、风险确认充分性和资本回报",
      action: "将估值折价回拆到盈利、风险和资本回报证据",
      higherIsBetter: true,
    },
  ];

  function safeAvg(rows, key) {
    if (typeof avg === "function") return avg(rows, key);
    var vals = (rows || []).map(function (row) { return row && row[key]; }).filter(function (v) { return typeof v === "number" && !Number.isNaN(v); });
    return vals.length ? vals.reduce(function (a, b) { return a + b; }, 0) / vals.length : null;
  }

  function displayMetric(key, value) {
    if (typeof metricDisplayValue === "function") return metricDisplayValue(key, value);
    if (value == null || Number.isNaN(value)) return "—";
    if (key === "pb") return Number(value).toFixed(2) + "x";
    return Number(value).toFixed(2) + "%";
  }

  function gapText(key, targetValue, peerValue) {
    if (targetValue == null || peerValue == null) return "—";
    var gap = targetValue - peerValue;
    var sign = gap > 0 ? "+" : "";
    if (key === "pb") return sign + gap.toFixed(2) + "x";
    return sign + gap.toFixed(2) + "pct";
  }

  function evidenceStrength(absGapRatio) {
    if (absGapRatio >= 0.12) return "强";
    if (absGapRatio >= 0.06) return "中";
    return "弱";
  }

  function issueConclusion(config, targetValue, peerValue) {
    var direction = config.higherIsBetter
      ? (targetValue >= peerValue ? "优于同业" : "低于同业")
      : (targetValue <= peerValue ? "优于同业" : "高于同业");
    return config.metric + " " + direction + "，需要沿着" + config.directDriver + "继续拆解。";
  }

  function buildIssue(config, row, peers, index) {
    var targetValue = row ? row[config.key] : null;
    var peerValue = safeAvg(peers, config.key);
    if (targetValue == null || peerValue == null || Number.isNaN(targetValue) || Number.isNaN(peerValue)) return null;
    var gap = targetValue - peerValue;
    var absRatio = peerValue ? Math.abs(gap / peerValue) : 0;
    var direction = gap >= 0 ? "高于同业" : "低于同业";
    var strength = evidenceStrength(absRatio);
    return {
      issueId: config.issueId,
      title: config.title,
      priority: index + 1,
      confidence: strength === "强" ? "高" : (strength === "中" ? "中" : "低"),
      primaryMetric: config.metric,
      conclusion: issueConclusion(config, targetValue, peerValue),
      evidence: [{
        evidenceId: "ev_" + config.key + "_gap",
        metric: config.metric,
        targetValue: displayMetric(config.key, targetValue),
        peerValue: displayMetric(config.key, peerValue),
        gap: gapText(config.key, targetValue, peerValue),
        direction: direction,
        strength: strength,
        source: (state && state.year ? state.year : "当前") + " 年末数据对标",
      }],
      causalChain: [
        config.metric + "与对标组形成差距",
        "直接原因指向" + config.directDriver,
        "结构原因需要复核" + config.structureDriver,
        "行动抓手是" + config.action,
      ],
      action: config.action,
      reportUse: ["结论摘要", "证据地图", "专题归因"],
    };
  }

  function packVersion() {
    var d = new Date();
    function pad(n) { return n < 10 ? "0" + n : String(n); }
    return String(d.getFullYear()) + pad(d.getMonth() + 1) + pad(d.getDate()) + "-" + pad(d.getHours()) + pad(d.getMinutes());
  }

  function readEvidencePack() {
    try {
      var raw = localStorage.getItem(STORAGE_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch (e) {
      return window.__benchmarkEvidencePack || null;
    }
  }

  function saveEvidencePack(pack) {
    window.__benchmarkEvidencePack = pack || null;
    try {
      if (pack) localStorage.setItem(STORAGE_KEY, JSON.stringify(pack));
      else localStorage.removeItem(STORAGE_KEY);
    } catch (e) { /* silent */ }
    return pack;
  }

  function buildRecommendedEvidencePack() {
    var row = typeof targetRecord === "function" ? targetRecord() : null;
    var peers = typeof peerRecords === "function" ? peerRecords() : [];
    var issues = METRIC_CONFIGS
      .map(function (config, index) { return buildIssue(config, row, peers, index); })
      .filter(Boolean)
      .sort(function (a, b) {
        var sa = a.evidence[0].strength === "强" ? 3 : (a.evidence[0].strength === "中" ? 2 : 1);
        var sb = b.evidence[0].strength === "强" ? 3 : (b.evidence[0].strength === "中" ? 2 : 1);
        return sb - sa || a.priority - b.priority;
      })
      .slice(0, 5)
      .map(function (issue, index) { issue.priority = index + 1; return issue; });
    var pack = {
      version: packVersion(),
      status: "draft",
      targetBank: {
        id: row && row.bank ? row.bank : (state && state.target) || "",
        name: row && row.bank ? row.bank : (state && state.target) || "",
        type: row && row.type ? row.type : "",
        region: row && row.region ? row.region : "",
      },
      year: state && state.year ? state.year : "",
      peerGroup: {
        label: "当前对标组",
        banks: state && Array.isArray(state.peers) ? state.peers.slice() : [],
        peerBasis: ["当前选择"],
      },
      recommendedIssues: issues,
      selectedIssues: issues.slice(0, 3).map(function (issue) { return issue.issueId; }),
      excludedIssues: [],
      narrativeGuardrails: {
        mustCiteEvidence: true,
        avoidGenericLanguage: true,
        maxPrimaryIssues: 3,
      },
      updatedAt: new Date().toISOString(),
    };
    return saveEvidencePack(pack);
  }

  function confirmEvidencePack(pack, selectedIssues) {
    var next = Object.assign({}, pack || readEvidencePack() || buildRecommendedEvidencePack());
    next.status = "confirmed";
    next.selectedIssues = Array.isArray(selectedIssues) && selectedIssues.length
      ? selectedIssues.slice()
      : (next.selectedIssues || []).slice(0, 3);
    next.excludedIssues = (next.recommendedIssues || [])
      .map(function (issue) { return issue.issueId; })
      .filter(function (id) { return next.selectedIssues.indexOf(id) < 0; });
    next.confirmedAt = new Date().toISOString();
    next.updatedAt = next.confirmedAt;
    return saveEvidencePack(next);
  }

  function markEvidencePackStale(reason) {
    var pack = readEvidencePack();
    if (!pack) return null;
    var next = Object.assign({}, pack, {
      status: "stale",
      staleReason: reason || "context-change",
      updatedAt: new Date().toISOString(),
    });
    return saveEvidencePack(next);
  }

  window.buildRecommendedEvidencePack = buildRecommendedEvidencePack;
  window.confirmEvidencePack = confirmEvidencePack;
  window.readEvidencePack = readEvidencePack;
  window.saveEvidencePack = saveEvidencePack;
  window.markEvidencePackStale = markEvidencePackStale;
})();
```

- [ ] **Step 4: 运行测试确认通过**

Run:

```bash
node --check js/57-evidence-pack-model.js
node tests/evidence_pack_model_contract.test.js
```

Expected:

```text
evidence-pack-model-contract-ok
```

- [ ] **Step 5: 提交 Task 1**

```bash
git add js/57-evidence-pack-model.js tests/evidence_pack_model_contract.test.js
git commit -m "feat: add evidence pack model"
```

---

### Task 2: 接入数据对标页的重选入口与证据包托盘

**Files:**
- Modify: `index.html`
- Modify: `styles/benchmark.css`
- Modify: `js/55-benchmark-page.js`
- Test: `tests/evidence_pack_model_contract.test.js`

- [ ] **Step 1: 写失败测试，验证 UI 钩子存在**

Append these assertions to `tests/evidence_pack_model_contract.test.js` after the model assertions:

```js
const html = fs.readFileSync("index.html", "utf8");
const benchmark = fs.readFileSync("js/55-benchmark-page.js", "utf8");
const css = fs.readFileSync("styles/benchmark.css", "utf8");

[
  'src="js/57-evidence-pack-model.js',
  'id="bmRestartAnalysis"',
  'id="bmRestartDrawer"',
  'id="bmEvidencePackTray"',
  'id="bmConfirmEvidencePack"',
].forEach((needle) => assert(html.includes(needle), "missing evidence pack UI hook: " + needle));

[
  "renderEvidencePackTray",
  "buildRecommendedEvidencePack",
  "confirmEvidencePack",
  "markEvidencePackStale",
].forEach((needle) => assert(benchmark.includes(needle), "benchmark page must integrate evidence pack: " + needle));

[
  ".bm-restart-bar",
  ".bm-restart-drawer",
  ".bm-evidence-pack-tray",
  ".bm-issue-card",
].forEach((needle) => assert(css.includes(needle), "missing evidence pack CSS: " + needle));
```

- [ ] **Step 2: 运行测试确认失败**

Run:

```bash
node tests/evidence_pack_model_contract.test.js
```

Expected: FAIL with `missing evidence pack UI hook`.

- [ ] **Step 3: 修改 `index.html`，加载模型并加入容器**

Add script before `js/56-benchmark-state-bridge.js`:

```html
<script src="js/57-evidence-pack-model.js?v=20260619-evidence-pack"></script>
```

Inside the data benchmark main area, near `id="bmNextBar"`, add:

```html
<div class="bm-restart-bar" id="bmRestartBar">
  <div>
    <span>当前分析对象</span>
    <b id="bmRestartContext">未选择目标银行</b>
  </div>
  <button type="button" id="bmRestartAnalysis">重新选择目标银行</button>
</div>
<aside class="bm-restart-drawer" id="bmRestartDrawer" aria-hidden="true">
  <header>
    <span>重新选择</span>
    <button type="button" id="bmRestartClose">关闭</button>
  </header>
  <p>切换目标银行后，当前已确认证据包会标记为过期。建议清空并重新生成，避免不同银行证据混用。</p>
  <button type="button" id="bmRestartKeepDraft">保留草稿并切换</button>
  <button type="button" id="bmRestartClearPack">清空证据包并重选</button>
  <button type="button" id="bmRestartCloneAnalysis">复制为新分析</button>
</aside>
<aside class="bm-evidence-pack-tray" id="bmEvidencePackTray" aria-label="证据包托盘">
  <header>
    <span>证据包</span>
    <b id="bmEvidencePackStatus">待推荐</b>
  </header>
  <div id="bmRecommendedIssues"></div>
  <div class="bm-selected-summary" id="bmSelectedIssueSummary">尚未选择证据。</div>
  <button type="button" id="bmConfirmEvidencePack">确认证据包</button>
</aside>
```

- [ ] **Step 4: 修改 `styles/benchmark.css`**

Add:

```css
.bm-restart-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  padding: 12px 14px;
  border: 1px solid #d8e0e8;
  border-radius: 8px;
  background: #fff;
  margin-bottom: 12px;
}
.bm-restart-bar span {
  display: block;
  font-size: 12px;
  color: #667789;
}
.bm-restart-bar b {
  color: #17324d;
}
.bm-restart-bar button,
.bm-restart-drawer button,
.bm-evidence-pack-tray button {
  border: 1px solid #9eb1c3;
  background: #fff;
  color: #17324d;
  border-radius: 6px;
  padding: 8px 10px;
  cursor: pointer;
}
.bm-restart-drawer {
  position: fixed;
  right: 24px;
  top: 84px;
  width: min(360px, calc(100vw - 48px));
  z-index: 120;
  background: #fff;
  border: 1px solid #d8e0e8;
  border-radius: 8px;
  box-shadow: 0 18px 50px rgba(15, 26, 36, 0.16);
  padding: 16px;
}
.bm-restart-drawer[aria-hidden="true"] {
  display: none;
}
.bm-restart-drawer header,
.bm-evidence-pack-tray header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 12px;
  margin-bottom: 12px;
}
.bm-evidence-pack-tray {
  border: 1px solid #d8e0e8;
  border-radius: 8px;
  background: #fff;
  padding: 14px;
  margin: 0 0 16px;
}
.bm-issue-card {
  border: 1px solid #e2e8ef;
  border-radius: 8px;
  padding: 12px;
  margin: 10px 0;
  background: #fbfcfd;
}
.bm-issue-card.is-selected {
  border-color: #1a3a5c;
  background: #f4f8fb;
}
.bm-issue-card h4 {
  margin: 0 0 6px;
  font-size: 14px;
  color: #17324d;
}
.bm-issue-card p {
  margin: 4px 0;
  font-size: 12px;
  color: #546679;
  line-height: 1.5;
}
.bm-selected-summary {
  font-size: 12px;
  color: #546679;
  border-top: 1px solid #e2e8ef;
  padding-top: 10px;
  margin-top: 12px;
}
```

- [ ] **Step 5: 修改 `js/55-benchmark-page.js`，渲染托盘与重选动作**

Add helper functions near `renderNextBar()`:

```js
  function renderEvidencePackTray() {
    var tray = document.getElementById("bmEvidencePackTray");
    if (!tray || typeof window.buildRecommendedEvidencePack !== "function") return;
    var pack = typeof window.readEvidencePack === "function" ? window.readEvidencePack() : null;
    if (!pack || pack.status === "stale") pack = window.buildRecommendedEvidencePack();
    var status = document.getElementById("bmEvidencePackStatus");
    var list = document.getElementById("bmRecommendedIssues");
    var summary = document.getElementById("bmSelectedIssueSummary");
    if (status) status.textContent = pack.status === "confirmed" ? "已确认" : (pack.status === "stale" ? "已过期" : "草稿");
    if (list) {
      list.innerHTML = (pack.recommendedIssues || []).map(function(issue){
        var selected = (pack.selectedIssues || []).indexOf(issue.issueId) >= 0;
        var ev = issue.evidence && issue.evidence[0];
        return '<article class="bm-issue-card '+(selected ? 'is-selected' : '')+'" data-evidence-issue="'+issue.issueId+'">'
          + '<h4>'+escapeXml(issue.title)+'</h4>'
          + '<p>'+escapeXml(issue.conclusion)+'</p>'
          + '<p>主指标：'+escapeXml(issue.primaryMetric)+' · 差距 '+escapeXml(ev ? ev.gap : "—")+' · 证据强度 '+escapeXml(ev ? ev.strength : "—")+'</p>'
          + '<button type="button" data-toggle-evidence-issue="'+issue.issueId+'">'+(selected ? "移出报告" : "加入报告")+'</button>'
          + '</article>';
      }).join("");
    }
    if (summary) {
      var selectedIssues = pack.selectedIssues || [];
      var selectedObjects = (pack.recommendedIssues || []).filter(function(issue){ return selectedIssues.indexOf(issue.issueId) >= 0; });
      var evidenceCount = selectedObjects.reduce(function(sum, issue){ return sum + (issue.evidence || []).length; }, 0);
      summary.textContent = "已选 " + selectedIssues.length + " 个问题 · " + evidenceCount + " 条证据 · " + selectedObjects.length + " 条因果链";
    }
  }

  function markPackStaleForBenchmarkChange(reason) {
    if (typeof window.markEvidencePackStale === "function") window.markEvidencePackStale(reason);
  }

  function bindEvidencePackUi(shell) {
    shell.addEventListener("click", function(e){
      var restart = e.target.closest("#bmRestartAnalysis");
      if (restart) {
        e.preventDefault();
        var drawer = document.getElementById("bmRestartDrawer");
        if (drawer) drawer.setAttribute("aria-hidden", "false");
        return;
      }
      var close = e.target.closest("#bmRestartClose");
      if (close) {
        e.preventDefault();
        var drawer2 = document.getElementById("bmRestartDrawer");
        if (drawer2) drawer2.setAttribute("aria-hidden", "true");
        return;
      }
      var clear = e.target.closest("#bmRestartClearPack");
      if (clear) {
        e.preventDefault();
        if (typeof window.saveEvidencePack === "function") window.saveEvidencePack(null);
        _bm.selectedBankId = null;
        renderAll();
        return;
      }
      var toggle = e.target.closest("[data-toggle-evidence-issue]");
      if (toggle) {
        e.preventDefault();
        var pack = typeof window.readEvidencePack === "function" ? window.readEvidencePack() : null;
        if (!pack) return;
        var id = toggle.dataset.toggleEvidenceIssue;
        var selected = pack.selectedIssues || [];
        if (selected.indexOf(id) >= 0) pack.selectedIssues = selected.filter(function(x){ return x !== id; });
        else pack.selectedIssues = selected.concat(id).slice(0, 3);
        if (typeof window.saveEvidencePack === "function") window.saveEvidencePack(pack);
        renderEvidencePackTray();
        return;
      }
      var confirm = e.target.closest("#bmConfirmEvidencePack");
      if (confirm) {
        e.preventDefault();
        var draft = typeof window.readEvidencePack === "function" ? window.readEvidencePack() : null;
        if (typeof window.confirmEvidencePack === "function") window.confirmEvidencePack(draft);
        renderEvidencePackTray();
        return;
      }
    });
  }
```

Inside the existing `renderSummary()` or `renderAll()` flow, call:

```js
    var restartContext = document.getElementById("bmRestartContext");
    var bank = getBank(_bm.selectedBankId);
    if (restartContext) restartContext.textContent = bank ? bank.name + " · " + _bm.snapshotYear : "未选择目标银行";
    renderEvidencePackTray();
```

Inside the existing `bind()` function, after `var shell = document.getElementById("benchmarkPageShell");`, call:

```js
    bindEvidencePackUi(shell);
```

In bank/year/peer change handlers, after changing `_bm`, call:

```js
        markPackStaleForBenchmarkChange("benchmark-context-change");
```

- [ ] **Step 6: 运行测试确认通过**

Run:

```bash
node --check js/55-benchmark-page.js
node tests/evidence_pack_model_contract.test.js
node tests/benchmark_downstream_state_sync_contract.test.js
```

Expected:

```text
evidence-pack-model-contract-ok
benchmark-downstream-state-sync-contract-ok
```

- [ ] **Step 7: 提交 Task 2**

```bash
git add index.html styles/benchmark.css js/55-benchmark-page.js tests/evidence_pack_model_contract.test.js
git commit -m "feat: add evidence pack tray to benchmark page"
```

---

### Task 3: 让后续页面只消费已确认证据包

**Files:**
- Modify: `js/57-evidence-pack-model.js`
- Modify: `js/19-product-workspace.js`
- Test: `tests/evidence_pack_driven_pages_contract.test.js`

- [ ] **Step 1: 写失败测试，验证页面模型只读取 selectedIssues**

Create `tests/evidence_pack_driven_pages_contract.test.js`:

```js
const fs = require("fs");
const vm = require("vm");
const assert = require("assert/strict");

const modelSrc = fs.readFileSync("js/57-evidence-pack-model.js", "utf8");
const workspace = fs.readFileSync("js/19-product-workspace.js", "utf8");

[
  "evidencePackAnswerModel",
  "evidencePackMapModel",
  "evidencePackTopicModel",
].forEach((needle) => assert(modelSrc.includes(needle), "model missing page model helper: " + needle));

[
  "renderEvidencePackAnswer",
  "renderEvidencePackMap",
  "renderEvidencePackTopics",
  "readEvidencePack",
].forEach((needle) => assert(workspace.includes(needle), "workspace must render from evidence pack: " + needle));

const samplePack = {
  version: "20260619-1430",
  status: "confirmed",
  targetBank: { name: "苏州农商行" },
  year: 2025,
  peerGroup: { label: "全国同类 + 自选", banks: ["常熟农商行"] },
  recommendedIssues: [
    {
      issueId: "a",
      title: "盈利能力承压",
      priority: 1,
      confidence: "高",
      primaryMetric: "ROE",
      conclusion: "ROE 低于同业，主要受 NIM 拖累",
      evidence: [{ evidenceId: "ev_a", metric: "ROE", gap: "-2.2pct", strength: "强", direction: "低于同业", targetValue: "8.2%", peerValue: "10.4%" }],
      causalChain: ["ROE 低于同业", "因为 NIM 低于同业", "因为定期化率偏高"],
      action: "先拆解息差",
    },
    {
      issueId: "b",
      title: "资产质量分化",
      priority: 2,
      confidence: "中",
      primaryMetric: "不良率",
      conclusion: "不良率高于同业",
      evidence: [{ evidenceId: "ev_b", metric: "不良率", gap: "+0.2pct", strength: "中", direction: "高于同业", targetValue: "1.2%", peerValue: "1.0%" }],
      causalChain: ["不良率高于同业", "因为对公风险暴露偏高"],
      action: "复核贷款结构",
    },
  ],
  selectedIssues: ["a"],
  excludedIssues: ["b"],
};

const context = {
  window: {},
  localStorage: {
    getItem(key) { return key === "benchmarkiq.evidencePack" ? JSON.stringify(samplePack) : null; },
    setItem() {},
    removeItem() {},
  },
};
context.window = Object.assign(context.window, context);
vm.createContext(context);
vm.runInContext(modelSrc, context);

const answer = context.window.evidencePackAnswerModel(samplePack);
assert.equal(answer.issues.length, 1, "answer model only uses selectedIssues");
assert.equal(answer.issues[0].issueId, "a", "answer model excludes unselected issue");
assert(answer.summary.includes("ROE"), "answer summary cites selected issue");

const map = context.window.evidencePackMapModel(samplePack);
assert.equal(map.rows.length, 1, "evidence map only uses selected evidence");
assert.equal(map.rows[0].evidenceId, "ev_a", "evidence map carries evidence id");
assert.equal(map.rows[0].strength, "强", "evidence map carries strength");

const topics = context.window.evidencePackTopicModel(samplePack);
assert.equal(topics.topics.length, 1, "topic model only uses selected issue");
assert(topics.topics[0].causalChain.length >= 3, "topic model preserves causal chain");

console.log("evidence-pack-driven-pages-contract-ok");
```

- [ ] **Step 2: 运行测试确认失败**

Run:

```bash
node tests/evidence_pack_driven_pages_contract.test.js
```

Expected: FAIL with missing page model helper.

- [ ] **Step 3: 在 `js/57-evidence-pack-model.js` 增加页面模型函数**

Add before exports:

```js
  function selectedIssueObjects(pack) {
    if (!pack || pack.status !== "confirmed") return [];
    var selected = pack.selectedIssues || [];
    return (pack.recommendedIssues || [])
      .filter(function(issue){ return selected.indexOf(issue.issueId) >= 0; })
      .sort(function(a, b){ return (a.priority || 99) - (b.priority || 99); });
  }

  function evidencePackAnswerModel(pack) {
    var issues = selectedIssueObjects(pack);
    return {
      empty: !issues.length,
      version: pack && pack.version,
      targetBank: pack && pack.targetBank,
      year: pack && pack.year,
      peerGroup: pack && pack.peerGroup,
      summary: issues.length
        ? "本轮最需要管理层优先处理的是" + issues.slice(0, 3).map(function(issue){ return issue.primaryMetric; }).join("、") + "对应的问题。"
        : "请先在数据对标页确认证据包。",
      issues: issues.slice(0, 3),
    };
  }

  function evidencePackMapModel(pack) {
    var rows = [];
    selectedIssueObjects(pack).forEach(function(issue){
      (issue.evidence || []).forEach(function(ev){
        rows.push(Object.assign({}, ev, {
          issueId: issue.issueId,
          issueTitle: issue.title,
          supports: issue.conclusion,
        }));
      });
    });
    return {
      empty: !rows.length,
      version: pack && pack.version,
      rows: rows,
    };
  }

  function evidencePackTopicModel(pack) {
    return {
      empty: !selectedIssueObjects(pack).length,
      version: pack && pack.version,
      topics: selectedIssueObjects(pack).map(function(issue){
        return {
          issueId: issue.issueId,
          title: issue.title,
          primaryMetric: issue.primaryMetric,
          conclusion: issue.conclusion,
          causalChain: issue.causalChain || [],
          action: issue.action || "",
          evidenceIds: (issue.evidence || []).map(function(ev){ return ev.evidenceId; }),
        };
      }),
    };
  }
```

Add exports:

```js
  window.evidencePackAnswerModel = evidencePackAnswerModel;
  window.evidencePackMapModel = evidencePackMapModel;
  window.evidencePackTopicModel = evidencePackTopicModel;
```

- [ ] **Step 4: 修改 `js/19-product-workspace.js`，增加渲染函数**

Add near other `renderStep2...` helpers:

```js
function evidencePackEmptyHtml() {
  return `<div class="step2-empty-state">
    <b>请先在数据对标页确认证据包</b>
    <p>后续页面将基于已确认的问题、证据和因果链生成。</p>
    <button type="button" data-page-link="benchmark">返回数据对标</button>
  </div>`;
}

function renderEvidencePackAnswer(model) {
  if (!model || model.empty) return evidencePackEmptyHtml();
  return `<div class="step2-pack-answer">
    <p class="step2-pack-meta">证据包 ${model.version} · ${model.targetBank?.name || ""} · ${model.year || ""}</p>
    <h3>${step2Esc(model.summary)}</h3>
    <div class="step2-pack-issue-grid">
      ${model.issues.map((issue) => {
        const ev = issue.evidence?.[0] || {};
        return `<article class="step2-pack-issue-card">
          <span>${step2Esc(issue.confidence || "中")}置信</span>
          <b>${step2Esc(issue.title)}</b>
          <p>${step2Esc(issue.conclusion)}</p>
          <em>证据 ${step2Esc(ev.evidenceId || "—")}：${step2Esc(issue.primaryMetric)} ${step2Esc(ev.gap || "—")} · ${step2Esc(ev.strength || "—")}证据</em>
          <small>${step2Esc(issue.action || "")}</small>
        </article>`;
      }).join("")}
    </div>
  </div>`;
}

function renderEvidencePackMap(model) {
  if (!model || model.empty) return evidencePackEmptyHtml();
  return `<div class="step2-pack-map">
    <p class="step2-pack-meta">证据包 ${step2Esc(model.version || "")}</p>
    <table>
      <thead><tr><th>证据</th><th>指标</th><th>差距</th><th>强度</th><th>支持结论</th></tr></thead>
      <tbody>${model.rows.map((row) => `<tr>
        <td>${step2Esc(row.evidenceId)}</td>
        <td>${step2Esc(row.metric)}</td>
        <td>${step2Esc(row.gap)}</td>
        <td>${step2Esc(row.strength)}</td>
        <td>${step2Esc(row.supports)}</td>
      </tr>`).join("")}</tbody>
    </table>
  </div>`;
}

function renderEvidencePackTopics(model) {
  if (!model || model.empty) return evidencePackEmptyHtml();
  return `<div class="step2-pack-topics">
    <p class="step2-pack-meta">证据包 ${step2Esc(model.version || "")}</p>
    ${model.topics.map((topic) => `<article class="step2-pack-topic-card">
      <h3>${step2Esc(topic.title)}</h3>
      <p>${step2Esc(topic.conclusion)}</p>
      <ol>${topic.causalChain.map((node) => `<li>${step2Esc(node)}</li>`).join("")}</ol>
      <small>证据：${step2Esc(topic.evidenceIds.join("、"))}</small>
      <b>${step2Esc(topic.action)}</b>
    </article>`).join("")}
  </div>`;
}
```

Inside `renderStep2Diagnosis()`, before old model rendering, insert:

```js
  const evidencePack = typeof readEvidencePack === "function" ? readEvidencePack() : null;
  if (evidencePack && evidencePack.status === "confirmed" && typeof evidencePackAnswerModel === "function") {
    if (decision) decision.innerHTML = renderEvidencePackAnswer(evidencePackAnswerModel(evidencePack));
    if (changes) changes.innerHTML = renderEvidencePackMap(evidencePackMapModel(evidencePack));
    if (topics) topics.innerHTML = renderEvidencePackTopics(evidencePackTopicModel(evidencePack));
    return;
  }
```

- [ ] **Step 5: 运行测试确认通过**

Run:

```bash
node --check js/57-evidence-pack-model.js
node --check js/19-product-workspace.js
node tests/evidence_pack_driven_pages_contract.test.js
node tests/evidence_pack_model_contract.test.js
```

Expected:

```text
evidence-pack-driven-pages-contract-ok
evidence-pack-model-contract-ok
```

- [ ] **Step 6: 提交 Task 3**

```bash
git add js/57-evidence-pack-model.js js/19-product-workspace.js tests/evidence_pack_driven_pages_contract.test.js
git commit -m "feat: render analysis pages from evidence pack"
```

---

### Task 4: 强化从数据对标到后续页面的确认与空状态

**Files:**
- Modify: `js/42-portal-router.js`
- Modify: `js/55-benchmark-page.js`
- Modify: `tests/benchmark_downstream_state_sync_contract.test.js`

- [ ] **Step 1: 更新测试，要求离开 benchmark 前确认证据包**

Append to `tests/benchmark_downstream_state_sync_contract.test.js`:

```js
assert(
  router.includes("ensureConfirmedEvidencePackBeforeLeavingBenchmark"),
  "router must ensure confirmed evidence pack before downstream pages"
);
```

- [ ] **Step 2: 运行测试确认失败**

Run:

```bash
node tests/benchmark_downstream_state_sync_contract.test.js
```

Expected: FAIL with `router must ensure confirmed evidence pack before downstream pages`.

- [ ] **Step 3: 修改 `js/42-portal-router.js`**

Add helper before `setPortalPage()`:

```js
function ensureConfirmedEvidencePackBeforeLeavingBenchmark() {
  if (typeof window === "undefined") return;
  var pack = typeof window.readEvidencePack === "function" ? window.readEvidencePack() : null;
  if (!pack || pack.status === "stale") {
    pack = typeof window.buildRecommendedEvidencePack === "function" ? window.buildRecommendedEvidencePack() : pack;
  }
  if (pack && pack.status !== "confirmed" && typeof window.confirmEvidencePack === "function") {
    window.confirmEvidencePack(pack, pack.selectedIssues);
  }
}
```

Inside `setPortalPage()`, after `var syncBenchmark = shouldSyncBenchmarkBeforePortalPage(target);`, add:

```js
  if (syncBenchmark) {
    ensureConfirmedEvidencePackBeforeLeavingBenchmark();
  }
```

Export:

```js
  window.ensureConfirmedEvidencePackBeforeLeavingBenchmark = ensureConfirmedEvidencePackBeforeLeavingBenchmark;
```

- [ ] **Step 4: 修改 `js/55-benchmark-page.js` 下一步按钮**

Replace the current next button handler body with:

```js
      if (nextBtn && !nextBtn.disabled) {
        e.preventDefault();
        if (typeof window.syncBenchmarkToState === "function") window.syncBenchmarkToState({ renderDownstream: false });
        if (typeof window.readEvidencePack === "function") {
          var pack = window.readEvidencePack();
          if (!pack || pack.status !== "confirmed") {
            pack = typeof window.buildRecommendedEvidencePack === "function" ? window.buildRecommendedEvidencePack() : pack;
            if (pack && typeof window.confirmEvidencePack === "function") window.confirmEvidencePack(pack, pack.selectedIssues);
          }
        }
        if (typeof setPortalPage === "function") setPortalPage("answer", { force: true });
        return;
      }
```

- [ ] **Step 5: 运行测试确认通过**

Run:

```bash
node --check js/42-portal-router.js
node --check js/55-benchmark-page.js
node tests/benchmark_downstream_state_sync_contract.test.js
node tests/evidence_pack_model_contract.test.js
```

Expected:

```text
benchmark-downstream-state-sync-contract-ok
evidence-pack-model-contract-ok
```

- [ ] **Step 6: 提交 Task 4**

```bash
git add js/42-portal-router.js js/55-benchmark-page.js tests/benchmark_downstream_state_sync_contract.test.js
git commit -m "fix: require evidence pack before analysis pages"
```

---

### Task 5: 语言质量与防泛化契约

**Files:**
- Modify: `js/57-evidence-pack-model.js`
- Test: `tests/evidence_pack_driven_pages_contract.test.js`

- [ ] **Step 1: 增加防泛化测试**

Append to `tests/evidence_pack_driven_pages_contract.test.js`:

```js
const genericWords = ["值得关注", "持续跟踪", "结构承压"];
const renderedText = JSON.stringify(answer) + JSON.stringify(map) + JSON.stringify(topics);
genericWords.forEach((word) => {
  assert(!renderedText.includes(word), "evidence pack models should avoid generic phrase: " + word);
});
assert(renderedText.includes("ev_a"), "rendered models must cite evidence id");
assert(renderedText.includes("强"), "rendered models must carry evidence strength");
```

- [ ] **Step 2: 运行测试**

Run:

```bash
node tests/evidence_pack_driven_pages_contract.test.js
```

Expected: PASS if Task 3 implementation already follows the model. If it fails, continue to Step 3.

- [ ] **Step 3: 增加语言守卫函数**

In `js/57-evidence-pack-model.js`, add:

```js
  function scrubGenericLanguage(text) {
    return String(text || "")
      .replace(/值得关注/g, "需要由证据链继续验证")
      .replace(/持续跟踪/g, "按证据包中的指标继续复核")
      .replace(/结构承压/g, "对应指标已形成可量化差距");
  }
```

Use it in `evidencePackAnswerModel`, `evidencePackMapModel`, and `evidencePackTopicModel` wherever `summary`, `conclusion`, or `supports` is assigned.

- [ ] **Step 4: 运行测试确认通过**

Run:

```bash
node --check js/57-evidence-pack-model.js
node tests/evidence_pack_driven_pages_contract.test.js
```

Expected:

```text
evidence-pack-driven-pages-contract-ok
```

- [ ] **Step 5: 提交 Task 5**

```bash
git add js/57-evidence-pack-model.js tests/evidence_pack_driven_pages_contract.test.js
git commit -m "test: guard evidence pack narrative quality"
```

---

### Task 6: 回归验证与收尾

**Files:**
- No new code expected.

- [ ] **Step 1: 跑语法检查**

Run:

```bash
node --check js/57-evidence-pack-model.js
node --check js/55-benchmark-page.js
node --check js/56-benchmark-state-bridge.js
node --check js/42-portal-router.js
node --check js/19-product-workspace.js
```

Expected: no output and exit code 0 for each command.

- [ ] **Step 2: 跑核心契约测试**

Run:

```bash
node tests/evidence_pack_model_contract.test.js
node tests/evidence_pack_driven_pages_contract.test.js
node tests/benchmark_downstream_state_sync_contract.test.js
node tests/report_evidence_navigation_runtime.test.js
node tests/data_first_report_evidence_flow_contract.test.js
node tests/benchmark_decomposition_specs_contract.test.js
node tests/portal_confirm_navigation_contract.test.js
node tests/entry_ia_redesign_contract.test.js
node tests/portal_ia_v10_router_canonical.test.js
```

Expected:

```text
evidence-pack-model-contract-ok
evidence-pack-driven-pages-contract-ok
benchmark-downstream-state-sync-contract-ok
report-evidence-navigation-runtime-ok
data-first-report-evidence-flow-contract-ok
benchmark-decomposition-specs-contract-ok
portal-confirm-navigation-contract-ok
entry-ia-data-first-contract-ok
portal-ia-v10-router-canonical-ok
```

- [ ] **Step 3: 检查 git diff**

Run:

```bash
git status --short
git diff --stat
```

Expected: only files touched by this plan remain modified or staged. Existing unrelated dirty files should not be reverted or staged.

- [ ] **Step 4: 最终提交**

If previous tasks were committed one by one, this step should have nothing to commit. If a small plan-related test adjustment remains, inspect it first:

```bash
git status --short tests/evidence_pack_model_contract.test.js tests/evidence_pack_driven_pages_contract.test.js tests/benchmark_downstream_state_sync_contract.test.js
git diff -- tests/evidence_pack_model_contract.test.js tests/evidence_pack_driven_pages_contract.test.js tests/benchmark_downstream_state_sync_contract.test.js
```

Only when the diff belongs to this plan, commit those exact files:

```bash
git add tests/evidence_pack_model_contract.test.js tests/evidence_pack_driven_pages_contract.test.js tests/benchmark_downstream_state_sync_contract.test.js
git commit -m "chore: verify evidence pack analysis flow"
```

- [ ] **Step 5: 推送分支**

Run:

```bash
git push
```

Expected: current branch updates on GitHub.

---

## 自审结果

- 设计文档中的“重新选择目标银行”由 Task 2 实现。
- 证据包 `draft / confirmed / stale` 状态由 Task 1 和 Task 2 实现。
- 证据包确认与离开 benchmark 前校验由 Task 4 实现。
- 结论摘要、证据地图、专题归因消费 `selectedIssues` 由 Task 3 实现。
- 防泛化语言由 Task 5 实现。
- 回归验证与推送由 Task 6 实现。

本计划无未决项，没有要求新增外部模型接口，也没有要求重构完整报告工作室。
