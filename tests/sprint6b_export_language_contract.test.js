const fs = require("fs");

const root = process.cwd();

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

const pptx = fs.readFileSync(`${root}/js/13-pptx-export.js`, "utf8");
const report = fs.readFileSync(`${root}/js/08-report.js`, "utf8");

assert(pptx.includes("pptxConsultingTitle"), "PPTX export should keep consulting title routing");
assert(pptx.includes("pptxManagementImplication"), "PPTX export should expose target-bound implication fallback");
assert(pptx.includes("管理含义"), "PPTX pages should extract management implication text");
assert(report.includes("管理含义"), "report pages should include management implication language");
assert(!/本页仅展示|方法论说明/.test(pptx), "PPTX export should not default to method-only copy");

console.log("sprint6b-export-language-contract-ok");
