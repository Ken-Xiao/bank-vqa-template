/* Bank VQA module: 42-portal-router.js
 * Portal IA v11：6 个一等页面的路由 + 状态机
 *
 * 6 个 page：launch / answer / evidence / topics / report / data
 *
 * 设计：
 *   1. 单一真值源是 state.activePortalPage（已在 01-state.js 预留）
 *   2. URL hash 同步：/index.html#page/answer
 *   3. body[data-app-page] 控制各页面 section 显隐（CSS 见 app.css）
 *   4. 与现有 setAppMode 协同：confirmed 之前只有 launch 可达，confirmed 之后开放其他 5 页
 *   5. 钩到 renderAll：每次重渲染 Page Rail 都能更新当前激活状态
 *   6. 错误降级：任何无效 page 都 fall back 到 launch
 */

var PORTAL_PAGES = ["launch", "answer", "evidence", "topics", "report", "data"];

var PORTAL_PAGE_LABELS = {
  launch: "设定口径",
  answer: "经营质量",
  evidence: "证据地图",
  topics: "专题分析",
  report: "报告工作室",
  data: "数据复核",
};

var PORTAL_PAGE_SUMMARY = {
  launch: "目标银行、对标组、汇报场景",
  answer: "总判断、核心指标、董事会议题",
  evidence: "异动归因、同业位置、市净率信号",
  topics: "专题入口、机制深钻、行动节奏",
  report: "报告预览、章节编辑、导出控制",
  data: "字段口径、三源对照、血缘卡",
};

// 子按钮（页内锚点）配置——和 mockup 对齐
var PORTAL_PAGE_SUB = {
  launch:      [{ key: "target",     label: "目标银行" },
                { key: "peer",       label: "对标组" },
                { key: "scenario",   label: "汇报场景" }],
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
  // launch 总是可达；其他页面需要 state.confirmed
  if (page === "launch") return true;
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
    data: "data",
  };
  return map[page] || "overview";
}

function setPortalPage(page, options) {
  options = options || {};
  var target = normalizePortalPage(page);
  if (!portalPageEnabled(target) && !options.force) {
    // 未确认时跳到 launch
    target = "launch";
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
  // URL hash 同步（不触发自己的 hashchange）
  if (!options.skipHash && typeof window !== "undefined" && window.location) {
    var newHash = "#page/" + target;
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
        setPortalPage(target);
      }
    });
  }
}

function initPortalRouter() {
  // 优先级：URL hash > localStorage > state.confirmed 判定 > launch
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
    initialPage = (typeof state !== "undefined" && state.confirmed) ? "answer" : "launch";
  }
  setPortalPage(initialPage, { skipScroll: true });
  bindPortalRouter();
}

// 与 setAppMode 协同：保持向后兼容
function syncAppModeFromPortalPage(page) {
  if (typeof setAppMode !== "function") return;
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
}
