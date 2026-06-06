# Sprint IA-2 Portal 页面边界收口记录

日期：2026-06-05

## 本轮目标

把 Portal 从“旧长页面内容搬进左侧导航”继续收口成六个独立工作台页面，重点解决串页、重复导航和专题/证据/报告内容互相抢占首屏的问题。

## 已完成

1. 二级导航按当前一级页面过滤：
   - 经营质量页只显示“30秒诊断 / 行动路径”。
   - 证据地图页只显示“同业位置 / 异动偏离 / 估值答案”。
   - 专题分析页只显示“专题入口 / 行动路径”。

2. Step2 内部内容增加页面归属：
   - 证据桥梁句和三类证据容器归入 `evidence`。
   - 专题桥梁句和专题入口归入 `topics`。
   - 行动路径归入 `answer topics`。

3. 动态报告工作台归入 Report Studio：
   - `v3StickySummary` 和 `v3NarrativeWorkbench` 均标记为 `data-portal-page="report"`。
   - 避免报告预览摘要串到证据地图或专题分析。

4. 旧分析区块收口：
   - 故事线归入报告工作室。
   - 旧专题工作台归入专题分析。
   - 项目管理、方法论、治理类低频区块默认隐藏，不抢占 Portal 页面。

5. 新增合同测试：
   - `tests/portal_ia_v11_page_boundary_contract.test.js`
   - 固化页面归属、二级导航过滤、动态报告工作台隔离规则。

## 已验证

```bash
node --check js/19-product-workspace.js
node --check js/24-prd-v3-workbench.js
node --check js/42-portal-router.js
node tests/portal_ia_v11_page_boundary_contract.test.js
node tests/portal_ia_v10_contract.test.js
node tests/portal_ia_v10_router_canonical.test.js
node tests/portal_full_panel_layout_contract.test.js
node tests/board_questions_chair_brief_layout_contract.test.js
node tests/sprint7b_default_diagnosis_contract.test.js
```

## 下一步

1. 经营质量页：压缩重复摘要，形成“总判断 + 三个董事会议题 + 首要行动”的一屏结构。
2. 证据地图页：继续把同业位置、异动偏离、估值答案做成更清晰的纵向证据流。
3. 专题分析页：将专题卡和下方机制图统一为 SCR 版式，减少旧专题工作台和新专题卡之间的重复。
4. 报告工作室：把故事线、报告预览、章节编辑和导出控制整合为一个编辑工作台。
