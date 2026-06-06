/* Bank VQA module: 24-prd-v3-workbench.js — PRD v3 narrative workbench */

var v3ActiveChapter = "panorama";
var v3ReportPage = 0;

function v3NarrativeChapters() {
  return [
    {
      id: "panorama",
      label: "经营全景",
      chapter: "核心结论摘要",
      question: "董事会需要先判断：当前价值质量分数背后，最弱的经营约束是什么？",
      metrics: ["roa", "nim", "npl", "cet1Buffer"],
      answer: "先用 VQA 总分、Harvey Ball 矩阵和最弱维度建立全局判断，再进入因果链拆解。"
    },
    {
      id: "macro",
      label: "宏观传导与竞争格局",
      chapter: "第一章",
      question: "同样的 LPR 下行和竞争下沉，目标银行的资产收益率是否传导更快、收入缓冲是否更薄？",
      metrics: ["earningAssetYield", "netInterestRevenueShare", "nonInterestShare", "coreRevenueGrowth"],
      answer: "本章先解释外部冲击如何进入报表，区分行业共同压力和目标银行自身结构脆弱性。"
    },
    {
      id: "profit",
      label: "盈利结构与路径分化",
      chapter: "第二章",
      question: "我行的盈利质量在同业里排第几？为什么？",
      metrics: ["coreRevenueGrowth", "feeAssetRatio", "roa", "ppopGrowth"],
      answer: "核心营收、手续费资产比和 ROA 因子桥共同判断盈利质量。"
    },
    {
      id: "nim",
      label: "息差防守与负债纪律",
      chapter: "第三章",
      question: "净息差还能守住多久？守不住的话靠什么补？",
      metrics: ["nim", "nimGapBp", "earningAssetYield", "interestLiabilityCost"],
      answer: "息差对冲缺口、定期化和真实存贷利差共同定位负债纪律。"
    },
    {
      id: "risk",
      label: "风险确认与拨备质量",
      chapter: "第四章",
      question: "风险数据是不是已经反映了真实经营压力？",
      metrics: ["npl", "personalLoanNpl", "overdueNplDeviation", "provisionCoverage"],
      answer: "零售剪刀差、利润质量三角和风险确认时差共同验证利润质量。"
    },
    {
      id: "capital",
      label: "资本效率与轻装转型",
      chapter: "第五章",
      question: "我行的资本回报率是否值得继续追加投入？",
      metrics: ["cet1Buffer", "rwaDensity", "rwaProfitGrowthGap", "costIncomeRatio"],
      answer: "资本余量、RWA 密度和成本效率共同判断增长纪律。"
    },
    {
      id: "sequence",
      label: "转型顺序与行动路径",
      chapter: "第六章",
      question: "当前应该先修经营底盘、写入风险资本纪律，还是已经可以交付转型投入？",
      metrics: ["nimGapBp", "coreRevenueGrowth", "feeAssetRatio", "overdueNplDeviation", "cet1Buffer"],
      answer: "三步转型检查器把建议从静态话术改为行动顺序。"
    },
    {
      id: "appendix",
      label: "方法论与数据附录",
      chapter: "附录",
      question: "本轮结论的样本边界、指标口径和数据完整性是否足够支撑董事会汇报？",
      metrics: ["roa", "nim", "npl", "pb"],
      answer: "附录统一披露 VQA 方法论、指标口径、数据覆盖和规则版本。"
    }
  ];
}

function v3SignalForChapter(chapter, row = targetRecord(), peers = peerRecords()) {
  if (!row || typeof relativeScore !== "function") return { score: null, level: "neutral", label: "待生成" };
  const scores = chapter.metrics.map((key) => relativeScore(row[key], avg(peers, key), metricDirection(key))).filter((item) => item != null);
  const score = scores.length ? Math.round(scores.reduce((sum, item) => sum + item, 0) / scores.length) : null;
  if (score == null) return { score: null, level: "neutral", label: "待补数据" };
  if (score >= 64) return { score, level: "green", label: "绿灯" };
  if (score >= 48) return { score, level: "yellow", label: "黄灯" };
  return { score, level: "red", label: "红灯" };
}

function v3Previous(row, key) {
  if (!row) return null;
  return records.find((item) => item.bank === row.bank && item.year === row.year - 1)?.[key] ?? null;
}

function v3CounterintuitiveAlerts(row = targetRecord(), peers = peerRecords()) {
  if (!row) return [];
  const alerts = [];
  const peerRoa = avg(peers, "roa");
  const ppop = row.ppopGrowth;
  const profit = row.netProfitGrowth;
  const pcrChange = row.provisionCoverageChange ?? (row.provisionCoverage != null && v3Previous(row, "provisionCoverage") != null ? row.provisionCoverage - v3Previous(row, "provisionCoverage") : null);
  if (row.roa != null && peerRoa != null && row.roa >= peerRoa && ppop != null && profit != null && profit > ppop && pcrChange != null && pcrChange < 0) {
    alerts.push({
      type: "counterintuitive_alert",
      title: "ROA 看似占优，但利润质量需打折验证",
      text: `ROA ${fmt(row.roa)} 高于对标均值 ${fmt(peerRoa)}，但净利润增速 ${fmt(profit)} 快于 PPOP 增速 ${fmt(ppop)}，且拨备覆盖率变化 ${fmt(pcrChange)}。表观回报改善可能伴随安全垫走薄。`
    });
  }
  if (row.nim != null && avg(peers, "nim") != null && row.nim >= avg(peers, "nim") && row.nimGapBp != null && row.nimGapBp > 0) {
    alerts.push({
      type: "counterintuitive_alert",
      title: "NIM 截面不弱，但对冲缺口提示后续压力",
      text: `净息差 ${fmt(row.nim)} 不弱于对标，但息差对冲缺口 ${fmtBp(row.nimGapBp)}，说明资产端让价仍可能快于负债端降本。`
    });
  }
  return alerts;
}

function v3RetailRiskScissors(row = targetRecord(), peers = peerRecords()) {
  if (!row) return null;
  const spread = row.personalLoanNpl != null && row.npl != null ? row.personalLoanNpl - row.npl : null;
  const peerSpread = avg(peers, "personalLoanNpl") != null && avg(peers, "npl") != null ? avg(peers, "personalLoanNpl") - avg(peers, "npl") : null;
  const level = spread == null ? "neutral" : spread > (peerSpread ?? 0) && spread > 0 ? "red" : spread > 0 ? "yellow" : "green";
  return {
    spread,
    peerSpread,
    level,
    label: level === "red" ? "零售风险先行暴露" : level === "yellow" ? "零售风险需跟踪" : "零售压力相对可控"
  };
}

function v3ProfitQualityTriangle(row = targetRecord(), peers = peerRecords()) {
  if (!row) return null;
  const pcrChange = row.provisionCoverageChange ?? (row.provisionCoverage != null && v3Previous(row, "provisionCoverage") != null ? row.provisionCoverage - v3Previous(row, "provisionCoverage") : null);
  const gap = row.netProfitGrowth != null && row.ppopGrowth != null ? row.netProfitGrowth - row.ppopGrowth : null;
  const level = gap != null && pcrChange != null && gap > 0 && pcrChange < 0 ? "red" : gap != null && gap > 0 ? "yellow" : "green";
  return {
    x: row.ppopGrowth,
    y: row.netProfitGrowth,
    size: row.provisionCoverage,
    pcrChange,
    gap,
    peers: {
      x: avg(peers, "ppopGrowth"),
      y: avg(peers, "netProfitGrowth"),
      size: avg(peers, "provisionCoverage")
    },
    level,
    label: level === "red" ? "利润改善依赖拨备释放的嫌疑较高" : level === "yellow" ? "净利润快于 PPOP，需继续验证拨备来源" : "前端利润与净利润较一致"
  };
}

function v3TransformationSequence(row = targetRecord()) {
  if (!row) return null;
  const prevCore = v3Previous(row, "coreRevenueGrowth");
  const prevFee = v3Previous(row, "feeAssetRatio");
  const prevCet1 = v3Previous(row, "cet1Buffer");
  const checks = [
    { step: 1, label: "息差对冲缺口收敛", pass: row.nimGapBp != null && row.nimGapBp <= 2, value: fmtBp(row.nimGapBp) },
    { step: 1, label: "核心营收恢复正增长", pass: row.coreRevenueGrowth != null && row.coreRevenueGrowth >= 0, value: fmt(row.coreRevenueGrowth) },
    { step: 1, label: "手续费资产比停止下滑", pass: row.feeAssetRatio != null && (prevFee == null || row.feeAssetRatio >= prevFee), value: fmt(row.feeAssetRatio, 3) },
    { step: 2, label: "偏离度降至 1.0 以下", pass: row.overdueNplDeviation != null && row.overdueNplDeviation <= 1, value: fmt(row.overdueNplDeviation, 2, "") },
    { step: 2, label: "PPOP 增速高于净利润增速", pass: row.ppopGrowth != null && row.netProfitGrowth != null && row.ppopGrowth >= row.netProfitGrowth, value: `${fmt(row.ppopGrowth)} / ${fmt(row.netProfitGrowth)}` },
    { step: 2, label: "CET1 余量停止下降", pass: row.cet1Buffer != null && (prevCet1 == null || row.cet1Buffer >= prevCet1), value: fmtBp(row.cet1Buffer) }
  ];
  const step1Pass = checks.filter((item) => item.step === 1 && item.pass).length;
  const step2Pass = checks.filter((item) => item.step === 2 && item.pass).length;
  let stage = "交付转型";
  let advice = "底盘与纪律多数通过，可启动组织重构和数字化投入，但仍需以报表改善作为检验标准。";
  if (step1Pass < 2) {
    stage = "修复底盘";
    advice = "当前阶段应优先修复经营底盘，不宜急于扩表或推进大规模数字化投入。";
  } else if (step2Pass < 2) {
    stage = "写入纪律";
    advice = "应将风险确认前移和资本纪律嵌入增长决策作为当前优先事项。";
  }
  return { checks, step1Pass, step2Pass, stage, advice };
}

function v3MacroTransmission(row = targetRecord(), peers = peerRecords()) {
  if (!row) return null;
  const yieldChange = row.earningAssetYieldChange ?? yoyValue(row.bank, "earningAssetYield");
  const peerYieldChange = avg(peers.map((peer) => ({ ...peer, earningAssetYieldChange: yoyValue(peer.bank, "earningAssetYield") })), "earningAssetYieldChange");
  const buffer = row.nonInterestShare;
  const peerBuffer = avg(peers, "nonInterestShare");
  return {
    yieldChange,
    peerYieldChange,
    buffer,
    peerBuffer,
    label: yieldChange != null && peerYieldChange != null && yieldChange < peerYieldChange ? "资产收益率下行快于对标" : "资产收益率传导接近对标",
    bufferLabel: buffer != null && peerBuffer != null && buffer < peerBuffer ? "收入结构缓冲弱于对标" : "收入结构缓冲不弱于对标"
  };
}

function v3WorkbenchShell() {
  if (document.getElementById("v3NarrativeWorkbench")) return;
  const summary = document.getElementById("selectionSummary");
  const sticky = document.createElement("div");
  sticky.className = "v3-sticky-summary analysis-content";
  sticky.id = "v3StickySummary";
  sticky.dataset.workspaceTab = "report";
  sticky.dataset.portalPage = "report";
  sticky.innerHTML = `
    <div class="v3-summary-main" id="v3SummaryMain"></div>
    <div class="v3-summary-actions">
      <button class="btn secondary" id="v3EditSetup" type="button">编辑口径</button>
      <button class="btn" id="v3OpenReportPreview" type="button">报告预览</button>
    </div>`;
  summary?.insertAdjacentElement("afterend", sticky);

  const anchor = document.getElementById("ibEvidencePanel") || summary;
  const workbench = document.createElement("section");
  workbench.className = "v3-workbench analysis-content";
  workbench.id = "v3NarrativeWorkbench";
  workbench.dataset.workspaceTab = "overview";
  workbench.dataset.portalPage = "report";
  workbench.innerHTML = `
    <aside class="v3-chapter-nav" id="v3ChapterNav"></aside>
    <div class="v3-chapter-panel">
      <div class="v3-chapter-opener" id="v3ChapterOpener"></div>
      <div class="v3-insight-grid" id="v3InsightGrid"></div>
    </div>`;
  anchor?.insertAdjacentElement("afterend", workbench);

  const modal = document.createElement("div");
  modal.className = "v3-report-preview";
  modal.id = "v3ReportPreview";
  modal.hidden = true;
  modal.innerHTML = `
    <div class="v3-report-toolbar">
      <b>报告预览与导出</b>
      <span id="v3ReportCounter">1 / 1</span>
      <button class="btn secondary" id="v3PrevReportPage" type="button">上一页</button>
      <button class="btn secondary" id="v3NextReportPage" type="button">下一页</button>
      <button class="btn" id="v3CloseReportPreview" type="button">关闭</button>
    </div>
    <div class="v3-report-page" id="v3ReportPage"></div>`;
  document.body.appendChild(modal);

  document.getElementById("v3EditSetup")?.addEventListener("click", () => {
    document.body.classList.toggle("setup-expanded");
    document.querySelector(".control-surface")?.scrollIntoView({ behavior: "smooth", block: "start" });
  });
  document.getElementById("v3OpenReportPreview")?.addEventListener("click", () => {
    v3ReportPage = 0;
    modal.hidden = false;
    renderV3ReportPreview();
  });
  document.getElementById("v3CloseReportPreview")?.addEventListener("click", () => { modal.hidden = true; });
  document.getElementById("v3PrevReportPage")?.addEventListener("click", () => { v3ReportPage = Math.max(0, v3ReportPage - 1); renderV3ReportPreview(); });
  document.getElementById("v3NextReportPage")?.addEventListener("click", () => { v3ReportPage = Math.min(v3NarrativeChapters().length - 1, v3ReportPage + 1); renderV3ReportPreview(); });
}

function renderV3Summary() {
  const host = document.getElementById("v3SummaryMain");
  if (!host) return;
  const row = targetRecord();
  const diagnosis = row && typeof computeVqaDiagnosis === "function" ? computeVqaDiagnosis(row, peerRecords()) : null;
  const weakest = diagnosis?.labels?.[diagnosis.weakest] || "待生成";
  host.innerHTML = `
    <span><b>目标银行</b>${displayBankName(state.target)}</span>
    <span><b>年份</b>${state.year}</span>
    <span><b>对标组</b>${state.peers.length}家</span>
    <span><b>报告版本</b>${state.reportVersion}</span>
    <span><b>价值质量</b>${diagnosis ? diagnosis.score : "待生成"}</span>
    <span><b>最弱维度</b>${weakest}</span>`;
}

function renderV3Workbench() {
  v3WorkbenchShell();
  renderV3Summary();
  const nav = document.getElementById("v3ChapterNav");
  const opener = document.getElementById("v3ChapterOpener");
  const grid = document.getElementById("v3InsightGrid");
  if (!nav || !opener || !grid) return;
  const chapters = v3NarrativeChapters();
  const active = chapters.find((item) => item.id === v3ActiveChapter) || chapters[0];
  const row = targetRecord();
  const peers = peerRecords();
  nav.innerHTML = chapters.map((chapter) => {
    const signal = v3SignalForChapter(chapter, row, peers);
    return `<button class="${chapter.id === active.id ? "is-active" : ""}" type="button" data-v3-chapter="${chapter.id}">
      <i class="${signal.level}">${signal.label}</i><span>${chapter.label}</span><em>${chapter.chapter}</em>
    </button>`;
  }).join("");
  nav.querySelectorAll("[data-v3-chapter]").forEach((button) => {
    button.addEventListener("click", () => {
      v3ActiveChapter = button.dataset.v3Chapter;
      renderV3Workbench();
    });
  });
  const signal = v3SignalForChapter(active, row, peers);
  opener.innerHTML = `
    <span>${active.chapter} · ${active.label}</span>
    <h2>${active.question}</h2>
    <p>${active.answer}</p>
    <div><b class="${signal.level}">${signal.label}</b><em>${signal.score == null ? "待生成" : `${signal.score}分`}</em></div>`;
  grid.innerHTML = v3ChapterInsightHtml(active.id);
}

function v3MetricTile(key, row = targetRecord(), peers = peerRecords()) {
  const value = row?.[key];
  const peer = avg(peers, key);
  return `<div class="v3-metric-tile"><span>${metricLabel[key] || key}</span><b>${metricDisplayValue(key, value)}</b><em>对标 ${metricDisplayValue(key, peer)}</em></div>`;
}

function v3ChapterInsightHtml(id) {
  const row = targetRecord();
  const peers = peerRecords();
  if (!row) return `<div class="v3-insight-card"><b>请先形成分析结果</b><p>确认样本后展示本章 Insight 单元。</p></div>`;
  if (id === "macro") {
    const macro = v3MacroTransmission(row, peers);
    return `
      <div class="v3-insight-card v3-wide"><span>传导速度比较</span><h3>${macro.label}</h3><div class="v3-chart">${renderTrajectoryScatter("coreRevenueGrowth", "revenueGrowth")}</div><p>从传导链看，资产收益率一年变化 ${metricDisplayValue("earningAssetYield", macro.yieldChange)}，对标组变化 ${metricDisplayValue("earningAssetYield", macro.peerYieldChange)}；${macro.bufferLabel}。</p></div>
      <div class="v3-insight-card">${v3MetricTile("netInterestRevenueShare")}${v3MetricTile("nonInterestShare")}<p>收入结构缓冲决定利率下行向利润表传导的速度。</p></div>`;
  }
  if (id === "risk") {
    const scissors = v3RetailRiskScissors(row, peers);
    const triangle = v3ProfitQualityTriangle(row, peers);
    return `
      <div class="v3-insight-card"><span>零售风险剪刀差</span><h3>${scissors.label}</h3><div class="v3-barline"><i style="width:${Math.min(100, Math.abs(scissors.spread || 0) * 45)}%"></i></div><p>个贷不良率与整体不良率差值 ${fmt(scissors.spread)}，对标组差值 ${fmt(scissors.peerSpread)}。剪刀差扩大时，风险往往先在零售客群暴露。</p></div>
      <div class="v3-insight-card v3-wide"><span>利润质量三角验证</span><h3>${triangle.label}</h3><div class="v3-chart">${renderBubbleScatter("ppopGrowth", "netProfitGrowth", "provisionCoverage")}</div><p>横轴 PPOP 增速、纵轴净利润增速、气泡为拨备覆盖率。若净利润快于 PPOP 且拨备下降，应触发反直觉警示。</p></div>
      <div class="v3-insight-card"><span>领先-滞后关系</span><h3>偏离度与关注率先于不良率复核</h3>${v3MetricTile("overdueNplDeviation")}${v3MetricTile("specialMentionRatio")}</div>`;
  }
  if (id === "sequence") {
    const seq = v3TransformationSequence(row);
    return `
      <div class="v3-insight-card v3-wide"><span>三步转型检查器</span><h3>当前阶段：${seq.stage}</h3><p>${seq.advice}</p><div class="v3-check-grid">${seq.checks.map((item) => `<div class="${item.pass ? "pass" : "fail"}"><b>${item.pass ? "通过" : "未过"}</b><span>${item.label}</span><em>${item.value}</em></div>`).join("")}</div></div>
      <div class="v3-insight-card"><span>行动排序</span><h3>顺序就是战略</h3><ol><li>先修底盘：息差、核心营收、中收厚度。</li><li>再写纪律：风险确认、拨备、资本余量。</li><li>最后交付转型：组织和数字化投入。</li></ol></div>`;
  }
  if (id === "profit") {
    const alerts = v3CounterintuitiveAlerts(row, peers);
    return `
      <div class="v3-insight-card v3-wide"><span>ROA 七因子桥</span><h3>盈利质量先拆来源，再判断可持续性</h3><div class="v3-chart">${renderWaterfall()}</div><p>${alerts[0]?.text || "当前未触发明显反直觉警示，但仍需把 ROA 与核心营收、手续费资产比、PPOP 增速联读。"}</p></div>
      <div class="v3-insight-card">${v3MetricTile("coreRevenueGrowth")}${v3MetricTile("feeAssetRatio")}${v3MetricTile("ppopGrowth")}</div>`;
  }
  if (id === "nim") {
    return `
      <div class="v3-insight-card v3-wide"><span>双面板对照</span><h3>息差缺口与真实贷款收益需并排判断</h3><div class="v3-chart">${renderDualPanel("nimGapBp", "realLoanDepositSpread")}</div><p>如果缺口为正且风险调整后收益偏弱，负债降本和客群定价应同时进入月度经营纪律。</p></div>
      <div class="v3-insight-card">${v3MetricTile("earningAssetYield")}${v3MetricTile("interestLiabilityCost")}${v3MetricTile("timeDepositShare")}</div>`;
  }
  if (id === "capital") {
    return `
      <div class="v3-insight-card v3-wide"><span>资本效率矩阵</span><h3>扩表必须回到资本转化效率</h3><div class="v3-chart">${renderDualPanel("cet1Buffer", "rwaDensity")}</div><p>核心一级资本余量和 RWA 密度决定增长自由度，低效扩表会侵蚀估值修复基础。</p></div>
      <div class="v3-insight-card">${v3MetricTile("rwaProfitGrowthGap")}${v3MetricTile("costIncomeRatio")}${v3MetricTile("pb")}</div>`;
  }
  if (id === "appendix") {
    return `<div class="v3-insight-card v3-wide"><span>口径复核</span><h3>所有结论必须回到同一事实包</h3><p>当前规则版本：${typeof rulesVersionLabel === "function" ? rulesVersionLabel() : "未标注"}。目标银行、对标组、类型均值和报告版本已写入摘要条，导出报告应与章节导航保持同一页序。</p></div>`;
  }
  return `
    <div class="v3-insight-card v3-wide"><span>经营质量仪表盘</span><h3>最弱维度决定本轮汇报顺序</h3><div id="v3HarveyMirror">${typeof ibHarveyRows === "function" ? renderHarveyBallMatrix(ibHarveyRows()) : ""}</div></div>
    <div class="v3-insight-card">${v3MetricTile("roa")}${v3MetricTile("nim")}${v3MetricTile("npl")}${v3MetricTile("cet1Buffer")}</div>`;
}

function renderV3ReportPreview() {
  const page = document.getElementById("v3ReportPage");
  const counter = document.getElementById("v3ReportCounter");
  if (!page) return;
  const chapters = v3NarrativeChapters();
  const chapter = chapters[v3ReportPage] || chapters[0];
  const row = targetRecord();
  const signal = v3SignalForChapter(chapter);
  const metrics = chapter.metrics.slice(0, 3).map((key) => `<div><b>${metricDisplayValue(key, row?.[key])}</b><span>${metricLabel[key] || key}</span></div>`).join("");
  page.innerHTML = `
    <div class="v3-slide-module">${chapter.label}<em>${chapter.chapter}</em></div>
    <div class="v3-slide-head"><h1>${chapter.question}</h1><div>${metrics}</div></div>
    <div class="v3-slide-chart">${v3ChapterInsightHtml(chapter.id)}</div>
    <div class="v3-slide-read"><b>核心结论</b><textarea>${chapter.answer}</textarea><b>管理启示</b><textarea>${chapter.id === "sequence" ? (v3TransformationSequence(row)?.advice || "") : "优先回到事实包中最弱维度，按量化锚点和时间窗口形成管理层闭环。"}</textarea></div>
    <div class="v3-slide-sowhat">${signal.label}：${chapter.label}决定本轮报告的下一层证据链。</div>
    <div class="v3-slide-footer">RSM | 数据来源：上市公司年报、iFinD、RSM 研究汇总 | ${typeof rulesVersionLabel === "function" ? rulesVersionLabel() : "规则版本未标注"}</div>`;
  if (counter) counter.textContent = `${v3ReportPage + 1} / ${chapters.length}`;
}

function renderTrajectoryScatter(xKey, yKey) {
  const rows = focusRows([xKey, yKey]).filter((item) => !item.isTypeAverage);
  const previous = rows.map((row) => records.find((item) => item.bank === row.bank && item.year === state.year - 1)).filter(Boolean);
  return axisChart(rows, xKey, yKey) + `<div class="v3-chart-note">箭头口径：以 ${state.year - 1}→${state.year} 的位置变化解释方向，当前静态 SVG 以点位呈现，报告预览中保留年度变化口径。</div>`;
}

function renderWaterfall() {
  return typeof bridgeChart === "function" ? bridgeChart() : emptySvg("暂无桥图数据");
}

function renderBubbleScatter(xKey, yKey, sizeKey) {
  const width = 920, height = 420, pad = { l: 80, r: 44, t: 30, b: 58 };
  const rows = focusRows([xKey, yKey, sizeKey]).filter((r) => typeof r[xKey] === "number" && typeof r[yKey] === "number");
  if (!rows.length) return emptySvg("暂无气泡散点数据");
  const xs = rows.map((r) => r[xKey]);
  const ys = rows.map((r) => r[yKey]);
  const ss = rows.map((r) => r[sizeKey]).filter((value) => typeof value === "number");
  const minX = Math.min(...xs, 0), maxX = Math.max(...xs, 1);
  const minY = Math.min(...ys, 0), maxY = Math.max(...ys, 1);
  const minS = Math.min(...ss, 0), maxS = Math.max(...ss, 1);
  const sx = (v) => pad.l + (v - minX) / ((maxX - minX) || 1) * (width - pad.l - pad.r);
  const sy = (v) => height - pad.b - (v - minY) / ((maxY - minY) || 1) * (height - pad.t - pad.b);
  const sr = (v) => 7 + (v - minS) / ((maxS - minS) || 1) * 15;
  const target = resolveBank(state.target);
  const body = rows.map((r) => {
    const isTarget = r.bank === target;
    const fill = isTarget ? "#0099d8" : r.isTypeAverage ? "#f59e0b" : "#061b3a";
    return `<circle cx="${sx(r[xKey])}" cy="${sy(r[yKey])}" r="${sr(r[sizeKey])}" fill="${fill}" opacity="${isTarget ? .85 : .28}"/><text x="${sx(r[xKey]) + 10}" y="${sy(r[yKey]) - 8}" font-size="12" font-weight="800" fill="#061b3a">${isTarget || r.isTypeAverage ? displayBankName(r.bank) : ""}</text>`;
  }).join("");
  return svg(width, height, `<rect width="${width}" height="${height}" fill="#fff"/><line x1="${pad.l}" x2="${width - pad.r}" y1="${height - pad.b}" y2="${height - pad.b}" stroke="#8796a4" stroke-width="2"/><line x1="${pad.l}" x2="${pad.l}" y1="${pad.t}" y2="${height - pad.b}" stroke="#8796a4" stroke-width="2"/>${body}<text x="${width / 2}" y="${height - 14}" text-anchor="middle" font-size="14" font-weight="800">${metricLabel[xKey] || xKey}</text><text x="22" y="${height / 2}" transform="rotate(-90 22 ${height / 2})" text-anchor="middle" font-size="14" font-weight="800">${metricLabel[yKey] || yKey}</text><text x="${pad.l}" y="18" font-size="12" fill="#667789" font-weight="800">气泡大小=${metricLabel[sizeKey] || sizeKey}</text>`);
}

function renderDualPanel(leftKey, rightKey) {
  return `<div class="v3-dual-panel"><div>${focusBarChart(leftKey, { digits: 2 })}</div><div>${focusBarChart(rightKey, { digits: 2 })}</div></div>`;
}

function renderHarveyBallMatrix(rows = []) {
  if (!rows.length) return "<p>暂无 Harvey Ball 数据。</p>";
  return `<div class="v3-harvey">${rows.map((row) => {
    const rawScore = row.score ?? (Array.isArray(row.cells) && row.cells.length ? row.cells.reduce((sum, cell) => sum + (cell.score || 0), 0) / row.cells.length : 0);
    const value = Math.max(0, Math.min(100, rawScore || 0));
    const deg = Math.round(value / 100 * 360);
    const level = value >= 66 ? "green" : value >= 45 ? "yellow" : "red";
    return `<div><i class="${level}" style="background:conic-gradient(currentColor ${deg}deg,#e6edf4 0)"></i><b>${row.label || displayBankName(row.bank)}</b><span>${rawScore == null ? "--" : rawScore.toFixed(0)}分</span><em>${row.note || (row.isTarget ? "目标银行" : "对标银行")}</em></div>`;
  }).join("")}</div>`;
}

if (typeof renderAll === "function" && !renderAll.__prdV3Wrapped) {
  const originalRenderAll = renderAll;
  renderAll = function renderAllWithPrdV3Workbench() {
    originalRenderAll();
    renderV3Workbench();
  };
  renderAll.__prdV3Wrapped = true;
}
