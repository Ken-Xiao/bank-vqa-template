from __future__ import annotations

import csv
import json
import re
from collections import Counter, defaultdict
from pathlib import Path


ROOT = Path(__file__).resolve().parents[2]
BASE = Path(__file__).resolve().parent
SCRAPED_ROOT = ROOT / "数据" / "抓取数据"
OUT_DIR = BASE / "data_governance"

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

OUTPUT_FIELDS = [
    "bank_canonical",
    "bank_name_std",
    "bank_name_raw",
    "report_year",
    "source_table",
    "scope",
    "table_name",
    "statement_type",
    "statement_section",
    "category_level1",
    "category_level2",
    "category_level3",
    "category",
    "metric",
    "raw_label",
    "period",
    "value",
    "numeric_value",
    "unit",
    "page",
    "source_url",
    "missing_status",
    "review_status",
    "evidence_id",
    "notes",
    "source_paths",
    "duplicate_count",
]


def read_csv(path: Path) -> tuple[list[dict], str]:
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


def canonical_bank(name: str) -> str:
    s = (name or "").strip()
    return MANUAL_BANK_ALIASES.get(s) or MANUAL_BANK_ALIASES.get(clean_bank_name(s)) or clean_bank_name(s) or s


def source_table_from_name(filename: str) -> str:
    if "_2025_" in filename:
        return filename.split("_2025_", 1)[1]
    return re.sub(r"^[^_]+_\d{4}_", "", filename)


def to_number(value: str) -> float | None:
    s = str(value or "").strip().replace(",", "")
    if s in {"", "-", "—", "NA", "N/A", "nan", "None", "不适用"}:
        return None
    try:
        return float(s)
    except ValueError:
        return None


def normalized_year(row: dict) -> str:
    raw = row.get("report_year") or row.get("fiscal_year") or row.get("year") or "2025"
    number = to_number(raw)
    return str(int(number or 2025))


def normalized_row(path: Path, row: dict) -> dict:
    bank_std = (row.get("bank_name_std") or row.get("bank_name") or path.parent.name or "").strip()
    bank_raw = (row.get("bank_name") or row.get("bank_name_std") or path.parent.name or "").strip()
    value = row.get("value") or row.get("metric_value") or row.get("balance") or row.get("amount") or row.get("npl_ratio_pct") or ""
    out = {
        "bank_canonical": canonical_bank(bank_std or bank_raw),
        "bank_name_std": bank_std,
        "bank_name_raw": bank_raw,
        "report_year": normalized_year(row),
        "source_table": source_table_from_name(path.name),
        "scope": row.get("scope", ""),
        "table_name": row.get("table_name") or row.get("raw_table_name") or "",
        "statement_type": row.get("statement_type", ""),
        "statement_section": row.get("statement_section", ""),
        "category_level1": row.get("category_level1", ""),
        "category_level2": row.get("category_level2", ""),
        "category_level3": row.get("category_level3", ""),
        "category": row.get("category", ""),
        "metric": row.get("metric", ""),
        "raw_label": row.get("raw_label", ""),
        "period": row.get("period", ""),
        "value": value,
        "numeric_value": to_number(value),
        "unit": row.get("unit", ""),
        "page": row.get("page", ""),
        "source_url": row.get("source_url", ""),
        "missing_status": row.get("missing_status") or row.get("status") or "",
        "review_status": row.get("review_status", ""),
        "evidence_id": row.get("evidence_id", ""),
        "notes": row.get("notes", ""),
        "source_paths": str(path.relative_to(ROOT)),
        "duplicate_count": 1,
    }
    return out


def dedupe_key(row: dict) -> tuple:
    return (
        row["bank_canonical"],
        row["report_year"],
        row["source_table"],
        row["scope"],
        row["table_name"],
        row["statement_type"],
        row["statement_section"],
        row["category_level1"],
        row["category_level2"],
        row["category_level3"],
        row["category"],
        row["metric"],
        row["raw_label"],
        row["period"],
        str(row["numeric_value"]),
        row["unit"],
        row["page"],
    )


def write_csv(path: Path, rows: list[dict], fieldnames: list[str]) -> None:
    with path.open("w", encoding="utf-8", newline="") as f:
        writer = csv.DictWriter(f, fieldnames=fieldnames)
        writer.writeheader()
        writer.writerows(rows)


def main() -> None:
    OUT_DIR.mkdir(exist_ok=True)
    csv_files = sorted(p for p in SCRAPED_ROOT.glob("**/*.csv") if p.name != ".DS_Store")
    read_errors = []
    deduped: dict[tuple, dict] = {}
    encodings = Counter()
    source_table_files = Counter()

    for path in csv_files:
        try:
            rows, enc = read_csv(path)
            encodings[enc] += 1
        except Exception as exc:
            read_errors.append({"path": str(path.relative_to(ROOT)), "error": str(exc)})
            continue
        source_table_files[source_table_from_name(path.name)] += 1
        for raw in rows:
            row = normalized_row(path, raw)
            key = dedupe_key(row)
            existing = deduped.get(key)
            if existing:
                paths = set(existing["source_paths"].split(";"))
                paths.add(row["source_paths"])
                existing["source_paths"] = ";".join(sorted(paths))
                existing["duplicate_count"] = int(existing["duplicate_count"]) + 1
            else:
                deduped[key] = row

    database_rows = sorted(
        deduped.values(),
        key=lambda r: (r["bank_canonical"], r["report_year"], r["source_table"], r["metric"], r["raw_label"], r["page"]),
    )

    bank_table_counts: dict[tuple[str, str], Counter] = defaultdict(Counter)
    bank_row_counts: Counter = Counter()
    for row in database_rows:
        bank = row["bank_canonical"]
        year = row["report_year"]
        bank_table_counts[(bank, year)][row["source_table"]] += 1
        bank_row_counts[(bank, year)] += 1

    bank_index_rows = []
    for (bank, year), table_counts in sorted(bank_table_counts.items()):
        bank_index_rows.append({
            "bank_canonical": bank,
            "report_year": year,
            "source_tables": len(table_counts),
            "database_rows": bank_row_counts[(bank, year)],
            "source_table_list": ";".join(sorted(table_counts)),
        })

    source_table_rows = []
    table_row_counts = Counter(row["source_table"] for row in database_rows)
    for table, files in sorted(source_table_files.items()):
        source_table_rows.append({
            "source_table": table,
            "raw_csv_files": files,
            "deduped_rows": table_row_counts.get(table, 0),
        })

    db_csv = OUT_DIR / "annual_report_scraped_database.csv"
    db_json = OUT_DIR / "annual_report_scraped_database.json"
    bank_index_csv = OUT_DIR / "annual_report_scraped_bank_index.csv"
    source_table_csv = OUT_DIR / "annual_report_scraped_source_tables.csv"

    write_csv(db_csv, database_rows, OUTPUT_FIELDS)
    db_json.write_text(json.dumps(database_rows, ensure_ascii=False, indent=2), encoding="utf-8")
    write_csv(bank_index_csv, bank_index_rows, ["bank_canonical", "report_year", "source_tables", "database_rows", "source_table_list"])
    write_csv(source_table_csv, source_table_rows, ["source_table", "raw_csv_files", "deduped_rows"])

    hangzhou = [row for row in database_rows if row["bank_canonical"] == "杭州"]
    summary = {
        "raw_csv_files": len(csv_files),
        "read_errors": read_errors,
        "deduped_rows": len(database_rows),
        "banks": len({row["bank_canonical"] for row in database_rows}),
        "bank_years": len(bank_index_rows),
        "source_tables": len(source_table_rows),
        "hangzhou_rows": len(hangzhou),
        "hangzhou_source_tables": sorted({row["source_table"] for row in hangzhou}),
        "outputs": [
            str(db_csv),
            str(db_json),
            str(bank_index_csv),
            str(source_table_csv),
        ],
    }
    print(json.dumps(summary, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
