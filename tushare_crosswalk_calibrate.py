"""
BenchmarkIQ × Tushare crosswalk calibration.

This script does not change mappings or generated data. It reads the existing
BenchmarkIQ data.js and cached Tushare parquet files, then emits review artifacts:

  docs/tushare-crosswalk-calibration-report.md
  docs/tushare-crosswalk-calibration.csv
  docs/tushare-derived-field-candidates.csv
  docs/tushare-field-coverage-current.csv

The governance rule is: every candidate is tagged as direct_exact,
derived_formula, validation_only, proxy_candidate, or blocked_missing.
"""

from __future__ import annotations

import csv
import json
import math
import statistics
from dataclasses import dataclass
from pathlib import Path
from typing import Callable, Optional

import pandas as pd


ROOT = Path(__file__).parent
CACHE = ROOT / "data_tushare_cache"
DOCS = ROOT / "docs"
DOCS.mkdir(exist_ok=True)


BANK_NAME_TO_TS_CODE = {
    "工商银行": "601398.SH",
    "建设银行": "601939.SH",
    "农业银行": "601288.SH",
    "中国银行": "601988.SH",
    "邮储银行": "601658.SH",
    "交通银行": "601328.SH",
    "招商银行": "600036.SH",
    "兴业银行": "601166.SH",
    "浦发银行": "600000.SH",
    "民生银行": "600016.SH",
    "中信银行": "601998.SH",
    "华夏银行": "600015.SH",
    "光大银行": "601818.SH",
    "平安银行": "000001.SZ",
    "浙商银行": "601916.SH",
    "北京": "601169.SH",
    "杭州": "600926.SH",
    "宁波": "002142.SZ",
    "南京": "601009.SH",
    "上海": "601229.SH",
    "苏州": "002966.SZ",
    "青岛": "002948.SZ",
    "贵阳": "601997.SH",
    "长沙": "601577.SH",
    "齐鲁": "601665.SH",
    "兰州": "601136.SH",
    "西安": "601596.SH",
    "郑州": "002936.SZ",
    "成都": "601838.SH",
    "厦门": "601187.SH",
    "重庆": "601963.SH",
    "常熟农商行": "601128.SH",
    "重庆农商行": "601077.SH",
    "瑞丰农商行": "601528.SH",
    "青岛农商行": "002958.SZ",
    "江阴农商行": "002807.SZ",
    "苏州农商行": "603323.SH",
    "张家港农商行": "002839.SZ",
    "紫金农商行": "601860.SH",
}


def load_vqa_data() -> dict:
    text = (ROOT / "data.js").read_text(encoding="utf-8")
    prefix = "window.VQA_DATA = "
    if not text.startswith(prefix):
        raise RuntimeError("data.js does not start with window.VQA_DATA assignment")
    raw = text[len(prefix):].strip()
    if raw.endswith(";"):
        raw = raw[:-1]
    return json.loads(raw)


def load_parquets() -> dict[str, pd.DataFrame]:
    out = {}
    for name in ["balancesheet", "income", "cashflow", "fina_indicator", "daily_basic"]:
        path = CACHE / f"{name}.parquet"
        if path.exists():
            out[name] = pd.read_parquet(path)
    return out


def year_end_row(df: pd.DataFrame, ts_code: str, year: int) -> Optional[pd.Series]:
    if df is None or df.empty or "end_date" not in df.columns:
        return None
    rows = df[(df["ts_code"] == ts_code) & (df["end_date"] == f"{year}1231")]
    return rows.iloc[0] if not rows.empty else None


def market_row(df: pd.DataFrame, ts_code: str, year: int, mode: str) -> Optional[pd.Series]:
    if df is None or df.empty:
        return None
    rows = df[(df["ts_code"] == ts_code) & (df["trade_date"].str.startswith(str(year)))]
    if rows.empty:
        return None
    if mode == "mid":
        mid = rows[rows["trade_date"] <= f"{year}0630"]
        rows = mid if not mid.empty else rows
    rows = rows.sort_values("trade_date", ascending=False)
    return rows.iloc[0]


def num(value):
    if value is None:
        return None
    try:
        if pd.isna(value):
            return None
        return float(value)
    except (TypeError, ValueError):
        return None


def wanyuan(value):
    v = num(value)
    return None if v is None else v / 10000


def pct(value):
    return num(value)


def safe_div(a, b, scale=1):
    a = num(a)
    b = num(b)
    if a is None or b in (None, 0):
        return None
    return a / b * scale


@dataclass
class Candidate:
    metric: str
    name: str
    status: str
    source: str
    formula: str
    fn: Callable[[dict], Optional[float]]
    review_note: str = ""


def get(ctx: dict, table: str, field: str):
    row = ctx.get(table)
    if row is None or field not in row.index:
        return None
    return row[field]


def candidate_specs() -> list[Candidate]:
    return [
        Candidate("revenue", "营业收入", "direct_exact", "income.revenue", "yuan/10000", lambda c: wanyuan(get(c, "income", "revenue"))),
        Candidate("netProfit", "净利润", "direct_exact", "income.n_income", "yuan/10000", lambda c: wanyuan(get(c, "income", "n_income"))),
        Candidate("interestIncome", "利息收入", "direct_exact", "income.int_income", "yuan/10000", lambda c: wanyuan(get(c, "income", "int_income"))),
        Candidate("interestExpense", "利息支出", "direct_exact", "income.int_exp", "yuan/10000", lambda c: wanyuan(get(c, "income", "int_exp"))),
        Candidate("feeIncome", "手续费净收入", "direct_exact", "income.n_commis_income", "yuan/10000", lambda c: wanyuan(get(c, "income", "n_commis_income"))),
        Candidate("incomeTax", "所得税", "direct_exact", "income.income_tax", "yuan/10000", lambda c: wanyuan(get(c, "income", "income_tax"))),
        Candidate("adminExpense", "管理费用", "proxy_candidate", "income.admin_exp", "yuan/10000", lambda c: wanyuan(get(c, "income", "admin_exp")), "需确认 BQ 管理费用是否为 admin_exp，不可沿用 biz_tax_surchg"),
        Candidate("basicEps", "基本EPS", "direct_exact", "income.basic_eps", "as-is", lambda c: num(get(c, "income", "basic_eps"))),
        Candidate("assets", "资产总计", "direct_exact", "balancesheet.total_assets", "yuan/10000", lambda c: wanyuan(get(c, "balancesheet", "total_assets"))),
        Candidate("liabilities", "负债合计", "direct_exact", "balancesheet.total_liab", "yuan/10000", lambda c: wanyuan(get(c, "balancesheet", "total_liab"))),
        Candidate("equity", "股东权益", "direct_exact", "balancesheet.total_hldr_eqy_inc_min_int", "yuan/10000", lambda c: wanyuan(get(c, "balancesheet", "total_hldr_eqy_inc_min_int"))),
        Candidate("loans", "贷款总额", "direct_exact", "balancesheet.loanto_oth_bank_fi", "yuan/10000", lambda c: wanyuan(get(c, "balancesheet", "loanto_oth_bank_fi")), "字段名为向其他银行/金融机构贷款，需用样本复核是否等于发放贷款及垫款"),
        Candidate("deposits", "存款总额", "direct_exact", "balancesheet.depos", "yuan/10000", lambda c: wanyuan(get(c, "balancesheet", "depos")), "需确认是否为吸收存款而非同业存放"),
        Candidate("operatingCashFlow", "经营现金流净额", "direct_exact", "cashflow.n_cashflow_act", "yuan/10000", lambda c: wanyuan(get(c, "cashflow", "n_cashflow_act"))),
        Candidate("pb", "年末PB", "direct_exact", "daily_basic.pb year-end", "as-is", lambda c: num(get(c, "market_end", "pb"))),
        Candidate("pbMid", "年中PB", "direct_exact", "daily_basic.pb mid-year", "as-is", lambda c: num(get(c, "market_mid", "pb"))),
        Candidate("peTtm", "PE TTM", "direct_exact", "daily_basic.pe_ttm year-end", "as-is", lambda c: num(get(c, "market_end", "pe_ttm"))),
        Candidate("divYield", "股息率", "direct_exact", "daily_basic.dv_ratio year-end", "as-is", lambda c: pct(get(c, "market_end", "dv_ratio"))),
        Candidate("divYieldTtm", "TTM股息率", "direct_exact", "daily_basic.dv_ttm year-end", "as-is", lambda c: pct(get(c, "market_end", "dv_ttm"))),
        Candidate("totalMarketValue", "总市值", "direct_exact", "daily_basic.total_mv year-end", "万元 as-is", lambda c: num(get(c, "market_end", "total_mv"))),
        Candidate("turnoverRate", "换手率", "direct_exact", "daily_basic.turnover_rate year-end", "as-is", lambda c: pct(get(c, "market_end", "turnover_rate"))),
        Candidate("roe", "ROE", "validation_only", "fina_indicator.roe", "as-is", lambda c: pct(get(c, "fina_indicator", "roe")), "只做交叉验证，不覆盖 BQ 主字段"),
        Candidate("roa", "ROA", "validation_only", "fina_indicator.roa_yearly", "as-is", lambda c: pct(get(c, "fina_indicator", "roa_yearly")), "当前 roa 覆盖 0，roa_yearly 覆盖 100%，需人工确认口径"),
        Candidate("revenueGrowth", "营业收入增速", "validation_only", "fina_indicator.tr_yoy", "as-is", lambda c: pct(get(c, "fina_indicator", "tr_yoy"))),
        Candidate("netProfitGrowth", "净利润增速", "validation_only", "fina_indicator.netprofit_yoy", "as-is", lambda c: pct(get(c, "fina_indicator", "netprofit_yoy"))),
        Candidate("assetGrowth", "资产增速", "validation_only", "fina_indicator.assets_yoy", "as-is", lambda c: pct(get(c, "fina_indicator", "assets_yoy"))),
        Candidate("netInterestIncome", "净利息收入", "derived_formula", "income.int_income - income.int_exp", "(yuan-yuan)/10000", lambda c: wanyuan((num(get(c, "income", "int_income")) or 0) - (num(get(c, "income", "int_exp")) or 0)) if num(get(c, "income", "int_income")) is not None and num(get(c, "income", "int_exp")) is not None else None),
        Candidate("coreRevenue", "核心营收", "derived_formula", "netInterestIncome + feeIncome", "万元+万元", lambda c: (c["derived"].get("netInterestIncome") + c["derived"].get("feeIncome")) if c["derived"].get("netInterestIncome") is not None and c["derived"].get("feeIncome") is not None else None),
        Candidate("nonInterestShare", "非息占比", "derived_formula", "(revenue - netInterestIncome) / revenue", "%", lambda c: safe_div((c["derived"].get("revenue") or 0) - (c["derived"].get("netInterestIncome") or 0), c["derived"].get("revenue"), 100) if c["derived"].get("revenue") is not None and c["derived"].get("netInterestIncome") is not None else None),
        Candidate("feeAssetRatio", "手续费资产比", "derived_formula", "feeIncome / assets", "%", lambda c: safe_div(c["derived"].get("feeIncome"), c["derived"].get("assets"), 100)),
        Candidate("loanAssetRatio", "贷款/资产", "derived_formula", "loans / assets", "%", lambda c: safe_div(c["derived"].get("loans"), c["derived"].get("assets"), 100)),
        Candidate("depositLiabilityRatio", "存款/负债", "derived_formula", "deposits / liabilities", "%", lambda c: safe_div(c["derived"].get("deposits"), c["derived"].get("liabilities"), 100)),
        Candidate("cashProfitRatio", "经营现金流/净利润", "derived_formula", "operatingCashFlow / netProfit", "%", lambda c: safe_div(c["derived"].get("operatingCashFlow"), c["derived"].get("netProfit"), 100)),
        Candidate("costIncomeRatio", "成本收入比", "proxy_candidate", "income.admin_exp / income.revenue", "%", lambda c: safe_div(wanyuan(get(c, "income", "admin_exp")), wanyuan(get(c, "income", "revenue")), 100), "费用字段需业务确认"),
        Candidate("fvChangeRatio", "公允价值变动占利润比", "derived_formula", "income.fv_value_chg_gain / income.total_profit", "%", lambda c: safe_div(wanyuan(get(c, "income", "fv_value_chg_gain")), wanyuan(get(c, "income", "total_profit")), 100)),
        Candidate("fairValueChgGain", "公允价值变动损益", "direct_exact", "income.fv_value_chg_gain", "yuan/10000", lambda c: wanyuan(get(c, "income", "fv_value_chg_gain")), "字段名修正候选"),
        Candidate("ocfToRevenue", "经营现金流营收比", "derived_formula", "cashflow.n_cashflow_act / income.revenue", "%", lambda c: safe_div(wanyuan(get(c, "cashflow", "n_cashflow_act")), wanyuan(get(c, "income", "revenue")), 100)),
        Candidate("creditImpairLoss", "信用减值损失", "proxy_candidate", "cashflow.credit_impa_loss", "yuan/10000", lambda c: wanyuan(get(c, "cashflow", "credit_impa_loss")), "现金流补充资料字段，不能直接替代利润表信用减值"),
        Candidate("assetImpairLoss", "资产减值损失", "direct_exact", "income.assets_impair_loss", "yuan/10000", lambda c: wanyuan(get(c, "income", "assets_impair_loss")), "覆盖率低，需作为可用则展示"),
        Candidate("tradAsset", "交易性金融资产", "direct_exact", "balancesheet.trad_asset", "yuan/10000", lambda c: wanyuan(get(c, "balancesheet", "trad_asset"))),
        Candidate("debtInvestment", "债权投资", "direct_exact", "balancesheet.debt_invest", "yuan/10000", lambda c: wanyuan(get(c, "balancesheet", "debt_invest"))),
        Candidate("otherDebtInvestment", "其他债权投资", "direct_exact", "balancesheet.oth_debt_invest", "yuan/10000", lambda c: wanyuan(get(c, "balancesheet", "oth_debt_invest"))),
        Candidate("investIncome", "投资收益", "direct_exact", "income.invest_income", "yuan/10000", lambda c: wanyuan(get(c, "income", "invest_income"))),
        Candidate("cashflowInvAct", "投资活动现金流净额", "direct_exact", "cashflow.n_cashflow_inv_act", "yuan/10000", lambda c: wanyuan(get(c, "cashflow", "n_cashflow_inv_act"))),
        Candidate("cashflowFncAct", "筹资活动现金流净额", "direct_exact", "cashflow.n_cash_flows_fnc_act", "yuan/10000", lambda c: wanyuan(get(c, "cashflow", "n_cash_flows_fnc_act"))),
        Candidate("depositGrowthCF", "存款增加现金流口径", "proxy_candidate", "cashflow.n_incr_dep_cbob or n_depos_incr_fi", "yuan/10000", lambda c: wanyuan(get(c, "cashflow", "n_incr_dep_cbob")) or wanyuan(get(c, "cashflow", "n_depos_incr_fi")), "候选字段口径不同，需人工二选一"),
        Candidate("loanIssuanceCF", "贷款投放现金流口径", "proxy_candidate", "cashflow.n_incr_clt_loan_adv", "yuan/10000", lambda c: wanyuan(get(c, "cashflow", "n_incr_clt_loan_adv")), "需确认是否为客户贷款及垫款增加"),
        Candidate("centralBankAdj", "存放央行变动", "derived_formula", "YoY balancesheet.cash_reser_cb", "yuan/10000 YoY", lambda c: None, "需跨期计算，见衍生字段表"),
    ]


BLOCKED_METRICS = [
    ("nim", "净息差", "blocked_missing", "Tushare 三表不直接披露披露口径 NIM"),
    ("earningAssetYield", "生息资产收益率", "blocked_missing", "缺平均生息资产口径"),
    ("interestLiabilityCost", "计息负债成本率", "blocked_missing", "缺平均计息负债口径"),
    ("npl", "不良率", "blocked_missing", "年报附注/监管口径"),
    ("provisionCoverage", "拨备覆盖率", "blocked_missing", "年报附注/监管口径"),
    ("overdueRatio", "逾期率", "blocked_missing", "年报附注"),
    ("specialMentionRatio", "关注率", "blocked_missing", "年报附注"),
    ("cet1", "核心一级资本充足率", "blocked_missing", "监管资本披露"),
    ("cet1Buffer", "核心一级资本余量", "blocked_missing", "监管资本披露"),
    ("carBuffer", "资本充足率余量", "blocked_missing", "监管资本披露"),
    ("rwaDensity", "RWA密度", "blocked_missing", "RWA监管口径"),
    ("liquidityCoverageRatio", "流动性覆盖率", "blocked_missing", "监管流动性指标"),
    ("liquidityRatio", "流动性比率", "blocked_missing", "监管流动性指标"),
]


def rel_diff(a, b):
    a = num(a)
    b = num(b)
    if a is None or b is None:
        return None
    denom = max(abs(a), 1e-9)
    return abs(a - b) / denom


def pct_fmt(v):
    if v is None or (isinstance(v, float) and math.isnan(v)):
        return ""
    return f"{v:.1%}"


def main():
    vqa = load_vqa_data()
    parquets = load_parquets()
    specs = candidate_specs()
    spec_by_metric = {s.metric: s for s in specs}
    records = vqa["records"]
    comparable = [r for r in records if r.get("bank") in BANK_NAME_TO_TS_CODE]

    rows = []
    candidate_values = {s.metric: [] for s in specs}
    bq_values = {s.metric: [] for s in specs}
    contexts = []

    for r in comparable:
        bank = r["bank"]
        year = int(r["year"])
        ts_code = BANK_NAME_TO_TS_CODE[bank]
        ctx = {
            "record": r,
            "bank": bank,
            "year": year,
            "ts_code": ts_code,
            "balancesheet": year_end_row(parquets.get("balancesheet"), ts_code, year),
            "income": year_end_row(parquets.get("income"), ts_code, year),
            "cashflow": year_end_row(parquets.get("cashflow"), ts_code, year),
            "fina_indicator": year_end_row(parquets.get("fina_indicator"), ts_code, year),
            "market_end": market_row(parquets.get("daily_basic"), ts_code, year, "end"),
            "market_mid": market_row(parquets.get("daily_basic"), ts_code, year, "mid"),
            "derived": {},
        }
        # First pass fills base fields so formula candidates can depend on them.
        for s in specs:
            if s.metric in ["coreRevenue", "nonInterestShare", "feeAssetRatio", "loanAssetRatio", "depositLiabilityRatio", "cashProfitRatio"]:
                continue
            val = s.fn(ctx)
            ctx["derived"][s.metric] = val
        for s in specs:
            if s.metric not in ctx["derived"]:
                ctx["derived"][s.metric] = s.fn(ctx)
            candidate_values[s.metric].append(ctx["derived"][s.metric])
            bq_values[s.metric].append(r.get(s.metric))
        contexts.append(ctx)

    context_index = {(c["bank"], c["year"]): c for c in contexts}
    for ctx in contexts:
        prev = context_index.get((ctx["bank"], ctx["year"] - 1))
        cur_cash_reserve = wanyuan(get(ctx, "balancesheet", "cash_reser_cb"))
        prev_cash_reserve = wanyuan(get(prev, "balancesheet", "cash_reser_cb")) if prev else None
        ctx["derived"]["centralBankAdj"] = (
            cur_cash_reserve - prev_cash_reserve
            if cur_cash_reserve is not None and prev_cash_reserve is not None
            else None
        )
    if "centralBankAdj" in candidate_values:
        candidate_values["centralBankAdj"] = [c["derived"].get("centralBankAdj") for c in contexts]

    for s in specs:
        cand = candidate_values[s.metric]
        bq = bq_values[s.metric]
        cand_non_null = sum(v is not None for v in cand)
        bq_non_null = sum(v is not None for v in bq)
        paired = [(a, b) for a, b in zip(bq, cand) if a is not None and b is not None]
        diffs = [rel_diff(a, b) for a, b in paired]
        diffs = [d for d in diffs if d is not None and math.isfinite(d)]
        median_diff = statistics.median(diffs) if diffs else None
        p90_diff = statistics.quantiles(diffs, n=10)[8] if len(diffs) >= 10 else (max(diffs) if diffs else None)
        within_1 = sum(d <= 0.01 for d in diffs) / len(diffs) if diffs else None
        within_5 = sum(d <= 0.05 for d in diffs) / len(diffs) if diffs else None
        if s.status == "blocked_missing":
            recommendation = "不接入"
        elif s.status == "validation_only":
            recommendation = "仅交叉验证"
        elif s.status == "proxy_candidate":
            recommendation = "复核后可作为代理或专题字段"
        elif cand_non_null == 0:
            recommendation = "暂不接入"
        elif paired and median_diff is not None and median_diff <= 0.05 and within_5 and within_5 >= 0.8:
            recommendation = "可推荐替换/补齐，待人工复核"
        elif bq_non_null == 0 and cand_non_null / max(len(cand), 1) >= 0.8:
            recommendation = "可作为新增字段，待人工复核"
        else:
            recommendation = "需口径复核"
        rows.append({
            "metric": s.metric,
            "name": s.name,
            "status": s.status,
            "source": s.source,
            "formula": s.formula,
            "bq_non_null": bq_non_null,
            "bq_coverage": bq_non_null / max(len(bq), 1),
            "tushare_non_null": cand_non_null,
            "tushare_coverage": cand_non_null / max(len(cand), 1),
            "paired_samples": len(paired),
            "median_abs_pct_diff": median_diff,
            "p90_abs_pct_diff": p90_diff,
            "within_1pct": within_1,
            "within_5pct": within_5,
            "recommendation": recommendation,
            "review_note": s.review_note,
        })

    blocked_rows = [{
        "metric": metric,
        "name": name,
        "status": status,
        "source": "",
        "formula": "",
        "bq_non_null": sum(r.get(metric) is not None for r in comparable),
        "bq_coverage": sum(r.get(metric) is not None for r in comparable) / max(len(comparable), 1),
        "tushare_non_null": 0,
        "tushare_coverage": 0,
        "paired_samples": 0,
        "median_abs_pct_diff": None,
        "p90_abs_pct_diff": None,
        "within_1pct": None,
        "within_5pct": None,
        "recommendation": "不接入，保留原 BQ/年报/监管口径",
        "review_note": reason,
    } for metric, name, status, reason in BLOCKED_METRICS]
    rows.extend(blocked_rows)

    out_csv = DOCS / "tushare-crosswalk-calibration.csv"
    with out_csv.open("w", newline="", encoding="utf-8") as f:
        writer = csv.DictWriter(f, fieldnames=list(rows[0].keys()))
        writer.writeheader()
        writer.writerows(rows)

    derived_rows = []
    for s in specs:
        if s.status not in ["derived_formula", "proxy_candidate"]:
            continue
        vals = candidate_values[s.metric]
        derived_rows.append({
            "metric": s.metric,
            "name": s.name,
            "status": s.status,
            "formula": s.formula,
            "source": s.source,
            "coverage": sum(v is not None for v in vals) / max(len(vals), 1),
            "non_null": sum(v is not None for v in vals),
            "base_population": len(vals),
            "review_note": s.review_note,
        })
    out_derived = DOCS / "tushare-derived-field-candidates.csv"
    with out_derived.open("w", newline="", encoding="utf-8") as f:
        writer = csv.DictWriter(f, fieldnames=list(derived_rows[0].keys()))
        writer.writeheader()
        writer.writerows(derived_rows)

    derived_value_fields = [r["metric"] for r in derived_rows if r["coverage"] > 0]
    derived_value_rows = []
    for ctx in contexts:
        row = {"bank": ctx["bank"], "year": ctx["year"], "ts_code": ctx["ts_code"]}
        for metric in derived_value_fields:
            row[metric] = ctx["derived"].get(metric)
        derived_value_rows.append(row)
    out_derived_values = DOCS / "tushare-derived-field-values.csv"
    with out_derived_values.open("w", newline="", encoding="utf-8") as f:
        writer = csv.DictWriter(f, fieldnames=["bank", "year", "ts_code"] + derived_value_fields)
        writer.writeheader()
        writer.writerows(derived_value_rows)

    coverage_rows = []
    for table, df in parquets.items():
        for col in df.columns:
            coverage_rows.append({
                "table": table,
                "field": col,
                "rows": len(df),
                "non_null": int(df[col].notna().sum()),
                "coverage": float(df[col].notna().sum() / max(len(df), 1)),
                "dtype": str(df[col].dtype),
            })
    out_coverage = DOCS / "tushare-field-coverage-current.csv"
    with out_coverage.open("w", newline="", encoding="utf-8") as f:
        writer = csv.DictWriter(f, fieldnames=list(coverage_rows[0].keys()))
        writer.writeheader()
        writer.writerows(coverage_rows)

    def md_table(items, fields):
        lines = ["|" + "|".join(fields) + "|", "|" + "|".join("---" for _ in fields) + "|"]
        for item in items:
            lines.append("|" + "|".join(str(item.get(f, "")) for f in fields) + "|")
        return "\n".join(lines)

    rec_replacements = [r for r in rows if r["recommendation"] == "可推荐替换/补齐，待人工复核"]
    rec_new = [r for r in rows if r["recommendation"] == "可作为新增字段，待人工复核"]
    needs_review = [r for r in rows if r["recommendation"] == "需口径复核"]
    blocked = [r for r in rows if r["status"] == "blocked_missing"]
    review_queue = rec_replacements + rec_new + [r for r in rows if r["recommendation"] == "复核后可作为代理或专题字段"]
    out_review_queue = DOCS / "tushare-replacement-review-queue.csv"
    with out_review_queue.open("w", newline="", encoding="utf-8") as f:
        writer = csv.DictWriter(f, fieldnames=list(rows[0].keys()))
        writer.writeheader()
        writer.writerows(review_queue)

    def compact(row):
        return {
            "metric": row["metric"],
            "status": row["status"],
            "source": row["source"],
            "BQ覆盖": pct_fmt(row["bq_coverage"]),
            "Tushare覆盖": pct_fmt(row["tushare_coverage"]),
            "样本": row["paired_samples"],
            "中位差异": pct_fmt(row["median_abs_pct_diff"]),
            "建议": row["recommendation"],
        }

    report = [
        "# BenchmarkIQ × Tushare 字段交叉映射校准报告",
        "",
        "生成日期：2026-06-03",
        "",
        "本报告只做交叉校准和候选推荐，不自动替换任何 BenchmarkIQ 主字段。字段状态遵循 `docs/tushare-field-governance-rules.md`。",
        "",
        "## 1. 样本范围",
        "",
        f"- BenchmarkIQ 主数据：{len(vqa['banks'])} 家银行，{len(records)} 条 bank-year 记录。",
        f"- 可与 A 股 Tushare ts_code 精确匹配：{len(set(r['bank'] for r in comparable))} 家银行，{len(comparable)} 条记录。",
        f"- Tushare 缓存表：{', '.join(f'{k}({len(v)}行)' for k, v in parquets.items())}。",
        "",
        "## 2. 可推荐替换/补齐字段（复核后执行）",
        "",
        md_table([compact(r) for r in rec_replacements], ["metric", "status", "source", "BQ覆盖", "Tushare覆盖", "样本", "中位差异", "建议"]) if rec_replacements else "暂无字段达到自动推荐门槛。",
        "",
        "## 3. 可作为新增字段的 Tushare 候选",
        "",
        md_table([compact(r) for r in rec_new], ["metric", "status", "source", "BQ覆盖", "Tushare覆盖", "样本", "中位差异", "建议"]) if rec_new else "暂无新增字段候选。",
        "",
        "## 4. 可计算衍生字段",
        "",
        md_table([{
            "metric": r["metric"],
            "status": r["status"],
            "formula": r["formula"],
            "coverage": pct_fmt(r["coverage"]),
            "review_note": r["review_note"],
        } for r in derived_rows], ["metric", "status", "formula", "coverage", "review_note"]),
        "",
        "## 5. 需口径复核字段",
        "",
        md_table([compact(r) for r in needs_review[:30]], ["metric", "status", "source", "BQ覆盖", "Tushare覆盖", "样本", "中位差异", "建议"]) if needs_review else "暂无。",
        "",
        "## 6. 明确不允许用 Tushare 自动替代的字段",
        "",
        md_table([{
            "metric": r["metric"],
            "BQ覆盖": pct_fmt(r["bq_coverage"]),
            "原因": r["review_note"],
        } for r in blocked], ["metric", "BQ覆盖", "原因"]),
        "",
        "## 7. 输出文件",
        "",
        f"- `{out_csv}`：逐字段交叉校准明细。",
        f"- `{out_derived}`：可计算衍生字段候选。",
        f"- `{out_derived_values}`：可计算衍生字段的 bank-year 数值。",
        f"- `{out_review_queue}`：复核后替换/补齐/新增候选清单。",
        f"- `{out_coverage}`：Tushare 当前缓存字段覆盖率。",
    ]
    out_report = DOCS / "tushare-crosswalk-calibration-report.md"
    out_report.write_text("\n".join(report) + "\n", encoding="utf-8")

    print(f"✓ wrote {out_report}")
    print(f"✓ wrote {out_csv}")
    print(f"✓ wrote {out_derived}")
    print(f"✓ wrote {out_derived_values}")
    print(f"✓ wrote {out_review_queue}")
    print(f"✓ wrote {out_coverage}")
    print(f"recommended replacements: {len(rec_replacements)}")
    print(f"new field candidates: {len(rec_new)}")
    print(f"needs review: {len(needs_review)}")


if __name__ == "__main__":
    main()
