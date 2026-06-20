/* Bank VQA module: 66-storyline-fact-pack-ui.js
 * 故事线事实包 UI 基座：抽屉摘要与图表读图指南。
 */
(function () {
  "use strict";

  if (typeof window === "undefined" || typeof document === "undefined") return;

  var DRAWER_ID = "storylineFactPackDrawer";
  var VIEWER_ID = "storylineChartViewer";

  function asArray(value) {
    return Array.isArray(value) ? value : [];
  }

  function firstText() {
    for (var i = 0; i < arguments.length; i += 1) {
      var value = arguments[i];
      if (typeof value === "number" && !Number.isNaN(value)) return String(value);
      if (typeof value === "string" && value.trim()) return value.trim();
    }
    return "";
  }

  function clearNode(node) {
    while (node && node.firstChild) node.removeChild(node.firstChild);
  }

  function appendTextNode(parent, tagName, className, text) {
    var node = document.createElement(tagName);
    if (className) node.className = className;
    node.textContent = text || "";
    parent.appendChild(node);
    return node;
  }

  function appendMetric(parent, label, value) {
    if (value === undefined || value === null || value === "") return null;
    var item = document.createElement("div");
    item.className = "storyline-fact-pack-metric";
    appendTextNode(item, "span", "", label);
    appendTextNode(item, "b", "", String(value));
    parent.appendChild(item);
    return item;
  }

  function readPack() {
    if (typeof window.readStorylineFactPack === "function") {
      var modelPack = window.readStorylineFactPack();
      if (modelPack) return modelPack;
    }
    return (window.benchmarkiq && window.benchmarkiq.storylineFactPack) || null;
  }

  function targetName(context) {
    var target = context && context.targetBank;
    if (typeof target === "string") return target;
    return firstText(target && target.name, target && target.shortName, target && target.id);
  }

  function peerCount(context) {
    var peers = context && context.peerGroup;
    if (Array.isArray(peers)) return peers.length;
    if (peers && Array.isArray(peers.banks)) return peers.banks.length;
    return "";
  }

  function selectedStorylines(pack) {
    var selectedIds = {};
    asArray(pack && pack.selectedStorylineIds).forEach(function (id) {
      selectedIds[String(id)] = true;
    });
    return asArray(pack && pack.storylines).filter(function (storyline) {
      return !!(storyline && (storyline.selected || selectedIds[String(storyline.storylineId)]));
    });
  }

  function removeStorylineFromFactPack(storylineId) {
    var pack = readPack();
    if (!pack || !storylineId) return null;
    var id = String(storylineId);
    var selectedIds = asArray(pack.selectedStorylineIds).map(String).filter(function (itemId) {
      return itemId !== id;
    });
    pack.selectedStorylineIds = selectedIds;
    pack.storylines = asArray(pack.storylines).map(function (storyline) {
      if (storyline && String(storyline.storylineId) === id) storyline.selected = false;
      return storyline;
    });
    if (typeof window.saveStorylineFactPack === "function") window.saveStorylineFactPack(pack);
    renderStorylineFactPackControls();
    return pack;
  }

  function appendStorylineList(parent, storylines) {
    var list = document.createElement("ul");
    list.className = "storyline-fact-pack-list";
    if (!storylines.length) {
      var emptyItem = document.createElement("li");
      emptyItem.className = "storyline-fact-pack-empty";
      emptyItem.textContent = "尚未选择故事线。";
      list.appendChild(emptyItem);
    }
    storylines.forEach(function (storyline) {
      var item = document.createElement("li");
      item.className = "storyline-fact-pack-list-item";
      var button = document.createElement("button");
      button.type = "button";
      button.className = "storyline-fact-pack-story";
      button.textContent = firstText(storyline.title, storyline.storylineId, "未命名故事线");
      var chart = asArray(storyline.charts)[0];
      if (chart) {
        button.addEventListener("click", function () {
          window.openStorylineChartViewer(chart);
        });
      } else {
        button.disabled = true;
      }
      item.appendChild(button);
      var remove = document.createElement("button");
      remove.type = "button";
      remove.className = "storyline-fact-pack-remove";
      remove.textContent = "移除";
      remove.setAttribute("aria-label", "从事实包移除：" + firstText(storyline.title, storyline.storylineId, "未命名故事线"));
      remove.addEventListener("click", function () {
        removeStorylineFromFactPack(storyline.storylineId);
      });
      item.appendChild(remove);
      if (storyline.conclusion) appendTextNode(item, "p", "", storyline.conclusion);
      list.appendChild(item);
    });
    parent.appendChild(list);
    return list;
  }

  function enterDiagnosis() {
    window.location.hash = "#page/answer";
    if (typeof window.renderThreePageDiagnosis === "function") {
      window.renderThreePageDiagnosis();
    }
  }

  function enterReportPageLibrary() {
    if (typeof window.ensureReportPageLibrary === "function") {
      window.ensureReportPageLibrary();
    }
    window.location.hash = "#page/report";
    if (typeof window.renderReportPageLibrary === "function") {
      window.renderReportPageLibrary();
    }
  }

  function renderStorylineFactPackControls() {
    var drawer = document.getElementById(DRAWER_ID);
    if (!drawer) return null;

    var pack = readPack();
    var context = (pack && pack.context) || {};
    var storylines = selectedStorylines(pack);

    clearNode(drawer);
    drawer.setAttribute("aria-live", "polite");

    var header = document.createElement("div");
    header.className = "storyline-fact-pack-head";
    appendTextNode(header, "p", "storyline-fact-pack-eyebrow", "Benchmark IQ");
    appendTextNode(header, "h2", "", "故事线事实包");
    appendTextNode(header, "span", "storyline-fact-pack-count", "已选择 " + storylines.length + " 条故事线");
    drawer.appendChild(header);

    var metrics = document.createElement("div");
    metrics.className = "storyline-fact-pack-metrics";
    appendMetric(metrics, "目标行", targetName(context));
    appendMetric(metrics, "年份", context.year || context.reportYear || context.selectedYear);
    appendMetric(metrics, "对标组", peerCount(context));
    if (!metrics.childNodes.length) appendTextNode(metrics, "p", "storyline-fact-pack-muted", "等待数据对标上下文。");
    drawer.appendChild(metrics);

    appendTextNode(drawer, "h3", "storyline-fact-pack-section-title", "已选故事线");
    appendStorylineList(drawer, storylines);

    var actions = document.createElement("div");
    actions.className = "storyline-fact-pack-actions";
    var reportCta = document.createElement("button");
    reportCta.type = "button";
    reportCta.className = "storyline-fact-pack-secondary";
    reportCta.textContent = "生成报告页候选";
    reportCta.disabled = storylines.length === 0;
    reportCta.addEventListener("click", enterReportPageLibrary);
    actions.appendChild(reportCta);
    var cta = document.createElement("button");
    cta.type = "button";
    cta.className = "storyline-fact-pack-primary";
    cta.textContent = "进入结论摘要";
    cta.disabled = storylines.length === 0;
    cta.addEventListener("click", enterDiagnosis);
    actions.appendChild(cta);
    drawer.appendChild(actions);

    return drawer;
  }

  function readingGuide(chart) {
    var guide = (chart && chart.readingGuide) || {};
    return [
      ["这张图看什么", firstText(guide.whatToSee, chart && chart.whatToSee, "先看目标行与对标组的方向性差距。")],
      ["关键差距", firstText(guide.keyGap, chart && chart.keyGap, "关键差距待补充。")],
      ["支持的判断", firstText(guide.supports, chart && chart.supports, "支持当前故事线判断。")],
      ["报告用途", firstText(guide.reportUse, chart && chart.reportUse, "可作为结论摘要或专题页主证据。")],
      ["数据来源", firstText(guide.source, chart && chart.source, "当前数据对标事实包")]
    ];
  }

  function closeStorylineChartViewer() {
    var viewer = document.getElementById(VIEWER_ID);
    if (!viewer) return;
    clearNode(viewer);
    viewer.hidden = true;
  }

  function appendChartImage(parent, chart) {
    var src = firstText(chart && chart.enlargedSrc, chart && chart.src);
    var title = firstText(chart && chart.title, "故事线证据图");
    if (!src) {
      appendTextNode(parent, "div", "storyline-chart-viewer-missing", "暂无图表预览");
      return;
    }
    var image = document.createElement("img");
    image.className = "storyline-chart-viewer-image";
    image.src = src;
    image.alt = title;
    parent.appendChild(image);
  }

  function openStorylineChartViewer(chart) {
    var viewer = document.getElementById(VIEWER_ID);
    if (!viewer) return null;

    clearNode(viewer);
    viewer.hidden = false;

    var backdrop = document.createElement("button");
    backdrop.type = "button";
    backdrop.className = "storyline-chart-viewer-backdrop";
    backdrop.setAttribute("aria-label", "关闭读图指南");
    backdrop.addEventListener("click", closeStorylineChartViewer);
    viewer.appendChild(backdrop);

    var shell = document.createElement("section");
    shell.className = "storyline-chart-viewer-shell";
    shell.setAttribute("role", "dialog");
    shell.setAttribute("aria-modal", "true");
    shell.setAttribute("aria-label", "故事线图表读图指南");

    var visual = document.createElement("div");
    visual.className = "storyline-chart-viewer-visual";
    appendTextNode(visual, "h2", "", firstText(chart && chart.title, "故事线证据图"));
    appendChartImage(visual, chart || {});
    shell.appendChild(visual);

    var panel = document.createElement("aside");
    panel.className = "storyline-chart-viewer-guide";
    appendTextNode(panel, "p", "storyline-chart-viewer-eyebrow", "读图指南");
    readingGuide(chart || {}).forEach(function (row) {
      var item = document.createElement("div");
      item.className = "storyline-chart-viewer-guide-item";
      appendTextNode(item, "h3", "", row[0]);
      appendTextNode(item, "p", "", row[1]);
      panel.appendChild(item);
    });
    var close = document.createElement("button");
    close.type = "button";
    close.className = "storyline-chart-viewer-close";
    close.textContent = "关闭";
    close.addEventListener("click", closeStorylineChartViewer);
    panel.appendChild(close);
    shell.appendChild(panel);

    viewer.appendChild(shell);
    close.focus();
    return viewer;
  }

  window.renderStorylineFactPackControls = renderStorylineFactPackControls;
  window.removeStorylineFromFactPack = removeStorylineFromFactPack;
  window.openStorylineChartViewer = openStorylineChartViewer;
  window.closeStorylineChartViewer = closeStorylineChartViewer;

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", renderStorylineFactPackControls);
  } else {
    renderStorylineFactPackControls();
  }
})();
