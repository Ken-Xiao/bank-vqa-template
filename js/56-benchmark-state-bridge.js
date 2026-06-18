/* Bank VQA module: 56-benchmark-state-bridge.js
 * 数据对标 ⇄ launch state 双向同步桥
 *
 * launch state 用银行的中文名（"苏州农商行"）；数据对标 _bm 用 ID（"CN033"）
 * 这里负责名↔ID 转换 + 同步触发
 *
 * 同步规则（用户拍板：全状态双向同步）：
 *   - target            ↔ selectedBankId
 *   - peers             ↔ customPeers + activePeers.custom
 *   - year              ↔ snapshotYear
 *   - 其他（scenario / confirmed / appMode）不同步
 *
 * 防循环：_syncing flag 守护
 */

(function () {
  if (typeof window === "undefined") return;

  var _syncing = false;

  function bm() { return window.__bm; }
  function bmData() { var b = bm(); return b && b.data; }
  function hasState() { return typeof state !== "undefined" && state; }

  function bankNameToId(name) {
    var d = bmData(); if (!d || !name) return null;
    // 数据对标里的银行名可能是规范化后的（如 "上海农商银行"），launch state 用习惯名（如 "上海农商行"）
    // 先精确匹配，失败再去掉"银行"/"农商行"等后缀模糊匹配
    var hit = d.banks.filter(function(b){ return b.name === name; })[0];
    if (hit) return hit.id;
    // 模糊匹配：name 去掉常见后缀
    var stripped = name.replace(/银行$|股份有限公司$/, "");
    hit = d.banks.filter(function(b){ return b.name.indexOf(stripped) === 0; })[0];
    return hit ? hit.id : null;
  }
  function bankIdToName(id) {
    var d = bmData(); if (!d || !id) return null;
    var hit = d.banks.filter(function(b){ return b.id === id; })[0];
    return hit ? hit.name : null;
  }

  // launch state → 数据对标 _bm
  function syncStateToBenchmark(options) {
    options = options || {};
    var b = bm(); if (!b || _syncing || !hasState()) return;
    if (!b.data) return;  // 数据未加载
    _syncing = true;
    try {
      var changed = false;
      // target
      if (state.target) {
        var tid = bankNameToId(state.target);
        if (tid && tid !== b.selectedBankId) { b.selectedBankId = tid; changed = true; }
      }
      // peers
      if (Array.isArray(state.peers) && state.peers.length) {
        var ids = state.peers.map(bankNameToId).filter(Boolean);
        if (ids.length && !arraysEqual(ids, b.customPeers)) {
          b.customPeers = ids;
          if (!b.activePeers.custom) {
            b.activePeers.custom = true;
            // 同步勾选 DOM
            var input = document.querySelector('[data-peer-key="custom"]');
            if (input) input.checked = true;
            var custom = document.getElementById("bmPeerCustom");
            if (custom) custom.hidden = false;
          }
          changed = true;
        }
      }
      // year
      if (state.year) {
        var y = parseInt(state.year, 10);
        if (y >= 2020 && y <= 2025 && y !== b.snapshotYear) {
          b.snapshotYear = y;
          // 同步左侧 tab
          var snapBtns = document.querySelectorAll("#bmSnapshotTabs button");
          Array.prototype.forEach.call(snapBtns, function(btn){
            btn.classList.toggle("is-active", parseInt(btn.dataset.snap, 10) === y);
          });
          changed = true;
        }
      }
      if (changed && options.render !== false && typeof window.renderBenchmarkPage === "function") {
        window.renderBenchmarkPage();
      }
    } finally {
      _syncing = false;
    }
  }

  // 数据对标 _bm → launch state
  function syncBenchmarkToState(options) {
    options = options || {};
    var b = bm(); if (!b || _syncing || !hasState()) return;
    _syncing = true;
    try {
      var changed = false;
      if (b.selectedBankId) {
        var nm = bankIdToName(b.selectedBankId);
        if (nm && nm !== state.target) { state.target = nm; changed = true; }
      }
      if (Array.isArray(b.customPeers) && b.activePeers && b.activePeers.custom) {
        var names = b.customPeers.map(bankIdToName).filter(Boolean);
        if (names.length && !arraysEqual(names, state.peers || [])) {
          state.peers = names;
          changed = true;
        }
      }
      if (b.snapshotYear && b.snapshotYear !== state.year) {
        state.year = b.snapshotYear;
        changed = true;
      }
      // 不主动触发其他 page 重渲染，避免 cascade。
      // 仅持久化 state（兼容 09-projects 的 autosave 机制）
      if (changed) {
        try {
          if (typeof saveProjectState === "function") saveProjectState();
        } catch (e) { /* silent */ }
      }
    } finally {
      _syncing = false;
    }
  }

  function arraysEqual(a, b) {
    if (!Array.isArray(a) || !Array.isArray(b)) return false;
    if (a.length !== b.length) return false;
    var as = a.slice().sort(), bs = b.slice().sort();
    for (var i=0; i<as.length; i++) if (as[i] !== bs[i]) return false;
    return true;
  }

  // === URL 路由参数：#page/benchmark?bank=CN033&domain=quality&story=npl_swarm ===
  function parseBenchmarkUrlParams() {
    if (typeof location === "undefined") return {};
    var hash = location.hash || "";
    var idx = hash.indexOf("?");
    if (idx < 0) return {};
    var qs = hash.substring(idx + 1);
    var out = {};
    qs.split("&").forEach(function(kv){
      var p = kv.split("=");
      if (p.length === 2) out[decodeURIComponent(p[0])] = decodeURIComponent(p[1]);
    });
    return out;
  }
  function applyBenchmarkUrlParams() {
    var b = bm(); if (!b || !b.data) return;
    var p = parseBenchmarkUrlParams();
    if (!Object.keys(p).length) return;
    var changed = false;
    if (p.bank) {
      var bid = bankNameToId(p.bank) || p.bank;  // 允许传 ID 或名字
      if (b.data.banks.filter(function(bb){return bb.id === bid;}).length) {
        b.selectedBankId = bid;
        changed = true;
      }
    }
    if (p.domain && b.data.domains[p.domain]) {
      b.activeDomain = p.domain;
      changed = true;
    }
    if (p.year) {
      var y = parseInt(p.year, 10);
      if (y >= 2020 && y <= 2025) { b.snapshotYear = y; changed = true; }
    }
    if (changed && typeof window.renderBenchmarkPage === "function") {
      window.renderBenchmarkPage();
    }
    // story anchor 滚动
    if (p.story) {
      setTimeout(function(){
        var el = document.getElementById("story-" + p.story);
        if (el) try { el.scrollIntoView({behavior:"smooth", block:"start"}); } catch(e){ el.scrollIntoView(); }
      }, 300);
    }
  }

  // === 跳到数据对标 page，可指定 domain/story ===
  // 给报告页调用：jumpToBenchmark({ topic: "roa_dupont" })
  //              jumpToBenchmark({ metricName: "净资产收益率" })
  //              jumpToBenchmark({ domain: "quality", story: "npl_swarm" })
  function jumpToBenchmark(opts) {
    opts = opts || {};
    var target = { domain: null, story: null };
    // 1. 直接 domain/story
    if (opts.domain) { target.domain = opts.domain; target.story = opts.story || null; }
    // 2. metricName 精确名匹配 + fallback topic
    if (!target.domain && opts.metricName && window.__BENCHMARK_TOPIC_MAP__) {
      var m = window.__BENCHMARK_TOPIC_MAP__.metric_name_to_benchmark || {};
      if (m[opts.metricName]) { target = m[opts.metricName]; }
    }
    // 3. topic
    if (!target.domain && opts.topic && window.__BENCHMARK_TOPIC_MAP__) {
      var t = window.__BENCHMARK_TOPIC_MAP__.topic_to_benchmark || {};
      if (t[opts.topic]) { target = t[opts.topic]; }
    }
    // 拼 URL
    var qs = [];
    if (target.domain) qs.push("domain=" + encodeURIComponent(target.domain));
    if (target.story)  qs.push("story="  + encodeURIComponent(target.story));
    if (opts.bank)     qs.push("bank="   + encodeURIComponent(opts.bank));
    if (opts.year)     qs.push("year="   + encodeURIComponent(opts.year));
    var hash = "#page/benchmark" + (qs.length ? "?" + qs.join("&") : "");
    try {
      location.hash = hash;
    } catch (e) {
      // 老浏览器降级
      if (typeof setPortalPage === "function") setPortalPage("benchmark");
    }
  }

  // 加载映射表
  function loadTopicMap() {
    fetch("config/benchmark_to_report_topic.json", { cache: "no-store" })
      .then(function(r){ return r.ok ? r.json() : null; })
      .then(function(j){
        if (j) {
          window.__BENCHMARK_TOPIC_MAP__ = j;
          // 加载后立即扫一遍页面，给可识别的指标卡加跳转入口
          setTimeout(enhanceReportPageWithJumpLinks, 500);
        }
      })
      .catch(function(){ /* silent — fallback 到无映射 */ });
  }
  loadTopicMap();

  // 给报告页 / step2 / formal report 里出现的 metric 卡片标题自动加跳转 hint
  // 策略：遍历常见 metric 容器，提取标题文字，如果匹配 metric_name_to_benchmark
  //       的 key，在该容器右上角注入"在数据对标查看 →"按钮
  function enhanceReportPageWithJumpLinks() {
    var map = window.__BENCHMARK_TOPIC_MAP__;
    if (!map || !map.metric_name_to_benchmark) return;
    var metricNames = Object.keys(map.metric_name_to_benchmark);
    if (!metricNames.length) return;
    // 候选选择器：报告/章节里常见的"含 h3/h4 指标标题"卡片
    var selectors = [
      ".formal-metric-hero",      // formal report 主指标卡
      ".formal-metric-card",
      ".formal-so-what",
      ".step2-evidence-section",
      ".v5-card",
      ".president-watch-item",
      ".president-finding-item",
    ];
    selectors.forEach(function(sel){
      var nodes = document.querySelectorAll(sel);
      Array.prototype.forEach.call(nodes, function(el){
        if (el.querySelector(".bm-jump-link")) return;  // 已加
        var title = el.querySelector("h2,h3,h4,b,strong");
        if (!title) return;
        var txt = (title.textContent || "").trim();
        var hit = metricNames.filter(function(n){ return txt.indexOf(n) >= 0; })[0];
        if (!hit) return;
        var link = document.createElement("a");
        link.className = "bm-jump-link";
        link.href = "javascript:void(0)";
        link.setAttribute("data-jump-metric", hit);
        link.title = "在数据对标查看：" + hit;
        link.textContent = "在数据对标查看 →";
        el.style.position = "relative";
        el.appendChild(link);
      });
    });
  }
  window.enhanceReportPageWithJumpLinks = enhanceReportPageWithJumpLinks;
  // 报告页可能 lazy 渲染 — 定时扫
  var enhanceTimer = setInterval(enhanceReportPageWithJumpLinks, 2500);
  setTimeout(function(){ clearInterval(enhanceTimer); }, 60000);

  function uniq(arr) {
    var seen = {};
    return (arr || []).filter(function(item){
      if (!item || seen[item]) return false;
      seen[item] = true;
      return true;
    });
  }

  function matchReportAngles(selectedMetrics, causalChains) {
    var metrics = selectedMetrics || [];
    var chains = causalChains || [];
    var angles = [];
    var sections = [];
    if (metrics.some(function(m){ return ["ROE", "NIM", "成本收入比"].indexOf(m) >= 0; })) {
      angles.push("盈利能力分析");
      sections.push("经营总览", "盈利能力");
    }
    if (metrics.some(function(m){ return ["定期化率", "存款成本率", "LDR"].indexOf(m) >= 0; })) {
      angles.push("负债结构与息差压力");
      sections.push("负债结构", "盈利能力");
    }
    if (metrics.some(function(m){ return ["对公不良率", "零售不良率", "拨备覆盖率"].indexOf(m) >= 0; })) {
      angles.push("资产质量与风险抵补");
      sections.push("资产质量", "风险提示");
    }
    if (metrics.some(function(m){ return ["LCR", "NSFR", "流动性缺口"].indexOf(m) >= 0; })) {
      angles.push("流动性与安全边际");
      sections.push("流动性", "风险提示");
    }
    if (chains.length) {
      angles.push("关键问题追溯");
      sections.push("管理建议");
    }
    return {
      reportAngles: uniq(angles),
      reportSections: uniq(sections),
    };
  }

  function getStoredBenchmarkAudience() {
    try {
      if (typeof localStorage !== "undefined") {
        return localStorage.getItem("benchmarkiq.audience") || localStorage.getItem("benchmarkiq.entryRole") || "";
      }
    } catch (e) { /* silent */ }
    return "";
  }

  function buildBenchmarkEvidencePack() {
    var metrics = [];
    var chains = [];
    var metricInputs = document.querySelectorAll("[data-report-metric]:checked");
    var chainInputs = document.querySelectorAll("[data-report-chain]:checked");
    Array.prototype.forEach.call(metricInputs, function(input){
      metrics.push(input.getAttribute("data-report-metric"));
    });
    Array.prototype.forEach.call(chainInputs, function(input){
      chains.push(input.getAttribute("data-report-chain"));
    });
    var b = bm() || {};
    var matched = matchReportAngles(metrics, chains);
    return {
      bankId: b.selectedBankId || (hasState() && state.target) || "",
      peerGroupId: b.activePeers ? Object.keys(b.activePeers).filter(function(k){ return b.activePeers[k]; }).join(",") : "",
      year: b.snapshotYear || (hasState() && state.year) || "",
      audience: getStoredBenchmarkAudience(),
      selectedDomains: [],
      selectedMetrics: metrics,
      causalChains: chains,
      storyCards: [],
      reportAngles: matched.reportAngles,
      reportSections: matched.reportSections,
      updatedAt: new Date().toISOString(),
    };
  }

  function saveBenchmarkEvidencePack(pack) {
    try {
      if (typeof localStorage !== "undefined") {
        localStorage.setItem("benchmarkiq.evidencePack", JSON.stringify(pack || {}));
      }
    } catch (e) { /* silent */ }
    window.__benchmarkEvidencePack = pack || {};
    return pack;
  }

  function getBenchmarkEvidencePack() {
    if (window.__benchmarkEvidencePack) return window.__benchmarkEvidencePack;
    try {
      if (typeof localStorage !== "undefined") {
        var raw = localStorage.getItem("benchmarkiq.evidencePack");
        if (raw) return JSON.parse(raw);
      }
    } catch (e) { /* silent */ }
    return null;
  }

  function renderBenchmarkEvidencePackSummary() {
    var el = document.getElementById("benchmarkEvidencePackSummary");
    if (!el) return;
    var pack = getBenchmarkEvidencePack();
    if (!pack || !(pack.selectedMetrics || []).length) {
      el.innerHTML = '<div class="bm-appendix-empty">'
        + '<p>请先完成数据对标，并选择要进入报告的指标、故事线或因果链。</p>'
        + '<p><a href="#page/benchmark" data-page-link="benchmark">返回数据对标选择入报告数据</a></p>'
        + '</div>';
      return;
    }
    var angleHtml = (pack.reportAngles || []).map(function(a){
      return '<span class="bm-report-angle-chip">'+escapeXml(a)+'</span>';
    }).join("");
    el.innerHTML = '<section class="bm-evidence-pack-card">'
      + '<header><span>报告证据包</span><b>已选择 '+(pack.selectedMetrics || []).length+' 个指标</b></header>'
      + '<p>报告将优先围绕以下分析角度展开：</p>'
      + '<div class="bm-report-angle-row">'+angleHtml+'</div>'
      + '<p class="bm-evidence-pack-sections">建议章节：'+escapeXml((pack.reportSections || []).join("、") || "未匹配")+'</p>'
      + '</section>';
  }

  function goToReportWithEvidencePack(button) {
    if (button) {
      button.disabled = true;
      button.setAttribute("aria-busy", "true");
      button.textContent = "正在进入报告...";
    }
    var navigate = function(){
      if (typeof setPortalPage === "function") setPortalPage("report", { force: true });
      if (typeof setWorkspaceTab === "function") setWorkspaceTab("report");
      renderBenchmarkEvidencePackSummary();
      if (button) {
        button.disabled = false;
        button.removeAttribute("aria-busy");
        button.textContent = "生成报告证据包";
      }
    };
    if (typeof requestAnimationFrame === "function") {
      requestAnimationFrame(navigate);
    } else {
      setTimeout(navigate, 0);
    }
  }

  // === 报告页：数据附录章节渲染 ===
  // 读取 state.reportDataAppendices，按当前 _bm 数据重画每条故事线的引用
  function renderBenchmarkReportAppendix() {
    var bodyEl = document.getElementById("benchmarkReportAppendixBody");
    var footEl = document.getElementById("benchmarkReportAppendixFoot");
    if (!bodyEl) return;
    var arr = (typeof state !== "undefined" && state.reportDataAppendices) || window.__bmAppendices || [];
    if (!arr.length) {
      bodyEl.innerHTML = '<div class="bm-appendix-empty">'
        + '<p>暂未从数据对标加入任何故事线。</p>'
        + '<p>请到 <a href="#page/benchmark" data-page-link="benchmark">数据对标页</a> 浏览感兴趣的章节，点击故事线卡左侧的「加入报告附录」按钮。</p>'
        + '</div>';
      if (footEl) footEl.innerHTML = '';
      return;
    }
    var b = bm();
    if (!b || !b.data) {
      bodyEl.innerHTML = '<div class="bm-appendix-empty"><p>数据包尚未加载，无法渲染附录。请先进入数据对标页。</p></div>';
      return;
    }
    // 渲染每条
    var pieces = arr.map(function(ap, idx){
      var dom = b.data.domains[ap.domain];
      if (!dom) return '';
      var story = (dom.stories || []).filter(function(s){ return s.id === ap.story; })[0];
      if (!story) return '';
      var bankName = bankIdToName(ap.bankId) || ap.bankId;
      var addedDate = ap.addedAt ? ap.addedAt.slice(0, 10) : "—";
      return '<article class="bm-appendix-item" id="appendix-'+ap.domain+'-'+ap.story+'">'
           + '<header class="bm-appendix-item-head">'
           +   '<div>'
           +     '<span class="bm-appendix-item-num">附 '+pad2(idx+1)+'</span>'
           +     '<span class="bm-appendix-item-domain">'+escapeXml(dom.label)+'</span>'
           +     '<h3 class="bm-appendix-item-title">'+escapeXml(story.title)+'</h3>'
           +   '</div>'
           +   '<div class="bm-appendix-item-meta">'
           +     '<button class="bm-appendix-jump" data-jump-topic="" data-domain="'+ap.domain+'" data-story="'+ap.story+'">在数据对标查看 →</button>'
           +     '<button class="bm-appendix-remove" data-remove-appendix="'+ap.domain+'/'+ap.story+'">从附录移除</button>'
           +   '</div>'
           + '</header>'
           + '<p class="bm-appendix-item-lead">'+escapeXml(story.lead)+'</p>'
           + '<p class="bm-appendix-item-context">'
           +   '目标行 <b>'+escapeXml(bankName)+'</b> &nbsp;·&nbsp; 截面 <b>'+ap.snapshotYear+' 年末</b> &nbsp;·&nbsp; 趋势 '+ap.trendStart+'–'+ap.trendEnd+''
           +   ' &nbsp;·&nbsp; 加入时间 '+addedDate+''
           +   ' &nbsp;·&nbsp; 数据版本 '+escapeXml(ap.dataVersion || "—")
           + '</p>'
           + '</article>';
    });
    bodyEl.innerHTML = pieces.join("");
    if (footEl) footEl.innerHTML = '<p class="bm-appendix-foot-note">共 '+arr.length+' 条数据对标引用 · 所有数据按"加入时刻"快照保留 state，但每次渲染按 latest _bm 重新查值，保证数字与数据包同步。</p>';
  }
  function pad2(n) { return n < 10 ? "0" + n : String(n); }
  function escapeXml(s) {
    if (s === null || s === undefined) return "";
    return String(s).replace(/[<>&"]/g, function(c){return {"<":"&lt;",">":"&gt;","&":"&amp;","\"":"&quot;"}[c];});
  }
  window.renderBenchmarkReportAppendix = renderBenchmarkReportAppendix;

  // 移除按钮事件代理
  document.addEventListener("click", function(e){
    var buildPackBtn = e.target.closest("#bmOpenReportEvidenceSelector");
    if (buildPackBtn) {
      e.preventDefault();
      saveBenchmarkEvidencePack(buildBenchmarkEvidencePack());
      renderBenchmarkEvidencePackSummary();
      goToReportWithEvidencePack(buildPackBtn);
      return;
    }
    var rm = e.target.closest("[data-remove-appendix]");
    if (rm) {
      e.preventDefault();
      var key = rm.dataset.removeAppendix.split("/");
      if (typeof window.bmToggleStoryAppendix === "function") {
        window.bmToggleStoryAppendix(key[0], key[1]);
      }
      renderBenchmarkReportAppendix();
      return;
    }
    var jp = e.target.closest("[data-domain][data-story]");
    if (jp && jp.classList.contains("bm-appendix-jump")) {
      e.preventDefault();
      jumpToBenchmark({ domain: jp.dataset.domain, story: jp.dataset.story });
    }
  });

  // 进入 report page 时触发渲染
  function startAppendixObserver() {
    if (!document.body) { setTimeout(startAppendixObserver, 100); return; }
    try {
      new MutationObserver(function(muts){
        muts.forEach(function(m){
          if (m.attributeName === "data-app-page" &&
              document.body.getAttribute("data-app-page") === "report") {
            setTimeout(function(){
              renderBenchmarkEvidencePackSummary();
              renderBenchmarkReportAppendix();
            }, 100);
          }
        });
      }).observe(document.body, { attributes: true, attributeFilter: ["data-app-page"] });
    } catch (e) { /* silent */ }
  }
  startAppendixObserver();

  // 暴露
  window.syncStateToBenchmark = syncStateToBenchmark;
  window.syncBenchmarkToState = syncBenchmarkToState;
  window.applyBenchmarkUrlParams = applyBenchmarkUrlParams;
  window.jumpToBenchmark = jumpToBenchmark;
  window.bankNameToId = bankNameToId;
  window.bankIdToName = bankIdToName;
  window.buildBenchmarkEvidencePack = buildBenchmarkEvidencePack;
  window.matchReportAngles = matchReportAngles;
  window.saveBenchmarkEvidencePack = saveBenchmarkEvidencePack;
  window.getBenchmarkEvidencePack = getBenchmarkEvidencePack;
  window.renderBenchmarkEvidencePackSummary = renderBenchmarkEvidencePackSummary;
  window.goToReportWithEvidencePack = goToReportWithEvidencePack;

  // 钩子 1：MutationObserver 监听 body[data-app-page]，切到 benchmark 时
  //   ① 先同步 state → _bm
  //   ② 再解析 URL 参数覆盖（URL 参数优先级最高，用于深链接跳转）
  function startObserver() {
    if (!document.body) { setTimeout(startObserver, 100); return; }
    try {
      new MutationObserver(function(muts){
        muts.forEach(function(m){
          if (m.attributeName === "data-app-page") {
            var page = document.body.getAttribute("data-app-page");
            if (page === "benchmark") {
              setTimeout(function(){
                syncStateToBenchmark({render: false});
                applyBenchmarkUrlParams();
              }, 100);
            }
          }
        });
      }).observe(document.body, { attributes: true, attributeFilter: ["data-app-page"] });
    } catch (e) { /* silent */ }
  }
  startObserver();

  // hashchange 监听：用户改 URL → 重新应用参数
  window.addEventListener("hashchange", function(){
    if (document.body && document.body.getAttribute("data-app-page") === "benchmark") {
      setTimeout(applyBenchmarkUrlParams, 50);
    }
  });

  // 全局 click 代理 — 任何元素带 data-jump-to-benchmark="metricName_or_topic" 自动跳
  // 也支持 data-jump-topic="topic_id" / data-jump-metric="metric 中文名"
  document.addEventListener("click", function(e){
    var el = e.target.closest("[data-jump-to-benchmark],[data-jump-topic],[data-jump-metric]");
    if (!el) return;
    var hint = el.getAttribute("data-jump-to-benchmark");
    var topic = el.getAttribute("data-jump-topic");
    var metric = el.getAttribute("data-jump-metric");
    e.preventDefault();
    if (metric) jumpToBenchmark({ metricName: metric });
    else if (topic) jumpToBenchmark({ topic: topic });
    else if (hint) {
      // 智能识别：先按 metric 名，再按 topic
      var m = (window.__BENCHMARK_TOPIC_MAP__ || {}).metric_name_to_benchmark || {};
      if (m[hint]) jumpToBenchmark({ metricName: hint });
      else jumpToBenchmark({ topic: hint });
    }
  });

  // 钩子 2：DOMContentLoaded 后做一次首屏同步
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", function(){
      setTimeout(syncStateToBenchmark, 300);
    });
  } else {
    setTimeout(syncStateToBenchmark, 100);
  }
})();
