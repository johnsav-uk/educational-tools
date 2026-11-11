/* NMR Spectroscopy, Sections B and C.
   B nuclides  which nuclei have spin (context)       B compare  ¹H against ¹³C, and the 1.1% of carbon that is ¹³C
   C solvents  CDCl₃, CCl₄, CHCl₃, hexane, D₂O        C tms      why TMS, and a referencing challenge              */
(function () {
  'use strict';
  var NMR = window.NMR, U = NMR.U;
  var SPIN = { '¹H': '½', '²H': '1', '¹²C': '0', '¹³C': '½', '¹⁶O': '0', '¹⁴N': '1', '¹⁹F': '½', '³¹P': '½', '³⁵Cl': '³⁄₂', '²⁸Si': '0' };

  /* ───────── B: nuclides ───────── */
  function nuclides(ctx) {
    var p = U.panel('Nuclide explorer', { stage: true }), pic = U.el('div'), verdict = U.el('div', { cls: 'box', 'aria-live': 'polite' });
    p.body.appendChild(pic); p.body.appendChild(verdict); ctx.vis.appendChild(p.el);
    var grid = U.el('div', { cls: 'nuc-grid' });
    NMR.NUCLIDES.forEach(function (n, i) {
      var on = SPIN[n.s] !== '0';
      var b = U.el('button', { type: 'button', cls: 'nuc-btn' + (on ? ' yes' : ''), 'aria-pressed': 'false' }, n.s + '<small>' + (on ? 'spin' : 'no spin') + '</small>');
      b.addEventListener('click', function () { pick(i); }); grid.appendChild(b);
    });
    ctx.ctl.appendChild(U.field('Choose a nucleus', grid));
    ctx.ctl.appendChild(U.el('p', { cls: 'hint' }, 'Red: protons. Grey: neutrons. Paired nucleons cancel each other\'s spin; anything left over gives the nucleus a spin.'));
    function pick(i) {
      var n = NMR.NUCLIDES[i];
      U.$$('.nuc-btn', grid).forEach(function (b, k) { b.setAttribute('aria-pressed', String(k === i)); });
      pic.innerHTML = nucleusSVG(n);
      var spin = SPIN[n.s], active = spin !== '0';
      var why = n.p % 2 === 0 && n.n % 2 === 0 ? 'Even protons <b>and</b> even neutrons: every nucleon is paired, so the spins cancel.' :
        (n.p % 2 && n.n % 2) ? 'Odd protons and odd neutrons: one unpaired of each, giving spin 1.' : 'An odd number of nucleons (' + (n.p + n.n) + '): one is unpaired, so the nucleus has spin.';
      verdict.innerHTML = '<h4>' + n.name + ' · ' + n.p + ' p, ' + n.n + ' n</h4><div class="big ' + (active ? 'ok-t' : 'bad-t') + '">' + (active ? 'Has spin (I = ' + spin + ')' : 'No spin: invisible to NMR') + '</div><p>' + why + '</p><p class="board-off">' + n.use + '</p>';
    }
    pick(3);
    NMR.notes(ctx, { title: 'Which nuclei can NMR see?', tag: 'ctx',
      body: ['Only nuclei with <b>spin</b> behave like tiny magnets, so only they show up. Protons and neutrons pair up and cancel; a nucleus with something left unpaired has spin.',
        'For A-level, the two that matter are <b>¹H</b> (almost all hydrogen) and <b>¹³C</b> (1.1% of carbon). ¹²C, ¹⁶O and ²⁸Si have no spin, which is why carbon-12, oxygen and the silicon of TMS never appear.',
        'Deuterium, ²H, does have spin, but it absorbs at a completely different frequency from ¹H, so a ¹H spectrum never shows it. That is why deuterated solvents work.'],
      insight: 'B' });
  }
  function nucleusSVG(n) {
    var pp = [], i, W = 600, H = 170, s = '', R = 11;
    function row(count, y, cls, lab) {
      var pairs = Math.floor(count / 2), odd = count % 2, out = '', x = 190;
      for (i = 0; i < pairs; i++) { out += '<circle cx="' + x + '" cy="' + (y - 11) + '" r="' + R + '" class="' + cls + '"/><circle cx="' + x + '" cy="' + (y + 11) + '" r="' + R + '" class="' + cls + '"/>'; x += 25; }
      if (odd) out += '<circle cx="' + (x + 6) + '" cy="' + y + '" r="' + (R + 6) + '" fill="none" stroke="var(--warn)" stroke-width="2.5" stroke-dasharray="4 3"/><circle cx="' + (x + 6) + '" cy="' + y + '" r="' + R + '" class="' + cls + '"/><text class="s" x="' + (x + 6) + '" y="' + (y + 36) + '" text-anchor="middle" style="fill:var(--warn)">unpaired</text>';
      return '<text class="t" x="10" y="' + (y + 5) + '">' + lab + ' ' + count + '</text>' + out;
    }
    s += row(n.p, 45, 'pr', 'protons'); s += row(n.n, 120, 'ne', 'neutrons');
    return '<svg class="inst-svg nuc-pic" viewBox="0 0 ' + W + ' ' + H + '" role="img" aria-label="' + n.p + ' protons and ' + n.n + ' neutrons in pairs"><style>.pr{fill:var(--e4)}.ne{fill:var(--muted)}</style>' + s + '</svg>';
  }

  /* ───────── B: ¹H against ¹³C ───────── */
  function compare(ctx) {
    var mol = NMR.mol('butanone');
    var p = U.panel('The same molecule, butanone, two ways', { stage: true });
    var g = U.el('div', { cls: 'grid2' }), h1 = U.el('div', { cls: 'nv short' }), h2 = U.el('div', { cls: 'nv short' });
    var c1 = U.el('div'), c2 = U.el('div');
    c1.appendChild(U.el('div', { cls: 'lbl' }, '<span>¹H: 3 signals, split, integrated</span>')); c1.appendChild(h1);
    c2.appendChild(U.el('div', { cls: 'lbl' }, '<span>¹³C: 4 single lines, wide range</span>')); c2.appendChild(h2);
    g.appendChild(c1); g.appendChild(c2); p.body.appendChild(g);
    ctx.vis.appendChild(p.el);
    var v1 = ctx.view(h1, { nuc: 'H', integ: true, labels: true, colour: true, startFit: true, alt: 'Proton spectrum of butanone' }); v1.setSpec(NMR.build(mol, 'H', { tms: true }));
    var v2 = ctx.view(h2, { nuc: 'C', colour: true, alt: 'Carbon-13 spectrum of butanone' }); v2.setSpec(NMR.build(mol, 'C', { tms: true })); v2.full();

    var t = U.panel('¹H against ¹³C', { stage: true, bodyCls: 'stage-body tw' });
    t.body.innerHTML = '<table class="dt"><tr><th></th><th>¹H NMR</th><th>¹³C NMR</th></tr>' +
      '<tr><td>Natural abundance</td><td>99.98% of H</td><td>1.1% of C</td></tr>' +
      '<tr><td>Shift range</td><td>about 0–12 ppm</td><td>about 0–220 ppm</td></tr>' +
      '<tr><td>One signal per…</td><td>proton environment</td><td>carbon environment</td></tr>' +
      '<tr><td>Splitting</td><td>yes: n + 1</td><td>no: single lines</td></tr>' +
      '<tr><td>Peak size</td><td>area ∝ number of H</td><td>does <b>not</b> count carbons</td></tr></table>';
    ctx.vis.appendChild(t.el);

    var cp = U.panel('100 carbon atoms: how many are carbon-13?', { stage: true }), grid = U.el('div', { cls: 'cgrid', 'aria-label': 'Grid of 100 carbon atoms' }), cnt = U.el('p', { cls: 'stage-cap' });
    var row = U.el('div', { cls: 'row' }); row.appendChild(grid);
    var side = U.el('div', { style: 'flex:1 1 200px' }); side.appendChild(cnt);
    var again = U.el('button', { type: 'button', cls: 'btn' }, 'Another 100'); side.appendChild(again); row.appendChild(side);
    cp.body.appendChild(row); ctx.vis.appendChild(cp.el);
    function roll() {
      var k = 0, h = '';
      for (var i = 0; i < 100; i++) { var c = Math.random() < 0.011; if (c) k++; h += '<i' + (c ? ' class="c13"' : '') + '></i>'; }
      grid.innerHTML = h;
      cnt.innerHTML = '<b>' + k + '</b> of these 100 carbons ' + (k === 1 ? 'is' : 'are') + ' ¹³C. On average 1.1 in 100. So ¹³C signals are weak and a spectrum needs many scans, and two ¹³C atoms are almost never next to each other.';
    }
    again.addEventListener('click', roll); roll();
    NMR.notes(ctx, { title: '¹³C spectra are simpler', tag: 'spec',
      body: ['AQA expects you to know that ¹³C spectra are <b>simpler</b> than ¹H spectra. The table shows why: one single line for each carbon environment, spread over a range nearly twenty times wider, so lines rarely overlap.',
        'Because only about 1 carbon in 90 is ¹³C, a ¹³C nucleus almost never has a ¹³C neighbour. (The splitting from attached hydrogens is switched off by the spectrometer.) So at A-level every ¹³C line is a singlet.',
        'In a ¹H spectrum, area tells you how many H. In a ¹³C spectrum line heights do not count carbons: use the number of lines and their shifts.'],
      insight: 'F' });
  }

  /* ───────── C: solvents ───────── */
  var SOLV = {
    cdcl3: { n: 'CDCl₃', f: 'C<b class="ok-t">D</b>Cl₃', ok: 1, why: 'No ¹H, so no solvent peak. A tiny trace of CHCl₃ always remains: the small labelled peak at 7.26, which you ignore.' },
    ccl4: { n: 'CCl₄', f: 'CCl₄', ok: 1, why: 'Contains no hydrogen at all, so it gives no peak. The data sheet names it as a suitable solvent.' },
    chcl3: { n: 'CHCl₃', f: 'C<b class="bad-t">H</b>Cl₃', ok: 0, why: 'Every solvent molecule has an H. The solvent is in huge excess, so its peak at 7.26 towers over the sample\'s peaks.' },
    hexane: { n: 'Hexane', f: 'C₆<b class="bad-t">H</b>₁₄', ok: 0, why: 'Fourteen H per molecule, in the same region (0.9–1.3) as the sample\'s own alkyl H. Its giant peaks swamp and overlap the sample.' },
    d2o: { n: 'D₂O', f: '<b class="ok-t">D</b>₂O', ok: 2, why: 'Deuterated, so no big peak, but many organic compounds do not dissolve, and O–H hydrogens swap with D: the OH signal disappears. A small HOD peak appears near 4.8.' }
  };
  function solvents(ctx) {
    var mol = NMR.mol('ethanol'), cur = 'chcl3';
    var p = U.panel('Ethanol in two solvents, each scaled to its tallest peak', { stage: true });
    var l1 = U.el('div', { cls: 'lbl' }, '<span>In CDCl₃ (the usual choice)</span>'), h1 = U.el('div', { cls: 'nv short' });
    var l2 = U.el('div', { cls: 'lbl' }), h2 = U.el('div', { cls: 'nv short' });
    var verdict = U.el('div', { cls: 'verdict', 'aria-live': 'polite' });
    [l1, h1, l2, h2, verdict].forEach(function (x) { p.body.appendChild(x); });
    ctx.vis.appendChild(p.el);
    var v1 = ctx.view(h1, { nuc: 'H', tools: false, alt: 'Ethanol in CDCl3' }), v2 = ctx.view(h2, { nuc: 'H', fixedMax: true, alt: 'Ethanol in the chosen solvent' });
    var seg = U.seg(Object.keys(SOLV).map(function (k) { return [k, SOLV[k].n]; }), cur, show, 'full', 'Solvent');
    ctx.ctl.appendChild(U.field('Dissolve the sample in', seg));
    var card = U.el('div', { cls: 'box' }); ctx.ctl.appendChild(card);
    function show(k) {
      cur = k; var S = SOLV[k];
      var s1 = NMR.build(mol, 'H', { tms: true, solvent: 'cdcl3', seed: 'solv' }), s2 = NMR.build(mol, 'H', { tms: true, solvent: k, d2o: k === 'd2o', seed: 'solv' });
      v1.setSpec(s1); v2.setSpec(s2);
      v1.setRange(-0.5, 8.5); v2.setRange(-0.5, 8.5);
      l2.innerHTML = '<span>In ' + S.n + '</span>';
      card.innerHTML = '<h4>Solvent formula</h4><div class="formula">' + S.f + '</div>';
      verdict.setAttribute('data-ok', S.ok === 1 ? '1' : S.ok === 2 ? '2' : '0');
      verdict.innerHTML = '<b>' + (S.ok === 1 ? 'Suitable' : S.ok === 2 ? 'Use with care' : 'Not suitable') + '</b>' + S.why + (k === 'd2o' ? ' ' + U.CHIP.ext : '');
    }
    show(cur);
    NMR.notes(ctx, { title: 'Why deuterated solvents?', tag: 'spec',
      body: ['A sample is a few milligrams of compound in about half a millilitre of solvent, so solvent molecules outnumber sample molecules by hundreds to one. Any ¹H in the solvent gives a peak that dwarfs the sample.',
        'So ¹H spectra are run in solvents with <b>no ¹H</b>: deuterated solvents such as <b>CDCl₃</b>, or <b>CCl₄</b>. Deuterium has spin but absorbs far away from ¹H, so it is invisible here.',
        'Each spectrum is scaled to its own tallest peak, as a spectrometer would plot it. Try CHCl₃ and hexane and watch the ethanol shrink to almost nothing.'],
      tip: 'Say “CDCl₃ has no ¹H atoms, so it gives no peaks that would obscure the sample\'s”. Not “deuterium is not magnetic”.',
      insight: 'C' });
  }

  /* ───────── C: TMS ───────── */
  function tms(ctx) {
    var p = U.panel('Tetramethylsilane, Si(CH₃)₄', { stage: true });
    var g = U.el('div', { cls: 'grid2' });
    g.innerHTML = '<svg class="inst-svg" viewBox="0 0 260 200" role="img" aria-label="TMS: a silicon atom bonded to four methyl groups">' +
      '<path class="ln" d="M130 100 L130 42 M130 100 L130 158 M130 100 L60 100 M130 100 L200 100"/>' +
      '<circle cx="130" cy="100" r="17" fill="var(--sst-stage)" stroke="var(--muted)"/><text class="t" x="130" y="105" text-anchor="middle">Si</text>' +
      [[130, 30], [130, 175], [38, 105], [222, 105]].map(function (q) { return '<text class="t" x="' + q[0] + '" y="' + q[1] + '" text-anchor="middle" style="fill:var(--e0)">CH₃</text>'; }).join('') + '</svg>';
    var facts = U.el('div', { cls: 'box' }, '<h4>Why it is the standard</h4><ul style="margin:4px 0 0;padding-left:1.1em">' +
      '<li><b>One sharp peak</b>: all 12 H are equivalent (and all 4 C).</li><li>Defined as <b>δ = 0</b>. Silicon is less electronegative than carbon, so its H are very shielded and the peak sits away from almost every other signal.</li>' +
      '<li><b>Inert</b>: it does not react with the sample.</li><li><b>Volatile</b> (boils at 27 °C), so it is easy to remove afterwards. Non-toxic.</li></ul>');
    g.appendChild(facts); p.body.appendChild(g); ctx.vis.appendChild(p.el);

    var c = U.panel('Referencing challenge: this spectrometer has drifted', { stage: true });
    var host = U.el('div', { cls: 'nv' }), task = U.el('div', { cls: 'qstem' }), rowq = U.el('div', { cls: 'qnum sst-teacher' }), fb = U.el('div', { cls: 'verdict', hidden: true, 'aria-live': 'polite' });
    [host, task, rowq, fb].forEach(function (x) { c.body.appendChild(x); });
    ctx.vis.appendChild(c.el);
    var inp = U.el('input', { cls: 'field num', inputmode: 'decimal', 'aria-label': 'True chemical shift', autocomplete: 'off' }), chk = U.el('button', { type: 'button', cls: 'btn btn-accent' }, 'Check');
    rowq.appendChild(U.el('span', {}, 'True δ =')); rowq.appendChild(inp); rowq.appendChild(chk);
    var v = ctx.view(host, { nuc: 'H', startFit: true, alt: 'Spectrum with a drifted scale' });
    var st = {};
    var cal = U.slider('Recalibrate: shift the scale', { min: -1, max: 1, step: 0.01, value: 0, fmt: function (x) { return (x > 0 ? '+' : '') + x.toFixed(2) + ' ppm'; } }, function (x) { st.corr = x; draw(true); });
    var nb = U.el('button', { type: 'button', cls: 'btn' }, 'New spectrum');
    nb.addEventListener('click', newOne);
    ctx.ctl.appendChild(cal); ctx.ctl.appendChild(nb);
    ctx.ctl.appendChild(U.el('p', { cls: 'hint' }, 'Tap the TMS peak to read where it is, then tap the target signal. Either do the subtraction, or drag the slider until TMS sits on 0.'));
    function newOne() {
      var pool = NMR.molsStd().filter(function (m) { return !m.ring; });
      st.mol = pool[Math.floor(Math.random() * pool.length)];
      var envs = st.mol.H.filter(function (e) { return !e.ex; });
      st.env = envs[Math.floor(Math.random() * envs.length)];
      st.drift = (Math.random() < 0.5 ? -1 : 1) * (0.2 + Math.round(Math.random() * 50) / 100);
      st.corr = 0; cal.set(0); inp.value = ''; inp.disabled = false; chk.disabled = false; fb.hidden = true;
      draw();
    }
    function draw(keep) {
      var off = Math.round((st.drift + st.corr) * 100) / 100;
      v.setSpec(NMR.build(st.mol, 'H', { tms: true, offset: off, seed: 'tms' + st.mol.id }), keep);
      v.highlight([st.env.id]);
      var read = st.env.d + off;
      task.innerHTML = '<b>' + st.mol.name + '.</b> The shaded signal (' + st.env.lab + ') reads <b>δ ' + read.toFixed(2) + '</b> on this scale, and TMS reads <b>δ ' + off.toFixed(2) + '</b>. ' +
        (Math.abs(off) < 0.005 ? '<span class="ok-t"><b>TMS is on 0: calibrated.</b></span> ' : '') + 'What is its true chemical shift?';
    }
    function check() {
      var x = parseFloat(inp.value.replace(',', '.').replace('−', '-')); if (isNaN(x)) return;
      fb.hidden = false; var right = Math.abs(x - st.env.d) <= 0.02;
      var off = Math.round((st.drift + st.corr) * 100) / 100;
      fb.setAttribute('data-ok', right ? '1' : '0');
      if (right) { fb.innerHTML = '<b>Correct</b>δ is measured from TMS: ' + (st.env.d + off).toFixed(2) + ' − (' + off.toFixed(2) + ') = ' + st.env.d.toFixed(2) + '. Check it against the data sheet: ' + (st.env.r !== null ? NMR.rowText('H', st.env.r) : '') + '.'; inp.disabled = true; chk.disabled = true; }
      else if (Math.abs(x - (st.env.d + 2 * off)) <= 0.02) fb.innerHTML = '<b>Wrong direction</b>You added the TMS reading instead of subtracting it. TMS must end up at 0, so subtract its reading from every peak.';
      else if (Math.abs(x - (st.env.d + off)) <= 0.02) fb.innerHTML = '<b>Not corrected</b>That is the reading on the drifted scale. Every shift is measured from TMS, so take away the TMS reading first.';
      else fb.innerHTML = '<b>Not quite</b>True δ = (reading of the signal) − (reading of TMS). Try again.';
    }
    chk.addEventListener('click', check); inp.addEventListener('keydown', function (e) { if (e.key === 'Enter') check(); });
    newOne();
    NMR.notes(ctx, { title: 'TMS: the zero of the scale', tag: 'spec',
      body: ['Chemical shift, δ, is measured <b>relative to TMS</b>. A small amount is added to every sample, and its peak defines δ = 0. Then every spectrometer gives the same δ values for the same compound.',
        'An exam answer needs a <b>property</b> of TMS, not just “it is a standard”: a single intense peak (12 equivalent H), at a shift away from other peaks, inert, volatile and non-toxic.'],
      tip: 'Two properties, two marks. “It is used as a reference” earns nothing on its own.', insight: 'C' });
  }

  NMR.section({ id: 'b', n: 'B', name: 'NMR-active nuclei', ds: 'Spin, ¹H and ¹³C', tag: 'ctx',
    subs: [{ id: 'nuclides', name: 'Which nuclei have spin?', tag: 'ctx' }, { id: 'compare', name: '¹H against ¹³C', tag: 'spec' }],
    render: function (sub, ctx) { if (sub === 'compare') compare(ctx); else nuclides(ctx); } });
  NMR.section({ id: 'c', n: 'C', name: 'Solvents and TMS', ds: 'CDCl₃, CCl₄ and the δ = 0 standard',
    subs: [{ id: 'solvents', name: 'Choosing a solvent', tag: 'spec' }, { id: 'tms', name: 'TMS and the δ scale', tag: 'spec' }],
    render: function (sub, ctx) { if (sub === 'tms') tms(ctx); else solvents(ctx); } });
})();
