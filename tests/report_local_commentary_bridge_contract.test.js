const fs = require("fs");
const assert = require("assert/strict");

const reportModel = fs.readFileSync("js/35-report-model.js", "utf8");

[
  "function reportModelLocalRewrite",
  "function reportModelTopicIdFromSection",
  "function reportModelPrimaryChannel",
  "const resolvedRewrite = rewrite?.text ? rewrite : localRewrite",
  "rewriteBridge:"
].forEach((needle) => assert(reportModel.includes(needle), `report commentary bridge missing: ${needle}`));

[
  "getBankCommentary",
  "getEvidenceMapCommentary",
  "getReportTopicNarratives",
  "bankCommentary",
  "evidenceMapCommentary",
  "topicNarratives",
  "local_synced"
].forEach((needle) => assert(reportModel.includes(needle), `report model must sync local commentary source: ${needle}`));

assert(reportModel.indexOf("const resolvedRewrite = rewrite?.text ? rewrite : localRewrite") > reportModel.indexOf("const localRewrite = reportModelLocalRewrite"),
  "explicit reportRewrites must remain the priority over local commentary fallback");

console.log("report-local-commentary-bridge-contract-ok");
