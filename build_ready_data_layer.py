from __future__ import annotations

import csv
import json
from collections import defaultdict
from datetime import datetime, timezone
from pathlib import Path


BASE = Path(__file__).resolve().parent
GOV = BASE / "data_governance"
VERSION = "20260605-ready-v1"

READY_FIELDS = [
    "roa", "roe", "revenue", "netProfit", "coreRevenueGrowth", "revenueGrowth",
    "netProfitGrowth", "ppopGrowth", "costIncomeRatio", "feeAssetRatio",
    "trueCoreNonInterest", "volatileIncomeShare", "cashProfitRatio",
    "nim", "nimGapBp", "nimGapPoint", "earningAssetYield",
    "interestLiabilityCost", "realLoanDepositSpread", "timeDepositShare",
    "corporateDemandDepositShare", "personalDemandDepositShare",
    "corporateTimeDeposit", "personalTimeDeposit",
    "npl", "provisionCoverage", "overdueRatio", "specialMentionRatio",
    "overdueNplDeviation", "hiddenNplExposure", "personalLoanNpl",
    "corporateLoanNpl", "housingLoanNpl", "consumerLoanNpl",
    "businessLoanNpl", "creditCardLoanNpl", "housingLoanShare",
    "consumerLoanShare", "businessLoanShare", "retailRiskMax",
    "retailRiskSpread",
    "pb", "pbMid", "peTtm", "divYield", "divYieldTtm",
    "totalMarketValue", "turnoverRate", "cet1", "cet1Buffer",
    "carBuffer", "rwaDensity", "estimatedRwa", "estimatedRwaGrowth",
    "rwaProfitGrowthGap", "rwaAssetGrowthGap", "pbChange",
    "bondInvestment", "fundInvestment", "trustWmInvestment", "tradAsset",
    "fvociAssets", "acAssets", "htmInvest", "afaAssets", "debtInvestment",
    "otherDebtInvestment", "investmentAssetRatio", "fairValueChgGain",
    "fxGain", "investIncome", "otherNonInterestIncome",
    "otherAssetImpairLoss",
    "operatingCashFlow", "cashflowInvAct", "cashflowFncAct",
    "depositGrowthCF", "loanIssuanceCF", "centralBankAdj",
    "liquidityCoverageRatio", "liquidityRatio", "loanDepositRatio",
]

MARKET_METRICS = {
    "peTtm", "divYield", "divYieldTtm", "totalMarketValue", "turnoverRate",
}

SCRAPED_PRIORITY_METRICS = {
    "nim", "npl", "provisionCoverage", "cet1", "liquidityCoverageRatio",
    "liquidityRatio", "loanDepositRatio", "realLoanDepositSpread",
    "housingLoanNpl", "consumerLoanNpl", "businessLoanNpl",
    "creditCardLoanNpl", "personalLoanNpl", "debtInvestment",
    "otherDebtInvestment", "tradAsset", "fairValueChgGain", "fxGain",
    "investIncome", "otherNonInterestIncome", "otherAssetImpairLoss",
    "earningAssetYield", "interestLiabilityCost",
}

CALCULATED_METRICS = {
    "feeAssetRatio", "timeDepositShare", "nimGapBp", "nimGapPoint",
    "retailRiskMax", "retailRiskSpread", "rwaProfitGrowthGap",
    "rwaAssetGrowthGap", "cashProfitRatio",
}

MANUAL_ALIASES = {
    "苏农银行": "苏州农商行",
    "苏州银行": "苏州",
    "杭州银行": "杭州",
    "常熟银行": "常熟农商行",
    "常熟农商银行": "常熟农商行",
    "瑞丰": "瑞丰农商行",
    "瑞丰银行": "瑞丰农商行",
    "瑞丰农商银行": "瑞丰农商行",
    "沪农商行": "上海农商行",
    "上海农商银行": "上海农商行",
    "上海农村商业银行": "上海农商行",
    "上海银行": "上海",
    "紫金": "紫金农商行",
    "紫金银行": "紫金农商行",
    "渝农商": "重庆农商行",
    "青农商": "青岛农商行",
}

CORE_MAPPING = {
    "营业收入": "revenue",
    "利息收入": "interestIncome",
    "利息支出": "interestExpense",
    "利息净收入": "netInterestIncome",
    "手续费及佣金净收入": "feeIncome",
    "净利润": "netProfit",
    "利润总额": "totalProfit",
    "所得税费用": "incomeTax",
    "资产总计": "assets",
    "负债合计": "liabilities",
    "股东权益合计": "equity",
    "发放贷款和垫款": "loans",
    "吸收存款": "deposits",
    "交易性金融资产": "tradAsset",
    "债权投资": "debtInvestment",
    "其他债权投资": "otherDebtInvestment",
    "投资收益": "investIncome",
    "公允价值变动损益": "fairValueChgGain",
    "公允价值变动收益": "fairValueChgGain",
    "信用减值损失": "creditImpairLoss",
}

SPECIAL_MAPPING = {
    "总资产收益率": "roa",
    "平均资产回报率": "roa",
    "加权平均净资产收益率": "roe",
    "净利息收益率": "nim",
    "净息差": "nim",
    "净利差": "realLoanDepositSpread",
    "成本收入比": "costIncomeRatio",
    "核心一级资本充足率": "cet1",
    "不良贷款率": "npl",
    "拨备覆盖率": "provisionCoverage",
    "流动性覆盖率": "liquidityCoverageRatio",
    "流动性比例": "liquidityRatio",
    "流动性比率": "liquidityRatio",
    "存贷比": "loanDepositRatio",
}

OTHER_INCOME_MAPPING = {
    "投资收益": "investIncome",
    "公允价值变动损益": "fairValueChgGain",
    "公允价值变动收益": "fairValueChgGain",
    "汇兑损益": "fxGain",
    "其他非利息收入总额": "otherNonInterestIncome",
    "其他非利息收入": "otherNonInterestIncome",
}

PROVISION_MAPPING = {
    "信用减值损失": "creditImpairLoss",
    "信用减值损失（合计）": "creditImpairLoss",
    "资产减值损失": "assetImpairLoss",
    "其他资产减值损失": "otherAssetImpairLoss",
}

PRODUCT_FIELD = {
    "个人贷款和垫款": "personalLoanNpl",
    "个人住房贷款": "housingLoanNpl",
    "住房贷款": "housingLoanNpl",
    "个人经营": "businessLoanNpl",
    "个人经营贷": "businessLoanNpl",
    "个人经营贷款": "businessLoanNpl",
    "个人消费": "consumerLoanNpl",
    "个人消费贷": "consumerLoanNpl",
    "个人消费贷款": "consumerLoanNpl",
    "信用卡": "creditCardLoanNpl",
    "信用卡贷款": "creditCardLoanNpl",
}

FIELD_SOURCE_TABLES = {
    "nim": {"nim_long.csv", "special_metrics_long.csv"},
    "earningAssetYield": {"nim_long.csv"},
    "interestLiabilityCost": {"nim_long.csv"},
    "realLoanDepositSpread": {"special_metrics_long.csv"},
    "npl": {"special_metrics_long.csv"},
    "provisionCoverage": {"special_metrics_long.csv"},
    "cet1": {"special_metrics_long.csv"},
    "liquidityCoverageRatio": {"special_metrics_long.csv", "liquidity_risk_long.csv"},
    "liquidityRatio": {"special_metrics_long.csv", "liquidity_risk_long.csv"},
    "loanDepositRatio": {"special_metrics_long.csv"},
    "housingLoanNpl": {"loan_npl_product_long.csv"},
    "consumerLoanNpl": {"loan_npl_product_long.csv"},
    "businessLoanNpl": {"loan_npl_product_long.csv"},
    "creditCardLoanNpl": {"loan_npl_product_long.csv"},
    "personalLoanNpl": {"loan_npl_product_long.csv"},
    "tradAsset": {"financials_core_long.csv"},
    "debtInvestment": {"financials_core_long.csv"},
    "otherDebtInvestment": {"financials_core_long.csv"},
    "fairValueChgGain": {"financials_core_long.csv", "other_noninterest_income_long.csv"},
    "fxGain": {"other_noninterest_income_long.csv"},
    "investIncome": {"financials_core_long.csv", "other_noninterest_income_long.csv"},
    "otherNonInterestIncome": {"other_noninterest_income_long.csv"},
    "otherAssetImpairLoss": {"provision_long.csv"},
}


def load_js_object(path: Path, var_name: str) -> dict:
    text = path.read_text(encoding="utf-8")
    prefix = f"window.{var_name} = "
    start = text.index(prefix) + len(prefix)
    payload = text[start:].strip()
    if payload.endswith(";"):
        payload = payload[:-1]
    return json.loads(payload)


def is_present(value) -> bool:
    return value is not None and value != ""


def clean_bank_name(name: str) -> str:
    s = (name or "").strip()
    s = s.replace("重庆农村商业银行", "重庆农商行")
    s = s.replace("江苏苏州农村商业银行", "苏州农商行")
    s = s.replace("农村商业银行", "农商行")
    s = s.replace("农商银行", "农商行")
    s = s.replace("银行股份有限公司", "银行")
    s = s.replace("股份有限公司", "")
    s = s.replace("市商业银行", "")
    if s.endswith("银行") and s not in {
        "中国银行", "工商银行", "农业银行", "建设银行", "交通银行", "邮储银行",
        "招商银行", "兴业银行", "浦发银行", "民生银行", "中信银行", "华夏银行",
        "光大银行", "平安银行", "浙商银行", "渤海银行",
    }:
        s = s[:-2]
    return s


def canonical_bank(name: str, main_banks: set[str], data_aliases: dict[str, str]) -> str:
    if not name:
        return ""
    candidates = [
        name,
        MANUAL_ALIASES.get(name, ""),
        data_aliases.get(name, ""),
        clean_bank_name(name),
        MANUAL_ALIASES.get(clean_bank_name(name), ""),
        data_aliases.get(clean_bank_name(name), ""),
    ]
    for candidate in candidates:
        if candidate and candidate in main_banks:
            return candidate
    return next((candidate for candidate in candidates if candidate), name)


def to_number(value):
    if value is None:
        return None
    if isinstance(value, (int, float)):
        return float(value)
    s = str(value).strip().replace(",", "")
    if s in {"", "-", "—", "不适用", "NA", "N/A", "nan", "None"}:
        return None
    try:
        return float(s)
    except ValueError:
        return None


def convert_unit(value, unit: str):
    number = to_number(value)
    if number is None:
        return None
    if "千元" in (unit or ""):
        return number / 10.0
    return number


def normalize_year(value) -> int:
    number = to_number(value)
    return int(number or 2025)


def source_ref(row: dict) -> str:
    return f"{row.get('source_table','')}:{row.get('metric') or row.get('raw_label') or ''}:p{row.get('page','')}"


def build_scraped_indexes(scraped_rows: list[dict], main_banks: set[str], aliases: dict[str, str]):
    values: dict[tuple[str, int], dict[str, float]] = defaultdict(dict)
    sources: dict[tuple[str, int], dict[str, str]] = defaultdict(dict)
    tables: dict[tuple[str, int], set[str]] = defaultdict(set)

    for row in scraped_rows:
        bank = canonical_bank(
            row.get("bank_canonical") or row.get("bank_name_std") or row.get("bank_name_raw"),
            main_banks,
            aliases,
        )
        year = normalize_year(row.get("report_year") or row.get("period"))
        key = (bank, year)
        table = row.get("source_table") or ""
        tables[key].add(table)

        metric = (row.get("metric") or row.get("raw_label") or "").strip()
        raw_label = (row.get("raw_label") or "").strip()
        category = (
            row.get("category_level2")
            or row.get("category_level1")
            or row.get("category")
            or raw_label
            or ""
        ).strip()
        field = None
        value = None

        if table == "financials_core_long.csv":
            field = CORE_MAPPING.get(metric) or CORE_MAPPING.get(raw_label)
            value = convert_unit(row.get("value"), row.get("unit") or "")
        elif table == "special_metrics_long.csv":
            field = SPECIAL_MAPPING.get(metric) or SPECIAL_MAPPING.get(raw_label)
            value = to_number(row.get("value") or row.get("numeric_value"))
        elif table == "other_noninterest_income_long.csv":
            field = OTHER_INCOME_MAPPING.get(metric) or OTHER_INCOME_MAPPING.get(raw_label)
            value = convert_unit(row.get("value"), row.get("unit") or "")
        elif table == "provision_long.csv":
            field = PROVISION_MAPPING.get(metric) or PROVISION_MAPPING.get(raw_label)
            value = convert_unit(row.get("value"), row.get("unit") or "")
        elif table == "loan_npl_product_long.csv":
            field = PRODUCT_FIELD.get(category) or PRODUCT_FIELD.get(raw_label)
            value = to_number(row.get("value") or row.get("numeric_value"))
        elif table == "nim_long.csv":
            metric_code = row.get("metric") or ""
            table_name = row.get("table_name") or ""
            category1 = row.get("category_level1") or ""
            if metric_code in {"nim_pct", "reported_value"} and ("nim" in table_name or "净息差" in raw_label):
                field = "nim"
                value = to_number(row.get("value") or row.get("numeric_value"))
            elif metric_code == "average_yield_pct" and category1 in {"生息资产合计", "总生息资产", "生息资产"}:
                field = "earningAssetYield"
                value = to_number(row.get("value") or row.get("numeric_value"))
            elif metric_code == "average_cost_pct" and category1 in {"计息负债合计", "总计息负债", "计息负债"}:
                field = "interestLiabilityCost"
                value = to_number(row.get("value") or row.get("numeric_value"))

        if field and value is not None and field not in values[key]:
            values[key][field] = round(value, 6)
            sources[key][field] = source_ref(row)

    return values, sources, tables


def quality_status(field: str, selected, main_value, tushare_value, scraped_value, has_related_scraped: bool) -> tuple[str, str]:
    if is_present(selected):
        return "available", "Ready 层已有可用值"
    if field in CALCULATED_METRICS:
        return "calculation_input_missing", "计算输入不足"
    if has_related_scraped:
        return "scraped_available_not_fieldized", "年报已抓取，待字段化"
    if not any(is_present(v) for v in (main_value, tushare_value, scraped_value)):
        return "source_missing", "三源均缺"
    return "source_missing", "未形成 Ready 可用值"


def select_value(field: str, main_value, tushare_value, scraped_value):
    if field in MARKET_METRICS:
        if is_present(tushare_value):
            return tushare_value, "tushare_market"
        if is_present(main_value):
            return main_value, "main"
    if is_present(main_value):
        return main_value, "main"
    if field in SCRAPED_PRIORITY_METRICS and is_present(scraped_value):
        return scraped_value, "annual_report_scraped"
    if is_present(tushare_value):
        return tushare_value, "tushare"
    if is_present(scraped_value):
        return scraped_value, "annual_report_scraped"
    return None, ""


def write_csv(path: Path, rows: list[dict], fieldnames: list[str]):
    with path.open("w", encoding="utf-8", newline="") as handle:
        writer = csv.DictWriter(handle, fieldnames=fieldnames, extrasaction="ignore")
        writer.writeheader()
        writer.writerows(rows)


def main() -> None:
    GOV.mkdir(exist_ok=True)
    vqa = load_js_object(BASE / "data.js", "VQA_DATA")
    tushare = load_js_object(BASE / "data_tushare.js", "VQA_DATA_TUSHARE")
    scraped_rows = json.loads((GOV / "annual_report_scraped_database.json").read_text(encoding="utf-8"))

    main_banks = {item["bank"] for item in vqa.get("banks", [])}
    aliases = {**vqa.get("aliases", {}), **MANUAL_ALIASES}
    side_by_key = {}
    for row in tushare.get("records", []):
        bank = canonical_bank(row.get("bank"), main_banks, aliases)
        side_by_key[(bank, int(row.get("year")))] = row

    scraped_values, scraped_sources, scraped_tables = build_scraped_indexes(scraped_rows, main_banks, aliases)

    ready_records = []
    metric_quality = []
    for source_record in vqa.get("records", []):
        bank = source_record.get("bank")
        year = int(source_record.get("year"))
        key = (bank, year)
        side_record = side_by_key.get(key, {})
        scraped_record = scraped_values.get(key, {})
        table_set = scraped_tables.get(key, set())
        ready = dict(source_record)
        field_sources = {}
        field_status = {}

        for field in READY_FIELDS:
            main_value = source_record.get(field)
            tushare_value = side_record.get(field)
            scraped_value = scraped_record.get(field)
            selected, selected_source = select_value(field, main_value, tushare_value, scraped_value)
            related_tables = FIELD_SOURCE_TABLES.get(field, set())
            has_related_scraped = bool(related_tables & table_set)
            status, reason = quality_status(field, selected, main_value, tushare_value, scraped_value, has_related_scraped)

            if is_present(selected):
                ready[field] = selected
            field_sources[field] = selected_source
            field_status[field] = status
            metric_quality.append({
                "bank": bank,
                "year": year,
                "metric": field,
                "status": status,
                "missingReason": "" if status == "available" else reason,
                "selectedSource": selected_source,
                "mainValue": main_value,
                "tushareValue": tushare_value,
                "scrapedValue": scraped_value,
                "scrapedSource": scraped_sources.get(key, {}).get(field, ""),
                "relatedScrapedTables": ";".join(sorted(related_tables & table_set)),
            })

        ready["_readyFieldSources"] = field_sources
        ready["_readyFieldStatus"] = field_status
        ready_records.append(ready)

    payload = {
        "version": VERSION,
        "generatedAt": datetime.now(timezone.utc).isoformat(),
        "sourcePolicy": {
            "marketMetrics": sorted(MARKET_METRICS),
            "scrapedPriorityMetrics": sorted(SCRAPED_PRIORITY_METRICS),
            "mergePolicy": "main_preserved_market_tushare_scraped_fills_missing",
        },
        "aliases": aliases,
        "records": ready_records,
        "metricQuality": metric_quality,
    }

    (GOV / "ready_record_wide.json").write_text(
        json.dumps(ready_records, ensure_ascii=False, indent=2),
        encoding="utf-8",
    )
    (GOV / "ready_metric_quality.json").write_text(
        json.dumps(metric_quality, ensure_ascii=False, indent=2),
        encoding="utf-8",
    )
    (BASE / "data_ready.js").write_text(
        "window.VQA_DATA_READY = "
        + json.dumps(payload, ensure_ascii=False, separators=(",", ":"))
        + ";\n",
        encoding="utf-8",
    )

    record_fields = ["bank", "type", "region", "year", *READY_FIELDS]
    write_csv(GOV / "ready_record_wide.csv", ready_records, record_fields)
    quality_fields = [
        "bank", "year", "metric", "status", "missingReason", "selectedSource",
        "mainValue", "tushareValue", "scrapedValue", "scrapedSource",
        "relatedScrapedTables",
    ]
    write_csv(GOV / "ready_metric_quality.csv", metric_quality, quality_fields)

    print(f"generated {BASE / 'data_ready.js'}")
    print(f"generated {GOV / 'ready_record_wide.json'}")
    print(f"generated {GOV / 'ready_metric_quality.json'}")


if __name__ == "__main__":
    main()
