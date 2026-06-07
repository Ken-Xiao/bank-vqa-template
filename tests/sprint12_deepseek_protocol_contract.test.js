const fs = require("fs");
const assert = require("assert/strict");

const orchestrator = fs.readFileSync("js/37-deepseek-rewrite-orchestrator.js", "utf8");
const pkg = JSON.parse(fs.readFileSync("package.json", "utf8"));
const handoff = fs.readFileSync("docs/session-handoff-2026-06-07-sprint11.md", "utf8");

[
  "function rewriteRequestEnvelope",
  "function normalizeRewritePackage",
  "function validateRewritePackageAgainstProtocol",
  "function factPackVerificationSummary",
  "protocolVersion: \"20260607-sprint12-v1\"",
  "evidenceProtocol",
  "dataVerification",
  "factPack",
  "禁止讲方法论",
  "禁止编造数字",
  "禁止投资建议",
  "观点",
  "证据",
  "机制",
  "建议",
  "回传结构"
].forEach((needle) => assert(orchestrator.includes(needle), `Sprint 12 protocol missing ${needle}`));

[
  "qualityWarnings",
  "citations",
  "evidence",
  "actions",
  "viewpoint",
  "conclusion",
  "soWhat"
].forEach((needle) => assert(orchestrator.includes(needle), `normalized package must preserve ${needle}`));

assert(
  orchestrator.includes("validateRewritePackageAgainstProtocol(payload, block)") ||
    orchestrator.includes("validateRewritePackageAgainstProtocol({"),
  "callRewriteBlock must validate remote payload against the Sprint 12 protocol",
);
assert(pkg.scripts["test:rewrite-orchestrator"].includes("sprint12_deepseek_protocol_contract.test.js"), "rewrite test command must include Sprint 12 protocol contract");
assert(handoff.includes("Sprint 12"), "handoff must keep Sprint 12 as the next implementation step");

console.log("sprint12-deepseek-protocol-contract-ok");
