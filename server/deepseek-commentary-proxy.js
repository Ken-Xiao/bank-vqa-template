#!/usr/bin/env node

const http = require("http");
const fs = require("fs");
const path = require("path");

const ROOT = path.resolve(__dirname, "..");
const PROMPT_PATH = path.join(ROOT, "config", "deepseek_explanation_prompts.json");

function loadDotEnv(filePath = path.join(ROOT, ".env")) {
  if (!fs.existsSync(filePath)) return;
  const lines = fs.readFileSync(filePath, "utf8").split(/\r?\n/);
  lines.forEach((line) => {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) return;
    const match = trimmed.match(/^([A-Za-z_][A-Za-z0-9_]*)=(.*)$/);
    if (!match) return;
    const key = match[1];
    if (process.env[key] !== undefined) return;
    let value = match[2].trim();
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    process.env[key] = value;
  });
}

loadDotEnv();

const PORT = Number(process.env.PORT || process.env.DEEPSEEK_PROXY_PORT || 8788);
const DEEPSEEK_BASE_URL = process.env.DEEPSEEK_BASE_URL || "https://api.deepseek.com";
const DEEPSEEK_MODEL = process.env.DEEPSEEK_MODEL || "";

function readPromptConfig() {
  return JSON.parse(fs.readFileSync(PROMPT_PATH, "utf8"));
}

function sendJson(res, status, payload) {
  res.writeHead(status, {
    "Content-Type": "application/json; charset=utf-8",
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type"
  });
  res.end(JSON.stringify(payload));
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    let body = "";
    req.on("data", (chunk) => {
      body += chunk;
      if (body.length > 2_000_000) {
        reject(new Error("request body too large"));
        req.destroy();
      }
    });
    req.on("end", () => resolve(body));
    req.on("error", reject);
  });
}

function flattenValues(value, out = []) {
  if (value === null || value === undefined) return out;
  if (Array.isArray(value)) {
    value.forEach((item) => flattenValues(item, out));
    return out;
  }
  if (typeof value === "object") {
    Object.values(value).forEach((item) => flattenValues(item, out));
    return out;
  }
  out.push(String(value));
  return out;
}

function factPackNumberTokens(factPack) {
  return flattenValues(factPack)
    .flatMap((text) => String(text).match(/-?\d+(?:\.\d+)?(?:x|%|bp|个百分点|基点|分)?/gi) || [])
    .map((token) => token.replace(/基点/g, "bp").replace(/个百分点/g, "").trim())
    .filter((token) => token.length >= 1);
}

function packageClaimValues(pkg) {
  if (!pkg || typeof pkg !== "object") return [];
  const claims = [
    pkg.viewpoint,
    pkg.conclusion,
    pkg.mechanism,
    pkg.soWhat,
    pkg.counterEvidence
  ];
  if (Array.isArray(pkg.evidence)) {
    pkg.evidence.forEach((item) => {
      claims.push(item?.text);
    });
  }
  if (Array.isArray(pkg.actions)) {
    pkg.actions.forEach((item) => {
      claims.push(item?.action, item?.trackingMetric);
    });
  }
  return claims;
}

function outputNumberTokens(payload) {
  return flattenValues(packageClaimValues(payload))
    .flatMap((text) => String(text).match(/-?\d+(?:\.\d+)?(?:x|%|bp|个百分点|基点|分)?/gi) || [])
    .map((token) => token.replace(/基点/g, "bp").replace(/个百分点/g, "").trim())
    .filter((token) => token.length >= 1);
}

function numberAllowed(token, allowedTokens) {
  const normalized = token.replace(/[^\d.-]/g, "");
  if (!normalized) return true;
  return allowedTokens.some((allowed) => {
    const a = allowed.replace(/[^\d.-]/g, "");
    return a && (a === normalized || a.includes(normalized) || normalized.includes(a));
  });
}

function validateExplanationPackage(pkg, requestPayload) {
  const issues = [];
  const allowedNumbers = factPackNumberTokens(requestPayload.factPack || {});
  const outputNumbers = outputNumberTokens(pkg);
  const unexpected = outputNumbers.filter((token) => !numberAllowed(token, allowedNumbers));
  if (unexpected.length) issues.push(`存在事实包外数字：${[...new Set(unexpected)].slice(0, 6).join("、")}`);

  if (!pkg || typeof pkg !== "object") issues.push("模型未返回 JSON 对象");
  if (!pkg.viewpoint) issues.push("缺少 viewpoint");
  if (!pkg.conclusion) issues.push("缺少 conclusion");
  if (!pkg.mechanism) issues.push("缺少 mechanism");
  if (!pkg.soWhat) issues.push("缺少 soWhat");
  if (!pkg.counterEvidence) issues.push("缺少 counterEvidence");
  if (!Array.isArray(pkg.evidence) || pkg.evidence.length < 1) issues.push("缺少 evidence");
  if (!Array.isArray(pkg.actions) || pkg.actions.length < 1) issues.push("缺少 actions");
  if (!Array.isArray(pkg.citations) || pkg.citations.length < 2) issues.push("citations 少于 2 个");

  return {
    ok: issues.length === 0,
    issues
  };
}

function commentaryTextFromPackage(pkg) {
  const evidence = Array.isArray(pkg.evidence)
    ? pkg.evidence.map((item) => item.text).filter(Boolean).join("；")
    : "";
  const actions = Array.isArray(pkg.actions)
    ? pkg.actions.map((item) => `${item.window || "待定窗口"}：${item.action || ""}`).filter(Boolean).join("；")
    : "";
  return [
    pkg.viewpoint ? `核心观点：${pkg.viewpoint}` : "",
    pkg.conclusion,
    evidence ? `关键证据：${evidence}。` : "",
    pkg.mechanism ? `机制解释：${pkg.mechanism}` : "",
    pkg.soWhat ? `管理含义：${pkg.soWhat}` : "",
    pkg.counterEvidence ? `风险边界：${pkg.counterEvidence}` : "",
    actions ? `落地建议：${actions}。` : ""
  ].filter(Boolean).join("");
}

function buildMessages(requestPayload, promptConfig) {
  const channel = requestPayload.channel || "board";
  const channelRule = promptConfig.channelRules?.[channel] || promptConfig.channelRules?.board || "";
  const system = [
    ...(promptConfig.system || []),
    channelRule,
    `输出 JSON 结构必须符合：${JSON.stringify(promptConfig.schemaInstruction?.requiredJsonShape || {})}`
  ].join("\n");
  const user = {
    task: "基于事实包生成银行经营质量解释包",
    channel,
    prompt: requestPayload.prompt || {},
    factPack: requestPayload.factPack || {},
    readyDataQuality: requestPayload.readyDataQuality || []
  };
  return [
    { role: "system", content: system },
    { role: "user", content: JSON.stringify(user) }
  ];
}

async function callDeepSeek(requestPayload) {
  const apiKey = process.env.DEEPSEEK_API_KEY;
  if (!apiKey) throw new Error("DEEPSEEK_API_KEY is not set");

  const promptConfig = readPromptConfig();
  const response = await fetch(`${DEEPSEEK_BASE_URL.replace(/\/$/, "")}/chat/completions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`
    },
    body: JSON.stringify({
      model: DEEPSEEK_MODEL || promptConfig.model || "deepseek-chat",
      temperature: promptConfig.temperature ?? 0.2,
      max_tokens: promptConfig.maxTokens || 1800,
      response_format: { type: "json_object" },
      messages: buildMessages(requestPayload, promptConfig)
    })
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`DeepSeek API failed: ${response.status} ${text.slice(0, 240)}`);
  }
  const payload = await response.json();
  const content = payload.choices?.[0]?.message?.content || "";
  try {
    return JSON.parse(content);
  } catch (error) {
    throw new Error(`DeepSeek returned non-JSON content: ${content.slice(0, 240)}`);
  }
}

function localFallbackPackage(requestPayload, warning) {
  const pack = requestPayload.factPack || {};
  const bank = pack.displayBank || pack.bank || "目标银行";
  const year = pack.year || "";
  const score = pack.diagnosis?.score == null ? "待测算" : `${pack.diagnosis.score}分`;
  const signal = pack.diagnosis?.signal || "待形成";
  const weakest = pack.diagnosis?.weakest || "核心经营约束";
  return {
    viewpoint: `${bank}${year ? `${year}年` : ""}的核心观点不是先讲改善空间，而是先验证${weakest}是否已经成为经营质量和估值叙事的主要约束。`,
    conclusion: `${bank}${year ? `${year}年` : ""}当前解释包先采用本地回退：VQA ${score}，信号为${signal}，应优先复核${weakest}。`,
    evidence: [
      { metric: "diagnosis.score", text: `VQA 结果为${score}` },
      { metric: "diagnosis.signal", text: `系统信号为${signal}` }
    ],
    mechanism: "模型接口不可用或返回未通过校验时，系统先用事实包内已有诊断结果形成保守表达，避免引入事实包外数字。",
    soWhat: `董事会和管理层应先把${weakest}拆成可验证的事实包、口径和对标问题，再决定是否进入强判断或对外叙事。`,
    counterEvidence: "若关键字段缺失、口径不可比或对标组变化后结论不稳定，当前观点必须降级为待复核判断。",
    actions: [
      {
        window: "0-3个月",
        owner: "董办/战略与财务条线",
        action: `复核${weakest}对应的事实包、口径和对标组覆盖情况`,
        trackingMetric: weakest
      }
    ],
    citations: ["diagnosis.score", "diagnosis.signal"],
    qualityWarnings: [warning || "DeepSeek 接口未生成可用解释包，已回退本地事实包模板"],
    confidence: "low"
  };
}

async function handleCommentary(req, res) {
  let requestPayload = {};
  try {
    const rawBody = await readBody(req);
    requestPayload = JSON.parse(rawBody || "{}");
    const useLocalOnly = process.env.DEEPSEEK_PROXY_LOCAL_ONLY === "1";
    const explanationPackage = useLocalOnly
      ? localFallbackPackage(requestPayload, "DEEPSEEK_PROXY_LOCAL_ONLY=1，本次未调用远端模型")
      : await callDeepSeek(requestPayload);
    const validation = validateExplanationPackage(explanationPackage, requestPayload);
    const finalPackage = validation.ok
      ? explanationPackage
      : localFallbackPackage(requestPayload, validation.issues.join("；"));
    sendJson(res, 200, {
      source: validation.ok && !useLocalOnly ? "deepseek" : "fallback",
      explanationPackage: finalPackage,
      commentary: commentaryTextFromPackage(finalPackage),
      text: commentaryTextFromPackage(finalPackage),
      validation
    });
  } catch (error) {
    const fallback = localFallbackPackage(requestPayload, error.message);
    sendJson(res, 200, {
      source: "fallback",
      explanationPackage: fallback,
      commentary: commentaryTextFromPackage(fallback),
      text: commentaryTextFromPackage(fallback),
      validation: { ok: false, issues: [error.message] }
    });
  }
}

const server = http.createServer((req, res) => {
  if (req.method === "OPTIONS") {
    sendJson(res, 204, {});
    return;
  }
  if (req.method === "GET" && req.url === "/health") {
    sendJson(res, 200, { ok: true, provider: "deepseek", localOnly: process.env.DEEPSEEK_PROXY_LOCAL_ONLY === "1" });
    return;
  }
  if (req.method === "POST" && ["/api/llm-commentary", "/api/llm-narrative"].includes(req.url)) {
    handleCommentary(req, res);
    return;
  }
  sendJson(res, 404, { error: "not found" });
});

server.listen(PORT, "127.0.0.1", () => {
  console.log(`DeepSeek commentary proxy listening on http://127.0.0.1:${PORT}`);
});
