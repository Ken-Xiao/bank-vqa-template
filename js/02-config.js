/* Bank VQA module: 02-config.js */
function fallbackAnalysisRules() {
  return {
    inputs: {
      peerBanks: { recommendedMax: 8 },
      bankTypes: { allowed: ["国有大行", "股份行", "城市商业银行", "农村商业银行"] }
    },
    metrics: Object.fromEntries(Object.entries(metricLabel).map(([key, label]) => [key, { label }])),
    warningRules: {
      red: { message: "目标银行当前不宜直接形成估值修复叙事，应优先解释经营质量、风险确认和资本消耗压力。" },
      yellow: { message: "目标银行存在结构性改善空间，建议围绕收入结构、负债成本和风险确认节奏形成专项管理动作。" },
      green: { message: "目标银行具备较好的经营质量基础，可进一步围绕资本效率、轻资本收入和市场定价开展价值重估沟通。" }
    },
    export: { storyMaxChars: 180, versions: ["董事会完整汇报版", "专项分析版", "一页摘要版"] },
    narrativeBlocks: ["本图回答", "目标银行解读", "对标银行解读", "类型均值参照", "管理含义"]
  };
}

async function loadAnalysisRules() {
  try {
    const response = await fetch("analysis_rules.json", { cache: "no-store" });
    if (!response.ok) throw new Error("rules unavailable");
    analysisRules = await response.json();
  } catch (error) {
    analysisRules = fallbackAnalysisRules();
  }
  applyAnalysisRules();
  renderRulesVersionBadge();
}

function renderRulesVersionBadge() {
  const host = document.getElementById("rulesVersionBadge");
  if (!host) return;
  host.textContent = `规则版本 ${rulesVersionLabel()}｜${analysisRules?.product?.name || "银行董办对标分析工具"}`;
}

function applyAnalysisRules() {
  const rules = analysisRules || fallbackAnalysisRules();
  Object.entries(rules.metrics || {}).forEach(([key, config]) => {
    if (config?.label) metricLabel[key] = config.label;
  });
  const reportSelect = document.getElementById("reportVersion");
  if (reportSelect && rules.export?.versions?.length) {
    reportSelect.innerHTML = rules.export.versions.map((name) => `<option>${name}</option>`).join("");
    if (![...reportSelect.options].some((opt) => opt.value === state.reportVersion)) state.reportVersion = reportSelect.options[0]?.value || state.reportVersion;
    reportSelect.value = state.reportVersion;
  }
}

async function loadMetricDictionary() {
  try {
    const response = await fetch("data_governance/metric_dictionary.json", { cache: "no-store" });
    if (!response.ok) throw new Error("metric dictionary unavailable");
    const rows = await response.json();
    metricDictionary = Object.fromEntries(rows.map((item) => [item.metric_code, item]));
  } catch (error) {
    metricDictionary = {};
  }
}

async function loadFieldCoverageMatrix() {
  try {
    const response = await fetch("data_governance/field_coverage_matrix.json", { cache: "no-store" });
    if (!response.ok) throw new Error("field coverage matrix unavailable");
    const rows = await response.json();
    fieldCoverageMatrix = Array.isArray(rows) ? rows : [];
  } catch (error) {
    fieldCoverageMatrix = [];
  }
}

async function loadLanguageDiscipline() {
  try {
    const response = await fetch("config/language_discipline.json", { cache: "no-store" });
    if (!response.ok) throw new Error("language discipline unavailable");
    languageDiscipline = await response.json();
  } catch (error) {
    languageDiscipline = { narrativeReplacements: {}, uiReplacements: {}, errorReplacements: {}, riskLanguage: {} };
  }
}

function applyLanguageReplacements(text, scope = "narrative") {
  const maps = [];
  if (scope === "ui") maps.push(languageDiscipline?.uiReplacements || {});
  if (scope === "error") maps.push(languageDiscipline?.errorReplacements || {});
  maps.push(languageDiscipline?.narrativeReplacements || {});
  return maps.reduce((result, replacements) => {
    Object.entries(replacements || {}).forEach(([from, to]) => {
      if (from) result = result.split(from).join(to);
    });
    return result;
  }, String(text || ""));
}

function metricDictionaryEntry(key) {
  return metricDictionary[key] || null;
}

function metricLink(key, label) {
  const text = label || fieldName(key);
  return `<button type="button" class="metric-link" data-metric-key="${key}">${text}</button>`;
}

function bindMetricLinks(root = document) {
  root.querySelectorAll(".metric-link[data-metric-key]").forEach((button) => {
    if (button.dataset.bound) return;
    button.dataset.bound = "1";
    button.addEventListener("click", () => openMetricDetail(button.dataset.metricKey));
  });
}

function setupMetricModal() {
  const modal = document.getElementById("metricModal");
  const backdrop = document.getElementById("metricModalBackdrop");
  const closeBtn = document.getElementById("metricModalClose");
  if (!modal) return;
  const close = () => closeMetricDetail();
  backdrop?.addEventListener("click", close);
  closeBtn?.addEventListener("click", close);
  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && !modal.hidden) close();
  });
}

function closeMetricDetail() {
  const modal = document.getElementById("metricModal");
  if (!modal) return;
  modal.hidden = true;
  document.body.classList.remove("metric-modal-open");
}

function jumpToMetricTrend(key) {
  if (!key) return;
  closeMetricDetail();
  state.dataTheme = metricTheme(key);
  state.dataMetric = key;
  state.dataStep = "trend";
  const section = document.getElementById("dataCoverageSection");
  if (section) section.scrollIntoView({ behavior: "smooth", block: "start" });
  if (typeof renderDataExplorer === "function") renderDataExplorer();
}

function rulesVersionLabel() {
  return analysisRules?.product?.rulesVersion || "未标注";
}

function missingReasonForMetric(key, row) {
  const entry = metricDictionaryEntry(key);
  if (row?.[key] !== null && row?.[key] !== undefined && !Number.isNaN(row?.[key])) return "可用";
  if (entry?.is_derived) return "无法计算";
  if (entry?.missing_policy?.includes("不适用")) return "口径不适用";
  return entry?.missing_policy?.includes("原始") ? "原始数据缺失" : "原始数据缺失或口径不足";
}

function metricCoverageLines(key) {
  const selectedRows = selectedBankRecords();
  return selectedRows.map((row) => {
    const years = records
      .filter((item) => item.bank === row.bank && item[key] !== null && item[key] !== undefined && !Number.isNaN(item[key]))
      .map((item) => item.year)
      .sort((a, b) => a - b);
    const yearText = years.length ? `${years[0]}-${years[years.length - 1]}` : "暂无";
    return `${row.bank}：${yearText}（${missingReasonForMetric(key, latest(row.bank))}）`;
  });
}

function metricBusinessMeaning(key) {
  const entry = metricDictionaryEntry(key);
  const rule = analysisRules?.metrics?.[key];
  if (entry?.business_meaning) return entry.business_meaning;
  const theme = entry?.theme || rule?.theme || metricTheme(key);
  return `该指标用于「${theme}」专题联读，帮助判断${fieldName(key)}在目标银行、对标银行和类型均值之间的相对位置与变化趋势。`;
}

function metricSourceYearRange(key) {
  const banks = selectedBankRecords();
  const years = records
    .filter((row) => banks.some((bank) => bank.bank === row.bank) && row[key] !== null && row[key] !== undefined && !Number.isNaN(row[key]))
    .map((row) => row.year)
    .sort((a, b) => a - b);
  return years.length ? `${years[0]}-${years[years.length - 1]}` : "暂无可用年份";
}

function metricYearAvailabilityTable(key) {
  const years = [2020, 2021, 2022, 2023, 2024, 2025];
  const banks = [state.target, ...state.peers].filter(Boolean);
  const head = `<tr><th>年份</th>${banks.map((bank) => `<th>${bank}</th>`).join("")}</tr>`;
  const body = years.map((year) => {
    const cells = banks.map((bank) => {
      const row = records.find((item) => item.bank === bank && item.year === year);
      const value = row?.[key];
      const ok = value !== null && value !== undefined && !Number.isNaN(value);
      return `<td class="${ok ? "is-available" : "is-missing"}">${ok ? metricDisplayValue(key, value) : missingReasonForMetric(key, row)}</td>`;
    }).join("");
    return `<tr><td>${year}</td>${cells}</tr>`;
  }).join("");
  return `<table class="metric-year-table"><thead>${head}</thead><tbody>${body}</tbody></table>`;
}

function openMetricDetail(key) {
  const modal = document.getElementById("metricModal");
  const content = document.getElementById("metricModalContent");
  if (!modal || !content) return;
  const entry = metricDictionaryEntry(key);
  const selectedRate = completeness(selectedBankRecords(), key);
  const allRate = completeness(records, key);
  const targetValue = targetRecord()?.[key];
  const formula = entry?.formula || (analysisRules?.metrics?.[key]?.direction ? "由页面规则库维护，详见 analysis_rules.json" : "暂无公式说明");
  const sourceField = entry?.source_field || "暂无原始字段映射";
  const sourceGroup = entry?.source_group || metricTheme(key);
  const directionMap = {
    higherBetter: "越高越好",
    lowerBetter: "越低越好",
    contextual: "需结合专题联读"
  };
  const direction = directionMap[entry?.direction || analysisRules?.metrics?.[key]?.direction] || "需结合专题联读";
  const completenessWarning = selectedRate != null && selectedRate < 0.6
    ? `<div class="metric-detail-warning">选定样本完整性 ${(selectedRate * 100).toFixed(1)}%，低于 60%。该指标不宜作为主结论依据，相关解读应进入附录或待补数据清单。</div>`
    : "";
  content.innerHTML = `
    <div class="section-kicker">指标口径复核</div>
    <h3 id="metricModalTitle">${fieldName(key)}</h3>
    <p style="margin-top:8px;color:#667789;font-size:13px;font-weight:700;">点击指标名称即可查看来源字段、计算公式、覆盖情况和缺失原因，便于财务、战略和董办共同复核。</p>
    <div class="metric-detail-grid">
      <span>指标代码</span><b>${key}</b>
      <span>主题分类</span><b>${entry?.theme || metricTheme(key)}</b>
      <span>指标单位</span><b>${entry?.unit || "按字段口径"}</b>
      <span>来源分组</span><b>${sourceGroup}</b>
      <span>来源字段</span><b>${sourceField}</b>
      <span>来源年份</span><b>${metricSourceYearRange(key)}</b>
      <span>计算公式</span><b>${formula}</b>
      <span>是否派生</span><b>${entry?.is_derived ? "是" : entry ? "否" : "待补字典"}</b>
      <span>判断方向</span><b>${direction}</b>
      <span>规则版本</span><b>${rulesVersionLabel()}</b>
      <span>目标银行当前值</span><b>${metricDisplayValue(key, targetValue)}</b>
      <span>选定样本完整性</span><b>${selectedRate == null ? "暂无" : `${(selectedRate * 100).toFixed(1)}%`}</b>
      <span>全样本完整性</span><b>${allRate == null ? "暂无" : `${(allRate * 100).toFixed(1)}%`}</b>
      <span>缺失策略</span><b>${entry?.missing_policy || "保留空值，不用均值替代目标银行"}</b>
    </div>
    <div style="margin-top:14px;color:#061B3A;font-weight:800;">业务含义</div>
    <p class="metric-business-meaning">${metricBusinessMeaning(key)}</p>
    ${completenessWarning}
    <div style="margin-top:14px;color:#061B3A;font-weight:800;">覆盖情况</div>
    <ul class="metric-coverage-list">${metricCoverageLines(key).map((line) => `<li>${line}</li>`).join("")}</ul>
    <div style="margin-top:14px;color:#061B3A;font-weight:800;">年度可用性（2020-2025）</div>
    ${metricYearAvailabilityTable(key)}
    <div class="metric-detail-actions">
      <button type="button" class="btn secondary" id="metricTrendJumpBtn" data-metric-key="${key}">查看年度趋势</button>
    </div>
  `;
  content.querySelector("#metricTrendJumpBtn")?.addEventListener("click", () => jumpToMetricTrend(key));
  modal.hidden = false;
  document.body.classList.add("metric-modal-open");
}

function sanitizeComplianceText(text, extraForbidden = []) {
  const forbidden = [...new Set([...(analysisRules?.complianceLanguage?.forbidden || []), ...extraForbidden])];
  let result = applyLanguageReplacements(text, "narrative");
  forbidden.forEach((phrase) => {
    if (!phrase) return;
    result = result.split(phrase).join("需要进一步验证");
  });
  return result;
}

function topicPercentile(fact) {
  return Number(String(fact.分位).match(/\d+/)?.[0] || 50);
}

function topicThresholds(topic) {
  return topic.thresholds || analysisRules?.topicDefaults?.thresholds || {
    red: { weakPercentileBelow: 40, minWeakMetrics: 2, avgScoreBelow: 45 },
    yellow: { weakPercentileBelow: 60, minWeakMetrics: 1, avgScoreBelow: 60 },
    green: { strongPercentileAbove: 70, minStrongMetrics: 2 }
  };
}

function topicSignalText(level) {
  const signals = analysisRules?.topicDefaults?.signals || {};
  if (level === "green") return signals.green || "绿色：具备主动沟通基础";
  if (level === "yellow") return signals.yellow || "黄色：存在结构性修复空间";
  return signals.red || "红色：需优先解释经营质量压力";
}

/* PRD8-L01: 董事会风格问题式专题标题映射 */
function topicQuestionTitles() {
  return {
    /* 5 大专题入口标题（工作台首屏） */
    profit: "我行的盈利质量在同业里排第几？为什么？",
    spread: "净息差还能守住多久？守不住的话靠什么补？",
    risk: "风险数据是不是已经反映了真实经营压力？",
    capital: "我行的资本回报率是否值得继续追加投入？",
    valuation: "市场是否合理地定价了我行的经营质量？",

    /* 正式报告 9 大章节标题 */
    panorama: "当前价值质量分数背后，最弱的经营约束是什么？",
    macro: "同样的下行和竞争，目标银行的资产收益率是否传导更快、收入缓冲是否更薄？",
    capital: "扩表是否创造价值，还是正在消耗核心一级资本和估值叙事？",
    nim: "负债端降本是否真的跟上资产端让价，还是定期化正在削弱重定价弹性？",
    spread: "净息差还能守住多久？守不住的话靠什么补？",
    riskChapter: "风险是否已经充分确认，还是先在零售、关注和逾期偏离中提前暴露？",
    capitalChapter: "当前应该先修经营底盘、写入风险资本纪律，还是已经可以交付转型投入？",
    sequence: "转型应该如何排序？先修息差对冲、风险确认，还是先投入资本效率？",
    appendix: "本轮结论的样本边界、指标口径和数据完整性是否足够支撑董事会汇报？"
  };
}

function topicQuestionTitle(topicKey, fallback = null) {
  const titles = topicQuestionTitles();
  return titles[topicKey] || fallback || `请确认「${topicKey}」的董事会问题表述`;
}
