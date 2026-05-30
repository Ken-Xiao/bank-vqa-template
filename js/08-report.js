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
    .replace(/糟糕/g, "处于样本后段")
    .replace(/短板/g, "低分位指标")
    .replace(/低估/g, "低于参照估值水平")
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
      claim: `${target}本轮质量差异集中在${story.weakest}`,
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
  return rsmContentSlide(
    "executive-takeaways-slide",
    "执行摘要",
    "04",
    `${target}本轮结论应先回答质量差异和修复顺序`,
    `${story.client_question}｜基于 ${state.year} 年截面和所选对标组`,
    `<div class="executive-takeaways-grid">${cards}</div>${actionStrip}`,
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
  return rsmSectionSlide(
    kicker,
    "08",
    `${chapter.short}章节先回答管理问题，再进入图表证明`,
    `${displayBankName(row?.bank || state.target)}｜${state.year} 年｜${peerText}`,
    chapter.answer,
    reportShortText(`${chapter.question} ${chapter.bridge}`, 170),
    reportStoryNote("本章证明对象", [chapter.proof, "本章每页图表只保留一个判断、关键证据和管理含义。"])
  );
}

function chartClaimTitle(title = "", kicker = "") {
  const target = displayBankName(targetRecord()?.bank || state.target);
  const text = `${title} ${kicker}`;
  if (/息差|净息|负债|存款|利差|收益成色|票面/.test(text)) {
    return `${target}息差判断需要同时验证资产收益和负债成本`;
  }
  if (/盈利|核心|非核心|手续费|轻资本|收入|ROA|总资产收益率|现金利润/.test(text)) {
    return `${target}盈利质量需回到核心营收、轻资本收入和拨备前修复`;
  }
  if (/风险|不良|偏离|拨备|逾期|关注|零售|利润质量/.test(text)) {
    return `${target}风险确认节奏决定利润质量能否被持续验证`;
  }
  if (/资本|RWA|市净率|PB|成本|估值|投资资产/.test(text)) {
    return `${target}资本市场定价需要由经营质量和资本消耗共同解释`;
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
      <em>总资产 ${metricDisplayValue("assets", item.assets)}</em>
      <em>ROE ${metricDisplayValue("roe", item.roe)}｜NIM ${metricDisplayValue("nim", item.nim)}｜不良 ${metricDisplayValue("npl", item.npl)}</em>
    </div>`).join("");
  const main = `<div class="rsm2-peer-grid">${cards}</div>`;
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

function rsm2SparcOverviewSlide() {
  const row = targetRecord();
  if (!row) return "";
  const scores = typeof sparcDimensionScores === "function" ? sparcDimensionScores(row) : [];
  const overall = typeof sparcOverallScore === "function" ? sparcOverallScore(scores) : null;
  const cards = scores.map((item) => `
    <div class="rsm2-sparc-card">
      <span>${item.code}</span>
      <b>${item.label}</b>
      <em>${item.score == null ? "--" : item.score.toFixed(0)}</em>
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
    }
  };
  return configs[topicKey];
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
    shouldIncludeDeckSection("executive") ? rsm2ExecutiveSlide() : "",
    shouldIncludeDeckSection("scope") || shouldIncludeDeckSection("methodology") ? rsm2ScopeMethodSlide() : "",
    shouldIncludeDeckSection("storyline") ? rsm2StorylineMapSlide() : "",
    rsm2PeerGroupProfileSlide(),
    rsm2SparcOverviewSlide(),
    shouldIncludeDeckSection("topics") ? rsm2TopicSlide("profit") : "",
    shouldIncludeDeckSection("topics") ? rsm2TopicSlide("nim") : "",
    shouldIncludeDeckSection("topics") ? rsm2TopicSlide("risk") : "",
    shouldIncludeDeckSection("topics") ? rsm2TopicSlide("capital") : "",
    shouldIncludeDeckSection("action") ? rsm2ActionRoadmapSlide() : "",
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
  const slides = [...document.querySelectorAll("#printDeck .print-slide")];
  const utilityLinks = [
    ["#analysisDeckShell", "正式报告预览"],
    ["#topicWorkbenchSection", "专题事实包"],
    ["#dataCoverageSection", "数据覆盖与底稿"]
  ].filter(([href]) => document.querySelector(href))
    .map(([href, title]) => `<a href="${href}" title="${title}">${title}</a>`);
  const links = slides.map((slide, idx) => {
    if (!slide.id) slide.id = `deck-slide-${idx + 1}`;
    const title = slide.querySelector(".rsm-slide-head h2")?.textContent?.trim()
      || slide.querySelector(".rsm-cover-title-panel h1")?.textContent?.trim()
      || slide.querySelector(".rsm-toc-sidebar h3")?.textContent?.trim()
      || `第 ${idx + 1} 页`;
    return `<a href="#${slide.id}" title="${title}">${title}</a>`;
  });
  nav.innerHTML = [...utilityLinks, ...links].length ? [...utilityLinks, ...links].join("") : `<a href="#analysisDeckShell">报告生成后显示页导航</a>`;
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
  buildSideNav();
}
