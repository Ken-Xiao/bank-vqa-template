/* Bank VQA module: 26-v5-value-engine.js */
function v5Num(value) {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function v5Esc(value = "") {
  return String(value ?? "").replace(/[&<>"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "\"": "&quot;", "'": "&#39;" }[char]));
}

function v5Assumptions() {
  return analysisRules?.valuationAssumptions || { defaultCoe: 10, terminalGrowth: 3, expectedLossRate: 0.6, coeByBankType: {}, sensitivityStep: 1 };
}

function v5Coe(row = targetRecord()) {
  const assumptions = v5Assumptions();
  return assumptions.coeByBankType?.[row?.type] ?? assumptions.defaultCoe ?? 10;
}

function v5AverageEquity(row = targetRecord()) {
  if (!row) return null;
  const prev = records.find((item) => item.bank === row.bank && item.year === row.year - 1);
  if (v5Num(row.equity) !== null && v5Num(prev?.equity) !== null) return (row.equity + prev.equity) / 2;
  if (v5Num(row.equity) !== null) return row.equity;
  if (v5Num(row.netProfit) !== null && v5Num(row.roe) !== null && row.roe !== 0) return row.netProfit / (row.roe / 100);
  return null;
}

function economicProfit(row = targetRecord(), coe = v5Coe(row)) {
  if (!row) return null;
  const avgEquity = v5AverageEquity(row);
  if (v5Num(row.netProfit) === null || avgEquity === null) return null;
  const value = row.netProfit - avgEquity * (coe / 100);
  return {
    value,
    coe,
    avgEquity,
    label: value > 0 ? "价值创造者" : value < 0 ? "价值毁损者" : "价值平衡点",
    note: `${displayBankName(row.bank)}经济利润为${metricDisplayValue("economicProfit", value)}，COE 假设为 ${coe.toFixed(1)}%。`
  };
}

function v5RoeAverage(row = targetRecord(), years = 2) {
  if (!row) return null;
  const list = series(row.bank).filter((item) => item.year <= row.year && v5Num(item.roe) !== null).slice(-years);
  return list.length ? list.reduce((sum, item) => sum + item.roe, 0) / list.length : null;
}

function theoreticalPB(row = targetRecord(), params = {}) {
  if (!row) return null;
  const assumptions = v5Assumptions();
  const roe = params.roe ?? v5RoeAverage(row);
  const coe = params.coe ?? v5Coe(row);
  const g = params.g ?? assumptions.terminalGrowth ?? 3;
  if (v5Num(roe) === null || v5Num(coe) === null || coe === g) return null;
  const pb = (roe - g) / (coe - g);
  const actual = v5Num(row.pb);
  const discount = actual === null ? null : actual - pb;
  const discountRate = actual === null || pb === 0 ? null : actual / pb - 1;
  return {
    pb,
    actual,
    discount,
    discountRate,
    roe,
    coe,
    g,
    label: actual === null ? "实际PB待补" : actual < pb ? "可能存在价值错配" : "市场给予增长溢价"
  };
}

function v5PbSensitivity(row = targetRecord()) {
  const base = theoreticalPB(row);
  if (!base) return [];
  const step = v5Assumptions().sensitivityStep ?? 1;
  return [base.roe - step, base.roe, base.roe + step].map((roe) => ({
    roe,
    values: [base.coe - step, base.coe, base.coe + step].map((coe) => theoreticalPB(row, { roe, coe, g: base.g }))
  }));
}

function v5Solve(matrix, vector) {
  const n = vector.length;
  const aug = matrix.map((row, i) => [...row, vector[i]]);
  for (let col = 0; col < n; col += 1) {
    let pivot = col;
    for (let row = col + 1; row < n; row += 1) {
      if (Math.abs(aug[row][col]) > Math.abs(aug[pivot][col])) pivot = row;
    }
    if (Math.abs(aug[pivot][col]) < 1e-8) return null;
    [aug[col], aug[pivot]] = [aug[pivot], aug[col]];
    const base = aug[col][col];
    for (let j = col; j <= n; j += 1) aug[col][j] /= base;
    for (let row = 0; row < n; row += 1) {
      if (row === col) continue;
      const factor = aug[row][col];
      for (let j = col; j <= n; j += 1) aug[row][j] -= factor * aug[col][j];
    }
  }
  return aug.map((row) => row[n]);
}

function pbRoeRegression(rows = currentRecords()) {
  const factors = [
    { key: "roe", label: "ROE", direction: "higherBetter" },
    { key: "npl", label: "不良率", direction: "lowerBetter" },
    { key: "costIncomeRatio", label: "成本收入比", direction: "lowerBetter" },
    { key: "provisionCoverage", label: "拨备覆盖率", direction: "higherBetter" }
  ];
  const sample = rows.filter((row) => v5Num(row.pb) !== null && factors.every((factor) => v5Num(row[factor.key]) !== null));
  if (sample.length < factors.length + 3) return null;
  const stats = Object.fromEntries(factors.map((factor) => {
    const values = sample.map((row) => row[factor.key]);
    const mean = values.reduce((sum, value) => sum + value, 0) / values.length;
    const variance = values.reduce((sum, value) => sum + (value - mean) ** 2, 0) / Math.max(1, values.length - 1);
    return [factor.key, { mean, std: Math.sqrt(variance) || 1 }];
  }));
  const x = sample.map((row) => [1, ...factors.map((factor) => (row[factor.key] - stats[factor.key].mean) / stats[factor.key].std)]);
  const y = sample.map((row) => row.pb);
  const xtx = x[0].map((_, i) => x[0].map((__, j) => x.reduce((sum, rowX) => sum + rowX[i] * rowX[j], 0)));
  const xty = x[0].map((_, i) => x.reduce((sum, rowX, r) => sum + rowX[i] * y[r], 0));
  const beta = v5Solve(xtx, xty);
  if (!beta) return null;
  const predict = (row) => beta[0] + factors.reduce((sum, factor, i) => {
    if (v5Num(row[factor.key]) === null) return sum;
    return sum + beta[i + 1] * ((row[factor.key] - stats[factor.key].mean) / stats[factor.key].std);
  }, 0);
  const yMean = y.reduce((sum, value) => sum + value, 0) / y.length;
  const sse = sample.reduce((sum, row) => sum + (row.pb - predict(row)) ** 2, 0);
  const sst = sample.reduce((sum, row) => sum + (row.pb - yMean) ** 2, 0);
  return {
    factors,
    beta,
    stats,
    sampleSize: sample.length,
    r2: sst ? 1 - sse / sst : null,
    predict,
    coefficients: factors.map((factor, i) => ({ ...factor, value: beta[i + 1] / stats[factor.key].std }))
  };
}

function pbDriverRanking(row = targetRecord(), peers = peerRecords()) {
  if (!row) return [];
  const regression = pbRoeRegression();
  if (!regression) return [];
  return regression.factors.map((factor, i) => {
    const current = row[factor.key];
    const peer = proMedian(peers.map((item) => item?.[factor.key]));
    if (v5Num(current) === null || v5Num(peer) === null) return null;
    const improved = { ...row, [factor.key]: peer };
    const lift = regression.predict(improved) - regression.predict(row);
    return {
      ...factor,
      current,
      peer,
      lift,
      absLift: Math.abs(lift),
      readout: `${factor.label}若向对标中位数收敛，模型 PB 变化约 ${lift >= 0 ? "+" : ""}${lift.toFixed(2)}x。`
    };
  }).filter(Boolean).sort((a, b) => Math.abs(b.lift) - Math.abs(a.lift));
}

function v5DeviationRadarRows(row = targetRecord()) {
  if (!row) return { positive: [], negative: [] };
  const keys = ["roe", "roa", "coreRevenueGrowth", "feeAssetRatio", "nim", "timeDepositShare", "npl", "overdueNplDeviation", "provisionCoverage", "cet1Buffer", "pb", "costIncomeRatio"];
  const rows = keys.map((key) => {
    const momentum = metricMomentum(row.bank, key);
    const tag = structuralCycleTag(key, row);
    return { key, label: fieldName(key), score: momentum.score || 0, momentum, tag };
  });
  return {
    positive: rows.filter((item) => item.score > 0).sort((a, b) => b.score - a.score).slice(0, 5),
    negative: rows.filter((item) => item.score <= 0).sort((a, b) => a.score - b.score).slice(0, 5)
  };
}

function threeLayerNarrative(topicKey, row = targetRecord()) {
  if (!row) return { claim: "数据不足，暂不形成判断。", evidence: "待补事实包。", soWhat: "待补数据后再进入管理层讨论。" };
  const map = {
    value: {
      claim: economicProfit(row)?.value >= 0 ? "经济利润仍在创造价值" : "经济利润提示价值毁损压力",
      metrics: ["economicProfit", "roe", "pb"],
      soWhat: "可考虑把经济利润和ROE-COE缺口列为董事会首屏指标。"
    },
    valuation: {
      claim: theoreticalPB(row)?.actual < theoreticalPB(row)?.pb ? "实际PB低于DDM理论锚" : "实际PB不低于DDM理论锚",
      metrics: ["pb", "roe", "npl"],
      soWhat: "可考虑用DDM锚和PB回归共同解释估值折价来源。"
    },
    deviation: {
      claim: "异动指标应优先进入本期追问清单",
      metrics: ["nim", "npl", "coreRevenueGrowth"],
      soWhat: "可考虑把结构性异动拆给责任部门，下一季度验证改善方向。"
    }
  };
  const config = map[topicKey] || map.value;
  const evidence = config.metrics.map((key) => {
    const value = key === "economicProfit" ? economicProfit(row)?.value : row[key];
    if (key === "economicProfit") return `${fieldName(key)}${metricDisplayValue(key, value)}`;
    return `${fieldName(key)}${metricDisplayValue(key, value)}（${rankPercentile(value, currentRecords(), key, metricDirection(key))}）`;
  }).join("；");
  return { claim: config.claim, evidence, soWhat: config.soWhat };
}

function v5FreshnessLabel(row = targetRecord()) {
  if (!row?.year) return "数据时效待确认";
  const age = new Date().getFullYear() - row.year;
  return age >= 1 ? `${row.year}年报口径，需结合最新季报复核` : `${row.year}年最新口径`;
}

function v5FormatMoney(value) {
  if (v5Num(value) === null) return "暂无";
  if (Math.abs(value) >= 10000) return `${(value / 10000).toFixed(1)}亿元`;
  return `${value.toFixed(0)}万元`;
}

function v5ValueSummaryHtml(row = targetRecord()) {
  if (!row) return "";
  const ep = economicProfit(row);
  const pb = theoreticalPB(row);
  const drivers = pbDriverRanking(row, peerRecords());
  const topDriver = drivers[0];
  return `
    <div class="v5-value-card ${ep?.value >= 0 ? "positive" : "negative"}">
      <span>价值创造</span><b>${ep ? v5FormatMoney(ep.value) : "暂无"}</b>
      <p>${ep?.label || "经济利润待测算"}｜COE ${ep?.coe?.toFixed(1) || "--"}%</p>
    </div>
    <div class="v5-value-card">
      <span>DDM理论PB</span><b>${pb ? `${pb.pb.toFixed(2)}x` : "暂无"}</b>
      <p>实际 PB ${pb?.actual == null ? "暂无" : `${pb.actual.toFixed(2)}x`}｜${pb?.label || "待测算"}</p>
    </div>
    <div class="v5-value-card">
      <span>PB优先因子</span><b>${topDriver?.label || "暂无"}</b>
      <p>${topDriver?.readout || "需补齐回归样本后排序。"}</p>
    </div>`;
}

function v5SensitivityTableHtml(row = targetRecord()) {
  const base = theoreticalPB(row);
  const grid = v5PbSensitivity(row);
  if (!base || !grid.length) return `<div class="v5-empty">DDM敏感性需要 ROE、PB 和 COE 假设。</div>`;
  const coes = [base.coe - 1, base.coe, base.coe + 1];
  return `<table class="v5-sensitivity"><thead><tr><th>ROE / COE</th>${coes.map((coe) => `<th>${coe.toFixed(1)}%</th>`).join("")}</tr></thead><tbody>${grid.map((rowItem) => `<tr><td>${rowItem.roe.toFixed(1)}%</td>${rowItem.values.map((item) => `<td>${item ? item.pb.toFixed(2) + "x" : "暂无"}</td>`).join("")}</tr>`).join("")}</tbody></table>`;
}

function v5ConsultingReadoutHtml({ kicker, claim, evidence, meaning, tone = "blue" }) {
  return `
    <div class="v5-consulting-readout tone-${v5Esc(tone)}">
      <span>${v5Esc(kicker)}</span>
      <b>${v5Esc(claim)}</b>
      <div>
        <p><em>证据</em>${v5Esc(evidence)}</p>
        <p><em>管理含义</em>${v5Esc(meaning)}</p>
      </div>
    </div>`;
}

function v5PbReadout(row = targetRecord()) {
  const pb = theoreticalPB(row);
  const pricing = typeof pbPricingFactorReadout === "function" ? pbPricingFactorReadout(row, peerRecords()) : null;
  const drivers = pbDriverRanking(row, peerRecords());
  const topDriver = drivers[0];
  if (!row || !pb) {
    return {
      kicker: "PB 估值答案",
      claim: "PB判断需要先补齐 ROE、COE 和实际 PB 口径。",
      evidence: "当前 DDM 锚和 PB 回归样本不足，暂不形成强判断。",
      meaning: "先补齐估值输入，再决定是否进入正式报告主结论。",
      tone: "amber"
    };
  }
  const gap = pb.actual == null ? null : pb.actual - pb.pb;
  const claim = gap == null
    ? "实际 PB 缺口待补，当前只能形成估值框架。"
    : gap < 0
      ? "低 PB 更像经营质量折价，需要用 ROE、风险确认和息差解释。"
      : "PB 未明显低于理论锚，后续重点是验证经营改善能否持续支撑。";
  const evidence = [
    `实际 PB ${metricDisplayValue("pb", pb.actual)} / DDM理论 ${pb.pb.toFixed(2)}x`,
    pricing?.typeNote?.headline || "",
    topDriver ? `${topDriver.label}是优先定价因子，模拟影响 ${topDriver.lift >= 0 ? "+" : ""}${topDriver.lift.toFixed(2)}x` : ""
  ].filter(Boolean).join("；");
  const meaning = gap != null && gap < 0
    ? "报告中不应只写“估值低”，而要把折价拆成经营质量、风险透明度和资本消耗三类可验证动作。"
    : "报告中应避免过度强调估值修复，先证明经营质量改善能够被同业位置和趋势数据支持。";
  return { kicker: "PB 估值答案", claim, evidence, meaning, tone: gap != null && gap < 0 ? "red" : "blue" };
}

function v5PbAnchorHtml(row = targetRecord()) {
  const pb = theoreticalPB(row);
  const regression = pbRoeRegression();
  if (!row) return "";
  const pricing = typeof pbPricingFactorReadout === "function" ? pbPricingFactorReadout(row, peerRecords()) : null;
  const typeAnchorLine = pricing?.lines?.[0]?.replace(new RegExp(`^${pricing.type}`), "") || "";
  return `
    ${v5ConsultingReadoutHtml(v5PbReadout(row))}
    <div class="v5-pb-anchor">
      <div class="v5-anchor-number"><span>实际 / 理论</span><b>${pb?.actual == null ? "暂无" : pb.actual.toFixed(2)}x / ${pb ? pb.pb.toFixed(2) : "暂无"}x</b><p>${pb?.label || "待测算"}｜ROE ${pb?.roe?.toFixed(1) || "--"}%，COE ${pb?.coe?.toFixed(1) || "--"}%，g ${pb?.g?.toFixed(1) || "--"}%</p></div>
      <div class="v5-anchor-number"><span>PB-ROE回归</span><b>${regression?.r2 == null ? "R²待测" : `R² ${regression.r2.toFixed(2)}`}</b><p>样本 ${regression?.sampleSize || 0} 家银行；${v5Esc(v5Assumptions().caveat)}</p></div>
    </div>
    ${pricing ? `
      <div class="v5-pb-pricing-readout">
        <div><span>类型锚</span><b>${v5Esc(pricing.type)}</b><p>${v5Esc(typeAnchorLine)}</p></div>
        <div><span>模型因子</span><b>${v5Esc(pricing.typeNote.headline)}</b><p>${v5Esc(pricing.typeNote.text)}</p></div>
      </div>
    ` : ""}
    ${v5SensitivityTableHtml(row)}`;
}

function v5TornadoHtml(row = targetRecord()) {
  const drivers = pbDriverRanking(row, peerRecords()).slice(0, 5);
  if (!drivers.length) return `<div class="v5-empty">PB驱动排序需要回归样本和对标组中位数。</div>`;
  const max = Math.max(...drivers.map((item) => Math.abs(item.lift))) || 1;
  const top = drivers[0];
  const readout = v5ConsultingReadoutHtml({
    kicker: "PB 提升路径",
    claim: `${top.label}是当前最值得先解释的 PB 定价因子。`,
    evidence: `${top.label}若向对标中位数收敛，模型 PB 变化约 ${top.lift >= 0 ? "+" : ""}${top.lift.toFixed(2)}x；当前 ${metricDisplayValue(top.key, top.current)}，对标中位数 ${metricDisplayValue(top.key, top.peer)}。`,
    meaning: top.lift >= 0
      ? "行动建议应先围绕该因子设置季度改善目标，因为它对估值叙事的边际解释力最高。"
      : "该因子向对标收敛未必直接抬升 PB，管理层需要先确认模型方向和业务含义。多半要回到 ROE、风险和资本约束联读。",
    tone: top.lift >= 0 ? "green" : "amber"
  });
  return `${readout}<div class="v5-tornado">${drivers.map((item) => `<div class="v5-tornado-row"><span>${item.label}</span><div><i class="${item.lift >= 0 ? "up" : "down"}" style="width:${Math.max(8, Math.abs(item.lift) / max * 100).toFixed(1)}%"></i></div><b>${item.lift >= 0 ? "+" : ""}${item.lift.toFixed(2)}x</b><p>当前 ${metricDisplayValue(item.key, item.current)}｜对标中位数 ${metricDisplayValue(item.key, item.peer)}</p></div>`).join("")}</div>`;
}

function v5DeviationHtml(row = targetRecord()) {
  const radar = v5DeviationRadarRows(row);
  const mainNegative = radar.negative[0];
  const mainPositive = radar.positive[0];
  const claim = mainNegative
    ? `${mainNegative.label}是本期需要优先解释的负向异动。`
    : mainPositive
      ? `${mainPositive.label}是本期最明确的正向改善信号。`
      : "本期暂未识别显著异动，建议保持常规跟踪。";
  const evidence = [
    mainNegative ? `负向：${mainNegative.label}${mainNegative.momentum.direction}，${mainNegative.momentum.acceleration}` : "",
    mainPositive ? `正向：${mainPositive.label}${mainPositive.momentum.direction}，${mainPositive.momentum.acceleration}` : ""
  ].filter(Boolean).join("；") || "核心指标未出现显著方向变化。";
  const readout = v5ConsultingReadoutHtml({
    kicker: "异动雷达",
    claim,
    evidence,
    meaning: "异动不应逐项罗列，应先判断它是阶段扰动还是结构性偏离；只有能解释经营质量或估值的指标才进入正式报告主线。",
    tone: mainNegative ? "red" : mainPositive ? "green" : "blue"
  });
  const render = (items) => items.map((item) => `<div class="v5-deviation-row"><b>${item.label}</b><span>${item.momentum.direction}｜${item.momentum.acceleration}</span><em>${item.tag?.tag || "待判断"}</em></div>`).join("");
  return `${readout}<div class="v5-deviation-grid"><div><h4>正向改善</h4>${render(radar.positive) || "<p>暂无显著改善。</p>"}</div><div><h4>负向恶化</h4>${render(radar.negative) || "<p>暂无显著恶化。</p>"}</div></div>`;
}

function renderV5ValuePanel(row = targetRecord()) {
  if (!row) return;
  const title = document.getElementById("v5ValueTitle");
  const freshness = document.getElementById("v5DataFreshness");
  const grid = document.getElementById("v5ValueGrid");
  const anchor = document.getElementById("v5PbAnchorPanel");
  const radar = document.getElementById("v5DeviationRadar");
  const tornado = document.getElementById("v5TornadoPanel");
  if (title) title.textContent = `${displayBankName(row.bank)}先判断是否创造价值，再解释市场定价是否合理`;
  if (freshness) freshness.textContent = v5FreshnessLabel(row);
  if (grid) grid.innerHTML = v5ValueSummaryHtml(row);
  if (anchor) anchor.innerHTML = v5PbAnchorHtml(row);
  if (radar) radar.innerHTML = v5DeviationHtml(row);
  if (tornado) tornado.innerHTML = v5TornadoHtml(row);
}

function formalV5ValueSections(row = targetRecord()) {
  if (!row) return "";
  const valueNarrative = threeLayerNarrative("value", row);
  const valuationNarrative = threeLayerNarrative("valuation", row);
  return `
    <section class="formal-section formal-v5-section" id="formal-v5-executive-value">
      <div class="formal-section-kicker">执行摘要 1/2｜总答案页</div>
      <h2>${formalEscape(valueNarrative.claim)}</h2>
      <p class="formal-lead">${formalEscape(valueNarrative.evidence)}。${formalEscape(valueNarrative.soWhat)} ${formalEscape(v5FreshnessLabel(row))}。</p>
      <div class="v5-value-grid">${v5ValueSummaryHtml(row)}</div>
    </section>
    <section class="formal-section formal-v5-section" id="formal-v5-pb-answer">
      <div class="formal-section-kicker">执行摘要 2/2｜PB估值答案页</div>
      <h2>${formalEscape(valuationNarrative.claim)}</h2>
      <p class="formal-lead">${formalEscape(valuationNarrative.evidence)}。${formalEscape(valuationNarrative.soWhat)}</p>
      ${v5PbAnchorHtml(row)}
      ${v5TornadoHtml(row)}
    </section>
    <section class="formal-section formal-v5-section" id="formal-v5-deviation-radar">
      <div class="formal-section-kicker">前瞻预警｜异动雷达</div>
      <h2>本期董事会应优先追问结构性异动，而不是逐项阅读全部指标</h2>
      ${v5DeviationHtml(row)}
      <p class="formal-source">口径说明：${formalEscape(v5Assumptions().caveat)} 数据来源：iFinD · 上市公司年报 · RSM整理。</p>
    </section>`;
}
