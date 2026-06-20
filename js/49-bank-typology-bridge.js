/* Bank VQA module: 49-bank-typology-bridge.js
 * Sprint 17 线 C PR-1：银行类型自适应框架 Portal 端查询接口
 *
 * 数据源：data_governance/bank_typology_v1.json（由 build_bank_typology.py 生成）
 * 包含 57 家银行的 businessType（retail/corporate/transaction/universal）
 * + confidence + dimensions + decisionPath + 人工 override
 *
 * 主要接口：
 *   bankTypology(bankIdOrName)  → { businessType, confidence, dimensions, decisionPath, ... }
 *   bankTypologyAll()           → 全部 57 家分类数组
 *   bankTypologyDistribution()  → { retail: N, corporate: N, ... }
 *   bankTypologyFor(bankIdOrName, default="universal")  → 单个 businessType 字符串
 *   bankTypologyDefaultPeers(bankIdOrName)  → 按类型推荐的默认对标组 bank_id 数组
 *
 * 数据加载策略：
 *   - 优先：从 fetch('data_governance/bank_typology_v1.json') 加载（运行时）
 *   - 兜底：window.VQA_BANK_TYPOLOGY (预先注入)
 *   - 测试态：直接 require 节点上下文
 */

var BANK_TYPOLOGY_PATH = "data_governance/bank_typology_v1.json";
var BANK_TYPOLOGY_LOADED = null;       // 缓存
var BANK_TYPOLOGY_LOAD_PROMISE = null; // 防止并发重复 fetch

// PRD 第 8 节：每类银行的默认对标组（同类型代表银行）
var DEFAULT_PEERS_BY_TYPE = {
  retail: ["CMB", "PAB", "PSBC"],
  corporate: ["ICBC", "CCB", "CITIC"],
  transaction: ["CMB", "CMBC", "BCM"],
  universal: ["ICBC", "ABC", "BOC", "CCB", "BCM"]
};

function bankTypologyPayloadSync() {
  // 同步获取 payload（优先缓存，再 window 注入）
  if (BANK_TYPOLOGY_LOADED) return BANK_TYPOLOGY_LOADED;
  if (typeof window !== "undefined" && window.VQA_BANK_TYPOLOGY) {
    BANK_TYPOLOGY_LOADED = window.VQA_BANK_TYPOLOGY;
    return BANK_TYPOLOGY_LOADED;
  }
  return null;
}

function loadBankTypology() {
  // 异步加载 payload（用于 Portal bootstrap 时）
  if (BANK_TYPOLOGY_LOADED) return Promise.resolve(BANK_TYPOLOGY_LOADED);
  if (BANK_TYPOLOGY_LOAD_PROMISE) return BANK_TYPOLOGY_LOAD_PROMISE;
  if (typeof window !== "undefined" && window.VQA_BANK_TYPOLOGY) {
    BANK_TYPOLOGY_LOADED = window.VQA_BANK_TYPOLOGY;
    return Promise.resolve(BANK_TYPOLOGY_LOADED);
  }
  if (typeof fetch === "undefined") return Promise.resolve(null);
  BANK_TYPOLOGY_LOAD_PROMISE = fetch(BANK_TYPOLOGY_PATH)
    .then(function (resp) { return resp.ok ? resp.json() : null; })
    .then(function (payload) {
      BANK_TYPOLOGY_LOADED = payload;
      if (typeof window !== "undefined") window.VQA_BANK_TYPOLOGY = payload;
      return payload;
    })
    .catch(function () { return null; });
  return BANK_TYPOLOGY_LOAD_PROMISE;
}

function bankTypologyAll() {
  var p = bankTypologyPayloadSync();
  return (p && Array.isArray(p.classifications)) ? p.classifications : [];
}

function bankTypology(bankIdOrName) {
  var key = String(bankIdOrName || "").trim();
  if (!key) return null;
  var list = bankTypologyAll();
  // 先按 bank_id 精确匹配
  var direct = list.find(function (c) { return c.bank_id === key; });
  if (direct) return direct;
  // 再按 bank 中文名匹配
  var byName = list.find(function (c) { return c.bank === key; });
  if (byName) return byName;
  // 兼容简称（"杭州" → "杭州银行"）
  var byPrefix = list.find(function (c) { return c.bank && c.bank.startsWith(key); });
  return byPrefix || null;
}

function bankTypologyFor(bankIdOrName, defaultType) {
  var c = bankTypology(bankIdOrName);
  return c ? c.businessType : (defaultType || "universal");
}

function bankTypologyDistribution() {
  var p = bankTypologyPayloadSync();
  if (p && p.typeDistribution) return p.typeDistribution;
  // 兜底：从 classifications 重算
  var list = bankTypologyAll();
  var dist = {};
  list.forEach(function (c) {
    dist[c.businessType] = (dist[c.businessType] || 0) + 1;
  });
  return dist;
}

function bankTypologyDefaultPeers(bankIdOrName) {
  // 按类型推荐默认对标组，排除目标银行自身
  var c = bankTypology(bankIdOrName);
  if (!c) return [];
  var peers = DEFAULT_PEERS_BY_TYPE[c.businessType] || DEFAULT_PEERS_BY_TYPE.universal;
  return peers.filter(function (peerId) { return peerId !== c.bank_id; });
}

function bankTypologyVersion() {
  var p = bankTypologyPayloadSync();
  return p && p.version ? p.version : null;
}

if (typeof window !== "undefined") {
  window.bankTypology = bankTypology;
  window.bankTypologyAll = bankTypologyAll;
  window.bankTypologyFor = bankTypologyFor;
  window.bankTypologyDistribution = bankTypologyDistribution;
  window.bankTypologyDefaultPeers = bankTypologyDefaultPeers;
  window.bankTypologyVersion = bankTypologyVersion;
  window.loadBankTypology = loadBankTypology;
  window.DEFAULT_PEERS_BY_TYPE = DEFAULT_PEERS_BY_TYPE;
}
