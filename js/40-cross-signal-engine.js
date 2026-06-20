/* Bank VQA module: 40-cross-signal-engine.js
 * Sprint 14A：交叉信号引擎 V1（PRD11-CSE01/03/04/05/06）
 *
 * 命题：不新增更多无主线图表，先建立跨维度因果关系。
 * 每个 panel 返回一条因果链：
 *   { headline, links: [{from, to, mechanism, magnitude, evidenceMetrics, verification}], insightText, factPack }
 *
 * 4 个 panel：
 *   1) nimBridgePanel        资产端收益率 → 负债端成本 → 结构效应 三段闭合
 *   2) roaAttributionPanel   ROA 缺口 → 收入/风险/成本/效率 四主因排序
 *   3) hiddenRiskChainPanel  不良率 → 逾期偏离度 → 关注类贷款 → 拨备余量 四步钩链
 *   4) valueCreationPanel    ROE → 资本成本 → EP → 市场 PB → 理论 PB 五步钩链
 *
 * 设计原则：
 *   - 每条 link 必须能引用 evidenceMetrics（事实包来源）
 *   - 缺数据时 link 标记 status: "data-gap"，不抛异常
 *   - 接入 evidencePackBuilder 拿到 verification 状态
 *   - 与 33-llm-commentary.js 的 factPack 协议一致
 *
 * 消费方：
 *   - topics 页：crossSignalCardHTML(panel) 渲染卡片
 *   - reportModel：作为 C1-C4 的 storyRole='mechanism' 内容
 *   - llm-commentary：作为本地模板的 factPack 输入
 */

// ============ 0. 工具：取数 + 同业 + 同比 ============

function csPeerMedian(peers, key) {
  if (!Array.isArray(peers)) return null;
  var vals = peers.map(function (p) { return p && p[key]; })
    .filter(function (v) { return typeof v === "number" && isFinite(v); });
  if (!vals.length) return null;
  vals.sort(function (a, b) { return a - b; });
  return vals[Math.floor(vals.length / 2)];
}

function csPriorRow(row) {
  // 在 records 中找上一年同一银行
  if (!row || typeof records === "undefined" || !Array.isArray(records)) return null;
  return records.find(function (r) {
    return r && r.bank === row.bank && r.year === (row.year - 1);
  }) || null;
}

function csDeltaYoY(row, prior, key) {
  if (!row || !prior) return null;
  var a = row[key];
  var b = prior[key];
  if (typeof a !== "number" || typeof b !== "number") return null;
  return Math.round((a - b) * 10000) / 10000;
}

function csNum(v, digits) {
  if (typeof v !== "number" || !isFinite(v)) return "—";
  return Number(v).toFixed(digits == null ? 2 : digits);
}

function csBp(v) {
  // 输入百分点（如 0.12 = 12bp），输出 "+12bp" / "-8bp"
  if (typeof v !== "number" || !isFinite(v)) return "—";
  var bp = Math.round(v * 100);
  return (bp >= 0 ? "+" : "") + bp + "bp";
}

function csVerification(metricKey) {
  // 从 11A 的 annualReportVerification + fieldGovernance 拿核验状态
  if (typeof window === "undefined" || !window.annualReportVerification) return null;
  try {
    var arr = window.annualReportVerification.records || window.annualReportVerification || [];
    var hit = arr.find && arr.find(function (r) { return r && r.指标 === metricKey; });
    if (hit) return { status: hit.差异状态 || hit.状态, source: "annual_report_verification_2025" };
  } catch (e) { /* silent */ }
  // 回退到 fieldGovernance
  if (window.fieldGovernance && window.fieldGovernance[metricKey]) {
    return { status: window.fieldGovernance[metricKey].责任 || "primary", source: "field_source_governance" };
  }
  return null;
}

function csBuildFactPack(blockId, links, context) {
  // 优先调用 evidencePackBuilder.buildEvidencePack
  var facts = [];
  links.forEach(function (link) {
    (link.evidenceMetrics || []).forEach(function (mk) {
      facts.push({ 指标代码: mk, 值: link.magnitudeValue, 来源: "cross-signal-engine" });
    });
  });
  if (typeof buildEvidencePack === "function") {
    try {
      return buildEvidencePack({ blockId: blockId, facts: facts, calculations: [], quality: [], context: context || {} });
    } catch (e) { /* fall through */ }
  }
  return { blockId: blockId, facts: facts, context: context || {} };
}

// ============ 1. NIM 桥接（PRD11-CSE03） ============

function nimBridgePanel(row, peers) {
  row = row || (typeof targetRecord === "function" ? targetRecord() : null);
  peers = peers || (typeof peerRecords === "function" ? peerRecords() : []);
  if (!row) return null;

  var prior = csPriorRow(row);
  var nimYoY = csDeltaYoY(row, prior, "nim");
  var yieldYoY = csDeltaYoY(row, prior, "earningAssetYield");
  var costYoY = csDeltaYoY(row, prior, "interestLiabilityCost");
  // 结构效应 = NIM 变化 - (资产收益率变化 - 负债成本变化)
  var structural = (nimYoY != null && yieldYoY != null && costYoY != null)
    ? Math.round((nimYoY - (yieldYoY - costYoY)) * 10000) / 10000
    : null;
  // 闭合度：三段之和 vs NIM 变化（应该接近 0）
  var closure = (nimYoY != null && yieldYoY != null && costYoY != null && structural != null)
    ? Math.round((nimYoY - (yieldYoY - costYoY) - structural) * 10000) / 10000
    : null;

  var assetSide = {
    from: "生息资产收益率 " + csNum(prior && prior.earningAssetYield) + "%",
    to: csNum(row.earningAssetYield) + "%",
    mechanism: yieldYoY != null && yieldYoY < 0 ? "资产端定价被 LPR 下行传导" : "资产端定价稳住",
    magnitude: csBp(yieldYoY),
    magnitudeValue: yieldYoY,
    evidenceMetrics: ["earningAssetYield", "earningAssetYieldChange"],
    verification: csVerification("earningAssetYield"),
    status: yieldYoY == null ? "data-gap" : "ok",
    contribution: yieldYoY,
  };
  var liabSide = {
    from: "计息负债成本率 " + csNum(prior && prior.interestLiabilityCost) + "%",
    to: csNum(row.interestLiabilityCost) + "%",
    mechanism: costYoY != null && costYoY > 0 ? "负债成本刚性" + (costYoY > 0.1 ? "显著上行" : "上行") : "成本平稳或下行",
    magnitude: csBp(costYoY),
    magnitudeValue: costYoY,
    evidenceMetrics: ["interestLiabilityCost", "interestLiabilityCostChange"],
    verification: csVerification("interestLiabilityCost"),
    status: costYoY == null ? "data-gap" : "ok",
    contribution: costYoY != null ? -costYoY : null,  // 负债成本上升对 NIM 是负贡献
  };
  var structureSide = {
    from: "结构效应（资产/负债重构）",
    to: csBp(structural),
    mechanism: structural != null && structural > 0
      ? "存款定期化或贷款结构改善的正向贡献"
      : (structural != null && structural < 0 ? "高成本负债占比上行或低收益资产扩张" : "暂未拆分"),
    magnitude: csBp(structural),
    magnitudeValue: structural,
    evidenceMetrics: ["timeDepositShare", "depositLiabilityRatio", "loanAssetRatio"],
    verification: { status: "primary", source: "derived-from-yoy" },
    status: structural == null ? "data-gap" : "ok",
    contribution: structural,
  };

  var headline = nimYoY == null
    ? "净息差变化数据不全，桥接做不出来"
    : (nimYoY >= 0
        ? "净息差同比 " + csBp(nimYoY) + "，" + (yieldYoY >= 0 ? "资产端" : "结构端") + "扛主贡献"
        : "净息差同比 " + csBp(nimYoY) + "，" + (costYoY > 0 ? "负债成本刚性" : "资产端让价") + "是主拖累");

  var insightText = nimYoY == null
    ? "缺上一年的 NIM 或分项数据，桥接做不到。年报附注里补齐资产/负债端分项收益率。"
    : "NIM 同比 " + csBp(nimYoY) + " = 资产端 " + csBp(yieldYoY) + " − 负债端 " + csBp(costYoY) + " + 结构效应 " + csBp(structural)
      + (closure != null && Math.abs(closure * 100) > 5 ? "。闭合差 " + csBp(closure) + "，有未拆分项。" : "。三段闭合。");

  var links = [assetSide, liabSide, structureSide];
  return {
    chainId: "nim-bridge",
    headline: headline,
    insightText: insightText,
    nimYoY: nimYoY,
    closureGap: closure,
    links: links,
    factPack: csBuildFactPack("nim-bridge", links, { row: row.bank, year: row.year }),
  };
}

// ============ 2. ROA 归因（PRD11-CSE04） ============

function roaAttributionPanel(row, peers) {
  row = row || (typeof targetRecord === "function" ? targetRecord() : null);
  peers = peers || (typeof peerRecords === "function" ? peerRecords() : []);
  if (!row) return null;

  var peerRoa = csPeerMedian(peers, "roa");
  var gap = (typeof row.roa === "number" && typeof peerRoa === "number")
    ? Math.round((row.roa - peerRoa) * 10000) / 10000
    : null;

  // 四主因：收入端 / 风险（拨备）/ 成本（费用）/ 效率（资产周转）
  var revenuePeer = csPeerMedian(peers, "coreRevenue");
  var costIncomePeer = csPeerMedian(peers, "costIncomeRatio");
  var nplPeer = csPeerMedian(peers, "npl");
  var assetTurnPeer = csPeerMedian(peers, "dupontAssetTurn");

  var drivers = [
    {
      key: "revenue",
      label: "收入端",
      mechanism: "核心营收占比 vs 同业",
      gap: (typeof row.coreRevenueShare === "number" && typeof csPeerMedian(peers, "coreRevenueShare") === "number")
        ? Math.round((row.coreRevenueShare - csPeerMedian(peers, "coreRevenueShare")) * 100) / 100 : null,
      unit: "pp",
      evidenceMetrics: ["coreRevenue", "coreRevenueShare", "feeRevenueShare"],
      verification: csVerification("coreRevenue"),
    },
    {
      key: "risk",
      label: "风险",
      mechanism: "拨备占资产比，隐性风险溢出",
      gap: (typeof row.npl === "number" && typeof nplPeer === "number")
        ? Math.round((row.npl - nplPeer) * 100) / 100 : null,
      unit: "pp",
      direction: "lowerBetter",
      evidenceMetrics: ["npl", "provisionCoverage", "overdueNplDeviation"],
      verification: csVerification("npl"),
    },
    {
      key: "cost",
      label: "成本",
      mechanism: "成本收入比 vs 同业",
      gap: (typeof row.costIncomeRatio === "number" && typeof costIncomePeer === "number")
        ? Math.round((row.costIncomeRatio - costIncomePeer) * 100) / 100 : null,
      unit: "pp",
      direction: "lowerBetter",
      evidenceMetrics: ["costIncomeRatio", "adminAssetRatio"],
      verification: csVerification("costIncomeRatio"),
    },
    {
      key: "efficiency",
      label: "效率",
      mechanism: "DuPont 总资产周转率",
      gap: (typeof row.dupontAssetTurn === "number" && typeof assetTurnPeer === "number")
        ? Math.round((row.dupontAssetTurn - assetTurnPeer) * 10000) / 10000 : null,
      unit: "x",
      evidenceMetrics: ["dupontAssetTurn", "assets"],
      verification: csVerification("dupontAssetTurn"),
    },
  ];

  // 排序：按 |gap| 倒序，缺数据放最后
  drivers.sort(function (a, b) {
    if (a.gap == null && b.gap == null) return 0;
    if (a.gap == null) return 1;
    if (b.gap == null) return -1;
    var aSig = (a.direction === "lowerBetter" ? -a.gap : a.gap);
    var bSig = (b.direction === "lowerBetter" ? -b.gap : b.gap);
    return Math.abs(bSig) - Math.abs(aSig);
  });

  var main = drivers[0];
  var sign = gap == null ? "" : (gap >= 0 ? "高于" : "低于");
  var headline = gap == null
    ? "ROA 同业对比数据缺"
    : "ROA " + csNum(row.roa) + "% " + sign + "同业中位 " + Math.abs(gap).toFixed(2)
      + "pp，主因在" + main.label + "（" + main.mechanism + "）";

  var insightText = gap == null
    ? "同业 ROA 缺数据，缺口判断暂搁置。"
    : "ROA 缺口 " + (gap >= 0 ? "+" : "") + gap + "pp，按贡献度排：" +
      drivers.filter(function (d) { return d.gap != null; })
        .map(function (d) { return d.label + " " + (d.gap >= 0 ? "+" : "") + d.gap + d.unit; })
        .join("，") + "。先复盘「" + main.label + "」。";

  var links = drivers.map(function (d) {
    return {
      from: d.label,
      to: d.gap == null ? "数据缺失" : (d.gap >= 0 ? "+" : "") + d.gap + d.unit,
      mechanism: d.mechanism,
      magnitude: d.gap == null ? "—" : (d.gap >= 0 ? "+" : "") + d.gap + d.unit,
      magnitudeValue: d.gap,
      evidenceMetrics: d.evidenceMetrics,
      verification: d.verification,
      status: d.gap == null ? "data-gap" : "ok",
    };
  });

  return {
    chainId: "roa-attribution",
    headline: headline,
    insightText: insightText,
    roaGap: gap,
    drivers: drivers,
    links: links,
    factPack: csBuildFactPack("roa-attribution", links, { row: row.bank, year: row.year }),
  };
}

// ============ 3. 隐性风险链（PRD11-CSE05） ============

function hiddenRiskChainPanel(row, peers) {
  row = row || (typeof targetRecord === "function" ? targetRecord() : null);
  peers = peers || (typeof peerRecords === "function" ? peerRecords() : []);
  if (!row) return null;

  // 四步钩链：不良率 → 逾期偏离度 → 关注类贷款 → 拨备覆盖率余量
  var steps = [
    { key: "npl", label: "不良率（表面）",
      value: row.npl, peer: csPeerMedian(peers, "npl"), unit: "%",
      mechanism: "账面不良率是否反映真实经营压力",
      evidenceMetrics: ["npl", "corporateLoanNpl", "personalLoanNpl"],
      direction: "lowerBetter" },
    { key: "deviation", label: "逾期偏离度",
      value: row.overdueNplDeviation, peer: csPeerMedian(peers, "overdueNplDeviation"), unit: "pp",
      mechanism: "逾期与不良的剪刀差，反映认定宽严",
      evidenceMetrics: ["overdueNplDeviation", "overdueRatio"],
      direction: "lowerBetter" },
    { key: "specialMention", label: "关注类贷款占比",
      value: row.specialMentionRatio, peer: csPeerMedian(peers, "specialMentionRatio"), unit: "%",
      mechanism: "关注类是不良的前置仓",
      evidenceMetrics: ["specialMentionRatio"],
      direction: "lowerBetter" },
    { key: "provisionBuffer", label: "拨备覆盖率",
      value: row.provisionCoverage, peer: csPeerMedian(peers, "provisionCoverage"), unit: "%",
      mechanism: "拨备厚度决定风险出清能力",
      evidenceMetrics: ["provisionCoverage", "provisionCoverageChange"],
      direction: "higherBetter" },
  ];

  steps = steps.map(function (s) {
    if (typeof s.value !== "number" || typeof s.peer !== "number") {
      s.gap = null;
      s.signal = "data-gap";
    } else {
      s.gap = Math.round((s.value - s.peer) * 100) / 100;
      var bad = s.direction === "lowerBetter" ? s.gap > 0 : s.gap < 0;
      s.signal = bad ? (Math.abs(s.gap) > 0.5 ? "red" : "amber") : "green";
    }
    return s;
  });

  // 判断链路
  var concealed = steps[0].signal === "green" && steps[1].signal === "red";  // 表面好 + 偏离度高 = 风险后置
  var prefront = steps[2].signal === "red" && steps[3].signal === "amber";   // 关注类高 + 拨备薄 = 风险前移
  var headline;
  if (concealed) {
    headline = "不良率表面好但逾期偏离度偏高，风险后置（认定宽松）的信号";
  } else if (prefront) {
    headline = "关注类占比高加拨备薄，风险已前移到经营层";
  } else if (steps[0].signal === "green" && steps[3].signal === "green") {
    headline = "四步钩链全优于同业，风险确认和拨备厚度同步";
  } else {
    headline = "风险信号混合：" + steps.filter(function (s) { return s.signal === "red"; })
      .map(function (s) { return s.label; }).join("、") + " 偏离同业";
  }

  var insightText = headline + "。链路证据：" +
    steps.map(function (s) {
      return s.label + " " + (s.value == null ? "—" : s.value + s.unit) +
        " (同业 " + (s.peer == null ? "—" : s.peer + s.unit) + ")";
    }).join("；") + "。";

  var links = steps.map(function (s) {
    return {
      from: s.label,
      to: s.value == null ? "数据缺失" : s.value + s.unit,
      mechanism: s.mechanism,
      magnitude: s.gap == null ? "—" : (s.gap >= 0 ? "+" : "") + s.gap + s.unit,
      magnitudeValue: s.gap,
      evidenceMetrics: s.evidenceMetrics,
      verification: csVerification(s.evidenceMetrics[0]),
      status: s.signal,
    };
  });

  return {
    chainId: "hidden-risk",
    headline: headline,
    insightText: insightText,
    pattern: concealed ? "concealed" : (prefront ? "prefront" : "mixed"),
    steps: steps,
    links: links,
    factPack: csBuildFactPack("hidden-risk", links, { row: row.bank, year: row.year }),
  };
}

// ============ 4. 价值创造链（PRD11-CSE06） ============

function valueCreationChainPanel(row, peers) {
  row = row || (typeof targetRecord === "function" ? targetRecord() : null);
  peers = peers || (typeof peerRecords === "function" ? peerRecords() : []);
  if (!row) return null;

  // 五步钩链：ROE → 资本成本 → 经济利润 EP → 市场 PB → 理论 PB
  // 资本成本：用 9%（CAPM 估算，国资委 EVA 央企口径 5.5% 偏低；A 股银行用 8-10%）
  var costOfEquity = 9;
  // EP = ROE - 资本成本（百分点形式）
  var ep = (typeof row.roe === "number") ? Math.round((row.roe - costOfEquity) * 100) / 100 : null;
  // 经济利润额（万元）= 净利润 - 资本成本 × 股东权益
  var epAmount = (typeof row.netProfit === "number" && typeof row.equity === "number")
    ? Math.round(row.netProfit - costOfEquity / 100 * row.equity)
    : null;
  // 理论 PB（DDM）：使用现有 theoreticalPB() 或简化 (ROE - g) / (r - g)
  var theoryPB = null;
  if (typeof theoreticalPB === "function") {
    var t = theoreticalPB(row);
    if (t && typeof t.pb === "number") theoryPB = Math.round(t.pb * 100) / 100;
  }
  if (theoryPB == null && typeof row.roe === "number") {
    var g = 3;  // 长期增长 3%
    theoryPB = (row.roe - g) > 0 && (costOfEquity - g) > 0
      ? Math.round((row.roe - g) / (costOfEquity - g) * 100) / 100 : null;
  }
  var marketPB = row.pb;
  var pbGap = (typeof marketPB === "number" && typeof theoryPB === "number")
    ? Math.round((marketPB - theoryPB) * 100) / 100 : null;

  var verdict;
  if (ep == null) {
    verdict = "数据缺，价值创造暂判不出";
  } else if (ep > 0 && pbGap != null && pbGap < -0.1) {
    verdict = "创造经济价值，市场低估（EP=+" + ep + "pp，PB 较理论低 " + Math.abs(pbGap) + "）";
  } else if (ep > 0) {
    verdict = "创造经济价值（EP=+" + ep + "pp，ROE 跨过资本成本）";
  } else if (ep < -1) {
    verdict = "价值毁损（EP=" + ep + "pp，ROE 跌穿资本成本）";
  } else {
    verdict = "价值维持（EP=" + ep + "pp，贴近资本成本）";
  }

  var links = [
    {
      from: "ROE",
      to: typeof row.roe === "number" ? row.roe + "%" : "—",
      mechanism: "股东回报率，杜邦顶端",
      magnitude: typeof row.roe === "number" ? row.roe + "%" : "—",
      magnitudeValue: row.roe,
      evidenceMetrics: ["roe", "dupontROEFromTushare"],
      verification: csVerification("roe"),
      status: typeof row.roe === "number" ? "ok" : "data-gap",
    },
    {
      from: "资本成本",
      to: costOfEquity + "%",
      mechanism: "A 股银行 CAPM 估算口径",
      magnitude: costOfEquity + "%",
      magnitudeValue: costOfEquity,
      evidenceMetrics: ["costOfEquity_assumed"],
      verification: { status: "assumed", source: "CAPM-estimate" },
      status: "assumed",
    },
    {
      from: "经济利润 EP",
      to: ep == null ? "—" : (ep >= 0 ? "+" : "") + ep + "pp",
      mechanism: "EP = ROE − 资本成本",
      magnitude: epAmount == null ? "—" : (epAmount / 10000).toFixed(1) + " 亿元",
      magnitudeValue: ep,
      evidenceMetrics: ["roe", "equity", "netProfit"],
      verification: { status: "derived", source: "ep-formula" },
      status: ep == null ? "data-gap" : "ok",
    },
    {
      from: "市场 PB",
      to: typeof marketPB === "number" ? marketPB.toFixed(2) + "x" : "—",
      mechanism: "市场对 ROE 可持续性的当期定价口径",
      magnitude: typeof marketPB === "number" ? marketPB.toFixed(2) + "x" : "—",
      magnitudeValue: marketPB,
      evidenceMetrics: ["pb"],
      verification: csVerification("pb"),
      status: typeof marketPB === "number" ? "ok" : "data-gap",
    },
    {
      from: "理论 PB（DDM）",
      to: typeof theoryPB === "number" ? theoryPB.toFixed(2) + "x" : "—",
      mechanism: "DDM：(ROE − g) / (r − g)，r=" + costOfEquity + "%, g=3%",
      magnitude: pbGap == null ? "—" : "差 " + (pbGap >= 0 ? "+" : "") + pbGap + "x",
      magnitudeValue: theoryPB,
      evidenceMetrics: ["roe", "theoreticalPb"],
      verification: { status: "derived", source: "ddm-formula" },
      status: typeof theoryPB === "number" ? "ok" : "data-gap",
    },
  ];

  var headline = verdict;
  var insightText = "链路结论：" + verdict +
    (pbGap != null ? "。市场 PB " + marketPB + " vs 理论 PB " + theoryPB
      + (pbGap < 0 ? "（市场低估 " + Math.abs(pbGap) + "）" : "（市场偏乐观 " + pbGap + "）") : "") + "。";

  return {
    chainId: "value-creation",
    headline: headline,
    insightText: insightText,
    ep: ep,
    epAmount: epAmount,
    marketPB: marketPB,
    theoryPB: theoryPB,
    pbGap: pbGap,
    costOfEquity: costOfEquity,
    links: links,
    factPack: csBuildFactPack("value-creation", links, { row: row.bank, year: row.year }),
  };
}

// ============ 5. 渲染：crossSignalCardHTML ============

function crossSignalCardHTML(panel) {
  if (!panel) return "";
  var statusColor = function (s) {
    return s === "red" || s === "data-gap" ? "#c0392b" :
           s === "amber" || s === "assumed" ? "#d28f10" :
           s === "green" ? "#1f9e6f" : "#5d6670";
  };
  var linksHtml = (panel.links || []).map(function (l) {
    var verStr = l.verification ? '<span class="cs-ver" style="color:' + statusColor(l.status) + ';">[' + (l.verification.status || "—") + ']</span>' : "";
    return '<li class="cs-link cs-' + (l.status || "ok") + '">' +
      '<div class="cs-link-head">' +
      '<b>' + (l.from || "—") + '</b>' +
      '<span class="cs-arrow">→</span>' +
      '<em>' + (l.to || "—") + '</em>' +
      '<span class="cs-mag">' + (l.magnitude || "") + '</span>' +
      verStr + '</div>' +
      '<p class="cs-mech">' + (l.mechanism || "") + '</p>' +
      '</li>';
  }).join("");
  var chainBadge = '<span class="cs-chain-id">' + (panel.chainId || "chain") + '</span>';
  return '<div class="cross-signal-card insight-mount" data-chain-id="' + (panel.chainId || "") + '">' +
    '<header>' + chainBadge +
    '<h3>' + (panel.headline || "—") + '</h3>' +
    '</header>' +
    '<ul class="cs-links">' + linksHtml + '</ul>' +
    '<div class="cs-insight">' + (panel.insightText || "") + '</div>' +
    '</div>';
}

// ============ 6. 一键挂载到 topics 页 ============

function mountCrossSignalChains() {
  if (typeof targetRecord !== "function" || typeof peerRecords !== "function") return;
  var row = targetRecord();
  var peers = peerRecords();
  if (!row) return;

  var mounts = [
    { id: "crossSignalNimMount", panel: nimBridgePanel(row, peers) },
    { id: "crossSignalRoaMount", panel: roaAttributionPanel(row, peers) },
    { id: "crossSignalRiskMount", panel: hiddenRiskChainPanel(row, peers) },
    { id: "crossSignalValueMount", panel: valueCreationChainPanel(row, peers) },
  ];
  mounts.forEach(function (m) {
    var host = document.getElementById(m.id) ||
      document.querySelector('[data-cross-signal-mount="' + m.id.replace("crossSignal", "").replace("Mount", "").toLowerCase() + '"]');
    if (host && m.panel) {
      host.innerHTML = crossSignalCardHTML(m.panel);
    }
  });
}

// ============ 7. 钩到 renderAll ============

function bindCrossSignalRender() {
  var orig = typeof renderAll === "function" ? renderAll : null;
  if (orig && !orig.__crossSignalWrapped) {
    renderAll = function renderAllWithCrossSignal() {
      var r = orig.apply(this, arguments);
      try { mountCrossSignalChains(); } catch (e) {
        if (typeof console !== "undefined") console.warn("[cross-signal] mount failed", e);
      }
      return r;
    };
    renderAll.__crossSignalWrapped = true;
  }
}

// ============ 8. Top Changes 统一排序（PRD11-CSE02） ============
// 综合 peer z-score（横向偏离）+ 自身三年变化（纵向异动），生成统一优先级。
// 输出每张卡保证：当前值 / 同比 / vs peer / 管理含义 / 引用字段。

function csZScore(value, peerVals) {
  if (typeof value !== "number" || !peerVals.length) return null;
  var sum = 0, sq = 0, n = peerVals.length;
  peerVals.forEach(function (v) { sum += v; sq += v * v; });
  var mean = sum / n;
  var variance = Math.max(sq / n - mean * mean, 0.0001);
  var sd = Math.sqrt(variance);
  return Math.round(((value - mean) / sd) * 100) / 100;
}

function csThreeYearChange(row, key) {
  // 三年纵向：当年 vs 三年前同银行
  if (!row || typeof records === "undefined" || !Array.isArray(records)) return null;
  var three = records.find(function (r) {
    return r && r.bank === row.bank && r.year === (row.year - 3);
  });
  if (!three || typeof row[key] !== "number" || typeof three[key] !== "number") return null;
  return Math.round((row[key] - three[key]) * 10000) / 10000;
}

function csTypicalScale(key) {
  // 不同指标的"典型变化尺度"，用于归一化三年变化
  var scales = {
    roa: 0.3, roe: 2, nim: 0.3, npl: 0.5,
    coreRevenueGrowth: 5, feeAssetRatio: 0.2,
    nimGapBp: 0.2, timeDepositShare: 5,
    overdueNplDeviation: 0.3, provisionCoverage: 30,
    cet1Buffer: 1, pb: 0.3, costIncomeRatio: 3,
    assetGrowth: 3, rwaDensity: 5,
  };
  return scales[key] || 1;
}

function csManagementImplication(key, zScore, threeYr, direction) {
  // 每条信号必须配一句管理含义（中文）
  var dir = (zScore != null && Math.abs(zScore) > 1) ? (zScore > 0 ? "高于" : "低于") : "接近";
  var lowerBetter = ["npl", "overdueNplDeviation", "costIncomeRatio", "rwaDensity"].indexOf(key) >= 0;
  var bad = lowerBetter ? (zScore > 0) : (zScore < 0);
  var lib = {
    roa: bad ? "总资产回报率落后同业，息差和拨备同时拖累。" : "总资产回报率领先同业，是估值溢价的支点。",
    roe: bad ? "净资产回报率低位运行，与资本成本的距离进 EP 章节定性。" : "净资产回报率高于同业，仍要与资本市场预期对照。",
    nim: bad ? "净息差防守承压，先看负债成本传导，再看资产端议价。" : "净息差韧性强于同业，是利率下行周期的差异化抓手。",
    coreRevenueGrowth: bad ? "核心营收增速跑输同业，先拆规模、价格还是结构。" : "核心营收增速领先同业，可持续性是上会重点。",
    npl: bad ? "不良率高于同业，配合逾期偏离度判风险后置。" : "不良率优于同业，关注类占比是前置仓信号。",
    overdueNplDeviation: bad ? "逾期与不良剪刀差扩大，隐性风险后置。" : "逾期与不良口径一致，风险确认到位。",
    feeAssetRatio: bad ? "手续费资产比偏低，轻型化证据薄。" : "手续费资产比领先同业，价值创造的第二支点。",
    provisionCoverage: bad ? "拨备覆盖率偏低，上会前先看出清空间。" : "拨备覆盖率充足，是利润释放的缓冲。",
    pb: bad ? "市净率低于同业，经营质量和风险确认是折价解释。" : "市净率高于同业，溢价的可持续性进董事会议题。",
    cet1Buffer: bad ? "核心一级资本余量偏紧，制约内生扩张。" : "核心一级资本余量充足，分红和扩张都有空间。",
    costIncomeRatio: bad ? "成本收入比偏高，费用专项复盘。" : "成本收入比优于同业，经营效率的直接证据。",
    timeDepositShare: bad ? "定期存款占比高，负债成本刚性在 NIM 章节定性。" : "定期存款占比可控，负债结构友好。",
    rwaDensity: bad ? "RWA 密度偏高，资本占用要优化。" : "RWA 密度合理，资本利用效率到位。",
    nimGapBp: bad ? "息差对冲缺口扩大，资产负债定价不同步。" : "息差对冲缺口可控，资产负债定价同步。",
    assetGrowth: bad ? "总资产增速偏低，业务扩张乏力。" : "总资产增速领先同业，要配合 RWA 看是否高资本占用。",
  };
  return lib[key] || (dir + "同业。" + (bad ? "进专题深钻，落到行动顺序。" : "构成差异化证据。"));
}

function unifyTopChangesAndDeviations(row, peers, options) {
  row = row || (typeof targetRecord === "function" ? targetRecord() : null);
  peers = peers || (typeof peerRecords === "function" ? peerRecords() : []);
  options = options || {};
  if (!row) return { items: [], topN: [] };

  var topN = options.topN || 6;
  var raw = typeof step2TopChangesModel === "function"
    ? step2TopChangesModel(row, peers)
    : { positive: [], negative: [], deviations: [], cross: [] };

  // 合并 4 类 raw signals
  var pool = [].concat(raw.positive || [], raw.negative || [], raw.deviations || [], raw.cross || []);
  // 去重（按 key）
  var seen = {};
  pool = pool.filter(function (item) {
    if (!item || !item.key) return false;
    if (seen[item.key]) return false;
    seen[item.key] = true;
    return true;
  });

  var prior = csPriorRow(row);

  // 计算每个指标的统一优先级
  var enriched = pool.map(function (item) {
    var key = item.key;
    var peerVals = peers.map(function (p) { return p && p[key]; }).filter(function (v) { return typeof v === "number"; });
    var z = csZScore(row[key], peerVals);
    var yoY = csDeltaYoY(row, prior, key);
    var threeYr = csThreeYearChange(row, key);
    var scale = csTypicalScale(key);
    // 优先级 = 0.6 * |z-score| + 0.4 * |3yr / scale|
    var zPart = z != null ? Math.abs(z) : 0;
    var trendPart = threeYr != null ? Math.abs(threeYr / scale) : 0;
    var priority = Math.round((0.6 * zPart + 0.4 * trendPart) * 100) / 100;
    var direction = (z != null && z > 0) ? "above" : (z != null && z < 0 ? "below" : "neutral");
    var implication = csManagementImplication(key, z, threeYr, direction);

    return {
      key: key,
      label: item.label || (typeof fieldName === "function" ? fieldName(key) : key),
      currentValue: row[key],
      currentDisplay: typeof step2Metric === "function" ? step2Metric(key, row[key]) : (row[key] != null ? row[key] : "—"),
      yoY: yoY,
      yoYDisplay: yoY == null ? "—" : (yoY >= 0 ? "+" : "") + Math.round(yoY * 100) / 100,
      threeYr: threeYr,
      threeYrDisplay: threeYr == null ? "—" : (threeYr >= 0 ? "+" : "") + Math.round(threeYr * 100) / 100,
      peerValue: typeof item.peer === "number" ? item.peer : csPeerMedian(peers, key),
      peerDisplay: typeof item.peer === "number" ? (typeof step2Metric === "function" ? step2Metric(key, item.peer) : item.peer) : "—",
      zScore: z,
      zDisplay: z == null ? "—" : (z >= 0 ? "+" : "") + z + "σ",
      priority: priority,
      direction: direction,
      managementImplication: implication,
      evidenceMetrics: [key].concat(item.related || []),
      verification: csVerification(key),
      raw: item,
    };
  });

  // 按 priority 倒序，缺数据放最后
  enriched.sort(function (a, b) {
    if (a.priority === b.priority) {
      return (b.yoY != null ? Math.abs(b.yoY) : 0) - (a.yoY != null ? Math.abs(a.yoY) : 0);
    }
    return b.priority - a.priority;
  });

  return {
    items: enriched,
    topN: enriched.slice(0, topN),
    bank: row.bank,
    year: row.year,
    weights: { peerZScore: 0.6, threeYearChange: 0.4 },
  };
}

function topUnifiedChangesCardHTML(item) {
  if (!item) return "";
  var dirColor = item.direction === "above" ? "#1f9e6f" : (item.direction === "below" ? "#c0392b" : "#5d6670");
  var verBadge = item.verification ? '<span class="top-ver" style="color:' + dirColor + ';">[' + (item.verification.status || "—") + ']</span>' : "";
  return '<div class="top-unified-card">' +
    '<header>' +
    '<div class="top-unified-priority" title="综合优先级 = 0.6 × |z-score| + 0.4 × |三年变化/典型尺度|">P' + item.priority + '</div>' +
    '<h4>' + item.label + '</h4>' +
    verBadge + '</header>' +
    '<div class="top-unified-values">' +
    '<span><em>当前值</em><b>' + item.currentDisplay + '</b></span>' +
    '<span><em>同比</em><b>' + item.yoYDisplay + '</b></span>' +
    '<span><em>三年</em><b>' + item.threeYrDisplay + '</b></span>' +
    '<span><em>vs 同业</em><b>' + item.zDisplay + '</b></span>' +
    '</div>' +
    '<p class="top-unified-implication">' + item.managementImplication + '</p>' +
    '<div class="top-unified-evidence">引用：' + (item.evidenceMetrics || []).join(" · ") + '</div>' +
    '</div>';
}

if (typeof window !== "undefined") {
  window.nimBridgePanel = nimBridgePanel;
  window.roaAttributionPanel = roaAttributionPanel;
  window.hiddenRiskChainPanel = hiddenRiskChainPanel;
  window.valueCreationChainPanel = valueCreationChainPanel;
  window.crossSignalCardHTML = crossSignalCardHTML;
  window.mountCrossSignalChains = mountCrossSignalChains;
  window.bindCrossSignalRender = bindCrossSignalRender;
  window.unifyTopChangesAndDeviations = unifyTopChangesAndDeviations;
  window.topUnifiedChangesCardHTML = topUnifiedChangesCardHTML;
  window.CROSS_SIGNAL_CHAINS = ["nim-bridge", "roa-attribution", "hidden-risk", "value-creation"];
}

bindCrossSignalRender();
