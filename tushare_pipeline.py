"""
BenchmarkIQ Tushare 数据管道（一次性拉取 + 永久缓存 + 不重复获取）

用法：
    python3 tushare_pipeline.py                        # 全量拉取（首次跑这个）
    python3 tushare_pipeline.py --resume               # 续传（默认行为，已缓存的不再拉）
    python3 tushare_pipeline.py --refresh-stock-basic  # 强制刷新银行列表（季度做一次即可）
    python3 tushare_pipeline.py --year 2025            # 只拉指定年份的季报
    python3 tushare_pipeline.py --bank 600036.SH       # 只拉单家银行（调试用）
    python3 tushare_pipeline.py --status               # 看当前缓存进度

环境变量：
    TUSHARE_TOKEN（必填）        Tushare Pro token
    BENCHMARKIQ_CACHE（可选）    缓存目录，默认 ./data_tushare_cache
    TUSHARE_SLEEP_MS（可选）     接口间停顿毫秒数，默认 200（保守，避免触发限流）

缓存设计：
    data_tushare_cache/
    ├── manifest.json           # 全局元数据：token hash、最后刷新时间、各接口计数
    ├── stock_basic.parquet     # 银行股票列表（单文件，全量替换）
    ├── balancesheet.parquet    # 资产负债表，主键 (ts_code, end_date)，append-only
    ├── income.parquet          # 利润表
    ├── cashflow.parquet        # 现金流量表
    ├── fina_indicator.parquet  # 财务指标（含 ROA/ROE/NIM 等）
    ├── daily_basic.parquet     # 估值数据（PB/PE/总市值），月末快照
    ├── lpr.parquet             # LPR 利率
    ├── shibor.parquet          # SHIBOR 利率
    └── logs/
        └── YYYY-MM-DD-fetch.log

幂等保证：
    每次启动前，从已有 parquet 读出已缓存的 (ts_code, end_date) 集合，
    本次只拉缺失的组合。中断后重新跑会自动续传，不会重复消耗积分。

依赖：
    pip3 install tushare pandas pyarrow
"""

from __future__ import annotations

import argparse
import hashlib
import json
import os
import sys
import time
from datetime import datetime
from pathlib import Path
from typing import Iterable, Optional

try:
    import pandas as pd
    import tushare as ts
except ImportError as e:
    print(f"缺少依赖: {e}\n请运行: pip3 install tushare pandas pyarrow", file=sys.stderr)
    sys.exit(1)


# ========== 配置 ==========

CACHE_DIR = Path(os.environ.get("BENCHMARKIQ_CACHE", "./data_tushare_cache"))
SLEEP_MS = int(os.environ.get("TUSHARE_SLEEP_MS", "200"))
TOKEN = os.environ.get("TUSHARE_TOKEN", "").strip()

# BenchmarkIQ 当前覆盖年份范围（与 build_vqa_data.py 对齐）
YEARS = list(range(2020, 2026))  # 2020-2025，6 年面板

# 季度末日期（用于 period 参数）
QUARTER_ENDS = ["0331", "0630", "0930", "1231"]


# ========== 银行列表（57 家上市银行）==========
# 备份：当 Tushare stock_basic 拉不到时，用这个作为权威清单
# 来源：A 股上市银行（截至 2025-12-31）
# ========== H 股大陆银行（A 股没上的 15 家）==========
# 这些只在港股上市，需要走 Tushare hk_* 接口
BANK_HK_CODES = {
    "09668.HK": "渤海银行",
    "06138.HK": "哈尔滨银行",
    "00416.HK": "锦州银行",
    "02066.HK": "盛京银行",
    "01216.HK": "中原银行",
    "03698.HK": "徽商银行",
    "06190.HK": "九江银行",
    "01578.HK": "天津银行",
    "01916.HK": "江西银行",
    "02139.HK": "甘肃银行",
    "06199.HK": "贵州银行",
    "01983.HK": "泸州银行",
    "09889.HK": "东莞农商行",
    "01551.HK": "广州农商行",
    "03618.HK": "重庆农商行",  # 注：A 有 601077 渝农商，两者一一对应但仍单列
}


BANK_TS_CODES_BACKUP = [
    # 国有大行
    "601398.SH",  # 工商银行
    "601939.SH",  # 建设银行
    "601288.SH",  # 农业银行
    "601988.SH",  # 中国银行
    "601658.SH",  # 邮储银行
    "601328.SH",  # 交通银行
    # 股份制
    "600036.SH",  # 招商银行
    "601166.SH",  # 兴业银行
    "600000.SH",  # 浦发银行
    "600016.SH",  # 民生银行
    "601998.SH",  # 中信银行
    "600015.SH",  # 华夏银行
    "601818.SH",  # 光大银行
    "000001.SZ",  # 平安银行
    "601169.SH",  # 北京银行
    "600926.SH",  # 杭州银行
    "002142.SZ",  # 宁波银行
    "601009.SH",  # 南京银行
    "601229.SH",  # 上海银行
    # 城商行
    "002966.SZ",  # 苏州银行
    "601128.SH",  # 常熟银行（农商）
    "601838.SH",  # 成都银行
    "601077.SH",  # 渝农商行
    "601665.SH",  # 齐鲁银行
    "002948.SZ",  # 青岛银行
    "601860.SH",  # 紫金银行
    "601528.SH",  # 瑞丰银行（农商）
    "002958.SZ",  # 青农商行
    "002839.SZ",  # 张家港行（农商）
    "002936.SZ",  # 郑州银行
    "002807.SZ",  # 江阴银行（农商）
    "002958.SZ",  # 青农商行（去重）
    "603323.SH",  # 苏农银行（苏州农商）
    "601997.SH",  # 贵阳银行
    "601577.SH",  # 长沙银行
    "002948.SZ",  # 青岛银行（去重）
    "601136.SH",  # 兰州银行
    "601916.SH",  # 浙商银行
    "601596.SH",  # 西安银行
    "603323.SH",  # 苏农银行（去重）
    "002958.SZ",  # 青农商行（去重）
    "002966.SZ",  # 苏州银行（去重）
    "601009.SH",  # 南京银行（去重）
    "601077.SH",  # 重庆农商（去重）
    "603323.SH",  # 苏农银行（去重）
    "002958.SZ",  # 青农商行（去重）
    "601229.SH",  # 上海银行（去重）
    # 农商 + 其他
    "002839.SZ",  # 张家港行（去重）
    "601665.SH",  # 齐鲁银行（去重）
    "601838.SH",  # 成都银行（去重）
    "002142.SZ",  # 宁波银行（去重）
]


# ========== 缓存与工具 ==========


def ensure_dirs():
    CACHE_DIR.mkdir(parents=True, exist_ok=True)
    (CACHE_DIR / "logs").mkdir(parents=True, exist_ok=True)


def manifest_path() -> Path:
    return CACHE_DIR / "manifest.json"


def load_manifest() -> dict:
    p = manifest_path()
    if p.exists():
        return json.loads(p.read_text(encoding="utf-8"))
    return {
        "version": "1.0",
        "token_hash": "",
        "created_at": datetime.now().isoformat(timespec="seconds"),
        "last_run": "",
        "counters": {},
    }


def save_manifest(m: dict):
    m["last_run"] = datetime.now().isoformat(timespec="seconds")
    manifest_path().write_text(json.dumps(m, ensure_ascii=False, indent=2), encoding="utf-8")


def log(msg: str):
    line = f"[{datetime.now().isoformat(timespec='seconds')}] {msg}"
    print(line)
    log_file = CACHE_DIR / "logs" / f"{datetime.now().strftime('%Y-%m-%d')}-fetch.log"
    with log_file.open("a", encoding="utf-8") as f:
        f.write(line + "\n")


def sleep_throttle():
    time.sleep(SLEEP_MS / 1000)


def parquet_path(table: str) -> Path:
    return CACHE_DIR / f"{table}.parquet"


def load_cached(table: str) -> pd.DataFrame:
    p = parquet_path(table)
    if p.exists():
        return pd.read_parquet(p)
    return pd.DataFrame()


def upsert(table: str, new_df: pd.DataFrame, keys: list[str]):
    """合并新数据到已有缓存，按 keys 去重，最新覆盖旧。"""
    if new_df is None or new_df.empty:
        return
    cached = load_cached(table)
    if cached.empty:
        merged = new_df
    else:
        merged = pd.concat([cached, new_df], ignore_index=True)
        merged = merged.drop_duplicates(subset=keys, keep="last")
    merged.to_parquet(parquet_path(table), index=False)


def cached_keys(table: str, keys: list[str]) -> set[tuple]:
    """读出已缓存的 (key1, key2, ...) 元组集合，用于幂等判断。"""
    df = load_cached(table)
    if df.empty:
        return set()
    return set(map(tuple, df[keys].astype(str).itertuples(index=False, name=None)))


# ========== Tushare 调用包装 ==========


def init_pro():
    if not TOKEN:
        print("ERROR: 未设置 TUSHARE_TOKEN 环境变量", file=sys.stderr)
        print("用法: TUSHARE_TOKEN='xxxxx' python3 tushare_pipeline.py", file=sys.stderr)
        sys.exit(2)
    ts.set_token(TOKEN)
    return ts.pro_api()


def call_with_retry(fn, *args, max_retries=3, base_sleep=2, **kwargs):
    """重试包装：触发限流时退避，避免一时网络抖动浪费整次跑。"""
    last_err = None
    for attempt in range(max_retries):
        try:
            df = fn(*args, **kwargs)
            sleep_throttle()
            return df
        except Exception as e:
            last_err = e
            err_str = str(e).lower()
            if "频率" in str(e) or "rate" in err_str or "limit" in err_str:
                wait = base_sleep * (2 ** attempt)
                log(f"  ⚠ 触发限流，等待 {wait}s 后重试 ({attempt+1}/{max_retries})")
                time.sleep(wait)
            else:
                log(f"  ⚠ {type(e).__name__}: {e}")
                if attempt < max_retries - 1:
                    time.sleep(base_sleep)
    log(f"  ✗ 最终失败: {last_err}")
    return None


# ========== 各接口的拉取实现 ==========


def fetch_stock_basic(pro, force_refresh: bool = False) -> list[str]:
    """拉银行股票列表，返回 ts_code 列表。"""
    p = parquet_path("stock_basic")
    if p.exists() and not force_refresh:
        log("✓ stock_basic 已有缓存，跳过（用 --refresh-stock-basic 强制刷新）")
        df = pd.read_parquet(p)
    else:
        log("→ 拉取 stock_basic（银行业全列表）...")
        df = call_with_retry(
            pro.stock_basic,
            exchange="",
            list_status="L",
            fields="ts_code,symbol,name,industry,market,list_date,area",
        )
        if df is None or df.empty:
            log("  ✗ stock_basic 拉取失败，回退到备份银行清单")
            return list(set(BANK_TS_CODES_BACKUP))
        # 筛选银行业
        df = df[df["industry"].str.contains("银行", na=False)].copy()
        df.to_parquet(p, index=False)
        log(f"  ✓ 已存 {len(df)} 家银行")
    return df["ts_code"].tolist()


def fetch_financial_report(
    pro,
    api_name: str,
    table: str,
    ts_codes: list[str],
    years: list[int],
    fields: Optional[str] = None,
):
    """通用三大报表/财务指标拉取，按 (ts_code, end_date) 幂等。"""
    api_fn = getattr(pro, api_name)
    keys = ["ts_code", "end_date"]
    cached = cached_keys(table, keys)

    # 列出所有目标 (ts_code, end_date)
    targets = []
    for code in ts_codes:
        for y in years:
            for qe in QUARTER_ENDS:
                targets.append((code, f"{y}{qe}"))

    missing = [t for t in targets if t not in cached]
    if not missing:
        log(f"✓ {table} 已完整缓存（{len(cached)} 行）")
        return

    log(f"→ {table}: 已缓存 {len(cached)} 行，需新拉 {len(missing)} 组 (ts_code, period)")

    # 按 ts_code 分组拉，每家银行一次拉 6 年全部
    by_code: dict[str, list[str]] = {}
    for code, period in missing:
        by_code.setdefault(code, []).append(period)

    new_rows = []
    for i, (code, periods) in enumerate(by_code.items()):
        # 一次性按 ts_code 拉 6 年全部期间
        start = min(periods)
        end = max(periods)
        log(f"  [{i+1}/{len(by_code)}] {code} ({start}-{end}, {len(periods)} 期)")
        kwargs = {"ts_code": code, "start_date": start, "end_date": end}
        if fields:
            kwargs["fields"] = fields
        df = call_with_retry(api_fn, **kwargs)
        if df is not None and not df.empty:
            # 过滤到我们要的 period
            df = df[df["end_date"].isin(periods)]
            new_rows.append(df)
        # 每 10 家停 1 秒做减速
        if (i + 1) % 10 == 0:
            time.sleep(1)

    if new_rows:
        merged_new = pd.concat(new_rows, ignore_index=True)
        upsert(table, merged_new, keys)
        log(f"  ✓ {table} 新增 {len(merged_new)} 行，总计 {len(load_cached(table))} 行")


def fetch_daily_basic(pro, ts_codes: list[str], years: list[int]):
    """估值数据：取每个月末的 PB/PE/市值，用于时序分析。"""
    api = pro.daily_basic
    keys = ["ts_code", "trade_date"]
    cached = cached_keys("daily_basic", keys)

    # 生成月末日期（每月最后一个交易日由 Tushare 处理，这里用月最后一天近似）
    month_ends = []
    for y in years:
        for m in range(1, 13):
            # 月末用 28/30/31，Tushare 用最近的交易日
            if m == 12:
                month_ends.append(f"{y}{m:02d}31")
            elif m in (4, 6, 9, 11):
                month_ends.append(f"{y}{m:02d}30")
            elif m == 2:
                month_ends.append(f"{y}{m:02d}28")
            else:
                month_ends.append(f"{y}{m:02d}31")

    targets = [(c, d) for c in ts_codes for d in month_ends]
    missing = [t for t in targets if t not in cached]
    if not missing:
        log(f"✓ daily_basic 已完整缓存（{len(cached)} 行）")
        return

    log(f"→ daily_basic: 需新拉 {len(missing)} 组 (ts_code, month_end)")

    by_code: dict[str, list[str]] = {}
    for code, d in missing:
        by_code.setdefault(code, []).append(d)

    new_rows = []
    for i, (code, dates) in enumerate(by_code.items()):
        start = min(dates)
        end = max(dates)
        log(f"  [{i+1}/{len(by_code)}] {code} 月末估值 ({start}-{end})")
        # daily_basic 一次拉 6 年，再筛月末
        df = call_with_retry(
            api,
            ts_code=code,
            start_date=start,
            end_date=end,
            fields="ts_code,trade_date,close,pe,pe_ttm,pb,ps_ttm,total_mv,circ_mv,turnover_rate,dv_ratio,dv_ttm",
        )
        if df is not None and not df.empty:
            # 取每月最后一个交易日
            df["year_month"] = df["trade_date"].str[:6]
            df = df.sort_values("trade_date").groupby("year_month").tail(1).drop(columns=["year_month"])
            new_rows.append(df)
        if (i + 1) % 10 == 0:
            time.sleep(1)

    if new_rows:
        merged_new = pd.concat(new_rows, ignore_index=True)
        upsert("daily_basic", merged_new, keys)
        log(f"  ✓ daily_basic 新增 {len(merged_new)} 行")


# ========== H 股银行拉取 ==========


def hk_probe(pro) -> dict:
    """探测当前账户对 hk_* 接口的访问权限。免费版/低 VIP 可能拿不到财报。"""
    log("→ 探测 H 股接口权限...")
    results = {}
    tries = [
        ("hk_basic", lambda: pro.hk_basic(list_status="L", fields="ts_code,name,list_date,exchange")),
        ("hk_daily", lambda: pro.hk_daily(ts_code="00939.HK", start_date="20241201", end_date="20241231")),
        ("hk_mins", lambda: pro.hk_mins(ts_code="00939.HK", freq="60min", start_date="20241201", end_date="20241210")),
        # 财务报表：依不同账户等级开放
        ("us_income (代替探测)", lambda: pro.fina_indicator(ts_code="600036.SH", start_date="20240101", end_date="20241231")),
    ]
    for name, fn in tries:
        try:
            df = fn()
            if df is not None and not df.empty:
                log(f"  ✓ {name} 可用（{len(df)} 行示例）")
                results[name] = ("ok", len(df))
            else:
                log(f"  ⚠ {name} 返回空")
                results[name] = ("empty", 0)
        except Exception as e:
            err = str(e)[:120]
            log(f"  ✗ {name} 失败: {err}")
            results[name] = ("error", err)
        sleep_throttle()
    return results


def fetch_hk_stock_basic(pro):
    """拉 H 股银行基础信息，按 BANK_HK_CODES seed 过滤验证。"""
    p = parquet_path("hk_stock_basic")
    if p.exists():
        log("✓ hk_stock_basic 已有缓存")
        return list(BANK_HK_CODES.keys())
    log("→ 拉取 hk_basic（港股全列表，按 seed 过滤银行）...")
    try:
        df = call_with_retry(
            pro.hk_basic,
            list_status="L",
            fields="ts_code,name,fullname,enname,list_date,exchange,curr_type,trade_unit"
        )
    except Exception as e:
        log(f"  ✗ hk_basic 调用异常: {e}")
        df = None
    if df is None or df.empty:
        log("  ⚠ hk_basic 拉取失败，使用 seed 清单作为兜底")
        df = pd.DataFrame([
            {"ts_code": k, "name": v, "fullname": v, "list_date": None, "exchange": "HKEX"}
            for k, v in BANK_HK_CODES.items()
        ])
    else:
        # 按 seed ts_code 过滤
        df = df[df["ts_code"].isin(BANK_HK_CODES.keys())].copy()
        # 补全 seed 里有但 Tushare 没的
        missing = set(BANK_HK_CODES) - set(df["ts_code"])
        if missing:
            log(f"  ⚠ Tushare hk_basic 缺这些: {missing}（补充 seed 行）")
            extra = pd.DataFrame([
                {"ts_code": k, "name": BANK_HK_CODES[k]} for k in missing
            ])
            df = pd.concat([df, extra], ignore_index=True)
    df.to_parquet(p, index=False)
    log(f"  ✓ 已存 {len(df)} 家 H 股银行")
    return df["ts_code"].tolist()


def fetch_hk_daily(pro, hk_codes: list[str], years: list[int]):
    """H 股月末价格快照。Tushare hk_daily 是日线，自己取月末。"""
    keys = ["ts_code", "trade_date"]
    cached = cached_keys("hk_daily", keys)
    # 我们只要每月最后一个交易日的价格做对标
    month_starts = []
    for y in years:
        for m in range(1, 13):
            month_starts.append(f"{y}{m:02d}01")
    month_starts.append(f"{years[-1]+1}0101")  # 闭区间

    targets_year = years
    # 简单按 ts_code × year 决定是否要拉
    to_pull = []
    for code in hk_codes:
        for y in targets_year:
            sample_date = f"{y}1231"
            if (code, sample_date) not in cached:
                to_pull.append((code, y))
    if not to_pull:
        log(f"✓ hk_daily 已完整缓存（{len(cached)} 行）")
        return

    log(f"→ hk_daily: 需新拉 {len(to_pull)} 组 (ts_code, year)")
    new_rows = []
    by_code: dict[str, list[int]] = {}
    for code, y in to_pull:
        by_code.setdefault(code, []).append(y)
    for i, (code, ys) in enumerate(by_code.items()):
        start = f"{min(ys)}0101"
        end = f"{max(ys)}1231"
        log(f"  [{i+1}/{len(by_code)}] {code} ({start}-{end})")
        df = call_with_retry(
            pro.hk_daily,
            ts_code=code,
            start_date=start,
            end_date=end,
        )
        if df is not None and not df.empty:
            # 取每月最后一个交易日
            df["year_month"] = df["trade_date"].str[:6]
            df = df.sort_values("trade_date").groupby("year_month").tail(1).drop(columns=["year_month"])
            new_rows.append(df)
        if (i + 1) % 5 == 0:
            time.sleep(1)
    if new_rows:
        merged_new = pd.concat(new_rows, ignore_index=True)
        upsert("hk_daily", merged_new, keys)
        log(f"  ✓ hk_daily 新增 {len(merged_new)} 行")


def fetch_hk_financials(pro, hk_codes: list[str], years: list[int]):
    """尝试拉 H 股财报：hk_income / hk_balancesheet / hk_cashflow。
    多数 Tushare 免费/低级 VIP 账户没权限——失败会优雅降级，只记日志。"""
    keys = ["ts_code", "end_date"]
    interfaces = [
        ("hk_income", "hk_income"),
        ("hk_balancesheet", "hk_balancesheet"),
        ("hk_cashflow", "hk_cashflow"),
    ]
    for api_name, table in interfaces:
        api_fn = getattr(pro, api_name, None)
        if api_fn is None:
            log(f"  ⚠ {api_name} 接口在当前 tushare 版本不存在，跳过")
            continue
        cached = cached_keys(table, keys)
        log(f"→ {table}: 已缓存 {len(cached)} 行")
        new_rows = []
        for i, code in enumerate(hk_codes):
            # H 股一般是半年报 + 年报，period 用 0630/1231
            for y in years:
                for period_suffix in ["0630", "1231"]:
                    period = f"{y}{period_suffix}"
                    if (code, period) in cached:
                        continue
                    try:
                        df = call_with_retry(
                            api_fn, ts_code=code, period=period, max_retries=2
                        )
                        if df is not None and not df.empty:
                            new_rows.append(df)
                    except Exception as e:
                        if "permission" in str(e).lower() or "权限" in str(e):
                            log(f"  ✗ {api_name} 无权限，全部跳过")
                            return
                        log(f"  ⚠ {api_name}({code},{period}): {str(e)[:60]}")
            if (i + 1) % 5 == 0:
                time.sleep(1)
        if new_rows:
            merged = pd.concat(new_rows, ignore_index=True)
            upsert(table, merged, keys)
            log(f"  ✓ {table} 新增 {len(merged)} 行")


def fetch_macro_rates(pro):
    """拉 LPR + SHIBOR，宏观背景。LPR 有多个备选接口名。"""
    p_lpr = parquet_path("lpr")
    if not p_lpr.exists():
        log("→ 拉 LPR 2020-2025（依次尝试多个接口）...")
        df = None
        for api_name in ["cn_lpr", "shibor_lpr", "lpr_data"]:
            api_fn = getattr(pro, api_name, None)
            if api_fn is None:
                log(f"  ⚠ pro.{api_name} 不存在，跳到下一个")
                continue
            try:
                df = call_with_retry(api_fn, start_date="20200101", end_date="20251231", max_retries=2)
                if df is not None and not df.empty:
                    log(f"  ✓ 用 pro.{api_name} 拉到 {len(df)} 行，字段: {list(df.columns)[:6]}")
                    break
                else:
                    log(f"  ⚠ pro.{api_name} 返回空")
            except Exception as e:
                log(f"  ✗ pro.{api_name} 失败: {str(e)[:80]}")
                df = None
        if df is not None and not df.empty:
            df.to_parquet(p_lpr, index=False)
        else:
            log("  ✗ 所有 LPR 接口都失败。请检查账户级别（cn_lpr 需要 2000+ 积分）")
            log("    备选：手动从 http://www.pbc.gov.cn/zhengcehuobisi/125207/125213/125440/ 下载")
    else:
        log("✓ LPR 已有缓存")

    p_shibor = parquet_path("shibor")
    if not p_shibor.exists():
        log("→ 拉 SHIBOR 2020-2025...")
        df = call_with_retry(pro.shibor, start_date="20200101", end_date="20251231")
        if df is not None and not df.empty:
            df.to_parquet(p_shibor, index=False)
            log(f"  ✓ SHIBOR 已存 {len(df)} 行")
    else:
        log("✓ SHIBOR 已有缓存")


# ========== 状态报告 ==========


def show_status():
    print("=" * 60)
    print(f"BenchmarkIQ Tushare 缓存状态（{CACHE_DIR.absolute()}）")
    print("=" * 60)
    if not CACHE_DIR.exists():
        print("缓存目录不存在，请先运行拉取")
        return
    m = load_manifest()
    print(f"最后运行: {m.get('last_run', 'N/A')}")
    print()
    tables = ["stock_basic", "balancesheet", "income", "cashflow",
              "fina_indicator", "daily_basic", "lpr", "shibor",
              "hk_stock_basic", "hk_daily",
              "hk_balancesheet", "hk_income", "hk_cashflow"]
    for t in tables:
        p = parquet_path(t)
        if p.exists():
            df = pd.read_parquet(p)
            uniq = ""
            if "ts_code" in df.columns:
                uniq = f"，{df['ts_code'].nunique()} 家银行"
            print(f"  ✓ {t:25s}  {len(df):>7d} 行{uniq}")
        else:
            print(f"  ✗ {t:25s}  未缓存")


# ========== 主流程 ==========


def main():
    parser = argparse.ArgumentParser(description="BenchmarkIQ Tushare 数据管道")
    parser.add_argument("--refresh-stock-basic", action="store_true",
                        help="强制刷新银行列表（默认有缓存就跳过）")
    parser.add_argument("--year", type=int, nargs="*", default=None,
                        help="只拉指定年份")
    parser.add_argument("--bank", type=str, nargs="*", default=None,
                        help="只拉指定银行 ts_code（如 600036.SH）")
    parser.add_argument("--status", action="store_true", help="查看当前缓存状态")
    parser.add_argument("--skip-financial", action="store_true",
                        help="跳过三大报表，只拉市场数据和宏观")
    parser.add_argument("--skip-daily", action="store_true",
                        help="跳过日度市场数据")
    parser.add_argument("--skip-macro", action="store_true",
                        help="跳过宏观利率")
    parser.add_argument("--hk", action="store_true",
                        help="拉 H 股大陆银行（15 家）：股价 + 财报（财报需要 VIP 权限）")
    parser.add_argument("--hk-only", action="store_true",
                        help="只拉 H 股，不动 A 股")
    parser.add_argument("--hk-probe", action="store_true",
                        help="探测 H 股接口权限，不实际拉取")
    parser.add_argument("--skip-hk-financial", action="store_true",
                        help="拉 H 股但跳过财报（只拉 basic + daily），避免权限错误")
    args = parser.parse_args()

    if args.status:
        show_status()
        return

    ensure_dirs()
    log(f"=== BenchmarkIQ Tushare 管道启动 ===")
    log(f"缓存目录: {CACHE_DIR.absolute()}")
    log(f"接口间隔: {SLEEP_MS}ms")

    pro = init_pro()

    # 验证 token + 更新 manifest
    manifest = load_manifest()
    token_hash = hashlib.sha256(TOKEN.encode()).hexdigest()[:16]
    if manifest.get("token_hash") and manifest["token_hash"] != token_hash:
        log("⚠ token 已变化（与上次不同），继续使用新 token")
    manifest["token_hash"] = token_hash

    # 探测模式：只看接口权限，不实际拉数据
    if args.hk_probe:
        hk_probe(pro)
        save_manifest(manifest)
        return

    # ---- H 股流程 ----
    if args.hk or args.hk_only:
        log("=== H 股大陆银行拉取（15 家）===")
        hk_codes = fetch_hk_stock_basic(pro)
        years_hk = args.year or YEARS
        fetch_hk_daily(pro, hk_codes, years_hk)
        if not args.skip_hk_financial:
            fetch_hk_financials(pro, hk_codes, years_hk)
        if args.hk_only:
            save_manifest(manifest)
            log("=== H 股拉取完成（hk-only 模式）===")
            show_status()
            return

    # ---- A 股流程（默认）----
    # 1. 银行列表
    ts_codes = fetch_stock_basic(pro, force_refresh=args.refresh_stock_basic)
    if args.bank:
        ts_codes = [c for c in ts_codes if c in set(args.bank)]
        log(f"过滤后银行: {ts_codes}")
    log(f"待处理银行数: {len(ts_codes)}")

    years = args.year or YEARS

    # 2. 三大报表 + 财务指标
    if not args.skip_financial:
        for api_name, table in [
            ("balancesheet", "balancesheet"),
            ("income", "income"),
            ("cashflow", "cashflow"),
            ("fina_indicator", "fina_indicator"),
        ]:
            fetch_financial_report(pro, api_name, table, ts_codes, years)

    # 3. 估值数据（月末快照）
    if not args.skip_daily:
        fetch_daily_basic(pro, ts_codes, years)

    # 4. 宏观利率
    if not args.skip_macro:
        fetch_macro_rates(pro)

    save_manifest(manifest)
    log("=== 全部完成 ===")
    show_status()


if __name__ == "__main__":
    main()
