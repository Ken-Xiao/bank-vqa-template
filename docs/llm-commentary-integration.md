# 自然语言模型评论接入说明

## 当前接入方式

前端新增 `js/33-llm-commentary.js`，负责生成当前选定银行的 `bank-commentary` 事实包，并输出董事会版、资本市场版、管理层行动版三类评论。

Sprint 8A 已把银行级评论接入交付链路：

- 页面 AI 面板可切换三种评论频道。
- 形成分析结果后自动调用模型接口，按当前目标银行、年份、对标组和报告场景生成银行级三版本评论。
- 自动刷新专题解读，后续专题页、证据页和报告页读取同一套模型生成语言。
- 正式报告执行摘要会展示三种评论，作为行长版摘要的语言层。
- 数据底稿新增“银行级模型评论”工作表，记录版本、来源、事实包约束和正文。

当前配置已经切到本地 HTTP 代理模式。前端只访问本机代理，不直接持有 API key：

```json
{
  "provider": "http",
  "http": {
    "endpoint": "http://127.0.0.1:8788/api/llm-narrative",
    "commentaryEndpoint": "http://127.0.0.1:8788/api/llm-commentary",
    "timeoutMs": 45000
  }
}
```

当需要接自然语言模型时，不建议在浏览器里放 API key。当前项目已经新增本地 DeepSeek 代理：

```text
server/deepseek-commentary-proxy.js
```

## 第一次配置流程

1. 复制环境变量样例：

```bash
cp .env.example .env
```

2. 打开 `.env`，填入 DeepSeek API key：

```bash
DEEPSEEK_API_KEY=sk-你的DeepSeekKey
```

3. 启动本地代理：

```bash
npm run deepseek:proxy
```

默认监听：

```text
http://127.0.0.1:8788
```

如需不调用远端、只测试前后端链路：

```bash
npm run deepseek:local
```

4. 打开 Portal 页面，点击“形成分析结果”。系统会自动调用模型接口，为当前银行生成银行级三版本评论，并刷新专题解读。如果代理或模型不可用，前端会自动退回本地模板；如果模型输出未通过事实数字校验，代理会返回 fallback 解释包。

当前 `config/ai_provider.json` 推荐配置为：

```json
{
  "version": "2026.06-deepseek-v1",
  "provider": "http",
  "http": {
    "endpoint": "http://127.0.0.1:8788/api/llm-narrative",
    "commentaryEndpoint": "http://127.0.0.1:8788/api/llm-commentary",
    "timeoutMs": 45000
  },
  "validation": {
    "requireFactPackNumbers": true,
    "fallbackToLocal": true
  }
}
```

## 前端请求格式

前端会向 `commentaryEndpoint` 发送。`channel` 可取 `board`、`market`、`action`：

```json
{
  "kind": "bank-commentary",
  "channel": "board",
  "prompt": {
    "role": "董事会版评论",
    "instruction": "请为当前银行生成咨询式评论...",
    "requiredStructure": ["核心判断", "关键证据", "机制解释", "管理含义"],
    "factPack": {}
  },
  "factPack": {
    "bank": "目标银行",
    "year": "2023",
    "diagnosis": {},
    "sparc": [],
    "pb": {},
    "anomalies": {},
    "topics": [],
    "guardrails": {
      "noExternalNumbers": true,
      "citeFactPackOnly": true,
      "riskAwareTone": true,
      "noInvestmentAdvice": true
    }
  }
}
```

## 后端返回格式

后端可以返回简单文本：

```json
{ "text": "生成后的评论文本" }
```

也兼容：

```json
{ "content": "生成后的评论文本" }
```

或：

```json
{ "commentary": "生成后的评论文本" }
```

更推荐返回结构化解释包：

```json
{
  "source": "deepseek",
  "explanationPackage": {
    "viewpoint": "核心观点：当前最重要的经营质量判断、矛盾或优先级",
    "conclusion": "核心判断",
    "evidence": [
      { "metric": "nim", "text": "净息差证据说明" }
    ],
    "mechanism": "机制解释",
    "soWhat": "管理含义：该判断对董事会、资本市场沟通或管理动作意味着什么",
    "counterEvidence": "反证/风险边界：哪些数据缺口、口径风险或相反证据会削弱当前观点",
    "actions": [
      {
        "window": "0-3个月",
        "owner": "资产负债管理条线",
        "action": "复核负债成本下降是否覆盖资产收益率下行",
        "trackingMetric": "nim"
      }
    ],
    "citations": ["nim", "pb"],
    "qualityWarnings": [],
    "confidence": "medium"
  },
  "commentary": "供旧前端兼容的一段文本",
  "validation": { "ok": true, "issues": [] }
}
```

前端 `js/33-llm-commentary.js` 会优先读取 `explanationPackage`，并拼成展示文本；如果没有结构化包，则继续兼容 `text`、`content` 或 `commentary`。

## 语言风格

当前模型输出采用券商研究员和咨询公司风格，核心原则是观点先行，而不是指标说明先行：

- 先给观点：直接判断当前银行经营质量的主要矛盾、优先级或边际变化。
- 再给证据：每个观点必须绑定事实包中的指标、对标组或数据质量信息。
- 解释机制：说明为什么这些指标共同指向该判断，不能只解释指标定义。
- 回答 So What：说明该判断对董事会、资本市场沟通或管理动作意味着什么。
- 保留风险边界：列出口径风险、字段缺失、对标组不稳定或相反证据。

## 后端应做的事情

1. 读取服务端环境变量中的模型 API key。
2. 接收前端事实包，不允许前端传 key。
3. 把 `prompt.instruction`、`factPack` 和 Ready 数据质量信息发给模型。
4. 要求模型只使用事实包里的数字。
5. 要求模型输出 JSON 解释包，包含结论、证据、机制、行动、引用和质量提示。
6. 后端校验模型输出；如果数字或引用不合格，返回 fallback 解释包。
7. 如果模型失败，前端会自动退回本地模板。

## 推荐 Prompt 约束

- 先给核心判断，不要先解释方法。
- 每段至少绑定一个目标银行事实。
- 不得生成事实包之外的数字。
- 不得使用投资建议语言。
- 遇到口径风险时降级表达。
- 输出结构为：核心判断、关键证据、机制解释、管理含义。

## DeepSeek 配置

DeepSeek 使用 OpenAI-compatible Chat Completion。代理默认调用：

```text
https://api.deepseek.com/chat/completions
```

默认模型来自：

```text
config/deepseek_explanation_prompts.json
```

也可以通过环境变量覆盖：

```bash
export DEEPSEEK_MODEL="deepseek-chat"
export DEEPSEEK_BASE_URL="https://api.deepseek.com"
```

API key 只允许放在服务端环境变量 `DEEPSEEK_API_KEY` 中。
