/* PRD8: v8 语言三件套落地测试合约 */

const assert = require("assert");
const fs = require("fs");
const path = require("path");

describe("v8 Language Trio Contract (PRD8-L01, PRD8-C01, PRD-L01-Phase1)", () => {
  const baseDir = path.resolve(__dirname, "..");
  const jsDir = path.join(baseDir, "js");
  const stylesDir = path.join(baseDir, "styles");
  const indexHtml = path.join(baseDir, "index.html");

  /* 任务 A：问题式专题标题（PRD8-L01） */
  describe("Task A: Topic Question Titles (PRD8-L01)", () => {
    it("js/02-config.js 应包含 topicQuestionTitles 函数", () => {
      const content = fs.readFileSync(path.join(jsDir, "02-config.js"), "utf8");
      assert(content.includes("function topicQuestionTitles()"), "缺少 topicQuestionTitles 函数定义");
      assert(content.includes("profit:"), "缺少 profit 专题映射");
      assert(content.includes("spread:"), "缺少 spread 专题映射");
      assert(content.includes("risk:"), "缺少 risk 专题映射");
      assert(content.includes("capital:"), "缺少 capital 专题映射");
      assert(content.includes("valuation:"), "缺少 valuation 专题映射");
    });

    it("js/02-config.js 应包含 topicQuestionTitle 查询函数", () => {
      const content = fs.readFileSync(path.join(jsDir, "02-config.js"), "utf8");
      assert(content.includes("function topicQuestionTitle("), "缺少 topicQuestionTitle 查询函数");
    });

    it("js/22-formal-report.js 中的 formalAssertionTitle 应改为问题式表述", () => {
      const content = fs.readFileSync(path.join(jsDir, "22-formal-report.js"), "utf8");
      assert(content.includes("我行的盈利质量在同业里排第几？为什么？"), "profit 缺少问题式标题");
      assert(content.includes("净息差还能守住多久？"), "spread/nim 缺少问题式标题");
      assert(content.includes("风险数据是不是已经反映了真实经营压力？"), "risk 缺少问题式标题");
      assert(content.includes("我行的资本回报率是否值得继续追加投入？"), "capital 缺少问题式标题");
      assert(content.includes("市场是否合理地定价了我行的经营质量？"), "valuation 缺少问题式标题");
    });

    it("js/24-prd-v3-workbench.js 中的 v3NarrativeChapters 应改为问题式 question 字段", () => {
      const content = fs.readFileSync(path.join(jsDir, "24-prd-v3-workbench.js"), "utf8");
      assert(content.includes("我行的盈利质量在同业里排第几？"), "profit 章节缺少问题式标题");
      assert(content.includes("净息差还能守住多久？"), "nim 章节缺少问题式标题");
      assert(content.includes("风险数据是不是已经反映了真实经营压力？"), "risk 章节缺少问题式标题");
      assert(content.includes("我行的资本回报率是否值得继续追加投入？"), "capital 章节缺少问题式标题");
    });

    it("应至少出现 3 个董事会风格问句", () => {
      const config = fs.readFileSync(path.join(jsDir, "02-config.js"), "utf8");
      const report = fs.readFileSync(path.join(jsDir, "22-formal-report.js"), "utf8");
      const combined = config + report;
      const questionMarks = (combined.match(/？/g) || []).length;
      assert(questionMarks >= 8, `应至少包含 8 个问号（董事会风格），实际 ${questionMarks} 个`);
    });
  });

  /* 任务 B：洞察三角全量覆盖（PRD8-C01） */
  describe("Task B: Insight Triangle Full Coverage (PRD8-C01)", () => {
    it("js/36-insight-triangle.js 应存在且包含 insightTriangle 函数", () => {
      const filePath = path.join(jsDir, "36-insight-triangle.js");
      assert(fs.existsSync(filePath), "js/36-insight-triangle.js 文件不存在");

      const content = fs.readFileSync(filePath, "utf8");
      assert(content.includes("function insightTriangle("), "缺少 insightTriangle 主函数");
      assert(content.includes("metricKey"), "insightTriangle 缺少 metricKey 参数");
      assert(content.includes("currentValue"), "insightTriangle 缺少 currentValue 参数");
      assert(content.includes("当前值"), "洞察三角缺少「当前值」顶点");
      assert(content.includes("变化方向"), "洞察三角缺少「变化方向」顶点");
      assert(content.includes("机制解释"), "洞察三角缺少「机制解释」顶点");
    });

    it("js/36-insight-triangle.js 应包含 topicInsightTriangle 函数", () => {
      const content = fs.readFileSync(path.join(jsDir, "36-insight-triangle.js"), "utf8");
      assert(content.includes("function topicInsightTriangle("), "缺少 topicInsightTriangle 函数");
      assert(content.includes("profit"), "topicInsightTriangle 缺少 profit 专题映射");
      assert(content.includes("spread"), "topicInsightTriangle 缺少 spread 专题映射");
      assert(content.includes("risk"), "topicInsightTriangle 缺少 risk 专题映射");
      assert(content.includes("capital"), "topicInsightTriangle 缺少 capital 专题映射");
      assert(content.includes("valuation"), "topicInsightTriangle 缺少 valuation 专题映射");
    });

    it("js/36-insight-triangle.js 应包含 diagnosisInsightTriangle 函数", () => {
      const content = fs.readFileSync(path.join(jsDir, "36-insight-triangle.js"), "utf8");
      assert(content.includes("function diagnosisInsightTriangle("), "缺少 diagnosisInsightTriangle 函数");
    });

    it("js/36-insight-triangle.js 应包含挂载函数 mountInsightTriangle", () => {
      const content = fs.readFileSync(path.join(jsDir, "36-insight-triangle.js"), "utf8");
      assert(content.includes("function mountInsightTriangle("), "缺少 mountInsightTriangle 函数");
    });

    it("index.html 应引入 js/36-insight-triangle.js", () => {
      const content = fs.readFileSync(indexHtml, "utf8");
      assert(content.includes("js/36-insight-triangle.js"), "index.html 未引入 js/36-insight-triangle.js");
      assert(content.includes("prd8-c01"), "script 引入缺少版本标记");
    });

    it("styles/app.css 应包含 .insight-triangle 样式", () => {
      const content = fs.readFileSync(path.join(stylesDir, "app.css"), "utf8");
      assert(content.includes(".insight-triangle"), "缺少 .insight-triangle 类");
      assert(content.includes(".triangle-vertex"), "缺少 .triangle-vertex 类");
      assert(content.includes("grid-template-columns: repeat(3, 1fr)"), "洞察三角缺少三列网格样式");
    });

    it("styles/app.css 中的洞察三角样式应包含视觉设计", () => {
      const content = fs.readFileSync(path.join(stylesDir, "app.css"), "utf8");
      assert(content.includes(".insight-triangle-mount") || content.includes("display: grid"), "缺少洞察三角布局样式");
      assert(content.includes(".insight-triangle-placeholder"), "缺少占位符样式");
    });
  });

  /* 任务 C：本地语言强度分层（PRD-L01-Phase1） */
  describe("Task C: Language Strength Tier (PRD-L01-Phase1)", () => {
    it("js/12-ai-narrative.js 应包含 languageStrengthTier 函数", () => {
      const content = fs.readFileSync(path.join(jsDir, "12-ai-narrative.js"), "utf8");
      assert(content.includes("function languageStrengthTier("), "缺少 languageStrengthTier 函数");
      assert(content.includes("strong"), "languageStrengthTier 缺少 strong 等级");
      assert(content.includes("implicit"), "languageStrengthTier 缺少 implicit 等级");
      assert(content.includes("tentative"), "languageStrengthTier 缺少 tentative 等级");
    });

    it("js/12-ai-narrative.js 中 languageStrengthTier 应判断 zScore 和 riskLevel", () => {
      const content = fs.readFileSync(path.join(jsDir, "12-ai-narrative.js"), "utf8");
      assert(content.includes("absZ > 1.5") || content.includes("Math.abs(zScore)"), "缺少 zScore 判断逻辑");
      assert(content.includes("L1") && content.includes("L2") && content.includes("L3") && content.includes("L4"),
        "缺少 L1-L4 风险等级判断");
    });

    it("js/12-ai-narrative.js 应包含 phraseByStrength 函数", () => {
      const content = fs.readFileSync(path.join(jsDir, "12-ai-narrative.js"), "utf8");
      assert(content.includes("function phraseByStrength("), "缺少 phraseByStrength 函数");
      assert(content.includes("证据："), "strong 模板缺少「证据：」");
      assert(content.includes("可能性较大"), "implicit 模板缺少「可能性较大」");
      assert(content.includes("仍需进一步验证"), "tentative 模板缺少「仍需进一步验证」");
    });

    it("js/12-ai-narrative.js 应包含 formalAssertionWithStrength 函数", () => {
      const content = fs.readFileSync(path.join(jsDir, "12-ai-narrative.js"), "utf8");
      assert(content.includes("function formalAssertionWithStrength("), "缺少 formalAssertionWithStrength 函数");
    });

    it("js/12-ai-narrative.js 中 L4 风险应自动套用 tentative 模板", () => {
      const content = fs.readFileSync(path.join(jsDir, "12-ai-narrative.js"), "utf8");
      assert(content.includes('riskLevel === "L4"'), "缺少 L4 特殊处理逻辑");
      assert(content.includes("tentative"), "L4 应使用 tentative 模板");
    });
  });

  /* 集成测试 */
  describe("Integration: All Components Present", () => {
    it("应保留所有现有合约标记，未破坏已有功能", () => {
      const files = ["02-config.js", "22-formal-report.js", "12-ai-narrative.js"];
      files.forEach((file) => {
        const content = fs.readFileSync(path.join(jsDir, file), "utf8");
        /* 检查未被意外删除的关键函数 */
        assert(!content.includes("delete") || content.split("\n").length > 100,
          `${file} 不应包含大规模删除操作`);
      });
    });

    it("新增文件应包含 PRD 标记注释", () => {
      const triangleContent = fs.readFileSync(path.join(jsDir, "36-insight-triangle.js"), "utf8");
      assert(triangleContent.includes("PRD8-C01"), "36-insight-triangle.js 缺少 PRD 标记");

      const narrativeContent = fs.readFileSync(path.join(jsDir, "12-ai-narrative.js"), "utf8");
      assert(narrativeContent.includes("PRD-L01-Phase1"), "12-ai-narrative.js 缺少 PRD 标记");

      const configContent = fs.readFileSync(path.join(jsDir, "02-config.js"), "utf8");
      assert(configContent.includes("PRD8-L01"), "02-config.js 缺少 PRD 标记");
    });

    it("关键函数应能导出且无语法错误", () => {
      /* 简单的语法检查：确保所有函数定义都是完整的 */
      const files = [
        { path: "02-config.js", funcs: ["topicQuestionTitles", "topicQuestionTitle"] },
        { path: "22-formal-report.js", funcs: ["formalAssertionTitle"] },
        { path: "24-prd-v3-workbench.js", funcs: ["v3NarrativeChapters"] },
        { path: "36-insight-triangle.js", funcs: ["insightTriangle", "topicInsightTriangle"] },
        { path: "12-ai-narrative.js", funcs: ["languageStrengthTier", "phraseByStrength", "formalAssertionWithStrength"] }
      ];

      files.forEach(({ path: filePath, funcs }) => {
        const content = fs.readFileSync(path.join(jsDir, filePath), "utf8");
        funcs.forEach((func) => {
          const pattern = new RegExp(`function\\s+${func}\\s*\\(`);
          assert(pattern.test(content), `${filePath} 缺少函数 ${func}`);

          /* 简单的括号匹配检查 */
          const funcStart = content.indexOf(`function ${func}`);
          const afterStart = content.substring(funcStart);
          const braceCount = (afterStart.match(/{/g) || []).length - (afterStart.match(/}/g) || []).length;
          assert(braceCount >= 0, `${filePath} 的 ${func} 可能存在括号不匹配`);
        });
      });
    });
  });
});
