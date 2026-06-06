const fs = require("fs");
const assert = require("assert/strict");

const commentary = fs.readFileSync("js/33-llm-commentary.js", "utf8");
const narrative = fs.readFileSync("js/12-ai-narrative.js", "utf8");
const orchestrator = fs.readFileSync("js/37-deepseek-rewrite-orchestrator.js", "utf8");

[
  "function localCommentaryStrengthContext",
  "function localCommentaryClaim",
  "function localCommentaryEvidenceSentence",
  "languageStrengthTier",
  "phraseByStrength",
  "pack.displayBank",
  "管理含义"
].forEach((needle) => assert(commentary.includes(needle), `commentary missing ${needle}`));

assert(narrative.includes("function languageStrengthTier"), "local language strength helper must remain available");
assert(narrative.includes("function phraseByStrength"), "local phrasing helper must remain available");
assert(orchestrator.includes("localRewriteFallback"), "orchestrator must keep local fallback path");
assert(orchestrator.includes("reportRewrites"), "orchestrator/report integration must keep report rewrite state");

console.log("local-commentary-strength-contract-ok");
