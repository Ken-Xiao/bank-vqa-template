/* Bank VQA module: 15-chart-narrative.js — PRD-28/29 图表解读编辑与重生成 */

var CHART_STORY_FIELDS = ["question", "target", "peers", "type", "mechanism", "action", "validation"];

function ensureEditedChartStories() {
  if (!state.editedChartStories) state.editedChartStories = {};
}

function chartStoryKey(title) {
  return cleanChartName(title) || String(title || "").trim();
}

function defaultChartStory(title) {
  const n = narrativeFor(title);
  return {
    question: chartQuestion(title),
    target: n.target || "",
    peers: n.peers || "",
    type: n.type || typeBenchmarkNarrative(title),
    mechanism: typeof chartMechanismText === "function" ? chartMechanismText(title, chartFactPack(title)) : "",
    action: n.action || "",
    validation: typeof chartValidationText === "function" ? chartValidationText(title, chartFactPack(title)) : ""
  };
}

function getChartStory(title) {
  ensureEditedChartStories();
  const key = chartStoryKey(title);
  const stored = state.editedChartStories[key];
  if (stored) return { ...defaultChartStory(title), ...stored, source: "edited" };
  return { ...defaultChartStory(title), source: "generated" };
}

function getChartStoryField(title, field) {
  return getChartStory(title)[field] || "";
}

function saveChartStoryEdit(title, field, value) {
  ensureEditedChartStories();
  const key = chartStoryKey(title);
  if (!state.editedChartStories[key]) state.editedChartStories[key] = {};
  state.editedChartStories[key][field] = value;
  setProjectStatus("图表解读已更新，保存项目后写入 HTML/PPTX 导出。");
  buildPrintDeck();
}

function regenerateChartStory(title) {
  ensureEditedChartStories();
  delete state.editedChartStories[chartStoryKey(title)];
  updateFigureExplanations();
  buildPrintDeck();
  setProjectStatus(`已重新生成「${chartStoryKey(title)}」图表解读。`);
}

function chartExplanationHtml(title) {
  const story = getChartStory(title);
  const facts = chartFactPack(title);
  const blocks = [
    ["question", "本图判断"],
    ["target", "目标银行解读"],
    ["peers", "对标银行解读"],
    ["type", "类型均值参照"],
    ["mechanism", "机制解释"],
    ["action", "管理建议"],
    ["validation", "验证指标"]
  ];
  const fields = blocks.map(([field, label]) => `
    <div class="chart-story-block" data-chart-title="${encodeURIComponent(title)}" data-chart-field="${field}">
      <b>${label}${story.source === "edited" ? "（已编辑）" : ""}</b>
      <textarea class="chart-story-editor" data-chart-field="${field}">${story[field] || ""}</textarea>
    </div>
  `).join("");
  return `${fields}
    <div class="fact-pack"><b>关键事实包</b>${facts.brief} ${facts.rows.slice(0, 2).map((row) => metricLink(row.指标代码, row.指标名称)).join(" ")}</div>
    <div class="chart-story-actions">
      <button type="button" class="btn secondary chart-regenerate-btn" data-chart-title="${encodeURIComponent(title)}">重新生成本图解读</button>
    </div>`;
}

function bindChartStoryEditors(root = document) {
  root.querySelectorAll(".chart-story-editor").forEach((textarea) => {
    if (textarea.dataset.bound) return;
    textarea.dataset.bound = "1";
    textarea.addEventListener("change", () => {
      const block = textarea.closest(".chart-story-block");
      const title = decodeURIComponent(block?.dataset.chartTitle || "");
      saveChartStoryEdit(title, textarea.dataset.chartField, textarea.value);
    });
  });
  root.querySelectorAll(".chart-regenerate-btn").forEach((button) => {
    if (button.dataset.bound) return;
    button.dataset.bound = "1";
    button.addEventListener("click", () => {
      regenerateChartStory(decodeURIComponent(button.dataset.chartTitle || ""));
    });
  });
}

function wrapFigureExplanationHooks() {
  const legacyUpdateFigureExplanations = updateFigureExplanations;
  updateFigureExplanations = function wrappedUpdateFigureExplanations() {
    legacyUpdateFigureExplanations();
    bindChartStoryEditors(document);
  };
  explanationHtml = function wrappedExplanationHtml(title) {
    return chartExplanationHtml(title);
  };
}

function initChartNarrativeModule() {
  ensureEditedChartStories();
  wrapFigureExplanationHooks();
}
