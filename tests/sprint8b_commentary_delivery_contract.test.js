const fs = require("fs");
const assert = require("assert/strict");

const analysis = fs.readFileSync("js/05-analysis.js", "utf8");
const pptx = fs.readFileSync("js/13-pptx-export.js", "utf8");
const css = fs.readFileSync("styles/app.css", "utf8");

[
  "function topicBankCommentaryAnchorHtml",
  "银行级评论锚点",
  "getBankCommentary(\"board\")",
  "getBankCommentary(\"action\")"
].forEach((needle) => assert(analysis.includes(needle), `Topic workbench should expose bank commentary anchor: ${needle}`));

[
  "function pptxBankCommentaryLines",
  "function addPptxBankCommentaryNotes",
  "bank-commentary-notes",
  "getBankCommentary(\"board\")",
  "getBankCommentary(\"action\")"
].forEach((needle) => assert(pptx.includes(needle), `PPTX should expose bank commentary notes: ${needle}`));

[
  ".topic-bank-commentary-anchor",
  ".topic-bank-commentary-anchor article"
].forEach((needle) => assert(css.includes(needle), `Missing Sprint 8B commentary style: ${needle}`));

console.log("sprint8b-commentary-delivery-contract-ok");
