const assert = require("assert");
const { chromium } = require("playwright");

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1440, height: 960 } });

  await page.goto("http://127.0.0.1:8798/", { waitUntil: "domcontentloaded" });
  await page.waitForFunction(() => !!document.querySelector("#storylineFactPackDrawer"), null, { timeout: 10000 });

  await page.locator("#bmBankList .bm-bank-item").filter({ hasText: "苏农银行" }).first().click();
  await page.waitForFunction(() => document.querySelectorAll(".bm-storyline-card").length > 0, null, { timeout: 15000 });
  await page.locator("[data-storyline-fact-action='add']").first().click();
  await page.waitForFunction(() => {
    const drawer = document.querySelector("#storylineFactPackDrawer");
    return drawer && /已选择 [1-9]/.test(drawer.innerText || "");
  }, null, { timeout: 10000 });

  const drawerText = await page.locator("#storylineFactPackDrawer").innerText();
  assert.match(drawerText, /故事线事实包/);
  assert.match(drawerText, /已选择 [1-9]/);

  await page.locator("[data-storyline-fact-action='guide']").first().click();
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
