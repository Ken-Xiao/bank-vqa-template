/* Bank VQA module: 21-portal-workflows.js — BenchmarkIQ V4 workflow, narrative and sensitivity layer */

function v4Num(value) {
  return typeof value === "number" && !Number.isNaN(value) ? value : null;
}

function v4MetricGap(key, row = targetRecord(), peers = peerRecords()) {
  const value = v4Num(row?.[key]);
  const peer = avg(peers, key);
  if (value == null || peer == null) return null;
  const direction = typeof metricDirection === "function" ? metricDirection(key) : true;
  const raw = value - peer;
  return {
    key,
    label: fieldName(key),
    value,
    peer,
    raw,
    goodGap: direction ? raw : -raw,
    direction
  };
}

function recordAnalysisSession(action, params = {}, finding = "") {
  if (!state.sessionLog) state.sessionLog = [];
  const entry = {
    timestamp: new Date().toLocaleString("zh-CN", { hour12: false }),
    action,
    params,
    finding: reportShortText(finding || portalWorkflowFinding(action), 110)
  };
  state.sessionLog = [entry, ...state.sessionLog].slice(0, 24);
  if (typeof renderSessionLogPanel === "function") renderSessionLogPanel();
}

function portalWorkflowFinding(action = "分析") {
  const row = targetRecord();
  if (!row) return "尚未形成目标银行诊断。";
  const diagnosis = computeVqaDiagnosis(row, peerRecords());
  return `${displayBankName(row.bank)}VQA ${diagnosis.score}，最弱维度为${diagnosis.labels[diagnosis.weakest]}，本轮分析按位置、归因、趋势、敏感性和行动优先级展开。`;
}

function defaultWatchMetrics(row = targetRecord()) {
  if (!row) return ["roa", "nim", "npl", "overdueNplDeviation", "cet1Buffer"];
  const ranked = typeof actionPriorityMatrix === "function" ? actionPriorityMatrix(row) : [];
  const base = ranked.slice(0, 7).map((item) => item.key);
  const required = ["roa", "nim", "npl", "feeAssetRatio", "cet1Buffer"];
  return [...new Set([...base, ...required])].slice(0, 8);
}

function watchMetricRows(row = targetRecord()) {
  const keys = state.watchMetrics?.length ? state.watchMetrics : defaultWatchMetrics(row);
  return keys.map((key) => {
    const gap = v4MetricGap(key, row, peerRecords());
    const momentum = typeof metricMomentum === "function" ? metricMomentum(row?.bank || state.target, key) : null;
    const priority = typeof actionPriorityMatrix === "function" ? actionPriorityMatrix(row).find((item) => item.key === key) : null;
    const pctRaw = rankPercentile(row?.[key], currentRecords(), key, typeof metricDirection === "function" ? metricDirection(key) : true);
    const pct = Number.isFinite(pctRaw) ? pctRaw : null;
    return {
      key,
      label: fieldName(key),
      value: metricDisplayValue(key, row?.[key]),
      peer: metricDisplayValue(key, gap?.peer),
      gapText: gap ? `${gap.goodGap >= 0 ? "高于/优于" : "低于/劣于"}对标 ${metricDisplayValue(key, Math.abs(gap.raw))}` : "对标数据不足",
      percentile: pct == null ? "P--" : `P${Math.round(pct)}`,
      momentum: momentum?.direction || "待观察",
      priority: priority?.total ?? null
    };
  });
}

function buildMechanismExplanation(topicId = state.activeTopic) {
  const row = targetRecord();
  const map = {
    profit: "盈利质量的形成机制应先拆收入，再拆拨备和费用。若核心营收、手续费资产比和拨备前利润未同步改善，净利润改善不能直接解释为主业修复。",
    nim: "息差差距通常由资产收益率和计息负债成本共同形成。若负债成本高于对标且定期存款占比偏高，修复路径优先落在负债结构和客户沉淀，而非单纯扩表。",
    risk: "风险结果指标需要与关注率、逾期偏离度和拨备覆盖率联读。若前移指标高于对标而不良率稳定，说明风险确认节奏仍需复核。",
    capital: "资本与估值需要同时看风险加权资产密度、资本余量、ROA 和 PB。若资本消耗高但回报未同步提升，估值沟通应先证明资本效率改善。",
    market: "估值折价不能只用低市净率解释，需要回到盈利质量、风险透明度和资本纪律三类经营证据。"
  };
  const topic = topicDefinitions().find((item) => item.id === topicId);
  const base = map[topicId] || topic?.mechanism || "该专题需要把指标差距拆成经营结构、周期环境和管理动作三层解释。";
  const facts = typeof rsm2TopicFacts === "function" ? rsm2TopicFacts(topicId).slice(0, 2) : [];
  const evidence = facts.map((fact) => `${fact.指标名称}${fact.目标值}、对标${fact.对标均值}`).join("；");
  return `${base}${evidence ? ` 当前证据为：${evidence}。` : ""}${row ? `本页结论仅适用于 ${displayBankName(row.bank)} ${state.year} 年口径。` : ""}`;
}

function buildTemporalNarrative(key, bank = state.target) {
  const rows = series(bank).filter((row) => row[key] != null).slice(-6);
  if (rows.length < 3) return `${fieldName(key)}历史数据不足，暂不形成六年轨迹判断。`;
  const first = rows[0];
  const last = rows[rows.length - 1];
  const momentum = typeof metricMomentum === "function" ? metricMomentum(bank, key) : null;
  return `${fieldName(key)}从 ${first.year} 年 ${metricDisplayValue(key, first[key])} 变化至 ${last.year} 年 ${metricDisplayValue(key, last[key])}，最近动量为${momentum?.direction || "待观察"}，${momentum?.acceleration || "加速度暂不判断"}。该轨迹用于区分一次性波动和持续性经营趋势。`;
}

function gapAttributionEngine(key, row = targetRecord(), peers = peerRecords()) {
  const gap = v4MetricGap(key, row, peers);
  if (!gap) return { label: fieldName(key), headline: "数据不足，暂不形成归因判断", rows: [] };
  const driversByMetric = {
    roa: ["netInterestAsset", "feeAsset", "adminAsset", "provisionOtherAsset"],
    roe: ["roa", "leverage", "cet1Buffer"],
    nim: ["earningAssetYield", "interestLiabilityCost", "timeDepositShare", "loanAssetRatio"],
    npl: ["overdueNplDeviation", "specialMentionRatio", "provisionCoverage"],
    pb: ["roa", "npl", "cet1Buffer"]
  };
  const drivers = driversByMetric[key] || [key];
  const rows = drivers.map((driverKey) => {
    const driverGap = v4MetricGap(driverKey, row, peers);
    return {
      key: driverKey,
      label: fieldName(driverKey),
      value: metricDisplayValue(driverKey, row?.[driverKey]),
      peer: metricDisplayValue(driverKey, driverGap?.peer),
      contribution: driverGap?.goodGap == null ? 0 : Math.abs(driverGap.goodGap)
    };
  }).sort((a, b) => b.contribution - a.contribution);
  const main = rows[0];
  return {
    label: fieldName(key),
    headline: `${fieldName(key)}较对标${gap.goodGap >= 0 ? "具备相对优势" : "存在相对差距"}，主解释因子为${main?.label || "待补数据"}`,
    rows
  };
}

function buildIndustryContextParagraph(row = targetRecord()) {
  if (!row) return "尚未确认目标银行，暂不形成行业背景判断。";
  const typeRows = currentRecords().filter((item) => state.types.includes(item.type));
  const pairs = [
    ["roa", "回报"],
    ["nim", "息差"],
    ["npl", "风险"],
    ["pb", "估值"]
  ].map(([key, label]) => `${label}：目标${metricDisplayValue(key, row[key])}，类型均值${metricDisplayValue(key, avg(typeRows, key))}`);
  return `${state.year} 年行业背景需要先用类型均值校准个体偏离。${pairs.join("；")}。若目标银行与类型均值方向一致，结论应标注行业周期边界；若偏离扩大，才进入结构性归因。`;
}

function crossValidationNarratives(row = targetRecord()) {
  if (!row) return [];
  const checks = [];
  if (row.nim != null && row.roa != null) {
    const nimM = metricMomentum(row.bank, "nim");
    const roaM = metricMomentum(row.bank, "roa");
    if (nimM.score > 0 && roaM.score < 0) checks.push("净息差动量改善但 ROA 动量下行，需验证费用、拨备或非息收入是否抵消息差修复。");
  }
  if (row.npl != null && row.overdueNplDeviation != null && row.overdueNplDeviation > 1) checks.push("不良率稳定不能单独支持风险改善，逾期偏离度高于 1 时需复核风险确认节奏。");
  if (row.netProfitGrowth != null && row.operatingCashFlowGrowth != null && row.netProfitGrowth > 0 && row.operatingCashFlowGrowth < 0) checks.push("净利润增长与经营现金流变化方向不一致，利润质量需要增加现金流验证。");
  if (row.roe != null && row.roa != null) {
    const roeGap = v4MetricGap("roe", row);
    const roaGap = v4MetricGap("roa", row);
    if (roeGap?.goodGap > 0 && roaGap?.goodGap < 0) checks.push("ROE相对较好但ROA低于对标，需区分杠杆贡献和真实资产回报。");
  }
  return checks.length ? checks : ["核心指标之间未发现强背离，当前结论可沿位置、归因和行动优先级继续推进。"];
}

function peerSensitivityRows(row = targetRecord()) {
  if (!row || state.peers.length < 2 || typeof computeVqaDiagnosis !== "function") return [];
  const base = computeVqaDiagnosis(row, peerRecords());
  return state.peers.map((peer) => {
    const peersAfter = state.peers.filter((item) => item !== peer);
    const rowsAfter = records.filter((item) => peersAfter.includes(item.bank) && item.year === state.year);
    const after = computeVqaDiagnosis(row, rowsAfter);
    const delta = after.score - base.score;
    return {
      peer,
      base: base.score,
      after: after.score,
      delta,
      flip: base.signal !== after.signal,
      weakest: after.labels[after.weakest]
    };
  }).sort((a, b) => Math.abs(b.delta) - Math.abs(a.delta));
}

function drillDownRows(topicId = state.activeTopic, row = targetRecord()) {
  const drillTree = {
    profit: ["roa", "coreRevenueGrowth", "feeAssetRatio", "ppopGrowth"],
    nim: ["nim", "earningAssetYield", "interestLiabilityCost", "timeDepositShare"],
    risk: ["npl", "overdueNplDeviation", "specialMentionRatio", "provisionCoverage"],
    capital: ["cet1Buffer", "rwaDensity", "rwaProfitGrowthGap", "pb"],
    market: ["pb", "roa", "npl", "cet1Buffer"]
  };
  return (drillTree[topicId] || drillTree.profit).map((key) => {
    const gap = v4MetricGap(key, row);
    return {
      key,
      label: fieldName(key),
      target: metricDisplayValue(key, row?.[key]),
      peer: metricDisplayValue(key, gap?.peer),
      contribution: gap ? Math.abs(gap.goodGap) : 0,
      finding: gap ? `${gap.goodGap >= 0 ? "形成支撑" : "形成约束"}，差距${metricDisplayValue(key, Math.abs(gap.raw))}` : "对标数据不足"
    };
  }).sort((a, b) => b.contribution - a.contribution);
}

function renderWatchMetricsDashboard() {
  const nodes = [document.getElementById("benchmarkWatchlist"), document.getElementById("portalWatchMetrics")].filter(Boolean);
  if (!nodes.length) return;
  const rows = watchMetricRows();
  const html = rows.map((item) => `
    <div class="portal-watch-card">
      <span>${item.label}</span>
      <b>${item.value}</b>
      <em>对标 ${item.peer}｜${item.percentile}</em>
      <p>${item.gapText}；动量${item.momentum}${item.priority == null ? "" : `；优先级 ${item.priority}`}</p>
    </div>`).join("");
  nodes.forEach((node) => { node.innerHTML = html || "<span>待生成。</span>"; });
}

function renderSessionLogPanel() {
  const panel = document.getElementById("sessionLogList");
  if (!panel) return;
  const rows = (state.sessionLog || []).slice(0, 8);
  panel.innerHTML = rows.length ? rows.map((item) => `
    <div class="session-log-row">
      <span>${item.timestamp}</span>
      <b>${item.action}</b>
      <p>${item.finding}</p>
    </div>`).join("") : "<p>确认分析后开始记录本轮分析路径。</p>";
}

function renderPeerSensitivityPanel() {
  const panel = document.getElementById("peerSensitivityList");
  if (!panel) return;
  const rows = peerSensitivityRows().slice(0, 8);
  panel.innerHTML = rows.length ? rows.map((item) => `
    <div class="peer-sensitivity-row${item.flip ? " is-flip" : ""}">
      <b>${displayBankName(item.peer)}</b>
      <span>移除后 ${item.after} 分（${item.delta >= 0 ? "+" : ""}${item.delta}）</span>
      <em>${item.flip ? "信号翻转" : "信号稳定"}｜最弱维度 ${item.weakest}</em>
    </div>`).join("") : "<p>至少保留 2 家对标银行后生成敏感性测试。</p>";
}

function renderPortalWorkflowPanels() {
  if (!state.confirmed) return;
  if (!state.watchMetrics?.length) state.watchMetrics = defaultWatchMetrics();
  renderWatchMetricsDashboard();
  renderPeerSensitivityPanel();
  renderSessionLogPanel();
}

function confidenceLevel(metric, row = targetRecord(), peers = peerRecords()) {
  const hasTarget = row?.[metric] != null;
  const peerCount = peers.filter((peer) => peer?.[metric] != null).length;
  const sensitivity = peerSensitivityRows(row).some((item) => item.flip) ? "weak" : "ok";
  const weakCount = [hasTarget ? "ok" : "weak", peerCount >= 3 ? "ok" : "weak", sensitivity].filter((item) => item === "weak").length;
  if (weakCount === 0) return { level: "高", prefix: "数据明确显示", suffix: "可进入主报告判断。" };
  if (weakCount === 1) return { level: "中", prefix: "现有数据倾向于显示", suffix: "建议保留口径提示。" };
  if (weakCount === 2) return { level: "低", prefix: "数据信号指向", suffix: "但尚需补充口径验证。" };
  return { level: "极低", prefix: "因样本或口径限制", suffix: "暂不形成该维度的对标结论。" };
}
