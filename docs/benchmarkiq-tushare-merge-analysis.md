# BenchmarkIQ × Tushare 合并分析报告

生成时间：2026-06-02T21:26:20

- BenchmarkIQ 指标数：65
- Tushare 实际拉到的表：8
- Tushare 总字段数：477

## 一、合并方案：每个 BenchmarkIQ 指标的来源


### ✓ 直接映射（7 个）

| 指标 | 中文 | 主题 | 关键? | Tushare 来源 |
|---|---|---|---|---|
| `incomeTax` | 所得税 | 利润表详情(万元) |  | income.income_tax |
| `interestExpense` | 利息支出 | 利润表详情(万元) |  | income.int_exp |
| `interestIncome` | 利息收入 | 利润表详情(万元) |  | income.int_income |
| `netProfit` | 净利润 | 盈利概览(万元) |  | income.n_income |
| `revenue` | 营业收入 | 盈利概览(万元) |  | income.revenue |
| `adminExpense` | 管理费用 | 盈利质量 |  | income.biz_tax_surchg |
| `equity` | 股东权益 | 资产负债(万元) |  | balancesheet.total_hldr_eqy_inc_min_int |

### 🔧 需推导（32 个）

| 指标 | 中文 | 主题 | 关键? | Tushare 来源 |
|---|---|---|---|---|
| `realLoanDepositSpread` | 真实存贷利差 | 息差负债 |  | BQ 现有源字段: 真实存贷利差 |
| `bondInvestment` | 债券投资 | 投资结构 |  | BQ 现有源字段: 债券合计 |
| `fundInvestment` | 基金投资 | 投资结构 |  | BQ 现有源字段: 基金 |
| `trustWmInvestment` | 信托及理财投资 | 投资结构 |  | BQ 现有源字段: 信托及理财 |
| `nonInterestShare` | 非息占比% | 盈利指标 |  | BQ 现有源字段: 非息占比% |
| `roe` | ROE% | 盈利指标 |  | BQ 现有源字段: ROE% |
| `coreRevenue` | 核心营收 | 盈利概览(万元) |  | BQ 现有源字段: 核心营收 |
| `feeIncome` | 手续费净收入 | 盈利概览(万元) |  | BQ 现有源字段: 手续费净收入 |
| `netInterestIncome` | 净利息收入 | 盈利概览(万元) |  | BQ 现有源字段: 净利息收入 |
| `netProfitGrowth` | 净利润增速% | 盈利概览(万元) |  | BQ 现有源字段: 净利润增速% |
| `ppop` | PPOP | 盈利概览(万元) |  | BQ 现有源字段: PPOP |
| `ppopGrowth` | PPOP增速% | 盈利概览(万元) |  | BQ 现有源字段: PPOP增速% |
| `revenueGrowth` | 营业收入增速% | 盈利概览(万元) |  | BQ 现有源字段: 营业收入增速% |
| `coreRevenueGrowth` | 核心营收增速 | 盈利质量 | ★ | BQ 现有源字段: 核心营收增速% |
| `operatingCashFlow` | 经营活动现金流净额 | 盈利质量 |  | BQ 现有源字段: 经营活动净额 |
| `roa` | 总资产收益率 | 盈利质量 | ★ | BQ 现有源字段: ROA% |
| `trueCoreNonInterest` | 真实核心非息占比 | 盈利质量 |  | BQ 现有源字段: 真实核心非息% |
| `volatileIncomeShare` | 高波动收入占比 | 盈利质量 |  | BQ 现有源字段: 高波动收入% |
| `assets` | 资产总计 | 资产负债(万元) |  | BQ 现有源字段: 资产总计 |
| `deposits` | 存款总额 | 资产负债(万元) |  | BQ 现有源字段: 存款总额 |
| `liabilities` | 负债合计 | 资产负债(万元) |  | BQ 现有源字段: 负债合计 |
| `loans` | 贷款总额 | 资产负债(万元) |  | BQ 现有源字段: 贷款总额 |
| `overdueRatio` | 逾期率% | 资产质量 |  | BQ 现有源字段: 逾期率% |
| `specialMentionRatio` | 关注率% | 资产质量 |  | BQ 现有源字段: 关注率% |
| `basicEps` | 基本每股收益 | 资本估值 |  | BQ 现有源字段: 基本EPS(元) |
| `cet1Buffer` | 核心一级资本余量 | 资本估值 | ★ | BQ 现有源字段: CET1余量bp |
| `costIncomeRatio` | 成本收入比 | 资本估值 |  | BQ 现有源字段: 成本收入比% |
| `pb` | 市净率 | 资本估值 | ★ | BQ 现有源字段: PB(年末) |
| `pbMid` | 年中市净率 | 资本估值 |  | BQ 现有源字段: PB(年中) |
| `cet1` | 核心一级充足% | 资本充足率 |  | BQ 现有源字段: 核心一级充足% |
| `hiddenNplExposure` | 隐性不良暴露率 | 风险拨备 | ★ | BQ 现有源字段: 隐性不良暴露率% |
| `overdueNplDeviation` | 逾期不良偏离度 | 风险拨备 | ★ | BQ 现有源字段: 逾期-不良偏离度 |

### ❌ 缺失（22 个）

| 指标 | 中文 | 主题 | 关键? | Tushare 来源 |
|---|---|---|---|---|
| `corporateTimeDeposit` | 公司定期 | 存款结构(万元) |  | 年报附注披露，Tushare 三表不覆盖，需 PDF 抽取或手工 |
| `personalTimeDeposit` | 个人定期 | 存款结构(万元) |  | 年报附注披露，Tushare 三表不覆盖，需 PDF 抽取或手工 |
| `earningAssetYield` | 生息资产收益率 | 息差负债 |  | 年报附注披露，Tushare 三表不覆盖，需 PDF 抽取或手工 |
| `interestLiabilityCost` | 计息负债成本率 | 息差负债 |  | 年报附注披露，Tushare 三表不覆盖，需 PDF 抽取或手工 |
| `nim` | 净息差 | 息差负债 | ★ | 年报附注披露，Tushare 三表不覆盖，需 PDF 抽取或手工 |
| `nimGapPoint` | NIM缺口 | 息差负债 |  | 年报附注披露，Tushare 三表不覆盖，需 PDF 抽取或手工 |
| `liquidityCoverageRatio` | 流动性覆盖率 | 流动性 | ★ | 年报附注披露，Tushare 三表不覆盖，需 PDF 抽取或手工 |
| `liquidityRatio` | 流动性比率 | 流动性 |  | 年报附注披露，Tushare 三表不覆盖，需 PDF 抽取或手工 |
| `carBuffer` | 资本充足率余量 | 资本估值 | ★ | 年报附注披露，Tushare 三表不覆盖，需 PDF 抽取或手工 |
| `estimatedRwa` | 估算风险加权资产 | 资本估值 |  | 年报附注披露，Tushare 三表不覆盖，需 PDF 抽取或手工 |
| `rwaDensity` | 风险加权资产密度 | 资本估值 | ★ | 年报附注披露，Tushare 三表不覆盖，需 PDF 抽取或手工 |
| `businessLoanNpl` | 经营贷款不良率 | 零售结构 |  | 年报附注披露，Tushare 三表不覆盖，需 PDF 抽取或手工 |
| `businessLoanShare` | 经营贷款占比 | 零售结构 |  | 年报附注披露，Tushare 三表不覆盖，需 PDF 抽取或手工 |
| `consumerLoanNpl` | 消费贷款不良率 | 零售结构 |  | 年报附注披露，Tushare 三表不覆盖，需 PDF 抽取或手工 |
| `consumerLoanShare` | 消费贷款占比 | 零售结构 |  | 年报附注披露，Tushare 三表不覆盖，需 PDF 抽取或手工 |
| `housingLoanNpl` | 住房贷款不良率 | 零售结构 |  | 年报附注披露，Tushare 三表不覆盖，需 PDF 抽取或手工 |
| `housingLoanShare` | 住房贷款占比 | 零售结构 |  | 年报附注披露，Tushare 三表不覆盖，需 PDF 抽取或手工 |
| `billDiscountNpl` | 票据贴现不良率 | 风险拨备 |  | 年报附注披露，Tushare 三表不覆盖，需 PDF 抽取或手工 |
| `corporateLoanNpl` | 公司贷款不良率 | 风险拨备 |  | 年报附注披露，Tushare 三表不覆盖，需 PDF 抽取或手工 |
| `npl` | 不良率 | 风险拨备 | ★ | 年报附注披露，Tushare 三表不覆盖，需 PDF 抽取或手工 |
| `personalLoanNpl` | 个贷不良率 | 风险拨备 |  | 年报附注披露，Tushare 三表不覆盖，需 PDF 抽取或手工 |
| `provisionCoverage` | 拨备覆盖率 | 风险拨备 | ★ | 年报附注披露，Tushare 三表不覆盖，需 PDF 抽取或手工 |

### 📊 已是派生（4 个）

| 指标 | 中文 | 主题 | 关键? | Tushare 来源 |
|---|---|---|---|---|
| `nimGapBp` | 息差对冲缺口 | 息差负债 |  | BQ 内部公式: (当年生息资产收益率变化 - 当年计息负债成本率变化) * 100 |
| `timeDepositShare` | 定期存款占比 | 息差负债 |  | BQ 内部公式: (公司定期 + 个人定期) / 存款总额 * 100 |
| `feeAssetRatio` | 手续费资产比 | 盈利质量 | ★ | BQ 内部公式: 手续费净收入 / 资产总计 * 100 |
| `profitPpopGap` | 净利与拨备前利润增速缺口 | 风险拨备 |  | BQ 内部公式: 净利润增速 - PPOP增速 |

## 二、Tushare 独有维度（BenchmarkIQ 没用上的金矿）


### 市场流动性 / 情绪

| Tushare 字段/接口 | 中文 | 对 BenchmarkIQ 的价值 |
|---|---|---|
| `daily_basic.turnover_rate` | 换手率 | 反映个股活跃度，可作为投资者关注度信号 |
| `daily_basic.volume_ratio` | 量比 | 短期资金流入/流出强度 |
| `daily_basic.float_share / total_share` | 流通股本/总股本 | 锁仓比例，影响价格弹性 |

### 估值时序衍生（M = Macro）

| Tushare 字段/接口 | 中文 | 对 BenchmarkIQ 的价值 |
|---|---|---|
| `daily_basic.pb 6 年面板` | PB 滚动序列 | I 方向：PB 时序 + 资本市场感知漂移 |
| `月度 PB 标准差` | 估值波动率 | 估值稳定性指标，反映市场分歧度 |
| `PB Beta vs 银行板块` | 对板块的敏感性 | 区分系统性 vs 特异性估值变动 |
| `daily_basic.pe_ttm 趋势` | 市盈率趋势 | 盈利预期变化 |

### 股东行为 / 治理

| Tushare 字段/接口 | 中文 | 对 BenchmarkIQ 的价值 |
|---|---|---|
| `daily_basic.dv_ratio` | 股息率 | 分红一致性 + 投资者吸引力（中国央国行核心指标） |
| `daily_basic.dv_ttm` | TTM 股息率 | 动态分红水平 |
| `分红计算: net_profit × payout_ratio` | 实际分红额 | A EP 引擎需要的分红再投资率 |

### 市场结构信号

| Tushare 字段/接口 | 中文 | 对 BenchmarkIQ 的价值 |
|---|---|---|
| `hk_hold 北向持仓变化` | 北向资金净流入 | 外资信心 + 国际定价权 |
| `indices_member 指数成分` | 沪深 300 / 中证银行成分 | 被动资金权重 |
| `margin 融资融券余额` | 融资融券 | 杠杆资金对个股的关注度 |

### 盈利预期 / 前瞻

| Tushare 字段/接口 | 中文 | 对 BenchmarkIQ 的价值 |
|---|---|---|
| `fina_forecast` | 业绩预告 | 正式财报前的预告，可对比预告偏差 |
| `fina_express` | 业绩快报 | 快报与正式年报的差异 |
| `disclosure_date` | 披露日期 | 财报披露及时性 → 信息质量信号 |

### 宏观背景（已部分有）

| Tushare 字段/接口 | 中文 | 对 BenchmarkIQ 的价值 |
|---|---|---|
| `cn_gdp` | GDP | Stress test 宏观情景输入 |
| `cn_cpi / cn_ppi` | CPI / PPI | 通胀环境 → 影响 NIM |
| `cn_m / cn_sf` | M1/M2 / 社融 | 流动性环境 → 影响银行存贷利率 |
| `cn_pmi` | PMI | 经济周期信号 |
| `shibor 期限结构` | 1W/1M/3M/6M/9M/1Y SHIBOR | 已有，可做利率曲线分析 |

### 再融资 / 资本工具

| Tushare 字段/接口 | 中文 | 对 BenchmarkIQ 的价值 |
|---|---|---|
| `cb_basic` | 可转债 | 银行可转债转股稀释、剩余规模、再融资压力 |
| `dividend` | 分红明细 | 现金分红 + 股票分红记录 |
| `repurchase` | 股份回购 | 稳定股价信号 |
| `share_float` | 限售股解禁 | 供给冲击 |

## 三、合并后能解锁的 12 个新分析方向

按 value_score 排序（5=最高）。

| # | 方向 | 价值分 | 工程量 | 用什么 Tushare 数据 | BenchmarkIQ 哪里改 |
|---:|---|:---:|---|---|---|
| 1 | **动态 Beta + CAPM 资本成本** | 5/5 | 2-3 天 | daily_basic 6 年个股 + 银行板块/沪深300 指数 → 滚动 60 月 Beta | 扩展 js/32-pb-pricing-model.js, 新建 economicProfit 计算 |
| 2 | **PB 时序事件归因（方向 I）** | 5/5 | 4-5 天 | daily_basic.pb 月度序列 + 自建宏观事件锚点表 | 扩展 js/32-pb-pricing-model.js |
| 3 | **利率曲线敏感性 (NIM Sensitivity)** | 5/5 | 3-4 天 | shibor 全期限 + 利息净收入序列 | 扩展 What-if，新增'利率曲线情景' |
| 4 | **PB 系统性 vs 特异性分解** | 4/5 | 2 天 | 本行 PB - 银行板块 PB 加权 (用 daily_basic 滚动回归) | 新专题，叠加在估值章节 |
| 5 | **股息率诚信指数** | 4/5 | 2 天 | daily_basic.dv_ratio + 历史分红记录 + 净利润 → 分红覆盖率 | 新专题 '股东回报质量' 或并入现有'市场感知' |
| 6 | **北向资金信心指数** | 4/5 | 2-3 天 | hk_hold 月度北向持股变化 | 新专题 '机构持仓与外资' |
| 7 | **申万行业自动 peer 推荐** | 4/5 | 2 天 | index_classify + index_member（申万行业指数） | 替换/增强现有对标推荐 |
| 8 | **财报披露质量与一致性** | 3/5 | 3 天 | fina_forecast + fina_express + income 三方比对 | 新专题 '财报治理质量' |
| 9 | **宏观四象限 + 银行表现** | 3/5 | 3 天 | cn_pmi + cn_cpi + 现有 ROA/NIM | 扩展宏观背景章节 |
| 10 | **估值波动率 + 市场分歧度** | 3/5 | 1-2 天 | daily_basic.pb 月内日度数据 | 估值章节新增 KPI |
| 11 | **可转债稀释 + 资本补充** | 3/5 | 2 天 | cb_basic（可转债基础信息） | 扩展资本充足章节 |
| 12 | **限售股解禁压力监测** | 2/5 | 2 天 | share_float（限售股解禁） | 估值章节预警 |

### 每个方向的详细价值阐述


**1. 动态 Beta + CAPM 资本成本**（5/5，2-3 天）

- 价值：为 A EP 引擎提供更精确的权益资本成本
- Tushare 输入：daily_basic 6 年个股 + 银行板块/沪深300 指数 → 滚动 60 月 Beta
- BenchmarkIQ 改造点：扩展 js/32-pb-pricing-model.js, 新建 economicProfit 计算

**2. PB 时序事件归因（方向 I）**（5/5，4-5 天）

- 价值：市场对我行的风险定价从 2020 至今变了几次档，每次拐点对应什么宏观事件
- Tushare 输入：daily_basic.pb 月度序列 + 自建宏观事件锚点表
- BenchmarkIQ 改造点：扩展 js/32-pb-pricing-model.js

**3. 利率曲线敏感性 (NIM Sensitivity)**（5/5，3-4 天）

- 价值：用 SHIBOR 1W/1M/3M/6M/1Y 期限结构跟 NIM 历史回归，量化加息/降息对 NIM 的弹性
- Tushare 输入：shibor 全期限 + 利息净收入序列
- BenchmarkIQ 改造点：扩展 What-if，新增'利率曲线情景'

**4. PB 系统性 vs 特异性分解**（4/5，2 天）

- 价值：解释 PB 变动里多少来自行业整体 vs 本行自身
- Tushare 输入：本行 PB - 银行板块 PB 加权 (用 daily_basic 滚动回归)
- BenchmarkIQ 改造点：新专题，叠加在估值章节

**5. 股息率诚信指数**（4/5，2 天）

- 价值：回答董事会问题: '我行的分红是否稳定且可持续'
- Tushare 输入：daily_basic.dv_ratio + 历史分红记录 + 净利润 → 分红覆盖率
- BenchmarkIQ 改造点：新专题 '股东回报质量' 或并入现有'市场感知'

**6. 北向资金信心指数**（4/5，2-3 天）

- 价值：外资对每家银行的态度 + 趋势，区分'被外资抛弃' vs '外资增持'
- Tushare 输入：hk_hold 月度北向持股变化
- BenchmarkIQ 改造点：新专题 '机构持仓与外资'

**7. 申万行业自动 peer 推荐**（4/5，2 天）

- 价值：用 Tushare 申万银行三级分类直接推荐对标组
- Tushare 输入：index_classify + index_member（申万行业指数）
- BenchmarkIQ 改造点：替换/增强现有对标推荐

**8. 财报披露质量与一致性**（3/5，3 天）

- 价值：对比业绩预告 vs 业绩快报 vs 正式年报的差异
- Tushare 输入：fina_forecast + fina_express + income 三方比对
- BenchmarkIQ 改造点：新专题 '财报治理质量'

**9. 宏观四象限 + 银行表现**（3/5，3 天）

- 价值：在 PMI 上升+CPI 上升、PMI 上升+CPI 下降... 四象限下，本行 NIM/ROA 表现如何
- Tushare 输入：cn_pmi + cn_cpi + 现有 ROA/NIM
- BenchmarkIQ 改造点：扩展宏观背景章节

**10. 估值波动率 + 市场分歧度**（3/5，1-2 天）

- 价值：PB 月度标准差 → 反映市场对本行价值判断的分歧
- Tushare 输入：daily_basic.pb 月内日度数据
- BenchmarkIQ 改造点：估值章节新增 KPI

**11. 可转债稀释 + 资本补充**（3/5，2 天）

- 价值：解读银行资本工具的发行节奏和稀释影响
- Tushare 输入：cb_basic（可转债基础信息）
- BenchmarkIQ 改造点：扩展资本充足章节

**12. 限售股解禁压力监测**（2/5，2 天）

- 价值：未来 6 个月有多少限售股解禁，对股价/PB 的潜在压力
- Tushare 输入：share_float（限售股解禁）
- BenchmarkIQ 改造点：估值章节预警

## 四、推荐的合并实施顺序

**Sprint M1（基础映射，3-4 天）**：
- 21 个直接映射字段全部接入 `build_vqa_data.py` 的 Tushare 通道
- 26 个需推导字段实现公式（NIM、核心营收占比、息差缺口等）
- 23 个缺失字段保留现有 data.js 手工通道，加 `data_source` 标签

**Sprint M2（高价值新分析，4-5 天）**：
- #1 动态 Beta + CAPM 资本成本（喂给方向 A 的 EP 引擎）
- #2 PB 时序事件归因（即方向 I）
- #7 利率曲线敏感性 NIM

**Sprint M3（中高价值，3-4 天）**：
- #3 PB 系统性 vs 特异性分解
- #4 股息率诚信指数
- #5 北向资金信心指数
- #12 申万行业自动 peer 推荐

**Sprint M4（治理 + 资本工具，2-3 天）**：
- #6 财报披露质量
- #8 宏观四象限
- #10 可转债稀释

