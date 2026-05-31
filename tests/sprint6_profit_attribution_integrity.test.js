const fs = require("fs");
const vm = require("vm");

const root = process.cwd();

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

const context = {
  console,
  window: {},
  document: { getElementById: () => null, querySelector: () => null, querySelectorAll: () => [] }
};

vm.createContext(context);
[
  "data.js",
  "js/01-state.js",
  "js/02-config.js",
  "js/03-data-format.js",
  "js/20-pro-engine.js"
].forEach((file) => {
  vm.runInContext(fs.readFileSync(`${root}/${file}`, "utf8"), context, { filename: file });
});

context.state.target = "苏州农商行";
context.state.year = 2025;

assert(!context.metricDisplayValue("netProfit", 123456.7).includes("%"), "net profit should render as money, not a percentage");
assert(/亿元|万元/.test(context.metricDisplayValue("netProfit", 123456.7)), "net profit should render with money units");

const row = context.targetRecord();
const prev = context.proPrevRecord(row);
const pack = context.netProfitAttribution(row);
assert(pack, "profit attribution should be available for the selected target");

const itemSum = pack.items.reduce((sum, item) => sum + item.value, 0);
assert(Math.abs(itemSum - pack.total) < 0.01, "profit waterfall items should close exactly to net profit delta");
assert(Math.abs(pack.to - pack.from - pack.total) < 0.01, "profit waterfall total should equal current minus previous net profit");

const ppopDelta = row.ppop - prev.ppop;
const operatingItems = pack.items.filter((item) => item.layer === "ppop");
const operatingSum = operatingItems.reduce((sum, item) => sum + item.value, 0);
assert(Math.abs(operatingSum - ppopDelta) < 0.01, "operating drivers should close to PPOP delta before credit/tax effects");
assert(pack.items.some((item) => item.key === "netInterestIncome" && item.label.includes("利息净收入")), "waterfall should use actual net interest income delta");
assert(pack.items.some((item) => item.key === "creditTaxOther" && item.label.includes("拨备")), "waterfall should isolate credit, tax and other below-PPOP effects");
assert(!pack.items.some((item) => item.key === "scale"), "waterfall should not mix estimated scale driver with income statement deltas");

console.log("sprint6-profit-attribution-integrity-ok");
