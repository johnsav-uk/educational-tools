/* Plate Tectonics: Pangaea, Continental Drift & Sea-Floor Spreading.
   Edexcel B GCSE Geography, Topic 1 Hazardous Earth.

   1. helpers and palette     5. sea-floor spreading
   2. tabs                    6. exam diagrams (SVG)
   3. structure & convection  7. exam practice, worksheet, mark scheme
   4. the map: Pangaea and    8. presenter mode, printing, keys, main loop
      Wegener's evidence

   Canvas colours are hex (PAL) and switch with the site theme (sst.js). In
   presenter mode, canvas text is drawn at the --sst-pr-label size. */
(() => {
'use strict';

/* ════════════════════════ 1. helpers and palette ════════════════════════ */
const $ = s => document.querySelector(s), $$ = s => [...document.querySelectorAll(s)];
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const lerp = (a, b, t) => a + (b - a) * t;
const ease = t => t < .5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
const presenting = () => document.body.classList.contains('presenting');
const isLight = () => window.SST_THEME && SST_THEME.get() === 'light';

const PAL = {
  dark: {
    stage: '#091321', text: '#edf2f8', body: '#c5cfdb', muted: '#8693a5', line: '#182535', line2: '#2c3d52', accent: '#47b5fa',
    ocean: '#0f2b47', oceanLine: '#1e4a70', land: '#5f9150', landEdge: '#a3d18a', ghost: 'rgba(237,242,248,.5)',
    crust: '#8a7058', asth: '#b4532a', mantle: '#8f3a1f', outer: '#e0892b', inner: '#f5c542', cont: '#7a6a55', contTop: '#5f9150',
    normal: '#f0a43a', reversed: '#3b5573', needleN: '#1a1206', needleR: '#e3ecf5', sed: '#c9a66b', water: '#0f2b47', sky: '#091321',
    hot: '#ff6b3d', cool: '#5aa9e6', magma: '#ff6b3d', hl: '#ffd84d', tagBg: 'rgba(9,19,33,.86)', ice: 'rgba(230,244,255,.8)', ridge: '#ff6b3d', plate: '#6b5a48'
  },
  light: {
    stage: '#f8fafd', text: '#142030', body: '#33414f', muted: '#596473', line: '#d5dbe3', line2: '#b8c2ce', accent: '#0068b2',
    ocean: '#d3e8f7', oceanLine: '#b0d0ea', land: '#93c27a', landEdge: '#3f6f2e', ghost: 'rgba(20,32,48,.5)',
    crust: '#a88a6c', asth: '#ec9a70', mantle: '#d7774f', outer: '#f2aa52', inner: '#f8d266', cont: '#a8957c', contTop: '#93c27a',
    normal: '#c86a00', reversed: '#c3d0de', needleN: '#ffffff', needleR: '#142030', sed: '#d9b77a', water: '#cfe6f5', sky: '#f8fafd',
    hot: '#d2401a', cool: '#1f6fb0', magma: '#e2502a', hl: '#c27c00', tagBg: 'rgba(255,255,255,.9)', ice: 'rgba(255,255,255,.9)', ridge: '#d2401a', plate: '#b9a58c'
  }
};
let P = PAL.dark;
function setPal() { P = isLight() ? PAL.light : PAL.dark; }
setPal();

// Canvas label size: 13px on the page, the presenter label token on the board.
let LBL = 13;
function measureType() { LBL = presenting() && window.SST_PRESENT ? Math.round(SST_PRESENT.px('--sst-pr-label')) : 13; }

function fit(cv) {
  const r = cv.getBoundingClientRect(), dpr = Math.min(2, window.devicePixelRatio || 1);
  const w = Math.max(1, Math.round(r.width)), h = Math.max(1, Math.round(r.height));
  if (cv.width !== Math.round(w * dpr) || cv.height !== Math.round(h * dpr)) { cv.width = Math.round(w * dpr); cv.height = Math.round(h * dpr); }
  const ctx = cv.getContext('2d');
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  return { ctx, w, h };
}
function font(ctx, size, weight) { ctx.font = `${weight || 600} ${size}px 'Plus Jakarta Sans', system-ui, sans-serif`; }

// A label on a backing pill so it reads over any part of a scene.
function tag(ctx, lines, x, y, o = {}) {
  lines = [].concat(lines);
  const size = o.size || LBL, pad = Math.round(size * .4), lh = Math.round(size * 1.25);
  font(ctx, size, o.weight || 600);
  const w = Math.max(...lines.map(l => ctx.measureText(l).width)) + pad * 2, h = lh * lines.length + pad * 1.2;
  let bx = o.align === 'right' ? x - w : o.align === 'center' ? x - w / 2 : x;
  let by = o.valign === 'bottom' ? y - h : o.valign === 'middle' ? y - h / 2 : y;
  if (o.keepIn) { bx = clamp(bx, 4, o.keepIn.w - w - 4); by = clamp(by, 4, o.keepIn.h - h - 4); }
  if (o.bg !== false) {
    ctx.fillStyle = o.bg || P.tagBg; ctx.strokeStyle = o.border || P.line2; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.roundRect(bx, by, w, h, Math.min(8, size * .5)); ctx.fill(); if (o.border !== 'none') ctx.stroke();
  }
  ctx.fillStyle = o.color || P.text; ctx.textBaseline = 'middle'; ctx.textAlign = 'left';
  lines.forEach((l, i) => ctx.fillText(l, bx + pad, by + pad * .6 + lh * (i + .5)));
  return { x: bx, y: by, w, h };
}
function arrow(ctx, x1, y1, x2, y2, col, lw = 2, head = 9) {
  const a = Math.atan2(y2 - y1, x2 - x1);
  ctx.strokeStyle = col; ctx.fillStyle = col; ctx.lineWidth = lw; ctx.lineCap = 'round';
  ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2 - Math.cos(a) * head * .6, y2 - Math.sin(a) * head * .6); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(x2, y2);
  ctx.lineTo(x2 - head * Math.cos(a - .45), y2 - head * Math.sin(a - .45));
  ctx.lineTo(x2 - head * Math.cos(a + .45), y2 - head * Math.sin(a + .45));
  ctx.closePath(); ctx.fill();
}
function seg(el, onChange) {
  el.addEventListener('click', e => {
    const b = e.target.closest('button'); if (!b || b.disabled) return;
    el.querySelectorAll('button').forEach(x => x.setAttribute('aria-pressed', x === b ? 'true' : 'false'));
    onChange(b);
  });
}
function pressSeg(el, pred) { el.querySelectorAll('button').forEach(b => b.setAttribute('aria-pressed', pred(b) ? 'true' : 'false')); }
function playBtn(btn, on, word) { btn.querySelector('use').setAttribute('href', on ? '#i-pause' : '#i-play'); const s = btn.querySelector('span'); if (s) s.textContent = word || (on ? 'Pause' : 'Play'); }
function store(k, v) { try { if (v === undefined) return localStorage.getItem(k); localStorage.setItem(k, v); } catch (e) { return null; } }

/* ════════════════════════ 2. tabs ════════════════════════ */
const tabs = $$('.main-tabs [role="tab"]');
let view = 'st';
function showTab(tab, focus) {
  tabs.forEach(t => {
    const on = t === tab;
    t.setAttribute('aria-selected', on); t.tabIndex = on ? 0 : -1;
    $('#' + t.getAttribute('aria-controls')).hidden = !on;
  });
  view = tab.id.slice(4);
  if (focus) tab.focus();
  store('pt-tab', view);
}
tabs.forEach((t, i) => {
  t.addEventListener('click', () => showTab(t));
  t.addEventListener('keydown', e => {
    const d = e.key === 'ArrowRight' ? 1 : e.key === 'ArrowLeft' ? -1 : 0;
    if (!d) return;
    e.preventDefault();
    let j = i;
    do { j = (j + d + tabs.length) % tabs.length; } while (presenting() && tabs[j].classList.contains('no-present'));
    showTab(tabs[j], true);
  });
});

/* ════════════════════════ 3. structure & convection ════════════════════════ */
const LAYERS = [
  { id: 'crust', name: 'Crust', col: 'crust', state: 'Solid rock',
    rows: [['Thickness', 'Oceanic 5–10 km; continental 25–70 km'], ['Rock', 'Oceanic: basalt, dense (≈3.0 g/cm³). Continental: granite, lighter (≈2.7 g/cm³)'], ['Temperature', 'Up to about 900°C at its base'], ['Key fact', 'Broken into tectonic plates. The crust and the rigid top of the mantle form the lithosphere.']] },
  { id: 'mantle', name: 'Mantle', col: 'asth', state: 'Mostly solid; the asthenosphere is semi-molten',
    rows: [['Thickness', 'About 2,900 km'], ['Temperature', '1,000–3,700°C'], ['Key fact', 'The upper part, the asthenosphere, flows very slowly. Convection currents here move the plates.']] },
  { id: 'outer', name: 'Outer core', col: 'outer', state: 'Liquid',
    rows: [['Made of', 'Iron and nickel'], ['Thickness', 'About 2,200 km'], ['Temperature', '4,000–5,000°C'], ['Key fact', 'The moving liquid iron produces Earth\'s magnetic field, which palaeomagnetism records.']] },
  { id: 'inner', name: 'Inner core', col: 'inner', state: 'Solid',
    rows: [['Made of', 'Iron and nickel'], ['Radius', 'About 1,220 km'], ['Temperature', 'About 5,400–6,000°C'], ['Key fact', 'Solid because the pressure is so great. The heat drives everything above it.']] }
];
const ST = { mode: 'layers', hl: null, playing: true, speed: 1, t: 0, parts: null, labels: true, forces: false, temp: true };
const ST_SPEEDS = [0.5, 1, 2, 3, 5];
function stParts() {
  // Particles in convection loops. Each has a loop (cell), a phase and a size factor.
  const a = [];
  for (let k = 0; k < 6; k++) for (let i = 0; i < 46; i++) a.push({ k, ph: Math.random() * Math.PI * 2, f: .35 + Math.random() * .65 });
  return a;
}
ST.parts = stParts();
ST.close = [];
for (let k = 0; k < 2; k++) for (let i = 0; i < 90; i++) ST.close.push({ k, ph: Math.random() * Math.PI * 2, f: .3 + Math.random() * .7 });

function stSetMode(m) {
  ST.mode = m;
  pressSeg($('#stMode'), b => b.dataset.mode === m);
  $('#stLayersBox').hidden = m !== 'layers'; $('#stCloseBox').hidden = m !== 'close';
  $('#stLegend').hidden = m === 'layers';
}
function stSelectLayer(id) {
  ST.hl = id;
  $$('#layerList button').forEach(b => b.setAttribute('aria-pressed', b.dataset.id === id ? 'true' : 'false'));
  const L = LAYERS.find(l => l.id === id);
  $('#layerCard').innerHTML = L
    ? `<h4>${L.name}: ${L.state.toLowerCase()}</h4><table class="facts">${L.rows.map(r => `<tr><th>${r[0]}</th><td>${r[1]}</td></tr>`).join('')}</table>`
    : '<h4>Pick a layer</h4><p>Choose a layer above, or click one on the cross-section, to see its state, thickness and temperature.</p>';
}
$('#layerList').innerHTML = LAYERS.map(l => `<button type="button" data-id="${l.id}" aria-pressed="false"><i data-c="${l.col}"></i>${l.name}<span style="margin-left:auto;color:var(--muted);font-weight:500;font-size:.8rem">${l.state.split(';')[0]}</span></button>`).join('');
function paintLayerDots() { $$('#layerList i').forEach(i => { i.style.background = P[i.dataset.c]; }); }
paintLayerDots();
$('#layerList').addEventListener('click', e => { const b = e.target.closest('button'); if (b) stSelectLayer(ST.hl === b.dataset.id ? null : b.dataset.id); });
seg($('#stMode'), b => stSetMode(b.dataset.mode));
$('#stPlay').addEventListener('click', () => { ST.playing = !ST.playing; playBtn($('#stPlay'), ST.playing); });
$('#stSpeed').addEventListener('input', e => { ST.speed = ST_SPEEDS[e.target.value - 1]; $('#stSpeedOut').textContent = '×' + ST.speed; });
$('#stLabels').addEventListener('change', e => { ST.labels = e.target.checked; stSetMode(ST.mode); });
$('#stForces').addEventListener('change', e => { ST.forces = e.target.checked; });
$('#stTemp').addEventListener('change', e => { ST.temp = e.target.checked; });
stSelectLayer(null);
ST.speed = ST_SPEEDS[$('#stSpeed').value - 1]; $('#stSpeedOut').textContent = '×' + ST.speed;

// Colour a particle by where it is in its loop: hot on the rising limb, cool on the sinking one.
function mixHex(a, b, t) {
  const pa = parseInt(a.slice(1), 16), pb = parseInt(b.slice(1), 16);
  const r = Math.round(lerp(pa >> 16, pb >> 16, t)), g = Math.round(lerp(pa >> 8 & 255, pb >> 8 & 255, t)), bl = Math.round(lerp(pa & 255, pb & 255, t));
  return `rgb(${r},${g},${bl})`;
}

let stGeom = null;
function stDraw(dt) {
  const cv = $('#stCv'), { ctx, w, h } = fit(cv);
  if (ST.playing) ST.t += dt * ST.speed;
  ctx.fillStyle = P.stage; ctx.fillRect(0, 0, w, h);
  if (ST.mode === 'layers') stLayers(ctx, w, h, dt); else stClose(ctx, w, h, dt);
}

function stLayers(ctx, w, h, dt) {
  const narrow = w < 640;
  const R = Math.min(h * .92, narrow ? w * .46 : (w - Math.max(250, LBL * 13)) / 2);
  const cx = narrow ? w * .5 : R + 24, cy = h - 6;
  const B = { crust: [.965, 1], asth: [.87, .965], mantle: [.546, .87], outer: [.19, .546], inner: [0, .19] };
  stGeom = { cx, cy, R, B };
  const dim = id => ST.hl && ST.hl !== id && !(ST.hl === 'heat') ? .45 : 1;
  const ring = (r0, r1, col, a) => {
    ctx.globalAlpha = a; ctx.fillStyle = col; ctx.beginPath();
    ctx.arc(cx, cy, r1 * R, Math.PI, 0); if (r0 > 0) ctx.arc(cx, cy, r0 * R, 0, Math.PI, true); else ctx.lineTo(cx, cy);
    ctx.closePath(); ctx.fill(); ctx.globalAlpha = 1;
  };
  ring(B.crust[0], B.crust[1], P.crust, dim('crust'));
  ring(B.asth[0], B.asth[1], P.asth, dim('mantle'));
  ring(B.mantle[0], B.mantle[1], P.mantle, dim('mantle'));
  ring(B.outer[0], B.outer[1], P.outer, dim('outer'));
  ring(B.inner[0], B.inner[1], P.inner, dim('inner'));
  // Plate boundaries: cracks in the crust.
  ctx.strokeStyle = P.stage; ctx.lineWidth = 2;
  [0.35, 0.8, 1.35, 1.95, 2.55].forEach(a => { ctx.beginPath(); ctx.moveTo(cx - Math.cos(a) * R * B.crust[0], cy - Math.sin(a) * R * B.crust[0]); ctx.lineTo(cx - Math.cos(a) * R * 1.003, cy - Math.sin(a) * R * 1.003); ctx.stroke(); });

  // Convection cells in the mantle.
  const rm = (B.mantle[0] + B.asth[1]) / 2 * R, ar = (B.asth[1] - B.mantle[0]) / 2 * R * .82, cell = Math.PI / 6, at = cell / 2 * .8;
  const pr = Math.max(2, R / 140);
  ST.parts.forEach(p => {
    const s = p.k % 2 ? -1 : 1;
    if (ST.playing) p.ph += s * dt * ST.speed * .55 / (.5 + p.f * .5);
    const r = rm + ar * p.f * Math.sin(p.ph), th = cell * (p.k + .5) + at * p.f * Math.cos(p.ph);
    const x = cx - Math.cos(th) * r, y = cy - Math.sin(th) * r;
    const heat = (Math.cos(p.ph) * s + 1) / 2;   // rising limb hot
    ctx.fillStyle = mixHex(P.cool, P.hot, heat);
    ctx.globalAlpha = ST.hl && ST.hl !== 'mantle' && ST.hl !== 'heat' ? .35 : .95;
    ctx.beginPath(); ctx.arc(x, y, pr, 0, Math.PI * 2); ctx.fill();
  });
  ctx.globalAlpha = 1;

  // Heat radiating from the core.
  if (ST.hl === 'heat' || ST.hl === 'inner' || ST.hl === 'outer') {
    const n = 9;
    for (let i = 0; i < n; i++) {
      const a = Math.PI * (i + .5) / n, ph = (ST.t * .4 + i * .37) % 1;
      const r0 = (B.outer[1] + .01) * R + ph * R * .25, r1 = r0 + R * .07;
      ctx.globalAlpha = 1 - ph;
      arrow(ctx, cx - Math.cos(a) * r0, cy - Math.sin(a) * r0, cx - Math.cos(a) * r1, cy - Math.sin(a) * r1, P.hl, 2.5, 9);
    }
    ctx.globalAlpha = 1;
  }

  // Highlight outline.
  const H = { crust: B.crust, mantle: [B.mantle[0], B.asth[1]], outer: B.outer, inner: B.inner }[ST.hl];
  if (H) {
    ctx.strokeStyle = P.hl; ctx.lineWidth = 3; ctx.beginPath();
    ctx.arc(cx, cy, H[1] * R, Math.PI, 0); if (H[0] > 0) ctx.arc(cx, cy, H[0] * R, 0, Math.PI, true); ctx.closePath(); ctx.stroke();
  }

  if (!ST.labels) return;
  // Labels down the right, with leader lines.
  const items = [
    ['crust', 'Crust', 'solid · 5–70 km', 1.31, (B.crust[0] + B.crust[1]) / 2],
    ['mantle', 'Asthenosphere', 'semi-molten, flows', 1.12, (B.asth[0] + B.asth[1]) / 2],
    ['mantle', 'Mantle', 'mostly solid · 2,900 km', .9, (B.mantle[0] + B.mantle[1]) / 2],
    ['outer', 'Outer core', 'liquid iron & nickel', .62, (B.outer[0] + B.outer[1]) / 2],
    ['inner', 'Inner core', 'solid iron & nickel', .2, .1]
  ];
  const size = LBL, gap = Math.min(size * 3.1 * 1.12, (h - 16) / 5);
  const top0 = Math.max(8, Math.min(cy - R + 10, h - 8 - gap * 5));
  const lx = narrow ? null : cx + R + 26;
  items.forEach((it, i) => {
    const [id, name, sub, ang, rr] = it;
    const px = cx + Math.cos(ang) * R * rr, py = cy - Math.sin(ang) * R * rr;
    if (narrow) {
      const t = tag(ctx, [name], px, py, { size, align: 'center', valign: 'middle', keepIn: { w, h } });
      return t;
    }
    const ly = top0 + i * gap;
    ctx.strokeStyle = ST.hl === id ? P.hl : P.muted; ctx.lineWidth = 1.3;
    ctx.beginPath(); ctx.moveTo(px, py); ctx.lineTo(lx - 6, ly + size * .9); ctx.stroke();
    ctx.fillStyle = ST.hl === id ? P.hl : P.muted; ctx.beginPath(); ctx.arc(px, py, 3, 0, 7); ctx.fill();
    font(ctx, size * 1.1, 700); ctx.fillStyle = P.text; ctx.textAlign = 'left'; ctx.textBaseline = 'top';
    ctx.fillText(name, lx, ly);
    font(ctx, size * .95, 500); ctx.fillStyle = P.body; ctx.fillText(sub, lx, ly + size * 1.35);
  });
  if (ST.hl === 'heat') tag(ctx, ['Heat from the core:', 'radioactive decay'], cx, cy - B.outer[1] * R - size * 4.6, { size, align: 'center', color: P.text });
}

function stClose(ctx, w, h, dt) {
  const size = LBL;
  const ySea = h * .09, yPl = h * .16, yPb = h * .25, yCore = h * .86;
  const mid = w / 2, gap = Math.max(10, w * .018);
  const v = ST.playing ? ST.speed : 0;
  ST.shift = ((ST.shift || 0) + dt * v * 14) % 40;
  // Sea and sky.
  ctx.fillStyle = P.water; ctx.fillRect(0, ySea, w, yPl - ySea);
  // Mantle.
  ctx.fillStyle = P.asth; ctx.fillRect(0, yPb, w, yCore - yPb);
  ctx.fillStyle = P.outer; ctx.fillRect(0, yCore, w, h - yCore);
  // Plates, each bending down into the mantle (a slab) at a trench near the edge.
  const edge = w * .14, T = (yPb - yPl) * .9, D = edge * .85;
  [1, -1].forEach(s => {
    const X = x => s > 0 ? x : w - x;
    ctx.fillStyle = P.plate; ctx.beginPath();
    ctx.moveTo(X(mid - gap / 2), yPl + 4); ctx.lineTo(X(mid - gap / 2), yPb); ctx.lineTo(X(edge + T), yPb);
    ctx.lineTo(X(edge + T - D), yPb + D * 1.1); ctx.lineTo(X(edge - D), yPl + D * 1.1); ctx.lineTo(X(edge), yPl); ctx.closePath(); ctx.fill();
    // The plate it slides under.
    ctx.fillStyle = P.cont; ctx.beginPath();
    ctx.moveTo(X(0), yPl - h * .03); ctx.lineTo(X(edge - 10), yPl - h * .01); ctx.lineTo(X(edge - D * .55), yPl + D * .55); ctx.lineTo(X(0), yPl + D * .55); ctx.closePath(); ctx.fill();
  });
  // Moving texture on the plates shows the direction.
  ctx.strokeStyle = 'rgba(0,0,0,.25)'; ctx.lineWidth = 2;
  for (let x = 0; x < mid - gap / 2 - edge; x += 40) {
    const xl = mid - gap / 2 - ((x + ST.shift) % (mid - gap / 2 - edge)), xr = mid + gap / 2 + ((x + ST.shift) % (mid - gap / 2 - edge));
    [xl, xr].forEach(xx => { ctx.beginPath(); ctx.moveTo(xx, yPl + 6); ctx.lineTo(xx, yPb - 4); ctx.stroke(); });
  }
  // Magma in the gap.
  ctx.fillStyle = P.magma;
  ctx.beginPath(); ctx.moveTo(mid - gap / 2, yPl + 4); ctx.lineTo(mid + gap / 2, yPl + 4); ctx.lineTo(mid + gap * 1.6, yPb + h * .05); ctx.lineTo(mid - gap * 1.6, yPb + h * .05); ctx.closePath(); ctx.fill();

  // Convection loops.
  const cy = (yPb + yCore) / 2 + h * .03, a = (mid - w * .06) * .42, b = (yCore - yPb) * .38;
  const centres = [mid - a - gap, mid + a + gap];
  const pr = Math.max(2.4, w / 330);
  ST.close.forEach(p => {
    const s = p.k ? -1 : 1;   // left loop rises on its right side, right loop on its left side
    if (ST.playing) p.ph += dt * ST.speed * .6 / (.45 + p.f * .55);
    const x = centres[p.k] + s * a * p.f * Math.cos(p.ph), y = cy - b * p.f * Math.sin(p.ph);
    const heat = (Math.cos(p.ph) + 1) / 2;
    ctx.fillStyle = ST.temp ? mixHex(P.cool, P.hot, heat) : P.text;
    ctx.globalAlpha = .9; ctx.beginPath(); ctx.arc(x, y, pr, 0, 7); ctx.fill();
  });
  ctx.globalAlpha = 1;
  // Direction arrows on each loop.
  const loopArrow = (k, ph, col) => {
    const s = k ? -1 : 1, x = c => centres[k] + s * a * 1.08 * Math.cos(c), y = c => cy - b * 1.08 * Math.sin(c);
    arrow(ctx, x(ph - .25), y(ph - .25), x(ph + .25), y(ph + .25), col, Math.max(3, size * .25), Math.max(12, size));
  };
  [0, 1].forEach(k => { loopArrow(k, 0, P.hot); loopArrow(k, Math.PI / 2, P.text); loopArrow(k, Math.PI, P.cool); loopArrow(k, Math.PI * 1.5, P.text); });

  // Plate movement arrows.
  const ay = yPl - Math.max(16, size * 1.2);
  arrow(ctx, mid - gap * 2, ay, mid - w * .2, ay, P.text, 3, 13);
  arrow(ctx, mid + gap * 2, ay, mid + w * .2, ay, P.text, 3, 13);

  // Highlights for the slides.
  const hlLoop = (from, to) => {
    ctx.strokeStyle = P.hl; ctx.lineWidth = 4; ctx.setLineDash([10, 7]);
    centres.forEach((c, k) => { const s = k ? -1 : 1; ctx.beginPath(); for (let i = 0; i <= 30; i++) { const ph = lerp(from, to, i / 30); const x = c + s * a * 1.18 * Math.cos(ph), y = cy - b * 1.18 * Math.sin(ph); i ? ctx.lineTo(x, y) : ctx.moveTo(x, y); } ctx.stroke(); });
    ctx.setLineDash([]);
  };
  if (ST.hl === 'rise') hlLoop(-.9, .9);
  if (ST.hl === 'spread') hlLoop(.75, 2.4);
  if (ST.hl === 'sink') hlLoop(2.25, 4.05);

  if (ST.forces || ST.hl === 'forces') {
    const sx = edge + T / 2 - D * .25, sy = yPl + T / 2 + D * .45, ex = edge + T / 2 - D * .8, ey = yPl + T / 2 + D * 1.05;
    arrow(ctx, sx, sy, ex, ey, P.hl, 4, 15);
    arrow(ctx, w - sx, sy, w - ex, ey, P.hl, 4, 15);
    tag(ctx, 'Slab pull', ex, ey + 6, { size, align: 'center', color: P.hl, keepIn: { w, h } });
    tag(ctx, 'Slab pull', w - ex, ey + 6, { size, align: 'center', color: P.hl, keepIn: { w, h } });
    arrow(ctx, mid - gap * 2.5, yPl + (yPb - yPl) / 2, mid - gap * 2.5 - w * .08, yPl + (yPb - yPl) / 2 + 6, P.hl, 4, 14);
    arrow(ctx, mid + gap * 2.5, yPl + (yPb - yPl) / 2, mid + gap * 2.5 + w * .08, yPl + (yPb - yPl) / 2 + 6, P.hl, 4, 14);
    tag(ctx, 'Ridge push', mid, yPb + h * .07, { size, align: 'center', color: P.hl });
  }

  if (!ST.labels) return;
  tag(ctx, 'Plate moves away', mid - w * .11, ay - size * .5, { size, align: 'center', valign: 'bottom', bg: false, color: P.text });
  tag(ctx, 'Plate moves away', mid + w * .11, ay - size * .5, { size, align: 'center', valign: 'bottom', bg: false, color: P.text });
  tag(ctx, ['Ridge: constructive', 'boundary'], mid, yPb + h * .075 + (ST.forces || ST.hl === 'forces' ? size * 2.4 : 0), { size, align: 'center' });
  tag(ctx, ['Hot, less dense', 'rock rises'], mid, cy + b * .15, { size, align: 'center', valign: 'middle', color: P.hot });
  tag(ctx, ['Cooler, denser', 'rock sinks'], centres[0] - a * .8, cy + b * .45, { size, align: 'left', valign: 'middle', color: P.cool, keepIn: { w, h } });
  tag(ctx, ['Friction drags', 'the plate'], centres[1], yPb + size * .8, { size, align: 'center' });
  tag(ctx, 'Mantle (asthenosphere)', centres[0], cy - b * .1, { size, align: 'center', valign: 'middle', bg: false, color: '#ffffff' });
  tag(ctx, 'Trench', edge, yPl - h * .015, { size, align: 'center', valign: 'bottom', bg: false, color: P.text });
  tag(ctx, 'Trench', w - edge, yPl - h * .015, { size, align: 'center', valign: 'bottom', bg: false, color: P.text });
  font(ctx, size * 1.05, 800); ctx.fillStyle = '#3a1a00'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.fillText('HEAT FROM THE CORE', w * .34, (yCore + h) / 2);
}

$('#stCv').addEventListener('click', e => {
  if (ST.mode !== 'layers' || !stGeom) return;
  const r = e.currentTarget.getBoundingClientRect(), x = e.clientX - r.left, y = e.clientY - r.top;
  const d = Math.hypot(x - stGeom.cx, y - stGeom.cy) / stGeom.R, B = stGeom.B;
  if (y > stGeom.cy || d > 1.01) return stSelectLayer(null);
  const id = d >= B.crust[0] ? 'crust' : d >= B.mantle[0] ? 'mantle' : d >= B.outer[0] ? 'outer' : 'inner';
  stSelectLayer(ST.hl === id ? null : id);
});
$('#stDeck').addEventListener('sst-slide', e => stFromSlide(e.detail.index));
function stFromSlide(i) {
  const s = $$('#stDeck .sst-slide')[i]; if (!s) return;
  stSetMode(s.dataset.mode);
  if (s.dataset.mode === 'layers') stSelectLayer(s.dataset.hl || null); else { ST.hl = s.dataset.hl || null; }
}

/* ════════════════════════ 4. the map: Pangaea and Wegener's evidence ════════════════════════ */
// Continents as simplified outlines in present-day longitude/latitude. Each
// has poses: [dx, dy, rotation°] at key times (millions of years ago), applied
// as a rotation about its anchor then a shift. The map is a cartoon on a flat
// grid: good for the sequence, not for measuring.
const C = [
  { id: 'NA', name: 'North America', anchor: [-100, 45], label: [-100, 47], group: 'L',
    parts: [
      [[-166,68],[-156,71],[-140,70],[-128,70],[-115,68],[-95,72],[-85,70],[-80,63],[-94,59],[-92,57],[-82,55],[-79,52],[-77,60],[-70,61],[-64,60],[-61,56],[-56,52],[-53,47],[-60,47],[-66,45],[-70,42],[-74,40],[-76,35],[-81,31],[-80,26],[-82,27],[-84,30],[-89,30],[-94,29],[-97,26],[-97,22],[-91,19],[-87,21],[-88,16],[-83,15],[-83,9],[-78,8],[-80,7],[-85,10],[-92,14],[-105,20],[-110,24],[-112,30],[-117,32],[-121,35],[-124,40],[-124,46],[-127,50],[-134,57],[-140,60],[-150,61],[-158,58],[-165,61]],
      [[-73,78],[-60,82],[-35,83],[-20,81],[-18,76],[-22,70],[-32,68],[-40,65],[-44,60],[-50,62],[-53,67],[-55,71],[-60,76]]
    ],
    poses: { 300: [58, -40, 10], 200: [56, -34.5, 10], 180: [50, -31, 8], 130: [38, -23, 6], 90: [26, -14, 4], 50: [12, -6, 2], 0: [0, 0, 0] } },
  { id: 'EU', name: 'Eurasia', anchor: [10, 50], label: [80, 55], group: 'L',
    parts: [
      [[-9,37],[-9,43],[-2,44],[-5,48],[1,50],[4,52],[8,54],[8,57],[5,59],[5,62],[12,66],[18,70],[26,71],[32,70],[40,67],[44,68],[60,70],[70,73],[80,73],[100,77],[115,74],[130,72],[150,71],[170,70],[180,68],[180,65],[175,62],[163,60],[157,51],[150,59],[140,55],[141,48],[135,43],[129,41],[127,35],[122,40],[122,32],[120,28],[117,24],[110,21],[106,20],[109,13],[105,9],[100,13],[101,3],[104,1],[98,8],[98,16],[94,17],[92,22],[92,26],[88,27],[80,30],[73,34],[68,25],[66,25],[57,25],[56,27],[52,27],[48,30],[55,25],[59,22],[52,16],[44,12],[43,13],[39,21],[35,28],[34,31],[36,36],[27,37],[26,40],[23,40],[20,40],[19,42],[15,45],[13,46],[12,44],[16,41],[18,40],[16,38],[12,42],[8,44],[3,43],[-1,37],[-5,36]],
      [[-5,50],[1,51],[2,53],[0,54],[-2,56],[-2,58],[-5,58.5],[-6,57],[-5,55],[-3,54],[-4,52]],
      [[-10,52],[-6,52],[-6,55],[-8,55],[-10,54]]
    ],
    poses: { 300: [7, -20, 0], 200: [7, -14, 0], 180: [6, -12, 0], 130: [5, -8, 0], 90: [3, -5, 0], 50: [1, -2, 0], 0: [0, 0, 0] } },
  { id: 'AF', name: 'Africa', anchor: [18, 2], label: [20, 5], group: 'G',
    parts: [[[-17,21],[-16,27],[-10,30],[-6,36],[10,37],[11,33],[20,31],[30,31],[34,31],[33,28],[36,22],[39,16],[43,12],[51,12],[51,10],[48,5],[42,-2],[40,-10],[40,-15],[35,-22],[33,-27],[27,-34],[20,-35],[18,-32],[15,-26],[12,-18],[13,-12],[9,-1],[9,4],[5,4],[-2,5],[-8,4],[-13,8],[-17,14]]],
    poses: { 300: [0, -20, 0], 200: [0, -14, 0], 180: [0, -12, 0], 130: [0, -9, 0], 90: [0, -6, 0], 50: [0, -3, 0], 0: [0, 0, 0] } },
  { id: 'SA', name: 'South America', anchor: [-60, -15], label: [-58, -12], group: 'G',
    parts: [[[-77,8],[-72,12],[-63,11],[-60,8],[-52,5],[-50,0],[-44,-2],[-35,-5],[-37,-12],[-39,-17],[-41,-22],[-48,-26],[-53,-34],[-58,-38],[-62,-40],[-65,-45],[-68,-50],[-69,-55],[-74,-52],[-74,-45],[-73,-37],[-71,-28],[-70,-18],[-76,-14],[-81,-6],[-80,0],[-78,3]]],
    poses: { 300: [53.5, -27, 46], 200: [53.5, -21, 46], 180: [53.5, -19, 46], 130: [47, -14, 38], 90: [30, -8, 22], 50: [14, -4, 10], 0: [0, 0, 0] } },
  { id: 'MG', name: 'Madagascar', anchor: [46.5, -19], label: null, group: 'G',
    parts: [[[49,-12],[50,-16],[47,-25],[44,-25],[43,-21],[44,-17],[47,-14]]],
    poses: { 300: [-2.5, -29, 0], 200: [-2.5, -23, 0], 180: [-2.5, -21, 0], 130: [0, -9, 0], 90: [0, -6, 0], 50: [0, -3, 0], 0: [0, 0, 0] } },
  { id: 'IN', name: 'India', anchor: [78, 20], label: [78, 19], group: 'G',
    parts: [[[68,25],[73,34],[80,30],[88,27],[92,26],[92,22],[89,22],[87,21],[80,15],[80,10],[77,8],[73,16],[72,21],[69,22]]],
    poses: { 300: [-19, -60, -40], 200: [-19, -54, -40], 180: [-19, -52, -40], 130: [-15, -46, -36], 90: [-8, -36, -28], 50: [-2, -8, -8], 0: [0, 0, 0] } },
  { id: 'AN', name: 'Antarctica', anchor: [20, -80], label: [20, -80], group: 'G',
    parts: [[[-15,-74],[-5,-70],[10,-69],[28,-68],[45,-69],[55,-73],[55,-80],[48,-86],[30,-89],[10,-89],[-10,-87],[-22,-83],[-30,-80],[-40,-70],[-36,-69],[-30,-76],[-24,-75]]],
    poses: { 300: [15, 13, 0], 200: [15, 19, 0], 180: [15, 21, 0], 130: [12, 16, 0], 90: [8, 8, 0], 50: [3, 2, 0], 0: [0, 0, 0] } },
  { id: 'AU', name: 'Australia', anchor: [134, -25], label: [134, -25], group: 'G',
    parts: [[[114,-22],[114,-34],[118,-35],[124,-34],[132,-32],[138,-35],[141,-38],[147,-38],[150,-37],[153,-30],[153,-25],[146,-19],[145,-15],[142,-11],[141,-17],[136,-12],[131,-11],[126,-14],[122,-18]]],
    poses: { 300: [-63, -34, 40], 200: [-63, -28, 40], 180: [-63, -26, 40], 130: [-62, -24, 40], 90: [-56, -22, 34], 50: [-36, -14, 20], 0: [0, 0, 0] } }
];
const CI = Object.fromEntries(C.map(c => [c.id, c]));
const KEYS = [300, 200, 180, 130, 90, 50, 0];

function poseAt(c, t) {
  for (let i = 0; i < KEYS.length - 1; i++) {
    const a = KEYS[i], b = KEYS[i + 1];
    if (t <= a && t >= b) {
      const pa = c.poses[a], pb = c.poses[b], f = (a - t) / (a - b);
      return [lerp(pa[0], pb[0], f), lerp(pa[1], pb[1], f), lerp(pa[2], pb[2], f)];
    }
  }
  return c.poses[t >= 300 ? 300 : 0];
}
function xf(pt, c, pose) {
  const r = pose[2] * Math.PI / 180, dx = pt[0] - c.anchor[0], dy = pt[1] - c.anchor[1];
  return [c.anchor[0] + dx * Math.cos(r) - dy * Math.sin(r) + pose[0], c.anchor[1] + dx * Math.sin(r) + dy * Math.cos(r) + pose[1]];
}
function rotVec(v, deg) { const r = deg * Math.PI / 180; return [v[0] * Math.cos(r) - v[1] * Math.sin(r), v[0] * Math.sin(r) + v[1] * Math.cos(r)]; }
function ellipse(cx, cy, rx, ry, n = 18) { const a = []; for (let i = 0; i < n; i++) { const t = i / n * Math.PI * 2; a.push([cx + rx * Math.cos(t), cy + ry * Math.sin(t)]); } return a; }

// Wegener's evidence, fixed to the continent it sits on so it moves with it.
const EV = {
  fit: { name: 'The jigsaw fit', blurb: 'South America\'s east coast and Africa\'s west coast fit together.', col: '#47b5fa', colL: '#0068b2', type: 'coast',
    items: [{ c: 'SA', pts: [[-60,8],[-52,5],[-50,0],[-44,-2],[-35,-5],[-37,-12],[-39,-17],[-41,-22],[-48,-26],[-53,-34],[-58,-38],[-62,-40],[-65,-45]] },
            { c: 'AF', pts: [[-17,14],[-13,8],[-8,4],[-2,5],[5,4],[9,4],[9,-1],[13,-12],[12,-18],[15,-26],[18,-32],[20,-35]] }] },
  meso: { name: 'Mesosaurus fossils', blurb: 'A freshwater reptile, found only in South America and southern Africa.', col: '#f0a43a', colL: '#c86a00', type: 'area', group: 'Fossil',
    items: [{ c: 'SA', e: [-52, -27, 6, 7] }, { c: 'AF', e: [16, -24, 5, 7] }] },
  glosso: { name: 'Glossopteris fossils', blurb: 'A seed fern found on five southern continents.', col: '#6fe3a3', colL: '#14894f', type: 'area', group: 'Fossil',
    items: [{ c: 'SA', e: [-62, -32, 8, 10] }, { c: 'AF', e: [26, -24, 9, 8] }, { c: 'MG', e: [46.5, -19, 2.5, 5] }, { c: 'IN', e: [79, 20, 6, 7] }, { c: 'AN', e: [25, -80, 18, 6] }, { c: 'AU', e: [136, -28, 11, 7] }] },
  lystro: { name: 'Lystrosaurus fossils', blurb: 'A land reptile found in Africa, India and Antarctica.', col: '#e58fd8', colL: '#a3389a', type: 'area', group: 'Fossil',
    items: [{ c: 'AF', e: [27, -29, 5, 4] }, { c: 'IN', e: [83, 23, 4, 3] }, { c: 'AN', e: [6, -82, 8, 3.5] }] },
  rock: { name: 'Matching mountains and rocks', blurb: 'The Appalachians line up with the Scottish Highlands and Scandinavia.', col: '#d9a066', colL: '#8a5a20', type: 'line', group: 'Geological',
    items: [{ c: 'NA', pts: [[-88,33],[-84,36],[-79,39],[-75,42],[-71,44],[-66,47],[-60,49],[-56,50]] },
            { c: 'NA', pts: [[-22,70],[-25,74],[-21,79]] },
            { c: 'EU', pts: [[-9,53],[-6,55],[-4,57],[-3,58.5]] },
            { c: 'EU', pts: [[6,60],[9,63],[14,66],[18,69]] },
            { c: 'AF', pts: [[-16,13],[-14,18],[-12,23],[-10,27]] },
            { c: 'SA', e: [-45, -4, 4, 4], fill: true }, { c: 'AF', e: [-6, 10, 6, 5], fill: true },
            { c: 'SA', e: [-43, -14, 5, 5], fill: true }, { c: 'AF', e: [19, -3, 7, 6], fill: true }] },
  ice: { name: 'Glacial deposits', blurb: 'Ice-scratched rocks about 300 million years old, now in warm places.', col: '#bfe3ff', colL: '#1f6fb0', type: 'ice', group: 'Climatic',
    items: [{ c: 'SA', at: [-52, -24] }, { c: 'AF', at: [24, -28] }, { c: 'AF', at: [30, -14] }, { c: 'IN', at: [80, 22] }, { c: 'AU', at: [138, -30] }, { c: 'AN', at: [30, -76] }] },
  coal: { name: 'Coal in Antarctica', blurb: 'Coal forms from swamp forests: Antarctica was once much warmer.', col: '#ffd84d', colL: '#6b4e00', type: 'coal', group: 'Climatic',
    items: [{ c: 'AN', at: [-5, -84] }, { c: 'AN', at: [15, -86] }, { c: 'AN', at: [38, -82] }] }
};
// Glacial striations point away from the ice sheet that sat over southern Gondwana about 300 million years ago.
(function iceVectors() {
  const pts = EV.ice.items.map(it => xf(it.at, CI[it.c], CI[it.c].poses[300]));
  const cx = pts.reduce((s, p) => s + p[0], 0) / pts.length, cy = pts.reduce((s, p) => s + p[1], 0) / pts.length;
  EV.ice.centre = [cx - 2, cy - 2];
  EV.ice.items.forEach((it, i) => {
    const d = [pts[i][0] - cx, pts[i][1] - cy], L = Math.hypot(d[0], d[1]) || 1;
    it.dir = rotVec([d[0] / L, d[1] / L], -CI[it.c].poses[300][2]);
  });
})();

const STAGES = [
  { t: 300, h: '300 million years ago: Pangaea', p: 'Almost all the land is joined in one <b>supercontinent</b>, Pangaea, centred on the equator. One huge ocean, <b>Panthalassa</b>, surrounds it.' },
  { t: 200, h: '200 million years ago: rifting begins', p: 'Magma rises along a line of weakness and Pangaea starts to <b>rift</b>. The central <b>Atlantic</b> begins to open between North America and Africa.' },
  { t: 180, h: '180 million years ago: Laurasia and Gondwana', p: 'Pangaea has split into <b>Laurasia</b> in the north and <b>Gondwana</b> in the south, with the Tethys Sea between them.' },
  { t: 130, h: '130 million years ago: the South Atlantic opens', p: '<b>South America separates from Africa</b>, opening from the south first. That is why their coastlines fit like a jigsaw.' },
  { t: 90, h: '90 million years ago: India heads north', p: '<b>India</b> breaks away from Madagascar and races north, as fast as 15–20 cm a year.' },
  { t: 50, h: '50 million years ago: the Himalayas', p: 'India <b>collides with Asia</b> and the crust crumples up to form the <b>Himalayas</b>. North America and Europe have separated.' },
  { t: 0, h: 'Today', p: 'The Atlantic is still <b>widening by about 2.5 cm a year</b> at the Mid-Atlantic Ridge, while the Pacific shrinks.' }
];
const MAR = [[-28,82],[-18,72],[-28,60],[-32,50],[-40,40],[-44,30],[-46,18],[-38,8],[-28,2],[-15,-5],[-14,-20],[-13,-32],[-16,-45],[-10,-55]];

function makeMap(cv, opts) {
  return Object.assign({ cv, t: 300, target: null, playing: false, rate: 22, ev: new Set(), labels: true, sup: true, ghost: false, eq: true, view: { lon: 0, lat: 0, span: 360 } }, opts);
}
const PG = makeMap($('#pgCv'));
const WG = makeMap($('#wgCv'), { t: 0, view: { lon: 10, lat: -5, span: 300 }, ev: new Set(['meso']) });

function mapDraw(M, dt) {
  const { ctx, w, h } = fit(M.cv);
  // Time moves towards a target (a jump) or plays forward.
  if (M.target != null) {
    const d = M.target - M.t, step = Math.max(40, Math.abs(d) * 2.2) * dt;
    M.t = Math.abs(d) <= step ? M.target : M.t + Math.sign(d) * step;
    if (M.t === M.target) { M.target = null; M.onArrive && M.onArrive(); }
    M.sync && M.sync();
  } else if (M.playing) {
    M.t = Math.max(0, M.t - M.rate * dt);
    if (M.t === 0) { M.playing = false; M.onStop && M.onStop(); }
    M.sync && M.sync();
  }
  const V = M.view, sc = Math.min(w / V.span, h / (V.span / 2)) * (w / h < 1.6 ? 1.1 : 1);
  const X = lon => w / 2 + (lon - V.lon) * sc, Y = lat => h / 2 - (lat - V.lat) * sc;
  M.X = X; M.Y = Y; M.sc = sc;
  ctx.fillStyle = P.ocean; ctx.fillRect(0, 0, w, h);
  // Graticule.
  ctx.strokeStyle = P.oceanLine; ctx.lineWidth = 1;
  for (let lo = -180; lo <= 180; lo += 30) { ctx.beginPath(); ctx.moveTo(X(lo), 0); ctx.lineTo(X(lo), h); ctx.stroke(); }
  for (let la = -60; la <= 60; la += 30) { if (!la) continue; ctx.beginPath(); ctx.moveTo(0, Y(la)); ctx.lineTo(w, Y(la)); ctx.stroke(); }
  const size = LBL;
  if (M.eq) {
    ctx.strokeStyle = P.accent; ctx.setLineDash([8, 6]); ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.moveTo(0, Y(0)); ctx.lineTo(w, Y(0)); ctx.stroke(); ctx.setLineDash([]);
    font(ctx, size * .9, 700); ctx.fillStyle = P.accent; ctx.textAlign = 'left'; ctx.textBaseline = 'bottom'; ctx.fillText('Equator', 8, Y(0) - 3);
  }
  const t = M.t;
  // Mid-Atlantic Ridge, fading in towards today.
  if (t < 60) {
    ctx.globalAlpha = 1 - t / 60; ctx.strokeStyle = P.ridge; ctx.lineWidth = 2.5; ctx.setLineDash([2, 5]); ctx.lineCap = 'round';
    ctx.beginPath(); MAR.forEach((p, i) => i ? ctx.lineTo(X(p[0]), Y(p[1])) : ctx.moveTo(X(p[0]), Y(p[1]))); ctx.stroke(); ctx.setLineDash([]); ctx.globalAlpha = 1;
  }
  // Ice sheet over southern Gondwana around 300 million years ago.
  if (M.ev.has('ice') && t > 220) {
    ctx.globalAlpha = clamp((t - 220) / 60, 0, 1) * .5; ctx.fillStyle = P.ice;
    ctx.beginPath(); ctx.ellipse(X(EV.ice.centre[0]), Y(EV.ice.centre[1]), 24 * sc, 17 * sc, 0, 0, 7); ctx.fill(); ctx.globalAlpha = 1;
  }
  const path = (pts, c, pose) => { ctx.beginPath(); pts.forEach((p, i) => { const q = xf(p, c, pose); i ? ctx.lineTo(X(q[0]), Y(q[1])) : ctx.moveTo(X(q[0]), Y(q[1])); }); };
  if (M.ghost) {
    ctx.strokeStyle = P.ghost; ctx.lineWidth = 1.2; ctx.setLineDash([4, 4]);
    C.forEach(c => c.parts.forEach(pts => { path(pts, c, [0, 0, 0]); ctx.closePath(); ctx.stroke(); }));
    ctx.setLineDash([]);
  }
  C.forEach(c => {
    const pose = poseAt(c, t);
    c.parts.forEach(pts => { path(pts, c, pose); ctx.closePath(); ctx.fillStyle = P.land; ctx.fill(); ctx.strokeStyle = P.landEdge; ctx.lineWidth = 1.2; ctx.stroke(); });
  });
  // Evidence overlays.
  M.ev.forEach(k => {
    const E = EV[k], col = isLight() ? E.colL : E.col;
    E.items.forEach(it => {
      const c = CI[it.c], pose = poseAt(c, t);
      if (it.e) {
        path(ellipse(...it.e), c, pose); ctx.closePath();
        ctx.globalAlpha = it.fill ? .55 : .6; ctx.fillStyle = col; ctx.fill(); ctx.globalAlpha = 1;
        ctx.strokeStyle = col; ctx.lineWidth = 2; ctx.stroke();
        if (it.fill) { ctx.strokeStyle = P.text; ctx.lineWidth = 1; ctx.setLineDash([3, 3]); ctx.stroke(); ctx.setLineDash([]); }
      } else if (it.pts) {
        path(it.pts, c, pose); ctx.strokeStyle = col; ctx.lineWidth = E.type === 'coast' ? 5 : 6; ctx.lineJoin = 'round'; ctx.lineCap = 'round'; ctx.stroke();
        if (E.type === 'line') { ctx.strokeStyle = P.stage; ctx.lineWidth = 1.5; ctx.setLineDash([2, 4]); ctx.stroke(); ctx.setLineDash([]); }
      } else if (E.type === 'ice') {
        const q = xf(it.at, c, pose), d = rotVec(it.dir, pose[2]), L = 7 * sc;
        const x = X(q[0]), y = Y(q[1]);
        arrow(ctx, x - d[0] * L * .5, y + d[1] * L * .5, x + d[0] * L * .6, y - d[1] * L * .6, col, 3, 10);
        ctx.strokeStyle = col; ctx.lineWidth = 1.5;
        [-1, 1].forEach(s => { const o = [-d[1] * s * 4, -d[0] * s * 4]; ctx.beginPath(); ctx.moveTo(x - d[0] * L * .3 + o[0], y + d[1] * L * .3 + o[1]); ctx.lineTo(x + d[0] * L * .3 + o[0], y - d[1] * L * .3 + o[1]); ctx.stroke(); });
      } else if (E.type === 'coal') {
        const q = xf(it.at, c, pose), s = Math.max(7, sc * 2.6);
        ctx.fillStyle = '#111'; ctx.strokeStyle = col; ctx.lineWidth = 2;
        ctx.beginPath(); ctx.rect(X(q[0]) - s / 2, Y(q[1]) - s / 2, s, s); ctx.fill(); ctx.stroke();
      }
    });
  });
  // Supercontinent names.
  if (M.sup) {
    font(ctx, Math.max(size * 1.35, sc * 6), 800); ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    const centre = ids => { let sx = 0, sy = 0, n = 0; ids.forEach(id => { const c = CI[id], q = xf(c.anchor, c, poseAt(c, t)); sx += q[0]; sy += q[1]; n++; }); return [sx / n, sy / n]; };
    const say = (txt, p, a) => { if (a <= 0) return; ctx.globalAlpha = a * .9; ctx.fillStyle = P.text; ctx.strokeStyle = P.ocean; ctx.lineWidth = 5; ctx.strokeText(txt, X(p[0]), Y(p[1])); ctx.fillText(txt, X(p[0]), Y(p[1])); ctx.globalAlpha = 1; };
    say('PANGAEA', [5, 62], clamp((t - 195) / 15, 0, 1));
    const lg = clamp((205 - t) / 15, 0, 1) * clamp((t - 100) / 25, 0, 1);
    say('LAURASIA', centre(['NA', 'EU']).map((v, i) => v + (i ? 14 : 0)), lg);
    say('GONDWANA', centre(['SA', 'AF', 'AN', 'IN', 'AU']).map((v, i) => v + (i ? -2 : 0)), lg);
    if (t > 150) {
      font(ctx, size * 1.05, 600); ctx.globalAlpha = .8; ctx.fillStyle = P.text;
      ctx.fillText('Panthalassa Ocean', X(Math.max(-130, V.lon - V.span * .33)), Y(10));
      ctx.fillText('Tethys Sea', X(95), Y(-12)); ctx.globalAlpha = 1;
    }
  }
  if (M.labels) {
    C.forEach(c => {
      if (!c.label) return;
      const q = xf(c.label, c, poseAt(c, t));
      tag(ctx, c.name, X(q[0]), Y(q[1]), { size: size * .95, align: 'center', valign: 'middle', bg: P.tagBg, border: 'none' });
    });
  }
  if (t < 50) {
    const ind = CI.IN, q = xf([80, 31], ind, poseAt(ind, t));
    tag(ctx, 'Himalayas', X(q[0]), Y(q[1] + 4), { size: size * .9, align: 'center', valign: 'bottom', color: P.ridge, border: 'none' });
  }
  if (t < 25) tag(ctx, ['Mid-Atlantic', 'Ridge'], X(-32), Y(42), { size: size * .9, align: 'right', valign: 'middle', color: P.ridge, border: 'none' });
  // The evidence key.
  if (M.ev.size) {
    const keys = [...M.ev];
    font(ctx, size * .92, 600);
    const lh = size * 1.45, bw = Math.max(...keys.map(k => ctx.measureText(EV[k].name).width)) + size * 3, bh = lh * keys.length + 10;
    const bx = w - bw - 10, by = h - bh - 10;
    ctx.fillStyle = P.tagBg; ctx.strokeStyle = P.line2; ctx.lineWidth = 1; ctx.beginPath(); ctx.roundRect(bx, by, bw, bh, 8); ctx.fill(); ctx.stroke();
    keys.forEach((k, i) => {
      const y = by + 5 + lh * (i + .5), col = isLight() ? EV[k].colL : EV[k].col;
      ctx.fillStyle = EV[k].type === 'coal' ? '#111' : col; ctx.strokeStyle = col; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.roundRect(bx + 8, y - size * .4, size * 1.3, size * .8, 3); ctx.fill(); ctx.stroke();
      ctx.fillStyle = P.text; ctx.textAlign = 'left'; ctx.textBaseline = 'middle'; ctx.fillText(EV[k].name, bx + 14 + size * 1.3, y);
    });
  }
}

// Pangaea tab
const pgTime = $('#pgTime'), pgTicks = $('#pgTicks');
pgTicks.innerHTML = STAGES.map(s => `<button type="button" data-t="${s.t}" style="left:${(300 - s.t) / 3}%">${s.t ? s.t : 'Today'}</button>`).join('');
($('#pgDeck .sst-slides') || $('#pgDeck')).innerHTML = STAGES.map(s => `<section class="sst-slide" data-t="${s.t}"><h3>${s.h}</h3><p>${s.p}</p></section>`).join('');
let pgSlideLock = false;
function pgStageIndex(t) { let k = 0; STAGES.forEach((s, i) => { if (t <= s.t + .5) k = i; }); return k; }
PG.sync = () => {
  const t = Math.round(PG.t);
  pgTime.value = t; $('#pgRead').textContent = t;
  const k = pgStageIndex(PG.t);
  $$('#pgTicks button').forEach(b => b.classList.toggle('on', +b.dataset.t === STAGES[k].t));
  $('#pgCard').innerHTML = `<h4>${STAGES[k].h}</h4><p>${STAGES[k].p}</p>`;
  const d = $('#pgDeck').sstDeck;
  if (d && d.index !== k) { pgSlideLock = true; d.go(k); pgSlideLock = false; }
};
PG.onStop = () => playBtn($('#pgPlay'), false);
function pgGo(t) { PG.playing = false; playBtn($('#pgPlay'), false); PG.target = t; }
pgTime.addEventListener('input', () => { PG.playing = false; PG.target = null; playBtn($('#pgPlay'), false); PG.t = +pgTime.value; PG.sync(); });
pgTicks.addEventListener('click', e => { const b = e.target.closest('button'); if (b) pgGo(+b.dataset.t); });
$('#pgPlay').addEventListener('click', () => {
  if (PG.t <= 0) PG.t = 300;
  PG.target = null; PG.playing = !PG.playing; playBtn($('#pgPlay'), PG.playing);
});
$('#pgStart').addEventListener('click', () => pgGo(300));
$('#pgNow').addEventListener('click', () => pgGo(0));
seg($('#pgSpeed'), b => { PG.rate = +b.dataset.v; });
$('#pgLabels').addEventListener('change', e => { PG.labels = e.target.checked; });
$('#pgSuper').addEventListener('change', e => { PG.sup = e.target.checked; });
$('#pgGhost').addEventListener('change', e => { PG.ghost = e.target.checked; });
$('#pgEq').addEventListener('change', e => { PG.eq = e.target.checked; });
$('#pgDeck').addEventListener('sst-slide', e => { if (!pgSlideLock) pgGo(STAGES[e.detail.index].t); });

// Wegener tab
const EV_ORDER = ['fit', 'meso', 'glosso', 'lystro', 'rock', 'ice', 'coal'];
const SW = { area: k => `<svg viewBox="0 0 14 14"><ellipse cx="7" cy="7" rx="6" ry="5" fill="${EV[k].col}" opacity=".75"/></svg>` };
$('#evList').innerHTML = EV_ORDER.map(k => `<label><input type="checkbox" data-ev="${k}"${WG.ev.has(k) ? ' checked' : ''}><span><b>${EV[k].group ? EV[k].group + ': ' : ''}${EV[k].name}</b>${EV[k].blurb}</span></label>`).join('');
function wgSyncChecks() { $$('#evList input').forEach(i => { i.checked = WG.ev.has(i.dataset.ev); }); }
$('#evList').addEventListener('change', e => { const k = e.target.dataset.ev; if (!k) return; e.target.checked ? WG.ev.add(k) : WG.ev.delete(k); });
WG.sync = () => {
  const t = Math.round(WG.t);
  $('#wgTime').value = t; $('#wgRead').textContent = t;
  $('#wgClose').textContent = WG.t > 150 ? 'Open the oceans' : 'Close the oceans';
};
$('#wgTime').addEventListener('input', e => { WG.target = null; WG.t = +e.target.value; WG.sync(); });
$('#wgClose').addEventListener('click', () => { WG.target = WG.t > 150 ? 0 : 300; });
$('#wgTime').closest('.timeline').querySelector('.tl-ticks').addEventListener('click', e => { const b = e.target.closest('button'); if (b) WG.target = +b.dataset.t; });
$('#wgDeck').addEventListener('sst-slide', e => {
  const s = $$('#wgDeck .sst-slide')[e.detail.index], k = s.dataset.ev;
  if (k === 'all') EV_ORDER.forEach(x => WG.ev.add(x)); else if (k) { WG.ev.clear(); WG.ev.add(k); WG.target = 300; }
  wgSyncChecks();
});
WG.sync();

/* ════════════════════════ 5. sea-floor spreading ════════════════════════ */
// The ridge makes new crust at a rate; each slice remembers when it formed
// and the polarity of Earth's field at that moment, then moves outwards on
// both sides. Distances are kilometres from the ridge.
const SF = {
  t: 0, running: false, rate: 2.5, speed: 1, auto: true, nextFlip: 0, pol: 1, flips: [], recs: [], edge: 0, lastRec: -1,
  ship: null, drill: null, step: null, view: 200, plan: true, ages: true, sed: true, needles: true
};
const SF_SPEEDS = [.25, .5, 1, 2, 4];
const half = () => SF.rate * 5;   // km per million years on each side (1 cm/yr = 10 km/Myr, split two ways)
function sfReset() {
  Object.assign(SF, { t: 0, running: false, full: false, pol: 1, flips: [], recs: [], edge: 0, lastRec: -1, ship: null, drill: null });
  SF.nextFlip = sfInterval();
  playBtn($('#sfPlay'), false, 'Start');
  sfReadouts();
}
function sfInterval() { return .35 + -Math.log(1 - Math.random()) * .9; }
function sfFlip() { SF.pol = -SF.pol; SF.flips.push(SF.t); SF.nextFlip = SF.t + sfInterval(); sfReadouts(); }
function sfTick(dt) {
  if (!SF.running) return;
  const d = dt * SF.speed;
  SF.t += d;
  const mv = half() * d;
  SF.edge += mv;
  for (const r of SF.recs) r.d += mv;
  if (SF.t - SF.lastRec >= .01 || SF.lastRec < 0) { SF.recs.unshift({ tb: SF.t, d: 0, pol: SF.pol }); SF.lastRec = SF.t; }
  while (SF.recs.length > 2 && SF.recs[SF.recs.length - 2].d > SF.view * 1.3) SF.recs.pop();
  if (SF.auto && SF.t >= SF.nextFlip) sfFlip();
  // Once the continents have drifted out of view, pause: the stripes now fill the ocean.
  if (!SF.full && SF.edge > SF.view * 1.08) { SF.running = false; playBtn($('#sfPlay'), false, 'Resume'); SF.full = true; }
  sfReadouts();
}
// The slice of crust at distance d from the ridge (or null for continent).
function sfAt(d) {
  d = Math.abs(d);
  if (d > SF.edge || !SF.recs.length) return null;
  const R = SF.recs;
  let lo = 0, hi = R.length - 1;
  while (lo < hi) { const m = (lo + hi) >> 1; if (R[m].d < d) lo = m + 1; else hi = m; }
  return R[lo];
}
function sfAgeAt(d) { const r = sfAt(d); return r ? SF.t - r.tb : null; }
function sfReadouts() {
  $('#sfTime').textContent = SF.t.toFixed(1) + ' Myr';
  $('#sfWidth').textContent = Math.round(SF.edge * 2).toLocaleString('en-GB') + ' km';
  const f = $('#sfField'); f.textContent = SF.pol > 0 ? 'Normal' : 'Reversed'; f.className = SF.pol > 0 ? 'n' : 'r';
  $('#sfRev').textContent = SF.flips.length;
}

function sfDraw(dt, now) {
  const { ctx, w, h } = fit($('#sfCv'));
  const size = LBL, mid = w / 2;
  const kmPx = (w / 2 - 6) / SF.view;          // pixels per km
  // Bands from the top: survey trace, sea and ridge, mantle; from the bottom: age ruler, plan view.
  const L = SF.layout = {};
  L.traceT = size * .5; L.traceB = L.traceT + Math.max(h * .1, size * 2);
  L.sea = L.traceB + size * 1.4 + h * .045;
  L.ridge = L.sea + Math.max(h * .12, size * 3.4);
  L.ruler = h - size * 1.5;
  L.planB = L.ruler - size * 1.5; L.planT = L.planB - Math.max(h * .1, size * 2);
  L.bot = SF.plan ? L.planT - size * 1.5 : L.ruler - size * 1.5;
  const crustH = Math.max(14, h * .05), sink = Math.max(4, (L.bot - L.ridge - crustH * 3) / Math.sqrt(36));
  const floorY = age => Math.min(L.bot - crustH * 1.6, L.ridge + sink * Math.sqrt(Math.max(0, age)));
  const sedPx = age => SF.sed ? Math.min(crustH * .9, age * h * .0025) : 0;
  ctx.fillStyle = P.stage; ctx.fillRect(0, 0, w, h);

  // Sea.
  ctx.fillStyle = P.water; ctx.fillRect(0, L.sea, w, L.bot - L.sea);
  // Mantle below.
  const crustBottomAt = x => {
    const d = Math.abs(x - mid) / kmPx, r = sfAt(d);
    return r ? floorY(SF.t - r.tb) + crustH : L.sea + crustH * 2.3;
  };
  ctx.fillStyle = P.asth;
  ctx.beginPath(); ctx.moveTo(0, L.bot);
  for (let x = 0; x <= w; x += 4) ctx.lineTo(x, Math.min(L.bot, crustBottomAt(x) - 1));
  ctx.lineTo(w, L.bot); ctx.closePath(); ctx.fill();

  // Oceanic crust, column by column, coloured by polarity.
  const step = 2;
  const colAt = x => { const r = sfAt(Math.abs(x - mid) / kmPx); return r; };
  for (let x = 0; x < w; x += step) {
    const r = colAt(x + step / 2);
    if (!r) continue;
    const age = SF.t - r.tb, y = floorY(age);
    ctx.fillStyle = r.pol > 0 ? P.normal : P.reversed;
    ctx.fillRect(x, y, step + .5, crustH);
    const s = sedPx(age);
    if (s > .5) { ctx.fillStyle = P.sed; ctx.fillRect(x, y - s, step + .5, s); }
  }
  // Continents at both edges.
  const ce = SF.edge * kmPx;
  const contTop = L.sea - h * .03, contBot = L.sea + crustH * 2.3;
  [[0, mid - ce], [mid + ce, w]].forEach(([a, b], i) => {
    if (b - a < 1) return;
    ctx.fillStyle = P.cont; ctx.beginPath();
    const inner = i ? a : b, outer = i ? b : a, s = i ? 1 : -1;
    const slope = Math.min(h * .09, Math.abs(b - a));
    ctx.moveTo(outer, contTop); ctx.lineTo(inner - s * slope * .7, contTop);
    ctx.lineTo(inner, SF.edge > 0 ? floorY(SF.t) - 2 : contTop + 6);
    ctx.lineTo(inner, contBot); ctx.lineTo(outer, contBot); ctx.closePath(); ctx.fill();
    ctx.fillStyle = P.contTop; ctx.fillRect(Math.min(outer, inner - s * slope * .7), contTop - 4, Math.abs(inner - s * slope * .7 - outer), 4);
  });
  font(ctx, size * .95, 700); ctx.textBaseline = 'middle'; ctx.fillStyle = '#ffffff';
  const cyName = (contTop + contBot) / 2 + 2;
  if (mid - ce > size * 9) { ctx.textAlign = 'left'; ctx.fillText('South America', 10, cyName); }
  if (mid - ce > size * 5) { ctx.textAlign = 'right'; ctx.fillText('Africa', w - 10, cyName); }
  // Key, opposite the field indicator.
  const kx = mid + w * .2, ky = L.sea + (L.ridge - L.sea) * .5;
  font(ctx, size * .9, 600);
  const kw = ctx.measureText('reversed polarity').width + size * 2.6;
  ctx.fillStyle = P.tagBg; ctx.strokeStyle = P.line2; ctx.lineWidth = 1; ctx.beginPath(); ctx.roundRect(kx, ky - size * 1.4, kw, size * 2.8, 8); ctx.fill(); ctx.stroke();
  [[P.normal, 'normal polarity', -.65], [P.reversed, 'reversed polarity', .65]].forEach(([c, t, o]) => {
    ctx.fillStyle = c; ctx.fillRect(kx + size * .5, ky + o * size - size * .4, size * .8, size * .8);
    ctx.fillStyle = P.text; ctx.textAlign = 'left'; ctx.textBaseline = 'middle'; ctx.fillText(t, kx + size * 1.7, ky + o * size);
  });

  // Magma rising beneath the ridge.
  const ridgeTop = SF.edge > 0 ? floorY(0) : contTop + 6;
  const mw = Math.max(16, w * .03);
  ctx.fillStyle = P.magma;
  ctx.beginPath(); ctx.moveTo(mid - 3, ridgeTop + 4); ctx.lineTo(mid + 3, ridgeTop + 4);
  ctx.lineTo(mid + mw * 2.2, L.bot); ctx.lineTo(mid - mw * 2.2, L.bot); ctx.closePath(); ctx.fill();
  ctx.fillStyle = 'rgba(255,230,160,.85)';
  for (let i = 0; i < 7; i++) {
    const ph = ((now / 1000) * (SF.running ? .5 : .12) + i / 7) % 1, y = lerp(L.bot - 6, ridgeTop + 12, ph), sp = (1 - ph) * mw * 1.6;
    ctx.beginPath(); ctx.arc(mid + Math.sin(i * 2.3) * sp, y, 2.5, 0, 7); ctx.fill();
  }
  // Rift valley notch at the crest.
  if (SF.edge > 0) { ctx.fillStyle = P.water; ctx.beginPath(); ctx.moveTo(mid - 7, ridgeTop); ctx.lineTo(mid + 7, ridgeTop); ctx.lineTo(mid, ridgeTop + crustH * .45); ctx.closePath(); ctx.fill(); }

  // Mineral "compass needles" in the crust.
  if (SF.needles) {
    const gapN = Math.max(16, size * 1.5);
    for (let k = 1; k * gapN < SF.edge * kmPx; k++) {
      [-1, 1].forEach(s => {
        const x = mid + s * k * gapN, r = colAt(x); if (!r) return;
        const y = floorY(SF.t - r.tb) + crustH / 2, l = crustH * .32;
        ctx.strokeStyle = r.pol > 0 ? P.needleN : P.needleR; ctx.fillStyle = ctx.strokeStyle; ctx.lineWidth = 1.6;
        arrow(ctx, x, y + l * r.pol, x, y - l * r.pol, ctx.strokeStyle, 1.6, 5);
      });
    }
  }
  // Mantle flow arrows.
  const ay = L.bot - Math.max(size * 1.4, (L.bot - ridgeTop) * .18);
  ctx.globalAlpha = .7;
  arrow(ctx, mid - mw * 3, ay, mid - w * .2, ay, '#ffffff', 2.5, 10);
  arrow(ctx, mid + mw * 3, ay, mid + w * .2, ay, '#ffffff', 2.5, 10);
  ctx.globalAlpha = 1;

  // Sea level and the field indicator.
  ctx.strokeStyle = P.accent; ctx.lineWidth = 1.5; ctx.setLineDash([6, 5]);
  ctx.beginPath(); ctx.moveTo(0, L.sea); ctx.lineTo(w, L.sea); ctx.stroke(); ctx.setLineDash([]);
  const fx = mid - w * .26, fy = L.sea + (L.ridge - L.sea) * .5;
  sfField(ctx, fx, fy, size, SF.step === 4);

  // Magnetometer survey trace.
  if (SF.ship) {
    if (SF.ship.x < w) SF.ship.x += dt * w / 6;
    const sx = Math.min(SF.ship.x, w), mid0 = (L.traceT + L.traceB) / 2, amp = (L.traceB - L.traceT) / 2 * .85;
    ctx.strokeStyle = P.line2; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(0, mid0); ctx.lineTo(w, mid0); ctx.stroke();
    ctx.strokeStyle = P.text; ctx.lineWidth = 2; ctx.beginPath();
    for (let x = 0; x <= sx; x += 2) {
      let v = 0, n = 0;
      for (let o = -6; o <= 6; o += 3) { const r = colAt(x + o); v += r ? r.pol : 0; n++; }
      const y = mid0 - amp * v / n + (colAt(x) ? 0 : Math.sin(x * .7) * 1.5);
      x ? ctx.lineTo(x, y) : ctx.moveTo(x, y);
    }
    ctx.stroke();
    font(ctx, size * .85, 600); ctx.fillStyle = P.muted; ctx.textAlign = 'left'; ctx.textBaseline = 'top';
    ctx.fillText('Magnetometer reading: stronger over normal rock, weaker over reversed', 8, L.traceB + 3);
    sfShip(ctx, sx, L.sea, size);
  } else {
    font(ctx, size * .9, 600); ctx.fillStyle = P.muted; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText(SF.t > 0 ? 'Sail a magnetometer survey to read the stripes from a ship' : 'Press Start: the continent splits and a new ocean opens', mid, (L.traceT + L.traceB) / 2 + 4);
  }

  // Plan view.
  if (SF.plan) {
    for (let x = 0; x < w; x += step) {
      const r = colAt(x + step / 2);
      ctx.fillStyle = r ? (r.pol > 0 ? P.normal : P.reversed) : P.land;
      ctx.fillRect(x, L.planT, step + .5, L.planB - L.planT);
    }
    if (SF.edge > 0) { ctx.strokeStyle = P.ridge; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(mid, L.planT); ctx.lineTo(mid, L.planB); ctx.stroke(); }
    ctx.strokeStyle = P.line2; ctx.lineWidth = 1; ctx.strokeRect(.5, L.planT + .5, w - 1, L.planB - L.planT - 1);
    font(ctx, size * .85, 700); ctx.fillStyle = P.muted; ctx.textAlign = 'left'; ctx.textBaseline = 'bottom';
    ctx.fillText('PLAN VIEW: looking down on the sea floor', 8, L.planT - 3);
    if (SF.step === 6 && SF.edge * kmPx > 60) {
      const e = SF.edge * kmPx, yb = L.planB + 6;
      ctx.strokeStyle = P.hl; ctx.lineWidth = 3;
      ctx.beginPath(); ctx.moveTo(mid - e, yb); ctx.lineTo(mid - e, yb + 6); ctx.lineTo(mid - 4, yb + 6); ctx.moveTo(mid + 4, yb + 6); ctx.lineTo(mid + e, yb + 6); ctx.lineTo(mid + e, yb); ctx.stroke();
      tag(ctx, 'Mirror image either side of the ridge', mid, L.planT - 4, { size, align: 'center', valign: 'bottom', color: P.hl });
    }
  }

  // Age ruler.
  if (SF.ages && SF.edge > 0) {
    const yR = L.ruler;
    ctx.strokeStyle = SF.step === 7 ? P.hl : P.muted; ctx.lineWidth = SF.step === 7 ? 2.5 : 1.2;
    ctx.beginPath(); ctx.moveTo(mid - SF.edge * kmPx, yR); ctx.lineTo(mid + SF.edge * kmPx, yR); ctx.stroke();
    const span = SF.t, every = span > 24 ? 5 : span > 10 ? 2 : span > 4 ? 1 : .5;
    font(ctx, size * .85, 600); ctx.fillStyle = SF.step === 7 ? P.hl : P.text; ctx.textAlign = 'center'; ctx.textBaseline = 'top';
    let lastX = -1e9;
    for (let a = 0; a <= span + 1e-6; a += every) {
      const r = SF.recs.find(q => SF.t - q.tb >= a - 1e-6);
      if (!r) break;
      const dx = r.d * kmPx;
      if (dx > w / 2) break;
      if (dx - lastX < size * 2.4 && a) continue;
      lastX = dx;
      [-1, 1].forEach(s => { if (!a && s < 0) return; const x = mid + s * dx; ctx.beginPath(); ctx.moveTo(x, yR - 4); ctx.lineTo(x, yR + 4); ctx.stroke(); ctx.fillText(a ? String(+a.toFixed(1)) : '0', x, yR + 6); });
    }
    font(ctx, size * .85, 700); ctx.fillStyle = P.muted; ctx.textAlign = 'left'; ctx.textBaseline = 'bottom';
    ctx.fillText('Age of the rock (million years): youngest at the ridge', 8, yR - 4);
  }

  // Step highlights from the slides.
  if (SF.step === 1) { ctx.strokeStyle = P.hl; ctx.lineWidth = 3; ctx.setLineDash([8, 6]); ctx.beginPath(); ctx.ellipse(mid, (ridgeTop + L.bot) / 2, mw * 2.6, (L.bot - ridgeTop) / 2 + 8, 0, 0, 7); ctx.stroke(); ctx.setLineDash([]); tag(ctx, ['Basalt magma', 'rises at the ridge'], mid + mw * 2.8, (ridgeTop + L.bot) / 2, { size, valign: 'middle', color: P.hl }); }
  if (SF.step === 2 || SF.step === 3) sfInset(ctx, w, h, L, size, SF.step === 3, now);
  if (SF.step === 5 && SF.edge > 0) {
    const yy = ridgeTop - size * 1.4;
    arrow(ctx, mid - 14, yy, mid - w * .18, yy, P.hl, 4, 14); arrow(ctx, mid + 14, yy, mid + w * .18, yy, P.hl, 4, 14);
    tag(ctx, 'Carried away on both sides', mid, yy - 8, { size, align: 'center', valign: 'bottom', color: P.hl });
  }

  // Drilled core.
  if (SF.drill) {
    const D = SF.drill, a = clamp(1 - (now - D.at) / 9000, 0, 1);
    if (a <= 0) SF.drill = null;
    else {
      ctx.globalAlpha = Math.min(1, a * 3);
      const x = mid + D.side * D.d * kmPx, r = sfAt(D.d);
      const yb = r ? floorY(SF.t - r.tb) + crustH : contBot;
      ctx.strokeStyle = P.hl; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(x, L.sea); ctx.lineTo(x, yb); ctx.stroke();
      const lines = r ? [`Basalt ${(SF.t - r.tb).toFixed(1)} million years old`, `${r.pol > 0 ? 'Normal' : 'Reversed'} polarity`, `Sediment ≈ ${Math.round((SF.t - r.tb) * 8)} m thick`]
                      : ['Continental crust: granite', 'hundreds of millions of years old'];
      tag(ctx, lines, x + (D.side > 0 ? -10 : 10), L.sea + 8, { size, align: D.side > 0 ? 'right' : 'left', border: P.hl, keepIn: { w, h } });
      ctx.globalAlpha = 1;
    }
  }
}
function sfField(ctx, x, y, size, hl) {
  const r = Math.max(16, size * 1.5);
  ctx.fillStyle = P.tagBg; ctx.strokeStyle = hl ? P.hl : P.line2; ctx.lineWidth = hl ? 3 : 1;
  ctx.beginPath(); ctx.roundRect(x - r * 1.2, y - r * 1.25, r * 2.4 + size * 7.4, r * 2.5, 10); ctx.fill(); ctx.stroke();
  ctx.fillStyle = P.accent; ctx.globalAlpha = .25; ctx.beginPath(); ctx.arc(x, y, r * .9, 0, 7); ctx.fill(); ctx.globalAlpha = 1;
  const s = SF.pol;
  arrow(ctx, x, y + r * .75 * s, x, y - r * .75 * s, SF.pol > 0 ? P.normal : P.accent, 3, 9);
  font(ctx, size * .8, 800); ctx.fillStyle = P.text; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.fillText(s > 0 ? 'N' : 'S', x + r * .55, y - r * .7); ctx.fillText(s > 0 ? 'S' : 'N', x + r * .55, y + r * .72);
  font(ctx, size * .85, 600); ctx.textAlign = 'left'; ctx.fillStyle = P.muted;
  ctx.fillText("Earth's field", x + r * 1.05, y - size * .55);
  font(ctx, size, 800); ctx.fillStyle = SF.pol > 0 ? P.normal : P.accent;
  ctx.fillText(SF.pol > 0 ? 'NORMAL' : 'REVERSED', x + r * 1.05, y + size * .65);
}
function sfShip(ctx, x, y, size) {
  const s = Math.max(1, size / 13);
  ctx.save(); ctx.translate(x, y); ctx.scale(s, s);
  ctx.fillStyle = P.text; ctx.beginPath(); ctx.moveTo(-16, -6); ctx.lineTo(14, -6); ctx.lineTo(9, 1); ctx.lineTo(-12, 1); ctx.closePath(); ctx.fill();
  ctx.fillRect(-6, -13, 10, 7);
  ctx.strokeStyle = P.text; ctx.lineWidth = 1; ctx.setLineDash([2, 2]); ctx.beginPath(); ctx.moveTo(-16, -3); ctx.lineTo(-34, 2); ctx.stroke(); ctx.setLineDash([]);
  ctx.fillStyle = P.hl; ctx.beginPath(); ctx.arc(-34, 2, 2.5, 0, 7); ctx.fill();
  ctx.restore();
}
// Zoomed inset: grains in hot lava swing to line up with the field; once cool, they are locked.
const GRAINS = Array.from({ length: 22 }, () => ({ x: Math.random(), y: Math.random(), a: Math.random() * Math.PI * 2, w: Math.random() * 2 - 1 }));
function sfInset(ctx, w, h, L, size, locked, now) {
  const bw = Math.min(w * .34, size * 20), bh = Math.min(h * .3, size * 10), x = w - bw - 10, y = L.sea + 8;
  ctx.fillStyle = P.tagBg; ctx.strokeStyle = P.hl; ctx.lineWidth = 2.5; ctx.beginPath(); ctx.roundRect(x, y, bw, bh, 10); ctx.fill(); ctx.stroke();
  font(ctx, size * .9, 700); ctx.fillStyle = P.text; ctx.textAlign = 'left'; ctx.textBaseline = 'top';
  ctx.fillText(locked ? 'Cooled basalt: grains locked in' : 'Hot lava: grains free to turn', x + 10, y + 8);
  const ix = x + 10, iy = y + size * 1.9, iw = bw - 20 - size * 3, ih = bh - size * 2.6;
  ctx.fillStyle = locked ? '#3b3b3b' : P.magma; ctx.globalAlpha = locked ? .9 : .55; ctx.fillRect(ix, iy, iw, ih); ctx.globalAlpha = 1;
  const target = SF.pol > 0 ? -Math.PI / 2 : Math.PI / 2;
  GRAINS.forEach(g => {
    if (!locked) { const d = Math.atan2(Math.sin(target - g.a), Math.cos(target - g.a)); g.a += d * .04 + Math.sin(now / 300 + g.w * 9) * .02 * (1 - Math.min(1, Math.abs(d))); }
    const gx = ix + 8 + g.x * (iw - 16), gy = iy + 8 + g.y * (ih - 16), l = Math.max(6, size * .55);
    arrow(ctx, gx - Math.cos(g.a) * l / 2, gy - Math.sin(g.a) * l / 2, gx + Math.cos(g.a) * l / 2, gy + Math.sin(g.a) * l / 2, '#ffffff', 1.6, 5);
  });
  const fx = ix + iw + size * 1.5;
  arrow(ctx, fx, iy + ih - 6, fx, iy + 6, P.hl, 3, 10);
  if (SF.pol < 0) { ctx.fillStyle = P.tagBg; ctx.fillRect(fx - 8, iy, 16, ih); arrow(ctx, fx, iy + 6, fx, iy + ih - 6, P.hl, 3, 10); }
  font(ctx, size * .75, 700); ctx.fillStyle = P.hl; ctx.textAlign = 'center'; ctx.textBaseline = 'top'; ctx.fillText('field', fx, iy + ih + 2);
}

$('#sfPlay').addEventListener('click', () => { SF.running = !SF.running; playBtn($('#sfPlay'), SF.running, SF.running ? 'Pause' : (SF.t > 0 ? 'Resume' : 'Start')); });
$('#sfFlip').addEventListener('click', sfFlip);
$('#sfReset').addEventListener('click', sfReset);
$('#sfRate').addEventListener('input', e => {
  SF.rate = +e.target.value;
  const where = SF.rate <= 4 ? ' (like the Mid-Atlantic)' : SF.rate >= 10 ? ' (like the East Pacific Rise)' : '';
  $('#sfRateOut').textContent = SF.rate + ' cm/year' + where;
});
$('#sfSpeed').addEventListener('input', e => { SF.speed = SF_SPEEDS[e.target.value - 1]; $('#sfSpeedOut').textContent = `1 million years in ${+(1 / SF.speed).toFixed(2)} s`; });
$('#sfAuto').addEventListener('change', e => { SF.auto = e.target.checked; if (SF.auto) SF.nextFlip = SF.t + sfInterval(); });
$('#sfShip').addEventListener('click', () => { SF.ship = { x: 0 }; });
['Plan', 'Ages', 'Sed', 'Needles'].forEach(k => $('#sf' + k).addEventListener('change', e => { SF[k.toLowerCase()] = e.target.checked; }));
$('#sfCv').addEventListener('click', e => {
  const L = SF.layout; if (!L) return;
  const r = e.currentTarget.getBoundingClientRect(), x = e.clientX - r.left, y = e.clientY - r.top, w = r.width;
  if (y < L.sea) return;
  const kmPx = (w / 2 - 6) / SF.view, d = Math.abs(x - w / 2) / kmPx;
  SF.drill = { d, side: x < w / 2 ? -1 : 1, at: performance.now() };
});
$('#sfDeck').addEventListener('sst-slide', e => sfStep(e.detail.index));
function sfStep(i) {
  const s = $$('#sfDeck .sst-slide')[i]; SF.step = s ? +s.dataset.step : null;
  if (SF.step >= 1 && SF.t === 0) { SF.running = true; playBtn($('#sfPlay'), true, 'Pause'); }
  if (SF.step === 4) sfFlip();
  if (SF.step === 6) SF.plan = $('#sfPlan').checked = true;
  if (SF.step === 7) SF.ages = $('#sfAges').checked = true;
}
SF.rate = +$('#sfRate').value; SF.speed = SF_SPEEDS[$('#sfSpeed').value - 1];
$('#sfRate').dispatchEvent(new Event('input')); $('#sfSpeed').dispatchEvent(new Event('input'));
sfReset();

/* ════════════════════════ 6. exam diagrams (SVG) ════════════════════════ */
// Drawn as SVG with classes, so CSS recolours them for the theme and for print.
const SPREAD_W = [28, 20, 30, 16, 34, 24, 22, 30, 40, 76];   // stripe widths out from the ridge, normal first
function svgSpreading(o = {}) {
  const fy = x => { const d = Math.abs(x - 320); return d < 10 ? 117 + (10 - d) * .7 : 116 + d * .075; };
  let s = `<svg class="dsvg${o.cls ? ' ' + o.cls : ''}" viewBox="0 0 640 ${o.ages ? 376 : 360}" role="img" aria-label="Cross-section of a mid-ocean ridge with symmetrical magnetic stripes">`;
  s += `<rect class="sea" x="0" y="46" width="640" height="104"/><line class="seal" x1="0" y1="46" x2="640" y2="46"/>`;
  s += `<rect class="asth" x="0" y="150" width="640" height="${o.ages ? 226 : 210}"/>`;
  // stripes
  let x = 320;
  const stripes = [];
  SPREAD_W.forEach((wd, i) => { stripes.push({ a: x, b: x + wd, n: i % 2 === 0 }); x += wd; });
  const poly = (a, b) => {
    const xs = [a]; for (let k = Math.ceil(a / 5) * 5; k < b; k += 5) xs.push(k); xs.push(b);
    const top = xs.map(v => `${v},${fy(v).toFixed(1)}`), bot = xs.slice().reverse().map(v => `${v},${(fy(v) + 26).toFixed(1)}`);
    return top.concat(bot).join(' ');
  };
  stripes.forEach((st, i) => {
    if (!i) return;   // the central stripe straddles the ridge: drawn whole below
    [[st.a, st.b], [640 - st.b, 640 - st.a]].forEach(([a, b]) => { s += `<polygon class="${st.n ? 'crN' : 'crR'}" points="${poly(a, b)}"/>`; });
  });
  s += `<polygon class="crN" points="${poly(292, 348)}"/>`;
  // sediment, thicker away from the ridge
  const sed = side => { const pts = []; for (let d = 60; d <= 320; d += 10) { const xx = 320 + side * d; pts.push([xx, fy(xx)]); } const top = pts.map(([a, b], i) => `${a},${(b - (i * .22)).toFixed(1)}`); return top.concat(pts.slice().reverse().map(([a, b]) => `${a},${b.toFixed(1)}`)).join(' '); };
  s += `<polygon class="sed" points="${sed(-1)}"/><polygon class="sed" points="${sed(1)}"/>`;
  // needles
  stripes.forEach(st => [st, { a: 640 - st.b, b: 640 - st.a, n: st.n }].forEach(q => {
    const cx = (q.a + q.b) / 2; if (Math.abs(cx - 320) < 12 || cx < 8 || cx > 632) return;
    const cy = fy(cx) + 13, d = q.n ? -1 : 1;
    s += `<g class="${q.n ? 'nN' : ''}"><line class="needle" x1="${cx}" y1="${cy - 7 * d}" x2="${cx}" y2="${cy + 6 * d}"/><path class="arwf" d="M${cx - 3.5},${cy + 4 * d} L${cx},${cy + 9 * d} L${cx + 3.5},${cy + 4 * d}Z"/></g>`;
  }));
  // magma
  s += `<path class="mag" d="M314,${fy(320) + 20} L326,${fy(320) + 20} L356,226 Q320,258 284,226 Z"/>`;
  s += `<path class="arw" d="M320,236 V178"/><path class="arwf" d="M314,182 L320,170 L326,182Z"/>`;
  // plate arrows
  s += `<path class="arw" d="M286,92 H168"/><path class="arwf" d="M172,86 L160,92 L172,98Z"/><path class="arw" d="M354,92 H472"/><path class="arwf" d="M468,86 L480,92 L468,98Z"/>`;
  s += `<text class="t2" x="8" y="40">Sea level</text>`;
  // labels
  const lab = (n, lines, tx, ty, lx, ly, anchor = 'start') => {
    if (o.bare && n !== 1) return '';
    let g = `<g class="lab">`;
    // The leader meets the label beside it, or above it when the target is further right.
    const ex = lx > tx ? tx + 30 : tx - 4, ey = lx > tx ? ty - 15 : ty - 4;
    if (lx != null) g += `<path class="ldr" d="M${lx},${ly} L${ex},${ey}"/><circle cx="${lx}" cy="${ly}" r="2.5" class="arwf"/>`;
    lines.forEach((l, i) => { g += `<text class="${i ? 't2' : 't'}" x="${tx}" y="${ty + i * 15}" text-anchor="${anchor}">${l}</text>`; });
    g += `</g>`;
    g += `<g class="blank"><circle cx="${tx + (anchor === 'end' ? -9 : anchor === 'middle' ? 0 : 9)}" cy="${ty - 4}" r="9"/><text x="${tx + (anchor === 'end' ? -9 : anchor === 'middle' ? 0 : 9)}" y="${ty}" text-anchor="middle">${n}</text></g>`;
    if (lx != null) g = g.replace('<g class="blank">', `<g class="blank"><path class="ldr" d="M${lx},${ly} L${tx},${ty - 4}"/>`);
    return g;
  };
  s += lab(1, ['Mid-ocean ridge', '(constructive plate boundary)'], 320, 18, null, null, 'middle');
  s += `<path class="ldr lab" d="M320,40 V108"/>`;
  s += lab(2, ['Magma rises and cools', 'to form new basalt crust'], 392, 262, 344, 222);
  s += lab(3, ['Iron minerals line up', 'with the magnetic field'], 420, 200, 386, 144);
  s += lab(4, ['Normal polarity'], 16, 200, 96, 145);
  s += lab(5, ['Reversed polarity'], 130, 236, 234, 141);
  s += lab(6, ['Plates move apart'], 320, 80, null, null, 'middle');
  s += lab(7, ['Stripes are symmetrical either side of the ridge'], 320, 304, null, null, 'middle');
  // age axis
  const ay = o.ages ? 340 : 336;
  s += `<path class="arw" d="M300,${ay} H24"/><path class="arwf" d="M28,${ay - 5} L18,${ay} L28,${ay + 5}Z"/><path class="arw" d="M340,${ay} H616"/><path class="arwf" d="M612,${ay - 5} L622,${ay} L612,${ay + 5}Z"/>`;
  s += `<text class="t" x="320" y="${ay + 4}" text-anchor="middle">0</text>`;
  s += `<text class="t2" x="24" y="${ay - 8}">older</text><text class="t2" x="616" y="${ay - 8}" text-anchor="end">older</text>`;
  if (o.ages) {
    for (let a = 1; a <= 5; a++) [-1, 1].forEach(sd => { const xx = 320 + sd * a * 56; s += `<line class="ldr" x1="${xx}" y1="${ay - 4}" x2="${xx}" y2="${ay + 4}"/><text class="t2" x="${xx}" y="${ay + 18}" text-anchor="middle">${a}</text>`; });
    s += `<text class="t2" x="320" y="${ay + 22}" text-anchor="middle">Age of rock (million years)</text>`;
  } else {
    s += `<text class="t2" x="320" y="${ay + 20}" text-anchor="middle">Age of rock: youngest at the ridge</text>`;
  }
  if (o.markX) { const mx = 320 - o.markX * 56, my = fy(mx) + 13; s += `<circle cx="${mx}" cy="${my}" r="9" class="box"/><text class="t" x="${mx}" y="${my + 4.5}" text-anchor="middle">X</text>`; }
  return s + '</svg>';
}
function svgConvection(o = {}) {
  let s = `<svg class="dsvg${o.cls ? ' ' + o.cls : ''}" viewBox="0 0 640 340" role="img" aria-label="Two convection currents in the mantle rising under a constructive plate boundary and pulling two plates apart">`;
  s += `<rect class="sea" x="0" y="24" width="640" height="26"/><rect class="asth" x="0" y="76" width="640" height="208"/><rect class="core" x="0" y="284" width="640" height="56"/>`;
  s += `<rect class="plate" x="10" y="50" width="300" height="26"/><rect class="plate" x="330" y="50" width="300" height="26"/>`;
  s += `<path class="mag" d="M310,50 H330 L346,96 L340,284 H300 L294,96 Z"/>`;
  // plate arrows on the plates
  s += `<path class="arw" d="M286,63 H150"/><path class="arwf" d="M154,57 L142,63 L154,69Z"/><path class="arw" d="M354,63 H490"/><path class="arwf" d="M486,57 L498,63 L486,69Z"/>`;
  // loops: rising at the inner edges, sinking at the outer edges
  const loop = (x0, x1, inner) => {
    const y0 = 100, y1 = 262, r = 50, m = (x0 + x1) / 2;
    const hot = inner === 'right'
      ? `M${m},${y1} H${x1 - r} Q${x1},${y1} ${x1},${y1 - r} V${y0 + r} Q${x1},${y0} ${x1 - r},${y0} H${m}`
      : `M${m},${y1} H${x0 + r} Q${x0},${y1} ${x0},${y1 - r} V${y0 + r} Q${x0},${y0} ${x0 + r},${y0} H${m}`;
    const cool = inner === 'right'
      ? `M${m},${y0} H${x0 + r} Q${x0},${y0} ${x0},${y0 + r} V${y1 - r} Q${x0},${y1} ${x0 + r},${y1} H${m}`
      : `M${m},${y0} H${x1 - r} Q${x1},${y0} ${x1},${y0 + r} V${y1 - r} Q${x1},${y1} ${x1 - r},${y1} H${m}`;
    const xi = inner === 'right' ? x1 : x0, xo = inner === 'right' ? x0 : x1, dir = inner === 'right' ? -1 : 1;
    return `<path class="hot" d="${hot}"/><path class="cool" d="${cool}"/>` +
      `<path class="hotf" d="M${xi - 8},${185} L${xi},${170} L${xi + 8},${185}Z"/>` +
      `<path class="coolf" d="M${xo - 8},${175} L${xo},${190} L${xo + 8},${175}Z"/>` +
      `<path class="arwf" d="M${m - dir * 6},${y0 - 7} L${m + dir * 8},${y0} L${m - dir * 6},${y0 + 7}Z"/>` +
      `<path class="arwf" d="M${m + dir * 6},${y1 - 7} L${m - dir * 8},${y1} L${m + dir * 6},${y1 + 7}Z"/>`;
  };
  s += loop(30, 270, 'right') + loop(370, 610, 'left');
  const lab = (n, lines, tx, ty, lx, ly, anchor = 'middle') => {
    let g = `<g class="lab">`;
    if (lx != null) g += `<path class="ldr" d="M${lx},${ly} L${tx},${ty - 15}"/><circle cx="${lx}" cy="${ly}" r="2.5" class="arwf"/>`;
    lines.forEach((l, i) => { g += `<text class="${i ? 't2' : 't'}" x="${tx}" y="${ty + i * 15}" text-anchor="${anchor}">${l}</text>`; });
    return g + `</g><g class="blank">${lx != null ? `<path class="ldr" d="M${lx},${ly} L${tx},${ty}"/>` : ''}<circle cx="${tx}" cy="${ty - 4}" r="9"/><text x="${tx}" y="${ty}" text-anchor="middle">${n}</text></g>`;
  };
  s += lab(1, ['HEAT FROM THE CORE', '(radioactive decay)'], 320, 306);
  s += lab(2, ['Hot, less dense', 'rock rises'], 210, 226, 266, 214);
  s += lab(3, ['Spreads sideways', 'under the plates'], 150, 132, 150, 102);
  s += lab(4, ['Friction drags', 'the plates apart'], 490, 132, 470, 66);
  s += lab(5, ['Cools, becomes denser', 'and sinks'], 470, 222, 606, 200);
  s += lab(6, ['Magma fills the gap: constructive boundary'], 320, 16, 320, 50);
  return s + '</svg>';
}
$('#dgSpread').innerHTML = svgSpreading();
$('#dgConv').innerHTML = svgConvection();
seg($('#dgPick'), b => $$('.dg').forEach((d, i) => d.classList.toggle('on', i === +b.dataset.d)));
$('#dgQuiz').addEventListener('click', e => {
  const on = e.currentTarget.getAttribute('aria-pressed') !== 'true';
  e.currentTarget.setAttribute('aria-pressed', on);
  $('#diagrams').classList.toggle('quiz-labels', on);
  e.currentTarget.lastChild.textContent = on ? 'Show the labels' : 'Test yourself: hide the labels';
});

// Figure 1 for the worksheet: Gondwana with fossil ranges, black and white.
function svgGondwana() {
  const ids = ['SA', 'AF', 'MG', 'IN', 'AN', 'AU'], t = 220;
  const pts = [];
  ids.forEach(id => CI[id].parts.forEach(p => p.forEach(q => pts.push(xf(q, CI[id], poseAt(CI[id], t))))));
  const minX = Math.min(...pts.map(p => p[0])) - 6, maxX = Math.max(...pts.map(p => p[0])) + 6, minY = Math.min(...pts.map(p => p[1])) - 6, maxY = Math.max(...pts.map(p => p[1])) + 6;
  const W = 520, k = W / (maxX - minX), H = (maxY - minY) * k;
  const X = v => ((v - minX) * k).toFixed(1), Y = v => ((maxY - v) * k).toFixed(1);
  const d = (arr, c) => 'M' + arr.map(q => { const r = xf(q, c, poseAt(c, t)); return X(r[0]) + ',' + Y(r[1]); }).join(' L') + 'Z';
  let s = `<svg class="dsvg mapfig" viewBox="0 0 ${W + 170} ${H.toFixed(0)}" role="img" aria-label="Map of Gondwana showing where Mesosaurus and Glossopteris fossils are found">`;
  s += `<defs><pattern id="hM" width="6" height="6" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><line x1="0" y1="0" x2="0" y2="6" stroke="#000" stroke-width="1.6"/></pattern>
    <pattern id="hG" width="7" height="7" patternUnits="userSpaceOnUse"><circle cx="3.5" cy="3.5" r="1.4" fill="#000"/></pattern></defs>`;
  ids.forEach(id => CI[id].parts.forEach(p => { s += `<path class="land" d="${d(p, CI[id])}" fill="#e6e6e6" stroke="#000" stroke-width="1"/>`; }));
  EV.glosso.items.forEach(it => { s += `<path d="${d(ellipse(...it.e), CI[it.c])}" fill="url(#hG)" stroke="#000" stroke-width=".6"/>`; });
  EV.meso.items.forEach(it => { s += `<path d="${d(ellipse(...it.e), CI[it.c])}" fill="url(#hM)" stroke="#000" stroke-width="1"/>`; });
  ids.forEach(id => { const c = CI[id]; if (!c.label) return; const q = xf(c.label, c, poseAt(c, t)); s += `<text x="${X(q[0])}" y="${Y(q[1])}" text-anchor="middle" style="font:700 12px var(--sst-font);fill:#000">${c.name}</text>`; });
  const kx = W + 20;
  s += `<rect x="${kx}" y="20" width="22" height="14" fill="url(#hM)" stroke="#000"/><text x="${kx + 30}" y="31" style="font:600 12px var(--sst-font);fill:#000">Mesosaurus</text>`;
  s += `<rect x="${kx}" y="46" width="22" height="14" fill="url(#hG)" stroke="#000"/><text x="${kx + 30}" y="57" style="font:600 12px var(--sst-font);fill:#000">Glossopteris</text>`;
  s += `<text x="${kx}" y="84" style="font:500 11px var(--sst-font);fill:#000">Continents shown in</text><text x="${kx}" y="98" style="font:500 11px var(--sst-font);fill:#000">their positions about</text><text x="${kx}" y="112" style="font:500 11px var(--sst-font);fill:#000">220 million years ago</text>`;
  return s + '</svg>';
}

/* ════════════════════════ 7. exam practice, worksheet, mark scheme ════════════════════════ */
const PEEL_TAG = { P: ['p', 'Point'], E1: ['e1', 'Evidence'], E2: ['e2', 'Explain'], L: ['l', 'Link'], C: ['c', 'Conclusion'] };
const EXAM = [
  { id: 'q1', marks: 4, q: 'Explain the process of sea-floor spreading.',
    scheme: 'Point marked: 1 mark for each valid point, with further marks for developing a point, up to 4.',
    points: [
      'Plates move apart at a constructive (divergent) boundary or mid-ocean ridge',
      '… driven by convection currents in the mantle / ridge push (development)',
      'Magma rises into the gap as the pressure falls',
      '… cools and solidifies to form new oceanic (basalt) crust (development)',
      'The new crust is pushed or carried away from the ridge on both sides',
      '… so the ocean widens over time, e.g. the Atlantic by about 2.5 cm a year (development)',
      'Rock gets older with distance from the ridge'
    ],
    no: 'Do not accept: "the plates melt", or "lava pushes the continents apart" with no reference to plates or a ridge.',
    model: [['P', 'Sea-floor spreading happens at <b>constructive plate boundaries</b> such as the Mid-Atlantic Ridge, where two plates move apart, driven by <b>convection currents</b> in the mantle. <span class="mk1">(1)</span>'],
            ['E1', 'As the plates separate, <b>magma rises</b> from the asthenosphere to fill the gap <span class="mk1">(1)</span> and <b>cools and solidifies to form new basaltic oceanic crust</b>. <span class="mk1">(1)</span>'],
            ['L', 'This new crust is pushed away from the ridge <b>on both sides</b> as more magma rises behind it, so the ocean floor widens over time: the Atlantic grows by about 2.5 cm a year. <span class="mk1">(1)</span>']] },
  { id: 'q2', marks: 3, q: 'Outline <b>two</b> pieces of evidence supporting Alfred Wegener\'s theory of continental drift.',
    scheme: '1 mark for each valid piece of evidence (max 2), plus 1 mark for developing either one with an example or what it shows. Max 3.',
    points: [
      'Identical fossils on continents now separated by oceans',
      'Matching rock types / mountain ranges across oceans',
      'Glacial deposits or striations in places that are now warm or tropical',
      'Coal deposits in Antarctica',
      'The jigsaw fit of the coastlines, e.g. South America and Africa',
      'Development: a named example and what it shows, e.g. Mesosaurus was a freshwater reptile that could not cross an ocean, so the continents were joined'
    ],
    no: 'Do not credit two examples of the same type of evidence as two pieces (e.g. Mesosaurus and Glossopteris both count as fossil evidence).',
    model: [['P', 'One piece of evidence is that <b>identical fossils are found on continents now separated by oceans</b>. <span class="mk1">(1)</span>'],
            ['E1', 'For example, <i>Mesosaurus</i>, a freshwater reptile, is found only in South America and southern Africa. It could not have swum across the salty Atlantic, so the continents must once have been joined. <span class="mk1">(1)</span>'],
            ['P', 'A second piece of evidence is that <b>coal deposits are found in Antarctica</b>. <span class="mk1">(1)</span> Coal only forms from warm, wet swamp forests, so Antarctica must once have been in a much warmer place and has since drifted.']] },
  { id: 'q3', marks: 8, spag: 4, long: true, q: '"Palaeomagnetism provides the most convincing evidence for plate tectonic movement."<br><em>Assess this statement.</em>',
    scheme: 'Levels-based. AO2 (understanding) 4 marks, AO3 (assessment) 4 marks. Plus 4 marks for spelling, punctuation, grammar and specialist terms.',
    levels: [['0', '0', 'No rewardable material.'],
             ['1', '1–2', 'Isolated knowledge with limited understanding. A simple judgement with little support.'],
             ['2', '3–5', 'Some accurate understanding of palaeomagnetism and at least one other piece of evidence, partly linked to the question. Some assessment of their strength, but it may be unbalanced. A judgement with partial support.'],
             ['3', '6–8', 'Accurate, detailed understanding of palaeomagnetism and a range of other evidence. A balanced assessment of how convincing each is, weighing strengths against limitations. A well-supported conclusion that answers "most convincing".']],
    spagBands: [['High', '4', 'Consistently accurate spelling and punctuation; meaning controlled; a wide range of specialist terms used precisely.'],
                ['Intermediate', '2–3', 'Considerable accuracy; general control of meaning; a good range of specialist terms.'],
                ['Threshold', '1', 'Reasonable accuracy; some specialist terms, with errors.']],
    points: [
      'For: the stripes are symmetrical either side of the ridge, which only spreading explains',
      'For: they show new crust forming at the ridge and moving outwards: the mechanism Wegener lacked',
      'For: measurable, physical evidence found at every ridge; it lets us calculate spreading rates',
      'Other evidence: radiometric dating and sediment thickness, rock older away from the ridge',
      'Other evidence: Wegener\'s fossils, matching rocks and mountains, glacial deposits and coal',
      'Other evidence: earthquakes and volcanoes along plate boundaries; GPS shows plates moving today',
      'Limitation: palaeomagnetism shows the sea floor spreading, not directly the continents moving',
      'A supported conclusion: most convincing historically, but strongest in combination / GPS is the most direct'
    ],
    model: [['P', 'Palaeomagnetism provides very convincing evidence for plate movement because it gives clear physical proof that new oceanic crust is being created at mid-ocean ridges and is moving outwards.'],
            ['E1', 'When basaltic magma erupts at a constructive boundary such as the Mid-Atlantic Ridge, iron-rich minerals like magnetite line up with Earth\'s magnetic field before the rock solidifies. Earth\'s field has reversed many times, most recently about 780,000 years ago, so the sea floor shows parallel stripes of normal and reversed polarity that are a perfect mirror image on either side of the ridge.'],
            ['E2', 'This symmetry is highly significant because no other process could produce an identical pattern on both sides of a ridge: it can only be explained if crust forms at the ridge and is carried away in both directions at the same rate. It therefore provided the <b>mechanism</b>, sea-floor spreading, that Wegener\'s 1912 theory lacked, and it is the main reason why plate tectonics was accepted in the 1960s.'],
            ['L', 'This strongly supports the statement, as palaeomagnetism changed continental drift from a hypothesis into an accepted theory.'],
            ['P', 'However, palaeomagnetism is not the only convincing evidence, and on its own it has limitations.'],
            ['E1', 'Radiometric dating of cores drilled by the <i>Glomar Challenger</i> showed that oceanic crust becomes progressively older away from the ridge, and that no ocean floor is older than about 180 million years. Wegener\'s evidence points the same way: <i>Mesosaurus</i> fossils appear only in South America and southern Africa, the Appalachians match the Scottish Highlands, and coal in Antarctica shows it was once much warmer.'],
            ['E2', 'Wegener\'s evidence shows that the continents were once joined, but on its own it was less convincing, because it could be explained away by "land bridges" and offered no driving force. In contrast, modern GPS measurements show plates moving a few centimetres each year in real time, which is arguably more direct than magnetic stripes, which record movement in the past.'],
            ['L', 'Therefore, although palaeomagnetism is extremely persuasive, other evidence is also strong, and the different lines of evidence support one another.'],
            ['C', 'Overall, I largely agree. Palaeomagnetism was the <b>most convincing evidence historically</b>, because its symmetrical stripes proved the sea floor was spreading and supplied the mechanism that fossil, geological and climatic evidence could not. However, GPS now offers the most direct proof of present-day movement, and the theory is most convincing because independent lines of evidence all agree.']] }
];

function examHTML() {
  return EXAM.map((e, i) => `<article class="q-card${e.long ? ' long' : ''}" data-q="${e.id}">
    <div class="q-head"><span class="q-num">${i + 1}</span><div class="q-text">${e.q}</div><span class="q-marks">${e.marks}${e.spag ? ' + ' + e.spag + ' SPaG' : ''} marks</span></div>
    <textarea aria-label="Your answer to question ${i + 1}" placeholder="Write your answer here…"></textarea>
    <div class="q-tools">
      <button class="btn" type="button" data-show="ms"><svg><use href="#i-check"/></svg>Mark scheme</button>
      <button class="btn" type="button" data-show="model"><svg><use href="#i-eye"/></svg>Model answer</button>
      <span class="wc">0 words</span>
    </div>
    <div class="reveal" data-part="ms" hidden>
      <h4>Mark scheme</h4><p>${e.scheme}</p>
      ${e.levels ? `<table class="levels"><thead><tr><th>Level</th><th>Marks</th><th>Descriptor</th></tr></thead><tbody>${e.levels.map(l => `<tr><td>${l[0]}</td><td>${l[1]}</td><td>${l[2]}</td></tr>`).join('')}</tbody></table>
        <h4 style="margin-top:12px">Tick what your answer covers (indicative content)</h4>` : '<h4 style="margin-top:8px">Tick each point you made</h4>'}
      <ul class="ms-list">${e.points.map(p => `<li><input type="checkbox"><span>${p}</span></li>`).join('')}</ul>
      <p class="ms-score"></p>
      ${e.spagBands ? `<h4 style="margin-top:12px">SPaG (4 marks)</h4><table class="levels"><tbody>${e.spagBands.map(l => `<tr><th>${l[0]}</th><td>${l[1]}</td><td>${l[2]}</td></tr>`).join('')}</tbody></table>` : ''}
      ${e.no ? `<p class="no-accept">${e.no}</p>` : ''}
    </div>
    <div class="reveal" data-part="model" hidden>
      <h4>Model answer${e.long ? ' (Level 3: 8/8 + 4/4 SPaG)' : ` (${e.marks}/${e.marks})`}</h4>
      <div class="peel-key"><span><span class="peel p">P</span>Point</span><span><span class="peel e1">E</span>Evidence</span><span><span class="peel e2">E</span>Explain</span><span><span class="peel l">L</span>Link</span>${e.long ? '<span><span class="peel c">C</span>Conclusion</span>' : ''}</div>
      <div class="model">${e.model.map(m => `<p><span class="peel ${PEEL_TAG[m[0]][0]}" title="${PEEL_TAG[m[0]][1]}">${m[0] === 'E1' || m[0] === 'E2' ? 'E' : m[0]}</span>${m[1]}</p>`).join('')}</div>
    </div>
  </article>`).join('');
}
$('#exList').innerHTML = examHTML();
$$('#exList .q-card').forEach(card => {
  const e = EXAM.find(x => x.id === card.dataset.q), ta = card.querySelector('textarea'), wc = card.querySelector('.wc');
  const count = () => { const n = (ta.value.match(/\S+/g) || []).length; wc.textContent = n + (n === 1 ? ' word' : ' words'); };
  ta.value = store('pt-ans-' + e.id) || ''; count();
  ta.addEventListener('input', () => { count(); store('pt-ans-' + e.id, ta.value); });
  card.querySelectorAll('[data-show]').forEach(b => b.addEventListener('click', () => {
    const r = card.querySelector(`[data-part="${b.dataset.show}"]`); r.hidden = !r.hidden; b.setAttribute('aria-pressed', !r.hidden);
  }));
  const score = card.querySelector('.ms-score');
  const upd = () => {
    const n = card.querySelectorAll('.ms-list input:checked').length;
    if (e.levels) {
      const lv = n === 0 ? 'Level 0' : n <= 2 ? 'Level 1 (1–2 marks)' : n <= 5 ? 'Level 2 (3–5 marks)' : 'Level 3 (6–8 marks), if balanced and with a supported conclusion';
      score.textContent = `${n} of ${e.points.length} areas covered: roughly ${lv}.`;
    } else score.textContent = `Points made: ${n}. Marks: ${Math.min(n, e.marks)} / ${e.marks}`;
  };
  card.querySelector('.ms-list').addEventListener('change', upd); upd();
});

// Printed worksheet: the three questions plus short warm-up parts and two figures.
const WS = [
  { stem: 'The Earth is made of layers.', parts: [
      { t: 'Which layer of the Earth is made of liquid iron and nickel? Tick <b>one</b> box.', marks: 1, opts: ['A  Crust', 'B  Mantle', 'C  Outer core', 'D  Inner core'],
        ms: ['C (outer core)'] },
      { t: EXAM[0].q, marks: 4, lines: 6, ms: EXAM[0].points, scheme: EXAM[0].scheme, no: EXAM[0].no, model: EXAM[0].model }] },
  { stem: 'Study Figure 1, a map of Gondwana showing where two types of fossil are found.', figure: () => svgGondwana(), cap: 'Figure 1: fossil evidence across Gondwana', parts: [
      { t: EXAM[1].q, marks: 3, lines: 5, ms: EXAM[1].points, scheme: EXAM[1].scheme, no: EXAM[1].no, model: EXAM[1].model },
      { t: 'Suggest <b>one</b> reason why most scientists rejected Wegener\'s theory when he proposed it.', marks: 2, lines: 3,
        ms: ['He could not explain the mechanism / what force moved the continents (1)', 'Development: his suggested forces (Earth\'s spin, tides) were far too weak; or he said continents ploughed through solid ocean crust, which was impossible (1)', 'Also accept: he was a meteorologist, not a geologist (1), so geologists did not trust his ideas (1); or land bridges explained the fossils instead (1+1)'],
        scheme: '1 mark for a valid reason, 1 for development. Max 2.' }] },
  { stem: 'Study Figure 2, a cross-section of the ocean floor at a mid-ocean ridge.', figure: () => svgSpreading({ ages: true, markX: 3.5, bare: true }), cap: 'Figure 2: magnetic stripes either side of a mid-ocean ridge', parts: [
      { t: 'Using Figure 2, identify the age of the rock at <b>X</b>.', marks: 1, lines: 1, ms: ['3.5 million years (accept 3–4 million years)'] },
      { t: 'Describe the pattern of magnetic stripes shown in Figure 2.', marks: 2, lines: 3,
        ms: ['Stripes of normal and reversed polarity alternate (1)', 'The pattern is symmetrical / a mirror image either side of the ridge (1)', 'Also accept: stripes run parallel to the ridge; stripes vary in width; rock gets older away from the ridge (1 each)'],
        scheme: '1 mark per valid descriptive point. Max 2. Explanation is not required.' },
      { t: EXAM[2].q, marks: 8, spag: 4, lines: 22, long: true, ms: EXAM[2].points, scheme: EXAM[2].scheme, levels: EXAM[2].levels, spagBands: EXAM[2].spagBands, model: EXAM[2].model }] }
];
function buildPrint() {
  const total = WS.reduce((s, q) => s + q.parts.reduce((a, p) => a + p.marks + (p.spag || 0), 0), 0);
  const mk = p => `[${p.marks}${p.spag ? ' + ' + p.spag + ' SPaG' : ''}]`;
  $('#pQList').innerHTML = WS.map((q, i) => `<div class="q">
      <div class="qt"><span class="qn">${i + 1}</span><div>${q.stem}</div></div>
      ${q.figure ? `<figure>${q.figure()}<figcaption>${q.cap}</figcaption></figure>` : ''}
      ${q.parts.map((p, j) => `<div class="part${p.long ? ' long' : ''}"><div class="qt"><span>(${'abc'[j]})</span><span>${p.t}</span><span class="mk">${mk(p)}</span></div>
        ${p.opts ? `<div class="opts">${p.opts.map(o => `<span>${o}</span>`).join('')}</div>` : ''}
        ${p.lines ? `<div class="lines">${'<i></i>'.repeat(p.lines)}</div>` : ''}</div>`).join('')}
    </div>`).join('');
  $('#pMsList').innerHTML = WS.map((q, i) => `<div class="mq"><b>Question ${i + 1}</b></div>` + q.parts.map((p, j) => `<div class="mq"><span class="pm">${mk(p)}</span><b>${i + 1}(${'abc'[j]})</b> ${p.scheme ? `<span>${p.scheme}</span>` : ''}
      ${p.levels ? `<table class="levels"><tr><th>Level</th><th>Marks</th><th>Descriptor</th></tr>${p.levels.map(l => `<tr><td>${l[0]}</td><td>${l[1]}</td><td>${l[2]}</td></tr>`).join('')}</table><p><b>Indicative content</b></p>` : ''}
      <ul>${p.ms.map(m => `<li>${m}</li>`).join('')}</ul>
      ${p.spagBands ? `<table class="levels"><tr><th>SPaG</th><th>Marks</th><th>Descriptor</th></tr>${p.spagBands.map(l => `<tr><td>${l[0]}</td><td>${l[1]}</td><td>${l[2]}</td></tr>`).join('')}</table>` : ''}
      ${p.no ? `<p class="no">${p.no}</p>` : ''}
      ${p.model ? `<p><b>Model answer</b></p><div class="model">${p.model.map(m => `<p><span class="peel">${m[0] === 'E1' || m[0] === 'E2' ? 'E' : m[0]}</span>${m[1]}</p>`).join('')}</div>` : ''}
    </div>`).join('')).join('');
  $('#wsTotal').textContent = total; $('#msTotal').textContent = total;
  $('#pCardBody').innerHTML = `
    <div class="pgrid">
      <div class="pbox"><h4>The structure of the Earth</h4><table>
        <tr><th>Layer</th><th>State</th><th>Facts</th></tr>
        <tr><td>Crust</td><td>Solid</td><td>Oceanic 5–10 km basalt (dense); continental 25–70 km granite</td></tr>
        <tr><td>Mantle</td><td>Mostly solid</td><td>2,900 km; asthenosphere semi-molten, flows</td></tr>
        <tr><td>Outer core</td><td>Liquid</td><td>Iron and nickel, 4,000–5,000°C; makes the magnetic field</td></tr>
        <tr><td>Inner core</td><td>Solid</td><td>Iron and nickel, ≈5,500°C; solid due to pressure</td></tr></table>
        <p><b>Convection:</b> heat from the core (radioactive decay) → hot rock rises → spreads under plates, friction drags them → cools, sinks → reheated. Also <b>slab pull</b> and <b>ridge push</b>.</p></div>
      <div class="pbox"><h4>Pangaea and continental drift</h4><ul>
        <li><b>300 Ma</b> Pangaea, surrounded by Panthalassa</li><li><b>200 Ma</b> rifting; central Atlantic opens</li>
        <li><b>180 Ma</b> Laurasia (N) and Gondwana (S)</li><li><b>130 Ma</b> South America leaves Africa</li>
        <li><b>50 Ma</b> India hits Asia: Himalayas</li><li><b>Today</b> Atlantic widens ≈2.5 cm a year</li></ul>
        <p><b>Wegener (1912)</b>: jigsaw fit; <b>fossils</b> (<i>Mesosaurus</i>, <i>Glossopteris</i>); <b>geology</b> (Appalachians = Scottish Highlands); <b>climate</b> (glacial deposits in India and Africa, coal in Antarctica). <b>Rejected</b>: no mechanism.</p></div>
    </div>
    <div class="pbox"><h4>Palaeomagnetism: six steps</h4><ul>
      <li><b>1</b> Plates move apart at a mid-ocean ridge; basalt magma rises into the gap.</li>
      <li><b>2</b> Iron minerals (magnetite) line up with Earth's magnetic field while the lava is hot.</li>
      <li><b>3</b> The lava cools and hardens, locking in that direction.</li>
      <li><b>4</b> Earth's field reverses at irregular intervals (last full reversal ≈780,000 years ago).</li>
      <li><b>5</b> New rock is carried away on both sides as more magma rises.</li>
      <li><b>6</b> Stripes of normal and reversed polarity form a <b>mirror image</b> either side of the ridge. Rock is youngest at the ridge; no ocean floor is older than ≈180 million years. Found by Tharp and Heezen (mapping), Hess (1962, sea-floor spreading), Vine and Matthews (1963, stripes).</li></ul></div>
    <div class="pgrid">
      <div class="pbox"><figure>${svgSpreading()}</figure></div>
      <div class="pbox"><figure>${svgConvection()}</figure></div>
    </div>`;
}
buildPrint();

/* ════════════════════════ 8. presenter mode, printing, keys, main loop ════════════════════════ */
function setPresenting(on) {
  document.body.classList.toggle('presenting', on);
  measureType();
  if (on && view === 'ex') showTab($('#tab-st'));
  if (!on && document.fullscreenElement) document.exitFullscreen().catch(() => {});
  (on ? $('#exitBtn') : $('#presentBtn')).focus({ preventScroll: true });
}
$('#presentBtn').addEventListener('click', () => setPresenting(true));
$('#exitBtn').addEventListener('click', () => setPresenting(false));
$('#fullBtn').addEventListener('click', () => {
  if (document.fullscreenElement) document.exitFullscreen().catch(() => {});
  else if (document.documentElement.requestFullscreen) document.documentElement.requestFullscreen().catch(() => {});
});
// The shared annotation layer (assets/sst/annotate.js) adds its own button to the site bar; these open it too.
function annotate() { const b = document.querySelector('.sst-ink-nav') || document.querySelector('.sst-ink-fab'); if (b) b.click(); }
$('#drawBtn').addEventListener('click', annotate);
$('#drawBtn2').addEventListener('click', annotate);

const dlg = $('#printDlg');
$('#printBtn').addEventListener('click', () => dlg.showModal());
$('#pCancel').addEventListener('click', () => dlg.close());
$('#pGo').addEventListener('click', () => {
  const b = document.body.classList;
  if (!$('#pOptCard').checked && !$('#pOptWs').checked && !$('#pOptMs').checked) return;
  b.toggle('p-no-card', !$('#pOptCard').checked); b.toggle('p-no-ws', !$('#pOptWs').checked); b.toggle('p-ms', $('#pOptMs').checked);
  dlg.close();
  setTimeout(() => window.print(), 50);
});
window.addEventListener('afterprint', () => document.body.classList.remove('p-no-card', 'p-no-ws', 'p-ms'));

document.addEventListener('keydown', e => {
  if (e.target.closest('input, select, textarea, dialog') || e.ctrlKey || e.altKey || e.metaKey) return;
  const k = e.key.toLowerCase();
  if (k === 'escape' && presenting()) setPresenting(false);
  else if (k === 'p') setPresenting(!presenting());
  else if (k === ' ' && view === 'sf') { e.preventDefault(); $('#sfPlay').click(); }
});
document.addEventListener('sst-theme', () => { setPal(); paintLayerDots(); });
window.addEventListener('resize', measureType);

let last = performance.now();
function frame(now) {
  const dt = Math.min(.1, (now - last) / 1000); last = now;
  sfTick(dt);
  if (view === 'st') stDraw(dt);
  else if (view === 'pg') mapDraw(PG, dt);
  else if (view === 'wg') mapDraw(WG, dt);
  else if (view === 'sf') sfDraw(dt, now);
  requestAnimationFrame(frame);
}
const saved = store('pt-tab');
if (saved && $('#tab-' + saved)) showTab($('#tab-' + saved));
if (window.SST_PRESENT) SST_PRESENT.deck($('#pgDeck'));
PG.sync();
if (location.hash === '#present') setTimeout(() => setPresenting(true), 300);
requestAnimationFrame(frame);
})();
