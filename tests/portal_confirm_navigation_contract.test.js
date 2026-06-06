const fs = require("fs");
const assert = require("assert/strict");

const selection = fs.readFileSync("js/04-ui-selection.js", "utf8");

assert(selection.includes('setPortalPage("answer"'), "confirm selection must route into the answer page");
assert(selection.includes('setAppMode("analysis"'), "confirm selection should keep legacy analysis mode in sync");

console.log("portal-confirm-navigation-contract-ok");
