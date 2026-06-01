const fs = require("fs");
const assert = require("assert/strict");

const pptx = fs.readFileSync("js/13-pptx-export.js", "utf8");

[
  "pptxStorylineLayout",
  "addStorylineEvidenceBlocks",
  "关键证据",
  "管理含义",
  "口径提示",
  "executive-answer",
  "mechanism-evidence",
  "topic-scr",
  "scenario-check",
  "action-roadmap"
].forEach((needle) => assert(pptx.includes(needle), `PPTX storyline evidence block missing: ${needle}`));

console.log("sprint7d-pptx-evidence-blocks-contract-ok");
