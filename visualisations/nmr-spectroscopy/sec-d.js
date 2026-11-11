/* NMR Spectroscopy, Section D: ¹H spectra.
   env      environments: tap a group or a peak          shift    the data-sheet ruler beside a real spectrum
   integ    integration: from step heights to a ratio    worked   worked examples, one line of reasoning at a time
   mystery  identify the compound, with feedback that names the mismatch
   isomers  two isomers, two spectra                                                                         */
(function () {
  'use strict';
  var NMR = window.NMR, U = NMR.U;
  var state = { mol: 'ethyl-ethanoate', shiftMol: 'methyl-propanoate', integMol: 'ethyl-ethanoate', worked: 0, step: 0, pair: 0 };

  /* A molecule panel: formula over a spectrum, linked both ways, with the assignment underneath. */
  function molView(ctx, mol, nuc, o) {
    o = o || {};
    var p = U.panel(o.title || mol.name + ' · ' + (nuc === 'H' ? '¹H' : '¹³C') + ' NMR', { stage: true });
    var f = NMR.formula(mol, nuc), host = U.el('div', { cls: 'nv' + (o.tall ? ' tall' : '') }), out = U.el('div', { cls: 'assign', 'aria-live': 'polite' });
    p.body.appendChild(f.el); p.body.appendChild(host);
    if (o.readouts) p.body.appendChild(o.readouts);
    p.body.appendChild(out);
    var v = ctx.view(host, Object.assign({ nuc: nuc, startFit: true, alt: mol.name + ' spectrum' }, o.view || {}));
    v.setSpec(NMR.build(mol, nuc, Object.assign({ tms: true }, o.build || {})));
    var show = NMR.link(v, f, out, mol, nuc);
    return { panel: p, view: v, formula: f, out: out, show: show };
  }

  /* ───────── environments ───────── */
  function env(ctx) {
    var mol = NMR.mol(state.mol);
    var ro = U.el('div', { cls: 'readouts' });
    var nH = mol.H.reduce(function (a, e) { return a + e.n; }, 0);
    ro.innerHTML = '<span class="ro"><span class="k">Formula</span><span class="v">' + mol.formula + '</span></span><span class="ro"><span class="k">H atoms</span><span class="v">' + nH + '</span></span><span class="ro"><span class="k">Signals</span><span class="v hi">' + mol.H.length + '</span></span>';
    var mv = molView(ctx, mol, 'H', { readouts: ro, view: { colour: true, integ: true, labels: true } });
    ctx.vis.appendChild(mv.panel.el);
    mv.out.innerHTML = '<span class="subtle">Tap a group in the formula, or a peak, to see which hydrogens make it.</span>';
    ctx.ctl.appendChild(U.field('Molecule', U.molSelect(state.mol, function (id) { state.mol = id; NMR.router.go(location.hash); })));
    var tg = U.seg([['1', 'Colours on'], ['0', 'Colours off']], '1', function (x) { mv.view.o.colour = x === '1'; mv.view.draw(); }, 'full', 'Colours');
    ctx.ctl.appendChild(U.field('Environment colours', tg));
    var tl = U.seg([['1', 'Labels on'], ['0', 'Labels off']], '1', function (x) { mv.view.o.labels = x === '1'; mv.view.draw(); }, 'full', 'Labels');
    ctx.ctl.appendChild(U.field('Splitting labels', tl));
    ctx.ctl.appendChild(U.el('p', { cls: 'hint' }, 'Zoom with + and −, or Fit to the signals. Drag sideways to pan when zoomed in. Hover or tap for a δ reading.'));
    NMR.notes(ctx, { title: 'Proton environments', tag: 'spec',
      body: ['Hydrogens in the <b>same environment</b> have identical surroundings, bonded to equivalent atoms. They give one signal between them.',
        'Look for symmetry: the two CH₃ groups in propanone are identical, so propanone gives <b>one</b> signal. Ethyl ethanoate has three different kinds of H, so <b>three</b>.',
        'The number of signals is the number of environments, never the number of H atoms. The area of each signal tells you how many H it holds.'],
      tip: 'Before you look at a spectrum, predict the number of signals from the structure. Then check.', insight: 'D' });
  }

  /* ───────── shift ruler ───────── */
  function shift(ctx) {
    var mol = NMR.mol(state.shiftMol);
    var mv = molView(ctx, mol, 'H', { view: { colour: true } });
    ctx.vis.appendChild(mv.panel.el);
    var rp = U.panel('Data sheet, Table B: ¹H chemical shifts (δ / ppm)', { stage: true });
    var ruler = U.el('div', { cls: 'ruler' }), LO = 0, HI = 12;
    function X(d) { return (HI - d) / (HI - LO) * 100; }
    NMR.SHIFT_H.forEach(function (r, i) {
      var b = U.el('button', { type: 'button', cls: 'rl-row', 'data-i': i },
        '<span class="rl-g">' + r.g + '</span><span class="rl-track"><span class="rl-bar" style="left:' + X(r.hi) + '%;right:' + (100 - X(r.lo)) + '%"></span></span>');
      mol.H.forEach(function (e) { if (e.r === i) b.querySelector('.rl-track').insertAdjacentHTML('beforeend', '<span class="rl-mk" style="left:' + X(e.d) + '%;background:' + NMR.envVar(mol, 'H', e.id) + '" title="' + e.lab + ' δ ' + e.d + '"></span>'); });
      b.addEventListener('click', function () { pickRow(i); });
      ruler.appendChild(b);
    });
    var ax = U.el('div', { cls: 'rl-axis', 'aria-hidden': 'true' }, '<span></span><span class="ax">' + [12, 10, 8, 6, 4, 2, 0].map(function (d) { return '<span style="left:' + X(d) + '%">' + d + '</span>'; }).join('') + '</span>');
    ruler.appendChild(ax);
    rp.body.appendChild(ruler);
    var info = U.el('div', { cls: 'assign', 'aria-live': 'polite' }); rp.body.appendChild(info);
    ctx.vis.appendChild(rp.el);
    function pickRow(i) {
      U.$$('.rl-row', ruler).forEach(function (b) { b.classList.toggle('on', +b.dataset.i === i); });
      var r = NMR.SHIFT_H[i];
      mv.view.setBand([r.lo, r.hi]);
      var hits = mol.H.filter(function (e) { return e.r === i; });
      info.innerHTML = '<span class="t">' + r.g + ' · ' + r.lo + '–' + r.hi + '</span>: ' + r.ex + '. ' +
        (hits.length ? 'In ' + mol.name + ': ' + hits.map(function (e) { return '<b style="color:' + NMR.envVar(mol, 'H', e.id) + '">' + e.lab + '</b> at δ ' + e.d.toFixed(2); }).join(', ') + '.' : 'No signal of ' + mol.name + ' comes from this kind of H.');
    }
    var baseLink = mv.view.o.onSelect;
    mv.view.o.onSelect = function (id) { baseLink(id); var e = NMR.env(mol, 'H', id); if (e && e.r !== null) pickRow(e.r); else { mv.view.setBand(null); U.$$('.rl-row', ruler).forEach(function (b) { b.classList.remove('on'); }); } };
    mv.formula.el.addEventListener('click', function () { var e = NMR.env(mol, 'H', mv.formula.cur); if (e && e.r !== null) pickRow(e.r); });
    ctx.ctl.appendChild(U.field('Molecule', U.molSelect(state.shiftMol, function (id) { state.shiftMol = id; NMR.router.go(location.hash); })));
    ctx.ctl.appendChild(U.el('p', { cls: 'hint' }, 'Tap a row of the table to shade that range on the spectrum. Tap a peak to find its row. The coloured ticks are this molecule\'s signals.'));
    NMR.notes(ctx, { title: 'Chemical shift and the data sheet', tag: 'spec',
      body: ['The chemical shift, δ, depends on the <b>environment</b> of the hydrogen. Electronegative atoms (O, Cl) and C=O pull electron density away, so nearby H are <b>deshielded</b> and appear at higher δ.',
        'In the exam you get the Data Booklet. Table B lists the ranges. Match each signal to a row, and name the group in your answer.',
        'Ranges overlap (3.1–3.9 and 3.7–4.1, for example). Use integration and splitting to decide between them.',
        '<span class="subtle">These ranges were entered from the data sheet as the author knew it, not copied from the current PDF. Check them against your copy.</span>'],
      tip: 'Write “δ 2.1–2.6: H on a carbon next to C=O”, not just “a carbonyl”.', insight: 'D' });
  }

  /* ───────── integration ───────── */
  function integ(ctx) {
    var mol = NMR.mol(state.integMol), spec = NMR.build(mol, 'H', { tms: true, seed: 'integ' });
    var p = U.panel(mol.name + ' (' + mol.formula + ') · integration trace', { stage: true });
    var host = U.el('div', { cls: 'nv' }); p.body.appendChild(host);
    var v = ctx.view(host, { nuc: 'H', integ: true, steps: true, startFit: true, alt: 'Spectrum with integration trace' }); v.setSpec(spec);
    ctx.vis.appendChild(p.el);
    var envs = spec.envs.slice().sort(function (a, b) { return b.d - a.d; });
    var mm = {}; spec.steps.forEach(function (s) { mm[s.id] = s.mm; });
    var min = Math.min.apply(null, envs.map(function (e) { return mm[e.id]; }));
    var k = 1; for (var t = 1; t <= 6; t++) { var ok = envs.every(function (e) { var r = mm[e.id] / min * t; return Math.abs(r - Math.round(r)) < 0.18; }); if (ok) { k = t; break; } }
    var tp = U.panel('From step heights to numbers of H', { stage: true });
    var tab = U.el('div', { cls: 'tw' }), msg = U.el('div', { cls: 'assign', 'aria-live': 'polite' });
    tp.body.appendChild(tab); tp.body.appendChild(msg); ctx.vis.appendChild(tp.el);
    var step = 0, S = [
      'Measure each step of the integration trace (the vertical rise, not the peak height). Here they are printed on the trace in mm.',
      'Divide every step by the <b>smallest</b> one (' + min.toFixed(1) + ' mm).',
      k > 1 ? 'Not all whole numbers yet, so multiply every value by <b>' + k + '</b>.' : 'They are already close to whole numbers, so no need to multiply.',
      'Round to whole numbers. Add them up and compare with the formula: ' + mol.formula + ' has <b>' + spec.intTotal + ' H</b>.'];
    function draw() {
      var cols = ['Signal (δ)', 'Step / mm', '÷ ' + min.toFixed(1), k > 1 ? '× ' + k : '', 'H'];
      var h = '<table class="dt"><tr>' + cols.map(function (c, i) { return i <= step + 1 || i === 0 ? '<th>' + c + '</th>' : '<th></th>'; }).join('') + '</tr>';
      var sum = 0;
      envs.forEach(function (e) {
        var a = mm[e.id], b = a / min, c = b * k, n = Math.round(c); sum += n;
        h += '<tr data-click="' + e.id + '"><td style="color:' + NMR.envVar(mol, 'H', e.id) + ';font-weight:700">' + e.d.toFixed(2) + '</td><td>' + a.toFixed(1) + '</td><td>' + (step >= 1 ? b.toFixed(2) : '') + '</td><td>' + (step >= 2 && k > 1 ? c.toFixed(2) : '') + '</td><td><b>' + (step >= 3 ? n : '') + '</b></td></tr>';
      });
      if (step >= 3) h += '<tr><td colspan="4"><b>Total</b></td><td><b class="' + (sum === spec.intTotal ? 'ok-t' : 'bad-t') + '">' + sum + '</b></td></tr>';
      tab.innerHTML = h + '</table>';
      msg.innerHTML = '<span class="t">Step ' + (step + 1) + ' of 4.</span> ' + S[step] + (step === 3 ? ' ' + (sum === spec.intTotal ? 'It matches, so the ratio is the actual number of H.' : 'Scale the ratio up to fit the formula.') : '');
      back.disabled = step === 0; next.disabled = step === 3;
      U.$$('tr[data-click]', tab).forEach(function (tr) { tr.addEventListener('click', function () { v.select(tr.dataset.click); }); });
    }
    var back = U.el('button', { type: 'button', cls: 'btn' }, '‹ Back'), next = U.el('button', { type: 'button', cls: 'btn btn-accent' }, 'Next step ›');
    back.addEventListener('click', function () { step = Math.max(0, step - 1); draw(); });
    next.addEventListener('click', function () { step = Math.min(3, step + 1); draw(); });
    var row = U.el('div', { cls: 'row' }); row.appendChild(back); row.appendChild(next);
    var pool = NMR.molsStd().filter(function (m) { return m.H.length > 1 && !m.ring; });
    var sel = U.el('select', { cls: 'field', 'aria-label': 'Molecule' }, pool.map(function (m) { return '<option value="' + m.id + '">' + m.name + '</option>'; }).join(''));
    sel.value = state.integMol; sel.addEventListener('change', function () { state.integMol = sel.value; NMR.router.go(location.hash); });
    ctx.ctl.appendChild(U.field('Molecule', sel)); ctx.ctl.appendChild(row);
    draw();
    NMR.notes(ctx, { title: 'Integration', tag: 'spec',
      body: ['The area under each signal is proportional to the number of H that cause it. The spectrometer draws an <b>integration trace</b>: a line that steps up at each signal by an amount proportional to its area.',
        'The steps give a <b>ratio</b>, not the actual numbers. Simplify it, then use the molecular formula to scale it: a 1 : 1 ratio in C₂H₄… could be 2 : 2.',
        'Measure the vertical rise of each step. Do not use the heights of the peaks: a tall narrow peak and a short wide one can have the same area.'],
      tip: 'Show the division in your working. The method mark is for dividing by the smallest step.', insight: 'D' });
  }

  /* ───────── worked examples ───────── */
  function worked(ctx) {
    var W = NMR.WORKED[state.worked], mol = NMR.mol(W.mol);
    var p = U.panel(W.title, { stage: true });
    var host = U.el('div', { cls: 'nv' }); p.body.appendChild(U.el('p', { cls: 'stage-cap' }, W.intro)); p.body.appendChild(host);
    var v = ctx.view(host, { nuc: 'H', integ: true, labels: true, startFit: true, alt: W.title }); v.setSpec(NMR.build(mol, 'H', { tms: true, seed: 'worked' }));
    var line = U.el('div', { cls: 'assign', 'aria-live': 'polite' }); p.body.appendChild(line);
    var fwrap = U.el('div'); p.body.appendChild(fwrap);
    ctx.vis.appendChild(p.el);
    var lp = U.panel('Reasoning so far', {}), list = U.el('ol', { style: 'margin:0;padding-left:1.2em;display:flex;flex-direction:column;gap:6px;color:var(--ink-2)' });
    lp.body.appendChild(list); ctx.vis.appendChild(lp.el);
    var back = U.el('button', { type: 'button', cls: 'btn' }, '‹ Back'), next = U.el('button', { type: 'button', cls: 'btn btn-accent' }, 'Next ›');
    function draw() {
      var s = W.steps[state.step]; v.highlight(s.h);
      line.innerHTML = '<span class="t">Step ' + (state.step + 1) + ' of ' + W.steps.length + '.</span> ' + s.t;
      list.innerHTML = W.steps.slice(0, state.step + 1).map(function (x) { return '<li>' + x.t + '</li>'; }).join('');
      var last = state.step === W.steps.length - 1;
      fwrap.innerHTML = '';
      if (last || state.step >= W.steps.length - 2) { var f = NMR.formula(mol, 'H'); fwrap.appendChild(f.el); }
      back.disabled = state.step === 0; next.disabled = last;
    }
    back.addEventListener('click', function () { state.step = Math.max(0, state.step - 1); draw(); });
    next.addEventListener('click', function () { state.step = Math.min(W.steps.length - 1, state.step + 1); draw(); });
    var sel = U.seg(NMR.WORKED.map(function (w, i) { return [String(i), 'Example ' + (i + 1)]; }), String(state.worked), function (x) { state.worked = +x; state.step = 0; NMR.router.go(location.hash); }, 'full', 'Worked example');
    ctx.ctl.appendChild(U.field('Worked example', sel));
    var row = U.el('div', { cls: 'row' }); row.appendChild(back); row.appendChild(next); ctx.ctl.appendChild(row);
    draw();
    NMR.notes(ctx, { title: 'Solving a ¹H spectrum', tag: 'spec',
      list: ['<b>Count</b> the signals: that many proton environments.', '<b>Shift</b>: match each to a data-sheet row.', '<b>Integration</b>: how many H in each, scaled to the formula.', '<b>Splitting</b>: n + 1, so how many H on the adjacent carbon.', '<b>Assemble</b> the fragments and check every atom in the formula is used.', '<b>Rule out</b> the obvious isomer by a feature it would show and this spectrum does not.'],
      tip: 'In a 6-mark answer, each signal needs its shift, integration and splitting tied to a piece of the structure.', insight: 'D' });
  }

  /* ───────── mystery spectra ───────── */
  var MYST = ['ethanol', 'propanone', 'butanone', 'ethyl-ethanoate', 'methyl-propanoate', 'propanoic-acid', 'methyl-ethanoate', 'ethanal', 'diethyl-ether', 'tbutanol', 'pentan-3-one', 'ethanoic-acid', 'toluene'];
  function compareMols(w, t) {
    if (w.mf !== t.mf) return w.name + ' is ' + w.formula + ', but the compound is ' + t.formula + '. Check the formula first.';
    if (w.H.length !== t.H.length) return w.name + ' would give <b>' + w.H.length + '</b> signal' + (w.H.length > 1 ? 's' : '') + ' (count its environments), but this spectrum has ' + t.H.length + '.';
    for (var i = 0; i < w.H.length; i++) {
      var e = w.H[i], m = t.H.filter(function (x) { return Math.abs(x.d - e.d) < 0.35 && x.n === e.n; })[0];
      if (!m) return w.name + ' would have its ' + e.lab + ' (' + e.n + ' H, ' + (e.ex ? 'singlet' : NMR.pattern(e.nb)) + ') near δ ' + e.d.toFixed(1) + '. There is no such signal here.';
      if (!e.ex && !e.lines && (m.nb || 0) !== (e.nb || 0)) return 'In ' + w.name + ' the signal near δ ' + e.d.toFixed(1) + ' would be a ' + NMR.pattern(e.nb) + ', not a ' + NMR.pattern(m.nb) + '.';
    }
    return 'Its spectrum would look very similar. Look again at the shifts.';
  }
  function mystery(ctx) {
    if (!state.myst) state.myst = { i: Math.floor(Math.random() * MYST.length), right: 0, tries: 0 };
    var M = state.myst, mol = NMR.mol(MYST[M.i]);
    var p = U.panel('Mystery compound: ' + mol.formula, { stage: true });
    var host = U.el('div', { cls: 'nv' }); p.body.appendChild(host);
    var v = ctx.view(host, { nuc: 'H', integ: true, steps: true, startFit: true, alt: 'Mystery spectrum' }); v.setSpec(NMR.build(mol, 'H', { tms: true, seed: 'myst' + M.i }));
    ctx.vis.appendChild(p.el);
    var qp = U.el('div', { cls: 'qcard sst-teacher' }); ctx.vis.appendChild(qp);
    var same = NMR.MOLS.filter(function (m) { return m.mf === mol.mf && m.id !== mol.id; });
    var others = U.shuffle(NMR.molsStd().filter(function (m) { return m.id !== mol.id && same.indexOf(m) < 0; }));
    var opts = U.shuffle([mol].concat(same.slice(0, 2), others).slice(0, 4));
    qp.innerHTML = '<div class="qhead"><span class="eyebrow">Which compound is it?</span><span class="mk">' + M.right + ' / ' + M.tries + ' solved</span></div><div class="qstem">Use the shifts, the integration steps and the splitting. Zoom into a signal to count its peaks.</div>';
    var box = U.el('div', { cls: 'q-opts' }), fb = U.el('div', { cls: 'verdict', hidden: true, 'aria-live': 'polite' }), first = true;
    opts.forEach(function (m, i) {
      var b = U.el('button', { type: 'button', cls: 'q-opt' }, '<span class="lt">' + 'ABCD'[i] + '</span><span>' + m.name + ' <span class="subtle">' + m.formula + '</span></span>');
      b.addEventListener('click', function () {
        var ok = m === mol; fb.hidden = false;
        if (first) { M.tries++; if (ok) M.right++; first = false; }
        b.setAttribute('data-state', ok ? 'right' : 'wrong'); b.disabled = true;
        if (ok) {
          U.$$('.q-opt', box).forEach(function (x) { x.disabled = true; });
          fb.setAttribute('data-ok', '1');
          fb.innerHTML = '<b>Correct: ' + mol.name + '</b>' + mol.H.map(function (e) { return 'δ ' + e.d.toFixed(1) + ': ' + e.lab + ', ' + e.n + ' H, ' + (e.ex ? 'singlet' : e.lines ? 'multiplet' : NMR.pattern(e.nb)); }).join(' · ');
          v.o.colour = true; v.o.labels = true; v.draw();
          var f = NMR.formula(mol, 'H'); fb.appendChild(f.el); NMR.link(v, f, null, mol, 'H');
        } else { fb.setAttribute('data-ok', '0'); fb.innerHTML = '<b>Not ' + m.name + '</b>' + compareMols(m, mol) + ' Try again.'; }
      });
      box.appendChild(b);
    });
    qp.appendChild(box); qp.appendChild(fb);
    var nx = U.el('button', { type: 'button', cls: 'btn btn-accent' }, 'Next mystery ›');
    nx.addEventListener('click', function () { var j; do { j = Math.floor(Math.random() * MYST.length); } while (j === M.i); M.i = j; NMR.router.go(location.hash); });
    ctx.ctl.appendChild(nx);
    ctx.ctl.appendChild(U.el('p', { cls: 'hint' }, 'Each wrong answer tells you which feature of the spectrum rules it out.'));
    NMR.notes(ctx, { title: 'Mystery spectra', tag: 'spec',
      body: ['Work it out before you look at the options: count signals, read shifts, turn the steps into a ratio, read the splitting.',
        'Then test each option. One clear mismatch (a signal that should be there and is not, or the wrong splitting) is enough to rule it out. That is exactly how a 6-mark answer is built.'],
      insight: 'D' });
  }

  /* ───────── isomers ───────── */
  var PAIRS = [
    ['ethyl-ethanoate', 'methyl-propanoate', 'Ethyl ethanoate has its O–CH₂ quartet at 4.1 and a CH₃C=O singlet at 2.1. Methyl propanoate has an O–CH₃ singlet at 3.7 and a CH₂C=O quartet at 2.3. Where the singlet sits tells you which side of the ester the lone CH₃ is on.'],
    ['propanoic-acid', 'methyl-ethanoate', 'Both C₃H₆O₂. The acid has a broad singlet at 10–12 (COOH) and an ethyl group (triplet + quartet). The ester has just two singlets, at 2.1 and 3.7, and nothing split.'],
    ['diethyl-ether', 'tbutanol', 'Both C₄H₁₀O. Ethoxyethane: a quartet at 3.5 and a triplet at 1.2, ratio 4 : 6. 2-methylpropan-2-ol: one tall singlet of 9 H, plus the O–H singlet.'],
    ['pentan-3-one', 'pentan-2-one', 'Pentan-3-one is symmetrical: only two signals, a quartet (4 H) and a triplet (6 H). Pentan-2-one has four, including a 3 H singlet near 2.1 for the CH₃ next to C=O. (Its middle CH₂ is a sextet: beyond the spec.)'],
    ['propan-1-ol', 'propan-2-ol', 'Extension: both need patterns beyond a quartet. Propan-2-ol has a 6 H doublet and a 1 H septet at 4.0; propan-1-ol has four signals, with the CH₂O as a triplet at 3.6.']
  ];
  function isomers(ctx) {
    var P = PAIRS[state.pair];
    [P[0], P[1]].forEach(function (id) {
      var mol = NMR.mol(id), mv = molView(ctx, mol, 'H', { view: { colour: true, labels: true, integ: true } });
      mv.panel.head.querySelector('.eyebrow').innerHTML = mol.name + ' · ' + mol.formula + (mol.ext ? ' ' + U.CHIP.ext : '');
      ctx.vis.appendChild(mv.panel.el);
    });
    var d = U.panel('The difference that decides it', { stage: true }); d.body.innerHTML = '<p class="stage-cap">' + P[2] + '</p>'; ctx.vis.appendChild(d.el);
    var seg = U.el('div', { cls: 'molpick' });
    PAIRS.forEach(function (q, i) {
      var b = U.el('button', { type: 'button', cls: 'btn' + (i === state.pair ? ' btn-accent' : ''), style: 'justify-content:flex-start;white-space:normal;text-align:left' }, NMR.mol(q[0]).name + ' / ' + NMR.mol(q[1]).name);
      b.addEventListener('click', function () { state.pair = i; NMR.router.go(location.hash); }); seg.appendChild(b);
    });
    ctx.ctl.appendChild(U.field('Pair of isomers', seg));
    NMR.notes(ctx, { title: 'Telling isomers apart', tag: 'spec',
      body: ['Isomers have the same formula, so the formula cannot decide between them. The spectrum can: different structures put their H in different environments.',
        'Exam questions often say “explain how ¹H NMR could distinguish…”. Name <b>one feature</b> that one isomer shows and the other does not, with its shift, integration or splitting.'],
      tip: 'A good answer: “Only methyl propanoate would give a 3 H singlet at δ 3.7 (CH₃ bonded to the ester O).”', insight: 'E' });
  }

  NMR.section({ id: 'd', n: 'D', name: '¹H spectra', ds: 'Environments, shift, integration, solving',
    subs: [{ id: 'env', name: 'Environments' }, { id: 'shift', name: 'Chemical shift' }, { id: 'integ', name: 'Integration' }, { id: 'worked', name: 'Worked examples' }, { id: 'mystery', name: 'Mystery spectra' }, { id: 'isomers', name: 'Isomers' }],
    render: function (sub, ctx) { ({ env: env, shift: shift, integ: integ, worked: worked, mystery: mystery, isomers: isomers }[sub] || env)(ctx); } });
})();
