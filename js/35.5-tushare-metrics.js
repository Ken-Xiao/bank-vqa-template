/* Bank VQA module: 35.5-tushare-metrics.js
 * Phase 1 Tushare 指标库扩展（16 个 5/5 价值字段）
 *
 * 设计：
 *   1. 不动 data.js 主数据，从 data_tushare.js sidecar 加载新指标
 *   2. 在 bootstrap 早期把新指标 merge 进 records[]
 *   3. merge 策略：按 (bank, year) 主键，新字段直接追加；已有字段不覆盖
 *   4. 错误降级：sidecar 缺失/格式错时记日志不抛异常，旧分析链路完整保留
 *   5. 暴露 window.TUSHARE_METRICS_META 便于调试和 contract test
 */

function mergeTushareMetrics() {
  if (typeof window === "undefined" || !window.VQA_DATA) {
    return { merged: 0, skipped: 0, error: "VQA_DATA not loaded" };
  }
  const sidecar = window.VQA_DATA_TUSHARE;
  if (!sidecar || !Array.isArray(sidecar.records)) {
    if (typeof console !== "undefined" && console.warn) {
      console.warn("[tushare-metrics] sidecar VQA_DATA_TUSHARE not found, skip merge");
    }
    return { merged: 0, skipped: 0, error: "sidecar not loaded" };
  }

  const records = window.VQA_DATA.records || [];
  // 建索引 (bank, year) → record
  const indexed = {};
  records.forEach((r) => {
    if (r && r.bank && r.year != null) {
      indexed[`${r.bank}|${r.year}`] = r;
    }
  });

  let merged = 0;
  let skipped = 0;
  const newKeys = new Set();

  sidecar.records.forEach((tr) => {
    const key = `${tr.bank}|${tr.year}`;
    const target = indexed[key];
    if (!target) {
      skipped += 1;
      return;
    }
    Object.keys(tr).forEach((k) => {
      // 不覆盖现有字段（保留 BenchmarkIQ 原始口径作为主）
      if (k === "bank" || k === "year" || k === "ts_code") return;
      if (target[k] === undefined || target[k] === null) {
        target[k] = tr[k];
        newKeys.add(k);
      }
    });
    merged += 1;
  });

  const metrics = Array.isArray(sidecar.metrics) ? sidecar.metrics : [];
  const fieldGovernance = {};
  const fieldsByGroup = {
    approved_replenishment: [],
    business_confirmed: [],
    market_addition: [],
  };
  metrics.forEach((m) => {
    if (!m || !m.code) return;
    fieldGovernance[m.code] = m;
    if (m.approved_group && fieldsByGroup[m.approved_group]) {
      fieldsByGroup[m.approved_group].push(m.code);
    }
  });

  // 暴露元数据
  window.TUSHARE_METRICS_META = {
    version: sidecar.version || "unknown",
    phase: sidecar.phase || "unknown",
    mergePolicy: sidecar.merge_policy || "replenish_only_no_override",
    fieldGovernance,
    approvedReplenishmentFields: fieldsByGroup.approved_replenishment,
    businessConfirmedFields: fieldsByGroup.business_confirmed,
    marketAdditionFields: fieldsByGroup.market_addition,
    metricsAdded: Array.from(newKeys),
    recordsTotal: sidecar.records.length,
    recordsMerged: merged,
    recordsSkipped: skipped,
    mergedAt: new Date().toISOString(),
  };

  if (typeof console !== "undefined" && console.info) {
    console.info(`[tushare-metrics] merged ${merged} records, added ${newKeys.size} fields, skipped ${skipped}`);
  }

  return window.TUSHARE_METRICS_META;
}

// Phase 1 新指标的中文 label，扩展 metricLabel
function extendMetricLabels() {
  if (typeof window === "undefined" || typeof metricLabel === "undefined") return;
  const phase1Labels = {
    dupontNetMargin: "DuPont 净利润率",
    dupontAssetTurn: "DuPont 总资产周转率",
    dupontLeverage: "DuPont 权益乘数",
    dupontROEFromTushare: "Tushare ROE（验证）",
    dupontROAFromTushare: "Tushare ROA（验证）",
    assetImpairLoss: "资产减值损失",
    creditImpairLoss: "信用减值损失(IFRS9)",
    ocfToRevenue: "经营现金/营收",
    extraItemAmount: "非经常性损益",
    fvChangeRatio: "公允价值变动占利润比",
    nonOpRatio: "营业外占比",
    peTtm: "PE TTM",
    divYield: "股息率",
    divYieldTtm: "TTM股息率",
    totalMarketValue: "总市值(万元)",
    turnoverRate: "换手率",
    revenue: "营业收入",
    netProfit: "净利润",
    interestIncome: "利息收入",
    interestExpense: "利息支出",
    feeIncome: "手续费及佣金净收入",
    incomeTax: "所得税费用",
    basicEps: "基本每股收益",
    assets: "总资产",
    liabilities: "总负债",
    equity: "股东权益合计",
    operatingCashFlow: "经营活动现金流净额",
    netInterestIncome: "净利息收入",
    coreRevenue: "核心收入",
    nonInterestShare: "非息收入占比",
    feeAssetRatio: "手续费收入/总资产",
    cashProfitRatio: "经营现金流/净利润",
    adminExpense: "管理费用",
    costIncomeRatio: "成本收入比",
    deposits: "吸收存款",
    depositLiabilityRatio: "存款/总负债",
    // Phase 2 IFRS 9 金融资产分类
    tradAsset: "交易性金融资产FVTPL",
    fvociAssets: "FVOCI金融资产",
    acAssets: "摊余成本金融资产",
    htmInvest: "持有至到期投资",
    afaAssets: "可供出售金融资产",
    investIncome: "投资收益",
    fairValueChgGain: "公允价值变动损益",
    // Phase 2 现金流深度
    cashflowInvAct: "投资活动现金流净额",
    cashflowFncAct: "筹资活动现金流净额",
    depositGrowthCF: "存款增加(现金流)",
    loanIssuanceCF: "贷款投放(现金流)",
    centralBankAdj: "存放央行变动",
  };
  Object.keys(phase1Labels).forEach((k) => {
    if (metricLabel[k] === undefined) {
      metricLabel[k] = phase1Labels[k];
    }
  });
}

// 便捷查询：从 record 取 Tushare 字段
function tushareValue(record, field) {
  if (!record) return null;
  return record[field] !== undefined ? record[field] : null;
}

// DuPont 三因子分解：Tushare 直接给出每一层
function dupontDecomposeFromTushare(record) {
  if (!record) return null;
  return {
    netMargin: record.dupontNetMargin,
    assetTurn: record.dupontAssetTurn,
    leverage: record.dupontLeverage,
    derivedROE: record.dupontROEFromTushare,
    // 验证：netMargin × assetTurn × leverage ≈ ROE
    crossValidationRatio:
      record.dupontNetMargin != null &&
      record.dupontAssetTurn != null &&
      record.dupontLeverage != null &&
      record.dupontROEFromTushare != null
        ? (record.dupontNetMargin / 100) * (record.dupontAssetTurn / 100) * record.dupontLeverage
        : null,
  };
}

// 盈利质量评分：4 类信号加权（避免任何单一字段缺失阻断评分）
function profitQualityScore(record) {
  if (!record) return null;
  const cashRatio = record.ocfToRevenue;           // 越高越好（>0%）
  const extraItem = record.extraItemAmount;        // 越接近 0 越好
  const fvChange = record.fvChangeRatio;           // 越接近 0 越好
  // 拨备口径双路 fallback：优先 IFRS 9，缺失时回落 IAS 39
  const creditLoss = record.creditImpairLoss != null ? record.creditImpairLoss : record.assetImpairLoss;
  // 至少一个信号可用就给基础分；不再因 ocfToRevenue 缺失就直接 return null
  const signals = [cashRatio, extraItem, fvChange, creditLoss].filter((v) => v != null);
  if (signals.length === 0) return null;
  let score = 50;
  if (cashRatio != null) {
    if (cashRatio >= 80) score += 30;
    else if (cashRatio >= 50) score += 15;
    else if (cashRatio >= 30) score += 5;
  }
  if (fvChange != null && Math.abs(fvChange) < 5) score += 10;
  if (extraItem != null && record.netProfit && Math.abs(extraItem / record.netProfit) < 0.05) score += 10;
  if (creditLoss != null && record.netProfit) {
    const ratio = Math.abs(creditLoss / record.netProfit);
    if (ratio < 0.3) score += 5; // 拨备/净利润 <30% 说明利润有"拨备后冗余"
  }
  return Math.min(100, Math.max(0, score));
}

// 暴露给 bootstrap 调用
if (typeof window !== "undefined") {
  window.mergeTushareMetrics = mergeTushareMetrics;
  window.extendMetricLabels = extendMetricLabels;
  window.tushareValue = tushareValue;
  window.dupontDecomposeFromTushare = dupontDecomposeFromTushare;
  window.profitQualityScore = profitQualityScore;
}
