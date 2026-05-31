/* Bank VQA module: 11-fact-pack.js — PRD-24 结构化事实包 */

function metricDirectionText(key) {
  const dir = analysisRules?.metrics?.[key]?.direction || metricDictionaryEntry(key)?.direction;
  if (dir === "higherBetter") return "指标偏高通常代表经营质量更好，但需结合风险联读";
  if (dir === "lowerBetter") return "指标偏低通常代表经营质量更好，但需结合专题联读";
  return "需结合专题与同业对标联读";
}

function buildStandardFactRow(key, row, peers, typeRows, allRows) {
  const value = row?.[key];
  const peerAvg = avg(peers, key);
  const typeAvg = avg(typeRows, key);
  const completenessRate = completeness([row, ...peers].filter(Boolean), key);
  const calibration = typeof metricCalibrationRisk === "function" ? metricCalibrationRisk(key, [row, ...peers].filter(Boolean)) : null;
  const alerts = typeof v3CounterintuitiveAlerts === "function" ? v3CounterintuitiveAlerts(row, peers) : [];
  const sequence = typeof v3TransformationSequence === "function" ? v3TransformationSequence(row) : null;
  const macro = typeof v3MacroTransmission === "function" ? v3MacroTransmission(row, peers) : null;
  const triangle = typeof v3ProfitQualityTriangle === "function" ? v3ProfitQualityTriangle(row, peers) : null;
  const factor = typeof dupontBreakdown === "function" ? dupontBreakdown(row, peers)?.mainDriver : null;
  return {
    指标代码: key,
    指标名称: metricLabel[key] || fieldName(key),
    目标银行: row?.bank || state.target,
    对标银行: state.peers.join("、"),
    分析年份: state.year,
    目标值: metricDisplayValue(key, value),
    对标均值: metricDisplayValue(key, peerAvg),
    类型均值: metricDisplayValue(key, typeAvg),
    对标差距: value == null || peerAvg == null ? "暂无" : metricDisplayValue(key, value - peerAvg),
    一年变化: row ? (yoyValue(row.bank, key) == null ? "暂无" : metricDisplayValue(key, yoyValue(row.bank, key))) : "暂无",
    五年变化: row ? (fiveYearValue(row.bank, key) == null ? "暂无" : metricDisplayValue(key, fiveYearValue(row.bank, key))) : "暂无",
    全样本分位: rankPercentile(value, allRows, key, metricDirection(key)),
    数据完整性: completenessRate == null ? "暂无" : `${(completenessRate * 100).toFixed(1)}%`,
    口径风险等级: calibration?.level || "L2",
    口径风险标签: calibration?.label || "L2 可比，需脚注",
    报告使用建议: calibration?.decisionUse || "主报告+脚注",
    口径脚注: calibration?.note || "建议保留指标口径、样本覆盖和数据来源说明。",
    解释方向: metricDirectionText(key),
    因子归因值: factor?.gap == null ? "暂无" : metricDisplayValue(key, factor.gap),
    主导因子标签: factor?.label || "待验证",
    传导链标签: macro?.label || "待验证",
    反直觉标记: alerts.length ? alerts.map((item) => item.type).join("、") : "",
    反直觉提示: alerts.length ? alerts.map((item) => item.title).join("；") : "",
    转型阶段标签: sequence?.stage || "待判断",
    利润质量三角: triangle?.label || "待验证",
    区域比较锚点: row?.region ? `${row.region}区域，需与同区域和同类型样本共同复核` : "待补区域字段",
    原始值: value,
    可用: value !== null && value !== undefined && !Number.isNaN(value)
  };
}

function buildTopicFactPackObject(topicId = state.activeTopic) {
  const topic = topicDefinitions().find((item) => item.id === topicId) || topicDefinitions()[0];
  const row = targetRecord();
  const peers = peerRecords();
  const typeRows = currentRecords().filter((r) => state.types.includes(r.type));
  const allRows = currentRecords();
  const facts = topic.metrics.map((key) => buildStandardFactRow(key, row, peers, typeRows, allRows));
  const judgement = topicJudgement(topic.id, facts.map((fact) => ({
    ...fact,
    分位: fact.全样本分位
  })));
  return {
    type: "topic",
    topicId: topic.id,
    topicTitle: topic.title,
    question: topic.question,
    mechanism: topic.mechanism,
    judgement: {
      level: judgement.level,
      signal: judgement.signal,
      headline: judgement.headline,
      avgScore: judgement.avgScore
    },
    facts,
    generatedAt: new Date().toISOString()
  };
}

function buildChartFactPackObject(title) {
  const row = targetRecord();
  const peers = peerRecords();
  const typeRows = currentRecords();
  const allRows = currentRecords();
  const keys = metricsForChart(title);
  const facts = keys.map((key) => buildStandardFactRow(key, row, peers, typeRows, allRows));
  return {
    type: "chart",
    chartTitle: title,
    question: chartQuestion(title),
    facts,
    generatedAt: new Date().toISOString()
  };
}

function mechanismRiskMeta(key, rows = selectedBankRecords()) {
  if (!key || typeof metricCalibrationRisk !== "function") {
    return { level: "", label: "", decisionUse: "", note: "" };
  }
  const known = records.some((row) => row[key] !== undefined) || !!metricDictionaryEntry(key) || !!analysisRules?.metrics?.[key];
  if (!known) return { level: "", label: "", decisionUse: "", note: "" };
  return metricCalibrationRisk(key, rows);
}

function mechanismRowBase(module, row = targetRecord()) {
  return {
    目标银行: row?.bank || state.target,
    分析年份: state.year,
    对标银行: state.peers.join("、"),
    分析模块: module
  };
}

function mechanismMetricRow(module, key, item = {}, row = targetRecord(), rowsForRisk = selectedBankRecords()) {
  const risk = mechanismRiskMeta(key, rowsForRisk);
  return {
    ...mechanismRowBase(module, row),
    指标代码: key || item.key || "",
    指标名称: item.label || metricLabel[key] || fieldName(key) || key || "",
    目标值: item.valueText || metricDisplayValue(key, item.value),
    对标值: item.peerText || metricDisplayValue(key, item.peer),
    差距: item.gapText || metricDisplayValue(key, item.gap),
    贡献值: item.contribution == null ? "" : Number(item.contribution.toFixed ? item.contribution.toFixed(4) : item.contribution),
    贡献占比: item.contributionShare == null ? "" : `${(item.contributionShare * 100).toFixed(1)}%`,
    判断: item.readout || "",
    口径风险等级: risk.level,
    口径风险标签: risk.label,
    报告使用建议: risk.decisionUse,
    口径脚注: risk.note
  };
}

function buildDupontMechanismModule(row = targetRecord(), peers = peerRecords()) {
  const pack = typeof dupontBreakdown === "function" ? dupontBreakdown(row, peers) : null;
  const main = pack?.mainDriver;
  return {
    id: "dupont",
    title: "DuPont三级分解",
    headline: main
      ? `ROE 差距优先由${main.label}解释，贡献占比${main.contributionShare == null ? "待测算" : `${(main.contributionShare * 100).toFixed(0)}%`}。`
      : "ROE 分解数据不足，需补齐资产、权益、收入、费用与拨备字段。",
    rows: (pack?.nodes || []).map((node) => mechanismMetricRow("DuPont三级分解", node.id, {
      ...node,
      readout: node.gap == null
        ? "缺少目标或对标值"
        : `${node.label}较对标组${node.goodGap >= 0 ? "形成正向支撑" : "形成拖累"}`
    }, row, [row, ...peers].filter(Boolean)))
  };
}

function buildProfitAttributionModule(row = targetRecord()) {
  const pack = typeof netProfitAttribution === "function" ? netProfitAttribution(row) : null;
  return {
    id: "profit",
    title: "净利润归因瀑布",
    headline: pack
      ? `${pack.yearFrom}-${pack.yearTo} 净利润变化${metricDisplayValue("netProfit", pack.total)}，最大正贡献为${pack.positive?.label || "待验证"}，最大拖累为${pack.negative?.label || "待验证"}。`
      : "净利润归因缺少上一年净利润或利润表拆分字段，暂不形成瀑布结论。",
    rows: (pack?.items || []).map((item) => mechanismMetricRow("净利润归因瀑布", item.key, {
      label: item.label,
      value: item.value,
      peer: null,
      gap: item.value,
      contribution: item.value,
      contributionShare: item.share == null ? null : Math.abs(item.share),
      readout: item.value > 0 ? "对净利润同比形成正贡献" : item.value < 0 ? "对净利润同比形成拖累" : "贡献中性"
    }, row, [row].filter(Boolean)))
  };
}

function buildNimAttributionModule(row = targetRecord(), peers = peerRecords()) {
  const attribution = typeof gapAttributionEngine === "function" ? gapAttributionEngine("nim", row, peers) : null;
  const rows = (attribution?.rows || []).map((item) => mechanismMetricRow("NIM归因", item.key, {
    label: item.label,
    valueText: item.value,
    peerText: item.peer,
    contribution: item.contribution,
    readout: `${item.label}用于解释净息差相对差距`
  }, row, [row, ...peers].filter(Boolean)));
  ["nim", "earningAssetYield", "interestLiabilityCost", "timeDepositShare"].forEach((key) => {
    if (rows.some((item) => item.指标代码 === key)) return;
    rows.push(mechanismMetricRow("NIM归因", key, {
      label: fieldName(key),
      value: row?.[key],
      peer: avg(peers, key),
      gap: row?.[key] == null || avg(peers, key) == null ? null : row[key] - avg(peers, key),
      readout: "NIM 归因底层指标"
    }, row, [row, ...peers].filter(Boolean)));
  });
  return {
    id: "nim",
    title: "NIM归因",
    headline: attribution?.headline || "息差归因需同时拆分资产收益率、负债成本和存款结构。",
    rows
  };
}

function buildBenchmarkLinesModule(row = targetRecord(), peers = peerRecords()) {
  const keys = ["roa", "roe", "nim", "earningAssetYield", "interestLiabilityCost", "npl", "provisionCoverage", "cet1Buffer", "rwaDensity", "pb"];
  const rows = keys.flatMap((key) => {
    const lines = typeof benchmarkLinesForMetric === "function" ? benchmarkLinesForMetric(key, peers) : [];
    return lines.map((line) => mechanismMetricRow("多基准线", key, {
      label: `${fieldName(key)}-${line.label}`,
      value: row?.[key],
      peer: line.value,
      gap: row?.[key] == null || line.value == null ? null : row[key] - line.value,
      readout: `用于图表基准线：${line.label}`
    }, row, [row, ...peers].filter(Boolean)));
  });
  return {
    id: "benchmark",
    title: "多基准线",
    headline: `已为 ${keys.length} 个核心指标生成对标均值、中位数、分位数、类型/全样本和监管线基准。`,
    rows
  };
}

function buildMechanismFactPackObject(row = targetRecord(), peers = peerRecords()) {
  return {
    type: "mechanism",
    target: row?.bank || state.target,
    year: state.year,
    peerBanks: state.peers.slice(),
    modules: {
      dupont: buildDupontMechanismModule(row, peers),
      profit: buildProfitAttributionModule(row),
      nim: buildNimAttributionModule(row, peers),
      benchmark: buildBenchmarkLinesModule(row, peers)
    },
    generatedAt: new Date().toISOString()
  };
}

function exportMechanismFactPackRows() {
  const pack = buildMechanismFactPackObject();
  return Object.values(pack.modules).flatMap((module) => module.rows.map((row) => ({
    ...row,
    模块结论: module.headline
  })));
}

function exportStructuredFactPackRows() {
  const topicRows = topicDefinitions().flatMap((topic) => {
    const pack = buildTopicFactPackObject(topic.id);
    return pack.facts.map((fact) => ({
      包类型: "专题事实包",
      专题: pack.topicTitle,
      专题判断: pack.judgement.signal,
      ...fact
    }));
  });
  const chartRows = collectChartSlides().flatMap((slide) => {
    const pack = buildChartFactPackObject(slide.title);
    return pack.facts.map((fact) => ({
      包类型: "图表事实包",
      图表: pack.chartTitle,
      图要回答: pack.question,
      ...fact
    }));
  });
  const mechanismRows = typeof exportMechanismFactPackRows === "function"
    ? exportMechanismFactPackRows().map((row) => ({
      包类型: "机制归因事实包",
      ...row
    }))
    : [];
  return [...topicRows, ...chartRows, ...mechanismRows];
}
