/* Bank VQA module: 32-pb-pricing-model.js — PB定价因子知识包 */

var pbPricingModel = {
  source: "银行PB定价因子深度分析完整包｜57家上市银行｜2020-2025",
  sourceDate: "2025-05-23",
  conclusions: [
    "广义不良率是最强PB压制因子，FE全量模型系数为-0.064且p<0.001，SHAP全局排序第1。",
    "手续费/总资产是唯一经统计证明的PB溢价来源，核心模型系数约+0.698且p<0.05，全量模型系数约+0.867且p<0.01。",
    "ROE对PB的解释存在分类型差异：国有大行和农商行更有效，股份行样本中不显著。",
    "区域效应显著，城农商行PB定价需要把区域锚纳入解释，不能只看全国均值。",
    "NIM缺口对农商行有特殊冲击，子组模型p值约0.08，属于需纳入讨论的边际显著因素。"
  ],
  typeStats2025: {
    "国有大行": { median: 0.6988, mean: 0.72135, min: 0.5642, max: 0.9815, n: 6 },
    "股份行": { median: 0.48245, mean: 0.49152, min: 0.1486, max: 0.9742, n: 10 },
    "城市商业银行": { median: 0.4766, mean: 0.49351, min: 0.0684, max: 0.9592, n: 29 },
    "农村商业银行": { median: 0.5685, mean: 0.54454, min: 0.241, max: 0.7852, n: 12 }
  },
  globalShapTop: [
    { metric: "广义不良率", value: 0.070012, key: "hiddenNplExposure", direction: "lowerBetter" },
    { metric: "ROE", value: 0.04982, key: "roe", direction: "higherBetter" },
    { metric: "区域", value: 0.035248, key: "region", direction: "context" },
    { metric: "年份", value: 0.034127, key: "year", direction: "context" },
    { metric: "RoRWA风险调整收益率", value: 0.019847, key: "rorwa", direction: "higherBetter" },
    { metric: "逾期/不良偏离度", value: 0.018984, key: "overdueNplDeviation", direction: "lowerBetter" },
    { metric: "成本收入比", value: 0.016034, key: "costIncomeRatio", direction: "lowerBetter" },
    { metric: "手续费/总资产", value: 0.015649, key: "feeAssetRatio", direction: "higherBetter" }
  ],
  typeNarrative: {
    "国有大行": {
      headline: "国有大行PB更看ROE兑现和资产质量可信度",
      text: "国有大行子组ROE系数为+0.071且显著，广义不良率、RoRWA和逾期偏离度仍是市场折价的关键解释。",
      topFactors: ["广义不良率", "RoRWA风险调整收益率", "逾期/不良偏离度", "成本收入比"]
    },
    "股份行": {
      headline: "股份行不能只用ROE解释PB，市场更看质量与手续费能力",
      text: "股份行FE子组ROE不显著，SHAP仍显示广义不良率、ROE、区域和手续费/总资产重要；解释PB时要避免简单说“ROE高所以应重估”。",
      topFactors: ["广义不良率", "ROE", "区域", "手续费/总资产"]
    },
    "城市商业银行": {
      headline: "城商行PB溢价更依赖手续费/总资产和区域锚",
      text: "城商行子组手续费/总资产系数约+1.189且显著，区域效应靠前，PB判断应同时看轻资本收入厚度和所在区域估值锚。",
      topFactors: ["广义不良率", "ROE", "区域", "逾期/不良偏离度", "手续费/总资产"]
    },
    "农村商业银行": {
      headline: "农商行PB需要联读ROE、广义不良和NIM缺口",
      text: "农商行ROE系数显著，NIM缺口系数为负且边际显著，说明市场会同时定价盈利兑现、资产质量和息差防守。",
      topFactors: ["广义不良率", "ROE", "NIM息差对冲缺口", "成本收入比", "区域"]
    }
  }
};

function pbPricingType(row = targetRecord()) {
  return row?.type || bankMeta(row?.bank || state.target)?.type || "银行样本";
}

function pbPricingTypeAnchor(row = targetRecord()) {
  const type = pbPricingType(row);
  return pbPricingModel.typeStats2025[type] || null;
}

function pbPricingValueText(value) {
  return value == null || Number.isNaN(Number(value)) ? "暂无" : `${Number(value).toFixed(2)}x`;
}

function pbPricingPeerAnchor(peers = peerRecords()) {
  const peerPb = typeof avg === "function" ? avg(peers, "pb") : null;
  return peerPb == null ? "对标组PB暂无" : `对标组均值${pbPricingValueText(peerPb)}`;
}

function pbPricingFactorReadout(row = targetRecord(), peers = peerRecords()) {
  const type = pbPricingType(row);
  const typeNote = pbPricingModel.typeNarrative[type] || pbPricingModel.typeNarrative["城市商业银行"];
  const anchor = pbPricingTypeAnchor(row);
  const peerPb = typeof avg === "function" ? avg(peers, "pb") : null;
  const gapToType = row?.pb == null || !anchor ? null : row.pb - anchor.median;
  const gapToPeer = row?.pb == null || peerPb == null ? null : row.pb - peerPb;
  const broadRisk = row?.hiddenNplExposure ?? row?.overdueNplDeviation ?? null;
  const fee = row?.feeAssetRatio ?? null;
  const lines = [
    anchor
      ? `${type}2025年PB中位数${pbPricingValueText(anchor.median)}、均值${pbPricingValueText(anchor.mean)}，样本${anchor.n}家；目标银行较类型中位数${gapToType == null ? "暂无差值" : `${gapToType >= 0 ? "高" : "低"}${Math.abs(gapToType).toFixed(2)}x`}。`
      : `当前类型缺少2025年PB统计锚，建议使用选定对标组均值作为临时估值参照。`,
    `${pbPricingPeerAnchor(peers)}${gapToPeer == null ? "" : `，目标银行较对标组${gapToPeer >= 0 ? "高" : "低"}${Math.abs(gapToPeer).toFixed(2)}x`}。`,
    broadRisk == null
      ? "广义不良相关字段不足，PB折价解释需要降级为风险待复核。"
      : `风险压制项需重点看广义不良/逾期偏离，当前代理指标为${typeof metricDisplayValue === "function" ? metricDisplayValue(row.hiddenNplExposure != null ? "hiddenNplExposure" : "overdueNplDeviation", broadRisk) : broadRisk}。`,
    fee == null
      ? "手续费/总资产缺失，暂不能验证轻资本收入是否支撑PB溢价。"
      : `手续费/总资产为${typeof metricDisplayValue === "function" ? metricDisplayValue("feeAssetRatio", fee) : fee}，这是模型中少数可证明PB溢价的经营因子。`
  ];
  return { type, typeNote, anchor, peerPb, gapToType, gapToPeer, lines };
}

function pbPricingBrief(row = targetRecord(), peers = peerRecords()) {
  if (!row) return "PB判断需要先确认目标银行和对标组。";
  const readout = pbPricingFactorReadout(row, peers);
  const actual = pbPricingValueText(row.pb);
  const anchorText = readout.anchor ? `同类型中位数${pbPricingValueText(readout.anchor.median)}` : "类型锚待补";
  const gapText = readout.gapToType == null ? "需补类型锚" : readout.gapToType < 0 ? `低于类型中位数${Math.abs(readout.gapToType).toFixed(2)}x` : `高于类型中位数${Math.abs(readout.gapToType).toFixed(2)}x`;
  return `实际PB ${actual}，${anchorText}，目标银行${gapText}。${readout.typeNote.headline}，解释时应优先验证${readout.typeNote.topFactors.slice(0, 3).join("、")}。`;
}
