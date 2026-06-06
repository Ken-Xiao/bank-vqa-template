import json
import math
from pathlib import Path

import pandas as pd


ROOT = Path(__file__).resolve().parents[2]
SOURCE = ROOT / "数据/更新版数据/全行业银行综合分析2020-2025（含PB） (2).xlsx"
OUT = Path(__file__).resolve().parent / "data.js"


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


def col(group, name):
    return (group, name)


def pct_ratio(num, den):
    if num is None or den in (None, 0):
        return None
    return num / den * 100


df = pd.read_excel(SOURCE, sheet_name="综合底表", header=[0, 1])

fields = {
    "bank": col("基本信息", "银行简称"),
    "type": col("基本信息", "银行类型"),
    "year": col("基本信息", "年份"),
    "revenue": col("盈利概览(万元)", "营业收入"),
    "netInterestIncome": col("盈利概览(万元)", "净利息收入"),
    "feeIncome": col("盈利概览(万元)", "手续费净收入"),
    "revenueGrowth": col("盈利概览(万元)", "营业收入增速%"),
    "netProfit": col("盈利概览(万元)", "净利润"),
    "netProfitGrowth": col("盈利概览(万元)", "净利润增速%"),
    "ppop": col("盈利概览(万元)", "PPOP"),
    "ppopGrowth": col("盈利概览(万元)", "PPOP增速%"),
    "coreRevenue": col("盈利概览(万元)", "核心营收"),
    "coreRevenueGrowth": col("盈利概览(万元)", "核心营收增速%"),
    "roe": col("盈利指标", "ROE%"),
    "roa": col("盈利指标", "ROA%"),
    "nim": col("盈利指标", "NIM%"),
    "costIncomeRatio": col("盈利指标", "成本收入比%"),
    "nonInterestShare": col("盈利指标", "非息占比%"),
    "trueCoreNonInterest": col("盈利指标", "真实核心非息%"),
    "volatileIncomeShare": col("盈利指标", "高波动收入%"),
    "assets": col("资产负债(万元)", "资产总计"),
    "liabilities": col("资产负债(万元)", "负债合计"),
    "equity": col("资产负债(万元)", "股东权益"),
    "loans": col("资产负债(万元)", "贷款总额"),
    "deposits": col("资产负债(万元)", "存款总额"),
    "earningAssets": col("资产负债(万元)", "生息资产"),
    "interestLiabilities": col("资产负债(万元)", "计息负债"),
    "earningAssetYield": col("息差分析", "生息资产收益率%"),
    "interestLiabilityCost": col("息差分析", "计息负债成本率%"),
    "nimGapPoint": col("息差分析", "NIM_Gap百分点"),
    "realLoanDepositSpread": col("息差分析", "真实存贷利差"),
    "demandDepositShare": col("息差分析", "核心存款定期化%"),
    "npl": col("资产质量", "不良率%"),
    "provisionCoverage": col("资产质量", "拨备覆盖率%"),
    "overdueRatio": col("资产质量", "逾期率%"),
    "specialMentionRatio": col("资产质量", "关注率%"),
    "overdueNplDeviation": col("资产质量", "逾期-不良偏离度"),
    "hiddenNplExposure": col("资产质量", "隐性不良暴露率%"),
    "cet1": col("资本充足率", "核心一级充足%"),
    "cet1Buffer": col("资本充足率", "CET1余量bp"),
    "carBuffer": col("资本充足率", "资本充足余量bp"),
    "estimatedRwa": col("资本充足率", "估算RWA(万元)"),
    "rwaDensity": col("资本充足率", "RWA密度%"),
    "liquidityRatio": col("流动性指标", "流动性比率%"),
    "liquidityCoverageRatio": col("流动性指标", "流动性覆盖率%"),
    "corporateDeposit": col("存款结构(万元)", "公司存款"),
    "corporateTimeDeposit": col("存款结构(万元)", "公司定期"),
    "corporateDemandDeposit": col("存款结构(万元)", "公司活期"),
    "personalDeposit": col("存款结构(万元)", "个人存款"),
    "personalTimeDeposit": col("存款结构(万元)", "个人定期"),
    "personalDemandDeposit": col("存款结构(万元)", "个人活期"),
    "corporateLoanNpl": col("贷款结构(万元)", "公司贷款不良%"),
    "personalLoanNpl": col("贷款结构(万元)", "个人贷款不良%"),
    "billDiscountNpl": col("贷款结构(万元)", "票据贴现不良%"),
    "housingLoanShare": col("个人贷款分产品(万元/%)", "住房贷款占比%"),
    "consumerLoanShare": col("个人贷款分产品(万元/%)", "消费贷款占比%"),
    "businessLoanShare": col("个人贷款分产品(万元/%)", "经营贷款占比%"),
    "housingLoanNpl": col("个人贷款分产品(万元/%)", "住房贷款不良%"),
    "consumerLoanNpl": col("个人贷款分产品(万元/%)", "消费贷款不良%"),
    "businessLoanNpl": col("个人贷款分产品(万元/%)", "经营贷款不良%"),
    "bondInvestment": col("金融投资分布(万元)", "债券合计"),
    "fundInvestment": col("金融投资分布(万元)", "基金"),
    "trustWmInvestment": col("金融投资分布(万元)", "信托及理财"),
    "interestIncome": col("利润表详情(万元)", "利息收入"),
    "interestExpense": col("利润表详情(万元)", "利息支出"),
    "adminExpense": col("利润表详情(万元)", "管理费用"),
    "incomeTax": col("利润表详情(万元)", "所得税"),
    "operatingCashFlow": col("现金流量(万元)", "经营活动净额"),
    "basicEps": col("每股指标", "基本EPS(元)"),
    "pb": col("估值指标", "PB(年末)"),
    "pbMid": col("估值指标", "PB(年中)"),
}

records = []
for _, row in df.iterrows():
    rec = {}
    for key, src in fields.items():
        rec[key] = clean_num(row[src]) if src in df.columns else None
    if not rec["bank"] or not rec["year"]:
        continue
    rec["year"] = int(rec["year"])
    rec["region"] = REGION.get(rec["bank"], "全国")
    if rec["earningAssets"] is None and rec["nim"] not in (None, 0) and rec["netInterestIncome"] is not None:
        rec["earningAssets"] = clean_num(rec["netInterestIncome"] / (rec["nim"] / 100))
        rec["earningAssetsSource"] = "净利息收入/NIM反推"
    else:
        rec["earningAssetsSource"] = "底表披露" if rec["earningAssets"] is not None else "缺失"
    if rec["earningAssetYield"] is None:
        rec["earningAssetYield"] = clean_num(pct_ratio(rec["interestIncome"], rec["earningAssets"]))
        rec["earningAssetYieldSource"] = "利息收入/生息资产回算" if rec["earningAssetYield"] is not None else "缺失"
    else:
        rec["earningAssetYieldSource"] = "底表披露"
    if rec["interestLiabilityCost"] is None:
        rec["interestLiabilityCost"] = clean_num(pct_ratio(rec["interestExpense"], rec["interestLiabilities"]))
        rec["interestLiabilityCostSource"] = "利息支出/计息负债回算"
    else:
        rec["interestLiabilityCostSource"] = "底表披露"
    rec["feeAssetRatio"] = clean_num(pct_ratio(rec["feeIncome"], rec["assets"]))
    rec["netInterestRevenueShare"] = clean_num(pct_ratio(rec["netInterestIncome"], rec["revenue"]))
    rec["feeRevenueShare"] = clean_num(pct_ratio(rec["feeIncome"], rec["revenue"]))
    rec["coreRevenueShare"] = clean_num(pct_ratio(rec["coreRevenue"], rec["revenue"]))
    rec["loanAssetRatio"] = clean_num(pct_ratio(rec["loans"], rec["assets"]))
    rec["depositLiabilityRatio"] = clean_num(pct_ratio(rec["deposits"], rec["liabilities"]))
    rec["adminAssetRatio"] = clean_num(pct_ratio(rec["adminExpense"], rec["assets"]))
    rec["cashProfitRatio"] = clean_num(pct_ratio(rec["operatingCashFlow"], rec["netProfit"]))
    rec["bondAssetRatio"] = clean_num(pct_ratio(rec["bondInvestment"], rec["assets"]))
    rec["fundAssetRatio"] = clean_num(pct_ratio(rec["fundInvestment"], rec["assets"]))
    rec["trustWmAssetRatio"] = clean_num(pct_ratio(rec["trustWmInvestment"], rec["assets"]))
    rec["investmentAssetRatio"] = clean_num(pct_ratio(
        sum(v or 0 for v in (rec["bondInvestment"], rec["fundInvestment"], rec["trustWmInvestment"])),
        rec["assets"],
    ))
    rec["corporateDepositShare"] = clean_num(pct_ratio(rec["corporateDeposit"], rec["deposits"]))
    rec["personalDepositShare"] = clean_num(pct_ratio(rec["personalDeposit"], rec["deposits"]))
    rec["corporateDemandDepositShare"] = clean_num(pct_ratio(rec["corporateDemandDeposit"], rec["deposits"]))
    rec["personalDemandDepositShare"] = clean_num(pct_ratio(rec["personalDemandDeposit"], rec["deposits"]))
    time_deposits = (rec["corporateTimeDeposit"] or 0) + (rec["personalTimeDeposit"] or 0)
    rec["timeDepositShare"] = clean_num(pct_ratio(time_deposits, rec["deposits"]))
    retail_risk_values = [rec["housingLoanNpl"], rec["consumerLoanNpl"], rec["businessLoanNpl"]]
    rec["retailRiskMax"] = clean_num(max([v for v in retail_risk_values if v is not None], default=None))
    rec["retailRiskSpread"] = clean_num(max([v for v in retail_risk_values if v is not None], default=0) - min([v for v in retail_risk_values if v is not None], default=0)) if any(v is not None for v in retail_risk_values) else None
    rec["profitPpopGap"] = clean_num((rec["netProfitGrowth"] or 0) - (rec["ppopGrowth"] or 0)) if rec["netProfitGrowth"] is not None and rec["ppopGrowth"] is not None else None
    records.append(rec)

by_bank = {}
for rec in records:
    by_bank.setdefault(rec["bank"], []).append(rec)

for bank_records in by_bank.values():
    bank_records.sort(key=lambda r: r["year"])
    prev = None
    for rec in bank_records:
        if prev:
            ay0, ay1 = prev.get("earningAssetYield"), rec.get("earningAssetYield")
            lc0, lc1 = prev.get("interestLiabilityCost"), rec.get("interestLiabilityCost")
            if None not in (ay0, ay1, lc0, lc1):
                rec["earningAssetYieldChange"] = clean_num(ay1 - ay0)
                rec["interestLiabilityCostChange"] = clean_num(lc1 - lc0)
                rec["nimGapBp"] = clean_num(((ay1 - ay0) - (lc1 - lc0)) * 100)
                rec["nimGapPointComputed"] = clean_num((ay1 - ay0) - (lc1 - lc0))
                rec["nimGapSource"] = "生息资产收益率同比变化-计息负债成本率同比变化"
            else:
                rec["earningAssetYieldChange"] = clean_num(ay1 - ay0) if None not in (ay0, ay1) else None
                rec["interestLiabilityCostChange"] = clean_num(lc1 - lc0) if None not in (lc0, lc1) else None
                rec["nimGapBp"] = None
                rec["nimGapPointComputed"] = None
                rec["nimGapSource"] = "缺少生息资产收益率或计息负债成本率，未计算"
            for key in ("assets", "cet1", "provisionCoverage", "pb"):
                a, b = prev.get(key), rec.get(key)
                rec[f"{key}Change"] = clean_num(b - a) if None not in (a, b) else None
            if prev.get("assets") not in (None, 0) and rec.get("assets") is not None:
                rec["assetGrowth"] = clean_num((rec["assets"] / prev["assets"] - 1) * 100)
            else:
                rec["assetGrowth"] = None
            for key in ("estimatedRwa", "operatingCashFlow"):
                a, b = prev.get(key), rec.get(key)
                rec[f"{key}Change"] = clean_num(b - a) if None not in (a, b) else None
                rec[f"{key}Growth"] = clean_num((b / a - 1) * 100) if a not in (None, 0) and b is not None else None
            rec["rwaProfitGrowthGap"] = clean_num(rec["estimatedRwaGrowth"] - rec["netProfitGrowth"]) if rec.get("estimatedRwaGrowth") is not None and rec.get("netProfitGrowth") is not None else None
            rec["rwaAssetGrowthGap"] = clean_num(rec["estimatedRwaGrowth"] - rec["assetGrowth"]) if rec.get("estimatedRwaGrowth") is not None and rec.get("assetGrowth") is not None else None
        else:
            rec["nimGapBp"] = None
            rec["nimGapPointComputed"] = None
            rec["earningAssetYieldChange"] = None
            rec["interestLiabilityCostChange"] = None
            rec["nimGapSource"] = "首年无上一年数据，未计算"
            rec["assetGrowth"] = None
            rec["cet1Change"] = None
            rec["provisionCoverageChange"] = None
            rec["pbChange"] = None
            rec["estimatedRwaChange"] = None
            rec["estimatedRwaGrowth"] = None
            rec["operatingCashFlowChange"] = None
            rec["operatingCashFlowGrowth"] = None
            rec["rwaProfitGrowthGap"] = None
            rec["rwaAssetGrowthGap"] = None
        prev = rec

banks = []
for bank, bank_records in sorted(by_bank.items()):
    latest = max(bank_records, key=lambda r: r["year"])
    banks.append({
        "bank": bank,
        "type": latest["type"],
        "region": latest["region"],
    })

payload = {
    "source": str(SOURCE.name),
    "years": sorted({r["year"] for r in records}),
    "aliases": ALIASES,
    "banks": banks,
    "records": records,
}

OUT.write_text("window.VQA_DATA = " + json.dumps(payload, ensure_ascii=False, separators=(",", ":")) + ";\n", encoding="utf-8")
print(f"Wrote {OUT} with {len(records)} records and {len(banks)} banks")
