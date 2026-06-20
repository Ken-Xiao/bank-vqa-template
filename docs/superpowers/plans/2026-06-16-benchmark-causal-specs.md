# Benchmark Causal Specs Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Extend the Benchmark page decomposition system so all 9 benchmark domains have a core causal spec and profitability cards can display multi-layer cross-domain trace chains.

**Architecture:** Keep the current front-end-only `DECOMPOSITION_SPECS` engine in `js/55-benchmark-page.js`, because the dataset already exposes domains/items and the existing renderer consumes those specs. Add a small contract test that parses the JS source and verifies the domain coverage plus ROE/NIM/deposit causal chain.

**Tech Stack:** Plain JavaScript, static HTML, Node contract tests using `assert`.

---

### Task 1: Contract Test

**Files:**
- Create: `tests/benchmark_decomposition_specs_contract.test.js`

- [ ] **Step 1: Write the failing test**

```js
const fs = require("fs");
const assert = require("assert/strict");

const js = fs.readFileSync("js/55-benchmark-page.js", "utf8");

[
  'profitability: "profitability.roe"',
  'nim:           "nim.nim"',
  'quality:       "quality.npl"',
  'capital:       "capital.car"',
  'loan_corp:     "loan_corp.corp_hhi"',
  'loan_retail:   "loan_retail.retail_npl"',
  'deposit:       "deposit.dep_time_total"',
  'liquidity:     "liquidity.lcr"',
  'ifrs9:         "ifrs9.fa_s2_pct"',
].forEach((needle) => assert(js.includes(needle), `DOMAIN_HEADLINE_METRIC must include ${needle}`));

[
  '"loan_retail.retail_npl"',
  '"liquidity.lcr"',
  '"deposit.ldr"',
  '"loan_corp.high_risk_combined"',
].forEach((needle) => assert(js.includes(needle), `DECOMPOSITION_SPECS must include ${needle}`));

[
  'function buildCausalTraceChain',
  'function renderCausalTraceChain',
  'bm-causal-chain',
  'data-causal-chain-key',
].forEach((needle) => assert(js.includes(needle), `causal chain renderer must include ${needle}`));

[
  'profitability.roe',
  'nim.nim',
  'nim.liab_cost',
  'deposit.dep_time_total',
].forEach((needle) => assert(js.includes(needle), `ROE chain must be able to traverse ${needle}`));

console.log("benchmark-decomposition-specs-contract-ok");
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node tests/benchmark_decomposition_specs_contract.test.js`
Expected: FAIL because `loan_retail.retail_npl`, `liquidity.lcr`, and causal-chain renderer are missing.

### Task 2: Implement Specs And Chain Renderer

**Files:**
- Modify: `js/55-benchmark-page.js`

- [ ] **Step 1: Add missing domain specs**

Add decomposition specs for retail NPL, liquidity LCR, deposit LDR, high-risk corporate exposure, and supporting selected metrics where they serve cross-domain explanation.

- [ ] **Step 2: Add automatic multi-layer chain rendering**

Add `buildCausalTraceChain` to choose the strongest next spec from the current decomposition and recurse up to two levels. Add `renderCausalTraceChain` and insert it in `renderDecompositionCard` so users see ROE -> NIM -> liability cost -> time-deposit structure without needing to manually click every level.

- [ ] **Step 3: Set all 9 domain headline metrics**

Update `DOMAIN_HEADLINE_METRIC` so every domain points to a spec-backed metric.

### Task 3: Verify

**Files:**
- Test: `tests/benchmark_decomposition_specs_contract.test.js`
- Test: `js/55-benchmark-page.js`

- [ ] **Step 1: Run contract test**

Run: `node tests/benchmark_decomposition_specs_contract.test.js`
Expected: PASS and print `benchmark-decomposition-specs-contract-ok`.

- [ ] **Step 2: Run syntax check**

Run: `node --check js/55-benchmark-page.js`
Expected: no syntax errors.
