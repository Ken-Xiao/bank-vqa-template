const fs = require("fs");
const assert = require("assert/strict");

const formal = fs.readFileSync("js/22-formal-report.js", "utf8");
const qa = fs.readFileSync("js/30-export-sequence-qa.js", "utf8");

[
  "function formalDeliveryStorylineModel",
  "storyRole",
  "layoutIntent",
  "evidenceDensity",
  "htmlLayout",
  "pdfLayout",
  "pptxLayout",
  "opening",
  "answer",
  "evidence",
  "mechanism",
  "scenario",
  "action",
  "appendix"
].forEach((needle) => assert(formal.includes(needle), `delivery storyline model missing: ${needle}`));

[
  "deliveryStorylineQaRows",
  "缺少故事角色",
  "PPTX页型"
].forEach((needle) => assert(qa.includes(needle), `sequence QA must inspect delivery storyline: ${needle}`));

console.log("sprint7d-delivery-storyline-contract-ok");
