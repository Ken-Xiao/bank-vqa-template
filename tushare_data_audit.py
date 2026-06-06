"""
BenchmarkIQ Tushare 数据审计脚本

读取 data_tushare_cache/ 下所有 parquet，输出：
1. 每张表的字段清单 + 类型 + 完整度（多少行非空）
2. 每家银行 × 每个期间的覆盖矩阵
3. 招商银行 2024 年报样本展开（用于人工验证）
4. BenchmarkIQ 现有 257 字段 vs Tushare 字段的映射建议
5. 缺口清单（BenchmarkIQ 需要但 Tushare 没有的）

用法：
    python3 tushare_data_audit.py                  # 控制台 + 写 markdown 报告
    python3 tushare_data_audit.py --html           # 额外生成 HTML 表格

输出：
    docs/tushare-field-coverage-report.md          # 字段覆盖报告
    docs/tushare-field-mapping.csv                 # BenchmarkIQ ↔ Tushare 映射表
"""

from __future__ import annotations

import argparse
import os
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
DOCS.mkdir(parents=True, exist_ok=True)


# BenchmarkIQ 现有的关键字段，按主题分组（来自 js/01-state.js 的 metricLabel）
BENCHMARKIQ_KEY_METRICS = {
    "盈利": [
        ("roa", "总资产收益率", "fina_indicator.roa"),
        ("roe", "净资产收益率", "fina_indicator.roe"),
        ("netProfit", "净利润", "income.n_income / income.income_attr_p"),
        ("netProfitGrowth", "净利润增速", "fina_indicator.netprofit_yoy 或自行计算"),
        ("ppop", "拨备前利润", "需推导: income.total_profit + income.assets_impair_loss"),
        ("ppopGrowth", "拨备前利润增速", "需推导，由 ppop 自行计算 yoy"),
        ("revenue", "营业收入", "income.revenue"),
        ("revenueGrowth", "营业收入增速", "fina_indicator.tr_yoy"),
        ("coreRevenue", "核心营收", "需推导: 利息净收入 + 手续费净收入"),
        ("coreRevenueGrowth", "核心营收增速", "需推导"),
        ("basicEps", "基本每股收益", "fina_indicator.eps"),
    ],
    "息差": [
        ("nim", "净息差", "需推导: 利息净收入 / 平均生息资产 (Tushare 无现成 NIM 字段)"),
        ("earningAssets", "生息资产", "需从 balancesheet 多字段推导"),
        ("earningAssetYield", "生息资产收益率", "需推导"),
        ("interestLiabilities", "计息负债", "需推导"),
        ("interestLiabilityCost", "计息负债成本率", "需推导"),
        ("netInterestIncome", "利息净收入", "income.n_oth_int_inc 或 int_income - int_exp"),
        ("interestIncome", "利息收入", "income.int_income"),
        ("interestExpense", "利息支出", "income.int_exp"),
    ],
    "非息": [
        ("feeIncome", "手续费及佣金净收入", "income.n_commis_income"),
        ("feeRevenueShare", "手续费收入占比", "需推导: n_commis_income / revenue"),
        ("nonInterestShare", "非息收入占比", "需推导"),
        ("netInterestRevenueShare", "利息净收入占比", "需推导"),
        ("trueCoreNonInterest", "真实核心非息占比", "需推导"),
        ("volatileIncomeShare", "高波动收入占比", "需推导"),
    ],
    "资产负债": [
        ("assets", "总资产", "balancesheet.total_assets"),
        ("liabilities", "总负债", "balancesheet.total_liab"),
        ("equity", "股东权益", "balancesheet.total_hldr_eqy_inc_min_int"),
        ("loans", "发放贷款和垫款", "需 balancesheet 推导 (Tushare 字段非银行专属命名)"),
        ("deposits", "吸收存款", "需 balancesheet 推导"),
        ("assetGrowth", "总资产增速", "fina_indicator.assets_yoy"),
        ("assetsChange", "总资产变化", "自行计算"),
        ("loanAssetRatio", "贷款/资产", "需推导"),
        ("depositLiabilityRatio", "存款/负债", "需推导"),
    ],
    "资本": [
        ("cet1", "核心一级资本充足率", "❌ Tushare 三大报表不直接披露，需年报附注或手工"),
        ("cet1Change", "核心一级资本变化", "需推导"),
        ("carBuffer", "资本充足率余量", "❌ 同上"),
        ("estimatedRwa", "估算风险加权资产", "❌ 同上，可用代理"),
        ("rwaDensity", "RWA密度", "❌ 需 RWA + 总资产"),
    ],
    "资产质量": [
        ("npl", "不良率", "❌ 银行年报独立披露，Tushare 三大报表无"),
        ("provisionCoverage", "拨备覆盖率", "❌ 同上"),
        ("overdueRatio", "逾期贷款率", "❌ 同上"),
        ("specialMentionRatio", "关注类贷款占比", "❌ 同上"),
        ("provisionCoverageChange", "拨备覆盖率变化", "❌"),
        ("overdueNplDeviation", "逾期不良偏离度", "❌"),
        ("hiddenNplExposure", "隐性不良暴露率", "❌ 需逾期数据"),
        ("retailRiskMax", "零售最高分项不良率", "❌ 需细分披露"),
    ],
    "市场估值": [
        ("pb", "年末市净率", "daily_basic.pb"),
        ("pbMid", "年中市净率", "daily_basic 取 6 月底"),
        ("theoreticalPb", "DDM 理论 PB", "需自建 DDM 模型"),
        ("pbDiscount", "PB 估值偏离", "需推导"),
        ("economicProfit", "经济利润", "需推导: 净利润 - 权益 × 资本成本"),
    ],
    "成本效率": [
        ("costIncomeRatio", "成本收入比", "需推导: 业务及管理费 / 营业收入"),
        ("adminExpense", "管理费用", "income.biz_tax_surchg 或 oper_exp"),
        ("adminAssetRatio", "管理费用/资产", "需推导"),
        ("cashProfitRatio", "经营现金流/净利润", "需推导"),
        ("operatingCashFlow", "经营活动现金流净额", "cashflow.n_cashflow_act"),
    ],
    "存款细分": [
        ("corporateDeposit", "公司存款", "❌ 银行年报存款分项"),
        ("personalDeposit", "个人存款", "❌"),
        ("demandDepositShare", "活期存款占比", "❌"),
        ("timeDepositShare", "定期存款占比", "❌"),
    ],
    "贷款细分": [
        ("corporateLoanNpl", "对公贷款不良率", "❌"),
        ("personalLoanNpl", "个贷不良率", "❌"),
        ("housingLoanShare", "住房贷款占比", "❌"),
        ("consumerLoanShare", "消费贷款占比", "❌"),
        ("businessLoanShare", "经营贷款占比", "❌"),
    ],
    "其他": [
        ("investmentAssetRatio", "债券基金信托理财/资产", "需 balancesheet 推导"),
        ("bondInvestment", "债券投资", "balancesheet 推导"),
        ("liquidityRatio", "流动性比率", "❌ 监管报表"),
        ("liquidityCoverageRatio", "流动性覆盖率", "❌ 监管报表"),
    ],
}


def header(title: str, char: str = "="):
    print()
    print(char * 80)
    print(f"  {title}")
    print(char * 80)


def audit_table(p: Path, label: str, md_lines: list[str]) -> dict:
    """审计单张 parquet 表，返回元数据 + 写 markdown。"""
    if not p.exists():
        print(f"  ✗ {label} 不存在")
        md_lines.append(f"\n### {label} —— ❌ 未缓存\n")
        return {}
    df = pd.read_parquet(p)
    n_rows = len(df)
    n_cols = len(df.columns)
    n_banks = df["ts_code"].nunique() if "ts_code" in df.columns else 1

    header(f"{label} ({n_rows} 行 × {n_cols} 列, {n_banks} 家银行)", char="-")

    # 字段完整度
    completeness = df.notna().sum() / max(n_rows, 1)
    sorted_cols = completeness.sort_values(ascending=False)

    md_lines.append(f"\n### {label}\n")
    md_lines.append(f"- 总行数：{n_rows:,}  ｜ 字段数：{n_cols}  ｜ 银行数：{n_banks}\n")
    if "end_date" in df.columns:
        periods = df["end_date"].nunique()
        date_range = (df["end_date"].min(), df["end_date"].max())
        md_lines.append(f"- 期间数：{periods}（{date_range[0]} — {date_range[1]}）\n")
    elif "trade_date" in df.columns:
        date_range = (df["trade_date"].min(), df["trade_date"].max())
        md_lines.append(f"- 时间范围：{date_range[0]} — {date_range[1]}\n")

    md_lines.append(f"\n**字段完整度（前 50 列）**\n\n")
    md_lines.append("| 字段 | 完整度 | dtype |\n")
    md_lines.append("|---|---:|---|\n")
    for col, pct in sorted_cols.head(50).items():
        md_lines.append(f"| `{col}` | {pct:.1%} | {df[col].dtype} |\n")

    # 控制台 top 20
    print("  字段（按完整度排序，前 20）:")
    for col, pct in sorted_cols.head(20).items():
        print(f"    {col:35s} {pct:6.1%}  {df[col].dtype}")
    if n_cols > 20:
        print(f"    ... 还有 {n_cols - 20} 个字段，详见 markdown 报告")

    return {
        "label": label,
        "n_rows": n_rows,
        "n_cols": n_cols,
        "n_banks": n_banks,
        "columns": list(df.columns),
    }


def sample_cmb_2024(md_lines: list[str]):
    """招商银行 2024 年报样本展开，用于人工验证字段映射。"""
    header("招商银行 600036.SH 2024 年报样本（人工验证）", char="=")
    md_lines.append("\n## 招商银行 2024 年报样本（人工对照）\n\n")
    md_lines.append("用 BenchmarkIQ 现有 data.js 里的招行 2024 数据对比下表数值，若一致则字段映射正确。\n\n")

    tables = {
        "balancesheet": parquet_path("balancesheet"),
        "income": parquet_path("income"),
        "cashflow": parquet_path("cashflow"),
        "fina_indicator": parquet_path("fina_indicator"),
    }

    for name, p in tables.items():
        if not p.exists():
            continue
        df = pd.read_parquet(p)
        cmb = df[(df["ts_code"] == "600036.SH") & (df["end_date"] == "20241231")]
        if cmb.empty:
            md_lines.append(f"\n### {name} —— ⚠ 招行 2024-12-31 数据缺失\n")
            print(f"  ⚠ {name}: 招行 2024 缺")
            continue
        row = cmb.iloc[0]
        non_null = row.dropna()
        md_lines.append(f"\n### {name}（{len(non_null)} 个非空字段）\n\n")
        md_lines.append("| 字段 | 值 |\n|---|---:|\n")
        print(f"\n  {name}: {len(non_null)} 个非空字段")
        # 数字字段格式化展示
        for col in non_null.index[:60]:
            val = non_null[col]
            try:
                fval = float(val)
                if abs(fval) >= 1e8:
                    formatted = f"{fval:,.0f}"
                elif abs(fval) < 1:
                    formatted = f"{fval:.4f}"
                else:
                    formatted = f"{fval:,.2f}"
            except (ValueError, TypeError):
                formatted = str(val)[:50]
            md_lines.append(f"| `{col}` | {formatted} |\n")


def benchmarkiq_field_mapping(md_lines: list[str]):
    """输出 BenchmarkIQ 字段 → Tushare 字段的映射表 + 缺口统计"""
    header("BenchmarkIQ 257 字段 vs Tushare 映射缺口", char="=")
    md_lines.append("\n## BenchmarkIQ 字段 vs Tushare 映射\n\n")

    csv_lines = ["主题,BenchmarkIQ字段,中文名,Tushare来源,状态"]
    counts = {"✓ 直接映射": 0, "🔧 需推导": 0, "❌ 缺失": 0}

    for theme, fields in BENCHMARKIQ_KEY_METRICS.items():
        md_lines.append(f"\n### {theme}\n\n")
        md_lines.append("| BenchmarkIQ 字段 | 中文名 | Tushare 来源 | 状态 |\n")
        md_lines.append("|---|---|---|---|\n")
        for f, cn, source in fields:
            if source.startswith("❌"):
                status = "❌ 缺失"
            elif "推导" in source:
                status = "🔧 需推导"
            else:
                status = "✓ 直接映射"
            counts[status] += 1
            md_lines.append(f"| `{f}` | {cn} | `{source}` | {status} |\n")
            csv_lines.append(f'"{theme}","{f}","{cn}","{source}","{status}"')

    total = sum(counts.values())
    md_lines.append(f"\n### 映射缺口统计\n\n")
    md_lines.append(f"| 状态 | 数量 | 占比 |\n|---|---:|---:|\n")
    for k, v in counts.items():
        md_lines.append(f"| {k} | {v} | {v/total:.0%} |\n")
    md_lines.append(f"| **总计** | **{total}** | 100% |\n\n")

    print(f"\n  映射缺口统计:")
    for k, v in counts.items():
        print(f"    {k:20s} {v:>3d}  ({v/total:.0%})")

    # 写 CSV
    csv_path = DOCS / "tushare-field-mapping.csv"
    csv_path.write_text("\n".join(csv_lines), encoding="utf-8")
    print(f"\n  ✓ 映射表已保存: {csv_path}")


def coverage_matrix(md_lines: list[str]):
    """覆盖矩阵：每家银行 × 每个期间是否有数据"""
    header("覆盖矩阵：42 家银行 × 24 期", char="=")
    md_lines.append("\n## 覆盖矩阵\n\n")

    for table in ["balancesheet", "income", "cashflow", "fina_indicator"]:
        p = parquet_path(table)
        if not p.exists():
            continue
        df = pd.read_parquet(p)
        if "ts_code" not in df.columns or "end_date" not in df.columns:
            continue
        # 创建覆盖矩阵：行=银行，列=期间
        matrix = df.groupby(["ts_code", "end_date"]).size().unstack(fill_value=0)
        # 期间排序
        matrix = matrix[sorted(matrix.columns)]
        n_banks = matrix.shape[0]
        n_periods = matrix.shape[1]
        total_cells = n_banks * n_periods
        covered_cells = (matrix > 0).sum().sum()
        coverage_pct = covered_cells / total_cells

        md_lines.append(f"### {table}：{n_banks} 银行 × {n_periods} 期，覆盖率 {coverage_pct:.1%}\n\n")
        # 找出缺数据的银行
        missing_by_bank = (matrix == 0).sum(axis=1)
        worst = missing_by_bank.sort_values(ascending=False).head(10)
        if (worst > 0).any():
            md_lines.append("**数据缺最多的 10 家银行**：\n\n")
            md_lines.append("| ts_code | 缺失期数 / 总期数 |\n|---|---:|\n")
            for code, n_missing in worst.items():
                if n_missing > 0:
                    md_lines.append(f"| {code} | {int(n_missing)} / {n_periods} |\n")
        else:
            md_lines.append("✓ 所有银行的所有期间都有数据。\n")
        md_lines.append("\n")
        print(f"  {table:20s} 覆盖率 {coverage_pct:.1%}（{n_banks}银行 × {n_periods}期）")


def parquet_path(table: str) -> Path:
    return CACHE / f"{table}.parquet"


def main():
    parser = argparse.ArgumentParser(description="BenchmarkIQ Tushare 数据审计")
    args = parser.parse_args()

    if not CACHE.exists():
        print(f"ERROR: 缓存目录不存在: {CACHE}", file=sys.stderr)
        sys.exit(1)

    md_lines = [
        f"# Tushare A 股数据审计报告\n\n",
        f"生成时间：{datetime.now().isoformat(timespec='seconds')}\n",
        f"缓存目录：`{CACHE.absolute()}`\n\n",
        "本报告基于已拉取的 A 股 42 家银行 6 年面板数据，输出：\n",
        "1. 各表字段清单 + 完整度\n",
        "2. 招商银行 2024 年报样本（人工验证用）\n",
        "3. BenchmarkIQ 257 字段映射缺口\n",
        "4. 银行 × 期间覆盖矩阵\n",
    ]

    header("第 1 部分：表与字段清单", char="=")
    md_lines.append("\n## 第 1 部分：各表字段清单\n")
    summaries = []
    for table in ["stock_basic", "balancesheet", "income", "cashflow",
                  "fina_indicator", "daily_basic", "shibor"]:
        s = audit_table(parquet_path(table), table, md_lines)
        if s:
            summaries.append(s)

    sample_cmb_2024(md_lines)
    benchmarkiq_field_mapping(md_lines)
    coverage_matrix(md_lines)

    # 写报告
    report_path = DOCS / "tushare-field-coverage-report.md"
    report_path.write_text("".join(md_lines), encoding="utf-8")
    print()
    print("=" * 80)
    print(f"  ✓ 完整报告已保存: {report_path}")
    print(f"  ✓ 字段映射 CSV: {DOCS / 'tushare-field-mapping.csv'}")
    print("=" * 80)


if __name__ == "__main__":
    main()
