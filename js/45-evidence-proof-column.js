/* Bank VQA module: 45-evidence-proof-column.js
 * Huashu Sprint H3：证据地图 proof column 改版
 *
 * 把 evidence 页从「3 个等权卡片」改为「纵向 3 段 proof column」：
 *   1. 同业位置：本行在 peer 中的位置 + 2 证据 + 核验 + 跳转
 *   2. 异动偏离：变化 → 归因 → 影响 一行证据链
 *   3. 估值锚：PB 是否反映经营质量折价 + 2 证据 + 核验 + 跳转
 *
 * 每段固定 4 个元素：
 *   - 核心结论（一句话）
 *   - 2 个证据指标
 *   - 核验状态（可上会/审慎/附录/待补）
 *   - 跳转关系（跳到 topics 页的哪个专题）
 *
 * 复用现有能力：
 *   - unifyTopChangesAndDeviations 提供异动归因 Top
 *   - valueCreationChainPanel 提供 PB/EP 链路
 *   - csVerification / pageHeaderVerificationStatus 提供核验状态
 *   - PORTAL_PAGE_SUB 提供跳转
 */

// ============ 工具：找到一个 peer 排名 + 核验状态 ============

function proofPeerRank(row, peers, key, lowerBetter) {
  if (!row || typeof row[key] !== "number") return null;
  var vals = (peers || []).map(function (p) { return p && p[key]; })
    .filter(function (v) { return typeof v === "number" && isFinite(v); });
  if (!vals.length) return null;
  var all = vals.concat([row[key]]);
  all.sort(function (a, b) { return lowerBetter ? a - b : b - a; });
  var rank = all.indexOf(row[key]) + 1;
  var total = all.length;
  var quartile = Math.ceil((rank / total) * 4);
  return {
    rank: rank,
    total: total,
    quartile: quartile,
    quartileLabel: quartile === 1 ? "前 25%" : (quartile === 2 ? "前 50%" : (quartile === 3 ? "后 50%" : "后 25%")),
    median: vals.sort(function (a, b) { return a - b; })[Math.floor(vals.length / 2)],
  };
}

function proofSegmentStatus(verifications) {
  // 综合多个 verification → 段级状态
  var primary = 0, supplement = 0, validated = 0;
  (verifications || []).forEach(function (v) {
    if (!v) return;
    if (v.status === "validation" || v.status === "validated") validated++;
    else if (v.status === "supplement" || v.status === "ok") supplement++;
    else if (v.status === "primary") primary++;
  });
  var total = primary + supplement + validated;
  if (total === 0) return { tier: "待补", tone: "red", label: "证据待补" };
  if (validated >= 2) return { tier: "可上会", tone: "green", label: "已核验 " + validated + " 项" };
  if (validated >= 1 && supplement >= 1) return { tier: "审慎表述", tone: "amber", label: "部分核验" };
  if (supplement >= 1) return { tier: "审慎表述", tone: "amber", label: "Tushare 补充" };
  return { tier: "附录披露", tone: "orange", label: "主表单源" };
}

// ============ Segment 1: 同业位置 ============

function peerPositionSegment(row, peers) {
  if (!row) return null;
  // 用 ROE + ROA 作为同业位置的两个核心证据
  var roeRank = proofPeerRank(row, peers, "roe", false);
  var roaRank = proofPeerRank(row, peers, "roa", false);

  var conclusion;
  if (!roeRank && !roaRank) {
    conclusion = "同业排名缺数据，ROE/ROA 字段先确认填充。";
  } else {
    var lead = roeRank || roaRank;
    var rankText = lead.rank + " / " + lead.total + "（" + lead.quartileLabel + "）";
    if (lead.quartile === 1) {
      conclusion = "本行 ROE/ROA 排名 " + rankText + "，同业头部，估值溢价的支点。";
    } else if (lead.quartile === 2) {
      conclusion = "本行排名 " + rankText + "，中位偏上，与头部仍有差距。";
    } else if (lead.quartile === 3) {
      conclusion = "本行排名 " + rankText + "，中位偏下，结构性原因待拆解。";
    } else {
      conclusion = "本行排名 " + rankText + "，明显落后同业，进董事会专项议题。";
    }
  }

  var evidence = [];
  if (roeRank) {
    evidence.push({
      label: "ROE 排名",
      value: roeRank.rank + " / " + roeRank.total + " 家",
      delta: typeof row.roe === "number" ? (row.roe > roeRank.median ? "高于中位 " + (row.roe - roeRank.median).toFixed(2) + "pp" : "低于中位 " + (roeRank.median - row.roe).toFixed(2) + "pp") : "—",
      verification: typeof csVerification === "function" ? csVerification("roe") : null,
    });
  }
  if (roaRank) {
    evidence.push({
      label: "ROA 排名",
      value: roaRank.rank + " / " + roaRank.total + " 家",
      delta: typeof row.roa === "number" ? (row.roa > roaRank.median ? "高于中位 " + (row.roa - roaRank.median).toFixed(2) + "pp" : "低于中位 " + (roaRank.median - row.roa).toFixed(2) + "pp") : "—",
      verification: typeof csVerification === "function" ? csVerification("roa") : null,
    });
  }

  var status = proofSegmentStatus(evidence.map(function (e) { return e.verification; }));

  return {
    segmentId: "peer-position",
    title: "同业位置",
    question: "本行在同业里到底排第几？",
    conclusion: conclusion,
    evidence: evidence,
    status: status,
    jumpTo: { page: "topics", anchor: "quality", label: "进入价值创造专题" },
  };
}

// ============ Segment 2: 异动偏离（变化 → 归因 → 影响） ============

function topDeviationSegment(row, peers) {
  if (!row) return null;
  if (typeof unifyTopChangesAndDeviations !== "function") {
    return {
      segmentId: "top-deviation",
      title: "异动偏离",
      question: "本期最值得关注的变化是什么？",
      conclusion: "异动引擎未加载，无法形成统一排序。",
      evidence: [],
      status: { tier: "待补", tone: "red", label: "异动引擎缺失" },
      jumpTo: { page: "topics", anchor: "mainChart", label: "进入专题深钻" },
    };
  }
  var unified = unifyTopChangesAndDeviations(row, peers, { topN: 2 });
  var top2 = unified && unified.topN ? unified.topN : [];

  var conclusion;
  if (top2.length === 0) {
    conclusion = "本期没有显著异动，本行同业位置和趋势贴近中位。";
  } else if (top2.length === 1) {
    conclusion = "本期 1 项显著异动：" + top2[0].label + "（" + top2[0].zDisplay + "），进专项解读。";
  } else {
    conclusion = "本期 2 项最值得关注：" + top2[0].label + "（" + top2[0].zDisplay + "）和 " + top2[1].label + "（" + top2[1].zDisplay + "），落到归因专题。";
  }

  // 「变化 → 归因 → 影响」 evidence chain
  var evidence = top2.map(function (it) {
    var changeText = it.label + " 当前 " + it.currentDisplay + "，同比 " + it.yoYDisplay + "，三年 " + it.threeYrDisplay + "";
    // 归因：用 z-score 判断结构性 vs 周期性
    var attribution;
    if (typeof it.zScore === "number" && Math.abs(it.zScore) > 1.5) {
      attribution = "结构性偏离（同业 " + it.zDisplay + "）";
    } else if (typeof it.threeYr === "number" && Math.abs(it.threeYr) > 1) {
      attribution = "三年纵向异动，累计变化大";
    } else {
      attribution = "短期扰动，先观察";
    }
    return {
      label: it.label,
      changeText: changeText,
      attribution: attribution,
      impact: it.managementImplication.slice(0, 50) + (it.managementImplication.length > 50 ? "…" : ""),
      verification: it.verification,
      priority: it.priority,
    };
  });

  var status = proofSegmentStatus(evidence.map(function (e) { return e.verification; }));

  return {
    segmentId: "top-deviation",
    title: "异动偏离",
    question: "本期最值得关注的变化是什么？",
    conclusion: conclusion,
    evidence: evidence,
    chainStyle: true, // 标记为「变化→归因→影响」证据链
    status: status,
    jumpTo: { page: "topics", anchor: "mainChart", label: "进入归因深钻" },
  };
}

// ============ Segment 3: PB 估值锚 ============

function valuationAnchorSegment(row, peers) {
  if (!row) return null;
  // 用 valueCreationChainPanel 拿 PB 错配方向
  var chain = typeof valueCreationChainPanel === "function" ? valueCreationChainPanel(row, peers) : null;

  var conclusion;
  if (!chain) {
    conclusion = "价值创造链未加载，PB 折价判断暂搁置。";
  } else if (typeof chain.pbGap !== "number") {
    conclusion = "理论 PB 估算缺 ROE 或资本成本数据。";
  } else if (chain.pbGap < -0.1) {
    conclusion = "市场 PB " + chain.marketPB + " 低于理论 " + chain.theoryPB + "，低估 " + Math.abs(chain.pbGap) + "，经营质量是折价解释。";
  } else if (chain.pbGap > 0.1) {
    conclusion = "市场 PB " + chain.marketPB + " 高于理论 " + chain.theoryPB + "，市场偏乐观 " + chain.pbGap + "，ROE 可持续性是溢价支撑。";
  } else {
    conclusion = "市场 PB " + chain.marketPB + " 贴近理论 " + chain.theoryPB + "，定价合理。";
  }

  var evidence = [
    {
      label: "市场 PB",
      value: typeof row.pb === "number" ? row.pb.toFixed(2) + "x" : "—",
      delta: chain && typeof chain.pbGap === "number" ? "差 " + (chain.pbGap >= 0 ? "+" : "") + chain.pbGap + "x" : "—",
      verification: typeof csVerification === "function" ? csVerification("pb") : null,
    },
    {
      label: "经济利润 EP",
      value: chain && typeof chain.ep === "number" ? (chain.ep >= 0 ? "+" : "") + chain.ep + "pp" : "—",
      delta: chain && typeof chain.epAmount === "number" ? (chain.epAmount / 10000).toFixed(1) + " 亿元" : "—",
      verification: { status: "derived", source: "ep-formula" },
    },
  ];

  var status = proofSegmentStatus([evidence[0].verification]);
  // EP 是 derived 不计入 status，但 PB 已经从 daily_basic 直接拉
  if (chain && typeof chain.pbGap === "number" && Math.abs(chain.pbGap) > 0.2) {
    // 强信号：升级到可上会
    if (status.tier === "审慎表述") status = { tier: "可上会", tone: "green", label: "强 PB 错配信号" };
  }

  return {
    segmentId: "valuation-anchor",
    title: "估值锚",
    question: "PB 是否反映经营质量折价？",
    conclusion: conclusion,
    evidence: evidence,
    status: status,
    jumpTo: { page: "topics", anchor: "valuation", label: "进入估值专题" },
  };
}

// ============ 渲染 ============

function evidenceProofColumnHTML(segments) {
  var segHtml = segments.map(function (seg) {
    if (!seg) return "";
    var evidenceHtml;
    if (seg.chainStyle) {
      // 「变化 → 归因 → 影响」一行证据链
      evidenceHtml = seg.evidence.map(function (e) {
        var verBadge = e.verification ? '<span class="proof-evidence-ver">' + (e.verification.status || "—") + '</span>' : "";
        return '<div class="proof-chain-row">' +
          '<div class="proof-chain-step"><em>变化</em><b>' + e.label + '</b><span>' + e.changeText + '</span></div>' +
          '<div class="proof-chain-arrow">→</div>' +
          '<div class="proof-chain-step"><em>归因</em><span>' + e.attribution + '</span></div>' +
          '<div class="proof-chain-arrow">→</div>' +
          '<div class="proof-chain-step"><em>影响</em><span>' + e.impact + '</span>' + verBadge + '</div>' +
          '</div>';
      }).join("");
    } else {
      // 普通 2 行证据 metric
      evidenceHtml = seg.evidence.map(function (e) {
        var verBadge = e.verification ? '<span class="proof-evidence-ver">' + (e.verification.status || "—") + '</span>' : "";
        return '<div class="proof-evidence-row">' +
          '<em>' + e.label + '</em>' +
          '<b>' + e.value + '</b>' +
          '<span class="proof-evidence-delta">' + e.delta + '</span>' +
          verBadge +
          '</div>';
      }).join("");
    }

    return '<div class="proof-segment" data-segment-id="' + seg.segmentId + '">' +
      '<header class="proof-segment-head">' +
        '<div class="proof-segment-title">' +
          '<em>' + seg.title + '</em>' +
          '<h3>' + seg.question + '</h3>' +
        '</div>' +
        '<div class="proof-status tone-' + seg.status.tone + '">' +
          '<b>' + seg.status.tier + '</b>' +
          '<span>' + seg.status.label + '</span>' +
        '</div>' +
      '</header>' +
      '<p class="proof-conclusion">' + seg.conclusion + '</p>' +
      '<div class="proof-evidence-stack ' + (seg.chainStyle ? "is-chain" : "is-metric") + '">' + evidenceHtml + '</div>' +
      '<div class="proof-jump">' +
        '<button type="button" data-page-link="' + seg.jumpTo.page + '" data-sub-anchor="' + seg.jumpTo.anchor + '">' + seg.jumpTo.label + ' →</button>' +
      '</div>' +
      '</div>';
  }).join("");

  return '<div class="evidence-proof-column">' +
    '<div class="evidence-proof-intro">' +
      '<strong>证据地图：纵向三段 proof column</strong>' +
      '<span>同业位置 → 异动偏离 → 估值锚，按董事会阅读顺序。每段固定四件事：结论、证据、核验、跳转。</span>' +
    '</div>' +
    segHtml +
    '</div>';
}

function renderEvidenceProofColumn() {
  if (typeof document === "undefined") return;
  var host = document.getElementById("evidenceProofColumnMount") ||
    document.querySelector("[data-evidence-proof-column-mount]");
  if (!host) return;
  if (typeof targetRecord !== "function" || typeof peerRecords !== "function") return;
  var row = targetRecord();
  var peers = peerRecords();
  if (!row) {
    host.innerHTML = '<div class="evidence-proof-empty">先确认目标银行和对标组，本页才出纵向三段 proof column。</div>';
    return;
  }
  try {
    var segments = [
      peerPositionSegment(row, peers),
      topDeviationSegment(row, peers),
      valuationAnchorSegment(row, peers),
    ];
    host.innerHTML = evidenceProofColumnHTML(segments);
  } catch (e) {
    if (typeof console !== "undefined") console.warn("[evidence-proof-column] render failed", e);
    host.innerHTML = '<div class="evidence-proof-empty">证据地图渲染失败，请刷新页面。</div>';
  }
}

function bindEvidenceProofRender() {
  var orig = typeof renderAll === "function" ? renderAll : null;
  if (orig && !orig.__evidenceProofWrapped) {
    renderAll = function renderAllWithEvidenceProof() {
      var r = orig.apply(this, arguments);
      try { renderEvidenceProofColumn(); } catch (e) {
        if (typeof console !== "undefined") console.warn("[evidence-proof] mount failed", e);
      }
      return r;
    };
    renderAll.__evidenceProofWrapped = true;
  }
}

if (typeof window !== "undefined") {
  window.peerPositionSegment = peerPositionSegment;
  window.topDeviationSegment = topDeviationSegment;
  window.valuationAnchorSegment = valuationAnchorSegment;
  window.evidenceProofColumnHTML = evidenceProofColumnHTML;
  window.renderEvidenceProofColumn = renderEvidenceProofColumn;
  window.proofPeerRank = proofPeerRank;
}

bindEvidenceProofRender();

if (typeof window !== "undefined") {
  document.addEventListener("DOMContentLoaded", function () {
    renderEvidenceProofColumn();
  });
  window.addEventListener("hashchange", function () {
    setTimeout(renderEvidenceProofColumn, 80);
  });
}
