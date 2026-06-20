/* Bank VQA module: 62-report-page-library-renderer.js
 * 报告页库渲染器：章节树、单页预览、页面篮子、选择状态。
 */
(function () {
  if (typeof window === "undefined" || typeof document === "undefined") return;

  var activeChapterKey = "executive";
  var activePageId = "";
  var isRendering = false;

  function esc(s) {
    if (s === null || s === undefined) return "";
    return String(s).replace(/[<>&"]/g, function (c) {
      return { "<": "&lt;", ">": "&gt;", "&": "&amp;", "\"": "&quot;" }[c];
    });
  }

  function library() {
    return typeof window.ensureReportPageLibrary === "function"
      ? window.ensureReportPageLibrary()
      : { status: "empty", pages: [], selectedPageIds: [], chapters: [] };
  }

  function pagesForChapter(lib, chapterKey) {
    return (lib.pages || []).filter(function (page) { return page.chapterKey === chapterKey; });
  }

  function selectedPages(lib) {
    var ids = lib.selectedPageIds || [];
    return (lib.pages || []).filter(function (page) { return ids.indexOf(page.pageId) >= 0; });
  }

  function currentPage(lib) {
    var pages = activeChapterKey ? pagesForChapter(lib, activeChapterKey) : (lib.pages || []);
    var found = (lib.pages || []).filter(function (page) { return page.pageId === activePageId; })[0];
    return found || pages[0] || (lib.pages || [])[0] || null;
  }

  function renderReportPageLibraryTree(lib) {
    var host = document.getElementById("reportPageLibraryTree");
    if (!host) return;
    if (!lib || lib.status !== "ready") {
      host.innerHTML = '<div class="report-page-library-empty"><b>暂无章节树</b><p>请先完成数据对标并生成证据包。</p></div>';
      return;
    }
    var chapters = lib.chapters || [];
    host.innerHTML = '<h3>章节树</h3>' + chapters.map(function (chapter) {
      var pages = pagesForChapter(lib, chapter.key);
      if (!pages.length) return "";
      var selected = pages.filter(function (page) { return (lib.selectedPageIds || []).indexOf(page.pageId) >= 0; }).length;
      var active = chapter.key === activeChapterKey ? " is-active" : "";
      return '<button type="button" class="report-page-chapter-btn' + active + '" data-report-page-chapter="' + esc(chapter.key) + '">'
        + '<b>' + esc(chapter.label) + '</b><span>' + pages.length + ' 张候选 · ' + selected + ' 张已选</span></button>';
    }).join("");
  }

  function evidenceRowsHtml(page) {
    var rows = (page.evidenceRows || []).slice(0, 4);
    if (!rows.length) return '<div class="report-page-evidence-row"><b>证据覆盖不足</b><span>该页需要补充指标差距后再进入最终报告。</span></div>';
    return rows.map(function (row) {
      return '<div class="report-page-evidence-row">'
        + '<b>' + esc(row.role || "证据") + '｜' + esc(row.metric) + '</b>'
        + '<span>目标 ' + esc(row.targetValue || "—") + ' / 对标 ' + esc(row.peerValue || "—") + ' / 差距 ' + esc(row.gap || "—") + '</span>'
        + '</div>';
    }).join("");
  }

  function storylineEvidenceMetaHtml(page) {
    if (page.source !== "storylineFactPack") return "";
    var sourceFactIds = (page.sourceFactIds || []).join("、") || "待补证据";
    var layout = page.recommendedSlideLayout || "待补版式";
    var scenario = page.useScenario || "待补使用场景";
    return '<div class="report-page-storyline-meta">'
      + '<div><b>证据句</b><span>' + esc(page.evidenceSentence || "待补证据句") + '</span></div>'
      + '<div><b>来源事实</b><span>' + esc(sourceFactIds) + '</span></div>'
      + '<div><b>使用场景</b><span>' + esc(scenario) + '</span></div>'
      + '<div><b>推荐版式</b><span>' + esc(layout) + '</span></div>'
      + '</div>';
  }

  function chartGuideButtonHtml(page) {
    if (page.source !== "storylineFactPack" || !page.visualAsset) return "";
    return '<button type="button" class="report-page-chart-guide" data-open-report-chart-guide="' + esc(page.pageId) + '">查看读图指南</button>';
  }

  function renderReportPageLibraryPreview(lib) {
    var host = document.getElementById("reportPageLibraryPreview");
    var status = document.getElementById("reportPageLibraryStatus");
    if (!host) return;
    if (!lib || lib.status === "empty") {
      if (status) status.textContent = "等待证据包";
      host.innerHTML = '<div class="report-page-library-empty"><b>请先生成数据对标证据包</b><p>进入数据对标页选择目标银行、对标银行和分析年份，然后生成证据包。</p><button type="button" class="btn" data-page-link="benchmark">返回数据对标</button></div>';
      return;
    }
    if (lib.status === "stale") {
      if (status) status.textContent = "证据包已过期";
      host.innerHTML = '<div class="report-page-library-empty"><b>证据包已过期</b><p>目标行、对标组或年份发生变化，请回到数据对标页重新生成。</p><button type="button" class="btn" data-page-link="benchmark">重新生成证据包</button></div>';
      return;
    }
    var page = currentPage(lib);
    if (!page) {
      if (status) status.textContent = "无候选页";
      host.innerHTML = '<div class="report-page-library-empty"><b>暂无候选页</b><p>当前证据包没有可生成分析页的故事线。</p></div>';
      return;
    }
    activePageId = page.pageId;
    activeChapterKey = page.chapterKey;
    var selected = (lib.selectedPageIds || []).indexOf(page.pageId) >= 0;
    if (status) status.textContent = (lib.pages || []).length + " 张候选 · " + (lib.selectedPageIds || []).length + " 张已选";
    host.innerHTML = '<article class="report-page-canvas" data-report-library-page="' + esc(page.pageId) + '">'
      + '<div class="report-page-canvas-inner">'
      + '<div class="report-page-mark"><span></span><span></span><span></span></div>'
      + '<h2 class="report-page-title">' + esc(page.title) + '</h2>'
      + '<p class="report-page-subtitle">' + esc(page.conclusion || "") + '</p>'
      + '<p class="report-page-source-meta">来源：' + esc(page.source === "management-diagnosis-pack" ? "管理层诊断包" : "数据对标证据包") + ' · 状态：' + esc(page.reportReadiness || (page.quality && page.quality.status) || "待复核") + '</p>'
      + storylineEvidenceMetaHtml(page)
      + '<div class="report-page-body-grid">'
      + '<figure class="report-page-visual">' + (page.visualAsset && page.visualAsset.src ? '<img loading="lazy" src="' + esc(page.visualAsset.src) + '" alt="' + esc(page.visualAsset.label || page.title) + '">' : '<div class="report-page-library-empty">暂无证据图</div>') + '</figure>'
      + '<div class="report-page-evidence-list">' + evidenceRowsHtml(page) + '</div>'
      + '</div>'
      + chartGuideButtonHtml(page)
      + '<div class="report-page-bbar"><b>研究判断</b><span>' + esc(page.conclusion || "该页基于数据对标证据链形成管理判断。") + '</span></div>'
      + '</div>'
      + '</article>'
      + '<button type="button" class="report-page-select-action' + (selected ? " is-selected" : "") + '" data-toggle-report-page="' + esc(page.pageId) + '">' + (selected ? "已加入最终报告，点击移除" : "加入最终报告") + '</button>';
  }

  function renderReportPageLibraryBasket(lib) {
    var host = document.getElementById("reportPageLibraryBasket");
    if (!host) return;
    if (!lib || lib.status !== "ready") {
      host.innerHTML = '<div class="report-page-library-empty"><b>页面篮子</b><p>生成候选页后，可把需要的页面加入最终报告。</p></div>';
      return;
    }
    var pages = selectedPages(lib);
    host.innerHTML = '<h3>页面篮子</h3><p class="step2-pack-meta">已选 ' + pages.length + ' 页</p>'
      + (pages.length ? pages.map(function (page, index) {
        var active = page.pageId === activePageId ? " is-active" : "";
        return '<button type="button" class="report-page-basket-item' + active + '" data-open-report-page="' + esc(page.pageId) + '">'
          + '<b>' + String(index + 1).padStart(2, "0") + '｜' + esc(page.chapterLabel) + '</b><span>' + esc(page.title) + '</span></button>';
      }).join("") : '<div class="report-page-library-empty">尚未选择页面。</div>');
  }

  function reportPageToPrintSlide(page, index) {
    return '<section class="print-slide rsm2-page report-library-print-slide" data-deck-type="report-library" data-report-page-id="' + esc(page.pageId) + '">'
      + '<div class="rsm2-module"><span>' + esc(page.chapterLabel) + '</span><b>' + String(index + 1).padStart(2, "0") + '</b></div>'
      + '<div class="rsm-slide-head"><h2>' + esc(page.title) + '</h2><p>' + esc(page.conclusion || "") + '</p></div>'
      + '<div class="rsm-slide-body"><div class="report-page-body-grid">'
      + '<figure class="report-page-visual">' + (page.visualAsset && page.visualAsset.src ? '<img src="' + esc(page.visualAsset.src) + '" alt="' + esc(page.visualAsset.label || page.title) + '">' : '') + '</figure>'
      + '<div class="report-page-evidence-list">' + evidenceRowsHtml(page) + '</div>'
      + '</div></div>'
      + '<div class="rsm-slide-story"><b>研究判断</b>' + esc(page.conclusion || "本页基于数据对标证据链形成管理判断。") + '</div>'
      + '</section>';
  }

  function syncReportPageLibraryPrintDeck(lib) {
    var deck = document.getElementById("printDeck");
    if (!deck) return;
    lib = lib || library();
    if (!lib || lib.status !== "ready") {
      deck.innerHTML = "";
      return;
    }
    var ids = lib.selectedPageIds || [];
    var pages = (lib.pages || []).filter(function (page) { return ids.indexOf(page.pageId) >= 0; });
    deck.innerHTML = pages.map(reportPageToPrintSlide).join("");
    if (typeof applyRsmDeckFooters === "function") applyRsmDeckFooters();
  }

  function renderReportPageLibrary() {
    var shell = document.getElementById("analysisDeckShell");
    if (!shell || isRendering) return;
    shell.hidden = false;
    isRendering = true;
    try {
      var lib = library();
      renderReportPageLibraryTree(lib);
      renderReportPageLibraryPreview(lib);
      renderReportPageLibraryBasket(lib);
      syncReportPageLibraryPrintDeck(lib);
      if (typeof syncDeckPageSelect === "function") syncDeckPageSelect();
      if (typeof showDeckPage === "function") showDeckPage(0);
    } finally {
      isRendering = false;
    }
  }

  document.addEventListener("click", function (event) {
    var chapter = event.target.closest && event.target.closest("[data-report-page-chapter]");
    if (chapter) {
      activeChapterKey = chapter.dataset.reportPageChapter;
      activePageId = "";
      renderReportPageLibrary();
      return;
    }
    var toggle = event.target.closest && event.target.closest("[data-toggle-report-page]");
    if (toggle) {
      var lib = library();
      var selected = (lib.selectedPageIds || []).indexOf(toggle.dataset.toggleReportPage) < 0;
      if (typeof window.toggleReportPageSelection === "function") {
        window.toggleReportPageSelection(toggle.dataset.toggleReportPage, selected);
      }
      renderReportPageLibrary();
      return;
    }
    var open = event.target.closest && event.target.closest("[data-open-report-page]");
    if (open) {
      activePageId = open.dataset.openReportPage;
      var lib2 = library();
      var page = (lib2.pages || []).filter(function (p) { return p.pageId === activePageId; })[0];
      if (page) activeChapterKey = page.chapterKey;
      renderReportPageLibrary();
      return;
    }
    var guide = event.target.closest && event.target.closest("[data-open-report-chart-guide]");
    if (guide) {
      var lib3 = library();
      var guidePage = (lib3.pages || []).filter(function (p) { return p.pageId === guide.dataset.openReportChartGuide; })[0];
      if (guidePage && guidePage.visualAsset && typeof window.openStorylineChartViewer === "function") {
        window.openStorylineChartViewer({
          chartId: guidePage.visualAsset.chartId || guidePage.readingGuideId || "",
          title: guidePage.visualAsset.title || guidePage.visualAsset.label || guidePage.title,
          src: guidePage.visualAsset.src,
          enlargedSrc: guidePage.visualAsset.src,
          readingGuide: guidePage.visualAsset.readingGuide || {},
          sourceFactIds: guidePage.visualAsset.sourceFactIds || guidePage.sourceFactIds || []
        });
      }
    }
  });

  window.renderReportPageLibrary = renderReportPageLibrary;
  window.renderReportPageLibraryTree = renderReportPageLibraryTree;
  window.renderReportPageLibraryPreview = renderReportPageLibraryPreview;
  window.renderReportPageLibraryBasket = renderReportPageLibraryBasket;
  window.syncReportPageLibraryPrintDeck = syncReportPageLibraryPrintDeck;
})();
