import json
import math
from pathlib import Path

import pandas as pd


ROOT = Path(__file__).resolve().parents[2]
BASE = Path(__file__).resolve().parent
SOURCE = ROOT / "数据/更新版数据/全行业银行综合分析2020-2025（含PB） (2).xlsx"
RULES = BASE / "analysis_rules.json"
OUT_DIR = BASE / "data_governance"


REGION = {
    "上海": "华东", "江苏": "华东", "南京": "华东", "宁波": "华东", "杭州": "华东", "苏州": "华东", "厦门": "华东",
    "上海农商行": "华东", "紫金农商行": "华东", "常熟农商行": "华东", "无锡农商行": "华东", "江阴农商行": "华东",
    "张家港农商行": "华东", "苏州农商行": "华东", "瑞丰农商行": "华东",
    "长沙": "华南", "广州农商行": "华南", "东莞农商行": "华南",
    "天津": "华北", "齐鲁": "华北", "青岛": "华北", "青岛农商行": "华北", "威海": "华北", "中原": "华北", "郑州": "华北", "北京": "华北",
    "成都": "中西", "重庆": "中西", "西安": "中西", "兰州": "中西", "江西": "中西", "九江": "中西",
    "贵阳": "中西", "泸州": "中西", "贵州": "中西", "徽商": "中西", "晋商": "中西", "重庆农商行": "中西",
    "宜宾市": "中西", "甘肃": "中西",
    "哈尔滨": "东北",
}

ALIASES = {
    "苏农银行": "苏州农商行",
    "苏州银行": "苏州",
    "杭州银行": "杭州",
    "常熟银行": "常熟农商行",
    "瑞丰银行": "瑞丰农商行",
    "沪农商行": "上海农商行",
}


FIELD_MAP = {
    "bank": ("基本信息", "银行简称"),
    "type": ("基本信息", "银行类型"),
    "year": ("基本信息", "年份"),
    "revenue": ("盈利概览(万元)", "营业收入"),
    "netInterestIncome": ("盈利概览(万元)", "净利息收入"),
    "feeIncome": ("盈利概览(万元)", "手续费净收入"),
    "revenueGrowth": ("盈利概览(万元)", "营业收入增速%"),
    "netProfit": ("盈利概览(万元)", "净利润"),
    "netProfitGrowth": ("盈利概览(万元)", "净利润增速%"),
    "ppop": ("盈利概览(万元)", "PPOP"),
    "ppopGrowth": ("盈利概览(万元)", "PPOP增速%"),
    "coreRevenue": ("盈利概览(万元)", "核心营收"),
    "coreRevenueGrowth": ("盈利概览(万元)", "核心营收增速%"),
    "roe": ("盈利指标", "ROE%"),
    "roa": ("盈利指标", "ROA%"),
    "nim": ("盈利指标", "NIM%"),
    "costIncomeRatio": ("盈利指标", "成本收入比%"),
    "nonInterestShare": ("盈利指标", "非息占比%"),
    "trueCoreNonInterest": ("盈利指标", "真实核心非息%"),
    "volatileIncomeShare": ("盈利指标", "高波动收入%"),
    "assets": ("资产负债(万元)", "资产总计"),
    "liabilities": ("资产负债(万元)", "负债合计"),
    "equity": ("资产负债(万元)", "股东权益"),
    "loans": ("资产负债(万元)", "贷款总额"),
    "deposits": ("资产负债(万元)", "存款总额"),
    "earningAssetYield": ("息差分析", "生息资产收益率%"),
    "interestLiabilityCost": ("息差分析", "计息负债成本率%"),
    "nimGapPoint": ("息差分析", "NIM_Gap百分点"),
    "realLoanDepositSpread": ("息差分析", "真实存贷利差"),
    "npl": ("资产质量", "不良率%"),
    "provisionCoverage": ("资产质量", "拨备覆盖率%"),
    "overdueRatio": ("资产质量", "逾期率%"),
    "specialMentionRatio": ("资产质量", "关注率%"),
    "overdueNplDeviation": ("资产质量", "逾期-不良偏离度"),
    "hiddenNplExposure": ("资产质量", "隐性不良暴露率%"),
    "cet1": ("资本充足率", "核心一级充足%"),
    "cet1Buffer": ("资本充足率", "CET1余量bp"),
    "carBuffer": ("资本充足率", "资本充足余量bp"),
    "estimatedRwa": ("资本充足率", "估算RWA(万元)"),
    "rwaDensity": ("资本充足率", "RWA密度%"),
    "liquidityRatio": ("流动性指标", "流动性比率%"),
    "liquidityCoverageRatio": ("流动性指标", "流动性覆盖率%"),
    "corporateTimeDeposit": ("存款结构(万元)", "公司定期"),
    "personalTimeDeposit": ("存款结构(万元)", "个人定期"),
    "corporateLoanNpl": ("贷款结构(万元)", "公司贷款不良%"),
    "personalLoanNpl": ("贷款结构(万元)", "个人贷款不良%"),
    "billDiscountNpl": ("贷款结构(万元)", "票据贴现不良%"),
    "housingLoanShare": ("个人贷款分产品(万元/%)", "住房贷款占比%"),
    "consumerLoanShare": ("个人贷款分产品(万元/%)", "消费贷款占比%"),
    "businessLoanShare": ("个人贷款分产品(万元/%)", "经营贷款占比%"),
    "housingLoanNpl": ("个人贷款分产品(万元/%)", "住房贷款不良%"),
    "consumerLoanNpl": ("个人贷款分产品(万元/%)", "消费贷款不良%"),
    "businessLoanNpl": ("个人贷款分产品(万元/%)", "经营贷款不良%"),
    "bondInvestment": ("金融投资分布(万元)", "债券合计"),
    "fundInvestment": ("金融投资分布(万元)", "基金"),
    "trustWmInvestment": ("金融投资分布(万元)", "信托及理财"),
    "interestIncome": ("利润表详情(万元)", "利息收入"),
    "interestExpense": ("利润表详情(万元)", "利息支出"),
    "adminExpense": ("利润表详情(万元)", "管理费用"),
    "incomeTax": ("利润表详情(万元)", "所得税"),
    "operatingCashFlow": ("现金流量(万元)", "经营活动净额"),
    "basicEps": ("每股指标", "基本EPS(元)"),
    "pb": ("估值指标", "PB(年末)"),
    "pbMid": ("估值指标", "PB(年中)"),
}

DERIVED_METRICS = {
    "feeAssetRatio": {
        "label": "手续费资产比",
        "theme": "盈利质量",
        "direction": "higherBetter",
        "unit": "%",
        "formula": "手续费净收入 / 资产总计 * 100",
        "source": "派生",
    },
    "timeDepositShare": {
        "label": "定期存款占比",
        "theme": "息差负债",
        "direction": "lowerBetter",
        "unit": "%",
        "formula": "(公司定期 + 个人定期) / 存款总额 * 100",
        "source": "派生",
    },
    "profitPpopGap": {
        "label": "净利与拨备前利润增速缺口",
        "theme": "风险拨备",
        "direction": "contextual",
        "unit": "百分点",
        "formula": "净利润增速 - PPOP增速",
        "source": "派生",
    },
    "nimGapBp": {
        "label": "息差对冲缺口",
        "theme": "息差负债",
        "direction": "lowerBetter",
        "unit": "bp",
        "formula": "(当年生息资产收益率变化 - 当年计息负债成本率变化) * 100",
        "source": "派生",
    },
}

CRITICAL_METRICS = [
    "roa", "coreRevenueGrowth", "nim", "feeAssetRatio", "npl",
    "overdueNplDeviation", "hiddenNplExposure", "provisionCoverage",
    "cet1Buffer", "carBuffer", "rwaDensity", "liquidityCoverageRatio", "pb"
]

RANGE_RULES = {
    "roa": (-10, 10),
    "coreRevenueGrowth": (-100, 200),
    "nim": (-2, 8),
    "feeAssetRatio": (-1, 5),
    "npl": (0, 20),
    "overdueNplDeviation": (0, 10),
    "hiddenNplExposure": (0, 30),
    "provisionCoverage": (0, 1000),
    "cet1Buffer": (-500, 2000),
    "carBuffer": (-500, 3000),
    "rwaDensity": (0, 200),
    "liquidityRatio": (0, 500),
    "liquidityCoverageRatio": (0, 1000),
    "pb": (0, 5),
}


def clean_num(value):
    if value is None:
        return None
    if isinstance(value, float) and math.isnan(value):
        return None
    try:
        if pd.isna(value):
            return None
    except TypeError:
        pass
    if isinstance(value, (int, float)):
        return round(float(value), 6)
    return value


def pct_ratio(num, den):
    if num is None or den in (None, 0):
        return None
    return num / den * 100


def read_rules():
    if RULES.exists():
        return json.loads(RULES.read_text(encoding="utf-8"))
    return {"metrics": {}}


def load_records():
    df = pd.read_excel(SOURCE, sheet_name="综合底表", header=[0, 1])
    rows = []
    for _, row in df.iterrows():
        rec = {}
        for key, col in FIELD_MAP.items():
            rec[key] = clean_num(row[col]) if col in df.columns else None
        if not rec.get("bank") or not rec.get("year"):
            continue
        rec["year"] = int(rec["year"])
        rec["region"] = REGION.get(rec["bank"], "全国")
        rec["feeAssetRatio"] = clean_num(pct_ratio(rec.get("feeIncome"), rec.get("assets")))
        time_deposit = (rec.get("corporateTimeDeposit") or 0) + (rec.get("personalTimeDeposit") or 0)
        rec["timeDepositShare"] = clean_num(pct_ratio(time_deposit, rec.get("deposits")))
        if rec.get("netProfitGrowth") is not None and rec.get("ppopGrowth") is not None:
            rec["profitPpopGap"] = clean_num(rec["netProfitGrowth"] - rec["ppopGrowth"])
        else:
            rec["profitPpopGap"] = None
        rows.append(rec)

    by_bank = {}
    for rec in rows:
        by_bank.setdefault(rec["bank"], []).append(rec)
    for bank_rows in by_bank.values():
        bank_rows.sort(key=lambda item: item["year"])
        prev = None
        for rec in bank_rows:
            if prev:
                ay0, ay1 = prev.get("earningAssetYield"), rec.get("earningAssetYield")
                lc0, lc1 = prev.get("interestLiabilityCost"), rec.get("interestLiabilityCost")
                rec["nimGapBp"] = clean_num(((ay1 - ay0) - (lc1 - lc0)) * 100) if None not in (ay0, ay1, lc0, lc1) else None
                for key in ("assets", "cet1", "provisionCoverage", "pb"):
                    a, b = prev.get(key), rec.get(key)
                    rec[f"{key}Change"] = clean_num(b - a) if None not in (a, b) else None
                for key in ("estimatedRwa", "operatingCashFlow"):
                    a, b = prev.get(key), rec.get(key)
                    rec[f"{key}Change"] = clean_num(b - a) if None not in (a, b) else None
                    rec[f"{key}Growth"] = clean_num((b / a - 1) * 100) if a not in (None, 0) and b is not None else None
            else:
                rec["nimGapBp"] = None
                rec["assetsChange"] = None
                rec["cet1Change"] = None
                rec["provisionCoverageChange"] = None
                rec["pbChange"] = None
                rec["estimatedRwaChange"] = None
                rec["estimatedRwaGrowth"] = None
                rec["operatingCashFlowChange"] = None
                rec["operatingCashFlowGrowth"] = None
            prev = rec
    return rows


def metric_dictionary(rules):
    rule_metrics = rules.get("metrics", {})
    items = []
    for code, col in FIELD_MAP.items():
        if code in {"bank", "type", "year"}:
            continue
        cfg = rule_metrics.get(code, {})
        group, name = col
        unit = "万元" if "万元" in group else ("%" if "%" in name or code in {"roa", "roe", "nim"} else "")
        items.append({
            "metric_code": code,
            "metric_name": cfg.get("label") or name,
            "theme": cfg.get("theme") or group,
            "direction": cfg.get("direction") or "contextual",
            "unit": cfg.get("unit") or unit,
            "source_group": group,
            "source_field": name,
            "formula": "源字段直取",
            "is_derived": False,
            "is_critical": code in CRITICAL_METRICS,
            "used_in_warning": code in json.dumps(rules.get("warningRules", {}), ensure_ascii=False),
            "missing_policy": "保留空值，不用均值替代目标银行",
        })
    for code, cfg in DERIVED_METRICS.items():
        rule_cfg = rule_metrics.get(code, {})
        items.append({
            "metric_code": code,
            "metric_name": rule_cfg.get("label") or cfg["label"],
            "theme": rule_cfg.get("theme") or cfg["theme"],
            "direction": rule_cfg.get("direction") or cfg["direction"],
            "unit": rule_cfg.get("unit") or cfg["unit"],
            "source_group": cfg["source"],
            "source_field": "",
            "formula": cfg["formula"],
            "is_derived": True,
            "is_critical": code in CRITICAL_METRICS,
            "used_in_warning": code in json.dumps(rules.get("warningRules", {}), ensure_ascii=False),
            "missing_policy": "依赖字段缺失则为空，图表自动切换或提示",
        })
    return pd.DataFrame(items).sort_values(["theme", "metric_code"])


def bank_master(records):
    df = pd.DataFrame(records)
    latest_year = int(df["year"].max())
    latest_assets = df[df["year"] == latest_year][["bank", "assets"]].dropna()
    q1 = latest_assets["assets"].quantile(0.33) if not latest_assets.empty else 0
    q2 = latest_assets["assets"].quantile(0.66) if not latest_assets.empty else 0

    def scale_bucket(value):
        if value is None or pd.isna(value):
            return "待补充"
        if value >= q2:
            return "大型样本"
        if value >= q1:
            return "中型样本"
        return "小型样本"

    alias_by_bank = {}
    for alias, bank in ALIASES.items():
        alias_by_bank.setdefault(bank, []).append(alias)

    rows = []
    for idx, (bank, group) in enumerate(df.groupby("bank"), start=1):
        latest = group.sort_values("year").iloc[-1]
        assets = latest.get("assets")
        available_years = sorted(int(y) for y in group["year"].dropna().unique())
        completeness = group[CRITICAL_METRICS].notna().mean().mean()
        rows.append({
            "bank_id": f"B{idx:03d}",
            "bank_short_name": bank,
            "bank_full_name": "",
            "aliases": "、".join(alias_by_bank.get(bank, [])),
            "bank_type": latest.get("type"),
            "region": latest.get("region"),
            "listed_place": "",
            "stock_code": "",
            "first_year": min(available_years),
            "latest_year": max(available_years),
            "available_years_count": len(available_years),
            "latest_assets_万元": assets,
            "asset_scale_bucket": scale_bucket(assets),
            "data_completeness": round(float(completeness), 4),
            "default_benchmark_eligible": bool(completeness >= 0.75 and len(available_years) >= 4),
            "notes": "股票代码、全称和上市地需后续补充或接入外部主数据",
        })
    return pd.DataFrame(rows).sort_values(["bank_type", "region", "bank_short_name"])


def quality_rules():
    return {
        "required_columns": [{"field": f"{group}.{name}", "level": "error"} for group, name in FIELD_MAP.values()],
        "uniqueness": [{"keys": ["银行简称", "年份"], "level": "error", "message": "同一银行同一年只能有一条记录"}],
        "completeness": [
            {"metric": metric, "min_non_null_ratio": 0.85, "scope": "latest_year", "level": "warning"}
            for metric in CRITICAL_METRICS
        ],
        "range_checks": [
            {"metric": metric, "min": bounds[0], "max": bounds[1], "level": "warning"}
            for metric, bounds in RANGE_RULES.items()
        ],
        "consistency_checks": [
            {"name": "资产负债平衡粗校验", "rule": "abs(资产总计 - 负债合计 - 股东权益) / 资产总计 < 2%", "level": "warning"},
            {"name": "PB正数校验", "rule": "PB(年末) > 0", "level": "warning"},
            {"name": "风险指标非负", "rule": "不良率、关注率、逾期率、拨备覆盖率不得为负", "level": "warning"},
            {"name": "核心年份覆盖", "rule": "目标银行和默认对标样本至少覆盖4个年份", "level": "warning"},
        ],
        "fallback_policy": {
            "target_bank_missing": "目标银行指标缺失时不使用均值替代，图表提示口径不足",
            "peer_missing": "对标均值仅使用非空样本，并披露样本数量",
            "derived_missing": "派生字段缺失时切换到当年截面指标或显示口径不足"
        }
    }


def validate(records):
    df = pd.DataFrame(records)
    issues = []
    latest_year = int(df["year"].max())
    duplicate = df[df.duplicated(["bank", "year"], keep=False)]
    for _, row in duplicate.iterrows():
        issues.append({"level": "error", "type": "duplicate", "bank": row["bank"], "year": row["year"], "metric": "", "message": "银行-年份重复"})

    latest = df[df["year"] == latest_year]
    for metric in CRITICAL_METRICS:
        ratio = latest[metric].notna().mean() if metric in latest else 0
        if ratio < 0.85:
            issues.append({"level": "warning", "type": "completeness", "bank": "全样本", "year": latest_year, "metric": metric, "message": f"最新年份非空率 {ratio:.1%} 低于 85%"})

    for metric, (lo, hi) in RANGE_RULES.items():
        if metric not in df:
            continue
        bad = df[df[metric].notna() & ((df[metric] < lo) | (df[metric] > hi))]
        for _, row in bad.iterrows():
            issues.append({"level": "warning", "type": "range", "bank": row["bank"], "year": row["year"], "metric": metric, "message": f"{metric}={row[metric]} 超出建议区间 [{lo}, {hi}]"})

    for _, row in df.iterrows():
        assets, liabilities, equity = row.get("assets"), row.get("liabilities"), row.get("equity")
        if assets not in (None, 0) and liabilities is not None and equity is not None:
            gap = abs(assets - liabilities - equity) / assets
            if gap > 0.02:
                issues.append({"level": "warning", "type": "balance_check", "bank": row["bank"], "year": row["year"], "metric": "assets/liabilities/equity", "message": f"资产负债平衡粗校验差异 {gap:.2%}"})

    return pd.DataFrame(issues)


def write_json(path, payload):
    path.write_text(json.dumps(payload, ensure_ascii=False, indent=2), encoding="utf-8")


def main():
    OUT_DIR.mkdir(parents=True, exist_ok=True)
    rules = read_rules()
    records = load_records()

    metric_df = metric_dictionary(rules)
    bank_df = bank_master(records)
    q_rules = quality_rules()
    issue_df = validate(records)

    metric_df.to_csv(OUT_DIR / "metric_dictionary.csv", index=False, encoding="utf-8-sig")
    write_json(OUT_DIR / "metric_dictionary.json", metric_df.to_dict(orient="records"))

    bank_df.to_csv(OUT_DIR / "bank_master.csv", index=False, encoding="utf-8-sig")
    write_json(OUT_DIR / "bank_master.json", bank_df.to_dict(orient="records"))

    write_json(OUT_DIR / "data_quality_rules.json", q_rules)
    issue_df.to_csv(OUT_DIR / "data_quality_issues.csv", index=False, encoding="utf-8-sig")
    write_json(OUT_DIR / "data_quality_issues.json", issue_df.to_dict(orient="records"))

    latest_year = max(r["year"] for r in records)
    error_count = int((issue_df["level"] == "error").sum()) if not issue_df.empty else 0
    warning_count = int((issue_df["level"] == "warning").sum()) if not issue_df.empty else 0
    report = [
        "# 数据质量校验报告",
        "",
        f"- 数据源：`{SOURCE.name}`",
        f"- 最新年份：{latest_year}",
        f"- 银行数量：{bank_df.shape[0]}",
        f"- 指标数量：{metric_df.shape[0]}",
        f"- 错误数量：{error_count}",
        f"- 警告数量：{warning_count}",
        "",
        "## 最新年份关键指标非空率",
        "",
        "| 指标 | 非空率 |",
        "| --- | ---: |",
    ]
    latest_df = pd.DataFrame(records)
    latest_df = latest_df[latest_df["year"] == latest_year]
    for metric in CRITICAL_METRICS:
        ratio = latest_df[metric].notna().mean() if metric in latest_df else 0
        report.append(f"| {metric} | {ratio:.1%} |")
    report.extend(["", "## 问题样例", ""])
    if issue_df.empty:
        report.append("未发现错误或警告。")
    else:
        report.append("| 级别 | 类型 | 银行 | 年份 | 指标 | 说明 |")
        report.append("| --- | --- | --- | ---: | --- | --- |")
        for _, item in issue_df.head(30).iterrows():
            report.append(f"| {item['level']} | {item['type']} | {item['bank']} | {item['year']} | {item['metric']} | {item['message']} |")
    (OUT_DIR / "data_quality_report.md").write_text("\n".join(report) + "\n", encoding="utf-8")

    print(f"Wrote governance outputs to {OUT_DIR}")
    print(f"Metrics: {metric_df.shape[0]}, banks: {bank_df.shape[0]}, issues: {issue_df.shape[0]}")


if __name__ == "__main__":
    main()
