/* Bank VQA module: 03-data-format.js */
function fmt(value, digits = 2, suffix = "%") {
  if (value === null || value === undefined || Number.isNaN(value)) return "暂无";
  return `${Number(value).toFixed(digits)}${suffix}`;
}

function fmtBp(value) {
  if (value === null || value === undefined || Number.isNaN(value)) return "暂无";
  const sign = value > 0 ? "+" : "";
  return `${sign}${Number(value).toFixed(1)} 基点`;
}

function ratioText(num, den, digits = 2) {
  if (num === null || num === undefined || den === null || den === undefined || den === 0 || Number.isNaN(num) || Number.isNaN(den)) return "暂无";
  return fmt((Number(num) / Number(den)) * 100, digits);
}

function resolveBank(name) {
  return data.aliases?.[name] || name;
}

function bankMeta(name) {
  const real = resolveBank(name);
  return banks.find((item) => item.bank === real) || records.find((item) => item.bank === real) || null;
}

function displayBankName(name) {
  if (!name) return "";
  if (String(name).includes("均值")) return name;
  const real = resolveBank(name);
  const meta = bankMeta(real);
  if (real.includes("农村商业银行") || real.endsWith("银行")) return real;
  if (real.includes("农商行")) return real.replace("农商行", "农村商业银行");
  if ((meta?.type || "").includes("城市商业银行")) {
    return real.endsWith("市") ? `${real}商业银行` : `${real}银行`;
  }
  if ((meta?.type || "").includes("农村商业银行")) return `${real}农村商业银行`;
  return real;
}

function displayBankList(names, empty = "所选对标银行") {
  const list = (names || []).filter(Boolean).map(displayBankName);
  return list.length ? list.join("、") : empty;
}

function latest(bank, year = state.year) {
  const real = resolveBank(bank);
  return records.find((r) => r.bank === real && r.year === year) || null;
}

function series(bank) {
  const real = resolveBank(bank);
  return records.filter((r) => r.bank === real).sort((a, b) => a.year - b.year);
}

function currentRecords() {
  return records.filter((r) => r.year === state.year && (!state.types.length || state.types.includes(r.type)));
}

function chartRecords() {
  const keyed = new Map();
  currentRecords().forEach((r) => keyed.set(`${r.bank}-${r.year}`, r));
  const t = targetRecord();
  if (t) keyed.set(`${t.bank}-${t.year}`, t);
  peerRecords().forEach((r) => keyed.set(`${r.bank}-${r.year}`, r));
  return [...keyed.values()];
}

function targetRecord() {
  return latest(state.target);
}

function peerRecords() {
  return state.peers.map((p) => latest(p)).filter(Boolean);
}

function avg(rows, key) {
  const vals = rows.map((r) => r?.[key]).filter((v) => v !== null && v !== undefined && !Number.isNaN(v));
  if (!vals.length) return null;
  return vals.reduce((a, b) => a + b, 0) / vals.length;
}

function selectedTypeAverages(xKey, yKey, rows = currentRecords()) {
  return state.types.map((type) => {
    const group = rows.filter((r) => r.type === type);
    return {
      bank: `${type}均值`,
      type,
      region: "类型均值",
      [xKey]: avg(group, xKey),
      [yKey]: avg(group, yKey),
      isTypeAverage: true
    };
  }).filter((r) => typeof r[xKey] === "number" && typeof r[yKey] === "number");
}

function selectedTypeAverageRows(key, rows = currentRecords()) {
  return state.types.map((type) => {
    const group = rows.filter((r) => r.type === type);
    return {
      bank: `${type}均值`,
      type,
      [key]: avg(group, key),
      isTypeAverage: true
    };
  }).filter((r) => typeof r[key] === "number");
}

function metricKeysForCoverage() {
  const excluded = new Set(["bank", "type", "year", "region", "isTypeAverage"]);
  const dataKeys = records.reduce((set, row) => {
    Object.keys(row).forEach((key) => {
      if (!excluded.has(key) && typeof row[key] !== "string") set.add(key);
    });
    return set;
  }, new Set());
  Object.keys(metricLabel).forEach((key) => dataKeys.add(key));
  return [...dataKeys].filter((key) => records.some((row) => row[key] !== undefined));
}

function selectedBankRecords() {
  const names = new Set([resolveBank(state.target), ...state.peers.map(resolveBank)]);
  return records.filter((row) => names.has(row.bank));
}

function completeness(rows, key) {
  if (!rows.length) return null;
  const usable = rows.filter((row) => row[key] !== null && row[key] !== undefined && !Number.isNaN(row[key])).length;
  return usable / rows.length;
}

function metricTheme(key) {
  return analysisRules?.metrics?.[key]?.theme || "基础指标";
}

function fieldName(key) {
  if (metricLabel[key]) return metricLabel[key];
  return String(key)
    .replace(/([A-Z])/g, " $1")
    .replace(/_/g, " ")
    .replace(/\bbank\b/i, "银行")
    .replace(/\btype\b/i, "类型")
    .replace(/\bregion\b/i, "区域")
    .replace(/\byear\b/i, "年份")
    .replace(/\bassets?\b/i, "资产")
    .replace(/\bloans?\b/i, "贷款")
    .replace(/\bdeposit\b/i, "存款")
    .replace(/\bincome\b/i, "收入")
    .replace(/\bprofit\b/i, "利润")
    .replace(/\bgrowth\b/i, "增速")
    .replace(/\bratio\b/i, "比率")
    .replace(/\bshare\b/i, "占比")
    .trim() || key;
}

function updateDataCoverage() {
  const selectedRows = selectedBankRecords();
  const keys = metricKeysForCoverage();
  const coreKeys = ["roa", "coreRevenueGrowth", "nim", "feeAssetRatio", "npl", "hiddenNplExposure", "provisionCoverage", "cet1Buffer", "carBuffer", "rwaDensity", "liquidityCoverageRatio", "pb"];
  const selectedCompleteness = coreKeys.map((key) => completeness(selectedRows, key)).filter((v) => v != null);
  const coreRate = selectedCompleteness.length ? selectedCompleteness.reduce((a, b) => a + b, 0) / selectedCompleteness.length : null;
  const selectedRates = keys.map((key) => ({ key, rate: completeness(selectedRows, key), theme: metricTheme(key) }));
  const reportReady = selectedRates.filter((item) => item.rate != null && item.rate >= .8);
  const appendixReady = selectedRates.filter((item) => item.rate != null && item.rate >= .5 && item.rate < .8);
  const pending = selectedRates.filter((item) => item.rate == null || item.rate < .5);
  const corePending = coreKeys
    .map((key) => ({ key, rate: completeness(selectedRows, key) }))
    .filter((item) => item.rate == null || item.rate < .8)
    .map((item) => fieldName(item.key));
  setText("coverageSelectedRows", String(selectedRows.length), "");
  setText("coverageAllRows", String(records.length), "");
  setText("coverageCoreRate", coreRate == null ? "暂无" : `${(coreRate * 100).toFixed(1)}%`, "");
  setHtml("coverageTitle", `${displayBankName(state.target)}数据覆盖与完整性：${state.year} 年结论使用前先看底稿质量`);
  setHtml("coverageNote", `当前选定目标银行 ${displayBankName(state.target)}，对标银行 ${displayBankList(state.peers, "未选择")}，类型均值 ${state.types.join("、") || "未选择"}。完整性用于决定指标进入主报告、专题附录还是仅作提示。`);
  const coverageLevel = coreRate == null ? "待确认" : coreRate >= .9 ? "可直接支撑主报告" : coreRate >= .75 ? "可支撑主报告，但需保留边界说明" : "应先补充底稿或降低结论强度";
  setHtml("coverageQualityVerdict", `数据质量判断：${coverageLevel}。当前核心指标完整性${coreRate == null ? "暂无" : `为 ${(coreRate * 100).toFixed(1)}%`}，选定样本共 ${selectedRows.length} 条记录。`);
  setHtml("coverageAiStory", `智能解读会把完整性作为第一道约束：完整性较高的 ${reportReady.length} 个指标进入主报告，完整性中等的 ${appendixReady.length} 个指标进入附录或辅助解释，完整性不足的 ${pending.length} 个指标进入待补清单。${corePending.length ? `核心待补指标包括：${corePending.slice(0, 5).join("、")}。` : "核心指标暂无明显待补项。"}因此后续文字不会只按模板套写，而是先判断数据是否足以支撑结论，再决定语气强弱和报告位置。`);
  setHtml("coverageScopeList", [
    `主报告指标：${reportReady.slice(0, 4).map((item) => fieldName(item.key)).join("、") || "暂无"}`,
    `附录指标：${appendixReady.slice(0, 4).map((item) => fieldName(item.key)).join("、") || "暂无"}`,
    `待补指标：${pending.slice(0, 4).map((item) => fieldName(item.key)).join("、") || "暂无"}`
  ].map((line) => `<span>${line}</span>`).join(""));
  const rowsHtml = keys.map((key) => {
    const selectedRate = completeness(selectedRows, key);
    const allRate = completeness(records, key);
    const years = [...new Set(records.filter((row) => row[key] !== null && row[key] !== undefined && !Number.isNaN(row[key])).map((row) => row.year))].sort((a, b) => a - b);
    const selectedPct = selectedRate == null ? "暂无" : `${(selectedRate * 100).toFixed(1)}%`;
    const allPct = allRate == null ? "暂无" : `${(allRate * 100).toFixed(1)}%`;
    return `<tr>
      <td>${metricLink(key, fieldName(key))}</td>
      <td>${metricTheme(key)}</td>
      <td><div class="coverage-bar"><span style="width:${selectedRate == null ? 0 : selectedRate * 100}%"></span></div>${selectedPct}</td>
      <td><div class="coverage-bar"><span style="width:${allRate == null ? 0 : allRate * 100}%"></span></div>${allPct}</td>
      <td>${years.length ? `${years[0]}-${years[years.length - 1]}` : "暂无"}</td>
    </tr>`;
  }).join("");
  const body = document.querySelector("#coverageMetricTable tbody");
  if (body) {
    body.innerHTML = rowsHtml;
    bindMetricLinks(body);
  }
  renderDataExplorer(keys);
  setHtml("coverageExportStory", `<b>底稿导出说明：</b>选定数据会生成“选择摘要、目标银行、对标银行、类型均值、指标完整性、指标口径、图表事实包”等工作表；全部数据会额外包含全样本明细。建议董事会汇报使用选定版，财务与战略复核使用全量版。`);
  setHtml("coverageDataStory", `<b>董办使用建议：</b>当前核心指标完整性为 ${coreRate == null ? "暂无" : `${(coreRate * 100).toFixed(1)}%`}。完整性高的指标可进入主报告；完整性不足的指标建议进入附录或作为待补数据清单，并在汇报中明确结论边界。`);
}

function dataCategories(keys = metricKeysForCoverage()) {
  const grouped = keys.reduce((acc, key) => {
    const theme = metricTheme(key);
    if (!acc[theme]) acc[theme] = [];
    acc[theme].push(key);
    return acc;
  }, {});
  const preferred = ["盈利质量", "息差负债", "风险拨备", "资本估值", "流动性", "投资结构", "零售结构", "基础指标"];
  return preferred.filter((theme) => grouped[theme]?.length).concat(Object.keys(grouped).filter((theme) => !preferred.includes(theme))).map((theme) => ({ theme, keys: grouped[theme] }));
}

function renderDataExplorer(keys = metricKeysForCoverage()) {
  const categories = dataCategories(keys);
  if (!categories.some((item) => item.theme === state.dataTheme)) state.dataTheme = categories[0]?.theme || "基础指标";
  const current = categories.find((item) => item.theme === state.dataTheme) || categories[0];
  if (!current) return;
  if (!current.keys.includes(state.dataMetric)) state.dataMetric = current.keys[0];
  const browser = document.getElementById("dataBrowser");
  const browserTitle = document.getElementById("dataBrowserTitle");
  const browserSubtitle = document.getElementById("dataBrowserSubtitle");
  if (browser) browser.dataset.step = state.dataStep || "type";
  if (browserTitle) {
    browserTitle.textContent = state.dataStep === "trend" ? "字段时间变化" : state.dataStep === "field" ? `${state.dataTheme}字段列表` : "选择数据类型";
  }
  if (browserSubtitle) {
    browserSubtitle.textContent = state.dataStep === "trend"
      ? `当前字段：${fieldName(state.dataMetric)}`
      : state.dataStep === "field"
        ? "点击一个字段，查看目标银行、对标银行和类型均值的年度变化。"
        : "先选择一个数据类型，再进入字段列表。";
  }
  const backButton = document.getElementById("dataBackButton");
  if (backButton && !backButton.dataset.bound) {
    backButton.dataset.bound = "1";
    backButton.addEventListener("click", () => {
      state.dataStep = state.dataStep === "trend" ? "field" : "type";
      renderDataExplorer(keys);
    });
  }
  const typeList = document.getElementById("dataTypeList");
  const fieldList = document.getElementById("dataFieldList");
  if (typeList) {
    typeList.innerHTML = categories.map((item) => `<button class="data-type-btn ${item.theme === state.dataTheme ? "is-active" : ""}" data-theme="${item.theme}">${item.theme}<span>${item.keys.length} 个字段</span></button>`).join("");
    typeList.querySelectorAll("button").forEach((button) => button.addEventListener("click", () => {
      state.dataTheme = button.dataset.theme;
      state.dataMetric = "";
      state.dataStep = "field";
      renderDataExplorer(keys);
    }));
  }
  if (fieldList) {
    fieldList.innerHTML = current.keys.map((key) => {
      const selectedRate = completeness(selectedBankRecords(), key);
      return `<button class="data-field-btn ${key === state.dataMetric ? "is-active" : ""}" data-key="${key}">${fieldName(key)}<span>完整性 ${selectedRate == null ? "暂无" : `${(selectedRate * 100).toFixed(1)}%`} · 点击查看口径</span></button>`;
    }).join("");
    fieldList.querySelectorAll("button").forEach((button) => button.addEventListener("click", () => {
      state.dataMetric = button.dataset.key;
      state.dataStep = "trend";
      renderDataExplorer(keys);
    }));
    fieldList.querySelectorAll("button").forEach((button) => {
      button.addEventListener("dblclick", () => openMetricDetail(button.dataset.key));
    });
  }
  renderDataTrend(state.dataMetric);
}

function renderDataTrend(key) {
  const title = document.getElementById("dataTrendTitle");
  const note = document.getElementById("dataTrendNote");
  const chart = document.getElementById("dataTrendChart");
  if (!key || !chart) return;
  const selectedRate = completeness(selectedBankRecords(), key);
  const allRate = completeness(records, key);
  setText("dataTrendTitle", `${fieldName(key)}｜年度变化`);
  setText("dataTrendNote", `当前展示目标银行、对标银行和类型均值的 2020-2025 年变化；选定样本完整性 ${selectedRate == null ? "暂无" : `${(selectedRate * 100).toFixed(1)}%`}，全样本完整性 ${allRate == null ? "暂无" : `${(allRate * 100).toFixed(1)}%`}。`);
  chart.innerHTML = focusTrendChart(key, `${fieldName(key)}年度变化`);
}

function focusRows(keys = []) {
  const rows = [];
  const seen = new Set();
  const add = (row) => {
    if (!row || seen.has(row.bank)) return;
    seen.add(row.bank);
    rows.push(row);
  };
  add(targetRecord());
  peerRecords().forEach(add);
  state.types.forEach((type) => {
    const group = currentRecords().filter((r) => r.type === type);
    const row = { bank: `${type}均值`, type, isTypeAverage: true };
    keys.forEach((key) => row[key] = avg(group, key));
    add(row);
  });
  return rows;
}

function rankPercentile(value, rows, key, higherBetter = true) {
  const vals = rows.map((r) => r[key]).filter((v) => v !== null && v !== undefined && !Number.isNaN(v));
  if (!vals.length || value === null || value === undefined) return "暂无分位";
  const better = vals.filter((v) => higherBetter ? v <= value : v >= value).length;
  return `约 ${Math.round(better / vals.length * 100)} 分位`;
}

function peerTemplateBanks(template = state.peerTemplate) {
  const target = targetRecord() || latest(state.target);
  const maxPeers = analysisRules?.inputs?.peerBanks?.recommendedMax || 8;
  if (!target) return state.peers;
  const candidates = currentRecords()
    .filter((row) => row.bank !== target.bank)
    .map((row) => {
      let score = 0;
      if (template === "sameType") score = row.type === target.type ? 0 : 100;
      else if (template === "sameRegion") score = row.region === target.region ? 0 : 100;
      else if (template === "sameScale") score = Math.abs(Math.log((row.assets || 1) / (target.assets || 1)));
      else if (template === "valuation") score = Math.abs((row.pb || 0) - (target.pb || 0)) + Math.abs((row.roa || 0) - (target.roa || 0)) / 2;
      else score = state.peers.includes(row.bank) ? 0 : 100;
      return { bank: row.bank, score };
    })
    .sort((a, b) => a.score - b.score || a.bank.localeCompare(b.bank, "zh-CN"));
  return candidates.slice(0, maxPeers).map((item) => item.bank);
}

function defaultPeerTemplateForTarget() {
  const target = targetRecord() || latest(state.target);
  if (!target) return "manual";
  if ((target.type || "").includes("国有") || (target.type || "").includes("股份")) return "sameType";
  if ((target.type || "").includes("城市商业")) return "sameRegion";
  if ((target.type || "").includes("农村商业")) return "sameRegion";
  return "sameType";
}

function refreshDefaultPeersForTarget() {
  const template = defaultPeerTemplateForTarget();
  state.peerTemplate = template;
  state.peers = peerTemplateBanks(template);
}

function applyPeerTemplate(template) {
  state.peerTemplate = template;
  if (template !== "manual") state.peers = peerTemplateBanks(template);
  renderChoicePanels();
  syncHiddenSelects();
  updateSelectionSummary();
  if (state.confirmed) renderAll();
}

function applyReportVersion(version = state.reportVersion) {
  state.reportVersion = version;
  const map = {
    "董事会完整汇报版": ["01 / 06", "02 / 06", "03 / 06", "04 / 06", "05 / 06", "06 / 06"],
    "资本市场沟通版": ["01 / 06", "02 / 06", "03 / 06", "05 / 06", "06 / 06"],
    "管理层行动版": ["01 / 06", "03 / 06", "04 / 06", "06 / 06"],
    "专项分析版": ["01 / 06", "02 / 06", "03 / 06", "04 / 06", "05 / 06", "06 / 06"],
    "一页摘要版": ["01 / 06", "06 / 06"]
  };
  const selected = new Set(map[version] || map["董事会完整汇报版"]);
  document.querySelectorAll(".report-section-check").forEach((input) => {
    input.checked = selected.has(input.value);
  });
  if (typeof applyReportVersionProfile === "function") applyReportVersionProfile(version);
  updateSelectionSummary();
  updateReportSectionVisibility();
  buildSideNav();
  buildPrintDeck();
  if (state.confirmed) {
    setProjectStatus(`已切换为${version}，默认纳入专题与报告章节已按版本配置更新。`);
  }
}

function updateChoiceStyles() {
  document.querySelectorAll(".choice-item").forEach((item) => {
    const input = item.querySelector("input");
    item.classList.toggle("is-selected", !!input?.checked);
  });
}

function syncHiddenSelects() {
  const target = document.getElementById("targetBank");
  const peers = document.getElementById("peerBanks");
  const types = document.getElementById("bankTypes");
  const reportVersion = document.getElementById("reportVersion");
  const peerTemplate = document.getElementById("peerTemplate");
  if (target) target.value = state.target;
  if (peers) [...peers.options].forEach((opt) => opt.selected = state.peers.includes(opt.value));
  if (types) [...types.options].forEach((opt) => opt.selected = state.types.includes(opt.value));
  if (reportVersion) reportVersion.value = state.reportVersion;
  if (peerTemplate) peerTemplate.value = state.peerTemplate;
}

function updateSelectionSummary() {
  const el = document.getElementById("selectionSummary");
  if (!el) return;
  const tagHtml = (items, empty = "未选择") => items.length
    ? items.map((item) => `<span class="selected-tag">${displayBankName(item)}</span>`).join("")
    : `<span class="selected-tag">${empty}</span>`;
  const nonBankTagHtml = (items, empty = "未选择") => items.length
    ? items.map((item) => `<span class="selected-tag">${item}</span>`).join("")
    : `<span class="selected-tag">${empty}</span>`;
  el.innerHTML = `
    <div class="selected-box target"><b>已选目标银行</b><div class="selected-tags">${tagHtml([state.target])}</div></div>
    <div class="selected-box"><b>已选对标银行</b><div class="selected-tags">${tagHtml(state.peers)}</div></div>
    <div class="selected-box"><b>已选分类型银行数据</b><div class="selected-tags">${nonBankTagHtml(state.types)}</div></div>
    <div class="selected-box"><b>年份 / 报告版本</b><div class="selected-tags">${nonBankTagHtml([`${state.year} 年`, state.reportVersion])}</div></div>
    <div class="selected-box"><b>规则版本 / 语气</b><div class="selected-tags">${nonBankTagHtml([typeof rulesVersionLabel === "function" ? rulesVersionLabel() : "未标注", typeof reportVersionToneLabel === "function" ? reportVersionToneLabel() : "董事会汇报语气"])}</div></div>
  `;
  renderRulesVersionBadge();
}

function updateProjectFlow() {
  const title = document.getElementById("projectSummaryTitle");
  const text = document.getElementById("projectSummaryText");
  const steps = document.getElementById("reportFlowSteps");
  if (!title || !text || !steps) return;
  const target = targetRecord();
  const diagnosis = target ? computeVqaDiagnosis(target, peerRecords()) : null;
  const topic = topicDefinitions().find((item) => item.id === state.activeTopic) || topicDefinitions()[0];
  title.textContent = `${displayBankName(state.target)}_${state.year} 董办对标分析项目`;
  text.textContent = `当前口径为目标银行 ${displayBankName(state.target)}，对标银行 ${displayBankList(state.peers, "暂未选择")}，类型均值 ${state.types.join("、") || "暂未选择"}。报告版本为${state.reportVersion}，规则版本 ${typeof rulesVersionLabel === "function" ? rulesVersionLabel() : "未标注"}，当前专题为${topic.title}，已纳入 ${includedChartCount()} 张图${diagnosis ? `，VQA诊断为${diagnosis.score}分/${diagnosis.signal}` : ""}。`;
  const flow = [
    ["1", "选择口径", true],
    ["2", "生成诊断", state.confirmed],
    ["3", `选择专题与图表`, state.confirmed && includedChartCount() > 0],
    ["4", "导出报告与底稿", state.confirmed]
  ];
  steps.innerHTML = flow.map(([no, label, done]) => `<div class="flow-step${done ? " is-done" : ""}"><b>${no}</b>${label}</div>`).join("");
  const aiMode = document.getElementById("aiProductMode");
  const aiEvidence = document.getElementById("aiProductEvidence");
  const aiGuardrail = document.getElementById("aiProductGuardrail");
  const aiOutput = document.getElementById("aiProductOutput");
  if (aiMode && aiEvidence && aiGuardrail && aiOutput) {
    const modeText = aiProviderConfig?.provider === "http" && aiProviderConfig?.http?.endpoint ? "外部AI接口增强" : "本地事实包生成";
    const topicFacts = typeof topicFactPackRows === "function" ? topicFactPackRows(topic.id) : [];
    const judgement = typeof topicJudgement === "function" ? topicJudgement(topic.id, topicFacts) : null;
    const evidenceFacts = judgement?.evidence || topicFacts.slice(0, 3);
    aiMode.textContent = `当前采用${modeText}。系统先读取 ${displayBankName(state.target)}、${displayBankList(state.peers, "对标组")} 和 ${state.types.join("、") || "类型均值"} 的事实包，再按${state.reportVersion}生成解读。`;
    aiEvidence.textContent = diagnosis
      ? `当前 VQA 诊断为 ${diagnosis.score} 分 / ${diagnosis.signal}；当前专题为${topic.title}${judgement ? `，专题判断为${judgement.signal}` : ""}。`
      : "等待生成 VQA 诊断与专题事实包。";
    aiGuardrail.textContent = evidenceFacts.length
      ? `本轮解读引用 ${evidenceFacts.slice(0, 4).map((fact) => `${fact.指标名称}${fact.目标值}`).join("、")}，并同步校验对标均值、类型均值、一年变化和五年变化。`
      : "当前专题可引用指标不足，系统会降低结论强度，并提示进入附录或待补数据清单。";
    aiOutput.textContent = `报告导出时同步写入规则版本、AI模式、引用指标和数据底稿；人工修改后的解读会进入项目保存和导出版本。`;
  }
}

function metricDisplayValue(key, value) {
  if (value === null || value === undefined || Number.isNaN(value)) return "暂无";
  if (["pb", "pbMid"].includes(key)) return `${Number(value).toFixed(2)}x`;
  if (key.includes("Buffer") || key === "nimGapBp") return fmtBp(value);
  return fmt(value);
}

function yoyValue(bank, key) {
  const curr = records.find((r) => r.bank === bank && r.year === state.year)?.[key];
  const prev = records.find((r) => r.bank === bank && r.year === state.year - 1)?.[key];
  return typeof curr === "number" && typeof prev === "number" ? curr - prev : null;
}

function fiveYearValue(bank, key) {
  const curr = records.find((r) => r.bank === bank && r.year === state.year)?.[key];
  const prev = records.find((r) => r.bank === bank && r.year === Math.max(2020, state.year - 5))?.[key];
  return typeof curr === "number" && typeof prev === "number" ? curr - prev : null;
}
