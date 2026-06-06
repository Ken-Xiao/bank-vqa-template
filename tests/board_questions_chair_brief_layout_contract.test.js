const fs = require("fs");
const assert = require("assert/strict");

const workspace = fs.readFileSync("js/19-product-workspace.js", "utf8");
const css = fs.readFileSync("styles/app.css", "utf8");

[
  "step2-question-note",
  "本轮会议不先讨论指标高低",
  "step2-question-stack",
  "step2-question-index",
  "step2-question-body",
  "step2-question-facts"
].forEach((needle) => assert(workspace.includes(needle), `Board question renderer missing chair-brief marker: ${needle}`));

[
  ".step2-question-note",
  ".step2-question-stack",
  ".step2-question-index",
  ".step2-question-body",
  ".step2-question-facts",
  "grid-template-columns: minmax(260px, .78fr) minmax(0, 1.22fr)"
].forEach((needle) => assert(css.includes(needle), `Board question layout CSS missing: ${needle}`));

assert(
  !css.includes(".step2-question-card {\n      display: grid;\n      gap: 10px;\n      min-height: 178px;"),
  "Board question cards should not keep the old tall three-card layout"
);

console.log("board-questions-chair-brief-layout-contract-ok");
