# Sprint 0 稳定性验收记录

更新时间：2026-05-31

## Sprint 0 目标

本轮不新增业务功能，目标是把当前 V6 版本冻结成后续 Sprint 1 可以继续开发的稳定基线。重点验证：

1. V6 董事会议题、异动雷达、PB行动页相关代码已接入页面和正式报告。
2. HTML/PDF/PPTX 导出链路的基础资源可访问。
3. 当前 JS、JSON、样式和图片资源不存在明显阻断问题。

## 本轮修复

### 1. 图表图片路径收敛到项目内

发现 `index.html` 原先通过 `data-src="../../数据/更新版数据/选中数据/选中图片/..."` 引用图表。该路径在本地静态服务器下不可稳定访问，会导致专题图表页和 PPTX 图像素材缺失。

处理方式：

- 新增 `assets/figures/`。
- 将 RSM 色板版 16:9 图表素材复制到项目内。
- 将 `index.html` 中 26 个图表 `data-src` 改为 `assets/figures/...`。

验收结果：

- 本地资源检查结果为 `resources-ok`。
- `assets/figures/` 当前包含 31 个 PNG 图表文件及说明文件。

## 已通过的静态验收

| 验收项 | 结果 |
|---|---|
| `node --check js/05-analysis.js` | 通过 |
| `node --check js/08-report.js` | 通过 |
| `node --check js/13-pptx-export.js` | 通过 |
| `node --check js/22-formal-report.js` | 通过 |
| `node --check js/27-v6-boardroom-engine.js` | 通过 |
| `analysis_rules.json` / `config/language_discipline.json` / `config/prompts.json` JSON 解析 | 通过 |
| `git diff --check` | 通过 |
| `curl -I http://127.0.0.1:8770/` | 200 OK |
| 页面资源引用检查 | 通过 |

## 已通过的业务 smoke

使用 Node VM 对核心 V6 业务函数做了三类银行样本验证：

| 样本类型 | 样本银行 | 验证内容 | 结果 |
|---|---|---|---|
| 大行 | 工商银行 | 董事会议题生成、V6正式报告段落生成 | 通过 |
| 股份行 | 招商银行 | 董事会议题生成、V6正式报告段落生成 | 通过 |
| 城农商 | 苏州农商行 | 董事会议题生成、V6正式报告段落生成 | 通过 |

输出摘要：

- 每家样本银行均生成 3 个董事会议题。
- V6 正式报告段落 HTML 均成功生成。
- `buildFormalReportHtml({ exportMode: true })` 可生成正式报告 HTML，且包含 `formal-v6-boardroom`。

## 当前仍需人工/浏览器目视确认

Chrome headless 启动审批两次超时，因此本轮未完成真实浏览器截图级验收。后续需要补做：

1. 浏览器打开 `http://127.0.0.1:8770/`，选择一家大行、一家股份行、一家城农商。
2. 检查总览、专题、正式报告无 console error。
3. 导出正式 HTML，确认有颜色、有版式、图表资源正常。
4. 使用浏览器打印或保存 PDF，确认不是白版，分页可读。
5. 导出 PPTX，确认至少有标题、图表/图片、关键证据块。

## Sprint 0 结论

当前 V6 代码已通过静态和函数级 smoke，且修复了图表资源不可访问这个会影响正式报告和 PPTX 的阻断问题。建议在补完浏览器目视验收后，将当前 V6 作为 Sprint 1 的稳定基线。

## 本轮补强

- 新增 Sprint 0 稳定基线面板，集中展示静态资源、规则版本、指标字典、字段矩阵和自动化回归状态。
- 新增跨 Sprint 契约测试 `tests/sprint_cross_upgrade_contract.test.js`，把 Sprint 0/2/3/4 的关键交付点放入同一条回归链。
- 稳定基线仍保留真实浏览器截图 QA 作为待恢复项，避免在未恢复浏览器链路前误报完成。
