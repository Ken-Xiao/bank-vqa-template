/* Bank VQA module: 10-bootstrap.js */
var explainRules = [
  {
    match: "LPR",
    target: "目标银行需要重点看生息资产收益率曲线是否比同业下行更快；若下行斜率更陡，说明资产端议价能力偏弱。",
    peers: "对标银行用于区分“行业共同下行”和“自身传导更快”。若对标组更平缓，目标银行需要解释客户结构与资产投放差异。",
    action: "建议把资产定价复盘、重点客群收益率和负债成本联动纳入下一轮资产负债管理。"
  },
  {
    match: "收入结构",
    target: "目标银行若利息净收入占比高、非息收入占比薄，说明收入缓冲空间不足，利率下行会更快传导到报表。",
    peers: "对标银行的非息厚度可作为第二收入支柱参照，尤其要看手续费、财富管理、结算和交易银行能力。",
    action: "建议先建立轻资本收入的基础能力，再讨论利润弹性和估值修复。"
  },
  {
    match: "核心与非核心",
    target: "目标银行要判断增长来自核心营收，还是来自投资收益、公允价值变动等补位收入。",
    peers: "对标银行若核心营收更稳、非核心依赖更低，说明其经营修复质量更高。",
    action: "建议把核心营收强于总营收、拨备前利润同步改善作为主业修复的检验线。"
  },
  {
    match: "轻资本",
    target: "目标银行要看手续费资产比是否与核心营收同步改善；只纵向修复而横向未抬升，说明中收尚未形成支柱。",
    peers: "对标银行若手续费资产比更高且核心营收为正，可作为客户经营和产品转化的参照。",
    action: "建议补齐基础结算、代销、场景金融和本地客户经营，避免把短期非息补位误读为转型完成。"
  },
  {
    match: "总资产收益率",
    target: "目标银行不能只看总资产收益率终值，要拆解利差、中收、费用和减值分别贡献了多少。",
    peers: "对标银行可用于识别同样回报水平背后的不同路径：利差支撑、中收支撑，还是拨备和费用阶段性影响。",
    action: "建议把回报指标拆成支撑项和侵蚀项，优先修复可持续性最弱的环节。"
  },
  {
    match: "息差",
    target: "目标银行若缺口为正，说明资产端让价快于负债端降本，净息差防守仍处被动状态。",
    peers: "对标银行中缺口为负或接近零的样本，可作为负债管理、活期沉淀和成本压降的参照。",
    action: "建议围绕存款定期化、高成本负债和内部资金转移定价建立月度修复清单。"
  },
  {
    match: "存款结构",
    target: "目标银行要看定期存款占比是否持续抬升，活期沉淀是否下降；这决定负债重定价弹性。",
    peers: "对标银行若定期化程度更低或降本更快，说明其负债端经营基础更厚。",
    action: "建议把结算账户、工资代发、场景资金沉淀作为负债修复的前置动作。"
  },
  {
    match: "收益成色",
    target: "目标银行需要把名义贷款收益扣除信用成本后再看真实回报，避免高票面掩盖高风险。",
    peers: "对标银行可区分“真实定价能力强”和“以风险补偿换取高收益”的不同路径。",
    action: "建议用风险调整后的贷款收益率指导行业、客群和产品投放。"
  },
  {
    match: "零售",
    target: "目标银行若个贷不良上行快于全行不良，说明风险可能先在零售和下沉资产显形。",
    peers: "对标银行用于判断这是区域共性，还是目标银行零售风控和客户选择问题。",
    action: "建议前移迁徙预警，拆分住房、消费、经营贷等产品线风险。"
  },
  {
    match: "偏离",
    target: "目标银行若逾期偏离度高于一且关注率抬升，说明风险确认可能滞后。",
    peers: "对标银行若偏离度更低、关注率更稳，可作为分类严格度和处置节奏参照。",
    action: "建议同步审视不良认定、展期重组、清收处置与拨备使用节奏。"
  },
  {
    match: "利润质量",
    target: "目标银行要看净利润是否快于拨备前利润，同时拨备覆盖率是否下降。",
    peers: "对标银行若拨备前利润与净利润同向改善且覆盖率稳定，说明经营修复更扎实。",
    action: "建议停止用单一净利润增长解释经营改善，转向前端利润与风险缓冲双校验。"
  },
  {
    match: "风险缓冲",
    target: "目标银行要把偏离度、拨备覆盖率和利润缺口放在同一矩阵里看。",
    peers: "对标银行用于排序风险确认与拨备补充的优先级。",
    action: "建议对高偏离、低覆盖、利润依赖拨备释放的组合设置红色预警。"
  },
  {
    match: "资本",
    target: "目标银行要看扩表是否伴随核心一级资本充足率下降，避免增长消耗安全垫。",
    peers: "对标银行若能在扩表同时保持资本余量，说明资本转化效率更高。",
    action: "建议以风险调整回报约束新增资产，把资本占用写入业务准入和定价。"
  },
  {
    match: "成本",
    target: "目标银行若处于高成本、轻收入薄区域，说明规模扩大未必改善经营轻度。",
    peers: "对标银行中低成本、轻收入厚的样本，可反推网点效率、客户经营和中收能力差距。",
    action: "建议先拆解低效成本和低效产能，再推进轻资本收入重构。"
  },
  {
    match: "市净率",
    target: "目标银行要判断低市净率来自市场错配，还是经营质量折价。",
    peers: "对标银行用于建立同类型估值锚，比较回报、风险、资本和中收是否支撑更高定价。",
    action: "建议只有在经营质量修复被数据验证后，再形成估值修复叙事。"
  }
];

document.querySelectorAll(".figure-thumb").forEach((card) => {
  if (card.querySelector(".figure-explain")) return;
  const title = card.querySelector("b")?.textContent || "";
  const rule = explainRules.find((item) => title.includes(item.match)) || explainRules[0];
  const explain = document.createElement("div");
  explain.className = "figure-explain";
  explain.innerHTML = `
    <div><b>本图回答</b>${chartQuestion(title)}</div>
    <div><b>目标银行解读</b>${rule.target}</div>
    <div><b>对标银行解读</b>${rule.peers}</div>
    <div><b>管理建议</b>${rule.action}</div>
  `;
  card.appendChild(explain);
});

async function initApp() {
  await Promise.all([loadAnalysisRules(), loadMetricDictionary(), loadFieldCoverageMatrix(), loadLanguageDiscipline(), loadNarrativePrompts(), loadAiProviderConfig()]);
  setupMetricModal();
  populateSelectors();
  initProjectsModule();
  initAiNarrativeModule();
  initChartNarrativeModule();
  initPptxExport();
  if (typeof initBoardWorkbench === "function") initBoardWorkbench();
  if (typeof initProductWorkspace === "function") initProductWorkspace();
  if (typeof initPrdTraceabilityModule === "function") initPrdTraceabilityModule();
  if (typeof initAiGovernanceModule === "function") initAiGovernanceModule();
  if (typeof initExportSequenceQaModule === "function") initExportSequenceQaModule();
  if (typeof initCeamStructureEditorModule === "function") initCeamStructureEditorModule();
  if (typeof initLlmCommentaryModule === "function") initLlmCommentaryModule();
  if (typeof initDecisionWorkbenchModule === "function") initDecisionWorkbenchModule();
}

initApp();
window.addEventListener("scroll", updateActiveNav, { passive: true });
