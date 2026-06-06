const fs = require("fs");
const assert = require("assert/strict");

const selection = fs.readFileSync("js/04-ui-selection.js", "utf8");
const narrative = fs.readFileSync("js/12-ai-narrative.js", "utf8");
const commentary = fs.readFileSync("js/33-llm-commentary.js", "utf8");
const docs = fs.readFileSync("docs/llm-commentary-integration.md", "utf8");

assert(selection.includes("runPostConfirmModelGeneration"), "confirm analysis should trigger automatic model generation");
assert(selection.includes("void runPostConfirmModelGeneration"), "confirm handler should not block page navigation while model text generates");

[
  "function generateTopicNarrativesWithAiForTopic",
  "state.editedNarratives[narrativeStorageKey(topicId, channel)]",
  "generateTopicNarrativeDraftAsync(topic, facts, channel)"
].forEach((needle) => assert(narrative.includes(needle), `topic narrative module missing auto-generation helper: ${needle}`));

[
  "async function runPostConfirmModelGeneration",
  "[\"board\", \"market\", \"action\"]",
  "generateBankCommentaryAsync(channel, true)",
  "topicDefinitions().map((topic) => topic.id)",
  "generateTopicNarrativesWithAiForTopic(topicId)",
  "state.autoModelGeneration",
  "globalVqaSignal",
  "模型正在生成",
  "模型解读已生成"
].forEach((needle) => assert(commentary.includes(needle), `bank commentary module missing automatic generation flow: ${needle}`));

assert(docs.includes("形成分析结果后自动调用模型接口"), "docs must explain post-confirm automatic generation");

console.log("auto-model-generation-contract-ok");
