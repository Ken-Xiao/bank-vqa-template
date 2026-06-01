# 自然语言模型评论接入说明

## 当前接入方式

前端新增 `js/33-llm-commentary.js`，负责生成当前选定银行的 `bank-commentary` 事实包，并输出董事会版、资本市场版、管理层行动版三类评论。

Sprint 8A 已把银行级评论接入交付链路：

- 页面 AI 面板可切换三种评论频道。
- 正式报告执行摘要会展示三种评论，作为行长版摘要的语言层。
- 数据底稿新增“银行级模型评论”工作表，记录版本、来源、事实包约束和正文。

默认配置仍为本地模板：

```json
{
  "provider": "local",
  "http": {
    "endpoint": "",
    "commentaryEndpoint": "",
    "timeoutMs": 30000
  }
}
```

当需要接自然语言模型时，不建议在浏览器里放 API key。推荐新增一个后端代理接口，例如：

```json
{
  "provider": "http",
  "http": {
    "commentaryEndpoint": "/api/llm-commentary",
    "timeoutMs": 30000
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

后端返回以下任一字段即可：

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

## 后端应做的事情

1. 读取服务端环境变量中的模型 API key。
2. 接收前端事实包，不允许前端传 key。
3. 把 `prompt.instruction` 和 `factPack` 发给模型。
4. 要求模型只使用事实包里的数字。
5. 返回一段中文咨询评论。
6. 如果模型失败，前端会自动退回本地模板。

## 推荐 Prompt 约束

- 先给核心判断，不要先解释方法。
- 每段至少绑定一个目标银行事实。
- 不得生成事实包之外的数字。
- 不得使用投资建议语言。
- 遇到口径风险时降级表达。
- 输出结构为：核心判断、关键证据、机制解释、管理含义。
