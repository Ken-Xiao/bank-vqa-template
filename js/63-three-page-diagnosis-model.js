/* Bank VQA module: 63-three-page-diagnosis-model.js
 * 结论摘要 / 证据地图 / 专题归因三页统一模型。
 */
(function () {
  if (typeof window === "undefined") return;

  var GENERIC_LANGUAGE_PATTERNS = [
    "需要综合分析",
    "整体表现较好",
    "整体表现较差",
    "存在一定压力",
    "需要进一步关注",
    "建议持续优化",
    "指标有所波动",
    "需结合实际情况判断",
    "具有一定参考意义",
  ];

  var STATUS_EXAMPLES_FOR_CONTRACT = {
    missing: { status: "missing-pack" },
    stale: { status: "stale-pack" },
    partial: { status: "partial-pack" },
    error: { status: "error-pack" },
  };

  function readThreePageEvidencePack() {
    if (typeof window.readEvidencePack === "function") return window.readEvidencePack();
    try {
      var raw = localStorage.getItem("benchmarkiq.evidencePack");
      return raw ? JSON.parse(raw) : null;
    } catch (e) {
      return window.__benchmarkEvidencePack || null;
    }
  }

  function normalizePackStatus(pack) {
    if (!pack) return "missing-pack";
    if (pack.status === "stale") return "stale-pack";
    if (pack.status === "error") return "error-pack";
    var missing = [];
    ["targetBank", "peerGroup", "year"].forEach(function (key) {
      if (!pack[key]) missing.push(key);
    });
    if (!Array.isArray(pack.recommendedIssues) && !Array.isArray(pack.selectedIssues) && !Array.isArray(pack.storyCards)) {
      missing.push("recommendedIssues");
    }
    return missing.length ? "partial-pack" : (pack.status || "confirmed");
  }

  function firstEvidence(issue) {
    return issue && Array.isArray(issue.evidence) ? issue.evidence[0] : null;
  }

  function traceForEvidence(issue, ev, fieldPrefix) {
    var prefix = fieldPrefix || "issue";
    var trace = [];
    if (issue && issue.issueId) trace.push({ field: prefix + ".issueId", source: "evidencePack", value: issue.issueId });
    if (issue && issue.primaryMetric) trace.push({ field: prefix + ".primaryMetric", source: "evidencePack", value: issue.primaryMetric });
    if (issue && issue.metric) trace.push({ field: prefix + ".metric", source: "evidencePack", value: issue.metric });
    if (ev && ev.evidenceId) trace.push({ field: prefix + ".evidence.evidenceId", source: "evidencePack", value: ev.evidenceId });
    if (ev && ev.gap) trace.push({ field: prefix + ".evidence.gap", source: "evidencePack", value: ev.gap });
    return trace;
  }

  function hasTrace(item) {
    return Array.isArray(item && item.trace) && item.trace.length > 0;
  }

  function textHasGenericLanguage(text) {
    return GENERIC_LANGUAGE_PATTERNS.some(function (pattern) {
      return String(text || "").indexOf(pattern) >= 0;
    });
  }

  function selectedIssuesFromPack(pack) {
    var issues = Array.isArray(pack && pack.recommendedIssues) ? pack.recommendedIssues.slice() : [];
    if (!issues.length && Array.isArray(pack && pack.storyCards)) {
      issues = pack.storyCards.map(function (card, index) {
        if (!card) return null;
        var nodes = Array.isArray(card.causalNodes) ? card.causalNodes : [];
        var primary = nodes[0] || {};
        return {
          issueId: card.id || "story_" + index,
          title: card.title || primary.metric || "故事线专题",
          priority: index + 1,
          primaryMetric: primary.metric || "",
          conclusion: card.lead || card.title || "",
          evidence: nodes.map(function (node, nodeIndex) {
            return {
              evidenceId: (card.id || "story_" + index) + "_ev_" + nodeIndex,
              category: node.category,
              metric: node.metric,
              targetValue: node.targetValue,
              peerValue: node.peerValue,
              gap: node.gap,
              signalDirection: node.signalDirection || "support",
              strength: node.strength || "中",
              source: node.source || "故事线证据",
            };
          }),
          causalChain: nodes.map(function (node) { return node.metric || node.title || ""; }).filter(Boolean),
          action: card.action || "",
        };
      }).filter(Boolean);
    }
    var selected = Array.isArray(pack && pack.selectedIssues) ? pack.selectedIssues : [];
    if (!selected.length) return issues.sort(prioritySort);
    var selectedMap = {};
    selected.forEach(function (id, index) { selectedMap[id] = index + 1; });
    return issues
      .filter(function (issue) { return selectedMap[issue.issueId] != null; })
      .sort(function (a, b) { return selectedMap[a.issueId] - selectedMap[b.issueId]; });
  }

  function prioritySort(a, b) {
    return (a.priority || 99) - (b.priority || 99);
  }

  function modelContext(pack, status) {
    pack = pack || {};
    return {
      targetBank: pack.targetBank || {},
      peerGroup: pack.peerGroup || { label: "当前对标组", banks: [] },
      year: pack.year || "",
      status: status || pack.status || "draft",
      version: pack.version || "",
      updatedAt: pack.updatedAt || "",
    };
  }

  function evidenceCategory(issue, ev) {
    var category = (ev && ev.category) || (issue && issue.category) || "";
    if (category === "peerPosition" || category === "anomaly" || category === "valuationAnchor") {
      return { category: category, fallback: false };
    }
    var haystack = [issue && issue.title, issue && issue.primaryMetric, ev && ev.metric, ev && ev.source].join(" ");
    if (/同业|对标|分位/.test(haystack)) return { category: "peerPosition", fallback: true };
    if (/变化|同比|环比|扩大|收窄/.test(haystack)) return { category: "anomaly", fallback: true };
    if (/PB|ROE|不良|拨备|资本|质量/.test(haystack)) return { category: "valuationAnchor", fallback: true };
    return { category: "peerPosition", fallback: true };
  }

  function chainSegment(issue, name) {
    var chain = issue && issue.causalChain;
    if (name === "result") return issue.primaryMetric || (Array.isArray(chain) && chain[0]) || "待确认结果指标";
    if (name === "directCause") return (chain && chain.directCause) || issue.directDriver || (Array.isArray(chain) && chain[1]) || "待确认直接原因";
    if (name === "structureCause") return (chain && chain.structureCause) || issue.structureDriver || (Array.isArray(chain) && chain[2]) || "待确认结构原因";
    if (name === "action") return issue.recommendedAction || issue.action || (Array.isArray(chain) && chain[3]) || "待确认管理动作";
    return "待确认";
  }

  function strengthScore(strength) {
    if (strength === "强" || strength === "高") return 3;
    if (strength === "中") return 2;
    return 1;
  }

  function evidenceItemsFromIssues(issues) {
    var items = [];
    issues.forEach(function (issue) {
      var evidence = Array.isArray(issue.evidence) && issue.evidence.length ? issue.evidence : [null];
      evidence.forEach(function (ev) {
        var categoryInfo = evidenceCategory(issue, ev);
        items.push(Object.assign({}, ev || {}, {
          issueId: issue.issueId,
          title: issue.title,
          category: categoryInfo.category,
          categoryFallback: categoryInfo.fallback,
          primaryMetric: issue.primaryMetric,
          metric: (ev && ev.metric) || issue.primaryMetric || "",
          signalDirection: (ev && ev.signalDirection) || "support",
          strength: (ev && ev.strength) || issue.confidence || "弱",
          trace: traceForEvidence(issue, ev, "evidenceMap"),
        }));
      });
    });
    return items;
  }

  function scoreEvidenceStrength(evidenceItems, pack) {
    var peerCount = pack && pack.peerGroup && Array.isArray(pack.peerGroup.banks) ? pack.peerGroup.banks.length : 0;
    if (!pack || pack.status !== "confirmed" || peerCount < 3) {
      return { label: "弱", supportCount: 0, counterCount: 1 };
    }
    var supportItems = evidenceItems.filter(function (item) {
      return item.signalDirection === "support";
    });
    var counterCount = evidenceItems.filter(function (item) {
      return item.signalDirection === "counter";
    }).length;
    var supportCount = supportItems.length;
    var maxSupportScore = supportItems.reduce(function (max, item) {
      return Math.max(max, strengthScore(item.strength));
    }, 0);
    if (supportCount >= 2 && counterCount === 0 && maxSupportScore >= 2) return { label: "强", supportCount: supportCount, counterCount: counterCount };
    if (supportCount >= 1 && counterCount === 0) return { label: "中", supportCount: supportCount, counterCount: counterCount };
    return { label: "弱", supportCount: supportCount, counterCount: counterCount };
  }

  function buildConclusionCards(pack, issues) {
    var cards = [];
    var top = issues[0];
    if (!top) return cards;

    function addCard(issue, ev, role, rankLabel) {
      if (!issue) return;
      var trace = traceForEvidence(issue, ev, role);
      var sentence = (ev && ev.sentence) || issue.conclusion || issue.diagnosis || "";
      var card = {
        rank: cards.length + 1,
        role: role,
        title: issue.title || issue.issueName || rankLabel || "主判断",
        metric: issue.primaryMetric || issue.metric || (ev && ev.metric) || "",
        evidenceId: (ev && ev.evidenceId) || issue.evidenceId || issue.issueId,
        sentence: sentence,
        conclusion: sentence,
        evidenceText: ev ? ((ev.metric || issue.primaryMetric || "") + "：目标 " + (ev.targetValue || "—") + " / 对标 " + (ev.peerValue || "—") + " / 差距 " + (ev.gap || "—")) : chainSegment(issue, "directCause"),
        strength: (ev && ev.strength) || issue.confidence || "弱",
        nextQuestion: chainSegment(issue, "directCause"),
        trace: trace,
      };
      var key = card.evidenceId || card.metric || card.title;
      if (!key || !hasTrace(card) || textHasGenericLanguage(card.sentence)) return;
      if (cards.some(function (item) { return (item.evidenceId || item.metric || item.title) === key; })) return;
      cards.push(card);
    }

    var topEvidence = Array.isArray(top.evidence) ? top.evidence : [];
    addCard(top, topEvidence[0], "topIssue", "主约束");
    addCard(top, topEvidence[1] || top.directEvidence, "directRelatedEvidence", "最强证据");
    addCard(top, topEvidence[2] || top.structureDriver || top.actionEvidence, "nextLayerConstraint", "下一步验证");
    for (var i = 1; cards.length < 3 && i < issues.length; i += 1) {
      addCard(issues[i], firstEvidence(issues[i]), "fallbackIssue", "补充判断");
    }
    return cards.slice(0, 3).map(function (card, index) {
      return Object.assign({}, card, { rank: index + 1 });
    });
  }

  function buildConclusionPageModel(pack, issues) {
    var top = issues[0] || null;
    var cards = buildConclusionCards(pack, issues);
    var headline = top && !textHasGenericLanguage(top.conclusion)
      ? ((pack.targetBank && pack.targetBank.name) || "目标银行") + " " + (pack.year || "") + " 年主判断：" + top.conclusion
      : "请先完成数据对标并生成证据包";
    return {
      headline: headline,
      topIssues: cards,
      kpis: cards.map(function (card) {
        return {
          label: card.metric || card.title,
          value: card.evidenceText || "待确认",
          peer: "当前对标组",
          gap: card.metric || "—",
          trace: card.trace,
        };
      }).slice(0, 5),
      nextQuestion: cards[0] ? cards[0].nextQuestion : "进入证据地图复核",
    };
  }

  function firstByCategory(items, category) {
    return items.filter(function (item) { return item.category === category; })[0] || null;
  }

  function buildEvidenceMapPageModel(pack, issues) {
    var items = evidenceItemsFromIssues(issues);
    var hasFallback = items.some(function (item) { return item.categoryFallback; });
    var strength = scoreEvidenceStrength(items, pack);
    var categoryStatus = hasFallback
      ? { status: "partial-pack", message: "证据分类字段缺失，已按指标口径临时归类" }
      : { status: "confirmed", message: "证据分类字段已确认" };
    var peerPosition = firstByCategory(items, "peerPosition") || {};
    var anomalies = items.filter(function (item) { return item.category === "anomaly"; });
    var valuationAnchor = firstByCategory(items, "valuationAnchor") || {};
    return {
      headline: "证据地图",
      strength: strength,
      categoryStatus: categoryStatus,
      peerPosition: peerPosition,
      anomalies: anomalies,
      valuationAnchor: valuationAnchor,
      allEvidence: items,
      chainSummary: [peerPosition.metric, anomalies[0] && anomalies[0].metric, valuationAnchor.metric].filter(Boolean).join(" → "),
      counterEvidence: items
        .filter(function (item) { return item.signalDirection === "counter"; })
        .map(function (item) { return item.metric + " 方向与主判断不一致"; })
        .slice(0, 2),
    };
  }

  function buildReportCandidates(issue, pack) {
    if (!issue) return [];
    var trace = traceForEvidence(issue, firstEvidence(issue), "reportCandidates");
    if (!trace.length) return [];
    return [{
      id: "report_" + (issue.issueId || "issue") + "_headline",
      sourceIssueId: issue.issueId || "unknown",
      title: (issue.title || issue.issueName || "经营诊断") + "专题页",
      chartType: issue.chartType || "bridge",
      visualAsset: issue.visualAsset || null,
      evidenceSentence: issue.evidenceSentence || issue.conclusion || "",
      useScenario: issue.useScenario || "董事会汇报",
      recommendedAction: issue.recommendedAction || issue.action || chainSegment(issue, "action"),
      recommendedSlideLayout: issue.recommendedSlideLayout || "headline-evidence-chart",
      context: {
        targetBank: pack && pack.targetBank,
        peerGroup: pack && pack.peerGroup,
        year: pack && pack.year,
        issueId: issue.issueId,
      },
      trace: trace,
    }];
  }

  function topicScore(topic, index) {
    var evidence = firstEvidence(topic) || {};
    var score = strengthScore(evidence.strength || topic.confidence);
    if (buildReportCandidates(topic, {}).length) score += 0.4;
    return score * 100 - ((topic.priority || index + 1) * 2);
  }

  function rankAttributionTopics(issues) {
    var allTopics = issues.slice().sort(function (a, b) {
      return topicScore(b, 0) - topicScore(a, 0);
    }).map(function (issue, index) {
      return {
        issueId: issue.issueId,
        title: issue.title || issue.issueName || "专题",
        primaryMetric: issue.primaryMetric || "",
        strength: (firstEvidence(issue) && firstEvidence(issue).strength) || issue.confidence || "弱",
        priority: issue.priority || index + 1,
        hasReportCandidates: buildReportCandidates(issue, {}).length > 0,
        trace: traceForEvidence(issue, firstEvidence(issue), "attributionTopic"),
      };
    });
    return {
      allTopics: allTopics,
      visibleTopics: allTopics.slice(0, 3),
      foldedTopics: allTopics.slice(3),
    };
  }

  function buildAttributionPageModel(pack, issues) {
    var active = issues[0] || null;
    var ranked = rankAttributionTopics(issues);
    return {
      headline: active ? (active.title || "专题归因") : "专题归因",
      activeIssueId: active && active.issueId,
      visibleTopics: ranked.visibleTopics,
      allTopics: ranked.allTopics,
      foldedTopics: ranked.foldedTopics,
      chain: {
        result: active ? chainSegment(active, "result") : "待确认结果指标",
        directCause: active ? chainSegment(active, "directCause") : "待确认直接原因",
        structureCause: active ? chainSegment(active, "structureCause") : "待确认结构原因",
        action: active ? chainSegment(active, "action") : "待确认管理动作",
      },
      evidence: (active && Array.isArray(active.evidence) ? active.evidence : []).slice(0, 3).map(function (ev) {
        return {
          title: ev.metric || active.primaryMetric || "证据",
          text: "目标 " + (ev.targetValue || "—") + " / 对标 " + (ev.peerValue || "—") + " / 差距 " + (ev.gap || "—"),
          trace: traceForEvidence(active, ev, "attributionEvidence"),
        };
      }),
      reportCandidates: buildReportCandidates(active, pack),
      advancedCollapsed: true,
    };
  }

  function buildThreePageDiagnosisModel(pack) {
    pack = pack || readThreePageEvidencePack();
    if (!pack) {
      return {
        status: "missing-pack",
        context: { targetBank: {}, peerGroup: { banks: [] }, year: "", status: "missing-pack" },
        selectedIssues: [],
        conclusion: buildConclusionPageModel({ targetBank: {} }, []),
        evidenceMap: buildEvidenceMapPageModel({ status: "missing-pack" }, []),
        attribution: buildAttributionPageModel({ status: "missing-pack" }, []),
      };
    }
    var issues = selectedIssuesFromPack(pack);
    var status = normalizePackStatus(pack);
    var evidenceMap = buildEvidenceMapPageModel(pack, issues);
    if (status === "confirmed" && evidenceMap.categoryStatus && evidenceMap.categoryStatus.status === "partial-pack") {
      status = "partial-pack";
    }
    return {
      status: status,
      context: modelContext(pack, status),
      selectedIssues: issues,
      conclusion: buildConclusionPageModel(pack, issues),
      evidenceMap: evidenceMap,
      attribution: buildAttributionPageModel(pack, issues),
    };
  }

  window.readThreePageEvidencePack = readThreePageEvidencePack;
  window.buildThreePageDiagnosisModel = buildThreePageDiagnosisModel;
  window.__threePageDiagnosisModelInternals = {
    normalizePackStatus: normalizePackStatus,
    scoreEvidenceStrength: scoreEvidenceStrength,
    buildConclusionCards: buildConclusionCards,
    rankAttributionTopics: rankAttributionTopics,
    buildReportCandidates: buildReportCandidates,
  };
})();
