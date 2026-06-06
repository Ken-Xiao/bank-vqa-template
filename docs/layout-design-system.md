# BenchmarkIQ 版式设计规范 v1

定稿日期：2026-06-01
适用范围：Step 1 选择银行、Step 2 默认诊断、Step 3 正式报告、专题深钻、数据/复核 Tab、HTML/PDF/PPTX 同源页。

## 一、设计原则

整个产品的版式追求两件事：**呈现紧凑**和**专业可信**。这两件事容易冲突——紧凑会牺牲可读性，过度专业会臃肿。本规范用一句话定调：

> **优先保护字符的完整性和数字的对齐，其次才是空间利用率。**

具体落实为五条铁律：

1. **任何包含数据的表格**必须 `table-layout: fixed` + `font-variant-numeric: tabular-nums`。这两条只要不加，列宽会随内容抖动、小数点不对齐，专业感立刻丢一半。
2. **任何承载中文名称的 grid 列**最小宽度不得低于 96px。低于这个值，「中/国/农/业/银/行」会被强行换行成单字纵列。
3. **图表卡片的标题区**用 `display: flex; justify-content: space-between`。这是「标题与右上操作按钮撞车」的唯一稳妥解。
4. **阴影分两档**：标准卡片 `0 10px 28px rgba(6,27,58,.08)`，强调卡片 `0 16px 44px rgba(6,27,58,.14)`。第三档（更大或更亮）只在 modal / drawer 用。
5. **圆角分两档**：内容卡 6px，按钮 4px。其他硬编码（2px、8px、10px）一律清除。

## 二、栅格规范

| 视口 | 默认列数 | 边距 | 列间 gap |
|---|---:|---|---:|
| ≥ 1600px | 三列居中（max-width 1600px） | 32px | 16px |
| 1100-1600px | 三列流式 | 24px | 14px |
| 760-1100px | 两列 | 16px | 12px |
| < 760px | 单列 | 12px | 10px |

**多列网格的最小列宽规则**：

| 内容类型 | 最小列宽 |
|---|---:|
| 中文银行名 + 数字 | 104px |
| 纯指标卡（KPI） | 160px |
| 含一句话标题 + 数字 | 200px |
| 专题卡（标题 + 段落） | 280px |

**禁用模式**：`grid-template-columns: repeat(N, minmax(0, 1fr))` 在 N ≥ 4 时一律改为 `repeat(auto-fit, minmax(<最小列宽>, 1fr))`。这是上面所有"窄列挤压"问题的根因。

## 三、表格规范

### 3.1 基础保护（所有数据表必须）

```css
table, .data-table, .peer-heatmap-row, .field-matrix-table, .topic-fact-table, .metric-year-table {
  table-layout: fixed;
  font-variant-numeric: tabular-nums;
  width: 100%;
  border-collapse: collapse;
}
th, td {
  overflow-wrap: anywhere;
  word-break: keep-all;  /* 中文不在字符间断行 */
}
td {
  white-space: normal;
  vertical-align: middle;
}
```

`word-break: keep-all` 是关键——它告诉浏览器中文词组之间可以断（如「净息差」可以单独成行），但不允许在一个词内部把「净/息/差」拆成单字纵向排列。

### 3.2 表头规范

- 字号 12px，font-weight 900，颜色 var(--navy)
- padding: 10px 12px
- 背景 #eaf2f8（淡蓝带灰）或 var(--blue)（强调）
- `white-space: normal`（表头允许换行，但不允许拆字——配合 keep-all 即可）

### 3.3 数据单元规范

- 字号 13px（屏幕）/ 10.5px（打印）
- padding: 10px 12px（屏幕）/ 6px 8px（打印）
- 数字右对齐（`text-align: right`），文字左对齐
- 数字单元 `font-family: 'Inter', 'PingFang SC', sans-serif`，保证 tabular-nums 生效

### 3.4 银行名列规范

- 最小宽度 104px
- `white-space: nowrap` + `text-overflow: ellipsis` + `overflow: hidden`，配合 `title` 属性显示完整名称
- 如果产品决定允许换行：`word-break: keep-all` + `overflow-wrap: anywhere`，确保「农商行」不会拆成三个字

## 四、图表规范

### 4.1 chart-card 容器

```css
.chart-card {
  padding: 16px;
  border: 1px solid var(--line);
  border-top: 5px solid var(--blue);
  border-radius: 6px;
  background: #fff;
  box-shadow: 0 10px 28px rgba(6, 27, 58, .08);
  overflow: hidden;
}
.chart-card-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 12px;
  margin-bottom: 12px;
}
.chart-card-header h3 { min-width: 0; }
.chart-card-actions { flex-shrink: 0; }
```

### 4.2 Canvas 容器

- 高度保底：`min-height: 240px; max-height: 360px`
- 容器 `overflow: hidden` 防止 Chart.js 在 resize 时短暂溢出
- 父容器宽度变化时显式 `chart.resize()`（JS 侧确保）

### 4.3 Legend / 轴标签

- Legend 容器 `display: flex; flex-wrap: wrap; gap: 8px 14px`，每个 item `white-space: nowrap`
- X 轴标签如果超过 6 个，自动旋转 30°（Chart.js 配置）
- 数据标签（在柱顶/线点上）和轴标签**不能同色同字号**，专业图必须有层级：数据标签 12px navy 900，轴标签 11px muted 700

### 4.4 标注层

- 章节解释、注脚统一用 `.chart-annotation`，padding 8px 12px，背景 var(--soft)，字号 12px
- 不在 canvas 内部叠加文字图层（用绝对定位），全部走 DOM 层

## 五、紧凑度规范

### 5.1 间距 token

| Token | 像素 | 用途 |
|---|---:|---|
| `--sp-1` | 6 | 同组元素内部紧贴（chip 间） |
| `--sp-2` | 10 | 同卡片内段落间 |
| `--sp-3` | 14 | 卡片标题与正文 |
| `--sp-4` | 18 | 卡片之间 |
| `--sp-5` | 28 | 区块之间 |
| `--sp-6` | 48 | 章节之间 |

**禁用**：8px、12px、16px、20px、24px、32px。这些值都会被替换为最近的 token。

### 5.2 字体层级（v1.1：2026-06-01 落地为 9 档）

| Token | 像素 | 用途 |
|---|---:|---|
| `--font-label` | 11 | kicker、表头副标、最小注脚 |
| `--font-caption` | 12 | 高密度数据表的次要文本 |
| `--font-small` | 13 | 注脚、表格主体数值 |
| `--font-body` | 15 | 正文、卡片描述 |
| `--font-body-lg` | 18 | 强调正文、列表大段 |
| `--font-section` | 20 | 卡片标题 |
| `--font-hero` | 28 | 页面/章节标题 |
| `--font-display` | 34 | KPI 大数字辅助、Step 2 总判断 |
| `--font-kpi` | 36 | 关键数字 |

**落地情况**：原 6 档不够覆盖现有视觉层级，落地时扩为 9 档。已把 `styles/app.css`（451 处）+ `styles/rsm-consulting-ppt.css`（22 处）共 473 处硬编码字号全部替换为 token。`styles/rsm-deck.css` 暂未 token 化——它服务于固定 1280×720 的演示文稿渲染，px 比例锁定，token 化反而会破坏 deck 比例。

**字号映射规则**（v1.1 实施）：

| 原始 px | → Token | 实际 px | 视觉变化 |
|---:|---|---:|---|
| 9, 10, 11 | `--font-label` | 11 | +0 ~ +2 |
| 12 | `--font-caption` | 12 | 0 |
| 13 | `--font-small` | 13 | 0 |
| 14, 15, 16 | `--font-body` | 15 | ±1 |
| 17, 18 | `--font-body-lg` | 18 | 0 ~ +1 |
| 19, 20, 21, 22 | `--font-section` | 20 | -2 ~ +1 |
| 23, 24, 26, 27, 28, 30 | `--font-hero` | 28 | -2 ~ +5 |
| 31, 32, 34 | `--font-display` | 34 | 0 ~ +3 |
| 43 | `--font-kpi` | 36 | -7（一处特例） |

**规则**：每个区块只允许出现 2-3 档，避免视觉杂乱。新增样式必须用 token，不允许引入新的 px 字号。

### 5.3 颜色层级

- 主色 navy `#061d3c` 用于标题与关键数字
- 强调蓝 blue `#0099d8` 用于卡片顶边、链接、强调按钮
- 文本 ink `#1c2733`，次要 muted `#5d6670`
- 警示色：好 `#1f9e6f`，中 `#d28f10`，差 `#c0392b`，不再引入其他红绿橙

## 六、专业感规范

### 6.1 阴影分级

```css
:root {
  --shadow-card: 0 10px 28px rgba(6, 27, 58, .08);    /* 标准 */
  --shadow-emph: 0 16px 44px rgba(6, 27, 58, .14);    /* 强调 */
  --shadow-overlay: 0 24px 60px rgba(6, 27, 58, .22); /* modal/drawer */
}
```

清除所有 `0 12px 28px`、`0 14px 34px`、`0 18px 55px` 等中间档。

### 6.2 边框分级

- 内容卡：`1px solid var(--line)` (`#dce4ec`)
- 强调卡：左边或上边 `5px solid var(--blue)`，其余 1px
- 表格内分隔线：0.5px 实线 `#e7eef5`（屏幕 hairline，PDF 自动 1px）

### 6.3 圆角分级

- 卡片：6px (`var(--card-radius)`)
- 按钮、tag、chip：4px
- 像素图标按钮：50%（圆形）

不允许使用 2px、8px、10px、12px、999px（除非药丸 tag）。

## 七、本轮实施的 P0 修复

按"影响面 × 工程量"排序，下面五项立即写入 CSS：

1. **`.peer-heatmap-row` 最小列宽 74 → 104px**，避免银行名纵向单字。
2. **所有 data-table 加 `tabular-nums` + `word-break: keep-all`**，数字对齐 + 中文不拆字。
3. **`.chart-card` 标题区改 flex space-between**，防止标题和操作按钮撞车。
4. **多列 grid 在 < 1100px 视口自动降级**，避免 4 列以上挤压。
5. **阴影 / 圆角 token 化**，清掉杂乱的中间档。

## 八、不在本轮做（待后续 Sprint）

- 全量字号 token 化：现有代码中硬编码字号约 300 处，本轮只处理表/图最痛点。
- PPTX 母版同步：需在 reportModel 抽取（7D-0）之后做。
- 暗色模式：当前产品定位是董办白底报告，不需要暗色。
- 响应式移动端深度优化：用户场景是 1440/1920 投屏 + 1280 笔记本，移动端只保留可用。

## 九、验收方式

每次涉及版式的 PR 必须截图三家回归样本（一家大行、一家股份行、一家城农商）在三个视口（1920/1440/1280）下的：
- Step 1 选择银行页
- Step 2 默认诊断页（含同业热力矩阵、Top Changes、专题卡）
- Step 3 正式报告（HTML 渲染）

任何一张截图出现：单字纵列、字符叠加、卡片溢出、CTA 被遮，PR 不合并。
