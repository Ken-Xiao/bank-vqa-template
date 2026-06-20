/* Bank VQA module: 48-launch-disclosure.js
 * Sprint 16 PR-X3：Launch 页减载（背景介绍折叠）
 *
 * 问题：Launch 页同时显示 .selection-intro（介绍+iteration-strip）和
 *       .project-briefing-grid（客户问题/分析路径/交付形态 3 卡），
 *       与已实施的 page-header（董事会问题+判断条+证据 strip）功能重叠。
 *
 * 方案：背景介绍默认折叠（data-launch-disclosure="background"），
 *       顶部加 #launchDisclosureBtn 切换；localStorage 持久化。
 *       与 PR-X1 topics-disclosure 模式一致。
 */

var LAUNCH_DISCLOSURE_KEY = "benchmarkiq.launchDisclosureState";

function getLaunchDisclosureState() {
  if (typeof document === "undefined" || !document.body) return "collapsed";
  return document.body.dataset.launchDisclosureState === "expanded"
    ? "expanded"
    : "collapsed";
}

function setLaunchDisclosureState(state, options) {
  options = options || {};
  if (typeof document === "undefined" || !document.body) return;
  var target = state === "expanded" ? "expanded" : "collapsed";
  document.body.setAttribute("data-launch-disclosure-state", target);
  var btn = document.getElementById("launchDisclosureBtn");
  if (btn) {
    btn.setAttribute("aria-expanded", target === "expanded" ? "true" : "false");
    btn.textContent = target === "expanded" ? "收起背景介绍" : "展开背景介绍";
  }
  if (!options.skipPersist) {
    try {
      if (typeof localStorage !== "undefined") {
        localStorage.setItem(LAUNCH_DISCLOSURE_KEY, target);
      }
    } catch (e) { /* silent */ }
  }
}

function toggleLaunchDisclosure() {
  var current = getLaunchDisclosureState();
  setLaunchDisclosureState(current === "expanded" ? "collapsed" : "expanded");
}

function bindLaunchDisclosure() {
  if (typeof document === "undefined") return;
  document.addEventListener("click", function (e) {
    var btn = e.target && e.target.closest && e.target.closest("#launchDisclosureBtn");
    if (!btn) return;
    e.preventDefault();
    toggleLaunchDisclosure();
  });
}

function initLaunchDisclosure() {
  var initial = "collapsed";
  try {
    if (typeof localStorage !== "undefined") {
      var saved = localStorage.getItem(LAUNCH_DISCLOSURE_KEY);
      if (saved === "expanded" || saved === "collapsed") initial = saved;
    }
  } catch (e) { /* silent */ }
  setLaunchDisclosureState(initial, { skipPersist: true });
  bindLaunchDisclosure();
}

if (typeof window !== "undefined") {
  window.getLaunchDisclosureState = getLaunchDisclosureState;
  window.setLaunchDisclosureState = setLaunchDisclosureState;
  window.toggleLaunchDisclosure = toggleLaunchDisclosure;
  window.initLaunchDisclosure = initLaunchDisclosure;
  window.LAUNCH_DISCLOSURE_KEY = LAUNCH_DISCLOSURE_KEY;
}
