/* Bank VQA module: 07-export.js */
function slideKicker(title, idx) {
  if (title.includes("1-") || title.includes("LPR") || title.includes("收入结构")) return "一、经营压力传导";
  if (title.includes("2-") || title.includes("盈利") || title.includes("手续费") || title.includes("ROA")) return "二、盈利结构与轻资本能力";
  if (title.includes("3-") || title.includes("息差") || title.includes("负债")) return "三、息差防守与负债底盘";
  if (title.includes("4-") || title.includes("风险") || title.includes("偏离") || title.includes("不良")) return "四、风险确认与拨备缓冲";
  if (title.includes("5-") || title.includes("资本") || title.includes("市净率") || title.includes("成本")) return "五、资本纪律与估值验证";
  return `图表分析 ${String(idx + 1).padStart(2, "0")}`;
}

function slideMetricLine(title) {
  const t = targetRecord();
  const peers = peerRecords();
  const typeRows = currentRecords();
  if (!t) return "目标银行数据尚未生成。";
  if (title.includes("息差") || title.includes("负债") || title.includes("LPR")) {
    return `${t.bank}净息差 ${fmt(t.nim)}，生息资产收益率 ${fmt(t.earningAssetYield)}，计息负债成本率 ${fmt(t.interestLiabilityCost)}；对标组净息差均值 ${fmt(avg(peers, "nim"))}，类型均值 ${fmt(avg(typeRows, "nim"))}。`;
  }
  if (title.includes("手续费") || title.includes("轻资本") || title.includes("收入结构") || title.includes("盈利")) {
    return `${t.bank}核心营收增速 ${fmt(t.coreRevenueGrowth)}，手续费资产比 ${fmt(t.feeAssetRatio, 3)}，非息收入占比 ${fmt(t.nonInterestShare)}；对标组手续费资产比均值 ${fmt(avg(peers, "feeAssetRatio"), 3)}。`;
  }
  if (title.includes("风险") || title.includes("偏离") || title.includes("不良") || title.includes("利润质量")) {
    return `${t.bank}不良率 ${fmt(t.npl)}，逾期不良偏离度 ${fmt(t.overdueNplDeviation, 2, "")}，拨备覆盖率 ${fmt(t.provisionCoverage)}；对标组偏离度均值 ${fmt(avg(peers, "overdueNplDeviation"), 2, "")}。`;
  }
  if (title.includes("资本") || title.includes("市净率") || title.includes("成本")) {
    return `${t.bank}核心一级资本余量 ${fmt(t.cet1Buffer, 0, "bp")}，风险加权资产密度 ${fmt(t.rwaDensity)}，市净率 ${t.pb == null ? "暂无" : t.pb.toFixed(2) + "x"}；对标组市净率均值 ${avg(peers, "pb") == null ? "暂无" : avg(peers, "pb").toFixed(2) + "x"}。`;
  }
  return `${t.bank}总资产收益率 ${fmt(t.roa)}，核心营收增速 ${fmt(t.coreRevenueGrowth)}，市净率 ${t.pb == null ? "暂无" : t.pb.toFixed(2) + "x"}。`;
}

function shortText(text, limit = 72) {
  const clean = typeof reportNeutralText === "function" ? reportNeutralText(text) : String(text || "");
  if (!clean) return "";
  return clean.length > limit ? `${clean.slice(0, limit)}。` : clean;
}

function xmlEscape(value) {
  if (value === null || value === undefined) return "";
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function worksheetXml(name, rows) {
  const safeRows = rows.length ? rows : [{ 提示: "暂无数据" }];
  const headers = [...safeRows.reduce((set, row) => {
    Object.keys(row).forEach((key) => set.add(key));
    return set;
  }, new Set())];
  const headerXml = `<Row>${headers.map((h) => `<Cell><Data ss:Type="String">${xmlEscape(h)}</Data></Cell>`).join("")}</Row>`;
  const bodyXml = safeRows.map((row) => `<Row>${headers.map((h) => {
    const value = row[h];
    const isNumber = typeof value === "number" && Number.isFinite(value);
    return `<Cell><Data ss:Type="${isNumber ? "Number" : "String"}">${xmlEscape(value)}</Data></Cell>`;
  }).join("")}</Row>`).join("");
  return `<Worksheet ss:Name="${xmlEscape(name.slice(0, 31))}"><Table>${headerXml}${bodyXml}</Table></Worksheet>`;
}

function downloadWorkbookLegacy(filename, sheets) {
  const workbook = `<?xml version="1.0" encoding="UTF-8"?>
    <?mso-application progid="Excel.Sheet"?>
    <Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet"
      xmlns:o="urn:schemas-microsoft-com:office:office"
      xmlns:x="urn:schemas-microsoft-com:office:excel"
      xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet">
      ${sheets.map((sheet) => worksheetXml(sheet.name, sheet.rows)).join("")}
    </Workbook>`;
  const blob = new Blob([workbook], { type: "application/vnd.ms-excel;charset=utf-8" });
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  URL.revokeObjectURL(link.href);
  link.remove();
}

async function ensureSheetJsLoaded() {
  if (window.XLSX) return;
  await loadExportScript("https://cdn.jsdelivr.net/npm/xlsx@0.18.5/dist/xlsx.full.min.js");
}

function loadExportScript(url) {
  return new Promise((resolve, reject) => {
    if (document.querySelector(`script[src="${url}"]`)) {
      resolve();
      return;
    }
    const script = document.createElement("script");
    script.src = url;
    script.onload = resolve;
    script.onerror = reject;
    document.head.appendChild(script);
  });
}

async function downloadWorkbook(filename, sheets) {
  const xlsxName = filename.replace(/\.xls$/i, ".xlsx");
  try {
    await ensureSheetJsLoaded();
    const workbook = XLSX.utils.book_new();
    sheets.forEach((sheet) => {
      const rows = sheet.rows.length ? sheet.rows : [{ 提示: "暂无数据" }];
      const worksheet = XLSX.utils.json_to_sheet(rows);
      XLSX.utils.book_append_sheet(workbook, worksheet, sheet.name.slice(0, 31));
    });
    XLSX.writeFile(workbook, xlsxName);
    return;
  } catch (error) {
    downloadWorkbookLegacy(filename.endsWith(".xls") ? filename : `${filename}.xls`, sheets);
  }
}

function safeFilename(text) {
  return String(text || "报告").replace(/[\\/:*?"<>|]/g, "_").replace(/\s+/g, "");
}

function formalReportBaseFilename() {
  return `${safeFilename(displayBankName(state.target) || state.target)}_${state.year}_正式报告`;
}

function formalReportExportMeta(format = "HTML") {
  const ext = String(format || "HTML").toLowerCase();
  return {
    format: `正式报告 ${String(format || "HTML").toUpperCase()}`,
    baseName: formalReportBaseFilename(),
    filename: `${formalReportBaseFilename()}.${ext}`,
    contentSource: "formalReport contract",
    note: "页序、章节标题、页型和图表证据读取同一正式报告内容树"
  };
}

function downloadTextFile(filename, content, type = "text/html;charset=utf-8") {
  const blob = new Blob([content], { type });
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  URL.revokeObjectURL(link.href);
  link.remove();
}

function pendingDataExportRows(selectedRows = selectedBankRecords()) {
  return metricKeysForCoverage().map((key) => {
    const rate = completeness(selectedRows, key);
    if (rate == null || rate >= 0.6) return null;
    const entry = metricDictionaryEntry(key);
    return {
      指标: fieldName(key),
      指标代码: key,
      主题: entry?.theme || metricTheme(key),
      选定样本完整性: `${(rate * 100).toFixed(1)}%`,
      缺失原因: missingReasonForMetric(key, targetRecord()),
      处理建议: "不宜作为主结论依据，应进入附录或待补数据清单"
    };
  }).filter(Boolean);
}

async function loadReportExportCss() {
  const files = ["styles/app.css", "styles/rsm-consulting-ppt.css", "styles/rsm-deck.css", "styles/print.css"];
  const chunks = [];
  for (const file of files) {
    try {
      const response = await fetch(file, { cache: "no-store" });
      if (!response.ok) continue;
      chunks.push(await response.text());
    } catch (error) {
      /* ignore missing stylesheet */
    }
  }
  if (chunks.length) return chunks.join("\n");
  const liveCss = [];
  [...document.styleSheets].forEach((sheet) => {
    try {
      [...sheet.cssRules].forEach((rule) => liveCss.push(rule.cssText));
    } catch (error) {
      /* file:// and cross-origin stylesheets may be unreadable */
    }
  });
  return liveCss.join("\n");
}

function exportClientText(text = "") {
  return String(text || "")
    .replace(/HTML演示报告中间稿（苏农汇报材料母版）/g, "董事会汇报材料")
    .replace(/HTML演示报告中间稿/g, "董事会汇报材料")
    .replace(/演示报告/g, "汇报材料")
    .replace(/规则版本[^｜|。]*[｜|。]?/g, "")
    .replace(/AI模式[^｜|。]*[｜|。]?/g, "")
    .replace(/PPTX/g, "汇报稿")
    .replace(/HTML/g, "汇报稿")
    .replace(/Excel/g, "指标底稿")
    .replace(/VQA/g, "价值质量")
    .replace(/系统会/g, "本报告将")
    .replace(/系统/g, "本报告")
    .replace(/生成/g, "形成")
    .replace(/工作流/g, "分析流程")
    .replace(/工作台/g, "分析页面")
    .replace(/事实包/g, "事实依据")
    .replace(/底稿/g, "指标底稿")
    .replace(/导出/g, "形成")
    .replace(/复核提示/g, "结论边界")
    .replace(/\s+/g, " ")
    .trim();
}

function cloneClientDeckForExport(deck) {
  const wrapper = document.createElement("section");
  wrapper.className = "print-deck";
  if (!deck) return wrapper;
  [...deck.querySelectorAll(".print-slide")].forEach((slide, index) => {
    const clone = slide.cloneNode(true);
    clone.id = clone.id || `export-slide-${index + 1}`;
    clone.dataset.pageRole = clone.matches(".chart-slide")
      ? "证明页"
      : clone.matches(".executive-takeaways-slide")
        ? "决策页"
        : clone.matches(".chapter-synthesis-slide")
          ? "章节小结"
          : clone.matches(".appendix-slide")
            ? "附录页"
            : "诊断页";
    clone.querySelectorAll(".client-internal, script, style, textarea, button, select, input").forEach((el) => el.remove());
    const walker = document.createTreeWalker(clone, NodeFilter.SHOW_TEXT);
    const nodes = [];
    while (walker.nextNode()) nodes.push(walker.currentNode);
    nodes.forEach((node) => {
      const next = exportClientText(node.nodeValue);
      if (next) node.nodeValue = next;
    });
    wrapper.appendChild(clone);
  });
  return wrapper;
}

function exportDeckQualitySummary(deck) {
  const slides = [...deck.querySelectorAll(".print-slide")];
  const chartSlides = slides.filter((slide) => slide.matches(".chart-slide")).length;
  const synthesisSlides = slides.filter((slide) => slide.matches(".chapter-synthesis-slide")).length;
  const executiveSlides = slides.filter((slide) => slide.matches(".executive-takeaways-slide")).length;
  const longTitles = slides.filter((slide) => {
    const title = slide.querySelector(".rsm-slide-head h2, .rsm-cover-title-panel h1")?.textContent?.trim() || "";
    return title.length > 48;
  }).length;
  return {
    slides: slides.length,
    chartSlides,
    synthesisSlides,
    executiveSlides,
    longTitles,
    status: executiveSlides && synthesisSlides && longTitles <= 3 ? "client-ready draft" : "needs-review"
  };
}

async function reportHtmlDocument() {
  if (typeof renderAll === "function") renderAll();
  else if (typeof buildPrintDeck === "function") buildPrintDeck();
  const style = await loadReportExportCss();
  const title = `${state.target}_${state.year}_价值质量诊断与经营对标分析`;
  const reportTitle = `${displayBankName(state.target)}${state.year}年价值质量诊断与经营对标分析`;
  const exportedAt = new Date().toLocaleString("zh-CN", { hour12: false });
  const reportHtml = typeof buildFormalReportHtml === "function"
    ? buildFormalReportHtml({ exportMode: true })
    : cloneClientDeckForExport(document.getElementById("printDeck")).outerHTML;
  const wrapper = document.createElement("div");
  wrapper.innerHTML = reportHtml;
  const sections = typeof applyFormalReportContract === "function"
    ? applyFormalReportContract(wrapper)
    : [...wrapper.querySelectorAll("header, section")];
  if (typeof applyReportStructureContract === "function") applyReportStructureContract(wrapper);
  const exportSections = sections.filter((section) => section.dataset?.structureIncluded !== "false" && !section.hidden);
  const exportNav = exportSections.map((section, idx) => {
    const id = section.id || `formal-export-section-${idx + 1}`;
    section.id = id;
    const label = section.dataset.sectionTitle || section.querySelector("h1, h2")?.textContent?.trim() || `第 ${idx + 1} 节`;
    return `<a href="#${xmlEscape(id)}"><span>${String(idx + 1).padStart(2, "0")}</span>${xmlEscape(exportClientText(label))}</a>`;
  }).join("");
  const sectionCount = exportSections.length || wrapper.querySelectorAll(".print-slide").length;
  return `<!doctype html>
<html lang="zh-CN">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${xmlEscape(title)}</title>
  <style>
${style}
body { background: #F7F8FA; color: #2F3A4A; margin: 0; }
.app, .side-nav { display: none !important; }
.formal-report { max-width: 1120px; margin: 22px 292px 24px auto; box-shadow: 0 14px 45px rgba(6, 27, 58, .10); }
.formal-report-shell, .formal-report-head { display: block; }
.formal-report-head { display: none; }
.print-deck { display: none !important; }
.formal-report {
  background: #fff !important;
  border-top: 8px solid #0099D8 !important;
}
.formal-cover {
  background: linear-gradient(135deg, #061B3A 0%, #0B3D6A 58%, #0099D8 100%) !important;
  color: #fff !important;
}
.formal-cover h1,
.formal-cover p,
.formal-cover span,
.formal-cover b,
.formal-cover em {
  color: #fff !important;
}
.formal-executive,
.formal-section {
  background: #fff !important;
  border-top: 1px solid #E2E8F0 !important;
  position: relative;
}
.formal-executive::before,
.formal-section::before {
  content: "";
  display: block;
  width: 92px;
  height: 7px;
  background: linear-gradient(90deg, #6A6F76 0 28%, #10B981 28% 48%, #0099D8 48% 100%);
  margin-bottom: 18px;
}
.formal-section-kicker,
.formal-report-head span {
  color: #0099D8 !important;
}
.formal-executive h2,
.formal-section h2 {
  color: #061B3A !important;
}
.formal-lead,
.formal-callout {
  background: #F3F8FC !important;
  border-left: 6px solid #0099D8 !important;
}
.formal-metric-hero,
.formal-risk-card,
.formal-sequence-card,
.formal-action-card,
.formal-consistency-card,
.formal-drill-card {
  background: #fff !important;
  border: 1px solid #D9E4EF !important;
  border-left: 5px solid #0099D8 !important;
  box-shadow: 0 10px 22px rgba(6,27,58,.07) !important;
}
.formal-metric-hero b,
.formal-risk-card b,
.formal-sequence-card b,
.formal-action-card b {
  color: #061B3A !important;
}
.formal-fact-table th {
  background: #061B3A !important;
  color: #fff !important;
}
.formal-fact-table td:first-child,
.formal-peer-matrix th {
  color: #061B3A !important;
  font-weight: 900 !important;
}
.html-report-nav {
  position: fixed;
  right: 18px;
  top: 18px;
  bottom: 18px;
  width: 242px;
  z-index: 20;
  overflow: auto;
  background: rgba(255,255,255,.96);
  border: 1px solid #D9E1EA;
  border-top: 5px solid #0099D8;
  padding: 12px;
  box-shadow: 0 12px 34px rgba(26,58,92,.14);
}
.html-report-nav h3 {
  margin: 0 0 10px;
  color: #061B3A;
  font-size: 15px;
}
.html-report-nav a {
  display: grid;
  grid-template-columns: 24px minmax(0, 1fr);
  gap: 8px;
  color: #667085;
  text-decoration: none;
  font-size: 12px;
  font-weight: 800;
  line-height: 1.35;
  padding: 7px 8px;
  border-left: 3px solid transparent;
}
.html-report-nav a span {
  color: #0099D8;
  font-weight: 900;
}
.html-report-nav a:hover {
  color: #061B3A;
  background: #DFF1FC;
  border-left-color: #0099D8;
}
.html-export-note {
  max-width: 1120px;
  margin: 20px 292px 0 auto;
  background: #ffffff;
  border-left: 6px solid #0099D8;
  padding: 14px 18px;
  color: #2F3A4A;
  font: 700 15px/1.55 "Noto Sans SC", "Source Han Sans CN", "PingFang SC", "Microsoft YaHei", sans-serif;
  box-shadow: 0 10px 28px rgba(6,27,58,.08);
}
.html-export-note b {
  display: block;
  color: #061B3A;
  font-size: 18px;
  margin-bottom: 4px;
}
.client-internal { display: none !important; }
@media print {
  @page { size: A4; margin: 10mm; }
  body { background: #fff; }
  .formal-report { margin: 0; max-width: none; box-shadow: none; }
  .html-export-note, .html-report-nav { display: none; }
  .formal-cover,
  .formal-executive,
  .formal-section {
    break-after: page;
    page-break-after: always;
    min-height: auto !important;
    padding: 12mm 12mm 10mm !important;
  }
  .formal-cover {
    min-height: 250mm !important;
  }
  .formal-two-column,
  .formal-risk-grid,
  .formal-sequence-grid,
  .formal-action-grid,
  .formal-metric-grid {
    break-inside: avoid;
    page-break-inside: avoid;
  }
}
  </style>
</head>
<body>
  <nav class="html-report-nav"><h3>汇报页导航</h3>${exportNav}</nav>
  <div class="html-export-note"><b>${xmlEscape(reportTitle)}</b>报告版本：${xmlEscape(state.reportVersion)}｜对标银行：${xmlEscape(displayBankList(state.peers))}｜类型参照：${xmlEscape(state.types.join("、") || "所选类型银行")}｜报告结构：${sectionCount} 个章节｜形成时间：${xmlEscape(exportedAt)}｜数据来源：iFinD · 上市公司年报 · RSM 整理</div>
  ${wrapper.innerHTML}
</body>
</html>`;
}

async function downloadReportHtml() {
  const meta = formalReportExportMeta("HTML");
  downloadTextFile(meta.filename, await reportHtmlDocument());
  setProjectStatus(`${meta.format} 已导出：${meta.filename}。${meta.note}。`);
  return meta.filename;
}

function flattenRows(rows) {
  const keys = ["bank", "type", "region", "year", ...metricKeysForCoverage()];
  return rows.map((row) => {
    const out = {};
    keys.forEach((key) => {
      if (row[key] !== undefined) out[metricLabel[key] || key] = row[key];
    });
    return out;
  });
}

function typeAverageExportRows() {
  const keys = metricKeysForCoverage();
  return state.types.map((typeName) => {
    const rows = records.filter((row) => row.type === typeName && row.year === state.year);
    const out = { 银行类型: typeName, 年份: state.year, 样本数: rows.length };
    keys.forEach((key) => {
      const value = avg(rows, key);
      if (value !== null) out[metricLabel[key] || key] = value;
    });
    return out;
  });
}

function coverageExportRows(scopeRows) {
  return metricKeysForCoverage().map((key) => {
    const selectedRate = completeness(scopeRows, key);
    const allRate = completeness(records, key);
    const years = [...new Set(records.filter((row) => row[key] !== null && row[key] !== undefined && !Number.isNaN(row[key])).map((row) => row.year))].sort((a, b) => a - b);
    const entry = metricDictionaryEntry(key);
    const risk = typeof metricCalibrationRisk === "function" ? metricCalibrationRisk(key, scopeRows) : null;
    return {
      指标代码: key,
      指标名称: metricLabel[key] || key,
      主题: metricTheme(key),
      来源分组: entry?.source_group || "",
      来源字段: entry?.source_field || "",
      计算公式: entry?.formula || "",
      是否派生: entry?.is_derived ? "是" : entry ? "否" : "",
      缺失策略: entry?.missing_policy || "",
      口径风险等级: risk?.level || "",
      口径风险标签: risk?.label || "",
      报告使用建议: risk?.decisionUse || "",
      口径脚注: risk?.note || "",
      选定样本完整性: selectedRate == null ? "" : Number((selectedRate * 100).toFixed(2)),
      全样本完整性: allRate == null ? "" : Number((allRate * 100).toFixed(2)),
      可用年份: years.length ? `${years[0]}-${years[years.length - 1]}` : ""
    };
  });
}

function calibrationRiskExportRows(scopeRows = selectedBankRecords()) {
  return metricKeysForCoverage().map((key) => {
    const entry = metricDictionaryEntry(key);
    const risk = typeof metricCalibrationRisk === "function"
      ? metricCalibrationRisk(key, scopeRows)
      : { level: "", label: "", decisionUse: "", note: "", selectedRate: null, allRate: null, highRisk: false };
    const targetRow = targetRecord();
    return {
      指标代码: key,
      指标名称: entry?.metric_name || metricLabel[key] || key,
      主题: entry?.theme || metricTheme(key),
      口径风险等级: risk.level,
      口径风险标签: risk.label,
      报告使用建议: risk.decisionUse,
      口径脚注: risk.note,
      是否高敏感指标: risk.highRisk ? "是" : "否",
      目标银行当前值: targetRow?.[key] ?? "",
      目标银行缺失原因: missingReasonForMetric(key, targetRow),
      选定样本完整性: risk.selectedRate == null ? "" : Number((risk.selectedRate * 100).toFixed(2)),
      全样本完整性: risk.allRate == null ? "" : Number((risk.allRate * 100).toFixed(2)),
      来源分组: entry?.source_group || "",
      来源字段: entry?.source_field || "",
      计算公式: entry?.formula || analysisRules?.metrics?.[key]?.formula || "",
      判断方向: entry?.direction || analysisRules?.metrics?.[key]?.direction || "",
      缺失策略: entry?.missing_policy || "",
      覆盖银行: metricCoverageLines(key).join("；")
    };
  });
}

function exportFieldPriority(priority = "") {
  const text = String(priority || "");
  if (text.includes("高")) return "high";
  if (text.includes("中")) return "medium";
  if (text.includes("低")) return "low";
  return "none";
}

function fieldCoverageMatrixExportRows(matrix = fieldCoverageMatrix) {
  if (!Array.isArray(matrix) || !matrix.length) return [];
  return matrix.map((item, index) => {
    const meta = typeof fieldCoverageStatusMeta === "function"
      ? fieldCoverageStatusMeta(item.status)
      : { connected: String(item.status || "").includes("已接入"), level: "" };
    return {
      序号: index + 1,
      字段组: item.source_group || "未分组字段",
      来源字段: item.source_field || "",
      接入状态: meta.connected ? "connected" : "pending",
      原始状态: item.status || "",
      覆盖等级: meta.level || "",
      补数优先级: exportFieldPriority(item.priority),
      原始优先级: item.priority || "",
      处理建议: item.recommendation || ""
    };
  });
}

function exportMetadataRows(mode = "selected", scopeRows = selectedBankRecords()) {
  const riskRows = calibrationRiskExportRows(scopeRows);
  const riskCount = (level) => riskRows.filter((row) => row.口径风险等级 === level).length;
  const fieldRows = fieldCoverageMatrixExportRows();
  const pendingFields = fieldRows.filter((row) => row.接入状态 === "pending");
  const priorityFields = pendingFields.filter((row) => ["high", "medium"].includes(row.补数优先级));
  return [{
    目标银行: state.target,
    对标银行: state.peers.join("、"),
    分类型银行数据: state.types.join("、"),
    分析年份: state.year,
    报告版本: state.reportVersion,
    规则版本: typeof rulesVersionLabel === "function" ? rulesVersionLabel() : "未标注",
    AI写稿模式: aiProviderConfig?.provider || "local",
    对标组模板: state.peerTemplate,
    已纳入图表数: includedChartCount(),
    排除图表: Object.entries(state.includedCharts).filter(([, included]) => included === false).map(([key]) => key).join("、"),
    导出范围: mode === "all" ? "全部数据" : "选定银行与对标银行",
    L1口径风险指标数: riskCount("L1"),
    L2口径风险指标数: riskCount("L2"),
    L3口径风险指标数: riskCount("L3"),
    L4口径风险指标数: riskCount("L4"),
    字段矩阵总字段数: fieldRows.length,
    字段矩阵已接入字段数: fieldRows.filter((row) => row.接入状态 === "connected").length,
    字段矩阵待接入字段数: pendingFields.length,
    需优先补齐字段数: priorityFields.length,
    高优先级待补字段数: pendingFields.filter((row) => row.补数优先级 === "high").length,
    生成时间: new Date().toLocaleString("zh-CN", { hour12: false })
  }];
}

function metricDictionaryExportRows(scopeRows = selectedBankRecords()) {
  return metricKeysForCoverage().map((key) => {
    const entry = metricDictionaryEntry(key);
    const selectedRate = completeness(scopeRows, key);
    const allRate = completeness(records, key);
    const targetRow = targetRecord();
    const risk = typeof metricCalibrationRisk === "function" ? metricCalibrationRisk(key, scopeRows) : null;
    return {
      指标代码: key,
      指标名称: entry?.metric_name || metricLabel[key] || key,
      主题: entry?.theme || metricTheme(key),
      来源分组: entry?.source_group || "",
      来源字段: entry?.source_field || "",
      计算公式: entry?.formula || "",
      是否派生: entry?.is_derived ? "是" : entry ? "否" : "",
      判断方向: entry?.direction || analysisRules?.metrics?.[key]?.direction || "",
      缺失策略: entry?.missing_policy || "",
      目标银行当前值: targetRow?.[key] ?? "",
      目标银行缺失原因: missingReasonForMetric(key, targetRow),
      口径风险等级: risk?.level || "",
      口径风险标签: risk?.label || "",
      报告使用建议: risk?.decisionUse || "",
      口径脚注: risk?.note || "",
      选定样本完整性: selectedRate == null ? "" : Number((selectedRate * 100).toFixed(2)),
      全样本完整性: allRate == null ? "" : Number((allRate * 100).toFixed(2)),
      覆盖银行: metricCoverageLines(key).join("；")
    };
  });
}

function selectedReportSections() {
  const checked = [...document.querySelectorAll(".report-section-check:checked")].map((input) => input.value);
  return checked.length ? new Set(checked) : new Set(["01 / 06", "02 / 06", "03 / 06", "04 / 06", "05 / 06", "06 / 06"]);
}

function chartKeyFor(container) {
  if (!container) return "";
  const source = container.dataset.originalTitle
    || container.querySelector(".chart-title, b")?.textContent
    || "";
  return cleanChartName(source).replace(/\s+/g, "");
}

function isChartIncluded(container) {
  const key = chartKeyFor(container);
  return !key || state.includedCharts[key] !== false;
}

function setProjectStatus(text) {
  const el = document.getElementById("projectStatus");
  if (el) el.textContent = text;
}

function projectSnapshot() {
  return {
    target: state.target,
    peers: state.peers,
    year: state.year,
    types: state.types,
    includedCharts: state.includedCharts,
    reportVersion: state.reportVersion,
    peerTemplate: state.peerTemplate,
    activeTopic: state.activeTopic,
    confirmed: state.confirmed,
    savedAt: new Date().toISOString()
  };
}

function saveCurrentProject() {
  if (!state.confirmed) return;
  const project = projectSnapshot();
  localStorage.setItem("bankVqaLatestProject", JSON.stringify(project));
  state.projectName = `${state.target}_${state.year}`;
  setProjectStatus(`已保存项目：${state.projectName}，图表入选状态和分析口径会在本机保留。`);
}

function loadLatestProject() {
  const raw = localStorage.getItem("bankVqaLatestProject");
  if (!raw) {
    setProjectStatus("暂无已保存项目。");
    return false;
  }
  try {
    const project = JSON.parse(raw);
    state.target = project.target || state.target;
    state.peers = Array.isArray(project.peers) ? project.peers : state.peers;
    state.year = Number(project.year) || state.year;
    state.types = Array.isArray(project.types) ? project.types : state.types;
    state.includedCharts = project.includedCharts || {};
    state.reportVersion = project.reportVersion || state.reportVersion;
    state.peerTemplate = project.peerTemplate || "manual";
    state.activeTopic = project.activeTopic || state.activeTopic;
    state.confirmed = true;
    document.body.classList.add("analysis-ready");
    syncHiddenSelects();
    renderChoicePanels();
    updateSelectionSummary();
    applyReportVersion(state.reportVersion);
    const savedAt = project.savedAt ? new Date(project.savedAt).toLocaleString("zh-CN", { hour12: false }) : "未知时间";
    setProjectStatus(`已加载最近项目：${state.target}_${state.year}，保存时间：${savedAt}。`);
    return true;
  } catch (err) {
    setProjectStatus("最近项目读取失败，请重新保存。");
    return false;
  }
}

function syncChartControls() {
  document.querySelectorAll(".chart-card, .figure-thumb").forEach((card, idx) => {
    const key = chartKeyFor(card) || `chart_${idx + 1}`;
    if (!key) return;
    let control = card.querySelector(".chart-control");
    if (!control) {
      control = document.createElement("div");
      control.className = "chart-control";
      control.innerHTML = `<span>报告取舍</span><label><input type="checkbox" checked /> 纳入报告</label>`;
      card.prepend(control);
      control.querySelector("input").addEventListener("change", (event) => {
        state.includedCharts[key] = event.target.checked;
        buildSideNav();
        buildPrintDeck();
        setProjectStatus("图表取舍已更新，保存项目后可复用当前报告口径。");
      });
    }
    const input = control.querySelector("input");
    if (input) input.checked = state.includedCharts[key] !== false;
    card.classList.toggle("is-excluded", state.includedCharts[key] === false);
  });
}

function updateReportSectionVisibility() {
  const selected = selectedReportSections();
  document.querySelectorAll(".report-deck .report-page").forEach((page) => {
    page.classList.toggle("is-excluded", !selected.has(page.dataset.page));
  });
}

function chapterBriefText(page) {
  const label = page?.dataset?.page || "";
  const target = targetRecord()?.bank || state.target;
  const peerText = state.peers.join("、") || "对标银行";
  const map = {
    "01 / 06": `本章先给出${target}的30秒总判断，把经营端的回报、息差、风险和资本指标与资本市场端的市净率放在同一张诊断图里。对标组为${peerText}，用于判断偏离是个体问题还是同业共性。`,
    "02 / 06": `本章回答“利润是不是主业修复带来的”。重点看核心营收、手续费资产比、真实核心非息、高波动收入和拨备前利润，避免只用净利润解释经营改善。`,
    "03 / 06": `本章回答“负债端能不能对冲资产端让价”。重点看净息差、息差对冲缺口、真实存贷利差和定期化结构，判断资产负债管理优先级。`,
    "04 / 06": `本章回答“风险是否已经充分确认”。不只看不良率，还要把逾期偏离度、隐性不良、零售分产品不良和拨备覆盖率放在同一框架。`,
    "05 / 06": `本章回答“资本消耗是否换来价值创造”。通过资本余量、RWA密度、成本收入比、ROA和PB判断低估值是价值错配还是质量折价。`,
    "06 / 06": `本章把前面诊断转成董办行动顺序：先处理最弱的经营底盘，再进入中期能力建设，最后形成资本市场可沟通的价值质量叙事。`
  };
  return map[label] || "";
}

function updateChapterBriefs() {
  document.querySelectorAll(".report-deck .report-page").forEach((page) => {
    const text = chapterBriefText(page);
    if (!text) return;
    let brief = page.querySelector(".chapter-brief");
    if (!brief) {
      brief = document.createElement("div");
      brief.className = "chapter-brief";
      const note = page.querySelector(".page-note");
      note?.insertAdjacentElement("afterend", brief);
    }
    brief.textContent = text;
  });
}

async function exportDataWorkbook(mode = "selected") {
  const row = targetRecord();
  const peers = peerRecords();
  const selectedRows = selectedBankRecords();
  const factPack = vqaFactPack(row, peers);
  const sheets = [
    {
      name: "选择摘要",
      rows: [{
        目标银行: state.target,
        对标银行: state.peers.join("、"),
        分类型银行数据: state.types.join("、"),
        分析年份: state.year,
        报告版本: state.reportVersion,
        规则版本: typeof rulesVersionLabel === "function" ? rulesVersionLabel() : "未标注",
        AI写稿模式: aiProviderConfig?.provider || "local",
        对标组模板: state.peerTemplate,
        已纳入图表数: includedChartCount(),
        排除图表: Object.entries(state.includedCharts).filter(([, included]) => included === false).map(([key]) => key).join("、"),
        导出范围: mode === "all" ? "全部数据" : "选定银行与对标银行",
        生成时间: new Date().toLocaleString("zh-CN")
      }]
    },
    { name: "导出元数据", rows: exportMetadataRows(mode, selectedRows) },
    { name: "目标银行", rows: flattenRows(row ? series(row.bank) : []) },
    { name: "对标银行", rows: flattenRows(peers.flatMap((peer) => series(peer.bank))) },
    { name: "类型均值", rows: typeAverageExportRows() },
    { name: "指标完整性", rows: coverageExportRows(selectedRows) },
    { name: "指标口径", rows: metricDictionaryExportRows(selectedRows) },
    { name: "口径风险元数据", rows: calibrationRiskExportRows(selectedRows) },
    { name: "字段覆盖矩阵", rows: fieldCoverageMatrixExportRows() },
    { name: "待补数据清单", rows: pendingDataExportRows(selectedRows) },
    { name: "VQA诊断", rows: factPack ? factPack.summaryRows : [] },
    { name: "VQA维度评分", rows: factPack ? factPack.dimensionRows : [] },
    { name: "VQA事实清单", rows: factPack ? factPack.factRows : [] },
    { name: "图表事实包", rows: chartFactRows() },
    { name: "专题解释器", rows: topicExplainerRows(row, peers) },
    { name: "专题AI解读", rows: topicWorkbenchExportRows() },
    { name: "PRD完成度", rows: typeof prdCoverageExportRows === "function" ? prdCoverageExportRows() : [] },
    { name: "事实包注册表", rows: typeof factPackRegistryExportRows === "function" ? factPackRegistryExportRows() : [] },
    { name: "AI引用审计", rows: typeof narrativeAuditExportRows === "function" ? narrativeAuditExportRows() : [] },
    { name: "文案锁定状态", rows: typeof narrativeLockExportRows === "function" ? narrativeLockExportRows() : [] },
    { name: "交付复核状态", rows: typeof deliveryReviewExportRows === "function" ? deliveryReviewExportRows() : [] },
    { name: "导出页序QA", rows: typeof exportSequenceQaExportRows === "function" ? exportSequenceQaExportRows() : [] },
    { name: "CEAM叙事结构", rows: typeof ceamNarrativeExportRows === "function" ? ceamNarrativeExportRows() : [] },
    { name: "报告结构编辑", rows: typeof reportStructureExportRows === "function" ? reportStructureExportRows() : [] },
    { name: "结构化事实包", rows: typeof exportStructuredFactPackRows === "function" ? exportStructuredFactPackRows() : [] },
    { name: "机制归因事实包", rows: typeof exportMechanismFactPackRows === "function" ? exportMechanismFactPackRows() : [] },
    { name: "董办汇报主线", rows: factPack ? factPack.boardRows : [] }
  ];
  if (mode === "all") sheets.push({ name: "全样本明细", rows: flattenRows(records) });
  const safeName = `${state.target}_${state.year}_${mode === "all" ? "全量数据" : "选定数据"}.xlsx`;
  await downloadWorkbook(safeName, sheets);
  setProjectStatus(`数据底稿已导出：${safeName.replace(".xlsx", "")}.xlsx`);
}

function slideStoryHtml(title, chartIndex = 0) {
  const question = typeof getChartStoryField === "function" ? getChartStoryField(title, "question") : chartQuestion(title);
  const targetRead = typeof getChartStoryField === "function" ? getChartStoryField(title, "target") : narrativeFor(title).target;
  const peerRead = typeof getChartStoryField === "function" ? getChartStoryField(title, "peers") : narrativeFor(title).peers;
  const typeRead = typeof getChartStoryField === "function" ? getChartStoryField(title, "type") : typeBenchmarkNarrative(title);
  const actionRead = typeof getChartStoryField === "function" ? getChartStoryField(title, "action") : narrativeFor(title).action;
  const facts = chartFactPack(title);
  const chartNo = String(title).match(/图(\d+-\d+)/)?.[1] || String(chartIndex + 1).padStart(2, "0");
  const short = typeof reportShortText === "function" ? reportShortText : shortText;
  const polish = typeof reportNeutralText === "function" ? reportNeutralText : (value) => value;
  const evidence = [
    slideMetricLine(title),
    targetRead,
    peerRead
  ].filter(Boolean).map((item) => short(polish(item), 70)).slice(0, 3);
  const implication = [
    typeRead,
    actionRead
  ].filter(Boolean).map((item) => short(polish(item), 72)).slice(0, 2);
  const mechanism = typeof getChartStoryField === "function" && getChartStoryField(title, "mechanism")
    ? getChartStoryField(title, "mechanism")
    : chartMechanismText(title, facts);
  const validation = typeof getChartStoryField === "function" && getChartStoryField(title, "validation")
    ? getChartStoryField(title, "validation")
    : chartValidationText(title, facts);
  const clientLine = typeof clientFacingText === "function" ? clientFacingText : short;
  const actionLines = [
    actionRead,
    validation
  ].filter(Boolean).map((item) => clientLine(polish(item), 72)).slice(0, 3);
  return `
    <div class="print-chart-story-grid">
      <div class="print-chart-block"><b>本页结论</b><p>${clientLine(polish(question), 72)}</p></div>
      <div class="print-chart-block"><b>关键证据</b><ul>${evidence.slice(0, 2).map((item) => `<li>${clientLine(item, 68)}</li>`).join("")}</ul></div>
      <div class="print-chart-block"><b>管理含义</b><ul>${[...implication, ...actionLines].slice(0, 3).map((item) => `<li>${clientLine(item, 70)}</li>`).join("")}</ul></div>
    </div>
    <div class="print-chart-meta">
      <span><strong>事实包</strong>${short(facts.brief, 86)}</span>
      <span><strong>图表编号</strong>${chartNo}</span>
    </div>`;
}

function chartMechanismText(title, facts) {
  const row = targetRecord();
  const target = displayBankName(row?.bank || state.target);
  const names = facts?.rows?.slice(0, 3).map((item) => item.指标名称).filter(Boolean) || [];
  if (title.includes("息差") || title.includes("负债") || title.includes("存款") || title.includes("利差")) {
    return `${target}息差差异应同时拆解资产收益率、负债成本和存款结构，避免把净息差单点变化直接归因为资产端或负债端。`;
  }
  if (title.includes("盈利") || title.includes("核心") || title.includes("手续费") || title.includes("轻资本") || title.includes("收入")) {
    return `${target}盈利质量需要区分主业修复、轻资本收入和拨备前利润贡献，净利润改善不能单独证明经营质量改善。`;
  }
  if (title.includes("风险") || title.includes("不良") || title.includes("偏离") || title.includes("拨备") || title.includes("逾期")) {
    return `${target}风险判断应从结果不良前移到逾期偏离、隐性暴露和拨备缓冲，确认节奏会影响利润质量。`;
  }
  if (title.includes("资本") || title.includes("市净率") || title.includes("PB") || title.includes("RWA") || title.includes("估值")) {
    return `${target}资本市场定价需要由回报、风险确认和资本消耗共同解释，低市净率不宜直接写成价值错配。`;
  }
  return `${target}本页机制需结合${names.join("、") || "核心指标"}判断，先识别差异来源，再决定是否进入行动建议。`;
}

function chartValidationText(title, facts) {
  const names = facts?.rows?.slice(0, 3).map((item) => item.指标名称).filter(Boolean) || [];
  if (title.includes("息差") || title.includes("负债") || title.includes("存款") || title.includes("利差")) {
    return `后续建议跟踪净息差、生息资产收益率、计息负债成本率和息差对冲缺口，并按季度复核负债降本是否兑现。`;
  }
  if (title.includes("盈利") || title.includes("核心") || title.includes("手续费") || title.includes("轻资本") || title.includes("收入")) {
    return `后续建议跟踪核心营收增速、手续费资产比、真实核心非息和拨备前利润，验证利润是否来自主业修复。`;
  }
  if (title.includes("风险") || title.includes("不良") || title.includes("偏离") || title.includes("拨备") || title.includes("逾期")) {
    return `后续建议跟踪不良率、逾期不良偏离度、隐性不良和拨备覆盖率，识别风险确认是否滞后。`;
  }
  if (title.includes("资本") || title.includes("市净率") || title.includes("PB") || title.includes("RWA") || title.includes("估值")) {
    return `后续建议跟踪总资产收益率、核心一级资本余量、风险加权资产密度和市净率，验证扩表是否创造价值。`;
  }
  return `后续建议跟踪${names.join("、") || "本页核心指标"}，并在下一次项目复盘中更新对标差距。`;
}

function metricsForChart(title) {
  if (title.includes("收入结构")) return ["netInterestRevenueShare", "nonInterestShare"];
  if (title.includes("核心") || title.includes("轻资本") || title.includes("手续费") || title.includes("真实非息") || title.includes("现金利润")) return ["coreRevenueGrowth", "feeAssetRatio", "trueCoreNonInterest", "volatileIncomeShare", "cashProfitRatio"];
  if (title.includes("息差") || title.includes("负债") || title.includes("存款") || title.includes("利差") || title.includes("收益成色") || title.includes("票面")) return ["nim", "nimGapBp", "realLoanDepositSpread", "earningAssetYield", "interestLiabilityCost", "timeDepositShare"];
  if (title.includes("风险") || title.includes("偏离") || title.includes("不良") || title.includes("拨备") || title.includes("零售")) return ["npl", "overdueNplDeviation", "hiddenNplExposure", "provisionCoverage", "personalLoanNpl"];
  if (title.includes("资本") || title.includes("市净率") || title.includes("成本") || title.includes("RWA") || title.includes("投资资产")) return ["pb", "roa", "cet1Buffer", "carBuffer", "rwaDensity", "costIncomeRatio"];
  return ["roa", "coreRevenueGrowth", "nim", "pb"];
}

function chartFactPack(title) {
  const row = targetRecord();
  const peers = peerRecords();
  const typeRows = currentRecords().filter((r) => state.types.includes(r.type));
  const allRows = currentRecords();
  const metrics = metricsForChart(title).filter((key) => row && row[key] !== undefined);
  const rows = metrics.slice(0, 4).map((key) => {
    const value = row?.[key];
    const peerAvg = avg(peers, key);
    const typeAvg = avg(typeRows, key);
    const risk = typeof metricCalibrationRisk === "function" ? metricCalibrationRisk(key, [row, ...peers].filter(Boolean)) : null;
    return {
      图表: cleanChartName(title),
      指标代码: key,
      指标名称: metricLabel[key] || key,
      目标银行: row?.bank || state.target,
      目标值: value == null ? "" : Number(value.toFixed ? value.toFixed(4) : value),
      对标均值: peerAvg == null ? "" : Number(peerAvg.toFixed(4)),
      类型均值: typeAvg == null ? "" : Number(typeAvg.toFixed(4)),
      一年变化: row ? yoyValue(row.bank, key) : null,
      五年变化: row ? fiveYearValue(row.bank, key) : null,
      分位: rankPercentile(value, allRows, key, metricDirection(key)),
      完整性: completeness([row, ...peers].filter(Boolean), key) == null ? "" : Number((completeness([row, ...peers].filter(Boolean), key) * 100).toFixed(1)),
      口径风险等级: risk?.level || "",
      口径风险标签: risk?.label || "",
      报告使用建议: risk?.decisionUse || "",
      口径脚注: risk?.note || ""
    };
  });
  const lead = rows[0];
  const brief = lead
    ? `${lead.指标名称}目标值${lead.目标值 === "" ? "暂无" : lead.目标值}，对标均值${lead.对标均值 === "" ? "暂无" : lead.对标均值}，类型均值${lead.类型均值 === "" ? "暂无" : lead.类型均值}，${lead.分位}。`
    : "当前图表事实包仍需补充可用指标。";
  return { title: cleanChartName(title), rows, brief };
}

function chartFactRows() {
  const rows = [];
  document.querySelectorAll(".chart-card, .figure-thumb").forEach((card) => {
    if (!isChartIncluded(card)) return;
    const title = card.querySelector(".chart-title, b")?.textContent?.trim();
    if (!title) return;
    rows.push(...chartFactPack(title).rows);
  });
  return rows;
}

function includedChartCount() {
  const cards = [...document.querySelectorAll(".chart-card, .figure-thumb")];
  return cards.filter((card) => isChartIncluded(card)).length || "默认全部";
}

function typeBenchmarkNarrative(title) {
  const t = targetRecord();
  const typeRows = currentRecords();
  const typeText = state.types.length ? state.types.join("、") : "所选类型银行";
  if (!t) return `${typeText}作为行业参照底座，用于判断目标银行偏离是否属于类型共性。`;
  if (title.includes("息差") || title.includes("负债") || title.includes("定期")) {
    return `${typeText}息差对冲缺口均值为 ${fmtBp(avg(typeRows, "nimGapBp"))}、定期存款占比均值为 ${fmt(avg(typeRows, "timeDepositShare"))}。若目标银行缺口高于该均值，说明压力不只是行业共性，而是负债重定价和客群沉淀能力偏弱。`;
  }
  if (title.includes("轻资本") || title.includes("手续费") || title.includes("收入结构")) {
    return `${typeText}手续费资产比均值为 ${fmt(avg(typeRows, "feeAssetRatio"), 3)}、非息收入占比均值为 ${fmt(avg(typeRows, "nonInterestShare"))}。若目标银行低于均值，说明资产规模转化为服务收入的效率不足。`;
  }
  if (title.includes("风险") || title.includes("偏离") || title.includes("利润质量") || title.includes("零售")) {
    return `${typeText}偏离度均值为 ${fmt(avg(typeRows, "overdueNplDeviation"), 2, "")}、拨备覆盖率均值为 ${fmt(avg(typeRows, "provisionCoverage"))}。目标银行若偏离度更高且覆盖率更低，应视为风险确认优先级上升。`;
  }
  if (title.includes("资本") || title.includes("成本") || title.includes("市净率")) {
    return `${typeText}总资产收益率均值为 ${fmt(avg(typeRows, "roa"))}、市净率均值为 ${avg(typeRows, "pb") == null ? "暂无" : avg(typeRows, "pb").toFixed(2) + "x"}、成本收入比均值为 ${fmt(avg(typeRows, "costIncomeRatio"))}。估值判断必须同时看回报、风险和资本消耗。`;
  }
  return `${typeText}样本均值作为行业背景，图中目标银行与对标银行的偏离需要先与类型均值比较，再判断是单行问题还是类型共同压力。`;
}

function chartQuestion(title) {
  if (title.includes("收入结构")) return "利差主业和非息缓冲谁在支撑收入，目标银行是否过度依赖生息资产收入。";
  if (title.includes("核心与非核心")) return "营收增长是真正来自主业修复，还是由投资、公允价值等非核心项目阶段性补位。";
  if (title.includes("轻资本")) return "手续费资产比是否与核心营收同步改善，轻资本能力有没有真正长出来。";
  if (title.includes("总资产收益率") || title.includes("七因子")) return "相同回报率背后，哪些因素在支撑，哪些因素在侵蚀，回报是否可持续。";
  if (title.includes("息差") || title.includes("负债") || title.includes("定期")) return "负债端降本能否对冲资产端让价，净息差防守主动权在哪里。";
  if (title.includes("收益成色") || title.includes("票面") || title.includes("名义")) return "高票面贷款收益究竟是定价能力，还是对更高信用风险的补偿。";
  if (title.includes("零售") || title.includes("偏离") || title.includes("风险") || title.includes("利润质量")) return "风险是否已经充分确认，利润改善是否依赖拨备释放而非经营前端修复。";
  if (title.includes("资本") || title.includes("成本") || title.includes("市净率")) return "资本占用是否换来足够回报，市场估值折价是价值错配还是质量折价。";
  return "目标银行相对对标银行和类型均值的位置，以及该偏离背后的经营含义。";
}

function cleanChartName(text) {
  return (text || "")
    .replace(/^图表\s*\d+[-—]\d+[A-Z]?[\s｜|]+/, "")
    .replace(/^图\s*\d+[-—]\d+[A-Z]?[\s｜|]+/, "")
    .replace(/^市净率验证[\s｜|]+/, "估值与质量交叉矩阵")
    .trim();
}

function chapterNoFromContainer(container) {
  const page = container.closest(".report-page");
  const pageText = page?.dataset?.page || "";
  const match = pageText.match(/^0?(\d+)/);
  return match ? Number(match[1]) : 0;
}

function normalizeChartLabels() {
  const counters = {};
  document.querySelectorAll(".chart-card .chart-title, .figure-thumb b").forEach((el) => {
    const container = el.closest(".chart-card, .figure-thumb");
    if (!container) return;
    if (!container.dataset.originalTitle) container.dataset.originalTitle = el.textContent.trim();
    const chapter = chapterNoFromContainer(container);
    if (!chapter) return;
    counters[chapter] = (counters[chapter] || 0) + 1;
    const name = cleanChartName(container.dataset.originalTitle);
    el.textContent = `图${chapter}-${counters[chapter]}｜${name}`;
  });
}

function collectChartSlides() {
  const slides = [];
  const selected = selectedReportSections();
  document.querySelectorAll(".chart-card").forEach((card) => {
    const page = card.closest(".report-page");
    if (page?.dataset?.page && !selected.has(page.dataset.page)) return;
    if (!isChartIncluded(card)) return;
    const title = card.querySelector(".chart-title")?.textContent?.trim();
    const subtitle = card.querySelector(".chart-subtitle")?.textContent?.trim() || "";
    const chart = card.querySelector(".main-dynamic-chart");
    if (title && chart?.innerHTML.trim()) {
      slides.push({ title, subtitle, chartHtml: chart.innerHTML, storyHtml: slideStoryHtml(title, slides.length) });
    }
  });
  document.querySelectorAll(".figure-thumb").forEach((card) => {
    const page = card.closest(".report-page");
    if (page?.dataset?.page && !selected.has(page.dataset.page)) return;
    if (!isChartIncluded(card)) return;
    const title = card.querySelector("b")?.textContent?.trim();
    const subtitle = card.querySelector("span")?.textContent?.trim() || "";
    const chart = card.querySelector(".dynamic-chart");
    const explain = card.querySelector(".figure-explain");
    if (title && chart?.innerHTML.trim()) {
      slides.push({ title, subtitle, chartHtml: chart.innerHTML, storyHtml: slideStoryHtml(title, slides.length) });
    }
  });
  document.querySelectorAll(".v4-chart-card").forEach((card) => {
    if (card.closest("#formalReport")) return;
    const title = card.dataset.chartTitle || card.querySelector("h4, b")?.textContent?.trim();
    const subtitle = card.closest(".v4-deep-dive-panel")?.querySelector(".v4-deep-head h4")?.textContent?.trim() || "专题深钻图表";
    const chartHtml = card.innerHTML?.trim();
    if (title && chartHtml) {
      slides.push({ title, subtitle, chartHtml, storyHtml: slideStoryHtml(title, slides.length) });
    }
  });
  return slides;
}

function reportStorySlides() {
  const row = targetRecord();
  const story = typeof consultingStoryline === "function" ? consultingStoryline(row) : null;
  if (story) {
    return [{
      title: story.client_answer,
      text: `${story.deck_answer} 主线按${story.chapters.map((chapter) => chapter.short).join("、")}展开，每个章节均回到一个管理问题和一组可复核指标。`
    }];
  }
  return [
    {
      title: "本轮报告围绕经营质量、风险确认、资本效率和估值反馈展开",
      text: "本报告先给出客户问题和总答案，再用章节图表证明关键判断，最后落到行动建议和数据边界。"
    }
  ];
}

function reportMetricRows(row = targetRecord()) {
  if (!row) return [];
  return [
    ["VQA总分", computeVqaDiagnosis(row, peerRecords()).score],
    ["总资产收益率", fmt(row.roa)],
    ["核心营收增速", fmt(row.coreRevenueGrowth)],
    ["净息差", fmt(row.nim)],
    ["息差对冲缺口", fmtBp(row.nimGapBp)],
    ["市净率", row.pb == null ? "暂无" : `${row.pb.toFixed(2)}x`]
  ];
}

function reportCommentRows(row = targetRecord()) {
  if (!row) return [];
  const diagnosis = computeVqaDiagnosis(row, peerRecords());
  const story = typeof consultingStoryline === "function" ? consultingStoryline(row) : null;
  return [
    ["核心结论", story ? story.client_answer : `${row.bank}当前价值质量结论为“${diagnosis.signal}”，最弱维度为${diagnosis.labels[diagnosis.weakest]}。`],
    ["经营机制", story ? story.chapters[0].answer : `先看息差与核心营收，再看风险确认和资本消耗，避免只用净利润或市净率单点解释经营质量。`],
    ["章节逻辑", story ? `主线按${story.chapters.map((chapter) => chapter.short).join("、")}展开。` : `${state.reportVersion}当前纳入 ${includedChartCount()} 张图。`],
    ["下一步动作", `${topicExplainerRows(row, peerRecords(), diagnosis).slice(0, 3).map((item) => item.action).join("、")}。`]
  ];
}
