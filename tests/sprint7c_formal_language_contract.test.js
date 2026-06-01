const fs = require("fs");
const assert = require("assert/strict");

const formal = fs.readFileSync("js/22-formal-report.js", "utf8");
const css = fs.readFileSync("styles/app.css", "utf8");

[
  "function formalLanguageReadout",
  "function formalSoWhatStrip",
  "function formalChartInterpretation",
  "step2LanguageIntensity",
  "表达强度",
  "证据锚点",
  "So What",
  "管理含义",
  "读图结论",
  "formalSoWhatStrip(topicKey, row, peerRecords())",
  "formalChartInterpretation(topicKey, row, peerRecords())"
].forEach((needle) => assert(formal.includes(needle), `formal report language layer missing: ${needle}`));

[
  ".formal-so-what",
  ".formal-chart-readout",
  ".formal-so-what.tone-L1",
  ".formal-so-what.tone-L3"
].forEach((needle) => assert(css.includes(needle), `formal report language style missing: ${needle}`));

assert(!/低估[。；,，]/.test(formal), "formal language should avoid direct low-valuation phrasing without qualification");

console.log("sprint7c-formal-language-contract-ok");
