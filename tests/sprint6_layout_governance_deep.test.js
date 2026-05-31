const fs = require("fs");

const root = process.cwd();
const css = fs.readFileSync(`${root}/styles/app.css`, "utf8");

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function block(selector) {
  const escaped = selector.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const match = css.match(new RegExp(`${escaped}\\s*\\{([\\s\\S]*?)\\}`, "m"));
  return match ? match[1] : "";
}

function blockByRegex(pattern) {
  const match = css.match(new RegExp(`${pattern}\\s*\\{([\\s\\S]*?)\\}`, "m"));
  return match ? match[1] : "";
}

const metricGrid = block(".metric-explorer-grid");
assert(/grid-template-columns:\s*minmax\(0,\s*1fr\)/.test(metricGrid), "Metric Explorer should avoid fixed wide second column");

const metricCard = block(".metric-explorer-card");
assert(/min-width:\s*0/.test(metricCard), "Metric Explorer cards should be shrinkable");

const metricText = blockByRegex("\\.metric-explorer-card p,\\s*\\.metric-explorer-card dd");
assert(/overflow-wrap:\s*anywhere/.test(metricText), "Metric Explorer text should wrap long wording");

const metricTrendCells = blockByRegex("\\.metric-explorer-trend-table th,\\s*\\.metric-explorer-trend-table td");
assert(/overflow-wrap:\s*anywhere/.test(metricTrendCells), "Metric Explorer trend table cells should wrap");

const fieldWrap = block(".field-matrix-table-wrap");
assert(/max-height:\s*300px/.test(fieldWrap), "field matrix should be less vertically dominant");

const coverageWrap = block(".coverage-table-wrap");
assert(/max-height:\s*300px/.test(coverageWrap), "coverage table should cap height to reduce page sprawl");

const formalLead = block(".formal-lead");
assert(/max-width:\s*920px/.test(formalLead), "formal report lead text should have a readable line length");
assert(/overflow-wrap:\s*anywhere/.test(formalLead), "formal report lead text should wrap long content");

const peerWrap = block(".formal-peer-matrix-wrap");
assert(/overflow:\s*auto/.test(peerWrap), "formal peer matrix should scroll instead of overflowing");

const peerTable = block(".formal-peer-matrix");
assert(/min-width:\s*860px/.test(peerTable), "formal peer matrix should keep readable columns inside scroll wrapper");
assert(/table-layout:\s*fixed/.test(peerTable), "formal peer matrix should use fixed columns");

const formalFigureGrid = block(".formal-figure-grid");
assert(/grid-template-columns:\s*repeat\(2,\s*minmax\(0,\s*1fr\)\)/.test(formalFigureGrid), "formal figure appendix should avoid too many columns");

console.log("sprint6-layout-governance-deep-ok");
