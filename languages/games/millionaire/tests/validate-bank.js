/* Question-bank validator:  node tests/validate-bank.js [language, e.g. french]
   Checks structure, prints per-unit coverage (tiers, difficulty, answer-length bias), then builds a game for
   every board, tier and difficulty to prove each one can be played from the whole bank. */
const path = require('path'), here = path.join(__dirname, '..') + path.sep, sci = path.join(__dirname, '../../../../games/science/millionaire') + path.sep;
global.SSM = {};
require(here + 'taxonomy.js');
['engine.js', 'lifelines.js', 'select.js'].forEach(f => require(sci + f));
require(here + 'bank/helper.js');
const langs = process.argv[2] ? [process.argv[2]] : ['french', 'german', 'spanish'];
langs.forEach(l => require(here + 'bank/' + l + '.js'));
const TAX = SSM.TAX;
let bad = 0;
langs.forEach(lang => {
  const B = SSM.BANKS[lang] || [];
  const errs = [], seenText = new Map();
  B.forEach(q => {
    const w = q.id;
    if (!TAX.subs[q.u + ':' + q.s]) errs.push(w + ' bad sub ' + q.s);
    if (!['F', 'H'].includes(q.t)) errs.push(w + ' bad tier');
    if (!(q.d >= 1 && q.d <= 5)) errs.push(w + ' bad difficulty');
    if (!['V', 'T', 'G', 'R', 'C'].includes(q.k)) errs.push(w + ' bad kind ' + q.k);
    if (!q.q || q.q.length < 12) errs.push(w + ' question too short');
    if (!Array.isArray(q.o) || q.o.length !== 4) errs.push(w + ' needs exactly 4 options');
    else {
      if (new Set(q.o.map(x => String(x).trim().toLowerCase())).size !== 4) errs.push(w + ' duplicate options');
      if (q.o.some(x => typeof x !== 'string' || !x.trim())) errs.push(w + ' empty option');
    }
    if (!q.w || q.w.length < 10) errs.push(w + ' needs an explanation');
    if (q.t === 'F' && q.d === 5) errs.push(w + ' Foundation items should not be difficulty 5');
    if (q.t === 'H' && q.d === 1) errs.push(w + ' Higher items should not be difficulty 1');
    const nt = q.q.toLowerCase().replace(/[^a-z0-9À-ɏ]+/g, ' ').trim();
    if (seenText.has(nt)) errs.push(w + ' duplicate question text of ' + seenText.get(nt)); seenText.set(nt, w);
  });
  Object.keys(TAX.subs).forEach(sid => { if (!B.some(q => q.u + ':' + q.s === sid)) errs.push('no questions for ' + sid); });
  console.log('\n== ' + lang + ': ' + B.length + ' questions, ' + errs.length + ' errors');
  errs.forEach(e => console.log('ERR  ' + e));
  bad += errs.length;
  const rows = {};
  B.forEach(q => {
    const r = rows[q.u] = rows[q.u] || { n: 0, F: [0, 0, 0, 0, 0, 0], H: [0, 0, 0, 0, 0, 0], longest: 0 };
    r.n++; r[q.t][q.d]++;
    const L = q.o.map(x => x.length); if (L[0] > Math.max(...L.slice(1))) r.longest++;
  });
  console.log('unit   n  Foundation d1..d5   Higher d1..d5   correct-is-longest');
  Object.keys(TAX.units).forEach(u => { const r = rows[u]; if (!r) { console.log(u, 'MISSING'); return; } console.log(u.padEnd(5), String(r.n).padStart(3), '  F ' + r.F.slice(1).join(' '), '   H ' + r.H.slice(1).join(' '), '   ' + Math.round(r.longest / r.n * 100) + '%'); });
  let lg = 0; B.forEach(q => { const L = q.o.map(x => x.length); if (L[0] > Math.max(...L.slice(1))) lg++; });
  console.log('correct answer strictly the longest in ' + Math.round(lg / Math.max(1, B.length) * 100) + '% (target: about 25–30%)');
  const all = Object.keys(TAX.subs);
  ['AQA', 'Edexcel'].forEach(board => ['F', 'H'].forEach(tier => ['gentle', 'standard', 'challenge'].forEach(diff => {
    const r = SSM.select.build(B, { board, course: lang, tier, difficulty: diff, length: 15, subs: all, seed: 7 });
    if (!r.ok) { bad++; console.log('ERR  cannot build', board, tier, diff, r.errors.join(' ')); }
    else if (r.stats.worstDeviation > 1.5) console.log('warn', board, tier, diff, 'worst difficulty deviation', r.stats.worstDeviation.toFixed(2));
    if (r.ok && board === 'AQA' && r.questions.some(q => SSM.TAX.units[q.unit].edxOnly)) { bad++; console.log('ERR  AQA game drew an Edexcel-only question'); }
  })));
  // every single unit on its own should make at least a 5-question game for Foundation and Higher
  ['AQA', 'Edexcel'].forEach(board => Object.keys(TAX.units).forEach(u => {
    if (board === 'AQA' && TAX.units[u].edxOnly) return;
    const subs = all.filter(s => TAX.subs[s].unit === u);
    ['F', 'H'].forEach(tier => {
      const r = SSM.select.build(B, { board, course: lang, tier, difficulty: 'standard', length: 5, subs, seed: 3 });
      if (!r.ok) console.log('warn', board, tier, u, 'alone cannot make a 5-question game');
    });
  }));
});
process.exit(bad ? 1 : 0);
