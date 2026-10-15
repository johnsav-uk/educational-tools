/* Over to you, skip: benchmark and check every puzzle. A dev tool: players never load it.

     node bias/skip/tools/benchmark.cjs                 all puzzles
     node bias/skip/tools/benchmark.cjs red-lying-three one puzzle
     node bias/skip/tools/benchmark.cjs --quick         a coarser shot grid, for drafting

   Every shot here is played inside the game engine (Game.startPuzzle and the game's own
   delivery), read out of bias/index.html by engine.cjs. For each puzzle it
     1. checks the head: four of theirs and three of yours (singles, the last bowl of the end),
        bowls on the rink and not overlapping, the jack a legal length,
        and who is lying how many (compare that with the situation text);
     2. works out the advice as line and weight (advised.aim / advised.weight);
     3. plays the benchmark: the game's computer bowler takes the last bowl 100 times
        (Club, League and County in turn, each choosing its own shot on either hand and
        delivering with its own scatter), and stores the 100 results the stars are measured
        against (bench);
     4. brute-forces a grid of lines and weights on both hands, each shot played in the game,
        and reports the best result found (saved as best, for a later "best line" replay),
        the share of tried shots at each star level, and anything that looks wrong:
        five stars out of reach, a plain draw already worth five stars, a flat benchmark.
   Results are written back into puzzles.json. */
const fs = require('fs');
const path = require('path');
const Core = require('../skip-core.js');
const E = require('./engine.cjs').load();
const Sim = require('../skip-sim.js').create(E);

const FILE = path.join(__dirname, '..', 'puzzles.json');
const args = process.argv.slice(2), quick = args.includes('--quick'), only = args.filter(a => !a.startsWith('--'));
const RUNS = 100, MIX = ['club', 'league', 'county'];
const r5 = v => Math.round(v * 1e5) / 1e5;
const fnv = s => { let h = 0x811c9dc5; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 0x01000193) >>> 0; } return h; };
const deg = r => (r * 180 / Math.PI).toFixed(2) + '°';
const pct = v => (v * 100).toFixed(0) + '%';

function checkHead(pz) {
  const problems = [], W = E.W, w = Sim.world(pz), jack = w.jack, mf = Sim.matFront(pz);
  if (!['red', 'yellow'].includes(pz.you)) problems.push(`you must be "red" or "yellow"`);
  // singles, last bowl of the end: all four of theirs have been played, and three of yours
  const mine = pz.bowls.filter(b => b.team === pz.you).length, theirs = pz.bowls.length - mine, per = E.DISCIPLINES.singles.bowls;
  if (theirs !== per || mine !== per - 1) problems.push(`the head has ${theirs} of theirs and ${mine} of yours; the last bowl of a singles end needs ${per} and ${per - 1}`);
  const len = jack.y - mf;
  if (len < W.JACK_MIN) problems.push(`jack is ${len.toFixed(1)} m from the mat front; the minimum is ${W.JACK_MIN} m`);
  if (jack.y > W.GREEN_LEN - W.JACK_DITCH_MIN) problems.push('jack is nearer than 2 m to the ditch');
  for (const b of w.bodies) {
    if (Math.abs(b.x) > W.RINK_HALF) problems.push(`${b.kind} at x ${b.x} is outside the rink`);
    if (b.y <= 0 || b.y >= W.GREEN_LEN) problems.push(`${b.kind} at y ${b.y} is off the green`);
  }
  for (let i = 0; i < w.bodies.length; i++) for (let j = i + 1; j < w.bodies.length; j++) {
    const a = w.bodies[i], c = w.bodies[j];
    if (Math.hypot(a.x - c.x, a.y - c.y) < a.r + c.r) problems.push(`${a.kind} (${a.x}, ${a.y}) overlaps ${c.kind} (${c.x}, ${c.y})`);
  }
  const s = Sim.scoreOf(w), lying = s.winner == null ? 'nobody holds shot (a tie)' : `${s.winner === Sim.ME ? pz.you + ' (you)' : (pz.you === 'red' ? 'yellow' : 'red')} lying ${s.shots}`;
  if (s.winner === Sim.ME) problems.push('you already hold shot: the puzzle is meant to start with you down');
  return { problems, lying, before: s };
}

function grid(pz, bench) {
  const step = quick ? 0.004 : 0.0015, wstep = quick ? 0.0125 : 0.005, span = 0.09;
  const bands = [0, 0, 0, 0, 0, 0], tried = { n: 0 };
  let best = null;
  for (const hand of ['fore', 'back']) {
    const rel = E.releasePoint(Sim.matRear(pz), hand, 'R');
    const centre = E.AI.solveDraw(Sim.prof(), pz.greenSpeed, E.biasSide(hand, 'R'), rel, pz.jack).aim;
    for (let aim = centre - span; aim <= centre + span + 1e-9; aim += step) {
      for (let weight = 0.3; weight <= 1 + 1e-9; weight += wstep) {
        const r = Sim.playInGame(pz, { hand, aim, weight }), stars = Core.starsFor(r.value, bench);
        bands[Math.floor(stars)]++; tried.n++;
        if (!best || r.value > best.value + 1e-9) best = { hand, aim: r5(aim), weight: r5(weight), value: r5(r.value), outcome: r.outcome, stars };
      }
    }
  }
  return { tried: tried.n, bands: bands.map(n => +(n / tried.n).toFixed(4)), best };
}

function plainDraws(pz, bench) {
  return ['fore', 'back'].map(hand => {
    const rel = E.releasePoint(Sim.matRear(pz), hand, 'R');
    const s = E.AI.solveDraw(Sim.prof(), pz.greenSpeed, E.biasSide(hand, 'R'), rel, { x: pz.jack.x, y: pz.jack.y - 0.07 });
    const r = Sim.playInGame(pz, { hand, aim: s.aim, weight: E.meterFor(s.speed) });
    return { hand, outcome: r.outcome, stars: Core.starsFor(r.value, bench) };
  });
}

function run() {
  const data = JSON.parse(fs.readFileSync(FILE, 'utf8'));
  let bad = 0;
  for (const pz of data.puzzles) {
    if (only.length && !only.includes(pz.id)) continue;
    const t0 = Date.now();
    console.log(`\n${pz.id}: ${pz.title}`);
    const head = checkHead(pz);
    console.log(`  head: ${head.lying}, green ${pz.greenSpeed} s (${E.GreenSpeed.label(pz.greenSpeed).toLowerCase()})`);
    if (head.problems.length) { bad++; head.problems.forEach(p => console.log('  ✗ ' + p)); continue; }

    const adv = Sim.solveAdvice(pz);
    Object.assign(pz.advised, { aim: r5(adv.aim), weight: r5(adv.weight) });

    const seed = fnv(pz.id), b = Sim.benchmark(pz, { runs: RUNS, mix: MIX, seed });
    const values = b.values.map(r5);
    const advRes = Sim.playInGame(pz, adv), advStars = Core.starsFor(advRes.value, values);
    const g = grid(pz, values), draws = plainDraws(pz, values);
    const top = Core.topCut(values), median = values[Math.floor(values.length / 2)];

    const flags = [];
    if (g.best.stars < 5) flags.push('five stars out of reach: no shot in the grid matches the benchmark\'s top 10%');
    for (const d of draws) if (d.stars >= 5) flags.push(`too easy: a plain ${d.hand}hand draw to the jack already gets five stars`);
    if (Math.abs(top - median) < 1e-4) flags.push('flat benchmark: matching the middle of the field is already five stars');

    pz.bench = { physics: E.BUILD, head: Core.headHash(pz), runs: RUNS, mix: MIX, seed, values, outcomes: b.outcomes, made: new Date().toISOString().slice(0, 10) };
    pz.best = g.best;
    pz.check = { advice: { outcome: advRes.outcome, stars: advStars }, plainDraw: draws, grid: { tried: g.tried, starShare: g.bands }, flags };

    const oc = Core.OUTCOME_KEYS.filter(k => b.outcomes[k]).map(k => `${k} ${b.outcomes[k]}`).join(', ');
    console.log(`  advice (${pz.advised.hand}, ${pz.advised.kind}): aim ${deg(adv.aim)}, weight ${pct(adv.weight)} → ${advRes.outcome}, ${advStars}★`);
    console.log(`  benchmark (${RUNS} runs): ${oc}; 5★ needs ${top.toFixed(3)} or better (median ${median.toFixed(3)})`);
    console.log(`  plain draw: ${draws.map(d => `${d.hand} → ${d.outcome} ${d.stars}★`).join(', ')}`);
    console.log(`  grid (${g.tried} shots): ${g.bands.map((s, i) => `${i}★ ${pct(s)}`).join(' · ')}`);
    console.log(`  best found: ${g.best.hand}hand, aim ${deg(g.best.aim)}, weight ${pct(g.best.weight)} → ${g.best.outcome} (${g.best.value.toFixed(3)}), ${g.best.stars}★`);
    flags.forEach(f => console.log('  ⚑ ' + f));
    console.log(`  (${((Date.now() - t0) / 1000).toFixed(1)} s)`);
  }
  fs.writeFileSync(FILE, pretty(data) + '\n');
  console.log(`\nWrote ${path.relative(process.cwd(), FILE)}` + (bad ? `; ${bad} puzzle(s) not benchmarked, fix them first.` : ''));
  process.exitCode = bad ? 1 : 0;
}

// JSON with short arrays and small objects kept on one line, so the file stays readable.
function inline(v) {
  if (v === null || typeof v !== 'object') return JSON.stringify(v);
  if (Array.isArray(v)) return '[' + v.map(inline).join(v.every(x => typeof x === 'number') ? ',' : ', ') + ']';
  return '{ ' + Object.entries(v).map(([k, x]) => `${JSON.stringify(k)}: ${inline(x)}`).join(', ') + ' }';
}
function pretty(v, ind = '') {
  const one = inline(v);
  if (v === null || typeof v !== 'object' || one.length <= 110 || (Array.isArray(v) && v.every(x => typeof x === 'number'))) return one;
  const next = ind + '  ';
  if (Array.isArray(v)) return '[\n' + v.map(x => next + pretty(x, next)).join(',\n') + '\n' + ind + ']';
  return '{\n' + Object.entries(v).map(([k, x]) => `${next}${JSON.stringify(k)}: ${pretty(x, next)}`).join(',\n') + '\n' + ind + '}';
}

run();
