/* Transition Metal Complexes — page logic.
   Four modes share one canvas (#cv), one column of teacher controls
   (#controls) and one column of explanation (#info). #boardNotes holds the
   short text the shared presenter turns into slides. */
(function () {
  'use strict';
  var T = window.TM, M = window.Mol, D = window.TMDraw, mm = M.m;
  function $(s, r) { return (r || document).querySelector(s); }
  function $$(s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); }
  var tx = T.tx, F = T.fmt;
  function say(msg) { var el = $('#srLive'); el.textContent = ''; setTimeout(function () { el.textContent = msg.replace(/\{|\}/g, '').replace(/\^/g, ''); }, 30); }
  function plain(s) { return s.replace(/\{([^}]+)\}/g, '$1').replace(/\^/g, ''); }

  var MODES = [
    { id: 'lab', n: 1, label: 'Test-tube reactions', spec: '3.2.5.2 · 3.2.6' },
    { id: 'shapes', n: 2, label: 'Shapes & isomers', spec: '3.2.5.3' },
    { id: 'colour', n: 3, label: 'Why are they coloured?', spec: '3.2.5.4' },
    { id: 'cm', n: 4, label: 'Colorimetry', spec: '3.2.5.4' }
  ];

  var st = {
    mode: 'lab', dirty: true,
    labR: mm.mm(mm.rotX(-0.45), mm.rotY(0.6)),
    shapeR: mm.mm(mm.rotX(-0.4), mm.rotY(0.55)),
    lab: { ion: 'cu', rg: null, stage: 'none', predict: false, pending: null, changedAt: 0, pptAt: 0, view: null, prevSol: null },
    shape: { id: 'oct', labels: true, showH: true, angle: true, mirror: false, spin: true, sup: null },
    col: { id: 'cu_aq', mode: 'white', probe: 600, photons: [], excite: null, gapPx: 0.35, compare: null, nextPhoton: 0 },
    cm: null
  };

  /* ============================ Mode 1: test tubes ============================ */
  function ionOf(id) { return T.IONS.filter(function (i) { return i.id === id; })[0]; }
  function rgOf(id) { return T.REAGENTS.filter(function (r) { return r.id === id; })[0]; }
  function labOutcome() {
    var L = st.lab, sp0 = T.SP[ionOf(L.ion).start];
    var base = { sol: sp0.colour, ppt: null, sp: ionOf(L.ion).start, obs: 'A ' + sp0.col + ' of {' + sp0.f + '}', stageLabel: 'Start: the metal-aqua ion' };
    if (!L.rg || L.stage === 'none') return base;
    var r = T.R[L.ion][L.rg];
    if (L.stage === 'water') {
      return { sol: sp0.colour, ppt: null, sp: ionOf(L.ion).start, obs: 'Adding water turns the solution back to ' + sp0.col.replace(' solution', ''),
        eq: r.excess.eq, kind: 'The equilibrium moves to the left', stageLabel: 'Then diluted with water',
        why: 'Water is a product of the forward reaction, so adding a lot of it moves the equilibrium back to the aqua ion. Ligand substitution with chloride is reversible.' };
    }
    var o = r[L.stage], out = {};
    Object.keys(o).forEach(function (k) { out[k] = o[k]; });
    out.stageLabel = L.stage === 'few' ? 'After a few drops of ' + rgOf(L.rg).mk : 'After adding ' + rgOf(L.rg).mk + ' in excess';
    return out;
  }
  function setLab(patch) {
    var L = st.lab, before = labOutcome();
    Object.keys(patch).forEach(function (k) { L[k] = patch[k]; });
    var after = labOutcome();
    L.prevSol = L.view ? before.sol : after.sol;
    L.changedAt = performance.now();
    if (after.ppt && (!before.ppt || patch.ion || patch.rg)) L.pptAt = performance.now();
    if (!after.ppt) L.pptAt = 0;
    L.view = after;
    var ion = ionOf(L.ion);
    L.headline = '{' + T.SP[ion.start].f + '}' + (L.rg ? ' + ' + rgOf(L.rg).mk : '');
    st.dirty = true;
    renderControls(); renderInfo(); renderNotes();
  }
  function addStage(stage) {
    var L = st.lab;
    if (!L.rg) return;
    var go = function (s) {
      if (L.predict && s !== 'water') { L.pending = s; L.dropAt = performance.now(); st.dirty = true; renderControls(); renderInfo(); renderNotes(); return; }
      L.dropAt = performance.now();
      setLab({ stage: s });
      say(plain(labOutcome().obs));
    };
    if (stage === 'excess' && L.stage === 'none' && !L.predict) {
      go('few');
      clearTimeout(L.timer); L.timer = setTimeout(function () { go('excess'); }, 1700);
    } else go(stage);
  }
  function labPredictOptions() {
    var L = st.lab, r = T.R[L.ion][L.rg], right = r[L.pending], pool = [], seen = {};
    seen[plain(right.obs)] = 1;
    Object.keys(T.R).forEach(function (ion) {
      Object.keys(T.R[ion]).forEach(function (rg) {
        ['few', 'excess'].forEach(function (s) {
          var o = T.R[ion][rg][s], k = plain(o.obs);
          if (!seen[k] && !o.nochange) { seen[k] = 1; pool.push(o); }
        });
      });
    });
    // A steady pseudo-random pick, so the options don't reshuffle on every redraw.
    var key = L.ion + L.rg + L.pending, h = 0;
    for (var i = 0; i < key.length; i++) h = (h * 31 + key.charCodeAt(i)) >>> 0;
    var opts = [right];
    while (opts.length < 4 && pool.length) { h = (h * 1103515245 + 12345) >>> 0; opts.push(pool.splice(h % pool.length, 1)[0]); }
    h = (h * 1103515245 + 12345) >>> 0;
    var pos = h % opts.length; opts[0] = opts[pos]; opts[pos] = right;
    return opts.map(function (o) { return { o: o, right: o === right }; });
  }

  /* ============================ Mode 2: shapes ============================ */
  var SHAPES = [
    { grp: 'Shapes', id: 'oct', title: 'Octahedral: {[Cu(H2O)6]2+}', sub: 'Six small ligands · bond angle 90° · co-ordination number 6',
      a: { m: 'Cu', geo: 'oct', lig: ['H2O', 'H2O', 'H2O', 'H2O', 'H2O', 'H2O'] }, angle: '90°', pick: [1, 3],
      foot: 'Small ligands such as {H2O} and {NH3}: six fit round the metal ion.' },
    { grp: 'Shapes', id: 'tet', title: 'Tetrahedral: {[CuCl4]2−}', sub: 'Four larger ligands · bond angle 109.5° · co-ordination number 4',
      a: { m: 'Cu', geo: 'tet', lig: ['Cl', 'Cl', 'Cl', 'Cl'] }, angle: '109.5°', pick: [0, 1],
      foot: '{Cl^−} is larger than {H2O}, so only four fit round the metal ion.' },
    { grp: 'Shapes', id: 'sqp', title: 'Square planar: cisplatin, {[Pt(NH3)2Cl2]}', sub: 'Four ligands in one plane · bond angle 90° · co-ordination number 4',
      a: { m: 'Pt', geo: 'sqp', at: { '+x': 'Cl', '+y': 'Cl', '-x': 'NH3', '-y': 'NH3' } }, angle: '90°', pick: [0, 1],
      foot: 'Turn it edge-on: all five atoms round the platinum lie in one plane.' },
    { grp: 'Shapes', id: 'lin', title: 'Linear: {[Ag(NH3)2]+}', sub: 'Two ligands · bond angle 180° · co-ordination number 2 · Tollens’ reagent',
      a: { m: 'Ag', geo: 'lin', lig: ['NH3', 'NH3'] }, angle: '180°', pick: [0, 1],
      foot: '{Ag^+} forms the linear complex used in Tollens’ reagent.' },
    { grp: 'Cis–trans isomers', id: 'ct_oct', title: 'Cis–trans isomers of {[Co(NH3)4Cl2]+}', sub: 'Octahedral, monodentate ligands: the two {Cl^−} are at 90° (cis) or 180° (trans)',
      a: { m: 'Co', geo: 'octAt', at: { '+x': 'Cl', '+y': 'Cl', '-x': 'NH3', '-y': 'NH3', '+z': 'NH3', '-z': 'NH3' } },
      b: { m: 'Co', geo: 'octAt', at: { '+z': 'Cl', '-z': 'Cl', '+x': 'NH3', '-x': 'NH3', '+y': 'NH3', '-y': 'NH3' } },
      labA: 'cis (90°)', labB: 'trans (180°)', foot: 'Cis–trans isomerism is a special case of E–Z isomerism.' },
    { grp: 'Cis–trans isomers', id: 'ct_sqp', title: 'Cis–trans isomers of {[Pt(NH3)2Cl2]}', sub: 'Square planar: the cis isomer is cisplatin, an anticancer drug',
      a: { m: 'Pt', geo: 'sqp', at: { '+x': 'Cl', '+y': 'Cl', '-x': 'NH3', '-y': 'NH3' } },
      b: { m: 'Pt', geo: 'sqp', at: { '+x': 'Cl', '-x': 'Cl', '+y': 'NH3', '-y': 'NH3' } },
      labA: 'cis: cisplatin', labB: 'trans', foot: 'Cisplatin is the cis isomer: its two {Cl^−} ligands are next to each other.' },
    { grp: 'Optical isomers', id: 'opt_en', title: 'Optical isomers of {[Ni(en)3]2+}', sub: 'Three bidentate en ligands ({H2NCH2CH2NH2}) · octahedral · co-ordination number 6',
      a: { m: 'Ni', geo: 'tris', lig: 'en' }, mirror: true, hideH: true,
      foot: 'Octahedral complexes with three bidentate ligands are chiral.' },
    { grp: 'Optical isomers', id: 'opt_ox', title: 'Optical isomers of {[Cr(C2O4)3]3−}', sub: 'Three bidentate ethanedioate ligands ({C2O4^2−}) · octahedral',
      a: { m: 'Cr', geo: 'tris', lig: 'ox' }, mirror: true, hideH: true,
      foot: 'The same propeller shape with ethanedioate in place of en.' },
    { grp: 'Optical isomers', id: 'cis_en2', title: 'cis-{[Co(en)2Cl2]+}', sub: 'Two en ligands, two {Cl^−} at 90°',
      a: { m: 'Co', geo: 'bis', rings: [['+x', '+y'], ['-y', '+z']], at: { '-x': 'Cl', '-z': 'Cl' } }, mirror: true, hideH: true,
      foot: 'Is the mirror image the same molecule? Try to superimpose them.' },
    { grp: 'Optical isomers', id: 'trans_en2', title: 'trans-{[Co(en)2Cl2]+}', sub: 'Two en ligands, two {Cl^−} at 180°',
      a: { m: 'Co', geo: 'bis', rings: [['+x', '+y'], ['-x', '-y']], at: { '+z': 'Cl', '-z': 'Cl' } }, mirror: true, hideH: true,
      foot: 'Is the mirror image the same molecule? Try to superimpose them.' },
    { grp: 'Multidentate', id: 'edta', title: '{[Cu(EDTA)]2−}', sub: 'One hexadentate EDTA⁴⁻ ion forms all six co-ordinate bonds (2 from N, 4 from O)',
      a: { m: 'Cu', geo: 'edta' }, hideH: true,
      foot: 'One ligand, six co-ordinate bonds: the chelate effect makes this complex very stable.' }
  ];
  function shapeOf(id) { return SHAPES.filter(function (s) { return s.id === id; })[0]; }
  function setShape(id) {
    var Z = st.shape, md = shapeOf(id);
    Z.id = id; Z.model = md; Z.sup = null; Z.verdict = null;
    Z.molA = M.build(md.a);
    Z.showH = !md.hideH && Z.showH !== false;
    if (md.b) { Z.pair = 'ct'; Z.molB = M.build(md.b); Z.labA = md.labA; Z.labB = md.labB; Z.mirror = false; }
    else {
      Z.mirror = !!md.mirror;
      Z.pair = Z.mirror ? 'mirror' : null;
      Z.molB = Z.mirror ? M.mirror(Z.molA) : null;
      Z.labA = 'molecule'; Z.labB = 'mirror image';
    }
    // The angle arc between two donor atoms.
    var donors = [];
    Z.molA.bonds.forEach(function (b) { if (b[2] === 'coord') donors.push(b[0] === 0 ? b[1] : b[0]); });
    md.arc = md.angle && md.pick ? [donors[md.pick[0]], donors[md.pick[1]]] : null;
    st.dirty = true;
    renderControls(); renderInfo(); renderNotes();
  }
  function toggleMirror(on) {
    var Z = st.shape;
    if (Z.model.b) return;
    Z.mirror = on; Z.pair = on ? 'mirror' : null; Z.molB = on ? M.mirror(Z.molA) : null; Z.sup = null; Z.verdict = null;
    st.dirty = true; renderControls(); renderInfo(); renderNotes();
  }
  function trySuperimpose() {
    var Z = st.shape;
    if (Z.pair !== 'mirror') return;
    if (Z.sup) { Z.sup = null; Z.verdict = null; st.dirty = true; renderControls(); renderInfo(); renderNotes(); return; }
    var res = M.superimpose(Z.molA, Z.molB);
    Z.spin = false;
    Z.sup = { t0: performance.now(), G: res.G, bad: res.bad };
    Z.verdict = res.bad.length
      ? 'Not superimposable: the ringed atoms don’t line up, however it is turned. These are optical isomers.'
      : 'Superimposable: the mirror image is the same molecule. No optical isomers.';
    setTimeout(function () { say(Z.verdict); renderInfo(); renderNotes(); }, 1900);
    st.dirty = true; renderControls(); renderInfo();
  }

  /* ============================ Mode 3: colour ============================ */
  function colOf(id) { return T.COLOUR.filter(function (c) { return c.id === id; })[0]; }
  // The ΔE gap as a share of the room on the diagram: bigger ΔE, bigger gap.
  function gapFor(c) {
    if (!c.lam) return 0.5;
    var kj = T.K.h * T.K.c / (c.lam * 1e-9) * T.K.NA / 1000;   // 150 to 240 kJ mol⁻¹ here
    return 0.3 + (kj - 140) / 110 * 0.62;
  }
  function setColour(id, keepCompare) {
    var C = st.col; C.id = id; C.c = colOf(id); C.photons = []; C.excite = null;
    if (!keepCompare) C.compare = null;
    st.dirty = true; renderControls(); renderInfo(); renderNotes();
  }
  function spawnPhoton(t) {
    var C = st.col, lam = C.mode === 'probe' ? C.probe : 400 + Math.random() * 340;
    C.photons.push({ t0: t, lam: lam, dur: 2600, abs: D.absorbs(C.c, lam) });
    if (C.photons.length > 14) C.photons.shift();
  }

  /* ============================ Mode 4: colorimetry ============================ */
  var FILTERS = [
    { id: 'red', name: 'red', lam: 670, hex: '#e8423a' }, { id: 'orange', name: 'orange', lam: 610, hex: '#f08a2c' },
    { id: 'yellow', name: 'yellow', lam: 580, hex: '#f3d23a' }, { id: 'green', name: 'green', lam: 530, hex: '#43b45a' },
    { id: 'blue', name: 'blue', lam: 470, hex: '#2f6fe0' }, { id: 'violet', name: 'violet', lam: 420, hex: '#8a4fd0' }
  ];
  var STANDARDS = [0.10, 0.20, 0.30, 0.40, 0.50];
  var CU = colOf('cu_aq');
  function cmReset(keepFilter) {
    var f = keepFilter && st.cm ? st.cm.filter : FILTERS[1];
    var unknown = st.cm && st.cm.unknownC ? st.cm.unknownC : Math.round((0.15 + Math.random() * 0.3) * 100) / 100;
    st.cm = { filter: f, zeroed: false, points: [], line: null, unknownA: null, unknownC: unknown, last: null, current: null, answer: null, aMax: 0.8, seed: 11 };
    st.dirty = true;
  }
  function slope(f) { return 1.45 * D.band(CU, f.lam) / D.band(CU, 670); }   // absorbance per mol dm⁻³
  function noise() { var K = st.cm; K.seed = (K.seed * 9301 + 49297) % 233280; return (K.seed / 233280 - 0.5) * 0.012; }
  function measure(c, label) {
    var K = st.cm, A = Math.max(0, slope(K.filter) * c + noise());
    A = Math.round(A * 1000) / 1000;
    K.last = { A: A }; K.current = { hex: CU.colour, label: label };
    return A;
  }
  function cmAction(act, v) {
    var K = st.cm;
    if (act === 'filter') { var f = FILTERS.filter(function (x) { return x.id === v; })[0]; cmReset(); st.cm.filter = f; say(f.name + ' filter chosen. Zero the colorimeter with water.'); }
    else if (act === 'zero') { K.zeroed = true; K.last = { A: 0 }; K.current = { hex: null, label: 'distilled water' }; say('Zeroed with distilled water.'); }
    else if (act === 'std') {
      var A = measure(v, v.toFixed(2) + ' mol dm⁻³');
      K.points = K.points.filter(function (p) { return p.c !== v; }).concat([{ c: v, A: A }]).sort(function (a, b) { return a.c - b.c; });
      K.aMax = Math.max(0.2, Math.ceil(Math.max.apply(null, K.points.map(function (p) { return p.A; }).concat([0.1])) * 1.25 * 10) / 10);
      say('Absorbance ' + A.toFixed(3));
    }
    else if (act === 'line') {
      var sx = 0, sxx = 0; K.points.forEach(function (p) { sx += p.c * p.A; sxx += p.c * p.c; });
      K.line = sxx ? sx / sxx : null; say('Line of best fit drawn through the origin.');
    }
    else if (act === 'unknown') { K.unknownA = measure(K.unknownC, 'unknown'); K.aMax = Math.max(K.aMax, Math.ceil(K.unknownA * 1.25 * 10) / 10); say('Unknown absorbance ' + K.unknownA.toFixed(3)); }
    else if (act === 'check') {
      var x = parseFloat(String(v).replace(',', '.'));
      if (isNaN(x)) K.answer = { bad: true, msg: 'Type a number, in mol dm⁻³.' };
      else {
        var est = K.line ? K.unknownA / K.line : K.unknownC;
        K.answer = Math.abs(x - est) <= 0.02 ? { good: true, msg: 'Yes: about ' + est.toFixed(2) + ' mol dm⁻³, read from the line.' }
          : { bad: true, msg: 'Not quite. Read across from A = ' + K.unknownA.toFixed(3) + ' to the line, then down to the concentration axis.' };
      }
    }
    else if (act === 'reset') { cmReset(true); st.cm.unknownC = Math.round((0.15 + Math.random() * 0.3) * 100) / 100; }
    st.dirty = true; renderControls(); renderInfo(); renderNotes();
  }

  /* ============================ Controls ============================ */
  function sw(hex) { return '<span class="sw" style="background:' + (hex || 'transparent') + '"></span>'; }
  function renderControls() {
    var c = $('#controls'), h = '';
    if (st.mode === 'lab') {
      var L = st.lab;
      h += '<h3>Metal-aqua ion</h3><div class="list">' + T.IONS.map(function (i) {
        var sp = T.SP[i.start];
        return '<button type="button" class="pick" data-ion="' + i.id + '" aria-pressed="' + (L.ion === i.id) + '">' + sw(sp.colour) + '<span>' + F(sp.f) + '<small>' + i.label + '</small></span></button>';
      }).join('') + '</div>';
      h += '<h3>Reagent</h3><div class="grid2">' + T.REAGENTS.map(function (r) {
        var ok = !!T.R[L.ion][r.id];
        return '<button type="button" class="pick" data-rg="' + r.id + '" aria-pressed="' + (L.rg === r.id) + '"' + (ok ? '' : ' disabled title="Not in the AQA specification for this ion"') + '><span>' + tx(r.mk) + '</span></button>';
      }).join('') + '</div>';
      var can = L.rg && !L.pending;
      h += '<div class="row"><button type="button" class="btn" id="addFew"' + (can && L.stage === 'none' ? '' : ' disabled') + '>Add a few drops</button>' +
        '<button type="button" class="btn" id="addExcess"' + (can && (L.stage === 'none' || L.stage === 'few') ? '' : ' disabled') + '>Add in excess</button></div>';
      if (L.rg === 'hcl' && (L.ion === 'cu' || L.ion === 'co') && L.stage === 'excess' && !L.pending)
        h += '<button type="button" class="btn" id="addWater">Add water</button>';
      h += '<button type="button" class="btn" id="newTube">New test tube</button>';
      h += '<label class="check"><input type="checkbox" id="predict"' + (L.predict ? ' checked' : '') + '> <span>Pupils predict before they see</span></label>';
      h += '<p class="hint-line">Pick an ion, then a reagent. Drag the model to turn it.</p>';
    } else if (st.mode === 'shapes') {
      var Z = st.shape, grp = '';
      h += '<div class="list">';
      SHAPES.forEach(function (s) {
        if (s.grp !== grp) { grp = s.grp; h += '<p class="grp">' + grp + '</p>'; }
        h += '<button type="button" class="pick" data-shape="' + s.id + '" aria-pressed="' + (Z.id === s.id) + '"><span>' + tx(s.title.replace(/^[^{]*:\s*/, '').replace(/^Cis–trans isomers of |^Optical isomers of /, '')) + '<small>' + shapeHint(s) + '</small></span></button>';
      });
      h += '</div><h3>Show</h3>';
      if (!Z.model.b) h += '<label class="check"><input type="checkbox" id="mirror"' + (Z.mirror ? ' checked' : '') + '> <span>Mirror image</span></label>';
      h += '<label class="check"><input type="checkbox" id="labels"' + (Z.labels ? ' checked' : '') + '> <span>Atom labels</span></label>';
      if (!Z.model.hideH) h += '<label class="check"><input type="checkbox" id="showH"' + (Z.showH ? ' checked' : '') + '> <span>Hydrogen atoms</span></label>';
      if (Z.model.angle) h += '<label class="check"><input type="checkbox" id="angle"' + (Z.angle ? ' checked' : '') + '> <span>Bond angle</span></label>';
      h += '<label class="check"><input type="checkbox" id="spin"' + (Z.spin ? ' checked' : '') + '> <span>Turn slowly</span></label>';
      if (Z.pair === 'mirror') h += '<button type="button" class="btn primary" id="superBtn">' + (Z.sup ? 'Separate them again' : 'Try to superimpose') + '</button>';
      h += '<button type="button" class="btn" id="resetView">Reset view</button>';
      h += '<p class="hint-line">Drag to turn the model' + (Z.pair ? 's together' : '') + '.</p>';
    } else if (st.mode === 'colour') {
      var C = st.col;
      h += '<h3>Compare</h3><div class="list">' + T.COMPARE.map(function (cp) {
        var on = C.compare === cp.id;
        return '<button type="button" class="pick" data-compare="' + cp.id + '" aria-pressed="' + on + '"><span>' + cp.label + '<small>' + F(colOf(cp.a).f) + ' ⇄ ' + F(colOf(cp.b).f) + '</small></span></button>';
      }).join('') + '</div>';
      if (C.compare) {
        var cp = T.COMPARE.filter(function (x) { return x.id === C.compare; })[0];
        h += '<div class="grid2"><button type="button" class="pick" data-col="' + cp.a + '" aria-pressed="' + (C.id === cp.a) + '">' + sw(colOf(cp.a).colour) + '<span>' + F(colOf(cp.a).f) + '</span></button><button type="button" class="pick" data-col="' + cp.b + '" aria-pressed="' + (C.id === cp.b) + '">' + sw(colOf(cp.b).colour) + '<span>' + F(colOf(cp.b).f) + '</span></button></div>';
      }
      h += '<h3>Complex</h3><div class="list">' + T.COLOUR.map(function (cc) {
        return '<button type="button" class="pick" data-col="' + cc.id + '" aria-pressed="' + (C.id === cc.id) + '">' + sw(cc.colour) + '<span>' + F(cc.f) + '<small>' + cc.seen + ' · d' + cc.d + '</small></span></button>';
      }).join('') + '</div>';
      h += '<h3>Light</h3><div class="grid2"><button type="button" class="pick" data-light="white" aria-pressed="' + (C.mode === 'white') + '">White light</button><button type="button" class="pick" data-light="probe" aria-pressed="' + (C.mode === 'probe') + '">One colour</button></div>';
      if (C.mode === 'probe') h += '<label class="range">Wavelength: <output id="probeOut">' + C.probe + ' nm</output><input type="range" id="probe" min="400" max="750" step="5" value="' + C.probe + '"></label>';
    } else {
      var K = st.cm;
      h += '<h3>1 · Choose a filter</h3><div class="grid3">' + FILTERS.map(function (f) {
        return '<button type="button" class="pick" data-filter="' + f.id + '" aria-pressed="' + (K.filter.id === f.id) + '">' + sw(f.hex) + f.name + '</button>';
      }).join('') + '</div>';
      h += '<h3>2 · Zero the colorimeter</h3><button type="button" class="btn" id="cmZero"' + (K.zeroed ? ' aria-pressed="true"' : '') + '>Measure distilled water</button>';
      h += '<h3>3 · Measure the standards</h3><div class="grid3">' + STANDARDS.map(function (c) {
        var done = K.points.some(function (p) { return p.c === c; });
        return '<button type="button" class="pick" data-std="' + c + '" aria-pressed="' + done + '"' + (K.zeroed ? '' : ' disabled') + '>' + c.toFixed(2) + '</button>';
      }).join('') + '</div><p class="hint-line">Concentrations of {Cu^2+}, in mol dm⁻³</p>'.replace('{Cu^2+}', F('Cu^2+'));
      h += '<h3>4 · Draw the calibration line</h3><button type="button" class="btn" id="cmLine"' + (K.points.length >= 3 ? '' : ' disabled') + '>Line of best fit</button>';
      h += '<h3>5 · Measure the unknown</h3><button type="button" class="btn" id="cmUnknown"' + (K.zeroed ? '' : ' disabled') + '>Measure the unknown</button>';
      h += '<button type="button" class="btn" id="cmReset">New unknown, start again</button>';
    }
    c.innerHTML = h;
  }
  function shapeHint(s) {
    return { oct: 'octahedral', tet: 'tetrahedral', sqp: 'square planar', lin: 'linear', ct_oct: 'octahedral, cis and trans', ct_sqp: 'square planar, cis and trans', opt_en: 'bidentate en', opt_ox: 'bidentate ethanedioate', cis_en2: 'chiral?', trans_en2: 'chiral?', edta: 'hexadentate' }[s.id];
  }

  /* ============================ Explanations ============================ */
  function dLabel(d) { return d == null ? '3d⁰ is not relevant: Al is not a transition metal' : '3d' + String(d).replace(/[0-9]/g, function (x) { return '⁰¹²³⁴⁵⁶⁷⁸⁹'[x]; }); }
  function factsCard(sp) {
    var cn = sp.cn ? sp.cn : '—';
    return '<dl class="facts"><dt>Formula</dt><dd>' + F(sp.f) + '</dd>' +
      '<dt>Seen as</dt><dd>' + (sp.colour ? '<span class="swatch" style="background:' + sp.colour + '"></span>' : '') + sp.col + '</dd>' +
      '<dt>Shape</dt><dd>' + sp.shape + '</dd><dt>Co-ordination no.</dt><dd>' + cn + '</dd>' +
      '<dt>Oxidation state</dt><dd>' + sp.ox + '</dd>' +
      '<dt>d electrons</dt><dd>' + (sp.d == null ? 'none: Al³⁺ is not a transition metal ion' : dLabel(sp.d)) + '</dd></dl>';
  }
  function renderInfo() {
    var h = '';
    if (st.mode === 'lab') {
      var L = st.lab, o = L.view || labOutcome(), ion = ionOf(L.ion);
      if (L.pending) {
        var opts = labPredictOptions();
        h += '<section class="card"><h3>Predict: what will you see?</h3><p>' + tx('{' + T.SP[ion.start].f + '}') + ' with ' + (L.pending === 'few' ? 'a few drops of ' : 'excess ') + rgOf(L.rg).what + '.</p><div class="opts">' +
          opts.map(function (x, i) { return '<button type="button" class="opt-btn" data-guess="' + i + '" data-right="' + x.right + '">' + sw(x.o.ppt || x.o.sol) + '<span>' + tx(x.o.obs) + '</span></button>'; }).join('') + '</div></section>';
      } else {
        h += '<section class="card"><h3>What you see</h3><p class="obs">' + tx(o.obs) + '</p>';
        if (o.kind) h += '<span class="tagline">' + o.kind + '</span>';
        if (o.eq) h += '<p class="eqn">' + F(o.eq) + '</p>';
        if (o.overall) h += '<p>Overall: <span class="eqn">' + F(o.overall) + '</span></p>';
        if (o.why) h += '<p>' + tx(o.why) + '</p>';
        if (o.chelate) h += '<p class="fb note"><b>Particles:</b> ' + o.chelate[0] + ' on the left → ' + o.chelate[1] + ' on the right. More particles, more ways to arrange them: ΔS is positive.</p>';
        if (!L.rg) h += '<p>Choose a reagent to add.</p>';
        h += '</section>';
        var sp = T.SP[o.sp];
        if (sp) h += '<section class="card"><h3>The metal species</h3>' + factsCard(sp) + '</section>';
      }
      // Summary table for this ion.
      var rows = Object.keys(T.R[L.ion]).map(function (rg) {
        var r = T.R[L.ion][rg];
        return '<tr><th>' + tx(rgOf(rg).mk) + '</th><td>' + tx(r.few.obs) + '</td><td>' + (r.excess.nochange ? 'no change' : tx(r.excess.obs)) + '</td></tr>';
      }).join('');
      h += '<section class="card"><details' + (L.pending ? '' : ' open') + '><summary>All reactions of ' + F(T.SP[ion.start].f) + '</summary><table class="mini"><thead><tr><th>Reagent</th><th>A few drops</th><th>In excess</th></tr></thead><tbody>' + rows + '</tbody></table></details>' +
        (ion.id === 'fe3' ? '<p class="spec-ref">Pure ' + F('[Fe(H2O)6]3+') + ' is pale violet. Its solutions look yellow-brown because some of it has already lost an H⁺ (hydrolysis).</p>' : '') +
        '<p class="spec-ref">AQA A-level Chemistry ' + ion.spec + '</p></section>';
      h += '<section class="card"><details><summary>Why 3+ ions are more acidic than 2+</summary><p>' + tx('{M^3+} ions are smaller and more highly charged than {M^2+} ions: they have a higher charge density. They pull electron density from the O–H bonds of the water ligands more strongly, so {H^+} is released more easily:') + '</p><p class="eqn">' + F('[Fe(H2O)6]3+ + H2O ⇌ [Fe(H2O)5(OH)]2+ + H3O^+') + '</p><p>' + tx('That is why 3+ aqua ions release {CO2} from carbonate and 2+ ions give a carbonate precipitate.') + '</p></details></section>';
    } else if (st.mode === 'shapes') {
      var Z = st.shape, md = Z.model;
      h += '<section class="card"><h3>' + tx(md.title) + '</h3><p>' + tx(md.sub) + '</p><p>' + tx(md.foot) + '</p></section>';
      if (Z.pair === 'mirror') {
        h += '<section class="card"><h3>Optical isomers?</h3><p>Optical isomers are non-superimposable mirror images. The right-hand model is the mirror image of the left. Press <b>Try to superimpose</b>: the computer tries every way of turning the mirror image to fit it over the original.</p>';
        if (Z.verdict && Z.sup && performance.now() - Z.sup.t0 > 1700) h += '<p class="fb ' + (Z.sup.bad.length ? 'bad' : 'good') + '">' + Z.verdict + '</p>';
        h += '</section>';
      } else if (Z.pair === 'ct') {
        h += '<section class="card"><h3>Cis or trans?</h3><p><b>cis:</b> the two identical ligands are next to each other, at 90°.</p><p><b>trans:</b> they are opposite each other, at 180°.</p><p>Both isomers have a plane of symmetry, so neither has an optical isomer.</p></section>';
      }
      h += '<section class="card"><h3>Shapes to know</h3><table class="mini"><thead><tr><th>Shape</th><th>Angle</th><th>Example</th></tr></thead><tbody>' +
        '<tr><td>octahedral</td><td>90°</td><td>' + F('[Cu(H2O)6]2+') + ', small ligands</td></tr><tr><td>tetrahedral</td><td>109.5°</td><td>' + F('[CuCl4]2−') + ', larger ligands</td></tr>' +
        '<tr><td>square planar</td><td>90°</td><td>cisplatin ' + F('[Pt(NH3)2Cl2]') + '</td></tr><tr><td>linear</td><td>180°</td><td>' + F('[Ag(NH3)2]+') + '</td></tr></tbody></table>' +
        '<p class="spec-ref">AQA A-level Chemistry 3.2.5.3. Isomerism with bidentate ligands: optical. With monodentate ligands: cis–trans.</p></section>';
    } else if (st.mode === 'colour') {
      var C = st.col, c = C.c, K = T.K;
      h += '<section class="card"><h3>Why ' + F(c.f) + ' is ' + c.seen + '</h3>';
      if (c.lam) {
        h += '<ol class="steps"><li class="done">White light falls on the solution.</li><li class="done">A d electron absorbs a photon whose energy matches ΔE, and moves from the ground state to an excited state.</li><li class="done">Light of that frequency (around ' + c.lam + ' nm) is removed.</li><li class="done">The wavelengths left are transmitted: we see their mixture, ' + c.seen + '.</li></ol>';
      } else {
        h += '<p>' + (c.d === 0 ? tx('{' + c.ion + '} has no d electrons (3d⁰), so there is no electron to promote.') : tx('{' + c.ion + '} has a full d sub-level (3d¹⁰): there is no space in a higher d orbital for an electron to move into.')) + ' No visible light is absorbed, so the solution is colourless.</p>';
      }
      h += '</section>';
      if (c.lam) {
        var lamM = c.lam * 1e-9, E = K.h * K.c / lamM, nu = K.c / lamM;
        h += '<section class="card"><h3>ΔE = hν = hc/λ</h3><div class="calc"><p>λ = ' + c.lam + ' nm = ' + c.lam + ' × 10⁻⁹ m</p><p>ΔE = (6.63 × 10⁻³⁴ × 3.00 × 10⁸) ÷ (' + c.lam + ' × 10⁻⁹)</p><p><b>ΔE = ' + D.sci(E) + ' J</b> per photon</p><p>ν = c/λ = ' + D.sci(nu) + ' Hz</p><p>Per mole: ' + D.sci(E) + ' × 6.022 × 10²³ ÷ 1000 = <b>' + Math.round(E * K.NA / 1000) + ' kJ mol⁻¹</b></p></div><p class="spec-ref">h = 6.63 × 10⁻³⁴ J s, c = 3.00 × 10⁸ m s⁻¹ (AQA data sheet)</p></section>';
      }
      if (C.mode === 'probe') {
        var Ep = K.h * K.c / (C.probe * 1e-9), ab = D.absorbs(c, C.probe);
        h += '<section class="card"><h3>One colour: ' + C.probe + ' nm</h3><p>Photon energy = ' + D.sci(Ep) + ' J</p><p class="fb ' + (ab ? 'good' : 'note') + '">' + (ab ? 'Close enough to ΔE: this light is absorbed and a d electron is promoted.' : 'Doesn’t match ΔE: this light passes straight through.') + '</p></section>';
      }
      if (C.compare) {
        var cp = T.COMPARE.filter(function (x) { return x.id === C.compare; })[0];
        h += '<section class="card"><h3>' + cp.label + '</h3><p>' + tx(cp.text) + '</p>' + compareTable(cp) + '</section>';
      }
      h += '<section class="card"><h3>What changes ΔE?</h3><p>Changes in <b>oxidation state</b>, <b>co-ordination number</b> and <b>ligand</b> alter ΔE, so a different frequency of light is absorbed and the colour changes.</p>' +
        '<details class="beyond"><summary>Beyond AQA</summary><p>The ligands split the five d orbitals into two sets: three lower and two higher in an octahedral complex, the other way round in a tetrahedral one. Some colours, such as yellow ' + F('[CuCl4]2−') + ' and purple ' + F('MnO4^−') + ', come mostly from charge transfer between ligand and metal, not from d electrons moving between d orbitals.</p><p>The energy absorbed is soon passed to the surroundings as heat: the solution does not glow.</p></details>' +
        '<p class="spec-ref">AQA A-level Chemistry 3.2.5.4</p></section>';
    } else {
      var Km = st.cm, stepNow = !Km.zeroed ? 1 : Km.points.length < 3 ? 2 : !Km.line ? 3 : Km.unknownA == null ? 4 : 5;
      var steps = ['Choose the filter of the colour the solution absorbs most: the complementary colour to the solution.', 'Zero the colorimeter with a cuvette of distilled water.', 'Measure the absorbance of standard solutions of known concentration.', 'Plot absorbance against concentration and draw the line of best fit: the calibration graph.', 'Measure the unknown and read its concentration from the graph.'];
      h += '<section class="card"><h3>Finding a concentration by colorimetry</h3><ol class="steps">' + steps.map(function (s, i) { return '<li class="' + (i < stepNow ? 'done' : i === stepNow ? 'now' : '') + '">' + s + '</li>'; }).join('') + '</ol></section>';
      if (Km.points.length) {
        h += '<section class="card"><h3>Results</h3><table class="mini"><thead><tr><th>[Cu²⁺] / mol dm⁻³</th><th class="num">Absorbance</th></tr></thead><tbody>' +
          Km.points.map(function (p) { return '<tr><td>' + p.c.toFixed(2) + '</td><td class="num">' + p.A.toFixed(3) + '</td></tr>'; }).join('') +
          (Km.unknownA != null ? '<tr><td>unknown</td><td class="num">' + Km.unknownA.toFixed(3) + '</td></tr>' : '') + '</tbody></table></section>';
      }
      if (Km.unknownA != null) {
        h += '<section class="card"><h3>Read the unknown from the graph</h3><div class="calc-row"><input type="text" inputmode="decimal" id="cmAns" placeholder="e.g. 0.25" aria-label="Concentration of the unknown, mol dm⁻³" value="' + (Km.ansText || '') + '"><span>mol dm⁻³</span><button type="button" class="btn sm" id="cmCheck">Check</button></div>' +
          (Km.answer ? '<p class="fb ' + (Km.answer.good ? 'good' : 'bad') + '">' + Km.answer.msg + '</p>' : '') + '</section>';
      }
      var best = Km.filter.id === 'red' || Km.filter.id === 'orange';
      h += '<section class="card"><h3>Why this filter?</h3><p>' + tx('{[Cu(H2O)6]2+} is blue because it absorbs red and orange light. A ' + Km.filter.name + ' filter') + ' ' +
        (best ? 'lets through light the solution absorbs strongly, so the absorbance changes a lot with concentration: a steep, accurate calibration line.' : 'lets through light the solution hardly absorbs, so the absorbance barely changes with concentration. Try the complementary colour.') + '</p>' +
        '<p>Adding excess ammonia first turns the copper into deep blue ' + F('[Cu(NH3)4(H2O)2]2+') + ', which absorbs more strongly: useful for dilute solutions.</p><p class="spec-ref">AQA A-level Chemistry 3.2.5.4: a simple colorimeter can be used to determine the concentration of coloured ions.</p></section>';
    }
    $('#info').innerHTML = h;
  }
  function compareTable(cp) {
    var a = colOf(cp.a), b = colOf(cp.b);
    function kj(c) { return c.lam ? Math.round(T.K.h * T.K.c / (c.lam * 1e-9) * T.K.NA / 1000) + ' kJ mol⁻¹' : '—'; }
    return '<table class="mini"><thead><tr><th></th><th>' + F(a.f) + '</th><th>' + F(b.f) + '</th></tr></thead><tbody>' +
      '<tr><th>d electrons</th><td>' + dLabel(a.d) + '</td><td>' + dLabel(b.d) + '</td></tr>' +
      '<tr><th>absorbs</th><td>' + (a.lam ? a.lam + ' nm' : 'none') + '</td><td>' + (b.lam ? b.lam + ' nm' : 'none') + '</td></tr>' +
      '<tr><th>ΔE</th><td>' + kj(a) + '</td><td>' + kj(b) + '</td></tr>' +
      '<tr><th>seen as</th><td>' + a.seen + '</td><td>' + b.seen + '</td></tr></tbody></table>';
  }

  /* Short text for the board: the shared presenter makes these into slides. */
  function renderNotes() {
    var h = '';
    if (st.mode === 'lab') {
      var L = st.lab, o = L.view || labOutcome();
      if (L.pending) h = '<h3>Predict</h3><p>What will you see when ' + rgOf(L.rg).what + ' is added' + (L.pending === 'few' ? ', a few drops at a time' : ' in excess') + '?</p>';
      else {
        h = '<h3>' + tx(o.obs) + '</h3>';
        if (o.eq) h += '<p>' + F(o.eq) + '</p>';
        if (o.why) h += '<p>' + tx(o.why) + '</p>';
      }
    } else if (st.mode === 'shapes') {
      var Z = st.shape;
      h = '<h3>' + tx(Z.model.title) + '</h3><p>' + tx(Z.model.sub) + '</p>';
      if (Z.verdict && Z.sup && performance.now() - Z.sup.t0 > 1700) h += '<p>' + Z.verdict + '</p>';
    } else if (st.mode === 'colour') {
      var c = st.col.c;
      h = '<h3>Why ' + F(c.f) + ' is ' + c.seen + '</h3>';
      h += c.lam ? '<p>A d electron absorbs light of energy ΔE and moves from the ground state to an excited state.</p><p>ΔE = hν = hc/λ, so one frequency of light is absorbed.</p><p>The light that is not absorbed is transmitted: we see ' + c.seen + '.</p>'
        : '<p>' + (c.d === 0 ? 'No d electrons to promote.' : 'A full d sub-level: no space for an electron to move into.') + ' No visible light is absorbed, so it is colourless.</p>';
      if (st.col.compare) h += '<p>' + tx(T.COMPARE.filter(function (x) { return x.id === st.col.compare; })[0].text) + '</p>';
    } else {
      h = '<h3>Colorimetry</h3><p>Use a filter of the complementary colour. Zero with water, measure standards, draw a calibration graph, then read the unknown from it.</p>';
    }
    $('#boardNotes').innerHTML = h;
  }

  /* ============================ Head of the stage ============================ */
  var HEADS = {
    lab: { k: 'Ligand substitution and metal-aqua ions', t: 'Add a reagent and watch the complex change', p: 'Precipitates, colour changes and the equation for each step. AQA 3.2.5.2 and 3.2.6.' },
    shapes: { k: 'Shapes of complex ions', t: 'Turn the complex, then look for isomers', p: 'Octahedral, tetrahedral, square planar and linear complexes; cis–trans and optical isomers. AQA 3.2.5.3.' },
    colour: { k: 'Formation of coloured ions', t: 'Why transition metal complexes are coloured', p: 'd electrons absorb light of energy ΔE = hν = hc/λ; the rest is transmitted. AQA 3.2.5.4.' },
    cm: { k: 'Visible spectroscopy', t: 'Find the concentration of copper(II) ions', p: 'Choose a filter, build a calibration graph and read an unknown from it. AQA 3.2.5.4.' }
  };
  function setMode(m) {
    st.mode = m; st.dirty = true;
    $$('#modes button').forEach(function (b) { b.setAttribute('aria-selected', b.dataset.mode === m); b.tabIndex = b.dataset.mode === m ? 0 : -1; });
    var hd = HEADS[m];
    $('#actHead').innerHTML = '<span class="kicker">' + hd.k + '</span><h2>' + hd.t + '</h2><p>' + hd.p + '</p>';
    $('#cv').classList.toggle('grab', m === 'lab' || m === 'shapes');
    try { history.replaceState(null, '', '#' + m); } catch (e) { /* file:// */ }
    renderControls(); renderInfo(); renderNotes();
  }

  /* ============================ Events ============================ */
  function onClick(e) {
    var b = e.target.closest('button');
    if (!b) return;
    var d = b.dataset;
    if (d.mode) return setMode(d.mode);
    if (st.mode === 'lab') {
      var L = st.lab;
      if (d.ion) { clearTimeout(L.timer); return setLab({ ion: d.ion, rg: null, stage: 'none', pending: null }); }
      if (d.rg) { clearTimeout(L.timer); return setLab({ rg: d.rg, stage: 'none', pending: null }); }
      if (b.id === 'addFew') return addStage('few');
      if (b.id === 'addExcess') return addStage('excess');
      if (b.id === 'addWater') { L.dropAt = performance.now(); setLab({ stage: 'water' }); return say(plain(labOutcome().obs)); }
      if (b.id === 'newTube') { clearTimeout(L.timer); return setLab({ stage: 'none', pending: null }); }
      if (d.guess != null) {
        var right = d.right === 'true';
        $$('.opt-btn[data-guess]').forEach(function (x) { x.disabled = true; if (x.dataset.right === 'true') x.classList.add('right'); });
        if (!right) b.classList.add('wrong');
        say(right ? 'Correct.' : 'Not this time.');
        var stage = L.pending;
        setTimeout(function () {
          L.pending = null;
          if (stage === 'excess' && L.stage === 'none') setLab({ stage: 'few' });
          setLab({ stage: stage });
        }, 1100);
        return;
      }
    } else if (st.mode === 'shapes') {
      if (d.shape) return setShape(d.shape);
      if (b.id === 'superBtn') return trySuperimpose();
      if (b.id === 'resetView') { st.shapeR = mm.mm(mm.rotX(-0.4), mm.rotY(0.55)); st.shape.sup = null; st.shape.verdict = null; st.dirty = true; renderControls(); renderInfo(); renderNotes(); return; }
    } else if (st.mode === 'colour') {
      var C = st.col;
      if (d.compare) {
        var cp = T.COMPARE.filter(function (x) { return x.id === d.compare; })[0];
        if (C.compare === cp.id) return setColour(C.id === cp.a ? cp.b : cp.a, true);
        C.compare = cp.id; return setColour(cp.a, true);
      }
      if (d.col) {
        var inCmp = C.compare && T.COMPARE.some(function (x) { return x.id === C.compare && (x.a === d.col || x.b === d.col); });
        return setColour(d.col, inCmp);
      }
      if (d.light) { C.mode = d.light; C.photons = []; renderControls(); renderInfo(); return; }
    } else {
      if (d.filter) return cmAction('filter', d.filter);
      if (d.std) return cmAction('std', parseFloat(d.std));
      if (b.id === 'cmZero') return cmAction('zero');
      if (b.id === 'cmLine') return cmAction('line');
      if (b.id === 'cmUnknown') return cmAction('unknown');
      if (b.id === 'cmReset') return cmAction('reset');
      if (b.id === 'cmCheck') { st.cm.ansText = $('#cmAns').value; return cmAction('check', $('#cmAns').value); }
    }
  }
  function onChange(e) {
    var t = e.target, Z = st.shape;
    if (t.id === 'predict') { st.lab.predict = t.checked; return; }
    if (t.id === 'mirror') return toggleMirror(t.checked);
    if (t.id === 'labels') Z.labels = t.checked;
    if (t.id === 'showH') Z.showH = t.checked;
    if (t.id === 'angle') Z.angle = t.checked;
    if (t.id === 'spin') Z.spin = t.checked;
    st.dirty = true;
  }
  function onInput(e) {
    if (e.target.id === 'probe') {
      st.col.probe = +e.target.value; $('#probeOut').textContent = st.col.probe + ' nm';
      st.col.photons = []; st.dirty = true;
      clearTimeout(st.col.infoT); st.col.infoT = setTimeout(renderInfo, 120);
    }
  }

  // Dragging turns the model.
  var drag = null;
  function canDrag(x, y) {
    if (st.mode === 'shapes') return true;
    if (st.mode === 'lab') { var b = st.lab.modelBox; return b && x >= b.x && x <= b.x + b.w && y >= b.y && y <= b.y + b.h; }
    return false;
  }
  function pointer(cv) {
    cv.addEventListener('pointerdown', function (e) {
      var r = cv.getBoundingClientRect(), x = e.clientX - r.left, y = e.clientY - r.top;
      if (!canDrag(x, y)) return;
      drag = { x: e.clientX, y: e.clientY }; cv.setPointerCapture(e.pointerId); cv.classList.add('grabbing');
      if (st.mode === 'shapes' && st.shape.sup) { st.shape.sup = null; st.shape.verdict = null; renderControls(); renderInfo(); renderNotes(); }
    });
    cv.addEventListener('pointermove', function (e) {
      if (!drag) return;
      var dx = (e.clientX - drag.x) * 0.01, dy = (e.clientY - drag.y) * 0.01;
      drag.x = e.clientX; drag.y = e.clientY;
      var key = st.mode === 'lab' ? 'labR' : 'shapeR';
      st[key] = mm.ortho(mm.mm(mm.mm(mm.rotX(dy), mm.rotY(dx)), st[key]));
      st.dirty = true;
    });
    function end() { drag = null; cv.classList.remove('grabbing'); }
    cv.addEventListener('pointerup', end); cv.addEventListener('pointercancel', end);
    cv.addEventListener('keydown', function (e) {
      var k = { ArrowLeft: [0, -0.15], ArrowRight: [0, 0.15], ArrowUp: [-0.15, 0], ArrowDown: [0.15, 0] }[e.key];
      if (!k || (st.mode !== 'shapes' && st.mode !== 'lab') || document.body.classList.contains('presenting')) return;
      e.preventDefault();
      var key = st.mode === 'lab' ? 'labR' : 'shapeR';
      st[key] = mm.ortho(mm.mm(mm.mm(mm.rotX(k[0]), mm.rotY(k[1])), st[key])); st.dirty = true;
    });
  }

  /* ============================ Animation loop ============================ */
  var cv, ctx, cw = 0, ch = 0, last = 0;
  function size() {
    var r = cv.getBoundingClientRect(), dpr = Math.min(2, window.devicePixelRatio || 1);
    if (Math.round(r.width * dpr) !== cv.width || Math.round(r.height * dpr) !== cv.height) {
      cv.width = Math.round(r.width * dpr); cv.height = Math.round(r.height * dpr); st.dirty = true;
    }
    cw = r.width; ch = r.height;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }
  function animating(t) {
    if (st.mode === 'lab') { var L = st.lab; return t - L.changedAt < 1000 || (L.pptAt && t - L.pptAt < 9000) || (L.view && L.view.gas) || (L.dropAt && t - L.dropAt < 1500) || !drag; }
    if (st.mode === 'shapes') return st.shape.spin || (st.shape.sup && t - st.shape.sup.t0 < 1900);
    if (st.mode === 'colour') return true;
    return false;
  }
  function loop(t) {
    requestAnimationFrame(loop);
    var dt = Math.min(64, t - (last || t)); last = t;
    if (st.mode === 'lab' && !drag && !document.hidden) { st.labR = mm.mm(mm.rotY(dt * 0.00035), st.labR); }
    if (st.mode === 'shapes' && st.shape.spin && !drag && !st.shape.sup) st.shapeR = mm.mm(mm.rotY(dt * 0.0003), st.shapeR);
    if (st.mode === 'colour') {
      var C = st.col, target = gapFor(C.c);
      C.gapPx += (target - C.gapPx) * Math.min(1, dt / 160);
      if (t > C.nextPhoton) { spawnPhoton(t); C.nextPhoton = t + (C.mode === 'probe' ? 1300 : 520); }
    }
    if (!st.dirty && !animating(t)) return;
    st.dirty = false;
    size();
    D.frame(ctx, cw, ch, st, t);
  }

  /* ============================ Printing ============================ */
  function openPrint() {
    if (window.SST_PRESENTER) SST_PRESENTER.toggle(false);
    $('#pWs1').checked = true; $('#pWs2').checked = true; $('#pMs1').checked = false; $('#pMs2').checked = false;
    $('#printDlg').returnValue = '';   // Esc keeps the old value: never let it mean "print"
    $('#printDlg').showModal();
  }
  function doPrint() {
    var b = document.body, cls = ['print-custom'];
    [['pWs1', 'p-ws1'], ['pMs1', 'p-ms1'], ['pWs2', 'p-ws2'], ['pMs2', 'p-ms2']].forEach(function (x) { if ($('#' + x[0]).checked) cls.push(x[1]); });
    if (cls.length === 1) return;
    cls.forEach(function (c) { b.classList.add(c); });
    var title = document.title;
    document.title = 'Transition metal complexes — questions';
    function done() { document.title = title; cls.forEach(function (c) { b.classList.remove(c); }); window.removeEventListener('afterprint', done); }
    window.addEventListener('afterprint', done);
    setTimeout(function () { window.print(); }, 60);
  }

  /* ============================ Start ============================ */
  function init() {
    cv = $('#cv'); ctx = cv.getContext('2d');
    $('#modes').innerHTML = MODES.map(function (m) {
      return '<button type="button" role="tab" data-mode="' + m.id + '" aria-selected="false" aria-controls="stage"><span class="n">' + m.n + '</span>' + m.label + ' <span class="spec">' + m.spec + '</span></button>';
    }).join('');
    $('#modes').addEventListener('keydown', function (e) {
      if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') return;
      e.preventDefault();
      var i = MODES.findIndex(function (m) { return m.id === st.mode; }), n = MODES[(i + (e.key === 'ArrowRight' ? 1 : MODES.length - 1)) % MODES.length];
      setMode(n.id); $('#modes [aria-selected="true"]').focus();
    });
    document.addEventListener('click', onClick);
    $('#controls').addEventListener('change', onChange);
    $('#controls').addEventListener('input', onInput);
    $('#info').addEventListener('keydown', function (e) { if (e.key === 'Enter' && e.target.id === 'cmAns') { e.preventDefault(); $('#cmCheck').click(); } });
    pointer(cv);
    $('#btnPresent').addEventListener('click', function () { if (window.SST_PRESENTER) SST_PRESENTER.toggle(); });
    $('#btnAnnotate').addEventListener('click', function () { var n = document.querySelector('.sst-bar .sst-ink-nav:not(.sst-pres-nav)'); if (n) n.click(); });
    $('#btnPrint').addEventListener('click', openPrint);
    $('#printDlg').addEventListener('close', function () { if ($('#printDlg').returnValue === 'print') doPrint(); });
    document.addEventListener('sst-theme', function () { st.dirty = true; });
    window.addEventListener('resize', function () { st.dirty = true; });
    if (window.ResizeObserver) new ResizeObserver(function () { st.dirty = true; }).observe($('#stage'));
    new MutationObserver(function () { st.dirty = true; }).observe(document.body, { attributes: true, attributeFilter: ['class'] });
    if (window.SST_PRESENTER) SST_PRESENTER.setup({ stage: '#stage', side: '#controls', notes: '#boardNotes', hide: '#srLive' });
    var pr = /[?&]print=([a-z0-9,-]+)/.exec(location.search);
    if (pr) pr[1].split(',').forEach(function (k) { if (/^(ws|ms)[12]$/.test(k)) document.body.classList.add('print-custom', 'p-' + k); });

    cmReset();
    setShape('oct');
    st.col.c = colOf(st.col.id);
    setLab({ ion: 'cu' });
    var m = /^#(lab|shapes|colour|cm)\b/.exec(location.hash);
    setMode(m ? m[1] : 'lab');
    requestAnimationFrame(loop);
  }
  // For checks in the console and page tests.
  window.TMPage = { st: st, setMode: setMode, setLab: setLab, setShape: setShape, setColour: setColour, trySuperimpose: trySuperimpose, cmAction: cmAction, SHAPES: SHAPES };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
})();
