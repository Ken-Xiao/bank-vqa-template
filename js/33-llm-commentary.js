/* Bank VQA module: 33-llm-commentary.js — bank-level LLM commentary adapter */

function ensureBankCommentaries() {
  if (!state.bankCommentaries) state.bankCommentaries = {};
  if (!state.activeBankCommentaryChannel) state.activeBankCommentaryChannel = "board";
}

function bankCommentaryChannelLabel(channel = "board") {
  return {
    board: "董事会版评论",
    market: "资本市场版评论",
    action: "管理层行动版评论"
  }[channel] || "董事会版评论";
}

function bankCommentaryFactPack(row = typeof targetRecord === "function" ? targetRecord() : null, peers = typeof peerRecords === "function" ? peerRecords() : []) {
  const diagnosis = row && typeof computeVqaDiagnosis === "function" ? computeVqaDiagnosis(row, peers) : null;
  const pb = row && typeof theoreticalPB === "function" ? theoreticalPB(row) : null;
  const pricing = row && typeof pbPricingFactorReadout === "function" ? pbPricingFactorReadout(row, peers) : null;
  const anomaly = row && typeof v6AnomalyRadar === "function" ? v6AnomalyRadar(row, peers) : null;
  const sparc = row && typeof sparcDimensionScores === "function" ? sparcDimensionScores(row) : [];
  const topics = typeof topicDefinitions === "function"
    ? topicDefinitions().slice(0, 6).map((topic) => {
      const facts = typeof topicFactPackRows === "function" ? topicFactPackRows(topic.id) : [];
      const judgement = typeof topicJudgement === "function" ? topicJudgement(topic.id, facts) : null;
      return {
        id: topic.id,
        title: topic.title,
        signal: judgement?.signal || "待判断",
        headline: judgement?.headline || topic.question || "待形成专题判断",
        evidence: facts.slice(0, 3).map((fact) => ({
          metric: fact.指标代码,
          label: fact.指标名称,
          target: fact.目标值,
          peer: fact.对标均值,
          percentile: fact.分位,
          risk: fact.口径风险等级
        }))
      };
    })
    : [];
  return {
    generatedAt: new Date().toISOString(),
    bank: row?.bank || state.target,
    displayBank: typeof displayBankName === "function" ? displayBankName(row?.bank || state.target) : (row?.bank || state.target),
    year: state.year,
    reportVersion: state.reportVersion,
    peerBanks: [...state.peers],
    peerType: state.peerType,
    selectedTypes: [...(state.types || [])],
    diagnosis: diagnosis ? {
      score: diagnosis.score,
      signal: diagnosis.signal,
      weakest: diagnosis.labels?.[diagnosis.weakest] || diagnosis.weakest,
      action: diagnosis.dimensions?.[diagnosis.weakest]?.actionTitle || ""
    } : null,
    sparc: sparc.map((item) => ({
      code: item.code,
      label: item.label,
      score: item.score,
      weakestMetric: item.weakestMetric ? {
        key: item.weakestMetric.key,
        label: item.weakestMetric.label,
        value: typeof metricDisplayValue === "function" ? metricDisplayValue(item.weakestMetric.key, item.weakestMetric.value) : item.weakestMetric.value
      } : null
    })),
    pb: {
      actual: row?.pb ?? null,
      theoretical: pb?.pb ?? null,
      label: pricing?.typeNote?.headline || pb?.label || "",
      lines: pricing?.lines || []
    },
    anomalies: anomaly ? {
      positive: anomaly.positive?.slice(0, 4).map(bankCommentaryAnomalyRow) || [],
      negative: anomaly.negative?.slice(0, 4).map(bankCommentaryAnomalyRow) || [],
      deviations: anomaly.deviations?.slice(0, 4).map(bankCommentaryAnomalyRow) || [],
      cross: anomaly.cross?.slice(0, 4).map(bankCommentaryAnomalyRow) || []
    } : null,
    topics,
    dataQuality: typeof criticalMetricCompleteness === "function" ? criticalMetricCompleteness() : null,
    guardrails: {
      noExternalNumbers: true,
      citeFactPackOnly: true,
      riskAwareTone: true,
      noInvestmentAdvice: true
    }
  };
}

function bankCommentaryAnomalyRow(item = {}) {
  const tag = typeof v6AnomalySemanticTag === "function" ? v6AnomalySemanticTag(item) : { label: item.tag || "待判断" };
  return {
    key: item.key,
    label: item.label || (typeof fieldName === "function" ? fieldName(item.key) : item.key),
    current: typeof metricDisplayValue === "function" ? metricDisplayValue(item.key, item.current) : item.current,
    peer: typeof metricDisplayValue === "function" ? metricDisplayValue(item.key, item.peer) : item.peer,
    signal: tag.label,
    direction: item.momentum?.direction || "",
    acceleration: item.momentum?.acceleration || ""
  };
}

function bankCommentaryPrompt(pack = bankCommentaryFactPack(), channel = "board") {
  const label = bankCommentaryChannelLabel(channel);
  return {
    role: label,
    instruction: [
      `请为${pack.displayBank}${pack.year}年银行经营质量分析生成${label}。`,
      "必须使用咨询表达：先给判断，再给证据，再解释机制，最后给管理含义。",
      "不得编造事实包之外的数字，不得给投资建议，不得使用空泛方法论。",
      "如果事实包数据不足，应明确降级表达并说明需要补充的数据。"
    ].join("\n"),
    requiredStructure: ["核心判断", "关键证据", "机制解释", "管理含义"],
    factPack: pack
  };
}

function localBankCommentaryDraft(pack = bankCommentaryFactPack(), channel = "board") {
  const target = pack.displayBank || "目标银行";
  const diagnosis = pack.diagnosis;
  const weak = diagnosis?.weakest || "价值质量约束";
  const score = diagnosis?.score == null ? "待测算" : `${diagnosis.score}分`;
  const pb = pack.pb?.actual == null ? "PB待补" : `PB ${typeof metricDisplayValue === "function" ? metricDisplayValue("pb", pack.pb.actual) : pack.pb.actual}`;
  const negative = pack.anomalies?.negative?.[0];
  const deviation = pack.anomalies?.deviations?.[0] || pack.anomalies?.cross?.[0];
  const topic = pack.topics?.[0];
  const evidence = [
    diagnosis ? `VQA ${score}，系统信号为${diagnosis.signal || "待判断"}` : "VQA诊断待生成",
    pack.pb?.label || pb,
    negative ? `${negative.label}${negative.direction || negative.current}` : "",
    deviation ? `${deviation.label}相对对标组${deviation.signal}` : ""
  ].filter(Boolean).join("；");
  const channelLead = channel === "market"
    ? "对资本市场沟通时，重点不是宣称估值修复，而是说明经营质量、风险确认和同业位置能否支撑估值叙事。"
    : channel === "action"
      ? "对管理层而言，这段评论应落到责任动作、复盘指标和时间窗口。"
      : "对董事会而言，这段评论应先回答价值质量约束是否已经影响下一阶段经营优先级。";
  return [
    `${target}当前的核心判断是：${weak}需要被放在董事会议程前列，而不是只作为单项指标波动处理。`,
    `关键证据是：${evidence}。`,
    `从机制上看，这一判断需要把同业位置、PB定价和异动偏离放在同一条证据链中复核；${topic?.headline || "专题证据将决定该判断能否进入正式报告主线"}。`,
    `${channelLead}${diagnosis?.action ? `下一步建议围绕“${diagnosis.action}”形成0-3个月复核动作。` : "下一步应先补齐事实包，再决定是否形成强判断。"}`
  ].join("");
}

async function callBankCommentaryEndpoint(pack, channel = "board") {
  const endpoint = aiProviderConfig?.http?.commentaryEndpoint || aiProviderConfig?.http?.endpoint;
  if (!endpoint || aiProviderConfig?.provider !== "http") return null;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), aiProviderConfig?.http?.timeoutMs || 30000);
  try {
    const response = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        kind: "bank-commentary",
        channel,
        prompt: bankCommentaryPrompt(pack, channel),
        factPack: pack
      }),
      signal: controller.signal
    });
    if (!response.ok) throw new Error("bank commentary endpoint failed");
    const payload = await response.json();
    return payload.text || payload.content || payload.commentary || null;
  } finally {
    clearTimeout(timeout);
  }
}

async function generateBankCommentaryAsync(channel = "board", useRemote = true) {
  ensureBankCommentaries();
  const pack = bankCommentaryFactPack();
  const local = localBankCommentaryDraft(pack, channel);
  const fallbackToLocal = aiProviderConfig?.validation?.fallbackToLocal !== false;
  if (!useRemote) {
    state.bankCommentaries[channel] = { text: local, source: "local", generatedAt: new Date().toISOString() };
    return state.bankCommentaries[channel];
  }
  try {
    const remote = await callBankCommentaryEndpoint(pack, channel);
    const text = remote ? sanitizeComplianceText(remote) : fallbackToLocal ? local : "";
    state.bankCommentaries[channel] = {
      text,
      source: remote ? "llm" : fallbackToLocal ? "local" : "failed",
      generatedAt: new Date().toISOString()
    };
  } catch (error) {
    state.bankCommentaries[channel] = {
      text: fallbackToLocal ? local : "",
      source: fallbackToLocal ? "local" : "failed",
      generatedAt: new Date().toISOString(),
      error: error.message
    };
  }
  return state.bankCommentaries[channel];
}

function getBankCommentary(channel = "board") {
  ensureBankCommentaries();
  if (state.bankCommentaries[channel]?.text) return state.bankCommentaries[channel];
  const pack = bankCommentaryFactPack();
  return { text: localBankCommentaryDraft(pack, channel), source: "local-preview", generatedAt: "" };
}

function updateBankCommentaryPanel() {
  const status = document.getElementById("aiCommentaryStatus");
  const preview = document.getElementById("aiCommentaryPreview");
  if (!status || !preview) return;
  ensureBankCommentaries();
  const channel = state.activeBankCommentaryChannel || "board";
  const row = typeof targetRecord === "function" ? targetRecord() : null;
  if (!row) {
    status.textContent = "等待选择银行";
    preview.textContent = "确认分析后生成当前银行的董事会版评论；接入后端模型接口后，可自动改写为更自然的咨询语言。";
    return;
  }
  const commentary = getBankCommentary(channel);
  const remoteReady = aiProviderConfig?.provider === "http" && !!(aiProviderConfig?.http?.commentaryEndpoint || aiProviderConfig?.http?.endpoint);
  status.textContent = commentary.source === "llm" ? `${bankCommentaryChannelLabel(channel)}｜模型已生成` : remoteReady ? `${bankCommentaryChannelLabel(channel)}｜模型接口可用` : `${bankCommentaryChannelLabel(channel)}｜本地模板预览`;
  preview.textContent = commentary.text;
  document.querySelectorAll("[data-bank-commentary-channel]").forEach((button) => {
    button.classList.toggle("is-active", button.dataset.bankCommentaryChannel === channel);
  });
}

function bindBankCommentaryActions() {
  const localButton = document.getElementById("regenerateBankCommentary");
  const aiButton = document.getElementById("regenerateBankCommentaryAi");
  document.querySelectorAll("[data-bank-commentary-channel]").forEach((button) => {
    if (button.dataset.bound) return;
    button.dataset.bound = "1";
    button.addEventListener("click", () => {
      state.activeBankCommentaryChannel = button.dataset.bankCommentaryChannel || "board";
      updateBankCommentaryPanel();
    });
  });
  if (localButton && !localButton.dataset.bound) {
    localButton.dataset.bound = "1";
    localButton.addEventListener("click", async () => {
      const channel = state.activeBankCommentaryChannel || "board";
      await generateBankCommentaryAsync(channel, false);
      updateBankCommentaryPanel();
      if (typeof setProjectStatus === "function") setProjectStatus(`已使用本地事实包重新生成${bankCommentaryChannelLabel(channel)}。`);
    });
  }
  if (aiButton && !aiButton.dataset.bound) {
    aiButton.dataset.bound = "1";
    aiButton.addEventListener("click", async () => {
      const channel = state.activeBankCommentaryChannel || "board";
      await generateBankCommentaryAsync(channel, true);
      updateBankCommentaryPanel();
      const mode = getBankCommentary(channel).source === "llm" ? "模型接口" : "本地模板";
      if (typeof setProjectStatus === "function") setProjectStatus(`已使用${mode}生成${bankCommentaryChannelLabel(channel)}。`);
    });
  }
}

function bankCommentaryExportRows() {
  ensureBankCommentaries();
  const pack = bankCommentaryFactPack();
  return ["board", "market", "action"].map((channel) => {
    const commentary = getBankCommentary(channel);
    return {
      评论版本: bankCommentaryChannelLabel(channel),
      来源: commentary.source || "local-preview",
      生成时间: commentary.generatedAt || "",
      目标银行: pack.displayBank || "",
      分析年份: pack.year || "",
      VQA信号: pack.diagnosis?.signal || "",
      最弱维度: pack.diagnosis?.weakest || "",
      事实包约束: pack.guardrails?.citeFactPackOnly ? "仅引用事实包" : "未启用",
      评论正文: commentary.text
    };
  });
}

function initLlmCommentaryModule() {
  ensureBankCommentaries();
  bindBankCommentaryActions();
  updateBankCommentaryPanel();
  if (typeof renderAll === "function" && !renderAll.__llmCommentaryWrapped) {
    const originalRenderAll = renderAll;
    renderAll = function renderAllWithLlmCommentary() {
      const result = originalRenderAll.apply(this, arguments);
      bindBankCommentaryActions();
      updateBankCommentaryPanel();
      return result;
    };
    renderAll.__llmCommentaryWrapped = true;
  }
}
