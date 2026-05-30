import json
from pathlib import Path

import pandas as pd

from build_data_governance import FIELD_MAP, DERIVED_METRICS, SOURCE


BASE = Path(__file__).resolve().parent
ROOT = BASE.parents[1]
UPDATE_DIR = ROOT / "数据/更新版数据"
OUT_DIR = BASE / "data_governance"
REPORT = OUT_DIR / "field_coverage_report.md"


HIGH_VALUE_GROUPS = {
    "流动性指标": "流动性与集中度风险",
    "贷款结构(万元)": "贷款结构与分项不良",
    "五级分类-余额(万元)": "风险确认与迁徙",
    "五级分类-占贷款比(%)": "风险确认与迁徙",
    "逾期贷款(万元)": "逾期结构与期限迁徙",
    "个人贷款分产品(万元/%)": "零售风险分产品",
    "公司贷款分行业-占比(%)": "对公行业集中度",
    "公司贷款分行业-不良率(%)": "行业风险暴露",
    "金融投资分布(万元)": "金融投资配置",
    "金融资产三阶段-贷款(万元/%)": "新金融工具三阶段风险",
    "金融资产三阶段-金融投资(万元/%)": "投资资产三阶段风险",
    "金融资产三阶段-合计(万元/%)": "全资产三阶段风险",
    "利润表详情(万元)": "利润表归因",
    "资产负债-金融资产(万元)": "金融资产结构",
    "资产负债-同业往来(万元)": "同业与流动性配置",
    "现金流量(万元)": "现金流与经营质量",
    "每股指标": "资本市场指标",
    "估值指标": "资本市场指标",
}

HIGH_PRIORITY_FIELDS = {
    ("盈利指标", "真实核心非息%"): "区分真实中收与高波动收入，增强盈利质量判断",
    ("盈利指标", "高波动收入%"): "识别投资、公允价值等非核心补位",
    ("息差分析", "NIM_Gap百分点"): "底表已有息差缺口，可替代前端派生口径",
    ("息差分析", "真实存贷利差"): "补充存贷主业真实利差",
    ("资产质量", "隐性不良暴露率%"): "增强风险前瞻预警",
    ("资本充足率", "资本充足余量bp"): "补充总资本层面的战略安全垫",
    ("资本充足率", "估算RWA(万元)"): "支持资本消耗和RWA增速计算",
    ("流动性指标", "流动性比率%"): "补充流动性风险视角",
    ("流动性指标", "流动性覆盖率%"): "补充流动性风险视角",
    ("贷款结构(万元)", "公司贷款不良%"): "拆分对公风险",
    ("贷款结构(万元)", "票据贴现不良%"): "拆分票据风险",
    ("个人贷款分产品(万元/%)", "住房贷款占比%"): "零售结构拆解",
    ("个人贷款分产品(万元/%)", "消费贷款占比%"): "零售结构拆解",
    ("个人贷款分产品(万元/%)", "经营贷款占比%"): "零售结构拆解",
    ("个人贷款分产品(万元/%)", "住房贷款不良%"): "零售风险拆解",
    ("个人贷款分产品(万元/%)", "消费贷款不良%"): "零售风险拆解",
    ("个人贷款分产品(万元/%)", "经营贷款不良%"): "零售风险拆解",
    ("金融投资分布(万元)", "债券合计"): "金融投资配置与收益稳定性",
    ("金融投资分布(万元)", "基金"): "投资资产波动来源",
    ("金融投资分布(万元)", "信托及理财"): "非标与复杂投资暴露",
    ("利润表详情(万元)", "利息收入"): "回算资产收益",
    ("利润表详情(万元)", "利息支出"): "回算负债成本",
    ("利润表详情(万元)", "管理费用"): "成本刚性拆解",
    ("利润表详情(万元)", "所得税"): "ROA桥图七因子",
    ("现金流量(万元)", "经营活动净额"): "利润现金含量",
    ("每股指标", "基本EPS(元)"): "资本市场沟通补充指标",
    ("估值指标", "PB(年中)"): "估值趋势验证",
}


def priority_for(group, field):
    key = (group, field)
    if key in HIGH_PRIORITY_FIELDS:
        return "高"
    if group in HIGH_VALUE_GROUPS:
        return "中"
    return "暂缓"


def recommendation_for(group, field):
    key = (group, field)
    if key in HIGH_PRIORITY_FIELDS:
        return HIGH_PRIORITY_FIELDS[key]
    if group in HIGH_VALUE_GROUPS:
        return HIGH_VALUE_GROUPS[group]
    return "暂不进入董办首版，可保留在底层明细"


def list_structured_sources():
    files = []
    for path in sorted(UPDATE_DIR.rglob("*")):
        if path.name.startswith("~$") or path.name.startswith(".~"):
            continue
        if path.suffix.lower() not in {".xlsx", ".xls", ".csv", ".md"}:
            continue
        if "structured" in path.parts or any(token in path.name for token in ["分产品", "分行业", "五级分类", "金融资产三阶段", "金融投资", "逾期贷款", "存贷结构", "流动性", "利率风险", "上市银行PB"]):
            files.append(path)
    return files


def main():
    OUT_DIR.mkdir(parents=True, exist_ok=True)
    df = pd.read_excel(SOURCE, sheet_name="综合底表", header=[0, 1], nrows=0)
    all_fields = [(str(g), str(f)) for g, f in df.columns if not str(f).startswith("Unnamed")]
    used_sources = set(FIELD_MAP.values())
    derived = set(DERIVED_METRICS)

    rows = []
    for group, field in all_fields:
        status = "已接入" if (group, field) in used_sources else "未接入"
        rows.append({
            "source_group": group,
            "source_field": field,
            "status": status,
            "priority": "-" if status == "已接入" else priority_for(group, field),
            "recommendation": "当前应用和治理字典已使用" if status == "已接入" else recommendation_for(group, field),
        })
    coverage = pd.DataFrame(rows)
    coverage.to_csv(OUT_DIR / "field_coverage_matrix.csv", index=False, encoding="utf-8-sig")
    (OUT_DIR / "field_coverage_matrix.json").write_text(
        json.dumps(coverage.to_dict(orient="records"), ensure_ascii=False, indent=2),
        encoding="utf-8",
    )

    summary = coverage.groupby(["status"]).size().to_dict()
    unconnected = coverage[coverage["status"] == "未接入"]
    by_priority = unconnected.groupby("priority").size().to_dict()
    by_group = coverage.groupby(["source_group", "status"]).size().unstack(fill_value=0)

    structured_files = list_structured_sources()
    source_rows = []
    for path in structured_files:
        source_rows.append({
            "path": str(path.relative_to(ROOT)),
            "kind": path.suffix.lower().lstrip("."),
            "suggested_use": infer_source_use(path.name),
        })
    pd.DataFrame(source_rows).to_csv(OUT_DIR / "additional_data_sources.csv", index=False, encoding="utf-8-sig")

    high = unconnected[unconnected["priority"] == "高"]
    medium_groups = (
        unconnected[unconnected["priority"] == "中"]
        .groupby(["source_group", "recommendation"])
        .size()
        .reset_index(name="field_count")
        .sort_values(["field_count", "source_group"], ascending=[False, True])
    )

    report = [
        "# 字段覆盖与可接入数据评估",
        "",
        f"- 综合底表字段总数：{len(all_fields)}",
        f"- 当前应用直接接入源字段：{summary.get('已接入', 0)}",
        f"- 当前应用派生指标：{len(derived)}",
        f"- 尚未接入源字段：{summary.get('未接入', 0)}",
        f"- 未接入字段中高优先级：{by_priority.get('高', 0)}",
        f"- 未接入字段中中优先级：{by_priority.get('中', 0)}",
        "",
        "## 结论",
        "",
        "当前应用已经覆盖董办对标分析的主干字段：盈利、息差、风险、资本、估值和基础存贷结构已经可以支撑第一版报告。但综合底表还有大量专项字段没有进入应用，尤其是零售分产品、公司贷款分行业、金融投资、三阶段资产、流动性和现金流。这些字段非常适合做成第二层“专项展开”能力，而不是全部塞进首屏总览。",
        "",
        "## 建议优先接入字段",
        "",
        "| 字段组 | 字段 | 建议用途 |",
        "| --- | --- | --- |",
    ]
    for _, item in high.iterrows():
        report.append(f"| {item['source_group']} | {item['source_field']} | {item['recommendation']} |")

    report.extend([
        "",
        "## 中优先级字段组",
        "",
        "| 字段组 | 可接入字段数 | 建议用途 |",
        "| --- | ---: | --- |",
    ])
    for _, item in medium_groups.iterrows():
        report.append(f"| {item['source_group']} | {item['field_count']} | {item['recommendation']} |")

    report.extend([
        "",
        "## 按字段组覆盖情况",
        "",
        "| 字段组 | 已接入 | 未接入 |",
        "| --- | ---: | ---: |",
    ])
    for group, item in by_group.sort_index().iterrows():
        report.append(f"| {group} | {int(item.get('已接入', 0))} | {int(item.get('未接入', 0))} |")

    report.extend([
        "",
        "## 更新版数据目录中可利用的补充数据",
        "",
        "以下数据可用于增强专题分析，建议优先接入 structured 目录和已命名专项表，避免从图表中间产物反向取数。",
        "",
        "| 数据文件 | 建议用途 |",
        "| --- | --- |",
    ])
    for row in source_rows[:80]:
        report.append(f"| `{row['path']}` | {row['suggested_use']} |")
    if len(source_rows) > 80:
        report.append(f"| 其余 {len(source_rows) - 80} 个文件 | 多为图表重跑中间产物，建议按专题逐步筛选 |")

    report.extend([
        "",
        "## 建议落地顺序",
        "",
        "1. 第一批：接入真实核心非息、高波动收入、NIM_Gap、真实存贷利差、隐性不良暴露率、资本充足余量、估算RWA、PB年中、EPS。",
        "2. 第二批：接入零售分产品占比和分产品不良率，形成零售风险专题页。",
        "3. 第三批：接入公司贷款分行业占比和行业不良率，形成行业风险暴露专题页。",
        "4. 第四批：接入金融投资分布和三阶段资产，形成投资资产和会计阶段迁徙专题页。",
        "5. 第五批：接入流动性、现金流和同业往来，形成流动性与资产负债配置补充页。",
    ])
    REPORT.write_text("\n".join(report) + "\n", encoding="utf-8")
    print(f"Wrote {REPORT}")
    print(f"Fields: {len(all_fields)}, used: {summary.get('已接入', 0)}, unused: {summary.get('未接入', 0)}")
    print(f"High priority unused: {by_priority.get('高', 0)}, medium: {by_priority.get('中', 0)}")


def infer_source_use(name):
    if "PB" in name:
        return "估值、市净率和资本市场验证"
    if "个人贷款" in name or "零售" in name:
        return "零售分产品结构和零售风险专题"
    if "公司贷款分行业" in name:
        return "对公行业集中度和行业不良专题"
    if "五级分类" in name:
        return "风险分类、关注类和不良迁徙专题"
    if "逾期" in name:
        return "逾期结构、偏离度和风险确认专题"
    if "金融资产三阶段" in name:
        return "三阶段资产迁徙和预期信用损失专题"
    if "金融投资" in name:
        return "投资资产配置和波动收入专题"
    if "存贷结构" in name:
        return "存贷款结构和定期化专题"
    if "流动性" in name:
        return "流动性和集中度风险专题"
    if "利率风险" in name:
        return "资产负债重定价和利率风险专题"
    if "银行财务数据" in name:
        return "基础财务数据补充或交叉校验"
    if "专项数据" in name:
        return "专项指标补充"
    return "待人工确认用途"


if __name__ == "__main__":
    main()
