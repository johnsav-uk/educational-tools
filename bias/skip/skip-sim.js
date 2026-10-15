/* Over to you, skip: a puzzle on the real Bias physics.
   Sets a puzzle's head out in a PhysicsWorld, plays a delivery, and judges the result
   with the game's own rules (Rules.afterDelivery, Rules.score) and its own measure of how
   good a head is (AI.value). The page and the benchmark script both use this file, so the
   stars a player sees and the benchmark they are measured against come from the same code.

   create(E) takes the engine: in the page, window.BiasEngine (exported by bias/index.html);
   in Node, tools/engine.cjs, which loads the same sections of bias/index.html. */
(function (root) {
  'use strict';
  const Core = typeof module === 'object' && module && module.exports ? require('./skip-core.js') : root.SkipCore;
  const ME = 0, THEM = 1;
  const PROFILE_ID = 'dp-pro';   // every puzzle uses these bowls as they leave the factory, whatever a player has tuned

  function create(E) {
    const prof = () => { const d = E.PROFILE_DEFAULTS.find(p => p.id === PROFILE_ID); return { G: d.G, late: d.late }; };
    const matRear = pz => pz.matRear != null ? pz.matRear : E.W.MAT_MIN;
    const matFront = pz => matRear(pz) + E.W.MAT_LEN;
    // A left-hander plays the head mirrored, so "forehand" is the same shot and the result is identical.
    const mx = arm => arm === 'L' ? -1 : 1;
    const shotFor = (shot, arm) => ({ hand: shot.hand, aim: mx(arm) * shot.aim, weight: shot.weight });

    function world(pz, arm = 'R') {
      const w = new E.PhysicsWorld(pz.greenSpeed), m = mx(arm);
      const j = w.add(new E.Body('jack')); j.place(m * pz.jack.x, pz.jack.y);
      pz.bowls.forEach((b, i) => {
        const o = w.add(new E.Body('bowl', b.team === pz.you ? ME : THEM));
        o.place(m * b.x, b.y); o.heading = m * (b.heading || 0); o.team = b.team; o.num = i + 1;
      });
      return w;
    }
    function scoreOf(w) {
      const s = E.Rules.score(w.bodies.filter(b => !b.dead), w.jack);
      return { winner: s.winner, shots: s.shots, tie: !!s.tie, dead: false };
    }
    // shot: { hand: 'fore' | 'back', aim (radians, + is right), weight (the swing meter, 0–1) }, already mirrored for the arm
    function launch(w, pz, shot, arm = 'R') {
      const rel = E.releasePoint(matRear(pz), shot.hand, arm);
      const b = w.add(new E.Body('bowl', ME)); b.team = pz.you; b.mine = true;
      w.launch(b, rel.x, rel.y, shot.aim, E.Weight.toSpeed(shot.weight), E.biasSide(shot.hand, arm), prof());
      return b;
    }
    // Once everything has stopped: what is dead, who scores, the outcome class and the value.
    function judge(w, pz, delivered, before) {
      const mf = matFront(pz);
      const { dead, jackDead } = E.Rules.afterDelivery(w.bodies, delivered, mf);
      // posW 0.15: nobody has a bowl left to answer with, so shots count and position only breaks ties
      const value = E.AI.value(w, delivered, mf, ME, before.winner === ME, 0.15);   // also marks the dead bowls
      const sc = E.Rules.score(w.bodies.filter(b => !b.dead), w.jack);
      const after = { winner: jackDead ? null : sc.winner, shots: jackDead ? 0 : sc.shots, tie: !!sc.tie, dead: !!jackDead };
      return { value, before, after, outcome: Core.outcomeOf(before, after, ME), jackDead: jackDead || null,
        dead: dead.map(d => ({ id: d.b.id, why: d.why })), ranked: jackDead ? [] : sc.ranked };
    }
    // The whole shot at once (the benchmark, the validator and the tests).
    function play(pz, shot, arm = 'R') {
      const w = world(pz, arm), before = scoreOf(w), b = launch(w, pz, shotFor(shot, arm), arm);
      w.runUntilRest();
      return Object.assign(judge(w, pz, b, before), { world: w, delivered: b });
    }
    /* The shot played in the game itself: Game.startPuzzle sets the head out, the delivery goes
       through the game's own deliver → physics → resolve path, and the head is judged when the game
       hands it over, exactly as in the browser. The benchmark and the validator play every shot this way. */
    function playInGame(pz, shot) {
      let out = null;
      const ui = new Proxy({ puzzleDone: (w, d) => { out = { w, d }; } }, { get: (t, k) => k in t ? t[k] : () => {} });
      const g = new E.Game(ui, { instant: true });
      g.startPuzzle(pz);
      const before = scoreOf(g.world);
      g.testDeliver(shot.aim, shot.weight, shot.hand);
      if (!out) throw new Error('the game did not hand back the puzzle shot');
      return Object.assign(judge(out.w, pz, out.d, before), { world: out.w, delivered: out.d });
    }
    // A bowl's path on an empty green: the line of the advice, drawn into the head.
    function lonePath(pz, shot, arm = 'R', every = 0.04) {
      const w = new E.PhysicsWorld(pz.greenSpeed), s = shotFor(shot, arm), rel = E.releasePoint(matRear(pz), s.hand, arm);
      const b = w.add(new E.Body('bowl', ME));
      w.launch(b, rel.x, rel.y, s.aim, E.Weight.toSpeed(s.weight), E.biasSide(s.hand, arm), prof());
      const pts = [{ x: b.x, y: b.y }]; let t = 0, acc = 0;
      while (b.state === 'moving' && t < 120) { w.step(E.W.DT); t += E.W.DT; acc += E.W.DT; if (acc >= every) { acc = 0; pts.push({ x: b.x, y: b.y }); } }
      pts.push({ x: b.x, y: b.y });
      return { pts, rest: { x: b.x, y: b.y }, state: b.state, ditch: b.ditch };
    }
    /* The advice as line and weight. advised.kind: 'draw' (finish at target), 'through' (run
       through target with `extra` metres to spare: a yard on, a wrest), 'drive' (full weight at target). */
    function solveAdvice(pz) {
      const a = pz.advised, T = pz.greenSpeed, rel = E.releasePoint(matRear(pz), a.hand, 'R'), side = E.biasSide(a.hand, 'R'), p = prof();
      let s;
      if (a.kind === 'drive') s = E.AI.solveThrough(p, T, side, rel, a.target, E.Weight.toSpeed(a.drive || 0.96));
      else if (a.kind === 'through') s = E.AI.solveThrough(p, T, side, rel, a.target, E.GreenSpeed.speedFor(Math.hypot(a.target.x - rel.x, a.target.y - rel.y) + (a.extra || 1), E.GreenSpeed.params(T)));
      else s = E.AI.solveDraw(p, T, side, rel, a.target);
      return { hand: a.hand, aim: s.aim, weight: E.meterFor(s.speed) };
    }

    /* The benchmark: the game's computer bowler plays the head `runs` times, choosing its own
       shot on either hand at its own standard and delivering with its own scatter. It is told
       the green speed and the bias exactly, as the player is. The seed fixes every run. */
    function benchmark(pz, { runs = 100, mix = ['club', 'league', 'county'], seed = 1 } = {}) {
      E.setSeed(seed);
      const values = [], outcomes = {}, shots = [];
      const sides = [pz.match && pz.match.you || 0, pz.match && pz.match.them || 0];
      for (let i = 0; i < runs; i++) {
        const level = E.aiLevel(mix[i % mix.length]), g = new E.Game(E.QuietUI, { instant: true });
        const mk = (name, score) => ({ name, profileId: PROFILE_ID, colour: 'claret', score, played: 0, members: [{ name, role: '', played: 3, hand: 'fore', aim: 0 }] });
        const ends = pz.match && pz.match.ends || 21;
        g.mode = 'match'; g.players = [mk('You', sides[0]), mk('Them', sides[1])];
        g.match = { format: { type: 'ends', n: ends }, discipline: E.DISCIPLINES.singles, leader: THEM, ends: [], jackAttempt: 0, T: pz.greenSpeed, secret: false, over: false, replay: false, deadEnds: 0 };
        g.endNo = pz.match && pz.match.end || ends; g.order = [[THEM, 0], [ME, 0]]; g.orderIdx = 1;   // the last bowl of the end
        g.matRear = matRear(pz); g.world = world(pz); g.turn = { kind: 'bowl', player: ME, member: 0 };
        g.ai = { side: ME, level, est: { T: pz.greenSpeed, biasF: 1 } };
        const it = g.aiPlan(); let r; do { r = it.next(); } while (!r.done);
        const shot = g.aiApplyScatter(r.value), res = playInGame(pz, shot);
        values.push(res.value); outcomes[res.outcome] = (outcomes[res.outcome] || 0) + 1;
        shots.push({ level: level.id, type: r.value.type, hand: shot.hand, outcome: res.outcome, value: res.value });
      }
      return { values: values.slice().sort((a, b) => a - b), outcomes, shots };
    }

    return { ME, THEM, PROFILE_ID, prof, world, scoreOf, launch, judge, play, playInGame, lonePath, solveAdvice, benchmark, matRear, matFront, shotFor, mirror: mx };
  }

  const api = { create };
  if (typeof module === 'object' && module && module.exports) module.exports = api;
  else root.SkipSim = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);
