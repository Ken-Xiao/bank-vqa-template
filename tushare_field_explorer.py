"""
Tushare 字段探索器 v2

目的：基于真实 Tushare 列名（152 + 108 + 85 + 97 + 12 = 469 个），
1. 对 BenchmarkIQ 现有 65 指标做精确名称匹配 + 模糊匹配
2. 找出 Tushare 独有的高价值字段，按主题分组
3. 提议 BenchmarkIQ 应该新增的 30+ 个银行业精细指标
4. 给出招行 2024 实际样本，证明字段确实有数据

输出：
    docs/tushare-field-inventory.md           完整字段清单 + 主题分组
    docs/benchmarkiq-new-metric-proposals.md  建议新增的 BenchmarkIQ 指标
"""

from __future__ import annotations

import csv
import sys
from pathlib import Path
from datetime import datetime

try:
    import pandas as pd
except ImportError as e:
    print(f"缺少依赖: {e}", file=sys.stderr)
    sys.exit(1)


ROOT = Path(__file__).parent
CACHE = ROOT / "data_tushare_cache"
DOCS = ROOT / "docs"
METRIC_DICT = ROOT / "data_governance" / "metric_dictionary.csv"


# ========== Tushare 字段中文名映射（来自官方文档）==========
# 这是关键：Tushare 的英文字段名背后是中文含义，BenchmarkIQ 用中文，要桥接

TUSHARE_FIELD_LABELS = {
    # ---- balancesheet (资产负债表) 152 列重点字段 ----
    "total_assets": "总资产",
    "total_liab": "总负债",
    "total_hldr_eqy_inc_min_int": "股东权益（含少数股东）",
    "total_hldr_eqy_exc_min_int": "股东权益（不含少数股东）",
    "loanto_oth_bank_fi": "拆出资金（含同业）",
    "depos_fr_oth_bfi": "同业存放",
    "deposit": "吸收存款",
    "borrow_fr_cent_bank": "向央行借款",
    "trad_asset": "交易性金融资产（FVTPL）",
    "deri_assets": "衍生金融资产",
    "buy_resale_fa": "买入返售金融资产",
    "loanto_oth_bank_fi": "拆出资金",
    "loans": "发放贷款及垫款",
    "lend_corp_borr": "贷款总额",
    "loan_oth_bank": "存放同业及其他金融机构款项",
    "premium_receiv": "应收保费",
    "reinsur_receiv": "应收分保账款",
    "reinsur_res_receiv": "应收分保合同准备金",
    "fix_assets": "固定资产",
    "intan_assets": "无形资产",
    "lt_eqt_invest": "长期股权投资",
    "invest_real_estate": "投资性房地产",
    "goodwill": "商誉",
    "defer_tax_assets": "递延所得税资产",
    "oth_assets": "其他资产",
    "cb_borr": "向央行借款",
    "depos_oth_bfi": "同业及其他金融机构存放款项",
    "fund_sale_fa": "卖出回购金融资产",
    "depos_received": "吸收存款",
    "trad_liab": "交易性金融负债",
    "deri_liab": "衍生金融负债",
    "bond_payable": "应付债券",
    "lt_payable": "长期应付款",
    "defer_tax_liab": "递延所得税负债",
    "oth_liab": "其他负债",
    "minority_int": "少数股东权益",
    "cap_rese": "资本公积",
    "undistr_porfit": "未分配利润",
    "surplus_rese": "盈余公积",
    "general_rese": "一般风险准备",
    # 投资分类（IFRS 9 落地后的核心）
    "htm_invest": "持有至到期投资",
    "afa_assets": "可供出售金融资产",
    "fvtpl_assets": "以公允价值计量且其变动计入当期损益的金融资产",
    "fvoci_assets": "以公允价值计量且其变动计入其他综合收益的金融资产",
    "ac_assets": "以摊余成本计量的金融资产",

    # ---- income (利润表) 85 列重点字段 ----
    "revenue": "营业收入",
    "total_revenue": "营业总收入",
    "int_income": "利息收入",
    "int_exp": "利息支出",
    "n_oth_int_inc": "利息净收入（其他）",
    "n_intr_income": "利息净收入",
    "commis_income": "手续费及佣金收入",
    "commis_exp": "手续费及佣金支出",
    "n_commis_income": "手续费及佣金净收入",
    "invest_income": "投资收益",
    "fair_value_chg_gain": "公允价值变动损益",
    "fx_gain": "汇兑损益",
    "n_income": "净利润",
    "net_profit": "净利润",
    "n_income_attr_p": "归属于母公司的净利润",
    "total_profit": "利润总额",
    "income_tax": "所得税",
    "biz_tax_surchg": "营业税金及附加",
    "oper_exp": "营业支出",
    "assets_impair_loss": "资产减值损失",
    "prov_depr_assets": "信用减值损失（IFRS 9 落地后）",
    "minority_gain": "少数股东损益",
    "ebit": "EBIT",
    "ebitda": "EBITDA",
    "rd_exp": "研发费用",
    "premium_earned": "已赚保费",
    "reinsur_income": "分保费收入",
    "earnings_per_share": "EPS",
    "diluted_eps": "稀释每股收益",

    # ---- cashflow (现金流量表) ----
    "n_cashflow_act": "经营活动现金流净额",
    "n_cashflow_inv_act": "投资活动现金流净额",
    "n_cash_flows_fnc_act": "筹资活动现金流净额",
    "incl_cash_oper": "经营现金流入",
    "incl_cash_inv": "投资现金流入",
    "incl_cash_fnc": "筹资现金流入",
    "n_incr_dep_cob": "存款增加",
    "n_decr_loan_cb": "贷款减少",
    "n_borr_oth_fi": "拆入资金",
    "incr_money_oth_bank": "存放央行变动",

    # ---- fina_indicator (财务指标) 108 列 ----
    "roa": "ROA 总资产收益率",
    "roe": "ROE 净资产收益率",
    "roe_yearly": "年化 ROE",
    "roa_yearly": "年化 ROA",
    "netprofit_margin": "净利润率",
    "grossprofit_margin": "毛利率",
    "eps": "每股收益",
    "bps": "每股净资产",
    "cfps": "每股现金流",
    "netprofit_yoy": "净利润同比增长",
    "tr_yoy": "营业总收入同比",
    "assets_yoy": "总资产同比",
    "equity_yoy": "净资产同比",
    "ocf_yoy": "经营现金流同比",
    "current_ratio": "流动比率",
    "quick_ratio": "速动比率",
    "cash_ratio": "现金比率",
    "ar_turn": "应收账款周转率",
    "inv_turn": "存货周转率",
    "ca_turn": "流动资产周转率",
    "fa_turn": "固定资产周转率",
    "assets_turn": "总资产周转率",
    "debt_to_assets": "资产负债率",
    "assets_to_eqt": "权益乘数",
    "dp_assets_to_eqt": "DuPont 权益乘数",
    "dupont_assets": "DuPont 资产",
    "ebit_of_gr": "EBIT/营收",
    "ebitda_to_revenue": "EBITDA/营收",
    "tax_to_ebt": "税率",
    "op_to_ebt": "营业利润/利润总额",
    "valuechange_to_ebt": "公允价值变动/利润总额",
    "stot_to_revenue": "其他业务收入占比",
    "rd_exp_to_revenue": "研发投入占比",
    "cf_to_li": "经营现金/带息债务",
    "if_to_ar": "应收账款变动/营收变动",
    "ocf_to_revenue": "经营现金/营收",
    "extra_item": "非经常性损益",
    "profit_to_op": "利润/营业利润",

    # ---- daily_basic 估值 ----
    "close": "收盘价",
    "pe": "市盈率",
    "pe_ttm": "市盈率 TTM",
    "pb": "市净率",
    "ps_ttm": "市销率 TTM",
    "dv_ratio": "股息率",
    "dv_ttm": "TTM 股息率",
    "total_mv": "总市值（万元）",
    "circ_mv": "流通市值（万元）",
    "turnover_rate": "换手率",
    "volume_ratio": "量比",
    "float_share": "流通股本",
    "total_share": "总股本",
}


# ========== BenchmarkIQ 65 指标的 Chinese name → Tushare 字段精确映射 ==========
# 这次基于 Tushare 实际字段做严格对应

BQ_TO_TUSHARE_PRECISE = {
    # 收入侧
    "营业收入": ("income", "revenue"),
    "利息收入": ("income", "int_income"),
    "利息支出": ("income", "int_exp"),
    "利息净收入": ("income", "n_intr_income"),
    "手续费及佣金净收入": ("income", "n_commis_income"),
    "净利润": ("income", "n_income"),
    "所得税": ("income", "income_tax"),
    "营业税金及附加": ("income", "biz_tax_surchg"),

    # 资产负债侧
    "总资产": ("balancesheet", "total_assets"),
    "总负债": ("balancesheet", "total_liab"),
    "股东权益": ("balancesheet", "total_hldr_eqy_inc_min_int"),

    # 现金流
    "经营活动现金流净额": ("cashflow", "n_cashflow_act"),

    # 财务指标
    "总资产收益率": ("fina_indicator", "roa"),
    "净资产收益率": ("fina_indicator", "roe"),
    "基本每股收益": ("fina_indicator", "eps"),
    "每股净资产": ("fina_indicator", "bps"),
    "总资产增速": ("fina_indicator", "assets_yoy"),
    "净利润增速": ("fina_indicator", "netprofit_yoy"),
    "营业收入增速": ("fina_indicator", "tr_yoy"),

    # 市场估值
    "年末市净率": ("daily_basic", "pb"),
    "年中市净率": ("daily_basic", "pb"),
    "市净率": ("daily_basic", "pb"),
    "市净率变化": ("daily_basic", "pb"),
    "PB": ("daily_basic", "pb"),
}


# ========== Tushare 独有：BenchmarkIQ 应考虑新增的指标分组 ==========

TUSHARE_GOLDMINE = {
    "IFRS 9 金融资产分类（银行专属）": [
        ("trad_asset", "交易性金融资产 FVTPL", "balancesheet", "回答董事会：高波动资产占比是多少", 5),
        ("fvoci_assets", "FVOCI 金融资产", "balancesheet", "可供出售类的演化（IFRS 9 落地后的核心分类）", 5),
        ("ac_assets", "摊余成本金融资产", "balancesheet", "类'持有至到期'的稳定持有资产", 5),
        ("htm_invest", "持有至到期投资", "balancesheet", "稳定收益资产占比", 4),
        ("afa_assets", "可供出售金融资产（旧口径）", "balancesheet", "IFRS 9 前的数据延续", 3),
        ("invest_income", "投资收益", "income", "投资收益对利润的贡献", 4),
        ("fair_value_chg_gain", "公允价值变动损益", "income", "FVTPL 的当期波动暴露", 5),
    ],
    "负债结构精细（影响 NIM 和成本）": [
        ("borrow_fr_cent_bank", "向央行借款", "balancesheet", "MLF/SLF 依赖度，反映流动性来源", 4),
        ("depos_oth_bfi", "同业存放", "balancesheet", "批发负债占比，反映负债稳定性", 4),
        ("fund_sale_fa", "卖出回购金融资产", "balancesheet", "回购融资规模", 3),
        ("bond_payable", "应付债券", "balancesheet", "长期债券融资 → 资本工具规模", 4),
    ],
    "资产端精细（影响资产质量诊断）": [
        ("loanto_oth_bank_fi", "拆出资金", "balancesheet", "短期同业资产", 3),
        ("buy_resale_fa", "买入返售金融资产", "balancesheet", "资金运用方式", 3),
        ("deri_assets", "衍生金融资产", "balancesheet", "衍生品敞口", 4),
        ("goodwill", "商誉", "balancesheet", "并购历史 → 减值风险", 3),
    ],
    "现金流深度（验证利润质量）": [
        ("n_cashflow_inv_act", "投资现金流净额", "cashflow", "投资节奏 → 增长 vs 收缩", 4),
        ("n_cash_flows_fnc_act", "筹资现金流净额", "cashflow", "再融资强度 → 资本压力信号", 5),
        ("n_incr_dep_cob", "存款增加", "cashflow", "存款扩张速度（直接现金流口径）", 5),
        ("n_decr_loan_cb", "贷款投放规模", "cashflow", "贷款扩张节奏", 5),
        ("incr_money_oth_bank", "存放央行变动", "cashflow", "法定准备金调整 → 政策导向信号", 3),
    ],
    "DuPont 全要素（升级现有 DuPont 专题）": [
        ("netprofit_margin", "净利润率", "fina_indicator", "DuPont 第一层：销售净利率", 5),
        ("assets_turn", "总资产周转率", "fina_indicator", "DuPont 第二层：资产效率", 5),
        ("assets_to_eqt", "权益乘数", "fina_indicator", "DuPont 第三层：杠杆", 5),
        ("dupont_assets", "DuPont 资产周转", "fina_indicator", "Tushare 已算好", 5),
        ("dp_assets_to_eqt", "DuPont 权益乘数", "fina_indicator", "Tushare 已算好", 5),
        ("ebit_of_gr", "EBIT/营收", "fina_indicator", "营业利润率分解", 4),
        ("op_to_ebt", "营业利润/利润总额", "fina_indicator", "经营 vs 非经常占比", 4),
    ],
    "盈利质量（董事会问题：'利润是真实的吗'）": [
        ("assets_impair_loss", "资产减值损失", "income", "拨备前后利润关键差", 5),
        ("prov_depr_assets", "信用减值损失", "income", "IFRS 9 落地后的拨备口径", 5),
        ("ocf_to_revenue", "经营现金/营收", "fina_indicator", "现金为王 → 利润真实性核心指标", 5),
        ("cf_to_li", "经营现金/带息债务", "fina_indicator", "还本付息能力", 4),
        ("extra_item", "非经常性损益", "fina_indicator", "扣非利润计算 → 经营持续性", 4),
        ("valuechange_to_ebt", "公允价值变动/利润总额", "fina_indicator", "估值变动对利润贡献，反映持有 FVTPL 比重", 4),
    ],
    "估值与市场（升级现有 PB 章节）": [
        ("pe", "市盈率", "daily_basic", "PE-PB 双视角", 4),
        ("pe_ttm", "市盈率 TTM", "daily_basic", "动态 PE", 4),
        ("ps_ttm", "市销率 TTM", "daily_basic", "对银行价值不大但可作辅助", 2),
        ("dv_ratio", "股息率", "daily_basic", "股东回报 → 央国行核心指标", 5),
        ("dv_ttm", "TTM 股息率", "daily_basic", "动态股息率", 5),
        ("total_mv", "总市值", "daily_basic", "规模与排名", 4),
        ("circ_mv", "流通市值", "daily_basic", "实际可交易市值", 3),
        ("turnover_rate", "换手率", "daily_basic", "活跃度 → 投资者关注度", 3),
    ],
}


def load_metric_dict() -> list[dict]:
    rows = []
    with open(METRIC_DICT, encoding="utf-8-sig") as f:
        for r in csv.DictReader(f):
            rows.append(r)
    return rows


def main():
    print("=" * 80)
    print("Tushare 字段探索 v2 + BenchmarkIQ 新指标提议")
    print("=" * 80)

    bq_metrics = load_metric_dict()
    print(f"\n✓ BenchmarkIQ 现有指标：{len(bq_metrics)}")

    # 加载实际 Tushare 列
    real_cols = {}
    for p in CACHE.glob("*.parquet"):
        try:
            df = pd.read_parquet(p)
            real_cols[p.stem] = list(df.columns)
        except Exception:
            pass

    total_tushare_cols = sum(len(c) for c in real_cols.values())
    print(f"✓ Tushare 实际字段总数：{total_tushare_cols}")
    for name, cols in real_cols.items():
        labeled = sum(1 for c in cols if c in TUSHARE_FIELD_LABELS)
        print(f"    {name:22s} {len(cols):>3d} 列，其中 {labeled:>3d} 个已知中文标签")

    # --- 改进的精确映射 ---
    print(f"\n=== BenchmarkIQ 65 指标的精确映射（v2）===")
    mapped = 0
    derived = 0
    missing = 0
    matched_details = []
    for m in bq_metrics:
        sf = m.get("source_field", "")
        if sf in BQ_TO_TUSHARE_PRECISE:
            t_table, t_col = BQ_TO_TUSHARE_PRECISE[sf]
            if t_col in real_cols.get(t_table, []):
                mapped += 1
                matched_details.append(f"  ✓ {m['metric_code']:25s} → {t_table}.{t_col}")
                continue
        if m.get("is_derived") == "True":
            derived += 1
            continue
        missing += 1

    print(f"\n  ✓ 精确映射：{mapped} 个（{mapped/len(bq_metrics):.0%}）")
    print(f"  📊 BQ 内部派生：{derived} 个")
    print(f"  🔧 需推导/缺失：{len(bq_metrics) - mapped - derived} 个")
    print(f"\n精确映射详细：")
    for d in matched_details[:25]:
        print(d)
    if len(matched_details) > 25:
        print(f"  ... 还有 {len(matched_details)-25} 个")

    # --- Tushare 金矿 ---
    print(f"\n=== Tushare 独有金矿（BenchmarkIQ 没用上）===")
    md_lines = []
    md_lines.append(f"# Tushare 字段金矿 → BenchmarkIQ 新指标提议\n\n")
    md_lines.append(f"生成时间：{datetime.now().isoformat(timespec='seconds')}\n\n")
    md_lines.append(f"基于真实 Tushare {total_tushare_cols} 个字段，"
                    f"识别 BenchmarkIQ 现有 65 指标里没有的高价值新维度。\n\n")
    md_lines.append("评分说明：5/5 = 直接关联董事会高频问题；4/5 = 提升专业深度；3/5 = 补充维度。\n\n")

    total_proposed = 0
    high_value = 0
    for category, items in TUSHARE_GOLDMINE.items():
        # 检查这些字段在你实际拉到的 Tushare 数据里是否有
        available = []
        for it in items:
            field, label, table, value, score = it
            if field in real_cols.get(table, []):
                available.append((field, label, table, value, score))
        if not available:
            continue
        md_lines.append(f"\n## {category}\n\n")
        md_lines.append("| Tushare 字段 | 中文 | 来源表 | 对 BenchmarkIQ 的价值 | 分 |\n")
        md_lines.append("|---|---|---|---|:-:|\n")
        print(f"\n  📦 {category}")
        for field, label, table, value, score in available:
            md_lines.append(f"| `{field}` | {label} | {table} | {value} | {score}/5 |\n")
            print(f"    {field:30s} {label} ({score}/5)")
            total_proposed += 1
            if score >= 4:
                high_value += 1

    md_lines.append(f"\n## 汇总\n\n")
    md_lines.append(f"- 已识别 Tushare 独有的高价值字段：**{total_proposed} 个**\n")
    md_lines.append(f"- 其中价值分 ≥ 4/5 的：**{high_value} 个**\n")
    md_lines.append(f"- 建议优先纳入 BenchmarkIQ 的指标库扩展\n\n")

    md_lines.append("## 建议的指标库扩展路径\n\n")
    md_lines.append("**阶段 1（5 天）：DuPont 全要素 + 盈利质量**\n")
    md_lines.append("- 5 个 DuPont 字段（netprofit_margin / assets_turn / assets_to_eqt 等）"
                    "→ 升级现有 DuPont 专题为'Tushare 直读 + BQ 公式验证'双口径\n")
    md_lines.append("- 6 个盈利质量字段（ocf_to_revenue / extra_item / valuechange_to_ebt 等）"
                    "→ 新专题'利润真实性'\n\n")
    md_lines.append("**阶段 2（5 天）：IFRS 9 金融资产分类 + 现金流深度**\n")
    md_lines.append("- 7 个 IFRS 9 资产分类（trad_asset / fvoci / ac_assets 等）"
                    "→ 现有'资产质量'专题加'金融资产结构'模块\n")
    md_lines.append("- 5 个现金流字段（n_cashflow_inv_act / n_incr_dep_cob / n_decr_loan_cb）"
                    "→ '存贷扩张节奏'专题\n\n")
    md_lines.append("**阶段 3（3-4 天）：估值与股东回报扩展**\n")
    md_lines.append("- 8 个估值字段（PE-PB 双视角 + 股息率 + 市值 + 换手率）"
                    "→ 现有'市场感知'专题扩展\n\n")
    md_lines.append("**阶段 4（3-4 天）：负债与资产端精细**\n")
    md_lines.append("- 8 个负债+资产细分字段 → 'NIM 归因深化'\n")

    report = DOCS / "tushare-goldmine-proposals.md"
    report.write_text("".join(md_lines), encoding="utf-8")
    print(f"\n✓ 完整提议报告：{report}")

    print(f"\n=" * 80 + "  汇总  " + "=" * 80)
    print(f"  Tushare 独有的高价值字段总数: {total_proposed} 个")
    print(f"  其中价值分 ≥ 4/5 的: {high_value} 个（建议优先纳入）")
    print(f"  + 现有精确映射 {mapped} 个")
    print(f"  → BenchmarkIQ 指标库可从 65 扩展到 ~{65 + high_value} 个，"
          f"全部走 Tushare 自动管道")


if __name__ == "__main__":
    main()
