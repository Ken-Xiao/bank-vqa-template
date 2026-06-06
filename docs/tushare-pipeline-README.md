# Tushare 数据管道使用说明

## 一、如何把 MCP 加到 Cowork 配置（让 Claude 下次直接调）

打开 Cowork 的 MCP 配置文件（通常在 `~/Library/Application Support/Claude-3p/` 或 `~/.config/cowork/` 下），加上：

```json
{
  "mcpServers": {
    "tushareMcp": {
      "url": "https://api.tushare.pro/mcp/?token=6da92101b5160db32e014a7223087bf1558696036c39c0198a0d0070"
    }
  }
}
```

保存后**重启 Cowork**。下次对话里我就能用 `mcp__tushareMcp__*` 这一组工具直接调 Tushare 接口验证数据。

注意：你刚才贴的 token 已经记到本仓库的脚本里和这份说明里——如果会泄漏（如要把仓库公开），建议先在 Tushare 后台重置 token，然后从两处替换。

## 二、Python 管道：一次跑、永久缓存

我已经在 `tushare_pipeline.py` 写好了完整的数据管道，特点：

- **幂等**：跑过的 (银行, 期间) 不会重复拉，浪费积分 = 0
- **续传**：中断后再跑会从断点继续
- **限流友好**：每个 API 之间 200ms 间隔，每 10 家停 1 秒
- **重试**：触发限流会自动指数退避
- **本地落库**：所有数据存为 parquet（pandas 直接读，BenchmarkIQ 也能 import）

### 第一次跑（完整拉取约 1-2 小时）

```bash
cd /Users/jinkunxiao/Documents/业务/银行财报分析/outputs/vqa_template

# 安装依赖
pip3 install tushare pandas pyarrow

# 设置 token（避免硬编码到代码里）
export TUSHARE_TOKEN="6da92101b5160db32e014a7223087bf1558696036c39c0198a0d0070"

# 跑全量（首次）
python3 tushare_pipeline.py
```

### 之后的常用命令

```bash
# 看缓存状态（不消耗积分）
python3 tushare_pipeline.py --status

# 季度结束后增量拉新（已有的不会重拉）
python3 tushare_pipeline.py

# 只拉单家银行调试
python3 tushare_pipeline.py --bank 600036.SH

# 跳过日度数据（最耗时的部分）
python3 tushare_pipeline.py --skip-daily

# 只跑宏观利率
python3 tushare_pipeline.py --skip-financial --skip-daily
```

### H 股大陆银行补充（15 家）

A 股拉到 42 家后，剩下 15 家在港股上市的大陆银行需要走 `hk_*` 接口：渤海银行、徽商银行、哈尔滨银行、锦州银行、盛京银行、中原银行、九江银行、天津银行、江西银行、甘肃银行、贵州银行、泸州银行、东莞农商行、广州农商行、重庆农商行。

**先探测权限**（不消耗积分）：

```bash
python3 tushare_pipeline.py --hk-probe
```

输出会告诉你 `hk_basic / hk_daily / hk_income / hk_balancesheet` 接口在你账户级别下是否可用。

**只拉 H 股**（不动 A 股已有缓存）：

```bash
python3 tushare_pipeline.py --hk-only
```

如果探测时财报接口报权限错，加 `--skip-hk-financial` 跳过报表只拉股价：

```bash
python3 tushare_pipeline.py --hk-only --skip-hk-financial
```

**A 股 + H 股一起拉**：

```bash
python3 tushare_pipeline.py --hk
```

H 股缓存表（独立 parquet，不影响 A 股）：
- `hk_stock_basic.parquet` — 15 家 H 股银行基础信息
- `hk_daily.parquet` — 月末股价 + 港币计价
- `hk_balancesheet / hk_income / hk_cashflow.parquet` — 财报（如果接口有权限）

**注意**：H 股财报披露频次是**半年一次（H1 / 年报）**，不是季度，所以 6 年 × 2 期 = 12 期/家，比 A 股的 24 期少一半。

### LPR 接口替代

发现 `pro.cn_lpr` 在很多账户级别下未开通。脚本已经做了**自动备选**，按顺序尝试 `cn_lpr → shibor_lpr → lpr_data`，三个都失败会提示从央行官网手动下载 csv。

## 三、缓存目录结构

跑完后会产生 `data_tushare_cache/` 目录：

```
data_tushare_cache/
├── manifest.json              # 元数据：token hash、上次跑的时间
├── stock_basic.parquet        # 57 家银行的基础信息
├── balancesheet.parquet       # 资产负债表（每行 = 一家银行一个季度）
├── income.parquet             # 利润表
├── cashflow.parquet           # 现金流量表
├── fina_indicator.parquet     # 财务指标（ROA/ROE/EPS/毛利率等约 100 字段）
├── daily_basic.parquet        # 估值快照（每月末，含 PB/PE/总市值）
├── lpr.parquet                # LPR 1Y/5Y
├── shibor.parquet             # SHIBOR 1W/1M/3M/6M/9M/1Y
└── logs/
    └── 2026-06-02-fetch.log   # 每次拉取的详细日志
```

总体积估算：约 30-50 MB（parquet 列式压缩，比 CSV 小很多）。

## 四、各接口拉取量预估

| 接口 | 银行数 | 频次 | 单次返回 | 总积分量级 |
|---|---:|---|---:|---|
| stock_basic | 1 次 | 季度 | 5000 行 | 2 积分 |
| balancesheet | 57 | 6 年 × 4 季 = 24 期 | 80-200 字段 | 57 × ~20 积分 ≈ 1140 |
| income | 57 | 24 期 | 80 字段 | 1140 |
| cashflow | 57 | 24 期 | 80 字段 | 1140 |
| fina_indicator | 57 | 24 期 | 100 字段 | 1140 |
| daily_basic | 57 | 72 月末 | 12 字段 | 4100 |
| lpr | 1 次 | 1500 天 | 4 字段 | 5 |
| shibor | 1 次 | 1500 天 | 8 字段 | 5 |

**总量约 8700 积分**——VIP 账户（5000+ 积分/天）首次跑完需要 1-2 天，之后每季度增量约 200 积分即可。

如果触发限流，脚本会自动退避，不会一次性烧光积分。

## 五、BenchmarkIQ 怎么读这份缓存

跑完后在 `build_vqa_data.py` 里这样接入：

```python
import pandas as pd

CACHE = Path("./data_tushare_cache")

bs = pd.read_parquet(CACHE / "balancesheet.parquet")
inc = pd.read_parquet(CACHE / "income.parquet")
cf = pd.read_parquet(CACHE / "cashflow.parquet")
fina = pd.read_parquet(CACHE / "fina_indicator.parquet")
market = pd.read_parquet(CACHE / "daily_basic.parquet")

# 按 (ts_code, end_date) join 形成主表
master = bs.merge(inc, on=["ts_code","end_date"], suffixes=("_bs","_inc"))
master = master.merge(cf, on=["ts_code","end_date"], suffixes=("","_cf"))
master = master.merge(fina, on=["ts_code","end_date"], suffixes=("","_fina"))

# 计算 BenchmarkIQ 自己的衍生指标
master["nim_gap"] = master["int_income"] / master["interest_assets"] - ...
master["roa"] = master["net_profit"] / master["total_assets"]
# ... 等等

# 最后落到 data.js 给前端用
```

## 六、字段映射表（关键 BenchmarkIQ 字段 → Tushare 字段）

| BenchmarkIQ 字段 | Tushare 表 | Tushare 字段 |
|---|---|---|
| 总资产 | balancesheet | total_assets |
| 总负债 | balancesheet | total_liab |
| 股东权益 | balancesheet | total_hldr_eqy_inc_min_int |
| 发放贷款和垫款 | balancesheet | loanto_oth_bank_fi（部分需推导）|
| 吸收存款 | balancesheet | depos_fr_oth_bfi（部分需推导）|
| 营业收入 | income | revenue / total_revenue |
| 利息净收入 | income | n_oth_int_inc 或 int_income - int_exp |
| 手续费及佣金净收入 | income | n_commis_income |
| 净利润 | income | n_income / net_profit |
| 拨备前利润 | income | total_profit + assets_impair_loss |
| 经营现金流 | cashflow | n_cashflow_act |
| ROA | fina_indicator | roa |
| ROE | fina_indicator | roe |
| EPS | fina_indicator | eps |
| 市净率 PB | daily_basic | pb |
| 市盈率 PE | daily_basic | pe / pe_ttm |
| 总市值 | daily_basic | total_mv |

**注意**：约 30% 的 BenchmarkIQ 现有字段 Tushare 没有（如 IFRS 9 三阶段拨备分项、零售贷款细分、监管 1104 报表），这些字段仍需从年报 PDF 解析或手工维护。

## 七、和后续 BenchmarkIQ 集成的下一步

1. **POC 阶段**（建议下一 Sprint）：用 3 家典型银行（招行/工行/民生）跑一次，对比 Tushare 数据和当前 data.js 的差异，验证字段映射的准确性
2. **POC 通过后**：扩展到 57 家全量
3. **生产化**：在 `build_vqa_data.py` 加 `--source=tushare` 参数，可在两种数据源之间切换
4. **MCP 集成**：等 Cowork 重启加载 Tushare MCP 后，让 Claude 在浏览器里直接对接，做实时调试和数据探查

## 八、风险

- **接口断网**：脚本会重试 3 次，仍失败的话日志里会标 ✗，下次跑会自动续传
- **数据修订**：Tushare 数据会有官方修订（如年报发布后调整），manifest.json 记录了上次拉取时间，建议每月跑一次增量保持新鲜
- **积分耗尽**：如果你的账户级别低，建议第一次跑分批执行（先 `--bank` 拉几家试一下，确认积分量级再放开）

跑完后可以告诉我 `data_tushare_cache/` 目录的状态，我帮你看字段映射准确性 + 缺口。
