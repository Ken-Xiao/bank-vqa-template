/* Bank VQA module: 11-fact-pack.js — PRD-24 结构化事实包 */

function metricDirectionText(key) {
  const dir = analysisRules?.metrics?.[key]?.direction || metricDictionaryEntry(key)?.direction;
  if (dir === "higherBetter") return "指标偏高通常代表经营质量更好，但需结合风险联读";
  if (dir === "lowerBetter") return "指标偏低通常代表经营质量更好，但需结合专题联读";
  return "需结合专题与同业对标联读";
}

function buildStandardFactRow(key, row, peers, typeRows, allRows) {
  const value = row?.[key];
  const peerAvg = avg(peers, key);
  const typeAvg = avg(typeRows, key);
  const completenessRate = completeness([row, ...peers].filter(Boolean), key);
  return {
    指标代码: key,
    指标名称: metricLabel[key] || fieldName(key),
    目标银行: row?.bank || state.target,
    对标银行: state.peers.join("、"),
    分析年份: state.year,
    目标值: metricDisplayValue(key, value),
    对标均值: metricDisplayValue(key, peerAvg),
    类型均值: metricDisplayValue(key, typeAvg),
    对标差距: value == null || peerAvg == null ? "暂无" : metricDisplayValue(key, value - peerAvg),
    一年变化: row ? (yoyValue(row.bank, key) == null ? "暂无" : metricDisplayValue(key, yoyValue(row.bank, key))) : "暂无",
    五年变化: row ? (fiveYearValue(row.bank, key) == null ? "暂无" : metricDisplayValue(key, fiveYearValue(row.bank, key))) : "暂无",
    全样本分位: rankPercentile(value, allRows, key, metricDirection(key)),
    数据完整性: completenessRate == null ? "暂无" : `${(completenessRate * 100).toFixed(1)}%`,
    解释方向: metricDirectionText(key),
    原始值: value,
    可用: value !== null && value !== undefined && !Number.isNaN(value)
  };
}

function buildTopicFactPackObject(topicId = state.activeTopic) {
  const topic = topicDefinitions().find((item) => item.id === topicId) || topicDefinitions()[0];
  const row = targetRecord();
  const peers = peerRecords();
  const typeRows = currentRecords().filter((r) => state.types.includes(r.type));
  const allRows = currentRecords();
  const facts = topic.metrics.map((key) => buildStandardFactRow(key, row, peers, typeRows, allRows));
  const judgement = topicJudgement(topic.id, facts.map((fact) => ({
    ...fact,
    分位: fact.全样本分位
  })));
  return {
    type: "topic",
    topicId: topic.id,
    topicTitle: topic.title,
    question: topic.question,
    mechanism: topic.mechanism,
    judgement: {
      level: judgement.level,
      signal: judgement.signal,
      headline: judgement.headline,
      avgScore: judgement.avgScore
    },
    facts,
    generatedAt: new Date().toISOString()
  };
}

function buildChartFactPackObject(title) {
  const row = targetRecord();
  const peers = peerRecords();
  const typeRows = currentRecords();
  const allRows = currentRecords();
  const keys = metricsForChart(title);
  const facts = keys.map((key) => buildStandardFactRow(key, row, peers, typeRows, allRows));
  return {
    type: "chart",
    chartTitle: title,
    question: chartQuestion(title),
    facts,
    generatedAt: new Date().toISOString()
  };
}

function exportStructuredFactPackRows() {
  const topicRows = topicDefinitions().flatMap((topic) => {
    const pack = buildTopicFactPackObject(topic.id);
    return pack.facts.map((fact) => ({
      包类型: "专题事实包",
      专题: pack.topicTitle,
      专题判断: pack.judgement.signal,
      ...fact
    }));
  });
  const chartRows = collectChartSlides().flatMap((slide) => {
    const pack = buildChartFactPackObject(slide.title);
    return pack.facts.map((fact) => ({
      包类型: "图表事实包",
      图表: pack.chartTitle,
      图要回答: pack.question,
      ...fact
    }));
  });
  return [...topicRows, ...chartRows];
}
