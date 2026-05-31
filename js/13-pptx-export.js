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

function pptxMechanismSlideRows(limitPerModule = 3) {
  const pack = typeof buildMechanismFactPackObject === "function" ? buildMechanismFactPackObject() : null;
  if (!pack?.modules) return [];
  return Object.values(pack.modules).flatMap((module) => (module.rows || []).slice(0, limitPerModule).map((row) => ({
    module: module.title,
    headline: module.headline,
    metric: row.指标名称 || row.指标代码,
    target: row.目标值 || "暂无",
    benchmark: row.对标值 || "暂无",
    gap: row.差距 || "暂无",
    readout: row.判断 || module.headline || "用于解释差距来源。",
    risk: row.口径风险等级 || "L2"
  })));
}

function pptxMechanismModuleGroups(limitPerModule = 3) {
  const rows = pptxMechanismSlideRows(limitPerModule);
  const grouped = rows.reduce((acc, row) => {
    if (!acc[row.module]) acc[row.module] = { module: row.module, headline: row.headline, rows: [] };
    acc[row.module].rows.push(row);
    return acc;
  }, {});
  return Object.values(grouped);
}

function pptxProfitWaterfallRows(row = targetRecord()) {
  const pack = typeof netProfitAttribution === "function" ? netProfitAttribution(row) : null;
  if (!pack?.items?.length) return [];
  let running = pack.from || 0;
  return pack.items.map((item) => {
    const start = running;
    const value = Number(item.value) || 0;
    running += value;
    return {
      key: item.key,
      label: item.label,
      value,
      start,
      end: running,
      share: item.share,
      tone: value > 0 ? "positive" : value < 0 ? "negative" : "neutral"
    };
  });
}

function pptxBenchmarkLineRows(key = "nim", row = targetRecord(), peers = peerRecords()) {
  const value = row?.[key];
  const lines = typeof benchmarkLinesForMetric === "function" ? benchmarkLinesForMetric(key, peers) : [];
  return {
    key,
    target: {
      label: fieldName(key),
      value,
      text: metricDisplayValue(key, value)
    },
    lines: lines.map((line) => ({
      label: line.label,
      kind: line.kind,
      value: line.value,
      text: metricDisplayValue(key, line.value)
    })).filter((line) => Number.isFinite(line.value))
  };
}

function pptxNimBridgeRows(row = targetRecord(), peers = peerRecords()) {
  return ["nim", "earningAssetYield", "interestLiabilityCost", "timeDepositShare"].map((key) => {
    const value = row?.[key];
    const peer = avg(peers, key);
    const gap = value == null || peer == null ? null : value - peer;
    return {
      key,
      label: fieldName(key),
      value,
      peer,
      gap,
      valueText: metricDisplayValue(key, value),
      peerText: metricDisplayValue(key, peer),
      gapText: metricDisplayValue(key, gap),
      tone: gap == null ? "neutral" : (metricDirection(key) ? gap >= 0 : gap <= 0) ? "positive" : "negative"
    };
  });
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

function pptxManagementImplication(blocks = {}, deckType = "content") {
  const target = pptxCurrentTarget();
  const titleText = `${blocks.title || ""} ${blocks.subtitle || ""} ${blocks.story || ""}`;
  if (deckType === "chart") return `若本页差异持续存在，应将${target}纳入季度复盘口径，并明确责任部门。`;
  if (/风险|不良|拨备|逾期/.test(titleText)) return `${target}下一步应把风险确认、拨备缓冲和利润释放放在同一张复盘表里。`;
  if (/息差|NIM|负债|存款|贷款/.test(titleText)) return `${target}下一步应把资产收益率、负债成本和存款结构拆成月度 ALM 动作。`;
  if (/盈利|利润|营收|ROA|ROE/.test(titleText)) return `${target}下一步应先验证核心营收、费用刚性和拨备节奏是否同向支撑净利润。`;
  if (/PB|估值|资本市场|市净率/.test(titleText)) return `${target}下一步应把估值沟通绑定到经营质量、资本效率和风险确认证据。`;
  return `${target}后续应把本页判断转化为可跟踪指标、阈值和责任机制。`;
}

function pptxImplicationLines(blocks, deckType = "content") {
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
  implications.push(pptxManagementImplication(blocks, deckType));
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

function pptxRiskFooterNote(blocks = {}, theme = rsmPptxTheme()) {
  const risks = (blocks.riskFootnotes || [])
    .map((item) => pptxCleanText(item))
    .filter(Boolean);
  if (!risks.length) return typeof rsmSourceLine === "function" ? rsmSourceLine() : theme.sourceLine;
  const levelRank = { L4: 4, L3: 3, L2: 2, L1: 1 };
  const sorted = risks.sort((a, b) => {
    const aLevel = a.match(/L[1-4]/)?.[0] || "L1";
    const bLevel = b.match(/L[1-4]/)?.[0] || "L1";
    return (levelRank[bLevel] || 0) - (levelRank[aLevel] || 0);
  });
  return pptxShortText(`口径提示：${sorted.slice(0, 2).join("；")}`, 95);
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
  const figureTitle = slideEl.matches?.(".figure-thumb, .formal-figure-card") ? slideEl.querySelector("b")?.textContent?.trim() || slideEl.querySelector("img")?.alt || "" : "";
  const figureStory = slideEl.matches?.(".figure-thumb, .formal-figure-card") ? slideEl.querySelector("span")?.textContent?.trim() || slideEl.querySelector("figcaption span")?.textContent?.trim() || "" : "";
  const title = slideEl.querySelector(".rsm-slide-head h2")?.textContent?.trim()
    || slideEl.querySelector(".print-head h2")?.textContent?.trim()
    || slideEl.querySelector("h1")?.textContent?.trim()
    || figureTitle
    || "";
  const subtitle = slideEl.querySelector(".rsm-slide-head p")?.textContent?.trim()
    || slideEl.querySelector(".print-head p")?.textContent?.trim()
    || figureStory
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

function formalSlideTextBlocks(sectionEl, index = 0, sections = []) {
  const title = sectionEl.dataset.sectionTitle || sectionEl.querySelector("h1, h2")?.textContent?.trim() || `${displayBankName(state.target)}正式报告`;
  const subtitle = sectionEl.querySelector(".formal-lead, header p, .formal-callout p")?.textContent?.trim() || "";
  const moduleLabel = sectionEl.dataset.moduleLabel
    || sectionEl.querySelector(".formal-section-kicker")?.textContent?.trim()
    || (sectionEl.matches(".formal-cover") ? "董事会经营诊断报告" : "正式报告");
  const metrics = [...sectionEl.querySelectorAll(".formal-metric-hero")].slice(0, 6).map((el) => {
    const label = el.querySelector("span")?.textContent?.trim() || "";
    const value = el.querySelector("b")?.textContent?.trim() || "";
    const note = el.querySelector("em, p")?.textContent?.trim() || "";
    return `${label} ${value}${note ? `｜${note}` : ""}`;
  });
  const facts = [...sectionEl.querySelectorAll(".formal-fact-table tbody tr")].slice(0, 5).map((tr) => [...tr.children].map((td) => td.textContent.trim()).filter(Boolean).join("｜"));
  const cards = [...sectionEl.querySelectorAll(".formal-action-card, .formal-consistency-card, .formal-drill-card, .formal-guided-step, .formal-whatif-strip > div, .formal-risk-card, .formal-sequence-card, .formal-mechanism-card, .formal-mechanism-table tbody tr")].slice(0, 8).map((el) => {
    const label = el.querySelector("span")?.textContent?.trim() || "";
    const head = el.querySelector("b, h3")?.textContent?.trim() || "";
    const note = el.matches("tr")
      ? [...el.children].map((td) => td.textContent.trim()).filter(Boolean).join("｜")
      : [...el.querySelectorAll("p, em")].map((p) => p.textContent.trim()).filter(Boolean).join("；");
    return `${label} ${head}${note ? `：${note}` : ""}`.trim();
  });
  const paragraphs = [...sectionEl.querySelectorAll("p")].map((p) => p.textContent.trim()).filter(Boolean);
  const riskFootnotes = [...sectionEl.querySelectorAll(".formal-risk-footnotes p")].map((p) => p.textContent.trim()).filter(Boolean);
  const tocItems = sections.slice(0, 9).map((el, i) => `${String(i + 1).padStart(2, "0")} ${el.dataset.sectionTitle || el.querySelector("h1, h2")?.textContent?.trim() || "报告章节"}`);
  return {
    moduleLabel,
    className: sectionEl.className || "",
    title,
    subtitle,
    story: pptxShortText(paragraphs.join(" "), 140),
    comments: pptxKeyLines(paragraphs, 5, 84),
    blocks: pptxKeyLines([...facts, ...cards], 6, 84),
    flow: [],
    routeCards: [],
    routeSteps: [],
    metrics: pptxKeyLines(metrics, 8, 44),
    scopeItems: [],
    methodCards: [],
    topics: pptxKeyLines(cards, 8, 78),
    actionCards: pptxKeyLines(cards, 6, 78),
    consultingCards: pptxKeyLines([...cards, ...paragraphs], 8, 82),
    riskFootnotes: pptxKeyLines(riskFootnotes, 4, 90),
    coverTitle: sectionEl.matches(".formal-cover") ? title : "",
    coverSub: sectionEl.matches(".formal-cover") ? subtitle : "",
    coverVqa: sectionEl.matches(".formal-cover") ? sectionEl.querySelector("aside")?.textContent?.trim() || "" : "",
    tocItems
  };
}

function formalReportSlidesForPptx() {
  if (typeof renderFormalReport === "function") renderFormalReport();
  const sections = typeof applyFormalReportContract === "function"
    ? applyFormalReportContract()
    : [...document.querySelectorAll("#formalReport > header, #formalReport > section")];
  if (sections.length) return sections;
  if (typeof buildPrintDeck === "function") buildPrintDeck();
  return [...document.querySelectorAll("#printDeck .print-slide")];
}

function slideRasterImageUrl(slideEl) {
  const img = slideEl.querySelector("img");
  if (!img) return "";
  const src = img.dataset?.src || img.currentSrc || img.src || "";
  if (!src || src.startsWith("data:image/svg+xml")) return "";
  return src;
}

function parseMetricForPptx(line = "") {
  const text = pptxCleanText(line);
  const match = text.match(/(.+?)\s+(-?\d+(?:\.\d+)?)(%|bp|x|倍|pct)?/);
  return {
    label: match ? match[1].replace(/[｜|].*$/, "").slice(0, 18) : text.slice(0, 18),
    value: match ? `${match[2]}${match[3] || ""}` : "",
    raw: match ? Number(match[2]) : null,
    note: text.replace(match?.[0] || "", "").replace(/^｜/, "").slice(0, 38)
  };
}

function addFormalMetricStrip(slide, pptx, theme, blocks, x, y, w) {
  const c = theme.colors;
  const metrics = (blocks.metrics || []).slice(0, 4).map(parseMetricForPptx);
  if (!metrics.length) return 0;
  const gap = 0.16;
  const cardW = (w - gap * (metrics.length - 1)) / metrics.length;
  metrics.forEach((metric, i) => {
    const cx = x + i * (cardW + gap);
    slide.addShape(pptx.ShapeType.rect, { x: cx, y, w: cardW, h: 1.05, fill: { color: "F3F8FC" }, line: { color: "D9E4EF", width: 0.65 } });
    slide.addShape(pptx.ShapeType.rect, { x: cx, y, w: 0.08, h: 1.05, fill: { color: c.secondary || "0099D8" }, line: { color: c.secondary || "0099D8", transparency: 100 } });
    slide.addText(metric.value || "--", {
      x: cx + 0.18,
      y: y + 0.12,
      w: cardW - 0.3,
      h: 0.34,
      fontFace: rsmPptxFont(theme),
      fontSize: 21,
      color: c.navy,
      bold: true,
      fit: "shrink"
    });
    slide.addText(metric.label, {
      x: cx + 0.18,
      y: y + 0.5,
      w: cardW - 0.3,
      h: 0.24,
      fontFace: rsmPptxFont(theme),
      fontSize: 10.5,
      color: c.slate,
      bold: true,
      fit: "shrink"
    });
    slide.addText(metric.note, {
      x: cx + 0.18,
      y: y + 0.75,
      w: cardW - 0.3,
      h: 0.22,
      fontFace: rsmPptxFont(theme),
      fontSize: 8.5,
      color: c.slate,
      fit: "shrink"
    });
  });
  return 1.18;
}

function addFormalEvidenceBars(slide, pptx, theme, blocks, x, y, w, h) {
  const c = theme.colors;
  const lines = [...(blocks.blocks || []), ...(blocks.consultingCards || []), ...(blocks.comments || [])].slice(0, 5);
  slide.addShape(pptx.ShapeType.rect, { x, y, w, h, fill: { color: c.white }, line: { color: "DCE5EE", width: 0.75 } });
  slide.addText("主证据对象", {
    x: x + 0.25,
    y: y + 0.18,
    w: w - 0.5,
    h: 0.28,
    fontFace: rsmPptxFont(theme),
    fontSize: 15,
    color: c.navy,
    bold: true
  });
  if (!lines.length) {
    slide.addText("本页暂无可转化为图表的结构化证据，建议回到正式报告补充指标表或专题图。", {
      x: x + 0.25,
      y: y + 0.65,
      w: w - 0.5,
      h: h - 0.8,
      fontFace: rsmPptxFont(theme),
      fontSize: 14,
      color: c.text,
      fit: "shrink"
    });
    return;
  }
  const max = Math.max(...lines.map((line) => Math.abs(parseMetricForPptx(line).raw ?? 1)), 1);
  lines.forEach((line, i) => {
    const metric = parseMetricForPptx(line);
    const rowY = y + 0.68 + i * ((h - 1.0) / Math.max(lines.length, 1));
    const barW = Math.max(0.35, Math.min(1, Math.abs(metric.raw ?? (lines.length - i)) / max) * (w - 3.1));
    const fill = i === 0 ? (c.secondary || "0099D8") : i === 1 ? c.navy : "7ED0F0";
    slide.addText(metric.label, {
      x: x + 0.25,
      y: rowY,
      w: 2.1,
      h: 0.28,
      fontFace: rsmPptxFont(theme),
      fontSize: 10.5,
      color: c.text,
      bold: i < 2,
      fit: "shrink"
    });
    slide.addShape(pptx.ShapeType.rect, { x: x + 2.45, y: rowY + 0.04, w: w - 3.25, h: 0.16, fill: { color: "EEF3F7" }, line: { color: "EEF3F7", transparency: 100 } });
    slide.addShape(pptx.ShapeType.rect, { x: x + 2.45, y: rowY + 0.04, w: barW, h: 0.16, fill: { color: fill }, line: { color: fill, transparency: 100 } });
    slide.addText(metric.value || metric.note || "证据", {
      x: x + w - 0.72,
      y: rowY - 0.02,
      w: 0.55,
      h: 0.24,
      fontFace: rsmPptxFont(theme),
      fontSize: 9.5,
      color: c.navy,
      bold: true,
      fit: "shrink"
    });
  });
  slide.addShape(pptx.ShapeType.line, { x: x + 2.45, y: y + h - 0.4, w: w - 3.25, h: 0, line: { color: "D9E4EF", width: 0.6, dash: "dash" } });
  slide.addText("注：条形长度按本页可识别数字归一化显示，用于保留图表阅读路径；正式数值以报告表格为准。", {
    x: x + 0.25,
    y: y + h - 0.31,
    w: w - 0.5,
    h: 0.18,
    fontFace: rsmPptxFont(theme),
    fontSize: 7.8,
    color: c.slate,
    fit: "shrink"
  });
}

function addFormalHtmlAlignedSlide(slide, pptx, theme, blocks, page, total) {
  const c = theme.colors;
  const brief = pptxSlideBrief(blocks, "content");
  slide.background = { color: c.bg || "FFFFFF" };
  slide.addShape(pptx.ShapeType.rect, { x: 0.48, y: 0.34, w: 0.36, h: 0.06, fill: { color: "6A6F76" }, line: { color: "6A6F76", transparency: 100 } });
  slide.addShape(pptx.ShapeType.rect, { x: 0.9, y: 0.34, w: 0.36, h: 0.06, fill: { color: "10B981" }, line: { color: "10B981", transparency: 100 } });
  slide.addShape(pptx.ShapeType.rect, { x: 1.32, y: 0.34, w: 0.72, h: 0.06, fill: { color: c.secondary || "0099D8" }, line: { color: c.secondary || "0099D8", transparency: 100 } });
  slide.addText(blocks.moduleLabel || "正式报告", {
    x: 14.6,
    y: 0.22,
    w: 4.8,
    h: 0.34,
    fontFace: rsmPptxFont(theme),
    fontSize: 12,
    color: c.secondary || "0099D8",
    bold: true,
    align: "right",
    fit: "shrink"
  });
  slide.addText(brief.title, {
    x: 0.48,
    y: 0.72,
    w: 18.9,
    h: 0.78,
    fontFace: rsmPptxFont(theme),
    fontSize: 31,
    color: c.navy,
    bold: true,
    fit: "shrink",
    valign: "top"
  });
  slide.addShape(pptx.ShapeType.rect, { x: 0.48, y: 1.63, w: 18.9, h: 0.62, fill: { color: "F3F8FC" }, line: { color: "F3F8FC", transparency: 100 } });
  slide.addShape(pptx.ShapeType.rect, { x: 0.48, y: 1.63, w: 0.12, h: 0.62, fill: { color: c.secondary || "0099D8" }, line: { color: c.secondary || "0099D8", transparency: 100 } });
  slide.addText(brief.subtitle || brief.note, {
    x: 0.75,
    y: 1.74,
    w: 18.25,
    h: 0.38,
    fontFace: rsmPptxFont(theme),
    fontSize: 14.5,
    color: c.text,
    fit: "shrink"
  });
  const metricHeight = addFormalMetricStrip(slide, pptx, theme, blocks, 0.48, 2.52, 18.9);
  const evidenceTop = 2.52 + metricHeight + 0.12;
  addFormalEvidenceBars(slide, pptx, theme, blocks, 0.48, evidenceTop, 12.15, 4.92);
  addConsultingTextBlock(slide, pptx, theme, 13.05, evidenceTop, 6.32, 2.25, "咨询解读", brief.evidence, c.secondary || "0099D8");
  addConsultingTextBlock(slide, pptx, theme, 13.05, evidenceTop + 2.58, 6.32, 2.34, "管理含义", brief.implication, c.navy);
  slide.addShape(pptx.ShapeType.rect, { x: 0.48, y: 9.42, w: 18.9, h: 0.48, fill: { color: c.navy }, line: { color: c.navy, transparency: 100 } });
  slide.addText(brief.implication[0] || "本页结论需回到指标、对标组和行动窗口验证。", {
    x: 0.72,
    y: 9.53,
    w: 18.35,
    h: 0.25,
    fontFace: rsmPptxFont(theme),
    fontSize: 13,
    color: c.white,
    bold: true,
    fit: "shrink"
  });
  addRsmFooter(slide, pptx, theme, page, total, pptxRiskFooterNote(blocks, theme));
}

function addPptxProfitWaterfall(slide, pptx, theme, x, y, w, h) {
  const c = theme.colors;
  const rows = pptxProfitWaterfallRows().slice(0, 6);
  if (!rows.length) return;
  const max = Math.max(...rows.map((row) => Math.abs(row.value)), 1);
  rows.forEach((row, index) => {
    const rowY = y + index * (h / Math.max(rows.length, 1));
    const barW = Math.max(0.18, Math.min(1, Math.abs(row.value) / max) * (w - 2.25));
    const fill = row.tone === "positive" ? (c.secondary || "0099D8") : row.tone === "negative" ? "F59E0B" : "94A3B8";
    slide.addText(row.label, {
      x,
      y: rowY,
      w: 1.55,
      h: 0.22,
      fontFace: rsmPptxFont(theme),
      fontSize: 8.6,
      color: c.text,
      fit: "shrink"
    });
    slide.addShape(pptx.ShapeType.rect, { x: x + 1.68, y: rowY + 0.05, w: w - 2.2, h: 0.1, fill: { color: "EEF3F7" }, line: { color: "EEF3F7", transparency: 100 } });
    slide.addShape(pptx.ShapeType.rect, { x: x + 1.68, y: rowY + 0.05, w: barW, h: 0.1, fill: { color: fill }, line: { color: fill, transparency: 100 } });
    slide.addText(row.value >= 0 ? "+" : "-", {
      x: x + w - 0.35,
      y: rowY - 0.01,
      w: 0.22,
      h: 0.18,
      fontFace: rsmPptxFont(theme),
      fontSize: 8.2,
      color: fill,
      bold: true,
      fit: "shrink"
    });
  });
}

function addPptxBenchmarkLineChart(slide, pptx, theme, x, y, w, h, key = "nim") {
  const c = theme.colors;
  const chart = pptxBenchmarkLineRows(key);
  const values = [chart.target.value, ...chart.lines.map((line) => line.value)].filter((value) => Number.isFinite(value));
  if (values.length < 2) return;
  const min = Math.min(...values);
  const max = Math.max(...values);
  const span = max - min || 1;
  slide.addShape(pptx.ShapeType.line, { x, y: y + h * 0.48, w, h: 0, line: { color: "D9E4EF", width: 1 } });
  chart.lines.slice(0, 5).forEach((line, index) => {
    const pos = x + ((line.value - min) / span) * w;
    slide.addShape(pptx.ShapeType.line, { x: pos, y: y + 0.12, w: 0, h: h - 0.34, line: { color: index === 0 ? c.navy : "94A3B8", width: 0.8, dash: index > 1 ? "dash" : "solid" } });
    slide.addText(line.label, {
      x: Math.max(x, Math.min(x + w - 1.0, pos - 0.5)),
      y: y + h - 0.18,
      w: 1.0,
      h: 0.16,
      fontFace: rsmPptxFont(theme),
      fontSize: 6.9,
      color: c.slate,
      fit: "shrink",
      align: "center"
    });
  });
  const targetPos = x + ((chart.target.value - min) / span) * w;
  slide.addShape(pptx.ShapeType.ellipse, { x: targetPos - 0.08, y: y + h * 0.48 - 0.08, w: 0.16, h: 0.16, fill: { color: c.secondary || "0099D8" }, line: { color: c.secondary || "0099D8", width: 0.8 } });
  slide.addText(`目标 ${chart.target.text}`, {
    x: Math.max(x, Math.min(x + w - 1.35, targetPos - 0.68)),
    y,
    w: 1.35,
    h: 0.18,
    fontFace: rsmPptxFont(theme),
    fontSize: 7.8,
    color: c.navy,
    bold: true,
    fit: "shrink",
    align: "center"
  });
}

function addPptxNimBridge(slide, pptx, theme, x, y, w, h) {
  const c = theme.colors;
  const rows = pptxNimBridgeRows().slice(0, 4);
  rows.forEach((row, index) => {
    const cardW = (w - 0.3) / 4;
    const cardX = x + index * (cardW + 0.1);
    const fill = row.tone === "positive" ? "ECFDF5" : row.tone === "negative" ? "FFF7ED" : "F8FAFC";
    const accent = row.tone === "positive" ? "10B981" : row.tone === "negative" ? "F59E0B" : "94A3B8";
    slide.addShape(pptx.ShapeType.rect, { x: cardX, y, w: cardW, h, fill: { color: fill }, line: { color: "DCE5EE", width: 0.5 } });
    slide.addShape(pptx.ShapeType.rect, { x: cardX, y, w: cardW, h: 0.06, fill: { color: accent }, line: { color: accent, transparency: 100 } });
    slide.addText(row.label, {
      x: cardX + 0.08,
      y: y + 0.12,
      w: cardW - 0.16,
      h: 0.2,
      fontFace: rsmPptxFont(theme),
      fontSize: 7.8,
      color: c.slate,
      bold: true,
      fit: "shrink"
    });
    slide.addText(row.valueText, {
      x: cardX + 0.08,
      y: y + 0.42,
      w: cardW - 0.16,
      h: 0.28,
      fontFace: rsmPptxFont(theme),
      fontSize: 12,
      color: c.navy,
      bold: true,
      fit: "shrink",
      align: "center"
    });
    slide.addText(`对标 ${row.peerText}`, {
      x: cardX + 0.08,
      y: y + 0.78,
      w: cardW - 0.16,
      h: 0.18,
      fontFace: rsmPptxFont(theme),
      fontSize: 7,
      color: c.text,
      fit: "shrink",
      align: "center"
    });
  });
}

function addMechanismAttributionSlide(slide, pptx, theme, blocks, page, total) {
  const c = theme.colors;
  const groups = pptxMechanismModuleGroups(3).slice(0, 4);
  slide.background = { color: c.bgSoft || "F7F9FB" };
  addRsmModuleBar(slide, pptx, theme, "机制归因总览", 0.18);
  slide.addText(blocks.title || "差距来自哪里：先归因，再进入专题行动", {
    x: 0.62,
    y: 0.86,
    w: 18.6,
    h: 0.7,
    fontFace: rsmPptxFont(theme),
    fontSize: 29,
    color: c.secondary || "0099D8",
    bold: true,
    fit: "shrink"
  });
  slide.addText(blocks.subtitle || blocks.story || "本页把 DuPont、净利润归因、NIM归因和多基准线压缩为四个机制证据块。", {
    x: 0.62,
    y: 1.58,
    w: 18.4,
    h: 0.42,
    fontFace: rsmPptxFont(theme),
    fontSize: 14.5,
    color: c.slate,
    fit: "shrink"
  });
  groups.forEach((group, index) => {
    const col = index % 2;
    const row = Math.floor(index / 2);
    const x = 0.62 + col * 9.55;
    const y = 2.32 + row * 3.48;
    const accent = index === 1 ? c.secondary || "0099D8" : index === 2 ? "F59E0B" : c.navy;
    slide.addShape(pptx.ShapeType.rect, { x, y, w: 9.05, h: 3.12, fill: { color: c.white }, line: { color: "DCE5EE", width: 0.8 } });
    slide.addShape(pptx.ShapeType.rect, { x, y, w: 0.12, h: 3.12, fill: { color: accent }, line: { color: accent, transparency: 100 } });
    slide.addText(group.module, {
      x: x + 0.28,
      y: y + 0.18,
      w: 8.48,
      h: 0.32,
      fontFace: rsmPptxFont(theme),
      fontSize: 15.5,
      color: c.navy,
      bold: true,
      fit: "shrink"
    });
    slide.addText(pptxShortText(group.headline || "机制归因待补充。", 86), {
      x: x + 0.28,
      y: y + 0.58,
      w: 8.48,
      h: 0.5,
      fontFace: rsmPptxFont(theme),
      fontSize: 11.5,
      color: c.slate,
      fit: "shrink"
    });
    if (group.module === "净利润归因瀑布") {
      addPptxProfitWaterfall(slide, pptx, theme, x + 0.28, y + 1.22, 8.42, 1.55);
    } else if (group.module === "NIM归因") {
      addPptxNimBridge(slide, pptx, theme, x + 0.28, y + 1.24, 8.42, 1.18);
    } else if (group.module === "多基准线") {
      addPptxBenchmarkLineChart(slide, pptx, theme, x + 0.55, y + 1.38, 7.72, 1.2, "nim");
    } else {
      const lines = group.rows.slice(0, 3).map((item) => `${item.metric}｜目标 ${item.target}｜基准 ${item.benchmark}｜${item.risk}`);
      slide.addText(pptxBulletLines(lines, 3, 74).join("\n"), {
        x: x + 0.28,
        y: y + 1.18,
        w: 8.48,
        h: 1.55,
        fontFace: rsmPptxFont(theme),
        fontSize: 12.2,
        color: c.text,
        valign: "top",
        fit: "shrink",
        breakLine: false
      });
    }
  });
  slide.addShape(pptx.ShapeType.rect, { x: 0.62, y: 9.44, w: 18.6, h: 0.42, fill: { color: c.navy }, line: { color: c.navy, transparency: 100 } });
  slide.addText("使用边界：L2 指标可进入主报告但需脚注；L3/L4 指标仅作为附录或待补数据，不支撑强结论。", {
    x: 0.88,
    y: 9.54,
    w: 18.05,
    h: 0.24,
    fontFace: rsmPptxFont(theme),
    fontSize: 12.5,
    color: c.white,
    bold: true,
    fit: "shrink"
  });
  addRsmFooter(slide, pptx, theme, page, total, pptxRiskFooterNote(blocks, theme));
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
  addRsmFooter(slide, pptx, theme, page, total, pptxRiskFooterNote(blocks, theme));
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
  addRsmFooter(slide, pptx, theme, page, total, pptxRiskFooterNote(blocks, theme));
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
  addRsmFooter(slide, pptx, theme, page, total, pptxRiskFooterNote(blocks, theme));
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
  addRsmFooter(slide, pptx, theme, page, total, pptxRiskFooterNote(blocks, theme));
}

async function downloadPptxReport() {
  if (typeof preflightExport === "function" && !preflightExport("PPTX")) return;
  if (typeof preflightExport !== "function" && !state.confirmed) {
    setProjectStatus("请先确认分析口径，再导出 PPTX。");
    return;
  }
  try {
    await ensurePptxLoaded();
    if (typeof renderFormalReport === "function") renderFormalReport();
    const theme = rsmPptxTheme();
    theme.coverBgData = await imageUrlToDataUrl(theme.coverBg || "assets/sunong_ref/cover-bg.png");
    const pptx = new PptxGenJS();
    pptx.defineLayout({ name: "RSM_WIDE", width: theme.slideW, height: theme.slideH });
    pptx.layout = "RSM_WIDE";
    pptx.author = "RSM 银行董办对标分析工具";
    pptx.company = "RSM";
    pptx.subject = `${state.target}_${state.year}_价值质量诊断`;
    pptx.title = `${state.target}价值质量诊断与经营对标分析`;

    const slides = formalReportSlidesForPptx();
    for (let index = 0; index < slides.length; index += 1) {
      const slideEl = slides[index];
      const slide = pptx.addSlide();
      const isFormal = slideEl.closest("#formalReport");
      const blocks = isFormal ? formalSlideTextBlocks(slideEl, index, slides) : slideTextBlocks(slideEl);
      const deckType = isFormal
        ? (slideEl.dataset.deckType || (index === 0 ? "cover" : "content"))
        : (slideEl.dataset.deckType || "content");
      const page = Number(slideEl.dataset.slideIndex || index + 1);
      const total = Number(slideEl.dataset.slideTotal || slides.length);
      const svgEl = slideEl.querySelector("svg");
      const svg = svgEl ? await slideChartImageData(svgEl) : null;
      const rasterUrl = slideRasterImageUrl(slideEl);
      const raster = rasterUrl ? await imageUrlToDataUrl(rasterUrl) : null;
      const visual = raster || svg;

      if (deckType === "cover") {
        addCoverSlide(slide, pptx, theme, blocks, page, total);
      } else if (deckType === "toc") {
        addTocSlide(slide, pptx, theme, blocks, page, total);
      } else if (deckType === "chapter-agenda") {
        addChapterAgendaSlide(slide, pptx, theme, blocks, page, total);
      } else if (deckType === "mechanism") {
        addMechanismAttributionSlide(slide, pptx, theme, blocks, page, total);
      } else if (deckType === "chart") {
        addChartPptxSlide(slide, pptx, theme, blocks, page, total, visual);
      } else if (isFormal && visual) {
        addContentSlide(slide, pptx, theme, blocks, page, total, visual);
      } else if (isFormal) {
        addFormalHtmlAlignedSlide(slide, pptx, theme, blocks, page, total);
      } else {
        addContentSlide(slide, pptx, theme, blocks, page, total, visual);
      }
    }

    const meta = typeof formalReportExportMeta === "function"
      ? formalReportExportMeta("PPTX")
      : { format: "正式报告 PPTX", filename: `${safeFilename(state.target)}_${state.year}_正式报告.pptx`, note: "页序和内容读取正式报告 HTML" };
    const filename = meta.filename;
    await pptx.writeFile({ fileName: filename });
    if (typeof recordExportHistory === "function") recordExportHistory("正式报告 PPTX");
    setProjectStatus(`${meta.format} 已导出：${filename}。${meta.note}。`);
  } catch (error) {
    console.error("PPTX export failed", error);
    const message = error?.message ? `（${error.message}）` : "";
    setProjectStatus(`正式报告 PPTX 导出失败${message}。已内置本地 PPTX 引擎；如仍失败，请先导出正式报告 HTML 或查看控制台错误。`);
  }
}

function initPptxExport() {
  document.getElementById("exportReportPptx")?.addEventListener("click", () => {
    renderAll();
    if (typeof recordAnalysisSession === "function") recordAnalysisSession("导出正式报告 PPTX", { version: state.reportVersion });
    downloadPptxReport();
  });
}
