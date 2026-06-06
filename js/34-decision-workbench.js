/* Bank VQA module: 34-decision-workbench.js — PRD v8 decision workbench helpers */

function topicQuestionTitle(topicId = state.activeTopic) {
  const map = {
    profit: "利润是真的在改善，还是在吃老本？",
    nim: "负债端能否接住资产端的让价？",
    risk: "风险认定是不是已经滞后？",
    capital: "扩表有没有真正创造价值？",
    valuation: "市场低估了我们，还是经营质量还不够好？",
    capitalMarket: "资本市场到底在给哪类质量折价？",
    retailRisk: "零售风险是短期波动，还是客群质量变化？",
    depositLoanDeepDive: "存贷结构能不能支撑息差防守？"
  };
  return map[topicId] || "这个专题会不会改变董事会行动排序？";
}

function topicInsightTriangle(topicId = state.activeTopic) {
  const topic = typeof topicDefinitions === "function"
    ? topicDefinitions().find((item) => item.id === topicId) || topicDefinitions()[0]
    : null;
  const facts = typeof topicFactPackRows === "function" ? topicFactPackRows(topicId) : [];
  const primary = facts[0] || {};
  const judgement = typeof topicJudgement === "function" ? topicJudgement(topicId, facts) : null;
  return {
    currentValue: `${primary.指标名称 || topic?.title || "核心指标"}：${primary.目标值 || "待补"}`,
    trendDirection: `变化方向：一年${primary.一年变化 || "待补"}，${primary.分位 || "分位待补"}`,
    mechanismExplanation: judgement?.headline || topic?.mechanism || "机制解释待补充"
  };
}

function metricTimeSeriesSnapshot(metricKey = "nim") {
  const allRecords = Array.isArray(records) ? records : [];
  const years = [...new Set(allRecords.map((row) => row.year).filter(Boolean))].sort((a, b) => a - b);
  const targetBank = state?.target;
  const peers = state?.peers || [];
  const types = state?.types || [];
  const simulatedRow = typeof decisionWorkbenchRow === "function" ? decisionWorkbenchRow() : null;
  const isSimulated = Boolean(simulatedRow?.__whatIfSimulation);
  const targetSeries = years.map((year) => {
    const row = allRecords.find((item) => item.bank === targetBank && item.year === year);
    if (isSimulated && year === state.year) {
      return { year, value: simulatedRow?.[metricKey] ?? row?.[metricKey] ?? null, simulated: true };
    }
    return { year, value: row?.[metricKey] ?? null, simulated: false };
  });
  const peerAverageSeries = years.map((year) => {
    const rows = allRecords.filter((item) => peers.includes(item.bank) && item.year === year);
    return { year, value: typeof avg === "function" ? avg(rows, metricKey) : null };
  });
  const typeAverageSeries = years.map((year) => {
    const rows = allRecords.filter((item) => types.includes(item.type) && item.year === year);
    return { year, value: typeof avg === "function" ? avg(rows, metricKey) : null };
  });
  return { metricKey, years, targetSeries, peerAverageSeries, typeAverageSeries };
}

function whatIfIsActive(assumptions = typeof whatIfAssumptions === "function" ? whatIfAssumptions() : null) {
  if (!assumptions) return false;
  return Math.abs(Number(assumptions.nimBp) || 0) > 0
    || Math.abs(Number(assumptions.nplBp) || 0) > 0
    || Math.abs(Number(assumptions.costPp) || 0) > 0;
}

function decisionWorkbenchRow(row = typeof targetRecord === "function" ? targetRecord() : null) {
  if (!row || !whatIfIsActive()) return row;
  const scenario = typeof whatIfScenario === "function" ? whatIfScenario(row) : null;
  if (!scenario?.simulated) return row;
  return {
    ...scenario.simulated,
    __baseRecord: row,
    __whatIfScenario: scenario,
    __whatIfSimulation: true
  };
}

function whatIfSimulationBadge(row = typeof decisionWorkbenchRow === "function" ? decisionWorkbenchRow() : null) {
  if (!row?.__whatIfSimulation) return "";
  const scenario = row.__whatIfScenario || (typeof whatIfScenario === "function" ? whatIfScenario(row.__baseRecord || targetRecord()) : null);
  const scoreText = scenario?.scoreDelta == null ? "VQA待测算" : `VQA ${scenario.scoreDelta >= 0 ? "+" : ""}${scenario.scoreDelta}`;
  const roaText = scenario?.roaDelta == null ? "ROA待测算" : `ROA ${scenario.roaDelta >= 0 ? "+" : ""}${scenario.roaDelta.toFixed(2)}pct`;
  return `<span class="whatif-simulation-badge">模拟口径｜${scoreText}｜${roaText}</span>`;
}

function whatIfLinkedRefresh() {
  if (typeof renderWhatIfControlPanel === "function") renderWhatIfControlPanel();
  if (typeof updateClientCommandCenter === "function") updateClientCommandCenter();
  if (typeof renderStep2Diagnosis === "function") renderStep2Diagnosis();
  if (typeof renderMetricContextRail === "function") renderMetricContextRail();
  if (typeof updateBenchmarkV1 === "function") updateBenchmarkV1();
  if (typeof renderFormalReport === "function") renderFormalReport();
  if (typeof renderGlobalBar === "function") renderGlobalBar();
}

function metricPercentile(row, metricKey) {
  const value = row?.[metricKey];
  if (typeof value !== "number" || Number.isNaN(value)) return null;
  const rows = typeof currentRecords === "function" ? currentRecords() : [];
  const values = rows.map((item) => item?.[metricKey]).filter((item) => typeof item === "number" && !Number.isNaN(item));
  if (!values.length) return null;
  const higherBetter = typeof metricDirection === "function" ? metricDirection(metricKey) : true;
  const betterOrEqual = values.filter((item) => higherBetter ? item <= value : item >= value).length;
  return Math.max(0, Math.min(100, betterOrEqual / values.length * 100));
}

function heatmapTone(percentile) {
  if (percentile == null || Number.isNaN(percentile)) return "neutral";
  if (percentile >= 70) return "strong";
  if (percentile >= 40) return "middle";
  return "weak";
}

function peerHeatmapRows(rowOrMetricKeys = targetRecord(), maybeMetricKeys) {
  const row = Array.isArray(rowOrMetricKeys) ? targetRecord() : rowOrMetricKeys || targetRecord();
  const metricKeys = Array.isArray(rowOrMetricKeys)
    ? rowOrMetricKeys
    : Array.isArray(maybeMetricKeys)
      ? maybeMetricKeys
      : ["roa", "nim", "npl", "feeAssetRatio", "coreRevenueGrowth", "costIncomeRatio", "cet1Buffer", "pb"];
  if (!row) return { keys: metricKeys, rows: [] };
  const banks = [row.bank || state.target, ...(state?.peers || [])].filter(Boolean);
  const uniqueBanks = [...new Set(banks)];
  const rows = uniqueBanks.map((bank) => {
    const record = bank === row.bank || bank === state.target
      ? row
      : typeof latest === "function"
        ? latest(bank, state.year)
        : null;
    return {
      bank,
      isTarget: bank === row.bank || bank === state.target,
      isSimulation: Boolean(record?.__whatIfSimulation),
      cells: metricKeys.map((key) => {
        const percentile = metricPercentile(record, key);
        return {
          key,
          metricKey: key,
          label: typeof fieldName === "function" ? fieldName(key) : key,
          value: typeof metricDisplayValue === "function" ? metricDisplayValue(key, record?.[key]) : record?.[key] ?? "暂无",
          pct: percentile,
          percentile,
          tone: heatmapTone(percentile)
        };
      })
    };
  });
  return { keys: metricKeys, rows };
}

function initDecisionWorkbenchModule() {
  if (typeof renderTopicWorkbench === "function" && !renderTopicWorkbench.__decisionWorkbenchWrapped) {
    const originalRenderTopicWorkbench = renderTopicWorkbench;
    renderTopicWorkbench = function renderTopicWorkbenchWithDecisionLayer() {
      return originalRenderTopicWorkbench.apply(this, arguments);
    };
    renderTopicWorkbench.__decisionWorkbenchWrapped = true;
  }
}
