const fs = require("fs");
const assert = require("assert/strict");

const selection = fs.readFileSync("js/04-ui-selection.js", "utf8");

assert(selection.includes('setPortalPage("benchmark"'), "confirm selection must route into the data benchmark page");
assert(selection.includes('setAppMode("analysis"'), "confirm selection should keep legacy analysis mode in sync");
assert(selection.includes("requestAnimationFrame"), "confirm selection should defer heavy generation work to keep the first page responsive");

console.log("portal-confirm-navigation-contract-ok");
