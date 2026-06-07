/* Bank VQA module: 33-llm-commentary.js — bank-level LLM commentary adapter */

function ensureBankCommentaries() {
  if (!state.bankCommentaries) state.bankCommentaries = {};
  if (!state.activeBankCommentaryChannel) state.activeBankCommentaryChannel = "board";
  if (!state.evidenceMapCommentary) state.evidenceMapCommentary = null;
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
    dataVerification: bankCommentaryAnnualVerification(row?.bank || state.target, state.year),
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

function bankCommentaryAnnualVerification(bank, year = state.year) {
  if (!Array.isArray(annualReportVerification) || !annualReportVerification.length) {
    return { rows: [], summary: { total: 0, matched: 0, conflict: 0, mainOnly: 0, pending: 0, missing: 0, verifiedRate: null } };
  }
  const canonical = typeof resolveBank === "function" ? resolveBank(bank || state.target) : (bank || state.target);
  const rows = annualReportVerification
    .filter((item) => (typeof resolveBank === "function" ? resolveBank(item.bank) : item.bank) === canonical && Number(item.year) === Number(year))
    .map((item) => ({
      metric: item.metric,
      metricName: item.metricName || (typeof fieldName === "function" ? fieldName(item.metric) : item.metric),
      mainValue: item.mainValue,
      scrapedValue: item.scrapedValue,
      status: item.verificationStatus,
      selectedSource: item.selectedSource,
      scrapedSource: item.scrapedSource,
      action: item.managementAction
    }));
  const summary = rows.reduce((acc, item) => {
    if (item.status === "matched" || item.status === "filled_from_validation") acc.matched += 1;
    if (item.status === "source_conflict_review") acc.conflict += 1;
    if (item.status === "main_only") acc.mainOnly += 1;
    if (item.status === "scraped_pending_fieldization") acc.pending += 1;
    if (item.status === "missing") acc.missing += 1;
    acc.total += 1;
    return acc;
  }, { total: 0, matched: 0, conflict: 0, mainOnly: 0, pending: 0, missing: 0, verifiedRate: null });
  summary.verifiedRate = summary.total ? summary.matched / summary.total : null;
  return { rows, summary };
}

function bankCommentaryVerificationSentence(verification = {}) {
  const summary = verification.summary || {};
  if (!summary.total) return "年报核验层尚未形成足够记录，相关判断应保留数据边界。";
  if (summary.conflict) return `年报核验层提示${summary.conflict}项核心指标存在口径差异，结论可以成立，但正式上会前需要先复核底稿。`;
  if (summary.verifiedRate >= 0.75) return `年报核验层已有${summary.matched}/${summary.total}项核心指标完成交叉验证，当前判断具备进入主报告的基础。`;
  if (summary.mainOnly || summary.pending) return `年报核验层显示仍有${summary.mainOnly + summary.pending}项依赖主表或待字段化，当前判断应使用审慎语气。`;
  return "年报核验层未发现明显冲突，但仍需保留来源脚注。";
}

function evidenceMapFactPack(row = typeof targetRecord === "function" ? targetRecord() : null, peers = typeof peerRecords === "function" ? peerRecords() : []) {
  const diagnosis = row && typeof computeVqaDiagnosis === "function" ? computeVqaDiagnosis(row, peers) : null;
  const anomaly = row && typeof v6AnomalyRadar === "function" ? v6AnomalyRadar(row, peers) : { positive: [], negative: [], deviations: [], cross: [] };
  const peerScores = row && typeof sparcDimensionScores === "function" ? sparcDimensionScores(row) : [];
  const pb = row && typeof theoreticalPB === "function" ? theoreticalPB(row) : null;
  const mapRow = (item = {}, bucket = "") => ({
    bucket,
    key: item.key,
    label: item.label || (typeof fieldName === "function" ? fieldName(item.key) : item.key),
    current: typeof metricDisplayValue === "function" ? metricDisplayValue(item.key, item.current) : item.current,
    peer: typeof metricDisplayValue === "function" ? metricDisplayValue(item.key, item.peer) : item.peer,
    signal: typeof v6AnomalySemanticTag === "function" ? v6AnomalySemanticTag(item).label : item.tag || "待判断",
    reason: typeof anomalyLikelyReason === "function" ? anomalyLikelyReason(item) : "",
    direction: item.momentum?.direction || "",
    acceleration: item.momentum?.acceleration || "",
    z: item.z == null ? null : Number(item.z.toFixed(2)),
    momentumScore: item.momentumScore == null ? null : Math.round(item.momentumScore)
  });
  const deviations = [
    ...(anomaly.negative || []).slice(0, 4).map((item) => mapRow(item, "负向变化")),
    ...(anomaly.deviations || []).slice(0, 4).map((item) => mapRow(item, "同业偏离")),
    ...(anomaly.cross || []).slice(0, 4).map((item) => mapRow(item, "共振指标"))
  ];
  return {
    kind: "evidence-map-commentary",
    generatedAt: new Date().toISOString(),
    bank: row?.bank || state.target,
    displayBank: typeof displayBankName === "function" ? displayBankName(row?.bank || state.target) : (row?.bank || state.target),
    year: state.year,
    reportVersion: state.reportVersion,
    peerBanks: [...(state.peers || [])],
    diagnosis: diagnosis ? {
      score: diagnosis.score,
      signal: diagnosis.signal,
      weakest: diagnosis.labels?.[diagnosis.weakest] || diagnosis.weakest
    } : null,
    peerPosition: peerScores.map((item) => ({
      code: item.code,
      label: item.label,
      score: item.score,
      weakestMetric: item.weakestMetric ? {
        key: item.weakestMetric.key,
        label: item.weakestMetric.label,
        value: typeof metricDisplayValue === "function" ? metricDisplayValue(item.weakestMetric.key, item.weakestMetric.value) : item.weakestMetric.value
      } : null
    })),
    anomalyMap: {
      positive: (anomaly.positive || []).slice(0, 4).map((item) => mapRow(item, "正向变化")),
      negative: (anomaly.negative || []).slice(0, 4).map((item) => mapRow(item, "负向变化")),
      deviations: (anomaly.deviations || []).slice(0, 4).map((item) => mapRow(item, "同业偏离")),
      cross: (anomaly.cross || []).slice(0, 4).map((item) => mapRow(item, "共振指标")),
      priority: deviations.slice(0, 6)
    },
    valuationAnchor: {
      actualPb: row?.pb ?? null,
      theoreticalPb: pb?.pb ?? null,
      roe: row?.roe ?? null,
      roa: row?.roa ?? null
    },
    dataVerification: bankCommentaryAnnualVerification(row?.bank || state.target, state.year),
    guardrails: {
      conclusionFirst: true,
      noMethodologyNarration: true,
      citeFactPackOnly: true,
      financialAnalystTone: true
    }
  };
}

function evidenceMapPrompt(pack = evidenceMapFactPack()) {
  return {
    role: "证据地图解读",
    instruction: [
      `请为${pack.displayBank}${pack.year}年证据地图生成一段结论先行的金融分析文字。`,
      "结论先行：第一句直接判断异动偏离对经营质量的含义。",
      "不要解释方法论，不要讲系统如何计算，不要写“需要综合分析”这类空话。",
      "必须基于事实包中的同业位置、异动偏离、估值锚和数据边界生成。",
      "必须读取 dataVerification：已核验的证据可以形成强判断，口径差异或主表单源必须降低语气。",
      "语言风格为券商研究员和咨询公司合并风格：观点明确、证据紧跟、管理含义清楚。"
    ].join("\n"),
    requiredStructure: ["核心观点", "关键证据", "与其他页面的关联", "管理含义"],
    factPack: pack
  };
}

function localCommentaryStrengthContext(pack = {}) {
  const priority = pack.anomalyMap?.priority || [];
  const anomalyZ = priority.map((item) => Math.abs(Number(item.z) || 0)).sort((a, b) => b - a)[0] || 0;
  const quality = Number(pack.dataQuality ?? pack.readyDataQuality ?? 0);
  const verification = pack.dataVerification?.summary || {};
  const hasConflict = Number(verification.conflict || 0) > 0;
  const hasPending = Number(verification.mainOnly || 0) + Number(verification.pending || 0) + Number(verification.missing || 0) > 0;
  const riskLevel = hasConflict ? "L4" : hasPending ? "L3" : quality >= 0.9 ? "L2" : quality >= 0.75 ? "L3" : "L4";
  const zScore = Math.max(anomalyZ, Math.abs((Number(pack.diagnosis?.score) || 50) - 50) / 12);
  const strength = typeof languageStrengthTier === "function" ? languageStrengthTier(zScore, riskLevel) : (zScore > 1.2 ? "strong" : "implicit");
  return { strength, zScore, riskLevel, quality };
}

function localCommentaryClaim(strength, target, claim) {
  if (strength === "strong") return `${target}本轮可以直接下判断：${claim}`;
  if (strength === "tentative") return `${target}本轮应先保留审慎判断：${claim}，但结论强度取决于底稿复核`;
  return `${target}当前较清晰的判断是：${claim}`;
}

function localCommentaryEvidenceSentence(strength, evidence) {
  if (!evidence) return "证据还不足以支撑强判断，当前结论应先留在复核层。";
  if (typeof phraseByStrength === "function") {
    return phraseByStrength(strength, "证据已经集中指向同一经营约束", evidence);
  }
  return `证据上，${evidence}`;
}

function localEvidenceMapCommentaryDraft(pack = evidenceMapFactPack()) {
  const target = pack.displayBank || "目标银行";
  const priority = pack.anomalyMap?.priority || [];
  const first = priority[0];
  const second = priority[1];
  const weak = pack.diagnosis?.weakest || "价值质量约束";
  const signal = pack.diagnosis?.signal || "价值质量待判断";
  const strength = localCommentaryStrengthContext(pack).strength;
  const pbText = pack.valuationAnchor?.actualPb == null
    ? "估值锚待补"
    : `PB ${typeof metricDisplayValue === "function" ? metricDisplayValue("pb", pack.valuationAnchor.actualPb) : pack.valuationAnchor.actualPb}`;
  const evidence = priority.length
    ? priority.slice(0, 3).map((item) => `${item.label}${item.current}、对标${item.peer}，${item.signal}`).join("；")
    : "异动偏离未形成足够强的共振信号";
  const verificationText = bankCommentaryVerificationSentence(pack.dataVerification);
  const claim = `${weak}已经是本轮经营质量判断的优先验证点，${signal}不是单一指标波动，而是需要看差距是否正在扩大`;
  return [
    `${localCommentaryClaim(strength, target, claim)}。`,
    `${localCommentaryEvidenceSentence(strength, `${evidence}${second ? `；其中${second.label}需要和${first?.label || weak}联读` : ""}`)}。`,
    `这张证据地图的作用不是复述指标，而是把同业位置、异动偏离和估值锚串起来：差距是否真实、压力是否扩大、市场是否已经给出折价；当前估值参考为${pbText}。`,
    `数据边界上，${verificationText}`,
    `管理含义是：先把${first?.label || weak}放入专题深钻和报告主线，再决定是否形成董事会行动项；${strength === "tentative" ? "若数据边界未补齐，正式报告应降低结论强度。" : "若这些指标继续偏离对标组，正式报告应保持结论先行。"}`
  ].join("");
}

function evidenceMapTextFromPackage(pkg = {}) {
  if (!pkg || typeof pkg !== "object") return "";
  const evidence = Array.isArray(pkg.evidence)
    ? pkg.evidence.map((item) => item?.text).filter(Boolean).join("；")
    : "";
  return [
    pkg.viewpoint ? `核心观点：${pkg.viewpoint}` : "",
    pkg.conclusion || "",
    evidence ? `关键证据：${evidence}。` : "",
    pkg.soWhat ? `与其他部分的关联：${pkg.soWhat}` : "",
    pkg.mechanism ? `管理含义：${pkg.mechanism}` : "",
    pkg.counterEvidence ? `风险边界：${pkg.counterEvidence}` : ""
  ].filter(Boolean).join("");
}

function normalizeEvidenceMapResponse(payload) {
  if (!payload) return null;
  const explanationPackage = payload.explanationPackage || payload.package || payload.structuredPackage || null;
  const text = explanationPackage
    ? evidenceMapTextFromPackage(explanationPackage)
    : payload.text || payload.content || payload.commentary || null;
  if (!text) return null;
  return {
    text,
    explanationPackage,
    source: payload.source || (explanationPackage ? "llm" : "llm"),
    validation: payload.validation || null
  };
}

async function callEvidenceMapEndpoint(pack) {
  const endpoint = aiProviderConfig?.http?.commentaryEndpoint || aiProviderConfig?.http?.endpoint;
  if (!endpoint || aiProviderConfig?.provider !== "http") return null;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), aiProviderConfig?.http?.timeoutMs || 30000);
  try {
    const response = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        kind: "evidence-map-commentary",
        channel: "evidence",
        prompt: evidenceMapPrompt(pack),
        factPack: pack
      }),
      signal: controller.signal
    });
    if (!response.ok) throw new Error("evidence map commentary endpoint failed");
    const payload = await response.json();
    return normalizeEvidenceMapResponse(payload);
  } finally {
    clearTimeout(timeout);
  }
}

async function generateEvidenceMapCommentaryAsync(useRemote = true) {
  ensureBankCommentaries();
  const pack = evidenceMapFactPack();
  const local = localEvidenceMapCommentaryDraft(pack);
  if (!useRemote) {
    state.evidenceMapCommentary = { text: local, source: "local", generatedAt: new Date().toISOString(), factPack: pack };
    return state.evidenceMapCommentary;
  }
  try {
    const remote = await callEvidenceMapEndpoint(pack);
    const text = remote?.text ? sanitizeComplianceText(remote.text) : local;
    state.evidenceMapCommentary = {
      text,
      source: remote ? (remote.source === "fallback" ? "local" : "llm") : "local",
      generatedAt: new Date().toISOString(),
      factPack: pack,
      explanationPackage: remote?.explanationPackage || null,
      validation: remote?.validation || null
    };
  } catch (error) {
    state.evidenceMapCommentary = {
      text: local,
      source: "local",
      generatedAt: new Date().toISOString(),
      factPack: pack,
      error: error.message || String(error)
    };
  }
  return state.evidenceMapCommentary;
}

function getEvidenceMapCommentary() {
  ensureBankCommentaries();
  if (state.evidenceMapCommentary?.text) return state.evidenceMapCommentary;
  const pack = evidenceMapFactPack();
  return { text: localEvidenceMapCommentaryDraft(pack), source: "local-preview", generatedAt: "", factPack: pack };
}

function updateEvidenceMapCommentaryPanel() {
  const textNode = document.getElementById("step2EvidenceCommentaryText");
  const linkage = document.getElementById("step2EvidenceLinkage");
  if (!textNode || !linkage) return;
  const commentary = getEvidenceMapCommentary();
  const pack = commentary.factPack || evidenceMapFactPack();
  textNode.textContent = commentary.text;
  const first = pack.anomalyMap?.priority?.[0];
  const weak = pack.diagnosis?.weakest || "价值质量约束";
  linkage.innerHTML = [
    { label: "同业位置", text: `验证${weak}是否真实弱于对标组` },
    { label: "异动偏离", text: first ? `${first.label}是当前优先证据` : "当前无强共振异动" },
    { label: "报告落点", text: "进入专题深钻和董事会行动顺序" }
  ].map((item) => `<span><strong>${item.label}</strong>${item.text}</span>`).join("");
}

function bankCommentaryPrompt(pack = bankCommentaryFactPack(), channel = "board") {
  const label = bankCommentaryChannelLabel(channel);
  return {
    role: label,
    instruction: [
      `请为${pack.displayBank}${pack.year}年银行经营质量分析生成${label}。`,
      "必须使用咨询表达：先给判断，再给证据，再解释机制，最后给管理含义。",
      "不得编造事实包之外的数字，不得给投资建议，不得使用空泛方法论。",
      "如果事实包数据不足，应明确降级表达并说明需要补充的数据。",
      "必须读取 dataVerification：核验完成的指标可进入主判断，存在口径差异或主表单源的指标只能作为审慎判断。"
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
  const strength = localCommentaryStrengthContext(pack).strength;
  const verificationText = bankCommentaryVerificationSentence(pack.dataVerification);
  const claim = `${weak}应放在本轮管理议程前列，而不是被处理成单项指标波动`;
  const channelLead = channel === "market"
    ? "资本市场沟通的重点不应是提前宣称估值修复，而是说明经营质量、风险确认和同业位置是否足以支撑估值叙事。"
    : channel === "action"
      ? "管理层版本要落到责任动作、复盘指标和时间窗口，避免停留在泛泛的指标解释。"
      : "董事会版本应先回答价值质量约束是否已经影响下一阶段经营优先级。";
  return [
    `${localCommentaryClaim(strength, target, claim)}。`,
    `${localCommentaryEvidenceSentence(strength, evidence)}。`,
    `从机制上看，问题不在于某个指标单点偏低，而在于同业位置、PB定价和异动偏离是否同时指向同一个经营约束；${topic?.headline || "专题证据将决定该判断能否进入正式报告主线"}。`,
    `数据边界上，${verificationText}`,
    `管理含义是：${channelLead}${diagnosis?.action ? `下一步建议围绕“${diagnosis.action}”形成0-3个月复核动作。` : "下一步应先补齐事实包，再决定是否形成强判断。"}`
  ].join("");
}

function bankCommentaryTextFromPackage(pkg = {}) {
  if (!pkg || typeof pkg !== "object") return "";
  const evidence = Array.isArray(pkg.evidence)
    ? pkg.evidence.map((item) => item?.text).filter(Boolean).join("；")
    : "";
  const actions = Array.isArray(pkg.actions)
    ? pkg.actions.map((item) => `${item.window || "待定窗口"}：${item.action || ""}`).filter((line) => line.replace(/.*：/, "").trim()).join("；")
    : "";
  return [
    pkg.viewpoint ? `核心观点：${pkg.viewpoint}` : "",
    pkg.conclusion || "",
    evidence ? `关键证据：${evidence}。` : "",
    pkg.mechanism ? `机制解释：${pkg.mechanism}` : "",
    pkg.soWhat ? `管理含义：${pkg.soWhat}` : "",
    pkg.counterEvidence ? `风险边界：${pkg.counterEvidence}` : "",
    actions ? `落地建议：${actions}。` : "",
    Array.isArray(pkg.qualityWarnings) && pkg.qualityWarnings.length ? `口径提示：${pkg.qualityWarnings.join("；")}。` : ""
  ].filter(Boolean).join("");
}

function normalizeBankCommentaryResponse(payload) {
  if (!payload) return null;
  const explanationPackage = payload.explanationPackage || payload.package || payload.structuredPackage || null;
  const text = explanationPackage
    ? bankCommentaryTextFromPackage(explanationPackage)
    : payload.text || payload.content || payload.commentary || null;
  if (!text) return null;
  return {
    text,
    explanationPackage,
    source: payload.source || (explanationPackage ? "llm" : "llm"),
    validation: payload.validation || null
  };
}

function bankCommentaryReadyDataQuality(pack = bankCommentaryFactPack()) {
  if (!Array.isArray(readyMetricQuality) || !readyMetricQuality.length) return [];
  const keyMetrics = new Set([
    "roa", "roe", "nim", "npl", "provisionCoverage", "cet1", "cet1Buffer",
    "pb", "peTtm", "divYield", "totalMarketValue", "realLoanDepositSpread",
    "housingLoanNpl", "consumerLoanNpl", "businessLoanNpl", "creditCardLoanNpl",
    "liquidityCoverageRatio", "loanDepositRatio"
  ]);
  return readyMetricQuality
    .filter((item) => item.bank === pack.bank && Number(item.year) === Number(pack.year) && keyMetrics.has(item.metric))
    .map((item) => ({
      metric: item.metric,
      status: item.status,
      missingReason: item.missingReason,
      selectedSource: item.selectedSource,
      scrapedSource: item.scrapedSource
    }));
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
        factPack: pack,
        readyDataQuality: bankCommentaryReadyDataQuality(pack)
      }),
      signal: controller.signal
    });
    if (!response.ok) throw new Error("bank commentary endpoint failed");
    const payload = await response.json();
    return normalizeBankCommentaryResponse(payload);
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
    const text = remote?.text ? sanitizeComplianceText(remote.text) : fallbackToLocal ? local : "";
    state.bankCommentaries[channel] = {
      text,
      source: remote ? (remote.source === "fallback" ? "local" : "llm") : fallbackToLocal ? "local" : "failed",
      generatedAt: new Date().toISOString(),
      explanationPackage: remote?.explanationPackage || null,
      validation: remote?.validation || null
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

function autoModelGenerationTopicIds() {
  if (typeof topicDefinitions !== "function") return [];
  return topicDefinitions().map((topic) => topic.id);
}

function setAutoModelGenerationStatus(status, message, meta = {}) {
  state.autoModelGeneration = {
    status,
    message,
    updatedAt: new Date().toISOString(),
    ...meta
  };
  if (typeof setProjectStatus === "function") setProjectStatus(message);
  const globalSignal = document.getElementById("globalVqaSignal");
  if (globalSignal) globalSignal.textContent = message;
  updateBankCommentaryPanel();
}

async function runPostConfirmModelGeneration(options = {}) {
  if (!state.confirmed) return null;
  if (state.autoModelGeneration?.status === "running") return state.autoModelGeneration;
  const channels = ["board", "market", "action"];
  const topicIds = autoModelGenerationTopicIds();
  const target = typeof displayBankName === "function" ? displayBankName(state.target) : state.target;
  setAutoModelGenerationStatus("running", `${target}模型正在生成：银行级评论与专题解读将按当前对标组自动刷新。`, {
    reason: options.reason || "post-confirm",
    target: state.target,
    year: state.year,
    topicCount: topicIds.length
  });
  try {
    if (typeof runEvidenceRewriteOrchestrator === "function") {
      await runEvidenceRewriteOrchestrator({ priorities: ["P0"], reason: options.reason || "post-confirm" });
    } else {
      for (const channel of channels) {
        await generateBankCommentaryAsync(channel, true);
      }
      await generateEvidenceMapCommentaryAsync(true);
      for (const topicId of topicIds) {
        if (typeof generateTopicNarrativesWithAiForTopic === "function") {
          await generateTopicNarrativesWithAiForTopic(topicId);
        }
      }
    }
    if (typeof renderTopicWorkbench === "function") renderTopicWorkbench();
    if (typeof renderStep2Diagnosis === "function") renderStep2Diagnosis();
    if (typeof buildPrintDeck === "function") buildPrintDeck();
    if (typeof renderAiGovernancePanel === "function") renderAiGovernancePanel();
    updateBankCommentaryPanel();
    updateEvidenceMapCommentaryPanel();
    setAutoModelGenerationStatus("done", `${target}模型解读已生成：已覆盖银行级评论、证据地图解读和 ${topicIds.length} 个专题的三类解读。`, {
      reason: options.reason || "post-confirm",
      target: state.target,
      year: state.year,
      topicCount: topicIds.length
    });
  } catch (error) {
    setAutoModelGenerationStatus("failed", `${target}模型生成未全部完成，系统已保留本地事实包解读。${error.message || ""}`, {
      reason: options.reason || "post-confirm",
      target: state.target,
      year: state.year,
      topicCount: topicIds.length,
      error: error.message || String(error)
    });
  }
  return state.autoModelGeneration;
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
    preview.textContent = "确认分析后，将按当前银行、对标组、指标偏离和证据强度生成董事会版解读。";
    return;
  }
  const commentary = getBankCommentary(channel);
  const remoteReady = aiProviderConfig?.provider === "http" && !!(aiProviderConfig?.http?.commentaryEndpoint || aiProviderConfig?.http?.endpoint);
  status.textContent = state.autoModelGeneration?.status === "running"
    ? `${bankCommentaryChannelLabel(channel)}｜正在生成`
    : commentary.source === "llm" ? `${bankCommentaryChannelLabel(channel)}｜模型已生成` : remoteReady ? `${bankCommentaryChannelLabel(channel)}｜接口可用` : `${bankCommentaryChannelLabel(channel)}｜本地证据模板`;
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
      年报核验: bankCommentaryVerificationSentence(pack.dataVerification),
      事实包约束: pack.guardrails?.citeFactPackOnly ? "仅引用事实包" : "未启用",
      评论正文: commentary.text
    };
  });
}

function initLlmCommentaryModule() {
  ensureBankCommentaries();
  bindBankCommentaryActions();
  updateBankCommentaryPanel();
  updateEvidenceMapCommentaryPanel();
  if (typeof renderAll === "function" && !renderAll.__llmCommentaryWrapped) {
    const originalRenderAll = renderAll;
    renderAll = function renderAllWithLlmCommentary() {
      const result = originalRenderAll.apply(this, arguments);
      bindBankCommentaryActions();
      updateBankCommentaryPanel();
      updateEvidenceMapCommentaryPanel();
      return result;
    };
    renderAll.__llmCommentaryWrapped = true;
  }
}
