const fs = require("fs");
const assert = require("assert/strict");

const bootstrap = fs.readFileSync("js/10-bootstrap.js", "utf8");
const narrative = fs.readFileSync("js/12-ai-narrative.js", "utf8");

assert(
  bootstrap.includes("analysisRules = fallbackAnalysisRules()"),
  "bootstrap must seed fallback rules before async config loading",
);
assert(
  bootstrap.indexOf("populateSelectors();") < bootstrap.indexOf("await Promise.all"),
  "Launch selectors must render before async config files are awaited",
);
assert(
  bootstrap.includes("function loadReadyDataLayerScript") && bootstrap.includes("script.async = true"),
  "Ready data layer must be loaded asynchronously after Launch renders",
);
assert(
  bootstrap.indexOf("populateSelectors();") < bootstrap.indexOf("scheduleReadyDataLayerLoad();"),
  "Launch selectors must render before the large Ready data script is requested",
);
assert(
  bootstrap.includes("const providerReady") && bootstrap.includes("providerReady.then"),
  "AI provider config must load in the background after Launch renders",
);
assert(
  bootstrap.includes("initApp().catch"),
  "bootstrap must keep a fallback selector render path if initialization fails",
);
assert(
  narrative.includes("function fallbackAiProviderConfig") && narrative.includes("var aiProviderConfig = fallbackAiProviderConfig()"),
  "AI provider config must default to local mode so DeepSeek setup cannot block Launch",
);

console.log("launch-bootstrap-nonblocking-contract-ok");
