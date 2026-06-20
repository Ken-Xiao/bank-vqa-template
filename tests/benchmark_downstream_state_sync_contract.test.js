const fs = require("fs");
const vm = require("vm");
const assert = require("assert/strict");

const bridge = fs.readFileSync("js/56-benchmark-state-bridge.js", "utf8");
const router = fs.readFileSync("js/42-portal-router.js", "utf8");

assert(
  router.includes("shouldSyncBenchmarkBeforePortalPage"),
  "router must detect transitions from data benchmark into downstream analysis pages"
);
assert(
  router.includes("syncBenchmarkToState({ renderDownstream: false })") &&
    router.includes("syncBenchmarkToState({ renderDownstream: true, forceRefresh: true })"),
  "router must sync benchmark state before switching pages and refresh downstream content after switching"
);
assert(
  router.includes("state.confirmed = true") &&
    router.includes('document.body.classList.add("analysis-ready")'),
  "router must treat leaving benchmark for downstream pages as confirming the benchmark data boundary"
);
assert(
  router.includes("ensureConfirmedEvidencePackBeforeLeavingBenchmark"),
  "router must ensure confirmed evidence pack before downstream pages"
);
assert(
  bridge.includes("deriveBenchmarkPeerNames") &&
    bridge.includes("activePeers.national_type") &&
    bridge.includes("activePeers.region_type") &&
    bridge.includes("activePeers.national_other") &&
    bridge.includes("activePeers.custom"),
  "bridge must derive report peers from every benchmark peer group, not only custom peers"
);
assert(
  bridge.includes("refreshDownstreamAnalysisFromBenchmark") &&
    bridge.includes("renderBenchmarkEvidencePackSummary") &&
    bridge.includes("renderBenchmarkReportAppendix"),
  "bridge refresh must include report evidence summary and appendix refresh hooks"
);

let renderAllCalls = 0;
let saved = 0;

const context = {
  window: { addEventListener() {} },
  state: {
    target: "旧目标行",
    peers: ["旧对标行"],
    year: 2024,
  },
  __bm: {
    selectedBankId: "A",
    snapshotYear: 2025,
    activePeers: {
      national_type: true,
      region_type: true,
      national_other: false,
      custom: true,
    },
    customPeers: ["D"],
    data: {
      banks: [
        { id: "A", name: "甲银行", type: "农村商业银行", region: "广东" },
        { id: "B", name: "乙银行", type: "农村商业银行", region: "广东" },
        { id: "C", name: "丙银行", type: "农村商业银行", region: "浙江" },
        { id: "D", name: "丁银行", type: "城市商业银行", region: "广东" },
      ],
    },
  },
  localStorage: {
    getItem() { return null; },
    setItem() {},
  },
  document: {
    body: { getAttribute() { return "benchmark"; } },
    addEventListener() {},
    getElementById() { return null; },
    querySelectorAll() { return []; },
  },
  fetch() {
    return Promise.resolve({ ok: true, json: () => Promise.resolve({}) });
  },
  setTimeout() { return 1; },
  setInterval() { return 1; },
  clearInterval() {},
  MutationObserver: function MutationObserver() {
    this.observe = function observe() {};
  },
  renderAll() { renderAllCalls += 1; },
  saveProjectState() { saved += 1; },
};

context.window = Object.assign(context, context.window);
vm.createContext(context);
vm.runInContext(bridge, context);

const changed = context.window.syncBenchmarkToState({ renderDownstream: true });

assert.equal(changed, true, "benchmark state sync should report changed state");
assert.equal(context.state.target, "甲银行", "downstream target must follow benchmark selected bank");
assert.equal(context.state.year, 2025, "downstream year must follow benchmark snapshot year");
assert.equal(
  JSON.stringify(context.state.peers),
  JSON.stringify(["乙银行", "丙银行", "丁银行"]),
  "downstream peers must be concrete banks derived from selected benchmark peer groups"
);
assert.equal(renderAllCalls, 1, "downstream analysis should re-render after benchmark sync");
assert.equal(saved, 1, "changed benchmark sync should persist project state");

console.log("benchmark-downstream-state-sync-contract-ok");
