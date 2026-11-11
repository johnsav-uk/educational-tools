/* NMR Spectroscopy, Sections E and F.
   E rule     n slider, splitting tree, Pascal row and the spectrum of one signal
   E real     splitting in real molecules: tap a signal, see the H on the adjacent carbon
   E predict  predict the pattern, with feedback that names the slip
   F viewer   ¹³C spectra      F symmetry  how many lines?      F isomers  ¹³C of isomer pairs                     */
(function () {
  'use strict';
  var NMR = window.NMR, U = NMR.U;
  var st = { n: 3, k: 2, realMol: 'ethanol', cMol: 'butanone', cPair: 0 };

  /* ───────── E: the n + 1 rule ───────── */
  function demoMol(n, k) { return { id: 'demo' + n + k, name: 'one signal', H: [{ id: 'a', d: 2.0, n: k, nb: n, J: 7, lab: 'the signal' }], C: [] }; }
  function treeSVG(n) {
    var W = 420, top = 30, lvl = n ? Math.min(46, 190 / n) : 0, H = top + n * lvl + 120, cx = W / 2, sp = Math.min(70, 420 / Math.max(1, n)), s = '';
    var pos = [0];
    sp = Math.min(64, 330 / Math.max(1, n));
    s += '<line class="ln" x1="' + cx + '" y1="' + (top - 18) + '" x2="' + cx + '" y2="' + top + '"/>';
    s += '<text x="' + (cx + 8) + '" y="' + (top - 6) + '">one line</text>';
    for (var i = 0; i < n; i++) {
      var y0 = top + i * lvl, y1 = y0 + lvl, nxt = [];
      pos.forEach(function (p) { [-0.5, 0.5].forEach(function (d) { var q = p + d; s += '<path class="br" d="M' + (cx + p * sp) + ' ' + y0 + ' L' + (cx + q * sp) + ' ' + y1 + '"/>'; if (nxt.indexOf(q) < 0) nxt.push(q); }); });
      pos = nxt.sort(function (a, b) { return a - b; });
      s += '<text class="nb" x="4" y="' + (y1 - 4) + '">+ H ' + (i + 1) + '</text>';
    }
    var row = NMR.pascal(n), yb = top + n * lvl + 100, hmax = 82, mx = Math.max.apply(null, row);
    pos.forEach(function (p, j) {
      var x = cx + p * sp, h = hmax * row[j] / mx;
      s += '<line class="br" x1="' + x + '" y1="' + (top + n * lvl) + '" x2="' + x + '" y2="' + (yb - h) + '" />';
      s += '<line class="pk" x1="' + x + '" y1="' + yb + '" x2="' + x + '" y2="' + (yb - h) + '"/>';
      s += '<text class="num" x="' + x + '" y="' + (yb + 16) + '" text-anchor="middle">' + row[j] + '</text>';
    });
    return '<svg class="tree-svg" viewBox="0 0 ' + W + ' ' + (yb + 22) + '" role="img" aria-label="Splitting tree for ' + n + ' neighbouring hydrogens">' + s + '</svg>';
  }
  function pascalHTML(n) {
    var h = '';
    for (var r = 0; r <= 6; r++) h += '<button type="button" class="pr' + (r === n ? ' on' : '') + (Math.abs(r - n) <= 1 ? ' near' : '') + (r > 3 ? ' ext' : '') + '" data-n="' + r + '"><span class="n">n = ' + r + '</span>' + NMR.pascal(r).map(function (x) { return '<b>' + x + '</b>'; }).join('') + '<span class="n2">' + NMR.pattern(r) + '</span></button>';
    return h;
  }
  function rule(ctx) {
    var sp = U.panel('One signal, split by n hydrogens on the adjacent carbon', { stage: true });
    var cards = U.el('div', { cls: 'twocards' }), host = U.el('div', { cls: 'nv' });
    sp.body.appendChild(cards); sp.body.appendChild(host); ctx.vis.appendChild(sp.el);
    var v = ctx.view(host, { nuc: 'H', integ: true, fixedMax: true, tools: false, alt: 'One split signal' });
    var tp = U.panel('Splitting tree', {}), tree = U.el('div'); tp.body.appendChild(tree);
    var pp = U.panel('Pascal\'s triangle: the relative heights', { stage: true }), pas = U.el('div', { cls: 'pascal' }); pp.body.appendChild(pas);
    var g = U.el('div', { cls: 'grid2' }); g.appendChild(pp.el); g.appendChild(tp.el); ctx.vis.appendChild(g);
    var nS = U.slider('n: H on the adjacent carbon(s)', { min: 0, max: 6, value: st.n, fmt: function (x) { return x + (x > 3 ? ' (extension)' : ''); } }, function (x) { st.n = x; draw(); });
    var kS = U.slider('H on this carbon (CH, CH₂, CH₃)', { min: 1, max: 3, value: st.k, fmt: function (x) { return ['', 'CH', 'CH₂', 'CH₃'][x]; } }, function (x) { st.k = x; draw(); });
    ctx.ctl.appendChild(nS); ctx.ctl.appendChild(kS);
    var note = U.el('p', { cls: 'hint' }); ctx.ctl.appendChild(note);
    pas.addEventListener('click', function (e) { var b = e.target.closest('.pr'); if (b) { st.n = +b.dataset.n; nS.set(st.n); draw(); } });
    function draw() {
      var n = st.n, k = st.k, row = NMR.pascal(n), spec = NMR.build(demoMol(n, k), 'H', { seed: 'rule' });
      spec.ymax = NMR.build(demoMol(n, 3), 'H', { seed: 'rule' }).ymax * 1.1; v.setSpec(spec, true); v.setRange(1.45, 2.55);
      var lines = spec.lines.filter(function (l) { return l.kind === 'sample'; });
      v.marks = lines.map(function (l, j) { return { x: l.x, t: String(row[j]) }; }); v.draw();
      cards.innerHTML = '<div class="kcard a"><div class="k">Number of peaks</div><div class="v">n + 1 = ' + (n + 1) + '</div><div class="w">a <b>' + NMR.pattern(n) + '</b>' + (n > 3 ? ' ' + U.CHIP.ext : '') + '. Set by the neighbours only.</div></div>' +
        '<div class="kcard b"><div class="k">Relative heights</div><div class="v">' + row.join(' : ') + '</div><div class="w">Row ' + n + ' of Pascal\'s triangle.</div></div>';
      tree.innerHTML = treeSVG(n); pas.innerHTML = pascalHTML(n);
      note.innerHTML = 'Area = ' + k + ' H (the integration step). Change “H on this carbon”: the step grows, the pattern does not change.';
    }
    draw();
    NMR.notes(ctx, { title: 'The n + 1 rule', tag: 'spec',
      body: ['The hydrogens on an <b>adjacent carbon</b> split a signal. If there are <b>n</b> of them (and they are not equivalent to the H giving the signal), the signal has <b>n + 1</b> peaks.',
        'Two separate questions: <b>how many</b> peaks comes from n + 1; <b>how tall</b>, relative to each other, comes from row n of Pascal\'s triangle. A quartet is 1 : 3 : 3 : 1.',
        'The number of H <b>on the carbon itself</b> changes the area (the integration), not the pattern. A CH₃ next to a CH₂ and a CH next to a CH₂ are both triplets.',
        'AQA examines singlet, doublet, triplet and quartet in aliphatic compounds. Five or more neighbours (quintet, sextet, septet) are shown here as extension.'],
      tip: 'Why the tree works: each neighbouring H has two spin states, so each one splits every line in two. Equal spacings mean lines land on top of each other and add up, which is where Pascal\'s numbers come from.',
      insight: 'E' });
  }

  /* ───────── E: real molecules ───────── */
  function ownH(t) { return /CH<sub>3/.test(t) ? 3 : /CH<sub>2/.test(t) ? 2 : /CH/.test(t) ? 1 : 0; }
  function neighbours(mol, id) {
    var out = [];
    mol.groups.forEach(function (g, i) {
      if (g.h !== id) return;
      [i - 1, i + 1].forEach(function (j) { var q = mol.groups[j]; if (!q || !q.h || q.h === id) return; var e = NMR.env(mol, 'H', q.h); if (e && !e.ex && out.indexOf(q.h) < 0) out.push(q.h); });
    });
    return out;
  }
  function explainSplit(mol, e) {
    if (e.ex) return 'The O–H hydrogen exchanges rapidly between molecules, so it appears as a singlet and does not split its neighbours.';
    var nb = neighbours(mol, e.id), names = nb.map(function (id) { return '<b style="color:' + NMR.envVar(mol, 'H', id) + '">' + NMR.env(mol, 'H', id).lab + '</b>'; });
    if (!e.nb) return 'The adjacent atom(s) carry no H' + (mol.groups.some(function (g) { return /C\(=O\)|COOH|CHO/.test(g.t) && !g.h; }) ? ' (the C=O carbon has none)' : '') + ', so n = 0: a <b>singlet</b>.';
    return 'Adjacent: ' + names.join(' and ') + ', with <b>' + e.nb + ' H</b> between them. n + 1 = ' + (e.nb + 1) + ': a <b>' + NMR.pattern(e.nb) + '</b>, heights ' + NMR.pascal(e.nb).join(' : ') + '. The ' + e.n + ' H of the signal itself do not count.' + (e.nb > 3 ? ' ' + U.CHIP.ext : '');
  }
  function real(ctx) {
    var mol = NMR.mol(st.realMol);
    var p = U.panel(mol.name + ' · tap a signal or a group', { stage: true });
    var f = NMR.formula(mol, 'H'), host = U.el('div', { cls: 'nv' }), out = U.el('div', { cls: 'assign', 'aria-live': 'polite' });
    p.body.appendChild(f.el); p.body.appendChild(host); p.body.appendChild(out); ctx.vis.appendChild(p.el);
    var v = ctx.view(host, { nuc: 'H', labels: true, colour: true, startFit: true, alt: mol.name + ' spectrum' }); v.setSpec(NMR.build(mol, 'H', { tms: true }));
    function show(id) {
      f.set(id); v.select(id);
      var e = NMR.env(mol, 'H', id); if (!e) { out.innerHTML = ''; f.mark([]); v.marks = []; v.draw(); return; }
      f.mark(neighbours(mol, id));
      out.innerHTML = '<span class="t" style="color:' + NMR.envVar(mol, 'H', id) + '">' + e.lab + ' · δ ' + e.d.toFixed(2) + '</span><br>' + explainSplit(mol, e);
      if (!e.ex && e.nb && !e.lines) {
        var row = NMR.pascal(e.nb), sp = v.spec.lines.filter(function (l) { return l.env === id; });
        var se = v.spec.envs.filter(function (q) { return q.id === id; })[0];
        v.marks = sp.map(function (l, j) { return { x: l.x, t: String(row[j]) }; });
        v.setRange(se.lo - 0.35, se.hi + 0.35);
      } else { v.marks = []; v.draw(); }
    }
    f.el.addEventListener('click', function () { show(f.cur); });
    v.o.onSelect = function (id) { show(id); };
    var fit = U.el('button', { type: 'button', cls: 'btn' }, 'Whole spectrum');
    fit.addEventListener('click', function () { v.marks = []; v.fit(); });
    ctx.ctl.appendChild(U.field('Molecule', U.molSelect(st.realMol, function (id) { st.realMol = id; NMR.router.go(location.hash); })));
    ctx.ctl.appendChild(fit);
    ctx.ctl.appendChild(U.el('p', { cls: 'hint' }, 'The outlined groups are the neighbours doing the splitting. Tapping a signal zooms in on it and labels each line with its Pascal number.'));
    var first = mol.H.filter(function (e) { return e.nb && !e.ex; })[0] || mol.H[0];
    show(first.id);
    NMR.notes(ctx, { title: 'Splitting in real molecules', tag: 'spec',
      body: ['Find the carbon(s) next to the one carrying the hydrogens. Count the H on them: that is n.',
        'A CH₃ bonded to a C=O carbon is a singlet: the carbonyl carbon has no H. So is a CH₃ bonded to the O of an ester.',
        'Equivalent H do not split each other. The six H in ethane are all one environment: one singlet.',
        'In exam spectra O–H signals are singlets and do not split the CH next to them.'],
      insight: 'E' });
  }

  /* ───────── E: predict the pattern ───────── */
  function predict(ctx) {
    if (!st.pred) st.pred = { right: 0, tries: 0 };
    var pool = [];
    NMR.molsStd().forEach(function (m) { if (m.ring) return; m.groups.forEach(function (g) { if (!g.h) return; var e = NMR.env(m, 'H', g.h); if (e && !e.ex && !pool.some(function (x) { return x.m === m && x.e === e; })) pool.push({ m: m, e: e, own: ownH(g.t) }); }); });
    var it = pool[Math.floor(Math.random() * pool.length)], mol = it.m, e = it.e;
    var p = U.panel('Predict the pattern', { stage: true });
    var f = NMR.formula(mol, 'H'); f.set(e.id); f.el.style.pointerEvents = 'none';
    p.body.appendChild(U.el('p', { cls: 'stage-cap' }, '<b>' + mol.name + '.</b> What splitting pattern will the highlighted hydrogens (' + e.lab + ') give?'));
    p.body.appendChild(f.el);
    var host = U.el('div', { cls: 'nv short', hidden: true }); p.body.appendChild(host);
    ctx.vis.appendChild(p.el);
    var q = U.el('div', { cls: 'qcard sst-teacher' }), box = U.el('div', { cls: 'q-opts' }), fb = U.el('div', { cls: 'verdict', hidden: true, 'aria-live': 'polite' });
    q.innerHTML = '<div class="qhead"><span class="eyebrow">Your prediction</span><span class="mk">' + st.pred.right + ' / ' + st.pred.tries + ' right</span></div>';
    var first = true, v = null;
    ['singlet', 'doublet', 'triplet', 'quartet'].forEach(function (name, i) {
      var b = U.el('button', { type: 'button', cls: 'q-opt' }, '<span class="lt">' + 'ABCD'[i] + '</span><span>' + name + ' <span class="subtle">(' + (i + 1) + ' peak' + (i ? 's' : '') + ', ' + NMR.pascal(i).join(' : ') + ')</span></span>');
      b.addEventListener('click', function () {
        var ok = i === e.nb; if (first) { st.pred.tries++; if (ok) st.pred.right++; first = false; }
        b.setAttribute('data-state', ok ? 'right' : 'wrong'); b.disabled = true; fb.hidden = false;
        if (ok) {
          U.$$('.q-opt', box).forEach(function (x) { x.disabled = true; });
          fb.setAttribute('data-ok', '1'); fb.innerHTML = '<b>Correct</b>' + explainSplit(mol, e);
          f.mark(neighbours(mol, e.id));
          host.hidden = false;
          v = ctx.view(host, { nuc: 'H', labels: true, colour: true, alt: 'The real signal' });
          var spec = NMR.build(mol, 'H', { tms: true }); v.setSpec(spec); v.select(e.id);
          var row = NMR.pascal(e.nb); v.marks = spec.lines.filter(function (l) { return l.env === e.id; }).map(function (l, j) { return { x: l.x, t: String(row[j]) }; });
          var se = spec.envs.filter(function (q) { return q.id === e.id; })[0];
          v.setRange(se.lo - 0.4, se.hi + 0.4);
        } else {
          fb.setAttribute('data-ok', '0');
          var why = i === it.own && it.own !== e.nb ? 'It looks as if you used the ' + it.own + ' H on the <b>same</b> carbon. Only H on the <b>adjacent</b> carbon(s) split a signal.' :
            i === e.nb - 1 ? 'You may have used n peaks. The rule is n + 1: count the H on the adjacent carbon(s) and add one.' :
            e.nb === 0 ? 'Look at the atom(s) next to this carbon. Do they carry any H?' : 'Count the H on the carbon(s) next door, then add one.';
          fb.innerHTML = '<b>Not a ' + name + '</b>' + why + ' Try again.';
        }
      });
      box.appendChild(b);
    });
    q.appendChild(box); q.appendChild(fb); ctx.vis.appendChild(q);
    var nx = U.el('button', { type: 'button', cls: 'btn btn-accent' }, 'Another one ›'); nx.addEventListener('click', function () { NMR.router.go(location.hash); });
    var rv = U.el('button', { type: 'button', cls: 'btn' }, 'Reveal the answer'); rv.addEventListener('click', function () { first = false; box.children[e.nb].click(); });
    var row = U.el('div', { cls: 'row' }); row.appendChild(rv); row.appendChild(nx); ctx.ctl.appendChild(row);
    f.el.classList.add('hero');
    NMR.notes(ctx, { title: 'Predict, then check', tag: 'spec',
      body: ['Look at the carbon(s) bonded to the highlighted carbon. Add up the H on them: n. The pattern has n + 1 peaks.',
        'Watch for C=O, O and ring carbons next door: they carry no H, so they give n = 0.'],
      tip: 'Say “two H on the adjacent carbon”, not “two neighbouring H”: the mark is for the carbon.', insight: 'E' });
  }

  /* ───────── F: ¹³C viewer ───────── */
  function cViewer(ctx) {
    var mol = NMR.mol(st.cMol), solvent = st.cSolv !== false;
    var p = U.panel(mol.name + ' · ¹³C NMR', { stage: true });
    var f = NMR.formula(mol, 'C'), host = U.el('div', { cls: 'nv' }), out = U.el('div', { cls: 'assign', 'aria-live': 'polite' });
    var nC = +(/C(?:<sub>)?(\d*)/.exec(mol.formula)[1] || 1);
    var ro = U.el('div', { cls: 'readouts' }, '<span class="ro"><span class="k">Carbon atoms</span><span class="v">' + nC + '</span></span><span class="ro"><span class="k">Signals</span><span class="v hi">' + mol.C.length + '</span></span>');
    [f.el, host, ro, out].forEach(function (x) { p.body.appendChild(x); }); ctx.vis.appendChild(p.el);
    var v = ctx.view(host, { nuc: 'C', colour: true, alt: mol.name + ' carbon-13 spectrum' });
    v.setSpec(NMR.build(mol, 'C', { tms: true, solvent: solvent ? 'cdcl3' : null })); v.full();
    NMR.link(v, f, out, mol, 'C');
    out.innerHTML = '<span class="subtle">Tap a carbon or a line.</span>';
    ctx.ctl.appendChild(U.field('Molecule', U.molSelect(st.cMol, function (id) { st.cMol = id; NMR.router.go(location.hash); })));
    ctx.ctl.appendChild(U.field('Solvent peak', U.seg([['1', 'CDCl₃ shown'], ['0', 'Hidden']], solvent ? '1' : '0', function (x) { st.cSolv = x === '1'; NMR.router.go(location.hash); }, 'full')));
    ctx.ctl.appendChild(U.el('p', { cls: 'hint' }, 'The CDCl₃ solvent shows as a small 1 : 1 : 1 triplet at 77 ppm in a real ¹³C spectrum (its carbon is split by deuterium). Ignore it when counting.'));
    NMR.notes(ctx, { title: 'Reading a ¹³C spectrum', tag: 'spec',
      body: ['One line for each <b>carbon environment</b>. Count the lines, then use Table C to say what kind of carbon each one is.',
        'No splitting at this level, and line heights do <b>not</b> count carbons. Carbons with no H attached (C=O, the ring carbon bearing a substituent) are usually the weakest lines.',
        'The wide shift range makes ¹³C good for spotting a C=O (160–220), or a carbon bonded to O (50–90).'],
      tip: 'Use Table C ranges in your answer: “δ 209 is a ketone C=O (190–220)”.', insight: 'F' });
  }

  /* ───────── F: symmetry challenge ───────── */
  var SYM = ['propanone', 'butanone', 'pentan-3-one', 'pentan-2-one', 'diethyl-ether', 'tbutanol', 'toluene', 'benzene', 'methyl-propanoate', 'ethyl-ethanoate', 'propan-2-ol', 'propan-1-ol'];
  function symmetry(ctx) {
    if (!st.sym) st.sym = { i: 0, right: 0, tries: 0 };
    var S = st.sym, mol = NMR.mol(SYM[S.i]), nC = +(/C(?:<sub>)?(\d*)/.exec(mol.formula)[1] || 1);
    var p = U.panel('How many lines in the ¹³C spectrum?', { stage: true });
    var f = NMR.formula(mol, 'C'); f.el.style.pointerEvents = 'none';
    p.body.appendChild(U.el('p', { cls: 'stage-cap' }, '<b>' + mol.name + '</b>, ' + mol.formula + '. ' + nC + ' carbon atoms.'));
    p.body.appendChild(f.el);
    U.$$('[data-id]', f.el).forEach(function (b) { b.style.setProperty('--ec', 'var(--ink)'); });
    U.$$('circle[fill]', f.el).forEach(function (c) { c.setAttribute('data-f', c.getAttribute('fill')); c.setAttribute('fill', 'var(--muted)'); });
    var host = U.el('div', { cls: 'nv short', hidden: true }); p.body.appendChild(host); ctx.vis.appendChild(p.el);
    var q = U.el('div', { cls: 'qcard sst-teacher' }); ctx.vis.appendChild(q);
    q.innerHTML = '<div class="qhead"><span class="eyebrow">Your answer</span><span class="mk">' + S.right + ' / ' + S.tries + ' right</span></div>';
    var row = U.el('div', { cls: 'qnum' }), inp = U.el('input', { cls: 'field num', inputmode: 'numeric', 'aria-label': 'Number of signals', autocomplete: 'off' }), go = U.el('button', { type: 'button', cls: 'btn btn-accent' }, 'Check');
    row.appendChild(inp); row.appendChild(go); q.appendChild(row);
    var fb = U.el('div', { cls: 'verdict', hidden: true, 'aria-live': 'polite' }); q.appendChild(fb);
    var first = true;
    function check() {
      var x = parseInt(inp.value, 10); if (isNaN(x)) return;
      var ok = x === mol.C.length; if (first) { S.tries++; if (ok) S.right++; first = false; }
      fb.hidden = false; fb.setAttribute('data-ok', ok ? '1' : '0');
      if (ok) {
        fb.innerHTML = '<b>Correct: ' + mol.C.length + '</b>' + mol.C.map(function (c) { return '<span style="color:' + NMR.envVar(mol, 'C', c.id) + ';font-weight:700">' + c.lab + '</span> (' + c.n + ' C, δ ' + c.d.toFixed(0) + ')'; }).join(' · ');
        U.$$('[data-id]', f.el).forEach(function (b) { b.style.setProperty('--ec', NMR.envVar(mol, 'C', b.getAttribute('data-id'))); });
        U.$$('circle[data-f]', f.el).forEach(function (c) { c.setAttribute('fill', c.getAttribute('data-f')); });
        host.hidden = false; var v = ctx.view(host, { nuc: 'C', colour: true, alt: 'Carbon-13 spectrum' }); v.setSpec(NMR.build(mol, 'C', { tms: true })); v.full();
        inp.disabled = true; go.disabled = true;
      } else if (x === nC) fb.innerHTML = '<b>That is the number of carbon atoms</b>Look for symmetry: carbons in identical surroundings are one environment and give one line between them.';
      else if (x === mol.H.length) fb.innerHTML = '<b>That is the ¹H count</b>Count carbon environments, including carbons with no H (C=O, a ring carbon bearing a group).';
      else fb.innerHTML = '<b>Not quite</b>' + (x > nC ? 'There cannot be more lines than carbon atoms.' : 'Go round the molecule carbon by carbon: is each one\'s surroundings the same as another\'s?') + ' Try again.';
    }
    go.addEventListener('click', check); inp.addEventListener('keydown', function (e) { if (e.key === 'Enter') check(); });
    var nx = U.el('button', { type: 'button', cls: 'btn btn-accent' }, 'Next molecule ›');
    nx.addEventListener('click', function () { S.i = (S.i + 1) % SYM.length; NMR.router.go(location.hash); });
    var rv = U.el('button', { type: 'button', cls: 'btn' }, 'Reveal the answer'); rv.addEventListener('click', function () { first = false; inp.value = mol.C.length; check(); });
    var row2 = U.el('div', { cls: 'row' }); row2.appendChild(rv); row2.appendChild(nx); ctx.ctl.appendChild(row2);
    f.el.classList.add('hero');
    NMR.notes(ctx, { title: 'Symmetry and carbon environments', tag: 'spec',
      body: ['Two carbons are in the same environment if swapping them, by a mirror or a rotation, leaves the molecule unchanged. Pentan-3-one has a mirror through the C=O: five carbons, three lines.',
        'Benzene: all six carbons are identical, one line. Methylbenzene: the CH₃ breaks the symmetry into ipso, ortho, meta and para carbons, plus the CH₃: five lines.'],
      tip: 'Mark the symmetry on the structure in the exam: draw the mirror line, then pair up the carbons.', insight: 'F' });
  }

  /* ───────── F: isomers by ¹³C ───────── */
  var CPAIRS = [
    ['pentan-3-one', 'pentan-2-one', 'Count the lines: 3 against 5. The symmetry of pentan-3-one makes its carbons pair up.'],
    ['propan-1-ol', 'propan-2-ol', 'Count the lines: 3 against 2. Propan-2-ol\'s two CH₃ are equivalent.'],
    ['diethyl-ether', 'tbutanol', 'Both give 2 lines, so counting is not enough. Use the shifts: the ether has a CH₂–O at 66 and a CH₃ at 15; the alcohol has a quaternary C–O at 69 and a tall CH₃ line at 31.'],
    ['ethyl-ethanoate', 'methyl-propanoate', 'Both give 4 lines. The C–O carbon decides it: O–CH₂ at 60 in ethyl ethanoate, O–CH₃ at 52 in methyl propanoate.']
  ];
  function cIsomers(ctx) {
    var P = CPAIRS[st.cPair]; ctx.pair = 'cols';
    [P[0], P[1]].forEach(function (id) {
      var mol = NMR.mol(id), p = U.panel(mol.name + ' · ' + mol.formula + ' · ' + mol.C.length + ' lines', { stage: true });
      var f = NMR.formula(mol, 'C'), host = U.el('div', { cls: 'nv short' }), out = U.el('div', { cls: 'assign' });
      [f.el, host, out].forEach(function (x) { p.body.appendChild(x); }); ctx.vis.appendChild(p.el);
      var v = ctx.view(host, { nuc: 'C', colour: true, alt: mol.name }); v.setSpec(NMR.build(mol, 'C', { tms: true })); v.full();
      NMR.link(v, f, out, mol, 'C');
    });
    var d = U.panel('How to tell them apart', { stage: true }); d.body.innerHTML = '<p class="stage-cap">' + P[2] + '</p>'; ctx.vis.appendChild(d.el);
    var seg = U.el('div', { cls: 'molpick' });
    CPAIRS.forEach(function (q, i) {
      var b = U.el('button', { type: 'button', cls: 'btn' + (i === st.cPair ? ' btn-accent' : ''), style: 'justify-content:flex-start;white-space:normal;text-align:left' }, NMR.mol(q[0]).name + ' / ' + NMR.mol(q[1]).name);
      b.addEventListener('click', function () { st.cPair = i; NMR.router.go(location.hash); }); seg.appendChild(b);
    });
    ctx.ctl.appendChild(U.field('Pair of isomers', seg));
    NMR.notes(ctx, { title: 'Isomers by ¹³C', tag: 'spec',
      body: ['First count the lines: symmetry often settles it at once.', 'If the counts match, compare the shifts against Table C, especially the carbons bonded to O and the C=O.'],
      insight: 'F' });
  }

  NMR.section({ id: 'e', n: 'E', name: 'Splitting', ds: 'n + 1 and Pascal\'s triangle',
    subs: [{ id: 'rule', name: 'The n + 1 rule' }, { id: 'real', name: 'In real molecules' }, { id: 'predict', name: 'Predict the pattern' }],
    render: function (sub, ctx) { ({ rule: rule, real: real, predict: predict }[sub] || rule)(ctx); } });
  NMR.section({ id: 'f', n: 'F', name: '¹³C spectra', ds: 'Carbon environments and symmetry',
    subs: [{ id: 'viewer', name: '¹³C spectra' }, { id: 'symmetry', name: 'Symmetry challenge' }, { id: 'isomers', name: 'Isomers' }],
    render: function (sub, ctx) { ({ viewer: cViewer, symmetry: symmetry, isomers: cIsomers }[sub] || cViewer)(ctx); } });
})();
