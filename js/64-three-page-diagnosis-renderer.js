/* Bank VQA module: 64-three-page-diagnosis-renderer.js
 * 结论摘要 / 证据地图 / 专题归因三页主画布渲染。
 */
(function () {
  if (typeof window === "undefined") return;

  function el(tag, className, text) {
    var node = document.createElement(tag);
    if (className) node.className = className;
    if (text != null) node.textContent = String(text);
    return node;
  }

  function replaceChildren(host, nodes) {
    if (typeof host.replaceChildren === "function") {
      host.replaceChildren.apply(host, nodes);
      return;
    }
    while (host.firstChild) host.removeChild(host.firstChild);
    nodes.forEach(function (node) { host.appendChild(node); });
  }

  function append(parent, children) {
    children.filter(Boolean).forEach(function (child) { parent.appendChild(child); });
    return parent;
  }

  function dataTraceField(node, trace) {
    var first = Array.isArray(trace) ? trace[0] : null;
    if (first && first.field) node.dataset.traceField = first.field;
    return node;
  }

  function dataReportCandidateId(node, id) {
    if (id) node.dataset.reportCandidateId = id;
    return node;
  }

  function button(label, next) {
    var node = el("button", "", label);
    node.type = "button";
    node.setAttribute("data-three-page-next", next);
    return node;
  }

  function currentPortalPage() {
    if (typeof getPortalPage === "function") return getPortalPage();
    return document.body && document.body.getAttribute("data-app-page") || "answer";
  }

  function contextMeta(model) {
    var ctx = model.context || {};
    var peerCount = Array.isArray(ctx.peerGroup)
      ? ctx.peerGroup.length
      : (ctx.peerGroup && Array.isArray(ctx.peerGroup.banks) ? ctx.peerGroup.banks.length : 0);
    return append(el("div", "three-page-meta"), [
      el("span", "", "目标：" + (ctx.targetBank && (ctx.targetBank.name || ctx.targetBank.id) || "未选择")),
      el("span", "", "年份：" + (ctx.year || "待确认")),
      el("span", "", "对标组：" + peerCount + " 家"),
      el("span", "", "证据包：" + (ctx.status || model.status || "draft")),
    ]);
  }

  function factPackContextBanner(model) {
    if (!model || model.source !== "storylineFactPack") return null;
    var ctx = model.context || {};
    var peerCount = Array.isArray(ctx.peerGroup)
      ? ctx.peerGroup.length
      : (ctx.peerGroup && Array.isArray(ctx.peerGroup.banks) ? ctx.peerGroup.banks.length : 0);
    return append(el("div", "three-page-fact-pack-banner"), [
      el("b", "", "故事线事实包"),
      el("span", "", "目标行：" + (ctx.targetBank && (ctx.targetBank.name || ctx.targetBank.id) || "未选择")),
      el("span", "", "年份：" + (ctx.year || "待确认")),
      el("span", "", "对标组：" + peerCount + " 家"),
      el("span", "", "已选故事线：" + (ctx.selectedStorylineCount || (model.selectedIssues || []).length || 0) + " 条"),
    ]);
  }

  function appendFactPackBanner(section, model) {
    var banner = factPackContextBanner(model);
    if (banner) section.appendChild(banner);
  }

  function hero(kicker, title, body, model) {
    var heroNode = append(el("div", "three-page-hero"), [
      el("span", "", kicker),
      el("h2", "", title || "待生成"),
      body ? el("p", "", body) : null,
    ]);
    if (model) heroNode.appendChild(contextMeta(model));
    return heroNode;
  }

  function renderThreePageEmptyState(model) {
    var section = el("section", "three-page-diagnosis is-empty");
    var h = hero("需要先完成数据对标", "请先生成并确认证据包", "结论摘要、证据地图和专题归因都将基于同一个证据包生成，避免使用旧目标行或泛化判断。");
    h.appendChild(button("回到数据对标", "benchmark"));
    section.appendChild(h);
    return section;
  }

  function renderThreePageStaleState(model) {
    var section = el("section", "three-page-diagnosis three-page-stale");
    var h = hero("证据包已过期", "请重新生成证据包", "目标行、对标组或年份已变化，本页不会继续使用旧内容。", model);
    h.appendChild(button("重新生成证据包", "benchmark"));
    section.appendChild(h);
    return section;
  }

  function renderThreePageLoadingState(model) {
    return append(el("section", "three-page-diagnosis is-loading"), [
      el("div", "three-page-skeleton"),
      el("div", "three-page-skeleton"),
      el("div", "three-page-skeleton"),
      el("p", "", "正在读取本轮证据包..."),
    ]);
  }

  function renderThreePagePartialState(model) {
    var message = model && model.evidenceMap && model.evidenceMap.categoryStatus && model.evidenceMap.categoryStatus.message;
    var section = el("section", "three-page-diagnosis is-partial");
    var h = hero("证据包字段不完整", "当前只能展示已确认的证据", message || "缺失字段不会生成主判断卡，也不会进入最终报告候选页。", model);
    h.appendChild(button("回到数据对标补齐", "benchmark"));
    section.appendChild(h);
    return section;
  }

  function renderThreePageErrorState(model) {
    var section = el("section", "three-page-diagnosis is-error");
    var h = hero("证据包生成失败", "请重新生成证据包", "系统没有读取到可追溯的证据字段，本页不会显示旧目标行内容。", model);
    h.appendChild(button("重新生成", "benchmark"));
    section.appendChild(h);
    return section;
  }

  function renderConclusionSummaryPage(model) {
    var page = model.conclusion || {};
    var section = el("section", "three-page-diagnosis is-conclusion");
    appendFactPackBanner(section, model);
    section.appendChild(hero("结论摘要", page.headline, "本页只保留总答案、主判断卡和最小 KPI。证据和机制进入后续页面。", model));

    var grid = el("div", "three-page-card-grid");
    (page.cards || page.topIssues || []).forEach(function (issue) {
      var card = dataTraceField(el("article", "three-page-card"), issue.trace);
      append(card, [
        el("span", "", "判断 " + (issue.rank || "") + "｜" + (issue.strength || "弱") + "证据"),
        el("h3", "", issue.title || issue.metric || "主判断"),
        el("p", "", issue.conclusion || issue.sentence || ""),
        el("em", "", issue.evidenceText || issue.nextQuestion || ""),
      ]);
      grid.appendChild(card);
    });
    section.appendChild(grid);

    var kpis = el("div", "three-page-kpi-strip");
    (page.kpis || []).forEach(function (item) {
      var kpi = dataTraceField(el("div", "three-page-kpi"), item.trace);
      append(kpi, [
        el("span", "", item.label || "指标"),
        el("b", "", item.value || "待确认"),
        el("em", "", "对标 " + (item.peer || "当前对标组") + "｜差距 " + (item.gap || "—")),
      ]);
      kpis.appendChild(kpi);
    });
    section.appendChild(kpis);
    section.appendChild(append(el("div", "three-page-actions"), [
      button("查看证据地图", "evidence"),
      button("重新选择数据对标", "benchmark"),
    ]));
    return section;
  }

  function evidenceCell(label, item) {
    item = item || {};
    var cell = dataTraceField(el("article", "three-page-evidence-cell"), item.trace);
    append(cell, [
      el("span", "", label),
      el("h3", "", item.metric || item.title || "证据待补"),
      el("p", "", "目标 " + (item.targetValue || "—") + " / 对标 " + (item.peerValue || "—") + " / 差距 " + (item.gap || "—")),
      el("em", "", (item.strength || "弱") + "证据｜" + (item.source || "当前证据包")),
    ]);
    return cell;
  }

  function evidenceGroupCell(group) {
    group = group || {};
    var first = (group.items || [])[0] || {};
    var cell = dataTraceField(el("article", "three-page-evidence-cell"), first.trace);
    append(cell, [
      el("span", "", group.title || group.category || "证据分组"),
      el("h3", "", first.metric || first.title || "证据待补"),
      el("p", "", first.targetValue || first.peerValue || first.gap
        ? "目标 " + (first.targetValue || "—") + " / 对标 " + (first.peerValue || "—") + " / 差距 " + (first.gap || "—")
        : ((group.items || []).length + " 条事实")),
      el("em", "", (first.strength || "待补") + "证据｜" + (first.source || "故事线事实包")),
    ]);
    return cell;
  }

  function renderEvidenceMapPage(model) {
    var page = model.evidenceMap || {};
    var strength = page.strength && page.strength.label || page.strength || "弱";
    var section = el("section", "three-page-diagnosis is-evidence");
    appendFactPackBanner(section, model);
    section.appendChild(hero("证据地图｜" + strength + "证据", page.headline || "证据地图", page.chainSummary || "三类证据将用于验证主判断是否可进入正式报告。", model));
    var map = el("div", "three-page-evidence-map");
    if (Array.isArray(page.groups) && page.groups.length) {
      page.groups.slice(0, 6).forEach(function (group) { map.appendChild(evidenceGroupCell(group)); });
    } else {
      append(map, [
        evidenceCell("同业位置", page.peerPosition),
        evidenceCell("异动偏离", (page.anomalies || [])[0]),
        evidenceCell("估值/质量锚", page.valuationAnchor),
      ]);
    }
    section.appendChild(map);
    var risks = el("ul", "");
    var counter = page.counterEvidence && page.counterEvidence.length ? page.counterEvidence : ["当前未识别明确反证，仍需保留数据口径脚注。"];
    counter.forEach(function (risk) { risks.appendChild(el("li", "", risk)); });
    section.appendChild(append(el("div", "three-page-risk"), [el("b", "", "证据冲突与风险边界"), risks]));
    section.appendChild(append(el("div", "three-page-actions"), [
      button("进入专题归因", "topics"),
      button("回到结论摘要", "answer"),
    ]));
    return section;
  }

  function renderAttributionPage(model) {
    var page = model.attribution || {};
    var chain = page.chain || {};
    var section = el("section", "three-page-diagnosis is-attribution");
    appendFactPackBanner(section, model);
    section.appendChild(hero("专题归因", page.headline || "专题归因", "本页只聚焦一个主问题链，其他专题和高级分析默认折叠。", model));
    var topics = page.topics || page.visibleTopics || [];
    if (topics.length) {
      var topicList = el("div", "three-page-topic-list");
      topics.slice(0, 5).forEach(function (topic, index) {
        var topicNode = dataTraceField(el("article", "three-page-card"), topic.trace);
        append(topicNode, [
          el("span", "", "专题 " + (index + 1) + "｜" + (topic.strength || "待补")),
          el("h3", "", topic.title || topic.storylineId || "专题"),
          el("p", "", topic.conclusion || ("事实 " + (topic.factCount || 0) + " 条 / 图表 " + (topic.chartCount || 0) + " 张")),
        ]);
        topicList.appendChild(topicNode);
      });
      section.appendChild(topicList);
    }
    var chainList = el("ol", "three-page-attribution-chain");
    [
      ["结果指标", chain.result],
      ["直接原因", chain.directCause],
      ["结构原因", chain.structureCause],
      ["管理动作", chain.action],
    ].forEach(function (item) {
      chainList.appendChild(append(el("li", ""), [el("span", "", item[0]), el("b", "", item[1] || "待确认")]));
    });
    section.appendChild(chainList);
    var evidenceGrid = el("div", "three-page-card-grid");
    (page.evidence || []).forEach(function (item) {
      evidenceGrid.appendChild(dataTraceField(append(el("article", "three-page-card"), [
        el("span", "", item.title || "证据"),
        el("p", "", item.text || ""),
      ]), item.trace));
    });
    section.appendChild(evidenceGrid);
    if (Array.isArray(page.charts) && page.charts.length) {
      var charts = el("div", "three-page-report-candidates");
      page.charts.slice(0, 3).forEach(function (chart) {
        append(charts, [
          append(el("article", "three-page-report-candidate"), [
            el("b", "", chart.title || "专题图表"),
            el("p", "", chart.readingGuide && (chart.readingGuide.supports || chart.readingGuide.keyGap) || ""),
            el("em", "", (chart.sourceFactIds || []).join("、") || "故事线事实包"),
          ]),
        ]);
      });
      section.appendChild(charts);
    }
    var candidates = el("div", "three-page-report-candidates");
    (page.reportCandidates || []).forEach(function (item) {
      var candidate = dataReportCandidateId(dataTraceField(el("article", "three-page-report-candidate"), item.trace), item.id);
      append(candidate, [
        el("b", "", item.title || "报告页候选"),
        el("p", "", item.evidenceSentence || ""),
        el("em", "", (item.useScenario || "董事会汇报") + "｜" + (item.recommendedAction || "待确认管理动作")),
      ]);
      candidates.appendChild(candidate);
    });
    section.appendChild(candidates);
    section.appendChild(append(el("details", "three-page-advanced"), [
      el("summary", "", "展开更多机制证据"),
      el("p", "", "交叉信号、利润质量、估值模型和现金流深度保留在高级分析区，默认不打断主线阅读。"),
    ]));
    section.appendChild(append(el("div", "three-page-actions"), [
      button("进入报告编排", "report"),
      button("回到证据地图", "evidence"),
    ]));
    return section;
  }

  function renderThreePageDiagnosis() {
    var host = document.getElementById("threePageDiagnosisMount");
    if (!host || typeof window.buildThreePageDiagnosisModel !== "function") return null;
    var model = window.buildThreePageDiagnosisModel();
    if (model.status === "missing-pack") {
      replaceChildren(host, [renderThreePageEmptyState(model)]);
      return model;
    }
    if (model.status === "stale-pack") {
      replaceChildren(host, [renderThreePageStaleState(model)]);
      return model;
    }
    if (model.status === "loading-pack") {
      replaceChildren(host, [renderThreePageLoadingState(model)]);
      return model;
    }
    if (model.status === "partial-pack") {
      replaceChildren(host, [renderThreePagePartialState(model)]);
      return model;
    }
    if (model.status === "error-pack") {
      replaceChildren(host, [renderThreePageErrorState(model)]);
      return model;
    }
    var page = currentPortalPage();
    if (page === "evidence") replaceChildren(host, [renderEvidenceMapPage(model)]);
    else if (page === "topics") replaceChildren(host, [renderAttributionPage(model)]);
    else replaceChildren(host, [renderConclusionSummaryPage(model)]);
    return model;
  }

  document.addEventListener("click", function (event) {
    var btn = event.target.closest("[data-three-page-next]");
    if (!btn) return;
    var next = btn.dataset.threePageNext;
    if (next === "benchmark" && typeof setPortalPage === "function") setPortalPage("benchmark", { force: true });
    else if (typeof setPortalPage === "function") setPortalPage(next, { force: true });
  });

  window.renderThreePageDiagnosis = renderThreePageDiagnosis;
  document.addEventListener("DOMContentLoaded", function () {
    setTimeout(renderThreePageDiagnosis, 80);
  });
})();
