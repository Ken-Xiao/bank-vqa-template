const fs = require("fs");
const vm = require("vm");
const assert = require("assert/strict");

const renderer = fs.readFileSync("js/64-three-page-diagnosis-renderer.js", "utf8");

function makeElement(tag) {
  return {
    tagName: tag.toUpperCase(),
    className: "",
    textContent: "",
    dataset: {},
    attributes: {},
    children: [],
    firstChild: null,
    type: "",
    setAttribute(name, value) { this.attributes[name] = String(value); },
    appendChild(child) { this.children.push(child); this.firstChild = this.children[0] || null; return child; },
    removeChild(child) { this.children = this.children.filter((item) => item !== child); this.firstChild = this.children[0] || null; return child; },
    replaceChildren(...nodes) { this.children = nodes; this.firstChild = this.children[0] || null; },
    closest() { return null; },
  };
}

const mount = makeElement("div");
const context = {
  window: {},
  document: {
    body: { getAttribute() { return "answer"; } },
    createElement: makeElement,
    getElementById(id) { return id === "threePageDiagnosisMount" ? mount : null; },
    addEventListener() {},
    querySelectorAll() { return []; },
  },
  setTimeout(fn) { fn(); },
  console,
};
context.window = context;
context.buildThreePageDiagnosisModel = function () {
  return {
    status: "confirmed",
    context: { targetBank: { name: "<script>alert(1)</script>" }, peerGroup: { banks: ["A", "B", "C"] }, year: 2025, status: "confirmed" },
    conclusion: {
      headline: "<img src=x onerror=alert(1)>",
      topIssues: [{ rank: 1, strength: "强", title: "<script>alert(2)</script>", conclusion: "<b onclick=alert(3)>bad</b>", sentence: "<b onclick=alert(3)>bad</b>", trace: [{ field: "x", value: "y" }] }],
      kpis: [],
    },
    evidenceMap: {},
    attribution: {},
  };
};

vm.createContext(context);
vm.runInContext(renderer, context);
context.renderThreePageDiagnosis();

function walk(node, acc = []) {
  acc.push(node);
  (node.children || []).forEach((child) => walk(child, acc));
  return acc;
}

const nodes = walk(mount);
assert.equal(nodes.some((node) => node.tagName === "SCRIPT"), false, "renderer must not create script nodes");
assert.equal(nodes.some((node) => Object.keys(node.attributes || {}).some((key) => /^on/i.test(key))), false, "renderer must not create event handler attributes");
assert.ok(nodes.some((node) => String(node.textContent).includes("<script>alert(2)</script>")), "unsafe-looking text should remain textContent");

console.log("three-page-diagnosis-renderer-security-ok");
