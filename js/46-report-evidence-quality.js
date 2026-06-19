/* Bank VQA module: 46-report-evidence-quality.js
 * Huashu Sprint H4：报告工作室证据质量控制台
 *
 * 改造目标：把 Report Studio 从「导出按钮」升级为「证据质量编辑工作台」。
 *
 * 三件事：
 *   1. 每个章节顶部显示「可上会/审慎/附录/待补」状态徽章（注入到 formal-section DOM）
 *   2. 右侧控制台分三组：
 *      - 章节结构（chapters 总数 + 状态分布 + 排序快捷）
 *      - 语言强度（L1-L4 + 当前 narrative channel + 调整入口）
 *      - 证据质量（rewriteQualityWarnings + citationMetricKeys + dataWarnings 聚合）
 *   3. 复用 reportDeliveryModel() 拿章节 meta，不重复 DOM 查询
 *
 * 与已建能力的复用：
 *   - js/35-report-model.js: rewriteStatus / rewriteQualityWarnings / citationMetricKeys / dataWarnings / riskStamp / storyRole
 *   - js/44-page-header-question.js: pageHeaderVerificationStatus（4 档 tier 命名一致）
 *   - js/40-cross-signal-engine.js: csVerification（按字段拿核验状态）
 */

// ============ 1. 单章节质量评估 ============

function chapterEvidenceQuality(section) {
  if (!section) return null;
  // 一个 section 是 reportDeliveryModel.sections[] 的元素
  var s = section;
  // 输出：tier / tone / score / 触发原因列表
  var reasons = [];
  var score = 100;

  // 1. rewrite status
  if (s.rewriteStatus === "not_generated" || !s.rewriteText) {
    score -= 25;
    reasons.push("章节文字未生成，仍是模板默认");
  } else if (s.rewriteStatus === "local_synced") {
    score -= 5;
    reasons.push("走本地证据模板，未云端重写");
  }

  // 2. rewriteQualityWarnings
  if (Array.isArray(s.rewriteQualityWarnings) && s.rewriteQualityWarnings.length > 0) {
    score -= s.rewriteQualityWarnings.length * 10;
    reasons.push("质量警告 " + s.rewriteQualityWarnings.length + " 条：" + s.rewriteQualityWarnings.slice(0, 2).join("；"));
  }

  // 3. dataWarnings
  if (Array.isArray(s.dataWarnings) && s.dataWarnings.length > 0) {
    score -= s.dataWarnings.length * 8;
    reasons.push("数据警告 " + s.dataWarnings.length + " 条");
  }

  // 4. 引用证据数量
  var citationCount = Array.isArray(s.citationMetricKeys) ? s.citationMetricKeys.length : 0;
  if (citationCount === 0) {
    score -= 20;
    reasons.push("无引用证据字段");
  } else if (citationCount < 2) {
    score -= 8;
    reasons.push("引用证据不到 2 项");
  }

  // 5. riskStamp（口径风险）
  if (s.riskStamp === "L4") {
    score -= 20;
    reasons.push("口径风险 L4，高风险");
  } else if (s.riskStamp === "L3") {
    score -= 10;
    reasons.push("口径风险 L3");
  }

  // 6. storyRole 是否完整
  if (!s.storyRole) {
    score -= 5;
    reasons.push("缺 storyRole 标记");
  }

  score = Math.max(0, Math.min(100, score));

  var tier, tone;
  if (score >= 80) { tier = "可上会"; tone = "green"; }
  else if (score >= 60) { tier = "审慎表述"; tone = "amber"; }
  else if (score >= 40) { tier = "附录披露"; tone = "orange"; }
  else { tier = "待补"; tone = "red"; }

  return {
    sectionId: s.id,
    sectionTitle: s.sectionTitle,
    storyRole: s.storyRole,
    score: score,
    tier: tier,
    tone: tone,
    reasons: reasons,
    rewriteStatus: s.rewriteStatus,
    citationCount: citationCount,
    warningCount: (Array.isArray(s.rewriteQualityWarnings) ? s.rewriteQualityWarnings.length : 0) +
                  (Array.isArray(s.dataWarnings) ? s.dataWarnings.length : 0),
    riskStamp: s.riskStamp,
  };
}

// ============ 2. 全报告汇总 ============

function reportSectionsQualityAggregate() {
  if (typeof reportDeliveryModel !== "function") return null;
  var model = reportDeliveryModel();
  var sections = (model && model.sections) || [];
  var quals = sections.map(chapterEvidenceQuality).filter(Boolean);

  var tierCount = { "可上会": 0, "审慎表述": 0, "附录披露": 0, "待补": 0 };
  var totalScore = 0;
  var totalWarnings = 0;
  var totalCitations = 0;
  var rewriteStatusCount = { local_synced: 0, not_generated: 0, ai_rewritten: 0, other: 0 };
  var riskStampCount = { L1: 0, L2: 0, L3: 0, L4: 0 };

  quals.forEach(function (q) {
    tierCount[q.tier] = (tierCount[q.tier] || 0) + 1;
    totalScore += q.score;
    totalWarnings += q.warningCount;
    totalCitations += q.citationCount;
    if (q.rewriteStatus === "local_synced") rewriteStatusCount.local_synced++;
    else if (q.rewriteStatus === "not_generated") rewriteStatusCount.not_generated++;
    else if (q.rewriteStatus) rewriteStatusCount.ai_rewritten++;
    else rewriteStatusCount.other++;
    if (q.riskStamp) riskStampCount[q.riskStamp] = (riskStampCount[q.riskStamp] || 0) + 1;
  });

  var totalChapters = quals.length;
  var avgScore = totalChapters > 0 ? Math.round(totalScore / totalChapters) : 0;
  var overallTier;
  if (totalChapters === 0) overallTier = "待补";
  else if (tierCount["待补"] > 0) overallTier = "待补";
  else if (tierCount["附录披露"] > 0) overallTier = "附录披露";
  else if (tierCount["审慎表述"] > totalChapters / 3) overallTier = "审慎表述";
  else overallTier = "可上会";

  return {
    totalChapters: totalChapters,
    tierCount: tierCount,
    avgScore: avgScore,
    overallTier: overallTier,
    totalWarnings: totalWarnings,
    totalCitations: totalCitations,
    rewriteStatusCount: rewriteStatusCount,
    riskStampCount: riskStampCount,
    sections: quals,
    primaryChannel: typeof reportPrimaryNarrativeChannel === "function" ? reportPrimaryNarrativeChannel() : "board",
  };
}

// ============ 3. 章节状态徽章注入 ============

function renderChapterStatusBadges() {
  if (typeof document === "undefined") return;
  var agg = reportSectionsQualityAggregate();
  if (!agg) return;
  agg.sections.forEach(function (q) {
    if (!q.sectionId) return;
    var sectionEl = document.getElementById(q.sectionId);
    if (!sectionEl) return;
    // 找或建 badge
    var badge = sectionEl.querySelector(".chapter-quality-badge");
    if (!badge) {
      badge = document.createElement("div");
      badge.className = "chapter-quality-badge";
      // 插到 section 顶部
      sectionEl.insertBefore(badge, sectionEl.firstChild);
    }
    badge.className = "chapter-quality-badge tone-" + q.tone;
    badge.setAttribute("title", q.reasons.join("；") || "证据质量充足");
    badge.innerHTML =
      '<b>' + q.tier + '</b>' +
      '<span class="chapter-quality-score">质量分 ' + q.score + '</span>' +
      (q.warningCount > 0 ? '<span class="chapter-quality-warning">⚠ ' + q.warningCount + ' 条警告</span>' : '') +
      (q.citationCount === 0 ? '<span class="chapter-quality-no-cite">无引用</span>' :
        '<span class="chapter-quality-cite">引用 ' + q.citationCount + ' 项</span>') +
      (q.riskStamp ? '<span class="chapter-quality-risk">口径 ' + q.riskStamp + '</span>' : '');
  });
}

// ============ 4. 右侧控制台 HTML（3 组）============

function reportEvidenceQualityConsoleHTML() {
  var agg = reportSectionsQualityAggregate();
  if (!agg) {
    return '<div class="report-quality-empty">报告 model 尚未就绪。</div>';
  }

  // Group 1: 章节结构
  var structureHtml =
    '<div class="quality-group">' +
      '<header><em>1</em><b>章节结构</b></header>' +
      '<div class="quality-stat-row"><span>章节总数</span><b>' + agg.totalChapters + '</b></div>' +
      '<div class="quality-stat-row"><span>整体状态</span><b class="tone-' + tierToTone(agg.overallTier) + '">' + agg.overallTier + '</b></div>' +
      '<div class="quality-stat-row"><span>平均质量分</span><b>' + agg.avgScore + ' / 100</b></div>' +
      '<div class="quality-tier-stack">' +
        renderTierBar("可上会", agg.tierCount["可上会"], agg.totalChapters, "green") +
        renderTierBar("审慎表述", agg.tierCount["审慎表述"], agg.totalChapters, "amber") +
        renderTierBar("附录披露", agg.tierCount["附录披露"], agg.totalChapters, "orange") +
        renderTierBar("待补", agg.tierCount["待补"], agg.totalChapters, "red") +
      '</div>' +
      '<div class="quality-group-actions">' +
        '<button type="button" data-quality-action="filter-need-fix">仅看待修</button>' +
        '<button type="button" data-quality-action="reorder">重排章节</button>' +
      '</div>' +
    '</div>';

  // Group 2: 语言强度
  var channelLabel = { board: "董事会版", market: "资本市场版", action: "管理层行动版" };
  var ch = agg.primaryChannel;
  var l1 = agg.riskStampCount.L1, l2 = agg.riskStampCount.L2,
      l3 = agg.riskStampCount.L3, l4 = agg.riskStampCount.L4;
  var languageHtml =
    '<div class="quality-group">' +
      '<header><em>2</em><b>语言强度</b></header>' +
      '<div class="quality-stat-row"><span>主叙述渠道</span><b>' + (channelLabel[ch] || ch) + '</b></div>' +
      '<div class="quality-language-grid">' +
        '<div class="quality-lang-cell tone-green"><em>L1 强</em><b>' + l1 + '</b></div>' +
        '<div class="quality-lang-cell tone-amber"><em>L2 中</em><b>' + l2 + '</b></div>' +
        '<div class="quality-lang-cell tone-orange"><em>L3 弱</em><b>' + l3 + '</b></div>' +
        '<div class="quality-lang-cell tone-red"><em>L4 待</em><b>' + l4 + '</b></div>' +
      '</div>' +
      '<div class="quality-group-actions">' +
        '<button type="button" data-quality-action="channel-board" data-channel="board">切板董</button>' +
        '<button type="button" data-quality-action="channel-market" data-channel="market">切资本市场</button>' +
        '<button type="button" data-quality-action="channel-action" data-channel="action">切行动</button>' +
      '</div>' +
    '</div>';

  // Group 3: 证据质量
  var rewriteHtml =
    '<div class="quality-rewrite-grid">' +
      '<div class="quality-rewrite-cell"><em>本地同步</em><b>' + agg.rewriteStatusCount.local_synced + '</b></div>' +
      '<div class="quality-rewrite-cell"><em>未生成</em><b>' + agg.rewriteStatusCount.not_generated + '</b></div>' +
      (agg.rewriteStatusCount.ai_rewritten > 0 ? '<div class="quality-rewrite-cell"><em>AI 重写</em><b>' + agg.rewriteStatusCount.ai_rewritten + '</b></div>' : '') +
    '</div>';

  // 最严重的 3 条警告
  var topWarnings = [];
  agg.sections.forEach(function (q) {
    if (q.warningCount > 0 && q.reasons.length) {
      topWarnings.push({
        title: q.sectionTitle || q.sectionId,
        reasons: q.reasons,
        score: q.score,
      });
    }
  });
  topWarnings.sort(function (a, b) { return a.score - b.score; });
  topWarnings = topWarnings.slice(0, 3);
  var warningHtml = topWarnings.length === 0
    ? '<p class="quality-no-warnings">无严重质量警告，所有章节可上会。</p>'
    : '<ul class="quality-warning-list">' + topWarnings.map(function (w) {
        return '<li class="quality-warning-item">' +
          '<div class="quality-warning-head"><b>' + w.title + '</b><span>质量分 ' + w.score + '</span></div>' +
          '<ul>' + w.reasons.slice(0, 3).map(function (r) { return '<li>' + r + '</li>'; }).join("") + '</ul>' +
          '</li>';
      }).join("") + '</ul>';

  var qualityHtml =
    '<div class="quality-group">' +
      '<header><em>3</em><b>证据质量</b></header>' +
      '<div class="quality-stat-row"><span>引用证据总数</span><b>' + agg.totalCitations + '</b></div>' +
      '<div class="quality-stat-row"><span>质量警告数</span><b class="' + (agg.totalWarnings > 0 ? 'tone-red' : 'tone-green') + '">' + agg.totalWarnings + '</b></div>' +
      rewriteHtml +
      '<div class="quality-warning-subtitle">最待修的 3 章：</div>' +
      warningHtml +
    '</div>';

  return '<div class="report-quality-console">' +
    '<div class="quality-console-head">' +
      '<strong>证据质量控制台</strong>' +
      '<span class="tone-' + tierToTone(agg.overallTier) + '">' + agg.overallTier + '</span>' +
    '</div>' +
    structureHtml +
    languageHtml +
    qualityHtml +
    '</div>';
}

function tierToTone(tier) {
  return tier === "可上会" ? "green" :
         tier === "审慎表述" ? "amber" :
         tier === "附录披露" ? "orange" : "red";
}

function renderTierBar(label, count, total, tone) {
  var pct = total > 0 ? Math.round((count / total) * 100) : 0;
  return '<div class="quality-tier-bar tone-' + tone + '">' +
    '<div class="quality-tier-bar-label">' + label + '</div>' +
    '<div class="quality-tier-bar-track"><div class="quality-tier-bar-fill" style="width:' + pct + '%"></div></div>' +
    '<div class="quality-tier-bar-count">' + count + ' / ' + total + '</div>' +
    '</div>';
}

// ============ 5. 渲染 + 绑定 ============

function renderReportEvidenceQualityConsole() {
  if (typeof document === "undefined") return;
  var host = document.getElementById("reportEvidenceQualityMount") ||
    document.querySelector("[data-report-quality-mount]");
  if (host) {
    try {
      host.innerHTML = reportEvidenceQualityConsoleHTML();
    } catch (e) {
      if (typeof console !== "undefined") console.warn("[report-quality] console render failed", e);
    }
  }
  // 章节内的 badge 也注入
  try {
    renderChapterStatusBadges();
  } catch (e) {
    if (typeof console !== "undefined") console.warn("[report-quality] badge render failed", e);
  }
}

function bindReportQualityActions() {
  if (typeof document === "undefined") return;
  document.addEventListener("click", function (e) {
    var btn = e.target && e.target.closest && e.target.closest("[data-quality-action]");
    if (!btn) return;
    var action = btn.getAttribute("data-quality-action");
    if (action && action.indexOf("channel-") === 0) {
      var channel = btn.getAttribute("data-channel");
      if (typeof reportSetPrimaryChannel === "function" && channel) {
        try { reportSetPrimaryChannel(channel); } catch (err) { /* silent */ }
        if (typeof renderAll === "function") renderAll();
        else renderReportEvidenceQualityConsole();
      }
    } else if (action === "filter-need-fix") {
      // 高亮所有 tone-red/orange 章节
      document.querySelectorAll(".chapter-quality-badge").forEach(function (b) {
        var sectionEl = b.closest && b.closest(".formal-section");
        if (sectionEl) {
          if (b.classList.contains("tone-red") || b.classList.contains("tone-orange")) {
            sectionEl.classList.add("is-need-fix");
          } else {
            sectionEl.classList.remove("is-need-fix");
          }
        }
      });
    } else if (action === "reorder") {
      // 跳转到 reportStructureEditor
      var editor = document.getElementById("reportStructureEditor");
      if (editor) editor.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  });
}

function bindReportQualityRender() {
  var orig = typeof renderAll === "function" ? renderAll : null;
  if (orig && !orig.__reportQualityWrapped) {
    renderAll = function renderAllWithReportQuality() {
      var r = orig.apply(this, arguments);
      try { renderReportEvidenceQualityConsole(); } catch (e) {
        if (typeof console !== "undefined") console.warn("[report-quality] mount failed", e);
      }
      return r;
    };
    renderAll.__reportQualityWrapped = true;
  }
}

if (typeof window !== "undefined") {
  window.chapterEvidenceQuality = chapterEvidenceQuality;
  window.reportSectionsQualityAggregate = reportSectionsQualityAggregate;
  window.reportEvidenceQualityConsoleHTML = reportEvidenceQualityConsoleHTML;
  window.renderReportEvidenceQualityConsole = renderReportEvidenceQualityConsole;
  window.renderChapterStatusBadges = renderChapterStatusBadges;
}

bindReportQualityRender();
bindReportQualityActions();

if (typeof window !== "undefined") {
  document.addEventListener("DOMContentLoaded", function () {
    setTimeout(renderReportEvidenceQualityConsole, 200);
  });
  window.addEventListener("hashchange", function () {
    setTimeout(renderReportEvidenceQualityConsole, 120);
  });
}
