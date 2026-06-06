const fs = require("fs");
const assert = require("assert/strict");

const provider = JSON.parse(fs.readFileSync("config/ai_provider.json", "utf8"));
const orchestrator = fs.readFileSync("js/37-deepseek-rewrite-orchestrator.js", "utf8");
const commentary = fs.readFileSync("js/33-llm-commentary.js", "utf8");

assert.equal(provider.provider, "local", "default commentary provider must be local");
assert(provider.validation?.fallbackToLocal !== false, "fallbackToLocal must remain enabled");
assert(orchestrator.includes('aiProviderConfig?.provider !== "http"'), "orchestrator must skip remote calls unless provider=http");
assert(commentary.includes('aiProviderConfig?.provider !== "http"'), "commentary module must skip remote calls unless provider=http");

console.log("local-commentary-provider-contract-ok");
