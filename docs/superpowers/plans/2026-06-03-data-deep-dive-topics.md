# Data Deep Dive Topics Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a three-source data governance layer and turn scraped annual-report details into usable deep-dive topics for retail risk, ALM repricing, liquidity maturity, IFRS9, impairment/write-off, investment volatility, and capital-market signals.

**Architecture:** Keep `data.js` as the primary analytical table, keep `data_tushare.js` as a supplemental sidecar, and add a scraped annual-report sidecar/aggregation layer instead of overwriting audited data. Topic modules should consume normalized fact objects and expose compact panel builders plus HTML renderers that can be reused by Portal, formal report, and PPTX extraction.

**Tech Stack:** Static frontend JavaScript, CSV/JSON sidecars, Node contract tests, Python audit/aggregation scripts, existing `formalReport` and topic mount patterns.

---

### Task 1: Three-Source Governance Contract

**Files:**
- Create: `tests/data_source_governance_contract.test.js`
- Create: `data_source_governance.js`
- Modify: `index.html`
- Reference: `docs/data-source-portal-usage-opportunity-matrix.md`

- [ ] **Step 1: Write the failing test**

```javascript
const fs = require("fs");
const assert = require("assert/strict");

const governance = fs.readFileSync("data_source_governance.js", "utf8");
const index = fs.readFileSync("index.html", "utf8");

[
  "window.VQA_DATA_SOURCE_GOVERNANCE",
  "primary",
  "supplement",
  "validation",
  "detailOnly",
  "unitRule",
  "signRule",
  "replacementPolicy",
].forEach((needle) => assert(governance.includes(needle), `missing governance token: ${needle}`));

[
  "incomeTax",
  "interestExpense",
  "nim",
  "npl",
  "provisionCoverage",
  "cet1",
  "liquidityCoverageRatio",
].forEach((field) => assert(governance.includes(field), `missing governed field: ${field}`));

assert(index.includes("data_source_governance.js"), "index.html must load data source governance sidecar");
console.log("data-source-governance-contract-ok");
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node tests/data_source_governance_contract.test.js`

Expected: FAIL because `data_source_governance.js` does not exist.

- [ ] **Step 3: Implement governance sidecar**

Create `data_source_governance.js` with `window.VQA_DATA_SOURCE_GOVERNANCE = { fields: {...}, sourceRoles: {...} }`. Classify fields as:

```javascript
incomeTax: {
  role: "validation",
  unitRule: "万元",
  signRule: "expense_positive_in_portal_negative_in_statement_allowed",
  replacementPolicy: "do_not_override_primary_without_review"
}
```

- [ ] **Step 4: Load sidecar**

Add `<script src="data_source_governance.js?v=20260603"></script>` after `data_tushare.js` in `index.html`.

- [ ] **Step 5: Verify**

Run:

```bash
node tests/data_source_governance_contract.test.js
git diff --check
```

Expected: PASS.

### Task 2: Scraped Annual Report Aggregation

**Files:**
- Create: `scraped_report_to_vqa_sidecar.py`
- Create: `data_scraped_report.js`
- Create: `tests/scraped_report_sidecar_contract.test.js`
- Reference: `scraped_data_completeness_audit.py`

- [ ] **Step 1: Write the failing test**

```javascript
const fs = require("fs");
const assert = require("assert/strict");

assert(fs.existsSync("data_scraped_report.js"), "data_scraped_report.js must exist");
const text = fs.readFileSync("data_scraped_report.js", "utf8");
[
  "window.VQA_DATA_SCRAPED_REPORT",
  "regulatoryValidation",
  "retailRiskProduct",
  "repricingGap",
  "liquidityMaturity",
  "ifrs9Stage",
  "impairmentWriteoff",
  "sourcePage",
].forEach((needle) => assert(text.includes(needle), `missing scraped sidecar token: ${needle}`));
console.log("scraped-report-sidecar-contract-ok");
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node tests/scraped_report_sidecar_contract.test.js`

Expected: FAIL because sidecar is missing.

- [ ] **Step 3: Implement Python aggregation**

Create `scraped_report_to_vqa_sidecar.py` that reads `数据/抓取数据/**/*.csv`, normalizes bank names, and outputs grouped arrays:

- `regulatoryValidation`: `bank`, `year`, `field`, `value`, `unit`, `sourcePage`, `status`
- `retailRiskProduct`: product, balance, nplBalance, nplRatio
- `repricingGap`: side, bucket, balance
- `liquidityMaturity`: side, bucket, balance
- `ifrs9Stage`: category, stage, stageBalance, allowance, allowanceRatio
- `impairmentWriteoff`: metric, value

- [ ] **Step 4: Generate sidecar**

Run: `python3 scraped_report_to_vqa_sidecar.py`

Expected: writes `data_scraped_report.js`.

- [ ] **Step 5: Verify**

Run:

```bash
node tests/scraped_report_sidecar_contract.test.js
python3 - <<'PY'
from pathlib import Path
compile(Path('scraped_report_to_vqa_sidecar.py').read_text(encoding='utf-8'), 'scraped_report_to_vqa_sidecar.py', 'exec')
print('syntax-ok')
PY
```

Expected: PASS.

### Task 3: Retail Risk Attribution Topic

**Files:**
- Create: `js/39-scraped-retail-risk-topic.js`
- Create: `tests/scraped_retail_risk_topic_contract.test.js`
- Modify: `index.html`
- Modify: `js/22-formal-report.js`

- [ ] **Step 1: Write the failing test**

```javascript
const fs = require("fs");
const assert = require("assert/strict");

const js = fs.readFileSync("js/39-scraped-retail-risk-topic.js", "utf8");
[
  "retailRiskAttributionPanel",
  "retailRiskContributionRows",
  "retailRiskAttributionCardHTML",
  "housingLoanNpl",
  "consumerLoanNpl",
  "businessLoanNpl",
  "creditCardLoanNpl",
].forEach((needle) => assert(js.includes(needle), `missing retail risk feature: ${needle}`));
console.log("scraped-retail-risk-topic-contract-ok");
```

- [ ] **Step 2: Implement panel and renderer**

Use `window.VQA_DATA_SCRAPED_REPORT.retailRiskProduct` to compute balance share, NPL balance share where available, and NPL ratio contribution. Render one compact table plus one verdict sentence.

- [ ] **Step 3: Mount into Portal and report**

Add mount next to existing retail risk topic. Add formal report section only when product rows exist for target bank/year.

- [ ] **Step 4: Verify**

Run:

```bash
node tests/scraped_retail_risk_topic_contract.test.js
node --check js/39-scraped-retail-risk-topic.js
git diff --check
```

Expected: PASS.

### Task 4: ALM Repricing and Liquidity Topics

**Files:**
- Create: `js/40-scraped-alm-liquidity-topic.js`
- Create: `tests/scraped_alm_liquidity_topic_contract.test.js`
- Modify: `index.html`
- Modify: `js/22-formal-report.js`

- [ ] **Step 1: Write contract test**

Assert existence of:

```javascript
[
  "repricingGapPanel",
  "liquidityMaturityPanel",
  "bucketGapRows",
  "shortEndGap",
  "cumulativeGap",
  "repricingGapCardHTML",
  "liquidityMaturityCardHTML",
]
```

- [ ] **Step 2: Implement calculations**

For each bucket, compute `assetBalance - liabilityBalance`. For liquidity maturity, compute short-end gap and cumulative gap. Keep bucket labels from source, do not invent bucket order beyond a stable sort map.

- [ ] **Step 3: Wire to NIM and liquidity sections**

NIM page shows repricing gap as evidence. Liquidity page/report appendix shows maturity gap only when rows exist.

- [ ] **Step 4: Verify**

Run contract test, `node --check`, and `git diff --check`.

### Task 5: IFRS9, Impairment, and Investment Volatility Topics

**Files:**
- Create: `js/41-scraped-ifrs9-impairment-topic.js`
- Create: `tests/scraped_ifrs9_impairment_topic_contract.test.js`
- Modify: `index.html`
- Modify: `js/22-formal-report.js`

- [ ] **Step 1: Write contract test**

Assert existence of:

```javascript
[
  "ifrs9StagePanel",
  "stageMigrationSignal",
  "impairmentWriteoffPanel",
  "investmentVolatilityPanel",
  "stage2Share",
  "stage3Coverage",
  "writeoffRecoveryRatio",
]
```

- [ ] **Step 2: Implement IFRS9 panel**

Group by category and stage. Compute stage share and allowance coverage. Flag Stage 2 pressure when Stage 2 share is the largest non-performing early-warning component.

- [ ] **Step 3: Implement impairment/write-off panel**

Group impairment and write-off/recovery metrics. Compute recovery ratio when both write-off and recovery exist.

- [ ] **Step 4: Implement investment volatility panel**

Use `investIncome`, `fairValueChgGain`, `tradAsset`, `debtInvestment`, and `otherDebtInvestment` where available. Explain whether profit volatility is more likely market-driven or customer-operation-driven.

- [ ] **Step 5: Verify**

Run contract test, `node --check`, and `git diff --check`.

### Task 6: Back-End Data Warehouse Handoff

**Files:**
- Modify: `docs/backend-data-warehouse-integration-guide.md`
- Create: `docs/data-warehouse-fact-table-contract-v2.md`

- [ ] **Step 1: Add fact table contract**

Document:

- `fact_bank_core_financials`
- `fact_bank_regulatory_metrics`
- `fact_bank_retail_risk_product`
- `fact_bank_ifrs9_stage`
- `fact_bank_repricing_gap`
- `fact_bank_liquidity_maturity`
- `fact_bank_impairment_writeoff`
- `fact_bank_noninterest_income_detail`

- [ ] **Step 2: Define keys and units**

Each table must include `bank_code`, `bank_name_std`, `report_year`, `scope`, `metric`, `value`, `unit`, `source_url`, `page`, `extract_status`, `updated_at`.

- [ ] **Step 3: Define Portal consumption views**

Document wide aggregate views:

- `v_portal_bank_year_core`
- `v_portal_regulatory_validation`
- `v_portal_retail_risk_attribution`
- `v_portal_alm_repricing`
- `v_portal_ifrs9_risk`

- [ ] **Step 4: Verify docs**

Run `rg -n "fact_bank_|v_portal_" docs/backend-data-warehouse-integration-guide.md docs/data-warehouse-fact-table-contract-v2.md`.

Expected: all fact tables and views appear.
