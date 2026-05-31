# Sprint 1 导出同源基础改造记录

更新时间：2026-05-31

## 本轮目标

按照项目计划进入 Sprint 1，优先处理“正式报告、PDF、PPTX 是否读取同一内容源”和“PPTX 是否能带图表证据”的问题。

## 已完成改造

### 0. 正式报告 contract 显式化

新增 `applyFormalReportContract()`，为正式报告每个顶层章节写入统一元数据：

- `data-slide-index`
- `data-slide-total`
- `data-section-id`
- `data-section-title`
- `data-module-label`
- `data-page-role`
- `data-deck-type`

HTML 导航和 PPTX 导出已改为优先读取这些字段，避免三类交付物各自推断页序、章节标题和页型。

### 1. 正式报告纳入图表证据章节

新增 `formalFigureAppendixSection()`，从页面中已配置的图表卡片读取图片、标题和说明，生成正式报告中的“图表证据”章节。

效果：

- 正式 HTML 报告不再只有文字判断。
- PDF 打印同源正式报告时可带图表页。
- PPTX 读取 `formalReport` 时可以拿到图片素材。

### 2. 导出 HTML 样式补齐 print CSS

`loadReportExportCss()` 已纳入 `styles/print.css`，避免正式 HTML 导出和打印版式在样式上脱节。

### 3. PPTX 图片读取增强

新增图片读取逻辑：

- PPTX 导出时优先读取正式报告 section 内的 `img`。
- `img[data-src]`、`currentSrc`、`src` 均可识别。
- 有图片时使用图文分栏页型；无图片时继续使用原正式报告对齐页型。

### 4. 图表素材路径已项目内化

延续 Sprint 0 的修复，图表素材已放入 `assets/figures/`，正式报告和 PPTX 不再依赖项目外路径。

### 5. 导出入口和文件名统一

统一页面按钮、导出菜单、文件名和状态提示：

- `导出正式报告 HTML`
- `打印/导出正式报告 PDF`
- `导出正式报告 PPTX`

新增 `formalReportExportMeta()`，统一生成导出格式、基础文件名、完整文件名和内容源说明。当前文件名格式统一为：

- `{目标银行显示名}_{年份}_正式报告.html`
- `{目标银行显示名}_{年份}_正式报告.pdf`
- `{目标银行显示名}_{年份}_正式报告.pptx`

状态提示统一说明：页序、章节标题、页型和图表证据读取同一正式报告内容树。

### 6. 导出前置检查切换到正式报告

增强 `preflightExport()` 使用的试点检查项，导出前不再只看旧版 `printDeck`，而是优先检查正式报告：

- 正式报告章节数
- `formalReport contract` 是否完整
- 是否包含封面、执行摘要等关键页型
- 图表证据章节是否存在
- 正式报告内图片是否加载失败

旧版中间稿页数保留为兼容参考，但不再作为唯一导出依据。

### 7. PPTX 机制归因专用页型

新增 `addMechanismAttributionSlide()`，正式报告中的“机制归因总览”章节不再回退到普通文字页，而是进入四象限机制归因页型：

- DuPont 三级分解
- 净利润归因瀑布
- NIM 归因
- 多基准线

新增 `pptxMechanismModuleGroups()`，把机制归因 Fact Pack 按模块整理为 PPTX 可渲染行。`formalReportDeckType()` 已将机制归因章节路由为 `mechanism` deck type。

### 8. PPTX 机制归因图形化

机制归因 PPTX 页型新增三类轻量图形：

- `addPptxProfitWaterfall()`：把净利润归因驱动项转成正负贡献条。
- `addPptxBenchmarkLineChart()`：把目标银行与均值、中位数、P25/P75、类型/全样本基准线放到同一横轴。
- `addPptxNimBridge()`：把净息差、资产收益率、负债成本和定期存款占比做成四段式桥接卡。

当前先完成 PPTX 内部图形化表达，不依赖外部图片或浏览器截图。

## 验收结果

| 验收项 | 结果 |
|---|---|
| `node --check js/07-export.js` | 通过 |
| `node --check js/13-pptx-export.js` | 通过 |
| `node --check js/22-formal-report.js` | 通过 |
| 页面资源引用检查 | `resources-ok` |
| `git diff --check` | 通过 |
| `buildFormalReportHtml({ exportMode: true })` smoke | 通过 |
| 正式报告是否包含 V6 董事会议题 | 通过 |
| 正式报告是否包含图表证据章节 | 通过 |
| 正式报告 contract 元数据生成 | 通过 |
| 导出入口、文件名和状态提示统一 | 通过 |
| 正式报告导出前置检查 | 通过 |
| `node tests/sprint1_pptx_mechanism_layout.test.js` | 通过，含瀑布、基准线、NIM桥数据结构与路由 |

contract smoke 当前识别 32 个正式报告章节，其中包含 cover、executive、deep-dive、chart-evidence、scenario、benchmark、appendix 等页型。

## 仍需补充

Playwright 包已找到，但自带 Chromium 尚未下载，本机 Chrome headless 启动后被系统侧关闭。因此还需要在浏览器能力可用后补做：

1. 页面真实截图验收。
2. HTML 导出文件目视检查。
3. PDF 打印分页检查。
4. PPTX 导出后检查是否包含正式报告页序和图表图片。

## 下一步

继续 Sprint 1 的高保真专项：补 PDF 分页目视验收、PPTX 图形页视觉截图，以及真实浏览器截图 QA。
