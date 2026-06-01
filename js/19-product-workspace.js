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
    defaultCollapsed: true,
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
    const config = layoutPanelConfig[panelKey];
    const collapsed = Object.prototype.hasOwnProperty.call(saved, panelKey)
      ? Boolean(saved[panelKey])
      : Boolean(config.defaultCollapsed);
    setLayoutPanelCollapsed(panelKey, collapsed, false);
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
  document.querySelectorAll("#analysisRoadmap [data-nav-target], #step2Content [data-nav-target], .topic-next-actions [data-nav-target]").forEach((el) => {
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
  bindStep2PathNav();
}

function bindStep2PathNav() {
  document.querySelectorAll("[data-step2-jump]").forEach((link) => {
    if (link.dataset.step2Bound) return;
    link.dataset.step2Bound = "1";
    link.addEventListener("click", (event) => {
      event.preventDefault();
      document.querySelectorAll("[data-step2-jump]").forEach((item) => item.classList.toggle("is-active", item === link));
      const target = document.querySelector(link.getAttribute("href"));
      target?.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  });
}

function renderGlobalBar() {
  const bank = document.getElementById("globalBankContext");
  const signal = document.getElementById("globalVqaSignal");
  const row = typeof targetRecord === "function" ? targetRecord() : null;
  const diagnosis = typeof commandCenterDiagnosis === "function" ? commandCenterDiagnosis() : null;
  if (bank) {
    bank.textContent = state?.confirmed && row
      ? `${displayBankName(row.bank)} · ${state.year || ""}`
      : "待选择银行";
  }
  if (signal) {
    signal.textContent = state?.confirmed && diagnosis
      ? `VQA ${diagnosis.score} · ${diagnosis.signal || "待判断"}`
      : "确认口径后生成诊断";
  }
  document.querySelectorAll("[data-app-mode-target]").forEach((button) => {
    const isActive = button.dataset.appModeTarget === state.appMode;
    button.classList.toggle("is-active", isActive);
    button.setAttribute("aria-current", isActive ? "step" : "false");
  });
}

function bindGlobalBar() {
  document.querySelectorAll("[data-app-mode-target]").forEach((button) => {
    if (button.dataset.appModeBound) return;
    button.dataset.appModeBound = "1";
    button.addEventListener("click", () => {
      const mode = button.dataset.appModeTarget;
      if (!state.confirmed && mode !== "setup") return;
      setAppMode(mode);
    });
  });
  document.getElementById("globalExportToggle")?.addEventListener("click", () => {
    document.getElementById("clientExportToggle")?.click();
  });
  document.getElementById("openToolDrawer")?.addEventListener("click", () => openToolDrawer("data"));
  document.getElementById("closeToolDrawer")?.addEventListener("click", closeToolDrawer);
  document.querySelectorAll("[data-drawer-tab-target]").forEach((button) => {
    if (button.dataset.drawerBound) return;
    button.dataset.drawerBound = "1";
    button.addEventListener("click", () => setDrawerTab(button.dataset.drawerTabTarget));
  });
  document.getElementById("toolDrawerPanel")?.addEventListener("click", (event) => {
    const button = event.target.closest("[data-drawer-jump]");
    if (!button) return;
    const tab = button.dataset.drawerWorkspace;
    const target = button.dataset.drawerJump;
    if (tab) setWorkspaceTab(tab);
    setAppMode(tab === "report" ? "report" : "analysis");
    closeToolDrawer();
    setTimeout(() => document.getElementById(target)?.scrollIntoView({ behavior: "smooth", block: "start" }), 50);
  });
}

function drawerContent(tab = state.activeDrawerTab || "data") {
  const map = {
    data: {
      title: "数据工作台",
      text: "把指标、字段、口径和底稿放在复核层，不占用董事会默认视野。",
      items: [
        { label: "指标探索器", desc: "趋势、对标、分位和口径风险", target: "metricExplorerPanel", workspaceTab: "data" },
        { label: "字段覆盖矩阵", desc: "确认 257 字段可用性", target: "fieldCoverageMatrixPanel", workspaceTab: "data" },
        { label: "数据底稿导出", desc: "导出选定样本或全量底表", target: "dataCoverageSection", workspaceTab: "data" }
      ]
    },
    review: {
      title: "交付复核",
      text: "检查报告是否可上会：页序、语言、口径风险和导出状态放在这里统一处理。",
      items: [
        { label: "董办复核", desc: "结构、语言和数据边界", target: "boardReviewPanel", workspaceTab: "review" },
        { label: "导出页序 QA", desc: "HTML/PDF/PPTX 页序一致性", target: "exportSequenceQaPanel", workspaceTab: "review" },
        { label: "PRD 覆盖", desc: "对照需求池查看遗漏", target: "prdCoverageDashboard", workspaceTab: "review" }
      ]
    },
    project: {
      title: "项目管理",
      text: "对标组、版本、导出记录和项目状态属于执行层能力，默认收进工具箱。",
      items: [
        { label: "项目流水", desc: "保存、加载和版本留痕", target: "projectFlow", workspaceTab: "governance" },
        { label: "对标组治理", desc: "查看选择理由和复用口径", target: "projectFlow", workspaceTab: "governance" },
        { label: "报告结构编辑", desc: "章节开关和 CEAM 结构", target: "reportStructureEditor", workspaceTab: "report" }
      ]
    },
    ai: {
      title: "AI 辅助",
      text: "AI 先作为写稿和治理层能力，保留入口但不干扰主分析链路。",
      items: [
        { label: "AI 写稿治理", desc: "检查引用、语气和限制", target: "aiGovernancePanel", workspaceTab: "governance" },
        { label: "CEAM 结构", desc: "Challenge 到 Meaning 的故事线", target: "reportStructureEditor", workspaceTab: "report" },
        { label: "专题叙事", desc: "进入专题后按 SCR 改写", target: "topicWorkbenchSection", workspaceTab: "topics" }
      ]
    }
  };
  return map[tab] || map.data;
}

function setDrawerTab(tab = state.activeDrawerTab || "data") {
  state.activeDrawerTab = tab;
  document.querySelectorAll("[data-drawer-tab-target]").forEach((button) => {
    button.classList.toggle("is-active", button.dataset.drawerTabTarget === tab);
  });
  const content = drawerContent(tab);
  const host = document.getElementById("toolDrawerPanel");
  if (host) {
    host.innerHTML = `
      <div class="tool-drawer-card">
        <span>${content.title}</span>
        <p>${content.text}</p>
        <div class="tool-drawer-link-list">
          ${content.items.map((item) => `
            <button type="button" data-drawer-jump="${item.target}" data-drawer-workspace="${item.workspaceTab}">
              <b>${step2Esc(item.label)}</b>
              <em>${step2Esc(item.desc)}</em>
            </button>`).join("")}
        </div>
      </div>`;
  }
}

function openToolDrawer(tab = state.activeDrawerTab || "data") {
  state.drawerOpen = true;
  document.body.classList.add("drawer-open");
  const drawer = document.getElementById("toolDrawer");
  drawer?.setAttribute("aria-hidden", "false");
  document.getElementById("openToolDrawer")?.setAttribute("aria-expanded", "true");
  setDrawerTab(tab);
}

function closeToolDrawer() {
  state.drawerOpen = false;
  document.body.classList.remove("drawer-open");
  const drawer = document.getElementById("toolDrawer");
  drawer?.setAttribute("aria-hidden", "true");
  document.getElementById("openToolDrawer")?.setAttribute("aria-expanded", "false");
}

function appModeForWorkspaceTab(tab = activeWorkspaceTab) {
  if (tab === "report") return "report";
  if (state?.confirmed) return "analysis";
  return "setup";
}

function setAppMode(mode = state?.appMode || "setup", options = {}) {
  const allowed = ["setup", "analysis", "report"];
  const nextMode = allowed.includes(mode) ? mode : "setup";
  state.appMode = nextMode;
  document.body.dataset.appState = nextMode;
  document.querySelectorAll("[data-app-mode-target]").forEach((button) => {
    const isActive = button.dataset.appModeTarget === nextMode;
    button.classList.toggle("is-active", isActive);
    button.setAttribute("aria-current", isActive ? "step" : "false");
    if (!state.confirmed && button.dataset.appModeTarget !== "setup") {
      button.setAttribute("aria-disabled", "true");
    } else {
      button.removeAttribute("aria-disabled");
    }
  });
  if (!options.skipRouting) {
    if (nextMode === "report") setWorkspaceTab("report");
    if (nextMode === "analysis" && activeWorkspaceTab === "report") setWorkspaceTab("overview");
  }
  if (typeof renderGlobalBar === "function") renderGlobalBar();
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
  const nextMode = appModeForWorkspaceTab(tab);
  if (state.appMode !== nextMode) setAppMode(nextMode, { skipRouting: true });
  else if (typeof renderGlobalBar === "function") renderGlobalBar();
}

function step2Esc(value = "") {
  return typeof v5Esc === "function"
    ? v5Esc(value)
    : String(value ?? "").replace(/[&<>"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "\"": "&quot;", "'": "&#39;" }[char]));
}

function step2Metric(key, value) {
  return typeof metricDisplayValue === "function" ? metricDisplayValue(key, value) : (value ?? "暂无");
}

function step2ToneFromScore(score) {
  if (score == null) return "neutral";
  if (score >= 75) return "good";
  if (score >= 60) return "warn";
  return "bad";
}

function step2LanguageIntensity(row = typeof targetRecord === "function" ? targetRecord() : null, peers = typeof peerRecords === "function" ? peerRecords() : []) {
  const diagnosis = typeof commandCenterDiagnosis === "function" ? commandCenterDiagnosis() : null;
  const quality = typeof criticalMetricCompleteness === "function" ? criticalMetricCompleteness() : null;
  const radar = row && typeof v6AnomalyRadar === "function" ? v6AnomalyRadar(row, peers) : null;
  const crossCount = radar?.cross?.length || 0;
  const negativeCount = radar?.negative?.length || 0;
  const score = diagnosis?.score ?? null;
  const level = score != null && score < 60 || crossCount >= 2 || negativeCount >= 3 || quality != null && quality < 0.7
    ? "L3"
    : score != null && score >= 75 && crossCount === 0 && negativeCount <= 1 && (quality == null || quality >= 0.85)
      ? "L1"
      : "L2";
  const tone = level === "L3" ? "bad" : level === "L2" ? "warn" : "good";
  const label = level === "L3" ? "强判断" : level === "L2" ? "审慎判断" : "观察判断";
  const reason = level === "L3"
    ? "偏离或数据约束已足以进入董事会议题，但需保留口径边界。"
    : level === "L2"
      ? "信号存在但仍需用同业位置、变化趋势和口径风险交叉验证。"
      : "当前更适合表达为优势延续或常规跟踪，不宜过度放大。";
  return { level, tone, label, reason, crossCount, negativeCount, score, quality };
}

function step2StorylinePack(row = typeof targetRecord === "function" ? targetRecord() : null, peers = typeof peerRecords === "function" ? peerRecords() : []) {
  const diagnosis = typeof commandCenterDiagnosis === "function" ? commandCenterDiagnosis() : null;
  const weakest = diagnosis?.labels?.[diagnosis.weakest] || "价值质量约束";
  const target = row ? displayBankName(row.bank) : "目标银行";
  const intensity = step2LanguageIntensity(row, peers);
  const pbBrief = row && typeof pbPricingBrief === "function" ? pbPricingBrief(row, peers) : "PB估值需要在确认口径后生成。";
  return {
    intensity,
    evidenceBridge: `${target}的总判断先不急于写进报告，必须经过同业位置、异动偏离和估值锚三道证据复核；当前语气建议为${intensity.label}。`,
    topicsBridge: `如果三类证据都指向${weakest}，专题深钻就不再是指标堆叠，而是解释“差异为何形成、管理层能否改变”。`,
    actionsBridge: `${target}的行动建议需要跟随证据强度分层：先处理可验证短板，再把改善证据转成报告和资本市场沟通语言。`,
    peerTitle: `${target}的同业位置要先回答${weakest}是否是真约束`,
    changesTitle: `异动和偏离决定${target}的短板是阶段扰动还是结构问题`,
    pbTitle: pbBrief.replace(/。.*$/, "") || `${target}的PB需要与经营质量联读`,
    topicsTitle: `专题深钻应围绕${weakest}形成问题、证据、机制和行动`,
    actionsTitle: `${target}下一步要把${weakest}转成可追踪的 0-12 个月动作`
  };
}

function step2DiagnosisModel(row = typeof targetRecord === "function" ? targetRecord() : null, peers = typeof peerRecords === "function" ? peerRecords() : []) {
  if (!state?.confirmed || !row) {
    return {
      ready: false,
      title: "确认口径后生成价值质量总答案",
      lead: "Step 2 将先回答本次分析最重要的一句话，再用同业位置、异动偏离和PB估值锚证明结论。",
      decision: {
        answer: "先确认分析口径，再形成董事会可讨论的默认答案。",
        constraint: "关键约束待生成",
        pb: "PB答案待生成",
        action: "确认目标银行、对标组和报告版本后进入诊断。",
        tone: "neutral"
      },
      kpis: [
        { label: "VQA", value: "待生成", tone: "neutral" },
        { label: "最弱维度", value: "待生成", tone: "neutral" },
        { label: "PB答案", value: "待生成", tone: "neutral" },
        { label: "数据完整性", value: "待复核", tone: "neutral" }
      ]
    };
  }
  const diagnosis = typeof commandCenterDiagnosis === "function" ? commandCenterDiagnosis() : null;
  const scores = typeof sparcDimensionScores === "function" ? sparcDimensionScores(row) : [];
  const overall = typeof sparcOverallScore === "function" ? sparcOverallScore(scores) : null;
  const pb = typeof theoreticalPB === "function" ? theoreticalPB(row) : null;
  const quality = typeof criticalMetricCompleteness === "function" ? criticalMetricCompleteness() : null;
  const weakest = diagnosis?.labels?.[diagnosis.weakest] || [...scores].filter((item) => item.score != null).sort((a, b) => a.score - b.score)[0]?.label || "关键质量维度";
  const action = diagnosis?.dimensions?.[diagnosis.weakest]?.actionTitle || "形成专项修复动作";
  const pbGap = pb?.actual == null || pb?.pb == null ? null : pb.actual - pb.pb;
  const pbAnswer = typeof pbPricingBrief === "function"
    ? pbPricingBrief(row, peers)
    : pbGap == null
      ? "PB 数据不足，估值判断需先降级为待复核。"
      : pbGap < 0
        ? `实际 PB 低于理论锚 ${Math.abs(pbGap).toFixed(2)}x，市场折价更像在定价经营质量和风险透明度。`
        : `实际 PB 高于理论锚 ${Math.abs(pbGap).toFixed(2)}x，当前估值需要持续经营改善来支撑。`;
  const qualityText = quality == null ? "数据完整性待复核" : `关键指标完整性 ${(quality * 100).toFixed(0)}%`;
  const scoreTone = step2ToneFromScore(diagnosis?.score);
  return {
    ready: true,
    diagnosis,
    title: `${displayBankName(row.bank)}：本次董事会应先讨论${weakest}是否拖累价值质量`,
    lead: `${diagnosis?.signal || "价值质量待判断"}不是一个抽象评分，而是需要被拆成同业位置、异动偏离和估值答案三类证据。${qualityText}，强结论需随口径风险同步校准。`,
    decision: {
      answer: `${displayBankName(row.bank)}当前 VQA ${diagnosis?.score ?? "--"} 分，默认判断为${diagnosis?.signal || "价值质量待判断"}。`,
      constraint: `核心约束：${weakest}，下一步不应继续堆指标，而是先证明该约束是否真实影响经营质量。`,
      pb: pbAnswer,
      action: `建议动作：围绕“${action}”形成 0-3 / 3-6 / 6-12 个月闭环，再进入报告编排。`,
      tone: scoreTone
    },
    kpis: [
      { label: "VQA信号", value: diagnosis?.signal || "待判断", tone: scoreTone },
      { label: "SPARC位置", value: overall == null ? "待补" : `${overall.toFixed(0)}分`, tone: overall == null ? "neutral" : overall >= 70 ? "good" : overall >= 45 ? "warn" : "bad" },
      { label: "PB折价", value: pbGap == null ? "待补" : `${pbGap >= 0 ? "+" : ""}${pbGap.toFixed(2)}x`, tone: pbGap == null ? "neutral" : pbGap >= 0 ? "good" : "bad" },
      { label: "数据完整性", value: quality == null ? "待复核" : `${(quality * 100).toFixed(0)}%`, tone: quality == null ? "neutral" : quality >= 0.8 ? "good" : quality >= 0.6 ? "warn" : "bad" }
    ]
  };
}

function step2BoardQuestions(row = typeof targetRecord === "function" ? targetRecord() : null, peers = typeof peerRecords === "function" ? peerRecords() : []) {
  if (state?.confirmed && row && typeof boardroomDiscussionQuestions === "function") {
    return boardroomDiscussionQuestions(row, peers).slice(0, 3);
  }
  return [
    { dimension: "总答案", question: "目标银行当前价值质量差异主要来自哪里？", evidence: ["确认口径后生成证据"] },
    { dimension: "同业位置", question: "哪些能力支撑或拖累同业位置？", evidence: ["确认对标组后生成证据"] },
    { dimension: "行动优先级", question: "下一步应先修复经营质量、风险透明度还是估值沟通？", evidence: ["确认报告版本后生成建议"] }
  ];
}

function step2TopChangesModel(row = typeof targetRecord === "function" ? targetRecord() : null, peers = typeof peerRecords === "function" ? peerRecords() : []) {
  const empty = { positive: [], negative: [], deviations: [], cross: [] };
  if (!state?.confirmed || !row || typeof v6AnomalyRadar !== "function") return empty;
  return v6AnomalyRadar(row, peers);
}

function step2ChangeCardModel(item = {}, mode = "momentum") {
  const semantic = typeof v6AnomalySemanticTag === "function"
    ? v6AnomalySemanticTag(item)
    : { label: item.tag || "待判断", tone: "neutral", help: "保留跟踪。" };
  const actionBySignal = {
    "结构性信号": "进入专题解释",
    "同业偏离": "解释差距来源",
    "周期扰动": "观察是否延续",
    "待验证混合信号": "复核口径与样本"
  };
  const evidence = mode === "peer"
    ? `${step2Metric(item.key, item.current)} / 对标 ${step2Metric(item.key, item.peer)}`
    : [item.momentum?.direction, item.momentum?.acceleration].filter(Boolean).join(" / ") || "变化待判";
  return {
    label: item.label || fieldName(item.key),
    evidence,
    signal: semantic.label,
    tone: semantic.tone || "neutral",
    action: actionBySignal[semantic.label] || semantic.help || "保留跟踪",
    reason: typeof anomalyLikelyReason === "function" ? anomalyLikelyReason(item) : semantic.help || "需结合趋势和同业位置继续复核。",
    causeChart: typeof anomalyCauseChartHtml === "function" ? anomalyCauseChartHtml(item) : ""
  };
}

function step2TopicCards(row = typeof targetRecord === "function" ? targetRecord() : null) {
  const topics = typeof topicDefinitions === "function" ? topicDefinitions().slice(0, 6) : [];
  const intensity = step2LanguageIntensity(row);
  return topics.map((topic) => {
    const facts = state?.confirmed && typeof topicFactPackRows === "function" ? topicFactPackRows(topic.id) : [];
    const judgement = state?.confirmed && typeof topicJudgement === "function" ? topicJudgement(topic.id, facts) : null;
    const ceam = state?.confirmed && typeof ceamNarrativeBlock === "function" ? ceamNarrativeBlock(topic, facts, "board") : null;
    const evidence = judgement?.evidence?.[0];
    const primaryMetric = evidence ? `${evidence.指标名称} ${evidence.目标值}，${evidence.分位}` : "确认分析后补充关键证据";
    return {
      ...topic,
      signal: judgement?.signal || "待生成",
      level: judgement?.level || "neutral",
      languageLevel: intensity.level,
      languageLabel: intensity.label,
      languageReason: intensity.reason,
      headline: judgement?.headline || ceam?.Claim || topic.question || "确认口径后生成专题判断。",
      situation: ceam?.Challenge || topic.question || `判断${topic.title}是否影响价值质量。`,
      complication: ceam?.Claim || judgement?.headline || topic.mechanism || "确认分析后生成该专题的关键矛盾。",
      evidenceText: ceam?.Evidence || primaryMetric,
      mechanismText: ceam?.Attribution || topic.mechanism || "确认专题机制后补充归因解释。",
      action: ceam?.Meaning || topic.actions?.[0] || "进入专题深钻，补齐证据、机制和行动。"
    };
  });
}

function renderStep2Kpis(model) {
  return model.kpis.map((item) => `
    <div class="step2-kpi-card tone-${item.tone || "neutral"}">
      <span>${step2Esc(item.label)}</span>
      <b>${step2Esc(item.value)}</b>
    </div>`).join("");
}

function renderStep2DecisionBrief(model) {
  const decision = model.decision || {};
  return `
    <div class="step2-decision-main tone-${decision.tone || "neutral"}">
      <span>董事会默认答案</span>
      <b>${step2Esc(decision.answer || "确认口径后生成默认答案。")}</b>
    </div>
    <div class="step2-decision-points">
      <div><span>约束</span><p>${step2Esc(decision.constraint || "关键约束待生成。")}</p></div>
      <div><span>估值</span><p>${step2Esc(decision.pb || "PB答案待生成。")}</p></div>
      <div><span>动作</span><p>${step2Esc(decision.action || "确认口径后生成行动顺序。")}</p></div>
    </div>`;
}

function renderStep2Questions(items) {
  return items.map((item, index) => `
    <a class="step2-question-card" href="${item.link ? `#${item.link}` : "#step2PeerPosition"}">
      <span>${String(index + 1).padStart(2, "0")}｜${step2Esc(item.dimension || "董事会议题")}</span>
      <b>${step2Esc(item.question || "待生成讨论问题")}</b>
      <p>${step2Esc((item.evidence || []).filter(Boolean).slice(0, 3).join("；") || "确认口径后生成支撑证据。")}</p>
    </a>`).join("");
}

function step2PeerPositionReadout(item = {}, signal = {}) {
  const metric = item.weakestMetric;
  const metricName = metric?.label || item.question || "关键指标";
  const metricValue = metric ? step2Metric(metric.key, metric.value) : "待复核";
  const action = signal.level === "red"
    ? "解释压力"
    : signal.level === "yellow"
      ? "保留跟踪"
      : "支撑证据";
  return { metricName, metricValue, action };
}

function renderStep2PeerPosition(row) {
  const scores = typeof sparcDimensionScores === "function" ? sparcDimensionScores(row) : [];
  if (!state?.confirmed || !row || !scores.length) {
    return "<div class=\"empty-card\">确认样本后生成 SPARC 五灯号。</div>";
  }
  const heatmap = renderStep2PeerHeatmap(row);
  const sparcCards = scores.map((item) => {
    const signal = typeof sparcSignalLevel === "function" ? sparcSignalLevel(item.score) : { level: "neutral", label: "待补", lamp: "待补" };
    const readout = step2PeerPositionReadout(item, signal);
    return `
      <div class="step2-sparc-card tone-${signal.level}">
        <span>${step2Esc(item.code)}｜${step2Esc(signal.lamp)}</span>
        <b>${step2Esc(item.label)}</b>
        <em>${item.score == null ? "待补" : `${item.score.toFixed(0)}分`}｜${step2Esc(signal.label)}</em>
        <p class="step2-sparc-readout"><b>${step2Esc(readout.metricName)}</b><span>${step2Esc(readout.metricValue)}</span><i>${step2Esc(readout.action)}</i></p>
      </div>`;
  }).join("");
  return `${heatmap}${sparcCards}`;
}

function renderStep2PeerHeatmap(row) {
  const matrix = typeof peerHeatmapRows === "function" ? peerHeatmapRows(row, ["roa", "nim", "npl", "feeAssetRatio", "costIncomeRatio", "cet1Buffer", "pb"]) : null;
  if (!matrix?.rows?.length) return "";
  const head = matrix.keys.map((key) => `<span>${step2Esc(typeof fieldName === "function" ? fieldName(key) : key)}</span>`).join("");
  const rows = matrix.rows.map((bankRow) => `
    <div class="peer-heatmap-row${bankRow.isTarget ? " is-target" : ""}">
      <b>${step2Esc(displayBankName(bankRow.bank))}</b>
      ${bankRow.cells.map((cell) => `
        <span class="peer-heatmap-cell tone-${step2Esc(cell.tone)}">
          <strong>${step2Esc(cell.value)}</strong>
          <em>${cell.percentile == null ? "P--" : `P${Math.round(cell.percentile)}`}</em>
        </span>`).join("")}
    </div>`).join("");
  return `
    <div class="peer-heatmap" aria-label="对标矩阵热力图">
      <div class="peer-heatmap-head"><b>银行</b>${head}</div>
      ${rows}
    </div>`;
}

function renderStep2TopChanges(model) {
  const renderCards = (items, mode = "momentum") => items.length ? items.slice(0, 3).map((item) => {
        const card = step2ChangeCardModel(item, mode);
        return `
          <div class="step2-change-card tone-${step2Esc(card.tone)}">
            <div><span>${step2Esc(card.label)}</span><em class="change-signal-pill">${step2Esc(card.signal)}</em></div>
            <div class="step2-change-meta"><b>${step2Esc(card.evidence)}</b><p class="step2-change-action">${step2Esc(card.action)}</p></div>
            ${card.causeChart}
            <p class="step2-change-reason">${step2Esc(card.reason)}</p>
          </div>`;
      }).join("") : "<p class=\"step2-change-empty\">暂无显著项目。</p>";
  const renderLane = (title, subtitle, groups) => `
    <div class="step2-change-lane" data-change-count="${groups.reduce((sum, group) => sum + group.items.length, 0)}">
      <div class="step2-change-lane-head">
        <b>${step2Esc(title)}</b>
        <span>${step2Esc(subtitle)}</span>
      </div>
      <div class="step2-change-lane-body">
        ${groups.map((group) => `
          <div class="step2-change-list is-compact" data-change-count="${group.items.length}">
            <div class="step2-change-head">
              <b>${step2Esc(group.title)}</b>
              <span>${group.items.length ? `Top ${Math.min(group.items.length, 4)}` : "暂无"}</span>
            </div>
            <div class="step2-change-strip">${renderCards(group.items, group.mode)}</div>
          </div>`).join("")}
      </div>
    </div>`;
  return `<div class="step2-change-stack step2-change-compact-grid">
    ${renderLane("扰动信号", "先判断本期变化是否只是阶段扰动", [
      { title: "正向变化", items: model.positive, mode: "momentum" },
      { title: "负向变化", items: model.negative, mode: "momentum" }
    ])}
    ${renderLane("偏离信号", "再判断相对对标组的差距是否具备结构性", [
      { title: "同业偏离", items: model.deviations, mode: "peer" },
      { title: "共振指标", items: model.cross, mode: "peer" }
    ])}
  </div>`;
}

function renderStep2PbAnswer(row, peers) {
  if (!state?.confirmed || !row) return "<div class=\"empty-card\">确认样本后生成 PB 估值答案。</div>";
  const pb = typeof theoreticalPB === "function" ? theoreticalPB(row) : null;
  const drivers = typeof pbDriverRanking === "function" ? pbDriverRanking(row, peers).slice(0, 3) : [];
  const gap = pb?.actual == null || pb?.pb == null ? null : pb.actual - pb.pb;
  const pricing = typeof pbPricingFactorReadout === "function" ? pbPricingFactorReadout(row, peers) : null;
  const pricingSource = pricing && typeof pbPricingModel !== "undefined"
    ? pbPricingModel.conclusions.slice(0, 2).map((item) => item.replace(/。$/, "")).join("；")
    : "";
  return `
    <div class="step2-pb-head">
      <span>${step2Esc(pricing?.typeNote?.headline || pb?.label || "PB答案待补")}</span>
      <b>${step2Metric("pb", row.pb)} / 类型中位 ${pricing?.anchor ? step2Metric("pb", pricing.anchor.median) : "待补"} / DDM ${step2Metric("theoreticalPb", pb?.pb)}</b>
      <p>${step2Esc(typeof pbPricingBrief === "function" ? pbPricingBrief(row, peers) : gap == null ? "PB或ROE数据不足，暂不形成强判断。" : `实际PB较DDM理论锚${gap >= 0 ? "高" : "低"} ${Math.abs(gap).toFixed(2)}x，需要用经营质量和风险透明度解释。`)}</p>
    </div>
    ${pricing ? `
      <div class="step2-pb-pricing-grid">
        ${pricing.lines.map((line) => `<div><b>模型读数</b><span>${step2Esc(line)}</span></div>`).join("")}
      </div>
      <div class="step2-pb-factor-strip">
        ${(pricing.typeNote?.topFactors || []).slice(0, 4).map((factor) => `<span>${step2Esc(factor)}</span>`).join("")}
      </div>
      <p class="step2-pb-source">${step2Esc(pbPricingModel.source)}；核心结论：${step2Esc(pricingSource)}。</p>
    ` : ""}
    <div class="step2-driver-list">
      ${drivers.length ? drivers.map((item) => `<div><b>${step2Esc(item.label)}</b><span>${step2Esc(item.readout)}</span></div>`).join("") : "<div><b>驱动因素待补</b><span>样本或回归数据不足，建议先复核PB、ROE、不良率和成本收入比。</span></div>"}
    </div>`;
}

function renderStep2Topics(cards) {
  return cards.length ? cards.map((card) => `
    <article class="step2-topic-card tone-${card.level}">
      <span>${step2Esc(card.signal)}｜${step2Esc(card.languageLevel || "L2")} ${step2Esc(card.languageLabel || "审慎判断")}</span>
      <h4>${step2Esc(card.headline)}</h4>
      <em>${step2Esc(card.title)}</em>
      <div class="step2-scr-list">
        <div><b>S</b><p>${step2Esc(card.situation)}</p></div>
        <div><b>C</b><p>${step2Esc(card.complication)}</p></div>
        <div><b>E</b><p>${step2Esc(card.evidenceText)}</p></div>
        <div><b>M</b><p>${step2Esc(card.mechanismText)}</p></div>
        <div><b>R</b><p>${step2Esc(card.action)}</p></div>
      </div>
      <a href="#topicWorkbenchSection" data-nav-target="topics">进入专题深钻</a>
    </article>`).join("") : "<div class=\"empty-card\">专题定义待加载。</div>";
}

function renderStep2ActionPath(row, peers) {
  const diagnosis = typeof commandCenterDiagnosis === "function" ? commandCenterDiagnosis() : null;
  const drivers = row && typeof pbDriverRanking === "function" ? pbDriverRanking(row, peers).slice(0, 2) : [];
  const weakest = diagnosis?.labels?.[diagnosis.weakest] || "关键质量维度";
  const action = diagnosis?.dimensions?.[diagnosis.weakest]?.actionTitle || "补齐诊断证据";
  const stages = [
    { period: "0-3个月", title: `先复核${weakest}`, text: action },
    { period: "3-6个月", title: "形成经营修复证据", text: drivers[0]?.readout || "跟踪ROE、NIM、风险确认和资本消耗的连续改善。" },
    { period: "6-12个月", title: "验证估值叙事", text: drivers[1]?.readout || "把同业位置改善、风险透明度和资本纪律转成资本市场沟通材料。" }
  ];
  return stages.map((item) => `
    <div class="step2-action-card">
      <span>${step2Esc(item.period)}</span>
      <b>${step2Esc(item.title)}</b>
      <p>${step2Esc(item.text)}</p>
    </div>`).join("");
}

function renderStep2Diagnosis() {
  const row = typeof targetRecord === "function" ? targetRecord() : null;
  const peers = typeof peerRecords === "function" ? peerRecords() : [];
  const model = step2DiagnosisModel(row, peers);
  const title = document.getElementById("step2DiagnosisTitle");
  const lead = document.getElementById("step2DiagnosisLead");
  const decision = document.getElementById("step2DecisionBrief");
  const kpis = document.getElementById("step2KpiStrip");
  const questions = document.getElementById("step2BoardQuestions");
  const peer = document.getElementById("step2PeerPositionBody");
  const changes = document.getElementById("step2TopChangesBody");
  const pb = document.getElementById("step2PbAnswerBody");
  const topics = document.getElementById("step2TopicGrid");
  const actions = document.getElementById("step2ActionPathGrid");
  const storyline = step2StorylinePack(row, peers);
  if (title) title.textContent = model.title;
  if (lead) lead.textContent = model.lead;
  [
    ["step2BridgeEvidence", storyline.evidenceBridge],
    ["step2BridgeTopics", storyline.topicsBridge],
    ["step2BridgeActions", storyline.actionsBridge],
    ["step2PeerTitle", storyline.peerTitle],
    ["step2ChangesTitle", storyline.changesTitle],
    ["step2PbTitle", storyline.pbTitle],
    ["step2TopicsTitle", storyline.topicsTitle],
    ["step2ActionsTitle", storyline.actionsTitle]
  ].forEach(([id, text]) => {
    const el = document.getElementById(id);
    if (el) el.textContent = text;
  });
  if (decision) decision.innerHTML = renderStep2DecisionBrief(model);
  if (kpis) kpis.innerHTML = renderStep2Kpis(model);
  if (questions) questions.innerHTML = renderStep2Questions(step2BoardQuestions(row, peers));
  if (peer) peer.innerHTML = renderStep2PeerPosition(row);
  if (changes) changes.innerHTML = renderStep2TopChanges(step2TopChangesModel(row, peers));
  if (pb) pb.innerHTML = renderStep2PbAnswer(row, peers);
  if (topics) topics.innerHTML = renderStep2Topics(step2TopicCards(row));
  if (actions) actions.innerHTML = renderStep2ActionPath(row, peers);
  renderMetricContextRail();
  bindAnalysisRoadmap();
}

function metricContextFocus(row, peers) {
  if (!row) return null;
  const dimensions = typeof sparcDimensionScores === "function" ? sparcDimensionScores(row) : [];
  const weakest = dimensions
    .filter((item) => item.score != null && item.weakestMetric)
    .sort((a, b) => a.score - b.score)[0];
  if (weakest?.weakestMetric) {
    return {
      ...weakest.weakestMetric,
      dimensionLabel: weakest.label,
      dimensionScore: weakest.score
    };
  }
  const fallbackKey = row.nim != null ? "nim" : row.roe != null ? "roe" : row.pb != null ? "pb" : "assets";
  return {
    key: fallbackKey,
    label: typeof fieldName === "function" ? fieldName(fallbackKey) : fallbackKey,
    higher: fallbackKey !== "npl" && fallbackKey !== "costIncomeRatio",
    value: row[fallbackKey],
    peerAvg: typeof avg === "function" ? avg(peers, fallbackKey) : null,
    dimensionLabel: "关键指标",
    dimensionScore: null
  };
}

function renderMetricContextRail() {
  const host = document.getElementById("metricContextRail");
  if (!host) return;
  const row = typeof targetRecord === "function" ? targetRecord() : null;
  const peers = typeof peerRecords === "function" ? peerRecords() : [];
  const diagnosis = typeof commandCenterDiagnosis === "function" ? commandCenterDiagnosis() : null;
  if (!state?.confirmed || !row) {
    host.innerHTML = "<div class=\"metric-context-empty\">确认分析后展示关键指标上下文。</div>";
    return;
  }
  const focus = metricContextFocus(row, peers);
  const key = focus?.key || "nim";
  const value = row[key];
  const peerAvg = focus?.peerAvg ?? (typeof avg === "function" ? avg(peers, key) : null);
  const rank = typeof rankPercentile === "function" ? rankPercentile(value, [row, ...peers], key, focus?.higher !== false) : null;
  const gap = typeof value === "number" && typeof peerAvg === "number" ? value - peerAvg : null;
  const gapText = gap == null
    ? "同业差距待补数"
    : `${gap >= 0 ? "高于" : "低于"}对标均值 ${step2Metric(key, Math.abs(gap))}`;
  const focusLabel = focus?.label || (typeof fieldName === "function" ? fieldName(key) : key);
  const scoreText = focus?.dimensionScore == null ? "待生成" : `${focus.dimensionScore.toFixed(0)}分`;
  const rankText = rank == null ? "分位待补" : String(rank);
  const targetName = displayBankName(row.bank || state.target);
  const snapshot = typeof metricTimeSeriesSnapshot === "function" ? metricTimeSeriesSnapshot(key) : null;
  host.innerHTML = `
    <div class="metric-context-head">
      <span>右侧指标上下文</span>
      <b>${step2Esc(focusLabel)}</b>
      <em>${step2Esc(targetName)}｜${step2Metric(key, value)}｜${step2Esc(rankText)}</em>
    </div>
    <div class="metric-context-card">
      <span>对标差距</span>
      <b>${step2Esc(gapText)}</b>
      <p>对标组均值为 ${step2Metric(key, peerAvg)}。这条差距用于解释 Step 2 的同业位置、异动偏离和专题入口，避免结论只停留在单点指标。</p>
    </div>
    <div class="metric-context-card">
      <span>诊断语气</span>
      <b>${step2Esc(focus?.dimensionLabel || "关键维度")}｜${step2Esc(scoreText)}</b>
      <p>${diagnosis ? `当前 VQA 为 ${diagnosis.score} 分，${diagnosis.signal}；右侧栏优先提示最弱维度，方便边看证据边回到管理动作。` : "VQA 诊断待生成，当前仅保留指标上下文。"}</p>
    </div>
    <div class="metric-context-card metric-trend-mini">
      <span>多年趋势</span>
      ${renderMetricTrendLine("目标银行", snapshot?.targetSeries || [], key)}
      ${renderMetricTrendLine("对标均值", snapshot?.peerAverageSeries || [], key)}
      ${renderMetricTrendLine("类型均值", snapshot?.typeAverageSeries || [], key)}
    </div>
    <div class="metric-context-card">
      <span>下一步</span>
      <b>优先进入相关专题复核</b>
      <p>若该指标同时出现在 PB 归因、零售风险或存贷深钻中，应在正式报告里把原因、影响和行动串成一条故事线。</p>
    </div>`;
}

function renderMetricTrendLine(label, series = [], metricKey = "nim") {
  const points = series.slice(-6);
  const values = points.map((item) => item.value).filter((value) => typeof value === "number" && !Number.isNaN(value));
  const first = values[0];
  const last = values[values.length - 1];
  const direction = values.length < 2 ? "趋势待补" : last > first ? "上行" : last < first ? "下行" : "持平";
  const tone = direction === "上行" ? "good" : direction === "下行" ? "bad" : "neutral";
  return `
    <div class="metric-trend-line tone-${tone}">
      <b>${step2Esc(label)}</b>
      <em>${step2Esc(direction)}</em>
      <p>${points.map((item) => `${item.year}:${step2Metric(metricKey, item.value)}`).join(" / ") || "暂无时间序列"}</p>
    </div>`;
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
    if (typeof renderStep2Diagnosis === "function") renderStep2Diagnosis();
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
  if (typeof renderStep2Diagnosis === "function") renderStep2Diagnosis();
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
  bindGlobalBar();
  setAppMode(state.confirmed ? "analysis" : "setup", { skipRouting: true });
  state.activeWorkspaceTab = "overview";
  setWorkspaceTab(state.activeWorkspaceTab);
  setDataSubtab("quality");
  updateClientCommandCenter();
  renderStep2Diagnosis();
  updateBenchmarkV1();
  const originalRenderAll = typeof renderAll === "function" ? renderAll : null;
  if (originalRenderAll && !originalRenderAll.__productWorkspaceWrapped) {
    renderAll = function renderAllWithProductWorkspace() {
      const result = originalRenderAll.apply(this, arguments);
      updateClientCommandCenter();
      renderStep2Diagnosis();
      updateBenchmarkV1();
      setWorkspaceTab(activeWorkspaceTab);
      renderAnalysisRoadmap();
      return result;
    };
    renderAll.__productWorkspaceWrapped = true;
  }
}
