/* Over to You, Skip!: the catalogue, the release step and the generator (Node only). */
const fs = require('fs');
const path = require('path');
module.exports = function (T) {
  const { test, eq, ok } = T;
  const Core = require('../skip-core.js');
  const L = require('../tools/lib.cjs');
  const { plan } = require('../tools/release.cjs');
  const G = require('../tools/generate.cjs');
  const idx = L.readIndex();

  // ---------- the published catalogue ----------
  test('catalogue: one puzzle per day from #1, each numbered by its date, each file matching its index line', () => {
    ok(idx.puzzles.length >= 5);
    idx.puzzles.forEach((e, i) => {
      eq([e.n, e.date], [i + 1, Core.dateFor(i + 1)], 'entry ' + i);
      const pz = L.readJson(L.puzzlePath(e.n));
      eq(L.indexEntry(pz), e, `#${e.n}: the index line is the puzzle's own`);
      ok(Core.isDate(pz.date) && /^[a-z0-9][a-z0-9-]{0,39}$/.test(pz.id), `#${e.n} id ${pz.id}`);
      eq(L.checkHead(pz).problems, [], `#${e.n} is a legal head`);
    });
    eq(new Set(idx.puzzles.map(e => e.id)).size, idx.puzzles.length, 'ids are unique');
  });
  test('catalogue: #1 to #5 are the hand-made puzzles the old rotation served, under their old ids', () => {
    const rotation = ['red-lying-three', 'rain-on-the-green', 'the-long-jack', 'rest-on-the-shot', 'short-and-wide'];
    for (let n = 1; n <= 5; n++) eq(idx.puzzles[n - 1].id, rotation[Core.puzzleIndex(Core.dateFor(n), 5)], '#' + n);
    for (const e of idx.puzzles.slice(5)) ok(e.id === Core.generatedId(e.n), `#${e.n} is ${Core.generatedId(e.n)}`);
  });
  test('catalogue: nothing unreleased is published (the queue stays in this repo)', () => {
    const attrs = fs.readFileSync(path.join(L.ROOT, '.gitattributes'), 'utf8');
    ok(/^\/queue\s+export-ignore/m.test(attrs), '/queue export-ignore');
    for (const f of fs.readdirSync(L.DIR)) ok(/^(index|\d{4})\.json$/.test(f), 'published file ' + f);
    ok(!fs.existsSync(path.join(L.ROOT, 'skip', 'puzzles.json')), 'the old rotation file is retired');
  });

  test('words: every released and queued puzzle says what its head shows', () => {
    const all = idx.puzzles.map(e => L.readJson(L.puzzlePath(e.n))).concat(L.readQueue().map(x => x.pz));
    for (const pz of all) eq(L.checkWords(pz), [], `${pz.id}: ${pz.situation}`);
  });
  test('words: the check catches a blurb that does not match the head', () => {
    const pz = L.readJson(L.puzzlePath(2));   // red lying three, the match 17–15 to red
    const said = situation => L.checkWords(Object.assign({}, pz, { situation }));
    ok(said('Last end and yellow is two down. Red has three packed tight round the jack.').some(p => /two down/.test(p)), 'the old #2 text: "two down" is read as the count');
    ok(said('Red is lying two.').some(p => /lying 3/.test(p)), 'the wrong count');
    ok(said('Yellow holds one.').some(p => /red holds shot/.test(p)), 'the wrong side');
    ok(said('Last end, and the match stands at 16–14 to red.').some(p => /the match is/.test(p)), 'the wrong score');
    ok(said('Last end, and the match stands at 17–15 to yellow.').some(p => /red leads 17–15/.test(p)), 'the wrong leader');
    eq(said('Last end, and the match stands at 17–15 to red. Red is lying three, packed tight round the jack.'), []);
    eq(L.checkWords(Object.assign({}, pz, { annotations: [{ text: 'yellow lying two' }] })).length, 1, 'notes on the plan are checked too');
  });

  // ---------- the release step, as a pure function ----------
  const q = (k, extra = {}) => ({ key: k, pz: Object.assign({ id: 'gen-' + k, title: 'Queued ' + k, greenSpeed: 13, queued: '2026-10-1' + k, bench: { physics: 'B', head: 'h' } }, extra) });
  const base = [1, 2, 3].map(n => ({ n, date: Core.dateFor(n), id: 'old-' + n, title: 'Old ' + n, theme: '', green: 13, conditions: '' }));
  const opts = (more = {}) => Object.assign({ index: base, queue: [q(1), q(2), q(3)], day: Core.dateFor(4), fresh: pz => pz.bench.physics === 'B',
    rebench: () => null, generate: () => null, archived: n => ({ n, id: 'old-' + n, title: 'Old ' + n, greenSpeed: 13, bowls: [] }) }, more);
  test('release: the oldest queued puzzle takes the next day, with its number and id', () => {
    const r = plan(opts());
    eq(r.released.map(x => [x.n, x.date, x.pz.id, x.pz.title]), [[4, '2026-10-18', 'skip-0004', 'Queued 1']]);
    eq(r.index.length, 4); eq(r.used, [1]); eq(r.released[0].pz.queued, undefined, 'the queue stamp is dropped');
    eq(r.index[3], { n: 4, date: '2026-10-18', id: 'skip-0004', title: 'Queued 1', theme: '', green: 13, conditions: '' });
  });
  test('release: running twice releases one puzzle', () => {
    const a = plan(opts()), b = plan(opts({ index: a.index, queue: [q(2), q(3)] }));
    eq(b.released.length, 0); eq(b.index, a.index);
  });
  test('release: a late run fills every missed day up to the target', () => {
    const r = plan(opts({ day: Core.dateFor(6) }));
    eq(r.released.map(x => [x.n, x.pz.title]), [[4, 'Queued 1'], [5, 'Queued 2'], [6, 'Queued 3']]);
  });
  test('release: a stale benchmark is never released as it is', () => {
    let asked = 0;
    const stale = q(1, { bench: { physics: 'OLD', head: 'h' } });
    const r = plan(opts({ queue: [stale, q(2)], rebench: pz => { asked++; return null; } }));
    eq(asked, 1); eq(r.dropped, [1]); eq(r.released[0].pz.title, 'Queued 2', 'dropped, the next one goes out');
    const r2 = plan(opts({ queue: [stale], rebench: pz => Object.assign({}, pz, { bench: { physics: 'B' }, title: 'Re-benched' }) }));
    eq(r2.released[0].pz.title, 'Re-benched'); eq(r2.released[0].source, 'queue, benchmarked again');
  });
  test('release: an empty queue generates on the spot, and failing that re-releases a Classic', () => {
    const g = plan(opts({ queue: [], generate: () => ({ id: 'gen-x', title: 'Fresh', greenSpeed: 12 }) }));
    eq([g.released[0].pz.title, g.released[0].source, g.fallback], ['Fresh', 'generated on the spot', false]);
    const c = plan(opts({ queue: [] }));
    eq([c.released[0].pz.id, c.released[0].pz.title, c.released[0].pz.classic, c.fallback], ['skip-0004', 'Classic: Old 1', 1, true]);
    eq(c.index[3].classic, 1);
  });

  // ---------- the generator ----------
  test('generator: the same seed makes the same end', () => {
    const a = G.playEnd(G.setting(2)), b = G.playEnd(G.setting(2));
    ok(a.pz, 'seed 2 reaches its last bowl'); eq(a, b);
    ok(JSON.stringify(G.playEnd(G.setting(3))) !== JSON.stringify(a), 'another seed, another end');
  });
  test('generator: a near-copy of a known head is rejected, mirrored or not', () => {
    const pz = Object.assign({ id: 'x' }, G.playEnd(G.setting(2)).pz);
    eq(G.screen(pz, []), null, 'seed 2 passes the screen on its own');
    const nudged = JSON.parse(JSON.stringify(pz)); nudged.bowls.forEach(b => { b.x += 0.02; b.y -= 0.02; }); nudged.jack.x += 0.02; nudged.jack.y -= 0.02;
    ok(/near-copy/.test(G.screen(nudged, [{ name: '#9', shape: G.shape(pz) }])), 'within a few cm');
    const mirror = JSON.parse(JSON.stringify(pz)); mirror.jack.x = -mirror.jack.x; mirror.bowls.forEach(b => { b.x = -b.x; });
    ok(/near-copy/.test(G.screen(mirror, [{ name: '#9', shape: G.shape(pz) }])), 'mirrored');
    const away = (h, b, d) => { const dx = b.x - h.jack.x, dy = b.y - h.jack.y, k = Math.hypot(dx, dy); b.x = h.jack.x + dx / k * (k + d); b.y = h.jack.y + dy / k * (k + d); };   // out along the line from the jack
    const moved = JSON.parse(JSON.stringify(pz)); away(moved, moved.bowls[0], 0.3);
    eq(G.screen(moved, [{ name: '#9', shape: G.shape(pz) }]), null, 'one bowl 30 cm away is a different puzzle');
  });
  test('generator: the screen rejects a head with the player holding shot, or spread too wide', () => {
    const pz = Object.assign({ id: 'x' }, G.playEnd(G.setting(2)).pz);
    const hold = JSON.parse(JSON.stringify(pz));
    for (const b of hold.bowls) if (b.team !== hold.you) b.y += 1.2;   // theirs all moved a long way back
    ok(/already hold shot/.test(G.screen(hold, []) || ''), G.screen(hold, []));
    const wide = JSON.parse(JSON.stringify(pz)), far = wide.bowls[0];
    { const dx = far.x - wide.jack.x, dy = far.y - wide.jack.y, k = Math.hypot(dx, dy); far.x = wide.jack.x + dx / k * 1.9; far.y = wide.jack.y + dy / k * 1.9; }
    ok(/more than 1.6 m/.test(G.screen(wide, []) || ''), G.screen(wide, []));
  });
  test('generator: every generated puzzle, queued or released, passed its checks', () => {
    const all = idx.puzzles.slice(5).map(e => L.readJson(L.puzzlePath(e.n))).concat(L.readQueue().map(x => x.pz)).filter(p => p.gen);
    for (const pz of all) {
      eq(L.checkHead(pz).problems, [], pz.id + ' is legal');
      eq(L.checkHead(pz).before.winner, 1, pz.id + ': the player starts down');
      ok(pz.best.stars === 5, pz.id + ': five stars can be reached');
      ok(pz.check.plainDraw.every(d => d.stars < 5), pz.id + ': a plain draw is below five');
      eq(pz.check.flags, [], pz.id + ' has no flags');
      for (const b of pz.bowls) ok(!b.ditch || b.toucher, pz.id + ': only touchers in the ditch');
    }
  });
};
