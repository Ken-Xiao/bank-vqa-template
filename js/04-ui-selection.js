/* Bank VQA module: 04-ui-selection.js */
function renderChoicePanels() {
  const targetBox = document.getElementById("targetBankChecks");
  const peerBox = document.getElementById("peerBankChecks");
  const typeBox = document.getElementById("typeChecks");
  const maxPeers = analysisRules?.inputs?.peerBanks?.recommendedMax || 8;
  if (targetBox) {
    targetBox.innerHTML = banks.map((b) => `
      <label class="choice-item ${b.bank === state.target ? "is-selected" : ""}">
        <input type="radio" name="targetBankChoice" value="${b.bank}" ${b.bank === state.target ? "checked" : ""}>
        <span>${displayBankName(b.bank)}<em>${b.region || "区域未标注"}｜${b.type || "银行样本"}</em></span>
      </label>
    `).join("");
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
    peerBox.innerHTML = banks.filter((b) => b.bank !== state.target).map((b) => `
      <label class="choice-item ${state.peers.includes(b.bank) ? "is-selected" : ""}">
        <input type="checkbox" name="peerBankChoice" value="${b.bank}" ${state.peers.includes(b.bank) ? "checked" : ""}>
        <span>${displayBankName(b.bank)}<em>${b.region || "区域未标注"}｜${b.type || "银行样本"}</em></span>
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
    refresh.addEventListener("click", renderAll);
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
      void downloadReportHtml();
      if (typeof recordExportHistory === "function") recordExportHistory("HTML");
    });
  }
  if (exporter) {
    exporter.addEventListener("click", () => {
      if (typeof preflightExport === "function" && !preflightExport("PDF")) return;
      if (typeof preflightExport !== "function" && !state.confirmed) return;
      if (typeof recordExportHistory === "function") recordExportHistory("PDF");
      window.print();
    });
  }
  [exportSelected, coverageExportSelected].filter(Boolean).forEach((button) => {
    button.addEventListener("click", () => {
      if (!state.confirmed) return;
      updateDataCoverage();
      void exportDataWorkbook("selected");
      if (typeof recordExportHistory === "function") recordExportHistory("选定数据底稿");
    });
  });
  [exportAll, coverageExportAll].filter(Boolean).forEach((button) => {
    button.addEventListener("click", () => {
      if (!state.confirmed) return;
      updateDataCoverage();
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
