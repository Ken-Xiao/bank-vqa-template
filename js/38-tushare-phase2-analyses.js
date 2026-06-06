/* Bank VQA module: 38-tushare-phase2-analyses.js
 * Phase 2 衍生分析：IFRS 9 金融资产分类 + 现金流深度
 *
 * 提供：
 *   - assetClassificationPanel(row, peers)   IFRS 9 三分类（FVTPL/FVOCI/AC）资产结构
 *   - cashFlowDepthPanel(row, peers)         经营/投资/筹资三视图 + 存贷扩张节奏
 *   - assetClassificationCardHTML(panel)     IFRS 9 卡片 HTML
 *   - cashFlowDepthCardHTML(panel)           现金流深度卡片 HTML
 *   - mountTusharePhase2Analyses()           一键挂载到 Step 2
 *
 * 与 37-tushare-derived-analyses.js 是平行的两个 Phase 分析层。
 */

// ============ 1. IFRS 9 金融资产分类分析 ============

function assetClassificationPanel(row, peers) {
  if (!row) return null;
  // FVTPL（交易性，高波动）+ FVOCI（公允价值且其他综合收益，中波动）+ AC（摊余成本，稳定）三档
  const tradAsset = row.tradAsset;
  const fvoci = row.fvociAssets;
  const ac = row.acAssets;
  const htm = row.htmInvest;
  const afa = row.afaAssets;
  // 总金融投资估算：三分类之和 OR IFRS 9 前的 HTM+AFA+交易类
  const totalIfrs9 = [tradAsset, fvoci, ac].filter((v) => v != null).reduce((a, b) => a + b, 0);
  const totalLegacy = [htm, afa, tradAsset].filter((v) => v != null).reduce((a, b) => a + b, 0);
  const useIfrs9 = totalIfrs9 > 0;
  const total = useIfrs9 ? totalIfrs9 : totalLegacy;
  const assetTotal = row.assets;

  // 三档占比
  const dimensions = useIfrs9 ? [
    { code: "tradAsset", label: "FVTPL（交易性）", value: tradAsset, riskLevel: "高波动", color: "#c0392b" },
    { code: "fvociAssets", label: "FVOCI（公允价值OCI）", value: fvoci, riskLevel: "中波动", color: "#d28f10" },
    { code: "acAssets", label: "AC（摊余成本）", value: ac, riskLevel: "稳定", color: "#1f9e6f" },
  ] : [
    { code: "tradAsset", label: "交易性金融资产", value: tradAsset, riskLevel: "高波动", color: "#c0392b" },
    { code: "afaAssets", label: "可供出售金融资产", value: afa, riskLevel: "中波动", color: "#d28f10" },
    { code: "htmInvest", label: "持有至到期投资", value: htm, riskLevel: "稳定", color: "#1f9e6f" },
  ];

  dimensions.forEach((d) => {
    d.shareOfInvest = total > 0 && d.value != null ? d.value / total : null;
    d.shareOfAssets = assetTotal && d.value != null ? d.value / assetTotal : null;
  });

  // FVTPL / 总资产：高波动暴露率
  const fvtplExposure = tradAsset != null && assetTotal ? tradAsset / assetTotal : null;
  // 公允价值变动对利润的贡献（来自 Phase 1）
  const fvImpact = row.fvChangeRatio;

  // 投资收益对营业收入的贡献
  const investToRevenue = row.investIncome != null && row.revenue
    ? Math.round((row.investIncome / row.revenue) * 10000) / 100
    : null;

  // 判断
  const exposureVerdict = (() => {
    if (fvtplExposure == null) return "FVTPL 数据缺失";
    if (fvtplExposure > 0.08) return `FVTPL 占总资产 ${(fvtplExposure*100).toFixed(2)}%，高波动暴露偏大`;
    if (fvtplExposure > 0.04) return `FVTPL 占总资产 ${(fvtplExposure*100).toFixed(2)}%，处于中等暴露区间`;
    return `FVTPL 占总资产 ${(fvtplExposure*100).toFixed(2)}%，暴露稳健`;
  })();

  return {
    bank: row.bank,
    year: row.year,
    useIfrs9,
    headlineQuestion: "我行的金融资产分类结构是稳健还是激进？",
    dimensions,
    fvtplExposure,
    fvImpact,
    investToRevenue,
    exposureVerdict,
    insight: assetClassificationInsight(dimensions, fvImpact, investToRevenue),
  };
}

function assetClassificationInsight(dims, fvImpact, investToRev) {
  const fvtpl = dims.find((d) => d.code === "tradAsset");
  const flags = [];
  if (fvtpl && fvtpl.shareOfInvest != null && fvtpl.shareOfInvest > 0.3) {
    flags.push(`FVTPL 占金融投资 ${(fvtpl.shareOfInvest*100).toFixed(0)}%，高于稳健水平 20%`);
  }
  if (fvImpact != null && Math.abs(fvImpact) > 10) {
    flags.push(`公允价值变动占利润 ${fvImpact.toFixed(1)}%，FVTPL 持仓对利润扰动大`);
  }
  if (investToRev != null && investToRev > 30) {
    flags.push(`投资收益占营收 ${investToRev.toFixed(1)}%，依赖度高，需关注可持续性`);
  }
  return flags.length ? "需关注：" + flags.join("；") : "金融资产结构稳健，公允价值波动对利润影响有限";
}

// ============ 2. 现金流深度分析 ============

function cashFlowDepthPanel(row, peers) {
  if (!row) return null;

  // 三大现金流
  const cf3 = {
    operating: row.operatingCashFlow,            // 来自现有 BQ
    investing: row.cashflowInvAct,               // Phase 2 新增
    financing: row.cashflowFncAct,               // Phase 2 新增
  };

  // 经营现金/净利润：利润质量黄金比率
  const cfToNp = row.operatingCashFlow && row.netProfit
    ? Math.round((row.operatingCashFlow / row.netProfit) * 100) / 100
    : null;

  // 存贷扩张节奏
  const depositGrowth = row.depositGrowthCF;
  const loanIssuance = row.loanIssuanceCF;
  // 存贷增长比：贷款投放 / 存款增加
  const lendDepRatio = depositGrowth && loanIssuance
    ? Math.round((Math.abs(loanIssuance) / Math.abs(depositGrowth)) * 100) / 100
    : null;

  // 三大现金流方向判断
  const cf3Pattern = (() => {
    const sign = (v) => v == null ? "?" : v > 0 ? "+" : "-";
    return `${sign(cf3.operating)}${sign(cf3.investing)}${sign(cf3.financing)}`;
  })();

  const cf3Verdict = (() => {
    const p = cf3Pattern;
    if (p === "+++") return "+++ 全部正流入：经营、投资、融资同步扩张";
    if (p === "+-+") return "+-+ 经营稳定 + 投资扩张 + 融资融入：典型成长期";
    if (p === "+--") return "+-- 经营稳定 + 投资扩张 + 还债减融资：成熟扩张";
    if (p === "+-?") return "+-· 经营稳定 + 投资扩张：扩张型，关注融资来源";
    if (p === "-?+" || p === "-++") return "-?+ 经营失血 + 融资续命：风险信号";
    if (p === "+++") return "+++ 全部正流入：罕见的高增长态势";
    if (p === "?++") return "?++ 经营数据缺失，融资扩张";
    return `${p} 当前现金流组合（详见各维度数值）`;
  })();

  // 融资强度：筹资/经营
  const fncIntensity = cf3.operating && cf3.financing
    ? Math.round((cf3.financing / cf3.operating) * 100) / 100
    : null;

  return {
    bank: row.bank,
    year: row.year,
    headlineQuestion: "我行的扩张节奏是经营驱动还是融资续命？",
    threeFlows: [
      { code: "operating", label: "经营活动", value: cf3.operating, role: "造血能力" },
      { code: "investing", label: "投资活动", value: cf3.investing, role: "资产配置" },
      { code: "financing", label: "筹资活动", value: cf3.financing, role: "资本工具" },
    ],
    cfToNetProfit: cfToNp,
    depositGrowth,
    loanIssuance,
    lendDepRatio,
    fncIntensity,
    cf3Pattern,
    cf3Verdict,
    insight: cashFlowDepthInsight(cfToNp, lendDepRatio, fncIntensity, cf3Pattern),
  };
}

function cashFlowDepthInsight(cfToNp, lendDepRatio, fncIntensity, pattern) {
  const flags = [];
  if (cfToNp != null && cfToNp < 0.5) {
    flags.push(`经营现金/净利润 ${cfToNp}，远低于 1 倍`);
  }
  if (lendDepRatio != null && lendDepRatio > 1.2) {
    flags.push(`贷款投放比存款增加快 ${(lendDepRatio*100).toFixed(0)}%，可能依赖批发负债`);
  }
  if (fncIntensity != null && fncIntensity > 1) {
    flags.push(`筹资现金流超过经营现金流 ${fncIntensity} 倍，扩张高度依赖融资`);
  }
  if (pattern.startsWith("-")) {
    flags.push(`经营现金流为负：${pattern}`);
  }
  return flags.length ? "需关注：" + flags.join("；") : "经营造血充足，扩张可持续";
}

// ============ 3. HTML 渲染 ============

function assetClassificationCardHTML(panel) {
  if (!panel) return "";
  // 三档色条
  const total = panel.dimensions.reduce((s, d) => s + (d.value || 0), 0) || 1;
  const barHtml = panel.dimensions.map((d) => {
    const w = d.value ? (d.value / total) * 100 : 0;
    return `<div class="ifrs9-bar-segment" style="width:${w.toFixed(1)}%;background:${d.color};" title="${d.label}: ${(w).toFixed(1)}%"></div>`;
  }).join("");

  const rowsHtml = panel.dimensions.map((d) => {
    const val = d.value == null ? "—" : `${(d.value / 10000).toFixed(2)} 亿元`;
    const share = d.shareOfInvest == null ? "—" : `${(d.shareOfInvest * 100).toFixed(1)}%`;
    return `
      <tr>
        <td><span class="dot" style="background:${d.color};"></span> ${d.label}</td>
        <td style="text-align:right;font-variant-numeric:tabular-nums;">${val}</td>
        <td style="text-align:right;font-variant-numeric:tabular-nums;color:#6b7280;">${share}</td>
        <td style="color:${d.color};font-size:11px;font-weight:900;">${d.riskLevel}</td>
      </tr>`;
  }).join("");

  return `
    <div class="ifrs9-classification-card insight-mount">
      <header>
        <span>IFRS 9 · 金融资产分类</span>
        <h3>${panel.headlineQuestion}</h3>
      </header>
      <div class="ifrs9-bar">${barHtml}</div>
      <table class="ifrs9-table">
        <thead>
          <tr><th>分类</th><th>规模</th><th>占金融投资</th><th>风险等级</th></tr>
        </thead>
        <tbody>${rowsHtml}</tbody>
      </table>
      <div class="ifrs9-verdict">
        <div><b>FVTPL 暴露：</b>${panel.exposureVerdict}</div>
        ${panel.investToRevenue != null ? `<div><b>投资收益占营收：</b>${panel.investToRevenue}%</div>` : ""}
        ${panel.fvImpact != null ? `<div><b>公允价值变动占利润：</b>${panel.fvImpact}%</div>` : ""}
      </div>
      <div class="ifrs9-insight">${panel.insight}</div>
    </div>`;
}

function cashFlowDepthCardHTML(panel) {
  if (!panel) return "";
  const flowsHtml = panel.threeFlows.map((f) => {
    const val = f.value == null ? "—" : `${(f.value / 10000).toFixed(1)} 亿`;
    const color = f.value == null ? "#9ca3af" : f.value > 0 ? "#1f9e6f" : "#c0392b";
    return `
      <div class="cf-flow-card">
        <span>${f.label}</span>
        <b style="color:${color};">${val}</b>
        <em>${f.role}</em>
      </div>`;
  }).join("");

  return `
    <div class="cashflow-depth-card insight-mount">
      <header>
        <span>现金流 · 深度分析</span>
        <h3>${panel.headlineQuestion}</h3>
        <div class="cf-pattern">${panel.cf3Pattern}</div>
      </header>
      <div class="cf-flows-grid">${flowsHtml}</div>
      <div class="cf-pattern-verdict">${panel.cf3Verdict}</div>
      <div class="cf-depth-rows">
        ${panel.cfToNetProfit != null ? `<div><b>经营现金/净利润：</b>${panel.cfToNetProfit} 倍</div>` : ""}
        ${panel.depositGrowth != null ? `<div><b>存款增长（现金流口径）：</b>${(panel.depositGrowth / 10000).toFixed(1)} 亿</div>` : ""}
        ${panel.loanIssuance != null ? `<div><b>贷款投放（现金流口径）：</b>${(panel.loanIssuance / 10000).toFixed(1)} 亿</div>` : ""}
        ${panel.lendDepRatio != null ? `<div><b>贷款投放/存款增加：</b>${panel.lendDepRatio} 倍</div>` : ""}
        ${panel.fncIntensity != null ? `<div><b>筹资/经营强度：</b>${panel.fncIntensity}</div>` : ""}
      </div>
      <div class="cf-insight">${panel.insight}</div>
    </div>`;
}

// ============ 4. 一键挂载到 Step 2 ============

function mountTusharePhase2Analyses() {
  if (typeof targetRecord !== "function" || typeof peerRecords !== "function") return;
  const row = targetRecord();
  const peers = peerRecords();
  if (!row) return;

  const ifrs9Panel = assetClassificationPanel(row, peers);
  const ifrs9Mount = document.getElementById("assetClassificationMount") ||
    document.querySelector("[data-tushare-mount='asset-classification']");
  if (ifrs9Mount && ifrs9Panel) {
    ifrs9Mount.innerHTML = assetClassificationCardHTML(ifrs9Panel);
  }

  const cfPanel = cashFlowDepthPanel(row, peers);
  const cfMount = document.getElementById("cashFlowDepthMount") ||
    document.querySelector("[data-tushare-mount='cashflow-depth']");
  if (cfMount && cfPanel) {
    cfMount.innerHTML = cashFlowDepthCardHTML(cfPanel);
  }
}

// ============ 5. 正式报告 section 生成器 ============

function formalIfrs9ClassificationSection(row) {
  if (!row) row = typeof targetRecord === "function" ? targetRecord() : null;
  if (!row) return "";
  const peers = typeof peerRecords === "function" ? peerRecords() : [];
  const panel = assetClassificationPanel(row, peers);
  if (!panel) return "";
  return `
    <section class="formal-section" id="formal-ifrs9-classification"
             data-page-role="topic" data-deck-type="mechanism-evidence"
             data-section-title="IFRS 9·金融资产分类"
             data-module-label="专题分析｜资产结构风险">
      <div class="formal-section-kicker">专题分析｜资产结构风险（Phase 2 Tushare）</div>
      <h2>${panel.headlineQuestion}</h2>
      <p class="formal-lead">${panel.exposureVerdict}。${panel.insight}</p>
      ${assetClassificationCardHTML(panel)}
    </section>`;
}

function formalCashFlowDepthSection(row) {
  if (!row) row = typeof targetRecord === "function" ? targetRecord() : null;
  if (!row) return "";
  const peers = typeof peerRecords === "function" ? peerRecords() : [];
  const panel = cashFlowDepthPanel(row, peers);
  if (!panel) return "";
  return `
    <section class="formal-section" id="formal-cashflow-depth"
             data-page-role="topic" data-deck-type="topic-scr"
             data-section-title="现金流·深度分析"
             data-module-label="专题分析｜扩张可持续性">
      <div class="formal-section-kicker">专题分析｜扩张可持续性（Phase 2 Tushare）</div>
      <h2>${panel.headlineQuestion}</h2>
      <p class="formal-lead">三大现金流方向 <b>${panel.cf3Pattern}</b>。${panel.cf3Verdict}。${panel.insight}</p>
      ${cashFlowDepthCardHTML(panel)}
    </section>`;
}

if (typeof window !== "undefined") {
  window.formalIfrs9ClassificationSection = formalIfrs9ClassificationSection;
  window.formalCashFlowDepthSection = formalCashFlowDepthSection;
  window.assetClassificationPanel = assetClassificationPanel;
  window.cashFlowDepthPanel = cashFlowDepthPanel;
  window.assetClassificationCardHTML = assetClassificationCardHTML;
  window.cashFlowDepthCardHTML = cashFlowDepthCardHTML;
  window.mountTusharePhase2Analyses = mountTusharePhase2Analyses;
}

// 钩到 renderAll
function bindTusharePhase2Render() {
  const originalRenderAll = typeof renderAll === "function" ? renderAll : null;
  if (originalRenderAll && !originalRenderAll.__tusharePhase2Wrapped) {
    renderAll = function renderAllWithTusharePhase2() {
      const result = originalRenderAll.apply(this, arguments);
      try {
        mountTusharePhase2Analyses();
      } catch (err) {
        if (typeof console !== "undefined") console.warn("[tushare-phase2] mount failed", err);
      }
      return result;
    };
    renderAll.__tusharePhase2Wrapped = true;
  }
}

bindTusharePhase2Render();
