/* Bank VQA module: 55-benchmark-page.js
 * 纯数据对标 page —— 嵌入在 portal-page="benchmark" 的 section 内
 *
 * 数据来源：bank_scope_2025_v1/benchmark_dataset.json （由 build_benchmark_dataset.py 生成）
 * 渲染：
 *   - 左侧面板：银行列表（按类型过滤+搜索） / 4 类对标 toggle / 自选对标 / 年份 tab / 样本摘要
 *   - 右侧主区：6 个域 tab × 域内 N 张指标卡（柱图 + 关键数 + 分位条 + 趋势线）
 *
 * 与其他模块解耦：
 *   - 自启动 (init on DOMContentLoaded + 首次切换到 benchmark page 时再确保 init)
 *   - 不污染全局 state；自己维护 _bm 命名空间
 */

(function () {
  if (typeof document === "undefined") return;

  // ---------- 1. 内部状态 ----------
  var _bm = {
    data: null,            // 整个 benchmark_dataset.json
    selectedBankId: null,  // 目标银行
    activePeers: { national_type: true, region_type: true, national_other: false, custom: false },
    customPeers: [],       // 用户勾选的银行 id 数组
    snapshotYear: 2025,    // 截面时点（年末）— 柱图基期
    trendStart:   2020,    // 趋势区间起年
    trendEnd:     2025,    // 趋势区间讫年
    activeDomain: null,    // 6 域 tab，默认第一个
    bankTypeFilter: "all", // all/大行/股份/城商/农商
    bankSearch: "",
    inited: false,
    loading: false,
    mode: "stories",       // stories（故事线，默认）/ selected（精选指标）/ all（全量）
    audience: null,        // board/cfo/cro/expert — 首次启动从 localStorage 读，null = 显示引导卡
    viewMode: "overview",  // overview / domain / story
    activeStoryRef: null,  // { domainKey, storyId }
    returnContext: "overview",
    expandedDetail: {},
  };
  // 启动时从 localStorage 读 audience
  try {
    var savedAud = localStorage.getItem("benchmarkiq.audience");
    if (savedAud && ["board","cfo","cro","expert"].indexOf(savedAud) >= 0) {
      _bm.audience = savedAud;
    }
  } catch (e) { /* silent */ }

  // 暴露便于 console 调试
  window.__bm = _bm;

  // ---------- 2. 加载数据 ----------
  // 优先级：window.BENCHMARK_DATASET（由 data_benchmark.js 注入，file:// 也能用）
  //         → fetch bank_scope_2025_v1/benchmark_dataset.json （HTTP server 模式）
  function applyData(json, source) {
    _bm.data = json;
    _bm.activeDomain = Object.keys(json.domains)[0];
    _bm.loading = false;
    var info = document.getElementById("bmDataInfo");
    if (info) {
      var nMetrics = 0;
      Object.keys(json.domains).forEach(function(k){ nMetrics += Object.keys(json.domains[k].items).length; });
      info.textContent = json.banks.length + " 家银行 · " + json.years.length + " 年 · "
        + Object.keys(json.domains).length + " 域 · " + nMetrics + " 指标 · "
        + source + " · 生成于 " + json.generated_at;
    }
    return json;
  }
  function loadData() {
    if (_bm.data || _bm.loading) return Promise.resolve(_bm.data);
    _bm.loading = true;
    // 路线 A：window 全局变量（file:// 模式优先走这里）
    if (typeof window !== "undefined" && window.BENCHMARK_DATASET) {
      return Promise.resolve(applyData(window.BENCHMARK_DATASET, "内联数据"));
    }
    // 路线 B：fetch JSON（HTTP server 模式）
    var url = "bank_scope_2025_v1/benchmark_dataset.json";
    return fetch(url, { cache: "no-store" })
      .then(function (r) {
        if (!r.ok) throw new Error("HTTP " + r.status);
        return r.json();
      })
      .then(function (json) { return applyData(json, "fetch JSON"); })
      .catch(function (err) {
        _bm.loading = false;
        console.error("[benchmark] 数据加载失败", err);
        var info = document.getElementById("bmDataInfo");
        if (info) info.textContent = "数据加载失败：" + err.message;
        var empty = document.getElementById("bmEmpty");
        if (empty) {
          empty.innerHTML = '<h2 style="color:var(--color-bad,#7a2a2a)">数据加载失败</h2>'
            + '<p>需要：<br>'
            + '① 确认 <code>data_benchmark.js</code> 已生成并跟 <code>index.html</code> 同目录；<br>'
            + '② 或通过 HTTP server（如 <code>python3 -m http.server 8080</code>）访问页面。<br><br>'
            + '错误信息：' + err.message + '</p>';
        }
        throw err;
      });
  }

  // ---------- 3. 工具函数 ----------
  function getBank(id) {
    if (!_bm.data || !id) return null;
    for (var i=0;i<_bm.data.banks.length;i++) if (_bm.data.banks[i].id === id) return _bm.data.banks[i];
    return null;
  }
  function resolveBenchmarkBankId(bankIdOrName) {
    if (!_bm.data || !bankIdOrName) return null;
    var text = String(bankIdOrName);
    var aliasMap = {
      "苏农银行": "苏州农商行",
      "苏州农村商业银行": "苏州农商行",
      "江苏苏州农村商业银行": "苏州农商行"
    };
    if (aliasMap[text]) text = aliasMap[text];
    for (var i=0;i<_bm.data.banks.length;i++) {
      var b = _bm.data.banks[i];
      if (b.id === text || b.name === text) return b.id;
      if (typeof displayBankName === "function" && displayBankName(b.name) === text) return b.id;
    }
    var stripped = text.replace(/银行$|农商行$|农商银行$|农村商业银行$|股份有限公司$/g, "");
    for (var j=0;j<_bm.data.banks.length;j++) {
      var bb = _bm.data.banks[j];
      var displayCandidate = typeof displayBankName === "function" ? displayBankName(bb.name) : bb.name;
      var candidate = String(bb.name || "").replace(/银行$|农商行$|农商银行$|农村商业银行$|股份有限公司$/g, "");
      var candidateDisplay = String(displayCandidate || "").replace(/银行$|农商行$|农商银行$|农村商业银行$|股份有限公司$/g, "");
      if (candidate && (candidate.indexOf(stripped) === 0 || stripped.indexOf(candidate) === 0)) return bb.id;
      if (candidateDisplay && (candidateDisplay.indexOf(stripped) === 0 || stripped.indexOf(candidateDisplay) === 0)) return bb.id;
    }
    return null;
  }
  function formatVal(v, unit) {
    if (v === null || v === undefined || isNaN(v)) return "—";
    if (unit === "亿元") return v.toLocaleString("zh-CN", {maximumFractionDigits:1});
    if (unit === "x") return v.toFixed(2) + "x";
    return v.toFixed(2);
  }
  function valOf(bankId, year, metricKey) {
    if (!_bm.data) return null;
    var b = _bm.data.panel[bankId];
    if (!b) return null;
    var yr = b[String(year)];
    if (!yr) return null;
    var v = yr[metricKey];
    return (v === null || v === undefined) ? null : v;
  }
  function meanOf(bankIds, year, metricKey) {
    var sum = 0, n = 0;
    for (var i=0;i<bankIds.length;i++) {
      var v = valOf(bankIds[i], year, metricKey);
      if (v !== null) { sum += v; n++; }
    }
    return n > 0 ? sum / n : null;
  }
  function quantile(arr, q) {
    if (!arr.length) return null;
    var sorted = arr.slice().sort(function(a,b){return a-b;});
    var pos = (sorted.length - 1) * q;
    var base = Math.floor(pos);
    var rest = pos - base;
    return sorted[base + 1] !== undefined ? sorted[base] + rest * (sorted[base+1] - sorted[base]) : sorted[base];
  }
  function rankOf(value, allValues, higherBetter) {
    if (value === null || !allValues.length) return null;
    var sorted = allValues.slice().sort(function(a,b){
      return higherBetter ? b-a : a-b;
    });
    for (var i=0;i<sorted.length;i++) if (sorted[i] === value) return { rank: i+1, total: sorted.length };
    // 找最近的
    for (var j=0;j<sorted.length;j++) {
      if ((higherBetter && sorted[j] < value) || (!higherBetter && sorted[j] > value)) {
        return { rank: j+1, total: sorted.length };
      }
    }
    return { rank: sorted.length, total: sorted.length };
  }

  // 对标组成员
  function getPeerGroupIds(peerKey, targetBank) {
    if (!_bm.data || !targetBank) return [];
    var banks = _bm.data.banks;
    if (peerKey === "national_type") {
      return banks.filter(function(b){return b.type === targetBank.type && b.id !== targetBank.id;}).map(function(b){return b.id;});
    }
    if (peerKey === "region_type") {
      var r = targetBank.region;
      // 大行/股份制 region="全国"，本地概念不适用，退化为全国同类型
      if (r === "全国") return [];
      return banks.filter(function(b){return b.type === targetBank.type && b.region === r && b.id !== targetBank.id;}).map(function(b){return b.id;});
    }
    if (peerKey === "national_other") {
      // 全国跨类型：所有银行减去目标
      return banks.filter(function(b){return b.id !== targetBank.id;}).map(function(b){return b.id;});
    }
    if (peerKey === "custom") {
      return _bm.customPeers.filter(function(id){return id !== targetBank.id;});
    }
    return [];
  }

  // ---------- 4. 左侧面板：银行列表 ----------
  var TYPE_TABS = [
    { key: "all",  label: "全部" },
    { key: "大型商业银行", label: "大行" },
    { key: "股份制商业银行", label: "股份" },
    { key: "城市商业银行", label: "城商" },
    { key: "农村商业银行", label: "农商" },
  ];
  function renderBankTypeTabs() {
    var host = document.getElementById("bmBankTypeTabs");
    if (!host) return;
    host.innerHTML = TYPE_TABS.map(function(t){
      var cls = t.key === _bm.bankTypeFilter ? "is-active" : "";
      return '<button type="button" class="'+cls+'" data-type="'+t.key+'">'+t.label+'</button>';
    }).join("");
  }
  function renderBankList() {
    var host = document.getElementById("bmBankList");
    if (!host || !_bm.data) return;
    var kw = _bm.bankSearch.toLowerCase().trim();
    var list = _bm.data.banks.filter(function(b){
      if (_bm.bankTypeFilter !== "all" && b.type !== _bm.bankTypeFilter) return false;
      if (kw) {
        return (b.name+b.id+b.stock_code).toLowerCase().indexOf(kw) >= 0;
      }
      return true;
    });
    if (!list.length) { host.innerHTML = '<div class="bm-bank-empty">未匹配到银行</div>'; return; }
    host.innerHTML = list.map(function(b){
      var cls = b.id === _bm.selectedBankId ? "is-active" : "";
      return '<div class="bm-bank-item '+cls+'" data-bank-id="'+b.id+'">'
        + '<span>'+b.name+'</span>'
        + '<span class="bm-bank-type">'+b.type_short+'·'+b.region+'</span>'
        + '</div>';
    }).join("");
  }

  // ---------- 5. 左侧：自选对标 ----------
  function renderPeerPool() {
    var pool = document.getElementById("bmPeerPool");
    var chips = document.getElementById("bmPeerChips");
    if (!pool || !_bm.data) return;
    var kw = (document.getElementById("bmPeerSearch") || {}).value || "";
    kw = kw.toLowerCase().trim();
    var picked = _bm.customPeers.slice();
    var list = _bm.data.banks.filter(function(b){
      if (b.id === _bm.selectedBankId) return false;
      if (!kw) return true;
      return (b.name+b.id).toLowerCase().indexOf(kw) >= 0;
    });
    pool.innerHTML = list.slice(0, 30).map(function(b){
      var cls = picked.indexOf(b.id) >= 0 ? "is-picked" : "";
      return '<div class="bm-bank-item '+cls+'" data-pool-bank-id="'+b.id+'">'
        + '<span>'+b.name+'</span>'
        + '<span class="bm-bank-type">'+b.type_short+'</span></div>';
    }).join("");
    if (chips) {
      chips.innerHTML = picked.map(function(id){
        var b = getBank(id);
        return b ? '<span class="bm-peer-chip" data-peer-remove="'+id+'">'+b.name+'</span>' : '';
      }).join("");
    }
  }

  // ---------- 6. 左侧：摘要 ----------
  function renderSummary() {
    var title = document.getElementById("bmSummaryTitle");
    var grid  = document.getElementById("bmSummaryGrid");
    if (!title || !grid) return;
    var b = getBank(_bm.selectedBankId);
    if (!b) {
      title.textContent = "请先选择目标银行";
      grid.innerHTML = '';
      return;
    }
    title.textContent = b.name;
    var nationalCount = getPeerGroupIds("national_type", b).length;
    var regionCount = getPeerGroupIds("region_type", b).length;
    var customCount = getPeerGroupIds("custom", b).length;
    grid.innerHTML =
        '<div><span>类型</span><b>'+b.type_short+'</b></div>'
      + '<div><span>大区</span><b>'+b.region+'·'+b.province+'</b></div>'
      + '<div><span>截面时点</span><b>'+_bm.snapshotYear+' 年末</b></div>'
      + '<div><span>趋势区间</span><b>'+_bm.trendStart+'–'+_bm.trendEnd+'</b></div>'
      + '<div><span>股票代码</span><b>'+(b.stock_code||'未上市')+'</b></div>'
      + '<div><span>全国同类</span><b>'+nationalCount+' 家</b></div>'
      + '<div><span>本地同类</span><b>'+regionCount+' 家</b></div>'
      + (_bm.activePeers.custom ? '<div><span>自选对标</span><b>'+customCount+' 家</b></div>' : '');

    // 更新对标 toggle 的提示
    var hintNat = document.getElementById("bmHintNational");
    if (hintNat) hintNat.textContent = b.type_short + '行全国 ' + nationalCount + ' 家均值';
    var hintReg = document.getElementById("bmHintRegion");
    if (hintReg) {
      if (b.region === "全国") {
        hintReg.textContent = "（大行/股份制无本地概念，自动退化为全国同类）";
      } else {
        hintReg.textContent = b.region + '大区 · ' + b.type_short + '行 ' + regionCount + ' 家均值';
      }
    }

    // 同步下一步状态
    renderNextBar();
  }

  // 下一步进入诊断的顶栏状态
  function renderNextBar() {
    var bar = document.getElementById("bmNextBar");
    var targetName = document.getElementById("bmNextTargetName");
    var peerCount = document.getElementById("bmNextPeerCount");
    var yearEl = document.getElementById("bmNextYear");
    var btn = document.getElementById("bmGoToDiagnosis");
    if (!bar || !btn) return;
    var b = getBank(_bm.selectedBankId);
    var peers = [];
    if (b) {
      ['national_type','region_type','national_other','custom'].forEach(function(k){
        if (_bm.activePeers[k]) peers = peers.concat(getPeerGroupIds(k, b));
      });
      peers = peers.filter(function(v,i,a){return a.indexOf(v) === i;});
    }
    if (targetName) targetName.textContent = b ? b.name : '未选择目标银行';
    if (peerCount) peerCount.textContent = String(peers.length);
    if (yearEl) yearEl.textContent = String(_bm.snapshotYear);
    btn.disabled = !_bm.selectedBankId;
  }

  function renderEvidencePackTray() {
    var host = document.getElementById("bmEvidencePackTray");
    if (!host) return;
    if (!_bm.selectedBankId) {
      host.innerHTML = '<div class="bm-pack-empty">请先在左侧选择目标银行。完成对标样本后，这里会自动生成可带入报告的证据包。</div>';
      return;
    }
    if (typeof window.buildRecommendedEvidencePack !== "function") {
      host.innerHTML = '<div class="bm-pack-empty">证据包模型尚未加载，请刷新页面后重试。</div>';
      return;
    }
    var pack = typeof window.readEvidencePack === "function" ? window.readEvidencePack() : null;
    var b = getBank(_bm.selectedBankId);
    var shouldRebuild = !pack || pack.status === "stale" || !pack.targetBank || (b && pack.targetBank.name !== b.name) || String(pack.year) !== String(_bm.snapshotYear);
    if (shouldRebuild) {
      pack = window.buildRecommendedEvidencePack();
    }
    var selected = Array.isArray(pack.selectedIssues) && pack.selectedIssues.length
      ? pack.selectedIssues.slice()
      : ((pack.recommendedIssues || []).slice(0, 3).map(function(issue){ return issue.issueId; }));
    var statusText = pack.status === "confirmed" ? "已确认" : "待确认";
    var statusClass = pack.status === "stale" ? " is-stale" : "";
    var issuesHtml = (pack.recommendedIssues || []).map(function(issue){
      var checked = selected.indexOf(issue.issueId) >= 0 ? " checked" : "";
      var ev = issue.evidence && issue.evidence[0];
      var chain = (issue.causalChain || []).slice(0, 3).join(" → ");
      return '<label class="bm-issue-card">'
        + '<input type="checkbox" data-toggle-evidence-issue="'+escapeXml(issue.issueId)+'"'+checked+' />'
        + '<span>'
        + '<em class="bm-evidence-toggle-copy">'+(checked ? '已纳入本轮诊断' : '纳入本轮诊断')+'</em>'
        + '<strong>'+escapeXml(issue.title)+'：'+escapeXml(issue.conclusion)+'</strong>'
        + '<p>'+escapeXml(chain)+'</p>'
        + '<span class="bm-issue-evidence">'
        + (ev ? '<span>'+escapeXml(ev.metric)+'：目标 '+escapeXml(ev.targetValue)+' / 对标 '+escapeXml(ev.peerValue)+'</span><span>差距 '+escapeXml(ev.gap)+' · '+escapeXml(ev.strength)+'证据</span>' : '')
        + '</span>'
        + '</span>'
        + '</label>';
    }).join("");
    host.innerHTML = ''
      + '<header class="bm-pack-head">'
      + '<div><span class="bm-pane-kicker">报告证据包</span><h3>选择要带入报告的问题链</h3><p>系统基于当前目标行、对标组和年份推荐问题，后续结论摘要、证据地图和专题归因将优先引用这里确认的证据。</p></div>'
      + '<span class="bm-pack-status'+statusClass+'">'+statusText+'</span>'
      + '</header>'
      + '<div class="bm-pack-meta">'
      + '<span>目标：'+escapeXml(pack.targetBank && pack.targetBank.name || "未选择")+'</span>'
      + '<span>年份：'+escapeXml(pack.year || _bm.snapshotYear)+'</span>'
      + '<span>推荐问题：'+String((pack.recommendedIssues || []).length)+' 个</span>'
      + '</div>'
      + '<div class="bm-issue-list">'+(issuesHtml || '<div class="bm-pack-empty">当前样本暂未形成足够证据。</div>')+'</div>'
      + '<div class="bm-pack-actions"><button type="button" class="bm-primary-action bm-evidence-primary-action" id="bmConfirmEvidencePack">生成并确认证据包</button></div>';
  }

  function markPackStaleForBenchmarkChange(reason) {
    if (typeof window.markEvidencePackStale === "function") {
      window.markEvidencePackStale(reason || "benchmark-change");
    }
  }

  function selectBenchmarkTargetBank(bankId, reason) {
    var resolvedBankId = resolveBenchmarkBankId(bankId);
    if (!resolvedBankId || resolvedBankId === _bm.selectedBankId) return false;
    _bm.selectedBankId = resolvedBankId;
    resetBenchmarkDrillState();
    markPackStaleForBenchmarkChange(reason || "target-change");
    if (typeof window.syncBenchmarkToState === "function") window.syncBenchmarkToState();
    return true;
  }
  window.selectBenchmarkTargetBank = selectBenchmarkTargetBank;

  function bindEvidencePackUi(shell) {
    if (!shell || shell.dataset.evidencePackBound === "1") return;
    shell.dataset.evidencePackBound = "1";
    shell.addEventListener("click", function(e){
      var restartBtn = e.target.closest("#bmRestartAnalysis, [data-restart-from-overview]");
      if (restartBtn) {
        var drawer = document.getElementById("bmRestartDrawer");
        if (drawer) drawer.hidden = false;
        return;
      }
      var closeBtn = e.target.closest("#bmRestartClose, #bmRestartKeepDraft");
      if (closeBtn) {
        var closeDrawer = document.getElementById("bmRestartDrawer");
        if (closeDrawer) closeDrawer.hidden = true;
        return;
      }
      var clearBtn = e.target.closest("#bmRestartClearPack");
      if (clearBtn) {
        if (typeof window.saveEvidencePack === "function") window.saveEvidencePack(null);
        _bm.selectedBankId = null;
        _bm.customPeers = [];
        _bm.activePeers = { national_type: true, region_type: true, national_other: false, custom: false };
        resetBenchmarkDrillState();
        var drawer2 = document.getElementById("bmRestartDrawer");
        if (drawer2) drawer2.hidden = true;
        if (typeof window.syncBenchmarkToState === "function") window.syncBenchmarkToState();
        renderAll();
        return;
      }
      var issueToggle = e.target.closest("[data-toggle-evidence-issue]");
      if (issueToggle) {
        var pack = typeof window.readEvidencePack === "function" ? window.readEvidencePack() : null;
        if (!pack) return;
        var id = issueToggle.dataset.toggleEvidenceIssue;
        var selected = Array.isArray(pack.selectedIssues) ? pack.selectedIssues.slice() : [];
        var idx = selected.indexOf(id);
        if (issueToggle.checked && idx < 0) selected.push(id);
        if (!issueToggle.checked && idx >= 0) selected.splice(idx, 1);
        pack.selectedIssues = selected;
        pack.status = "draft";
        if (typeof window.saveEvidencePack === "function") window.saveEvidencePack(pack);
        renderEvidencePackTray();
        return;
      }
      var confirmBtn = e.target.closest("#bmConfirmEvidencePack");
      if (confirmBtn) {
        var current = typeof window.readEvidencePack === "function" ? window.readEvidencePack() : null;
        var selectedIds = current && Array.isArray(current.selectedIssues) ? current.selectedIssues : [];
        if (typeof window.confirmEvidencePack === "function") {
          window.confirmEvidencePack(current, selectedIds);
        }
        renderEvidencePackTray();
        return;
      }
    });
  }

  // ---------- 7. 右侧：域 tab ----------
  // 受众切换器（顶部插在 domain tabs 之前）
  function renderAudienceSwitcher() {
    var host = document.getElementById("bmAudienceSwitcher");
    if (!host) return;
    var labels = { board: "董办", cfo: "财务", cro: "风险", expert: "专家" };
    var subs   = { board: "一页诊断", cfo: "数据矩阵", cro: "预警驱动", expert: "全量探索" };
    var html = '<span class="bm-aud-label">视图</span>'
      + Object.keys(labels).map(function(k){
          var cls = _bm.audience === k ? "is-active" : "";
          return '<button type="button" class="bm-aud-btn '+cls+'" data-audience="'+k+'">'
               + '<b>'+labels[k]+'</b><em>'+subs[k]+'</em></button>';
        }).join("");
    host.innerHTML = html;
  }

  // 首次引导卡（audience 为 null 时显示在主区，遮罩域内容）
  function renderAudienceOnboarding() {
    var host = document.getElementById("bmDomainContent");
    if (!host) return;
    host.hidden = false;
    var labels = [
      { key: "board",  title: "董办版",  sub: "行长 / 董事会 / 战略部",
        desc: "默认看到目标行健康总评 + 关键问题图 + 事实结论 3 条。最简洁、最易上手。" },
      { key: "cfo",    title: "财务版",  sub: "CFO / 财务部 / 战略分析",
        desc: "默认看到对标矩阵 + 全量指标卡 + Excel 导出。数据密集，适合月度复盘。" },
      { key: "cro",    title: "风险版",  sub: "CRO / 风险管理 / 信贷",
        desc: "默认看到全行业 CAMEL 信号灯 + 目标行 KRI 红黄绿 + 同比变化日志。预警驱动。" },
      { key: "expert", title: "专家版",  sub: "分析师 / 咨询合伙人 / 研究员",
        desc: "保留全部能力：故事线 / 关系图 / 桥接句 / 连贯阅读流。深度探索用。" }
    ];
    host.innerHTML = ''
      + '<section class="bm-onboarding">'
      +   '<header class="bm-onboarding-head">'
      +     '<div class="bm-onboarding-kicker">第一次进入 · 选择视图</div>'
      +     '<h2 class="bm-onboarding-title">您要用哪个视图？</h2>'
      +     '<p class="bm-onboarding-sub">同一份数据，4 种叙事顺序。视图记忆后可随时切换。</p>'
      +   '</header>'
      +   '<div class="bm-onboarding-grid">'
      +     labels.map(function(l){
            return '<button class="bm-onboarding-card" data-audience="'+l.key+'">'
                 + '<div class="bm-onboarding-card-num">'+(l.key === 'expert' ? '04' : (l.key === 'board' ? '01' : (l.key === 'cfo' ? '02' : '03')))+'</div>'
                 + '<h3>'+l.title+'</h3>'
                 + '<p class="bm-onboarding-sub-role">'+l.sub+'</p>'
                 + '<p class="bm-onboarding-desc">'+l.desc+'</p>'
                 + '</button>';
          }).join("")
      +   '</div>'
      + '</section>';
  }

  function renderDomainTabs() {
    var host = document.getElementById("bmDomainTabs");
    if (!host || !_bm.data) return;
    var domains = _bm.data.domains;
    var domainTabs = Object.keys(domains).map(function(key, idx){
      var d = domains[key];
      var cls = key === _bm.activeDomain ? "is-active" : "";
      return '<button type="button" class="'+cls+'" data-domain-key="'+key+'">'
        + '<span>'+String(idx+1).padStart(2,'0')+' · '+d.label+'</span>'
        + '<span class="bm-tab-sub">'+d.subtitle+'</span>'
        + '</button>';
    }).join("");
    // 末尾追加"健康仪表盘"伪域 tab
    var healthCls = _bm.activeDomain === "__health__" ? "is-active" : "";
    var healthTab = '<button type="button" class="bm-tab-health '+healthCls+'" data-domain-key="__health__">'
      + '<span>综合 · 健康仪表盘</span>'
      + '<span class="bm-tab-sub">CAMEL 信号灯矩阵</span>'
      + '</button>';
    host.innerHTML = domainTabs + healthTab;
  }

  function resetBenchmarkDrillState() {
    _bm.viewMode = "overview";
    _bm.activeStoryRef = null;
    _bm.returnContext = "overview";
    _bm.expandedDetail = {};
  }

  function setBenchmarkView(mode, opts) {
    opts = opts || {};
    _bm.viewMode = mode || "overview";
    if (opts.domainKey) _bm.activeDomain = opts.domainKey;
    if (opts.storyId) {
      _bm.activeStoryRef = {
        domainKey: opts.domainKey || _bm.activeDomain,
        storyId: opts.storyId
      };
    } else if (_bm.viewMode !== "story") {
      _bm.activeStoryRef = null;
    }
    _bm.returnContext = opts.returnContext || (_bm.viewMode === "domain" ? "overview" : _bm.returnContext || "overview");
    _bm.expandedDetail = {};
    renderDomainTabs();
    renderDomainContent();
  }

  function getStoryMetrics(dom, story) {
    return (story.metrics || []).filter(function(mk){ return dom.items && dom.items[mk]; });
  }

  function metricGapForStory(domKey, metricKey, targetBank, year) {
    if (!_bm.data || !targetBank) return null;
    var dom = _bm.data.domains[domKey];
    var item = dom && dom.items ? dom.items[metricKey] : null;
    if (!item) return null;
    var fullKey = domKey + "." + metricKey;
    var targetVal = valOf(targetBank.id, year, fullKey);
    var peerIds = getPeerGroupIds("national_type", targetBank);
    var peerVal = peerIds.length ? meanOf(peerIds, year, fullKey) : null;
    if (targetVal === null || peerVal === null) return null;
    var gap = targetVal - peerVal;
    var pressure = item.direction === "lower_better" ? gap > 0 : gap < 0;
    return { item: item, metricKey: metricKey, fullKey: fullKey, targetVal: targetVal, peerVal: peerVal, gap: gap, pressure: pressure };
  }

  function scoreStory(domKey, story, targetBank) {
    var dom = _bm.data.domains[domKey];
    var metrics = getStoryMetrics(dom, story);
    var gaps = metrics.map(function(mk){ return metricGapForStory(domKey, mk, targetBank, _bm.snapshotYear); }).filter(Boolean);
    var featured = metrics.filter(function(mk){ return dom.selected && dom.selected.indexOf(mk) >= 0; }).length;
    var gapScore = gaps.reduce(function(sum, g){
      var base = Math.abs(g.peerVal || 0) || 1;
      return sum + Math.abs(g.gap / base);
    }, 0);
    return {
      domainKey: domKey,
      story: story,
      metrics: metrics,
      gaps: gaps,
      score: gapScore + featured * 0.18 + metrics.length * 0.03,
    };
  }

  function getRecommendedStories(targetBank, limit) {
    if (!_bm.data || !targetBank) return [];
    var all = [];
    Object.keys(_bm.data.domains).forEach(function(domKey){
      var dom = _bm.data.domains[domKey];
      (dom.stories || []).forEach(function(story){ all.push(scoreStory(domKey, story, targetBank)); });
    });
    return all.filter(function(s){ return s.metrics.length >= 2; })
      .sort(function(a,b){ return b.score - a.score; })
      .slice(0, limit || 3);
  }

  function renderStorylineCard(rec, index, source) {
    var dom = _bm.data.domains[rec.domainKey];
    var mainGaps = rec.gaps.slice(0, 3);
    var pressureCount = rec.gaps.filter(function(g){ return g.pressure; }).length;
    var tone = pressureCount ? "压力" : "优势";
    var storyRef = rec.domainKey + "/" + rec.story.id;
    var chips = mainGaps.map(function(g){
      var unit = g.item.unit || "";
      var gapText = (g.gap > 0 ? "+" : "") + g.gap.toFixed(2) + (unit === "x" ? "x" : unit);
      return '<span>'+escapeXml(g.item.name)+' '+gapText+'</span>';
    }).join("");
    if (!chips) chips = '<span>该故事线需补充披露数据</span>';
    return '<article class="bm-storyline-card" data-story-card="'+rec.domainKey+'/'+rec.story.id+'">'
      + '<div class="bm-storyline-index">'+pad2(index)+'</div>'
      + '<div class="bm-storyline-main"><span class="bm-storyline-domain">'+escapeXml(dom.label)+'</span>'
      + '<h3>'+escapeXml(rec.story.title)+'</h3><p>'+escapeXml(rec.story.lead || "围绕指标差距形成对标证据链。")+'</p>'
      + '<div class="bm-storyline-chips">'+chips+'</div></div>'
      + '<aside class="bm-storyline-action"><span class="bm-storyline-tone">'+tone+'</span>'
      + '<button type="button" data-open-story-detail="'+storyRef+'" data-story-source="'+source+'">进入详情</button>'
      + renderBenchmarkStorylineActions(storyRef)
      + '</aside>'
      + '</article>';
  }

  function renderBenchmarkOverview(targetBank) {
    var recommended = getRecommendedStories(targetBank, 3);
    var domainKeys = Object.keys(_bm.data.domains);
    return '<section class="bm-layout-overview" id="bmBenchmarkOverview">'
      + '<header class="bm-overview-hero">'
      + '<div><span class="bm-pane-kicker">当前样本</span><h2>'+escapeXml(targetBank.name)+' 数据对标总览</h2>'
      + '<p>'+_bm.snapshotYear+' 截面 · 趋势 '+_bm.trendStart+'–'+_bm.trendEnd+' · 默认展示 3 条优先故事线</p></div>'
      + '<button type="button" class="bm-secondary-action" id="bmOverviewRestart" data-restart-from-overview="1">重新选择样本</button>'
      + '</header>'
      + '<section class="bm-overview-recommendations" aria-label="优先故事线">'
      + recommended.map(function(rec, idx){ return renderStorylineCard(rec, idx + 1, "overview"); }).join("")
      + '</section>'
      + '<section class="bm-overview-domains" aria-label="全部对标域">'
      + '<header><h3>全部对标域</h3><p>进入某个域后查看该域全部故事线。</p></header>'
      + '<div class="bm-domain-entry-grid">'
      + domainKeys.map(function(domKey){
          var dom = _bm.data.domains[domKey];
          var count = (dom.stories || []).length;
          return '<button type="button" class="bm-domain-entry" data-open-domain-list="'+domKey+'">'
            + '<b>'+escapeXml(dom.label)+'</b><span>'+count+' 条故事线</span></button>';
        }).join("")
      + '</div></section></section>';
  }

  function renderDomainStoryList(domKey, targetBank) {
    var dom = _bm.data.domains[domKey];
    var stories = (dom.stories || []).map(function(story){ return scoreStory(domKey, story, targetBank); });
    return '<section class="bm-domain-story-list" id="bmDomainStoryList">'
      + '<header class="bm-domain-list-head"><button type="button" data-back-to-overview="1">回到总览</button>'
      + '<div><span class="bm-pane-kicker">对标域</span><h2>'+escapeXml(dom.label)+'</h2><p>'+escapeXml(dom.subtitle || "")+'</p></div></header>'
      + '<div class="bm-domain-story-grid">'+stories.map(function(rec, idx){ return renderStorylineCard(rec, idx + 1, "domain"); }).join("")+'</div>'
      + '<details class="bm-detail-collapse"><summary>展开该域全量指标</summary><div class="bm-metric-grid">'
      + Object.keys(dom.items).map(function(mkey){ return renderMetricCard(dom, domKey, mkey, dom.items[mkey], targetBank); }).join("")
      + '</div></details></section>';
  }

  function findStoryRef(ref) {
    if (!ref || !_bm.data) return null;
    var dom = _bm.data.domains[ref.domainKey];
    if (!dom) return null;
    var story = (dom.stories || []).filter(function(s){ return s.id === ref.storyId; })[0];
    if (!story) return null;
    return { dom: dom, story: story, domKey: ref.domainKey };
  }

  function benchmarkStorylineId(domKey, story) {
    return domKey + "/" + ((story && story.id) || "story");
  }

  function findBenchmarkStoryByRef(ref) {
    if (!ref || !_bm.data || !_bm.data.domains) return null;
    var parts = String(ref).split("/");
    var domKey = parts[0];
    var storyId = parts.slice(1).join("/") || "story";
    var dom = _bm.data.domains[domKey];
    if (!dom) return null;
    var story = (dom.stories || []).filter(function(s){ return s.id === storyId; })[0];
    if (!story) return null;
    return { domKey: domKey, dom: dom, story: story };
  }

  function getActiveBenchmarkPeers(targetBank) {
    if (!targetBank) return [];
    var ids = [];
    ["national_type","region_type","national_other","custom"].forEach(function(key){
      if (_bm.activePeers[key]) ids = ids.concat(getPeerGroupIds(key, targetBank));
    });
    return ids.filter(function(id, idx, arr){ return id && arr.indexOf(id) === idx; })
      .map(function(id){ return getBank(id); })
      .filter(Boolean);
  }

  function renderBenchmarkStorylineActions(ref) {
    var safeRef = escapeXml(ref);
    return '<button type="button" data-storyline-fact-action="add" data-storyline-ref="'+safeRef+'">加入事实包</button>'
      + '<button type="button" data-storyline-fact-action="image" data-storyline-ref="'+safeRef+'">查看大图</button>'
      + '<button type="button" data-storyline-fact-action="guide" data-storyline-ref="'+safeRef+'">读图指南</button>';
  }

  function buildBenchmarkStoryEvidencePack(ref) {
    var found = findBenchmarkStoryByRef(ref);
    var targetBank = getBank(_bm.selectedBankId);
    if (!found || !targetBank) return null;
    var storyId = benchmarkStorylineId(found.domKey, found.story);
    var rec = scoreStory(found.domKey, found.story, targetBank);
    var metrics = getStoryMetrics(found.dom, found.story);
    var primaryMetricKey = metrics[0];
    var primaryMetric = primaryMetricKey && found.dom.items[primaryMetricKey]
      ? (found.dom.items[primaryMetricKey].name || primaryMetricKey)
      : (found.story.title || storyId);
    var causalNodes = buildStoryCausalNodes(found.domKey, found.story);
    var visual = selectStoryVisualAsset(found.domKey, found.story);
    var facts = rec.gaps.slice(0, 3).map(function(g, idx){
      var unit = g.item.unit || "";
      var gapText = (g.gap > 0 ? "+" : "") + g.gap.toFixed(2) + (unit === "x" ? "x" : unit);
      return {
        factId: storyId + "_fact_" + (idx + 1),
        metric: g.item.name || g.metricKey,
        targetValue: formatVal(g.targetVal, unit),
        peerValue: formatVal(g.peerVal, unit),
        gap: gapText,
        category: g.pressure ? "anomaly" : "peerPosition",
        signalDirection: "support",
        strength: idx === 0 ? "强" : "中",
        source: "Benchmark IQ " + _bm.snapshotYear + " 年数据对标"
      };
    });
    var guideGap = facts[0] ? (facts[0].metric + "：" + facts[0].gap) : (primaryMetric + "：待补充差距");
    return {
      status: "confirmed",
      targetBank: targetBank,
      year: _bm.snapshotYear,
      peerGroup: { banks: getActiveBenchmarkPeers(targetBank) },
      selectedStorylineIds: [storyId],
      recommendedIssues: [{
        issueId: storyId,
        storylineId: storyId,
        title: found.story.title,
        priority: 1,
        primaryMetric: primaryMetric,
        conclusion: found.story.lead || "围绕指标差距形成对标证据链。",
        category: facts[0] && facts[0].category || "peerPosition",
        evidence: facts.length ? facts : [{
          factId: storyId + "_fact_1",
          metric: primaryMetric,
          targetValue: "",
          peerValue: "",
          gap: "待补充",
          category: "peerPosition",
          signalDirection: "support",
          strength: "待补",
          source: "Benchmark IQ " + _bm.snapshotYear + " 年数据对标"
        }],
        charts: [{
          chartId: storyId + "_chart_1",
          title: found.story.title + "｜对标证据图",
          src: visual.src,
          enlargedSrc: visual.src,
          readingGuide: {
            whatToSee: visual.caption || ("先看" + primaryMetric + "的目标行与对标组差距。"),
            keyGap: guideGap,
            supports: found.story.lead || "支持当前故事线判断。",
            reportUse: "适合放入专题归因页或证据地图页，作为报告主图。",
            source: "Benchmark IQ 数据对标页"
          },
          sourceFactIds: facts.slice(0, 3).map(function(f){ return f.factId; })
        }],
        causalChain: {
          resultMetric: primaryMetric,
          directCause: causalNodes[1] && causalNodes[1].metric || causalNodes[0] && causalNodes[0].metric || "待确认直接原因",
          structureCause: causalNodes[2] && causalNodes[2].metric || causalNodes[1] && causalNodes[1].metric || "待确认结构原因",
          recommendedAction: causalNodes[3] && ("复核" + causalNodes[3].metric + "管理动作") || "围绕指标差距形成管理层复核清单。"
        }
      }]
    };
  }

  function mergeStorylineFactPacks(existing, nextPack, selectedIds) {
    var selectedMap = {};
    selectedIds.forEach(function(id){ if (id) selectedMap[id] = true; });
    var storyMap = {};
    (existing && existing.storylines || []).concat(nextPack && nextPack.storylines || []).forEach(function(storyline){
      if (!storyline || !storyline.storylineId) return;
      storyMap[storyline.storylineId] = Object.assign({}, storyline, {
        selected: !!selectedMap[storyline.storylineId]
      });
    });
    return {
      version: "storyline-fact-pack-v1",
      status: nextPack && nextPack.status || existing && existing.status || "partial",
      context: nextPack && nextPack.context || existing && existing.context || {},
      selectedStorylineIds: selectedIds,
      storylines: Object.keys(storyMap).map(function(id){ return storyMap[id]; })
    };
  }

  function ensureStorylineFactPackFromBenchmarkStory(ref) {
    if (typeof window.buildStorylineFactPack !== "function" || typeof window.saveStorylineFactPack !== "function") return null;
    var sourcePack = buildBenchmarkStoryEvidencePack(ref);
    if (!sourcePack) return null;
    var storyId = sourcePack.selectedStorylineIds[0];
    var existing = typeof window.readStorylineFactPack === "function" ? window.readStorylineFactPack() : null;
    var selectedIds = (existing && existing.selectedStorylineIds || []).slice();
    if (selectedIds.indexOf(storyId) < 0) selectedIds.push(storyId);
    var nextPack = window.buildStorylineFactPack(sourcePack, { selectedStorylineIds: selectedIds });
    var mergedPack = mergeStorylineFactPacks(existing, nextPack, selectedIds);
    window.saveStorylineFactPack(mergedPack);
    if (typeof window.renderStorylineFactPackControls === "function") window.renderStorylineFactPackControls();
    return mergedPack;
  }

  function openBenchmarkStorylineChart(ref) {
    var pack = ensureStorylineFactPackFromBenchmarkStory(ref);
    if (!pack || typeof window.openStorylineChartViewer !== "function") return null;
    var found = findBenchmarkStoryByRef(ref);
    var storyId = found ? benchmarkStorylineId(found.domKey, found.story) : String(ref || "");
    var storyline = (pack.storylines || []).filter(function(item){ return item.storylineId === storyId; })[0];
    var chart = storyline && storyline.charts && storyline.charts[0];
    if (chart) return window.openStorylineChartViewer(chart);
    return null;
  }

  function refreshStorylineFactPackControls() {
    if (typeof window.renderStorylineFactPackControls === "function") window.renderStorylineFactPackControls();
  }

  function renderStoryRelationMap(rec, targetBank) {
    var nodes = rec.gaps.slice(0, 4);
    if (!nodes.length) return '';
    return '<section class="bm-story-relation-map" data-return-causal-chain="1">'
      + '<header><span class="bm-pane-kicker">故事性关联图</span><h3>结果指标到原因指标的传导链</h3></header>'
      + '<div class="bm-relation-chain">'
      + nodes.map(function(g, idx){
          var unit = g.item.unit || "";
          var gapText = (g.gap > 0 ? "+" : "") + g.gap.toFixed(2) + (unit === "x" ? "x" : unit);
          return '<button type="button" class="bm-relation-node" data-causal-chain-key="'+g.fullKey+'">'
            + '<span>'+(idx === 0 ? "结果" : "原因 "+idx)+'</span><b>'+escapeXml(g.item.name)+'</b>'
            + '<em>'+escapeXml(targetBank.name)+' '+formatVal(g.targetVal, unit)+' / 同类 '+formatVal(g.peerVal, unit)+' / 差距 '+gapText+'</em></button>';
        }).join('<i class="bm-relation-arrow">→</i>')
      + '</div></section>';
  }

  var STORY_VISUAL_ASSETS = {
    profitability: [
      { src: "assets/figures/图2-5_ROA七因子五年变动对比.png", label: "ROA 七因子", keywords: ["ROA", "ROE", "利润", "归因", "成本"], caption: "利润传导图：ROA、收入结构、成本收入比与拨备共同解释 ROE。" },
      { src: "assets/figures/图2-1_核心与非核心收入分化散点.png", label: "收入分化", keywords: ["收入", "核心", "非息", "手续费"], caption: "收入结构图：核心收入和非息收入的分化决定盈利弹性。" },
      { src: "assets/figures/图1-2_四类银行收入结构堆叠对比.png", label: "收入结构", keywords: ["收入结构", "利息", "非息"], caption: "收入结构堆叠图：用四类银行对比说明收入来源差异。" }
    ],
    nim: [
      { src: "assets/figures/图3-3_息差缺口与负债成本对照.png", label: "息差与负债成本", keywords: ["NIM", "息差", "负债成本", "定期化"], caption: "资产负债传导图：生息资产收益率、负债成本和存款定期化共同解释 NIM。" },
      { src: "assets/figures/图3-1_息差对冲缺口横向排名.png", label: "息差缺口排名", keywords: ["息差", "缺口", "排名"], caption: "息差缺口图：横向比较目标行相对同业的息差防守能力。" },
      { src: "assets/figures/图3-6_息差缺口与风险调整收益双面板.png", label: "风险调整收益", keywords: ["收益", "风险调整", "贷款收益"], caption: "收益成色图：把名义息差和风险调整收益放在同一证据链中。" }
    ],
    deposit: [
      { src: "assets/figures/图3-2_存款结构与五区域定期占比.png", label: "存款结构", keywords: ["存款", "定期", "活期", "负债"], caption: "负债底盘图：活期、定期、零售和对公存款结构解释负债成本弹性。" },
      { src: "assets/figures/图3-3_息差缺口与负债成本对照.png", label: "负债成本", keywords: ["成本", "息差", "定期化"], caption: "负债成本图：定期化率与负债成本共同影响净息差。" }
    ],
    quality: [
      { src: "assets/figures/图4-5_偏离度覆盖率样本散点.png", label: "偏离度覆盖率", keywords: ["偏离", "拨备", "覆盖", "不良"], caption: "风险确认图：偏离度、关注率、不良率和拨备覆盖率共同解释资产质量压力。" },
      { src: "assets/figures/图4-2_逾期偏离度哑铃图.png", label: "逾期偏离", keywords: ["逾期", "偏离", "不良"], caption: "风险迁徙图：逾期偏离度说明风险确认是否滞后。" },
      { src: "assets/figures/图4-6_区域风险缓冲热力矩阵.png", label: "风险缓冲", keywords: ["风险", "缓冲", "区域"], caption: "风险缓冲图：用区域矩阵识别资产质量和拨备的组合压力。" }
    ],
    loan_corp: [
      { src: "assets/figures/图4-6_区域风险缓冲热力矩阵.png", label: "行业风险缓冲", keywords: ["行业", "对公", "风险", "不良"], caption: "行业暴露图：行业占比、不良率与风险缓冲共同定位对公风险区。" },
      { src: "assets/figures/图3-4_贷款收益成色桥图.png", label: "贷款收益成色", keywords: ["贷款", "收益", "成色"], caption: "贷款成色图：从贷款收益到风险调整收益解释对公业务质量。" }
    ],
    loan_retail: [
      { src: "assets/figures/图4-1_零售不良率行业与区域双面板.png", label: "零售不良", keywords: ["零售", "消费", "按揭", "不良"], caption: "零售风险图：零售贷款结构和不良率变化解释零售资产质量。" },
      { src: "assets/figures/补充图表_零售不良逾期_哑铃图_2023-2025_16x9__补充图表_零售不良逾期_方案D_哑铃与三年轨迹_四类银行_16x9.png", label: "零售逾期轨迹", keywords: ["零售", "逾期", "轨迹"], caption: "零售迁徙图：用逾期与不良的变化轨迹识别风险暴露。" }
    ],
    ifrs9: [
      { src: "assets/figures/图4-4_拨备策略六分类备档.png", label: "拨备策略", keywords: ["IFRS9", "阶段", "拨备", "减值"], caption: "拨备策略图：IFRS9 阶段分布与拨备充足性解释风险抵补。" },
      { src: "assets/figures/图4-4_利润质量四象限.png", label: "利润质量", keywords: ["利润", "减值", "拨备"], caption: "利润质量图：信用减值和利润表现共同判断风险释放程度。" }
    ],
    capital: [
      { src: "assets/figures/图5-1_资本效率四象限.png", label: "资本效率", keywords: ["资本", "ROE", "RWA", "效率"], caption: "资本效率图：资本充足率、RWA 密度和 ROE 共同解释增长约束。" },
      { src: "assets/figures/图5-2_资本余量与RWA缺口双图.png", label: "资本余量", keywords: ["资本", "余量", "缺口"], caption: "资本余量图：资本缓冲和 RWA 缺口决定资产扩张空间。" },
      { src: "assets/figures/图5-3_资本压力指数全员排序.png", label: "资本压力排序", keywords: ["压力", "排序", "资本"], caption: "资本压力图：用全样本排序定位目标行资本压力。" }
    ],
    liquidity: [
      { src: "assets/figures/图5-2_资本余量与RWA缺口双图.png", label: "安全边际", keywords: ["流动性", "安全", "余量", "缺口"], caption: "安全边际图：流动性和资本余量共同约束资产扩张节奏。" },
      { src: "assets/figures/图5-4_五区域城农商三指标对比.png", label: "区域安全边际", keywords: ["区域", "流动性", "存贷比"], caption: "区域对比图：把流动性指标放入区域同业参照中判断安全边际。" }
    ]
  };

  function storyVisualKeywords(story) {
    return [
      story && story.title,
      story && story.lead,
      story && story.chart,
      (story && story.metrics || []).join(" ")
    ].join(" ");
  }

  function selectStoryVisualAsset(domKey, story) {
    var options = STORY_VISUAL_ASSETS[domKey] || [];
    if (!options.length) {
      return { src: "assets/sunong_ref/cover-bg.png", label: "通用咨询底图", caption: "使用报告式信息图承载该故事线的指标关系。", fallback: true };
    }
    var haystack = storyVisualKeywords(story);
    var scored = options.map(function(opt){
      var score = (opt.keywords || []).reduce(function(sum, kw){
        return sum + (haystack.indexOf(kw) >= 0 ? 1 : 0);
      }, 0);
      return { option: opt, score: score };
    }).sort(function(a,b){ return b.score - a.score; });
    return scored[0].option || options[0];
  }

  function renderStoryVisualAssetOptions(domKey, activeAsset) {
    var options = STORY_VISUAL_ASSETS[domKey] || [];
    if (options.length < 2) return '';
    return '<div class="bm-story-visual-options" aria-label="可替换图库素材">'
      + options.slice(0, 3).map(function(opt){
          var active = activeAsset && opt.src === activeAsset.src ? " is-active" : "";
          return '<button type="button" class="bm-story-visual-option'+active+'" data-story-visual-src="'+escapeXml(opt.src)+'">'
            + '<img loading="lazy" src="'+escapeXml(opt.src)+'" alt="'+escapeXml(opt.label)+'" />'
            + '<span>'+escapeXml(opt.label)+'</span></button>';
        }).join("")
      + '</div>';
  }

  function buildStoryCausalNodes(domKey, story) {
    var targetBank = getBank(_bm.selectedBankId);
    if (!targetBank || !_bm.data || !_bm.data.domains) return [];
    var dom = _bm.data.domains[domKey];
    if (!dom) return [];
    var metrics = getStoryMetrics(dom, story).slice(0, 4);
    return metrics.map(function(mk, idx){
      var g = metricGapForStory(domKey, mk, targetBank, _bm.snapshotYear);
      var item = dom.items[mk] || {};
      var unit = item.unit || "";
      var gapText = g ? ((g.gap > 0 ? "+" : "") + g.gap.toFixed(2) + (unit === "x" ? "x" : unit)) : "";
      return {
        role: idx === 0 ? "结果" : "原因 " + idx,
        domainKey: domKey,
        metricKey: domKey + "." + mk,
        metric: item.name || mk,
        targetValue: g ? formatVal(g.targetVal, unit) : "",
        peerValue: g ? formatVal(g.peerVal, unit) : "",
        gap: gapText,
        pressure: g ? !!g.pressure : false,
      };
    });
  }

  function renderConsultingVisual(domKey, story) {
    var visual = selectStoryVisualAsset(domKey, story);
    return '<figure class="bm-consulting-visual">'
      + '<div class="bm-consulting-visual-media">'
      + '<img loading="lazy" src="'+escapeXml(visual.src)+'" alt="'+escapeXml(story.title)+' 相关咨询图表" />'
      + '</div>'
      + '<figcaption><span class="bm-pane-kicker">咨询风格证据图</span><h3>'+escapeXml(story.title)+'</h3>'
      + '<p>'+escapeXml(visual.caption)+'</p>'
      + renderStoryVisualAssetOptions(domKey, visual)
      + '</figcaption></figure>';
  }

  function renderAudienceVisualEvidence(dom, domKey, targetBank, audience) {
    var labels = {
      board: { kicker: "董办判断图", title: "用一张图看清本章主线", note: "优先呈现能解释管理层判断的主题图片。" },
      cfo: { kicker: "财务指标图", title: "把指标差距放进同一张证据图", note: "优先呈现利润、息差、负债成本、资本效率等可量化链条。" },
      cro: { kicker: "风险关系图", title: "把预警信号放进风险传导链", note: "优先呈现资产质量、行业暴露、拨备和安全边际。" },
      expert: { kicker: "专题证据图", title: "主题故事线图库", note: "保留图库选择和故事线联动。" }
    };
    var meta = labels[audience] || labels.expert;
    var stories = (dom.stories || []).map(function(story){
      return scoreStory(domKey, story, targetBank);
    }).sort(function(a, b){ return b.score - a.score; }).slice(0, audience === "cfo" ? 2 : 1);
    if (!stories.length) return "";
    return '<section class="bm-audience-visual-section" data-audience-visual="'+escapeXml(audience)+'">'
      + '<header class="bm-flow-section-head">'
      + '<span class="bm-flow-section-num">图</span>'
      + '<h3 class="bm-flow-section-title">'+escapeXml(meta.title)+'</h3>'
      + '<span class="bm-flow-section-meta">'+escapeXml(meta.note)+'</span>'
      + '</header>'
      + '<div class="bm-audience-visual-grid">'
      + stories.map(function(rec){
          var story = rec.story;
          var visual = selectStoryVisualAsset(domKey, story);
          var chain = rec.gaps.slice(0, 3).map(function(g){ return g.item.name; }).join(" → ");
          return '<figure class="bm-audience-visual-card">'
            + '<div class="bm-audience-visual-media"><img loading="lazy" src="'+escapeXml(visual.src)+'" alt="'+escapeXml(story.title)+' 主题证据图" /></div>'
            + '<figcaption>'
            + '<span class="bm-pane-kicker">'+escapeXml(meta.kicker)+'｜'+escapeXml(visual.label || "证据图")+'</span>'
            + '<h4>'+escapeXml(story.title)+'</h4>'
            + '<p>'+escapeXml(visual.caption || story.lead || "")+'</p>'
            + (chain ? '<em>'+escapeXml(chain)+'</em>' : '')
            + '</figcaption>'
            + '</figure>';
        }).join("")
      + '</div>'
      + '</section>';
  }

  window.getBenchmarkStoryVisualAsset = function(domKey, story) {
    return selectStoryVisualAsset(domKey, story);
  };
  window.getBenchmarkStoryCausalNodes = function(domKey, story) {
    return buildStoryCausalNodes(domKey, story);
  };

  function renderStoryDetail(targetBank) {
    var found = findStoryRef(_bm.activeStoryRef);
    if (!found) return renderBenchmarkOverview(targetBank);
    var rec = scoreStory(found.domKey, found.story, targetBank);
    var dom = found.dom;
    var stories = dom.stories || [];
    var idx = stories.findIndex(function(s){ return s.id === found.story.id; });
    if (idx < 0) idx = 0;
    var prev = stories[(idx - 1 + stories.length) % stories.length] || found.story;
    var next = stories[(idx + 1) % stories.length] || found.story;
    var detailChart = renderStoryCard(dom, found.domKey, found.story, idx + 1, stories.length, targetBank);
    var storyRef = benchmarkStorylineId(found.domKey, found.story);
    return '<section class="bm-story-detail" id="bmStoryDetail">'
      + '<nav class="bm-story-detail-topbar">'
      + '<button type="button" id="bmBackToOverview" data-back-to-overview="1">回到总览</button>'
      + '<button type="button" id="bmBackToDomain" data-back-to-domain="'+found.domKey+'">回到'+escapeXml(dom.label)+'</button>'
      + '<button type="button" id="bmPrevStory" data-open-story-detail="'+found.domKey+'/'+prev.id+'" data-story-source="detail">上一条</button>'
      + '<button type="button" id="bmNextStory" data-open-story-detail="'+found.domKey+'/'+next.id+'" data-story-source="detail">下一条</button>'
      + '</nav>'
      + '<header class="bm-story-detail-head"><span class="bm-pane-kicker">'+escapeXml(dom.label)+'</span><h2>'+escapeXml(found.story.title)+'</h2><p>'+escapeXml(found.story.lead || "")+'</p>'
      + '<div class="bm-storyline-action bm-story-detail-actions">'+renderBenchmarkStorylineActions(storyRef)+'</div></header>'
      + renderStoryRelationMap(rec, targetBank)
      + renderConsultingVisual(found.domKey, found.story)
      + '<section class="bm-story-detail-chart">'+detailChart+'</section>'
      + '<details class="bm-detail-collapse"><summary data-story-detail-toggle="metrics">展开指标明细</summary>'+renderMatrixView(dom, found.domKey, targetBank)+'</details>'
      + '<details class="bm-detail-collapse"><summary data-story-detail-toggle="visual">展开图库来源说明</summary><p class="bm-visual-source-note">本故事线默认展示项目内 <code>assets/figures/</code> 的报告图表素材；后续可替换为更细分的咨询图库图片。</p></details>'
      + '</section>';
  }

  // ---------- 8. 右侧：域内容 ----------
  function renderDomainContent() {
    var empty = document.getElementById("bmEmpty");
    var host = document.getElementById("bmDomainContent");
    if (!empty || !host || !_bm.data) return;
    try {
    if (!_bm.selectedBankId) {
      empty.classList.remove("is-hidden");
      empty.hidden = false;
      host.hidden = true;
      return;
    }
    empty.classList.add("is-hidden");
    empty.hidden = true;
    host.hidden = false;

    var b = getBank(_bm.selectedBankId);
    // 首次进入：audience 未选，显示引导卡
    if (!_bm.audience) {
      renderAudienceOnboarding();
      return;
    }
    // 综合视图：健康仪表盘伪域（显式切到）
    if (_bm.activeDomain === "__health__") {
      host.innerHTML = renderHealthMatrix(b);
      return;
    }
    // 未选银行：landing = 健康仪表盘封面页
    if (!b) {
      host.innerHTML = renderHealthMatrix(null);
      return;
    }
    if (_bm.viewMode === "overview") {
      host.innerHTML = renderBenchmarkOverview(b);
      return;
    }
    if (_bm.viewMode === "story") {
      host.innerHTML = renderStoryDetail(b);
      return;
    }
    var dom = _bm.data.domains[_bm.activeDomain];
    if (!dom) { host.innerHTML = ''; return; }

    if (_bm.viewMode === "domain" && _bm.audience === "expert") {
      host.innerHTML = renderDomainStoryList(_bm.activeDomain, b);
      return;
    }

    // === 按 audience 分发 ===
    if (_bm.audience === "board") { host.innerHTML = renderAudienceBoardView(dom, _bm.activeDomain, b); return; }
    if (_bm.audience === "cfo")   { host.innerHTML = renderAudienceCFOView(dom, _bm.activeDomain, b);   return; }
    if (_bm.audience === "cro")   { host.innerHTML = renderAudienceCROView(dom, _bm.activeDomain, b);   return; }
    // expert 走原有完整逻辑（连贯阅读流），不动
    var stories = dom.stories || [];

    // 域索引（章节 N of M）
    var allDomainKeys = Object.keys(_bm.data.domains);
    var chapIdx = allDomainKeys.indexOf(_bm.activeDomain) + 1;
    var chapTotal = allDomainKeys.length;

    // === 章节评分卡（KPMG / 360factors 风：分位 + 排名） ===
    var score = computeChapterScore(dom, _bm.activeDomain, b, _bm.snapshotYear);
    var scoreCardHtml = renderScoreCard(score, b);

    // === 章节 hero ===
    var heroHtml =
      '<header class="bm-chapter-hero" id="flow-top">'
    + '  <div class="bm-chapter-text">'
    + '    <div class="bm-chapter-num">第 '+pad2(chapIdx)+' 章 · 共 '+pad2(chapTotal)+' 章 &nbsp;·&nbsp; '+escapeXml(dom.label)+'</div>'
    + '    <h2 class="bm-chapter-title">'+escapeXml(dom.label)+'</h2>'
    + '    <p class="bm-chapter-sub">'+escapeXml(dom.subtitle)+'</p>'
    + (dom.thesis ? '    <p class="bm-chapter-thesis">'+escapeXml(dom.thesis)+'</p>' : '')
    + '    <nav class="bm-flow-toc" aria-label="本章目录">'
    + '      <span class="bm-flow-toc-label">阅读流</span>'
    + '      <a href="#flow-top"     class="bm-flow-toc-link"><span>01</span>评分</a>'
    + '      <a href="#flow-stories" class="bm-flow-toc-link"><span>02</span>故事线 · '+stories.length+'</a>'
    + '      <a href="#flow-matrix"  class="bm-flow-toc-link"><span>03</span>对标矩阵</a>'
    + '      <a href="#flow-all"     class="bm-flow-toc-link"><span>04</span>全量 · '+Object.keys(dom.items).length+'</a>'
    + '    </nav>'
    + '  </div>'
    + '  <aside class="bm-chapter-side">'
    + scoreCardHtml
    + '  </aside>'
    + '</header>'
    + renderDomainDecomposition(_bm.activeDomain, b, _bm.snapshotYear);

    // === 故事线路径行（folio rail，水平） ===
    var pathHtml = '';
    if (_bm.mode === 'stories' && stories.length) {
      var pathItems = stories.map(function(s, idx){
        return '<a class="bm-path-item" href="#story-'+s.id+'">'
             + '<span class="bm-path-num">'+pad2(idx+1)+'</span>'
             + escapeXml(s.title) + '</a>';
      });
      pathHtml = '<nav class="bm-chapter-path">'
              + pathItems.join('<span class="bm-path-sep">/</span>')
              + '</nav>';
    }

    // === 图例 ===
    var legendHtml = '<div class="bm-legend">'
      + '<span><i class="is-target"></i>'+escapeXml(b.name)+'</span>'
      + (_bm.activePeers.national_type ? '<span><i class="is-peer-national"></i>全国同类均值</span>' : '')
      + (_bm.activePeers.region_type   ? '<span><i class="is-peer-region"></i>本地同类均值</span>' : '')
      + (_bm.activePeers.national_other? '<span><i class="is-peer-cross"></i>全行业均值</span>' : '')
      + (_bm.activePeers.custom        ? '<span><i class="is-peer-custom"></i>自选对标</span>' : '')
      + '<span class="bm-legend-band"><i class="bm-band-inner"></i><i class="bm-band-outer"></i>分布 P25–P75 / P10–P90</span>'
      + '<span class="bm-legend-spacer">截面 ' + _bm.snapshotYear + ' 年末 · 趋势 ' + _bm.trendStart + '–' + _bm.trendEnd + '</span>'
      + '</div>';

    // === 主区：连贯阅读流（微观→中观→宏观）===
    // ① 故事线（含关系图压轴）— 默认展开
    var storyPieces = [];
    if (stories.length) {
      stories.forEach(function(s, idx){
        storyPieces.push(renderStoryCard(dom, _bm.activeDomain, s, idx + 1, stories.length, b));
        if (idx < stories.length - 1 && s.bridge_to_next) {
          storyPieces.push(renderBridge(s.bridge_to_next));
        }
      });
    }
    var storiesHtml = ''
      + '<section class="bm-flow-section" id="flow-stories">'
      +   '<header class="bm-flow-section-head">'
      +     '<span class="bm-flow-section-num">02</span>'
      +     '<h3 class="bm-flow-section-title">故事线叙事</h3>'
      +     '<span class="bm-flow-section-meta">'+stories.length+' 张图 · 桥接句串联</span>'
      +   '</header>'
      +   '<div class="bm-story-grid">' + storyPieces.join("") + '</div>'
      + '</section>';

    // ② 对标矩阵 — 折叠默认收起
    var matrixHtml = ''
      + '<section class="bm-flow-section bm-flow-collapsible" id="flow-matrix">'
      +   '<details>'
      +     '<summary class="bm-flow-section-head">'
      +       '<span class="bm-flow-section-num">03</span>'
      +       '<h3 class="bm-flow-section-title">对标矩阵</h3>'
      +       '<span class="bm-flow-section-meta">'+dom.selected.length+' 精选指标 × 对标银行 · 密集表 · 点击展开</span>'
      +     '</summary>'
      +     renderMatrixView(dom, _bm.activeDomain, b)
      +   '</details>'
      + '</section>';

    // ③ 全量指标 — 折叠默认收起
    var allCards = Object.keys(dom.items).map(function(mkey){
      var item = dom.items[mkey];
      if (!item) return '';
      return renderMetricCard(dom, _bm.activeDomain, mkey, item, b);
    }).join("");
    var allHtml = ''
      + '<section class="bm-flow-section bm-flow-collapsible" id="flow-all">'
      +   '<details>'
      +     '<summary class="bm-flow-section-head">'
      +       '<span class="bm-flow-section-num">04</span>'
      +       '<h3 class="bm-flow-section-title">全量指标卡</h3>'
      +       '<span class="bm-flow-section-meta">'+Object.keys(dom.items).length+' 个指标 · 单卡含趋势+分位 · 点击展开</span>'
      +     '</summary>'
      +     '<div class="bm-metric-grid">' + allCards + '</div>'
      +   '</details>'
      + '</section>';

    var mainHtml = storiesHtml + matrixHtml + allHtml;

    host.innerHTML = heroHtml + pathHtml + legendHtml + mainHtml;
    } finally {
      refreshStorylineFactPackControls();
    }
  }

  function pad2(n) { return n < 10 ? "0" + n : String(n); }

  // ============================================================
  // 9g. audience-specific views: board / cfo / cro
  // ============================================================

  // === 董办版：1 个 Score Card + 4 张关键图 + 3 条事实结论 ===
  function renderAudienceBoardView(dom, domKey, b) {
    var year = _bm.snapshotYear;
    var score = computeChapterScore(dom, domKey, b, year);

    // 4 张关键问题图：按 domain 决定
    // 用每个 domain 的 selected 前 4 个指标
    var keyMetrics = (dom.selected || []).slice(0, 4);
    var rows = keyMetrics.map(function(mk){
      var item = dom.items[mk]; if (!item) return null;
      var metricKey = domKey + "." + mk;
      var tVal = valOf(b.id, year, metricKey);
      var series = [{ cls: "is-target", label: b.name, value: tVal }];
      // 仅加全国同类均值（董办看简洁）
      var natIds = getPeerGroupIds("national_type", b);
      if (natIds.length) {
        var m = meanOf(natIds, year, metricKey);
        if (m !== null) series.push({ cls: "is-peer-national", label: "全国" + b.type_short + "均值", value: m });
      }
      // 全国分布（分位带）
      var distVals = [];
      _bm.data.banks.forEach(function(bb){
        var v = valOf(bb.id, year, metricKey);
        if (v !== null && !isNaN(v)) distVals.push(v);
      });
      var dist = null;
      if (distVals.length >= 5) {
        dist = {
          p10: quantile(distVals, 0.10),
          p25: quantile(distVals, 0.25),
          p50: quantile(distVals, 0.50),
          p75: quantile(distVals, 0.75),
          p90: quantile(distVals, 0.90),
          n:   distVals.length,
        };
      }
      return { mkey: mk, name: item.name, unit: item.unit, direction: item.direction,
               kind: item.kind || "base", series: series, dist: dist };
    }).filter(Boolean);

    var chartSvg = renderGroupBarChart(rows);

    // 3 条事实结论
    var conclusions = [];
    if (score) {
      conclusions.push('本章综合分位 <b>P' + score.percentile + '</b>，全国 ' + score.total + ' 家中排第 <b>' + score.rank + '</b>。');
      if (score.driverTop) {
        conclusions.push('拉高项：<b>' + escapeXml(score.driverTop.name) + '</b> 居于 P' + score.driverTop.percentile + '，' + (score.driverTop.dev !== null ? (score.driverTop.dev > 0 ? '+' : '') + score.driverTop.dev.toFixed(2) + (score.driverTop.unit === 'x' ? 'x' : score.driverTop.unit) + ' vs 同类均值。' : '同类均值缺。'));
      }
      if (score.driverBottom && score.driverBottom !== score.driverTop) {
        conclusions.push('拉低项：<b>' + escapeXml(score.driverBottom.name) + '</b> 居于 P' + score.driverBottom.percentile + '，' + (score.driverBottom.dev !== null ? (score.driverBottom.dev > 0 ? '+' : '') + score.driverBottom.dev.toFixed(2) + (score.driverBottom.unit === 'x' ? 'x' : score.driverBottom.unit) + ' vs 同类均值。' : '同类均值缺。'));
      }
    } else {
      conclusions.push('本章数据不足，无法形成评分。');
    }

    var scoreCardHtml = renderScoreCard(score, b);

    return ''
      + '<header class="bm-chapter-hero bm-board-hero">'
      +   '<div class="bm-chapter-text">'
      +     '<div class="bm-chapter-num">董办版 · ' + escapeXml(dom.label) + '</div>'
      +     '<h2 class="bm-chapter-title">' + escapeXml(dom.label) + '</h2>'
      +     '<p class="bm-chapter-sub">' + escapeXml(dom.subtitle) + '</p>'
      +     '<div class="bm-board-actions">'
      +       '<button class="bm-board-export" onclick="window.print()">打印为董事会 PDF</button>'
      +     '</div>'
      +   '</div>'
      +   '<aside class="bm-chapter-side">' + scoreCardHtml + '</aside>'
      + '</header>'
      + renderDomainDecomposition(domKey, b, year)
      + renderAudienceVisualEvidence(dom, domKey, b, "board")
      + '<section class="bm-board-chart-section">'
      +   '<header class="bm-board-chart-head">'
      +     '<h3>关键问题图 · 本章 ' + rows.length + ' 个核心指标</h3>'
      +     '<p>目标行 vs 全国' + b.type_short + '均值 vs 全国分布 P10–P90 / P25–P75 / P50</p>'
      +   '</header>'
      +   '<div class="bm-board-chart-body"><div class="bm-group-chart">' + chartSvg + '</div></div>'
      + '</section>'
      + '<section class="bm-board-conclusion">'
      +   '<header><h3>事实结论 · 3 条</h3><p>仅陈述指标关系，不给动作建议。</p></header>'
      +   '<ol class="bm-board-conclusion-list">'
      +     conclusions.map(function(c){ return '<li>'+c+'</li>'; }).join("")
      +   '</ol>'
      + '</section>';
  }

  // === 财务版：mini Score Card + 对标矩阵全开 + 全量指标卡 ===
  function renderAudienceCFOView(dom, domKey, b) {
    var score = computeChapterScore(dom, domKey, b, _bm.snapshotYear);
    var scoreCardHtml = renderScoreCard(score, b);

    var matrixHtml = renderMatrixView(dom, domKey, b);

    var allCards = Object.keys(dom.items).map(function(mkey){
      var item = dom.items[mkey];
      if (!item) return '';
      return renderMetricCard(dom, domKey, mkey, item, b);
    }).join("");

    return ''
      + '<header class="bm-chapter-hero">'
      +   '<div class="bm-chapter-text">'
      +     '<div class="bm-chapter-num">财务版 · ' + escapeXml(dom.label) + '</div>'
      +     '<h2 class="bm-chapter-title">' + escapeXml(dom.label) + '</h2>'
      +     '<p class="bm-chapter-sub">' + escapeXml(dom.subtitle) + '</p>'
      +     '<div class="bm-board-actions">'
      +       '<button class="bm-board-export" onclick="alert(\'Excel 导出：开发中 — 当前可手动右键 → 另存网页\')">导出 Excel</button>'
      +     '</div>'
      +   '</div>'
      +   '<aside class="bm-chapter-side">' + scoreCardHtml + '</aside>'
      + '</header>'
      + renderDomainDecomposition(domKey, b, _bm.snapshotYear)
      + renderAudienceVisualEvidence(dom, domKey, b, "cfo")
      + '<section class="bm-flow-section">'
      +   '<header class="bm-flow-section-head">'
      +     '<span class="bm-flow-section-num">01</span>'
      +     '<h3 class="bm-flow-section-title">对标矩阵</h3>'
      +     '<span class="bm-flow-section-meta">' + dom.selected.length + ' 精选指标 × 对标银行</span>'
      +   '</header>'
      +   matrixHtml
      + '</section>'
      + '<section class="bm-flow-section">'
      +   '<header class="bm-flow-section-head">'
      +     '<span class="bm-flow-section-num">02</span>'
      +     '<h3 class="bm-flow-section-title">全量指标卡</h3>'
      +     '<span class="bm-flow-section-meta">' + Object.keys(dom.items).length + ' 个指标 · 含趋势 + 分位带</span>'
      +   '</header>'
      +   '<div class="bm-metric-grid">' + allCards + '</div>'
      + '</section>';
  }

  // === 风险版：全行业 CAMEL mini + 目标行 KRI 红黄绿 + 风险关系图 + 同比变化 ===
  function renderAudienceCROView(dom, domKey, b) {
    var year = _bm.snapshotYear;
    var prevYear = year - 1;

    // 当前 domain 的 selected 指标作为 KRI
    var kriRows = (dom.selected || []).map(function(mkey){
      var item = dom.items[mkey];
      if (!item) return null;
      var metricKey = domKey + "." + mkey;
      var tVal = valOf(b.id, year, metricKey);
      var prevVal = valOf(b.id, prevYear, metricKey);
      var allVals = [];
      _bm.data.banks.forEach(function(bb){
        var v = valOf(bb.id, year, metricKey);
        if (v !== null) allVals.push(v);
      });
      if (allVals.length < 5 || tVal === null) {
        return { name: item.name, unit: item.unit, val: tVal, prevVal: prevVal,
                 percentile: null, signal: "na", direction: item.direction };
      }
      var sorted = allVals.slice().sort(function(a,b){
        return item.direction === "higher_better" ? b-a : a-b;
      });
      var rank = sorted.indexOf(tVal) + 1;
      if (rank === 0) rank = sorted.length;
      var pct = Math.round((1 - rank / sorted.length) * 100);
      var signal = pct >= 70 ? "g" : (pct >= 40 ? "y" : "r");
      // 同比信号变化
      var prevSignal = null;
      if (prevVal !== null) {
        var prevAllVals = [];
        _bm.data.banks.forEach(function(bb){
          var v = valOf(bb.id, prevYear, metricKey);
          if (v !== null) prevAllVals.push(v);
        });
        if (prevAllVals.length >= 5) {
          var prevSorted = prevAllVals.slice().sort(function(a,b){
            return item.direction === "higher_better" ? b-a : a-b;
          });
          var prevRank = prevSorted.indexOf(prevVal) + 1;
          if (prevRank === 0) prevRank = prevSorted.length;
          var prevPct = Math.round((1 - prevRank / prevSorted.length) * 100);
          prevSignal = prevPct >= 70 ? "g" : (prevPct >= 40 ? "y" : "r");
        }
      }
      return { name: item.name, unit: item.unit, val: tVal, prevVal: prevVal,
               percentile: pct, signal: signal, prevSignal: prevSignal,
               direction: item.direction, rank: rank, total: sorted.length };
    }).filter(Boolean);

    // 排序：红 → 黄 → 绿
    var sigOrder = { r: 0, y: 1, g: 2, na: 3 };
    kriRows.sort(function(a,b){ return sigOrder[a.signal] - sigOrder[b.signal]; });

    // 同比变化日志
    var changes = [];
    kriRows.forEach(function(r){
      if (r.prevSignal && r.prevSignal !== r.signal) {
        changes.push({ name: r.name, from: r.prevSignal, to: r.signal,
                       worse: sigOrder[r.signal] < sigOrder[r.prevSignal] });
      }
    });

    var sigLabel = { g: "绿", y: "黄", r: "红", na: "无" };
    var sigColor = { g: "#2E7D32", y: "#A87A1F", r: "#A04848", na: "#E5E5E7" };

    // 风险关系图 — 按 domain 不同
    var riskChartHtml = '';
    if (domKey === "quality") {
      // 用 npl_swarm story 的渲染
      var swarmStory = (dom.stories || []).filter(function(s){return s.chart === "beeswarm";})[0];
      if (swarmStory) {
        riskChartHtml = '<div class="bm-group-chart">' + renderBeeswarm(swarmStory, dom, domKey, b, year) + '</div>';
      }
    } else if (domKey === "loan_corp") {
      var bubbleStory = (dom.stories || []).filter(function(s){return s.chart === "bubble_matrix";})[0];
      if (bubbleStory) {
        riskChartHtml = '<div class="bm-group-chart">' + renderBubbleMatrix(bubbleStory, dom, domKey, b, year) + '</div>';
      }
    } else if (domKey === "capital") {
      var b3dStory = (dom.stories || []).filter(function(s){return s.chart === "bubble3d";})[0];
      if (b3dStory) {
        riskChartHtml = '<div class="bm-group-chart">' + renderBubble3D(b3dStory, dom, domKey, b, year) + '</div>';
      }
    }
    if (!riskChartHtml) {
      // fallback：本域分布带柱图
      riskChartHtml = '<p class="bm-cro-no-chart">本域无专属关系图。</p>';
    }

    return ''
      + '<header class="bm-chapter-hero">'
      +   '<div class="bm-chapter-text">'
      +     '<div class="bm-chapter-num">风险版 · ' + escapeXml(dom.label) + '</div>'
      +     '<h2 class="bm-chapter-title">' + escapeXml(dom.label) + ' · KRI 信号灯</h2>'
      +     '<p class="bm-chapter-sub">本章 ' + kriRows.length + ' 个 KRI 已按红→黄→绿排序。点击右上角导出风险简报。</p>'
      +     '<div class="bm-board-actions">'
      +       '<button class="bm-board-export" onclick="window.print()">导出风险简报</button>'
      +     '</div>'
      +   '</div>'
      + '</header>'
      + renderDomainDecomposition(domKey, b, year)
      // KRI 红黄绿表
      + '<section class="bm-cro-kri-section">'
      +   '<header class="bm-flow-section-head">'
      +     '<span class="bm-flow-section-num">01</span>'
      +     '<h3 class="bm-flow-section-title">' + escapeXml(b.name) + ' · 本章 KRI 信号灯</h3>'
      +     '<span class="bm-flow-section-meta">红=分位 &lt;40 · 黄=40-70 · 绿=≥70 · NA=数据缺</span>'
      +   '</header>'
      +   '<table class="bm-cro-kri">'
      +     '<thead><tr><th>指标</th><th>当前值</th><th>分位</th><th>排名</th><th>信号</th><th>vs ' + prevYear + '</th></tr></thead>'
      +     '<tbody>'
      +       kriRows.map(function(r){
              var changeMark = "";
              if (r.prevSignal && r.prevSignal !== r.signal) {
                changeMark = sigOrder[r.signal] < sigOrder[r.prevSignal]
                  ? '<span class="bm-cro-worse">↓ ' + sigLabel[r.prevSignal] + ' → ' + sigLabel[r.signal] + '</span>'
                  : '<span class="bm-cro-better">↑ ' + sigLabel[r.prevSignal] + ' → ' + sigLabel[r.signal] + '</span>';
              } else if (r.prevSignal) {
                changeMark = '<span class="bm-cro-same">' + sigLabel[r.prevSignal] + ' → ' + sigLabel[r.signal] + ' 无变化</span>';
              }
              return '<tr>'
                   + '<td><b>'+escapeXml(r.name)+'</b></td>'
                   + '<td>'+(r.val === null ? "—" : formatVal(r.val, r.unit))+'</td>'
                   + '<td>'+(r.percentile !== null ? 'P'+r.percentile : "—")+'</td>'
                   + '<td>'+(r.rank ? r.rank+'/'+r.total : "—")+'</td>'
                   + '<td><span class="bm-cro-light" style="background:'+sigColor[r.signal]+';"></span>'+sigLabel[r.signal]+'</td>'
                   + '<td>'+changeMark+'</td>'
                   + '</tr>';
            }).join("")
      +     '</tbody>'
      +   '</table>'
      + '</section>'
      // 风险关系图
      + '<section class="bm-cro-rel-section">'
      +   '<header class="bm-flow-section-head">'
      +     '<span class="bm-flow-section-num">02</span>'
      +     '<h3 class="bm-flow-section-title">本章风险关系图</h3>'
      +   '</header>'
      +   renderAudienceVisualEvidence(dom, domKey, b, "cro")
      +   riskChartHtml
      + '</section>'
      // 同比变化日志
      + (changes.length ? (
          '<section class="bm-cro-change-section">'
        +   '<header class="bm-flow-section-head">'
        +     '<span class="bm-flow-section-num">03</span>'
        +     '<h3 class="bm-flow-section-title">同比信号变化（' + prevYear + ' → ' + year + '）</h3>'
        +     '<span class="bm-flow-section-meta">共 ' + changes.length + ' 个指标信号变化</span>'
        +   '</header>'
        +   '<ul class="bm-cro-change-list">'
        +     changes.map(function(c){
                var cls = c.worse ? "is-worse" : "is-better";
                var arrow = c.worse ? "↓" : "↑";
                return '<li class="' + cls + '">' + arrow + ' <b>' + escapeXml(c.name) + '</b> · ' + sigLabel[c.from] + ' → ' + sigLabel[c.to] + '</li>';
              }).join("")
        +   '</ul>'
        + '</section>'
        ) : '');
  }

  // === 报告附录数组管理 ===
  function getAppendices() {
    if (typeof state !== "undefined" && Array.isArray(state.reportDataAppendices)) {
      return state.reportDataAppendices;
    }
    if (typeof state !== "undefined") {
      state.reportDataAppendices = [];
      return state.reportDataAppendices;
    }
    if (!window.__bmAppendices) window.__bmAppendices = [];
    return window.__bmAppendices;
  }
  function isStoryInAppendix(domKey, storyId) {
    var arr = getAppendices();
    return arr.some(function(a){ return a.domain === domKey && a.story === storyId; });
  }
  function toggleStoryAppendix(domKey, storyId) {
    var arr = getAppendices();
    var idx = -1;
    for (var i=0; i<arr.length; i++) {
      if (arr[i].domain === domKey && arr[i].story === storyId) { idx = i; break; }
    }
    if (idx >= 0) {
      arr.splice(idx, 1);
    } else {
      arr.push({
        domain: domKey,
        story: storyId,
        bankId: _bm.selectedBankId,
        snapshotYear: _bm.snapshotYear,
        trendStart: _bm.trendStart,
        trendEnd: _bm.trendEnd,
        activePeers: Object.assign({}, _bm.activePeers),
        customPeers: _bm.customPeers.slice(),
        addedAt: new Date().toISOString(),
        dataVersion: (_bm.data && _bm.data.generated_at) || "unknown",
      });
    }
    // 持久化到 localStorage
    try {
      localStorage.setItem("benchmarkiq.reportDataAppendices", JSON.stringify(arr));
    } catch (e) { /* silent */ }
    // 通知报告页重渲染
    if (typeof window.renderBenchmarkReportAppendix === "function") {
      window.renderBenchmarkReportAppendix();
    }
  }
  // 启动时从 localStorage 恢复
  (function restoreAppendices() {
    try {
      var raw = localStorage.getItem("benchmarkiq.reportDataAppendices");
      if (!raw) return;
      var parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        var arr = getAppendices();
        // 替换而非合并（避免双倍）
        arr.length = 0;
        parsed.forEach(function(p){ arr.push(p); });
      }
    } catch (e) { /* silent */ }
  })();
  window.bmGetAppendices = getAppendices;
  window.bmToggleStoryAppendix = toggleStoryAppendix;

  // 桥接句 connector
  function renderBridge(text) {
    return '<div class="bm-bridge">'
         + '<span class="bm-bridge-marker">承接</span>'
         + '<p class="bm-bridge-text">' + escapeXml(text) + '</p>'
         + '</div>';
  }

  // ============================================================
  // 9h. 因果链分解引擎（A 路径核心）
  // ============================================================
  // 每个核心指标定义一个 spec：公式 + 因子列表
  // 因子的"方向"决定它对目标的贡献方向：
  //   - sign="+"  因子 higher → 目标 higher
  //   - sign="-"  因子 higher → 目标 lower
  // 贡献度 contribution_pp = (factor.targetVal - factor.peerMean) * weight * sign
  // 排序后取 top 因子 + 生成叙事
  var DECOMPOSITION_SPECS = {
    "profitability.roe": {
      name: "ROE 杜邦分解",
      formula: "ROE ≈ NIM贡献 + 手续费贡献 − 管理费 − 信用减值 − 税 × 权益乘数",
      factors: [
        { key: "profitability.rev_to_asset", name: "营收/平均资产",  weight: 0.30, sign: "+" },
        { key: "profitability.fee_to_asset", name: "手续费/平均资产", weight: 0.18, sign: "+" },
        { key: "profitability.tax_to_asset", name: "所得税/平均资产", weight: 0.10, sign: "-" },
        { key: "profitability.leverage",     name: "权益乘数（杠杆）", weight: 0.25, sign: "+" },
        { key: "nim.nim",                    name: "净利息收益率",     weight: 0.17, sign: "+" },
      ],
    },
    "profitability.roa": {
      name: "ROA 多因子分解",
      formula: "ROA ≈ NIM 贡献 + 手续费贡献 − 管理费 − 信用减值 − 所得税",
      factors: [
        { key: "nim.nim",                       name: "净利息收益率",     weight: 0.40, sign: "+" },
        { key: "profitability.fee_to_asset",    name: "手续费/平均资产",   weight: 0.20, sign: "+" },
        { key: "profitability.cir",             name: "成本收入比",       weight: 0.20, sign: "-" },
        { key: "profitability.credit_cost_pct", name: "信用成本/营业收入", weight: 0.15, sign: "-" },
        { key: "profitability.tax_to_asset",    name: "所得税/平均资产",   weight: 0.05, sign: "-" },
      ],
    },
    "nim.nim": {
      name: "NIM 资产负债两端分解",
      formula: "NIM = 生息资产收益率 − 计息负债成本率",
      factors: [
        { key: "nim.asset_yield", name: "生息资产收益率（定价能力）", weight: 0.55, sign: "+" },
        { key: "nim.liab_cost",   name: "计息负债成本率（负债成本）", weight: 0.45, sign: "-" },
      ],
    },
    "quality.npl": {
      name: "不良率 + 前瞻信号合成",
      formula: "当前 NPL + 关注/不良比（潜在新增） + Stage 2+3 占比（早期恶化） + 高风险敞口",
      factors: [
        { key: "quality.spec_ratio",        name: "关注类占比",        weight: 0.30, sign: "+" },
        { key: "quality.watch_to_npl",      name: "关注/不良比",       weight: 0.25, sign: "+" },
        { key: "ifrs9.fa_s2_pct",           name: "金融资产 Stage 2",  weight: 0.20, sign: "+" },
        { key: "ifrs9.fa_s3_pct",           name: "金融资产 Stage 3",  weight: 0.10, sign: "+" },
        { key: "loan_corp.high_risk_combined", name: "房地产+建筑+租赁敞口", weight: 0.15, sign: "+" },
      ],
    },
    "profitability.cir": {
      name: "成本收入比解剖",
      formula: "CIR = 业务管理费 / 营业收入",
      factors: [
        { key: "profitability.rev_yoy",      name: "营业收入 YoY%（收入端速度）", weight: 0.45, sign: "-" },
        { key: "profitability.rev_to_asset", name: "营收/平均资产（每单位资产创收）", weight: 0.30, sign: "-" },
        { key: "profitability.fee_to_asset", name: "手续费/平均资产（轻资本收入）", weight: 0.25, sign: "-" },
      ],
    },
    "capital.car": {
      name: "资本充足率四因子",
      formula: "CAR = 资本净额 / RWA  ·  受 CET1 缓冲、RWA 密度、内源补充共同影响",
      factors: [
        { key: "capital.cet1_buffer",  name: "CET1 缓冲（vs 7.5%）",  weight: 0.35, sign: "+" },
        { key: "capital.rwa_density",  name: "RWA 密度（资产风险化程度）", weight: 0.25, sign: "-" },
        { key: "capital.leverage_reg", name: "资本杠杆率",            weight: 0.20, sign: "+" },
        { key: "profitability.ni_yoy", name: "净利润 YoY%（内源补充）", weight: 0.20, sign: "+" },
      ],
    },
    "loan_corp.corp_hhi": {
      name: "对公贷款行业 HHI 集中度",
      formula: "HHI = Σ(各行业占比²)  ·  HHI 越高 = 集中度越高 = 单一行业冲击风险大",
      factors: [
        { key: "loan_corp.mfg_pct",       name: "制造业占比",      weight: 0.30, sign: "+" },
        { key: "loan_corp.re_pct",        name: "房地产业占比",    weight: 0.22, sign: "+" },
        { key: "loan_corp.wholesale_pct", name: "批发零售占比",    weight: 0.18, sign: "+" },
        { key: "loan_corp.leasing_pct",   name: "租赁商务占比",    weight: 0.16, sign: "+" },
        { key: "loan_corp.constr_pct",    name: "建筑业占比",      weight: 0.14, sign: "+" },
      ],
    },
    "loan_corp.high_risk_combined": {
      name: "对公高风险行业敞口",
      formula: "高风险敞口 = 房地产 + 建筑业 + 租赁商务  ·  敞口高低需和行业不良率一起判断",
      factors: [
        { key: "loan_corp.re_pct",      name: "房地产业占比",      weight: 0.34, sign: "+" },
        { key: "loan_corp.constr_pct",  name: "建筑业占比",        weight: 0.26, sign: "+" },
        { key: "loan_corp.leasing_pct", name: "租赁商务占比",      weight: 0.20, sign: "+" },
        { key: "loan_corp.re_npl",      name: "房地产业不良率",    weight: 0.12, sign: "+" },
        { key: "loan_corp.constr_npl",  name: "建筑业不良率",      weight: 0.08, sign: "+" },
      ],
    },
    "loan_retail.retail_npl": {
      name: "零售贷款整体不良率分解",
      formula: "零售 NPL ≈ 住房、经营、消费、信用卡及其他产品不良率的结构性合成",
      factors: [
        { key: "loan_retail.oper_npl",    name: "经营贷款不良率", weight: 0.30, sign: "+" },
        { key: "loan_retail.card_npl",    name: "信用卡不良率",   weight: 0.22, sign: "+" },
        { key: "loan_retail.consume_npl", name: "消费贷款不良率", weight: 0.18, sign: "+" },
        { key: "loan_retail.housing_npl", name: "住房贷款不良率", weight: 0.16, sign: "+" },
        { key: "loan_retail.other_npl",   name: "其他个人贷款不良率", weight: 0.14, sign: "+" },
      ],
    },
    "deposit.dep_time_total": {
      name: "定期化率分解",
      formula: "定期合计 = 个人定期占比 + 公司定期占比  ·  定期化率越高 = 负债成本越刚性 = NIM 压缩源头",
      factors: [
        { key: "deposit.dep_time_retail", name: "个人定期占比", weight: 0.55, sign: "+" },
        { key: "deposit.dep_time_corp",   name: "公司定期占比", weight: 0.45, sign: "+" },
      ],
    },
    "deposit.ldr": {
      name: "存贷比结构分解",
      formula: "LDR = 贷款余额 / 吸收存款  ·  存贷比偏高通常意味着流动性和负债稳定性约束更强",
      factors: [
        { key: "deposit.loan_corp_pct",   name: "公司贷款占比",   weight: 0.25, sign: "+" },
        { key: "deposit.loan_retail_pct", name: "个人贷款占比",   weight: 0.22, sign: "+" },
        { key: "deposit.loan_bill_pct",   name: "票据贷款占比",   weight: 0.12, sign: "+" },
        { key: "deposit.dep_demand_total", name: "活期存款合计占比", weight: 0.21, sign: "-" },
        { key: "deposit.dep_time_total",  name: "定期存款合计占比", weight: 0.20, sign: "+" },
      ],
    },
    "liquidity.lcr": {
      name: "流动性覆盖率分解",
      formula: "LCR 反映高质量流动性资产对短期现金流出的覆盖  ·  需结合 NSFR、流动性比率、备付金和存贷结构复核",
      factors: [
        { key: "liquidity.nsfr",      name: "净稳定资金率",       weight: 0.30, sign: "+" },
        { key: "liquidity.liq_ratio", name: "流动性比率",         weight: 0.26, sign: "+" },
        { key: "liquidity.reserve",   name: "备付金率",           weight: 0.18, sign: "+" },
        { key: "deposit.ldr",         name: "存贷比压力",         weight: 0.16, sign: "-" },
        { key: "deposit.dep_demand_total", name: "活期存款沉淀",  weight: 0.10, sign: "+" },
      ],
    },
    "ifrs9.fa_s2_pct": {
      name: "金融资产 Stage 2 早期恶化预警",
      formula: "Stage 2 占比上升 = 信用恶化的早期信号  ·  Stage 2 拨备率与 Stage 3 配对验证",
      factors: [
        { key: "ifrs9.fa_s2_cov",   name: "Stage 2 拨备率",     weight: 0.35, sign: "-" },
        { key: "ifrs9.fa_s3_pct",   name: "Stage 3 占比",       weight: 0.30, sign: "+" },
        { key: "ifrs9.fa_s3_cov",   name: "Stage 3 拨备率",     weight: 0.20, sign: "-" },
        { key: "ifrs9.fa_s1_pct",   name: "Stage 1 占比（健康池）", weight: 0.15, sign: "-" },
      ],
    },
    // 二级追溯 spec：NIM 内部更细分（让 ROE → NIM → 负债成本 追问链路打通）
    "nim.liab_cost": {
      name: "计息负债成本率分解",
      formula: "负债成本率 ≈ 各类存款成本率 × 该类占比的加权和  ·  存款定期化 + 同业依赖共同推高",
      factors: [
        { key: "nim.dep_cost_total",     name: "吸收存款平均成本率", weight: 0.45, sign: "+" },
        { key: "nim.interbank_cost",     name: "同业存放/拆入成本率", weight: 0.25, sign: "+" },
        { key: "nim.bond_cost",          name: "已发行债务证券成本率", weight: 0.20, sign: "+" },
        { key: "deposit.dep_time_total", name: "定期化率（推高存款成本）", weight: 0.10, sign: "+" },
      ],
    },
    "nim.asset_yield": {
      name: "生息资产收益率分解",
      formula: "资产收益率 ≈ 各类生息资产收益率 × 占比的加权和  ·  贷款占比 + 贷款定价能力共同决定",
      factors: [
        { key: "nim.loan_yield",      name: "贷款及垫款平均收益率",   weight: 0.55, sign: "+" },
        { key: "nim.invest_yield",    name: "金融投资平均收益率",    weight: 0.25, sign: "+" },
        { key: "nim.interbank_yield", name: "存放同业及拆出收益率",   weight: 0.10, sign: "+" },
        { key: "nim.pboc_yield",      name: "存放央行收益率",        weight: 0.10, sign: "+" },
      ],
    },
  };

  function computeDecomposition(metricKey, targetBank, year) {
    var spec = DECOMPOSITION_SPECS[metricKey];
    if (!spec) return null;
    var item = (function(){
      var p = metricKey.split('.');
      var d = _bm.data.domains[p[0]]; if (!d) return null;
      return d.items[p[1]];
    })();
    if (!item) return null;
    var tVal = valOf(targetBank.id, year, metricKey);
    if (tVal === null) return null;
    // 同类均值
    var natIds = getPeerGroupIds("national_type", targetBank);
    var peerMean = natIds.length ? meanOf(natIds, year, metricKey) : null;
    if (peerMean === null) return null;
    var totalDelta = tVal - peerMean;  // 目标 − 同类均值

    var factorResults = spec.factors.map(function(f){
      var fItem = (function(){
        var p2 = f.key.split('.');
        var d2 = _bm.data.domains[p2[0]]; if (!d2) return null;
        return d2.items[p2[1]];
      })();
      if (!fItem) return null;
      var fVal = valOf(targetBank.id, year, f.key);
      var fMean = natIds.length ? meanOf(natIds, year, f.key) : null;
      if (fVal === null || fMean === null) return null;
      var fDelta = fVal - fMean;
      // 贡献：因子差 × 权重 × 符号
      var contrib = fDelta * f.weight * (f.sign === "+" ? 1 : -1);
      return {
        key: f.key,
        name: f.name,
        unit: fItem.unit,
        targetVal: fVal,
        peerMean: fMean,
        delta: fDelta,
        weight: f.weight,
        sign: f.sign,
        contribution: contrib,
        direction: fItem.direction,
        // 跨域追溯：该因子是否有下一层 spec？
        has_next: !!DECOMPOSITION_SPECS[f.key],
      };
    }).filter(Boolean);

    // 排序：贡献度绝对值从大到小
    factorResults.sort(function(a,b){ return Math.abs(b.contribution) - Math.abs(a.contribution); });

    // 生成叙事
    var topPositive = factorResults.filter(function(f){return f.contribution > 0;})[0];
    var topNegative = factorResults.filter(function(f){return f.contribution < 0;})[0];
    var narrative = '';
    var deltaSign = totalDelta > 0 ? '+' : '';
    narrative += escapeXml(targetBank.name) + ' 的 ' + escapeXml(item.name) + ' 为 <b>' + formatVal(tVal, item.unit) + '</b>，'
              + 'vs 全国' + escapeXml(targetBank.type_short) + '行均值 ' + formatVal(peerMean, item.unit)
              + '（差 ' + deltaSign + formatVal(totalDelta, item.unit) + '）。 ';
    if (topPositive) {
      narrative += '主要拉高项：<b>' + escapeXml(topPositive.name) + '</b>（' + (topPositive.delta > 0 ? '+' : '') + topPositive.delta.toFixed(2) + (topPositive.unit === 'x' ? 'x' : topPositive.unit) + ' vs 均值）。 ';
    }
    if (topNegative) {
      narrative += '主要拉低项：<b>' + escapeXml(topNegative.name) + '</b>（' + (topNegative.delta > 0 ? '+' : '') + topNegative.delta.toFixed(2) + (topNegative.unit === 'x' ? 'x' : topNegative.unit) + ' vs 均值）。';
    }

    return {
      spec: spec,
      metric: { key: metricKey, name: item.name, unit: item.unit, direction: item.direction },
      targetBank: targetBank,
      year: year,
      targetVal: tVal,
      peerMean: peerMean,
      totalDelta: totalDelta,
      factors: factorResults,
      narrative: narrative,
    };
  }

  function pickTraceFactor(decomp) {
    if (!decomp || !decomp.factors || !decomp.factors.length) return null;
    var withNext = decomp.factors.filter(function(f){ return f.has_next; });
    if (!withNext.length) return null;
    var preferredSign = decomp.totalDelta < 0 ? -1 : 1;
    var aligned = withNext.filter(function(f){
      return preferredSign < 0 ? f.contribution < 0 : f.contribution > 0;
    });
    var pool = aligned.length ? aligned : withNext;
    pool.sort(function(a,b){ return Math.abs(b.contribution) - Math.abs(a.contribution); });
    return pool[0];
  }

  function buildCausalTraceChain(metricKey, targetBank, year, maxDepth, visited) {
    maxDepth = typeof maxDepth === "number" ? maxDepth : 3;
    visited = visited || {};
    if (!metricKey || visited[metricKey] || maxDepth < 0) return [];
    visited[metricKey] = true;
    var decomp = computeDecomposition(metricKey, targetBank, year);
    if (!decomp) return [];
    var cause = pickTraceFactor(decomp);
    var node = {
      key: metricKey,
      name: decomp.metric.name,
      unit: decomp.metric.unit,
      delta: decomp.totalDelta,
      targetVal: decomp.targetVal,
      peerMean: decomp.peerMean,
      cause: cause,
    };
    if (!cause || !cause.has_next || maxDepth === 0) return [node];
    return [node].concat(buildCausalTraceChain(cause.key, targetBank, year, maxDepth - 1, visited));
  }

  function renderCausalTraceChain(chain) {
    if (!chain || chain.length < 2) return "";
    var steps = chain.map(function(node, idx){
      var deltaText = (node.delta > 0 ? "+" : "") + node.delta.toFixed(2) + (node.unit === "x" ? "x" : node.unit);
      var relation = node.delta < 0 ? "低于同类均值" : "高于同类均值";
      var causeText = node.cause
        ? "，主要追到 " + node.cause.name + "（贡献 " + (node.cause.contribution > 0 ? "+" : "") + node.cause.contribution.toFixed(2) + "）"
        : "";
      return '<li data-causal-chain-key="'+escapeXml(node.key)+'">'
           + '<span class="bm-causal-chain-step">L'+(idx+1)+'</span>'
           + '<b>'+escapeXml(node.name)+'</b>'
           + '<em>'+escapeXml(relation)+' '+escapeXml(deltaText)+causeText+'</em>'
           + '</li>';
    }).join("");
    return '<div class="bm-causal-chain">'
      + '<div class="bm-causal-chain-head"><span>链式追溯</span><b>从结果指标一路追到可解释因子</b></div>'
      + '<ol>' + steps + '</ol>'
      + '</div>';
  }

  // 渲染因果链卡（HTML + 内嵌 SVG 桥图）
  // depth 参数：0=主卡、1=二级追问、2=三级（不再下沉）
  function renderDecompositionCard(decomp, depth) {
    depth = depth || 0;
    if (!decomp) return '';
    var spec = decomp.spec;
    var sign = function(v){ return v > 0 ? '+' : ''; };
    var fmt = function(v, unit){ return sign(v) + v.toFixed(2) + (unit === 'x' ? 'x' : unit); };

    // 桥图：水平条，每段宽度 = 贡献度绝对值的比例
    var maxAbs = Math.max.apply(null, decomp.factors.map(function(f){return Math.abs(f.contribution);}));
    var BW = 1000, BH = 60;
    var segH = 22;
    var segY = (BH - segH) / 2;
    // 起点（同类均值）+ 各因子段 + 终点（目标值）
    var bridge = '<svg viewBox="0 0 '+BW+' '+BH+'" xmlns="http://www.w3.org/2000/svg" font-family="Helvetica Neue, PingFang SC, sans-serif">';
    // 计算每段宽度
    var totalAbs = decomp.factors.reduce(function(s,f){return s + Math.abs(f.contribution);}, 0) || 1;
    var availW = BW - 200;  // 留 100px 给两端标签
    var cursor = 100;
    decomp.factors.forEach(function(f, fi){
      var w = Math.abs(f.contribution) / totalAbs * availW;
      var color = f.contribution > 0 ? "#2E7D32" : "#A04848";
      bridge += '<rect x="'+cursor+'" y="'+segY+'" width="'+Math.max(2,w)+'" height="'+segH+'" fill="'+color+'" opacity="0.78" />';
      // 段内/段外标签
      if (w > 40) {
        bridge += '<text x="'+(cursor + w/2)+'" y="'+(segY + segH * 0.68)+'" text-anchor="middle" font-size="11" font-weight="700" fill="#fff">'+escapeXml(f.name.length > 8 ? f.name.slice(0,7)+'…' : f.name)+'</text>';
      }
      cursor += w + 1;
    });
    // 两端标签
    bridge += '<text x="6" y="'+(BH/2 + 4)+'" font-size="11.5" font-weight="700" fill="#7A7A80">'+escapeXml(decomp.targetBank.type_short)+'行均值</text>';
    bridge += '<text x="'+(BW - 6)+'" y="'+(BH/2 + 4)+'" text-anchor="end" font-size="11.5" font-weight="700" fill="#009CDE">'+escapeXml(decomp.targetBank.name)+'</text>';
    bridge += '</svg>';

    // 因子排行表（每行如果 has_next 加"继续追问"按钮）
    var canDrillDown = depth < 2;
    var tableHtml = '<table class="bm-decomp-table">'
      + '<thead><tr><th>因子</th><th>目标值</th><th>同类均值</th><th>偏差</th><th>贡献</th><th></th></tr></thead>'
      + '<tbody>'
      + decomp.factors.map(function(f){
          var contribClass = f.contribution > 0 ? "is-up" : "is-down";
          var drillBtn = (canDrillDown && f.has_next)
            ? '<button class="bm-decomp-drill" data-drill-key="'+escapeXml(f.key)+'">继续追问 →</button>'
            : '';
          return '<tr>'
               + '<td><b>'+escapeXml(f.name)+'</b><br><span class="bm-decomp-key">'+escapeXml(f.key)+'</span></td>'
               + '<td>'+formatVal(f.targetVal, f.unit)+'</td>'
               + '<td>'+formatVal(f.peerMean, f.unit)+'</td>'
               + '<td>'+fmt(f.delta, f.unit)+'</td>'
               + '<td class="'+contribClass+'">'+fmt(f.contribution, f.unit)+'</td>'
               + '<td class="bm-decomp-drill-cell">'+drillBtn+'</td>'
               + '</tr>';
        }).join("")
      + '</tbody></table>';

    // 主因子叙事：拉高 / 拉低项如有 has_next，加直达"继续追问"链接
    var narrativeExt = '';
    var topPositive = decomp.factors.filter(function(f){return f.contribution > 0;})[0];
    var topNegative = decomp.factors.filter(function(f){return f.contribution < 0;})[0];
    if (canDrillDown) {
      if (topPositive && topPositive.has_next) {
        narrativeExt += '<button class="bm-decomp-drill bm-decomp-drill-inline is-up" data-drill-key="'+escapeXml(topPositive.key)+'">为什么「'+escapeXml(topPositive.name)+'」拉高？→</button> ';
      }
      if (topNegative && topNegative.has_next) {
        narrativeExt += '<button class="bm-decomp-drill bm-decomp-drill-inline is-down" data-drill-key="'+escapeXml(topNegative.key)+'">为什么「'+escapeXml(topNegative.name)+'」拉低？→</button>';
      }
    }
    var traceHtml = depth === 0 ? renderCausalTraceChain(buildCausalTraceChain(decomp.metric.key, decomp.targetBank, decomp.year, 3)) : '';

    // 嵌套追问容器（占位，点击 drill 按钮后 JS 填充）
    var drillMountId = 'bm-decomp-drill-' + spec.name.replace(/[^a-zA-Z0-9]/g, '') + '-' + depth + '-' + Date.now() + Math.floor(Math.random()*1000);

    var depthCls = depth === 0 ? '' : ' is-nested is-depth-' + depth;
    var depthBadge = depth > 0 ? '<span class="bm-decomp-depth-tag">L'+(depth+1)+' 追问</span>' : '';

    return ''
      + '<div class="bm-decomp-card'+depthCls+'">'
      +   '<header class="bm-decomp-head">'
      +     '<div>'
      +       '<div class="bm-decomp-kicker">' + (depth === 0 ? '因果链分解' : '继续追问 · L' + (depth + 1)) + '</div>'
      +       '<h4 class="bm-decomp-title">'+escapeXml(spec.name)+depthBadge+'</h4>'
      +       '<p class="bm-decomp-formula"><code>'+escapeXml(spec.formula)+'</code></p>'
      +     '</div>'
      +   '</header>'
      +   '<div class="bm-decomp-bridge">' + bridge + '</div>'
      +   '<p class="bm-decomp-narrative">' + decomp.narrative + (narrativeExt ? ' &nbsp;' + narrativeExt : '') + '</p>'
      +   traceHtml
      +   '<div class="bm-decomp-table-wrap">' + tableHtml + '</div>'
      +   '<div class="bm-decomp-drill-mount" id="'+drillMountId+'" data-depth="'+depth+'" data-target-bank-id="'+decomp.targetBank.id+'" data-year="'+decomp.year+'"></div>'
      +   (depth === 0 ? '<footer class="bm-decomp-foot">贡献度 = 因子差（vs 同类均值）× 权重 × 方向符号；权重为预设近似值，仅用于排序识别主因。本卡仅陈述指标关系，不构成动作建议。<b>点击「继续追问」可下钻 ≤2 层</b>。</footer>' : '')
      + '</div>';
  }

  // ---------- 9c. 章节评分卡：计算 + 渲染（KPMG/360factors 风分位+排名）----------
  function computeChapterScore(dom, domKey, targetBank, year) {
    // 遍历精选指标，算每个指标的目标行分位 + 排名 + 与同类均值偏差
    var perMetric = [];
    var nationalTypeIds = getPeerGroupIds("national_type", targetBank);
    dom.selected.forEach(function(mkey){
      var item = dom.items[mkey];
      if (!item || item.direction === "contextual") return;  // 中性指标不参与评分
      var metricKey = domKey + "." + mkey;
      var tVal = valOf(targetBank.id, year, metricKey);
      if (tVal === null) return;
      // 全国 57 家分布
      var allVals = [];
      _bm.data.banks.forEach(function(bb){
        var v = valOf(bb.id, year, metricKey);
        if (v !== null) allVals.push(v);
      });
      if (allVals.length < 5) return;
      // 排名：higher_better → 越大排越前；lower_better → 反转
      var sorted = allVals.slice().sort(function(a,b){
        return item.direction === "higher_better" ? b - a : a - b;
      });
      var rank = sorted.indexOf(tVal) + 1;
      if (rank === 0) {
        // 找最近的
        for (var i=0;i<sorted.length;i++) {
          if ((item.direction === "higher_better" && sorted[i] < tVal) ||
              (item.direction === "lower_better"  && sorted[i] > tVal)) {
            rank = i + 1; break;
          }
        }
        if (rank === 0) rank = sorted.length;
      }
      // 分位（"越靠前"= 高分位）
      var percentile = Math.round((1 - rank / sorted.length) * 100);
      // 与全国同类均值偏差
      var natMean = nationalTypeIds.length ? meanOf(nationalTypeIds, year, metricKey) : null;
      var dev = natMean !== null ? (tVal - natMean) : null;
      // 评估方向（dev > 0 时是否对自己有利）
      var devGood = null;
      if (dev !== null) {
        devGood = (item.direction === "higher_better") ? dev > 0 : dev < 0;
      }
      perMetric.push({
        mkey: mkey, name: item.name, unit: item.unit, direction: item.direction,
        targetVal: tVal, natMean: natMean,
        rank: rank, total: sorted.length, percentile: percentile,
        dev: dev, devGood: devGood
      });
    });
    if (!perMetric.length) return null;
    // 章节级综合：分位平均
    var avgPct = Math.round(perMetric.reduce(function(s,m){return s + m.percentile;}, 0) / perMetric.length);
    var avgRank = Math.round(perMetric.reduce(function(s,m){return s + m.rank;}, 0) / perMetric.length);
    var total = perMetric[0].total;
    // 找驱动指标：最高分位 + 最低分位
    var sortedByPct = perMetric.slice().sort(function(a,b){return b.percentile - a.percentile;});
    return {
      percentile: avgPct,
      rank: avgRank,
      total: total,
      perMetric: perMetric,
      driverTop: sortedByPct[0],
      driverBottom: sortedByPct[sortedByPct.length - 1],
    };
  }

  // ---------- 9d. 对标矩阵视图（KPMG / 360factors 风：指标 × 对标银行 密集表） ----------
  function renderMatrixView(dom, domKey, targetBank) {
    var year = _bm.snapshotYear;
    // 列：目标行 + 各 active 对标组均值 + 自选具体银行
    var cols = [];
    cols.push({ cls: "is-target", label: targetBank.name, sub: targetBank.type_short + " · 目标行", kind: "bank", bankId: targetBank.id });
    if (_bm.activePeers.national_type) {
      var ids = getPeerGroupIds("national_type", targetBank);
      if (ids.length) cols.push({ cls: "is-peer-national", label: "全国" + targetBank.type_short + "均值",
                                  sub: ids.length + " 家", kind: "mean", peerIds: ids });
    }
    if (_bm.activePeers.region_type) {
      var ids2 = getPeerGroupIds("region_type", targetBank);
      if (ids2.length) cols.push({ cls: "is-peer-region", label: targetBank.region + targetBank.type_short + "均值",
                                  sub: ids2.length + " 家", kind: "mean", peerIds: ids2 });
    }
    if (_bm.activePeers.national_other) {
      var ids3 = getPeerGroupIds("national_other", targetBank);
      if (ids3.length) cols.push({ cls: "is-peer-cross", label: "全行业均值",
                                  sub: ids3.length + " 家", kind: "mean", peerIds: ids3 });
    }
    if (_bm.activePeers.custom) {
      _bm.customPeers.forEach(function(id){
        var bb = getBank(id);
        if (bb && id !== targetBank.id) {
          cols.push({ cls: "is-peer-custom", label: bb.name, sub: bb.type_short, kind: "bank", bankId: id });
        }
      });
    }

    // 行：精选指标 ＋ 全量切换（默认精选；matrix 里可看全量）
    var metricKeys = dom.selected;

    // 表头
    var headHtml = '<thead><tr>'
      + '<th class="bm-mx-th-metric">指标</th>'
      + '<th class="bm-mx-th-meta">单位 · 时态</th>'
      + cols.map(function(c){
          return '<th class="bm-mx-th-col '+c.cls+'"><span class="bm-mx-col-label">'+escapeXml(c.label)+'</span><span class="bm-mx-col-sub">'+escapeXml(c.sub)+'</span></th>';
        }).join("")
      + '<th class="bm-mx-th-rank">vs 全国分位</th>'
      + '</tr></thead>';

    // 每行
    var rowsHtml = '<tbody>' + metricKeys.map(function(mkey){
      var item = dom.items[mkey];
      if (!item) return '';
      var metricKey = domKey + "." + mkey;
      // 各列的值
      var vals = cols.map(function(c){
        if (c.kind === "bank") return valOf(c.bankId, year, metricKey);
        return meanOf(c.peerIds, year, metricKey);
      });
      // 全国分布
      var allVals = [];
      _bm.data.banks.forEach(function(bb){
        var v = valOf(bb.id, year, metricKey);
        if (v !== null) allVals.push(v);
      });
      var tVal = vals[0];
      var rk = (tVal !== null && allVals.length >= 5) ? rankOf(tVal, allVals, item.direction === "higher_better") : null;
      var rkText = rk ? "P" + Math.round((1 - rk.rank / rk.total) * 100) + " · " + rk.rank + "/" + rk.total : "—";
      var rkClass = "";
      if (rk && item.direction !== "contextual") {
        var pct = Math.round((1 - rk.rank / rk.total) * 100);
        rkClass = pct >= 70 ? "is-strong" : (pct >= 40 ? "is-mid" : "is-weak");
      }
      // 行内 max 用于 micro-bar 归一化
      var validVals = vals.filter(function(v){return v !== null && !isNaN(v);});
      var rowMax = validVals.length ? Math.max.apply(null, validVals.map(Math.abs)) : 1;
      if (rowMax === 0) rowMax = 1;
      var cellsHtml = vals.map(function(v, ci){
        if (v === null || isNaN(v)) return '<td class="bm-mx-cell is-na">—</td>';
        var w = Math.min(100, Math.abs(v) / rowMax * 100);
        var color = colorOf(cols[ci].cls);
        var isT = cols[ci].cls === "is-target";
        return '<td class="bm-mx-cell '+(isT?'is-target':'')+'">'
             + '<span class="bm-mx-val">'+formatVal(v, item.unit)+'</span>'
             + '<span class="bm-mx-bar" style="--w:'+w+'%;--c:'+color+';"></span>'
             + '</td>';
      }).join("");
      var nameDisplay = item.name + (item.kind === "derived" ? ' <span class="bm-mx-derived">衍生</span>' : '');
      return '<tr>'
           + '<td class="bm-mx-metric"><b>'+nameDisplay+'</b></td>'
           + '<td class="bm-mx-meta">'+escapeXml(item.unit)+' · '+(item.period_type==='point'?'年末':'全年')+'</td>'
           + cellsHtml
           + '<td class="bm-mx-rank '+rkClass+'">'+rkText+'</td>'
           + '</tr>';
    }).join("") + '</tbody>';

    return '<div class="bm-matrix-wrap">'
         + '<table class="bm-matrix">' + headHtml + rowsHtml + '</table>'
         + '<p class="bm-matrix-note">'
         + '截面 '+year+' 年末 / '+year+' 全年 · 行内 micro-bar 按该指标绝对值最大值归一化 · 排名取全国 57 家分布。'
         + '</p>'
         + '</div>';
  }

  // 每个域的"代表指标"用于因果链分解
  var DOMAIN_HEADLINE_METRIC = {
    profitability: "profitability.roe",
    nim:           "nim.nim",
    quality:       "quality.npl",
    capital:       "capital.car",
    loan_corp:     "loan_corp.corp_hhi",
    loan_retail:   "loan_retail.retail_npl",
    deposit:       "deposit.dep_time_total",
    liquidity:     "liquidity.lcr",
    ifrs9:         "ifrs9.fa_s2_pct",
  };

  // 渲染域级因果链（如果该域有 headline metric 配置了 spec）
  function renderDomainDecomposition(domKey, targetBank, year) {
    var headline = DOMAIN_HEADLINE_METRIC[domKey];
    if (!headline) return '';
    var decomp = computeDecomposition(headline, targetBank, year);
    if (!decomp) return '';
    return ''
      + '<details class="bm-decomp-toggle">'
      +   '<summary class="bm-decomp-summary">'
      +     '<span class="bm-decomp-summary-tag">因果链</span>'
      +     '<span class="bm-decomp-summary-text">为什么是这个分位？— 拆解 <b>' + escapeXml(decomp.metric.name) + '</b> 的主要因子贡献</span>'
      +     '<span class="bm-decomp-summary-mark">展开</span>'
      +   '</summary>'
      +   renderDecompositionCard(decomp)
      + '</details>';
  }

  function renderScoreCard(score, targetBank) {
    if (!score) return '<div class="bm-score-card is-empty"><span>无足够数据</span></div>';
    // 分位颜色：>= 70 强、40-70 中、<40 弱
    var pctClass = score.percentile >= 70 ? "is-strong"
                 : score.percentile >= 40 ? "is-mid"
                 : "is-weak";
    var driverTopDev = score.driverTop.dev;
    var driverBotDev = score.driverBottom.dev;
    var devSign = function(d){ return d > 0 ? "+" : ""; };
    var fmtDev = function(d, unit){ return d === null ? "—" : devSign(d) + d.toFixed(2) + (unit === "x" ? "x" : unit); };
    return ''
      + '<div class="bm-score-card '+pctClass+'">'
      +   '<div class="bm-score-kicker">'+escapeXml(targetBank.name)+' · 本章评分</div>'
      +   '<div class="bm-score-percentile-row">'
      +     '<span class="bm-score-percentile">P'+score.percentile+'</span>'
      +     '<span class="bm-score-rank">排 '+score.rank+' / '+score.total+'</span>'
      +   '</div>'
      +   '<div class="bm-score-meta">基于 '+score.perMetric.length+' 个精选指标 · 分位与排名取均值</div>'
      +   '<div class="bm-score-drivers">'
      +     '<div class="bm-score-driver is-up">'
      +       '<span class="bm-score-driver-tag">拉高</span>'
      +       '<b>'+escapeXml(score.driverTop.name)+'</b>'
      +       '<span class="bm-score-driver-val">P'+score.driverTop.percentile+' · '+fmtDev(driverTopDev, score.driverTop.unit)+' vs 同类均值</span>'
      +     '</div>'
      +     '<div class="bm-score-driver is-down">'
      +       '<span class="bm-score-driver-tag">拉低</span>'
      +       '<b>'+escapeXml(score.driverBottom.name)+'</b>'
      +       '<span class="bm-score-driver-val">P'+score.driverBottom.percentile+' · '+fmtDev(driverBotDev, score.driverBottom.unit)+' vs 同类均值</span>'
      +     '</div>'
      +   '</div>'
      + '</div>';
  }

  // ---------- 9b. 故事线卡（Swiss 报纸版型）----------
  function renderStoryCard(dom, domKey, story, storyNum, storyTotal, targetBank) {
    var year = _bm.snapshotYear;
    var metrics = (story.metrics || []).filter(function(mk){ return dom.items[mk]; });

    // 收集每个指标 × 各对标组的值
    var rows = metrics.map(function(mk){
      var item = dom.items[mk];
      var metricKey = domKey + "." + mk;
      var series = []; // 每个 series 对应一个对标组（含目标行）
      // 目标行
      var tVal = valOf(targetBank.id, year, metricKey);
      series.push({ cls: "is-target", label: targetBank.name, value: tVal });
      // 各对标
      ["national_type","region_type","national_other","custom"].forEach(function(pk){
        if (!_bm.activePeers[pk]) return;
        var ids = getPeerGroupIds(pk, targetBank);
        if (!ids.length) return;
        var m = meanOf(ids, year, metricKey);
        if (m === null) return;
        var clsMap = {
          national_type:  "is-peer-national",
          region_type:    "is-peer-region",
          national_other: "is-peer-cross",
          custom:         "is-peer-custom"
        };
        var lblMap = {
          national_type:  "全国" + targetBank.type_short + "均值",
          region_type:    targetBank.region + targetBank.type_short + "均值",
          national_other: "全行业均值",
          custom:         "自选 " + ids.length + " 家"
        };
        series.push({ cls: clsMap[pk], label: lblMap[pk], value: m });
      });
      // === 分布数据：全国 57 家在该指标上的全部非空值 ===
      // 用于画分布阴影带（P10-P90 + P25-P75 IQR + P50 中位）
      var distVals = [];
      _bm.data.banks.forEach(function(bb){
        var v = valOf(bb.id, year, metricKey);
        if (v !== null && !isNaN(v)) distVals.push(v);
      });
      var dist = null;
      if (distVals.length >= 5) {
        dist = {
          p10: quantile(distVals, 0.10),
          p25: quantile(distVals, 0.25),
          p50: quantile(distVals, 0.50),
          p75: quantile(distVals, 0.75),
          p90: quantile(distVals, 0.90),
          min: Math.min.apply(null, distVals),
          max: Math.max.apply(null, distVals),
          n:   distVals.length
        };
      }
      return { mkey: mk, name: item.name, unit: item.unit, direction: item.direction,
               kind: item.kind || "base", formula: item.formula || "",
               series: series, dist: dist };
    });

    var chartSvg = renderStoryChart(story, rows, dom, domKey, targetBank, year);
    var nNonNull = 0;
    rows.forEach(function(r){ r.series.forEach(function(s){ if (s.value !== null && !isNaN(s.value)) nNonNull++; }); });

    // 判定 story 整体口径：point / period / mixed
    // 同时统计 base / derived 数量
    var hasPoint = false, hasPeriod = false;
    var nBase = 0, nDerived = 0;
    metrics.forEach(function(mk){
      var it = dom.items[mk] || {};
      if (it.period_type === "point") hasPoint = true;
      if (it.period_type === "period") hasPeriod = true;
      if (it.kind === "derived") nDerived++; else nBase++;
    });
    var kindBadge = '';
    if (story.kind === 'derived' || nDerived > nBase) {
      kindBadge = '<span class="bm-story-kind is-derived">衍生</span>';
    } else if (nBase > 0 && nDerived > 0) {
      kindBadge = '<span class="bm-story-kind is-mixed">混合 · '+nBase+' 基础 + '+nDerived+' 衍生</span>';
    } else {
      kindBadge = '<span class="bm-story-kind is-base">基础</span>';
    }
    var periodLabel;
    if (hasPoint && hasPeriod) {
      periodLabel = '时点指标按 <b>' + year + ' 年末</b>；时期指标按 <b>' + year + ' 全年</b>';
    } else if (hasPoint) {
      periodLabel = '截面时点：<b>' + year + ' 年末</b>';
    } else if (hasPeriod) {
      periodLabel = '时期口径：<b>' + year + ' 全年</b>';
    } else {
      periodLabel = '基期：<b>' + year + '</b>';
    }

    // 判断该故事线是否已加入报告附录
    var isInAppendix = isStoryInAppendix(domKey, story.id);
    var appendixBtn = '<button class="bm-story-add-appendix '+(isInAppendix?"is-added":"")+'" data-add-appendix-domain="'+domKey+'" data-add-appendix-story="'+story.id+'">'
                    + (isInAppendix ? '已加入附录 ✓' : '加入报告附录') + '</button>';
    return '<article class="bm-story-card '+(story.kind==='derived'?'is-derived':'')+'" id="story-'+story.id+'">'
      + '<aside class="bm-story-folio">'
      +   '<div class="bm-story-num">'+pad2(storyNum)+'</div>'
      +   '<div class="bm-story-folio-of">共 '+pad2(storyTotal)+' 张</div>'
      +   appendixBtn
      + '</aside>'
      + '<header class="bm-story-head">'
      +   '<div class="bm-story-title-row">'
      +     '<span class="bm-story-title">' + escapeXml(story.title) + '</span>'
      +     kindBadge
      +   '</div>'
      +   '<p class="bm-story-lead">' + escapeXml(story.lead) + ' &nbsp;·&nbsp; ' + nBase + ' 基础 + ' + nDerived + ' 衍生 &nbsp;·&nbsp; ' + nNonNull + ' 数据点 &nbsp;·&nbsp; ' + periodLabel + '</p>'
      + '</header>'
      + '<div class="bm-story-body">'
      +   '<div class="bm-group-chart">' + chartSvg + '</div>'
      +   (story.chart && story.chart !== 'bar_group' ? renderReadGuide(story, dom, domKey, targetBank, year) : '')
      + '</div>'
      + '<footer class="bm-story-foot">'
      +   '<span>数据来源 · bank_scope_2025_v1 · ' + escapeXml(targetBank.name) + ' 对标参照 · 行级独立刻度</span>'
      +   '<span>越高越好 · 越低越好 · 中性</span>'
      + '</footer>'
      + '</article>';
  }

  // ---------- 9e. chart kind dispatcher：根据 story.chart 调不同渲染函数 ----------
  function renderStoryChart(story, rows, dom, domKey, targetBank, year) {
    var kind = story.chart || 'bar_group';
    if (kind === 'slopegraph')   return renderSlopegraph(story, dom, domKey, targetBank, year);
    if (kind === 'beeswarm')     return renderBeeswarm(story, dom, domKey, targetBank, year);
    if (kind === 'bubble_matrix')return renderBubbleMatrix(story, dom, domKey, targetBank, year);
    if (kind === 'bubble3d')     return renderBubble3D(story, dom, domKey, targetBank, year);
    if (kind === 'marimekko')    return renderMarimekko(story, dom, domKey, targetBank, year);
    if (kind === 'waterfall')    return renderWaterfall(story, dom, domKey, targetBank, year);
    if (kind === 'bumpchart')    return renderBumpChart(story, dom, domKey, targetBank, year);
    if (kind === 'stacked_small_multiples') return renderStackedAreaSM(story, dom, domKey, targetBank, year);
    // 默认对标柱图
    return renderGroupBarChart(rows);
  }

  // ---------- 9f. 关系图通用读图注释（"如何解读 + 相对位置"）----------
  function renderReadGuide(story, dom, domKey, targetBank, year) {
    var html = '<div class="bm-read-guide">';
    if (story.read_method) {
      html += '<div class="bm-read-method"><span class="bm-read-tag">读图方法</span>'
            + '<p>' + escapeXml(story.read_method) + '</p></div>';
    }
    // 目标行相对位置：若 story 指定了 single metric，自动算"目标行处于分布的哪个位置"
    if (story.metric) {
      var pos = computeRelativePosition(story.metric, targetBank, year);
      if (pos) {
        html += '<div class="bm-read-pos"><span class="bm-read-tag">'+escapeXml(targetBank.name)+' 相对位置</span>'
              + '<p>' + pos + '</p></div>';
      }
    }
    html += '</div>';
    return html;
  }

  function computeRelativePosition(metricKey, targetBank, year) {
    var tVal = valOf(targetBank.id, year, metricKey);
    if (tVal === null) return null;
    var allVals = [];
    _bm.data.banks.forEach(function(bb){
      var v = valOf(bb.id, year, metricKey);
      if (v !== null) allVals.push(v);
    });
    if (allVals.length < 5) return null;
    // 找出 metric 在 domain.item 里的 direction
    var parts = metricKey.split('.');
    var item = (_bm.data.domains[parts[0]] || {items:{}}).items[parts[1]];
    var dir = (item && item.direction) || 'higher_better';
    var sorted = allVals.slice().sort(function(a,b){
      return dir === 'higher_better' ? b - a : a - b;
    });
    var rank = sorted.indexOf(tVal) + 1;
    if (rank === 0) {
      for (var i=0;i<sorted.length;i++) {
        if ((dir === 'higher_better' && sorted[i] < tVal) ||
            (dir === 'lower_better'  && sorted[i] > tVal)) { rank = i + 1; break; }
      }
      if (rank === 0) rank = sorted.length;
    }
    var pct = Math.round((1 - rank / sorted.length) * 100);
    var natIds = getPeerGroupIds("national_type", targetBank);
    var natMean = natIds.length ? meanOf(natIds, year, metricKey) : null;
    var dev = natMean !== null ? (tVal - natMean) : null;
    var unit = item ? item.unit : '';
    var devStr = dev === null ? '' :
      ' &nbsp;·&nbsp; ' + (dev > 0 ? '+' : '') + dev.toFixed(2) + (unit === 'x' ? 'x' : unit) + ' vs ' + targetBank.type_short + '行均值';
    return '当前值 <b>'+formatVal(tVal, unit)+'</b> &nbsp;·&nbsp; 全国分位 <b>P'+pct+'</b> &nbsp;·&nbsp; 排第 <b>'+rank+' / '+sorted.length+'</b>' + devStr;
  }

  // ---------- 10k. Stacked Area Small Multiples（关系图 3-R1）----------
  // 多面板小多图：每家代表银行一格 mini stacked area 显示存款结构 6 年演化
  function renderStackedAreaSM(story, dom, domKey, targetBank, year) {
    var years = _bm.data.years;
    // 选 16 家代表银行：每类 4 家（按规模降序）— 严格 16 家
    var typeOrder = ["大型商业银行", "股份制商业银行", "城市商业银行", "农村商业银行"];
    var reps = [];
    typeOrder.forEach(function(t){
      var list = _bm.data.banks.filter(function(bb){return bb.type === t;});
      list.sort(function(a,b){
        var ra = valOf(a.id, 2025, "capital.rev") || 0;
        var rb = valOf(b.id, 2025, "capital.rev") || 0;
        return rb - ra;
      });
      list.slice(0, 4).forEach(function(bb){ reps.push(bb); });
    });
    // 保证目标行在 reps —— 替换目标行所在类别的最后一家
    if (!reps.some(function(bb){return bb.id === targetBank.id;})) {
      var sameTypeIdx = -1;
      for (var ii = reps.length - 1; ii >= 0; ii--) {
        if (reps[ii].type === targetBank.type) { sameTypeIdx = ii; break; }
      }
      if (sameTypeIdx >= 0) reps[sameTypeIdx] = targetBank;
      else reps[reps.length - 1] = targetBank;  // 兜底
    }

    // 4 类存款占比时序（个人活期 / 个人定期 / 公司活期 / 公司定期）
    var stacks = [
      { key: "deposit.dep_demand_retail", label: "个人活期", color: "#B3E5F7" },
      { key: "deposit.dep_time_retail",   label: "个人定期", color: "#2196F3" },
      { key: "deposit.dep_demand_corp",   label: "公司活期", color: "#9A9A9D" },
      { key: "deposit.dep_time_corp",     label: "公司定期", color: "#001233" },
    ];

    // 几何（4 列 × 4 行严格网格）
    var cols = 4;
    var rows = 4;
    var VBW = 1000;
    var cellW = (VBW - 40) / cols;
    var cellH = 96;   // 放大到 96
    var topPad = 60;
    var rowGap = 46;  // 标签留更多空间
    var VBH = topPad + rows * cellH + (rows - 1) * rowGap + 50;

    var parts2 = ['<svg viewBox="0 0 '+VBW+' '+VBH+'" xmlns="http://www.w3.org/2000/svg" font-family="Helvetica Neue, PingFang SC, sans-serif">'];

    // 顶部图例
    stacks.forEach(function(s, si){
      var x = 20 + si * 200;
      parts2.push('<rect x="'+x+'" y="20" width="14" height="10" fill="'+s.color+'" />');
      parts2.push('<text x="'+(x + 20)+'" y="30" font-size="11" font-weight="600" fill="#111114">'+s.label+'</text>');
    });

    // 每家银行画一格
    reps.forEach(function(bb, ri){
      var col = ri % cols, row = Math.floor(ri / cols);
      var cx = 20 + col * cellW;
      var cy = topPad + row * (cellH + rowGap);
      var isT = bb.id === targetBank.id;

      // 收集每年的 4 段值 + 除零保护
      var yearData = years.map(function(yr){
        var d = stacks.map(function(s){ return valOf(bb.id, yr, s.key) || 0; });
        var total = d.reduce(function(s,v){return s+v;}, 0);
        if (total > 0) {
          d = d.map(function(v){return v / total * 100;});
        } else {
          // 数据缺失：填一个等分占位（不渲染时再过滤）
          d = [25, 25, 25, 25];
        }
        return { data: d, total: total };
      });

      // 判断是否"个人活期"系统性收缩（红框）
      var firstDemandRetail = yearData[0].data[0];
      var lastDemandRetail = yearData[yearData.length-1].data[0];
      var demandShrinking = lastDemandRetail < firstDemandRetail - 3;  // 收缩 3 个百分点以上

      // 画 stacked area
      var xOfY = function(i){ return cx + i * cellW * 0.95 / (years.length - 1) + cellW * 0.025; };
      var yOfP = function(p){ return cy + cellH - (p / 100) * cellH; };
      // 检查至少一年有数据
      var hasData = yearData.some(function(yd){ return yd.total > 0; });
      if (!hasData) {
        // 整格无数据
        parts2.push('<rect x="'+cx+'" y="'+cy+'" width="'+(cellW * 0.96)+'" height="'+cellH+'" fill="#F7F7F8" stroke="#E5E5E7" stroke-width="0.5" stroke-dasharray="3,3" />');
        parts2.push('<text x="'+(cx + cellW * 0.48)+'" y="'+(cy + cellH / 2 + 4)+'" text-anchor="middle" font-size="11" fill="#BDBDC0">数据缺失</text>');
      } else {
        // 从下到上堆叠
        stacks.forEach(function(s, si){
          var d = '';
          years.forEach(function(yr, yi){
            var below = 0;
            for (var k=0; k<si; k++) below += yearData[yi].data[k];
            var top = below + yearData[yi].data[si];
            d += (d ? ' L ' : 'M ') + xOfY(yi) + ' ' + yOfP(top);
          });
          for (var yi = years.length - 1; yi >= 0; yi--) {
            var below2 = 0;
            for (var k=0; k<si; k++) below2 += yearData[yi].data[k];
            d += ' L ' + xOfY(yi) + ' ' + yOfP(below2);
          }
          d += ' Z';
          parts2.push('<path d="'+d+'" fill="'+s.color+'" opacity="0.88" />');
        });
      }

      // 边框
      if (isT) {
        parts2.push('<rect x="'+(cx - 1)+'" y="'+(cy - 1)+'" width="'+(cellW * 0.96 + 2)+'" height="'+(cellH + 2)+'" fill="none" stroke="#009CDE" stroke-width="2.5" />');
      } else if (demandShrinking) {
        parts2.push('<rect x="'+(cx - 1)+'" y="'+(cy - 1)+'" width="'+(cellW * 0.96 + 2)+'" height="'+(cellH + 2)+'" fill="none" stroke="#A04848" stroke-width="1.2" />');
      } else {
        parts2.push('<rect x="'+cx+'" y="'+cy+'" width="'+(cellW * 0.96)+'" height="'+cellH+'" fill="none" stroke="#E5E5E7" stroke-width="0.5" />');
      }

      // 标签（下方）
      var labelColor = isT ? "#009CDE" : "#111114";
      parts2.push('<text x="'+(cx + cellW * 0.48)+'" y="'+(cy + cellH + 18)+'" text-anchor="middle" font-size="11.5" font-weight="'+(isT?700:600)+'" fill="'+labelColor+'">'+escapeXml(bb.name)+'</text>');
      // 类型短名 + 定期化比例（末年）
      var lastYear = yearData[yearData.length-1];
      var timeFrac = lastYear.total > 0 ? (lastYear.data[1] + lastYear.data[3]) : null;
      var timeText = timeFrac !== null ? ' · 定期化 ' + timeFrac.toFixed(0) + '%' : '';
      parts2.push('<text x="'+(cx + cellW * 0.48)+'" y="'+(cy + cellH + 32)+'" text-anchor="middle" font-size="9.5" fill="#7A7A80">'+bb.type_short+'行'+timeText+'</text>');
    });

    parts2.push('</svg>');
    return parts2.join('');
  }

  // ---------- 10j. Bump Chart 凹凸排名图（关系图 4-R2）----------
  // 多个时间点的排名变化，比斜率图更丰富
  function renderBumpChart(story, dom, domKey, targetBank, year) {
    var metricKey = story.metric;
    if (!metricKey) return '';
    var parts = metricKey.split('.');
    var item = (_bm.data.domains[parts[0]] || {items:{}}).items[parts[1]];
    if (!item) return '';
    var dir = item.direction;
    var years = _bm.data.years;

    // 每年算排名
    var ranksByBank = {};
    years.forEach(function(yr){
      var rows = [];
      _bm.data.banks.forEach(function(bb){
        var v = valOf(bb.id, yr, metricKey);
        if (v !== null) rows.push({id: bb.id, val: v});
      });
      rows.sort(function(a,b){ return dir === 'higher_better' ? b.val - a.val : a.val - b.val; });
      rows.forEach(function(r, i){
        if (!ranksByBank[r.id]) ranksByBank[r.id] = {};
        ranksByBank[r.id][yr] = i + 1;
      });
    });

    var total = _bm.data.banks.length;
    var ROW_H = 12;  // 加宽到 12 px（之前 8.5）
    var VBW = 1000, VBH = 60 + total * ROW_H + 30;
    var TOP_PAD = 56, BOT_PAD = 28;
    var LEFT_PAD = 70, RIGHT_PAD = 140;
    var chartW = VBW - LEFT_PAD - RIGHT_PAD;
    var chartH = VBH - TOP_PAD - BOT_PAD;
    var xOf = function(yi){ return LEFT_PAD + yi * chartW / (years.length - 1); };
    var yOf = function(rank){ return TOP_PAD + (rank - 0.5) * chartH / total; };

    var parts2 = ['<svg viewBox="0 0 '+VBW+' '+VBH+'" xmlns="http://www.w3.org/2000/svg" font-family="Helvetica Neue, PingFang SC, sans-serif">'];

    // 年份列头
    years.forEach(function(yr, i){
      var x = xOf(i);
      parts2.push('<text x="'+x+'" y="32" text-anchor="middle" font-size="13" font-weight="700" fill="#111114">'+yr+'</text>');
      parts2.push('<line x1="'+x+'" y1="'+TOP_PAD+'" x2="'+x+'" y2="'+(VBH - BOT_PAD)+'" stroke="#F0F2F5" stroke-width="0.5" />');
    });

    // 背景分区色带（Top 15 / 16-40 / 41-N）
    var zoneEdges = [
      {top: 1,  bot: Math.min(15, total),     color: "rgba(46,125,50,0.07)" },
      {top: 16, bot: Math.min(40, total),     color: "rgba(96,99,102,0.03)" },
      {top: 41, bot: total,                   color: "rgba(160,72,72,0.07)" }
    ];
    zoneEdges.forEach(function(z){
      if (z.top > total) return;
      var zy1 = TOP_PAD + (z.top - 1) * chartH / total;
      var zy2 = TOP_PAD + z.bot * chartH / total;
      parts2.push('<rect x="'+LEFT_PAD+'" y="'+zy1+'" width="'+chartW+'" height="'+(zy2-zy1)+'" fill="'+z.color+'" />');
    });

    // Y 轴标
    parts2.push('<text x="'+(LEFT_PAD - 8)+'" y="'+(yOf(1) + 4)+'" text-anchor="end" font-size="10" fill="#7A7A80">第 1 名</text>');
    parts2.push('<text x="'+(LEFT_PAD - 8)+'" y="'+(yOf(total) + 4)+'" text-anchor="end" font-size="10" fill="#7A7A80">第 '+total+' 名</text>');
    if (total > 15) parts2.push('<text x="'+(LEFT_PAD - 8)+'" y="'+(yOf(15) + 4)+'" text-anchor="end" font-size="10" fill="#7A7A80">15</text>');
    if (total > 40) parts2.push('<text x="'+(LEFT_PAD - 8)+'" y="'+(yOf(40) + 4)+'" text-anchor="end" font-size="10" fill="#7A7A80">40</text>');

    // 类型颜色（功能编码）
    var typeColor = {
      "大型商业银行": "rgba(0,18,51,0.55)",
      "股份制商业银行": "rgba(33,150,243,0.55)",
      "城市商业银行": "rgba(96,99,102,0.55)",
      "农村商业银行": "rgba(184,134,11,0.55)"
    };

    // 画线（非目标行先）— 把大多数线降到极淡，让变动 ≥20 位的"大起大落者"突出
    _bm.data.banks.forEach(function(bb){
      if (bb.id === targetBank.id) return;
      var ranks = ranksByBank[bb.id];
      if (!ranks) return;
      var d = '';
      years.forEach(function(yr, i){
        var rk = ranks[yr];
        if (!rk) return;
        d += (d ? ' L ' : 'M ') + xOf(i) + ' ' + yOf(rk);
      });
      var color = typeColor[bb.type] || "#9A9A9D";
      // 排名变化判定
      var startRank = ranks[years[0]], endRank = ranks[years[years.length-1]];
      var change = (startRank && endRank) ? Math.abs(startRank - endRank) : 0;
      var sw, opacity;
      if (change >= 20) {
        // 大起大落者 — 突出
        sw = 1.4; opacity = 0.75;
      } else {
        // 平稳 — 降淡
        sw = 0.6; opacity = 0.30;
      }
      parts2.push('<path d="'+d+'" fill="none" stroke="'+color+'" stroke-width="'+sw+'" opacity="'+opacity+'" />');
      // 大起大落者：终点标名（仅限非目标行的代表性几家）
      if (change >= 25 && endRank) {
        parts2.push('<text x="'+(xOf(years.length-1) + 6)+'" y="'+(yOf(endRank) + 3)+'" font-size="9" fill="'+color+'" opacity="0.8">'+escapeXml(bb.name.slice(0,4))+'</text>');
      }
    });

    // 目标行
    var targetRanks = ranksByBank[targetBank.id];
    if (targetRanks) {
      var td = '';
      years.forEach(function(yr, i){
        var rk = targetRanks[yr];
        if (!rk) return;
        td += (td ? ' L ' : 'M ') + xOf(i) + ' ' + yOf(rk);
      });
      parts2.push('<path d="'+td+'" fill="none" stroke="#009CDE" stroke-width="3.5" />');
      // 端点圆 + 排名标
      years.forEach(function(yr, i){
        var rk = targetRanks[yr];
        if (!rk) return;
        parts2.push('<circle cx="'+xOf(i)+'" cy="'+yOf(rk)+'" r="4" fill="#009CDE" stroke="#fff" stroke-width="1.5" />');
        if (i === 0 || i === years.length - 1) {
          var anchor = i === 0 ? "end" : "start";
          var dx = i === 0 ? -8 : 8;
          parts2.push('<text x="'+(xOf(i) + dx)+'" y="'+(yOf(rk) + 4)+'" text-anchor="'+anchor+'" font-size="12" font-weight="700" fill="#009CDE">#'+rk+'</text>');
        }
      });
      // 终点右侧名字
      var lastRank = targetRanks[years[years.length-1]];
      if (lastRank) {
        parts2.push('<text x="'+(xOf(years.length-1) + 24)+'" y="'+(yOf(lastRank) + 4)+'" font-size="12" font-weight="700" fill="#009CDE">'+escapeXml(targetBank.name)+'</text>');
      }
    }

    // 图例（顶部）
    var lgY = 18;
    Object.keys(typeColor).forEach(function(t, ti){
      var x = LEFT_PAD + ti * 130;
      parts2.push('<line x1="'+x+'" y1="'+lgY+'" x2="'+(x + 18)+'" y2="'+lgY+'" stroke="'+typeColor[t]+'" stroke-width="2" />');
      var typeShort = {"大型商业银行":"大行","股份制商业银行":"股份","城市商业银行":"城商","农村商业银行":"农商"}[t];
      parts2.push('<text x="'+(x + 22)+'" y="'+(lgY + 4)+'" font-size="11" fill="#111114">'+typeShort+'行</text>');
    });

    parts2.push('</svg>');
    return parts2.join('');
  }

  // ---------- 10i. Waterfall 瀑布桥图（关系图 1-R3）----------
  // 营业收入 → 信用减值 / 业务管理费 / 所得税 → 归母净利润
  // 数据：营业收入(亿) - 信用成本*营收 - CIR*营收 - 所得税/利润 -> 归母净利润
  // 由于精确科目部分缺失，使用合理代理
  function renderWaterfall(story, dom, domKey, targetBank, year) {
    var bid = targetBank.id;
    var rev = valOf(bid, year, "capital.rev");         // 营业收入(亿)
    var ni  = valOf(bid, year, "capital.ni");          // 归母净利润(亿)
    var cirPct = valOf(bid, year, "profitability.cir"); // 成本收入比 %
    var creditCostPct = valOf(bid, year, "profitability.credit_cost_pct"); // 信用成本/营收 % (主要 2025)
    var effTaxPct = valOf(bid, year, "profitability.effective_tax");

    if (rev === null || ni === null) {
      return '<svg viewBox="0 0 1000 100" xmlns="http://www.w3.org/2000/svg"><text x="500" y="55" text-anchor="middle" font-size="14" fill="#999">'+escapeXml(targetBank.name)+' '+year+' 营收/净利数据不足</text></svg>';
    }
    // 估算各项（亿元）
    var manageFee = cirPct !== null ? rev * cirPct / 100 : null;
    var creditLoss = creditCostPct !== null ? rev * creditCostPct / 100 : null;
    // 已知 rev 和 ni；剩余 = rev - manageFee - creditLoss - 税 = ni；倒推税
    // 但 effTaxPct 是 所得税/利润总额，如果有就用
    // 简化：把 rev - ni 拆成 manageFee + creditLoss + (rev - ni - manageFee - creditLoss)
    var preTax = rev;
    var explained = (manageFee || 0) + (creditLoss || 0);
    var taxAndOther = rev - ni - explained;  // 剩余 = 所得税 + 其他损益（净额）

    // 瀑布段（每段标签 + 数值 + 注释 + 类型 down/up/start/end）
    // taxAndOther 可能为负（净利润 > 营收 - 管理费 - 减值，说明有其他收益）
    var taxIsBenefit = taxAndOther < 0;
    var segments = [
      { label: "营业收入",     value: rev,    type: "start", note: "" },
      { label: "业务管理费",   value: manageFee || 0, type: "down", note: cirPct === null ? "CIR 缺数据" : "CIR " + cirPct.toFixed(1) + "%" },
      { label: "信用减值损失", value: creditLoss || 0, type: "down", note: creditCostPct === null ? "数据缺，假为 0" : "信用成本 " + creditCostPct.toFixed(1) + "%" },
      { label: taxIsBenefit ? "其他收益（净）" : "所得税及其他", value: Math.abs(taxAndOther), type: taxIsBenefit ? "up" : "down", note: "倒推差额" },
      { label: "归母净利润",   value: ni,     type: "end", note: "" },
    ];

    // 计算每段的 from/to y（cumulative 跟踪累计值）
    var cumulative = 0;
    var bars = [];
    segments.forEach(function(s){
      if (s.type === "start") {
        bars.push({ label: s.label, value: s.value, from: 0, to: s.value, type: s.type, note: s.note });
        cumulative = s.value;
      } else if (s.type === "end") {
        bars.push({ label: s.label, value: s.value, from: 0, to: s.value, type: s.type, note: s.note });
      } else if (s.type === "down") {
        var newCum = cumulative - s.value;
        bars.push({
          label: s.label, value: s.value,
          from: Math.min(cumulative, newCum),
          to:   Math.max(cumulative, newCum),
          type: s.type, note: s.note,
        });
        cumulative = newCum;
      } else if (s.type === "up") {
        var newCum2 = cumulative + s.value;
        bars.push({
          label: s.label, value: s.value,
          from: Math.min(cumulative, newCum2),
          to:   Math.max(cumulative, newCum2),
          type: s.type, note: s.note,
        });
        cumulative = newCum2;
      }
    });

    // 几何
    var VBW = 1000, VBH = 460;
    var LEFT_PAD = 60, RIGHT_PAD = 30, TOP_PAD = 70, BOT_PAD = 70;
    var chartW = VBW - LEFT_PAD - RIGHT_PAD;
    var chartH = VBH - TOP_PAD - BOT_PAD;

    var maxV = rev;
    var minV = 0;
    var yOf = function(v){ return TOP_PAD + (1 - v / maxV) * chartH; };

    var colW = chartW / segments.length;
    var barW = colW * 0.5;

    var parts2 = ['<svg viewBox="0 0 '+VBW+' '+VBH+'" xmlns="http://www.w3.org/2000/svg" font-family="Helvetica Neue, PingFang SC, sans-serif">'];

    // Y 轴刻度
    for (var i=0; i<=4; i++) {
      var gy = TOP_PAD + i * chartH / 4;
      var gv = maxV - i * maxV / 4;
      parts2.push('<line x1="'+LEFT_PAD+'" y1="'+gy+'" x2="'+(VBW - RIGHT_PAD)+'" y2="'+gy+'" stroke="#F0F2F5" stroke-width="1" />');
      parts2.push('<text x="'+(LEFT_PAD - 6)+'" y="'+(gy + 4)+'" text-anchor="end" font-size="11" fill="#7A7A80">'+gv.toFixed(0)+'</text>');
    }
    parts2.push('<text x="22" y="'+((TOP_PAD + VBH - BOT_PAD) / 2)+'" font-size="12" font-weight="700" fill="#111114" transform="rotate(-90 22 '+((TOP_PAD + VBH - BOT_PAD) / 2)+')">亿元</text>');

    // 画柱 + 连接线
    var prevRightX = null;
    var prevTopY = null;       // 上一柱顶（小 y）
    var prevBotY = null;       // 上一柱底（大 y）
    bars.forEach(function(b, bi){
      var cx = LEFT_PAD + (bi + 0.5) * colW;
      var bx = cx - barW / 2;
      var yFrom = yOf(b.from);  // y of 较小 v
      var yTo   = yOf(b.to);    // y of 较大 v
      // 由于 yOf 反转，yFrom > yTo（视觉上 from 在下方，to 在上方）
      // 矩形 y = min(yFrom, yTo)，h = |yFrom-yTo|
      var rectY = Math.min(yFrom, yTo);
      var h = Math.abs(yFrom - yTo);
      var color = b.type === "start" ? "#606366"
                : b.type === "end"   ? "#2E7D32"
                : b.type === "down"  ? "#A04848"
                : b.type === "up"    ? "#2E7D32"
                : "#2196F3";
      parts2.push('<rect x="'+bx+'" y="'+rectY+'" width="'+barW+'" height="'+h+'" fill="'+color+'" />');
      // 数值标（柱顶上方 6px）
      var labelY = rectY - 6;
      var signPrefix = (b.type === "down") ? "-" : (b.type === "up" ? "+" : "");
      var valLabel = signPrefix + Math.abs(b.value).toFixed(1) + " 亿";
      parts2.push('<text x="'+cx+'" y="'+labelY+'" text-anchor="middle" font-size="12" font-weight="700" fill="'+color+'">'+valLabel+'</text>');
      // 占营收比例（数值上方 13px）
      if (b.type !== "start") {
        var pct = (Math.abs(b.value) / rev * 100).toFixed(1);
        parts2.push('<text x="'+cx+'" y="'+(labelY - 14)+'" text-anchor="middle" font-size="10" fill="#7A7A80">'+pct+'% / 营收</text>');
      }
      // 标签 + 注释（X 轴下方）
      parts2.push('<text x="'+cx+'" y="'+(TOP_PAD + chartH + 22)+'" text-anchor="middle" font-size="12" font-weight="700" fill="#111114">'+escapeXml(b.label)+'</text>');
      if (b.note) {
        parts2.push('<text x="'+cx+'" y="'+(TOP_PAD + chartH + 38)+'" text-anchor="middle" font-size="10" fill="#7A7A80">'+escapeXml(b.note)+'</text>');
      }
      // 连接虚线 — 从上一柱右边连到当前柱左边，y 用累计值的 y
      // 对 down 段：连接到上一柱顶（同累计值）；对 end：连接到 0 (yBase)
      if (prevRightX !== null && b.type !== "end") {
        // down/up 起点 = 上一累计值 = 较大值的 y
        var connectY = Math.min(yFrom, yTo) + (b.type === "down" ? 0 : h);  // down 起点在 top，up 起点在 bot
        // 更稳健的方法：直接连接到上一柱的顶
        if (prevTopY !== null) connectY = prevTopY;
        parts2.push('<line x1="'+prevRightX+'" y1="'+connectY+'" x2="'+bx+'" y2="'+connectY+'" stroke="#BDBDC0" stroke-width="1" stroke-dasharray="3,3" />');
      } else if (b.type === "end" && prevRightX !== null) {
        parts2.push('<line x1="'+prevRightX+'" y1="'+rectY+'" x2="'+bx+'" y2="'+rectY+'" stroke="#BDBDC0" stroke-width="1" stroke-dasharray="3,3" />');
      }
      prevRightX = bx + barW;
      prevTopY = rectY;   // 柱顶（小 y）
      prevBotY = rectY + h;
    });

    // 顶部说明
    parts2.push('<text x="'+LEFT_PAD+'" y="36" font-size="12" font-weight="700" fill="#111114">'+escapeXml(targetBank.name)+' '+year+' 年 ' + (creditCostPct === null ? "（信用减值 2025 单年覆盖较全）" : "") + '</text>');

    parts2.push('</svg>');
    return parts2.join('');
  }

  // ---------- 10h. Marimekko 马赛克图（关系图 1-R2）----------
  // 柱宽 = 营业收入绝对规模；柱高 = 100% 堆叠（利息净收入/手续费/非息）
  function renderMarimekko(story, dom, domKey, targetBank, year) {
    // 收集每家银行的营业收入 + 利息净收入占比 + 手续费占比 + 非息占比
    var pts = [];
    _bm.data.banks.forEach(function(bb){
      var rev = valOf(bb.id, year, "capital.rev");  // 营业收入(亿)
      var nii = valOf(bb.id, year, "profitability.nii_pct");
      var fee = valOf(bb.id, year, "profitability.fee_pct");
      if (rev === null || nii === null || rev <= 0) return;
      var feeSafe = (fee !== null && fee >= 0) ? fee : 0;
      var noni = valOf(bb.id, year, "profitability.non_interest_pct");
      if (noni === null) noni = Math.max(0, 100 - nii);
      // 三段（利息净收入 / 手续费 / 其他非息）按归一化处理
      var other_noni = Math.max(0, noni - feeSafe);
      // === 关键修复：强制三段和 = 100 ===
      var sum = nii + feeSafe + other_noni;
      if (sum <= 0) return;
      var nii_n = nii / sum * 100;
      var fee_n = feeSafe / sum * 100;
      var other_n = other_noni / sum * 100;
      pts.push({
        id: bb.id, name: bb.name, type: bb.type, type_short: bb.type_short,
        rev: rev, nii_pct: nii_n, fee_pct: fee_n, other_noni: other_n,
        isTarget: bb.id === targetBank.id
      });
    });
    if (pts.length < 4) {
      return '<svg viewBox="0 0 1000 100" xmlns="http://www.w3.org/2000/svg"><text x="500" y="55" text-anchor="middle" font-size="14" fill="#999">营收+收入结构数据不足</text></svg>';
    }
    // 按类型 → 类型内按规模排序
    var typeOrder = {"大型商业银行":1, "股份制商业银行":2, "城市商业银行":3, "农村商业银行":4};
    pts.sort(function(a,b){
      if (typeOrder[a.type] !== typeOrder[b.type]) return typeOrder[a.type] - typeOrder[b.type];
      return b.rev - a.rev;
    });

    var totalRev = pts.reduce(function(s,p){return s+p.rev;}, 0);
    if (totalRev <= 0) {
      return '<svg viewBox="0 0 1000 100" xmlns="http://www.w3.org/2000/svg"><text x="500" y="55" text-anchor="middle" font-size="14" fill="#999">营业收入数据全部为 0</text></svg>';
    }
    var VBW = 1000, VBH = 510;
    var LEFT_PAD = 50, RIGHT_PAD = 30, TOP_PAD = 70, BOT_PAD = 70;
    var chartW = VBW - LEFT_PAD - RIGHT_PAD;
    var chartH = VBH - TOP_PAD - BOT_PAD;

    var colors = { nii: "#001233", fee: "#2196F3", other_noni: "#9A9A9D" };
    var labels = { nii: "利息净收入", fee: "手续费及佣金净收入", other_noni: "其他非息" };

    var parts2 = ['<svg viewBox="0 0 '+VBW+' '+VBH+'" xmlns="http://www.w3.org/2000/svg" font-family="Helvetica Neue, PingFang SC, sans-serif">'];

    // Y 轴刻度（100% 堆叠的网格）
    for (var i=0; i<=4; i++) {
      var gy = TOP_PAD + i * chartH / 4;
      var pct = 100 - i * 25;
      parts2.push('<line x1="'+LEFT_PAD+'" y1="'+gy+'" x2="'+(VBW - RIGHT_PAD)+'" y2="'+gy+'" stroke="#F0F2F5" stroke-width="1" />');
      parts2.push('<text x="'+(LEFT_PAD - 6)+'" y="'+(gy + 4)+'" text-anchor="end" font-size="11" fill="#7A7A80">'+pct+'%</text>');
    }
    // Y 轴 80% 参考线（高息差依赖区）
    var y80 = TOP_PAD + (100 - 80) / 100 * chartH;
    parts2.push('<line x1="'+LEFT_PAD+'" y1="'+y80+'" x2="'+(VBW - RIGHT_PAD)+'" y2="'+y80+'" stroke="#A04848" stroke-width="1" stroke-dasharray="4,3" opacity="0.6" />');
    parts2.push('<text x="'+(VBW - RIGHT_PAD - 4)+'" y="'+(y80 - 4)+'" text-anchor="end" font-size="10" font-weight="700" fill="#A04848">利息净收入占比 80%（高息差依赖警戒）</text>');

    // 画柱
    var xCursor = LEFT_PAD;
    var typeGroupX = {};
    // 计算每柱实际宽度，保证最小可见宽度（即使是小行）
    var minW = 3;  // 最小 3 px
    var rawWidths = pts.map(function(p){ return (p.rev / totalRev) * chartW; });
    // 如果有低于 minW 的，按比例从大柱里"借"宽度
    var deficit = rawWidths.reduce(function(s,w){ return s + Math.max(0, minW - w); }, 0);
    var surplus = rawWidths.reduce(function(s,w){ return s + Math.max(0, w - minW); }, 0);
    var widths = rawWidths.map(function(w){
      if (w < minW) return minW;
      if (surplus === 0) return w;
      return w - (w - minW) * (deficit / surplus);
    });
    pts.forEach(function(p, pi){
      var w = widths[pi];
      // 各段高度（100% 堆叠）
      var niiH = (p.nii_pct / 100) * chartH;
      var feeH = (p.fee_pct / 100) * chartH;
      var otherH = (p.other_noni / 100) * chartH;
      // nii 在底部（堆叠从下往上）
      var yBase = TOP_PAD + chartH;
      var yNii = yBase - niiH;
      var yFee = yNii - feeH;
      var yOther = yFee - otherH;
      parts2.push('<rect x="'+xCursor+'" y="'+yNii+'" width="'+w+'" height="'+niiH+'" fill="'+colors.nii+'" />');
      parts2.push('<rect x="'+xCursor+'" y="'+yFee+'" width="'+w+'" height="'+feeH+'" fill="'+colors.fee+'" />');
      parts2.push('<rect x="'+xCursor+'" y="'+yOther+'" width="'+w+'" height="'+otherH+'" fill="'+colors.other_noni+'" />');
      // 目标行：加 RSM Blue 边框
      if (p.isTarget) {
        parts2.push('<rect x="'+(xCursor - 0.5)+'" y="'+(TOP_PAD - 0.5)+'" width="'+(w + 1)+'" height="'+(chartH + 1)+'" fill="none" stroke="#009CDE" stroke-width="2.5" />');
        // 顶部标识
        parts2.push('<text x="'+(xCursor + w/2)+'" y="'+(TOP_PAD - 8)+'" text-anchor="middle" font-size="11" font-weight="700" fill="#009CDE">'+escapeXml(p.name)+'</text>');
      }
      // 收集分组 x
      if (!typeGroupX[p.type]) typeGroupX[p.type] = { start: xCursor, end: xCursor + w };
      typeGroupX[p.type].end = xCursor + w;
      xCursor += w;
    });

    // 分组分隔线 + 标签
    Object.keys(typeGroupX).forEach(function(t){
      var g = typeGroupX[t];
      // 右侧分隔（最后一组不加）
      if (g.end < VBW - RIGHT_PAD - 1) {
        parts2.push('<line x1="'+g.end+'" y1="'+TOP_PAD+'" x2="'+g.end+'" y2="'+(TOP_PAD + chartH)+'" stroke="#FFFFFF" stroke-width="2" />');
      }
      var midX = (g.start + g.end) / 2;
      var typeShort = {"大型商业银行":"大行","股份制商业银行":"股份","城市商业银行":"城商","农村商业银行":"农商"}[t];
      parts2.push('<text x="'+midX+'" y="'+(TOP_PAD + chartH + 22)+'" text-anchor="middle" font-size="13" font-weight="700" fill="#111114">'+typeShort+'行</text>');
      var groupRev = pts.filter(function(p){return p.type === t;}).reduce(function(s,p){return s+p.rev;}, 0);
      var groupPct = (groupRev / totalRev * 100).toFixed(0);
      parts2.push('<text x="'+midX+'" y="'+(TOP_PAD + chartH + 38)+'" text-anchor="middle" font-size="10" fill="#7A7A80">营收 '+groupRev.toFixed(0)+' 亿 · '+groupPct+'%</text>');
    });

    // 图例（顶部独立行，居中）
    var legendTotalW = 600;
    var legendStartX = (VBW - legendTotalW) / 2;
    var lgY = 28;
    Object.keys(colors).forEach(function(k, ki){
      var lgX = legendStartX + ki * 200;
      parts2.push('<rect x="'+lgX+'" y="'+(lgY - 8)+'" width="16" height="11" fill="'+colors[k]+'" />');
      parts2.push('<text x="'+(lgX + 22)+'" y="'+lgY+'" font-size="11.5" font-weight="600" fill="#111114">'+labels[k]+'</text>');
    });
    // 说明：柱宽=营收规模 / 柱高=100%堆叠
    parts2.push('<text x="'+LEFT_PAD+'" y="'+lgY+'" font-size="10.5" font-weight="700" fill="#7A7A80">柱宽 = 营收规模</text>');
    parts2.push('<text x="'+(VBW - RIGHT_PAD)+'" y="'+lgY+'" text-anchor="end" font-size="10.5" font-weight="700" fill="#7A7A80">柱高 = 100% 堆叠</text>');

    parts2.push('</svg>');
    return parts2.join('');
  }

  // ---------- 10g. 健康仪表盘：CAMEL 信号灯矩阵（关系图 5-R1 / 0-R1）----------
  // 跨域综合视图：57 行 × 5 列（CAMEL）+ 综合 + 6 年趋势 sparkline
  // CAMEL 维度：
  //   C = 资本充足率（capital.car，higher_better）
  //   A = 不良率（quality.npl，lower_better）
  //   M = 成本收入比（profitability.cir，lower_better）
  //   E = 净资产收益率（profitability.roe，higher_better）
  //   L = 流动性覆盖率（liquidity.lcr，higher_better）
  function renderHealthMatrix(targetBank) {
    var year = _bm.snapshotYear;
    var hasTarget = !!targetBank;
    var dims = [
      { key: "C", label: "资本充足", metric: "capital.car", dir: "higher_better" },
      { key: "A", label: "资产质量", metric: "quality.npl", dir: "lower_better" },
      { key: "M", label: "运营效率", metric: "profitability.cir", dir: "lower_better" },
      { key: "E", label: "盈利能力", metric: "profitability.roe", dir: "higher_better" },
      { key: "L", label: "流动性",   metric: "liquidity.lcr", dir: "higher_better" },
    ];

    // 算每家银行在每个维度上的分位 + 信号灯（>=70 绿，40-70 黄，<40 红）
    function metricPercentile(bankId, metric, dir) {
      var v = valOf(bankId, year, metric);
      if (v === null) return null;
      var all = [];
      _bm.data.banks.forEach(function(bb){
        var x = valOf(bb.id, year, metric);
        if (x !== null) all.push(x);
      });
      if (all.length < 5) return null;
      var sorted = all.slice().sort(function(a,b){ return dir === 'higher_better' ? b - a : a - b; });
      var rank = sorted.indexOf(v) + 1;
      if (rank === 0) rank = sorted.length;
      return { val: v, pct: Math.round((1 - rank / sorted.length) * 100), rank: rank, total: sorted.length };
    }
    function signal(pct) {
      if (pct === null) return "na";
      if (pct >= 70) return "g";
      if (pct >= 40) return "y";
      return "r";
    }
    function signalColor(s) {
      return { g: "#2E7D32", y: "#A87A1F", r: "#A04848", na: "#E5E5E7" }[s];
    }

    // 算所有银行的综合分（5 维分位平均）
    var rows = [];
    _bm.data.banks.forEach(function(bb){
      var cells = dims.map(function(d){
        return metricPercentile(bb.id, d.metric, d.dir);
      });
      var pcts = cells.filter(function(c){return c !== null;}).map(function(c){return c.pct;});
      if (!pcts.length) return;
      var avgPct = Math.round(pcts.reduce(function(s,p){return s+p;}, 0) / pcts.length);
      rows.push({
        id: bb.id, name: bb.name, type_short: bb.type_short, region: bb.region,
        cells: cells, avgPct: avgPct,
        isTarget: hasTarget && bb.id === targetBank.id,
      });
    });
    rows.sort(function(a,b){ return b.avgPct - a.avgPct; });

    // 各列红灯率（汇总）
    var redRates = dims.map(function(d, di){
      var n = 0, r = 0;
      rows.forEach(function(row){
        var c = row.cells[di];
        if (c === null) return;
        n++;
        if (c.pct < 40) r++;
      });
      return n ? Math.round(r / n * 100) : 0;
    });

    // === HTML 表格 + Sparkline ===
    function spark(bankId, metric, dir) {
      var years = _bm.data.years;
      var vals = years.map(function(y){return valOf(bankId, y, metric);});
      var validVals = vals.filter(function(v){return v !== null;});
      if (validVals.length < 2) return '<span style="color:#BDBDC0">—</span>';
      var vmin = Math.min.apply(null, validVals);
      var vmax = Math.max.apply(null, validVals);
      if (vmin === vmax) vmax = vmin + 1;
      var W = 70, H = 18;
      var x = function(i){ return i * W / (years.length - 1); };
      var y = function(v){ return H - (v - vmin) / (vmax - vmin) * (H - 2) - 1; };
      var d = '';
      vals.forEach(function(v, i){
        if (v === null) return;
        d += (d ? ' L ' : 'M ') + x(i) + ' ' + y(v);
      });
      var lastV = validVals[validVals.length - 1];
      var firstV = validVals[0];
      var trendUp = dir === 'higher_better' ? lastV > firstV : lastV < firstV;
      var color = trendUp ? '#2E7D32' : '#A04848';
      return '<svg viewBox="0 0 '+W+' '+H+'" width="70" height="18">'
           + '<path d="'+d+'" fill="none" stroke="'+color+'" stroke-width="1.4" />'
           + '</svg>';
    }

    var headHtml = '<thead>'
      + '<tr>'
      +   '<th class="bm-hd-rank">#</th>'
      +   '<th class="bm-hd-bank">银行</th>'
      +   '<th class="bm-hd-score">综合分位</th>'
      +   dims.map(function(d, di){
            return '<th class="bm-hd-dim"><b>'+d.key+'</b> '+escapeXml(d.label)+'<br><span class="bm-hd-redrate">行业红灯率 '+redRates[di]+'%</span></th>';
          }).join("")
      +   '<th class="bm-hd-trend">综合 6 年趋势</th>'
      + '</tr>'
      + '</thead>';

    var bodyHtml = '<tbody>' + rows.map(function(row, ri){
      var rowCls = row.isTarget ? "is-target" : "";
      // 综合 sparkline：用 capital.car 作代理（最稳定）
      var sparkHtml = spark(row.id, "capital.car", "higher_better");
      var cellsHtml = row.cells.map(function(c){
        var s = signal(c ? c.pct : null);
        if (c === null) {
          return '<td class="bm-hd-cell bm-hd-na">—</td>';
        }
        return '<td class="bm-hd-cell" style="--sig:'+signalColor(s)+';">'
             + '<span class="bm-hd-light"></span>'
             + '<span class="bm-hd-val">P'+c.pct+'</span>'
             + '</td>';
      }).join("");
      var scoreCls = signal(row.avgPct);
      return '<tr class="bm-hd-row '+rowCls+'" data-jump-bank-id="'+row.id+'">'
           + '<td class="bm-hd-rank">'+(ri+1)+'</td>'
           + '<td class="bm-hd-bank"><b>'+escapeXml(row.name)+'</b><br><span>'+row.type_short+' · '+row.region+'</span></td>'
           + '<td class="bm-hd-score" style="--sig:'+signalColor(scoreCls)+';"><b>P'+row.avgPct+'</b></td>'
           + cellsHtml
           + '<td class="bm-hd-trend">'+sparkHtml+'</td>'
           + '</tr>';
    }).join("") + '</tbody>';

    var heroKicker = hasTarget ? '综合视图 · 健康仪表盘' : '封面页 · 进入数据对标';
    var heroTitle  = hasTarget ? 'CAMEL 信号灯矩阵' : '57 家银行健康全景';
    var heroSub    = hasTarget
      ? '57 家银行 × 5 维度 × 红黄绿三色 — 一页扫完全行业健康度'
      : '点击表格中任意一行进入该银行的 9 域详情。或先从左侧"选定目标银行"挑一家开始。';
    var heroThesis = '行按综合分位排序，自上而下从绿到红。CAMEL = 资本(C) · 资产质量(A) · 运营效率(M) · 盈利能力(E) · 流动性(L)。列头标注各维度全行业的红灯率（分位<40 占比），快速识别行业共性短板。'
      + (hasTarget ? escapeXml(targetBank.name) + ' 行以 RSM Blue 描边突出。' : '');
    return ''
      + '<header class="bm-chapter-hero bm-hd-hero">'
      + '  <div class="bm-chapter-text">'
      + '    <div class="bm-chapter-num">'+heroKicker+'</div>'
      + '    <h2 class="bm-chapter-title">'+heroTitle+'</h2>'
      + '    <p class="bm-chapter-sub">'+heroSub+'</p>'
      + '    <p class="bm-chapter-thesis">'+heroThesis+'</p>'
      + '  </div>'
      + '</header>'
      + '<div class="bm-health-wrap">'
      +   '<table class="bm-health">' + headHtml + bodyHtml + '</table>'
      +   '<p class="bm-health-note">每格信号灯：绿（分位≥70）/ 黄（40–70）/ 红（<40）。Sparkline 显示综合资本充足率 6 年走势：绿=改善 / 红=恶化。截面 ' + year + ' 年末，分位均基于全国 57 家。</p>'
      + '</div>';
  }

  // ---------- 10b. 分组柱图（RSM 风格，像素级 viewBox + 行级独立刻度）----------
  // 设计要点：
  //  · viewBox = "0 0 1000 H"，所有字号写在 SVG 属性里（跟随 viewBox 缩放）
  //  · 每行有自己的 vmin/vmax（量级悬殊问题：不同指标量级差 100×时不会被压扁）
  //  · 行内多系列（本行 + 对标组）从上往下并排，柱内白字 = 对标系列名，柱右 = 数值
  function renderGroupBarChart(rows) {
    if (!rows.length) return '';

    // 几何参数（viewBox 单位 ≈ px）
    var VBW = 1000;
    var ROW_H = 108;  // 比之前 92 高，给底部 P10/P90 刻度让出 10-12px
    var TOP_PAD = 18, BOT_PAD = 18;
    var H = TOP_PAD + BOT_PAD + ROW_H * rows.length;
    var LABEL_W = 200;
    var RIGHT_PAD = 110;
    var chartLeft = LABEL_W;
    var chartRight = VBW - RIGHT_PAD;
    var chartW = chartRight - chartLeft;

    // 字号常量（viewBox 单位；SVG 缩放时同步缩放）
    var FS_METRIC = 15;     // 指标名
    var FS_UNIT   = 12;     // 单位
    var FS_SERIES = 12;     // 系列名（柱内/柱外）
    var FS_VALUE  = 13;     // 数值

    var parts = ['<svg viewBox="0 0 '+VBW+' '+H+'" xmlns="http://www.w3.org/2000/svg" font-family="Noto Sans CJK SC, PingFang SC, sans-serif">'];

    rows.forEach(function(r, ri){
      var rowTop = TOP_PAD + ri * ROW_H;

      // === 每行独立计算坐标范围（同时考虑 series + 分布 P10-P90） ===
      var rowVals = r.series.map(function(s){ return s.value; })
                            .filter(function(v){ return v !== null && !isNaN(v); });
      var dist = r.dist;
      var hasNeg = rowVals.some(function(v){ return v < 0; }) || (dist && dist.min < 0);

      var vmax = rowVals.length ? Math.max.apply(null, rowVals) : 1;
      var vmin = rowVals.length ? Math.min.apply(null, rowVals) : 0;
      // 分布的 P90/P10 一并纳入坐标范围，保证阴影带在画面内
      if (dist) {
        vmax = Math.max(vmax, dist.p90);
        vmin = Math.min(vmin, dist.p10);
      }
      var rangeBase = hasNeg ? Math.min(0, vmin) : 0;
      var rangeTop = vmax * 1.12;
      if (rangeTop === rangeBase) rangeTop = rangeBase + 1;
      var span = rangeTop - rangeBase;
      var zeroX = hasNeg
        ? chartLeft + ((-rangeBase) / span) * chartW
        : chartLeft;
      var xOf = function(v){ return chartLeft + ((v - rangeBase) / span) * chartW; };

      // 指标名 + 单位 + kind 标识（衍生指标用左侧色块）+ 行内 range（左栏）
      var titleAttr = r.formula ? '><title>'+escapeXml(r.formula)+'</title' : '';
      // 衍生指标：在 LABEL_W 最左侧画一个 4px 色条
      if (r.kind === "derived") {
        parts.push('<rect x="2" y="'+(rowTop+12)+'" width="3" height="36" fill="#009CDE" />');
      }
      parts.push('<text x="'+(LABEL_W - 12)+'" y="'+(rowTop + 22)+'" text-anchor="end" font-size="'+FS_METRIC+'" font-weight="700" fill="'+(r.kind === "derived" ? "#009CDE" : "#111114")+'"'+titleAttr+'>'+escapeXml(r.name)+'</text>');
      parts.push('<text x="'+(LABEL_W - 12)+'" y="'+(rowTop + 40)+'" text-anchor="end" font-size="'+FS_UNIT+'" fill="#7A7A80" letter-spacing="0.05em">'+escapeXml(r.unit)+'</text>');
      if (dist) {
        parts.push('<text x="'+(LABEL_W - 12)+'" y="'+(rowTop + 58)+'" text-anchor="end" font-size="10" fill="#bdbdbd">分布 N='+dist.n+' · 中位 '+formatVal(dist.p50, r.unit)+'</text>');
      } else {
        var rangeStr = formatVal(rangeBase, r.unit) + ' – ' + formatVal(rangeTop, r.unit);
        parts.push('<text x="'+(LABEL_W - 12)+'" y="'+(rowTop + 58)+'" text-anchor="end" font-size="10" fill="#bdbdbd">range '+rangeStr+'</text>');
      }

      // === 分布阴影带（P10-P90 浅、P25-P75 深、P50 中位线）===
      // 占满该行图区竖向高度
      var bandTop = rowTop + 8;
      var bandBot = rowTop + ROW_H - 10;
      if (dist) {
        // 外层带：P10-P90
        var x10 = xOf(dist.p10), x90 = xOf(dist.p90);
        parts.push('<rect x="'+x10+'" y="'+bandTop+'" width="'+Math.max(0.5, x90-x10)+'" height="'+(bandBot-bandTop)+'" fill="#B3E5F7" opacity="0.30" />');
        // 内层带：P25-P75 (IQR)
        var x25 = xOf(dist.p25), x75 = xOf(dist.p75);
        parts.push('<rect x="'+x25+'" y="'+bandTop+'" width="'+Math.max(0.5, x75-x25)+'" height="'+(bandBot-bandTop)+'" fill="#B3E5F7" opacity="0.55" />');
        // P50 中位线（虚线）
        var x50 = xOf(dist.p50);
        parts.push('<line x1="'+x50+'" y1="'+bandTop+'" x2="'+x50+'" y2="'+bandBot+'" stroke="#009CDE" stroke-width="1.4" stroke-dasharray="4,3" />');
        parts.push('<text x="'+(x50 + 4)+'" y="'+(bandTop + 12)+'" font-size="10" font-weight="600" fill="#009CDE">P50 中位</text>');
        // P10 / P90 端点小刻度
        parts.push('<text x="'+x10+'" y="'+(bandBot + 11)+'" font-size="9" fill="#7aa9bf" text-anchor="middle">P10</text>');
        parts.push('<text x="'+x90+'" y="'+(bandBot + 11)+'" font-size="9" fill="#7aa9bf" text-anchor="middle">P90</text>');
      }

      // 零线 / 起点线
      parts.push('<line x1="'+zeroX+'" y1="'+(rowTop + 6)+'" x2="'+zeroX+'" y2="'+(rowTop + ROW_H - 8)+'" stroke="#E5E8ED" stroke-width="1" />');

      var nS = r.series.length;
      if (!nS) {
        parts.push('<text x="'+(chartLeft + 4)+'" y="'+(rowTop + ROW_H/2)+'" font-size="12" fill="#bbb">无对标系列</text>');
        return;
      }

      // 系列柱高度计算（确保不重叠）
      var availH = ROW_H - 20;     // 上下各留 10
      var minBarH = 14, maxBarH = 22;
      var minGap = 4;
      var barH = Math.max(minBarH, Math.min(maxBarH, (availH - (nS - 1) * minGap) / nS));
      var gap = nS > 1 ? (availH - barH * nS) / (nS - 1) : 0;
      var blockH = barH * nS + gap * (nS - 1);
      var startY = rowTop + (ROW_H - blockH) / 2;

      r.series.forEach(function(s, si){
        var by = startY + si * (barH + gap);
        if (s.value === null || isNaN(s.value)) {
          parts.push('<text x="'+(zeroX + 6)+'" y="'+(by + barH * 0.7)+'" font-size="'+FS_SERIES+'" font-style="italic" fill="#bdbdbd">'+escapeXml(s.label)+'：无数据</text>');
          return;
        }
        var v = s.value;
        var w, bx;
        if (hasNeg) {
          if (v >= 0) { w = (v / span) * chartW; bx = zeroX; }
          else        { w = ((-v) / span) * chartW; bx = zeroX - w; }
        } else {
          w = ((v - rangeBase) / span) * chartW;
          bx = chartLeft;
        }
        w = Math.max(2, w);
        // 柱体
        var color = colorOf(s.cls);
        parts.push('<rect x="'+bx+'" y="'+by+'" width="'+w+'" height="'+barH+'" rx="1.5" fill="'+color+'" />');
        // 柱内系列名（柱够宽）/ 柱外系列名（柱窄）
        var seriesLabelMinW = (s.label.length * FS_SERIES * 0.6) + 14;
        if (w >= seriesLabelMinW) {
          parts.push('<text x="'+(bx + 8)+'" y="'+(by + barH * 0.68)+'" font-size="'+FS_SERIES+'" font-weight="600" fill="#fff">'+escapeXml(s.label)+'</text>');
        } else {
          parts.push('<text x="'+(bx - 6)+'" y="'+(by + barH * 0.7)+'" text-anchor="end" font-size="'+FS_SERIES+'" fill="#606366">'+escapeXml(s.label)+'</text>');
        }
        // 柱外右侧数值
        var valTextX = bx + w + 6;
        var valColor = s.cls === 'is-target' ? '#001233' : '#1a1a1a';
        var valWeight = s.cls === 'is-target' ? 700 : 600;
        parts.push('<text x="'+valTextX+'" y="'+(by + barH * 0.7)+'" font-size="'+FS_VALUE+'" font-weight="'+valWeight+'" fill="'+valColor+'">'+formatVal(v, r.unit)+'</text>');
      });

      // 行分隔线
      if (ri < rows.length - 1) {
        parts.push('<line x1="20" y1="'+(rowTop + ROW_H - 1)+'" x2="'+(VBW - 20)+'" y2="'+(rowTop + ROW_H - 1)+'" stroke="#F0F2F5" stroke-width="1" />');
      }
    });
    parts.push('</svg>');
    return parts.join('');
  }

  // ---------- 10e. 行业气泡矩阵 BubbleMatrix（关系图 2-R4）----------
  // X = 行业占比，Y = 行业不良率，气泡大小 = 加权风险暴露（占比 × 不良率）
  // 仅展示目标行（每家银行的对公行业暴露画像）
  function renderBubbleMatrix(story, dom, domKey, targetBank, year) {
    var year_ = year;
    // 行业 = 占比 key + 不良率 key + 显示名 + 类别色
    var sectors = [
      { name: "制造业",       pctKey: "mfg_pct",       nplKey: "mfg_npl",       cat: "core" },
      { name: "房地产业",     pctKey: "re_pct",        nplKey: "re_npl",        cat: "high_risk" },
      { name: "建筑业",       pctKey: "constr_pct",    nplKey: "constr_npl",    cat: "high_risk" },
      { name: "批发零售",     pctKey: "wholesale_pct", nplKey: "wholesale_npl", cat: "core" },
      { name: "租赁商务",     pctKey: "leasing_pct",   nplKey: "leasing_npl",   cat: "high_risk" },
      { name: "交通运输",     pctKey: "transport_pct", nplKey: "transport_npl", cat: "infra" },
      { name: "电力燃气",     pctKey: "utility_pct",   nplKey: "utility_npl",   cat: "infra" },
      { name: "采矿业",       pctKey: "mining_pct",    nplKey: "mining_npl",    cat: "infra" },
      { name: "农林牧渔",     pctKey: "agri_pct",      nplKey: "agri_npl",      cat: "core" },
    ];
    var catColor = { high_risk: "#A04848", core: "#2196F3", infra: "#606366" };
    var catLabel = { high_risk: "地方化债三联", core: "核心实体", infra: "基建公用" };

    // 取目标行的每个行业 pct + npl
    var pts = [];
    sectors.forEach(function(s){
      var pct = valOf(targetBank.id, year_, "loan_corp." + s.pctKey);
      var npl = valOf(targetBank.id, year_, "loan_corp." + s.nplKey);
      if (pct === null) return;
      pts.push({
        name: s.name, pct: pct,
        npl: npl, exp: npl !== null ? pct * npl : null,
        cat: s.cat, color: catColor[s.cat]
      });
    });
    if (!pts.length) {
      return '<svg viewBox="0 0 1000 100" xmlns="http://www.w3.org/2000/svg"><text x="500" y="55" text-anchor="middle" font-size="14" fill="#999">无行业占比数据</text></svg>';
    }

    // 几何
    var VBW = 1000, VBH = 460;
    var LEFT_PAD = 70, RIGHT_PAD = 60, TOP_PAD = 50, BOT_PAD = 60;
    var chartW = VBW - LEFT_PAD - RIGHT_PAD;
    var chartH = VBH - TOP_PAD - BOT_PAD;

    // X / Y 范围
    var xVals = pts.map(function(p){return p.pct;}).filter(function(v){return v!==null;});
    var yVals = pts.map(function(p){return p.npl;}).filter(function(v){return v!==null;});
    var xmax = Math.max(20, Math.max.apply(null, xVals) * 1.18);
    var ymax = Math.max(3, (yVals.length ? Math.max.apply(null, yVals) : 1) * 1.25);
    var xOf = function(v){ return LEFT_PAD + v / xmax * chartW; };
    var yOf = function(v){ return TOP_PAD + (1 - v / ymax) * chartH; };
    // 气泡半径：sqrt(暴露)，4-22 px
    var maxExp = Math.max.apply(null, pts.map(function(p){return p.exp || 0;}));
    var rOf = function(e){
      if (e === null || e === 0 || maxExp === 0) return 4;
      return 4 + Math.sqrt(e / maxExp) * 18;
    };

    var parts2 = ['<svg viewBox="0 0 '+VBW+' '+VBH+'" xmlns="http://www.w3.org/2000/svg" font-family="Helvetica Neue, PingFang SC, sans-serif">'];

    // 网格
    for (var i=0; i<=4; i++) {
      var gy = TOP_PAD + i * chartH / 4;
      var gv = ymax - i * ymax / 4;
      parts2.push('<line x1="'+LEFT_PAD+'" y1="'+gy+'" x2="'+(VBW - RIGHT_PAD)+'" y2="'+gy+'" stroke="#F0F2F5" stroke-width="1" />');
      parts2.push('<text x="'+(LEFT_PAD - 8)+'" y="'+(gy + 4)+'" text-anchor="end" font-size="11" fill="#7A7A80">'+gv.toFixed(1)+'%</text>');
    }
    for (var j=0; j<=4; j++) {
      var gx = LEFT_PAD + j * chartW / 4;
      var gxv = j * xmax / 4;
      parts2.push('<line x1="'+gx+'" y1="'+TOP_PAD+'" x2="'+gx+'" y2="'+(VBH - BOT_PAD)+'" stroke="#F7F7F8" stroke-width="1" />');
      parts2.push('<text x="'+gx+'" y="'+(VBH - BOT_PAD + 18)+'" text-anchor="middle" font-size="11" fill="#7A7A80">'+gxv.toFixed(0)+'%</text>');
    }
    // 轴标题
    parts2.push('<text x="'+((LEFT_PAD + VBW - RIGHT_PAD) / 2)+'" y="'+(VBH - 12)+'" text-anchor="middle" font-size="12" font-weight="700" fill="#111114">该行业占对公贷款比例 (%)</text>');
    parts2.push('<text x="20" y="'+((TOP_PAD + VBH - BOT_PAD) / 2)+'" font-size="12" font-weight="700" fill="#111114" transform="rotate(-90 20 '+((TOP_PAD + VBH - BOT_PAD) / 2)+')">该行业不良率 (%)</text>');

    // 参考线 X=10% / Y=2%
    if (xmax > 10) {
      var x10 = xOf(10);
      parts2.push('<line x1="'+x10+'" y1="'+TOP_PAD+'" x2="'+x10+'" y2="'+(VBH - BOT_PAD)+'" stroke="#A04848" stroke-width="1" stroke-dasharray="5,3" opacity="0.7" />');
      parts2.push('<text x="'+(x10 + 4)+'" y="'+(TOP_PAD + 12)+'" font-size="10" fill="#A04848" font-weight="700">10% 高占比阈值</text>');
    }
    if (ymax > 2) {
      var y2 = yOf(2);
      parts2.push('<line x1="'+LEFT_PAD+'" y1="'+y2+'" x2="'+(VBW - RIGHT_PAD)+'" y2="'+y2+'" stroke="#A04848" stroke-width="1" stroke-dasharray="5,3" opacity="0.7" />');
      parts2.push('<text x="'+(VBW - RIGHT_PAD - 4)+'" y="'+(y2 - 4)+'" text-anchor="end" font-size="10" fill="#A04848" font-weight="700">2% 高不良阈值</text>');
    }
    // 右上角风险区底纹
    if (xmax > 10 && ymax > 2) {
      parts2.push('<rect x="'+xOf(10)+'" y="'+TOP_PAD+'" width="'+(xOf(xmax) - xOf(10))+'" height="'+(yOf(2) - TOP_PAD)+'" fill="rgba(160,72,72,0.06)" />');
      parts2.push('<text x="'+(VBW - RIGHT_PAD - 8)+'" y="'+(TOP_PAD + 28)+'" text-anchor="end" font-size="10" font-weight="700" fill="#A04848" opacity="0.65">核心风险区</text>');
    }

    // 气泡 — 按 exp 从大到小画，让小气泡在上方不被覆盖
    var ptsSorted = pts.slice().sort(function(a,b){return (b.exp||0) - (a.exp||0);});
    ptsSorted.forEach(function(p){
      if (p.npl === null) {
        // npl 数据缺，放在底部边缘
        var nx = xOf(p.pct), ny = VBH - BOT_PAD - 4;
        parts2.push('<circle cx="'+nx+'" cy="'+ny+'" r="3" fill="none" stroke="'+p.color+'" stroke-width="1.5" stroke-dasharray="2,2" />');
        return;
      }
      var cx = xOf(p.pct), cy = yOf(p.npl), r = rOf(p.exp);
      parts2.push('<circle cx="'+cx+'" cy="'+cy+'" r="'+r+'" fill="'+p.color+'" opacity="0.55" stroke="#fff" stroke-width="1.5" />');
      // 标签：行业名 + 占比 × 不良
      var labelY = cy - r - 4;
      parts2.push('<text x="'+cx+'" y="'+labelY+'" text-anchor="middle" font-size="11" font-weight="700" fill="#111114">'+escapeXml(p.name)+'</text>');
      parts2.push('<text x="'+cx+'" y="'+(labelY + 11)+'" text-anchor="middle" font-size="10" fill="#7A7A80">'+p.pct.toFixed(1)+'% × '+p.npl.toFixed(2)+'%</text>');
    });

    // 图例 — 三类
    var lgX = LEFT_PAD;
    var lgY = TOP_PAD - 28;
    Object.keys(catColor).forEach(function(k, ki){
      var x = lgX + ki * 145;
      parts2.push('<circle cx="'+(x + 5)+'" cy="'+lgY+'" r="5" fill="'+catColor[k]+'" opacity="0.7" />');
      parts2.push('<text x="'+(x + 16)+'" y="'+(lgY + 4)+'" font-size="11" fill="#111114" font-weight="600">'+catLabel[k]+'</text>');
    });

    parts2.push('</svg>');
    return parts2.join('');
  }

  // ---------- 10f. 三维气泡 Bubble3D（关系图 4-R3）----------
  // X = NIM，Y = 权益乘数 leverage，气泡 = ROE，颜色 = NPL（lower better — 浅绿 -> 深红）
  function renderBubble3D(story, dom, domKey, targetBank, year) {
    var pts = [];
    _bm.data.banks.forEach(function(bb){
      var nim = valOf(bb.id, year, "nim.nim");
      var lev = valOf(bb.id, year, "profitability.leverage");
      var roe = valOf(bb.id, year, "profitability.roe");
      var npl = valOf(bb.id, year, "quality.npl");
      if (nim === null || lev === null || roe === null) return;
      pts.push({
        id: bb.id, name: bb.name, type_short: bb.type_short,
        nim: nim, lev: lev, roe: roe, npl: npl,
        isTarget: bb.id === targetBank.id
      });
    });
    if (pts.length < 5) {
      return '<svg viewBox="0 0 1000 100" xmlns="http://www.w3.org/2000/svg"><text x="500" y="55" text-anchor="middle" font-size="14" fill="#999">三维气泡所需数据不足</text></svg>';
    }

    // 几何
    var VBW = 1000, VBH = 520;
    var LEFT_PAD = 80, RIGHT_PAD = 60, TOP_PAD = 70, BOT_PAD = 60;
    var chartW = VBW - LEFT_PAD - RIGHT_PAD;
    var chartH = VBH - TOP_PAD - BOT_PAD;

    var xVals = pts.map(function(p){return p.nim;});
    var yVals = pts.map(function(p){return p.lev;});
    var xmin = Math.min.apply(null, xVals), xmax = Math.max.apply(null, xVals);
    var ymin = Math.min.apply(null, yVals), ymax = Math.max.apply(null, yVals);
    var xpad = (xmax - xmin) * 0.1, ypad = (ymax - ymin) * 0.08;
    xmin -= xpad; xmax += xpad;
    ymin -= ypad; ymax += ypad;
    var xOf = function(v){ return LEFT_PAD + (v - xmin) / (xmax - xmin) * chartW; };
    var yOf = function(v){ return TOP_PAD + (1 - (v - ymin) / (ymax - ymin)) * chartH; };

    // ROE 决定气泡半径
    var roeMax = Math.max.apply(null, pts.map(function(p){return Math.abs(p.roe);}));
    var rOf = function(roe){
      if (roe === null) return 3;
      return 4 + Math.sqrt(Math.abs(roe) / roeMax) * 14;
    };
    // NPL 决定颜色（lower_better）
    var nplVals = pts.map(function(p){return p.npl;}).filter(function(v){return v!==null;});
    var nplMin = Math.min.apply(null, nplVals), nplMax = Math.max.apply(null, nplVals);
    var colorOfNpl = function(npl){
      if (npl === null) return '#9A9A9D';
      var t = (npl - nplMin) / (nplMax - nplMin || 1);
      // 0 = 浅绿，1 = 深红
      var r = Math.round(46  + t * (160 - 46));
      var g = Math.round(125 + t * (72  - 125));
      var b = Math.round(50  + t * (72  - 50));
      return 'rgb('+r+','+g+','+b+')';
    };

    var parts2 = ['<svg viewBox="0 0 '+VBW+' '+VBH+'" xmlns="http://www.w3.org/2000/svg" font-family="Helvetica Neue, PingFang SC, sans-serif">'];

    // 网格
    for (var i=0; i<=4; i++) {
      var gy = TOP_PAD + i * chartH / 4;
      var gv = ymax - i * (ymax - ymin) / 4;
      parts2.push('<line x1="'+LEFT_PAD+'" y1="'+gy+'" x2="'+(VBW - RIGHT_PAD)+'" y2="'+gy+'" stroke="#F0F2F5" stroke-width="1" />');
      parts2.push('<text x="'+(LEFT_PAD - 8)+'" y="'+(gy + 4)+'" text-anchor="end" font-size="11" fill="#7A7A80">'+gv.toFixed(1)+'x</text>');
    }
    for (var j=0; j<=4; j++) {
      var gx = LEFT_PAD + j * chartW / 4;
      var gxv = xmin + j * (xmax - xmin) / 4;
      parts2.push('<line x1="'+gx+'" y1="'+TOP_PAD+'" x2="'+gx+'" y2="'+(VBH - BOT_PAD)+'" stroke="#F7F7F8" stroke-width="1" />');
      parts2.push('<text x="'+gx+'" y="'+(VBH - BOT_PAD + 18)+'" text-anchor="middle" font-size="11" fill="#7A7A80">'+gxv.toFixed(2)+'%</text>');
    }
    // 轴标题
    parts2.push('<text x="'+((LEFT_PAD + VBW - RIGHT_PAD) / 2)+'" y="'+(VBH - 12)+'" text-anchor="middle" font-size="12" font-weight="700" fill="#111114">净息差 NIM（%）→ 定价能力</text>');
    parts2.push('<text x="22" y="'+((TOP_PAD + VBH - BOT_PAD) / 2)+'" font-size="12" font-weight="700" fill="#111114" transform="rotate(-90 22 '+((TOP_PAD + VBH - BOT_PAD) / 2)+')">权益乘数（x）→ 杠杆倾向</text>');

    // 等 ROE 双曲线：ROE ≈ ROA × leverage；这里近似 NIM × leverage = ROE
    // 在 (NIM, lev) 平面上等 ROE 线是双曲线 lev = ROE / NIM
    [8, 10, 12, 15].forEach(function(roe){
      var d = '';
      var step = (xmax - xmin) / 100;
      for (var x = xmin; x <= xmax; x += step) {
        if (x <= 0) continue;
        var lev = roe / x;
        if (lev < ymin || lev > ymax) continue;
        d += (d ? ' L ' : 'M ') + xOf(x) + ' ' + yOf(lev);
      }
      if (d) {
        parts2.push('<path d="'+d+'" fill="none" stroke="#BDBDC0" stroke-width="0.8" stroke-dasharray="2,3" />');
        // 标 ROE 值
        var xLbl = xmax * 0.85;
        if (roe / xLbl >= ymin && roe / xLbl <= ymax) {
          parts2.push('<text x="'+xOf(xLbl)+'" y="'+(yOf(roe / xLbl) - 4)+'" font-size="9" fill="#BDBDC0">ROE='+roe+'%</text>');
        }
      }
    });

    // 象限标注（中位 NIM/lev 切分）
    var midNim = (xmin + xmax) / 2;
    var midLev = (ymin + ymax) / 2;
    parts2.push('<line x1="'+xOf(midNim)+'" y1="'+TOP_PAD+'" x2="'+xOf(midNim)+'" y2="'+(VBH - BOT_PAD)+'" stroke="#E5E5E7" stroke-width="0.6" />');
    parts2.push('<line x1="'+LEFT_PAD+'" y1="'+yOf(midLev)+'" x2="'+(VBW - RIGHT_PAD)+'" y2="'+yOf(midLev)+'" stroke="#E5E5E7" stroke-width="0.6" />');
    parts2.push('<text x="'+(LEFT_PAD + 6)+'" y="'+(TOP_PAD + 14)+'" font-size="10" font-weight="700" fill="#A04848" opacity="0.7">脆弱繁荣区（低 NIM × 高杠杆）</text>');
    parts2.push('<text x="'+(VBW - RIGHT_PAD - 6)+'" y="'+(VBH - BOT_PAD - 8)+'" text-anchor="end" font-size="10" font-weight="700" fill="#2E7D32" opacity="0.7">健康盈利区（高 NIM × 低杠杆）</text>');

    // 气泡 — 按 |ROE| 从大到小画（大圈在下，小圈在上）
    var ptsSorted = pts.slice().sort(function(a,b){return rOf(b.roe) - rOf(a.roe);});
    ptsSorted.forEach(function(p){
      if (p.isTarget) return;  // 目标行最后画
      var cx = xOf(p.nim), cy = yOf(p.lev), r = rOf(p.roe);
      parts2.push('<circle cx="'+cx+'" cy="'+cy+'" r="'+r+'" fill="'+colorOfNpl(p.npl)+'" opacity="0.55" stroke="#fff" stroke-width="1" />');
    });
    // 目标行
    var tp = pts.filter(function(p){return p.isTarget;})[0];
    if (tp) {
      var tcx = xOf(tp.nim), tcy = yOf(tp.lev), tr = rOf(tp.roe);
      parts2.push('<circle cx="'+tcx+'" cy="'+tcy+'" r="'+(tr + 3)+'" fill="none" stroke="#009CDE" stroke-width="3" />');
      parts2.push('<circle cx="'+tcx+'" cy="'+tcy+'" r="'+tr+'" fill="'+colorOfNpl(tp.npl)+'" stroke="#fff" stroke-width="2" />');
      var lblX = tcx + tr + 8, lblY = tcy - 6;
      parts2.push('<text x="'+lblX+'" y="'+lblY+'" font-size="12" font-weight="700" fill="#009CDE">'+escapeXml(tp.name)+'</text>');
      parts2.push('<text x="'+lblX+'" y="'+(lblY + 12)+'" font-size="10" fill="#111114">NIM '+tp.nim.toFixed(2)+'% · L '+tp.lev.toFixed(2)+'x · ROE '+tp.roe.toFixed(2)+'%</text>');
    }

    // 图例
    parts2.push('<text x="'+LEFT_PAD+'" y="'+(TOP_PAD - 38)+'" font-size="11" font-weight="700" fill="#111114">气泡大小 ＝ ROE 绝对值 &nbsp; ·  &nbsp; 颜色：浅绿 ＝ 低不良率（风控强）→ 深红 ＝ 高不良率（风控弱）</text>');
    parts2.push('<text x="'+LEFT_PAD+'" y="'+(TOP_PAD - 22)+'" font-size="10" fill="#7A7A80">虚线为等 ROE 双曲线族（近似 ROE ≈ NIM × leverage）</text>');

    parts2.push('</svg>');
    return parts2.join('');
  }

  // ---------- 10c. 斜率图 Slopegraph（关系图 1-R1）----------
  // 两列排名：左 = 起年，右 = 截面年；连线显示银行排名变化
  function renderSlopegraph(story, dom, domKey, targetBank, year) {
    var metricKey = story.metric;
    if (!metricKey) return '';
    var parts = metricKey.split('.');
    var item = (_bm.data.domains[parts[0]] || {items:{}}).items[parts[1]];
    if (!item) return '';
    var dir = item.direction;
    var yL = _bm.trendStart, yR = _bm.trendEnd;

    // 取两年数据
    var rowsL = [], rowsR = [];
    _bm.data.banks.forEach(function(bb){
      var vL = valOf(bb.id, yL, metricKey);
      var vR = valOf(bb.id, yR, metricKey);
      if (vL !== null) rowsL.push({id: bb.id, name: bb.name, type_short: bb.type_short, val: vL});
      if (vR !== null) rowsR.push({id: bb.id, name: bb.name, type_short: bb.type_short, val: vR});
    });
    if (rowsL.length < 5 || rowsR.length < 5) {
      return '<svg viewBox="0 0 1000 100" xmlns="http://www.w3.org/2000/svg"><text x="500" y="55" text-anchor="middle" font-size="14" fill="#999">'+yL+' / '+yR+' 数据不足，无法画斜率图</text></svg>';
    }
    // 排名 — higher_better 直接排，lower_better 反转
    function rankIt(rows) {
      rows.sort(function(a,b){ return dir === 'higher_better' ? b.val - a.val : a.val - b.val; });
      var map = {};
      rows.forEach(function(r, i){ map[r.id] = { rank: i + 1, val: r.val }; });
      return map;
    }
    var mapL = rankIt(rowsL), mapR = rankIt(rowsR);
    var total = Math.max(rowsL.length, rowsR.length);

    // 几何
    var VBW = 1000, VBH = 60 + total * 11;  // 每个银行 11px 行高
    var LEFT_X = 200, RIGHT_X = 800;  // 两列 X 位置
    var TOP_PAD = 50, BOT_PAD = 16;
    var rowH = (VBH - TOP_PAD - BOT_PAD) / total;
    var yOf = function(rank){ return TOP_PAD + (rank - 0.5) * rowH; };

    var parts2 = ['<svg viewBox="0 0 '+VBW+' '+VBH+'" xmlns="http://www.w3.org/2000/svg" font-family="Helvetica Neue, PingFang SC, sans-serif">'];

    // 列头（年份）
    parts2.push('<text x="'+LEFT_X+'" y="20" text-anchor="end" font-size="15" font-weight="700" fill="#111114">'+yL+' 年排名</text>');
    parts2.push('<text x="'+RIGHT_X+'" y="20" text-anchor="start" font-size="15" font-weight="700" fill="#111114">'+yR+' 年排名</text>');
    parts2.push('<text x="'+LEFT_X+'" y="38" text-anchor="end" font-size="10" fill="#7A7A80">名次 · ↑ 越靠上越好</text>');
    parts2.push('<text x="'+RIGHT_X+'" y="38" text-anchor="start" font-size="10" fill="#7A7A80">名次 · ↑ 越靠上越好</text>');

    // 分区背景：Top 1-15 浅绿、16-40 中灰、41-N 浅红（仅左右两端柱条）
    function drawZone(x, anchor) {
      var z1Top = yOf(1) - rowH/2;
      var z1Bot = yOf(15) + rowH/2;
      var z2Top = z1Bot;
      var z2Bot = yOf(40) + rowH/2;
      var z3Top = z2Bot;
      var z3Bot = yOf(total) + rowH/2;
      var w = 6;
      parts2.push('<rect x="'+(x - (anchor === 'end' ? w + 4 : -4))+'" y="'+z1Top+'" width="'+w+'" height="'+(z1Bot-z1Top)+'" fill="rgba(46,125,50,0.18)" />');
      parts2.push('<rect x="'+(x - (anchor === 'end' ? w + 4 : -4))+'" y="'+z2Top+'" width="'+w+'" height="'+(z2Bot-z2Top)+'" fill="rgba(96,99,102,0.10)" />');
      parts2.push('<rect x="'+(x - (anchor === 'end' ? w + 4 : -4))+'" y="'+z3Top+'" width="'+w+'" height="'+(z3Bot-z3Top)+'" fill="rgba(160,72,72,0.18)" />');
    }
    drawZone(LEFT_X, 'end');
    drawZone(RIGHT_X, 'start');

    // 连线（先画非目标行）
    _bm.data.banks.forEach(function(bb){
      if (bb.id === targetBank.id) return;
      var L = mapL[bb.id], R = mapR[bb.id];
      if (!L || !R) return;
      var diff = L.rank - R.rank;  // >0 上升
      var color, opacity;
      if (Math.abs(diff) >= 10) {
        color = diff > 0 ? '#2E7D32' : '#A04848';
        opacity = 0.55;
      } else {
        color = '#9A9A9D';
        opacity = 0.20;
      }
      var y1 = yOf(L.rank), y2 = yOf(R.rank);
      parts2.push('<line x1="'+LEFT_X+'" y1="'+y1+'" x2="'+RIGHT_X+'" y2="'+y2+'" stroke="'+color+'" stroke-width="1" opacity="'+opacity+'" />');
    });

    // 目标行连线 + 高亮
    var tL = mapL[targetBank.id], tR = mapR[targetBank.id];
    if (tL && tR) {
      var tY1 = yOf(tL.rank), tY2 = yOf(tR.rank);
      parts2.push('<line x1="'+LEFT_X+'" y1="'+tY1+'" x2="'+RIGHT_X+'" y2="'+tY2+'" stroke="#009CDE" stroke-width="3" />');
      // 端点圆
      parts2.push('<circle cx="'+LEFT_X+'" cy="'+tY1+'" r="4.5" fill="#009CDE" stroke="#fff" stroke-width="1" />');
      parts2.push('<circle cx="'+RIGHT_X+'" cy="'+tY2+'" r="4.5" fill="#009CDE" stroke="#fff" stroke-width="1" />');
      // 左右标签
      parts2.push('<text x="'+(LEFT_X - 14)+'" y="'+(tY1 + 4)+'" text-anchor="end" font-size="12" font-weight="700" fill="#009CDE">'+escapeXml(targetBank.name)+' · #'+tL.rank+'</text>');
      parts2.push('<text x="'+(RIGHT_X + 14)+'" y="'+(tY2 + 4)+'" text-anchor="start" font-size="12" font-weight="700" fill="#009CDE">#'+tR.rank+' · '+formatVal(tR.val, item.unit)+'</text>');
    }

    // 排名标尺 — 在中间画 15 / 40 两条参考线连接左右两列
    [15, 40].forEach(function(rk){
      if (rk >= total) return;
      var y = yOf(rk) + rowH/2;
      parts2.push('<line x1="'+LEFT_X+'" y1="'+y+'" x2="'+RIGHT_X+'" y2="'+y+'" stroke="#E5E5E7" stroke-width="0.5" stroke-dasharray="3,3" />');
      parts2.push('<text x="'+((LEFT_X+RIGHT_X)/2)+'" y="'+(y - 3)+'" text-anchor="middle" font-size="9" fill="#BDBDC0">第 '+rk+' 名</text>');
    });

    parts2.push('</svg>');
    return parts2.join('');
  }

  // ---------- 10d. 蜂群图 Beeswarm（关系图 2-R2）----------
  // 57 银行某指标在 Y 轴分布；X 轴按四类银行分组；点用贪心碰撞避免重叠
  function renderBeeswarm(story, dom, domKey, targetBank, year) {
    var metricKey = story.metric;
    if (!metricKey) return '';
    var parts = metricKey.split('.');
    var item = (_bm.data.domains[parts[0]] || {items:{}}).items[parts[1]];
    if (!item) return '';

    // 按类型分组
    var types = ["大型商业银行", "股份制商业银行", "城市商业银行", "农村商业银行"];
    var typeShort = {"大型商业银行":"大行", "股份制商业银行":"股份", "城市商业银行":"城商", "农村商业银行":"农商"};
    var groups = types.map(function(t){ return { type: t, label: typeShort[t], pts: [] }; });
    _bm.data.banks.forEach(function(bb){
      var v = valOf(bb.id, year, metricKey);
      if (v === null) return;
      var g = groups.filter(function(g){ return g.type === bb.type; })[0];
      if (g) g.pts.push({ id: bb.id, name: bb.name, val: v, isTarget: bb.id === targetBank.id });
    });

    var allVals = [];
    groups.forEach(function(g){ g.pts.forEach(function(p){ allVals.push(p.val); }); });
    if (allVals.length < 5) {
      return '<svg viewBox="0 0 1000 100" xmlns="http://www.w3.org/2000/svg"><text x="500" y="55" text-anchor="middle" font-size="14" fill="#999">数据不足</text></svg>';
    }
    var vmin = Math.min.apply(null, allVals);
    var vmax = Math.max.apply(null, allVals);
    var pad = (vmax - vmin) * 0.08;
    vmin -= pad; vmax += pad;
    var p50 = quantile(allVals.slice(), 0.5);

    // 几何
    var VBW = 1000, VBH = 480;
    var LEFT_PAD = 70, RIGHT_PAD = 40, TOP_PAD = 60, BOT_PAD = 50;
    var chartW = VBW - LEFT_PAD - RIGHT_PAD;
    var chartH = VBH - TOP_PAD - BOT_PAD;
    var colW = chartW / groups.length;
    var yOf = function(v){ return TOP_PAD + (1 - (v - vmin) / (vmax - vmin)) * chartH; };
    var r = 5.5;  // 点半径

    var parts2 = ['<svg viewBox="0 0 '+VBW+' '+VBH+'" xmlns="http://www.w3.org/2000/svg" font-family="Helvetica Neue, PingFang SC, sans-serif">'];

    // 标题已在卡 header；这里画轴和分组
    // Y 轴刻度
    for (var i=0; i<=4; i++) {
      var gv = vmax - i * (vmax - vmin) / 4;
      var gy = TOP_PAD + i * chartH / 4;
      parts2.push('<line x1="'+LEFT_PAD+'" y1="'+gy+'" x2="'+(VBW - RIGHT_PAD)+'" y2="'+gy+'" stroke="#F0F2F5" stroke-width="1" />');
      parts2.push('<text x="'+(LEFT_PAD - 8)+'" y="'+(gy + 4)+'" text-anchor="end" font-size="11" fill="#7A7A80">'+formatVal(gv, item.unit)+'</text>');
    }

    // P50 参考线
    var p50y = yOf(p50);
    parts2.push('<line x1="'+LEFT_PAD+'" y1="'+p50y+'" x2="'+(VBW - RIGHT_PAD)+'" y2="'+p50y+'" stroke="#009CDE" stroke-width="1.2" stroke-dasharray="6,4" />');
    parts2.push('<text x="'+(VBW - RIGHT_PAD - 4)+'" y="'+(p50y - 5)+'" text-anchor="end" font-size="11" font-weight="700" fill="#009CDE">P50 中位 '+formatVal(p50, item.unit)+'</text>');

    // 每组画点
    groups.forEach(function(g, gi){
      var cx = LEFT_PAD + (gi + 0.5) * colW;
      // 组名
      parts2.push('<text x="'+cx+'" y="'+(VBH - BOT_PAD + 20)+'" text-anchor="middle" font-size="13" font-weight="700" fill="#111114">'+escapeXml(g.label)+'行</text>');
      parts2.push('<text x="'+cx+'" y="'+(VBH - BOT_PAD + 34)+'" text-anchor="middle" font-size="10" fill="#7A7A80">N = '+g.pts.length+'</text>');
      // 分组分隔
      if (gi > 0) {
        parts2.push('<line x1="'+(LEFT_PAD + gi * colW)+'" y1="'+TOP_PAD+'" x2="'+(LEFT_PAD + gi * colW)+'" y2="'+(VBH - BOT_PAD)+'" stroke="#E5E5E7" stroke-width="0.5" stroke-dasharray="2,3" />');
      }
      // 贪心碰撞避免：按值排序后从中间向两侧抖动
      var pts = g.pts.slice().sort(function(a,b){return a.val - b.val;});
      var placed = [];  // {x, y, id}
      pts.forEach(function(p){
        var y = yOf(p.val);
        // 找 x：从 cx 中心起向左右尝试
        var x = cx;
        var step = 11;  // ~2r
        var maxOff = colW * 0.42;
        var tried = 0;
        while (true) {
          var collide = false;
          for (var j=0; j<placed.length; j++) {
            var dx = x - placed[j].x, dy = y - placed[j].y;
            if (dx*dx + dy*dy < (r*2 + 1) * (r*2 + 1)) { collide = true; break; }
          }
          if (!collide) break;
          tried++;
          // 蛇形抖动：+1, -1, +2, -2 ...
          var sign = tried % 2 === 1 ? 1 : -1;
          var mag = Math.ceil(tried / 2);
          x = cx + sign * mag * step;
          if (Math.abs(x - cx) > maxOff) { x = cx; break; }
        }
        placed.push({x: x, y: y, id: p.id, name: p.name, val: p.val, isTarget: p.isTarget});
      });
      // 画点 — 非目标先
      placed.forEach(function(p){
        if (p.isTarget) return;
        parts2.push('<circle cx="'+p.x+'" cy="'+p.y+'" r="'+r+'" fill="#9A9A9D" opacity="0.55" />');
      });
      // 目标行最后画 — 高亮
      placed.forEach(function(p){
        if (!p.isTarget) return;
        parts2.push('<circle cx="'+p.x+'" cy="'+p.y+'" r="'+(r + 2.5)+'" fill="#009CDE" stroke="#fff" stroke-width="2.5" />');
        // 箭头 + 标签
        var tx = p.x + 22, ty = p.y - 4;
        parts2.push('<line x1="'+(p.x + r + 3)+'" y1="'+p.y+'" x2="'+(tx - 4)+'" y2="'+ty+'" stroke="#009CDE" stroke-width="1.2" />');
        parts2.push('<text x="'+tx+'" y="'+ty+'" font-size="12" font-weight="700" fill="#009CDE">'+escapeXml(p.name)+'</text>');
        parts2.push('<text x="'+tx+'" y="'+(ty + 13)+'" font-size="11" fill="#111114">'+formatVal(p.val, item.unit)+'</text>');
      });
    });

    parts2.push('</svg>');
    return parts2.join('');
  }

  // RSM 四档色 + 浅蓝（与 CSS 同步，避免 CSS class 在 SVG 上字号缩放问题）
  function colorOf(cls) {
    return ({
      "is-target":        "#001233",
      "is-peer-national": "#2196F3",
      "is-peer-region":   "#4CAF50",
      "is-peer-cross":    "#606366",
      "is-peer-custom":   "#B3E5F7"
    })[cls] || "#888";
  }

  // ---------- 9. 单张指标卡 ----------
  function renderMetricCard(dom, domKey, mkey, item, targetBank) {
    var metricKey = domKey + "." + mkey;
    var year = _bm.snapshotYear;
    var targetVal = valOf(targetBank.id, year, metricKey);

    // 各对标组的均值
    var peerVals = {}; // peerKey -> { mean, ids }
    Object.keys(_bm.activePeers).forEach(function(k){
      if (!_bm.activePeers[k]) return;
      var ids = getPeerGroupIds(k, targetBank);
      if (!ids.length) return;
      var m = meanOf(ids, year, metricKey);
      if (m !== null) peerVals[k] = { mean: m, ids: ids };
    });

    // 全国所有银行该指标分布（用于分位条 + 阴影带）
    var allBankVals = [];
    _bm.data.banks.forEach(function(b){
      var v = valOf(b.id, year, metricKey);
      if (v !== null) allBankVals.push(v);
    });
    var rk = targetVal !== null ? rankOf(targetVal, allBankVals, item.direction === "higher_better") : null;
    var dist = null;
    if (allBankVals.length >= 5) {
      dist = {
        p10: quantile(allBankVals, 0.10),
        p25: quantile(allBankVals, 0.25),
        p50: quantile(allBankVals, 0.50),
        p75: quantile(allBankVals, 0.75),
        p90: quantile(allBankVals, 0.90),
        n:   allBankVals.length
      };
    }

    // tag（位置标记）
    var tagHtml = '';
    if (rk && item.direction !== "contextual") {
      var pct = rk.rank / rk.total;
      var cls = "is-mid"; var lbl = "中位";
      if (pct <= 0.25) { cls = "is-good"; lbl = "前 1/4"; }
      else if (pct >= 0.75) { cls = "is-bad"; lbl = "后 1/4"; }
      tagHtml = '<span class="bm-metric-tag '+cls+'">'+lbl+' · '+rk.rank+'/'+rk.total+'</span>';
    } else if (item.direction === "contextual") {
      tagHtml = '<span class="bm-metric-tag">中性指标</span>';
    }

    // 关键数字行
    var numbersHtml = '<div class="bm-metric-numbers">';
    numbersHtml += '<div class="is-target"><span>'+targetBank.name+'</span><b>'+formatVal(targetVal, item.unit)+'</b></div>';
    if (peerVals.national_type) numbersHtml += '<div><span>全国'+targetBank.type_short+'均值</span><b>'+formatVal(peerVals.national_type.mean, item.unit)+'</b></div>';
    if (peerVals.region_type)   numbersHtml += '<div><span>'+targetBank.region+'同类</span><b>'+formatVal(peerVals.region_type.mean, item.unit)+'</b></div>';
    if (peerVals.national_other)numbersHtml += '<div><span>全行业均值</span><b>'+formatVal(peerVals.national_other.mean, item.unit)+'</b></div>';
    if (peerVals.custom)        numbersHtml += '<div><span>自选 '+peerVals.custom.ids.length+' 家</span><b>'+formatVal(peerVals.custom.mean, item.unit)+'</b></div>';
    numbersHtml += '</div>';

    // 柱图（横向：本行 + 各对标均值 + 自选具体银行）
    var barRows = [];
    barRows.push({ label: targetBank.name, value: targetVal, cls: "is-target" });
    if (peerVals.national_type)  barRows.push({ label: "全国"+targetBank.type_short+"均值", value: peerVals.national_type.mean, cls: "is-peer-national" });
    if (peerVals.region_type)    barRows.push({ label: targetBank.region+"·"+targetBank.type_short+"均值", value: peerVals.region_type.mean, cls: "is-peer-region" });
    if (peerVals.national_other) barRows.push({ label: "全行业均值", value: peerVals.national_other.mean, cls: "is-peer-cross" });
    if (peerVals.custom && _bm.activePeers.custom) {
      // 直接画出自选每家
      peerVals.custom.ids.forEach(function(id){
        var bb = getBank(id);
        var v = valOf(id, year, metricKey);
        if (v !== null && bb) barRows.push({ label: bb.name, value: v, cls: "is-peer-custom" });
      });
    }
    var barSvg = renderBarChart(barRows, item.unit, dist);

    // 分位条（基期）
    var quantileHtml = '';
    if (allBankVals.length >= 5 && item.direction !== "contextual" && targetVal !== null) {
      var vmin = Math.min.apply(null, allBankVals);
      var vmax = Math.max.apply(null, allBankVals);
      var pos = vmax > vmin ? (targetVal - vmin) / (vmax - vmin) * 100 : 50;
      // 方向是 lower_better 时反转位置（左边是好）
      if (item.direction === "lower_better") pos = 100 - pos;
      pos = Math.max(0, Math.min(100, pos));
      var pctText = rk ? (Math.round((1 - rk.rank/rk.total)*100) + "%") : "—";
      quantileHtml = '<div class="bm-quantile">'
        + '<span>'+(item.direction==='higher_better'?'弱':'强')+'</span>'
        + '<div class="bm-quantile-track"><div class="bm-quantile-pin" style="left:'+pos+'%"></div></div>'
        + '<span>'+(item.direction==='higher_better'?'强':'弱')+'</span>'
        + '<span class="bm-quantile-rank">全国分位 '+pctText+'</span>'
        + '</div>';
    }

    // 趋势线（6 年）
    var trendSvg = renderTrendChart(targetBank, peerVals, metricKey, item);

    // 时态标签
    var ptLabel = item.period_type === "point"  ? year + " 年末"
               : item.period_type === "period" ? year + " 全年"
               : year + "";

    return '<article class="bm-metric-card">'
      + '<div class="bm-metric-card-head">'
      +   '<h3>'+escapeXml(item.name)+'<small>'+escapeXml(item.unit)+' · '+ptLabel+'</small></h3>'
      +   tagHtml
      + '</div>'
      + numbersHtml
      + '<div class="bm-chart">'+barSvg+'</div>'
      + quantileHtml
      + '<div class="bm-trend-head">趋势 '+_bm.trendStart+'–'+_bm.trendEnd+'</div>'
      + '<div class="bm-trend">'+trendSvg+'</div>'
      + '</article>';
  }

  // ---------- 10. SVG 柱图（单指标卡用，像素 viewBox + 分布阴影带）----------
  function renderBarChart(rows, unit, dist) {
    if (!rows.length) return '';
    var vals = rows.map(function(r){return r.value;}).filter(function(v){return v !== null && !isNaN(v);});
    if (!vals.length) return '<svg viewBox="0 0 1000 80" xmlns="http://www.w3.org/2000/svg"><text x="500" y="44" text-anchor="middle" fill="#999" font-size="14">无可用数据</text></svg>';
    var vmin = Math.min.apply(null, vals);
    var vmax = Math.max.apply(null, vals);
    // 量级范围同时纳入分布 P10/P90
    if (dist) {
      vmax = Math.max(vmax, dist.p90);
      vmin = Math.min(vmin, dist.p10);
    }
    var hasNeg = vmin < 0;
    var rangeBase = hasNeg ? Math.min(0, vmin) : 0;
    var rangeTop = vmax * 1.12;
    if (rangeTop === rangeBase) rangeTop = rangeBase + 1;
    var span = rangeTop - rangeBase;

    // 像素坐标
    var VBW = 1000;
    var ROW_H = 36;
    var TOP_PAD = 14, BOT_PAD = dist ? 22 : 14;
    var H = TOP_PAD + BOT_PAD + ROW_H * rows.length;
    var LABEL_W = 200;
    var RIGHT_PAD = 110;
    var chartLeft = LABEL_W;
    var chartRight = VBW - RIGHT_PAD;
    var chartW = chartRight - chartLeft;
    var xOf = function(v){ return chartLeft + ((v - rangeBase) / span) * chartW; };
    var zeroX = hasNeg ? xOf(0) : chartLeft;

    var FS_LABEL = 13, FS_VALUE = 13, FS_SERIES = 12;

    var parts = ['<svg viewBox="0 0 '+VBW+' '+H+'" xmlns="http://www.w3.org/2000/svg" font-family="Noto Sans CJK SC, PingFang SC, sans-serif">'];

    // === 分布阴影带（横跨整个图区）===
    if (dist) {
      var bandTop = TOP_PAD;
      var bandBot = TOP_PAD + ROW_H * rows.length;
      var x10 = xOf(dist.p10), x90 = xOf(dist.p90);
      var x25 = xOf(dist.p25), x75 = xOf(dist.p75);
      var x50 = xOf(dist.p50);
      parts.push('<rect x="'+x10+'" y="'+bandTop+'" width="'+Math.max(0.5, x90-x10)+'" height="'+(bandBot-bandTop)+'" fill="#B3E5F7" opacity="0.30" />');
      parts.push('<rect x="'+x25+'" y="'+bandTop+'" width="'+Math.max(0.5, x75-x25)+'" height="'+(bandBot-bandTop)+'" fill="#B3E5F7" opacity="0.55" />');
      parts.push('<line x1="'+x50+'" y1="'+bandTop+'" x2="'+x50+'" y2="'+bandBot+'" stroke="#009CDE" stroke-width="1.4" stroke-dasharray="4,3" />');
      // 端点刻度（下方）
      parts.push('<text x="'+x10+'" y="'+(bandBot + 13)+'" text-anchor="middle" font-size="10" fill="#7aa9bf">P10 '+formatVal(dist.p10, unit)+'</text>');
      parts.push('<text x="'+x50+'" y="'+(bandBot + 13)+'" text-anchor="middle" font-size="10" fill="#009CDE" font-weight="600">P50 '+formatVal(dist.p50, unit)+'</text>');
      parts.push('<text x="'+x90+'" y="'+(bandBot + 13)+'" text-anchor="middle" font-size="10" fill="#7aa9bf">P90 '+formatVal(dist.p90, unit)+'</text>');
    }

    // 零线 / 起点线
    parts.push('<line x1="'+zeroX+'" y1="'+TOP_PAD+'" x2="'+zeroX+'" y2="'+(TOP_PAD + ROW_H * rows.length)+'" stroke="#E5E8ED" stroke-width="1" />');

    // 行
    rows.forEach(function(r, i){
      var rowTop = TOP_PAD + i * ROW_H;
      var barH = 20;
      var by = rowTop + (ROW_H - barH) / 2;
      // 左侧标签（系列名）
      var lbl = r.label.length > 14 ? r.label.slice(0,13) + '…' : r.label;
      parts.push('<text x="'+(LABEL_W - 12)+'" y="'+(by + barH * 0.72)+'" text-anchor="end" font-size="'+FS_LABEL+'" fill="#1a1a1a" font-weight="'+(r.cls === 'is-target' ? '700' : '500')+'">'+escapeXml(lbl)+'</text>');
      if (r.value === null || isNaN(r.value)) {
        parts.push('<text x="'+(chartLeft + 8)+'" y="'+(by + barH * 0.72)+'" font-size="'+FS_LABEL+'" font-style="italic" fill="#bbb">无数据</text>');
        return;
      }
      var v = r.value;
      var w, bx;
      if (hasNeg) {
        if (v >= 0) { w = (v / span) * chartW; bx = zeroX; }
        else        { w = ((-v) / span) * chartW; bx = zeroX - w; }
      } else {
        w = ((v - rangeBase) / span) * chartW; bx = chartLeft;
      }
      w = Math.max(2, w);
      var color = colorOf(r.cls);
      parts.push('<rect x="'+bx+'" y="'+by+'" width="'+w+'" height="'+barH+'" rx="1.5" fill="'+color+'" />');
      // 柱外数值
      var valColor = r.cls === 'is-target' ? '#001233' : '#1a1a1a';
      var valWeight = r.cls === 'is-target' ? 700 : 600;
      parts.push('<text x="'+(bx + w + 6)+'" y="'+(by + barH * 0.72)+'" font-size="'+FS_VALUE+'" font-weight="'+valWeight+'" fill="'+valColor+'">'+formatVal(v, unit)+'</text>');
    });
    parts.push('</svg>');
    return parts.join('');
  }

  // ---------- 11. SVG 趋势线（像素 viewBox + RSM 配色）----------
  function renderTrendChart(targetBank, peerVals, metricKey, item) {
    // 只取用户选的区间内的年份
    var allYears = _bm.data.years;
    var years = allYears.filter(function(y){ return y >= _bm.trendStart && y <= _bm.trendEnd; });
    if (years.length < 2) years = allYears;

    var seriesList = [];
    seriesList.push({ cls: "is-target", label: targetBank.name,
                      points: years.map(function(yr){return valOf(targetBank.id, yr, metricKey);}) });
    if (peerVals.national_type) {
      seriesList.push({ cls: "is-peer-national", label: "全国"+targetBank.type_short+"均值",
                        points: years.map(function(yr){return meanOf(peerVals.national_type.ids, yr, metricKey);}) });
    }
    if (peerVals.region_type) {
      seriesList.push({ cls: "is-peer-region", label: targetBank.region+"同类",
                        points: years.map(function(yr){return meanOf(peerVals.region_type.ids, yr, metricKey);}) });
    }
    if (peerVals.national_other) {
      seriesList.push({ cls: "is-peer-cross", label: "全行业均值",
                        points: years.map(function(yr){return meanOf(peerVals.national_other.ids, yr, metricKey);}) });
    }
    var allPts = [];
    seriesList.forEach(function(s){ s.points.forEach(function(p){ if (p !== null && !isNaN(p)) allPts.push(p); }); });
    if (!allPts.length) return '<svg viewBox="0 0 1000 100" xmlns="http://www.w3.org/2000/svg"><text x="500" y="55" text-anchor="middle" font-size="14" fill="#999">区间内无趋势数据</text></svg>';
    var vmin = Math.min.apply(null, allPts);
    var vmax = Math.max.apply(null, allPts);
    if (vmin === vmax) { vmin -= 1; vmax += 1; }
    var pad = (vmax - vmin) * 0.12;
    vmin -= pad; vmax += pad;

    // 像素坐标
    var VBW = 1000, VBH = 140;
    var LEFT_PAD = 50, RIGHT_PAD = 12;
    var TOP_PAD  = 12, BOT_PAD  = 24;
    var x = function(i){ return LEFT_PAD + i * (VBW - LEFT_PAD - RIGHT_PAD) / Math.max(years.length - 1, 1); };
    var y = function(v){ return TOP_PAD + (1 - (v - vmin) / (vmax - vmin)) * (VBH - TOP_PAD - BOT_PAD); };

    var parts = ['<svg viewBox="0 0 '+VBW+' '+VBH+'" xmlns="http://www.w3.org/2000/svg" font-family="Noto Sans CJK SC, PingFang SC, sans-serif">'];

    // 网格线（4 条横线）
    for (var g = 0; g <= 4; g++) {
      var gy = TOP_PAD + g * (VBH - TOP_PAD - BOT_PAD) / 4;
      var gv = vmax - g * (vmax - vmin) / 4;
      parts.push('<line x1="'+LEFT_PAD+'" y1="'+gy+'" x2="'+(VBW - RIGHT_PAD)+'" y2="'+gy+'" stroke="#F0F2F5" stroke-width="1" />');
      parts.push('<text x="'+(LEFT_PAD - 6)+'" y="'+(gy + 4)+'" text-anchor="end" font-size="10" fill="#bdbdbd">'+formatVal(gv, item.unit)+'</text>');
    }
    // 底轴 + 年份标签
    parts.push('<line x1="'+LEFT_PAD+'" y1="'+(VBH - BOT_PAD)+'" x2="'+(VBW - RIGHT_PAD)+'" y2="'+(VBH - BOT_PAD)+'" stroke="#E5E8ED" stroke-width="1" />');
    years.forEach(function(yr, i){
      parts.push('<text x="'+x(i)+'" y="'+(VBH - 8)+'" text-anchor="middle" font-size="11" fill="#606366">'+yr+'</text>');
    });

    // series 线
    seriesList.forEach(function(s){
      var d = '';
      var lastPt = null;
      for (var i = 0; i < s.points.length; i++) {
        var v = s.points[i];
        if (v === null || isNaN(v)) { lastPt = null; continue; }
        if (lastPt === null) { d += 'M ' + x(i) + ' ' + y(v); }
        else                 { d += ' L ' + x(i) + ' ' + y(v); }
        lastPt = i;
      }
      var sw = s.cls === "is-target" ? 2.2 : 1.4;
      if (d) parts.push('<path d="'+d+'" fill="none" stroke="'+colorOf(s.cls)+'" stroke-width="'+sw+'" />');
    });
    // 目标行的点 + 终点数值
    var tgt = seriesList[0];
    for (var i = 0; i < tgt.points.length; i++) {
      var v = tgt.points[i];
      if (v === null || isNaN(v)) continue;
      parts.push('<circle cx="'+x(i)+'" cy="'+y(v)+'" r="2.5" fill="'+colorOf("is-target")+'" />');
    }
    // 终点数值
    var lastIdx = -1;
    for (var i = tgt.points.length - 1; i >= 0; i--) {
      if (tgt.points[i] !== null && !isNaN(tgt.points[i])) { lastIdx = i; break; }
    }
    if (lastIdx >= 0) {
      parts.push('<text x="'+(x(lastIdx) - 6)+'" y="'+(y(tgt.points[lastIdx]) - 6)+'" text-anchor="end" font-size="11" font-weight="700" fill="'+colorOf("is-target")+'">'+formatVal(tgt.points[lastIdx], item.unit)+'</text>');
    }
    parts.push('</svg>');
    return parts.join('');
  }

  function escapeXml(s) {
    if (s === null || s === undefined) return '';
    return String(s).replace(/[<>&]/g, function(c){return c==='<'?'&lt;':c==='>'?'&gt;':'&amp;';});
  }

  // ---------- 12. 全量重渲染 ----------
  function renderAll() {
    renderBankTypeTabs();
    renderBankList();
    renderPeerPool();
    renderSummary();
    renderAudienceSwitcher();
    renderDomainTabs();
    renderDomainContent();
    renderNextBar();
    renderEvidencePackTray();
    refreshStorylineFactPackControls();
  }

  // ---------- 13. 事件绑定 ----------
  function bind() {
    var shell = document.getElementById("benchmarkPageShell");
    if (!shell) return;
    bindEvidencePackUi(shell);

    // 银行类型 tab
    shell.addEventListener("click", function(e){
      var openDomain = e.target.closest("[data-open-domain-list]");
      if (openDomain) {
        setBenchmarkView("domain", { domainKey: openDomain.dataset.openDomainList, returnContext: "overview" });
        return;
      }
      var factAction = e.target.closest("[data-storyline-fact-action]");
      if (factAction) {
        e.preventDefault();
        e.stopPropagation();
        var ref = factAction.dataset.storylineRef;
        if (factAction.dataset.storylineFactAction === "add") {
          ensureStorylineFactPackFromBenchmarkStory(ref);
        } else {
          openBenchmarkStorylineChart(ref);
        }
        return;
      }
      var openStory = e.target.closest("[data-open-story-detail]");
      if (openStory) {
        var storyParts = openStory.dataset.openStoryDetail.split("/");
        setBenchmarkView("story", {
          domainKey: storyParts[0],
          storyId: storyParts[1],
          returnContext: openStory.dataset.storySource === "domain" ? "domain" : "overview"
        });
        return;
      }
      var backOverview = e.target.closest("[data-back-to-overview]");
      if (backOverview) {
        setBenchmarkView("overview");
        return;
      }
      var backDomain = e.target.closest("[data-back-to-domain]");
      if (backDomain) {
        setBenchmarkView("domain", { domainKey: backDomain.dataset.backToDomain, returnContext: "overview" });
        return;
      }
      var storyVisualBtn = e.target.closest("[data-story-visual-src]");
      if (storyVisualBtn) {
        e.preventDefault();
        var figure = storyVisualBtn.closest(".bm-consulting-visual");
        if (figure) {
          var mainImg = figure.querySelector(".bm-consulting-visual-media img");
          var thumbImg = storyVisualBtn.querySelector("img");
          if (mainImg && storyVisualBtn.dataset.storyVisualSrc) {
            mainImg.src = storyVisualBtn.dataset.storyVisualSrc;
            if (thumbImg && thumbImg.alt) mainImg.alt = thumbImg.alt + " 相关咨询图表";
          }
          Array.prototype.forEach.call(figure.querySelectorAll(".bm-story-visual-option"), function(btn){
            btn.classList.toggle("is-active", btn === storyVisualBtn);
          });
        }
        return;
      }
      var typeBtn = e.target.closest("#bmBankTypeTabs button");
      if (typeBtn) { _bm.bankTypeFilter = typeBtn.dataset.type; renderBankTypeTabs(); renderBankList(); return; }
      // 银行列表点击
      var bankItem = e.target.closest("#bmBankList .bm-bank-item");
      if (bankItem) {
        if (selectBenchmarkTargetBank(bankItem.dataset.bankId || bankItem.dataset.bankName, "target-change")) {
          setBenchmarkView("overview", { returnContext: "overview" });
        }
        return;
      }
      // 健康仪表盘行点击：跳到该银行 + 第一个真域
      var healthRow = e.target.closest("[data-jump-bank-id]");
      if (healthRow) {
        selectBenchmarkTargetBank(healthRow.dataset.jumpBankId, "target-change");
        var firstRealDomain = Object.keys(_bm.data.domains)[0];
        _bm.activeDomain = firstRealDomain;
        renderAll();
        // 平滑滚动到 main 顶部
        var mainEl = document.querySelector(".bm-main");
        if (mainEl) {
          try { mainEl.scrollIntoView({behavior: "smooth", block: "start"}); } catch (e) { mainEl.scrollIntoView(); }
        }
        return;
      }
      // 截面时点 tab
      var snapBtn = e.target.closest("#bmSnapshotTabs button");
      if (snapBtn) {
        _bm.snapshotYear = parseInt(snapBtn.dataset.snap, 10);
        resetBenchmarkDrillState();
        markPackStaleForBenchmarkChange("year-change");
        Array.prototype.forEach.call(snapBtn.parentNode.querySelectorAll("button"), function(b){b.classList.toggle("is-active", b === snapBtn);});
        if (typeof window.syncBenchmarkToState === "function") window.syncBenchmarkToState();
        renderSummary(); renderDomainContent(); renderEvidencePackTray(); return;
      }
      // 受众切换
      var audBtn = e.target.closest("[data-audience]");
      if (audBtn) {
        var aud = audBtn.dataset.audience;
        if (["board","cfo","cro","expert"].indexOf(aud) >= 0) {
          _bm.audience = aud;
          if (_bm.viewMode === "overview") _bm.viewMode = "domain";
          try { localStorage.setItem("benchmarkiq.audience", aud); } catch (e2) {}
          renderAudienceSwitcher();
          renderDomainContent();
          return;
        }
      }
      // 域 tab
      var domBtn = e.target.closest("#bmDomainTabs button");
      if (domBtn) {
        if (domBtn.dataset.domainKey === "__health__") {
          _bm.activeDomain = "__health__";
          _bm.viewMode = "domain";
          renderDomainTabs(); renderDomainContent(); return;
        }
        setBenchmarkView("domain", { domainKey: domBtn.dataset.domainKey, returnContext: "overview" });
        return;
      }
      // 模式 toggle
      var modeBtn = e.target.closest(".bm-mode-toggle button");
      if (modeBtn) { _bm.mode = modeBtn.dataset.mode; renderDomainContent(); return; }
      // 自选 pool 点击
      var poolItem = e.target.closest("#bmPeerPool .bm-bank-item");
      if (poolItem) {
        var id = poolItem.dataset.poolBankId;
        var idx = _bm.customPeers.indexOf(id);
        if (idx >= 0) _bm.customPeers.splice(idx, 1);
        else if (_bm.customPeers.length < 8) _bm.customPeers.push(id);
        resetBenchmarkDrillState();
        markPackStaleForBenchmarkChange("peer-change");
        if (typeof window.syncBenchmarkToState === "function") window.syncBenchmarkToState();
        renderPeerPool(); renderSummary(); renderDomainContent(); renderEvidencePackTray(); return;
      }
      // 加入报告附录按钮
      var addBtn = e.target.closest("[data-add-appendix-story]");
      if (addBtn) {
        e.stopPropagation();
        toggleStoryAppendix(addBtn.dataset.addAppendixDomain, addBtn.dataset.addAppendixStory);
        renderDomainContent();  // 重渲染让按钮文字翻 "已加入附录 ✓"
        return;
      }
      // 因果链继续追问
      var drillBtn = e.target.closest("[data-drill-key]");
      if (drillBtn) {
        e.preventDefault();
        e.stopPropagation();
        var card = drillBtn.closest(".bm-decomp-card");
        if (!card) return;
        var mount = null;
        Array.prototype.some.call(card.children, function(child){
          if (child.classList && child.classList.contains("bm-decomp-drill-mount")) {
            mount = child;
            return true;
          }
          return false;
        });
        if (!mount) return;
        var bank = getBank(mount.dataset.targetBankId);
        var y = parseInt(mount.dataset.year, 10);
        var nextDepth = (parseInt(mount.dataset.depth, 10) || 0) + 1;
        var nextDecomp = bank ? computeDecomposition(drillBtn.dataset.drillKey, bank, y) : null;
        mount.innerHTML = nextDecomp ? renderDecompositionCard(nextDecomp, nextDepth) : '<div class="bm-decomp-card is-nested"><p class="bm-decomp-narrative">该指标暂无足够数据继续追问。</p></div>';
        return;
      }
      // chip 点击移除
      var chip = e.target.closest("[data-peer-remove]");
      if (chip) {
        var rid = chip.dataset.peerRemove;
        _bm.customPeers = _bm.customPeers.filter(function(x){return x !== rid;});
        resetBenchmarkDrillState();
        markPackStaleForBenchmarkChange("peer-change");
        if (typeof window.syncBenchmarkToState === "function") window.syncBenchmarkToState();
        renderPeerPool(); renderSummary(); renderDomainContent(); renderEvidencePackTray(); return;
      }
      // 下一步：进入诊断
      var nextBtn = e.target.closest("#bmGoToDiagnosis");
      if (nextBtn && !nextBtn.disabled) {
        e.preventDefault();
        if (typeof window.syncBenchmarkToState === "function") window.syncBenchmarkToState({ renderDownstream: false });
        if (typeof window.readEvidencePack === "function") {
          var pack = window.readEvidencePack();
          if (!pack || pack.status !== "confirmed") {
            pack = typeof window.buildRecommendedEvidencePack === "function" ? window.buildRecommendedEvidencePack() : pack;
            if (pack && typeof window.confirmEvidencePack === "function") window.confirmEvidencePack(pack, pack.selectedIssues);
          }
        }
        if (typeof setPortalPage === "function") setPortalPage("answer", { force: true });
        return;
      }
    });

    // 银行搜索
    var bankSearch = document.getElementById("bmBankSearch");
    if (bankSearch) bankSearch.addEventListener("input", function(e){ _bm.bankSearch = e.target.value; renderBankList(); });
    // 自选 search
    var peerSearch = document.getElementById("bmPeerSearch");
    if (peerSearch) peerSearch.addEventListener("input", function(){ renderPeerPool(); });
    // 对标 toggle
    var peerToggles = document.getElementById("bmPeerToggles");
    if (peerToggles) {
      peerToggles.addEventListener("change", function(e){
        var inp = e.target.closest('input[type="checkbox"][data-peer-key]');
        if (!inp) return;
        _bm.activePeers[inp.dataset.peerKey] = inp.checked;
        resetBenchmarkDrillState();
        markPackStaleForBenchmarkChange("peer-change");
        var custom = document.getElementById("bmPeerCustom");
        if (custom) custom.hidden = !_bm.activePeers.custom;
        renderSummary(); renderDomainContent(); renderNextBar(); renderEvidencePackTray();
      });
    }
    // 趋势区间下拉
    var tStart = document.getElementById("bmTrendStart");
    var tEnd   = document.getElementById("bmTrendEnd");
    if (tStart) tStart.addEventListener("change", function(e){
      var v = parseInt(e.target.value, 10);
      if (v >= _bm.trendEnd) { _bm.trendEnd = Math.min(2025, v + 1); fillTrendOptions(); }
      _bm.trendStart = v;
      resetBenchmarkDrillState();
      renderSummary(); renderDomainContent();
    });
    if (tEnd) tEnd.addEventListener("change", function(e){
      var v = parseInt(e.target.value, 10);
      if (v <= _bm.trendStart) { _bm.trendStart = Math.max(2020, v - 1); fillTrendOptions(); }
      _bm.trendEnd = v;
      resetBenchmarkDrillState();
      renderSummary(); renderDomainContent();
    });
  }

  // 填充趋势区间下拉的 options
  function fillTrendOptions() {
    var years = (_bm.data && _bm.data.years) || [2020,2021,2022,2023,2024,2025];
    ["bmTrendStart","bmTrendEnd"].forEach(function(id){
      var sel = document.getElementById(id);
      if (!sel) return;
      var cur = id === "bmTrendStart" ? _bm.trendStart : _bm.trendEnd;
      sel.innerHTML = years.map(function(y){
        return '<option value="'+y+'"'+(y===cur?' selected':'')+'>'+y+'</option>';
      }).join("");
    });
  }

  // ---------- 14. init ----------
  function initBenchmarkPage() {
    if (_bm.inited) return;
    var shell = document.getElementById("benchmarkPageShell");
    if (!shell) return;
    _bm.inited = true;
    bind();
    loadData().then(function(){
      fillTrendOptions();
      renderAll();
    });
  }

  // 暴露
  window.initBenchmarkPage = initBenchmarkPage;
  window.renderBenchmarkPage = function(){ if (_bm.data) renderAll(); };
  window.setBenchmarkView = setBenchmarkView;
  window.routeBenchmarkTargetToOverview = function(bankId, reason){
    if (!_bm.audience) {
      _bm.audience = "board";
      try { localStorage.setItem("benchmarkiq.audience", "board"); } catch (e) { /* silent */ }
      renderAudienceSwitcher();
    }
    if (selectBenchmarkTargetBank(bankId, reason || "target-change")) {
      setBenchmarkView("overview", { returnContext: "overview" });
      return true;
    }
    setBenchmarkView("overview", { returnContext: "overview" });
    return false;
  };

  // 自启动 1：DOMContentLoaded
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initBenchmarkPage);
  } else {
    setTimeout(initBenchmarkPage, 0);
  }

  // 自启动 2：当切换到 benchmark page 时，确保已 init（兼容部分页面是 lazy mount 的情况）
  document.addEventListener("click", function(e){
    var link = e.target.closest && e.target.closest('[data-page-link="benchmark"]');
    if (link) setTimeout(initBenchmarkPage, 80);
  });

  // 自启动 3：MutationObserver 监听 body[data-app-page] 变化
  if (typeof MutationObserver !== "undefined") {
    var moStart = function () {
      if (!document.body) { setTimeout(moStart, 100); return; }
      try {
        new MutationObserver(function(muts){
          muts.forEach(function(m){
            if (m.attributeName === "data-app-page" && document.body.getAttribute("data-app-page") === "benchmark") {
              initBenchmarkPage();
              if (_bm.data) renderAll();
            }
          });
        }).observe(document.body, { attributes: true, attributeFilter: ["data-app-page"] });
      } catch (e) { /* silent */ }
    };
    moStart();
  }
})();
