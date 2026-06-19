/* Bank VQA module: 61-report-page-library-model.js
 * 报告页库模型：把数据对标证据包转换为可选 16:9 分析页。
 */
(function () {
  if (typeof window === "undefined") return;

  var STORAGE_KEY = "benchmarkiq.reportPageLibrary";

  var CHAPTERS = [
    { key: "executive", label: "核心结论", domains: ["profitability", "nim", "deposit", "quality", "capital", "liquidity"] },
    { key: "profit_nim", label: "盈利与息差", domains: ["profitability", "nim", "deposit"] },
    { key: "asset_quality", label: "资产质量", domains: ["quality", "loan_corp", "loan_retail", "ifrs9"] },
    { key: "capital_action", label: "资本与行动", domains: ["capital", "liquidity"] },
    { key: "appendix", label: "数据附录", domains: [] }
  ];

  function nowVersion() {
    var d = new Date();
    function pad(n) { return n < 10 ? "0" + n : String(n); }
    return String(d.getFullYear()) + pad(d.getMonth() + 1) + pad(d.getDate()) + "-" + pad(d.getHours()) + pad(d.getMinutes());
  }

  function readEvidencePackForLibrary() {
    if (typeof window.getBenchmarkEvidencePack === "function") {
      var live = window.getBenchmarkEvidencePack();
      if (live) return live;
    }
    if (typeof window.readEvidencePack === "function") {
      var modelPack = window.readEvidencePack();
      if (modelPack) return modelPack;
    }
    try {
      var raw = localStorage.getItem("benchmarkiq.evidencePack");
      return raw ? JSON.parse(raw) : null;
    } catch (e) {
      return null;
    }
  }

  function chapterForDomain(domainKey, pageType) {
    if (pageType === "executive") return CHAPTERS[0];
    for (var i = 1; i < CHAPTERS.length; i++) {
      if (CHAPTERS[i].domains.indexOf(domainKey) >= 0) return CHAPTERS[i];
    }
    return CHAPTERS[4];
  }

  function evidenceRowsFromNodes(nodes) {
    return (nodes || []).map(function (node, index) {
      return {
        evidenceId: "ev_" + (index + 1),
        role: node.role || (index === 0 ? "结果" : "原因 " + index),
        metric: node.metric || "指标",
        targetValue: node.targetValue || "",
        peerValue: node.peerValue || "",
        gap: node.gap || "",
        pressure: !!node.pressure
      };
    });
  }

  function qualityForPage(page) {
    return {
      hasTitle: !!page.title,
      evidenceCount: (page.evidenceRows || []).filter(function (row) { return row.metric && row.gap; }).length,
      causalDepth: (page.causalNodes || []).length,
      hasVisual: !!(page.visualAsset && page.visualAsset.src),
      status: page.title && (page.evidenceRows || []).length >= 2 && (page.causalNodes || []).length >= 2 ? "ready" : "low_coverage"
    };
  }

  function makePage(card, pageType, suffix, title, conclusion) {
    var chapter = chapterForDomain(card.domainKey, pageType);
    var rows = evidenceRowsFromNodes(card.causalNodes);
    var page = {
      pageId: [card.domainKey || "domain", card.storyId || "story", suffix].join("-"),
      chapterKey: chapter.key,
      chapterLabel: chapter.label,
      title: title || card.title || "数据对标分析页",
      pageType: pageType,
      storyId: card.storyId || "",
      domainKey: card.domainKey || "",
      domainLabel: card.domainLabel || "",
      visualAsset: card.visualAsset || null,
      causalNodes: card.causalNodes || [],
      evidenceRows: rows,
      conclusion: conclusion || card.lead || "本页基于数据对标证据链形成管理判断。",
      selected: false,
      source: "benchmark-story-card"
    };
    page.quality = qualityForPage(page);
    page.selected = page.quality.status === "ready";
    return page;
  }

  function executivePageFromCards(cards, pack) {
    var topCards = cards.slice(0, 3);
    var nodes = [];
    topCards.forEach(function (card) { nodes = nodes.concat((card.causalNodes || []).slice(0, 2)); });
    var synthetic = {
      domainKey: "executive",
      storyId: "summary",
      domainLabel: "核心结论",
      title: (pack.targetBank && pack.targetBank.name || "目标银行") + "本轮经营诊断应优先围绕" + topCards.map(function (card) {
        return (card.causalNodes && card.causalNodes[0] && card.causalNodes[0].metric) || card.domainLabel || card.domainKey;
      }).filter(Boolean).slice(0, 3).join("、") + "展开",
      lead: "本页把数据对标中最强的三条故事线压缩为董事会优先讨论事项。",
      visualAsset: topCards[0] && topCards[0].visualAsset,
      causalNodes: nodes
    };
    return makePage(synthetic, "executive", "main", synthetic.title, synthetic.lead);
  }

  function pagesFromStoryCard(card) {
    var pages = [];
    pages.push(makePage(card, "attribution", "main", card.title, card.lead));
    if (card.visualAsset && card.visualAsset.src) {
      pages.push(makePage(card, "visual", "visual", card.visualAsset.caption || card.title, "用咨询风格证据图说明该故事线的核心差距。"));
    }
    return pages;
  }

  function evidenceRowsFromDiagnosisRefs(refs, diagnosis) {
    return (refs || []).map(function (id, index) {
      var evidence = (diagnosis.evidenceMap || []).filter(function (row) { return row.evidenceId === id; })[0] || {};
      return {
        evidenceId: id,
        role: "证据 " + (index + 1),
        metric: evidence.metricKey || id,
        targetValue: evidence.targetValue || "",
        peerValue: evidence.peerValue || "",
        gap: evidence.gap || "",
        pressure: evidence.pressure !== false,
        dataQuality: evidence.dataQuality || "",
        reportReadiness: evidence.reportReadiness || ""
      };
    });
  }

  function diagnosisPageQuality(page, source) {
    return {
      hasTitle: !!page.title,
      evidenceCount: (source.evidenceRefs || []).length,
      causalDepth: (source.causeChain || source.nodes || []).length,
      hasVisual: !!(source.visualAsset && source.visualAsset.src),
      status: page.status === "ready" ? "ready" : (page.status === "review" ? "review" : "low_coverage")
    };
  }

  function pageFromDiagnosisCandidate(candidate, diagnosis) {
    var judgment = (diagnosis.judgments || []).filter(function (item) { return item.id === candidate.sourceId; })[0];
    var chain = (diagnosis.topicChains || []).filter(function (item) { return item.id === candidate.sourceId; })[0];
    var source = judgment || chain || {};
    var chapter = chapterForDomain(source.domainKey || "", candidate.pageRole === "executive-judgment" ? "executive" : "attribution");
    var nodes = source.causeChain || source.nodes || [];
    var page = {
      pageId: candidate.id,
      sourceDiagnosisId: candidate.sourceId,
      chapterKey: chapter.key,
      chapterLabel: chapter.label,
      title: candidate.title,
      pageType: candidate.pageRole,
      storyId: candidate.sourceId,
      domainKey: source.domainKey || "",
      domainLabel: chapter.label,
      visualAsset: source.visualAsset || null,
      causalNodes: nodes.map(function (node, index) {
        return { role: index === 0 ? "判断" : "原因 " + index, metric: node, gap: "", pressure: true };
      }),
      evidenceRows: evidenceRowsFromDiagnosisRefs(source.evidenceRefs || [], diagnosis),
      conclusion: source.conclusion || source.action || source.recommendedAction || "本页基于管理层诊断包生成。",
      selected: candidate.selected !== false && candidate.status === "ready",
      source: "management-diagnosis-pack",
      reportReadiness: candidate.status || source.reportReadiness || "review"
    };
    page.quality = diagnosisPageQuality(candidate, source);
    return page;
  }

  function buildReportPageLibraryFromDiagnosisPack(diagnosis) {
    if (!diagnosis || !Array.isArray(diagnosis.candidatePages)) {
      return { version: nowVersion(), status: "empty", sourcePackVersion: "", targetBank: {}, year: "", pages: [], selectedPageIds: [], updatedAt: new Date().toISOString() };
    }
    var pages = diagnosis.candidatePages.slice(0, 12).map(function (candidate) {
      return pageFromDiagnosisCandidate(candidate, diagnosis);
    });
    return {
      version: nowVersion(),
      status: pages.length ? "ready" : "empty",
      sourcePackVersion: diagnosis.version || "",
      targetBank: diagnosis.context && diagnosis.context.targetBank || {},
      year: diagnosis.context && diagnosis.context.year || "",
      chapters: CHAPTERS,
      pages: pages,
      selectedPageIds: pages.filter(function (page) { return page.selected; }).map(function (page) { return page.pageId; }),
      updatedAt: new Date().toISOString()
    };
  }

  function buildReportPageLibrary(pack) {
    if (arguments.length === 0) pack = readEvidencePackForLibrary();
    if (!pack) {
      return { version: nowVersion(), status: "empty", sourcePackVersion: "", targetBank: {}, year: "", pages: [], selectedPageIds: [], updatedAt: new Date().toISOString() };
    }
    if (pack.status && pack.status !== "confirmed") {
      return { version: nowVersion(), status: "stale", sourcePackVersion: pack.version || "", targetBank: pack.targetBank || {}, year: pack.year || "", pages: [], selectedPageIds: [], updatedAt: new Date().toISOString() };
    }
    if (typeof window.buildManagementDiagnosisPack === "function") {
      var diagnosis = window.buildManagementDiagnosisPack(pack);
      if (diagnosis && diagnosis.candidatePages && diagnosis.candidatePages.length) {
        return buildReportPageLibraryFromDiagnosisPack(diagnosis);
      }
    }
    var cards = Array.isArray(pack.storyCards) ? pack.storyCards.filter(Boolean) : [];
    if (!cards.length) {
      return { version: nowVersion(), status: "empty", sourcePackVersion: pack.version || "", targetBank: pack.targetBank || {}, year: pack.year || "", pages: [], selectedPageIds: [], updatedAt: new Date().toISOString() };
    }
    var pages = [executivePageFromCards(cards, pack)];
    cards.forEach(function (card) { pages = pages.concat(pagesFromStoryCard(card)); });
    var selectedPageIds = pages.filter(function (page) { return page.selected; }).map(function (page) { return page.pageId; });
    return {
      version: nowVersion(),
      status: "ready",
      sourcePackVersion: pack.version || "",
      targetBank: pack.targetBank || {},
      year: pack.year || "",
      chapters: CHAPTERS,
      pages: pages,
      selectedPageIds: selectedPageIds,
      updatedAt: new Date().toISOString()
    };
  }

  function saveReportPageLibrary(library) {
    window.__reportPageLibrary = library || null;
    try {
      if (library) localStorage.setItem(STORAGE_KEY, JSON.stringify(library));
      else localStorage.removeItem(STORAGE_KEY);
    } catch (e) { /* silent */ }
    return library;
  }

  function readReportPageLibrary() {
    if (window.__reportPageLibrary) return window.__reportPageLibrary;
    try {
      var raw = localStorage.getItem(STORAGE_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch (e) {
      return null;
    }
  }

  function ensureReportPageLibrary() {
    var current = readReportPageLibrary();
    var pack = readEvidencePackForLibrary();
    if (!current || (pack && current.sourcePackVersion !== pack.version)) {
      current = buildReportPageLibrary(pack);
      saveReportPageLibrary(current);
    }
    return current;
  }

  function toggleReportPageSelection(pageId, selected) {
    var library = ensureReportPageLibrary();
    var ids = library.selectedPageIds || [];
    if (selected && ids.indexOf(pageId) < 0) ids.push(pageId);
    if (!selected) ids = ids.filter(function (id) { return id !== pageId; });
    library.selectedPageIds = ids;
    library.pages = (library.pages || []).map(function (page) {
      if (page.pageId === pageId) page.selected = ids.indexOf(pageId) >= 0;
      return page;
    });
    library.updatedAt = new Date().toISOString();
    return saveReportPageLibrary(library);
  }

  window.buildReportPageLibrary = buildReportPageLibrary;
  window.buildReportPageLibraryFromDiagnosisPack = buildReportPageLibraryFromDiagnosisPack;
  window.saveReportPageLibrary = saveReportPageLibrary;
  window.readReportPageLibrary = readReportPageLibrary;
  window.ensureReportPageLibrary = ensureReportPageLibrary;
  window.toggleReportPageSelection = toggleReportPageSelection;
})();
