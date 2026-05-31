/* Bank VQA module: 28-prd-traceability.js — PRD coverage and delivery review governance */

var DELIVERY_REVIEW_KEY = "bankVqaDeliveryReview";

function prdRequirementCatalog() {
  return [
    ["PRD-01", "项目版本管理", "新建分析项目", "warn", "createProjectBtn", ["js/09-projects.js:createProjectBtn"]],
    ["PRD-02", "项目版本管理", "保存项目配置", "warn", "projectSnapshot", ["js/09-projects.js:projectSnapshotWithMeta"]],
    ["PRD-03", "项目版本管理", "项目列表", "info", "projectList", ["index.html:projectList"]],
    ["PRD-04", "项目版本管理", "加载项目", "warn", "loadProject", ["js/09-projects.js:loadProjectById"]],
    ["PRD-05", "项目版本管理", "复制项目", "info", "copyProject", ["js/09-projects.js:copyCurrentProject"]],
    ["PRD-06", "项目版本管理", "删除项目", "info", "deleteProject", ["js/09-projects.js:deleteProjectById"]],
    ["PRD-07", "对标组治理", "对标推荐理由", "warn", "peerReasons", ["js/09-projects.js:peerRecommendationReasons"]],
    ["PRD-08", "对标组治理", "对标组保存", "warn", "peerSave", ["js/09-projects.js:saveCurrentPeerGroup"]],
    ["PRD-09", "对标组治理", "对标组命名", "info", "peerName", ["index.html:peerGroupNameInput"]],
    ["PRD-10", "对标组治理", "对标组复用", "warn", "peerReuse", ["js/09-projects.js:applyPeerGroup"]],
    ["PRD-11", "对标组治理", "对标组编辑", "info", "peerEdit", ["js/09-projects.js:openPeerGroupEditor"]],
    ["PRD-12", "专题规则配置", "专题配置文件", "warn", "topicConfig", ["analysis_rules.json:topics"]],
    ["PRD-13", "专题规则配置", "指标权重配置", "warn", "topicWeights", ["analysis_rules.json:topics.metrics.weight"]],
    ["PRD-14", "专题规则配置", "红黄绿阈值配置", "warn", "topicThresholds", ["analysis_rules.json:topicDefaults.thresholds"]],
    ["PRD-15", "专题规则配置", "必须引用指标", "warn", "requiredCitations", ["analysis_rules.json:topics.requiredCitations"]],
    ["PRD-16", "专题规则配置", "禁用表述", "warn", "forbiddenPhrases", ["analysis_rules.json:language.forbidden"]],
    ["PRD-17", "专题规则配置", "配置生效", "warn", "topicRuntime", ["js/05-analysis.js:topicDefinitions"]],
    ["PRD-18", "指标口径复核", "指标详情弹层", "warn", "metricModal", ["index.html:metricModal"]],
    ["PRD-19", "指标口径复核", "来源字段展示", "warn", "metricSource", ["data_governance/metric_dictionary.json"]],
    ["PRD-20", "指标口径复核", "计算公式展示", "warn", "metricFormula", ["data_governance/metric_dictionary.json"]],
    ["PRD-21", "指标口径复核", "覆盖情况展示", "warn", "coverage", ["index.html:coverageMetricTable"]],
    ["PRD-22", "指标口径复核", "缺失原因说明", "info", "missingReason", ["js/07-export.js:pendingDataExportRows"]],
    ["PRD-23", "指标口径复核", "口径导出", "warn", "metricExport", ["js/07-export.js:metricDictionaryExportRows"]],
    ["PRD-24", "AI写稿", "事实包生成", "warn", "factPack", ["js/11-fact-pack.js:buildTopicFactPackObject"]],
    ["PRD-25", "AI写稿", "Prompt模板", "info", "prompts", ["config/prompts.json"]],
    ["PRD-26", "AI写稿", "AI解读生成", "warn", "aiGenerate", ["js/12-ai-narrative.js:generateTopicNarrativeDraftAsync"]],
    ["PRD-27", "AI写稿", "引用指标标记", "warn", "citations", ["js/12-ai-narrative.js:topicCitationTags"]],
    ["PRD-28", "AI写稿", "重新生成", "info", "regenerate", ["js/12-ai-narrative.js:regenerateTopicNarrativesWithAi"]],
    ["PRD-29", "AI写稿", "人工编辑", "warn", "manualEdit", ["js/12-ai-narrative.js:saveTopicNarrativeEdit"]],
    ["PRD-30", "HTML报告母版", "报告目录页", "info", "reportToc", ["js/22-formal-report.js:formalReportSections"]],
    ["PRD-31", "HTML报告母版", "章节摘要页", "warn", "chapterSummary", ["js/22-formal-report.js:formalReportModuleLabel"]],
    ["PRD-32", "HTML报告母版", "专题主体页", "warn", "topicPages", ["js/22-formal-report.js:formalTopicSection"]],
    ["PRD-33", "HTML报告母版", "图表页版式", "warn", "figurePages", ["js/22-formal-report.js:formalFigureAppendixSection"]],
    ["PRD-34", "HTML报告母版", "行动建议页", "warn", "actionPage", ["js/22-formal-report.js:formalActionSection"]],
    ["PRD-35", "HTML报告母版", "数据附录页", "info", "appendix", ["js/22-formal-report.js:formalAppendixSection"]],
    ["PRD-36", "PPTX导出", "PPTX导出入口", "warn", "pptxButton", ["index.html:exportReportPptx"]],
    ["PRD-37", "PPTX导出", "PPT母版样式", "warn", "pptxTheme", ["js/13-pptx-export.js:rsmPptxTheme"]],
    ["PRD-38", "PPTX导出", "图表转图片", "warn", "pptxCharts", ["js/13-pptx-export.js:pptxChartImage"]],
    ["PRD-39", "PPTX导出", "文本可编辑", "warn", "pptxText", ["js/13-pptx-export.js:addText"]],
    ["PRD-40", "PPTX导出", "章节结构一致", "warn", "pptxSequence", ["js/13-pptx-export.js:formalReportSections"]]
  ].map(([id, group, title, severity, check, evidence]) => ({
    id,
    group,
    title,
    description: title,
    severity,
    check,
    evidence: evidence.map((item) => {
      const [file, symbol] = item.split(":");
      return { file, symbol };
    })
  }));
}

function prdCheckResult(req) {
  const fn = typeof window !== "undefined" ? window : globalThis;
  const checks = {
    createProjectBtn: () => !!document.getElementById("createProjectBtn"),
    projectSnapshot: () => typeof projectSnapshotWithMeta === "function",
    projectList: () => !!document.getElementById("projectList"),
    loadProject: () => typeof loadProjectById === "function",
    copyProject: () => typeof copyCurrentProject === "function",
    deleteProject: () => typeof deleteProjectById === "function",
    peerReasons: () => typeof peerRecommendationReasons === "function",
    peerSave: () => typeof saveCurrentPeerGroup === "function",
    peerName: () => !!document.getElementById("peerGroupNameInput"),
    peerReuse: () => typeof applyPeerGroup === "function",
    peerEdit: () => typeof openPeerGroupEditor === "function",
    topicConfig: () => !!analysisRules?.topics,
    topicWeights: () => Object.values(analysisRules?.topics || {}).some((topic) => (topic.metrics || []).some((metric) => metric.weight != null)),
    topicThresholds: () => !!analysisRules?.topicDefaults?.thresholds,
    requiredCitations: () => Object.values(analysisRules?.topics || {}).some((topic) => topic.requiredCitations?.length),
    forbiddenPhrases: () => !!analysisRules?.language?.forbidden?.length || Object.values(analysisRules?.topics || {}).some((topic) => topic.forbiddenPhrases?.length),
    topicRuntime: () => typeof topicDefinitions === "function",
    metricModal: () => !!document.getElementById("metricModal"),
    metricSource: () => Object.keys(metricDictionary || {}).length > 0,
    metricFormula: () => Object.values(metricDictionary || {}).some((entry) => entry.formula || entry.公式 || entry.calculation),
    coverage: () => !!document.getElementById("coverageMetricTable"),
    missingReason: () => typeof pendingDataExportRows === "function",
    metricExport: () => typeof metricDictionaryExportRows === "function",
    factPack: () => typeof buildTopicFactPackObject === "function",
    prompts: () => typeof narrativePrompts === "object",
    aiGenerate: () => typeof generateTopicNarrativeDraftAsync === "function",
    citations: () => typeof topicCitationTags === "function",
    regenerate: () => typeof regenerateTopicNarrativesWithAi === "function",
    manualEdit: () => typeof saveTopicNarrativeEdit === "function",
    reportToc: () => typeof formalReportSections === "function",
    chapterSummary: () => typeof formalReportModuleLabel === "function",
    topicPages: () => typeof formalTopicSection === "function",
    figurePages: () => typeof formalFigureAppendixSection === "function",
    actionPage: () => typeof formalActionSection === "function",
    appendix: () => typeof formalAppendixSection === "function",
    pptxButton: () => !!document.getElementById("exportReportPptx"),
    pptxTheme: () => typeof rsmPptxTheme === "function",
    pptxCharts: () => typeof exportReportPptx === "function" || typeof initPptxExport === "function",
    pptxText: () => typeof pptxSlideBrief === "function",
    pptxSequence: () => typeof formalReportSections === "function"
  };
  try {
    return checks[req.check]?.() ? "done" : "partial";
  } catch (error) {
    return req.severity === "blocker" ? "blocked" : "partial";
  }
}

function prdRequirementRows() {
  return prdRequirementCatalog().map((req) => ({
    ...req,
    status: prdCheckResult(req),
    nextAction: prdCheckResult(req) === "done" ? "已具备可验收证据。" : "需补齐实现证据或验收检查。"
  }));
}

function prdCoverageSummary(rows = prdRequirementRows()) {
  const summary = { done: 0, partial: 0, missing: 0, blocked: 0, blockers: 0, total: rows.length };
  rows.forEach((row) => {
    summary[row.status] = (summary[row.status] || 0) + 1;
    if (row.severity === "blocker" && row.status !== "done") summary.blockers += 1;
  });
  summary.rate = summary.total ? summary.done / summary.total : 0;
  return summary;
}

function deliveryReviewState() {
  if (!state.deliveryReview) {
    try {
      state.deliveryReview = JSON.parse(localStorage.getItem(DELIVERY_REVIEW_KEY) || "null") || {};
    } catch (error) {
      state.deliveryReview = {};
    }
  }
  state.deliveryReview = {
    status: state.deliveryReview.status || "draft",
    updatedAt: state.deliveryReview.updatedAt || new Date().toISOString(),
    reviewer: state.deliveryReview.reviewer || "本机用户",
    notes: Array.isArray(state.deliveryReview.notes) ? state.deliveryReview.notes : [],
    lockedAt: state.deliveryReview.lockedAt || null
  };
  return state.deliveryReview;
}

function saveDeliveryReviewState() {
  localStorage.setItem(DELIVERY_REVIEW_KEY, JSON.stringify(deliveryReviewState()));
}

function setDeliveryStatus(status, note = "") {
  const review = deliveryReviewState();
  review.status = status;
  review.updatedAt = new Date().toISOString();
  review.lockedAt = status === "locked" ? review.updatedAt : null;
  if (note) review.notes = [{ at: review.updatedAt, text: note }, ...review.notes].slice(0, 12);
  saveDeliveryReviewState();
  renderDeliveryReviewPanel();
  if (typeof renderPrdCoverageDashboard === "function") renderPrdCoverageDashboard();
}

function resetDeliveryToDraft(note = "分析口径或文案已变化，需重新复核。") {
  const review = deliveryReviewState();
  if (review.status === "draft") return;
  setDeliveryStatus("draft", note);
}

function deliveryGateChecks() {
  const rows = prdRequirementRows();
  const summary = prdCoverageSummary(rows);
  const review = deliveryReviewState();
  const warnings = [];
  const blockers = [];
  if (summary.blockers) blockers.push(`${summary.blockers} 项 PRD 阻断需求未完成`);
  if (review.status !== "locked") warnings.push("报告尚未锁定，导出材料应标注为草稿或复核中。");
  if (typeof narrativeAuditRows === "function") {
    const failed = narrativeAuditRows().filter((row) => row.status === "fail");
    if (failed.length) blockers.push(`${failed.length} 段 AI 解读引用校验未通过`);
  }
  return {
    status: blockers.length ? "bad" : warnings.length ? "warn" : "ok",
    blockers,
    warnings,
    summary,
    review
  };
}

function prdCoverageExportRows() {
  return prdRequirementRows().map((row) => ({
    需求编号: row.id,
    分组: row.group,
    需求: row.title,
    状态: row.status,
    级别: row.severity,
    证据: row.evidence.map((item) => `${item.file}:${item.symbol}`).join("；"),
    下一步: row.nextAction
  }));
}

function deliveryReviewExportRows() {
  const review = deliveryReviewState();
  return [{
    状态: review.status,
    复核人: review.reviewer,
    更新时间: review.updatedAt,
    锁定时间: review.lockedAt || "",
    备注: review.notes.map((item) => `${item.at} ${item.text}`).join("；")
  }];
}

function renderPrdCoverageDashboard() {
  const host = document.getElementById("prdCoverageDashboard");
  if (!host) return;
  const rows = prdRequirementRows();
  const summary = prdCoverageSummary(rows);
  const groups = [...new Set(rows.map((row) => row.group))];
  host.innerHTML = `
    <div class="governance-head">
      <div><span>PRD 完成度</span><h3>需求矩阵把实现证据、复核状态和导出风险放在同一张表里</h3></div>
      <b>${summary.done}/${summary.total}</b>
    </div>
    <div class="governance-kpis">
      <div><span>已完成</span><b>${summary.done}</b></div>
      <div><span>部分完成</span><b>${summary.partial}</b></div>
      <div><span>缺失</span><b>${summary.missing}</b></div>
      <div><span>阻断</span><b>${summary.blockers}</b></div>
    </div>
    <div class="prd-group-grid">${groups.map((group) => {
      const items = rows.filter((row) => row.group === group);
      return `<section class="prd-group-card"><b>${group}</b>${items.map((row) => `
        <div class="prd-row tone-${row.status}">
          <span>${row.id}</span><strong>${row.title}</strong><em>${row.status}</em>
          <p>${row.evidence.map((item) => `${item.file}:${item.symbol}`).join("；")}</p>
        </div>`).join("")}</section>`;
    }).join("")}</div>`;
}

function renderDeliveryReviewPanel() {
  const host = document.getElementById("deliveryReviewPanel");
  if (!host) return;
  const gate = deliveryGateChecks();
  const review = gate.review;
  host.innerHTML = `
    <div class="governance-head">
      <div><span>交付状态</span><h3>Draft / Review / Locked 控制正式报告是否可作为交付物</h3></div>
      <b>${review.status.toUpperCase()}</b>
    </div>
    <div class="delivery-state-actions">
      <button type="button" data-delivery-status="review">送复核</button>
      <button type="button" data-delivery-status="locked" ${gate.blockers.length ? "disabled" : ""}>锁定报告</button>
      <button type="button" data-delivery-status="draft">解锁回草稿</button>
    </div>
    <div class="delivery-gate-result tone-${gate.status}">
      <b>${gate.status === "bad" ? "存在阻断" : gate.status === "warn" ? "可导出但有提醒" : "可作为正式交付"}</b>
      <p>${[...gate.blockers, ...gate.warnings].join("；") || "未发现阻断或提醒。"}</p>
    </div>
    <div class="delivery-notes">${review.notes.slice(0, 4).map((item) => `<p>${item.at}｜${item.text}</p>`).join("") || "<p>暂无复核备注。</p>"}</div>`;
  host.querySelectorAll("[data-delivery-status]").forEach((button) => {
    button.addEventListener("click", () => setDeliveryStatus(button.dataset.deliveryStatus, `状态切换为 ${button.dataset.deliveryStatus}`));
  });
}

function initPrdTraceabilityModule() {
  deliveryReviewState();
  renderPrdCoverageDashboard();
  renderDeliveryReviewPanel();
  if (typeof renderAll === "function" && !renderAll.__prdTraceabilityWrapped) {
    const originalRenderAll = renderAll;
    renderAll = function renderAllWithPrdTraceability() {
      const result = originalRenderAll.apply(this, arguments);
      renderPrdCoverageDashboard();
      renderDeliveryReviewPanel();
      return result;
    };
    renderAll.__prdTraceabilityWrapped = true;
  }
}
