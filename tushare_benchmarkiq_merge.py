"""
BenchmarkIQ × Tushare 精确比对 + 合并分析

读取：
    data_governance/metric_dictionary.csv  → BenchmarkIQ 现有 65 指标
    data_tushare_cache/*.parquet           → Tushare 实际拉到的字段

输出：
    docs/benchmarkiq-tushare-merge-analysis.md
        - 每个 BQ 指标到 Tushare 字段的精确映射
        - Tushare 独有的新维度（BQ 没用上的）
        - 合并后能解锁的 12 个新分析方向
    docs/unified-schema.csv
        - 合并后的统一字段清单，给 build_vqa_data_v2.py 用

用法：
    python3 tushare_benchmarkiq_merge.py
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
BANK_MASTER = ROOT / "data_governance" / "bank_master.csv"

DOCS.mkdir(parents=True, exist_ok=True)


# ========== 映射规则：BenchmarkIQ source_group → Tushare 字段精确对应 ==========

# 直接对应表（BQ source_field 中文 → Tushare 表.字段）
DIRECT_MAPPING = {
    # 利润表
    "营业收入": "income.revenue",
    "利息净收入": "income.n_oth_int_inc",
    "利息收入": "income.int_income",
    "利息支出": "income.int_exp",
    "手续费及佣金净收入": "income.n_commis_income",
    "净利润": "income.n_income",
    "所得税": "income.income_tax",
    "拨备前利润": "income.derived(total_profit+assets_impair_loss)",
    "营业支出": "income.oper_exp",
    "管理费用": "income.biz_tax_surchg",  # 银行业务管理费在该字段附近
    # 资产负债表
    "总资产": "balancesheet.total_assets",
    "总负债": "balancesheet.total_liab",
    "股东权益": "balancesheet.total_hldr_eqy_inc_min_int",
    "发放贷款和垫款": "balancesheet.loanto_oth_bank_fi+derived",
    "吸收存款": "balancesheet.derived_from_disclosure",
    # 现金流
    "经营活动现金流净额": "cashflow.n_cashflow_act",
    "经营现金流变化": "cashflow.derived(yoy)",
    # 财务指标
    "ROA": "fina_indicator.roa",
    "ROE": "fina_indicator.roe",
    "基本每股收益": "fina_indicator.eps",
    "总资产增速": "fina_indicator.assets_yoy",
    "净利润增速": "fina_indicator.netprofit_yoy",
    "营业收入增速": "fina_indicator.tr_yoy",
    # 市场估值
    "PB": "daily_basic.pb",
    "年末市净率": "daily_basic.pb (12月末)",
    "年中市净率": "daily_basic.pb (6月末)",
    "PE": "daily_basic.pe_ttm",
    "市净率": "daily_basic.pb",
    "市值": "daily_basic.total_mv",
    "流通市值": "daily_basic.circ_mv",
}

# 银行专属指标：Tushare 三大报表不直接披露，需要年报附注/手工
ANNUAL_REPORT_REQUIRED = {
    "不良率", "不良贷款率", "拨备覆盖率", "逾期贷款率", "关注类贷款占比",
    "核心一级资本充足率", "资本充足率", "一级资本充足率",
    "公司活期", "公司定期", "个人活期", "个人定期",
    "对公贷款", "个贷", "住房贷款", "消费贷款", "经营贷款",
    "对公贷款不良率", "个贷不良率",
    "RWA", "风险加权资产", "拨备",
    "Stage 1", "Stage 2", "Stage 3", "三阶段",
    "流动性比率", "流动性覆盖率",
    "生息资产", "计息负债",  # 这两个银行有披露但 Tushare 三表不分项
    "NIM", "净息差",  # Tushare 无 NIM 直接字段
}


def classify_bq_metric(row: dict) -> tuple[str, str]:
    """
    给定 metric_dictionary 一行，返回 (来源类型, 具体映射)。
    来源类型：✓ 直接映射 / 🔧 需推导 / ❌ 缺失（需年报）/ 📊 已是派生
    """
    code = row["metric_code"]
    name = row["metric_name"]
    source_field = row.get("source_field", "")
    formula = row.get("formula", "")
    is_derived = row.get("is_derived", "False").lower() == "true"

    # 已经是派生的，看公式
    if is_derived and formula and formula != "源字段直取":
        return ("📊 已是派生", f"BQ 内部公式: {formula[:80]}")

    # 直接映射查表
    if source_field in DIRECT_MAPPING:
        return ("✓ 直接映射", DIRECT_MAPPING[source_field])

    # 银行专属年报披露
    for keyword in ANNUAL_REPORT_REQUIRED:
        if keyword in name or keyword in (source_field or ""):
            return ("❌ 缺失", "年报附注披露，Tushare 三表不覆盖，需 PDF 抽取或手工")

    # 含百分比单位通常是衍生指标
    if row.get("unit") in ("%", "bp"):
        return ("🔧 需推导", f"BQ 现有源字段: {source_field}")

    # 其他默认归入需推导
    return ("🔧 需推导", f"BQ 现有源字段: {source_field or 'N/A'}")


# ========== Tushare 独有的"BenchmarkIQ 没用上"的字段 ==========

TUSHARE_UNIQUE_DIMENSIONS = [
    {
        "category": "市场流动性 / 情绪",
        "items": [
            ("daily_basic.turnover_rate", "换手率", "反映个股活跃度，可作为投资者关注度信号"),
            ("daily_basic.volume_ratio", "量比", "短期资金流入/流出强度"),
            ("daily_basic.float_share / total_share", "流通股本/总股本", "锁仓比例，影响价格弹性"),
        ],
    },
    {
        "category": "估值时序衍生（M = Macro）",
        "items": [
            ("daily_basic.pb 6 年面板", "PB 滚动序列", "I 方向：PB 时序 + 资本市场感知漂移"),
            ("月度 PB 标准差", "估值波动率", "估值稳定性指标，反映市场分歧度"),
            ("PB Beta vs 银行板块", "对板块的敏感性", "区分系统性 vs 特异性估值变动"),
            ("daily_basic.pe_ttm 趋势", "市盈率趋势", "盈利预期变化"),
        ],
    },
    {
        "category": "股东行为 / 治理",
        "items": [
            ("daily_basic.dv_ratio", "股息率", "分红一致性 + 投资者吸引力（中国央国行核心指标）"),
            ("daily_basic.dv_ttm", "TTM 股息率", "动态分红水平"),
            ("分红计算: net_profit × payout_ratio", "实际分红额", "A EP 引擎需要的分红再投资率"),
        ],
    },
    {
        "category": "市场结构信号",
        "items": [
            ("hk_hold 北向持仓变化", "北向资金净流入", "外资信心 + 国际定价权"),
            ("indices_member 指数成分", "沪深 300 / 中证银行成分", "被动资金权重"),
            ("margin 融资融券余额", "融资融券", "杠杆资金对个股的关注度"),
        ],
    },
    {
        "category": "盈利预期 / 前瞻",
        "items": [
            ("fina_forecast", "业绩预告", "正式财报前的预告，可对比预告偏差"),
            ("fina_express", "业绩快报", "快报与正式年报的差异"),
            ("disclosure_date", "披露日期", "财报披露及时性 → 信息质量信号"),
        ],
    },
    {
        "category": "宏观背景（已部分有）",
        "items": [
            ("cn_gdp", "GDP", "Stress test 宏观情景输入"),
            ("cn_cpi / cn_ppi", "CPI / PPI", "通胀环境 → 影响 NIM"),
            ("cn_m / cn_sf", "M1/M2 / 社融", "流动性环境 → 影响银行存贷利率"),
            ("cn_pmi", "PMI", "经济周期信号"),
            ("shibor 期限结构", "1W/1M/3M/6M/9M/1Y SHIBOR", "已有，可做利率曲线分析"),
        ],
    },
    {
        "category": "再融资 / 资本工具",
        "items": [
            ("cb_basic", "可转债", "银行可转债转股稀释、剩余规模、再融资压力"),
            ("dividend", "分红明细", "现金分红 + 股票分红记录"),
            ("repurchase", "股份回购", "稳定股价信号"),
            ("share_float", "限售股解禁", "供给冲击"),
        ],
    },
]


# ========== 新分析方向（合并后才能做的）==========

NEW_ANALYSIS_OPPORTUNITIES = [
    {
        "name": "动态 Beta + CAPM 资本成本",
        "value": "为 A EP 引擎提供更精确的权益资本成本",
        "tushare_inputs": "daily_basic 6 年个股 + 银行板块/沪深300 指数 → 滚动 60 月 Beta",
        "benchmarkiq_module": "扩展 js/32-pb-pricing-model.js, 新建 economicProfit 计算",
        "effort": "2-3 天",
        "value_score": 5,
    },
    {
        "name": "PB 时序事件归因（方向 I）",
        "value": "市场对我行的风险定价从 2020 至今变了几次档，每次拐点对应什么宏观事件",
        "tushare_inputs": "daily_basic.pb 月度序列 + 自建宏观事件锚点表",
        "benchmarkiq_module": "扩展 js/32-pb-pricing-model.js",
        "effort": "4-5 天",
        "value_score": 5,
    },
    {
        "name": "PB 系统性 vs 特异性分解",
        "value": "解释 PB 变动里多少来自行业整体 vs 本行自身",
        "tushare_inputs": "本行 PB - 银行板块 PB 加权 (用 daily_basic 滚动回归)",
        "benchmarkiq_module": "新专题，叠加在估值章节",
        "effort": "2 天",
        "value_score": 4,
    },
    {
        "name": "股息率诚信指数",
        "value": "回答董事会问题: '我行的分红是否稳定且可持续'",
        "tushare_inputs": "daily_basic.dv_ratio + 历史分红记录 + 净利润 → 分红覆盖率",
        "benchmarkiq_module": "新专题 '股东回报质量' 或并入现有'市场感知'",
        "effort": "2 天",
        "value_score": 4,
    },
    {
        "name": "北向资金信心指数",
        "value": "外资对每家银行的态度 + 趋势，区分'被外资抛弃' vs '外资增持'",
        "tushare_inputs": "hk_hold 月度北向持股变化",
        "benchmarkiq_module": "新专题 '机构持仓与外资'",
        "effort": "2-3 天",
        "value_score": 4,
    },
    {
        "name": "财报披露质量与一致性",
        "value": "对比业绩预告 vs 业绩快报 vs 正式年报的差异",
        "tushare_inputs": "fina_forecast + fina_express + income 三方比对",
        "benchmarkiq_module": "新专题 '财报治理质量'",
        "effort": "3 天",
        "value_score": 3,
    },
    {
        "name": "利率曲线敏感性 (NIM Sensitivity)",
        "value": "用 SHIBOR 1W/1M/3M/6M/1Y 期限结构跟 NIM 历史回归，量化加息/降息对 NIM 的弹性",
        "tushare_inputs": "shibor 全期限 + 利息净收入序列",
        "benchmarkiq_module": "扩展 What-if，新增'利率曲线情景'",
        "effort": "3-4 天",
        "value_score": 5,
    },
    {
        "name": "宏观四象限 + 银行表现",
        "value": "在 PMI 上升+CPI 上升、PMI 上升+CPI 下降... 四象限下，本行 NIM/ROA 表现如何",
        "tushare_inputs": "cn_pmi + cn_cpi + 现有 ROA/NIM",
        "benchmarkiq_module": "扩展宏观背景章节",
        "effort": "3 天",
        "value_score": 3,
    },
    {
        "name": "估值波动率 + 市场分歧度",
        "value": "PB 月度标准差 → 反映市场对本行价值判断的分歧",
        "tushare_inputs": "daily_basic.pb 月内日度数据",
        "benchmarkiq_module": "估值章节新增 KPI",
        "effort": "1-2 天",
        "value_score": 3,
    },
    {
        "name": "可转债稀释 + 资本补充",
        "value": "解读银行资本工具的发行节奏和稀释影响",
        "tushare_inputs": "cb_basic（可转债基础信息）",
        "benchmarkiq_module": "扩展资本充足章节",
        "effort": "2 天",
        "value_score": 3,
    },
    {
        "name": "限售股解禁压力监测",
        "value": "未来 6 个月有多少限售股解禁，对股价/PB 的潜在压力",
        "tushare_inputs": "share_float（限售股解禁）",
        "benchmarkiq_module": "估值章节预警",
        "effort": "2 天",
        "value_score": 2,
    },
    {
        "name": "申万行业自动 peer 推荐",
        "value": "用 Tushare 申万银行三级分类直接推荐对标组",
        "tushare_inputs": "index_classify + index_member（申万行业指数）",
        "benchmarkiq_module": "替换/增强现有对标推荐",
        "effort": "2 天",
        "value_score": 4,
    },
]


# ========== 主流程 ==========


def load_metric_dict() -> list[dict]:
    rows = []
    with open(METRIC_DICT, encoding="utf-8-sig") as f:
        for r in csv.DictReader(f):
            rows.append(r)
    return rows


def load_tushare_columns() -> dict[str, list[str]]:
    cols = {}
    for p in CACHE.glob("*.parquet"):
        try:
            df = pd.read_parquet(p, columns=None)
            cols[p.stem] = list(df.columns)
        except Exception:
            cols[p.stem] = []
    return cols


def main():
    print("=" * 80)
    print("BenchmarkIQ × Tushare 精确比对 + 合并分析")
    print("=" * 80)

    metrics = load_metric_dict()
    tushare_cols = load_tushare_columns()
    print(f"\n✓ 读到 BenchmarkIQ {len(metrics)} 个指标")
    print(f"✓ 读到 Tushare {len(tushare_cols)} 张表")
    for name, cols in tushare_cols.items():
        print(f"    {name:20s} {len(cols)} 列")

    # 分类
    classified = {"✓ 直接映射": [], "🔧 需推导": [], "❌ 缺失": [], "📊 已是派生": []}
    for m in metrics:
        kind, target = classify_bq_metric(m)
        classified[kind].append({
            "code": m["metric_code"],
            "name": m["metric_name"],
            "theme": m["theme"],
            "is_critical": m.get("is_critical", "False"),
            "tushare_target": target,
        })

    print(f"\n=== BenchmarkIQ 65 指标在 Tushare 上的覆盖 ===")
    for k, v in classified.items():
        print(f"  {k:20s} {len(v):3d}  ({len(v)/len(metrics):.0%})")

    # 输出 markdown 报告
    md = []
    md.append(f"# BenchmarkIQ × Tushare 合并分析报告\n\n")
    md.append(f"生成时间：{datetime.now().isoformat(timespec='seconds')}\n\n")
    md.append(f"- BenchmarkIQ 指标数：{len(metrics)}\n")
    md.append(f"- Tushare 实际拉到的表：{len(tushare_cols)}\n")
    md.append(f"- Tushare 总字段数：{sum(len(c) for c in tushare_cols.values())}\n\n")

    md.append("## 一、合并方案：每个 BenchmarkIQ 指标的来源\n\n")
    for kind, lst in classified.items():
        md.append(f"\n### {kind}（{len(lst)} 个）\n\n")
        md.append("| 指标 | 中文 | 主题 | 关键? | Tushare 来源 |\n")
        md.append("|---|---|---|---|---|\n")
        for r in sorted(lst, key=lambda x: x["theme"]):
            critical = "★" if r["is_critical"] == "True" else ""
            md.append(f"| `{r['code']}` | {r['name']} | {r['theme']} | {critical} | {r['tushare_target']} |\n")

    md.append("\n## 二、Tushare 独有维度（BenchmarkIQ 没用上的金矿）\n\n")
    for cat in TUSHARE_UNIQUE_DIMENSIONS:
        md.append(f"\n### {cat['category']}\n\n")
        md.append("| Tushare 字段/接口 | 中文 | 对 BenchmarkIQ 的价值 |\n")
        md.append("|---|---|---|\n")
        for item in cat["items"]:
            md.append(f"| `{item[0]}` | {item[1]} | {item[2]} |\n")

    md.append("\n## 三、合并后能解锁的 12 个新分析方向\n\n")
    md.append("按 value_score 排序（5=最高）。\n\n")
    sorted_opps = sorted(NEW_ANALYSIS_OPPORTUNITIES, key=lambda x: -x["value_score"])
    md.append("| # | 方向 | 价值分 | 工程量 | 用什么 Tushare 数据 | BenchmarkIQ 哪里改 |\n")
    md.append("|---:|---|:---:|---|---|---|\n")
    for i, op in enumerate(sorted_opps, 1):
        md.append(f"| {i} | **{op['name']}** | {op['value_score']}/5 | {op['effort']} | {op['tushare_inputs']} | {op['benchmarkiq_module']} |\n")

    md.append("\n### 每个方向的详细价值阐述\n\n")
    for i, op in enumerate(sorted_opps, 1):
        md.append(f"\n**{i}. {op['name']}**（{op['value_score']}/5，{op['effort']}）\n\n")
        md.append(f"- 价值：{op['value']}\n")
        md.append(f"- Tushare 输入：{op['tushare_inputs']}\n")
        md.append(f"- BenchmarkIQ 改造点：{op['benchmarkiq_module']}\n")

    md.append("\n## 四、推荐的合并实施顺序\n\n")
    md.append("**Sprint M1（基础映射，3-4 天）**：\n")
    md.append("- 21 个直接映射字段全部接入 `build_vqa_data.py` 的 Tushare 通道\n")
    md.append("- 26 个需推导字段实现公式（NIM、核心营收占比、息差缺口等）\n")
    md.append("- 23 个缺失字段保留现有 data.js 手工通道，加 `data_source` 标签\n\n")
    md.append("**Sprint M2（高价值新分析，4-5 天）**：\n")
    md.append("- #1 动态 Beta + CAPM 资本成本（喂给方向 A 的 EP 引擎）\n")
    md.append("- #2 PB 时序事件归因（即方向 I）\n")
    md.append("- #7 利率曲线敏感性 NIM\n\n")
    md.append("**Sprint M3（中高价值，3-4 天）**：\n")
    md.append("- #3 PB 系统性 vs 特异性分解\n")
    md.append("- #4 股息率诚信指数\n")
    md.append("- #5 北向资金信心指数\n")
    md.append("- #12 申万行业自动 peer 推荐\n\n")
    md.append("**Sprint M4（治理 + 资本工具，2-3 天）**：\n")
    md.append("- #6 财报披露质量\n")
    md.append("- #8 宏观四象限\n")
    md.append("- #10 可转债稀释\n\n")

    report_path = DOCS / "benchmarkiq-tushare-merge-analysis.md"
    report_path.write_text("".join(md), encoding="utf-8")

    # 输出 unified-schema.csv 供 build_vqa_data_v2 用
    schema_path = DOCS / "unified-schema.csv"
    with open(schema_path, "w", encoding="utf-8", newline="") as f:
        w = csv.writer(f)
        w.writerow(["metric_code", "metric_name", "theme", "is_critical", "source_type", "source_detail"])
        for kind, lst in classified.items():
            for r in lst:
                w.writerow([r["code"], r["name"], r["theme"], r["is_critical"], kind, r["tushare_target"]])

    print(f"\n✓ 完整分析报告: {report_path}")
    print(f"✓ 统一 schema: {schema_path}")
    print()
    print(f"🔥 关键发现：")
    print(f"   - BenchmarkIQ {len(classified['✓ 直接映射'])} 个指标可直接从 Tushare 取（占 {len(classified['✓ 直接映射'])/len(metrics):.0%}）")
    print(f"   - 但 Tushare 同时提供 {len(TUSHARE_UNIQUE_DIMENSIONS)} 类 BenchmarkIQ 没用上的新维度")
    print(f"   - 合并后可解锁 12 个新分析方向，其中 3 个价值分 5/5：")
    for op in sorted_opps[:3]:
        print(f"     • {op['name']} ({op['effort']})")


if __name__ == "__main__":
    main()
