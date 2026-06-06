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

function fmtMoney(value) {
  if (value === null || value === undefined || Number.isNaN(value)) return "暂无";
  const sign = Number(value) < 0 ? "-" : "";
  const abs = Math.abs(Number(value));
  if (abs >= 10000) return `${sign}${(abs / 10000).toFixed(1)}亿元`;
  return `${sign}${abs.toFixed(0)}万元`;
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

function htmlSafe(text = "") {
  return String(text ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
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

function metricExplorerTypeRows() {
  return currentRecords().filter((row) => !state.types.length || state.types.includes(row.type));
}

function metricHighCalibrationRisk(key) {
  const highRisk = new Set([
    "nim",
    "nimGapBp",
    "nimGapPoint",
    "nonInterestShare",
    "feeAssetRatio",
    "creditCostRatio",
    "overdueNplDeviation",
    "hiddenNplExposure",
    "personalLoanNpl",
    "retailRiskMax",
    "rwaDensity",
    "cet1Buffer",
    "pb",
    "theoreticalPb",
    "pbDiscount"
  ]);
  return highRisk.has(key) || !!metricDictionaryEntry(key)?.is_critical || !!analysisRules?.metrics?.[key]?.calibrationHighRisk;
}

function metricCalibrationRisk(key, rows = selectedBankRecords()) {
  const hasMetric = records.some((row) => row[key] !== undefined) || !!metricDictionaryEntry(key) || !!analysisRules?.metrics?.[key];
  const selectedRate = hasMetric ? completeness(rows, key) : null;
  const allRate = hasMetric ? completeness(records, key) : null;
  const highRisk = metricHighCalibrationRisk(key);
  let level = "L1";
  if (!hasMetric || selectedRate == null || selectedRate < 0.5) level = "L4";
  else if (selectedRate < 0.75) level = "L3";
  else if (selectedRate < 0.9 || highRisk) level = "L2";
  const meta = {
    L1: {
      label: "L1 可直接对比",
      tone: "green",
      decisionUse: "主报告",
      note: "当前样本覆盖较好，且口径风险未触发高风险标签，可作为主报告证据。"
    },
    L2: {
      label: "L2 可比，需脚注",
      tone: "yellow",
      decisionUse: "主报告+脚注",
      note: "指标可以进入主报告，但需要同步披露口径边界、样本覆盖或业务含义限制。"
    },
    L3: {
      label: "L3 仅供参考",
      tone: "orange",
      decisionUse: "附录",
      note: "选定样本覆盖不足以支撑强结论，建议放入附录或作为辅助证据。"
    },
    L4: {
      label: "L4 数据不足",
      tone: "red",
      decisionUse: "待补",
      note: "当前指标缺少足够可用数据或字典映射，暂不进入正式报告结论。"
    }
  }[level];
  return {
    key,
    level,
    ...meta,
    selectedRate,
    allRate,
    highRisk,
    coverageText: selectedRate == null ? "覆盖暂无" : `选定样本覆盖 ${(selectedRate * 100).toFixed(0)}%`,
    allCoverageText: allRate == null ? "全样本覆盖暂无" : `全样本覆盖 ${(allRate * 100).toFixed(0)}%`
  };
}

function metricExplorerTrend(key) {
  const years = [...new Set(records.map((row) => row.year))].sort((a, b) => a - b);
  return years.map((year) => {
    const target = latest(state.target, year);
    const peers = state.peers.map((bank) => latest(bank, year)).filter(Boolean);
    const typeRows = records.filter((row) => row.year === year && (!state.types.length || state.types.includes(row.type)));
    return {
      year,
      target: target?.[key],
      peer: avg(peers, key),
      type: avg(typeRows, key)
    };
  }).filter((item) => item.target != null || item.peer != null || item.type != null);
}

function metricExplorerDeltaText(key, targetValue, peerValue) {
  if (targetValue == null || peerValue == null || Number.isNaN(targetValue) || Number.isNaN(peerValue)) return "差距暂无";
  const diff = targetValue - peerValue;
  const better = (analysisRules?.metrics?.[key]?.direction || metricDictionaryEntry(key)?.direction) === "lowerBetter" ? diff <= 0 : diff >= 0;
  return `${better ? "优于或不弱于对标" : "弱于对标"} ${metricDisplayValue(key, Math.abs(diff))}`;
}

function metricExplorerSnapshot(key = state.dataMetric) {
  const row = targetRecord();
  const peers = peerRecords();
  const typeRows = metricExplorerTypeRows();
  const targetValue = row?.[key];
  const peerValue = avg(peers, key);
  const typeValue = avg(typeRows, key);
  const trend = metricExplorerTrend(key);
  const risk = metricCalibrationRisk(key);
  return {
    metricKey: key,
    label: fieldName(key),
    theme: metricTheme(key),
    unit: metricDictionaryEntry(key)?.unit || analysisRules?.metrics?.[key]?.unit || "按指标口径",
    target: { value: targetValue, valueText: metricDisplayValue(key, targetValue) },
    peer: { value: peerValue, valueText: metricDisplayValue(key, peerValue) },
    type: { value: typeValue, valueText: metricDisplayValue(key, typeValue) },
    percentileText: rankPercentile(targetValue, currentRecords(), key, (analysisRules?.metrics?.[key]?.direction || metricDictionaryEntry(key)?.direction) !== "lowerBetter"),
    gapText: metricExplorerDeltaText(key, targetValue, peerValue),
    trend,
    risk,
    decisionUse: risk.decisionUse,
    meaning: metricBusinessMeaning(key),
    sourceField: metricDictionaryEntry(key)?.source_field || "暂无原始字段映射",
    formula: metricDictionaryEntry(key)?.formula || analysisRules?.metrics?.[key]?.formula || "由页面规则库维护，详见 analysis_rules.json"
  };
}

function metricExplorerTrendTable(snapshot) {
  const rows = snapshot.trend.slice(-6);
  return `<table class="metric-explorer-trend-table">
    <thead><tr><th>年份</th><th>目标银行</th><th>对标组</th><th>类型均值</th></tr></thead>
    <tbody>${rows.map((item) => `<tr>
      <td>${item.year}</td>
      <td>${metricDisplayValue(snapshot.metricKey, item.target)}</td>
      <td>${metricDisplayValue(snapshot.metricKey, item.peer)}</td>
      <td>${metricDisplayValue(snapshot.metricKey, item.type)}</td>
    </tr>`).join("") || `<tr><td colspan="4">暂无年度趋势。</td></tr>`}</tbody>
  </table>`;
}

function metricExplorerHtml(snapshot) {
  return `
    <div class="metric-explorer-hero tone-${snapshot.risk.tone}">
      <div>
        <span>${htmlSafe(snapshot.theme)}｜${htmlSafe(snapshot.unit)}</span>
        <h3>${htmlSafe(displayBankName(state.target))}${htmlSafe(snapshot.label)}：${htmlSafe(snapshot.target.valueText)}</h3>
        <p>${htmlSafe(snapshot.gapText)}；全样本位置${htmlSafe(snapshot.percentileText)}。报告使用建议：${htmlSafe(snapshot.decisionUse)}。</p>
      </div>
      <div class="metric-risk-badge">
        <b>${htmlSafe(snapshot.risk.level)}</b>
        <span>${htmlSafe(snapshot.risk.label)}</span>
        <em>${htmlSafe(snapshot.risk.coverageText)}</em>
      </div>
    </div>
    <div class="metric-explorer-kpis">
      <div><span>目标银行</span><b>${htmlSafe(snapshot.target.valueText)}</b><em>${htmlSafe(displayBankName(state.target))}</em></div>
      <div><span>对标均值</span><b>${htmlSafe(snapshot.peer.valueText)}</b><em>${htmlSafe(displayBankList(state.peers, "对标组"))}</em></div>
      <div><span>类型均值</span><b>${htmlSafe(snapshot.type.valueText)}</b><em>${htmlSafe(state.types.join("、") || "全部类型")}</em></div>
      <div><span>分位与用途</span><b>${htmlSafe(snapshot.percentileText)}</b><em>${htmlSafe(snapshot.decisionUse)}</em></div>
    </div>
    <div class="metric-explorer-grid">
      <div class="metric-explorer-card">
        <span>年度趋势</span>
        ${metricExplorerTrendTable(snapshot)}
      </div>
      <div class="metric-explorer-card">
        <span>口径说明</span>
        <p>${htmlSafe(snapshot.risk.note)}</p>
        <dl>
          <dt>来源字段</dt><dd>${htmlSafe(snapshot.sourceField)}</dd>
          <dt>计算公式</dt><dd>${htmlSafe(snapshot.formula)}</dd>
          <dt>业务含义</dt><dd>${htmlSafe(snapshot.meaning)}</dd>
        </dl>
      </div>
    </div>`;
}

function fieldCoverageHeatmapRows(keys = metricKeysForCoverage()) {
  const fieldRows = fieldCoverageMatrixRows();
  if (fieldRows.length) return fieldRows;
  return dataCategories(keys).map((category) => {
    const rates = category.keys.map((key) => completeness(selectedBankRecords(), key)).filter((rate) => rate != null);
    const rate = rates.length ? rates.reduce((sum, item) => sum + item, 0) / rates.length : null;
    const level = rate == null || rate < 0.5 ? "L4" : rate < 0.75 ? "L3" : rate < 0.9 ? "L2" : "L1";
    const tone = level === "L1" ? "green" : level === "L2" ? "yellow" : level === "L3" ? "orange" : "red";
    return {
      theme: category.theme,
      count: category.keys.length,
      rate,
      rateText: rate == null ? "暂无" : `${(rate * 100).toFixed(0)}%`,
      level,
      tone
    };
  });
}

function fieldCoverageStatusMeta(status = "") {
  const text = String(status || "");
  if (text.includes("已接入")) return { connected: true, level: "L1", tone: "green" };
  if (text.includes("派生")) return { connected: true, level: "L2", tone: "yellow" };
  return { connected: false, level: "L4", tone: "red" };
}

function fieldCoveragePriorityRank(priority = "") {
  const text = String(priority || "");
  if (text.includes("高")) return 3;
  if (text.includes("中")) return 2;
  if (text.includes("低")) return 1;
  return 0;
}

function fieldCoverageMatrixRows(matrix = fieldCoverageMatrix) {
  if (!Array.isArray(matrix) || !matrix.length) return [];
  const groups = matrix.reduce((acc, item) => {
    const theme = item.source_group || "未分组字段";
    if (!acc[theme]) acc[theme] = [];
    acc[theme].push(item);
    return acc;
  }, {});
  return Object.entries(groups).map(([theme, items]) => {
    const connected = items.filter((item) => fieldCoverageStatusMeta(item.status).connected).length;
    const pendingItems = items.filter((item) => !fieldCoverageStatusMeta(item.status).connected);
    const pending = pendingItems.length;
    const rate = items.length ? connected / items.length : null;
    const maxPriority = Math.max(...items.map((item) => fieldCoveragePriorityRank(item.priority)), 0);
    const level = rate == null ? "L4" : rate >= 0.9 ? "L1" : rate >= 0.6 ? "L2" : rate >= 0.3 ? "L3" : "L4";
    const tone = level === "L1" ? "green" : level === "L2" ? "yellow" : level === "L3" ? "orange" : "red";
    const recommendation = pendingItems
      .sort((a, b) => fieldCoveragePriorityRank(b.priority) - fieldCoveragePriorityRank(a.priority))
      .map((item) => item.recommendation || item.source_field)
      .find(Boolean) || items[0]?.recommendation || "当前字段组已满足主流程，后续按专题扩展。";
    return {
      theme,
      count: items.length,
      connected,
      pending,
      rate,
      rateText: rate == null ? "暂无" : `${(rate * 100).toFixed(0)}%`,
      level,
      tone,
      maxPriority,
      recommendation,
      pendingFields: pendingItems.slice(0, 3).map((item) => item.source_field).filter(Boolean)
    };
  }).sort((a, b) => {
    if (b.maxPriority !== a.maxPriority) return b.maxPriority - a.maxPriority;
    return a.rate - b.rate || b.pending - a.pending || a.theme.localeCompare(b.theme, "zh-CN");
  });
}

function sprintBaselineRows() {
  const hasRecords = Array.isArray(records) && records.length > 0;
  const hasRules = !!analysisRules?.vqaEngine || !!analysisRules?.formalReport;
  const hasDictionary = metricDictionary && Object.keys(metricDictionary).length > 0;
  const hasFieldMatrix = Array.isArray(fieldCoverageMatrix) && fieldCoverageMatrix.length >= 200;
  return [
    { key: "resources", label: "静态资源与脚本顺序", status: hasRecords ? "pass" : "warn", note: hasRecords ? "底表已加载，核心脚本可读取 records。" : "底表未加载，需检查 data.js。" },
    { key: "rules", label: "规则版本与报告契约", status: hasRules ? "pass" : "warn", note: hasRules ? "analysis_rules 已加载，可驱动 VQA 和正式报告。" : "规则文件未完整加载。" },
    { key: "dictionary", label: "指标字典", status: hasDictionary ? "pass" : "warn", note: hasDictionary ? `已加载 ${Object.keys(metricDictionary).length} 个指标口径。` : "指标字典未加载。" },
    { key: "fieldMatrix", label: "字段矩阵", status: hasFieldMatrix ? "pass" : "warn", note: hasFieldMatrix ? `已加载 ${fieldCoverageMatrix.length} 个原始字段。` : "字段矩阵不足，需检查 data_governance。" },
    { key: "tests", label: "自动化回归", status: "manual", note: "运行 tests/sprint*.test.js、syntax-ok、ids-ok、resources-ok 和 git diff --check。" }
  ];
}

function renderSprintBaselinePanel() {
  const host = document.getElementById("sprintBaselineGrid");
  if (!host) return;
  host.innerHTML = sprintBaselineRows().map((row) => `
    <div class="sprint-baseline-card tone-${htmlSafe(row.status)}">
      <span>${htmlSafe(row.status === "pass" ? "通过" : row.status === "manual" ? "需人工运行" : "需复核")}</span>
      <b>${htmlSafe(row.label)}</b>
      <p>${htmlSafe(row.note)}</p>
    </div>`).join("");
}

function fieldCoverageMatrixDetailRows(filter = "all", matrix = fieldCoverageMatrix) {
  if (!Array.isArray(matrix)) return [];
  return matrix.map((item, index) => {
    const meta = fieldCoverageStatusMeta(item.status);
    const priority = String(item.priority || "");
    return {
      序号: index + 1,
      字段组: item.source_group || "未分组字段",
      字段: item.source_field || "",
      接入状态: meta.connected ? "connected" : "pending",
      原始状态: item.status || "",
      优先级: priority || "-",
      处理建议: item.recommendation || "",
      覆盖等级: meta.level
    };
  }).filter((row) => {
    if (filter === "connected") return row.接入状态 === "connected";
    if (filter === "pending") return row.接入状态 === "pending";
    if (filter === "medium") return row.接入状态 === "pending" && row.优先级.includes("中");
    if (filter === "paused") return row.优先级.includes("暂缓");
    return true;
  });
}

function renderFieldCoverageMatrixDetail(filter = "all") {
  const body = document.getElementById("fieldCoverageMatrixBody");
  const select = document.getElementById("fieldCoverageMatrixFilter");
  if (!body) return;
  const currentFilter = select?.value || filter;
  const rows = fieldCoverageMatrixDetailRows(currentFilter);
  body.innerHTML = rows.slice(0, 80).map((row) => `
    <tr class="tone-${htmlSafe(row.覆盖等级)}">
      <td>${htmlSafe(row.字段组)}</td>
      <td>${htmlSafe(row.字段)}</td>
      <td>${htmlSafe(row.接入状态)}</td>
      <td>${htmlSafe(row.优先级)}</td>
      <td>${htmlSafe(row.处理建议)}</td>
    </tr>`).join("") || `<tr><td colspan="5">当前筛选条件下暂无字段。</td></tr>`;
  if (select && !select.dataset.bound) {
    select.dataset.bound = "1";
    select.addEventListener("change", () => renderFieldCoverageMatrixDetail(select.value));
  }
}

function renderFieldCoverageHeatmap(keys = metricKeysForCoverage()) {
  const host = document.getElementById("fieldCoverageHeatmap");
  if (!host) return;
  const rows = fieldCoverageHeatmapRows(keys);
  host.innerHTML = `
    <div class="field-coverage-head">
      <span>字段可用性热力图</span>
      <b>${fieldCoverageMatrixRows().length ? "按原始字段组判断哪些专项已接入，哪些仍需数据扩展。" : "按主题判断哪些指标可进入主报告，哪些需要附录或待补。"}</b>
    </div>
    <div class="field-coverage-grid">${rows.map((row) => `
      <div class="field-coverage-cell tone-${row.tone}">
        <span>${htmlSafe(row.level)}</span>
        <b>${htmlSafe(row.theme)}</b>
        <em>${htmlSafe(row.rateText)}｜${row.connected ?? 0}/${row.count} 已接入</em>
        ${row.pendingFields?.length ? `<p>${htmlSafe(row.pendingFields.join("、"))}</p>` : ""}
      </div>`).join("")}</div>`;
}

function renderMetricExplorer(keys = metricKeysForCoverage()) {
  const select = document.getElementById("metricExplorerSelect");
  const content = document.getElementById("metricExplorerContent");
  if (!select || !content) return;
  const usableKeys = keys.filter((key) => records.some((row) => row[key] !== undefined));
  if (!usableKeys.includes(state.dataMetric)) state.dataMetric = usableKeys.includes("roa") ? "roa" : usableKeys[0];
  const categories = dataCategories(usableKeys);
  select.innerHTML = categories.map((category) => `
    <optgroup label="${htmlSafe(category.theme)}">
      ${category.keys.map((key) => `<option value="${htmlSafe(key)}" ${key === state.dataMetric ? "selected" : ""}>${htmlSafe(fieldName(key))}</option>`).join("")}
    </optgroup>`).join("");
  if (!select.dataset.bound) {
    select.dataset.bound = "1";
    select.addEventListener("change", () => {
      state.dataMetric = select.value;
      state.dataTheme = metricTheme(select.value);
      state.dataStep = "trend";
      renderMetricExplorer(keys);
      renderDataExplorer(keys);
    });
  }
  content.innerHTML = state.confirmed ? metricExplorerHtml(metricExplorerSnapshot(state.dataMetric)) : metricExplorerHtml(metricExplorerSnapshot(state.dataMetric));
}

function readyQualityStatusMeta(status = "") {
  const map = {
    available: { label: "已可用", tone: "green", reason: "Ready 层已有可用值" },
    source_missing: { label: "三源均缺", tone: "red", reason: "主数据、接口数据和年报抓取均未形成可用值" },
    scraped_available_not_fieldized: { label: "年报待字段化", tone: "orange", reason: "年报明细已有相关行，但尚未稳定映射到前台字段" },
    peer_insufficient: { label: "对标不足", tone: "yellow", reason: "目标银行有值，但对标组不足以计算均值或分位" },
    calculation_input_missing: { label: "计算输入不足", tone: "yellow", reason: "派生指标缺少必要输入字段" },
    source_conflict_review: { label: "口径待复核", tone: "orange", reason: "多源数值差异超过阈值，需要人工复核" }
  };
  return map[status] || { label: status || "未加载", tone: "gray", reason: "Ready 数据层未返回状态" };
}

function readyQualityFor(bank, year, metric) {
  if (!Array.isArray(readyMetricQuality) || !readyMetricQuality.length) return null;
  return readyMetricQuality.find((item) => item.bank === bank && Number(item.year) === Number(year) && item.metric === metric) || null;
}

function readySelectedBanks() {
  return [state.target, ...(state.peers || [])].filter(Boolean);
}

function readyBridgeMetrics() {
  return [
    "peTtm",
    "divYield",
    "totalMarketValue",
    "realLoanDepositSpread",
    "loanDepositRatio",
    "housingLoanNpl",
    "consumerLoanNpl",
    "businessLoanNpl",
    "creditCardLoanNpl",
    "tradAsset",
    "fairValueChgGain",
    "otherNonInterestIncome",
    "cashflowInvAct",
    "centralBankAdj"
  ].filter((key, index, arr) => arr.indexOf(key) === index);
}

function readyBridgeRows() {
  const row = targetRecord();
  const banksForSelection = readySelectedBanks();
  return readyBridgeMetrics().map((metric) => {
    const targetQuality = readyQualityFor(state.target, state.year, metric);
    const peerQuality = (state.peers || []).map((bank) => readyQualityFor(bank, state.year, metric)).filter(Boolean);
    const peerAvailable = peerQuality.filter((item) => item.status === "available").length;
    const peerTotal = Math.max((state.peers || []).length, 1);
    const selectedQuality = banksForSelection.map((bank) => readyQualityFor(bank, state.year, metric)).filter(Boolean);
    const topMissing = selectedQuality.find((item) => item.status !== "available");
    const status = targetQuality?.status || (row?.[metric] != null ? "available" : "source_missing");
    const meta = readyQualityStatusMeta(status);
    return {
      metric,
      label: fieldName(metric),
      targetValue: row?.[metric],
      targetText: metricDisplayValue(metric, row?.[metric]),
      status,
      statusLabel: meta.label,
      tone: meta.tone,
      selectedSource: targetQuality?.selectedSource || row?._readyFieldSources?.[metric] || "",
      peerCoverage: `${peerAvailable}/${peerTotal}`,
      note: targetQuality?.missingReason || topMissing?.missingReason || meta.reason,
      scrapedSource: targetQuality?.scrapedSource || ""
    };
  });
}

function readyBridgeSummary() {
  const qualityRows = readySelectedBanks().flatMap((bank) =>
    readyBridgeMetrics().map((metric) => readyQualityFor(bank, state.year, metric)).filter(Boolean)
  );
  const counts = qualityRows.reduce((acc, item) => {
    acc[item.status] = (acc[item.status] || 0) + 1;
    return acc;
  }, {});
  const available = counts.available || 0;
  const total = qualityRows.length;
  const readyRate = total ? available / total : null;
  const scrapedWait = counts.scraped_available_not_fieldized || 0;
  const sourceMissing = counts.source_missing || 0;
  const targetMarket = ["peTtm", "divYield", "totalMarketValue", "turnoverRate"].filter((metric) => targetRecord()?.[metric] != null).length;
  return {
    total,
    available,
    readyRate,
    scrapedWait,
    sourceMissing,
    targetMarket
  };
}

function renderReadyDataBridge() {
  const panel = document.getElementById("readyDataBridgePanel");
  const kpis = document.getElementById("readyDataKpis");
  const body = document.getElementById("readyDataComparisonBody");
  if (!panel || !kpis || !body) return;
  if (!Array.isArray(readyMetricQuality) || !readyMetricQuality.length) {
    kpis.innerHTML = `<div class="ready-data-kpi tone-red"><span>Ready 层</span><b>未加载</b><em>请检查 data_ready.js</em></div>`;
    body.innerHTML = `<tr><td colspan="6">Ready 数据层未加载，暂不能形成补充对照。</td></tr>`;
    return;
  }
  const summary = readyBridgeSummary();
  kpis.innerHTML = [
    { label: "选定字段可用率", value: summary.readyRate == null ? "暂无" : `${(summary.readyRate * 100).toFixed(0)}%`, note: `${summary.available}/${summary.total} 个字段状态可用`, tone: summary.readyRate >= .8 ? "green" : summary.readyRate >= .55 ? "yellow" : "orange" },
    { label: "前台市场补充", value: `${summary.targetMarket}/4`, note: "目标银行 PE、股息率、市值、换手率", tone: summary.targetMarket >= 3 ? "green" : "yellow" },
    { label: "年报待字段化", value: String(summary.scrapedWait), note: "已有抓取明细，但尚未进入字段层", tone: summary.scrapedWait ? "orange" : "green" },
    { label: "三源均缺", value: String(summary.sourceMissing), note: "需要回到源数据或手工补披露", tone: summary.sourceMissing ? "red" : "green" }
  ].map((item) => `<div class="ready-data-kpi tone-${item.tone}">
    <span>${htmlSafe(item.label)}</span>
    <b>${htmlSafe(item.value)}</b>
    <em>${htmlSafe(item.note)}</em>
  </div>`).join("");
  body.innerHTML = readyBridgeRows().map((row) => `
    <tr class="tone-${htmlSafe(row.tone)}">
      <td>${metricLink(row.metric, row.label)}</td>
      <td>${htmlSafe(row.targetText)}</td>
      <td><span class="ready-status-pill tone-${htmlSafe(row.tone)}">${htmlSafe(row.statusLabel)}</span></td>
      <td>${htmlSafe(row.selectedSource || "暂无")}</td>
      <td>${htmlSafe(row.peerCoverage)}</td>
      <td>${htmlSafe(row.note)}${row.scrapedSource ? `<small>${htmlSafe(row.scrapedSource)}</small>` : ""}</td>
    </tr>`).join("");
  bindMetricLinks(body);
}

function renderLayeredTieout() {
  const host = document.getElementById("layeredTieoutBody");
  if (!host || typeof layeredFactModel !== "function") return;
  const model = layeredFactModel();
  host.innerHTML = model.topics.map((topic) => `
    <div class="layered-tieout-row">
      <b>${htmlSafe(topic.topicId)}</b>
      <span>核心证据 ${topic.evidenceFacts.length}</span>
      <span>数据边界 ${topic.boundaryFacts.length}</span>
      <span>引用 ${topic.citations.length}</span>
      <em>${htmlSafe(topic.factPackId)}</em>
    </div>
  `).join("");
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
  renderMetricExplorer(keys);
  renderFieldCoverageHeatmap(keys);
  renderFieldCoverageMatrixDetail();
  renderSprintBaselinePanel();
  renderReadyDataBridge();
  renderLayeredTieout();
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
    .filter((row) => {
      if (row.bank === target.bank) return false;
      if (template === "sameType") return row.type === target.type;
      return true;
    })
    .map((row) => {
      let score = 0;
      if (template === "sameType") score = 0;
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
  const productTemplate = recommendedAnalysisTemplate(target);
  if (productTemplate?.peerTemplate) return productTemplate.peerTemplate;
  if ((target.type || "").includes("国有") || (target.type || "").includes("股份")) return "sameType";
  if ((target.type || "").includes("城市商业")) return "sameRegion";
  if ((target.type || "").includes("农村商业")) return "sameRegion";
  return "sameType";
}

function recommendedAnalysisTemplate(target = targetRecord() || latest(state.target)) {
  if (!target) return null;
  const templates = analysisRules?.analysis_templates || {};
  return Object.values(templates).find((template) => {
    const needle = template.bankTypeIncludes;
    return needle && String(target.type || "").includes(needle);
  }) || null;
}

function applyRecommendedAnalysisTemplate(target = targetRecord() || latest(state.target)) {
  const template = recommendedAnalysisTemplate(target);
  if (!template) return;
  state.reportVersion = template.reportVersion || state.reportVersion;
  if (template.defaultTopics?.length && typeof ensureIncludedTopics === "function") {
    ensureIncludedTopics();
    topicDefinitions().forEach((topic) => {
      state.includedTopics[topic.id] = template.defaultTopics.includes(topic.id);
    });
  }
}

function refreshDefaultPeersForTarget() {
  const template = defaultPeerTemplateForTarget();
  state.peerTemplate = template;
  state.peers = peerTemplateBanks(template);
  applyRecommendedAnalysisTemplate();
}

function applyPeerTemplate(template) {
  state.peerTemplate = template;
  if (template !== "manual") state.peers = peerTemplateBanks(template);
  if (typeof clearGeneratedNarrativeCaches === "function") clearGeneratedNarrativeCaches("peer-template-change");
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
  if (["pb", "pbMid", "theoreticalPb", "pbDiscount"].includes(key)) return `${Number(value).toFixed(2)}x`;
  const moneyKeys = new Set([
    "economicProfit",
    "revenue",
    "coreRevenue",
    "netProfit",
    "ppop",
    "netInterestIncome",
    "feeIncome",
    "adminExpense",
    "interestIncome",
    "interestExpense",
    "incomeTax",
    "operatingCashFlow",
    "assets",
    "liabilities",
    "equity",
    "loans",
    "deposits",
    "earningAssets",
    "interestLiabilities",
    "assetsChange",
    "estimatedRwa",
    "estimatedRwaChange"
  ]);
  if (moneyKeys.has(key)) return typeof v5FormatMoney === "function" ? v5FormatMoney(value) : fmtMoney(value);
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
