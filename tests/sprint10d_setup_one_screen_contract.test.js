const fs = require("fs");
const assert = require("assert/strict");

const css = fs.readFileSync("styles/app.css", "utf8");
const rsmCss = fs.readFileSync("styles/rsm-consulting-ppt.css", "utf8");

[
  "body[data-app-state=\"setup\"] #step1Content",
  "setup-one-screen",
  "grid-template-columns: minmax(620px, 1.08fr) minmax(360px, .92fr)",
  "grid-template-columns: minmax(260px, .82fr) minmax(320px, 1fr)",
  "max-height: 200px !important",
  "body[data-app-state=\"setup\"] .project-briefing-grid",
  "body[data-app-state=\"setup\"] .selection-intro p",
  "body[data-app-state=\"setup\"] .quick-launch-panel",
  "body[data-app-state=\"setup\"] .setup-secondary-column"
].forEach((needle) => {
  assert(css.includes(needle), `Setup one-screen layout missing ${needle}`);
});

assert(css.includes("overflow: auto"), "Setup one-screen panels should scroll internally instead of pushing the whole page");
assert(css.includes("body[data-app-state=\"setup\"] .control-surface > .actions"), "Setup confirmation actions should have a dedicated action row");
assert(!css.includes("\n      height: calc(100vh - var(--global-bar-height) - 30px);"), "Setup shell should not hard-clip the bottom of the layout");
assert(rsmCss.includes("body[data-app-state=\"setup\"] .setup-primary-column .filters"), "RSM setup override should prevent hidden filter rows from adding blank height");
assert(rsmCss.includes("grid-template-areas: \"target\" !important;"), "Setup primary filters should keep only the target row");

console.log("sprint10d-setup-one-screen-contract-ok");
