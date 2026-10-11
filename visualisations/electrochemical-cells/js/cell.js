/* Electrochemical Cell Builder — the bench, drawn in SVG.

   Flat apparatus on the dark stage: hairline glass, flat solutions, no
   gradients, glows or shadows. draw(model) builds a scene from a description
   the page makes out of engine results (which electrode is negative, which
   way electrons go, what forms where); tick(t) only moves markers along the
   paths that description fixed. Nothing here decides any chemistry.

   Markers never rely on colour alone: electrons carry a bar (−) and are
   labelled e⁻, positive ions a cross, negative ions a bar, and every flow has
   a direction chevron and a text label that stay when motion is off.

   Scenes: 'galvanic' (two half-cells and a salt bridge), 'simple' (two metals
   in one electrolyte), 'battery' (simple cells in series), 'electrolysis'
   and 'fuel' (hydrogen fuel cell). viewBox 0 0 960 600. */
(function (root) {
  'use strict';
  var E = root.CellEngine, NS = 'http://www.w3.org/2000/svg';
  var C = {
    glass: '#9fb4cc', text: '#edf2f8', muted: '#8693a5', line: '#2c3d52', panel: '#0d1928', deep: '#050e1a', wire: '#8a98ab',
    electron: '#f2c94c', cation: '#b199f4', anion: '#5fd3a8', good: '#7fd99a', bad: '#ff8a7a', blue: '#47b5fa',
    red: '#e5484d', black: '#1a2230', graphite: '#3b4148', flame: '#47b5fa'
  };
  var METAL = { Zn: '#a9b4bf', Cu: '#c8794a', Ag: '#dfe4ea', Mg: '#c9ced4', Fe: '#737a84', Ni: '#a2ab9f', Pb: '#6d7685', Al: '#c4cbd3', Pt: '#d3d7dc' };
  var TINT = {
    none: 'rgba(159,180,204,0.14)', blue: 'rgba(64,140,230,0.42)', palegreen: 'rgba(160,210,150,0.24)', green: 'rgba(80,190,120,0.36)',
    amber: 'rgba(230,170,60,0.36)', brown: 'rgba(170,100,40,0.50)', acid: 'rgba(159,180,204,0.18)', salt: 'rgba(159,180,204,0.16)',
    lemon: 'rgba(240,220,120,0.26)', water: 'rgba(159,180,204,0.10)', molten: 'rgba(240,200,150,0.30)', solid: '#4a5566', kno3: 'rgba(159,180,204,0.30)'
  };

  function el(tag, attrs, parent) {
    var n = document.createElementNS(NS, tag);
    for (var k in attrs) if (attrs[k] !== undefined && attrs[k] !== null) n.setAttribute(k, attrs[k]);
    if (parent) parent.appendChild(n);
    return n;
  }
  function text(parent, x, y, str, attrs) {
    var t = el('text', Object.assign({ x: x, y: y, fill: C.muted, 'font-size': 15, 'text-anchor': 'middle' }, attrs || {}), parent);
    t.textContent = str; return t;
  }
  function path(pts) { return pts.map(function (p, i) { return (i ? 'L' : 'M') + p[0] + ',' + p[1]; }).join(''); }

  /* ---------- Markers ---------- */
  function particle(parent, kind) {
    var g = el('g', { 'class': 'pt', 'aria-hidden': 'true' }, parent);
    if (kind === 'e') {
      el('circle', { r: 6.5, fill: C.electron }, g);
      el('path', { d: 'M-3.5,0H3.5', stroke: C.deep, 'stroke-width': 2 }, g);
    } else if (kind === 'cat' || kind === 'catS') {
      var r = kind === 'cat' ? 9 : 6.5;
      el('circle', { r: r, fill: C.cation }, g);
      el('path', { d: 'M-' + r * 0.5 + ',0H' + r * 0.5 + 'M0,-' + r * 0.5 + 'V' + r * 0.5, stroke: C.deep, 'stroke-width': 2.2 }, g);
    } else if (kind === 'an' || kind === 'anS') {
      var r2 = kind === 'an' ? 9 : 6.5;
      el('circle', { r: r2, fill: C.anion }, g);
      el('path', { d: 'M-' + r2 * 0.5 + ',0H' + r2 * 0.5, stroke: C.deep, 'stroke-width': 2.2 }, g);
    } else if (kind === 'bub' || kind === 'bubG') {
      el('circle', { r: 5, fill: kind === 'bubG' ? 'rgba(170,220,120,0.45)' : 'rgba(207,224,242,0.12)', stroke: kind === 'bubG' ? '#b9e27e' : '#cfe0f2', 'stroke-width': 1.3 }, g);
    } else if (kind === 'h2' || kind === 'o2') {
      var f = kind === 'h2' ? '#cfe0f2' : '#ff9b8a';
      el('circle', { cx: -5, r: kind === 'h2' ? 5 : 6.5, fill: f }, g); el('circle', { cx: 5, r: kind === 'h2' ? 5 : 6.5, fill: f }, g);
    } else if (kind === 'drop') {
      el('path', { d: 'M0,-7C4,-1 5,2 5,4A5,5 0 0 1 -5,4C-5,2 -4,-1 0,-7Z', fill: '#7fc4ff' }, g);
    } else if (kind === 'bead') {
      el('circle', { r: 4, fill: '#c4cbd3' }, g);
    } else if (kind === 'vap') {
      el('ellipse', { rx: 12, ry: 6, fill: 'rgba(190,110,50,0.55)' }, g);
    }
    return g;
  }
  // Chevron at (x, y) pointing along angle (deg).
  function chevron(parent, x, y, ang, colour) {
    return el('path', { d: 'M-6,-7L4,0L-6,7', fill: 'none', stroke: colour || C.electron, 'stroke-width': 3, 'stroke-linecap': 'round', 'stroke-linejoin': 'round',
      transform: 'translate(' + x + ',' + y + ') rotate(' + ang + ')', 'aria-hidden': 'true' }, parent);
  }

  /* A polyline with cumulative lengths, for placing markers by fraction. */
  function track(pts) {
    var segs = [], L = 0;
    for (var i = 1; i < pts.length; i++) {
      var dx = pts[i][0] - pts[i - 1][0], dy = pts[i][1] - pts[i - 1][1], l = Math.sqrt(dx * dx + dy * dy);
      segs.push({ a: pts[i - 1], dx: dx, dy: dy, l: l, s: L }); L += l;
    }
    return { segs: segs, L: L, at: function (f) {
      var d = f * L;
      for (var j = 0; j < segs.length; j++) { var s = segs[j]; if (d <= s.s + s.l || j === segs.length - 1) { var u = s.l ? (d - s.s) / s.l : 0; return [s.a[0] + s.dx * u, s.a[1] + s.dy * u]; } }
      return pts[0];
    } };
  }

  function Scene(svg) {
    this.svg = svg; this.movers = []; this.growers = []; this.t0 = 0;
  }
  Scene.prototype.clear = function () {
    while (this.svg.firstChild) this.svg.removeChild(this.svg.firstChild);
    this.movers = []; this.growers = [];
  };
  // n markers of `kind` travelling along pts; speed in px per second.
  Scene.prototype.flow = function (layer, pts, n, kind, o) {
    o = o || {};
    var tr = track(pts), els = [];
    for (var i = 0; i < n; i++) els.push(particle(layer, kind));
    this.movers.push({ els: els, tr: tr, rate: (o.speed || 60) / Math.max(1, tr.L), fade: o.fade, jitter: o.jitter || 0, off: o.offset || 0 });
  };
  Scene.prototype.tick = function (t) {
    this.movers.forEach(function (m) {
      var n = m.els.length;
      m.els.forEach(function (g, i) {
        var ph = ((t * m.rate + i / n + m.off) % 1 + 1) % 1, p = m.tr.at(ph);
        var x = p[0] + (m.jitter ? Math.sin(t * 2.1 + i * 1.7) * m.jitter : 0);
        g.setAttribute('transform', 'translate(' + x.toFixed(1) + ',' + p[1].toFixed(1) + ')');
        if (m.fade) g.setAttribute('opacity', Math.min(1, Math.sin(Math.PI * ph) * 1.6).toFixed(2));
      });
    });
    this.growers.forEach(function (gr) { gr(t); });
  };

  /* ---------- Shared parts ---------- */
  function beaker(g, x, y, w, h, liquidTop, fill, label) {
    el('rect', { x: x + 1.5, y: liquidTop, width: w - 3, height: y + h - liquidTop - 1.5, fill: fill }, g);
    el('path', { d: 'M' + (x - 6) + ',' + y + 'Q' + x + ',' + y + ' ' + x + ',' + (y + 8) + 'V' + (y + h - 6) + 'Q' + x + ',' + (y + h) + ' ' + (x + 6) + ',' + (y + h) +
      'H' + (x + w - 6) + 'Q' + (x + w) + ',' + (y + h) + ' ' + (x + w) + ',' + (y + h - 6) + 'V' + (y + 8) + 'Q' + (x + w) + ',' + y + ' ' + (x + w + 6) + ',' + y,
      fill: 'none', stroke: C.glass, 'stroke-width': 2, 'aria-label': label }, g);
    el('path', { d: 'M' + (x + 2) + ',' + liquidTop + 'H' + (x + w - 2), stroke: 'rgba(207,224,242,0.5)', 'stroke-width': 1.2 }, g);
  }
  function electrode(g, x, top, bottom, metal, w) {
    w = w || 28;
    if (metal === 'Pt') {
      el('rect', { x: x - 2, y: top, width: 4, height: bottom - top - 34, fill: METAL.Pt }, g);
      el('rect', { x: x - 13, y: bottom - 36, width: 26, height: 36, fill: METAL.Pt, stroke: '#9aa3ad', 'stroke-width': 1 }, g);
    } else if (metal === 'C') {
      el('rect', { x: x - w / 2, y: top, width: w, height: bottom - top, rx: 3, fill: C.graphite, stroke: '#5a626c', 'stroke-width': 1.2 }, g);
    } else {
      el('rect', { x: x - w / 2, y: top, width: w, height: bottom - top, rx: 2, fill: METAL[metal] || '#999', stroke: 'rgba(255,255,255,0.25)', 'stroke-width': 1 }, g);
    }
  }
  function wire(g, pts) { el('path', { d: path(pts), fill: 'none', stroke: C.wire, 'stroke-width': 3, 'stroke-linejoin': 'round' }, g); }
  function meter(g, o) {
    var x = 400, y = 34, w = 160, hgt = 92;
    el('rect', { x: x, y: y, width: w, height: hgt, rx: 12, fill: C.panel, stroke: '#3a4c63', 'stroke-width': 1.5 }, g);
    el('rect', { x: x + 12, y: y + 10, width: w - 24, height: 46, rx: 6, fill: C.deep, stroke: C.line }, g);
    var t = text(g, x + w / 2, y + 44, o.value, { fill: o.dim ? C.muted : C.text, 'font-size': 30, 'font-weight': 700, 'class': 'reading', id: 'meterText' });
    t.style.fontVariantNumeric = 'tabular-nums';
    var lc = o.leftLead === 'V' ? C.red : C.black, rc = o.leftLead === 'V' ? C.black : C.red;
    el('circle', { cx: 430, cy: 112, r: 7, fill: lc, stroke: C.glass, 'stroke-width': 1.2 }, g);
    el('circle', { cx: 530, cy: 112, r: 7, fill: rc, stroke: C.glass, 'stroke-width': 1.2 }, g);
    text(g, 446, 117, o.leftLead === 'V' ? 'V' : 'COM', { 'font-size': 11, 'text-anchor': 'start', 'class': 'minor' });
    text(g, 514, 117, o.leftLead === 'V' ? 'COM' : 'V', { 'font-size': 11, 'text-anchor': 'end', 'class': 'minor' });
  }
  function tag(g, x, y, lines, anchor, colour) {
    lines.forEach(function (ln, i) {
      // data-y0 / data-line let the page respace the lines when the text is enlarged for the board.
      text(g, x, y + i * 19, ln, { 'text-anchor': anchor, fill: i === 0 ? (colour || C.text) : C.muted, 'font-size': i === 0 ? 16 : 14, 'font-weight': i === 0 ? 700 : 500, 'class': i === 0 ? 'role' : 'role sub', 'data-y0': y, 'data-line': i });
    });
  }
  function signBadge(g, x, y, sign) {
    el('circle', { cx: x, cy: y, r: 13, fill: sign === '+' ? 'rgba(229,72,77,0.18)' : 'rgba(71,181,250,0.16)', stroke: sign === '+' ? C.red : C.blue, 'stroke-width': 1.5 }, g);
    el('path', { d: sign === '+' ? 'M' + (x - 6) + ',' + y + 'H' + (x + 6) + 'M' + x + ',' + (y - 6) + 'V' + (y + 6) : 'M' + (x - 6) + ',' + y + 'H' + (x + 6), stroke: C.text, 'stroke-width': 2.4 }, g);
  }
  // A warning across the bottom of the scene, wrapped to the scene's width.
  function banner(g, msg, y, cx, width) {
    if (!msg) return;
    cx = cx || 480; width = width || 880;
    var per = Math.floor((width - 40) / 8.4), words = msg.split(' '), lines = [''];
    words.forEach(function (w) { var l = lines[lines.length - 1]; if ((l + ' ' + w).trim().length > per) lines.push(w); else lines[lines.length - 1] = (l + ' ' + w).trim(); });
    var lh = 20, h = 14 + lines.length * lh, top = (y || 590) - h + 8;
    var w = Math.min(width, 40 + Math.max.apply(null, lines.map(function (l) { return l.length; })) * 8.4);
    el('rect', { x: cx - w / 2, y: top, width: w, height: h, rx: 8, fill: 'rgba(60,20,24,0.94)', stroke: C.bad, 'stroke-width': 1.2 }, g);
    lines.forEach(function (l, i) { text(g, cx, top + 21 + i * lh, l, { fill: '#ffd2cc', 'font-size': 15, 'font-weight': 600, 'class': 'banner' }); });
  }

  /* ---------- Galvanic: two half-cells ---------- */
  var G = { L: 220, R: 740, bw: 230, top: 262, bottom: 500, liq: 302, eTop: 186, eBot: 452, bridgeL: 318, bridgeR: 642, bridgeTop: 214 };
  function halfCell(g, hc, cx, conc, side, show) {
    var tint = hc ? TINT[hc.tint] || TINT.none : 'rgba(159,180,204,0.06)';
    beaker(g, cx - G.bw / 2, G.top, G.bw, G.bottom - G.top, G.liq, tint, hc ? hc.solution.name : 'empty beaker');
    if (!hc) { text(g, cx, 395, 'Choose a half-cell', { 'font-size': 16, fill: C.muted }); return; }
    var ex = cx + (side === 'left' ? -40 : 40);
    if (hc.gas) {
      // Standard hydrogen electrode: platinum in a glass sleeve, hydrogen bubbling over it.
      el('path', { d: 'M' + (ex - 22) + ',' + (G.eBot + 6) + 'V' + (G.eTop + 30) + 'H' + (ex + 22) + 'V' + (G.eBot + 6), fill: 'rgba(207,224,242,0.06)', stroke: C.glass, 'stroke-width': 1.6 }, g);
      el('path', { d: 'M' + (ex + 22) + ',' + (G.eTop + 52) + 'H' + (ex + 52), stroke: C.glass, 'stroke-width': 1.6, fill: 'none' }, g);
      text(g, ex + 56, G.eTop + 48, 'H₂(g), 100 kPa', { 'text-anchor': 'start', 'font-size': 13, 'class': 'minor' });
    }
    electrode(g, ex, G.eTop, G.eBot, hc.electrode);
    text(g, ex, G.eBot - 10 - (hc.electrode === 'Pt' ? 40 : 0), hc.electrode === 'Pt' ? 'Pt' : hc.symbol, { fill: hc.electrode === 'Pt' ? C.deep : '#0b1420', 'font-size': 14, 'font-weight': 700, 'class': 'minor' });
    var dy = show.board ? 30 : 0;
    if (hc.mismatch) { text(g, cx, 528, hc.mismatch, { fill: C.bad, 'font-size': 16, 'font-weight': 700 }); return ex; }
    text(g, cx, 528, E.coupleLabel(hc, 'uni') + (show.values ? '   E° = ' + E.signed(hc.E) + ' V' : ''), { fill: C.text, 'font-size': 17, 'font-weight': 700 });
    var c = conc && conc !== 1 ? conc : 1;
    text(g, cx, 551 + dy, (hc.electrode === 'Pt' ? 'Pt in ' : '') + E.uni(hc.ion) + '(aq), ' + (c < 0.1 ? c.toFixed(3) : c.toFixed(2)) + ' mol dm⁻³', { 'font-size': 14 });
    return ex;
  }

  Scene.prototype.galvanic = function (m) {
    var svg = this.svg, g = el('g', {}, svg), lay = { wire: el('g', {}, g), sol: el('g', {}, g), fx: el('g', {}, g), top: el('g', {}, g) };
    var show = Object.assign({ board: !!m.presenting }, m.show || {});
    var bdy = show.board ? 60 : 0;
    var xl = halfCell(lay.sol, m.left, G.L, m.concLeft, 'left', show);
    var xr = halfCell(lay.sol, m.right, G.R, m.concRight, 'right', show);
    var bridge = m.bridge || 'none', ionic = bridge === 'kno3' || bridge === 'kcl';
    var bridgePts = [[G.bridgeL, 440], [G.bridgeL, G.bridgeTop], [G.bridgeR, G.bridgeTop], [G.bridgeR, 440]];
    if (ionic) {
      el('path', { d: path(bridgePts), fill: 'none', stroke: C.glass, 'stroke-width': 30, 'stroke-linejoin': 'round' }, lay.sol);
      el('path', { d: path(bridgePts), fill: 'none', stroke: '#13202f', 'stroke-width': 26, 'stroke-linejoin': 'round' }, lay.sol);
      el('path', { d: path(bridgePts), fill: 'none', stroke: TINT.kno3, 'stroke-width': 26, 'stroke-linejoin': 'round' }, lay.sol);
      text(lay.top, 480, G.bridgeTop - 22, 'Salt bridge: ' + E.BRIDGES[bridge].short, { fill: C.text, 'font-size': 15, 'font-weight': 600 });
    } else if (bridge === 'wire') {
      el('path', { d: path(bridgePts), fill: 'none', stroke: METAL.Cu, 'stroke-width': 3, 'stroke-linejoin': 'round' }, lay.sol);
      text(lay.top, 480, G.bridgeTop - 14, 'Copper wire (not a salt bridge)', { fill: C.bad, 'font-size': 15, 'font-weight': 600 });
    }
    var cell = m.cell, on = m.connected && cell && cell.valid && m.circuitOk;
    // Wires to the meter.
    if (xl !== undefined && m.meter && m.wires !== false) wire(lay.wire, [[xl, G.eTop], [xl, 150], [430, 150], [430, 112]]);
    if (xr !== undefined && m.meter && m.wires !== false) wire(lay.wire, [[xr, G.eTop], [xr, 150], [530, 150], [530, 112]]);
    if (m.meter) meter(lay.top, { value: m.meterText, dim: !on, leftLead: m.vLead === 'right' ? 'COM' : 'V' });
    if (on) {
      var anLeft = cell.anode.id === m.left.id;
      var xa = anLeft ? xl : xr, xc = anLeft ? xr : xl, sa = anLeft ? 430 : 530, sc = anLeft ? 530 : 430;
      if (show.roles) {
        var la = anLeft ? 'left' : 'right';
        roleTags(lay.top, xa, la, ['Negative electrode', 'oxidation · anode'], '−');
        roleTags(lay.top, xc, la === 'left' ? 'right' : 'left', ['Positive electrode', 'reduction · cathode'], '+');
        text(lay.top, anLeft ? G.L : G.R, 575 + bdy, E.halfEquation(cell.anode, 'oxidation', 'uni'), { fill: C.blue, 'font-size': 15, 'font-weight': 600 });
        text(lay.top, anLeft ? G.R : G.L, 575 + bdy, E.halfEquation(cell.cathode, 'reduction', 'uni'), { fill: '#ff9b9e', 'font-size': 15, 'font-weight': 600 });
      }
      if (show.flow) {
        var ePts = [[xa, G.eTop + 6], [xa, 150], [sa, 150], [sa, 112], [sc, 112], [sc, 150], [xc, 150], [xc, G.eTop + 6]];
        this.flow(lay.fx, ePts, 16, 'e', { speed: 70 });
        // Direction chevrons and label on the top wire (shown whatever the motion setting).
        var dir = anLeft ? 0 : 180;
        chevron(lay.top, (xl + 430) / 2, 150, dir); chevron(lay.top, (xr + 530) / 2, 150, dir);
        text(lay.top, (xl + 430) / 2, 140, 'e⁻', { fill: C.electron, 'font-size': 16, 'font-weight': 700 });
        text(lay.top, (xr + 530) / 2, 140, 'e⁻', { fill: C.electron, 'font-size': 16, 'font-weight': 700 });
        // Salt bridge: anions towards the anode compartment, cations towards the cathode.
        var b = E.BRIDGES[bridge];
        var toCath = anLeft ? bridgePts : bridgePts.slice().reverse(), toAn = toCath.slice().reverse();
        this.flow(lay.fx, toCath, 5, 'catS', { speed: 26, fade: true });
        this.flow(lay.fx, toAn, 5, 'anS', { speed: 26, fade: true, offset: 0.1 });
        var cx = anLeft ? 0 : 180;
        chevron(lay.top, 400, G.bridgeTop, cx, C.cation); chevron(lay.top, 560, G.bridgeTop, cx + 180, C.anion);
        // Anions head for the anode compartment, cations for the cathode compartment.
        var leftIon = anLeft ? b.anion : b.cation, rightIon = anLeft ? b.cation : b.anion;
        text(lay.top, 468, G.bridgeTop + 34, '← ' + E.uni(leftIon), { 'text-anchor': 'end', fill: anLeft ? C.anion : C.cation, 'font-size': 15, 'font-weight': 700 });
        text(lay.top, 492, G.bridgeTop + 34, E.uni(rightIon) + ' →', { 'text-anchor': 'start', fill: anLeft ? C.cation : C.anion, 'font-size': 15, 'font-weight': 700 });
        // Ions at the electrodes, from each half-cell's own reaction.
        this.electrodeIons(lay.fx, xa, cell.bridge.anode, anLeft ? 1 : -1, cell.anode);
        this.electrodeIons(lay.fx, xc, cell.bridge.cathode, anLeft ? -1 : 1, cell.cathode);
        if (cell.anode.gas) this.flow(lay.fx, [[xa + (anLeft ? 0 : 0), G.eBot - 4], [xa, G.eTop + 60]], 4, 'bub', { speed: 30, fade: true, jitter: 6 });
        if (cell.cathode.gas) this.flow(lay.fx, [[xc - 14, G.eBot - 30], [xc - 14, G.eTop + 60]], 3, 'bub', { speed: 30, fade: true, jitter: 3 });
      }
    }
    banner(lay.top, m.message, 590);
  };
  function roleTags(g, x, side, lines, sign) {
    var tx = side === 'left' ? x - 30 : x + 30, anchor = side === 'left' ? 'end' : 'start';
    tag(g, tx, 214, lines, anchor, sign === '+' ? '#ff9b9e' : '#8fd0ff');
    signBadge(g, x, 172, sign);
  }
  // Ions made at an electrode drift away from it; ions used drift towards it.
  Scene.prototype.electrodeIons = function (layer, x, ch, outward, hc) {
    var self = this, metal = hc.electrode !== 'Pt';
    function lane(i, away) {
      var y = 340 + i * 38, x0 = x + outward * (metal ? 16 : 14), x1 = x + outward * 78;
      return away ? [[x0, y], [x1, y + 12]] : [[x1, y + 12], [x0, y]];
    }
    ch.made.forEach(function (t) { var k = E.atoms(t[0]).charge > 0 ? 'cat' : 'an'; for (var i = 0; i < 2; i++) self.flow(layer, lane(i * 2 + (k === 'an' ? 1 : 0), true), 1, k, { speed: 22, fade: true, offset: i * 0.45 }); });
    ch.used.forEach(function (t) { var k = E.atoms(t[0]).charge > 0 ? 'cat' : 'an'; for (var i = 0; i < 2; i++) self.flow(layer, lane(i * 2 + 1, false), 1, k, { speed: 22, fade: true, offset: 0.2 + i * 0.45 }); });
  };

  /* ---------- GCSE simple cell ---------- */
  var ELYTE_TINT = { nacl: TINT.salt, h2so4: TINT.acid, lemon: TINT.lemon, water: TINT.water };
  Scene.prototype.simple = function (m) {
    var g = el('g', {}, this.svg), lw = el('g', {}, g), ls = el('g', {}, g), fx = el('g', {}, g), top = el('g', {}, g);
    var x1 = 390, x2 = 570, el1 = E.METAL[m.m1], el2 = E.METAL[m.m2], elyte = E.ELECTROLYTE[m.electrolyte];
    beaker(ls, 290, 262, 380, 238, 312, elyte ? ELYTE_TINT[elyte.id] : 'rgba(159,180,204,0.04)', elyte ? elyte.name : 'empty beaker');
    if (el1) { electrode(ls, x1, 186, 452, el1.symbol, 30); text(top, x1 - 34, 290, el1.name, { 'text-anchor': 'end', fill: C.text, 'font-size': 17, 'font-weight': 700 }); }
    if (el2) { electrode(ls, x2, 186, 452, el2.symbol, 30); text(top, x2 + 34, 290, el2.name, { 'text-anchor': 'start', fill: C.text, 'font-size': 17, 'font-weight': 700 }); }
    text(top, 480, 530, elyte ? 'Electrolyte: ' + elyte.name : 'Choose an electrolyte', { fill: elyte ? C.text : C.muted, 'font-size': 16, 'font-weight': 600 });
    wire(lw, [[x1, 186], [x1, 150], [430, 150], [430, 112]]); wire(lw, [[x2, 186], [x2, 150], [530, 150], [530, 112]]);
    meter(top, { value: m.meterText, dim: !(m.connected && m.result && m.result.valid), leftLead: 'COM' });
    var r = m.result;
    if (m.connected && r && r.valid) {
      var negLeft = r.negative.id === m.m1, xn = negLeft ? x1 : x2, xp = negLeft ? x2 : x1;
      if (m.show.roles) {
        tag(top, negLeft ? x1 - 34 : x2 + 34, 316, ['negative (−)'], negLeft ? 'end' : 'start', '#8fd0ff');
        tag(top, negLeft ? x2 + 34 : x1 - 34, 316, ['positive (+)'], negLeft ? 'start' : 'end', '#ff9b9e');
        signBadge(top, xn, 172, '−'); signBadge(top, xp, 172, '+');
      }
      if (m.show.flow) {
        this.flow(fx, [[xn, 192], [xn, 150], [negLeft ? 430 : 530, 150], [negLeft ? 430 : 530, 112], [negLeft ? 530 : 430, 112], [negLeft ? 530 : 430, 150], [xp, 150], [xp, 192]], 12, 'e', { speed: 60 });
        chevron(top, (x1 + 430) / 2, 150, negLeft ? 0 : 180); chevron(top, (x2 + 530) / 2, 150, negLeft ? 0 : 180);
        text(top, (x1 + 430) / 2, 140, 'e⁻', { fill: C.electron, 'font-size': 16, 'font-weight': 700 });
        var out = negLeft ? 1 : -1;
        for (var i = 0; i < 3; i++) this.flow(fx, [[xn + out * 18, 350 + i * 40], [xn + out * 70, 362 + i * 40]], 1, 'cat', { speed: 18, fade: true, offset: i * 0.33 });
        if (r.electrolyte.acid) this.flow(fx, [[xp - out * 20, 440], [xp - out * 20, 318]], 5, 'bub', { speed: 34, fade: true, jitter: 4 });
      }
    }
    banner(top, m.message, 596, 480, 500);
  };

  /* ---------- GCSE batteries ---------- */
  Scene.prototype.battery = function (m) {
    var g = el('g', {}, this.svg), lw = el('g', {}, g), ls = el('g', {}, g), fx = el('g', {}, g), top = el('g', {}, g);
    var n = m.cells.length, cw = 150, gap = 40, total = n * cw + (n - 1) * gap, x0 = 480 - total / 2;
    var negM = E.METAL[m.neg], posM = E.METAL[m.pos], tint = ELYTE_TINT[m.electrolyte] || TINT.salt;
    var ends = [];
    m.cells.forEach(function (c, i) {
      var bx = x0 + i * (cw + gap), lx = bx + 42, rx = bx + cw - 42;
      beaker(ls, bx, 300, cw, 170, 336, tint, 'cell ' + (i + 1));
      var leftM = c.flipped ? posM : negM, rightM = c.flipped ? negM : posM;
      electrode(ls, lx, 250, 440, leftM.symbol, 22); electrode(ls, rx, 250, 440, rightM.symbol, 22);
      text(top, lx, 236, c.flipped ? '+' : '−', { fill: c.flipped ? '#ff9b9e' : '#8fd0ff', 'font-size': 22, 'font-weight': 800 });
      text(top, rx, 236, c.flipped ? '−' : '+', { fill: c.flipped ? '#8fd0ff' : '#ff9b9e', 'font-size': 22, 'font-weight': 800 });
      text(top, bx + cw / 2, 498, (m.presenting ? '' : 'Cell ' + (i + 1) + ': ') + (c.flipped ? '−' : '') + m.single.toFixed(2) + ' V', { fill: c.flipped ? C.bad : C.text, 'font-size': 16, 'font-weight': 700 });
      text(top, bx + cw / 2, 520, leftM.symbol + ' | ' + rightM.symbol + (c.flipped ? '  (turned round)' : ''), { fill: c.flipped ? C.bad : C.muted, 'font-size': 14, 'class': 'minor' });
      ends.push([lx, rx]);
      if (i > 0) wire(lw, [[ends[i - 1][1], 250], [ends[i - 1][1], 212], [lx, 212], [lx, 250]]);
    });
    var first = ends[0][0], last = ends[n - 1][1];
    wire(lw, [[first, 250], [first, 150], [430, 150], [430, 112]]); wire(lw, [[last, 250], [last, 150], [530, 150], [530, 112]]);
    meter(top, { value: m.meterText, dim: false, leftLead: 'COM' });
    text(top, 480, 560, n === 1 ? 'One cell' : 'A battery: ' + n + ' cells in series', { fill: C.text, 'font-size': 17, 'font-weight': 700 });
    if (m.flow && m.total !== 0) {
      // Electrons leave the battery's negative end, go round the outside, and
      // between cells pass from each cell's negative electrode to the next one's positive.
      var leftNeg = m.total > 0;
      var outer = [[first, 256], [first, 150], [430, 150], [430, 112], [530, 112], [530, 150], [last, 150], [last, 256]];
      this.flow(fx, leftNeg ? outer : outer.slice().reverse(), 12, 'e', { speed: 60 });
      chevron(top, (first + 430) / 2, 150, leftNeg ? 0 : 180);
      text(top, (first + 430) / 2, 140, 'e⁻', { fill: C.electron, 'font-size': 16, 'font-weight': 700 });
    }
  };

  /* ---------- GCSE electrolysis ---------- */
  Scene.prototype.electrolysis = function (m) {
    var g = el('g', {}, this.svg), lw = el('g', {}, g), ls = el('g', {}, g), fx = el('g', {}, g), top = el('g', {}, g);
    var c = m.compound, r = m.result, molten = c && c.state === 'l', solid = c && c.state === 's';
    var xc = 340, xa = 620, eTop = 170, eBot = 440, liq = molten || solid ? 340 : 300;
    // Power supply.
    el('rect', { x: 380, y: 34, width: 200, height: 76, rx: 10, fill: C.panel, stroke: m.supply ? C.electron : '#3a4c63', 'stroke-width': 1.5 }, top);
    text(top, 480, 64, 'd.c. power supply', { fill: C.text, 'font-size': 15, 'font-weight': 700 });
    text(top, 480, 86, m.supply ? 'on' : 'off', { fill: m.supply ? C.electron : C.muted, 'font-size': 14, 'font-weight': 600 });
    el('circle', { cx: 410, cy: 110, r: 8, fill: C.black, stroke: C.glass }, top); el('circle', { cx: 550, cy: 110, r: 8, fill: C.red, stroke: C.glass }, top);
    text(top, 394, 104, '−', { fill: '#8fd0ff', 'font-size': 22, 'font-weight': 800 }); text(top, 566, 104, '+', { fill: '#ff9b9e', 'font-size': 22, 'font-weight': 800 });
    wire(lw, [[410, 118], [410, 140], [xc, 140], [xc, eTop]]); wire(lw, [[550, 118], [550, 140], [xa, 140], [xa, eTop]]);
    // Vessel.
    if (molten || solid) {
      el('path', { d: 'M250,300L290,470H670L710,300', fill: 'none', stroke: C.glass, 'stroke-width': 2.4 }, ls);
      if (molten) el('path', { d: 'M260,' + liq + 'H700L670,468H290Z', fill: TINT.molten }, ls);
      else for (var k = 0; k < 18; k++) el('rect', { x: 300 + (k % 9) * 40 + (k > 8 ? 18 : 0), y: 430 - (k > 8 ? 26 : 0), width: 30, height: 22, rx: 4, fill: TINT.solid, stroke: '#647186' }, ls);
      el('path', { d: 'M230,482H730', stroke: C.muted, 'stroke-width': 3 }, ls);
      if (molten) {
        el('path', { d: 'M480,500C462,525 466,548 480,560C494,548 498,525 480,500Z', fill: 'none', stroke: C.flame, 'stroke-width': 2.4 }, ls);
        el('rect', { x: 468, y: 560, width: 24, height: 34, fill: '#56657a' }, ls);
        text(top, 520, 560, 'heat', { 'text-anchor': 'start', 'font-size': 14, 'class': 'minor' });
      }
    } else {
      beaker(ls, 230, 240, 500, 260, liq, c ? (c.formula === 'CuSO4' || c.formula === 'CuCl2' ? TINT.blue : TINT.salt) : 'rgba(159,180,204,0.05)', c ? c.name : 'empty beaker');
    }
    electrode(ls, xc, eTop, eBot, 'C', 24); electrode(ls, xa, eTop, eBot, 'C', 24);
    text(top, 480, 528 + (molten || solid ? 0 : 0), c ? (molten ? 'Molten ' : solid ? 'Solid ' : '') + c.name + (c.state === 'aq' ? ' solution' : '') + ', ' + E.uni(c.formula) + '(' + c.state + ')' : 'Choose an electrolyte',
      { fill: C.text, 'font-size': 16, 'font-weight': 700, y: molten || solid ? 520 : 528 });
    text(top, xc, 455 + 20, 'graphite', { 'font-size': 12, 'class': 'minor', y: eBot + 18 });
    if (m.show.roles) {
      tag(top, xc - 30, 200, ['Cathode (−)', 'reduction'], 'end', '#8fd0ff');
      tag(top, xa + 30, 200, ['Anode (+)', 'oxidation'], 'start', '#ff9b9e');
    }
    if (!(r && r.valid)) { banner(top, m.message, 596, 480, 620); return; }
    // Ions drift towards the oppositely charged electrode.
    var self = this, lanes = [330, 362, 394, 426].map(function (y) { return molten ? y + 18 : y; });
    r.ions.forEach(function (ion, i) {
      var pos = ion.sign === '+', water = ion.from === 'water', kind = pos ? (water ? 'catS' : 'cat') : (water ? 'anS' : 'an');
      var count = water ? 1 : 2;
      for (var j = 0; j < count; j++) {
        var y = lanes[(i + j * 2) % lanes.length] + (water ? 14 : 0);
        var from = pos ? xa - 30 : xc + 30, to = pos ? xc + 22 : xa - 22;
        self.flow(fx, [[from, y], [to, y + (j ? -6 : 6)]], 1, kind, { speed: water ? 26 : 34, fade: true, offset: (i * 0.23 + j * 0.5) % 1 });
      }
    });
    chevron(top, 450, lanes[0] - 22, 180, C.cation); text(top, 480, lanes[0] - 16, '+ ions', { fill: C.cation, 'font-size': 14, 'font-weight': 600, 'class': 'minor' });
    chevron(top, 510, lanes[3] + 30, 0, C.anion); text(top, 480, lanes[3] + 36, '− ions', { fill: C.anion, 'font-size': 14, 'font-weight': 600, 'class': 'minor' });
    // Electrons: from the anode to the + terminal, and from the − terminal to the cathode.
    this.flow(fx, [[xa, eTop + 4], [xa, 140], [550, 140], [550, 118]], 5, 'e', { speed: 55 });
    this.flow(fx, [[410, 118], [410, 140], [xc, 140], [xc, eTop + 4]], 5, 'e', { speed: 55 });
    chevron(top, (xa + 550) / 2, 140, 180); chevron(top, (410 + xc) / 2, 140, 180);
    text(top, (xa + 550) / 2, 130, 'e⁻', { fill: C.electron, 'font-size': 15, 'font-weight': 700 });
    text(top, (410 + xc) / 2, 130, 'e⁻', { fill: C.electron, 'font-size': 15, 'font-weight': 700 });
    // Products.
    this.product(fx, top, r.cathode, xc, eBot, liq, molten, -1);
    this.product(fx, top, r.anode, xa, eBot, liq, molten, 1);
  };
  Scene.prototype.product = function (fx, top, side, x, eBot, liq, molten, dir) {
    var p = side.product, info = side.info;
    var lx = x + dir * 30, anchor = dir > 0 ? 'start' : 'end';
    if (info.kind === 'gas') {
      this.flow(fx, [[x + dir * 16, eBot - 6], [x + dir * 16, liq + 8]], 6, p === 'Cl2' ? 'bubG' : 'bub', { speed: 40, fade: true, jitter: 3 });
      if (molten) this.flow(fx, [[x + dir * 30, liq - 6], [x + dir * 50, 200]], 3, p === 'Cl2' ? 'bubG' : 'bub', { speed: 24, fade: true });
    } else if (info.kind === 'metal' && info.st === 's') {
      var coat = el('rect', { x: x - 13, y: liq + 20, width: 26, height: eBot - liq - 18, rx: 3, fill: 'none', stroke: METAL[p] || '#c4cbd3', 'stroke-width': 0 }, fx);
      this.growers.push(function (t) { coat.setAttribute('stroke-width', Math.min(5, 0.6 + t * 0.25).toFixed(2)); });
    } else if (info.kind === 'metal') {
      var pool = el('ellipse', { cx: x, cy: 462, rx: 4, ry: 4, fill: METAL[p] || '#c4cbd3' }, fx);
      this.growers.push(function (t) { var w = Math.min(42, 6 + t * 2.4); pool.setAttribute('rx', w.toFixed(1)); pool.setAttribute('ry', Math.min(7, 3 + t * 0.3).toFixed(1)); });
      for (var i = 0; i < 3; i++) this.flow(fx, [[x - 6 + i * 6, eBot - 4], [x - 6 + i * 6, 458]], 1, 'bead', { speed: 14, offset: i * 0.33 });
    } else if (p === 'Br2') {
      if (molten) this.flow(fx, [[x + dir * 20, liq - 4], [x + dir * 70, 200]], 4, 'vap', { speed: 22, fade: true });
      else {
        var cloud = el('ellipse', { cx: x + dir * 30, cy: (liq + eBot) / 2 + 20, rx: 44, ry: 80, fill: 'rgba(200,110,40,0.0)' }, fx);
        this.growers.push(function (t) { cloud.setAttribute('fill', 'rgba(200,110,40,' + Math.min(0.42, t * 0.03).toFixed(3) + ')'); });
      }
    }
    if (side.process) text(top, lx, liq - 16 + (molten ? -4 : 0), info.name, { 'text-anchor': anchor, fill: C.text, 'font-size': 16, 'font-weight': 700, 'class': 'prod' });
  };

  /* ---------- GCSE hydrogen fuel cell ---------- */
  Scene.prototype.fuel = function (m) {
    var g = el('g', {}, this.svg), lw = el('g', {}, g), ls = el('g', {}, g), fx = el('g', {}, g), top = el('g', {}, g);
    var r = m.result, alk = r.electrolyte === 'alkaline';
    var nX = 340, pX = 620;
    el('rect', { x: 250, y: 250, width: 460, height: 220, rx: 12, fill: 'rgba(13,25,40,0.9)', stroke: C.glass, 'stroke-width': 2 }, ls);
    el('rect', { x: nX + 10, y: 252, width: pX - nX - 20, height: 216, fill: alk ? 'rgba(160,190,230,0.20)' : 'rgba(159,180,204,0.12)' }, ls);
    [nX, pX].forEach(function (x) {
      el('rect', { x: x - 10, y: 252, width: 20, height: 216, fill: C.graphite, stroke: '#5a626c' }, ls);
      for (var k = 0; k < 9; k++) el('circle', { cx: x + (k % 2 ? 3 : -3), cy: 268 + k * 22, r: 2.2, fill: '#202630' }, ls);
    });
    text(top, 480, 300, alk ? 'Electrolyte: potassium hydroxide' : 'Electrolyte: acidic membrane', { fill: C.text, 'font-size': 15, 'font-weight': 600 });
    // Gas inlets.
    el('path', { d: 'M120,300H250', stroke: C.glass, 'stroke-width': 14, fill: 'none' }, ls); el('path', { d: 'M120,300H250', stroke: '#0b1522', 'stroke-width': 10, fill: 'none' }, ls);
    el('path', { d: 'M710,300H840', stroke: C.glass, 'stroke-width': 14, fill: 'none' }, ls); el('path', { d: 'M710,300H840', stroke: '#0b1522', 'stroke-width': 10, fill: 'none' }, ls);
    text(top, 140, 280, 'hydrogen in', { 'text-anchor': 'start', fill: m.h2 ? C.text : C.muted, 'font-size': 15, 'font-weight': 600 });
    text(top, 820, 280, 'oxygen (air) in', { 'text-anchor': 'end', fill: m.o2 ? C.text : C.muted, 'font-size': 15, 'font-weight': 600 });
    if (m.h2) this.flow(fx, [[120, 300], [255, 300], [300, 340], [nX - 14, 380]], 4, 'h2', { speed: 40 });
    if (m.o2) this.flow(fx, [[840, 300], [705, 300], [660, 340], [pX + 14, 380]], 3, 'o2', { speed: 34 });
    // Water out at the electrode where it forms.
    var wx = r.water === 'positive' ? 665 : 295;
    el('path', { d: 'M' + wx + ',470V540', stroke: C.glass, 'stroke-width': 14, fill: 'none' }, ls); el('path', { d: 'M' + wx + ',470V540', stroke: '#0b1522', 'stroke-width': 10, fill: 'none' }, ls);
    text(top, wx + (r.water === 'positive' ? 20 : -20), 530, 'water out', { 'text-anchor': r.water === 'positive' ? 'start' : 'end', fill: r.running ? C.text : C.muted, 'font-size': 15, 'font-weight': 600 });
    // External circuit with a lamp.
    wire(lw, [[nX, 250], [nX, 140], [454, 140]]); wire(lw, [[506, 140], [pX, 140], [pX, 250]]);
    el('circle', { cx: 480, cy: 140, r: 26, fill: r.running ? 'rgba(242,201,76,0.85)' : C.panel, stroke: C.glass, 'stroke-width': 2 }, top);
    el('path', { d: 'M466,150Q473,128 480,150Q487,128 494,150', fill: 'none', stroke: r.running ? '#6b4e00' : C.muted, 'stroke-width': 2 }, top);
    text(top, 480, 96, r.running ? 'lamp on' : 'lamp off', { fill: r.running ? C.electron : C.muted, 'font-size': 15, 'font-weight': 600 });
    tag(top, nX - 22, 220, ['Negative (−)', 'hydrogen oxidised'], 'end', '#8fd0ff');
    tag(top, pX + 22, 220, ['Positive (+)', 'oxygen reduced'], 'start', '#ff9b9e');
    if (r.running) {
      if (m.flow) {
        this.flow(fx, [[nX, 246], [nX, 140], [pX, 140], [pX, 246]], 12, 'e', { speed: 60 });
        chevron(top, 400, 140, 0); chevron(top, 560, 140, 0);
        text(top, 400, 128, 'e⁻', { fill: C.electron, 'font-size': 16, 'font-weight': 700 });
        var ionKind = alk ? 'an' : 'cat', a = [nX + 16, 0], b = [pX - 16, 0];
        for (var i = 0; i < 3; i++) {
          var y = 340 + i * 38, p1 = [a[0], y], p2 = [b[0], y + 8];
          this.flow(fx, alk ? [p2, p1] : [p1, p2], 2, ionKind, { speed: 34, fade: true, offset: i * 0.3 });
        }
        chevron(top, 480, 455, alk ? 180 : 0, alk ? C.anion : C.cation);
        text(top, 480, 444, alk ? 'OH⁻ ions move to the negative electrode' : 'H⁺ ions move to the positive electrode', { fill: C.text, 'font-size': 14, 'font-weight': 600 });
        this.flow(fx, [[wx, 476], [wx, 560]], 3, 'drop', { speed: 30, fade: true });
      }
    } else banner(top, r.why, 600, 480, 760);
  };

  var VIEW = { galvanic: '0 0 960 600', simple: '220 14 520 586', battery: '0 0 960 600', electrolysis: '150 14 660 586', fuel: '80 44 800 560' };
  // On the board labels are enlarged to the presenter floor, so the drawing gets room round its edges.
  var VIEW_BOARD = { galvanic: '-170 0 1300 640', simple: '100 14 760 600', battery: '-60 0 1080 600', electrolysis: '40 14 880 600', fuel: '0 40 960 590' };
  Scene.prototype.draw = function (m) {
    this.clear();
    this.svg.setAttribute('viewBox', (m && (m.viewBox || (m.presenting ? VIEW_BOARD : VIEW)[m.type])) || VIEW.galvanic);
    this.board = !!(m && m.presenting);
    if (m && this[m.type]) this[m.type](m);
    this.svg.setAttribute('aria-label', m && m.label ? m.label : 'Cell diagram');
  };

  root.CellScene = { create: function (svg) { return new Scene(svg); }, COLOURS: C };
})(typeof self !== 'undefined' ? self : this);
