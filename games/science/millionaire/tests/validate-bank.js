/* Question-bank validator:  node tests/validate-bank.js [unit prefix, e.g. B or C3]
   Checks structure, then prints per-unit coverage so authors can balance tiers, difficulty and answer length. */
const path = require('path'), root = path.join(__dirname, '..') + path.sep;
global.SSM = {};
['taxonomy.js', 'engine.js', 'lifelines.js', 'select.js'].forEach(f => require(root + f));
require(root + 'bank/_helper.js');
const units = [...Array(7)].map((_, i) => 'B' + (i + 1)).concat([...Array(10)].map((_, i) => 'C' + (i + 1)), [...Array(8)].map((_, i) => 'P' + (i + 1)));
const only = process.argv[2];
units.forEach(u => require(root + 'bank/' + u + '.js'));
const B = SSM.BANK.filter(q => !only || q.u.startsWith(only)), TAX = SSM.TAX;
const errs = [], seenText = new Map();
B.forEach(q => {
  const w = q.id;
  if (!TAX.subs[q.u + ':' + q.s]) errs.push(w + ' bad sub ' + q.s);
  if (!['F', 'H'].includes(q.t)) errs.push(w + ' bad tier');
  if (!(q.d >= 1 && q.d <= 5)) errs.push(w + ' bad difficulty');
  if (!['R', 'P', 'D', 'X', 'C', 'M', 'A'].includes(q.k)) errs.push(w + ' bad kind ' + q.k);
  if (!q.q || q.q.length < 15) errs.push(w + ' question too short');
  if (!Array.isArray(q.o) || q.o.length !== 4) errs.push(w + ' needs exactly 4 options');
  else if (new Set(q.o.map(x => x.trim())).size !== 4) errs.push(w + ' duplicate options');
  if (!q.w || q.w.length < 10) errs.push(w + ' needs an explanation');
  if (q.t === 'F' && q.d === 5) errs.push(w + ' Foundation items should not be difficulty 5');
  if (q.t === 'H' && q.d === 1) errs.push(w + ' Higher-pitched items should not be difficulty 1');
  const nt = q.q.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
  if (seenText.has(nt)) errs.push(w + ' duplicate question text of ' + seenText.get(nt)); seenText.set(nt, w);
});
console.log(B.length + ' questions, ' + errs.length + ' errors');
errs.forEach(e => console.log('ERR  ' + e));
const rows = {};
B.forEach(q => {
  const r = rows[q.u] = rows[q.u] || { n: 0, F: [0, 0, 0, 0, 0, 0], H: [0, 0, 0, 0, 0, 0], longest: 0 };
  r.n++; r[q.t][q.d]++;
  const L = q.o.map(x => x.length); if (L[0] > Math.max(...L.slice(1))) r.longest++;
});
console.log('\nunit   n  Foundation d1..d5   Higher d1..d5   correct-is-longest');
Object.keys(rows).forEach(u => { const r = rows[u]; console.log(u.padEnd(5), String(r.n).padStart(3), '  F ' + r.F.slice(1).join(' '), '   H ' + r.H.slice(1).join(' '), '   ' + Math.round(r.longest / r.n * 100) + '%'); });
let tot = 0, lg = 0; B.forEach(q => { tot++; const L = q.o.map(x => x.length); if (L[0] > Math.max(...L.slice(1))) lg++; });
console.log('\noverall: correct answer is strictly the longest in ' + Math.round(lg / tot * 100) + '% of questions (target: about 25–30%)');
process.exit(errs.length ? 1 : 0);
