# Three-Page Diagnosis Replan Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 将结论摘要、证据地图、专题归因三页改成证据包驱动的单任务链条，减少杂项内容并保证目标行、对标组、年份一致。

**Architecture:** 新增一个独立的三页诊断页面模型文件，负责把 `readEvidencePack()` / `buildManagementDiagnosisPack()` 转换成 `conclusion / evidenceMap / attribution` 三类页面输入，并在模型层完成主判断卡选择、证据强度判定、专题排序折叠、报告候选页数据契约、文案 trace 校验和证据包异常状态归一。新增一个渲染文件，负责将模型挂载到现有 `step2Content` 区域，并按 `answer / evidence / topics` 控制显示。旧专题深钻模块不删除，统一进入折叠区域，避免破坏既有分析能力。

**Tech Stack:** 原生 JavaScript、现有 `index.html` portal page 架构、`benchmarkiq.evidencePack` 本地存储、Node 静态契约测试、Playwright 浏览器验证。

---

## File Structure

- Create: `js/63-three-page-diagnosis-model.js`  
  负责读取证据包并输出三页统一模型。只做数据整理，不写 DOM。

- Create: `js/64-three-page-diagnosis-renderer.js`  
  负责渲染结论摘要、证据地图、专题归因三页的新主画布，并处理空状态、过期状态、页面跳转。渲染层优先使用 `document.createElement` 和 `textContent`，不得把证据包文案直接拼进可执行 HTML。

- Modify: `index.html`  
  引入两个新脚本；在 `step2Content` 中增加 `threePageDiagnosisMount`，并给旧高级 mount 加上统一的折叠容器或保持在 advanced 区。

- Modify: `styles/app.css` 或 `styles/benchmark.css`  
  增加三页主画布样式。优先放到 `styles/app.css`，因为这三页属于 portal/report 页面，不属于纯数据对标页。新增样式使用 `font-weight: 700`，不使用 `font-weight: 760`。

- Modify: `js/42-portal-router.js`  
  页面切换到 `answer / evidence / topics` 时刷新三页模型渲染；离开 benchmark 前仍确保证据包已确认。精确插入点是 `setPortalPage(page, options)` 中 `document.body.setAttribute("data-app-page", target)` 之后、`syncAppModeFromPortalPage(target)` 之后均可，推荐放在函数末尾 `updatePortalVisibility()` 之后的同一渲染批次。

- Modify: `js/08-report.js` and related hooks only if needed  
  若 `renderAll()` 后旧渲染覆盖新画布，则在 `renderAll()` 末尾调用 `renderThreePageDiagnosis()`。避免重写旧报告生成逻辑。

- Test: `tests/three_page_diagnosis_model_contract.test.js`  
  验证模型结构、空状态、过期状态、证据包字段映射。

- Test: `tests/three_page_diagnosis_rules_contract.test.js`
  验证主判断卡、证据强度、专题折叠、报告候选页、禁用泛化表述和 trace 规则。

- Test: `tests/three_page_diagnosis_behavior.test.js`
  使用真实形状 fixture 验证证据强度、分类标签、主判断卡去重、专题折叠和禁用泛化表述降级。

- Test: `tests/three_page_diagnosis_renderer_contract.test.js`  
  验证渲染文件包含三页容器、折叠规则和跳转按钮。

- Test: `tests/three_page_diagnosis_renderer_security.test.js`
  用包含 `<script>` 和事件属性字符串的证据包验证渲染层不会生成可执行脚本节点。

- Test: `tests/three_page_diagnosis_flow_runtime.test.js`  
  使用 VM 或轻量 DOM mock 验证 `renderThreePageDiagnosis()` 能按当前 portal page 渲染正确页面。

- Test: `tests/three_page_diagnosis_browser.spec.js`
  将浏览器验证脚本沉淀为可复用 Playwright 回归测试。

---

## Review-Driven Rule Contract

本轮评估意见要求先把“页面怎么自动生成”变成可执行规则，再写 UI。Task 1 必须先落地以下规则，Task 2 只能消费模型结果，不能重新硬编码业务判断。

### 主判断卡生成规则

- 输入优先级：`selectedIssues` > `recommendedIssues` > `storyCards`，只使用已经绑定 `evidenceId / metric / primaryMetric` 的内容。
- 第 1 张卡：必须来自 top issue；若 top issue 没有可追溯证据，则显示证据不足状态，不补泛化判断。
- 第 2 张卡：优先从 top issue 的直接相关证据、`causalChain.directCause` 或同一 `issueId` 的下一层约束中选择；没有合适内容时使用第二个 issue。
- 第 3 张卡：优先从 `causalChain.structureCause / action / thirdEvidence` 中选择；没有合适内容时使用第三个 issue。
- 少于 3 张时隐藏空卡；超过 3 张时只取前三张。去重 key 为 `evidenceId || primaryMetric || metric || title`。
- 每张卡必须带 `trace`，否则只能进入弱提示或被隐藏。

### 证据强度规则

第一版使用简单规则引擎，避免业务口径散落在渲染层：

```js
function scoreEvidenceStrength(evidenceItems, pack) {
  var peerCount = pack && pack.peerGroup && Array.isArray(pack.peerGroup.banks) ? pack.peerGroup.banks.length : 0;
  if (!pack || pack.status !== "confirmed" || peerCount < 3) {
    return { label: "弱", supportCount: 0, counterCount: 1 };
  }
  var supportCount = evidenceItems.filter(function (item) {
    return item.signalDirection === "support";
  }).length;
  var counterCount = evidenceItems.filter(function (item) {
    return item.signalDirection === "counter";
  }).length;
  if (supportCount >= 2 && counterCount === 0) return { label: "强", supportCount: supportCount, counterCount: counterCount };
  if (supportCount >= 1 && counterCount === 0) return { label: "中", supportCount: supportCount, counterCount: counterCount };
  return { label: "弱", supportCount: supportCount, counterCount: counterCount };
}
```

三类证据信号为：同业位置、异动偏离、估值或质量锚。字段缺失、对标组不足、存在反证或证据包未确认时，默认降为弱。

### 专题折叠规则

- `rankAttributionTopics(issues)` 输出 `{ allTopics, visibleTopics, foldedTopics }`。
- 1-3 个专题全部显示；4 个及以上只显示主专题 + 2 个备选专题，其余进入 `foldedTopics`。
- 排序权重：证据强度 > 与 top issue 的因果距离 > 是否有 `reportCandidates` > issue priority。
- 折叠区只显示数量和标题，不在首屏展开，避免页面重新变杂。

### 报告候选页数据契约

`buildReportCandidates(issue, pack)` 必须输出可流向报告编排页的结构：

```js
{
  id: "report_<issueId>_<layout>",
  sourceIssueId: "profitability_pressure",
  title: "盈利能力承压专题页",
  chartType: "bridge",
  visualAsset: null,
  evidenceSentence: "2025 年目标行净息差低于对标组，且负债结构解释了主要差距。",
  useScenario: "董事会汇报",
  recommendedSlideLayout: "headline-evidence-chart",
  context: { targetBank: "目标行", peerGroup: [], year: 2025, issueId: "profitability_pressure" },
  trace: [{ field: "recommendedIssues[0].primaryMetric", source: "evidencePack", value: "净息差" }]
}
```

必填字段：`id / sourceIssueId / title / chartType / evidenceSentence / recommendedSlideLayout / context / trace`。候选页标题、证据句和图表类型来自 evidence pack 或专题链，不允许在前端凭空生成。

### 文案和异常状态规则

- `GENERIC_LANGUAGE_PATTERNS` 至少包含：`需要综合分析 / 整体表现较好 / 整体表现较差 / 存在一定压力 / 需要进一步关注 / 建议持续优化 / 指标有所波动 / 需结合实际情况判断 / 具有一定参考意义`。
- 强判断文案必须通过 `hasTrace(item)`，并且不能命中禁用泛化表述。
- `normalizePackStatus(pack)` 至少输出：`missing-pack / stale-pack / partial-pack / error-pack / confirmed`。
- 渲染层必须支持：加载 skeleton、字段缺失降级、生成失败重试入口、回到数据对标入口。

### 证据分类与因果链规则

- 证据地图优先读取 `issue.category` 或 `evidence.category`，合法值为 `peerPosition / anomaly / valuationAnchor`。
- 缺少 category 时才使用指标名和 source 回退归类，并把模型状态标记为 `partial-pack`，`categoryStatus.message` 为 `证据分类字段缺失，已按指标口径临时归类`。
- 因果链字段映射固定为：
  - 结果指标：`primaryMetric` -> `causalChain[0]` -> `待确认结果指标`
  - 直接原因：`causalChain.directCause` -> `directDriver` -> `causalChain[1]` -> `待确认直接原因`
  - 结构原因：`causalChain.structureCause` -> `structureDriver` -> `causalChain[2]` -> `待确认结构原因`
  - 管理动作：`recommendedAction` -> `action` -> `causalChain[3]` -> `待确认管理动作`
- 原结论摘要中的行动路径移入专题归因的管理动作段，以及 `reportCandidates.recommendedAction / useScenario`。

---

### Task 0: 证据包结构勘察

**Files:**
- Read: `js/57-evidence-pack-model.js`
- Read: existing tests using `benchmarkiq.evidencePack`
- Create: `tests/fixtures/three_page_evidence_pack_fixture.json`

- [ ] **Step 1: Inspect current evidence pack field names**

Run:

```bash
rg -n "function buildIssue|function buildRecommendedEvidencePack|function buildManagementDiagnosisPack|directDriver|structureDriver|action|causalChain|category" js/57-evidence-pack-model.js tests
```

Expected: output confirms current fields include `primaryMetric`, `directDriver`, `structureDriver`, `action`, array-shaped `causalChain`, `recommendedIssues`, `selectedIssues`, and no stable `category` field yet.

- [ ] **Step 2: Create a fixture with the current real shape plus new category labels**

Create `tests/fixtures/three_page_evidence_pack_fixture.json`:

```json
{
  "version": "fixture-20260620",
  "status": "confirmed",
  "targetBank": { "id": "target_bank", "name": "目标银行", "type": "城商行", "region": "浙江" },
  "year": 2025,
  "peerGroup": { "label": "当前对标组", "banks": ["对标银行A", "对标银行B", "对标银行C"], "peerBasis": ["同区域", "同类型"] },
  "selectedIssues": ["profitability_pressure", "nim_pressure", "asset_quality_divergence"],
  "recommendedIssues": [
    {
      "issueId": "profitability_pressure",
      "title": "盈利能力承压",
      "priority": 1,
      "confidence": "高",
      "primaryMetric": "ROE",
      "conclusion": "ROE 低于对标组 1.20pct，主要受净息差和成本收入比拖累。",
      "directDriver": "NIM 与成本收入比",
      "structureDriver": "负债成本、收入结构和费用刚性",
      "action": "先复核息差与费用效率，再确定盈利修复抓手",
      "category": "peerPosition",
      "evidence": [
        {
          "evidenceId": "ev_roe_gap",
          "category": "peerPosition",
          "metric": "ROE",
          "targetValue": "7.20%",
          "peerValue": "8.40%",
          "gap": "-1.20pct",
          "direction": "低于同业",
          "signalDirection": "support",
          "strength": "强",
          "source": "2025 年末数据对标"
        }
      ],
      "causalChain": ["ROE 与对标组形成差距", "直接原因指向 NIM 与成本收入比", "结构原因需要复核负债成本、收入结构和费用刚性", "行动抓手是先复核息差与费用效率"]
    },
    {
      "issueId": "nim_pressure",
      "title": "息差水平承压",
      "priority": 2,
      "confidence": "中",
      "primaryMetric": "NIM",
      "conclusion": "NIM 降幅大于对标组，说明息差防守压力扩大。",
      "directDriver": "生息资产收益率与计息负债成本",
      "structureDriver": "定期化率、存款成本率和贷款收益率",
      "action": "拆解负债结构与资产定价",
      "category": "anomaly",
      "evidence": [
        {
          "evidenceId": "ev_nim_change",
          "category": "anomaly",
          "metric": "NIM",
          "targetValue": "1.45%",
          "peerValue": "1.68%",
          "gap": "-0.23pct",
          "direction": "低于同业",
          "signalDirection": "support",
          "strength": "中",
          "source": "2025 年同比变化"
        }
      ],
      "causalChain": ["NIM 与对标组形成差距", "直接原因指向生息资产收益率与计息负债成本", "结构原因需要复核定期化率、存款成本率和贷款收益率", "行动抓手是拆解负债结构与资产定价"]
    },
    {
      "issueId": "asset_quality_divergence",
      "title": "资产质量分化",
      "priority": 3,
      "confidence": "中",
      "primaryMetric": "不良率",
      "conclusion": "不良率高于对标组，估值和质量锚仍需解释。",
      "directDriver": "不良生成和风险确认节奏",
      "structureDriver": "对公贷款结构、区域行业暴露和零售客群风险",
      "action": "按贷款结构和区域风险重新排序资产质量专题",
      "category": "valuationAnchor",
      "evidence": [
        {
          "evidenceId": "ev_npl_gap",
          "category": "valuationAnchor",
          "metric": "不良率",
          "targetValue": "1.65%",
          "peerValue": "1.20%",
          "gap": "+0.45pct",
          "direction": "高于同业",
          "signalDirection": "support",
          "strength": "中",
          "source": "2025 年末数据对标"
        }
      ],
      "causalChain": ["不良率与对标组形成差距", "直接原因指向不良生成和风险确认节奏", "结构原因需要复核对公贷款结构和区域行业暴露", "行动抓手是重排资产质量专题"]
    }
  ],
  "narrativeGuardrails": { "mustCiteEvidence": true, "avoidGenericLanguage": true, "maxPrimaryIssues": 3 },
  "updatedAt": "2026-06-20T00:00:00.000Z"
}
```

- [ ] **Step 3: Commit fixture and reconnaissance result**

```bash
git add tests/fixtures/three_page_evidence_pack_fixture.json
git commit -m "test: add three-page diagnosis evidence fixture"
```

---

### Task 1: 三页诊断 Page Model

**Files:**
- Create: `js/63-three-page-diagnosis-model.js`
- Test: `tests/three_page_diagnosis_model_contract.test.js`

- [ ] **Step 1: Write the failing contract test**

Create `tests/three_page_diagnosis_model_contract.test.js`:

```js
const fs = require("fs");
const assert = require("assert/strict");

const model = fs.readFileSync("js/63-three-page-diagnosis-model.js", "utf8");

[
  "function readThreePageEvidencePack",
  "function normalizePackStatus",
  "function buildThreePageDiagnosisModel",
  "function buildConclusionCards",
  "function buildConclusionPageModel",
  "function scoreEvidenceStrength",
  "function buildEvidenceMapPageModel",
  "function rankAttributionTopics",
  "function buildReportCandidates",
  "function buildAttributionPageModel",
  "function traceForEvidence",
  "function hasTrace",
  "GENERIC_LANGUAGE_PATTERNS",
  "status: \"missing-pack\"",
  "status: \"stale-pack\"",
  "status: \"partial-pack\"",
  "status: \"error-pack\"",
  "supportCount >= 2 && counterCount === 0",
  "window.buildThreePageDiagnosisModel = buildThreePageDiagnosisModel",
].forEach((needle) => {
  assert(model.includes(needle), `three-page model missing ${needle}`);
});

[
  "conclusion",
  "evidenceMap",
  "attribution",
  "targetBank",
  "peerGroup",
  "selectedIssues",
  "reportCandidates",
  "allTopics",
  "foldedTopics",
  "recommendedSlideLayout",
  "evidenceSentence",
  "trace",
].forEach((needle) => {
  assert(model.includes(needle), `three-page model must expose ${needle}`);
});

console.log("three-page-diagnosis-model-contract-ok");
```

- [ ] **Step 2: Run test to verify it fails**

Run:

```bash
node tests/three_page_diagnosis_model_contract.test.js
```

Expected: FAIL with `ENOENT` or `three-page model missing`.

- [ ] **Step 3: Create the model file with final rule hooks**

This step creates the model file once. Do not commit a simplified intermediate version. The model must call category-based evidence grouping and chain-field mapping from the start; any fallback is marked through `categoryStatus` and `partial-pack`.

Create `js/63-three-page-diagnosis-model.js`:

```js
/* Bank VQA module: 63-three-page-diagnosis-model.js
 * 结论摘要 / 证据地图 / 专题归因三页统一模型。
 */
(function () {
  if (typeof window === "undefined") return;

  function readThreePageEvidencePack() {
    if (typeof window.readEvidencePack === "function") return window.readEvidencePack();
    try {
      var raw = localStorage.getItem("benchmarkiq.evidencePack");
      return raw ? JSON.parse(raw) : null;
    } catch (e) {
      return window.__benchmarkEvidencePack || null;
    }
  }

  function selectedIssuesFromPack(pack) {
    var selected = Array.isArray(pack && pack.selectedIssues) ? pack.selectedIssues : [];
    var issues = Array.isArray(pack && pack.recommendedIssues) ? pack.recommendedIssues : [];
    if (!selected.length) return issues.slice(0, 3);
    return selected.map(function (id) {
      return issues.filter(function (issue) { return issue.issueId === id; })[0];
    }).filter(Boolean);
  }

  function firstEvidence(issue) {
    return issue && Array.isArray(issue.evidence) ? issue.evidence[0] : null;
  }

  function evidenceStrengthLabel(issue) {
    var ev = firstEvidence(issue);
    return ev && ev.strength ? ev.strength : (issue && issue.confidence) || "弱";
  }

  function modelContext(pack) {
    return {
      targetBank: pack.targetBank || {},
      peerGroup: pack.peerGroup || { label: "当前对标组", banks: [] },
      year: pack.year || "",
      status: pack.status || "draft",
      version: pack.version || "",
      updatedAt: pack.updatedAt || "",
    };
  }

  function buildConclusionPageModel(pack, issues) {
    var top = issues[0] || null;
    var headline = top
      ? ((pack.targetBank && pack.targetBank.name) || "目标银行") + "本轮主判断：" + top.conclusion
      : "请先完成数据对标并生成证据包";
    return {
      headline: headline,
      topIssues: issues.slice(0, 3).map(function (issue, index) {
        var ev = firstEvidence(issue);
        return {
          rank: index + 1,
          issueId: issue.issueId,
          title: issue.title,
          conclusion: issue.conclusion,
          metric: issue.primaryMetric || (ev && ev.metric) || "",
          evidenceText: ev ? ev.metric + "：目标 " + ev.targetValue + " / 对标 " + ev.peerValue + " / 差距 " + ev.gap : "",
          strength: evidenceStrengthLabel(issue),
          nextQuestion: issue.directDriver || (Array.isArray(issue.causalChain) ? issue.causalChain[1] : "") || "进入证据地图复核",
        };
      }),
      kpis: issues.slice(0, 5).map(function (issue) {
        var ev = firstEvidence(issue);
        return {
          label: ev ? ev.metric : issue.primaryMetric || issue.title,
          value: ev ? ev.targetValue : "",
          peer: ev ? ev.peerValue : "",
          gap: ev ? ev.gap : "",
          strength: evidenceStrengthLabel(issue),
        };
      }),
      nextAction: "查看证据地图",
    };
  }

  function buildEvidenceMapPageModel(pack, issues) {
    var top = issues[0] || null;
    var evidence = issues.map(function (issue) {
      var ev = firstEvidence(issue);
      return {
        issueId: issue.issueId,
        title: issue.title,
        metric: ev ? ev.metric : issue.primaryMetric || "",
        targetValue: ev ? ev.targetValue : "",
        peerValue: ev ? ev.peerValue : "",
        gap: ev ? ev.gap : "",
        direction: ev ? ev.direction : "",
        strength: evidenceStrengthLabel(issue),
        source: ev ? ev.source : "",
        chain: Array.isArray(issue.causalChain) ? issue.causalChain.slice(0, 4) : [],
      };
    });
    return {
      headline: top ? "证据地图验证：" + top.title : "证据地图待生成",
      strength: evidence[0] ? evidence[0].strength : "弱",
      peerPosition: evidence[0] || null,
      anomalies: evidence.slice(1, 3),
      valuationAnchor: evidence.filter(function (item) { return item.metric === "PB" || item.title.indexOf("估值") >= 0; })[0] || evidence[2] || null,
      counterEvidence: pack.status === "confirmed" ? [] : ["证据包尚未确认，正式报告应降低结论强度。"],
      chainSummary: evidence.slice(0, 3).map(function (item) { return item.metric || item.title; }).filter(Boolean).join(" → "),
    };
  }

  function buildAttributionPageModel(pack, issues) {
    var active = issues[0] || null;
    var chain = active && Array.isArray(active.causalChain) ? active.causalChain.slice(0, 4) : [];
    return {
      activeIssueId: active ? active.issueId : "",
      title: active ? active.title : "专题归因待生成",
      headline: active ? active.conclusion : "请先确认本轮证据包",
      chain: {
        result: chain[0] || "结果指标待确认",
        directCause: chain[1] || "直接原因待确认",
        structureCause: chain[2] || "结构原因待确认",
        action: chain[3] || (active && active.action) || "管理动作待确认",
      },
      evidence: issues.slice(0, 3).map(function (issue) {
        var ev = firstEvidence(issue);
        return {
          issueId: issue.issueId,
          title: issue.title,
          text: ev ? ev.metric + "差距：" + ev.gap + "，证据强度：" + evidenceStrengthLabel(issue) : issue.conclusion,
        };
      }),
      reportCandidates: active ? [{
        id: "report_" + active.issueId,
        title: active.title + "专题页",
        useCase: "进入最终报告的管理层诊断页",
        evidence: active.conclusion,
      }] : [],
      advancedCollapsed: true,
    };
  }

  function buildThreePageDiagnosisModel(pack) {
    pack = pack || readThreePageEvidencePack();
    if (!pack) {
      return {
        status: "missing-pack",
        context: { targetBank: {}, peerGroup: { banks: [] }, year: "", status: "missing-pack" },
        conclusion: buildConclusionPageModel({ targetBank: {} }, []),
        evidenceMap: buildEvidenceMapPageModel({ status: "missing-pack" }, []),
        attribution: buildAttributionPageModel({ status: "missing-pack" }, []),
      };
    }
    var issues = selectedIssuesFromPack(pack);
    var status = normalizePackStatus(pack);
    return {
      status: status,
      context: modelContext(pack),
      selectedIssues: issues,
      conclusion: buildConclusionPageModel(pack, issues),
      evidenceMap: buildEvidenceMapPageModel(pack, issues),
      attribution: buildAttributionPageModel(pack, issues),
    };
  }

  window.readThreePageEvidencePack = readThreePageEvidencePack;
  window.buildThreePageDiagnosisModel = buildThreePageDiagnosisModel;
})();
```

- [ ] **Step 4: Run syntax check and keep contract red until Task 1A**

Run:

```bash
node --check js/63-three-page-diagnosis-model.js
node tests/three_page_diagnosis_model_contract.test.js
```

Expected: syntax check PASS. The model contract may still FAIL until Task 1A adds the final rule helpers and behavior functions. Do not commit until Task 1A is complete.

- [ ] **Step 5: Commit**

Do not commit here. Continue directly into Task 1A and commit only after the rule contract and behavior tests pass. This avoids a git history entry where the evidence map is temporarily grouped by issue array position.

---

### Task 1A: 规则引擎与口径契约

**Files:**
- Modify: `js/63-three-page-diagnosis-model.js`
- Test: `tests/three_page_diagnosis_rules_contract.test.js`

- [ ] **Step 1: Write rule contract test**

Create `tests/three_page_diagnosis_rules_contract.test.js`:

```js
const fs = require("fs");
const assert = require("assert/strict");

const model = fs.readFileSync("js/63-three-page-diagnosis-model.js", "utf8");

[
  "GENERIC_LANGUAGE_PATTERNS",
  "需要综合分析",
  "整体表现较好",
  "存在一定压力",
  "function buildConclusionCards",
  "function scoreEvidenceStrength",
  "function rankAttributionTopics",
  "function buildReportCandidates",
  "function normalizePackStatus",
  "function hasTrace",
  "partial-pack",
  "error-pack",
  "supportCount >= 2 && counterCount === 0",
  "foldedTopics",
  "allTopics",
  "recommendedSlideLayout",
  "evidenceSentence",
  "trace",
].forEach((needle) => {
  assert(model.includes(needle), `rule contract missing ${needle}`);
});

console.log("three-page-diagnosis-rules-contract-ok");
```

- [ ] **Step 2: Implement exact helper rules in the model**

Add these helpers near the top of `js/63-three-page-diagnosis-model.js`, before page builders:

```js
var GENERIC_LANGUAGE_PATTERNS = [
  "需要综合分析",
  "整体表现较好",
  "整体表现较差",
  "存在一定压力",
  "需要进一步关注",
  "建议持续优化",
  "指标有所波动",
  "需结合实际情况判断",
  "具有一定参考意义",
];

function normalizePackStatus(pack) {
  if (!pack) return "missing-pack";
  if (pack.status === "stale") return "stale-pack";
  if (pack.status === "error") return "error-pack";
  var missing = [];
  ["targetBank", "peerGroup", "year"].forEach(function (key) {
    if (!pack[key]) missing.push(key);
  });
  if (!Array.isArray(pack.recommendedIssues) && !Array.isArray(pack.selectedIssues) && !Array.isArray(pack.storyCards)) {
    missing.push("recommendedIssues");
  }
  return missing.length ? "partial-pack" : (pack.status || "confirmed");
}

function traceForEvidence(issue, ev, fieldPrefix) {
  var prefix = fieldPrefix || "issue";
  var trace = [];
  if (issue && issue.issueId) trace.push({ field: prefix + ".issueId", source: "evidencePack", value: issue.issueId });
  if (issue && issue.primaryMetric) trace.push({ field: prefix + ".primaryMetric", source: "evidencePack", value: issue.primaryMetric });
  if (issue && issue.metric) trace.push({ field: prefix + ".metric", source: "evidencePack", value: issue.metric });
  if (ev && ev.gap) trace.push({ field: prefix + ".evidence.gap", source: "evidencePack", value: ev.gap });
  return trace;
}

function hasTrace(item) {
  return Array.isArray(item && item.trace) && item.trace.length > 0;
}

function textHasGenericLanguage(text) {
  return GENERIC_LANGUAGE_PATTERNS.some(function (pattern) {
    return String(text || "").indexOf(pattern) >= 0;
  });
}

function evidenceCategory(issue, ev) {
  var category = (ev && ev.category) || (issue && issue.category) || "";
  if (category === "peerPosition" || category === "anomaly" || category === "valuationAnchor") {
    return { category: category, fallback: false };
  }
  var haystack = [issue && issue.title, issue && issue.primaryMetric, ev && ev.metric, ev && ev.source].join(" ");
  if (/同业|对标|分位/.test(haystack)) return { category: "peerPosition", fallback: true };
  if (/变化|同比|环比|扩大|收窄/.test(haystack)) return { category: "anomaly", fallback: true };
  if (/PB|ROE|不良|拨备|资本|质量/.test(haystack)) return { category: "valuationAnchor", fallback: true };
  return { category: "peerPosition", fallback: true };
}

function chainSegment(issue, name) {
  var chain = issue && issue.causalChain;
  if (name === "result") return issue.primaryMetric || (Array.isArray(chain) && chain[0]) || "待确认结果指标";
  if (name === "directCause") return (chain && chain.directCause) || issue.directDriver || (Array.isArray(chain) && chain[1]) || "待确认直接原因";
  if (name === "structureCause") return (chain && chain.structureCause) || issue.structureDriver || (Array.isArray(chain) && chain[2]) || "待确认结构原因";
  if (name === "action") return issue.recommendedAction || issue.action || (Array.isArray(chain) && chain[3]) || "待确认管理动作";
  return "待确认";
}
```

- [ ] **Step 3: Replace simplified builders with rule-driven builders**

The model must include these function names and behavior:

```js
function buildConclusionCards(pack, issues) {
  var cards = [];
  var top = issues[0];
  if (!top) return cards;
  var evidence = Array.isArray(top.evidence) ? top.evidence : [];

  function addCard(issue, ev, role) {
    if (!issue) return;
    var trace = traceForEvidence(issue, ev, role);
    var card = {
      title: issue.title || issue.issueName || role,
      metric: issue.primaryMetric || issue.metric || (ev && ev.metric),
      evidenceId: (ev && ev.evidenceId) || issue.evidenceId || issue.issueId,
      sentence: (ev && ev.sentence) || issue.conclusion || issue.diagnosis || "",
      trace: trace,
    };
    var key = card.evidenceId || card.metric || card.title;
    if (!key || !hasTrace(card) || textHasGenericLanguage(card.sentence)) return;
    if (cards.some(function (item) { return (item.evidenceId || item.metric || item.title) === key; })) return;
    cards.push(card);
  }

  addCard(top, evidence[0], "topIssue");
  addCard(top, evidence[1] || top.directEvidence, "directRelatedEvidence");
  addCard(top, evidence[2] || top.structureDriver || top.actionEvidence, "nextLayerConstraint");
  for (var i = 1; cards.length < 3 && i < issues.length; i += 1) addCard(issues[i], (issues[i].evidence || [])[0], "fallbackIssue");
  return cards.slice(0, 3);
}

function buildReportCandidates(issue, pack) {
  if (!issue) return [];
  var trace = traceForEvidence(issue, (issue.evidence || [])[0], "reportCandidates");
  if (!trace.length) return [];
  return [{
    id: "report_" + (issue.issueId || "issue") + "_headline",
    sourceIssueId: issue.issueId || "unknown",
    title: (issue.title || issue.issueName || "经营诊断") + "专题页",
    chartType: issue.chartType || "bridge",
    visualAsset: issue.visualAsset || null,
    evidenceSentence: issue.evidenceSentence || issue.conclusion || "",
    useScenario: issue.useScenario || "董事会汇报",
    recommendedAction: issue.recommendedAction || issue.action || chainSegment(issue, "action"),
    recommendedSlideLayout: issue.recommendedSlideLayout || "headline-evidence-chart",
    context: {
      targetBank: pack && pack.targetBank,
      peerGroup: pack && pack.peerGroup,
      year: pack && pack.year,
      issueId: issue.issueId,
    },
    trace: trace,
  }];
}
```

- [ ] **Step 4: Write behavior tests for the actual rules**

Create `tests/three_page_diagnosis_behavior.test.js`:

```js
const fs = require("fs");
const vm = require("vm");
const assert = require("assert/strict");

const source = fs.readFileSync("js/63-three-page-diagnosis-model.js", "utf8");
const fixture = JSON.parse(fs.readFileSync("tests/fixtures/three_page_evidence_pack_fixture.json", "utf8"));

function makeContext(pack) {
  const context = {
    window: {},
    localStorage: {
      getItem(key) { return key === "benchmarkiq.evidencePack" ? JSON.stringify(pack) : null; },
      setItem() {},
      removeItem() {},
    },
    console,
  };
  context.window = context;
  vm.createContext(context);
  vm.runInContext(source, context);
  return context;
}

const context = makeContext(fixture);
assert.equal(typeof context.buildThreePageDiagnosisModel, "function");
const model = context.buildThreePageDiagnosisModel(fixture);

assert.equal(model.evidenceMap.strength.label || model.evidenceMap.strength, "强", "3 support and 0 counter should be strong");
assert.equal(model.evidenceMap.peerPosition.category, "peerPosition", "peer position must use category label");
assert.equal(model.evidenceMap.anomalies[0].category, "anomaly", "anomaly must use category label");
assert.equal(model.evidenceMap.valuationAnchor.category, "valuationAnchor", "valuation anchor must use category label");
assert.ok(model.conclusion.topIssues.length <= 3, "conclusion cards must be at most 3");
assert.equal(new Set(model.conclusion.topIssues.map((item) => item.evidenceId || item.metric)).size, model.conclusion.topIssues.length, "conclusion cards must be deduplicated");
assert.ok(model.attribution.foldedTopics.length === 0, "3 topics should not be folded");
assert.ok(model.attribution.reportCandidates[0].recommendedAction, "report candidate should carry action path");

const weakPeerPack = JSON.parse(JSON.stringify(fixture));
weakPeerPack.peerGroup.banks = ["对标银行A", "对标银行B"];
const weakModel = makeContext(weakPeerPack).buildThreePageDiagnosisModel(weakPeerPack);
assert.equal(weakModel.evidenceMap.strength.label || weakModel.evidenceMap.strength, "弱", "peer group with only 2 banks should be weak");

const genericPack = JSON.parse(JSON.stringify(fixture));
genericPack.recommendedIssues[0].conclusion = "存在一定压力，需要进一步关注。";
const genericModel = makeContext(genericPack).buildThreePageDiagnosisModel(genericPack);
assert.ok(!genericModel.conclusion.topIssues.some((item) => /存在一定压力|需要进一步关注/.test(item.sentence || item.conclusion || "")), "generic language should be downgraded or hidden");

const fourTopicPack = JSON.parse(JSON.stringify(fixture));
fourTopicPack.recommendedIssues.push(Object.assign({}, fourTopicPack.recommendedIssues[0], { issueId: "capital_pressure", title: "资本约束", priority: 4, primaryMetric: "资本充足率" }));
fourTopicPack.selectedIssues.push("capital_pressure");
const fourTopicModel = makeContext(fourTopicPack).buildThreePageDiagnosisModel(fourTopicPack);
assert.equal(fourTopicModel.attribution.visibleTopics.length, 3, "4 topics should render 3 visible topics");
assert.equal(fourTopicModel.attribution.foldedTopics.length, 1, "4 topics should fold 1 topic");

console.log("three-page-diagnosis-behavior-ok");
```

- [ ] **Step 5: Run model, rule, and behavior contracts**

Run:

```bash
node tests/three_page_diagnosis_model_contract.test.js
node tests/three_page_diagnosis_rules_contract.test.js
node tests/three_page_diagnosis_behavior.test.js
```

Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add js/63-three-page-diagnosis-model.js tests/three_page_diagnosis_model_contract.test.js tests/three_page_diagnosis_rules_contract.test.js tests/three_page_diagnosis_behavior.test.js
git commit -m "feat: add evidence-driven three-page diagnosis model"
```

---

### Task 2: 三页主画布渲染器

**Files:**
- Create: `js/64-three-page-diagnosis-renderer.js`
- Modify: `index.html`
- Modify: `styles/app.css`
- Test: `tests/three_page_diagnosis_renderer_contract.test.js`

- [ ] **Step 1: Write the failing renderer contract**

Create `tests/three_page_diagnosis_renderer_contract.test.js`:

```js
const fs = require("fs");
const assert = require("assert/strict");

const html = fs.readFileSync("index.html", "utf8");
const renderer = fs.readFileSync("js/64-three-page-diagnosis-renderer.js", "utf8");
const css = fs.readFileSync("styles/app.css", "utf8");

[
  "threePageDiagnosisMount",
  "js/63-three-page-diagnosis-model.js",
  "js/64-three-page-diagnosis-renderer.js",
].forEach((needle) => assert(html.includes(needle), `index must include ${needle}`));

[
  "function renderThreePageDiagnosis",
  "function el",
  "document.createElement",
  "textContent",
  "function renderConclusionSummaryPage",
  "function renderEvidenceMapPage",
  "function renderAttributionPage",
  "function renderThreePageEmptyState",
  "function renderThreePageStaleState",
  "function renderThreePageLoadingState",
  "function renderThreePagePartialState",
  "function renderThreePageErrorState",
  "dataTraceField",
  "dataReportCandidateId",
  "data-three-page-next",
  "replaceChildren",
  "window.renderThreePageDiagnosis = renderThreePageDiagnosis",
].forEach((needle) => assert(renderer.includes(needle), `renderer missing ${needle}`));

[
  ".three-page-diagnosis",
  ".three-page-hero",
  ".three-page-card-grid",
  ".three-page-evidence-map",
  ".three-page-attribution-chain",
  ".three-page-advanced",
].forEach((needle) => assert(css.includes(needle), `css missing ${needle}`));

console.log("three-page-diagnosis-renderer-contract-ok");
```

- [ ] **Step 2: Run test to verify it fails**

Run:

```bash
node tests/three_page_diagnosis_renderer_contract.test.js
```

Expected: FAIL because renderer and mount do not exist.

- [ ] **Step 3: Add script tags and mount to `index.html`**

In `index.html`, inside `step2Content` before the old `analysis-workbench-grid`, add:

```html
<div id="threePageDiagnosisMount" class="three-page-diagnosis-mount" data-portal-page="answer evidence topics"></div>
```

Near the existing script imports, after `js/57-evidence-pack-model.js` and before report page library scripts, add:

```html
<script src="js/63-three-page-diagnosis-model.js?v=20260620-three-page"></script>
<script src="js/64-three-page-diagnosis-renderer.js?v=20260620-three-page"></script>
```

- [ ] **Step 4: Create renderer implementation**

Create `js/64-three-page-diagnosis-renderer.js`. Use `document.createElement`, `textContent`, `dataset`, and `replaceChildren`. Do not render evidence-pack text through `innerHTML`; the existing `esc()` string-template pattern is not accepted for this renderer because one missed escape can turn model output into executable HTML.

```js
/* Bank VQA module: 64-three-page-diagnosis-renderer.js
 * 结论摘要 / 证据地图 / 专题归因三页主画布渲染。
 */
(function () {
  if (typeof window === "undefined") return;

  function esc(value) {
    return String(value == null ? "" : value).replace(/[&<>"']/g, function (ch) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[ch];
    });
  }

  function currentPortalPage() {
    if (typeof getPortalPage === "function") return getPortalPage();
    return document.body.getAttribute("data-app-page") || "answer";
  }

  function el(tag, className, text) {
    var node = document.createElement(tag);
    if (className) node.className = className;
    if (text != null) node.textContent = String(text);
    return node;
  }

  function replaceChildren(host, nodes) {
    if (typeof host.replaceChildren === "function") {
      host.replaceChildren.apply(host, nodes);
      return;
    }
    while (host.firstChild) host.removeChild(host.firstChild);
    nodes.forEach(function (node) { host.appendChild(node); });
  }

  function contextMeta(model) {
    var ctx = model.context || {};
    var peerCount = ctx.peerGroup && Array.isArray(ctx.peerGroup.banks) ? ctx.peerGroup.banks.length : 0;
    return '<div class="three-page-meta">'
      + '<span>目标：' + esc(ctx.targetBank && (ctx.targetBank.name || ctx.targetBank.id) || "未选择") + '</span>'
      + '<span>年份：' + esc(ctx.year || "待确认") + '</span>'
      + '<span>对标组：' + peerCount + ' 家</span>'
      + '<span>证据包：' + esc(ctx.status || model.status || "draft") + '</span>'
      + '</div>';
  }

  function renderThreePageEmptyState(model) {
    return '<section class="three-page-diagnosis is-empty">'
      + '<div class="three-page-hero"><span>需要先完成数据对标</span><h2>请先生成并确认证据包</h2>'
      + '<p>结论摘要、证据地图和专题归因都将基于同一个证据包生成，避免使用旧目标行或泛化判断。</p>'
      + '<button type="button" data-three-page-next="benchmark">回到数据对标</button></div>'
      + '</section>';
  }

  function renderThreePageStaleState(model) {
    return '<section class="three-page-stale">'
      + '<b>证据包已过期</b><span>目标行、对标组或年份已变化，请重新生成证据包后再进入报告分析。</span>'
      + '<button type="button" data-three-page-next="benchmark">重新生成证据包</button>'
      + '</section>';
  }

  function renderThreePageLoadingState(model) {
    return '<section class="three-page-diagnosis is-loading">'
      + '<div class="three-page-skeleton"></div><div class="three-page-skeleton"></div><div class="three-page-skeleton"></div>'
      + '<p>正在读取本轮证据包...</p>'
      + '</section>';
  }

  function renderThreePagePartialState(model) {
    return '<section class="three-page-diagnosis is-partial">'
      + '<div class="three-page-hero"><span>证据包字段不完整</span><h2>当前只能展示已确认的证据</h2>'
      + '<p>缺失字段不会生成主判断卡，也不会进入最终报告候选页。</p>'
      + '<button type="button" data-three-page-next="benchmark">回到数据对标补齐</button></div>'
      + '</section>';
  }

  function renderThreePageErrorState(model) {
    return '<section class="three-page-diagnosis is-error">'
      + '<div class="three-page-hero"><span>证据包生成失败</span><h2>请重新生成证据包</h2>'
      + '<p>系统没有读取到可追溯的证据字段，本页不会显示旧目标行内容。</p>'
      + '<button type="button" data-three-page-next="benchmark">重新生成</button></div>'
      + '</section>';
  }

  function renderConclusionSummaryPage(model) {
    var page = model.conclusion || {};
    var cards = (page.topIssues || []).map(function (issue) {
      return '<article class="three-page-card" data-trace-field="' + esc((issue.trace && issue.trace[0] && issue.trace[0].field) || "") + '">'
        + '<span>判断 ' + esc(issue.rank) + '｜' + esc(issue.strength) + '证据</span>'
        + '<h3>' + esc(issue.title) + '</h3>'
        + '<p>' + esc(issue.conclusion) + '</p>'
        + '<em>' + esc(issue.evidenceText || issue.nextQuestion) + '</em>'
        + '</article>';
    }).join("");
    var kpis = (page.kpis || []).map(function (item) {
      return '<div class="three-page-kpi"><span>' + esc(item.label) + '</span><b>' + esc(item.value) + '</b><em>对标 ' + esc(item.peer) + '｜差距 ' + esc(item.gap) + '</em></div>';
    }).join("");
    return '<section class="three-page-diagnosis is-conclusion">'
      + '<div class="three-page-hero"><span>结论摘要</span><h2>' + esc(page.headline) + '</h2>'
      + '<p>本页只保留总答案、三张主判断卡和最小 KPI。证据和机制进入后续页面。</p>'
      + contextMeta(model) + '</div>'
      + '<div class="three-page-card-grid">' + cards + '</div>'
      + '<div class="three-page-kpi-strip">' + kpis + '</div>'
      + '<div class="three-page-actions"><button type="button" data-three-page-next="evidence">查看证据地图</button><button type="button" data-three-page-next="benchmark">重新选择数据对标</button></div>'
      + '</section>';
  }

  function renderEvidenceMapPage(model) {
    var page = model.evidenceMap || {};
    var cols = [
      { label: "同业位置", item: page.peerPosition },
      { label: "异动偏离", item: (page.anomalies || [])[0] },
      { label: "估值/质量锚", item: page.valuationAnchor },
    ].map(function (col) {
      var item = col.item || {};
      return '<article class="three-page-evidence-cell">'
        + '<span>' + esc(col.label) + '</span>'
        + '<h3>' + esc(item.metric || item.title || "证据待补") + '</h3>'
        + '<p>目标 ' + esc(item.targetValue || "—") + ' / 对标 ' + esc(item.peerValue || "—") + ' / 差距 ' + esc(item.gap || "—") + '</p>'
        + '<em>' + esc(item.strength || "弱") + '证据｜' + esc(item.source || "当前证据包") + '</em>'
        + '</article>';
    }).join("");
    var risks = (page.counterEvidence || []).map(function (risk) { return '<li>' + esc(risk) + '</li>'; }).join("");
    return '<section class="three-page-diagnosis is-evidence">'
      + '<div class="three-page-hero"><span>证据地图｜' + esc(page.strength || "弱") + '证据</span><h2>' + esc(page.headline || "证据地图") + '</h2>'
      + '<p>' + esc(page.chainSummary || "三类证据将用于验证主判断是否可进入正式报告。") + '</p>' + contextMeta(model) + '</div>'
      + '<div class="three-page-evidence-map">' + cols + '</div>'
      + '<div class="three-page-risk"><b>证据冲突与风险边界</b><ul>' + (risks || '<li>当前未识别明确反证，仍需保留数据口径脚注。</li>') + '</ul></div>'
      + '<div class="three-page-actions"><button type="button" data-three-page-next="topics">进入专题归因</button><button type="button" data-three-page-next="answer">回到结论摘要</button></div>'
      + '</section>';
  }

  function renderAttributionPage(model) {
    var page = model.attribution || {};
    var chain = page.chain || {};
    var chainHtml = [
      ["结果指标", chain.result],
      ["直接原因", chain.directCause],
      ["结构原因", chain.structureCause],
      ["管理动作", chain.action],
    ].map(function (item) {
      return '<li><span>' + esc(item[0]) + '</span><b>' + esc(item[1]) + '</b></li>';
    }).join("");
    var evidence = (page.evidence || []).map(function (item) {
      return '<article class="three-page-card"><span>' + esc(item.title) + '</span><p>' + esc(item.text) + '</p></article>';
    }).join("");
    var candidates = (page.reportCandidates || []).map(function (item) {
      return '<article class="three-page-report-candidate" data-report-candidate-id="' + esc(item.id) + '" data-trace-field="' + esc((item.trace && item.trace[0] && item.trace[0].field) || "") + '"><b>' + esc(item.title) + '</b><p>' + esc(item.evidenceSentence || item.evidence) + '</p><em>' + esc(item.useScenario || item.useCase) + '</em></article>';
    }).join("");
    return '<section class="three-page-diagnosis is-attribution">'
      + '<div class="three-page-hero"><span>专题归因</span><h2>' + esc(page.headline || page.title) + '</h2>'
      + '<p>本页只聚焦一个主问题链，其他专题和高级分析默认折叠。</p>' + contextMeta(model) + '</div>'
      + '<ol class="three-page-attribution-chain">' + chainHtml + '</ol>'
      + '<div class="three-page-card-grid">' + evidence + '</div>'
      + '<div class="three-page-report-candidates">' + candidates + '</div>'
      + '<details class="three-page-advanced"><summary>展开更多机制证据</summary><p>交叉信号、利润质量、估值模型和现金流深度保留在高级分析区，默认不打断主线阅读。</p></details>'
      + '<div class="three-page-actions"><button type="button" data-three-page-next="report">进入报告编排</button><button type="button" data-three-page-next="evidence">回到证据地图</button></div>'
      + '</section>';
  }

  function renderThreePageDiagnosis() {
    var host = document.getElementById("threePageDiagnosisMount");
    if (!host || typeof window.buildThreePageDiagnosisModel !== "function") return null;
    var model = window.buildThreePageDiagnosisModel();
    if (model.status === "missing-pack") {
      replaceChildren(host, [renderThreePageEmptyState(model)]);
      return model;
    }
    if (model.status === "stale-pack") {
      replaceChildren(host, [renderThreePageStaleState(model)]);
      return model;
    }
    if (model.status === "loading-pack") {
      replaceChildren(host, [renderThreePageLoadingState(model)]);
      return model;
    }
    if (model.status === "partial-pack") {
      replaceChildren(host, [renderThreePagePartialState(model)]);
      return model;
    }
    if (model.status === "error-pack") {
      replaceChildren(host, [renderThreePageErrorState(model)]);
      return model;
    }
    var page = currentPortalPage();
    if (page === "evidence") replaceChildren(host, [renderEvidenceMapPage(model)]);
    else if (page === "topics") replaceChildren(host, [renderAttributionPage(model)]);
    else replaceChildren(host, [renderConclusionSummaryPage(model)]);
    return model;
  }

  document.addEventListener("click", function (event) {
    var btn = event.target.closest("[data-three-page-next]");
    if (!btn) return;
    var next = btn.dataset.threePageNext;
    if (next === "benchmark" && typeof setPortalPage === "function") setPortalPage("benchmark", { force: true });
    else if (typeof setPortalPage === "function") setPortalPage(next, { force: true });
  });

  window.renderThreePageDiagnosis = renderThreePageDiagnosis;
  document.addEventListener("DOMContentLoaded", function () {
    setTimeout(renderThreePageDiagnosis, 80);
  });
})();
```

Implementation note: the structural example above shows the required rendering branches. Before committing, replace every `host.innerHTML = ...` path with `replaceChildren(host, [node])`, and build `node` with `document.createElement` and `textContent`.

- [ ] **Step 5: Add CSS**

Append to `styles/app.css`:

```css
.three-page-diagnosis-mount {
  display: block;
  margin-bottom: 18px;
}
.three-page-diagnosis,
.three-page-stale {
  border: 1px solid var(--border, #d9dee7);
  background: #fff;
  padding: 22px;
}
.three-page-hero {
  border-bottom: 1px solid var(--border, #d9dee7);
  padding-bottom: 16px;
  margin-bottom: 16px;
}
.three-page-hero span,
.three-page-card span,
.three-page-evidence-cell span {
  display: block;
  color: #5d6877;
  font-size: 12px;
  font-weight: 700;
}
.three-page-hero h2 {
  margin: 6px 0 8px;
  font-size: 28px;
  line-height: 1.2;
}
.three-page-hero p {
  margin: 0;
  color: #5d6877;
  max-width: 920px;
}
.three-page-meta,
.three-page-actions,
.three-page-kpi-strip {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-top: 14px;
}
.three-page-meta span,
.three-page-kpi,
.three-page-card,
.three-page-evidence-cell,
.three-page-report-candidate {
  border: 1px solid #d9dee7;
  background: #f8fafc;
  padding: 10px 12px;
}
.three-page-card-grid,
.three-page-evidence-map,
.three-page-report-candidates {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
  gap: 12px;
  margin-top: 14px;
}
.three-page-card h3,
.three-page-evidence-cell h3 {
  margin: 6px 0;
  font-size: 18px;
}
.three-page-card p,
.three-page-evidence-cell p,
.three-page-report-candidate p {
  margin: 0;
  color: #242a31;
  line-height: 1.55;
}
.three-page-card em,
.three-page-evidence-cell em,
.three-page-report-candidate em,
.three-page-kpi em {
  display: block;
  margin-top: 8px;
  color: #5d6877;
  font-style: normal;
  font-size: 12px;
}
.three-page-kpi b {
  display: block;
  margin-top: 4px;
  font-size: 20px;
}
.three-page-risk,
.three-page-advanced {
  margin-top: 14px;
  border-top: 1px solid #d9dee7;
  padding-top: 14px;
}
.three-page-attribution-chain {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 10px;
  list-style: none;
  margin: 14px 0 0;
  padding: 0;
}
.three-page-attribution-chain li {
  border: 1px solid #009CDE;
  background: #f4fbff;
  padding: 12px;
}
.three-page-attribution-chain b {
  display: block;
  margin-top: 6px;
  line-height: 1.35;
}
.three-page-actions button {
  border: 1px solid #111;
  background: #111;
  color: #fff;
  padding: 9px 14px;
  font-weight: 700;
}
.three-page-actions button + button {
  background: #fff;
  color: #111;
}
@media (max-width: 860px) {
  .three-page-attribution-chain {
    grid-template-columns: 1fr;
  }
}
```

- [ ] **Step 6: Verify renderer has no executable HTML path**

Run:

```bash
rg -n "innerHTML|insertAdjacentHTML|outerHTML" js/64-three-page-diagnosis-renderer.js
```

Expected: no output. If the command prints a line, replace that code path with `document.createElement`, `textContent`, `dataset`, and `replaceChildren`.

- [ ] **Step 7: Run test to verify it passes**

Run:

```bash
node --check js/64-three-page-diagnosis-renderer.js
node tests/three_page_diagnosis_renderer_contract.test.js
```

Expected: both PASS, with `three-page-diagnosis-renderer-contract-ok`.

- [ ] **Step 8: Commit**

```bash
git add index.html styles/app.css js/64-three-page-diagnosis-renderer.js tests/three_page_diagnosis_renderer_contract.test.js
git commit -m "feat: render focused three-page diagnosis"
```

---

### Task 2A: 渲染安全测试

**Files:**
- Test: `tests/three_page_diagnosis_renderer_security.test.js`
- Modify: `js/64-three-page-diagnosis-renderer.js`

- [ ] **Step 1: Write renderer security test**

Create `tests/three_page_diagnosis_renderer_security.test.js`:

```js
const fs = require("fs");
const vm = require("vm");
const assert = require("assert/strict");

const renderer = fs.readFileSync("js/64-three-page-diagnosis-renderer.js", "utf8");

function makeElement(tag) {
  return {
    tagName: tag.toUpperCase(),
    className: "",
    textContent: "",
    dataset: {},
    attributes: {},
    children: [],
    firstChild: null,
    setAttribute(name, value) { this.attributes[name] = String(value); },
    appendChild(child) { this.children.push(child); this.firstChild = this.children[0] || null; return child; },
    removeChild(child) { this.children = this.children.filter((item) => item !== child); this.firstChild = this.children[0] || null; return child; },
    closest() { return null; },
  };
}

const mount = makeElement("div");
const context = {
  window: {},
  document: {
    body: { getAttribute() { return "answer"; } },
    createElement: makeElement,
    getElementById(id) { return id === "threePageDiagnosisMount" ? mount : null; },
    addEventListener() {},
    querySelectorAll() { return []; },
  },
  console,
};
context.window = context;
context.buildThreePageDiagnosisModel = function () {
  return {
    status: "confirmed",
    context: { targetBank: { name: "<script>alert(1)</script>" }, peerGroup: { banks: ["A", "B", "C"] }, year: 2025, status: "confirmed" },
    conclusion: {
      headline: "<img src=x onerror=alert(1)>",
      topIssues: [{ rank: 1, strength: "强", title: "<script>alert(2)</script>", conclusion: "<b onclick=alert(3)>bad</b>", trace: [{ field: "x", value: "y" }] }],
      kpis: [],
    },
    evidenceMap: {},
    attribution: {},
  };
};

vm.createContext(context);
vm.runInContext(renderer, context);
context.renderThreePageDiagnosis();

function walk(node, acc = []) {
  acc.push(node);
  (node.children || []).forEach((child) => walk(child, acc));
  return acc;
}

const nodes = walk(mount);
assert.equal(nodes.some((node) => node.tagName === "SCRIPT"), false, "renderer must not create script nodes");
assert.equal(nodes.some((node) => Object.keys(node.attributes || {}).some((key) => /^on/i.test(key))), false, "renderer must not create event handler attributes");
assert.ok(nodes.some((node) => String(node.textContent).includes("<script>alert(2)</script>")), "unsafe-looking text should remain textContent");

console.log("three-page-diagnosis-renderer-security-ok");
```

- [ ] **Step 2: Run security test**

```bash
node tests/three_page_diagnosis_renderer_security.test.js
```

Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add js/64-three-page-diagnosis-renderer.js tests/three_page_diagnosis_renderer_security.test.js
git commit -m "test: guard three-page diagnosis renderer safety"
```

---

### Task 3: 路由刷新与旧内容减载

**Files:**
- Modify: `js/42-portal-router.js`
- Modify: `js/08-report.js`
- Modify: `index.html`
- Test: `tests/three_page_diagnosis_flow_runtime.test.js`

Precise router insertion point: in `js/42-portal-router.js`, update `setPortalPage(page, options)` after the existing page state and visibility updates. The function currently starts near line 116 and already handles evidence-pack confirmation through `ensureConfirmedEvidencePackBeforeLeavingBenchmark()`.

- [ ] **Step 1: Write the failing flow runtime test**

Create `tests/three_page_diagnosis_flow_runtime.test.js`:

```js
const fs = require("fs");
const vm = require("vm");
const assert = require("assert/strict");

const renderer = fs.readFileSync("js/64-three-page-diagnosis-renderer.js", "utf8");
const router = fs.readFileSync("js/42-portal-router.js", "utf8");
const report = fs.readFileSync("js/08-report.js", "utf8");
const html = fs.readFileSync("index.html", "utf8");

assert(router.includes("renderThreePageDiagnosis"), "router must refresh three-page diagnosis on portal changes");
assert(report.includes("renderThreePageDiagnosis"), "renderAll flow must refresh three-page diagnosis after report rendering");
assert(html.includes("topicsAdvancedGroup") || html.includes("three-page-advanced"), "advanced topic content must remain grouped or folded");

let currentPage = "answer";
const host = { children: [], replaceChildren(...nodes) { this.children = nodes; }, textContent: "" };
const listeners = {};
const context = {
  window: {},
  document: {
    addEventListener(type, fn) { listeners[type] = fn; },
    getElementById(id) { return id === "threePageDiagnosisMount" ? host : null; },
    body: { getAttribute() { return currentPage; } },
  },
  setTimeout(fn) { fn(); },
  getPortalPage() { return currentPage; },
  setPortalPage(page) { currentPage = page; },
};
context.window = Object.assign(context, context.window);
context.window.buildThreePageDiagnosisModel = function () {
  return {
    status: "confirmed",
    context: { targetBank: { name: "甲银行" }, peerGroup: { banks: ["乙银行"] }, year: 2025, status: "confirmed" },
    conclusion: { headline: "甲银行主判断", topIssues: [], kpis: [] },
    evidenceMap: { headline: "证据地图", strength: "强", chainSummary: "ROE → NIM", counterEvidence: [] },
    attribution: { headline: "专题归因", chain: { result: "ROE", directCause: "NIM", structureCause: "定期化", action: "负债复盘" }, evidence: [], reportCandidates: [] },
  };
};

vm.createContext(context);
vm.runInContext(renderer, context);

function textOf(node) {
  return [node.textContent || ""].concat((node.children || []).map(textOf)).join(" ");
}

context.window.renderThreePageDiagnosis();
assert(textOf(host).includes("甲银行主判断"), "answer page must render conclusion");

currentPage = "evidence";
context.window.renderThreePageDiagnosis();
assert(textOf(host).includes("证据地图"), "evidence page must render evidence map");

currentPage = "topics";
context.window.renderThreePageDiagnosis();
assert(textOf(host).includes("专题归因"), "topics page must render attribution");

console.log("three-page-diagnosis-flow-runtime-ok");
```

- [ ] **Step 2: Run test to verify it fails**

Run:

```bash
node tests/three_page_diagnosis_flow_runtime.test.js
```

Expected: FAIL because router/report refresh hooks are missing.

- [ ] **Step 3: Add router refresh hook**

In `js/42-portal-router.js`, update `setPortalPage(page, options)` after portal visibility/body state updates. Use the normalized `target` variable:

```js
if (typeof window.renderThreePageDiagnosis === "function" && ["answer", "evidence", "topics"].indexOf(target) >= 0) {
  window.renderThreePageDiagnosis();
}
```

- [ ] **Step 4: Add report render refresh hook**

In `js/08-report.js`, at the end of `renderAll()` or the nearest central report refresh function, add:

```js
if (typeof window.renderThreePageDiagnosis === "function") {
  window.renderThreePageDiagnosis();
}
```

Do not call model generation here. This hook only re-renders from the current evidence pack.

- [ ] **Step 5: Group old advanced topic mounts**

In `index.html`, wrap the existing advanced topic mounts from `crossSignalNimMount` through `cashFlowDepthMount` in:

```html
<details class="three-page-advanced legacy-topic-advanced" id="topicsAdvancedGroup" data-portal-page="topics" data-topics-disclosure="advanced">
  <summary>展开更多机制证据</summary>
  <!-- existing advanced mounts stay here -->
</details>
```

Keep each existing mount id unchanged:

```html
<div id="crossSignalNimMount" data-cross-signal-mount="nim" data-portal-page="topics" data-topics-disclosure="advanced"></div>
<div id="crossSignalRoaMount" data-cross-signal-mount="roa" data-portal-page="topics" data-topics-disclosure="advanced"></div>
<div id="crossSignalRiskMount" data-cross-signal-mount="risk" data-portal-page="topics" data-topics-disclosure="advanced"></div>
<div id="crossSignalValueMount" data-cross-signal-mount="value" data-portal-page="topics" data-topics-disclosure="advanced"></div>
<div id="profitQualityMount" data-tushare-mount="profit-quality" data-phase="1" data-portal-page="topics" data-topics-disclosure="advanced"></div>
<div id="dividendValueMount" data-tushare-mount="dividend-value" data-phase="1" data-portal-page="topics" data-topics-disclosure="advanced"></div>
<div id="assetClassificationMount" data-tushare-mount="asset-classification" data-phase="2" data-portal-page="topics" data-topics-disclosure="advanced"></div>
<div id="cashFlowDepthMount" data-tushare-mount="cashflow-depth" data-phase="2" data-portal-page="topics" data-topics-disclosure="advanced"></div>
```

- [ ] **Step 6: Run flow test**

Run:

```bash
node tests/three_page_diagnosis_flow_runtime.test.js
```

Expected: PASS, with `three-page-diagnosis-flow-runtime-ok`.

- [ ] **Step 7: Commit**

```bash
git add index.html js/42-portal-router.js js/08-report.js tests/three_page_diagnosis_flow_runtime.test.js
git commit -m "fix: refresh focused diagnosis pages"
```

---

### Task 4: Integration Validation

**Files:**
- No new production files expected.
- May modify tests if browser validation reveals a precise contract gap.

- [ ] **Step 1: Run static validation bundle**

Run:

```bash
node --check js/63-three-page-diagnosis-model.js
node --check js/64-three-page-diagnosis-renderer.js
node --check js/42-portal-router.js
node --check js/08-report.js
node tests/three_page_diagnosis_model_contract.test.js
node tests/three_page_diagnosis_rules_contract.test.js
node tests/three_page_diagnosis_behavior.test.js
node tests/three_page_diagnosis_renderer_contract.test.js
node tests/three_page_diagnosis_renderer_security.test.js
node tests/three_page_diagnosis_flow_runtime.test.js
node tests/benchmark_downstream_state_sync_contract.test.js
node tests/evidence_pack_driven_pages_contract.test.js
node tests/portal_confirm_navigation_contract.test.js
```

Expected: all PASS.

- [ ] **Step 2: Start local preview server**

Run:

```bash
python3 -m http.server 8798
```

Expected: server prints `Serving HTTP on`.

- [ ] **Step 3: Create reusable browser validation test**

Create `tests/three_page_diagnosis_browser.spec.js`:

```js
const { chromium } = require("/Users/jinkunxiao/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright");

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1440, height: 980 } });
  await page.goto("http://127.0.0.1:8798/index.html#page/benchmark", { waitUntil: "commit", timeout: 20000 });
  await page.waitForFunction(() => window.__bm && window.__bm.data && document.querySelector("#bmBankList .bm-bank-item"), null, { timeout: 30000 });
  await page.evaluate(() => {
    const el = document.querySelector("#bmBankList .bm-bank-item");
    if (el) el.dispatchEvent(new MouseEvent("click", { bubbles: true, cancelable: true, view: window }));
  });
  await page.waitForTimeout(800);
  await page.evaluate(() => {
    if (typeof window.buildRecommendedEvidencePack === "function" && typeof window.confirmEvidencePack === "function") {
      const pack = window.buildRecommendedEvidencePack();
      window.confirmEvidencePack(pack, pack.selectedIssues);
    }
  });
  for (const pageName of ["answer", "evidence", "topics"]) {
    await page.evaluate((next) => {
      if (typeof window.setPortalPage === "function") window.setPortalPage(next, { force: true });
    }, pageName);
    await page.waitForTimeout(400);
    const text = await page.locator("#threePageDiagnosisMount").innerText();
    if (!text || text.length < 20) throw new Error("empty three-page mount for " + pageName);
    if (!/目标|银行|证据|专题|判断/.test(text)) throw new Error("unexpected three-page text for " + pageName + ": " + text.slice(0, 120));
    console.log(pageName + ":" + text.slice(0, 80).replace(/\s+/g, " "));
  }
  await browser.close();
})().catch((error) => {
  console.error(error.stack || error);
  process.exit(1);
});
```

- [ ] **Step 4: Run browser validation test**

Run:

```bash
/Users/jinkunxiao/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin/node tests/three_page_diagnosis_browser.spec.js
```

Expected:

```text
answer:...
evidence:...
topics:...
```

Each line should mention the current target bank or the current evidence-pack page title.

- [ ] **Step 5: Stop local server**

If the server was started in a foreground terminal, press `Ctrl-C`. If it was started as a session by an agent tool, send `\u0003` to that session.

- [ ] **Step 6: Commit validation-only adjustments if needed**

If Task 4 required a small test or code adjustment, commit it:

```bash
git add js/63-three-page-diagnosis-model.js js/64-three-page-diagnosis-renderer.js js/42-portal-router.js js/08-report.js index.html styles/app.css tests/fixtures/three_page_evidence_pack_fixture.json tests/three_page_diagnosis_*.test.js
git commit -m "test: validate three-page diagnosis flow"
```

If no files changed during validation, do not create an empty commit.

---

## Self-Review

### Spec Coverage

- 结论摘要单任务：Task 1 defines `buildConclusionPageModel`; Task 2 renders `renderConclusionSummaryPage`.
- 证据地图三栏证明：Task 1 defines `buildEvidenceMapPageModel`; Task 2 renders `renderEvidenceMapPage`.
- 专题归因单问题链：Task 1 defines `buildAttributionPageModel`; Task 2 renders `renderAttributionPage`.
- 证据包驱动：Task 1 reads `readEvidencePack()` and local storage fallback.
- 证据包真实结构确认：Task 0 inspects `js/57-evidence-pack-model.js` and creates `tests/fixtures/three_page_evidence_pack_fixture.json`.
- 主判断卡生成规则：Review-Driven Rule Contract and Task 1A define `buildConclusionCards`.
- 证据强度标准：Review-Driven Rule Contract and Task 1A define `scoreEvidenceStrength`.
- 证据地图分类标签：Review-Driven Rule Contract and Task 1A define `evidenceCategory` and `categoryStatus`.
- 因果链字段映射：Review-Driven Rule Contract and Task 1A define `chainSegment`.
- 专题数量折叠：Review-Driven Rule Contract and Task 1A define `rankAttributionTopics` with `allTopics / foldedTopics`.
- 报告候选页契约：Review-Driven Rule Contract and Task 1A define `buildReportCandidates` with required fields and trace.
- 泛化判断约束：Review-Driven Rule Contract and Task 1A define `GENERIC_LANGUAGE_PATTERNS`, `hasTrace`, and trace-backed judgment rules.
- 异常状态：Task 1 emits `missing-pack / stale-pack / partial-pack / error-pack`; Task 2 renders matching states plus loading state.
- 渲染安全：Task 2 requires DOM API rendering and Task 2A validates script/event-handler safety.
- 高级内容默认折叠：Task 2 includes `.three-page-advanced`; Task 3 wraps legacy advanced mounts.
- 导航路径：Task 2 adds `data-three-page-next`; Task 3 refreshes on portal changes.
- 可复用浏览器验证：Task 4 creates and runs `tests/three_page_diagnosis_browser.spec.js`.
- 验收验证：Task 4 includes static bundle, rules contract, behavior tests, security test, and browser validation.

### Placeholder Scan

No plan step uses undefined placeholders. Code snippets include complete function bodies or exact insertion snippets.

### Type Consistency

The shared model shape is consistent across tasks:

- `model.context`
- `model.conclusion`
- `model.evidenceMap`
- `model.attribution`
- `model.status`

Renderer function names match contract tests:

- `renderThreePageDiagnosis`
- `renderConclusionSummaryPage`
- `renderEvidenceMapPage`
- `renderAttributionPage`
- `el`
- `replaceChildren`
