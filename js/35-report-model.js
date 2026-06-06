/* Bank VQA module: 35-report-model.js
 * Sprint 7D-0 PR-B: reportDeliveryModel() —— 唯一对外暴露的报告数据契约层。
 *
 * 设计原则（详见 docs/report-model-contract.md）：
 *   1. 不重复 DOM 查询：所有消费方（HTML/PDF/PPTX）通过此函数取数。
 *   2. 不破坏现有调用：formalReportModel() / formalDeliveryStorylineModel() 继续可用。
 *   3. 加 meta 层：包含 target/year/peers/reportVersion/whatIfScenario，让导出能识别模拟口径。
 *   4. 错误降级：DOM 缺失时返回空 sections + 警告日志，不抛异常。
 *   5. 环境开关：window.REPORT_MODEL_V2 设为 true 可让消费方走新链路；默认仅作为数据层。
 */

/**
 * @returns {ReportModel} 见 docs/report-model-contract.md
 */
function reportDeliveryModel(root = document) {
  try {
    const sections = typeof formalDeliveryStorylineModel === "function"
      ? formalDeliveryStorylineModel(root)
      : (typeof formalReportModel === "function" ? formalReportModel(root) : []);
    return {
      version: "v1",
      meta: reportModelMeta(),
      sections: sections.map(reportModelSerializeSection),
      generatedAt: new Date().toISOString()
    };
  } catch (err) {
    if (typeof console !== "undefined" && console.warn) {
      console.warn("[reportModel] reportDeliveryModel failed", err);
    }
    return { version: "v1", meta: reportModelMeta(), sections: [], generatedAt: new Date().toISOString() };
  }
}

function reportModelMeta() {
  const s = typeof state !== "undefined" ? state : {};
  const target = s.target || "";
  const year = Number(s.year) || null;
  const peers = Array.isArray(s.peers) ? s.peers.slice() : [];
  const reportVersion = s.reportVersion || "董事会完整汇报版";
  const whatIfScenario = s.whatIfScenario && typeof s.whatIfScenario === "object"
    ? {
        active: !!s.whatIfScenario.active,
        nimShift: Number(s.whatIfScenario.nimShift) || 0,
        nplShift: Number(s.whatIfScenario.nplShift) || 0,
        costIncomeShift: Number(s.whatIfScenario.costIncomeShift) || 0
      }
    : { active: false, nimShift: 0, nplShift: 0, costIncomeShift: 0 };
  return {
    targetBank: target,
    analysisYear: year,
    peers,
    reportVersion,
    whatIfScenario
  };
}

function reportModelSerializeSection(item) {
  const topicId = item.section?.dataset?.topicId || item.storyRole || item.id;
  const topicModel = typeof layeredTopicFactModel === "function" ? layeredTopicFactModel(topicId) : null;
  const rewrite = typeof state !== "undefined" && state.reportRewrites ? state.reportRewrites[item.id] : null;
  const localRewrite = reportModelLocalRewrite(item, topicId);
  const resolvedRewrite = rewrite?.text ? rewrite : localRewrite;
  return {
    id: item.id,
    index: item.index,
    indexText: item.indexText,
    sectionTitle: item.title,
    moduleLabel: item.moduleLabel,
    pageRole: item.pageRole,
    deckType: item.deckType,
    storyRole: item.storyRole || null,
    layoutIntent: item.layoutIntent || null,
    evidenceDensity: item.evidenceDensity || null,
    htmlLayout: item.htmlLayout || null,
    pdfLayout: item.pdfLayout || null,
    pptxLayout: item.pptxLayout || item.deckType || null,
    included: item.included !== false,
    htmlRoute: item.htmlRoute || "formalReport",
    pdfRoute: item.pdfRoute || "browserPrintFormalReport",
    pptxRoute: item.pptxRoute || `pptx:${item.deckType || "content"}`,
    factPackId: topicModel?.factPackId || null,
    rewriteStatus: resolvedRewrite?.status || "not_generated",
    rewriteSource: resolvedRewrite?.source || "",
    rewriteText: resolvedRewrite?.text || "",
    rewriteQualityWarnings: resolvedRewrite?.qualityWarnings || [],
    rewriteBridge: resolvedRewrite?.bridge || "",
    citationMetricKeys: topicModel?.citations?.map((fact) => fact.指标代码) || [],
    dataWarnings: topicModel?.dataWarnings || [],
    riskStamp: reportModelExtractRiskStamp(item.section),
    blocks: reportModelExtractBlocks(item.section)
  };
}

function reportModelTopicIdFromSection(item = {}) {
  const section = item.section || null;
  const datasetTopic = section?.dataset?.topicId || "";
  if (datasetTopic) return datasetTopic;
  const id = item.id || section?.id || "";
  const match = id.match(/^formal-topic-(.+)$/);
  if (match) return match[1];
  return "";
}

function reportModelPrimaryChannel() {
  return typeof reportPrimaryNarrativeChannel === "function" ? reportPrimaryNarrativeChannel() : "board";
}

function reportModelLocalRewrite(item = {}, fallbackTopicId = "") {
  const storyRole = item.storyRole || "";
  const channel = reportModelPrimaryChannel();
  const topicId = reportModelTopicIdFromSection(item) || fallbackTopicId;
  if (storyRole === "topic" && topicId && typeof getReportTopicNarratives === "function") {
    const pack = getReportTopicNarratives(topicId);
    const text = pack.primary?.text || pack.all?.board?.text || "";
    if (text) {
      return {
        status: "local_synced",
        source: pack.primary?.source || "local-topic-template",
        text,
        qualityWarnings: [],
        bridge: "topicNarratives"
      };
    }
  }
  if (storyRole === "evidence" && typeof getEvidenceMapCommentary === "function") {
    const commentary = getEvidenceMapCommentary();
    if (commentary?.text) {
      return {
        status: "local_synced",
        source: commentary.source || "local-evidence-template",
        text: commentary.text,
        qualityWarnings: commentary.error ? [commentary.error] : [],
        bridge: "evidenceMapCommentary"
      };
    }
  }
  if ((storyRole === "answer" || storyRole === "opening" || storyRole === "action" || storyRole === "scenario") && typeof getBankCommentary === "function") {
    const commentary = getBankCommentary(storyRole === "action" ? "action" : channel);
    if (commentary?.text) {
      return {
        status: "local_synced",
        source: commentary.source || "local-bank-template",
        text: commentary.text,
        qualityWarnings: commentary.error ? [commentary.error] : [],
        bridge: "bankCommentary"
      };
    }
  }
  return null;
}

/**
 * 从 section DOM 中识别口径风险等级标签（L1-L4）。
 * 复用现有 .formal-risk-pill / .tone-* 类标签，不重复计算。
 */
function reportModelExtractRiskStamp(section) {
  if (!section || !section.querySelector) return null;
  const pill = section.querySelector(".formal-risk-pill, .tone-L1, .tone-L2, .tone-L3, .tone-L4");
  if (!pill) return null;
  const text = (pill.textContent || "").trim();
  const match = text.match(/L[1-4]/);
  if (match) return match[0];
  const cls = pill.className || "";
  const clsMatch = cls.match(/tone-(L[1-4])/);
  return clsMatch ? clsMatch[1] : null;
}

/**
 * 从 section DOM 中按类名识别语义块。PR-B 阶段只做轻量识别（每块返回 kind + DOM 引用），
 * 真正的字段提取留给 PR-C/PR-E 阶段做强类型化。
 */
function reportModelExtractBlocks(section) {
  if (!section || !section.querySelectorAll) return [];
  const blockMap = [
    { selector: ".formal-metric-hero", kind: "metricHero" },
    { selector: ".formal-so-what", kind: "soWhat" },
    { selector: ".formal-chart-readout", kind: "chartReadout" },
    { selector: ".formal-fact-table", kind: "factTable" },
    { selector: ".formal-action-card", kind: "actionCard" },
    { selector: ".formal-mechanism-card", kind: "mechanismCard" },
    { selector: ".formal-risk-card", kind: "riskCard" },
    { selector: ".formal-topic-scr", kind: "scrTopic" },
    { selector: ".formal-whatif-strip > div", kind: "whatIfStrip" },
    { selector: ".formal-risk-footnotes", kind: "footnote" },
    { selector: ".formal-ai-commentary", kind: "aiCommentary" }
  ];
  const blocks = [];
  blockMap.forEach(({ selector, kind }) => {
    section.querySelectorAll(selector).forEach((node, idx) => {
      blocks.push({
        kind,
        index: idx,
        domRef: node,
        textContent: (node.textContent || "").trim().slice(0, 200)
      });
    });
  });
  return blocks;
}

/**
 * 便捷查询：按 sectionId 找单个 section 的 model 表示。
 */
function reportModelGetSection(sectionId, root = document) {
  const model = reportDeliveryModel(root);
  return model.sections.find((s) => s.id === sectionId) || null;
}

/**
 * 便捷查询：按 storyRole 过滤 sections。
 */
function reportModelSectionsByRole(storyRole, root = document) {
  const model = reportDeliveryModel(root);
  return model.sections.filter((s) => s.storyRole === storyRole);
}

/**
 * 调试辅助：打印一下 reportModel 概况到 console，便于本地校验。
 */
function reportModelDebugSummary(root = document) {
  const model = reportDeliveryModel(root);
  return {
    version: model.version,
    target: model.meta.targetBank,
    year: model.meta.analysisYear,
    peers: model.meta.peers.length,
    whatIf: model.meta.whatIfScenario.active,
    sections: model.sections.length,
    bySectionRole: model.sections.reduce((acc, s) => {
      const k = s.storyRole || "unknown";
      acc[k] = (acc[k] || 0) + 1;
      return acc;
    }, {}),
    byPageRole: model.sections.reduce((acc, s) => {
      const k = s.pageRole || "unknown";
      acc[k] = (acc[k] || 0) + 1;
      return acc;
    }, {})
  };
}

// 暴露到 window 便于浏览器 console 调试和 PPTX/HTML 消费方读取
if (typeof window !== "undefined") {
  window.reportDeliveryModel = reportDeliveryModel;
  window.reportModelDebugSummary = reportModelDebugSummary;
  window.reportModelGetSection = reportModelGetSection;
  window.reportModelSectionsByRole = reportModelSectionsByRole;
}
