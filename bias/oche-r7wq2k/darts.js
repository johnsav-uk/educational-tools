/* Bias darts: 501, double out, played with woods on the Bias green.
   An unlisted page (index.html beside this file) loads the game with this script ahead of it.
   The game finds window.BiasVariant and hands it the green: same physics, same release, same bowls.
   A board 10 m across (to the outside of the double) is painted on the green; each player bowls three
   woods a visit; the woods are scored where they all lie once the visit is over, by where each wood's
   centre rests; to check out, the visit must take the score exactly to nothing with a wood on a double
   (or the bull). A wood in the ditch, or off the board, scores nothing. */
(function () {
'use strict';
const DEG = Math.PI / 180, TAU = Math.PI * 2;
// the board: centre 27 m from the front of the mat (the game's nominal length), double ring 5 m out
const B = { x: 0, y: 29.6, R: 5.0, NUM: 5.42, EDGE: 5.85 };
// ring radii as fractions of the double's outer edge, from a regulation board (170 mm to the outer wire)
const RF = { bull: 6.35 / 170, outer: 15.9 / 170, t0: 99 / 170, t1: 107 / 170, d0: 162 / 170, d1: 1 };
const ORDER = [20, 1, 18, 4, 13, 6, 10, 15, 2, 17, 3, 19, 7, 16, 8, 11, 14, 9, 12, 5];   // clockwise from the top
const PAINT = { black: '#1d201e', cream: '#e6dcbc', red: '#c0352f', green: '#1f8a4c', wire: 'rgba(238,234,220,.9)', num: '#f4f1e6' };
const COL = [{ id: 'dv-blue', name: 'Blue', hex: '#2f7fe0', puzzle: true }, { id: 'dv-amber', name: 'Amber', hex: '#f0a020', puzzle: true }];
const START = 501;

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

// ---------------- checkouts ----------------
const SEGS = (() => {
  const out = [];
  for (let n = 20; n >= 1; n--) out.push({ s: 'T' + n, v: 3 * n, d: false });
  out.push({ s: 'Bull', v: 50, d: true }, { s: '25', v: 25, d: false });
  for (let n = 20; n >= 1; n--) out.push({ s: 'D' + n, v: 2 * n, d: true });
  for (let n = 20; n >= 1; n--) out.push({ s: String(n), v: n, d: false });
  return out;
})();
const DOUBLES = [20, 16, 10, 8, 18, 12, 14, 6, 4, 2, 19, 17, 15, 13, 11, 9, 7, 5, 3, 1].map(n => ({ s: 'D' + n, v: 2 * n })).concat([{ s: 'Bull', v: 50 }]);
// a route to finish `need` in at most `woods` woods, last on a double, or null
function checkout(need, woods) {
  if (need < 2 || need > 170 || woods < 1) return null;
  for (let k = 1; k <= woods; k++) for (const last of DOUBLES) {
    const rest = need - last.v;
    if (k === 1 && rest === 0) return [last.s];
    if (k === 2) for (const a of SEGS) if (a.v === rest) return [a.s, last.s];
    if (k === 3) for (const a of SEGS) for (const b of SEGS) if (a.v + b.v === rest && a.v >= b.v) return [a.s, b.s, last.s];
  }
  return null;
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
const ORD = ['first', 'second', 'third', 'fourth', 'fifth'];

// ---------------- the game ----------------
let E = null, cfg = null, st = null;
const P = () => E.game.players;
const name = i => P()[i].name;
function visitScore() {
  const list = st.visit.map(hitOf), total = list.reduce((a, h) => a + h.pts, 0);
  return { list, total, dbl: list.some(h => h.dbl) };
}
function hintFor(i) {
  if (!st) return '';
  const onVisit = st.player === i && !st.settled ? visitScore().total : 0;
  const woods = st.player === i ? 3 - P()[i].played : 3, r = checkout(st.rem[i] - onVisit, woods);
  return r ? r.join(' · ') : '';
}
const Darts = {
  begin() {
    st = { legsToWin: cfg.legs, legs: [0, 0], rem: [START, START], leg: 1, starter: 0, player: 0, visit: [], scored: [0, 0], thrown: [0, 0], over: false };
    this.startLeg(0);
  },
  startLeg(p) {
    st.rem = [START, START]; st.starter = p;
    this.startVisit(p, true);
  },
  startVisit(p, first) {
    const g = E.game;
    for (const b of g.world.bodies.slice()) if (b.kind === 'bowl') g.world.remove(b);
    g.trace = []; g.effects = []; g.drops.clear(); g.delivered = null;
    P().forEach(pl => { pl.played = 0; pl.members[0].played = 0; });
    st.player = p; st.visit = []; st.settled = false; st.opening = !!first;
    g.beginBowl(p, 0);
  },
  label() { return st.legsToWin > 1 ? `Leg ${st.leg} · first to ${st.legsToWin}` : 'Bias darts · 501'; },
  banner(p) {
    const left = 3 - P()[p].played, v = visitScore().total, need = st.rem[p] - v, co = hintFor(p);
    if (st.opening) { st.opening = false; E.UI.banner(this.label(), name(p), 'throws first · 501, finish on a double'); return; }
    if (P()[p].played === 0 && checkout(st.rem[p], 3)) { E.UI.clearBanner(); call([[`${name(p)}, you require`, 'l'], [String(st.rem[p]), 'b']], { dur: 3.2 }); return; }
    E.UI.banner(this.label(), name(p), `${need} to get · ${left} wood${left === 1 ? '' : 's'} to throw` + (co ? ` · ${co}` : ''));
  },
  resolveBowl() {
    const g = E.game, p = st.player, pl = P()[p], d = g.delivered;
    pl.played++; pl.members[0].played++; st.thrown[p]++;
    if (d) st.visit.push(d);
    g.phase = 'between';
    const h = hitOf(d), s = visitScore();
    const moved = st.visit.length > 1 && st.prev && st.prev !== s.list.slice(0, -1).map(x => x.short).join(',');
    st.prev = s.list.map(x => x.short).join(',');
    E.UI.toast(`${name(p)}: ${h.name}${h.m > 1 || h.n === 25 ? ' · ' + h.pts : ''}${moved ? ' · and a wood knocked on' : ''} · this visit ${s.total}`, h.pts ? 'good' : 'warn');
    if (h.n === 25 && h.m === 2 || h.m === 3 && h.n >= 17) g.reward(2, d); else if (h.m >= 2 || h.n === 25) g.reward(1, d);
    E.UI.refresh();
    if (s.total === st.rem[p] && s.dbl) { g.after(1.0, () => this.legWon(p)); return; }
    if (pl.played >= 3) { g.after(1.3, () => this.endVisit()); return; }
    g.after(1.2, () => g.beginBowl(p, 0));
  },
  endVisit() {
    const g = E.game, p = st.player, s = visitScore(), rem = st.rem[p], list = s.list.map(h => h.short).join(', ');
    const why = s.total > rem ? `${s.total} is more than the ${rem} needed` : rem - s.total === 1 ? 'that would leave 1, which no double can finish'
      : s.total === rem && !s.dbl ? 'the finish needs a wood on a double' : null;
    let title, desc;
    const max = !why && s.total === 180;
    if (max) { call([['One hundred and eighty!', 'l'], ['180', 'b']], { mega: true, dur: 5 }); cheer(); }
    if (why) { title = `${name(p)}: bust`; desc = `${list}: ${why}. Still ${rem} to get.`; E.Sound.chime(false); }
    else { st.rem[p] -= s.total; st.scored[p] += s.total; title = `${name(p)} scores ${s.total}`; const co = checkout(st.rem[p], 3); desc = `${list}. ${st.rem[p]} left${co ? ` · checkout ${co.join(' · ')}` : ''}.`; }
    st.prev = null; st.settled = true;
    E.UI.refresh();
    g.promptNotice(title, desc, `${name(1 - p)} to throw`, () => this.startVisit(1 - p), !max);   // a 180 waits to be enjoyed
  },
  legWon(p) {
    const g = E.game, s = visitScore(), list = s.list.map(h => h.short).join(', ');
    st.scored[p] += st.rem[p]; st.rem[p] = 0; st.legs[p]++; st.prev = null; st.settled = true;
    const avg = i => st.thrown[i] ? (st.scored[i] / st.thrown[i] * 3).toFixed(1) : '–';
    E.UI.refresh();
    const match = st.legs[p] >= st.legsToWin;
    call([['Game shot', 'l'], [match ? 'and the match to' : `and the ${ORD[st.leg - 1] || 'next'} leg to`, 'l'], [name(p), 'b']], { dur: match ? 5 : 3.6 });
    E.Sound.chime(true);
    if (match) cheer(); else E.Sound.applause(2, 10);
    if (match) {
      st.over = true;
      const score = st.legsToWin > 1 ? ` ${st.legs[p]}–${st.legs[1 - p]}` : '';
      g.promptNotice(`${name(p)} wins${score}`, `Checked out ${s.total} with ${list}. Three-wood averages: ${name(0)} ${avg(0)}, ${name(1)} ${avg(1)}.`, 'Play again', () => this.restart());
      return;
    }
    g.promptNotice(`Leg to ${name(p)}`, `Checked out ${s.total} with ${list}. Legs: ${name(0)} ${st.legs[0]}, ${name(1)} ${st.legs[1]}.`, 'Next leg', () => {
      st.leg++; this.startLeg(1 - st.starter);
    });
  },
  restart() { start(cfg); },

  // ---------- the computer ----------
  /* It picks a spot on the board, then draws to it as the game's computer draws to the jack. The spot is the
     one worth most to it, given how far its woods scatter: across the line from its aim (about 27 m × its
     line error), along it from its weight (about 35 m of run for the whole draw band × its weight error). */
  *aiPlan(L, T, arm) {
    const g = E.game, p = st.player, base = E.Profiles.byId(P()[p].profileId), prof = { G: base.G * g.ai.est.biasF, late: base.late };
    const cur = visitScore(), need = st.rem[p] - cur.total, left = 3 - P()[p].played;
    const sx = 27 * L.aimSD * DEG, sy = 35 * L.wSD * (T / 13), noise = [];
    for (let k = 0; k < 140; k++) noise.push([E.aiGauss() * sx, E.aiGauss() * sy]);
    const worth = h => {
      const after = need - h.pts;
      if (after === 0 && h.dbl) return 1000;
      if (after < 2) return -40 - cur.total;   // bust: the whole visit is lost
      let v = h.pts;
      if (after <= 40 && after % 2 === 0) v += left > 1 ? 14 : 6;   // leaves a double
      else if (after <= 170 && checkout(after, Math.max(1, left - 1))) v += 4;
      return v;
    };
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
  },

  // ---------- what the interface shows ----------
  scoreboard() {
    const g = E.game, v = visitScore();
    const pc = i => {
      const pl = P()[i], hex = E.colourHex(pl.colour), on = i === st.player, cur = on && ['aim', 'charge', 'release', 'rolling', 'settle'].includes(g.phase) ? pl.played : -1;
      let dots = ''; for (let k = 0; k < 3; k++) dots += `<span class="dot${on && k < pl.played ? ' spent' : ''}${k === cur ? ' cur' : ''}" style="--c:${hex}"></span>`;
      const legs = st.legsToWin > 1 ? `<span class="sb-lvl" title="Legs won">${st.legs[i]} leg${st.legs[i] === 1 ? '' : 's'}</span>` : '';
      return `<div class="sb-cell sb-player${on && !st.over ? ' active' : ''}"><div class="who"><div class="sb-name">${E.esc(pl.name)}</div><div class="dots" aria-label="${3 - (on ? pl.played : 0)} woods to throw">${dots}${legs}</div></div><div class="sb-score num">${st.rem[i]}</div></div>`;
    };
    return `<div class="sb-cell sb-endcell"><div class="kicker">Visit</div><div class="sb-big num">${v.total}</div></div>${pc(0)}${pc(1)}
      <div class="sb-cell sb-opt"><div class="kicker">501 · double out${g.ai ? ' · v ' + g.ai.level.name : ''}</div><div class="sb-meta num">Green ${g.world.T.toFixed(1)} s</div></div>`;
  },
  head(zoom) {
    const v = st ? visitScore() : { list: [], total: 0 }, p = st ? st.player : 0, need = st ? st.rem[p] - (st.settled ? 0 : v.total) : START;
    const co = st ? hintFor(p) : '';
    return {
      fit: { y: B.y, d: zoom === 'head' ? 2 * B.EDGE + 0.3 : 2 * B.EDGE + 6 },
      underlay: (cg, px) => paintBoard(cg, px),
      drawBody: drawDart,
      k1: 'This visit', v1: v.list.length ? `${v.total} · ${v.list.map(h => h.short).join(' ')}` : '—',
      k2: 'To get', v2: need === 0 ? 'Checked out' : need < 0 ? 'Bust' : String(need),
      note: !st || st.settled ? '' : need === 1 || need < 0 ? 'Bust unless a wood is knocked off.' : co ? `Checkout: ${co}` : ''
    };
  }
};

// ---------------- the menu ----------------
const MENU = `
<div class="scrim" id="dartsScrim">
  <form class="sheet" id="dartsForm" autocomplete="off" onsubmit="return false">
    <div class="kicker">Bias darts</div>
    <h2>501, finish on a double</h2>
    <p>Three woods a visit, bowled from the mat as in a game of bowls, onto a dartboard painted on the green. The woods count where they all lie when the visit is over, so you may knock your own on. A wood scores by where its centre rests; in the ditch or off the board it scores nothing. Take your score exactly to nothing with a wood on a double (or the bull) to win the leg.</p>
    <div class="field" style="margin-top:14px"><span class="lbl">Opponent</span>
      <div class="seg" role="radiogroup" aria-label="Opponent" id="dOpp"><button type="button" data-o="human">Another player</button><button type="button" data-o="ai">The computer</button></div></div>
    <div class="grid2">
      <div class="field"><label for="dN0">Player one</label><input class="input" id="dN0" maxlength="16"></div>
      <div class="field" id="dN1F"><label for="dN1">Player two</label><input class="input" id="dN1" maxlength="16"></div>
      <div class="field" id="dLevelF"><label for="dLevel">Computer's standard</label><select class="select" id="dLevel"></select></div>
    </div>
    <div class="field"><span class="lbl">Match</span>
      <div class="seg" role="radiogroup" aria-label="Match" id="dLegs"><button type="button" data-l="1">One leg</button><button type="button" data-l="2">Best of three</button><button type="button" data-l="3">Best of five</button></div></div>
    <div class="field"><label for="dT">Green speed</label>
      <div class="range-row"><input type="range" id="dT" min="11" max="16" step="0.5"><output id="dTOut" class="num"></output></div></div>
    <div class="sheet-actions"><button type="button" class="btn ghost" id="dSettings">Settings</button><button type="button" class="btn ghost" id="dResume" hidden>Back to the game</button><span class="spacer"></span><button type="button" class="btn primary" id="dGo">Walk out to the green</button></div>
  </form>
</div>`;
const pick = {
  opp: null, legs: null,
  load() {
    this.opp = E.store.get('dv.opp', 'human'); this.legs = E.store.get('dv.legs', 1);
    E.$('dN0').value = E.store.get('dv.n0', 'Eleanor'); E.$('dN1').value = E.store.get('dv.n1', 'Thomas');
    E.$('dLevel').value = E.store.get('dv.level', 'club'); E.$('dT').value = E.store.get('dv.T', 13);
    this.paint();
  },
  paint() {
    for (const b of E.$('dOpp').children) b.setAttribute('aria-pressed', String(b.dataset.o === this.opp));
    for (const b of E.$('dLegs').children) b.setAttribute('aria-pressed', String(+b.dataset.l === this.legs));
    E.$('dN1F').style.display = this.opp === 'ai' ? 'none' : ''; E.$('dLevelF').style.display = this.opp === 'ai' ? '' : 'none';
    const T = +E.$('dT').value; E.$('dTOut').textContent = `${T.toFixed(1)} s · ${E.GreenSpeed.label(T)}`;
  }
};
function start(c) {
  cfg = c;
  E.game.startVariant({ v: Darts, T: c.T, ai: c.ai, players: [
    { name: c.names[0], profileId: E.store.get('m.prof0', 'dp-pro'), colour: COL[0].id },
    { name: c.ai ? 'Computer' : c.names[1], profileId: c.ai ? 'dp-pro' : E.store.get('m.prof1', 'dp-pro'), colour: COL[1].id }] });
  E.UI.refresh();
}
function go() {
  const n0 = E.$('dN0').value.trim() || 'Player one', n1 = E.$('dN1').value.trim() || 'Player two', ai = pick.opp === 'ai' ? E.$('dLevel').value : null, T = +E.$('dT').value;
  E.store.set('dv.n0', n0); E.store.set('dv.n1', n1); E.store.set('dv.opp', pick.opp); E.store.set('dv.legs', pick.legs); E.store.set('dv.level', E.$('dLevel').value); E.store.set('dv.T', T);
  E.UI.close('dartsScrim');
  start({ names: [n0, n1], ai, T, legs: pick.legs });
}
function menu() {
  const inGame = E.game.mode === 'variant';
  E.$('dResume').hidden = !inGame;
  E.$('dGo').textContent = inGame ? 'Start a new match' : 'Walk out to the green';
  pick.paint();
  E.UI.open('dartsScrim');
}
function install(api) {
  E = api;
  for (const c of COL) if (!E.COLOURS.some(x => x.id === c.id)) E.COLOURS.push(c);
  document.getElementById('app').insertAdjacentHTML('beforeend', MENU + '<div id="dCall" aria-hidden="true"></div>');
  const css = document.createElement('style'); css.textContent = CALL_CSS; document.head.appendChild(css);
  const font = document.createElement('link'); font.rel = 'stylesheet'; font.href = 'https://fonts.googleapis.com/css2?family=Bangers&display=swap'; document.head.appendChild(font);   // the caller's lettering (Impact if it cannot load)
  E.$('dLevel').innerHTML = E.AI_LEVELS.map(l => `<option value="${l.id}">${l.name}: ${E.esc(l.short)}</option>`).join('');
  E.$('dOpp').onclick = e => { const b = e.target.closest('[data-o]'); if (b) { pick.opp = b.dataset.o; pick.paint(); } };
  E.$('dLegs').onclick = e => { const b = e.target.closest('[data-l]'); if (b) { pick.legs = +b.dataset.l; pick.paint(); } };
  E.$('dT').oninput = () => pick.paint();
  E.$('dGo').onclick = go;
  E.$('dResume').onclick = () => E.UI.close('dartsScrim');
  E.$('dSettings').onclick = () => { E.UI.close('dartsScrim'); E.UI.open('settingsScrim'); };
  // the title head: three woods on the board, in place of a jack and bowls
  const w = E.game.world; w.clear();
  [[0.08, 32.5, 0], [-0.31, 32.62, 0], [0.36, 32.4, 1]].forEach(([x, y, o], i) => { const b = w.add(new E.Body('bowl', o)); b.place(x, y); b.heading = [0.3, -0.5, 1.1][i]; b.colour = COL[o].hex; b.side = i % 2 ? 1 : -1; });
  pick.load();
  menu();
}
window.BiasVariant = { eye: { z: 3.4, back: 3.2, followX: 8 }, paintGround(g, X, Y, S) { g.save(); g.translate(X(0), Y(0)); g.scale(1 / S, 1 / S); paintBoard(g, 1 / S, { alpha: 0.92 }); g.restore(); }, decal, install, menu: () => menu() };
window.BiasDarts = { hitAt, checkout, B, Darts, state: () => st, call: (l, o) => call(l, o), cheer: () => cheer() };   // for checking in the console
})();
