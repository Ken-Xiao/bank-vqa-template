/* Bank VQA module: 36-layered-fact-model.js */

function layeredFactPackId(topicId, bank = state.target, year = state.year) {
  return [bank || "unknown-bank", year || "unknown-year", topicId || "overview"].join("::");
}

function layeredMetricQualityRows(bank = state.target, year = state.year) {
  const rows = Array.isArray(readyMetricQuality) ? readyMetricQuality : [];
  return rows.filter((row) => {
    const sameBank = row.bank === bank || (typeof displayBankName === "function" && displayBankName(row.bank) === displayBankName(bank));
    return sameBank && Number(row.year) === Number(year);
  });
}

function layeredTopicFactModel(topicId = state.activeTopic) {
  const facts = typeof topicFactPackRows === "function" ? topicFactPackRows(topicId) : [];
  const evidenceFacts = typeof topicAvailableFacts === "function"
    ? topicAvailableFacts(facts)
    : facts.filter((fact) => fact.是否可用证据 === "是");
  const boundaryFacts = typeof topicDataBoundaryFacts === "function"
    ? topicDataBoundaryFacts(facts)
    : facts.filter((fact) => fact.是否可用证据 !== "是");
  const judgement = typeof topicJudgement === "function" ? topicJudgement(topicId, facts) : null;
  const topic = judgement?.topic || (typeof topicDefinitions === "function" ? topicDefinitions().find((item) => item.id === topicId) : null);
  const citations = topic && typeof topicCitationFacts === "function" ? topicCitationFacts(topic, facts) : [];
  const qualityRows = layeredMetricQualityRows(state.target, state.year);
  const evidencePack = typeof buildEvidencePack === "function"
    ? buildEvidencePack({
      blockId: layeredFactPackId(topicId),
      facts: evidenceFacts,
      calculations: citations,
      quality: qualityRows,
      context: {
        topicId,
        targetBank: state.target,
        year: state.year,
        peers: Array.isArray(state.peers) ? state.peers.slice() : [],
        reportVersion: state.reportVersion
      }
    })
    : {
      blockId: layeredFactPackId(topicId),
      facts: evidenceFacts,
      calculations: citations,
      quality: qualityRows,
      lineageStatus: "partial"
    };
  return {
    factPackId: layeredFactPackId(topicId),
    topicId,
    targetBank: state.target,
    year: state.year,
    peers: Array.isArray(state.peers) ? state.peers.slice() : [],
    reportVersion: state.reportVersion,
    metricQuality: qualityRows,
    facts,
    evidencePack,
    sourceRefs: evidencePack.facts?.flatMap((fact) => fact.sourceRefs || []) || [],
    lineageStatus: evidencePack.lineageStatus,
    evidenceFacts,
    boundaryFacts,
    judgement,
    citations,
    dataWarnings: boundaryFacts.map((fact) => ({
      metric: fact.指标代码,
      label: fact.指标名称,
      status: fact.数据状态,
      reason: fact.缺失原因,
      sourceHint: fact.抓取来源
    }))
  };
}

function layeredFactModel() {
  const topics = typeof topicDefinitions === "function" ? topicDefinitions() : [];
  return {
    version: "20260606-layered-v1",
    targetBank: state.target,
    year: state.year,
    peers: Array.isArray(state.peers) ? state.peers.slice() : [],
    reportVersion: state.reportVersion,
    topics: topics.map((topic) => layeredTopicFactModel(topic.id))
  };
}

if (typeof window !== "undefined") {
  window.layeredFactModel = layeredFactModel;
  window.layeredTopicFactModel = layeredTopicFactModel;
}
