const fs = require("fs");
const assert = require("assert/strict");

const css = fs.readFileSync("styles/app.css", "utf8");
const rsmCss = fs.readFileSync("styles/rsm-consulting-ppt.css", "utf8");

[
  "body[data-app-page] {",
  "overflow-y: auto",
  "body[data-app-page] main.app",
  "margin-left: var(--page-rail-width)",
  "width: calc(100vw - var(--page-rail-width))",
  "min-height: calc(100vh - var(--global-bar-height))",
  "body[data-app-page] .workspace",
  "max-width: none",
  "padding-left: 0",
  "padding-right: 0",
  "body[data-app-page] [data-portal-page]",
  "min-height: 0",
  "scroll-margin-top: calc(var(--global-bar-height) + 12px)",
  "@media (max-width: 760px)"
].forEach((needle) => assert(css.includes(needle), `Portal full-panel layout CSS missing: ${needle}`));

assert(!css.includes("body[data-app-page] main.app,\n    body[data-app-page] .workspace {\n      padding-left: calc(var(--page-rail-width) + 12px);"), "right panel must not use old double left padding");
assert(!css.includes("body[data-app-page] {\n      overflow: hidden;"), "Portal body must scroll through theme pages");
assert(!css.includes("body[data-app-page] [data-portal-page] {\n      min-height: calc(100vh - var(--global-bar-height) - 28px);\n      max-height: calc(100vh - var(--global-bar-height) - 28px);"), "Portal theme pages must not be hard clipped to one viewport");
assert(!css.includes("body[data-app-page] [data-portal-page] {\n      min-height: calc(100vh - var(--global-bar-height) - 28px);"), "Portal theme pages must not be stretched to fill one viewport");

[
  "body[data-app-page] .workspace",
  "padding-left: 0",
  "padding-right: 0",
  "body[data-app-page] main.app",
  "margin-left: var(--page-rail-width)",
  "width: calc(100vw - var(--page-rail-width))"
].forEach((needle) => assert(rsmCss.includes(needle), `RSM override CSS must preserve Portal full-panel layout: ${needle}`));

assert(
  !rsmCss.includes("body:not(.analysis-ready) .workspace,\nbody.analysis-ready .workspace"),
  "legacy RSM workspace padding must not apply to Portal pages"
);

console.log("portal-full-panel-layout-contract-ok");
