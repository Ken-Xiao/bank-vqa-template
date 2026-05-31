const fs = require("fs");

const root = process.cwd();

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

const css = fs.readFileSync(`${root}/styles/app.css`, "utf8");

assert(/\.analysis-roadmap\s*\{[^}]*float:\s*right/s.test(css), "analysis roadmap should remain right rail");
assert(/\.analysis-roadmap-steps\s*\{[^}]*grid-template-columns:\s*1fr/s.test(css), "roadmap steps should remain vertical");
assert(/@media\s*\(max-width:\s*900px\)[\s\S]*\.analysis-roadmap\s*\{[\s\S]*float:\s*none/s.test(css), "mobile should disable right float");
assert(/\.formal-peer-matrix\s*\{[^}]*table-layout:\s*fixed/s.test(css), "formal peer matrix should remain fixed layout");
assert(/\.metric-explorer-trend-table\s+th,\s*\.metric-explorer-trend-table\s+td\s*\{[^}]*overflow-wrap:\s*anywhere/s.test(css), "metric trend table should keep long text wrapping");

console.log("sprint6b-layout-visual-contract-ok");
