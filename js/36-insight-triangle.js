/* Bank VQA module: 36-insight-triangle.js — PRD8-C01 洞察三角全量覆盖 */

/**
 * 渲染洞察三角（当前值 + 变化方向 + 机制解释）
 * @param {string} metricKey - 指标代码
 * @param {object} context - 上下文对象，包含：
 *   - currentValue: 当前值
 *   - peerValue: 对标均值
 *   - deltaYoY: 同比变化
 *   - mechanism: 机制解释文本
 * @returns {string} HTML 字符串
 */
function insightTriangle(metricKey, context = {}) {
  const {
    currentValue = null,
    peerValue = null,
    deltaYoY = null,
    mechanism = "机制解释待补充"
  } = context;

  const displayFormat = (val) => {
    if (val === null || val === undefined) return "—";
    if (typeof val === "number") return typeof metricDisplayValue === "function" ? metricDisplayValue(metricKey, val) : val.toFixed(2);
    return String(val);
  };

  const vsLabel = peerValue !== null && peerValue !== undefined
    ? currentValue > peerValue ? "（高于同业）" : currentValue < peerValue ? "（低于同业）" : "（与同业持平）"
    : "（数据待补）";

  const trendLabel = deltaYoY !== null && deltaYoY !== undefined
    ? deltaYoY > 0 ? "↗ 上升趋势" : deltaYoY < 0 ? "↘ 下降趋势" : "→ 基本持平"
    : "→ 趋势待补";

  return `
    <div class="insight-triangle" data-metric="${metricKey || 'summary'}">
      <div class="triangle-vertex">
        <span>当前值</span>
        <b>${displayFormat(currentValue)}</b>
        <em>${vsLabel}</em>
      </div>
      <div class="triangle-vertex">
        <span>变化方向</span>
        <b>${typeof deltaYoY === 'number' ? (deltaYoY > 0 ? '+' : '') + deltaYoY.toFixed(2) + '%' : '—'}</b>
        <em>${trendLabel}</em>
      </div>
      <div class="triangle-vertex">
        <span>机制解释</span>
        <b>${mechanism}</b>
      </div>
    </div>
  `;
}

/**
 * 为 5 大专题工作台首屏生成洞察三角
 * @param {string} topicId - 专题 ID（profit/spread/risk/capital/valuation）
 * @param {object} row - 目标银行数据行
 * @param {array} peers - 对标银行数据行数组
 * @returns {string} HTML 字符串
 */
function topicInsightTriangle(topicId, row = targetRecord(), peers = peerRecords()) {
  if (!row || !peers?.length) return `<div class="insight-triangle-placeholder">数据不足，洞察三角待补充</div>`;

  const topicMetricMap = {
    profit: {
      keyMetric: "roa",
      mechanism: "ROA 由核心营收增速、手续费资产比和成本效率共同驱动。若核心营收增长和手续费资产比同步改善，ROA 才具备可持续性。"
    },
    spread: {
      keyMetric: "nim",
      mechanism: "净息差受资产收益率、负债成本和存款结构影响。需同时监控息差对冲缺口和定期化压力，而不能只看 NIM 截面。"
    },
    risk: {
      keyMetric: "npl",
      mechanism: "综合不良率需与零售剪刀差、逾期偏离度、拨备覆盖率变化等指标交叉验证，判断风险是否已充分确认。"
    },
    capital: {
      keyMetric: "cet1Buffer",
      mechanism: "CET1 余量与 RWA 密度共同决定资本扩张空间。扩表必须同时约束资本消耗和 ROA 改善，方为可持续增长。"
    },
    valuation: {
      keyMetric: "pb",
      mechanism: "PB 不能孤立解释，必须由 ROA、风险确认和资本回报率共同验证。低 PB 可能反映市场对经营质量的折价。"
    }
  };

  const topic = topicMetricMap[topicId] || { keyMetric: null, mechanism: "专题待定义" };
  if (!topic.keyMetric) return `<div class="insight-triangle-placeholder">专题 ${topicId} 映射待补充</div>`;

  const metricKey = topic.keyMetric;
  const currentVal = row?.[metricKey];
  const peerVal = typeof avg === "function" ? avg(peers, metricKey) : null;
  const deltaVal = typeof yoyValue === "function" ? yoyValue(row.bank, metricKey) : null;

  return insightTriangle(metricKey, {
    currentValue: currentVal,
    peerValue: peerVal,
    deltaYoY: deltaVal,
    mechanism: topic.mechanism
  });
}

/**
 * 为 Section A 诊断顶部生成洞察三角（基于 VQA 总分）
 * @param {object} row - 目标银行数据行
 * @param {array} peers - 对标银行数据行数组
 * @returns {string} HTML 字符串
 */
function diagnosisInsightTriangle(row = targetRecord(), peers = peerRecords()) {
  if (!row || !peers?.length) return `<div class="insight-triangle-placeholder">诊断数据不足</div>`;

  const diagnosis = typeof computeVqaDiagnosis === "function" ? computeVqaDiagnosis(row, peers) : null;
  if (!diagnosis) return `<div class="insight-triangle-placeholder">VQA 诊断待计算</div>`;

  const peerDiagnoses = peers.map((peer) => typeof computeVqaDiagnosis === "function" ? computeVqaDiagnosis(peer, peers) : null).filter(Boolean);
  const peerScore = peerDiagnoses.length ? peerDiagnoses.reduce((sum, d) => sum + (d.score || 0), 0) / peerDiagnoses.length : null;

  const mechanism = `VQA 最弱维度为${diagnosis.labels?.[diagnosis.weakest] || "待判断"}。董事会讨论的第一议题应是约束项修复顺序，而不是对优势指标做正向陈述。`;

  return insightTriangle("vqa_total_score", {
    currentValue: diagnosis.score,
    peerValue: peerScore,
    deltaYoY: null,
    mechanism: mechanism
  });
}

/**
 * 插入洞察三角到指定宿主元素
 * @param {string} hostSelector - CSS 选择器
 * @param {string} html - 洞察三角 HTML
 */
function mountInsightTriangle(hostSelector, html) {
  if (!hostSelector || !html) return false;
  const host = document.querySelector(hostSelector);
  if (!host) {
    console.warn(`[insightTriangle] Host not found: ${hostSelector}`);
    return false;
  }
  const wrapper = document.createElement("div");
  wrapper.className = "insight-triangle-mount";
  wrapper.innerHTML = html;
  host.insertAdjacentElement("afterbegin", wrapper);
  return true;
}

/**
 * 为所有 5 大专题工作台自动挂载洞察三角
 */
function attachTopicInsightTriangles() {
  const topicIds = ["profit", "spread", "risk", "capital", "valuation"];
  const row = targetRecord();
  const peers = peerRecords();

  topicIds.forEach((topicId) => {
    const selectors = [
      `#topic-${topicId}-workbench`,
      `.topic-${topicId}-shell`,
      `[data-topic="${topicId}"]`
    ];

    selectors.some((sel) => {
      const html = topicInsightTriangle(topicId, row, peers);
      return mountInsightTriangle(sel, html);
    });
  });
}

/**
 * 为诊断面板挂载洞察三角
 */
function attachDiagnosisInsightTriangle() {
  const selectors = [
    "#sectionADiagnosisPanel",
    ".diagnosis-top-section",
    ".step2-diagnosis-shell"
  ];

  const html = diagnosisInsightTriangle(targetRecord(), peerRecords());
  selectors.some((sel) => mountInsightTriangle(sel, html));
}
