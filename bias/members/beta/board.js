/* Bias beta games: the dartboard and the caller, shared by the games in this folder (darts, round the clock).
   play.js loads this ahead of a game. The game reads window.BiasBoard, and calls setup(api) from its install().
   Everything is painted in metres on the Bias green: the board's centre 27 m from the front of the mat, 5 m out to the double. */
(function () {
'use strict';
const DEG = Math.PI / 180, TAU = Math.PI * 2;
const B = { x: 0, y: 29.6, R: 5.0, NUM: 5.42, EDGE: 5.85 };
// ring radii as fractions of the double's outer edge, from a regulation board (170 mm to the outer wire)
const RF = { bull: 6.35 / 170, outer: 15.9 / 170, t0: 99 / 170, t1: 107 / 170, d0: 162 / 170, d1: 1 };
const ORDER = [20, 1, 18, 4, 13, 6, 10, 15, 2, 17, 3, 19, 7, 16, 8, 11, 14, 9, 12, 5];   // clockwise from the top
const PAINT = { black: '#1d201e', cream: '#e6dcbc', red: '#c0352f', green: '#1f8a4c', wire: 'rgba(238,234,220,.9)', num: '#f4f1e6' };
const COL = [{ id: 'dv-blue', name: 'Blue', hex: '#2f7fe0', puzzle: true }, { id: 'dv-amber', name: 'Amber', hex: '#f0a020', puzzle: true }];
let E = null;

// ---------------- the board ----------------
/* What a wood scores, from where its centre lies. n: the number (25 for the bull), m: 1 single, 2 double, 3 treble */
function hitAt(x, y) {
  const dx = x - B.x, dy = y - B.y, r = Math.hypot(dx, dy) / B.R;
  if (r <= RF.bull) return { n: 25, m: 2, pts: 50, dbl: true, name: 'Bull', short: 'Bull' };
  if (r <= RF.outer) return { n: 25, m: 1, pts: 25, dbl: false, name: 'Outer bull', short: '25' };
  if (r > RF.d1) return { n: 0, m: 0, pts: 0, dbl: false, name: 'Off the board', short: 'Miss' };
  const a = Math.atan2(dx, dy) / DEG, n = ORDER[Math.floor((((a + 9) % 360) + 360) % 360 / 18)];
  const m = r >= RF.d0 ? 2 : r >= RF.t0 && r <= RF.t1 ? 3 : 1;
  return { n, m, pts: n * m, dbl: m === 2, name: (m === 2 ? 'Double ' : m === 3 ? 'Treble ' : '') + n, short: (m === 2 ? 'D' : m === 3 ? 'T' : '') + n };
}
function hitOf(b) { return !b || b.dead || b.state === 'ditch' ? { n: 0, m: 0, pts: 0, dbl: false, name: b && b.state === 'ditch' ? 'In the ditch' : 'Off the board', short: 'Miss' } : hitAt(b.x, b.y); }

/* Paints the board in metres, in the end's frame, wherever the transform puts them: +y must be up the green
   (away from the mat) as the bowler sees it. px: pixels per metre, for the wires and the lettering. */
function paintBoard(g, px, opts = {}) {
  const R = B.R, sector = (r0, r1, a0, a1) => {   // a: degrees clockwise from the top; canvas angle = 90° − a
    g.beginPath(); g.arc(B.x, B.y, r1, (90 - a0) * DEG, (90 - a1) * DEG, true); g.arc(B.x, B.y, r0, (90 - a1) * DEG, (90 - a0) * DEG, false); g.closePath(); g.fill();
  };
  const disc = (r, c) => { g.fillStyle = c; g.beginPath(); g.arc(B.x, B.y, r, 0, TAU); g.fill(); };
  g.save();
  if (opts.alpha != null) g.globalAlpha = opts.alpha;
  for (let i = 0; i < 20; i++) {
    const a0 = i * 18 - 9, a1 = a0 + 18, dark = i % 2 === 0;
    g.fillStyle = dark ? PAINT.black : PAINT.cream; sector(RF.outer * R, RF.t0 * R, a0, a1); sector(RF.t1 * R, RF.d0 * R, a0, a1);
    g.fillStyle = dark ? PAINT.red : PAINT.green; sector(RF.t0 * R, RF.t1 * R, a0, a1); sector(RF.d0 * R, R, a0, a1);
  }
  disc(RF.outer * R, PAINT.green); disc(RF.bull * R, PAINT.red);
  // the wires, as thin white lines
  const lw = Math.max(1 / px, 0.018);
  g.strokeStyle = PAINT.wire; g.lineWidth = lw;
  for (const f of [RF.outer, RF.t0, RF.t1, RF.d0, RF.d1]) { g.beginPath(); g.arc(B.x, B.y, f * R, 0, TAU); g.stroke(); }
  g.beginPath(); g.arc(B.x, B.y, RF.bull * R, 0, TAU); g.stroke();
  g.beginPath();
  for (let i = 0; i < 20; i++) { const a = (i * 18 - 9) * DEG, s = Math.sin(a), c = Math.cos(a); g.moveTo(B.x + s * RF.outer * R, B.y + c * RF.outer * R); g.lineTo(B.x + s * R, B.y + c * R); }
  g.stroke();
  // the numbers, painted on the grass round the outside, upright for the bowler
  if (opts.numbers !== false && 0.5 * px >= 5) {
    g.fillStyle = PAINT.num; g.textAlign = 'center'; g.textBaseline = 'middle';
    for (let i = 0; i < 20; i++) {
      const a = i * 18 * DEG, x = B.x + Math.sin(a) * B.NUM, y = B.y + Math.cos(a) * B.NUM;
      g.save(); g.translate(x, y); g.scale(1 / px, -1 / px); g.font = `800 ${(0.5 * px).toFixed(1)}px "Plus Jakarta Sans",system-ui,sans-serif`;
      g.fillText(String(ORDER[i]), 0, 0); g.restore();
    }
  }
  g.restore();
}
/* A wood in the head view, drawn as a dart stuck in the board at its centre, the point that scores: the tip
   on the spot, the flight trailing back toward the mat, in the player's colour. A wood in the ditch shows nothing. */
function drawDart(g, A, b) {
  if (b.state === 'ditch') return;
  const a = 0.45 + 0.35 * Math.sin((b.id || 1) * 2.39), c = Math.cos(a), s = Math.sin(a);   // a slightly different lean for each dart
  g.save(); g.translate(A.x, A.y); g.transform(s, c, -c, s, 0, 0);   // +x runs from the tip back along the dart
  g.save(); g.translate(1.6, 1.6); g.globalAlpha *= 0.35; g.fillStyle = '#000'; g.fillRect(2, -1.5, 22, 3); g.restore();   // shadow
  g.strokeStyle = '#2a2a2a'; g.lineWidth = 1; g.beginPath(); g.moveTo(0, 0); g.lineTo(4, 0); g.stroke();   // point
  g.fillStyle = '#c9ccd0'; g.fillRect(4, -1.6, 9, 3.2); g.fillStyle = 'rgba(0,0,0,.35)'; for (let k = 6; k < 13; k += 2) g.fillRect(k, -1.6, 0.8, 3.2);   // knurled barrel
  g.strokeStyle = '#ececec'; g.lineWidth = 1.2; g.beginPath(); g.moveTo(13, 0); g.lineTo(20, 0); g.stroke();   // shaft
  g.fillStyle = b.colour; g.strokeStyle = 'rgba(255,255,255,.85)'; g.lineWidth = 0.8;
  g.beginPath(); g.moveTo(17, 0); g.lineTo(21, -5); g.lineTo(27, -5); g.lineTo(26, 0); g.lineTo(27, 5); g.lineTo(21, 5); g.closePath(); g.fill(); g.stroke();   // flight
  g.restore();
  g.fillStyle = '#fff'; g.beginPath(); g.arc(A.x, A.y, 1.6, 0, TAU); g.fill();   // the point, white so it shows on black
  g.strokeStyle = '#111'; g.lineWidth = 0.8; g.stroke();
}
// A sharp copy for the WebGL view: a square canvas round the board, about 5.6 mm a pixel, lightly grained like paint on turf.
function decal() {
  const H = B.EDGE, N = 2048, s = 2 * H / N, c = document.createElement('canvas'); c.width = c.height = N;
  const g = c.getContext('2d');
  g.setTransform(1 / s, 0, 0, 1 / s, (H - B.x) / s, (H - B.y) / s);   // canvas rows run up the green, as the ground texture's do
  paintBoard(g, 1 / s);
  const id = g.getImageData(0, 0, N, N), d = id.data; let seed = 1897;
  const rnd = () => { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296; };
  for (let i = 0; i < d.length; i += 4) if (d[i + 3]) { const k = 0.9 + 0.16 * rnd(); d[i] *= k; d[i + 1] *= k; d[i + 2] *= k; d[i + 3] *= 0.94; }
  g.putImageData(id, 0, 0);
  return { canvas: c, x: B.x, y: B.y, w: 2 * H, h: 2 * H };
}

// ---------------- the caller ----------------
/* Big words across the middle of the screen, as the caller says them: "Eleanor, you require 32",
   "Game shot, and the first leg, to Thomas", and a roaring 180. */
const CALL_CSS = `
#dCall{position:absolute;left:0;right:0;top:40%;z-index:15;pointer-events:none;text-align:center;opacity:0;padding:0 16px;
  font-family:'Bangers','Impact','Arial Black',system-ui,sans-serif;color:#fff4d6;transform:translateY(-50%)}
#dCall .l{display:block;font-size:clamp(20px,4.4vw,40px);line-height:1.15;letter-spacing:.06em;text-shadow:0 3px 0 #6e1a16,0 8px 22px rgba(0,0,0,.65)}
#dCall .b{display:block;font-size:clamp(58px,13vw,150px);line-height:1.02;color:#ffd23f;-webkit-text-stroke:3px #6e1a16;paint-order:stroke fill;
  text-shadow:0 6px 0 #6e1a16,0 14px 34px rgba(0,0,0,.6)}
#dCall.mega .b{font-size:clamp(110px,30vw,320px);color:#ff4b3a;-webkit-text-stroke:5px #fff1c4;text-shadow:0 8px 0 #5a1210,0 0 60px rgba(255,210,63,.9)}
#dCall.show{animation:dCallIn var(--dur,3s) ease both}
#dCall.mega.show .b{animation:dCallPulse .42s ease-in-out infinite alternate}
@keyframes dCallIn{0%{opacity:0;transform:translateY(-50%) scale(.55)}9%{opacity:1;transform:translateY(-50%) scale(1.08)}15%{transform:translateY(-50%) scale(1)}86%{opacity:1}100%{opacity:0;transform:translateY(-50%) scale(1.03)}}
@keyframes dCallPulse{from{transform:scale(1) rotate(-1.5deg)}to{transform:scale(1.1) rotate(1.5deg)}}
@media (prefers-reduced-motion:reduce){#dCall.mega.show .b{animation:none}}`;
let callTimer = 0;
function call(lines, o = {}) {   // lines: [text, 'l' small | 'b' big]
  const el = E.$('dCall'), dur = o.dur || 3;
  el.innerHTML = lines.map(([t, k]) => `<span class="${k}">${E.esc(t)}</span>`).join('');
  el.classList.remove('show', 'mega'); void el.offsetWidth;
  el.style.setProperty('--dur', (E.reduced() ? Math.min(dur, 2.4) : dur) + 's');
  el.classList.toggle('mega', !!o.mega); el.classList.add('show');
  clearTimeout(callTimer); callTimer = setTimeout(() => el.classList.remove('show', 'mega'), dur * 1000 + 50);
  E.UI.announce(lines.map(l => l[0]).join(' '));
}
/* A crowd's cheer, made like the game's other sounds: a swelling roar, a dozen voices whooping up and
   falling away through open vowels, and the full applause on top. */
function cheer() {
  const S = E.Sound; if (!S.ctx || S.muted || !S.white) return;
  const c = S.ctx, t0 = c.currentTime + .05;
  const roar = c.createBufferSource(), rb = c.createBiquadFilter(), rg = c.createGain();
  roar.buffer = S.white; roar.loop = true; rb.type = 'bandpass'; rb.frequency.value = 850; rb.Q.value = .6;
  rg.gain.setValueAtTime(0.0001, t0); rg.gain.exponentialRampToValueAtTime(.16, t0 + .35); rg.gain.setTargetAtTime(.09, t0 + .9, .6); rg.gain.setTargetAtTime(0.0001, t0 + 2.6, .5);
  roar.connect(rb); rb.connect(rg); rg.connect(S.master); roar.start(t0); roar.stop(t0 + 5);
  const n = 14, vol = 0.07 / Math.sqrt(n);
  for (let k = 0; k < n; k++) {
    const st = t0 + Math.random() * .45, dur = 1.1 + Math.random() * 1.1, f = 170 + Math.random() * 260;
    const o = c.createOscillator(), lfo = c.createOscillator(), lg = c.createGain(), g = c.createGain(), pan = c.createStereoPanner ? c.createStereoPanner() : null;
    o.type = 'sawtooth'; o.frequency.setValueAtTime(f, st); o.frequency.exponentialRampToValueAtTime(f * (1.3 + Math.random() * .3), st + .22); o.frequency.exponentialRampToValueAtTime(f * .9, st + dur);
    lfo.frequency.value = 5 + Math.random() * 2; lg.gain.value = f * .025; lfo.connect(lg); lg.connect(o.frequency);
    g.gain.setValueAtTime(0.0001, st); g.gain.exponentialRampToValueAtTime(vol, st + .08); g.gain.setTargetAtTime(0.0001, st + dur * .6, dur * .25);
    o.connect(g);   // the voice is heard only through its two vowel formants
    for (const [fq, q, a] of [[700 + Math.random() * 150, 6, 1], [1150 + Math.random() * 200, 7, .6]]) { const bp = c.createBiquadFilter(), bg = c.createGain(); bp.type = 'bandpass'; bp.frequency.value = fq; bp.Q.value = q; bg.gain.value = a * 4; g.connect(bp); bp.connect(bg); bg.connect(pan || S.master); }
    if (pan) { pan.pan.value = Math.random() * 1.6 - .8; pan.connect(S.master); }
    o.start(st); o.stop(st + dur + 1); lfo.start(st); lfo.stop(st + dur + 1);
  }
  S.applause(2, 24);
}

// ---------------- the computer ----------------
/* The computer's plan for a wood. It picks the spot on the board worth most to it, given how far its woods scatter:
   across the line from its aim (about 27 m × its line error), along it from its weight (about 35 m of run for the whole
   draw band × its weight error). worth(h) scores a hit h; prof is the bowler's profile. It then draws to the spot as the
   game's computer draws to the jack. */
function* aiSpot(prof, L, T, arm, worth) {
  const g = E.game, sx = 27 * L.aimSD * DEG, sy = 35 * L.wSD * (T / 13), noise = [];
  for (let k = 0; k < 140; k++) noise.push([E.aiGauss() * sx, E.aiGauss() * sy]);
  const spots = [{ x: B.x, y: B.y }];
  const rings = [(RF.outer + RF.t0) / 2, (RF.t0 + RF.t1) / 2, (RF.t1 + RF.d0) / 2, (RF.d0 + RF.d1) / 2];
  for (let i = 0; i < 20; i++) for (const f of rings) { const a = i * 18 * DEG; spots.push({ x: B.x + Math.sin(a) * f * B.R, y: B.y + Math.cos(a) * f * B.R }); }
  let best = null;
  for (let i = 0; i < spots.length; i++) {
    const s = spots[i]; let sum = 0;
    for (const [nx, ny] of noise) sum += worth(hitAt(s.x + nx, s.y + ny));
    s.v = sum / noise.length; if (!best || s.v > best.v) best = s;
    if (i % 12 === 11) yield;
  }
  const hand = L.tactics === 0 ? (E.aiRand() < 0.65 ? 'fore' : 'back') : best.x > 0.5 ? 'back' : best.x < -0.5 ? 'fore' : (E.aiRand() < 0.5 ? 'fore' : 'back');
  const rel = E.releasePoint(g.matRear, hand, arm), sol = E.AI.solveDraw(prof, T, E.biasSide(hand, arm), rel, best); yield;
  return { hand, aim: sol.aim, weight: E.meterFor(sol.speed) };
}

// ---------------- setup ----------------
// Once per page, from a game's install(): the game's api, its colours on the scoreboard, and the caller's element and lettering
function setup(api) {
  E = api;
  for (const c of COL) if (!E.COLOURS.some(x => x.id === c.id)) E.COLOURS.push(c);
  document.getElementById('app').insertAdjacentHTML('beforeend', '<div id="dCall" aria-hidden="true"></div>');
  const css = document.createElement('style'); css.textContent = CALL_CSS; document.head.appendChild(css);
  const font = document.createElement('link'); font.rel = 'stylesheet'; font.href = 'https://fonts.googleapis.com/css2?family=Bangers&display=swap'; document.head.appendChild(font);   // the caller's lettering (Impact if it cannot load)
}

window.BiasBoard = { B, COL, hitAt, hitOf, paintBoard, drawDart, decal, call, cheer, aiSpot, setup };
})();
