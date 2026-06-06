const assert = require("assert/strict");
const fs = require("fs");

const prompt = JSON.parse(fs.readFileSync("config/deepseek_explanation_prompts.json", "utf8"));
const server = fs.readFileSync("server/deepseek-commentary-proxy.js", "utf8");
const commentary = fs.readFileSync("js/33-llm-commentary.js", "utf8");
const docs = fs.readFileSync("docs/llm-commentary-integration.md", "utf8");

const promptText = [
  ...(prompt.system || []),
  JSON.stringify(prompt.schemaInstruction || {}),
  JSON.stringify(prompt.channelRules || {})
].join("\n");

[
  "券商研究员",
  "咨询公司",
  "先给观点",
  "So What",
  "反证",
  "风险边界",
  "不能只解释指标"
].forEach((needle) => assert(promptText.includes(needle), `research-style prompt missing ${needle}`));

[
  "viewpoint",
  "soWhat",
  "counterEvidence",
  "必须有明确观点"
].forEach((needle) => assert(JSON.stringify(prompt.schemaInstruction.requiredJsonShape).includes(needle), `schema missing ${needle}`));

[
  "pkg.viewpoint",
  "pkg.soWhat",
  "pkg.counterEvidence",
  "缺少 viewpoint",
  "缺少 soWhat",
  "缺少 counterEvidence"
].forEach((needle) => assert(server.includes(needle), `server must validate/render research fields: ${needle}`));

[
  "pkg.viewpoint",
  "pkg.soWhat",
  "pkg.counterEvidence",
  "核心观点",
  "管理含义",
  "风险边界"
].forEach((needle) => assert(commentary.includes(needle), `frontend commentary must show research fields: ${needle}`));

assert(docs.includes("券商研究员和咨询公司风格"), "docs must describe the research/consulting writing style");
assert(docs.includes("观点先行"), "docs must explain opinion-led commentary");

console.log("research-consulting-commentary-contract-ok");
