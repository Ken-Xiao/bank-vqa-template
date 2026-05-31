/* Bank VQA module: 29-ai-governance.js — fact-pack registry, AI audit and narrative locks */

function narrativeLockKey(topicId, channel) {
  return `${topicId}.${channel}`;
}

function ensureNarrativeLocks() {
  if (!state.narrativeLocks) state.narrativeLocks = {};
}

function isNarrativeLocked(topicId, channel) {
  ensureNarrativeLocks();
  return !!state.narrativeLocks[narrativeLockKey(topicId, channel)]?.locked;
}

function toggleNarrativeLock(topicId, channel, locked = !isNarrativeLocked(topicId, channel)) {
  ensureNarrativeLocks();
  const key = narrativeLockKey(topicId, channel);
  if (locked) {
    state.narrativeLocks[key] = { locked: true, lockedAt: new Date().toISOString() };
  } else {
    state.narrativeLocks[key] = { locked: false, unlockedAt: new Date().toISOString() };
    if (typeof resetDeliveryToDraft === "function") resetDeliveryToDraft("文案已解锁，需重新复核。");
  }
  renderAiGovernancePanel();
  if (typeof renderTopicWorkbench === "function") renderTopicWorkbench();
}

function factPackRegistryRows() {
  if (typeof topicDefinitions !== "function") return [];
  const row = targetRecord?.();
  return topicDefinitions().map((topic) => {
    const pack = typeof buildTopicFactPackObject === "function" ? buildTopicFactPackObject(topic.id) : null;
    const facts = pack?.facts || (typeof topicFactPackRows === "function" ? topicFactPackRows(topic.id) : []);
    const citations = typeof topicCitationFacts === "function" ? topicCitationFacts(topic, facts) : facts.slice(0, 3);
    return {
      id: `fact_topic_${topic.id}_${state.year}_${row?.bank || state.target}`.replace(/\s+/g, ""),
      type: "topic",
      topicId: topic.id,
      title: topic.title,
      source: "buildTopicFactPackObject",
      metrics: facts.map((fact) => fact.指标代码).filter(Boolean),
      riskLevels: [...new Set(facts.map((fact) => fact.口径风险等级).filter(Boolean))],
      citations: citations.map((fact) => ({
        metric: fact.指标代码,
        label: fact.指标名称,
        value: fact.目标值,
        role: fact.citationRole || "evidence"
      })),
      updatedAt: new Date().toISOString()
    };
  });
}

function narrativeTextForAudit(topicId, channel) {
  if (typeof getTopicNarrative === "function") return getTopicNarrative(topicId, channel)?.text || "";
  const key = typeof narrativeStorageKey === "function" ? narrativeStorageKey(topicId, channel) : `${topicId}.${channel}`;
  return state.editedNarratives?.[key] || "";
}

function narrativeAuditRows() {
  if (typeof topicDefinitions !== "function") return [];
  const channels = [
    ["board", "董事会版"],
    ["market", "资本市场版"],
    ["action", "管理层行动版"]
  ];
  return topicDefinitions().flatMap((topic) => {
    const facts = typeof topicFactPackRows === "function" ? topicFactPackRows(topic.id) : [];
    const citations = typeof topicCitationFacts === "function" ? topicCitationFacts(topic, facts) : facts.slice(0, 3);
    return channels.map(([channel, label]) => {
      const text = narrativeTextForAudit(topic.id, channel);
      const requiredCount = Math.min(2, Math.max(1, topic.requiredCitations?.length || 2));
      const hasNumbers = typeof narrativeUsesOnlyFactPackNumbers === "function" ? narrativeUsesOnlyFactPackNumbers(text, facts) : true;
      const issues = [];
      const warnings = [];
      if (!text.trim()) issues.push("解读为空");
      if (citations.length < requiredCount) issues.push("引用指标不足");
      if (!hasNumbers) warnings.push("存在需人工复核的事实包外数字");
      const highRisk = facts.some((fact) => ["L3", "L4"].includes(fact.口径风险等级));
      const status = issues.length ? "fail" : highRisk || warnings.length ? "warn" : "pass";
      return {
        topicId: topic.id,
        topicTitle: topic.title,
        channel,
        channelLabel: label,
        source: state.editedNarratives?.[`${topic.id}.${channel}`] ? "edited" : "generated",
        locked: isNarrativeLocked(topic.id, channel),
        citationCount: citations.length,
        requiredCitationCount: requiredCount,
        numberCheck: hasNumbers ? "pass" : "fail",
        status,
        issues: [...issues, ...warnings]
      };
    });
  });
}

function factPackRegistryExportRows() {
  return factPackRegistryRows().map((row) => ({
    事实包ID: row.id,
    类型: row.type,
    专题: row.title,
    来源: row.source,
    指标: row.metrics.join("、"),
    口径风险: row.riskLevels.join("、"),
    引用指标: row.citations.map((item) => `${item.label}${item.value}`).join("；"),
    更新时间: row.updatedAt
  }));
}

function narrativeAuditExportRows() {
  return narrativeAuditRows().map((row) => ({
    专题: row.topicTitle,
    渠道: row.channelLabel,
    来源: row.source,
    是否锁定: row.locked ? "是" : "否",
    引用指标数: row.citationCount,
    要求引用数: row.requiredCitationCount,
    数字校验: row.numberCheck,
    状态: row.status,
    问题: row.issues.join("；")
  }));
}

function narrativeLockExportRows() {
  ensureNarrativeLocks();
  return Object.entries(state.narrativeLocks).map(([key, value]) => ({
    文案: key,
    是否锁定: value.locked ? "是" : "否",
    锁定时间: value.lockedAt || "",
    解锁时间: value.unlockedAt || ""
  }));
}

function aiGovernanceGateChecks() {
  const failed = narrativeAuditRows().filter((row) => row.status === "fail");
  return {
    status: failed.length ? "bad" : "ok",
    blockers: failed.map((row) => `${row.topicTitle}${row.channelLabel}未通过引用校验`),
    warnings: narrativeAuditRows().filter((row) => row.status === "warn").map((row) => `${row.topicTitle}${row.channelLabel}存在高风险口径`)
  };
}

function renderAiGovernancePanel() {
  const host = document.getElementById("aiGovernancePanel");
  if (!host) return;
  const registry = factPackRegistryRows();
  const audits = narrativeAuditRows();
  const failed = audits.filter((row) => row.status === "fail").length;
  const locked = audits.filter((row) => row.locked).length;
  host.innerHTML = `
    <div class="governance-head">
      <div><span>AI 写稿治理</span><h3>事实包、引用指标和锁定文案共同决定报告语言是否可交付</h3></div>
      <b>${locked}/${audits.length}</b>
    </div>
    <div class="governance-kpis">
      <div><span>事实包</span><b>${registry.length}</b></div>
      <div><span>审计段落</span><b>${audits.length}</b></div>
      <div><span>未通过</span><b>${failed}</b></div>
      <div><span>已锁定</span><b>${locked}</b></div>
    </div>
    <div class="ai-audit-grid">${audits.map((row) => `
      <div class="ai-audit-row tone-${row.status}">
        <span>${row.topicTitle}｜${row.channelLabel}</span>
        <b>${row.status.toUpperCase()}</b>
        <p>引用 ${row.citationCount}/${row.requiredCitationCount}｜数字校验 ${row.numberCheck}｜${row.locked ? "已锁定" : "未锁定"}</p>
        <button type="button" data-lock-topic="${row.topicId}" data-lock-channel="${row.channel}">${row.locked ? "解锁" : "锁定"}</button>
      </div>`).join("")}</div>`;
  host.querySelectorAll("[data-lock-topic]").forEach((button) => {
    button.addEventListener("click", () => toggleNarrativeLock(button.dataset.lockTopic, button.dataset.lockChannel));
  });
}

function initAiGovernanceModule() {
  ensureNarrativeLocks();
  renderAiGovernancePanel();
  if (typeof renderAll === "function" && !renderAll.__aiGovernanceWrapped) {
    const originalRenderAll = renderAll;
    renderAll = function renderAllWithAiGovernance() {
      const result = originalRenderAll.apply(this, arguments);
      renderAiGovernancePanel();
      return result;
    };
    renderAll.__aiGovernanceWrapped = true;
  }
}
