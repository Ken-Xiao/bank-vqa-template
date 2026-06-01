const fs = require("fs");
const assert = require("assert/strict");

const source = fs.readFileSync("js/19-product-workspace.js", "utf8");

assert(source.includes("renderMetricContextRail"), "context rail renderer should exist");
assert(!source.includes("rank.toFixed"), "context rail must treat rankPercentile output as display text");
assert(source.includes("String(rank)"), "context rail should stringify rankPercentile output");

console.log("sprint9c-context-rail-rank-contract-ok");
