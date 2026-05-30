/* Bank VQA module: 23-investment-evidence.js — PRD v2 investment-banking evidence pack */

function ibSafeNumber(value, fallback = 0) {
  return typeof value === "number" && !Number.isNaN(value) ? value : fallback;
}

function ibSelectedBankRows(row = targetRecord()) {
  const banks = [row?.bank || state.target, ...(state.peers || [])].filter(Boolean);
  return banks.map((bank) => records.find((item) => item.bank === bank && item.year === state.year)).filter(Boolean);
}

function ibRoaFactorRows(row = targetRecord()) {
  if (!row) return [];
  const assets = Math.max(ibSafeNumber(row.assets, 0), 1);
  const netInterest = row.netInterestIncome != null ? proRatio(row.netInterestIncome, assets, 100) : row.nim;
  const fee = row.feeIncome != null ? proRatio(row.feeIncome, assets, 100) : row.feeAssetRatio;
  const otherRevenue = row.nonInterestShare != null && row.revenue != null ? proRatio(row.revenue * row.nonInterestShare / 100 - (row.feeIncome || 0), assets, 100) : row.trueCoreNonInterest;
  const admin = row.adminExpense != null ? -proRatio(row.adminExpense, assets, 100) : -ibSafeNumber(row.adminAssetRatio);
  const provision = row.ppop != null && row.netProfit != null ? -proRatio(row.ppop - row.netProfit, assets, 100) : -ibSafeNumber(row.creditCostRatio || row.provisionOtherAsset);
  const tax = row.incomeTax != null ? -proRatio(row.incomeTax, assets, 100) : 0;
  const rows = [
    { key: "netInterest", label: "利息净收入", value: netInterest || 0, role: "support" },
    { key: "fee", label: "手续费净收入", value: fee || 0, role: "support" },
    { key: "other", label: "其他非息", value: otherRevenue || 0, role: (otherRevenue || 0) >= 0 ? "support" : "drag" },
    { key: "admin", label: "管理费用", value: admin || 0, role: "drag" },
    { key: "provision", label: "拨备及其他", value: provision || 0, role: "drag" },
    { key: "tax", label: "所得税", value: tax || 0, role: "drag" }
  ];
  const total = rows.reduce((sum, item) => sum + item.value, 0);
  return { rows, total, reported: row.roa, gap: row.roa == null ? null : row.roa - total };
}

function ibHarveyRows(row = targetRecord()) {
  const rows = ibSelectedBankRows(row);
  const dimensions = typeof sparcDimensions === "function" ? sparcDimensions() : [];
  return rows.map((bankRow) => ({
    bank: bankRow.bank,
    isTarget: bankRow.bank === row?.bank,
    cells: dimensions.map((dimension) => {
      const scores = dimension.metrics.map((metric) => sparcMetricScore(bankRow, metric.key, metric.higher, rows)).filter((score) => score != null);
      const score = scores.length ? scores.reduce((sum, item) => sum + item, 0) / scores.length : null;
      const fill = score == null ? 0 : Math.max(0, Math.min(4, Math.round(score / 25)));
      return { code: dimension.code, label: dimension.label, score, fill };
    })
  }));
}

function ibTornadoRows(row = targetRecord()) {
  if (!row || typeof whatIfScenario !== "function") return [];
  const assumptions = [
    { key: "nimDown", label: "NIM -10bp", scenario: { nimBp: -10, nplBp: 0, costPp: 0 } },
    { key: "nimUp", label: "NIM +10bp", scenario: { nimBp: 10, nplBp: 0, costPp: 0 } },
    { key: "nplUp", label: "不良率 +20bp", scenario: { nimBp: 0, nplBp: 20, costPp: 0 } },
    { key: "nplDown", label: "不良率 -20bp", scenario: { nimBp: 0, nplBp: -20, costPp: 0 } },
    { key: "costUp", label: "成本收入比 +2pct", scenario: { nimBp: 0, nplBp: 0, costPp: 2 } },
    { key: "costDown", label: "成本收入比 -2pct", scenario: { nimBp: 0, nplBp: 0, costPp: -2 } }
  ];
  return assumptions.map((item) => {
    const result = whatIfScenario(row, item.scenario);
    return {
      ...item,
      roaDelta: result?.roaDelta || 0,
      scoreDelta: result?.scoreDelta || 0
    };
  }).sort((a, b) => Math.abs(b.roaDelta) - Math.abs(a.roaDelta));
}

function ibSparklinePoints(bank, key, width = 88, height = 26) {
  const rows = series(bank).filter((item) => item[key] != null).slice(-6);
  if (rows.length < 2) return "";
  const values = rows.map((item) => item[key]);
  const min = Math.min(...values);
  const max = Math.max(...values);
  const span = max - min || 1;
  return rows.map((item, index) => {
    const x = rows.length === 1 ? 0 : (index / (rows.length - 1)) * width;
    const y = height - ((item[key] - min) / span) * height;
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  }).join(" ");
}

function renderIbHarveyMatrix() {
  const host = document.getElementById("harveyMatrix");
  if (!host) return;
  const rows = state.confirmed ? ibHarveyRows() : [];
  if (!rows.length) {
    host.innerHTML = "<div class=\"ib-empty\">确认样本后生成 Harvey Ball 总览矩阵。</div>";
    return;
  }
  const dims = rows[0].cells;
  host.innerHTML = `
    <table class="ib-harvey-table">
      <thead><tr><th>银行</th>${dims.map((cell) => `<th>${cell.code}<span>${cell.label}</span></th>`).join("")}</tr></thead>
      <tbody>${rows.map((row) => `
        <tr class="${row.isTarget ? "is-target" : ""}">
          <th>${displayBankName(row.bank)}</th>
          ${row.cells.map((cell) => `<td><i class="harvey-fill-${cell.fill}"></i><em>${cell.score == null ? "--" : cell.score.toFixed(0)}</em></td>`).join("")}
        </tr>`).join("")}</tbody>
    </table>`;
}

function renderIbRoaWaterfall() {
  const host = document.getElementById("roaWaterfallPanel");
  if (!host) return;
  const pack = state.confirmed ? ibRoaFactorRows() : null;
  if (!pack?.rows?.length) {
    host.innerHTML = "<div class=\"ib-empty\">确认样本后生成 ROA 七因子桥。</div>";
    return;
  }
  const maxAbs = Math.max(...pack.rows.map((item) => Math.abs(item.value)), 0.01);
  host.innerHTML = `
    <div class="ib-waterfall-summary">
      <div><span>桥图测算</span><b>${pack.total.toFixed(2)}%</b></div>
      <div><span>报表ROA</span><b>${metricDisplayValue("roa", pack.reported)}</b></div>
    </div>
    <div class="ib-waterfall-list">${pack.rows.map((item) => `
      <div class="ib-waterfall-row ${item.value >= 0 ? "pos" : "neg"}">
        <span>${item.label}</span>
        <div><i style="width:${Math.max(6, Math.abs(item.value) / maxAbs * 100)}%"></i></div>
        <b>${item.value >= 0 ? "+" : ""}${item.value.toFixed(2)}%</b>
      </div>`).join("")}</div>
    <p class="ib-card-note">用于解释 ROA 来自利差、中收、费用、拨备和税费的贡献，口径不足时以可得字段代理。</p>`;
}

function renderIbTornado() {
  const host = document.getElementById("tornadoPanel");
  if (!host) return;
  const rows = state.confirmed ? ibTornadoRows() : [];
  if (!rows.length) {
    host.innerHTML = "<div class=\"ib-empty\">确认样本后生成敏感性排序。</div>";
    return;
  }
  const maxAbs = Math.max(...rows.map((item) => Math.abs(item.roaDelta)), 0.01);
  host.innerHTML = `<div class="ib-tornado-list">${rows.map((item) => `
    <div class="ib-tornado-row ${item.roaDelta >= 0 ? "pos" : "neg"}">
      <span>${item.label}</span>
      <div><i style="width:${Math.max(6, Math.abs(item.roaDelta) / maxAbs * 100)}%"></i></div>
      <b>${item.roaDelta >= 0 ? "+" : ""}${item.roaDelta.toFixed(2)}pct</b>
    </div>`).join("")}</div>
    <p class="ib-card-note">按 ROA 影响绝对值排序，用于识别董事会最该追问的经营假设。</p>`;
}

function renderIbSparklineMatrix() {
  const host = document.getElementById("peerSparklineMatrix");
  if (!host) return;
  const row = targetRecord();
  const rows = state.confirmed ? ibSelectedBankRows(row) : [];
  const keys = ["roa", "nim", "npl", "cet1Buffer", "pb"];
  if (!rows.length) {
    host.innerHTML = "<div class=\"ib-empty\">确认样本后生成同业 Sparkline 全景。</div>";
    return;
  }
  host.innerHTML = `
    <table class="ib-spark-table">
      <thead><tr><th>银行</th>${keys.map((key) => `<th>${fieldName(key)}</th>`).join("")}</tr></thead>
      <tbody>${rows.map((bankRow) => `
        <tr class="${bankRow.bank === row?.bank ? "is-target" : ""}">
          <th>${displayBankName(bankRow.bank)}</th>
          ${keys.map((key) => {
            const points = ibSparklinePoints(bankRow.bank, key);
            return `<td><svg viewBox="0 0 88 26" preserveAspectRatio="none"><polyline points="${points}"></polyline></svg><span>${metricDisplayValue(key, bankRow[key])}</span></td>`;
          }).join("")}
        </tr>`).join("")}</tbody>
    </table>`;
}

function updateInvestmentEvidencePack() {
  renderIbHarveyMatrix();
  renderIbRoaWaterfall();
  renderIbTornado();
  renderIbSparklineMatrix();
  const badge = document.getElementById("ibEvidenceBadge");
  if (badge) badge.textContent = state.confirmed ? "已生成 4 类证据页" : "待生成";
}

function investmentEvidenceHtmlForFormal() {
  const row = targetRecord();
  if (!row) return "";
  const factor = ibRoaFactorRows(row);
  const tornado = ibTornadoRows(row).slice(0, 5);
  const mainDrag = factor.rows.filter((item) => item.value < 0).sort((a, b) => a.value - b.value)[0];
  const mainSupport = factor.rows.filter((item) => item.value > 0).sort((a, b) => b.value - a.value)[0];
  return `
    <section class="formal-section" id="formal-ib-evidence">
      <div class="formal-section-kicker">投行级证据页</div>
      <h2>价值诊断需要从位置判断升级为因子归因和情景敏感性</h2>
      <p class="formal-lead">本页汇总 PRD v2 的 Phase 0 核心交付：ROA 因子桥用于解释回报来源，Tornado 敏感性用于识别经营假设暴露，同业 Sparkline 和 Harvey Ball 矩阵用于把目标银行放回可辩护的参照系。</p>
      <div class="formal-ib-grid">
        <div><span>ROA 最大支撑项</span><b>${formalEscape(mainSupport?.label || "待补")}</b><p>${formalEscape(mainSupport ? `${mainSupport.value.toFixed(2)}pct` : "可用字段不足。")}</p></div>
        <div><span>ROA 最大侵蚀项</span><b>${formalEscape(mainDrag?.label || "待补")}</b><p>${formalEscape(mainDrag ? `${mainDrag.value.toFixed(2)}pct` : "可用字段不足。")}</p></div>
        <div><span>最高敏感因子</span><b>${formalEscape(tornado[0]?.label || "待补")}</b><p>${formalEscape(tornado[0] ? `${tornado[0].roaDelta >= 0 ? "+" : ""}${tornado[0].roaDelta.toFixed(2)}pct ROA` : "暂无情景。")}</p></div>
      </div>
    </section>`;
}

function bindInvestmentEvidencePack() {
  const originalRenderAll = typeof renderAll === "function" ? renderAll : null;
  if (originalRenderAll && !originalRenderAll.__investmentEvidenceWrapped) {
    renderAll = function renderAllWithInvestmentEvidence() {
      const result = originalRenderAll.apply(this, arguments);
      updateInvestmentEvidencePack();
      return result;
    };
    renderAll.__investmentEvidenceWrapped = true;
  }
  updateInvestmentEvidencePack();
}

bindInvestmentEvidencePack();
