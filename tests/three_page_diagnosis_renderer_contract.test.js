const fs = require("fs");
const assert = require("assert/strict");

const html = fs.readFileSync("index.html", "utf8");
const renderer = fs.readFileSync("js/64-three-page-diagnosis-renderer.js", "utf8");
const css = fs.readFileSync("styles/app.css", "utf8");

[
  "threePageDiagnosisMount",
  "js/63-three-page-diagnosis-model.js",
  "js/64-three-page-diagnosis-renderer.js",
].forEach((needle) => assert(html.includes(needle), `index must include ${needle}`));

[
  "function renderThreePageDiagnosis",
  "function el",
  "document.createElement",
  "textContent",
  "function renderConclusionSummaryPage",
  "function renderEvidenceMapPage",
  "function renderAttributionPage",
  "function renderThreePageEmptyState",
  "function renderThreePageStaleState",
  "function renderThreePageLoadingState",
  "function renderThreePagePartialState",
  "function renderThreePageErrorState",
  "dataTraceField",
  "dataReportCandidateId",
  "data-three-page-next",
  "replaceChildren",
  "window.renderThreePageDiagnosis = renderThreePageDiagnosis",
].forEach((needle) => assert(renderer.includes(needle), `renderer missing ${needle}`));

[
  ".three-page-diagnosis",
  ".three-page-hero",
  ".three-page-card-grid",
  ".three-page-evidence-map",
  ".three-page-attribution-chain",
  ".three-page-advanced",
].forEach((needle) => assert(css.includes(needle), `css missing ${needle}`));

console.log("three-page-diagnosis-renderer-contract-ok");
