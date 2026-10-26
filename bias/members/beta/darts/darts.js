/* Bias darts: 501, double out, played with woods on the Bias green, against the computer. Beta, for members.
   play.js loads board.js (the board and the caller) and then this, ahead of the game (../../../index.html, so it always
   has today's physics and controls). The game finds window.BiasVariant and hands it the green: same physics, same release,
   same bowls. Each player bowls three woods a visit; the woods are scored where they all lie once the visit is over, by
   where each wood's centre rests; to check out, the visit must take the score exactly to nothing with a wood on a double
   (or the bull). A wood in the ditch, or off the board, scores nothing. */
(function () {
'use strict';
const { B, COL, hitAt, hitOf, paintBoard, drawDart, decal, call, cheer, aiSpot, setup } = window.BiasBoard;
const START = 501;

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
  // It aims for the spot worth most to it: a checkout's double or a score that leaves one (see aiSpot)
  *aiPlan(L, T, arm) {
    const g = E.game, p = st.player, base = E.Profiles.byId(P()[p].profileId), prof = { G: base.G * g.ai.est.biasF, late: base.late };
    const cur = visitScore(), need = st.rem[p] - cur.total, left = 3 - P()[p].played;
    const worth = h => {
      const after = need - h.pts;
      if (after === 0 && h.dbl) return 1000;
      if (after < 2) return -40 - cur.total;   // bust: the whole visit is lost
      let v = h.pts;
      if (after <= 40 && after % 2 === 0) v += left > 1 ? 14 : 6;   // leaves a double
      else if (after <= 170 && checkout(after, Math.max(1, left - 1))) v += 4;
      return v;
    };
    return yield* aiSpot(prof, L, T, arm, worth);
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
    <div class="kicker">Darts · beta</div>
    <h2>501, finish on a double</h2>
    <p>Three woods a visit, bowled from the mat as in a game of bowls, onto a dartboard painted on the green. The woods count where they all lie when the visit is over, so you may knock your own on. A wood scores by where its centre rests; in the ditch or off the board it scores nothing. Take your score exactly to nothing with a wood on a double (or the bull) to win the leg. You play the computer.</p>
    <div class="grid2">
      <div class="field"><label for="dN0">Your name</label><input class="input" id="dN0" maxlength="16"></div>
      <div class="field"><label for="dLevel">Computer's standard</label><select class="select" id="dLevel"></select></div>
    </div>
    <div class="field"><span class="lbl">Match</span>
      <div class="seg" role="radiogroup" aria-label="Match" id="dLegs"><button type="button" data-l="1">One leg</button><button type="button" data-l="2">Best of three</button><button type="button" data-l="3">Best of five</button></div></div>
    <div class="field"><label for="dT">Green speed</label>
      <div class="range-row"><input type="range" id="dT" min="11" max="16" step="0.5"><output id="dTOut" class="num"></output></div></div>
    <div class="sheet-actions"><button type="button" class="btn ghost" id="dSettings">Settings</button><button type="button" class="btn ghost" id="dResume" hidden>Back to the game</button><span class="spacer"></span><button type="button" class="btn primary" id="dGo">Walk out to the green</button></div>
  </form>
</div>`;
const pick = {
  legs: null,
  load() {
    this.legs = E.store.get('dv.legs', 1);
    E.$('dN0').value = E.store.get('dv.n0', 'Eleanor');
    E.$('dLevel').value = E.store.get('dv.level', 'club'); E.$('dT').value = E.store.get('dv.T', 13);
    this.paint();
  },
  paint() {
    for (const b of E.$('dLegs').children) b.setAttribute('aria-pressed', String(+b.dataset.l === this.legs));
    const T = +E.$('dT').value; E.$('dTOut').textContent = `${T.toFixed(1)} s · ${E.GreenSpeed.label(T)}`;
  }
};
function start(c) {
  cfg = c;
  E.game.startVariant({ v: Darts, T: c.T, ai: c.ai, players: [
    { name: c.name, profileId: E.store.get('m.prof0', 'dp-pro'), colour: COL[0].id },
    { name: 'Computer', profileId: 'dp-pro', colour: COL[1].id }] });
  E.UI.refresh();
}
function go() {
  const n = E.$('dN0').value.trim() || 'You', T = +E.$('dT').value;
  E.store.set('dv.n0', n); E.store.set('dv.legs', pick.legs); E.store.set('dv.level', E.$('dLevel').value); E.store.set('dv.T', T);
  E.UI.close('dartsScrim');
  start({ name: n, ai: E.$('dLevel').value, T, legs: pick.legs });
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
  setup(api);
  document.getElementById('app').insertAdjacentHTML('beforeend', MENU);
  E.$('dLevel').innerHTML = E.AI_LEVELS.map(l => `<option value="${l.id}">${l.name}: ${E.esc(l.short)}</option>`).join('');
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
