/* Bank VQA module: 65-storyline-fact-pack-model.js
 * 故事线事实包模型：把 evidence pack / storylines 统一成后续报告页可消费的数据契约。
 */
(function () {
  "use strict";

  if (typeof window === "undefined") return;

  var STORAGE_KEY = "benchmarkiq.storylineFactPack";

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

  function firstValue() {
    for (var i = 0; i < arguments.length; i += 1) {
      if (arguments[i] !== undefined && arguments[i] !== null && arguments[i] !== "") return arguments[i];
    }
    return null;
  }

  function clonePlain(value) {
    if (value == null) return value;
    try {
      return JSON.parse(JSON.stringify(value));
    } catch (e) {
      return value;
    }
  }

  function storage() {
    return window.localStorage || (typeof localStorage !== "undefined" ? localStorage : null);
  }

  function storageStatus(status) {
    if (status === "confirmed") return "confirmed";
    if (status === "stale") return "stale";
    if (status === "error") return "error";
    return "partial";
  }

  function normalizePeerGroup(peerGroup) {
    var peers = Array.isArray(peerGroup) ? peerGroup : asArray(peerGroup && peerGroup.banks);
    return peers.map(function (peer) {
      return typeof peer === "string" ? { name: peer } : clonePlain(peer);
    }).filter(Boolean);
  }

  function normalizeContext(sourcePack) {
    sourcePack = sourcePack || {};
    return {
      targetBank: clonePlain(firstValue(sourcePack.targetBank, sourcePack.bank, sourcePack.target, {})),
      peerGroup: normalizePeerGroup(sourcePack.peerGroup),
      year: firstValue(sourcePack.year, sourcePack.reportYear, sourcePack.selectedYear, "")
    };
  }

  function issueIdentifier(issue, index) {
    return firstText(
      issue && issue.storylineId,
      issue && issue.issueId,
      issue && issue.storyId,
      issue && issue.id,
      issue && issue.key,
      "storyline_" + (index + 1)
    );
  }

  function issueDedupeId(issue) {
    return firstText(
      issue && issue.storylineId,
      issue && issue.issueId,
      issue && issue.storyId,
      issue && issue.id,
      issue && issue.key
    );
  }

  function issueTitle(issue, fallbackId) {
    return firstText(issue && issue.title, issue && issue.issueName, issue && issue.name, fallbackId);
  }

  function evidenceForIssue(issue) {
    if (Array.isArray(issue && issue.evidence) && issue.evidence.length) return issue.evidence;
    if (Array.isArray(issue && issue.facts) && issue.facts.length) return issue.facts;
    return [];
  }

  function normalizeTrace(item, issue, metric) {
    if (Array.isArray(item && item.trace) && item.trace.length) return clonePlain(item.trace);
    return [{
      field: "issue.evidence",
      source: firstText(item && item.source, issue && issue.source, "evidencePack"),
      value: firstText(metric, item && item.gap, issue && issueTitle(issue, "故事线"))
    }];
  }

  function buildFacts(issue, storylineId) {
    return evidenceForIssue(issue).map(function (item, index) {
      item = item || {};
      var metric = firstText(item.metric, item.primaryMetric, issue && issue.primaryMetric, issue && issue.metric, issueTitle(issue, storylineId));
      var factId = firstText(item.factId, item.evidenceId, storylineId + "_fact_" + (index + 1));
      return {
        factId: factId,
        category: firstText(item.category, issue && issue.category, ""),
        metric: metric,
        targetValue: firstText(item.targetValue, item.target, item.value, ""),
        peerValue: firstText(item.peerValue, item.peer, item.benchmark, ""),
        gap: firstText(item.gap, item.delta, item.diff, ""),
        signalDirection: firstText(item.signalDirection, item.directionType, item.direction, "support"),
        strength: firstText(item.strength, issue && issue.evidenceStrength, issue && issue.confidence, ""),
        source: firstText(item.source, issue && issue.source, "当前数据对标事实包"),
        trace: normalizeTrace(item, issue, metric)
      };
    });
  }

  function factSummary(fact) {
    if (!fact) return "";
    var parts = [];
    if (fact.metric) parts.push(fact.metric);
    if (fact.targetValue || fact.peerValue) parts.push("目标 " + (fact.targetValue || "待补") + " / 对标 " + (fact.peerValue || "待补"));
    if (fact.gap) parts.push("差距 " + fact.gap);
    return parts.join("，");
  }

  function buildReadingGuide(issue, facts, chart) {
    var primaryFact = facts[0] || {};
    var metric = firstText(primaryFact.metric, issue && issue.primaryMetric, issue && issue.metric, issueTitle(issue, "核心指标"));
    var gap = firstText(primaryFact.gap, "差距待补");
    var source = firstText(
      chart && chart.readingGuide && chart.readingGuide.source,
      chart && chart.source,
      primaryFact.source,
      "当前数据对标事实包"
    );
    return {
      whatToSee: firstText(
        chart && chart.readingGuide && chart.readingGuide.whatToSee,
        issue && issue.readingGuide && issue.readingGuide.whatToSee,
        "先看" + metric + "的目标行与对标组差距，再看该差距是否支撑故事线判断。"
      ),
      keyGap: firstText(
        chart && chart.readingGuide && chart.readingGuide.keyGap,
        issue && issue.readingGuide && issue.readingGuide.keyGap,
        metric + "核心差距：" + gap
      ),
      supports: firstText(
        chart && chart.readingGuide && chart.readingGuide.supports,
        issue && issue.readingGuide && issue.readingGuide.supports,
        issue && issue.conclusion,
        issueTitle(issue, "故事线判断")
      ),
      reportUse: firstText(
        chart && chart.readingGuide && chart.readingGuide.reportUse,
        issue && issue.readingGuide && issue.readingGuide.reportUse,
        issue && issue.reportUse && issue.reportUse[0],
        "适合放入专题归因页或证据地图页，作为报告主图。"
      ),
      source: source
    };
  }

  function normalizeChart(issue, facts, storylineId, chart, index) {
    chart = chart || {};
    var chartId = firstText(chart.chartId, chart.id, issue && issue.chartId, storylineId + "_chart_" + (index + 1));
    var sourceFactIds = asArray(chart.sourceFactIds).length
      ? asArray(chart.sourceFactIds).slice()
      : facts.slice(0, 2).map(function (fact) { return fact.factId; });
    return {
      chartId: chartId,
      title: firstText(chart.title, issue && issue.chartTitle, issueTitle(issue, "故事线证据图")),
      src: firstText(chart.src, issue && issue.chartSrc, issue && issue.visualAsset && issue.visualAsset.src, ""),
      enlargedSrc: firstText(chart.enlargedSrc, chart.src, issue && issue.enlargedSrc, issue && issue.chartSrc, issue && issue.visualAsset && issue.visualAsset.src, ""),
      readingGuide: buildReadingGuide(issue, facts, chart),
      sourceFactIds: sourceFactIds
    };
  }

  function buildCharts(issue, facts, storylineId) {
    var charts = asArray(issue && issue.charts);
    if (!charts.length && issue && issue.visualAsset) charts = [issue.visualAsset];
    if (!charts.length) charts = [{}];
    return charts.map(function (chart, index) {
      return normalizeChart(issue, facts, storylineId, chart, index);
    });
  }

  function causalChainSource(issue) {
    return issue && issue.causalChain ? issue.causalChain : {};
  }

  function causalAt(chain, index) {
    return Array.isArray(chain) ? chain[index] : "";
  }

  function buildCausalChain(issue) {
    var chain = causalChainSource(issue);
    return {
      resultMetric: firstText(issue && issue.primaryMetric, chain && chain.resultMetric, causalAt(chain, 0), "待确认结果指标"),
      directCause: firstText(chain && chain.directCause, issue && issue.directDriver, causalAt(chain, 1), "待确认直接原因"),
      structureCause: firstText(chain && chain.structureCause, issue && issue.structureDriver, causalAt(chain, 2), "待确认结构原因"),
      recommendedAction: firstText(issue && issue.recommendedAction, issue && issue.action, chain && chain.recommendedAction, causalAt(chain, 3), "待确认管理动作")
    };
  }

  function issueIsPartial(facts, charts) {
    if (!facts.length) return true;
    if (!charts.length) return true;
    return facts.some(function (fact) {
      return !fact.category || !fact.metric || !fact.gap;
    }) || charts.some(function (chart) {
      var guide = chart.readingGuide || {};
      return !guide.whatToSee || !guide.keyGap || !guide.supports || !guide.reportUse || !guide.source;
    });
  }

  function evidenceSentence(issue, facts) {
    return firstText(
      issue && issue.evidenceSentence,
      issue && issue.conclusion,
      factSummary(facts[0]),
      issueTitle(issue, "该故事线") + "需要补充证据句。"
    );
  }

  function normalizeCandidate(candidate, issue, facts, charts, storylineId, context, status, index) {
    candidate = candidate || {};
    var sourceFactIds = asArray(candidate.sourceFactIds).length
      ? asArray(candidate.sourceFactIds).slice()
      : facts.slice(0, 3).map(function (fact) { return fact.factId; });
    var chartIds = asArray(candidate.chartIds).length
      ? asArray(candidate.chartIds).slice()
      : charts.slice(0, 2).map(function (chart) { return chart.chartId; });
    var readingGuideId = firstText(candidate.readingGuideId, chartIds[0], "");
    return {
      pageId: firstText(candidate.pageId, candidate.id, "report_" + storylineId + "_" + (index + 1)),
      title: firstText(candidate.title, issueTitle(issue, storylineId) + "专题页"),
      layout: firstText(candidate.layout, candidate.pageType, "causal-chain-with-chart"),
      sourceFactIds: sourceFactIds,
      chartIds: chartIds,
      evidenceSentence: firstText(candidate.evidenceSentence, evidenceSentence(issue, facts)),
      readingGuideId: readingGuideId,
      recommendedSlideLayout: firstText(candidate.recommendedSlideLayout, issue && issue.recommendedSlideLayout, "headline-evidence-chart"),
      useScenario: firstText(candidate.useScenario, issue && issue.useScenario, "经营管理层专题复盘"),
      status: firstText(candidate.status, status),
      context: Object.assign({}, clonePlain(context), { storylineId: storylineId })
    };
  }

  function buildReportCandidates(issue, facts, charts, storylineId, context, status) {
    var candidates = asArray(issue && issue.reportCandidates);
    if (!candidates.length) candidates = [{}];
    return candidates.map(function (candidate, index) {
      return normalizeCandidate(candidate, issue, facts, charts, storylineId, context, status, index);
    });
  }

  function selectedIdsFrom(sourcePack, options) {
    var explicit = asArray(options && options.selectedStorylineIds).map(String).filter(Boolean);
    if (explicit.length) return explicit;
    return asArray(sourcePack && sourcePack.selectedStorylineIds)
      .concat(asArray(sourcePack && sourcePack.selectedIssues))
      .map(String)
      .filter(Boolean);
  }

  function collectIssues(sourcePack) {
    var seen = {};
    return asArray(sourcePack && sourcePack.recommendedIssues)
      .concat(asArray(sourcePack && sourcePack.storylines))
      .filter(function (issue) {
        var dedupeId = issueDedupeId(issue);
        if (!dedupeId) return true;
        if (seen[dedupeId]) return false;
        seen[dedupeId] = true;
        return true;
      });
  }

  function normalizeStoryline(issue, index, selectedMap, context) {
    var storylineId = issueIdentifier(issue, index);
    var facts = buildFacts(issue, storylineId);
    var charts = buildCharts(issue, facts, storylineId);
    var status = issueIsPartial(facts, charts) ? "partial" : "confirmed";
    return {
      storylineId: storylineId,
      title: issueTitle(issue, storylineId),
      priority: firstValue(issue && issue.priority, index + 1),
      selected: !!selectedMap[storylineId],
      conclusion: firstText(issue && issue.conclusion, issue && issue.lead, issueTitle(issue, storylineId)),
      evidenceStrength: firstText(issue && issue.evidenceStrength, issue && issue.confidence, facts[0] && facts[0].strength, status === "confirmed" ? "强" : "待补"),
      roleFit: asArray(issue && issue.roleFit).length ? asArray(issue.roleFit).slice() : asArray(issue && issue.reportUse),
      sourceIssueId: firstText(issue && issue.sourceIssueId, issue && issue.issueId, storylineId),
      status: status,
      facts: facts,
      charts: charts,
      causalChain: buildCausalChain(issue),
      reportCandidates: buildReportCandidates(issue, facts, charts, storylineId, context, status)
    };
  }

  function buildStorylineFactPack(sourcePack, options) {
    sourcePack = sourcePack || {};
    var context = normalizeContext(sourcePack);
    var selectedStorylineIds = selectedIdsFrom(sourcePack, options);
    var selectedMap = {};
    selectedStorylineIds.forEach(function (id) { selectedMap[id] = true; });
    var storylines = collectIssues(sourcePack).map(function (issue, index) {
      return normalizeStoryline(issue || {}, index, selectedMap, context);
    });
    var status = storageStatus(sourcePack.status);
    if (status === "confirmed" && !storylines.length) status = "partial";
    return {
      version: "storyline-fact-pack-v1",
      status: status,
      context: context,
      selectedStorylineIds: selectedStorylineIds,
      storylines: storylines
    };
  }

  function saveStorylineFactPack(pack) {
    window.__storylineFactPack = pack || null;
    var store = storage();
    try {
      if (store) {
        if (pack) store.setItem(STORAGE_KEY, JSON.stringify(pack));
        else store.removeItem(STORAGE_KEY);
      }
    } catch (e) {
      return pack;
    }
    return pack;
  }

  function readStorylineFactPack() {
    var store = storage();
    try {
      var raw = store && store.getItem(STORAGE_KEY);
      if (raw) {
        window.__storylineFactPack = JSON.parse(raw);
        return window.__storylineFactPack;
      }
      return window.__storylineFactPack || null;
    } catch (e) {
      return { version: "storyline-fact-pack-v1", status: "error", context: {}, selectedStorylineIds: [], storylines: [], error: String(e && e.message || e) };
    }
  }

  window.buildStorylineFactPack = buildStorylineFactPack;
  window.saveStorylineFactPack = saveStorylineFactPack;
  window.readStorylineFactPack = readStorylineFactPack;
})();
