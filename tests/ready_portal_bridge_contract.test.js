const assert = require("assert");
const fs = require("fs");
const path = require("path");

const ROOT = path.resolve(__dirname, "..");
const read = (rel) => fs.readFileSync(path.join(ROOT, rel), "utf8");

const html = read("index.html");
const stateJs = read("js/01-state.js");
const formatJs = read("js/03-data-format.js");
const css = read("styles/app.css");

assert(
  html.includes('<script src="data_ready.js?v=20260605-ready-v1"'),
  "index.html must load data_ready.js before state initialization",
);
assert(
  html.indexOf("data_ready.js?v=20260605-ready-v1") < html.indexOf("js/01-state.js"),
  "data_ready.js must load before js/01-state.js",
);
assert(
  html.includes('id="readyDataBridgePanel"'),
  "Validation page must include Ready bridge panel",
);
assert(
  html.includes('id="readyDataComparisonBody"'),
  "Validation page must include Ready comparison table body",
);

assert(
  stateJs.includes("var readyData = window.VQA_DATA_READY"),
  "state module must read VQA_DATA_READY",
);
assert(
  stateJs.includes("readyData.records") && stateJs.includes("readyMetricQuality"),
  "state module must expose Ready records and metric quality",
);
assert(
  stateJs.includes('creditCardLoanNpl: "信用卡贷款不良率"'),
  "state module must provide Chinese label for credit card loan NPL",
);
assert(
  stateJs.includes('peTtm: "市盈率"') && stateJs.includes('cashflowInvAct: "投资活动现金流净额"'),
  "state module must provide Chinese labels for market and cash-flow fields",
);

assert(
  formatJs.includes("function renderReadyDataBridge()"),
  "data formatting module must render Ready bridge",
);
assert(
  formatJs.includes("readyQualityStatusMeta") && formatJs.includes("scraped_available_not_fieldized"),
  "Ready bridge must map governed missing reasons",
);
assert(
  formatJs.includes("renderReadyDataBridge();"),
  "updateDataCoverage must refresh Ready bridge",
);

assert(
  css.includes(".ready-data-bridge") && css.includes(".ready-status-pill"),
  "CSS must style Ready data bridge and status pills",
);

console.log("ready_portal_bridge_contract passed");
