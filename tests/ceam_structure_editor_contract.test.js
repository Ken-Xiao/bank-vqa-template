const fs = require("fs");
const assert = require("assert/strict");

const ceam = fs.readFileSync("js/31-ceam-structure-editor.js", "utf8");
const html = fs.readFileSync("index.html", "utf8");
const narrative = fs.readFileSync("js/12-ai-narrative.js", "utf8");
const projects = fs.readFileSync("js/09-projects.js", "utf8");
const exportJs = fs.readFileSync("js/07-export.js", "utf8");

[
  "function ceamNarrativeBlock",
  "function ceamNarrativeText",
  "function reportStructureRows",
  "function applyReportStructureToState",
  "function reportStructureExportRows",
  "function ceamNarrativeExportRows",
  "function renderReportStructureEditor",
  "function initCeamStructureEditorModule"
].forEach((needle) => assert(ceam.includes(needle), `missing ${needle}`));

["Challenge", "Claim", "Evidence", "Attribution", "Meaning"].forEach((label) => {
  assert(ceam.includes(label), `CEAM block must include ${label}`);
});

assert(ceam.includes("formalReportSections"), "structure editor must read the formal report contract");
assert(html.includes("reportStructureEditor"), "review UI must include report structure editor host");
assert(html.includes("js/31-ceam-structure-editor.js"), "HTML must load CEAM structure module before bootstrap");
assert(narrative.includes("ceamNarrativeBlock"), "AI narrative generation must use CEAM blocks");
assert(projects.includes("reportStructure") && projects.includes("customReportPages"), "projects must persist structure settings");
assert(exportJs.includes("CEAM叙事结构") && exportJs.includes("报告结构编辑"), "workbook must export CEAM and structure sheets");

console.log("ceam-structure-editor-contract-ok");
