/* NMR Spectroscopy: spectrum engine.
   Builds a spectrum as a sum of Lorentzian lines (one per resolved peak, areas in the ratio the chemistry
   demands), adds a little noise and baseline, and draws it on a canvas (NMR.View) or as SVG for print (NMR.svg).

     var spec = NMR.build(NMR.mol('ethanol'), 'H', { freq: 60, tms: true });
     var view = new NMR.View(hostElement, { nuc: 'H', integ: true });
     view.setSpec(spec);

   Nothing here draws idealised sticks: every peak is a line shape with a real width, so zooming into a
   multiplet shows the same thing a spectrometer would.                                                       */
(function () {
  'use strict';
  var NMR = window.NMR = window.NMR || {};
  var PI = Math.PI;

  NMR.FREQ_H = 60;                 // MHz: a benchtop teaching spectrometer, where splitting is easy to resolve
  NMR.freqC = function (fh) { return fh * 0.25145; };
  NMR.PATTERNS = ['singlet', 'doublet', 'triplet', 'quartet', 'quintet', 'sextet', 'septet'];
  NMR.PAT_SHORT = ['s', 'd', 't', 'q', 'quin', 'sex', 'sept'];
  NMR.pattern = function (nb) { return NMR.PATTERNS[nb] || 'multiplet'; };
  NMR.pascal = function (n) { var r = [1]; for (var i = 1; i <= n; i++) { var s = [1]; for (var j = 1; j < i; j++) s.push(r[j - 1] + r[j]); s.push(1); r = s; } return r; };

  function hash(s) { var h = 2166136261; s = String(s); for (var i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return ((h >>> 0) % 100000) / 100000; }
  function vnoise(i, seed) { return hash(seed + ':' + i) * 2 - 1; }

  /* ───────── Build a spectrum ─────────
     opts: freq (MHz of 1H), tms, solvent ('cdcl3' | 'chcl3' | 'hexane' | 'd2o' | 'ccl4' | null), offset (ppm drift),
           d2o (exchange the O–H), seed, only (array of env ids to include).                                    */
  NMR.build = function (mol, nuc, opts) {
    opts = opts || {};
    var fh = opts.freq || NMR.FREQ_H, isH = nuc === 'H', freq = isH ? fh : NMR.freqC(fh);
    var seed = opts.seed || mol.id, off = opts.offset || 0;
    var lines = [], envs = [];

    if (isH) {
      var list = mol.H.filter(function (e) { return !opts.only || opts.only.indexOf(e.id) >= 0; });
      list.forEach(function (e) {
        if (opts.d2o && e.ex) return;                    // exchanges with D2O: disappears
        var ls = multiplet(e, mol, freq), gw = (e.ex ? (e.d > 9 ? 28 : 14) : 0.8) / freq;
        var ent = { id: e.id, d: e.d + off, n: e.n, nb: e.nb || 0, ex: !!e.ex, lab: e.lab, lo: 99, hi: -99, kind: 'sample' };
        ls.forEach(function (l) { lines.push({ x: l.x + off, w: l.w, g: gw, env: e.id, int: true, kind: 'sample' }); ent.lo = Math.min(ent.lo, l.x + off); ent.hi = Math.max(ent.hi, l.x + off); });
        envs.push(ent);
      });
    } else {
      mol.C.forEach(function (e) {
        var w = Math.pow(e.n, 0.7) * (e.q ? 0.42 : 1) * (0.9 + 0.2 * hash(seed + e.id));
        lines.push({ x: e.d + off, w: w, g: 1.1 / freq, env: e.id, int: false, kind: 'sample' });
        envs.push({ id: e.id, d: e.d + off, n: e.n, nb: 0, lab: e.lab, lo: e.d + off, hi: e.d + off, kind: 'sample' });
      });
    }

    var extras = [];
    if (opts.tms) extras.push({ x: 0, w: isH ? 2.2 : 1.1, g: (isH ? 0.6 : 1.0) / freq, tag: 'TMS' });
    var sv = opts.solvent;
    if (isH) {
      if (sv === 'cdcl3') extras.push({ x: 7.26, w: 0.3, g: 0.9 / freq, tag: 'CHCl₃ (residual)' });
      if (sv === 'chcl3') extras.push({ x: 7.26, w: 60, g: 0.9 / freq, tag: 'CHCl₃' });
      if (sv === 'hexane') { extras.push({ x: 0.88, w: 70, g: 2.5 / freq, tag: 'hexane CH₃' }); extras.push({ x: 1.26, w: 95, g: 2.5 / freq, tag: 'hexane CH₂' }); }
      if (sv === 'd2o') extras.push({ x: 4.79, w: 7, g: 3.5 / freq, tag: 'HOD' });
    } else if (sv === 'cdcl3') {
      [-1, 0, 1].forEach(function (k) { extras.push({ x: 77.16 + k * 32 / freq, w: 0.85, g: 1.0 / freq, tag: 'CDCl₃ (1:1:1 triplet)' }); });
    }
    extras.forEach(function (x) { lines.push({ x: x.x + off, w: x.w, g: x.g, env: null, int: false, kind: 'ref', tag: x.tag }); });

    var spec = { nuc: nuc, freq: freq, fh: fh, mol: mol, lines: lines, envs: envs, seed: seed, refs: extras, offset: off };
    // global maximum: evaluate at every line centre
    var m = 0; lines.forEach(function (l) { m = Math.max(m, NMR.yAt(spec, l.x)); });
    spec.ymax = m || 1;
    spec.range = isH ? [-0.5, 12] : [-5, 225];
    // integration totals and the step heights (mm) a student would measure off the printed trace
    var tot = 0; envs.forEach(function (e) { if (isH) tot += e.n; });
    spec.intTotal = tot;
    spec.steps = envs.map(function (e) {
      var jit = 1 + (hash(seed + 'i' + e.id) - 0.5) * 0.04;
      return { id: e.id, mm: isH && tot ? e.n * 6 * jit : 0, n: e.n };
    });
    return spec;
  };

  function multiplet(e, mol, freq) {
    if (e.lines) { var s = 0; e.lines.forEach(function (l) { s += l[1]; }); return e.lines.map(function (l) { return { x: l[0], w: e.n * l[1] / s }; }); }
    if (e.ex || !e.nb) return [{ x: e.d, w: e.n }];
    var J = e.J || 7, nb = e.nb, tot = Math.pow(2, nb), out = [], sumw = 0;
    var dnu = 0;
    if (e.p) { var pe = mol.H.filter(function (h) { return h.id === e.p; })[0]; if (pe) dnu = (pe.d - e.d) * freq; }
    for (var k = 0; k <= nb; k++) {
      var offHz = (k - nb / 2) * J, w = e.n * NMR.pascal(nb)[k] / tot;
      if (dnu) w *= Math.max(0.55, Math.min(1.7, 1 + 0.9 * offHz * (dnu > 0 ? 1 : -1) / Math.abs(dnu)));   // "roofing": lines lean towards the coupled partner
      out.push({ x: e.d + offHz / freq, w: w }); sumw += w;
    }
    out.forEach(function (o) { o.w *= e.n / sumw; });
    return out;
  }

  /* Raw intensity at x (ppm): sum of Lorentzians with unit area per unit weight. */
  NMR.yAt = function (spec, x) {
    var y = 0, L = spec.lines;
    for (var i = 0; i < L.length; i++) { var l = L[i], d = x - l.x; y += l.w * l.g / (PI * (d * d + l.g * l.g)); }
    return y;
  };
  /* Running integral of the sample lines up to x, rising from low δ to high δ. */
  NMR.intAt = function (spec, x) {
    var s = 0, L = spec.lines;
    for (var i = 0; i < L.length; i++) { var l = L[i]; if (!l.int) continue; s += l.w * (0.5 + Math.atan((x - l.x) / l.g) / PI); }
    return s;
  };

  /* Sample the trace across [lo, hi], with extra points around every line so apexes are never missed. */
  NMR.sample = function (spec, lo, hi, n) {
    var xs = [], step = (hi - lo) / n, i;
    for (i = 0; i <= n; i++) xs.push(lo + i * step);
    var mults = [0, 0.4, 1, 2.5, 7, 25];
    spec.lines.forEach(function (l) {
      if (l.x < lo - 1 || l.x > hi + 1) return;
      mults.forEach(function (m) { var a = l.x + m * l.g; if (a >= lo && a <= hi) xs.push(a); if (m) { var b = l.x - m * l.g; if (b >= lo && b <= hi) xs.push(b); } });
    });
    xs.sort(function (a, b) { return a - b; });
    var out = [], prev = null;
    xs.forEach(function (x) { if (prev === null || x - prev > 1e-9) { out.push(x); prev = x; } });
    return out;
  };

  /* Noise + baseline, in units of the spectrum's tallest peak. Smooth value noise on a grid tied to the view. */
  NMR.noiseAt = function (spec, x, cell, amp) {
    var t = x / cell, i = Math.floor(t), f = t - i; f = f * f * (3 - 2 * f);
    var n = vnoise(i, spec.seed) * (1 - f) + vnoise(i + 1, spec.seed) * f;
    var base = 0.0009 * Math.sin(x * (spec.nuc === 'H' ? 0.9 : 0.045) + 1.3) + 0.0006;
    return (n * amp + base) * spec.ymax;
  };

  /* ───────── Axis ticks ───────── */
  function niceStep(span, target) {
    var raw = span / Math.max(2, target), p = Math.pow(10, Math.floor(Math.log10(raw))), f = raw / p;
    return (f < 1.5 ? 1 : f < 3.5 ? 2 : f < 7.5 ? 5 : 10) * p;
  }
  function decimals(step) { return step >= 1 ? 0 : Math.min(3, Math.ceil(-Math.log10(step) - 1e-9)); }
  NMR.ticks = function (lo, hi, targetMajor) {
    var step = niceStep(hi - lo, targetMajor), minor = step / (step.toString().indexOf('5') >= 0 || /^2/.test((step / Math.pow(10, Math.floor(Math.log10(step)))).toString()) ? 5 : 5);
    minor = step / 5;
    var out = { step: step, dec: decimals(step), major: [], minor: [] };
    for (var v = Math.ceil(lo / minor - 1e-9) * minor; v <= hi + 1e-9; v += minor) {
      var r = Math.round(v / step), isMaj = Math.abs(v - r * step) < minor * 0.01;
      (isMaj ? out.major : out.minor).push(Math.round(v * 1e6) / 1e6);
    }
    return out;
  };

  /* ───────── Theme palettes (hex: canvas cannot read oklch) ───────── */
  NMR.PAL = {
    dark:  { bg: '#091321', fg: '#edf2f8', axis: '#8693a5', grid: '#182535', integ: '#47b5fa', sel: 'rgba(71,181,250,.18)', cur: '#8693a5', ref: '#8693a5',
             env: ['#47b5fa', '#b199f4', '#63d18f', '#f3b94c', '#ff8a7a', '#4fd1c5'] },
    light: { bg: '#f8fafd', fg: '#142030', axis: '#596473', grid: '#e3e8ee', integ: '#0068b2', sel: 'rgba(0,104,178,.14)', cur: '#596473', ref: '#596473',
             env: ['#0068b2', '#6c4ab3', '#1f7a52', '#a8650a', '#c0432f', '#14808a'] }
  };
  NMR.pal = function () { return NMR.PAL[(window.SST_THEME && SST_THEME.get()) === 'light' ? 'light' : 'dark']; };
  NMR.envColour = function (mol, id, nuc) {
    var list = nuc === 'C' ? mol.C : mol.H, i = 0;
    for (var k = 0; k < list.length; k++) if (list[k].id === id) i = k;
    return NMR.pal().env[i % 6];
  };


  /* Canvas text with super/subscript digits drawn in the page font (it has no ⁴–⁹ or ₀–₉ glyphs). */
  var CSUP = '⁰¹²³⁴⁵⁶⁷⁸⁹', CSUB = '₀₁₂₃₄₅₆₇₈₉';
  NMR.fillText = function (c, text, x, y) {
    text = String(text);
    if (!/[⁰¹²³⁴-⁹₀-₉]/.test(text)) { c.fillText(text, x, y); return; }
    var font = c.font, m = /(\d+(?:\.\d+)?)px/.exec(font), size = m ? +m[1] : 12, small = font.replace(m[0], (size * 0.7).toFixed(1) + 'px');
    var runs = [], cur = null;
    for (var i = 0; i < text.length; i++) {
      var ch = text[i], k = CSUP.indexOf(ch) >= 0 ? 'p' : CSUB.indexOf(ch) >= 0 ? 'b' : 'n', d = k === 'p' ? CSUP.indexOf(ch) : k === 'b' ? CSUB.indexOf(ch) : ch;
      if (!cur || cur.k !== k) { cur = { k: k, t: '' }; runs.push(cur); } cur.t += d;
    }
    var w = 0; runs.forEach(function (r) { c.font = r.k === 'n' ? font : small; r.w = c.measureText(r.t).width; w += r.w; });
    var al = c.textAlign, x0 = al === 'center' ? x - w / 2 : al === 'right' || al === 'end' ? x - w : x;
    c.textAlign = 'left';
    runs.forEach(function (r) { c.font = r.k === 'n' ? font : small; c.fillText(r.t, x0, y + (r.k === 'b' ? size * 0.22 : r.k === 'p' ? -size * 0.38 : 0)); x0 += r.w; });
    c.font = font; c.textAlign = al;
  };

  function fs(base) {
    if (document.body.classList.contains('presenting') && window.SST_PRESENT) return Math.max(base, SST_PRESENT.px('--sst-pr-label'));
    return base;
  }

  /* ───────── Canvas view ───────── */
  var views = [];
  document.addEventListener('sst-theme', function () { views.forEach(function (v) { v.draw(); }); });

  function View(host, o) {
    var self = this;
    this.o = Object.assign({ nuc: 'H', integ: false, labels: false, colour: false, steps: false, tools: true, minH: 200 }, o || {});
    this.host = host; host.classList.add('nv');
    this.cv = document.createElement('canvas'); this.cv.className = 'nv-cv';
    this.cv.setAttribute('role', 'img');
    host.appendChild(this.cv);
    this.ctx = this.cv.getContext('2d');
    this.spec = null; this.sel = null; this.hl = []; this.cur = null; this.sweep = null; this.marks = [];
    this.lo = 0; this.hi = 1; this.W = 300; this.H = 200; this.dpr = 1;
    if (this.o.tools) this.buildTools();
    this.readout = document.createElement('div'); this.readout.className = 'nv-read'; this.readout.hidden = true; host.appendChild(this.readout);
    this.bind();
    if (window.ResizeObserver) { this.ro = new ResizeObserver(function () { self.resize(); }); this.ro.observe(host); }
    this._onR = function () { self.resize(); };
    window.addEventListener('resize', this._onR);
    views.push(this);
    setTimeout(function () { self.resize(); }, 0);
  }
  var P = View.prototype;

  P.buildTools = function () {
    var self = this, t = document.createElement('div'); t.className = 'nv-tools sst-teacher';
    t.innerHTML = '<button type="button" data-a="in" aria-label="Zoom in" title="Zoom in">+</button><button type="button" data-a="out" aria-label="Zoom out" title="Zoom out">−</button>' +
      '<button type="button" data-a="fit" title="Zoom to the signals">Fit</button><button type="button" data-a="full" title="Show the whole scale">Full</button>';
    t.addEventListener('click', function (e) {
      var b = e.target.closest('button'); if (!b) return;
      var a = b.dataset.a;
      if (a === 'in') self.zoom(0.5); else if (a === 'out') self.zoom(2); else if (a === 'fit') self.fit(); else if (a === 'full') self.full();
    });
    this.host.appendChild(t); this.tools = t;
  };

  P.setSpec = function (spec, keepRange) {
    this.spec = spec;
    if (!keepRange) this.initialRange();
    this.cv.setAttribute('aria-label', this.o.alt || ((spec.nuc === 'H' ? 'Proton' : 'Carbon-13') + ' NMR spectrum'));
    this.draw();
  };
  P.initialRange = function () {
    if (!this.spec) return;
    if (this.W < 560 || this.o.startFit) this.fit(true); else this.full(true);
  };
  P.signalBounds = function () {
    var s = this.spec, lo = 1e9, hi = -1e9;
    s.envs.forEach(function (e) { lo = Math.min(lo, e.lo); hi = Math.max(hi, e.hi); });
    if (this.o.showTMS !== false) s.lines.forEach(function (l) { if (l.kind === 'ref' && l.x < 1) lo = Math.min(lo, l.x); });
    if (lo > hi) { lo = 0; hi = 10; }
    return [lo, hi];
  };
  P.full = function (quiet) { this.lo = this.spec.range[0]; this.hi = this.spec.range[1]; if (!quiet) this.draw(); };
  P.fit = function (quiet) {
    var b = this.signalBounds(), pad = this.spec.nuc === 'H' ? 0.7 : 14;
    this.lo = Math.max(this.spec.range[0], b[0] - pad); this.hi = Math.min(this.spec.range[1], b[1] + pad);
    if (this.hi - this.lo < (this.spec.nuc === 'H' ? 2.2 : 40)) { var c = (this.hi + this.lo) / 2, h = (this.spec.nuc === 'H' ? 1.1 : 20); this.lo = c - h; this.hi = c + h; }
    if (!quiet) this.draw();
  };
  P.setRange = function (lo, hi) { this.lo = lo; this.hi = hi; this.userMoved = true; this.draw(); };
  P.setBand = function (b) { this.band = b; this.draw(); };
  P.zoom = function (f, cx) {
    var min = this.spec.nuc === 'H' ? 0.12 : 6, max = this.spec.range[1] - this.spec.range[0];
    if (cx === undefined) cx = (this.lo + this.hi) / 2;
    var span = Math.max(min, Math.min(max, (this.hi - this.lo) * f)), r = (cx - this.lo) / (this.hi - this.lo);
    this.lo = cx - r * span; this.hi = this.lo + span;
    this.userMoved = true; this.clamp(); this.draw();
  };
  P.clamp = function () {
    var a = this.spec.range[0] - 1, b = this.spec.range[1] + 1, span = this.hi - this.lo;
    if (this.lo < a) { this.lo = a; this.hi = a + span; }
    if (this.hi > b) { this.hi = b; this.lo = b - span; }
  };
  P.destroy = function () {
    var i = views.indexOf(this); if (i >= 0) views.splice(i, 1);
    if (this.ro) this.ro.disconnect();
    window.removeEventListener('resize', this._onR);
  };
  P.select = function (id, quiet) { this.sel = id; if (!quiet) this.draw(); };
  P.highlight = function (ids) { this.hl = ids || []; this.draw(); };
  P.setSweep = function (x) { this.sweep = x; this.draw(); };

  P.resize = function () {
    var r = this.host.getBoundingClientRect(); if (!r.width) return;
    var w = Math.round(r.width), h = Math.round(r.height || this.o.minH);
    if (h < 120) h = this.o.minH;
    this.dpr = Math.min(2.5, window.devicePixelRatio || 1);
    if (w === this.W && h === this.H && this.cv.width === Math.round(w * this.dpr)) return;
    var first = this.W === 300 && !this.sized; this.sized = true;
    this.W = w; this.H = h;
    this.cv.width = Math.round(w * this.dpr); this.cv.height = Math.round(h * this.dpr);
    this.cv.style.width = w + 'px'; this.cv.style.height = h + 'px';
    if (first && this.spec && !this.userMoved) this.initialRange();
    this.draw();
  };

  P.layout = function () {
    var f = fs(11.5), top = 14 + (this.o.tools ? 30 : 0) + (this.o.labels || this.o.colour ? fs(12) + 4 : 0);
    return { f: f, L: 10, R: 12, T: top, B: Math.round(f * 3.1) + 4 };
  };
  P.x2p = function (x) { var m = this.layout(); return m.L + (this.hi - x) / (this.hi - this.lo) * (this.W - m.L - m.R); };
  P.p2x = function (px) { var m = this.layout(); return this.hi - (px - m.L) / (this.W - m.L - m.R) * (this.hi - this.lo); };

  P.draw = function () {
    var spec = this.spec, c = this.ctx; if (!spec || !this.W) return;
    var pal = NMR.pal(), m = this.layout(), dpr = this.dpr, W = this.W, H = this.H;
    c.setTransform(dpr, 0, 0, dpr, 0, 0);
    c.clearRect(0, 0, W, H);
    var pw = W - m.L - m.R, ph = H - m.T - m.B, base = H - m.B, lo = this.lo, hi = this.hi, self = this;
    var o = this.o;

    // ticks and faint grid
    var tk = NMR.ticks(lo, hi, Math.max(3, pw / 70));
    c.lineWidth = 1; c.strokeStyle = pal.grid;
    c.beginPath(); tk.major.forEach(function (v) { var x = Math.round(self.x2p(v)) + .5; c.moveTo(x, m.T); c.lineTo(x, base); }); c.stroke();

    // a shaded shift range (a data-sheet row)
    if (this.band) { var bx1 = this.x2p(this.band[1]), bx2 = this.x2p(this.band[0]); c.fillStyle = pal.sel; c.fillRect(bx1, m.T, bx2 - bx1, ph); }

    // environment bands (colour mode / highlight / selection)
    var placed = [];
    spec.envs.forEach(function (e, i) {
      var on = self.sel === e.id || self.hl.indexOf(e.id) >= 0, show = o.colour || on; if (!show) return;
      var pad = Math.max(spec.nuc === 'H' ? 0.07 : 3, 6 * (hi - lo) / pw);
      var x1 = self.x2p(e.hi + pad), x2 = self.x2p(e.lo - pad), col = NMR.envColour(spec.mol, e.id, spec.nuc);
      c.fillStyle = col; c.globalAlpha = on ? 0.2 : 0.09; c.fillRect(x1, m.T, x2 - x1, ph); c.globalAlpha = 1;
      if (o.colour) {
        c.font = '700 ' + fs(12) + 'px "Plus Jakarta Sans",system-ui,sans-serif';
        var tx = (e.lab || e.id).replace(/\s*\(.*\)/, ''), tw = c.measureText(tx).width, cx0 = (x1 + x2) / 2;
        if (cx0 > m.L && cx0 < W - m.R && !placed.some(function (q) { return Math.abs(q - cx0) < (tw + 8); })) {
          placed.push(cx0); c.fillStyle = col; c.textAlign = 'center'; c.textBaseline = 'bottom'; NMR.fillText(c, tx, Math.max(m.L + tw / 2, Math.min(W - m.R - tw / 2, cx0)), m.T - 3);
        }
      }
    });

    // the trace: autoscaled to what is visible
    var N = Math.max(200, Math.round(pw * 1.2)), xs = NMR.sample(spec, lo, hi, N), ys = new Array(xs.length), vmax = 0, i;
    for (i = 0; i < xs.length; i++) { ys[i] = NMR.yAt(spec, xs[i]); if (ys[i] > vmax) vmax = ys[i]; }
    var hold = o.fixedMax ? spec.ymax : Math.max(vmax, spec.ymax * 0.02);
    var cell = (hi - lo) / pw * 1.1, amp = 0.0022;
    var yscale = ph * 0.9 / (hold * (o.integ ? 1 : 1));
    this._ys = { hold: hold };
    var sweep = this.sweep;
    c.lineJoin = 'round'; c.lineWidth = 1.25; c.strokeStyle = pal.fg; c.beginPath();
    var started = false;
    for (i = 0; i < xs.length; i++) {
      if (sweep !== null && xs[i] > sweep) break;
      var yv = ys[i] + NMR.noiseAt(spec, xs[i], cell, amp), px = this.x2p(xs[i]), py = base - 2 - Math.min(ph, Math.max(-3, yv * yscale));
      if (!started) { c.moveTo(px, py); started = true; } else c.lineTo(px, py);
    }
    c.stroke();

    // integration trace
    this.stepPos = [];
    if (o.integ && spec.nuc === 'H' && spec.intTotal) {
      var I0 = base - ph * 0.05, span = ph * 0.58, tot = spec.intTotal;
      c.strokeStyle = pal.integ; c.lineWidth = 1.4; c.beginPath(); started = false;
      var jit = {}; spec.steps.forEach(function (s) { jit[s.id] = s.mm / (s.n * 6); });
      for (i = 0; i < xs.length; i++) {
        if (sweep !== null && xs[i] > sweep) break;
        var iv = 0; spec.lines.forEach(function (l) { if (l.int) iv += l.w * (jit[l.env] || 1) * (0.5 + Math.atan((xs[i] - l.x) / l.g) / PI); });
        var ipy = I0 - iv / tot * span + (hi - xs[i]) * 0.0006 * ph;
        var ipx = this.x2p(xs[i]);
        if (!started) { c.moveTo(ipx, ipy); started = true; } else c.lineTo(ipx, ipy);
      }
      c.stroke();
      if (o.steps) {
        c.font = '600 ' + fs(11) + 'px "Plus Jakarta Sans",system-ui,sans-serif'; c.fillStyle = pal.integ; c.textBaseline = 'middle'; c.textAlign = 'left';
        spec.steps.forEach(function (s) {
          var e = spec.envs.filter(function (q) { return q.id === s.id; })[0]; if (!e) return;
          var xl = self.x2p(e.hi + 0.18), yy = I0 - (cumBefore(spec, s.id) + s.n / 2) / tot * span;
          var tx = s.mm.toFixed(1) + ' mm', tw = c.measureText(tx).width, lx = Math.max(m.L + 2, Math.min(xl, W - m.R - tw - 4)), ly = yy - 10;
          c.fillStyle = pal.bg; c.globalAlpha = 0.85; c.fillRect(lx - 3, ly - fs(11) * 0.7, tw + 6, fs(11) * 1.4); c.globalAlpha = 1;
          c.fillStyle = pal.integ; NMR.fillText(c, tx, lx, ly);
        });
      }
    }

    // reference peak labels (TMS, solvent)
    c.font = '600 ' + fs(10.5) + 'px "Plus Jakarta Sans",system-ui,sans-serif'; c.fillStyle = pal.ref; c.textAlign = 'center'; c.textBaseline = 'bottom';
    var seen = {};
    spec.lines.forEach(function (l) {
      if (l.kind !== 'ref' || !l.tag || l.x < lo || l.x > hi) return;
      var key = l.tag + Math.round(l.x); if (seen[l.tag]) return; seen[l.tag] = 1;
      var yy = NMR.yAt(spec, l.x), py = base - 2 - Math.min(ph, yy * yscale) - 4;
      NMR.fillText(c, l.tag, self.x2p(l.x), Math.max(m.T + 10, py));
    });

    // multiplet labels
    if (o.labels && spec.nuc === 'H') {
      c.font = '700 ' + fs(12) + 'px "Plus Jakarta Sans",system-ui,sans-serif'; c.textAlign = 'center'; c.textBaseline = 'bottom';
      spec.envs.forEach(function (e) {
        if (e.d < lo || e.d > hi) return;
        if ((self.marks || []).some(function (mk) { return mk.x >= e.lo - 0.01 && mk.x <= e.hi + 0.01; })) return;
        var tall = 0; spec.lines.forEach(function (l) { if (l.env === e.id) tall = Math.max(tall, NMR.yAt(spec, l.x)); });
        var py = base - 2 - Math.min(ph, tall * yscale) - 5;
        c.fillStyle = o.colour ? NMR.envColour(spec.mol, e.id, 'H') : pal.fg;
        NMR.fillText(c, e.ex ? 's (broad)' : NMR.PAT_SHORT[e.nb] || 'm', self.x2p(e.d), Math.max(m.T + 11, py));
      });
    }

    // line labels (relative intensities over the lines of one signal)
    (this.marks || []).forEach(function (mk) {
      var yy = NMR.yAt(spec, mk.x), py = base - 2 - Math.min(ph, yy * yscale) - 4;
      c.font = '700 ' + fs(12) + 'px "Plus Jakarta Sans",system-ui,sans-serif'; c.fillStyle = mk.col || pal.integ; c.textAlign = 'center'; c.textBaseline = 'bottom';
      NMR.fillText(c, mk.t, self.x2p(mk.x), Math.max(m.T + 11, py));
    });

    // baseline axis + ticks + labels
    c.strokeStyle = pal.axis; c.lineWidth = 1.2; c.beginPath(); c.moveTo(m.L, base + .5); c.lineTo(W - m.R, base + .5);
    tk.major.forEach(function (v) { var x = Math.round(self.x2p(v)) + .5; c.moveTo(x, base); c.lineTo(x, base + 7); });
    tk.minor.forEach(function (v) { var x = Math.round(self.x2p(v)) + .5; c.moveTo(x, base); c.lineTo(x, base + 3.5); });
    c.stroke();
    c.fillStyle = pal.axis; c.font = '500 ' + m.f + 'px "Plus Jakarta Sans",system-ui,sans-serif'; c.textAlign = 'center'; c.textBaseline = 'top';
    tk.major.forEach(function (v) { var x = self.x2p(v); if (x > m.L + 6 && x < W - m.R - 6) NMR.fillText(c, v.toFixed(tk.dec), x, base + 9); });
    c.font = '600 ' + m.f + 'px "Plus Jakarta Sans",system-ui,sans-serif';
    NMR.fillText(c, 'δ / ppm' + (spec.nuc === 'C' ? '' : ''), (m.L + W - m.R) / 2, base + 9 + m.f + 5);

    // cursor / selection guide
    if (this.sel) {
      var se = spec.envs.filter(function (e) { return e.id === self.sel; })[0];
      if (se) { var sx = this.x2p(se.d); c.strokeStyle = pal.integ; c.setLineDash([3, 3]); c.lineWidth = 1; c.beginPath(); c.moveTo(sx + .5, m.T); c.lineTo(sx + .5, base); c.stroke(); c.setLineDash([]); }
    }
    if (this.cur !== null && this.cur >= lo && this.cur <= hi) {
      var cx = this.x2p(this.cur); c.strokeStyle = pal.cur; c.setLineDash([2, 3]); c.lineWidth = 1; c.beginPath(); c.moveTo(cx + .5, m.T); c.lineTo(cx + .5, base); c.stroke(); c.setLineDash([]);
    }
    // sweep marker
    if (sweep !== null) { var sx2 = this.x2p(sweep); c.strokeStyle = pal.integ; c.lineWidth = 1.5; c.beginPath(); c.moveTo(sx2 + .5, m.T); c.lineTo(sx2 + .5, base); c.stroke(); }
  };

  function cumBefore(spec, id) {
    var c = 0, ordered = spec.envs.slice().sort(function (a, b) { return a.d - b.d; });
    for (var i = 0; i < ordered.length; i++) { if (ordered[i].id === id) break; c += ordered[i].n; }
    return c;
  }

  P.hit = function (px) {
    var spec = this.spec, x = this.p2x(px), best = null, bd = 1e9, pad = Math.max(spec.nuc === 'H' ? 0.1 : 4, 10 * (this.hi - this.lo) / (this.W - 22));
    spec.envs.forEach(function (e) { if (x >= e.lo - pad && x <= e.hi + pad) { var d = Math.abs(x - e.d); if (d < bd) { bd = d; best = e; } } });
    return best;
  };

  P.bind = function () {
    var self = this, cv = this.cv, down = null;
    cv.style.touchAction = 'pan-y';
    cv.addEventListener('pointerdown', function (e) {
      down = { x: e.clientX, y: e.clientY, lo: self.lo, hi: self.hi, moved: false, id: e.pointerId };
      try { cv.setPointerCapture(e.pointerId); } catch (_) { }
    });
    cv.addEventListener('pointermove', function (e) {
      var r = cv.getBoundingClientRect(), px = e.clientX - r.left;
      if (down && Math.abs(e.clientX - down.x) > 5 && (self.hi - self.lo) < (self.spec.range[1] - self.spec.range[0]) - 1e-6) {
        down.moved = true; self.userMoved = true;
        var dx = (e.clientX - down.x) / (self.W - 22) * (down.hi - down.lo);
        self.lo = down.lo + dx; self.hi = down.hi + dx; self.clamp(); self.draw();
      } else if (!down || !down.moved) {
        if (e.pointerType === 'mouse') { self.cur = self.p2x(px); self.showRead(px); self.draw(); }
      }
    });
    cv.addEventListener('pointerup', function (e) {
      if (down && !down.moved) {
        var r = cv.getBoundingClientRect(), px = e.clientX - r.left, hit = self.hit(px);
        self.cur = self.p2x(px); self.showRead(px);
        self.sel = hit ? hit.id : null; self.draw();
        if (self.o.onSelect) self.o.onSelect(hit ? hit.id : null, self.cur);
      }
      down = null;
    });
    cv.addEventListener('pointerleave', function () { if (!down) { self.cur = null; self.readout.hidden = true; self.draw(); } });
    cv.addEventListener('pointercancel', function () { down = null; });
    cv.addEventListener('wheel', function (e) {
      if (!(e.ctrlKey || e.metaKey)) return;
      e.preventDefault(); var r = cv.getBoundingClientRect();
      self.zoom(e.deltaY < 0 ? 0.8 : 1.25, self.p2x(e.clientX - r.left));
    }, { passive: false });
  };
  P.showRead = function (px) {
    var x = this.p2x(px);
    this.readout.hidden = false; this.readout.textContent = 'δ ' + x.toFixed(this.spec.nuc === 'H' ? 2 : 1);
  };

  NMR.View = View;

  /* ───────── SVG for print and static figures ─────────
     o: w, h, lo, hi, integ (bool), steps (bool), labels. Ink is black on white. */
  NMR.svg = function (spec, o) {
    o = Object.assign({ w: 640, h: 230, integ: false, steps: false }, o || {});
    var lo = o.lo !== undefined ? o.lo : spec.range[0], hi = o.hi !== undefined ? o.hi : spec.range[1];
    var L = 14, R = 14, T = 12, B = 42, W = o.w, H = o.h, pw = W - L - R, ph = H - T - B, base = H - B;
    function X(v) { return L + (hi - v) / (hi - lo) * pw; }
    var xs = NMR.sample(spec, lo, hi, Math.round(pw * 1.3)), vmax = 0, ys = xs.map(function (x) { var y = NMR.yAt(spec, x); if (y > vmax) vmax = y; return y; });
    var hold = Math.max(vmax, spec.ymax * 0.02), sc = ph * 0.9 / hold, cell = (hi - lo) / pw * 1.1;
    var d = '', i;
    for (i = 0; i < xs.length; i++) { var y = ys[i] + NMR.noiseAt(spec, xs[i], cell, 0.0022); d += (i ? 'L' : 'M') + X(xs[i]).toFixed(1) + ' ' + (base - 2 - Math.min(ph, Math.max(-3, y * sc))).toFixed(1); }
    var s = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ' + W + ' ' + H + '" role="img" font-family="Plus Jakarta Sans, Arial, sans-serif">';
    s += '<rect width="' + W + '" height="' + H + '" fill="#fff"/>';
    s += '<path d="' + d + '" fill="none" stroke="#000" stroke-width="1" stroke-linejoin="round"/>';
    if (o.integ && spec.nuc === 'H' && spec.intTotal) {
      var I0 = base - ph * 0.05, span = ph * 0.58, tot = spec.intTotal, jit = {}, di = '';
      spec.steps.forEach(function (st) { jit[st.id] = st.mm / (st.n * 6); });
      for (i = 0; i < xs.length; i++) {
        var iv = 0; spec.lines.forEach(function (l) { if (l.int) iv += l.w * (jit[l.env] || 1) * (0.5 + Math.atan((xs[i] - l.x) / l.g) / PI); });
        di += (i ? 'L' : 'M') + X(xs[i]).toFixed(1) + ' ' + (I0 - iv / tot * span + (hi - xs[i]) * 0.0006 * ph).toFixed(1);
      }
      s += '<path d="' + di + '" fill="none" stroke="#000" stroke-width="1.1" stroke-dasharray="none"/>';
      if (o.steps) spec.steps.forEach(function (st) {
        var e = spec.envs.filter(function (q) { return q.id === st.id; })[0]; if (!e) return;
        var yy = I0 - (cumBefore(spec, st.id) + st.n / 2) / tot * span - 8;
        s += '<text x="' + Math.min(X(e.hi + 0.12) - 2, W - R - 50).toFixed(1) + '" y="' + yy.toFixed(1) + '" font-size="11" font-weight="700" text-anchor="end" fill="#000">' + st.mm.toFixed(1) + ' mm</text>';
      });
    }
    var seenRef = {};
    spec.lines.forEach(function (l) {
      if (l.kind !== 'ref' || !l.tag || seenRef[l.tag] || l.x < lo || l.x > hi) return; seenRef[l.tag] = 1;
      var yy = base - 2 - Math.min(ph, NMR.yAt(spec, l.x) * sc) - 4;
      s += '<text x="' + X(l.x).toFixed(1) + '" y="' + Math.max(T + 10, yy).toFixed(1) + '" font-size="10.5" text-anchor="middle" fill="#000">' + l.tag + '</text>';
    });
    var tk = NMR.ticks(lo, hi, Math.max(4, pw / 70));
    s += '<path d="M' + L + ' ' + (base + .5) + 'H' + (W - R) + tk.major.map(function (v) { return 'M' + X(v).toFixed(1) + ' ' + base + 'v7'; }).join('') + tk.minor.map(function (v) { return 'M' + X(v).toFixed(1) + ' ' + base + 'v3.5'; }).join('') + '" stroke="#000" stroke-width="1" fill="none"/>';
    tk.major.forEach(function (v) { s += '<text x="' + X(v).toFixed(1) + '" y="' + (base + 20) + '" font-size="11" text-anchor="middle" fill="#000">' + v.toFixed(tk.dec) + '</text>'; });
    s += '<text x="' + ((L + W - R) / 2) + '" y="' + (H - 6) + '" font-size="11.5" text-anchor="middle" font-weight="600" fill="#000">δ / ppm</text></svg>';
    return s;
  };
})();
