/* Bank VQA module: 22-formal-report.js — RSM style long-form report */

function formalEscape(text = "") {
  if (typeof xmlEscape === "function") return xmlEscape(text);
  return String(text ?? "").replace(/[&<>"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "\"": "&quot;", "'": "&#39;" }[char]));
}

function formalParagraph(text = "", limit = 520) {
  return formalEscape(reportShortText(String(text || "因数据覆盖不足，暂不形成该层判断。"), limit));
}

function formalMetricHero(key, row = targetRecord()) {
  const gap = typeof v4MetricGap === "function" ? v4MetricGap(key, row, peerRecords()) : null;
  const pctRaw = rankPercentile(row?.[key], currentRecords(), key, metricDirection(key));
  const pct = Number.isFinite(pctRaw) ? `P${Math.round(pctRaw)}` : "P--";
  return `
    <div class="formal-metric-hero">
      <span>${formalEscape(fieldName(key))}</span>
      <b>${formalEscape(metricDisplayValue(key, row?.[key]))}</b>
      <em>对标 ${formalEscape(metricDisplayValue(key, gap?.peer))}｜${pct}</em>
      <p>${gap ? `${gap.goodGap >= 0 ? "相对对标形成支撑" : "相对对标形成约束"}，差距 ${metricDisplayValue(key, Math.abs(gap.raw))}` : "对标数据不足，暂不形成差距判断。"}</p>
    </div>`;
}

function formalFactTable(facts = []) {
  const rows = facts.slice(0, 6).map((fact) => `
    <tr>
      <td>${formalEscape(fact.指标名称)}</td>
      <td>${formalEscape(fact.目标值)}</td>
      <td>${formalEscape(fact.对标均值)}</td>
      <td>${formalEscape(fact.类型均值)}</td>
      <td>${formalEscape(fact.分位)}</td>
    </tr>`).join("");
  return `
    <table class="formal-fact-table">
      <thead><tr><th>指标</th><th>目标银行</th><th>对标均值</th><th>类型均值</th><th>分位</th></tr></thead>
      <tbody>${rows || `<tr><td colspan="5">暂无可用事实指标</td></tr>`}</tbody>
    </table>`;
}

function formalTopicSection(topicKey, index) {
  const row = targetRecord();
  const config = rsm2TopicConfig(topicKey);
  if (!row || !config) return "";
  const facts = rsm2TopicFacts(topicKey);
  const judgement = rsm2SignalFromTopic(topicKey);
  const primary = facts[0]?.指标代码 || config.keys?.[0]?.[0] || "roa";
  const attribution = typeof gapAttributionEngine === "function" ? gapAttributionEngine(primary, row, peerRecords()) : null;
  const confidence = typeof confidenceLevel === "function" ? confidenceLevel(primary, row, peerRecords()) : { level: "中", prefix: "现有数据倾向于显示", suffix: "建议保留口径提示。" };
  const temporal = typeof buildTemporalNarrative === "function" ? buildTemporalNarrative(primary, row.bank) : "";
  const mechanism = typeof buildMechanismExplanation === "function" ? buildMechanismExplanation(topicKey) : config.finding;
  const drill = typeof drillDownRows === "function" ? drillDownRows(topicKey, row).slice(0, 4) : [];
  const drillHtml = drill.map((item) => `
    <div class="formal-drill-card">
      <b>${formalEscape(item.label)}</b>
      <span>目标 ${formalEscape(item.target)}｜对标 ${formalEscape(item.peer)}</span>
      <p>${formalParagraph(item.finding, 110)}</p>
    </div>`).join("");
  return `
    <section class="formal-section" id="formal-topic-${formalEscape(topicKey)}">
      <div class="formal-section-kicker">专题 ${String(index + 1).padStart(2, "0")}｜${formalEscape(config.module)}｜置信度 ${formalEscape(confidence.level)}</div>
      <h2>${formalEscape(reportTitleSentence(judgement?.headline || config.title, 86))}</h2>
      <div class="formal-two-column">
        <div>
          <p class="formal-lead">${formalParagraph(`${confidence.prefix}，${judgement?.headline || config.finding} ${confidence.suffix}`, 260)}</p>
          <h3>1. 证据基础</h3>
          <p>${formalParagraph(facts.slice(0, 3).map((fact) => `${fact.指标名称}为${fact.目标值}，对标均值${fact.对标均值}，分位为${fact.分位}`).join("；") || "本专题缺少足够可用指标。", 520)}</p>
          ${formalFactTable(facts)}
          <h3>2. 形成机制</h3>
          <p>${formalParagraph(mechanism, 620)}</p>
          <h3>3. 差距归因与时间轨迹</h3>
          <p>${formalParagraph(`${attribution?.headline || config.finding} ${temporal}`, 620)}</p>
          <h3>4. 管理含义</h3>
          <p>${formalParagraph(`${config.action} 该动作需要在下一轮经营复盘中回到指标变化、对标样本稳定性和数据口径一致性进行验证。`, 520)}</p>
        </div>
        <aside class="formal-side-note">
          <b>下钻读法</b>
          <div class="formal-drill-grid">${drillHtml}</div>
        </aside>
      </div>
    </section>`;
}

function formalWatchSection(row = targetRecord()) {
  const rows = typeof watchMetricRows === "function" ? watchMetricRows(row).slice(0, 8) : [];
  return `
    <section class="formal-section" id="formal-watch">
      <div class="formal-section-kicker">关键指标看板</div>
      <h2>${formalEscape(displayBankName(row?.bank || state.target))}后续应固定少数指标复核价值质量变化</h2>
      <p class="formal-lead">正式报告不建议追踪所有指标，而应把低分位、敏感性较高且与行动建议直接相关的指标放入董事会季度复盘。以下指标用于把本次诊断延伸为后续管理闭环。</p>
      <div class="formal-metric-grid">${rows.map((item) => formalMetricHero(item.key, row)).join("")}</div>
    </section>`;
}

function formalSensitivitySection(row = targetRecord()) {
  const rows = typeof peerSensitivityRows === "function" ? peerSensitivityRows(row).slice(0, 8) : [];
  const body = rows.map((item) => `
    <tr>
      <td>${formalEscape(displayBankName(item.peer))}</td>
      <td>${formalEscape(`${item.base} → ${item.after}`)}</td>
      <td>${formalEscape(`${item.delta >= 0 ? "+" : ""}${item.delta}`)}</td>
      <td>${formalEscape(item.flip ? "信号翻转，强结论需降级" : `信号稳定，最弱维度为${item.weakest}`)}</td>
    </tr>`).join("");
  return `
    <section class="formal-section" id="formal-sensitivity">
      <div class="formal-section-kicker">同业敏感性</div>
      <h2>对标组变动未改变核心结论时，报告判断才具备进入董事会讨论基础</h2>
      <p class="formal-lead">敏感性测试逐一移除对标银行并重算 VQA 分数，用于识别结论是否依赖单一同业样本。若出现信号翻转，正文判断需要降级为“待验证”；若信号稳定，则可以作为正式报告的置信度支撑。</p>
      <table class="formal-fact-table">
        <thead><tr><th>移除样本</th><th>VQA 变化</th><th>分数影响</th><th>结论影响</th></tr></thead>
        <tbody>${body || `<tr><td colspan="4">至少保留 2 家对标银行后生成敏感性测试。</td></tr>`}</tbody>
      </table>
    </section>`;
}

function formalActionSection(row = targetRecord()) {
  const priorities = typeof actionPriorityMatrix === "function" ? actionPriorityMatrix(row).slice(0, 5) : [];
  const cards = priorities.map((item, idx) => `
    <div class="formal-action-card">
      <span>${String(idx + 1).padStart(2, "0")}</span>
      <b>${formalEscape(item.label)}</b>
      <p>综合优先级 ${formalEscape(item.total)}。影响度 ${formalEscape(Math.round(item.impact))}，可改善性 ${formalEscape(Math.round(item.feasibility))}，紧迫性 ${formalEscape(Math.round(item.urgency))}。建议纳入 0-3 个月管理层专项复核。</p>
    </div>`).join("");
  return `
    <section class="formal-section" id="formal-action">
      <div class="formal-section-kicker">行动建议</div>
      <h2>${formalEscape(displayBankName(row?.bank || state.target))}修复路径应从优先级最高的指标开始，而不是平均用力</h2>
      <p class="formal-lead">行动排序采用影响度、可改善性和紧迫性三类因子综合判断。正式报告的建议不使用“持续关注”作为结论，而是把每项建议绑定到指标、时间窗口和复核方式。</p>
      <div class="formal-action-grid">${cards}</div>
      <div class="formal-roadmap">
        <div><b>0-3 个月</b><p>确认低分位指标口径、责任部门和改善阈值。</p></div>
        <div><b>3-6 个月</b><p>将息差、核心营收、风险确认和资本消耗拆到经营动作。</p></div>
        <div><b>6-12 个月</b><p>用 ROA、NIM、不良、手续费资产比和 PB 联动验证改善。</p></div>
      </div>
    </section>`;
}

function formalAppendixSection() {
  const logs = (state.sessionLog || []).slice(0, 8).map((item) => `
    <tr><td>${formalEscape(item.timestamp)}</td><td>${formalEscape(item.action)}</td><td>${formalEscape(item.finding)}</td></tr>`).join("");
  return `
    <section class="formal-section formal-appendix" id="formal-appendix">
      <div class="formal-section-kicker">附录</div>
      <h2>数据来源、分析路径和口径边界</h2>
      <p class="formal-lead">本报告使用 iFinD、上市公司年报和 RSM 整理口径，结论强度受数据完整性、口径可比性和同业样本稳定性影响。指标覆盖不足、口径风险较高或敏感性较高的判断，应在正式沟通中保留审慎表达。</p>
      <table class="formal-fact-table">
        <thead><tr><th>时间</th><th>动作</th><th>形成记录</th></tr></thead>
        <tbody>${logs || `<tr><td colspan="3">暂无路径记录。</td></tr>`}</tbody>
      </table>
      <p class="formal-source">数据来源：iFinD · 上市公司年报 · RSM 整理。测算结果为 RSM 推演，仅用于经营诊断和董事会讨论。</p>
    </section>`;
}

function buildFormalReportHtml({ exportMode = false } = {}) {
  const row = targetRecord();
  if (!row) return `<article class="formal-report empty">请先确认目标银行和对标样本。</article>`;
  const story = consultingStoryline(row);
  const diagnosis = computeVqaDiagnosis(row, peerRecords());
  const topics = rsm2MainReportTopics();
  const checks = typeof crossValidationNarratives === "function" ? crossValidationNarratives(row).slice(0, 4) : [];
  const context = typeof buildIndustryContextParagraph === "function" ? buildIndustryContextParagraph(row) : "";
  const topicSections = topics.map((topicKey, index) => formalTopicSection(topicKey, index)).join("");
  const checkCards = checks.map((item) => `<li>${formalParagraph(item, 140)}</li>`).join("");
  return `
    <article class="formal-report${exportMode ? " is-export" : ""}" id="formalReport">
      <header class="formal-cover">
        <div class="formal-brand-bars"><i></i><i></i><i></i></div>
        <div>
          <span>董事会经营诊断报告</span>
          <h1>${formalEscape(displayBankName(row.bank))}${formalEscape(state.year)}年价值质量诊断与经营对标分析</h1>
          <p>${formalEscape(story.client_question)}</p>
        </div>
        <aside>
          <b>报告版本</b><em>${formalEscape(state.reportVersion)}</em>
          <b>目标银行</b><em>${formalEscape(displayBankName(row.bank))}</em>
          <b>对标银行</b><em>${formalEscape(displayBankList(state.peers))}</em>
          <b>形成时间</b><em>${formalEscape(new Date().toLocaleString("zh-CN", { hour12: false }))}</em>
        </aside>
      </header>
      <section class="formal-executive" id="formal-executive">
        <div class="formal-section-kicker">执行摘要</div>
        <h2>${formalEscape(story.client_answer)}</h2>
        <p class="formal-lead">本报告的核心判断是：${formalParagraph(story.deck_answer, 420)}</p>
        <div class="formal-metric-grid">
          ${["roa", "nim", "npl", "pb"].map((key) => formalMetricHero(key, row)).join("")}
        </div>
        <div class="formal-callout">
          <b>总判断</b>
          <p>VQA 当前得分为 ${formalEscape(diagnosis.score)}，信号为“${formalEscape(diagnosis.signal)}”。最需要优先解释的维度是${formalEscape(diagnosis.labels[diagnosis.weakest])}；正式报告后续章节按行业坐标、关键指标、专题归因、敏感性和行动建议逐层证明。</p>
        </div>
      </section>
      <section class="formal-section" id="formal-context">
        <div class="formal-section-kicker">行业坐标与交叉验证</div>
        <h2>个体差异需要先经过类型均值校准，再判断是否进入结构性归因</h2>
        <p class="formal-lead">${formalParagraph(context, 520)}</p>
        <ul class="formal-check-list">${checkCards}</ul>
      </section>
      ${formalWatchSection(row)}
      ${topicSections}
      ${formalSensitivitySection(row)}
      ${formalActionSection(row)}
      ${formalAppendixSection()}
    </article>`;
}

function renderFormalReport() {
  const host = document.getElementById("formalReport");
  if (!host) return;
  host.outerHTML = buildFormalReportHtml();
}

function bindFormalReportRender() {
  const originalRenderAll = typeof renderAll === "function" ? renderAll : null;
  if (originalRenderAll && !originalRenderAll.__formalReportWrapped) {
    renderAll = function renderAllWithFormalReport() {
      const result = originalRenderAll.apply(this, arguments);
      renderFormalReport();
      return result;
    };
    renderAll.__formalReportWrapped = true;
  }
}

bindFormalReportRender();
