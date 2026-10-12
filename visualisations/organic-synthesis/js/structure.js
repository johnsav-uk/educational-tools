/* Organic Synthesis Pathways: molecular structures.

   Pure functions. A SMILES string from data.js is read into a small molecule
   graph (SMILES reader ported from molecule-builder-iupac, which is left
   untouched), laid out in 2D and drawn as inline SVG. The layout is a simpler
   cousin of the builder's: a zig-zag chain with 120° branches for skeletal
   formulae, a straight chain with every H for displayed formulae, hexagons for
   benzene rings. Colours come from CSS classes (synthesis.css), so the light and
   dark themes need no repaint.

     Structure.svg(molId, style, { size })   style: 'displayed' | 'skeletal' | 'structural'
     Structure.layout(molId, style)          geometry, for the tests
     Structure.groups(smiles)                functional groups detected from the structure
     Structure.formulaOf(smiles)             atom counts from the structure                        */
(function (root, factory) {
  var D = (typeof module === 'object' && module.exports) ? require('./data.js') : root.SYNTH_DATA;
  var api = factory(D);
  if (typeof module === 'object' && module.exports) module.exports = api;
  root.Structure = api;
})(typeof self !== 'undefined' ? self : this, function (D) {
  'use strict';

  var VAL = { C: 4, N: 3, O: 2, Cl: 1, Br: 1, I: 1, F: 1, NO2: 1 };
  var HALOGENS = { Cl: 1, Br: 1, I: 1, F: 1 };
  var SUBS = '₀₁₂₃₄₅₆₇₈₉';
  function sub(n) { return String(n).replace(/\d/g, function (d) { return SUBS[+d]; }); }

  /* ---------- SMILES reader ---------- */
  function readSmiles(s) {
    var atoms = [], bonds = [], stack = [], rings = {}, prev = null, bo = null, i = 0;
    while (i < s.length) {
      var ch = s[i];
      if (ch === '(') { stack.push(prev); i++; continue; }
      if (ch === ')') { prev = stack.pop(); i++; continue; }
      if (ch === '=') { bo = 2; i++; continue; }
      if (ch === '#') { bo = 3; i++; continue; }
      if (ch === '/' || ch === '\\') { i++; continue; }
      if (/[0-9]/.test(ch)) {
        if (rings[ch] !== undefined) { var r = rings[ch]; bonds.push({ a: r.atom, b: prev, o: bo || r.bo || (atoms[r.atom].arom && atoms[prev].arom ? 1.5 : 1) }); delete rings[ch]; }
        else rings[ch] = { atom: prev, bo: bo };
        bo = null; i++; continue;
      }
      var el = null, arom = false;
      if (s.indexOf('Cl', i) === i) { el = 'Cl'; i += 2; } else if (s.indexOf('Br', i) === i) { el = 'Br'; i += 2; }
      else if ('CNOFI'.indexOf(ch) >= 0) { el = ch; i++; } else if ('cno'.indexOf(ch) >= 0) { el = ch.toUpperCase(); arom = true; i++; }
      else { i++; continue; }
      atoms.push({ el: el, arom: arom });
      var idx = atoms.length - 1;
      if (prev !== null) bonds.push({ a: prev, b: idx, o: bo || (arom && atoms[prev].arom ? 1.5 : 1) });
      prev = idx; bo = null;
    }
    return { atoms: atoms, bonds: bonds };
  }

  // Build a graph: neighbours, implicit hydrogens, nitro groups collapsed to one NO₂ atom.
  function build(smiles) {
    var p = readSmiles(smiles), n = p.atoms.length, nb = p.atoms.map(function () { return []; });
    p.bonds.forEach(function (b) { nb[b.a].push({ j: b.b, o: b.o }); nb[b.b].push({ j: b.a, o: b.o }); });
    var drop = {};
    p.atoms.forEach(function (a, i) {
      if (a.el !== 'N') return;
      var os = nb[i].filter(function (x) { return p.atoms[x.j].el === 'O' && x.o === 2 && nb[x.j].length === 1; });
      if (os.length === 2 && nb[i].length === 3) { a.el = 'NO2'; os.forEach(function (x) { drop[x.j] = 1; }); }
    });
    var map = {}, atoms = [], k = 0;
    p.atoms.forEach(function (a, i) { if (!drop[i]) { map[i] = k++; atoms.push({ el: a.el, arom: a.arom }); } });
    var bonds = p.bonds.filter(function (b) { return !drop[b.a] && !drop[b.b]; }).map(function (b) { return { a: map[b.a], b: map[b.b], o: b.o }; });
    var g = { atoms: atoms, bonds: bonds, nb: atoms.map(function () { return []; }) };
    bonds.forEach(function (b) { g.nb[b.a].push({ j: b.b, o: b.o }); g.nb[b.b].push({ j: b.a, o: b.o }); });
    atoms.forEach(function (a, i) {
      var sum = 0; g.nb[i].forEach(function (x) { sum += x.o; });
      a.h = Math.max(0, Math.round(VAL[a.el] - sum));
    });
    // Ring atoms: whatever is left after repeatedly pruning atoms with one neighbour.
    var deg = g.nb.map(function (l) { return l.length; }), alive = atoms.map(function () { return true; }), changed = true;
    while (changed) {
      changed = false;
      for (var i = 0; i < atoms.length; i++) if (alive[i] && deg[i] <= 1) {
        alive[i] = false; changed = true;
        g.nb[i].forEach(function (x) { if (alive[x.j]) deg[x.j]--; });
      }
    }
    g.ringAtoms = atoms.map(function (a, i) { return alive[i]; });
    var start = g.ringAtoms.indexOf(true);
    g.ring = null;
    if (start >= 0) {   // walk the single ring
      var order = [start], prevA = -1, cur = start;
      for (;;) {
        var nx = g.nb[cur].filter(function (x) { return g.ringAtoms[x.j] && x.j !== prevA; })[0];
        if (!nx || nx.j === start) break;
        order.push(nx.j); prevA = cur; cur = nx.j;
        if (order.length > 12) break;
      }
      g.ring = order;
    }
    return g;
  }

  /* ---------- Functional groups, detected from the structure ---------- */
  function groups(smiles) {
    var g = build(smiles), out = {}, A = g.atoms;
    function el(i) { return A[i].el; }
    function carbonyl(i) { return el(i) === 'C' && g.nb[i].some(function (x) { return x.o === 2 && el(x.j) === 'O'; }); }
    function cNeighbours(i) { return g.nb[i].filter(function (x) { return el(x.j) === 'C'; }).length; }
    function hasH(i) { return A[i].h > 0; }
    if (g.ring) { out.arylring = 1; if (g.ring.length === 6 && A.length === 6) out.benzene = 1; }
    var heteroOrUnsat = false;
    A.forEach(function (a, i) {
      if (a.el === 'NO2') out.nitro = 1;
      g.nb[i].forEach(function (x) { if (x.j < i) return;
        var p = a.el, q = el(x.j);
        if (x.o === 2 && p === 'C' && q === 'C') { out.alkene = 1; }
        if (x.o === 3 && ((p === 'C' && q === 'N') || (p === 'N' && q === 'C'))) out.nitrile = 1;
      });
      if (a.el === 'C' && !a.arom && g.nb[i].some(function (x) { return HALOGENS[el(x.j)] && !carbonyl(i); })) out.halo = 1;
      if (a.el === 'O' && a.h === 1) {
        var c = g.nb[i].filter(function (x) { return el(x.j) === 'C'; })[0];
        if (c && carbonyl(c.j)) out.acid = 1;
        else if (c) { var k = cNeighbours(c.j); out[k <= 1 ? 'alcohol1' : k === 2 ? 'alcohol2' : 'alcohol3'] = 1; }
      }
      if (a.el === 'C' && carbonyl(i)) {
        var others = g.nb[i].filter(function (x) { return !(x.o === 2 && el(x.j) === 'O'); });
        var kinds = others.map(function (x) { return el(x.j) + (el(x.j) === 'O' ? (A[x.j].h ? 'H' : g.nb[x.j].length === 2 ? 'R' : '') : ''); });
        if (kinds.indexOf('Cl') >= 0) out.acylCl = 1;
        else if (kinds.indexOf('N') >= 0) out.amide = 1;
        else if (kinds.indexOf('OR') >= 0) {
          var oo = others.filter(function (x) { return el(x.j) === 'O'; })[0];
          var far = g.nb[oo.j].filter(function (x) { return x.j !== i; })[0];
          if (far && carbonyl(far.j)) out.anhydride = 1; else out.ester = 1;
        } else if (kinds.indexOf('OH') < 0) {
          if (a.h >= 1) out.aldehyde = 1; else out.ketone = 1;
        }
      }
      if (a.el === 'N' && a.h >= 1) {
        var cs = g.nb[i].filter(function (x) { return el(x.j) === 'C'; });
        if (cs.length && !cs.some(function (x) { return carbonyl(x.j); })) {
          if (cs.length === 1 && a.h === 2) out[A[cs[0].j].arom ? 'arylamine' : 'amine1'] = 1;
          else if (cs.length === 2 && a.h === 1) out.amine2 = 1;
        }
      }
    });
    var hetero = A.some(function (a) { return a.el !== 'C'; }), unsat = g.bonds.some(function (b) { return b.o > 1; });
    if (!hetero && !unsat && !g.ring) out.alkane = 1;
    return Object.keys(out).sort();
  }

  function formulaOf(smiles) {
    var g = build(smiles), c = {};
    g.atoms.forEach(function (a) {
      if (a.el === 'NO2') { c.N = (c.N || 0) + 1; c.O = (c.O || 0) + 2; } else c[a.el] = (c[a.el] || 0) + 1;
      if (a.h) c.H = (c.H || 0) + a.h;
    });
    return c;
  }

  /* ---------- Layout ---------- */
  var L = 1;                       // bond length in layout units
  function rot(v, deg) { var r = deg * Math.PI / 180, c = Math.cos(r), s = Math.sin(r); return [v[0] * c - v[1] * s, v[0] * s + v[1] * c]; }
  function dist(a, b) { return Math.hypot(a[0] - b[0], a[1] - b[1]); }
  function angDiff(a, b) { var d = Math.abs(a - b) % (2 * Math.PI); return d > Math.PI ? 2 * Math.PI - d : d; }

  function layoutGraph(g, style, stereo) {
    var n = g.atoms.length, pos = new Array(n), parentOf = new Array(n), displayed = style === 'displayed';
    var ringSet = {}; if (g.ring) g.ring.forEach(function (i) { ringSet[i] = 1; });
    var ringNode = g.ring ? -1 : null;
    var placedRing = false, ringCenter = null;

    // Subtree weights over the tree with the ring contracted (ring = 6).
    function weight(i, from) {
      var w = ringSet[i] ? 6 : 1, st = ringSet[i] ? [] : g.nb[i];
      st.forEach(function (x) { if (x.j !== from && !ringSet[i]) w += weight(x.j, i); });
      return w;
    }
    function kidsOf(i, from) {
      return g.nb[i].filter(function (x) { return x.j !== from && !(ringSet[i] && ringSet[x.j]); })
        .map(function (x) { return x.j; }).sort(function (a, b) { return weight(b, i) - weight(a, i); });
    }
    // Contracted-graph neighbours, to choose the root: the far end of the longest path.
    function cn(i) {
      if (ringSet[i]) { var out = []; g.ring.forEach(function (r) { g.nb[r].forEach(function (x) { if (!ringSet[x.j]) out.push(x.j); }); }); return out; }
      return g.nb[i].map(function (x) { return ringSet[x.j] ? g.ring[0] : x.j; });
    }
    function far(s) {
      var d = {}, q = [s]; d[s] = 0;
      while (q.length) { var c = q.shift(); cn(c).forEach(function (j) { if (d[j] === undefined) { d[j] = d[c] + 1; q.push(j); } }); }
      var maxd = 0, k; for (k in d) maxd = Math.max(maxd, d[k]);
      var ends = Object.keys(d).filter(function (k2) { return d[k2] === maxd; }).map(Number);
      // Prefer a carbon end joined by a single bond (a methyl), never a terminal =O, as the place to start drawing.
      function score(i) { var a = g.atoms[i]; if (ringSet[i]) return 1; var dbl = g.nb[i].some(function (x) { return x.o > 1; }); return (a.el === 'C' ? 0 : 2) + (dbl ? 2 : 0); }
      ends.sort(function (a, b) { return score(a) - score(b) || a - b; });
      return ends[0];
    }
    var first = g.ring ? g.ring[0] : 0, end1 = far(first), end2 = far(end1), root;
    if (n === 1) root = 0;
    else if (g.ring && (ringSet[end1] || ringSet[end2])) root = g.ring[0];
    else root = end2;
    // Rooting the ring at the attached vertex: make sure the root ring atom is the substituted one.
    if (g.ring && ringSet[root]) {
      var sub = g.ring.filter(function (r) { return g.nb[r].some(function (x) { return !ringSet[x.j]; }); })[0];
      if (sub !== undefined) root = sub;
    }

    function placeRing(attach, dir) {   // attach: ring atom that bonds to the previous atom, at pos[attach]
      var R = 1 / (2 * Math.sin(Math.PI / 6)), ap = pos[attach], c = [ap[0] + dir[0] * R, ap[1] + dir[1] * R];
      var a0 = Math.atan2(ap[1] - c[1], ap[0] - c[0]), i0 = g.ring.indexOf(attach), N = g.ring.length;
      for (var k = 1; k < N; k++) { var id = g.ring[(i0 + k) % N], t = a0 + k * 2 * Math.PI / N; pos[id] = [c[0] + R * Math.cos(t), c[1] + R * Math.sin(t)]; parentOf[id] = attach; }
      ringCenter = c;
    }
    var turn = {};
    function occupancyScore(p) { var m = 99; pos.forEach(function (q) { if (q) m = Math.min(m, dist(p, q)); }); return m; }

    function place(i, from, dirIn) {
      if (ringSet[i] && ringCenter && from !== null && !ringSet[from]) return;
      var kids = kidsOf(i, from);
      if (!kids.length) return;
      var t = turn[i] || 1, u = dirIn, dirs;
      if (ringSet[i]) {      // substituent leaves a ring atom radially
        var out = [pos[i][0] - ringCenter[0], pos[i][1] - ringCenter[1]], len = Math.hypot(out[0], out[1]);
        dirs = [[out[0] / len, out[1] / len]];
      } else if (displayed) {
        var side = [rot(u, 90), rot(u, -90)];
        if (from === null) dirs = kids.map(function (_, k) { return k === 0 ? u : (k === 1 ? side[0] : (k === 2 ? side[1] : rot(u, 180))); });
        else {
          var linear = g.nb[i].some(function (x) { return x.o === 3; }) || g.nb[i].filter(function (x) { return x.o === 2; }).length === 2;
          dirs = [u];
          if (kids.length > 1) {
            var best = side.map(function (s) { return occupancyScore([pos[i][0] + s[0], pos[i][1] + s[1]]); });
            var order = best[1] > best[0] + 1e-6 ? [side[1], side[0]] : [side[0], side[1]];
            dirs.push(order[0]); if (kids.length > 2) dirs.push(order[1]);
          }
          if (linear) dirs = [u];
        }
      } else {
        var lin = g.nb[i].some(function (x) { return x.o === 3; }) || g.nb[i].filter(function (x) { return x.o === 2; }).length === 2;
        if (from === null) {
          var k = kids.length;
          dirs = k === 1 ? [u] : k === 2 ? [rot(u, -60), rot(u, 60)] : k === 3 ? [rot(u, -120), u, rot(u, 120)] : kids.map(function (_, q) { return rot(u, q * 360 / k); });
        } else if (lin) dirs = [u];
        else if (kids.length === 1) dirs = [rot(u, -t * 60)];
        else if (kids.length === 2) dirs = [rot(u, -t * 60), rot(u, t * 60)];
        else dirs = [rot(u, -t * 60), u, rot(u, t * 60)];
      }
      kids.forEach(function (j, k) {
        var d = dirs[k] || dirs[dirs.length - 1];
        pos[j] = [pos[i][0] + d[0] * L, pos[i][1] + d[1] * L]; parentOf[j] = i;
        turn[j] = (kids.length === 1 || k === 0) ? -t : t;
        if (ringSet[j]) placeRing(j, d);
        place(j, i, d);
      });
    }

    var dir0 = displayed ? [1, 0] : [Math.cos(Math.PI / 6), Math.sin(Math.PI / 6)];
    if (stereo && n >= 4) {
      // A C=C with one group on each carbon: 120° geometry so the E / Z arrangement shows.
      var cc = g.bonds.filter(function (b) { return b.o === 2 && g.atoms[b.a].el === 'C' && g.atoms[b.b].el === 'C'; })[0];
      var c2 = cc.a, c3 = cc.b;
      var s2 = g.nb[c2].filter(function (x) { return x.j !== c3; })[0].j, s3 = g.nb[c3].filter(function (x) { return x.j !== c2; })[0].j;
      pos[c2] = [0, 0]; pos[c3] = [1, 0];
      pos[s2] = [-0.5, 0.866]; pos[s3] = [1.5, stereo === 'E' ? -0.866 : 0.866];
      [[s2, c2, -1], [s3, c3, 1]].forEach(function (tr) {
        var s = tr[0], c = tr[1];
        g.nb[s].forEach(function (x) { if (x.j !== c) { var d = rot([pos[s][0] - pos[c][0], pos[s][1] - pos[c][1]], 0); pos[x.j] = [pos[s][0] + d[0] * 0.7, pos[s][1] + d[1] * 0.7]; } });
      });
    } else if (g.ring && ringSet[root]) {
      var R = 1 / (2 * Math.sin(Math.PI / 6)), N = g.ring.length, i0 = g.ring.indexOf(root);
      ringCenter = [0, 0];
      for (var k = 0; k < N; k++) { var id = g.ring[(i0 + k) % N], t = k * 2 * Math.PI / N; pos[id] = [R * Math.cos(t), R * Math.sin(t)]; }
      parentOf[root] = null;
      // Place the substituent east of the root vertex, then carry on along the chain.
      var subst = g.nb[root].filter(function (x) { return !ringSet[x.j]; });
      subst.forEach(function (x) { pos[x.j] = [pos[root][0] + L, pos[root][1]]; parentOf[x.j] = root; turn[x.j] = 1; });
      subst.forEach(function (x) { place(x.j, root, [1, 0]); });
    } else {
      // Skeletal chains start at 30° below the horizontal and turn up first, so they zig-zag along the horizontal (30°, −30°, 30° …).
      pos[root] = [0, 0]; turn[root] = displayed ? 1 : -1; parentOf[root] = null;
      place(root, null, dir0);
    }

    // Lay out hydrogens (displayed: all of them; skeletal: only the aldehyde H).
    var hs = [];     // { of, pos }
    if (stereo && displayed) {
      var cc2 = g.bonds.filter(function (b) { return b.o === 2 && g.atoms[b.a].el === 'C' && g.atoms[b.b].el === 'C'; })[0];
      [cc2.a, cc2.b].forEach(function (c) { var sb = g.nb[c].filter(function (x) { return x.o === 1; })[0].j; hs.push({ of: c, pos: [pos[c][0] + (pos[c][0] < 0.5 ? -0.5 : 0.5), pos[c][1] - (pos[sb][1] - pos[c][1])] }); });
    }
    function atomDirs(i) {
      var out = [];
      g.nb[i].forEach(function (x) { if (pos[x.j]) out.push(Math.atan2(pos[x.j][1] - pos[i][1], pos[x.j][0] - pos[i][0])); });
      hs.forEach(function (h) { if (h.of === i) out.push(Math.atan2(h.pos[1] - pos[i][1], h.pos[0] - pos[i][0])); });
      return out;
    }
    function allPoints() { var pts = []; pos.forEach(function (p) { if (p) pts.push(p); }); hs.forEach(function (h) { pts.push(h.pos); }); return pts; }
    function putH(i, radial) {
      var existing = atomDirs(i), pts = allPoints(), best = null, bestScore = -1e9, cand = [];
      if (radial) cand = [Math.atan2(pos[i][1] - ringCenter[1], pos[i][0] - ringCenter[0])];
      else for (var deg = 0; deg < 360; deg += 15) cand.push(deg * Math.PI / 180);
      cand.forEach(function (a) {
        if (existing.some(function (e) { return angDiff(e, a) < 0.62; })) return;       // keep ~35° from other bonds
        var p = [pos[i][0] + Math.cos(a) * L, pos[i][1] + Math.sin(a) * L], m = 99;
        pts.forEach(function (q) { if (q !== pos[i]) m = Math.min(m, dist(p, q)); });
        var deg2 = Math.round(a * 180 / Math.PI + 720) % 360, bonus = deg2 % 90 === 0 ? 0.3 : deg2 % 45 === 0 ? 0.15 : 0;
        var s = Math.min(m, 1.6) + (displayed || radial ? bonus : 0);
        if (s > bestScore) { bestScore = s; best = p; }
      });
      if (!best) best = [pos[i][0] + L, pos[i][1] - L * 0.5];
      hs.push({ of: i, pos: best });
    }
    if (displayed) {
      // Heavy atoms with the fewest free directions first.
      var idxs = []; for (var q = 0; q < n; q++) idxs.push(q);
      idxs.sort(function (a, b) { return (g.nb[b].length + (ringSet[b] ? 3 : 0)) - (g.nb[a].length + (ringSet[a] ? 3 : 0)); });
      idxs.forEach(function (i) { var have = hs.filter(function (x) { return x.of === i; }).length; for (var h = have; h < g.atoms[i].h; h++) putH(i, !!ringSet[i]); });
    } else {
      g.atoms.forEach(function (a, i) {
        if (a.el === 'C' && a.h === 1 && g.nb[i].some(function (x) { return x.o === 2 && g.atoms[x.j].el === 'O'; }) && g.nb[i].length === 2) putH(i, false);   // aldehyde C–H
      });
    }
    return { pos: pos, hs: hs, ringCenter: ringCenter, ringR: 1 / (2 * Math.sin(Math.PI / 6)) };
  }

  /* ---------- Geometry for drawing ---------- */
  var geoCache = {};
  function geometry(molId, style) {
    var key = molId + '|' + style;
    if (geoCache[key]) return geoCache[key];
    var m = D.MOLS[molId], g = build(m.smiles), lay = layoutGraph(g, style, m.stereo), atoms = [], bonds = [];
    g.atoms.forEach(function (a, i) {
      var label = null, ring = !!(g.ringAtoms[i]);
      if (style === 'displayed') label = a.el === 'NO2' ? 'NO₂' : (ring ? null : a.el);
      else if (a.el !== 'C') {
        label = a.el === 'NO2' ? 'NO₂' : a.el + (a.h ? (a.h === 1 ? 'H' : 'H' + sub(a.h)) : '');
        if (a.el === 'O' && a.h === 0) label = 'O';
      }
      atoms.push({ i: i, x: lay.pos[i][0], y: lay.pos[i][1], el: a.el, label: label, ring: ring, h: a.h });
    });
    g.bonds.forEach(function (b) { bonds.push({ a: b.a, b: b.b, o: b.o, ring: !!(g.ringAtoms[b.a] && g.ringAtoms[b.b]) }); });
    lay.hs.forEach(function (h) { atoms.push({ i: atoms.length, x: h.pos[0], y: h.pos[1], el: 'H', label: 'H', ring: false, h: 0, hOf: h.of }); bonds.push({ a: h.of, b: atoms.length - 1, o: 1, ring: false }); });
    // Hydrogens written inside a skeletal label are not separate atoms. Drawn rings get a circle.
    var geo = { atoms: atoms, bonds: bonds, ring: lay.ringCenter ? { x: lay.ringCenter[0], y: lay.ringCenter[1], r: lay.ringR } : null };
    var minx = 1e9, miny = 1e9, maxx = -1e9, maxy = -1e9;
    atoms.forEach(function (a) { var w = a.label ? Math.max(0.3, 0.2 * a.label.length + 0.15) : 0.05; minx = Math.min(minx, a.x - w); maxx = Math.max(maxx, a.x + w); miny = Math.min(miny, a.y - 0.35); maxy = Math.max(maxy, a.y + 0.35); });
    if (geo.ring) { minx = Math.min(minx, geo.ring.x - geo.ring.r); maxx = Math.max(maxx, geo.ring.x + geo.ring.r); miny = Math.min(miny, geo.ring.y - geo.ring.r); maxy = Math.max(maxy, geo.ring.y + geo.ring.r); }
    geo.box = { minx: minx, miny: miny, maxx: maxx, maxy: maxy };
    return (geoCache[key] = geo);
  }

  function esc(s) { return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;'); }
  // Text with subscript digits as tspans, so no font needs subscript glyphs.
  function subText(cf) {
    var out = '', re = /([A-Za-z)\]])(\d+)/g, last = 0, m;
    while ((m = re.exec(cf))) {
      out += esc(cf.slice(last, m.index + 1)) + '<tspan class="sub nuc" dy="0.28em" font-size="70%">' + m[2] + '</tspan><tspan dy="-0.28em">​</tspan>';
      last = m.index + m[0].length;
    }
    return out + esc(cf.slice(last));
  }
  function labelText(label) {
    // The NO₂ and H₂-style labels use Unicode subscripts from the data; draw them as tspans too.
    return label.replace(/[₀-₉]+/g, function (s) { return '<tspan class="sub nuc" dy="0.28em" font-size="70%">' + s.split('').map(function (c) { return SUBS.indexOf(c); }).join('') + '</tspan><tspan dy="-0.28em">​</tspan>'; });
  }

  function svg(molId, style, opts) {
    opts = opts || {};
    var m = D.MOLS[molId], u = opts.size || 44, fs = u * 0.44, title = esc(m.name + ', ' + m.formula);
    var cls = 'struct struct-' + style + (opts.cls ? ' ' + opts.cls : '');
    if (style === 'structural' || !m.smiles) {
      var f = m.cf, w = Math.max(60, f.replace(/\d/g, '').length * fs * 0.62 + 24), h = fs * 2.2;
      return '<svg class="' + cls + ' struct-formula" viewBox="0 0 ' + w.toFixed(1) + ' ' + h.toFixed(1) + '" width="' + w.toFixed(0) + '" height="' + h.toFixed(0) + '" role="img" aria-label="' + title + '"><text x="' + (w / 2).toFixed(1) + '" y="' + (h / 2).toFixed(1) + '" text-anchor="middle" dominant-baseline="central" font-size="' + (fs * 1.2).toFixed(1) + '" class="lbl">' + subText(f) + '</text></svg>';
    }
    var geo = geometry(molId, style), pad = u * 0.35, b = geo.box;
    var X0 = b.minx * u - pad, Y0 = b.miny * u - pad, W = (b.maxx - b.minx) * u + 2 * pad, H = (b.maxy - b.miny) * u + 2 * pad;
    var out = '<svg class="' + cls + '" viewBox="' + X0.toFixed(1) + ' ' + Y0.toFixed(1) + ' ' + W.toFixed(1) + ' ' + H.toFixed(1) + '" width="' + W.toFixed(0) + '" height="' + H.toFixed(0) + '" role="img" aria-label="' + title + '" font-size="' + fs.toFixed(1) + '">';
    var gap = function (a) { return a.label ? u * (a.label.length > 2 ? 0.34 : a.label.length === 2 ? 0.27 : 0.2) : 0; };
    out += '<g class="bonds">';
    geo.bonds.forEach(function (bd) {
      var A = geo.atoms[bd.a], B = geo.atoms[bd.b];
      var x1 = A.x * u, y1 = A.y * u, x2 = B.x * u, y2 = B.y * u, dx = x2 - x1, dy = y2 - y1, len = Math.hypot(dx, dy), ux = dx / len, uy = dy / len;
      var ga = gap(A), gb = gap(B);
      x1 += ux * ga; y1 += uy * ga; x2 -= ux * gb; y2 -= uy * gb;
      var nx = -uy, ny = ux, offs = bd.ring ? [0] : bd.o === 2 ? [-0.06, 0.06] : bd.o === 3 ? [-0.1, 0, 0.1] : [0];
      offs.forEach(function (o) { out += '<line x1="' + (x1 + nx * o * u).toFixed(1) + '" y1="' + (y1 + ny * o * u).toFixed(1) + '" x2="' + (x2 + nx * o * u).toFixed(1) + '" y2="' + (y2 + ny * o * u).toFixed(1) + '"/>'; });
    });
    out += '</g>';
    if (geo.ring) out += '<circle class="ringc" cx="' + (geo.ring.x * u).toFixed(1) + '" cy="' + (geo.ring.y * u).toFixed(1) + '" r="' + (geo.ring.r * u * 0.58).toFixed(1) + '"/>';
    out += '<g class="atoms" text-anchor="middle" dominant-baseline="central">';
    geo.atoms.forEach(function (a) { if (a.label) out += '<text class="el el-' + (a.el === 'NO2' ? 'N' : a.el) + '" x="' + (a.x * u).toFixed(1) + '" y="' + (a.y * u).toFixed(1) + '">' + labelText(a.label) + '</text>'; });
    return out + '</g></svg>';
  }

  function layout(molId, style) { return geometry(molId, style); }

  return { svg: svg, layout: layout, groups: groups, formulaOf: formulaOf, build: build, readSmiles: readSmiles };
});
