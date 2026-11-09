/* Transition Metal Complexes — the stage canvas.
   One canvas serves all four modes. Each frame reads the palette for the
   current theme and, in presenter mode, sizes every pupil-facing word from
   the --sst-pr-* tokens, so nothing on the board falls below the floor. */
(function () {
  'use strict';
  var TMx = window.TM, M = window.Mol;

  var PAL = {
    dark: {
      stage: '#091321', text: '#edf2f8', muted: '#8693a5', line: '#182535', line2: '#2c3d52', accent: '#47b5fa', violet: '#b199f4',
      bond: '#8693a5', coord: '#e8b04b', atomEdge: '#050e1a', bad: '#ff6b6b', good: '#5fd38a', glass: '#9fb4cc', glassFill: 'rgba(159,180,204,0.10)',
      panel: '#0d1928', water: 'rgba(200,220,240,0.16)', ppt: 'rgba(255,255,255,0.06)',
      el: { H: '#eef2f6', C: '#9aa3ad', N: '#6f8dff', O: '#ff5a52', Cl: '#45c85f', Cu: '#d9894a', Co: '#e57fa6', Fe: '#e07a3a', Ni: '#5fd07a', Cr: '#8b9fd8', Al: '#c8b3b3', Pt: '#c9cfdc', Ag: '#d4d8de', Ti: '#b6bcc6' },
      elInk: { N: '#ffffff', O: '#1a0a0a', Cl: '#06210d' }
    },
    light: {
      stage: '#f8fafd', text: '#142030', muted: '#596473', line: '#d5dbe3', line2: '#aab5c2', accent: '#0068b2', violet: '#6c4ab3',
      bond: '#7d8a9a', coord: '#b07a10', atomEdge: '#142030', bad: '#c0392b', good: '#1b7a52', glass: '#56657a', glassFill: 'rgba(86,101,122,0.06)',
      panel: '#ffffff', water: 'rgba(120,150,190,0.14)', ppt: 'rgba(0,0,0,0.04)',
      el: { H: '#ffffff', C: '#6b7480', N: '#3456d8', O: '#e0342b', Cl: '#23a03e', Cu: '#c8742f', Co: '#d9608f', Fe: '#cc6128', Ni: '#2fae55', Cr: '#5f78c4', Al: '#b39a9a', Pt: '#9aa3b4', Ag: '#a9afb8', Ti: '#8e96a3' },
      elInk: { N: '#ffffff', O: '#ffffff', Cl: '#ffffff', C: '#ffffff' }
    }
  };
  function pal() { return PAL[window.SST_THEME && SST_THEME.get() === 'light' ? 'light' : 'dark']; }
  var FONT = "'Plus Jakarta Sans', system-ui, sans-serif";

  /* Text sizes: ordinary sizes on the page, the presenter tokens on the board. */
  function sizes(w) {
    var pres = document.body.classList.contains('presenting');
    if (pres && window.SST_PRESENT) {
      return { pres: true, label: SST_PRESENT.px('--sst-pr-label'), text: SST_PRESENT.px('--sst-pr-text'), figure: SST_PRESENT.px('--sst-pr-figure'), title: SST_PRESENT.px('--sst-pr-title') };
    }
    var k = Math.max(0.85, Math.min(1.15, w / 900));
    return { pres: false, label: Math.round(13 * k), text: Math.round(16 * k), figure: Math.round(24 * k), title: Math.round(20 * k) };
  }

  /* ---------- Rich text: prose with {formulae} ---------- */
  function tokens(text) {
    var out = [], re = /\{([^}]+)\}|([^{]+)/g, m;
    while ((m = re.exec(text))) {
      if (m[1]) out.push({ f: m[1] });
      else m[2].split(/(\s+)/).forEach(function (w) { if (w) out.push({ w: w }); });
    }
    return out;
  }
  function runsOf(tok) { return tok.f ? TMx.runs(tok.f) : [{ t: tok.w, m: 'n' }]; }
  function runW(ctx, rs, px, weight) {
    var w = 0;
    rs.forEach(function (r) { ctx.font = weight + ' ' + (r.m === 'n' ? px : px * 0.7) + 'px ' + FONT; w += ctx.measureText(r.t).width; });
    return w;
  }
  function runDraw(ctx, rs, x, y, px, weight) {
    rs.forEach(function (r) {
      var p = r.m === 'n' ? px : px * 0.7, dy = r.m === 'sub' ? px * 0.28 : r.m === 'sup' ? -px * 0.38 : 0;
      ctx.font = weight + ' ' + p + 'px ' + FONT;
      ctx.fillText(r.t, x, y + dy);
      x += ctx.measureText(r.t).width;
    });
    return x;
  }
  // Wraps to maxW; returns the height used. align: 'left' | 'center'.
  function rich(ctx, text, x, y, o) {
    var px = o.px, weight = o.weight || 600, lh = px * (o.lh || 1.3), maxW = o.maxW || 1e9;
    ctx.fillStyle = o.color; ctx.textBaseline = 'alphabetic'; ctx.textAlign = 'left';
    var toks = tokens(text), lines = [[]], lw = [0];
    toks.forEach(function (t) {
      var rs = runsOf(t), w = runW(ctx, rs, px, weight), L = lines.length - 1;
      if (t.w && /^\s+$/.test(t.w)) { if (lines[L].length) { lines[L].push({ rs: rs, w: w, sp: true }); lw[L] += w; } return; }
      if (lw[L] + w > maxW && lines[L].length) {
        while (lines[L].length && lines[L][lines[L].length - 1].sp) { lw[L] -= lines[L].pop().w; }
        lines.push([]); lw.push(0); L++;
      }
      lines[L].push({ rs: rs, w: w }); lw[L] += w;
    });
    if (o.maxLines && lines.length > o.maxLines) lines.length = o.maxLines;
    lines.forEach(function (ln, i) {
      while (ln.length && ln[ln.length - 1].sp) lw[i] -= ln.pop().w;
      var cx = o.align === 'center' ? x - lw[i] / 2 : o.align === 'right' ? x - lw[i] : x, cy = y + i * lh + px;
      ln.forEach(function (seg) { cx = runDraw(ctx, seg.rs, cx, cy, px, weight); });
    });
    return lines.length * lh;
  }

  function wlRGB(l) {
    var r = 0, g = 0, b = 0;
    if (l < 440) { r = -(l - 440) / 60; b = 1; }
    else if (l < 490) { g = (l - 440) / 50; b = 1; }
    else if (l < 510) { g = 1; b = -(l - 510) / 20; }
    else if (l < 580) { r = (l - 510) / 70; g = 1; }
    else if (l < 645) { r = 1; g = -(l - 645) / 65; }
    else { r = 1; }
    var f = l < 420 ? 0.35 + 0.65 * (l - 380) / 40 : l > 700 ? 0.35 + 0.65 * Math.max(0, 780 - l) / 80 : 1;
    function c(v) { return Math.round(255 * Math.pow(Math.max(0, v) * f, 0.8)); }
    return 'rgb(' + c(r) + ',' + c(g) + ',' + c(b) + ')';
  }
  function hexA(hex, a) {
    var n = parseInt(hex.slice(1), 16);
    return 'rgba(' + (n >> 16 & 255) + ',' + (n >> 8 & 255) + ',' + (n & 255) + ',' + a + ')';
  }
  function mix(h1, h2, t) {
    if (!h1) h1 = h2; if (!h2) h2 = h1; if (!h1) return null;
    var a = parseInt(h1.slice(1), 16), b = parseInt(h2.slice(1), 16);
    function ch(s) { return Math.round((a >> s & 255) + ((b >> s & 255) - (a >> s & 255)) * t); }
    return '#' + ((1 << 24) | (ch(16) << 16) | (ch(8) << 8) | ch(0)).toString(16).slice(1);
  }
  function rr(ctx, x, y, w, h, r) { ctx.beginPath(); ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r); ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath(); }
  function ease(t) { t = Math.max(0, Math.min(1, t)); return t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2; }

  /* A 3D model in a box, at the scale that fits it. */
  function modelView(mol, box, R, P, S, extra) {
    var ext = M.extent(mol) + 0.3, s = Math.min(box.w, box.h) / (2 * ext) * 0.95;
    var v = { R: R, cx: box.x + box.w / 2, cy: box.y + box.h / 2, s: s, persp: 16, pal: P, font: FONT, labels: true, labelPx: S.label };
    if (extra) Object.keys(extra).forEach(function (k) { v[k] = extra[k]; });
    return v;
  }

  /* ======================= Mode 1: test tubes ======================= */
  function drawLab(ctx, w, h, st, t) {
    var P = pal(), S = sizes(w), L = st.lab, wide = w / h > 1.15, pad = Math.max(12, w * 0.02);
    var A = wide ? { x: 0, y: 0, w: w * 0.48, h: h } : { x: 0, y: 0, w: w, h: h * 0.56 };
    var B = wide ? { x: w * 0.48, y: 0, w: w * 0.52, h: h } : { x: 0, y: h * 0.56, w: w, h: h * 0.44 };
    var cur = L.view, tr = Math.min(1, (t - L.changedAt) / 900);

    // Header: the ion and reagent.
    ctx.textBaseline = 'alphabetic';
    var hy = pad;
    hy += rich(ctx, L.headline, pad, hy, { px: S.text, color: P.text, weight: 700, maxW: A.w - pad * 2 });

    // Tube geometry.
    var tubeH = Math.min(A.h - hy - S.text * 5.2 - pad * 2, A.h * 0.62), tubeW = Math.max(46, Math.min(A.w * 0.2, tubeH * 0.26));
    var tx = A.x + A.w / 2 - tubeW / 2, ty = hy + pad * 1.6 + S.label * 0.6, bottom = ty + tubeH;
    var liqTop = ty + tubeH * 0.38, r = tubeW / 2;

    // Dropper and falling drops.
    var dx = A.x + A.w / 2, dTop = ty - 2;
    if (L.dropAt && t - L.dropAt < 1400) {
      ctx.fillStyle = P.glass; ctx.globalAlpha = 0.9;
      var dLen = Math.max(14, Math.min(tubeW * 0.9, ty - hy - 10));
      rr(ctx, dx - tubeW * 0.1, ty - 4 - dLen, tubeW * 0.2, dLen, 4); ctx.fill();
      ctx.globalAlpha = 1;
      for (var k = 0; k < 3; k++) {
        var dt = (t - L.dropAt - k * 320) / 650;
        if (dt < 0 || dt > 1) continue;
        var dy = dTop + (liqTop - dTop) * dt * dt;
        ctx.fillStyle = P.accent; ctx.beginPath(); ctx.arc(dx, dy, Math.max(3, tubeW * 0.06), 0, Math.PI * 2); ctx.fill();
      }
    }

    // Liquid: colour blends from the previous state to this one.
    var solHex = mix(L.prevSol, cur.sol, ease(tr));
    ctx.save();
    ctx.beginPath(); ctx.moveTo(tx, liqTop); ctx.lineTo(tx, bottom - r); ctx.arc(tx + r, bottom - r, r, Math.PI, 0, true); ctx.lineTo(tx + tubeW, liqTop); ctx.closePath();
    ctx.clip();
    ctx.fillStyle = solHex ? hexA(solHex, 0.92) : P.water;
    ctx.fillRect(tx - 2, liqTop, tubeW + 4, bottom - liqTop + 2);
    // Meniscus line.
    ctx.strokeStyle = solHex ? hexA(mix(solHex, '#ffffff', 0.4), 0.9) : P.glass; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(tx, liqTop + 1); ctx.lineTo(tx + tubeW, liqTop + 1); ctx.stroke();
    // Precipitate: a cloud that settles into a layer.
    if (cur.ppt) {
      var age = (t - L.pptAt) / 2600, settle = ease(Math.min(1, age)), layer = (bottom - liqTop) * 0.3;
      var seed = 7;
      function rnd() { seed = (seed * 9301 + 49297) % 233280; return seed / 233280; }
      ctx.fillStyle = cur.ppt;
      var top0 = liqTop + 4, n = 140;
      for (var i = 0; i < n; i++) {
        var fx = tx + 3 + rnd() * (tubeW - 6), fy0 = top0 + rnd() * (bottom - top0 - 4), fy1 = bottom - 3 - rnd() * layer;
        var yy = fy0 + (fy1 - fy0) * settle, rad = Math.max(1.6, tubeW * (0.025 + rnd() * 0.03));
        ctx.globalAlpha = 0.85; ctx.beginPath(); ctx.arc(fx, yy, rad, 0, Math.PI * 2); ctx.fill();
      }
      ctx.globalAlpha = settle * 0.95;
      ctx.beginPath(); ctx.moveTo(tx - 2, bottom - layer * 0.85); ctx.lineTo(tx + tubeW + 2, bottom - layer * 0.85); ctx.lineTo(tx + tubeW + 2, bottom + 2); ctx.lineTo(tx - 2, bottom + 2); ctx.fill();
      ctx.globalAlpha = 1;
      // Iron(II) hydroxide darkens at the surface on standing.
      if (cur.darkens && age > 2.5) {
        var dk = Math.min(1, (age - 2.5) / 4);
        ctx.fillStyle = hexA('#7a4a22', 0.75 * dk);
        ctx.fillRect(tx - 2, bottom - layer * 0.85 - 2, tubeW + 4, Math.max(3, layer * 0.18));
      }
    }
    // Bubbles of CO2.
    if (cur.gas) {
      ctx.strokeStyle = P.text; ctx.lineWidth = 1.4; ctx.globalAlpha = 0.75;
      for (var b = 0; b < 14; b++) {
        var ph = ((t / 1600) + b * 0.137) % 1, bx = tx + tubeW * (0.2 + 0.6 * ((b * 0.618) % 1)) + Math.sin(t / 300 + b) * 2;
        var by = bottom - 6 - ph * (bottom - liqTop - 8);
        ctx.beginPath(); ctx.arc(bx, by, Math.max(2, tubeW * 0.045), 0, Math.PI * 2); ctx.stroke();
      }
      ctx.globalAlpha = 1;
    }
    ctx.restore();
    // Glass.
    ctx.strokeStyle = P.glass; ctx.lineWidth = Math.max(2, tubeW * 0.05);
    ctx.beginPath(); ctx.moveTo(tx - tubeW * 0.08, ty); ctx.lineTo(tx, ty + 4); ctx.lineTo(tx, bottom - r); ctx.arc(tx + r, bottom - r, r, Math.PI, 0, true); ctx.lineTo(tx + tubeW, ty + 4); ctx.lineTo(tx + tubeW * 1.08, ty); ctx.stroke();
    ctx.fillStyle = P.glassFill; ctx.fillRect(tx + 2, ty + 4, tubeW - 4, liqTop - ty - 4);

    // Hidden until pupils predict.
    if (L.pending) {
      ctx.fillStyle = P.stage; ctx.globalAlpha = 0.86;
      ctx.fillRect(tx - 6, ty - 4, tubeW + 12, bottom - ty + 10); ctx.globalAlpha = 1;
      ctx.fillStyle = P.accent; ctx.font = '800 ' + S.figure * 1.4 + 'px ' + FONT; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText('?', tx + tubeW / 2, (ty + bottom) / 2);
    }

    // Observation under the tube.
    var oy = bottom + pad * 0.8;
    if (L.pending) {
      rich(ctx, 'What will you see? Predict first.', A.x + A.w / 2, oy, { px: S.text, color: P.accent, weight: 700, align: 'center', maxW: A.w - pad * 2 });
    } else {
      var used = rich(ctx, cur.obs, A.x + A.w / 2, oy, { px: S.text, color: P.text, weight: 800, align: 'center', maxW: A.w - pad * 2, maxLines: 3 });
      if (cur.stageLabel) rich(ctx, cur.stageLabel, A.x + A.w / 2, oy + used + 2, { px: S.label, color: P.muted, weight: 600, align: 'center', maxW: A.w - pad * 2 });
    }

    // The complex, in 3D.
    if (!wide) { ctx.strokeStyle = P.line; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(pad, B.y); ctx.lineTo(w - pad, B.y); ctx.stroke(); }
    else { ctx.strokeStyle = P.line; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(B.x, pad); ctx.lineTo(B.x, h - pad); ctx.stroke(); }
    var sp = L.pending ? null : TMx.SP[cur.sp];
    var by0 = B.y + pad;
    if (sp) {
      by0 += rich(ctx, '{' + sp.f + '}', B.x + B.w / 2, by0, { px: S.figure, color: P.text, weight: 800, align: 'center', maxW: B.w - pad * 2 });
      by0 += rich(ctx, sp.ionic ? 'ionic solid' : sp.shape + ' · co-ordination number ' + sp.cn, B.x + B.w / 2, by0 + 2, { px: S.label, color: P.muted, weight: 600, align: 'center', maxW: B.w - pad * 2 }) + 4;
      var box = { x: B.x + pad, y: by0, w: B.w - pad * 2, h: B.y + B.h - by0 - pad - S.label * 1.6 };
      L.modelBox = box;
      if (sp.model && box.h > 40) {
        var mol = L.mol && L.molFor === cur.sp ? L.mol : (L.mol = M.build(sp.model), L.molFor = cur.sp, L.mol);
        M.draw(ctx, mol, modelView(mol, box, st.labR, P, S, { showH: true }));
        rich(ctx, 'Coloured sticks are co-ordinate bonds', B.x + B.w / 2, B.y + B.h - pad - S.label * 1.3, { px: S.label, color: P.coord, weight: 600, align: 'center', maxW: B.w - pad * 2 });
      } else if (box.h > 40) {
        rich(ctx, 'A metal carbonate is an ionic solid, not a complex ion, so there is no single model to show.', B.x + B.w / 2, box.y + box.h / 2 - S.text, { px: S.text, color: P.muted, weight: 600, align: 'center', maxW: Math.min(B.w - pad * 2, S.text * 22) });
      }
    } else {
      L.modelBox = null;
      rich(ctx, 'The complex is revealed after the prediction.', B.x + B.w / 2, B.y + B.h / 2 - S.text, { px: S.text, color: P.muted, weight: 600, align: 'center', maxW: B.w - pad * 2 });
    }
  }

  /* ======================= Mode 2: shapes and isomers ======================= */
  function drawShapes(ctx, w, h, st, t) {
    var P = pal(), S = sizes(w), Z = st.shape, md = Z.model, pad = Math.max(12, w * 0.02);
    var y = pad;
    y += rich(ctx, md.title, pad, y, { px: S.text, color: P.text, weight: 800, maxW: w - pad * 2 });
    y += rich(ctx, md.sub, pad, y + 2, { px: S.label, color: P.muted, weight: 600, maxW: w - pad * 2 }) + 6;
    var foot = S.text * 2.8 + pad, area = { x: pad, y: y, w: w - pad * 2, h: h - y - foot };
    var pair = Z.pair, R = st.shapeR;
    var showAngle = Z.angle && md.arc;

    if (!pair) {
      var view = modelView(Z.molA, area, R, P, S, { showH: Z.showH, labels: Z.labels });
      M.draw(ctx, Z.molA, view);
      if (showAngle) M.angleArc(ctx, Z.molA, view, md.arc[0], md.arc[1], md.angle);
      return footer();
    }

    var half = { w: area.w / 2, h: area.h };
    var ext = Math.max(M.extent(Z.molA), M.extent(Z.molB)) + 0.3, s = Math.min(half.w, half.h) / (2 * ext) * 0.95;
    var sup = Z.sup, k = sup ? ease((t - sup.t0) / 1800) : 0;
    var cxA = area.x + half.w / 2, cxB = area.x + half.w * 1.5, cy = area.y + area.h / 2, cxM = area.x + area.w / 2;
    var RB;
    if (pair === 'mirror') {
      // The right-hand model is the mirror image of the left one in the dashed plane.
      var Sx = [[-1, 0, 0], [0, 1, 0], [0, 0, 1]];
      RB = M.m.mm(M.m.mm(Sx, R), Sx);
      if (sup) {
        var target = M.m.mm(R, sup.G);
        RB = M.m.fromQ(M.m.slerp(M.m.toQ(RB), M.m.toQ(target), k));
      }
    } else RB = R;
    var sc = sup ? s * (1 + 0.35 * k) : s;
    var vA = { R: R, cx: cxA + (cxM - cxA) * k, cy: cy, s: sc, persp: 16, pal: P, font: FONT, labels: Z.labels, labelPx: S.label, showH: Z.showH };
    var vB = { R: RB, cx: cxB + (cxM - cxB) * k, cy: cy, s: sc, persp: 16, pal: P, font: FONT, labels: Z.labels, labelPx: S.label, showH: Z.showH, alpha: sup ? 1 - 0.45 * k : 1 };
    if (sup && k >= 1) vB.bad = sup.bad;

    if (pair === 'mirror' && !sup) {
      ctx.save(); ctx.strokeStyle = P.violet; ctx.lineWidth = 2; ctx.setLineDash([10, 8]);
      ctx.beginPath(); ctx.moveTo(cxM, area.y + 4); ctx.lineTo(cxM, area.y + area.h - 4); ctx.stroke(); ctx.restore();
      rich(ctx, 'mirror', cxM, area.y + area.h - S.label * 1.2, { px: S.label, color: P.violet, weight: 700, align: 'center' });
    }
    M.draw(ctx, Z.molA, vA);
    if (showAngle && !sup) M.angleArc(ctx, Z.molA, vA, md.arc[0], md.arc[1], md.angle);
    M.draw(ctx, Z.molB, vB);
    if (!sup) {
      rich(ctx, Z.labA, cxA, area.y + area.h - S.text * 1.2, { px: S.text, color: P.text, weight: 800, align: 'center', maxW: half.w - pad });
      rich(ctx, Z.labB, cxB, area.y + area.h - S.text * 1.2, { px: S.text, color: P.text, weight: 800, align: 'center', maxW: half.w - pad });
    }
    return footer();

    function footer() {
      var msg = Z.verdict && sup && k >= 1 ? Z.verdict : md.foot;
      var col = Z.verdict && sup && k >= 1 ? (sup.bad.length ? P.bad : P.good) : P.muted;
      if (msg) rich(ctx, msg, w / 2, h - foot + pad * 0.4, { px: S.text, color: col, weight: 700, align: 'center', maxW: w - pad * 2, maxLines: 2 });
    }
  }

  /* ======================= Mode 3: why colour? ======================= */
  function fill(d, geo) {
    // High-spin filling: one in each orbital first, then pairs.
    var lo = geo === 'tet' ? 2 : 3, hi = 5 - lo, boxes = [];
    for (var i = 0; i < 5; i++) boxes.push(0);
    var order = [];
    for (var a = 0; a < 5; a++) order.push(a);
    for (var b = 0; b < 5; b++) order.push(b);
    for (var n = 0; n < d; n++) boxes[order[n]]++;
    return { lo: boxes.slice(0, lo), hi: boxes.slice(lo), nlo: lo, nhi: hi };
  }
  function absorbs(c, lam) { return c.lam != null && Math.abs(lam - c.lam) <= c.w; }
  function band(c, l) { return c.lam == null ? 0 : Math.exp(-Math.LN2 * Math.pow((l - c.lam) / c.w, 2)); }

  function drawColour(ctx, w, h, st, t) {
    var P = pal(), S = sizes(w), C = st.col, c = C.c, pad = Math.max(12, w * 0.02), wide = w / h > 1.2;
    var E = wide ? { x: 0, y: 0, w: w * 0.54, h: h } : { x: 0, y: 0, w: w, h: h * 0.55 };
    var Rt = wide ? { x: w * 0.54, y: 0, w: w * 0.46, h: h * 0.5 } : { x: 0, y: h * 0.55, w: w * 0.45, h: h * 0.45 };
    var Rb = wide ? { x: w * 0.54, y: h * 0.5, w: w * 0.46, h: h * 0.5 } : { x: w * 0.45, y: h * 0.55, w: w * 0.55, h: h * 0.45 };
    ctx.strokeStyle = P.line; ctx.lineWidth = 1;
    ctx.beginPath();
    if (wide) { ctx.moveTo(E.w, pad); ctx.lineTo(E.w, h - pad); ctx.moveTo(Rt.x + pad, Rb.y); ctx.lineTo(w - pad, Rb.y); }
    else { ctx.moveTo(pad, E.h); ctx.lineTo(w - pad, E.h); ctx.moveTo(Rb.x, Rb.y + pad); ctx.lineTo(Rb.x, h - pad); }
    ctx.stroke();

    /* --- Energy diagram --- */
    var y = pad;
    y += rich(ctx, '{' + c.f + '}', pad, y, { px: S.text, color: P.text, weight: 800, maxW: E.w - pad * 2 });
    y += rich(ctx, 'd' + c.d + ' · ' + (c.geo === 'tet' ? 'tetrahedral' : 'octahedral'), pad, y + 2, { px: S.label, color: P.muted, weight: 600 });
    // A lane along the bottom carries the light through the solution.
    var laneY = E.y + E.h - pad - S.label * 1.9, top0 = y + S.label;
    var fl = fill(c.d, c.geo), axisX = pad + S.label * 0.6;
    var box = Math.max(26, Math.min(E.w * 0.085, (laneY - top0) * 0.14, 96));
    var gx0 = axisX + S.label * 2.2, slot = box * 1.25;
    var gap = C.gapPx * (laneY - top0 - box * 2 - S.label * 1.5), midY = top0 + (laneY - top0) * 0.5, loY = midY + gap / 2, hiY = midY - gap / 2 - box;
    // Energy axis.
    ctx.strokeStyle = P.muted; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(axisX, laneY - S.label * 0.8); ctx.lineTo(axisX, top0 + 6); ctx.stroke();
    ctx.fillStyle = P.muted; ctx.beginPath(); ctx.moveTo(axisX, top0 - 2); ctx.lineTo(axisX - 6, top0 + 8); ctx.lineTo(axisX + 6, top0 + 8); ctx.fill();
    ctx.save(); ctx.translate(axisX - S.label * 0.3, top0 + 14); ctx.rotate(-Math.PI / 2);
    ctx.font = '700 ' + S.label + 'px ' + FONT; ctx.textAlign = 'right'; ctx.textBaseline = 'alphabetic'; ctx.fillStyle = P.muted; ctx.fillText('Energy', 0, 0); ctx.restore();

    var ex = C.excite, exK = 0;
    if (ex) {
      var age = t - ex.t0;
      exK = age < 500 ? ease(age / 500) : age < 2200 ? 1 : age < 2900 ? 1 - ease((age - 2200) / 700) : 0;
      if (age >= 2900) C.excite = ex = null;
    }
    function arrow(x, yy, up) {
      var a = yy + box * 0.18, b = yy + box * 0.82, hd = box * 0.16;
      ctx.beginPath(); ctx.moveTo(x, a); ctx.lineTo(x, b); ctx.stroke();
      ctx.beginPath();
      if (up) { ctx.moveTo(x, a - 1); ctx.lineTo(x - hd * 0.8, a + hd); ctx.lineTo(x + hd * 0.8, a + hd); }
      else { ctx.moveTo(x, b + 1); ctx.lineTo(x - hd * 0.8, b - hd); ctx.lineTo(x + hd * 0.8, b - hd); }
      ctx.fill();
    }
    function drawSet(n, counts, yy, tag) {
      var xs = [];
      for (var i = 0; i < n; i++) {
        var bx = gx0 + i * slot;
        xs.push(bx);
        ctx.strokeStyle = P.text; ctx.lineWidth = 2; ctx.strokeRect(bx, yy, box, box);
        var cnt = counts[i];
        if (ex && tag === 'lo' && ex.from === i) cnt -= 1;
        if (ex && tag === 'hi' && ex.to === i) cnt -= 1;
        ctx.strokeStyle = P.accent; ctx.fillStyle = P.accent; ctx.lineWidth = Math.max(2, box * 0.07);
        if (cnt >= 1) arrow(bx + box * 0.33, yy, true);
        if (cnt >= 2) arrow(bx + box * 0.67, yy, false);
      }
      return xs;
    }
    var xsLo = drawSet(fl.nlo, fl.lo, loY, 'lo'), xsHi = drawSet(fl.nhi, fl.hi, hiY, 'hi');
    // The electron on its way up (or back down).
    if (ex) {
      var pairedFrom = fl.lo[ex.from] === 2, fx = xsLo[ex.from] + box * (pairedFrom ? 0.67 : 0.33);
      var hiCnt = fl.hi[ex.to], tx2 = xsHi[ex.to] + box * (hiCnt >= 1 ? 0.67 : 0.33);
      ctx.strokeStyle = P.violet; ctx.fillStyle = P.violet; ctx.lineWidth = Math.max(2, box * 0.07);
      arrow(fx + (tx2 - fx) * exK, loY + (hiY - loY) * exK, !(pairedFrom || hiCnt >= 1));
    }
    var lx = gx0 + Math.max(fl.nlo, fl.nhi) * slot + box * 0.15, lblW = E.w - lx - pad;
    var upNow = ex && exK > 0.5;
    rich(ctx, 'excited state', lx, hiY + box * 0.5 - S.label * 0.95, { px: S.label, color: upNow ? P.violet : P.muted, weight: 700, maxW: lblW });
    rich(ctx, 'ground state', lx, loY + box * 0.5 - S.label * 0.95, { px: S.label, color: upNow ? P.muted : P.accent, weight: 700, maxW: lblW });
    if (c.lam) {
      // ΔE: an arrow between the two sets, with its value beside it.
      var bx2 = gx0 - S.label * 0.9, top = hiY + box * 0.5, bot = loY + box * 0.5;
      ctx.strokeStyle = P.violet; ctx.fillStyle = P.violet; ctx.lineWidth = 2.5;
      ctx.beginPath(); ctx.moveTo(bx2, top + 6); ctx.lineTo(bx2, bot - 6); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(bx2, top); ctx.lineTo(bx2 - 6, top + 10); ctx.lineTo(bx2 + 6, top + 10); ctx.fill();
      ctx.beginPath(); ctx.moveTo(bx2, bot); ctx.lineTo(bx2 - 6, bot - 10); ctx.lineTo(bx2 + 6, bot - 10); ctx.fill();
      var dE = TMx.K.h * TMx.K.c / (c.lam * 1e-9);
      var my = (hiY + box + loY) / 2 - S.label * 1.3;
      var hE = rich(ctx, 'ΔE = ' + sci(dE) + ' J', lx, my, { px: S.label, color: P.violet, weight: 800, maxW: lblW });
      rich(ctx, 'absorbs λ = ' + c.lam + ' nm', lx, my + hE, { px: S.label, color: P.muted, weight: 600, maxW: lblW });
    } else {
      rich(ctx, c.d === 0 ? 'No d electrons to promote' : 'd sub-level full: nowhere to promote an electron to', gx0, (hiY + box + loY) / 2 - S.label * 0.8, { px: S.label, color: P.bad, weight: 700, maxW: E.w - gx0 - pad });
    }

    // Photons in the lane: absorbed ones vanish under the boxes and lift an electron.
    var hitX = gx0 + box * 0.5, x0 = E.x + pad, x1 = E.x + E.w - pad;
    ctx.strokeStyle = P.line2; ctx.lineWidth = 1; ctx.setLineDash([4, 6]);
    ctx.beginPath(); ctx.moveTo(x0, laneY); ctx.lineTo(x1, laneY); ctx.stroke(); ctx.setLineDash([]);
    rich(ctx, C.mode === 'probe' ? 'light of ' + C.probe + ' nm in' : 'white light in', x0, laneY + S.label * 0.15, { px: S.label, color: P.muted, weight: 600 });
    rich(ctx, 'transmitted', x1, laneY + S.label * 0.15, { px: S.label, color: P.muted, weight: 600, align: 'right' });
    C.photons.forEach(function (ph) {
      var k = (t - ph.t0) / ph.dur;
      if (k < 0 || k > 1.2) return;
      var x = x0 + (x1 - x0) * k;
      if (ph.abs && x >= hitX && !ph.done) {
        ph.done = true;
        if (!C.excite && c.lam) {
          var from = 0, to = 0;
          for (var i = fl.nlo - 1; i >= 0; i--) if (fl.lo[i] > 0) { from = i; break; }
          for (var j = 0; j < fl.nhi; j++) if (fl.hi[j] < 2) { to = j; break; }
          C.excite = { t0: t, from: from, to: to };
        }
        ph.flash = t;
      }
      if (ph.done) {
        var fa = (t - ph.flash) / 400;
        if (fa < 1) { ctx.strokeStyle = wlRGB(ph.lam); ctx.globalAlpha = 1 - fa; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(hitX, laneY, 6 + fa * box * 0.6, 0, Math.PI * 2); ctx.stroke(); ctx.globalAlpha = 1; }
        return;
      }
      var len = Math.min(E.w * 0.12, 90), amp = Math.max(4, S.label * 0.32), wl = Math.max(9, ph.lam / 26);
      ctx.strokeStyle = ph.lam > 750 ? P.muted : wlRGB(ph.lam); ctx.lineWidth = Math.max(2.5, S.label * 0.16);
      ctx.beginPath();
      for (var q = 0; q <= len; q += 2) {
        var xx = Math.max(x0, x - len + q), yy = laneY - S.label * 0.9 + Math.sin((q / wl) * Math.PI * 2 - t / 90) * amp;
        if (q) ctx.lineTo(xx, yy); else ctx.moveTo(xx, yy);
      }
      ctx.stroke();
    });

    /* --- Colour wheel --- */
    ctx.font = '800 ' + S.label + 'px ' + FONT;
    var lblW = ctx.measureText('orange').width + S.label * 0.8;
    var wr = Math.max(30, Math.min(Rt.w / 2 - lblW - pad, (Rt.h - pad * 2 - S.label * 5.6) / 2)), wcx = Rt.x + Rt.w / 2, wcy = Rt.y + pad + S.label * 2.7 + wr;
    rich(ctx, 'Colour wheel', Rt.x + pad, Rt.y + pad, { px: S.label, color: P.muted, weight: 700 });
    var lo = c.lam ? Math.max(380, c.lam - c.w) : 0, hi2 = c.lam ? Math.min(750, c.lam + c.w) : 0;
    var absorbed = TMx.WHEEL.map(function (sg) { return c.lam && lo < sg.to && hi2 > sg.from && (Math.min(sg.to, hi2) - Math.max(sg.from, lo)) > 12; });
    TMx.WHEEL.forEach(function (sg, i) {
      var a0 = -Math.PI / 2 + i * Math.PI / 3 - Math.PI / 6, a1 = a0 + Math.PI / 3;
      var seen = absorbed[(i + 3) % 6] && !absorbed[i];
      ctx.fillStyle = sg.hex; ctx.globalAlpha = absorbed[i] ? 0.28 : 1;
      ctx.beginPath(); ctx.moveTo(wcx, wcy); ctx.arc(wcx, wcy, wr, a0, a1); ctx.closePath(); ctx.fill();
      ctx.globalAlpha = 1;
      ctx.strokeStyle = P.stage; ctx.lineWidth = 3; ctx.stroke();
      var am = (a0 + a1) / 2;
      ctx.font = (seen || absorbed[i] ? '800 ' : '600 ') + S.label + 'px ' + FONT; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillStyle = seen ? P.text : P.muted; ctx.globalAlpha = absorbed[i] ? 0.7 : 1;
      var side = Math.cos(am);
      ctx.textAlign = Math.abs(side) < 0.2 ? 'center' : side > 0 ? 'left' : 'right';
      ctx.fillText(sg.name, wcx + side * (wr + S.label * 0.45), wcy + Math.sin(am) * (wr + S.label * (Math.abs(side) < 0.2 ? 0.85 : 0.2)));
      ctx.globalAlpha = 1;
      if (absorbed[i]) {
        ctx.strokeStyle = P.text; ctx.lineWidth = 2; ctx.setLineDash([6, 5]);
        ctx.beginPath(); ctx.arc(wcx, wcy, wr, a0 + 0.04, a1 - 0.04); ctx.stroke(); ctx.setLineDash([]);
      }
    });
    ctx.fillStyle = c.colour || P.stage; ctx.strokeStyle = P.line2; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.arc(wcx, wcy, wr * 0.42, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
    var sub2 = c.colour ? 'faded: absorbed · bold: seen' : 'nothing absorbed in the visible: colourless';
    rich(ctx, sub2, wcx, wcy + wr + S.label * 1.4, { px: S.label, color: P.muted, weight: 600, align: 'center', maxW: Rt.w - pad * 2, maxLines: 2 });

    /* --- Absorption spectrum --- */
    var gy0 = Rb.y + pad;
    rich(ctx, 'Absorption spectrum', Rb.x + pad, gy0, { px: S.label, color: P.muted, weight: 700 });
    var gx = Rb.x + pad + S.label * 1.2, gw = Rb.w - pad * 2 - S.label * 1.2, gTop = gy0 + S.label * 3.4, gBot = Rb.y + Rb.h - pad - S.label * 3.5, gh = gBot - gTop;
    var L0 = 400, L1 = 750;
    function X(l) { return gx + (l - L0) / (L1 - L0) * gw; }
    // Rainbow strip along the axis.
    for (var l = L0; l < L1; l += 2) { ctx.fillStyle = wlRGB(l); ctx.fillRect(X(l), gBot + 3, Math.ceil(gw / 175) + 1, Math.max(8, S.label * 0.55)); }
    ctx.strokeStyle = P.muted; ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.moveTo(gx, gTop); ctx.lineTo(gx, gBot); ctx.lineTo(gx + gw, gBot); ctx.stroke();
    ctx.save(); ctx.translate(gx - S.label * 0.35, gBot); ctx.rotate(-Math.PI / 2);
    ctx.font = '600 ' + S.label + 'px ' + FONT; ctx.fillStyle = P.muted; ctx.textAlign = 'left'; ctx.fillText('absorbance', 0, 0); ctx.restore();
    ctx.font = '600 ' + S.label + 'px ' + FONT; ctx.fillStyle = P.muted; ctx.textAlign = 'center'; ctx.textBaseline = 'top';
    [400, 500, 600, 700].forEach(function (v) { ctx.fillText(v, X(v), gBot + 6 + Math.max(8, S.label * 0.55)); });
    ctx.textBaseline = 'top'; ctx.fillText('wavelength, λ / nm', gx + gw / 2, gBot + 8 + Math.max(8, S.label * 0.55) + S.label * 1.15);
    if (c.lam) {
      ctx.beginPath();
      for (var q = L0; q <= L1; q += 3) { var yy = gBot - band(c, q) * gh * 0.92; if (q === L0) ctx.moveTo(X(q), yy); else ctx.lineTo(X(q), yy); }
      ctx.strokeStyle = P.text; ctx.lineWidth = Math.max(2.5, S.label * 0.15); ctx.stroke();
      ctx.lineTo(X(L1), gBot); ctx.lineTo(X(L0), gBot); ctx.closePath(); ctx.fillStyle = hexA(c.colour, 0.25); ctx.fill();
      var lmx = Math.min(L1, c.lam), note = c.lam > 750 ? 'peak ' + c.lam + ' nm (beyond red)' : 'peak ' + c.lam + ' nm';
      ctx.setLineDash([5, 4]); ctx.strokeStyle = P.violet; ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.moveTo(X(lmx), gBot); ctx.lineTo(X(lmx), gTop); ctx.stroke(); ctx.setLineDash([]);
      rich(ctx, note, gx + gw, gy0 + S.label * 1.35, { px: S.label, color: P.violet, weight: 700, align: 'right', maxW: gw });
    } else {
      ctx.strokeStyle = P.text; ctx.lineWidth = 2.5; ctx.beginPath(); ctx.moveTo(gx, gBot - 3); ctx.lineTo(gx + gw, gBot - 3); ctx.stroke();
      rich(ctx, 'flat: no visible light absorbed', gx + gw / 2, gTop + gh * 0.3, { px: S.label, color: P.muted, weight: 700, align: 'center' });
    }
    if (C.mode === 'probe') {
      ctx.strokeStyle = wlRGB(C.probe); ctx.lineWidth = 3;
      ctx.beginPath(); ctx.moveTo(X(C.probe), gTop + gh * 0.05); ctx.lineTo(X(C.probe), gBot); ctx.stroke();
    }
  }
  function sci(v, dp) {
    var e = Math.floor(Math.log10(Math.abs(v))), m = v / Math.pow(10, e);
    var sup = String(e).replace('-', '⁻').replace(/[0-9]/g, function (d) { return '⁰¹²³⁴⁵⁶⁷⁸⁹'[d]; });
    return m.toFixed(dp == null ? 2 : dp) + ' × 10' + sup;
  }

  /* ======================= Mode 4: colorimetry ======================= */
  function drawColorimeter(ctx, w, h, st, t) {
    var P = pal(), S = sizes(w), K = st.cm, pad = Math.max(12, w * 0.02);
    var y0c = pad + S.label * 1.3, bhc = Math.min(w * 0.09, h * 0.15), topH = y0c + Math.max(bhc, S.figure * 1.5) + S.label * 3.2 + pad, G = { x: pad, y: topH, w: w - pad * 2, h: h - topH - pad };
    ctx.strokeStyle = P.line; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(pad, topH - pad * 0.5); ctx.lineTo(w - pad, topH - pad * 0.5); ctx.stroke();
    // The instrument: lamp → filter → cuvette → detector → meter.
    var y0 = y0c, bh = bhc, cy = y0 + Math.max(bh, S.figure * 1.5) / 2;
    var fhex = K.filter.hex, n = 5, slotW = (w - pad * 2) / n;
    var parts = ['lamp', 'filter', 'sample', 'detector', 'reading'];
    var xs = parts.map(function (_, i) { return pad + slotW * (i + 0.5); });
    // Beam.
    var trans = K.last ? Math.pow(10, -K.last.A) : 1;
    ctx.lineWidth = Math.max(6, bh * 0.16); ctx.lineCap = 'butt';
    ctx.strokeStyle = hexA('#ffffff', P === PAL.light ? 0.0 : 0.5); if (P === PAL.light) ctx.strokeStyle = '#c9d1db';
    ctx.beginPath(); ctx.moveTo(xs[0], cy); ctx.lineTo(xs[1], cy); ctx.stroke();
    ctx.strokeStyle = hexA(fhex, 0.85); ctx.beginPath(); ctx.moveTo(xs[1], cy); ctx.lineTo(xs[2], cy); ctx.stroke();
    ctx.strokeStyle = hexA(fhex, 0.15 + 0.7 * trans); ctx.beginPath(); ctx.moveTo(xs[2], cy); ctx.lineTo(xs[3], cy); ctx.stroke();
    // Lamp.
    ctx.fillStyle = '#f6e7a6'; ctx.strokeStyle = P.glass; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.arc(xs[0], cy, bh * 0.32, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
    // Filter.
    ctx.fillStyle = fhex; rr(ctx, xs[1] - bh * 0.1, cy - bh * 0.45, bh * 0.2, bh * 0.9, 3); ctx.fill();
    // Cuvette.
    var sampleHex = K.current ? K.current.hex : null;
    ctx.fillStyle = sampleHex ? hexA(sampleHex, 0.85) : P.water; ctx.strokeStyle = P.glass; ctx.lineWidth = 2;
    ctx.fillRect(xs[2] - bh * 0.28, cy - bh * 0.3, bh * 0.56, bh * 0.8); ctx.strokeRect(xs[2] - bh * 0.3, cy - bh * 0.5, bh * 0.6, bh * 1.02);
    // Detector.
    ctx.fillStyle = P.line2; rr(ctx, xs[3] - bh * 0.22, cy - bh * 0.4, bh * 0.44, bh * 0.8, 5); ctx.fill();
    // Meter.
    var mw = Math.min(slotW * 0.96, S.figure * 4.6), mh = Math.max(bh * 0.9, S.figure * 1.5);
    ctx.fillStyle = P.panel; ctx.strokeStyle = P.line2; ctx.lineWidth = 2; rr(ctx, xs[4] - mw / 2, cy - mh / 2, mw, mh, 8); ctx.fill(); ctx.stroke();
    ctx.font = '800 ' + S.figure + 'px ' + FONT; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillStyle = K.zeroed ? P.text : P.muted;
    ctx.fillText(K.last ? K.last.A.toFixed(3) : (K.zeroed ? '0.000' : '- - -'), xs[4], cy + 1);
    ctx.strokeStyle = P.muted; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(xs[3] + bh * 0.22, cy); ctx.lineTo(xs[4] - mw / 2, cy); ctx.stroke();
    var names = ['white light', K.filter.name + ' filter', K.current ? K.current.label : 'cuvette', 'detector', 'absorbance'];
    xs.forEach(function (x, i) { rich(ctx, names[i], x, cy + Math.max(bh * 0.55, mh / 2) + 4, { px: S.label, color: i === 1 ? P.text : P.muted, weight: 700, align: 'center', maxW: slotW - 6, maxLines: 2 }); });
    rich(ctx, 'Colorimeter', pad, pad * 0.6, { px: S.label, color: P.muted, weight: 700 });

    /* --- Calibration graph --- */
    var lab = S.label; ctx.font = '600 ' + lab + 'px ' + FONT;
    var tickW = ctx.measureText('0.00').width, gx = G.x + lab * 1.5 + tickW + 10, gy = G.y + lab * 0.8, gw = G.x + G.w - gx - lab * 0.6, gh = G.h - lab * 3.4;
    var cMax = 0.6, aMax = K.aMax;
    function X(c) { return gx + c / cMax * gw; }
    function Y(a) { return gy + gh - a / aMax * gh; }
    ctx.strokeStyle = P.line; ctx.lineWidth = 1;
    for (var c = 0.1; c <= cMax + 1e-9; c += 0.1) { ctx.beginPath(); ctx.moveTo(X(c), gy); ctx.lineTo(X(c), gy + gh); ctx.stroke(); }
    var step = aMax > 0.6 ? 0.2 : aMax > 0.3 ? 0.1 : 0.05;
    for (var a = step; a <= aMax + 1e-9; a += step) { ctx.beginPath(); ctx.moveTo(gx, Y(a)); ctx.lineTo(gx + gw, Y(a)); ctx.stroke(); }
    ctx.strokeStyle = P.muted; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(gx, gy); ctx.lineTo(gx, gy + gh); ctx.lineTo(gx + gw, gy + gh); ctx.stroke();
    ctx.font = '600 ' + lab + 'px ' + FONT; ctx.fillStyle = P.muted; ctx.textBaseline = 'top'; ctx.textAlign = 'center';
    for (var c2 = 0; c2 <= cMax + 1e-9; c2 += 0.1) ctx.fillText(c2.toFixed(1), X(c2), gy + gh + 5);
    ctx.textAlign = 'right'; ctx.textBaseline = 'middle';
    for (var a2 = step; a2 <= aMax + 1e-9; a2 += step) ctx.fillText(a2.toFixed(2), gx - 6, Y(a2));
    ctx.textAlign = 'center'; ctx.textBaseline = 'top';
    rich(ctx, 'concentration of {Cu^2+} / mol {dm^−3}', gx + gw / 2, gy + gh + lab * 1.35, { px: lab, color: P.muted, weight: 700, align: 'center' });
    ctx.save(); ctx.translate(G.x, gy + gh / 2); ctx.rotate(-Math.PI / 2); ctx.textAlign = 'center'; ctx.textBaseline = 'top';
    ctx.font = '700 ' + lab + 'px ' + FONT; ctx.fillStyle = P.muted; ctx.fillText('absorbance', 0, 0); ctx.restore();
    if (K.line) {
      ctx.strokeStyle = P.accent; ctx.lineWidth = 2.5;
      var cEnd = Math.min(cMax, aMax / K.line);
      ctx.beginPath(); ctx.moveTo(X(0), Y(0)); ctx.lineTo(X(cEnd), Y(K.line * cEnd)); ctx.stroke();
    }
    K.points.forEach(function (p) {
      ctx.strokeStyle = P.text; ctx.lineWidth = 2.5; var x = X(p.c), y = Y(p.A), r = Math.max(5, lab * 0.35);
      ctx.beginPath(); ctx.moveTo(x - r, y - r); ctx.lineTo(x + r, y + r); ctx.moveTo(x + r, y - r); ctx.lineTo(x - r, y + r); ctx.stroke();
    });
    if (K.unknownA != null) {
      var uy = Y(K.unknownA);
      ctx.strokeStyle = P.violet; ctx.lineWidth = 2; ctx.setLineDash([7, 6]);
      ctx.beginPath(); ctx.moveTo(gx, uy);
      if (K.line) { var ux = X(K.unknownA / K.line); ctx.lineTo(ux, uy); ctx.lineTo(ux, gy + gh); }
      else ctx.lineTo(gx + gw, uy);
      ctx.stroke(); ctx.setLineDash([]);
      rich(ctx, 'unknown: A = ' + K.unknownA.toFixed(3), gx + 8, uy - lab * 1.5, { px: lab, color: P.violet, weight: 800 });
    }
  }

  function frame(ctx, w, h, st, t) {
    var P = pal();
    ctx.fillStyle = P.stage; ctx.fillRect(0, 0, w, h);
    if (st.mode === 'lab') drawLab(ctx, w, h, st, t);
    else if (st.mode === 'shapes') drawShapes(ctx, w, h, st, t);
    else if (st.mode === 'colour') drawColour(ctx, w, h, st, t);
    else drawColorimeter(ctx, w, h, st, t);
  }

  window.TMDraw = { frame: frame, sizes: sizes, absorbs: absorbs, band: band, sci: sci, wlRGB: wlRGB, pal: pal };
})();
