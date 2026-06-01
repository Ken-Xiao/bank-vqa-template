const fs = require("fs");
const assert = require("assert/strict");

const formal = fs.readFileSync("js/22-formal-report.js", "utf8");
const exportJs = fs.readFileSync("js/07-export.js", "utf8");
const pptx = fs.readFileSync("js/13-pptx-export.js", "utf8");
const qa = fs.readFileSync("js/30-export-sequence-qa.js", "utf8");

[
  "function formalReportModel",
  "htmlRoute",
  "pdfRoute",
  "pptxRoute",
  "section",
  "pageRole",
  "deckType"
].forEach((needle) => assert(formal.includes(needle), `formal report model missing: ${needle}`));

[
  "formalReportModel(wrapper)",
  "reportModel",
  "sectionCount = reportModel.length"
].forEach((needle) => assert(exportJs.includes(needle), `HTML export must consume report model: ${needle}`));

[
  "formalReportModel()",
  "model.map((item) => item.section)"
].forEach((needle) => assert(pptx.includes(needle), `PPTX export must consume report model: ${needle}`));

[
  "formalReportModel(root)",
  "HTML链路",
  "PDF链路",
  "PPTX链路",
  "browserPrintFormalReport"
].forEach((needle) => assert(qa.includes(needle), `sequence QA must expose model route field: ${needle}`));

console.log("sprint7d-report-model-contract-ok");
