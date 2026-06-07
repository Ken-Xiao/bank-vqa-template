/* Bank VQA module: 37-deepseek-rewrite-orchestrator.js */

function ensureRewriteState() {
  if (!state.generatedRewrites) state.generatedRewrites = {};
  if (!state.reportRewrites) state.reportRewrites = {};
  if (!state.rewriteQualityWarnings) state.rewriteQualityWarnings = [];
}

function currentAnalysisSelectionKey() {
  if (typeof analysisSelectionKey === "function") return analysisSelectionKey();
  return [
    state.target || "",
    state.year || "",
    (state.peers || []).join("|"),
    (state.types || []).join("|"),
    state.reportVersion || ""
  ].join("::");
}

function rewriteBlockRegistry() {
  const topicIds = typeof topicDefinitions === "function" ? topicDefinitions().map((topic) => topic.id) : [];
  const base = [
    {
      blockId: "bank.summary",
      blockType: "bank.summary",
      page: "executive",
      channel: "board",
      title: "银行级经营质量结论",
      priority: "P0",
      writeTarget: { statePath: "bankCommentaries.board", domId: "aiCommentaryPreview" }
    },
    {
      blockId: "executive.answer",
      blockType: "executive.answer",
      page: "executive",
      channel: "board",
      title: "30秒结论",
      priority: "P0",
      writeTarget: { statePath: "generatedRewrites.executive.answer", domId: "step2DecisionBrief" }
    },
    {
      blockId: "evidence.map.deviation",
      blockType: "evidence.map.deviation",
      page: "evidence",
      channel: "board",
      title: "异动偏离解读",
      priority: "P0",
      writeTarget: {
        statePath: "evidenceMapCommentary",
        domId: "step2EvidenceCommentaryText",
        reportSectionId: "formal-v5-deviation-radar"
      }
    }
  ];
  const topicBlocks = topicIds.flatMap((topicId) => ([
    { blockId: `topic.board.${topicId}`, blockType: "topic.board", page: "topic", channel: "board", topicId, title: "专题董事会版解读", priority: "P0", writeTarget: { statePath: `editedNarratives.${topicId}.board` } },
    { blockId: `topic.market.${topicId}`, blockType: "topic.market", page: "topic", channel: "market", topicId, title: "专题资本市场版解读", priority: "P0", writeTarget: { statePath: `editedNarratives.${topicId}.market` } },
    { blockId: `topic.action.${topicId}`, blockType: "topic.action", page: "topic", channel: "action", topicId, title: "专题管理层行动版解读", priority: "P0", writeTarget: { statePath: `editedNarratives.${topicId}.action` } }
  ]));
  const reportBlocks = typeof reportDeliveryModel === "function"
    ? reportDeliveryModel().sections.slice(0, 8).map((section) => ({
      blockId: `report.section.${section.id}`,
      blockType: "report.section",
      page: "studio",
      channel: "report",
      title: section.sectionTitle || "报告章节",
      sectionId: section.id,
      priority: "P1",
      writeTarget: { statePath: `reportRewrites.${section.id}`, reportSectionId: section.id }
    }))
    : [];
  return base.concat(topicBlocks, reportBlocks);
}

function buildRewriteFactPack(block = {}) {
  if (block.blockType === "evidence.map.deviation" && typeof evidenceMapFactPack === "function") {
    const pack = evidenceMapFactPack();
    const facts = [
      ...(pack.anomalyMap?.priority || []),
      ...(pack.peerPosition || []),
      pack.valuationAnchor || {}
    ].filter(Boolean);
    const evidencePack = typeof buildEvidencePack === "function"
      ? buildEvidencePack({ blockId: block.blockId, facts, calculations: facts, quality: [], context: pack })
      : null;
    return { ...pack, evidencePack };
  }
  if (block.blockType?.startsWith("topic.") && typeof layeredTopicFactModel === "function") {
    const topicModel = layeredTopicFactModel(block.topicId);
    return topicModel.evidencePack ? { ...topicModel, evidencePack: topicModel.evidencePack } : topicModel;
  }
  if (block.blockType === "report.section" && typeof reportDeliveryModel === "function") {
    const section = reportDeliveryModel().sections.find((item) => item.id === block.sectionId) || null;
    const topicModel = section?.storyRole && typeof layeredTopicFactModel === "function" ? layeredTopicFactModel(section.storyRole) : null;
    return {
      section,
      evidencePack: topicModel?.evidencePack || null,
      report: section ? {
        id: section.id,
        title: section.sectionTitle,
        blocks: section.blocks,
        dataWarnings: section.dataWarnings
      } : null
    };
  }
  if (typeof bankCommentaryFactPack === "function") {
    const pack = bankCommentaryFactPack();
    const evidencePack = typeof buildEvidencePack === "function"
      ? buildEvidencePack({
        blockId: block.blockId,
        facts: [
          ...(pack.topics || []).flatMap((topic) => topic.evidence || []),
          ...(pack.anomalies?.negative || []),
          ...(pack.anomalies?.deviations || [])
        ],
        calculations: pack.sparc || [],
        quality: typeof bankCommentaryReadyDataQuality === "function" ? bankCommentaryReadyDataQuality(pack) : [],
        context: pack
      })
      : null;
    return { ...pack, evidencePack };
  }
  return {};
}

function rewritePromptForBlock(block = {}, factPack = {}) {
  const verification = factPack.dataVerification?.summary || {};
  return {
    role: block.title || "证据驱动解读",
    instruction: [
      "第一句必须直接给出当前银行相对对标组的结论。",
      "不要解释方法论、框架、计算过程或系统逻辑。",
      "每个核心判断必须绑定 factPack 中至少两个事实。",
      "如果证据不足，必须降低语气并写出缺口。",
      "不得编造事实包之外数字。",
      "必须读取 dataVerification：年报核验完成的指标可以支撑强判断，口径差异、主表单源或待字段化指标必须降低语气。",
      "语言风格应接近券商研究员和咨询顾问：观点明确、证据紧跟、管理含义清楚。"
    ],
    outputSchema: ["viewpoint", "conclusion", "evidence", "soWhat", "actions", "citations", "qualityWarnings"],
    factPackSummary: {
      blockId: block.blockId,
      lineageStatus: factPack.evidencePack?.lineageStatus || factPack.lineageStatus || "partial",
      annualVerification: {
        total: verification.total || 0,
        matched: verification.matched || 0,
        conflict: verification.conflict || 0,
        mainOnly: verification.mainOnly || 0,
        pending: verification.pending || 0
      }
    }
  };
}

function buildRewritePlan(options = {}) {
  const priorities = options.priorities || ["P0"];
  const rewriteSelectionKey = currentAnalysisSelectionKey();
  return rewriteBlockRegistry()
    .filter((block) => priorities.includes(block.priority))
    .map((block) => {
      const factPack = buildRewriteFactPack(block);
      return {
        ...block,
        rewriteSelectionKey,
        factPack,
        prompt: rewritePromptForBlock(block, factPack),
        requiredCitations: collectRewriteCitationKeys(factPack)
      };
    });
}

function collectRewriteCitationKeys(factPack = {}) {
  const facts = factPack.evidencePack?.facts || factPack.facts || [];
  return facts.map((fact) => fact.metricKey || fact.factId || fact.key).filter(Boolean).slice(0, 8);
}

function factPackVerificationSummary(factPack = {}) {
  const summary = factPack.dataVerification?.summary || factPack.context?.dataVerification?.summary || {};
  return {
    total: Number(summary.total || 0),
    matched: Number(summary.matched || 0),
    conflict: Number(summary.conflict || 0),
    mainOnly: Number(summary.mainOnly || 0),
    pending: Number(summary.pending || 0),
    missing: Number(summary.missing || 0),
    verifiedRate: summary.verifiedRate == null ? null : Number(summary.verifiedRate)
  };
}

function rewriteRequestEnvelope(block = {}) {
  const verification = factPackVerificationSummary(block.factPack || {});
  return {
    protocolVersion: "20260607-sprint12-v1",
    kind: "evidence-rewrite-block",
    blockId: block.blockId,
    blockType: block.blockType,
    channel: block.channel,
    target: state.target,
    year: state.year,
    selectionKey: block.rewriteSelectionKey || currentAnalysisSelectionKey(),
    evidenceProtocol: {
      factPackRequired: true,
      dataVerificationRequired: true,
      citationRequired: true,
      outputLanguage: "zh-CN",
      style: "券商研究员和咨询顾问合并风格",
      requiredSections: ["观点", "证据", "机制", "建议"],
      prohibitions: ["禁止讲方法论", "禁止编造数字", "禁止投资建议"],
      toneRule: verification.conflict || verification.mainOnly || verification.pending
        ? "存在口径差异、主表单源或待字段化时必须降级为审慎表述"
        : "核验充分时允许形成结论先行的强判断"
    },
    prompt: block.prompt,
    factPack: block.factPack,
    dataVerification: verification,
    expectedResponse: {
      viewpoint: "一句核心观点",
      conclusion: "结论先行的自然语言段落",
      evidence: [{ metric: "指标代码", text: "证据描述" }],
      soWhat: "对其他页面和报告主线的含义",
      actions: [{ window: "0-3个月", action: "落地动作", trackingMetric: "复核指标" }],
      citations: ["事实包字段或指标代码"],
      qualityWarnings: ["数据边界或降级原因"]
    },
    responseContract: "回传结构必须能被 normalizeRewritePackage 标准化为观点、证据、机制、建议和引用清单。"
  };
}

function normalizeRewritePackage(payload = {}, fallbackText = "") {
  const explanationPackage = payload.explanationPackage || payload.package || payload.structuredPackage || null;
  const pkg = explanationPackage || payload;
  const evidence = Array.isArray(pkg.evidence) ? pkg.evidence : [];
  const actions = Array.isArray(pkg.actions) ? pkg.actions : [];
  const citations = Array.isArray(pkg.citations) ? pkg.citations : [];
  const qualityWarnings = Array.isArray(pkg.qualityWarnings) ? pkg.qualityWarnings : [];
  const text = [
    pkg.viewpoint ? `观点：${pkg.viewpoint}` : "",
    pkg.conclusion || payload.text || payload.content || payload.commentary || fallbackText,
    evidence.length ? `证据：${evidence.map((item) => item?.text || item?.metric || "").filter(Boolean).join("；")}。` : "",
    pkg.soWhat ? `机制与含义：${pkg.soWhat}` : "",
    actions.length ? `建议：${actions.map((item) => `${item.window || "待定窗口"}：${item.action || ""}${item.trackingMetric ? `，跟踪${item.trackingMetric}` : ""}`).filter((line) => !line.endsWith("：")).join("；")}。` : ""
  ].filter(Boolean).join("");
  return {
    viewpoint: pkg.viewpoint || "",
    conclusion: pkg.conclusion || payload.text || payload.content || payload.commentary || fallbackText,
    evidence,
    soWhat: pkg.soWhat || pkg.mechanism || "",
    actions,
    citations,
    qualityWarnings,
    text: text || fallbackText,
    explanationPackage
  };
}

function validateRewritePackageAgainstProtocol(payload = {}, block = {}) {
  const normalized = normalizeRewritePackage(payload, localRewriteFallback(block, block.factPack));
  const warnings = normalized.qualityWarnings.slice();
  const envelope = rewriteRequestEnvelope(block);
  if (!block.factPack || !Object.keys(block.factPack).length) warnings.push("factPack 缺失，不能调用 DeepSeek 强判断。");
  if (!envelope.dataVerification || typeof envelope.dataVerification.total !== "number") warnings.push("dataVerification 缺失，结论语气必须降级。");
  if (!normalized.text) warnings.push("回传结构未提供可展示文本。");
  if (!normalized.viewpoint && !normalized.conclusion) warnings.push("回传结构缺少观点或结论。");
  if (!normalized.citations.length && collectRewriteCitationKeys(block.factPack).length) warnings.push("回传结构缺少 citations。");
  if (/方法论|计算过程|系统逻辑/.test(normalized.text)) warnings.push("回传文本包含方法论叙述。");
  if (/买入|卖出|目标价|投资建议/.test(normalized.text)) warnings.push("回传文本包含投资建议。");
  if (envelope.dataVerification.conflict || envelope.dataVerification.mainOnly || envelope.dataVerification.pending) {
    if (!/审慎|复核|脚注|降级|边界/.test(normalized.text)) warnings.push("核验存在差异或单源字段，但回传未体现审慎表述。");
  }
  return {
    ...normalized,
    warnings,
    ok: !warnings.some((warning) => /缺失|方法论|投资建议|未提供|缺少|未体现/.test(warning))
  };
}

function localRewriteFallback(block = {}, factPack = {}) {
  if (block.blockType === "evidence.map.deviation" && typeof localEvidenceMapCommentaryDraft === "function") return localEvidenceMapCommentaryDraft(factPack);
  if (block.blockType === "bank.summary" && typeof localBankCommentaryDraft === "function") return localBankCommentaryDraft(factPack, block.channel || "board");
  if (block.blockType?.startsWith("topic.")) {
    const topicTitle = factPack.judgement?.topic?.title || factPack.topicId || "该专题";
    const signal = factPack.judgement?.signal || "待判断";
    const target = typeof displayBankName === "function" ? displayBankName(factPack.targetBank || state.target) : (factPack.targetBank || state.target || "目标银行");
    const facts = factPack.evidencePack?.facts || [];
    const first = facts[0];
    const second = facts[1];
    const strengthContext = typeof localCommentaryStrengthContext === "function" ? localCommentaryStrengthContext(factPack) : { strength: "implicit" };
    const claim = `${topicTitle}当前信号为${signal}，是否进入董事会或管理层行动清单取决于证据强度`;
    const evidence = `${first?.label || first?.metricName || "核心指标"}${first?.targetValue ?? first?.value ?? ""}${second ? `，以及${second.label || second.metricName}${second.targetValue ?? second.value ?? ""}` : ""}`;
    const lead = typeof localCommentaryClaim === "function" ? localCommentaryClaim(strengthContext.strength, target, claim) : `${target}${claim}`;
    const proof = typeof localCommentaryEvidenceSentence === "function" ? localCommentaryEvidenceSentence(strengthContext.strength, evidence) : `关键证据是${evidence}`;
    return `${lead}。${proof}。管理含义是先处理有来源支撑的差距，数据不足的指标不进入强判断；正式报告应优先保留可核验指标。`;
  }
  if (block.blockType === "report.section") {
    const title = factPack.section?.sectionTitle || block.title || "本章节";
    return `${title}的报告结论应只引用已校验事实：先呈现相对对标组的核心差距，再说明管理含义；数据边界未完成的指标不进入强判断。`;
  }
  return "当前结论需要基于已校验证据生成；数据不足时暂不形成强判断。";
}

async function callRewriteBlock(block = {}) {
  const fallbackText = localRewriteFallback(block, block.factPack);
  const endpoint = typeof aiProviderConfig !== "undefined" ? (aiProviderConfig?.http?.commentaryEndpoint || aiProviderConfig?.http?.endpoint) : "";
  const envelope = rewriteRequestEnvelope(block);
  if (!endpoint || aiProviderConfig?.provider !== "http") {
    return validateRewriteResult({
      blockId: block.blockId,
      source: "fallback",
      status: "degraded",
      text: fallbackText,
      citations: collectRewriteCitationKeys(block.factPack),
      qualityWarnings: ["模型接口未启用，使用本地证据文本"],
      generatedAt: new Date().toISOString()
    }, block);
  }
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), aiProviderConfig?.http?.timeoutMs || 30000);
  try {
    const response = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(envelope),
      signal: controller.signal
    });
    if (!response.ok) throw new Error("rewrite endpoint failed");
    const payload = await response.json();
    const protocolResult = validateRewritePackageAgainstProtocol(payload, block);
    const warnings = protocolResult.warnings || [];
    return validateRewriteResult({
      blockId: block.blockId,
      source: payload.source || "deepseek",
      status: protocolResult.ok ? "valid" : "degraded",
      text: protocolResult.ok ? protocolResult.text : fallbackText,
      explanationPackage: protocolResult.explanationPackage || null,
      citations: protocolResult.citations.length ? protocolResult.citations : collectRewriteCitationKeys(block.factPack),
      qualityWarnings: warnings,
      generatedAt: new Date().toISOString()
    }, block);
  } catch (error) {
    return validateRewriteResult({
      blockId: block.blockId,
      source: "fallback",
      status: "degraded",
      text: fallbackText,
      citations: collectRewriteCitationKeys(block.factPack),
      qualityWarnings: [`模型接口不可用，使用本地降级文本：${error.message || String(error)}`],
      generatedAt: new Date().toISOString()
    }, block);
  } finally {
    clearTimeout(timeout);
  }
}

function validateRewriteResult(result, block) {
  const text = typeof result.text === "string" ? result.text.trim() : "";
  const warnings = Array.isArray(result.qualityWarnings) ? result.qualityWarnings.slice() : [];
  const lineage = block.factPack?.evidencePack?.lineageStatus || block.factPack?.lineageStatus || "partial";
  if (!text) warnings.push("模型文本为空");
  if (/方法论|计算过程|系统逻辑/.test(text)) warnings.push("文本包含方法论叙述，需要降级");
  if (/买入|卖出|目标价|投资建议/.test(text)) warnings.push("文本包含投资建议，需要降级");
  if (lineage !== "ready") warnings.push("证据包血缘不完整，结论语气应降级");
  const degraded = !text || warnings.some((warning) => /降级|投资建议|方法论|为空/.test(warning));
  return {
    ...result,
    text: degraded ? localRewriteFallback(block, block.factPack) : text,
    status: degraded ? "degraded" : result.status || "valid",
    qualityWarnings: warnings,
    citations: Array.isArray(result.citations) && result.citations.length ? result.citations : collectRewriteCitationKeys(block.factPack),
    generatedAt: result.generatedAt || new Date().toISOString()
  };
}

function applyRewriteResult(result, block) {
  ensureRewriteState();
  if (block.rewriteSelectionKey && block.rewriteSelectionKey !== currentAnalysisSelectionKey()) {
    return {
      ...result,
      status: "stale",
      qualityWarnings: [...(result.qualityWarnings || []), "选定银行或分析口径已变化，本次生成结果未写回"]
    };
  }
  state.generatedRewrites[block.blockId] = result;
  if (block.blockType === "evidence.map.deviation") {
    state.evidenceMapCommentary = {
      text: result.text,
      source: result.source,
      generatedAt: result.generatedAt,
      factPack: block.factPack,
      explanationPackage: result.explanationPackage || null,
      validation: { status: result.status, qualityWarnings: result.qualityWarnings }
    };
    if (typeof updateEvidenceMapCommentaryPanel === "function") updateEvidenceMapCommentaryPanel();
  }
  if (block.blockType === "bank.summary") {
    if (!state.bankCommentaries) state.bankCommentaries = {};
    state.bankCommentaries.board = {
      text: result.text,
      source: result.source,
      generatedAt: result.generatedAt,
      validation: { status: result.status, qualityWarnings: result.qualityWarnings }
    };
    if (typeof updateBankCommentaryPanel === "function") updateBankCommentaryPanel();
  }
  if (block.blockType?.startsWith("topic.")) {
    if (!state.editedNarratives) state.editedNarratives = {};
    const key = typeof narrativeStorageKey === "function" ? narrativeStorageKey(block.topicId, block.channel) : `${block.topicId}.${block.channel}`;
    state.editedNarratives[key] = result.text;
    if (state.editedNarratives[block.topicId]) delete state.editedNarratives[block.topicId];
  }
  if (block.blockType === "report.section") {
    state.reportRewrites[block.sectionId] = result;
  }
  if (block.writeTarget?.domId) {
    const node = document.getElementById(block.writeTarget.domId);
    if (node) node.textContent = result.text;
  }
  state.rewriteQualityWarnings = Object.values(state.generatedRewrites).flatMap((item) => item.qualityWarnings || []);
  return result;
}

async function runEvidenceRewriteOrchestrator(options = {}) {
  ensureRewriteState();
  state.generatedNarrativeScope = currentAnalysisSelectionKey();
  const plan = buildRewritePlan(options);
  const results = [];
  for (const block of plan) {
    const result = await callRewriteBlock(block);
    results.push(applyRewriteResult(result, block));
  }
  if (typeof renderTopicWorkbench === "function") renderTopicWorkbench();
  if (typeof renderStep2Diagnosis === "function") renderStep2Diagnosis();
  if (typeof buildPrintDeck === "function") buildPrintDeck();
  if (typeof renderAiGovernancePanel === "function") renderAiGovernancePanel();
  return { status: "done", count: results.length, results, generatedAt: new Date().toISOString() };
}

if (typeof window !== "undefined") {
  window.rewriteBlockRegistry = rewriteBlockRegistry;
  window.buildRewritePlan = buildRewritePlan;
  window.factPackVerificationSummary = factPackVerificationSummary;
  window.rewriteRequestEnvelope = rewriteRequestEnvelope;
  window.normalizeRewritePackage = normalizeRewritePackage;
  window.validateRewritePackageAgainstProtocol = validateRewritePackageAgainstProtocol;
  window.callRewriteBlock = callRewriteBlock;
  window.validateRewriteResult = validateRewriteResult;
  window.applyRewriteResult = applyRewriteResult;
  window.runEvidenceRewriteOrchestrator = runEvidenceRewriteOrchestrator;
}
