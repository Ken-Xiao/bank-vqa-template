# Data Asset Management Report Workbench Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 将数据对标后的证据包收束为一个“管理层诊断包”，并让结论摘要、证据地图、专题归因、报告页库都围绕该诊断包生成更聚焦的内容。

**Architecture:** 在 `js/57-evidence-pack-model.js` 内新增 `managementDiagnosisPack` 适配层，继续复用现有 `benchmarkiq.evidencePack` 存储，不新增后端。`js/19-product-workspace.js` 的三页渲染只读取诊断包视图模型，`js/61-report-page-library-model.js` 从同一诊断包生成候选 PPT 页，避免各页面各自拼结论。

**Tech Stack:** 原生 JavaScript、localStorage、Node `vm` 合约测试、现有 `styles/app.css` 和报告页库组件。

---

## File Structure

- Modify: `js/57-evidence-pack-model.js`
  - 新增 `buildManagementDiagnosisPack(pack)`。
  - 新增 `managementDiagnosisAnswerModel(packOrDiagnosis)`、`managementDiagnosisEvidenceMapModel(packOrDiagnosis)`、`managementDiagnosisTopicModel(packOrDiagnosis)`。
  - 保留 `evidencePackAnswerModel` 等旧函数作为兼容入口，内部转向诊断包模型。

- Modify: `js/19-product-workspace.js`
  - 重构 `renderEvidencePackAnswer`：主视图只展示总判断 + 3 个判断。
  - 重构 `renderEvidencePackMap`：主视图改为判断-证据-可入报告状态索引。
  - 重构 `renderEvidencePackTopics`：只展示 1-3 条强因果链，明细进入折叠层。

- Modify: `js/61-report-page-library-model.js`
  - 让报告页库优先读取 `buildManagementDiagnosisPack()` 的 `candidatePages`。
  - 继续兼容已有 `storyCards` 证据包。

- Modify: `js/62-report-page-library-renderer.js`
  - 在候选页预览中显示来源判断、证据状态、可入报告状态。
  - 保持现有章节树、页面篮子、printDeck 行为。

- Modify: `styles/app.css`
  - 增加管理层判断卡、证据审稿索引、专题链播放器的瘦身样式。

- Modify: `index.html`
  - 刷新 `js/57-evidence-pack-model.js`、`js/19-product-workspace.js`、`js/61-report-page-library-model.js`、`js/62-report-page-library-renderer.js`、`styles/app.css` 的版本号，避免缓存旧交互。

- Create: `tests/management_diagnosis_pack_contract.test.js`
  - 验证诊断包字段、判断数量、证据追溯、专题链数量、候选页数量。

- Create: `tests/management_diagnosis_rendering_contract.test.js`
  - 验证三页渲染从“铺开内容”变为“3 个判断 + 审稿索引 + 1-3 条链”。

- Modify: `tests/report_page_library_model_contract.test.js`
  - 验证报告页库可从 `managementDiagnosisPack.candidatePages` 生成候选页。

---

## Task 1: Management Diagnosis Pack Contract

**Files:**
- Create: `tests/management_diagnosis_pack_contract.test.js`
- Modify: `js/57-evidence-pack-model.js`

- [ ] **Step 1: Write the failing contract test**

Create `tests/management_diagnosis_pack_contract.test.js`:

```js
const fs = require("fs");
const vm = require("vm");
const assert = require("assert/strict");

const src = fs.readFileSync("js/57-evidence-pack-model.js", "utf8");

const samplePack = {
  version: "20260619-2200",
  status: "confirmed",
  targetBank: { id: "CN033", name: "苏州农商行" },
  year: 2025,
  peerGroup: { label: "当前对标组", banks: ["常熟农商行", "瑞丰农商行"] },
  recommendedIssues: [
    {
      issueId: "roe_nim_chain",
      title: "盈利能力承压",
      priority: 1,
      confidence: "高",
      primaryMetric: "ROE",
      conclusion: "ROE 低于对标组，主要受净息差偏低拖累。",
      evidence: [
        { evidenceId: "ev_roe_gap", metric: "ROE", gap: "-2.2pct", strength: "强", direction: "低于同业", targetValue: "8.2%", peerValue: "10.4%" },
        { evidenceId: "ev_nim_gap", metric: "净息差", gap: "-0.31pct", strength: "强", direction: "低于同业", targetValue: "1.55%", peerValue: "1.86%" },
        { evidenceId: "ev_deposit_time", metric: "定期存款占比", gap: "+9.1pct", strength: "中", direction: "高于同业", targetValue: "68.2%", peerValue: "59.1%" }
      ],
      causalChain: ["ROE 低于对标组", "因为净息差低于对标组", "因为定期存款占比高于对标组"],
      action: "优先调整负债结构和高成本存款占比。",
      domainKey: "nim",
      visualAsset: { src: "assets/figures/图3-3_息差缺口与负债成本对照.png", label: "息差传导图" }
    },
    {
      issueId: "asset_quality_buffer",
      title: "资产质量缓冲偏弱",
      priority: 2,
      confidence: "中",
      primaryMetric: "不良率",
      conclusion: "不良率高于对标组，需要结合拨备覆盖率判断风险缓冲。",
      evidence: [
        { evidenceId: "ev_npl_gap", metric: "不良率", gap: "+0.19pct", strength: "中", direction: "高于同业", targetValue: "1.21%", peerValue: "1.02%" },
        { evidenceId: "ev_coverage_gap", metric: "拨备覆盖率", gap: "-44.0pct", strength: "中", direction: "低于同业", targetValue: "182.0%", peerValue: "226.0%" }
      ],
      causalChain: ["不良率高于对标组", "因为对公风险暴露偏高", "拨备覆盖率低于对标组削弱缓冲"],
      action: "复核对公贷款结构和风险迁徙。",
      domainKey: "quality"
    },
    {
      issueId: "capital_efficiency",
      title: "资本效率待提升",
      priority: 3,
      confidence: "低",
      primaryMetric: "资本充足率",
      conclusion: "资本缓冲尚可，但资本回报效率偏低。",
      evidence: [
        { evidenceId: "ev_capital_gap", metric: "核心一级资本充足率", gap: "+0.8pct", strength: "弱", direction: "高于同业", targetValue: "12.1%", peerValue: "11.3%" }
      ],
      causalChain: ["资本缓冲高于对标组", "但 ROE 回报偏低"],
      action: "结合盈利修复评估资本使用效率。",
      domainKey: "capital"
    },
    {
      issueId: "liquidity_signal",
      title: "流动性信号作为附录",
      priority: 4,
      confidence: "低",
      primaryMetric: "流动性覆盖率",
      conclusion: "流动性覆盖率数据可作为附录观察。",
      evidence: [
        { evidenceId: "ev_lcr", metric: "流动性覆盖率", gap: "+5.0pct", strength: "弱", direction: "高于同业", targetValue: "135.0%", peerValue: "130.0%" }
      ],
      causalChain: ["流动性覆盖率高于对标组"],
      action: "暂不进入核心管理层判断。",
      domainKey: "liquidity"
    }
  ],
  selectedIssues: ["roe_nim_chain", "asset_quality_buffer", "capital_efficiency", "liquidity_signal"]
};

const context = {
  window: {},
  localStorage: {
    getItem() { return null; },
    setItem() {},
    removeItem() {}
  }
};
context.window = Object.assign(context.window, context);
vm.createContext(context);
vm.runInContext(src, context);

assert.equal(typeof context.window.buildManagementDiagnosisPack, "function", "buildManagementDiagnosisPack is exported");

const diagnosis = context.window.buildManagementDiagnosisPack(samplePack);

assert.equal(diagnosis.context.targetBank.name, "苏州农商行", "keeps target bank");
assert.equal(diagnosis.context.year, 2025, "keeps year");
assert.equal(diagnosis.judgments.length, 3, "keeps only top 3 management judgments");
assert(diagnosis.executiveAnswer.headline.includes("苏州农商行"), "headline names target bank");
assert(diagnosis.executiveAnswer.priorityJudgments.length === 3, "executive answer has 3 priorities");

const first = diagnosis.judgments[0];
assert.equal(first.id, "roe_nim_chain", "first judgment follows highest priority issue");
assert.equal(first.primaryMetric, "ROE", "first judgment carries primary metric");
assert(first.metricGap.includes("-2.2pct"), "first judgment carries metric gap");
assert(first.causeChain.length >= 3, "first judgment has multi-layer chain");
assert(first.evidenceRefs.includes("ev_roe_gap"), "first judgment references evidence id");
assert.equal(first.reportReadiness, "ready", "strong evidence with causal depth is ready");

assert(diagnosis.evidenceMap.every((row) => row.judgmentId), "evidence rows link to judgments");
assert(diagnosis.evidenceMap.some((row) => row.metricKey === "ROE" && row.dataQuality === "强"), "evidence map preserves strength");

assert(diagnosis.topicChains.length <= 3, "topic chains are capped at 3");
assert(diagnosis.topicChains[0].nodes.join(" → ").includes("定期存款占比"), "topic chain preserves deep reason");

assert(diagnosis.candidatePages.length <= 12, "candidate pages are capped at 12");
assert(diagnosis.candidatePages.some((page) => page.sourceType === "judgment" && page.pageRole === "executive-judgment"), "candidate pages include judgment page");
assert(diagnosis.candidatePages.some((page) => page.sourceType === "topic-chain" && page.pageRole === "management-action"), "candidate pages include management action page");

const serialized = JSON.stringify(diagnosis);
["值得关注", "持续跟踪", "结构承压"].forEach((word) => {
  assert(!serialized.includes(word), "diagnosis pack avoids generic phrase: " + word);
});

console.log("management-diagnosis-pack-contract-ok");
```

- [ ] **Step 2: Run the failing test**

Run:

```bash
node tests/management_diagnosis_pack_contract.test.js
```

Expected: FAIL with `buildManagementDiagnosisPack is exported`.

- [ ] **Step 3: Implement `buildManagementDiagnosisPack`**

Modify `js/57-evidence-pack-model.js` after `evidencePackTopicModel(pack)` and before the `window.*` exports:

```js
  function readinessForIssue(issue) {
    var evidence = issue && Array.isArray(issue.evidence) ? issue.evidence : [];
    var strongCount = evidence.filter(function (ev) { return ev.strength === "强"; }).length;
    var mediumCount = evidence.filter(function (ev) { return ev.strength === "中"; }).length;
    var chainDepth = Array.isArray(issue.causalChain) ? issue.causalChain.length : 0;
    if (strongCount >= 1 && evidence.length >= 2 && chainDepth >= 3) return "ready";
    if (strongCount + mediumCount >= 1 && evidence.length >= 1 && chainDepth >= 2) return "review";
    return "appendix";
  }

  function severityForIssue(issue) {
    var readiness = readinessForIssue(issue);
    if (issue.confidence === "高" && readiness === "ready") return "high";
    if (issue.confidence === "中" || readiness === "review") return "medium";
    return "low";
  }

  function metricGapForIssue(issue) {
    var ev = issue && issue.evidence && issue.evidence[0];
    return ev && ev.gap ? ev.gap : "差距待补";
  }

  function judgmentFromIssue(issue, index) {
    var evidence = Array.isArray(issue.evidence) ? issue.evidence : [];
    return {
      id: issue.issueId || ("judgment_" + (index + 1)),
      title: issue.title || "管理层判断",
      conclusion: issue.conclusion || "该判断需要补充证据后进入报告。",
      severity: severityForIssue(issue),
      primaryMetric: issue.primaryMetric || (evidence[0] && evidence[0].metric) || "核心指标",
      metricGap: metricGapForIssue(issue),
      causeChain: (issue.causalChain || []).slice(0, 4),
      evidenceRefs: evidence.map(function (ev) { return ev.evidenceId; }).filter(Boolean),
      recommendedAction: issue.action || "补充指标口径后再形成管理动作。",
      reportReadiness: readinessForIssue(issue),
      visualAsset: issue.visualAsset || null,
      domainKey: issue.domainKey || "",
      sourceIssueId: issue.issueId || "",
      priority: index + 1
    };
  }

  function evidenceRowsForJudgment(judgment, issue) {
    return (issue.evidence || []).map(function (ev) {
      return {
        judgmentId: judgment.id,
        evidenceId: ev.evidenceId || "",
        evidenceType: "metric-gap",
        metricKey: ev.metric || judgment.primaryMetric,
        chartType: issue.chartTypes && issue.chartTypes[0] || "diagnostic-card",
        dataQuality: ev.strength || "待复核",
        reportReadiness: judgment.reportReadiness,
        gap: ev.gap || "",
        targetValue: ev.targetValue || "",
        peerValue: ev.peerValue || "",
        direction: ev.direction || "",
        supports: judgment.conclusion
      };
    });
  }

  function topicChainFromJudgment(judgment) {
    return {
      id: "topic_" + judgment.id,
      sourceJudgmentId: judgment.id,
      title: judgment.title,
      priority: judgment.priority,
      nodes: judgment.causeChain.slice(0, 4),
      action: judgment.recommendedAction,
      evidenceRefs: judgment.evidenceRefs.slice(0, 4),
      reportReadiness: judgment.reportReadiness,
      visualAsset: judgment.visualAsset || null,
      pages: [
        { pageRole: "problem", title: judgment.title, mainPoint: judgment.conclusion },
        { pageRole: "direct-cause", title: "直接原因", mainPoint: judgment.causeChain[1] || judgment.conclusion },
        { pageRole: "deep-cause", title: "深层原因", mainPoint: judgment.causeChain[2] || judgment.causeChain[1] || judgment.conclusion },
        { pageRole: "management-action", title: "管理动作", mainPoint: judgment.recommendedAction }
      ].filter(function (page) { return !!page.mainPoint; })
    };
  }

  function candidatePagesFromJudgment(judgment) {
    var pages = [{
      id: "candidate_" + judgment.id + "_judgment",
      sourceType: "judgment",
      sourceId: judgment.id,
      title: judgment.title,
      pageRole: "executive-judgment",
      status: judgment.reportReadiness,
      selected: judgment.reportReadiness === "ready"
    }];
    if (judgment.causeChain.length >= 3) {
      pages.push({
        id: "candidate_" + judgment.id + "_action",
        sourceType: "topic-chain",
        sourceId: "topic_" + judgment.id,
        title: judgment.title + "：原因链与管理动作",
        pageRole: "management-action",
        status: judgment.reportReadiness,
        selected: judgment.reportReadiness === "ready"
      });
    }
    return pages;
  }

  function buildManagementDiagnosisPack(pack) {
    pack = pack || readEvidencePack();
    var issues = selectedIssueObjects(pack).slice(0, 3);
    var judgments = issues.map(judgmentFromIssue);
    var evidenceMap = [];
    judgments.forEach(function (judgment) {
      var issue = issues.filter(function (item) { return item.issueId === judgment.sourceIssueId; })[0] || {};
      evidenceMap = evidenceMap.concat(evidenceRowsForJudgment(judgment, issue));
    });
    var topicChains = judgments
      .filter(function (judgment) { return judgment.causeChain.length >= 2 && judgment.reportReadiness !== "appendix"; })
      .slice(0, 3)
      .map(topicChainFromJudgment);
    var candidatePages = [];
    judgments.forEach(function (judgment) {
      candidatePages = candidatePages.concat(candidatePagesFromJudgment(judgment));
    });
    return {
      version: pack && pack.version || packVersion(),
      sourcePackStatus: pack && pack.status || "empty",
      context: {
        targetBank: pack && pack.targetBank || {},
        peerBanks: pack && pack.peerGroup && pack.peerGroup.banks || [],
        year: pack && pack.year || "",
        role: state && state.role || "管理层诊断"
      },
      executiveAnswer: {
        headline: (pack && pack.targetBank && pack.targetBank.name || "目标银行") + "本轮管理层诊断聚焦" + (judgments.map(function (j) { return j.primaryMetric; }).join("、") || "核心指标"),
        totalVerdict: judgments.length ? "本轮优先围绕" + judgments.map(function (j) { return j.title; }).join("、") + "形成报告主线。" : "请先在数据对标页生成证据包。",
        priorityJudgments: judgments.map(function (j) { return j.id; })
      },
      judgments: judgments,
      evidenceMap: evidenceMap,
      topicChains: topicChains,
      candidatePages: candidatePages.slice(0, 12),
      updatedAt: new Date().toISOString()
    };
  }
```

- [ ] **Step 4: Export the new model helpers**

Modify the export block in `js/57-evidence-pack-model.js`:

```js
  window.buildManagementDiagnosisPack = buildManagementDiagnosisPack;
```

Keep all existing exports unchanged.

- [ ] **Step 5: Run the contract**

Run:

```bash
node tests/management_diagnosis_pack_contract.test.js
```

Expected: PASS with `management-diagnosis-pack-contract-ok`.

- [ ] **Step 6: Commit Task 1**

Run:

```bash
git add js/57-evidence-pack-model.js tests/management_diagnosis_pack_contract.test.js
git commit -m "feat: add management diagnosis pack"
```

---

## Task 2: Slim Page View Models

**Files:**
- Modify: `tests/evidence_pack_driven_pages_contract.test.js`
- Modify: `js/57-evidence-pack-model.js`

- [ ] **Step 1: Extend the existing page-model contract**

Append this block near the bottom of `tests/evidence_pack_driven_pages_contract.test.js`, before the final `console.log`:

```js
const diagnosisPack = context.window.buildManagementDiagnosisPack(samplePack);
assert.equal(diagnosisPack.judgments.length, 1, "diagnosis pack respects selectedIssues");

assert.equal(typeof context.window.managementDiagnosisAnswerModel, "function", "answer model helper is exported");
assert.equal(typeof context.window.managementDiagnosisEvidenceMapModel, "function", "evidence map model helper is exported");
assert.equal(typeof context.window.managementDiagnosisTopicModel, "function", "topic model helper is exported");

const managementAnswer = context.window.managementDiagnosisAnswerModel(samplePack);
assert.equal(managementAnswer.judgments.length, 1, "management answer shows selected judgment only");
assert(managementAnswer.totalVerdict.includes("盈利能力承压"), "management answer keeps issue title");
assert(managementAnswer.judgments[0].evidenceRefs.includes("ev_a"), "management answer keeps evidence reference");

const managementMap = context.window.managementDiagnosisEvidenceMapModel(samplePack);
assert.equal(managementMap.judgments.length, 1, "evidence map keeps judgment list");
assert.equal(managementMap.rows.length, 1, "evidence map keeps selected evidence rows");
assert.equal(managementMap.rows[0].reportReadiness, "review", "single medium-depth issue becomes review state");

const managementTopics = context.window.managementDiagnosisTopicModel(storyPack);
assert.equal(managementTopics.topicChains.length, 1, "topic model uses top story chain");
assert(managementTopics.topicChains[0].nodes.join(" → ").includes("定期存款占比"), "topic model preserves strongest chain");
assert(managementTopics.topicChains.length <= 3, "topic model is capped at three chains");
```

- [ ] **Step 2: Run the failing test**

Run:

```bash
node tests/evidence_pack_driven_pages_contract.test.js
```

Expected: FAIL with `answer model helper is exported`.

- [ ] **Step 3: Add diagnosis page model helpers**

Modify `js/57-evidence-pack-model.js` after `buildManagementDiagnosisPack(pack)`:

```js
  function diagnosisFromAny(input) {
    if (input && input.judgments && input.evidenceMap && input.topicChains) return input;
    return buildManagementDiagnosisPack(input);
  }

  function managementDiagnosisAnswerModel(input) {
    var diagnosis = diagnosisFromAny(input);
    return {
      empty: !diagnosis.judgments.length,
      version: diagnosis.version,
      context: diagnosis.context,
      headline: diagnosis.executiveAnswer.headline,
      totalVerdict: diagnosis.executiveAnswer.totalVerdict,
      judgments: diagnosis.judgments.slice(0, 3)
    };
  }

  function managementDiagnosisEvidenceMapModel(input) {
    var diagnosis = diagnosisFromAny(input);
    return {
      empty: !diagnosis.judgments.length,
      version: diagnosis.version,
      context: diagnosis.context,
      judgments: diagnosis.judgments.slice(0, 3),
      rows: diagnosis.evidenceMap,
      candidatePages: diagnosis.candidatePages
    };
  }

  function managementDiagnosisTopicModel(input) {
    var diagnosis = diagnosisFromAny(input);
    return {
      empty: !diagnosis.topicChains.length,
      version: diagnosis.version,
      context: diagnosis.context,
      topicChains: diagnosis.topicChains.slice(0, 3),
      candidatePages: diagnosis.candidatePages
    };
  }
```

- [ ] **Step 4: Keep old model helpers compatible**

Change the existing `evidencePackAnswerModel`, `evidencePackMapModel`, and `evidencePackTopicModel` exports by adding new exports, not by deleting the old functions:

```js
  window.managementDiagnosisAnswerModel = managementDiagnosisAnswerModel;
  window.managementDiagnosisEvidenceMapModel = managementDiagnosisEvidenceMapModel;
  window.managementDiagnosisTopicModel = managementDiagnosisTopicModel;
```

Do not remove:

```js
  window.evidencePackAnswerModel = evidencePackAnswerModel;
  window.evidencePackMapModel = evidencePackMapModel;
  window.evidencePackTopicModel = evidencePackTopicModel;
```

- [ ] **Step 5: Run model tests**

Run:

```bash
node tests/evidence_pack_driven_pages_contract.test.js
node tests/management_diagnosis_pack_contract.test.js
```

Expected: both PASS.

- [ ] **Step 6: Commit Task 2**

Run:

```bash
git add js/57-evidence-pack-model.js tests/evidence_pack_driven_pages_contract.test.js
git commit -m "feat: add management diagnosis page models"
```

---

## Task 3: Focus the Three Analysis Pages

**Files:**
- Create: `tests/management_diagnosis_rendering_contract.test.js`
- Modify: `js/19-product-workspace.js`
- Modify: `styles/app.css`

- [ ] **Step 1: Write rendering contract**

Create `tests/management_diagnosis_rendering_contract.test.js`:

```js
const fs = require("fs");
const assert = require("assert/strict");

const workspace = fs.readFileSync("js/19-product-workspace.js", "utf8");
const css = fs.readFileSync("styles/app.css", "utf8");

[
  "renderManagementDiagnosisAnswer",
  "renderManagementDiagnosisEvidenceMap",
  "renderManagementDiagnosisTopics",
  "management-judgment-card",
  "management-evidence-index",
  "management-topic-chain",
  "data-jump-report-page",
  "展开证据"
].forEach((needle) => {
  assert(workspace.includes(needle), "workspace must include focused diagnosis rendering: " + needle);
});

[
  ".management-diagnosis-answer",
  ".management-judgment-grid",
  ".management-judgment-card",
  ".management-evidence-index",
  ".management-topic-chain",
  ".management-readiness-ready",
  ".management-readiness-review",
  ".management-readiness-appendix"
].forEach((needle) => {
  assert(css.includes(needle), "CSS must support focused diagnosis layout: " + needle);
});

assert(!workspace.includes("renderEvidencePackAnswer(evidencePackAnswerModel(evidencePack))"), "answer page should not render from old evidence pack model directly");
assert(!workspace.includes("renderEvidencePackMap(evidencePackMapModel(evidencePack))"), "evidence page should not render from old evidence map model directly");
assert(!workspace.includes("renderEvidencePackTopics(evidencePackTopicModel(evidencePack))"), "topic page should not render from old topic model directly");

console.log("management-diagnosis-rendering-contract-ok");
```

- [ ] **Step 2: Run the failing rendering contract**

Run:

```bash
node tests/management_diagnosis_rendering_contract.test.js
```

Expected: FAIL with `renderManagementDiagnosisAnswer`.

- [ ] **Step 3: Add focused answer renderer**

In `js/19-product-workspace.js`, add this helper before `renderEvidencePackAnswer(model)`:

```js
function readinessLabel(status) {
  if (status === "ready") return "可入报告";
  if (status === "review") return "需复核";
  return "附录线索";
}

function renderManagementDiagnosisAnswer(model) {
  if (!model || model.empty) return evidencePackEmptyHtml();
  return `<div class="management-diagnosis-answer">
    <p class="step2-pack-meta">管理层诊断包 ${step2Esc(model.version || "")} · ${step2Esc(model.context?.targetBank?.name || "")} · ${step2Esc(model.context?.year || "")}</p>
    <section class="management-answer-hero">
      <span>结论摘要</span>
      <h3>${step2Esc(model.headline || "本轮管理层诊断")}</h3>
      <p>${step2Esc(model.totalVerdict || "请先生成数据对标证据包。")}</p>
    </section>
    <div class="management-judgment-grid">
      ${(model.judgments || []).slice(0, 3).map((judgment, index) => `<article class="management-judgment-card management-readiness-${step2Esc(judgment.reportReadiness || "review")}">
        <span>判断 ${index + 1} · ${step2Esc(readinessLabel(judgment.reportReadiness))}</span>
        <h4>${step2Esc(judgment.title)}</h4>
        <p>${step2Esc(judgment.conclusion)}</p>
        <b>${step2Esc(judgment.primaryMetric)}｜${step2Esc(judgment.metricGap)}</b>
        ${evidencePackChainHtml((judgment.causeChain || []).slice(0, 3))}
        <button type="button" class="btn secondary" data-jump-report-page="${step2Esc(judgment.id)}">生成候选页</button>
      </article>`).join("")}
    </div>
    <details class="step2-pack-detail-list">
      <summary>展开证据</summary>
      <div class="step2-pack-map-list">
        ${(model.judgments || []).map((judgment) => `<article class="step2-pack-map-row">
          ${evidencePackVisualHtml(judgment.visualAsset, true)}
          <div><span>${step2Esc(judgment.evidenceRefs.join("、") || "证据待补")}</span><b>${step2Esc(judgment.title)}</b><p>${step2Esc(judgment.recommendedAction)}</p></div>
        </article>`).join("")}
      </div>
    </details>
  </div>`;
}
```

- [ ] **Step 4: Add focused evidence-map renderer**

Add this function after `renderManagementDiagnosisAnswer(model)`:

```js
function renderManagementDiagnosisEvidenceMap(model) {
  if (!model || model.empty) return evidencePackEmptyHtml();
  const rowsByJudgment = (model.rows || []).reduce((acc, row) => {
    if (!acc[row.judgmentId]) acc[row.judgmentId] = [];
    acc[row.judgmentId].push(row);
    return acc;
  }, {});
  return `<div class="management-evidence-index">
    <p class="step2-pack-meta">证据地图 ${step2Esc(model.version || "")} · 只核验 3 个核心判断</p>
    ${(model.judgments || []).slice(0, 3).map((judgment, index) => {
      const rows = rowsByJudgment[judgment.id] || [];
      return `<article class="management-evidence-row management-readiness-${step2Esc(judgment.reportReadiness || "review")}">
        <div>
          <span>判断 ${index + 1}</span>
          <h4>${step2Esc(judgment.title)}</h4>
          <p>${step2Esc(judgment.conclusion)}</p>
        </div>
        <div class="management-evidence-metrics">
          ${rows.slice(0, 3).map((row) => `<b>${step2Esc(row.metricKey)}<em>${step2Esc(row.gap || "差距待补")}</em></b>`).join("")}
        </div>
        <div class="management-evidence-status">
          <strong>${step2Esc(readinessLabel(judgment.reportReadiness))}</strong>
          <span>${step2Esc(rows.map((row) => row.evidenceId).filter(Boolean).join("、") || "证据待补")}</span>
        </div>
      </article>`;
    }).join("")}
    <details class="step2-pack-detail-list">
      <summary>展开证据</summary>
      <div class="step2-pack-map-list">
        ${(model.rows || []).map((row) => `<article class="step2-pack-map-row">
          <div><span>${step2Esc(row.evidenceId)}</span><b>${step2Esc(row.metricKey)} · ${step2Esc(row.gap || "--")}</b><p>${step2Esc(row.supports || "")}</p><em>${step2Esc(row.dataQuality || "待复核")}证据 · ${step2Esc(readinessLabel(row.reportReadiness))}</em></div>
        </article>`).join("")}
      </div>
    </details>
  </div>`;
}
```

- [ ] **Step 5: Add focused topic renderer**

Add this function after `renderManagementDiagnosisEvidenceMap(model)`:

```js
function renderManagementDiagnosisTopics(model) {
  if (!model || model.empty) return evidencePackEmptyHtml();
  const pages = (model.topicChains || []).slice(0, 3).map((chain, index) => `
    <article class="management-topic-chain">
      <span>专题链 ${index + 1} · ${step2Esc(readinessLabel(chain.reportReadiness))}</span>
      <h3>${step2Esc(chain.title)}</h3>
      ${evidencePackChainHtml(chain.nodes || [])}
      <div class="report-page-bbar"><b>管理动作</b><span>${step2Esc(chain.action || "补充证据后形成管理动作。")}</span></div>
    </article>`);
  return `<div class="step2-pack-topics step2-pack-page-stack">
    <p class="step2-pack-meta">专题归因 ${step2Esc(model.version || "")} · 默认只展示最强 1-3 条链</p>
    ${renderStoryDeckPlayer("topics", pages, { label: "专题归因" })}
    <details class="step2-pack-detail-list">
      <summary>展开证据</summary>
      ${(model.topicChains || []).map((chain) => `<article class="step2-pack-topic-card">
        <h3>${step2Esc(chain.title)}</h3>
        ${evidencePackChainHtml(chain.nodes || [])}
        <small>证据：${step2Esc((chain.evidenceRefs || []).join("、") || "证据待补")}</small>
        <b>${step2Esc(chain.action || "")}</b>
      </article>`).join("")}
    </details>
  </div>`;
}
```

- [ ] **Step 6: Wire focused renderers into `renderStep2Diagnosis`**

In `js/19-product-workspace.js`, replace the confirmed evidence pack block inside `renderStep2Diagnosis()` with:

```js
  if (evidencePack && evidencePack.status === "confirmed" && typeof buildManagementDiagnosisPack === "function") {
    const diagnosis = buildManagementDiagnosisPack(evidencePack);
    if (decision && typeof managementDiagnosisAnswerModel === "function") decision.innerHTML = renderManagementDiagnosisAnswer(managementDiagnosisAnswerModel(diagnosis));
    if (kpis) kpis.innerHTML = renderStep2Kpis(model);
    if (questions) questions.innerHTML = renderStep2Questions(step2BoardQuestions(row, peers));
    if (peer) peer.innerHTML = renderStep2PeerPosition(row);
    if (changes && typeof managementDiagnosisEvidenceMapModel === "function") changes.innerHTML = renderManagementDiagnosisEvidenceMap(managementDiagnosisEvidenceMapModel(diagnosis));
    if (typeof updateEvidenceMapCommentaryPanel === "function") updateEvidenceMapCommentaryPanel();
    if (pb) pb.innerHTML = renderStep2PbAnswer(row, peers);
    if (topics && typeof managementDiagnosisTopicModel === "function") topics.innerHTML = renderManagementDiagnosisTopics(managementDiagnosisTopicModel(diagnosis));
    if (actions) actions.innerHTML = renderStep2ActionPath(row, peers);
    renderMetricContextRail();
    bindAnalysisRoadmap();
    return;
  }
```

- [ ] **Step 7: Add focused layout CSS**

Append to `styles/app.css`:

```css
.management-diagnosis-answer,
.management-evidence-index {
  display: grid;
  gap: 16px;
}

.management-answer-hero {
  border: 1px solid var(--line, #e6eaef);
  border-radius: 8px;
  padding: 18px;
  background: #fff;
}

.management-answer-hero span,
.management-judgment-card span,
.management-topic-chain span {
  display: block;
  color: var(--muted, #607184);
  font-size: 12px;
  margin-bottom: 6px;
}

.management-answer-hero h3 {
  margin: 0 0 8px;
  font-size: 20px;
  color: var(--ink, #102033);
}

.management-answer-hero p,
.management-judgment-card p,
.management-topic-chain p {
  margin: 0;
  color: var(--muted, #607184);
  line-height: 1.55;
}

.management-judgment-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 12px;
}

.management-judgment-card,
.management-evidence-row,
.management-topic-chain {
  border: 1px solid var(--line, #e6eaef);
  border-radius: 8px;
  background: #fff;
  padding: 16px;
}

.management-judgment-card h4,
.management-evidence-row h4,
.management-topic-chain h3 {
  margin: 0 0 8px;
  color: var(--ink, #102033);
}

.management-judgment-card b {
  display: block;
  margin: 12px 0;
  color: var(--brand, #1a3a5c);
}

.management-evidence-row {
  display: grid;
  grid-template-columns: minmax(0, 1.1fr) minmax(220px, 0.8fr) minmax(160px, 0.5fr);
  gap: 14px;
  align-items: start;
}

.management-evidence-metrics {
  display: grid;
  gap: 8px;
}

.management-evidence-metrics b {
  display: flex;
  justify-content: space-between;
  gap: 12px;
  border-bottom: 1px solid var(--line, #e6eaef);
  padding-bottom: 6px;
}

.management-evidence-metrics em {
  color: var(--brand, #1a3a5c);
  font-style: normal;
}

.management-evidence-status strong {
  display: block;
  margin-bottom: 6px;
  color: var(--brand, #1a3a5c);
}

.management-readiness-ready {
  border-color: rgba(46, 125, 98, 0.35);
}

.management-readiness-review {
  border-color: rgba(184, 92, 56, 0.35);
}

.management-readiness-appendix {
  border-color: rgba(96, 113, 132, 0.3);
}

@media (max-width: 1100px) {
  .management-judgment-grid,
  .management-evidence-row {
    grid-template-columns: 1fr;
  }
}
```

- [ ] **Step 8: Run rendering and model tests**

Run:

```bash
node --check js/19-product-workspace.js
node tests/management_diagnosis_rendering_contract.test.js
node tests/evidence_pack_driven_pages_contract.test.js
node tests/story_deck_player_contract.test.js
```

Expected: all PASS.

- [ ] **Step 9: Commit Task 3**

Run:

```bash
git add js/19-product-workspace.js styles/app.css tests/management_diagnosis_rendering_contract.test.js
git commit -m "feat: focus management diagnosis pages"
```

---

## Task 4: Connect Diagnosis Pack to Report Page Library

**Files:**
- Modify: `tests/report_page_library_model_contract.test.js`
- Modify: `js/61-report-page-library-model.js`
- Modify: `js/62-report-page-library-renderer.js`

- [ ] **Step 1: Add report-page-library contract for diagnosis pack**

Append this block to `tests/report_page_library_model_contract.test.js`, before the final `console.log`:

```js
const diagnosisPack = {
  version: "diag-20260619",
  context: {
    targetBank: { id: "CN033", name: "苏州农商行" },
    peerBanks: ["常熟农商行", "瑞丰农商行"],
    year: 2025,
    role: "管理层诊断"
  },
  judgments: [
    {
      id: "roe_nim_chain",
      title: "盈利能力承压",
      conclusion: "ROE 低于对标组，主要受净息差偏低拖累。",
      primaryMetric: "ROE",
      metricGap: "-2.2pct",
      causeChain: ["ROE 低于对标组", "因为净息差低于对标组", "因为定期存款占比高于对标组"],
      evidenceRefs: ["ev_roe_gap", "ev_nim_gap"],
      recommendedAction: "优先调整负债结构。",
      reportReadiness: "ready",
      visualAsset: { src: "assets/figures/图3-3_息差缺口与负债成本对照.png", label: "息差传导图" }
    }
  ],
  evidenceMap: [
    { judgmentId: "roe_nim_chain", evidenceId: "ev_roe_gap", metricKey: "ROE", gap: "-2.2pct", dataQuality: "强", reportReadiness: "ready" }
  ],
  topicChains: [
    {
      id: "topic_roe_nim_chain",
      sourceJudgmentId: "roe_nim_chain",
      title: "盈利能力承压",
      nodes: ["ROE 低于对标组", "因为净息差低于对标组", "因为定期存款占比高于对标组"],
      action: "优先调整负债结构。",
      evidenceRefs: ["ev_roe_gap", "ev_nim_gap"],
      reportReadiness: "ready"
    }
  ],
  candidatePages: [
    { id: "candidate_roe_nim_chain_judgment", sourceType: "judgment", sourceId: "roe_nim_chain", title: "盈利能力承压", pageRole: "executive-judgment", status: "ready", selected: true },
    { id: "candidate_roe_nim_chain_action", sourceType: "topic-chain", sourceId: "topic_roe_nim_chain", title: "盈利能力承压：原因链与管理动作", pageRole: "management-action", status: "ready", selected: true }
  ]
};

assert.equal(typeof context.window.buildReportPageLibraryFromDiagnosisPack, "function", "diagnosis library builder is exported");
const diagnosisLibrary = context.window.buildReportPageLibraryFromDiagnosisPack(diagnosisPack);
assert.equal(diagnosisLibrary.status, "ready", "diagnosis pack creates ready library");
assert.equal(diagnosisLibrary.pages.length, 2, "candidate pages become report pages");
assert(diagnosisLibrary.pages.every((page) => page.sourceDiagnosisId), "pages keep diagnosis source id");
assert(diagnosisLibrary.pages.some((page) => page.pageType === "executive-judgment"), "judgment page is created");
assert(diagnosisLibrary.pages.some((page) => page.pageType === "management-action"), "action page is created");
assert(diagnosisLibrary.selectedPageIds.length === 2, "ready selected candidate pages are selected");
```

- [ ] **Step 2: Run the failing report library test**

Run:

```bash
node tests/report_page_library_model_contract.test.js
```

Expected: FAIL with `diagnosis library builder is exported`.

- [ ] **Step 3: Add diagnosis pack builder in report library model**

In `js/61-report-page-library-model.js`, add this function before `buildReportPageLibrary(pack)`:

```js
  function diagnosisPageQuality(page, source) {
    return {
      hasTitle: !!page.title,
      evidenceCount: (source.evidenceRefs || []).length,
      causalDepth: (source.causeChain || source.nodes || []).length,
      hasVisual: !!(source.visualAsset && source.visualAsset.src),
      status: page.status === "ready" ? "ready" : (page.status === "review" ? "review" : "low_coverage")
    };
  }

  function pageFromDiagnosisCandidate(candidate, diagnosis) {
    var judgment = (diagnosis.judgments || []).filter(function (item) { return item.id === candidate.sourceId; })[0];
    var chain = (diagnosis.topicChains || []).filter(function (item) { return item.id === candidate.sourceId; })[0];
    var source = judgment || chain || {};
    var chapter = chapterForDomain(source.domainKey || "", candidate.pageRole === "executive-judgment" ? "executive" : "attribution");
    var nodes = source.causeChain || source.nodes || [];
    var page = {
      pageId: candidate.id,
      sourceDiagnosisId: candidate.sourceId,
      chapterKey: chapter.key,
      chapterLabel: chapter.label,
      title: candidate.title,
      pageType: candidate.pageRole,
      storyId: candidate.sourceId,
      domainKey: source.domainKey || "",
      domainLabel: chapter.label,
      visualAsset: source.visualAsset || null,
      causalNodes: nodes.map(function (node, index) {
        return { role: index === 0 ? "判断" : "原因 " + index, metric: node, gap: "", pressure: true };
      }),
      evidenceRows: (source.evidenceRefs || []).map(function (id, index) {
        return { evidenceId: id, role: "证据 " + (index + 1), metric: id, targetValue: "", peerValue: "", gap: "", pressure: true };
      }),
      conclusion: source.conclusion || source.action || "本页基于管理层诊断包生成。",
      selected: candidate.selected !== false && candidate.status === "ready",
      source: "management-diagnosis-pack",
      reportReadiness: candidate.status
    };
    page.quality = diagnosisPageQuality(candidate, source);
    return page;
  }

  function buildReportPageLibraryFromDiagnosisPack(diagnosis) {
    if (!diagnosis || !Array.isArray(diagnosis.candidatePages)) {
      return { version: nowVersion(), status: "empty", sourcePackVersion: "", targetBank: {}, year: "", pages: [], selectedPageIds: [], updatedAt: new Date().toISOString() };
    }
    var pages = diagnosis.candidatePages.slice(0, 12).map(function (candidate) {
      return pageFromDiagnosisCandidate(candidate, diagnosis);
    });
    return {
      version: nowVersion(),
      status: pages.length ? "ready" : "empty",
      sourcePackVersion: diagnosis.version || "",
      targetBank: diagnosis.context && diagnosis.context.targetBank || {},
      year: diagnosis.context && diagnosis.context.year || "",
      chapters: CHAPTERS,
      pages: pages,
      selectedPageIds: pages.filter(function (page) { return page.selected; }).map(function (page) { return page.pageId; }),
      updatedAt: new Date().toISOString()
    };
  }
```

- [ ] **Step 4: Prefer diagnosis pack in `buildReportPageLibrary`**

At the top of `buildReportPageLibrary(pack)`, after the empty/stale checks and before `storyCards`, insert:

```js
    if (typeof window.buildManagementDiagnosisPack === "function") {
      var diagnosis = window.buildManagementDiagnosisPack(pack);
      if (diagnosis && diagnosis.candidatePages && diagnosis.candidatePages.length) {
        return buildReportPageLibraryFromDiagnosisPack(diagnosis);
      }
    }
```

- [ ] **Step 5: Export the diagnosis library builder**

Add to the export block:

```js
  window.buildReportPageLibraryFromDiagnosisPack = buildReportPageLibraryFromDiagnosisPack;
```

- [ ] **Step 6: Add renderer labels for diagnosis pages**

In `js/62-report-page-library-renderer.js`, inside `renderReportPageLibraryPreview(lib)`, after the subtitle paragraph, add:

```js
      + '<p class="report-page-source-meta">来源：' + esc(page.source === "management-diagnosis-pack" ? "管理层诊断包" : "数据对标证据包") + ' · 状态：' + esc(page.reportReadiness || page.quality.status || "待复核") + '</p>'
```

Keep the existing canvas structure unchanged.

- [ ] **Step 7: Run report library tests**

Run:

```bash
node --check js/61-report-page-library-model.js
node --check js/62-report-page-library-renderer.js
node tests/report_page_library_model_contract.test.js
node tests/report_page_library_renderer_contract.test.js
node tests/report_page_library_printdeck_contract.test.js
```

Expected: all PASS.

- [ ] **Step 8: Commit Task 4**

Run:

```bash
git add js/61-report-page-library-model.js js/62-report-page-library-renderer.js tests/report_page_library_model_contract.test.js
git commit -m "feat: build report pages from management diagnosis"
```

---

## Task 5: Cache Busting and Regression Sweep

**Files:**
- Modify: `index.html`

- [ ] **Step 1: Update script and stylesheet versions**

In `index.html`, update these resource query strings:

```html
<link rel="stylesheet" href="styles/app.css?v=20260619-management-diagnosis" />
<script src="js/19-product-workspace.js?v=20260619-management-diagnosis"></script>
<script src="js/57-evidence-pack-model.js?v=20260619-management-diagnosis"></script>
<script src="js/61-report-page-library-model.js?v=20260619-management-diagnosis"></script>
<script src="js/62-report-page-library-renderer.js?v=20260619-management-diagnosis"></script>
```

Keep all other resource paths unchanged.

- [ ] **Step 2: Run syntax checks**

Run:

```bash
node --check js/57-evidence-pack-model.js
node --check js/19-product-workspace.js
node --check js/61-report-page-library-model.js
node --check js/62-report-page-library-renderer.js
```

Expected: no output and exit code 0 for each command.

- [ ] **Step 3: Run focused contracts**

Run:

```bash
node tests/management_diagnosis_pack_contract.test.js
node tests/management_diagnosis_rendering_contract.test.js
node tests/evidence_pack_driven_pages_contract.test.js
node tests/report_page_library_model_contract.test.js
node tests/report_page_library_renderer_contract.test.js
node tests/report_page_library_printdeck_contract.test.js
node tests/story_deck_player_contract.test.js
```

Expected: each test prints its `*-ok` line.

- [ ] **Step 4: Run data-first regression contracts**

Run:

```bash
node tests/data_first_report_evidence_flow_contract.test.js
node tests/target_bank_single_click_contract.test.js
node tests/evidence_pack_entry_cleanup_contract.test.js
```

Expected: each test prints its `*-ok` line.

- [ ] **Step 5: Commit Task 5**

Run:

```bash
git add index.html
git commit -m "chore: refresh management diagnosis assets"
```

---

## Self-Review

**Spec coverage:**  
- 数据资产生成管理层诊断包：Task 1、Task 2。  
- 结论摘要只保留 3 个管理层判断：Task 3。  
- 证据地图改为审稿索引：Task 3。  
- 专题归因只展示 1-3 条强链：Task 2、Task 3。  
- 报告页库生成候选页：Task 4。  
- 缓存和回归验证：Task 5。

**Placeholder scan:**  
本计划不包含未落地的占位写法。每个代码步骤都给出具体测试代码、实现代码或精确修改片段。

**Type consistency:**  
统一使用 `managementDiagnosisPack` 概念和 `buildManagementDiagnosisPack(pack)` 函数名。页面模型函数为 `managementDiagnosisAnswerModel`、`managementDiagnosisEvidenceMapModel`、`managementDiagnosisTopicModel`。报告页库转换函数为 `buildReportPageLibraryFromDiagnosisPack(diagnosis)`。
