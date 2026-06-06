const fs = require("fs");
const assert = require("assert/strict");

const html = fs.readFileSync("index.html", "utf8");
const css = fs.readFileSync("styles/app.css", "utf8");
const workspace = fs.readFileSync("js/19-product-workspace.js", "utf8");
const selection = fs.readFileSync("js/04-ui-selection.js", "utf8");
const dataFormat = fs.readFileSync("js/03-data-format.js", "utf8");
const pbPricing = fs.readFileSync("js/32-pb-pricing-model.js", "utf8");

[
  'id="step2DiagnosisTitle"',
  'id="step2DiagnosisLead"',
  'id="step2DecisionBrief"',
  'id="step2KpiStrip"',
  'id="step2BoardQuestions"',
  'id="step2PeerPosition"',
  'id="step2TopChanges"',
  'id="step2PbAnswer"',
  'id="step2TopicCards"',
  'id="step2ActionPath"',
  'js/32-pb-pricing-model.js'
].forEach((needle) => assert(html.includes(needle), `missing Step 2 diagnosis marker: ${needle}`));

[
  "function step2DiagnosisModel",
  "function renderStep2DecisionBrief",
  "function step2ToneFromScore",
  "function step2BoardQuestions",
  "function step2TopChangesModel",
  "function step2TopicCards",
  "function renderStep2Diagnosis"
].forEach((needle) => assert(workspace.includes(needle), `missing Step 2 renderer: ${needle}`));

[
  "boardroomDiscussionQuestions",
  "v6AnomalyRadar",
  "sparcDimensionScores",
  "pbDriverRanking",
  "theoreticalPB"
].forEach((needle) => assert(workspace.includes(needle), `Step 2 must reuse existing engine: ${needle}`));

[
  ".step2-diagnosis-hero",
  ".step2-decision-brief",
  ".step2-decision-main",
  ".step2-decision-points",
  ".step2-kpi-strip",
  ".step2-evidence-grid",
  ".step2-change-compact-grid",
  ".step2-change-head",
  ".step2-pb-pricing-grid",
  ".step2-pb-factor-strip",
  ".step2-pb-source",
  ".step2-topic-card",
  ".step2-scr-list",
  ".step2-action-path"
].forEach((needle) => assert(css.includes(needle), `missing Step 2 style marker: ${needle}`));

[
  "items.slice(0, 3)",
  "step2-change-compact-grid",
  "data-change-count"
].forEach((needle) => assert(workspace.includes(needle), `Top Changes must use compact rendering: ${needle}`));

[
  "situation",
  "complication",
  "step2-scr-list",
  "进入专题分析"
].forEach((needle) => assert(workspace.includes(needle), `Topic cards must use compact SCR rendering: ${needle}`));

[
  'if ((target.type || "").includes("国有") || (target.type || "").includes("股份")) return "sameType"',
  'if (template === "sameType") return row.type === target.type',
  'state.peers = peerTemplateBanks(template)'
].forEach((needle) => assert(dataFormat.includes(needle), `peer defaults must preserve same-type benchmark logic: ${needle}`));

[
  'state.peerTemplate = "manual"',
  "if (checkedPeers.length)",
  "state.peers = checkedPeers.filter"
].forEach((needle) => assert(selection.includes(needle), `confirmed comparison must use selected peer banks: ${needle}`));

assert(!html.includes("苏农银行，可切换"), "setup hero must not hard-code Sunong in the page chrome");

[
  "pbPricingModel",
  "广义不良率是最强PB压制因子",
  "手续费/总资产是唯一经统计证明的PB溢价来源",
  "typeStats2025",
  "pbPricingBrief",
  "pbPricingFactorReadout"
].forEach((needle) => assert(pbPricing.includes(needle), `PB pricing model must include source insight: ${needle}`));

[
  "pbPricingBrief",
  "pbPricingFactorReadout",
  "step2-pb-pricing-grid",
  "step2-pb-source"
].forEach((needle) => assert(workspace.includes(needle), `Step 2 PB answer must use pricing package: ${needle}`));

console.log("sprint7b-default-diagnosis-contract-ok");
