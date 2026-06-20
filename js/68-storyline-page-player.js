/* Bank VQA module: 68-storyline-page-player.js
 * 固定 16:9 故事页播放器：一页一个完整判断，可复用到结论、证据地图和专题归因。
 */
(function () {
  "use strict";

  if (typeof window === "undefined" || typeof document === "undefined") return;

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

  function appendText(parent, tagName, className, text) {
    var node = document.createElement(tagName);
    if (className) node.className = className;
    node.textContent = text || "";
    parent.appendChild(node);
    return node;
  }

  function normalizePages(pages) {
    return asArray(pages).map(function (page, index) {
      page = page || {};
      return {
        pageId: firstText(page.pageId, page.id, "storyline_page_" + (index + 1)),
        eyebrow: firstText(page.eyebrow, page.kicker, "故事页"),
        title: firstText(page.title, "待补标题"),
        subtitle: firstText(page.subtitle, page.summary, ""),
        conclusion: firstText(page.conclusion, page.bottomLine, ""),
        evidence: asArray(page.evidence).length ? asArray(page.evidence) : asArray(page.facts),
        chain: asArray(page.chain).length ? asArray(page.chain) : asArray(page.causalChain),
        chart: page.chart || page.visual || null,
        readingGuide: page.readingGuide || (page.chart && page.chart.readingGuide) || {},
        source: firstText(page.source, page.evidenceSource, "")
      };
    });
  }

  function appendEvidenceList(parent, evidence) {
    var list = document.createElement("ul");
    list.className = "storyline-page-evidence";
    if (!evidence.length) {
      var empty = document.createElement("li");
      empty.textContent = "待补证据";
      list.appendChild(empty);
    }
    evidence.slice(0, 4).forEach(function (item) {
      var row = document.createElement("li");
      appendText(row, "b", "", firstText(item && item.metric, item && item.label, item && item.role, "证据"));
      appendText(row, "span", "", firstText(item && item.sentence, item && item.summary, item && item.gap, item && item.value, ""));
      list.appendChild(row);
    });
    parent.appendChild(list);
  }

  function appendChain(parent, chain) {
    var wrap = document.createElement("div");
    wrap.className = "storyline-page-chain";
    var nodes = chain.length ? chain : ["待确认结果指标", "待确认直接原因", "待确认管理动作"];
    nodes.slice(0, 4).forEach(function (node, index) {
      var item = document.createElement("div");
      item.className = "storyline-page-chain-node";
      appendText(item, "span", "", index === 0 ? "结果" : "第 " + index + " 层");
      appendText(item, "b", "", firstText(node && node.title, node && node.metric, node && node.label, node));
      wrap.appendChild(item);
    });
    parent.appendChild(wrap);
  }

  function appendVisual(parent, page) {
    var figure = document.createElement("figure");
    figure.className = "storyline-page-visual";
    var chart = page.chart || {};
    var src = firstText(chart.enlargedSrc, chart.src);
    if (src) {
      var image = document.createElement("img");
      image.src = src;
      image.alt = firstText(chart.title, page.title, "故事页证据图");
      figure.appendChild(image);
    } else {
      appendText(figure, "div", "storyline-page-visual-empty", "待补图表");
    }
    var caption = document.createElement("figcaption");
    appendText(caption, "b", "", firstText(chart.title, "证据图"));
    appendText(caption, "span", "", firstText(page.readingGuide.whatToSee, page.readingGuide.keyGap, "读图指南待补充"));
    figure.appendChild(caption);
    parent.appendChild(figure);
  }

  function renderPage(frame, page, pageIndex, pageCount) {
    clearNode(frame);
    var slide = document.createElement("article");
    slide.className = "storyline-page-slide";
    slide.setAttribute("data-storyline-page-id", page.pageId);

    var header = document.createElement("header");
    appendText(header, "p", "storyline-page-eyebrow", page.eyebrow + " · " + (pageIndex + 1) + "/" + pageCount);
    appendText(header, "h2", "", page.title);
    if (page.subtitle) appendText(header, "p", "storyline-page-subtitle", page.subtitle);
    slide.appendChild(header);

    var body = document.createElement("div");
    body.className = "storyline-page-body";
    var left = document.createElement("section");
    left.className = "storyline-page-left";
    appendEvidenceList(left, page.evidence);
    appendChain(left, page.chain);
    body.appendChild(left);
    appendVisual(body, page);
    slide.appendChild(body);

    var footer = document.createElement("footer");
    appendText(footer, "b", "", "本页结论");
    appendText(footer, "span", "", firstText(page.conclusion, "待补结论"));
    if (page.source) appendText(footer, "em", "", page.source);
    slide.appendChild(footer);

    frame.appendChild(slide);
  }

  function renderStorylinePagePlayer(host, pages, options) {
    if (!host) return null;
    var normalized = normalizePages(pages);
    var state = { index: 0, pages: normalized };
    options = options || {};
    clearNode(host);
    host.classList.add("storyline-page-player");

    var toolbar = document.createElement("div");
    toolbar.className = "storyline-page-player-toolbar";
    appendText(toolbar, "span", "storyline-page-player-title", firstText(options.title, "故事页"));
    var controls = document.createElement("div");
    controls.className = "storyline-page-player-controls";
    var prev = document.createElement("button");
    prev.type = "button";
    prev.textContent = "上一页";
    var count = appendText(controls, "span", "", "0/0");
    var next = document.createElement("button");
    next.type = "button";
    next.textContent = "下一页";
    controls.insertBefore(prev, count);
    controls.appendChild(next);
    toolbar.appendChild(controls);
    host.appendChild(toolbar);

    var frame = document.createElement("div");
    frame.className = "storyline-page-player-frame";
    host.appendChild(frame);

    function update() {
      var total = state.pages.length || 1;
      var page = state.pages[state.index] || {
        pageId: "empty",
        eyebrow: "故事页",
        title: "暂无可展示页面",
        subtitle: "请先在数据对标页选择故事线并加入事实包。",
        evidence: [],
        chain: [],
        conclusion: "等待事实包。"
      };
      count.textContent = (state.index + 1) + "/" + total;
      prev.disabled = state.index <= 0;
      next.disabled = state.index >= state.pages.length - 1;
      renderPage(frame, page, state.index, total);
    }

    prev.addEventListener("click", function () {
      state.index = Math.max(0, state.index - 1);
      update();
    });
    next.addEventListener("click", function () {
      state.index = Math.min(state.pages.length - 1, state.index + 1);
      update();
    });

    update();
    host.__storylinePagePlayer = {
      next: function () { next.click(); },
      prev: function () { prev.click(); },
      state: state
    };
    return host.__storylinePagePlayer;
  }

  window.renderStorylinePagePlayer = renderStorylinePagePlayer;
})();
