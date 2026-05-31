/* Bank VQA module: 19-product-workspace.js — V1/V2/V3 client workspace */

var activeWorkspaceTab = "report";
var activeDataSubtab = "quality";
var layoutPanelStorageKey = "bankVqaLayoutPanelState";
var layoutPanelConfig = {
  sideNav: {
    bodyClass: "layout-nav-collapsed",
    elementId: "sideNav",
    collapsedLabel: "展开",
    expandedLabel: "收起",
    collapsedAria: "展开页面导航",
    expandedAria: "收起页面导航"
  },
  analysisRoadmap: {
    bodyClass: "layout-map-collapsed",
    elementId: "analysisRoadmap",
    collapsedLabel: "展开",
    expandedLabel: "收起",
    collapsedAria: "展开分析地图",
    expandedAria: "收起分析地图"
  },
  reportControlRail: {
    bodyClass: "layout-rail-collapsed",
    elementId: "reportControlRail",
    collapsedLabel: "展开控制台",
    expandedLabel: "收起交付控制台",
    collapsedAria: "展开交付控制台",
    expandedAria: "收起交付控制台"
  }
};

function readLayoutPanelState() {
  try {
    return JSON.parse(localStorage.getItem(layoutPanelStorageKey) || "{}");
  } catch (error) {
    return {};
  }
}

function writeLayoutPanelState(nextState) {
  try {
    localStorage.setItem(layoutPanelStorageKey, JSON.stringify(nextState));
  } catch (error) {
    // Local storage can be unavailable in restricted previews; layout still works for the session.
  }
}

function setLayoutPanelCollapsed(panelKey, collapsed, persist = true) {
  const config = layoutPanelConfig[panelKey];
  if (!config) return;
  const element = document.getElementById(config.elementId);
  const toggle = document.querySelector(`[data-layout-collapse-target="${panelKey}"]`);
  document.body.classList.toggle(config.bodyClass, collapsed);
  element?.classList.toggle("is-collapsed", collapsed);
  if (toggle) {
    toggle.setAttribute("aria-expanded", collapsed ? "false" : "true");
    toggle.setAttribute("aria-label", collapsed ? config.collapsedAria : config.expandedAria);
    toggle.textContent = collapsed ? config.collapsedLabel : config.expandedLabel;
  }
  if (persist) {
    const saved = readLayoutPanelState();
    saved[panelKey] = collapsed;
    writeLayoutPanelState(saved);
  }
}

function toggleLayoutPanel(panelKey) {
  const config = layoutPanelConfig[panelKey];
  const element = config ? document.getElementById(config.elementId) : null;
  setLayoutPanelCollapsed(panelKey, !element?.classList.contains("is-collapsed"));
}

function bindLayoutPanelToggles() {
  const saved = readLayoutPanelState();
  Object.keys(layoutPanelConfig).forEach((panelKey) => {
    setLayoutPanelCollapsed(panelKey, Boolean(saved[panelKey]), false);
  });
  document.querySelectorAll("[data-layout-collapse-target]").forEach((button) => {
    if (button.dataset.layoutCollapseBound) return;
    button.dataset.layoutCollapseBound = "1";
    button.addEventListener("click", () => toggleLayoutPanel(button.dataset.layoutCollapseTarget));
  });
}

function analysisNavigationItems() {
  const confirmed = Boolean(state?.confirmed);
  const quality = typeof criticalMetricCompleteness === "function" ? criticalMetricCompleteness() : null;
  const diagnosis = typeof commandCenterDiagnosis === "function" ? commandCenterDiagnosis() : null;
  const qualityText = quality == null ? "待复核" : quality >= 0.8 ? "可信" : quality >= 0.6 ? "需脚注" : "需补数";
  const diagnosisText = diagnosis?.score == null ? "待生成" : `${diagnosis.score}分`;
  return [
    { tab: "overview", href: "#clientBriefPanel", label: "总览答案", desc: "30秒判断与董事会议题", status: confirmed ? diagnosisText : "待确认" },
    { tab: "overview", href: "#presidentSummaryPanel", label: "行长摘要", desc: "一页读懂关键发现", status: confirmed ? "已生成" : "待生成" },
    { tab: "topics", href: "#topicWorkbenchSection", label: "专题归因", desc: "盈利、息差、风险、资本、估值", status: confirmed ? "可复核" : "待生成" },
    { tab: "data", href: "#dataCoverageSection", label: "数据可信度", desc: "口径、完整性、字段矩阵", status: qualityText },
    { tab: "report", href: "#formalReportShell", label: "正式报告", desc: "HTML/PDF/PPTX 同源母版", status: confirmed ? "可审阅" : "待生成" },
    { tab: "review", href: "#boardReviewPanel", label: "交付复核", desc: "版式、语言、数据边界", status: confirmed ? "待检查" : "待生成" },
    { tab: "governance", href: "#projectFlow", label: "项目管理", desc: "对标组、导出记录、版本留痕", status: "可管理" }
  ];
}

function analysisStageItems() {
  const confirmed = Boolean(state?.confirmed);
  const quality = typeof criticalMetricCompleteness === "function" ? criticalMetricCompleteness() : null;
  const diagnosis = typeof commandCenterDiagnosis === "function" ? commandCenterDiagnosis() : null;
  return [
    { tab: "overview", label: "选口径", state: confirmed ? "done" : "active" },
    { tab: "overview", label: "看结论", state: diagnosis ? "done" : confirmed ? "active" : "todo" },
    { tab: "topics", label: "查证据", state: confirmed ? "active" : "todo" },
    { tab: "report", label: "改报告", state: confirmed ? "active" : "todo" },
    { tab: "review", label: "复核导出", state: quality != null && quality >= 0.8 && confirmed ? "active" : "todo" }
  ];
}

function analysisNextAction(tab = activeWorkspaceTab) {
  const map = {
    overview: { tab: "topics", href: "#topicWorkbenchSection", label: "下一步：进入专题归因" },
    topics: { tab: "data", href: "#dataCoverageSection", label: "下一步：核对数据口径" },
    data: { tab: "report", href: "#formalReportShell", label: "下一步：审阅正式报告" },
    report: { tab: "review", href: "#boardReviewPanel", label: "下一步：交付复核" },
    review: { tab: "governance", href: "#projectFlow", label: "下一步：保存项目" },
    governance: { tab: "overview", href: "#clientBriefPanel", label: "回到总览答案" }
  };
  return map[tab] || map.overview;
}

function renderAnalysisRoadmap() {
  const host = document.getElementById("analysisRoadmap");
  if (!host) return;
  const title = document.getElementById("analysisRoadmapTitle");
  const steps = document.getElementById("analysisRoadmapSteps");
  const links = document.getElementById("analysisMapLinks");
  const next = document.getElementById("analysisNextAction");
  const row = typeof targetRecord === "function" ? targetRecord() : null;
  if (title) {
    const target = row?.bank || state?.target || "目标银行";
    title.textContent = state?.confirmed
      ? `${displayBankName(target)} ${state.year || ""}：按地图推进，不再从头盲拉`
      : "先确认样本，再按路径推进分析";
  }
  if (steps) {
    steps.innerHTML = analysisStageItems().map((item, index) => `
      <button type="button" class="analysis-step is-${item.state}${item.tab === activeWorkspaceTab ? " is-current" : ""}" data-nav-target="${item.tab}">
        <span>${index + 1}</span><b>${item.label}</b>
      </button>`).join("");
  }
  if (links) {
    links.innerHTML = analysisNavigationItems().map((item) => `
      <a class="analysis-map-card${item.tab === activeWorkspaceTab ? " is-active" : ""}" href="${item.href}" data-nav-target="${item.tab}">
        <span>${item.label}</span>
        <b>${item.desc}</b>
        <em>${item.status}</em>
      </a>`).join("");
  }
  const action = analysisNextAction(activeWorkspaceTab);
  if (next) {
    next.textContent = action.label;
    next.href = action.href;
    next.dataset.navTarget = action.tab;
  }
  bindAnalysisRoadmap();
}

function bindAnalysisRoadmap() {
  document.querySelectorAll("#analysisRoadmap [data-nav-target], .topic-next-actions [data-nav-target]").forEach((el) => {
    if (el.dataset.navBound) return;
    el.dataset.navBound = "1";
    el.addEventListener("click", (event) => {
      const tab = el.dataset.navTarget;
      if (tab) setWorkspaceTab(tab);
      const href = el.getAttribute("href");
      if (href?.startsWith("#")) {
        event.preventDefault();
        setTimeout(() => document.querySelector(href)?.scrollIntoView({ behavior: "smooth", block: "start" }), 30);
      }
    });
  });
}

function setWorkspaceTab(tab = activeWorkspaceTab) {
  activeWorkspaceTab = tab;
  state.activeWorkspaceTab = tab;
  document.body.dataset.activeTab = tab;
  document.querySelectorAll("[data-workspace-tab]").forEach((el) => {
    el.hidden = el.dataset.workspaceTab !== tab;
  });
  document.querySelectorAll("#workspaceTabs [data-tab-target]").forEach((button) => {
    button.classList.toggle("is-active", button.dataset.tabTarget === tab);
  });
  if (tab === "report" && typeof showDeckPage === "function") showDeckPage();
  if (tab === "review" && typeof renderBoardReview === "function") renderBoardReview();
  if (typeof renderAnalysisRoadmap === "function") renderAnalysisRoadmap();
  if (typeof updateActiveNav === "function") updateActiveNav();
}

function commandCenterDiagnosis() {
  const row = typeof targetRecord === "function" ? targetRecord() : null;
  const peers = typeof peerRecords === "function" ? peerRecords() : [];
  if (!row || typeof computeVqaDiagnosis !== "function") return null;
  return computeVqaDiagnosis(row, peers);
}

function updateClientCommandCenter() {
  const diagnosis = commandCenterDiagnosis();
  const quality = typeof criticalMetricCompleteness === "function" ? criticalMetricCompleteness() : null;
  const slides = typeof boardSlides === "function" ? boardSlides() : [];
  const title = document.getElementById("commandVerdictTitle");
  const text = document.getElementById("commandVerdictText");
  const dataQuality = document.getElementById("commandDataQuality");
  const weak = document.getElementById("commandWeakDimension");
  const status = document.getElementById("commandDeliveryStatus");
  if (!title || !text) return;
  if (!state?.confirmed || !diagnosis) {
    title.textContent = "确认样本后，先看本次价值质量总答案";
    text.textContent = "这里将汇总 VQA 诊断、数据完整性、最弱维度和建议动作，帮助董办判断是否可以进入报告编排。";
    if (dataQuality) dataQuality.textContent = "待生成";
    if (weak) weak.textContent = "待生成";
    if (status) status.textContent = "待复核";
    return;
  }
  const weakest = diagnosis.labels?.[diagnosis.weakest] || "关键质量维度";
  const action = diagnosis.dimensions?.[diagnosis.weakest]?.actionTitle || "形成专项修复动作";
  title.textContent = `${displayBankName(state.target)}VQA ${diagnosis.score}分：${diagnosis.signal}`;
  text.textContent = `当前最需要优先修复的是${weakest}。建议先围绕“${action}”形成 3-12 个月闭环，再进入董事会汇报稿编排。`;
  if (dataQuality) {
    dataQuality.textContent = quality == null ? "待复核" : `${(quality * 100).toFixed(1)}%`;
    dataQuality.className = quality == null ? "" : quality >= 0.8 ? "good" : quality >= 0.6 ? "warn" : "bad";
  }
  if (weak) weak.textContent = weakest;
  if (status) {
    const ready = slides.length >= 6 && (quality == null || quality >= 0.8);
    status.textContent = ready ? "可进入交付复核" : "需补充复核";
    status.className = ready ? "good" : "warn";
  }
  if (typeof renderGuidedPathPanel === "function") renderGuidedPathPanel();
}

function sparcDimensions() {
  const configured = analysisRules?.sparc_vqa_mapping;
  if (configured && typeof configured === "object") {
    const order = ["scale", "profit", "asset", "risk", "capability"];
    return order.map((id) => {
      const item = configured[id];
      if (!item) return null;
      return {
        id,
        code: item.code,
        label: item.label,
        question: item.question,
        vqaDimensions: item.vqaDimensions || [],
        metrics: (item.metrics || []).map((metric) => ({
          key: metric.key,
          label: metric.label || fieldName(metric.key),
          higher: metric.higher !== false,
          weight: metric.weight ?? 1
        }))
      };
    }).filter(Boolean);
  }
  return [
    {
      id: "scale",
      code: "S",
      label: "规模与结构",
      question: "业务体量和结构是否支撑同业位置？",
      metrics: [
        { key: "assetGrowth", label: "总资产增速", higher: true },
        { key: "loanAssetRatio", label: "贷款/资产", higher: true },
        { key: "depositLiabilityRatio", label: "存款/负债", higher: true }
      ]
    },
    {
      id: "profit",
      code: "P",
      label: "盈利能力",
      question: "赚钱能力和盈利质量是否可持续？",
      metrics: [
        { key: "roe", label: "ROE", higher: true },
        { key: "roa", label: "ROA", higher: true },
        { key: "nim", label: "净息差", higher: true },
        { key: "costIncomeRatio", label: "成本收入比", higher: false }
      ]
    },
    {
      id: "asset",
      code: "A",
      label: "资产质量",
      question: "资产质量是否干净，风险确认是否充分？",
      metrics: [
        { key: "npl", label: "不良率", higher: false },
        { key: "provisionCoverage", label: "拨备覆盖率", higher: true },
        { key: "specialMentionRatio", label: "关注类贷款占比", higher: false },
        { key: "overdueNplDeviation", label: "逾期偏离", higher: false }
      ]
    },
    {
      id: "risk",
      code: "R",
      label: "风险与资本",
      question: "资本安全垫和扩表纪律是否足够？",
      metrics: [
        { key: "cet1", label: "核心一级资本充足率", higher: true },
        { key: "cet1Buffer", label: "核心一级资本余量", higher: true },
        { key: "carBuffer", label: "资本充足率余量", higher: true },
        { key: "rwaDensity", label: "RWA 密度", higher: false }
      ]
    },
    {
      id: "capability",
      code: "C",
      label: "能力与效率",
      question: "运营机器效率和轻资本能力是否领先？",
      metrics: [
        { key: "costIncomeRatio", label: "成本收入比", higher: false },
        { key: "feeAssetRatio", label: "手续费资产比", higher: true },
        { key: "adminAssetRatio", label: "管理费用/资产", higher: false },
        { key: "cashProfitRatio", label: "经营现金流/净利润", higher: true }
      ]
    }
  ];
}

function sparcPeerSet() {
  const rows = [targetRecord(), ...peerRecords()].filter(Boolean);
  const keyed = new Map(rows.map((row) => [row.bank, row]));
  return [...keyed.values()];
}

function sparcMetricScore(row, key, higher = true, rows = sparcPeerSet()) {
  const value = row?.[key];
  const values = rows.map((item) => item?.[key]).filter((item) => typeof item === "number" && !Number.isNaN(item));
  if (typeof value !== "number" || !values.length) return null;
  const betterOrEqual = values.filter((item) => higher ? item <= value : item >= value).length;
  const percentile = values.length <= 1 ? 50 : ((betterOrEqual - 1) / (values.length - 1)) * 100;
  return Math.max(0, Math.min(100, percentile));
}

function sparcDimensionScores(row = targetRecord()) {
  const rows = sparcPeerSet();
  return sparcDimensions().map((dimension) => {
    const metricScores = dimension.metrics.map((metric) => ({
      ...metric,
      value: row?.[metric.key],
      score: sparcMetricScore(row, metric.key, metric.higher, rows),
      peerAvg: avg(rows.filter((item) => item.bank !== row?.bank), metric.key)
    }));
    const valid = metricScores.filter((metric) => metric.score != null);
    const weightSum = valid.reduce((sum, item) => sum + (item.weight || 1), 0) || valid.length;
    const score = valid.length ? valid.reduce((sum, item) => sum + item.score * (item.weight || 1), 0) / weightSum : null;
    const weakestMetric = metricScores.filter((metric) => metric.score != null).sort((a, b) => a.score - b.score)[0];
    return { ...dimension, score, metricScores, weakestMetric };
  });
}

function sparcScoreLabel(score) {
  if (score == null) return "待补";
  if (score >= 70) return "样本前段";
  if (score >= 45) return "接近中位";
  return "需重点复核";
}

function sparcSignalLevel(score) {
  if (score == null) return { level: "neutral", label: "待补", lamp: "待补" };
  if (score >= 70) return { level: "green", label: "样本前段", lamp: "绿灯" };
  if (score >= 45) return { level: "yellow", label: "接近中位", lamp: "黄灯" };
  return { level: "red", label: "需重点复核", lamp: "红灯" };
}

function sparcOverallScore(scores = sparcDimensionScores()) {
  const valid = scores.map((item) => item.score).filter((score) => score != null);
  return valid.length ? valid.reduce((sum, item) => sum + item, 0) / valid.length : null;
}

function updateSparcOverview() {
  const host = document.getElementById("sparcScoreboard");
  const radar = document.getElementById("sparcRadar");
  const note = document.getElementById("sparcRadarNote");
  const badge = document.getElementById("sparcOverallBadge");
  if (!host || !radar) return;
  const row = targetRecord();
  if (!state?.confirmed || !row) {
    host.innerHTML = sparcDimensions().map((item) => `
      <div class="sparc-card">
        <span>${item.code}</span>
        <b>${item.label}</b>
        <em>待生成</em>
        <p>${item.question}</p>
      </div>`).join("");
    radar.innerHTML = "<div class=\"sparc-empty\">SPARC</div>";
    if (note) note.textContent = "确认分析后展示五维相对位置。";
    if (badge) badge.textContent = "待生成";
    return;
  }
  const scores = sparcDimensionScores(row);
  const overall = sparcOverallScore(scores);
  if (badge) {
    badge.textContent = overall == null ? "待补数据" : `${overall.toFixed(0)}分｜${sparcScoreLabel(overall)}`;
    badge.className = `benchmark-v1-badge ${overall == null ? "" : overall >= 70 ? "good" : overall >= 45 ? "warn" : "bad"}`;
  }
  host.innerHTML = scores.map((dimension) => {
    const score = dimension.score == null ? "--" : dimension.score.toFixed(0);
    const metric = dimension.weakestMetric;
    const valueText = metric ? metricDisplayValue(metric.key, metric.value) : "待补";
    return `
      <div class="sparc-card ${dimension.score == null ? "" : dimension.score >= 70 ? "is-good" : dimension.score >= 45 ? "is-warn" : "is-bad"}">
        <span>${dimension.code}</span>
        <b>${dimension.label}</b>
        <em>${score}</em>
        <p>${metric ? `关键复核：${metric.label} ${valueText}` : dimension.question}</p>
      </div>`;
  }).join("");
  const center = 104;
  const maxRadius = 76;
  const points = scores.map((dimension, index) => {
    const angle = (-90 + index * 72) * Math.PI / 180;
    const radius = maxRadius * ((dimension.score || 0) / 100);
    return `${center + Math.cos(angle) * radius},${center + Math.sin(angle) * radius}`;
  }).join(" ");
  const axes = scores.map((dimension, index) => {
    const angle = (-90 + index * 72) * Math.PI / 180;
    const x = center + Math.cos(angle) * maxRadius;
    const y = center + Math.sin(angle) * maxRadius;
    const lx = center + Math.cos(angle) * (maxRadius + 22);
    const ly = center + Math.sin(angle) * (maxRadius + 22);
    return `<line x1="${center}" y1="${center}" x2="${x}" y2="${y}"></line><text x="${lx}" y="${ly}">${dimension.code}</text>`;
  }).join("");
  radar.innerHTML = `
    <svg viewBox="0 0 208 208" role="img" aria-label="SPARC 五维雷达">
      <polygon class="sparc-grid" points="104,28 176,81 149,166 59,166 32,81"></polygon>
      <polygon class="sparc-grid is-mid" points="104,58 148,90 132,142 76,142 60,90"></polygon>
      ${axes}
      <polygon class="sparc-shape" points="${points}"></polygon>
      ${scores.map((dimension, index) => {
        const angle = (-90 + index * 72) * Math.PI / 180;
        const radius = maxRadius * ((dimension.score || 0) / 100);
        return `<circle cx="${center + Math.cos(angle) * radius}" cy="${center + Math.sin(angle) * radius}" r="4"></circle>`;
      }).join("")}
    </svg>`;
  const weakest = [...scores].filter((item) => item.score != null).sort((a, b) => a.score - b.score)[0];
  if (note) note.textContent = weakest ? `${displayBankName(row.bank)}当前最需要补强的是${weakest.label}，建议进入专题页查看${weakest.weakestMetric?.label || "低分位指标"}。` : "当前可用指标不足，建议先进入数据页补充口径。";
}

function peerReasonTags(row, target = targetRecord()) {
  if (!row || !target) return ["参照样本"];
  if (row.bank === target.bank) return ["目标银行", "同业位置锚点"];
  const tags = [];
  if (row.type && target.type && row.type === target.type) tags.push(`同为${row.type}`);
  if (row.region && target.region && row.region === target.region) tags.push(`同属${row.region}`);
  if (typeof row.assets === "number" && typeof target.assets === "number" && target.assets > 0) {
    const gap = Math.abs(row.assets - target.assets) / target.assets;
    if (gap <= .3) tags.push("资产规模相近");
    else if (gap <= .6) tags.push("规模可参照");
  }
  if (typeof row.roe === "number" && typeof target.roe === "number" && Math.abs(row.roe - target.roe) <= .5) tags.push("ROE接近");
  if (typeof row.pb === "number" && typeof target.pb === "number" && Math.abs(row.pb - target.pb) <= .12) tags.push("估值锚相近");
  return tags.length ? tags.slice(0, 3) : ["手动纳入参照"];
}

function peerGroupDispersion() {
  const rows = peerRecords().filter((row) => typeof row.assets === "number");
  if (rows.length < 2) return null;
  const mean = rows.reduce((sum, row) => sum + row.assets, 0) / rows.length;
  const variance = rows.reduce((sum, row) => sum + Math.pow(row.assets - mean, 2), 0) / rows.length;
  return mean ? Math.sqrt(variance) / mean : null;
}

function peerProfileRows() {
  return [targetRecord(), ...peerRecords()].filter(Boolean).map((row) => ({
    bank: row.bank,
    type: row.type || bankMeta(row.bank)?.type || "未分类",
    region: row.region || bankMeta(row.bank)?.region || "未标注",
    assets: row.assets,
    roe: row.roe,
    nim: row.nim,
    npl: row.npl,
    car: row.carBuffer ?? row.cet1Buffer
  }));
}

function updatePeerProfileCards() {
  const host = document.getElementById("peerProfileGrid");
  if (!host) return;
  const rows = peerProfileRows();
  if (!state?.confirmed || !rows.length) {
    host.innerHTML = "<div class=\"empty-card\">确认分析后生成目标银行与对标组画像。</div>";
    return;
  }
  host.innerHTML = rows.map((row, index) => `
    <div class="peer-profile-card ${index === 0 ? "is-target" : ""}">
      <span>${index === 0 ? "目标银行" : "对标银行"}</span>
      <b>${displayBankName(row.bank)}</b>
      <p>${row.type}｜${row.region}</p>
      <div class="peer-reason-tags">${peerReasonTags(row).map((tag) => `<em>${tag}</em>`).join("")}</div>
      <div class="peer-profile-metrics">
        <em>总资产 ${metricDisplayValue("assets", row.assets)}</em>
        <em>ROE ${metricDisplayValue("roe", row.roe)}</em>
        <em>NIM ${metricDisplayValue("nim", row.nim)}</em>
        <em>不良 ${metricDisplayValue("npl", row.npl)}</em>
      </div>
    </div>`).join("");
}

function benchmarkWatchlistItems() {
  const row = targetRecord();
  if (!row) return [];
  const scores = sparcDimensionScores(row).filter((item) => item.score != null);
  const weakDims = scores.sort((a, b) => a.score - b.score).slice(0, 2).map((item) => ({
    level: item.score < 45 ? "red" : "yellow",
    title: `${item.label}低于参照中位`,
    text: item.weakestMetric ? `${item.weakestMetric.label}当前为 ${metricDisplayValue(item.weakestMetric.key, item.weakestMetric.value)}，建议作为专题复核起点。` : item.question
  }));
  const riskItems = calibrationRiskItems().filter((item) => item.level !== "green").slice(0, 2).map((item) => ({
    level: item.level === "red" ? "red" : "yellow",
    title: `${item.label}需保留口径脚注`,
    text: item.note
  }));
  return [...weakDims, ...riskItems].slice(0, 4);
}

function updateBenchmarkWatchlist() {
  const host = document.getElementById("benchmarkWatchlist");
  if (!host) return;
  const items = state?.confirmed ? benchmarkWatchlistItems() : [];
  host.innerHTML = items.length ? items.map((item) => `
    <div class="watchlist-card tone-${item.level}">
      <span>${item.level === "red" ? "重点" : "关注"}</span>
      <b>${item.title}</b>
      <p>${item.text}</p>
    </div>`).join("") : "<div class=\"empty-card\">确认分析后，系统将自动汇总低分位、口径风险和待补指标。</div>";
}

function calibrationRiskItems() {
  const riskDefs = [
    { key: "nim", label: "净息差", risk: "日均余额与期初期末均值可能不可比", high: true },
    { key: "nonInterestShare", label: "非息收入占比", risk: "部分银行可能含汇兑损益和公允价值变动", high: true },
    { key: "creditCostRatio", label: "信用成本", risk: "贷款减值与全部金融资产减值口径需区分", high: true },
    { key: "overdueNplDeviation", label: "逾期偏离", risk: "逾期90天以上披露不完整时不宜强结论", high: true },
    { key: "cet1", label: "核心一级资本充足率", risk: "监管资本口径可比性较强，但需确认报告期", high: false },
    { key: "pb", label: "市净率", risk: "估值指标需与经营质量联读，不能单独定义低估", high: false }
  ];
  return riskDefs.map((item) => {
    const risk = typeof metricCalibrationRisk === "function" ? metricCalibrationRisk(item.key) : null;
    return {
      ...item,
      rate: risk?.selectedRate,
      level: risk?.tone || "yellow",
      riskLevel: risk?.level || "L2",
      riskLabel: risk?.label || "L2 可比，需脚注",
      note: `${item.risk}；${risk?.note || "可进入主报告，但需要脚注说明。"}`,
      decisionUse: risk?.decisionUse || "主报告+脚注"
    };
  });
}

function updateCalibrationRiskPanel() {
  const host = document.getElementById("calibrationRiskGrid");
  if (!host) return;
  const items = state?.confirmed ? calibrationRiskItems() : [];
  host.innerHTML = items.length ? items.map((item) => `
    <div class="calibration-risk-card tone-${item.level}">
      <span>${item.riskLevel}｜${item.riskLabel}</span>
      <b>${item.label}</b>
      <em>${item.rate == null ? "覆盖暂无" : `覆盖 ${(item.rate * 100).toFixed(0)}%`}｜${item.decisionUse}</em>
      <p>${item.note}</p>
    </div>`).join("") : "<div class=\"empty-card\">确认分析后展示高风险指标可比性标签。</div>";
}

function presidentSummaryItems() {
  const row = targetRecord();
  if (!row || !state?.confirmed) return null;
  const scores = sparcDimensionScores(row);
  const overall = sparcOverallScore(scores);
  const weak = [...scores].filter((item) => item.score != null).sort((a, b) => a.score - b.score)[0];
  const strong = [...scores].filter((item) => item.score != null).sort((a, b) => b.score - a.score)[0];
  const watch = benchmarkWatchlistItems();
  const diagnosis = commandCenterDiagnosis();
  const findings = [
    `SPARC 综合位置为${overall == null ? "待补" : `${overall.toFixed(0)}分，${sparcScoreLabel(overall)}`}。`,
    strong && weak ? `${strong.label}相对靠前，${weak.label}应优先进入专题归因。` : "五维指标覆盖仍需补足后再形成强结论。",
    diagnosis ? `VQA 判断为${diagnosis.signal}，后续文字将按数据覆盖和口径风险调整语气。` : "VQA 诊断待生成。"
  ];
  return { scores, overall, weak, watch, findings };
}

function updatePresidentSummary() {
  const title = document.getElementById("presidentSummaryTitle");
  const lights = document.getElementById("sparcTrafficLights");
  const findings = document.getElementById("presidentFindings");
  const watch = document.getElementById("presidentWatchlist");
  const items = presidentSummaryItems();
  if (!title || !lights || !findings || !watch) return;
  if (!items) {
    title.textContent = "确认样本后，先用一页说明同业位置、关键发现和需关注指标";
    lights.innerHTML = sparcDimensions().map((item) => `<div class="traffic-light-card neutral"><span>${item.code}</span><b>${item.label}</b><em>待补</em></div>`).join("");
    findings.innerHTML = "<li>待生成。</li>";
    watch.innerHTML = "<span>待生成。</span>";
    return;
  }
  title.textContent = `${displayBankName(state.target)}行长版摘要：先看五维灯号，再看三条关键发现`;
  lights.innerHTML = items.scores.map((item) => {
    const signal = sparcSignalLevel(item.score);
    return `<div class="traffic-light-card ${signal.level}">
      <span>${item.code}</span><b>${item.label}</b><em>${signal.lamp}｜${signal.label}</em>
      <p>${item.weakestMetric ? item.weakestMetric.label : item.question}</p>
    </div>`;
  }).join("");
  findings.innerHTML = items.findings.map((item) => `<li>${item}</li>`).join("");
  watch.innerHTML = items.watch.length
    ? items.watch.map((item) => `<span class="tone-${item.level}">${item.title}</span>`).join("")
    : "<span>暂无重点提示。</span>";
}

function setDataSubtab(tab = activeDataSubtab) {
  activeDataSubtab = tab;
  document.querySelectorAll("[data-data-subtab]").forEach((button) => {
    button.classList.toggle("is-active", button.dataset.dataSubtab === tab);
  });
  document.querySelectorAll("[data-data-panel]").forEach((panel) => {
    panel.hidden = panel.dataset.dataPanel !== tab;
  });
}

function updateBenchmarkV1() {
  updateSparcOverview();
  updatePresidentSummary();
  updatePeerProfileCards();
  updateBenchmarkWatchlist();
  updateCalibrationRiskPanel();
}

function bindClientActionBar() {
  document.getElementById("clientRefreshAnalysis")?.addEventListener("click", () => {
    document.getElementById("refreshAnalysis")?.click();
    updateClientCommandCenter();
  });
  document.getElementById("clientSaveProject")?.addEventListener("click", () => {
    document.getElementById("saveProject")?.click();
  });
  const toggle = document.getElementById("clientExportToggle");
  const menu = document.getElementById("clientExportMenu");
  toggle?.addEventListener("click", () => {
    menu?.classList.toggle("is-open");
  });
  menu?.querySelectorAll("[data-export-target]").forEach((button) => {
    button.addEventListener("click", () => {
      menu.classList.remove("is-open");
      document.getElementById(button.dataset.exportTarget)?.click();
    });
  });
  document.addEventListener("click", (event) => {
    if (!event.target.closest(".export-menu")) menu?.classList.remove("is-open");
  });
}

function setOverviewDepth(expanded = document.body.classList.contains("overview-expanded")) {
  document.body.classList.toggle("overview-expanded", expanded);
  const toggle = document.getElementById("overviewDepthToggle");
  if (toggle) {
    toggle.setAttribute("aria-pressed", expanded ? "true" : "false");
    toggle.textContent = expanded ? "收起深层模块" : "展开深层模块";
  }
}

function bindOverviewDepthToggle() {
  const toggle = document.getElementById("overviewDepthToggle");
  if (!toggle || toggle.dataset.bound) return;
  toggle.dataset.bound = "1";
  toggle.addEventListener("click", () => setOverviewDepth(!document.body.classList.contains("overview-expanded")));
  setOverviewDepth(false);
}

function initProductWorkspace() {
  document.querySelectorAll("#workspaceTabs [data-tab-target]").forEach((button) => {
    button.addEventListener("click", () => setWorkspaceTab(button.dataset.tabTarget));
  });
  document.querySelectorAll("[data-data-subtab]").forEach((button) => {
    button.addEventListener("click", () => setDataSubtab(button.dataset.dataSubtab));
  });
  document.getElementById("jumpPresidentReport")?.addEventListener("click", () => {
    setWorkspaceTab("report");
    document.getElementById("formalReportShell")?.scrollIntoView({ behavior: "smooth", block: "start" });
  });
  bindClientActionBar();
  bindOverviewDepthToggle();
  bindLayoutPanelToggles();
  state.activeWorkspaceTab = "report";
  setWorkspaceTab("report");
  setDataSubtab("quality");
  updateClientCommandCenter();
  updateBenchmarkV1();
  const originalRenderAll = typeof renderAll === "function" ? renderAll : null;
  if (originalRenderAll && !originalRenderAll.__productWorkspaceWrapped) {
    renderAll = function renderAllWithProductWorkspace() {
      const result = originalRenderAll.apply(this, arguments);
      updateClientCommandCenter();
      updateBenchmarkV1();
      setWorkspaceTab(activeWorkspaceTab);
      renderAnalysisRoadmap();
      return result;
    };
    renderAll.__productWorkspaceWrapped = true;
  }
}
