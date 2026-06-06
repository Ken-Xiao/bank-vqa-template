"""
Tushare → BenchmarkIQ 数据桥接器（Phase 1：16 个 5/5 价值字段）

读：data_tushare_cache/*.parquet
出：data_tushare.js（sidecar JS，window.VQA_DATA_TUSHARE = {records: [...]}）

设计：
- 不动 data.js，新增 sidecar
- 运行时 bootstrap.js 按 (bank, year) join 两份数据
- 招行 600036.SH 招商 这种短名靠 BANK_NAME_TO_TS_CODE 映射桥接
- 缺数据的字段写 null，不抛异常
- 幂等：跑多次只会覆盖输出文件，不重复消耗 Tushare 积分

Phase 1 字段（16 个）：
  DuPont 全要素（5）        dupontNetMargin / dupontAssetTurn / dupontLeverage
                          + dupontROEFromTushare / dupontROAFromTushare（交叉验证）
  盈利质量（6）            assetImpairLoss / creditImpairLoss / ocfToRevenue
                          + extraItemAmount / fvChangeRatio / nonOpRatio
  估值扩展（5）            peTtm / divYield / divYieldTtm / totalMarketValue / turnoverRate

用法：
    python3 tushare_to_benchmarkiq.py            # 生成 data_tushare.js
    python3 tushare_to_benchmarkiq.py --verify   # 验证生成结果不报错
"""

from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path

try:
    import pandas as pd
except ImportError as e:
    print(f"缺少依赖: {e}", file=sys.stderr)
    sys.exit(1)


ROOT = Path(__file__).parent
CACHE = ROOT / "data_tushare_cache"
OUT = ROOT / "data_tushare.js"

# data.js 里的银行短名 → Tushare ts_code（42 家 A 股）
BANK_NAME_TO_TS_CODE = {
    # 国有大行
    "工商": "601398.SH", "工商银行": "601398.SH",
    "建设": "601939.SH", "建设银行": "601939.SH",
    "农业": "601288.SH", "农业银行": "601288.SH",
    "中国": "601988.SH", "中国银行": "601988.SH",
    "邮储": "601658.SH", "邮储银行": "601658.SH",
    "交通": "601328.SH", "交通银行": "601328.SH",
    # 股份制
    "招商": "600036.SH", "招商银行": "600036.SH",
    "兴业": "601166.SH", "兴业银行": "601166.SH",
    "浦发": "600000.SH", "浦发银行": "600000.SH",
    "民生": "600016.SH", "民生银行": "600016.SH",
    "中信": "601998.SH", "中信银行": "601998.SH",
    "华夏": "600015.SH", "华夏银行": "600015.SH",
    "光大": "601818.SH", "光大银行": "601818.SH",
    "平安": "000001.SZ", "平安银行": "000001.SZ",
    "浙商": "601916.SH", "浙商银行": "601916.SH",
    # 城商行
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
    # 农商行
    "常熟农商行": "601128.SH", "常熟": "601128.SH",
    "重庆农商行": "601077.SH", "渝农商": "601077.SH",
    "瑞丰农商行": "601528.SH", "瑞丰": "601528.SH",
    "青岛农商行": "002958.SZ", "青农商": "002958.SZ",
    "江阴农商行": "002807.SZ", "江阴": "002807.SZ",
    "苏州农商行": "603323.SH", "苏农": "603323.SH",
    "张家港农商行": "002839.SZ", "张家港": "002839.SZ",
    "紫金农商行": "601860.SH", "紫金": "601860.SH",
}


# Phase 3 新指标定义：4 组共 25 字段
# Group A：负债结构精细化（9）
PHASE3_GROUP_A_METRICS = [
    ("centralBankBorrow", "向央行借款", "balancesheet", "borrow_fr_cent_bank", "yuan_to_wanyuan"),
    ("interbankDeposit", "同业及金融机构存放", "balancesheet", "depos_oth_bfi", "yuan_to_wanyuan"),
    ("repoLiability", "卖出回购金融资产", "balancesheet", "fund_sale_fa", "yuan_to_wanyuan"),
    ("bondPayable", "应付债券", "balancesheet", "bond_payable", "yuan_to_wanyuan"),
    ("centralBankDeposit", "现金及存放央行", "balancesheet", "due_fr_central_bank", "yuan_to_wanyuan"),
    ("cashAndEquivalent", "货币资金", "balancesheet", "money_cap", "yuan_to_wanyuan"),
    ("generalRiskReserve", "一般风险准备", "balancesheet", "general_rese", "yuan_to_wanyuan"),
    ("capitalReserve", "资本公积", "balancesheet", "cap_rese", "yuan_to_wanyuan"),
    ("retainedEarnings", "未分配利润", "balancesheet", "undistr_porfit", "yuan_to_wanyuan"),
]

# Group B：NIM 真实归因（5）
PHASE3_GROUP_B_METRICS = [
    ("interestIncomeGross", "利息收入毛额", "income", "int_income", "yuan_to_wanyuan"),
    ("interestExpenseGross", "利息支出毛额", "income", "int_exp", "yuan_to_wanyuan"),
    ("commissionIncomeGross", "手续费收入毛额", "income", "commis_income", "yuan_to_wanyuan"),
    ("commissionExpenseGross", "手续费支出", "income", "commis_exp", "yuan_to_wanyuan"),
    ("forexGain", "汇兑损益", "income", "fx_gain", "yuan_to_wanyuan"),
]

# Group C：风险与稳健的隐藏点（6）
PHASE3_GROUP_C_METRICS = [
    ("derivativeAssets", "衍生金融资产", "balancesheet", "deri_assets", "yuan_to_wanyuan"),
    ("derivativeLiabilities", "衍生金融负债", "balancesheet", "deri_liab", "yuan_to_wanyuan"),
    ("goodwillAmount", "商誉", "balancesheet", "goodwill", "yuan_to_wanyuan"),
    ("deferredTaxAssets", "递延所得税资产", "balancesheet", "defer_tax_assets", "yuan_to_wanyuan"),
    ("minorityInterest", "少数股东权益", "balancesheet", "minority_int", "yuan_to_wanyuan"),
    ("minorityGain", "少数股东损益", "income", "minority_gain", "yuan_to_wanyuan"),
]

# Group D：财务比率补完（5）
PHASE3_GROUP_D_METRICS = [
    ("effectiveTaxRate", "实际税率", "fina_indicator", "tax_to_ebt", "as_pct"),
    ("cashflowToInterestDebt", "经营现金流/带息债务", "fina_indicator", "cf_to_li", "as_decimal"),
    ("salesCashToRevenue", "销售商品收现/营收", "fina_indicator", "salescash_to_or", "as_pct"),
    ("debtToAssets", "资产负债率", "fina_indicator", "debt_to_assets", "as_pct"),
    ("workingCapital", "营运资本", "fina_indicator", "working_capital", "yuan_to_wanyuan"),
]


# Phase 2 新指标定义：IFRS 9 金融资产分类（7）+ 现金流深度（5）
PHASE2_METRICS = [
    # === IFRS 9 金融资产分类（7）===
    ("tradAsset", "交易性金融资产FVTPL", "balancesheet", "trad_asset", "yuan_to_wanyuan"),
    ("fvociAssets", "FVOCI金融资产", "balancesheet", "fvoci_assets", "yuan_to_wanyuan"),
    ("acAssets", "摊余成本金融资产", "balancesheet", "ac_assets", "yuan_to_wanyuan"),
    ("htmInvest", "持有至到期投资", "balancesheet", "htm_invest", "yuan_to_wanyuan"),
    ("afaAssets", "可供出售金融资产", "balancesheet", "afa_assets", "yuan_to_wanyuan"),
    ("investIncome", "投资收益", "income", "invest_income", "yuan_to_wanyuan"),
    ("fairValueChgGain", "公允价值变动损益", "income", "fair_value_chg_gain", "yuan_to_wanyuan"),
    # === 现金流深度（5）===
    ("cashflowInvAct", "投资活动现金流净额", "cashflow", "n_cashflow_inv_act", "yuan_to_wanyuan"),
    ("cashflowFncAct", "筹资活动现金流净额", "cashflow", "n_cash_flows_fnc_act", "yuan_to_wanyuan"),
    ("depositGrowthCF", "存款增加(现金流口径)", "cashflow", "n_incr_dep_cob", "yuan_to_wanyuan"),
    ("loanIssuanceCF", "贷款投放(现金流口径)", "cashflow", "n_decr_loan_cb", "yuan_to_wanyuan"),
    ("centralBankAdj", "存放央行变动", "cashflow", "incr_money_oth_bank", "yuan_to_wanyuan"),
]


# Phase 1 新指标定义：(BQ 字段名, 中文名, Tushare 表, Tushare 字段, 转换)
PHASE1_METRICS = [
    # === DuPont 全要素（5）===
    ("dupontNetMargin", "DuPont 净利润率", "fina_indicator", "netprofit_margin", "as_pct"),
    ("dupontAssetTurn", "DuPont 总资产周转率", "fina_indicator", "assets_turn", "as_decimal"),
    ("dupontLeverage", "DuPont 权益乘数", "fina_indicator", "assets_to_eqt", "as_decimal"),
    ("dupontROEFromTushare", "Tushare ROE（验证）", "fina_indicator", "roe", "as_pct"),
    ("dupontROAFromTushare", "Tushare ROA（验证）", "fina_indicator", "roa", "as_pct"),
    # === 盈利质量（6）===
    ("assetImpairLoss", "资产减值损失", "income", "assets_impair_loss", "yuan_to_wanyuan"),
    ("creditImpairLoss", "信用减值损失(IFRS9)", "income", "prov_depr_assets", "yuan_to_wanyuan"),
    ("ocfToRevenue", "经营现金/营收", "fina_indicator", "ocf_to_revenue", "as_pct"),
    ("extraItemAmount", "非经常性损益", "fina_indicator", "extra_item", "yuan_to_wanyuan"),
    ("fvChangeRatio", "公允价值变动占利润比", "fina_indicator", "valuechange_to_ebt", "as_pct"),
    ("nonOpRatio", "营业外占比", "fina_indicator", "op_to_ebt", "as_pct"),
    # === 估值扩展（5）===
    ("peTtm", "PE TTM", "daily_basic", "pe_ttm", "as_decimal"),
    ("divYield", "股息率", "daily_basic", "dv_ratio", "as_pct"),
    ("divYieldTtm", "TTM股息率", "daily_basic", "dv_ttm", "as_pct"),
    ("totalMarketValue", "总市值(万元)", "daily_basic", "total_mv", "as_decimal"),  # Tushare 已是万元
    ("turnoverRate", "换手率", "daily_basic", "turnover_rate", "as_pct"),
]

APPROVED_REPLENISHMENT_METRICS = [
    {
        "code": "revenue",
        "name": "营业收入",
        "source_table": "income",
        "source_field": "revenue",
        "unit_transform": "yuan_to_wanyuan",
        "governance_status": "可优先复核通过",
        "replace_policy": "replenish_only",
    },
    {
        "code": "netProfit",
        "name": "净利润",
        "source_table": "income",
        "source_field": "n_income",
        "unit_transform": "yuan_to_wanyuan",
        "governance_status": "可优先复核通过",
        "replace_policy": "replenish_only",
    },
    {
        "code": "interestIncome",
        "name": "利息收入",
        "source_table": "income",
        "source_field": "int_income",
        "unit_transform": "yuan_to_wanyuan",
        "governance_status": "可优先复核通过",
        "replace_policy": "replenish_only",
    },
    {
        "code": "interestExpense",
        "name": "利息支出",
        "source_table": "income",
        "source_field": "int_exp",
        "unit_transform": "yuan_to_wanyuan",
        "governance_status": "可优先复核通过",
        "replace_policy": "replenish_only",
    },
    {
        "code": "feeIncome",
        "name": "手续费及佣金净收入",
        "source_table": "income",
        "source_field": "n_commis_income",
        "unit_transform": "yuan_to_wanyuan",
        "governance_status": "可优先复核通过",
        "replace_policy": "replenish_only",
    },
    {
        "code": "incomeTax",
        "name": "所得税费用",
        "source_table": "income",
        "source_field": "income_tax",
        "unit_transform": "yuan_to_wanyuan",
        "governance_status": "可优先复核通过",
        "replace_policy": "replenish_only",
    },
    {
        "code": "basicEps",
        "name": "基本每股收益",
        "source_table": "income",
        "source_field": "basic_eps",
        "unit_transform": "as_decimal",
        "governance_status": "可优先复核通过",
        "replace_policy": "replenish_only",
    },
    {
        "code": "assets",
        "name": "总资产",
        "source_table": "balancesheet",
        "source_field": "total_assets",
        "unit_transform": "yuan_to_wanyuan",
        "governance_status": "可优先复核通过",
        "replace_policy": "replenish_only",
    },
    {
        "code": "liabilities",
        "name": "总负债",
        "source_table": "balancesheet",
        "source_field": "total_liab",
        "unit_transform": "yuan_to_wanyuan",
        "governance_status": "可优先复核通过",
        "replace_policy": "replenish_only",
    },
    {
        "code": "equity",
        "name": "股东权益合计",
        "source_table": "balancesheet",
        "source_field": "total_hldr_eqy_inc_min_int",
        "unit_transform": "yuan_to_wanyuan",
        "governance_status": "可优先复核通过",
        "replace_policy": "replenish_only",
    },
    {
        "code": "operatingCashFlow",
        "name": "经营活动现金流净额",
        "source_table": "cashflow",
        "source_field": "n_cashflow_act",
        "unit_transform": "yuan_to_wanyuan",
        "governance_status": "可优先复核通过",
        "replace_policy": "replenish_only",
    },
    {
        "code": "netInterestIncome",
        "name": "净利息收入",
        "source_table": "income",
        "source_field": "int_income-int_exp",
        "unit_transform": "formula_yuan_to_wanyuan",
        "formula": "income.int_income - income.int_exp",
        "governance_status": "可优先复核通过",
        "replace_policy": "replenish_only",
    },
    {
        "code": "coreRevenue",
        "name": "核心收入",
        "source_table": "income",
        "source_field": "netInterestIncome+n_commis_income",
        "unit_transform": "formula_wanyuan",
        "formula": "netInterestIncome + feeIncome",
        "governance_status": "可优先复核通过",
        "replace_policy": "replenish_only",
    },
    {
        "code": "nonInterestShare",
        "name": "非息收入占比",
        "source_table": "income",
        "source_field": "revenue,int_income,int_exp",
        "unit_transform": "formula_pct",
        "formula": "(revenue - netInterestIncome) / revenue",
        "governance_status": "可优先复核通过",
        "replace_policy": "replenish_only",
    },
    {
        "code": "feeAssetRatio",
        "name": "手续费收入/总资产",
        "source_table": "income,balancesheet",
        "source_field": "n_commis_income,total_assets",
        "unit_transform": "formula_pct",
        "formula": "feeIncome / assets",
        "governance_status": "可优先复核通过",
        "replace_policy": "replenish_only",
    },
    {
        "code": "cashProfitRatio",
        "name": "经营现金流/净利润",
        "source_table": "cashflow,income",
        "source_field": "n_cashflow_act,n_income",
        "unit_transform": "formula_pct",
        "formula": "operatingCashFlow / netProfit",
        "governance_status": "可优先复核通过",
        "replace_policy": "replenish_only",
    },
]

BUSINESS_CONFIRMED_METRICS = [
    {
        "code": "adminExpense",
        "name": "管理费用",
        "source_table": "income",
        "source_field": "admin_exp",
        "unit_transform": "yuan_to_wanyuan",
        "governance_status": "需要业务确认后通过",
        "replace_policy": "replenish_only",
    },
    {
        "code": "costIncomeRatio",
        "name": "成本收入比",
        "source_table": "income",
        "source_field": "admin_exp,revenue",
        "unit_transform": "formula_pct",
        "formula": "adminExpense / revenue",
        "governance_status": "需要业务确认后通过",
        "replace_policy": "replenish_only",
    },
    {
        "code": "deposits",
        "name": "吸收存款",
        "source_table": "balancesheet",
        "source_field": "depos",
        "unit_transform": "yuan_to_wanyuan",
        "governance_status": "需要业务确认后通过",
        "replace_policy": "replenish_only",
    },
    {
        "code": "depositLiabilityRatio",
        "name": "存款/总负债",
        "source_table": "balancesheet",
        "source_field": "depos,total_liab",
        "unit_transform": "formula_pct",
        "formula": "deposits / liabilities",
        "governance_status": "需要业务确认后通过",
        "replace_policy": "replenish_only",
    },
]

MARKET_ADDITION_METRICS = [
    {
        "code": "peTtm",
        "name": "PE TTM",
        "source_table": "daily_basic",
        "source_field": "pe_ttm",
        "unit_transform": "as_decimal",
        "governance_status": "新增字段，不作为替换",
        "replace_policy": "addition_only",
    },
    {
        "code": "divYield",
        "name": "股息率",
        "source_table": "daily_basic",
        "source_field": "dv_ratio",
        "unit_transform": "as_pct",
        "governance_status": "新增字段，不作为替换",
        "replace_policy": "addition_only",
    },
    {
        "code": "divYieldTtm",
        "name": "TTM股息率",
        "source_table": "daily_basic",
        "source_field": "dv_ttm",
        "unit_transform": "as_pct",
        "governance_status": "新增字段，不作为替换",
        "replace_policy": "addition_only",
    },
    {
        "code": "totalMarketValue",
        "name": "总市值(万元)",
        "source_table": "daily_basic",
        "source_field": "total_mv",
        "unit_transform": "as_decimal",
        "governance_status": "新增字段，不作为替换",
        "replace_policy": "addition_only",
    },
    {
        "code": "turnoverRate",
        "name": "换手率",
        "source_table": "daily_basic",
        "source_field": "turnover_rate",
        "unit_transform": "as_pct",
        "governance_status": "新增字段，不作为替换",
        "replace_policy": "addition_only",
    },
]


def transform(value, kind: str):
    """字段值转换：BenchmarkIQ 统一用万元+百分比表示"""
    if pd.isna(value):
        return None
    try:
        v = float(value)
    except (ValueError, TypeError):
        return None
    if kind == "yuan_to_wanyuan":
        return round(v / 10000, 2)
    elif kind == "as_pct":
        # Tushare 多数百分比已经是 12.34 形式，不是 0.1234
        return round(v, 4)
    elif kind == "as_decimal":
        return round(v, 4)
    return v


def get_year_end_record(df: pd.DataFrame, ts_code: str, year: int, year_end_field: str = "end_date"):
    """取某家银行某年的年报（12-31 那条）"""
    rows = df[(df["ts_code"] == ts_code) & (df[year_end_field] == f"{year}1231")]
    return rows.iloc[0] if not rows.empty else None


def get_year_end_market(df: pd.DataFrame, ts_code: str, year: int):
    """估值表用 trade_date，取该年最后一个交易日"""
    rows = df[(df["ts_code"] == ts_code) & (df["trade_date"].str.startswith(str(year)))]
    if rows.empty:
        return None
    rows = rows.sort_values("trade_date", ascending=False)
    return rows.iloc[0]


def build_record(ts_code: str, year: int, parquets: dict) -> dict:
    """为某家银行某年构建一条 Phase 1+2 新指标记录"""
    record = {}
    # 按表分组取一次
    fina_row = get_year_end_record(parquets["fina_indicator"], ts_code, year)
    income_row = get_year_end_record(parquets["income"], ts_code, year)
    cashflow_row = get_year_end_record(parquets["cashflow"], ts_code, year) if "cashflow" in parquets else None
    bs_row = get_year_end_record(parquets["balancesheet"], ts_code, year) if "balancesheet" in parquets else None
    daily_row = get_year_end_market(parquets["daily_basic"], ts_code, year)

    rows_by_table = {
        "fina_indicator": fina_row,
        "income": income_row,
        "cashflow": cashflow_row,
        "balancesheet": bs_row,
        "daily_basic": daily_row,
    }

    def raw_value(table: str, field: str):
        src_row = rows_by_table.get(table)
        if src_row is None or field not in src_row.index:
            return None
        value = src_row[field]
        if pd.isna(value):
            return None
        try:
            return float(value)
        except (ValueError, TypeError):
            return None

    def safe_pct(numerator, denominator):
        if numerator is None or denominator in (None, 0):
            return None
        return round((numerator / denominator) * 100, 4)

    def fill(metrics):
        for bq_field, _, t_table, t_field, transform_kind in metrics:
            src_row = rows_by_table.get(t_table)
            if src_row is None or t_field not in src_row.index:
                record[bq_field] = None
            else:
                record[bq_field] = transform(src_row[t_field], transform_kind)

    def fill_governed(metrics):
        for metric in metrics:
            code = metric["code"]
            source_table = metric.get("source_table", "")
            source_field = metric.get("source_field", "")
            transform_kind = metric.get("unit_transform", "")
            if "formula" not in metric:
                record[code] = transform(raw_value(source_table, source_field), transform_kind)
                continue

            if code == "netInterestIncome":
                int_income = raw_value("income", "int_income")
                int_exp = raw_value("income", "int_exp")
                record[code] = transform(int_income - int_exp, "yuan_to_wanyuan") if int_income is not None and int_exp is not None else None
            elif code == "coreRevenue":
                net_interest_income = record.get("netInterestIncome")
                fee_income = record.get("feeIncome")
                record[code] = round(net_interest_income + fee_income, 2) if net_interest_income is not None and fee_income is not None else None
            elif code == "nonInterestShare":
                revenue = record.get("revenue")
                net_interest_income = record.get("netInterestIncome")
                record[code] = safe_pct(revenue - net_interest_income, revenue) if revenue is not None and net_interest_income is not None else None
            elif code == "feeAssetRatio":
                record[code] = safe_pct(record.get("feeIncome"), record.get("assets"))
            elif code == "cashProfitRatio":
                record[code] = safe_pct(record.get("operatingCashFlow"), record.get("netProfit"))
            elif code == "costIncomeRatio":
                record[code] = safe_pct(record.get("adminExpense"), record.get("revenue"))
            elif code == "depositLiabilityRatio":
                record[code] = safe_pct(record.get("deposits"), record.get("liabilities"))
            else:
                record[code] = None

    fill(PHASE1_METRICS)
    fill(PHASE2_METRICS)
    fill(PHASE3_GROUP_A_METRICS)
    fill(PHASE3_GROUP_B_METRICS)
    fill(PHASE3_GROUP_C_METRICS)
    fill(PHASE3_GROUP_D_METRICS)
    fill_governed(APPROVED_REPLENISHMENT_METRICS)
    fill_governed(BUSINESS_CONFIRMED_METRICS)
    fill_governed(MARKET_ADDITION_METRICS)
    return record


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--verify", action="store_true", help="只验证不写文件")
    args = parser.parse_args()

    # 读所有 parquet（Phase 1+2 需要的）
    needed = ["fina_indicator", "income", "daily_basic", "cashflow", "balancesheet"]
    parquets = {}
    for t in needed:
        p = CACHE / f"{t}.parquet"
        if not p.exists():
            print(f"ERROR: 缺 {p}，请先跑 tushare_pipeline.py", file=sys.stderr)
            sys.exit(1)
        parquets[t] = pd.read_parquet(p)
        print(f"  ✓ {t}: {len(parquets[t])} 行")

    # 生成记录
    print()
    records = []
    no_match_banks = set()
    match_count = 0
    for bank_short, ts_code in BANK_NAME_TO_TS_CODE.items():
        for year in range(2020, 2026):
            rec = build_record(ts_code, year, parquets)
            # 至少有一个非空才记
            if any(v is not None for v in rec.values()):
                rec["bank"] = bank_short
                rec["year"] = year
                rec["ts_code"] = ts_code
                records.append(rec)
                match_count += 1
            else:
                no_match_banks.add((bank_short, ts_code, year))

    print(f"✓ 生成 {len(records)} 条 Phase 1 记录")
    print(f"  覆盖 {len({r['bank'] for r in records})} 家银行 × {len({r['year'] for r in records})} 年")
    if no_match_banks:
        print(f"  ⚠ {len(no_match_banks)} 个 (bank, year) 完全无数据")

    # 按字段统计完整度
    print(f"\n  Phase 1 字段完整度：")
    for bq_field, cn, *_ in PHASE1_METRICS:
        non_null = sum(1 for r in records if r.get(bq_field) is not None)
        pct = non_null / max(len(records), 1) * 100
        print(f"    {bq_field:30s} {cn:25s} {non_null:>4d} / {len(records)}  ({pct:.0f}%)")
    print(f"\n  Phase 2 字段完整度：")
    for bq_field, cn, *_ in PHASE2_METRICS:
        non_null = sum(1 for r in records if r.get(bq_field) is not None)
        pct = non_null / max(len(records), 1) * 100
        print(f"    {bq_field:30s} {cn:25s} {non_null:>4d} / {len(records)}  ({pct:.0f}%)")
    print(f"\n  已确认字段完整度：")
    for metric in APPROVED_REPLENISHMENT_METRICS + BUSINESS_CONFIRMED_METRICS + MARKET_ADDITION_METRICS:
        non_null = sum(1 for r in records if r.get(metric["code"]) is not None)
        pct = non_null / max(len(records), 1) * 100
        print(f"    {metric['code']:30s} {metric['name']:25s} {non_null:>4d} / {len(records)}  ({pct:.0f}%)")

    if args.verify:
        print("\n[verify mode] 不写文件")
        return

    def governed_metric_payload(metric, approved_group):
        return {
            "code": metric["code"],
            "name": metric["name"],
            "tushare": f"{metric['source_table']}.{metric['source_field']}",
            "phase": "approved_governance",
            "source_table": metric["source_table"],
            "source_field": metric["source_field"],
            "unit_transform": metric["unit_transform"],
            "formula": metric.get("formula"),
            "governance_status": metric["governance_status"],
            "approved_group": approved_group,
            "replace_policy": metric["replace_policy"],
        }

    metric_payload = [
        {"code": m[0], "name": m[1], "tushare": f"{m[2]}.{m[3]}", "phase": "1"} for m in PHASE1_METRICS
    ] + [
        {"code": m[0], "name": m[1], "tushare": f"{m[2]}.{m[3]}", "phase": "2"} for m in PHASE2_METRICS
    ] + [
        governed_metric_payload(m, "approved_replenishment") for m in APPROVED_REPLENISHMENT_METRICS
    ] + [
        governed_metric_payload(m, "business_confirmed") for m in BUSINESS_CONFIRMED_METRICS
    ] + [
        governed_metric_payload(m, "market_addition") for m in MARKET_ADDITION_METRICS
    ]
    deduped_metrics = {}
    for metric in metric_payload:
        deduped_metrics[metric["code"]] = metric

    # 输出 sidecar JS
    out = {
        "source": "tushare_to_benchmarkiq.py",
        "version": "phase1plus2_v1",
        "governance_version": "phase1plus2_governed_v2",
        "phase": "phase1_16_phase2_12_governed_fields",
        "merge_policy": "replenish_only_no_override",
        "metrics": list(deduped_metrics.values()),
        "years": [2020, 2021, 2022, 2023, 2024, 2025],
        "records": records,
    }
    OUT.write_text(
        f"window.VQA_DATA_TUSHARE = {json.dumps(out, ensure_ascii=False, separators=(',', ':'))};",
        encoding="utf-8"
    )
    print(f"\n✓ 写出: {OUT}（{OUT.stat().st_size / 1024:.1f} KB）")
    print(f"  下一步：在 index.html 加 <script src='data_tushare.js'></script>")
    print(f"  再下一步：bootstrap 时 merge VQA_DATA.records × VQA_DATA_TUSHARE.records by (bank, year)")


if __name__ == "__main__":
    main()
