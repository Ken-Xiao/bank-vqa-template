/* Bank VQA module: 37-tushare-derived-analyses.js
 * Phase 1 衍生分析层：基于 16 个 Tushare 新字段做高层封装
 *
 * 提供：
 *   - profitQualityPanel(row, peers)     利润质量三层验证（现金 + 拨备 + 非经常）
 *   - valuationWithDividend(row, peers)  PB-PE-divYield 三维估值
 *   - profitQualityCardHTML(target)      Step 2 利润质量卡片 HTML
 *   - dividendValueCardHTML(target)      估值扩展卡片 HTML
 *
 * 与 35.5-tushare-metrics.js 的关系：35.5 提供原始 metric 合并 + 简单工具函数，
 * 37 在其上做"分析级"组装，输出可直接 render 的对象。
 */

// ============ 1. 利润质量分析（三层验证）============

function profitQualityPanel(row, peers) {
  if (!row) return null;
  const peerMedian = (key) => {
    const vals = (peers || [])
      .map((p) => p && p[key])
      .filter((v) => typeof v === "number");
    if (!vals.length) return null;
    vals.sort((a, b) => a - b);
    return vals[Math.floor(vals.length / 2)];
  };

  const layers = [
    {
      id: "cash",
      label: "现金验证",
      question: "净利润是不是真金白银？",
      metric: "ocfToRevenue",
      metricLabel: "经营现金/营收",
      value: row.ocfToRevenue,
      peer: peerMedian("ocfToRevenue"),
      unit: "%",
      direction: "higherBetter",
      strongThreshold: 80,
      weakThreshold: 30,
      interpretation: row.ocfToRevenue == null ? "数据缺失" :
        row.ocfToRevenue >= 80 ? "经营现金充分，利润真实性高" :
        row.ocfToRevenue >= 30 ? "现金回收正常，无显著异常" :
        "经营现金显著低于利润，需关注应收/票据/资产负债表中介项",
    },
    (function buildImpairLayer() {
      // 拨备验证：优先 IFRS 9 信用减值（creditImpairLoss），缺失时回落 IAS 39 资产减值（assetImpairLoss）
      // 注意：用 == null 判断，避免 0 被误当缺失
      const ifrs9Value = row.creditImpairLoss;
      const legacyValue = row.assetImpairLoss;
      const useIfrs9 = ifrs9Value != null;
      const value = useIfrs9 ? ifrs9Value : legacyValue;
      const sourceLabel = useIfrs9 ? "信用减值损失 (IFRS 9 prov_depr_assets)" :
                         legacyValue != null ? "资产减值损失 (IAS 39 assets_impair_loss)" :
                         "（无可用拨备字段）";
      const peerKey = useIfrs9 ? "creditImpairLoss" : "assetImpairLoss";
      const ratio = row.netProfit && value != null && row.netProfit !== 0
        ? Math.round((value / row.netProfit) * 10000) / 100
        : null;
      let interpretation;
      if (value == null) {
        interpretation = "拨备字段两路（IFRS 9 + IAS 39）均无数据。可能是 Tushare 该期未披露 prov_depr_assets/assets_impair_loss，或银行属早期上市未落地 IFRS 9。建议跑诊断脚本核实。";
      } else if (row.netProfit == null || row.netProfit === 0) {
        interpretation = `${sourceLabel}：${(value / 10000).toFixed(2)} 亿元（净利润缺失，无法判断比例）`;
      } else {
        const pct = (value / row.netProfit) * 100;
        const severity = Math.abs(pct) > 50 ? "对净利润影响显著" :
                        Math.abs(pct) > 20 ? "比例较高但仍在合理区间" :
                        "比例较低";
        interpretation = `${sourceLabel}：${(value / 10000).toFixed(2)} 亿元，占净利润 ${pct.toFixed(1)}%，${severity}`;
      }
      return {
        id: "impair",
        label: "拨备验证",
        question: "利润是不是少计了拨备做出来的？",
        metric: peerKey,
        metricLabel: sourceLabel,
        value,
        peer: peerMedian(peerKey),
        unit: "万元",
        direction: "contextual",
        useIfrs9,
        sourceLabel,
        ratioToNetProfit: ratio,
        interpretation,
      };
    })(),
    {
      id: "nonRecurring",
      label: "经常性验证",
      question: "利润来源是经营性的还是一次性？",
      layer3Metrics: [
        { code: "fvChangeRatio", label: "公允价值变动占利润比", value: row.fvChangeRatio, threshold: 5, unit: "%" },
        { code: "extraItemAmount", label: "非经常性损益（万元）", value: row.extraItemAmount, unit: "万元",
          ratio: row.netProfit && row.extraItemAmount
            ? Math.round((row.extraItemAmount / row.netProfit) * 10000) / 100 : null },
        { code: "nonOpRatio", label: "营业利润占比", value: row.nonOpRatio, threshold: 95, unit: "%" },
      ],
      flags: [],
    },
  ];

  // 经常性验证：检测可疑信号
  const nonRecLayer = layers[2];
  if (row.fvChangeRatio != null && Math.abs(row.fvChangeRatio) > 10) {
    nonRecLayer.flags.push(`⚠ 公允价值变动占利润比 ${row.fvChangeRatio.toFixed(1)}%，超过 10% 警戒线`);
  }
  if (row.extraItemAmount && row.netProfit && Math.abs(row.extraItemAmount / row.netProfit) > 0.1) {
    nonRecLayer.flags.push(`⚠ 非经常性损益占净利润 ${(row.extraItemAmount/row.netProfit*100).toFixed(1)}%`);
  }
  if (row.nonOpRatio != null && row.nonOpRatio < 90) {
    nonRecLayer.flags.push(`⚠ 营业利润占比 ${row.nonOpRatio.toFixed(1)}%，非经常占比偏高`);
  }
  if (!nonRecLayer.flags.length && (row.fvChangeRatio != null || row.extraItemAmount != null)) {
    nonRecLayer.flags.push("✓ 三项经常性指标均在合理范围");
  }

  // 综合评分
  const score = typeof profitQualityScore === "function" ? profitQualityScore(row) : null;
  const verdict = score == null ? "数据不足" :
    score >= 80 ? "利润真实性高" :
    score >= 60 ? "利润质量合格" :
    score >= 40 ? "存在质量问题，建议深入" :
    "利润质量存疑，需重新审视";

  return {
    bank: row.bank,
    year: row.year,
    score,
    verdict,
    headlineQuestion: "我行的利润是真实的吗？",
    layers,
    insight: profitQualityInsight(layers, score),
  };
}

function profitQualityInsight(layers, score) {
  const cashLayer = layers[0];
  const nonRecLayer = layers[2];
  const issues = [];
  if (cashLayer.value != null && cashLayer.value < 50) issues.push("经营现金偏弱");
  if (nonRecLayer.flags.some((f) => f.startsWith("⚠"))) issues.push("非经常性影响显著");
  if (!issues.length) return "三层验证均通过：利润有现金支撑，拨备充分，经常性占比高";
  return "需关注：" + issues.join("、");
}

// ============ 2. 股息率估值（PB-PE-divYield 三维）============

function valuationWithDividend(row, peers) {
  if (!row) return null;
  const peerMedian = (key) => {
    const vals = (peers || []).map((p) => p && p[key]).filter((v) => typeof v === "number");
    if (!vals.length) return null;
    vals.sort((a, b) => a - b);
    return vals[Math.floor(vals.length / 2)];
  };

  const dimensions = [
    {
      code: "pb",
      label: "市净率 PB",
      value: row.pb,
      peer: peerMedian("pb"),
      unit: "倍",
      direction: "higherBetter",
      meaning: "净资产折溢价",
    },
    {
      code: "peTtm",
      label: "市盈率 PE (TTM)",
      value: row.peTtm,
      peer: peerMedian("peTtm"),
      unit: "倍",
      direction: "higherBetter",
      meaning: "盈利倍数",
    },
    {
      code: "divYield",
      label: "股息率",
      value: row.divYield,
      peer: peerMedian("divYield"),
      unit: "%",
      direction: "higherBetter",
      meaning: "股东回报",
      isCriticalForStateOwned: true,
    },
    {
      code: "divYieldTtm",
      label: "TTM 股息率",
      value: row.divYieldTtm,
      peer: peerMedian("divYieldTtm"),
      unit: "%",
      direction: "higherBetter",
      meaning: "动态股息率",
    },
    {
      code: "totalMarketValue",
      label: "总市值",
      value: row.totalMarketValue,
      peer: peerMedian("totalMarketValue"),
      unit: "万元",
      direction: "contextual",
      meaning: "规模",
    },
  ];

  // 央国行视角：分红一致性是否可持续
  const isStateOwned = row.type === "国有大行" || row.type === "国有商业银行";
  const dividendVerdict = (() => {
    if (row.divYield == null) return "股息率数据缺失";
    if (row.divYield >= 6) return "高股息（>6%），股东回报突出";
    if (row.divYield >= 4) return "稳健股息（4-6%），符合央国行常态";
    if (row.divYield >= 2) return "中等股息（2-4%），股东回报偏弱";
    return "低股息（<2%），需要看是否在投入扩张期";
  })();

  // 估值三维定位
  const verdict = (() => {
    const pb = row.pb, pe = row.peTtm, dv = row.divYield;
    if (pb == null || pe == null) return "估值数据不全";
    if (pb < 0.7 && dv >= 5) return "深度破净 + 高股息 → 低估机会还是价值陷阱？";
    if (pb >= 1 && pe < 8) return "PB 高 + PE 低 → 强盈利驱动";
    if (pb < 1 && dv < 3) return "破净 + 低股息 → 市场普遍不认可";
    return "估值中性区间";
  })();

  return {
    bank: row.bank,
    year: row.year,
    isStateOwned,
    headlineQuestion: isStateOwned
      ? "我行的股息率是否支撑了央国行的估值溢价？"
      : "市场如何用 PB-PE-股息率三维度给我行定价？",
    dimensions,
    dividendVerdict,
    valuationVerdict: verdict,
  };
}

// ============ 2.5. 资本市场信号（新增字段不替换，仅补充市场视角）============

function capitalMarketSignalPanel(row, peers) {
  if (!row) return null;
  const peerMedian = (key) => {
    const vals = (peers || []).map((p) => p && p[key]).filter((v) => typeof v === "number");
    if (!vals.length) return null;
    vals.sort((a, b) => a - b);
    return vals[Math.floor(vals.length / 2)];
  };
  const peerPb = peerMedian("pb");
  const peerPe = peerMedian("peTtm");
  const peerDividend = peerMedian("divYield");
  const peerMarketValue = peerMedian("totalMarketValue");
  const peerTurnover = peerMedian("turnoverRate");

  const marketValueGap = row.totalMarketValue != null && peerMarketValue
    ? row.totalMarketValue / peerMarketValue - 1
    : null;
  const turnoverGap = row.turnoverRate != null && peerTurnover
    ? row.turnoverRate / peerTurnover - 1
    : null;

  const marketLiquidityVerdict = (() => {
    if (row.totalMarketValue == null && row.turnoverRate == null) return "市值和换手率缺失，暂不做市场流动性判断";
    if (marketValueGap != null && marketValueGap < -0.35 && turnoverGap != null && turnoverGap < -0.25) {
      return "市值规模和交易活跃度同时弱于同业，PB 折价中可能含有流动性折价";
    }
    if (turnoverGap != null && turnoverGap < -0.25) return "换手率低于同业，市场关注度不足可能压制估值修复速度";
    if (marketValueGap != null && marketValueGap > 0.35 && turnoverGap != null && turnoverGap >= 0) {
      return "市值规模和流动性均有支撑，市场定价更可能回到基本面解释";
    }
    return "流动性没有形成明显拖累，需要结合盈利兑现和分红稳定性继续判断";
  })();

  const valuationCause = (() => {
    const pbDiscount = row.pb != null && peerPb != null ? row.pb - peerPb : null;
    const dividendPremium = row.divYield != null && peerDividend != null ? row.divYield - peerDividend : null;
    const peGap = row.peTtm != null && peerPe != null ? row.peTtm - peerPe : null;
    if (pbDiscount != null && pbDiscount < -0.1 && dividendPremium != null && dividendPremium > 0.5) {
      return "PB 折价但股息率高于同业，市场更像是在要求更高风险补偿，而不是单纯忽视分红价值";
    }
    if (pbDiscount != null && pbDiscount < -0.1 && peGap != null && peGap > 1) {
      return "PB 折价叠加 PE 偏高，市场可能担心盈利可持续性或资产质量后续扰动";
    }
    if (pbDiscount != null && pbDiscount > 0.1 && turnoverGap != null && turnoverGap >= 0) {
      return "PB 溢价且交易活跃，市场已给出相对认可，后续重点是能否用 ROE 和分红兑现支撑溢价";
    }
    return "资本市场信号偏中性，后续需要把 PB 与 ROE、息差、防风险专题联动解释";
  })();

  return {
    bank: row.bank,
    year: row.year,
    headlineQuestion: "资本市场为什么这样给我行定价？",
    marketLiquidityVerdict,
    valuationCause,
    dimensions: [
      { code: "pb", label: "PB", value: row.pb, peer: peerPb, unit: "倍", meaning: "净资产认可度" },
      { code: "peTtm", label: "PE TTM", value: row.peTtm, peer: peerPe, unit: "倍", meaning: "盈利兑现预期" },
      { code: "divYield", label: "股息率", value: row.divYield, peer: peerDividend, unit: "%", meaning: "股东回报补偿" },
      { code: "totalMarketValue", label: "总市值", value: row.totalMarketValue, peer: peerMarketValue, unit: "万元", meaning: "规模与覆盖度" },
      { code: "turnoverRate", label: "换手率", value: row.turnoverRate, peer: peerTurnover, unit: "%", meaning: "交易活跃度" },
    ],
  };
}

// ============ 3. HTML 渲染（直接喂给现有专题）============

function profitQualityCardHTML(panel) {
  if (!panel) return "";
  const scoreColor = panel.score == null ? "#9ca3af" :
    panel.score >= 70 ? "#1f9e6f" :
    panel.score >= 50 ? "#d28f10" : "#c0392b";

  const layersHtml = panel.layers.map((layer) => {
    if (layer.id === "nonRecurring") {
      const flagsHtml = (layer.flags || []).map((f) =>
        `<li style="color:${f.startsWith('⚠') ? '#c0392b' : '#1f9e6f'};">${f}</li>`).join("");
      return `
        <div class="profit-quality-layer">
          <div class="layer-head">
            <b>${layer.label}</b>
            <span>${layer.question}</span>
          </div>
          <ul style="margin:6px 0 0; padding-left:18px;">${flagsHtml}</ul>
        </div>`;
    }
    const valTxt = layer.value == null ? "—" : `${layer.value}${layer.unit || ""}`;
    const peerTxt = layer.peer == null ? "" : ` (同业 ${layer.peer}${layer.unit || ""})`;
    return `
      <div class="profit-quality-layer">
        <div class="layer-head">
          <b>${layer.label}</b>
          <span>${layer.question}</span>
        </div>
        <div class="layer-value">${valTxt}${peerTxt}</div>
        <em>${layer.interpretation || ""}</em>
      </div>`;
  }).join("");

  return `
    <div class="profit-quality-card insight-mount">
      <header>
        <span>利润质量·三层验证</span>
        <h3>${panel.headlineQuestion}</h3>
        <div class="pq-score" style="color:${scoreColor};">
          <b>${panel.score != null ? panel.score : "—"}</b>
          <em>${panel.verdict}</em>
        </div>
      </header>
      <div class="profit-quality-layers">${layersHtml}</div>
      <div class="pq-insight">${panel.insight}</div>
    </div>`;
}

function dividendValueCardHTML(panel) {
  if (!panel) return "";
  const rowsHtml = panel.dimensions.map((d) => {
    const valTxt = d.value == null ? "—" : `${d.value}${d.unit === "倍" ? " 倍" : (d.unit === "%" ? "%" : "")}`;
    const peerTxt = d.peer == null ? "—" : `${d.peer}${d.unit === "倍" ? " 倍" : (d.unit === "%" ? "%" : "")}`;
    const tag = d.isCriticalForStateOwned ? ' <span style="background:#fef3c7;padding:1px 6px;border-radius:4px;font-size:11px;">央国行核心</span>' : "";
    return `
      <tr>
        <td>${d.label}${tag}</td>
        <td style="text-align:right;font-variant-numeric:tabular-nums;">${valTxt}</td>
        <td style="text-align:right;font-variant-numeric:tabular-nums;color:#6b7280;">${peerTxt}</td>
        <td style="color:#9ca3af;font-size:11px;">${d.meaning}</td>
      </tr>`;
  }).join("");

  return `
    <div class="dividend-value-card insight-mount">
      <header>
        <span>估值·三维定位</span>
        <h3>${panel.headlineQuestion}</h3>
      </header>
      <table class="dividend-value-table">
        <thead>
          <tr><th>维度</th><th>本行</th><th>同业中位</th><th>含义</th></tr>
        </thead>
        <tbody>${rowsHtml}</tbody>
      </table>
      <div class="dv-verdict">
        <div><b>股息判断：</b>${panel.dividendVerdict}</div>
        <div><b>估值判断：</b>${panel.valuationVerdict}</div>
      </div>
    </div>`;
}

function capitalMarketSignalCardHTML(panel) {
  if (!panel) return "";
  const fmt = (value, unit) => {
    if (value == null) return "—";
    if (unit === "万元") return `${(value / 10000).toFixed(1)} 亿`;
    if (unit === "%") return `${value.toFixed ? value.toFixed(2) : value}%`;
    if (unit === "倍") return `${value.toFixed ? value.toFixed(2) : value} 倍`;
    return `${value}`;
  };
  const rowsHtml = panel.dimensions.map((d) => `
    <tr>
      <td>${d.label}</td>
      <td style="text-align:right;font-variant-numeric:tabular-nums;">${fmt(d.value, d.unit)}</td>
      <td style="text-align:right;font-variant-numeric:tabular-nums;color:#6b7280;">${fmt(d.peer, d.unit)}</td>
      <td style="color:#6b7280;">${d.meaning}</td>
    </tr>`).join("");
  return `
    <div class="capital-market-card insight-mount">
      <header>
        <span>资本市场信号</span>
        <h3>${panel.headlineQuestion}</h3>
      </header>
      <table class="dividend-value-table compact-capital-market-table">
        <thead>
          <tr><th>信号</th><th>本行</th><th>同业中位</th><th>解释</th></tr>
        </thead>
        <tbody>${rowsHtml}</tbody>
      </table>
      <div class="dv-verdict">
        <div><b>流动性判断：</b>${panel.marketLiquidityVerdict}</div>
        <div><b>可能原因：</b>${panel.valuationCause}</div>
      </div>
    </div>`;
}

// ============ 4. 一键挂载到 Step 2 ============

function mountTushareDerivedAnalyses() {
  if (typeof targetRecord !== "function" || typeof peerRecords !== "function") return;
  const row = targetRecord();
  const peers = peerRecords();
  if (!row) return;

  // 利润质量卡：尝试挂到价值创造 / 盈利专题之后
  const pqPanel = profitQualityPanel(row, peers);
  const pqMount = document.getElementById("profitQualityMount") ||
    document.querySelector("[data-tushare-mount='profit-quality']");
  if (pqMount && pqPanel) {
    pqMount.innerHTML = profitQualityCardHTML(pqPanel);
  }

  // 股息估值卡：尝试挂到 PB 专题之后
  const dvPanel = valuationWithDividend(row, peers);
  const cmPanel = capitalMarketSignalPanel(row, peers);
  const dvMount = document.getElementById("dividendValueMount") ||
    document.querySelector("[data-tushare-mount='dividend-value']");
  if (dvMount && dvPanel) {
    dvMount.innerHTML = dividendValueCardHTML(dvPanel) + capitalMarketSignalCardHTML(cmPanel);
  }
}

// 暴露到 window
if (typeof window !== "undefined") {
  window.profitQualityPanel = profitQualityPanel;
  window.valuationWithDividend = valuationWithDividend;
  window.capitalMarketSignalPanel = capitalMarketSignalPanel;
  window.profitQualityCardHTML = profitQualityCardHTML;
  window.dividendValueCardHTML = dividendValueCardHTML;
  window.capitalMarketSignalCardHTML = capitalMarketSignalCardHTML;
  window.mountTushareDerivedAnalyses = mountTushareDerivedAnalyses;
}

// ============ 5. 正式报告 section 生成器（F：进报告）============

function formalProfitQualitySection(row) {
  if (!row) row = typeof targetRecord === "function" ? targetRecord() : null;
  if (!row) return "";
  const peers = typeof peerRecords === "function" ? peerRecords() : [];
  const panel = profitQualityPanel(row, peers);
  if (!panel) return "";
  return `
    <section class="formal-section" id="formal-profit-quality"
             data-page-role="topic" data-deck-type="topic-scr"
             data-section-title="利润质量·三层验证"
             data-module-label="专题分析｜利润真实性">
      <div class="formal-section-kicker">专题分析｜利润真实性（Phase 1 Tushare 衍生）</div>
      <h2>${panel.headlineQuestion}</h2>
      <p class="formal-lead">本节用 Tushare 财务指标接口的经营现金率、信用减值、公允价值变动和非经常性损益四个独立维度，对净利润做三层独立验证。综合评分 <b>${panel.score != null ? panel.score : "—"}</b>：${panel.verdict}。${panel.insight}</p>
      ${profitQualityCardHTML(panel)}
    </section>`;
}

function formalDividendValuationSection(row) {
  if (!row) row = typeof targetRecord === "function" ? targetRecord() : null;
  if (!row) return "";
  const peers = typeof peerRecords === "function" ? peerRecords() : [];
  const panel = valuationWithDividend(row, peers);
  const marketPanel = capitalMarketSignalPanel(row, peers);
  if (!panel) return "";
  return `
    <section class="formal-section" id="formal-dividend-valuation"
             data-page-role="topic" data-deck-type="evidence-brief"
             data-section-title="估值·PB-PE-股息率三维"
             data-module-label="专题分析｜资本市场感知">
      <div class="formal-section-kicker">专题分析｜资本市场感知（Phase 1 Tushare）</div>
      <h2>${panel.headlineQuestion}</h2>
      <p class="formal-lead">${panel.dividendVerdict}。${panel.valuationVerdict}。${marketPanel ? marketPanel.marketLiquidityVerdict : ""} ${panel.isStateOwned ? "本节为央国行视角，特别突出股息率维度。" : "本节通过 PB-PE-股息率三维定位市场判断。"}</p>
      ${dividendValueCardHTML(panel)}
      ${capitalMarketSignalCardHTML(marketPanel)}
    </section>`;
}

if (typeof window !== "undefined") {
  window.formalProfitQualitySection = formalProfitQualitySection;
  window.formalDividendValuationSection = formalDividendValuationSection;
}

// 钩到 renderAll：每次重渲染都刷新利润质量 + 估值卡
function bindTushareDerivedRender() {
  const originalRenderAll = typeof renderAll === "function" ? renderAll : null;
  if (originalRenderAll && !originalRenderAll.__tushareDerivedWrapped) {
    renderAll = function renderAllWithTushareDerived() {
      const result = originalRenderAll.apply(this, arguments);
      try {
        mountTushareDerivedAnalyses();
      } catch (err) {
        if (typeof console !== "undefined") {
          console.warn("[tushare-derived] mount failed", err);
        }
      }
      return result;
    };
    renderAll.__tushareDerivedWrapped = true;
  }
}

bindTushareDerivedRender();
