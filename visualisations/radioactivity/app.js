/* Radioactivity: Half-Life & Absorption (AQA GCSE Physics 4.4.2 / Combined 6.4.2)
   Plain script, no build step. Chart.js is vendored in lib/.

   Sections:
     1. Shared helpers and colour themes
     2. Tabs
     3. Half-life visualiser (random decay grid + Chart.js graph)
     4. Absorption and range bench (particles, GM tube, count rate, clicks)
     5. Presenter mode
     6. Annotation layer
     7. Printables (summary card, worksheet, mark scheme)
     8. Main loop and keyboard shortcuts */
(() => {
'use strict';

/* ════════════════════════ 1. helpers & themes ════════════════════════ */
const $ = s => document.querySelector(s);
const $$ = s => [...document.querySelectorAll(s)];
const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
const fmt = n => n.toLocaleString('en-GB');

// Hex only: canvases and Chart.js read these directly.
const THEMES = {
  normal: {
    stage: '#091321', text: '#edf2f8', body: '#c3ccd8', muted: '#8693a5', line: '#182535', line2: '#2c3d52',
    parent: '#b199f4', daughter: '#26344a', daughterEdge: '#4a5b72', guide: '#f5c451', theory: '#8693a5',
    act: '#47b5fa', alpha: '#f5b14c', beta: '#47b5fa', gamma: '#6fe3a3', flash: '#ffffff', mystery: '#dfe6ee',
    metal: '#3a4a60', metalEdge: '#5b6d85', tube: '#56657a', tubeEdge: '#8b9bb0', window: '#c9b27a',
    paper: '#efe9d8', al: '#aeb8c4', pb: '#5f6874', lw: 1, font: 12
  }
};
// Presenter mode keeps the same colours. Chart text goes up to the site's
// presenter label size (--sst-pr-label), set in setPresenting().
THEMES.present = { ...THEMES.normal, font: 18 };
const presenting = () => document.body.classList.contains('presenting');
let T = THEMES.normal;

const nuc = (a, z, s) => `<span class="nuc"><i>${a}</i><i>${z}</i></span>${s}`;
const BLANK = '<span class="blank"></span>';

// Size a canvas's backing store to its CSS box at device pixel ratio. z > 1
// draws everything, text included, larger: w and h come back in those units.
function fitCanvas(cv, z = 1) {
  const r = cv.getBoundingClientRect(), dpr = Math.min(window.devicePixelRatio || 1, 2.5);
  const w = Math.max(1, Math.round(r.width * dpr)), h = Math.max(1, Math.round(r.height * dpr));
  if (cv.width !== w || cv.height !== h) { cv.width = w; cv.height = h; }
  const ctx = cv.getContext('2d');
  ctx.setTransform(dpr * z, 0, 0, dpr * z, 0, 0);
  return { ctx, w: r.width / z, h: r.height / z };
}

// Poisson sample: Knuth for small means, normal approximation above.
function poisson(mean) {
  if (mean <= 0) return 0;
  if (mean > 30) return Math.max(0, Math.round(mean + Math.sqrt(mean) * gauss()));
  const L = Math.exp(-mean); let k = 0, p = 1;
  do { k++; p *= Math.random(); } while (p > L);
  return k - 1;
}
function gauss() { let u = 0, v = 0; while (!u) u = Math.random(); while (!v) v = Math.random(); return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v); }

// Wire a .seg group of toggle buttons. multi: several may be pressed at once.
function segGroup(el, onChange, multi = false) {
  el.addEventListener('click', e => {
    const b = e.target.closest('button'); if (!b || b.disabled) return;
    if (multi) b.setAttribute('aria-pressed', b.getAttribute('aria-pressed') === 'true' ? 'false' : 'true');
    else el.querySelectorAll('button').forEach(x => x.setAttribute('aria-pressed', x === b ? 'true' : 'false'));
    onChange(b);
  });
}

/* ════════════════════════ 2. tabs ════════════════════════ */
const tabs = $$('.main-tabs [role="tab"]');
let view = 'hl';
function showTab(tab, focus) {
  tabs.forEach(t => {
    const on = t === tab;
    t.setAttribute('aria-selected', on); t.tabIndex = on ? 0 : -1;
    $('#' + t.getAttribute('aria-controls')).hidden = !on;
  });
  view = tab.id.slice(4);
  if (focus) tab.focus();
  requestAnimationFrame(() => { HL.resize(); AB.resize(); });
}
tabs.forEach((t, i) => {
  t.addEventListener('click', () => showTab(t));
  t.addEventListener('keydown', e => {
    const d = e.key === 'ArrowRight' ? 1 : e.key === 'ArrowLeft' ? -1 : 0;
    if (d) { e.preventDefault(); showTab(tabs[(i + d + tabs.length) % tabs.length], true); }
  });
});

/* ════════════════════════ 3. half-life visualiser ════════════════════════ */
const ISOTOPES = {
  c14:   { short: 'C-14',   daughter: 'N-14',   hl: 5730, unit: 'years', per: 'year', mode: 'b', size: 0.26, col: '#5fd4c4',
           eq: `${nuc(14, 6, 'C')} → ${nuc(14, 7, 'N')} + ${nuc(0, '−1', 'e')}` },
  rn222: { short: 'Rn-222', daughter: 'Po-218', hl: 3.8,  unit: 'days',  per: 'day',  mode: 'a', size: 0.46, col: '#f4877a',
           eq: `${nuc(222, 86, 'Rn')} → ${nuc(218, 84, 'Po')} + ${nuc(4, 2, 'He')}` },
  i131:  { short: 'I-131',  daughter: 'Xe-131', hl: 8.0,  unit: 'days',  per: 'day',  mode: 'b', size: 0.39, col: '#b199f4',
           eq: `${nuc(131, 53, 'I')} → ${nuc(131, 54, 'Xe')} + ${nuc(0, '−1', 'e')} + γ` },
  co60:  { short: 'Co-60',  daughter: 'Ni-60',  hl: 5.27, unit: 'years', per: 'year', mode: 'b', size: 0.32, col: '#a6d86e',
           eq: `${nuc(60, 27, 'Co')} → ${nuc(60, 28, 'Ni')} + ${nuc(0, '−1', 'e')} + γ` },
  custom:{ short: 'Parent', daughter: 'Daughter', hl: 10, unit: 's', per: 's', mode: 'x', size: 0.36, col: '#dfe6ee', eq: '' }
};
const PACE = [12, 8, 6, 4, 3, 2.5, 2, 1.5, 1, 0.75, 0.5, 0.3];   // seconds per half-life, by slider position
const MAXH = 6;          // run for six half-lives
const BIN = 0.25;        // activity bin width, in half-lives

const HL = {
  iso: ISOTOPES.c14, N0: 400, state: null, bornFlash: null, left: 0,
  tau: 0, running: false, stepTarget: null, plot: 'n', guides: true, theory: false,
  nPts: [], aPts: [], binIdx: 0, binCount: 0, lastSample: 0, dirty: true, chart: null, lastChart: 0,
  pace() { return PACE[+$('#speed').value - 1]; },
  get done() { return this.left === 0 || this.tau >= MAXH - 1e-9; },
  get A0() { return Math.LN2 / this.iso.hl * this.N0; },

  reset() {
    this.state = new Uint8Array(this.N0);
    this.bornFlash = new Float32Array(this.N0).fill(-1);
    this.left = this.N0; this.tau = 0; this.running = false; this.stepTarget = null;
    this.nPts = [{ x: 0, y: this.N0 }]; this.aPts = []; this.binIdx = 0; this.binCount = 0; this.lastSample = 0;
    this.dirty = true; this.syncButtons(); this.updateReadouts(); this.rebuildChart();
  },

  // Advance by dtau half-lives: each undecayed nucleus decays with probability 1 − 2^(−dtau).
  advance(dtau, now) {
    const p = 1 - Math.pow(2, -dtau);
    let n = 0;
    for (let i = 0; i < this.N0; i++) {
      if (!this.state[i] && Math.random() < p) { this.state[i] = 1; this.bornFlash[i] = now; n++; }
    }
    this.left -= n; this.tau += dtau; this.binCount += n;
    while (this.tau >= (this.binIdx + 1) * BIN - 1e-9) {
      this.aPts.push({ x: (this.binIdx + 0.5) * BIN * this.iso.hl, y: this.binCount / (BIN * this.iso.hl) });
      this.binIdx++; this.binCount = 0;
    }
    if (this.tau - this.lastSample >= 0.02 || this.done || Math.abs(this.tau - Math.round(this.tau)) < 1e-9) {
      this.nPts.push({ x: this.tau * this.iso.hl, y: this.left }); this.lastSample = this.tau;
    }
    this.dirty = true;
  },

  tick(dt, now) {
    if (!this.running) return;
    const pace = this.stepTarget != null ? Math.min(this.pace(), 1) : this.pace();
    let dtau = Math.min(dt, 0.05) / pace;
    const target = this.stepTarget != null ? this.stepTarget : MAXH;
    if (this.tau + dtau >= target - 1e-9) dtau = target - this.tau;
    if (dtau > 0) this.advance(dtau, now);
    if (this.tau >= target - 1e-9 || this.left === 0) { this.running = false; this.stepTarget = null; this.syncButtons(); }
    this.updateReadouts();
    if (now - this.lastChart > 60 || !this.running) { this.lastChart = now; this.updateChart(); }
  },

  syncButtons() {
    const b = $('#hlPlay');
    const label = this.running && this.stepTarget == null ? 'Pause' : this.done ? 'Run again' : this.tau > 0 ? 'Resume' : 'Start';
    b.querySelector('span').textContent = label;
    b.querySelector('use').setAttribute('href', label === 'Pause' ? '#i-pause' : label === 'Run again' ? '#i-reset' : '#i-play');
    $('#hlStep').disabled = this.done;
  },

  fmtTime(x) {
    const hl = this.iso.hl;
    const v = hl >= 100 ? fmt(Math.round(x)) : fmt(parseFloat(x.toFixed(hl >= 10 ? 1 : 2)));
    return `${v} ${this.iso.unit}`;
  },

  updateReadouts() {
    $('#roTime').textContent = this.fmtTime(this.tau * this.iso.hl);
    $('#roHalves').textContent = this.tau.toFixed(2);
    $('#roLeft').textContent = fmt(this.left);
    $('#roGone').textContent = fmt(this.N0 - this.left);
    $('#roPct').textContent = (100 * this.left / this.N0).toFixed(this.N0 > 400 ? 1 : 0) + '%';
  },

  setIsotope(key) {
    const iso = ISOTOPES[key];
    if (key === 'custom') iso.hl = +$('#customHl').value;
    this.iso = iso;
    $('#customRow').hidden = key !== 'custom';
    document.documentElement.style.setProperty('--parent', iso.col);
    $('#lgParent').textContent = iso.short; $('#lgDaughter').textContent = iso.daughter;
    const modeName = { a: 'alpha decay', b: 'beta decay', x: '' }[iso.mode];
    $('#hlEq').innerHTML = iso.eq ? `<span class="lab">${modeName}</span>${iso.eq}`
      : '<span class="lab">custom</span>A made-up isotope: change the half-life and watch the shape of the curve stay the same.';
    this.reset();
  },

  /* ── grid ── */
  drawGrid(now) {
    const cv = $('#gridCv'); if (!cv.offsetWidth) return;
    const { ctx, w, h } = fitCanvas(cv);
    ctx.fillStyle = T.stage; ctx.fillRect(0, 0, w, h);
    const n = Math.round(Math.sqrt(this.N0));
    const leg = cv.parentElement.querySelector('.legend'), lh = leg ? leg.offsetHeight + 14 : 34;
    const size = Math.min(w, h - lh) - 20, cell = size / n;
    const ox = (w - size) / 2, oy = Math.max(10, (h - lh - size) / 2);
    const flashCol = this.iso.mode === 'a' ? T.alpha : this.iso.mode === 'b' ? T.beta : T.flash;
    // Heavier nucleus, bigger dot: ranked rather than to scale, so even carbon-14 stays easy to see.
    const r = cell * this.iso.size;
    let flashing = false;
    for (let i = 0; i < this.N0; i++) {
      const cx = ox + (i % n + 0.5) * cell, cy = oy + (Math.floor(i / n) + 0.5) * cell;
      if (!this.state[i]) {
        ctx.fillStyle = this.iso.col;
        ctx.beginPath(); ctx.arc(cx, cy, r, 0, 7); ctx.fill();
      } else {
        ctx.fillStyle = T.daughter; ctx.strokeStyle = T.daughterEdge; ctx.lineWidth = Math.max(1, r * 0.14);
        ctx.beginPath(); ctx.arc(cx, cy, r * 0.85, 0, 7); ctx.fill(); ctx.stroke();
        const age = (now - this.bornFlash[i]) / 450;
        if (this.bornFlash[i] >= 0 && age < 1) {
          flashing = true;
          ctx.globalAlpha = 1 - age; ctx.strokeStyle = flashCol; ctx.lineWidth = Math.max(1.5, cell * 0.1);
          ctx.beginPath(); ctx.arc(cx, cy, r + cell * 0.5 * age, 0, 7); ctx.stroke();
          ctx.globalAlpha = 1;
        }
      }
    }
    return flashing;
  },

  /* ── chart ── */
  chartData() {
    const hl = this.iso.hl, y0 = this.plot === 'n' ? this.N0 : this.A0;
    const th = [];
    for (let i = 0; i <= 120; i++) { const x = i / 120 * MAXH * hl; th.push({ x, y: y0 * Math.pow(2, -x / hl) }); }
    return { sim: this.plot === 'n' ? this.nPts : this.aPts, th };
  },
  yTitle() {
    if (this.plot === 'n') return 'Undecayed nuclei';
    return this.iso.unit === 's' ? 'Activity (Bq)' : `Activity (decays per ${this.iso.per})`;
  },
  rebuildChart() {
    if (!window.Chart) return;
    const { sim, th } = this.chartData();
    const cfg = this.chart;
    if (!cfg) {
      this.chart = new Chart($('#chartCv'), {
        type: 'line',
        data: { datasets: [
          { label: 'Simulation', data: sim, borderWidth: 2.5, pointRadius: 0, tension: 0 },
          { label: 'Theory: halves every half-life', data: th, borderWidth: 2, borderDash: [6, 5], pointRadius: 0, hidden: !this.theory }
        ] },
        options: {
          parsing: false, animation: false, maintainAspectRatio: false, responsive: true,
          interaction: { mode: 'nearest', intersect: false, axis: 'x' },
          scales: {
            x: { type: 'linear', min: 0, title: { display: true } , ticks: { callback: v => fmt(+(+v).toPrecision(6)) } },
            y: { min: 0, title: { display: true }, ticks: { callback: v => fmt(+(+v).toPrecision(6)) } }
          },
          plugins: {
            legend: { labels: { filter: (item, data) => !data.datasets[item.datasetIndex].hidden, boxHeight: 2 } },
            tooltip: { callbacks: { title: it => HL.fmtTime(it[0].parsed.x), label: it => `${it.dataset.label}: ${fmt(Math.round(it.parsed.y * 10) / 10)}` } }
          }
        },
        plugins: [guidePlugin]
      });
    } else {
      cfg.data.datasets[0].data = sim; cfg.data.datasets[1].data = th;
      cfg.data.datasets[1].hidden = !this.theory;
    }
    const c = this.chart;
    c.options.scales.x.max = MAXH * this.iso.hl;
    c.options.scales.x.ticks.stepSize = this.iso.hl;
    c.options.scales.x.title.text = `Time (${this.iso.unit})`;
    c.options.scales.y.title.text = this.yTitle();
    c.options.scales.y.max = this.plot === 'n' ? this.N0 : undefined;
    c.options.scales.y.suggestedMax = this.plot === 'n' ? undefined : this.A0 * 1.3;
    c.data.datasets[0].pointRadius = this.plot === 'a' ? 3 : 0;
    applyChartTheme(); c.update('none');
  },
  updateChart() {
    if (!this.chart) return;
    this.chart.data.datasets[0].data = this.plot === 'n' ? this.nPts : this.aPts;
    this.chart.update('none');
  },
  resize() { this.dirty = true; if (this.chart) this.chart.resize(); }
};

// The "staircase": from N0/2, N0/4 … across to the curve and down to 1, 2, 3 … half-lives.
const guidePlugin = {
  id: 'hlGuides',
  afterDatasetsDraw(chart) {
    if (!HL.guides) return;
    const { ctx, scales: { x, y } } = chart, y0 = HL.plot === 'n' ? HL.N0 : HL.A0;
    const sym = HL.plot === 'n' ? 'N₀' : 'A₀';
    ctx.save();
    ctx.setLineDash([5, 4]); ctx.strokeStyle = T.guide; ctx.fillStyle = T.guide; ctx.lineWidth = 1.5 * T.lw;
    ctx.font = `600 ${T.font}px "Plus Jakarta Sans", sans-serif`;
    for (let k = 1; k <= 5; k++) {
      const tx = x.getPixelForValue(k * HL.iso.hl), ty = y.getPixelForValue(y0 / 2 ** k);
      if (tx > x.right + 1 || ty > y.bottom) break;
      ctx.beginPath(); ctx.moveTo(x.left, ty); ctx.lineTo(tx, ty); ctx.lineTo(tx, y.bottom); ctx.stroke();
      if (k <= 3) { ctx.textAlign = 'left'; ctx.fillText(`${sym}/${2 ** k}`, x.left + 5, ty - 5); }
      ctx.textAlign = 'center'; ctx.fillText(`${k}×T½`, tx, y.bottom - 6);
    }
    ctx.restore();
  }
};

function applyChartTheme() {
  const c = HL.chart; if (!c) return;
  const tick = { color: T.body, font: { family: 'Plus Jakarta Sans', size: T.font } };
  const title = { color: T.muted, font: { family: 'Plus Jakarta Sans', size: T.font, weight: '600' } };
  for (const ax of ['x', 'y']) {
    Object.assign(c.options.scales[ax].ticks, tick, { maxRotation: T === THEMES.present ? 0 : 50 });
    Object.assign(c.options.scales[ax].title, title);
    c.options.scales[ax].grid = { color: T.line, lineWidth: T.lw };
    c.options.scales[ax].border = { color: T.line2, width: T.lw };
  }
  c.options.plugins.legend.labels.color = T.body;
  c.options.plugins.legend.labels.font = { family: 'Plus Jakarta Sans', size: T.font };
  const simCol = HL.plot === 'n' ? HL.iso.col : T.act;
  Object.assign(c.data.datasets[0], { borderColor: simCol, backgroundColor: simCol, borderWidth: 2.5 * T.lw });
  Object.assign(c.data.datasets[1], { borderColor: T.theory, backgroundColor: T.theory, borderWidth: 2 * T.lw });
}

$('#isoSel').addEventListener('change', e => HL.setIsotope(e.target.value));
$('#customHl').addEventListener('input', e => {
  $('#customOut').textContent = e.target.value + ' s';
  HL.setIsotope('custom');
});
segGroup($('#nSeg'), b => { HL.N0 = +b.dataset.n; HL.reset(); });
segGroup($('#plotSeg'), b => { HL.plot = b.dataset.plot; HL.rebuildChart(); });
$('#speed').addEventListener('input', () => { $('#speedOut').textContent = `1 half-life in ${HL.pace()} s`; });
$('#guides').addEventListener('change', e => { HL.guides = e.target.checked; HL.chart && HL.chart.update('none'); });
$('#theory').addEventListener('change', e => { HL.theory = e.target.checked; HL.rebuildChart(); });
$('#hlPlay').addEventListener('click', () => {
  if (HL.done) { HL.reset(); HL.running = true; }
  else if (HL.stepTarget != null) HL.stepTarget = null;          // turn a step into a normal run
  else HL.running = !HL.running;
  HL.syncButtons();
});
$('#hlStep').addEventListener('click', () => {
  if (HL.done) return;
  HL.stepTarget = Math.min(MAXH, Math.floor(HL.tau + 1e-6) + 1); HL.running = true; HL.syncButtons();
});
$('#hlReset').addEventListener('click', () => HL.reset());

/* ════════════════════════ 4. absorption & range ════════════════════════ */
const MATERIALS = {
  none:  { name: 'no absorber' },
  paper: { name: 'paper', t: v => 0.1 * (1 + Math.round(v / 100 * 9)), def: 0,
           label: t => `${t.toFixed(1)} mm (${Math.round(t / 0.1)} sheet${t > 0.15 ? 's' : ''})` },
  al:    { name: 'aluminium', t: v => 0.5 + Math.round(v / 100 * 19) * 0.5, def: 26, label: t => `${t.toFixed(1)} mm` },
  pb:    { name: 'lead', t: v => 1 + Math.round(v / 100 * 49), def: 18, label: t => `${t} mm` }
};
// Fraction transmitted by an absorber of thickness t mm.
const ABSORB = {
  a: { paper: () => 0, al: () => 0, pb: () => 0 },
  b: { paper: t => Math.exp(-0.4 * t), al: t => Math.exp(-1.4 * t), pb: t => Math.exp(-6 * t) },
  g: { paper: () => 1, al: t => Math.exp(-0.017 * t), pb: t => Math.exp(-0.06 * t) }
};
// Fraction that reaches distance d cm through air before running out of energy.
const AIR = {
  a: d => clamp((5.5 - d) / 2, 0, 1),                        // about 5 cm
  b: d => Math.pow(Math.max(0, 1 - d / 100), 1.5),           // up to about 1 m
  g: () => 1
};
const R0 = { a: 190, b: 150, g: 60 };      // counts/s very close to the tube
const BG = 0.4;                            // background, counts/s
const geom = d => Math.min(1, (2.5 / (d + 1.5)) ** 2);   // spreading out: roughly inverse square
const TYPE_NAME = { a: 'α', b: 'β', g: 'γ' };

const AB = {
  src: { a: true, b: false, g: false }, mystery: false,
  mat: 'none', slider: { paper: 0, al: 26, pb: 18 }, dist: 3, bg: true,
  particles: [], emitAcc: { a: 0, b: 0, g: 0 },
  counts: [], total: 0, since: performance.now(), lastCount: -1,
  thick() { return this.mat === 'none' ? 0 : MATERIALS[this.mat].t(this.slider[this.mat]); },
  barrierDist() { return Math.min(0.5, this.dist * 0.45); },
  transmit(type) { return this.mat === 'none' ? 1 : ABSORB[type][this.mat](this.thick()); },
  rate() {
    let r = this.bg ? BG : 0;
    for (const k of 'abg') if (this.src[k]) r += R0[k] * geom(this.dist) * AIR[k](this.dist) * this.transmit(k);
    return r;
  },
  layout: null,

  // In presenter mode the whole bench is drawn larger, so its labels reach
  // the presenter label size, as long as the bench stays about 560 units wide.
  zoom: 1,
  resize() {
    this.layout = null;
    const cw = $('#benchCv').getBoundingClientRect().width;
    this.zoom = presenting() && cw ? clamp(SST_PRESENT.px('--sst-pr-label') / THEMES.normal.font, 1, cw / 560) : 1;
  },

  map(d) {  // cm along the bench to px. Square-root scale, so the first few cm are readable.
    const L = this.layout; return L.xs + L.len * Math.sqrt(clamp(d, 0, 100) / 100);
  },
  unmap(px) { const L = this.layout; return 100 * ((px - L.xs) / L.len) ** 2; },

  emit(type) {
    const L = this.layout;
    let stop = Infinity;
    if (type === 'a') stop = 3.5 + Math.random() * 2;
    if (type === 'b') stop = 100 * (1 - Math.pow(Math.random(), 1 / 1.5));
    const absorbed = this.mat !== 'none' && Math.random() > this.transmit(type);
    const bx = this.map(this.barrierDist()) - L.bw / 2;
    let stopPx = stop === Infinity ? 1e9 : this.map(stop);
    if (absorbed) stopPx = Math.min(stopPx, bx + Math.random() * L.bw);
    this.particles.push({
      type, x: L.xs + 2, y: L.cy + (Math.random() - 0.5) * 6, slope: (Math.random() - 0.5) * 0.09,
      v: { a: 150, b: 320, g: 600 }[type] * (0.85 + Math.random() * 0.3), stopPx, phase: Math.random() * 6, dead: 0
    });
  },

  tick(dt, now) {
    if (!this.layout) return;
    for (const k of 'abg') {
      if (!this.src[k]) continue;
      this.emitAcc[k] += dt * 16;
      while (this.emitAcc[k] >= 1) { this.emitAcc[k]--; this.emit(k); }
    }
    const L = this.layout, tubeX = this.map(this.dist);
    for (const p of this.particles) {
      if (p.dead) { p.dead += dt; continue; }
      // Alpha and gamma fly dead straight. Beta particles are light, so collisions with
      // air molecules knock them off course: a small random kink every 50 px or so.
      const dx = p.v * dt;
      if (p.type === 'b' && Math.random() < dx / 50) p.slope = clamp(p.slope + gauss() * 0.05, -0.16, 0.16);
      p.x += dx; p.y += p.slope * dx;
      if (p.x >= p.stopPx) { p.x = p.stopPx; p.dead = dt; }
      else if (p.x >= tubeX && Math.abs(p.y - L.cy) < L.tr) { p.x = tubeX; p.dead = dt; p.hit = true; }
      else if (p.x > L.w + 20) p.dead = 1;
    }
    this.particles = this.particles.filter(p => p.dead < 0.35);

    // Detector counts: a Poisson process at the model's count rate.
    const n = poisson(this.rate() * dt);
    for (let i = 0; i < n; i++) {
      const t = now - Math.random() * dt * 1000;
      this.counts.push(t); this.total++; this.lastCount = now;
      if (sound.on) sound.click(i / Math.max(1, n) * dt);
    }
    const cut = now - 5000;
    while (this.counts.length && this.counts[0] < cut) this.counts.shift();
  },

  updateCounter(now) {
    const win = Math.min(5, Math.max(0.5, (now - this.since) / 1000));
    const cps = this.counts.filter(t => t >= now - win * 1000 && t >= this.since).length / win;
    $('#cps').textContent = cps.toFixed(1);
    $('#cpm').textContent = fmt(Math.round(cps * 60));
    $('#total').textContent = fmt(this.total);
    $('#elapsed').textContent = ((now - this.since) / 1000).toFixed(1) + ' s';
  },
  resetCounter() { this.counts = []; this.total = 0; this.since = performance.now(); },

  draw(now) {
    const cv = $('#benchCv'); if (!cv.offsetWidth) return;
    const { ctx, w, h } = fitCanvas(cv, this.zoom);
    if (!this.layout || this.layout.w !== w || this.layout.h !== h) {
      const tubeLen = Math.min(120, w * 0.17), xs = Math.max(64, Math.min(92, w * 0.12));
      this.layout = { w, h, xs, cy: h * 0.44, tubeLen, tr: Math.max(14, Math.min(22, h * 0.055)),
        len: w - xs - tubeLen - 18, bw: 0 };
    }
    const L = this.layout, lw = T.lw, F = THEMES.normal.font;
    const t = this.thick();
    L.bw = this.mat === 'none' ? 0 : 3 + 9 * Math.log10(1 + t * 2);
    ctx.fillStyle = T.stage; ctx.fillRect(0, 0, w, h);
    ctx.font = `600 ${F}px "Plus Jakarta Sans", sans-serif`; ctx.textBaseline = 'middle';

    // ruler
    const ry = h - 36;
    ctx.strokeStyle = T.line2; ctx.lineWidth = lw; ctx.fillStyle = T.muted;
    ctx.beginPath(); ctx.moveTo(L.xs, ry); ctx.lineTo(this.map(100), ry); ctx.stroke();
    const labelled = [1, 2, 3, 5, 10, 20, 50, 100];
    for (const d of [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 20, 30, 40, 50, 60, 70, 80, 90, 100]) {
      const x = this.map(d), big = labelled.includes(d) || d === 0;
      ctx.beginPath(); ctx.moveTo(x, ry); ctx.lineTo(x, ry + (big ? 8 : 4)); ctx.stroke();
      if (big) { ctx.textAlign = 'center'; ctx.fillText(d === 0 ? '0' : d + (d === 100 ? ' cm' : ''), x, ry + 18); }
    }
    ctx.textAlign = 'left'; ctx.font = `500 ${F - 2}px "Plus Jakarta Sans", sans-serif`;
    ctx.fillText('distance from source (scale stretched near the source)', L.xs, h - 8);
    ctx.font = `600 ${F}px "Plus Jakarta Sans", sans-serif`;

    // source holder
    ctx.fillStyle = T.metal; ctx.strokeStyle = T.metalEdge; ctx.lineWidth = 1.5 * lw;
    ctx.beginPath(); ctx.roundRect(L.xs - 54, L.cy - 24, 54, 48, 5); ctx.fill(); ctx.stroke();
    ctx.fillStyle = T.stage; ctx.fillRect(L.xs - 6, L.cy - 8, 6, 16);
    ctx.fillStyle = T.text; ctx.textAlign = 'center';
    const srcLabel = this.mystery ? '?' : 'abg'.split('').filter(k => this.src[k]).map(k => TYPE_NAME[k]).join(' ') || '–';
    ctx.font = `700 ${F + 3}px "Plus Jakarta Sans", sans-serif`;
    ctx.fillText(srcLabel, L.xs - 27, L.cy);
    ctx.font = `600 ${F - 1}px "Plus Jakarta Sans", sans-serif`; ctx.fillStyle = T.muted;
    ctx.fillText('source', L.xs - 27, L.cy + 38);

    // GM tube
    const tx = this.map(this.dist), tl = L.tubeLen, tr = L.tr;
    ctx.strokeStyle = T.muted; ctx.lineWidth = 2 * lw;
    ctx.beginPath(); ctx.moveTo(tx + tl, L.cy); ctx.bezierCurveTo(tx + tl + 30, L.cy, tx + tl - 10, L.cy + 70, w + 5, L.cy + 80); ctx.stroke();
    ctx.fillStyle = T.tube; ctx.strokeStyle = T.tubeEdge; ctx.lineWidth = 1.5 * lw;
    ctx.beginPath(); ctx.roundRect(tx, L.cy - tr, tl, tr * 2, [3, 8, 8, 3]); ctx.fill(); ctx.stroke();
    const flash = now - this.lastCount < 70;
    ctx.fillStyle = flash ? T.flash : T.window;
    ctx.fillRect(tx - 1, L.cy - tr + 3, 4, tr * 2 - 6);
    ctx.fillStyle = T.text; ctx.textAlign = 'center';
    ctx.fillText('GM tube', tx + tl / 2, L.cy - tr - 14);

    // distance marker
    const my = L.cy + tr + 30;
    ctx.strokeStyle = T.body; ctx.fillStyle = T.body; ctx.lineWidth = lw;
    ctx.beginPath(); ctx.moveTo(L.xs, my); ctx.lineTo(tx, my); ctx.stroke();
    for (const [x, s] of [[L.xs, 1], [tx, -1]]) { ctx.beginPath(); ctx.moveTo(x, my); ctx.lineTo(x + 7 * s, my - 4); ctx.lineTo(x + 7 * s, my + 4); ctx.fill(); }
    const dl = `${this.dist} cm`, dlw = ctx.measureText(dl).width + 10;
    const mx = clamp((L.xs + tx) / 2, L.xs + dlw / 2, w - dlw / 2);
    ctx.fillStyle = T.stage; ctx.fillRect(mx - dlw / 2, my - 10, dlw, 20);
    ctx.fillStyle = T.text; ctx.fillText(dl, mx, my);

    // absorber
    if (this.mat !== 'none') {
      const bx = this.map(this.barrierDist());
      ctx.fillStyle = T[this.mat]; ctx.strokeStyle = T.line2; ctx.lineWidth = lw;
      ctx.fillRect(bx - L.bw / 2, L.cy - 46, L.bw, 92); ctx.strokeRect(bx - L.bw / 2, L.cy - 46, L.bw, 92);
      ctx.fillStyle = T.text; ctx.textAlign = 'left';
      const lab = `${MATERIALS[this.mat].name[0].toUpperCase() + MATERIALS[this.mat].name.slice(1)}, ${this.mat === 'paper' ? t.toFixed(1) : t} mm`;
      ctx.fillText(lab, Math.min(bx - 12, w - ctx.measureText(lab).width - 8), L.cy - 60);
    }

    // particles
    for (const p of this.particles) {
      const y = p.y;
      const col = this.mystery ? T.mystery : T[{ a: 'alpha', b: 'beta', g: 'gamma' }[p.type]];
      ctx.globalAlpha = p.dead ? Math.max(0, 1 - p.dead / 0.35) : 1;
      ctx.fillStyle = col; ctx.strokeStyle = col;
      if (this.mystery) { ctx.beginPath(); ctx.arc(p.x, y, 3, 0, 7); ctx.fill(); }
      else if (p.type === 'a') { ctx.beginPath(); ctx.arc(p.x, y, 5, 0, 7); ctx.fill(); }
      else if (p.type === 'b') { ctx.beginPath(); ctx.arc(p.x, y, 2.6, 0, 7); ctx.fill(); }
      else {
        ctx.lineWidth = 1.8 * lw; ctx.beginPath();
        for (let i = 0; i <= 16; i++) { const xx = p.x - 22 + i * 1.4; const yy = y + Math.sin(xx * 0.55 + p.phase) * 4; i ? ctx.lineTo(xx, yy) : ctx.moveTo(xx, yy); }
        ctx.stroke();
      }
      ctx.globalAlpha = 1;
    }
  },

  explain() {
    const el = $('#abNote');
    if (this.mystery) {
      el.innerHTML = `<h4>Mystery source</h4><p>Which types of radiation does it emit? Keep the tube about 2 to 3 cm away. Measure the count with no absorber, then with paper, then a few mm of aluminium, then lead.</p><p class="muted">A big drop with paper means alpha. A further drop with aluminium means beta. A count still above background after the aluminium means gamma.</p>`;
      this.slides([['Mystery source', 'Which radiation does it give out? Keep the tube 2 to 3 cm away.'],
        ['Test it', 'Count with no absorber, then paper, then a few mm of aluminium, then lead.'],
        ['Big drop with paper?', 'Then it gives out alpha.'], ['Further drop with aluminium?', 'Then it gives out beta.'],
        ['Still above background after aluminium?', 'Then it gives out gamma.']]);
      return;
    }
    const t = this.thick(), d = this.dist, lines = [];
    if (this.src.a) {
      if (this.mat !== 'none') lines.push(`<b>α</b>: stopped by the ${MATERIALS[this.mat].name}. Even one sheet of paper absorbs alpha.`);
      else if (d > 5.5) lines.push('<b>α</b>: out of range. Alpha travels only about 5 cm in air before it has used up its energy ionising air molecules.');
      else if (d > 3.5) lines.push('<b>α</b>: near the end of its range, so only some alpha particles reach the tube.');
      else lines.push('<b>α</b>: reaches the tube. It is strongly ionising, so it loses energy fast and has a short range.');
    }
    if (this.src.b) {
      const tb = this.transmit('b');
      if (this.mat === 'paper') lines.push('<b>β</b>: passes through paper almost unaffected.');
      else if (this.mat === 'al') lines.push(tb < 0.02 ? `<b>β</b>: absorbed by ${t} mm of aluminium.` : `<b>β</b>: partly absorbed by ${t} mm of aluminium. A few mm stops it.`);
      else if (this.mat === 'pb') lines.push('<b>β</b>: absorbed by the lead.');
      else if (d > 60) lines.push('<b>β</b>: fading out. Its range in air is up to about 1 m.');
      else lines.push('<b>β</b>: reaches the tube. It is moderately ionising, with a range in air of up to about 1 m.');
    }
    if (this.src.g) {
      const tg = this.transmit('g');
      if (this.mat === 'pb') lines.push(`<b>γ</b>: ${t} mm of lead lets through about ${Math.round(tg * 100)}%. Lead reduces gamma but never stops all of it.`);
      else if (this.mat === 'al') lines.push('<b>γ</b>: passes through aluminium, barely reduced.');
      else lines.push('<b>γ</b>: passes straight through. It is weakly ionising, so it goes a long way, but the count still falls with distance as the rays spread out.');
    }
    if (!lines.length) lines.push('No source selected: the counter only picks up background radiation.');
    el.innerHTML = `<h4>What is happening</h4>${lines.map(l => `<p>${l}</p>`).join('')}` +
      (this.bg ? '<p class="muted">Subtract the background count (about 0.4 counts/s here) before comparing readings.</p>' : '');
    // Presenter slides: one line per radiation, short enough for the caption band.
    const slides = [];
    if (this.src.a) slides.push(['Alpha, α', this.mat !== 'none' ? `Stopped by the ${MATERIALS[this.mat].name}. Even one sheet of paper absorbs alpha.`
      : d > 5.5 ? 'Out of range. Alpha only travels about 5 cm in air.' : d > 3.5 ? 'Near the end of its range: only some alpha reaches the tube.'
      : 'Reaches the tube. Strongly ionising, so it has a short range.']);
    if (this.src.b) slides.push(['Beta, β', this.mat === 'paper' ? 'Passes through paper almost unaffected.'
      : this.mat === 'al' ? (this.transmit('b') < 0.02 ? `Absorbed by ${t} mm of aluminium.` : `Partly absorbed by ${t} mm of aluminium. A few mm stops it.`)
      : this.mat === 'pb' ? 'Absorbed by the lead.' : d > 60 ? 'Fading out. Its range in air is up to about 1 m.'
      : 'Reaches the tube. Moderately ionising, range in air up to about 1 m.']);
    if (this.src.g) slides.push(['Gamma, γ', this.mat === 'pb' ? `${t} mm of lead lets about ${Math.round(this.transmit('g') * 100)}% through. Lead reduces gamma, never stops it.`
      : this.mat === 'al' ? 'Passes through aluminium, barely reduced.' : 'Passes straight through. Weakly ionising, so it goes a long way.']);
    if (!slides.length) slides.push(['No source', 'The counter only picks up background radiation.']);
    if (this.bg) slides.push(['Background radiation', 'Subtract it, about 0.4 counts/s here, before comparing readings.']);
    this.slides(slides);
  },
  slides(list) {
    const deck = $('#abDeck');
    if (!deck.sstDeck) SST_PRESENT.deck(deck);
    deck.querySelector('.sst-slides').innerHTML = list.map(([h, p]) => `<section class="sst-slide"><h3>${h}</h3><p>${p}</p></section>`).join('');
    deck.sstDeck.refresh();
  },

  syncUI() {
    const m = MATERIALS[this.mat];
    $('#thickRow').hidden = this.mat === 'none';
    if (this.mat !== 'none') { $('#thick').value = this.slider[this.mat]; $('#thickOut').textContent = m.label(this.thick()); }
    $('#distOut').textContent = `${this.dist} cm`;
    const seg = $('#srcSeg');
    seg.classList.toggle('mystery', this.mystery);
    seg.querySelectorAll('button').forEach(b => b.setAttribute('aria-pressed', !this.mystery && this.src[b.dataset.t] ? 'true' : 'false'));
    $('#revealBtn').hidden = !this.mystery;
    this.explain();
  }
};

segGroup($('#srcSeg'), b => {
  if (AB.mystery) { AB.mystery = false; AB.src = { a: false, b: false, g: false }; }
  AB.src[b.dataset.t] = !AB.src[b.dataset.t];
  AB.particles = []; AB.resetCounter(); AB.syncUI();
}, true);
segGroup($('#absSeg'), b => { AB.mat = b.dataset.m; AB.resetCounter(); AB.syncUI(); });
$('#thick').addEventListener('input', e => { AB.slider[AB.mat] = +e.target.value; AB.resetCounter(); AB.syncUI(); });
$('#dist').addEventListener('input', e => { AB.dist = +e.target.value; AB.resetCounter(); AB.syncUI(); });
$('#bgOn').addEventListener('change', e => { AB.bg = e.target.checked; AB.resetCounter(); AB.syncUI(); });
$('#countReset').addEventListener('click', () => AB.resetCounter());
$('#mysteryBtn').addEventListener('click', () => {
  const combos = ['a', 'b', 'g', 'ab', 'ag', 'bg', 'abg'];
  let pick; do { pick = combos[Math.floor(Math.random() * combos.length)]; } while (pick === 'abg'.split('').filter(k => AB.src[k]).join('') && !AB.mystery);
  AB.src = { a: pick.includes('a'), b: pick.includes('b'), g: pick.includes('g') };
  AB.mystery = true; AB.particles = []; AB.resetCounter(); AB.syncUI();
});
$('#revealBtn').addEventListener('click', () => { AB.mystery = false; AB.syncUI(); });

// GM clicks: a few milliseconds of decaying noise per count, through the Web Audio API.
const sound = {
  on: false, ctx: null, buf: null,
  init() {
    if (!this.ctx) {
      const AC = window.AudioContext || window.webkitAudioContext; if (!AC) return false;
      this.ctx = new AC();
      const len = Math.floor(this.ctx.sampleRate * 0.004);
      this.buf = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
      const d = this.buf.getChannelData(0);
      for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.exp(-i / (len / 5));
    }
    if (this.ctx.state === 'suspended') this.ctx.resume();
    return true;
  },
  click(delay) {
    if (!this.ctx || view !== 'ab') return;
    const s = this.ctx.createBufferSource(), g = this.ctx.createGain();
    s.buffer = this.buf; g.gain.value = 0.6; s.connect(g); g.connect(this.ctx.destination);
    s.start(this.ctx.currentTime + delay);
  }
};
$('#soundBtn').addEventListener('click', e => {
  const b = e.currentTarget;
  sound.on = !sound.on && sound.init();
  b.setAttribute('aria-pressed', sound.on);
  b.querySelector('use').setAttribute('href', sound.on ? '#i-sound' : '#i-mute');
  b.querySelector('span').textContent = sound.on ? 'Clicks on' : 'Clicks off';
});

/* ════════════════════════ 5. presenter mode ════════════════════════ */
function setPresenting(on) {
  document.body.classList.toggle('presenting', on);
  THEMES.present.font = Math.round(SST_PRESENT.px('--sst-pr-label'));
  T = on ? THEMES.present : THEMES.normal;
  if (!on && document.fullscreenElement) document.exitFullscreen().catch(() => {});
  applyChartTheme();
  requestAnimationFrame(() => { HL.resize(); AB.resize(); HL.chart && HL.chart.update('none'); });
  (on ? $('#exitBtn') : $('#presentBtn')).focus({ preventScroll: true });
}
$('#presentBtn').addEventListener('click', () => setPresenting(true));
$('#exitBtn').addEventListener('click', () => setPresenting(false));
$('#fullBtn').addEventListener('click', () => {
  if (document.fullscreenElement) document.exitFullscreen().catch(() => {});
  else if (document.documentElement.requestFullscreen) document.documentElement.requestFullscreen().catch(() => {});
});
document.addEventListener('fullscreenchange', () => requestAnimationFrame(() => { HL.resize(); AB.resize(); ink.resize(); }));

/* ════════════════════════ 6. annotation layer ════════════════════════ */
const ink = {
  cv: $('#inkCv'), strokes: [], cur: null, tool: 'pen', color: '#ffd84d', size: 3, open: false,
  COLOURS: ['#ffd84d', '#ff5a5a', '#47b5fa', '#6fe3a3', '#b199f4', '#ffffff', '#000000'],

  resize() {
    const dpr = Math.min(window.devicePixelRatio || 1, 2.5);
    this.cv.width = Math.round(innerWidth * dpr); this.cv.height = Math.round(innerHeight * dpr);
    this.cv.getContext('2d').setTransform(dpr, 0, 0, dpr, 0, 0);
    this.redraw();
  },
  redraw() {
    const ctx = this.cv.getContext('2d');
    ctx.clearRect(0, 0, innerWidth, innerHeight);
    for (const s of this.cur ? [...this.strokes, this.cur] : this.strokes) this.paint(ctx, s);
  },
  // Each stroke is drawn as one path, so a highlighter stays evenly translucent where it overlaps itself.
  paint(ctx, s) {
    ctx.save();
    ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    ctx.globalCompositeOperation = s.tool === 'erase' ? 'destination-out' : 'source-over';
    ctx.globalAlpha = s.tool === 'hl' ? 0.35 : 1;
    ctx.strokeStyle = s.color; ctx.fillStyle = s.color;
    ctx.lineWidth = s.tool === 'pen' ? s.size * 1.4 : s.size * 7;
    const p = s.pts;
    if (p.length === 1) { ctx.beginPath(); ctx.arc(p[0][0], p[0][1], ctx.lineWidth / 2, 0, 7); ctx.fill(); }
    else {
      ctx.beginPath(); ctx.moveTo(p[0][0], p[0][1]);
      for (let i = 1; i < p.length - 1; i++) {
        const mx = (p[i][0] + p[i + 1][0]) / 2, my = (p[i][1] + p[i + 1][1]) / 2;
        ctx.quadraticCurveTo(p[i][0], p[i][1], mx, my);
      }
      ctx.lineTo(p[p.length - 1][0], p[p.length - 1][1]); ctx.stroke();
    }
    ctx.restore();
  },
  setTool(tool) {
    this.tool = tool;
    $$('#inkBar [data-tool]').forEach(b => b.setAttribute('aria-pressed', b.dataset.tool === tool ? 'true' : 'false'));
    document.body.classList.toggle('inking', this.open && tool !== 'cursor');
    document.body.classList.toggle('tool-erase', tool === 'erase');
  },
  setColor(c) {
    this.color = c; $('#inkColor').value = c;
    $$('#swatches button').forEach(b => b.setAttribute('aria-pressed', b.dataset.c === c ? 'true' : 'false'));
    if (this.tool === 'erase' || this.tool === 'cursor') this.setTool('pen');
  },
  toggle(force) {
    this.open = force ?? !this.open;
    $('#inkBar').hidden = !this.open;
    $$('#drawBtn, #drawBtn2').forEach(b => b.classList.toggle('on', this.open));
    this.setTool(this.open ? (this.tool === 'cursor' ? 'pen' : this.tool) : this.tool);
    if (this.open) this.resize();
  }
};
$('#swatches').innerHTML = ink.COLOURS.map(c => `<button type="button" data-c="${c}" style="background:${c}" title="${c}" aria-label="Colour ${c}"></button>`).join('');
$('#swatches').addEventListener('click', e => { const b = e.target.closest('button'); if (b) ink.setColor(b.dataset.c); });
$('#inkColor').addEventListener('input', e => ink.setColor(e.target.value));
$('#inkSize').addEventListener('input', e => { ink.size = +e.target.value; });
$$('#inkBar [data-tool]').forEach(b => b.addEventListener('click', () => ink.setTool(b.dataset.tool)));
$('#inkUndo').addEventListener('click', () => { ink.strokes.pop(); ink.redraw(); });
$('#inkClear').addEventListener('click', () => { ink.strokes = []; ink.redraw(); });
$('#inkClose').addEventListener('click', () => ink.toggle(false));
$$('#drawBtn, #drawBtn2').forEach(b => b.addEventListener('click', () => ink.toggle()));
ink.cv.addEventListener('pointerdown', e => {
  if (ink.tool === 'cursor') return;
  ink.cv.setPointerCapture(e.pointerId);
  ink.cur = { tool: ink.tool, color: ink.color, size: ink.size, pts: [[e.clientX, e.clientY]] };
  ink.redraw();
});
ink.cv.addEventListener('pointermove', e => {
  if (!ink.cur) return;
  let evs = e.getCoalescedEvents ? e.getCoalescedEvents() : null;
  if (!evs || !evs.length) evs = [e];
  for (const ev of evs) ink.cur.pts.push([ev.clientX, ev.clientY]);
  ink.redraw();
});
const endStroke = () => { if (ink.cur) { ink.strokes.push(ink.cur); ink.cur = null; ink.redraw(); } };
ink.cv.addEventListener('pointerup', endStroke);
ink.cv.addEventListener('pointercancel', endStroke);
ink.setColor(ink.color);
ink.resize();
window.addEventListener('resize', () => {
  ink.resize();
  if (presenting()) { const f = Math.round(SST_PRESENT.px('--sst-pr-label')); if (f !== THEMES.present.font) { THEMES.present.font = f; applyChartTheme(); } }
  HL.resize(); AB.resize();
});

/* ════════════════════════ 7. printables ════════════════════════ */
// Activity–time graph for question 3: 800 Bq, half-life 6 hours, drawn on print-friendly grid paper.
function decayGraphSVG() {
  const W = 540, H = 380, l = 64, r = 18, t = 14, b = 50, pw = W - l - r, ph = H - t - b;
  const X = h => l + h / 24 * pw, Y = a => t + ph - a / 800 * ph;
  let s = `<svg viewBox="0 0 ${W} ${H}" xmlns="http://www.w3.org/2000/svg" font-family="Plus Jakarta Sans, Arial, sans-serif" font-size="12" role="img" aria-label="Graph of activity against time">`;
  for (let h = 0; h <= 24; h += 0.5) s += `<line x1="${X(h)}" y1="${t}" x2="${X(h)}" y2="${t + ph}" stroke="${h % 2 ? '#d6d6d6' : '#a8a8a8'}" stroke-width="${h % 2 ? 0.5 : 0.8}"/>`;
  for (let a = 0; a <= 800; a += 20) s += `<line x1="${l}" y1="${Y(a)}" x2="${l + pw}" y2="${Y(a)}" stroke="${a % 100 ? '#d6d6d6' : '#a8a8a8'}" stroke-width="${a % 100 ? 0.5 : 0.8}"/>`;
  s += `<path d="M${l} ${t}V${t + ph}H${l + pw}" fill="none" stroke="#000" stroke-width="1.4"/>`;
  for (let h = 0; h <= 24; h += 2) s += `<line x1="${X(h)}" y1="${t + ph}" x2="${X(h)}" y2="${t + ph + 5}" stroke="#000"/><text x="${X(h)}" y="${t + ph + 18}" text-anchor="middle">${h}</text>`;
  for (let a = 0; a <= 800; a += 100) s += `<line x1="${l - 5}" y1="${Y(a)}" x2="${l}" y2="${Y(a)}" stroke="#000"/><text x="${l - 8}" y="${Y(a) + 4}" text-anchor="end">${a}</text>`;
  s += `<text x="${l + pw / 2}" y="${H - 8}" text-anchor="middle" font-weight="600">Time in hours</text>`;
  s += `<text transform="translate(16 ${t + ph / 2}) rotate(-90)" text-anchor="middle" font-weight="600">Activity in Bq</text>`;
  let d = '';
  for (let h = 0; h <= 24.001; h += 0.2) d += `${h ? 'L' : 'M'}${X(h).toFixed(1)} ${Y(800 * 2 ** (-h / 6)).toFixed(1)}`;
  return s + `<path d="${d}" fill="none" stroke="#000" stroke-width="2"/></svg>`;
}

const Q = [
  { stem: 'Alpha, beta and gamma are three types of nuclear radiation.',
    parts: [
      { t: 'Complete the table.', marks: 3,
        html: `<table class="dtab"><tr><th>Type</th><th>What it is</th><th>What stops it</th></tr>
          <tr><td>alpha</td><td style="height:9mm"></td><td></td></tr>
          <tr><td>beta</td><td>a high-speed electron from the nucleus</td><td style="height:9mm"></td></tr>
          <tr><td>gamma</td><td style="height:9mm"></td><td>only reduced by thick lead or concrete</td></tr></table>`,
        ms: ['alpha: two protons and two neutrons / a helium nucleus', 'alpha: stopped by paper / skin / a few cm of air', 'gamma: electromagnetic radiation (from the nucleus)'],
        also: 'beta row: a few mm of aluminium. If this is written in the blank beta cell, credit it in place of either alpha mark.' },
      { t: 'Which type of radiation is the most strongly ionising?', marks: 1, lines: 1, ms: ['alpha'] },
      { t: 'Explain why a source that emits alpha radiation is most dangerous when it is inside the body.', marks: 2, lines: 3,
        ms: ['alpha is strongly ionising', 'it cannot escape the body / it is absorbed by nearby cells, so all its energy is deposited in body tissue'],
        no: 'Outside the body it is less dangerous because the outer layer of skin stops it (not needed for the marks).' }
    ] },

  { stem: `A student investigated a radioactive source. They first measured the background count rate with no source present.
      They then placed different absorbers between the source and a Geiger-Müller tube. The distance from the source to the tube stayed at 3 cm.
      <table class="dtab"><tr><th>Absorber</th><th>Count rate in counts per minute</th></tr>
      <tr><td>no source (background)</td><td>24</td></tr><tr><td>none</td><td>836</td></tr>
      <tr><td>paper, 0.1 mm</td><td>452</td></tr><tr><td>aluminium, 5 mm</td><td>188</td></tr><tr><td>lead, 10 cm</td><td>25</td></tr></table>`,
    parts: [
      { t: 'Why did the student measure the background count rate?', marks: 1, lines: 2,
        ms: ['so it can be subtracted from each reading, leaving the count rate from the source alone'] },
      { t: 'Calculate the count rate from the source alone when there is no absorber.', marks: 1, ans: 'Count rate = ____________ counts per minute',
        ms: ['812 counts per minute'], work: '836 − 24 = 812 counts per minute' },
      { t: 'Which types of radiation does the source emit? Give reasons for your answer using the data.', marks: 5, lines: 6,
        ms: ['alpha is emitted', 'because paper reduces the count rate (836 → 452)', 'beta is emitted', 'because 5 mm of aluminium reduces the count rate further (452 → 188)',
          'gamma is emitted, because the count after the aluminium is still well above background and only the lead brings it down to background (≈ 25)'],
        no: 'Do not credit a type named with no reason from the data. "Gamma is stopped by lead" is not needed for the mark.' },
      { t: 'Give one reason why the distance between the source and the tube was kept the same.', marks: 1, lines: 2,
        ms: ['count rate also changes with distance (and alpha has a short range in air), so only the absorber should change / to make it a fair test'] },
      { t: 'The student repeated the reading with paper and got 437 counts per minute. Explain why the two readings are different.', marks: 1, lines: 2,
        ms: ['radioactive decay is random'], no: 'Do not accept "human error" or "the source is weaker".' }
    ] },

  { stem: 'The graph shows how the activity of a sample of a radioactive isotope changes with time.',
    figure: decayGraphSVG(),
    parts: [
      { t: 'What is meant by the half-life of a radioactive isotope?', marks: 1, lines: 2,
        ms: ['the time it takes for the number of nuclei of the isotope in a sample to halve / the time for the activity (or count rate) to fall to half its initial value'],
        no: 'Do not accept "the time for half the atoms to disappear" or "half the time it takes to decay".' },
      { t: 'Use the graph to determine the half-life of the isotope. Show on the graph how you work out your answer.', marks: 2, ans: 'Half-life = ____________ hours',
        ms: ['construction lines on the graph from a value to half that value (e.g. 800 Bq and 400 Bq)', '6 hours'],
        work: 'Start at 800 Bq (t = 0). Half of 800 = 400 Bq.\nRead across from 400 Bq to the curve and down: t = 6 hours.\nCheck: 400 → 200 Bq takes another 6 hours (t = 12 h).' },
      { t: 'Determine the activity of the sample after 15 hours.', marks: 1, ans: 'Activity = ____________ Bq',
        ms: ['140 Bq (accept 130 to 150)'], work: 'Read up from 15 hours to the curve and across: about 140 Bq.' },
      { t: '<span class="tag">HT</span> Calculate the ratio of the activity after 24 hours to the initial activity.', marks: 2, ans: 'Ratio = ____________',
        ms: ['24 hours is 4 half-lives', '1 : 16 (or 1/16, or 50 Bq : 800 Bq)'],
        work: '24 ÷ 6 = 4 half-lives\n800 → 400 → 200 → 100 → 50 Bq\n50 : 800 = 1 : 16   (net decline = 15/16)' }
    ] },

  { stem: 'Half-life calculations. Show your working.',
    parts: [
      { t: 'Iodine-131 has a half-life of 8 days. A sample has an activity of 1200 Bq. Calculate its activity after 24 days.', marks: 2, lines: 2, ans: 'Activity = ____________ Bq',
        ms: ['24 days = 3 half-lives', '150 Bq'], work: '24 ÷ 8 = 3 half-lives\n1200 → 600 → 300 → 150 Bq' },
      { t: 'The activity of a sample of radon-222 falls from 320 Bq to 20 Bq in 15.2 days. Calculate the half-life of radon-222.', marks: 3, lines: 3, ans: 'Half-life = ____________ days',
        ms: ['320 → 160 → 80 → 40 → 20 (halving shown)', '4 half-lives', '3.8 days'], work: '320 → 160 → 80 → 40 → 20: that is 4 half-lives\n15.2 ÷ 4 = 3.8 days' },
      { t: 'Cobalt-60 has a half-life of 5.3 years. How long does it take for the activity of a cobalt-60 source to fall to one-eighth of its starting value?', marks: 2, lines: 2, ans: 'Time = ____________ years',
        ms: ['1/8 = 3 half-lives (½ × ½ × ½)', '15.9 years (accept 16 years)'], work: '1 → ½ → ¼ → ⅛: 3 half-lives\n3 × 5.3 = 15.9 years' },
      { t: 'A piece of ancient wood contains 25% of the carbon-14 found in living wood. The half-life of carbon-14 is 5730 years. Estimate the age of the wood.', marks: 2, lines: 2, ans: 'Age = ____________ years',
        ms: ['25% is 2 half-lives (100% → 50% → 25%)', '11 460 years (accept 11 000 to 11 500)'], work: '100% → 50% → 25%: 2 half-lives\n2 × 5730 = 11 460 years' }
    ] },

  { stem: 'Nuclear equations.',
    parts: [
      { t: 'Radium-226 decays by emitting an alpha particle. Complete the nuclear equation.', marks: 2,
        html: `<p class="nq">${nuc(226, 88, 'Ra')} → ${nuc(BLANK, BLANK, 'Rn')} + ${nuc(4, 2, 'He')}</p>`,
        ms: ['mass number 222', 'atomic number 86'], work: 'Top: 226 − 4 = 222\nBottom: 88 − 2 = 86' },
      { t: 'Carbon-14 decays by emitting a beta particle. Complete the nuclear equation.', marks: 2,
        html: `<p class="nq">${nuc(14, 6, 'C')} → ${nuc(BLANK, BLANK, 'N')} + ${nuc(0, '−1', 'e')}</p>`,
        ms: ['mass number 14', 'atomic number 7'], work: 'Top: 14 = 14 + 0, so 14\nBottom: 6 = 7 + (−1), so 7' },
      { t: 'Describe what happens inside the nucleus when beta decay happens.', marks: 2, lines: 3,
        ms: ['a neutron turns into a proton', 'and an electron is emitted (at high speed) from the nucleus'],
        no: 'Do not accept an electron from the outer shells / orbits.' },
      { t: 'Polonium-210 (atomic number 84) decays to lead-206 (atomic number 82). Name the type of radiation emitted and explain how you know.', marks: 2, lines: 3,
        ms: ['alpha', 'mass number falls by 4 and atomic number falls by 2'] },
      { t: 'Iodine-131 (atomic number 53) decays by beta emission to form xenon (Xe). Write the complete nuclear equation.', marks: 3, lines: 2,
        ms: [`${nuc(131, 53, 'I')} on the left`, `${nuc(131, 54, 'Xe')} on the right`, `${nuc(0, '−1', 'e')} on the right`],
        work: '131 = 131 + 0\n53 = 54 + (−1)' }
    ] },

  { stem: 'A hospital uses radioactive sources.',
    parts: [
      { t: 'Explain the difference between radioactive contamination and irradiation.', marks: 2, lines: 4,
        ms: ['contamination: unwanted radioactive atoms get on to or into other materials / a person', 'irradiation: an object is exposed to nuclear radiation (and does not become radioactive)'] }
    ] }
];
const marksOf = q => q.parts.reduce((s, p) => s + p.marks, 0);
const TOTAL = Q.reduce((s, q) => s + marksOf(q), 0);

function buildPrint() {
  $('#pCardBody').innerHTML = $('#summary').innerHTML.replace(/<h2[\s\S]*?<\/h2>/, '');
  const mk = n => `[${n} mark${n > 1 ? 's' : ''}]`;
  const space = p => (p.html || '') + (p.lines ? `<div class="lines">${'<i></i>'.repeat(p.lines)}</div>` : '') + (p.ans ? `<p class="ans">${p.ans}</p>` : '');
  $('#pQList').innerHTML = Q.map((q, i) => `<div class="q">
      <div class="qt"><span class="qn">${i + 1}</span><div>${q.stem}</div></div>
      ${q.figure ? `<figure>${q.figure}</figure>` : ''}
      ${q.parts.map((p, j) => `<div class="part"><div class="qt"><span>(${'abcdef'[j]})</span><span>${p.t}</span><span class="mk">${mk(p.marks)}</span></div>${space(p)}</div>`).join('')}
    </div>`).join('');
  $('#pMsList').innerHTML = Q.map((q, i) => `<div class="mq"><b>Question ${i + 1}</b>
      ${q.parts.map((p, j) => `<div class="mq"><span class="pm">${p.marks}</span><b>(${'abcdef'[j]})</b>
        <ul>${p.ms.map(m => `<li>${m}</li>`).join('')}</ul>
        ${p.work ? `<div class="work">${p.work}</div>` : ''}
        ${p.also ? `<p class="no">${p.also}</p>` : ''}${p.no ? `<p class="no">${p.no}</p>` : ''}</div>`).join('')}
    </div>`).join('');
  $('#wsTotal').textContent = TOTAL; $('#msTotal').textContent = TOTAL;
}
buildPrint();

const dlg = $('#printDlg');
$('#printBtn').addEventListener('click', () => dlg.showModal());
$('#pCancel').addEventListener('click', () => dlg.close());
$('#pGo').addEventListener('click', () => {
  const b = document.body.classList;
  b.toggle('p-no-card', !$('#pOptCard').checked); b.toggle('p-no-ws', !$('#pOptWs').checked); b.toggle('p-ms', $('#pOptMs').checked);
  if (!$('#pOptCard').checked && !$('#pOptWs').checked && !$('#pOptMs').checked) return;
  dlg.close();
  setTimeout(() => window.print(), 50);
});
window.addEventListener('afterprint', () => document.body.classList.remove('p-no-card', 'p-no-ws', 'p-ms'));

/* ════════════════════════ 8. main loop & keys ════════════════════════ */
let last = performance.now();
function frame(now) {
  const dt = Math.min(0.1, (now - last) / 1000); last = now;
  HL.tick(dt, now);
  if (view === 'hl' && (HL.dirty || HL.running || HL.flashing)) { HL.flashing = HL.drawGrid(now); HL.dirty = false; }
  if (view === 'ab') { AB.tick(dt, now); AB.draw(now); AB.updateCounter(now); }
  requestAnimationFrame(frame);
}

document.addEventListener('keydown', e => {
  if (e.target.closest('select, input[type="color"], dialog') || e.ctrlKey && e.key.toLowerCase() !== 'z' || e.altKey || e.metaKey) return;
  const k = e.key.toLowerCase();
  if (k === 'z' && e.ctrlKey && ink.open) { e.preventDefault(); ink.strokes.pop(); ink.redraw(); }
  else if (k === 'escape') { if (ink.open) ink.toggle(false); else if (document.body.classList.contains('presenting')) setPresenting(false); }
  else if (k === 'p' && !e.ctrlKey) setPresenting(!document.body.classList.contains('presenting'));
  else if (k === 'd' && !e.ctrlKey) ink.toggle();
});

if (!window.Chart) $('#chartCv').parentElement.innerHTML = '<p class="hint" style="padding:16px">The graph library did not load.</p>';
HL.setIsotope('c14');
$('#speedOut').textContent = `1 half-life in ${HL.pace()} s`;
AB.syncUI();
if (document.fonts) document.fonts.ready.then(() => { HL.rebuildChart(); HL.dirty = true; });
requestAnimationFrame(frame);
})();
