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

const topicLayout = block(".topic-board-layout");
assert(/grid-template-columns:\s*repeat\(2,\s*minmax\(0,\s*1fr\)\)/.test(topicLayout), "topic board should use a stable 2-column layout instead of four cramped columns");

assert(/\.topic-mechanism-panel\s*\{[^}]*grid-column:\s*span 2/.test(css), "topic mechanism panel should span the topic board width");

const topicFact = block(".topic-fact-table");
assert(/table-layout:\s*fixed/.test(topicFact), "topic fact table should use fixed layout");

const topicFactCells = blockByRegex("\\.topic-fact-table th,\\s*\\.topic-fact-table td");
assert(/overflow-wrap:\s*anywhere/.test(topicFactCells), "topic fact table cells should wrap long text");

const standardTable = block(".table");
assert(/table-layout:\s*fixed/.test(standardTable), "standard report table should use fixed layout");

const standardCells = blockByRegex("\\.table th,\\s*\\.table td");
assert(/overflow-wrap:\s*anywhere/.test(standardCells), "standard table cells should wrap long text");

const formalFact = block(".formal-fact-table");
assert(/table-layout:\s*fixed/.test(formalFact), "formal report fact table should use fixed layout");

const chartCard = block(".chart-card");
assert(/padding:\s*16px/.test(chartCard), "chart cards should use tighter padding for visual rhythm");
assert(/margin-top:\s*18px/.test(chartCard), "chart cards should use tighter vertical spacing");

const analysisJs = fs.readFileSync(`${root}/js/05-analysis.js`, "utf8");
assert(analysisJs.includes("topic-next-actions"), "topic workbench should include bottom next-step actions");
assert(analysisJs.includes("查看数据口径"), "topic next actions should guide users to data validation");
assert(analysisJs.includes("审阅正式报告"), "topic next actions should guide users to report review");

console.log("sprint6-layout-governance-ok");
