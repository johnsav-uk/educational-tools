/* Over to You, Skip!: the puzzle is played inside the game: Game.startPuzzle sets the head out on the green, the
   delivery runs through the game's own controls path, and the head the game hands back is the
   one the stars are given for. These tests read the game straight out of bias/index.html. */
const path = require('path');
module.exports = function (T) {
  const { test, eq, ok } = T;
  const Core = require('../skip-core.js');
  const E = require('../tools/engine.cjs').load();
  const Sim = require('../skip-sim.js').create(E);
  const L = require('../tools/lib.cjs');
  // every released puzzle, and every one waiting in the queue
  const data = { puzzles: L.readIndex().puzzles.map(e => L.readJson(L.puzzlePath(e.n))).concat(L.readQueue().map(q => q.pz)) };

  test('Game.startPuzzle lays out the head and hands the player one bowl on the advised line', () => {
    const pz = data.puzzles[0], g = new E.Game(new Proxy({}, { get: () => () => {} }), { instant: true });
    g.startPuzzle(pz);
    eq([g.mode, g.phase, g.turn.kind, g.turn.player, g.hand], ['puzzle', 'aim', 'bowl', 0, pz.advised.hand]);
    eq(g.aim, pz.advised.aim, 'the line starts on the advice');
    eq(g.world.T, pz.greenSpeed);
    eq(g.world.bodies.length, pz.bowls.length + 1);
    const sc = Sim.scoreOf(g.world);
    eq([sc.winner, sc.shots], [1, 3], 'red lying three, as the situation says');
  });

  test('every head is the last bowl of a singles end: four of theirs, three of yours', () => {
    for (const pz of data.puzzles) {
      const mine = pz.bowls.filter(b => b.team === pz.you).length;
      eq([pz.bowls.length - mine, mine], [E.DISCIPLINES.singles.bowls, E.DISCIPLINES.singles.bowls - 1], pz.id);
    }
  });

  test('every benchmarked puzzle is unchanged since its benchmark, on the same physics', () => {
    for (const pz of data.puzzles) { ok(pz.bench, pz.id + ' has a benchmark'); eq(pz.bench.head, Core.headHash(pz), pz.id); eq(pz.bench.physics, E.BUILD, pz.id); }
  });

  test('a shot played in the game matches the same shot in a bare physics world, to the last digit', () => {
    for (const pz of data.puzzles) for (const w of [0.4, pz.advised.weight, 0.97]) {
      const shot = { hand: pz.advised.hand, aim: pz.advised.aim, weight: w };
      const a = Sim.playInGame(pz, shot), b = Sim.play(pz, shot);
      eq([a.value, a.outcome], [b.value, b.outcome], `${pz.id} at ${w}`);
    }
  });

  test('the advice, played in the game, earns the stars the benchmark script recorded', () => {
    for (const pz of data.puzzles) {
      const r = Sim.playInGame(pz, pz.advised);
      eq([r.outcome, Core.starsFor(r.value, pz.bench.values)], [pz.check.advice.outcome, pz.check.advice.stars], pz.id);
    }
  });

  test('a toucher in the ditch is set out in the ditch, chalked and live, in the game and in the bare world alike', () => {
    const pz = JSON.parse(JSON.stringify(data.puzzles[0]));
    pz.jack = { x: 0, y: 34.4 }; pz.bowls = pz.bowls.map(b => Object.assign(b, { y: b.y + 5.4 }));
    pz.bowls[0] = { team: pz.bowls[0].team, x: 0.3, y: 36.12, ditch: true, toucher: true };
    eq(L.checkHead(pz).problems, [], 'a ditch toucher is a legal head');
    const g = new E.Game(new Proxy({}, { get: () => () => {} }), { instant: true });
    g.startPuzzle(pz);
    const b = g.world.bodies.find(x => x.kind === 'bowl' && x.y > 36);
    eq([b.state, b.ditch, b.toucher], ['ditch', 'front', true]);
    eq(E.Rules.afterDelivery(g.world.bodies, null, Sim.matFront(pz)).dead.length, 0, 'nothing is dead before the shot');
    const w = Sim.world(pz), c = w.bodies.find(x => x.kind === 'bowl' && x.y > 36);
    eq([c.state, c.ditch, c.toucher], ['ditch', 'front', true]);
    const shot = { hand: 'fore', aim: 0.02, weight: 0.6 };
    const a = Sim.playInGame(pz, shot), r = Sim.play(pz, shot);
    eq([a.value, a.outcome], [r.value, r.outcome], 'the game and the bare world agree with a bowl in the ditch');
    const bad = JSON.parse(JSON.stringify(pz)); delete bad.bowls[0].toucher;
    ok(L.checkHead(bad).problems.some(p => /not a toucher/.test(p)), 'a non-toucher in the ditch rules the head out');
    eq(Core.headHash(pz) !== Core.headHash(bad), true, 'the toucher mark is part of the head');
  });

  test('a left-hander plays the mirrored head and gets the same result', () => {
    const pz = data.puzzles[0], keep = E.Settings.arm;
    try {
      const right = Sim.playInGame(pz, pz.advised);
      E.Settings.arm = 'L';
      const left = Sim.playInGame(pz, { hand: pz.advised.hand, aim: -pz.advised.aim, weight: pz.advised.weight });
      eq([left.outcome, left.value], [right.outcome, right.value]);
    } finally { E.Settings.arm = keep; }
  });

  test('the puzzle uses factory bowls, whatever a player has tuned', () => {
    const pz = data.puzzles[0], p = E.Profiles.byId('dp-pro'), keep = p.G;
    try { p.G = 0.07; const r = Sim.playInGame(pz, pz.advised); eq(r.outcome, pz.check.advice.outcome); }
    finally { p.G = keep; }
  });
};
