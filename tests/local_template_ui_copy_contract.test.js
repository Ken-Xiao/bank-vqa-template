const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "..");
const html = fs.readFileSync(path.join(root, "index.html"), "utf8");
const commentary = fs.readFileSync(path.join(root, "js/33-llm-commentary.js"), "utf8");

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

assert(!html.includes("调用模型接口"), "local-only UI should not ask users to call a model endpoint");
assert(!html.includes("接入后端模型接口"), "local-only UI should not advertise backend model wiring");
assert(!commentary.includes("接入后端模型接口"), "empty commentary state should describe local evidence templates");

assert(html.includes("本地证据解读层"), "commentary panel should be labelled as the local evidence interpretation layer");
assert(html.includes("按证据模板重写"), "rewrite action should use local evidence-template wording");

assert(!html.includes("<strong>目标银行</strong>苏州农商行"), "static selection summary should not hard-code the default target bank");
assert(!html.includes("<strong>对标银行</strong>常熟农商行"), "static selection summary should not hard-code peer banks");

console.log("local-template-ui-copy-contract-ok");
