const fs = require("fs");
const assert = require("assert/strict");

const printCss = fs.readFileSync("styles/print.css", "utf8");
const exportJs = fs.readFileSync("js/07-export.js", "utf8");
const qa = fs.readFileSync("js/30-export-sequence-qa.js", "utf8");

[
  "print-color-adjust",
  ".formal-so-what",
  ".formal-chart-readout",
  "table-header-group",
  "break-inside: avoid",
  "formal-profit-waterfall",
  "formal-benchmark-line",
  "formal-nim-bridge"
].forEach((needle) => assert(printCss.includes(needle), `print CSS must protect PDF readability: ${needle}`));

[
  ".formal-so-what",
  ".formal-chart-readout",
  "print-color-adjust",
  "page-break-inside: avoid",
  "max-height: 160mm",
  ".formal-section tr"
].forEach((needle) => assert(exportJs.includes(needle), `HTML export inline print CSS missing: ${needle}`));

[
  "function pdfReadabilityChecks",
  "PDF可读性",
  "So What",
  "读图结论",
  "打印样式缺少",
  "pdfReadability"
].forEach((needle) => assert(qa.includes(needle), `export QA must include PDF readability check: ${needle}`));

console.log("sprint7d-pdf-readability-contract-ok");
