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
    status: missingImgs === 0 ? "ok" : "bad",
    title: "图表和图片资源",
    text: missingImgs === 0 ? "未发现图片加载失败。" : `发现 ${missingImgs} 个图片资源未加载。`
  });
  rows.push({
    key: "deck",
    status: slides > 45 ? "warn" : slides >= 8 ? "ok" : slides >= 4 ? "warn" : "bad",
    title: "报告页数",
    text: `当前 HTML/PPTX 中间稿共 ${slides} 页；试点汇报建议控制在 20-45 页。`
  });
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
}

function preflightExport(format) {
  if (!state.confirmed) {
    setProjectStatus("请先确认分析口径，再导出报告。");
    return false;
  }
  renderAll();
  buildPrintDeck();
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
