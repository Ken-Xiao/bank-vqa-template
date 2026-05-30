# 银行董办对标分析工具开发日志

## 2026-05-26 — 里程碑 A + B

### 背景

`index.html` 已膨胀至 6300+ 行 / 309KB，继续单文件堆叠功能会导致维护成本陡增。按路线图先完成工程拆分（里程碑 A），再落地多项目工作台与对标组治理（里程碑 B）。

---

### 里程碑 A：工程模块拆分

#### 目标

将单体 `index.html` 拆为「HTML 骨架 + 独立样式 + 分模块 JS」，降低后续迭代（AI 写稿、PPTX 导出）的改动风险。

#### 交付内容

| 路径 | 说明 |
| --- | --- |
| `index.html` | 仅保留页面结构与 script 引用（约 740 行） |
| `styles/app.css` | 自原 `<style>` 块完整抽出（约 47KB） |
| `js/01-state.js` | 全局状态、数据引用、`metricLabel` |
| `js/02-config.js` | 规则/指标字典加载、口径弹层、合规过滤 |
| `js/03-data-format.js` | 数据访问、覆盖率、对标模板、格式化 |
| `js/04-ui-selection.js` | 选择面板、事件绑定、`populateSelectors` |
| `js/05-analysis.js` | VQA 诊断、专题判断、AI 解读草稿 |
| `js/06-charts.js` | 图表渲染与图下解释 |
| `js/07-export.js` | 数据底稿、HTML 报告导出、图表取舍 |
| `js/08-report.js` | 演示报告母版、`renderAll` |
| `js/09-projects.js` | 多项目 + 对标组治理（里程碑 B） |
| `js/10-bootstrap.js` | `explainRules`、缩略图解释、`initApp` |
| `split_index.py` | 从单体 HTML 自动拆分的脚本（可重复执行） |
| `index.monolith.bak.html` | 拆分前完整备份 |

#### 加载顺序

```html
<script src="data.js"></script>
<script src="js/01-state.js"></script>
...
<script src="js/10-bootstrap.js"></script>
```

#### 技术说明

- 全局变量统一改为 `var`，确保多 script 标签间共享作用域。
- 拆分脚本按函数名分组；`explainRules` 与 `initApp` 保留在 `10-bootstrap.js`。
- **必须通过本地 HTTP 服务打开**（`fetch` 读取 json 配置），例如：

```bash
cd outputs/vqa_template
python3 -m http.server 8080
# 访问 http://localhost:8080/index.html
```

---

### 里程碑 B：多项目 + 对标组治理

#### 目标

满足 PRD-01 ~ PRD-11 的核心能力：多个分析项目本地复用、对标组可解释/可保存/可复用。

#### 交付内容

**1. 多项目管理（localStorage）**

| 能力 | 实现 |
| --- | --- |
| 新建/保存项目 | 输入项目名称 →「新建项目」或「保存当前项目」 |
| 项目列表 | `#projectList` 按 `savedAt` 倒序展示 |
| 加载项目 | 列表「加载」恢复目标银行、对标银行、年份、类型、报告版本、专题、图表取舍 |
| 复制项目 | 「复制当前」或列表「复制」生成副本 |
| 删除项目 | 列表「删除」 |
| 容量 | 本地最多 50 个项目 |
| 兼容 | 自动迁移旧键 `bankVqaLatestProject` → `bankVqaProjects` |

**2. 对标组治理**

| 能力 | 实现 |
| --- | --- |
| 推荐理由 | `#peerRecommendBox` 展示同类型/同区域/同规模/估值相近逻辑 |
| 保存对标组 | 输入名称 →「保存对标组」 |
| 复用对标组 | 列表「应用」恢复 peers/types/template/target |
| 删除对标组 | 列表「删除」 |
| 容量 | 本地最多 30 个对标组 |
| 存储键 | `bankVqaPeerGroups` |

**3. UI 变更**

- 控制区下方新增「分析项目管理」「对标组治理」两个面板。
- 对标模板下方新增「对标推荐理由」说明框。

#### 涉及文件

- `js/09-projects.js`（新增/重写）
- `js/01-state.js`（新增 `currentProjectId`）
- `js/10-bootstrap.js`（`initApp` 调用 `initProjectsModule()`）
- `index.html`（项目/对标组面板 HTML）
- `styles/app.css`（项目列表、对标组、推荐理由样式）

---

### 验收建议

1. 用 `python3 -m http.server` 打开页面，确认无控制台报错。
2. 选择口径 → 保存 2 个以上不同名称项目 → 刷新页面 → 列表仍在且可加载。
3. 调整对标银行 → 保存对标组 → 新建项目 → 应用对标组 → peers 恢复一致。
4. 切换对标模板 → `#peerRecommendBox` 文案随模板更新。
5. 导出演示报告 HTML / 选定数据底稿 → 功能与拆分前一致。

---

### 下一步建议（里程碑 C 及以后）

| 优先级 | 模块 | 说明 |
| --- | --- | --- |
| C1 | 真 `.xlsx` 导出 | 用 SheetJS 替代伪 xls |
| C2 | AI 写稿接口 | 事实包 JSON → LLM，只读不写数 |
| C3 | PPTX 导出 | 基于现有 HTML 母版页序转换 |
| C4 | ES Module 化 | 逐步将 `var` 全局改为 `import/export` + 构建脚本 |

---

### 备注

- 原单体文件备份：`index.monolith.bak.html`
- 如需重新拆分：先恢复备份到 `index.html`，再运行 `python3 split_index.py`

---

## 2026-05-26 — 里程碑 C + D（PRD 里程碑三/四）

### 背景

按 `银行董办对标分析工具下一阶段业务需求.md` 继续推进：AI 写稿可编辑、HTML 报告母版补全、PPTX 可编辑导出、对标组编辑与项目快照增强。

### 交付内容

| 模块 | 文件 | 说明 |
| --- | --- | --- |
| 结构化事实包 | `js/11-fact-pack.js` | PRD-24：专题/图表事实包统一结构，底稿新增「结构化事实包」sheet |
| AI 写稿 | `config/prompts.json` + `js/12-ai-narrative.js` | PRD-25~29：三类解读生成、textarea 编辑、重新生成、纳入 HTML/PPTX |
| PPTX 导出 | `js/13-pptx-export.js` | PRD-36~40：基于 `#printDeck` 页序导出 `.pptx`（PptxGenJS CDN 按需加载） |
| 专题判断增强 | `js/05-analysis.js` | 加权分位、必选引用指标降级提示 |
| 口径复核增强 | `js/02-config.js` | 规则版本展示、完整性 <60% 警告、跳转年度趋势 |
| HTML 报告母版 | `js/08-report.js` | 分析口径页、方法论页、按「纳入报告」过滤专题页 |
| 项目/对标组 | `js/09-projects.js` | 快照保存 `editedNarratives` / `includedTopics`；对标组增删编辑（PRD-11） |
| 规则版本 | `analysis_rules.json` | `product.rulesVersion: 2026.05.1` |

### 新增 script 加载顺序

```html
<script src="js/11-fact-pack.js"></script>
<script src="js/12-ai-narrative.js"></script>
<script src="js/13-pptx-export.js"></script>
<script src="js/10-bootstrap.js"></script>
```

### 验收建议

1. 本地 HTTP 打开 → 确认分析 → 专题工作台编辑解读 → 保存项目 → 刷新后文案仍在。
2. 取消某专题「纳入 HTML/PPTX 报告」→ 导出演示报告 HTML / PPTX → 该专题页不出现。
3. 点击指标名 → 口径弹层 →「查看年度趋势」→ 跳转到数据覆盖区趋势图。
4. 保存对标组 → 列表「编辑」增删银行 → `updatedAt` 更新。
5. 点击「导出 PPTX」→ 生成 `{目标银行}_{年份}_演示报告.pptx`，页序与 HTML 报告一致。

### 下一步建议

| 优先级 | 模块 | 说明 |
| --- | --- | --- |
| D1 | 真 LLM 写稿 | 事实包 JSON → 后端/LLM，前端只读不写数 |
| D2 | 真 `.xlsx` | SheetJS 替代伪 xls |
| D3 | PPTX 图表矢量优化 | SVG 转 PNG 高保真、母版样式细化 |
| D4 | ES Module 化 | `import/export` + 构建脚本 |

---

## 2026-05-26 — 客户试点版本深化（PRD 十六~二十）

### 背景

里程碑 C/D 完成后，按 PRD「客户试点版本验收清单」继续补齐报告版本差异、指标口径深化、图表页统一版式与证据指标规则。

### 交付内容

| 模块 | 文件 | 说明 |
| --- | --- | --- |
| 报告版本配置 | `analysis_rules.json` + `js/14-report-profiles.js` | PRD-63：不同报告版本控制默认纳入专题、HTML/PPTX 章节 |
| 页序对齐 | `js/08-report.js` | PRD-59：封面→目录→口径→方法论→经营摘要→VQA→汇报主线→专题→章节摘要→图表→行动→附录 |
| 指标口径深化 | `js/02-config.js` | PRD-49~53：业务含义、来源年份、2020-2025 年度可用性表 |
| 证据指标规则 | `js/05-analysis.js` | PRD-44：优先必选引用、排除缺失指标、尽量保证 ≥3 个证据 |
| 图表页版式 | `js/07-export.js` + `styles/app.css` | PRD-60：关键事实/董办解读/对标含义/类型均值/管理启示 |
| 规则版本展示 | `js/03-data-format.js` | PRD-47：选择摘要与项目摘要展示规则版本和报告语气 |
| 配置降级 | `js/05-analysis.js` | PRD-46：损坏专题配置跳过，不影响其他专题 |

### 报告版本默认行为

| 版本 | 默认纳入专题 | 报告章节 |
| --- | --- | --- |
| 董事会完整汇报版 | 五类专题 | 全章节 |
| 资本市场沟通版 | 估值/盈利/资本 | 无行动建议页 |
| 管理层行动版 | 盈利/息差/风险/资本 | 无方法论/VQA/图表/附录 |
| 一页摘要版 | 盈利/估值 | 仅经营摘要+VQA+行动 |

切换报告版本时会自动更新默认纳入专题，并提示用户保存项目。

### 验收建议

1. 切换「资本市场沟通版」→ 专题默认只保留 3 个 → 导出 HTML 无行动建议页。
2. 切换「一页摘要版」→ 导出报告仅保留摘要、VQA、行动三类页面。
3. 打开指标详情 → 可见业务含义、来源年份、2020-2025 可用性矩阵。
4. 专题证据区优先展示必选引用指标，缺失时有降级提示。
5. 图表导出页包含五块解读 + 图要回答/事实包/图表编号。

---

## 2026-05-26 — 试点交付增强（PRD-10/26/28 + 真 xlsx）

### 交付内容

| 模块 | 文件 | 说明 |
| --- | --- | --- |
| 图表解读编辑 | `js/15-chart-narrative.js` | PRD-28/29：五段图表解读可编辑、单图重生成，写入 HTML/PPTX |
| AI 写稿接口框架 | `config/ai_provider.json` + `js/12-ai-narrative.js` | PRD-26：支持 local/http 模式，HTTP 仅 POST 事实包，数字校验后 fallback |
| 真 xlsx 导出 | `js/07-export.js` | SheetJS CDN 导出 `.xlsx`，失败时回退伪 xls |
| 对标组快速复用 | `index.html` + `js/09-projects.js` | PRD-10：口径区下拉直接应用已保存对标组 |
| 目录专题明细 | `js/08-report.js` | PRD-56：目录页列出入选专题及董事会问题 |
| 专题页证据指标 | `js/08-report.js` | PRD-32：HTML 专题页增加证据指标区块 |
| PPTX 图表优化 | `js/13-pptx-export.js` | SVG 优先转 PNG 高保真嵌入 |
| 项目快照 | `js/01-state.js` + `js/09-projects.js` | 保存/加载 `editedChartStories` |

### AI 接口配置

编辑 `config/ai_provider.json`：

```json
{
  "provider": "http",
  "http": { "endpoint": "https://your-service/narrative" }
}
```

服务端应接收 `{ channel, prompt, factPack }` 并返回 `{ text }`。若返回数字不在事实包内，将自动回退本地模板。

### 验收建议

1. 展开图表缩略图 → 编辑「目标银行解读」→ 导出 HTML/PPTX 文案已变。
2. 点击「重新生成本图解读」→ 恢复模板文案。
3. 导出选定数据 → 文件扩展名为 `.xlsx`，Excel 可正常打开。
4. 口径区选择已保存对标组 → peers 立即应用。
5. 专题工作台点击「AI增强生成」→ 本地模板生成（未配置 endpoint 时）。

---

## 2026-05-26 — 试点留痕与导出一致性（PRD-47/55/63）

### 背景

按 PRD 客户试点验收清单，补齐报告版本驱动叙事、HTML 导出样式内联、待补数据底稿、动态图表解读与口径留痕；并修复专题叙事编辑器绑定回归。

### 交付内容

| 模块 | 文件 | 说明 |
| --- | --- | --- |
| 报告版本叙事 | `js/12-ai-narrative.js` + `js/14-report-profiles.js` | PRD-63：`getReportTopicNarratives()` / `topicReportCommentRows()` 按报告版本选主叙事 channel |
| 目录过滤 | `js/08-report.js` | 目录按 `deckTocSections()` 过滤；封面/口径页展示规则版本 |
| 动态图表解读 | `js/06-charts.js` + `js/15-chart-narrative.js` | `.chart-card` 同步五段解读；事实包增加指标链接 |
| HTML 导出 | `js/07-export.js` | 内联 `styles/app.css`；导出元信息含规则版本/AI 模式 |
| 待补数据底稿 | `js/07-export.js` | PRD-55：新增「待补数据清单」sheet（完整性 <60%） |
| 规则版本展示 | `js/02-config.js` + `index.html` + `styles/app.css` | PRD-47：口径区 badge + 选择摘要联动刷新 |
| PPTX 留痕 | `js/13-pptx-export.js` | 页脚追加规则版本 |
| 回归修复 | `js/05-analysis.js` | 恢复 `bindTopicNarrativeEditors()` 绑定 |

### 规则版本

`analysis_rules.json` → `product.rulesVersion`: **2026.05.3**

### 验收建议

1. 切换「资本市场沟通版」→ HTML 专题页主叙事为资本市场版，董事会版不再重复占主位。
2. 导出 HTML → 离线打开样式与页面一致，页眉含规则版本与 AI 模式。
3. 导出选定数据 → 「待补数据清单」sheet 列出低完整性指标及缺失原因。
4. 动态图表区 → 每张 `.chart-card` 可见五段解读与「重新生成本图解读」。
5. 专题工作台 → textarea 编辑与「AI增强生成」按钮可正常触发。
6. 口径区 → 显示「规则版本 2026.05.3」badge。

---

## 2026-05-26 — 苏农汇报材料母版对齐（HTML + PPTX）

### 背景

按 `数据/更新版数据/苏州农商行沟通材料/苏农汇报材料.pptx` 与 `rsm_ppt_theme.py` / `演示文稿模板配置指南.txt`，将 HTML 演示报告与 PPTX 导出统一为 RSM 金融咨询母版。

### 参考规范

| 项 | 苏农材料规范 |
| --- | --- |
| 画幅 | 20 × 11.25 in（16:9 宽屏） |
| 主色 | #0056A8 / #1A3A5C |
| 辅色 | #4FB0E2 / #B0C4DE / #7090A8 |
| 字体 | PingFang SC / Microsoft YaHei / Arial |
| 页脚 | 审计｜税务｜咨询 © 2026 RSM 版权所有 + 页码 + 数据来源 |

### 交付内容

| 模块 | 文件 | 说明 |
| --- | --- | --- |
| 共享主题 | `js/17-rsm-deck-theme.js` | 配色、封面/模块条/页脚 helper |
| 汇报样式 | `styles/rsm-deck.css` | 508×286mm 幻灯片、封面双栏、目录侧栏、图表页 |
| HTML 结构 | `js/08-report.js` | 全部 print-slide 改用 RSM 模块条 + 页脚编号 |
| PPTX 导出 | `js/13-pptx-export.js` | 自定义 RSM_WIDE 布局，封面/目录/内容三类页型 |
| HTML 导出 | `js/07-export.js` | 内联 `app.css` + `rsm-deck.css` |
| 入口 | `index.html` | 加载 rsm-deck.css 与 17-rsm-deck-theme.js |

### 验收建议

1. 确认分析口径 → 预览 print deck → 封面为「董事会汇报 + 元数据侧栏 + 阅读路径」。
2. 目录页左侧深蓝侧栏、右侧章节列表。
3. 内容页顶部 `#1A3A5C` 模块条 + 右上角 RSM 标识。
4. 页脚显示版权、数据来源、`01 / NN` 页码。
5. 导出 HTML → 离线打开版式与页面一致。
6. 导出 PPTX → PowerPoint 打开为 20×11.25 宽屏，页序与 HTML 一致。
