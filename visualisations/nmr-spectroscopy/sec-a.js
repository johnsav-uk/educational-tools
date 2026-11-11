/* NMR Spectroscopy, Section A: how a spectrometer works.
   intro  what a spectrum tells you (on the spec)
   lab    the spin lab: nuclei in a field, the energy gap, resonance, the sweep, shielding (context)
   parts  inside the spectrometer (context)                                                        */
(function () {
  'use strict';
  var NMR = window.NMR, U = NMR.U;

  /* ───────── intro ───────── */
  function intro(ctx) {
    var mol = NMR.mol('ethanol'), p = U.panel('¹H NMR spectrum of ethanol, CH₃CH₂OH', { stage: true });
    var host = U.el('div', { cls: 'nv tall' }); p.body.appendChild(host);
    var out = U.el('div', { cls: 'assign' }); p.body.appendChild(out);
    var v = ctx.view(host, { nuc: 'H', integ: false, labels: false, colour: false, startFit: true, alt: 'Proton NMR spectrum of ethanol' });
    v.setSpec(NMR.build(mol, 'H', { tms: true }));
    ctx.vis.appendChild(p.el);

    var CARDS = [
      ['1', 'Number of signals', 'How many <b>different proton environments</b>. Ethanol: CH₃, CH₂, OH, so 3.', { colour: true }],
      ['2', 'Chemical shift, δ', 'What <b>kind</b> of hydrogen: near O, near C=O, on a ring… Read it off the data sheet.', { colour: true, shift: true }],
      ['3', 'Integration', 'The <b>ratio</b> of hydrogens in each environment. Ethanol: 3 : 2 : 1.', { integ: true, steps: true }],
      ['4', 'Splitting', 'How many H on the <b>adjacent carbon</b>: n + 1 peaks. Quartet, triplet, singlet.', { labels: true }]
    ];
    var grid = U.el('div', { cls: 'grid2' }), cur = -1;
    CARDS.forEach(function (c, i) {
      var b = U.el('button', { type: 'button', cls: 'kcard a', style: 'text-align:left;cursor:pointer;font:inherit;color:inherit', 'aria-pressed': 'false' },
        '<div class="k">' + c[0] + ' · What it tells you</div><div class="v" style="font-size:1.1rem">' + c[1] + '</div><div class="w">' + c[2] + '</div>');
      b.addEventListener('click', function () { pick(i); });
      grid.appendChild(b);
    });
    var gp = U.panel('Four things a ¹H spectrum tells you', { stage: true }); gp.body.appendChild(grid); ctx.vis.appendChild(gp.el);
    function pick(i) {
      cur = i; var o = CARDS[i][3];
      U.$$('.kcard', grid).forEach(function (b, k) { b.setAttribute('aria-pressed', String(k === i)); b.style.borderColor = k === i ? 'var(--accent-text)' : ''; });
      v.o.colour = !!o.colour; v.o.integ = !!o.integ; v.o.steps = !!o.steps; v.o.labels = !!o.labels;
      v.marks = o.shift ? mol.H.map(function (e) { return { x: e.d, t: 'δ ' + e.d.toFixed(1), col: NMR.envColour(mol, e.id, 'H') }; }) : [];
      v.draw();
      out.innerHTML = [
        'Three signals: three environments. Colours match the groups: <b style="color:var(--e0)">CH₃</b>, <b style="color:var(--e1)">CH₂</b>, <b style="color:var(--e2)">OH</b>.',
        'The CH₂ is bonded to the oxygen, so it is <b>deshielded</b> and sits at higher δ (3.7) than the CH₃ (1.2).',
        'Step heights in the ratio <b>3 : 2 : 1</b>: three H in the CH₃, two in the CH₂, one in the OH.',
        'CH₃ is a <b>triplet</b> (2 H on the adjacent CH₂). CH₂ is a <b>quartet</b> (3 H on the adjacent CH₃). The O–H is a singlet.'][i];
    }
    pick(0);
    v.o.onSelect = function (id) { if (id) out.innerHTML = NMR.assignHTML(mol, 'H', id); };

    NMR.notes(ctx, { title: 'What is NMR for?', tag: 'spec',
      body: ['NMR spectroscopy shows where the <b>¹H</b> and <b>¹³C</b> atoms are in a molecule. Chemists use it to work out structures.',
        'AQA puts it plainly. The emphasis is on using analytical data to solve problems, rather than on spectroscopic theory.', 'So this tool spends most of its time on reading spectra, in Sections D to G.',
        'Tap each card under the spectrum, then tap a peak. Every spectrum here is simulated with real line shapes. Zoom with the + and − buttons and drag sideways to pan.'],
      list: ['<b>A–B</b> are context: how the machine works. Not examined, but it makes the rest make sense.', '<b>C–F</b> are the examined skills.', '<b>G</b> is exam practice at four levels.'] });
  }

  /* ───────── spin lab ───────── */
  function lab(ctx) {
    ctx.pair = true;
    var st = { stage: +(ctx.labStage || 1), B: 0, f: 50, rf: false, sweep: null, sweeping: false, absorb: 0 };
    var p = U.panel('Spin lab', { stage: true });
    var host = U.el('div', { cls: 'cv-host' }), cv = U.el('canvas', { role: 'img', 'aria-label': 'Nuclei in a magnetic field, with an energy-level diagram' });
    host.appendChild(cv); p.body.appendChild(host);
    var cap = U.el('p', { cls: 'stage-cap' }); p.body.appendChild(cap);
    ctx.vis.appendChild(p.el);
    var sp = U.panel('The spectrum the detector draws', { stage: true }), shost = U.el('div', { cls: 'nv short' });
    sp.body.appendChild(shost); ctx.vis.appendChild(sp.el);
    var mol = NMR.mol('ethanol'), sv = ctx.view(shost, { nuc: 'H', tools: false, alt: 'Spectrum built by the sweep' });
    sv.setSpec(NMR.build(mol, 'H', { tms: true, only: ['a', 'b'] }));
    sv.setRange(-0.5, 5); sv.setSweep(-0.5);

    // Controls
    var stepSeg = U.seg(NMR.STAGES.map(function (s) { return [String(s.id), s.id + ' ' + s.pin]; }), String(st.stage), function (v) { setStage(+v); }, 'full', 'Stage');
    ctx.ctl.appendChild(U.field('Stage', stepSeg));
    var bS = U.slider('Magnet (field strength)', { min: 0, max: 1, step: 0.01, value: 0, fmt: function (x) { return x < 0.01 ? 'off' : (x * 1.41).toFixed(2) + ' T'; } }, function (x) { st.B = x; });
    ctx.ctl.appendChild(bS);
    var fS = U.slider('Radio frequency', { min: 20, max: 70, step: 0.05, value: 50, fmt: function (x) { return x.toFixed(2) + ' MHz'; } }, function (x) { st.f = x; });
    ctx.ctl.appendChild(fS);
    var rfB = U.el('button', { type: 'button', cls: 'btn', 'aria-pressed': 'false' }, 'Radio waves: off');
    rfB.addEventListener('click', function () { st.rf = !st.rf; rfB.setAttribute('aria-pressed', String(st.rf)); rfB.textContent = 'Radio waves: ' + (st.rf ? 'on' : 'off'); rfB.classList.toggle('btn-accent', st.rf); });
    var swB = U.el('button', { type: 'button', cls: 'btn btn-accent' }, 'Sweep');
    swB.addEventListener('click', function () { st.sweep = -0.5; st.sweeping = true; sv.setSweep(-0.5); });
    var row = U.el('div', { cls: 'row' }); row.appendChild(rfB); row.appendChild(swB); ctx.ctl.appendChild(row);
    var hint = U.el('p', { cls: 'hint' }); ctx.ctl.appendChild(hint);

    function setStage(n) {
      st.stage = n; ctx.labStage = n; stepSeg.set(String(n));
      var S = NMR.STAGES[n - 1];
      if (n >= 2 && st.B < 0.05) { st.B = 0.8; bS.set(0.8); }
      if (n === 1) { st.B = 0; bS.set(0); }
      if (n === 3 && !st.rf) rfB.click();
      if (n === 4) { st.B = 1; bS.set(1); }
      bS.hidden = n >= 4; fS.hidden = n !== 3; rfB.hidden = n !== 3; swB.hidden = n !== 4;
      sp.el.hidden = n !== 4;
      host.style.height = n === 4 ? 'clamp(220px, 32vh, 340px)' : '';
      hint.innerHTML = S.q;
      cap.innerHTML = ['Each arrow is one ¹H nucleus. With no field they point every which way.',
        'In the field each nucleus lines up <b>with</b> (lower energy) or <b>against</b> (higher energy) it. The excess in the lower state is exaggerated here.',
        'Tune the radio frequency. Only when <b>hf = ΔE</b> for a group do its nuclei absorb and flip. CH₃ and CH₂ resonate at slightly different frequencies (exaggerated here: really about 150 Hz apart at 60 MHz).',
        'The sweep raises the frequency. Each group absorbs in turn, and the detector draws a peak for each.',
        'Electrons shield a nucleus from the field. Oxygen pulls electron density away from the CH₂, so it is <b>deshielded</b>: higher δ.'][n - 1];
      NMR.notes(ctx, { title: S.id + '. ' + S.t, tag: 'ctx', body: S.body, tip: S.q, tipLabel: 'Try this', insight: 'A' });
    }

    // Nuclei
    var N = [], i;
    for (i = 0; i < 20; i++) {
      var gx = i % 5, gy = Math.floor(i / 5);
      N.push({ x: (gx + 0.5 + (Math.random() - 0.5) * 0.4) / 5, y: (gy + 0.5 + (Math.random() - 0.5) * 0.35) / 4, g: i % 5 < 3 ? 'a' : 'b',
        up: Math.random() < 0.5, ang: Math.random() * 6.28, w: (Math.random() - 0.5) * 1.6, ph: Math.random() * 6.28, flash: 0 });
    }
    var SIG = { a: -0.012, b: 0.012 };
    function fres(g, B) { return 60 * B * (1 + SIG[g]); }

    var last = performance.now();
    ctx.raf(function (now) {
      var dt = Math.min(0.05, (now - last) / 1000); last = now;
      var r = host.getBoundingClientRect(); if (!r.width) return;
      var dpr = Math.min(2, window.devicePixelRatio || 1), W = r.width, H = r.height;
      if (cv.width !== Math.round(W * dpr) || cv.height !== Math.round(H * dpr)) { cv.width = Math.round(W * dpr); cv.height = Math.round(H * dpr); }
      var c = cv.getContext('2d'); c.setTransform(dpr, 0, 0, dpr, 0, 0); c.clearRect(0, 0, W, H);
      var pal = NMR.pal(), lab = window.SST_PRESENT && document.body.classList.contains('presenting') ? SST_PRESENT.px('--sst-pr-label') : 13;
      var font = function (w, s) { return w + ' ' + s + 'px "Plus Jakarta Sans",system-ui,sans-serif'; };

      // sweep
      var resG = null;
      if (st.stage === 4 && st.sweeping) {
        st.sweep += dt * 1.25; sv.setSweep(st.sweep);
        if (st.sweep > 5) { st.sweeping = false; sv.setSweep(null); }
        mol.H.forEach(function (e) { if (e.id !== 'c' && Math.abs(st.sweep - e.d) < 0.3) resG = e.id; });
      }
      if (st.stage === 3 && st.rf && st.B > 0.05) ['a', 'b'].forEach(function (g) { if (Math.abs(st.f - fres(g, st.B)) < 0.35) resG = g; });
      st.absorb += ((resG ? 1 : 0) - st.absorb) * Math.min(1, dt * 4);

      if (st.stage === 5) { drawShield(c, W, H, pal, lab, font); return; }

      var wide = W > 620, A = wide ? { x: 12, y: 12, w: W * 0.56 - 18, h: H - 24 } : { x: 10, y: 10, w: W - 20, h: H * 0.55 - 14 };
      var D = wide ? { x: W * 0.56 + 10, y: 14, w: W * 0.44 - 24, h: H - 28 } : { x: 10, y: H * 0.55 + 4, w: W - 20, h: H * 0.45 - 14 };
      // magnet poles
      var B = st.B;
      c.fillStyle = pal.grid; c.globalAlpha = 0.35 + 0.65 * B;
      c.fillRect(A.x, A.y, A.w, 14); c.fillRect(A.x, A.y + A.h - 14, A.w, 14); c.globalAlpha = 1;
      c.fillStyle = pal.axis; c.font = font(700, Math.max(11, lab * 0.85)); c.textAlign = 'center'; c.textBaseline = 'middle';
      NMR.fillText(c, B > 0.01 ? 'S' : '', A.x + A.w / 2, A.y + 7); NMR.fillText(c, B > 0.01 ? 'N' : '', A.x + A.w / 2, A.y + A.h - 7);
      // field lines
      if (B > 0.01) {
        c.strokeStyle = pal.grid; c.lineWidth = 1; c.globalAlpha = 0.25 + 0.6 * B;
        for (var k = 0; k < 6; k++) { var fx = A.x + (k + 0.5) * A.w / 6; c.beginPath(); c.moveTo(fx, A.y + A.h - 16); c.lineTo(fx, A.y + 18); c.stroke(); c.beginPath(); c.moveTo(fx - 4, A.y + 26); c.lineTo(fx, A.y + 18); c.lineTo(fx + 4, A.y + 26); c.stroke(); }
        c.globalAlpha = 1;
        c.fillStyle = pal.axis; c.textAlign = 'left'; c.font = font(700, Math.max(11, lab * 0.8)); NMR.fillText(c, 'B₀', A.x + 4, A.y + 28);
      }
      // nuclei
      var cell = Math.min(A.w / 5, (A.h - 30) / 4), rad = Math.max(9, Math.min(20, cell * 0.28));
      var pUp = 0.5 + 0.18 * B, colourGroups = st.stage >= 3;
      N.forEach(function (n) {
        if (B < 0.02) { n.ang += n.w * dt; }
        else {
          // thermal: drift towards the equilibrium populations
          if (Math.random() < dt * 0.25) n.up = Math.random() < pUp;
          if (resG === n.g && Math.random() < dt * 2.6) { n.up = !n.up; n.flash = 1; }
          var target = n.up ? -Math.PI / 2 : Math.PI / 2, wob = 0.08 + 0.5 * (1 - B);
          n.ph += dt * (2 + 6 * B);
          var want = target + wob * Math.sin(n.ph), d = Math.atan2(Math.sin(want - n.ang), Math.cos(want - n.ang));
          n.ang += d * Math.min(1, dt * 6);
        }
        n.flash = Math.max(0, n.flash - dt * 1.5);
        var px = A.x + n.x * A.w, py = A.y + 18 + n.y * (A.h - 36);
        var col = colourGroups ? (n.g === 'a' ? pal.env[0] : pal.env[1]) : pal.fg;
        if (n.flash > 0) { c.fillStyle = col; c.globalAlpha = n.flash * 0.35; c.beginPath(); c.arc(px, py, rad * 1.45, 0, 6.29); c.fill(); c.globalAlpha = 1; }
        c.strokeStyle = col; c.lineWidth = 1.5; c.beginPath(); c.arc(px, py, rad * 0.5, 0, 6.29); c.stroke();
        var ax = Math.cos(n.ang) * rad, ay = Math.sin(n.ang) * rad;
        c.lineWidth = 2.4; c.beginPath(); c.moveTo(px - ax, py - ay); c.lineTo(px + ax, py + ay); c.stroke();
        var hx = px + ax, hy = py + ay, ha = n.ang;
        c.beginPath(); c.moveTo(hx, hy); c.lineTo(hx - Math.cos(ha - 0.5) * 7, hy - Math.sin(ha - 0.5) * 7); c.moveTo(hx, hy); c.lineTo(hx - Math.cos(ha + 0.5) * 7, hy - Math.sin(ha + 0.5) * 7); c.stroke();
      });
      if (colourGroups) {
        c.font = font(700, lab); c.textAlign = 'left'; c.textBaseline = 'bottom';
        c.fillStyle = pal.env[0]; NMR.fillText(c, 'CH₃ nuclei', A.x + 4, A.y + A.h - 18);
        c.fillStyle = pal.env[1]; NMR.fillText(c, 'CH₂ nuclei', A.x + 4 + c.measureText('CH3 nuclei  ').width, A.y + A.h - 18);
      }
      // counts
      if (B > 0.02) {
        var up = N.filter(function (n) { return n.up; }).length;
        c.font = font(600, lab); c.fillStyle = pal.fg; c.textAlign = 'right'; c.textBaseline = 'bottom';
        NMR.fillText(c, 'with field ' + up + ' · against ' + (N.length - up), A.x + A.w - 4, A.y + A.h - 18);
      }

      // energy diagram
      c.strokeStyle = pal.axis; c.lineWidth = 1.2; c.beginPath(); c.moveTo(D.x + 30, D.y + 8); c.lineTo(D.x + 30, D.y + D.h - 30); c.lineTo(D.x + D.w - 4, D.y + D.h - 30); c.stroke();
      c.fillStyle = pal.axis; c.font = font(600, lab); c.textAlign = 'center'; c.textBaseline = 'top';
      NMR.fillText(c, 'field strength →', D.x + 30 + (D.w - 34) / 2, D.y + D.h - 26);
      c.save(); c.translate(D.x + 12, D.y + (D.h - 30) / 2); c.rotate(-Math.PI / 2); c.textBaseline = 'middle'; NMR.fillText(c, 'energy', 0, 0); c.restore();
      var x0 = D.x + 34, x1 = D.x + D.w - 8, ym = D.y + 8 + (D.h - 38) / 2, sp2 = (D.h - 50) / 2;
      c.strokeStyle = pal.fg; c.lineWidth = 2;
      c.beginPath(); c.moveTo(x0, ym); c.lineTo(x1, ym - sp2); c.moveTo(x0, ym); c.lineTo(x1, ym + sp2); c.stroke();
      c.font = font(600, Math.max(11, lab * 0.85)); c.textAlign = 'right'; c.textBaseline = 'bottom'; c.fillStyle = pal.fg;
      NMR.fillText(c, 'against the field', x1, ym - sp2 - 4); c.textBaseline = 'top'; NMR.fillText(c, 'with the field', x1, ym + sp2 + 4);
      if (B > 0.01) {
        var bx = x0 + B * (x1 - x0), gap = B * sp2;
        c.strokeStyle = pal.integ; c.lineWidth = 2; c.setLineDash([4, 4]); c.beginPath(); c.moveTo(bx, D.y + 8); c.lineTo(bx, D.y + D.h - 30); c.stroke(); c.setLineDash([]);
        arrow(c, bx - 10, ym + gap, bx - 10, ym - gap, pal.integ);
        c.fillStyle = pal.integ; c.font = font(800, lab); c.textAlign = 'right'; c.textBaseline = 'middle'; NMR.fillText(c, 'ΔE', bx - 16, ym);
        if (st.stage === 3) {
          var hf = (st.f / 60) * sp2, match = !!resG, hc = match ? pal.env[2] : pal.env[3];
          if (hf < sp2 * 1.6) arrow(c, bx + 12, ym + gap, bx + 12, ym + gap - 2 * hf * 0.5 * 1, hc);
          c.fillStyle = hc; c.textAlign = 'left'; NMR.fillText(c, 'hf', bx + 18, ym + gap - hf * 0.5);
          c.font = font(700, lab); c.textAlign = 'left'; c.textBaseline = 'top';
          NMR.fillText(c, match ? 'hf = ΔE: resonance (' + (resG === 'a' ? 'CH₃' : 'CH₂') + ')' : st.f < 60 * B ? 'hf too small' : 'hf too big', D.x + 36, D.y + 8);
        }
      }
      if (st.stage >= 3) {
        c.font = font(600, lab); c.fillStyle = pal.axis; c.textAlign = 'left'; c.textBaseline = 'bottom';
        var mw = Math.min(150, D.w * 0.5), mx = D.x + 36, my = D.y + 16 + lab * 2.4;
        NMR.fillText(c, 'energy absorbed', mx, my);
        c.fillStyle = pal.grid; c.fillRect(mx, my + 4, mw, 8);
        c.fillStyle = pal.env[2]; c.fillRect(mx, my + 4, mw * st.absorb, 8);
      }
    });
    function arrow(c, xa, ya, xb, yb, col) {
      c.strokeStyle = col; c.fillStyle = col; c.lineWidth = 2; c.beginPath(); c.moveTo(xa, ya); c.lineTo(xb, yb); c.stroke();
      var a = Math.atan2(yb - ya, xb - xa); c.beginPath(); c.moveTo(xb, yb); c.lineTo(xb - Math.cos(a - 0.4) * 9, yb - Math.sin(a - 0.4) * 9); c.lineTo(xb - Math.cos(a + 0.4) * 9, yb - Math.sin(a + 0.4) * 9); c.closePath(); c.fill();
      c.beginPath(); c.moveTo(xa, ya); c.lineTo(xa + Math.cos(a - 0.4) * 9, ya + Math.sin(a - 0.4) * 9); c.lineTo(xa + Math.cos(a + 0.4) * 9, ya + Math.sin(a + 0.4) * 9); c.closePath(); c.fill();
    }
    function drawShield(c, W, H, pal, lab, font) {
      // H3C–CH2–O–H with electron clouds: thick round the CH3 hydrogens, thin round the CH2 hydrogens.
      var s = Math.min(W / 640, H / 360), cx = W / 2, cy = H * 0.42, t = performance.now() / 1000;
      var P = { c1: [cx - 120 * s, cy], c2: [cx + 10 * s, cy], o: [cx + 130 * s, cy], ho: [cx + 200 * s, cy - 40 * s] };
      var Hs = [[P.c1, -150, 'a'], [P.c1, 150, 'a'], [P.c1, 90, 'a'], [P.c2, -60, 'b'], [P.c2, 60, 'b']];
      c.lineWidth = 2.5; c.strokeStyle = pal.axis;
      c.beginPath(); c.moveTo(P.c1[0], P.c1[1]); c.lineTo(P.c2[0], P.c2[1]); c.lineTo(P.o[0], P.o[1]); c.lineTo(P.ho[0], P.ho[1]); c.stroke();
      Hs.forEach(function (h) {
        var a = h[1] * Math.PI / 180, L = 70 * s, hx = h[0][0] + Math.cos(a) * L, hy = h[0][1] + Math.sin(a) * L, col = h[2] === 'a' ? pal.env[0] : pal.env[1];
        c.strokeStyle = pal.axis; c.beginPath(); c.moveTo(h[0][0], h[0][1]); c.lineTo(hx, hy); c.stroke();
        var dense = h[2] === 'a', R = (dense ? 30 : 20) * s * (1 + 0.04 * Math.sin(t * 2 + hx));
        var g = c.createRadialGradient(hx, hy, 2, hx, hy, R); g.addColorStop(0, col); g.addColorStop(1, 'rgba(0,0,0,0)');
        c.globalAlpha = dense ? 0.55 : 0.22; c.fillStyle = g; c.beginPath(); c.arc(hx, hy, R, 0, 6.29); c.fill(); c.globalAlpha = 1;
        c.fillStyle = col; c.font = font(800, lab * 1.1); c.textAlign = 'center'; c.textBaseline = 'middle'; NMR.fillText(c, 'H', hx, hy);
      });
      [['C', P.c1], ['C', P.c2], ['O', P.o], ['H', P.ho]].forEach(function (a) {
        c.fillStyle = pal.bg; c.beginPath(); c.arc(a[1][0], a[1][1], 15 * s + 4, 0, 6.29); c.fill();
        c.fillStyle = a[0] === 'O' ? pal.env[4] : a[1] === P.ho ? pal.env[2] : pal.fg; c.font = font(800, lab * 1.2); c.textAlign = 'center'; c.textBaseline = 'middle'; NMR.fillText(c, a[0], a[1][0], a[1][1]);
      });
      // electron pull towards O
      var pulse = (t % 1.4) / 1.4;
      c.fillStyle = pal.env[4]; c.globalAlpha = 1 - pulse;
      c.beginPath(); c.arc(P.c2[0] + (P.o[0] - P.c2[0]) * (0.25 + 0.5 * pulse), cy, 4, 0, 6.29); c.fill(); c.globalAlpha = 1;
      c.font = font(700, lab); c.fillStyle = pal.env[4]; c.textAlign = 'center'; c.textBaseline = 'bottom';
      c.textAlign = 'left'; c.textBaseline = 'top'; NMR.fillText(c, 'O pulls electron density', P.o[0] - 24 * s, cy + 30 * s);
      // shift axis
      var ay = H - 46, axL = 30, axR = W - 30, X = function (d) { return axR - d / 6 * (axR - axL); };
      c.strokeStyle = pal.axis; c.lineWidth = 1.2; c.beginPath(); c.moveTo(axL, ay); c.lineTo(axR, ay); c.stroke();
      c.fillStyle = pal.axis; c.font = font(500, lab * 0.9); c.textAlign = 'center'; c.textBaseline = 'top';
      for (var d = 0; d <= 6; d++) { NMR.fillText(c, String(d), X(d), ay + 5); }
      NMR.fillText(c, 'δ / ppm', (axL + axR) / 2, ay + 8 + lab);
      [[1.2, 'a', 'CH₃: shielded'], [3.7, 'b', 'CH₂: deshielded']].forEach(function (m) {
        var col = m[1] === 'a' ? pal.env[0] : pal.env[1]; c.strokeStyle = col; c.lineWidth = 3; c.beginPath(); c.moveTo(X(m[0]), ay); c.lineTo(X(m[0]), ay - 26); c.stroke();
        c.fillStyle = col; c.font = font(700, lab); c.textBaseline = 'bottom'; NMR.fillText(c, m[2], X(m[0]), ay - 30);
      });
    }
    setStage(st.stage);
  }

  /* ───────── parts ───────── */
  var PARTS = [
    ['magnet', 'Magnet', 'A superconducting magnet, cooled by liquid helium, makes a very strong, very even field. A stronger field gives a bigger ΔE and better-separated peaks.'],
    ['tube', 'Sample tube', 'A few milligrams of the compound dissolved in CDCl₃ (or CCl₄) with a little TMS. The tube spins so every molecule feels the same average field.'],
    ['coil', 'Radio-frequency coil', 'Surrounds the tube. It sends radio-frequency energy into the sample and picks up the signal from the nuclei.'],
    ['tx', 'RF transmitter', 'Produces the radio waves whose energy matches the gap between the spin states.'],
    ['rx', 'Detector', 'Measures the radio energy absorbed (and re-emitted as the nuclei relax) at each frequency.'],
    ['pc', 'Computer', 'Turns the signal into a spectrum and converts each frequency to a chemical shift, δ, measured from TMS.']
  ];
  function parts(ctx) {
    var p = U.panel('Inside an NMR spectrometer', { stage: true });
    var svg = '<svg class="inst-svg" viewBox="0 0 660 330" role="img" aria-label="Diagram of an NMR spectrometer">' +
      '<g class="part" data-p="magnet"><rect class="mag" x="30" y="44" width="100" height="226" rx="10"/><rect class="mag" x="270" y="44" width="100" height="226" rx="10"/><text class="t" x="80" y="163" text-anchor="middle">N</text><text class="t" x="320" y="163" text-anchor="middle">S</text><text class="s" x="80" y="302" text-anchor="middle">magnet</text></g>' +
      '<path class="ln" d="M140 100 H260 M140 155 H260 M140 225 H260" stroke-dasharray="4 5"/>' +
      '<g class="part" data-p="tube"><rect class="mag" x="188" y="58" width="24" height="192" rx="12"/><rect x="191" y="170" width="18" height="76" rx="9" class="accf" opacity=".35"/><path class="ln acc" d="M220 68 a16 6 0 1 1 -40 0" /><text class="s" x="200" y="30" text-anchor="middle">sample tube (spinning)</text></g>' +
      '<g class="part" data-p="coil"><rect class="mag" x="176" y="160" width="48" height="8" rx="3"/><rect class="mag" x="176" y="180" width="48" height="8" rx="3"/><rect class="mag" x="176" y="200" width="48" height="8" rx="3"/><path class="ln" d="M224 206 L236 280"/><text class="s" x="236" y="302" text-anchor="middle">RF coil</text></g>' +
      '<g class="part" data-p="tx"><rect class="mag" x="430" y="40" width="215" height="64" rx="10"/><text class="t" x="537" y="74" text-anchor="middle">RF transmitter</text><text class="s sub" x="537" y="94" text-anchor="middle">radio waves in</text></g>' +
      '<g class="part" data-p="rx"><rect class="mag" x="430" y="130" width="215" height="64" rx="10"/><text class="t" x="537" y="164" text-anchor="middle">Detector</text><text class="s sub" x="537" y="184" text-anchor="middle">signal out</text></g>' +
      '<g class="part" data-p="pc"><rect class="mag" x="430" y="220" width="215" height="90" rx="10"/><text class="t" x="537" y="250" text-anchor="middle">Computer</text><path class="ln acc" d="M452 292 h55 l7 -26 l6 26 h30 l5 -13 l5 13 h66"/></g>' +
      '<path class="ln acc" d="M430 72 H410 V184 H224"/><path class="ln" d="M224 196 H420 V162 H430"/><path class="ln" d="M537 194 V220"/></svg>';
    p.body.innerHTML = svg;
    var info = U.el('div', { cls: 'box', 'aria-live': 'polite' }); p.body.appendChild(info);
    ctx.vis.appendChild(p.el);
    function pick(id) {
      var it = PARTS.filter(function (x) { return x[0] === id; })[0]; if (!it) return;
      U.$$('.part', p.body).forEach(function (g) { g.classList.toggle('on', g.dataset.p === id); });
      info.innerHTML = '<h4>' + it[1] + '</h4><p>' + it[2] + '</p>';
      seg.set(id);
    }
    p.body.addEventListener('click', function (e) { var g = e.target.closest('.part'); if (g) pick(g.dataset.p); });
    var seg = U.seg(PARTS.map(function (x) { return [x[0], x[1]]; }), 'magnet', pick, 'full', 'Parts');
    ctx.ctl.appendChild(U.field('Tap a part', seg));
    pick('magnet');
    NMR.notes(ctx, { title: 'The instrument', tag: 'ctx',
      body: ['Not examined by AQA, but it explains what the data are. The sample sits in a strong magnetic field and is hit with radio waves. Nuclei in each environment absorb at their own frequency, and the computer plots absorption against chemical shift.',
        'Modern instruments send a short pulse that excites every frequency at once, then use a Fourier transform to sort the signal. The result is the same spectrum you would get by sweeping slowly.'],
      insight: 'A' });
  }

  NMR.section({ id: 'a', n: 'A', name: 'How NMR works', ds: 'What a spectrum tells you; magnets and radio waves', tag: 'ctx',
    subs: [{ id: 'intro', name: 'What a spectrum tells you', tag: 'spec' }, { id: 'lab', name: 'Spin lab', tag: 'ctx' }, { id: 'parts', name: 'The spectrometer', tag: 'ctx' }],
    render: function (sub, ctx) { if (sub === 'lab') lab(ctx); else if (sub === 'parts') parts(ctx); else intro(ctx); } });
})();
