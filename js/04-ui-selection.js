/* Bank VQA module: 04-ui-selection.js */
function bankTypeBucket(type = "") {
  const text = String(type || "");
  if (text.includes("国有")) return "大行";
  if (text.includes("股份")) return "股份行";
  if (text.includes("城市商业")) return "城商行";
  if (text.includes("农村商业")) return "农商行";
  return "其他";
}

function targetTypeOptions() {
  const preferred = ["全部", "大行", "股份行", "城商行", "农商行"];
  const available = new Set(banks.map((bank) => bankTypeBucket(bank.type)).filter(Boolean));
  return preferred.filter((item) => item === "全部" || available.has(item));
}

function targetNeedsRegion(type = state.targetTypeFilter) {
  return ["城商行", "农商行"].includes(type);
}

function targetRegionsForType(type = state.targetTypeFilter) {
  const rows = banks.filter((bank) => type === "全部" || bankTypeBucket(bank.type) === type);
  const regions = [...new Set(rows.map((bank) => bank.region).filter(Boolean))].sort((a, b) => a.localeCompare(b, "zh-CN"));
  return ["全部", ...regions];
}

function filteredTargetBanks() {
  const search = String(state.targetSearch || "").trim().toLowerCase();
  return banks.filter((bank) => {
    const bucket = bankTypeBucket(bank.type);
    const typeOk = state.targetTypeFilter === "全部" || bucket === state.targetTypeFilter;
    const regionOk = !targetNeedsRegion() || state.targetRegionFilter === "全部" || bank.region === state.targetRegionFilter;
    const text = `${displayBankName(bank.bank)} ${bank.bank} ${bank.region || ""} ${bank.type || ""}`.toLowerCase();
    const searchOk = !search || text.includes(search);
    return typeOk && regionOk && searchOk;
  });
}

function ensureTargetInFilter() {
  const rows = filteredTargetBanks();
  if (!rows.length) return;
  if (!rows.some((bank) => bank.bank === state.target)) {
    state.target = rows[0].bank;
    refreshDefaultPeersForTarget();
  }
}

function targetSelectionPreviewHtml() {
  const meta = bankMeta(state.target) || {};
  const row = latest(state.target) || {};
  return `
    <div>
      <span>当前目标银行</span>
      <b>${displayBankName(state.target)}</b>
      <em>${meta.region || row.region || "区域未标注"}｜${meta.type || row.type || "银行样本"}</em>
    </div>
    <div class="target-preview-metrics">
      <span>ROA <b>${fmt(row.roa)}</b></span>
      <span>净息差 <b>${fmt(row.nim)}</b></span>
      <span>PB <b>${row.pb == null ? "暂无" : `${Number(row.pb).toFixed(2)}x`}</b></span>
    </div>`;
}

function peerSelectionPreviewHtml() {
  const template = typeof peerTemplateLabel === "function" ? peerTemplateLabel(state.peerTemplate) : state.peerTemplate;
  const rows = peerRecords();
  return `
    <div>
      <span>当前对标组</span>
      <b>${state.peers.length} 家｜${template}</b>
      <em>${displayBankList(state.peers, "尚未选择对标银行")}</em>
    </div>
    <div class="peer-preview-metrics">
      <span>ROA均值 <b>${fmt(avg(rows, "roa"))}</b></span>
      <span>PB均值 <b>${avg(rows, "pb") == null ? "暂无" : `${avg(rows, "pb").toFixed(2)}x`}</b></span>
    </div>`;
}

function peerCandidateRows() {
  const selected = new Set(state.peers);
  const recommended = new Set(peerTemplateBanks(state.peerTemplate).filter((bank) => bank !== state.target));
  return banks
    .filter((bank) => bank.bank !== state.target)
    .map((bank) => ({
      ...bank,
      isSelected: selected.has(bank.bank),
      isRecommended: recommended.has(bank.bank),
      bucket: bankTypeBucket(bank.type)
    }))
    .sort((a, b) => {
      const rankA = a.isSelected ? 0 : a.isRecommended ? 1 : 2;
      const rankB = b.isSelected ? 0 : b.isRecommended ? 1 : 2;
      return rankA - rankB || (a.region || "").localeCompare(b.region || "", "zh-CN") || a.bank.localeCompare(b.bank, "zh-CN");
    });
}

function renderTargetDrillControls() {
  const typeTabs = document.getElementById("targetTypeTabs");
  const regionTabs = document.getElementById("targetRegionTabs");
  const count = document.getElementById("targetDrillCount");
  const search = document.getElementById("targetBankSearch");
  const clear = document.getElementById("targetClearSearch");
  if (typeTabs) {
    typeTabs.innerHTML = targetTypeOptions().map((type) => `
      <button type="button" class="${state.targetTypeFilter === type ? "is-active" : ""}" data-target-type="${type}">
        ${type}<span>${type === "全部" ? banks.length : banks.filter((bank) => bankTypeBucket(bank.type) === type).length}</span>
      </button>
    `).join("");
    typeTabs.querySelectorAll("button").forEach((button) => button.addEventListener("click", () => {
      state.targetTypeFilter = button.dataset.targetType;
      state.targetRegionFilter = "全部";
      state.targetSearch = "";
      ensureTargetInFilter();
      renderChoicePanels();
      syncHiddenSelects();
      updateSelectionSummary();
      if (state.confirmed) renderAll();
    }));
  }
  if (regionTabs) {
    const shouldShow = targetNeedsRegion();
    regionTabs.hidden = !shouldShow;
    regionTabs.innerHTML = shouldShow ? targetRegionsForType().map((region) => `
      <button type="button" class="${state.targetRegionFilter === region ? "is-active" : ""}" data-target-region="${region}">
        ${region}<span>${region === "全部" ? "" : banks.filter((bank) => bankTypeBucket(bank.type) === state.targetTypeFilter && bank.region === region).length}</span>
      </button>
    `).join("") : "";
    regionTabs.querySelectorAll("button").forEach((button) => button.addEventListener("click", () => {
      state.targetRegionFilter = button.dataset.targetRegion;
      ensureTargetInFilter();
      renderChoicePanels();
      syncHiddenSelects();
      updateSelectionSummary();
      if (state.confirmed) renderAll();
    }));
  }
  if (search && search.value !== state.targetSearch) search.value = state.targetSearch || "";
  if (search && !search.dataset.bound) {
    search.dataset.bound = "1";
    search.addEventListener("input", () => {
      state.targetSearch = search.value;
      renderChoicePanels();
    });
  }
  if (clear && !clear.dataset.bound) {
    clear.dataset.bound = "1";
    clear.addEventListener("click", () => {
      state.targetSearch = "";
      renderChoicePanels();
      search?.focus();
    });
  }
  if (count) {
    const rows = filteredTargetBanks();
    const regionText = targetNeedsRegion() ? `｜${state.targetRegionFilter === "全部" ? "全部区域" : state.targetRegionFilter}` : "";
    count.textContent = `${state.targetTypeFilter}${regionText} · ${rows.length} 家`;
  }
}

function renderChoicePanels() {
  const targetBox = document.getElementById("targetBankChecks");
  const peerBox = document.getElementById("peerBankChecks");
  const targetPreview = document.getElementById("targetSelectionPreview");
  const peerPreview = document.getElementById("peerSelectionPreview");
  const typeBox = document.getElementById("typeChecks");
  const maxPeers = analysisRules?.inputs?.peerBanks?.recommendedMax || 8;
  renderTargetDrillControls();
  if (targetPreview) targetPreview.innerHTML = targetSelectionPreviewHtml();
  if (peerPreview) peerPreview.innerHTML = peerSelectionPreviewHtml();
  if (targetBox) {
    const targetRows = filteredTargetBanks();
    targetBox.innerHTML = targetRows.length ? targetRows.map((b) => `
      <label class="choice-item ${b.bank === state.target ? "is-selected" : ""}">
        <input type="radio" name="targetBankChoice" value="${b.bank}" ${b.bank === state.target ? "checked" : ""}>
        <span>${displayBankName(b.bank)}<em>${b.region || "区域未标注"}｜${b.type || "银行样本"}</em></span>
      </label>
    `).join("") : `<div class="choice-empty">当前筛选下暂无银行，请切换类型、区域或清空搜索。</div>`;
    targetBox.querySelectorAll("input").forEach((input) => input.addEventListener("change", () => {
      state.target = input.value;
      refreshDefaultPeersForTarget();
      renderChoicePanels();
      syncHiddenSelects();
      updateSelectionSummary();
      if (state.confirmed) renderAll();
    }));
  }
  if (peerBox) {
    peerBox.innerHTML = peerCandidateRows().map((b) => `
      <label class="choice-item peer-choice ${b.isSelected ? "is-selected" : ""} ${b.isRecommended ? "is-recommended" : ""}">
        <input type="checkbox" name="peerBankChoice" value="${b.bank}" ${state.peers.includes(b.bank) ? "checked" : ""}>
        <span>${displayBankName(b.bank)}<em>${b.isSelected ? "已选｜" : b.isRecommended ? "推荐｜" : ""}${b.region || "区域未标注"}｜${b.type || "银行样本"}</em></span>
      </label>
    `).join("");
    peerBox.querySelectorAll("input").forEach((input) => input.addEventListener("change", () => {
      const checked = [...peerBox.querySelectorAll("input:checked")].map((el) => el.value).slice(0, maxPeers);
      state.peers = checked.filter((p) => p !== state.target);
      renderChoicePanels();
      syncHiddenSelects();
      updateSelectionSummary();
      if (state.confirmed) renderAll();
    }));
  }
  if (typeBox) {
    const allowedTypes = analysisRules?.inputs?.bankTypes?.allowed || [];
    const allTypes = allowedTypes.length ? allowedTypes : [...new Set(records.map((r) => r.type).filter(Boolean))];
    typeBox.innerHTML = allTypes.map((type) => `
      <label class="choice-item ${state.types.includes(type) ? "is-selected" : ""}">
        <input type="checkbox" name="typeChoice" value="${type}" ${state.types.includes(type) ? "checked" : ""}>
        <span>${type}<em>图表显示该类型均值</em></span>
      </label>
    `).join("");
    typeBox.querySelectorAll("input").forEach((input) => input.addEventListener("change", () => {
      state.types = [...typeBox.querySelectorAll("input:checked")].map((el) => el.value);
      updateChoiceStyles();
      syncHiddenSelects();
      updateSelectionSummary();
      if (state.confirmed) renderAll();
    }));
  }
  updateChoiceStyles();
}

function populateSelectors() {
  const target = document.getElementById("targetBank");
  const peers = document.getElementById("peerBanks");
  const year = document.getElementById("analysisYear");
  const types = document.getElementById("bankTypes");
  const reportVersion = document.getElementById("reportVersion");
  const peerTemplate = document.getElementById("peerTemplate");
  const confirm = document.getElementById("confirmSelection");
  const restart = document.getElementById("restartAnalysis");
  const refresh = document.getElementById("refreshAnalysis");
  const saveProjectBtn = document.getElementById("saveProject");
  const loadProjectBtn = document.getElementById("loadProject");
  const exporter = document.getElementById("exportReport");
  const exportHtml = document.getElementById("exportReportHtml");
  const exportSelected = document.getElementById("exportSelectedData");
  const exportAll = document.getElementById("exportAllData");
  const coverageExportSelected = document.getElementById("coverageExportSelected");
  const coverageExportAll = document.getElementById("coverageExportAll");
  if (!target || !peers) return;
  const options = banks.map((b) => `<option value="${b.bank}">${displayBankName(b.bank)}｜${b.region || "区域未标注"}｜${b.type}</option>`).join("");
  target.innerHTML = options;
  peers.innerHTML = options;
  renderChoicePanels();
  updateSelectionSummary();
  target.value = state.target;
  [...peers.options].forEach((opt) => {
    opt.selected = state.peers.includes(opt.value);
  });
  target.addEventListener("change", () => {
    state.target = target.value;
    refreshDefaultPeersForTarget();
    renderChoicePanels();
    updateSelectionSummary();
    if (state.confirmed) renderAll();
  });
  peers.addEventListener("change", () => {
    state.peers = [...peers.selectedOptions].map((o) => o.value).filter((v) => v !== state.target).slice(0, 8);
    renderChoicePanels();
    updateSelectionSummary();
    if (state.confirmed) renderAll();
  });
  if (year) {
    year.value = String(state.year);
    year.addEventListener("change", () => {
      state.year = Number(year.value);
      updateSelectionSummary();
      if (state.confirmed) renderAll();
    });
  }
  if (types) {
    [...types.options].forEach((opt) => {
      opt.selected = state.types.includes(opt.value);
    });
    types.addEventListener("change", () => {
      state.types = [...types.selectedOptions].map((o) => o.value);
      renderChoicePanels();
      updateSelectionSummary();
      if (state.confirmed) renderAll();
    });
  }
  if (reportVersion) {
    reportVersion.value = state.reportVersion;
    reportVersion.addEventListener("change", () => {
      state.reportVersion = reportVersion.value;
      applyReportVersion(state.reportVersion);
      if (state.confirmed) renderAll();
    });
  }
  if (peerTemplate) {
    peerTemplate.value = state.peerTemplate;
    peerTemplate.addEventListener("change", () => applyPeerTemplate(peerTemplate.value));
  }
  if (confirm) {
    confirm.addEventListener("click", () => {
      ensureTargetInFilter();
      const checkedTarget = document.querySelector('input[name="targetBankChoice"]:checked');
      const checkedPeers = [...document.querySelectorAll('input[name="peerBankChoice"]:checked')].map((input) => input.value);
      const checkedTypes = [...document.querySelectorAll('input[name="typeChoice"]:checked')].map((input) => input.value);
      state.target = checkedTarget?.value || target.value;
      state.peers = checkedPeers.filter((v) => v !== state.target).slice(0, analysisRules?.inputs?.peerBanks?.recommendedMax || 8);
      state.year = year ? Number(year.value) : state.year;
      state.types = checkedTypes.length ? checkedTypes : (types ? [...types.selectedOptions].map((o) => o.value) : state.types);
      state.reportVersion = reportVersion ? reportVersion.value : state.reportVersion;
      state.peerTemplate = peerTemplate ? peerTemplate.value : state.peerTemplate;
      if (state.peerTemplate === "manual" && !checkedPeers.length) refreshDefaultPeersForTarget();
      else if (state.peerTemplate !== "manual") state.peers = peerTemplateBanks(state.peerTemplate);
      state.confirmed = true;
      document.body.classList.add("analysis-ready");
      renderChoicePanels();
      syncHiddenSelects();
      updateSelectionSummary();
      renderAll();
      if (typeof recordAnalysisSession === "function") {
        recordAnalysisSession("确认分析口径", {
          target: state.target,
          peers: state.peers,
          year: state.year,
          version: state.reportVersion
        }, `${displayBankName(state.target)}已确认 ${state.year} 年分析边界，对标组 ${displayBankList(state.peers)}。`);
      }
      applyReportVersion(state.reportVersion);
      if (typeof setWorkspaceTab === "function") setWorkspaceTab("overview");
      document.getElementById("clientCommandCenter")?.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  }
  if (restart) {
    restart.addEventListener("click", () => {
      state.confirmed = false;
      document.body.classList.remove("analysis-ready");
      renderChoicePanels();
      syncHiddenSelects();
      updateSelectionSummary();
      document.querySelector(".control-surface")?.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  }
  if (refresh) {
    refresh.addEventListener("click", () => {
      renderAll();
      if (typeof recordAnalysisSession === "function") recordAnalysisSession("刷新诊断与报告", { target: state.target, year: state.year });
    });
  }
  if (saveProjectBtn) {
    saveProjectBtn.addEventListener("click", saveCurrentProject);
  }
  if (loadProjectBtn) {
    loadProjectBtn.addEventListener("click", () => {
      if (loadLatestProject()) renderAll();
    });
  }
  if (exportHtml) {
    exportHtml.addEventListener("click", () => {
      if (typeof preflightExport === "function" && !preflightExport("HTML")) return;
      if (typeof preflightExport !== "function" && !state.confirmed) return;
      if (typeof recordAnalysisSession === "function") recordAnalysisSession("导出正式报告 HTML", { version: state.reportVersion });
      void downloadReportHtml();
      if (typeof recordExportHistory === "function") recordExportHistory("正式报告 HTML");
    });
  }
  if (exporter) {
    exporter.addEventListener("click", () => {
      if (typeof preflightExport === "function" && !preflightExport("PDF")) return;
      if (typeof preflightExport !== "function" && !state.confirmed) return;
      if (typeof recordExportHistory === "function") recordExportHistory("正式报告 PDF");
      if (typeof recordAnalysisSession === "function") recordAnalysisSession("打印/导出正式报告 PDF", { version: state.reportVersion });
      if (typeof renderFormalReport === "function") renderFormalReport();
      document.body.classList.add("printing-formal-report");
      if (typeof formalReportExportMeta === "function") {
        const meta = formalReportExportMeta("PDF");
        setProjectStatus(`正在打开打印窗口：建议另存为 ${meta.filename}。${meta.note}。`);
      }
      window.print();
      window.setTimeout(() => document.body.classList.remove("printing-formal-report"), 800);
    });
  }
  [exportSelected, coverageExportSelected].filter(Boolean).forEach((button) => {
    button.addEventListener("click", () => {
      if (!state.confirmed) return;
      updateDataCoverage();
      if (typeof recordAnalysisSession === "function") recordAnalysisSession("导出选定数据底稿", { mode: "selected" });
      void exportDataWorkbook("selected");
      if (typeof recordExportHistory === "function") recordExportHistory("选定数据底稿");
    });
  });
  [exportAll, coverageExportAll].filter(Boolean).forEach((button) => {
    button.addEventListener("click", () => {
      if (!state.confirmed) return;
      updateDataCoverage();
      if (typeof recordAnalysisSession === "function") recordAnalysisSession("导出全量数据底稿", { mode: "all" });
      void exportDataWorkbook("all");
      if (typeof recordExportHistory === "function") recordExportHistory("全量数据底稿");
    });
  });
  document.querySelectorAll(".report-section-check").forEach((input) => {
    input.addEventListener("change", () => {
      updateReportSectionVisibility();
      buildSideNav();
      buildPrintDeck();
    });
  });
}

function setText(id, text, className) {
  const el = document.getElementById(id);
  if (!el) return;
  el.textContent = text;
  if (className) el.className = className;
}

function setHtml(id, html) {
  const el = document.getElementById(id);
  if (el) el.innerHTML = html;
}
