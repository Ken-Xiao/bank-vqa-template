const fs = require("fs");
const assert = require("assert/strict");

const html = fs.readFileSync("index.html", "utf8");
const v5 = fs.readFileSync("js/26-v5-value-engine.js", "utf8");
const css = fs.readFileSync("styles/app.css", "utf8");

[
  "function v5ConsultingReadoutHtml",
  "function v5PbReadout",
  "PB 估值答案",
  "PB 提升路径",
  "异动雷达",
  "管理含义",
  "v5ConsultingReadoutHtml(v5PbReadout(row))"
].forEach((needle) => assert(v5.includes(needle), `V5 consulting readout missing ${needle}`));

[
  "PB 是否由经营质量解释",
  "扰动还是结构性偏离",
  "先修哪个因子才影响 PB"
].forEach((needle) => assert(html.includes(needle), `V5 card title should be assertion-led: ${needle}`));

[
  ".v5-consulting-readout",
  ".v5-consulting-readout.tone-red",
  ".v5-consulting-readout > b",
  ".v5-consulting-readout em"
].forEach((needle) => assert(css.includes(needle), `V5 consulting style missing ${needle}`));

console.log("sprint7c-v5-consulting-readout-contract-ok");
