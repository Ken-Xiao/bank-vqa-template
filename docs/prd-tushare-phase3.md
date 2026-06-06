# Phase 3 数据扩展 PRD（基于 Phase 1+2 已落地）

定稿：2026-06-02
范围：在 Phase 1（16）+ Phase 2（12）= 28 个 Tushare 字段已落地的基础上，再补 25 个字段，把 BenchmarkIQ 指标库从 93 扩到 ~118。

## 一、Phase 1+2 已经做完的（不再纳入）

| 主题 | Phase 1 字段 | Phase 2 字段 | 合计 |
|---|---|---|---:|
| DuPont 全要素 | netprofit_margin / assets_turn / assets_to_eqt + Tushare ROE/ROA 验证 | — | 5 |
| 盈利质量 | ocf_to_revenue / extra_item / valuechange_to_ebt / op_to_ebt / assets_impair_loss / prov_depr_assets | — | 6 |
| 估值扩展 | pe_ttm / dv_ratio / dv_ttm / total_mv / turnover_rate | — | 5 |
| IFRS 9 资产分类 | — | trad_asset / fvoci_assets / ac_assets / htm_invest / afa_assets / invest_income / fair_value_chg_gain | 7 |
| 现金流深度 | — | n_cashflow_inv_act / n_cash_flows_fnc_act / n_incr_dep_cob / n_decr_loan_cb / incr_money_oth_bank | 5 |
| **合计** | **16** | **12** | **28** |

## 二、Phase 3 规划：再补 25 个字段，分 4 组

### Group A：负债结构精细化（9 字段，5 天）

**痛点**：当前 BQ 只有"总负债"和"吸收存款"两个粗口径。NIM 归因和流动性诊断都需要负债端的明细拆分。

| BQ 字段（新建） | 中文 | Tushare 来源 | 价值 | 评分 |
|---|---|---|---|:-:|
| `centralBankBorrow` | 向央行借款 | `balancesheet.borrow_fr_cent_bank` | MLF/SLF 依赖度，反映货币政策传导 | 5/5 |
| `interbankDeposit` | 同业及金融机构存放 | `balancesheet.depos_oth_bfi` | 批发负债占比，反映负债稳定性 | 5/5 |
| `repoLiability` | 卖出回购金融资产 | `balancesheet.fund_sale_fa` | 回购融资规模 | 4/5 |
| `bondPayable` | 应付债券 | `balancesheet.bond_payable` | 长期债券融资 → 资本工具规模 | 5/5 |
| `centralBankDeposit` | 现金及存放央行 | `balancesheet.due_fr_central_bank` | 流动性储备核心 | 5/5 |
| `cashAndEquivalent` | 货币资金 | `balancesheet.money_cap` | 流动资产细分 | 3/5 |
| `generalRiskReserve` | 一般风险准备 | `balancesheet.general_rese` | 银行专属！监管要求的额外缓冲 | 5/5 |
| `capitalReserve` | 资本公积 | `balancesheet.cap_rese` | 股东权益构成 | 3/5 |
| `retainedEarnings` | 未分配利润 | `balancesheet.undistr_porfit` | 内生资本积累能力 | 4/5 |

**衍生分析卡：负债结构 + 流动性诊断专题**
- 把这 9 个字段按"央行端 / 同业端 / 债券端 / 存款端"四象限组织
- 计算"批发负债占比" = (同业存放 + 央行借款 + 卖出回购 + 应付债券) / 总负债
- 回答董事会问题：「我行的负债稳定性是否经得起利率上行 + 同业市场紧张？」

### Group B：NIM 真实归因（5 字段，4 天）

**痛点**：BQ 现有 `nim` 是一个总数，但**利息收入 vs 利息支出**没分开看，无法判断"NIM 收窄是资产端议价弱 还是 负债端成本涨"。

| BQ 字段（新建） | 中文 | Tushare 来源 | 价值 | 评分 |
|---|---|---|---|:-:|
| `interestIncomeGross` | 利息收入毛额 | `income.int_income` | NIM 分子的真实组成 | 5/5 |
| `interestExpenseGross` | 利息支出毛额 | `income.int_exp` | NIM 分母端成本压力 | 5/5 |
| `commissionIncomeGross` | 手续费收入毛额 | `income.commis_income` | 中收毛利率视角 | 4/5 |
| `commissionExpenseGross` | 手续费支出 | `income.commis_exp` | 中收成本结构 | 4/5 |
| `forexGain` | 汇兑损益 | `income.fx_gain` | 对涉外业务银行重要（中行/工行/交行） | 4/5 |

**衍生分析卡：NIM 归因专题升级**
- 把现有的 NIM 单数字升级为：「利息收入 +X% / 利息支出 +Y% / NIM 收窄 Z bp」三段归因
- 中收毛利率：`(commissionIncomeGross - commissionExpenseGross) / commissionIncomeGross`
- 汇兑损益剥离：分离"基础经营利润"和"汇兑波动影响"
- 升级 v8 的"NIM Sensitivity"分析，配合 SHIBOR 期限结构跑回归

### Group C：风险与稳健的隐藏点（6 字段，4 天）

**痛点**：当前风险专题只看不良率和拨备。但**衍生品敞口、商誉减值风险、递延所得税资产**这些"隐性风险"完全没纳入。

| BQ 字段（新建） | 中文 | Tushare 来源 | 价值 | 评分 |
|---|---|---|---|:-:|
| `derivativeAssets` | 衍生金融资产 | `balancesheet.deri_assets` | 衍生品资产端敞口 | 4/5 |
| `derivativeLiabilities` | 衍生金融负债 | `balancesheet.deri_liab` | 衍生品负债端敞口 | 4/5 |
| `goodwillAmount` | 商誉 | `balancesheet.goodwill` | 并购历史 → 减值风险（如平安+深发展） | 5/5 |
| `deferredTaxAssets` | 递延所得税资产 | `balancesheet.defer_tax_assets` | 经营亏损延期抵扣 → 利润可持续性信号 | 3/5 |
| `minorityInterest` | 少数股东权益 | `balancesheet.minority_int` | 集团化银行的子公司贡献 | 3/5 |
| `minorityGain` | 少数股东损益 | `income.minority_gain` | 归母 vs 总净利润的差距 | 3/5 |

**衍生分析卡：风险隐藏点诊断**
- 衍生品净敞口 = 衍生资产 - 衍生负债，占总资产比例
- 商誉/股东权益 = 减值损失的潜在最大冲击
- 子公司贡献度 = 少数股东损益占净利润比，反映集团化银行的"非主体银行业务"贡献
- 回答董事会问题：「我行账面上看不到但实际存在的风险敞口是多少？」

### Group D：财务比率补完（5 字段，2 天）

**痛点**：Tushare 已经算好的成熟比率没用上，全靠 BQ 自己推导。直接读 Tushare 一是省工程，二是有官方口径背书。

| BQ 字段（新建） | 中文 | Tushare 来源 | 价值 | 评分 |
|---|---|---|---|:-:|
| `effectiveTaxRate` | 实际税率 | `fina_indicator.tax_to_ebt` | 税收筹划 + 政策敏感性 | 3/5 |
| `cashflowToInterestDebt` | 经营现金/带息债务 | `fina_indicator.cf_to_li` | 还本付息能力 | 4/5 |
| `salesCashToRevenue` | 销售商品收现/营收 | `fina_indicator.salescash_to_or` | 收现质量 | 3/5 |
| `debtToAssets` | 资产负债率 | `fina_indicator.debt_to_assets` | 杠杆全口径 | 3/5 |
| `workingCapital` | 营运资本 | `fina_indicator.working_capital` | 短期资金充裕度 | 3/5 |

**衍生分析卡：扩展现有"盈利质量"和"DuPont"专题**
- effective tax rate 加入盈利质量第 4 层：「税收口径是否扭曲了实际盈利？」
- cf_to_li 进入风险与稳健专题
- debt_to_assets 与 leverage 双视角对比

## 三、Phase 3 落地工程拆分

按 4 组分 4 个独立 PR：

### PR-1：负债结构精细化（5 天）
- 扩 `tushare_to_benchmarkiq.py` 加 9 个字段到 `PHASE3_GROUP_A_METRICS`
- 扩 `metric_dictionary.csv` 加 9 行
- 扩 `js/35.5-tushare-metrics.js` 的 `extendMetricLabels()`
- **新建** `js/39-liability-structure-analysis.js`：`liabilityStructurePanel(row)` + HTML 渲染 + formal-section 生成器
- 新建 mount point + `bindLiabilityStructureRender()` 钩子
- 在 `js/22-formal-report.js` 加 `formalLiabilityStructureSection` 调用
- 加 CSS（复用已有 phase 1/2 卡片样式）
- 扩展 contract test

### PR-2：NIM 真实归因（4 天）
- 同上结构 + 5 个字段
- **新建** `js/40-nim-attribution-analysis.js`：`nimDecompositionPanel(row, peers)` 升级现有 NIM 章节
- 现有 NIM 专题（`js/26-v5-value-engine.js` 或同类）改为"BQ 推导 vs Tushare 直读"双源对比
- CSS：复用 DuPont 样式

### PR-3：风险隐藏点（4 天）
- 同上结构 + 6 个字段
- **新建** `js/41-hidden-risk-analysis.js`：`hiddenRiskPanel(row, peers)` 新专题
- 与现有"风险前瞻三层验证"专题协同（不替代）
- CSS：复用 IFRS 9 卡片样式

### PR-4：财务比率补完（2 天）
- 同上结构 + 5 个字段
- 不新建专题文件，直接扩展现有「盈利质量」+「DuPont」两个专题
- 加 `js/37-tushare-derived-analyses.js` 的现有函数

**合计：15 天工程**（实际可压到 10-12 天，因为后 3 组 PR 可并行）

## 四、Phase 3 完成后的产品体量

| 阶段 | 指标数 | 覆盖 | 累计专题数 |
|---|---:|---|---:|
| BenchmarkIQ 原版 | 65 | 手工 Excel | 5 |
| Phase 1 | +16 = 81 | Tushare 自动 | 5+2 利润质量/估值 |
| Phase 2 | +12 = 93 | Tushare 自动 | 7+2 IFRS9/现金流 |
| **Phase 3** | **+25 = 118** | Tushare 自动 | **9+3 负债/NIM/风险隐藏点** |

**Tushare 利用率**：
- 当前 28 / 469 = ~6%
- Phase 3 后：53 / 469 = ~11%
- 这是合理的——剩下 89% 是非银业务字段或元数据，对银行分析无用

## 五、不在 Phase 3 范围

### 已弃用（Phase 1/2 没纳入但确认不做）
- `current_ratio` / `quick_ratio` / `cash_ratio` —— 银行业务不适用（流动性看 LCR/NSFR）
- `inv_turn` / `ar_turn` —— 存货周转和应收账款周转对银行无意义
- `rd_exp_to_revenue` —— 银行研发投入披露不规范
- `tangible_asset` / `intan_assets` —— 银行业有形/无形资产分类与一般企业不同

### Phase 4 以后再做（不在本 PRD）
- **HK 股财报字段**（hk_balancesheet/hk_income/hk_cashflow）—— 15 家 H 股银行
- **指数成分 + 北向资金**（index_member / hk_hold）—— 机构持仓与外资视角
- **历史时序数据**（每月 PB 序列 daily_basic）—— 用于方向 I PB 时序分析
- **业绩预告/快报**（fina_forecast / fina_express）—— 财报治理质量

## 六、推荐执行顺序

按"价值密度 × 工程独立性"：

1. **PR-1 负债结构精细化** 最先做（5 天）
   - 影响最大：NIM 归因、流动性诊断都依赖
   - 工程独立：不动现有 NIM 专题
2. **PR-4 财务比率补完** 第二做（2 天）
   - 工程最简单：只读不算
   - 用做"小胜利"快速验证 Phase 3 流程
3. **PR-2 NIM 真实归因** 第三做（4 天）
   - 改动现有 NIM 专题，需要 PR-1 的负债数据
4. **PR-3 风险隐藏点** 最后做（4 天）
   - 与现有风险专题协同，需要前 3 个 PR 稳定

## 七、与方向 J（银行类型自适应）的关系

Phase 3 完成后，方向 J 的实施会更顺：
- **零售型银行**：用 Phase 3 负债端字段判断零售存款占比稳定性
- **对公型银行**：用 derivativeAssets/Liab 看大客户风险
- **交易银行型**：用 commissionIncome/Expense 看中收质量
- **全能型**：用 minorityGain 看集团化贡献

也就是说 **Phase 3 是方向 J 落地的"数据底座"**。建议先 Phase 3（15 天）后 J（10 天），总计 25 天进入产品定位级跃迁。

## 八、契约测试设计

每个 PR 都扩展 `tests/metric_library_phase1_contract.test.js`，加 Phase 3 断言：
- 所有 25 个字段在 metric_dictionary 中存在
- 35.5 的 metricLabel 包含 25 个新条目
- tushare_to_benchmarkiq.py 包含 PHASE3_GROUP_A_METRICS / PHASE3_GROUP_B_METRICS / PHASE3_GROUP_C_METRICS / PHASE3_GROUP_D_METRICS
- 39-41 三个新文件存在且导出对应函数
- 4 个新 formal-section 在 22-formal-report.js 被调用
- 对应 CSS 类存在
