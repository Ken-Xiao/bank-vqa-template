/* Bank VQA module: 50-bank-scope-data-bridge.js */

function bankScopePayload() {
  return typeof window !== "undefined" && window.VQA_BANK_SCOPE_READY ? window.VQA_BANK_SCOPE_READY : { records: [], metricQuality: [], topicFactPacks: [], sourceBridge: [], knownGaps: [] };
}

function bankScopeCanonicalBankId(bankNameOrId) {
  const key = String(bankNameOrId || "").trim();
  if (!key) return "";
  const payload = bankScopePayload();
  const direct = payload.records.find((record) => record.bank_id === key);
  if (direct) return direct.bank_id;
  const byName = payload.records.find((record) => record.bank === key);
  if (byName) return byName.bank_id;
  const aliasMap = (typeof state !== "undefined" && state.aliases) || (typeof VQA_DATA !== "undefined" && VQA_DATA.aliases) || {};
  const aliased = aliasMap[key] || key;
  const byAlias = payload.records.find((record) => record.bank === aliased);
  return byAlias ? byAlias.bank_id : key;
}

function bankScopeReadyRecord(bankNameOrId, year) {
  const bankId = bankScopeCanonicalBankId(bankNameOrId);
  return bankScopePayload().records.find((record) => record.bank_id === bankId && Number(record.year) === Number(year)) || null;
}

function bankScopeMetricQuality(bankNameOrId, year, metricOrField) {
  const bankId = bankScopeCanonicalBankId(bankNameOrId);
  return bankScopePayload().metricQuality.filter((item) => (
    item.bank_id === bankId &&
    Number(item.year) === Number(year) &&
    (item.vqa_field === metricOrField || item.metric_id === metricOrField || item.metric_name_cn === metricOrField)
  ));
}

function bankScopeTopicFactPack(packId, bankNameOrId, year) {
  const bankId = bankScopeCanonicalBankId(bankNameOrId);
  const pack = bankScopePayload().topicFactPacks.find((item) => item.packId === packId) || { packId, facts: [], factCount: 0 };
  const facts = pack.facts.filter((fact) => fact.bank_id === bankId && Number(fact.year) === Number(year));
  return { ...pack, facts };
}

function bankScopeDataSummary(bankNameOrId, year) {
  const record = bankScopeReadyRecord(bankNameOrId, year);
  const payload = bankScopePayload();
  if (!record) return { status: "missing", availableFields: 0, warningFields: 0, topicPacks: 0, knownGaps: payload.knownGaps || [] };
  const status = record._bankScopeStatus || {};
  const values = Object.values(status);
  return {
    status: "ready",
    bank_id: record.bank_id,
    bank: record.bank,
    year: record.year,
    availableFields: values.filter((item) => item === "available").length,
    warningFields: values.filter((item) => item && item !== "available").length,
    topicPacks: payload.topicFactPacks.length,
    knownGaps: payload.knownGaps || []
  };
}

if (typeof window !== "undefined") {
  window.bankScopePayload = bankScopePayload;
  window.bankScopeCanonicalBankId = bankScopeCanonicalBankId;
  window.bankScopeReadyRecord = bankScopeReadyRecord;
  window.bankScopeMetricQuality = bankScopeMetricQuality;
  window.bankScopeTopicFactPack = bankScopeTopicFactPack;
  window.bankScopeDataSummary = bankScopeDataSummary;
}
