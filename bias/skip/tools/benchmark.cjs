/* Over to You, Skip!: benchmark and check puzzles. A dev tool: players never load it.

     node skip/tools/benchmark.cjs                    every released and queued puzzle whose benchmark is stale
     node skip/tools/benchmark.cjs --all              every one, stale or not
     node skip/tools/benchmark.cjs 3 12               released puzzles #3 and #12
     node skip/tools/benchmark.cjs queue/x.json       one file
     node skip/tools/benchmark.cjs --quick            a coarser shot grid, for drafting

   Every shot here is played inside the game engine (Game.startPuzzle and the game's own
   delivery), read out of index.html by engine.cjs. For each puzzle it
     1. checks the head: four of theirs and three of yours (singles, the last bowl of the end),
        bowls on the rink and not overlapping, a bowl in the ditch only as a toucher, the jack a
        legal length, and who is lying how many (compare that with the situation text);
     2. works out the advice as line and weight (advised.aim / advised.weight);
     3. plays the benchmark: the game's computer bowler takes the last bowl 100 times
        (Club, League and County in turn, each choosing its own shot on either hand and
        delivering with its own scatter), and stores the 100 results the stars are measured
        against (bench);
     4. brute-forces a grid of lines and weights on both hands, each shot played in the game,
        and reports the best result found, the share of tried shots at each star level, and
        anything that looks wrong: five stars out of reach, a plain draw already worth five
        stars, a flat benchmark.
   Results are written back into each puzzle's file. Re-benchmarking a released puzzle changes
   what its stars mean, so only do it after a physics change (BUILD). */
const fs = require('fs');
const path = require('path');
const Core = require('../skip-core.js');
const L = require('./lib.cjs');

const args = process.argv.slice(2), quick = args.includes('--quick'), all = args.includes('--all'), only = args.filter(a => !a.startsWith('--'));
const deg = r => (r * 180 / Math.PI).toFixed(2) + '°';
const pct = v => (v * 100).toFixed(0) + '%';

function files() {
  if (only.length) return only.map(a => /^\d+$/.test(a) ? L.puzzlePath(+a) : path.resolve(a));
  return L.readIndex().puzzles.map(e => L.puzzlePath(e.n)).concat(L.readQueue().map(q => q.file));
}

function run() {
  const { E } = L.load();
  let bad = 0, done = 0;
  for (const file of files()) {
    const pz = L.readJson(file);
    if (!only.length && !all && L.benchFresh(pz)) continue;
    const t0 = Date.now();
    console.log(`\n${path.relative(L.ROOT, file)} · ${pz.id}: ${pz.title}`);
    // a released puzzle keeps the seed it was first benchmarked with; a generated one uses its generator seed
    const rep = L.benchmark(pz, { quick, seed: pz.bench ? pz.bench.seed : pz.gen ? pz.gen.seed : undefined });
    console.log(`  head: ${rep.head.lying}, green ${pz.greenSpeed} s (${E.GreenSpeed.label(pz.greenSpeed).toLowerCase()})`);
    if (rep.head.problems.length) { bad++; rep.head.problems.forEach(p => console.log('  ✗ ' + p)); continue; }
    const oc = Core.OUTCOME_KEYS.filter(k => rep.b.outcomes[k]).map(k => `${k} ${rep.b.outcomes[k]}`).join(', ');
    console.log(`  advice (${pz.advised.hand}, ${pz.advised.kind}): aim ${deg(rep.adv.aim)}, weight ${pct(rep.adv.weight)} → ${rep.advRes.outcome}, ${rep.advStars}★`);
    console.log(`  benchmark (${L.RUNS} runs): ${oc}; 5★ needs ${rep.top.toFixed(3)} or better (median ${rep.median.toFixed(3)})`);
    console.log(`  plain draw: ${rep.draws.map(d => `${d.hand} → ${d.outcome} ${d.stars}★`).join(', ')}`);
    console.log(`  grid (${rep.g.tried} shots): ${rep.g.bands.map((s, i) => `${i}★ ${pct(s)}`).join(' · ')}`);
    console.log(`  best found: ${rep.g.best.hand}hand, aim ${deg(rep.g.best.aim)}, weight ${pct(rep.g.best.weight)} → ${rep.g.best.outcome} (${rep.g.best.value.toFixed(3)}), ${rep.g.best.stars}★`);
    rep.flags.forEach(f => console.log('  ⚑ ' + f));
    console.log(`  (${((Date.now() - t0) / 1000).toFixed(1)} s)`);
    L.writeJson(file, pz); done++;
  }
  console.log(`\nBenchmarked ${done} puzzle(s)` + (bad ? `; ${bad} not benchmarked, fix them first.` : '.'));
  process.exitCode = bad ? 1 : 0;
}

run();
