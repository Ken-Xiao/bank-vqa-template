/* Bank VQA module: 14-report-profiles.js — PRD-63 报告版本差异 */

function fallbackReportProfiles() {
  return {
    "董事会完整汇报版": {
      includeSections: ["scope", "methodology", "executive", "vqa", "storyline", "topics", "charts", "action", "appendix"],
      defaultTopics: ["profit", "nim", "risk", "capital", "valuation", "capitalMarket", "retailRisk", "depositLoanDeepDive"],
      tone: "board"
    },
    "资本市场沟通版": {
      includeSections: ["scope", "methodology", "executive", "vqa", "storyline", "topics", "charts", "appendix"],
      defaultTopics: ["valuation", "capitalMarket", "profit", "capital", "depositLoanDeepDive"],
      tone: "market"
    },
    "管理层行动版": {
      includeSections: ["scope", "executive", "storyline", "topics", "action"],
      defaultTopics: ["profit", "nim", "risk", "capital", "retailRisk", "depositLoanDeepDive"],
      tone: "action"
    }
  };
}

function reportProfile(version = state.reportVersion) {
  const profiles = analysisRules?.reportProfiles || fallbackReportProfiles();
  return profiles[version] || profiles["董事会完整汇报版"] || Object.values(profiles)[0];
}

function shouldIncludeDeckSection(section, version = state.reportVersion) {
  const profile = reportProfile(version);
  const sections = profile?.includeSections || fallbackReportProfiles()["董事会完整汇报版"].includeSections;
  return sections.includes(section);
}

function applyReportVersionTopics(version = state.reportVersion) {
  const profile = reportProfile(version);
  if (!profile?.defaultTopics?.length || typeof ensureIncludedTopics !== "function") return;
  ensureIncludedTopics();
  topicDefinitions().forEach((topic) => {
    state.includedTopics[topic.id] = profile.defaultTopics.includes(topic.id);
  });
}

function applyReportVersionProfile(version = state.reportVersion) {
  applyReportVersionTopics(version);
  if (state.confirmed) {
    renderTopicWorkbench();
    buildPrintDeck();
  }
}

function reportVersionToneLabel(version = state.reportVersion) {
  const tone = reportProfile(version)?.tone || "board";
  if (tone === "market") return "资本市场沟通语气";
  if (tone === "action") return "管理层行动语气";
  return "董事会汇报语气";
}

function reportPrimaryNarrativeChannel(version = state.reportVersion) {
  return reportProfile(version)?.tone || "board";
}

function deckTocSections(version = state.reportVersion) {
  const chartCount = includedChartCount();
  const includedTopicList = topicDefinitions().filter((topic) => typeof isTopicIncluded === "function" ? isTopicIncluded(topic.id) : true);
  const catalog = [
    { key: "cover", num: "01", title: "封面", desc: "银行名称、报告版本、年份、对标组与价值质量总判断。", always: true },
    { key: "scope", num: "02", title: "样本边界", desc: "目标银行、对标银行、类型均值与纳入范围。" },
    { key: "methodology", num: "03", title: "价值质量框架", desc: "银行经营端与资本市场端双重穿透逻辑。" },
    { key: "executive", num: "04", title: "经营诊断摘要", desc: "核心数字、董办评论与汇报主线。" },
    { key: "vqa", num: "05", title: "价值质量诊断", desc: "五维评分、关键事实与管理优先级。" },
    { key: "storyline", num: "06", title: "汇报主线", desc: "本次报告的核心故事与章节承接。" },
    { key: "topics", num: "07", title: "专题判断页", desc: `纳入 ${includedTopicList.length} 个专题的事实依据与解读。` },
    { key: "charts", num: "08", title: "章节图表页", desc: `纳入 ${chartCount} 张图表，每张图含关键事实与管理启示。` },
    { key: "action", num: "09", title: "行动建议页", desc: "现在、近期、中期三类管理动作。" },
    { key: "appendix", num: "10", title: "数据附录页", desc: "核心指标覆盖、口径说明与结论边界。" }
  ];
  return catalog.filter((item) => item.always || shouldIncludeDeckSection(item.key, version));
}
