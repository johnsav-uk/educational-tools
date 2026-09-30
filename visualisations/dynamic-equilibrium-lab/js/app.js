/* Dynamic Equilibrium Lab — 3. UI controls, and the glue between the parts.

   model.js      the chemistry (kinetics, K, Q, the equilibrium solver)
   particles.js  the chamber drawing, tied to the model
   graphs.js     the charts
   content.js    the words: explanations, misconceptions, questions
   app.js        this file: state, controls, panels, presenter mode, printing

   Sections:
     1. Helpers and state
     2. Presets and loading a reaction
     3. The running simulation: stepping, recording, status
     4. Drawing: chamber overlays, rates, composition, graphs
     5. Changing the conditions
     6. Predict → change → observe
     7. Catalyst comparison and the Haber compromise
     8. A-level: Kc, Q, Kp, ICE, the Kc log, the challenge
     9. Background: what is equilibrium, misconceptions, specification
    10. Presenter mode
    11. Printing
    12. Main loop and keys */
(() => {
'use strict';
const M = window.EQ_MODEL, P = window.EQ_PARTICLES, G = window.EQ_GRAPHS, C = window.EQ_CONTENT;
const { sig, sup } = C;

/* ════════════════════════ 1. helpers & state ════════════════════════ */
const $ = s => document.querySelector(s);
const $$ = s => [...document.querySelectorAll(s)];
const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
const presenting = () => document.body.classList.contains('presenting');
const alevel = () => S.level === 'alevel';
const f1 = v => (Math.round(v * 10) / 10).toFixed(1);

const PRESETS = {
  gcse: [
    { key: 'conc', rx: 'abcd', label: 'Concentration change: A + B ⇌ C + D', hint: 'Let it reach dynamic equilibrium, then add or remove a substance and watch the system respond.' },
    { key: 'rev', rx: 'ab', label: 'Reversible reaction: A ⇌ B', hint: 'One kind of particle turns into the other, and back again. Watch the two rates meet.' },
    { key: 'temp', rx: 'abcd', exo: true, label: 'Temperature change: exothermic A + B ⇌ C + D', hint: 'The forward reaction is exothermic. Reach equilibrium, then heat or cool it. Switch to endothermic and try again.' },
    { key: 'haber', rx: 'haber', cat: true, label: 'Haber process: N₂ + 3H₂ ⇌ 2NH₃', hint: 'Industrial conditions: 450 °C, 200 atm and an iron catalyst. Try other temperatures and pressures and watch the yield and the rate.' }
  ],
  alevel: [
    { key: 'hi', rx: 'hi', label: 'H₂ + I₂ ⇌ 2HI', hint: 'Kc has no units here. Reach equilibrium and check Kc, then change the starting mixture and check again.' },
    { key: 'haberA', rx: 'haber', cat: true, label: 'N₂ + 3H₂ ⇌ 2NH₃ (Kc and Kp)', hint: 'Change the pressure at constant temperature: the composition moves, Kp does not.' },
    { key: 'abcdA', rx: 'abcd', label: 'A + B ⇌ C + D', hint: 'rate_f = kf[A][B] and rate_r = kr[C][D]. At equilibrium they are equal, so Kc = kf / kr.' },
    { key: 'abA', rx: 'ab', label: 'A ⇌ B', hint: 'First order both ways: Kc = [B] / [A] = kf / kr.' }
  ]
};

const sim = new M.Sim('abcd');
const chamber = new P.Chamber($('#chamberCv'));
const concChart = new G.LineChart($('#concCv'), { yLabel: 'Concentration / mol dm⁻³', yShort: 'mol dm⁻³' });
const rateChart = new G.LineChart($('#rateCv'), { yLabel: 'Rate / reactions per second', yShort: 'per second' });

const S = {
  level: 'gcse', preset: PRESETS.gcse[0], mix: 'reactants', customAmts: null,
  running: false, speed: 1, stepLeft: 0,
  graphPaused: false, graphT0: 0, hist: null, markers: [], lastSample: -1,
  status: 'react', eq: null, eqTime: null, cause: 'Start', log: [], logRow: null,
  barMax: 1, mixAmts: null, P0: 1, total0: 100,
  autoPause: false, predict: null, lastExplain: null, challenge: null
};

/* ════════════════════════ 2. presets & loading ════════════════════════ */
const rx = () => sim.rx;
const firstIdx = sign => rx().species.findIndex(s => Math.sign(s.nu) === sign);
const col = k => P.COL[k];

function fillPresetSelect() {
  $('#rxSel').innerHTML = PRESETS[S.level].map(p => `<option value="${p.key}">${p.label}</option>`).join('');
  $('#rxSel').value = S.preset.key;
}

// Start amounts in mol for the chosen mixture.
function mixAmounts() {
  if (S.mix === 'custom' && S.customAmts && S.customAmts.length === rx().species.length) return S.customAmts.slice();
  return M.REACTIONS[S.preset.rx].mixes[S.mix === 'custom' ? 'reactants' : S.mix].slice();
}

// Load a preset: its reaction and its default conditions.
function loadPreset(p, mix) {
  S.preset = p;
  if (mix) S.mix = mix;
  const def = M.REACTIONS[p.rx];
  if (S.mix === 'custom' && (!S.customAmts || S.customAmts.length !== def.species.length)) S.customAmts = def.mixes.reactants.slice();
  sim.load(p.rx, S.mix === 'custom' ? S.customAmts.slice() : def.mixes[S.mix].slice(), { exo: p.exo !== undefined ? p.exo : true, T: def.T0, cat: !!p.cat });
  afterLoad(`Start: ${mixName()}`);
  syncMixSeg(); buildCustom();
  showExplain(null, p.hint);
  $('#catCard').hidden = true;
}

// Reset: the starting mixture again, keeping the teacher's temperature, pressure and catalyst.
function reset() {
  const keep = { T: sim.T, cat: sim.cat, exo: sim.exo, v: sim.vStep };
  sim.load(S.preset.rx, mixAmounts(), keep);
  sim.setVStep(keep.v); sim.t = 0; sim.onEqChange();
  afterLoad(`Reset: ${mixName()}`);
}

function afterLoad(cause) {
  S.mixAmts = sim.n.slice();
  // The lettered reactions show pressure relative to the starting mixture at the default volume and temperature.
  S.P0 = sim.nTotal() * M.R * rx().T0 / (rx().V0 / 1000) / 1000;
  S.total0 = Math.round(sim.nTotal() * rx().scale);
  chamber.rebuild(sim);
  S.eq = null; S.eqTime = null; S.status = 'react'; S.cause = cause; S.logRow = null; S.ice = null;
  S.barMax = 1; S.autoPause = false;
  clearGraph(true);
  S.markers = [];
  syncReactionUI();
  updateStatus(true);
  drawAll(true);
  if (S.challenge && S.challenge.loaded && cause.indexOf('Challenge') !== 0) S.challenge.loaded = false;
}
function mixName() { return { reactants: 'mostly reactants', products: 'mostly products', equal: 'equal amounts', custom: 'custom mixture' }[S.mix]; }

// Everything on screen that depends on which reaction is loaded.
function syncReactionUI() {
  const r = rx();
  const side = sign => r.species.filter(s => Math.sign(s.nu) === sign)
    .map(s => `<span class="sp"><i class="dot" style="background:${col(s.k)}"></i>${Math.abs(s.nu) > 1 ? Math.abs(s.nu) : ''}${s.name}</span>`).join(' + ');
  $('#eqn').innerHTML = `${side(-1)}<span class="eqarrow">⇌</span>${side(1)}`;
  const txt = sign => C.sideNames(r, sign);
  $('#indF').textContent = `${txt(-1)} → ${txt(1)}`;
  $('#indR').textContent = `${txt(1)} → ${txt(-1)}`;
  $$('[data-name="R"]').forEach(e => { e.textContent = r.species[firstIdx(-1)].name; });
  $$('[data-name="P"]').forEach(e => { e.textContent = r.species[firstIdx(1)].name; });
  // Legend with each particle drawn as it appears in the chamber.
  $('#legend').innerHTML = r.species.map(s => `<span><canvas width="52" height="36" data-k="${s.k}" aria-hidden="true"></canvas>${s.name}</span>`).join('');
  $$('#legend canvas').forEach(cv => {
    const ctx = cv.getContext('2d'); ctx.scale(2, 2);
    P.drawMolecule(ctx, cv.dataset.k, 13, 9, 6.2, 0, 1, true);
  });
  $('#exoField').hidden = !r.generic;
  syncExo();
  const nL = C.gasMoles(r, -1), nR = C.gasMoles(r, 1);
  $('#pNote').textContent = nL === nR
    ? `Same number of gas molecules on each side (${nL} : ${nR}). Pressure changes both rates equally, so the position of equilibrium does not move.`
    : `${nL} molecules of gas on the left, ${nR} on the right. Higher pressure favours the side with fewer molecules.`;
  $('#haberCard').hidden = r.id !== 'haber';
  $('#presTitle').textContent = r.short;
  syncConditions();
  fillPredictChanges();
  buildNarrative();
  if (alevel()) { renderIce(true); renderKp(true); }
}

function syncExo() {
  const exo = sim.dH() < 0;
  $$('#exoSeg button').forEach(b => b.setAttribute('aria-pressed', String((b.dataset.exo === '1') === sim.exo)));
  $('#dhChip').textContent = `ΔH = ${C.fmtdH(sim.dH())}`;
  $('#dhChip').className = 'dh-chip ' + (exo ? 'exo' : 'endo');
  $('#dhChip').title = `The forward reaction is ${exo ? 'exothermic' : 'endothermic'}`;
}

function tempText(T, both) {
  const c = Math.round(T - 273);
  if (alevel()) return both ? `${Math.round(T)} K (${c} °C)` : `${Math.round(T)} K`;
  return `${c} °C`;
}
function pressText() {
  const p = sim.pressure();
  if (rx().pressure === 'rel') return `×${(p / S.P0).toFixed(2)}`;
  return alevel() ? `${fmtInt(p)} kPa` : `${Math.round(p / M.ATM)} atm`;
}
const fmtInt = v => Math.round(v).toLocaleString('en-GB');

function syncConditions() {
  const r = rx();
  $('#tOut').textContent = tempText(sim.T, true);
  $('#gT').textContent = tempText(sim.T);
  $('#pOut').textContent = pressText();
  $('#gP').textContent = pressText();
  $('#gCat').hidden = !sim.cat;
  $$('[data-change="heat"]').forEach(b => { b.disabled = sim.T >= r.Tmax - 0.5; });
  $$('[data-change="cool"]').forEach(b => { b.disabled = sim.T <= r.Tmin + 0.5; });
  $$('[data-change="pUp"]').forEach(b => { b.disabled = sim.vStep >= M.V_STEPS.length - 1; });
  $$('[data-change="pDown"]').forEach(b => { b.disabled = sim.vStep <= 0; });
  $$('[data-change="cat"]').forEach(b => { b.setAttribute('aria-pressed', String(sim.cat)); const sp = b.querySelector('span'); if (sp && b.id === 'catBtn') sp.textContent = sim.cat ? 'Remove catalyst' : 'Add catalyst'; });
  $$('[data-change="remR"]').forEach(b => { b.disabled = sim.n[firstIdx(-1)] * r.scale < 1; });
  $$('[data-change="remP"]').forEach(b => { b.disabled = sim.n[firstIdx(1)] * r.scale < 1; });
}

function syncMixSeg() { $$('#mixSeg button').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.mix === S.mix))); }

function buildCustom() {
  const box = $('#customBox');
  box.hidden = S.mix !== 'custom';
  if (box.hidden) return;
  const r = rx(), amts = S.customAmts || r.mixes.reactants;
  const max = Math.round(Math.max(...Object.values(r.mixes).flat()) * r.scale * 1.25);
  box.innerHTML = r.species.map((s, i) => `<label class="row"><span>${s.name}</span><input type="range" min="0" max="${max}" step="1" value="${Math.round(amts[i] * r.scale)}" data-i="${i}" aria-label="${s.name} particles"><output>${Math.round(amts[i] * r.scale)}</output></label>`).join('') +
    `<p class="note" style="margin:2px 0 8px">Particles at the start. Each is ${sig(1 / r.scale / r.V0, 2)} mol dm⁻³.</p><button class="btn primary wide" type="button" id="customGo">Start with this mixture</button>`;
  box.querySelectorAll('input').forEach(inp => inp.addEventListener('input', () => { inp.nextElementSibling.textContent = inp.value; }));
  $('#customGo').addEventListener('click', () => {
    S.customAmts = [...box.querySelectorAll('input')].map(inp => +inp.value / r.scale);
    if (S.customAmts.every(v => v === 0)) S.customAmts[0] = 20 / r.scale;
    reset();
  });
}

/* ════════════════════════ 3. running: step, record, status ════════════════════════ */
function newHist() {
  const cols = {};
  rx().species.forEach(s => { cols[s.k] = []; });
  ['mf', 'mr', 'ef', 'er'].forEach(k => { cols[k] = []; });
  return { t: [], cols };
}
function clearGraph(all) {
  S.hist = newHist(); S.graphT0 = sim.t; S.lastSample = -1;
  if (!all) S.markers = S.markers.filter(m => m.t >= sim.t);
  concChart.resetScale(); rateChart.resetScale();
  record(true);
}
function evScale() { return sim.V * rx().scale; }
function record(force) {
  if (!force && sim.t - S.lastSample < 0.1 - 1e-9) return;
  S.lastSample = sim.t;
  const h = S.hist, c = sim.conc(), r = sim.rates(), e = chamber.recent(sim.t, 1);
  h.t.push(sim.t);
  rx().species.forEach((s, i) => h.cols[s.k].push(c[i]));
  h.cols.mf.push(r.f * evScale()); h.cols.mr.push(r.r * evScale());
  const win = Math.min(1, Math.max(0.1, sim.t));
  h.cols.ef.push(e.f / win); h.cols.er.push(e.r / win);
  if (h.t.length > 24000) { h.t.splice(0, 4000); Object.values(h.cols).forEach(a => a.splice(0, 4000)); }
}

function advance(dt) {
  let left = dt;
  while (left > 1e-9) {
    const h = Math.min(left, 1 / 60);
    const r0 = sim.rates();
    sim.step(h);
    const r1 = sim.rates();
    chamber.tick(h, sim.t, (r0.f + r1.f) / 2, (r0.r + r1.r) / 2);
    left -= h;
    record();
  }
  updateStatus();
}

// Status comes from the model's rates: equilibrium is where they agree.
function imbalance() { const r = sim.rates(); return { r, imb: Math.abs(r.f - r.r) / Math.max(r.f, r.r, 1e-15) }; }
function updateStatus(force) {
  const { r, imb } = imbalance();
  const was = S.status;
  let st = imb > 0.3 ? 'react' : 'approach';
  if (imb <= M.EQ_TOL) {
    if (sim.eqSince === null) sim.eqSince = sim.t;
    // Settled for a moment, or already there straight after a change that needs no shift.
    if (was === 'eq' || sim.t - sim.eqSince >= 0.4 || sim.t - sim.segStart < 0.05) st = 'eq';
  } else sim.eqSince = null;
  S.status = st;
  if (st === 'eq') {
    if (was !== 'eq' || !S.eq) {
      S.eqTime = Math.max(0, sim.eqSince - sim.segStart);
      if (was !== 'eq') announce('Dynamic equilibrium. Forward rate equals reverse rate. Particles are still reacting.');
      logEquilibrium(true);
      if (S.autoPause) { S.autoPause = false; setRunning(false); }
      if (alevel() && S.challenge && S.challenge.loaded) renderChallenge();
    } else logEquilibrium(false);
    predictObserve();
  }
  if (force || was !== st) renderStatus(r);
}

function announce(t) { $('#srLive').textContent = t; }

/* ════════════════════════ 4. drawing ════════════════════════ */
function renderStatus(r) {
  r = r || sim.rates();
  const st = S.status, steps = ['react', 'approach', 'eq'];
  $$('#statusSteps li').forEach(li => {
    const i = steps.indexOf(li.dataset.s), k = steps.indexOf(st);
    li.classList.toggle('on', i === k); li.classList.toggle('done', i < k);
  });
  const box = $('#status');
  box.classList.toggle('eq', st === 'eq');
  const dir = r.f > r.r ? 'forward' : 'reverse';
  if (st === 'eq') {
    box.innerHTML = `<h3>DYNAMIC EQUILIBRIUM</h3><p>Forward rate ≈ reverse rate. Particles are still reacting.</p>` +
      (S.eqTime !== null && S.eqTime > 0.3 ? `<p>Reached ${f1(S.eqTime)} s after the last ${sim.segStart === 0 ? 'start' : 'change'}. Concentrations are now constant.</p>` : `<p>Concentrations are constant.</p>`);
  } else if (st === 'approach') {
    box.innerHTML = `<h3>Approaching equilibrium</h3><p>The ${dir} rate is still a little faster, so there is a net ${dir} reaction. The rates are closing in.</p>`;
  } else {
    box.innerHTML = `<h3>Reacting</h3><p>The ${dir} rate is much faster than the ${dir === 'forward' ? 'reverse' : 'forward'} rate: a net ${dir} reaction. Concentrations are changing.</p>`;
  }
}

let lastRates = 0;
function renderRates(force) {
  const now = performance.now();
  if (!force && now - lastRates < 120) return;
  lastRates = now;
  const win = Math.min(3, Math.max(0.25, sim.t - Math.max(0, sim.t - 3)));
  const e = chamber.recent(sim.t, 3), w = sim.t < 3 ? Math.max(0.25, sim.t) : win;
  const ef = e.f / w, er = e.r / w, r = sim.rates(), mf = r.f * evScale(), mr = r.r * evScale();
  // Both bars share one scale, which follows the rates down as they settle so equilibrium bars stay readable.
  S.barMax = Math.max(S.barMax * 0.97, ef, er, mf, mr, 2);
  const top = G.niceMax(S.barMax);
  $('#rfNum').textContent = `${ef.toFixed(1)} /s`;
  $('#rrNum').textContent = `${er.toFixed(1)} /s`;
  $('#rfBar').style.width = `${clamp(ef / top * 100, 0, 100)}%`;
  $('#rrBar').style.width = `${clamp(er / top * 100, 0, 100)}%`;
  if (alevel()) {
    const k = sim.k(), c = sim.conc(), rr = rx();
    const term = sign => rr.species.map((s, i) => Math.sign(s.nu) === sign ? `[${s.name}]${Math.abs(s.nu) > 1 ? sup(Math.abs(s.nu)) : ''}` : '').join('');
    $('#modelRates').innerHTML =
      `<p>rate<sub>f</sub> = k<sub>f</sub>${term(-1)} = <b>${sig(r.f)}</b> mol dm⁻³ s⁻¹</p>` +
      `<p>rate<sub>r</sub> = k<sub>r</sub>${term(1)} = <b>${sig(r.r)}</b> mol dm⁻³ s⁻¹</p>` +
      `<p>k<sub>f</sub> = ${sig(k.kf)} ${kUnits(-1)}, k<sub>r</sub> = ${sig(k.kr)} ${kUnits(1)}</p>`;
  }
}
function kUnits(sign) {
  const order = rx().species.filter(s => Math.sign(s.nu) === sign).reduce((a, s) => a + Math.abs(s.nu), 0);
  if (order === 1) return 's⁻¹';
  const p = order - 1;
  return `dm${sup(3 * p)} mol${sup('-' + p)} s⁻¹`;
}

function renderComposition() {
  const r = rx(), n = sim.n, tot = n.reduce((a, b) => a + b, 0) || 1;
  const bar = $('#compBar');
  if (bar.dataset.rx !== r.id) { bar.dataset.rx = r.id; bar.innerHTML = r.species.map(s => `<div style="background:${col(s.k)}"></div>`).join(''); }
  r.species.forEach((s, i) => {
    const pc = n[i] / tot * 100, d = bar.children[i];
    d.style.flexGrow = Math.max(0.0001, pc);
    d.textContent = pc >= 7 ? `${s.name} ${Math.round(pc)}%` : '';
    d.title = `${s.name}: ${pc.toFixed(1)}% of the molecules`;
  });
  const prodPc = r.species.reduce((a, s, i) => a + (s.nu > 0 ? n[i] : 0), 0) / tot * 100;
  $('#compNote').textContent = `${Math.round(prodPc)}% products, by number of molecules`;
}

function renderPauseCard() {
  const card = $('#pauseCard');
  const show = !S.running && S.stepLeft <= 0 && sim.t > 0.5;
  card.hidden = !show;
  if (!show) return;
  const e = chamber.recent(sim.t, 4), change = recentChange(4);
  const eq = S.status === 'eq';
  if (presenting() || chamber.w < 560) {
    // On the board, or a phone: the same facts, in as few words as possible.
    card.innerHTML = `<h4>${eq ? 'Paused at equilibrium' : 'Paused'}</h4>` +
      `<p><b>Forward:</b> ${e.f ? `still happening (${e.f} in 4 s)` : 'none in 4 s'}</p><p><b>Reverse:</b> ${e.r ? `still happening (${e.r} in 4 s)` : 'none in 4 s'}</p>` +
      `<p><b>${eq ? 'Concentrations constant' : 'Concentrations changing'}</b></p>`;
    return;
  }
  card.innerHTML = `<h4>${eq ? 'Paused at dynamic equilibrium' : 'Paused: not at equilibrium yet'}</h4>` +
    `<p><b>Forward reaction:</b> ${e.f ? `still happening, ${e.f} in the last 4 s (solid rings)` : 'none in the last 4 s'}</p>` +
    `<p><b>Reverse reaction:</b> ${e.r ? `still happening, ${e.r} in the last 4 s (dashed rings)` : 'none in the last 4 s'}</p>` +
    (eq ? `<p><b>Forward rate ≈ reverse rate</b></p><p><b>Concentrations:</b> constant${change < 0.01 ? ' (changed by less than 1% in the last 4 s)' : ''}</p>`
        : `<p><b>Concentrations:</b> still changing (by up to ${Math.max(1, Math.round(change * 100))}% in the last 4 s)</p>`);
}
// Largest relative change in any concentration over the last `win` seconds.
function recentChange(win) {
  const h = S.hist; if (!h || h.t.length < 2) return 0;
  let i = h.t.length - 1; while (i > 0 && h.t[i] > sim.t - win) i--;
  let m = 0;
  rx().species.forEach(s => {
    const a = h.cols[s.k], now = a[a.length - 1], then = a[i];
    const ref = Math.max(now, then, 1e-6);
    m = Math.max(m, Math.abs(now - then) / ref);
  });
  return m;
}

let lastGraph = 0;
function renderGraphs(force) {
  const now = performance.now();
  if (!S.hist || (!force && (S.graphPaused || now - lastGraph < 100))) return;
  lastGraph = now;
  const r = rx();
  const series = r.species.map(s => ({ key: s.k, label: `[${s.name}]`, color: col(s.k), dash: s.nu < 0 ? [7, 4] : null, width: 2.4 }));
  concChart.draw({ data: S.hist, series, markers: S.markers, t0: S.graphT0, now: sim.t });
  if (!$('#rateCard').hidden) {
    rateChart.draw({ data: S.hist, t0: S.graphT0, now: sim.t, markers: S.markers, series: [
      { key: 'ef', color: P.EVENT.f, faint: true, width: 1.2 },
      { key: 'er', color: P.EVENT.r, faint: true, width: 1.2 },
      { key: 'mf', label: 'forward', color: P.EVENT.f, width: 2.8 },
      { key: 'mr', label: 'reverse', color: P.EVENT.r, width: 2.8, dash: [7, 4] }
    ] });
  }
}

let lastAria = 0;
function renderAria() {
  const now = performance.now(); if (now - lastAria < 2500) return; lastAria = now;
  const r = rx(), counts = r.species.map(s => `${chamber.count(s.k)} ${s.name}`).join(', ');
  const e = chamber.recent(sim.t, 3);
  $('#chamberCv').setAttribute('aria-label', `Reaction chamber for ${r.short}: ${counts}. In the last 3 seconds ${e.f} forward and ${e.r} reverse reactions. Status: ${S.status === 'eq' ? 'dynamic equilibrium' : S.status === 'approach' ? 'approaching equilibrium' : 'reacting'}.`);
}

function drawAll(force) {
  // Drawn while the page had no size (opened in a background tab): measure again.
  if (chamber.w < 2 && $('#chamberCv').clientWidth > 2) { resizeAll(); return; }
  const paused = !S.running && S.stepLeft <= 0;
  chamber.draw({ paused: paused && sim.t > 0.5, simT: sim.t });
  $('.ind-row.f').classList.toggle('on', chamber.flash.f > 0.4);
  $('.ind-row.r').classList.toggle('on', chamber.flash.r > 0.4);
  $('#clock').textContent = f1(sim.t);
  renderRates(force);
  renderComposition();
  renderGraphs(force);
  renderPauseCard();
  renderAria();
  syncConditions();
  if (alevel()) renderALevel(force);
  if (!$('#haberCard').hidden) renderHaber(force);
}

/* ════════════════════════ 5. changing the conditions ════════════════════════ */
function chunk() { return Math.max(6, Math.round(S.total0 * 0.12)); }

function applyChange(key) {
  const r = rx(), before = { K: sim.k().K };
  let label = '';
  const addTo = (i, num) => {
    const k = r.species[i].k;
    if (num > 0) { chamber.add(k, num); sim.addSpecies(i, num / r.scale); }
    else { const done = chamber.remove(k, -num); sim.addSpecies(i, -done / r.scale); }
  };
  switch (key) {
    case 'addR': addTo(firstIdx(-1), chunk()); label = `+${r.species[firstIdx(-1)].name}`; break;
    case 'remR': addTo(firstIdx(-1), -Math.min(chunk(), Math.round(sim.n[firstIdx(-1)] * r.scale))); label = `−${r.species[firstIdx(-1)].name}`; break;
    case 'addP': addTo(firstIdx(1), chunk()); label = `+${r.species[firstIdx(1)].name}`; break;
    case 'remP': addTo(firstIdx(1), -Math.min(chunk(), Math.round(sim.n[firstIdx(1)] * r.scale))); label = `−${r.species[firstIdx(1)].name}`; break;
    case 'heat': sim.setT(sim.T + r.Tstep); label = 'hotter'; break;
    case 'cool': sim.setT(sim.T - r.Tstep); label = 'cooler'; break;
    case 'pUp': sim.setVStep(sim.vStep + 1); label = 'p ↑'; break;
    case 'pDown': sim.setVStep(sim.vStep - 1); label = 'p ↓'; break;
    case 'cat': sim.setCat(!sim.cat); label = sim.cat ? 'catalyst' : 'no catalyst'; break;
  }
  const Kafter = sim.k().K, Q = sim.Q();
  const dir = Q < Kafter * 0.995 ? 'products' : Q > Kafter * 1.005 ? 'reactants' : 'none';
  S.markers.push({ t: sim.t, label });
  newSegment(key === 'cat' && !sim.cat ? 'Catalyst removed' : C.CHANGES[key].label);
  const ex = key === 'cat' && !sim.cat
    ? { head: 'Catalyst removed', body: ['Both reactions slow down by the same factor. The equilibrium position does not change.'] }
    : C.explain(key, { rx: r, exo: sim.exo, level: S.level, Kbefore: before.K, Kafter });
  showExplain(ex);
  if (key === 'cat' && sim.cat) showCatalyst();
  updateStatus(true);
  drawAll(true);
  return { dir, Kbefore: before.K, Kafter };
}

// A change starts a new stretch: the next equilibrium is timed from here and
// gets its own row in the Kc log, even if nothing needs to shift.
function newSegment(cause) { S.cause = cause; S.status = 'react'; S.eq = null; S.logRow = null; }

function showExplain(ex, hint) {
  const box = $('#explain');
  if (!ex && !hint) { box.hidden = true; return; }
  box.hidden = false;
  box.innerHTML = ex ? `<h4>${ex.head}</h4>${ex.body.map(p => `<p>${p}</p>`).join('')}` : `<p>${hint}</p>`;
  if (ex && presenting()) toast(ex.head);
}

let toastT = 0;
function toast(text) {
  let t = $('#toast');
  if (!t) { t = document.createElement('div'); t.id = 'toast'; t.className = 'toast'; t.setAttribute('role', 'status'); $('#chamberStage').appendChild(t); }
  t.textContent = text; t.hidden = false;
  clearTimeout(toastT); toastT = setTimeout(() => { t.hidden = true; }, 7000);
}

/* ════════════════════════ 6. predict → change → observe ════════════════════════ */
function fillPredictChanges() {
  const r = rx(), sel = $('#pChange'), cur = sel.value;
  const opts = C.PREDICT_CHANGES.map(k => {
    let lab = C.CHANGES[k].label;
    if (k === 'addR') lab = `Increase the concentration of ${r.species[firstIdx(-1)].name}`;
    if (k === 'remP') lab = `Decrease the concentration of ${r.species[firstIdx(1)].name}`;
    if (k === 'cat') lab = sim.cat ? 'Add a catalyst (remove it first)' : 'Add a catalyst';
    const off = (k === 'heat' && sim.T >= r.Tmax - 0.5) || (k === 'cool' && sim.T <= r.Tmin + 0.5) || (k === 'pUp' && sim.vStep >= M.V_STEPS.length - 1) ||
      (k === 'pDown' && sim.vStep <= 0) || (k === 'cat' && sim.cat) || (k === 'remP' && sim.n[firstIdx(1)] * r.scale < 1);
    return `<option value="${k}"${off ? ' disabled' : ''}>${lab}</option>`;
  });
  sel.innerHTML = `<option value="">Choose…</option>` + opts.join('');
  if (cur && sel.querySelector(`option[value="${cur}"]:not([disabled])`)) sel.value = cur;
  syncPredictBtn();
}
function pickSeg(seg, v) { $$(`${seg} button`).forEach(b => b.setAttribute('aria-pressed', String(b.dataset.v === v))); }
function segVal(seg) { const b = $(`${seg} button[aria-pressed="true"]`); return b ? b.dataset.v : null; }
function syncPredictBtn() { $('#pReveal').disabled = !($('#pChange').value && segVal('#pPos')); }

$('#pChange').addEventListener('change', syncPredictBtn);
['#pPos', '#pSpeed'].forEach(seg => $(seg).addEventListener('click', e => {
  const b = e.target.closest('button'); if (!b) return;
  const on = b.getAttribute('aria-pressed') === 'true';
  pickSeg(seg, on && seg === '#pSpeed' ? null : b.dataset.v);
  syncPredictBtn();
}));

const SPEED_OUTCOME = { heat: 'faster', cool: 'slower', cat: 'faster', pUp: 'faster', pDown: 'slower' };
const POS_TEXT = { products: 'more products', reactants: 'more reactants', none: 'no change in the position of equilibrium' };

$('#pReveal').addEventListener('click', () => {
  const key = $('#pChange').value; if (!key) return;
  const pos = segVal('#pPos'), speed = segVal('#pSpeed');
  const prodI = firstIdx(1), reactI = firstIdx(-1);
  const before = { c: sim.conc(), t: sim.t, wasEq: S.status === 'eq' };
  const res = applyChange(key);
  S.predict = { key, pos, speed, before, dir: res.dir, prodI, reactI, done: false, tStart: sim.t };
  setRunning(true);
  $('#pStep1').hidden = true; $('#pStep2').hidden = false;
  renderPredict();
});
$('#pAgain').addEventListener('click', () => {
  S.predict = null;
  $('#pStep1').hidden = false; $('#pStep2').hidden = true;
  pickSeg('#pPos', null); pickSeg('#pSpeed', null); fillPredictChanges();
});

function predictObserve() {
  const p = S.predict; if (!p || p.done) return;
  if (sim.t - p.tStart < 0.2 && p.dir !== 'none') return;
  p.done = true; p.after = sim.conc(); p.took = S.eqTime;
  renderPredict();
}
function renderPredict() {
  const p = S.predict; if (!p) return;
  const r = rx(), ex = C.explain(p.key, { rx: r, exo: sim.exo, level: S.level });
  const sp = SPEED_OUTCOME[p.key];
  const yours = `<b>Your prediction:</b> ${POS_TEXT[p.pos]}${p.speed ? `; equilibrium reached ${p.speed === 'faster' ? 'faster' : 'more slowly'}` : ''}.`;
  const what = `<b>What the model does:</b> ${POS_TEXT[p.dir]}${sp ? `; equilibrium reached ${sp === 'faster' ? 'faster' : 'more slowly'}, because every reaction is ${sp === 'faster' ? 'faster' : 'slower'}` : ''}.`;
  let obs;
  const P0 = p.before.c[p.prodI], name = r.species[p.prodI].name;
  if (!p.done) obs = `<p class="obs">Watching… the chamber is responding. [${name}] was ${sig(P0)} mol dm⁻³.</p>`;
  else {
    const P1 = p.after[p.prodI];
    obs = `<p class="obs">Observed: back at dynamic equilibrium after ${f1(p.took || 0)} s. [${name}] went from ${sig(P0)} to ${sig(P1)} mol dm⁻³` +
      (Math.abs(P1 / P0 - 1) < 0.01 ? ' (unchanged, apart from any direct change you made to it).' : '.') + `</p>`;
    if (p.key === 'pUp' || p.key === 'pDown') obs += `<p class="note">Squeezing or expanding the gas changes every concentration at once. Compare the composition bar before and after, which counts molecules.</p>`;
  }
  $('#pResult').innerHTML = `<div class="result"><h4>${ex.head}</h4><p class="yours">${yours}<br>${what}</p>${obs}${ex.body.map(t => t ? `<p>${t}</p>` : '').join('')}</div>`;
}

/* ════════════════════════ 7. catalyst & Haber ════════════════════════ */
function showCatalyst() {
  const r = rx(), n0 = S.mixAmts || sim.n;
  const a = M.timeToEq(r, n0, sim.V, sim.T, sim.exo, false), b = M.timeToEq(r, n0, sim.V, sim.T, sim.exo, true);
  const pi = firstIdx(1), name = r.species[pi].name;
  const tr = x => ({ tEq: x.tEq, trace: x.trace.map(p => [p[0], p[1][pi]]) });
  $('#catCard').hidden = false;
  S.catData = { a: tr(a), b: tr(b), label: `[${name}]` };
  drawCatChart();
  const comp = x => r.species.map((s, i) => `${s.name} ${sig(x.c[i])}`).join(', ');
  $('#catGrid').innerHTML =
    `<div>Without catalyst<br>equilibrium reached<b>${a.tEq === null ? 'over 300 s' : f1(a.tEq) + ' s'}</b></div>` +
    `<div>With catalyst<br>equilibrium reached<b>${b.tEq === null ? 'over 300 s' : f1(b.tEq) + ' s'}</b></div>` +
    `<div class="same">Final equilibrium composition<b>UNCHANGED</b><span class="note" style="display:block">Without: ${comp(a)}<br>With: ${comp(b)} mol dm⁻³</span></div>`;
}
function drawCatChart() {
  if (!S.catData || $('#catCard').hidden) return;
  G.drawCatalyst($('#catCv'), { a: S.catData.a, b: S.catData.b, label: S.catData.label, font: chartFont() * 0.92, color: col(rx().species[firstIdx(1)].k) });
}

let lastHaber = 0;
function renderHaber(force) {
  const now = performance.now(); if (!force && now - lastHaber < 500) return; lastHaber = now;
  const r = rx();
  const Ts = []; for (let T = r.Tmin; T <= r.Tmax + 0.1; T += 12.5) Ts.push(T);
  const yieldAt = T => { const n = M.solveEq(r, sim.n, sim.V, M.Kc_T(r, T, true)); return n[2] / n.reduce((a, b) => a + b, 0) * 100; };
  const ref = M.kf_T(r, 723, true, true);
  const yields = Ts.map(yieldAt), rates = Ts.map(T => M.kf_T(r, T, true, sim.cat) / ref);
  G.drawCompromise($('#haberCv'), { T: Ts, yieldPct: yields, rate: rates, Tnow: sim.T, font: chartFont() * 0.92, unitC: true });
  const yNow = yieldAt(sim.T), eNow = sim.n[2] / sim.nTotal() * 100;
  $('#haberKpis').innerHTML =
    `<div>NH₃ at equilibrium<b>${Math.round(yNow)}%</b></div>` +
    `<div>NH₃ now<b>${Math.round(eNow)}%</b></div>` +
    `<div>Time to equilibrium<b>${S.status === 'eq' && S.eqTime !== null ? f1(S.eqTime) + ' s' : '…'}</b></div>`;
}

/* ════════════════════════ 8. A-level panels ════════════════════════ */
const nameC = s => `[${s.name}]`;
function kcExpr(r, fill) {
  const part = sign => r.species.filter(s => Math.sign(s.nu) === sign)
    .map(s => fill ? `(${fill(s)})${Math.abs(s.nu) > 1 ? sup(Math.abs(s.nu)) : ''}` : `${nameC(s)}${Math.abs(s.nu) > 1 ? sup(Math.abs(s.nu)) : ''}`).join(fill ? ' × ' : '');
  return `<span class="frac"><span>${part(1)}</span><span>${part(-1)}</span></span>`;
}
function kcUnits(r, unit = 'mol dm⁻³') {
  const d = M.dn(r);
  if (d === 0) return 'no units';
  if (unit === 'kPa') return `kPa${sup(d < 0 ? '-' + -d : d)}`;
  return d < 0 ? `mol${sup('-' + -d)} dm${sup(3 * -d)}` : `mol${sup(d)} dm${sup('-' + 3 * d)}`;
}

let lastA = 0;
function renderALevel(force) {
  const now = performance.now(); if (!force && now - lastA < 300) return; lastA = now;
  renderKc(); renderQ(); renderKp(); renderIce(); renderLog(force);
  const ch = S.challenge;
  if (ch && ch.loaded && !ch.eqShown && S.status === 'eq' && imbalance().imb < 0.004) renderChallenge();
}

function renderKc() {
  const r = rx(), eq = S.status === 'eq' ? S.eq : null, k = sim.k();
  let h = '';
  if (!eq) h += `<p class="wait">Not at equilibrium yet. Kc needs the equilibrium concentrations: let the chamber settle.</p>`;
  const shown = eq || S.lastEq;
  if (shown) {
    h += `<table class="kv"><tr><th>Equilibrium concentration</th><th class="n">mol dm⁻³</th></tr>` +
      r.species.map((s, i) => `<tr><td>${nameC(s)}<sub>eq</sub></td><td class="n">${sig(shown.c[i])}</td></tr>`).join('') + `</table>`;
    h += `<p class="expr">Kc = ${kcExpr(r)}</p>`;
    h += `<p class="kbig">Kc = ${sig(shown.K)} <small>${kcUnits(r)}</small></p>`;
    h += `<p class="note">at ${tempText(shown.T, true)}${eq ? '' : ' (the last equilibrium reached)'}. Check: k<sub>f</sub> / k<sub>r</sub> = ${sig(M.Kc_T(r, shown.T, sim.exo))}.</p>`;
    $('#kcWork').innerHTML = `<p>Kc = ${kcExpr(r)}</p><p>= ${kcExpr(r, s => sig(shown.c[r.species.indexOf(s)]))}</p><p>= <b>${sig(shown.K)}</b> ${kcUnits(r) === 'no units' ? '(no units)' : kcUnits(r)}</p>` +
      `<p class="note">Units: ${unitWorking(r)}. Worked with the unrounded concentrations.</p>`;
  } else $('#kcWork').innerHTML = '<p>Reach equilibrium first.</p>';
  $('#kcBody').innerHTML = h;
}
function unitWorking(r) {
  const top = C.gasMoles(r, 1), bot = C.gasMoles(r, -1);
  return `(mol dm⁻³)${top > 1 ? sup(top) : ''} / (mol dm⁻³)${bot > 1 ? sup(bot) : ''} = ${kcUnits(r)}`;
}

function renderQ() {
  const r = rx(), c = sim.conc(), Q = sim.Q(), K = sim.k().K;
  const ratio = Q / K;
  const cmp = Math.abs(Math.log(ratio)) < Math.log(1 + M.EQ_TOL) ? '=' : ratio < 1 ? '<' : '>';
  const verdict = cmp === '=' ? 'Q = Kc: at equilibrium' : cmp === '<' ? 'Q < Kc: net forward reaction' : 'Q > Kc: net reverse reaction';
  $('#qBody').innerHTML = `<p class="expr">Q = ${kcExpr(r, s => sig(c[r.species.indexOf(s)]))} = <b>${isFinite(Q) ? sig(Q) : '∞'}</b></p>` +
    `<p class="note">Kc at ${tempText(sim.T)} = ${sig(K)}</p><p class="qcmp">${verdict}</p>`;
  // Log scale from Kc/100 to Kc×100.
  const pos = v => clamp((Math.log10(v / K) + 2) / 4, 0, 1) * 100;
  const q = isFinite(Q) && Q > 0 ? pos(Q) : Q === 0 ? 0 : 100;
  $('.q-k').style.left = '50%'; $('.q-lab-k').style.left = '50%';
  $('.q-q').style.left = q + '%'; $('.q-lab-q').style.left = q + '%';
}

function renderKp(force) {
  const r = rx();
  const gas = !r.generic;
  $('#kpBtns').hidden = !gas;
  if (!gas) {
    $('#kpBody').innerHTML = `<p class="note">Kp is shown for the real gas equilibria. Choose H₂ + I₂ ⇌ 2HI or N₂ + 3H₂ ⇌ 2NH₃.</p>`;
    $('#kpPart').hidden = true; $('#kpWork').hidden = true;
    return;
  }
  const n = sim.n, nt = sim.nTotal(), Pt = sim.pressure();
  const x = n.map(v => v / nt), p = x.map(v => v * Pt);
  const eq = S.status === 'eq';
  const Kp = r.species.reduce((a, s, i) => a * Math.pow(p[i], s.nu), 1);
  $('#kpBody').innerHTML = `<table class="kv"><tr><th>Total pressure</th><td class="n">${fmtInt(Pt)} kPa</td></tr><tr><th>Total amount of gas</th><td class="n">${sig(nt)} mol</td></tr></table>` +
    `<p class="expr">Kp = <span class="frac"><span>${r.species.filter(s => s.nu > 0).map(s => `p(${s.name})${s.nu > 1 ? sup(s.nu) : ''}`).join(' ')}</span><span>${r.species.filter(s => s.nu < 0).map(s => `p(${s.name})${-s.nu > 1 ? sup(-s.nu) : ''}`).join(' ')}</span></span></p>` +
    (eq ? `<p class="kbig">Kp = ${sig(Kp)} <small>${kcUnits(r, 'kPa')}</small></p><p class="note">at ${tempText(sim.T, true)}. Change the pressure and watch the composition move while Kp stays put.</p>`
        : `<p class="wait">Not at equilibrium: the ratio of partial pressures now is ${sig(Kp)}, not Kp.</p>`);
  $('#kpPart').innerHTML = `<table class="kv"><tr><th>Gas</th><th class="n">amount / mol</th><th class="n">mole fraction</th><th class="n">p / kPa</th></tr>` +
    r.species.map((s, i) => `<tr><td>${s.name}</td><td class="n">${sig(n[i])}</td><td class="n">${sig(x[i])}</td><td class="n">${fmtInt(p[i])}</td></tr>`).join('') +
    `<tr><td><b>Total</b></td><td class="n">${sig(nt)}</td><td class="n">1.00</td><td class="n">${fmtInt(Pt)}</td></tr></table>` +
    `<p class="note">Partial pressure = mole fraction × total pressure. Total pressure = nRT / V, with V = ${sig(sim.V)} dm³ and T = ${Math.round(sim.T)} K.</p>`;
  $('#kpWork').innerHTML = `<p>Kp = <span class="frac"><span>${r.species.filter(s => s.nu > 0).map(s => `(${Math.round(p[r.species.indexOf(s)])})${s.nu > 1 ? sup(s.nu) : ''}`).join(' × ')}</span><span>${r.species.filter(s => s.nu < 0).map(s => `(${Math.round(p[r.species.indexOf(s)])})${-s.nu > 1 ? sup(-s.nu) : ''}`).join(' × ')}</span></span></p>` +
    `<p>= <b>${sig(Kp)}</b> ${kcUnits(r, 'kPa')}</p><p class="note">Units: kPa${sup(C.gasMoles(r, 1))} / kPa${sup(C.gasMoles(r, -1))} = ${kcUnits(r, 'kPa')}. ${eq ? '' : 'The chamber is not at equilibrium, so this is not yet Kp.'}</p>`;
}

/* ICE table: initial = the mixture after the last reset or change;
   equilibrium = what the chamber settled at. One product concentration is given. */
let iceKey = '';
function renderIce(force) {
  const r = rx(), have = S.ice && S.ice.rx === r.id ? S.ice : null;
  const eq = have ? { c: have.ceq } : null, c0 = have ? have.c0 : sim.segC0;
  const key = r.id + ':' + c0.map(v => v.toFixed(5)).join(',') + ':' + (eq ? 'eq' : 'no');
  if (!force && key === iceKey) return;
  iceKey = key;
  const pi = firstIdx(1), nuP = r.species[pi].nu;
  let x = eq ? (eq.c[pi] - c0[pi]) / nuP : null;
  const sgn = x !== null && x < 0 ? -1 : 1;
  const chg = s => { const k = s.nu * sgn, a = Math.abs(k); return `${k < 0 ? '−' : '+'}${a > 1 ? a : ''}x`; };
  const eqRow = (s, i) => { const k = s.nu * sgn, a = Math.abs(k); return `${sig(c0[i])} ${k < 0 ? '−' : '+'} ${a > 1 ? a : ''}x`; };
  let h = `<p class="note" style="margin-top:0">Initial: the mixture ${!have ? 'now' : /^(Start|Reset|Challenge)/.test(have.cause) ? 'at the start' : `just after “${have.cause.toLowerCase()}”`}, before it shifted. All values in mol dm⁻³.</p>` +
    `<div class="table-wrap"><table class="ice"><tr><th></th>${r.species.map(s => `<th>${nameC(s)}</th>`).join('')}</tr>` +
    `<tr><td class="row">Initial</td>${r.species.map((s, i) => `<td>${sig(c0[i])}</td>`).join('')}</tr>` +
    `<tr><td class="row">Change</td>${r.species.map(s => `<td>${chg(s)}</td>`).join('')}</tr>` +
    `<tr><td class="row">Equilibrium</td>${r.species.map((s, i) => `<td${i === pi && eq ? ' class="given"' : ''}>${i === pi && eq ? sig(eq.c[i]) : eqRow(s, i)}</td>`).join('')}</tr></table></div>`;
  if (!eq) { $('#iceBody').innerHTML = h + `<p class="wait">Run the chamber to equilibrium to set the question.</p>`; return; }
  x = Math.abs(x);
  const Kc = r.species.reduce((a, s, i) => a * Math.pow(eq.c[i], s.nu), 1);
  h += `<p>At equilibrium ${nameC(r.species[pi])} = <b>${sig(eq.c[pi])}</b> mol dm⁻³. Find x, then Kc.</p>` +
    `<div class="try"><label for="iceX">x =</label><input type="number" id="iceX" step="any" inputmode="decimal">` +
    `<label for="iceK">Kc =</label><input type="number" id="iceK" step="any" inputmode="decimal"></div>` +
    `<div class="row-btns"><button class="btn sm" type="button" id="iceCheck">Check</button><button class="btn sm" type="button" id="iceReveal">Reveal</button></div><div id="iceFb"></div>`;
  $('#iceBody').innerHTML = h;
  const eqVals = r.species.map((s, i) => c0[i] + s.nu * sgn * x);
  $('#iceCheck').addEventListener('click', () => {
    const vx = parseFloat($('#iceX').value), vk = parseFloat($('#iceK').value), out = [];
    if (!isNaN(vx)) out.push(Math.abs(vx / x - 1) < 0.02 ? '<p class="fb ok">x is right.</p>' : `<p class="fb bad">Not x yet: x = change in ${nameC(r.species[pi])} ÷ ${Math.abs(nuP)}.</p>`);
    if (!isNaN(vk)) out.push(Math.abs(vk / Kc - 1) < 0.03 ? '<p class="fb ok">Kc is right.</p>' : '<p class="fb bad">Not Kc yet: work out every equilibrium concentration, then substitute into the Kc expression.</p>');
    $('#iceFb').innerHTML = out.join('') || '<p class="fb">Type an answer first.</p>';
  });
  $('#iceReveal').addEventListener('click', () => {
    $('#iceFb').innerHTML = `<div class="working"><p>x = (${sig(eq.c[pi])} − ${sig(c0[pi])}) ÷ ${nuP} = <b>${sig(x)}</b> mol dm⁻³</p>` +
      `<p>${r.species.map((s, i) => `${nameC(s)} = ${sig(eqVals[i])}`).join(', ')}</p>` +
      `<p>Kc = ${kcExpr(r, s => sig(eqVals[r.species.indexOf(s)]))} = <b>${sig(Kc)}</b> ${kcUnits(r) === 'no units' ? '' : kcUnits(r)}</p></div>`;
  });
}

// Each equilibrium the chamber reaches becomes a row; the current row keeps
// updating while the chamber stays at equilibrium, so its Kc settles.
function logEquilibrium(isNew) {
  const r = rx(), c = sim.conc(), K = sim.Q();
  const Pt = sim.pressure(), x = sim.n.map(v => v / sim.nTotal());
  const Kp = r.generic ? null : r.species.reduce((a, s, i) => a * Math.pow(x[i] * Pt, s.nu), 1);
  S.eq = { c, K, T: sim.T, t: sim.t, Kp };
  S.lastEq = S.eq;
  // The ICE table uses the last stretch in which the mixture actually had to shift.
  if (isNew) {
    const Q0 = M.quotient(r, sim.segC0);
    if (!(Math.abs(Math.log(Q0 / K)) < 0.1)) S.ice = { rx: r.id, c0: sim.segC0.slice(), ceq: c.slice(), cause: S.cause };
  }
  if (isNew || !S.logRow) {
    S.logRow = { rx: r.id, cause: S.cause, T: sim.T, c, K, Kp, cat: sim.cat, p: Pt };
    S.log.push(S.logRow);
    if (S.log.length > 30) S.log.shift();
  } else Object.assign(S.logRow, { c, K, Kp, p: Pt });
  renderLog(isNew);
}
let lastLog = 0;
function renderLog(force) {
  const now = performance.now(); if (!force && now - lastLog < 500) return; lastLog = now;
  const r = rx(), rows = S.log.filter(l => l.rx === r.id);
  if (!rows.length) { $('#kcLog').innerHTML = '<tr><td class="note">Nothing yet: run the chamber to equilibrium.</td></tr>'; return; }
  const gas = !r.generic;
  let h = `<tr><th>#</th><th>What happened</th><th>T</th>${r.species.map(s => `<th>${nameC(s)}</th>`).join('')}<th>Kc</th>${gas ? '<th>Kp' + (M.dn(r) ? ' / ' + kcUnits(r, 'kPa') : '') + '</th>' : ''}<th>Kc compared with the row above</th></tr>`;
  rows.forEach((l, i) => {
    const prev = rows[i - 1], changed = prev && Math.abs(l.K / prev.K - 1) > 0.02;
    h += `<tr class="${changed ? 'changed' : ''}"><td>${i + 1}</td><td>${l.cause}</td><td>${Math.round(l.T)} K</td>${l.c.map(v => `<td>${sig(v)}</td>`).join('')}` +
      `<td class="k">${sig(l.K)}</td>${gas ? `<td>${sig(l.Kp)}</td>` : ''}<td>${!prev ? '' : changed ? (Math.abs(l.T - prev.T) > 0.5 ? 'changed: new temperature' : 'changed') : 'the same'}</td></tr>`;
  });
  $('#kcLog').innerHTML = h;
}

/* The challenge: a random H₂ / I₂ / HI mixture at 700 K. */
function newChallenge() {
  const r = M.REACTIONS.hi, K = M.Kc_T(r, r.T0, true);
  let c, Q;
  // Choose the answer first, so forward and reverse come up about equally often.
  const rev = Math.random() < 0.5;
  const pick = (lo, hi) => Math.round((lo + Math.random() * (hi - lo)) * 100) / 100;
  for (let tries = 0; tries < 2000; tries++) {
    c = rev ? [pick(0.05, 0.25), pick(0.05, 0.25), pick(0.5, 1.1)] : [pick(0.1, 0.9), pick(0.1, 0.9), pick(0.05, 0.9)];
    if (c[0] + c[1] + c[2] > 1.6) continue;
    Q = c[2] * c[2] / (c[0] * c[1]);
    if (rev ? Q / K < 2.5 : Q / K > 0.4) continue;
    // Keep every substance visible in the chamber at equilibrium (at least a few particles).
    if (Math.min(...M.solveEq(r, c, 1, K)) >= 0.05) break;
  }
  S.challenge = { c, Q, K, dir: Q < K ? 'f' : 'r', step: 1, score: 0, answers: {}, loaded: false };
  renderChallenge();
}
function renderChallenge() {
  const ch = S.challenge; if (!ch) return newChallenge();
  const [h2, i2, hi] = ch.c;
  const done = k => ch.answers[k] !== undefined;
  const mark = (k, ok) => done(k) ? `<p class="fb ${ch.answers[k] ? 'ok' : 'bad'}">${ok}</p>` : '';
  // Step 5 waits until the mixture has fully settled, so Kc comes out at its true value.
  const eqNow = ch.loaded && S.status === 'eq' && rx().id === 'hi' && S.eq && imbalance().imb < 0.004;
  ch.eqShown = !!eqNow;
  let h = `<p>A sealed 1.00 dm³ vessel at 700 K starts with <b>[H₂] = ${h2.toFixed(2)}</b>, <b>[I₂] = ${i2.toFixed(2)}</b> and <b>[HI] = ${hi.toFixed(2)}</b> mol dm⁻³. At 700 K, Kc = ${sig(ch.K)}.</p><ol class="ch-steps">`;
  h += `<li><b class="stepn">1</b>Predict: which way will the reaction go?<div class="inline">` +
    ['f', 'r'].map(d => `<button class="btn sm" type="button" data-ch="p1" data-v="${d}"${done('p1') ? ' disabled' : ''}>${d === 'f' ? 'Forward: more HI' : 'Reverse: more H₂ and I₂'}</button>`).join('') + `</div>${mark('p1', ch.answers.p1 ? 'Good instinct. Now check it with Q.' : 'Check it with Q in the next step.')}</li>`;
  h += `<li><b class="stepn">2</b>Calculate Q.<div class="inline"><input type="number" step="any" id="chQ" aria-label="Q" ${done('q') ? 'disabled' : ''}><button class="btn sm" type="button" data-ch="q"${done('q') ? ' disabled' : ''}>Check</button></div>` +
    mark('q', ch.answers.q ? `Q = ${hi.toFixed(2)}² / (${h2.toFixed(2)} × ${i2.toFixed(2)}) = ${sig(ch.Q)}` : `Q = [HI]² / [H₂][I₂] = ${hi.toFixed(2)}² / (${h2.toFixed(2)} × ${i2.toFixed(2)}) = ${sig(ch.Q)}`) + `</li>`;
  h += `<li><b class="stepn">3</b>Compare Q with Kc. Which way does the reaction go?<div class="inline">` +
    ['f', 'r'].map(d => `<button class="btn sm" type="button" data-ch="p3" data-v="${d}"${done('p3') ? ' disabled' : ''}>${d === 'f' ? 'Q < Kc: forward' : 'Q > Kc: reverse'}</button>`).join('') + `</div>` +
    mark('p3', ch.dir === 'f' ? `Right: Q (${sig(ch.Q)}) < Kc (${sig(ch.K)}), so a net forward reaction makes more HI.` : `Q (${sig(ch.Q)}) > Kc (${sig(ch.K)}), so a net reverse reaction makes more H₂ and I₂.`) + `</li>`;
  h += `<li><b class="stepn">4</b>Run it. <div class="inline"><button class="btn sm primary" type="button" data-ch="run">${ch.loaded ? 'Run it again' : 'Load into the chamber and run'}</button></div>` +
    (ch.loaded ? `<p class="note">${eqNow ? 'At equilibrium.' : S.status === 'eq' ? 'At equilibrium; letting it settle completely…' : 'Running… watch Q in the Q panel move towards Kc.'}</p>` : '') + `</li>`;
  if (eqNow) {
    const cs = S.eq.c.map(v => +sig(v)), kc = cs[2] * cs[2] / (cs[0] * cs[1]);
    ch.kcTarget = kc;
    h += `<li><b class="stepn">5</b>At equilibrium: [H₂] = ${sig(S.eq.c[0])}, [I₂] = ${sig(S.eq.c[1])}, [HI] = ${sig(S.eq.c[2])} mol dm⁻³. Calculate Kc.` +
      `<div class="inline"><input type="number" step="any" id="chK" aria-label="Kc" ${done('k') ? 'disabled' : ''}><button class="btn sm" type="button" data-ch="k"${done('k') ? ' disabled' : ''}>Check</button></div>` +
      mark('k', `Kc = ${sig(S.eq.c[2])}² / (${sig(S.eq.c[0])} × ${sig(S.eq.c[1])}) = ${sig(kc)}. The same Kc as at the start, whatever the mixture.`) + `</li>`;
  } else h += `<li><b class="stepn">5</b>Calculate Kc once the chamber reaches equilibrium.</li>`;
  const got = Object.values(ch.answers).filter(Boolean).length, asked = Object.keys(ch.answers).length;
  h += `</ol><div class="row-btns"><span class="ch-score">Score: ${got} / ${asked || 0}</span><button class="btn sm" type="button" data-ch="new">New challenge</button></div>`;
  $('#chBody').innerHTML = h;
}
$('#chBody').addEventListener('click', e => {
  const b = e.target.closest('[data-ch]'); if (!b) return;
  const ch = S.challenge, k = b.dataset.ch;
  if (k === 'new') return newChallenge();
  if (k === 'p1') ch.answers.p1 = b.dataset.v === ch.dir;
  if (k === 'p3') ch.answers.p3 = b.dataset.v === ch.dir;
  if (k === 'q') { const v = parseFloat($('#chQ').value); if (isNaN(v)) return; ch.answers.q = Math.abs(v / ch.Q - 1) < 0.02; }
  if (k === 'k') { const v = parseFloat($('#chK').value); if (isNaN(v)) return; ch.answers.k = Math.abs(v / ch.kcTarget - 1) < 0.03; }
  if (k === 'run') {
    if (S.preset.rx !== 'hi') { S.preset = PRESETS.alevel[0]; fillPresetSelect(); }
    S.mix = 'custom'; S.customAmts = ch.c.slice();
    sim.load('hi', ch.c.slice(), { T: M.REACTIONS.hi.T0, cat: false, exo: true });
    afterLoad('Challenge mixture');
    syncMixSeg(); buildCustom();
    ch.loaded = true;
    setRunning(true);
    $('#simCard').scrollIntoView({ behavior: 'smooth', block: 'start' });
  }
  renderChallenge();
});

/* ════════════════════════ 9. background content ════════════════════════ */
function renderLearn() {
  $('#whatBody').innerHTML = C.WHAT_IS[S.level].map(p => `<p>${p}</p>`).join('');
  $('#specG').textContent = C.AQA.gcse; $('#specA').textContent = C.AQA.alevel;
  $('#misGrid').innerHTML = C.MISCONCEPTIONS.map((m, i) => (m.alevel && !alevel()) ? '' :
    `<div class="mis"><button class="claim" type="button" aria-expanded="false" data-i="${i}">${m.claim}”</button>` +
    `<div class="ans" hidden><p><span class="false">FALSE</span>${m.text}</p><button class="btn sm" type="button" data-demo="${m.demo}">${m.demoLabel}</button></div></div>`).join('');
}
$('#misGrid').addEventListener('click', e => {
  const c = e.target.closest('.claim');
  if (c) { const a = c.nextElementSibling, open = a.hidden; a.hidden = !open; c.setAttribute('aria-expanded', String(open)); return; }
  const d = e.target.closest('[data-demo]'); if (d) demo(d.dataset.demo);
});

function scrollToEl(el) { el.scrollIntoView({ behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth', block: 'center' }); }
function flashEl(el) { el.classList.remove('flash'); void el.offsetWidth; el.classList.add('flash'); }
function demo(kind) {
  if (kind === 'running' || kind === 'unequal') {
    if (rx().id === 'haber') loadPreset(PRESETS[S.level].find(p => p.rx === 'abcd'), 'reactants');
    if (S.status !== 'eq') { S.autoPause = kind === 'running'; setSpeed(2); setRunning(true); }
    else if (kind === 'running') setRunning(false);
    scrollToEl(kind === 'running' ? $('#simCard') : $('.comp'));
  } else if (kind === 'catalyst') {
    if (sim.cat) applyChange('cat');
    applyChange('cat'); setRunning(true);
    scrollToEl($('#catCard'));
  } else if (kind === 'kc') {
    setRunning(true); setSpeed(2);
    const go = () => { if (S.status === 'eq') { applyChange('addR'); scrollToEl($('#logPanel')); } else setTimeout(go, 300); };
    go();
  } else if (kind === 'temp') {
    if (!rx().generic || !sim.exo) { loadPreset(PRESETS.alevel.find(p => p.rx === 'abcd'), 'reactants'); sim.setExo(true); syncExo(); }
    setRunning(true); setSpeed(2);
    const go = () => { if (S.status === 'eq') { applyChange(sim.T >= rx().Tmax - 0.5 ? 'cool' : 'heat'); scrollToEl($('#logPanel')); } else setTimeout(go, 300); };
    go();
  }
}

/* ════════════════════════ 10. presenter mode ════════════════════════ */
function buildNarrative() {
  const slides = C.NARRATIVE.concat(alevel() ? C.NARRATIVE_A : []);
  const el = $('#narrDeck');
  const box = el.querySelector(':scope > .sst-slides') || el;
  box.innerHTML = slides.map(([h, p]) => `<section class="sst-slide"><h3>${h}</h3><p>${p}</p></section>`).join('');
  if (window.SST_PRESENT) SST_PRESENT.deck(el).refresh();
}
function chartFont() { return presenting() ? Math.round(SST_PRESENT.px('--sst-pr-label')) : 12; }
function resizeAll() {
  const z = presenting() ? Math.max(1, SST_PRESENT.px('--sst-pr-label') / 14) : 1;
  chamber.resize(z);
  concChart.resize(chartFont()); rateChart.resize(chartFont());
  drawCatChart();
  drawAll(true);
  if (!$('#haberCard').hidden) renderHaber(true);
}
function setPresenting(on) {
  document.body.classList.toggle('presenting', on);
  if (!on && document.fullscreenElement) document.exitFullscreen().catch(() => {});
  requestAnimationFrame(() => { resizeAll(); buildNarrative(); });
  (on ? $('#exitBtn') : $('#presentBtn')).focus({ preventScroll: true });
  if (on) scrollTo(0, 0);
}
$('#presentBtn').addEventListener('click', () => setPresenting(true));
$('#exitBtn').addEventListener('click', () => setPresenting(false));
$('#fullBtn').addEventListener('click', () => {
  if (document.fullscreenElement) document.exitFullscreen().catch(() => {});
  else if (document.documentElement.requestFullscreen) document.documentElement.requestFullscreen().catch(() => {});
});
document.addEventListener('fullscreenchange', () => requestAnimationFrame(resizeAll));
// The header's Annotate button opens the shared annotation layer (annotate.js).
$('#drawBtn').addEventListener('click', () => { const b = document.querySelector('.sst-bar .sst-ink-nav:not(.sst-pres-nav)'); if (b) b.click(); });

/* ════════════════════════ 11. printing ════════════════════════ */
function buildPrint() {
  const Q = C.questions();
  const mk = n => `[${n} mark${n > 1 ? 's' : ''}]`;
  const tot = qs => qs.reduce((s, q) => s + q.parts.reduce((a, p) => a + p.marks, 0), 0);
  const space = p => (p.html || '') + (p.lines ? `<div class="lines">${'<i></i>'.repeat(p.lines)}</div>` : '') + (p.ans ? `<p class="ans">${p.ans}</p>` : '');
  const ws = (qs, title, sub) => `<div class="phead"><h1>${title}</h1><div class="sub">${sub} · ${tot(qs)} marks</div></div><div class="fill"><span>Name</span><span>Class</span><span>Date</span></div>` +
    qs.map((q, i) => `<div class="q"><div class="qt"><span class="qn">${i + 1}</span><div class="stemblock">${q.stem}</div></div>${q.figure ? `<figure>${q.figure}</figure>` : ''}` +
      q.parts.map((p, j) => `<div class="part"><div class="qt"><span>(${'abcdefgh'[j]})</span><span>${p.t}</span><span class="mk">${mk(p.marks)}</span></div>${space(p)}</div>`).join('') + `</div>`).join('');
  const ms = (qs, title) => `<div class="phead"><h1>${title}</h1><div class="sub">For teachers · ${tot(qs)} marks</div></div>` +
    qs.map((q, i) => `<div class="mq"><b>Question ${i + 1}</b>` + q.parts.map((p, j) => `<div class="mq"><span class="pm">${p.marks}</span><b>(${'abcdefgh'[j]})</b>` +
      `<ul>${p.ms.map(m => `<li>${m}</li>`).join('')}</ul>${p.work ? `<div class="work">${p.work}</div>` : ''}${p.no ? `<p class="no">${p.no}</p>` : ''}</div>`).join('') + `</div>`).join('');
  $('#pWsG').innerHTML = ws(Q.GCSE, 'Reversible reactions and equilibrium', 'AQA GCSE Chemistry 8462, 4.6.2 · HT = Higher Tier');
  $('#pWsA').innerHTML = ws(Q.ALEVEL, 'Chemical equilibria, Kc and Kp', 'AQA A-level Chemistry 7405, 3.1.6 and 3.1.10');
  $('#pMsG').innerHTML = ms(Q.GCSE, 'Reversible reactions and equilibrium: mark scheme');
  $('#pMsA').innerHTML = ms(Q.ALEVEL, 'Chemical equilibria, Kc and Kp: mark scheme');
}
const dlg = $('#printDlg');
$('#printBtn').addEventListener('click', () => { $('#pOptG').checked = !alevel(); $('#pOptA').checked = alevel(); dlg.showModal(); });
$('#pCancel').addEventListener('click', () => dlg.close());
$('#pGo').addEventListener('click', () => {
  const g = $('#pOptG').checked, a = $('#pOptA').checked, m = $('#pOptMs').checked;
  if (!g && !a) { $('#pOptG').focus(); return; }
  const b = document.body.classList;
  b.add('p-set'); b.toggle('p-g', g); b.toggle('p-a', a); b.toggle('p-msg', m && g); b.toggle('p-msa', m && a);
  // Every section after the first one printed starts a new page.
  const order = [['#pWsG', g], ['#pWsA', a], ['#pMsG', m && g], ['#pMsA', m && a]].filter(x => x[1]);
  $$('#printDoc > section').forEach(s => s.classList.remove('brk'));
  order.slice(1).forEach(x => $(x[0]).classList.add('brk'));
  dlg.close();
  setTimeout(() => window.print(), 60);
});
window.addEventListener('afterprint', () => { document.body.classList.remove('p-set', 'p-g', 'p-a', 'p-msg', 'p-msa'); $$('#printDoc > section').forEach(s => s.classList.remove('brk')); });

/* ════════════════════════ 12. controls, main loop & keys ════════════════════════ */
function setRunning(on) {
  S.running = on;
  $$('[data-act="play"]').forEach(b => {
    b.querySelector('use').setAttribute('href', on ? '#i-pause' : '#i-play');
    b.querySelector('span').textContent = on ? 'Pause' : 'Play';
    b.setAttribute('aria-label', on ? 'Pause' : 'Play');
  });
  drawAll(true);
}
function setSpeed(v) {
  S.speed = v;
  $$('#speedSeg button').forEach(b => b.setAttribute('aria-pressed', String(+b.dataset.speed === v)));
}
function step() { setRunning(false); S.stepLeft = 0.25; }

document.addEventListener('click', e => {
  const a = e.target.closest('[data-act]');
  if (a) {
    const act = a.dataset.act;
    if (act === 'play') setRunning(!S.running);
    else if (act === 'step') step();
    else if (act === 'reset') { reset(); }
    return;
  }
  const c = e.target.closest('[data-change]');
  if (c && !c.disabled) { applyChange(c.dataset.change); flashEl(c); }
});
$('#speedSeg').addEventListener('click', e => { const b = e.target.closest('button'); if (b) setSpeed(+b.dataset.speed); });
$('#mixSeg').addEventListener('click', e => {
  const b = e.target.closest('button'); if (!b) return;
  S.mix = b.dataset.mix; syncMixSeg();
  if (S.mix === 'custom') { if (!S.customAmts || S.customAmts.length !== rx().species.length) S.customAmts = sim.n.map(v => v); buildCustom(); }
  else { buildCustom(); reset(); }
});
$('#exoSeg').addEventListener('click', e => {
  const b = e.target.closest('button'); if (!b) return;
  const exo = b.dataset.exo === '1'; if (exo === sim.exo) return;
  sim.setExo(exo); syncExo();
  S.markers.push({ t: sim.t, label: exo ? 'exo' : 'endo' });
  newSegment(`Forward reaction made ${exo ? 'exothermic' : 'endothermic'}`);
  showExplain({ head: `Forward reaction now ${exo ? 'exothermic' : 'endothermic'}`, body: [`ΔH = ${C.fmtdH(sim.dH())}. At ${tempText(rx().Tref)} both versions have the same equilibrium; they respond to temperature in opposite ways.`] });
  updateStatus(true);
});
$('#rxSel').addEventListener('change', () => { const p = PRESETS[S.level].find(x => x.key === $('#rxSel').value); if (p) { loadPreset(p, 'reactants'); } });
$('#rateToggle').addEventListener('change', e => {
  $('#rateCard').hidden = !e.target.checked;
  document.body.classList.toggle('show-rate', e.target.checked);
  $$('[data-sync="rateToggle"]').forEach(x => { x.checked = e.target.checked; });
  requestAnimationFrame(resizeAll);
});
$$('[data-sync="rateToggle"]').forEach(x => x.addEventListener('change', () => { $('#rateToggle').checked = x.checked; $('#rateToggle').dispatchEvent(new Event('change')); }));
$('#gPause').addEventListener('click', e => { S.graphPaused = !S.graphPaused; e.currentTarget.setAttribute('aria-pressed', String(S.graphPaused)); e.currentTarget.textContent = S.graphPaused ? 'Resume graph' : 'Pause graph'; renderGraphs(true); });
$('#gClear').addEventListener('click', () => { clearGraph(false); renderGraphs(true); });
$('#kcCalcBtn').addEventListener('click', e => toggleBox(e.currentTarget, '#kcWork'));
$('#qExplainBtn').addEventListener('click', e => toggleBox(e.currentTarget, '#qExplain'));
$('#kpPartBtn').addEventListener('click', e => toggleBox(e.currentTarget, '#kpPart'));
$('#kpCalcBtn').addEventListener('click', e => toggleBox(e.currentTarget, '#kpWork'));
function toggleBox(btn, sel) { const el = $(sel), open = el.hidden; el.hidden = !open; btn.setAttribute('aria-expanded', String(open)); }
$('#whatKBtn').addEventListener('click', () => $('#whatKDlg').showModal());
$('#whatKClose').addEventListener('click', () => $('#whatKDlg').close());

function setLevel(lvl) {
  if (lvl === S.level) return;
  S.level = lvl;
  document.body.classList.toggle('lvl-gcse', lvl === 'gcse');
  document.body.classList.toggle('lvl-alevel', lvl === 'alevel');
  $$('#levelSeg button').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.lvl === lvl)));
  $('#barUnit').textContent = 'reactions per second in the chamber, counted over the last 3 s';
  fillPresetSelect();
  loadPreset(PRESETS[lvl][0], 'reactants');
  fillPresetSelect();
  renderLearn();
  if (lvl === 'alevel' && !S.challenge) newChallenge();
  requestAnimationFrame(resizeAll);
}
$('#levelSeg').addEventListener('click', e => { const b = e.target.closest('button'); if (b) setLevel(b.dataset.lvl); });

let last = performance.now();
function frame(now) {
  const real = Math.min(0.05, (now - last) / 1000); last = now;
  let dt = 0;
  if (S.running) dt = real * S.speed;
  else if (S.stepLeft > 0) { dt = Math.min(S.stepLeft, real * S.speed); S.stepLeft -= dt; if (S.stepLeft <= 1e-6) { S.stepLeft = 0; } }
  if (dt > 0) advance(dt);
  drawAll(false);
  requestAnimationFrame(frame);
}

document.addEventListener('keydown', e => {
  if (e.ctrlKey || e.altKey || e.metaKey) return;
  const t = e.target, typing = t.closest && t.closest('input, select, textarea, dialog, [contenteditable="true"]');
  if (typing) return;
  const k = e.key;
  if (k === ' ' && !(t.closest && t.closest('button, a, summary'))) { e.preventDefault(); setRunning(!S.running); }
  else if (k === '.') step();
  else if (k === 'p' || k === 'P') setPresenting(!presenting());
  else if (k === 'Escape' && presenting()) setPresenting(false);
});
// Canvases follow their own boxes, not just the window: a scrollbar appearing,
// the level switch or presenter mode can all resize them without a resize event.
let resizeT = 0;
const queueResize = () => { clearTimeout(resizeT); resizeT = setTimeout(resizeAll, 60); };
window.addEventListener('resize', queueResize);
if (window.ResizeObserver) {
  const ro = new ResizeObserver(queueResize);
  ['#chamberCv', '#concCv', '#rateCv', '#catCv', '#haberCv'].forEach(sel => ro.observe($(sel)));
}
matchMedia('(prefers-reduced-motion: reduce)').addEventListener('change', e => { chamber.reduced = e.matches; });

// Start: GCSE, the concentration-change reaction, mostly reactants, paused at t = 0.
fillPresetSelect();
renderLearn();
buildPrint();
loadPreset(PRESETS.gcse[0], 'reactants');
resizeAll();
if (document.fonts) document.fonts.ready.then(() => { resizeAll(); syncReactionUI(); });
// For checking the model from the console.
window.EQ_LAB = { sim, chamber, S, applyChange, setRunning, setLevel, loadPreset, PRESETS, advance, drawAll, reset, updateStatus };
requestAnimationFrame(frame);
})();
