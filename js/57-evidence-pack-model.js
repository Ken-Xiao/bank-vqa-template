/* Bank VQA module: 57-evidence-pack-model.js
 * 证据包模型：从数据对标结果生成、确认、置为过期，并给后续页面提供统一输入。
 */
(function () {
  if (typeof window === "undefined") return;

  var STORAGE_KEY = "benchmarkiq.evidencePack";

  var METRIC_CONFIGS = [
    {
      key: "roe",
      metric: "ROE",
      title: "盈利能力承压",
      issueId: "profitability_pressure",
      directDriver: "NIM 与成本收入比",
      structureDriver: "负债成本、收入结构和费用刚性",
      action: "先复核息差与费用效率，再确定盈利修复抓手",
      higherIsBetter: true,
    },
    {
      key: "nim",
      metric: "NIM",
      title: "息差水平承压",
      issueId: "nim_pressure",
      directDriver: "生息资产收益率与计息负债成本",
      structureDriver: "定期化率、存款成本率和贷款收益率",
      action: "拆解负债结构与资产定价，定位息差修复空间",
      higherIsBetter: true,
    },
    {
      key: "costIncome",
      metric: "成本收入比",
      title: "成本效率压力",
      issueId: "cost_efficiency_pressure",
      directDriver: "营业收入增长和费用刚性",
      structureDriver: "网点、人力、科技投入与中收贡献",
      action: "复核费用投入产出与收入结构改善路径",
      higherIsBetter: false,
    },
    {
      key: "npl",
      metric: "不良率",
      title: "资产质量分化",
      issueId: "asset_quality_divergence",
      directDriver: "不良生成和风险确认节奏",
      structureDriver: "对公贷款结构、区域行业暴露和零售客群风险",
      action: "按贷款结构和区域风险重新排序资产质量专题",
      higherIsBetter: false,
    },
    {
      key: "pb",
      metric: "PB",
      title: "估值折价需要解释",
      issueId: "valuation_discount",
      directDriver: "ROE、资产质量和分红预期",
      structureDriver: "盈利可持续性、风险确认充分性和资本回报",
      action: "将估值折价回拆到盈利、风险和资本回报证据",
      higherIsBetter: true,
    },
  ];

  function safeAvg(rows, key) {
    if (typeof avg === "function") return avg(rows, key);
    var vals = (rows || [])
      .map(function (row) { return row && row[key]; })
      .filter(function (v) { return typeof v === "number" && !Number.isNaN(v); });
    return vals.length ? vals.reduce(function (a, b) { return a + b; }, 0) / vals.length : null;
  }

  function displayMetric(key, value) {
    if (typeof metricDisplayValue === "function") return metricDisplayValue(key, value);
    if (value == null || Number.isNaN(value)) return "—";
    if (key === "pb") return Number(value).toFixed(2) + "x";
    return Number(value).toFixed(2) + "%";
  }

  function gapText(key, targetValue, peerValue) {
    if (targetValue == null || peerValue == null) return "—";
    var gap = targetValue - peerValue;
    var sign = gap > 0 ? "+" : "";
    if (key === "pb") return sign + gap.toFixed(2) + "x";
    return sign + gap.toFixed(2) + "pct";
  }

  function evidenceStrength(absGapRatio) {
    if (absGapRatio >= 0.12) return "强";
    if (absGapRatio >= 0.06) return "中";
    return "弱";
  }

  function issueConclusion(config, targetValue, peerValue) {
    var direction = config.higherIsBetter
      ? (targetValue >= peerValue ? "优于同业" : "低于同业")
      : (targetValue <= peerValue ? "优于同业" : "高于同业");
    return config.metric + " " + direction + "，需要沿着" + config.directDriver + "继续拆解。";
  }

  function buildIssue(config, row, peers, index) {
    var targetValue = row ? row[config.key] : null;
    var peerValue = safeAvg(peers, config.key);
    if (targetValue == null || peerValue == null || Number.isNaN(targetValue) || Number.isNaN(peerValue)) return null;
    var gap = targetValue - peerValue;
    var absRatio = peerValue ? Math.abs(gap / peerValue) : 0;
    var direction = gap >= 0 ? "高于同业" : "低于同业";
    var strength = evidenceStrength(absRatio);
    return {
      issueId: config.issueId,
      title: config.title,
      priority: index + 1,
      confidence: strength === "强" ? "高" : (strength === "中" ? "中" : "低"),
      primaryMetric: config.metric,
      conclusion: issueConclusion(config, targetValue, peerValue),
      evidence: [{
        evidenceId: "ev_" + config.key + "_gap",
        metric: config.metric,
        targetValue: displayMetric(config.key, targetValue),
        peerValue: displayMetric(config.key, peerValue),
        gap: gapText(config.key, targetValue, peerValue),
        direction: direction,
        strength: strength,
        source: (state && state.year ? state.year : "当前") + " 年末数据对标",
      }],
      causalChain: [
        config.metric + "与对标组形成差距",
        "直接原因指向" + config.directDriver,
        "结构原因需要复核" + config.structureDriver,
        "行动抓手是" + config.action,
      ],
      action: config.action,
      reportUse: ["结论摘要", "证据地图", "专题归因"],
    };
  }

  function packVersion() {
    var d = new Date();
    function pad(n) { return n < 10 ? "0" + n : String(n); }
    return String(d.getFullYear()) + pad(d.getMonth() + 1) + pad(d.getDate()) + "-" + pad(d.getHours()) + pad(d.getMinutes());
  }

  function readEvidencePack() {
    try {
      var raw = localStorage.getItem(STORAGE_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch (e) {
      return window.__benchmarkEvidencePack || null;
    }
  }

  function saveEvidencePack(pack) {
    window.__benchmarkEvidencePack = pack || null;
    try {
      if (pack) localStorage.setItem(STORAGE_KEY, JSON.stringify(pack));
      else localStorage.removeItem(STORAGE_KEY);
    } catch (e) { /* silent */ }
    return pack;
  }

  function buildRecommendedEvidencePack() {
    var row = typeof targetRecord === "function" ? targetRecord() : null;
    var peers = typeof peerRecords === "function" ? peerRecords() : [];
    var issues = METRIC_CONFIGS
      .map(function (config, index) { return buildIssue(config, row, peers, index); })
      .filter(Boolean)
      .sort(function (a, b) {
        var sa = a.evidence[0].strength === "强" ? 3 : (a.evidence[0].strength === "中" ? 2 : 1);
        var sb = b.evidence[0].strength === "强" ? 3 : (b.evidence[0].strength === "中" ? 2 : 1);
        return sb - sa || a.priority - b.priority;
      })
      .slice(0, 5)
      .map(function (issue, index) { issue.priority = index + 1; return issue; });
    var pack = {
      version: packVersion(),
      status: "draft",
      targetBank: {
        id: row && row.bank ? row.bank : (state && state.target) || "",
        name: row && row.bank ? row.bank : (state && state.target) || "",
        type: row && row.type ? row.type : "",
        region: row && row.region ? row.region : "",
      },
      year: state && state.year ? state.year : "",
      peerGroup: {
        label: "当前对标组",
        banks: state && Array.isArray(state.peers) ? state.peers.slice() : [],
        peerBasis: ["当前选择"],
      },
      recommendedIssues: issues,
      selectedIssues: issues.slice(0, 3).map(function (issue) { return issue.issueId; }),
      excludedIssues: [],
      narrativeGuardrails: {
        mustCiteEvidence: true,
        avoidGenericLanguage: true,
        maxPrimaryIssues: 3,
      },
      updatedAt: new Date().toISOString(),
    };
    return saveEvidencePack(pack);
  }

  function confirmEvidencePack(pack, selectedIssues) {
    var next = Object.assign({}, pack || readEvidencePack() || buildRecommendedEvidencePack());
    next.status = "confirmed";
    next.selectedIssues = Array.isArray(selectedIssues) && selectedIssues.length
      ? selectedIssues.slice()
      : (next.selectedIssues || []).slice(0, 3);
    next.excludedIssues = (next.recommendedIssues || [])
      .map(function (issue) { return issue.issueId; })
      .filter(function (id) { return next.selectedIssues.indexOf(id) < 0; });
    next.confirmedAt = new Date().toISOString();
    next.updatedAt = next.confirmedAt;
    return saveEvidencePack(next);
  }

  function markEvidencePackStale(reason) {
    var pack = readEvidencePack();
    if (!pack) return null;
    var next = Object.assign({}, pack, {
      status: "stale",
      staleReason: reason || "context-change",
      updatedAt: new Date().toISOString(),
    });
    return saveEvidencePack(next);
  }

  function selectedIssueObjects(pack) {
    if (!pack || pack.status !== "confirmed") return [];
    var selected = pack.selectedIssues || [];
    return (pack.recommendedIssues || [])
      .filter(function (issue) { return selected.indexOf(issue.issueId) >= 0; })
      .sort(function (a, b) { return (a.priority || 99) - (b.priority || 99); });
  }

  function evidencePackAnswerModel(pack) {
    var issues = selectedIssueObjects(pack);
    return {
      empty: !issues.length,
      version: pack && pack.version,
      targetBank: pack && pack.targetBank,
      year: pack && pack.year,
      peerGroup: pack && pack.peerGroup,
      summary: issues.length
        ? "本轮最需要管理层优先处理的是" + issues.slice(0, 3).map(function (issue) { return issue.primaryMetric; }).join("、") + "对应的问题。"
        : "请先在数据对标页确认证据包。",
      issues: issues.slice(0, 3),
    };
  }

  function evidencePackMapModel(pack) {
    var rows = [];
    selectedIssueObjects(pack).forEach(function (issue) {
      (issue.evidence || []).forEach(function (ev) {
        rows.push(Object.assign({}, ev, {
          issueId: issue.issueId,
          issueTitle: issue.title,
          supports: issue.conclusion,
        }));
      });
    });
    return {
      empty: !rows.length,
      version: pack && pack.version,
      rows: rows,
    };
  }

  function evidencePackTopicModel(pack) {
    var topics = selectedIssueObjects(pack).map(function (issue) {
      return {
        issueId: issue.issueId,
        title: issue.title,
        primaryMetric: issue.primaryMetric,
        conclusion: issue.conclusion,
        causalChain: issue.causalChain || [],
        action: issue.action || "",
        evidenceIds: (issue.evidence || []).map(function (ev) { return ev.evidenceId; }),
      };
    });
    return {
      empty: !topics.length,
      version: pack && pack.version,
      topics: topics,
    };
  }

  function readinessForIssue(issue) {
    var evidence = issue && Array.isArray(issue.evidence) ? issue.evidence : [];
    var strongCount = evidence.filter(function (ev) { return ev.strength === "强"; }).length;
    var mediumCount = evidence.filter(function (ev) { return ev.strength === "中"; }).length;
    var chainDepth = Array.isArray(issue && issue.causalChain) ? issue.causalChain.length : 0;
    if (strongCount >= 1 && evidence.length >= 2 && chainDepth >= 3) return "ready";
    if (strongCount + mediumCount >= 1 && evidence.length >= 1 && chainDepth >= 2) return "review";
    return "appendix";
  }

  function severityForIssue(issue) {
    var readiness = readinessForIssue(issue);
    if (issue && issue.confidence === "高" && readiness === "ready") return "high";
    if ((issue && issue.confidence === "中") || readiness === "review") return "medium";
    return "low";
  }

  function metricGapForIssue(issue) {
    var ev = issue && issue.evidence && issue.evidence[0];
    return ev && ev.gap ? ev.gap : "差距待补";
  }

  function judgmentFromIssue(issue, index) {
    var evidence = Array.isArray(issue && issue.evidence) ? issue.evidence : [];
    return {
      id: issue.issueId || ("judgment_" + (index + 1)),
      title: issue.title || "管理层判断",
      conclusion: issue.conclusion || "该判断需要补充证据后进入报告。",
      severity: severityForIssue(issue),
      primaryMetric: issue.primaryMetric || (evidence[0] && evidence[0].metric) || "核心指标",
      metricGap: metricGapForIssue(issue),
      causeChain: (issue.causalChain || []).slice(0, 4),
      evidenceRefs: evidence.map(function (ev) { return ev.evidenceId; }).filter(Boolean),
      recommendedAction: issue.action || "补充指标口径后再形成管理动作。",
      reportReadiness: readinessForIssue(issue),
      visualAsset: issue.visualAsset || null,
      domainKey: issue.domainKey || "",
      sourceIssueId: issue.issueId || "",
      priority: index + 1,
    };
  }

  function evidenceRowsForJudgment(judgment, issue) {
    return (issue.evidence || []).map(function (ev) {
      return {
        judgmentId: judgment.id,
        evidenceId: ev.evidenceId || "",
        evidenceType: "metric-gap",
        metricKey: ev.metric || judgment.primaryMetric,
        chartType: (issue.chartTypes && issue.chartTypes[0]) || "diagnostic-card",
        dataQuality: ev.strength || "待复核",
        reportReadiness: judgment.reportReadiness,
        gap: ev.gap || "",
        targetValue: ev.targetValue || "",
        peerValue: ev.peerValue || "",
        direction: ev.direction || "",
        supports: judgment.conclusion,
      };
    });
  }

  function topicChainFromJudgment(judgment) {
    return {
      id: "topic_" + judgment.id,
      sourceJudgmentId: judgment.id,
      title: judgment.title,
      priority: judgment.priority,
      nodes: judgment.causeChain.slice(0, 4),
      action: judgment.recommendedAction,
      evidenceRefs: judgment.evidenceRefs.slice(0, 4),
      reportReadiness: judgment.reportReadiness,
      visualAsset: judgment.visualAsset || null,
      pages: [
        { pageRole: "problem", title: judgment.title, mainPoint: judgment.conclusion },
        { pageRole: "direct-cause", title: "直接原因", mainPoint: judgment.causeChain[1] || judgment.conclusion },
        { pageRole: "deep-cause", title: "深层原因", mainPoint: judgment.causeChain[2] || judgment.causeChain[1] || judgment.conclusion },
        { pageRole: "management-action", title: "管理动作", mainPoint: judgment.recommendedAction },
      ].filter(function (page) { return !!page.mainPoint; }),
    };
  }

  function candidatePagesFromJudgment(judgment) {
    var pages = [{
      id: "candidate_" + judgment.id + "_judgment",
      sourceType: "judgment",
      sourceId: judgment.id,
      title: judgment.title,
      pageRole: "executive-judgment",
      status: judgment.reportReadiness,
      selected: judgment.reportReadiness === "ready",
    }];
    if (judgment.causeChain.length >= 3) {
      pages.push({
        id: "candidate_" + judgment.id + "_action",
        sourceType: "topic-chain",
        sourceId: "topic_" + judgment.id,
        title: judgment.title + "：原因链与管理动作",
        pageRole: "management-action",
        status: judgment.reportReadiness,
        selected: judgment.reportReadiness === "ready",
      });
    }
    return pages;
  }

  function buildManagementDiagnosisPack(pack) {
    pack = pack || readEvidencePack();
    var issues = selectedIssueObjects(pack).slice(0, 3);
    var judgments = issues.map(judgmentFromIssue);
    var evidenceMap = [];
    judgments.forEach(function (judgment) {
      var issue = issues.filter(function (item) { return item.issueId === judgment.sourceIssueId; })[0] || {};
      evidenceMap = evidenceMap.concat(evidenceRowsForJudgment(judgment, issue));
    });
    var topicChains = judgments
      .filter(function (judgment) { return judgment.causeChain.length >= 2 && judgment.reportReadiness !== "appendix"; })
      .slice(0, 3)
      .map(topicChainFromJudgment);
    var candidatePages = [];
    judgments.forEach(function (judgment) {
      candidatePages = candidatePages.concat(candidatePagesFromJudgment(judgment));
    });
    var role = "管理层诊断";
    if (typeof state !== "undefined" && state && state.role) role = state.role;
    return {
      version: (pack && pack.version) || packVersion(),
      sourcePackStatus: (pack && pack.status) || "empty",
      context: {
        targetBank: (pack && pack.targetBank) || {},
        peerBanks: (pack && pack.peerGroup && pack.peerGroup.banks) || [],
        year: (pack && pack.year) || "",
        role: role,
      },
      executiveAnswer: {
        headline: ((pack && pack.targetBank && pack.targetBank.name) || "目标银行") + "本轮管理层诊断聚焦" + (judgments.map(function (j) { return j.primaryMetric; }).join("、") || "核心指标"),
        totalVerdict: judgments.length ? "本轮优先围绕" + judgments.map(function (j) { return j.title; }).join("、") + "形成报告主线。" : "请先在数据对标页生成证据包。",
        priorityJudgments: judgments.map(function (j) { return j.id; }),
      },
      judgments: judgments,
      evidenceMap: evidenceMap,
      topicChains: topicChains,
      candidatePages: candidatePages.slice(0, 12),
      updatedAt: new Date().toISOString(),
    };
  }

  window.buildRecommendedEvidencePack = buildRecommendedEvidencePack;
  window.buildManagementDiagnosisPack = buildManagementDiagnosisPack;
  window.confirmEvidencePack = confirmEvidencePack;
  window.readEvidencePack = readEvidencePack;
  window.saveEvidencePack = saveEvidencePack;
  window.markEvidencePackStale = markEvidencePackStale;
  window.evidencePackAnswerModel = evidencePackAnswerModel;
  window.evidencePackMapModel = evidencePackMapModel;
  window.evidencePackTopicModel = evidencePackTopicModel;
})();
