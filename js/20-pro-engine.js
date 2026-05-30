/* Bank VQA module: 20-pro-engine.js — V4 mechanism, attribution, momentum and scenario engines */

function proNumber(value) {
  return typeof value === "number" && !Number.isNaN(value) ? value : null;
}

function proMedian(values = []) {
  const list = values.filter((value) => typeof value === "number" && !Number.isNaN(value)).sort((a, b) => a - b);
  if (!list.length) return null;
  const mid = Math.floor(list.length / 2);
  return list.length % 2 ? list[mid] : (list[mid - 1] + list[mid]) / 2;
}

function proQuantile(values = [], q = .5) {
  const list = values.filter((value) => typeof value === "number" && !Number.isNaN(value)).sort((a, b) => a - b);
  if (!list.length) return null;
  const pos = (list.length - 1) * q;
  const base = Math.floor(pos);
  const rest = pos - base;
  return list[base + 1] == null ? list[base] : list[base] + rest * (list[base + 1] - list[base]);
}

function proStd(values = []) {
  const list = values.filter((value) => typeof value === "number" && !Number.isNaN(value));
  if (list.length < 2) return null;
  const mean = list.reduce((sum, value) => sum + value, 0) / list.length;
  return Math.sqrt(list.reduce((sum, value) => sum + Math.pow(value - mean, 2), 0) / (list.length - 1));
}

function proPeerMedian(key, rows = peerRecords()) {
  return proMedian(rows.map((row) => row?.[key]));
}

function proRatio(num, den, scale = 100) {
  const n = proNumber(num);
  const d = proNumber(den);
  if (n == null || d == null || d === 0) return null;
  return n / d * scale;
}

function proPrevRecord(row = targetRecord()) {
  if (!row) return null;
  return records.find((item) => item.bank === row.bank && item.year === row.year - 1) || null;
}

function proMedianProfile(rows = peerRecords()) {
  const keys = ["roe", "roa", "assets", "equity", "netInterestIncome", "feeIncome", "adminExpense", "ppop", "netProfit", "nim", "earningAssetYield", "interestLiabilityCost", "loanAssetRatio", "depositLiabilityRatio"];
  return Object.fromEntries(keys.map((key) => [key, proMedian(rows.map((row) => row?.[key]))]));
}

function dupontNodeValue(row, key) {
  if (!row) return null;
  const provisionAndOther = row.ppop != null && row.netProfit != null ? row.ppop - row.netProfit : null;
  const map = {
    roe: row.roe,
    roa: row.roa,
    leverage: proRatio(row.assets, row.equity, 1),
    netInterestAsset: proRatio(row.netInterestIncome, row.assets),
    feeAsset: proRatio(row.feeIncome, row.assets),
    adminAsset: proRatio(row.adminExpense, row.assets),
    provisionOtherAsset: proRatio(provisionAndOther, row.assets),
    nim: row.nim,
    earningAssetYield: row.earningAssetYield,
    interestLiabilityCost: row.interestLiabilityCost,
    loanAssetRatio: row.loanAssetRatio,
    depositLiabilityRatio: row.depositLiabilityRatio
  };
  return map[key] ?? null;
}

function dupontBreakdown(row = targetRecord(), peers = peerRecords()) {
  if (!row) return null;
  const peer = proMedianProfile(peers);
  const peerLike = { ...peer };
  const nodes = [
    { id: "roe", label: "净资产收益率（ROE）", level: 1, value: dupontNodeValue(row, "roe"), peer: peer.roe, direction: "higherBetter" },
    { id: "roa", label: "总资产收益率（ROA）", level: 1, value: dupontNodeValue(row, "roa"), peer: peer.roa, direction: "higherBetter" },
    { id: "leverage", label: "权益乘数", level: 1, value: dupontNodeValue(row, "leverage"), peer: dupontNodeValue(peerLike, "leverage"), direction: "contextual" },
    { id: "netInterestAsset", label: "利息净收入/资产", level: 2, value: dupontNodeValue(row, "netInterestAsset"), peer: dupontNodeValue(peerLike, "netInterestAsset"), direction: "higherBetter" },
    { id: "feeAsset", label: "手续费收入/资产", level: 2, value: dupontNodeValue(row, "feeAsset"), peer: dupontNodeValue(peerLike, "feeAsset"), direction: "higherBetter" },
    { id: "adminAsset", label: "管理费用/资产", level: 2, value: dupontNodeValue(row, "adminAsset"), peer: dupontNodeValue(peerLike, "adminAsset"), direction: "lowerBetter" },
    { id: "provisionOtherAsset", label: "拨备及其他/资产", level: 2, value: dupontNodeValue(row, "provisionOtherAsset"), peer: dupontNodeValue(peerLike, "provisionOtherAsset"), direction: "lowerBetter" },
    { id: "earningAssetYield", label: "生息资产收益率", level: 3, value: row.earningAssetYield, peer: peer.earningAssetYield, direction: "higherBetter" },
    { id: "interestLiabilityCost", label: "计息负债成本率", level: 3, value: row.interestLiabilityCost, peer: peer.interestLiabilityCost, direction: "lowerBetter" }
  ].map((node) => {
    const gap = node.value == null || node.peer == null ? null : node.value - node.peer;
    const goodGap = gap == null ? null : node.direction === "lowerBetter" ? -gap : gap;
    return { ...node, gap, goodGap };
  });
  const contributionBase = nodes.filter((node) => node.level === 2 && node.goodGap != null);
  const totalAbs = contributionBase.reduce((sum, node) => sum + Math.abs(node.goodGap), 0) || 1;
  const contributions = contributionBase.map((node) => ({
    ...node,
    contributionShare: Math.abs(node.goodGap) / totalAbs
  })).sort((a, b) => Math.abs(b.goodGap) - Math.abs(a.goodGap));
  return {
    target: row.bank,
    peerLabel: "对标组中位数",
    roeGap: row.roe == null || peer.roe == null ? null : row.roe - peer.roe,
    nodes,
    contributions,
    mainDriver: contributions[0] || null
  };
}

function netProfitAttribution(row = targetRecord()) {
  const prev = proPrevRecord(row);
  if (!row || !prev || row.netProfit == null || prev.netProfit == null) return null;
  const scale = prev.netProfit * ((row.assetGrowth || 0) / 100);
  const nim = row.assets && row.nim != null && prev.nim != null ? row.assets * ((row.nim - prev.nim) / 100) : 0;
  const fee = (row.feeIncome || 0) - (prev.feeIncome || 0);
  const cost = -((row.adminExpense || 0) - (prev.adminExpense || 0));
  const ppopGap = (row.ppop || 0) - (prev.ppop || 0);
  const provision = ((row.netProfit || 0) - (prev.netProfit || 0)) - ppopGap;
  const known = scale + nim + fee + cost + provision;
  const total = row.netProfit - prev.netProfit;
  const other = total - known;
  const items = [
    { key: "scale", label: "规模驱动", value: scale },
    { key: "nim", label: "息差驱动", value: nim },
    { key: "fee", label: "中收驱动", value: fee },
    { key: "cost", label: "成本驱动", value: cost },
    { key: "provision", label: "拨备及税费驱动", value: provision },
    { key: "other", label: "其他", value: other }
  ].map((item) => ({ ...item, share: total ? item.value / Math.abs(total) : null }));
  const positive = [...items].filter((item) => item.value > 0).sort((a, b) => b.value - a.value)[0] || null;
  const negative = [...items].filter((item) => item.value < 0).sort((a, b) => a.value - b.value)[0] || null;
  return {
    from: prev.netProfit,
    to: row.netProfit,
    total,
    items,
    positive,
    negative,
    yearFrom: prev.year,
    yearTo: row.year
  };
}

function metricMomentum(bank = state.target, key) {
  const rows = series(bank).filter((row) => row[key] != null);
  if (rows.length < 3) return { key, label: fieldName(key), direction: "数据不足", acceleration: "数据不足", score: 0 };
  const last = rows[rows.length - 1];
  const prev = rows[rows.length - 2];
  const prev2 = rows[rows.length - 3];
  const d1 = last[key] - prev[key];
  const d0 = prev[key] - prev2[key];
  const higherGood = metricDirection(key);
  const goodD1 = higherGood ? d1 : -d1;
  const goodD0 = higherGood ? d0 : -d0;
  const direction = goodD1 > 0 ? "改善" : goodD1 < 0 ? "下行" : "持平";
  const accelerationRaw = goodD1 - goodD0;
  const acceleration = accelerationRaw > 0 ? `${direction}加速或降幅收窄` : accelerationRaw < 0 ? `${direction}减速或压力扩大` : "动量持平";
  const score = Math.max(-100, Math.min(100, Math.round(goodD1 * 20 + accelerationRaw * 12)));
  const inflection = Math.sign(goodD1) !== Math.sign(goodD0) && Math.sign(goodD0) !== 0;
  return { key, label: fieldName(key), direction, acceleration, score, inflection, lastValue: last[key], delta: d1, deltaPrev: d0 };
}

function sparcMomentumScores() {
  const dims = typeof sparcDimensions === "function" ? sparcDimensions() : [];
  return dims.map((dimension) => {
    const rows = dimension.metrics.map((metric) => metricMomentum(state.target, metric.key));
    const valid = rows.filter((item) => item.score != null);
    const score = valid.length ? valid.reduce((sum, item) => sum + item.score, 0) / valid.length : 0;
    return { ...dimension, momentumScore: Math.round(score), metricMomentum: rows };
  });
}

function structuralCycleTag(key, row = targetRecord()) {
  if (!row) return null;
  const prev = proPrevRecord(row);
  const value = row[key];
  if (!prev || value == null || prev[key] == null) return { key, label: fieldName(key), tag: "数据不足", note: "缺少跨期数据，暂不区分结构性与周期性。" };
  const typeRows = currentRecords().filter((item) => item.type === row.type);
  const typePrevRows = records.filter((item) => item.year === row.year - 1 && item.type === row.type);
  const typeDelta = avg(typeRows, key) == null || avg(typePrevRows, key) == null ? null : avg(typeRows, key) - avg(typePrevRows, key);
  const targetDelta = value - prev[key];
  const allValues = typeRows.map((item) => item[key]).filter((item) => typeof item === "number");
  const std = proStd(allValues) || 0;
  const typeAvg = avg(typeRows, key);
  const deviation = typeAvg == null ? 0 : value - typeAvg;
  const sameDirection = typeDelta == null || Math.sign(targetDelta) === Math.sign(typeDelta);
  const absStd = std ? Math.abs(deviation) / std : 0;
  let tag = "周期性";
  if (!sameDirection || absStd > 1.5) tag = "结构性";
  else if (absStd > .8 || Math.abs(targetDelta) > Math.abs(typeDelta || 0) * 1.5) tag = "混合";
  return {
    key,
    label: fieldName(key),
    tag,
    targetDelta,
    typeDelta,
    deviation,
    note: `${fieldName(key)}目标银行一年变化${metricDisplayValue(key, targetDelta)}，同类型均值变化${metricDisplayValue(key, typeDelta)}，当前偏离约${absStd.toFixed(1)}个标准差。`
  };
}

function scenarioImpact(row = targetRecord(), assumptions = {}) {
  if (!row || typeof computeVqaDiagnosis !== "function") return null;
  const base = computeVqaDiagnosis(row, peerRecords());
  const stressed = { ...row };
  if (assumptions.nimBp) stressed.nim = (stressed.nim || 0) + assumptions.nimBp / 100;
  if (assumptions.nplBp) stressed.npl = (stressed.npl || 0) + assumptions.nplBp / 100;
  if (assumptions.rwaGrowthPp) {
    stressed.rwaDensity = stressed.rwaDensity == null ? stressed.rwaDensity : Math.max(0, stressed.rwaDensity + assumptions.rwaGrowthPp * .4);
    stressed.cet1Buffer = stressed.cet1Buffer == null ? stressed.cet1Buffer : stressed.cet1Buffer - assumptions.rwaGrowthPp * 8;
  }
  stressed.roa = stressed.roa == null ? stressed.roa : stressed.roa + (assumptions.nimBp || 0) * .004 - (assumptions.nplBp || 0) * .003;
  const after = computeVqaDiagnosis(stressed, peerRecords());
  return { base, after, delta: after.score - base.score, assumptions, stressed };
}

function defaultScenarioSet(row = targetRecord()) {
  return [
    { label: "息差压力", description: "NIM 下行 10bp", result: scenarioImpact(row, { nimBp: -10 }) },
    { label: "风险压力", description: "不良率上行 30bp", result: scenarioImpact(row, { nplBp: 30 }) },
    { label: "资本约束", description: "RWA 增速高出 5 个百分点", result: scenarioImpact(row, { rwaGrowthPp: 5 }) }
  ];
}

function actionPriorityMatrix(row = targetRecord()) {
  if (!row) return [];
  const keys = ["nim", "feeAssetRatio", "npl", "overdueNplDeviation", "rwaDensity", "costIncomeRatio", "coreRevenueGrowth", "cet1Buffer"];
  const allRows = currentRecords();
  return keys.map((key) => {
    const value = row[key];
    const p75 = proQuantile(allRows.map((item) => item[key]), metricDirection(key) ? .75 : .25);
    const p25 = proQuantile(allRows.map((item) => item[key]), metricDirection(key) ? .25 : .75);
    const room = value == null || p75 == null ? 0 : Math.abs(p75 - value);
    const std = proStd(allRows.map((item) => item[key])) || 1;
    const feasibility = Math.max(0, Math.min(100, room / std * 35));
    const momentum = metricMomentum(row.bank, key);
    const urgency = Math.max(0, Math.min(100, -momentum.score + 50));
    const impact = Math.max(0, Math.min(100, Math.abs(topicPercentile({ 分位: rankPercentile(value, allRows, key, metricDirection(key)) }) - 50) * 1.5));
    const total = Math.round(impact * .45 + feasibility * .3 + urgency * .25);
    return { key, label: fieldName(key), value, p75, p25, impact, feasibility, urgency, total, momentum };
  }).sort((a, b) => b.total - a.total);
}

function benchmarkLinesForMetric(key, rows = peerRecords()) {
  const peerValues = rows.map((row) => row?.[key]).filter((value) => typeof value === "number");
  const allValues = currentRecords().map((row) => row?.[key]).filter((value) => typeof value === "number");
  const typeValues = currentRecords().filter((row) => state.types.includes(row.type)).map((row) => row?.[key]).filter((value) => typeof value === "number");
  const regulatory = { cet1: 7.5, liquidityCoverageRatio: 100, carBuffer: 0, cet1Buffer: 0 };
  return [
    { label: "对标均值", value: avg(rows, key), kind: "peerAvg" },
    { label: "对标中位数", value: proMedian(peerValues), kind: "peerMedian" },
    { label: "对标P25", value: proQuantile(peerValues, .25), kind: "p25" },
    { label: "对标P75", value: proQuantile(peerValues, .75), kind: "p75" },
    { label: "类型均值", value: proMedian(typeValues), kind: "type" },
    { label: "全样本中位数", value: proMedian(allValues), kind: "all" },
    { label: "监管线", value: regulatory[key], kind: "regulatory" }
  ].filter((item) => item.value != null);
}
