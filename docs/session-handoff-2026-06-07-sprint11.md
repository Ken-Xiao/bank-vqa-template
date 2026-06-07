# BenchmarkIQ Portal Session Handoff｜2026-06-07

## 当前项目

项目目录：`/Users/jinkunxiao/Documents/业务/银行财报分析/outputs/vqa_template`

当前目标：继续把银行经营质量分析 Portal 从“页面展示”推进到“数据层、证据层、解读层、报告层一致”的工作台。重点是让前台文字不再像模板说明，而是基于已校验证据生成更自然的咨询和金融分析语言。

当前预览地址：

`http://127.0.0.1:8768/index.html#page/launch`

当前本地静态服务已重新启动，入口页、`data_ready.js`、`js/33-llm-commentary.js` 均已验证返回 `200 OK`。

## 本轮已经完成

### 1. Sprint 11A：Ready v2 数据治理层

已把三源数据治理结果生成到 ready 层：

- `data_governance/field_source_governance.json`
- `data_governance/field_source_governance.csv`
- `data_governance/annual_report_verification_2025.json`
- `data_governance/annual_report_verification_2025.csv`
- `data_ready.js`

`data_ready.js` 现在暴露：

- `records`
- `metricQuality`
- `fieldGovernance`
- `annualReportVerification`

字段职责已拆成四类：

- `primary`：经营主表
- `supplement`：接口补充，主要是市场估值和 Tushare 类字段
- `validation`：二零二五年报核验层，主要是核心监管和经营指标
- `detail-only`：附注明细和专题 drill 字段，例如零售贷款不良、投资资产、其他非息等

### 2. Data & Validation 页面新增年报核验层

在 `index.html` 的数据复核页新增“二零二五年报核验层”，用于展示：

- 银行
- 指标
- 主表值
- 年报抓取值
- 差异状态
- 字段职责
- 管理动作

前台渲染逻辑在 `js/03-data-format.js`：

- `annualVerificationStatusMeta`
- `annualVerificationSelectedRows`
- `annualVerificationSummary`
- `renderAnnualReportVerification`

该面板按当前目标银行和对标组过滤，不再固定显示苏州农商行样例。

### 3. Sprint 11B：解读层接入年报核验状态

已把 `annualReportVerification` 接入本地证据解读链路：

- `js/33-llm-commentary.js`
- `js/37-deepseek-rewrite-orchestrator.js`
- `js/38-evidence-pack-builder.js`

新增/强化逻辑：

- 银行级评论事实包包含 `dataVerification`
- 证据地图事实包包含 `dataVerification`
- 重写 prompt 的 `factPackSummary` 包含 `annualVerification`
- 本地模板根据核验状态自动调整语气：
  - 已核验比例高：可以形成更明确判断
  - 存在口径差异：结论可保留，但正式上会前需要复核底稿
  - 主表单源或待字段化：使用审慎语气，不形成强判断

### 4. 本地解读语言优化

本地模板从“系统说明型”改为更接近咨询和金融分析语言：

- 第一段先给判断
- 第二段给证据
- 第三段解释机制
- 第四段落到管理含义

示例表达方向：

- “本轮可以直接下判断”
- “不是被处理成单项指标波动”
- “问题不在于某个指标单点偏低，而在于同业位置、PB 定价和异动偏离是否同时指向同一个经营约束”
- “资本市场沟通的重点不应是提前宣称估值修复，而是说明经营质量、风险确认和同业位置是否足以支撑估值叙事”

### 5. Sprint 11C：核验状态前台化

已把年报核验状态从 Data & Validation 页面前移到主要业务页面：

- 证据地图三类证据卡新增核验标签：
  - 同业证据核验
  - 异动证据核验
  - 估值证据核验
- 专题入口和专题主体页新增“专题证据强度”提示。
- 客户任务台交付状态不再只看数据完整性，也读取年报核验判断。
- 报告工作室试点检查新增“年报核验状态：可上会 / 审慎表述 / 附录披露”。

口径规则：

- 已核验比例高且无冲突：可上会。
- 存在口径差异：审慎表述，正式上会前复核底稿。
- 指标未进入核心年报核验表但有专题事实包：按主表证据使用，审慎表述并保留来源脚注。
- 证据和核验均不足：附录披露或待补。

## 本轮验证

已通过：

```bash
python3 build_ready_data_layer.py
node --check js/01-state.js
node --check js/03-data-format.js
node --check js/33-llm-commentary.js
node --check js/37-deepseek-rewrite-orchestrator.js
node --check js/38-evidence-pack-builder.js
npm run test:data-bridge
npm run test:rewrite-orchestrator
```

新增/更新契约测试：

- `tests/sprint11a_ready_governance_contract.test.js`
- `tests/ready_data_layer_contract.test.js`
- `tests/ready_portal_bridge_contract.test.js`
- `tests/data_validation_bridge_contract.test.js`
- `tests/evidence_pack_lineage_contract.test.js`
- `tests/local_commentary_strength_contract.test.js`

## 当前未提交改动

本轮改动尚未 commit / push。

主要变更文件：

- `build_ready_data_layer.py`
- `data_ready.js`
- `index.html`
- `js/01-state.js`
- `js/03-data-format.js`
- `js/33-llm-commentary.js`
- `js/37-deepseek-rewrite-orchestrator.js`
- `js/38-evidence-pack-builder.js`
- `package.json`
- `styles/app.css`
- `docs/next-improvement-plan-consolidated.md`
- `docs/prd-board-storyline-cross-signal-engine.md`
- `docs/session-handoff-2026-06-07-sprint11.md`
- `data_governance/annual_report_verification_2025.*`
- `data_governance/field_source_governance.*`
- 相关测试文件

## 下一步建议

### Sprint 12：DeepSeek 接口恢复时的证据包协议

当前已先使用本地模板，不接 DeepSeek。后续如果重新接接口，应沿用当前规则：

- 请求中必须传 `factPack`
- 请求中必须传 `dataVerification`
- Prompt 必须要求：
  - 只能引用事实包
  - 已核验指标可强判断
  - 口径差异和主表单源必须降低语气
  - 不允许讲方法论，不允许编造数字，不允许给投资建议

## 给下个聊天的快速入口

下个聊天可以先读：

1. `docs/session-handoff-2026-06-07-sprint11.md`
2. `docs/next-improvement-plan-consolidated.md`
3. `docs/prd-board-storyline-cross-signal-engine.md`
4. `build_ready_data_layer.py`
5. `js/33-llm-commentary.js`
6. `js/37-deepseek-rewrite-orchestrator.js`

然后优先执行：

```bash
cd /Users/jinkunxiao/Documents/业务/银行财报分析/outputs/vqa_template
npm run test:data-bridge
npm run test:rewrite-orchestrator
python3 -m http.server 8768
```
