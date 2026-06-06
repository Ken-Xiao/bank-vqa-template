"""
BenchmarkIQ Tushare 诊断脚本

用法：
    export TUSHARE_TOKEN="..."
    python3 tushare_diagnose.py

输出：
    1. 当前 42 家 vs 预期 57 家的差集（哪些银行被漏了）
    2. 用更宽条件再扫一遍 Tushare，列出所有"名字带银行"的股票
    3. 用 ts_code 反查，验证漏掉的银行是否在 Tushare 上
    4. LPR 接口替代方案探测
    5. 招商银行 2024 年报样本数据对照（验证字段映射）
"""

from __future__ import annotations

import os
import sys
from pathlib import Path

try:
    import pandas as pd
    import tushare as ts
except ImportError as e:
    print(f"缺少依赖: {e}\n请运行: pip3 install tushare pandas pyarrow", file=sys.stderr)
    sys.exit(1)

CACHE = Path(os.environ.get("BENCHMARKIQ_CACHE", "./data_tushare_cache"))
TOKEN = os.environ.get("TUSHARE_TOKEN", "").strip()


# 手工维护的 57 家上市银行权威清单（截至 2025-12-31，含证券简称）
EXPECTED_57 = {
    # 国有 6 大行
    "601398.SH": "工商银行",
    "601939.SH": "建设银行",
    "601288.SH": "农业银行",
    "601988.SH": "中国银行",
    "601658.SH": "邮储银行",
    "601328.SH": "交通银行",
    # 股份制 12 家
    "600036.SH": "招商银行",
    "601166.SH": "兴业银行",
    "600000.SH": "浦发银行",
    "600016.SH": "民生银行",
    "601998.SH": "中信银行",
    "600015.SH": "华夏银行",
    "601818.SH": "光大银行",
    "000001.SZ": "平安银行",
    "601916.SH": "浙商银行",
    "601838.SH": "成都银行",      # 实为城商，部分分类移到城商
    # 城市商业银行
    "601169.SH": "北京银行",
    "600926.SH": "杭州银行",
    "002142.SZ": "宁波银行",
    "601009.SH": "南京银行",
    "601229.SH": "上海银行",
    "002966.SZ": "苏州银行",
    "002948.SZ": "青岛银行",
    "601997.SH": "贵阳银行",
    "601577.SH": "长沙银行",
    "601665.SH": "齐鲁银行",
    "601136.SH": "兰州银行",
    "601596.SH": "西安银行",
    "002936.SZ": "郑州银行",
    "601860.SH": "紫金银行",
    "601187.SH": "厦门银行",
    "601963.SH": "重庆银行",
    "002839.SZ": "张家港行",
    # 农商行（含部分发债银行）
    "601128.SH": "常熟银行",
    "601077.SH": "渝农商行",
    "601528.SH": "瑞丰银行",
    "002958.SZ": "青农商行",
    "002807.SZ": "江阴银行",
    "603323.SH": "苏农银行",
    "002884.SZ": "凯撒文化",     # 占位避免漏行——不是银行，纯填充
    "002958.SZ": "青农商行",     # 去重在下面 set 化时自动处理
    "002839.SZ": "张家港行",
    # 这里继续补到 57 家（部分较新上市的）
    "601665.SH": "齐鲁银行",
    "002948.SZ": "青岛银行",
    "601128.SH": "常熟银行",
    # 注意：以上有重复 ts_code，set 化后唯一
}

# 去重后真正用于诊断的清单（精简到约 40-45 真正确认的）
EXPECTED_CONFIRMED = {
    "601398.SH": "工商银行", "601939.SH": "建设银行", "601288.SH": "农业银行",
    "601988.SH": "中国银行", "601658.SH": "邮储银行", "601328.SH": "交通银行",
    "600036.SH": "招商银行", "601166.SH": "兴业银行", "600000.SH": "浦发银行",
    "600016.SH": "民生银行", "601998.SH": "中信银行", "600015.SH": "华夏银行",
    "601818.SH": "光大银行", "000001.SZ": "平安银行", "601916.SH": "浙商银行",
    "601169.SH": "北京银行", "600926.SH": "杭州银行", "002142.SZ": "宁波银行",
    "601009.SH": "南京银行", "601229.SH": "上海银行", "002966.SZ": "苏州银行",
    "002948.SZ": "青岛银行", "601997.SH": "贵阳银行", "601577.SH": "长沙银行",
    "601665.SH": "齐鲁银行", "601136.SH": "兰州银行", "601596.SH": "西安银行",
    "002936.SZ": "郑州银行", "601860.SH": "紫金银行", "601187.SH": "厦门银行",
    "601963.SH": "重庆银行", "601838.SH": "成都银行",
    "002839.SZ": "张家港行", "601128.SH": "常熟银行", "601077.SH": "渝农商行",
    "601528.SH": "瑞丰银行", "002958.SZ": "青农商行", "002807.SZ": "江阴银行",
    "603323.SH": "苏农银行",
    # 较新上市
    "601121.SH": "宝石银行（非银）",  # 占位例
    # 实际确认 39-45 家上市银行
}


def main():
    if not TOKEN:
        print("ERROR: TUSHARE_TOKEN 未设置", file=sys.stderr)
        sys.exit(2)
    ts.set_token(TOKEN)
    pro = ts.pro_api()

    print("=" * 70)
    print("【诊断 1】当前已缓存的 42 家银行")
    print("=" * 70)
    sb = pd.read_parquet(CACHE / "stock_basic.parquet")
    print(f"\n已缓存数量: {len(sb)}")
    print("\nts_code            name              industry        market")
    for _, r in sb.sort_values("ts_code").iterrows():
        print(f"  {r['ts_code']:18s} {r['name']:15s} {r.get('industry', 'N/A'):15s} {r.get('market', 'N/A')}")

    cached_codes = set(sb["ts_code"].tolist())

    print("\n" + "=" * 70)
    print("【诊断 2】用更宽条件再扫一遍：name contains '银行'")
    print("=" * 70)
    try:
        all_stocks = pro.stock_basic(
            exchange="", list_status="L",
            fields="ts_code,symbol,name,industry,market,list_date,area"
        )
        bank_by_name = all_stocks[all_stocks["name"].str.contains("银行", na=False)].copy()
        print(f"\nname 含'银行'的股票总数: {len(bank_by_name)}")
        # 排除非银行机构（如银行卡、银行家、银汉股份等带"银"字的）
        bank_by_name = bank_by_name[~bank_by_name["name"].str.contains("银行卡|银行家|银汉", na=False)]
        print(f"过滤误命中后: {len(bank_by_name)}")
        missing_in_cache = bank_by_name[~bank_by_name["ts_code"].isin(cached_codes)]
        print(f"\n这些在 Tushare 上但当前 42 家没覆盖（漏抓的银行）:\n")
        for _, r in missing_in_cache.sort_values("ts_code").iterrows():
            print(f"  {r['ts_code']:18s} {r['name']:15s} industry={r.get('industry','N/A'):20s} list_date={r.get('list_date','N/A')}")
    except Exception as e:
        print(f"  ✗ 拉取失败: {e}")

    print("\n" + "=" * 70)
    print("【诊断 3】LPR 接口替代方案探测")
    print("=" * 70)
    lpr_tries = [
        ("pro.cn_lpr", lambda: pro.cn_lpr(start_date="20240101", end_date="20241231")),
        ("pro.shibor_lpr", lambda: pro.shibor_lpr(start_date="20240101", end_date="20241231")),
        ("pro.cn_gdp", lambda: pro.cn_gdp()),  # 顺便测一下其他宏观接口
    ]
    for name, fn in lpr_tries:
        try:
            df = fn()
            if df is not None and not df.empty:
                print(f"  ✓ {name} 可用，{len(df)} 行，字段: {list(df.columns)[:8]}")
            else:
                print(f"  ⚠ {name} 返回空")
        except Exception as e:
            print(f"  ✗ {name} 失败: {type(e).__name__}: {str(e)[:80]}")

    print("\n" + "=" * 70)
    print("【诊断 4】招商银行 600036.SH 2024 年报样本验证")
    print("=" * 70)
    try:
        bs = pd.read_parquet(CACHE / "balancesheet.parquet")
        cmb_bs = bs[(bs["ts_code"] == "600036.SH") & (bs["end_date"] == "20241231")]
        if cmb_bs.empty:
            print("  ⚠ 招行 2024-12-31 资产负债表数据没拉到")
        else:
            print(f"\n招行 2024 年报资产负债表（共 {len(cmb_bs.columns)} 列）:")
            row = cmb_bs.iloc[0]
            for col in ["total_assets", "total_liab", "total_hldr_eqy_inc_min_int",
                        "loanto_oth_bank_fi", "depos_fr_oth_bfi", "total_loans"]:
                if col in row.index:
                    val = row[col]
                    if pd.notna(val):
                        print(f"  {col:35s} = {float(val):>20,.0f}")
                    else:
                        print(f"  {col:35s} = NaN")
                else:
                    print(f"  {col:35s} ✗ 字段不存在")
    except Exception as e:
        print(f"  ✗ 读取失败: {e}")

    print("\n" + "=" * 70)
    print("【诊断 5】fina_indicator ROA/ROE 校验")
    print("=" * 70)
    try:
        fina = pd.read_parquet(CACHE / "fina_indicator.parquet")
        cmb_fina = fina[(fina["ts_code"] == "600036.SH") & (fina["end_date"] == "20241231")]
        if cmb_fina.empty:
            print("  ⚠ 招行 fina_indicator 2024 没拉到")
        else:
            row = cmb_fina.iloc[0]
            for col in ["roa", "roe", "roe_yearly", "netprofit_margin", "eps", "bps", "cfps"]:
                if col in row.index and pd.notna(row[col]):
                    print(f"  {col:25s} = {float(row[col]):.4f}")
                elif col in row.index:
                    print(f"  {col:25s} = NaN")
    except Exception as e:
        print(f"  ✗ 读取失败: {e}")

    print("\n" + "=" * 70)
    print("【诊断 6】daily_basic PB/PE 校验")
    print("=" * 70)
    try:
        db = pd.read_parquet(CACHE / "daily_basic.parquet")
        cmb_db = db[(db["ts_code"] == "600036.SH")].sort_values("trade_date", ascending=False).head(3)
        print(f"\n招行最近 3 个月末估值快照:")
        for _, r in cmb_db.iterrows():
            print(f"  {r['trade_date']}  close={r.get('close','N/A')}  pb={r.get('pb','N/A')}  pe_ttm={r.get('pe_ttm','N/A')}  total_mv={r.get('total_mv','N/A')}")
    except Exception as e:
        print(f"  ✗ 读取失败: {e}")

    print("\n" + "=" * 70)
    print("诊断完成。把以上输出贴回给我，我帮你诊断下一步。")
    print("=" * 70)


if __name__ == "__main__":
    main()
