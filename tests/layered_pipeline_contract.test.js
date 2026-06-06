const fs = require("fs");
const assert = require("assert/strict");

const html = fs.readFileSync("index.html", "utf8");
const layered = fs.readFileSync("js/36-layered-fact-model.js", "utf8");
const analysis = fs.readFileSync("js/05-analysis.js", "utf8");
const report = fs.readFileSync("js/35-report-model.js", "utf8");
const narrative = fs.readFileSync("js/12-ai-narrative.js", "utf8");
const format = fs.readFileSync("js/03-data-format.js", "utf8");
const css = fs.readFileSync("styles/app.css", "utf8");

assert(html.includes("js/36-layered-fact-model.js"), "index.html must load layered fact model");
assert(layered.includes("function layeredFactModel("), "layeredFactModel must be exported");
assert(layered.includes("evidenceFacts"), "model must expose evidenceFacts");
assert(layered.includes("boundaryFacts"), "model must expose boundaryFacts");
assert(layered.includes("metricQuality"), "model must expose metricQuality");
assert(layered.includes("factPackId"), "model must expose factPackId");
assert(analysis.includes("topicAvailableFacts"), "analysis layer must separate available facts");
assert(analysis.includes("topicDataBoundaryFacts"), "analysis layer must separate data boundary facts");
assert(report.includes("factPackId"), "report model must preserve factPackId");
assert(report.includes("dataWarnings"), "report model must preserve dataWarnings");
assert(narrative.includes("layeredTopicFactModel(topic.id)"), "AI narrative must use layered topic model when available");
assert(html.includes('id="layeredTieoutPanel"'), "Validation page must include layered tieout panel");
assert(format.includes("function renderLayeredTieout()"), "data validation must render layered tieout");
assert(format.includes("renderLayeredTieout();"), "updateDataCoverage must refresh layered tieout");
assert(css.includes(".layered-tieout-row"), "tieout panel must be styled");

console.log("layered-pipeline-contract-ok");
