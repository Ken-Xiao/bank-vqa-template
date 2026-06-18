/* Bank VQA module: 42-portal-router.js
 * Portal IA v11：数据先行一等页面的路由 + 状态机
 *
 * page：launch / benchmark / answer / evidence / topics / report / data
 *
 * 设计：
 *   1. 单一真值源是 state.activePortalPage（已在 01-state.js 预留）
 *   2. URL hash 同步：/index.html#page/answer
 *   3. body[data-app-page] 控制各页面 section 显隐（CSS 见 app.css）
 *   4. 与现有 setAppMode 协同：launch 是参数选择页，confirmed 之后开放其他分析页
 *   5. 钩到 renderAll：每次重渲染 Page Rail 都能更新当前激活状态
 *   6. 错误降级：任何无效 page 都 fall back 到 launch
 */

var PORTAL_PAGES = ["launch", "benchmark", "answer", "evidence", "topics", "report", "data"];

var PORTAL_PAGE_LABELS = {
  launch: "参数选择",
  benchmark: "数据对标",
  answer: "结论摘要",
  evidence: "证据地图",
  topics: "专题归因",
  report: "报告工作室",
  data: "数据复核",
};

var PORTAL_PAGE_SUMMARY = {
  launch: "目标银行、对标银行、分析年份、身份",
  benchmark: "选银行、定对标组、选入报告数据",
  answer: "30秒总判断、董事会议题、行动优先级",
  evidence: "异动归因、同业位置、市净率信号",
  topics: "风险机制、专题链路、行动节奏",
  report: "报告预览、证据包分析、章节编辑与导出",
  data: "字段口径、三源对照、血缘卡",
};

// 子按钮（页内锚点）配置——和 mockup 对齐
var PORTAL_PAGE_SUB = {
  launch:      [{ key: "target",     label: "目标银行" },
                { key: "peer",       label: "对标银行" },
                { key: "year",       label: "分析年份" },
                { key: "identity",   label: "身份" }],
  answer:      [{ key: "verdict",    label: "总判断" },
                { key: "kpi",        label: "核心指标" },
                { key: "questions",  label: "董事会议题" }],
  evidence:    [{ key: "changes",    label: "异动归因" },
                { key: "peerPos",    label: "同业位置" },
                { key: "pb",         label: "市净率信号" }],
  topics:      [{ key: "quality",    label: "专题入口" },
                { key: "mainChart",  label: "机制深钻" },
                { key: "action",     label: "行动节奏" }],
  report:      [{ key: "preview",    label: "报告预览" },
                { key: "structure",  label: "章节编辑" },
                { key: "export",     label: "导出控制" }],
  benchmark:   [{ key: "selectBank", label: "选银行" },
                { key: "peerGroup",  label: "对标组" },
                { key: "domainPanel",label: "数据域" }],
  data:        [{ key: "fields",     label: "字段口径" },
                { key: "triSource",  label: "三源对照" },
                { key: "lineage",    label: "血缘卡" }],
};

function normalizePortalPage(p) {
  if (typeof p !== "string") return "launch";
  var key = p.trim();
  if (PORTAL_PAGES.indexOf(key) >= 0) return key;
  // 兼容 hyphen / lowercase 别名
  if (key === "topic-detail" || key === "topicdetail" || key === "topicDetail") return "topics";
  return "launch";
}

function portalPageEnabled(page) {
  // launch / benchmark 总是可达（benchmark 是纯数据对标，不依赖 confirmed）
  if (page === "launch") return true;
  if (page === "benchmark") return true;
  if (typeof state !== "undefined" && state.confirmed) return true;
  if (typeof document !== "undefined" && document.body && document.body.dataset.appState !== "setup") return true;
  return false;
}

function portalWorkspaceTab(page) {
  var map = {
    launch: "overview",
    answer: "overview",
    evidence: "overview",
    topics: "topics",
    report: "report",
    benchmark: "overview",
    data: "data",
  };
  return map[page] || "overview";
}

function shouldSyncBenchmarkBeforePortalPage(target) {
  if (target === "launch" || target === "benchmark") return false;
  var current = getPortalPage();
  if (current === "benchmark") return true;
  if (typeof document !== "undefined" && document.body) {
    return document.body.getAttribute("data-app-page") === "benchmark";
  }
  return false;
}

function setPortalPage(page, options) {
  options = options || {};
  var target = normalizePortalPage(page);
  if (!portalPageEnabled(target) && !options.force) {
    // 未确认时跳到 launch
    target = "launch";
  }
  var syncBenchmark = shouldSyncBenchmarkBeforePortalPage(target);
  if (syncBenchmark && typeof window !== "undefined" && typeof window.syncBenchmarkToState === "function") {
    window.syncBenchmarkToState({ renderDownstream: false });
  }
  if (typeof state !== "undefined") {
    state.activePortalPage = target;
  }
  if (typeof document !== "undefined" && document.body) {
    document.body.setAttribute("data-app-page", target);
  }
  syncAppModeFromPortalPage(target);
  if (target !== "launch" && typeof setWorkspaceTab === "function") {
    setWorkspaceTab(portalWorkspaceTab(target));
  }
  // URL hash 同步（不触发自己的 hashchange）— 保留 #page/X 后面的 ?query 部分
  if (!options.skipHash && typeof window !== "undefined" && window.location) {
    var prevHash = window.location.hash || "";
    var qIdx = prevHash.indexOf("?");
    var qPart = qIdx >= 0 ? prevHash.substring(qIdx) : "";
    var newHash = "#page/" + target + qPart;
    if (window.location.hash !== newHash) {
      try {
        history.replaceState(null, "", newHash);
      } catch (e) {
        window.location.hash = newHash;
      }
    }
  }
  // localStorage 持久化（与 appMode 一致）
  try {
    if (typeof localStorage !== "undefined") {
      localStorage.setItem("benchmarkiq.activePortalPage", target);
    }
  } catch (e) { /* silent */ }
  // 渲染 Page Rail
  if (typeof renderPageRail === "function") {
    renderPageRail();
  }
  if (typeof syncStep2PathNavForPortalPage === "function") {
    syncStep2PathNavForPortalPage(target);
  }
  if (syncBenchmark && typeof window !== "undefined" && typeof window.syncBenchmarkToState === "function") {
    window.syncBenchmarkToState({ renderDownstream: true, forceRefresh: true });
  }
  // 滚动到顶部（避免 page 切换后还在旧位置）
  if (!options.skipScroll && typeof window !== "undefined") {
    try {
      window.scrollTo({ top: 0, behavior: "instant" });
    } catch (e) {
      window.scrollTo(0, 0);
    }
  }
  return target;
}

function getPortalPage() {
  if (typeof state !== "undefined" && state.activePortalPage) {
    return normalizePortalPage(state.activePortalPage);
  }
  return "launch";
}

function bindPortalRouter() {
  // hashchange 监听
  if (typeof window !== "undefined") {
    window.addEventListener("hashchange", function () {
      var hash = window.location.hash || "";
      var match = hash.match(/^#page\/([a-zA-Z-]+)/);
      if (match) {
        setPortalPage(match[1], { skipHash: true });
      }
    });
  }
  // 全屏点击 data-page-link
  if (typeof document !== "undefined") {
    document.addEventListener("click", function (e) {
      var btn = e.target && e.target.closest && e.target.closest("[data-page-link]");
      if (!btn) return;
      var target = btn.getAttribute("data-page-link");
      if (target) {
        e.preventDefault();
        applyEntryIntent(btn);
        setPortalPage(target);
      }
    });
  }
}

function applyEntryIntent(btn) {
  if (!btn || !btn.getAttribute) return;
  var role = btn.getAttribute("data-entry-role");
  var audience = btn.getAttribute("data-entry-audience");
  if (!role && !audience) return;
  if (typeof document !== "undefined" && document.body && role) {
    document.body.setAttribute("data-entry-role", role);
  }
  try {
    if (typeof localStorage !== "undefined") {
      if (role) localStorage.setItem("benchmarkiq.entryRole", role);
      if (audience) localStorage.setItem("benchmarkiq.audience", audience);
    }
  } catch (e) { /* silent */ }
}

function initPortalRouter() {
  // 优先级：URL hash > localStorage > launch
  var initialPage = null;
  if (typeof window !== "undefined" && window.location.hash) {
    var match = window.location.hash.match(/^#page\/([a-zA-Z-]+)/);
    if (match) initialPage = match[1];
  }
  if (!initialPage) {
    try {
      if (typeof localStorage !== "undefined") {
        initialPage = localStorage.getItem("benchmarkiq.activePortalPage");
      }
    } catch (e) { /* silent */ }
  }
  if (!initialPage) {
    initialPage = "launch";
  }
  setPortalPage(initialPage, { skipScroll: true });
  bindPortalRouter();
}

// 与 setAppMode 协同：保持向后兼容
function syncAppModeFromPortalPage(page) {
  if (typeof setAppMode !== "function") return;
  // benchmark 是无门槛直达页，不触发 setAppMode（避开 analysis 引擎的卡顿）
  if (page === "benchmark") return;
  var modeMap = {
    launch: "setup",
    answer: "analysis",
    evidence: "analysis",
    topics: "analysis",
    report: "report",
    data: "analysis",
  };
  var mode = modeMap[page] || "analysis";
  setAppMode(mode, { skipRouting: true, skipPortal: true });
}

if (typeof window !== "undefined") {
  window.PORTAL_PAGES = PORTAL_PAGES;
  window.PORTAL_PAGE_LABELS = PORTAL_PAGE_LABELS;
  window.PORTAL_PAGE_SUMMARY = PORTAL_PAGE_SUMMARY;
  window.PORTAL_PAGE_SUB = PORTAL_PAGE_SUB;
  window.setPortalPage = setPortalPage;
  window.getPortalPage = getPortalPage;
  window.initPortalRouter = initPortalRouter;
  window.syncAppModeFromPortalPage = syncAppModeFromPortalPage;
  window.applyEntryIntent = applyEntryIntent;
  window.shouldSyncBenchmarkBeforePortalPage = shouldSyncBenchmarkBeforePortalPage;
}
