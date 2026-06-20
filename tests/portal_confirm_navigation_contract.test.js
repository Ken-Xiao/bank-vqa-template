const fs = require("fs");
const assert = require("assert/strict");

const selection = fs.readFileSync("js/04-ui-selection.js", "utf8");

assert(selection.includes('setPortalPage("benchmark"'), "confirm selection must route into the data benchmark page");
assert(selection.includes('setAppMode("benchmark"'), "confirm selection must keep the app in benchmark mode, not trigger analysis rendering");
assert(selection.includes("requestAnimationFrame"), "confirm selection should defer heavy generation work to keep the first page responsive");

const confirmBody = selection.match(/function doConfirmSelection[\s\S]*?\n  }\n\n  \/\/ 自动确认/);
assert(confirmBody, "confirm selection helper must remain explicit and testable");
assert(!confirmBody[0].includes("renderAll()"), "confirm selection must not run full report analysis render before benchmark");
assert(!confirmBody[0].includes("runPostConfirmModelGeneration"), "confirm selection must not trigger model generation before benchmark");
assert(!confirmBody[0].includes("applyReportVersion"), "confirm selection must not rebuild report version before benchmark");

console.log("portal-confirm-navigation-contract-ok");
