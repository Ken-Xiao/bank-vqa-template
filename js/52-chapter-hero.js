/* Bank VQA module: 52-chapter-hero.js
 * PR-S2: Editorial × McKinsey 章节 hero 重构
 *
 * 把 6 个 portal-page 重新呈现为"一本书的 6 章"。
 *
 * 每章 hero 结构（参考 docs/superpowers/specs/2026-06-08-portal-storyline-redesign.md）:
 *   [hairline rule]
 *   [kicker: "CHAPTER 02"]
 *   [headline: 衬线大字, 董事会问题（来自 js/44 PAGE_QUESTIONS）]
 *   [lede: 1-2 句判断, 来自 js/44 pageHeaderJudgment(page).text]
 *
 * 与现有组件协同:
 *   - js/44-page-header-question.js 仍然渲染 page-header-host（状态/证据 strip/核验）
 *   - js/52 渲染 chapter-hero-host（叙事 hero），在视觉上位于 page-header 之前
 *   - 旧 page-header 的 verification/evidence 仍可见，作为次级 metadata
 *
 * 与 setPortalPage 协同:
 *   - 每次切换 portal page，自动 re-render 全部 6 章节 hero（成本极低）
 *   - 章节 typology 适配：retail/corporate/transaction/universal 不同银行可切换 headline 模板（future）
 */

// 6 章编号（与 PORTAL_PAGES 顺序对齐）
var CHAPTER_NUMBERS = {
  launch:   "01",
  answer:   "02",
  evidence: "03",
  topics:   "04",
  report:   "05",
  data:     "06",
};

// 6 章默认 lede（pageHeaderJudgment 失败时的兜底）
var CHAPTER_LEDE_FALLBACK = {
  launch:   "确认目标银行、对标组与汇报场景。本次报告的口径与边界由此页确定。",
  answer:   "先给一句结论，再用证据展开。董事会读到的第一句话决定整本书的走向。",
  evidence: "总判断 + 同业位置 + 异动归因 + 估值锚。三类证据按顺序读，结论是否上会由此判定。",
  topics:   "盈利质量、息差防守、风险确认、资本估值。哪些专题需要进入正式报告由此抉择。",
  report:   "章节、版本、语言强度、导出形态。把判断翻译成董事会能消费的可交付材料。",
  data:     "三源对照、字段血缘、口径风险。哪些结论必须降级或加脚注由此最终把关。",
};

function chapterHeroHtml(page) {
  var num = CHAPTER_NUMBERS[page] || "—";

  // 1. headline：复用 js/44 的 PAGE_QUESTIONS（董事会问题）
  var headline = "";
  if (typeof PAGE_QUESTIONS !== "undefined" && PAGE_QUESTIONS[page]) {
    headline = PAGE_QUESTIONS[page];
  } else if (typeof window !== "undefined" && window.PAGE_QUESTIONS && window.PAGE_QUESTIONS[page]) {
    headline = window.PAGE_QUESTIONS[page];
  } else {
    headline = "本章主问题待定";
  }

  // 2. lede：复用 js/44 的 pageHeaderJudgment()，fallback 到默认
  var lede = CHAPTER_LEDE_FALLBACK[page] || "";
  if (typeof pageHeaderJudgment === "function") {
    try {
      var j = pageHeaderJudgment(page);
      if (j && j.text) lede = j.text;
    } catch (e) { /* silent, 用 fallback */ }
  }

  // 3. 渲染（escape 不严格，相信内部数据源）
  return ''
    + '<article class="chapter-hero" data-chapter="' + page + '">'
    +   '<header class="chapter-kicker">'
    +     '<span class="chapter-num">CHAPTER ' + num + '</span>'
    +     '<span class="chapter-rule" aria-hidden="true"></span>'
    +   '</header>'
    +   '<h1 class="chapter-headline">' + headline + '</h1>'
    +   (lede ? '<p class="chapter-lede">' + lede + '</p>' : '')
    + '</article>';
}

function renderAllChapterHeroes() {
  if (typeof document === "undefined") return;
  var hosts = document.querySelectorAll("[data-chapter-hero-host]");
  hosts.forEach(function (host) {
    var page = host.getAttribute("data-chapter-hero-host");
    if (!page) return;
    try {
      host.innerHTML = chapterHeroHtml(page);
    } catch (e) {
      // 单 host 渲染失败不应影响其它 host
      console && console.warn && console.warn("chapter-hero render failed for", page, e);
    }
  });
}

function initChapterHero() {
  renderAllChapterHeroes();
  // hook setPortalPage：每次切换 page 后重新渲染 chapter-hero
  // （成本极低，6 个 host × innerHTML 字符串拼装）
  if (typeof window !== "undefined" && typeof window.setPortalPage === "function") {
    var orig = window.setPortalPage;
    window.setPortalPage = function () {
      var result = orig.apply(this, arguments);
      try { renderAllChapterHeroes(); } catch (e) { /* silent */ }
      return result;
    };
  }
  // 数据加载完成后再渲染一次（pageHeaderJudgment 可能依赖 state.confirmed）
  if (typeof document !== "undefined") {
    document.addEventListener("benchmarkiq:analysis-confirmed", renderAllChapterHeroes);
    document.addEventListener("benchmarkiq:state-changed", renderAllChapterHeroes);
  }
}

if (typeof window !== "undefined") {
  window.CHAPTER_NUMBERS = CHAPTER_NUMBERS;
  window.CHAPTER_LEDE_FALLBACK = CHAPTER_LEDE_FALLBACK;
  window.chapterHeroHtml = chapterHeroHtml;
  window.renderAllChapterHeroes = renderAllChapterHeroes;
  window.initChapterHero = initChapterHero;
}
