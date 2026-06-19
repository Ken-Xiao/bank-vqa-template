/* ===== Benchmark-first logic (js/60-benchmark-first-logic.js) ===== */
/* 读取全局数据（优先 window.benchmarkData / window.bankData / window.data），回退到确定性 mock */
(function () {
  'use strict';

  const METRICS = [
    { key: 'roe', name: 'ROE', unit: '%', higherIsBetter: true },
    { key: 'nim', name: 'NIM', unit: '%', higherIsBetter: true },
    { key: 'costIncome', name: '成本收入比', unit: '%', higherIsBetter: false },
    { key: 'npl', name: '不良率', unit: '%', higherIsBetter: false },
    { key: 'coverage', name: '拨备覆盖率', unit: '%', higherIsBetter: true },
    { key: 'depositCasa', name: '活期存款占比', unit: '%', higherIsBetter: true },
    { key: 'feeAsset', name: '手续费/资产', unit: '%', higherIsBetter: true },
    { key: 'pb', name: '市净率', unit: 'x', higherIsBetter: true },
  ];

  const BANK_TYPES = ['国有大行', '股份行', '城市商业银行', '农村商业银行'];
  const REGIONS = ['华东', '华北', '华南', '华中', '西南', '东北'];

  const MOCK_BANKS = [
    { name: '苏农银行', code: '603323.SH', type: '农村商业银行', region: '华东' },
    { name: '常熟农商行', code: '601128.SH', type: '农村商业银行', region: '华东' },
    { name: '瑞丰农商行', code: '601528.SH', type: '农村商业银行', region: '华东' },
    { name: '上海农商行', code: '601825.SH', type: '农村商业银行', region: '华东' },
    { name: '苏州银行', code: '002966.SZ', type: '城市商业银行', region: '华东' },
    { name: '宁波银行', code: '002142.SZ', type: '城市商业银行', region: '华东' },
    { name: '南京银行', code: '601009.SH', type: '城市商业银行', region: '华东' },
    { name: '杭州银行', code: '600926.SH', type: '城市商业银行', region: '华东' },
    { name: '招商银行', code: '600036.SH', type: '股份行', region: '华南' },
    { name: '平安银行', code: '000001.SZ', type: '股份行', region: '华南' },
    { name: '兴业银行', code: '601166.SH', type: '股份行', region: '华东' },
    { name: '工商银行', code: '601398.SH', type: '国有大行', region: '华北' },
    { name: '建设银行', code: '601939.SH', type: '国有大行', region: '华北' },
    { name: '农业银行', code: '601288.SH', type: '国有大行', region: '华北' },
    { name: '长沙银行', code: '601577.SH', type: '城市商业银行', region: '华中' },
    { name: '成都银行', code: '601838.SH', type: '城市商业银行', region: '西南' },
    { name: '重庆农商行', code: '601077.SH', type: '农村商业银行', region: '西南' },
    { name: '青岛银行', code: '002948.SZ', type: '城市商业银行', region: '华东' },
  ];

  function seededRandom(seed) {
    let x = Math.sin(seed) * 10000;
    return x - Math.floor(x);
  }
  function hash(str) {
    let h = 0;
    for (let i = 0; i < str.length; i++) h = (h << 5) - h + str.charCodeAt(i);
    return Math.abs(h);
  }
  function generateMetricValue(bank, metric, year) {
    const seed = hash(bank.name + metric.key + year);
    const r = seededRandom(seed);
    const base = {
      roe: bank.type === '国有大行' ? 10.5 : bank.type === '股份行' ? 11.2 : bank.type === '城市商业银行' ? 12.0 : 11.5,
      nim: bank.type === '国有大行' ? 1.65 : bank.type === '股份行' ? 1.95 : bank.type === '城市商业银行' ? 1.75 : 1.85,
      costIncome: bank.type === '国有大行' ? 28 : bank.type === '股份行' ? 32 : bank.type === '城市商业银行' ? 30 : 33,
      npl: bank.type === '国有大行' ? 1.25 : bank.type === '股份行' ? 1.18 : bank.type === '城市商业银行' ? 1.05 : 1.00,
      coverage: bank.type === '国有大行' ? 260 : bank.type === '股份行' ? 290 : bank.type === '城市商业银行' ? 320 : 360,
      depositCasa: bank.type === '国有大行' ? 42 : bank.type === '股份行' ? 38 : bank.type === '城市商业银行' ? 35 : 33,
      feeAsset: bank.type === '国有大行' ? 0.06 : bank.type === '股份行' ? 0.10 : bank.type === '城市商业银行' ? 0.07 : 0.05,
      pb: bank.type === '国有大行' ? 0.65 : bank.type === '股份行' ? 0.72 : bank.type === '城市商业银行' ? 0.78 : 0.74,
    }[metric.key];
    const trend = (year - 2020) * (metric.key === 'nim' ? -0.08 : metric.key === 'costIncome' ? 0.4 : metric.key === 'npl' ? 0.02 : metric.key === 'pb' ? -0.03 : 0.05);
    const regionShift = { 华东: 1.02, 华南: 1.01, 华北: 0.98, 华中: 0.99, 西南: 0.97, 东北: 0.95 }[bank.region] || 1;
    let val = (base + trend + (r - 0.5) * (base * 0.2)) * regionShift;
    if (metric.key === 'feeAsset') val = Math.max(0.01, val);
    return val;
  }

  function getRealData() {
    const bd = window.benchmarkData || window.bankData || (window.data && window.data.benchmark);
    if (bd && bd.banks && bd.banks.length) return bd;
    if (window.data && Array.isArray(window.data)) {
      const banks = window.data.filter(d => d.name && d.type).map(d => ({
        name: d.name,
        code: d.code || d.stock_code || '',
        type: d.type || d.bank_type || '城市商业银行',
        region: d.region || '华东',
        ...d
      }));
      if (banks.length) return { banks, metrics: METRICS };
    }
    return null;
  }

  function getBanks() {
    const real = getRealData();
    if (real && real.banks && real.banks.length) return real.banks;
    return MOCK_BANKS;
  }

  function getMetricValue(bank, metric, year) {
    if (bank[metric.key] !== undefined) {
      const v = bank[metric.key];
      if (typeof v === 'number') return v;
      if (typeof v === 'object' && v[year] !== undefined) return parseFloat(v[year]);
    }
    return generateMetricValue(bank, metric, year);
  }

  const state = {
    target: null,
    snapshotYear: 2025,
    trendStart: 2020,
    trendEnd: 2025,
    peers: { nationalType: true, regionType: true, nationalOther: false, custom: [] },
    facts: [],
    factPackOpen: false,
  };

  function getActiveSample() {
    const banks = getBanks();
    const target = state.target;
    if (!target) return null;
    const sample = [{ name: target.name, isTarget: true }];
    if (state.peers.nationalType) sample.push({ name: `全国${target.type}均值`, isAvg: true, avgType: 'nationalType' });
    if (state.peers.regionType) sample.push({ name: `${target.region}${target.type}均值`, isAvg: true, avgType: 'regionType' });
    state.peers.custom.forEach(name => { if (name !== target.name) sample.push({ name, isPeer: true }); });
    return sample;
  }

  function getMetricValueForSample(member, metric, year) {
    const banks = getBanks();
    if (member.isAvg) {
      const pool = banks.filter(b => {
        if (member.avgType === 'nationalType') return b.type === state.target.type;
        if (member.avgType === 'regionType') return b.type === state.target.type && b.region === state.target.region;
        return false;
      });
      if (!pool.length) return 0;
      const sum = pool.reduce((acc, b) => acc + getMetricValue(b, metric, year), 0);
      return sum / pool.length;
    }
    if (member.isTarget) return getMetricValue(state.target, metric, year);
    const bank = banks.find(b => b.name === member.name);
    if (!bank) return 0;
    return getMetricValue(bank, metric, year);
  }

  function formatValue(val, metric) {
    if (metric.unit === '%') return val.toFixed(metric.key === 'feeAsset' ? 3 : metric.key === 'npl' ? 2 : 1) + '%';
    if (metric.unit === 'x') return val.toFixed(2) + 'x';
    return val.toFixed(1);
  }

  function pearson(a, b) {
    const n = a.length;
    const sumA = a.reduce((x, y) => x + y, 0);
    const sumB = b.reduce((x, y) => x + y, 0);
    const sumAA = a.reduce((x, y) => x + y * y, 0);
    const sumBB = b.reduce((x, y) => x + y * y, 0);
    const sumAB = a.reduce((x, y, i) => x + y * b[i], 0);
    const num = n * sumAB - sumA * sumB;
    const den = Math.sqrt((n * sumAA - sumA * sumA) * (n * sumBB - sumB * sumB));
    return den === 0 ? 0 : Math.max(-1, Math.min(1, num / den));
  }

  function significance(r, n) {
    if (n < 4) return '';
    const t = r * Math.sqrt((n - 2) / (1 - r * r));
    const absT = Math.abs(t);
    if (absT > 2.576) return '***';
    if (absT > 1.96) return '**';
    if (absT > 1.645) return '*';
    return '';
  }

  function correlationColor(r, diag) {
    if (diag) return '#e6eaef';
    const abs = Math.abs(r);
    if (r >= 0) {
      const alpha = 0.08 + abs * 0.82;
      return `rgba(26, 58, 92, ${alpha.toFixed(2)})`;
    } else {
      const alpha = 0.08 + abs * 0.82;
      return `rgba(139, 58, 26, ${alpha.toFixed(2)})`;
    }
  }

  function metricCategory(key) {
    const map = { roe: '盈利质量', nim: '息差负债', costIncome: '成本效率', npl: '风险拨备', coverage: '风险拨备', depositCasa: '息差负债', feeAsset: '轻资本', pb: '资本估值' };
    return map[key] || '经营质量';
  }

  function metricPair(key) {
    const map = { roe: 'ROA、核心营收、中收', nim: '负债成本、定期化、存贷利差', costIncome: '中收、费用刚性', npl: '关注率、逾期偏离、拨备', coverage: '不良确认、利润质量', depositCasa: '负债成本、NIM', feeAsset: 'PB、核心营收', pb: 'ROE、风险确认、中收' };
    return map[key] || '同业均值';
  }

  function estimateRank(targetVal, vals, higherIsBetter) {
    const sorted = [...vals].sort((a, b) => higherIsBetter ? b - a : a - b);
    const idx = sorted.indexOf(targetVal);
    const pct = ((idx + 1) / vals.length) * 100;
    return `前 ${Math.round(pct)}%`;
  }

  function renderKPIs() {
    const sample = getActiveSample();
    if (!sample) return;
    const target = sample.find(s => s.isTarget);
    const typeAvg = sample.find(s => s.avgType === 'nationalType');
    const year = state.snapshotYear;
    const strip = document.getElementById('bmKpiStrip');
    if (!strip) return;
    strip.hidden = false;
    strip.innerHTML = METRICS.map(m => {
      const targetVal = getMetricValueForSample(target, m, year);
      const avgVal = typeAvg ? getMetricValueForSample(typeAvg, m, year) : targetVal;
      const gap = targetVal - avgVal;
      const gapPct = avgVal ? (gap / avgVal) * 100 : 0;
      const isGood = m.higherIsBetter ? gap >= 0 : gap <= 0;
      const deltaClass = Math.abs(gap) < 0.01 ? 'neutral' : isGood ? 'positive' : 'negative';
      const sign = gap > 0 ? '+' : '';
      let gapText;
      if (m.unit === '%') gapText = `${sign}${gap.toFixed(m.key === 'feeAsset' ? 3 : m.key === 'npl' ? 2 : 1)}${m.unit}`;
      else if (m.unit === 'x') gapText = `${sign}${gap.toFixed(2)}x`;
      else gapText = `${sign}${gap.toFixed(1)}`;
      return `
        <div class="kpi-card">
          <div class="label">${m.name} <span style="color:#7f95aa;font-weight:400">(${year})</span></div>
          <div class="value">${formatValue(targetVal, m)}</div>
          <div class="delta ${deltaClass}">
            ${Math.abs(gapPct).toFixed(1)}% ${isGood ? '优于' : '劣于'}类型均值
            <span style="font-weight:400;color:#7f95aa">（缺口 ${gapText}）</span>
          </div>
        </div>
      `;
    }).join('');
  }

  function renderCorrelationMatrix() {
    const sample = getActiveSample();
    if (!sample) return;
    const years = Array.from({ length: state.trendEnd - state.trendStart + 1 }, (_, i) => state.trendStart + i);
    const n = METRICS.length;
    const matrixEl = document.getElementById('bmCorrelationMatrix');
    const section = document.getElementById('bmCorrelationSection');
    if (!matrixEl || !section) return;
    section.hidden = false;
    matrixEl.style.gridTemplateColumns = `repeat(${n + 1}, minmax(64px, 1fr))`;

    const values = METRICS.map(m => {
      const arr = [];
      sample.forEach(member => { years.forEach(year => arr.push(getMetricValueForSample(member, m, year))); });
      return arr;
    });

    let html = '<div class="bm-matrix-cell label"></div>';
    METRICS.forEach(m => html += `<div class="bm-matrix-cell label" title="${m.name}">${m.name}</div>`);
    METRICS.forEach((mi, i) => {
      html += `<div class="bm-matrix-cell label" title="${mi.name}">${mi.name}</div>`;
      METRICS.forEach((mj, j) => {
        const r = i === j ? 1 : pearson(values[i], values[j]);
        const sig = i === j ? '' : significance(r, values[i].length);
        const color = correlationColor(r, i === j);
        html += `
          <div class="bm-matrix-cell ${i === j ? 'diag' : ''}"
               style="background:${color}; color:${Math.abs(r) > 0.5 ? '#fff' : '#0f1a24'}"
               data-mi="${mi.name}" data-mj="${mj.name}" data-r="${r.toFixed(3)}" data-sig="${sig}">
            ${r.toFixed(2)}
            ${sig ? `<span class="bm-matrix-sig">${sig}</span>` : ''}
          </div>
        `;
      });
    });
    matrixEl.innerHTML = html;

    matrixEl.querySelectorAll('.bm-matrix-cell:not(.label):not(.diag)').forEach(cell => {
      cell.addEventListener('mouseenter', (e) => {
        const t = document.getElementById('bmTooltip');
        const mi = e.target.dataset.mi;
        const mj = e.target.dataset.mj;
        const r = parseFloat(e.target.dataset.r);
        const sig = e.target.dataset.sig;
        const text = sig
          ? `${mi} 与 ${mj} 的相关系数为 ${r.toFixed(3)}，${sig} 水平显著。`
          : `${mi} 与 ${mj} 的相关系数为 ${r.toFixed(3)}，未达常规显著水平。`;
        t.innerHTML = `<b>${mi} × ${mj}</b>${text}`;
        t.style.left = (e.clientX + 12) + 'px';
        t.style.top = (e.clientY + 12) + 'px';
        t.classList.add('visible');
      });
      cell.addEventListener('mouseleave', () => {
        document.getElementById('bmTooltip').classList.remove('visible');
      });
    });
  }

  function generateAngles() {
    const sample = getActiveSample();
    if (!sample) return [];
    const typeAvg = sample.find(s => s.avgType === 'nationalType');
    const year = state.snapshotYear;
    const angles = [];
    METRICS.forEach(m => {
      const targetVal = getMetricValueForSample({ isTarget: true }, m, year);
      const peerVals = sample.filter(s => s.isPeer).map(s => getMetricValueForSample(s, m, year));
      const avg = peerVals.length ? peerVals.reduce((a, b) => a + b, 0) / peerVals.length : targetVal;
      const typeVal = typeAvg ? getMetricValueForSample(typeAvg, m, year) : avg;
      const gap = targetVal - typeVal;
      const absGapPct = Math.abs(gap / typeVal);
      const years = Array.from({ length: state.trendEnd - state.trendStart + 1 }, (_, i) => state.trendStart + i);
      const trendVals = years.map(y => getMetricValueForSample({ isTarget: true }, m, y));
      const trendDir = trendVals[trendVals.length - 1] - trendVals[0];
      if (absGapPct > 0.08) {
        const isGood = m.higherIsBetter ? gap >= 0 : gap <= 0;
        angles.push({
          category: metricCategory(m.key),
          title: `${m.name}${isGood ? '占优' : '承压'}：目标银行${gap > 0 ? '高于' : '低于'}类型均值 ${(absGapPct * 100).toFixed(1)}%`,
          description: `目标银行 ${m.name} 为 ${formatValue(targetVal, m)}，${state.target.type} 均值为 ${formatValue(typeVal, m)}，${trendDir > 0 ? '近年呈上行' : '近年呈下行'}趋势。建议围绕${m.name}与${metricPair(m.key)}的联动关系展开专题。`,
          strength: absGapPct > 0.15 ? 'strong' : 'medium',
          facts: [{
            id: `f-${Date.now()}-${m.key}`,
            metric: m.name,
            value: formatValue(targetVal, m),
            peerAvg: formatValue(typeVal, m),
            gap: `${gap > 0 ? '+' : ''}${formatValue(gap, m)}`,
            rank: estimateRank(targetVal, [...peerVals, targetVal], m.higherIsBetter),
            trend: trendDir > 0 ? '上行' : trendDir < 0 ? '下行' : '走平',
            angle: metricCategory(m.key),
            evidenceStrength: absGapPct > 0.15 ? '强' : '中',
            source: `${year} 年末 · ${state.target.type}均值 · ${state.target.region}`,
          }]
        });
      }
    });
    const pairs = [
      ['nim', 'costIncome', '息差与成本收入比', '若 NIM 下行而成本收入比刚性，盈利修复空间被双向压缩。'],
      ['npl', 'coverage', '不良与拨备', '不良率与覆盖率组合决定风险确认节奏与安全垫厚度。'],
      ['feeAsset', 'pb', '轻资本与估值', '手续费/资产偏低可能解释市净率折价。'],
    ];
    pairs.forEach(([k1, k2, title, desc]) => {
      const m1 = METRICS.find(m => m.key === k1);
      const m2 = METRICS.find(m => m.key === k2);
      const v1 = getMetricValueForSample({ isTarget: true }, m1, year);
      const v2 = getMetricValueForSample({ isTarget: true }, m2, year);
      const typeV1 = typeAvg ? getMetricValueForSample(typeAvg, m1, year) : v1;
      const typeV2 = typeAvg ? getMetricValueForSample(typeAvg, m2, year) : v2;
      const gap1 = (v1 - typeV1) / typeV1;
      const gap2 = (v2 - typeV2) / typeV2;
      if (Math.abs(gap1) > 0.06 || Math.abs(gap2) > 0.06) {
        angles.push({
          category: '交叉验证',
          title: `${title}联动：${gap1 > 0 ? '前者占优' : '前者偏弱'} × ${gap2 > 0 ? '后者占优' : '后者偏弱'}`,
          description: `${desc} 目标银行 ${m1.name} ${formatValue(v1, m1)}、${m2.name} ${formatValue(v2, m2)}，建议作为估值或盈利质量专题的交叉证据。`,
          strength: (Math.abs(gap1) > 0.12 && Math.abs(gap2) > 0.12) ? 'strong' : 'medium',
          facts: [
            { id: `f-${Date.now()}-${k1}-${k2}-1`, metric: m1.name, value: formatValue(v1, m1), peerAvg: formatValue(typeV1, m1), gap: `${gap1 > 0 ? '+' : ''}${(gap1 * 100).toFixed(1)}%`, rank: '—', trend: '—', angle: '交叉验证', evidenceStrength: Math.abs(gap1) > 0.12 ? '强' : '中', source: `${year} 年末 · 类型均值` },
            { id: `f-${Date.now()}-${k1}-${k2}-2`, metric: m2.name, value: formatValue(v2, m2), peerAvg: formatValue(typeV2, m2), gap: `${gap2 > 0 ? '+' : ''}${(gap2 * 100).toFixed(1)}%`, rank: '—', trend: '—', angle: '交叉验证', evidenceStrength: Math.abs(gap2) > 0.12 ? '强' : '中', source: `${year} 年末 · 类型均值` },
          ]
        });
      }
    });
    return angles.slice(0, 8);
  }

  function renderAngles() {
    const angles = generateAngles();
    const grid = document.getElementById('bmAngleGrid');
    const section = document.getElementById('bmAnglesSection');
    if (!grid || !section) return;
    section.hidden = false;
    grid.innerHTML = angles.map((a, i) => `
      <div class="angle-card">
        <div class="angle-tag">${a.category}</div>
        <h4>${a.title}</h4>
        <p>${a.description}</p>
        <div class="angle-meta">
          <span class="strength ${a.strength}">证据强度 · ${a.strength === 'strong' ? '强' : '中'}</span>
          <button type="button" class="btn text" data-angle-index="${i}">加入事实清单</button>
        </div>
      </div>
    `).join('');

    grid.querySelectorAll('button[data-angle-index]').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const idx = parseInt(e.target.dataset.angleIndex);
        addAngleFacts(idx);
      });
    });
  }

  function addAngleFacts(index) {
    const angles = generateAngles();
    const angle = angles[index];
    if (!angle) return;
    angle.facts.forEach(f => {
      if (!state.facts.some(existing => existing.metric === f.metric && existing.value === f.value && existing.angle === f.angle)) {
        state.facts.push(f);
      }
    });
    renderFactPack();
  }

  function renderFactPack() {
    const bar = document.getElementById('bmFactPackBar');
    const list = document.getElementById('bmFactList');
    const count = document.getElementById('bmFactCount');
    if (!bar || !list || !count) return;
    count.textContent = state.facts.length;
    if (state.facts.length === 0) {
      list.innerHTML = '<div class="fact-empty">点击上方「加入事实清单」收集证据。</div>';
    } else {
      list.innerHTML = state.facts.map((f, i) => `
        <div class="fact-item">
          <div class="fact-title">${f.metric} · ${f.angle}</div>
          <div class="fact-value">${f.value}</div>
          <div class="fact-gap" style="color:${f.gap.startsWith('+') ? '#2E7D62' : '#B85C38'}">缺口 ${f.gap}</div>
          <button type="button" data-remove-fact="${i}">移除</button>
        </div>
      `).join('');
      list.querySelectorAll('button[data-remove-fact]').forEach(btn => {
        btn.addEventListener('click', (e) => {
          const idx = parseInt(e.target.dataset.removeFact);
          state.facts.splice(idx, 1);
          renderFactPack();
        });
      });
    }
    if (state.facts.length > 0) {
      bar.classList.remove('collapsed');
      state.factPackOpen = true;
    }
  }

  function toggleFactPack() {
    const bar = document.getElementById('bmFactPackBar');
    if (!bar) return;
    state.factPackOpen = !state.factPackOpen;
    if (state.factPackOpen) bar.classList.remove('collapsed');
    else bar.classList.add('collapsed');
  }

  function clearFacts() {
    state.facts = [];
    renderFactPack();
  }

  function buildPayload() {
    const sample = getActiveSample();
    return {
      version: '1.0',
      generatedAt: new Date().toISOString(),
      targetBank: state.target ? { name: state.target.name, code: state.target.code || '', type: state.target.type, region: state.target.region } : null,
      peerGroup: { name: `${state.target?.name || '未命名'}对标组`, banks: state.peers.custom, typeAvg: state.peers.nationalType, regionAvg: state.peers.regionType },
      snapshotYear: state.snapshotYear,
      trendRange: [state.trendStart, state.trendEnd],
      facts: state.facts,
      suggestedAngles: generateAngles().map(a => ({ category: a.category, title: a.title, description: a.description, strength: a.strength })),
      correlationMatrix: { metrics: METRICS.map(m => m.name), note: '完整相关性矩阵在 UI 中实时计算，此处省略以保持 payload 可读。' },
      reportSystemEndpoint: { sync: 'POST /api/report-analysis/fact-pack', async: 'POST /api/report-analysis/fact-pack?async=true' }
    };
  }

  function exportFactPack() {
    const payload = buildPayload();
    const json = JSON.stringify(payload, null, 2);
    const pre = document.getElementById('bmExportPayload');
    const modal = document.getElementById('bmExportModal');
    if (pre) pre.textContent = json;
    if (modal) modal.classList.add('visible');
  }

  function closeModal() {
    const modal = document.getElementById('bmExportModal');
    if (modal) modal.classList.remove('visible');
  }

  function copyPayload() {
    const json = JSON.stringify(buildPayload(), null, 2);
    navigator.clipboard.writeText(json).then(() => alert('已复制到剪贴板'));
  }

  function downloadPayload() {
    const json = JSON.stringify(buildPayload(), null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'fact_pack.json';
    a.click();
    URL.revokeObjectURL(url);
  }

  function onSelectionChange() {
    if (state.target) {
      document.getElementById('bmEmpty').hidden = true;
      document.getElementById('bmDomainContent').hidden = false;
      renderKPIs();
      renderCorrelationMatrix();
      renderAngles();
    }
  }

  function bindToExistingUI() {
    const existingBankList = document.getElementById('bmBankList');
    const existingPeerToggles = document.getElementById('bmPeerToggles');
    const existingSnapshotTabs = document.getElementById('bmSnapshotTabs');
    const existingTrendStart = document.getElementById('bmTrendStart');
    const existingTrendEnd = document.getElementById('bmTrendEnd');

    if (existingBankList) {
      const banks = getBanks();
      existingBankList.innerHTML = banks.map(b => `
        <div class="bm-bank-item ${state.target?.name === b.name ? 'is-active' : ''}" data-bank-name="${b.name}">
          <span>${b.name}</span>
          <span class="bm-bank-tag">${b.type}</span>
        </div>
      `).join('');
      existingBankList.querySelectorAll('.bm-bank-item').forEach(item => {
        item.addEventListener('click', () => {
          const name = item.dataset.bankName;
          state.target = banks.find(b => b.name === name);
          const recommended = banks.filter(b => b.name !== name && b.type === state.target.type && b.region === state.target.region).slice(0, 4);
          state.peers.custom = recommended.map(b => b.name);
          const customToggle = existingPeerToggles ? existingPeerToggles.querySelector('[data-peer-key="custom"]') : null;
          if (customToggle) customToggle.checked = true;
          onSelectionChange();
        });
      });
    }

    if (existingPeerToggles) {
      existingPeerToggles.querySelectorAll('input[type="checkbox"]').forEach(cb => {
        cb.addEventListener('change', () => {
          const key = cb.dataset.peerKey;
          if (key === 'national_type') state.peers.nationalType = cb.checked;
          if (key === 'region_type') state.peers.regionType = cb.checked;
          if (key === 'national_other') state.peers.nationalOther = cb.checked;
          if (key === 'custom') {
            const customPanel = document.getElementById('bmPeerCustom');
            if (customPanel) customPanel.hidden = !cb.checked;
          }
          onSelectionChange();
        });
      });
    }

    if (existingSnapshotTabs) {
      existingSnapshotTabs.querySelectorAll('button').forEach(btn => {
        btn.addEventListener('click', () => {
          existingSnapshotTabs.querySelectorAll('button').forEach(b => b.classList.remove('is-active'));
          btn.classList.add('is-active');
          state.snapshotYear = parseInt(btn.dataset.snap);
          onSelectionChange();
        });
      });
    }

    if (existingTrendStart) {
      existingTrendStart.addEventListener('change', (e) => { state.trendStart = parseInt(e.target.value); onSelectionChange(); });
    }
    if (existingTrendEnd) {
      existingTrendEnd.addEventListener('change', (e) => { state.trendEnd = parseInt(e.target.value); onSelectionChange(); });
    }

    const regenerateBtn = document.getElementById('bmRegenerateMatrix');
    if (regenerateBtn) regenerateBtn.addEventListener('click', renderCorrelationMatrix);

    const factToggle = document.getElementById('bmFactPackToggle');
    if (factToggle) factToggle.addEventListener('click', toggleFactPack);

    const clearBtn = document.getElementById('bmClearFacts');
    if (clearBtn) clearBtn.addEventListener('click', clearFacts);

    const exportBtn = document.getElementById('bmExportFactPack');
    if (exportBtn) exportBtn.addEventListener('click', exportFactPack);

    const closeModalBtn = document.getElementById('bmCloseModal');
    const closeModalBtn2 = document.getElementById('bmCloseModal2');
    if (closeModalBtn) closeModalBtn.addEventListener('click', closeModal);
    if (closeModalBtn2) closeModalBtn2.addEventListener('click', closeModal);

    const copyBtn = document.getElementById('bmCopyPayload');
    const downloadBtn = document.getElementById('bmDownloadPayload');
    if (copyBtn) copyBtn.addEventListener('click', copyPayload);
    if (downloadBtn) downloadBtn.addEventListener('click', downloadPayload);
  }

  function init() {
    bindToExistingUI();
    if (window.benchmarkPage && window.benchmarkPage.state && window.benchmarkPage.state.target) {
      state.target = window.benchmarkPage.state.target;
      state.snapshotYear = window.benchmarkPage.state.snapshotYear || 2025;
      state.trendStart = window.benchmarkPage.state.trendStart || 2020;
      state.trendEnd = window.benchmarkPage.state.trendEnd || 2025;
      state.peers = window.benchmarkPage.state.peers || state.peers;
      onSelectionChange();
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  window.benchmarkFirstLogic = { state, buildPayload, exportFactPack, addAngleFacts, renderKPIs, renderCorrelationMatrix, renderAngles };
})();
