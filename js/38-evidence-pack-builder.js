/* Bank VQA module: 38-evidence-pack-builder.js */

function evidenceReadyRows() {
  if (typeof ready_record_wide !== "undefined" && Array.isArray(ready_record_wide)) return ready_record_wide;
  if (typeof READY_RECORD_WIDE !== "undefined" && Array.isArray(READY_RECORD_WIDE)) return READY_RECORD_WIDE;
  if (typeof readyRecords !== "undefined" && Array.isArray(readyRecords)) return readyRecords;
  return [];
}

function evidenceQualityRows() {
  if (typeof ready_metric_quality !== "undefined" && Array.isArray(ready_metric_quality)) return ready_metric_quality;
  if (typeof readyMetricQuality !== "undefined" && Array.isArray(readyMetricQuality)) return readyMetricQuality;
  return [];
}

function normalizeEvidenceValue(value) {
  if (value == null || value === "" || Number.isNaN(value)) return null;
  return value;
}

function normalizeSourceRefs(row = {}) {
  if (Array.isArray(row.sourceRefs) && row.sourceRefs.length) return row.sourceRefs.filter(Boolean);
  const sourceTier = row.sourceTier || row.数据来源 || row.source || row.抓取来源 || "unknown";
  const year = row.year || row.年份 || "";
  const metricKey = row.metricKey || row.指标代码 || row.key || row.metric || "";
  const sourceFile = row.sourceFile || row.来源文件 || row.sourceTable || row.表名 || "";
  return [[sourceTier, year, metricKey, sourceFile].filter(Boolean).join(":") || "unknown:fact"];
}

function normalizeQualityStatus(row = {}) {
  const status = row.qualityStatus || row.数据状态 || row.status || "";
  if (["ready", "partial", "missing"].includes(status)) return status;
  if (status === "可用" || status === "已入库" || status === "是") return "ready";
  if (status === "待补" || status === "缺失" || status === "否") return "missing";
  return normalizeEvidenceValue(row.value ?? row.目标值 ?? row.targetValue) == null ? "missing" : "partial";
}

function normalizeReadyMetricFact(row = {}) {
  const metricKey = row.metricKey || row.指标代码 || row.key || row.metric || row.factId || "";
  const metricName = row.metricName || row.指标名称 || row.label || (typeof fieldName === "function" ? fieldName(metricKey) : metricKey);
  const value = normalizeEvidenceValue(row.value ?? row.目标值 ?? row.targetValue ?? row.current);
  return {
    factId: row.factId || [metricKey || "metric", row.year || row.年份 || "", row.bankName || row.bank || row.银行 || ""].filter(Boolean).join("."),
    metricKey,
    metricName,
    label: row.label || metricName,
    value,
    targetValue: normalizeEvidenceValue(row.targetValue ?? row.目标值 ?? value),
    compareValue: normalizeEvidenceValue(row.compareValue ?? row.对标均值 ?? row.peerMean ?? row.peer),
    unit: row.unit || row.单位 || "",
    year: row.year || row.年份 || (typeof state !== "undefined" ? state.year : ""),
    bankName: row.bankName || row.standardBankName || row.bank || row.银行 || (typeof state !== "undefined" ? state.target : ""),
    sourceTier: row.sourceTier || row.数据来源 || row.source || row.抓取来源 || "unknown",
    sourceFile: row.sourceFile || row.来源文件 || row.sourceTable || row.表名 || "",
    conclusionSignal: row.conclusionSignal || row.signal || row.判断 || "",
    sourceRefs: normalizeSourceRefs(row),
    qualityStatus: normalizeQualityStatus(row),
    missingReason: row.missingReason || row.缺失原因 || ""
  };
}

function normalizeCalculationFact(row = {}) {
  const metricKey = row.metricKey || row.指标代码 || row.key || row.metric || "";
  return {
    metricKey,
    targetValue: normalizeEvidenceValue(row.targetValue ?? row.目标值 ?? row.current),
    peerMean: normalizeEvidenceValue(row.peerMean ?? row.对标均值 ?? row.peer),
    peerMedian: normalizeEvidenceValue(row.peerMedian ?? row.对标中位数),
    typeMean: normalizeEvidenceValue(row.typeMean ?? row.类型均值),
    percentile: normalizeEvidenceValue(row.percentile ?? row.分位),
    direction: row.direction || row.方向 || "",
    trend: row.trend || row.趋势 || "",
    deviationLevel: row.deviationLevel || row.偏离程度 || row.signal || "",
    qualityStatus: normalizeQualityStatus(row),
    sourceRefs: normalizeSourceRefs(row)
  };
}

function validateEvidencePackLineage(pack = {}) {
  const facts = Array.isArray(pack.facts) ? pack.facts : [];
  const calculations = Array.isArray(pack.calculations) ? pack.calculations : [];
  return facts.concat(calculations).every((fact) => (
    Array.isArray(fact.sourceRefs)
      && fact.sourceRefs.length > 0
      && Boolean(fact.qualityStatus)
      && Boolean(fact.metricKey || fact.factId)
  ));
}

function buildEvidencePack({ blockId = "unknown", facts = [], calculations = [], quality = [], context = {} } = {}) {
  const normalizedFacts = facts.map(normalizeReadyMetricFact);
  const normalizedCalculations = calculations.map(normalizeCalculationFact);
  const normalizedQuality = quality.map((row) => ({
    metricKey: row.metricKey || row.指标代码 || row.metric || "",
    metricName: row.metricName || row.指标名称 || row.label || "",
    qualityStatus: normalizeQualityStatus(row),
    missingReason: row.missingReason || row.缺失原因 || "",
    sourceRefs: normalizeSourceRefs(row)
  }));
  const pack = {
    blockId,
    generatedAt: new Date().toISOString(),
    context,
    facts: normalizedFacts,
    calculations: normalizedCalculations,
    quality: normalizedQuality,
    ready_record_wide: evidenceReadyRows().length,
    ready_metric_quality: evidenceQualityRows().length
  };
  return {
    ...pack,
    lineageStatus: validateEvidencePackLineage(pack) ? "ready" : "partial"
  };
}

if (typeof window !== "undefined") {
  window.normalizeReadyMetricFact = normalizeReadyMetricFact;
  window.buildEvidencePack = buildEvidencePack;
  window.validateEvidencePackLineage = validateEvidencePackLineage;
}
