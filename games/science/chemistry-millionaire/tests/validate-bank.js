/* Question-bank validator:  node games/science/chemistry-millionaire/tests/validate-bank.js [unit prefix, e.g. P or O1]
   Checks structure and markup, builds sample AS and A-level games with the shared selection engine,
   then prints per-unit coverage so authors can balance difficulty and answer length. */
const path = require('path'), here = path.join(__dirname, '..') + path.sep, shared = path.join(here, '..', 'millionaire') + path.sep;
global.SSM = {};
require(here + 'taxonomy.js');
['engine.js', 'lifelines.js', 'select.js', 'bank/helper.js'].forEach(f => require(shared + f));
['physical', 'inorganic', 'organic'].forEach(f => require(here + 'bank/' + f + '.js'));
const only = process.argv[2], TAX = SSM.TAX;
const B = SSM.BANK.filter(q => !only || q.u.startsWith(only));
const errs = [], seenText = new Map();
const badMarkup = s => (String(s).match(/_[A-Za-z][A-Za-z]+/g) || []).filter(m => !/^_[a-z]$/.test(m));
B.forEach(q => {
  const w = q.id;
  if (!TAX.units[q.u]) errs.push(w + ' unknown unit');
  if (!TAX.subs[q.u + ':' + q.s]) errs.push(w + ' bad sub ' + q.s);
  if (q.t !== 'H') errs.push(w + ' tier should be H');
  if (!(q.d >= 1 && q.d <= 5)) errs.push(w + ' bad difficulty');
  if (!['R', 'P', 'D', 'X', 'C', 'M', 'A'].includes(q.k)) errs.push(w + ' bad kind ' + q.k);
  if (!q.q || q.q.length < 15) errs.push(w + ' question too short');
  if (!Array.isArray(q.o) || q.o.length !== 4) errs.push(w + ' needs exactly 4 options');
  else if (new Set(q.o.map(x => x.trim())).size !== 4) errs.push(w + ' duplicate options');
  if (!q.w || q.w.length < 10) errs.push(w + ' needs an explanation');
  [q.q, q.w].concat(q.o || []).forEach(s => badMarkup(s).forEach(m => errs.push(w + ' subscript markup will not render: ' + m)));
  const nt = q.q.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
  if (seenText.has(nt)) errs.push(w + ' duplicate question text of ' + seenText.get(nt)); seenText.set(nt, w);
});
Object.keys(TAX.subs).forEach(s => { if (!only && !SSM.BANK.some(q => q.u + ':' + q.s === s)) errs.push('subtopic ' + s + ' has no questions'); });
if (!only) {
  const all = Object.keys(TAX.subs);
  [['AS', 'combined'], ['A-level', 'separate']].forEach(([name, course]) => {
    for (let seed = 1; seed <= 40; seed++) ['gentle', 'standard', 'challenge'].forEach(difficulty => {
      const r = SSM.select.build(SSM.BANK, { board: 'AQA', course, tier: 'H', difficulty, length: 15, subs: all, seed });
      if (!r.ok) errs.push(name + ' game failed: ' + r.errors.join('; '));
      else if (course === 'combined' && r.questions.some(q => TAX.units[q.unit].sepOnly)) errs.push('AS game contains A-level-only content (seed ' + seed + ')');
    });
  });
  const asPool = SSM.select.pool(SSM.BANK, { board: 'AQA', course: 'combined', tier: 'H', subs: all }).length;
  console.log('AS pool ' + asPool + ' · A-level pool ' + SSM.BANK.length);
}
console.log(B.length + ' questions, ' + errs.length + ' errors');
errs.forEach(e => console.log('ERR  ' + e));
const rows = {};
B.forEach(q => {
  const r = rows[q.u] = rows[q.u] || { n: 0, d: [0, 0, 0, 0, 0, 0], longest: 0 };
  r.n++; r.d[q.d]++;
  const L = q.o.map(x => x.length); if (L[0] > Math.max(...L.slice(1))) r.longest++;
});
console.log('\nunit    n   d1..d5        correct-is-longest');
Object.keys(rows).forEach(u => { const r = rows[u]; console.log(u.padEnd(5), String(r.n).padStart(3), '  ' + r.d.slice(1).join(' ').padEnd(12), '  ' + Math.round(r.longest / r.n * 100) + '%'); });
let lg = 0; B.forEach(q => { const L = q.o.map(x => x.length); if (L[0] > Math.max(...L.slice(1))) lg++; });
const tot = [0, 0, 0, 0, 0, 0]; B.forEach(q => tot[q.d]++);
console.log('\nall difficulties d1..d5: ' + tot.slice(1).join(' '));
console.log('overall: correct answer is strictly the longest in ' + Math.round(lg / B.length * 100) + '% of questions (target: about 25–30%)');
process.exit(errs.length ? 1 : 0);
