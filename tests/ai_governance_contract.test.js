const fs = require("fs");
const assert = require("assert/strict");

const gov = fs.readFileSync("js/29-ai-governance.js", "utf8");
const html = fs.readFileSync("index.html", "utf8");

assert(gov.includes("function factPackRegistryRows"), "must expose factPackRegistryRows");
assert(gov.includes("function narrativeAuditRows"), "must expose narrativeAuditRows");
assert(gov.includes("function toggleNarrativeLock"), "must support narrative locking");
assert(gov.includes("function renderAiGovernancePanel"), "must render AI governance panel");
assert(html.includes("aiGovernancePanel"), "review UI must include AI governance host");

console.log("ai-governance-contract-ok");
