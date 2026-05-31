const fs = require("fs");
const assert = require("assert/strict");

const checks = fs.readFileSync("js/16-trial-checks.js", "utf8");
const exp = fs.readFileSync("js/07-export.js", "utf8");
const projects = fs.readFileSync("js/09-projects.js", "utf8");
const ai = fs.readFileSync("js/12-ai-narrative.js", "utf8");

assert(checks.includes("deliveryGateChecks"), "preflight must use delivery gate checks");
assert(exp.includes("PRD完成度"), "workbook must export PRD coverage");
assert(exp.includes("事实包注册表"), "workbook must export fact-pack registry");
assert(exp.includes("AI引用审计"), "workbook must export AI audit");
assert(exp.includes("文案锁定状态"), "workbook must export narrative locks");
assert(projects.includes("deliveryReview"), "project snapshot must persist delivery review");
assert(projects.includes("narrativeLocks"), "project snapshot must persist narrative locks");
assert(ai.includes("isNarrativeLocked"), "AI editor must respect narrative locks");

console.log("export-gate-governance-contract-ok");
