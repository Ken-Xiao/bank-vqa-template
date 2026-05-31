const fs = require("fs");
const assert = require("assert/strict");

const html = fs.readFileSync("index.html", "utf8");
const css = fs.readFileSync("styles/app.css", "utf8");
const workspace = fs.readFileSync("js/19-product-workspace.js", "utf8");

assert(html.includes("reportFirstWorkspace"), "HTML must expose report-first workspace shell");
assert(html.includes("reportFirstMain"), "HTML must expose central report canvas column");
assert(html.includes("reportControlRail"), "HTML must expose persistent right report control rail");
assert(html.indexOf("formalReportShell") < html.indexOf("reportControlRail"), "report canvas must precede control rail in reading order");
assert(css.includes(".report-first-workspace"), "CSS must style report-first workspace");
assert(css.includes(".report-control-rail"), "CSS must style persistent report control rail");
assert(css.includes("body.analysis-ready:not(.setup-expanded) .control-surface"), "CSS must keep setup compact after analysis is ready");
assert(workspace.includes('setWorkspaceTab("report")'), "report mode must still route to report workspace");
assert(workspace.includes("document.body.dataset.appState"), "v7 shell must expose app state routing");

console.log("report-first-layout-contract-ok");
