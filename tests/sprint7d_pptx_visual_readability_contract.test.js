const fs = require("fs");
const assert = require("assert/strict");

const qa = fs.readFileSync("js/30-export-sequence-qa.js", "utf8");
const checks = fs.readFileSync("js/16-trial-checks.js", "utf8");
const pptx = fs.readFileSync("js/13-pptx-export.js", "utf8");

[
  "function pptxVisualReadabilityRows",
  "function pptxVisualReadabilitySummary",
  "PPTX视觉可读性",
  "PPTX可读性",
  "标题过长",
  "证据块不足",
  "文本密度偏高",
  "口径提示不足",
  "pptxLayout"
].forEach((needle) => assert(qa.includes(needle), `missing ${needle}`));

assert(qa.includes("routeFailures = routeRows.filter((row) => row.状态 === \"bad\")"), "warnings should not block export gate");
assert(checks.includes("pptx-visual-readability"), "trial readiness must expose PPTX visual readability");
assert(checks.includes("证据块") && checks.includes("口径提示"), "trial readiness should describe PPTX evidence and note coverage");
assert(pptx.includes("addStorylineEvidenceBlocks"), "PPTX export must include storyline evidence blocks");
assert(pptx.includes("pptxStorylineLayout"), "PPTX export must map storyline layout intents");

console.log("sprint7d-pptx-visual-readability-contract-ok");
