const fs = require("fs");
const assert = require("assert/strict");

const html = fs.readFileSync("index.html", "utf8");
const css = fs.readFileSync("styles/app.css", "utf8");

[
  'id="triSourceValidationPanel"',
  'id="fieldLineageMap"',
  'id="calibrationRulesPanel"'
].forEach((needle) => assert(html.includes(needle), `Data & Validation missing backend bridge container: ${needle}`));

[
  "主数据",
  "Tushare",
  "年报抓取",
  "仅校验",
  "可替换策略",
  "单位 / 符号 / 合并口径"
].forEach((needle) => assert(html.includes(needle), `Data & Validation bridge must explain source role: ${needle}`));

[
  ".data-validation-bridge",
  ".tri-source-grid",
  ".lineage-card",
  ".calibration-rule-list"
].forEach((needle) => assert(css.includes(needle), `Data & Validation bridge missing CSS: ${needle}`));

console.log("data-validation-bridge-contract-ok");
