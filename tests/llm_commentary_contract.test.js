const fs = require("fs");
const assert = require("assert/strict");

const html = fs.readFileSync("index.html", "utf8");
const bootstrap = fs.readFileSync("js/10-bootstrap.js", "utf8");
const commentary = fs.readFileSync("js/33-llm-commentary.js", "utf8");
const config = JSON.parse(fs.readFileSync("config/ai_provider.json", "utf8"));
const docs = fs.readFileSync("docs/llm-commentary-integration.md", "utf8");

[
  "function bankCommentaryFactPack",
  "function bankCommentaryPrompt",
  "function localBankCommentaryDraft",
  "function callBankCommentaryEndpoint",
  "function generateBankCommentaryAsync",
  "function initLlmCommentaryModule",
  "function bankCommentaryExportRows",
  "kind: \"bank-commentary\"",
  "commentaryEndpoint",
  "fallback"
].forEach((needle) => assert(commentary.includes(needle), `LLM commentary module missing ${needle}`));

[
  "aiCommentaryPanel",
  "aiCommentaryStatus",
  "aiCommentaryPreview",
  "data-bank-commentary-channel=\"board\"",
  "data-bank-commentary-channel=\"market\"",
  "data-bank-commentary-channel=\"action\"",
  "regenerateBankCommentaryAi",
  "js/33-llm-commentary.js"
].forEach((needle) => assert(html.includes(needle), `HTML missing LLM commentary marker ${needle}`));

assert(bootstrap.includes("initLlmCommentaryModule"), "bootstrap should initialize LLM commentary module");
assert(fs.readFileSync("js/22-formal-report.js", "utf8").includes("formalBankCommentaryHtml"), "formal report should include bank commentary block");
assert(fs.readFileSync("js/07-export.js", "utf8").includes("银行级模型评论"), "workbook export should include bank commentary sheet");
assert(Object.prototype.hasOwnProperty.call(config.http, "commentaryEndpoint"), "AI provider config should expose commentaryEndpoint");
assert(docs.includes("/api/llm-commentary"), "integration doc should explain backend proxy endpoint");
assert(docs.includes("不建议在浏览器里放 API key"), "integration doc should warn against frontend API keys");

console.log("llm-commentary-contract-ok");
