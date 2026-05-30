#!/usr/bin/env python3
"""Split monolithic index.html into CSS + JS modules (Milestone A)."""

from __future__ import annotations

import re
from pathlib import Path

ROOT = Path(__file__).parent
INDEX = ROOT / "index.html"
CSS_OUT = ROOT / "styles" / "app.css"
JS_DIR = ROOT / "js"

MODULE_ORDER = [
    ("01-state.js", "state"),
    ("02-config.js", "config"),
    ("03-data-format.js", "data_format"),
    ("04-ui-selection.js", "ui_selection"),
    ("05-analysis.js", "analysis"),
    ("06-charts.js", "charts"),
    ("07-export.js", "export"),
    ("08-report.js", "report"),
    ("10-bootstrap.js", "bootstrap"),
]

FUNCTION_GROUPS: dict[str, set[str]] = {
    "config": {
        "fallbackAnalysisRules",
        "loadAnalysisRules",
        "applyAnalysisRules",
        "loadMetricDictionary",
        "metricDictionaryEntry",
        "metricLink",
        "bindMetricLinks",
        "setupMetricModal",
        "closeMetricDetail",
        "missingReasonForMetric",
        "metricCoverageLines",
        "openMetricDetail",
        "sanitizeComplianceText",
        "topicPercentile",
        "topicThresholds",
        "topicSignalText",
    },
    "data_format": {
        "fmt",
        "fmtBp",
        "ratioText",
        "resolveBank",
        "latest",
        "series",
        "currentRecords",
        "chartRecords",
        "targetRecord",
        "peerRecords",
        "avg",
        "selectedTypeAverages",
        "selectedTypeAverageRows",
        "metricKeysForCoverage",
        "selectedBankRecords",
        "completeness",
        "metricTheme",
        "fieldName",
        "updateDataCoverage",
        "dataCategories",
        "renderDataExplorer",
        "renderDataTrend",
        "focusRows",
        "rankPercentile",
        "peerTemplateBanks",
        "defaultPeerTemplateForTarget",
        "refreshDefaultPeersForTarget",
        "applyPeerTemplate",
        "applyReportVersion",
        "updateChoiceStyles",
        "syncHiddenSelects",
        "updateSelectionSummary",
        "updateProjectFlow",
        "metricDisplayValue",
        "yoyValue",
        "fiveYearValue",
    },
    "ui_selection": {
        "renderChoicePanels",
        "populateSelectors",
        "setText",
        "setHtml",
    },
    "analysis": {
        "updateKpis",
        "updateRiskTable",
        "updateSummaryText",
        "compareWord",
        "boundedScore",
        "relativeScore",
        "scoreAverage",
        "fallbackVqaEngine",
        "vqaEngine",
        "scoreBandLabel",
        "computeVqaDiagnosis",
        "updateVqaPanel",
        "vqaFactPack",
        "metricDirection",
        "metricSentence",
        "aiStyleEvaluation",
        "evaluateWarning",
        "updateSectionText",
        "updateRecommendations",
        "topicExplainerRows",
        "updateTopicExplainers",
        "fallbackTopicDefinitions",
        "topicDefinitions",
        "topicFactPackRows",
        "topicJudgement",
        "topicCitationFacts",
        "topicCitationTags",
        "topicAiDraft",
        "renderTopicWorkbench",
        "topicWorkbenchExportRows",
        "directionPhrase",
        "updateEnhancedInsights",
        "updateStoryText",
    },
    "charts": {
        "svg",
        "axisChart",
        "barChart",
        "focusBarChart",
        "lineChartByType",
        "stackedIncomeChart",
        "dumbbellChart",
        "bridgeChart",
        "loanYieldQualityChart",
        "heatmapChart",
        "focusTrendChart",
        "trajectoryFocusChart",
        "multiMetricFocusChart",
        "emptySvg",
        "chartForTitle",
        "replaceFigureImages",
        "renderMainCharts",
        "narrativeFor",
        "updateFigureExplanations",
        "explanationHtml",
    },
    "export": {
        "slideKicker",
        "slideMetricLine",
        "shortText",
        "xmlEscape",
        "worksheetXml",
        "downloadWorkbook",
        "safeFilename",
        "downloadTextFile",
        "reportHtmlDocument",
        "downloadReportHtml",
        "flattenRows",
        "typeAverageExportRows",
        "coverageExportRows",
        "metricDictionaryExportRows",
        "selectedReportSections",
        "chartKeyFor",
        "isChartIncluded",
        "setProjectStatus",
        "projectSnapshot",
        "saveCurrentProject",
        "loadLatestProject",
        "syncChartControls",
        "updateReportSectionVisibility",
        "chapterBriefText",
        "updateChapterBriefs",
        "exportDataWorkbook",
        "slideStoryHtml",
        "metricsForChart",
        "chartFactPack",
        "chartFactRows",
        "includedChartCount",
        "typeBenchmarkNarrative",
        "chartQuestion",
        "cleanChartName",
        "chapterNoFromContainer",
        "normalizeChartLabels",
        "collectChartSlides",
        "reportStorySlides",
        "reportMetricRows",
        "reportCommentRows",
    },
    "report": {
        "buildExecutiveSlide",
        "buildTopicSlide",
        "buildTopicDetailSlide",
        "buildAllTopicSlides",
        "buildTocSlide",
        "buildActionRecommendationSlide",
        "buildDataAppendixSlide",
        "buildActiveTopicSlide",
        "buildPrintDeck",
        "chapterStory",
        "buildSideNav",
        "updateActiveNav",
        "renderAll",
    },
    "bootstrap": {
        "initApp",
    },
}


def extract_parts(html: str) -> tuple[str, str, str]:
    css_match = re.search(r"<style>(.*?)</style>", html, re.S)
    if not css_match:
        raise ValueError("style block not found")
    css = css_match.group(1).strip()

    script_match = re.search(r"<script src=\"data\.js\"></script>\s*<script>(.*?)</script>\s*</body>", html, re.S)
    if not script_match:
        raise ValueError("main script block not found")
    js = script_match.group(1).strip()

    head = html[: css_match.start()]
    rest = html[css_match.end() : script_match.start()]
    tail = html[script_match.end() :]
    head = head.rstrip() + '\n  <link rel="stylesheet" href="styles/app.css" />\n'
    body_without_scripts = head + rest + tail
    return css, body_without_scripts, js


def split_js(js: str) -> dict[str, str]:
    func_pattern = re.compile(r"^    (async )?function (\w+)", re.M)

    chunks: dict[str, list[str]] = {key: [] for _, key in MODULE_ORDER}
    func_matches = list(func_pattern.finditer(js))
    func_starts = [m.start() for m in func_matches]
    func_names = [m.group(2) for m in func_matches]

    explain_match = re.search(r"^    const explainRules =", js, re.M)
    explain_pos = explain_match.start() if explain_match else len(js)

    preamble_end = func_starts[0] if func_starts else explain_pos
    chunks["state"].append(js[:preamble_end].rstrip())

    for idx, start in enumerate(func_starts):
        if start >= explain_pos:
            continue
        next_starts = [pos for pos in func_starts if pos > start and pos < explain_pos]
        end = next_starts[0] if next_starts else explain_pos
        name = func_names[idx]
        block = js[start:end].rstrip()
        target = "bootstrap"
        for group, names in FUNCTION_GROUPS.items():
            if name in names:
                target = group
                break
        chunks[target].append(block)

    if explain_match:
        chunks["bootstrap"].append(js[explain_pos:].rstrip())

    return {key: "\n\n".join(part for part in parts if part.strip()) for key, parts in chunks.items()}


def normalize_globals(code: str) -> str:
    lines = []
    for line in code.splitlines():
        if line.startswith("    "):
            line = line[4:]
        lines.append(line)
    code = "\n".join(lines)
    code = re.sub(r"^const state =", "var state =", code, flags=re.M)
    code = re.sub(r"^const data =", "var data =", code, flags=re.M)
    code = re.sub(r"^const records =", "var records =", code, flags=re.M)
    code = re.sub(r"^const banks =", "var banks =", code, flags=re.M)
    code = re.sub(r"^let analysisRules =", "var analysisRules =", code, flags=re.M)
    code = re.sub(r"^let metricDictionary =", "var metricDictionary =", code, flags=re.M)
    code = re.sub(r"^const metricLabel =", "var metricLabel =", code, flags=re.M)
    code = re.sub(r"^const explainRules =", "var explainRules =", code, flags=re.M)
    return code


def build_index_html(body_without_scripts: str) -> str:
    script_block = """
  <script src="data.js"></script>
  <script src="js/01-state.js"></script>
  <script src="js/02-config.js"></script>
  <script src="js/03-data-format.js"></script>
  <script src="js/04-ui-selection.js"></script>
  <script src="js/05-analysis.js"></script>
  <script src="js/06-charts.js"></script>
  <script src="js/07-export.js"></script>
  <script src="js/08-report.js"></script>
  <script src="js/09-projects.js"></script>
  <script src="js/10-bootstrap.js"></script>
"""
    body_without_scripts = re.sub(
        r"<script src=\"data\.js\"></script>\s*<script>.*?</script>\s*</body>",
        script_block.strip() + "\n</body>",
        body_without_scripts,
        flags=re.S,
    )
    if "js/01-state.js" not in body_without_scripts:
        body_without_scripts = body_without_scripts.replace(
            "</body>",
            script_block.strip() + "\n</body>",
        )
    return body_without_scripts


def main() -> None:
    html = INDEX.read_text(encoding="utf-8")
    css, body_without_scripts, js = extract_parts(html)
    CSS_OUT.parent.mkdir(parents=True, exist_ok=True)
    JS_DIR.mkdir(parents=True, exist_ok=True)
    CSS_OUT.write_text(css + "\n", encoding="utf-8")

    chunks = split_js(js)
    for filename, key in MODULE_ORDER:
        content = normalize_globals(chunks.get(key, ""))
        header = f"/* Bank VQA module: {filename} */\n"
        (JS_DIR / filename).write_text(header + content + "\n", encoding="utf-8")

    # placeholder for milestone B module if missing
    projects_path = JS_DIR / "09-projects.js"
    if not projects_path.exists():
        projects_path.write_text("/* Bank VQA module: 09-projects.js */\n", encoding="utf-8")

    INDEX.write_text(build_index_html(body_without_scripts), encoding="utf-8")
    print("Split complete:")
    for path in sorted(JS_DIR.glob("*.js")):
        print(f"  {path.name}: {path.stat().st_size} bytes")
    print(f"  styles/app.css: {CSS_OUT.stat().st_size} bytes")


if __name__ == "__main__":
    main()
