/* Bank VQA module: 08-report.js */

function reportCleanText(text = "") {
  return String(text || "")
    .replace(/\s+/g, " ")
    .replace(/^(本页用法|章节摘要|口径说明|复核提示|阅读说明|本页说明|导出说明|系统提示)[:：]?/g, "")
    .trim();
}

function reportNeutralText(text = "") {
  return reportCleanText(text)
    .replace(/系统会/g, "本报告将")
    .replace(/系统/g, "本报告")
    .replace(/生成/g, "形成")
    .replace(/工作流/g, "分析流程")
    .replace(/工作台/g, "分析页面")
    .replace(/事实包/g, "事实依据")
    .replace(/底稿/g, "指标底稿")
    .replace(/HTML\/PPTX|PPTX|HTML/g, "汇报材料")
    .replace(/偏弱/g, "低于参照水平")
    .replace(/薄弱/g, "低于参照水平")
    .replace(/偏薄/g, "低于参照水平")
    .replace(/承压/g, "边际下行或低于参照水平")
    .replace(/优秀/g, "处于样本前段")
    .replace(/良好/g, "位于参照区间")
    .replace(/糟糕/g, "处于样本后段")
    .replace(/较差/g, "处于样本后段")
    .replace(/短板/g, "低分位指标")
    .replace(/落后/g, "位置后移")
    .replace(/掉队/g, "排名下行")
    .replace(/恶化/g, "趋势待观察")
    .replace(/低估/g, "价值错配")
    .replace(/高估/g, "估值溢价")
    .replace(/原因是/g, "可能的关联因素包括")
    .replace(/建议/g, "可关注")
    .replace(/应该/g, "可考虑")
    .replace(/红利/g, "阶段性贡献")
    .replace(/含金量/g, "质量贡献");
}

function clientFacingText(text = "", limit = 90) {
  return reportShortText(text, limit)
    .replace(/后续建议/g, "建议")
    .replace(/下一步应/g, "建议")
    .replace(/需要进一步/g, "建议进一步")
    .replace(/持续关注/g, "纳入持续跟踪");
}

function reportShortText(text = "", limit = 58) {
  const clean = reportNeutralText(text);
  if (clean.length <= limit) return clean;
  const cut = clean.slice(0, limit);
  const stop = Math.max(cut.lastIndexOf("。"), cut.lastIndexOf("；"), cut.lastIndexOf("，"));
  return `${cut.slice(0, stop > 20 ? stop : limit)}。`;
}

function reportBulletList(items = [], max = 3, limit = 58) {
  return items
    .map((item) => reportShortText(item, limit))
    .filter(Boolean)
    .slice(0, max)
    .map((item) => `<li>${item}</li>`)
    .join("");
}

function reportCommentCards(rows = [], max = 3) {
  return rows.slice(0, max).map(([label, value]) => `
    <div class="print-comment">
      <b>${label}</b>
      <p>${reportShortText(value, 76)}</p>
    </div>
  `).join("");
}

function reportStoryNote(label, items = []) {
  const list = reportBulletList(items, 3, 76);
  return list ? `<b>${label}</b><ul>${list}</ul>` : "";
}

function consultingStoryline(row = targetRecord()) {
  const target = displayBankName(row?.bank || state.target);
  const peers = displayBankList(state.peers, "所选对标银行");
  const typeText = state.types.join("、") || "所选类型银行";
  const diagnosis = row ? computeVqaDiagnosis(row, peerRecords()) : null;
  const weakest = diagnosis?.labels?.[diagnosis.weakest] || "关键质量维度";
  const score = diagnosis?.score || "待形成";
  const answer = `${target}当前价值质量差异应优先从${weakest}解释，并用经营端事实与资本市场反馈共同验证。`;
  const chapters = [
    {
      kicker: "一、经营压力传导",
      short: "经营压力",
      question: `${target}的经营压力来自行业共同下行，还是自身收入结构缓冲不足？`,
      answer: `${target}经营压力需要先从资产收益率和收入结构拆解，再判断是否传导到主业修复。`,
      bridge: "本章先定位压力来源，为后续盈利质量、息差防守和资本估值提供起点。",
      proof: "资产收益率趋势、收入结构和核心营收变化"
    },
    {
      kicker: "二、盈利结构与轻资本能力",
      short: "盈利质量",
      question: `${target}利润表现是否来自可持续主业修复，而非拨备或一次性因素？`,
      answer: `${target}盈利质量应回到核心营收、手续费资产比和拨备前利润验证。`,
      bridge: "本章承接经营压力，判断利润修复是否具备可持续收入来源。",
      proof: "核心营收增速、手续费资产比、真实核心非息和拨备前利润"
    },
    {
      kicker: "三、息差防守与负债底盘",
      short: "息差防守",
      question: `${target}负债端降本能否对冲资产端让价？`,
      answer: `${target}息差判断需要同时拆解资产收益、负债成本和存款结构。`,
      bridge: "本章解释盈利底盘中最核心的资产负债管理问题。",
      proof: "净息差、生息资产收益率、计息负债成本率和息差对冲缺口"
    },
    {
      kicker: "四、风险确认与拨备缓冲",
      short: "风险确认",
      question: `${target}利润质量是否建立在充分风险确认基础上？`,
      answer: `${target}风险判断应从结果不良前移到逾期偏离、隐性暴露和拨备缓冲。`,
      bridge: "本章决定盈利修复能否被董事会和资本市场接受。",
      proof: "不良率、逾期偏离度、隐性不良和拨备覆盖率"
    },
    {
      kicker: "五、资本纪律与估值验证",
      short: "资本估值",
      question: `${target}低估值是价值错配，还是经营质量折价？`,
      answer: `${target}资本市场定价需要由回报、风险确认和资本消耗共同解释。`,
      bridge: "本章把经营端结论转化为资本市场端表达，并落到行动建议。",
      proof: "总资产收益率、资本余量、风险加权资产密度和市净率"
    }
  ];
  return {
    client_question: `${target}当前价值质量差异主要来自哪里，下一步应优先修复什么？`,
    client_answer: answer,
    deck_answer: `${answer}本次报告以${peers}为横向参照，以${typeText}为类型均值边界。`,
    score,
    weakest,
    chapters
  };
}

function consultingChapterFor(kicker = "") {
  const story = consultingStoryline();
  return story.chapters.find((chapter) => kicker.includes(chapter.short) || chapter.kicker === kicker) || story.chapters[0];
}

function updateClientBrief() {
  const row = targetRecord();
  const question = document.getElementById("clientBriefQuestion");
  const answer = document.getElementById("clientBriefAnswer");
  const findings = document.getElementById("clientBriefFindings");
  const actions = document.getElementById("clientBriefActions");
  if (!question || !answer || !findings || !actions) return;
  if (!row) {
    question.textContent = "本次分析需要回答目标银行的价值质量差异主要来自哪里";
    answer.textContent = "确认分析口径后，本页将展示总答案、核心发现和建议动作。";
    findings.innerHTML = "<li>待形成。</li>";
    actions.innerHTML = "<li>待形成。</li>";
    return;
  }
  const story = consultingStoryline(row);
  const diagnosis = computeVqaDiagnosis(row, peerRecords());
  const explainers = topicExplainerRows(row, peerRecords(), diagnosis);
  const target = displayBankName(row.bank || state.target);
  question.textContent = story.client_question;
  answer.textContent = story.client_answer;
  findings.innerHTML = reportBulletList([
    `${target}价值质量评分为 ${story.score}，当前判断为${diagnosis.signal}。`,
    `核心观察应优先回到${story.weakest}，并与对标组和类型均值比较。`,
    story.chapters[0].answer
  ], 3, 72);
  actions.innerHTML = reportBulletList([
    explainers[0]?.action || "优先确认资产收益率、负债成本和核心营收的季度变化。",
    explainers[1]?.action || "将低分位指标纳入管理层月度复盘。",
    "用数据附录复核指标覆盖情况，覆盖不足的结论降低判断强度。"
  ], 3, 72);
}

function reportTitleSentence(title = "", limit = 46) {
  const clean = reportNeutralText(title)
    .replace(/^(数据展示|背景介绍|方案说明|分析结果|图表分析|报告目录|研究口径)[:：]?/g, "")
    .trim();
  if (clean.length <= limit) return clean;
  return `${clean.slice(0, limit - 1)}。`;
}

function rsmContentSlide(className, moduleLabel, moduleNum, title, subtitle, bodyHtml, storyHtml = "") {
  if (typeof wrapContentSlide === "function") {
    return wrapContentSlide(className, moduleLabel, moduleNum, reportTitleSentence(title), subtitle, bodyHtml, storyHtml);
  }
  return `
    <section class="print-slide ${className}" data-deck-type="content">
      ${rsmModuleBar(moduleLabel, moduleNum)}
      ${rsmSlideHead(reportTitleSentence(title), subtitle)}
      <div class="rsm-slide-body">${bodyHtml}</div>
      ${storyHtml ? `<div class="rsm-slide-story">${storyHtml}</div>` : ""}
    </section>`;
}

function rsmSectionSlide(moduleLabel, moduleNum, title, subtitle, storyTitle, storyText, storyNote) {
  return `
    <section class="print-slide storyline rsm-section" data-deck-type="section">
      ${rsmModuleBar(moduleLabel, moduleNum)}
      ${rsmSlideHead(reportTitleSentence(title), subtitle)}
      <div class="rsm-slide-body">
        <div class="storyline-box">
          <h2>${reportTitleSentence(storyTitle, 40)}</h2>
          <p>${storyText}</p>
        </div>
      </div>
      ${storyNote ? `<div class="rsm-slide-story">${storyNote}</div>` : ""}
    </section>`;
}

function buildExecutiveSlide() {
  const row = targetRecord();
  if (!row) return "";
  const metrics = reportMetricRows(row).slice(0, 4).map(([label, value]) => `<div class="print-metric"><b>${label}</b><span>${value}</span></div>`).join("");
  const comments = reportCommentCards(reportCommentRows(row), 3);
  const body = `<div class="print-dashboard"><div class="print-metric-grid">${metrics}</div><div class="print-comment-grid">${comments}</div></div>`;
  return rsmContentSlide(
    "executive-slide",
    "经营诊断摘要",
    "04",
    `${displayBankName(row.bank)}诊断重点应回到低分位维度和证据链`,
    `${state.year} 年｜对标银行：${displayBankList(state.peers)}｜本页保留 4 个核心数字和 3 条董办判断`,
    body,
    reportStoryNote("董事会关注点", ["先看价值质量总分和低分位维度", "再看息差、核心营收、市净率等证据", "最后确认需要优先解释和修复的问题"])
  );
}

function buildTopicSlide() {
  const row = targetRecord();
  if (!row) return "";
  const diagnosis = computeVqaDiagnosis(row, peerRecords());
  const topics = topicExplainerRows(row, peerRecords(), diagnosis).slice(0, 5).map((item) => `
    <div class="print-topic">
      <b>${item.topic}</b>
      <p class="print-topic-fact">${reportShortText(item.fact, 64)}</p>
      <p class="print-topic-action">${item.action}</p>
      <p>${reportShortText(item.logic, 54)}</p>
    </div>
  `).join("");
  return rsmContentSlide(
    "topic-overview-slide",
    "专题解释器",
    "07",
    `${displayBankName(row.bank)}经营差异需拆为五类可讨论专题`,
    "每个专题只保留一个判断、一个证据方向和一个管理动作，避免把网页解读整段搬入报告。",
    `<div class="print-topic-grid">${topics}</div>`,
    reportStoryNote("专题阅读方式", ["本页把诊断结果拆成五个可讨论专题", "后续专题页展开重点问题", "每个专题结论均保留数据依据"])
  );
}

function buildTopicDetailSlide(topic, index = 0) {
  const row = targetRecord();
  if (!row) return "";
  const facts = topicFactPackRows(topic.id);
  const metrics = facts.slice(0, 4).map((fact) => `<div class="print-metric"><b>${fact.指标名称}</b><span>${fact.目标值}</span></div>`).join("");
  const judgement = typeof topicJudgement === "function" ? topicJudgement(topic.id, facts) : null;
  const comments = reportCommentCards([
    ["专题判断", judgement ? `${judgement.signal}。${judgement.headline}` : topic.question],
    ["关键证据", facts.slice(0, 2).map((fact) => `${fact.指标名称}${fact.目标值}，${fact.分位}`).join("；")],
    ["管理含义", topic.actions?.[0] || topic.mechanism]
  ], 3);
  const body = `<div class="print-dashboard"><div class="print-metric-grid">${metrics}</div><div class="print-comment-grid">${comments}</div></div>`;
  return rsmContentSlide(
    "topic-detail-slide",
    topic.title,
    `7-${index + 1}`,
    `${topic.title}应先解释形成机制，再落到管理动作`,
    reportShortText(topic.question, 86),
    body,
    reportStoryNote("本页管理含义", [topic.mechanism, "本页数字来自选定样本和核心指标口径。"])
  );
}

function buildAllTopicSlides() {
  return topicDefinitions()
    .filter((topic) => typeof isTopicIncluded === "function" ? isTopicIncluded(topic.id) : true)
    .map((topic, index) => buildTopicDetailSlide(topic, index))
    .join("");
}

function buildScopeSlide() {
  const row = targetRecord();
  const includedTopics = topicDefinitions().filter((topic) => typeof isTopicIncluded === "function" ? isTopicIncluded(topic.id) : true);
  const rows = [
    ["目标银行", displayBankName(row?.bank || state.target)],
    ["对标银行", displayBankList(state.peers)],
    ["类型均值", state.types.join("、") || "所选类型银行"],
    ["分析年份", `${state.year} 年`],
    ["报告版本", state.reportVersion || "董事会完整汇报版"],
    ["汇报语气", typeof reportVersionToneLabel === "function" ? reportVersionToneLabel() : "董事会汇报语气"],
    ["对标组模板", typeof peerTemplateLabel === "function" ? peerTemplateLabel(state.peerTemplate) : state.peerTemplate],
    ["纳入专题", includedTopics.map((topic) => topic.title).join("、") || "全部专题"],
    ["纳入图表", `${includedChartCount()} 张`]
  ];
  const body = `<div class="print-scope-grid">${rows.map(([label, value]) => `<div class="print-scope-item"><b>${label}</b><span>${value}</span></div>`).join("")}</div>`;
  return rsmContentSlide(
    "scope-slide",
    "研究口径",
    "02",
    "本次分析口径决定对标结论的适用边界",
    "本页用于董事会、财务和战略团队共同确认分析边界，避免样本差异影响后续判断。",
    body,
    "<b>样本边界</b>若对标银行、类型均值或纳入专题发生调整，应同步更新后续图表和行动建议。"
  );
}

function buildMethodologySlide() {
  const row = targetRecord();
  const body = `
    <div class="print-method-grid">
      <div class="print-method-card"><b>银行经营端</b><p>把回报、主业修复、息差防守、风险确认和资本效率放在同一张经营答卷里，先解释压力来源，再讨论修复路径。</p></div>
      <div class="print-method-card"><b>资本市场端</b><p>不把低市净率直接等同于低估，而是把 PB 与 ROA、核心营收、风险确认和资本余量联读，区分价值错配与质量折价。</p></div>
      <div class="print-method-card"><b>专题判断</b><p>五类专题把经营问题转成董事会可讨论的语言，每页保留事实依据、形成机制和管理含义。</p></div>
      <div class="print-method-card"><b>数据边界</b><p>指标口径、覆盖情况和年度趋势用于判断结论强度；覆盖不足的指标进入附录或待补数据清单。</p></div>
    </div>`;
  return rsmContentSlide(
    "methodology-slide",
    "价值质量框架",
    "03",
    "VQA 将经营事实与估值反馈放在同一口径验证",
    `${displayBankName(row?.bank || state.target)}｜银行经营端 × 资本市场端双重穿透`,
    body,
    reportStoryNote("阅读顺序", ["经营端回答质量是否可持续", "资本市场端回答估值是否反映质量", "专题判断把数据差异转成行动优先级"])
  );
}

function buildConsultingPyramidSlide() {
  const row = targetRecord();
  if (!row) return "";
  const story = consultingStoryline(row);
  const target = displayBankName(row.bank || state.target);
  const chapterRows = story.chapters.map((chapter, index) => `
    <div class="consulting-pyramid-row">
      <b>${String(index + 1).padStart(2, "0")} ${chapter.short}</b>
      <p>${chapter.answer}</p>
    </div>
  `).join("");
  const body = `
    <div class="consulting-pyramid-layout">
      <div class="consulting-question-card">
        <span>客户问题</span>
        <h3>${story.client_question}</h3>
        <p>本页定义报告要回答的董事会问题，后续每个章节和图表均围绕该问题展开。</p>
      </div>
      <div class="consulting-answer-card">
        <span>总答案</span>
        <h3>${story.client_answer}</h3>
        <p>当前价值质量总分为 ${story.score}，结论强度以已选目标银行、对标银行和类型均值为边界。</p>
      </div>
      <div class="consulting-chapter-stack">${chapterRows}</div>
    </div>`;
  return rsmContentSlide(
    "consulting-pyramid-slide",
    "咨询论证框架",
    "04",
    `${target}本轮报告围绕质量差异和修复顺序展开`,
    `基于 ${state.year} 年截面、${displayBankList(state.peers)} 对标组和 ${state.types.join("、") || "所选类型"} 均值口径`,
    body,
    reportStoryNote("汇报原则", ["执行摘要只保留已证明的结论", "每个章节回答一个管理问题", "建议绑定指标、动作和复核口径"])
  );
}

function buildExecutiveTakeawaysSlide() {
  const row = targetRecord();
  if (!row) return "";
  const story = consultingStoryline(row);
  const diagnosis = computeVqaDiagnosis(row, peerRecords());
  const explainers = topicExplainerRows(row, peerRecords(), diagnosis);
  const target = displayBankName(row.bank || state.target);
  const takeaways = [
    {
      label: "结论 01",
      claim: typeof v6TensionOpening === "function" ? v6TensionOpening(row, peerRecords()) : `${target}本轮质量差异集中在${story.weakest}`,
      evidence: `${target}价值质量评分为 ${story.score}，结论为${diagnosis.signal}；后续章节将逐项验证差异来源。`
    },
    {
      label: "结论 02",
      claim: story.chapters[2].answer,
      evidence: "息差、核心营收、风险确认和资本消耗需要联读，才能区分存量回报、质量修复和风险滞后。"
    },
    {
      label: "结论 03",
      claim: "管理动作应从低分位指标进入季度复盘",
      evidence: explainers[0]?.action || "建议优先确认资产收益率、负债成本、核心营收和风险确认指标的季度变化。"
    }
  ];
  const cards = takeaways.map((item) => `
    <div class="executive-takeaway-card">
      <span>${item.label}</span>
      <b>${reportTitleSentence(item.claim, 34)}</b>
      <p>${clientFacingText(item.evidence, 88)}</p>
    </div>
  `).join("");
  const actionStrip = `
    <div class="executive-action-strip">
      <b>建议董事会本次重点审阅</b>
      <span>${clientFacingText(explainers[0]?.action || "优先确认低分位指标的形成机制，并设置下一季度复盘指标。", 62)}</span>
      <span>${clientFacingText(explainers[1]?.action || "将息差、核心营收、风险确认和资本消耗纳入同一张管理看板。", 62)}</span>
    </div>`;
  const discussion = typeof boardroomDiscussionQuestions === "function" ? `
    <div class="executive-discussion-strip">
      ${boardroomDiscussionQuestions(row, peerRecords()).map((item) => `<div><b>${item.dimension}</b><span>${clientFacingText(item.question, 58)}</span></div>`).join("")}
    </div>` : "";
  return rsmContentSlide(
    "executive-takeaways-slide",
    "执行摘要",
    "04",
    `${target}本轮结论应先回答质量差异和修复顺序`,
    `${story.client_question}｜基于 ${state.year} 年截面和所选对标组`,
    `<div class="executive-takeaways-grid">${cards}</div>${discussion}${actionStrip}`,
    ""
  );
}

function buildTocSlide() {
  const row = targetRecord();
  const sections = typeof deckTocSections === "function" ? deckTocSections() : [];
  const includedTopicList = topicDefinitions().filter((topic) => typeof isTopicIncluded === "function" ? isTopicIncluded(topic.id) : true);
  const topicRows = shouldIncludeDeckSection("topics") ? includedTopicList.map((topic, index) => `
    <li class="print-toc-topic"><b>7-${index + 1}</b><div><span>${topic.title}</span><em>${topic.question}</em></div></li>
  `).join("") : "";
  const sectionCount = sections.filter((section) => section.key !== "cover").length;
  return `
    <section class="print-slide toc-slide rsm-toc" data-deck-type="toc">
      ${rsmModuleBar("报告目录", "01")}
      <div class="rsm-toc-layout">
        <aside class="rsm-toc-sidebar">
          <h3>目录</h3>
          <p>本汇报包含 ${sectionCount} 个章节模块。开篇确认样本边界和核心判断，中段展开经营视角与资本市场视角双重穿透，尾段输出管理动作与数据附录。</p>
          <p style="margin-top:3mm;">沟通对象 · 董事会 / 管理层｜${state.reportVersion}｜${state.year} 年</p>
        </aside>
        <div class="rsm-toc-main">
          <ol class="print-toc">${sections.filter((section) => section.key !== "cover").map((section) => `
            <li><b>${section.num}</b><div><span>${section.title}</span><em>${section.desc}</em></div></li>
          `).join("")}</ol>
          ${topicRows ? `<div class="print-toc-subtitle">入选专题明细</div><ol class="print-toc print-toc-topics">${topicRows}</ol>` : ""}
        </div>
      </div>
      <div class="rsm-slide-story"><b>阅读说明</b>本目录对应当前汇报版本「${state.reportVersion}」，后续页面按同一逻辑展开。</div>
    </section>`;
}

function buildActionRecommendationSlide() {
  const row = targetRecord();
  if (!row) return "";
  const diagnosis = computeVqaDiagnosis(row, peerRecords());
  const explainers = topicExplainerRows(row, peerRecords(), diagnosis);
  const nowActions = [
    "确认核心指标口径，完成目标银行与对标组价值质量诊断。",
    `优先解释最弱维度：${diagnosis.labels[diagnosis.weakest]}。`,
    explainers[0]?.action || "先修资产负债底盘"
  ];
  const nearActions = [
    "落实资产负债管理、内部资金转移定价、存款结构和重点风险客群清单。",
    explainers[1]?.action || "拆分核心营收和真实核心非息",
    explainers[2]?.action || "前移风险分类和隐性不良复核"
  ];
  const midActions = [
    "推动中收产品、客户经营与渠道转化，建立轻资本收入追踪。",
    "用风险调整回报、资本余量和市净率验证经营质量改善是否形成资本市场可接受叙事。",
    explainers[3]?.action || "约束风险加权资产消耗"
  ];
  const cards = [
    ["现在（0-3 月）", nowActions, "blue"],
    ["近期（3-6 月）", nearActions, "green"],
    ["中期（6-12 月）", midActions, "gold"]
  ].map(([title, items, tone]) => `
    <div class="print-action-card tone-${tone}">
      <b>${title}</b>
      <ul>${items.map((item) => `<li>${item}</li>`).join("")}</ul>
    </div>
  `).join("");
  return rsmContentSlide(
    "action-slide",
    "行动建议页",
    "09",
    `${displayBankName(row.bank)}修复动作应按时间窗口和指标责任拆分`,
    "把 VQA 诊断和五类专题判断转成董事会可批准、管理层可承接的行动顺序。",
    `<div class="print-action-grid">${cards}</div>`,
    reportStoryNote("行动页使用方式", ["0-3 个月锁定口径和短板", "3-6 个月拆到部门动作", "6-12 个月用指标验证改善是否成立"])
  );
}

function buildDataAppendixSlide() {
  const row = targetRecord();
  const coreKeys = ["roa", "coreRevenueGrowth", "nim", "feeAssetRatio", "npl", "hiddenNplExposure", "provisionCoverage", "cet1Buffer", "rwaDensity", "pb"];
  const selectedRows = selectedBankRecords();
  const rows = coreKeys.map((key) => {
    const entry = metricDictionaryEntry(key);
    const selectedRate = completeness(selectedRows, key);
    return `
      <tr>
        <td>${fieldName(key)}</td>
        <td>${entry?.source_field || "待补字典"}</td>
        <td>${entry?.formula || "源字段直取/派生计算"}</td>
        <td>${selectedRate == null ? "暂无" : `${(selectedRate * 100).toFixed(1)}%`}</td>
        <td>${metricCoverageLines(key).slice(0, 2).join("；")}</td>
      </tr>
    `;
  }).join("");
  const body = `
    <table class="print-appendix-table">
      <thead><tr><th>指标</th><th>来源字段</th><th>计算公式</th><th>选定样本完整性</th><th>覆盖情况</th></tr></thead>
      <tbody>${rows}</tbody>
    </table>`;
  return rsmContentSlide(
    "appendix-slide",
    "数据附录页",
    "10",
    "数据附录应先说明样本边界，再支撑主报告结论",
    "本页用于财务、战略和董办共同复核；完整口径详见指标底稿。",
    body,
    reportStoryNote("复核提示", ["完整性不足的指标不进入强结论", "敏感结论需要回到数据来源复核", "完整数据请查看指标底稿"])
  );
}

function buildActiveTopicSlide() {
  const row = targetRecord();
  if (!row) return "";
  const topic = topicDefinitions().find((item) => item.id === state.activeTopic) || topicDefinitions()[0];
  const facts = topicFactPackRows(topic.id);
  const draft = topicAiDraft(topic, facts);
  const judgement = topicJudgement(topic.id, facts);
  const metrics = facts.slice(0, 4).map((fact) => `<div class="print-metric"><b>${fact.指标名称}</b><span>${fact.目标值}</span></div>`).join("");
  const comments = [
    ["专题判断", `${judgement.signal}。${judgement.headline}`],
    ["关键证据", judgement.evidence.slice(0, 3).map((f) => `${f.指标名称}${f.目标值}，${f.分位}`).join("；")],
    ["管理含义", draft.action]
  ];
  const body = `<div class="print-dashboard"><div class="print-metric-grid">${metrics}</div><div class="print-comment-grid">${reportCommentCards(comments, 3)}</div></div>`;
  return rsmContentSlide(
    "active-topic-slide",
    "专题判断",
    "07",
    `${topic.title}需要形成可复核的事实证据链`,
    reportShortText(topic.question, 86),
    body,
    reportStoryNote("专题页原则", ["本页只放 4 个核心指标和 3 条管理判断", "正式报告优先保留证据链和行动含义", "后续动作需绑定指标和责任边界"])
  );
}

function buildStorylineSlide() {
  const row = targetRecord();
  const story = consultingStoryline(row);
  return rsmSectionSlide(
    "汇报主线",
    "06",
    "本轮汇报按压力、质量、风险、资本逐层论证",
    `${displayBankName(row?.bank || state.target)}｜${state.year} 年｜${displayBankList(state.peers)}`,
    story.client_answer,
    reportShortText(story.deck_answer, 170),
    reportStoryNote("标题连读逻辑", story.chapters.slice(0, 3).map((chapter) => chapter.answer))
  );
}

function buildVqaSlide(factPack, row) {
  if (!factPack || !row) return "";
  const factItems = factPack.factRows.slice(0, 3).map((item) => item.事实);
  return rsmSectionSlide(
    "VQA 价值质量诊断",
    "05",
    `${displayBankName(row.bank || state.target)}VQA 评分指向可优先解释的质量差异`,
    factPack.diagnosis.signal,
    `VQA 诊断指向 ${factPack.diagnosis.signal}`,
    reportShortText(factPack.boardRows.map((item) => `${item.步骤}：${item.内容}`).join("。"), 180),
    reportStoryNote("关键事实", factItems)
  );
}

function buildChartTransitionSlide(kicker, row, peerText) {
  const chapter = consultingChapterFor(kicker);
  const facilitation = typeof boardroomDiscussionQuestions === "function"
    ? boardroomDiscussionQuestions(row, peerRecords()).slice(0, 2).map((item) => item.question)
    : [];
  return rsmSectionSlide(
    kicker,
    "08",
    `${chapter.short}章节先回答管理问题，再进入图表证明`,
    `${displayBankName(row?.bank || state.target)}｜${state.year} 年｜${peerText}`,
    chapter.answer,
    reportShortText(`${chapter.question} ${chapter.bridge}`, 170),
    reportStoryNote("讨论引导", [chapter.proof, ...facilitation])
  );
}

function chartClaimTitle(title = "", kicker = "") {
  const target = displayBankName(targetRecord()?.bank || state.target);
  const text = `${title} ${kicker}`;
  const row = targetRecord();
  const claim = (key, label, theme) => {
    const peer = avg(peerRecords(), key);
    if (row?.[key] == null || peer == null) return `${target}${theme}`;
    const gap = row[key] - peer;
    const direction = (typeof metricDirection === "function" ? metricDirection(key) : true) ? gap >= 0 : gap <= 0;
    return `${target}${label}${direction ? "相对对标形成支撑" : "相对对标形成约束"}，差距${metricDisplayValue(key, Math.abs(gap))}`;
  };
  if (/息差|净息|负债|存款|利差|收益成色|票面/.test(text)) {
    return claim("nim", "净息差", "息差判断需要同时验证资产收益和负债成本");
  }
  if (/盈利|核心|非核心|手续费|轻资本|收入|ROA|总资产收益率|现金利润/.test(text)) {
    return claim("roa", "ROA", "盈利质量需回到核心营收、轻资本收入和拨备前修复");
  }
  if (/风险|不良|偏离|拨备|逾期|关注|零售|利润质量/.test(text)) {
    return claim("npl", "不良率", "风险确认节奏决定利润质量能否被持续验证");
  }
  if (/资本|RWA|市净率|PB|成本|估值|投资资产/.test(text)) {
    return claim("pb", "市净率", "资本市场定价需要由经营质量和资本消耗共同解释");
  }
  if (/LPR|经营压力|资产收益率|压力/.test(text)) {
    return `${target}经营压力应从资产收益率和收入结构同步拆解`;
  }
  return `${target}本页结论需要回到选定样本和类型均值验证`;
}

function chartChapterPlan(kicker) {
  const chapter = consultingChapterFor(kicker);
  return {
    title: chapter.answer || `${kicker}：从事实差异到管理问题`,
    story: `${chapter.question} ${chapter.bridge}`,
    route: [chapter.question, chapter.proof, "形成管理含义"],
    note: chapter.bridge || "本章先用章节页说明问题，再逐页用图表验证判断，最后回到行动建议。"
  };
}

function chartSequenceNarrative(slides, index, kicker) {
  const current = slides[index] || {};
  const previous = slides[index - 1];
  const next = slides[index + 1];
  const clean = (title) => cleanChartName(title || "");
  const plan = chartChapterPlan(kicker);
  const previousText = previous
    ? `上页已经用「${clean(previous.title)}」确认前一个问题，本页继续追问差异背后的形成机制。`
    : `本页是${kicker}的第一张图，先建立本章判断的起点。`;
  const currentText = `用「${clean(current.title)}」回答：${String(chartQuestion(current.title)).replace(/[。；;]+$/g, "")}。`;
  const nextText = next
    ? `下一页将进入「${clean(next.title)}」，把本页发现继续拆到${next.title.includes("风险") ? "风险确认" : next.title.includes("息差") ? "息差与负债" : next.title.includes("资本") || next.title.includes("市净率") ? "资本估值" : "更细的经营因子"}。`
    : `本页收束${kicker}的图表验证，后续将回到下一章节或行动建议。`;
  return { previousText, currentText, nextText, route: plan.route };
}

function buildChartChapterAgendaSlide(kicker, chapterSlides, row, peerText, chapterIndex) {
  const plan = chartChapterPlan(kicker);
  const items = chapterSlides.slice(0, 6).map((slide, idx) => `
    <div class="chapter-route-card">
      <b>${String(idx + 1).padStart(2, "0")}</b>
      <span>${cleanChartName(slide.title)}</span>
      <p>${shortText(chartQuestion(slide.title), 70)}</p>
    </div>
  `).join("");
  const route = plan.route.map((item, idx) => `<span>${idx + 1}. ${item}</span>`).join("");
  return `
    <section class="print-slide chapter-agenda-slide" data-deck-type="chapter-agenda">
      ${rsmModuleBar(kicker, `8-${String(chapterIndex + 1).padStart(2, "0")}`)}
      ${rsmSlideHead(reportTitleSentence(plan.title), `${displayBankName(row?.bank || state.target)}｜${state.year} 年｜${peerText}`)}
      <div class="rsm-slide-body">
        <div class="chapter-agenda-layout">
          <div class="chapter-agenda-story">
            <b>本章故事线</b>
            <p>${reportShortText(plan.story, 128)}</p>
            <div class="chapter-agenda-route">${route}</div>
          </div>
          <div class="chapter-route-grid">${items}</div>
        </div>
      </div>
      <div class="rsm-slide-story">${reportStoryNote("图表阅读顺序", ["问题起点", "差异拆解", "管理含义"])}</div>
    </section>`;
}

function buildChartChapterSummarySlide(kicker, chapterSlides, row, peerText, chapterIndex) {
  const plan = chartChapterPlan(kicker);
  const target = displayBankName(row?.bank || state.target);
  const focusTitles = chapterSlides.slice(0, 3).map((slide) => cleanChartName(slide.title));
  const proofRows = focusTitles.map((title, index) => `
    <div class="chapter-synthesis-card">
      <span>${String(index + 1).padStart(2, "0")}</span>
      <b>${title}</b>
      <p>${clientFacingText(chartQuestion(title), 72)}</p>
    </div>
  `).join("");
  const implication = clientFacingText(plan.note || "本章结论将进入后续行动建议。", 86);
  return `
    <section class="print-slide chapter-synthesis-slide" data-deck-type="content">
      ${rsmModuleBar(kicker, `8-${String(chapterIndex + 1).padStart(2, "0")}-S`)}
      ${rsmSlideHead(reportTitleSentence(`${kicker}小结应回到${target}的管理动作`, 42), `${target}｜${state.year} 年｜${peerText}`)}
      <div class="rsm-slide-body">
        <div class="chapter-synthesis-layout">
          <div class="chapter-synthesis-answer">
            <span>本章答案</span>
            <h3>${reportTitleSentence(plan.title, 38)}</h3>
            <p>${clientFacingText(plan.story, 130)}</p>
          </div>
          <div class="chapter-synthesis-grid">${proofRows}</div>
        </div>
      </div>
      <div class="rsm-slide-story"><b>对管理层的含义</b>${implication}</div>
    </section>`;
}

function buildChartSlide(slide, kicker, chartIndex, chapterSlides = [], chapterSlideIndex = 0) {
  const seq = chartSequenceNarrative(chapterSlides, chapterSlideIndex, kicker);
  const chartName = cleanChartName(slide.title);
  const chartSubtitle = `${chartName}｜${reportShortText(chartQuestion(slide.title), 64)}`;
  const body = `
    <div class="print-chart-page">
      <div class="print-chart">${slide.chartHtml}</div>
      <div class="print-chart-insights">
        <div class="print-chart-bridge"><b>本页证明对象</b><span>${seq.currentText}</span></div>
        <div class="print-story">${slide.storyHtml}</div>
        <div class="print-page-note">数据来源：iFinD · 上市公司年报 · RSM 整理；本页仅展示目标银行、对标银行及类型均值，完整指标口径见数据附录。</div>
      </div>
    </div>`;
  return `
    <section class="print-slide chart-slide" data-deck-type="chart" data-chart-index="${chartIndex}">
      ${rsmModuleBar(kicker, `8-${String(chartIndex + 1).padStart(2, "0")}`)}
      ${rsmSlideHead(chartClaimTitle(slide.title, kicker), chartSubtitle)}
      <div class="rsm-slide-body">${body}</div>
    </section>`;
}

function groupedChartSlides(slides) {
  const order = [
    "一、经营压力传导",
    "二、盈利结构与轻资本能力",
    "三、息差防守与负债底盘",
    "四、风险确认与拨备缓冲",
    "五、资本纪律与估值验证"
  ];
  const map = new Map(order.map((kicker) => [kicker, { kicker, slides: [] }]));
  const extra = [];
  slides.forEach((slide, idx) => {
    const kicker = slideKicker(slide.title, idx);
    let group = map.get(kicker);
    if (!group) {
      group = { kicker, slides: [] };
      map.set(kicker, group);
      extra.push(kicker);
    }
    group.slides.push(slide);
  });
  return [...order, ...extra].map((kicker) => map.get(kicker)).filter((group) => group?.slides.length);
}

function rsm2Value(key, row = targetRecord()) {
  if (!row || row[key] == null || Number.isNaN(Number(row[key]))) return "待补";
  if (typeof metricDisplayValue === "function") return metricDisplayValue(key, row[key]);
  return fmt(row[key], 2);
}

function rsm2PeerValue(key) {
  const value = avg(peerRecords(), key);
  if (value == null || Number.isNaN(Number(value))) return "待补";
  if (typeof metricDisplayValue === "function") return metricDisplayValue(key, value);
  return fmt(value, 2);
}

function rsm2MetricCard(label, value, note = "") {
  return `
    <div class="rsm2-metric-card">
      <span>${label}</span>
      <b>${value}</b>
      <em>${reportShortText(note, 34)}</em>
    </div>`;
}

function rsm2EvidenceTable(rows = []) {
  return `
    <table class="rsm2-evidence-table">
      <thead><tr><th>证据项</th><th>目标银行</th><th>参照口径</th><th>解读</th></tr></thead>
      <tbody>
        ${rows.map((row) => `
          <tr>
            <td>${row.label}</td>
            <td>${row.target}</td>
            <td>${row.peer}</td>
            <td>${reportShortText(row.readout, 54)}</td>
          </tr>
        `).join("")}
      </tbody>
    </table>`;
}

function rsm2DecisionPanel(question, finding, action, boundary = "结论强度以当前目标银行、对标组、类型均值和已覆盖指标为边界。") {
  return `
    <aside class="rsm2-decision-panel">
      <div><span>客户问题</span><p>${reportShortText(question, 70)}</p></div>
      <div><span>本页判断</span><p>${reportShortText(finding, 82)}</p></div>
      <div><span>建议动作</span><p>${reportShortText(action, 82)}</p></div>
      <div><span>口径边界</span><p>${reportShortText(boundary, 72)}</p></div>
    </aside>`;
}

function rsm2Page(className, moduleLabel, moduleNum, title, subtitle, mainHtml, sideHtml = "", storyItems = []) {
  const storyHtml = storyItems.length ? reportStoryNote("页内证据链", storyItems) : "";
  return rsmContentSlide(
    `rsm2-page ${className}`,
    moduleLabel,
    moduleNum,
    title,
    subtitle,
    `<div class="rsm2-layout ${sideHtml ? "" : "is-wide"}"><main>${mainHtml}</main>${sideHtml}</div>`,
    storyHtml
  );
}

function rsm2AgendaSlide() {
  const story = consultingStoryline();
  const rows = [
    ["01", "先定总答案", "执行摘要直接回答价值质量差异来自哪里，并说明判断强度。"],
    ["02", "再定证据边界", "用样本、指标覆盖和 VQA 方法说明哪些结论可进入董事会讨论。"],
    ["03", "展开四类议题", "按盈利质量、息差负债、风险确认、资本估值拆解形成机制。"],
    ["04", "落到行动路径", "把分析转成 0-3、3-6、6-12 个月管理动作和复核口径。"]
  ].map(([num, title, desc]) => `
    <div class="rsm2-agenda-row">
      <b>${num}</b>
      <span>${title}</span>
      <p>${desc}</p>
    </div>`).join("");
  const main = `<div class="rsm2-agenda">${rows}</div>`;
  const side = rsm2DecisionPanel(
    story.client_question,
    story.client_answer,
    "按总答案、证据边界、专题拆解和行动路径顺序审阅；每页只回答一个管理问题。"
  );
  return rsm2Page(
    "rsm2-agenda-slide",
    "报告阅读路径",
    "01",
    "本报告先回答价值质量差异，再拆解可执行修复顺序",
    `${state.year} 年｜${displayBankList(state.peers)}｜${state.types.join("、") || "所选类型银行"}`,
    main,
    side,
    ["目录不是功能清单，而是董事会阅读路径。", "每个章节均回链到总答案和行动优先级。"]
  );
}

function rsm2ExecutiveSlide() {
  const row = targetRecord();
  if (!row) return "";
  const story = consultingStoryline(row);
  const diagnosis = computeVqaDiagnosis(row, peerRecords());
  const explainers = topicExplainerRows(row, peerRecords(), diagnosis);
  const target = displayBankName(row.bank || state.target);
  const metrics = [
    ["VQA 评分", story.score, diagnosis.signal],
    ["ROA", rsm2Value("roa", row), `对标均值 ${rsm2PeerValue("roa")}`],
    ["NIM", rsm2Value("nim", row), `对标均值 ${rsm2PeerValue("nim")}`],
    ["PB", rsm2Value("pb", row), `对标均值 ${rsm2PeerValue("pb")}`]
  ].map(([label, value, note]) => rsm2MetricCard(label, value, note)).join("");
  const takeaways = [
    [`${target}本轮判断不宜停留在“估值低”，而应解释经营质量如何传导到 PB。`, "把 PB 与 ROA、息差、风险确认和资本消耗放在同一证据链中。"],
    [`当前优先解释维度为${story.weakest}。`, `VQA 评分为 ${story.score}，应先拆解最弱维度的形成机制。`],
    ["行动重点应从低分位指标进入季度经营复盘。", explainers[0]?.action || "将资产收益、负债成本、核心营收和风险确认纳入同一复盘表。"]
  ].map(([claim, proof], index) => `
    <div class="rsm2-takeaway-card">
      <span>结论 ${String(index + 1).padStart(2, "0")}</span>
      <b>${reportTitleSentence(claim, 42)}</b>
      <p>${reportShortText(proof, 76)}</p>
    </div>`).join("");
  const main = `<div class="rsm2-metric-strip">${metrics}</div><div class="rsm2-takeaway-grid">${takeaways}</div>`;
  const side = rsm2DecisionPanel(
    story.client_question,
    story.client_answer,
    explainers[0]?.action || "优先完成低分位指标的归因，明确下一季度修复目标和责任边界。"
  );
  return rsm2Page(
    "rsm2-executive-slide",
    "执行摘要",
    "02",
    `${target}的价值质量差异应从经营质量证据链解释，而非单点估值判断`,
    "总答案页｜董事会先读结论、再看证据、最后定行动",
    main,
    side,
    ["核心数字用于定位，不替代结论。", "三条结论均回链到专题证据页和行动页。"]
  );
}

function rsm2ScopeMethodSlide() {
  const row = targetRecord();
  const selectedRows = selectedBankRecords();
  const includedTopics = topicDefinitions().filter((topic) => typeof isTopicIncluded === "function" ? isTopicIncluded(topic.id) : true);
  const coreKeys = ["roa", "coreRevenueGrowth", "nim", "npl", "provisionCoverage", "cet1Buffer", "pb"];
  const coverage = coreKeys.map((key) => completeness(selectedRows, key)).filter((value) => value != null);
  const avgCoverage = coverage.length ? coverage.reduce((sum, value) => sum + value, 0) / coverage.length : null;
  const facts = [
    ["目标银行", displayBankName(row?.bank || state.target)],
    ["对标银行", displayBankList(state.peers)],
    ["类型均值", state.types.join("、") || "所选类型银行"],
    ["分析年度", `${state.year} 年`],
    ["核心指标覆盖", avgCoverage == null ? "待补" : `${(avgCoverage * 100).toFixed(1)}%`],
    ["纳入专题", includedTopics.map((topic) => topic.title).join("、") || "全部专题"]
  ].map(([label, value]) => `
    <div class="rsm2-scope-card">
      <span>${label}</span>
      <b>${value}</b>
    </div>`).join("");
  const method = `
    <div class="rsm2-method-stack">
      <div><b>经营端</b><p>用回报、收入、息差、风险和资本效率解释价值质量。</p></div>
      <div><b>市场端</b><p>用 PB 与经营质量联读，区分价值错配和质量折价。</p></div>
      <div><b>判断强度</b><p>覆盖不足或口径未确认的结论降级为待验证事项。</p></div>
    </div>`;
  const main = `<div class="rsm2-scope-grid">${facts}</div>${method}`;
  const side = rsm2DecisionPanel(
    "本轮结论适用于什么样本和数据边界？",
    "当前模板以目标银行、所选对标组、类型均值和核心指标覆盖为判断边界。",
    "正式汇报前应锁定对标组、分析年度、指标口径和专题范围。"
  );
  return rsm2Page(
    "rsm2-scope-method-slide",
    "口径与方法",
    "03",
    "分析口径先锁定样本、指标和判断强度，避免结论越界",
    "Scope × Methodology｜本页作为报告结论的边界页",
    main,
    side,
    ["样本边界决定对标结论可用范围。", "指标覆盖决定页面判断强度。"]
  );
}

function rsm2StorylineMapSlide() {
  const story = consultingStoryline();
  const steps = [
    ["S", "情境", "PB 与经营质量出现差异，需要董事会判断是价值错配还是质量折价。"],
    ["C", "矛盾", "单看估值、利润或不良率都不足以解释资本市场定价。"],
    ["Q", "问题", story.client_question],
    ["A", "答案", story.client_answer]
  ].map(([tag, title, text]) => `
    <div class="rsm2-scqa-card">
      <b>${tag}</b>
      <span>${title}</span>
      <p>${reportShortText(text, 74)}</p>
    </div>`).join("");
  const chapters = story.chapters.slice(1).map((chapter, index) => `
    <div class="rsm2-chapter-line">
      <b>${String(index + 1).padStart(2, "0")}</b>
      <span>${chapter.short}</span>
      <p>${reportShortText(chapter.answer, 64)}</p>
    </div>`).join("");
  const main = `<div class="rsm2-scqa-grid">${steps}</div><div class="rsm2-chapter-map">${chapters}</div>`;
  const side = rsm2DecisionPanel(
    "后续页面如何证明总答案？",
    "报告按盈利质量、息差负债、风险确认、资本估值四类专题逐层验证。",
    "每个专题页必须给出证据表、判断和管理动作，最后进入行动路线图。"
  );
  return rsm2Page(
    "rsm2-storyline-map-slide",
    "论证结构",
    "04",
    "报告主线由 SCQA 定义，后续专题页只证明一个判断",
    "Storyline Map｜标题连读应能形成完整会议纪要",
    main,
    side,
    ["SCQA 用于建立董事会问题张力。", "专题页用于证明总答案的不同侧面。"]
  );
}

function rsm2PeerGroupProfileSlide() {
  const row = targetRecord();
  if (!row) return "";
  const rows = typeof peerProfileRows === "function" ? peerProfileRows() : [row, ...peerRecords()].map((item) => ({
    bank: item.bank,
    type: item.type,
    region: item.region,
    assets: item.assets,
    roe: item.roe,
    nim: item.nim,
    npl: item.npl
  }));
  const cards = rows.slice(0, 9).map((item, index) => `
    <div class="rsm2-peer-card ${index === 0 ? "is-target" : ""}">
      <span>${index === 0 ? "目标银行" : "对标银行"}</span>
      <b>${displayBankName(item.bank)}</b>
      <p>${item.type || "未分类"}｜${item.region || "未标注"}</p>
      <div class="rsm2-peer-tags">${typeof peerReasonTags === "function" ? peerReasonTags(item, row).map((tag) => `<i>${tag}</i>`).join("") : "<i>参照样本</i>"}</div>
      <em>总资产 ${metricDisplayValue("assets", item.assets)}</em>
      <em>ROE ${metricDisplayValue("roe", item.roe)}｜NIM ${metricDisplayValue("nim", item.nim)}｜不良 ${metricDisplayValue("npl", item.npl)}</em>
    </div>`).join("");
  const dispersion = typeof peerGroupDispersion === "function" ? peerGroupDispersion() : null;
  const dispersionText = dispersion == null ? "当前样本规模离散度待计算。" : dispersion > .6 ? `当前对标组资产规模离散度 ${(dispersion * 100).toFixed(0)}%，部分规模敏感指标需保留样本边界说明。` : `当前对标组资产规模离散度 ${(dispersion * 100).toFixed(0)}%，整体可作为经营位置参照。`;
  const main = `<div class="rsm2-peer-grid">${cards}</div><div class="rsm2-peer-footnote">${dispersionText}</div>`;
  const side = rsm2DecisionPanel(
    "本次报告为什么选这些银行作为参照？",
    "对标组用于限定结论边界；同业位置、均值、中位数和低分位判断均基于当前样本形成。",
    "正式汇报前建议确认对标组是否覆盖同类型、同区域、同规模和资本市场可比银行。"
  );
  return rsm2Page(
    "rsm2-peer-profile-slide",
    "对标组画像",
    "04A",
    `${displayBankName(row.bank)}的同业位置应先由对标组边界决定`,
    `${state.year} 年｜目标银行 + ${state.peers.length} 家对标银行｜本页进入标准对标报告 P3`,
    main,
    side,
    ["对标组不是背景信息，而是所有比较结论的边界。", "画像卡帮助董事会先确认样本是否合理。"]
  );
}

function rsm2PresidentOnePageSlide() {
  const row = targetRecord();
  if (!row) return "";
  const summary = typeof presidentSummaryItems === "function" ? presidentSummaryItems() : null;
  const scores = summary?.scores || [];
  const traffic = scores.map((item) => {
    const signal = typeof sparcSignalLevel === "function" ? sparcSignalLevel(item.score) : { level: "neutral", lamp: "待补", label: "待补" };
    return `
      <div class="rsm2-traffic-card ${signal.level}">
        <span>${item.code}</span>
        <b>${item.label}</b>
        <em>${signal.lamp}</em>
        <p>${signal.label}</p>
      </div>`;
  }).join("");
  const findings = (summary?.findings || ["待生成。"]).slice(0, 3).map((item, index) => `
    <li><b>${String(index + 1).padStart(2, "0")}</b><span>${reportShortText(item, 68)}</span></li>
  `).join("");
  const watch = (summary?.watch || benchmarkWatchlistItems()).slice(0, 5).map((item) => `
    <div class="rsm2-watch-pill ${item.level || "yellow"}">${reportShortText(item.title, 26)}</div>
  `).join("");
  const main = `
    <div class="rsm2-president-layout">
      <div class="rsm2-traffic-grid">${traffic}</div>
      <div class="rsm2-president-bottom">
        <ol class="rsm2-president-findings">${findings}</ol>
        <div class="rsm2-president-watch">${watch || "<div class=\"rsm2-watch-pill\">暂无重点提示</div>"}</div>
      </div>
    </div>`;
  const side = rsm2DecisionPanel(
    "行长先看什么？",
    "先看 SPARC 五维红黄绿位置，再看三条关键发现和本期需关注指标。",
    "本页可单独用于会前阅读；完整报告继续展开 VQA 诊断、专题归因和口径复核。"
  );
  return rsm2Page(
    "rsm2-president-slide",
    "行长一页摘要",
    "02A",
    `${displayBankName(row.bank)}一页摘要先给同业位置，再给关注事项`,
    "交通灯矩阵 + 三条关键发现 + 本期需关注指标",
    main,
    side,
    ["本页服务 30 秒阅读。", "强结论必须回到后续专题和数据附录复核。"]
  );
}

function rsm2SparcOverviewSlide() {
  const row = targetRecord();
  if (!row) return "";
  const scores = typeof sparcDimensionScores === "function" ? sparcDimensionScores(row) : [];
  const overall = typeof sparcOverallScore === "function" ? sparcOverallScore(scores) : null;
  const cards = scores.map((item) => `
    <div class="rsm2-sparc-card ${typeof sparcSignalLevel === "function" ? sparcSignalLevel(item.score).level : ""}">
      <span>${item.code}</span>
      <b>${item.label}</b>
      <em>${item.score == null ? "--" : item.score.toFixed(0)}｜${typeof sparcSignalLevel === "function" ? sparcSignalLevel(item.score).lamp : ""}</em>
      <p>${item.weakestMetric ? `${item.weakestMetric.label}为本维度优先复核指标。` : item.question}</p>
    </div>`).join("");
  const weak = scores.filter((item) => item.score != null).sort((a, b) => a.score - b.score)[0];
  const main = `
    <div class="rsm2-sparc-summary">
      <div><span>SPARC 综合评分</span><b>${overall == null ? "待补" : overall.toFixed(0)}</b><p>${typeof sparcScoreLabel === "function" ? sparcScoreLabel(overall) : "五维综合位置"}</p></div>
      <div><span>优先复核维度</span><b>${weak?.label || "待补"}</b><p>${weak?.weakestMetric ? weak.weakestMetric.label : "指标覆盖不足时降低结论强度"}</p></div>
    </div>
    <div class="rsm2-sparc-grid">${cards}</div>`;
  const side = rsm2DecisionPanel(
    "五维体检告诉董事会什么？",
    `${displayBankName(row.bank)}不应只看单一 VQA 分数，而应拆为规模结构、盈利能力、资产质量、风险资本和能力效率五个维度。`,
    weak ? `建议先围绕${weak.label}形成专题归因，并在后续页绑定可复核指标。` : "建议先补足核心指标覆盖，再形成强结论。"
  );
  return rsm2Page(
    "rsm2-sparc-overview-slide",
    "SPARC 总览",
    "04B",
    `${displayBankName(row.bank)}五维同业位置先定位强弱项，再进入专题归因`,
    "Scale / Profitability / Asset Quality / Risk & Capital / Capability",
    main,
    side,
    ["SPARC 用于承接 PRD 中的标准对标框架。", "VQA 负责价值质量判断，SPARC 负责客户可理解的五维体检。"]
  );
}

function rsm2TopicConfig(topicKey) {
  const row = targetRecord();
  const diagnosis = row ? computeVqaDiagnosis(row, peerRecords()) : null;
  const explainers = row && diagnosis ? topicExplainerRows(row, peerRecords(), diagnosis) : [];
  const byNeedle = (needle) => explainers.find((item) => item.topic.includes(needle)) || {};
  const configs = {
    profit: {
      module: "盈利质量",
      num: "05",
      title: "盈利质量判断应回到核心营收和轻资本收入，而不是只看利润增速",
      question: "利润表现是否来自可持续主业修复？",
      finding: byNeedle("盈利").logic || "盈利质量需要由核心营收、手续费资产比和拨备前利润共同验证。",
      action: byNeedle("盈利").action || "拆分核心营收、真实核心非息和拨备前利润，设置季度修复跟踪表。",
      keys: [["coreRevenueGrowth", "核心营收增速"], ["feeAssetRatio", "手续费资产比"], ["ppopGrowth", "拨备前利润增速"], ["roa", "ROA"]]
    },
    nim: {
      module: "息差与负债",
      num: "06",
      title: "息差防守要同时验证资产收益下行和负债成本对冲能力",
      question: "负债端降本能否对冲资产端让价？",
      finding: byNeedle("息差").logic || "净息差需要与生息资产收益率、计息负债成本和存款结构联读。",
      action: byNeedle("息差").action || "将资产收益、负债成本和重点存款结构纳入 ALM 月度复盘。",
      keys: [["nim", "净息差"], ["earningAssetYield", "生息资产收益率"], ["interestLiabilityCost", "计息负债成本率"], ["nimGapBp", "NIM 缺口"]]
    },
    risk: {
      module: "风险确认",
      num: "07",
      title: "风险页应前移到逾期偏离和隐性暴露，避免只用不良率下结论",
      question: "利润质量是否建立在充分风险确认基础上？",
      finding: byNeedle("风险").logic || "风险确认需要同时观察不良、逾期偏离、隐性暴露和拨备覆盖。",
      action: byNeedle("风险").action || "建立逾期偏离、隐性不良和拨备覆盖的联动复核清单。",
      keys: [["npl", "不良率"], ["overdueNplDeviation", "逾期偏离"], ["hiddenNplExposure", "隐性暴露"], ["provisionCoverage", "拨备覆盖率"]]
    },
    capital: {
      module: "资本估值",
      num: "08",
      title: "PB 判断必须与回报、资本消耗和风险确认联读，才能区分价值错配和质量折价",
      question: "低 PB 是价值错配，还是经营质量折价？",
      finding: byNeedle("资本").logic || "资本市场定价需要由 ROA、资本余量、RWA 密度和风险确认共同解释。",
      action: byNeedle("资本").action || "用 ROA、资本余量、RWA 密度和 PB 建立季度价值质量复盘。",
      keys: [["pb", "PB"], ["roa", "ROA"], ["cet1Buffer", "核心一级资本缓冲"], ["rwaDensity", "RWA 密度"]]
    },
    valuation: {
      module: "估值验证",
      num: "08A",
      title: "估值验证不直接讨论单点折价，而是验证经营质量是否支撑价值错配判断",
      question: "PB 折价是价值错配，还是经营质量折价？",
      finding: byNeedle("估值").logic || "PB 需要与 ROA、核心营收、风险确认和资本余量联读。",
      action: byNeedle("估值").action || "将估值沟通从单一 PB 切换为经营质量证据链。",
      keys: [["pb", "PB"], ["pbMid", "年中 PB"], ["roa", "ROA"], ["coreRevenueGrowth", "核心营收增速"]]
    },
    capitalMarket: {
      module: "PB归因",
      num: "08B",
      title: "PB 归因要把市场折价拆到 ROE、风险、效率和资本四类可管理因子",
      question: "PB 折价来自市场认知滞后，还是经营质量因子本身偏弱？",
      finding: "资本市场专题不再停留在低 PB 描述，而是通过拟合 PB、实际 PB 和残差判断折价性质。",
      action: "围绕贡献最大的两项因子建立季度改善证据，并将风险确认、回报修复和资本纪律写入沟通材料。",
      keys: [["pb", "PB"], ["roe", "ROE"], ["npl", "不良率"], ["costIncomeRatio", "成本收入比"]]
    },
    retailRisk: {
      module: "零售风险",
      num: "09",
      title: "零售风险必须拆到住房、消费和经营贷，避免综合不良率掩盖产品迁徙",
      question: "零售风险压力集中在哪类产品，是否已经早于整体不良暴露？",
      finding: "零售风险专题通过产品占比、不良率、同比变化和同业均值识别风险前移位置。",
      action: "对高占比且高不良的产品建立客群、逾期、迁徙和贷后清收复盘，区分压降、定价和清收动作。",
      keys: [["personalLoanNpl", "个贷不良率"], ["housingLoanNpl", "住房贷款不良率"], ["consumerLoanNpl", "消费贷款不良率"], ["businessLoanNpl", "经营贷款不良率"]]
    },
    depositLoanDeepDive: {
      module: "存贷深钻",
      num: "10",
      title: "存贷深钻要把息差压力拆成资产收益、负债成本和存款期限结构",
      question: "息差压力的主因是资产端让价、负债端刚性，还是定期化拖累？",
      finding: "存贷专题通过活期/定期结构、生息资产收益率、计息负债成本率和真实存贷利差定位压力来源。",
      action: "把高成本定期存款压降、对公结算沉淀和贷款定价纪律纳入资产负债管理月度复盘。",
      keys: [["timeDepositShare", "定期存款占比"], ["demandDepositShare", "活期存款占比"], ["earningAssetYield", "生息资产收益率"], ["interestLiabilityCost", "计息负债成本率"]]
    }
  };
  return configs[topicKey];
}

function rsm2Tone(score) {
  if (score == null) return "neutral";
  if (score >= 70) return "green";
  if (score >= 45) return "amber";
  return "red";
}

function rsm2MetricRankText(key, row = targetRecord()) {
  if (!row) return "分位待补";
  return rankPercentile(row[key], currentRecords(), key, metricDirection(key));
}

function rsm2TopicFacts(topicKey) {
  const topic = topicDefinitions().find((item) => item.id === topicKey);
  if (!topic) return [];
  return topicFactPackRows(topic.id).filter((fact) => fact && fact.目标值 !== "暂无");
}

function rsm2SignalFromTopic(topicKey) {
  const topic = topicDefinitions().find((item) => item.id === topicKey);
  if (!topic) return null;
  return topicJudgement(topic.id, topicFactPackRows(topic.id));
}

function rsm2LensBlock(label, title, text, tone = "blue") {
  return `
    <div class="rsm2-lens-card tone-${tone}">
      <span>${label}</span>
      <b>${reportTitleSentence(title, 34)}</b>
      <p>${reportShortText(text, 92)}</p>
    </div>`;
}

function rsm2NorthStarSlide() {
  const row = targetRecord();
  if (!row) return "";
  const story = consultingStoryline(row);
  const diagnosis = computeVqaDiagnosis(row, peerRecords());
  const explainers = topicExplainerRows(row, peerRecords(), diagnosis);
  const tensions = [
    ["矛盾 01", "账面回报与主业修复不同步", explainers.find((item) => item.topic.includes("盈利"))?.logic || "回报水平需要由核心营收、轻资本收入和拨备前利润共同验证。", "blue"],
    ["矛盾 02", "息差压力与负债结构再定价错位", explainers.find((item) => item.topic.includes("息差"))?.logic || "净息差判断需要同时观察资产收益率、计息负债成本和存款结构。", "amber"],
    ["矛盾 03", "风险确认与资本市场定价相互验证", explainers.find((item) => item.topic.includes("资本"))?.logic || "市净率需要与回报、风险确认、资本消耗和轻资本能力联读。", "red"]
  ].map(([label, title, text, tone]) => rsm2LensBlock(label, title, text, tone)).join("");
  const main = `
    <div class="rsm2-northstar">
      <div class="rsm2-northstar-answer">
        <span>北极星结论</span>
        <h3>${reportTitleSentence(story.client_answer, 52)}</h3>
        <p>${reportShortText(story.deck_answer, 150)}</p>
      </div>
      <div class="rsm2-lens-grid">${tensions}</div>
    </div>`;
  const side = rsm2DecisionPanel(
    "董事会为什么需要继续读后续页面？",
    `VQA 总分 ${diagnosis.score}，最弱维度为${diagnosis.labels[diagnosis.weakest]}，单看利润或市净率都不足以解释价值质量。`,
    "后续页面按三类矛盾逐层验证，并在末尾转成 12 个月行动地图。"
  );
  return rsm2Page(
    "rsm2-northstar-slide",
    "核心转折结论",
    "03A",
    `${displayBankName(row.bank)}本轮报告的核心问题不是单项指标高低，而是质量差异能否被证据链解释`,
    "情境、复杂化、问题、答案（SCQA）转折页｜先给出需要被后续页面证明的核心判断",
    main,
    side,
    ["本页定义全篇张力。", "后续专题和图表只服务于证明或修正本页判断。"]
  );
}

function rsm2FrameworkVisualSlide() {
  const row = targetRecord();
  if (!row) return "";
  const mapping = sparcDimensions().map((item) => {
    const vqa = (item.vqaDimensions || []).map((key) => vqaEngine().dimensions?.[key]?.label || key).join(" / ") || "VQA 子维度";
    return `
      <div class="rsm2-framework-row">
        <b>${item.code}</b>
        <span>${item.label}</span>
        <p>${reportShortText(item.question, 42)}</p>
        <em>${vqa}</em>
      </div>`;
  }).join("");
  const main = `<div class="rsm2-framework-map">${mapping}</div>`;
  const side = rsm2DecisionPanel(
    "SPARC 与 VQA 如何共同使用？",
    "SPARC 用客户语言呈现五维体检，VQA 在后台负责价值质量评分、证据权重和行动优先级。",
    "报告正文使用 SPARC 组织阅读，附录保留 VQA 方法和指标口径。"
  );
  return rsm2Page(
    "rsm2-framework-slide",
    "方法论主图",
    "03B",
    "SPARC 负责客户可读的五维位置，VQA 负责价值质量证据链",
    `${displayBankName(row.bank)}｜配置化映射：维度、指标、权重和子维度均来自规则库`,
    main,
    side,
    ["方法论页必须说明前台语言和后台评分的关系。", "客户可读性和可审计性在同一页建立。"]
  );
}

function rsm2FrameworkApplicationSlide() {
  const row = targetRecord();
  if (!row) return "";
  const scores = sparcDimensionScores(row);
  const diagnosis = computeVqaDiagnosis(row, peerRecords());
  const rows = scores.map((item) => {
    const signal = sparcSignalLevel(item.score);
    return `
      <div class="rsm2-application-row tone-${signal.level}">
        <b>${item.code}</b>
        <span>${item.label}</span>
        <em>${item.score == null ? "待补" : item.score.toFixed(0)}｜${signal.lamp}</em>
        <p>${item.weakestMetric ? `${item.weakestMetric.label}为优先复核指标，当前值 ${metricDisplayValue(item.weakestMetric.key, item.weakestMetric.value)}。` : item.question}</p>
      </div>`;
  }).join("");
  const main = `<div class="rsm2-application-stack">${rows}</div>`;
  const side = rsm2DecisionPanel(
    "本方法在目标银行上读出了什么？",
    `${displayBankName(row.bank)}VQA 总分 ${diagnosis.score}，最强维度为${diagnosis.labels[diagnosis.strongest]}，最弱维度为${diagnosis.labels[diagnosis.weakest]}。`,
    `后续专题优先解释${diagnosis.labels[diagnosis.weakest]}及其传导到回报、风险和估值的路径。`
  );
  return rsm2Page(
    "rsm2-framework-application-slide",
    "方法论应用",
    "03C",
    `${displayBankName(row.bank)}的五维读数显示，报告应优先解释低分位维度的形成机制`,
    "Framework Application｜把方法论转成目标银行的第一页读数",
    main,
    side,
    ["每个维度必须落到可复核指标。", "分数只是入口，后续页面承担证明职责。"]
  );
}

function rsm2IndustryAnchorSlide() {
  const row = targetRecord();
  if (!row) return "";
  const typeRows = currentRecords().filter((item) => state.types.includes(item.type));
  const anchors = [
    ["总资产收益率（ROA）", rsm2Value("roa", row), metricDisplayValue("roa", avg(typeRows, "roa")), rsm2MetricRankText("roa", row)],
    ["净息差（NIM）", rsm2Value("nim", row), metricDisplayValue("nim", avg(typeRows, "nim")), rsm2MetricRankText("nim", row)],
    ["不良率", rsm2Value("npl", row), metricDisplayValue("npl", avg(typeRows, "npl")), rsm2MetricRankText("npl", row)],
    ["市净率（PB）", rsm2Value("pb", row), metricDisplayValue("pb", avg(typeRows, "pb")), rsm2MetricRankText("pb", row)]
  ].map(([label, target, typeAvg, rank]) => `
    <div class="rsm2-anchor-card">
      <span>${label}</span>
      <b>${target}</b>
      <em>类型均值 ${typeAvg}</em>
      <p>${rank}</p>
    </div>`).join("");
  const main = `<div class="rsm2-anchor-grid">${anchors}</div>`;
  const side = rsm2DecisionPanel(
    "行业坐标段回答什么？",
    "先判断目标银行偏离是否来自类型共性，再判断是否来自自身经营结构。",
    "若目标银行与类型均值方向一致，后续结论应保留行业边界；若偏离明显，进入专题归因。"
  );
  return rsm2Page(
    "rsm2-industry-anchor-slide",
    "行业坐标",
    "04C",
    `${displayBankName(row.bank)}的行业坐标应先用类型均值校准，再进入对标组比较`,
    `${state.year} 年截面｜${state.types.join("、") || "所选类型银行"}｜目标银行、对标组与类型均值三层参照`,
    main,
    side,
    ["行业坐标段防止把行业共同压力误判为个体问题。", "后续专题页只讨论经过类型均值校准后的关键偏离。"]
  );
}

function rsm2TopicSlide(topicKey) {
  const row = targetRecord();
  if (!row) return "";
  const config = rsm2TopicConfig(topicKey);
  const rows = config.keys.map(([key, label]) => ({
    label,
    target: rsm2Value(key, row),
    peer: rsm2PeerValue(key),
    readout: `${label}用于验证${config.module}判断，需与对标均值和趋势共同解释。`
  }));
  const metrics = config.keys.map(([key, label]) => rsm2MetricCard(label, rsm2Value(key, row), `对标均值 ${rsm2PeerValue(key)}`)).join("");
  const main = `<div class="rsm2-metric-strip">${metrics}</div>${rsm2EvidenceTable(rows)}`;
  const side = rsm2DecisionPanel(config.question, config.finding, config.action);
  return rsm2Page(
    `rsm2-topic-slide rsm2-topic-${topicKey}`,
    config.module,
    config.num,
    config.title,
    `${displayBankName(row.bank || state.target)}｜${state.year} 年｜目标银行 vs 对标组均值`,
    main,
    side,
    ["本页一个专题只证明一个管理判断。", "证据表保留目标值、参照值和解释口径。"]
  );
}

function rsm2TopicDiagnosticSlide(topicKey, index) {
  const row = targetRecord();
  if (!row) return "";
  const config = rsm2TopicConfig(topicKey);
  const judgement = rsm2SignalFromTopic(topicKey);
  const facts = rsm2TopicFacts(topicKey);
  const primaryMetric = facts[0]?.指标代码 || config.keys?.[0]?.[0] || "roa";
  const confidence = typeof confidenceLevel === "function" ? confidenceLevel(primaryMetric, row, peerRecords()) : { level: "中", prefix: "现有数据倾向于显示", suffix: "建议保留口径提示。" };
  const attribution = typeof gapAttributionEngine === "function" ? gapAttributionEngine(primaryMetric, row, peerRecords()) : null;
  const temporal = typeof buildTemporalNarrative === "function" ? buildTemporalNarrative(primaryMetric, row.bank) : "";
  const mechanism = typeof buildMechanismExplanation === "function" ? buildMechanismExplanation(topicKey) : config.finding;
  const evidence = (judgement?.evidence || facts).slice(0, 4).map((fact) => `
    <div class="rsm2-diagnostic-evidence">
      <span>${fact.指标名称}</span>
      <b>${fact.目标值}</b>
      <p>${fact.分位}｜对标均值 ${fact.对标均值}｜一年变化 ${fact.一年变化}</p>
    </div>`).join("");
  const main = `
    <div class="rsm2-topic-diagnostic">
      <div class="rsm2-topic-verdict">
        <span>专题判断｜置信度 ${confidence.level}</span>
        <h3>${reportTitleSentence(judgement?.headline || config.finding, 52)}</h3>
        <div class="rsm2-ceam-block">
          <p><b>C 断言</b>${confidence.prefix}，${reportShortText(judgement?.headline || config.finding, 96)} ${confidence.suffix}</p>
          <p><b>E 证据</b>${reportShortText(facts.slice(0, 3).map((fact) => `${fact.指标名称}${fact.目标值}、对标${fact.对标均值}`).join("；") || "因数据覆盖不足，暂不形成该层判断。", 150)}</p>
          <p><b>A 归因</b>${reportShortText(attribution?.headline || mechanism, 150)}</p>
          <p><b>M 含义</b>${reportShortText(`${config.action} ${temporal}`, 150)}</p>
        </div>
      </div>
      <div class="rsm2-diagnostic-grid">${evidence}</div>
    </div>`;
  const side = rsm2DecisionPanel(
    config.question,
    judgement?.signal || config.finding,
    config.action,
    "本页只使用事实包中可用指标；口径风险为 L3/L4 的指标不进入强判断。"
  );
  return rsm2Page(
    `rsm2-topic-diagnostic-slide rsm2-topic-${topicKey}`,
    config.module,
    `${config.num}-${index + 1}`,
    `${config.module}先给判断强度，再列出进入主报告的证据指标`,
    `${displayBankName(row.bank)}｜专题诊断页｜${config.question}`,
    main,
    side,
    ["专题诊断页回答是否值得董事会讨论。", "证据必须同时显示目标值、对标均值、分位和变化。"]
  );
}

function rsm2TopicMechanismSlide(topicKey, index) {
  const row = targetRecord();
  if (!row) return "";
  const config = rsm2TopicConfig(topicKey);
  const topic = topicDefinitions().find((item) => item.id === topicKey);
  const facts = rsm2TopicFacts(topicKey).slice(0, 5);
  const primaryMetric = facts[0]?.指标代码 || config.keys?.[0]?.[0] || "roa";
  const attribution = typeof gapAttributionEngine === "function" ? gapAttributionEngine(primaryMetric, row, peerRecords()) : null;
  const drillRows = typeof drillDownRows === "function" ? drillDownRows(topicKey, row).slice(0, 4) : [];
  const rows = facts.map((fact) => ({
    label: fact.指标名称,
    target: fact.目标值,
    peer: fact.对标均值,
    readout: `${fact.分位}；类型均值 ${fact.类型均值}；该指标用于验证${config.module}的结论强度。`
  }));
  const drill = drillRows.map((item) => `
    <div class="rsm2-drill-row">
      <b>${item.label}</b>
      <span>目标 ${item.target}</span>
      <em>对标 ${item.peer}</em>
      <p>${item.finding}</p>
    </div>`).join("");
  const main = `
    <div class="rsm2-mechanism-copy">
      <b>形成机制</b>
      <p>${reportShortText(typeof buildMechanismExplanation === "function" ? buildMechanismExplanation(topicKey) : topic?.mechanism || config.finding, 170)}</p>
    </div>
    <div class="rsm2-drill-stack">${drill}</div>
    ${rsm2EvidenceTable(rows)}`;
  const side = rsm2DecisionPanel(
    "差异是如何形成的？",
    attribution?.headline || topic?.mechanism || config.finding,
    config.action
  );
  return rsm2Page(
    `rsm2-topic-mechanism-slide rsm2-topic-${topicKey}`,
    config.module,
    `${config.num}-${index + 2}`,
    `${config.module}需要从单点指标转为形成机制解释`,
    `${displayBankName(row.bank)}｜经营视角 + 对标视角的同向验证`,
    main,
    side,
    ["机制页用于回答为什么。", "表格保留目标值、参照值和解释口径。"]
  );
}

function rsm2TopicActionSlide(topicKey, index) {
  const row = targetRecord();
  if (!row) return "";
  const config = rsm2TopicConfig(topicKey);
  const topic = topicDefinitions().find((item) => item.id === topicKey);
  const actions = (topic?.actions || [config.action]).slice(0, 3).map((item, i) => `
    <div class="rsm2-action-step">
      <b>${String(i + 1).padStart(2, "0")}</b>
      <span>${reportTitleSentence(item, 38)}</span>
      <p>${reportShortText(item, 90)}</p>
    </div>`).join("");
  const facts = rsm2TopicFacts(topicKey).slice(0, 3).map((fact) => rsm2MetricCard(fact.指标名称, fact.目标值, `${fact.分位}｜对标 ${fact.对标均值}`)).join("");
  const main = `<div class="rsm2-metric-strip">${facts}</div><div class="rsm2-action-step-grid">${actions}</div>`;
  const side = rsm2DecisionPanel(
    "管理层应承接什么？",
    config.finding,
    config.action,
    "每项动作需要在下一季度复盘时回到指标变化和数据口径。"
  );
  return rsm2Page(
    `rsm2-topic-action-slide rsm2-topic-${topicKey}`,
    config.module,
    `${config.num}-${index + 3}`,
    `${config.module}应从指标差距转成可复盘的管理动作`,
    `${displayBankName(row.bank)}｜行动承接页｜指标、动作和复核周期绑定`,
    main,
    side,
    ["行动页不使用泛化口号。", "每项动作必须可被指标验证。"]
  );
}

function rsm2KeyFigureSlide() {
  const row = targetRecord();
  if (!row) return "";
  const story = consultingStoryline(row);
  const figures = [
    ["ROA", "roa", "回报底盘"],
    ["NIM", "nim", "息差防守"],
    ["不良率", "npl", "风险结果"],
    ["核心一级资本余量", "cet1Buffer", "资本安全垫"]
  ].map(([label, key, note]) => `
    <div class="rsm2-key-figure-card">
      <span>${label}</span>
      <b>${rsm2Value(key, row)}</b>
      <em>对标均值 ${rsm2PeerValue(key)}</em>
      <p>${note}</p>
    </div>`).join("");
  return rsmContentSlide(
    "rsm2-key-figure-slide",
    "关键数字锚定",
    "02B",
    `${displayBankName(row.bank)}本轮先用四个数字锚定经营质量位置`,
    `${story.client_question}｜数字只用于锚定，结论仍回到后续证据链`,
    `<div class="rsm2-key-figure-grid">${figures}</div>`,
    reportStoryNote("数字阅读方式", ["先看目标值与对标均值的差距", "再看该指标属于回报、息差、风险还是资本", "最后进入专题页解释形成机制"])
  );
}

function rsm2TopicDividerSlide(topicKey, index) {
  const config = rsm2TopicConfig(topicKey);
  const topic = topicDefinitions().find((item) => item.id === topicKey);
  const facts = topic ? topicFactPackRows(topic.id) : [];
  const judgement = topic ? topicJudgement(topic.id, facts) : null;
  return `
    <section class="print-slide rsm2-divider-slide" data-deck-type="section">
      <div class="rsm2-divider-inner">
        <span>SPARC / VQA 专题 ${String(index + 1).padStart(2, "0")}</span>
        <h2>${config.module}</h2>
        <p>${reportShortText(config.question, 96)}</p>
        <div class="rsm2-divider-signal">${judgement?.signal || "专题判断待形成"}</div>
      </div>
    </section>`;
}

function rsm2TopicTakeawaySlide(topicKey, index) {
  const config = rsm2TopicConfig(topicKey);
  const topic = topicDefinitions().find((item) => item.id === topicKey);
  const facts = topic ? topicFactPackRows(topic.id) : [];
  const judgement = topic ? topicJudgement(topic.id, facts) : null;
  const evidence = (judgement?.evidence || facts).slice(0, 3).map((fact) => `
    <div class="rsm2-topic-takeaway-card">
      <span>${fact.指标名称}</span>
      <b>${fact.目标值}</b>
      <p>${fact.分位 || "分位待补"}｜对标均值 ${fact.对标均值}</p>
    </div>`).join("");
  return rsm2Page(
    "rsm2-topic-takeaway-slide",
    `${config.module}小结`,
    `${config.num}-S`,
    `${config.module}小结应收束为三条证据和一个管理动作`,
    `${displayBankName(targetRecord()?.bank || state.target)}｜专题 ${String(index + 1).padStart(2, "0")}`,
    `<div class="rsm2-topic-takeaway-grid">${evidence}</div>`,
    rsm2DecisionPanel(config.question, judgement?.headline || config.finding, config.action),
    ["章节小结用于降低报告阅读负荷。", "小结页只保留已可复核的证据和管理含义。"]
  );
}

function rsm2TopicSequenceSlides(topicKeys = []) {
  return topicKeys.map((key, index) => [
    rsm2TopicDiagnosticSlide(key, index)
  ].join("")).join("");
}

function rsm2MainReportTopics() {
  const fallback = ["profit", "nim", "risk", "capitalMarket", "retailRisk", "depositLoanDeepDive"];
  const included = fallback.filter((key) => typeof isTopicIncluded === "function" ? isTopicIncluded(key) : true);
  const candidates = included.length ? included : fallback;
  return candidates.slice(0, 6);
}

function rsm2ChartProofSlides() {
  if (typeof collectChartSlides !== "function") return "";
  const slides = collectChartSlides();
  if (!slides.length) return "";
  const groups = groupedChartSlides(slides);
  let chartIndex = 0;
  return groups.map((group, groupIndex) => {
    const prioritySlides = group.slides.slice(0, 1);
    return prioritySlides.map((slide, slideIndex) => buildChartSlide(slide, group.kicker, chartIndex++, group.slides, slideIndex)).join("");
  }).join("");
}

function rsm2DupontSlide() {
  const row = targetRecord();
  const pack = typeof dupontBreakdown === "function" ? dupontBreakdown(row) : null;
  if (!row || !pack) return "";
  const nodes = pack.nodes.slice(0, 9).map((node) => `
    <div class="rsm2-pro-node level-${node.level}">
      <span>${node.label}</span>
      <b>${node.value == null ? "暂无" : node.id === "leverage" ? `${node.value.toFixed(2)}x` : `${node.value.toFixed(2)}%`}</b>
      <em>对标中位 ${node.peer == null ? "暂无" : node.id === "leverage" ? `${node.peer.toFixed(2)}x` : `${node.peer.toFixed(2)}%`}</em>
      <p>差距 ${node.gap == null ? "暂无" : node.gap.toFixed(2)}</p>
    </div>`).join("");
  const drivers = pack.contributions.slice(0, 4).map((item) => `
    <div class="rsm2-driver-row">
      <b>${item.label}</b>
      <span>${item.goodGap == null ? "暂无" : item.goodGap.toFixed(2)}</span>
      <em>${(item.contributionShare * 100).toFixed(0)}%</em>
    </div>`).join("");
  const main = `
    <div class="rsm2-dupont-grid">${nodes}</div>
    <div class="rsm2-driver-panel"><span>ROE 差距主要贡献项</span>${drivers}</div>`;
  const side = rsm2DecisionPanel(
    "ROE 差距由哪些因子构成？",
    pack.mainDriver ? `${pack.mainDriver.label}是当前 ROE 差距中权重最高的可解释因子，贡献占比约 ${(pack.mainDriver.contributionShare * 100).toFixed(0)}%。` : "当前数据不足以形成完整分解。",
    "后续专题应优先验证主驱动因子是否来自结构性问题，而不是只看 ROE 终值。"
  );
  return rsm2Page(
    "rsm2-pro-dupont-slide",
    "分解引擎",
    "08B",
    `${displayBankName(row.bank)}的 ROE 差距需要拆到 ROA、杠杆和收入成本因子`,
    "DuPont 三级分解｜目标银行 vs 对标组中位数｜差距贡献度用于确定后续专题优先级",
    main,
    side,
    ["Position 只说明位置，Decomposition 解释结构。", "本页把 ROE 从单点指标转成可归因证据链。"]
  );
}

function rsm2ProfitAttributionSlide() {
  const row = targetRecord();
  const pack = typeof netProfitAttribution === "function" ? netProfitAttribution(row) : null;
  if (!row || !pack) return "";
  const maxAbs = Math.max(...pack.items.map((item) => Math.abs(item.value)), 1);
  const bars = pack.items.map((item) => {
    const width = Math.max(8, Math.abs(item.value) / maxAbs * 100);
    const tone = item.value >= 0 ? "pos" : "neg";
    return `
      <div class="rsm2-waterfall-row tone-${tone}">
        <span>${item.label}</span>
        <div><i style="width:${width}%"></i></div>
        <b>${metricDisplayValue("netProfit", item.value)}</b>
      </div>`;
  }).join("");
  const main = `
    <div class="rsm2-waterfall-head">
      <div><span>${pack.yearFrom} 净利润</span><b>${metricDisplayValue("netProfit", pack.from)}</b></div>
      <div><span>净变化</span><b>${metricDisplayValue("netProfit", pack.total)}</b></div>
      <div><span>${pack.yearTo} 净利润</span><b>${metricDisplayValue("netProfit", pack.to)}</b></div>
    </div>
    <div class="rsm2-waterfall">${bars}</div>`;
  const side = rsm2DecisionPanel(
    "今年净利润变化由什么驱动？",
    `最大正向贡献为${pack.positive?.label || "暂无"}，最大负向贡献为${pack.negative?.label || "暂无"}。`,
    "利润归因用于区分主业扩张、息差变化、成本约束和拨备税费因素，避免只看净利润增速。"
  );
  return rsm2Page(
    "rsm2-pro-attribution-slide",
    "归因引擎",
    "08C",
    `${displayBankName(row.bank)}的净利润变化需要拆成规模、息差、中收、成本和拨备税费贡献`,
    `${pack.yearFrom} → ${pack.yearTo}｜瀑布归因以公开报表字段和 RSM 测算为边界`,
    main,
    side,
    ["Attribution 解释变化来源。", "最大正负贡献项决定下一轮管理复盘的先后顺序。"]
  );
}

function rsm2MomentumSlide() {
  const row = targetRecord();
  if (!row || typeof sparcMomentumScores !== "function") return "";
  const cards = sparcMomentumScores().map((item) => `
    <div class="rsm2-momentum-card tone-${item.momentumScore >= 20 ? "green" : item.momentumScore <= -20 ? "red" : "amber"}">
      <span>${item.code} ${item.label}</span>
      <b>${item.momentumScore}</b>
      <p>${item.metricMomentum.slice(0, 2).map((metric) => `${metric.label}：${metric.direction}`).join("；")}</p>
    </div>`).join("");
  const main = `<div class="rsm2-momentum-grid">${cards}</div>`;
  const side = rsm2DecisionPanel(
    "哪些指标的位置和趋势不一致？",
    "动量分用于区分“位置靠前但在下行”和“位置靠后但在改善”，比单一年份分位更适合管理复盘。",
    "动量为负且静态分位靠后的维度，应进入下一季度优先议题。"
  );
  return rsm2Page(
    "rsm2-pro-momentum-slide",
    "趋势动量",
    "08D",
    `${displayBankName(row.bank)}需要同时看静态位置和趋势动量`,
    "Trajectory Engine｜基于六年面板识别方向、加速度和拐点",
    main,
    side,
    ["Trajectory 判断趋势是否正在改变。", "动量标签用于校准行动紧迫性。"]
  );
}

function rsm2StructuralCycleSlide() {
  const row = targetRecord();
  if (!row || typeof structuralCycleTag !== "function") return "";
  const keys = ["nim", "coreRevenueGrowth", "feeAssetRatio", "npl", "rwaDensity", "pb"];
  const cards = keys.map((key) => {
    const tag = structuralCycleTag(key, row);
    return `
      <div class="rsm2-structure-card tone-${tag.tag === "结构性" ? "red" : tag.tag === "混合" ? "amber" : "blue"}">
        <span>${tag.label}</span>
        <b>${tag.tag}</b>
        <p>${reportShortText(tag.note, 88)}</p>
      </div>`;
  }).join("");
  const main = `<div class="rsm2-structure-grid">${cards}</div>`;
  const side = rsm2DecisionPanel(
    "差距是行业共性还是自身结构问题？",
    "结构性标签用于判断是否需要主动干预；周期性标签用于判断是否更多来自行业共同压力。",
    "被识别为结构性或混合的指标，应进入专题机制解释和行动优先矩阵。"
  );
  return rsm2Page(
    "rsm2-pro-structure-slide",
    "结构归因",
    "08E",
    `${displayBankName(row.bank)}的指标偏离需要区分结构性、周期性和混合因素`,
    "Structural vs Cyclical｜用同类型均值趋势和标准差偏离识别差距性质",
    main,
    side,
    ["结构性问题需要主动管理动作。", "周期性问题需要在报告中保留行业边界。"]
  );
}

function rsm2ActionPrioritySlide() {
  const row = targetRecord();
  if (!row || typeof actionPriorityMatrix !== "function") return "";
  const actions = actionPriorityMatrix(row).slice(0, 6).map((item, index) => `
    <div class="rsm2-priority-row">
      <b>${String(index + 1).padStart(2, "0")}</b>
      <span>${item.label}</span>
      <em>${item.total}</em>
      <p>影响度 ${item.impact.toFixed(0)}｜可改善性 ${item.feasibility.toFixed(0)}｜紧迫性 ${item.urgency.toFixed(0)}</p>
    </div>`).join("");
  const main = `<div class="rsm2-priority-list">${actions}</div>`;
  const side = rsm2DecisionPanel(
    "管理动作先做哪三件？",
    "行动优先级由影响度、可改善性和紧迫性三项加权形成，避免只按分数低高排序。",
    "Top 3 指标应进入 0-3 个月工作包，并在后续 KPI 目标页设定复盘口径。"
  );
  return rsm2Page(
    "rsm2-pro-priority-slide",
    "行动优先级",
    "09B",
    `${displayBankName(row.bank)}的行动排序应由影响度、可改善性和紧迫性共同决定`,
    "Action Prioritization｜从低分位指标升级为管理动作优先矩阵",
    main,
    side,
    ["行动排序需要量化理由。", "优先级不是结论，而是下一季度资源配置依据。"]
  );
}

function rsm2WhatIfSlide() {
  const row = targetRecord();
  if (!row || typeof defaultScenarioSet !== "function") return "";
  const scenarios = defaultScenarioSet(row).map((item) => `
    <div class="rsm2-whatif-card tone-${item.result?.delta < -3 ? "red" : item.result?.delta < 0 ? "amber" : "green"}">
      <span>${item.label}</span>
      <b>${item.result ? `${item.result.delta > 0 ? "+" : ""}${item.result.delta} 分` : "暂无"}</b>
      <p>${item.description}｜VQA ${item.result?.base?.score ?? "暂无"} → ${item.result?.after?.score ?? "暂无"}</p>
    </div>`).join("");
  const main = `<div class="rsm2-whatif-grid">${scenarios}</div>`;
  const side = rsm2DecisionPanel(
    "如果关键假设变化，VQA 结果会怎样？",
    "What-if 引擎用临时情景重算 VQA 分数，帮助董事会理解息差、风险和资本约束的敏感性。",
    "正式汇报时可把本页作为压力测试页，不替代预算预测。"
  );
  return rsm2Page(
    "rsm2-pro-whatif-slide",
    "情景模拟",
    "10C",
    `${displayBankName(row.bank)}的 VQA 评分对息差、风险和资本假设存在不同敏感性`,
    "What-if Engine｜前端即时重算，不改变基础数据，只用于压力情景讨论",
    main,
    side,
    ["Scenario 解释未来变化。", "本页把静态诊断转为可讨论的压力测试。"]
  );
}

function rsm2ThreeContradictionsSlide() {
  const row = targetRecord();
  if (!row) return "";
  const diagnosis = computeVqaDiagnosis(row, peerRecords());
  const explainers = topicExplainerRows(row, peerRecords(), diagnosis);
  const cards = [
    ["01", "资本约束矛盾", "规模扩张与资本内生增速之间需要重新校准。", explainers.find((item) => item.topic.includes("资本"))?.action || "以风险调整回报约束新增资产。"],
    ["02", "资产质量矛盾", "账面风险指标与前移风险指标需要同步观察。", explainers.find((item) => item.topic.includes("风险"))?.action || "建立逾期、关注和隐性不良的月度看板。"],
    ["03", "战略转化矛盾", "资产规模未完全转化为轻资本收入和估值支撑。", explainers.find((item) => item.topic.includes("盈利"))?.action || "拆分核心营收和手续费资产比的改善路径。"]
  ].map(([num, title, text, action]) => `
    <div class="rsm2-contradiction-card">
      <b>${num}</b>
      <span>${title}</span>
      <p>${reportShortText(text, 80)}</p>
      <em>${reportShortText(action, 76)}</em>
    </div>`).join("");
  const main = `<div class="rsm2-contradiction-grid">${cards}</div>`;
  const side = rsm2DecisionPanel(
    "专题证据最后收敛到什么？",
    `${displayBankName(row.bank)}的管理问题可收敛为资本约束、资产质量和战略转化三类矛盾。`,
    "董事会应围绕三类矛盾设定季度复盘议题，而不是逐项讨论所有指标。"
  );
  return rsm2Page(
    "rsm2-contradictions-slide",
    "三大矛盾",
    "09A",
    `${displayBankName(row.bank)}的专题证据最终收敛为三类董事会议题`,
    "Answer 起点｜从分散证据回到可批准、可追踪的管理议题",
    main,
    side,
    ["三大矛盾是全篇证据的收束。", "行动地图必须逐项对应这三类矛盾。"]
  );
}

function rsm2KpiTargetSlide() {
  const row = targetRecord();
  if (!row) return "";
  const keys = ["roa", "nim", "npl", "feeAssetRatio"];
  const cards = keys.map((key) => {
    const peer = avg(peerRecords(), key);
    const direction = metricDirection(key);
    const current = row[key];
    const target = current == null || peer == null ? null : direction ? Math.max(current, peer) : Math.min(current, peer);
    return `
      <div class="rsm2-target-card">
        <span>${fieldName(key)}</span>
        <b>${metricDisplayValue(key, current)}</b>
        <em>12 个月参照目标 ${metricDisplayValue(key, target)}</em>
        <p>对标均值 ${metricDisplayValue(key, peer)}｜${rsm2MetricRankText(key, row)}</p>
      </div>`;
  }).join("");
  const main = `<div class="rsm2-target-grid">${cards}</div>`;
  const side = rsm2DecisionPanel(
    "12 个月后如何判断动作是否有效？",
    "用 ROA、NIM、不良率和手续费资产比四类指标同时复核，避免单项指标改善掩盖结构问题。",
    "目标值采用对标均值作为参照锚点，正式汇报前可由管理层调整为年度预算口径。"
  );
  return rsm2Page(
    "rsm2-kpi-target-slide",
    "指标目标",
    "10A",
    `${displayBankName(row.bank)}的行动成效应通过四类指标同步验证`,
    "当前值 → 12 个月参照目标｜目标值先采用对标均值锚定，后续可替换为预算指标",
    main,
    side,
    ["目标页把行动建议转成复盘口径。", "每项目标都可追溯到当前值和对标均值。"]
  );
}

function rsm2PressureScenarioSlide() {
  const row = targetRecord();
  if (!row) return "";
  const scenarios = [
    ["基线情景", "资产收益率与负债成本按当前趋势延续", "维持季度复盘，优先修复低分位指标。", "blue"],
    ["压力情景", "净息差再下行、核心营收低于对标均值", "收紧低收益扩表，前移负债成本和风险迁徙复核。", "amber"],
    ["修复情景", "轻资本收入改善并带动核心营收回到对标均值", "将客户经营、结算沉淀和财富管理纳入专项项目。", "green"]
  ].map(([title, trigger, action, tone]) => `
    <div class="rsm2-scenario-card tone-${tone}">
      <span>${title}</span>
      <b>${reportTitleSentence(trigger, 36)}</b>
      <p>${reportShortText(action, 84)}</p>
    </div>`).join("");
  const main = `<div class="rsm2-scenario-grid">${scenarios}</div>`;
  const side = rsm2DecisionPanel(
    "如果外部环境继续变化，报告结论如何使用？",
    "压力情景不改变当前证据链，只改变行动优先级和复盘频率。",
    "董事会可将三套情景作为下一季度经营复盘的议程模板。"
  );
  return rsm2Page(
    "rsm2-pressure-slide",
    "压力情景",
    "10B",
    `${displayBankName(row.bank)}应把当前诊断转为三套经营复盘情景`,
    "Scenario Planning｜基线、压力、修复三套情景对应不同管理动作",
    main,
    side,
    ["情景页帮助董事会在不确定环境下使用报告。", "情景触发条件必须回到指标。"]
  );
}

function rsm2ActionRoadmapSlide() {
  const row = targetRecord();
  if (!row) return "";
  const diagnosis = computeVqaDiagnosis(row, peerRecords());
  const explainers = topicExplainerRows(row, peerRecords(), diagnosis);
  const columns = [
    ["0-3 个月", "锁定问题", [
      `确认${diagnosis.labels[diagnosis.weakest]}的指标口径和责任部门。`,
      explainers[0]?.action || "完成目标银行与对标组的低分位指标归因。",
      "形成董事会季度复盘指标清单。"
    ]],
    ["3-6 个月", "拆解动作", [
      explainers[1]?.action || "把息差、核心营收和风险确认拆到管理动作。",
      "建立资产负债、客户经营和风险确认的跨部门周转机制。",
      "对覆盖不足指标补充数据来源和口径说明。"
    ]],
    ["6-12 个月", "验证改善", [
      explainers[2]?.action || "用经营质量改善验证资本市场叙事是否成立。",
      "跟踪 ROA、NIM、拨备覆盖、资本余量和 PB 的联动变化。",
      "将未改善指标进入下一轮专题诊断。"
    ]]
  ].map(([period, theme, items]) => `
    <div class="rsm2-roadmap-card">
      <span>${period}</span>
      <b>${theme}</b>
      <ul>${items.map((item) => `<li>${reportShortText(item, 48)}</li>`).join("")}</ul>
    </div>`).join("");
  const main = `<div class="rsm2-roadmap">${columns}</div>`;
  const side = rsm2DecisionPanel(
    "董事会应批准什么行动顺序？",
    "先锁定低分位问题，再拆到部门动作，最后用经营质量和估值联动验证改善。",
    "建议以季度为节奏复盘，0-3 个月完成问题归因，6-12 个月验证改善。"
  );
  return rsm2Page(
    "rsm2-action-roadmap-slide",
    "行动路径",
    "09",
    `${displayBankName(row.bank || state.target)}修复路径应从诊断、拆解到验证分三段推进`,
    "Decision Path｜建议绑定指标、动作、责任边界和复核周期",
    main,
    side,
    ["行动页避免停留在关注、加强、优化。", "每个时间窗口都绑定可复核动作。"]
  );
}

function rsm2WatchMetricsSlide() {
  const row = targetRecord();
  if (!row || typeof watchMetricRows !== "function") return "";
  const cards = watchMetricRows(row).slice(0, 6).map((item) => `
    <div class="rsm2-number-hero">
      <span>${item.label}</span>
      <b>${item.value}</b>
      <em>对标 ${item.peer}｜${item.percentile}</em>
      <p>${item.gapText}；动量${item.momentum}${item.priority == null ? "" : `；优先级 ${item.priority}`}</p>
    </div>`).join("");
  const side = rsm2DecisionPanel(
    "为什么要建立关注指标看板？",
    "董事会阅读报告时不应追踪所有指标，而应固定 5-8 个可以解释价值质量变化的锚定指标。",
    "这些指标进入执行摘要、行动目标和季度复盘，后续报告优先解释其变化原因。"
  );
  return rsm2Page(
    "rsm2-watch-metrics-slide",
    "关注指标",
    "04D",
    `${displayBankName(row.bank)}本轮需用少数关键指标持续复核价值质量变化`,
    "Watch Metrics｜从低分位、敏感性和行动优先级自动筛选",
    `<div class="rsm2-number-hero-grid">${cards}</div>`,
    side,
    ["关键数字必须在 30 秒内可读。", "关注指标决定后续专题和行动页的证据权重。"]
  );
}

function rsm2PeerSensitivitySlide() {
  const row = targetRecord();
  if (!row || typeof peerSensitivityRows !== "function") return "";
  const rows = peerSensitivityRows(row).slice(0, 8);
  const table = rows.map((item) => `
    <div class="rsm2-sensitivity-row${item.flip ? " is-flip" : ""}">
      <b>${displayBankName(item.peer)}</b>
      <span>${item.base} → ${item.after}</span>
      <em>${item.delta >= 0 ? "+" : ""}${item.delta} 分</em>
      <p>${item.flip ? "移除后信号翻转，需在正文标注样本敏感性。" : `信号稳定；最弱维度仍指向${item.weakest}。`}</p>
    </div>`).join("");
  const flipCount = rows.filter((item) => item.flip).length;
  const side = rsm2DecisionPanel(
    "对标组是否影响结论稳定性？",
    flipCount ? `存在 ${flipCount} 个移除样本会导致信号翻转，强结论应降级并补充样本解释。` : "逐一移除同业后 VQA 信号保持稳定，当前对标结论具备进入主报告基础。",
    "正式交付时保留该页作为对标组治理和置信度校准依据。"
  );
  return rsm2Page(
    "rsm2-peer-sensitivity-slide",
    "样本敏感性",
    "04E",
    `${displayBankName(row.bank)}的 VQA 结论需要先通过对标组敏感性测试`,
    "Peer Sensitivity｜逐一移除同业样本，重算 VQA 分数与信号",
    `<div class="rsm2-sensitivity-table">${table}</div>`,
    side,
    ["敏感性页防止强结论依赖单一对标样本。", "信号翻转会自动影响置信度表达。"]
  );
}

function rsm2IndustryContextSlide() {
  const row = targetRecord();
  if (!row || typeof buildIndustryContextParagraph !== "function") return "";
  const checks = typeof crossValidationNarratives === "function" ? crossValidationNarratives(row) : [];
  const context = buildIndustryContextParagraph(row);
  const checkCards = checks.slice(0, 4).map((item, index) => `
    <div class="rsm2-cross-check-card">
      <b>${String(index + 1).padStart(2, "0")}</b>
      <p>${reportShortText(item, 98)}</p>
    </div>`).join("");
  const side = rsm2DecisionPanel(
    "行业锚定后还要检查什么？",
    "结论不仅要看单项指标位置，还要检查指标之间是否存在方向背离。",
    "若出现强背离，报告标题和正文应自动降级为待验证判断。"
  );
  return rsm2Page(
    "rsm2-industry-context-slide",
    "行业与交叉验证",
    "04F",
    `${displayBankName(row.bank)}的个体差异需要同时经过行业锚定和交叉验证`,
    "Industry Context + Cross Validation｜防止把周期压力或指标背离误读为单点结论",
    `<div class="rsm2-context-block"><b>行业锚定</b><p>${reportShortText(context, 230)}</p></div><div class="rsm2-cross-check-grid">${checkCards}</div>`,
    side,
    ["行业锚定回答是否为共性压力。", "交叉验证回答单项指标是否能独立支撑判断。"]
  );
}

function rsm2SessionLogSlide() {
  const logs = (state.sessionLog || []).slice(0, 8);
  const rows = logs.map((item) => `
    <div class="rsm2-session-row">
      <span>${item.timestamp}</span>
      <b>${item.action}</b>
      <p>${item.finding}</p>
    </div>`).join("");
  const side = rsm2DecisionPanel(
    "为什么附上分析路径？",
    "董事会交付物需要说明结论如何形成，尤其是样本边界、报告版本和导出动作。",
    "该页作为内部审阅和版本回溯，不替代数据附录。"
  );
  return rsm2Page(
    "rsm2-session-log-slide",
    "分析路径回溯",
    "10D",
    "本轮报告保留从口径确认到导出的关键分析路径",
    "Session Log｜用于内部审阅、版本追踪和交付复盘",
    `<div class="rsm2-session-list">${rows || "<p>当前暂无记录；确认分析或导出后自动写入。</p>"}</div>`,
    side,
    ["路径回溯保证报告链路可解释。", "导出文件与页面预览共享同一套状态。"]
  );
}

function rsm2QualityGateSlide() {
  const row = targetRecord();
  const selectedRows = selectedBankRecords();
  const checks = [
    ["内容", "是否回答客户问题", consultingStoryline(row).client_answer],
    ["逻辑", "标题能否连读成故事线", "总答案、证据边界、专题验证和行动路径已经形成闭环。"],
    ["呈现", "每页是否只有一个主证明对象", "执行摘要用结论卡，专题页用证据表，行动页用路线图。"],
    ["语言", "措辞是否稳健可进入会议纪要", "使用价值错配、质量折价、待验证事项等审慎表达。"],
    ["数据", "核心指标覆盖是否足够", `选定样本 ${selectedRows.length} 条；覆盖不足指标进入附录复核。`]
  ].map(([gate, question, answer]) => `
    <div class="rsm2-check-row">
      <b>${gate}</b>
      <span>${question}</span>
      <p>${reportShortText(answer, 74)}</p>
    </div>`).join("");
  const main = `<div class="rsm2-checklist">${checks}</div>`;
  const side = rsm2DecisionPanel(
    "报告交付前还需要复核什么？",
    "交付复核应覆盖内容、逻辑、呈现、语言和数据边界五道门。",
    "任何无证据强判断、标题空泛、图表无观点或数据覆盖不足的问题，均需在正式导出前修正。"
  );
  return rsm2Page(
    "rsm2-quality-gate-slide",
    "交付复核",
    "10",
    "交付前复核应覆盖内容、逻辑、呈现、语言和数据边界五道门",
    "Quality Gate｜用于客户版报告导出前最后一轮检查",
    main,
    side,
    ["复核页把报告质量标准显性化。", "不满足证据链的判断需要降级或删除。"]
  );
}

function rsm2AppendixSlide() {
  return buildDataAppendixSlide().replace("数据附录页", "数据附录").replace("10", "11");
}

function buildPrintDeck() {
  const deck = document.getElementById("printDeck");
  if (!deck) return;
  const row = targetRecord();
  const peerText = displayBankList(state.peers);
  const typeText = state.types.join("、") || "所选类型银行";
  const factPack = vqaFactPack(row, peerRecords());
  const vqaScore = factPack ? `${factPack.diagnosis.score}｜${factPack.diagnosis.signal}` : "已生成经营诊断";
  const versionText = state.reportVersion || "董事会完整汇报版";
  const cover = typeof buildRsmCoverSlide === "function"
    ? buildRsmCoverSlide(row, peerText, typeText, versionText, vqaScore)
    : "";
  const deckParts = [
    cover,
    rsm2AgendaSlide(),
    shouldIncludeDeckSection("scope") || shouldIncludeDeckSection("methodology") ? rsm2ScopeMethodSlide() : "",
    shouldIncludeDeckSection("executive") ? rsm2ExecutiveSlide() : "",
    shouldIncludeDeckSection("executive") ? rsm2PresidentOnePageSlide() : "",
    shouldIncludeDeckSection("executive") ? rsm2KeyFigureSlide() : "",
    shouldIncludeDeckSection("methodology") ? rsm2NorthStarSlide() : "",
    shouldIncludeDeckSection("methodology") ? rsm2FrameworkApplicationSlide() : "",
    shouldIncludeDeckSection("storyline") ? rsm2StorylineMapSlide() : "",
    rsm2IndustryAnchorSlide(),
    rsm2IndustryContextSlide(),
    rsm2SparcOverviewSlide(),
    rsm2WatchMetricsSlide(),
    rsm2PeerSensitivitySlide(),
    shouldIncludeDeckSection("charts") || shouldIncludeDeckSection("topics") ? rsm2DupontSlide() : "",
    shouldIncludeDeckSection("charts") || shouldIncludeDeckSection("topics") ? rsm2ProfitAttributionSlide() : "",
    shouldIncludeDeckSection("charts") || shouldIncludeDeckSection("topics") ? rsm2MomentumSlide() : "",
    shouldIncludeDeckSection("charts") || shouldIncludeDeckSection("topics") ? rsm2StructuralCycleSlide() : "",
    shouldIncludeDeckSection("charts") && state.reportVersion === "专项分析版" ? rsm2ChartProofSlides() : "",
    shouldIncludeDeckSection("topics") ? rsm2TopicSequenceSlides(rsm2MainReportTopics()) : "",
    shouldIncludeDeckSection("action") ? rsm2ThreeContradictionsSlide() : "",
    shouldIncludeDeckSection("action") ? rsm2ActionPrioritySlide() : "",
    shouldIncludeDeckSection("action") ? rsm2ActionRoadmapSlide() : "",
    shouldIncludeDeckSection("action") ? rsm2KpiTargetSlide() : "",
    shouldIncludeDeckSection("action") ? rsm2PressureScenarioSlide() : "",
    shouldIncludeDeckSection("action") ? rsm2WhatIfSlide() : "",
    rsm2SessionLogSlide(),
    rsm2QualityGateSlide(),
    shouldIncludeDeckSection("appendix") ? rsm2AppendixSlide() : ""
  ];
  deck.innerHTML = deckParts.filter(Boolean).join("");
  if (typeof applyRsmDeckFooters === "function") applyRsmDeckFooters();
  if (typeof updateTrialCheckPanel === "function") updateTrialCheckPanel();
}

function chapterStory(kicker) {
  const row = targetRecord();
  const target = displayBankName(row?.bank || state.target);
  if (kicker.includes("经营压力")) return `${target}的分析从压力传导开始：资产收益率、负债成本和收入结构决定利润表受到的第一层冲击，先解释压力来源，再讨论修复路径。`;
  if (kicker.includes("盈利")) return `盈利章节回答“利润是不是主业修复带来的”。核心营收、真实核心非息、高波动收入、手续费资产比和拨备前利润共同判断盈利质量。`;
  if (kicker.includes("息差")) return `息差章节回答“负债端能不能对冲资产端让价”。净息差、真实存贷利差、NIM缺口、定期化和流动性一起决定资产负债管理优先级。`;
  if (kicker.includes("风险")) return `风险章节回答“风险是否充分确认”。不良率只是结果，隐性不良、偏离度、零售分产品不良和拨备覆盖率决定风险前移动作。`;
  if (kicker.includes("资本")) return `资本估值章节回答“资本消耗是否换来价值创造”。资本余量、风险加权资产、成本收入比、ROA和PB共同判断价值错配还是质量折价。`;
  return `本章节围绕目标银行和对标银行的关键差异展开，用图表把差异转成可执行的管理问题。`;
}

function buildSideNav() {
  const nav = document.getElementById("sideNavContent");
  if (!nav) return;
  const mapItems = typeof analysisNavigationItems === "function" ? analysisNavigationItems() : [
    { href: "#formalReportShell", label: "正式报告", desc: "报告阅读版", status: "可审阅" },
    { href: "#topicWorkbenchSection", label: "专题", desc: "专题事实包", status: "可复核" },
    { href: "#dataCoverageSection", label: "数据", desc: "数据覆盖与底稿", status: "待复核" }
  ];
  const utilityLinks = mapItems.filter((item) => document.querySelector(item.href))
    .map((item) => `<a class="nav-work-card" href="${item.href}" title="${item.label}">
      <span>${item.label}</span><b>${item.desc}</b><em>${item.status}</em>
    </a>`);
  const formalSections = [...document.querySelectorAll("#formalReport header, #formalReport section")];
  const formalLinks = formalSections.map((section, idx) => {
    if (!section.id) section.id = `formal-section-${idx + 1}`;
    const title = section.querySelector("h1, h2")?.textContent?.trim() || `第 ${idx + 1} 节`;
    return `<a class="nav-sub" href="#${section.id}" title="${title}">${title}</a>`;
  });
  const slides = [...document.querySelectorAll("#printDeck .print-slide")];
  const deckLinks = formalLinks.length ? [] : slides.map((slide, idx) => {
    if (!slide.id) slide.id = `deck-slide-${idx + 1}`;
    const title = slide.querySelector(".rsm-slide-head h2")?.textContent?.trim()
      || slide.querySelector(".rsm-cover-title-panel h1")?.textContent?.trim()
      || slide.querySelector(".rsm-toc-sidebar h3")?.textContent?.trim()
      || `第 ${idx + 1} 页`;
    return `<a class="nav-sub" href="#${slide.id}" title="${title}">${title}</a>`;
  });
  const groups = [
    utilityLinks.length ? `<div class="nav-group"><strong>工作区地图</strong>${utilityLinks.join("")}</div>` : "",
    formalLinks.length ? `<div class="nav-group"><strong>正式报告目录</strong>${formalLinks.join("")}</div>` : "",
    deckLinks.length ? `<div class="nav-group"><strong>PPT页序</strong>${deckLinks.join("")}</div>` : ""
  ].filter(Boolean);
  nav.innerHTML = groups.length ? groups.join("") : `<a href="#formalReportShell">报告生成后显示页导航</a>`;
  updateActiveNav();
}

function updateActiveNav() {
  const links = [...document.querySelectorAll("#sideNavContent a[href^='#']")];
  if (!links.length) return;
  let current = links[0];
  links.forEach((link) => {
    const el = document.querySelector(link.getAttribute("href"));
    if (el && el.getBoundingClientRect().top < 180) current = link;
  });
  links.forEach((link) => link.classList.toggle("is-active", link === current));
}

function renderAll() {
  updateKpis();
  updateClientBrief();
  renderMainCharts();
  replaceFigureImages();
  normalizeChartLabels();
  syncChartControls();
  updateChapterBriefs();
  updateFigureExplanations();
  updateDataCoverage();
  renderTopicWorkbench();
  if (typeof updateAiProductPanel === "function") updateAiProductPanel();
  updateReportSectionVisibility();
  buildPrintDeck();
  if (typeof renderFormalReport === "function") renderFormalReport();
  buildSideNav();
  if (typeof renderPortalWorkflowPanels === "function") renderPortalWorkflowPanels();
}
