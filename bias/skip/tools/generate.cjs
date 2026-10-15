/* Over to You, Skip!: make new puzzles by letting the game play. A dev tool: players never load it.

     node skip/tools/generate.cjs                 top the queue up to 21 puzzles
     node skip/tools/generate.cjs --target 30     … up to 30
     node skip/tools/generate.cjs --count 3       make 3 more, whatever the queue holds
     node skip/tools/generate.cjs --seed 12345    make the puzzle for one seed (and show why it was kept or not)
     node skip/tools/generate.cjs --dry           make them, but write nothing

   Each puzzle is a real end: two of the game's computer bowlers play a singles end against each
   other inside the game (Game in instant mode, each delivery planned by aiPlan, scattered by
   aiApplyScatter and played through the game's own delivery path), on a green, mat and jack
   chosen from the seed. The end stops before its last bowl: the side bowling last is the player,
   with four of theirs and three of yours in the head.

   A head is thrown away if it is illegal (checkHead), has any dead bowl (a bowl in the ditch is
   kept only as a toucher, which is live), has the player already holding shot, is spread more
   than 1.6 m from the jack, or is a near-copy of a puzzle already released or queued. The rest are
   benchmarked exactly as benchmark.cjs does (with the quick grid) and kept only if five stars can
   be reached, a plain draw is not five stars, and the benchmark is not flat. The words (title,
   situation, hint, notes, advice) are written from the head and the benchmark, and checked
   against it (lib.checkWords). Same seed, same puzzle. Kept puzzles go to queue/, where release.cjs takes them, oldest first. */
const fs = require('fs');
const path = require('path');
const Core = require('../skip-core.js');
const L = require('./lib.cjs');

const VERSION = 1;
const SPREAD = 1.6;          // every bowl within this of the jack, so the plan can show the head at a useful scale
const DUP = 0.05;            // two heads whose bowls all lie within 5 cm of each other are the same puzzle

function rng(seed) {   // mulberry32, as the game uses
  let a = seed >>> 0;
  return () => { a = (a + 0x6D2B79F5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}
const pick = (r, list) => list[Math.floor(r() * list.length)];
const cap = s => s.charAt(0).toUpperCase() + s.slice(1);
const r3 = v => Math.round(v * 1000) / 1000, r4 = v => Math.round(v * 10000) / 10000;   // positions to 0.1 mm, so bowls that touch still do
const NUM = ['no', 'one', 'two', 'three', 'four'];

// ---------- the setting: everything an end depends on, from the seed ----------
function setting(seed) {
  const r = rng(seed), E = L.load().E;
  const T = 10 + 0.5 * Math.floor(r() * 12);                     // 10 to 15.5 s
  const levels = ['club', 'league', 'county'];
  const ends = pick(r, [18, 21, 21, 21]), down = pick(r, [0, 0, 1, 1, 2, 3]), base = 8 + Math.floor(r() * (ends - 6));
  return {
    seed, T, matRear: r3(E.W.MAT_MIN + pick(r, [0, 0, 0, 0.5, 1, 1.5, 2])), leader: r() < 0.5 ? 0 : 1, mirror: r() < 0.5,
    levels: [pick(r, levels), pick(r, levels)], you: r() < 0.5 ? 'red' : 'yellow',
    match: { ends, end: ends, down, base }, by: pick(r, ['your third', 'your third', 'your second', 'your lead']), words: Math.floor(r() * 1e9)
  };
}

/* Play the end in the game until the last bowl is due. Returns the head as it lies, or why not. */
function playEnd(st) {
  const { E } = L.load();
  E.setSeed(st.seed ^ 0x9e3779b9);
  const ui = new Proxy({ notice: (t, d, l, go) => go(), summary: (a, go) => go() }, { get: (t, k) => k in t ? t[k] : () => {} });
  const g = new E.Game(ui, { instant: true });
  const keepArm = E.Settings.arm; E.Settings.arm = 'R';
  try {
    const mk = name => ({ name, profileId: 'dp-pro', colour: 'claret', members: [{ name }] });
    const ais = st.levels.map(id => ({ side: 0, level: E.aiLevel(id), est: null }));
    let stopped = false;
    g.isAI = () => g.mode === 'match';
    const aiStart = g.aiStart.bind(g);
    g.aiStart = function () {
      const a = ais[this.turn.player], lv = a.level;
      if (!a.est) a.est = { T: Math.min(17, Math.max(10, st.T + aiGaussLike(st, this.turn.player) * lv.greenSD)), biasF: 1 };
      a.side = this.turn.player; this.ai = a; aiStart();
    };
    const beginJack = g.beginJack.bind(g);
    g.beginJack = function (p) { this.matRear = st.matRear; beginJack(p); };
    const beginBowl = g.beginBowl.bind(g);
    g.beginBowl = function (p, mi = 0) {
      if (this.order.length && this.orderIdx === this.order.length - 1) { stopped = true; this.turn = { kind: 'bowl', player: p, member: mi }; this.phase = 'aim'; return; }
      beginBowl(p, mi);
    };
    g.startMatch({ players: [mk('A'), mk('B')], T: st.T, format: { type: 'ends', n: st.match.ends }, discipline: E.DISCIPLINES.singles, leader: st.leader, ai: st.levels[1] });
    g.endNo = st.match.end;   // the last end, with the player (bowling last) down or level: the computer bowlers play it as such
    g.players[1 - st.leader].score = st.match.base - st.match.down; g.players[st.leader].score = st.match.base;
    let guard = 0;
    while (!stopped && g.timers.length && guard++ < 200) g.flush();
    if (!stopped) return { why: 'the end did not reach its last bowl' + (g.match.jackAttempt ? ' (the jack was re-delivered)' : '') };
    const you = g.turn.player, them = 1 - you;
    if (g.order[g.order.length - 1][0] !== you) return { why: 'the last bowl is not the player\'s' };
    const live = g.world.bodies.filter(b => !b.dead);
    const jack = g.world.jack, bowls = live.filter(b => b.kind === 'bowl');
    if (!jack || jack.state !== 'rest') return { why: 'the jack is in the ditch' };
    const nYou = bowls.filter(b => b.owner === you).length, nThem = bowls.length - nYou;
    if (nThem !== 4 || nYou !== 3) return { why: `a dead bowl: ${nThem} of theirs and ${nYou} of yours are live` };
    const m = st.mirror ? -1 : 1, other = st.you === 'red' ? 'yellow' : 'red', team = b => b.owner === you ? st.you : other;
    const pz = {
      you: st.you, greenSpeed: st.T, matRear: st.matRear,
      jack: { x: r4(m * jack.x) + 0, y: r4(jack.y) },
      bowls: bowls.sort((a, b) => (a.owner === you) - (b.owner === you) || a.id - b.id).map(b => {
        const o = { team: team(b), x: r4(m * b.x) + 0, y: r4(b.y), heading: r3(m * b.heading) + 0 };
        if (b.state === 'ditch') o.ditch = true;
        if (b.toucher) o.toucher = true;   // chalked: it stays live if it is knocked into the ditch
        return o;
      })
    };
    if (pz.matRear === E.W.MAT_MIN) delete pz.matRear;
    return { pz, levels: { you: st.levels[you], them: st.levels[them] } };
  } finally { E.Settings.arm = keepArm; }
}
// Each side's first misreading of the green, fixed by the seed (the game draws it from its own random stream).
function aiGaussLike(st, side) { const r = rng(st.seed * 31 + side + 7); let u = 0; while (u === 0) u = r(); return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * r()); }

// ---------- the checks a generated head has to pass before it is benchmarked ----------
function shape(pz) {   // the head as a fingerprint: the jack, and each side's bowls relative to it, sorted
  const rel = m => pz.bowls.map(b => [b.team === pz.you ? 1 : 0, r3(m * (b.x - pz.jack.x)), r3(b.y - pz.jack.y)]).sort((a, b) => a[0] - b[0] || a[1] - b[1] || a[2] - b[2]);
  return { jack: pz.jack, right: rel(1), left: rel(-1) };
}
function sameHead(a, b) {
  if (Math.abs(a.jack.y - b.jack.y) > 0.3) return false;
  const close = (p, q) => p.length === q.length && p.every((x, i) => x[0] === q[i][0] && Math.abs(x[1] - q[i][1]) < DUP && Math.abs(x[2] - q[i][2]) < DUP);
  return close(a.right, b.right) || close(a.right, b.left);   // a mirrored copy is the same puzzle for a left-hander
}
function screen(pz, known) {
  const { E, Sim } = L.load();
  const head = L.checkHead(pz);
  if (head.problems.length) return head.problems[0];
  for (const b of pz.bowls) if (b.ditch && !b.toucher) return 'a bowl in the ditch that is not a toucher';
  const w = Sim.world(pz), J = w.jack;
  for (const b of w.bodies) if (b.kind === 'bowl' && E.Rules.dist(b, J) > SPREAD) return `a bowl ${E.Rules.dist(b, J).toFixed(2)} m from the jack (more than ${SPREAD} m)`;
  if (head.before.winner == null) return 'nobody holds shot';
  const s = shape(pz);
  for (const k of known) if (sameHead(s, k.shape)) return `a near-copy of ${k.name}`;
  return null;
}

// ---------- the words, from the head ----------
function describe(pz, st, bench) {
  const { E, Sim } = L.load(), r = rng(st.words);
  const w = Sim.world(pz), J = w.jack, sc = E.Rules.score(w.bodies.filter(b => !b.dead), J);
  const them = pz.you === 'red' ? 'yellow' : 'red', Them = cap(them), count = sc.shots;
  const theirs = sc.ranked.filter(e => e.b.owner !== Sim.ME), mine = sc.ranked.filter(e => e.b.owner === Sim.ME);
  const T = pz.greenSpeed, label = E.GreenSpeed.label(T).toLowerCase(), len = J.y - Sim.matFront(pz);
  const ditch = pz.bowls.find(b => b.ditch), ditchTeam = ditch && ditch.team === pz.you ? 'your' : ditch ? them : '';
  const shotB = theirs[0].b, cm = d => Math.round(d * 100);
  const side = x => x - J.x > 0.12 ? 'forehand' : x - J.x < -0.12 ? 'backhand' : '';
  // a guard: one of theirs well short of the jack, near the line in
  const guard = theirs.map(e => e.b).find(b => b.state !== 'ditch' && J.y - b.y > 0.7 && Math.abs(b.x - J.x) < 0.6);
  const conditions = T <= 11.5 ? 'rain' : T <= 12.5 ? 'overcast' : T >= 15 ? 'sunshine' : '';

  // title
  const mod = conditions === 'rain' ? 'heavy green' : ditch ? 'toucher in the ditch' : len >= 31 ? 'long jack' : len <= 25.5 ? 'short jack' : guard ? 'behind the guard' : T >= 14.5 ? 'fast green' : '';
  const title = `${Them} lying ${NUM[count] || count}` + (mod ? `, ${mod}` : '');

  // situation
  const m = st.match, down = m.down;
  // the match score written out in full: "two down" would be read as the count in the head
  const score = `Last end, ${L.matchWords({ you: pz.you, match: { you: m.base - down, them: m.base } })}.`;
  const where = b => {
    const dy = b.y - J.y, dx = b.x - J.x, d = E.Rules.dist(b, J);
    if (b.state === 'ditch') return 'in the ditch, chalked';
    if (d < 0.015) return 'touching the jack';
    const ud = Math.abs(dy) < 0.08 ? 'jack high' : dy < 0 ? 'short of the jack' : 'behind the jack';
    const lr = Math.abs(dx) < 0.12 ? '' : dx > 0 ? ' on the forehand side' : ' on the backhand side';
    return `${cm(d)} cm away, ${ud}${lr}`;
  };
  const bits = [score];
  bits.push(`${Them} ${count === 1 ? 'holds one' : `is lying ${NUM[count]}`}, the shot bowl ${where(shotB)}${shotB.toucher && shotB.state !== 'ditch' ? ' (a chalked toucher)' : ''}.`);
  if (guard && guard !== shotB) bits.push(`A ${them} guard sits short on the ${side(guard.x) || 'line'}${side(guard.x) ? ' side' : ''}.`);
  if (ditch) bits.push(`${ditchTeam === 'your' ? 'One of yours' : `A ${them} toucher`} lies in the ditch, chalked and still live.`);
  bits.push(`Your nearest is ${cm(mine[0].d)} cm from the jack.`);
  bits.push(conditions === 'rain' ? `It has rained all afternoon and the green is heavy: ${T} s.` : `The green is ${label}, ${T} s${conditions === 'sunshine' ? ', baked in the sun' : ''}.`);
  bits.push('You are skip, with the last bowl of the end.');
  const situation = bits.join(' ');

  const hint = T <= 11.5 ? 'heavy green: give it plenty' : T <= 12.5 ? 'a slowish green: don\'t be short' : T >= 15 ? 'very fast green: a feather touch' : T >= 14 ? 'fast green: less weight than you think' : 'pick your weight, then play the shot';

  // advice: the County bowlers' favourite shot in the benchmark
  const tally = {};
  for (const s of bench.shots.filter(s => s.level === 'county')) { const k = s.type + '|' + s.hand; tally[k] = (tally[k] || 0) + 1; }
  const [type, hand] = Object.entries(tally).sort((a, b) => b[1] - a[1])[0][0].split('|');
  const H = hand === 'fore' ? 'forehand' : 'backhand';
  let advised;
  if (type === 'drive') advised = { kind: 'drive', target: { x: J.x, y: J.y }, say: pick(r, [`Fire at the jack on the ${H}. Kill the end if you can't move it.`, `Drive it, skip. ${cap(H)}, and clear the lot.`, `Put the ${H} drive in. Nothing to lose now.`]) };
  else if (type === 'wrest') advised = { kind: 'through', target: { x: r3(shotB.x), y: r3(shotB.y) }, extra: 0.8, say: pick(r, [`Yard on at their shot bowl, ${H}. Take it out and stay.`, `${cap(H)}, with a yard of weight on their shot wood.`, `Follow through on the ${H}: shift their shot bowl and sit in its place.`]) };
  else if (type === 'trail') advised = { kind: 'through', target: { x: r3(J.x), y: r3(J.y) }, extra: 1.1, say: pick(r, [`Trail the jack on the ${H}. Take it back a yard.`, `${cap(H)}, with weight: move the jack through to the back.`, `Hit the jack on the ${H} and carry it on.`]) };
  else advised = { kind: 'draw', target: { x: r3(J.x), y: r3(J.y - 0.07) }, say: pick(r, [`Draw it in on the ${H}, skip.`, `${cap(H)} draw, just short of the jack.`, `There's a way in on the ${H}. Draw the shot.`, `Take the ${H} and draw to the jack. Nothing fancy.`]) };
  advised = Object.assign({ by: st.by, hand }, advised);

  // two notes on the plan: one above the head, one below
  const ys = pz.bowls.filter(b => !b.ditch).map(b => b.y).concat(J.y), top = Math.max(...ys) - J.y, bottom = Math.min(...ys) - J.y;
  const second = guard ? 'watch the guard' : ditch ? 'toucher in the ditch' : count >= 3 ? 'one wood left' : pick(r, ['last bowl, skip', 'one wood left', 'over to you']);
  const annotations = [
    { text: `${them} lying ${NUM[count]}!`, dx: 0.45, dy: r3(top + 0.32), rot: -4 },
    { text: second, dx: 0.4, dy: r3(bottom - 0.3), rot: -3 }
  ];
  return { title, theme: advised.kind === 'draw' ? 'draw the shot' : advised.kind === 'drive' ? 'drive' : type === 'trail' ? 'trail the jack' : 'yard on', conditions, situation, hint, annotations, advised,
    match: { you: m.base - down, them: m.base, end: m.end, ends: m.ends } };
}

// ---------- one seed, start to finish ----------
function make(seed, known, { quick = true } = {}) {
  const st = setting(seed), played = playEnd(st);
  if (!played.pz) return { seed, why: played.why };
  const pz = Object.assign({ id: 'gen-' + seed }, played.pz);
  const why = screen(pz, known);
  if (why) return { seed, why };
  // a first benchmark with the County shot as stand-in advice, to learn what the County bowlers play
  const words0 = { advised: { by: st.by, hand: 'fore', kind: 'draw', target: { x: pz.jack.x, y: pz.jack.y - 0.07 } } };
  Object.assign(pz, words0, { match: { you: st.match.base - st.match.down, them: st.match.base, end: st.match.end, ends: st.match.ends } });
  const rep0 = L.benchmark(pz, { quick, seed });
  if (!rep0.head || rep0.head.problems && rep0.head.problems.length) return { seed, why: 'illegal head' };
  if (rep0.flags.length) return { seed, why: rep0.flags[0] };
  const words = describe(pz, st, rep0);
  const out = Object.assign({ id: pz.id, title: words.title, theme: words.theme, greenSpeed: pz.greenSpeed, conditions: words.conditions, match: words.match, you: pz.you },
    pz.matRear != null ? { matRear: pz.matRear } : {},
    { jack: pz.jack, bowls: pz.bowls, situation: words.situation, hint: words.hint, annotations: words.annotations, advised: words.advised });
  // the benchmark depends on the head, the match and the seed, not the advice, so only the advice's own check is redone
  Object.assign(out, { bench: pz.bench, best: pz.best, check: pz.check });
  const rep = L.checkAdvice(out);
  const said = L.checkWords(out);   // the words must say what the plan shows
  if (said.length) return { seed, why: 'the words do not match the head: ' + said[0] };
  out.gen = { version: VERSION, seed, levels: played.levels, quick: quick || undefined };
  out.queued = new Date().toISOString();
  return { seed, pz: out, rep };
}

function known() {
  const list = [];
  const idx = L.readIndex();
  for (const e of idx.puzzles) { const f = L.puzzlePath(e.n); if (fs.existsSync(f)) list.push({ name: `#${e.n}`, shape: shape(L.readJson(f)) }); }
  for (const q of L.readQueue()) list.push({ name: path.basename(q.file), shape: shape(q.pz) });
  return list;
}

function main() {
  const args = process.argv.slice(2), opt = k => { const i = args.indexOf(k); return i >= 0 ? args[i + 1] : null; };
  const dry = args.includes('--dry'), full = args.includes('--full'), one = opt('--seed');
  const have = L.readQueue().length, target = +(opt('--target') || 21), want = opt('--count') != null ? +opt('--count') : Math.max(0, target - have);
  const list = known();
  if (one != null) {
    const res = make(+one, list, { quick: !full });
    console.log(res.pz ? JSON.stringify(res.pz, null, 1).slice(0, 4000) : `seed ${one}: not kept: ${res.why}`);
    if (res.pz && !dry) save(res.pz);
    return;
  }
  console.log(`Queue: ${have}. Making ${want}.`);
  let seed = +(opt('--from') || (Date.now() % 1e9)), made = 0, tried = 0;
  const t0 = Date.now(), why = {};
  while (made < want && tried < want * 400) {
    tried++; seed = (seed + 1) >>> 0;
    const res = make(seed, list, { quick: !full });
    if (!res.pz) { const k = res.why.replace(/[\d.]+/g, 'N'); why[k] = (why[k] || 0) + 1; continue; }
    made++;
    list.push({ name: 'gen-' + seed, shape: shape(res.pz) });
    console.log(`  kept seed ${seed}: ${res.pz.title} (${res.pz.advised.hand} ${res.pz.advised.kind}; ${((Date.now() - t0) / 1000).toFixed(0)} s)`);
    if (!dry) save(res.pz);
  }
  console.log(`Made ${made} of ${want} from ${tried} ends in ${((Date.now() - t0) / 1000).toFixed(0)} s. Not kept:`);
  for (const [k, n] of Object.entries(why).sort((a, b) => b[1] - a[1])) console.log(`  ${n} × ${k}`);
  if (made < want) process.exitCode = 1;
}
function save(pz) { L.writeJson(path.join(L.QUEUE, `${pz.queued.replace(/[-:]/g, '').slice(0, 15)}-${pz.gen.seed}.json`), pz); }

if (require.main === module) main();
module.exports = { VERSION, setting, playEnd, screen, shape, sameHead, describe, make, known, SPREAD };
