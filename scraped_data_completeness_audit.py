from __future__ import annotations

import csv
import json
import re
from collections import Counter, defaultdict
from pathlib import Path


ROOT = Path(__file__).parent
PROJECT = ROOT.parents[1]
SCRAPED_ROOT = PROJECT / "数据" / "抓取数据"
DOCS = ROOT / "docs"


def load_js_object(path: Path, var_name: str) -> dict:
    text = path.read_text(encoding="utf-8")
    prefix = f"window.{var_name} = "
    start = text.index(prefix) + len(prefix)
    payload = text[start:].strip()
    if payload.endswith(";"):
        payload = payload[:-1]
    return json.loads(payload)


def open_csv(path: Path):
    for enc in ("utf-8-sig", "gb18030", "utf-8", "latin1"):
        try:
            with path.open(encoding=enc, newline="") as f:
                return list(csv.DictReader(f)), enc
        except UnicodeDecodeError:
            continue
    raise UnicodeDecodeError("unknown", b"", 0, 1, "cannot decode")


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


MANUAL_BANK_ALIASES = {
    "上海银行": "上海",
    "北京银行": "北京",
    "南京银行": "南京",
    "宁波银行": "宁波",
    "江苏银行": "江苏",
    "杭州银行": "杭州",
    "苏州银行": "苏州",
    "青岛银行": "青岛",
    "长沙银行": "长沙",
    "齐鲁银行": "齐鲁",
    "兰州银行": "兰州",
    "西安银行": "西安",
    "贵阳银行": "贵阳",
    "成都银行": "成都",
    "厦门银行": "厦门",
    "重庆银行": "重庆",
    "郑州银行": "郑州",
    "中原银行": "中原",
    "徽商银行": "徽商",
    "贵州银行": "贵州",
    "甘肃银行": "甘肃",
    "江西银行": "江西",
    "晋商银行": "晋商",
    "泸州银行": "泸州",
    "宜宾银行": "宜宾市",
    "九江银行": "九江",
    "威海银行": "威海",
    "上海农商银行": "上海农商行",
    "无锡农商银行": "无锡农商行",
    "常熟农商银行": "常熟农商行",
    "张家港农商银行": "张家港农商行",
    "江阴农商银行": "江阴农商行",
    "苏州农商银行": "苏州农商行",
    "重庆农商银行": "重庆农商行",
    "重庆农村商业银行": "重庆农商行",
    "青岛农商银行": "青岛农商行",
    "东莞农商行": "东莞农商行",
}


def canonical_bank(name: str, main_banks: set[str], data_aliases: dict[str, str]) -> str:
    if not name:
        return ""
    candidates = [
        name,
        MANUAL_BANK_ALIASES.get(name, ""),
        data_aliases.get(name, ""),
        clean_bank_name(name),
        MANUAL_BANK_ALIASES.get(clean_bank_name(name), ""),
        data_aliases.get(clean_bank_name(name), ""),
    ]
    for c in candidates:
        if c and c in main_banks:
            return c
    return candidates[1] or candidates[3] or name


def to_float(value):
    if value is None:
        return None
    s = str(value).strip().replace(",", "")
    if s in {"", "-", "—", "不适用", "NA", "N/A", "nan", "None"}:
        return None
    try:
        return float(s)
    except ValueError:
        return None


def convert_unit(value, unit: str):
    v = to_float(value)
    if v is None:
        return None
    if "千元" in (unit or ""):
        return v / 10.0
    return v


def pct_diff(a, b):
    if a is None or b is None:
        return None
    base = max(abs(a), abs(b), 1.0)
    return abs(a - b) / base


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
    "汇兑损益": "fxGain",
    "其他非利息收入总额": "otherNonInterestIncome",
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
    "个人消费": "consumerLoanNpl",
    "个人消费贷款": "consumerLoanNpl",
    "信用卡贷款": "creditCardLoanNpl",
}


def main():
    DOCS.mkdir(exist_ok=True)
    vqa = load_js_object(ROOT / "data.js", "VQA_DATA")
    tushare = load_js_object(ROOT / "data_tushare.js", "VQA_DATA_TUSHARE")
    main_records = vqa.get("records", [])
    side_records = tushare.get("records", [])
    main_banks = {b["bank"] for b in vqa.get("banks", [])}
    data_aliases = vqa.get("aliases", {})

    main_by_key = {(r.get("bank"), int(r.get("year"))): r for r in main_records}
    side_by_key = {(r.get("bank"), int(r.get("year"))): r for r in side_records}

    csv_files = [p for p in SCRAPED_ROOT.glob("**/*.csv") if p.name != ".DS_Store"]
    file_type_counts = Counter()
    bank_file_types = defaultdict(set)
    encodings = Counter()
    read_errors = []
    scraped_values = defaultdict(dict)
    scraped_sources = defaultdict(dict)
    raw_field_presence = Counter()
    raw_by_type_presence = defaultdict(Counter)
    status_counts = Counter()
    bank_names = set()

    for path in csv_files:
        try:
            rows, enc = open_csv(path)
            encodings[enc] += 1
        except Exception as exc:
            read_errors.append((str(path), str(exc)))
            continue
        filename = path.name
        kind = filename.split("_2025_", 1)[1] if "_2025_" in filename else filename
        kind = kind.replace("晋商银行2025_", "")
        file_type_counts[kind] += 1
        file_bank_raw = (rows[0].get("bank_name_std") or rows[0].get("bank_name")) if rows else path.parent.name
        file_bank_canon = canonical_bank(file_bank_raw, main_banks, data_aliases)
        bank_file_types[file_bank_canon].add(kind)
        for row in rows:
            bank_raw = row.get("bank_name_std") or row.get("bank_name") or file_bank_raw
            bank = canonical_bank(bank_raw, main_banks, data_aliases)
            if bank:
                bank_names.add(bank)
            year = int(to_float(row.get("report_year") or row.get("period") or 2025) or 2025)
            key = (bank, year)
            if row.get("missing_status"):
                status_counts[row.get("missing_status")] += 1
            metric = (row.get("metric") or row.get("raw_label") or "").strip()
            field = None
            value = None
            unit = row.get("unit") or ""

            if "financials_core_long" in kind:
                field = CORE_MAPPING.get(metric)
                value = convert_unit(row.get("value"), unit)
            elif "special_metrics_long" in kind:
                field = SPECIAL_MAPPING.get(metric)
                value = to_float(row.get("value"))
            elif "other_noninterest_income_long" in kind:
                field = OTHER_INCOME_MAPPING.get(metric)
                value = convert_unit(row.get("value"), unit)
            elif "provision_long" in kind:
                field = PROVISION_MAPPING.get(metric)
                value = convert_unit(row.get("value"), unit)
            elif "loan_npl_product_long" in kind:
                cat = row.get("category_level2") or row.get("category_level1") or ""
                field = PRODUCT_FIELD.get(cat.strip())
                value = to_float(row.get("npl_ratio_pct"))
            elif "nim_long" in kind:
                table = row.get("table_name") or ""
                cat = row.get("category_level1") or ""
                metric_code = row.get("metric") or ""
                if metric_code in {"nim_pct", "reported_value"} and ("nim" in table or "净息差" in row.get("raw_label", "")):
                    field = "nim"
                    value = to_float(row.get("value"))
                elif metric_code == "average_yield_pct" and cat in {"生息资产合计", "总生息资产", "生息资产"}:
                    field = "earningAssetYield"
                    value = to_float(row.get("value"))
                elif metric_code == "average_cost_pct" and cat in {"计息负债合计", "总计息负债", "计息负债"}:
                    field = "interestLiabilityCost"
                    value = to_float(row.get("value"))

            if field and value is not None:
                current = scraped_values[key].get(field)
                if current is None:
                    scraped_values[key][field] = value
                    scraped_sources[key][field] = f"{kind}:{metric}:p{row.get('page','')}"
                    raw_field_presence[field] += 1
                    raw_by_type_presence[kind][field] += 1

    mapped_keys = sorted(scraped_values)
    mapped_fields = sorted({f for vals in scraped_values.values() for f in vals})
    compared_rows = []
    conflict_detail_rows = []
    for field in mapped_fields:
        keys_with_scraped = [k for k in mapped_keys if field in scraped_values[k]]
        main_matches = []
        side_matches = []
        main_conflicts = []
        side_conflicts = []
        for key in keys_with_scraped:
            sv = scraped_values[key][field]
            mv = main_by_key.get(key, {}).get(field)
            tv = side_by_key.get(key, {}).get(field)
            if mv is not None:
                main_matches.append(key)
                d = pct_diff(sv, mv)
                if d is not None and d > 0.03:
                    main_conflicts.append((key, sv, mv, d))
                    conflict_detail_rows.append({
                        "field": field,
                        "bank": key[0],
                        "year": key[1],
                        "source": "main",
                        "scraped_value": sv,
                        "other_value": mv,
                        "pct_diff": d,
                        "scraped_source": scraped_sources[key].get(field, ""),
                    })
            if tv is not None:
                side_matches.append(key)
                d = pct_diff(sv, tv)
                if d is not None and d > 0.03:
                    side_conflicts.append((key, sv, tv, d))
                    conflict_detail_rows.append({
                        "field": field,
                        "bank": key[0],
                        "year": key[1],
                        "source": "tushare",
                        "scraped_value": sv,
                        "other_value": tv,
                        "pct_diff": d,
                        "scraped_source": scraped_sources[key].get(field, ""),
                    })
        compared_rows.append({
            "field": field,
            "scraped_non_null": len(keys_with_scraped),
            "scraped_bank_year_coverage": len(keys_with_scraped) / max(len(mapped_keys), 1),
            "main_overlap": len(main_matches),
            "main_conflict_gt3pct": len(main_conflicts),
            "tushare_overlap": len(side_matches),
            "tushare_conflict_gt3pct": len(side_conflicts),
        })

    compared_rows.sort(key=lambda x: (-x["scraped_non_null"], x["field"]))

    out_csv = DOCS / "scraped-vs-main-tushare-field-completeness.csv"
    with out_csv.open("w", encoding="utf-8", newline="") as f:
        w = csv.DictWriter(f, fieldnames=list(compared_rows[0].keys()))
        w.writeheader()
        w.writerows(compared_rows)

    raw_csv = DOCS / "scraped-data-raw-table-coverage.csv"
    with raw_csv.open("w", encoding="utf-8", newline="") as f:
        w = csv.writer(f)
        w.writerow(["file_type", "files", "mapped_fields"])
        for kind, count in file_type_counts.most_common():
            w.writerow([kind, count, ";".join(sorted(raw_by_type_presence[kind]))])

    conflicts_csv = DOCS / "scraped-vs-main-tushare-conflicts.csv"
    conflict_detail_rows.sort(key=lambda r: (-r["pct_diff"], r["field"], r["bank"]))
    with conflicts_csv.open("w", encoding="utf-8", newline="") as f:
        fieldnames = ["field", "bank", "year", "source", "scraped_value", "other_value", "pct_diff", "scraped_source"]
        w = csv.DictWriter(f, fieldnames=fieldnames)
        w.writeheader()
        w.writerows(conflict_detail_rows)

    bank_rows = []
    for bank in sorted(b for b in bank_names if b):
        fields = set()
        for (b, _year), values in scraped_values.items():
            if b == bank:
                fields.update(values)
        bank_rows.append({
            "bank": bank,
            "mapped_fields": len(fields),
            "has_main_2025": "Y" if (bank, 2025) in main_by_key else "N",
            "has_tushare_2025": "Y" if (bank, 2025) in side_by_key else "N",
            "file_types": len(bank_file_types.get(bank, set())),
        })
    bank_csv = DOCS / "scraped-bank-coverage.csv"
    with bank_csv.open("w", encoding="utf-8", newline="") as f:
        w = csv.DictWriter(f, fieldnames=["bank", "mapped_fields", "has_main_2025", "has_tushare_2025", "file_types"])
        w.writeheader()
        w.writerows(bank_rows)

    field_rows = "\n".join(
        f"|{r['field']}|{r['scraped_non_null']}|{r['scraped_bank_year_coverage']:.1%}|{r['main_overlap']}|{r['main_conflict_gt3pct']}|{r['tushare_overlap']}|{r['tushare_conflict_gt3pct']}|"
        for r in compared_rows
    )
    report = f"""# 年报抓取数据 × 原有数据 × Tushare 完整性分析

生成日期：2026-06-03

## 1. 数据范围

- 原有主数据：{len(main_records)} 条 bank-year，{len(main_banks)} 家银行。
- Tushare sidecar：{len(side_records)} 条 bank-year。
- 年报抓取数据：{len(csv_files)} 个 CSV，成功读取 {len(csv_files) - len(read_errors)} 个，识别到 {len(bank_names)} 家标准化银行。
- 抓取数据当前主要是 2025 年年报口径，适合补充监管指标、附注指标、期限结构和分产品/分行业风险字段。

## 2. 抓取数据表覆盖

|表类型|文件数|已映射到系统字段|
|---|---:|---|
""" + "\n".join(
        f"|{kind}|{count}|{', '.join(sorted(raw_by_type_presence[kind])) or '暂未映射，建议入数据仓库明细表'}|"
        for kind, count in file_type_counts.most_common()
    ) + f"""

## 3. 已可对标的字段完整性

|系统字段|抓取非空 bank-year|抓取覆盖|与主数据重叠|主数据差异>3%|与Tushare重叠|Tushare差异>3%|
|---|---:|---:|---:|---:|---:|---:|
{field_rows}

## 4. 初步判断

1. 抓取数据最有价值的不是替代 Tushare，而是补 Tushare 不覆盖的附注/监管口径：不良率、拨备覆盖率、核心一级资本充足率、流动性覆盖率、分产品不良、IFRS9 三阶段、重定价期限、流动性期限。
2. 原有主数据仍适合作为 2020-2025 的主表，因为历史覆盖完整；抓取数据目前应作为 2025 年报核验层和附注明细层。
3. Tushare 适合做标准三表和市场行情补充；抓取年报适合做监管指标和深钻专题。两者职责应分开，避免互相强替。
4. 差异 >3% 的字段需要二次复核，常见原因是单位、集团/母公司口径、净额/总额口径、利润归母/净利润口径。
5. Tushare 当前财务三表侧重点仍是 2020-2024 完整年报；2025 抓取年报与 Tushare 财务字段重叠较少，市场行情字段则由 Tushare 单独补。

## 5. 建议的数据仓库分层

- `fact_bank_core_financials`：主表字段，保留原有口径，抓取/Tushare 只做补齐或校验。
- `fact_bank_regulatory_metrics`：NIM、不良、拨备、资本、流动性等监管指标，优先来自年报抓取。
- `fact_bank_retail_risk_product`：个人住房、经营、消费、信用卡贷款余额和不良率。
- `fact_bank_ifrs9_stage`：三阶段余额、减值准备、阶段占比、覆盖率。
- `fact_bank_repricing_gap`：资产/负债重定价期限桶。
- `fact_bank_liquidity_maturity`：流动性期限错配。
- `fact_bank_fee_commission_detail` 与 `fact_bank_noninterest_income_detail`：手续费与非息收入拆分。

## 6. 输出文件

- `{out_csv}`：字段级三源完整性和冲突统计。
- `{raw_csv}`：抓取原始表覆盖和映射情况。
- `{conflicts_csv}`：字段差异 >3% 的银行级明细。
- `{bank_csv}`：抓取银行覆盖与主数据/Tushare 是否可对标。
"""
    report_path = DOCS / "scraped-vs-main-tushare-completeness-report.md"
    report_path.write_text(report, encoding="utf-8")

    summary = {
        "scraped_csv_files": len(csv_files),
        "scraped_csv_read_ok": len(csv_files) - len(read_errors),
        "scraped_banks_normalized": len(bank_names),
        "mapped_bank_years": len(mapped_keys),
        "mapped_fields": len(mapped_fields),
        "file_types": dict(file_type_counts.most_common()),
        "read_errors": read_errors[:10],
        "outputs": [str(report_path), str(out_csv), str(raw_csv), str(conflicts_csv), str(bank_csv)],
    }
    print(json.dumps(summary, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
