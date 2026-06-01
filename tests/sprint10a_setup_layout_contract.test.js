const fs = require("fs");
const assert = require("assert/strict");

const css = fs.readFileSync("styles/app.css", "utf8");
const html = fs.readFileSync("index.html", "utf8");

[
  "setup-workbench-grid",
  "setup-primary-column",
  "setup-secondary-column"
].forEach((needle) => {
  assert(html.includes(needle), `Setup page HTML missing ${needle}`);
});

[
  "--setup-workbench-max",
  ".setup-workbench-grid",
  "body[data-app-state=\"setup\"] .workspace",
  "minmax(720px, 1fr)",
  "body[data-app-state=\"setup\"] .filters"
].forEach((needle) => {
  assert(css.includes(needle), `Setup page CSS missing ${needle}`);
});

assert(!css.includes("body[data-app-state=\"setup\"] .workspace {\n      max-width: 920px;"), "Setup workspace should not stay as a narrow center column");
assert(html.includes("<body data-app-state=\"setup\">"), "Initial body state should be setup to avoid first-load layout jump");

console.log("sprint10a-setup-layout-contract-ok");
