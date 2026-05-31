/* Bank VQA module: 06-charts.js */
function svg(width, height, body) {
  return `<svg viewBox="0 0 ${width} ${height}" width="100%" height="100%" role="img" aria-label="动态图表">${body}</svg>`;
}

function axisChart(rows, xKey, yKey, opts = {}) {
  const width = 920, height = 420, pad = { l: 86, r: 34, t: 28, b: 58 };
  const typeAvgs = selectedTypeAverages(xKey, yKey);
  const plotRows = [...rows, ...typeAvgs];
  const valsX = plotRows.map((r) => r[xKey]).filter((v) => typeof v === "number");
  const valsY = plotRows.map((r) => r[yKey]).filter((v) => typeof v === "number");
  if (!valsX.length || !valsY.length) return emptySvg("暂无足够数据生成图表");
  let minX = Math.min(...valsX, 0), maxX = Math.max(...valsX, 1);
  let minY = Math.min(...valsY, 0), maxY = Math.max(...valsY, 1);
  const spanX = maxX - minX || 1, spanY = maxY - minY || 1;
  minX -= spanX * .12; maxX += spanX * .12; minY -= spanY * .12; maxY += spanY * .12;
  const sx = (v) => pad.l + (v - minX) / (maxX - minX) * (width - pad.l - pad.r);
  const sy = (v) => height - pad.b - (v - minY) / (maxY - minY) * (height - pad.t - pad.b);
  const target = targetRecord();
  const peers = new Set(state.peers.map(resolveBank));
  const grid = Array.from({ length: 5 }, (_, i) => {
    const x = pad.l + i * (width - pad.l - pad.r) / 4;
    const y = pad.t + i * (height - pad.t - pad.b) / 4;
    return `<line x1="${x}" x2="${x}" y1="${pad.t}" y2="${height - pad.b}" stroke="#e7ecef"/><line x1="${pad.l}" x2="${width - pad.r}" y1="${y}" y2="${y}" stroke="#e7ecef"/>`;
  }).join("");
  const midX = sx(opts.xMid ?? avg(rows, xKey) ?? 0);
  const midY = sy(opts.yMid ?? avg(rows, yKey) ?? 0);
  const typePoints = typeAvgs.map((r, idx) => {
    const x = sx(r[xKey]);
    const y = sy(r[yKey]);
    const colors = ["#061B3A", "#0099D8", "#7ED0F0", "#F59E0B"];
    const color = colors[idx % colors.length];
    return `<rect x="${x - 6}" y="${y - 6}" width="12" height="12" fill="${color}" opacity=".92" transform="rotate(45 ${x} ${y})"/>
      <text x="${x + 10}" y="${y + 4}" fill="${color}" font-size="12" font-weight="700">${displayBankName(r.bank)}</text>`;
  }).join("");
  const points = rows.filter((r) => typeof r[xKey] === "number" && typeof r[yKey] === "number").map((r) => {
    const isTarget = r.bank === target?.bank;
    const isPeer = peers.has(r.bank);
    const color = isTarget ? "#0099D8" : isPeer ? "#F59E0B" : "#D9E1EA";
    const radius = isTarget ? 9 : isPeer ? 6 : 3.8;
    const label = isTarget || isPeer ? `<text x="${sx(r[xKey]) + 10}" y="${sy(r[yKey]) - 8}" fill="${isTarget ? "#EF4444" : "#061B3A"}" font-size="13" font-weight="700">${displayBankName(r.bank)}</text>` : "";
    return `<circle cx="${sx(r[xKey])}" cy="${sy(r[yKey])}" r="${radius}" fill="${color}" opacity="${isTarget || isPeer ? .96 : .22}"/>${label}`;
  }).join("");
  return svg(width, height, `
    <rect x="0" y="0" width="${width}" height="${height}" fill="#fff"/>
    ${grid}
    <rect x="${Math.min(midX, width - pad.r)}" y="${pad.t}" width="${Math.max(0, width - pad.r - midX)}" height="${Math.max(0, midY - pad.t)}" fill="#f6c542" opacity=".12"/>
    <line x1="${midX}" x2="${midX}" y1="${pad.t}" y2="${height - pad.b}" stroke="#0099D8" stroke-width="2" stroke-dasharray="6 6"/>
    <line x1="${pad.l}" x2="${width - pad.r}" y1="${midY}" y2="${midY}" stroke="#d8dee6" stroke-width="2"/>
    <line x1="${pad.l}" x2="${pad.l}" y1="${pad.t}" y2="${height - pad.b}" stroke="#8796a4" stroke-width="2"/>
    <line x1="${pad.l}" x2="${width - pad.r}" y1="${height - pad.b}" y2="${height - pad.b}" stroke="#8796a4" stroke-width="2"/>
    ${points}
    ${typePoints}
    <text x="${pad.l}" y="${pad.t - 8}" fill="#667789" font-size="12" font-weight="700">菱形为所选银行类型均值</text>
    <text x="${width / 2}" y="${height - 18}" text-anchor="middle" fill="#333" font-size="15" font-weight="700">${metricLabel[xKey] || xKey}</text>
    <text x="24" y="${height / 2}" transform="rotate(-90 24 ${height / 2})" text-anchor="middle" fill="#333" font-size="15" font-weight="700">${metricLabel[yKey] || yKey}</text>
  `);
}

function barChart(rows, key, opts = {}) {
  const width = 920, rowH = 28, pad = { l: 170, r: 70, t: 26, b: 34 };
  const typeAvgs = selectedTypeAverageRows(key);
  const filtered = rows.filter((r) => typeof r[key] === "number");
  if (!filtered.length) return emptySvg("暂无足够数据生成图表");
  const sorted = [...filtered].sort((a, b) => (opts.asc ? a[key] - b[key] : b[key] - a[key])).slice(0, opts.limit || 24);
  const target = targetRecord();
  if (target && !sorted.some((r) => r.bank === target.bank) && typeof target[key] === "number") sorted.push(target);
  peerRecords().forEach((peer) => {
    if (!sorted.some((r) => r.bank === peer.bank) && typeof peer[key] === "number") sorted.push(peer);
  });
  const vals = [...sorted, ...typeAvgs].map((r) => r[key]);
  const min = Math.min(...vals, 0), max = Math.max(...vals, 0);
  const span = max - min || 1;
  const height = pad.t + pad.b + sorted.length * rowH;
  const zero = pad.l + (0 - min) / span * (width - pad.l - pad.r);
  const typeLines = typeAvgs.map((r, idx) => {
    const colors = ["#061B3A", "#0099D8", "#7ED0F0", "#F59E0B"];
    const x = pad.l + (r[key] - min) / span * (width - pad.l - pad.r);
    return `<line x1="${x}" x2="${x}" y1="${pad.t - 12}" y2="${height - pad.b + 8}" stroke="${colors[idx % colors.length]}" stroke-width="2" stroke-dasharray="5 5"/>
      <text x="${x + 4}" y="${pad.t + 10 + idx * 16}" fill="${colors[idx % colors.length]}" font-size="12" font-weight="700">${displayBankName(r.bank)}</text>`;
  }).join("");
  const rowsSvg = sorted.map((r, i) => {
    const y = pad.t + i * rowH + 6;
    const x = pad.l + (Math.min(0, r[key]) - min) / span * (width - pad.l - pad.r);
    const w = Math.abs(r[key]) / span * (width - pad.l - pad.r);
    const isTarget = target?.bank === r.bank;
    const peer = state.peers.map(resolveBank).includes(r.bank);
    const fill = isTarget ? "#0099D8" : peer ? "#F59E0B" : (r[key] >= 0 ? "#2F3A4A" : "#A6B0BE");
    return `<text x="8" y="${y + 12}" fill="#061B3A" font-size="12">${displayBankName(r.bank)}</text>
      <rect x="${x}" y="${y}" width="${Math.max(w, 2)}" height="14" fill="${fill}"/>
      <text x="${r[key] >= 0 ? x + w + 6 : x - 6}" y="${y + 12}" text-anchor="${r[key] >= 0 ? "start" : "end"}" fill="#333" font-size="12" font-weight="700">${Number(r[key]).toFixed(opts.digits ?? 1)}</text>`;
  }).join("");
  return svg(width, height, `
    <rect x="0" y="0" width="${width}" height="${height}" fill="#fff"/>
    <line x1="${zero}" x2="${zero}" y1="${pad.t - 10}" y2="${height - pad.b + 5}" stroke="#9aa8b4" stroke-width="2"/>
    ${typeLines}
    ${rowsSvg}
    <text x="${width / 2}" y="${height - 8}" text-anchor="middle" fill="#333" font-size="14" font-weight="700">${metricLabel[key] || key}</text>
  `);
}

function focusBarChart(key, opts = {}) {
  const width = 920, rowH = 42, pad = { l: 220, r: 82, t: 30, b: 42 };
  const rows = focusRows([key]).filter((r) => typeof r[key] === "number");
  if (!rows.length) return emptySvg("暂无足够数据生成图表");
  const vals = rows.map((r) => r[key]);
  const min = Math.min(...vals, 0), max = Math.max(...vals, 0);
  const span = max - min || 1;
  const height = pad.t + pad.b + rows.length * rowH;
  const zero = pad.l + (0 - min) / span * (width - pad.l - pad.r);
  const body = rows.map((r, i) => {
    const y = pad.t + i * rowH + 9;
    const x = pad.l + (Math.min(0, r[key]) - min) / span * (width - pad.l - pad.r);
    const w = Math.abs(r[key]) / span * (width - pad.l - pad.r);
    const isTarget = r.bank === resolveBank(state.target);
    const isType = r.isTypeAverage;
    const fill = isTarget ? "#0099D8" : isType ? "#7ED0F0" : "#F59E0B";
    const stroke = isType ? ' stroke="#061B3A" stroke-dasharray="4 3"' : "";
    return `<text x="8" y="${y + 15}" fill="#061B3A" font-size="13" font-weight="${isTarget ? 800 : 700}">${displayBankName(r.bank)}</text>
      <rect x="${x}" y="${y}" width="${Math.max(w, 3)}" height="18" fill="${fill}" opacity="${isType ? .42 : .9}"${stroke}/>
      <text x="${r[key] >= 0 ? x + w + 7 : x - 7}" y="${y + 14}" text-anchor="${r[key] >= 0 ? "start" : "end"}" fill="#333" font-size="12" font-weight="700">${Number(r[key]).toFixed(opts.digits ?? 1)}</text>`;
  }).join("");
  return svg(width, height, `<rect width="${width}" height="${height}" fill="#fff"/><line x1="${zero}" x2="${zero}" y1="${pad.t - 8}" y2="${height - pad.b + 8}" stroke="#9aa8b4" stroke-width="2"/>${body}<text x="${width / 2}" y="${height - 8}" text-anchor="middle" fill="#333" font-size="14" font-weight="700">${metricLabel[key] || key}</text><text x="${pad.l}" y="16" fill="#667789" font-size="12" font-weight="700">只显示目标银行、对标银行与所选类型均值</text>`);
}

function lineChartByType(metric) {
  const width = 920, height = 420, pad = { l: 70, r: 30, t: 24, b: 52 };
  const years = data.years || [2020, 2021, 2022, 2023, 2024, 2025];
  const types = [...new Set(records.map((r) => r.type))].filter(Boolean);
  const colors = ["#061B3A", "#0099D8", "#7ED0F0", "#F59E0B"];
  const seriesData = types.map((type) => ({
    type,
    values: years.map((year) => avg(records.filter((r) => r.year === year && r.type === type), metric))
  }));
  const vals = seriesData.flatMap((s) => s.values).filter((v) => typeof v === "number");
  if (!vals.length) return emptySvg("暂无足够数据生成图表");
  const min = Math.min(...vals), max = Math.max(...vals);
  const span = max - min || 1;
  const sx = (i) => pad.l + i / (years.length - 1) * (width - pad.l - pad.r);
  const sy = (v) => height - pad.b - (v - min) / span * (height - pad.t - pad.b);
  const lines = seriesData.map((s, idx) => {
    const pts = s.values.map((v, i) => v == null ? null : `${sx(i)},${sy(v)}`).filter(Boolean).join(" ");
    return `<polyline points="${pts}" fill="none" stroke="${colors[idx % colors.length]}" stroke-width="3"/>
      ${s.values.map((v, i) => v == null ? "" : `<circle cx="${sx(i)}" cy="${sy(v)}" r="4" fill="${colors[idx % colors.length]}"/>`).join("")}
      <text x="${width - pad.r - 110}" y="${pad.t + idx * 22 + 10}" fill="${colors[idx % colors.length]}" font-size="13" font-weight="700">${s.type}</text>`;
  }).join("");
  const yearLabels = years.map((y, i) => `<text x="${sx(i)}" y="${height - 22}" text-anchor="middle" fill="#667789" font-size="12">${y}</text>`).join("");
  return svg(width, height, `<rect width="${width}" height="${height}" fill="#fff"/><line x1="${pad.l}" x2="${pad.l}" y1="${pad.t}" y2="${height - pad.b}" stroke="#8796a4" stroke-width="2"/><line x1="${pad.l}" x2="${width - pad.r}" y1="${height - pad.b}" y2="${height - pad.b}" stroke="#8796a4" stroke-width="2"/>${lines}${yearLabels}<text x="${width / 2}" y="${height - 4}" text-anchor="middle" fill="#333" font-size="14" font-weight="700">${metricLabel[metric] || metric}</text>`);
}

function stackedIncomeChart() {
  const width = 920, height = 420, pad = { l: 220, r: 42, t: 34, b: 48 };
  const rows = focusRows(["nonInterestShare"]).filter((r) => typeof r.nonInterestShare === "number");
  if (!rows.length) return emptySvg("暂无收入结构数据");
  const rowH = (height - pad.t - pad.b) / rows.length;
  const body = rows.map((r, i) => {
    const y = pad.t + i * rowH + 8;
    const non = Math.max(0, Math.min(100, r.nonInterestShare));
    const interest = 100 - non;
    const fullW = width - pad.l - pad.r;
    const isTarget = r.bank === resolveBank(state.target);
    const labelWeight = isTarget ? 800 : 700;
    return `<text x="8" y="${y + 18}" fill="#061B3A" font-size="13" font-weight="${labelWeight}">${displayBankName(r.bank)}</text>
      <rect x="${pad.l}" y="${y}" width="${fullW * interest / 100}" height="22" fill="${isTarget ? "#0099D8" : r.isTypeAverage ? "#7ED0F0" : "#061B3A"}" opacity="${r.isTypeAverage ? .48 : .9}"/>
      <rect x="${pad.l + fullW * interest / 100}" y="${y}" width="${fullW * non / 100}" height="22" fill="#d7e3ee"/>
      <text x="${pad.l + fullW + 8}" y="${y + 16}" fill="#333" font-size="12" font-weight="700">非息${non.toFixed(1)}%</text>`;
  }).join("");
  return svg(width, height, `<rect width="${width}" height="${height}" fill="#fff"/><text x="${pad.l}" y="20" fill="#667789" font-size="12" font-weight="700">深色=利息收入占比，浅色=非息收入占比；仅显示目标银行、对标银行与类型均值</text>${body}<text x="${width / 2}" y="${height - 10}" text-anchor="middle" fill="#333" font-size="14" font-weight="700">利息依赖与非息缓冲结构</text>`);
}

function dumbbellChart(key, prevYear = state.year - 1) {
  const width = 920, rowH = 32, pad = { l: 220, r: 88, t: 34, b: 36 };
  const names = [...new Set([state.target, ...state.peers].map(resolveBank))];
  const rows = names.map((bank) => {
    const a = records.find((r) => r.bank === bank && r.year === prevYear);
    const b = records.find((r) => r.bank === bank && r.year === state.year);
    return { bank, prev: a?.[key], curr: b?.[key] };
  }).filter((r) => typeof r.prev === "number" && typeof r.curr === "number");
  selectedTypeAverageRows(key, records.filter((r) => r.year === prevYear || r.year === state.year)).forEach((avgRow) => {
    const type = avgRow.type;
    rows.push({
      bank: `${type}均值`,
      prev: avg(records.filter((r) => r.year === prevYear && r.type === type), key),
      curr: avg(records.filter((r) => r.year === state.year && r.type === type), key),
      isTypeAverage: true
    });
  });
  if (!rows.length) return emptySvg("暂无足够数据生成哑铃图");
  const vals = rows.flatMap((r) => [r.prev, r.curr]).filter((v) => typeof v === "number");
  const min = Math.min(...vals, 0), max = Math.max(...vals, 1);
  const span = max - min || 1;
  const sx = (v) => pad.l + (v - min) / span * (width - pad.l - pad.r);
  const height = pad.t + pad.b + rows.length * rowH;
  const body = rows.map((r, i) => {
    const y = pad.t + i * rowH + 12;
    const target = r.bank === resolveBank(state.target);
    const color = r.isTypeAverage ? "#F59E0B" : target ? "#0099D8" : "#061B3A";
    return `<text x="8" y="${y + 4}" fill="#061B3A" font-size="12" font-weight="${target ? 800 : 600}">${displayBankName(r.bank)}</text>
      <line x1="${sx(r.prev)}" x2="${sx(r.curr)}" y1="${y}" y2="${y}" stroke="${color}" stroke-width="3" opacity=".8"/>
      <circle cx="${sx(r.prev)}" cy="${y}" r="5" fill="#A6B0BE"/>
      <circle cx="${sx(r.curr)}" cy="${y}" r="6" fill="${color}"/>
      <text x="${sx(r.curr) + 8}" y="${y + 4}" fill="#333" font-size="12" font-weight="700">${Number(r.curr).toFixed(2)}</text>`;
  }).join("");
  return svg(width, height, `<rect width="${width}" height="${height}" fill="#fff"/><line x1="${pad.l}" x2="${width - pad.r}" y1="${height - pad.b}" y2="${height - pad.b}" stroke="#8796a4" stroke-width="2"/>${body}<text x="${width / 2}" y="${height - 8}" text-anchor="middle" fill="#333" font-size="14" font-weight="700">${prevYear} 至 ${state.year} 年 ${metricLabel[key] || key} 哑铃变化</text>`);
}

function bridgeChart() {
  const width = 920, height = 420, pad = { l: 80, r: 40, t: 32, b: 76 };
  const row = targetRecord();
  if (!row) return emptySvg("暂无目标银行数据");
  const items = [
    ["净利息收入", row.netInterestIncome && row.assets ? row.netInterestIncome / row.assets * 100 : null],
    ["手续费净收入", row.feeIncome && row.assets ? row.feeIncome / row.assets * 100 : null],
    ["非息占比", row.nonInterestShare ? row.nonInterestShare / 20 : null],
    ["成本侵蚀", row.costIncomeRatio ? -row.costIncomeRatio / 60 : null],
    ["风险侵蚀", row.npl ? -row.npl / 2 : null],
    ["总资产收益率", row.roa]
  ].filter((d) => typeof d[1] === "number");
  const vals = items.map((d) => d[1]);
  const min = Math.min(...vals, -1), max = Math.max(...vals, 1);
  const span = max - min || 1;
  const zero = height - pad.b - (0 - min) / span * (height - pad.t - pad.b);
  const step = (width - pad.l - pad.r) / items.length;
  const bars = items.map((d, i) => {
    const x = pad.l + i * step + 18;
    const y = height - pad.b - (d[1] - min) / span * (height - pad.t - pad.b);
    const h = Math.abs(y - zero);
    const top = d[1] >= 0 ? y : zero;
    const fill = i === items.length - 1 ? "#0099D8" : d[1] >= 0 ? "#061B3A" : "#EF4444";
    return `<rect x="${x}" y="${top}" width="${Math.max(24, step * .52)}" height="${Math.max(2, h)}" fill="${fill}" opacity=".92"/>
      <text x="${x + step * .26}" y="${top - 8}" text-anchor="middle" fill="#333" font-size="12" font-weight="700">${d[1].toFixed(2)}</text>
      <text x="${x + step * .26}" y="${height - 42}" text-anchor="middle" fill="#061B3A" font-size="12">${d[0]}</text>`;
  }).join("");
  return svg(width, height, `<rect width="${width}" height="${height}" fill="#fff"/><line x1="${pad.l}" x2="${width - pad.r}" y1="${zero}" y2="${zero}" stroke="#9aa8b4" stroke-width="2"/><line x1="${pad.l}" x2="${pad.l}" y1="${pad.t}" y2="${height - pad.b}" stroke="#8796a4" stroke-width="2"/>${bars}<text x="${width / 2}" y="${height - 8}" text-anchor="middle" fill="#333" font-size="14" font-weight="700">${displayBankName(row.bank)} 总资产收益率支撑与侵蚀拆解</text>`);
}

function loanYieldQualityChart() {
  const width = 920, height = 420, pad = { l: 220, r: 40, t: 32, b: 54 };
  const rows = focusRows(["earningAssetYield", "npl"]).filter((r) => typeof r.earningAssetYield === "number");
  if (!rows.length) return emptySvg("暂无贷款收益成色数据");
  const creditCostProxy = (r) => typeof r.npl === "number" ? r.npl * 0.45 : 0;
  const adjusted = (r) => r.earningAssetYield - creditCostProxy(r);
  const vals = rows.flatMap((r) => [r.earningAssetYield, adjusted(r), 0]);
  const min = Math.min(...vals), max = Math.max(...vals);
  const span = max - min || 1;
  const sx = (v) => pad.l + (v - min) / span * (width - pad.l - pad.r);
  const rowH = (height - pad.t - pad.b) / rows.length;
  const body = rows.map((r, i) => {
    const y = pad.t + i * rowH + rowH / 2;
    const isTarget = r.bank === resolveBank(state.target);
    const isType = r.isTypeAverage;
    const nominal = r.earningAssetYield;
    const adj = adjusted(r);
    const cost = creditCostProxy(r);
    const color = isTarget ? "#0099D8" : isType ? "#7ED0F0" : "#F59E0B";
    return `<text x="8" y="${y + 4}" fill="#061B3A" font-size="12" font-weight="${isTarget ? 800 : 700}">${displayBankName(r.bank)}</text>
      <line x1="${sx(adj)}" x2="${sx(nominal)}" y1="${y}" y2="${y}" stroke="#EF4444" stroke-width="7" opacity=".55"/>
      <circle cx="${sx(nominal)}" cy="${y}" r="6" fill="${color}"/>
      <circle cx="${sx(adj)}" cy="${y}" r="6" fill="#061B3A"/>
      <text x="${sx(nominal) + 8}" y="${y - 6}" fill="#333" font-size="11">名义${nominal.toFixed(2)}</text>
      <text x="${sx(adj) + 8}" y="${y + 15}" fill="#061B3A" font-size="11" font-weight="700">成色${adj.toFixed(2)}</text>`;
  }).join("");
  return svg(width, height, `<rect width="${width}" height="${height}" fill="#fff"/><line x1="${pad.l}" x2="${width - pad.r}" y1="${height - pad.b}" y2="${height - pad.b}" stroke="#8796a4" stroke-width="2"/>${body}<text x="${width / 2}" y="${height - 14}" text-anchor="middle" fill="#333" font-size="14" font-weight="700">贷款名义收益率扣除信用成本后的收益成色</text><text x="${pad.l}" y="18" fill="#667789" font-size="12" font-weight="700">红色段为信用成本代理侵蚀，深蓝点为风险调整后收益</text>`);
}

function heatmapChart() {
  const width = 920, height = 420, pad = { l: 210, r: 40, t: 48, b: 36 };
  const metrics = ["overdueNplDeviation", "provisionCoverage", "profitPpopGap", "npl"];
  const labels = ["偏离度", "拨备覆盖率", "利润缺口", "不良率"];
  const rows = [
    { name: resolveBank(state.target), records: [targetRecord()].filter(Boolean) },
    ...state.peers.map((p) => ({ name: resolveBank(p), records: [latest(p)].filter(Boolean) })),
    ...state.types.map((type) => ({ name: `${type}均值`, records: currentRecords().filter((r) => r.type === type) }))
  ].filter((r) => r.records.length).slice(0, 12);
  const all = currentRecords();
  const cellW = (width - pad.l - pad.r) / metrics.length;
  const rowH = (height - pad.t - pad.b) / rows.length;
  const color = (metric, value) => {
    const vals = all.map((r) => r[metric]).filter((v) => typeof v === "number");
    if (!vals.length || value == null) return "#edf1f5";
    const min = Math.min(...vals), max = Math.max(...vals);
    const p = (value - min) / ((max - min) || 1);
    const risk = metric === "provisionCoverage" ? 1 - p : p;
    return risk > .66 ? "#EF4444" : risk > .33 ? "#f6c542" : "#7ED0F0";
  };
  const cells = rows.map((row, ri) => {
    return metrics.map((m, ci) => {
      const v = avg(row.records, m);
      const x = pad.l + ci * cellW, y = pad.t + ri * rowH;
      return `<rect x="${x}" y="${y}" width="${cellW - 2}" height="${rowH - 2}" fill="${color(m, v)}" opacity=".82"/>
        <text x="${x + cellW / 2}" y="${y + rowH / 2 + 4}" text-anchor="middle" fill="#fff" font-size="12" font-weight="700">${v == null ? "—" : Number(v).toFixed(m === "provisionCoverage" ? 0 : 2)}</text>`;
    }).join("") + `<text x="8" y="${pad.t + ri * rowH + rowH / 2 + 4}" fill="#061B3A" font-size="12" font-weight="700">${displayBankName(row.name)}</text>`;
  }).join("");
  const heads = labels.map((l, i) => `<text x="${pad.l + i * cellW + cellW / 2}" y="26" text-anchor="middle" fill="#061B3A" font-size="13" font-weight="800">${l}</text>`).join("");
  return svg(width, height, `<rect width="${width}" height="${height}" fill="#fff"/>${heads}${cells}<text x="${width / 2}" y="${height - 8}" text-anchor="middle" fill="#333" font-size="14" font-weight="700">风险确认与缓冲能力热力矩阵</text>`);
}

function focusTrendChart(metric, titleText) {
  const width = 920, height = 420, pad = { l: 72, r: 38, t: 30, b: 54 };
  const years = data.years || [2020, 2021, 2022, 2023, 2024, 2025];
  const names = [resolveBank(state.target), ...state.peers.map(resolveBank)];
  const typeNames = state.types.map((type) => `${type}均值`);
  const series = [
    ...names.map((bank) => ({ name: bank, kind: bank === resolveBank(state.target) ? "target" : "peer", values: years.map((year) => records.find((r) => r.bank === bank && r.year === year)?.[metric]) })),
    ...state.types.map((type) => ({ name: `${type}均值`, kind: "type", values: years.map((year) => avg(records.filter((r) => r.year === year && r.type === type), metric)) }))
  ].filter((s) => s.values.some((v) => typeof v === "number"));
  const vals = series.flatMap((s) => s.values).filter((v) => typeof v === "number");
  if (!vals.length) return emptySvg("暂无足够趋势数据");
  const min = Math.min(...vals, 0), max = Math.max(...vals, 1);
  const span = max - min || 1;
  const sx = (i) => pad.l + i / (years.length - 1) * (width - pad.l - pad.r);
  const sy = (v) => height - pad.b - (v - min) / span * (height - pad.t - pad.b);
  const colors = { target: "#0099D8", peer: "#F59E0B", type: "#7ED0F0" };
  const lines = series.map((s, idx) => {
    const pts = s.values.map((v, i) => typeof v === "number" ? `${sx(i)},${sy(v)}` : null).filter(Boolean).join(" ");
    const dash = s.kind === "type" ? ' stroke-dasharray="6 5"' : "";
    const widthLine = s.kind === "target" ? 4 : 2.5;
    const opacity = s.kind === "target" ? 1 : s.kind === "peer" ? .85 : .65;
    return `<polyline points="${pts}" fill="none" stroke="${colors[s.kind]}" stroke-width="${widthLine}" opacity="${opacity}"${dash}/>
      ${s.values.map((v, i) => typeof v === "number" ? `<circle cx="${sx(i)}" cy="${sy(v)}" r="${s.kind === "target" ? 5 : 3.5}" fill="${colors[s.kind]}" opacity="${opacity}"/>` : "").join("")}
      <text x="${width - pad.r - 150}" y="${pad.t + idx * 18 + 10}" fill="${colors[s.kind]}" font-size="12" font-weight="700">${displayBankName(s.name)}</text>`;
  }).join("");
  const yearLabels = years.map((y, i) => `<text x="${sx(i)}" y="${height - 24}" text-anchor="middle" fill="#667789" font-size="12">${y}</text>`).join("");
  return svg(width, height, `<rect width="${width}" height="${height}" fill="#fff"/><line x1="${pad.l}" x2="${pad.l}" y1="${pad.t}" y2="${height - pad.b}" stroke="#8796a4" stroke-width="2"/><line x1="${pad.l}" x2="${width - pad.r}" y1="${height - pad.b}" y2="${height - pad.b}" stroke="#8796a4" stroke-width="2"/>${lines}${yearLabels}<text x="${width / 2}" y="${height - 6}" text-anchor="middle" fill="#333" font-size="14" font-weight="700">${titleText || metricLabel[metric] || metric}</text>`);
}

function trajectoryFocusChart(xKey, yKey, titleText) {
  const width = 920, height = 420, pad = { l: 88, r: 40, t: 30, b: 58 };
  const years = [Math.max(2020, state.year - 1), state.year];
  const rows = focusRows([xKey, yKey]).filter((r) => !r.isTypeAverage || true);
  const points = [];
  const allVals = [];
  rows.forEach((r) => {
    const bank = r.isTypeAverage ? r.bank : r.bank;
    const recs = r.isTypeAverage
      ? years.map((year) => {
          const group = records.filter((item) => item.year === year && item.type === r.type);
          return { bank, [xKey]: avg(group, xKey), [yKey]: avg(group, yKey), isTypeAverage: true };
        })
      : years.map((year) => records.find((item) => item.bank === bank && item.year === year));
    const a = recs[0], b = recs[1];
    if (a && b && typeof a[xKey] === "number" && typeof a[yKey] === "number" && typeof b[xKey] === "number" && typeof b[yKey] === "number") {
      points.push({ bank, a, b, isTarget: bank === resolveBank(state.target), isType: r.isTypeAverage });
      allVals.push(a[xKey], b[xKey], a[yKey], b[yKey]);
    }
  });
  if (!points.length) return emptySvg("暂无足够轨迹数据");
  const xVals = points.flatMap((p) => [p.a[xKey], p.b[xKey]]);
  const yVals = points.flatMap((p) => [p.a[yKey], p.b[yKey]]);
  let minX = Math.min(...xVals, 0), maxX = Math.max(...xVals, 1), minY = Math.min(...yVals, 0), maxY = Math.max(...yVals, 1);
  const spanX = maxX - minX || 1, spanY = maxY - minY || 1;
  minX -= spanX * .12; maxX += spanX * .12; minY -= spanY * .12; maxY += spanY * .12;
  const sx = (v) => pad.l + (v - minX) / (maxX - minX) * (width - pad.l - pad.r);
  const sy = (v) => height - pad.b - (v - minY) / (maxY - minY) * (height - pad.t - pad.b);
  const body = points.map((p) => {
    const color = p.isTarget ? "#0099D8" : p.isType ? "#7ED0F0" : "#F59E0B";
    const dash = p.isType ? ' stroke-dasharray="6 5"' : "";
    return `<line x1="${sx(p.a[xKey])}" y1="${sy(p.a[yKey])}" x2="${sx(p.b[xKey])}" y2="${sy(p.b[yKey])}" stroke="${color}" stroke-width="${p.isTarget ? 4 : 2.5}" opacity=".85"${dash}/>
      <circle cx="${sx(p.a[xKey])}" cy="${sy(p.a[yKey])}" r="4" fill="#A6B0BE"/>
      <circle cx="${sx(p.b[xKey])}" cy="${sy(p.b[yKey])}" r="${p.isTarget ? 7 : 5}" fill="${color}"/>
      <text x="${sx(p.b[xKey]) + 8}" y="${sy(p.b[yKey]) - 6}" fill="${p.isTarget ? "#EF4444" : "#061B3A"}" font-size="12" font-weight="700">${displayBankName(p.bank)}</text>`;
  }).join("");
  return svg(width, height, `<rect width="${width}" height="${height}" fill="#fff"/><line x1="${pad.l}" x2="${pad.l}" y1="${pad.t}" y2="${height - pad.b}" stroke="#8796a4" stroke-width="2"/><line x1="${pad.l}" x2="${width - pad.r}" y1="${height - pad.b}" y2="${height - pad.b}" stroke="#8796a4" stroke-width="2"/>${body}<text x="${width / 2}" y="${height - 18}" text-anchor="middle" fill="#333" font-size="14" font-weight="700">${metricLabel[xKey]}</text><text x="24" y="${height / 2}" transform="rotate(-90 24 ${height / 2})" text-anchor="middle" fill="#333" font-size="14" font-weight="700">${metricLabel[yKey]}</text><text x="${pad.l}" y="18" fill="#667789" font-size="12" font-weight="700">${years[0]} → ${years[1]} 轨迹，终点为当前年份</text>`);
}

function multiMetricFocusChart(metrics, titleText) {
  const width = 920, height = 420, pad = { l: 170, r: 40, t: 38, b: 64 };
  const rows = focusRows(metrics).filter((r) => metrics.some((m) => typeof r[m] === "number"));
  if (!rows.length) return emptySvg("暂无足够对比数据");
  const vals = rows.flatMap((r) => metrics.map((m) => r[m])).filter((v) => typeof v === "number");
  const min = Math.min(...vals, 0), max = Math.max(...vals, 1);
  const span = max - min || 1;
  const groupW = (width - pad.l - pad.r) / rows.length;
  const barW = Math.max(10, groupW / (metrics.length + 1));
  const zero = height - pad.b - (0 - min) / span * (height - pad.t - pad.b);
  const colors = ["#061B3A", "#0099D8", "#F59E0B", "#7ED0F0"];
  const bars = rows.map((r, ri) => metrics.map((m, mi) => {
    const v = r[m];
    if (typeof v !== "number") return "";
    const x = pad.l + ri * groupW + mi * barW + 8;
    const y = height - pad.b - (v - min) / span * (height - pad.t - pad.b);
    const h = Math.abs(y - zero);
    const top = v >= 0 ? y : zero;
    return `<rect x="${x}" y="${top}" width="${barW * .82}" height="${Math.max(2, h)}" fill="${colors[mi % colors.length]}" opacity="${r.isTypeAverage ? .46 : .9}"/>`;
  }).join("") + `<text x="${pad.l + ri * groupW + groupW / 2}" y="${height - 36}" text-anchor="middle" fill="#061B3A" font-size="11" font-weight="700">${displayBankName(r.bank)}</text>`).join("");
  const legend = metrics.map((m, i) => `<rect x="${pad.l + i * 150}" y="12" width="12" height="12" fill="${colors[i % colors.length]}"/><text x="${pad.l + i * 150 + 18}" y="23" fill="#061B3A" font-size="12" font-weight="700">${metricLabel[m] || m}</text>`).join("");
  return svg(width, height, `<rect width="${width}" height="${height}" fill="#fff"/>${legend}<line x1="${pad.l}" x2="${width - pad.r}" y1="${zero}" y2="${zero}" stroke="#9aa8b4" stroke-width="2"/>${bars}<text x="${width / 2}" y="${height - 8}" text-anchor="middle" fill="#333" font-size="14" font-weight="700">${titleText}</text>`);
}

function benchmarkSampleSummary(key = "nim", peers = peerRecords()) {
  const numeric = (row) => row?.[key] != null && Number.isFinite(Number(row[key]));
  const typeRows = currentRecords().filter((row) => state.types.includes(row.type));
  return {
    peerN: peers.filter(numeric).length,
    typeN: typeRows.filter(numeric).length,
    allN: currentRecords().filter(numeric).length
  };
}

function benchmarkLineChart(key = "nim", opts = {}) {
  const width = 920, height = 260, pad = { l: 70, r: 70, t: 44, b: 74 };
  const row = targetRecord();
  const peers = peerRecords();
  const targetValue = row?.[key];
  const lines = typeof benchmarkLinesForMetric === "function" ? benchmarkLinesForMetric(key, peers) : [];
  const values = [targetValue, ...lines.map((line) => line.value)].filter((value) => Number.isFinite(Number(value)));
  if (!row || !Number.isFinite(Number(targetValue)) || values.length < 2) return emptySvg("暂无足够多基准线数据");
  const min = Math.min(...values);
  const max = Math.max(...values);
  const span = max - min || 1;
  const sx = (value) => pad.l + (Number(value) - min) / span * (width - pad.l - pad.r);
  const colors = { peer: "#F59E0B", peerMedian: "#f97316", type: "#061B3A", all: "#64748b", regulatory: "#ef4444" };
  const axisTicks = Array.from({ length: 5 }, (_, index) => {
    const value = min + span * index / 4;
    const x = sx(value);
    return `<line x1="${x}" x2="${x}" y1="${pad.t + 16}" y2="${height - pad.b + 8}" stroke="#edf2f7"/><text x="${x}" y="${height - 36}" text-anchor="middle" fill="#64748b" font-size="11">${metricDisplayValue(key, value)}</text>`;
  }).join("");
  const lineMarks = lines.slice(0, 8).map((line, index) => {
    const x = sx(line.value);
    const color = colors[line.kind] || "#64748b";
    const y = pad.t + 24 + (index % 2) * 42;
    return `<g class="benchmark-line-mark kind-${line.kind}">
      <line x1="${x}" x2="${x}" y1="${pad.t + 8}" y2="${height - pad.b}" stroke="${color}" stroke-width="2" stroke-dasharray="${line.kind === "regulatory" ? "0" : "5 4"}"/>
      <circle cx="${x}" cy="${y}" r="5" fill="${color}"/>
      <text x="${x + 8}" y="${y - 4}" fill="${color}" font-size="12" font-weight="800">${line.label}</text>
      <text x="${x + 8}" y="${y + 12}" fill="#334155" font-size="11" font-weight="700">${metricDisplayValue(key, line.value)}</text>
    </g>`;
  }).join("");
  const targetX = sx(targetValue);
  const sample = benchmarkSampleSummary(key, peers);
  const title = opts.title || `${displayBankName(row.bank)} ${fieldName(key)}多基准线`;
  return svg(width, height, `
    <rect width="${width}" height="${height}" fill="#fff"/>
    <g class="benchmark-line-chart">
      <text x="${pad.l}" y="24" fill="#061B3A" font-size="15" font-weight="900">${title}</text>
      <text x="${width - pad.r}" y="24" text-anchor="end" fill="#64748b" font-size="12" font-weight="800">样本N：对标组N=${sample.peerN}｜类型N=${sample.typeN}｜全样本N=${sample.allN}</text>
      ${axisTicks}
      <line x1="${pad.l}" x2="${width - pad.r}" y1="${height - pad.b}" y2="${height - pad.b}" stroke="#94a3b8" stroke-width="2"/>
      ${lineMarks}
      <g class="benchmark-target">
        <line x1="${targetX}" x2="${targetX}" y1="${pad.t}" y2="${height - pad.b + 14}" stroke="#0099D8" stroke-width="4"/>
        <rect x="${targetX - 46}" y="${height - pad.b + 17}" width="92" height="24" fill="#0099D8"/>
        <text x="${targetX}" y="${height - pad.b + 33}" text-anchor="middle" fill="#fff" font-size="12" font-weight="900">目标银行 ${metricDisplayValue(key, targetValue)}</text>
      </g>
    </g>`);
}

function emptySvg(text) {
  return svg(920, 420, `<rect width="920" height="420" fill="#f8fbfd"/><text x="460" y="210" text-anchor="middle" fill="#718096" font-size="18" font-weight="700">${text}</text>`);
}

function chartForTitle(title) {
  const rows = chartRecords();
  const registry = [
    ["图1-1", () => focusTrendChart("earningAssetYield", "生息资产收益率五年趋势")],
    ["图1-2", () => stackedIncomeChart()],
    ["图2-1", () => trajectoryFocusChart("coreRevenueGrowth", "revenueGrowth", "核心营收与总营收两年轨迹")],
    ["图2-2A", () => trajectoryFocusChart("feeAssetRatio", "coreRevenueGrowth", "轻资本协同两年轨迹")],
    ["图2-2B", () => multiMetricFocusChart(["feeAssetRatio", "coreRevenueGrowth", "ppopGrowth"], "手续费、核心营收与拨备前利润三联对比")],
    ["图2-4", () => axisChart(rows, "feeAssetRatio", "coreRevenueGrowth")],
    ["图2-5A", () => bridgeChart()],
    ["图2-5B", () => focusTrendChart("roa", "总资产收益率五年变化路径")],
    ["图2-6", () => multiMetricFocusChart(["roa", "feeAssetRatio", "costIncomeRatio"], "回报、中收与成本三指标对比")],
    ["真实非息", () => multiMetricFocusChart(["trueCoreNonInterest", "volatileIncomeShare", "feeRevenueShare"], "真实非息、高波动收入与手续费占比")],
    ["现金利润", () => multiMetricFocusChart(["cashProfitRatio", "adminAssetRatio", "coreRevenueGrowth"], "现金含量、费用刚性与主业修复")],
    ["图3-1", () => multiMetricFocusChart(["nim", "earningAssetYield", "interestLiabilityCost"], "净息差、资产收益率与负债成本联动")],
    ["图3-2", () => focusBarChart("timeDepositShare", { digits: 1 })],
    ["图3-3", () => multiMetricFocusChart(["nim", "earningAssetYield", "interestLiabilityCost"], "净息差、资产收益率与负债成本联动")],
    ["图3-4", () => loanYieldQualityChart()],
    ["图3-5", () => loanYieldQualityChart()],
    ["图3-6", () => multiMetricFocusChart(["nimGapBp", "earningAssetYield", "npl"], "息差缺口、资产收益与风险成本联动")],
    ["图3-7", () => loanYieldQualityChart()],
    ["真实存贷利差", () => multiMetricFocusChart(["realLoanDepositSpread", "nimGapPoint", "nim"], "真实存贷利差、NIM缺口与净息差")],
    ["活期沉淀", () => multiMetricFocusChart(["corporateDemandDepositShare", "personalDemandDepositShare", "timeDepositShare"], "活期沉淀与定期化结构")],
    ["图4-1", () => axisChart(rows, "npl", "personalLoanNpl")],
    ["图4-2", () => dumbbellChart("overdueNplDeviation")],
    ["图4-3", () => multiMetricFocusChart(["overdueNplDeviation", "specialMentionRatio", "npl"], "偏离度、关注率与不良率联动")],
    ["图4-4", () => axisChart(rows, "profitPpopGap", "provisionCoverage")],
    ["图4-5", () => axisChart(rows, "overdueNplDeviation", "provisionCoverage")],
    ["图4-6", () => heatmapChart()],
    ["零售分产品", () => multiMetricFocusChart(["housingLoanNpl", "consumerLoanNpl", "businessLoanNpl"], "零售分产品不良率拆解")],
    ["隐性不良", () => axisChart(rows, "hiddenNplExposure", "overdueNplDeviation")],
    ["图5-1", () => axisChart(rows, "rwaDensity", "cet1Buffer")],
    ["图5-2", () => multiMetricFocusChart(["cet1Buffer", "rwaDensity"], "资本余量与风险加权资产密度")],
    ["图5-3", () => focusBarChart("rwaDensity", { digits: 1 })],
    ["图5-4", () => multiMetricFocusChart(["costIncomeRatio", "feeAssetRatio", "coreRevenueGrowth"], "成本刚性、轻收入密度与主业修复")],
    ["图5-5", () => axisChart(rows, "costIncomeRatio", "feeAssetRatio")],
    ["市净率验证", () => axisChart(rows, "pb", "roa")]
    ,["RWA增速", () => multiMetricFocusChart(["estimatedRwaGrowth", "netProfitGrowth", "assetGrowth"], "RWA增速、利润增速与资产增速")]
    ,["投资资产", () => multiMetricFocusChart(["bondAssetRatio", "fundAssetRatio", "trustWmAssetRatio"], "投资资产波动暴露")]
    ,["多基准线", () => benchmarkLineChart("nim")]
  ];
  const hit = registry.find(([key]) => title.includes(key));
  if (hit) return hit[1]();
  if (title.includes("LPR") || title.includes("生息资产收益率")) return focusTrendChart("earningAssetYield", "生息资产收益率五年趋势");
  if (title.includes("收入结构")) return stackedIncomeChart();
  if (title.includes("核心与非核心")) return trajectoryFocusChart("coreRevenueGrowth", "revenueGrowth", "核心营收与总营收两年轨迹");
  if (title.includes("轻资本协同两年")) return trajectoryFocusChart("feeAssetRatio", "coreRevenueGrowth", "轻资本协同两年轨迹");
  if (title.includes("四类银行三联")) return multiMetricFocusChart(["feeAssetRatio", "coreRevenueGrowth", "ppopGrowth"], "手续费、核心营收与拨备前利润三联对比");
  if (title.includes("手续费")) return axisChart(rows, "feeAssetRatio", "coreRevenueGrowth");
  if (title.includes("当年支撑")) return bridgeChart();
  if (title.includes("五年变化路径")) return focusTrendChart("roa", "总资产收益率五年变化路径");
  if (title.includes("五区域")) return multiMetricFocusChart(["roa", "feeAssetRatio", "costIncomeRatio"], "回报、中收与成本三指标对比");
  if (title.includes("真实非息")) return multiMetricFocusChart(["trueCoreNonInterest", "volatileIncomeShare", "feeRevenueShare"], "真实非息、高波动收入与手续费占比");
  if (title.includes("现金利润")) return multiMetricFocusChart(["cashProfitRatio", "adminAssetRatio", "coreRevenueGrowth"], "现金含量、费用刚性与主业修复");
  if (title.includes("息差对冲") || title.includes("缺口")) return multiMetricFocusChart(["nim", "earningAssetYield", "interestLiabilityCost"], "净息差、资产收益率与负债成本联动");
  if (title.includes("存款结构") || title.includes("定期")) return focusBarChart("timeDepositShare", { digits: 1 });
  if (title.includes("真实存贷利差")) return multiMetricFocusChart(["realLoanDepositSpread", "nimGapPoint", "nim"], "真实存贷利差、NIM缺口与净息差");
  if (title.includes("活期沉淀")) return multiMetricFocusChart(["corporateDemandDepositShare", "personalDemandDepositShare", "timeDepositShare"], "活期沉淀与定期化结构");
  if (title.includes("负债成本")) return multiMetricFocusChart(["interestLiabilityCost", "nimGapBp"], "负债成本与息差缺口对照");
  if (title.includes("收益成色") || title.includes("名义收益") || title.includes("票面")) return loanYieldQualityChart();
  if (title.includes("零售")) return axisChart(rows, "npl", "personalLoanNpl");
  if (title.includes("偏离度哑铃")) return dumbbellChart("overdueNplDeviation");
  if (title.includes("关注率轨迹")) return multiMetricFocusChart(["overdueNplDeviation", "specialMentionRatio", "npl"], "偏离度、关注率与不良率联动");
  if (title.includes("偏离")) return axisChart(rows, "overdueNplDeviation", "provisionCoverage");
  if (title.includes("利润质量")) return axisChart(rows, "profitPpopGap", "provisionCoverage");
  if (title.includes("风险缓冲") || title.includes("热力")) return heatmapChart();
  if (title.includes("零售分产品")) return multiMetricFocusChart(["housingLoanNpl", "consumerLoanNpl", "businessLoanNpl"], "零售分产品不良率拆解");
  if (title.includes("隐性不良")) return axisChart(rows, "hiddenNplExposure", "overdueNplDeviation");
  if (title.includes("资本效率")) return axisChart(rows, "rwaDensity", "cet1Buffer");
  if (title.includes("资本余量")) return multiMetricFocusChart(["cet1Buffer", "rwaDensity"], "资本余量与风险加权资产密度");
  if (title.includes("资本压力")) return focusBarChart("rwaDensity", { digits: 1 });
  if (title.includes("三指标对比")) return multiMetricFocusChart(["costIncomeRatio", "feeAssetRatio", "coreRevenueGrowth"], "成本刚性、轻收入密度与主业修复");
  if (title.includes("成本")) return axisChart(rows, "costIncomeRatio", "feeAssetRatio");
  if (title.includes("市净率")) return axisChart(rows, "pb", "roa");
  if (title.includes("RWA增速")) return multiMetricFocusChart(["estimatedRwaGrowth", "netProfitGrowth", "assetGrowth"], "RWA增速、利润增速与资产增速");
  if (title.includes("投资资产")) return multiMetricFocusChart(["bondAssetRatio", "fundAssetRatio", "trustWmAssetRatio"], "投资资产波动暴露");
  if (title.includes("多基准线")) return benchmarkLineChart("nim");
  return axisChart(rows, "coreRevenueGrowth", "roa");
}

function replaceFigureImages() {
  document.querySelectorAll(".figure-thumb").forEach((card) => {
    const title = card.dataset.originalTitle || card.querySelector("b")?.textContent || "";
    let holder = card.querySelector(".dynamic-chart");
    const img = card.querySelector("img");
    if (!holder) {
      holder = document.createElement("div");
      holder.className = "dynamic-chart";
      holder.style.height = "430px";
      holder.style.border = "1px solid #edf1f5";
      holder.style.background = "#fff";
      if (img) img.replaceWith(holder);
      else card.prepend(holder);
    }
    holder.innerHTML = chartForTitle(title);
  });
}

function renderMainCharts() {
  document.querySelectorAll(".main-dynamic-chart").forEach((el) => {
    const kind = el.dataset.chart;
    const rows = chartRecords();
    if (kind === "profitQuality") {
      el.innerHTML = axisChart(rows, "profitPpopGap", "provisionCoverage");
    } else if (kind === "nimGapRank") {
      el.innerHTML = multiMetricFocusChart(["nim", "earningAssetYield", "interestLiabilityCost"], "净息差、资产收益率与负债成本联动");
    } else if (kind === "riskPosition") {
      el.innerHTML = axisChart(rows, "overdueNplDeviation", "provisionCoverage");
    } else if (kind === "capitalEfficiency") {
      el.innerHTML = axisChart(rows, "rwaDensity", "cet1Buffer");
    } else if (kind === "pbQuality") {
      el.innerHTML = axisChart(rows, "pb", "roa");
    } else if (kind === "benchmarkLine") {
      el.innerHTML = benchmarkLineChart(el.dataset.metric || "nim");
    }
  });
}

function chartAnnotationText(title, row = targetRecord()) {
  const target = displayBankName(row?.bank || state.target);
  if (/净利润|盈利|ROA|ROE|利润/.test(title)) return `${target}本图先看利润结果，再回到核心营收、费用和拨备节奏验证，避免把净利润变化直接等同于主业修复。`;
  if (/息差|NIM|负债|存款|贷款|利差/.test(title)) return `${target}本图需要把资产收益率和负债成本分开读，避免只看净息差终值。`;
  if (/风险|不良|拨备|逾期|零售/.test(title)) return `${target}本图要同时观察风险暴露和风险缓冲，避免单一不良率误判。`;
  if (/PB|估值|市净率|资本市场/.test(title)) return `${target}本图把估值差异回收到经营质量、资本效率和风险确认，判断低估值是价值错配还是质量折价。`;
  if (/资本|RWA|核心一级/.test(title)) return `${target}本图要同时看资本余量和风险加权资产消耗，判断扩表是否仍在创造价值。`;
  return `${target}本图结论以选定目标银行、对标组和类型均值为边界，后续应回到数据口径复核。`;
}

function narrativeFor(title) {
  return aiStyleEvaluation(title);
}

function updateFigureExplanations() {
  document.querySelectorAll(".figure-thumb, .chart-card").forEach((card) => {
    const title = card.querySelector(".chart-title, b")?.textContent?.trim() || "";
    if (!title) return;
    let explain = card.querySelector(".figure-explain");
    if (!explain) {
      explain = document.createElement("div");
      explain.className = "figure-explain";
      card.appendChild(explain);
    }
    explain.innerHTML = typeof explanationHtml === "function" ? explanationHtml(title) : "";
  });
  if (typeof bindChartStoryEditors === "function") bindChartStoryEditors(document);
  if (typeof bindMetricLinks === "function") bindMetricLinks(document);
}

function explanationHtml(title) {
  const n = narrativeFor(title);
  const facts = chartFactPack(title);
  const blocks = ["本图判断", "目标银行解读", "对标银行解读", "类型均值参照", "管理建议"];
  const values = [chartQuestion(title), n.target, n.peers, n.type || typeBenchmarkNarrative(title), n.action];
  return blocks.map((block, idx) => `<div><b>${block}</b>${values[idx] || ""}</div>`).join("")
    + `<div class="fact-pack"><b>关键事实包</b>${facts.brief}</div>`;
}
