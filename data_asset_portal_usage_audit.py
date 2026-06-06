from __future__ import annotations

import csv
import json
import re
from collections import defaultdict
from pathlib import Path


ROOT = Path(__file__).parent
DOCS = ROOT / "docs"


def load_js_object(path: Path, var_name: str) -> dict:
    text = path.read_text(encoding="utf-8")
    prefix = f"window.{var_name} = "
    start = text.index(prefix) + len(prefix)
    payload = text[start:].strip()
    if payload.endswith(";"):
        payload = payload[:-1]
    return json.loads(payload)


def coverage(rows: list[dict], field: str) -> float:
    if not rows:
        return 0.0
    n = sum(1 for r in rows if r.get(field) not in (None, "", "NA", "N/A"))
    return n / len(rows)


def avg_pct(values: list[float]) -> str:
    vals = [v for v in values if v is not None]
    if not vals:
        return "0%"
    return f"{sum(vals) / len(vals) * 100:.0f}%"


def read_metric_dictionary() -> list[dict]:
    path = ROOT / "data_governance" / "metric_dictionary.csv"
    with path.open(encoding="utf-8-sig", newline="") as f:
        return list(csv.DictReader(f))


def read_scraped_field_completeness() -> dict[str, dict]:
    path = DOCS / "scraped-vs-main-tushare-field-completeness.csv"
    if not path.exists():
        return {}
    with path.open(encoding="utf-8", newline="") as f:
        return {r["field"]: r for r in csv.DictReader(f)}


def read_scraped_database_summary() -> dict[str, int]:
    bank_index = ROOT / "data_governance" / "annual_report_scraped_bank_index.csv"
    database = ROOT / "data_governance" / "annual_report_scraped_database.csv"
    if not bank_index.exists():
        return {"banks": 51, "bank_years": 51, "database_rows": 0}
    with bank_index.open(encoding="utf-8-sig", newline="") as f:
        rows = list(csv.DictReader(f))
    banks = {r["bank_canonical"] for r in rows if r.get("bank_canonical")}
    database_rows = 0
    if database.exists():
        with database.open(encoding="utf-8-sig", newline="") as f:
            database_rows = max(sum(1 for _ in f) - 1, 0)
    else:
        database_rows = sum(int(r.get("database_rows") or 0) for r in rows)
    return {"banks": len(banks), "bank_years": len(rows), "database_rows": database_rows}


TYPE_RULES = [
    {
        "type": "核心财务三表",
        "themes": {"盈利概览(万元)", "利润表详情(万元)", "资产负债(万元)"},
        "fields": {
            "revenue", "netProfit", "netInterestIncome", "feeIncome", "interestIncome", "interestExpense",
            "incomeTax", "assets", "liabilities", "equity", "loans", "deposits", "operatingCashFlow",
            "basicEps", "totalProfit",
        },
        "scraped_tables": {"financials_core_long.csv"},
        "opportunity": "作为经营底表和三源校验层；差异主要来自单位、符号、净额/总额、归母/合并口径，建议先建立口径规则后再补主表。",
    },
    {
        "type": "盈利质量与非息收入",
        "themes": {"盈利质量", "利润质量", "盈利指标"},
        "fields": {
            "coreRevenue", "coreRevenueGrowth", "nonInterestShare", "trueCoreNonInterest",
            "volatileIncomeShare", "feeAssetRatio", "cashProfitRatio", "adminExpense",
            "costIncomeRatio", "creditImpairLoss", "assetImpairLoss", "otherAssetImpairLoss",
            "investIncome", "fairValueChgGain", "fxGain", "otherNonInterestIncome",
            "dupontNetMargin", "dupontAssetTurn", "dupontLeverage", "extraItemAmount",
        },
        "scraped_tables": {"fee_commission_long.csv", "other_noninterest_income_long.csv", "provision_long.csv"},
        "opportunity": "可升级利润质量专题：手续费拆分、投资收益/公允价值/汇兑损益拆分、信用减值结构，解释利润是客户经营、市场波动还是拨备释放。",
    },
    {
        "type": "息差与资产负债定价",
        "themes": {"息差负债", "存款结构(万元)"},
        "fields": {
            "nim", "nimGapBp", "nimGapPoint", "realLoanDepositSpread", "earningAssetYield",
            "interestLiabilityCost", "timeDepositShare", "corporateDemandDepositShare",
            "personalDemandDepositShare", "corporateTimeDeposit", "personalTimeDeposit",
        },
        "scraped_tables": {"nim_long.csv", "repricing_long.csv"},
        "opportunity": "可挖掘重定价缺口、资产收益率分项、负债成本分项，把“息差防守”从单一 NIM 扩成资产/负债期限桶和成本传导链。",
    },
    {
        "type": "风险拨备与资产质量",
        "themes": {"风险拨备", "资产质量"},
        "fields": {
            "npl", "provisionCoverage", "overdueRatio", "specialMentionRatio",
            "overdueNplDeviation", "hiddenNplExposure", "corporateLoanNpl",
            "personalLoanNpl", "billDiscountNpl", "profitPpopGap",
        },
        "scraped_tables": {"provision_long.csv", "loan_5class_migration_long.csv"},
        "opportunity": "可升级风险专题：五级分类迁徙、核销/回收、信用减值分项、拨备覆盖变化，解释风险是否前移确认。",
    },
    {
        "type": "零售风险深钻",
        "themes": {"零售结构"},
        "fields": {
            "housingLoanShare", "consumerLoanShare", "businessLoanShare",
            "housingLoanNpl", "consumerLoanNpl", "businessLoanNpl",
            "retailRiskMax", "retailRiskSpread", "creditCardLoanNpl",
        },
        "scraped_tables": {"loan_npl_product_long.csv"},
        "opportunity": "当前 Portal 用了个贷/零售剪刀差，但还可加入住房、消费、经营、信用卡的余额占比和不良贡献，形成零售风险归因图。",
    },
    {
        "type": "资本与估值",
        "themes": {"资本估值", "资本充足率", "市场估值", "市场流动性"},
        "fields": {
            "cet1", "cet1Buffer", "carBuffer", "estimatedRwa", "rwaDensity",
            "rwaProfitGrowthGap", "rwaAssetGrowthGap", "pb", "pbMid", "pbChange",
            "peTtm", "divYield", "divYieldTtm", "totalMarketValue", "turnoverRate",
        },
        "scraped_tables": {"special_metrics_long.csv"},
        "opportunity": "可把 PB 归因从经营指标扩展到市场信号：股息率、换手率、市值规模、资本余量、RWA 消耗共同解释估值折价。",
    },
    {
        "type": "流动性与期限错配",
        "themes": {"流动性"},
        "fields": {"liquidityCoverageRatio", "liquidityRatio", "loanDepositRatio"},
        "scraped_tables": {"liquidity_risk_long.csv"},
        "opportunity": "目前 Portal 基本只用 LCR/流动性比率，可进一步用期限桶构造流动性缺口、短端压力、同业负债依赖度。",
    },
    {
        "type": "投资结构与 IFRS9",
        "themes": {"投资结构", "IFRS9资产分类"},
        "fields": {
            "bondInvestment", "fundInvestment", "trustWmInvestment", "investmentAssetRatio",
            "tradAsset", "fvociAssets", "acAssets", "htmInvest", "afaAssets",
            "debtInvestment", "otherDebtInvestment",
        },
        "scraped_tables": {"ifrs9_stage_distribution_long.csv", "financials_core_long.csv"},
        "opportunity": "可补 IFRS9 三阶段和金融投资结构，解释利润波动、公允价值敞口、减值准备是否集中在某类资产。",
    },
    {
        "type": "现金流深度",
        "themes": {"现金流深度"},
        "fields": {"cashflowInvAct", "cashflowFncAct", "depositGrowthCF", "loanIssuanceCF", "centralBankAdj"},
        "scraped_tables": {"financials_core_long.csv"},
        "opportunity": "可把经营现金流、投资现金流、筹资现金流与存贷扩张联动，识别扩表是否消耗现金或依赖再融资。",
    },
    {
        "type": "行业/期限/明细附注",
        "themes": set(),
        "fields": set(),
        "scraped_tables": {"loan_npl_industry_long.csv", "loan_writeoff_long.csv", "extraction_status.csv"},
        "opportunity": "这些明细当前几乎未进入 Portal，适合做后端明细事实表：行业不良、核销回收、抽取状态质量控制。",
    },
]


def portal_used_fields(known_fields: set[str]) -> set[str]:
    used = set()
    files = list((ROOT / "js").glob("*.js")) + [ROOT / "index.html"]
    for path in files:
        text = path.read_text(encoding="utf-8", errors="ignore")
        for field in known_fields:
            if re.search(rf"['\"]{re.escape(field)}['\"]", text) or re.search(rf"\brow\.{re.escape(field)}\b", text):
                used.add(field)
    return used


def main():
    DOCS.mkdir(exist_ok=True)
    vqa = load_js_object(ROOT / "data.js", "VQA_DATA")
    tushare = load_js_object(ROOT / "data_tushare.js", "VQA_DATA_TUSHARE")
    main_records = vqa.get("records", [])
    side_records = tushare.get("records", [])
    dictionary = read_metric_dictionary()
    scraped = read_scraped_field_completeness()
    scraped_db = read_scraped_database_summary()

    field_to_theme = defaultdict(set)
    dict_fields = set()
    for row in dictionary:
        field = row.get("metric_code")
        if field:
            dict_fields.add(field)
            field_to_theme[field].add(row.get("theme", ""))
    main_fields = {k for r in main_records for k in r if k not in {"bank", "year", "type", "region"}}
    side_fields = {k for r in side_records for k in r if k not in {"bank", "year", "ts_code"}}
    known_fields = main_fields | side_fields | dict_fields | set(scraped)
    used = portal_used_fields(known_fields)

    side_metric_meta = {m.get("code"): m for m in tushare.get("metrics", []) if m.get("code")}
    rows = []
    for rule in TYPE_RULES:
        type_fields = set(rule["fields"])
        for f, themes in field_to_theme.items():
            if themes & rule["themes"]:
                type_fields.add(f)
        main_present = sorted(f for f in type_fields if f in main_fields)
        side_present = sorted(f for f in type_fields if f in side_fields or f in side_metric_meta)
        scraped_present = sorted(f for f in type_fields if f in scraped)
        portal_present = sorted(f for f in type_fields if f in used)
        unused_fields = sorted((set(main_present) | set(side_present) | set(scraped_present)) - set(portal_present))

        scraped_covs = [float(scraped[f]["scraped_bank_year_coverage"]) for f in scraped_present if f in scraped]
        rows.append({
            "数据类型": rule["type"],
            "原有数据字段": "、".join(main_present) or "无直接字段",
            "原有数据完整性": avg_pct([coverage(main_records, f) for f in main_present]) if main_present else "0%",
            "Tushare字段": "、".join(side_present) or "无直接字段",
            "Tushare完整性": avg_pct([coverage(side_records, f) for f in side_present]) if side_present else "0%",
            "年报抓取字段/表": "、".join(scraped_present) if scraped_present else "明细表：" + "、".join(sorted(rule["scraped_tables"])),
            "抓取完整性": avg_pct(scraped_covs) if scraped_covs else "明细表已覆盖，待字段化",
            "Portal已使用": "、".join(portal_present) or "基本未使用",
            "未使用/待接入": "、".join(unused_fields[:18]) + ("..." if len(unused_fields) > 18 else ""),
            "可挖掘信息": rule["opportunity"],
        })

    out_csv = DOCS / "data-source-portal-usage-opportunity-matrix.csv"
    with out_csv.open("w", encoding="utf-8", newline="") as f:
        writer = csv.DictWriter(f, fieldnames=list(rows[0]))
        writer.writeheader()
        writer.writerows(rows)

    md_rows = "\n".join(
        "|{数据类型}|{原有数据完整性}|{Tushare完整性}|{抓取完整性}|{Portal已使用}|{未使用/待接入}|{可挖掘信息}|".format(**r)
        for r in rows
    )
    detail_rows = "\n".join(
        "|{数据类型}|{原有数据字段}|{Tushare字段}|{年报抓取字段/表}|".format(**r)
        for r in rows
    )
    report = f"""# 数据源 × Portal 使用 × 挖掘机会矩阵

生成日期：2026-06-03

## 1. 总览

- 原有主数据：{len(main_records)} 条 bank-year，覆盖 2020-2025，是 Portal 当前的主数据底座。
- Tushare sidecar：{len(side_records)} 条 bank-year，适合补标准三表、市场估值和部分衍生验证字段。
- 年报抓取数据：已入库 {scraped_db["banks"]} 家银行、{scraped_db["bank_years"]} 个 bank-year、{scraped_db["database_rows"]} 条去重明细记录，主要是 2025 年报口径，适合补监管指标和附注明细。
- Portal 已识别使用字段：{len(used)} 个。未进入 Portal 的字段不一定无价值，很多是明细事实表，需要先做专题建模。

## 2. 类型矩阵

|数据类型|原有数据完整性|Tushare完整性|抓取完整性|Portal已使用|未使用/待接入|可挖掘信息|
|---|---:|---:|---:|---|---|---|
{md_rows}

## 3. 三源字段明细

|数据类型|原有数据字段|Tushare字段|年报抓取字段/表|
|---|---|---|---|
{detail_rows}

## 4. 开发优先级建议

1. 先接年报抓取的监管指标校验层：`nim`、`npl`、`provisionCoverage`、`cet1`、`liquidityCoverageRatio`。这些字段 Portal 已经使用，且抓取数据可作为 2025 年报验证。
2. 第二优先级是零售风险深钻：住房、消费、经营、信用卡不良率和余额占比。当前 Portal 已有零售风险入口，但还没有把抓取明细充分用起来。
3. 第三优先级是息差重定价和流动性期限桶：这两类现在抓取表已经有，但 Portal 基本没用，适合形成新的“资产负债管理专题”。
4. 第四优先级是 IFRS9 三阶段和投资结构：用于解释信用减值、公允价值波动、风险前移，适合放入专题分析和报告附录。
5. Tushare 市场字段已经可用于 PB 归因，但还可以进一步把 `divYield`、`turnoverRate`、`totalMarketValue` 做成资本市场信号，而不是只作为估值表字段。

输出 CSV：`{out_csv}`
"""
    out_md = DOCS / "data-source-portal-usage-opportunity-matrix.md"
    out_md.write_text(report, encoding="utf-8")
    print(json.dumps({"rows": len(rows), "portal_used_fields": len(used), "outputs": [str(out_md), str(out_csv)]}, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
