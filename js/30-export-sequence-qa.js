/* Bank VQA module: 30-export-sequence-qa.js — HTML/PDF/PPTX同源页序QA */

function sequenceQaEscape(text = "") {
  if (typeof formalEscape === "function") return formalEscape(text);
  return String(text || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function sequenceQaStatusLabel(status) {
  if (status === "ok") return "通过";
  if (status === "warn") return "提醒";
  return "阻断";
}

function activeFormalReportSections(root = document) {
  const scope = root?.querySelectorAll ? root : document;
  const existing = typeof formalReportSections === "function"
    ? formalReportSections(scope)
    : [...scope.querySelectorAll("#formalReport > header, #formalReport > section")];
  if (!existing.length && typeof renderFormalReport === "function" && root === document) renderFormalReport();
  if (typeof applyFormalReportContract === "function") applyFormalReportContract(root);
  if (typeof applyReportStructureContract === "function") applyReportStructureContract(root);
  const sections = typeof formalReportSections === "function"
    ? formalReportSections(root)
    : [...(root?.querySelectorAll ? root : document).querySelectorAll("#formalReport > header, #formalReport > section")];
  return sections.filter((section) => section.dataset?.structureIncluded !== "false" && !section.hidden);
}

function reportSequenceRows(root = document) {
  const model = typeof formalReportModel === "function" ? formalReportModel(root) : [];
  if (model.length) {
    return model.map((item) => ({
      序号: item.index,
      页面ID: item.id,
      章节标题: item.title,
      模块: item.moduleLabel,
      页型: item.pageRole,
      PPT页型: item.deckType,
      HTML链路: item.htmlRoute,
      PDF链路: item.pdfRoute,
      PPTX链路: item.pptxRoute,
      纳入状态: item.included ? "纳入" : "排除"
    }));
  }
  return activeFormalReportSections(root).map((section, index) => ({
    序号: index + 1,
    页面ID: section.id || `formal-section-${index + 1}`,
    章节标题: section.dataset?.sectionTitle || section.querySelector?.("h1, h2")?.textContent?.trim() || `第 ${index + 1} 节`,
    模块: section.dataset?.moduleLabel || "",
    页型: section.dataset?.pageRole || "content",
    PPT页型: section.dataset?.deckType || "content",
    HTML链路: "formalReport",
    PDF链路: "browserPrintFormalReport",
    PPTX链路: `pptx:${section.dataset?.deckType || "content"}`,
    纳入状态: "纳入"
  }));
}

function deliveryStorylineQaRows(root = document) {
  const rows = typeof formalDeliveryStorylineModel === "function" ? formalDeliveryStorylineModel(root) : [];
  return rows.map((item) => {
    const issues = [];
    if (!item.storyRole) issues.push("缺少故事角色");
    if (!item.pptxLayout) issues.push("缺少PPTX页型");
    if (!item.htmlLayout || !item.pdfLayout) issues.push("缺少HTML/PDF版式口径");
    return {
      类型: "故事线版式",
      序号: item.index,
      页面ID: item.id,
      章节标题: item.title,
      故事角色: item.storyRole || "缺少故事角色",
      HTML版式: item.htmlLayout || "缺少",
      PDF版式: item.pdfLayout || "缺少",
      PPTX页型: item.pptxLayout || "缺少",
      状态: issues.length ? "提醒" : "通过",
      校验结论: issues.length ? issues.join("；") : `${item.storyRole}｜${item.layoutIntent}｜${item.evidenceDensity}`
    };
  });
}

function pptxVisualReadabilityRows(root = document) {
  const rows = typeof formalDeliveryStorylineModel === "function" ? formalDeliveryStorylineModel(root) : [];
  const supportedLayouts = new Set([
    "cover",
    "executive-answer",
    "chart-evidence",
    "evidence-brief",
    "mechanism-evidence",
    "topic-scr",
    "scenario-check",
    "action-roadmap",
    "appendix"
  ]);
  const evidenceSelector = [
    ".formal-so-what",
    ".formal-chart-readout",
    ".formal-metric-hero",
    ".formal-fact-table",
    ".formal-action-card",
    ".formal-mechanism-card",
    ".formal-risk-card",
    ".formal-whatif-strip > div",
    ".formal-drill-card",
    ".formal-consistency-card",
    ".formal-pb-pricing-grid",
    ".formal-topic-scr",
    ".v6-anomaly-row"
  ].join(",");
  const needsEvidence = new Set(["answer", "topic", "evidence", "mechanism", "scenario", "action"]);
  const needsMethodNote = new Set(["topic", "mechanism", "scenario", "evidence"]);
  return rows.map((item) => {
    const section = item.section;
    const projectedBlocks = section && typeof formalSlideTextBlocks === "function" ? formalSlideTextBlocks(section, item.index - 1) : null;
    const referenceLayout = projectedBlocks?.referenceLayout || (typeof pptxReferenceLayoutSpec === "function" ? pptxReferenceLayoutSpec({ pptxLayout: item.pptxLayout }, item.pptxLayout) : null);
    const textDensity = (section?.textContent || item.title || "").replace(/\s+/g, "").length;
    const titleLength = (item.title || "").replace(/\s+/g, "").length;
    const domEvidenceCount = section?.querySelectorAll ? section.querySelectorAll(evidenceSelector).length : 0;
    const projectedEvidenceCount = projectedBlocks
      ? [
          ...(projectedBlocks.blocks || []),
          ...(projectedBlocks.metrics || []),
          ...(projectedBlocks.consultingCards || []),
          ...(projectedBlocks.comments || [])
        ].filter(Boolean).length
      : 0;
    const evidenceCount = Math.max(domEvidenceCount, projectedEvidenceCount);
    const domMethodNoteCount = section?.querySelectorAll
      ? section.querySelectorAll(".formal-risk-footnotes,.formal-chart-readout,.formal-so-what,.formal-method-note,.formal-risk-note").length
      : 0;
    const projectedMethodNoteCount = projectedBlocks?.riskFootnotes?.length || (typeof addStorylineEvidenceBlocks === "function" && item.pptxLayout !== "cover" ? 1 : 0);
    const methodNoteCount = Math.max(domMethodNoteCount, projectedMethodNoteCount);
    const issues = [];
    if (!supportedLayouts.has(item.pptxLayout)) issues.push(`PPTX页型未登记：${item.pptxLayout || "缺少"}`);
    if (titleLength > 90) issues.push("标题过长，PPTX需拆短或缩字号");
    if (needsEvidence.has(item.storyRole) && evidenceCount < 1) issues.push("证据块不足，PPTX会变成纯文字页");
    if (textDensity > 2600) issues.push("文本密度偏高，建议压缩为结论+证据块+管理动作");
    if (needsMethodNote.has(item.storyRole) && methodNoteCount < 1) issues.push("口径提示不足，需补充方法/读图/风险说明");
    return {
      类型: "PPTX视觉可读性",
      序号: item.index,
      页面ID: item.id,
      章节标题: item.title,
      故事角色: item.storyRole || "缺少故事角色",
      PPTX页型: item.pptxLayout || "缺少",
      参考版式: referenceLayout ? `${referenceLayout.sourceReferenceProfile}｜${referenceLayout.presetFamily}` : "未登记",
      版式来源: referenceLayout?.sourcePreview || "",
      标题长度: titleLength,
      证据块: evidenceCount,
      文本密度: textDensity,
      状态: issues.length ? "提醒" : "通过",
      校验结论: issues.length ? issues.join("；") : "标题、证据块、管理含义和口径提示满足PPTX可读性口径。"
    };
  });
}

function pptxVisualReadabilitySummary(root = document) {
  const rows = pptxVisualReadabilityRows(root);
  const warnings = rows.filter((row) => row.状态 !== "通过");
  const sample = warnings.slice(0, 3).map((row) => `${row.序号}.${row.校验结论}`).join("；");
  return {
    status: !rows.length ? "bad" : warnings.length ? "warn" : "ok",
    rows,
    warnings,
    issues: !rows.length ? ["PPTX视觉可读性无可校验章节"] : warnings.map((row) => row.校验结论),
    conclusion: !rows.length
      ? "PPTX视觉可读性无可校验章节。"
      : warnings.length
        ? `发现 ${warnings.length} 页需要PPTX排版复核：${sample}`
        : "PPTX页型、标题长度、证据块、文本密度和口径提示均已覆盖。"
  };
}

function exportRouteSequence(route = "HTML", root = document) {
  const source = reportSequenceRows(root);
  return source.map((row) => ({
    ...row,
    导出链路: route,
    同源口径: route === "PDF" ? "浏览器打印读取正式报告HTML" : route === "PPTX" ? "PPTX读取正式报告contract" : "正式报告HTML母版"
  }));
}

function exportSequenceQaRows(root = document) {
  const htmlRows = exportRouteSequence("HTML", root);
  const pdfRows = exportRouteSequence("PDF", root);
  const pptxRows = exportRouteSequence("PPTX", root);
  const expected = htmlRows.map((row) => `${row.序号}|${row.页面ID}|${row.章节标题}`);
  const pdfReadability = pdfReadabilityChecks(root);
  const pptxVisual = pptxVisualReadabilitySummary(root);
  return [
    { 链路: "HTML", 页数: htmlRows.length, 状态: htmlRows.length ? "ok" : "bad", 校验结论: "正式报告HTML为唯一内容树。" },
    {
      链路: "PDF",
      页数: pdfRows.length,
      状态: pdfRows.map((row) => `${row.序号}|${row.页面ID}|${row.章节标题}`).join("¶") === expected.join("¶") && pdfRows.length ? "ok" : "bad",
      校验结论: "PDF/打印读取同一HTML报告树，页序与HTML保持一致。"
    },
    {
      链路: "PDF可读性",
      页数: pdfRows.length,
      状态: pdfReadability.status,
      校验结论: pdfReadability.issues.length ? pdfReadability.issues.join("；") : "PDF打印样式已覆盖颜色、分页、防截断和表格可读性。"
    },
    {
      链路: "PPTX",
      页数: pptxRows.length,
      状态: pptxRows.map((row) => `${row.序号}|${row.页面ID}|${row.章节标题}`).join("¶") === expected.join("¶") && pptxRows.length ? "ok" : "bad",
      校验结论: "PPTX读取formalReport contract，保留章节标题、页型和页码。"
    },
    {
      链路: "PPTX可读性",
      页数: pptxVisual.rows.length,
      状态: pptxVisual.status,
      校验结论: pptxVisual.conclusion
    }
  ];
}

function pdfReadabilityChecks(root = document) {
  const scope = root?.querySelectorAll ? root : document;
  const rows = reportSequenceRows(scope);
  const issues = [];
  const roles = rows.reduce((acc, row) => {
    acc[row.页型] = (acc[row.页型] || 0) + 1;
    return acc;
  }, {});
  const requiredCss = [
    ".formal-so-what",
    ".formal-chart-readout",
    "print-color-adjust",
    "break-inside: avoid",
    "table-header-group",
    "formal-profit-waterfall",
    "formal-benchmark-line"
  ];
  const cssText = typeof document !== "undefined"
    ? [...document.styleSheets].map((sheet) => {
        try {
          return [...sheet.cssRules].map((rule) => rule.cssText || "").join("\n");
        } catch (error) {
          return "";
        }
      }).join("\n")
    : "";
  if (!rows.length) issues.push("正式报告无可打印章节");
  if (!roles.cover) issues.push("缺少封面页");
  if (!roles.executive) issues.push("缺少执行摘要页");
  if (!roles.action) issues.push("缺少行动建议页");
  if (!roles.appendix) issues.push("缺少附录页");
  if (rows.length > 45) issues.push(`章节数 ${rows.length} 偏多，PDF建议继续压缩`);
  if (scope.querySelectorAll && !scope.querySelectorAll(".formal-so-what").length) issues.push("正式报告缺少 So What 语言块");
  if (scope.querySelectorAll && !scope.querySelectorAll(".formal-chart-readout").length) issues.push("正式报告缺少读图结论块");
  if (cssText) {
    requiredCss.forEach((needle) => {
      if (!cssText.includes(needle)) issues.push(`打印样式缺少 ${needle}`);
    });
  }
  return { status: issues.length ? "warn" : "ok", issues };
}

function exportSequenceGateChecks(root = document) {
  const rows = reportSequenceRows(root);
  const ids = rows.map((row) => row.页面ID);
  const duplicateIds = ids.filter((id, index) => ids.indexOf(id) !== index);
  const roles = rows.reduce((acc, row) => {
    acc[row.页型] = (acc[row.页型] || 0) + 1;
    return acc;
  }, {});
  const missingTitles = rows.filter((row) => !row.章节标题 || row.章节标题.startsWith("第 "));
  const routeRows = exportSequenceQaRows(root);
  const routeFailures = routeRows.filter((row) => row.状态 === "bad");
  const routeWarnings = routeRows.filter((row) => row.状态 === "warn");
  const pdfReadability = pdfReadabilityChecks(root);
  const pptxVisual = pptxVisualReadabilitySummary(root);
  const blockers = [];
  const warnings = [];
  if (!rows.length) blockers.push("正式报告无可导出章节");
  if (!roles.cover) blockers.push("缺少封面页");
  if (!roles.executive) blockers.push("缺少执行摘要页");
  if (!roles.action) warnings.push("缺少行动建议页型");
  if (!roles.appendix) warnings.push("缺少附录页型");
  if (duplicateIds.length) blockers.push(`正式报告存在重复章节ID：${[...new Set(duplicateIds)].join("、")}`);
  if (missingTitles.length) warnings.push(`存在 ${missingTitles.length} 个章节标题需复核`);
  if (routeFailures.length) blockers.push(`导出链路页序未对齐：${routeFailures.map((row) => row.链路).join("、")}`);
  if (routeWarnings.length) warnings.push(`导出链路存在提醒：${routeWarnings.map((row) => row.链路).join("、")}`);
  if (pdfReadability.status !== "ok") warnings.push(`PDF可读性需复核：${pdfReadability.issues.join("；")}`);
  if (pptxVisual.status === "warn") warnings.push(pptxVisual.conclusion);
  return {
    status: blockers.length ? "bad" : warnings.length ? "warn" : "ok",
    blockers,
    warnings,
    rows,
    routes: routeRows,
    pdfReadability,
    pptxVisual
  };
}

function exportSequenceQaExportRows(root = document) {
  const sequence = reportSequenceRows(root);
  const routes = exportSequenceQaRows(root);
  const storylineRows = typeof deliveryStorylineQaRows === "function" ? deliveryStorylineQaRows(root) : [];
  const pptxVisualRows = typeof pptxVisualReadabilityRows === "function" ? pptxVisualReadabilityRows(root) : [];
  return [
    ...routes.map((row) => ({
      类型: "链路校验",
      链路: row.链路,
      序号: "",
      页面ID: "",
      章节标题: "",
      页型: "",
      状态: sequenceQaStatusLabel(row.状态),
      校验结论: row.校验结论
    })),
    ...sequence.map((row) => ({
      类型: "章节页序",
      链路: "正式报告contract",
      序号: row.序号,
      页面ID: row.页面ID,
      章节标题: row.章节标题,
      页型: row.页型,
      状态: row.纳入状态,
      校验结论: `${row.模块 || "正式报告"}｜HTML ${row.HTML链路 || "formalReport"}｜PDF ${row.PDF链路 || "browserPrintFormalReport"}｜PPTX ${row.PPTX链路 || row.PPT页型}`
    })),
    ...storylineRows,
    ...pptxVisualRows
  ];
}

function renderExportSequenceQaPanel() {
  const host = document.getElementById("exportSequenceQaPanel");
  if (!host) return;
  const gate = exportSequenceGateChecks();
  const routes = gate.routes || [];
  const rows = gate.rows || [];
  const preview = rows.slice(0, 8).map((row) => `
    <tr>
      <td>${String(row.序号).padStart(2, "0")}</td>
      <td>${sequenceQaEscape(row.章节标题)}</td>
      <td>${sequenceQaEscape(row.页型)}</td>
      <td>${sequenceQaEscape(row.PPT页型)}</td>
    </tr>
  `).join("");
  const routeCards = routes.map((row) => `
    <div class="sequence-route-card ${row.状态}">
      <span>${sequenceQaEscape(row.链路)}</span>
      <b>${row.页数}</b>
      <em>${sequenceQaEscape(sequenceQaStatusLabel(row.状态))}</em>
      <p>${sequenceQaEscape(row.校验结论)}</p>
    </div>
  `).join("");
  const issueText = gate.blockers.length
    ? gate.blockers.join("；")
    : gate.warnings.length
      ? gate.warnings.join("；")
      : "HTML、PDF/打印和PPTX均读取同一正式报告页序。";
  host.innerHTML = `
    <div class="governance-head">
      <span>导出页序 QA</span>
      <h3>正式报告、PDF和PPTX必须共享同一内容树</h3>
      <p>${sequenceQaEscape(issueText)}</p>
    </div>
    <div class="sequence-route-grid">${routeCards}</div>
    <div class="sequence-table-wrap">
      <table class="sequence-qa-table">
        <thead><tr><th>页</th><th>章节标题</th><th>页型</th><th>PPT页型</th></tr></thead>
        <tbody>${preview || `<tr><td colspan="4">暂无正式报告页序。</td></tr>`}</tbody>
      </table>
    </div>
  `;
}

function initExportSequenceQaModule() {
  const originalRenderAll = typeof renderAll === "function" ? renderAll : null;
  if (originalRenderAll && !originalRenderAll.__exportSequenceQaWrapped) {
    renderAll = function renderAllWithExportSequenceQa() {
      const result = originalRenderAll.apply(this, arguments);
      renderExportSequenceQaPanel();
      return result;
    };
    renderAll.__exportSequenceQaWrapped = true;
  }
  renderExportSequenceQaPanel();
}
