/* Bank VQA module: 43-page-rail.js
 * Portal IA v11：左侧任务流导航
 *
 * 渲染 6 个 page 入口（含子按钮），高亮当前 page，未确认时禁用非 launch 页。
 *
 * DOM 结构：
 *   <nav class="page-rail" id="pageRail">
 *     <button class="rail-primary is-active" data-page-link="launch">
 *       <span class="step-num">01</span>
 *       <span class="label"><b>设定口径</b><em>目标银行、对标组、汇报场景</em></span>
 *     </button>
 *     <div class="rail-sub">
 *       <button data-sub-page="launch" data-sub-anchor="target">目标银行</button>
 *       ...
 *     </div>
 *     ... 6 组
 *   </nav>
 */

var PORTAL_SUB_ANCHORS = {
  launch: {
    target: "#quickLaunchPanel",
    peer: ".peer-field",
    scenario: ".launch-scenario",
  },
  answer: {
    verdict: "#clientCommandCenter",
    kpi: "#step2KpiStrip",
    questions: "#step2BoardQuestions",
  },
  evidence: {
    changes: "#step2TopChanges",
    peerPos: "#step2PeerPosition",
    pb: "#step2PbAnswer",
  },
  topics: {
    quality: "#step2TopicCards",
    mainChart: "#profitQualityMount",
    action: "#ibEvidencePanel",
  },
  report: {
    preview: "#formalReportShell",
    structure: "#reportStructureEditor",
    export: "#exportSequenceQaPanel",
  },
  data: {
    fields: "#dataCoverageSection",
    triSource: "#triSourceValidationPanel",
    lineage: "#fieldLineageMap",
  },
};

function resolvePortalSubAnchor(page, anchorKey) {
  if (typeof document === "undefined" || !anchorKey) return null;
  var explicit = document.getElementById("pageAnchor-" + anchorKey)
    || document.querySelector('[data-anchor="' + anchorKey + '"]');
  if (explicit) return explicit;
  var pageMap = PORTAL_SUB_ANCHORS[page] || {};
  var selector = pageMap[anchorKey];
  return selector ? document.querySelector(selector) : null;
}

function renderPageRail() {
  var host = typeof document !== "undefined" ? document.getElementById("pageRail") : null;
  if (!host) return;
  var current = typeof getPortalPage === "function" ? getPortalPage() : "launch";
  var confirmed = typeof state !== "undefined" && state.confirmed
    || typeof document !== "undefined" && document.body && document.body.dataset.appState !== "setup";
  var pages = (typeof PORTAL_PAGES !== "undefined") ? PORTAL_PAGES : ["launch"];
  var labels = (typeof PORTAL_PAGE_LABELS !== "undefined") ? PORTAL_PAGE_LABELS : {};
  var summaries = (typeof PORTAL_PAGE_SUMMARY !== "undefined") ? PORTAL_PAGE_SUMMARY : {};
  var subMap = (typeof PORTAL_PAGE_SUB !== "undefined") ? PORTAL_PAGE_SUB : {};

  var titleHtml = '<div class="rail-title">'
    + '<strong>任务流目录</strong>'
    + '<span>按六页顺序完成口径、判断、证据、专题、报告和数据复核。</span>'
    + '</div>';

  var html = titleHtml + pages.map(function (page, idx) {
    var isActive = page === current;
    var enabled = page === "launch" || confirmed;
    var num = String(idx + 1).padStart(2, "0");
    var label = labels[page] || page;
    var summary = summaries[page] || "";
    var classes = ["rail-primary"];
    if (isActive) classes.push("is-active");
    if (!enabled) classes.push("is-disabled");
    var primary = '<button class="' + classes.join(" ") + '" '
      + 'data-page-link="' + page + '" '
      + (enabled ? "" : 'aria-disabled="true" ')
      + 'type="button">'
      + '<span class="step-num">' + num + '</span>'
      + '<span class="label"><b>' + label + '</b>'
      + (summary ? '<em>' + summary + '</em>' : "")
      + '</span>'
      + '</button>';
    var subs = subMap[page] || [];
    var subHtml = "";
    if (subs.length && isActive) {
      subHtml = '<div class="rail-sub">' + subs.map(function (s) {
        return '<button type="button" data-sub-page="' + page + '" data-sub-anchor="' + s.key + '">' + s.label + '</button>';
      }).join("") + '</div>';
    }
    return primary + subHtml;
  }).join("");

  host.innerHTML = html;
  host.setAttribute("data-active-page", current);
}

function bindPageRail() {
  // Page Rail 内的 sub anchor 点击：跳到对应锚点
  if (typeof document === "undefined") return;
  document.addEventListener("click", function (e) {
    var btn = e.target && e.target.closest && e.target.closest("[data-sub-anchor]");
    if (!btn) return;
    e.preventDefault();
    e.stopPropagation();
    var anchorKey = btn.getAttribute("data-sub-anchor");
    if (!anchorKey) return;
    var page = btn.getAttribute("data-sub-page")
      || (typeof getPortalPage === "function" ? getPortalPage() : "launch");
    var current = typeof getPortalPage === "function" ? getPortalPage() : page;
    if (typeof setPortalPage === "function" && page && page !== current) {
      setPortalPage(page, { skipScroll: true });
    }
    var target = resolvePortalSubAnchor(page, anchorKey);
    if (target) {
      setTimeout(function () {
        try {
          target.scrollIntoView({ behavior: "smooth", block: "start" });
        } catch (e) { target.scrollIntoView(); }
      }, 50);
    }
  });
}

function initPageRail() {
  renderPageRail();
  bindPageRail();
}

if (typeof window !== "undefined") {
  window.renderPageRail = renderPageRail;
  window.bindPageRail = bindPageRail;
  window.initPageRail = initPageRail;
  window.resolvePortalSubAnchor = resolvePortalSubAnchor;
  window.PORTAL_SUB_ANCHORS = PORTAL_SUB_ANCHORS;
}
