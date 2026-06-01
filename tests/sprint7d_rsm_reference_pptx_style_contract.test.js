const fs = require("fs");
const assert = require("assert/strict");

const theme = fs.readFileSync("js/17-rsm-deck-theme.js", "utf8");
const pptx = fs.readFileSync("js/13-pptx-export.js", "utf8");
const qa = fs.readFileSync("js/30-export-sequence-qa.js", "utf8");

[
  "visualProfile: \"sunong-value-creation\"",
  "referenceStyle: \"RSM reference layouts｜sunong_dark_cover + sunong_chart_diagnostic\"",
  "referenceSource: \"rsm-consulting-ppt-skills/assets/layouts\"",
  "primaryDark: \"0D1B2A\"",
  "surface: \"10263D\"",
  "coverMuted: \"B5C8DC\""
].forEach((needle) => assert(theme.includes(needle), `theme missing ${needle}`));

[
  "function pptxReferenceLayoutSpec",
  "sunong_dark_cover",
  "sunong_chart_diagnostic",
  "consulting-diagnostic-audit-deck",
  "consulting-final-deck",
  "presetFamily",
  "canonicalFamily",
  "sourcePreview",
  "图表读法",
  "诊断含义"
].forEach((needle) => assert(pptx.includes(needle), `pptx export missing ${needle}`));

assert(pptx.includes("slide.background = { color: c.primaryDark || \"0D1B2A\" }"), "cover must use the dark Sunong reference style");
assert(pptx.includes("blocks.referenceLayout || pptxReferenceLayoutSpec"), "formal slides must expose reference layout metadata");
assert(qa.includes("参考版式") && qa.includes("版式来源"), "export QA must include reference layout lineage");

console.log("sprint7d-rsm-reference-pptx-style-contract-ok");
