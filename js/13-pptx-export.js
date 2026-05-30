/* Bank VQA module: 13-pptx-export.js — PRD-36~40 PPTX可编辑导出（苏农汇报材料母版） */

function ensurePptxLib() {
  return typeof window.PptxGenJS !== "undefined";
}

function loadScript(url) {
  return new Promise((resolve, reject) => {
    if (document.querySelector(`script[src="${url}"]`)) {
      resolve();
      return;
    }
    const script = document.createElement("script");
    script.src = url;
    script.onload = resolve;
    script.onerror = reject;
    document.head.appendChild(script);
  });
}

async function ensurePptxLoaded() {
  if (ensurePptxLib()) return;
  try {
    await loadScript("vendor/pptxgen.bundle.js");
  } catch (localError) {
    await loadScript("https://cdn.jsdelivr.net/npm/pptxgenjs@3.12.0/dist/pptxgen.bundle.js");
  }
  if (!ensurePptxLib()) throw new Error("PptxGenJS loaded but window.PptxGenJS is unavailable");
}

function rsmPptxTheme() {
  return typeof RSM_DECK !== "undefined" ? RSM_DECK : {
    slideW: 20,
    slideH: 11.25,
    colors: {
      primary: "061B3A",
      navy: "061B3A",
      secondary: "0099D8",
      slate: "667085",
      slateDark: "2F3A4A",
      panel: "DFF1FC",
      panelSoft: "F7F8FA",
      panelMeta: "667085",
      accentBlue: "0099D8",
      bg: "FFFFFF",
      bgSoft: "F7F8FA",
      line: "D9E1EA",
      coverBlue: "0099D8",
      coverSoft: "DFF1FC",
      coverGold: "F59E0B",
      text: "2F3A4A",
      muted: "667085",
      white: "FFFFFF"
    },
    fonts: { cn: "Noto Sans SC", cnAlt: "Noto Sans SC", en: "Inter" },
    footerLeft: "审计 | 税务 | 咨询    © 2026 RSM 版权所有",
    sourceLine: "数据来源：iFinD · 上市公司年报 · RSM研究汇总",
    coverBg: "assets/sunong_ref/cover-bg.png"
  };
}

function rsmPptxFont(theme) {
  return theme.fonts?.cnAlt || theme.fonts?.cn || "Noto Sans SC";
}

function pptxCleanText(text = "") {
  return String(text || "")
    .replace(/\s+/g, " ")
    .replace(/本页用法[:：]?/g, "")
    .replace(/章节摘要[:：]?/g, "")
    .replace(/偏弱/g, "低于参照水平")
    .replace(/薄弱/g, "低于参照水平")
    .replace(/偏薄/g, "低于参照水平")
    .replace(/承压/g, "边际下行或低于参照水平")
    .replace(/优秀/g, "处于样本前段")
    .replace(/糟糕/g, "处于样本后段")
    .replace(/短板/g, "低分位指标")
    .replace(/低估/g, "低于参照估值水平")
    .replace(/红利/g, "阶段性贡献")
    .replace(/含金量/g, "质量贡献")
    .trim();
}

function pptxShortText(text = "", limit = 72) {
  const clean = pptxCleanText(text);
  if (clean.length <= limit) return clean;
  const cut = clean.slice(0, limit);
  const stop = Math.max(cut.lastIndexOf("。"), cut.lastIndexOf("；"), cut.lastIndexOf("，"));
  return `${cut.slice(0, stop > 24 ? stop : limit)}。`;
}

function pptxKeyLines(items = [], max = 3, limit = 78) {
  return items
    .map((item) => pptxShortText(item, limit))
    .filter(Boolean)
    .slice(0, max);
}

function pptxBulletLines(items = [], max = 3, limit = 78) {
  return pptxKeyLines(items, max, limit).map((item) => `• ${item}`);
}

function pptxStripLeadLabel(text = "") {
  return pptxCleanText(text)
    .replace(/^[-•\d\s.、]+/, "")
    .replace(/^(目标银行解读|对标银行解读|行业均值解读|本土回答|核心观察|图表阅读顺序|补充说明与管理含义|经营视角结论|资本市场视角结论|管理含义|关键证据|诊断结论|阅读说明)[:：]/, "")
    .trim();
}

function pptxUniqueLines(items = [], max = 4, limit = 76) {
  const seen = new Set();
  return items
    .map(pptxStripLeadLabel)
    .map((item) => pptxShortText(item, limit))
    .filter((item) => {
      if (!item || seen.has(item)) return false;
      seen.add(item);
      return true;
    })
    .slice(0, max);
}

function pptxCurrentTarget() {
  if (typeof state !== "undefined" && state?.target) return state.target;
  return "目标银行";
}

function pptxConsultingTitle(blocks, deckType = "content") {
  const target = pptxCurrentTarget();
  const raw = pptxCleanText(blocks.title || blocks.coverTitle || "");
  const text = `${raw} ${blocks.subtitle || ""}`;
  if (deckType === "cover") return raw || `${target}价值质量诊断与经营对标分析`;
  if (deckType === "toc") return "本报告围绕经营质量、资本市场反馈与行动路径形成闭环";
  if (/目录|导航/.test(raw)) return "报告阅读路径按样本边界、核心判断、行动建议展开";
  if (/执行摘要|摘要/.test(text)) return `${target}本轮诊断需同时回应经营质量与资本市场定价`;
  if (/方法|VQA|框架|口径|样本/.test(text)) return "价值质量判断需同时验证经营事实与资本市场反馈";
  if (/数据覆盖|字段|完整性|底稿/.test(text)) return "数据覆盖情况决定本轮结论可用于董事会讨论的边界";
  if (/息差|利差|净息|负债|存款|贷款/.test(text)) return `${target}的息差判断需要同时拆解资产收益与负债成本`;
  if (/盈利|营收|利润|ROA|ROE|手续费|中收|轻资本/.test(text)) return `${target}盈利质量需回到核心营收、非息贡献与资本消耗`;
  if (/风险|不良|拨备|逾期|关注|核销|信用成本/.test(text)) return `${target}风险确认节奏将影响利润释放与资本市场信任`;
  if (/资本|PB|市净率|估值|市值|分红|股息/.test(text)) return `${target}资本市场定价需要由经营质量和资本回报共同解释`;
  if (/专题|行动|建议|路线|路径/.test(text)) return `${target}后续行动应围绕可验证指标和责任机制展开`;
  if (deckType === "chart") return raw ? `${raw}指向的管理问题需要回到数据差异验证` : `${target}图表结论需要与对标样本同步验证`;
  return raw || `${target}本页结论需结合选定样本继续验证`;
}

function pptxConsultingSubtitle(blocks, deckType = "content") {
  const target = pptxCurrentTarget();
  if (deckType === "chart") {
    return pptxShortText(blocks.subtitle || `${target}、选定对标银行与类型银行均值口径下的图表证据。`, 92);
  }
  return pptxShortText(blocks.subtitle || blocks.story || "本页仅保留可用于董事会讨论的结论、证据和管理含义。", 92);
}

function pptxEvidenceLines(blocks, deckType = "content") {
  const primary = [
    ...(blocks.metrics || []),
    ...(blocks.flow || []),
    ...(blocks.blocks || []),
    ...(blocks.comments || []),
    ...(blocks.scopeItems || []),
    ...(blocks.methodCards || []),
    ...(blocks.topics || []),
    ...(blocks.consultingCards || [])
  ];
  const lines = pptxUniqueLines(primary, 3, deckType === "chart" ? 72 : 78);
  if (lines.length) return lines;
  return pptxUniqueLines([blocks.story, blocks.subtitle, blocks.title], 3, 78);
}

function pptxImplicationLines(blocks, deckType = "content") {
  const target = pptxCurrentTarget();
  const source = [
    ...(blocks.actionCards || []),
    ...(blocks.comments || []),
    ...(blocks.blocks || []),
    blocks.story
  ];
  const extracted = pptxUniqueLines(source, 2, 78);
  const implications = extracted.map((line) => {
    if (/意味着|应|需要|建议|优先|下一步|董事会|管理层/.test(line)) return line;
    return `对董事会的含义是：${line}`;
  });
  if (implications.length >= 2) return implications.slice(0, 2);
  if (deckType === "chart") {
    implications.push(`若本页差异持续存在，应将${target}纳入季度复盘口径，并明确责任部门。`);
  } else {
    implications.push(`后续应把本页判断转化为可跟踪指标、阈值和责任机制。`);
  }
  return pptxUniqueLines(implications, 2, 82);
}

function pptxSlideBrief(blocks, deckType = "content") {
  const evidence = pptxEvidenceLines(blocks, deckType);
  const implication = pptxImplicationLines(blocks, deckType);
  return {
    title: pptxConsultingTitle(blocks, deckType),
    subtitle: pptxConsultingSubtitle(blocks, deckType),
    evidence,
    implication,
    note: "口径提示：本页基于已选目标银行、对标银行与类型银行均值计算；敏感结论需回到数据来源复核。"
  };
}

function addConsultingTextBlock(slide, pptx, theme, x, y, w, h, heading, lines, accent = "0099D8") {
  const c = theme.colors;
  slide.addShape(pptx.ShapeType.rect, { x, y, w, h, fill: { color: c.white }, line: { color: c.line || "D9E1EA", width: 0.75 } });
  slide.addShape(pptx.ShapeType.rect, { x, y, w: 0.09, h, fill: { color: accent }, line: { color: accent, transparency: 100 } });
  slide.addText(heading, {
    x: x + 0.25,
    y: y + 0.18,
    w: w - 0.42,
    h: 0.34,
    fontFace: rsmPptxFont(theme),
    fontSize: 21,
    color: c.navy,
    bold: true,
    fit: "shrink"
  });
  slide.addText(pptxBulletLines(lines || [], 2, 72).join("\n"), {
    x: x + 0.25,
    y: y + 0.72,
    w: w - 0.45,
    h: h - 0.9,
    fontFace: rsmPptxFont(theme),
    fontSize: 17,
    color: c.text,
    valign: "top",
    fit: "shrink",
    breakLine: false
  });
}

function slideTextBlocks(slideEl) {
  const moduleLabel = slideEl.querySelector(".rsm-module-bar-label")?.textContent?.trim() || "";
  const title = slideEl.querySelector(".rsm-slide-head h2")?.textContent?.trim()
    || slideEl.querySelector(".print-head h2")?.textContent?.trim()
    || slideEl.querySelector("h1")?.textContent?.trim()
    || "";
  const subtitle = slideEl.querySelector(".rsm-slide-head p")?.textContent?.trim()
    || slideEl.querySelector(".print-head p")?.textContent?.trim()
    || "";
  const chapterStory = slideEl.querySelector(".chapter-agenda-story p")?.textContent?.trim() || "";
  const story = chapterStory
    || slideEl.querySelector(".rsm-slide-story")?.textContent?.trim()
    || slideEl.querySelector(".print-story")?.textContent?.trim()
    || "";
  const blocks = [...slideEl.querySelectorAll(".print-chart-block")].map((el) => `${el.querySelector("b")?.textContent || ""}：${el.querySelector("p")?.textContent || ""}`);
  const flow = [...slideEl.querySelectorAll(".chart-flow-item")].map((el) => `${el.querySelector("b")?.textContent || ""}：${el.querySelector("span")?.textContent || ""}`);
  const routeCards = [...slideEl.querySelectorAll(".chapter-route-card")].map((el) => {
    const num = el.querySelector("b")?.textContent?.trim() || "";
    const name = el.querySelector("span")?.textContent?.trim() || "";
    const note = el.querySelector("p")?.textContent?.trim() || "";
    return `${num} ${name}\n${note}`.trim();
  });
  const routeSteps = [...slideEl.querySelectorAll(".chapter-agenda-route span")].map((el) => el.textContent?.trim() || "");
  const comments = [...slideEl.querySelectorAll(".print-comment")].map((el) => `${el.querySelector("b")?.textContent || ""}：${el.textContent.replace(el.querySelector("b")?.textContent || "", "").trim()}`);
  const metrics = [...slideEl.querySelectorAll(".print-metric")].map((el) => `${el.querySelector("b")?.textContent || ""} ${el.querySelector("span")?.textContent || ""}`);
  const scopeItems = [...slideEl.querySelectorAll(".print-scope-item")].map((el) => `${el.querySelector("b")?.textContent || ""}：${el.querySelector("span")?.textContent || ""}`);
  const methodCards = [...slideEl.querySelectorAll(".print-method-card")].map((el) => `${el.querySelector("b")?.textContent || ""}：${el.querySelector("p")?.textContent || ""}`);
  const topics = [...slideEl.querySelectorAll(".print-topic")].map((el) => `${el.querySelector("b")?.textContent || ""}：${[...el.querySelectorAll("p")].map((p) => p.textContent.trim()).join(" ")}`);
  const actionCards = [...slideEl.querySelectorAll(".print-action-card")].map((el) => `${el.querySelector("b")?.textContent || ""}：${[...el.querySelectorAll("li")].map((li) => li.textContent.trim()).join("；")}`);
  const rsm2ProofCards = [...slideEl.querySelectorAll([
    ".rsm2-pro-node",
    ".rsm2-driver-row",
    ".rsm2-waterfall-head > div",
    ".rsm2-waterfall-row",
    ".rsm2-momentum-card",
    ".rsm2-structure-card",
    ".rsm2-priority-row",
    ".rsm2-whatif-card",
    ".rsm2-diagnostic-evidence",
    ".rsm2-topic-takeaway-card",
    ".rsm2-anchor-card",
    ".rsm2-target-card",
    ".rsm2-key-figure-card",
    ".rsm2-sparc-card",
    ".rsm2-traffic-card"
  ].join(","))].map((el) => {
    const label = el.querySelector("span")?.textContent?.trim() || el.querySelector("b")?.textContent?.trim() || "";
    const value = el.querySelector("b, em")?.textContent?.trim() || "";
    const note = [...el.querySelectorAll("p, em")].map((item) => item.textContent?.trim()).filter(Boolean).join("；");
    return `${label}：${value}${note ? `｜${note}` : ""}`;
  });
  const rsm2DecisionLines = [...slideEl.querySelectorAll(".rsm2-decision-panel div")].map((el) => {
    const label = el.querySelector("span")?.textContent?.trim() || "";
    const note = el.querySelector("p")?.textContent?.trim() || "";
    return `${label}：${note}`;
  });
  const consultingCards = [...slideEl.querySelectorAll(".consulting-question-card, .consulting-answer-card, .consulting-pyramid-row")].map((el) => {
    const label = el.querySelector("span, b")?.textContent?.trim() || "";
    const title = el.querySelector("h3")?.textContent?.trim() || "";
    const note = el.querySelector("p")?.textContent?.trim() || "";
    return `${label}：${title || note} ${title && note ? note : ""}`.trim();
  });
  const executiveCards = [...slideEl.querySelectorAll(".executive-takeaway-card, .chapter-synthesis-card, .chapter-synthesis-answer")].map((el) => {
    const label = el.querySelector("span")?.textContent?.trim() || "";
    const title = el.querySelector("b, h3")?.textContent?.trim() || "";
    const note = el.querySelector("p")?.textContent?.trim() || "";
    return `${label}：${title} ${note}`.trim();
  });
  const coverTitle = slideEl.querySelector(".rsm-cover-title-panel h1")?.textContent?.trim() || "";
  const coverSub = slideEl.querySelector(".rsm-cover-title-panel p")?.textContent?.trim() || "";
  const coverVqa = slideEl.querySelector(".rsm-cover-vqa-panel")?.textContent?.trim() || "";
  const tocItems = [...slideEl.querySelectorAll(".print-toc li")].slice(0, 8).map((li) => {
    const num = li.querySelector("b")?.textContent?.trim() || "";
    const label = li.querySelector("span")?.textContent?.trim() || "";
    return `${num} ${label}`.trim();
  });
  return {
    moduleLabel,
    className: slideEl.className || "",
    title,
    subtitle,
    story: pptxShortText(story, 130),
    comments: pptxKeyLines(comments, 6, 72),
    blocks: pptxKeyLines(blocks, 5, 70),
    flow: pptxKeyLines(flow, 3, 72),
    routeCards: pptxKeyLines(routeCards, 6, 56),
    routeSteps: pptxKeyLines(routeSteps, 3, 42),
    metrics: pptxKeyLines(metrics, 8, 34),
    scopeItems: pptxKeyLines(scopeItems, 8, 56),
    methodCards: pptxKeyLines(methodCards, 8, 70),
    topics: pptxKeyLines(topics, 8, 68),
    actionCards: pptxKeyLines(actionCards, 6, 68),
    consultingCards: pptxKeyLines([...rsm2ProofCards, ...rsm2DecisionLines, ...consultingCards, ...executiveCards], 8, 76),
    coverTitle,
    coverSub,
    coverVqa: pptxShortText(coverVqa, 120),
    tocItems: pptxKeyLines(tocItems, 8, 48)
  };
}

function addChapterAgendaSlide(slide, pptx, theme, blocks, page, total) {
  const c = theme.colors;
  const brief = pptxSlideBrief(blocks, "chapter-agenda");
  slide.background = { color: c.bg };
  addRsmModuleBar(slide, pptx, theme, blocks.moduleLabel || blocks.title, 0.18);
  slide.addText(brief.title, {
    x: 0.48,
    y: 0.72,
    w: 18.8,
    h: 0.72,
    fontFace: rsmPptxFont(theme),
    fontSize: 32,
    color: c.secondary || "0099D8",
    bold: true,
    valign: "top",
    fit: "shrink"
  });
  slide.addText(brief.subtitle || "", {
    x: 0.48,
    y: 1.38,
    w: 18.6,
    h: 0.3,
    fontFace: rsmPptxFont(theme),
    fontSize: 16,
    color: c.slate,
    fit: "shrink"
  });
  slide.addShape(pptx.ShapeType.line, { x: 0.48, y: 1.78, w: 19.15, h: 0, line: { color: c.line || "D9E1EA", width: 0.75 } });
  slide.addShape(pptx.ShapeType.rect, { x: 0.48, y: 1.92, w: 6.2, h: 3.55, fill: { color: c.white }, line: { color: c.white, transparency: 100 } });
  slide.addShape(pptx.ShapeType.rect, { x: 0.48, y: 1.92, w: 6.2, h: 0.08, fill: { color: c.primary }, line: { color: c.primary, transparency: 100 } });
  slide.addText("本章结论", {
    x: 0.68,
    y: 2.08,
    w: 5.8,
    h: 0.28,
    fontFace: rsmPptxFont(theme),
    fontSize: 16,
    color: c.navy,
    bold: true
  });
  slide.addText(pptxBulletLines(brief.evidence, 3, 70).join("\n"), {
    x: 0.68,
    y: 2.44,
    w: 5.8,
    h: 1.75,
    fontFace: rsmPptxFont(theme),
    fontSize: 15.5,
    color: c.text,
    valign: "top",
    fit: "shrink"
  });
  slide.addText(pptxBulletLines(brief.implication, 2, 66).join("\n"), {
    x: 0.68,
    y: 4.32,
    w: 5.8,
    h: 0.9,
    fontFace: rsmPptxFont(theme),
    fontSize: 15,
    color: c.navy,
    valign: "top",
    fit: "shrink",
    breakLine: false
  });
  const cards = (blocks.routeCards || []).slice(0, 6);
  cards.forEach((text, i) => {
    const col = i % 2;
    const row = Math.floor(i / 2);
    const x = 7.0 + col * 6.25;
    const y = 1.85 + row * 1.18;
    slide.addShape(pptx.ShapeType.line, { x, y: y + 0.96, w: 6.0, h: 0, line: { color: c.line || "D9E1EA", width: 0.75 } });
    slide.addText(text, {
      x: x + 0.14,
      y: y + 0.12,
      w: 5.72,
      h: 0.8,
      fontFace: rsmPptxFont(theme),
    fontSize: 13.5,
      color: c.text,
      valign: "top",
      fit: "shrink"
    });
  });
  if (blocks.story) {
    slide.addShape(pptx.ShapeType.rect, { x: 0.48, y: 5.82, w: 19.17, h: 0.42, fill: { color: c.white }, line: { color: c.primary, width: 0.75 } });
    slide.addText("图表阅读顺序：本章按“问题起点 → 差异拆解 → 管理含义”展开，每页图表均说明上承和下启关系。", {
      x: 0.58,
      y: 5.89,
      w: 18.9,
      h: 0.28,
      fontFace: rsmPptxFont(theme),
      fontSize: 12,
      color: c.text,
      fit: "shrink"
    });
  }
  addRsmFooter(slide, pptx, theme, page, total);
}

function addChartPptxSlide(slide, pptx, theme, blocks, page, total, svg) {
  const c = theme.colors;
  const brief = pptxSlideBrief(blocks, "chart");
  slide.background = { color: c.bgSoft || "F7F9FB" };
  addRsmModuleBar(slide, pptx, theme, blocks.moduleLabel || "章节图表", 0.18);
  slide.addText(brief.title, {
    x: 0.62,
    y: 1.04,
    w: 18.1,
    h: 0.72,
    fontFace: rsmPptxFont(theme),
    fontSize: 32,
    color: c.secondary || "0099D8",
    bold: true,
    valign: "top",
    fit: "shrink"
  });
  slide.addText(brief.subtitle || "", {
    x: 0.62,
    y: 1.78,
    w: 18.1,
    h: 0.38,
    fontFace: rsmPptxFont(theme),
    fontSize: 16,
    color: c.slate,
    fit: "shrink"
  });
  const top = 2.55;
  slide.addShape(pptx.ShapeType.rect, { x: 0.62, y: top, w: 12.95, h: 7.35, fill: { color: c.white }, line: { color: "DCE5EE", transparency: 100 } });
  slide.addShape(pptx.ShapeType.rect, { x: 0.62, y: top, w: 12.95, h: 0.08, fill: { color: c.secondary || "0099D8" }, line: { color: c.secondary || "0099D8", transparency: 100 } });
  if (svg) slide.addImage({ data: svg, x: 0.9, y: top + 0.38, w: 12.35, h: 6.72 });
  addConsultingTextBlock(slide, pptx, theme, 13.92, top, 5.45, 3.3, "关键证据", brief.evidence, c.secondary || "0099D8");
  addConsultingTextBlock(slide, pptx, theme, 13.92, top + 3.62, 5.45, 2.95, "管理含义", brief.implication, c.navy);
  slide.addText(brief.note, {
    x: 13.98,
    y: top + 6.58,
    w: 5.25,
    h: 0.52,
    fontFace: rsmPptxFont(theme),
    fontSize: 9.5,
    color: c.muted,
    fit: "shrink"
  });
  addRsmFooter(slide, pptx, theme, page, total);
}

function svgElementToDataUrl(svg) {
  const serialized = new XMLSerializer().serializeToString(svg);
  return `data:image/svg+xml;base64,${btoa(unescape(encodeURIComponent(serialized)))}`;
}

async function imageUrlToDataUrl(url) {
  try {
    const response = await fetch(url, { cache: "force-cache" });
    if (!response.ok) return "";
    const blob = await response.blob();
    return await new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result || "");
      reader.onerror = () => resolve("");
      reader.readAsDataURL(blob);
    });
  } catch (error) {
    return "";
  }
}

function svgElementToPngDataUrl(svg) {
  return new Promise((resolve, reject) => {
    const serialized = new XMLSerializer().serializeToString(svg);
    const blob = new Blob([serialized], { type: "image/svg+xml;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const image = new Image();
    image.onload = () => {
      const width = svg.viewBox?.baseVal?.width || svg.width?.baseVal?.value || image.width || 1600;
      const height = svg.viewBox?.baseVal?.height || svg.height?.baseVal?.value || image.height || 900;
      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext("2d");
      if (!ctx) {
        URL.revokeObjectURL(url);
        reject(new Error("canvas unavailable"));
        return;
      }
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, width, height);
      ctx.drawImage(image, 0, 0, width, height);
      URL.revokeObjectURL(url);
      resolve(canvas.toDataURL("image/png"));
    };
    image.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("svg render failed"));
    };
    image.src = url;
  });
}

async function slideChartImageData(svg) {
  try {
    return await svgElementToPngDataUrl(svg);
  } catch (error) {
    return svgElementToDataUrl(svg);
  }
}

function addRsmModuleBar(slide, pptx, theme, label, y = 0.18) {
  const c = theme.colors;
  const topY = 0.22;
  slide.addShape(pptx.ShapeType.rect, {
    x: 0.62,
    y: 0.25,
    w: 0.08,
    h: 0.08,
    fill: { color: c.secondary || "0099D8" },
    line: { color: c.secondary || "0099D8", transparency: 100 }
  });
  slide.addText(label || "", {
    x: 0.61,
    y: topY,
    w: 18.77,
    h: 0.17,
    fontFace: rsmPptxFont(theme),
    fontSize: 11.5,
    color: c.navy,
    bold: true,
    fit: "shrink"
  });
  slide.addShape(pptx.ShapeType.rect, {
    x: 0.62,
    y: 1.0,
    w: 0.62,
    h: 0.04,
    fill: { color: c.secondary || "0099D8" },
    line: { color: c.secondary || "0099D8", transparency: 100 }
  });
  return;
  /*
  slide.addShape(pptx.ShapeType.line, {
    x: 0.48,
    y: y + 0.38,
    w: 19.05,
    h: 0,
    line: { color: c.line || "D9E1EA", width: 0.8 }
  });
  slide.addText(label || "", {
    x: 0.48,
    y,
    w: 16.7,
    h: 0.28,
    fontFace: rsmPptxFont(theme),
    fontSize: 10.5,
    color: c.navy,
    bold: true
  });
  slide.addShape(pptx.ShapeType.rect, { x: 18.38, y: y - 0.02, w: 1.15, h: 0.36, fill: { color: c.white }, line: { color: c.line || "D9E1EA", width: 0.6 } });
  slide.addText("RSM", {
    x: 18.42,
    y: y + 0.04,
    w: 1.07,
    h: 0.24,
    fontFace: theme.fonts?.en || "Inter",
    fontSize: 10,
    color: c.navy,
    bold: true,
    align: "center"
  });
  */
}

function addRsmFooter(slide, pptx, theme, page, total, sourceNote = "") {
  const c = theme.colors;
  const y = 10.75;
  slide.addShape(pptx.ShapeType.rect, { x: 0, y, w: theme.slideW, h: 0.5, fill: { color: c.white }, line: { color: c.white, transparency: 100 } });
  slide.addShape(pptx.ShapeType.line, { x: 0, y, w: theme.slideW, h: 0, line: { color: "DAE0E8", width: 0.75 } });
  slide.addText(theme.footerLeft, {
    x: 0.62,
    y: y + 0.17,
    w: 6.2,
    h: 0.16,
    fontFace: rsmPptxFont(theme),
    fontSize: 6.8,
    color: c.slate
  });
  slide.addShape(pptx.ShapeType.rect, { x: 9.74, y: y + 0.13, w: 0.6, h: 0.27, fill: { color: c.navy }, line: { color: c.navy, transparency: 100 } });
  slide.addText(`${String(page).padStart(2, "0")} / ${String(total).padStart(2, "0")}`, {
    x: 0.62,
    y: y + 0.17,
    w: 18.77,
    h: 0.18,
    fontFace: rsmPptxFont(theme),
    fontSize: 7,
    color: c.slate,
    align: "left",
    bold: false
  });
  slide.addText(sourceNote || (typeof rsmSourceLine === "function" ? rsmSourceLine() : theme.sourceLine), {
    x: 6.8,
    y: y + 0.17,
    w: 6.4,
    h: 0.16,
    fontFace: rsmPptxFont(theme),
    fontSize: 6.8,
    color: c.muted,
    align: "center"
  });
  slide.addText("RSM", {
    x: 18.25,
    y: y + 0.14,
    w: 1.2,
    h: 0.24,
    fontFace: theme.fonts?.en || "Inter",
    fontSize: 11,
    color: c.navy,
    align: "right",
    bold: true
  });
}

function addCoverSlide(slide, pptx, theme, blocks, page, total) {
  const c = theme.colors;
  slide.background = { color: c.bg || "FFFFFF" };
  slide.addShape(pptx.ShapeType.rect, { x: 0, y: 0, w: theme.slideW, h: theme.slideH, fill: { color: c.bg || "FFFFFF" }, line: { color: c.bg || "FFFFFF", transparency: 100 } });
  slide.addShape(pptx.ShapeType.rect, { x: 0.62, y: 0.55, w: 0.34, h: 0.06, fill: { color: "8A8F95" }, line: { color: "8A8F95", transparency: 100 } });
  slide.addShape(pptx.ShapeType.rect, { x: 1.02, y: 0.55, w: 0.34, h: 0.06, fill: { color: "10B981" }, line: { color: "10B981", transparency: 100 } });
  slide.addShape(pptx.ShapeType.rect, { x: 1.42, y: 0.55, w: 0.72, h: 0.06, fill: { color: c.secondary || "0099D8" }, line: { color: c.secondary || "0099D8", transparency: 100 } });
  slide.addShape(pptx.ShapeType.rect, { x: 17.92, y: 0.62, w: 1.46, h: 0.5, fill: { color: c.navy }, line: { color: c.navy, transparency: 100 } });
  slide.addText("RSM", {
    x: 18.18,
    y: 0.72,
    w: 0.96,
    h: 0.22,
    fontFace: theme.fonts?.en || "Inter",
    fontSize: 15,
    color: c.white,
    bold: true,
    align: "center"
  });
  slide.addText("董事会汇报", {
    x: 0.62,
    y: 1.08,
    w: 2.2,
    h: 0.21,
    fontFace: rsmPptxFont(theme),
    fontSize: 13,
    color: c.secondary || "0099D8",
    bold: true,
    charSpace: 5
  });
  slide.addText(blocks.coverTitle || blocks.title, {
    x: 0.62,
    y: 2.16,
    w: 11.36,
    h: 2.45,
    fontFace: rsmPptxFont(theme),
    fontSize: 42,
    color: c.secondary || "0099D8",
    bold: true,
    valign: "top"
  });
  slide.addText(blocks.coverSub || blocks.subtitle, {
    x: 0.62,
    y: 5.1,
    w: 11.42,
    h: 0.38,
    fontFace: rsmPptxFont(theme),
    fontSize: 22,
    color: c.navy,
    valign: "top"
  });
  slide.addText(blocks.coverVqa || "", {
    x: 0.62,
    y: 5.7,
    w: 11.42,
    h: 1.41,
    fontFace: rsmPptxFont(theme),
    fontSize: 14,
    color: c.text,
    valign: "top",
    fit: "shrink"
  });
  slide.addShape(pptx.ShapeType.line, { x: 0.62, y: 5.21, w: 18.75, h: 0, line: { color: c.secondary || "0099D8", transparency: 0, width: 1.2 } });
  slide.addShape(pptx.ShapeType.line, { x: 13.33, y: 5.62, w: 0, h: 2.49, line: { color: c.secondary || "0099D8", transparency: 15, width: 1.2 } });
  slide.addText("报告元数据", {
    x: 13.68,
    y: 5.69,
    w: 0.91,
    h: 0.18,
    fontFace: rsmPptxFont(theme),
    fontSize: 11,
    color: c.secondary || "0099D8",
    bold: true,
    charSpace: 2
  });
  const metaText = [...document.querySelectorAll(".rsm-meta-grid div")].slice(0, 6).map((item) => {
    const label = item.querySelector("strong")?.textContent?.trim() || "";
    const value = item.querySelector("span")?.textContent?.trim() || "";
    return `${label}：${value}`;
  }).join("\n");
  slide.addText(metaText, {
    x: 13.68,
    y: 6.13,
    w: 4.9,
    h: 1.93,
    fontFace: rsmPptxFont(theme),
    fontSize: 12.5,
    color: c.text,
    valign: "top",
    fit: "shrink"
  });
  const pathText = document.querySelector(".rsm-cover-path")?.textContent?.trim() || "";
  slide.addShape(pptx.ShapeType.line, { x: 0.62, y: 9.9, w: 18.75, h: 0, line: { color: c.line || "D9E1EA", width: 0.75 } });
  slide.addText(pathText, {
    x: 0.63,
    y: 9.1,
    w: 12.68,
    h: 0.22,
    fontFace: rsmPptxFont(theme),
    fontSize: 11.5,
    color: c.text,
    bold: true
  });
  slide.addText(`${String(page).padStart(2, "0")} / ${String(total).padStart(2, "0")}`, {
    x: 0.62,
    y: 10.21,
    w: 18.77,
    h: 0.25,
    fontFace: rsmPptxFont(theme),
    fontSize: 10,
    color: c.muted
  });
}

function addTocSlide(slide, pptx, theme, blocks, page, total) {
  const c = theme.colors;
  slide.background = { color: c.bg || "FFFFFF" };
  slide.addShape(pptx.ShapeType.rect, { x: 0.62, y: 0.55, w: 0.34, h: 0.06, fill: { color: "8A8F95" }, line: { color: "8A8F95", transparency: 100 } });
  slide.addShape(pptx.ShapeType.rect, { x: 1.02, y: 0.55, w: 0.34, h: 0.06, fill: { color: "10B981" }, line: { color: "10B981", transparency: 100 } });
  slide.addShape(pptx.ShapeType.rect, { x: 1.42, y: 0.55, w: 0.72, h: 0.06, fill: { color: c.secondary || "0099D8" }, line: { color: c.secondary || "0099D8", transparency: 100 } });
  slide.addShape(pptx.ShapeType.rect, { x: 0.62, y: 1.34, w: 4.86, h: 7.6, fill: { color: c.bgSoft || "F7F8FA" }, line: { color: c.line || "D9E1EA", width: 0.75 } });
  slide.addShape(pptx.ShapeType.rect, { x: 0.62, y: 1.34, w: 0.08, h: 7.6, fill: { color: c.secondary || "0099D8" }, line: { color: c.secondary || "0099D8", transparency: 100 } });
  slide.addText("目录", {
    x: 0.62,
    y: 1.65,
    w: 3.6,
    h: 0.6,
    fontFace: rsmPptxFont(theme),
    fontSize: 36,
    color: c.secondary || "0099D8",
    bold: true
  });
  slide.addText("本汇报按样本边界、核心判断、专题证据与行动建议展开，页序与正式报告保持一致。", {
    x: 0.62,
    y: 2.45,
    w: 4.35,
    h: 2.4,
    fontFace: rsmPptxFont(theme),
    fontSize: 14,
    color: c.text,
    valign: "top",
    fit: "shrink"
  });
  slide.addText("P02 · 报告导航", {
    x: 6.46,
    y: 0.22,
    w: 12.93,
    h: 0.3,
    fontFace: rsmPptxFont(theme),
    fontSize: 13,
    color: c.navy,
    bold: true
  });
  slide.addShape(pptx.ShapeType.line, { x: 7.42, y: 1.77, w: 11.96, h: 0, line: { color: c.line || "D9E1EA", width: 0.75 } });
  (blocks.tocItems || []).slice(0, 8).forEach((item, i) => {
    const num = item.match(/^(\S+)/)?.[1] || String(i + 1).padStart(2, "0");
    const label = item.replace(/^(\S+)\s*/, "");
    const y = 1.92 + i * 0.78;
    slide.addText(num, {
      x: 6.47,
      y,
      w: 0.72,
      h: 0.36,
      fontFace: rsmPptxFont(theme),
      fontSize: 22,
      color: c.secondary || "0099D8",
      bold: true
    });
    slide.addText(label, {
      x: 7.38,
      y: y + 0.02,
      w: 10.9,
      h: 0.34,
      fontFace: rsmPptxFont(theme),
      fontSize: 15,
      color: c.navy,
      bold: true,
      fit: "shrink"
    });
    slide.addShape(pptx.ShapeType.line, { x: 6.47, y: y + 0.48, w: 12.9, h: 0, line: { color: c.line || "D9E1EA", width: 0.6 } });
  });
  /*
  slide.addText((blocks.tocItems || []).join("\n"), {
    x: 3.2,
    y: 0.88,
    w: 16.2,
    h: 4.2,
    fontFace: rsmPptxFont(theme),
    fontSize: 10.5,
    color: c.navy,
    valign: "top",
    fit: "shrink"
  });
  */
  if (blocks.story) {
    slide.addShape(pptx.ShapeType.rect, { x: 7.42, y: 9.33, w: 8.02, h: 0.21, fill: { color: c.bgSoft || "F7F9FB" }, line: { color: c.bgSoft || "F7F9FB", transparency: 100 } });
    slide.addText(blocks.story, {
      x: 7.42,
      y: 9.33,
      w: 8.02,
      h: 0.21,
      fontFace: rsmPptxFont(theme),
      fontSize: 11,
      color: c.slate,
      fit: "shrink"
    });
  }
  addRsmFooter(slide, pptx, theme, page, total);
}

function addTableLikePanel(slide, pptx, theme, x, y, w, h, title, lines, accent = "0099D8") {
  const c = theme.colors;
  const bodyLines = pptxBulletLines(lines || [], 2, 58);
  slide.addShape(pptx.ShapeType.rect, { x, y, w, h, fill: { color: c.white }, line: { color: "DCE5EE", width: 0.75 } });
  slide.addShape(pptx.ShapeType.rect, { x, y, w, h: 0.08, fill: { color: accent }, line: { color: accent, transparency: 100 } });
  slide.addText(title, {
    x: x + 0.18,
    y: y + 0.17,
    w: w - 0.36,
    h: 0.36,
    fontFace: rsmPptxFont(theme),
    fontSize: 21,
    color: c.navy,
    bold: true,
    fit: "shrink"
  });
  slide.addText(bodyLines.join("\n"), {
    x: x + 0.18,
    y: y + 0.72,
    w: w - 0.36,
    h: Math.max(0.2, h - 0.88),
    fontFace: rsmPptxFont(theme),
    fontSize: 17,
    color: c.text,
    valign: "top",
    fit: "shrink",
    breakLine: false
  });
}

function addContentSlide(slide, pptx, theme, blocks, page, total, svg) {
  const c = theme.colors;
  const brief = pptxSlideBrief(blocks, "content");
  slide.background = { color: c.bgSoft || "F7F9FB" };
  addRsmModuleBar(slide, pptx, theme, blocks.moduleLabel || blocks.title, 0.18);
  slide.addText(brief.title, {
    x: 0.62,
    y: 1.04,
    w: 18.3,
    h: 0.78,
    fontFace: rsmPptxFont(theme),
    fontSize: 32,
    color: c.secondary || "0099D8",
    bold: true,
    valign: "top",
    fit: "shrink"
  });
  if (brief.subtitle) {
    slide.addText(brief.subtitle, {
      x: 0.62,
      y: 1.84,
      w: 18.3,
      h: 0.4,
      fontFace: rsmPptxFont(theme),
      fontSize: 16,
      color: c.slate,
      fit: "shrink"
    });
  }
  const bodyTop = 2.58;
  if (svg) {
    slide.addShape(pptx.ShapeType.rect, { x: 0.62, y: bodyTop, w: 12.29, h: 7.09, fill: { color: c.white }, line: { color: "E5EAF0", transparency: 100 } });
    slide.addImage({ data: svg, x: 0.82, y: bodyTop + 0.28, w: 11.88, h: 6.55 });
    slide.addShape(pptx.ShapeType.line, { x: 13.12, y: bodyTop, w: 0, h: 7.08, line: { color: c.secondary || "0099D8", width: 2 } });
    addConsultingTextBlock(slide, pptx, theme, 13.43, bodyTop + 0.02, 5.63, 3.2, "关键证据", brief.evidence, c.secondary || "0099D8");
    addConsultingTextBlock(slide, pptx, theme, 13.43, bodyTop + 3.55, 5.63, 3.25, "管理含义", brief.implication, c.navy);
  } else if (blocks.className.includes("executive-slide") && (blocks.metrics.length || blocks.comments.length)) {
    const kpiW = 4.64;
    const kpiY = 3.29;
    blocks.metrics.slice(0, 4).forEach((text, i) => {
      const x = 0.62 + i * 4.79;
      const parts = text.split(" ");
      slide.addShape(pptx.ShapeType.rect, { x, y: kpiY, w: kpiW, h: 3.54, fill: { color: c.white }, line: { color: "DCE5EE", width: 0.75 } });
      slide.addShape(pptx.ShapeType.line, { x: x + 0.28, y: 5.3, w: kpiW - 0.58, h: 0, line: { color: c.line || "D9E1EA", width: 0.75 } });
      slide.addText(parts.slice(1).join(" ") || text, {
        x: x + 0.24,
        y: kpiY + 0.3,
        w: kpiW - 0.48,
        h: 0.38,
        fontFace: rsmPptxFont(theme),
        fontSize: 14.5,
        color: c.slate,
        bold: true,
        fit: "shrink"
      });
      slide.addText(parts[0] || "", {
        x: x + 0.24,
        y: kpiY + 1.28,
        w: kpiW - 0.48,
        h: 0.7,
        fontFace: rsmPptxFont(theme),
        fontSize: 32,
        color: c.navy,
        bold: true,
        align: "center",
        fit: "shrink"
      });
    });
    addTableLikePanel(slide, pptx, theme, 0.62, 7.42, 8.79, 1.95, "关键证据", brief.evidence.slice(0, 2), c.secondary || "0099D8");
    addTableLikePanel(slide, pptx, theme, 10.53, 7.42, 8.54, 1.95, "管理含义", brief.implication.slice(0, 2), c.navy);
  } else if (blocks.scopeItems.length || blocks.methodCards.length || blocks.topics.length || blocks.actionCards.length || blocks.consultingCards.length) {
    const list = blocks.consultingCards.length ? blocks.consultingCards : blocks.scopeItems.length ? blocks.scopeItems : blocks.methodCards.length ? blocks.methodCards : blocks.topics.length ? blocks.topics : blocks.actionCards;
    const topRows = list.slice(0, 6);
    const cols = blocks.actionCards.length ? 3 : 3;
    const panelW = cols === 3 ? 6.04 : 9.0;
    topRows.slice(0, cols).forEach((text, i) => {
      const x = 0.62 + i * 6.36;
      addTableLikePanel(slide, pptx, theme, x, bodyTop, panelW, 3.54, text.split("：")[0], [text.split("：").slice(1).join("：") || text], i === 1 ? c.secondary || "0099D8" : c.navy);
    });
    addConsultingTextBlock(slide, pptx, theme, 0.62, 6.25, 9.05, 3.65, "关键证据", brief.evidence, c.secondary || "0099D8");
    addConsultingTextBlock(slide, pptx, theme, 10.25, 6.25, 9.12, 3.65, "管理含义", brief.implication, c.navy);
  } else if (blocks.metrics.length || blocks.comments.length) {
    slide.addShape(pptx.ShapeType.rect, { x: 0.62, y: bodyTop, w: 6.05, h: 7.09, fill: { color: c.white }, line: { color: "E5EAF0", width: 1 } });
    slide.addText(pptxBulletLines(blocks.metrics, 4, 38).join("\n"), {
      x: 0.9,
      y: bodyTop + 0.25,
      w: 5.48,
      h: 6.55,
      fontFace: rsmPptxFont(theme),
      fontSize: 14.5,
      color: c.navy,
      valign: "top",
      fit: "shrink"
    });
    slide.addShape(pptx.ShapeType.rect, { x: 6.88, y: bodyTop, w: 12.5, h: 7.09, fill: { color: c.white }, line: { color: "E5EAF0", width: 1 } });
    slide.addText(pptxBulletLines([...brief.evidence, ...brief.implication], 5, 78).join("\n"), {
      x: 7.16,
      y: bodyTop + 0.25,
      w: 11.9,
      h: 6.55,
      fontFace: rsmPptxFont(theme),
      fontSize: 14.5,
      color: c.text,
      valign: "top",
      fit: "shrink"
    });
  } else {
    slide.addShape(pptx.ShapeType.rect, { x: 0.62, y: bodyTop, w: 18.75, h: 7.09, fill: { color: c.white }, line: { color: "E5EAF0", width: 1 } });
    slide.addText(pptxBulletLines([...brief.evidence, ...brief.implication], 5, 90).join("\n"), {
      x: 0.9,
      y: bodyTop + 0.3,
      w: 18.1,
      h: 6.45,
      fontFace: rsmPptxFont(theme),
      fontSize: 17,
      color: c.text,
      valign: "top",
      fit: "shrink"
    });
  }
  addRsmFooter(slide, pptx, theme, page, total);
}

async function downloadPptxReport() {
  if (typeof preflightExport === "function" && !preflightExport("PPTX")) return;
  if (typeof preflightExport !== "function" && !state.confirmed) {
    setProjectStatus("请先确认分析口径，再导出 PPTX。");
    return;
  }
  try {
    await ensurePptxLoaded();
    buildPrintDeck();
    const theme = rsmPptxTheme();
    theme.coverBgData = await imageUrlToDataUrl(theme.coverBg || "assets/sunong_ref/cover-bg.png");
    const pptx = new PptxGenJS();
    pptx.defineLayout({ name: "RSM_WIDE", width: theme.slideW, height: theme.slideH });
    pptx.layout = "RSM_WIDE";
    pptx.author = "RSM 银行董办对标分析工具";
    pptx.company = "RSM";
    pptx.subject = `${state.target}_${state.year}_价值质量诊断`;
    pptx.title = `${state.target}价值质量诊断与经营对标分析`;

    const slides = [...document.querySelectorAll("#printDeck .print-slide")];
    for (let index = 0; index < slides.length; index += 1) {
      const slideEl = slides[index];
      const slide = pptx.addSlide();
      const blocks = slideTextBlocks(slideEl);
      const deckType = slideEl.dataset.deckType || "content";
      const page = Number(slideEl.dataset.slideIndex || index + 1);
      const total = Number(slideEl.dataset.slideTotal || slides.length);
      const svgEl = slideEl.querySelector("svg");
      const svg = svgEl ? await slideChartImageData(svgEl) : null;

      if (deckType === "cover") {
        addCoverSlide(slide, pptx, theme, blocks, page, total);
      } else if (deckType === "toc") {
        addTocSlide(slide, pptx, theme, blocks, page, total);
      } else if (deckType === "chapter-agenda") {
        addChapterAgendaSlide(slide, pptx, theme, blocks, page, total);
      } else if (deckType === "chart") {
        addChartPptxSlide(slide, pptx, theme, blocks, page, total, svg);
      } else {
        addContentSlide(slide, pptx, theme, blocks, page, total, svg);
      }
    }

    const filename = `${safeFilename(state.target)}_${state.year}_苏农风格演示报告.pptx`;
    await pptx.writeFile({ fileName: filename });
    if (typeof recordExportHistory === "function") recordExportHistory("PPTX");
    setProjectStatus(`PPTX 已导出：${filename}，版式对齐苏农汇报材料（${theme.slideW}×${theme.slideH} in）。`);
  } catch (error) {
    console.error("PPTX export failed", error);
    const message = error?.message ? `（${error.message}）` : "";
    setProjectStatus(`PPTX 导出失败${message}。已内置本地 PPTX 引擎；如仍失败，请先导出 HTML 汇报稿或查看控制台错误。`);
  }
}

function initPptxExport() {
  document.getElementById("exportReportPptx")?.addEventListener("click", () => {
    renderAll();
    downloadPptxReport();
  });
}
