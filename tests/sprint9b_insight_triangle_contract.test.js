const fs = require("fs");
const assert = require("assert/strict");

const html = fs.readFileSync("index.html", "utf8");
const analysis = fs.readFileSync("js/05-analysis.js", "utf8");
const workbench = fs.existsSync("js/34-decision-workbench.js") ? fs.readFileSync("js/34-decision-workbench.js", "utf8") : "";
const bootstrap = fs.readFileSync("js/10-bootstrap.js", "utf8");
const css = fs.readFileSync("styles/app.css", "utf8");

[
  "function topicQuestionTitle",
  "function topicInsightTriangle",
  "currentValue",
  "trendDirection",
  "mechanismExplanation"
].forEach((needle) => assert(workbench.includes(needle), `Decision workbench missing ${needle}`));

[
  "topicQuestionTitle(topic.id)",
  "topic-insight-triangle"
].forEach((needle) => assert(analysis.includes(needle), `Topic render missing ${needle}`));

[
  ".topic-insight-triangle",
  ".topic-insight-triangle div"
].forEach((needle) => assert(css.includes(needle), `Topic insight triangle style missing ${needle}`));

assert(html.includes("js/34-decision-workbench.js"), "HTML should load decision workbench module");
assert(bootstrap.includes("initDecisionWorkbenchModule"), "bootstrap should initialize decision workbench");

console.log("sprint9b-insight-triangle-contract-ok");
