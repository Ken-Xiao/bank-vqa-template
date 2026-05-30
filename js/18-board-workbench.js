/* Bank VQA module: 18-board-workbench.js — 董办工作台、单页审阅与交付复核 */

var boardDeckPageIndex = 0;

function boardSlides() {
  return [...document.querySelectorAll("#printDeck .print-slide")];
}

function boardSlideTitle(slide, index) {
  return slide?.querySelector(".rsm-slide-head h2")?.textContent?.trim()
    || slide?.querySelector(".rsm-cover-title-panel h1")?.textContent?.trim()
    || slide?.querySelector(".rsm-toc-sidebar h3")?.textContent?.trim()
    || `第 ${index + 1} 页`;
}

function updateBoardWorkflow() {
  const status = document.getElementById("boardWorkflowStatus");
  const grid = document.getElementById("boardFlowGrid");
  if (!status || !grid) return;
  const slides = boardSlides().length;
  const checks = typeof trialReadinessChecks === "function" ? trialReadinessChecks() : [];
  const blockers = checks.filter((item) => item.status === "bad").length;
  const warnings = checks.filter((item) => item.status === "warn").length;
  const steps = [
    ["01", "选择口径", "目标银行、对标组、类型均值", !!state?.target && state.peers?.length >= 1],
    ["02", "形成诊断", "价值质量、专题和图表证据", !!state?.confirmed],
    ["03", "审阅材料", "核心结论、章节逻辑、图表说明", slides > 0],
    ["04", "形成交付", "汇报稿、数据附录、指标底稿", slides > 0 && blockers === 0]
  ];
  const activeIndex = Math.max(0, steps.findIndex((step) => !step[3]));
  grid.innerHTML = steps.map(([no, title, desc, done], index) => `
    <div class="board-flow-step${done ? " is-done" : ""}${index === activeIndex ? " is-active" : ""}">
      <b>${no}</b><span>${title}</span><em>${desc}</em>
    </div>
  `).join("");
  if (!state?.confirmed) status.textContent = "待确认分析样本";
  else if (!slides) status.textContent = "诊断已形成，待展示报告页";
  else if (blockers) status.textContent = `发现 ${blockers} 项阻断，暂不建议交付`;
  else if (warnings) status.textContent = `可试点交付，仍有 ${warnings} 项提醒`;
  else status.textContent = "可进入董事会材料交付";
}

function syncDeckPageSelect() {
  const select = document.getElementById("deckPageSelect");
  if (!select) return;
  const slides = boardSlides();
  if (!slides.length) {
    select.innerHTML = "";
    return;
  }
  if (boardDeckPageIndex >= slides.length) boardDeckPageIndex = slides.length - 1;
  select.innerHTML = slides.map((slide, index) => `<option value="${index}">${String(index + 1).padStart(2, "0")}｜${boardSlideTitle(slide, index)}</option>`).join("");
  select.value = String(boardDeckPageIndex);
}

function showDeckPage(index = boardDeckPageIndex) {
  const slides = boardSlides();
  const label = document.getElementById("deckReviewPage");
  if (!slides.length) {
    if (label) label.textContent = "待形成报告";
    return;
  }
  boardDeckPageIndex = Math.min(Math.max(0, index), slides.length - 1);
  slides.forEach((slide, idx) => {
    slide.classList.toggle("is-review-active", idx === boardDeckPageIndex);
  });
  if (label) label.textContent = `${String(boardDeckPageIndex + 1).padStart(2, "0")} / ${String(slides.length).padStart(2, "0")}｜${boardSlideTitle(slides[boardDeckPageIndex], boardDeckPageIndex)}`;
  syncDeckPageSelect();
}

function buildBoardReviewItems() {
  const slides = boardSlides();
  const checks = typeof trialReadinessChecks === "function" ? trialReadinessChecks() : [];
  const titleTexts = slides.map((slide, index) => boardSlideTitle(slide, index)).filter(Boolean);
  const duplicateTitles = titleTexts.length - new Set(titleTexts).size;
  const longTitles = titleTexts.filter((title) => title.length > 42).length;
  const chartSlides = slides.filter((slide) => slide.matches(".chart-slide"));
  const chartWithBlocks = chartSlides.filter((slide) => slide.querySelectorAll(".print-chart-block").length >= 2).length;
  const textHeavy = slides.filter((slide) => (slide.innerText || "").length > 900).length;
  const criticalRate = typeof criticalMetricCompleteness === "function" ? criticalMetricCompleteness() : null;
  const blockers = checks.filter((item) => item.status === "bad");
  const warnings = checks.filter((item) => item.status === "warn");
  return [
    {
      title: "分析口径",
      status: state?.confirmed && state.peers?.length >= 3 ? "ok" : "bad",
      text: state?.confirmed ? `目标银行 ${displayBankName(state.target)}，对标银行 ${state.peers.length} 家，类型均值 ${state.types.length} 类。` : "尚未确认分析样本。"
    },
    {
      title: "数据可用性",
      status: criticalRate == null ? "warn" : criticalRate >= 0.8 ? "ok" : criticalRate >= 0.6 ? "warn" : "bad",
      text: criticalRate == null ? "暂无完整性结果。" : `核心指标完整性 ${(criticalRate * 100).toFixed(1)}%，可支撑主报告结论边界。`
    },
    {
      title: "故事线",
      status: slides >= 8 && duplicateTitles === 0 && longTitles <= 3 ? "ok" : slides ? "warn" : "bad",
      text: slides ? `报告共 ${slides.length} 页，重复标题 ${duplicateTitles} 个，过长标题 ${longTitles} 个。` : "尚未形成可复核报告页。"
    },
    {
      title: "图表解释",
      status: chartSlides.length && chartWithBlocks / chartSlides.length >= 0.8 ? "ok" : chartSlides.length ? "warn" : "bad",
      text: chartSlides.length ? `${chartWithBlocks}/${chartSlides.length} 张图已包含问题、证据或管理含义模块。` : "尚未形成图表页。"
    },
    {
      title: "版式可读性",
      status: textHeavy <= 4 && slides.length <= 45 ? "ok" : textHeavy <= 8 ? "warn" : "bad",
      text: `文本偏密页面 ${textHeavy} 页；正式董办材料建议单页只保留 1 个主结论和 2-3 条证据。`
    },
    {
      title: "交付准备",
      status: blockers.length ? "bad" : warnings.length ? "warn" : slides.length ? "ok" : "bad",
      text: blockers.length ? `仍有阻断项：${blockers.map((item) => item.title).join("、")}。` : warnings.length ? `可试点交付，但需复核：${warnings.map((item) => item.title).join("、")}。` : "汇报稿和数据附录可进入交付。"
    }
  ];
}

function renderBoardReview() {
  const grid = document.getElementById("boardReviewGrid");
  const verdict = document.getElementById("boardReviewVerdict");
  const note = document.getElementById("boardReviewNote");
  if (!grid || !verdict) return;
  const items = buildBoardReviewItems();
  const bad = items.filter((item) => item.status === "bad").length;
  const warn = items.filter((item) => item.status === "warn").length;
  verdict.className = `board-review-verdict ${bad ? "bad" : warn ? "warn" : "ok"}`;
  verdict.textContent = bad ? `${bad} 项阻断，暂不建议交付` : warn ? `${warn} 项提醒，可试点交付` : "复核通过，可交付";
  grid.innerHTML = items.map((item) => `
    <div class="board-review-item ${item.status}">
      <span></span>
      <div><b>${item.title}</b><p>${item.text}</p></div>
    </div>
  `).join("");
  if (note) note.textContent = `复核时间：${new Date().toLocaleString("zh-CN", { hour12: false })}。复核依据为当前样本边界、图表取舍、报告页和数据完整性。`;
  updateBoardWorkflow();
}

function refreshBoardWorkbench() {
  updateBoardWorkflow();
  syncDeckPageSelect();
  showDeckPage(boardDeckPageIndex);
  renderBoardReview();
  document.querySelectorAll("#sideNavContent a[href^='#']").forEach((link) => {
    if (link.dataset.boardBound) return;
    link.dataset.boardBound = "1";
    link.addEventListener("click", (event) => {
      const id = link.getAttribute("href")?.slice(1);
      const slides = boardSlides();
      const index = slides.findIndex((slide) => slide.id === id);
      if (index >= 0) {
        event.preventDefault();
        showDeckPage(index);
        document.getElementById("formalReportShell")?.scrollIntoView({ behavior: "smooth", block: "start" });
      }
    });
  });
}

function initBoardWorkbench() {
  document.getElementById("deckPrevPage")?.addEventListener("click", () => showDeckPage(boardDeckPageIndex - 1));
  document.getElementById("deckNextPage")?.addEventListener("click", () => showDeckPage(boardDeckPageIndex + 1));
  document.getElementById("deckPageSelect")?.addEventListener("change", (event) => showDeckPage(Number(event.target.value)));
  document.getElementById("runBoardReview")?.addEventListener("click", renderBoardReview);
  const originalRenderAll = typeof renderAll === "function" ? renderAll : null;
  if (originalRenderAll && !originalRenderAll.__boardWorkbenchWrapped) {
    renderAll = function renderAllWithBoardWorkbench() {
      const result = originalRenderAll.apply(this, arguments);
      refreshBoardWorkbench();
      return result;
    };
    renderAll.__boardWorkbenchWrapped = true;
  }
  const originalBuildPrintDeck = typeof buildPrintDeck === "function" ? buildPrintDeck : null;
  if (originalBuildPrintDeck && !originalBuildPrintDeck.__boardWorkbenchWrapped) {
    buildPrintDeck = function buildPrintDeckWithBoardWorkbench() {
      const result = originalBuildPrintDeck.apply(this, arguments);
      refreshBoardWorkbench();
      return result;
    };
    buildPrintDeck.__boardWorkbenchWrapped = true;
  }
  refreshBoardWorkbench();
}
