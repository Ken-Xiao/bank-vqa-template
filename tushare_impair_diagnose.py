"""
Tushare 拨备字段诊断（不消耗 Tushare 积分）

回答两个问题：
1. Tushare income 表里到底有哪几列和"拨备/减值"相关？
2. 42 家银行 6 年的 prov_depr_assets / assets_impair_loss 完整度是多少？

用法：
    python3 tushare_impair_diagnose.py
"""

from __future__ import annotations

import sys
from pathlib import Path

try:
    import pandas as pd
except ImportError as e:
    print(f"缺少依赖: {e}", file=sys.stderr)
    sys.exit(1)


CACHE = Path(__file__).parent / "data_tushare_cache"


def main():
    p = CACHE / "income.parquet"
    if not p.exists():
        print(f"ERROR: 缓存不存在 {p}", file=sys.stderr)
        sys.exit(1)

    df = pd.read_parquet(p)
    n_rows = len(df)
    print("=" * 70)
    print(f"income.parquet 共 {n_rows} 行 × {len(df.columns)} 列")
    print("=" * 70)

    # 1. 找所有跟"拨备/减值"相关的字段
    keywords = ["impair", "prov", "depr", "credit", "loss", "reserve", "alloca"]
    candidates = [c for c in df.columns if any(k in c.lower() for k in keywords)]
    print(f"\n【1】拨备/减值候选字段 ({len(candidates)} 个):")
    for col in candidates:
        non_null = df[col].notna().sum()
        pct = non_null / n_rows * 100
        sample = df[df[col].notna()][col].head(3).tolist() if non_null > 0 else []
        print(f"  {col:30s} {non_null:>5d}/{n_rows} ({pct:>5.1f}%)   样本: {sample}")

    # 2. prov_depr_assets vs assets_impair_loss 双源对比
    print(f"\n【2】双口径完整度对比:")
    for col in ["prov_depr_assets", "assets_impair_loss"]:
        if col in df.columns:
            non_null = df[col].notna().sum()
            pct = non_null / n_rows * 100
            zero_count = (df[col] == 0).sum() if non_null > 0 else 0
            print(f"  {col:25s} 非空 {non_null:>5d}/{n_rows} ({pct:>5.1f}%)，其中等于 0 的有 {zero_count}")
        else:
            print(f"  {col:25s} ✗ 字段不存在")

    # 3. 招行 2020-2024 双源详细对比
    print(f"\n【3】招商银行 600036.SH 2020-2024 双源详情（万元）:")
    print(f"  {'年份':6s} {'prov_depr_assets':>18s} {'assets_impair_loss':>22s} {'净利润':>15s} {'拨备/净利润':>12s}")
    for year in [2020, 2021, 2022, 2023, 2024]:
        rows = df[(df["ts_code"] == "600036.SH") & (df["end_date"] == f"{year}1231")]
        if rows.empty:
            print(f"  {year}    缺数据")
            continue
        r = rows.iloc[0]
        prov = r.get("prov_depr_assets")
        loss = r.get("assets_impair_loss")
        npr = r.get("n_income")
        ratio = ""
        used = prov if pd.notna(prov) else loss
        if pd.notna(used) and pd.notna(npr) and npr != 0:
            ratio = f"{used/npr*100:.1f}%"

        def fmt(v):
            if pd.isna(v):
                return "  null"
            return f"{v/10000:.1f} 亿元" if abs(v) > 1e8 else f"{v:.0f}"

        print(f"  {year}    {fmt(prov):>18s} {fmt(loss):>22s} {fmt(npr):>15s} {ratio:>12s}")

    # 4. 工行 (601398.SH) 同样对比
    print(f"\n【4】工商银行 601398.SH 2020-2024:")
    print(f"  {'年份':6s} {'prov_depr_assets':>18s} {'assets_impair_loss':>22s} {'净利润':>15s} {'拨备/净利润':>12s}")
    for year in [2020, 2021, 2022, 2023, 2024]:
        rows = df[(df["ts_code"] == "601398.SH") & (df["end_date"] == f"{year}1231")]
        if rows.empty:
            print(f"  {year}    缺数据")
            continue
        r = rows.iloc[0]
        prov = r.get("prov_depr_assets")
        loss = r.get("assets_impair_loss")
        npr = r.get("n_income")
        ratio = ""
        used = prov if pd.notna(prov) else loss
        if pd.notna(used) and pd.notna(npr) and npr != 0:
            ratio = f"{used/npr*100:.1f}%"

        def fmt(v):
            if pd.isna(v):
                return "  null"
            return f"{v/10000:.1f} 亿元" if abs(v) > 1e8 else f"{v:.0f}"

        print(f"  {year}    {fmt(prov):>18s} {fmt(loss):>22s} {fmt(npr):>15s} {ratio:>12s}")

    # 5. 总结
    print(f"\n=== 结论 ===")
    p_pct = df["prov_depr_assets"].notna().sum() / n_rows * 100 if "prov_depr_assets" in df.columns else 0
    a_pct = df["assets_impair_loss"].notna().sum() / n_rows * 100 if "assets_impair_loss" in df.columns else 0
    print(f"  prov_depr_assets （IFRS 9）覆盖率：{p_pct:.0f}%")
    print(f"  assets_impair_loss（IAS 39）覆盖率：{a_pct:.0f}%")
    print(f"  → 至少一个非空：{p_pct + a_pct - min(p_pct, a_pct):.0f}% 估算")
    print()
    if p_pct < 50:
        print(f"  ⚠ prov_depr_assets 覆盖率低，BenchmarkIQ 已加 fallback 回落到 IAS 39 旧口径")
    print(f"  ⚠ 如果两路覆盖都低，Tushare 该字段在中国银行业可能整体披露不完整")
    print(f"     需要补 'assets_impair_loss' 或从年报附注抽取")


if __name__ == "__main__":
    main()
