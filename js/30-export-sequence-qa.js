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
  return activeFormalReportSections(root).map((section, index) => ({
    序号: index + 1,
    页面ID: section.id || `formal-section-${index + 1}`,
    章节标题: section.dataset?.sectionTitle || section.querySelector?.("h1, h2")?.textContent?.trim() || `第 ${index + 1} 节`,
    模块: section.dataset?.moduleLabel || "",
    页型: section.dataset?.pageRole || "content",
    PPT页型: section.dataset?.deckType || "content",
    纳入状态: "纳入"
  }));
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
  return [
    { 链路: "HTML", 页数: htmlRows.length, 状态: htmlRows.length ? "ok" : "bad", 校验结论: "正式报告HTML为唯一内容树。" },
    {
      链路: "PDF",
      页数: pdfRows.length,
      状态: pdfRows.map((row) => `${row.序号}|${row.页面ID}|${row.章节标题}`).join("¶") === expected.join("¶") && pdfRows.length ? "ok" : "bad",
      校验结论: "PDF/打印读取同一HTML报告树，页序与HTML保持一致。"
    },
    {
      链路: "PPTX",
      页数: pptxRows.length,
      状态: pptxRows.map((row) => `${row.序号}|${row.页面ID}|${row.章节标题}`).join("¶") === expected.join("¶") && pptxRows.length ? "ok" : "bad",
      校验结论: "PPTX读取formalReport contract，保留章节标题、页型和页码。"
    }
  ];
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
  const routeFailures = routeRows.filter((row) => row.状态 !== "ok");
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
  return {
    status: blockers.length ? "bad" : warnings.length ? "warn" : "ok",
    blockers,
    warnings,
    rows,
    routes: routeRows
  };
}

function exportSequenceQaExportRows(root = document) {
  const sequence = reportSequenceRows(root);
  const routes = exportSequenceQaRows(root);
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
      校验结论: `${row.模块 || "正式报告"}｜PPT页型 ${row.PPT页型}`
    }))
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
