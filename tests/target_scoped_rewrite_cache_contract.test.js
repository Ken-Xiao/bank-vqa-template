const fs = require("fs");
const assert = require("assert/strict");

const selection = fs.readFileSync("js/04-ui-selection.js", "utf8");
const orchestrator = fs.readFileSync("js/37-deepseek-rewrite-orchestrator.js", "utf8");
const pkg = fs.readFileSync("package.json", "utf8");

[
  "function analysisSelectionKey",
  "function clearGeneratedNarrativeCaches",
  "state.bankCommentaries = {}",
  "state.evidenceMapCommentary = null",
  "state.generatedRewrites = {}",
  "state.reportRewrites = {}",
  "state.editedNarratives = {}"
].forEach((needle) => assert(selection.includes(needle), `selection missing ${needle}`));

assert(selection.includes("clearGeneratedNarrativeCaches(\"target-change\")"), "target changes must clear stale generated text");
assert(selection.includes("clearGeneratedNarrativeCaches(\"confirm-selection\")"), "confirm selection must clear stale generated text before rendering");
assert(orchestrator.includes("rewriteSelectionKey"), "rewrite blocks must carry selected-bank scope");
assert(orchestrator.includes("currentAnalysisSelectionKey"), "orchestrator must compare current selected-bank scope");
assert(orchestrator.includes("narrativeStorageKey(block.topicId, block.channel)"), "topic rewrites must use the same flat storage key as the UI");
assert(pkg.includes("target_scoped_rewrite_cache_contract.test.js"), "test suite must include target-scoped rewrite cache contract");

console.log("target-scoped-rewrite-cache-contract-ok");
