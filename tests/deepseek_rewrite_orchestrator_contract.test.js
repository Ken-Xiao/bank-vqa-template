const fs = require("fs");
const assert = require("assert/strict");

const html = fs.readFileSync("index.html", "utf8");
const orchestrator = fs.readFileSync("js/37-deepseek-rewrite-orchestrator.js", "utf8");
const llm = fs.readFileSync("js/33-llm-commentary.js", "utf8");
const report = fs.readFileSync("js/35-report-model.js", "utf8");
const prompts = fs.readFileSync("config/deepseek_explanation_prompts.json", "utf8");

[
  "function rewriteBlockRegistry",
  "function buildRewritePlan",
  "function callRewriteBlock",
  "function validateRewriteResult",
  "function applyRewriteResult",
  "async function runEvidenceRewriteOrchestrator"
].forEach((needle) => assert(orchestrator.includes(needle), `missing ${needle}`));

[
  "bank.summary",
  "executive.answer",
  "evidence.map.deviation",
  "topic.board",
  "topic.market",
  "topic.action",
  "report.section"
].forEach((needle) => assert(orchestrator.includes(needle), `registry missing ${needle}`));

assert(html.includes("js/38-evidence-pack-builder.js"), "HTML must load evidence pack builder before rewrite orchestrator");
assert(html.includes("js/37-deepseek-rewrite-orchestrator.js"), "HTML must load rewrite orchestrator");
assert(llm.includes("runEvidenceRewriteOrchestrator"), "post-confirm generation must use rewrite orchestrator");
assert(report.includes("rewriteStatus"), "report model must expose rewriteStatus");
assert(prompts.includes("不要解释方法论"), "DeepSeek prompt must ban methodology narration");
assert(prompts.includes("第一句必须"), "DeepSeek prompt must enforce conclusion-first text");

console.log("deepseek-rewrite-orchestrator-contract-ok");
