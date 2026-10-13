/* Titration Laboratory — the bench, drawn in SVG.

   Flat apparatus on the dark bench: hairline glass, flat liquids, no
   gradients or shadows. The scene is built once and then updated by setting
   attributes from the lab's state every frame, so the drawing always shows
   the chemistry and never runs its own animation of it. Colours of the flask
   come from the engine's absorbances over the white tile (or the dark bench).

   Two scenes: the titration (burette, stand, flask, shelf) and the standard
   solution for Required practical 1 (balance, beaker, volumetric flask). Each
   has a magnified lens for reading: the burette scale, or the flask's mark. */
(function (root) {
  'use strict';
  var E = root.TitrationEngine;
  var NS = 'http://www.w3.org/2000/svg';
  var C = {
    glass: '#9fb4cc', glassFill: 'rgba(159,180,204,0.07)', label: '#8693a5', leader: '#4a5a70', text: '#edf2f8',
    bench: '#111d2c', benchTop: '#26364a', steel: '#56657a', steelDark: '#3a4759', tile: '#e9eef5', tileEdge: '#b8c3d1',
    clear: 'rgba(159,180,204,0.16)', clearTop: '#cfe0f2', purple: '#5d1d8f', purpleTop: '#b07ad8', paleGreen: 'rgba(190,226,160,0.30)',
    rubber: '#5b4b45', blue: '#47b5fa', amber: '#f2c94c', bg: [40, 52, 68], bgLight: [226, 232, 238], white: [233, 238, 245]
  };
  // The bench SVG's own colours swap for light mode in titration.css; only the
  // background a liquid is seen against has to follow the theme here.
  function lightTheme() { return document.documentElement.classList.contains('theme-light'); }

  function el(tag, attrs, parent) {
    var n = document.createElementNS(NS, tag);
    for (var k in attrs) n.setAttribute(k, attrs[k]);
    if (parent) parent.appendChild(n);
    return n;
  }
  function set(n, attrs) { for (var k in attrs) { var v = String(attrs[k]); if (n.getAttribute(k) !== v) n.setAttribute(k, v); } }
  function text(parent, x, y, str, attrs) {
    var t = el('text', Object.assign({ x: x, y: y, fill: C.label, 'font-size': 13, 'text-anchor': 'middle' }, attrs || {}), parent);
    t.textContent = str; return t;
  }
  function setText(t, str) { if (t.textContent !== str) t.textContent = str; }
  function rgb(a) { return 'rgb(' + a.map(function (v) { return Math.max(0, Math.min(255, Math.round(v))); }).join(',') + ')'; }

  // Colour of a liquid seen against a background, from absorbance per channel.
  function liquidColour(abs, bg) {
    var T = E.transmittance(abs);
    return [bg[0] * T[0], bg[1] * T[1], bg[2] * T[2]];
  }

  /* ---------- Conical flask geometry ----------
     A frustum from the base (radius 75 px) to the shoulder (radius 17 px) over
     95 px, holding 100 cm³ to the shoulder, so a 25 cm³ portion stands deep
     enough to see its colour. Volume to liquid height by bisection. */
  var FL = { base: 75, neck: 17, body: 95, neckH: 46, cap: 100 };
  function frustumVol(h) {
    var r = FL.base - (FL.base - FL.neck) * h / FL.body;
    return Math.PI / 3 * h * (FL.base * FL.base + FL.base * r + r * r);
  }
  var FL_SCALE = FL.cap / frustumVol(FL.body);
  function flaskHeight(v) {
    if (v <= 0) return 0;
    if (v >= FL.cap) return FL.body;
    var lo = 0, hi = FL.body;
    for (var i = 0; i < 30; i++) { var m = (lo + hi) / 2; if (frustumVol(m) * FL_SCALE < v) lo = m; else hi = m; }
    return (lo + hi) / 2;
  }
  // Points along the sloping side, from the shoulder (0) to the base corner (1).
  function flaskSide(cx, base, sign, t) {
    var top = base - FL.body;
    return [cx + sign * (FL.neck + (FL.base - FL.neck) * t), top + FL.body * t];
  }
  function f1(v) { return Math.round(v * 10) / 10; }
  function pt(p) { return f1(p[0]) + ',' + f1(p[1]); }
  function flaskPath(cx, base, closed) {
    var top = base - FL.body, nt = top - FL.neckH, n = FL.neck, out = '';
    var sL = flaskSide(cx, base, -1, 0.12), cL = flaskSide(cx, base, -1, 0.9), sR = flaskSide(cx, base, 1, 0.12), cR = flaskSide(cx, base, 1, 0.9);
    out += 'M' + (cx - n - 3) + ',' + (nt - 2) + ' Q' + (cx - n) + ',' + (nt - 1) + ' ' + (cx - n) + ',' + (nt + 4);
    out += ' L' + (cx - n) + ',' + (top - 9) + ' Q' + (cx - n) + ',' + top + ' ' + pt(sL);
    out += ' L' + pt(cL) + ' Q' + (cx - FL.base) + ',' + base + ' ' + (cx - FL.base + 16) + ',' + base;
    out += ' L' + (cx + FL.base - 16) + ',' + base + ' Q' + (cx + FL.base) + ',' + base + ' ' + pt(cR);
    out += ' L' + pt(sR) + ' Q' + (cx + n) + ',' + top + ' ' + (cx + n) + ',' + (top - 9);
    out += ' L' + (cx + n) + ',' + (nt + 4) + ' Q' + (cx + n) + ',' + (nt - 1) + ' ' + (cx + n + 3) + ',' + (nt - 2);
    return closed ? out + ' Z' : out;
  }
  // The liquid is a band from the base to its level, clipped to the glass.
  function flaskBand(h) { return 'M' + (-FL.base - 24) + ',' + f1(-h) + ' H' + (FL.base + 24) + ' V40 H' + (-FL.base - 24) + ' Z'; }
  var clipN = 0;
  function flaskLiquid(cx, base, h) {
    var r = FL.base - (FL.base - FL.neck) * h / FL.body, y = base - h;
    return 'M' + (cx - r + 1.5) + ',' + y + ' L' + (cx - FL.base + 5) + ',' + (base - 5) + ' Q' + (cx - FL.base + 1.5) + ',' + (base - 1.5) + ' ' + (cx - FL.base + 9) + ',' + (base - 1.5) +
      ' L' + (cx + FL.base - 9) + ',' + (base - 1.5) + ' Q' + (cx + FL.base - 1.5) + ',' + (base - 1.5) + ' ' + (cx + FL.base - 5) + ',' + (base - 5) + ' L' + (cx + r - 1.5) + ',' + y + ' Z';
  }

  // A filter funnel: rim at y, a curved cone and the stem.
  function funnelPath(cx, y) {
    return 'M' + (cx - 26) + ',' + y + ' Q' + cx + ',' + (y - 3) + ' ' + (cx + 26) + ',' + y + ' C' + (cx + 20) + ',' + (y + 10) + ' ' + (cx + 5) + ',' + (y + 14) + ' ' + (cx + 4) + ',' + (y + 22) +
      ' L' + (cx + 4) + ',' + (y + 34) + ' Q' + cx + ',' + (y + 37) + ' ' + (cx - 4) + ',' + (y + 34) + ' L' + (cx - 4) + ',' + (y + 22) + ' C' + (cx - 5) + ',' + (y + 14) + ' ' + (cx - 20) + ',' + (y + 10) + ' ' + (cx - 26) + ',' + y + ' Z';
  }

  // A ground-glass stopper with its top at y.
  function stopperPath(cx, y) {
    return 'M' + (cx - 13) + ',' + (y + 4) + ' Q' + (cx - 13) + ',' + y + ' ' + (cx - 9) + ',' + y + ' L' + (cx + 9) + ',' + y + ' Q' + (cx + 13) + ',' + y + ' ' + (cx + 13) + ',' + (y + 4) +
      ' L' + (cx + 13) + ',' + (y + 7) + ' L' + (cx + 8) + ',' + (y + 9) + ' L' + (cx + 7) + ',' + (y + 20) + ' Q' + cx + ',' + (y + 22) + ' ' + (cx - 7) + ',' + (y + 20) + ' L' + (cx - 8) + ',' + (y + 9) + ' L' + (cx - 13) + ',' + (y + 7) + ' Z';
  }
  // Every clickable part is a button for the keyboard too.
  function partsAsButtons(svg, names) {
    svg.querySelectorAll('.part').forEach(function (p) {
      p.style.cursor = 'pointer';
      p.setAttribute('tabindex', '0'); p.setAttribute('role', 'button');
      if (!p.getAttribute('aria-label')) p.setAttribute('aria-label', names[p.getAttribute('data-part')] || p.getAttribute('data-part'));
    });
  }

  /* ---------- Burette geometry ---------- */
  var BU = { x: 380, w: 16, top: 18, y0: 44, k: 5.2, tap: 326, jetEnd: 374 };
  // The magnifier in the titration view: centre, radius, drawing units per cm³.
  var MAG = { x: 556, y: 160, r: 86, k: 70 };
  // The titration view: the stand, burette, flask and magnifier, and nothing else.
  var TITRATE_VB = '226 0 440 556';
  function buretteY(r) { return BU.y0 + r * BU.k; }

  /* ===================== Titration scene ===================== */
  function TitrationScene(svg, run) {
    this.svg = svg; this.run = run;
    var redox = run.type === 'redox', self = this;
    svg.setAttribute('viewBox', '0 0 960 600');
    svg.innerHTML = '';
    var g = el('g', { 'stroke-linejoin': 'round', 'stroke-linecap': 'round' }, svg);
    this.g = g;
    // Bench.
    el('rect', { x: 0, y: 510, width: 960, height: 90, fill: C.bench }, g);
    el('line', { x1: 0, y1: 510.5, x2: 960, y2: 510.5, stroke: C.benchTop, 'stroke-width': 1.5 }, g);
    // Stand.
    el('rect', { x: 236, y: 497, width: 230, height: 13, rx: 5, fill: C.steelDark }, g);
    el('rect', { x: 258, y: 24, width: 8, height: 476, rx: 4, fill: C.steel }, g);
    [104, 236].forEach(function (y) {
      el('rect', { x: 266, y: y - 3, width: 100, height: 6, rx: 3, fill: C.steel }, g);
      el('rect', { x: 253, y: y - 8, width: 18, height: 16, rx: 5, fill: C.steelDark }, g);
      el('rect', { x: 363, y: y - 10, width: 7, height: 20, rx: 3, fill: C.steel }, g);
      el('rect', { x: 390, y: y - 10, width: 7, height: 20, rx: 3, fill: C.steel }, g);
    });

    // Tile (under the burette).
    this.tile = el('rect', { x: 286, y: 504, width: 188, height: 7, rx: 3, fill: C.tile, stroke: C.tileEdge, 'stroke-width': 1, 'data-part': 'tile', class: 'part' }, g);
    this.tileParked = el('g', { 'data-part': 'tile', class: 'part shelf-only' }, g);
    el('rect', { x: 30, y: 560, width: 150, height: 9, rx: 3, fill: C.tile, stroke: C.tileEdge, 'stroke-width': 1 }, this.tileParked);
    el('rect', { x: 26, y: 548, width: 158, height: 26, fill: 'transparent', class: 'hit' }, this.tileParked);
    text(this.tileParked, 105, 590, 'white tile', { 'font-size': 12, class: 'cap' });

    // Burette.
    var bu = el('g', { 'data-part': 'burette', class: 'part' }, g);
    this.buLiquid = el('rect', { x: BU.x - BU.w / 2 + 1.5, width: BU.w - 3, fill: C.clear }, bu);
    this.buBelow = el('path', { d: 'M' + (BU.x - 6.5) + ',310 Q' + (BU.x - 6.5) + ',318 ' + (BU.x - 3) + ',' + BU.tap + ' L' + (BU.x + 3) + ',' + BU.tap + ' Q' + (BU.x + 6.5) + ',318 ' + (BU.x + 6.5) + ',310 Z', fill: C.clear }, bu);
    this.buTop = el('line', { x1: BU.x - BU.w / 2 + 1.5, x2: BU.x + BU.w / 2 - 1.5, stroke: C.clearTop, 'stroke-width': 1.5 }, bu);
    el('path', { d: 'M' + (BU.x - BU.w / 2 - 2) + ',' + (BU.top - 2) + ' Q' + (BU.x - BU.w / 2) + ',' + (BU.top - 1) + ' ' + (BU.x - BU.w / 2) + ',' + (BU.top + 3) +
      ' L' + (BU.x - BU.w / 2) + ',308 Q' + (BU.x - BU.w / 2) + ',318 ' + (BU.x - 4) + ',' + BU.tap +
      ' M' + (BU.x + BU.w / 2 + 2) + ',' + (BU.top - 2) + ' Q' + (BU.x + BU.w / 2) + ',' + (BU.top - 1) + ' ' + (BU.x + BU.w / 2) + ',' + (BU.top + 3) +
      ' L' + (BU.x + BU.w / 2) + ',308 Q' + (BU.x + BU.w / 2) + ',318 ' + (BU.x + 4) + ',' + BU.tap,
      fill: 'none', stroke: C.glass, 'stroke-width': 1.5 }, bu);
    // Scale: every 1 cm³, labelled every 5.
    for (var r = 0; r <= 50; r++) {
      var y = buretteY(r), major = r % 5 === 0;
      el('line', { x1: BU.x - BU.w / 2, x2: BU.x - BU.w / 2 + (major ? 7 : 4), y1: y, y2: y, stroke: C.glass, 'stroke-width': major ? 1.2 : 0.8 }, bu);
      if (major) text(bu, BU.x - BU.w / 2 - 6, y + 4, String(r), { 'text-anchor': 'end', 'font-size': 11, class: 'scale' });
    }
    // Tap and jet.
    this.jetLiquid = el('rect', { x: BU.x - 1.5, y: BU.tap + 10, width: 3, height: BU.jetEnd - BU.tap - 12, fill: 'none' }, bu);
    el('path', { d: 'M' + (BU.x - 2.5) + ',' + (BU.tap + 8) + ' L' + (BU.x - 2.5) + ',' + (BU.jetEnd - 6) + ' Q' + (BU.x - 2.5) + ',' + (BU.jetEnd - 1) + ' ' + (BU.x - 1) + ',' + BU.jetEnd +
      ' M' + (BU.x + 2.5) + ',' + (BU.tap + 8) + ' L' + (BU.x + 2.5) + ',' + (BU.jetEnd - 6) + ' Q' + (BU.x + 2.5) + ',' + (BU.jetEnd - 1) + ' ' + (BU.x + 1) + ',' + BU.jetEnd,
      fill: 'none', stroke: C.glass, 'stroke-width': 1.3 }, bu);
    el('circle', { cx: BU.x, cy: BU.tap + 4, r: 6.5, fill: C.steelDark, stroke: C.glass, 'stroke-width': 1 }, bu);
    var tapG = el('g', { 'data-part': 'tap', class: 'part' }, g);
    this.tapG = tapG;
    this.tapHandle = el('rect', { x: BU.x - 17, y: BU.tap + 1.5, width: 34, height: 5, rx: 2.5, fill: C.blue }, tapG);
    el('rect', { x: BU.x - 30, y: BU.tap - 12, width: 60, height: 32, fill: 'transparent', class: 'hit' }, tapG);
    this.tapLabel = text(g, BU.x + 46, BU.tap + 8, 'tap', { 'font-size': 12, 'text-anchor': 'start' });
    // Funnel in the top.
    this.funnelIn = el('path', { d: funnelPath(380, 4), fill: C.glassFill, stroke: C.glass, 'stroke-width': 1.5, 'data-part': 'funnel', class: 'part' }, g);
    text(g, BU.x + 46, 70, 'burette', { 'font-size': 12, 'text-anchor': 'start' });

    // Stream and drop from the jet.
    this.stream = el('line', { x1: BU.x, x2: BU.x, y1: BU.jetEnd, y2: BU.jetEnd + 60, 'stroke-width': 2.5, stroke: 'none' }, g);
    this.drop = el('circle', { cx: BU.x, cy: BU.jetEnd + 4, r: 2.6, fill: 'none' }, g);

    // Flask (under the burette or parked to the left).
    this.flaskG = el('g', { 'data-part': 'flask', class: 'part' }, g);
    this.flaskBody = el('g', {}, this.flaskG);
    var clipId = 'flaskClip' + (++clipN);
    el('path', { d: flaskPath(0, 0, true) }, el('clipPath', { id: clipId }, el('defs', {}, this.flaskBody)));
    var inside = el('g', { 'clip-path': 'url(#' + clipId + ')' }, this.flaskBody);
    this.flLiquid = el('path', { d: '', fill: 'none' }, inside);
    this.flHaze = el('path', { d: '', fill: 'rgb(122,74,34)', 'fill-opacity': 0 }, inside);
    this.flPlume = el('ellipse', { cx: 0, cy: 0, rx: 12, ry: 6, fill: 'none', opacity: 0 }, inside);
    this.flSurface = el('line', { stroke: C.clearTop, 'stroke-width': 1.2 }, this.flaskBody);
    this.flGlass = el('path', { d: flaskPath(0, 0), fill: C.glassFill, stroke: C.glass, 'stroke-width': 1.6 }, this.flaskBody);
    this.thermo = el('g', { opacity: 0 }, this.flaskG);
    el('line', { x1: 22, y1: -200, x2: 10, y2: -28, stroke: C.glass, 'stroke-width': 3, 'stroke-linecap': 'round' }, this.thermo);
    el('circle', { cx: 10, cy: -26, r: 4, fill: '#d9574a' }, this.thermo);
    this.thermoText = text(this.thermo, 30, -112, '', { 'text-anchor': 'start', fill: C.text, 'font-size': 14, 'font-weight': 600 });
    this.flaskLabel = text(this.flaskG, 0, 30, 'conical flask', { 'font-size': 12, class: 'cap' });
    this.swirlMark = el('g', { opacity: 0, fill: 'none', stroke: C.blue, 'stroke-width': 2.5, 'stroke-linecap': 'round', 'stroke-linejoin': 'round' }, this.flaskG);
    el('path', { d: 'M-92,-38 A92,22 0 0 0 40,-18 M40,-18 l-12,-8 M40,-18 l-13,6' }, this.swirlMark);
    el('path', { d: 'M92,-62 A92,22 0 0 0 -40,-82 M-40,-82 l12,8 M-40,-82 l13,-6' }, this.swirlMark);

    // Waste beaker.
    this.waste = el('g', { 'data-part': 'waste', class: 'part shelf-only' }, g);
    el('path', { d: 'M-39,-87 Q-34,-86 -34,-80 L-34,-7 Q-34,0 -27,0 L27,0 Q34,0 34,-7 L34,-81 Q34,-85 37,-86', fill: C.glassFill, stroke: C.glass, 'stroke-width': 1.5 }, this.waste);
    this.wasteLiquid = el('rect', { x: -32.5, width: 65, y: -6, height: 4.5, fill: C.clear }, this.waste);
    text(this.waste, 0, 30, 'waste beaker', { 'font-size': 12, class: 'cap' });

    // Shelf: bottles, indicator or acid, wash bottle, pipette, spare funnel.
    var shelf = el('g', { class: 'shelf-only' }, g);
    function bottle(x, w, h, fill, labelTop, labelBottom, part, labelUnit, id) {
      var b = el('g', { 'data-part': part, class: 'part' }, shelf);
      if (id) b.setAttribute('data-id', id);
      var L0 = x - w / 2, R0 = x + w / 2, T0 = 505 - h, nk = w * 0.2, sh = Math.min(16, h * 0.18);
      el('path', { d: 'M' + (x - nk) + ',' + T0 + ' Q' + L0 + ',' + T0 + ' ' + L0 + ',' + (T0 + sh) + ' L' + L0 + ',497 Q' + L0 + ',505 ' + (L0 + 8) + ',505 L' + (R0 - 8) + ',505 Q' + R0 + ',505 ' + R0 + ',497 L' + R0 + ',' + (T0 + sh) + ' Q' + R0 + ',' + T0 + ' ' + (x + nk) + ',' + T0 + ' Z',
        fill: C.glassFill, stroke: C.glass, 'stroke-width': 1.4 }, b);
      el('rect', { x: x - w / 2 + 2, y: 505 - h * 0.62, width: w - 4, height: h * 0.62 - 2, rx: 6, fill: fill }, b);
      el('rect', { x: x - w * 0.18, y: 505 - h - 13, width: w * 0.36, height: 14, rx: 4, fill: C.steelDark, stroke: C.glass, 'stroke-width': 1 }, b);
      var lh = labelUnit ? 34 : 24;
      el('rect', { x: x - w / 2 + 4, y: 505 - h * 0.55, width: w - 8, height: lh, rx: 4, fill: '#0d1928', stroke: C.leader, 'stroke-width': 1 }, b);
      var y0 = 505 - h * 0.55;
      var t1 = text(b, x, y0 + 11, labelTop, { fill: C.text, 'font-size': 10.5, 'font-weight': 600 });
      var t2 = text(b, x, y0 + 21, labelBottom, { fill: C.text, 'font-size': 9.5 });
      if (labelUnit) text(b, x, y0 + 30.5, labelUnit, { fill: C.label, 'font-size': 8.5 });
      return { g: b, t1: t1, t2: t2 };
    }
    var lab = function (id) { return (root.TitrationExperiments.LABELS[id] || {}).formula || id; };
    function plain(html) { return html.replace(/<sub>(.*?)<\/sub>/g, function (m, d) { return d.split('').map(function (c) { return '₀₁₂₃₄₅₆₇₈₉'[+c] || c; }).join(''); }).replace(/<sup>(.*?)<\/sup>/g, function (m, d) { return d.replace(/2/g, '²').replace(/\+/g, '⁺').replace(/−/g, '⁻').replace(/-/g, '⁻'); }).replace(/<[^>]+>/g, ''); }
    var units = run.gcse ? 'mol/dm³' : 'mol dm⁻³';
    function conc(sol) { return sol.known ? E.fmtSig(sol.conc_M, 3) : (sol.fromPrep ? 'standard' : '?'); }
    function unit(sol) { return sol.fromPrep ? '' : units; }
    this.titrantBottle = bottle(640, 58, 104, run.titrant.id === 'KMnO4' ? C.purple : C.clear, plain(lab(run.titrant.id)), conc(run.titrant), 'titrant', unit(run.titrant));
    this.analyteBottle = bottle(712, 58, 104, run.analyte.id === 'Fe2' ? C.paleGreen : C.clear, plain(lab(run.analyte.id)), conc(run.analyte), 'analyte', unit(run.analyte));
    text(shelf, 640, 532, 'titrant', { 'font-size': 12, class: 'cap' });
    text(shelf, 712, 532, run.prep ? 'standard' : 'to pipette', { 'font-size': 12, class: 'cap' });
    if (redox) {
      var acids = [['H2SO4', 'H₂SO₄'], ['HCl', 'HCl'], ['HNO3', 'HNO₃']];
      acids.forEach(function (a, i) { bottle(782 + i * 46, 38, 74, C.clear, a[1], 'dilute', 'acid', null, a[0]); });
      text(shelf, 828, 532, 'acids', { 'font-size': 12, class: 'cap' });
    } else {
      var inds = (run.indicatorOptions && run.indicatorOptions.length ? run.indicatorOptions : [run.indicator]).filter(Boolean);
      var short = { phenolphthalein: 'phenol-', methylOrange: 'methyl', bromothymolBlue: 'bromo-', universal: 'universal' };
      var short2 = { phenolphthalein: 'phthalein', methylOrange: 'orange', bromothymolBlue: 'thymol bl.', universal: 'indicator' };
      inds.forEach(function (id, i) {
        var b = el('g', { 'data-part': 'indicator', 'data-id': id, class: 'part' }, shelf), x = 782 + i * 42;
        el('path', { d: 'M' + (x - 6) + ',455 Q' + (x - 16) + ',455 ' + (x - 16) + ',463 L' + (x - 16) + ',498 Q' + (x - 16) + ',505 ' + (x - 9) + ',505 L' + (x + 9) + ',505 Q' + (x + 16) + ',505 ' + (x + 16) + ',498 L' + (x + 16) + ',463 Q' + (x + 16) + ',455 ' + (x + 6) + ',455 Z',
          fill: C.glassFill, stroke: C.glass, 'stroke-width': 1.3 }, b);
        el('path', { d: 'M' + (x - 5) + ',456 L' + (x - 5) + ',441 Q' + x + ',426 ' + (x + 5) + ',441 L' + (x + 5) + ',456 Z', fill: C.rubber }, b);
        text(b, x, 475, short[id] || id, { fill: C.text, 'font-size': 8.5 });
        text(b, x, 485, short2[id] || '', { fill: C.text, 'font-size': 8.5 });
      });
      text(shelf, 782 + (inds.length - 1) * 21, 532, 'indicators', { 'font-size': 12, class: 'cap' });
    }
    // Wash bottle.
    var wb = el('g', { 'data-part': 'wash', class: 'part' }, shelf);
    el('path', { d: 'M912,505 Q904,505 904,497 L904,450 Q904,438 916,438 L928,438 Q940,438 940,450 L940,497 Q940,505 932,505 Z', fill: C.glassFill, stroke: C.glass, 'stroke-width': 1.4 }, wb);
    el('path', { d: 'M922,438 L922,424 L946,410', fill: 'none', stroke: C.glass, 'stroke-width': 2 }, wb);
    text(shelf, 922, 532, 'distilled', { 'font-size': 12, class: 'cap' });
    text(shelf, 922, 546, 'water', { 'font-size': 12, class: 'cap' });
    // Pipette with filler, lying on the bench front.
    var pip = el('g', { 'data-part': 'pipette', class: 'part shelf-only' }, g);
    this.pipG = pip;
    if (run.aliquotDeviceKind !== 'cylinder') {
      el('path', { d: 'M562,566 L632,566 C646,566 646,556 664,556 L706,556 C724,556 724,566 738,566 L830,566 M562,572 L632,572 C646,572 646,582 664,582 L706,582 C724,582 724,572 738,572 L830,572 M562,566 Q557,569 562,572',
        fill: 'none', stroke: C.glass, 'stroke-width': 1.6 }, pip);
      el('rect', { x: 554, y: 552, width: 326, height: 34, fill: 'transparent', class: 'hit' }, pip);
      el('line', { x1: 800, x2: 800, y1: 564, y2: 574, stroke: C.text, 'stroke-width': 1 }, pip);
      el('rect', { x: 830, y: 560, width: 44, height: 18, rx: 9, fill: C.rubber }, pip);
      text(pip, 700, 594, 'pipette and filler', { 'font-size': 12, class: 'cap' });
    } else {
      el('path', { d: 'M620,505 L620,430 L660,430 L660,505 M610,505 L670,505', fill: C.glassFill, stroke: C.glass, 'stroke-width': 1.4 }, pip);
      text(pip, 640, 594, 'measuring cylinder', { 'font-size': 12, class: 'cap' });
    }
    // Spare funnel on the bench.
    this.funnelOut = el('g', { 'data-part': 'funnel', class: 'part shelf-only' }, g);
    el('path', { d: funnelPath(576, 469), fill: C.glassFill, stroke: C.glass, 'stroke-width': 1.4 }, this.funnelOut);
    text(this.funnelOut, 576, 532, 'funnel', { 'font-size': 12, class: 'cap' });

    // Clickable parts carry a part name; the UI listens on the svg. Each is a
    // button for the keyboard too (Tab to it, Enter or Space to use it).
    var NAMES = { burette: 'burette', tap: 'burette tap', funnel: 'funnel', flask: 'conical flask', waste: 'waste beaker', tile: 'white tile',
      titrant: 'bottle of ' + plain(lab(run.titrant.id)), analyte: 'bottle of ' + plain(lab(run.analyte.id)), wash: 'wash bottle of distilled water',
      pipette: run.aliquotDeviceKind === 'cylinder' ? 'measuring cylinder' : 'pipette and filler' };
    svg.querySelectorAll('.part').forEach(function (p) {
      var part = p.getAttribute('data-part'), id = p.getAttribute('data-id');
      var name = part === 'indicator' ? (E.INDICATORS[id] ? E.INDICATORS[id].name : 'indicator') : part === 'acid' ? 'dilute ' + { H2SO4: 'sulfuric', HCl: 'hydrochloric', HNO3: 'nitric' }[id] + ' acid' : NAMES[part] || part;
      p.style.cursor = 'pointer';
      p.setAttribute('tabindex', '0'); p.setAttribute('role', 'button'); p.setAttribute('aria-label', name);
    });
    // The magnifier for the titration view.
    var lg = el('g', { class: 'mag-only', 'pointer-events': 'none' }, svg);
    this.magG = lg;
    this.magLink = el('line', { x1: BU.x + 11, x2: MAG.x - MAG.r, stroke: C.blue, 'stroke-width': 1.4, opacity: 0.8 }, lg);
    this.magRing = el('circle', { cx: BU.x, r: 11, fill: 'none', stroke: C.blue, 'stroke-width': 1.6 }, lg);
    var lensClip = 'magClip' + (++clipN);
    el('circle', { cx: MAG.x, cy: MAG.y, r: MAG.r }, el('clipPath', { id: lensClip }, el('defs', {}, lg)));
    el('circle', { cx: MAG.x, cy: MAG.y, r: MAG.r, fill: '#091321' }, lg);
    var inner = el('g', { 'clip-path': 'url(#' + lensClip + ')' }, lg);
    this.magLiquid = el('path', { d: '', fill: 'none' }, inner);
    this.magScale = el('g', {}, inner);
    el('line', { x1: MAG.x - 34, x2: MAG.x - 34, y1: MAG.y - MAG.r, y2: MAG.y + MAG.r, stroke: C.glass, 'stroke-width': 1.5 }, inner);
    el('line', { x1: MAG.x + 46, x2: MAG.x + 46, y1: MAG.y - MAG.r, y2: MAG.y + MAG.r, stroke: C.glass, 'stroke-width': 1.5 }, inner);
    el('circle', { cx: MAG.x, cy: MAG.y, r: MAG.r, fill: 'none', stroke: C.glass, 'stroke-width': 3 }, lg);
    this.magCap = text(lg, MAG.x, MAG.y + MAG.r + 20, run.titrant.id === 'KMnO4' ? 'Read the top of the meniscus' : 'Read the bottom of the meniscus', { 'font-size': 12, class: 'cap' });

    // The cue: a ring round the apparatus to click next.
    this.cueG = el('g', { class: 'cue', 'pointer-events': 'none' }, svg);
    this.cues = [];
    this.lastFill = null; this.fromFill = null;
    this.reduced = root.matchMedia && root.matchMedia('(prefers-reduced-motion: reduce)').matches;
    this.t = 0;
  }

  TitrationScene.prototype.update = function (lab, dt) {
    var s = lab.state, run = this.run, b = s.burette;
    this.t += dt || 0;
    var purple = run.titrant.id === 'KMnO4';
    var liq = purple ? C.purple : C.clear, liqTop = purple ? C.purpleTop : C.clearTop;
    // Burette level.
    if (b.reading === null) {
      set(this.buLiquid, { y: 312, height: 0 }); set(this.buBelow, { fill: 'none' }); set(this.buTop, { stroke: 'none' });
    } else {
      var y = Math.max(BU.top + 4, buretteY(b.reading));
      set(this.buLiquid, { y: y, height: Math.max(0, 312 - y), fill: liq }); set(this.buBelow, { fill: liq });
      set(this.buTop, { y1: y, y2: y, stroke: liqTop });
    }
    set(this.jetLiquid, { fill: b.reading !== null && b.jetAir <= 0 ? liq : 'none' });
    var open = b.tap || b.pending > 0;
    set(this.tapHandle, { transform: open ? 'rotate(90 ' + BU.x + ' ' + (BU.tap + 4) + ')' : '', fill: open ? C.amber : C.blue });
    set(this.funnelIn, { display: b.funnel ? 'inline' : 'none' });
    set(this.tileParked, { display: s.tile ? 'none' : 'inline' });
    set(this.funnelOut, { display: b.funnel ? 'none' : 'inline' });

    // Where things stand.
    var under = s.under, fx = under === 'flask' ? 380 : 130, wx = under === 'waste' ? 380 : 510;
    var hasFlaskLiquid = !!s.flask && s.flask.totalVol() > 0;
    set(this.flaskG, { transform: 'translate(' + fx + ',505)' });
    setText(this.flaskLabel, s.tile && under === 'flask' ? 'flask on white tile' : 'conical flask');
    set(this.waste, { transform: 'translate(' + wx + ',505)' });
    set(this.tile, { display: s.tile ? 'inline' : 'none', x: fx - 94 });
    var wasteH = Math.min(70, 4 + s.waste_cm3 * 0.6);
    set(this.wasteLiquid, { y: -wasteH - 1.5, height: wasteH, fill: s.waste_cm3 > 0 ? liq : 'none' });

    // Flow from the jet: a thin stream when running fast, falling drops otherwise.
    var dropY = BU.jetEnd + 4 + ((this.t * 220) % 60);
    var target = under === 'flask' ? 505 - flaskHeight(hasFlaskLiquid ? s.flask.totalVol() : 0) : 505 - wasteH;
    if (open && b.flow === 'fast' && b.tap || (b.pending > 0 && !this.reduced)) {
      set(this.stream, { stroke: liq === C.clear ? 'rgba(159,180,204,0.55)' : liq, y2: target });
      set(this.drop, { fill: 'none' });
    } else if (open || s.dropAnim > 0) {
      set(this.stream, { stroke: 'none' });
      set(this.drop, { fill: liq === C.clear ? 'rgba(207,224,242,0.85)' : liq, cy: Math.min(dropY, target - 2) });
    } else { set(this.stream, { stroke: 'none' }); set(this.drop, { fill: 'none' }); }

    // Flask contents.
    if (hasFlaskLiquid) {
      var f = s.flask, h = flaskHeight(f.totalVol()), ap = f.appearance();
      var bg = (s.tile && under === 'flask') ? C.white : lightTheme() ? C.bgLight : C.bg;
      var col = liquidColour(ap.abs, bg), base = 0;
      // Colourless liquid on the tile would vanish: give it the glass tint.
      var clear = ap.abs[0] + ap.abs[1] + ap.abs[2] < 0.03;
      var fill = clear ? (bg === C.white ? 'rgba(200,214,230,0.55)' : C.clear) : rgb(col);
      var dur = (root.TitrationLab && root.TitrationLab.SWIRL_s) || 1.2;
      var swirling = s.swirlAnim > 0 || (s.keepSwirling && under === 'flask');
      var ph = s.swirlAnim > 0 ? (dur - s.swirlAnim) / dur : (this.t % 1.2) / 1.2;
      var amp = s.swirlAnim > 0 ? Math.sin(Math.PI * Math.min(1, ph * 1.15)) : 0.45;
      if (swirling && !this.reduced) {
        var a = ph * Math.PI * 4;
        set(this.flaskBody, { transform: 'translate(' + (Math.cos(a) * 9 * amp).toFixed(1) + ',' + (Math.sin(a) * 2 * amp).toFixed(1) + ') rotate(' + (Math.sin(a) * 5 * amp).toFixed(1) + ' 0 -40)' });
      } else set(this.flaskBody, { transform: '' });
      set(this.swirlMark, { opacity: swirling ? (0.25 + 0.65 * (s.swirlAnim > 0 ? amp : 0.5)).toFixed(2) : 0 });
      // The colour spreads through the flask over the swirl, not in one frame.
      if (s.swirlAnim > 0 && this.fromFill && !clear) {
        var k = Math.min(1, ph * 1.4);
        fill = rgb(this.fromFill.map(function (c0, i) { return c0 + (col[i] - c0) * k; }));
      } else if (s.swirlAnim <= 0) this.fromFill = null;
      if (s.swirlAnim > 0 && !this.fromFill && this.lastFill) this.fromFill = this.lastFill;
      if (s.swirlAnim <= 0) this.lastFill = clear ? null : col.slice();
      // The surface sloshes as the flask circles.
      var slosh = swirling && !this.reduced ? Math.sin(ph * Math.PI * 4 + Math.PI / 2) * 7 * amp : 0;
      var st = slosh ? 'rotate(' + slosh.toFixed(1) + ' 0 ' + f1(-h) + ')' : '';
      set(this.flLiquid, { d: flaskBand(h), fill: fill, transform: st });
      set(this.flHaze, { transform: st });
      set(this.flHaze, { d: flaskBand(h), 'fill-opacity': Math.min(0.85, ap.haze * 2500).toFixed(3) });
      var r = FL.base - (FL.base - FL.neck) * h / FL.body;
      set(this.flSurface, { x1: -r + 2, x2: r - 2, y1: -h, y2: -h, stroke: clear ? C.clearTop : rgb(col.map(function (c) { return c * 0.8; })) });
      if (ap.plume && under === 'flask') {
        // Capped, so a strong local flash reads as deep colour, not black.
        var pc = liquidColour(ap.plume.abs.map(function (a) { return Math.min(a, 0.9); }), bg);
        this.lastPlume = { fill: rgb(pc), strength: ap.plume.strength };
        set(this.flPlume, { cx: 0, cy: -h + 8, rx: 10 + 16 * ap.plume.strength, ry: 4 + 5 * ap.plume.strength, fill: rgb(pc), opacity: (0.35 + 0.6 * ap.plume.strength).toFixed(2) });
      } else if (s.swirlAnim > 0 && this.lastPlume && !this.reduced) {
        var fade = 1 - ph, lp = this.lastPlume;
        set(this.flPlume, { cx: 0, cy: -h * 0.55, rx: (10 + 16 * lp.strength) + ph * 55, ry: (4 + 5 * lp.strength) + ph * h * 0.35, fill: lp.fill, opacity: (fade * 0.5 * (0.35 + 0.6 * lp.strength)).toFixed(2) });
      } else { this.lastPlume = null; set(this.flPlume, { opacity: 0 }); }
      var warm = f.T > 26;
      set(this.thermo, { opacity: warm || run.warm ? 1 : 0 });
      setText(this.thermoText, Math.round(f.T) + ' °C');
    } else {
      set(this.flLiquid, { fill: 'none', d: '' }); set(this.flHaze, { 'fill-opacity': 0 }); set(this.flPlume, { opacity: 0 }); set(this.flSurface, { stroke: 'none' });
      set(this.flaskBody, { transform: '' }); set(this.thermo, { opacity: 0 }); set(this.swirlMark, { opacity: 0 });
    }
    if (this.view === 'titrate') this.updateMag(b);
    this.drawCue();
  };
  TitrationScene.prototype.setView = function (v) {
    this.view = v;
    this.svg.classList.toggle('titrate-view', v === 'titrate');
    this.magKey = null;
  };
  TitrationScene.prototype.viewBox = function () { return this.view === 'titrate' ? TITRATE_VB : '0 0 960 600'; };
  // A zoomed scale that slides past a fixed meniscus. It never shows a number
  // for the reading: the student reads it.
  TitrationScene.prototype.updateMag = function (b) {
    var purple = this.run.titrant.id === 'KMnO4';
    if (b.reading === null) { set(this.magG, { display: 'none' }); return; }
    set(this.magG, { display: 'inline' });
    var r = Math.max(0, Math.min(50, b.reading)), ry = buretteY(r);
    set(this.magRing, { cy: f1(ry) }); set(this.magLink, { y1: f1(ry), y2: f1(ry + (MAG.y - ry) * 0.5) });
    set(this.magLink, { x2: f1(MAG.x - MAG.r * Math.cos(Math.atan2(MAG.y - ry, MAG.x - BU.x))), y2: f1(MAG.y - MAG.r * Math.sin(Math.atan2(MAG.y - ry, MAG.x - BU.x))) });
    var key = Math.round(b.reading * 200);
    if (key === this.magKey) return;
    this.magKey = key;
    var k = MAG.k, cy = MAG.y, x0 = MAG.x - 34;
    this.magScale.innerHTML = '';
    var first = Math.floor((b.reading - 1.2) * 10), last = Math.ceil((b.reading + 1.2) * 10);
    for (var i = first; i <= last; i++) {
      var v = i / 10, y = cy + (v - b.reading) * k;
      if (v < -0.001 || v > 50.001) continue;
      var whole = i % 10 === 0, half = i % 5 === 0;
      el('line', { x1: x0, x2: x0 + (whole ? 30 : half ? 21 : 12), y1: f1(y), y2: f1(y), stroke: C.text, 'stroke-width': whole ? 1.8 : 1.1 }, this.magScale);
      if (whole) text(this.magScale, x0 - 6, f1(y + 5), String(Math.round(v)), { 'text-anchor': 'end', fill: C.text, 'font-size': 15, 'font-weight': 700, class: 'lens-num' });
    }
    var depth = 0.15 * k, yWall = purple ? cy : cy - depth, yMid = purple ? cy + depth : cy, x1 = x0 + 1, x2 = MAG.x + 45;
    set(this.magLiquid, { d: 'M' + x1 + ',' + f1(yWall) + ' Q' + f1((x1 + x2) / 2) + ',' + f1(2 * yMid - yWall) + ' ' + x2 + ',' + f1(yWall) + ' L' + x2 + ',' + (cy + MAG.r) + ' L' + x1 + ',' + (cy + MAG.r) + ' Z',
      fill: purple ? C.purple : 'rgba(159,180,204,0.32)', stroke: purple ? C.purpleTop : C.clearTop, 'stroke-width': 1.4 });
    this.redrawn = true;
  };

  /* The cue: rings round each part to click next, given as
     [{ part: 'titrant' }, { part: 'indicator', id: 'phenolphthalein' }].
     Drawn from where the part is on screen, so it follows the flask. */
  TitrationScene.prototype.setCue = function (list) {
    this.cues = list || [];
    this.cueKey = null;
  };
  TitrationScene.prototype.drawCue = function () {
    var svg = this.svg, g = this.cueG, self = this;
    var parts = [];
    this.cues.forEach(function (c) {
      svg.querySelectorAll('[data-part="' + c.part + '"]' + (c.id ? '[data-id="' + c.id + '"]' : '')).forEach(function (n) {
        if (n.closest('[display="none"]') || n.getAttribute('display') === 'none') return;
        parts.push(n);
      });
    });
    var ctm = svg.getScreenCTM && svg.getScreenCTM();
    if (!ctm || !parts.length) { if (g.childNodes.length) g.innerHTML = ''; return; }
    var inv = ctm.inverse(), boxes = parts.map(function (n) {
      var r = n.getBoundingClientRect(), p1 = svg.createSVGPoint(), p2 = svg.createSVGPoint();
      p1.x = r.left; p1.y = r.top; p2.x = r.right; p2.y = r.bottom;
      p1 = p1.matrixTransform(inv); p2 = p2.matrixTransform(inv);
      return [Math.round(p1.x - 8), Math.round(p1.y - 8), Math.round(p2.x - p1.x + 16), Math.round(p2.y - p1.y + 16)];
    });
    var key = boxes.join('|');
    if (key === this.cueKey) return;
    this.cueKey = key;
    g.innerHTML = '';
    boxes.forEach(function (b) {
      el('rect', { x: b[0], y: b[1], width: b[2], height: b[3], rx: 10, fill: 'none', stroke: C.amber, 'stroke-width': 3, class: 'cue-ring' }, g);
    });
    self.cueBoxes = boxes;
  };

  /* The magnified burette: 3 cm³ either side of the meniscus. Clear liquids
     are read at the bottom of the meniscus; manganate(VII) is too dark, so at
     the top. Either way the read point is the true reading. */
  function BuretteLens(svg, run) {
    this.svg = svg; this.purple = run.titrant.id === 'KMnO4';
    svg.setAttribute('viewBox', '0 0 160 240');
    svg.innerHTML = '';
    el('rect', { x: 0, y: 0, width: 160, height: 240, fill: '#091321' }, svg);
    this.scale = el('g', {}, svg);
    this.liquid = el('path', { d: '', fill: 'none' }, svg);
    el('line', { x1: 44, x2: 44, y1: 0, y2: 240, stroke: C.glass, 'stroke-width': 1.5 }, svg);
    el('line', { x1: 136, x2: 136, y1: 0, y2: 240, stroke: C.glass, 'stroke-width': 1.5 }, svg);
    this.eye = el('line', { x1: 2, x2: 158, stroke: C.blue, 'stroke-width': 1, 'stroke-dasharray': '4 4', opacity: 0.7 }, svg);
    this.none = text(svg, 80, 124, 'empty', { fill: C.label, 'font-size': 14 });
    this.k = 60; // px per 1 cm³: 6 px per 0.1 cm³
    this.ticks = [];
  }
  BuretteLens.prototype.update = function (lab) {
    var b = lab.state.burette, k = this.k, svg = this.svg;
    if (b.reading === null) { set(this.liquid, { fill: 'none', d: '' }); set(this.none, { display: 'inline' }); set(this.scale, { display: 'none' }); set(this.eye, { display: 'none' }); return; }
    set(this.none, { display: 'none' }); set(this.scale, { display: 'inline' }); set(this.eye, { display: 'inline' });
    var r = b.reading, cy = 120;
    var key = Math.round(r * 100);
    if (this.lastKey !== key) {
      this.lastKey = key; this.redrawn = true;
      // Ticks from r − 2 to r + 2 at 0.1 cm³; labels on whole numbers.
      this.scale.innerHTML = '';
      var first = Math.floor((r - 2.1) * 10), last = Math.ceil((r + 2.1) * 10);
      for (var i = first; i <= last; i++) {
        var v = i / 10, y = cy + (v - r) * k;
        if (v < -0.001 || v > 50.001) continue;
        var whole = i % 10 === 0, half = i % 5 === 0;
        var len = whole ? 34 : half ? 24 : 14;
        el('line', { x1: 44, x2: 44 + len, y1: y, y2: y, stroke: C.text, 'stroke-width': whole ? 1.6 : 1 }, this.scale);
        if (whole) text(this.scale, 38, y + 5, String(Math.round(v)), { 'text-anchor': 'end', fill: C.text, 'font-size': 15, 'font-weight': 600, class: 'lens-num' });
      }
    }
    var colour = this.purple ? C.purple : 'rgba(159,180,204,0.32)';
    // Meniscus: 0.15 cm³ deep between wall and centre.
    var depth = 0.15 * k, yr = cy;
    var yWall = this.purple ? yr : yr - depth, yMid = this.purple ? yr + depth : yr;
    var d = 'M45,' + yWall + ' Q90,' + (2 * yMid - yWall) + ' 135,' + yWall + ' L135,240 L45,240 Z';
    set(this.liquid, { d: d, fill: colour, stroke: this.purple ? C.purpleTop : C.clearTop, 'stroke-width': 1.4 });
    set(this.eye, { y1: yr, y2: yr });
  };

  /* ===================== Standard solution scene (RP1) ===================== */
  var VF = { x: 640, bulbY: 420, bulbR: 72, neckW: 20, neckTop: 150, mark: 230, perCm3: 6, bulbVol: 238 };
  function vfLevel(v) {
    if (v <= 0) return null;
    if (v >= VF.bulbVol) return VF.mark - (v - 250) * VF.perCm3;
    // Bulb: fill a circle segment from the bottom; area ∝ volume (a sketch).
    var R = VF.bulbR, target = v / VF.bulbVol * Math.PI * R * R, lo = 0, hi = 2 * R;
    for (var i = 0; i < 30; i++) { var hgt = (lo + hi) / 2, a = R * R * Math.acos((R - hgt) / R) - (R - hgt) * Math.sqrt(Math.max(0, 2 * R * hgt - hgt * hgt)); if (a < target) lo = hgt; else hi = hgt; }
    return VF.bulbY + R - (lo + hi) / 2;
  }

  function PrepScene(svg, run) {
    this.svg = svg; this.run = run;
    svg.setAttribute('viewBox', '0 0 960 600');
    svg.innerHTML = '';
    var g = el('g', { 'stroke-linejoin': 'round', 'stroke-linecap': 'round' }, svg);
    el('rect', { x: 0, y: 510, width: 960, height: 90, fill: C.bench }, g);
    el('line', { x1: 0, y1: 510.5, x2: 960, y2: 510.5, stroke: C.benchTop, 'stroke-width': 1.5 }, g);
    // Balance.
    var bal = el('g', { 'data-part': 'balance', class: 'part' }, g);
    el('rect', { x: 50, y: 440, width: 210, height: 65, rx: 6, fill: '#1b2a3c', stroke: C.leader, 'stroke-width': 1.2 }, bal);
    el('rect', { x: 80, y: 430, width: 150, height: 8, rx: 2, fill: C.steel }, bal);
    el('rect', { x: 92, y: 458, width: 126, height: 34, rx: 4, fill: '#06111d', stroke: C.leader }, bal);
    this.balText = text(bal, 210, 482, '0.00 g', { 'text-anchor': 'end', fill: '#7fd99a', 'font-size': 20, 'font-weight': 700, class: 'readout' });
    text(g, 155, 532, 'balance (2 d.p.)', { 'font-size': 12, class: 'cap' });
    // Weighing bottle on the pan.
    this.bottle = el('g', {}, g);
    el('path', { d: 'M135,392 L135,424 Q135,430 141,430 L169,430 Q175,430 175,424 L175,392', fill: C.glassFill, stroke: C.glass, 'stroke-width': 1.4 }, this.bottle);
    this.bottleSolid = el('rect', { x: 137, width: 36, y: 428, height: 0, fill: '#e9eef5' }, this.bottle);
    text(this.bottle, 155, 384, 'weighing bottle', { 'font-size': 11, class: 'cap' });
    // Beaker with rod.
    var bk = el('g', { 'data-part': 'beaker', class: 'part' }, g);
    this.beakerLiquid = el('rect', { x: 327, width: 106, y: 504, height: 0, fill: C.clear }, bk);
    this.beakerSolid = el('ellipse', { cx: 380, cy: 500, rx: 0, ry: 4, fill: '#e9eef5' }, bk);
    el('path', { d: 'M319,363 Q325,364 325,370 L325,499 Q325,505 331,505 L429,505 Q435,505 435,499 L435,370 Q435,365 439,364', fill: 'none', stroke: C.glass, 'stroke-width': 1.5 }, bk);
    el('path', { d: 'M319,363 Q325,364 325,370 L325,499 Q325,505 331,505 L429,505 Q435,505 435,499 L435,370 Q435,365 439,364 Z', fill: 'transparent', stroke: 'none', class: 'hit' }, bk);
    text(g, 380, 532, 'beaker', { 'font-size': 12, class: 'cap' });
    this.rod = el('g', { 'data-part': 'rod', class: 'part' }, g);
    el('line', { x1: 446, y1: 338, x2: 414, y2: 498, stroke: C.glass, 'stroke-width': 3, 'stroke-linecap': 'round' }, this.rod);
    el('line', { x1: 446, y1: 338, x2: 414, y2: 498, stroke: 'transparent', 'stroke-width': 12, class: 'hit' }, this.rod);
    // Volumetric flask.
    var vf = el('g', { 'data-part': 'vflask', class: 'part' }, g);
    this.vf = vf;
    this.vfLiquid = el('path', { d: '', fill: 'none' }, vf);
    var nx = VF.neckW / 2;
    el('path', { d: 'M' + (VF.x - nx) + ',' + VF.neckTop + ' L' + (VF.x - nx) + ',' + (VF.bulbY - VF.bulbR + 4) +
      ' A' + VF.bulbR + ',' + VF.bulbR + ' 0 1 0 ' + (VF.x + nx) + ',' + (VF.bulbY - VF.bulbR + 4) + ' L' + (VF.x + nx) + ',' + VF.neckTop,
      fill: C.glassFill, stroke: C.glass, 'stroke-width': 1.6 }, vf);
    el('line', { x1: VF.x - nx - 4, x2: VF.x + nx + 4, y1: VF.mark, y2: VF.mark, stroke: C.text, 'stroke-width': 1.4 }, vf);
    this.stopper = el('path', { d: stopperPath(VF.x, VF.neckTop - 18), fill: C.steelDark, stroke: C.glass, 'stroke-width': 1, 'data-part': 'stopper', class: 'part' }, vf);
    this.vfFunnel = el('path', { d: funnelPath(VF.x, VF.neckTop - 34), fill: C.glassFill, stroke: C.glass, 'stroke-width': 1.4, 'data-part': 'funnel', class: 'part' }, vf);
    this.funnelParked = el('g', { 'data-part': 'funnel', class: 'part' }, g);
    el('path', { d: funnelPath(780, 469), fill: C.glassFill, stroke: C.glass, 'stroke-width': 1.4 }, this.funnelParked);
    text(this.funnelParked, 780, 532, 'funnel', { 'font-size': 12, class: 'cap' });
    this.stopperParked = el('g', { 'data-part': 'stopper', class: 'part' }, g);
    el('path', { d: stopperPath(775, 556), fill: C.steelDark, stroke: C.glass, 'stroke-width': 1 }, this.stopperParked);
    el('rect', { x: 755, y: 548, width: 40, height: 36, fill: 'transparent', class: 'hit' }, this.stopperParked);
    text(this.stopperParked, 775, 594, 'stopper', { 'font-size': 12, class: 'cap' });
    text(g, VF.x, 532, '250.0 cm³ volumetric flask', { 'font-size': 12 });
    text(vf, VF.x + 40, VF.mark + 4, 'mark', { 'text-anchor': 'start', 'font-size': 12 });
    // Wash bottle and dropper.
    var wb = el('g', { 'data-part': 'wash', class: 'part' }, g);
    el('path', { d: 'M842,505 Q834,505 834,497 L834,450 Q834,438 846,438 L858,438 Q870,438 870,450 L870,497 Q870,505 862,505 Z', fill: C.glassFill, stroke: C.glass, 'stroke-width': 1.4 }, wb);
    el('path', { d: 'M852,438 L852,424 L876,410', fill: 'none', stroke: C.glass, 'stroke-width': 2 }, wb);
    text(wb, 852, 532, 'deionised', { 'font-size': 12, class: 'cap' }); text(wb, 852, 546, 'water', { 'font-size': 12, class: 'cap' });
    var dr = el('g', { 'data-part': 'dropper', class: 'part' }, g);
    el('path', { d: 'M900,432 L900,500 Q903,507 906,500 L906,432', fill: C.glassFill, stroke: C.glass, 'stroke-width': 1.3 }, dr);
    el('rect', { x: 896, y: 410, width: 14, height: 24, rx: 7, fill: C.rubber }, dr);
    el('rect', { x: 888, y: 404, width: 30, height: 108, fill: 'transparent', class: 'hit' }, dr);
    text(dr, 903, 562, 'dropper', { 'font-size': 12, class: 'cap' });
    // Stock jar of the solid.
    var jar = el('g', { 'data-part': 'solid', class: 'part' }, g);
    el('path', { d: 'M478,445 Q470,445 470,453 L470,497 Q470,505 478,505 L522,505 Q530,505 530,497 L530,453 Q530,445 522,445 Z', fill: C.glassFill, stroke: C.glass, 'stroke-width': 1.4 }, jar);
    el('rect', { x: 472, y: 470, width: 56, height: 33, rx: 6, fill: '#e9eef5', 'fill-opacity': 0.8 }, jar);
    el('rect', { x: 474, y: 437, width: 52, height: 9, rx: 4, fill: C.steelDark, stroke: C.glass, 'stroke-width': 1 }, jar);
    text(jar, 500, 532, 'Na₂CO₃(s)', { 'font-size': 12, class: 'cap' });
    text(jar, 500, 546, 'anhydrous', { 'font-size': 11, class: 'cap' });
    this.t = 0; this.flip = 0;
    this.cueG = el('g', { class: 'cue', 'pointer-events': 'none' }, svg);
    this.cues = [];
    partsAsButtons(svg, { balance: 'balance', beaker: 'beaker', rod: 'glass rod', vflask: '250.0 cm³ volumetric flask', funnel: 'funnel', stopper: 'stopper', wash: 'wash bottle of deionised water', dropper: 'dropper', solid: 'jar of anhydrous sodium carbonate' });
  }
  PrepScene.prototype.update = function (lab, dt) {
    var p = lab.state.prep;
    if (!p) return;
    this.t += dt || 0;
    setText(this.balText, p.balance().toFixed(2) + ' g');
    set(this.bottleSolid, { y: 428 - Math.min(30, p.bottleSolid_g * 9), height: Math.min(30, p.bottleSolid_g * 9) });
    var water = p.poured ? 0 : p.beakerWater_cm3;
    var bh = Math.min(120, water * 0.95);
    set(this.beakerLiquid, { y: 504 - bh, height: bh, fill: water > 0 ? C.clear : 'none' });
    set(this.beakerSolid, { rx: p.dissolved || p.poured ? 0 : Math.min(40, p.beakerSolid_g * 14) });
    set(this.rod, { display: p.poured ? 'none' : 'inline' });
    var lvl = p.poured ? vfLevel(p.flaskWater_cm3) : null;
    if (lvl !== null) {
      var nx = VF.neckW / 2 - 1.5, d;
      if (lvl < VF.bulbY - VF.bulbR + 6) {
        d = 'M' + (VF.x - nx) + ',' + lvl + ' L' + (VF.x - nx) + ',' + (VF.bulbY - VF.bulbR + 5) + ' A' + (VF.bulbR - 1.5) + ',' + (VF.bulbR - 1.5) + ' 0 1 0 ' + (VF.x + nx) + ',' + (VF.bulbY - VF.bulbR + 5) + ' L' + (VF.x + nx) + ',' + lvl + ' Z';
      } else {
        var R = VF.bulbR - 1.5, dy = lvl - VF.bulbY, half = Math.sqrt(Math.max(0, R * R - dy * dy));
        d = 'M' + (VF.x - half) + ',' + lvl + ' A' + R + ',' + R + ' 0 ' + (dy < 0 ? 1 : 0) + ' 0 ' + (VF.x + half) + ',' + lvl + ' Z';
      }
      set(this.vfLiquid, { d: d, fill: 'rgba(159,180,204,0.40)', stroke: C.clearTop, 'stroke-width': 1 });
    } else set(this.vfLiquid, { d: '', fill: 'none', stroke: 'none' });
    set(this.stopper, { display: p.stoppered ? 'inline' : 'none' });
    set(this.stopperParked, { display: p.stoppered ? 'none' : 'inline' });
    set(this.vfFunnel, { display: p.funnel ? 'inline' : 'none' });
    set(this.funnelParked, { display: p.funnel ? 'none' : 'inline' });
    // The flask turns over once for each inversion (twice at most, to keep it short).
    if (this.lastInv !== p.inversions) { var n = p.inversions - (this.lastInv || 0); this.lastInv = p.inversions; if (n > 0) this.flip = 0.6 * Math.min(2, n); }
    this.flip = Math.max(0, this.flip - (dt || 0));
    var ang = this.flip > 0 && !(root.matchMedia && root.matchMedia('(prefers-reduced-motion: reduce)').matches) ? 180 * Math.abs(Math.sin(Math.PI * this.flip / 0.6)) : 0;
    set(this.vf, { transform: ang ? 'rotate(' + ang.toFixed(0) + ' ' + VF.x + ' 330)' : '' });
    this.drawCue();
  };

  /* The neck of the volumetric flask, magnified: ±1 cm³ around the mark. */
  function NeckLens(svg) {
    this.svg = svg;
    svg.setAttribute('viewBox', '0 0 160 240');
    svg.innerHTML = '';
    el('rect', { x: 0, y: 0, width: 160, height: 240, fill: '#091321' }, svg);
    this.liquid = el('path', { d: '', fill: 'none' }, svg);
    el('line', { x1: 40, x2: 40, y1: 0, y2: 240, stroke: C.glass, 'stroke-width': 1.5 }, svg);
    el('line', { x1: 120, x2: 120, y1: 0, y2: 240, stroke: C.glass, 'stroke-width': 1.5 }, svg);
    el('line', { x1: 32, x2: 128, y1: 120, y2: 120, stroke: C.text, 'stroke-width': 2 }, svg);
    text(svg, 80, 112, 'mark', { fill: C.text, 'font-size': 13 });
    this.none = text(svg, 80, 200, 'below view', { fill: C.label, 'font-size': 13 });
    this.k = 80; // px per cm³ in the neck (about 8 mm per cm³, magnified ×10)
  }
  NeckLens.prototype.update = function (lab) {
    var p = lab.state.prep;
    if (!p || !p.poured) { set(this.liquid, { d: '' }); set(this.none, { display: 'inline' }); return; }
    var v = p.flaskWater_cm3, y = 120 - (v - 250) * this.k;
    if (y > 260) { set(this.liquid, { d: '' }); set(this.none, { display: 'inline' }); return; }
    set(this.none, { display: 'none' });
    var depth = 10;
    set(this.liquid, { d: 'M41,' + (y - depth) + ' Q80,' + (y + depth) + ' 119,' + (y - depth) + ' L119,240 L41,240 Z', fill: 'rgba(159,180,204,0.32)', stroke: C.clearTop, 'stroke-width': 1.4 });
  };

  PrepScene.prototype.setCue = TitrationScene.prototype.setCue;
  PrepScene.prototype.drawCue = TitrationScene.prototype.drawCue;

  root.TitrationBench = { TitrationScene: TitrationScene, BuretteLens: BuretteLens, PrepScene: PrepScene, NeckLens: NeckLens, liquidColour: liquidColour, C: C, flaskHeight: flaskHeight };
})(typeof self !== 'undefined' ? self : this);
