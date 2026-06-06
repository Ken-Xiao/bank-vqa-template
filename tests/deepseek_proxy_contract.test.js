const assert = require("assert/strict");
const fs = require("fs");

const server = fs.readFileSync("server/deepseek-commentary-proxy.js", "utf8");
const prompt = JSON.parse(fs.readFileSync("config/deepseek_explanation_prompts.json", "utf8"));
const provider = JSON.parse(fs.readFileSync("config/ai_provider.json", "utf8"));
const pkg = JSON.parse(fs.readFileSync("package.json", "utf8"));
const commentary = fs.readFileSync("js/33-llm-commentary.js", "utf8");
const docs = fs.readFileSync("docs/llm-commentary-integration.md", "utf8");
const envExample = fs.readFileSync(".env.example", "utf8");
const startScript = fs.readFileSync("scripts/start-deepseek-proxy.sh", "utf8");

[
  "DEEPSEEK_API_KEY",
  "function loadDotEnv",
  "loadDotEnv()",
  "https://api.deepseek.com",
  "/api/llm-commentary",
  "/api/llm-narrative",
  "response_format",
  "json_object",
  "validateExplanationPackage",
  "packageClaimValues",
  "localFallbackPackage",
  "commentaryTextFromPackage"
].forEach((needle) => assert(server.includes(needle), `DeepSeek proxy missing ${needle}`));

assert(server.includes("pkg.conclusion"), "proxy should validate numeric claims from conclusion");
assert(server.includes("pkg.mechanism"), "proxy should validate numeric claims from mechanism");
assert(server.includes("item?.text"), "proxy should validate numeric claims from evidence text");
assert(server.includes("item?.action, item?.trackingMetric"), "proxy should validate action claims without scanning action windows");
assert(!server.includes("flattenValues(payload)\n    .flatMap"), "proxy should not validate every structured field as a numeric claim");

assert(["local", "http"].includes(provider.provider), "AI provider should support local default or HTTP proxy mode");
assert.equal(provider.http.commentaryEndpoint, "http://127.0.0.1:8788/api/llm-commentary");
assert.equal(provider.http.endpoint, "http://127.0.0.1:8788/api/llm-narrative");
assert.equal(provider.validation.fallbackToLocal, true);
assert.equal(provider.validation.requireFactPackNumbers, true);

assert.equal(prompt.model, "deepseek-chat");
assert(prompt.system.join("\n").includes("只能使用请求中的 factPack"), "prompt must constrain facts");
assert(prompt.system.join("\n").includes("不得编造任何数字"), "prompt must forbid invented numbers");
assert(prompt.schemaInstruction.requiredJsonShape.actions, "prompt must require action recommendations");
assert(prompt.channelRules.board && prompt.channelRules.market && prompt.channelRules.action, "prompt must define three channels");

[
  "function bankCommentaryTextFromPackage",
  "function normalizeBankCommentaryResponse",
  "function bankCommentaryReadyDataQuality",
  "explanationPackage",
  "readyDataQuality: bankCommentaryReadyDataQuality(pack)",
  "payload.text || payload.content || payload.commentary",
  "remote?.explanationPackage"
].forEach((needle) => assert(commentary.includes(needle), `frontend commentary missing ${needle}`));

assert(docs.includes("server/deepseek-commentary-proxy.js"), "docs must mention proxy file");
assert(docs.includes("DEEPSEEK_API_KEY"), "docs must explain API key environment variable");
assert(docs.includes("npm run deepseek:proxy"), "docs must explain npm proxy startup");
assert(docs.includes("npm run deepseek:local"), "docs must explain local-only smoke mode");
assert(docs.includes("explanationPackage"), "docs must document structured explanation package");

assert.equal(pkg.scripts["deepseek:proxy"], "sh scripts/start-deepseek-proxy.sh");
assert(pkg.scripts["deepseek:local"].includes("DEEPSEEK_PROXY_LOCAL_ONLY=1"), "package must expose local-only proxy test");
assert(pkg.scripts["test:deepseek"].includes("deepseek_proxy_contract.test.js"), "package must expose DeepSeek test command");
assert(envExample.includes("DEEPSEEK_API_KEY=sk-your-deepseek-api-key"), ".env.example must show API key placeholder");
assert(startScript.includes("Missing .env"), "startup script must protect against missing .env");
assert(startScript.includes("using the example placeholder"), "startup script must reject placeholder keys");
assert(startScript.includes("node server/deepseek-commentary-proxy.js"), "startup script must run proxy");

console.log("deepseek-proxy-contract-ok");
