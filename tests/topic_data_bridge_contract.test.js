const fs = require("fs");
const assert = require("assert/strict");

const analysis = fs.readFileSync("js/05-analysis.js", "utf8");
const css = fs.readFileSync("styles/app.css", "utf8");

[
  "function readyQualityForMetric",
  "function topicAvailableFacts",
  "function topicDataBoundaryFacts",
  "数据状态",
  "缺失原因",
  "数据来源",
  "抓取来源",
  "核心证据",
  "数据边界"
].forEach((needle) => {
  assert(analysis.includes(needle), `topic data bridge missing: ${needle}`);
});

assert(
  analysis.includes("facts.filter(isFactUsableAsEvidence)") &&
    !analysis.includes("return picked.length >= 2 ? picked : facts.slice"),
  "topic citations must only fall back to usable evidence, not missing facts",
);

[
  ".topic-data-sections",
  ".topic-data-boundary",
  ".topic-status-pill"
].forEach((needle) => {
  assert(css.includes(needle), `topic data bridge missing CSS: ${needle}`);
});

console.log("topic-data-bridge-contract-ok");
