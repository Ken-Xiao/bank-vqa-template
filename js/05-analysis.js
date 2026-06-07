/* Bank VQA module: 05-analysis.js */
function updateKpis() {
  const row = targetRecord();
  const peers = peerRecords();
  const all = currentRecords();
  if (!row) return;
  setText("kpiRoa", fmt(row.roa));
  setText("kpiCoreGrowth", fmt(row.coreRevenueGrowth));
  setText("kpiNim", fmt(row.nim));
  setText("kpiNimGap", fmtBp(row.nimGapBp));
  setText("kpiFeeAsset", fmt(row.feeAssetRatio, 3));
  setText("kpiPb", row.pb == null ? "暂无" : `${Number(row.pb).toFixed(2)}x`);
  setText("kpiRoaNote", `对标均值 ${fmt(avg(peers, "roa"))}，${rankPercentile(row.roa, all, "roa")}`, "delta good");
  setText("kpiCoreNote", `对标均值 ${fmt(avg(peers, "coreRevenueGrowth"))}`, row.coreRevenueGrowth >= 0 ? "delta good" : "delta bad");
  setText("kpiNimNote", `对标均值 ${fmt(avg(peers, "nim"))}`, row.nim >= avg(peers, "nim") ? "delta good" : "delta bad");
  setText("kpiNimGapNote", `对标均值 ${fmtBp(avg(peers, "nimGapBp"))}`, row.nimGapBp <= 0 ? "delta good" : "delta bad");
  setText("kpiFeeNote", `对标均值 ${fmt(avg(peers, "feeAssetRatio"), 3)}`, row.feeAssetRatio >= avg(peers, "feeAssetRatio") ? "delta good" : "delta bad");
  setText("kpiPbNote", `对标均值 ${avg(peers, "pb") == null ? "暂无" : avg(peers, "pb").toFixed(2) + "x"}`, "delta");
  updateVqaPanel(row, peers);
  updateRiskTable(row, peers);
  updateSummaryText(row, peers);
}

function updateRiskTable(row, peers) {
  if (!row) return;
  const peerNpl = avg(peers, "npl");
  const peerRetail = avg(peers, "personalLoanNpl");
  const peerDeviation = avg(peers, "overdueNplDeviation");
  const peerCoverage = avg(peers, "provisionCoverage");
  setText("riskNpl", fmt(row.npl));
  setText("riskRetailNpl", fmt(row.personalLoanNpl));
  setText("riskDeviation", fmt(row.overdueNplDeviation, 2, ""));
  setText("riskCoverage", fmt(row.provisionCoverage));
  setText("riskNplRead", compareWord(row.npl, peerNpl, false) === "好于" ? "低于对标，风险大盘较稳" : "高于对标，需拆解行业与客群");
  setText("riskRetailRead", compareWord(row.personalLoanNpl, peerRetail, false) === "好于" ? "低于对标，零售压力较轻" : "高于对标，零售分项需前移");
  setText("riskDeviationRead", compareWord(row.overdueNplDeviation, peerDeviation, false) === "好于" ? "低于对标，确认节奏较稳" : "高于对标，确认节奏需审视");
  setText("riskCoverageRead", compareWord(row.provisionCoverage, peerCoverage, true) === "好于" ? "高于对标，缓冲较厚" : "低于对标，缓冲需跟踪");
}

function updateSummaryText(row, peers) {
  const op = document.getElementById("operationJudgement");
  const mk = document.getElementById("marketJudgement");
  if (!row) return;
  const target = displayBankName(row.bank);
  const peerNames = displayBankList(state.peers);
  const peerRoa = avg(peers, "roa");
  const peerCore = avg(peers, "coreRevenueGrowth");
  const peerGap = avg(peers, "nimGapBp");
  const peerPb = avg(peers, "pb");
  const opSignal = [
    row.roa != null && peerRoa != null && row.roa >= peerRoa ? "回报水平强于对标组" : "回报水平弱于或接近对标组",
    row.coreRevenueGrowth != null && row.coreRevenueGrowth >= 0 ? "核心营收仍为正增长" : "核心营收承压",
    row.nimGapBp != null && row.nimGapBp <= 0 ? "息差对冲相对主动" : "资产端让价快于负债降本"
  ].join("，");
  const marketSignal = [
    row.pb != null && peerPb != null && row.pb < peerPb ? "市净率低于对标组" : "市净率不低于对标组",
    row.overdueNplDeviation != null && row.overdueNplDeviation > 1 ? "风险确认节奏需要联读偏离度" : "风险确认压力相对可控",
    row.feeAssetRatio != null && row.feeAssetRatio < avg(peers, "feeAssetRatio") ? "轻资本收入厚度弱于对标组" : "轻资本收入厚度不弱于对标组"
  ].join("，");
  if (op) {
    op.innerHTML = `<b>银行经营端判断：</b>${target}在 ${state.year} 年呈现“${opSignal}”的组合。对标 ${peerNames} 后，系统会优先判断回报是否来自主业修复、息差防守是否主动、风险和资本是否同步支撑增长。`;
  }
  if (mk) {
    mk.innerHTML = `<b>资本市场端判断：</b>${target}当前估值需要与经营质量交叉验证：${marketSignal}。若低市净率伴随强回报和充分风险确认，偏向价值重估；若低市净率伴随主业、中收和资本压力，则更接近质量折价。`;
  }
  updateSectionText(row, peers);
}

function compareWord(value, baseline, higherGood = true) {
  if (value == null || baseline == null) return "暂无可比数据";
  if (Math.abs(value - baseline) < 0.0001) return "接近";
  const better = higherGood ? value > baseline : value < baseline;
  return better ? "好于" : "弱于";
}

function boundedScore(raw) {
  if (raw === null || raw === undefined || Number.isNaN(raw)) return 50;
  return Math.max(0, Math.min(100, Math.round(raw)));
}

function relativeScore(value, peerValue, higherGood = true, neutral = 50) {
  if (value == null || peerValue == null || Number.isNaN(value) || Number.isNaN(peerValue)) return neutral;
  const scale = Math.max(Math.abs(peerValue), 1);
  const diff = higherGood ? (value - peerValue) / scale : (peerValue - value) / scale;
  return boundedScore(50 + diff * 42);
}

function scoreAverage(items) {
  const vals = items.filter((v) => v !== null && v !== undefined && !Number.isNaN(v));
  if (!vals.length) return 50;
  return boundedScore(vals.reduce((a, b) => a + b, 0) / vals.length);
}

function fallbackVqaEngine() {
  return {
    scoreBands: [
      { min: 72, label: "价值质量具备主动沟通基础" },
      { min: 58, label: "价值质量处于结构修复区间" },
      { min: 0, label: "价值质量仍需先修复经营底盘" }
    ],
    dimensions: {
      profit: { label: "盈利真实性", note: "主业与中收", weight: .24, metrics: [{ key: "coreRevenueGrowth", direction: "higherBetter" }, { key: "feeAssetRatio", direction: "higherBetter" }, { key: "trueCoreNonInterest", direction: "higherBetter" }, { key: "volatileIncomeShare", direction: "lowerBetter" }, { key: "cashProfitRatio", direction: "higherBetter" }], actionTitle: "先修主业造血", action: "围绕客户经营、结算沉淀、财富管理和场景服务建立中收修复清单。" },
      nim: { label: "息差防守", note: "资产负债对冲", weight: .22, metrics: [{ key: "nim", direction: "higherBetter" }, { key: "nimGapBp", direction: "lowerBetter" }, { key: "realLoanDepositSpread", direction: "higherBetter" }, { key: "timeDepositShare", direction: "lowerBetter" }, { key: "corporateDemandDepositShare", direction: "higherBetter" }], actionTitle: "先修资产负债底盘", action: "建立息差对冲缺口月度看板，拆解资产收益率变化和负债成本变化。" },
      risk: { label: "风险确认", note: "偏离与隐性暴露", weight: .22, metrics: [{ key: "npl", direction: "lowerBetter" }, { key: "hiddenNplExposure", direction: "lowerBetter" }, { key: "overdueNplDeviation", direction: "lowerBetter" }, { key: "provisionCoverage", direction: "higherBetter" }, { key: "retailRiskMax", direction: "lowerBetter" }], actionTitle: "风险确认前移", action: "把逾期账龄、五级分类、零售分产品不良和拨备节奏合并进同一预警框架。" },
      capital: { label: "资本效率", note: "RWA与资本余量", weight: .20, metrics: [{ key: "cet1Buffer", direction: "higherBetter" }, { key: "carBuffer", direction: "higherBetter" }, { key: "rwaDensity", direction: "lowerBetter" }, { key: "rwaProfitGrowthGap", direction: "lowerBetter" }, { key: "roa", direction: "higherBetter" }], actionTitle: "资本回报纪律", action: "把新增资产投放与RWA消耗、风险调整回报和资本余量挂钩。" },
      valuation: { label: "估值验证", note: "PB与质量匹配", weight: .12, metrics: [{ key: "pb", direction: "higherBetter" }, { key: "roa", direction: "higherBetter" }, { key: "coreRevenueGrowth", direction: "higherBetter" }, { key: "hiddenNplExposure", direction: "lowerBetter" }], actionTitle: "估值叙事重构", action: "先用经营质量证明低估值是价值错配，而不是质量折价。" }
    }
  };
}

function vqaEngine() {
  return analysisRules?.vqaEngine || fallbackVqaEngine();
}

function scoreBandLabel(score) {
  const bands = [...(vqaEngine().scoreBands || fallbackVqaEngine().scoreBands)].sort((a, b) => b.min - a.min);
  return bands.find((band) => score >= band.min)?.label || bands[bands.length - 1]?.label || "价值质量待判断";
}

function computeVqaDiagnosis(row, peers) {
  const p = (key) => avg(peers, key);
  const typeRows = currentRecords();
  const engine = vqaEngine();
  const dimensions = engine.dimensions || {};
  const dim = Object.fromEntries(Object.entries(dimensions).map(([key, cfg]) => {
    const scores = (cfg.metrics || []).map((metric) => {
      const higherGood = metric.direction !== "lowerBetter";
      return relativeScore(row[metric.key], p(metric.key), higherGood);
    });
    return [key, scoreAverage(scores)];
  }));
  const totalWeight = Object.values(dimensions).reduce((sum, cfg) => sum + (cfg.weight || 0), 0) || 1;
  const score = boundedScore(Object.entries(dim).reduce((sum, [key, val]) => sum + val * ((dimensions[key]?.weight || 0) / totalWeight), 0));
  const labels = Object.fromEntries(Object.entries(dimensions).map(([key, cfg]) => [key, cfg.label || key]));
  const sorted = Object.entries(dim).sort((a, b) => a[1] - b[1]);
  const weakest = sorted[0];
  const strongest = sorted[sorted.length - 1];
  const signal = scoreBandLabel(score);
  const facts = [
    `盈利真实性 ${dim.profit} 分，核心营收 ${fmt(row.coreRevenueGrowth)}，真实核心非息 ${fmt(row.trueCoreNonInterest)}。`,
    `息差防守 ${dim.nim} 分，息差对冲缺口 ${fmtBp(row.nimGapBp)}，真实存贷利差 ${fmt(row.realLoanDepositSpread)}。`,
    `风险确认 ${dim.risk} 分，隐性不良 ${fmt(row.hiddenNplExposure)}，偏离度 ${fmt(row.overdueNplDeviation, 2, "")}。`,
    `资本效率 ${dim.capital} 分，资本余量 ${fmt(row.carBuffer, 0, "bp")}，RWA密度 ${fmt(row.rwaDensity)}。`,
    `估值验证 ${dim.valuation} 分，PB ${row.pb == null ? "暂无" : Number(row.pb).toFixed(2) + "x"}，类型均值 ${avg(typeRows, "pb") == null ? "暂无" : avg(typeRows, "pb").toFixed(2) + "x"}。`
  ];
  const counterintuitiveAlerts = typeof v3CounterintuitiveAlerts === "function" ? v3CounterintuitiveAlerts(row, peers) : [];
  const transformationSequence = typeof v3TransformationSequence === "function" ? v3TransformationSequence(row) : null;
  return { score, dim, labels, dimensions, weakest: weakest[0], strongest: strongest[0], signal, facts, counterintuitiveAlerts, transformationSequence };
}

function updateVqaPanel(row, peers) {
  const diagnosis = computeVqaDiagnosis(row, peers);
  setText("vqaScore", String(diagnosis.score));
  setText("vqaSignal", diagnosis.signal);
  setHtml("vqaSummary", `${displayBankName(row.bank)}当前最强维度是${diagnosis.labels[diagnosis.strongest]}，最需要优先修复的是${diagnosis.labels[diagnosis.weakest]}。建议董事会先关注压力传导机制，再结合对标数据明确经营修复顺序。`);
  const dimRows = Object.entries(diagnosis.dim).map(([key, score]) => {
    const cfg = diagnosis.dimensions[key] || {};
    return `<div class="vqa-dim"><b>${cfg.label || key}</b><span>${score}</span><em>${cfg.note || ""}</em></div>`;
  }).join("");
  setHtml("vqaDimensions", dimRows);
  setHtml("vqaFactList", diagnosis.facts.map((fact) => `<li>${fact}</li>`).join(""));
  setHtml("vqaBoardLine", [
    `结论判断：${diagnosis.signal}，总分 ${diagnosis.score}。`,
    `董事会关注点：${diagnosis.labels[diagnosis.weakest]}是当前价值质量的主要约束。`,
    `管理动作：围绕${diagnosis.dimensions[diagnosis.weakest]?.actionTitle || diagnosis.labels[diagnosis.weakest]}形成 3-12 个月闭环。`
  ].map((item) => `<li>${item}</li>`).join(""));
  return diagnosis;
}

function vqaFactPack(row = targetRecord(), peers = peerRecords()) {
  if (!row) return null;
  const diagnosis = computeVqaDiagnosis(row, peers);
  const ordered = Object.keys(diagnosis.dim).sort((a, b) => diagnosis.dim[a] - diagnosis.dim[b]);
  return {
    diagnosis,
    summaryRows: [
      { 项目: "目标银行", 内容: displayBankName(row.bank) },
      { 项目: "分析年份", 内容: state.year },
      { 项目: "报告版本", 内容: state.reportVersion },
      { 项目: "对标组模板", 内容: state.peerTemplate },
      { 项目: "VQA总分", 内容: diagnosis.score },
      { 项目: "结论标签", 内容: diagnosis.signal },
      { 项目: "最强维度", 内容: diagnosis.labels[diagnosis.strongest] },
      { 项目: "最弱维度", 内容: diagnosis.labels[diagnosis.weakest] }
    ],
    dimensionRows: Object.entries(diagnosis.dim).map(([key, score]) => ({
      维度代码: key,
      维度名称: diagnosis.labels[key],
      分数: score,
      权重: diagnosis.dimensions[key]?.weight || "",
      说明: diagnosis.dimensions[key]?.note || "",
      行动标题: diagnosis.dimensions[key]?.actionTitle || "",
      行动建议: diagnosis.dimensions[key]?.action || ""
    })),
    factRows: diagnosis.facts.map((fact, idx) => ({ 序号: idx + 1, 事实: fact })),
    boardRows: [
      { 步骤: "结论判断", 内容: `${diagnosis.signal}，总分 ${diagnosis.score}` },
      { 步骤: "董事会关注点", 内容: `${diagnosis.labels[diagnosis.weakest]}是当前价值质量的主要约束` },
      { 步骤: "管理动作", 内容: `围绕${diagnosis.dimensions[diagnosis.weakest]?.actionTitle || diagnosis.labels[diagnosis.weakest]}形成 3-12 个月管理闭环` },
      { 步骤: "行动排序", 内容: ordered.map((key) => diagnosis.dimensions[key]?.actionTitle || diagnosis.labels[key]).join(" → ") }
    ]
  };
}

function metricDirection(key) {
  const dir = analysisRules?.metrics?.[key]?.direction;
  if (dir === "lowerBetter") return false;
  return true;
}

function metricSentence(row, peers, typeRows, key, digits = 2, suffix = "%") {
  const value = row?.[key];
  const peerValue = avg(peers, key);
  const typeValue = avg(typeRows, key);
  const higherGood = metricDirection(key);
  const label = metricLabel[key] || key;
  return `${label}${fmt(value, digits, suffix)}，${compareWord(value, peerValue, higherGood)}对标均值${fmt(peerValue, digits, suffix)}，${compareWord(value, typeValue, higherGood)}类型均值${fmt(typeValue, digits, suffix)}`;
}

function aiStyleEvaluation(title) {
  const t = targetRecord();
  const peers = peerRecords();
  const typeRows = currentRecords();
  if (!t) return {
    target: "目标银行数据不足，暂不生成评价。",
    peers: "对标银行数据不足，暂不生成评价。",
    type: "类型均值暂不可用。",
    action: "请先确认目标银行、对标银行和分析年份。"
  };
  const riskFlag = (t.hiddenNplExposure != null && avg(peers, "hiddenNplExposure") != null && t.hiddenNplExposure > avg(peers, "hiddenNplExposure")) || (t.overdueNplDeviation != null && t.overdueNplDeviation > 1);
  const nimFlag = t.nim != null && avg(peers, "nim") != null && t.nim < avg(peers, "nim");
  const profitFlag = t.coreRevenueGrowth != null && avg(peers, "coreRevenueGrowth") != null && t.coreRevenueGrowth < avg(peers, "coreRevenueGrowth");
  const capitalFlag = t.rwaDensity != null && avg(peers, "rwaDensity") != null && t.rwaDensity > avg(peers, "rwaDensity");
  const baseAction = [];
  if (nimFlag) baseAction.push("先修复负债成本和资产定价");
  if (profitFlag) baseAction.push("拆解核心营收和真实核心非息");
  if (riskFlag) baseAction.push("前移风险分类和隐性不良复核");
  if (capitalFlag) baseAction.push("约束风险加权资产消耗");
  if (!baseAction.length) baseAction.push("把优势指标转化为资本市场沟通材料");

  if (title.includes("收入结构") || title.includes("核心") || title.includes("轻资本") || title.includes("手续费") || title.includes("盈利") || title.includes("ROA") || title.includes("总资产收益率")) {
    return {
      target: `${t.bank}的盈利评价为：${metricSentence(t, peers, typeRows, "coreRevenueGrowth")}；${metricSentence(t, peers, typeRows, "feeAssetRatio", 3)}；真实核心非息${fmt(t.trueCoreNonInterest)}，高波动收入${fmt(t.volatileIncomeShare)}。这说明本页重点不是利润增速本身，而是收入是否来自可持续客户经营。`,
      peers: `对标组显示的参照是：核心营收均值${fmt(avg(peers, "coreRevenueGrowth"))}、手续费资产比均值${fmt(avg(peers, "feeAssetRatio"), 3)}、真实核心非息均值${fmt(avg(peers, "trueCoreNonInterest"))}。若目标银行低于这三项，说明轻资本收入尚未形成稳定支柱。`,
      type: `所选类型银行均值中，核心营收为${fmt(avg(typeRows, "coreRevenueGrowth"))}、非息占比为${fmt(avg(typeRows, "nonInterestShare"))}、成本收入比为${fmt(avg(typeRows, "costIncomeRatio"))}，用于判断这是单行能力差异还是类型共同压力。`,
      action: `董办解读：${baseAction.join("、")}。若真实核心非息偏低但高波动收入偏高，汇报时应把非息改善拆成“客户经营收入”和“市场波动收入”两条线。`
    };
  }
  if (title.includes("息差") || title.includes("负债") || title.includes("存款") || title.includes("收益成色") || title.includes("票面")) {
    return {
      target: `${t.bank}的息差评价为：${metricSentence(t, peers, typeRows, "nim")}；${metricSentence(t, peers, typeRows, "interestLiabilityCost")}；真实存贷利差${fmt(t.realLoanDepositSpread)}，NIM缺口${fmt(t.nimGapPoint, 2, "个百分点")}。这说明要同时看资产收益率下行和负债降本速度。`,
      peers: `对标组净息差均值${fmt(avg(peers, "nim"))}，计息负债成本率均值${fmt(avg(peers, "interestLiabilityCost"))}，定期存款占比均值${fmt(avg(peers, "timeDepositShare"))}。如果目标银行负债成本更高且定期化更重，息差压力通常更难靠短期投放修复。`,
      type: `类型均值显示净息差${fmt(avg(typeRows, "nim"))}、真实存贷利差${fmt(avg(typeRows, "realLoanDepositSpread"))}、流动性覆盖率${fmt(avg(typeRows, "liquidityCoverageRatio"))}，用于识别收益压力和流动性约束是否同步存在。`,
      action: `董办解读：${baseAction.join("、")}。若目标银行真实存贷利差弱于对标，优先动作应是重做客群定价、压降高成本负债、提升结算沉淀，而不是简单扩表。`
    };
  }
  if (title.includes("风险") || title.includes("偏离") || title.includes("不良") || title.includes("零售") || title.includes("拨备")) {
    return {
      target: `${t.bank}的风险评价为：${metricSentence(t, peers, typeRows, "npl")}；${metricSentence(t, peers, typeRows, "hiddenNplExposure")}；逾期不良偏离度${fmt(t.overdueNplDeviation, 2, "")}，拨备覆盖率${fmt(t.provisionCoverage)}。如果偏离度高于1，说明风险可能停留在逾期或关注阶段，没有完全进入不良确认。`,
      peers: `对标组隐性不良暴露率均值${fmt(avg(peers, "hiddenNplExposure"))}，个贷不良率均值${fmt(avg(peers, "personalLoanNpl"))}，拨备覆盖率均值${fmt(avg(peers, "provisionCoverage"))}。目标银行若风险更高但拨备不更厚，利润质量要打折评价。`,
      type: `类型均值显示公司贷款不良${fmt(avg(typeRows, "corporateLoanNpl"))}、个人贷款不良${fmt(avg(typeRows, "personalLoanNpl"))}、票据贴现不良${fmt(avg(typeRows, "billDiscountNpl"))}，可进一步定位风险来自对公、零售还是票据。`,
      action: `董办解读：${baseAction.join("、")}。下一步应把住房、消费、经营贷款的不良率拆开看，并联动五级分类和逾期账龄，形成风险迁徙视图。`
    };
  }
  if (title.includes("资本") || title.includes("成本") || title.includes("市净率") || title.includes("估值")) {
    return {
      target: `${t.bank}的资本估值评价为：${metricSentence(t, peers, typeRows, "roa")}；${metricSentence(t, peers, typeRows, "rwaDensity")}；资本充足率余量${fmt(t.carBuffer, 0, "bp")}，年末市净率${t.pb == null ? "暂无" : t.pb.toFixed(2) + "x"}。估值判断不能只看PB低不低，要看低PB是否有经营质量支撑。`,
      peers: `对标组ROA均值${fmt(avg(peers, "roa"))}，风险加权资产密度均值${fmt(avg(peers, "rwaDensity"))}，PB均值${avg(peers, "pb") == null ? "暂无" : avg(peers, "pb").toFixed(2) + "x"}。若目标银行ROA不弱但PB偏低，才更接近价值错配；若ROA和核心营收也弱，更接近质量折价。`,
      type: `类型均值显示ROA${fmt(avg(typeRows, "roa"))}、成本收入比${fmt(avg(typeRows, "costIncomeRatio"))}、PB${avg(typeRows, "pb") == null ? "暂无" : avg(typeRows, "pb").toFixed(2) + "x"}，可用于建立同类型估值锚。`,
      action: `董办解读：${baseAction.join("、")}。若风险加权资产增速高于利润修复速度，汇报中应把扩表从“规模增长”改写为“资本消耗问题”。`
    };
  }
  return {
    target: `${t.bank}当前总资产收益率${fmt(t.roa)}，核心营收增速${fmt(t.coreRevenueGrowth)}，净息差${fmt(t.nim)}，不良率${fmt(t.npl)}，市净率${t.pb == null ? "暂无" : t.pb.toFixed(2) + "x"}。这些指标共同决定经营质量评价。`,
    peers: `对标组用于识别目标银行偏离方向：ROA均值${fmt(avg(peers, "roa"))}，核心营收均值${fmt(avg(peers, "coreRevenueGrowth"))}，PB均值${avg(peers, "pb") == null ? "暂无" : avg(peers, "pb").toFixed(2) + "x"}。`,
    type: `类型均值用于判断偏离是否属于行业共性，当前所选类型样本数为${typeRows.length}。`,
    action: `董办解读：${baseAction.join("、")}。`
  };
}

function evaluateWarning(row, peers) {
  if (!row) return { level: "yellow", message: analysisRules?.warningRules?.yellow?.message || "" };
  const peerAvg = (key) => avg(peers, key);
  const tests = {
    coreWeak: row.coreRevenueGrowth < 0 && row.coreRevenueGrowth < peerAvg("coreRevenueGrowth"),
    nimWeak: row.nim < peerAvg("nim") && row.interestLiabilityCost > peerAvg("interestLiabilityCost"),
    deviationHigh: row.overdueNplDeviation > 1.2 && row.overdueNplDeviation > peerAvg("overdueNplDeviation"),
    coverageWeak: row.provisionCoverage < peerAvg("provisionCoverage") && (row.provisionCoverageChange == null || row.provisionCoverageChange < 0),
    hiddenRiskHigh: row.hiddenNplExposure != null && row.hiddenNplExposure > peerAvg("hiddenNplExposure") && row.overdueNplDeviation > 1,
    volatileIncomeHigh: row.volatileIncomeShare != null && row.volatileIncomeShare > peerAvg("volatileIncomeShare") && row.coreRevenueGrowth < peerAvg("coreRevenueGrowth"),
    liquidityTight: row.liquidityCoverageRatio != null && row.liquidityCoverageRatio < peerAvg("liquidityCoverageRatio") && row.liquidityCoverageRatio < 120,
    capitalTight: row.cet1Buffer != null && row.cet1Buffer < 150,
    capitalConsume: row.rwaDensity > peerAvg("rwaDensity") && row.roa < peerAvg("roa"),
    pbQualityWeak: row.pb < peerAvg("pb") && row.roa < peerAvg("roa") && row.coreRevenueGrowth < peerAvg("coreRevenueGrowth")
  };
  const redCount = Object.values(tests).filter(Boolean).length;
  const yellowCount = [
    row.coreRevenueGrowth > 0 && row.coreRevenueGrowth < peerAvg("coreRevenueGrowth"),
    row.feeAssetRatio < peerAvg("feeAssetRatio"),
    row.trueCoreNonInterest < peerAvg("trueCoreNonInterest") && row.volatileIncomeShare > peerAvg("volatileIncomeShare"),
    row.nim >= (peerAvg("nim") || 0) * 0.95 && row.interestLiabilityCost > peerAvg("interestLiabilityCost"),
    row.liquidityCoverageRatio < peerAvg("liquidityCoverageRatio"),
    row.overdueNplDeviation > 1 && row.provisionCoverage > peerAvg("provisionCoverage"),
    row.pb < peerAvg("pb") && (row.roa >= peerAvg("roa") || row.provisionCoverage >= peerAvg("provisionCoverage"))
  ].filter(Boolean).length;
  const greenCount = [
    row.roa > peerAvg("roa"),
    row.coreRevenueGrowth > peerAvg("coreRevenueGrowth"),
    row.feeAssetRatio > peerAvg("feeAssetRatio"),
    row.trueCoreNonInterest > peerAvg("trueCoreNonInterest") && row.volatileIncomeShare <= peerAvg("volatileIncomeShare"),
    row.nim > peerAvg("nim") || row.interestLiabilityCost < peerAvg("interestLiabilityCost"),
    row.overdueNplDeviation < peerAvg("overdueNplDeviation"),
    row.provisionCoverage > peerAvg("provisionCoverage"),
    row.cet1Buffer > 300
  ].filter(Boolean).length;
  if (redCount >= 2) return { level: "red", message: analysisRules?.warningRules?.red?.message || fallbackAnalysisRules().warningRules.red.message, tests };
  if (greenCount >= 3) return { level: "green", message: analysisRules?.warningRules?.green?.message || fallbackAnalysisRules().warningRules.green.message, tests };
  if (yellowCount >= 2) return { level: "yellow", message: analysisRules?.warningRules?.yellow?.message || fallbackAnalysisRules().warningRules.yellow.message, tests };
  return { level: "yellow", message: analysisRules?.warningRules?.yellow?.message || fallbackAnalysisRules().warningRules.yellow.message, tests };
}

function updateSectionText(row, peers) {
  if (!row) return;
  const target = displayBankName(row.bank);
  const diagnosis = computeVqaDiagnosis(row, peers);
  const peerText = displayBankList(state.peers);
  const typeText = state.types.length ? state.types.join("、") : "所选类型银行";
  const typeRows = currentRecords();
  const peerCore = avg(peers, "coreRevenueGrowth");
  const peerFee = avg(peers, "feeAssetRatio");
  const peerGap = avg(peers, "nimGapBp");
  const peerDeviation = avg(peers, "overdueNplDeviation");
  const peerPb = avg(peers, "pb");
  const typeCore = avg(typeRows, "coreRevenueGrowth");
  const typeFee = avg(typeRows, "feeAssetRatio");
  const typeGap = avg(typeRows, "nimGapBp");
  const typeDeviation = avg(typeRows, "overdueNplDeviation");
  const typePb = avg(typeRows, "pb");
  const warning = evaluateWarning(row, peers);

  setHtml("overviewTitle", `${target}VQA总分 ${diagnosis.score}：${diagnosis.signal}，短板集中在${diagnosis.labels[diagnosis.weakest]}。`);
  setHtml("overviewNote", `${state.year} 年截面｜对标银行：${peerText}｜行业参照：${typeText}。本页基于关键事实形成董事会汇报判断：${diagnosis.facts.join(" ")}`);

  const profitWeak = row.coreRevenueGrowth != null && peerCore != null && row.coreRevenueGrowth < peerCore;
  setHtml("profitTitle", `${target}核心营收增速${fmt(row.coreRevenueGrowth)}，${compareWord(row.coreRevenueGrowth, peerCore)}对标组均值，盈利质量需与中收和拨备前利润联读。`);
  setHtml("profitNote", `对标组核心营收均值为 ${fmt(peerCore)}，${typeText}类型均值为 ${fmt(typeCore)}；手续费资产比方面，${target}为 ${fmt(row.feeAssetRatio, 3)}，类型均值为 ${fmt(typeFee, 3)}。`);

  const gapBad = row.nimGapBp != null && row.nimGapBp > 0;
  setHtml("nimTitle", `${target}息差对冲缺口为 ${fmtBp(row.nimGapBp)}，${gapBad ? "负债端降本尚未完全跟上资产端让价" : "负债端对冲相对主动"}。`);
  setHtml("nimNote", `对标组息差对冲缺口均值为 ${fmtBp(peerGap)}，${typeText}类型均值为 ${fmtBp(typeGap)}；图中会同步显示所选类型均值线或均值点。`);
  setHtml("nimInsight", `<b>管理含义：</b>${target}若持续高于对标组或类型均值，说明资产负债修复应优先于扩表冲量；若已低于均值，则应重点巩固活期沉淀和负债定价成果。`);

  const riskHigh = row.overdueNplDeviation != null && row.overdueNplDeviation > 1;
  setHtml("riskTitle", `${target}逾期不良偏离度为 ${fmt(row.overdueNplDeviation, 2, "")}，${riskHigh ? "风险确认节奏需要重点校验" : "风险确认节奏相对可控"}。`);
  setHtml("riskNote", `对标组偏离度均值为 ${fmt(peerDeviation, 2, "")}，${typeText}类型均值为 ${fmt(typeDeviation, 2, "")}；同时联读不良率、个贷不良和拨备覆盖率。`);
  setHtml("riskInsight", `<b>管理建议：</b>若${target}偏离度高于对标组或类型均值，并且拨备覆盖率下降，则优先推进风险前移、分类复核和拨备使用节奏复盘。`);

  setHtml("capitalTitle", `${target}年末市净率为 ${row.pb == null ? "暂无" : row.pb.toFixed(2) + "x"}，需要与回报、风险确认和资本效率交叉验证。`);
  setHtml("capitalNote", `对标组市净率均值为 ${peerPb == null ? "暂无" : peerPb.toFixed(2) + "x"}，${typeText}类型均值为 ${typePb == null ? "暂无" : typePb.toFixed(2) + "x"}；图表将把市净率与经营质量放在同一坐标。`);
  setHtml("capitalInsight", `<b>资本市场端建议：</b>若${target}市净率低于对标组但总资产收益率、中收和风险确认不弱，具备价值重估叙事；若市净率低同时主业和风险指标弱，则应先修复经营质量。`);

  const actions = [];
  if (diagnosis.weakest === "nim" || gapBad) actions.push("资产负债缺口修复");
  if (diagnosis.weakest === "profit" || (row.coreRevenueGrowth != null && row.coreRevenueGrowth < 0)) actions.push("核心营收修复");
  if (row.feeAssetRatio != null && peerFee != null && row.feeAssetRatio < peerFee) actions.push("中收重构");
  if (diagnosis.weakest === "risk" || riskHigh) actions.push("风险确认前移");
  if (diagnosis.weakest === "capital") actions.push("资本消耗约束");
  if (diagnosis.weakest === "valuation") actions.push("估值沟通重构");
  if (!actions.length) actions.push("资本效率和估值沟通");
  setHtml("actionTitle", `${target}后续行动优先级：${actions.join("、")}。`);
  setHtml("actionNote", `该优先级由 VQA 总分 ${diagnosis.score}、短板维度“${diagnosis.labels[diagnosis.weakest]}”、${peerText} 对标组均值和${typeText} 类型均值共同生成。当前规则结论：${warning.message}`);
  if (typeof renderV5ValuePanel === "function") renderV5ValuePanel(row);
  if (typeof renderV6BoardroomLayer === "function") renderV6BoardroomLayer(row);
  updateRecommendations(diagnosis, row, peers);
  updateEnhancedInsights(row, peers);
  updateStoryText(row, peers, actions);
}

function updateRecommendations(diagnosis, row, peers) {
  const order = [diagnosis.weakest, ...Object.keys(diagnosis.dim).filter((key) => key !== diagnosis.weakest).sort((a, b) => diagnosis.dim[a] - diagnosis.dim[b])].slice(0, 4);
  order.forEach((key, idx) => {
    const el = document.getElementById(`rec${idx + 1}`);
    const cfg = diagnosis.dimensions[key];
    if (el && cfg) {
      const prefix = ["一", "二", "三", "四"][idx] || String(idx + 1);
      el.innerHTML = `<b>${prefix}、${cfg.actionTitle || cfg.label}</b><p>${cfg.action || ""}</p>`;
    }
  });
  updateTopicExplainers(row, peers, diagnosis);
}

function topicExplainerRows(row = targetRecord(), peers = peerRecords(), diagnosis = computeVqaDiagnosis(row, peers)) {
  if (!row) return [];
  const typeRows = currentRecords();
  return [
    {
      topic: "盈利真实性",
      metric: "核心营收 + 真实非息",
      fact: `核心营收${fmt(row.coreRevenueGrowth)}，对标均值${fmt(avg(peers, "coreRevenueGrowth"))}；真实核心非息${fmt(row.trueCoreNonInterest)}，高波动收入${fmt(row.volatileIncomeShare)}。`,
      logic: "利润修复必须先验证主业造血和稳定非息，避免把投资波动或拨备节奏误读为经营改善。",
      action: diagnosis.dimensions.profit?.actionTitle || "先修主业造血"
    },
    {
      topic: "息差对冲",
      metric: "NIM + 负债成本",
      fact: `净息差${fmt(row.nim)}，息差对冲缺口${fmtBp(row.nimGapBp)}，定期存款占比${fmt(row.timeDepositShare)}。`,
      logic: "若资产收益率下行快于负债成本下降，优先级应从扩表转向负债结构和客群沉淀。",
      action: diagnosis.dimensions.nim?.actionTitle || "修复资产负债底盘"
    },
    {
      topic: "风险确认",
      metric: "偏离度 + 隐性不良",
      fact: `不良率${fmt(row.npl)}，偏离度${fmt(row.overdueNplDeviation, 2, "")}，隐性不良暴露率${fmt(row.hiddenNplExposure)}，拨备覆盖率${fmt(row.provisionCoverage)}。`,
      logic: "风险判断要看确认节奏，不只看当期不良率；偏离度和隐性暴露会影响利润可持续性。",
      action: diagnosis.dimensions.risk?.actionTitle || "风险确认前移"
    },
    {
      topic: "资本效率",
      metric: "RWA + 资本余量",
      fact: `核心一级资本余量${fmt(row.cet1Buffer, 0, "bp")}，RWA密度${fmt(row.rwaDensity)}，RWA与利润增速缺口${fmt(row.rwaProfitGrowthGap)}。`,
      logic: "扩表如果消耗资本但没有形成回报，会削弱后续战略自由度和估值叙事。",
      action: diagnosis.dimensions.capital?.actionTitle || "资本回报纪律"
    },
    {
      topic: "估值验证",
      metric: "PB + ROA",
      fact: `年末市净率${row.pb == null ? "暂无" : row.pb.toFixed(2) + "x"}，ROA${fmt(row.roa)}，对标PB均值${avg(peers, "pb") == null ? "暂无" : avg(peers, "pb").toFixed(2) + "x"}。`,
      logic: "低 PB 不能直接定义为低估，需要用盈利、风险和资本效率证明是价值错配而不是质量折价。",
      action: diagnosis.dimensions.valuation?.actionTitle || "估值叙事重构"
    }
  ];
}

function updateTopicExplainers(row, peers, diagnosis) {
  const host = document.getElementById("topicExplainers");
  if (!host) return;
  host.innerHTML = topicExplainerRows(row, peers, diagnosis).map((item) => `
    <div class="topic-card">
      <b>${item.topic}</b>
      <p>${item.fact}</p>
      <p><strong>${item.action}：</strong>${item.logic}</p>
    </div>
  `).join("");
}

function fallbackTopicDefinitions() {
  return [
    {
      id: "profit",
      title: "盈利真实性专题",
      question: "董事会需要判断：当前利润修复是来自客户经营和主业造血，还是来自投资波动、拨备节奏或一次性因素。",
      metrics: ["coreRevenueGrowth", "feeAssetRatio", "trueCoreNonInterest", "volatileIncomeShare", "cashProfitRatio"],
      mechanism: "若核心营收和真实核心非息同步改善，且现金利润有支撑，盈利修复更具可持续性；若高波动收入占比偏高，则需要把市场收益与经营能力分开表达。",
      actions: ["拆分主业收入、手续费、投资收益和其他非息，形成利润来源桥。", "对低于对标组的轻资本收入设置客户、产品和渠道口径的改进目标。", "把经营现金流与净利润联动披露，增强利润质量解释力。"]
    },
    {
      id: "nim",
      title: "息差对冲专题",
      question: "董事会需要判断：资产端收益率下行后，负债端成本压降和存款结构优化能否形成有效对冲。",
      metrics: ["nim", "nimGapBp", "realLoanDepositSpread", "earningAssetYield", "interestLiabilityCost", "timeDepositShare"],
      mechanism: "息差压力不是单一价格问题，而是资产定价、负债期限、存款客群和同业竞争共同作用的结果；对冲缺口越大，越需要把扩表目标让位于负债质量和客户沉淀。",
      actions: ["把核心存款、活期占比和重点客群留存作为资产负债管理前置指标。", "对低收益资产投放设置边际收益红线，避免以规模替代利差。", "按区域和客群复盘存款定期化来源，明确负债成本压降路径。"]
    },
    {
      id: "risk",
      title: "风险确认专题",
      question: "董事会需要判断：当期不良率是否充分反映真实风险，逾期、关注和隐性不良是否正在向利润表滞后传导。",
      metrics: ["npl", "overdueNplDeviation", "hiddenNplExposure", "provisionCoverage", "personalLoanNpl", "corporateLoanNpl"],
      mechanism: "风险质量要看确认节奏和缓冲能力。偏离度、隐性不良和分产品不良上行，往往意味着未来拨备消耗和利润波动压力尚未完全释放。",
      actions: ["建立逾期、关注、展期续贷和不良迁徙的月度看板。", "把个贷、公司和票据风险拆开汇报，避免用综合不良率掩盖结构问题。", "结合拨备覆盖率和利润承受力，制定风险确认节奏。"]
    },
    {
      id: "capital",
      title: "资本效率专题",
      question: "董事会需要判断：规模扩张是否创造了与资本消耗相匹配的回报，还是形成了风险加权资产压力。",
      metrics: ["cet1Buffer", "carBuffer", "rwaDensity", "estimatedRwaGrowth", "rwaProfitGrowthGap", "roa"],
      mechanism: "资本效率的核心不是资产增速，而是风险加权资产增速、资本余量和盈利修复之间是否匹配；若RWA快于利润，扩表会削弱后续战略自由度。",
      actions: ["对高资本占用业务设置RAROC或资本回报约束。", "把RWA增速、利润增速和核心营收增速放在同一张管理看板。", "优先发展低资本占用、低波动且可交叉销售的客户经营场景。"]
    },
    {
      id: "valuation",
      title: "估值验证专题",
      question: "董事会需要判断：当前PB折价是市场错配、同业低估，还是盈利、风险和资本效率共同导致的质量折价。",
      metrics: ["pb", "pbMid", "roa", "coreRevenueGrowth", "hiddenNplExposure", "carBuffer"],
      mechanism: "估值修复需要经营端证据支撑。PB不能孤立解释，必须与ROA、核心营收、风险确认和资本余量联读，才能形成资本市场可接受的价值叙事。",
      actions: ["把估值沟通从“低PB”升级为“盈利质量、风险透明度、资本纪律”的证据链。", "对低于对标的关键经营指标设置半年和年度改善节点。", "在投资者沟通材料中用同业对标说明折价收敛路径。"]
    }
  ];
}

function topicDefinitions() {
  const configured = analysisRules?.topics;
  if (configured && Object.keys(configured).length) {
    return Object.values(configured).map((topic) => {
      try {
        return {
          id: topic.id,
          title: topic.title,
          question: topic.question,
          metrics: (topic.metrics || []).map((metric) => (typeof metric === "string" ? metric : metric.key)),
          metricConfig: (topic.metrics || []).map((metric) => (typeof metric === "string" ? { key: metric, weight: 1 } : metric)),
          mechanism: topic.mechanism,
          actions: topic.actions || [],
          thresholds: topic.thresholds,
          requiredCitations: topic.requiredCitations || [],
          forbiddenPhrases: topic.forbiddenPhrases || []
        };
      } catch (error) {
        return null;
      }
    }).filter(Boolean);
  }
  return fallbackTopicDefinitions().map((topic) => ({
    ...topic,
    metricConfig: topic.metrics.map((key) => ({ key, weight: 1 })),
    requiredCitations: topic.metrics.slice(0, 3),
    forbiddenPhrases: []
  }));
}

function readyQualityForMetric(bank, year, key) {
  const qualityRows = Array.isArray(readyMetricQuality) ? readyMetricQuality : [];
  const targetBank = displayBankName(bank || state.target);
  return qualityRows.find((item) => {
    const itemBank = displayBankName(item.bank);
    return item.metric === key && Number(item.year) === Number(year) && (item.bank === bank || itemBank === targetBank);
  }) || null;
}

function topicDataStatusMeta(status) {
  const map = {
    available: { label: "可用", tone: "green" },
    scraped_available_not_fieldized: { label: "待字段化", tone: "orange" },
    calculation_input_missing: { label: "计算输入不足", tone: "yellow" },
    source_missing: { label: "三源缺失", tone: "red" }
  };
  return map[status] || { label: status || "待复核", tone: "gray" };
}

function topicDataSourceLabel(source) {
  const map = {
    main: "主数据",
    tushare: "Tushare",
    tushare_market: "Tushare行情",
    annual_report_scraped: "年报抓取"
  };
  return map[source] || source || "未选定";
}

function topicFactQuality(row, key, value) {
  const quality = readyQualityForMetric(row?.bank || state.target, state.year, key);
  const rowStatus = row?._readyFieldStatus?.[key];
  const rowSource = row?._readyFieldSources?.[key];
  const status = quality?.status || rowStatus || (value == null ? "source_missing" : "available");
  const meta = topicDataStatusMeta(status);
  const selectedSource = quality?.selectedSource || rowSource || (value == null ? "" : "main");
  const missingReason = quality?.missingReason || (status === "available" ? "" : meta.label);
  return {
    status,
    statusLabel: meta.label,
    statusTone: meta.tone,
    selectedSource,
    sourceLabel: topicDataSourceLabel(selectedSource),
    missingReason,
    scrapedSource: quality?.scrapedSource || "",
    relatedScrapedTables: quality?.relatedScrapedTables || ""
  };
}

function topicFactPackRows(topicId = state.activeTopic) {
  const row = targetRecord();
  const peers = peerRecords();
  const typeRows = currentRecords().filter((r) => state.types.includes(r.type));
  const allRows = currentRecords();
  const topic = topicDefinitions().find((item) => item.id === topicId) || topicDefinitions()[0];
  return topic.metrics.map((key) => {
    const value = row?.[key];
    const peerAvg = avg(peers, key);
    const typeAvg = avg(typeRows, key);
    const yoy = row ? yoyValue(row.bank, key) : null;
    const fiveYear = row ? fiveYearValue(row.bank, key) : null;
    const calibration = typeof metricCalibrationRisk === "function" ? metricCalibrationRisk(key, [row, ...peers].filter(Boolean)) : null;
    const quality = topicFactQuality(row, key, value);
    return {
      专题: topic.title,
      指标代码: key,
      指标名称: metricLabel[key] || fieldName(key),
      目标银行: displayBankName(row?.bank || state.target),
      目标值: metricDisplayValue(key, value),
      对标均值: metricDisplayValue(key, peerAvg),
      类型均值: metricDisplayValue(key, typeAvg),
      对标差距: value == null || peerAvg == null ? "暂无" : metricDisplayValue(key, value - peerAvg),
      一年变化: yoy == null ? "暂无" : metricDisplayValue(key, yoy),
      五年变化: fiveYear == null ? "暂无" : metricDisplayValue(key, fiveYear),
      分位: rankPercentile(value, allRows, key, metricDirection(key)),
      完整性: completeness([row, ...peers].filter(Boolean), key) == null ? "暂无" : fmt(completeness([row, ...peers].filter(Boolean), key) * 100, 1),
      口径风险等级: calibration?.level || "L2",
      口径风险标签: calibration?.label || "L2 可比，需脚注",
      报告使用建议: calibration?.decisionUse || "主报告+脚注",
      口径脚注: calibration?.note || "建议保留指标口径、样本覆盖和数据来源说明。",
      数据状态代码: quality.status,
      数据状态: quality.statusLabel,
      数据状态色阶: quality.statusTone,
      数据来源: quality.sourceLabel,
      缺失原因: quality.missingReason || "无",
      抓取来源: quality.scrapedSource || quality.relatedScrapedTables || "无",
      是否可用证据: quality.status === "available" && value != null ? "是" : "否"
    };
  });
}

function topicMetricWeight(topic, key) {
  const cfg = topic.metricConfig?.find((item) => item.key === key);
  return cfg?.weight ?? 1;
}

function isFactUsableAsEvidence(fact) {
  if (!fact || fact.目标值 === "暂无" || String(fact.分位 || "").includes("暂无")) return false;
  if (fact.数据状态代码 && fact.数据状态代码 !== "available") return false;
  return true;
}

function topicAvailableFacts(facts = []) {
  return facts.filter(isFactUsableAsEvidence);
}

function topicDataBoundaryFacts(facts = []) {
  return facts.filter((fact) => !isFactUsableAsEvidence(fact));
}

function topicPercentileScore(fact) {
  if (!isFactUsableAsEvidence(fact)) return null;
  return topicPercentile(fact);
}

function pickTopicEvidenceMetrics(topic, facts, weakFacts, strongFacts, citations) {
  const picked = [];
  const add = (fact) => {
    if (!isFactUsableAsEvidence(fact)) return;
    if (picked.some((item) => item.指标代码 === fact.指标代码)) return;
    picked.push(fact);
  };
  (citations || []).forEach(add);
  weakFacts.forEach(add);
  strongFacts.forEach(add);
  facts
    .filter(isFactUsableAsEvidence)
    .sort((a, b) => topicPercentile(a) - topicPercentile(b))
    .forEach(add);
  if (picked.length >= 3) return picked.slice(0, 6);
  facts.filter(isFactUsableAsEvidence).forEach(add);
  return picked.slice(0, Math.max(picked.length, Math.min(6, picked.length)));
}

function topicJudgement(topicId = state.activeTopic, facts = topicFactPackRows(topicId)) {
  const topic = topicDefinitions().find((item) => item.id === topicId) || topicDefinitions()[0];
  const availableFacts = topicAvailableFacts(facts);
  const dataBoundary = topicDataBoundaryFacts(facts);
  const thresholds = topicThresholds(topic);
  const redCfg = thresholds.red || {};
  const yellowCfg = thresholds.yellow || {};
  const greenCfg = thresholds.green || {};
  const weakBelow = redCfg.weakPercentileBelow ?? 40;
  const yellowBelow = yellowCfg.weakPercentileBelow ?? 60;
  const strongAbove = greenCfg.strongPercentileAbove ?? 70;
  if (!availableFacts.length) {
    const citations = topicCitationFacts(topic, facts);
    return {
      level: "red",
      signal: "红灯：数据不足，需先复核",
      headline: `${topic.title}当前缺少可直接支撑判断的核心证据，应先完成字段化或补齐计算输入，再进入正式解读。`,
      evidence: [],
      avgScore: 0,
      topic,
      citationDegraded: true,
      missingRequired: citations.missingRequired || topic.metrics.map(fieldName),
      dataBoundary
    };
  }
  const weightSum = availableFacts.reduce((sum, fact) => sum + topicMetricWeight(topic, fact.指标代码), 0) || availableFacts.length || 1;
  const avgScore = availableFacts.reduce((sum, fact) => sum + topicPercentile(fact) * topicMetricWeight(topic, fact.指标代码), 0) / weightSum;
  const weakFacts = availableFacts.filter((fact) => topicPercentileScore(fact) < weakBelow);
  const mediumFacts = availableFacts.filter((fact) => topicPercentileScore(fact) >= weakBelow && topicPercentileScore(fact) < yellowBelow);
  const strongFacts = availableFacts.filter((fact) => topicPercentileScore(fact) >= strongAbove);
  let level = "green";
  if (weakFacts.length >= (redCfg.minWeakMetrics ?? 2) || avgScore < (redCfg.avgScoreBelow ?? 45)) {
    level = "red";
  } else if (weakFacts.length >= (yellowCfg.minWeakMetrics ?? 1) || mediumFacts.length || avgScore < (yellowCfg.avgScoreBelow ?? 60)) {
    level = "yellow";
  } else if (strongFacts.length >= (greenCfg.minStrongMetrics ?? 2)) {
    level = "green";
  } else {
    level = "yellow";
  }
  const signal = topicSignalText(level);
  const citations = topicCitationFacts(topic, facts);
  const evidenceFacts = pickTopicEvidenceMetrics(topic, availableFacts, weakFacts, strongFacts, citations);
  const headline = level === "green"
    ? `${topic.title}当前具备较好的事实基础，建议把优势指标转化为董事会和资本市场都能理解的质量叙事。`
    : level === "yellow"
      ? `${topic.title}处于结构性修复区间，关键不在单项指标高低，而在短板指标能否形成连续改善证据。`
      : `${topic.title}需要作为本轮汇报的优先解释事项，先说明压力来源，再提出可追踪的管理动作。`;
  return {
    level,
    signal,
    headline,
    evidence: evidenceFacts,
    avgScore: Math.round(avgScore),
    topic,
    citationDegraded: citations.citationDegraded,
    missingRequired: citations.missingRequired || [],
    dataBoundary
  };
}

function topicCitationFacts(topic, facts) {
  const required = topic.requiredCitations?.length ? topic.requiredCitations : facts.slice(0, 3).map((fact) => fact.指标代码);
  const picked = [];
  const missingRequired = [];
  required.forEach((key) => {
    const fact = facts.find((item) => item.指标代码 === key);
    if (isFactUsableAsEvidence(fact)) {
      picked.push({ ...fact, citationRole: "required" });
    } else if (fact) {
      missingRequired.push(fieldName(key));
    }
  });
  if (picked.length < 2) {
    facts
      .filter(isFactUsableAsEvidence)
      .filter((fact) => !picked.some((item) => item.指标代码 === fact.指标代码))
      .sort((a, b) => topicPercentile(a) - topicPercentile(b))
      .slice(0, Math.max(2 - picked.length, 0))
      .forEach((fact) => picked.push({ ...fact, citationRole: "fallback" }));
  }
  picked.citationDegraded = missingRequired.length > 0;
  picked.missingRequired = missingRequired;
  return picked;
}

function topicCitationTags(facts) {
  return facts.map((fact) => `<span class="topic-citation-tag">${fact.指标名称} ${fact.目标值}</span>`).join("");
}

function chartAnnotationBlock(title) {
  const text = typeof chartAnnotationText === "function"
    ? chartAnnotationText(title, targetRecord())
    : `${displayBankName(state.target)}本图需要结合目标银行、对标组和类型均值共同阅读。`;
  return `
    <div class="chart-annotation">
      <b>读图结论</b>
      <p>${text}</p>
    </div>`;
}

function topicMechanismModuleKeys(topicId = state.activeTopic) {
  const map = {
    profit: ["dupont", "profit"],
    nim: ["nim", "benchmark"],
    risk: ["benchmark"],
    capital: ["dupont", "benchmark"],
    valuation: ["dupont", "benchmark"],
    capitalMarket: ["dupont", "benchmark"],
    retailRisk: ["benchmark"],
    depositLoanDeepDive: ["nim", "benchmark"]
  };
  return map[topicId] || ["benchmark"];
}

function topicMechanismRows(topicId = state.activeTopic) {
  const pack = typeof buildMechanismFactPackObject === "function" ? buildMechanismFactPackObject() : null;
  if (!pack?.modules) return [];
  const topic = topicDefinitions().find((item) => item.id === topicId);
  const topicMetricSet = new Set(topic?.metrics || []);
  const moduleKeys = topicMechanismModuleKeys(topicId);
  const rows = moduleKeys.flatMap((key) => pack.modules[key]?.rows || []);
  const exactRows = rows.filter((row) => topicMetricSet.has(row.指标代码));
  const selected = exactRows.length >= 3 ? exactRows : rows;
  return selected.slice(0, 8);
}

function topicMechanismPanelHtml(topicId = state.activeTopic) {
  const rows = topicMechanismRows(topicId);
  const modules = [...new Set(rows.map((row) => row.分析模块).filter(Boolean))];
  return `
    <div class="topic-mechanism-panel">
      <div class="topic-mechanism-head">
        <b>机制归因</b>
        <span>${modules.join(" / ") || "待补归因模块"}</span>
      </div>
      <div class="topic-mechanism-list">${rows.map((row) => `
        <div class="topic-mechanism-row">
          <span>${row.分析模块}</span>
          <b>${metricLink(row.指标代码, row.指标名称 || row.指标代码)}</b>
          <em>目标 ${row.目标值 || "暂无"}｜基准 ${row.对标值 || "暂无"}</em>
          <p>${row.判断 || row.模块结论 || "用于解释本专题差距来源。"}</p>
          <small>口径风险 ${row.口径风险等级 || "L2"}｜${row.报告使用建议 || "主报告+脚注"}</small>
        </div>
      `).join("") || `<p class="topic-mechanism-empty">机制归因数据不足，暂不形成专题侧栏。</p>`}</div>
    </div>`;
}

function topicProfitWaterfallPanelHtml() {
  const row = targetRecord();
  const pack = typeof netProfitAttribution === "function" ? netProfitAttribution(row) : null;
  const items = (pack?.items || []).slice(0, 6);
  if (!items.length) return "";
  const max = Math.max(...items.map((item) => Math.abs(Number(item.value) || 0)), 1);
  const lead = items
    .slice()
    .sort((a, b) => Math.abs(Number(b.value) || 0) - Math.abs(Number(a.value) || 0))[0];
  const leadText = lead
    ? `${lead.label}是本轮利润变化中最需要解释的驱动，贡献为${metricDisplayValue("netProfit", lead.value)}。`
    : "当前利润变化仍需补充驱动项。";
  return `
    <div class="topic-mechanism-chart topic-profit-waterfall">
      <div class="topic-chart-head">
        <span>机制图表</span>
        <b>净利润归因瀑布</b>
        <em>正贡献和拖累项分开看，避免只解释净利润结果。</em>
      </div>
      <div class="topic-waterfall-bars">${items.map((item) => {
        const value = Number(item.value) || 0;
        const tone = value > 0 ? "positive" : value < 0 ? "negative" : "neutral";
        const width = Math.max(8, Math.min(100, Math.abs(value) / max * 100));
        return `
          <div class="topic-waterfall-row tone-${tone}">
            <span>${item.label}</span>
            <i><em style="width:${width}%"></em></i>
            <b>${metricDisplayValue("netProfit", value)}</b>
          </div>`;
      }).join("")}</div>
      ${chartAnnotationBlock("净利润归因瀑布")}
      <p><b>经营含义：</b>${leadText}后续专题应继续复核核心营收、费用刚性与拨备节奏是否同向支撑。</p>
    </div>`;
}

function topicBenchmarkLinePanelHtml(key = "nim") {
  if (typeof benchmarkLineChart !== "function") return "";
  const sample = typeof benchmarkSampleSummary === "function" ? benchmarkSampleSummary(key, peerRecords()) : null;
  return `
    <div class="topic-mechanism-chart topic-benchmark-line">
      <div class="topic-chart-head">
        <span>机制图表</span>
        <b>${fieldName(key)}多基准线</b>
        <em>同一指标同时看对标组、类型均值、全样本和监管线，减少单一均值误判。</em>
      </div>
      <div class="topic-benchmark-svg">${benchmarkLineChart(key, { title: `${displayBankName(state.target)} ${fieldName(key)}多基准线` })}</div>
      ${chartAnnotationBlock(`${fieldName(key)}多基准线`)}
      ${sample ? `<p><b>样本N：</b>对标组N=${sample.peerN}｜类型N=${sample.typeN}｜全样本N=${sample.allN}</p>` : ""}
    </div>`;
}

function topicMechanismChartPanelHtml(topicId = state.activeTopic) {
  if (topicId === "profit") return topicProfitWaterfallPanelHtml();
  if (["nim", "depositLoanDeepDive"].includes(topicId)) return topicBenchmarkLinePanelHtml("nim");
  if (["capital", "valuation", "capitalMarket"].includes(topicId)) return topicBenchmarkLinePanelHtml("pb");
  return "";
}

function topicAiDraft(topic, facts) {
  const row = targetRecord();
  if (!row) return {
    board: "当前目标银行数据不足，建议先补齐年度财务数据后再形成董事会判断。",
    market: "资本市场沟通暂不宜输出结论，应先确认核心指标口径。",
    action: "请先完成目标银行、对标银行、分析年份和类型均值选择。",
    citations: []
  };
  const availableFacts = topicAvailableFacts(facts);
  const peerWeak = availableFacts.filter((f) => f.对标差距 !== "暂无" && String(f.分位).includes("约") && topicPercentile(f) < 50).map((f) => f.指标名称);
  const citations = topicCitationFacts(topic, facts);
  const first = citations[0] || availableFacts[0];
  const second = citations[1] || availableFacts[1] || availableFacts[0];
  const judgement = topicJudgement(topic.id, facts);
  const evidenceText = judgement.evidence.map((f) => `${f.指标名称}${f.目标值}，${f.分位}`).join("；");
  const weakText = peerWeak.length ? `其中${peerWeak.slice(0, 3).join("、")}相对样本分位偏低，需要作为本专题的优先追问项。` : "主要指标未呈现明显低分位短板，后续重点是把优势转化为可持续叙事。";
  if (!first) {
    const boundaryText = topicDataBoundaryFacts(facts).slice(0, 3).map((fact) => `${fact.指标名称}：${fact.数据状态}，${fact.缺失原因}`).join("；");
    return {
      board: `${topic.title}当前缺少可直接引用的核心证据，暂不建议形成董事会定性结论。优先处理：${boundaryText || "补齐目标银行和对标组事实包"}。`,
      market: `资本市场版暂不输出强观点，应先把${topic.title}的字段化、计算输入和来源复核闭环完成，再进入估值或经营质量沟通。`,
      action: `${displayBankName(row.bank)}下一步先补齐${topic.title}的数据边界项，并在 Data & Validation 中确认字段来源、口径和样本覆盖后再生成专题解读。`,
      citations: []
    };
  }
  const draft = {
    board: `${judgement.signal}。${displayBankName(row.bank)}${topic.title}的核心判断，应从“结果指标”转向“形成机制”。${first.指标名称}为${first.目标值}，对标均值为${first.对标均值}；${second.指标名称}为${second.目标值}。${weakText}${topic.mechanism}依据指标包括：${evidenceText}。`,
    market: `对资本市场表达时，不建议只讲单项指标改善，而应把${topic.title.replace("专题", "")}放入同业对标和类型均值中说明。若目标银行能够持续证明${citations.map((f) => f.指标名称).join("、")}的改善，估值沟通才更容易从“低估值陈述”转为“质量修复证据”。依据指标包括：${evidenceText}。`,
    action: `${displayBankName(row.bank)}下一步应围绕本专题建立“事实包、责任部门、改善节点、披露话术”四件套：${topic.actions.join("；")}。优先跟踪：${judgement.evidence.map((f) => f.指标名称).join("、")}。`,
    citations
  };
  draft.board = sanitizeComplianceText(draft.board, topic.forbiddenPhrases);
  draft.market = sanitizeComplianceText(draft.market, topic.forbiddenPhrases);
  draft.action = sanitizeComplianceText(draft.action, topic.forbiddenPhrases);
  return draft;
}

function topicStatusPill(fact) {
  return `<span class="topic-status-pill tone-${fact.数据状态色阶 || "gray"}">${fact.数据状态 || "待复核"}</span>`;
}

function topicDataSectionsHtml(facts) {
  const availableFacts = topicAvailableFacts(facts);
  const boundaryFacts = topicDataBoundaryFacts(facts);
  const evidenceRows = availableFacts.length
    ? availableFacts.map((fact) => `
        <tr>
          <td>${metricLink(fact.指标代码, fact.指标名称)}<small>${topicStatusPill(fact)}${fact.数据来源}</small></td>
          <td>${fact.目标值}</td>
          <td>${fact.对标均值}</td>
          <td>${fact.类型均值}</td>
          <td>一年${fact.一年变化}；五年${fact.五年变化}；${fact.分位}</td>
        </tr>
      `).join("")
    : `<tr><td colspan="5">当前专题没有可直接引用的核心证据，请先处理下方数据边界项。</td></tr>`;
  const boundaryRows = boundaryFacts.length
    ? boundaryFacts.map((fact) => `
        <tr>
          <td>${metricLink(fact.指标代码, fact.指标名称)}<small>${topicStatusPill(fact)}${fact.数据来源}</small></td>
          <td>${fact.目标值}</td>
          <td>${fact.缺失原因}</td>
          <td>${fact.抓取来源}</td>
        </tr>
      `).join("")
    : `<tr><td colspan="4">本专题当前没有数据边界项，指标均可进入证据复核。</td></tr>`;
  return `
    <div class="topic-data-sections">
      <section>
        <div class="topic-data-section-head">
          <b>核心证据</b>
          <span>仅展示可以支撑专题判断和模型解读的可用字段。</span>
        </div>
        <table class="topic-fact-table">
          <thead><tr><th>指标</th><th>目标银行</th><th>对标均值</th><th>类型均值</th><th>变化与分位</th></tr></thead>
          <tbody>${evidenceRows}</tbody>
        </table>
      </section>
      <section class="topic-data-boundary">
        <div class="topic-data-section-head">
          <b>数据边界</b>
          <span>待补项不再参与专题评分，只作为字段化和校验任务。</span>
        </div>
        <table class="topic-fact-table">
          <thead><tr><th>指标</th><th>当前值</th><th>原因</th><th>来源线索</th></tr></thead>
          <tbody>${boundaryRows}</tbody>
        </table>
      </section>
    </div>`;
}

function topicBankCommentaryAnchorHtml(topic, judgement) {
  if (typeof getBankCommentary !== "function") return "";
  const board = getBankCommentary("board");
  const action = getBankCommentary("action");
  return `
    <div class="topic-bank-commentary-anchor" aria-label="银行级评论锚点">
      <span>银行级评论锚点</span>
      <article>
        <b>本专题承接的银行级判断</b>
        <p>${sanitizeComplianceText(board.text || judgement?.headline || topic?.question || "银行级评论待生成。", topic?.forbiddenPhrases).slice(0, 220)}</p>
      </article>
      <article>
        <b>落到本专题的管理动作</b>
        <p>${sanitizeComplianceText(action.text || topic?.actions?.[0] || "建议先补齐事实包，再形成专题行动。", topic?.forbiddenPhrases).slice(0, 220)}</p>
      </article>
    </div>`;
}

function renderTopicWorkbench() {
  const tabs = document.getElementById("topicWorkbenchTabs");
  const host = document.getElementById("topicWorkbench");
  if (!tabs || !host) return;
  const topics = topicDefinitions();
  if (!topics.some((topic) => topic.id === state.activeTopic)) state.activeTopic = topics[0].id;
  tabs.innerHTML = topics.map((topic) => `<button type="button" class="topic-tab${topic.id === state.activeTopic ? " is-active" : ""}" data-topic="${topic.id}">${topic.title}</button>`).join("");
  tabs.querySelectorAll("[data-topic]").forEach((button) => {
    button.addEventListener("click", () => {
      state.activeTopic = button.dataset.topic;
      renderTopicWorkbench();
      buildPrintDeck();
    });
  });
  const topic = topics.find((item) => item.id === state.activeTopic) || topics[0];
  const facts = topicFactPackRows(topic.id);
  const availableFacts = topicAvailableFacts(facts);
  const dataBoundaryFacts = topicDataBoundaryFacts(facts);
  const narratives = typeof getTopicNarratives === "function" ? getTopicNarratives(topic.id) : null;
  const draft = narratives || topicAiDraft(topic, facts);
  const judgement = topicJudgement(topic.id, facts);
  const topicVerification = typeof annualVerificationEvidenceSummary === "function"
    ? annualVerificationEvidenceSummary(
      [...new Set((judgement.evidence || facts || []).map((fact) => fact.指标代码).filter(Boolean))].slice(0, 6),
      state.target,
      state.year
    )
    : null;
  const topicReadiness = topicVerification && typeof reportReadinessFromVerification === "function"
    ? reportReadinessFromVerification(topicVerification)
    : null;
  const insight = typeof topicInsightTriangle === "function" ? topicInsightTriangle(topic.id) : null;
  const firstEvidence = judgement.evidence[0] || availableFacts[0];
  const insightCurrentValue = insight?.currentValue && insight.currentValue !== "待补"
    ? insight.currentValue
    : (firstEvidence ? `${firstEvidence.指标名称} ${firstEvidence.目标值}` : "暂无可用证据");
  const insightTrend = insight?.trendDirection && insight.trendDirection !== "待补"
    ? insight.trendDirection
    : (firstEvidence ? `${firstEvidence.分位}；一年变化${firstEvidence.一年变化}` : `${dataBoundaryFacts.length} 项数据边界待处理`);
  const insightMechanism = insight?.mechanismExplanation && insight.mechanismExplanation !== "待补"
    ? insight.mechanismExplanation
    : judgement.headline;
  const citationNote = judgement.citationDegraded
    ? `<div class="topic-citation-warning">必选引用指标 ${judgement.missingRequired.join("、")} 数据不足，已降级为备选指标支撑解读。</div>`
    : "";
  host.innerHTML = `
    <h3>${typeof topicQuestionTitle === "function" ? topicQuestionTitle(topic.id) : topic.title}</h3>
    <p class="topic-question">${topic.question}</p>
    <div class="topic-insight-triangle">
      <div><span>当前值</span><b>${insightCurrentValue}</b></div>
      <div><span>变化方向</span><b>${insightTrend}</b></div>
      <div><span>机制解释</span><b>${insightMechanism}</b></div>
    </div>
    ${topicVerification && typeof verificationBadgeHtml === "function" ? `<div class="topic-verification-note">${verificationBadgeHtml(topicVerification, { label: topicReadiness?.label || "专题证据强度" })}</div>` : ""}
    <div class="topic-report-controls">
      <label class="topic-include-toggle"><input type="checkbox" data-topic-include="${topic.id}" ${isTopicIncluded(topic.id) ? "checked" : ""} />纳入 HTML/PPTX 报告</label>
      <button type="button" class="btn secondary" id="regenerateTopicNarrative">重新生成本专题解读</button>
      <button type="button" class="btn secondary" id="regenerateTopicNarrativeAi">AI增强生成</button>
    </div>
    <div class="topic-board-layout">
      <div class="topic-signal-card ${judgement.level}">
        <b>专题判断</b>
        <div class="topic-signal">${judgement.signal}</div>
        <p class="topic-headline">${judgement.headline}</p>
        <p class="topic-weight-note">加权专题分位约 ${judgement.avgScore}（按 analysis_rules.json 指标权重计算）</p>
      </div>
      <div class="topic-evidence-card">
        <b>证据指标</b>
        <div class="topic-evidence-list">${judgement.evidence.length ? judgement.evidence.map((fact) => `
          <div class="topic-evidence-item"><span>${metricLink(fact.指标代码, fact.指标名称)}</span><span>${fact.目标值}｜${fact.分位}</span></div>
        `).join("") : `<div class="topic-evidence-item"><span>暂无可用证据</span><span>${dataBoundaryFacts.length} 项待补</span></div>`}</div>
      </div>
      <div class="topic-comment-card">
        <b>一句话结论</b>
        <p class="topic-headline">${judgement.headline}</p>
      </div>
      ${topicMechanismPanelHtml(topic.id)}
    </div>
    ${topicMechanismChartPanelHtml(topic.id)}
    ${topicBankCommentaryAnchorHtml(topic, judgement)}
    ${topicDataSectionsHtml(facts)}
    ${citationNote}
    ${typeof v4TopicDeepDiveHtml === "function" ? v4TopicDeepDiveHtml(topic.id) : ""}
    <div class="topic-ai-grid">
      <div class="topic-ai-card">
        <b>董事会版解读${draft.board?.source === "edited" ? "（已编辑）" : ""}</b>
        <textarea class="topic-narrative-editor" data-narrative-channel="board">${draft.board?.text || draft.board || ""}</textarea>
        <div class="topic-citation-tags">${topicCitationTags((draft.board?.citations || draft.citations || []))}</div>
      </div>
      <div class="topic-ai-card">
        <b>资本市场版解读${draft.market?.source === "edited" ? "（已编辑）" : ""}</b>
        <textarea class="topic-narrative-editor" data-narrative-channel="market">${draft.market?.text || draft.market || ""}</textarea>
        <div class="topic-citation-tags">${topicCitationTags((draft.market?.citations || draft.citations || []))}</div>
      </div>
      <div class="topic-ai-card">
        <b>管理层行动版${draft.action?.source === "edited" ? "（已编辑）" : ""}</b>
        <textarea class="topic-narrative-editor" data-narrative-channel="action">${draft.action?.text || draft.action || ""}</textarea>
        <div class="topic-citation-tags">${topicCitationTags((draft.action?.citations || draft.citations || []))}</div>
      </div>
    </div>
    <ul class="topic-action-list">${topic.actions.map((action) => `<li>${action}</li>`).join("")}</ul>
    <div class="topic-next-actions">
      <a href="#dataCoverageSection" data-nav-target="data"><span>下一步</span><b>查看数据口径</b><em>确认本专题指标是否足以进入主报告</em></a>
      <a href="#formalReportShell" data-nav-target="report"><span>交付</span><b>审阅正式报告</b><em>检查专题结论在报告中的表达和页序</em></a>
    </div>
  `;
  bindMetricLinks(host);
  if (typeof bindTopicNarrativeEditors === "function") bindTopicNarrativeEditors(host, topic.id);
  updateProjectFlow();
}

function topicWorkbenchExportRows() {
  return topicDefinitions().flatMap((topic) => {
    const facts = topicFactPackRows(topic.id);
    const narratives = typeof getTopicNarratives === "function" ? getTopicNarratives(topic.id) : null;
    const draft = narratives || topicAiDraft(topic, facts);
    const boardText = narratives?.board?.text || draft.board;
    const marketText = narratives?.market?.text || draft.market;
    const actionText = narratives?.action?.text || draft.action;
    const citations = narratives?.board?.citations || draft.citations || [];
    return [
      { 专题: topic.title, 类型: "纳入报告", 内容: isTopicIncluded(topic.id) ? "是" : "否" },
      { 专题: topic.title, 类型: "专题问题", 内容: topic.question },
      { 专题: topic.title, 类型: "专题判断", 内容: topicJudgement(topic.id, facts).signal },
      { 专题: topic.title, 类型: "一句话结论", 内容: topicJudgement(topic.id, facts).headline },
      { 专题: topic.title, 类型: "董事会版解读", 内容: boardText },
      { 专题: topic.title, 类型: "资本市场版解读", 内容: marketText },
      { 专题: topic.title, 类型: "管理层行动版", 内容: actionText },
      { 专题: topic.title, 类型: "引用指标", 内容: citations.map((fact) => `${fact.指标名称}${fact.目标值}`).join("；") },
      ...facts.map((fact) => ({ 专题: topic.title, 类型: "指标事实", ...fact })),
      ...topicMechanismRows(topic.id).map((row) => ({ 专题: topic.title, 类型: "机制归因", ...row }))
    ];
  });
}

function directionPhrase(value, peerValue, higherGood = true) {
  if (value == null || peerValue == null) return "暂缺同口径对标";
  const better = higherGood ? value >= peerValue : value <= peerValue;
  return better ? "优于对标均值" : "弱于对标均值";
}

function updateEnhancedInsights(row, peers) {
  if (!row) return;
  const target = displayBankName(row.bank);
  const typeRows = currentRecords();
  const peer = (key) => avg(peers, key);
  const type = (key) => avg(typeRows, key);
  const adminAsset = ratioText(row.adminExpense, row.assets, 3);
  const peerAdminAsset = ratioText(peer("adminExpense"), peer("assets"), 3);
  const cashProfit = ratioText(row.operatingCashFlow, row.netProfit, 1);
  const investmentDen = row.assets;
  const bondAsset = ratioText(row.bondInvestment, investmentDen, 2);
  const fundAsset = ratioText(row.fundInvestment, investmentDen, 2);
  const trustAsset = ratioText(row.trustWmInvestment, investmentDen, 2);
  const peerFundAsset = ratioText(peer("fundInvestment"), peer("assets"), 2);

  setHtml("enhancedTitle", `${target}专项增强分析：从新增字段识别可解释、可追踪、可行动的问题`);
  setHtml("enhancedLead", `${state.year} 年在目标银行、${displayBankList(state.peers, "对标组")}和${state.types.join("、") || "类型均值"}之间，系统新增读取非息真实性、隐性风险、零售产品、投资资产、流动性和资本余量字段，用于把图表后的故事讲得更具体。`);
  setHtml("enhancedProfit", `${target}真实核心非息占比为 ${fmt(row.trueCoreNonInterest)}，高波动收入占比为 ${fmt(row.volatileIncomeShare)}。若真实核心非息${directionPhrase(row.trueCoreNonInterest, peer("trueCoreNonInterest"), true)}但高波动收入偏高，说明非息可能更多来自投资或市场波动补位；管理费用占资产 ${adminAsset}，对标组约 ${peerAdminAsset}，经营活动现金流相当于净利润 ${cashProfit}，可用于判断利润是否有现金流支撑。`);
  setHtml("enhancedNim", `${target}NIM缺口为 ${fmt(row.nimGapPoint, 2, " 个百分点")}，真实存贷利差为 ${fmt(row.realLoanDepositSpread)}，流动性覆盖率为 ${fmt(row.liquidityCoverageRatio)}。当真实存贷利差弱于对标而流动性覆盖率也低于类型均值 ${fmt(type("liquidityCoverageRatio"))} 时，不宜只用扩表解释收入压力，应优先检查负债期限、核心存款和资产投放收益。`);
  setHtml("enhancedRisk", `${target}隐性不良暴露率为 ${fmt(row.hiddenNplExposure)}，公司贷款不良率 ${fmt(row.corporateLoanNpl)}，个人贷款不良率 ${fmt(row.personalLoanNpl)}，票据贴现不良率 ${fmt(row.billDiscountNpl)}。若隐性暴露高于对标均值 ${fmt(peer("hiddenNplExposure"))}，且逾期不良偏离度高于 1，说明风险可能尚未充分进入不良，需要把分类迁徙、展期续贷和拨备使用节奏单独拆开。`);
  setHtml("enhancedRetail", `${target}零售贷款结构为住房 ${fmt(row.housingLoanShare)}、消费 ${fmt(row.consumerLoanShare)}、经营 ${fmt(row.businessLoanShare)}；对应不良率为住房 ${fmt(row.housingLoanNpl)}、消费 ${fmt(row.consumerLoanNpl)}、经营 ${fmt(row.businessLoanNpl)}。这组指标可以把“个贷不良”进一步拆成按揭稳定性、消费信用波动和小微经营风险，便于董办追问风险来源。`);
  setHtml("enhancedInvestment", `${target}债券投资占资产 ${bondAsset}，基金投资占资产 ${fundAsset}，信托及理财占资产 ${trustAsset}；对标组基金投资占资产约 ${peerFundAsset}。若基金或信托理财占比高，同时高波动收入占比高，非息改善更可能带有资本市场波动属性，汇报中应与真实核心非息分开讲。`);
  setHtml("enhancedCapital", `${target}资本充足率余量为 ${fmt(row.carBuffer, 0, "bp")}，估算风险加权资产增速为 ${fmt(row.estimatedRwaGrowth)}，基本每股收益为 ${row.basicEps == null ? "暂无" : Number(row.basicEps).toFixed(2) + " 元"}，年中市净率 ${row.pbMid == null ? "暂无" : Number(row.pbMid).toFixed(2) + "x"}、年末市净率 ${row.pb == null ? "暂无" : Number(row.pb).toFixed(2) + "x"}。若风险加权资产增速高于利润和核心营收增速，资本市场端更容易把扩表理解为资本消耗，而不是价值创造。`);
}

function updateStoryText(row, peers, actions = []) {
  if (!row) return;
  const target = displayBankName(row.bank);
  const peerText = displayBankList(state.peers);
  const typeText = state.types.length ? state.types.join("、") : "所选类型银行";
  const typeRows = currentRecords();
  const peerNim = avg(peers, "nim");
  const peerFee = avg(peers, "feeAssetRatio");
  const peerRisk = avg(peers, "overdueNplDeviation");
  const peerPb = avg(peers, "pb");
  const peerCore = avg(peers, "coreRevenueGrowth");
  const typeNim = avg(typeRows, "nim");
  const typeFee = avg(typeRows, "feeAssetRatio");
  const typeCoverage = avg(typeRows, "provisionCoverage");
  const actionText = actions.length ? actions.join("、") : "资本效率和估值沟通";
  const warning = evaluateWarning(row, peers);
  setHtml("storyTitle", `${target}的故事线：先看息差底盘，再看轻资本收入、风险确认和估值验证`);
  setHtml("storyLead", `本次报告选择 ${target} 为目标银行，选择 ${peerText} 为对标银行，并用 ${typeText} 作为类型均值参照。当前最关键的判断不是单看某一项指标高低，而是看压力如何传导：${target}净息差为 ${fmt(row.nim)}，对标组为 ${fmt(peerNim)}、类型均值为 ${fmt(typeNim)}；核心营收增速为 ${fmt(row.coreRevenueGrowth)}，对标组为 ${fmt(peerCore)}。如果息差弱于对标且核心营收没有同步修复，说明利润表承压来自经营底盘，而不是短期波动。规则引擎当前输出为：${warning.message}`);
  setHtml("storyStep1", `${target}净息差 ${fmt(row.nim)}，对标组 ${fmt(peerNim)}，类型均值 ${fmt(typeNim)}。这一步回答“资产端让价后，负债端有没有能力对冲”。`);
  setHtml("storyStep2", `${target}手续费资产比 ${fmt(row.feeAssetRatio, 3)}，对标组 ${fmt(peerFee, 3)}，类型均值 ${fmt(typeFee, 3)}。低于参照组时，说明资产规模尚未转化为稳定服务收入。`);
  setHtml("storyStep3", `${target}偏离度 ${fmt(row.overdueNplDeviation, 2, "")}，拨备覆盖率 ${fmt(row.provisionCoverage)}，类型覆盖率均值 ${fmt(typeCoverage)}。这一步验证利润是否被风险缓冲消耗托住。`);
  setHtml("storyStep4", `${target}市净率 ${row.pb == null ? "暂无" : row.pb.toFixed(2) + "x"}，对标组 ${peerPb == null ? "暂无" : peerPb.toFixed(2) + "x"}。结合前述指标，行动优先级落到：${actionText}。`);
}
