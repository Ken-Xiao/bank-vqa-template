const fs = require("fs");
const assert = require("assert/strict");

const html = fs.readFileSync("index.html", "utf8");
const workspace = fs.readFileSync("js/19-product-workspace.js", "utf8");
const llm = fs.readFileSync("js/33-llm-commentary.js", "utf8");
const css = fs.readFileSync("styles/app.css", "utf8");

[
  'id="step2EvidenceCommentary"',
  'id="step2EvidenceCommentaryText"',
  'id="step2EvidenceLinkage"'
].forEach((needle) => {
  assert(html.includes(needle), `Evidence map page missing commentary container: ${needle}`);
});

[
  "function evidenceMapFactPack",
  "function evidenceMapPrompt",
  "function generateEvidenceMapCommentaryAsync",
  "function updateEvidenceMapCommentaryPanel",
  "结论先行",
  "不要解释方法论"
].forEach((needle) => {
  assert(llm.includes(needle), `LLM commentary layer missing evidence map support: ${needle}`);
});

assert(
  llm.includes("await generateEvidenceMapCommentaryAsync(true)") &&
    llm.includes("updateEvidenceMapCommentaryPanel();"),
  "Post-confirm model generation must refresh evidence map commentary",
);

assert(
  workspace.includes("renderStep2TopChanges(step2TopChangesModel(row, peers))") &&
    workspace.includes("updateEvidenceMapCommentaryPanel"),
  "Evidence map render must refresh commentary and top deviations",
);

[
  ".step2-evidence-commentary",
  ".evidence-linkage-grid",
  ".change-chip-grid"
].forEach((needle) => {
  assert(css.includes(needle), `Evidence map commentary CSS missing: ${needle}`);
});

console.log("evidence-map-commentary-contract-ok");
