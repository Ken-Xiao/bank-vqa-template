# PRD：银行类型自适应分析框架（方向 J）

定稿：2026-06-02
触发来源：2026-06-02 银行客户访谈反馈——"银行本身的运营逻辑存在差异，零售/对公/交易/全能四类银行需要按隐含运营逻辑分类分析，不能用一套统一框架"
关联方向：K 类型 + 情景自适应导航（依赖本 PRD）、I PB 时序、A EP 引擎

## 一、问题陈述

### 当前框架的缺陷

BenchmarkIQ 现有的 SPARC 五维（Sustainability/Profitability/Asset Quality/Resilience/Conviction）+ VQA 价值质量引擎是一套**统一加权框架**——同一组指标权重套用所有 57 家上市银行。这造成两个问题：

**问题 1：用户感知"对牛弹琴"**——给招商银行（零售旗舰）的诊断里大量篇幅讲对公贷款定价，给工商银行（对公巨头）的诊断里大量篇幅讲信用卡循环余额，这种"通用诊断"在专业银行家眼里立刻露馅。

**问题 2：内容复杂度爆炸**——为了覆盖所有银行类型的关注点，专题数量必须保留所有维度的指标，导致 Step 2 默认看到 5+ 个专题、20+ 个指标，每个都"可能相关"。**复杂的根因是试图用一套框架覆盖所有银行类型**。

### 银行家的洞察（2026-06-02）

> "我们看招行肯定看私行 AUM 和零售存款成本，看工行肯定看对公定价和大客户管理，看民生交易银行肯定看结算流量。一套框架做不到这种差异化。"

## 二、四类银行的隐含运营逻辑

| 类型 | 代表 | 核心价值驱动 | 核心 KPI |
|---|---|---|---|
| **零售型**（Retail-led） | 招商、平安零售、邮储、宁波部分 | 个人客户 LTV + 低成本零售存款 + AUM 经济 | 私人银行 AUM/客户数、零售存款占比、财富管理手续费、信用卡循环余额、零售不良/拨备覆盖 |
| **对公资产型**（Corporate-asset） | 工行、建行、中信、浦发 | 对公客群广度 + 资本配置效率 + 大客户管理 | 对公贷款集中度、对公存款成本、单笔大额贷款定价、IB 业务联动、RWA 密度、贷款行业集中度（HHI） |
| **交易银行型**（Transactional） | 民生交易银行、招行司库、平安银行部分 | 流量经济 + 低风险中收 + 客户黏性 | 结算账户数、人民币国际化业务、托管费/资产、跨境结算量、供应链金融余额、票据贴现规模 |
| **全能型**（Universal） | 国有四大行（工建中农）、股份制全口径（兴业、华夏） | 业务多元化 + 跨条线协同 + 规模优势 | 综合化收入占比、跨条线协同度、单客交叉销售比、轻资本业务占比、子公司贡献度 |

### 类型判定算法

不依赖人工标注，按披露数据自动判定。优先级如下：

```
判定函数 classifyBankType(bank, year):
  if 零售贷款占比 > 40% AND 零售存款占比 > 50% → retail
  if 对公贷款占比 > 60% AND 大客户集中度 > 35% → corporate
  if 手续费收入占比 > 25% AND 结算业务收入显著 → transactional
  else → universal
```

**手工覆盖**：每家银行允许人工标注一个 `manualType` 字段覆盖算法判定（部分银行多业务并行难以单一归类）。

**多类型支持**：允许一家银行打多标签（如平安银行 = retail + corporate-secondary），但默认展示主类型。

### 类型间的相对位置

```
零售型 ━━━━┓
            ┣━━━━ 全能型（中位）
对公型 ━━━━┛
            
交易型 ←━ 横切轴（多数零售/对公银行同时有交易银行业务线）
```

交易银行型在中国市场比较特殊——很多大行有交易银行业务线但不以此为主轴。本 PRD 把交易银行型作为"业务线"而非"银行整体"标签来处理。

## 三、产品改造分四层

### 第 1 层：数据层（影响范围：bank_master.json + state.target）

**新增字段**：
- `bank_master.json` 的每条记录加 `businessType` 字段（retail/corporate/transactional/universal）
- 加 `businessTypeAuto` 字段记录算法判定结果
- 加 `businessTypeManual` 字段记录人工覆盖
- 加 `businessTypeTags[]` 字段记录多标签（如 ["universal", "retail-strong"]）
- 加 `businessTypeYearMap` 字段记录类型随时间演化（部分银行经历转型，如平安银行从 corporate → retail 的 10 年迁徙）

**算法位置**：新建 `python/classify_bank_type.py`，在 `build_vqa_data.py` 流程里跑

### 第 2 层：VQA 引擎层（影响范围：js/26-v5-value-engine.js）

**新增函数** `vqaByBankType(targetBank, year)`：

```js
const SPARC_WEIGHTS_BY_TYPE = {
  retail: {
    S_sustainability: { roa: 0.10, retailDepositCost: 0.30, wealthFeeGrowth: 0.30, aumPerCustomer: 0.30 },
    P_profitability:  { nim: 0.20, retailRoa: 0.40, fee: 0.40 },
    A_assetQuality:   { npl: 0.20, retailNpl: 0.50, hiddenExposure: 0.30 },
    R_resilience:     { cet1: 0.30, retailDeposit: 0.40, liquidityRatio: 0.30 },
    C_conviction:     { pb: 0.40, pe: 0.30, dividendPayout: 0.30 }
  },
  corporate: {
    S_sustainability: { roa: 0.20, corporateLoanYield: 0.30, rwaDensity: 0.30, fee: 0.20 },
    P_profitability:  { nim: 0.30, corporateRoa: 0.40, costIncome: 0.30 },
    A_assetQuality:   { npl: 0.30, corporateNpl: 0.40, industryHHI: 0.30 },
    R_resilience:     { cet1: 0.40, carBuffer: 0.30, largeExposureRatio: 0.30 },
    C_conviction:     { pb: 0.50, pe: 0.30, economicProfit: 0.20 }
  },
  transactional: {
    S_sustainability: { feeRevenueShare: 0.40, settlementVolume: 0.30, custodyFee: 0.30 },
    P_profitability:  { nim: 0.10, fee: 0.50, costIncome: 0.40 },
    A_assetQuality:   { npl: 0.20, billDiscountNpl: 0.30, lcrCoverage: 0.50 },
    R_resilience:     { cet1: 0.20, liquidityCoverageRatio: 0.50, depositLiabilityRatio: 0.30 },
    C_conviction:     { pb: 0.30, pe: 0.30, feeGrowth: 0.40 }
  },
  universal: {
    // 沿用现有 SPARC 通用权重作为 baseline
    S_sustainability: { roa: 0.20, nim: 0.20, fee: 0.20, coreRevenueGrowth: 0.20, retailDepositCost: 0.20 },
    P_profitability:  { roa: 0.25, roe: 0.25, nim: 0.25, fee: 0.25 },
    A_assetQuality:   { npl: 0.30, hiddenExposure: 0.30, provisionCoverage: 0.20, retailRiskMax: 0.20 },
    R_resilience:     { cet1: 0.35, carBuffer: 0.35, liquidityRatio: 0.30 },
    C_conviction:     { pb: 0.40, pe: 0.30, economicProfit: 0.30 }
  }
};
```

**关键设计**：同一个 VQA 分对不同类型银行内涵不同——零售型银行 80 分 VQA 意味着"私行 AUM + 零售存款成本"占主导，对公型银行 80 分 VQA 意味着"RWA 密度 + 对公定价纪律"占主导。报告语言要明确说出"本评分按零售型银行框架生成"。

### 第 3 层：专题层（影响范围：5 大专题入口 + 报告章节）

**专题映射规则**：

| 银行类型 | 优先专题（默认展开） | 次要专题（折叠） | 隐藏专题 |
|---|---|---|---|
| 零售型 | 1. 私行 + 财富管理价值矩阵<br>2. 零售存款成本结构<br>3. 零售不良三层验证 | 4. 资本与价值创造<br>5. 估值与市场感知 | 对公定价、IB 业务、跨境结算 |
| 对公型 | 1. 对公客群质量 + RWA 密度<br>2. 对公定价纪律<br>3. 大额风险敞口分析 | 4. 估值与价值创造（EP）<br>5. 资产质量真相 | 私行 AUM、信用卡、零售财富 |
| 交易银行型 | 1. 结算流量 + 客户黏性<br>2. 中收质量 + 业务结构<br>3. 流动性深度分析 | 4. 资本市场感知 | 大额对公贷款、零售存款 |
| 全能型 | 1. 跨条线协同度<br>2. 业务结构转型（C 方向）<br>3. 价值创造 EP（A 方向） | 4. 各业务线质量 | 单一业务线深钻 |

**专题独占设计**：
- 零售型独占："私行 + 财富管理价值矩阵"（横轴 AUM 增速，纵轴客户增速，气泡大小 = 手续费贡献）
- 对公型独占："对公定价纪律 + RWA 密度对标"（散点图，X 轴 RWA 密度，Y 轴对公贷款收益率）
- 交易型独占："流量银行 + 客户黏性"（结算账户数 vs 低成本存款转化率）
- 全能型独占："跨条线协同度 + 多元化收益"（雷达图覆盖所有业务线）

**复用专题**：DuPont 三级分解、净利润归因瀑布、多基准线对标、What-if 情景模拟——这些是所有类型通用的分析工具。

### 第 4 层：语言层（影响范围：js/22-formal-report.js + js/12-ai-narrative.js）

**问题式标题按类型差异化**：

| 银行类型 | 5 大专题标题（问题式） |
|---|---|
| 零售型 | 1. 我行的私人银行 AUM 增长速度是否支撑了估值溢价？<br>2. 我行的零售存款成本相对同业是优势还是劣势？<br>3. 我行的财富管理收入是否构成了真正的第二支柱？<br>4. 我行的零售不良暴露是否已经反映了真实经营压力？<br>5. 我行的零售客户 LTV 是否还在持续增长？ |
| 对公型 | 1. 我行的对公定价纪律在行业里排第几？为什么？<br>2. 我行的 RWA 密度是否在合理区间？资本效率如何？<br>3. 我行的大客户集中度是否构成了系统性风险？<br>4. 我行的对公存款成本在加息周期是否守住？<br>5. 我行的 IB 业务能否真正提升对公客户黏性？ |
| 交易型 | 1. 我行的结算流量是否在向低成本存款有效转化？<br>2. 我行的中收质量构成是真实业务驱动还是会计调整？<br>3. 我行的流动性深度能否支撑大额支付高峰？<br>4. 我行的客户黏性指标在头部交易银行里排第几？ |
| 全能型 | 1. 我行的跨条线协同有没有真正变成 1+1>2？<br>2. 我行的业务结构转型速度是否跑赢了同业？<br>3. 我行的子公司贡献度是否符合"集团化"承诺？<br>4. 我行的轻型化进程相对同业的领先/落后程度？ |

**语言强度联动**：现有的 L1-L4 风险标签 + strong/implicit/tentative 三档语气全部沿用，但是**断言的具体内容**按类型调整。

### 第 5 层：功能层（影响范围：对标组推荐 + 默认导航）

**默认对标组自动推荐**：
- 零售型银行选定后，默认推荐同类型零售银行（不混入对公型 peer）
- 多类型支持：用户可选"我同类型 + 通用大盘"叠加视图

**导航分组按类型重排**：
- 左侧导航按"本类型核心 → 本类型加强 → 通用专题 → 工具箱"四档分组
- 不属于本类型的专题默认折叠到"其他专题"小入口

## 四、产品 UI 改造（与方向 K 协同）

### Step 1：类型展示

选完银行后，在 Global Bar 增加类型标签：

```
[BenchmarkIQ] [招商银行 · 2025] [VQA 82 · 强] [零售型 ⓘ] [步骤 1/2/3] [工具箱] [导出]
                                                  ↑
                                          鼠标悬停显示类型判定依据
```

### Step 2：默认视图按类型展开

- 进入 Step 2 后默认展开 1-2 个本类型核心专题（含问题式标题 + 洞察三角）
- 其他专题作为"看更多"小入口，整齐排在下方
- 右侧指标上下文栏的趋势对标自动用同类型 peer 而非全口径

### Step 2：类型切换

允许用户在 Step 2 顶部下拉切换分析视角：
- "按零售型框架分析"（系统默认）
- "按对公型框架分析"
- "按全能型框架分析"（保持现有通用 SPARC）

切换后所有专题、问题式标题、对标默认值同步刷新。这是一个**关键的用户控制**——用户对自家银行类型可能有不同的"自我认知"。

### Step 3：报告版本里加类型标签

正式报告封面下方加一行："本报告按 [零售型] 银行分析框架生成。如需切换框架请回 Step 2。"

## 五、工程拆分

总工程量：**8-10 天**（含数据 + JS + UI + 测试）

### PR-1：类型字段与算法（2 天）
- `python/classify_bank_type.py` 算法
- `bank_master.json` 新增 4 个字段
- 跑一遍 57 家银行算法判定 + 人工校准
- 新增 `tests/bank_typology_classification.test.js`

### PR-2：VQA 引擎类型分支（2 天）
- `js/26-v5-value-engine.js` 加 `SPARC_WEIGHTS_BY_TYPE` + `vqaByBankType()`
- 现有 `vqaScore()` 退化为 `vqaByBankType(... universal)`
- 报告页面显示"按 X 型银行框架生成"
- 新增 `tests/vqa_by_type_contract.test.js`

### PR-3：专题映射重排（2 天）
- 新建 `js/40-bank-typology-router.js`
- 实现专题入口按类型 priority 排序 + 折叠规则
- 改 Step 2 默认展开逻辑

### PR-4：语言层差异化（2 天）
- `js/02-config.js` 的 `topicQuestionTitles()` 按类型扩展
- 4 套问题骨架（零售/对公/交易/全能）
- `js/22-formal-report.js` 报告标题按类型选骨架

### PR-5：UI 改造（1-2 天，依赖方向 K）
- Global Bar 类型标签 + tooltip
- Step 2 类型切换下拉
- Step 3 报告版本类型标签

## 六、验收清单

每个 PR 跑三家典型样本：
- **零售型代表**：招商银行（CMB）
- **对公型代表**：工商银行（ICBC）
- **交易银行型代表**：民生银行（CMBC，主营交易银行）
- **全能型代表**：建设银行（CCB）

每家银行验收维度：
1. 类型判定结果是否符合行业共识
2. VQA 分按类型框架计算后，关键指标权重是否反映了类型特征
3. 默认展开的 1-2 个专题是否是该类型最关心的
4. 问题式标题是否针对该类型董办的真实关切
5. 切换到其他类型框架后内容是否同步刷新

## 七、风险与防御

**风险 1：用户对自家银行类型有不同认知**
- 防御：UI 允许 Step 2 切换框架；保留 universal 作为通用 fallback

**风险 2：多业务线银行被算法误分类**
- 防御：人工覆盖字段 + 多标签支持；类型判定依据可点开查看

**风险 3：类型间专题不一致带来跨行对比困难**
- 防御：报告封面明确标注框架；用户切换 universal 框架可恢复同口径对比

**风险 4：现有用户已经习惯通用 SPARC**
- 防御：所有类型框架仍输出 SPARC 五维分数，只是权重不同；不破坏已有的报告结构

## 八、与其他方向的协同

- **方向 K（自适应导航）**：本 PRD 是 K 的数据基础；K 在本 PRD 落地后做导航重排
- **方向 I（PB 时序）**：可以按类型分组做时序对比——"零售型银行 PB 时序 vs 对公型 PB 时序"
- **方向 A（EP 引擎）**：在不同类型框架下，EP 权重不同——零售型 EP 看 retail banking 经济利润，对公型 EP 看对公经济利润
- **方向 D（行业基线池）**：类型分组让"和行业基线对比"更精准——"和零售型基线"vs "和大盘基线"
- **方向 E（监管对话备忘）**：监管对零售型和对公型的关注点不同，备忘内容应该按类型差异化

## 九、不在本 PRD 范围

- 跨类型银行的合并/拆分对标（如平安银行=招行零售线+小微对公线，这种细致拆分是 v2）
- 银行类型在历史上的迁徙路径分析（如平安银行 corporate→retail 转型）放到方向 I 时序分析里
- 类型未识别银行的兜底逻辑（用户上传非上市/发债银行时如何分类）放到方向 D 基线池里
- 类型与 EP 的协同算法细节（放到方向 A 的 PRD 里）
