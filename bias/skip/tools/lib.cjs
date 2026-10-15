/* Over to You, Skip!: what the puzzle tools share. A dev tool: players never load it.
   The head check and the benchmark (used by benchmark.cjs, generate.cjs and release.cjs),
   and the files: the released catalogue in skip/puzzles/ and the queue of puzzles waiting
   for their day in queue/ (at the root of this private repo, never published).
   Every shot here is played inside the game engine, read out of index.html by engine.cjs. */
const fs = require('fs');
const path = require('path');
const Core = require('../skip-core.js');

const ROOT = path.join(__dirname, '..', '..');
const DIR = path.join(ROOT, 'skip', 'puzzles');
const INDEX = path.join(DIR, 'index.json');
const QUEUE = path.join(ROOT, 'queue');
const RUNS = 100, MIX = ['club', 'league', 'county'];

const r5 = v => Math.round(v * 1e5) / 1e5;
const fnv = s => { let h = 0x811c9dc5; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 0x01000193) >>> 0; } return h; };

let engine = null;
function load() {
  if (!engine) { const E = require('./engine.cjs').load(); engine = { E, Sim: require('../skip-sim.js').create(E) }; }
  return engine;
}

/* Is the head a legal last bowl of a singles end? Four of theirs and three of yours, all live:
   on the rink, not overlapping, the jack a legal length and on the green. A bowl in the ditch
   is allowed only as a toucher ({ "ditch": true, "toucher": true }), which is live. */
function checkHead(pz) {
  const { E, Sim } = load(), W = E.W, problems = [];
  if (!['red', 'yellow'].includes(pz.you)) problems.push('you must be "red" or "yellow"');
  const mine = pz.bowls.filter(b => b.team === pz.you).length, theirs = pz.bowls.length - mine, per = E.DISCIPLINES.singles.bowls;
  if (theirs !== per || mine !== per - 1) problems.push(`the head has ${theirs} of theirs and ${mine} of yours; the last bowl of a singles end needs ${per} and ${per - 1}`);
  for (const b of pz.bowls) if (!['red', 'yellow'].includes(b.team)) problems.push(`a bowl's team must be "red" or "yellow", not ${JSON.stringify(b.team)}`);
  const w = Sim.world(pz), jack = w.jack, mf = Sim.matFront(pz), len = jack.y - mf;
  if (len < W.JACK_MIN) problems.push(`jack is ${len.toFixed(1)} m from the mat front; the minimum is ${W.JACK_MIN} m`);
  if (jack.state !== 'rest' || jack.y >= W.GREEN_LEN) problems.push('the jack must be on the green');   // it may have been moved toward the ditch during the end
  for (const b of w.bodies) {
    if (Math.abs(b.x) > W.RINK_HALF) problems.push(`${b.kind} at x ${b.x} is outside the rink`);
    if (b.state === 'ditch') {
      if (!b.toucher) problems.push(`the bowl in the ditch at (${b.x}, ${b.y}) is not a toucher, so it would be dead`);
      if (b.y <= W.GREEN_LEN || b.y >= W.GREEN_LEN + W.DITCH_W) problems.push(`the ditch bowl at y ${b.y} is not in the front ditch (${W.GREEN_LEN}–${W.GREEN_LEN + W.DITCH_W} m)`);
    } else if (b.y <= 0 || b.y >= W.GREEN_LEN) problems.push(`${b.kind} at y ${b.y} is off the green`);
  }
  for (let i = 0; i < w.bodies.length; i++) for (let j = i + 1; j < w.bodies.length; j++) {
    const a = w.bodies[i], c = w.bodies[j];
    if ((a.state === 'ditch') !== (c.state === 'ditch')) continue;   // one on the green, one below it in the ditch
    if (Math.hypot(a.x - c.x, a.y - c.y) < a.r + c.r - 0.0005) problems.push(`${a.kind} (${a.x}, ${a.y}) overlaps ${c.kind} (${c.x}, ${c.y})`);
  }
  const s = Sim.scoreOf(w), lying = s.winner == null ? 'nobody holds shot (a tie)' : `${s.winner === Sim.ME ? pz.you + ' (you)' : (pz.you === 'red' ? 'yellow' : 'red')} lying ${s.shots}`;
  if (s.winner === Sim.ME) problems.push('you already hold shot: the puzzle is meant to start with you down');
  return { problems, lying, before: s };
}

/* Do the words match the head? The title, situation and plan notes are read for the claims they
   make, and each is checked against the head as the game scores it:
   - "Red is lying three", "red holds one", "yellow lying two!": the right side, the right count;
   - a match score ("16–14", "level at 18–18", "17–15 to red") must be the puzzle's own match;
   - "two down" / "one up" are not allowed: a bowler reads them as the count in the head, so a
     match score is always written out in full. */
const NUMS = { one: 1, two: 2, three: 3, four: 4 };
function checkWords(pz) {
  const { Sim } = load(), problems = [], s = Sim.scoreOf(Sim.world(pz));
  const them = pz.you === 'red' ? 'yellow' : 'red', holder = s.winner == null ? null : s.winner === Sim.ME ? pz.you : them;
  const texts = [['title', pz.title || ''], ['situation', pz.situation || ''], ...(pz.annotations || []).map(a => ['note', a.text])];
  for (const [where, text] of texts) {
    const ambiguous = /\b(one|two|three|four|five|six|\d+)\s+(down|up)\b/i.exec(text);
    if (ambiguous) problems.push(`${where} says "${ambiguous[0]}": write the match score out (e.g. "the match stands at 16–14 to red") so it is not read as the count in the head`);
    for (const m of text.matchAll(/\b(red|yellow)\b(?:[^.;:!?]*?)\b(?:is lying|lying|holds?|has)\s+(one|two|three|four)\b(?!\s+(?:of|bowls? (?:out|short|wide)))/gi)) {
      const team = m[1].toLowerCase(), n = NUMS[m[2].toLowerCase()];
      if (/\bhas\b/i.test(m[0]) && !/\bround the jack|\bon the jack|\bpacked|\bin the head/i.test(text.slice(m.index, m.index + m[0].length + 40))) continue;   // "has three yellows out wide" is not a count
      if (team !== holder) problems.push(`${where} says "${m[0]}", but ${holder ? holder + ' holds shot' : 'nobody holds shot'}`);
      else if (n !== s.shots) problems.push(`${where} says "${m[0]}", but ${holder} is lying ${s.shots}`);
    }
    for (const m of text.matchAll(/(\d+)\s*[–-]\s*(\d+)(\s+to\s+(red|yellow))?/g)) {
      const a = +m[1], b = +m[2], mt = pz.match;
      if (!mt) { problems.push(`${where} gives a score "${m[0]}" but the puzzle has no match`); continue; }
      if (!((a === mt.you && b === mt.them) || (a === mt.them && b === mt.you))) problems.push(`${where} says "${m[0]}", but the match is ${pz.you} ${mt.you}, ${them} ${mt.them}`);
      else if (m[4]) { const lead = mt.you > mt.them ? pz.you : mt.them > mt.you ? them : null; if (m[4].toLowerCase() !== lead || Math.max(a, b) !== a) problems.push(`${where} says "${m[0]}", but ${lead ? lead + ' leads ' + Math.max(mt.you, mt.them) + '–' + Math.min(mt.you, mt.them) : 'the match is level'}`); }
    }
  }
  return problems;
}
// The match in words, written out in full: "the match stands at 17–15 to red" / "the match level at 18–18".
function matchWords(pz) {
  const m = pz.match, them = pz.you === 'red' ? 'yellow' : 'red';
  if (!m) return '';
  if (m.you === m.them) return `with the match level at ${m.you}–${m.them}`;
  const [hi, lo, lead] = m.you > m.them ? [m.you, m.them, pz.you] : [m.them, m.you, them];
  return `and the match stands at ${hi}–${lo} to ${lead}`;
}

// Brute force: lines and weights on both hands, each shot played in the game.
function grid(pz, bench, quick) {
  const { E, Sim } = load();
  const step = quick ? 0.004 : 0.0015, wstep = quick ? 0.0125 : 0.005, span = 0.09;
  const bands = [0, 0, 0, 0, 0, 0];
  let best = null, tried = 0;
  for (const hand of ['fore', 'back']) {
    const rel = E.releasePoint(Sim.matRear(pz), hand, 'R');
    const centre = E.AI.solveDraw(Sim.prof(), pz.greenSpeed, E.biasSide(hand, 'R'), rel, pz.jack).aim;
    for (let aim = centre - span; aim <= centre + span + 1e-9; aim += step) {
      for (let weight = 0.3; weight <= 1 + 1e-9; weight += wstep) {
        const r = Sim.playInGame(pz, { hand, aim, weight }), stars = Core.starsFor(r.value, bench);
        bands[Math.floor(stars)]++; tried++;
        if (!best || r.value > best.value + 1e-9) best = { hand, aim: r5(aim), weight: r5(weight), value: r5(r.value), outcome: r.outcome, stars };
      }
    }
  }
  return { tried, bands: bands.map(n => +(n / tried).toFixed(4)), best };
}

// A plain draw to the jack on each hand: if one is already five stars, the puzzle is too easy.
function plainDraws(pz, bench) {
  const { E, Sim } = load();
  return ['fore', 'back'].map(hand => {
    const rel = E.releasePoint(Sim.matRear(pz), hand, 'R');
    const s = E.AI.solveDraw(Sim.prof(), pz.greenSpeed, E.biasSide(hand, 'R'), rel, { x: pz.jack.x, y: pz.jack.y - 0.07 });
    const r = Sim.playInGame(pz, { hand, aim: s.aim, weight: E.meterFor(s.speed) });
    return { hand, outcome: r.outcome, stars: Core.starsFor(r.value, bench) };
  });
}

/* Benchmark one puzzle in place: solve the advice into a line and weight, let the game's computer
   bowler play the last bowl 100 times (Club, League, County in turn), search the grid, and flag
   anything wrong. Writes advised.aim/weight, bench, best and check onto pz; returns a report. */
function benchmark(pz, { quick = false, seed } = {}) {
  const { E, Sim } = load();
  const head = checkHead(pz);
  if (head.problems.length) return { ok: false, head };
  const adv = Sim.solveAdvice(pz);
  Object.assign(pz.advised, { aim: r5(adv.aim), weight: r5(adv.weight) });
  seed = seed != null ? seed : fnv(pz.id);
  const b = Sim.benchmark(pz, { runs: RUNS, mix: MIX, seed });
  const values = b.values.map(r5);
  const advRes = Sim.playInGame(pz, adv), advStars = Core.starsFor(advRes.value, values);
  const g = grid(pz, values, quick), draws = plainDraws(pz, values);
  const top = Core.topCut(values), median = values[Math.floor(values.length / 2)];
  const flags = [];
  if (g.best.stars < 5) flags.push('five stars out of reach: no shot in the grid matches the benchmark\'s top 10%');
  for (const d of draws) if (d.stars >= 5) flags.push(`too easy: a plain ${d.hand}hand draw to the jack already gets five stars`);
  if (Math.abs(top - median) < 1e-4) flags.push('flat benchmark: matching the middle of the field is already five stars');
  pz.bench = { physics: E.BUILD, head: Core.headHash(pz), runs: RUNS, mix: MIX, seed, values, outcomes: b.outcomes, made: new Date().toISOString().slice(0, 10) };
  pz.best = g.best;
  pz.check = { advice: { outcome: advRes.outcome, stars: advStars }, plainDraw: draws, grid: { tried: g.tried, starShare: g.bands, quick: quick || undefined }, flags };
  return { ok: !flags.length, head, adv, advRes, advStars, b, g, draws, top, median, flags, shots: b.shots };
}
// The advice as line and weight, and what it earns against the stored benchmark (after the advice is rewritten).
function checkAdvice(pz) {
  const { Sim } = load(), adv = Sim.solveAdvice(pz);
  Object.assign(pz.advised, { aim: r5(adv.aim), weight: r5(adv.weight) });
  const r = Sim.playInGame(pz, adv), stars = Core.starsFor(r.value, pz.bench.values);
  pz.check.advice = { outcome: r.outcome, stars };
  pz.bench.head = Core.headHash(pz);
  return { adv, advRes: r, advStars: stars };
}
// Is the stored benchmark still good for this head on this physics?
function benchFresh(pz) { const { E } = load(); return !!(pz.bench && pz.bench.physics === E.BUILD && pz.bench.head === Core.headHash(pz)); }

// ---------- files ----------
// JSON with short arrays and small objects kept on one line, so the files stay readable.
function inline(v) {
  if (v === null || typeof v !== 'object') return JSON.stringify(v);
  if (Array.isArray(v)) return '[' + v.map(inline).join(v.every(x => typeof x === 'number') ? ',' : ', ') + ']';
  return '{ ' + Object.entries(v).filter(([, x]) => x !== undefined).map(([k, x]) => `${JSON.stringify(k)}: ${inline(x)}`).join(', ') + ' }';
}
function pretty(v, ind = '') {
  const one = inline(v);
  if (v === null || typeof v !== 'object' || one.length <= 110 || (Array.isArray(v) && v.every(x => typeof x === 'number'))) return one;
  const next = ind + '  ';
  if (Array.isArray(v)) return '[\n' + v.map(x => next + pretty(x, next)).join(',\n') + '\n' + ind + ']';
  return '{\n' + Object.entries(v).filter(([, x]) => x !== undefined).map(([k, x]) => `${next}${JSON.stringify(k)}: ${pretty(x, next)}`).join(',\n') + '\n' + ind + '}';
}
const readJson = f => JSON.parse(fs.readFileSync(f, 'utf8'));
const writeJson = (f, v) => { fs.mkdirSync(path.dirname(f), { recursive: true }); fs.writeFileSync(f, pretty(v) + '\n'); };

// The catalogue's index: one line per released puzzle, oldest first.
const ABOUT = 'Over to You, Skip!: the released puzzles, one a day from 2026-10-15 (#1). #N comes out at 06:00 London on START + (N - 1) days; the page never shows an entry before its date. Each puzzle is in NNNN.json. Written by skip/tools/release.cjs.';
function readIndex(file = INDEX) { return fs.existsSync(file) ? readJson(file) : { about: ABOUT, start: Core.START, puzzles: [] }; }
function writeIndex(idx, file = INDEX) {
  const lines = idx.puzzles.map(e => '    ' + inline(e));
  const head = `{\n  "about": ${JSON.stringify(idx.about || ABOUT)},\n  "start": ${JSON.stringify(idx.start || Core.START)},\n  "puzzles": [\n`;
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, head + lines.join(',\n') + (lines.length ? '\n' : '') + '  ]\n}\n');
}
const puzzlePath = (n, dir = DIR) => path.join(dir, Core.puzzleFile(n));
// The index line for a puzzle: what the puzzles screen lists, without loading the puzzle.
function indexEntry(pz) {
  const e = { n: pz.n, date: pz.date, id: pz.id, title: pz.title, theme: pz.theme || '', green: pz.greenSpeed, conditions: pz.conditions || '' };
  if (pz.classic) e.classic = pz.classic;
  return e;
}
// The queue: puzzles waiting for their day, oldest first (by "queued", then file name).
function readQueue(dir = QUEUE) {
  if (!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir).filter(f => /\.json$/.test(f)).map(f => ({ file: path.join(dir, f), pz: readJson(path.join(dir, f)) }))
    .sort((a, b) => String(a.pz.queued || '').localeCompare(String(b.pz.queued || '')) || a.file.localeCompare(b.file));
}

module.exports = { ROOT, DIR, INDEX, QUEUE, RUNS, MIX, r5, fnv, load, checkHead, checkWords, matchWords, grid, plainDraws, benchmark, checkAdvice, benchFresh,
  inline, pretty, readJson, writeJson, readIndex, writeIndex, puzzlePath, indexEntry, readQueue };
