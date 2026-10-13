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
  function flaskPath(cx, base) {
    var top = base - FL.body, nt = top - FL.neckH;
    return 'M' + (cx - FL.neck) + ',' + nt + ' L' + (cx - FL.neck) + ',' + top + ' L' + (cx - FL.base + 4) + ',' + (base - 4) +
      ' Q' + (cx - FL.base) + ',' + base + ' ' + (cx - FL.base + 8) + ',' + base + ' L' + (cx + FL.base - 8) + ',' + base +
      ' Q' + (cx + FL.base) + ',' + base + ' ' + (cx + FL.base - 4) + ',' + (base - 4) + ' L' + (cx + FL.neck) + ',' + top + ' L' + (cx + FL.neck) + ',' + nt;
  }
  function flaskLiquid(cx, base, h) {
    var r = FL.base - (FL.base - FL.neck) * h / FL.body, y = base - h;
    return 'M' + (cx - r + 1.5) + ',' + y + ' L' + (cx - FL.base + 5) + ',' + (base - 5) + ' Q' + (cx - FL.base + 1.5) + ',' + (base - 1.5) + ' ' + (cx - FL.base + 9) + ',' + (base - 1.5) +
      ' L' + (cx + FL.base - 9) + ',' + (base - 1.5) + ' Q' + (cx + FL.base - 1.5) + ',' + (base - 1.5) + ' ' + (cx + FL.base - 5) + ',' + (base - 5) + ' L' + (cx + r - 1.5) + ',' + y + ' Z';
  }

  /* ---------- Burette geometry ---------- */
  var BU = { x: 380, w: 16, top: 18, y0: 44, k: 5.2, tap: 326, jetEnd: 374 };
  function buretteY(r) { return BU.y0 + r * BU.k; }

  /* ===================== Titration scene ===================== */
  function TitrationScene(svg, run) {
    this.svg = svg; this.run = run;
    var redox = run.type === 'redox', self = this;
    svg.setAttribute('viewBox', '0 0 960 600');
    svg.innerHTML = '';
    var g = el('g', {}, svg);
    this.g = g;
    // Bench.
    el('rect', { x: 0, y: 510, width: 960, height: 90, fill: C.bench }, g);
    el('line', { x1: 0, y1: 510.5, x2: 960, y2: 510.5, stroke: C.benchTop, 'stroke-width': 1.5 }, g);
    // Stand.
    el('rect', { x: 236, y: 498, width: 230, height: 12, rx: 2, fill: C.steelDark }, g);
    el('rect', { x: 258, y: 26, width: 8, height: 472, fill: C.steel }, g);
    [104, 236].forEach(function (y) {
      el('rect', { x: 266, y: y - 3, width: 100, height: 6, fill: C.steel }, g);
      el('rect', { x: 254, y: y - 7, width: 16, height: 14, rx: 2, fill: C.steelDark }, g);
      el('rect', { x: 364, y: y - 9, width: 6, height: 18, rx: 1, fill: C.steel }, g);
      el('rect', { x: 390, y: y - 9, width: 6, height: 18, rx: 1, fill: C.steel }, g);
    });

    // Tile (under the burette).
    this.tile = el('rect', { x: 286, y: 504, width: 188, height: 7, rx: 1, fill: C.tile, stroke: C.tileEdge, 'stroke-width': 1, 'data-part': 'tile', class: 'part' }, g);
    this.tileParked = el('g', { 'data-part': 'tile', class: 'part' }, g);
    el('rect', { x: 30, y: 560, width: 150, height: 9, rx: 1.5, fill: C.tile, stroke: C.tileEdge, 'stroke-width': 1 }, this.tileParked);
    el('rect', { x: 26, y: 548, width: 158, height: 26, fill: 'transparent' }, this.tileParked);
    text(this.tileParked, 105, 590, 'white tile', { 'font-size': 12, class: 'cap' });

    // Burette.
    var bu = el('g', { 'data-part': 'burette', class: 'part' }, g);
    this.buLiquid = el('rect', { x: BU.x - BU.w / 2 + 1.5, width: BU.w - 3, fill: C.clear }, bu);
    this.buBelow = el('path', { d: 'M' + (BU.x - 6.5) + ',312 L' + (BU.x - 3) + ',' + BU.tap + ' L' + (BU.x + 3) + ',' + BU.tap + ' L' + (BU.x + 6.5) + ',312 Z', fill: C.clear }, bu);
    this.buTop = el('line', { x1: BU.x - BU.w / 2 + 1.5, x2: BU.x + BU.w / 2 - 1.5, stroke: C.clearTop, 'stroke-width': 1.5 }, bu);
    el('path', { d: 'M' + (BU.x - BU.w / 2) + ',' + BU.top + ' L' + (BU.x - BU.w / 2) + ',312 L' + (BU.x - 4) + ',' + BU.tap + ' M' + (BU.x + BU.w / 2) + ',' + BU.top + ' L' + (BU.x + BU.w / 2) + ',312 L' + (BU.x + 4) + ',' + BU.tap,
      fill: 'none', stroke: C.glass, 'stroke-width': 1.5 }, bu);
    // Scale: every 1 cm³, labelled every 5.
    for (var r = 0; r <= 50; r++) {
      var y = buretteY(r), major = r % 5 === 0;
      el('line', { x1: BU.x - BU.w / 2, x2: BU.x - BU.w / 2 + (major ? 7 : 4), y1: y, y2: y, stroke: C.glass, 'stroke-width': major ? 1.2 : 0.8 }, bu);
      if (major) text(bu, BU.x - BU.w / 2 - 6, y + 4, String(r), { 'text-anchor': 'end', 'font-size': 11, class: 'scale' });
    }
    // Tap and jet.
    this.jetLiquid = el('rect', { x: BU.x - 1.5, y: BU.tap + 10, width: 3, height: BU.jetEnd - BU.tap - 12, fill: 'none' }, bu);
    el('path', { d: 'M' + (BU.x - 2.5) + ',' + (BU.tap + 8) + ' L' + (BU.x - 2.5) + ',' + (BU.jetEnd - 4) + ' L' + (BU.x - 1) + ',' + BU.jetEnd + ' M' + (BU.x + 2.5) + ',' + (BU.tap + 8) + ' L' + (BU.x + 2.5) + ',' + (BU.jetEnd - 4) + ' L' + (BU.x + 1) + ',' + BU.jetEnd,
      fill: 'none', stroke: C.glass, 'stroke-width': 1.3 }, bu);
    el('rect', { x: BU.x - 5, y: BU.tap - 1, width: 10, height: 10, rx: 2, fill: C.steelDark, stroke: C.glass, 'stroke-width': 1 }, bu);
    var tapG = el('g', { 'data-part': 'tap', class: 'part' }, g);
    this.tapG = tapG;
    el('rect', { x: BU.x - 30, y: BU.tap - 12, width: 60, height: 32, fill: 'transparent' }, tapG);
    this.tapHandle = el('rect', { x: BU.x - 16, y: BU.tap + 2, width: 32, height: 4, rx: 2, fill: C.blue }, tapG);
    this.tapLabel = text(g, BU.x + 46, BU.tap + 8, 'tap', { 'font-size': 12, 'text-anchor': 'start' });
    // Funnel in the top.
    this.funnelIn = el('path', { d: 'M352,4 L408,4 L384,26 L384,40 L376,40 L376,26 Z', fill: C.glassFill, stroke: C.glass, 'stroke-width': 1.5, 'data-part': 'funnel', class: 'part' }, g);
    text(g, BU.x + 46, 70, 'burette', { 'font-size': 12, 'text-anchor': 'start' });

    // Stream and drop from the jet.
    this.stream = el('line', { x1: BU.x, x2: BU.x, y1: BU.jetEnd, y2: BU.jetEnd + 60, 'stroke-width': 2.5, stroke: 'none' }, g);
    this.drop = el('circle', { cx: BU.x, cy: BU.jetEnd + 4, r: 2.6, fill: 'none' }, g);

    // Flask (under the burette or parked to the left).
    this.flaskG = el('g', { 'data-part': 'flask', class: 'part' }, g);
    this.flaskBody = el('g', {}, this.flaskG);
    this.flLiquid = el('path', { d: '', fill: 'none' }, this.flaskBody);
    this.flHaze = el('path', { d: '', fill: 'rgb(122,74,34)', 'fill-opacity': 0 }, this.flaskBody);
    this.flPlume = el('ellipse', { cx: 0, cy: 0, rx: 12, ry: 6, fill: 'none', opacity: 0 }, this.flaskBody);
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
    this.waste = el('g', { 'data-part': 'waste', class: 'part' }, g);
    el('path', { d: 'M-34,-82 L-34,-4 Q-34,0 -30,0 L30,0 Q34,0 34,-4 L34,-82 M-34,-82 L-38,-86', fill: C.glassFill, stroke: C.glass, 'stroke-width': 1.5 }, this.waste);
    this.wasteLiquid = el('rect', { x: -32.5, width: 65, y: -6, height: 4.5, fill: C.clear }, this.waste);
    text(this.waste, 0, 30, 'waste beaker', { 'font-size': 12, class: 'cap' });

    // Shelf: bottles, indicator or acid, wash bottle, pipette, spare funnel.
    var shelf = el('g', {}, g);
    function bottle(x, w, h, fill, labelTop, labelBottom, part, labelUnit, id) {
      var b = el('g', { 'data-part': part, class: 'part' }, shelf);
      if (id) b.setAttribute('data-id', id);
      el('rect', { x: x - w / 2, y: 505 - h, width: w, height: h, rx: 6, fill: C.glassFill, stroke: C.glass, 'stroke-width': 1.4 }, b);
      el('rect', { x: x - w / 2 + 2, y: 505 - h * 0.62, width: w - 4, height: h * 0.62 - 2, rx: 4, fill: fill }, b);
      el('rect', { x: x - w * 0.18, y: 505 - h - 14, width: w * 0.36, height: 14, rx: 2, fill: C.steelDark, stroke: C.glass, 'stroke-width': 1 }, b);
      var lh = labelUnit ? 34 : 24;
      el('rect', { x: x - w / 2 + 4, y: 505 - h * 0.55, width: w - 8, height: lh, rx: 2, fill: '#0d1928', stroke: C.leader, 'stroke-width': 1 }, b);
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
        el('rect', { x: x - 14, y: 455, width: 28, height: 50, rx: 4, fill: C.glassFill, stroke: C.glass, 'stroke-width': 1.3 }, b);
        el('path', { d: 'M' + (x - 5) + ',455 L' + (x - 5) + ',440 Q' + x + ',428 ' + (x + 5) + ',440 L' + (x + 5) + ',455', fill: C.rubber }, b);
        text(b, x, 475, short[id] || id, { fill: C.text, 'font-size': 8.5 });
        text(b, x, 485, short2[id] || '', { fill: C.text, 'font-size': 8.5 });
      });
      text(shelf, 782 + (inds.length - 1) * 21, 532, 'indicators', { 'font-size': 12, class: 'cap' });
    }
    // Wash bottle.
    var wb = el('g', { 'data-part': 'wash', class: 'part' }, shelf);
    el('path', { d: 'M904,505 L904,448 Q904,438 914,438 L930,438 Q940,438 940,448 L940,505 Z', fill: C.glassFill, stroke: C.glass, 'stroke-width': 1.4 }, wb);
    el('path', { d: 'M922,438 L922,424 L946,410', fill: 'none', stroke: C.glass, 'stroke-width': 2 }, wb);
    text(shelf, 922, 532, 'distilled', { 'font-size': 12, class: 'cap' });
    text(shelf, 922, 546, 'water', { 'font-size': 12, class: 'cap' });
    // Pipette with filler, lying on the bench front.
    var pip = el('g', { 'data-part': 'pipette', class: 'part' }, g);
    this.pipG = pip;
    if (run.aliquotDeviceKind !== 'cylinder') {
      el('rect', { x: 554, y: 552, width: 326, height: 34, fill: 'transparent' }, pip);
      el('path', { d: 'M560,566 L640,566 L650,560 L720,560 L730,566 L830,566', fill: 'none', stroke: C.glass, 'stroke-width': 1.6 }, pip);
      el('path', { d: 'M560,572 L640,572 L650,578 L720,578 L730,572 L830,572', fill: 'none', stroke: C.glass, 'stroke-width': 1.6 }, pip);
      el('line', { x1: 800, x2: 800, y1: 564, y2: 574, stroke: C.text, 'stroke-width': 1 }, pip);
      el('rect', { x: 830, y: 560, width: 44, height: 18, rx: 9, fill: C.rubber }, pip);
      text(pip, 700, 594, 'pipette and filler', { 'font-size': 12, class: 'cap' });
    } else {
      el('path', { d: 'M620,505 L620,430 L660,430 L660,505 M610,505 L670,505', fill: C.glassFill, stroke: C.glass, 'stroke-width': 1.4 }, pip);
      text(pip, 640, 594, 'measuring cylinder', { 'font-size': 12, class: 'cap' });
    }
    // Spare funnel on the bench.
    this.funnelOut = el('g', { 'data-part': 'funnel', class: 'part' }, g);
    el('path', { d: 'M552,470 L600,470 L580,488 L580,505 L572,505 L572,488 Z', fill: C.glassFill, stroke: C.glass, 'stroke-width': 1.4 }, this.funnelOut);
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
      set(this.flLiquid, { d: flaskLiquid(0, base, h), fill: fill });
      set(this.flHaze, { d: flaskLiquid(0, base, h), 'fill-opacity': Math.min(0.85, ap.haze * 2500).toFixed(3) });
      var r = FL.base - (FL.base - FL.neck) * h / FL.body;
      set(this.flSurface, { x1: -r + 2, x2: r - 2, y1: -h, y2: -h, stroke: clear ? C.clearTop : rgb(col.map(function (c) { return c * 0.8; })) });
      if (ap.plume && under === 'flask') {
        var pc = liquidColour(ap.plume.abs, bg);
        this.lastPlume = { fill: rgb(pc), strength: ap.plume.strength };
        set(this.flPlume, { cx: 0, cy: -h + 8, rx: 10 + 16 * ap.plume.strength, ry: 4 + 5 * ap.plume.strength, fill: rgb(pc), opacity: (0.35 + 0.6 * ap.plume.strength).toFixed(2) });
      } else if (s.swirlAnim > 0 && this.lastPlume && !this.reduced) {
        var fade = 1 - ph, lp = this.lastPlume;
        set(this.flPlume, { cx: 0, cy: -h * 0.55, rx: (10 + 16 * lp.strength) + ph * 55, ry: (4 + 5 * lp.strength) + ph * h * 0.35, fill: lp.fill, opacity: (fade * (0.35 + 0.6 * lp.strength)).toFixed(2) });
      } else { this.lastPlume = null; set(this.flPlume, { opacity: 0 }); }
      var warm = f.T > 26;
      set(this.thermo, { opacity: warm || run.warm ? 1 : 0 });
      setText(this.thermoText, Math.round(f.T) + ' °C');
    } else {
      set(this.flLiquid, { fill: 'none', d: '' }); set(this.flHaze, { 'fill-opacity': 0 }); set(this.flPlume, { opacity: 0 }); set(this.flSurface, { stroke: 'none' });
      set(this.flaskBody, { transform: '' }); set(this.thermo, { opacity: 0 }); set(this.swirlMark, { opacity: 0 });
    }
    this.drawCue();
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
    var g = el('g', {}, svg);
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
    el('path', { d: 'M135,430 L135,392 L175,392 L175,430 Z', fill: C.glassFill, stroke: C.glass, 'stroke-width': 1.4 }, this.bottle);
    this.bottleSolid = el('rect', { x: 137, width: 36, y: 428, height: 0, fill: '#e9eef5' }, this.bottle);
    text(this.bottle, 155, 384, 'weighing bottle', { 'font-size': 11, class: 'cap' });
    // Beaker with rod.
    var bk = el('g', { 'data-part': 'beaker', class: 'part' }, g);
    this.beakerLiquid = el('rect', { x: 327, width: 106, y: 504, height: 0, fill: C.clear }, bk);
    this.beakerSolid = el('ellipse', { cx: 380, cy: 500, rx: 0, ry: 4, fill: '#e9eef5' }, bk);
    el('path', { d: 'M325,370 L325,500 Q325,505 330,505 L430,505 Q435,505 435,500 L435,370 M325,370 L319,364', fill: 'none', stroke: C.glass, 'stroke-width': 1.5 }, bk);
    this.rod = el('line', { x1: 400, y1: 350, x2: 365, y2: 498, stroke: C.glass, 'stroke-width': 3, 'stroke-linecap': 'round' }, bk);
    text(g, 380, 532, 'beaker', { 'font-size': 12, class: 'cap' });
    // Volumetric flask.
    var vf = el('g', { 'data-part': 'vflask', class: 'part' }, g);
    this.vf = vf;
    this.vfLiquid = el('path', { d: '', fill: 'none' }, vf);
    var nx = VF.neckW / 2;
    el('path', { d: 'M' + (VF.x - nx) + ',' + VF.neckTop + ' L' + (VF.x - nx) + ',' + (VF.bulbY - VF.bulbR + 4) +
      ' A' + VF.bulbR + ',' + VF.bulbR + ' 0 1 0 ' + (VF.x + nx) + ',' + (VF.bulbY - VF.bulbR + 4) + ' L' + (VF.x + nx) + ',' + VF.neckTop,
      fill: C.glassFill, stroke: C.glass, 'stroke-width': 1.6 }, vf);
    el('line', { x1: VF.x - nx - 4, x2: VF.x + nx + 4, y1: VF.mark, y2: VF.mark, stroke: C.text, 'stroke-width': 1.4 }, vf);
    this.stopper = el('rect', { x: VF.x - nx - 3, y: VF.neckTop - 18, width: VF.neckW + 6, height: 20, rx: 4, fill: C.steelDark, stroke: C.glass, 'stroke-width': 1 }, vf);
    this.vfFunnel = el('path', { d: 'M' + (VF.x - 34) + ',' + (VF.neckTop - 36) + ' L' + (VF.x + 34) + ',' + (VF.neckTop - 36) + ' L' + (VF.x + 5) + ',' + (VF.neckTop - 8) + ' L' + (VF.x + 5) + ',' + (VF.neckTop + 26) + ' L' + (VF.x - 5) + ',' + (VF.neckTop + 26) + ' L' + (VF.x - 5) + ',' + (VF.neckTop - 8) + ' Z',
      fill: C.glassFill, stroke: C.glass, 'stroke-width': 1.4 }, vf);
    text(g, VF.x, 532, '250.0 cm³ volumetric flask', { 'font-size': 12 });
    text(vf, VF.x + 40, VF.mark + 4, 'mark', { 'text-anchor': 'start', 'font-size': 12 });
    // Wash bottle and dropper.
    el('path', { d: 'M834,505 L834,448 Q834,438 844,438 L860,438 Q870,438 870,448 L870,505 Z', fill: C.glassFill, stroke: C.glass, 'stroke-width': 1.4 }, g);
    el('path', { d: 'M852,438 L852,424 L876,410', fill: 'none', stroke: C.glass, 'stroke-width': 2 }, g);
    text(g, 852, 532, 'deionised', { 'font-size': 12, class: 'cap' }); text(g, 852, 546, 'water', { 'font-size': 12, class: 'cap' });
    el('path', { d: 'M900,505 L900,430 M906,505 L906,430', stroke: C.glass, 'stroke-width': 1.3 }, g);
    el('rect', { x: 896, y: 410, width: 14, height: 22, rx: 6, fill: C.rubber }, g);
    text(g, 903, 562, 'dropper', { 'font-size': 12, class: 'cap' });
    // Stock jar of the solid.
    el('rect', { x: 470, y: 445, width: 60, height: 60, rx: 6, fill: C.glassFill, stroke: C.glass, 'stroke-width': 1.4 }, g);
    el('rect', { x: 472, y: 470, width: 56, height: 33, rx: 4, fill: '#e9eef5', 'fill-opacity': 0.8 }, g);
    text(g, 500, 532, 'Na₂CO₃(s)', { 'font-size': 12, class: 'cap' });
    text(g, 500, 546, 'anhydrous', { 'font-size': 11, class: 'cap' });
    this.t = 0; this.flip = 0;
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
    set(this.vfFunnel, { display: p.funnel ? 'inline' : 'none' });
    // A quick turn of the flask each time it is inverted.
    if (this.lastInv !== p.inversions) { this.lastInv = p.inversions; if (p.inversions) this.flip = 0.6; }
    this.flip = Math.max(0, this.flip - (dt || 0));
    var ang = this.flip > 0 && !(root.matchMedia && root.matchMedia('(prefers-reduced-motion: reduce)').matches) ? 180 * Math.sin(Math.PI * this.flip / 0.6) : 0;
    set(this.vf, { transform: ang ? 'rotate(' + ang.toFixed(0) + ' ' + VF.x + ' 330)' : '' });
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

  root.TitrationBench = { TitrationScene: TitrationScene, BuretteLens: BuretteLens, PrepScene: PrepScene, NeckLens: NeckLens, liquidColour: liquidColour, C: C, flaskHeight: flaskHeight };
})(typeof self !== 'undefined' ? self : this);
