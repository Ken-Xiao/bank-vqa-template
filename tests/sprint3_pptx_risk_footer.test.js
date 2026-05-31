const fs = require("fs");
const vm = require("vm");

const root = process.cwd();

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

const context = {
  console,
  window: {},
  state: { target: "苏州农商行", year: 2025 },
  document: { querySelector: () => null },
  displayBankName: (name) => name,
  pptxShortText: undefined
};
vm.createContext(context);
vm.runInContext(fs.readFileSync(`${root}/js/13-pptx-export.js`, "utf8"), context, { filename: "js/13-pptx-export.js" });

assert(typeof context.pptxRiskFooterNote === "function", "pptxRiskFooterNote should be defined");
assert(typeof context.formalSlideTextBlocks === "function", "formalSlideTextBlocks should be defined");

const fakeSection = {
  dataset: { sectionTitle: "息差专题", moduleLabel: "专题分析" },
  className: "formal-section",
  matches: () => false,
  querySelector: (selector) => {
    if (selector.includes("h1") || selector.includes("h2")) return { textContent: "息差压力需要回到口径边界" };
    if (selector.includes(".formal-lead")) return { textContent: "净息差判断需要保留脚注。" };
    return null;
  },
  querySelectorAll: (selector) => {
    if (selector === ".formal-risk-footnotes p") {
      return [
        { textContent: "L2净息差：日均余额与期初期末均值可能不可比（主报告+脚注）" },
        { textContent: "L3信用成本：贷款减值与全部金融资产减值口径需区分（附录）" }
      ];
    }
    if (selector.includes(".formal-fact-table")) {
      return [
        { children: [{ textContent: "净息差" }, { textContent: "1.42%" }, { textContent: "1.55%" }, { textContent: "1.60%" }, { textContent: "约 42 分位" }, { textContent: "L2 主报告+脚注" }] }
      ];
    }
    return [];
  }
};

const blocks = context.formalSlideTextBlocks(fakeSection, 0, [fakeSection]);
assert(blocks.riskFootnotes.length === 2, "formal slide blocks should carry risk footnotes");

const note = context.pptxRiskFooterNote(blocks);
assert(note.includes("L2"), "footer note should retain L2");
assert(note.includes("L3"), "footer note should retain L3");
assert(note.length <= 95, "footer note should be short enough for PPT footer");

const defaultNote = context.pptxRiskFooterNote({ riskFootnotes: [] });
assert(defaultNote.includes("数据来源"), "footer should fall back to source line without risk notes");

console.log("sprint3-pptx-risk-footer-ok");
