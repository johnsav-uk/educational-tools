/* Bias round the clock: 1 to 20, then the bull, on the Bias green, against the computer. Beta, for members.
   The same board, caller, bowls and controls as darts (see ../darts/darts.js for the variant hooks). Three woods a visit,
   and each wood that rests on the number you need moves you on one, in any ring of it. The woods count where they all lie
   when the visit is over, read in the order thrown, so you may knock your own on. The bull, in either ring, finishes it. */
(function () {
'use strict';
const { B, COL, hitOf, paintBoard, drawDart, decal, call, cheer, aiSpot, setup } = window.BiasBoard;
const BULL = 25, TARGETS = [...Array.from({ length: 20 }, (_, i) => i + 1), BULL], FINISH = TARGETS.length;   // 1 to 20, then the bull

// ---------------- the game ----------------
let E = null, cfg = null, st = null;
const P = () => E.game.players;
const name = i => P()[i].name;
const at = idx => idx < FINISH ? TARGETS[idx] : null;   // the number an index is on, or null once finished
const label = n => n === null ? 'Done' : n === BULL ? 'Bull' : String(n);
// hits in the order thrown: each that lands on the number needed moves the player on one. Returns the index reached.
function progress(list, idx) { for (const h of list) if (idx < FINISH && h.n === TARGETS[idx]) idx++; return idx; }
function visit() {
  const list = st.visit.map(hitOf), idx = progress(list, st.idx[st.player]);
  return { list, idx, moved: idx - st.idx[st.player] };
}
const RTC = {
  begin() {
    st = { idx: [0, 0], player: 0, visit: [], thrown: [0, 0], over: false, settled: false, opening: false };
    this.startVisit(0, true);
  },
  startVisit(p, first) {
    const g = E.game;
    for (const b of g.world.bodies.slice()) if (b.kind === 'bowl') g.world.remove(b);
    g.trace = []; g.effects = []; g.drops.clear(); g.delivered = null;
    P().forEach(pl => { pl.played = 0; pl.members[0].played = 0; });
    st.player = p; st.visit = []; st.settled = false; st.opening = !!first;
    g.beginBowl(p, 0);
  },
  label() { return 'Round the clock · 1 to 20, then the bull'; },
  banner(p) {
    const v = visit(), left = 3 - P()[p].played;
    if (st.opening) { st.opening = false; E.UI.banner(this.label(), name(p), 'throws first · 1 to 20, then the bull'); return; }
    if (P()[p].played === 0 && at(st.idx[p]) === BULL) { E.UI.clearBanner(); call([[`${name(p)}, you need`, 'l'], ['Bull', 'b']], { dur: 3.2 }); return; }
    E.UI.banner(this.label(), name(p), `to hit ${label(at(v.idx))} · ${left} wood${left === 1 ? '' : 's'} to throw`);
  },
  resolveBowl() {
    const g = E.game, p = st.player, pl = P()[p], d = g.delivered;
    pl.played++; pl.members[0].played++; st.thrown[p]++;
    if (d) st.visit.push(d);
    g.phase = 'between';
    const h = hitOf(d), v = visit();
    E.UI.toast(`${name(p)}: ${h.name} · to hit ${label(at(v.idx))}`, v.moved ? 'good' : 'warn');
    if (v.moved) g.reward(1, d);
    E.UI.refresh();
    if (v.idx === FINISH) { g.after(1.0, () => this.won(p)); return; }
    if (pl.played >= 3) { g.after(1.3, () => this.endVisit()); return; }
    g.after(1.2, () => g.beginBowl(p, 0));
  },
  endVisit() {
    const g = E.game, p = st.player, v = visit(), list = v.list.map(h => h.short).join(', ') || 'No woods';
    if (v.idx === FINISH) { this.won(p); return; }
    st.idx[p] = v.idx; st.settled = true;
    E.UI.refresh();
    g.promptNotice(`${name(p)} is on ${label(at(v.idx))}`, `${list}. ${v.moved ? `${v.moved} moved on` : 'Nothing on the number'}.`, `${name(1 - p)} to throw`, () => this.startVisit(1 - p), true);
  },
  won(p) {
    const g = E.game;
    st.idx[p] = FINISH; st.over = true; st.settled = true;
    E.UI.refresh();
    call([['Bull, and round the clock to', 'l'], [name(p), 'b']], { dur: 5 });
    E.Sound.chime(true);
    if (p === 0) cheer(); else E.Sound.applause(2, 10);
    g.promptNotice(`${name(p)} wins`, `Finished in ${st.thrown[p]} woods. ${name(1 - p)} is on ${label(at(st.idx[1 - p]))}.`, 'Play again', () => start(cfg));
  },

  // ---------- the computer ----------
  // It aims at the number it needs next, from the visit so far: any ring of it moves the computer on (see aiSpot)
  *aiPlan(L, T, arm) {
    const g = E.game, p = st.player, base = E.Profiles.byId(P()[p].profileId), prof = { G: base.G * g.ai.est.biasF, late: base.late };
    const want = at(visit().idx);
    return yield* aiSpot(prof, L, T, arm, h => h.n === want ? 1 : 0);
  },

  // ---------- what the interface shows ----------
  scoreboard() {
    const g = E.game, v = visit();
    const pc = i => {
      const pl = P()[i], hex = E.colourHex(pl.colour), on = i === st.player, cur = on && ['aim', 'charge', 'release', 'rolling', 'settle'].includes(g.phase) ? pl.played : -1;
      let dots = ''; for (let k = 0; k < 3; k++) dots += `<span class="dot${on && k < pl.played ? ' spent' : ''}${k === cur ? ' cur' : ''}" style="--c:${hex}"></span>`;
      return `<div class="sb-cell sb-player${on && !st.over ? ' active' : ''}"><div class="who"><div class="sb-name">${E.esc(pl.name)}</div><div class="dots" aria-label="${3 - (on ? pl.played : 0)} woods to throw">${dots}</div></div><div class="sb-score num">${label(on ? at(v.idx) : at(st.idx[i]))}</div></div>`;
    };
    return `<div class="sb-cell sb-endcell"><div class="kicker">Moved on</div><div class="sb-big num">${v.moved}</div></div>${pc(0)}${pc(1)}
      <div class="sb-cell sb-opt"><div class="kicker">Round the clock${g.ai ? ' · v ' + g.ai.level.name : ''}</div><div class="sb-meta num">Green ${g.world.T.toFixed(1)} s</div></div>`;
  },
  head(zoom) {
    const v = st ? visit() : { list: [], moved: 0, idx: 0 }, n = at(v.idx);
    return {
      fit: { y: B.y, d: zoom === 'head' ? 2 * B.EDGE + 0.3 : 2 * B.EDGE + 6 },
      underlay: (cg, px) => paintBoard(cg, px),
      drawBody: drawDart,
      k1: 'This visit', v1: v.list.length ? `${v.list.map(h => h.short).join(' ')} · ${v.moved} moved on` : '—',
      k2: 'To hit', v2: label(n),
      note: !st || st.settled ? '' : n === BULL ? 'The bull, in either ring, finishes it.' : ''
    };
  }
};

// ---------------- the menu ----------------
const MENU = `
<div class="scrim" id="rcScrim">
  <form class="sheet" id="rcForm" autocomplete="off" onsubmit="return false">
    <div class="kicker">Round the clock · beta</div>
    <h2>1 to 20, then the bull</h2>
    <p>Three woods a visit, bowled from the mat as in a game of bowls, onto a dartboard painted on the green. A wood that rests on the number you need, in any ring of it, moves you on one. The woods count where they all lie when the visit is over, in the order thrown, so you may knock your own on. The bull, in either ring, finishes it. You play the computer.</p>
    <div class="grid2">
      <div class="field"><label for="rcN0">Your name</label><input class="input" id="rcN0" maxlength="16"></div>
      <div class="field"><label for="rcLevel">Computer's standard</label><select class="select" id="rcLevel"></select></div>
    </div>
    <div class="field"><label for="rcT">Green speed</label>
      <div class="range-row"><input type="range" id="rcT" min="11" max="16" step="0.5"><output id="rcTOut" class="num"></output></div></div>
    <div class="sheet-actions"><button type="button" class="btn ghost" id="rcSettings">Settings</button><button type="button" class="btn ghost" id="rcResume" hidden>Back to the game</button><span class="spacer"></span><button type="button" class="btn primary" id="rcGo">Walk out to the green</button></div>
  </form>
</div>`;
function paintMenu() { const T = +E.$('rcT').value; E.$('rcTOut').textContent = `${T.toFixed(1)} s · ${E.GreenSpeed.label(T)}`; }
function start(c) {
  cfg = c;
  E.game.startVariant({ v: RTC, T: c.T, ai: c.ai, players: [
    { name: c.name, profileId: E.store.get('m.prof0', 'dp-pro'), colour: COL[0].id },
    { name: 'Computer', profileId: 'dp-pro', colour: COL[1].id }] });
  E.UI.refresh();
}
function go() {
  const n = E.$('rcN0').value.trim() || 'You', T = +E.$('rcT').value, level = E.$('rcLevel').value;
  E.store.set('rc.n0', n); E.store.set('rc.level', level); E.store.set('rc.T', T);
  E.UI.close('rcScrim');
  start({ name: n, ai: level, T });
}
function menu() {
  const inGame = E.game.mode === 'variant';
  E.$('rcResume').hidden = !inGame;
  E.$('rcGo').textContent = inGame ? 'Start a new game' : 'Walk out to the green';
  paintMenu();
  E.UI.open('rcScrim');
}
function install(api) {
  E = api;
  setup(api);
  document.getElementById('app').insertAdjacentHTML('beforeend', MENU);
  E.$('rcLevel').innerHTML = E.AI_LEVELS.map(l => `<option value="${l.id}">${l.name}: ${E.esc(l.short)}</option>`).join('');
  E.$('rcN0').value = E.store.get('rc.n0', 'Eleanor');
  E.$('rcLevel').value = E.store.get('rc.level', 'club'); E.$('rcT').value = E.store.get('rc.T', 13);
  E.$('rcT').oninput = paintMenu;
  E.$('rcGo').onclick = go;
  E.$('rcResume').onclick = () => E.UI.close('rcScrim');
  E.$('rcSettings').onclick = () => { E.UI.close('rcScrim'); E.UI.open('settingsScrim'); };
  // the title head: three woods on the board, in place of a jack and bowls
  const w = E.game.world; w.clear();
  [[0.08, 32.5, 0], [-0.31, 32.62, 0], [0.36, 32.4, 1]].forEach(([x, y, o], i) => { const b = w.add(new E.Body('bowl', o)); b.place(x, y); b.heading = [0.3, -0.5, 1.1][i]; b.colour = COL[o].hex; b.side = i % 2 ? 1 : -1; });
  menu();
}
window.BiasVariant = { eye: { z: 3.4, back: 3.2, followX: 8 }, paintGround(g, X, Y, S) { g.save(); g.translate(X(0), Y(0)); g.scale(1 / S, 1 / S); paintBoard(g, 1 / S, { alpha: 0.92 }); g.restore(); }, decal, install, menu: () => menu() };
window.BiasRoundTheClock = { TARGETS, progress, state: () => st };   // for checking in the console
})();
