/* Bank VQA module: 12-ai-narrative.js — PRD-25~29 AI写稿与人工编辑 */

var narrativePrompts = null;

function fallbackAiProviderConfig() {
  return { provider: "local", http: { endpoint: "", commentaryEndpoint: "" }, validation: { fallbackToLocal: true } };
}

var aiProviderConfig = fallbackAiProviderConfig();

async function loadAiProviderConfig() {
  try {
    const response = await fetch("config/ai_provider.json", { cache: "no-store" });
    if (!response.ok) throw new Error("ai provider unavailable");
    aiProviderConfig = await response.json();
  } catch (error) {
    aiProviderConfig = fallbackAiProviderConfig();
  }
  return aiProviderConfig;
}

function factPackNumberTokens(facts) {
  return facts.flatMap((fact) => [fact.目标值, fact.对标均值, fact.类型均值, fact.一年变化, fact.五年变化])
    .filter((value) => value && value !== "暂无")
    .map((value) => String(value).replace(/[^\d.x%-]/gi, "").trim())
    .filter((value) => value.length >= 2);
}

function narrativeUsesOnlyFactPackNumbers(text, facts) {
  if (!aiProviderConfig?.validation?.requireFactPackNumbers) return true;
  const allowed = new Set(factPackNumberTokens(facts));
  const numbers = String(text || "").match(/-?\d+(?:\.\d+)?(?:x|%|bp|个百分点)?/gi) || [];
  return numbers.every((token) => {
    const normalized = token.replace(/bp|个百分点/gi, "").trim();
    return [...allowed].some((item) => item.includes(normalized) || normalized.includes(item.replace(/[^\d.]/g, "")));
  });
}

function narrativeTopicFactPack(topicId) {
  return typeof layeredTopicFactModel === "function"
    ? layeredTopicFactModel(topicId)
    : buildTopicFactPackObject(topicId);
}

async function callAiNarrativeEndpoint(factPack, channel) {
  const endpoint = aiProviderConfig?.http?.endpoint;
  if (!endpoint || aiProviderConfig?.provider !== "http") return null;
  const prompt = narrativePrompts?.channels?.[channel] || {};
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), aiProviderConfig?.http?.timeoutMs || 30000);
  try {
    const response = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ channel, prompt, factPack }),
      signal: controller.signal
    });
    if (!response.ok) throw new Error("ai endpoint failed");
    const payload = await response.json();
    return payload.text || payload.content || null;
  } finally {
    clearTimeout(timeout);
  }
}

async function generateTopicNarrativeDraftAsync(topic, facts, channel) {
  const localDraft = generateTopicNarrativeDraft(topic, facts, channel);
  if (aiProviderConfig?.provider !== "http" || !aiProviderConfig?.http?.endpoint) return localDraft;
  try {
    const pack = typeof layeredTopicFactModel === "function"
      ? layeredTopicFactModel(topic.id)
      : buildTopicFactPackObject(topic.id);
    const remote = await callAiNarrativeEndpoint(pack, channel);
    if (!remote) return localDraft;
    const sanitized = sanitizeComplianceText(remote, topic.forbiddenPhrases);
    if (!narrativeUsesOnlyFactPackNumbers(sanitized, facts) && aiProviderConfig?.validation?.fallbackToLocal) return localDraft;
    return sanitized;
  } catch (error) {
    return localDraft;
  }
}

function ensureEditedNarratives() {
  if (!state.editedNarratives) state.editedNarratives = {};
}

function ensureIncludedTopics() {
  if (!state.includedTopics) {
    state.includedTopics = Object.fromEntries(topicDefinitions().map((topic) => [topic.id, true]));
  }
}

function isTopicIncluded(topicId) {
  ensureIncludedTopics();
  return state.includedTopics[topicId] !== false;
}

async function loadNarrativePrompts() {
  try {
    const response = await fetch("config/prompts.json", { cache: "no-store" });
    if (!response.ok) throw new Error("prompts unavailable");
    narrativePrompts = await response.json();
  } catch (error) {
    narrativePrompts = {
      version: "fallback",
      channels: {
        board: { label: "董事会版解读", instruction: "面向董事会汇报。", opening: "{signal}。{bank}{topicTitle}" },
        market: { label: "资本市场版解读", instruction: "面向资本市场沟通。", opening: "对资本市场表达时，应把{topicShort}放入同业对标中说明。" },
        action: { label: "管理层行动版", instruction: "面向管理层执行。", opening: "{bank}下一步应围绕本专题建立管理动作。" }
      }
    };
  }
}

function narrativeStorageKey(topicId, channel) {
  return `${topicId}.${channel}`;
}

function narrativeShortText(text, limit = 180) {
  if (typeof reportShortText === "function") return reportShortText(text, limit);
  const clean = String(text || "").replace(/\s+/g, " ").trim();
  return clean.length > limit ? `${clean.slice(0, limit)}…` : clean;
}

function consultingNaturalParagraph({ target, topic, claim, evidence, attribution, meaning, evidenceText }) {
  return [
    `${target}${topic.title.replace(/专题$/, "")}的本轮判断是：${claim}`,
    evidence,
    `形成这一判断的原因，不是单个指标高低，而是${narrativeShortText(attribution, 170)}。`,
    `${meaning}本段依据的核心指标为${evidenceText || "待补充"}。`
  ].join("");
}

function getStoredNarrative(topicId, channel) {
  ensureEditedNarratives();
  return state.editedNarratives[narrativeStorageKey(topicId, channel)] || "";
}

function saveTopicNarrativeEdit(topicId, channel, text) {
  ensureEditedNarratives();
  state.editedNarratives[narrativeStorageKey(topicId, channel)] = text;
  setProjectStatus("解读已更新，保存项目后写入报告导出。");
  buildPrintDeck();
}

function narrativeRiskForFact(fact) {
  if (!fact) return null;
  if (fact.口径风险等级) {
    const level = fact.口径风险等级;
    const tone = level === "L1" ? "green" : level === "L2" ? "yellow" : level === "L3" ? "orange" : "red";
    return {
      key: fact.指标代码,
      label: fact.指标名称 || fieldName(fact.指标代码),
      level: tone,
      riskLevel: level,
      riskLabel: fact.口径风险标签,
      risk: fact.口径脚注,
      note: fact.口径脚注,
      decisionUse: fact.报告使用建议
    };
  }
  if (typeof metricCalibrationRisk === "function") {
    const risk = metricCalibrationRisk(fact.指标代码);
    return {
      key: fact.指标代码,
      label: fact.指标名称 || fieldName(fact.指标代码),
      level: risk.tone,
      riskLevel: risk.level,
      riskLabel: risk.label,
      risk: risk.note,
      note: risk.note,
      decisionUse: risk.decisionUse
    };
  }
  if (typeof calibrationRiskItems !== "function") return null;
  const risks = calibrationRiskItems();
  return risks.find((item) => item.key === fact.指标代码) || null;
}

function narrativeRiskSuffix(facts = []) {
  const ranked = facts
    .map((fact) => narrativeRiskForFact(fact))
    .filter(Boolean)
    .sort((a, b) => {
      const rank = { red: 4, orange: 3, yellow: 2, green: 1 };
      return (rank[b.level] || 0) - (rank[a.level] || 0);
    });
  const risk = ranked[0];
  if (!risk || risk.level === "green") return "";
  const riskLevel = risk.riskLevel || (risk.level === "red" ? "L4" : risk.level === "orange" ? "L3" : "L2");
  const riskLanguage = languageDiscipline?.riskLanguage?.[risk.level] || {};
  if (risk.level === "red") return `${riskLevel}｜${risk.label}当前口径不足以支撑对标结论，相关段落已降级为待补数据事项。${risk.risk || ""}`;
  if (risk.level === "orange") return `${riskLevel}｜${risk.label}数据显示存在偏高或偏低信号，但因${risk.risk || "口径限制"}，不宜形成强结论。`;
  return `${riskLevel}｜${risk.label}需保留口径脚注：${risk.risk || "需复核口径边界"}。${riskLanguage.suffix || ""}`;
}

function downgradeNarrativeByRisk(text, facts = []) {
  const levels = facts.map((fact) => narrativeRiskForFact(fact)?.level).filter(Boolean);
  let result = String(text || "");
  if (levels.includes("red")) {
    result = result
      .replace(/高于对标均值|低于对标均值|高于对标组参照水平|低于对标组参照水平/g, "暂不形成强对标判断")
      .replace(/形成连续改善证据/g, "先补齐口径后再形成连续证据");
  } else if (levels.includes("orange")) {
    result = result
      .replace(/高于对标均值/g, "数据显示偏高")
      .replace(/低于对标均值/g, "数据显示偏低")
      .replace(/高于对标组参照水平/g, "数据显示偏高")
      .replace(/低于对标组参照水平/g, "数据显示偏低");
  }
  const suffix = narrativeRiskSuffix(facts);
  return suffix ? `${result} ${suffix}` : result;
}

function generateTopicNarrativeDraft(topic, facts, channel) {
  const base = topicAiDraft(topic, facts);
  const pack = narrativeTopicFactPack(topic.id);
  const prompt = narrativePrompts?.channels?.[channel] || {};
  const judgement = pack.judgement;
  const citations = topicCitationFacts(topic, facts);
  const evidenceText = citations.map((f) => `${f.指标名称}${f.目标值}`).join("、");
  const row = targetRecord();
  const replacements = {
    "{signal}": judgement.signal,
    "{bank}": row?.bank || state.target,
    "{topicTitle}": topic.title,
    "{topicShort}": topic.title.replace("专题", "")
  };
  let opening = prompt.opening || "";
  Object.entries(replacements).forEach(([token, value]) => {
    opening = opening.split(token).join(value);
  });
  const metricKey = citations[0]?.指标代码 || facts[0]?.指标代码 || "roa";
  const confidence = typeof confidenceLevel === "function" ? confidenceLevel(metricKey, row, peerRecords()) : { level: "中", prefix: "现有数据倾向于显示", suffix: "建议保留口径提示。" };
  const attribution = typeof gapAttributionEngine === "function" ? gapAttributionEngine(metricKey, row, peerRecords()) : null;
  const claim = `${confidence.prefix}，${judgement.headline}（置信度：${confidence.level}）。`;
  const target = displayBankName(row?.bank || state.target);
  const evidence = citations.length
    ? `${target}的关键证据落在${citations.slice(0, 3).map((f) => `${f.指标名称}${f.目标值}、对标${f.对标均值}`).join("；")}。`
    : `${target}在该专题的可用指标不足，当前只能先保留问题判断，不能直接形成强结论。`;
  const attributionText = `${attribution?.headline || topic.mechanism || opening} ${typeof buildMechanismExplanation === "function" ? buildMechanismExplanation(topic.id) : ""}`;
  const meaning = channel === "action"
    ? `${topic.actions.slice(0, 2).join("；")}。管理上建议在3个月内明确责任部门、指标阈值和复盘节奏，优先跟踪${citations.map((f) => f.指标名称).join("、") || "核心指标"}。`
    : `这意味着，本专题不能停留在单项指标说明，而要围绕${citations.map((f) => f.指标名称).join("、") || topic.title}判断经营动作是否连续有效。${confidence.suffix}`;
  const ceam = typeof ceamNarrativeBlock === "function" ? ceamNarrativeBlock(topic, facts, channel) : null;
  const naturalDraft = consultingNaturalParagraph({
    target,
    topic,
    claim: ceam?.Claim || claim,
    evidence: ceam?.Evidence || evidence,
    attribution: ceam?.Attribution || attributionText,
    meaning: ceam?.Meaning || meaning,
    evidenceText
  });
  const text = sanitizeComplianceText(downgradeNarrativeByRisk(naturalDraft, citations), topic.forbiddenPhrases);
  if (channel === "board") return text || base.board;
  if (channel === "market") return text || base.market;
  return text || base.action;
}

function getTopicNarrative(topicId, channel) {
  const stored = getStoredNarrative(topicId, channel);
  if (stored) {
    return {
      text: stored,
      citations: topicCitationFacts(topicDefinitions().find((t) => t.id === topicId) || topicDefinitions()[0], topicFactPackRows(topicId)),
      source: "edited"
    };
  }
  const topic = topicDefinitions().find((item) => item.id === topicId) || topicDefinitions()[0];
  const facts = topicFactPackRows(topicId);
  const draft = generateTopicNarrativeDraft(topic, facts, channel);
  return {
    text: draft,
    citations: topicCitationFacts(topic, facts),
    source: "generated"
  };
}

function getTopicNarratives(topicId) {
  return {
    board: getTopicNarrative(topicId, "board"),
    market: getTopicNarrative(topicId, "market"),
    action: getTopicNarrative(topicId, "action")
  };
}

function getReportTopicNarratives(topicId) {
  const all = getTopicNarratives(topicId);
  const channel = typeof reportPrimaryNarrativeChannel === "function" ? reportPrimaryNarrativeChannel() : "board";
  return { channel, primary: all[channel], all };
}

function topicReportCommentRows(topicId) {
  const topic = topicDefinitions().find((item) => item.id === topicId) || topicDefinitions()[0];
  const facts = topicFactPackRows(topicId);
  const judgement = topicJudgement(topicId, facts);
  const pack = getReportTopicNarratives(topicId);
  const evidence = judgement.evidence.map((fact) => `${fact.指标名称}${fact.目标值}（${fact.分位}）`).join("；");
  const citations = pack.primary?.citations || pack.all.board?.citations || [];
  const rows = [
    ["专题判断", `${judgement.signal}。${judgement.headline}`],
    ["证据指标", evidence || "暂无可用证据指标"]
  ];
  if (pack.channel === "market") {
    rows.push(["资本市场版解读", pack.primary?.text || ""]);
  } else if (pack.channel === "action") {
    rows.push(["管理层行动版", pack.primary?.text || ""]);
  } else {
    rows.push(["董事会版解读", pack.all.board?.text || ""]);
    rows.push(["资本市场版解读", pack.all.market?.text || ""]);
    rows.push(["管理层行动版", pack.all.action?.text || ""]);
  }
  rows.push(["引用指标", citations.map((fact) => `${fact.指标名称}${fact.目标值}`).join("；")]);
  rows.push(["规则留痕", `规则版本 ${typeof rulesVersionLabel === "function" ? rulesVersionLabel() : "未标注"}｜报告语气 ${typeof reportVersionToneLabel === "function" ? reportVersionToneLabel() : "董事会汇报语气"}`]);
  return rows.map(([label, value]) => `<div class="print-comment"><b>${label}</b>${sanitizeComplianceText(value, topic.forbiddenPhrases)}</div>`).join("");
}

function updateAiProductPanel() {
  const row = targetRecord();
  const mode = document.getElementById("aiProductMode");
  const evidence = document.getElementById("aiProductEvidence");
  const guardrail = document.getElementById("aiProductGuardrail");
  const output = document.getElementById("aiProductOutput");
  if (!mode || !evidence || !guardrail || !output) return;
  if (!row) {
    mode.textContent = "确认分析后，本区将围绕目标银行、对标组和类型均值展示董事会版、资本市场版和管理层行动版解读。";
    evidence.textContent = "等待选择目标银行和对标银行。";
    guardrail.textContent = "所有文字必须回到指标、分位、对标均值和时间变化。";
    output.textContent = "汇报稿、数据附录和指标底稿共享同一套事实口径。";
    return;
  }
  const peers = peerRecords();
  const factPack = vqaFactPack(row, peers);
  const activeTopic = topicDefinitions().find((topic) => topic.id === state.activeTopic) || topicDefinitions()[0];
  const topicFacts = topicFactPackRows(activeTopic.id);
  const judgement = topicJudgement(activeTopic.id, topicFacts);
  const citations = topicCitationFacts(activeTopic, topicFacts);
  mode.textContent = `当前分析对象为 ${displayBankName(row.bank)}，对标组为 ${displayBankList(state.peers)}，类型参照为 ${state.types.join("、") || "所选类型银行"}；解读口径为${state.reportVersion}。`;
  evidence.textContent = `当前价值质量诊断为 ${factPack?.diagnosis?.score || "暂无"} 分 / ${factPack?.diagnosis?.signal || "待形成"}；当前专题为${activeTopic.title}，专题判断为${judgement.signal}。`;
  guardrail.textContent = citations.length
    ? `本轮解读引用 ${citations.map((fact) => `${fact.指标名称}${fact.目标值}`).join("、")}，并同步校验对标均值、类型均值、一年变化和五年变化。`
    : "当前专题可引用指标不足，结论强度应下调，并进入附录或待补数据清单。";
  output.textContent = "汇报材料将保留引用指标和数据底稿，便于董事会、财务和战略团队复核。";
}

if (typeof renderAll === "function" && !renderAll.__aiProductWrapped) {
  var renderAllWithAiProductPanel = renderAll;
  renderAll = function renderAllAndUpdateAiProductPanel() {
    const result = renderAllWithAiProductPanel.apply(this, arguments);
    updateAiProductPanel();
    return result;
  };
  renderAll.__aiProductWrapped = true;
}

function regenerateTopicNarratives(topicId = state.activeTopic) {
  ensureEditedNarratives();
  ["board", "market", "action"].forEach((channel) => {
    delete state.editedNarratives[narrativeStorageKey(topicId, channel)];
  });
  renderTopicWorkbench();
  buildPrintDeck();
  setProjectStatus("已基于最新事实包重新生成本专题解读。");
}

async function generateTopicNarrativesWithAiForTopic(topicId = state.activeTopic) {
  ensureEditedNarratives();
  ["board", "market", "action"].forEach((channel) => {
    delete state.editedNarratives[narrativeStorageKey(topicId, channel)];
  });
  const topic = topicDefinitions().find((item) => item.id === topicId) || topicDefinitions()[0];
  const facts = topicFactPackRows(topic.id);
  for (const channel of ["board", "market", "action"]) {
    const text = await generateTopicNarrativeDraftAsync(topic, facts, channel);
    state.editedNarratives[narrativeStorageKey(topicId, channel)] = text;
  }
  return state.editedNarratives;
}

async function regenerateTopicNarrativesWithAi(topicId = state.activeTopic) {
  await generateTopicNarrativesWithAiForTopic(topicId);
  renderTopicWorkbench();
  buildPrintDeck();
  const mode = aiProviderConfig?.provider === "http" && aiProviderConfig?.http?.endpoint ? "AI接口" : "本地模板";
  setProjectStatus(`已使用${mode}重新生成本专题三类解读。`);
}

function bindTopicNarrativeEditors(host, topicId) {
  host.querySelectorAll("[data-narrative-channel]").forEach((textarea) => {
    const channel = textarea.dataset.narrativeChannel;
    if (typeof isNarrativeLocked === "function" && isNarrativeLocked(topicId, channel)) {
      textarea.disabled = true;
      textarea.title = "该段文案已锁定，需先在 AI 写稿治理面板解锁后再编辑。";
      return;
    }
    textarea.addEventListener("change", () => {
      saveTopicNarrativeEdit(topicId, textarea.dataset.narrativeChannel, textarea.value);
      if (typeof resetDeliveryToDraft === "function") resetDeliveryToDraft("AI 解读已编辑，需重新复核。");
      if (typeof renderAiGovernancePanel === "function") renderAiGovernancePanel();
    });
  });
  host.querySelector("#regenerateTopicNarrative")?.addEventListener("click", () => regenerateTopicNarratives(topicId));
  host.querySelector("#regenerateTopicNarrativeAi")?.addEventListener("click", () => regenerateTopicNarrativesWithAi(topicId));
  host.querySelectorAll("[data-topic-include]").forEach((input) => {
    input.addEventListener("change", () => {
      ensureIncludedTopics();
      state.includedTopics[input.dataset.topicInclude] = input.checked;
      buildPrintDeck();
      setProjectStatus("专题纳入报告设置已更新。");
    });
  });
}

function initAiNarrativeModule() {
  ensureEditedNarratives();
  ensureIncludedTopics();
}

/* PRD-L01-Phase1: 本地语言强度分层 */

/**
 * 根据 Z-Score 和风险等级判断语言表达强度
 * @param {number} zScore - 标准分（相对对标组）
 * @param {string} riskLevel - 风险等级（L1|L2|L3|L4）
 * @returns {string} "strong" | "implicit" | "tentative"
 */
function languageStrengthTier(zScore, riskLevel = "L3") {
  const absZ = Math.abs(zScore || 0);

  /* strong: 信号强 + 风险低 */
  if (absZ > 1.5 && (riskLevel === "L1" || riskLevel === "L2")) {
    return "strong";
  }

  /* implicit: 信号中等 或 风险中等 */
  if (absZ > 0.8 || riskLevel === "L3") {
    return "implicit";
  }

  /* tentative: 信号弱 或 风险高 */
  return "tentative";
}

/**
 * 根据强度等级生成差异化表述模板
 * @param {string} strength - 强度等级（strong|implicit|tentative）
 * @param {string} claim - 核心观点
 * @param {string} evidence - 证据描述
 * @returns {string} 差异化表述文本
 */
function phraseByStrength(strength, claim, evidence) {
  const templates = {
    strong: `${claim}，证据：${evidence}`,
    implicit: `${claim}的可能性较大，${evidence}可作为初步参照`,
    tentative: `${claim}仍需进一步验证，${evidence}仅供口径参考`
  };
  return templates[strength] || templates.implicit;
}

/**
 * 为断言或章节标题自动套用强度模板（主要用于 L4 风险降级）
 * @param {string} topicKey - 专题 ID
 * @param {object} context - 上下文，包含 zScore, riskLevel, claim, evidence 等
 * @returns {string} 带强度修饰的断言文本
 */
function formalAssertionWithStrength(topicKey, context = {}) {
  const {
    zScore = 0,
    riskLevel = "L3",
    claim = null,
    evidence = null,
    row = targetRecord()
  } = context;

  /* 获取基础断言（来自 formalAssertionTitle） */
  const baseAssertion = typeof formalAssertionTitle === "function"
    ? formalAssertionTitle(topicKey, row)
    : `关于${topicKey}的分析`;

  /* 若无明确证据且风险为 L4，使用 tentative 模板 */
  if (riskLevel === "L4" && !evidence) {
    return `${baseAssertion}仍需进一步验证。`;
  }

  /* 若有完整上下文，使用强度分层模板 */
  if (claim && evidence) {
    const strength = languageStrengthTier(zScore, riskLevel);
    return phraseByStrength(strength, claim, evidence);
  }

  return baseAssertion;
}
