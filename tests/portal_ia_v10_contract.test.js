const fs = require("fs");
const assert = require("assert/strict");

const html = fs.readFileSync("index.html", "utf8");
const css = fs.readFileSync("styles/app.css", "utf8");
const state = fs.readFileSync("js/01-state.js", "utf8");
const router = fs.readFileSync("js/42-portal-router.js", "utf8");
const rail = fs.readFileSync("js/43-page-rail.js", "utf8");

[
  'id="pageRail"',
  'aria-label="六页任务流"',
  'data-app-page="launch"'
].forEach((needle) => assert(html.includes(needle), `missing Portal shell marker: ${needle}`));

[
  "activePortalPage",
  "launch"
].forEach((needle) => assert(state.includes(needle), `state must track Portal page: ${needle}`));

[
  "function setPortalPage",
  "设定口径",
  "经营质量",
  "证据地图",
  "专题分析",
  "报告工作室",
  "数据复核",
  "PORTAL_PAGE_SUMMARY",
  "核心指标",
  "市净率信号",
  "机制深钻"
].forEach((needle) => assert(router.includes(needle), `router must expose Portal IA v10 item: ${needle}`));

[
  "专题中心",
  "专题深钻",
  "topicDetail: \"专题深钻\""
].forEach((needle) => assert(!router.includes(needle), `router must merge old topic pages: ${needle}`));

[
  "Launch",
  "Executive",
  "Evidence",
  "Topics",
  "Deep Dive",
  "Studio",
  "Validation",
  "PORTAL_PAGE_EN"
].forEach((needle) => assert(!router.includes(needle), `router must not expose English rail label: ${needle}`));

[
  "function renderPageRail",
  "data-page-link",
  "data-sub-anchor"
].forEach((needle) => assert(rail.includes(needle), `page rail must render Portal rail: ${needle}`));

[
  ".page-rail",
  ".rail-primary",
  ".rail-sub",
  '--page-rail-width'
].forEach((needle) => assert(css.includes(needle), `CSS must style compact Portal rail: ${needle}`));

console.log("portal-ia-v10-contract-ok");
