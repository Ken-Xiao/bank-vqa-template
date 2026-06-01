/* Bank VQA module: 27-v6-boardroom-engine.js */
function v6Number(value) {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function v6PeerStd(key, peers = peerRecords()) {
  const vals = peers.map((row) => row?.[key]).filter((value) => v6Number(value) !== null);
  if (vals.length < 2) return null;
  const mean = vals.reduce((sum, value) => sum + value, 0) / vals.length;
  return Math.sqrt(vals.reduce((sum, value) => sum + (value - mean) ** 2, 0) / (vals.length - 1)) || null;
}

function v6PeerMedian(key, peers = peerRecords()) {
  return typeof proMedian === "function" ? proMedian(peers.map((row) => row?.[key])) : avg(peers, key);
}

function v6MetricZ(row, key, peers = peerRecords()) {
  const value = row?.[key];
  const median = v6PeerMedian(key, peers);
  const std = v6PeerStd(key, peers);
  if (v6Number(value) === null || v6Number(median) === null || !std) return null;
  const raw = (value - median) / std;
  return metricDirection(key) ? raw : -raw;
}

function ddmTheoreticalPB(row = targetRecord(), coe = 0.10, g = 0.02) {
  if (typeof theoreticalPB === "function") return theoreticalPB(row, { coe: coe * 100, g: g * 100 });
  if (!row || v6Number(row.roe) === null || coe === g) return null;
  return { pb: (row.roe / 100 - g) / (coe - g), roe: row.roe, coe: coe * 100, g: g * 100, actual: row.pb };
}

function v6NarrativeIntensity(row, key, peers = peerRecords()) {
  const z = v6MetricZ(row, key, peers);
  if (z == null) return { level: 1, label: "数据不足", text: "数据覆盖不足，保留跟踪。" };
  const abs = Math.abs(z);
  if (abs > 2) return { level: 3, label: "董事会议题", text: z < 0 ? "需要立即纳入董事会讨论" : "可作为主动沟通支撑" };
  if (abs >= 1) return { level: 2, label: "重点关注", text: z < 0 ? "相对对标组形成压力" : "相对对标组形成支撑" };
  return { level: 1, label: "区间内", text: "位于对标区间内，保持跟踪" };
}

function v6TensionOpening(row = targetRecord(), peers = peerRecords()) {
  if (!row) return "确认样本后生成张力开场。";
  const target = displayBankName(row.bank);
  const peerRoa = avg(peers, "roa");
  const peerPb = avg(peers, "pb");
  if (row.roa != null && peerRoa != null && row.roa > peerRoa && row.pb != null && peerPb != null && row.pb < peerPb) {
    return `${target}ROA高于对标组，但PB低于对标组，董事会真正要讨论的是市场是否信任盈利的可持续性。`;
  }
  if (row.netProfitGrowth != null && row.netProfitGrowth > 0 && row.ppopGrowth != null && row.ppopGrowth < row.netProfitGrowth) {
    return `${target}净利润仍在增长，但拨备前利润没有同步支撑，利润质量需要先过经营验证。`;
  }
  if (row.nim != null && row.nim < avg(peers, "nim") && row.interestLiabilityCost != null && row.interestLiabilityCost > avg(peers, "interestLiabilityCost")) {
    return `${target}息差低于对标且负债成本偏高，问题不只是利率下行，而是负债经营纪律。`;
  }
  const diagnosis = computeVqaDiagnosis(row, peers);
  return `${target}VQA总分${diagnosis.score}，但董事会不应只看总分，而应先追问${diagnosis.labels[diagnosis.weakest]}为何成为价值质量约束。`;
}

function boardroomDiscussionQuestions(row = targetRecord(), peers = peerRecords()) {
  if (!row) return [];
  const target = displayBankName(row.bank);
  const diagnosis = computeVqaDiagnosis(row, peers);
  const pb = typeof theoreticalPB === "function" ? theoreticalPB(row) : null;
  const questions = [
    {
      dimension: "估值验证",
      question: `${target}的低PB是价值错配，还是经营质量折价？`,
      evidence: [
        `实际PB ${metricDisplayValue("pb", row.pb)}`,
        `DDM理论PB ${metricDisplayValue("theoreticalPb", pb?.pb)}`,
        `ROE ${metricDisplayValue("roe", row.roe)}`
      ],
      link: "formal-v5-pb-answer"
    },
    {
      dimension: diagnosis.labels[diagnosis.weakest] || "价值质量",
      question: `${target}当前最弱维度应先修复，还是可以进入主动沟通？`,
      evidence: [
        `VQA ${diagnosis.score}`,
        `${diagnosis.labels[diagnosis.weakest]} ${diagnosis.dim[diagnosis.weakest]}`,
        `信号：${diagnosis.signal}`
      ],
      link: "formal-v5-executive-value"
    },
    {
      dimension: "异动预警",
      question: `${target}本期异动是周期波动，还是结构性问题？`,
      evidence: v6AnomalyRadar(row, peers).cross.slice(0, 2).map((item) => `${item.label}：${item.tag}`),
      link: "formal-v6-anomaly"
    }
  ];
  return questions;
}

function v6AnomalyRadar(row = targetRecord(), peers = peerRecords()) {
  if (!row) return { positive: [], negative: [], deviations: [], cross: [] };
  const keys = ["roe", "roa", "coreRevenueGrowth", "feeAssetRatio", "nim", "nimGapBp", "timeDepositShare", "npl", "overdueNplDeviation", "provisionCoverage", "cet1Buffer", "pb", "costIncomeRatio", "assetGrowth", "rwaDensity"];
  const rows = keys.map((key) => {
    const momentum = metricMomentum(row.bank, key);
    const z = v6MetricZ(row, key, peers);
    const tag = structuralCycleTag(key, row);
    const direction = metricDirection(key);
    const current = row[key];
    const peer = v6PeerMedian(key, peers);
    return {
      key,
      label: fieldName(key),
      current,
      peer,
      z,
      absZ: z == null ? 0 : Math.abs(z),
      momentumScore: momentum.score || 0,
      absMomentum: Math.abs(momentum.score || 0),
      momentum,
      tag: tag?.tag || "待判断",
      isBad: z == null ? false : z < 0,
      direction
    };
  });
  const positive = rows.filter((item) => item.momentumScore > 0).sort((a, b) => b.absMomentum - a.absMomentum).slice(0, 5);
  const negative = rows.filter((item) => item.momentumScore <= 0).sort((a, b) => b.absMomentum - a.absMomentum).slice(0, 5);
  const deviations = rows.filter((item) => item.z != null).sort((a, b) => b.absZ - a.absZ).slice(0, 5);
  const cross = rows.filter((item) => item.absZ >= 1 && item.absMomentum >= 15).sort((a, b) => (b.absZ + b.absMomentum / 50) - (a.absZ + a.absMomentum / 50)).slice(0, 5);
  return { positive, negative, deviations, cross };
}

function v6AnomalySemanticTag(item = {}) {
  const absZ = Math.abs(item.z || 0);
  const absMomentum = Math.abs(item.momentumScore || 0);
  if (absZ >= 1.5 && absMomentum >= 20) {
    return {
      label: "结构性信号",
      tone: "red",
      help: "同时偏离同业且本期变化明显，优先进入董事会议题。"
    };
  }
  if (absZ >= 1.2) {
    return {
      label: "同业偏离",
      tone: item.isBad ? "red" : "green",
      help: "主要问题来自横向位置，需要解释为什么不同于对标组。"
    };
  }
  if (absMomentum >= 20) {
    return {
      label: "周期扰动",
      tone: item.momentumScore < 0 ? "amber" : "green",
      help: "主要问题来自本期变化，需要判断是否为短期扰动。"
    };
  }
  return {
    label: "待验证混合信号",
    tone: "neutral",
    help: "横向偏离和纵向变化均不极端，保留跟踪即可。"
  };
}

function v6AnomalyWhyItMatters(item = {}) {
  const targetText = `目标 ${metricDisplayValue(item.key, item.current)}`;
  const peerText = item.peer == null ? "" : `对标 ${metricDisplayValue(item.key, item.peer)}`;
  const momentumText = item.momentum?.direction ? `${item.momentum.direction}` : "趋势待判";
  const semantic = v6AnomalySemanticTag(item);
  return `${semantic.label}：${[targetText, peerText, momentumText].filter(Boolean).join("；")}。管理含义：${semantic.help}`;
}

function anomalyLikelyReason(item = {}) {
  const key = item.key || "";
  const semantic = v6AnomalySemanticTag(item);
  const directionText = item.momentumScore < 0 ? "恶化" : "改善";
  if (/nim|nimGap|timeDeposit|interestLiability|loanYield/i.test(key)) {
    return `可能原因：资产端重定价快于负债端降本，或存款定期化推高资金成本；当前更像${semantic.label}下的息差${directionText}信号。`;
  }
  if (/npl|overdue|provision|hidden|retail|specialMention/i.test(key)) {
    return `可能原因：风险分类、逾期迁徙或拨备使用节奏变化；若同时偏离同业，需优先复核风险确认是否滞后。`;
  }
  if (/roe|roa|profit|ppop|revenue|coreRevenue/i.test(key)) {
    return `可能原因：拨备、投资收益、费用或核心营收共同影响利润表现；需要拆分前端经营修复和一次性扰动。`;
  }
  if (/fee|cost|admin|income/i.test(key)) {
    return `可能原因：中收转化、网点费用、管理费用或收入结构变化；应判断是经营效率问题还是阶段投入。`;
  }
  if (/cet1|car|rwa|assetGrowth|loanAsset/i.test(key)) {
    return `可能原因：扩表速度、RWA密度和资本补充节奏不匹配；需要回到资本消耗和新增资产回报验证。`;
  }
  if (/pb|valuation|economic/i.test(key)) {
    return `可能原因：市场定价正在折现盈利、风险透明度或资本回报差异；不能把估值变化直接解释为低估。`;
  }
  return `可能原因：该指标同时受本期变化、同业位置和口径差异影响；建议先验证${semantic.label}是否能被业务动作解释。`;
}

function anomalyCauseBars(item = {}) {
  const absZ = Math.min(100, Math.abs(item.z || 0) / 2 * 100);
  const absMomentum = Math.min(100, Math.abs(item.momentumScore || 0) / 40 * 100);
  const calibration = typeof metricCalibrationRisk === "function" ? metricCalibrationRisk(item.key) : null;
  const calibrationScore = calibration?.level === "L4" ? 90 : calibration?.level === "L3" ? 72 : calibration?.level === "L2" ? 48 : 28;
  const mechanismScore = /nim|npl|overdue|roe|roa|profit|fee|cost|cet1|rwa|pb/i.test(item.key || "") ? 76 : 48;
  return [
    { label: "同业偏离", value: Math.round(absZ), note: item.z == null ? "无横向偏离" : `${Math.abs(item.z).toFixed(1)}σ` },
    { label: "本期动量", value: Math.round(absMomentum), note: item.momentum?.direction || "趋势待判" },
    { label: "业务机制", value: mechanismScore, note: "需专题验证" },
    { label: "口径风险", value: calibrationScore, note: calibration?.riskLevel || calibration?.level || "L2" }
  ];
}

function anomalyCauseChartHtml(item = {}) {
  return `
    <div class="anomaly-cause-chart" aria-label="异动原因强弱图">
      ${anomalyCauseBars(item).map((bar) => `
        <div class="anomaly-cause-bar">
          <span>${bar.label}</span>
          <i style="--cause-width:${Math.max(8, Math.min(100, bar.value))}%"></i>
          <em>${bar.note}</em>
        </div>`).join("")}
    </div>`;
}

function businessLogicAlerts(row = targetRecord()) {
  if (!row) return [];
  const prev = proPrevRecord(row);
  if (!prev) return [];
  const delta = (key) => v6Number(row[key]) !== null && v6Number(prev[key]) !== null ? row[key] - prev[key] : null;
  const alerts = [];
  if ((delta("assetGrowth") ?? row.assetGrowth ?? 0) > 0 && delta("npl") < 0 && delta("provisionCoverage") < 0) {
    alerts.push({
      title: "扩表、低不良与拨备下降同时出现",
      level: "red",
      text: "贷款或资产增长背景下，不良率下降但拨备覆盖率同步下降，需要复核风险确认是否滞后。"
    });
  }
  if (delta("netProfitGrowth") > 0 && delta("ppopGrowth") < 0) {
    alerts.push({
      title: "净利润改善未由拨备前利润支撑",
      level: "amber",
      text: "净利润表现好于经营底盘时，应拆分拨备、税费和投资波动贡献。"
    });
  }
  if (delta("loans") > 0 && delta("nim") < 0 && delta("npl") > 0) {
    alerts.push({
      title: "量价风险三项背离",
      level: "red",
      text: "贷款扩张同时伴随息差下降和不良上行，需复核新增资产定价与风险筛选纪律。"
    });
  }
  if (delta("timeDepositShare") > 0 && delta("interestLiabilityCost") > 0) {
    alerts.push({
      title: "存款定期化推高负债成本",
      level: "amber",
      text: "定期占比与负债成本同向上行，ALCO 应优先讨论负债结构修复。"
    });
  }
  return alerts;
}

function v6DiscussionStripHtml(row = targetRecord()) {
  const questions = boardroomDiscussionQuestions(row);
  if (!questions.length) return "";
  return `<div class="v6-discussion-head"><span>董事会讨论问题</span><b>前3页必须回答</b></div><div class="v6-discussion-grid">${questions.map((item, index) => `
    <a class="v6-discussion-card" href="#${item.link}">
      <span>${String(index + 1).padStart(2, "0")}｜${item.dimension}</span>
      <b>${item.question}</b>
      <p>${item.evidence.filter(Boolean).slice(0, 3).join("；") || "待补证据。"}</p>
    </a>`).join("")}</div>`;
}

function v6AnomalyRadarHtml(row = targetRecord()) {
  const radar = v6AnomalyRadar(row);
  const render = (items, showPeer = false) => items.map((item) => {
    const semantic = v6AnomalySemanticTag(item);
    const evidence = showPeer
      ? `目标 ${metricDisplayValue(item.key, item.current)}｜对标 ${metricDisplayValue(item.key, item.peer)}`
      : `${item.momentum.direction || "变化待判"}｜${item.momentum.acceleration || "动量待判"}`;
    return `
      <div class="v6-anomaly-row tone-${semantic.tone} ${item.absZ >= 1.5 ? "is-cross" : ""}">
        <b>${item.label}</b>
        <span>${evidence}</span>
        <em>${semantic.label}</em>
        ${anomalyCauseChartHtml(item)}
        <p class="step2-change-reason">${anomalyLikelyReason(item)}</p>
        <p>${v6AnomalyWhyItMatters(item)}</p>
      </div>`;
  }).join("");
  return `
    <div class="v6-anomaly-grid">
      <div><h4>纵向正向异动</h4>${render(radar.positive) || "<p>暂无显著正向异动。</p>"}</div>
      <div><h4>纵向负向异动</h4>${render(radar.negative) || "<p>暂无显著负向异动。</p>"}</div>
      <div><h4>横向偏离Top 5</h4>${render(radar.deviations, true) || "<p>暂无显著横向偏离。</p>"}</div>
      <div><h4>交叉标记</h4>${render(radar.cross, true) || "<p>暂无纵横共振异动。</p>"}</div>
    </div>`;
}

function v6BusinessLogicHtml(row = targetRecord()) {
  const alerts = businessLogicAlerts(row);
  return `<div class="v6-alert-stack">${alerts.length ? alerts.map((item) => `
    <div class="v6-alert-card tone-${item.level}">
      <span>${item.level === "red" ? "强警示" : "需复核"}</span>
      <b>${item.title}</b>
      <p>${item.text}</p>
    </div>`).join("") : `<div class="v6-alert-card"><span>未触发</span><b>业务逻辑未发现强背离组合</b><p>仍需结合最新季报和贷后数据复核。</p></div>`}</div>`;
}

function v6CapitalMarketActionHtml(row = targetRecord()) {
  const drivers = typeof pbDriverRanking === "function" ? pbDriverRanking(row, peerRecords()).slice(0, 3) : [];
  const top = drivers[0];
  const stages = [
    ["0-3个月", "优化信息披露与投资者问答材料", top ? `${top.label}：目标向对标中位数收敛，模型PB影响 ${top.lift >= 0 ? "+" : ""}${top.lift.toFixed(2)}x` : "补齐PB归因样本"],
    ["3-6个月", "把轻资本收入、风险确认和分红政策纳入沟通框架", drivers[1] ? drivers[1].readout : "跟踪ROE、NPL和成本收入比"],
    ["6-12个月", "用ROE结构性修复验证估值叙事", drivers[2] ? drivers[2].readout : "以DDM理论PB复核市场折价"]
  ];
  return `<div class="v6-capital-action-grid">${stages.map(([period, action, kpi]) => `
    <div class="v6-capital-action-card">
      <span>${period}</span>
      <b>${action}</b>
      <p>${kpi}</p>
    </div>`).join("")}</div>`;
}

function renderV6BoardroomLayer(row = targetRecord()) {
  const host = document.getElementById("v6DiscussionStrip");
  if (host) host.innerHTML = v6DiscussionStripHtml(row);
  const radar = document.getElementById("v5DeviationRadar");
  if (radar) radar.innerHTML = v6AnomalyRadarHtml(row);
}

function formalV6BoardroomSections(row = targetRecord()) {
  if (!row) return "";
  const questions = boardroomDiscussionQuestions(row);
  return `
    <section class="formal-section formal-v6-section" id="formal-v6-boardroom">
      <div class="formal-section-kicker">董事会议题</div>
      <h2>${formalEscape(v6TensionOpening(row, peerRecords()))}</h2>
      <div class="v6-discussion-grid">${questions.map((item, index) => `
        <div class="v6-discussion-card">
          <span>${String(index + 1).padStart(2, "0")}｜${formalEscape(item.dimension)}</span>
          <b>${formalEscape(item.question)}</b>
          <p>${formalEscape(item.evidence.filter(Boolean).join("；"))}</p>
        </div>`).join("")}</div>
    </section>
    <section class="formal-section formal-v6-section" id="formal-v6-anomaly">
      <div class="formal-section-kicker">异动雷达</div>
      <h2>本期最大变化需要同时看纵向动量和横向偏离</h2>
      ${v6AnomalyRadarHtml(row)}
    </section>
    <section class="formal-section formal-v6-section" id="formal-v6-consistency">
      <div class="formal-section-kicker">业务逻辑一致性</div>
      <h2>强结论需先通过业务传导逻辑复核</h2>
      ${v6BusinessLogicHtml(row)}
    </section>
    <section class="formal-section formal-v6-section" id="formal-v6-capital-action">
      <div class="formal-section-kicker">市值管理行动页</div>
      <h2>PB归因应转化为可复盘的资本市场沟通动作</h2>
      ${v6CapitalMarketActionHtml(row)}
      <p class="formal-source">口径说明：PB改善幅度来自截面回归估计，反映统计相关性，不构成股价或估值承诺。</p>
    </section>`;
}
