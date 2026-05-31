/* Bank VQA module: 22-formal-report.js — RSM style long-form report */

function formalEscape(text = "") {
  if (typeof xmlEscape === "function") return xmlEscape(text);
  return String(text ?? "").replace(/[&<>"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "\"": "&quot;", "'": "&#39;" }[char]));
}

function formalParagraph(text = "", limit = 520) {
  return formalEscape(reportShortText(String(text || "因数据覆盖不足，暂不形成该层判断。"), limit));
}

function formalBankName(row = targetRecord()) {
  return displayBankName(row?.bank || state.target);
}

function formalPeerAnchor(key, row = targetRecord(), peers = peerRecords()) {
  return `${formalBankName(row)}${fieldName(key)}为${metricDisplayValue(key, row?.[key])}，对标组均值为${metricDisplayValue(key, avg(peers, key))}`;
}

function formalCausalSentence(topicKey, row = targetRecord(), peers = peerRecords()) {
  if (!row) return "数据不足，暂不形成机制判断。";
  if (topicKey === "profit") {
    return `从传导链看，${formalPeerAnchor("coreRevenueGrowth", row, peers)}，${formalPeerAnchor("feeAssetRatio", row, peers)}。这意味着本轮盈利判断不能停在 ROA 终值，而要追问核心营收和手续费资产比是否已经形成第二收入支柱。`;
  }
  if (topicKey === "nim") {
    return `从传导链看，${formalPeerAnchor("nimGapBp", row, peers)}，${formalPeerAnchor("interestLiabilityCost", row, peers)}。如果资产端收益率先让价、负债端成本下行滞后，息差压力就不是市场噪音，而是负债经营纪律问题。`;
  }
  if (topicKey === "risk") {
    return `从风险确认链条看，${formalPeerAnchor("personalLoanNpl", row, peers)}，${formalPeerAnchor("overdueNplDeviation", row, peers)}。若零售或偏离度先行抬升，综合不良率稳定并不能直接证明资产质量已经干净。`;
  }
  if (topicKey === "capital") {
    return `从资本转化链条看，${formalPeerAnchor("cet1Buffer", row, peers)}，${formalPeerAnchor("rwaDensity", row, peers)}。扩表只有在不持续消耗资本余量、且能转化为 ROA 改善时，才构成可持续增长。`;
  }
  return `从估值验证链条看，${formalPeerAnchor("pb", row, peers)}，${formalPeerAnchor("roa", row, peers)}。PB 不能孤立解释，必须回到盈利、风险和资本纪律共同验证。`;
}

function formalPrioritizedAdvice(topicKey, row = targetRecord()) {
  const target = formalBankName(row);
  const seq = typeof v3TransformationSequence === "function" ? v3TransformationSequence(row) : null;
  if (topicKey === "profit") return `优先级一：${target}应在未来 3 个月把核心营收增速和手续费资产比列为盈利质量主锚点；优先级二：拆分客户经营收入和波动型非息收入；优先级三：ROA 改善只有在 PPOP 同步改善后才进入主动沟通口径。`;
  if (topicKey === "nim") return `优先级一：以息差对冲缺口作为月度 ALM 纪律；优先级二：压降高成本定期存款并提升结算资金沉淀；优先级三：新增资产投放必须同时满足风险调整收益率和负债成本约束。`;
  if (topicKey === "risk") return `优先级一：把零售不良剪刀差、关注率和逾期偏离度前移到季度风险会；优先级二：净利润快于 PPOP 时必须同步披露拨备覆盖率变化；优先级三：风险确认节奏要先于利润释放节奏。`;
  if (topicKey === "capital") return `优先级一：将 CET1 余量和 RWA 密度写入新增资产准入；优先级二：对高资本占用业务建立退出或重定价清单；优先级三：数字化与组织投入必须以 ROA、成本收入比和轻资本收入改善验证。`;
  return `优先级一：先证明${target}经营质量改善而非只解释 PB 低位；优先级二：把估值叙事绑定 ROA、风险确认和资本余量；优先级三：在${seq?.stage || "当前阶段"}完成前，不宜过度使用价值重估表述。`;
}

function formalConsultingReadout(topicKey, row = targetRecord(), peers = peerRecords()) {
  if (!row) return "数据不足，暂不形成咨询判断。";
  const target = formalBankName(row);
  const diagnosis = typeof computeVqaDiagnosis === "function" ? computeVqaDiagnosis(row, peers) : null;
  const weakest = diagnosis?.labels?.[diagnosis.weakest] || "关键维度";
  if (topicKey === "executive") {
    return `${target}本轮诊断不宜从“哪些指标高于同业”开始，而应从“哪一项约束会限制后续价值重估”开始。VQA 总分 ${diagnosis?.score ?? "待测算"}，最弱维度为${weakest}，意味着董事会讨论的第一议题应是约束项修复顺序，而不是对优势指标做正向陈述。`;
  }
  if (topicKey === "context") {
    return `${target}的指标差异需要先分成三类：行业共同传导、同类型银行结构约束、目标银行自身经营纪律。只有第三类差异，才应该直接转化为管理层行动清单；前两类差异应进入情景假设和口径边界。`;
  }
  if (topicKey === "action") {
    const seq = typeof v3TransformationSequence === "function" ? v3TransformationSequence(row) : null;
    return `${target}当前行动阶段判断为“${seq?.stage || "待判断"}”。因此建议不应平均分配到所有专题，而应先处理会改变 VQA 信号的约束项：息差对冲、风险确认、资本消耗和轻资本收入中，谁对总分拖累最大，谁进入 0-3 个月管理闭环。`;
  }
  return `${target}本页判断的咨询含义不是复述指标，而是确认该指标是否改变管理层排序：若该项差距持续存在，下一轮经营会应要求责任部门解释差距来源、改善阈值和验证时间窗口。`;
}

function formalAssertionTitle(topicKey, row = targetRecord()) {
  const target = formalBankName(row);
  const map = {
    profit: `${target}盈利质量要先解释核心营收与净利润是否同向改善`,
    nim: `${target}息差判断要同时拆开资产收益、负债成本和存款结构`,
    risk: `${target}风险判断不能只看不良率，还要看逾期偏离和拨备缓冲`,
    capital: `${target}资本效率取决于资本余量能否支撑风险加权资产扩张`,
    valuation: `${target}估值修复取决于经营质量、资本效率和风险确认的共同改善`,
    capitalMarket: `${target}资本市场定价需要由经营质量和资本回报共同解释`,
    retailRisk: `${target}零售风险需要分产品识别真实压力来源`,
    depositLoanDeepDive: `${target}存贷结构决定息差防守和资产扩张质量`
  };
  return map[topicKey] || `${target}本页结论需要回到选定样本和口径边界验证`;
}

function formalV3SubjectSections(row = targetRecord()) {
  if (!row) return "";
  const macro = typeof v3MacroTransmission === "function" ? v3MacroTransmission(row, peerRecords()) : null;
  const scissors = typeof v3RetailRiskScissors === "function" ? v3RetailRiskScissors(row, peerRecords()) : null;
  const triangle = typeof v3ProfitQualityTriangle === "function" ? v3ProfitQualityTriangle(row, peerRecords()) : null;
  const sequence = typeof v3TransformationSequence === "function" ? v3TransformationSequence(row) : null;
  return `
    <section class="formal-section" id="formal-macro-transmission">
      <div class="formal-section-kicker">专题分析｜宏观传导与竞争格局</div>
      <h2>${formalBankName(row)}的外部压力需要先拆成资产端传导和收入结构缓冲</h2>
      <p class="formal-lead">${formalParagraph(`${macro?.label || "资产收益率传导待验证"}，${macro?.bufferLabel || "收入结构缓冲待验证"}。${formalBankName(row)}生息资产收益率一年变化为${metricDisplayValue("earningAssetYield", macro?.yieldChange)}，对标组变化为${metricDisplayValue("earningAssetYield", macro?.peerYieldChange)}；非息收入占比为${metricDisplayValue("nonInterestShare", row.nonInterestShare)}，对标组均值为${metricDisplayValue("nonInterestShare", avg(peerRecords(), "nonInterestShare"))}。这说明本章要回答的不是利率是否下行，而是下行压力是否更快、更深地进入目标银行报表。`, 520)}</p>
      <div class="formal-risk-grid">
        <div class="formal-risk-card"><span>资产端传导</span><b>${formalEscape(macro?.label || "待验证")}</b><p>若目标银行收益率下行快于对标组，应复盘重点客群、区域竞争和贷款定价纪律。</p></div>
        <div class="formal-risk-card"><span>收入缓冲</span><b>${formalEscape(macro?.bufferLabel || "待验证")}</b><p>非息收入和手续费资产比决定利率下行时利润表是否有第二支柱。</p></div>
        <div class="formal-risk-card"><span>竞争格局</span><b>大行下沉压力需定性纳入</b><p>区域中小银行的压力不只来自利率，也来自优质客群和低成本负债的竞争再分配。</p></div>
      </div>
    </section>
    <section class="formal-section" id="formal-risk-forward">
      <div class="formal-section-kicker">专题分析｜风险前瞻三层验证</div>
      <h2>${formalBankName(row)}风险判断需要从综合不良率前移到零售、利润质量和偏离度</h2>
      <p class="formal-lead">${formalParagraph(`零售风险剪刀差判断为“${scissors?.label || "待验证"}”，个贷不良率与整体不良率差值为${fmt(scissors?.spread)}，对标组差值为${fmt(scissors?.peerSpread)}。利润质量三角判断为“${triangle?.label || "待验证"}”，PPOP 增速为${metricDisplayValue("ppopGrowth", row.ppopGrowth)}，净利润增速为${metricDisplayValue("netProfitGrowth", row.netProfitGrowth)}，拨备覆盖率为${metricDisplayValue("provisionCoverage", row.provisionCoverage)}。`, 560)}</p>
      <div class="formal-risk-grid">
        <div class="formal-risk-card"><span>一层：零售先行</span><b>${formalEscape(scissors?.label || "待验证")}</b><p>零售剪刀差扩大时，综合不良率稳定可能只是滞后结果。</p></div>
        <div class="formal-risk-card"><span>二层：利润质量</span><b>${formalEscape(triangle?.label || "待验证")}</b><p>净利润快于 PPOP 且拨备下降时，应触发反直觉警示。</p></div>
        <div class="formal-risk-card"><span>三层：确认时差</span><b>偏离度 ${formalEscape(metricDisplayValue("overdueNplDeviation", row.overdueNplDeviation))}</b><p>偏离度和关注率应作为领先指标，而不是附录指标。</p></div>
      </div>
    </section>
    <section class="formal-section" id="formal-transformation-sequence">
      <div class="formal-section-kicker">专题分析｜转型顺序检查器</div>
      <h2>${formalBankName(row)}当前行动阶段应定义为：${formalEscape(sequence?.stage || "待判断")}</h2>
      <p class="formal-lead">${formalParagraph(sequence?.advice || "数据不足，暂不形成转型顺序判断。", 420)}</p>
      <div class="formal-sequence-grid">${(sequence?.checks || []).map((item) => `
        <div class="formal-sequence-card ${item.pass ? "pass" : "fail"}">
          <span>${item.pass ? "通过" : "未过"}</span>
          <b>${formalEscape(item.label)}</b>
          <p>${formalEscape(item.value)}</p>
        </div>`).join("")}</div>
    </section>`;
}

function formalMetricHero(key, row = targetRecord()) {
  const gap = typeof v4MetricGap === "function" ? v4MetricGap(key, row, peerRecords()) : null;
  const pctRaw = rankPercentile(row?.[key], currentRecords(), key, metricDirection(key));
  const pct = Number.isFinite(pctRaw) ? `P${Math.round(pctRaw)}` : "P--";
  return `
    <div class="formal-metric-hero">
      <span>${formalEscape(fieldName(key))}</span>
      <b>${formalEscape(metricDisplayValue(key, row?.[key]))}</b>
      <em>对标 ${formalEscape(metricDisplayValue(key, gap?.peer))}｜${pct}</em>
      <p>${gap ? `${gap.goodGap >= 0 ? "相对对标形成支撑" : "相对对标形成约束"}，差距 ${metricDisplayValue(key, Math.abs(gap.raw))}` : "对标数据不足，暂不形成差距判断。"}</p>
    </div>`;
}

function formalFactTable(facts = []) {
  const rows = facts.slice(0, 6).map((fact) => `
    <tr>
      <td>${formalEscape(fact.指标名称)}</td>
      <td>${formalEscape(fact.目标值)}</td>
      <td>${formalEscape(fact.对标均值)}</td>
      <td>${formalEscape(fact.类型均值)}</td>
      <td>${formalEscape(fact.分位)}</td>
      <td><span class="formal-risk-pill tone-${formalEscape(fact.口径风险等级 || "L2")}">${formalEscape(fact.口径风险等级 || "L2")}</span>${formalEscape(fact.报告使用建议 || "主报告+脚注")}</td>
    </tr>`).join("");
  return `
    <table class="formal-fact-table">
      <thead><tr><th>指标</th><th>目标银行</th><th>对标均值</th><th>类型均值</th><th>分位</th><th>口径风险</th></tr></thead>
      <tbody>${rows || `<tr><td colspan="6">暂无可用事实指标</td></tr>`}</tbody>
    </table>`;
}

function formalRiskFootnotes(facts = []) {
  const flagged = facts
    .filter((fact) => fact.口径风险等级 && fact.口径风险等级 !== "L1")
    .slice(0, 4);
  if (!flagged.length) return "";
  return `
    <div class="formal-risk-footnotes">
      <b>口径边界</b>
      ${flagged.map((fact) => `
        <p><span>${formalEscape(fact.口径风险等级)}</span>${formalEscape(fact.指标名称)}：${formalEscape(fact.口径脚注 || fact.口径风险标签 || "建议保留口径说明。")}（${formalEscape(fact.报告使用建议 || "主报告+脚注")}）</p>
      `).join("")}
    </div>`;
}

function formalBenchmarkSampleN(key = "nim", peers = peerRecords()) {
  const peerN = peers.filter((row) => row?.[key] != null && !Number.isNaN(row[key])).length;
  const typeRows = currentRecords().filter((row) => state.types.includes(row.type));
  const typeN = typeRows.filter((row) => row?.[key] != null && !Number.isNaN(row[key])).length;
  const allN = currentRecords().filter((row) => row?.[key] != null && !Number.isNaN(row[key])).length;
  return { key, peerN, typeN, allN };
}

function formalProfitWaterfallHtml(row = targetRecord()) {
  const pack = typeof netProfitAttribution === "function" ? netProfitAttribution(row) : null;
  const items = (pack?.items || []).slice(0, 6);
  if (!items.length) return `<div class="formal-chart-empty">净利润归因数据不足。</div>`;
  const max = Math.max(...items.map((item) => Math.abs(Number(item.value) || 0)), 1);
  return `
    <div class="formal-profit-waterfall" aria-label="净利润归因瀑布">
      ${items.map((item) => {
        const value = Number(item.value) || 0;
        const tone = value > 0 ? "positive" : value < 0 ? "negative" : "neutral";
        const width = Math.max(8, Math.min(100, Math.abs(value) / max * 100));
        return `
          <div class="formal-waterfall-row tone-${tone}">
            <span>${formalEscape(item.label)}</span>
            <i><em style="width:${width}%"></em></i>
            <b>${formalEscape(metricDisplayValue("netProfit", value))}</b>
          </div>`;
      }).join("")}
    </div>`;
}

function formalBenchmarkLineHtml(key = "nim", row = targetRecord(), peers = peerRecords()) {
  const targetValue = row?.[key];
  const lines = typeof benchmarkLinesForMetric === "function" ? benchmarkLinesForMetric(key, peers) : [];
  const values = [targetValue, ...lines.map((line) => line.value)].filter((value) => Number.isFinite(value));
  if (values.length < 2) return `<div class="formal-chart-empty">多基准线数据不足。</div>`;
  const min = Math.min(...values);
  const max = Math.max(...values);
  const span = max - min || 1;
  const position = (value) => Math.max(0, Math.min(100, ((value - min) / span) * 100));
  const sample = formalBenchmarkSampleN(key, peers);
  return `
    <div class="formal-benchmark-line" aria-label="多基准线">
      <div class="formal-benchmark-axis">
        ${lines.slice(0, 6).map((line) => `
          <span class="formal-benchmark-tick kind-${formalEscape(line.kind)}" style="left:${position(line.value)}%">
            <i></i><b>${formalEscape(line.label)}</b><em>${formalEscape(metricDisplayValue(key, line.value))}</em>
          </span>`).join("")}
        <strong style="left:${position(targetValue)}%">${formalEscape(metricDisplayValue(key, targetValue))}</strong>
      </div>
      <p class="formal-sample-note">样本N：对标组N=${sample.peerN}｜类型N=${sample.typeN}｜全样本N=${sample.allN}</p>
    </div>`;
}

function formalNimBridgeHtml(row = targetRecord(), peers = peerRecords()) {
  const keys = ["nim", "earningAssetYield", "interestLiabilityCost", "timeDepositShare"];
  return `
    <div class="formal-nim-bridge" aria-label="NIM四段式桥">
      ${keys.map((key) => {
        const value = row?.[key];
        const peer = avg(peers, key);
        const gap = value == null || peer == null ? null : value - peer;
        const tone = gap == null ? "neutral" : (metricDirection(key) ? gap >= 0 : gap <= 0) ? "positive" : "negative";
        return `
          <div class="formal-nim-bridge-card tone-${tone}">
            <span>${formalEscape(fieldName(key))}</span>
            <b>${formalEscape(metricDisplayValue(key, value))}</b>
            <em>对标 ${formalEscape(metricDisplayValue(key, peer))}</em>
          </div>`;
      }).join("")}
    </div>`;
}

function formalMechanismChartHtml(module) {
  if (module?.title === "净利润归因瀑布") return formalProfitWaterfallHtml();
  if (module?.title === "NIM归因") return formalNimBridgeHtml();
  if (module?.title === "多基准线") return formalBenchmarkLineHtml("nim");
  return "";
}

function formalMechanismModuleCard(module) {
  const rows = (module?.rows || []).slice(0, 5);
  const chart = formalMechanismChartHtml(module);
  const body = rows.map((item) => `
    <tr>
      <td>${formalEscape(item.指标名称 || item.指标代码)}</td>
      <td>${formalEscape(item.目标值)}</td>
      <td>${formalEscape(item.对标值)}</td>
      <td>${formalEscape(item.差距)}</td>
      <td>${formalEscape(item.判断 || item.模块结论 || "")}</td>
      <td><span class="formal-risk-pill tone-${formalEscape(item.口径风险等级 || "L2")}">${formalEscape(item.口径风险等级 || "L2")}</span></td>
    </tr>`).join("");
  return `
    <div class="formal-mechanism-card">
      <div class="formal-mechanism-head">
        <span>机制归因</span>
        <b>${formalEscape(module?.title || "机制模块")}</b>
      </div>
      <p>${formalParagraph(module?.headline || "当前模块仍需补充可复核的归因结果。", 220)}</p>
      ${chart}
      <table class="formal-mechanism-table">
        <thead><tr><th>因子</th><th>目标</th><th>基准</th><th>差距</th><th>读法</th><th>口径风险</th></tr></thead>
        <tbody>${body || `<tr><td colspan="6">暂无可用归因行。</td></tr>`}</tbody>
      </table>
    </div>`;
}

function formalMechanismAttributionSection(row = targetRecord()) {
  const pack = typeof buildMechanismFactPackObject === "function" ? buildMechanismFactPackObject(row, peerRecords()) : null;
  const modules = ["dupont", "profit", "nim", "benchmark"].map((key) => pack?.modules?.[key]).filter(Boolean);
  const cards = modules.map((module) => formalMechanismModuleCard(module)).join("");
  const headlines = modules.map((module) => module.headline).filter(Boolean).slice(0, 4);
  return `
    <section class="formal-section formal-mechanism-attribution" id="formal-mechanism-attribution">
      <div class="formal-section-kicker">机制归因总览｜DuPont · 净利润 · NIM · 多基准线</div>
      <h2>${formalEscape(displayBankName(row?.bank || state.target))}的差距判断需要先回答“差距来自哪里”，再进入专题行动</h2>
      <p class="formal-lead">${formalParagraph(`本页把后续专题统一压到四类机制证据：DuPont 解释回报差距，净利润归因解释增长质量，NIM 归因解释息差压力，多基准线判断单一均值是否误导。${headlines.join(" ")}`, 680)}</p>
      <div class="formal-mechanism-grid">${cards}</div>
      <div class="formal-risk-footnotes">
        <b>口径风险</b>
        <p><span>L1-L4</span>本页使用统一机制归因 Fact Pack。L2 指标可进入主报告但需脚注；L3/L4 指标仅作为附录或待补数据，不支撑强结论。</p>
      </div>
    </section>`;
}

function formalGuidedPathSection(row = targetRecord()) {
  const rows = typeof guidedPathRows === "function" ? guidedPathRows(row) : [];
  const cards = rows.map((item) => `
    <a class="formal-guided-step" href="${formalEscape(item.target)}">
      <span>${formalEscape(item.step)}</span>
      <b>${formalEscape(item.title)}</b>
      <p>${formalParagraph(item.reason, 160)}</p>
    </a>`).join("");
  return `
    <section class="formal-section" id="formal-guided-path">
      <div class="formal-section-kicker">推荐下钻路径</div>
      <h2>${formalEscape(displayBankName(row?.bank || state.target))}本轮应先看${formalEscape(computeVqaDiagnosis(row, peerRecords()).labels[computeVqaDiagnosis(row, peerRecords()).weakest])}，再回到其他专题验证</h2>
      <p class="formal-lead">推荐路径不是页面说明，而是根据目标银行低分位维度、对标差距和行动优先级形成的审阅顺序。若先看强项，容易把表观优势误读为经营质量改善；若先看约束项，更容易判断改善是否可持续。</p>
      <div class="formal-guided-grid">${cards}</div>
    </section>`;
}

function formalConsistencySection(row = targetRecord()) {
  const checks = typeof crossValidationNarratives === "function" ? crossValidationNarratives(row).slice(0, 5) : [];
  const cards = checks.map((item, index) => `
    <div class="formal-consistency-card">
      <span>${String(index + 1).padStart(2, "0")}</span>
      <p>${formalParagraph(item, 180)}</p>
    </div>`).join("");
  return `
    <section class="formal-section" id="formal-consistency">
      <div class="formal-section-kicker">跨专题一致性检查</div>
      <h2>强结论必须先通过盈利、风险、资本和现金流之间的一致性复核</h2>
      <p class="formal-lead">正式报告不应把单项指标改善直接解释为经营质量改善。系统会检查 NIM 与 ROA、净利润与现金流、不良率与逾期偏离、ROE 与 ROA 等信号是否存在方向背离，并据此调整结论语气。</p>
      <div class="formal-consistency-grid">${cards}</div>
    </section>`;
}

function formalPeerMatrixSection(row = targetRecord()) {
  const matrix = typeof peerHeatmapRows === "function" ? peerHeatmapRows(row) : { keys: [], rows: [] };
  const head = matrix.keys.map((key) => `<th>${formalEscape(fieldName(key))}<small>当前｜分位｜YoY</small></th>`).join("");
  const body = matrix.rows.map((bankRow) => `
    <tr class="${bankRow.isTarget ? "is-target" : ""}">
      <th>${formalEscape(displayBankName(bankRow.bank))}</th>
      ${bankRow.cells.map((cell, index) => {
        const key = matrix.keys[index];
        const bank = resolveBank(bankRow.bank);
        const curr = records.find((item) => item.bank === bank && item.year === state.year);
        const change = curr ? yoyValue(curr.bank, key) : null;
        const peerChange = avg(peerRecords().map((peer) => latest(peer.bank, state.year)).filter(Boolean), key) == null ? null : avg(peerRecords().map((peer) => latest(peer.bank, state.year)).filter(Boolean), key) - avg(peerRecords().map((peer) => latest(peer.bank, state.year - 1)).filter(Boolean), key);
        const changeTone = change == null || peerChange == null ? "flat" : (metricDirection(key) ? change >= peerChange : change <= peerChange) ? "good" : "bad";
        return `
        <td class="tone-${cell.tone}">
          <b>${formalEscape(cell.value)}</b>
          <span>${cell.pct == null ? "P--" : `P${Math.round(cell.pct)}`}</span>
          <em class="trend-${changeTone}">${formalEscape(metricDisplayValue(key, change))}</em>
        </td>`;
      }).join("")}
    </tr>`).join("");
  return `
    <section class="formal-section" id="formal-peer-matrix">
      <div class="formal-section-kicker">对标矩阵全景页</div>
      <h2>目标银行在核心指标上的位置需要放回同业矩阵中整体判断</h2>
      <p class="formal-lead">矩阵按银行列示核心指标值和全样本分位，绿色代表相对靠前，红色代表相对靠后，白色代表接近中段。目标银行行加粗显示，用于快速识别哪些差距是共性压力，哪些更可能是个体结构问题。</p>
      <div class="formal-peer-matrix-wrap">
        <table class="formal-peer-matrix">
          <thead><tr><th>银行</th>${head}</tr></thead>
          <tbody>${body}</tbody>
        </table>
      </div>
    </section>`;
}

function formalTopicSection(topicKey, index) {
  const row = targetRecord();
  const config = rsm2TopicConfig(topicKey);
  if (!row || !config) return "";
  const facts = rsm2TopicFacts(topicKey);
  const judgement = rsm2SignalFromTopic(topicKey);
  const primary = facts[0]?.指标代码 || config.keys?.[0]?.[0] || "roa";
  const attribution = typeof gapAttributionEngine === "function" ? gapAttributionEngine(primary, row, peerRecords()) : null;
  const confidence = typeof confidenceLevel === "function" ? confidenceLevel(primary, row, peerRecords()) : { level: "中", prefix: "现有数据倾向于显示", suffix: "建议保留口径提示。" };
  const temporal = typeof buildTemporalNarrative === "function" ? buildTemporalNarrative(primary, row.bank) : "";
  const mechanism = typeof buildMechanismExplanation === "function" ? buildMechanismExplanation(topicKey) : config.finding;
  const split = typeof structuralCycleTag === "function" ? structuralCycleTag(primary, row) : null;
  const drill = typeof drillDownRows === "function" ? drillDownRows(topicKey, row).slice(0, 4) : [];
  const drillHtml = drill.map((item) => `
    <div class="formal-drill-card">
      <b>${formalEscape(item.label)}</b>
      <span>目标 ${formalEscape(item.target)}｜对标 ${formalEscape(item.peer)}</span>
      <p>${formalParagraph(item.finding, 110)}</p>
    </div>`).join("");
  return `
    <section class="formal-section" id="formal-topic-${formalEscape(topicKey)}">
      <div class="formal-section-kicker">专题 ${String(index + 1).padStart(2, "0")}｜${formalEscape(config.module)}｜置信度 ${formalEscape(confidence.level)}</div>
      <h2>${formalEscape(formalAssertionTitle(topicKey, row))}</h2>
      <div class="formal-two-column">
        <div>
          <p class="formal-lead">${formalParagraph(`${targetRecord()?.bank ? formalBankName(row) : "目标银行"}本页要回答的不是“${config.title}是否好看”，而是该专题是否会改变管理层下一步排序。${confidence.prefix}，${judgement?.headline || config.finding} ${confidence.suffix}`, 320)}</p>
          <h3>1. 证据基础</h3>
          <p>${formalParagraph(facts.slice(0, 3).map((fact) => `${fact.指标名称}为${fact.目标值}，对标均值${fact.对标均值}，分位为${fact.分位}`).join("；") || "本专题缺少足够可用指标。", 520)}</p>
          ${formalFactTable(facts)}
          ${formalRiskFootnotes(facts)}
          <h3>2. 形成机制</h3>
          <p>${formalParagraph(`${formalCausalSentence(topicKey, row, peerRecords())} ${mechanism}`, 620)}</p>
          <h3>3. 差距归因与时间轨迹</h3>
          <p>${formalParagraph(`${attribution?.headline || config.finding} ${temporal}`, 620)}</p>
          <h3>4. 结构性与周期性判断</h3>
          <p>${formalParagraph(split ? `${split.label}当前被识别为${split.tag}因素。${split.note} 该判断决定行动建议是主动调整经营结构，还是保留行业周期边界并跟踪修复节奏。` : "数据不足，暂不区分结构性与周期性因素。", 520)}</p>
          <h3>5. 管理含义</h3>
          <p>${formalParagraph(formalPrioritizedAdvice(topicKey, row), 620)}</p>
        </div>
        <aside class="formal-side-note">
          <b>下钻读法</b>
          <div class="formal-drill-grid">${drillHtml}</div>
        </aside>
      </div>
    </section>`;
}

function formalWatchSection(row = targetRecord()) {
  const rows = typeof watchMetricRows === "function" ? watchMetricRows(row).slice(0, 8) : [];
  return `
    <section class="formal-section" id="formal-watch">
      <div class="formal-section-kicker">关键指标看板</div>
      <h2>${formalEscape(displayBankName(row?.bank || state.target))}后续应固定少数指标复核价值质量变化</h2>
      <p class="formal-lead">正式报告不建议追踪所有指标，而应把低分位、敏感性较高且与行动建议直接相关的指标放入董事会季度复盘。以下指标用于把本次诊断延伸为后续管理闭环。</p>
      <div class="formal-metric-grid">${rows.map((item) => formalMetricHero(item.key, row)).join("")}</div>
    </section>`;
}

function formalWhatIfSection(row = targetRecord()) {
  const scenario = typeof whatIfScenario === "function" ? whatIfScenario(row) : null;
  const rows = scenario?.driverRows || [];
  const body = rows.map((item) => `
    <tr>
      <td>${formalEscape(item.label)}</td>
      <td>${formalEscape(item.assumption)}</td>
      <td>${formalEscape(`${item.impact >= 0 ? "+" : ""}${(item.impact * 100).toFixed(2)}pct`)}</td>
      <td>${formalParagraph(item.readout, 120)}</td>
    </tr>`).join("");
  const scoreText = scenario?.scoreDelta == null ? "待测算" : `${scenario.scoreDelta >= 0 ? "+" : ""}${scenario.scoreDelta}`;
  const roaText = scenario?.roaDelta == null ? "待测算" : `${scenario.roaDelta >= 0 ? "+" : ""}${scenario.roaDelta.toFixed(2)}pct`;
  return `
    <section class="formal-section" id="formal-whatif">
      <div class="formal-section-kicker">What-if 管理推演</div>
      <h2>行动建议需要经受核心假设压力测试，而不是只在基准情形下成立</h2>
      <p class="formal-lead">本页读取页面上设置的净息差、不良率和成本收入比假设，推演其对 ROA 与 VQA 方向的影响。该测算为管理层讨论用的方向性敏感性，不替代正式预算或精算模型；若轻微假设变化即改变结论，报告语气应降级并补充验证动作。</p>
      <div class="formal-whatif-strip">
        <div><span>VQA 变化</span><b>${formalEscape(scoreText)}</b><p>推演后信号：${formalEscape(scenario?.next?.signal || "待测算")}</p></div>
        <div><span>ROA 方向影响</span><b>${formalEscape(roaText)}</b><p>推演后 ROA：${formalEscape(metricDisplayValue("roa", scenario?.simulated?.roa))}</p></div>
        <div><span>使用边界</span><b>方向性</b><p>用于董事会情景讨论，需在预算、资产负债和风险模型中复核。</p></div>
      </div>
      <table class="formal-fact-table">
        <thead><tr><th>假设</th><th>变化</th><th>ROA 方向影响</th><th>管理读法</th></tr></thead>
        <tbody>${body || `<tr><td colspan="4">确认样本后生成 What-if 推演。</td></tr>`}</tbody>
      </table>
    </section>`;
}

function formalSensitivitySection(row = targetRecord()) {
  const rows = typeof peerSensitivityRows === "function" ? peerSensitivityRows(row).slice(0, 8) : [];
  const body = rows.map((item) => `
    <tr>
      <td>${formalEscape(displayBankName(item.peer))}</td>
      <td>${formalEscape(`${item.base} → ${item.after}`)}</td>
      <td>${formalEscape(`${item.delta >= 0 ? "+" : ""}${item.delta}`)}</td>
      <td>${formalEscape(item.flip ? "信号翻转，强结论需降级" : `信号稳定，最弱维度为${item.weakest}`)}</td>
    </tr>`).join("");
  return `
    <section class="formal-section" id="formal-sensitivity">
      <div class="formal-section-kicker">同业敏感性</div>
      <h2>对标组变动未改变核心结论时，报告判断才具备进入董事会讨论基础</h2>
      <p class="formal-lead">敏感性测试逐一移除对标银行并重算 VQA 分数，用于识别结论是否依赖单一同业样本。若出现信号翻转，正文判断需要降级为“待验证”；若信号稳定，则可以作为正式报告的置信度支撑。</p>
      <table class="formal-fact-table">
        <thead><tr><th>移除样本</th><th>VQA 变化</th><th>分数影响</th><th>结论影响</th></tr></thead>
        <tbody>${body || `<tr><td colspan="4">至少保留 2 家对标银行后生成敏感性测试。</td></tr>`}</tbody>
      </table>
    </section>`;
}

function formalActionSection(row = targetRecord()) {
  const priorities = typeof actionPriorityMatrix === "function" ? actionPriorityMatrix(row).slice(0, 5) : [];
  const cards = priorities.map((item, idx) => `
    <div class="formal-action-card">
      <span>${String(idx + 1).padStart(2, "0")}</span>
      <b>${formalEscape(item.label)}</b>
      <p>综合优先级 ${formalEscape(item.total)}。影响度 ${formalEscape(Math.round(item.impact))}，可改善性 ${formalEscape(Math.round(item.feasibility))}，紧迫性 ${formalEscape(Math.round(item.urgency))}。建议纳入 0-3 个月管理层专项复核。</p>
    </div>`).join("");
  return `
    <section class="formal-section" id="formal-action">
      <div class="formal-section-kicker">行动建议</div>
      <h2>${formalEscape(displayBankName(row?.bank || state.target))}修复路径应从优先级最高的指标开始，而不是平均用力</h2>
      <p class="formal-lead">${formalParagraph(formalConsultingReadout("action", row), 520)}</p>
      <div class="formal-action-grid">${cards}</div>
      <div class="formal-roadmap">
        <div><b>0-3 个月</b><p>确认低分位指标口径、责任部门和改善阈值。</p></div>
        <div><b>3-6 个月</b><p>将息差、核心营收、风险确认和资本消耗拆到经营动作。</p></div>
        <div><b>6-12 个月</b><p>用 ROA、NIM、不良、手续费资产比和 PB 联动验证改善。</p></div>
      </div>
    </section>`;
}

function formalAppendixSection() {
  const logs = (state.sessionLog || []).slice(0, 8).map((item) => `
    <tr><td>${formalEscape(item.timestamp)}</td><td>${formalEscape(item.action)}</td><td>${formalEscape(item.finding)}</td></tr>`).join("");
  return `
    <section class="formal-section formal-appendix" id="formal-appendix">
      <div class="formal-section-kicker">附录</div>
      <h2>数据来源、分析路径和口径边界</h2>
      <p class="formal-lead">本报告使用 iFinD、上市公司年报和 RSM 整理口径，结论强度受数据完整性、口径可比性和同业样本稳定性影响。指标覆盖不足、口径风险较高或敏感性较高的判断，应在正式沟通中保留审慎表达。</p>
      <table class="formal-fact-table">
        <thead><tr><th>时间</th><th>动作</th><th>形成记录</th></tr></thead>
        <tbody>${logs || `<tr><td colspan="3">暂无路径记录。</td></tr>`}</tbody>
      </table>
      <p class="formal-source">数据来源：iFinD · 上市公司年报 · RSM 整理。测算结果为 RSM 推演，仅用于经营诊断和董事会讨论。</p>
    </section>`;
}

function formalFigureAppendixSection(limit = 8) {
  if (typeof document === "undefined" || !document.querySelectorAll) return "";
  const cards = [...document.querySelectorAll(".figure-thumb:not(.is-excluded)")].map((card) => {
    const img = card.querySelector("img");
    const src = img?.dataset?.src || img?.currentSrc || img?.src || "";
    if (!src || src.startsWith("data:image/svg+xml")) return "";
    const title = card.querySelector("b")?.textContent?.trim() || img?.alt || "图表证据";
    const note = card.querySelector("span")?.textContent?.trim() || "用于支撑专题判断和董事会讨论。";
    return `
      <figure class="formal-figure-card">
        <img src="${formalEscape(src)}" alt="${formalEscape(title)}" loading="lazy" />
        <figcaption>
          <b>${formalEscape(title)}</b>
          <span>${formalEscape(note)}</span>
        </figcaption>
      </figure>`;
  }).filter(Boolean).slice(0, limit);
  if (!cards.length) return "";
  return `
    <section class="formal-section formal-figures" id="formal-figures">
      <div class="formal-section-kicker">图表证据</div>
      <h2>核心图表进入正式报告，导出材料不再只保留文字判断</h2>
      <p class="formal-lead">本页收录可直接用于汇报和复核的图表证据。正式 HTML、PDF 和 PPTX 均读取同一组图片路径，避免图表页在导出时丢失。</p>
      <div class="formal-figure-grid">${cards.join("")}</div>
    </section>`;
}

function formalReportPageRole(section) {
  const id = section?.id || "";
  const className = section?.className || "";
  if (section?.matches?.(".formal-cover")) return "cover";
  if (id.includes("executive") || className.includes("formal-executive")) return "executive";
  if (id.includes("mechanism-attribution") || className.includes("formal-mechanism-attribution")) return "mechanism";
  if (id.includes("figures") || className.includes("formal-figures")) return "chart-evidence";
  if (id.includes("appendix") || className.includes("formal-appendix")) return "appendix";
  if (id.includes("action")) return "action";
  if (id.includes("peer") || id.includes("matrix")) return "benchmark";
  if (id.includes("whatif") || id.includes("sensitivity")) return "scenario";
  if (id.includes("v6") || id.includes("v5") || id.includes("v4")) return "deep-dive";
  return "content";
}

function formalReportDeckType(section) {
  const role = formalReportPageRole(section);
  if (role === "cover") return "cover";
  if (role === "chart-evidence") return "chart";
  if (role === "appendix") return "appendix";
  if (role === "executive") return "executive";
  if (role === "mechanism") return "mechanism";
  return "content";
}

function formalReportSectionTitle(section, index = 0) {
  const title = section?.querySelector?.("h1, h2")?.textContent?.trim();
  return title || `第 ${index + 1} 节`;
}

function formalReportModuleLabel(section) {
  return section?.querySelector?.(".formal-section-kicker")?.textContent?.trim()
    || (section?.matches?.(".formal-cover") ? "董事会经营诊断报告" : "正式报告");
}

function formalReportSections(root = document) {
  const scope = root?.querySelectorAll ? root : document;
  return [...scope.querySelectorAll("#formalReport > header, #formalReport > section")];
}

function applyFormalReportContract(root = document) {
  const sections = formalReportSections(root);
  const total = sections.length;
  sections.forEach((section, index) => {
    const id = section.id || `formal-section-${index + 1}`;
    section.id = id;
    section.dataset.slideIndex = String(index + 1);
    section.dataset.slideTotal = String(total);
    section.dataset.sectionId = id;
    section.dataset.sectionTitle = formalReportSectionTitle(section, index);
    section.dataset.moduleLabel = formalReportModuleLabel(section);
    section.dataset.pageRole = formalReportPageRole(section);
    section.dataset.deckType = formalReportDeckType(section);
  });
  return sections;
}

function buildFormalReportHtml({ exportMode = false } = {}) {
  const row = targetRecord();
  if (!row) return `<article class="formal-report empty">请先确认目标银行和对标样本。</article>`;
  const story = consultingStoryline(row);
  const diagnosis = computeVqaDiagnosis(row, peerRecords());
  const topics = rsm2MainReportTopics();
  const checks = typeof crossValidationNarratives === "function" ? crossValidationNarratives(row).slice(0, 4) : [];
  const context = typeof buildIndustryContextParagraph === "function" ? buildIndustryContextParagraph(row) : "";
  const topicSections = topics.map((topicKey, index) => formalTopicSection(topicKey, index)).join("");
  const checkCards = checks.map((item) => `<li>${formalParagraph(item, 140)}</li>`).join("");
  return `
    <article class="formal-report${exportMode ? " is-export" : ""}" id="formalReport">
      <header class="formal-cover">
        <div class="formal-brand-bars"><i></i><i></i><i></i></div>
        <div>
          <span>董事会经营诊断报告</span>
          <h1>${formalEscape(displayBankName(row.bank))}${formalEscape(state.year)}年价值质量诊断与经营对标分析</h1>
          <p>${formalEscape(story.client_question)}</p>
        </div>
        <aside>
          <b>报告版本</b><em>${formalEscape(state.reportVersion)}</em>
          <b>目标银行</b><em>${formalEscape(displayBankName(row.bank))}</em>
          <b>对标银行</b><em>${formalEscape(displayBankList(state.peers))}</em>
          <b>形成时间</b><em>${formalEscape(new Date().toLocaleString("zh-CN", { hour12: false }))}</em>
        </aside>
      </header>
      <section class="formal-executive" id="formal-executive">
        <div class="formal-section-kicker">执行摘要</div>
        <h2>${formalEscape(story.client_answer)}</h2>
        <p class="formal-lead">${formalParagraph(formalConsultingReadout("executive", row), 480)}</p>
        <div class="formal-metric-grid">
          ${["roa", "nim", "npl", "pb"].map((key) => formalMetricHero(key, row)).join("")}
        </div>
        <div class="formal-callout">
          <b>总判断</b>
          <p>VQA 当前得分为 ${formalEscape(diagnosis.score)}，信号为“${formalEscape(diagnosis.signal)}”。最需要优先解释的维度是${formalEscape(diagnosis.labels[diagnosis.weakest])}；正式报告后续章节按行业坐标、关键指标、专题归因、敏感性和行动建议逐层证明。</p>
        </div>
      </section>
      ${typeof formalV6BoardroomSections === "function" ? formalV6BoardroomSections(row) : ""}
      ${typeof formalV5ValueSections === "function" ? formalV5ValueSections(row) : ""}
      ${formalGuidedPathSection(row)}
      <section class="formal-section" id="formal-context">
        <div class="formal-section-kicker">行业坐标与交叉验证</div>
        <h2>个体差异需要先经过类型均值校准，再判断是否进入结构性归因</h2>
        <p class="formal-lead">${formalParagraph(`${formalConsultingReadout("context", row)} ${context}`, 620)}</p>
        <ul class="formal-check-list">${checkCards}</ul>
      </section>
      ${formalMechanismAttributionSection(row)}
      ${formalWatchSection(row)}
      ${formalV3SubjectSections(row)}
      ${typeof formalV4DeepDiveSections === "function" ? formalV4DeepDiveSections(row) : ""}
      ${typeof investmentEvidenceHtmlForFormal === "function" ? investmentEvidenceHtmlForFormal() : ""}
      ${formalFigureAppendixSection()}
      ${formalWhatIfSection(row)}
      ${formalPeerMatrixSection(row)}
      ${formalConsistencySection(row)}
      ${topicSections}
      ${formalSensitivitySection(row)}
      ${formalActionSection(row)}
      ${formalAppendixSection()}
    </article>`;
}

function renderFormalReport() {
  const host = document.getElementById("formalReport");
  if (!host) return;
  host.outerHTML = buildFormalReportHtml();
  if (typeof applyFormalReportContract === "function") applyFormalReportContract();
}

function bindFormalReportRender() {
  const originalRenderAll = typeof renderAll === "function" ? renderAll : null;
  if (originalRenderAll && !originalRenderAll.__formalReportWrapped) {
    renderAll = function renderAllWithFormalReport() {
      const result = originalRenderAll.apply(this, arguments);
      renderFormalReport();
      if (typeof buildSideNav === "function") buildSideNav();
      return result;
    };
    renderAll.__formalReportWrapped = true;
  }
}

bindFormalReportRender();
