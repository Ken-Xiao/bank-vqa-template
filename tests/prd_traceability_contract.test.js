const fs = require("fs");
const assert = require("assert/strict");

const prd = fs.readFileSync("js/28-prd-traceability.js", "utf8");
const html = fs.readFileSync("index.html", "utf8");

for (let index = 1; index <= 40; index += 1) {
  const id = `PRD-${String(index).padStart(2, "0")}`;
  assert(prd.includes(id), `missing ${id}`);
}

assert(prd.includes("function prdRequirementRows"), "must expose prdRequirementRows");
assert(prd.includes("function renderPrdCoverageDashboard"), "must render dashboard");
assert(prd.includes("function deliveryGateChecks"), "must expose delivery gate checks");
assert(html.includes("prdCoverageDashboard"), "review UI must include PRD dashboard host");

console.log("prd-traceability-contract-ok");
