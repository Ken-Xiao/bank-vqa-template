const assert = require("assert");
const { chromium } = require("playwright");

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1440, height: 960 } });

  await page.goto("http://127.0.0.1:8798/", { waitUntil: "domcontentloaded" });
  await page.waitForFunction(() => !!document.querySelector("#storylineFactPackDrawer"), null, { timeout: 10000 });

  await page.evaluate(() => {
    const sourcePack = {
      status: "confirmed",
      targetBank: { id: "sunong", name: "苏农银行" },
      peerGroup: { banks: [{ name: "常熟农商行" }, { name: "瑞丰农商行" }, { name: "上海农商行" }] },
      year: 2025,
      selectedStorylineIds: ["nim_pressure"],
      recommendedIssues: [{
        issueId: "nim_pressure",
        title: "息差防守压力扩大",
        priority: 1,
        primaryMetric: "净息差",
        conclusion: "净息差低于对标组且降幅更快。",
        evidenceStrength: "强",
        evidence: [{
          evidenceId: "fact_nim_gap",
          category: "anomaly",
          metric: "净息差",
          targetValue: "1.45%",
          peerValue: "1.68%",
          gap: "-0.23pct",
          signalDirection: "support",
          source: "浏览器回归事实包"
        }],
        charts: [{
          chartId: "chart_nim_story",
          title: "净息差差距与负债结构联动",
          readingGuide: {
            whatToSee: "先看目标行与对标组的净息差差距。",
            keyGap: "净息差低于对标组0.23pct。",
            supports: "支持息差防守压力扩大的判断。",
            reportUse: "适合放入专题归因页，说明盈利压力的直接原因。",
            source: "浏览器回归事实包"
          }
        }],
        causalChain: {
          resultMetric: "ROE",
          directCause: "净息差低于对标组",
          structureCause: "负债成本刚性",
          recommendedAction: "复核负债结构和贷款定价"
        }
      }]
    };
    const pack = window.buildStorylineFactPack(sourcePack);
    window.saveStorylineFactPack(pack);
    window.renderStorylineFactPackControls();
  });
  await page.waitForTimeout(300);

  const drawerText = await page.locator("#storylineFactPackDrawer").innerText();
  assert.match(drawerText, /故事线事实包/);
  assert.match(drawerText, /已选择 [1-9]/);

  await page.evaluate(() => {
    const pack = window.readStorylineFactPack();
    window.openStorylineChartViewer(pack.storylines[0].charts[0]);
  });
  await page.waitForFunction(() => {
    const viewer = document.querySelector("#storylineChartViewer");
    return viewer && viewer.hidden === false;
  }, null, { timeout: 10000 });
  const viewerText = await page.locator("#storylineChartViewer").innerText();
  assert.match(viewerText, /读图指南/);
  assert.match(viewerText, /这张图看什么/);
  assert.match(viewerText, /报告用途/);

  await page.locator(".storyline-chart-viewer-close").click();
  await page.waitForFunction(() => document.querySelector("#storylineChartViewer").hidden === true);

  await page.evaluate(() => {
    window.location.hash = "#page/answer";
    if (typeof window.renderThreePageDiagnosis === "function") window.renderThreePageDiagnosis();
  });
  await page.waitForTimeout(700);
  const answerText = await page.evaluate(() => document.body.innerText);
  assert.match(answerText, /事实包|故事线/);
  assert.match(answerText, /结论摘要|30 秒诊断|经营诊断/);

  await browser.close();
  console.log("storyline-fact-pack-browser-ok");
})().catch(async (error) => {
  console.error(error);
  process.exit(1);
});
