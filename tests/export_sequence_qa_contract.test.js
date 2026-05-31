const fs = require("fs");
const assert = require("assert/strict");

const qa = fs.readFileSync("js/30-export-sequence-qa.js", "utf8");
const html = fs.readFileSync("index.html", "utf8");
const checks = fs.readFileSync("js/16-trial-checks.js", "utf8");
const exportJs = fs.readFileSync("js/07-export.js", "utf8");

[
  "function reportSequenceRows",
  "function exportSequenceQaRows",
  "function exportSequenceGateChecks",
  "function exportSequenceQaExportRows",
  "function renderExportSequenceQaPanel",
  "function initExportSequenceQaModule"
].forEach((needle) => assert(qa.includes(needle), `missing ${needle}`));

assert(qa.includes("formalReportSections"), "sequence QA must read the formal report contract");
assert(qa.includes("HTML") && qa.includes("PDF") && qa.includes("PPTX"), "sequence QA must compare HTML/PDF/PPTX routes");
assert(html.includes("exportSequenceQaPanel"), "review UI must include export sequence QA host");
assert(html.includes("js/30-export-sequence-qa.js"), "HTML must load export sequence QA module before bootstrap");
assert(checks.includes("exportSequenceGateChecks"), "preflight checks must include sequence gate");
assert(exportJs.includes("导出页序QA") && exportJs.includes("exportSequenceQaExportRows"), "workbook must export sequence QA sheet");

console.log("export-sequence-qa-contract-ok");
