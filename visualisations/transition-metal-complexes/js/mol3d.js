/* Transition Metal Complexes — 3D ball-and-stick models on a 2D canvas.
   No library: complexes are small, so atoms are projected and drawn back to
   front as flat discs, in the site's flat style.

   Mol.build(spec)       → { atoms:[{el,p:[x,y,z],r,lig}], bonds:[[i,j,'coord'|'cov']] }
   Mol.mirror(mol)       → the mirror image (x → −x)
   Mol.superimpose(a, b) → the best of the 24 rotations of an octahedron that
                           turns b onto a, with the atoms that still don't match
   Mol.draw(ctx, mol, view) draws one model; view = { R, cx, cy, s, pal, alpha, ... } */
(function () {
  'use strict';

  /* ---------- Vectors and matrices ---------- */
  function add(a, b) { return [a[0] + b[0], a[1] + b[1], a[2] + b[2]]; }
  function sub(a, b) { return [a[0] - b[0], a[1] - b[1], a[2] - b[2]]; }
  function mul(a, k) { return [a[0] * k, a[1] * k, a[2] * k]; }
  function dot(a, b) { return a[0] * b[0] + a[1] * b[1] + a[2] * b[2]; }
  function cross(a, b) { return [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]]; }
  function len(a) { return Math.sqrt(dot(a, a)); }
  function norm(a) { var l = len(a) || 1; return [a[0] / l, a[1] / l, a[2] / l]; }
  function perp(d) { var t = Math.abs(d[0]) < 0.9 ? [1, 0, 0] : [0, 1, 0]; return norm(cross(d, t)); }
  function mm(A, B) {
    var C = [[0, 0, 0], [0, 0, 0], [0, 0, 0]];
    for (var i = 0; i < 3; i++) for (var j = 0; j < 3; j++) for (var k = 0; k < 3; k++) C[i][j] += A[i][k] * B[k][j];
    return C;
  }
  function mv(M, v) { return [M[0][0] * v[0] + M[0][1] * v[1] + M[0][2] * v[2], M[1][0] * v[0] + M[1][1] * v[1] + M[1][2] * v[2], M[2][0] * v[0] + M[2][1] * v[1] + M[2][2] * v[2]]; }
  function rotX(a) { var c = Math.cos(a), s = Math.sin(a); return [[1, 0, 0], [0, c, -s], [0, s, c]]; }
  function rotY(a) { var c = Math.cos(a), s = Math.sin(a); return [[c, 0, s], [0, 1, 0], [-s, 0, c]]; }
  function ident() { return [[1, 0, 0], [0, 1, 0], [0, 0, 1]]; }
  // Re-orthonormalise after many small drags so the model never shears.
  function ortho(M) {
    var x = norm([M[0][0], M[1][0], M[2][0]]), y = [M[0][1], M[1][1], M[2][1]];
    y = norm(sub(y, mul(x, dot(x, y)))); var z = cross(x, y);
    return [[x[0], y[0], z[0]], [x[1], y[1], z[1]], [x[2], y[2], z[2]]];
  }
  // Rotation matrix ↔ quaternion, for a smooth turn during the superimpose test.
  function toQ(M) {
    var t = M[0][0] + M[1][1] + M[2][2], q;
    if (t > 0) { var s = Math.sqrt(t + 1) * 2; q = [0.25 * s, (M[2][1] - M[1][2]) / s, (M[0][2] - M[2][0]) / s, (M[1][0] - M[0][1]) / s]; }
    else if (M[0][0] > M[1][1] && M[0][0] > M[2][2]) { var s1 = Math.sqrt(1 + M[0][0] - M[1][1] - M[2][2]) * 2; q = [(M[2][1] - M[1][2]) / s1, 0.25 * s1, (M[0][1] + M[1][0]) / s1, (M[0][2] + M[2][0]) / s1]; }
    else if (M[1][1] > M[2][2]) { var s2 = Math.sqrt(1 + M[1][1] - M[0][0] - M[2][2]) * 2; q = [(M[0][2] - M[2][0]) / s2, (M[0][1] + M[1][0]) / s2, 0.25 * s2, (M[1][2] + M[2][1]) / s2]; }
    else { var s3 = Math.sqrt(1 + M[2][2] - M[0][0] - M[1][1]) * 2; q = [(M[1][0] - M[0][1]) / s3, (M[0][2] + M[2][0]) / s3, (M[1][2] + M[2][1]) / s3, 0.25 * s3]; }
    return q;
  }
  function fromQ(q) {
    var w = q[0], x = q[1], y = q[2], z = q[3];
    return [[1 - 2 * (y * y + z * z), 2 * (x * y - z * w), 2 * (x * z + y * w)],
            [2 * (x * y + z * w), 1 - 2 * (x * x + z * z), 2 * (y * z - x * w)],
            [2 * (x * z - y * w), 2 * (y * z + x * w), 1 - 2 * (x * x + y * y)]];
  }
  function slerp(a, b, t) {
    var d = a[0] * b[0] + a[1] * b[1] + a[2] * b[2] + a[3] * b[3];
    if (d < 0) { b = b.map(function (v) { return -v; }); d = -d; }
    if (d > 0.9995) { var r = a.map(function (v, i) { return v + (b[i] - v) * t; }); var l = Math.hypot(r[0], r[1], r[2], r[3]); return r.map(function (v) { return v / l; }); }
    var th = Math.acos(d), s = Math.sin(th), wa = Math.sin((1 - t) * th) / s, wb = Math.sin(t * th) / s;
    return a.map(function (v, i) { return wa * v + wb * b[i]; });
  }

  /* ---------- Building complexes ---------- */
  var OCT = { '+x': [1, 0, 0], '-x': [-1, 0, 0], '+y': [0, 1, 0], '-y': [0, -1, 0], '+z': [0, 0, 1], '-z': [0, 0, -1] };
  var OCT_ORDER = ['+x', '-x', '+y', '-y', '+z', '-z'];
  var T = 1 / Math.sqrt(3);
  var TET = [[T, T, T], [T, -T, -T], [-T, T, -T], [-T, -T, T]];
  var RAD = { H: 0.2, C: 0.3, N: 0.33, O: 0.33, Cl: 0.45, Cu: 0.5, Co: 0.5, Fe: 0.5, Ni: 0.5, Cr: 0.5, Al: 0.45, Pt: 0.56, Ag: 0.54, Ti: 0.5 };
  var BOND = { H2O: 2.0, OH: 1.95, NH3: 2.05, Cl: 2.3 };

  function Builder(metal) {
    this.atoms = []; this.bonds = [];
    this.metal = this.atom(metal, [0, 0, 0], 'M');
  }
  Builder.prototype.atom = function (el, p, lig) { this.atoms.push({ el: el, p: p, r: RAD[el] || 0.3, lig: lig }); return this.atoms.length - 1; };
  Builder.prototype.bond = function (a, b, t) { this.bonds.push([a, b, t || 'cov']); };
  // A monodentate ligand along direction d. Hydrogens hang off the donor atom.
  Builder.prototype.mono = function (type, d, dist) {
    var r = dist || BOND[type] || 2.0, u = perp(d), v = cross(d, u), tag = type;
    if (type === 'Cl') { var c = this.atom('Cl', mul(d, r), tag); this.bond(this.metal, c, 'coord'); return; }
    var dEl = type === 'NH3' ? 'N' : 'O', D = this.atom(dEl, mul(d, r), tag), self = this;
    this.bond(D, this.metal, 'coord');
    function h(dir) { var hh = self.atom('H', add(mul(d, r), mul(dir, 0.97)), tag); self.bond(D, hh); }
    if (type === 'H2O') {
      var a = 54 * Math.PI / 180;
      h(add(mul(d, Math.cos(a)), mul(u, Math.sin(a)))); h(add(mul(d, Math.cos(a)), mul(u, -Math.sin(a))));
    } else if (type === 'OH') {
      var b = 70 * Math.PI / 180; h(add(mul(d, Math.cos(b)), mul(u, Math.sin(b))));
    } else if (type === 'NH3') {
      var g = 70 * Math.PI / 180;
      for (var k = 0; k < 3; k++) { var f = k * 2 * Math.PI / 3; h(add(mul(d, Math.cos(g)), mul(add(mul(u, Math.cos(f)), mul(v, Math.sin(f))), Math.sin(g)))); }
    }
  };
  // A five-membered chelate ring between two cis positions a and b.
  // Ring atoms sit in the plane of a and b, so the ring is flat and the
  // model's only chirality is the arrangement of rings round the metal.
  //   kind 'en': N…C–C…N    'ox': O…C(=O)–C(=O)…O    'gly': N…C–C(=O)…O
  Builder.prototype.ring = function (kind, a, b, shared) {
    var self = this, rA = kind === 'ox' ? 1.95 : 2.05, rB = kind === 'en' ? 2.05 : 1.95;
    function at(s, t) { return add(mul(a, s), mul(b, t)); }
    var elA = kind === 'ox' ? 'O' : 'N', elB = kind === 'en' ? 'N' : 'O', tag = kind;
    var A = shared && shared.A != null ? shared.A : this.atom(elA, at(rA, 0), tag);
    var B = shared && shared.B != null ? shared.B : this.atom(elB, at(0, rB), tag);
    if (!(shared && shared.A != null)) this.bond(A, this.metal, 'coord');
    if (!(shared && shared.B != null)) this.bond(B, this.metal, 'coord');
    var cA = this.atom('C', at(2.45, 1.32), tag), cB = this.atom('C', at(1.32, 2.45), tag);
    this.bond(A, cA); this.bond(cA, cB); this.bond(cB, B);
    function exo(c, p) { var o = self.atom('O', add(self.atoms[c].p, mul(norm(p), 1.22)), tag); self.bond(c, o); }
    if (kind === 'ox') { exo(cA, add(a, mul(b, 0.25))); exo(cB, add(b, mul(a, 0.25))); }
    if (kind === 'gly') exo(cB, add(b, mul(a, 0.25)));
    return { A: A, B: B };
  };

  function build(spec) {
    var B = new Builder(spec.m);
    if (spec.geo === 'oct') {
      // Ligands in the order +x, −x, +y, −y, +z, −z; the last two are axial (±z).
      spec.lig.forEach(function (L, i) { B.mono(L, OCT[OCT_ORDER[i]]); });
    } else if (spec.geo === 'octAt') {
      Object.keys(spec.at).forEach(function (k) { B.mono(spec.at[k], OCT[k]); });
    } else if (spec.geo === 'tet') {
      spec.lig.forEach(function (L, i) { B.mono(L, TET[i]); });
    } else if (spec.geo === 'sqp') {
      Object.keys(spec.at).forEach(function (k) { B.mono(spec.at[k], OCT[k]); });
    } else if (spec.geo === 'lin') {
      B.mono(spec.lig[0], [1, 0, 0], 2.1); B.mono(spec.lig[1], [-1, 0, 0], 2.1);
    } else if (spec.geo === 'tris') {
      // Three chelate rings spanning all six positions: one hand of a propeller.
      [['+x', '+y'], ['-y', '+z'], ['-z', '-x']].forEach(function (pr) { B.ring(spec.lig, OCT[pr[0]], OCT[pr[1]]); });
    } else if (spec.geo === 'bis') {
      // Two en rings plus two monodentate ligands, cis or trans.
      (spec.rings).forEach(function (pr) { B.ring('en', OCT[pr[0]], OCT[pr[1]]); });
      Object.keys(spec.at).forEach(function (k) { B.mono(spec.at[k], OCT[k]); });
    } else if (spec.geo === 'edta') {
      // Two N (+x, +y) joined by an ethylene bridge; each N carries two
      // carboxylate arms to O donors at the positions next to it.
      var n = B.ring('en', OCT['+x'], OCT['+y']);
      B.ring('gly', OCT['+x'], OCT['+z'], { A: n.A });
      B.ring('gly', OCT['+x'], OCT['-y'], { A: n.A });
      B.ring('gly', OCT['+y'], OCT['-z'], { A: n.B });
      B.ring('gly', OCT['+y'], OCT['-x'], { A: n.B });
    }
    return { atoms: B.atoms, bonds: B.bonds, spec: spec };
  }

  function mirror(mol) {
    return { atoms: mol.atoms.map(function (a) { return { el: a.el, p: [-a.p[0], a.p[1], a.p[2]], r: a.r, lig: a.lig }; }), bonds: mol.bonds, spec: mol.spec };
  }

  /* ---------- Superimposing ---------- */
  // The 24 proper rotations that map the x, y and z axes onto ± axes.
  var GROUP = (function () {
    var out = [], perms = [[0, 1, 2], [0, 2, 1], [1, 0, 2], [1, 2, 0], [2, 0, 1], [2, 1, 0]];
    perms.forEach(function (p) {
      for (var s = 0; s < 8; s++) {
        var M = [[0, 0, 0], [0, 0, 0], [0, 0, 0]], sg = [s & 1 ? -1 : 1, s & 2 ? -1 : 1, s & 4 ? -1 : 1];
        for (var i = 0; i < 3; i++) M[i][p[i]] = sg[i];
        var det = M[0][0] * (M[1][1] * M[2][2] - M[1][2] * M[2][1]) - M[0][1] * (M[1][0] * M[2][2] - M[1][2] * M[2][0]) + M[0][2] * (M[1][0] * M[2][1] - M[1][1] * M[2][0]);
        if (det > 0) out.push(M);
      }
    });
    return out;
  })();
  // Heavy atoms only: hydrogens spin freely on a real ligand.
  function mismatch(a, b, G) {
    var bad = [], total = 0;
    b.atoms.forEach(function (x, i) {
      if (x.el === 'H') return;
      var q = mv(G, x.p), best = 1e9;
      a.atoms.forEach(function (y) { if (y.el === x.el) best = Math.min(best, len(sub(q, y.p))); });
      total += best;
      if (best > 0.25) bad.push(i);
    });
    return { bad: bad, total: total };
  }
  function superimpose(a, b) {
    var best = null;
    GROUP.forEach(function (G) {
      var m = mismatch(a, b, G);
      if (!best || m.bad.length < best.bad.length || (m.bad.length === best.bad.length && m.total < best.total)) best = { G: G, bad: m.bad, total: m.total };
    });
    return best;
  }

  /* ---------- Drawing ---------- */
  function project(p, view) {
    var q = mv(view.R, p), f = view.persp ? view.persp / (view.persp - q[2]) : 1;
    return { x: view.cx + q[0] * view.s * f, y: view.cy - q[1] * view.s * f, z: q[2], f: f };
  }
  function draw(ctx, mol, view) {
    var pal = view.pal, items = [], P = mol.atoms.map(function (a) { return project(a.p, view); });
    var showH = view.showH !== false;
    mol.atoms.forEach(function (a, i) { if (a.el !== 'H' || showH) items.push({ z: P[i].z, atom: i }); });
    mol.bonds.forEach(function (b) {
      if (!showH && (mol.atoms[b[0]].el === 'H' || mol.atoms[b[1]].el === 'H')) return;
      items.push({ z: (P[b[0]].z + P[b[1]].z) / 2 - 0.05, bond: b });
    });
    items.sort(function (u, v) { return u.z - v.z; });
    var bad = view.bad || [];
    ctx.save();
    ctx.globalAlpha = view.alpha == null ? 1 : view.alpha;
    items.forEach(function (it) {
      if (it.bond) {
        var p = P[it.bond[0]], q = P[it.bond[1]], coord = it.bond[2] === 'coord';
        ctx.strokeStyle = coord ? pal.coord : pal.bond;
        ctx.lineWidth = Math.max(2, view.s * (coord ? 0.12 : 0.1) * (p.f + q.f) / 2);
        ctx.lineCap = 'round';
        ctx.beginPath(); ctx.moveTo(p.x, p.y); ctx.lineTo(q.x, q.y); ctx.stroke();
      } else {
        var a = mol.atoms[it.atom], pp = P[it.atom], r = a.r * view.s * pp.f;
        ctx.fillStyle = (pal.el[a.el] || pal.el.C);
        ctx.strokeStyle = pal.atomEdge; ctx.lineWidth = Math.max(1, r * 0.08);
        ctx.beginPath(); ctx.arc(pp.x, pp.y, r, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
        if (bad.indexOf(it.atom) !== -1) {
          ctx.strokeStyle = pal.bad; ctx.lineWidth = Math.max(3, r * 0.22);
          ctx.beginPath(); ctx.arc(pp.x, pp.y, r + ctx.lineWidth, 0, Math.PI * 2); ctx.stroke();
        }
        if (view.labels && a.el !== 'H' && a.el !== 'C') {
          var fs = Math.max(view.labelPx || 12, r * 0.9);
          ctx.font = '700 ' + fs + 'px ' + view.font;
          ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
          ctx.fillStyle = pal.elInk[a.el] || '#0b1220';
          ctx.fillText(a.el, pp.x, pp.y + fs * 0.04);
        }
      }
    });
    ctx.restore();
    return P;
  }
  // An arc between two bonds from the metal, with the angle written beside it.
  function angleArc(ctx, mol, view, i, j, text) {
    var a = norm(mol.atoms[i].p), b = norm(mol.atoms[j].p), pts = [], r = 1.05;
    var th = Math.acos(Math.max(-1, Math.min(1, dot(a, b))));
    var axis = th > 3.1 ? perp(a) : norm(cross(a, b));
    for (var k = 0; k <= 24; k++) {
      var t = th * k / 24, v = add(mul(a, Math.cos(t)), mul(cross(axis, a), Math.sin(t)));
      pts.push(project(mul(v, r), view));
    }
    ctx.save();
    ctx.strokeStyle = view.pal.accent; ctx.lineWidth = Math.max(2, view.s * 0.05);
    ctx.setLineDash([view.s * 0.12, view.s * 0.08]);
    ctx.beginPath(); pts.forEach(function (p, k) { if (k) ctx.lineTo(p.x, p.y); else ctx.moveTo(p.x, p.y); }); ctx.stroke();
    ctx.setLineDash([]);
    var mid = pts[12], c = project([0, 0, 0], view), dx = mid.x - c.x, dy = mid.y - c.y, dl = Math.hypot(dx, dy) || 1;
    ctx.font = '800 ' + view.labelPx + 'px ' + view.font;
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    var tx = mid.x + dx / dl * view.labelPx * 1.3, ty = mid.y + dy / dl * view.labelPx * 1.1;
    var w = ctx.measureText(text).width + view.labelPx * 0.5;
    ctx.fillStyle = view.pal.stage; ctx.globalAlpha = 0.85;
    ctx.fillRect(tx - w / 2, ty - view.labelPx * 0.62, w, view.labelPx * 1.24);
    ctx.globalAlpha = 1; ctx.fillStyle = view.pal.accent;
    ctx.fillText(text, tx, ty);
    ctx.restore();
  }
  function extent(mol) {
    var m = 0;
    mol.atoms.forEach(function (a) { m = Math.max(m, len(a.p) + a.r); });
    return m;
  }

  window.Mol = {
    build: build, mirror: mirror, superimpose: superimpose, draw: draw, angleArc: angleArc, extent: extent,
    m: { mm: mm, mv: mv, rotX: rotX, rotY: rotY, ident: ident, ortho: ortho, toQ: toQ, fromQ: fromQ, slerp: slerp }
  };
})();
