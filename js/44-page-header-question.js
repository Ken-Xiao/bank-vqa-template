/* Bank VQA module: 44-page-header-question.js
 * Huashu Design Review Quick Win 2+3：
 *   1. 每个 page 顶部统一渲染「董事会问题 + 判断条 + 证据 strip + 页面级核验状态」
 *   2. 「可上会/审慎/附录/待补」提升为页面级 status，不再只作局部 badge
 *
 * 设计哲学：每页一个主问题、一句结论、一组证据、一个动作。投委会 memo 风格。
 *
 * 与 42-portal-router 协同：setPortalPage() 后调用 renderAllPageHeaders()
 */

// 6 个 page 的董事会问题（≤22 字，问号结尾或判断句）
var PAGE_QUESTIONS = {
  launch:   "本次汇报采用什么样本边界？",
  answer:   "本行当前最紧迫的经营约束是什么？",
  evidence: "证据是否足以支持这个判断上会？",
  topics:   "差异来自盈利、息差、风险还是资本？",
  report:   "如何把判断变成可交付材料？",
  data:     "哪些结论必须降级或加脚注？",
};

// 每个 page 应当显示的"页面级核验状态"语义
var PAGE_STATUS_HINT = {
  launch:   "样本就绪",
  answer:   "结论强度",
  evidence: "证据可信度",
  topics:   "机制成熟度",
  report:   "交付准备度",
  data:     "字段核验度",
};

function pageHeaderVerificationStatus(page) {
  // 综合 state.confirmed + annualReportVerification + dataWarnings 推断页面级状态
  // 输出：{ tier: "可上会|审慎|附录|待补", tone: "green|amber|orange|red", label, hint }
  var confirmed = typeof state !== "undefined" && state.confirmed;
  if (!confirmed && page === "launch") {
    return { tier: "待确认口径", tone: "neutral", label: "样本待确认", hint: "完成目标银行、对标组、年份选择。" };
  }
  if (!confirmed) {
    return { tier: "待确认口径", tone: "neutral", label: "上游样本未就绪", hint: "回设定口径页确认目标银行和对标组。" };
  }

  // 调用 11A 的核验状态聚合
  var summary = null;
  if (typeof annualVerificationSummary === "function") {
    try { summary = annualVerificationSummary(); } catch (e) { /* silent */ }
  }

  // 默认判断逻辑
  var coverage = summary && typeof summary.coverage === "number" ? summary.coverage : null;
  var conflicts = summary && typeof summary.conflicts === "number" ? summary.conflicts : 0;
  var primaryOnly = summary && typeof summary.primaryOnly === "number" ? summary.primaryOnly : 0;

  // 每个 page 的判定语义略有不同
  var tier, tone, label, hint;
  if (page === "launch") {
    tier = "可上会";
    tone = "green";
    label = "样本就绪";
    hint = "目标银行、对标组、年份都已确认，进诊断。";
  } else if (coverage == null) {
    tier = "待补";
    tone = "amber";
    label = "核验数据加载中";
    hint = "Ready 层在加载，部分结论先走审慎语气。";
  } else if (conflicts > 5) {
    tier = "审慎表述";
    tone = "orange";
    label = "存在口径差异";
    hint = "主表与年报有 " + conflicts + " 项差异，上会前复核底稿。";
  } else if (coverage >= 0.8) {
    tier = "可上会";
    tone = "green";
    label = "已核验覆盖 " + Math.round(coverage * 100) + "%";
    hint = "证据充分，形成强判断并进入正式报告。";
  } else if (coverage >= 0.5) {
    tier = "审慎表述";
    tone = "amber";
    label = "已核验 " + Math.round(coverage * 100) + "%";
    hint = "核心指标已核验，附注待补，走审慎语气。";
  } else if (primaryOnly > 10) {
    tier = "附录披露";
    tone = "orange";
    label = "主表单源 " + primaryOnly + " 项";
    hint = "多项指标只有主表来源，进附录证据，不形成强判断。";
  } else {
    tier = "待补";
    tone = "red";
    label = "核验不足";
    hint = "核心证据缺，上会前补年报附注或现场访谈。";
  }
  return { tier: tier, tone: tone, label: label, hint: hint };
}

function pageHeaderJudgment(page) {
  // 不同 page 的当前判断（一句话结论）
  if (typeof state === "undefined" || !state.confirmed) {
    return { text: "先确认目标银行和对标组，本页才出结论。", source: "pending", isPending: true };
  }
  var target = state.target || "目标银行";
  var year = state.year || "";
  var row = typeof targetRecord === "function" ? targetRecord() : null;

  if (page === "launch") {
    return {
      text: target + " · " + year + " 年截面，对标 " + (state.peers || []).length + " 家同业，分析情景：" +
        (state.scenario || "董事会判断") + "。",
      source: "口径设置",
      isPending: false,
    };
  }
  if (page === "answer") {
    var diag = typeof commandCenterDiagnosis === "function" ? commandCenterDiagnosis() : null;
    if (diag && diag.headline) {
      return { text: diag.headline, source: "VQA 总判断", isPending: false };
    }
    if (row && typeof row.roa === "number") {
      return {
        text: target + " ROA " + row.roa + "%、ROE " + (row.roe || "—") + "%，本期最弱维度待诊断。",
        source: "ready 主表",
        isPending: false,
      };
    }
    return { text: "数据加载中。", source: "loading", isPending: true };
  }
  if (page === "evidence") {
    // 用 unifyTopChangesAndDeviations 的 topN 第一条作为评据线索
    if (typeof unifyTopChangesAndDeviations === "function" && row) {
      try {
        var unified = unifyTopChangesAndDeviations(row, typeof peerRecords === "function" ? peerRecords() : [], { topN: 1 });
        var top1 = unified && unified.topN && unified.topN[0];
        if (top1) {
          return {
            text: "首要证据：" + top1.label + " 当前 " + top1.currentDisplay + "，vs 同业 " + top1.zDisplay + "。" + top1.managementImplication.slice(0, 40) + "…",
            source: "Top Changes 统一排序",
            isPending: false,
          };
        }
      } catch (e) { /* silent */ }
    }
    return { text: "三类证据就位：同业位置、本期异动、PB 估值锚。按 proof column 顺序读。", source: "evidence-map", isPending: false };
  }
  if (page === "topics") {
    if (typeof valueCreationChainPanel === "function" && row) {
      try {
        var v = valueCreationChainPanel(row, typeof peerRecords === "function" ? peerRecords() : []);
        if (v && v.headline) {
          return { text: v.headline, source: "价值创造链", isPending: false };
        }
      } catch (e) { /* silent */ }
    }
    return { text: "四条交叉信号链就位：NIM 桥接、ROA 归因、隐性风险、价值创造。", source: "cross-signal", isPending: false };
  }
  if (page === "report") {
    return {
      text: "报告就绪：" + (state.reportVersion || "董事会完整汇报版") + "，9 章节，一键导出 HTML/PDF/PPTX。",
      source: "Report Studio",
      isPending: false,
    };
  }
  if (page === "data") {
    return {
      text: "三源数据治理就位：主表为基线、Tushare 补市场和标准三表、年报抓取做 2025 核验层。",
      source: "Ready v2",
      isPending: false,
    };
  }
  return { text: "—", source: "", isPending: false };
}

function pageHeaderEvidenceStrip(page) {
  // 2-4 个关键证据：当前值 / 同比 / vs 同业 / 核验状态
  // 不同 page 选不同指标族
  var row = typeof targetRecord === "function" ? targetRecord() : null;
  if (!row) return [];

  var families = {
    launch: ["bankSize", "peerCount", "year", "scenario"],
    answer: ["roa", "roe", "nim", "npl"],
    evidence: ["pb", "roe", "npl", "coreRevenueGrowth"],
    topics: ["nim", "roa", "npl", "pb"],
    report: ["roa", "roe", "pb", "npl"],
    data: [], // 数据复核页不需要常规证据 strip
  };
  var keys = families[page] || [];
  return keys.map(function (key) {
    if (key === "bankSize") {
      return { label: "目标银行", value: state.target || "—", source: "口径" };
    }
    if (key === "peerCount") {
      return { label: "对标组", value: ((state.peers || []).length) + " 家", source: "口径" };
    }
    if (key === "year") {
      return { label: "分析年份", value: (state.year || "—") + " 截面", source: "口径" };
    }
    if (key === "scenario") {
      var sc = { board: "董事会判断", market: "资本市场沟通", action: "管理层行动" };
      return { label: "汇报情景", value: sc[state.scenario] || "董事会判断", source: "口径" };
    }
    // 数值指标
    var v = row[key];
    var label = typeof metricLabel !== "undefined" && metricLabel[key] ? metricLabel[key] : key;
    var ver = typeof csVerification === "function" ? csVerification(key) : null;
    return {
      label: label,
      value: v == null ? "—" : v + (key === "pb" ? "x" : "%"),
      source: ver ? (ver.status || "—") : "primary",
    };
  });
}

function renderPageHeader(page) {
  if (!page) page = typeof getPortalPage === "function" ? getPortalPage() : "launch";
  var question = PAGE_QUESTIONS[page] || "本页主问题待定";
  var statusHint = PAGE_STATUS_HINT[page] || "页面状态";
  var status = pageHeaderVerificationStatus(page);
  var judgment = pageHeaderJudgment(page);
  var strip = pageHeaderEvidenceStrip(page);

  var stripHtml = strip.length
    ? '<div class="page-evidence-strip">' + strip.map(function (e) {
        return '<div class="page-evidence-cell">' +
          '<em>' + e.label + '</em>' +
          '<b>' + e.value + '</b>' +
          '<span class="page-evidence-source">' + e.source + '</span>' +
          '</div>';
      }).join("") + '</div>'
    : "";

  return '<div class="page-header tone-' + status.tone + '">' +
    '<div class="page-header-row1">' +
      '<div class="page-header-question">' +
        '<span class="page-header-kicker">本页主问题</span>' +
        '<h2>' + question + '</h2>' +
      '</div>' +
      '<div class="page-header-status tone-' + status.tone + '" title="' + status.hint + '">' +
        '<em>' + statusHint + '</em>' +
        '<b>' + status.tier + '</b>' +
        '<span>' + status.label + '</span>' +
      '</div>' +
    '</div>' +
    '<div class="page-header-row2">' +
      '<div class="page-header-judgment ' + (judgment.isPending ? "is-pending" : "") + '">' +
        '<span class="page-header-judgment-label">当前判断</span>' +
        '<p>' + judgment.text + '</p>' +
        (judgment.source ? '<small class="page-header-judgment-source">来源：' + judgment.source + '</small>' : "") +
      '</div>' +
    '</div>' +
    stripHtml +
    '</div>';
}

function renderAllPageHeaders() {
  if (typeof document === "undefined") return;
  var hosts = document.querySelectorAll("[data-page-header]");
  hosts.forEach(function (host) {
    var page = host.getAttribute("data-page-header");
    if (!page) return;
    try {
      host.innerHTML = renderPageHeader(page);
    } catch (e) {
      if (typeof console !== "undefined") console.warn("[page-header] render failed", page, e);
    }
  });
}

function bindPageHeaderRender() {
  var orig = typeof renderAll === "function" ? renderAll : null;
  if (orig && !orig.__pageHeaderWrapped) {
    renderAll = function renderAllWithPageHeader() {
      var r = orig.apply(this, arguments);
      try { renderAllPageHeaders(); } catch (e) {
        if (typeof console !== "undefined") console.warn("[page-header] mount failed", e);
      }
      return r;
    };
    renderAll.__pageHeaderWrapped = true;
  }
}

if (typeof window !== "undefined") {
  window.PAGE_QUESTIONS = PAGE_QUESTIONS;
  window.PAGE_STATUS_HINT = PAGE_STATUS_HINT;
  window.renderPageHeader = renderPageHeader;
  window.renderAllPageHeaders = renderAllPageHeaders;
  window.pageHeaderVerificationStatus = pageHeaderVerificationStatus;
  window.pageHeaderJudgment = pageHeaderJudgment;
  window.pageHeaderEvidenceStrip = pageHeaderEvidenceStrip;
}

bindPageHeaderRender();

// 当 portal page 切换时也重新渲染 header
if (typeof window !== "undefined") {
  document.addEventListener("DOMContentLoaded", function () {
    renderAllPageHeaders();
  });
  // 与 setPortalPage 协同：用 hashchange 触发
  window.addEventListener("hashchange", function () {
    setTimeout(renderAllPageHeaders, 50);
  });
}
