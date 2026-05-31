/* Bank VQA module: 25-v4-deep-dive.js */
function v4Num(value) {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function v4Mean(values) {
  const nums = values.filter((value) => v4Num(value) !== null);
  return nums.length ? nums.reduce((sum, value) => sum + value, 0) / nums.length : null;
}

function v4Std(values) {
  const nums = values.filter((value) => v4Num(value) !== null);
  if (nums.length < 2) return 1;
  const mean = v4Mean(nums);
  const variance = v4Mean(nums.map((value) => (value - mean) ** 2));
  return variance ? Math.sqrt(variance) : 1;
}

function v4MetricText(key, value) {
  return typeof metricDisplayValue === "function" ? metricDisplayValue(key, value) : fmt(value);
}

function v4MetricLabel(key) {
  return analysisRules?.metrics?.[key]?.label || key;
}

function v4Escape(value) {
  return String(value ?? "").replace(/[&<>"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "\"": "&quot;", "'": "&#39;" }[char]));
}

function v4SolveLinearSystem(matrix, vector) {
  const n = vector.length;
  const aug = matrix.map((row, i) => [...row, vector[i]]);
  for (let col = 0; col < n; col += 1) {
    let pivot = col;
    for (let row = col + 1; row < n; row += 1) {
      if (Math.abs(aug[row][col]) > Math.abs(aug[pivot][col])) pivot = row;
    }
    if (Math.abs(aug[pivot][col]) < 1e-8) return null;
    [aug[col], aug[pivot]] = [aug[pivot], aug[col]];
    const base = aug[col][col];
    for (let j = col; j <= n; j += 1) aug[col][j] /= base;
    for (let row = 0; row < n; row += 1) {
      if (row === col) continue;
      const factor = aug[row][col];
      for (let j = col; j <= n; j += 1) aug[row][j] -= factor * aug[col][j];
    }
  }
  return aug.map((row) => row[n]);
}

function v4PbAttribution(row = targetRecord(), peers = peerRecords()) {
  if (!row) return null;
  const factors = [
    { key: "roe", label: "ROE" },
    { key: "npl", label: "不良率", invert: true },
    { key: "costIncomeRatio", label: "成本收入比", invert: true },
    { key: "provisionCoverage", label: "拨备覆盖率" },
    { key: "cet1Buffer", label: "CET1余量" }
  ];
  const universe = currentRecords().filter((item) => v4Num(item.pb) !== null && factors.every((factor) => v4Num(item[factor.key]) !== null));
  const basis = universe.length >= factors.length + 3 ? universe : [row, ...peers].filter((item) => item && v4Num(item.pb) !== null);
  if (basis.length < 3 || v4Num(row.pb) === null) return null;
  const stats = Object.fromEntries(factors.map((factor) => [factor.key, {
    mean: v4Mean(basis.map((item) => item[factor.key])),
    std: v4Std(basis.map((item) => item[factor.key]))
  }]));
  let coefficients = null;
  if (basis.length >= factors.length + 3 && factors.every((factor) => stats[factor.key].mean !== null)) {
    const x = basis.map((item) => [1, ...factors.map((factor) => (item[factor.key] - stats[factor.key].mean) / stats[factor.key].std)]);
    const y = basis.map((item) => item.pb);
    const xtx = x[0].map((_, i) => x[0].map((__, j) => v4Mean(x.map((rowX) => rowX[i] * rowX[j]))));
    const xty = x[0].map((_, i) => v4Mean(x.map((rowX, r) => rowX[i] * y[r])));
    coefficients = v4SolveLinearSystem(xtx, xty);
  }
  if (!coefficients) {
    coefficients = [v4Mean(basis.map((item) => item.pb)), 0.02, -0.02, -0.015, 0.015, 0.01];
  }
  const predict = (item) => coefficients[0] + factors.reduce((sum, factor, i) => {
    if (v4Num(item[factor.key]) === null || stats[factor.key].mean === null) return sum;
    return sum + coefficients[i + 1] * ((item[factor.key] - stats[factor.key].mean) / stats[factor.key].std);
  }, 0);
  const fitted = predict(row);
  const rows = [row, ...peers].filter((item) => item && v4Num(item.pb) !== null).map((item) => ({
    bank: displayBankName(item.bank),
    actual: item.pb,
    fitted: predict(item),
    isTarget: item.bank === row.bank
  }));
  const drivers = factors.map((factor, i) => {
    const z = v4Num(row[factor.key]) === null || stats[factor.key].mean === null ? 0 : (row[factor.key] - stats[factor.key].mean) / stats[factor.key].std;
    const effect = coefficients[i + 1] * z;
    return { ...factor, z, effect };
  }).sort((a, b) => Math.abs(b.effect) - Math.abs(a.effect));
  return { actual: row.pb, fitted, residual: row.pb - fitted, drivers, rows };
}

function v4SvgPointScale(values, minOut, maxOut, pad = 0.1) {
  const nums = values.filter((value) => v4Num(value) !== null);
  const min = Math.min(...nums);
  const max = Math.max(...nums);
  const span = max - min || 1;
  return (value) => minOut + ((value - min + span * pad) / (span * (1 + pad * 2))) * (maxOut - minOut);
}

function v4PbAttributionChart(pack) {
  if (!pack?.rows?.length) return `<div class="v4-empty">PB 归因需要 PB、ROE、风险和效率指标。</div>`;
  const xs = pack.rows.map((item) => item.fitted);
  const ys = pack.rows.map((item) => item.actual);
  const sx = v4SvgPointScale(xs, 60, 520);
  const syRaw = v4SvgPointScale(ys, 250, 45);
  const points = pack.rows.map((item) => `<g><circle cx="${sx(item.fitted).toFixed(1)}" cy="${syRaw(item.actual).toFixed(1)}" r="${item.isTarget ? 8 : 5}" class="${item.isTarget ? "target" : "peer"}"></circle><text x="${(sx(item.fitted) + 8).toFixed(1)}" y="${(syRaw(item.actual) - 6).toFixed(1)}">${v4Escape(item.bank.replace("农村商业银行", "农商行").slice(0, 8))}</text></g>`).join("");
  return `<svg viewBox="0 0 580 300" role="img" aria-label="PB拟合归因散点"><line x1="60" y1="250" x2="520" y2="45" class="guide"></line>${points}<text x="60" y="286">拟合PB</text><text x="12" y="48">实际PB</text></svg>`;
}

function v4PbRoeQuadrant(row = targetRecord(), peers = peerRecords()) {
  const rows = [row, ...peers].filter((item) => item && v4Num(item.pb) !== null && v4Num(item.roe) !== null);
  if (rows.length < 2) return `<div class="v4-empty">PB-ROE 四象限需要 PB 和 ROE 数据。</div>`;
  const sx = v4SvgPointScale(rows.map((item) => item.roe), 60, 520);
  const sy = v4SvgPointScale(rows.map((item) => item.pb), 250, 45);
  const medRoe = v4Mean(rows.map((item) => item.roe));
  const medPb = v4Mean(rows.map((item) => item.pb));
  const points = rows.map((item) => `<g><circle cx="${sx(item.roe).toFixed(1)}" cy="${sy(item.pb).toFixed(1)}" r="${item.bank === row.bank ? 8 : 5}" class="${item.bank === row.bank ? "target" : "peer"}"></circle><text x="${(sx(item.roe) + 8).toFixed(1)}" y="${(sy(item.pb) - 6).toFixed(1)}">${v4Escape(displayBankName(item.bank).replace("农村商业银行", "农商行").slice(0, 8))}</text></g>`).join("");
  return `<svg viewBox="0 0 580 300" role="img" aria-label="PB ROE四象限"><line x1="${sx(medRoe).toFixed(1)}" y1="38" x2="${sx(medRoe).toFixed(1)}" y2="255" class="guide"></line><line x1="55" y1="${sy(medPb).toFixed(1)}" x2="530" y2="${sy(medPb).toFixed(1)}" class="guide"></line>${points}<text x="60" y="286">ROE</text><text x="12" y="48">PB</text></svg>`;
}

function v4RetailProductRows(row = targetRecord(), peers = peerRecords()) {
  const products = [
    ["住房按揭", "housingLoanShare", "housingLoanNpl"],
    ["消费贷款", "consumerLoanShare", "consumerLoanNpl"],
    ["经营贷款", "businessLoanShare", "businessLoanNpl"]
  ];
  return products.map(([name, shareKey, nplKey]) => {
    const share = v4Num(row?.[shareKey]);
    const npl = v4Num(row?.[nplKey]);
    const peerNpl = avg(peers, nplKey);
    const peerShare = avg(peers, shareKey);
    const shareChange = row ? yoyValue(row.bank, shareKey) : null;
    const nplChange = row ? yoyValue(row.bank, nplKey) : null;
    const highRisk = npl !== null && peerNpl !== null && npl > peerNpl;
    const expanding = shareChange !== null ? shareChange > 0 : share !== null && peerShare !== null && share > peerShare;
    return { name, shareKey, nplKey, share, npl, peerNpl, peerShare, shareChange, nplChange, level: highRisk && expanding ? "red" : highRisk ? "amber" : "green" };
  });
}

function v4RetailRiskMatrix(rows) {
  return `<table class="v4-heat-table"><thead><tr><th>产品</th><th>占比</th><th>不良率</th><th>对标不良</th><th>风险判断</th></tr></thead><tbody>${rows.map((item) => `<tr class="tone-${item.level}"><td>${item.name}</td><td>${v4MetricText(item.shareKey, item.share)}</td><td>${v4MetricText(item.nplKey, item.npl)}</td><td>${v4MetricText(item.nplKey, item.peerNpl)}</td><td>${item.level === "red" ? "高占比/高不良，优先拆客群" : item.level === "amber" ? "风险高于同业，复核迁徙" : "风险相对可控，关注定价"}</td></tr>`).join("")}</tbody></table>`;
}

function v4RetailScissorsChart(rows) {
  const valid = rows.filter((item) => v4Num(item.shareChange ?? item.share) !== null && v4Num(item.nplChange ?? item.npl) !== null);
  if (!valid.length) return `<div class="v4-empty">零售剪刀差需要产品占比和不良变化。</div>`;
  const sx = v4SvgPointScale(valid.map((item) => item.shareChange ?? item.share), 70, 520);
  const sy = v4SvgPointScale(valid.map((item) => item.nplChange ?? item.npl), 245, 50);
  const points = valid.map((item) => `<g><circle cx="${sx(item.shareChange ?? item.share).toFixed(1)}" cy="${sy(item.nplChange ?? item.npl).toFixed(1)}" r="8" class="${item.level}"></circle><text x="${(sx(item.shareChange ?? item.share) + 10).toFixed(1)}" y="${(sy(item.nplChange ?? item.npl) - 8).toFixed(1)}">${item.name}</text></g>`).join("");
  return `<svg viewBox="0 0 580 300" role="img" aria-label="零售风险剪刀差"><line x1="70" y1="248" x2="525" y2="248" class="axis"></line><line x1="70" y1="45" x2="70" y2="248" class="axis"></line>${points}<text x="70" y="286">占比变化/占比</text><text x="12" y="48">不良变化/不良率</text></svg>`;
}

function v4DepositLoanProfile(row = targetRecord(), peers = peerRecords()) {
  if (!row) return [];
  return [
    ["timeDepositShare", "定期存款占比"],
    ["demandDepositShare", "活期存款占比"],
    ["corporateDemandDepositShare", "对公活期占比"],
    ["earningAssetYield", "生息资产收益率"],
    ["interestLiabilityCost", "计息负债成本率"],
    ["realLoanDepositSpread", "真实存贷利差"]
  ].map(([key, label]) => ({ key, label, target: row[key], peer: avg(peers, key), change: yoyValue(row.bank, key) }));
}

function v4DepositStructureChart(row = targetRecord()) {
  if (!row) return "";
  const splitDemand = [row.corporateDemandDepositShare, row.personalDemandDepositShare].filter((value) => v4Num(value) !== null);
  const demand = v4Num(row.demandDepositShare) ?? (splitDemand.length ? splitDemand.reduce((sum, value) => sum + value, 0) : null);
  const time = v4Num(row.timeDepositShare);
  if (demand === null && time === null) return `<div class="v4-empty">存款结构需要活期和定期占比。</div>`;
  const demandValue = Math.max(0, demand ?? 0);
  const timeValue = Math.max(0, time ?? 0);
  const other = Math.max(0, 100 - demandValue - timeValue);
  const segments = [
    ["活期", demandValue, "blue"],
    ["定期", timeValue, "red"],
    ["其他", other, "gray"]
  ];
  return `<div class="v4-waterfall">${segments.map(([label, value, tone]) => `<div class="v4-waterfall-row"><span>${label}</span><div><i class="${tone}" style="width:${Math.min(100, value).toFixed(1)}%"></i></div><b>${fmt(value)}</b></div>`).join("")}</div>`;
}

function v4TimeDepositTrend(row = targetRecord(), peers = peerRecords()) {
  if (!row) return "";
  const own = series(row.bank).filter((item) => v4Num(item.timeDepositShare) !== null);
  if (own.length < 2) return `<div class="v4-empty">定期存款趋势需要至少两年数据。</div>`;
  const years = own.map((item) => item.year);
  const peerByYear = years.map((year) => v4Mean(peers.map((peer) => latest(peer.bank, year)?.timeDepositShare)));
  const values = [...own.map((item) => item.timeDepositShare), ...peerByYear].filter((value) => v4Num(value) !== null);
  const sx = v4SvgPointScale(years, 60, 520, 0);
  const sy = v4SvgPointScale(values, 245, 45);
  const line = own.map((item) => `${sx(item.year).toFixed(1)},${sy(item.timeDepositShare).toFixed(1)}`).join(" ");
  const peerLine = years.map((year, i) => peerByYear[i] === null ? null : `${sx(year).toFixed(1)},${sy(peerByYear[i]).toFixed(1)}`).filter(Boolean).join(" ");
  return `<svg viewBox="0 0 580 300" role="img" aria-label="定期存款趋势"><polyline points="${line}" class="target-line"></polyline><polyline points="${peerLine}" class="peer-line"></polyline>${own.map((item) => `<text x="${sx(item.year).toFixed(1)}" y="275">${item.year}</text>`).join("")}<text x="60" y="32">目标银行</text><text x="160" y="32" class="muted">对标均值</text></svg>`;
}

function v4YieldQualityCards(rows) {
  return `<div class="v4-bridge-grid">${rows.map((item) => `<div class="v4-bridge-card"><span>${item.label}</span><b>${v4MetricText(item.key, item.target)}</b><p>对标 ${v4MetricText(item.key, item.peer)}｜同比 ${v4MetricText(item.key, item.change)}</p></div>`).join("")}</div>`;
}

function v4TopicDeepDiveHtml(topicId) {
  const row = targetRecord();
  if (!row || !["capitalMarket", "retailRisk", "depositLoanDeepDive"].includes(topicId)) return "";
  if (topicId === "capitalMarket") {
    const pack = v4PbAttribution(row, peerRecords());
    const driver = pack?.drivers?.[0];
    return `<div class="v4-deep-dive-panel"><div class="v4-deep-head"><span>专题深钻</span><h4>PB 归因把估值折价拆到可管理因子</h4><p>${driver ? `当前最大解释因子为${driver.label}，对 PB 拟合贡献约 ${driver.effect.toFixed(2)}x；实际 PB ${v4MetricText("pb", pack.actual)}，拟合 PB ${v4MetricText("pb", pack.fitted)}。` : "当前 PB 归因数据不足，建议补齐 ROE、风险和效率指标。"}</p></div><div class="v4-deep-grid"><div class="v4-chart-card" data-chart-title="PB拟合归因">${v4PbAttributionChart(pack)}</div><div class="v4-chart-card" data-chart-title="PB-ROE四象限">${v4PbRoeQuadrant(row, peerRecords())}</div></div></div>`;
  }
  if (topicId === "retailRisk") {
    const rows = v4RetailProductRows(row, peerRecords());
    return `<div class="v4-deep-dive-panel"><div class="v4-deep-head"><span>专题深钻</span><h4>零售风险按产品拆解，而不是只看个贷不良率</h4><p>矩阵同时观察占比、不良率和同业均值，优先处理高占比且高不良的产品。</p></div><div class="v4-deep-grid"><div class="v4-chart-card" data-chart-title="零售产品风险矩阵">${v4RetailRiskMatrix(rows)}</div><div class="v4-chart-card" data-chart-title="零售风险剪刀差">${v4RetailScissorsChart(rows)}</div></div></div>`;
  }
  const profile = v4DepositLoanProfile(row, peerRecords());
  return `<div class="v4-deep-dive-panel"><div class="v4-deep-head"><span>专题深钻</span><h4>存贷结构深钻定位息差压力来源</h4><p>把负债期限结构、资产收益率和负债成本放在同一页，判断降本、定价和客群沉淀的优先级。</p></div><div class="v4-deep-grid"><div class="v4-chart-card" data-chart-title="存款结构瀑布">${v4DepositStructureChart(row)}</div><div class="v4-chart-card" data-chart-title="定期存款趋势">${v4TimeDepositTrend(row, peerRecords())}</div></div>${v4YieldQualityCards(profile)}</div>`;
}

function formalV4DeepDiveSections(row = targetRecord()) {
  if (!row) return "";
  return ["capitalMarket", "retailRisk", "depositLoanDeepDive"].map((topicId) => {
    const title = { capitalMarket: "PB归因与资本市场专题", retailRisk: "零售风险分产品专题", depositLoanDeepDive: "存贷结构深钻专题" }[topicId];
    return `<section class="formal-section formal-v4-section" id="formal-${topicId}"><div class="formal-section-kicker">专题深钻</div><h2>${title}</h2>${v4TopicDeepDiveHtml(topicId)}</section>`;
  }).join("");
}
