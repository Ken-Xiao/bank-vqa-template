/* Bank VQA module: 09-projects.js — Milestone B: multi-project + peer group governance */

var PROJECTS_STORAGE_KEY = "bankVqaProjects";
var PEER_GROUPS_STORAGE_KEY = "bankVqaPeerGroups";
var LEGACY_PROJECT_KEY = "bankVqaLatestProject";

function createProjectId() {
  return `proj_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

function readJsonStorage(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch (error) {
    return fallback;
  }
}

function writeJsonStorage(key, value) {
  localStorage.setItem(key, JSON.stringify(value));
}

function migrateLegacyProject() {
  const list = readJsonStorage(PROJECTS_STORAGE_KEY, []);
  if (list.length) return list;
  const legacy = readJsonStorage(LEGACY_PROJECT_KEY, null);
  if (!legacy) return [];
  const migrated = {
    id: createProjectId(),
    name: `${legacy.target || state.target}_${legacy.year || state.year}`,
    ...legacy,
    confirmed: legacy.confirmed !== false
  };
  writeJsonStorage(PROJECTS_STORAGE_KEY, [migrated]);
  return [migrated];
}

function listProjects() {
  const projects = migrateLegacyProject();
  return projects.sort((a, b) => new Date(b.savedAt || 0) - new Date(a.savedAt || 0));
}

function saveProjects(projects) {
  writeJsonStorage(PROJECTS_STORAGE_KEY, projects.slice(0, 50));
  const latest = projects[0];
  if (latest) writeJsonStorage(LEGACY_PROJECT_KEY, latest);
}

function listPeerGroups() {
  return readJsonStorage(PEER_GROUPS_STORAGE_KEY, []).sort((a, b) => new Date(b.updatedAt || 0) - new Date(a.updatedAt || 0));
}

function savePeerGroups(groups) {
  writeJsonStorage(PEER_GROUPS_STORAGE_KEY, groups.slice(0, 10));
}

function defaultProjectName() {
  return `${state.target}_${state.year}_${state.reportVersion}`.replace(/\s+/g, "");
}

function projectSnapshotWithMeta(name, id) {
  return {
    id: id || state.currentProjectId || createProjectId(),
    name: name || state.projectName || defaultProjectName(),
    target: state.target,
    peers: state.peers,
    year: state.year,
    types: state.types,
    includedCharts: state.includedCharts,
    reportVersion: state.reportVersion,
    peerTemplate: state.peerTemplate,
    activeTopic: state.activeTopic,
    editedNarratives: state.editedNarratives || {},
    deliveryReview: state.deliveryReview || {},
    narrativeLocks: state.narrativeLocks || {},
    includedTopics: state.includedTopics || {},
    editedChartStories: state.editedChartStories || {},
    confirmed: state.confirmed,
    savedAt: new Date().toISOString()
  };
}

function applyProjectSnapshot(project) {
  state.target = project.target || state.target;
  state.peers = Array.isArray(project.peers) ? project.peers : state.peers;
  state.year = Number(project.year) || state.year;
  state.types = Array.isArray(project.types) ? project.types : state.types;
  state.includedCharts = project.includedCharts || {};
  state.reportVersion = project.reportVersion || state.reportVersion;
  state.peerTemplate = project.peerTemplate || "manual";
  state.activeTopic = project.activeTopic || state.activeTopic;
  state.editedNarratives = project.editedNarratives || {};
  state.deliveryReview = project.deliveryReview || state.deliveryReview || {};
  state.narrativeLocks = project.narrativeLocks || state.narrativeLocks || {};
  state.includedTopics = project.includedTopics || {};
  state.editedChartStories = project.editedChartStories || {};
  state.currentProjectId = project.id || null;
  state.projectName = project.name || defaultProjectName();
  state.confirmed = project.confirmed !== false;
  document.body.classList.toggle("analysis-ready", state.confirmed);
  syncHiddenSelects();
  renderChoicePanels();
  updateSelectionSummary();
  applyReportVersion(state.reportVersion);
  if (state.confirmed) renderAll();
  if (typeof renderPrdCoverageDashboard === "function") renderPrdCoverageDashboard();
  if (typeof renderDeliveryReviewPanel === "function") renderDeliveryReviewPanel();
  if (typeof renderAiGovernancePanel === "function") renderAiGovernancePanel();
}

function upsertCurrentProject(name) {
  const projects = listProjects();
  const snapshot = projectSnapshotWithMeta(name || state.projectName || defaultProjectName(), state.currentProjectId);
  const idx = projects.findIndex((item) => item.id === snapshot.id);
  if (idx >= 0) projects[idx] = snapshot;
  else projects.unshift(snapshot);
  projects.sort((a, b) => new Date(b.savedAt || 0) - new Date(a.savedAt || 0));
  saveProjects(projects);
  state.currentProjectId = snapshot.id;
  state.projectName = snapshot.name;
  return snapshot;
}

function saveCurrentProject() {
  if (!state.confirmed) {
    setProjectStatus("请先确认分析口径，再保存项目。");
    return;
  }
  const input = document.getElementById("projectNameInput");
  const name = input?.value.trim() || state.projectName || defaultProjectName();
  const saved = upsertCurrentProject(name);
  if (input) input.value = saved.name;
  renderProjectManager();
  setProjectStatus(`已保存项目：${saved.name}（共 ${listProjects().length} 个本地项目）。`);
}

function loadLatestProject() {
  const projects = listProjects();
  if (!projects.length) {
    setProjectStatus("暂无已保存项目。");
    return false;
  }
  applyProjectSnapshot(projects[0]);
  renderProjectManager();
  renderPeerGroupManager();
  renderPeerRecommendations();
  const savedAt = projects[0].savedAt ? new Date(projects[0].savedAt).toLocaleString("zh-CN", { hour12: false }) : "未知时间";
  setProjectStatus(`已加载最近项目：${projects[0].name}，保存时间：${savedAt}。`);
  return true;
}

function loadProjectById(projectId) {
  const project = listProjects().find((item) => item.id === projectId);
  if (!project) return false;
  applyProjectSnapshot(project);
  renderProjectManager();
  renderPeerGroupManager();
  renderPeerRecommendations();
  setProjectStatus(`已加载项目：${project.name}。`);
  return true;
}

function copyCurrentProject() {
  if (!state.confirmed) {
    setProjectStatus("请先确认分析口径，再复制项目。");
    return;
  }
  const baseName = state.projectName || defaultProjectName();
  const copy = projectSnapshotWithMeta(`${baseName}_副本`, createProjectId());
  const projects = listProjects();
  projects.unshift(copy);
  saveProjects(projects);
  state.currentProjectId = copy.id;
  state.projectName = copy.name;
  const input = document.getElementById("projectNameInput");
  if (input) input.value = copy.name;
  renderProjectManager();
  setProjectStatus(`已复制项目：${copy.name}。`);
}

function deleteProjectById(projectId) {
  const projects = listProjects().filter((item) => item.id !== projectId);
  saveProjects(projects);
  if (state.currentProjectId === projectId) state.currentProjectId = null;
  renderProjectManager();
  setProjectStatus("项目已删除。");
}

function peerTemplateLabel(template) {
  const map = {
    manual: "手动选择",
    sameType: "同类型对标",
    sameRegion: "同区域对标",
    sameScale: "同规模对标",
    valuation: "资本市场相近"
  };
  return map[template] || template;
}

function peerRecommendationReasons(template = state.peerTemplate) {
  const target = targetRecord() || latest(state.target);
  if (!target) return ["请先选择目标银行。"];
  const reasons = [];
  const analysisTemplate = typeof recommendedAnalysisTemplate === "function" ? recommendedAnalysisTemplate(target) : null;
  if (analysisTemplate) reasons.push(`推荐分析方案：${analysisTemplate.label}。${analysisTemplate.rationale || "已按银行类型预设对标组、专题和报告口径。"}`);
  if (template === "sameType") reasons.push(`同银行类型：优先匹配 ${target.type || "同类型"} 样本，便于解释类型共性下的个体偏离。`);
  if (template === "sameRegion") reasons.push(`同区域或相近经营模式：优先匹配 ${target.region || "同区域"} 样本，便于区分区域因素与个体能力。`);
  if (template === "sameScale") reasons.push(`资产规模相近：以总资产 ${target.assets == null ? "暂无" : `${Math.round(target.assets / 10000)} 亿元级`} 为锚，避免大小行差异掩盖经营质量。`);
  if (template === "valuation") reasons.push(`资本市场相近：结合 PB ${target.pb == null ? "暂无" : `${Number(target.pb).toFixed(2)}x`} 与 ROA ${fmt(target.roa)} 寻找估值与回报接近样本。`);
  if (template === "manual") reasons.push("手动对标组：当前对标银行由用户手工勾选，系统仍会用类型均值和样本分位做参照。");
  const peerPb = avg(peerRecords(), "pb");
  const peerRoa = avg(peerRecords(), "roa");
  if (state.peers.length) {
    reasons.push(`当前对标组 ${state.peers.length} 家：${displayBankList(state.peers)}。`);
    if (peerPb != null || peerRoa != null) reasons.push(`对标组均值：PB ${peerPb == null ? "暂无" : `${peerPb.toFixed(2)}x`}，ROA ${fmt(peerRoa)}。`);
    if (typeof peerGroupDispersion === "function") {
      const cv = peerGroupDispersion();
      if (cv != null) reasons.push(cv > .6 ? `规模离散度 ${(cv * 100).toFixed(0)}%，建议说明大中小样本混用边界。` : `规模离散度 ${(cv * 100).toFixed(0)}%，对标组整体可辩护性较好。`);
    }
  }
  return reasons;
}

function renderPeerRecommendations() {
  const host = document.getElementById("peerRecommendBox");
  if (!host) return;
  const reasons = peerRecommendationReasons();
  host.innerHTML = `<b>对标推荐理由</b>${reasons.map((item) => `<div>${item}</div>`).join("")}`;
}

function saveCurrentPeerGroup() {
  const input = document.getElementById("peerGroupNameInput");
  const name = input?.value.trim();
  if (!name) {
    setProjectStatus("请先输入对标组名称。");
    return;
  }
  if (!state.peers.length) {
    setProjectStatus("当前未选择对标银行，无法保存对标组。");
    return;
  }
  const groups = listPeerGroups();
  const payload = {
    id: createProjectId().replace("proj_", "peer_"),
    name,
    target: state.target,
    peers: state.peers,
    types: state.types,
    peerTemplate: state.peerTemplate,
    isDefault: !groups.some((item) => item.isDefault),
    updatedAt: new Date().toISOString()
  };
  const idx = groups.findIndex((item) => item.name === name);
  if (idx >= 0) groups[idx] = payload;
  else groups.unshift(payload);
  savePeerGroups(groups);
  if (input) input.value = name;
  renderPeerGroupManager();
  setProjectStatus(`已保存对标组：${name}。`);
}

function setDefaultPeerGroup(groupId) {
  const groups = listPeerGroups().map((group) => ({
    ...group,
    isDefault: group.id === groupId,
    updatedAt: group.id === groupId ? new Date().toISOString() : group.updatedAt
  }));
  savePeerGroups(groups);
  renderPeerGroupManager();
  renderPeerGroupQuickSelect();
  setProjectStatus("已设置默认对标组。下次可在快捷选择中优先应用。");
}

function applyPeerGroup(groupId) {
  const group = listPeerGroups().find((item) => item.id === groupId);
  if (!group) return;
  if (group.target) state.target = group.target;
  state.peers = Array.isArray(group.peers) ? group.peers : state.peers;
  state.types = Array.isArray(group.types) ? group.types : state.types;
  state.peerTemplate = group.peerTemplate || "manual";
  syncHiddenSelects();
  renderChoicePanels();
  updateSelectionSummary();
  renderPeerRecommendations();
  if (state.confirmed) renderAll();
  setProjectStatus(`已应用对标组：${group.name}。`);
}

function deletePeerGroup(groupId) {
  savePeerGroups(listPeerGroups().filter((item) => item.id !== groupId));
  renderPeerGroupManager();
  setProjectStatus("对标组已删除。");
}

function allBankNames() {
  return [...new Set(records.map((row) => row.bank))].sort((a, b) => a.localeCompare(b, "zh-CN"));
}

function openPeerGroupEditor(groupId) {
  const group = listPeerGroups().find((item) => item.id === groupId);
  const modal = document.getElementById("peerEditModal");
  const content = document.getElementById("peerEditModalContent");
  if (!group || !modal || !content) return;
  modal.dataset.groupId = groupId;
  const banks = allBankNames();
  content.innerHTML = `
    <div class="section-kicker">对标组编辑</div>
    <h3>${group.name}</h3>
    <p class="peer-edit-note">增删对标银行后保存，系统将更新最近修改时间。目标银行：${group.target || "通用"}</p>
    <div class="peer-edit-grid">${banks.map((bank) => `
      <label class="peer-edit-option">
        <input type="checkbox" value="${bank}" ${(group.peers || []).includes(bank) ? "checked" : ""} />
        <span>${bank}</span>
      </label>
    `).join("")}</div>
    <div class="peer-edit-actions">
      <button type="button" class="btn" id="savePeerGroupEditBtn">保存修改</button>
      <button type="button" class="btn secondary" id="cancelPeerGroupEditBtn">取消</button>
    </div>
  `;
  content.querySelector("#savePeerGroupEditBtn")?.addEventListener("click", () => savePeerGroupEdit(groupId));
  content.querySelector("#cancelPeerGroupEditBtn")?.addEventListener("click", closePeerGroupEditor);
  modal.hidden = false;
  document.body.classList.add("peer-edit-open");
}

function closePeerGroupEditor() {
  const modal = document.getElementById("peerEditModal");
  if (!modal) return;
  modal.hidden = true;
  delete modal.dataset.groupId;
  document.body.classList.remove("peer-edit-open");
}

function savePeerGroupEdit(groupId) {
  const modal = document.getElementById("peerEditModal");
  const content = document.getElementById("peerEditModalContent");
  const groups = listPeerGroups();
  const idx = groups.findIndex((item) => item.id === groupId);
  if (idx < 0 || !content) return;
  const peers = [...content.querySelectorAll(".peer-edit-option input:checked")].map((input) => input.value);
  if (!peers.length) {
    setProjectStatus("对标组至少保留一家银行。");
    return;
  }
  groups[idx] = {
    ...groups[idx],
    peers,
    updatedAt: new Date().toISOString()
  };
  savePeerGroups(groups);
  closePeerGroupEditor();
  renderPeerGroupManager();
  setProjectStatus(`对标组「${groups[idx].name}」已更新，共 ${peers.length} 家银行。`);
}

function renderProjectManager() {
  const host = document.getElementById("projectList");
  if (!host) return;
  const projects = listProjects();
  if (!projects.length) {
    host.innerHTML = `<div class="project-list-item"><div><b>暂无项目</b><span>保存当前分析后将在这里显示项目列表（本地最多 50 个）。</span></div></div>`;
    return;
  }
  host.innerHTML = projects.map((project) => `
    <div class="project-list-item${project.id === state.currentProjectId ? " is-active" : ""}">
      <div>
        <b>${project.name}</b>
        <span>${project.target}｜${project.year} 年｜${project.reportVersion || "董事会完整汇报版"}<br/>更新：${project.savedAt ? new Date(project.savedAt).toLocaleString("zh-CN", { hour12: false }) : "未知"}</span>
      </div>
      <div class="project-list-actions">
        <button type="button" data-action="load-project" data-id="${project.id}">加载</button>
        <button type="button" data-action="copy-project" data-id="${project.id}">复制</button>
        <button type="button" data-action="delete-project" data-id="${project.id}">删除</button>
      </div>
    </div>
  `).join("");
}

function renderPeerGroupQuickSelect() {
  const select = document.getElementById("peerGroupQuickApply");
  if (!select) return;
  const groups = listPeerGroups().sort((a, b) => Number(!!b.isDefault) - Number(!!a.isDefault));
  select.innerHTML = `<option value="">选择已保存对标组…</option>${groups.slice(0, 10).map((group) => `<option value="${group.id}">${group.isDefault ? "默认｜" : ""}${group.name}（${(group.peers || []).length} 家）</option>`).join("")}`;
}

function bindPeerGroupQuickSelect() {
  const select = document.getElementById("peerGroupQuickApply");
  if (!select || select.dataset.bound) return;
  select.dataset.bound = "1";
  select.addEventListener("change", () => {
    if (!select.value) return;
    applyPeerGroup(select.value);
    select.value = "";
  });
}

function renderPeerGroupManager() {
  const host = document.getElementById("peerGroupList");
  if (!host) return;
  const groups = listPeerGroups();
  if (!groups.length) {
    host.innerHTML = `<div class="peer-group-item"><div><b>暂无自定义对标组</b><span>保存当前对标银行后可复用到新项目。</span></div></div>`;
    renderPeerGroupQuickSelect();
    return;
  }
  host.innerHTML = groups.map((group) => `
    <div class="peer-group-item">
      <div>
        <b>${group.name}</b>
        <span>${group.isDefault ? "默认组｜" : ""}${group.target ? displayBankName(group.target) : "通用"}｜${displayBankList(group.peers || [], "未设置")}<br/>模板：${peerTemplateLabel(group.peerTemplate)}｜更新：${group.updatedAt ? new Date(group.updatedAt).toLocaleString("zh-CN", { hour12: false }) : "未知"}</span>
      </div>
      <div class="peer-group-actions">
        <button type="button" data-action="apply-peer-group" data-id="${group.id}">应用</button>
        <button type="button" data-action="default-peer-group" data-id="${group.id}">设默认</button>
        <button type="button" data-action="edit-peer-group" data-id="${group.id}">编辑</button>
        <button type="button" data-action="delete-peer-group" data-id="${group.id}">删除</button>
      </div>
    </div>
  `).join("");
  renderPeerGroupQuickSelect();
}

function bindProjectManagerEvents() {
  const projectList = document.getElementById("projectList");
  projectList?.addEventListener("click", (event) => {
    const button = event.target.closest("button[data-action]");
    if (!button) return;
    const { action, id } = button.dataset;
    if (action === "load-project") loadProjectById(id);
    if (action === "copy-project") {
      loadProjectById(id);
      copyCurrentProject();
    }
    if (action === "delete-project") deleteProjectById(id);
  });

  const peerGroupList = document.getElementById("peerGroupList");
  peerGroupList?.addEventListener("click", (event) => {
    const button = event.target.closest("button[data-action]");
    if (!button) return;
    const { action, id } = button.dataset;
    if (action === "apply-peer-group") applyPeerGroup(id);
    if (action === "default-peer-group") setDefaultPeerGroup(id);
    if (action === "edit-peer-group") openPeerGroupEditor(id);
    if (action === "delete-peer-group") deletePeerGroup(id);
  });

  document.getElementById("peerEditModalBackdrop")?.addEventListener("click", closePeerGroupEditor);
  document.getElementById("peerEditModalClose")?.addEventListener("click", closePeerGroupEditor);

  document.getElementById("createProjectBtn")?.addEventListener("click", () => {
    state.currentProjectId = null;
    saveCurrentProject();
  });
  document.getElementById("copyProjectBtn")?.addEventListener("click", copyCurrentProject);
  document.getElementById("savePeerGroupBtn")?.addEventListener("click", saveCurrentPeerGroup);
}

function wrapPeerTemplateHooks() {
  const legacyApplyPeerTemplate = applyPeerTemplate;
  applyPeerTemplate = function wrappedApplyPeerTemplate(template) {
    legacyApplyPeerTemplate(template);
    renderPeerRecommendations();
  };
  const legacyRefreshDefaultPeersForTarget = refreshDefaultPeersForTarget;
  refreshDefaultPeersForTarget = function wrappedRefreshDefaultPeersForTarget() {
    legacyRefreshDefaultPeersForTarget();
    renderPeerRecommendations();
  };
}

function initProjectsModule() {
  migrateLegacyProject();
  wrapPeerTemplateHooks();
  bindProjectManagerEvents();
  bindPeerGroupQuickSelect();
  renderProjectManager();
  renderPeerGroupManager();
  renderPeerRecommendations();
  const input = document.getElementById("projectNameInput");
  if (input && !input.value) input.value = state.projectName || defaultProjectName();
}

function projectSnapshot() {
  return projectSnapshotWithMeta(state.projectName || defaultProjectName(), state.currentProjectId);
}
