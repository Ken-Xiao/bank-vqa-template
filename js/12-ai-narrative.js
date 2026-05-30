/* Bank VQA module: 12-ai-narrative.js — PRD-25~29 AI写稿与人工编辑 */

var narrativePrompts = null;
var aiProviderConfig = null;

async function loadAiProviderConfig() {
  try {
    const response = await fetch("config/ai_provider.json", { cache: "no-store" });
    if (!response.ok) throw new Error("ai provider unavailable");
    aiProviderConfig = await response.json();
  } catch (error) {
    aiProviderConfig = { provider: "local", http: { endpoint: "" }, validation: { fallbackToLocal: true } };
  }
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
    const pack = buildTopicFactPackObject(topic.id);
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

function generateTopicNarrativeDraft(topic, facts, channel) {
  const base = topicAiDraft(topic, facts);
  const pack = buildTopicFactPackObject(topic.id);
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
  const why = `${opening}${citations[0] ? ` ${citations[0].指标名称}为${citations[0].目标值}，对标均值${citations[0].对标均值}。` : ""}`;
  const meaning = `${topic.mechanism} 当前专题平均分位约 ${judgement.avgScore}，一句话结论：${judgement.headline}`;
  const next = channel === "action"
    ? `${topic.actions.slice(0, 2).join("；")}。优先跟踪：${citations.map((f) => f.指标名称).join("、")}。`
    : `建议围绕${citations.map((f) => f.指标名称).join("、")}形成连续改善证据，并回到事实包复核。`;
  const text = sanitizeComplianceText(`${why} ${meaning} ${next} 依据指标：${evidenceText}。`, topic.forbiddenPhrases);
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

async function regenerateTopicNarrativesWithAi(topicId = state.activeTopic) {
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
  renderTopicWorkbench();
  buildPrintDeck();
  const mode = aiProviderConfig?.provider === "http" && aiProviderConfig?.http?.endpoint ? "AI接口" : "本地模板";
  setProjectStatus(`已使用${mode}重新生成本专题三类解读。`);
}

function bindTopicNarrativeEditors(host, topicId) {
  host.querySelectorAll("[data-narrative-channel]").forEach((textarea) => {
    textarea.addEventListener("change", () => {
      saveTopicNarrativeEdit(topicId, textarea.dataset.narrativeChannel, textarea.value);
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
