/* Bank VQA module: 47-topics-disclosure.js
 * Sprint 16 PR-X1：Topics 页减载（Progressive Disclosure）
 *
 * 问题：topics 页默认承载 18 个 mount（4 个 crossSignal + 4 个 tushare mount
 *       + v5ValuePanel + ibEvidencePanel + topicWorkbenchSection 等），
 *       违反了 v10 mock "Topic Hub 只做入口、不展开长内容" 的设计意图。
 *
 * 方案：给深钻 mount 加 data-topics-disclosure="advanced" 属性，
 *       CSS 默认隐藏；topics 页顶部加 #topicsDisclosureBtn 一键展开。
 *       状态写入 localStorage 持久化。完全不动现有 mount 的渲染逻辑。
 *
 * 不动：cross signal 引擎、tushare mount、v5/ib 面板的内部实现。
 * 仅控：body[data-topics-disclosure-state] attribute。
 */

var TOPICS_DISCLOSURE_KEY = "benchmarkiq.topicsDisclosureState";

function getTopicsDisclosureState() {
  if (typeof document === "undefined" || !document.body) return "collapsed";
  return document.body.dataset.topicsDisclosureState === "expanded"
    ? "expanded"
    : "collapsed";
}

function setTopicsDisclosureState(state, options) {
  options = options || {};
  if (typeof document === "undefined" || !document.body) return;
  var target = state === "expanded" ? "expanded" : "collapsed";
  document.body.setAttribute("data-topics-disclosure-state", target);
  // 同步 toggle 按钮的 aria-expanded 和文本
  var btn = document.getElementById("topicsDisclosureBtn");
  if (btn) {
    btn.setAttribute("aria-expanded", target === "expanded" ? "true" : "false");
    btn.textContent = target === "expanded" ? "收起机制深钻" : "展开机制深钻";
  }
  // 持久化
  if (!options.skipPersist) {
    try {
      if (typeof localStorage !== "undefined") {
        localStorage.setItem(TOPICS_DISCLOSURE_KEY, target);
      }
    } catch (e) { /* silent */ }
  }
}

function toggleTopicsDisclosure() {
  var current = getTopicsDisclosureState();
  setTopicsDisclosureState(current === "expanded" ? "collapsed" : "expanded");
}

function bindTopicsDisclosure() {
  if (typeof document === "undefined") return;
  document.addEventListener("click", function (e) {
    var btn = e.target && e.target.closest && e.target.closest("#topicsDisclosureBtn");
    if (!btn) return;
    e.preventDefault();
    toggleTopicsDisclosure();
  });
}

function initTopicsDisclosure() {
  // 从 localStorage 恢复状态；默认 collapsed
  var initial = "collapsed";
  try {
    if (typeof localStorage !== "undefined") {
      var saved = localStorage.getItem(TOPICS_DISCLOSURE_KEY);
      if (saved === "expanded" || saved === "collapsed") initial = saved;
    }
  } catch (e) { /* silent */ }
  setTopicsDisclosureState(initial, { skipPersist: true });
  bindTopicsDisclosure();
}

if (typeof window !== "undefined") {
  window.getTopicsDisclosureState = getTopicsDisclosureState;
  window.setTopicsDisclosureState = setTopicsDisclosureState;
  window.toggleTopicsDisclosure = toggleTopicsDisclosure;
  window.initTopicsDisclosure = initTopicsDisclosure;
  window.TOPICS_DISCLOSURE_KEY = TOPICS_DISCLOSURE_KEY;
}
