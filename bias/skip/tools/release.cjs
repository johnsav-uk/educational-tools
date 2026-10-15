/* Over to You, Skip!: release the next day's puzzle. Run by .github/workflows/skip-release.yml
   every night, hours before the 06:00 London switch; safe to run by hand, and to run twice.

     node skip/tools/release.cjs                  make sure tomorrow's puzzle day has its puzzle
     node skip/tools/release.cjs --day 2026-11-02 … up to and including that puzzle day
     node skip/tools/release.cjs --dry            say what it would do, write nothing

   Every puzzle day from the last one in the catalogue up to the target gets one puzzle: the
   oldest in queue/, numbered by its date and given the id skip-NNNN. A queued puzzle benchmarked
   on other physics (bench.physics ≠ BUILD) or edited since (bench.head ≠ headHash) is
   benchmarked again first, and dropped if it no longer passes. With the queue empty it
   generates one on the spot; if even that fails it re-releases an archive puzzle as a dated
   "Classic", so there is never a blank day, and exits with an error so GitHub emails the owner.
   The page never shows a puzzle before its date, so releasing early is safe. */
const fs = require('fs');
const path = require('path');
const Core = require('../skip-core.js');
const { indexEntry: entry } = require('./lib.cjs');

/* The release step as a pure function: catalogue + queue + day → new catalogue.
   index: [{ n, date, id, … }]; queue: [{ key, pz }] oldest first; day: the last puzzle day to fill.
   fresh(pz) says whether a queued puzzle's benchmark is current; rebench(pz) returns it benchmarked
   again, or null if it no longer passes; generate() returns a new puzzle or null; archived(n)
   returns released puzzle n in full (for a Classic). Returns { index, released, used, dropped, fallback }. */
function plan({ index, queue, day, fresh, rebench, generate, archived, start = Core.START }) {
  const out = index.slice(), released = [], used = [], dropped = [], q = queue.slice();
  let fallback = false;
  const lastDate = out.length ? out.reduce((a, e) => e.date > a ? e.date : a, out[0].date) : Core.addDays(start, -1);
  for (let d = Core.addDays(lastDate, 1); d <= day; d = Core.addDays(d, 1)) {
    const n = Core.issueNumber(d, start);
    let pz = null, source = 'queue';
    while (!pz && q.length) {
      const item = q.shift();
      if (fresh(item.pz)) { pz = item.pz; used.push(item.key); break; }
      const again = rebench(item.pz);
      if (again) { pz = again; used.push(item.key); source = 'queue, benchmarked again'; }
      else { dropped.push(item.key); used.push(item.key); }
    }
    if (!pz) { pz = generate(); source = 'generated on the spot'; }
    if (!pz) {
      const originals = out.filter(e => !e.classic);
      if (!originals.length) throw new Error(`nothing to release for ${d}: the queue is empty, generating failed, and there is no archive`);
      const from = originals[(n - 1) % originals.length];
      pz = Object.assign({}, archived(from.n), { classic: from.n });
      pz.title = 'Classic: ' + pz.title.replace(/^Classic: /, '');
      source = `classic re-release of #${from.n}`; fallback = true;
    }
    const full = Object.assign({ n, date: d, id: Core.generatedId(n) }, pz, { n, date: d, id: Core.generatedId(n) });
    delete full.queued;
    out.push(entry(full));
    released.push({ n, date: d, pz: full, source });
  }
  return { index: out, released, used, dropped, fallback };
}
function main() {
  const L = require('./lib.cjs'), G = require('./generate.cjs');
  const args = process.argv.slice(2), opt = k => { const i = args.indexOf(k); return i >= 0 ? args[i + 1] : null; };
  const dry = args.includes('--dry');
  const day = opt('--day') || Core.addDays(Core.puzzleDay(Date.now()), 1);
  if (!Core.isDate(day)) throw new Error('--day wants YYYY-MM-DD');
  const idx = L.readIndex(), queue = L.readQueue().map(x => ({ key: x.file, pz: x.pz }));
  const known = G.known();
  const res = plan({
    index: idx.puzzles, queue, day,
    fresh: L.benchFresh,
    rebench: pz => {
      console.log(`  ${pz.id}: benchmark is stale (physics ${pz.bench && pz.bench.physics}), benchmarking again`);
      const rep = L.benchmark(pz, { quick: true, seed: pz.gen ? pz.gen.seed : undefined });
      if (!rep.ok) { console.log(`  dropped ${pz.id}: ${rep.head && rep.head.problems.length ? rep.head.problems[0] : rep.flags[0]}`); return null; }
      return pz;
    },
    generate: () => {
      let seed = Date.now() % 1e9;
      for (let i = 0; i < 60; i++) { const r = G.make(++seed, known); if (r.pz) { known.push({ name: r.pz.id, shape: G.shape(r.pz) }); return r.pz; } }
      return null;
    },
    archived: n => L.readJson(L.puzzlePath(n))
  });
  if (!res.released.length) { console.log(`Nothing to do: the catalogue already reaches ${idx.puzzles[idx.puzzles.length - 1].date} (target ${day}).`); return; }
  for (const r of res.released) console.log(`#${r.n} for ${r.date}: ${r.pz.title} (${r.source})`);
  if (res.dropped.length) console.log(`Dropped from the queue: ${res.dropped.map(f => path.basename(f)).join(', ')}`);
  if (dry) { console.log('(dry run: nothing written)'); return; }
  for (const r of res.released) L.writeJson(L.puzzlePath(r.n), r.pz);
  L.writeIndex(Object.assign(idx, { puzzles: res.index }));
  for (const f of res.used) fs.rmSync(f, { force: true });
  console.log(`Queue left: ${L.readQueue().length}.`);
  if (res.fallback) { console.error('The queue was empty and generating failed: a Classic was re-released. Run skip-generate.'); process.exitCode = 1; }
}

if (require.main === module) main();
module.exports = { plan };
