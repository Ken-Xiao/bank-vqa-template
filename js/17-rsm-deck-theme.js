/* Bank VQA module: 17-rsm-deck-theme.js — 对齐苏农汇报材料 PPT 母版 */

const RSM_DECK = {
  slideW: 20,
  slideH: 11.25,
  visualProfile: "sunong-value-creation",
  referenceStyle: "RSM reference layouts｜sunong_dark_cover + sunong_chart_diagnostic",
  referenceSource: "rsm-consulting-ppt-skills/assets/layouts",
  colors: {
    primary: "061B3A",
    navy: "061B3A",
    primaryDark: "0D1B2A",
    surface: "10263D",
    surfaceAlt: "18324D",
    secondary: "0099D8",
    secondarySoft: "DFF1FC",
    slate: "667085",
    slateDark: "2F3A4A",
    panel: "DFF1FC",
    panelSoft: "F7F8FA",
    panelMeta: "667085",
    accentBlue: "0099D8",
    accentGreen: "10B981",
    accentRed: "EF4444",
    accentGold: "F59E0B",
    bg: "FFFFFF",
    bgSoft: "F7F8FA",
    line: "D9E1EA",
    coverBlue: "0099D8",
    coverSoft: "DFF1FC",
    coverGold: "F59E0B",
    coverMuted: "B5C8DC",
    text: "2F3A4A",
    muted: "667085",
    white: "FFFFFF",
    footerBg: "FFFFFF"
  },
  coverBg: "assets/sunong_ref/cover-bg.png",
  fonts: {
    cn: "Noto Sans SC",
    cnAlt: "Noto Sans SC",
    en: "Inter"
  },
  footerLeft: "审计 | 税务 | 咨询    © 2026 RSM 版权所有",
  sourceLine: "数据来源：iFinD · 上市公司年报 · RSM研究汇总"
};

function rsmSourceLine(extra = "") {
  const rules = typeof rulesVersionLabel === "function" ? rulesVersionLabel() : "";
  const parts = [RSM_DECK.sourceLine];
  if (rules) parts.push(`规则版本 ${rules}`);
  if (extra) parts.push(extra);
  return parts.join(" · ");
}

function rsmBrandMark() {
  return `<div class="rsm-brand-mark" aria-hidden="true">RSM</div>`;
}

function rsmModuleBar(label, moduleNum = "") {
  const prefix = moduleNum ? `${moduleNum} ` : "";
  return `
    <div class="rsm-module-bar">
      <span class="rsm-module-bar-label">${prefix}${label || ""}</span>
      ${rsmBrandMark()}
    </div>`;
}

function rsmDeckFooterHtml(page, total, sourceNote = "") {
  const pageText = String(page).padStart(2, "0");
  const totalText = String(total).padStart(2, "0");
  return `
    <footer class="rsm-deck-footer">
      <span class="rsm-deck-footer-left">${RSM_DECK.footerLeft}</span>
      <span class="rsm-deck-footer-source">${sourceNote || rsmSourceLine()}</span>
      <span class="rsm-deck-footer-page">${pageText} / ${totalText}</span>
    </footer>`;
}

function rsmSlideHead(title, subtitle = "", kicker = "") {
  return `
    <div class="rsm-slide-head">
      ${kicker ? `<div class="rsm-slide-kicker">${kicker}</div>` : ""}
      <h2>${title}</h2>
      ${subtitle ? `<p>${subtitle}</p>` : ""}
    </div>`;
}

function rsmInsightCard(label, text, tone = "blue") {
  return `
    <div class="rsm-insight-card tone-${tone}">
      <b>${label}</b>
      <p>${text}</p>
    </div>`;
}

function rsmStoryBlock(label, text) {
  if (!text) return "";
  return `<div class="rsm-story-block"><b>${label}</b><p>${text}</p></div>`;
}

function buildRsmCoverSlide(row, peerText, typeText, versionText, vqaScore) {
  const bank = displayBankName(row?.bank || state.target);
  const yearRange = `${Math.max(2020, state.year - 5)} — ${state.year}`;
  const readingPath = [
    "研究口径",
    "经营摘要",
    "VQA 框架",
    "入选专题",
    "章节图表",
    "行动建议",
    "数据附录"
  ].join(" → ");
  return `
    <section class="print-slide cover rsm-cover" data-deck-type="cover">
      <div class="rsm-cover-top">
        <div class="rsm-cover-label">董事会汇报</div>
        ${rsmBrandMark()}
      </div>
      <div class="rsm-cover-grid">
        <div class="rsm-cover-main">
          <div class="rsm-cover-title-panel">
            <h1>${bank}价值质量诊断与经营对标分析</h1>
            <p>经营视角与资本市场视角的双重穿透分析</p>
          </div>
          <div class="rsm-cover-vqa-panel">
            本汇报采用 RSM 银行价值质量评估体系（下称 VQA）—— 总资产收益率（ROA）→ 风险调整资本回报率（RAROC）→ 经济增加值（EVA）三层穿透框架，重估 ${bank} ${state.year} 年价值创造质量与资本市场定价逻辑。
          </div>
        </div>
        <aside class="rsm-cover-meta">
          <div class="rsm-cover-meta-title">报告元数据</div>
          <div class="rsm-meta-grid">
            <div><strong>报告期</strong><span>${state.year} 年</span></div>
            <div><strong>样本区间</strong><span>${yearRange}</span></div>
            <div><strong>报告版本</strong><span>${versionText}</span></div>
            <div><strong>沟通对象</strong><span>董事会 / 管理层</span></div>
            <div><strong>目标银行</strong><span>${bank}</span></div>
            <div><strong>对标银行</strong><span>${peerText}</span></div>
            <div><strong>类型均值</strong><span>${typeText}</span></div>
            <div><strong>VQA 诊断</strong><span>${vqaScore}</span></div>
            <div><strong>规则版本</strong><span>${typeof rulesVersionLabel === "function" ? rulesVersionLabel() : "未标注"}</span></div>
          </div>
        </aside>
      </div>
      <div class="rsm-cover-path">阅读路径 · ${readingPath}</div>
    </section>`;
}

function applyRsmDeckFooters() {
  const deck = document.getElementById("printDeck");
  if (!deck) return;
  const slides = [...deck.querySelectorAll(".print-slide")];
  const total = slides.length;
  slides.forEach((slide, index) => {
    slide.querySelector(".rsm-deck-footer")?.remove();
    const source = slide.dataset.sourceNote || "";
    slide.insertAdjacentHTML("beforeend", rsmDeckFooterHtml(index + 1, total, source));
    slide.dataset.slideIndex = String(index + 1);
    slide.dataset.slideTotal = String(total);
  });
}

function wrapContentSlide(className, moduleLabel, moduleNum, title, subtitle, bodyHtml, storyHtml = "", extraClass = "") {
  const classes = ["print-slide", className, extraClass].filter(Boolean).join(" ");
  return `
    <section class="${classes}" data-deck-type="content" data-module="${moduleLabel}">
      ${rsmModuleBar(moduleLabel, moduleNum)}
      ${rsmSlideHead(title, subtitle)}
      <div class="rsm-slide-body">${bodyHtml}</div>
      ${storyHtml ? `<div class="rsm-slide-story">${storyHtml}</div>` : ""}
    </section>`;
}
