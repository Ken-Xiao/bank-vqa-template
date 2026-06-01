/* Bank VQA module: 16-trial-checks.js — trial readiness checks and export history */

var EXPORT_HISTORY_KEY = "bankVqaExportHistory";

function exportHistoryItems() {
  try {
    return JSON.parse(localStorage.getItem(EXPORT_HISTORY_KEY) || "[]");
  } catch (error) {
    return [];
  }
}

function saveExportHistory(items) {
  localStorage.setItem(EXPORT_HISTORY_KEY, JSON.stringify(items.slice(0, 12)));
}

function recordExportHistory(format) {
  const items = exportHistoryItems();
  items.unshift({
    format,
    target: state.target,
    year: state.year,
    reportVersion: state.reportVersion,
    projectName: state.projectName || `${state.target}_${state.year}`,
    rulesVersion: typeof rulesVersionLabel === "function" ? rulesVersionLabel() : "未标注",
    exportedAt: new Date().toISOString()
  });
  saveExportHistory(items);
  renderExportHistory();
}

function renderExportHistory() {
  const host = document.getElementById("exportHistoryList");
  if (!host) return;
  const items = exportHistoryItems();
  if (!items.length) {
    host.innerHTML = `<div class="export-history-item"><span class="trial-dot"></span><div><b>暂无导出记录</b><br/>导出 HTML、PPTX 或数据底稿后会显示在这里。</div></div>`;
    return;
  }
  host.innerHTML = items.slice(0, 5).map((item) => {
    const time = item.exportedAt ? new Date(item.exportedAt).toLocaleString("zh-CN", { hour12: false }) : "未知时间";
    return `<div class="export-history-item"><span class="trial-dot"></span><div><b>${item.format}｜${item.projectName || item.target}</b><br/>${item.target}｜${item.year}｜${item.reportVersion}｜${time}</div></div>`;
  }).join("");
}

function selectedTopicCount() {
  if (typeof topicDefinitions !== "function") return 0;
  return topicDefinitions().filter((topic) => typeof isTopicIncluded === "function" ? isTopicIncluded(topic.id) : true).length;
}

function missingImageCount() {
  return [...document.images].filter((img) => !img.complete || img.naturalWidth === 0).length;
}

function formalReportExportHealth() {
  if (typeof renderFormalReport === "function") renderFormalReport();
  const sections = typeof applyFormalReportContract === "function"
    ? applyFormalReportContract()
    : [...document.querySelectorAll("#formalReport > header, #formalReport > section")];
  const figures = [...document.querySelectorAll("#formalReport .formal-figure-card img")];
  const missingFigureImages = figures.filter((img) => {
    const src = img.dataset?.src || img.currentSrc || img.src || "";
    return !src || (!src.startsWith("data:") && !img.complete) || img.naturalWidth === 0;
  });
  const roles = sections.reduce((acc, section) => {
    const role = section.dataset?.pageRole || "content";
    acc[role] = (acc[role] || 0) + 1;
    return acc;
  }, {});
  return {
    sections: sections.length,
    figures: figures.length,
    missingFigureImages: missingFigureImages.length,
    roles,
    hasContract: sections.length > 0 && sections.every((section) => section.dataset?.slideIndex && section.dataset?.sectionTitle && section.dataset?.pageRole),
    hasCover: roles.cover > 0,
    hasExecutive: roles.executive > 0,
    hasAppendix: roles.appendix > 0
  };
}

function criticalMetricCompleteness() {
  const keys = ["roa", "coreRevenueGrowth", "nim", "feeAssetRatio", "npl", "hiddenNplExposure", "provisionCoverage", "cet1Buffer", "rwaDensity", "pb"];
  const rows = selectedBankRecords();
  const rates = keys.map((key) => completeness(rows, key)).filter((v) => v !== null && v !== undefined);
  if (!rates.length) return null;
  return rates.reduce((a, b) => a + b, 0) / rates.length;
}

function trialReadinessChecks() {
  const charts = Number(includedChartCount()) || 0;
  const topics = selectedTopicCount();
  const criticalRate = criticalMetricCompleteness();
  const slides = document.querySelectorAll("#printDeck .print-slide").length;
  const missingImgs = missingImageCount();
  const formal = formalReportExportHealth();
  const rows = [];
  rows.push({
    key: "scope",
    status: state.confirmed && state.peers.length >= 3 ? "ok" : "bad",
    title: "分析口径",
    text: state.confirmed ? `目标银行 ${state.target}，对标银行 ${state.peers.length} 家。` : "尚未确认分析口径。"
  });
  rows.push({
    key: "data",
    status: criticalRate == null ? "warn" : criticalRate >= 0.8 ? "ok" : criticalRate >= 0.6 ? "warn" : "bad",
    title: "关键指标完整性",
    text: criticalRate == null ? "暂无完整性结果。" : `核心指标在当前样本中的平均完整性为 ${(criticalRate * 100).toFixed(1)}%。`
  });
  rows.push({
    key: "topics",
    status: topics >= 3 ? "ok" : topics > 0 ? "warn" : "bad",
    title: "入选专题",
    text: `当前纳入 ${topics} 个专题；建议试点报告至少保留 3 个专题。`
  });
  rows.push({
    key: "charts",
    status: charts > 25 ? "warn" : charts >= 8 ? "ok" : charts >= 4 ? "warn" : "bad",
    title: "入选图表",
    text: `当前纳入 ${charts || 0} 张图；建议正式报告控制在 8-25 张。`
  });
  rows.push({
    key: "assets",
    status: formal.missingFigureImages === 0 ? "ok" : "bad",
    title: "正式报告图片资源",
    text: formal.missingFigureImages === 0 ? `正式报告图表证据 ${formal.figures} 张，未发现图片资源失败。` : `正式报告发现 ${formal.missingFigureImages} 个图表图片未加载。`
  });
  rows.push({
    key: "formal-contract",
    status: formal.hasContract && formal.hasCover && formal.hasExecutive ? "ok" : "bad",
    title: "正式报告 contract",
    text: formal.hasContract ? `正式报告 ${formal.sections} 个章节，已写入页序、标题和页型。` : "正式报告章节元数据不完整。"
  });
  rows.push({
    key: "formal-pages",
    status: formal.sections > 45 ? "warn" : formal.sections >= 12 ? "ok" : formal.sections >= 6 ? "warn" : "bad",
    title: "正式报告页数",
    text: `正式报告共 ${formal.sections} 个章节；旧版中间稿 ${slides} 页仅作兼容参考。`
  });
  rows.push({
    key: "formal-figures",
    status: formal.figures >= 4 ? "ok" : "warn",
    title: "图表证据章节",
    text: formal.figures ? `正式报告已纳入 ${formal.figures} 张图表证据。` : "正式报告尚未纳入图片图表证据；可导出文字报告，但建议补充图表证据页。"
  });
  if (typeof deliveryGateChecks === "function") {
    const gate = deliveryGateChecks();
    rows.push({
      key: "delivery-gate",
      status: gate.status === "bad" ? "bad" : gate.status === "warn" ? "warn" : "ok",
      title: "交付门禁",
      text: gate.blockers.length
        ? gate.blockers.join("；")
        : gate.warnings.length
          ? gate.warnings.join("；")
          : "PRD、复核状态和 AI 引用审计未发现阻断。"
    });
  }
  if (typeof aiGovernanceGateChecks === "function") {
    const aiGate = aiGovernanceGateChecks();
    rows.push({
      key: "ai-governance",
      status: aiGate.status === "bad" ? "bad" : aiGate.warnings.length ? "warn" : "ok",
      title: "AI 引用审计",
      text: aiGate.blockers.length
        ? aiGate.blockers.join("；")
        : aiGate.warnings.length
          ? aiGate.warnings.join("；")
          : "AI 解读均已绑定事实包引用。"
    });
  }
  if (typeof exportSequenceGateChecks === "function") {
    const sequenceGate = exportSequenceGateChecks();
    rows.push({
      key: "export-sequence",
      status: sequenceGate.status === "bad" ? "bad" : sequenceGate.status === "warn" ? "warn" : "ok",
      title: "导出页序一致性",
      text: sequenceGate.blockers.length
        ? sequenceGate.blockers.join("；")
        : sequenceGate.warnings.length
          ? sequenceGate.warnings.join("；")
          : `HTML、PDF和PPTX均读取同一正式报告页序，共 ${sequenceGate.rows.length} 个章节。`
    });
  }
  if (typeof pptxVisualReadabilityRows === "function") {
    const visualRows = pptxVisualReadabilityRows();
    const visualWarnings = visualRows.filter((row) => row.状态 !== "通过");
    rows.push({
      key: "pptx-visual-readability",
      status: !visualRows.length ? "bad" : visualWarnings.length ? "warn" : "ok",
      title: "PPTX视觉可读性",
      text: !visualRows.length
        ? "PPTX视觉可读性尚无可校验章节。"
        : visualWarnings.length
          ? `发现 ${visualWarnings.length} 页需复核：${visualWarnings.slice(0, 3).map((row) => `${row.序号}.${row.校验结论}`).join("；")}`
          : `PPTX ${visualRows.length} 页已覆盖标题、证据块、管理含义和口径提示。`
    });
  }
  return rows;
}

function updateTrialCheckPanel() {
  const list = document.getElementById("trialCheckList");
  const summary = document.getElementById("trialCheckSummary");
  if (!list || !summary) return;
  const checks = trialReadinessChecks();
  const bad = checks.filter((item) => item.status === "bad").length;
  const warn = checks.filter((item) => item.status === "warn").length;
  summary.textContent = bad
    ? `当前还有 ${bad} 项阻断问题、${warn} 项提醒，建议修正后再导出正式报告。`
    : warn
      ? `当前无阻断问题，有 ${warn} 项提醒；可导出试点报告，但建议复核。`
      : "当前试点检查全部通过，可导出 HTML/PPTX 和数据底稿。";
  list.innerHTML = checks.map((item) => `
    <div class="trial-check-item ${item.status}">
      <span class="trial-dot"></span>
      <div><b>${item.title}</b><br/>${item.text}</div>
    </div>
  `).join("");
  renderExportHistory();
  if (typeof renderExportSequenceQaPanel === "function") renderExportSequenceQaPanel();
}

function preflightExport(format) {
  if (!state.confirmed) {
    setProjectStatus("请先确认分析口径，再导出报告。");
    return false;
  }
  renderAll();
  if (typeof buildPrintDeck === "function") buildPrintDeck();
  const checks = trialReadinessChecks();
  const blockers = checks.filter((item) => item.status === "bad");
  updateTrialCheckPanel();
  if (blockers.length) {
    setProjectStatus(`${format} 导出前检查未通过：${blockers.map((item) => item.title).join("、")}。`);
    return false;
  }
  const warnings = checks.filter((item) => item.status === "warn");
  setProjectStatus(warnings.length ? `${format} 导出检查通过，但仍有提醒：${warnings.map((item) => item.title).join("、")}。` : `${format} 导出检查通过。`);
  return true;
}
