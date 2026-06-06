"""
BenchmarkIQ 数据完整度审计 + Tushare 字段对标

同时回答两个问题：
A. 现有 93+ 个指标中，哪些在 342 条记录里大量缺失？
B. Tushare 469 个字段里，哪些有价值但还没纳入 BenchmarkIQ？

输出：
    docs/data-coverage-audit.md      完整审计报告
    控制台                            Top 缺失 + Top 未纳入

用法：
    python3 tushare_coverage_audit.py
"""

from __future__ import annotations

import csv
import json
import re
import sys
from collections import defaultdict
from datetime import datetime
from pathlib import Path

try:
    import pandas as pd
except ImportError as e:
    print(f"缺少依赖: {e}", file=sys.stderr)
    sys.exit(1)


ROOT = Path(__file__).parent
CACHE = ROOT / "data_tushare_cache"
DOCS = ROOT / "docs"
DOCS.mkdir(parents=True, exist_ok=True)


# ============== 1. 读取所有数据源 ==============

def load_vqa_data():
    """读 data.js → VQA_DATA records"""
    content = (ROOT / "data.js").read_text(encoding="utf-8")
    m = re.match(r"window\.VQA_DATA\s*=\s*(\{.*\});?", content, re.DOTALL)
    if not m:
        raise RuntimeError("无法解析 data.js")
    return json.loads(m.group(1))


def load_tushare_sidecar():
    """读 data_tushare.js → VQA_DATA_TUSHARE records"""
    p = ROOT / "data_tushare.js"
    if not p.exists():
        return None
    content = p.read_text(encoding="utf-8")
    m = re.match(r"window\.VQA_DATA_TUSHARE\s*=\s*(\{.*\});?", content, re.DOTALL)
    if not m:
        return None
    return json.loads(m.group(1))


def load_metric_dict():
    rows = []
    with open(ROOT / "data_governance" / "metric_dictionary.csv", encoding="utf-8-sig") as f:
        for r in csv.DictReader(f):
            rows.append(r)
    return rows


def load_tushare_columns():
    cols = {}
    for p in CACHE.glob("*.parquet"):
        try:
            df = pd.read_parquet(p)
            cols[p.stem] = list(df.columns)
        except Exception:
            cols[p.stem] = []
    return cols


# Tushare 字段中文标签（与 tushare_field_explorer.py 同源，精简版）
TUSHARE_LABELS = {
    # balancesheet
    "total_assets": "总资产", "total_liab": "总负债",
    "total_hldr_eqy_inc_min_int": "股东权益(含少数)", "total_hldr_eqy_exc_min_int": "股东权益(不含少数)",
    "loanto_oth_bank_fi": "拆出资金", "depos_fr_oth_bfi": "同业存放",
    "deposit": "吸收存款", "borrow_fr_cent_bank": "向央行借款",
    "trad_asset": "交易性金融资产 FVTPL", "deri_assets": "衍生金融资产",
    "buy_resale_fa": "买入返售金融资产", "fix_assets": "固定资产",
    "intan_assets": "无形资产", "lt_eqt_invest": "长期股权投资",
    "invest_real_estate": "投资性房地产", "goodwill": "商誉",
    "defer_tax_assets": "递延所得税资产", "oth_assets": "其他资产",
    "cb_borr": "向央行借款", "depos_oth_bfi": "同业及金融机构存放",
    "fund_sale_fa": "卖出回购金融资产", "trad_liab": "交易性金融负债",
    "deri_liab": "衍生金融负债", "bond_payable": "应付债券",
    "lt_payable": "长期应付款", "defer_tax_liab": "递延所得税负债",
    "minority_int": "少数股东权益", "cap_rese": "资本公积",
    "undistr_porfit": "未分配利润", "surplus_rese": "盈余公积",
    "general_rese": "一般风险准备", "htm_invest": "持有至到期投资",
    "afa_assets": "可供出售金融资产", "fvoci_assets": "FVOCI 金融资产",
    "ac_assets": "摊余成本金融资产", "lend_corp_borr": "贷款总额",
    "loan_oth_bank": "存放同业", "money_cap": "货币资金",
    "due_fr_central_bank": "现金及存放央行", "depos_in_oth_bfi": "存放同业及金融机构",
    "decr_in_disbur": "存放同业",
    # income
    "revenue": "营业收入", "total_revenue": "营业总收入",
    "int_income": "利息收入", "int_exp": "利息支出",
    "n_oth_int_inc": "利息净收入(其他)", "n_intr_income": "利息净收入",
    "commis_income": "手续费收入", "commis_exp": "手续费支出",
    "n_commis_income": "手续费净收入", "invest_income": "投资收益",
    "fair_value_chg_gain": "公允价值变动损益", "fx_gain": "汇兑损益",
    "n_income": "净利润", "n_income_attr_p": "归母净利润",
    "total_profit": "利润总额", "income_tax": "所得税",
    "biz_tax_surchg": "营业税金及附加", "oper_exp": "营业支出",
    "assets_impair_loss": "资产减值损失", "prov_depr_assets": "信用减值损失(IFRS9)",
    "minority_gain": "少数股东损益", "ebit": "EBIT", "ebitda": "EBITDA",
    "rd_exp": "研发费用",
    # cashflow
    "n_cashflow_act": "经营现金流", "n_cashflow_inv_act": "投资现金流",
    "n_cash_flows_fnc_act": "筹资现金流", "incl_cash_oper": "经营现金流入",
    "incl_cash_inv": "投资现金流入", "incl_cash_fnc": "筹资现金流入",
    "n_incr_dep_cob": "存款增加", "n_decr_loan_cb": "贷款减少",
    "n_borr_oth_fi": "拆入资金", "incr_money_oth_bank": "存放央行变动",
    "free_cashflow": "自由现金流",
    # fina_indicator
    "roa": "ROA", "roe": "ROE", "roe_yearly": "年化 ROE", "roa_yearly": "年化 ROA",
    "netprofit_margin": "净利润率", "grossprofit_margin": "毛利率",
    "eps": "EPS", "bps": "BPS", "cfps": "CFPS",
    "netprofit_yoy": "净利润同比", "tr_yoy": "营收同比",
    "assets_yoy": "资产同比", "equity_yoy": "净资产同比",
    "ocf_yoy": "经营现金流同比", "current_ratio": "流动比率",
    "quick_ratio": "速动比率", "cash_ratio": "现金比率",
    "ar_turn": "应收账款周转率", "inv_turn": "存货周转率",
    "ca_turn": "流动资产周转率", "fa_turn": "固定资产周转率",
    "assets_turn": "总资产周转率", "debt_to_assets": "资产负债率",
    "assets_to_eqt": "权益乘数", "dp_assets_to_eqt": "DuPont 权益乘数",
    "dupont_assets": "DuPont 资产", "ebit_of_gr": "EBIT/营收",
    "ebitda_to_revenue": "EBITDA/营收", "tax_to_ebt": "税率",
    "op_to_ebt": "营业利润/利润总额", "valuechange_to_ebt": "公允价值变动/利润总额",
    "stot_to_revenue": "其他业务收入占比", "rd_exp_to_revenue": "研发投入占比",
    "cf_to_li": "经营现金/带息债务", "ocf_to_revenue": "经营现金/营收",
    "extra_item": "非经常性损益", "profit_to_op": "利润/营业利润",
    "salescash_to_or": "销售商品收现/营收", "ocf_to_profit": "经营现金/利润",
    "fcff": "FCFF", "fcfe": "FCFE", "z_score": "Z 值",
    "interestdebt": "带息债务", "netdebt": "净债务",
    "tangible_asset": "有形资产", "working_capital": "营运资本",
    # daily_basic
    "close": "收盘价", "pe": "市盈率", "pe_ttm": "PE TTM", "pb": "PB",
    "ps_ttm": "PS TTM", "dv_ratio": "股息率", "dv_ttm": "TTM 股息率",
    "total_mv": "总市值", "circ_mv": "流通市值", "turnover_rate": "换手率",
    "volume_ratio": "量比", "float_share": "流通股本", "total_share": "总股本",
}

# 元数据字段（不参与分析的）
META_FIELDS = {
    "ts_code", "ann_date", "f_ann_date", "end_date", "report_type", "comp_type",
    "end_type", "update_flag", "trade_date", "symbol", "name", "market",
    "list_date", "area", "industry", "fullname", "enname", "exchange",
    "curr_type", "trade_unit",
}


# ============== 2. Part A：BenchmarkIQ 数据完整度 ==============

def audit_benchmarkiq_coverage(metrics, vqa_data, tushare_sidecar):
    """对每个 metric_dictionary 字段，统计 342 记录里的完整度"""
    records = vqa_data.get("records", [])
    # 合并 Tushare sidecar
    if tushare_sidecar:
        sidecar_by_key = {}
        for r in tushare_sidecar.get("records", []):
            key = (r.get("bank"), r.get("year"))
            sidecar_by_key[key] = r
        for r in records:
            key = (r.get("bank"), r.get("year"))
            tr = sidecar_by_key.get(key)
            if tr:
                for k, v in tr.items():
                    if k not in ("bank", "year", "ts_code") and r.get(k) is None:
                        r[k] = v
    total = len(records)

    results = []
    for m in metrics:
        code = m["metric_code"]
        # 跳过 source_group 是文档/规则类的元字段
        non_null = sum(1 for r in records if r.get(code) is not None)
        pct = non_null / total if total else 0
        results.append({
            "code": code,
            "name": m["metric_name"],
            "theme": m["theme"],
            "source_group": m["source_group"],
            "is_critical": m.get("is_critical", "False"),
            "is_derived": m.get("is_derived", "False"),
            "non_null": non_null,
            "total": total,
            "completeness": pct,
        })
    return results


def audit_per_bank_year(records, top_n_missing):
    """每家银行各自缺失的 metric 数"""
    missing_by_bank = defaultdict(int)
    for r in records:
        for m in top_n_missing[:30]:  # 只看 top 30 缺失的
            if r.get(m["code"]) is None:
                missing_by_bank[r.get("bank", "?")] += 1
    return sorted(missing_by_bank.items(), key=lambda x: -x[1])


# ============== 3. Part B：Tushare 未纳入字段 ==============

def audit_unmapped_tushare(metrics, tushare_cols):
    """找出 Tushare 有但 BQ 没用上的字段，按价值分类"""
    # BQ 现有映射的 Tushare 字段（从 source_field 提取）
    bq_mapped = set()
    for m in metrics:
        sf = m.get("source_field", "")
        # Tushare 来源标记 "Tushare xxx" 中提取
        if m.get("source_group", "").startswith("Tushare"):
            bq_mapped.add(sf)

    unmapped_by_table = defaultdict(list)
    for table, cols in tushare_cols.items():
        for col in cols:
            if col in META_FIELDS:
                continue
            if col in bq_mapped:
                continue
            label = TUSHARE_LABELS.get(col, "")
            unmapped_by_table[table].append({"field": col, "label": label})
    return unmapped_by_table


def score_unmapped(table: str, field: str, label: str, completeness: float) -> tuple:
    """对未映射字段打优先级分（5 = 最高）"""
    f = field.lower()
    score = 1
    reason = "通用字段"
    # IFRS 9 / 资产负债结构（银行视角高价值）
    if any(k in f for k in ["fvtpl", "fvoci", "trad_asset", "htm", "afa", "ac_assets"]):
        score = 5; reason = "IFRS 9 资产分类（已部分纳入 Phase 2）"
    elif any(k in f for k in ["deri_", "buy_resale", "fund_sale", "depos_oth", "bond_payable"]):
        score = 4; reason = "负债/同业结构（NIM 与流动性）"
    elif "cb_borr" in f or "borrow_fr_cent" in f:
        score = 4; reason = "向央行借款（货币政策传导）"
    # 现金流细分
    elif f.startswith("n_") and "cashflow" in f or "incr_dep" in f or "decr_loan" in f:
        score = 4; reason = "现金流细分（已部分纳入 Phase 2）"
    # 利润表细分
    elif any(k in f for k in ["invest_income", "fair_value_chg", "fx_gain", "ebit", "ebitda", "rd_exp"]):
        score = 4 if "rd_" not in f else 2; reason = "利润表细分"
    elif "extra_item" in f or "minority_gain" in f or "minority_int" in f:
        score = 3; reason = "归母调整"
    # 财务指标（Tushare 已算好的比率）
    elif any(k in f for k in ["yoy", "margin", "_turn", "_ratio"]):
        if "rd_" in f or "salescash" in f or "ar_turn" in f or "inv_turn" in f:
            score = 1; reason = "非银业务字段不适用"
        else:
            score = 3; reason = "Tushare 直读财务比率"
    # DuPont 类
    elif "dupont" in f or "assets_to_eqt" in f:
        score = 5; reason = "DuPont 三因子分解（已部分纳入 Phase 1）"
    # 估值
    elif f in {"pe", "pe_ttm", "ps_ttm", "dv_ratio", "dv_ttm", "total_mv", "circ_mv", "turnover_rate", "volume_ratio"}:
        score = 4; reason = "估值/流动性维度（已部分纳入 Phase 1）"
    # 现金/类现金
    elif any(k in f for k in ["money_cap", "due_fr_central", "depos_in_oth"]):
        score = 3; reason = "流动资产细分"
    # 减值/计提（高价值，特别是 IFRS 9）
    elif "impair" in f or "prov_" in f:
        score = 5; reason = "拨备/减值（IFRS 9 核心）"
    # 利息细分
    elif "int_" in f or "interest" in f:
        score = 3; reason = "利息收支结构"
    # 其他通用项
    elif "goodwill" in f:
        score = 3; reason = "并购历史风险"
    elif "fix_assets" in f or "intan_assets" in f or "lt_eqt_invest" in f:
        score = 2; reason = "非主营资产"
    elif "cap_rese" in f or "undistr_porfit" in f or "surplus_rese" in f or "general_rese" in f:
        score = 3; reason = "股东权益细分"

    # 完整度低于 50% 自动降一档
    if completeness < 0.5:
        score = max(1, score - 1)
        reason += "（低完整度）"
    return score, reason


def compute_field_completeness(table: str, field: str) -> float:
    p = CACHE / f"{table}.parquet"
    if not p.exists():
        return 0
    try:
        df = pd.read_parquet(p, columns=[field])
        return df[field].notna().sum() / max(len(df), 1)
    except Exception:
        return 0


# ============== 4. 主流程 ==============

def main():
    print("=" * 80)
    print("BenchmarkIQ 数据完整度审计 + Tushare 字段对标")
    print("=" * 80)

    print("\n[1/4] 读取 data.js + data_tushare.js + metric_dictionary + parquet ...")
    vqa = load_vqa_data()
    sidecar = load_tushare_sidecar()
    metrics = load_metric_dict()
    tushare_cols = load_tushare_columns()
    print(f"  ✓ data.js: {len(vqa.get('records', []))} 条记录")
    print(f"  ✓ data_tushare.js: {'已加载 ' + str(len(sidecar.get('records', []))) + ' 条' if sidecar else '未生成'}")
    print(f"  ✓ metric_dictionary: {len(metrics)} 个指标")
    total_tushare = sum(len(c) for c in tushare_cols.values())
    print(f"  ✓ Tushare 字段总数: {total_tushare}")

    # ----- Part A: BQ 完整度 -----
    print("\n[2/4] 审计 BenchmarkIQ 现有指标的完整度 ...")
    audit_results = audit_benchmarkiq_coverage(metrics, vqa, sidecar)
    by_complete_asc = sorted(audit_results, key=lambda x: x["completeness"])
    critical_missing = [r for r in by_complete_asc if r["is_critical"] == "True" and r["completeness"] < 0.8]
    very_missing = [r for r in by_complete_asc if r["completeness"] < 0.5]
    fully_complete = [r for r in audit_results if r["completeness"] >= 0.99]

    print(f"\n  ⚠ Critical 指标完整度 <80% （{len(critical_missing)} 个）:")
    for r in critical_missing[:15]:
        print(f"    {r['code']:35s} {r['name'][:22]:22s} {r['theme'][:12]:12s} "
              f"{r['non_null']:>3d}/{r['total']:<3d} ({r['completeness']*100:>5.1f}%)")

    print(f"\n  低完整度（<50%）总数: {len(very_missing)}")
    print(f"  完整度 100%: {len(fully_complete)} 个")

    # ----- Part B: Tushare 未纳入 -----
    print("\n[3/4] 对比 Tushare 469 个字段中未纳入的 ...")
    unmapped = audit_unmapped_tushare(metrics, tushare_cols)

    # 给每个未映射字段打分
    scored_unmapped = []
    for table, items in unmapped.items():
        for it in items:
            completeness = compute_field_completeness(table, it["field"])
            score, reason = score_unmapped(table, it["field"], it["label"], completeness)
            scored_unmapped.append({
                "table": table, "field": it["field"], "label": it["label"],
                "completeness": completeness, "score": score, "reason": reason,
            })

    high_value = [s for s in scored_unmapped if s["score"] >= 4]
    high_value.sort(key=lambda x: (-x["score"], -x["completeness"]))

    print(f"\n  Tushare 未纳入字段：{len(scored_unmapped)} 个")
    print(f"  其中价值分 ≥4/5：{len(high_value)} 个（高价值待纳入）")
    print(f"\n  Top 25 高价值未纳入字段:")
    for s in high_value[:25]:
        lbl = s['label'] or "（无中文标签）"
        print(f"    {s['score']}/5  {s['table']:18s} {s['field']:25s} {lbl[:18]:18s} "
              f"完整度 {s['completeness']*100:>5.1f}%  · {s['reason']}")

    # ----- 输出 markdown 报告 -----
    print("\n[4/4] 写报告 ...")
    md = []
    md.append(f"# 数据完整度审计 + Tushare 字段对标\n\n")
    md.append(f"生成时间：{datetime.now().isoformat(timespec='seconds')}\n\n")
    md.append(f"- BenchmarkIQ 指标数：{len(metrics)}\n")
    md.append(f"- 现有 records：{len(vqa.get('records', []))}\n")
    md.append(f"- Tushare 字段总数：{total_tushare}\n")
    md.append(f"- Tushare 已纳入：{sum(1 for m in metrics if m['source_group'].startswith('Tushare'))}\n")
    md.append(f"- Tushare 未纳入：{len(scored_unmapped)}（其中价值分≥4：{len(high_value)}）\n\n")

    # Part A
    md.append("## Part A：BenchmarkIQ 数据缺失情况\n\n")
    md.append(f"### A1. Critical 指标完整度低于 80%（{len(critical_missing)} 个，急需补）\n\n")
    md.append("| 指标 | 中文 | 主题 | 完整度 | 来源 |\n|---|---|---|---:|---|\n")
    for r in critical_missing:
        md.append(f"| `{r['code']}` | {r['name']} | {r['theme']} | "
                  f"{r['completeness']*100:.0f}% ({r['non_null']}/{r['total']}) | {r['source_group']} |\n")

    md.append(f"\n### A2. 所有低完整度指标（<50%，共 {len(very_missing)} 个）\n\n")
    md.append("| 指标 | 中文 | 主题 | 完整度 | 关键? |\n|---|---|---|---:|---|\n")
    for r in very_missing:
        critical = "★" if r["is_critical"] == "True" else ""
        md.append(f"| `{r['code']}` | {r['name']} | {r['theme']} | "
                  f"{r['completeness']*100:.0f}% | {critical} |\n")

    md.append(f"\n### A3. 缺失最多的银行（Top 缺失指标维度）\n\n")
    bank_missing = audit_per_bank_year(vqa["records"], very_missing)
    md.append("| 银行 | 缺失字段数（Top 30 缺失指标范围）|\n|---|---:|\n")
    for bank, cnt in bank_missing[:20]:
        md.append(f"| {bank} | {cnt} |\n")

    # Part B
    md.append("\n## Part B：Tushare 未纳入但有价值的字段\n\n")
    md.append(f"### B1. Top 价值（4-5/5 分）建议纳入\n\n")
    md.append("| 评分 | Tushare 表 | 字段 | 中文 | 完整度 | 价值原因 |\n|---:|---|---|---|---:|---|\n")
    for s in high_value:
        lbl = s["label"] or "—"
        md.append(f"| {s['score']}/5 | {s['table']} | `{s['field']}` | {lbl} | "
                  f"{s['completeness']*100:.0f}% | {s['reason']} |\n")

    md.append(f"\n### B2. 各表未纳入字段统计\n\n")
    md.append("| Tushare 表 | 总字段 | 已纳入 | 未纳入 | 未纳入高价值 |\n|---|---:|---:|---:|---:|\n")
    bq_by_table = defaultdict(int)
    for m in metrics:
        sg = m.get("source_group", "")
        if sg.startswith("Tushare"):
            tbl = sg.split()[-1] if " " in sg else sg
            bq_by_table[tbl] += 1
    for table, cols in tushare_cols.items():
        total = len(cols)
        mapped = bq_by_table.get(table, 0)
        unmapped_in_table = [s for s in scored_unmapped if s["table"] == table]
        high_in_table = sum(1 for s in unmapped_in_table if s["score"] >= 4)
        md.append(f"| {table} | {total} | {mapped} | {len(unmapped_in_table)} | {high_in_table} |\n")

    md.append(f"\n### B3. 建议的 Phase 3 字段清单（按表分组）\n\n")
    for table in sorted(set(s["table"] for s in high_value)):
        items = [s for s in high_value if s["table"] == table]
        if not items:
            continue
        md.append(f"\n**{table}**（{len(items)} 个高价值字段）\n\n")
        for s in items:
            lbl = s["label"] or "—"
            md.append(f"- `{s['field']}` {lbl} ({s['score']}/5, 完整度 {s['completeness']*100:.0f}%) — {s['reason']}\n")

    md.append(f"\n## 总结\n\n")
    md.append(f"### 数据缺失三大问题\n\n")
    md.append(f"1. **Critical 字段缺失 {len(critical_missing)} 个**：是当前分析最大的短板，建议优先补\n")
    md.append(f"2. **低完整度字段 {len(very_missing)} 个**：影响图表显示和叙事生成\n")
    md.append(f"3. **拨备/IFRS 9 字段可能两路覆盖都不足**：详见 `tushare_impair_diagnose.py` 输出\n\n")

    md.append(f"### Tushare 数据库利用率\n\n")
    md.append(f"- 总字段：{total_tushare} 个\n")
    md.append(f"- 已纳入 BQ：{sum(1 for m in metrics if m['source_group'].startswith('Tushare'))} 个\n")
    md.append(f"- 高价值未纳入：{len(high_value)} 个\n")
    md.append(f"- **利用率约 {sum(1 for m in metrics if m['source_group'].startswith('Tushare')) / total_tushare * 100:.0f}%**\n\n")

    md.append(f"### 下一步建议\n\n")
    md.append(f"1. 先跑 `python3 tushare_impair_diagnose.py` 看拨备字段真实完整度\n")
    md.append(f"2. 把 Part A 里的 Critical 缺失项分类：\n")
    md.append(f"   - Tushare 没有的 → 从年报附注抽取\n")
    md.append(f"   - Tushare 有但我没拉到的 → 看 Part B Top 价值，挑重点纳入\n")
    md.append(f"3. Phase 3 数据扩展（建议）：按 B3 表分组逐表纳入约 20-30 个高价值字段\n")

    report = DOCS / "data-coverage-audit.md"
    report.write_text("".join(md), encoding="utf-8")
    print(f"✓ 报告: {report}")
    print()
    print(f"=== 三行核心结论 ===")
    print(f"  1. BQ Critical 字段缺失 {len(critical_missing)} 个；低完整度 <50% 共 {len(very_missing)} 个")
    print(f"  2. Tushare 469 字段中 {len(high_value)} 个高价值未纳入（≥4/5 分）")
    print(f"  3. Tushare 利用率 ~{sum(1 for m in metrics if m['source_group'].startswith('Tushare')) / total_tushare * 100:.0f}%，有较大补完空间")


if __name__ == "__main__":
    main()
