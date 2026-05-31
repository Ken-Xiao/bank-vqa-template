/* Bank VQA module: 31-ceam-structure-editor.js — CEAM写稿结构与正式报告编排 */

var CEAM_LABELS = {
  Challenge: "Challenge｜管理问题",
  Claim: "Claim｜本页主张",
  Evidence: "Evidence｜关键证据",
  Attribution: "Attribution｜机制归因",
  Meaning: "Meaning｜管理含义"
};

function ceamEscape(text = "") {
  if (typeof formalEscape === "function") return formalEscape(text);
  return String(text || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function ceamTopicFacts(topic, facts = []) {
  return Array.isArray(facts) && facts.length ? facts : (typeof topicFactPackRows === "function" ? topicFactPackRows(topic.id) : []);
}

function ceamNarrativeBlock(topic, facts = [], channel = "board") {
  const topicFacts = ceamTopicFacts(topic, facts);
  const row = typeof targetRecord === "function" ? targetRecord() : null;
  const target = typeof displayBankName === "function" ? displayBankName(row?.bank || state.target) : (row?.bank || state.target);
  const judgement = typeof topicJudgement === "function"
    ? topicJudgement(topic.id, topicFacts)
    : { signal: "待判断", headline: topic?.title || "专题判断待形成", evidence: topicFacts };
  const citations = typeof topicCitationFacts === "function" ? topicCitationFacts(topic, topicFacts) : topicFacts.slice(0, 3);
  const metricKey = citations[0]?.指标代码 || topicFacts[0]?.指标代码 || "roa";
  const confidence = typeof confidenceLevel === "function"
    ? confidenceLevel(metricKey, row, typeof peerRecords === "function" ? peerRecords() : [])
    : { level: "中", prefix: "现有数据倾向于显示", suffix: "建议保留口径提示。" };
  const attribution = typeof gapAttributionEngine === "function"
    ? gapAttributionEngine(metricKey, row, typeof peerRecords === "function" ? peerRecords() : [])
    : null;
  const metricNames = citations.map((fact) => fact.指标名称).filter(Boolean);
  const evidence = citations.length
    ? `${target}的${citations.slice(0, 3).map((fact) => `${fact.指标名称}${fact.目标值}，对标均值${fact.对标均值}`).join("；")}。`
    : `${target}在${topic?.title || "本专题"}下缺少可直接支撑主结论的指标，需要先进入补数和口径复核。`;
  const actionText = Array.isArray(topic?.actions) && topic.actions.length ? topic.actions.slice(0, 2).join("；") : "明确责任部门、阈值和复盘节奏";
  const meaning = channel === "action"
    ? `${actionText}，并把${metricNames.join("、") || "核心指标"}纳入未来3个月追踪。`
    : `管理层应把${metricNames.join("、") || topic?.title || "关键指标"}放到同一张经营质量图谱中判断，避免单项指标解释替代机制归因。${confidence.suffix || ""}`;
  return {
    Challenge: `${target}在${topic?.title || "本专题"}上需要回答的问题是：差异来自行业共振、样本结构，还是自身经营动作。`,
    Claim: `${confidence.prefix}，${judgement.headline}（信号：${judgement.signal}，置信度：${confidence.level}）。`,
    Evidence: evidence,
    Attribution: `${attribution?.headline || topic?.mechanism || "需结合资产端、负债端、风险确认和资本占用拆解差异来源。"} ${typeof buildMechanismExplanation === "function" ? buildMechanismExplanation(topic.id) : ""}`.trim(),
    Meaning: meaning
  };
}

function ceamNarrativeText(topic, facts = [], channel = "board") {
  const block = ceamNarrativeBlock(topic, facts, channel);
  return [block.Challenge, block.Claim, block.Evidence, block.Attribution, block.Meaning]
    .filter(Boolean)
    .join(" ");
}

function defaultReportStructureRows(root = document) {
  const scope = root?.querySelectorAll ? root : document;
  let sections = typeof formalReportSections === "function"
    ? formalReportSections(scope)
    : [...scope.querySelectorAll("#formalReport > header, #formalReport > section")];
  if (!sections.length && typeof renderFormalReport === "function" && root === document) renderFormalReport();
  sections = typeof applyFormalReportContract === "function"
    ? applyFormalReportContract(root)
    : (typeof formalReportSections === "function" ? formalReportSections(root) : [...scope.querySelectorAll("#formalReport > header, #formalReport > section")]);
  return sections.map((section, index) => ({
    id: section.id || `formal-section-${index + 1}`,
    title: section.dataset?.sectionTitle || section.querySelector?.("h1, h2")?.textContent?.trim() || `第 ${index + 1} 节`,
    role: section.dataset?.pageRole || "content",
    deckType: section.dataset?.deckType || "content",
    module: section.dataset?.moduleLabel || "",
    order: index + 1,
    included: true,
    required: ["cover", "executive"].includes(section.dataset?.pageRole || "")
  }));
}

function savedReportStructureMap() {
  return (state.reportStructure || []).reduce((acc, row) => {
    if (row?.id) acc[row.id] = row;
    return acc;
  }, {});
}

function reportStructureRows(root = document) {
  const overrides = savedReportStructureMap();
  return defaultReportStructureRows(root).map((row, index) => {
    const saved = overrides[row.id] || {};
    return {
      ...row,
      order: Number(saved.order || row.order || index + 1),
      included: row.required ? true : saved.included !== false,
      note: saved.note || ""
    };
  }).sort((a, b) => Number(a.order || 0) - Number(b.order || 0));
}

function applyReportStructureToState(rows = []) {
  state.reportStructure = rows.map((row, index) => ({
    id: row.id,
    title: row.title,
    role: row.role,
    deckType: row.deckType,
    order: Number(row.order || index + 1),
    included: row.required ? true : row.included !== false,
    note: row.note || ""
  }));
  if (!Array.isArray(state.customReportPages)) state.customReportPages = [];
  if (state.deliveryReview) state.deliveryReview.status = "draft";
  return state.reportStructure;
}

function applyReportStructureContract(root = document) {
  const rows = reportStructureRows(root);
  const map = rows.reduce((acc, row) => {
    acc[row.id] = row;
    return acc;
  }, {});
  const sections = typeof formalReportSections === "function"
    ? formalReportSections(root)
    : [...(root?.querySelectorAll ? root : document).querySelectorAll("#formalReport > header, #formalReport > section")];
  sections.forEach((section) => {
    const row = map[section.id];
    const included = row ? row.included !== false : true;
    section.dataset.structureIncluded = included ? "true" : "false";
    section.dataset.structureOrder = String(row?.order || section.dataset.slideIndex || "");
    section.hidden = !included;
  });
  return rows;
}

function updateReportStructureInclusion(id, included) {
  const rows = reportStructureRows().map((row) => row.id === id ? { ...row, included } : row);
  applyReportStructureToState(rows);
  if (typeof renderFormalReport === "function") renderFormalReport();
  if (typeof renderReportStructureEditor === "function") renderReportStructureEditor();
  if (typeof renderExportSequenceQaPanel === "function") renderExportSequenceQaPanel();
  if (typeof updateTrialCheckPanel === "function") updateTrialCheckPanel();
  if (typeof renderDeliveryReviewPanel === "function") renderDeliveryReviewPanel();
}

function reportStructureExportRows(root = document) {
  return reportStructureRows(root).map((row) => ({
    序号: row.order,
    页面ID: row.id,
    章节标题: row.title,
    页型: row.role,
    PPT页型: row.deckType,
    是否纳入: row.included ? "是" : "否",
    是否必选: row.required ? "是" : "否",
    备注: row.note || ""
  }));
}

function ceamNarrativeExportRows() {
  if (typeof topicDefinitions !== "function") return [];
  return topicDefinitions().filter((topic) => typeof isTopicIncluded === "function" ? isTopicIncluded(topic.id) : true).flatMap((topic) => {
    const facts = typeof topicFactPackRows === "function" ? topicFactPackRows(topic.id) : [];
    return ["board", "market", "action"].map((channel) => {
      const block = ceamNarrativeBlock(topic, facts, channel);
      return {
        专题ID: topic.id,
        专题: topic.title,
        渠道: channel,
        Challenge: block.Challenge,
        Claim: block.Claim,
        Evidence: block.Evidence,
        Attribution: block.Attribution,
        Meaning: block.Meaning
      };
    });
  });
}

function renderReportStructureEditor() {
  const host = document.getElementById("reportStructureEditor");
  if (!host) return;
  const rows = reportStructureRows();
  const included = rows.filter((row) => row.included).length;
  const body = rows.slice(0, 18).map((row) => `
    <tr>
      <td>${String(row.order).padStart(2, "0")}</td>
      <td><b>${ceamEscape(row.title)}</b><span>${ceamEscape(row.id)}</span></td>
      <td>${ceamEscape(row.role)}</td>
      <td>
        <label class="structure-toggle">
          <input type="checkbox" data-report-structure-toggle="${ceamEscape(row.id)}" ${row.included ? "checked" : ""} ${row.required ? "disabled" : ""} />
          <span>${row.included ? "纳入" : "移出"}</span>
        </label>
      </td>
    </tr>
  `).join("");
  host.innerHTML = `
    <div class="governance-head">
      <span>报告结构编辑器 V1</span>
      <h3>先锁定故事线，再进入正式导出</h3>
      <p>当前纳入 ${included}/${rows.length} 个章节。封面和执行摘要为必选页；其他章节可先移出，用于形成更聚焦的管理层报告。</p>
    </div>
    <div class="ceam-strip">
      ${Object.values(CEAM_LABELS).map((label) => `<span>${ceamEscape(label)}</span>`).join("")}
    </div>
    <div class="sequence-table-wrap">
      <table class="sequence-qa-table structure-table">
        <thead><tr><th>页</th><th>章节</th><th>页型</th><th>纳入</th></tr></thead>
        <tbody>${body || `<tr><td colspan="4">暂无可编辑报告结构。</td></tr>`}</tbody>
      </table>
    </div>
  `;
  host.querySelectorAll("[data-report-structure-toggle]").forEach((input) => {
    input.addEventListener("change", () => updateReportStructureInclusion(input.dataset.reportStructureToggle, input.checked));
  });
}

function initCeamStructureEditorModule() {
  const originalRenderAll = typeof renderAll === "function" ? renderAll : null;
  if (originalRenderAll && !originalRenderAll.__ceamStructureWrapped) {
    renderAll = function renderAllWithCeamStructure() {
      const result = originalRenderAll.apply(this, arguments);
      applyReportStructureContract();
      renderReportStructureEditor();
      if (typeof renderExportSequenceQaPanel === "function") renderExportSequenceQaPanel();
      return result;
    };
    renderAll.__ceamStructureWrapped = true;
  }
  applyReportStructureContract();
  renderReportStructureEditor();
  if (typeof renderExportSequenceQaPanel === "function") renderExportSequenceQaPanel();
}
