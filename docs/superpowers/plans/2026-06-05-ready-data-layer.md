# Ready Data Layer Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the first static Ready data layer that integrates main data, Tushare sidecar data, and annual-report scraped detail into Portal-readable outputs with quality statuses and missing reasons.

**Architecture:** Keep the current static frontend contract intact by generating sidecar artifacts rather than replacing `data.js`. The builder reads existing sources, normalizes bank aliases, selects source values by metric governance rules, records quality decisions, and emits JSON/JS files that the Portal can consume in a later UI pass.

**Tech Stack:** Python standard library for ETL, existing `data.js` and `data_tushare.js` static files, Node contract tests for generated artifacts.

---

### Task 1: Design Document

**Files:**
- Create: `outputs/vqa_template/docs/data-layer-ready-warehouse-design.md`

- [ ] **Step 1: Write the data-layer contract**

Create a Markdown document with these sections:

```markdown
# Ready 数据层设计

## 1. 目标
把原主数据、Tushare 和年报抓取明细整合成 Portal 可直接读取的 ready 层。

## 2. 分层
ODS 原始层、标准化层、校验层、计算层、Ready 层。

## 3. 来源优先级
核心三表主数据优先，市场指标 Tushare 优先，监管和附注明细年报抓取优先，派生指标计算层生成。

## 4. 缺失原因
三源均缺、年报已抓取未字段化、对标组不足、计算输入不足、别名未映射、源数据未披露。

## 5. 第一版输出
data_ready.js、ready_metric_quality.json、ready_record_wide.csv。
```

- [ ] **Step 2: Review for scope**

Run: `rg -n "Ready 数据层|data_ready|缺失原因" outputs/vqa_template/docs/data-layer-ready-warehouse-design.md`

Expected: all three concepts are present.

### Task 2: Ready Builder

**Files:**
- Create: `outputs/vqa_template/build_ready_data_layer.py`
- Create generated: `outputs/vqa_template/data_ready.js`
- Create generated: `outputs/vqa_template/data_governance/ready_record_wide.json`
- Create generated: `outputs/vqa_template/data_governance/ready_record_wide.csv`
- Create generated: `outputs/vqa_template/data_governance/ready_metric_quality.json`
- Create generated: `outputs/vqa_template/data_governance/ready_metric_quality.csv`

- [ ] **Step 1: Implement source parsing**

The builder must read `data.js`, `data_tushare.js`, and `data_governance/annual_report_scraped_database.json`. It extracts JavaScript assignments with a balanced-brace parser and parses JSON payloads.

- [ ] **Step 2: Implement bank aliases**

Add aliases for at least:

```python
{
    "瑞丰": "瑞丰农商行",
    "瑞丰银行": "瑞丰农商行",
    "上海": "上海",
    "上海银行": "上海",
    "沪农商行": "上海农商行",
    "上海农商银行": "上海农商行",
    "杭州银行": "杭州",
}
```

- [ ] **Step 3: Implement metric source rules**

Use source priority by metric family:

```python
market_metrics = {"peTtm", "divYield", "divYieldTtm", "totalMarketValue", "turnoverRate"}
scraped_priority_metrics = {"nim", "npl", "provisionCoverage", "cet1", "liquidityCoverageRatio", "liquidityRatio", "loanDepositRatio", "realLoanDepositSpread", "housingLoanNpl", "consumerLoanNpl", "businessLoanNpl", "creditCardLoanNpl", "debtInvestment", "otherDebtInvestment", "tradAsset", "fairValueChgGain", "fxGain", "investIncome", "otherNonInterestIncome", "otherAssetImpairLoss"}
```

- [ ] **Step 4: Emit artifacts**

The generated JS must assign:

```javascript
window.VQA_DATA_READY = {
  version: "20260605-ready-v1",
  records: [],
  metricQuality: []
};
```

### Task 3: Contract Tests

**Files:**
- Create: `outputs/vqa_template/tests/ready_data_layer_contract.test.js`

- [ ] **Step 1: Test generated outputs exist**

The Node test checks that all generated artifacts exist and parse.

- [ ] **Step 2: Test alias coverage**

The test asserts `瑞丰` maps into a ready record for `瑞丰农商行` and that selected 2025 rows exist for `苏州农商行`, `常熟农商行`, `瑞丰农商行`, `上海农商行`, and `苏州`.

- [ ] **Step 3: Test missing reason taxonomy**

The test asserts quality rows contain one of:

```javascript
[
  "available",
  "source_missing",
  "scraped_available_not_fieldized",
  "peer_insufficient",
  "calculation_input_missing"
]
```

### Task 4: Verification

**Files:**
- Verify: `outputs/vqa_template/build_ready_data_layer.py`
- Verify: `outputs/vqa_template/tests/ready_data_layer_contract.test.js`

- [ ] **Step 1: Run builder**

Run: `python3 outputs/vqa_template/build_ready_data_layer.py`

Expected: generated artifact paths are printed.

- [ ] **Step 2: Run syntax and contract checks**

Run:

```bash
python3 -m py_compile outputs/vqa_template/build_ready_data_layer.py
node outputs/vqa_template/tests/ready_data_layer_contract.test.js
```

Expected: all checks pass.

