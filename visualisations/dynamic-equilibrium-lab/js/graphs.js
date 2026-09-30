/* Dynamic Equilibrium Lab — 4. graphing.

   A small canvas line chart, written for this tool rather than pulling in a
   charting library: live data, direct labels at the ends of the lines (so the
   lines can be told apart without colour), dashed markers where the teacher
   changed something, and text that scales up in presenter mode.

   The charts only draw what the app hands them: the history recorded from
   the model in app.js. Nothing here invents a curve. */
(function () {
'use strict';

const THEME = { text: '#edf2f8', body: '#c3ccd8', muted: '#8693a5', line: '#182535', line2: '#2c3d52', bg: '#091321' };

// A tidy axis maximum: 1, 2, 2.5 or 5 × 10^n just above v.
function niceMax(v) {
  if (!(v > 0)) return 1;
  const p = Math.pow(10, Math.floor(Math.log10(v))), m = v / p;
  return (m <= 1 ? 1 : m <= 2 ? 2 : m <= 2.5 ? 2.5 : m <= 5 ? 5 : 10) * p;
}
function ticks(max, n = 5) {
  const raw = max / n, p = Math.pow(10, Math.floor(Math.log10(raw))), m = raw / p;
  const step = (m <= 1 ? 1 : m <= 2 ? 2 : m <= 2.5 ? 2.5 : m <= 5 ? 5 : 10) * p;
  const out = [];
  for (let v = 0; v <= max + step * 1e-6; v += step) out.push(+v.toFixed(10));
  return out;
}
function fmtTick(v) {
  if (v === 0) return '0';
  if (Math.abs(v) >= 100) return String(Math.round(v));
  return String(+v.toPrecision(3));
}

class LineChart {
  constructor(canvas, opts) {
    this.cv = canvas;
    this.o = Object.assign({ xLabel: 'Time / s', yLabel: '', minSpan: 30, font: 12 }, opts);
    this.yMax = 0;
  }
  resize(font) {
    const r = this.cv.getBoundingClientRect(), dpr = Math.min(window.devicePixelRatio || 1, 2.5);
    const W = Math.max(1, Math.round(r.width * dpr)), H = Math.max(1, Math.round(r.height * dpr));
    if (this.cv.width !== W || this.cv.height !== H) { this.cv.width = W; this.cv.height = H; }
    this.ctx = this.cv.getContext('2d'); this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    this.w = r.width; this.h = r.height;
    if (font) this.o.font = font;
  }
  resetScale() { this.yMax = 0; }

  /* data: { t: [...], cols: { key: [...] } }, series: [{ key, label, color, dash, width, faint }],
     markers: [{ t, label }], t0: start of the window, now: current time. */
  draw({ data, series, markers = [], t0, now, yLabel }) {
    const ctx = this.ctx; if (!ctx || this.w < 20) return;
    const F = this.o.font, font = w => `${w} ${F}px 'Plus Jakarta Sans', system-ui, sans-serif`;
    ctx.clearRect(0, 0, this.w, this.h);

    // Visible window: from t0, at least minSpan seconds wide, the last 240 s at most.
    let xMin = t0, xMax = Math.max(t0 + this.o.minSpan, now);
    if (xMax - xMin > 240) xMin = xMax - 240;
    // Start index by binary search; draw at most ~ one point per pixel.
    const T = data.t;
    let i0 = 0, lo = 0, hi = T.length - 1;
    while (lo <= hi) { const m = (lo + hi) >> 1; if (T[m] < xMin) lo = m + 1; else hi = m - 1; }
    i0 = lo;
    let vmax = 0;
    series.forEach(s => { const a = data.cols[s.key]; if (!a) return; for (let i = i0; i < T.length; i++) if (a[i] > vmax) vmax = a[i]; });
    const want = niceMax(vmax * 1.08);
    // The scale only grows while the data grows, and shrinks when the data has fallen well below it.
    if (want > this.yMax || want < this.yMax * 0.4) this.yMax = want;
    const yMax = this.yMax || 1;

    ctx.font = font(500);
    const yt = ticks(yMax, this.h < 200 ? 3 : 5);
    const tickW = Math.max(...yt.map(v => ctx.measureText(fmtTick(v)).width));
    const L = tickW + F * 2.6, Rm = F * 3.6, Tm = F * 0.9, B = F * 3.2;
    const pw = Math.max(10, this.w - L - Rm), ph = Math.max(10, this.h - Tm - B);
    const X = t => L + (t - xMin) / (xMax - xMin) * pw, Y = v => Tm + ph - v / yMax * ph;

    // Grid and axes.
    ctx.strokeStyle = THEME.line; ctx.lineWidth = 1;
    ctx.fillStyle = THEME.muted; ctx.textAlign = 'right'; ctx.textBaseline = 'middle';
    yt.forEach(v => {
      const y = Math.round(Y(v)) + 0.5;
      ctx.beginPath(); ctx.moveTo(L, y); ctx.lineTo(L + pw, y); ctx.stroke();
      ctx.fillText(fmtTick(v), L - F * 0.5, y);
    });
    // Time ticks at round values of the simulation clock.
    const xt = ticks(xMax - xMin, Math.max(3, Math.min(8, Math.floor(pw / (F * 5)))));
    const xs = xt.length > 1 ? xt[1] : xMax - xMin;
    ctx.textAlign = 'center'; ctx.textBaseline = 'top';
    for (let v = Math.ceil(xMin / xs - 1e-9) * xs; v <= xMax + 1e-9; v += xs) {
      const x = Math.round(X(v)) + 0.5;
      ctx.beginPath(); ctx.moveTo(x, Tm + ph); ctx.lineTo(x, Tm + ph + F * 0.35); ctx.strokeStyle = THEME.line2; ctx.stroke();
      ctx.fillText(fmtTick(Math.round(v * 10) / 10), x, Tm + ph + F * 0.5);
    }
    ctx.strokeStyle = THEME.line2; ctx.lineWidth = 1.2;
    ctx.beginPath(); ctx.moveTo(L + 0.5, Tm); ctx.lineTo(L + 0.5, Tm + ph + 0.5); ctx.lineTo(L + pw, Tm + ph + 0.5); ctx.stroke();
    ctx.fillStyle = THEME.body; ctx.font = font(600);
    ctx.textAlign = 'center'; ctx.textBaseline = 'bottom';
    ctx.fillText(this.o.xLabel, L + pw / 2, this.h - F * 0.2);
    ctx.save(); ctx.translate(F * 1.05, Tm + ph / 2); ctx.rotate(-Math.PI / 2); ctx.textBaseline = 'middle';
    // A short axis title when the full one is longer than the axis.
    let yl = yLabel || this.o.yLabel;
    if (ctx.measureText(yl).width > ph && this.o.yShort) yl = this.o.yShort;
    ctx.fillText(yl, 0, 0); ctx.restore();

    // Markers where a condition was changed.
    ctx.font = font(600);
    markers.forEach(m => {
      if (m.t < xMin || m.t > xMax) return;
      const x = Math.round(X(m.t)) + 0.5;
      ctx.save(); ctx.strokeStyle = THEME.muted; ctx.setLineDash([3, 4]); ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(x, Tm); ctx.lineTo(x, Tm + ph); ctx.stroke(); ctx.restore();
      ctx.fillStyle = THEME.body; ctx.textAlign = 'left'; ctx.textBaseline = 'top';
      ctx.fillText(m.label, x + 3, Tm + 1);
    });

    // Lines, thinned to about a point per pixel.
    ctx.save();
    ctx.beginPath(); ctx.rect(L, Tm - 2, pw + 2, ph + 4); ctx.clip();
    const n = T.length - i0, stride = Math.max(1, Math.floor(n / Math.max(50, pw)));
    const ends = [];
    series.forEach(s => {
      const a = data.cols[s.key]; if (!a || n < 1) return;
      ctx.strokeStyle = s.color; ctx.lineWidth = (s.width || 2.2) * Math.max(1, F / 14);
      ctx.globalAlpha = s.faint ? 0.45 : 1;
      ctx.setLineDash(s.dash ? s.dash.map(d => d * Math.max(1, F / 13)) : []);
      ctx.lineJoin = 'round';
      ctx.beginPath();
      let started = false;
      for (let i = i0; i < T.length; i += stride) {
        const x = X(T[i]), y = Y(a[i]);
        if (!started) { ctx.moveTo(x, y); started = true; } else ctx.lineTo(x, y);
      }
      if (T.length - 1 >= i0) ctx.lineTo(X(T[T.length - 1]), Y(a[T.length - 1]));
      ctx.stroke();
      if (!s.faint && s.label) ends.push({ s, y: Y(a[T.length - 1]), x: X(T[T.length - 1]) });
    });
    ctx.restore();
    ctx.globalAlpha = 1; ctx.setLineDash([]);

    // Direct labels at the line ends, nudged apart so they never overlap.
    ctx.font = font(700); ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
    ends.sort((a, b) => a.y - b.y);
    const gap = F * 1.15;
    for (let i = 1; i < ends.length; i++) if (ends[i].y - ends[i - 1].y < gap) ends[i].y = ends[i - 1].y + gap;
    const over = ends.length ? ends[ends.length - 1].y - (Tm + ph) : 0;
    if (over > 0) ends.forEach(e => { e.y -= over; });
    ends.forEach(e => {
      ctx.fillStyle = e.s.color;
      ctx.fillText(e.s.label, Math.min(e.x, L + pw) + F * 0.45, e.y);
    });
  }
}

/* A small chart of two curves against temperature, for the Haber panel:
   equilibrium yield (left axis, %) and relative rate (right axis). */
function drawCompromise(cv, { T, yieldPct, rate, Tnow, font = 11, unitC = true }) {
  const r = cv.getBoundingClientRect(), dpr = Math.min(window.devicePixelRatio || 1, 2.5);
  cv.width = Math.max(1, Math.round(r.width * dpr)); cv.height = Math.max(1, Math.round(r.height * dpr));
  const ctx = cv.getContext('2d'); ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  const w = r.width, h = r.height, F = font, f = wt => `${wt} ${F}px 'Plus Jakarta Sans', system-ui, sans-serif`;
  const L = F * 3.4, Rm = F * 3.4, Tm = F * 1.8, B = F * 2.8, pw = w - L - Rm, ph = h - Tm - B;
  const x0 = T[0], x1 = T[T.length - 1];
  const X = t => L + (t - x0) / (x1 - x0) * pw;
  const yMax = niceMax(Math.max(...yieldPct) * 1.05), rMax = niceMax(Math.max(...rate) * 1.05);
  const Y1 = v => Tm + ph - v / yMax * ph, Y2 = v => Tm + ph - v / rMax * ph;
  ctx.font = f(500); ctx.fillStyle = THEME.muted; ctx.strokeStyle = THEME.line; ctx.lineWidth = 1;
  ticks(yMax, 4).forEach(v => {
    const y = Math.round(Y1(v)) + 0.5;
    ctx.beginPath(); ctx.moveTo(L, y); ctx.lineTo(L + pw, y); ctx.stroke();
    ctx.textAlign = 'right'; ctx.textBaseline = 'middle'; ctx.fillStyle = '#6fe3a3'; ctx.fillText(fmtTick(v), L - 4, y);
  });
  ticks(rMax, 4).forEach(v => { ctx.textAlign = 'left'; ctx.fillStyle = '#f5b14c'; ctx.fillText(fmtTick(v), L + pw + 4, Y2(v)); });
  ctx.fillStyle = THEME.muted; ctx.textAlign = 'center'; ctx.textBaseline = 'top';
  // Round-number ticks in whichever unit is shown.
  const off = unitC ? 273 : 0;
  for (let u = Math.ceil((x0 - off) / 50) * 50; u <= x1 - off + 1e-6; u += 50) ctx.fillText(String(u), X(u + off), Tm + ph + 4);
  ctx.fillStyle = THEME.body; ctx.font = f(600); ctx.textBaseline = 'bottom';
  ctx.fillText(unitC ? 'Temperature / °C' : 'Temperature / K', L + pw / 2, h - 1);
  ctx.textAlign = 'left'; ctx.textBaseline = 'top'; ctx.fillStyle = '#6fe3a3';
  ctx.fillText('% NH₃ at equilibrium', L, 1);
  ctx.textAlign = 'right'; ctx.fillStyle = '#f5b14c';
  ctx.fillText('rate (relative)', L + pw, 1);
  const line = (arr, Yf, col, dash) => {
    ctx.strokeStyle = col; ctx.lineWidth = 2.2; ctx.setLineDash(dash || []);
    ctx.beginPath(); arr.forEach((v, i) => { const x = X(T[i]), y = Yf(v); if (i) ctx.lineTo(x, y); else ctx.moveTo(x, y); }); ctx.stroke();
    ctx.setLineDash([]);
  };
  line(yieldPct, Y1, '#6fe3a3');
  line(rate, Y2, '#f5b14c', [6, 4]);
  // Where the chamber is now.
  const x = X(Tnow);
  ctx.strokeStyle = THEME.text; ctx.setLineDash([2, 3]); ctx.lineWidth = 1;
  ctx.beginPath(); ctx.moveTo(x, Tm); ctx.lineTo(x, Tm + ph); ctx.stroke(); ctx.setLineDash([]);
  ctx.strokeStyle = THEME.line2; ctx.lineWidth = 1.2;
  ctx.beginPath(); ctx.moveTo(L, Tm); ctx.lineTo(L, Tm + ph); ctx.lineTo(L + pw, Tm + ph); ctx.lineTo(L + pw, Tm); ctx.stroke();
}

/* The catalyst comparison: product concentration against time, with and without. */
function drawCatalyst(cv, { a, b, label, font = 11, color = '#6fe3a3' }) {
  const r = cv.getBoundingClientRect(), dpr = Math.min(window.devicePixelRatio || 1, 2.5);
  cv.width = Math.max(1, Math.round(r.width * dpr)); cv.height = Math.max(1, Math.round(r.height * dpr));
  const ctx = cv.getContext('2d'); ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  const w = r.width, h = r.height, F = font, f = wt => `${wt} ${F}px 'Plus Jakarta Sans', system-ui, sans-serif`;
  const L = F * 1.6, Rm = F * 0.8, Tm = F * 0.6, B = F * 2.2, pw = w - L - Rm, ph = h - Tm - B;
  const tMax = Math.max(a.trace[a.trace.length - 1][0], b.trace[b.trace.length - 1][0]);
  const vMax = niceMax(Math.max(...a.trace.map(p => p[1]), ...b.trace.map(p => p[1])) * 1.1);
  const X = t => L + t / tMax * pw, Y = v => Tm + ph - v / vMax * ph;
  ctx.strokeStyle = THEME.line2; ctx.lineWidth = 1.2;
  ctx.beginPath(); ctx.moveTo(L, Tm); ctx.lineTo(L, Tm + ph); ctx.lineTo(L + pw, Tm + ph); ctx.stroke();
  const line = (tr, dash, alpha) => {
    ctx.save(); ctx.globalAlpha = alpha; ctx.strokeStyle = color; ctx.lineWidth = 2.4; ctx.setLineDash(dash);
    ctx.beginPath(); tr.forEach((p, i) => { const x = X(p[0]), y = Y(p[1]); if (i) ctx.lineTo(x, y); else ctx.moveTo(x, y); }); ctx.stroke(); ctx.restore();
  };
  line(a.trace, [6, 4], 0.8);
  line(b.trace, [], 1);
  const mark = (t, txt, below) => {
    if (t === null) return;
    const x = X(t);
    ctx.strokeStyle = THEME.muted; ctx.setLineDash([2, 3]); ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(x, Tm); ctx.lineTo(x, Tm + ph); ctx.stroke(); ctx.setLineDash([]);
    ctx.fillStyle = THEME.body; ctx.font = f(600); ctx.textAlign = 'center'; ctx.textBaseline = 'top';
    ctx.fillText(txt, Math.min(w - F * 2, Math.max(L + F * 2, x)), Tm + ph + (below ? F * 1.05 : 2));
  };
  mark(b.tEq, 'with', false);
  mark(a.tEq, 'without', true);
  ctx.save(); ctx.translate(F * 0.7, Tm + ph / 2); ctx.rotate(-Math.PI / 2); ctx.fillStyle = THEME.muted; ctx.font = f(600);
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(label, 0, 0); ctx.restore();
}

window.EQ_GRAPHS = { LineChart, drawCompromise, drawCatalyst, niceMax };
})();
