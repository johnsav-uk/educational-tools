/* Organic Synthesis Pathways: tests. Loaded by tests.html, and runnable in node:
     node js/tests.js
   or headless in a browser:
     msedge --headless --disable-gpu --virtual-time-budget=60000 --dump-dom http://localhost:8765/visualisations/organic-synthesis/tests.html
   Engine and structure tests (sections D, C, F, W, R, L, M, I, S of PLAN.md §9) run at once; the
   page tests (pagetests.js, section P) then drive index.html in a hidden frame and need http, not file://.
   Results go in #summary and window.TEST_RESULT = { pass, fail, failures, done }.

   Atomic masses are AQA's: C 12.0, H 1.0, O 16.0, N 14.0, Cl 35.5, Br 79.9, I 126.9. */
(function () {
  'use strict';
  var isNode = typeof module === 'object' && typeof require === 'function' && typeof window === 'undefined';
  var D = isNode ? require('./data.js') : window.SYNTH_DATA;
  var E = isNode ? require('./engine.js') : window.SynthEngine;
  var S = isNode ? require('./structure.js') : window.Structure;
  var C = isNode ? require('./challenges.js') : window.SYNTH_CHALLENGES;
  var CONTENT = isNode ? (function () { try { return require('./content.js'); } catch (e) { return null; } })() : window.SYNTH_CONTENT;

  var pass = 0, fail = 0, failures = [], rows = [], section = '';
  function group(name) { section = name; rows.push({ head: name }); }
  function ok(name, cond, detail) {
    if (cond) pass++; else { fail++; failures.push(section + ': ' + name + (detail ? ' — ' + detail : '')); }
    rows.push({ name: name, ok: !!cond, detail: detail || '' });
  }
  function eq(name, got, want) { ok(name, got === want, 'got "' + got + '", want "' + want + '"'); }
  var G = { level: 'gcse' }, A = { level: 'alevel' }, AE = { level: 'alevel', enrich: true };
  function R(m, c, p, o) { return E.react(m, c, p, o || A); }
  function ids(o) { return o.products.map(function (p) { return p.id; }); }
  function major(o) { var p = o.products.filter(function (x) { return x.role === 'major'; })[0]; return p && p.id; }
  function role(o, id) { var p = o.products.filter(function (x) { return x.id === id; })[0]; return p && p.role; }
  function same(a, b) { return JSON.stringify(a.slice().sort()) === JSON.stringify(b.slice().sort()); }
  function counts(f) { return E.atoms(f); }
  function sameCounts(a, b) { return JSON.stringify(Object.keys(a).sort().map(function (k) { return [k, a[k]]; })) === JSON.stringify(Object.keys(b).sort().map(function (k) { return [k, b[k]]; })); }
  var MOLS = D.MOLS, ALL = D.MOL_ORDER, SMILES = ALL.filter(function (i) { return MOLS[i].smiles; });

  /* ---------- D: data integrity ---------- */
  group('D: data integrity');
  ok('82 structures plus 3 formula-only species', SMILES.length === 82 && ALL.length === 85, SMILES.length + ' / ' + ALL.length);
  ok('D1 ids are unique', new Set(ALL).size === ALL.length);
  var names = ALL.map(function (i) { return MOLS[i].name; });
  ok('D1 names are unique', new Set(names).size === names.length);
  var badF = SMILES.filter(function (i) { var m = MOLS[i]; return !sameCounts(S.formulaOf(m.smiles), counts(m.formula)) || !sameCounts(counts(m.formula), counts(m.cf)); });
  ok('D1 every SMILES formula equals the declared formula and the condensed formula', badF.length === 0, badF.join(', '));
  ok('D1 ethyl ethanoate is C4H8O2', sameCounts(S.formulaOf(MOLS['ethyl-ethanoate'].smiles), { C: 4, H: 8, O: 2 }));
  ok('D1 1,2-dibromoethane is C2H4Br2', sameCounts(S.formulaOf(MOLS['dibromoethane'].smiles), { C: 2, H: 4, Br: 2 }));
  [['ethanol', 46.0], ['bromoethane', 108.9], ['propanenitrile', 55.0], ['phenylethanone', 120.0], ['n-phenylethanamide', 135.0], ['nitrobenzene', 123.0]].forEach(function (x) { eq('D2 Mr of ' + x[0], E.mr(x[0]), x[1]); });
  var badMr = ALL.filter(function (i) { return Math.abs(E.mr(i) - MOLS[i].mr) > 0.05; });
  ok('D2 every declared Mr equals the Mr from the formula, to 1 d.p.', badMr.length === 0, badMr.join(', '));

  // D3: every edge's products and partners exist; every equation balances.
  var d3 = [], d3n = 0;
  Object.keys(D.EDGES).forEach(function (m) {
    ok.noop = 0;
    if (!MOLS[m]) d3.push('edge substrate ' + m);
    Object.keys(D.EDGES[m]).forEach(function (rid) {
      var e = D.EDGES[m][rid];
      var lists = [e.products]; if (e.byCard) for (var c in e.byCard) lists.push(e.byCard[c]);
      lists.forEach(function (l) { l.forEach(function (p) { if (!MOLS[p.id]) d3.push(m + ' → ' + p.id); }); });
    });
  });
  D.RULES.forEach(function (r) {
    r.use.forEach(function (u) {
      if (!D.CARDS[u[0]] || !D.CARDS[u[0]].profiles.some(function (p) { return p.id === u[1]; })) d3.push('rule ' + r.id + ' uses unknown ' + u.join('/'));
      var c = D.CARDS[u[0]]; if (c && c.partner && !MOLS[c.partner]) d3.push('partner ' + c.partner);
    });
    Object.keys(r.edges).forEach(function (m) {
      r.use.forEach(function (u) {
        var o = R(m, u[0], u[1], AE);
        if (o.status !== 'ok' || !o.eq) return;
        d3n++;
        var b = E.balance(o.eq.L, o.eq.R);
        if (!b.ok) d3.push(r.id + ' ' + m + ' ' + u.join('/') + ' ' + o.equation + ' (' + b.diff.join(',') + ')');
      });
    });
  });
  ok('D3 every edge product, partner and rule target exists; ' + d3n + ' equations all balance', d3.length === 0, d3.join(' | '));
  eq('D3 nitrile reduction equation', R('propanenitrile', 'lialh4', 'ether').equation, 'CH₃CH₂CN + 4[H] → CH₃CH₂CH₂NH₂');
  eq('D3 nitrobenzene reduction equation', R('nitrobenzene', 'snhcl', 'reflux').equation, 'C₆H₅NO₂ + 6[H] → C₆H₅NH₂ + 2H₂O');
  eq('D3 fermentation equation', R('glucose', 'yeast', 'anaerobic').equation, 'C₆H₁₂O₆ → 2C₂H₅OH + 2CO₂');
  ok('D3 balance() rejects an unbalanced equation', !E.balance([[1, 'C2H4'], [1, 'HBr']], [[1, 'C2H4Br']]).ok);

  var d4 = SMILES.filter(function (i) { return S.groups(MOLS[i].smiles).join(' ') !== MOLS[i].groups.slice().sort().join(' '); });
  ok('D4 declared groups equal detected groups for every molecule with a structure', d4.length === 0, d4.map(function (i) { return i + ': ' + S.groups(MOLS[i].smiles).join(',') + ' vs ' + MOLS[i].groups.join(','); }).join(' | '));
  var chiral = ALL.filter(function (i) { return MOLS[i].chiral; }).sort().join(',');
  eq('D5 chiral molecules', chiral, ['butan-2-ol', 'phenylethanol', 'hn-ethanal', 'hn-propanal', 'hn-butanone', 'hn-phenylethanone', 'butan-2-yl-ethanoate', 'phenylethyl-ethanoate'].sort().join(','));
  var rac = [];
  D.RULES.forEach(function (r) { Object.keys(r.edges).forEach(function (m) { if (D.EDGES[m][r.id].racemic) rac.push(r.id + ':' + m); }); });
  eq('D5 racemic edges are exactly the planar C=O attacks that make a chiral centre', rac.sort().join(','),
    ['hcn-add:ethanal', 'hcn-add:propanal', 'hcn-add:butanone', 'hcn-add:phenylethanone', 'nabh4-red:butanone', 'nabh4-red:phenylethanone', 'lialh4-carbonyl:butanone', 'lialh4-carbonyl:phenylethanone'].sort().join(','));
  ok('D5 propanone + KCN is not racemic', !R('propanone', 'kcn', 'acid').racemic);
  ok('D5 but-2-ene stereoisomers carry E and Z', MOLS['e-but-2-ene'].stereo === 'E' && MOLS['z-but-2-ene'].stereo === 'Z');

  /* ---------- C: completeness and honesty ---------- */
  group('C: completeness and honesty');
  var STATUS = ['ok', 'mixture', 'none', 'wrongConditions', 'beyond', 'notOffered', 'observation', 'unsupported'], c1bad = [], c1n = 0;
  [['GCSE', G], ['A-level', A], ['A-level + enrichment', AE]].forEach(function (lv) {
    E.startables(lv[1].level).forEach(function (id) {
      E.combos(lv[1].level, !!lv[1].enrich).forEach(function (cp) {
        var o; c1n++;
        try { o = R(id, cp.card, cp.profile, lv[1]); } catch (e) { c1bad.push(lv[0] + ' ' + id + ' ' + cp.card + '/' + cp.profile + ' threw ' + e.message); return; }
        if (STATUS.indexOf(o.status) < 0 || !o.explain || o.status === 'unsupported') c1bad.push(lv[0] + ' ' + id + ' ' + cp.card + '/' + cp.profile + ' → ' + o.status);
        if (o.status === 'ok' || o.status === 'mixture') o.products.forEach(function (p) { if (!MOLS[p.id]) c1bad.push('unknown product ' + p.id); if (p.id === id) c1bad.push(id + ' makes itself'); });
        if (o.status === 'ok' && !o.products.length) c1bad.push('ok with no products ' + id);
      });
    });
  });
  ok('C1 ' + c1n + ' reactions across three shelves: valid status, an explanation, never unsupported, never throws', c1bad.length === 0, c1bad.slice(0, 6).join(' | '));
  // C2: a rule with no edge is reported as unsupported, with no products.
  D.RULES.push({ id: 'fake', use: [['h2', 'heat']], groups: ['alkane'], level: 'gcse', type: 'Fake', explain: 'x', edges: {} });
  E.rebuild();
  var fk = R('methane', 'h2', 'heat', G);
  D.RULES.pop(); E.rebuild();
  ok('C2 a rule with no edge gives unsupported and no products', fk.status === 'unsupported' && fk.products.length === 0, fk.status);
  var fk2 = R('methane', 'h2', 'heat', G);
  ok('C2 the table is restored afterwards', fk2.status !== 'unsupported', fk2.status);

  /* ---------- F: known transformations ---------- */
  group('F: known transformations');
  var o;
  o = R('ethene', 'steam', 'hp'); ok('F1 ethene + steam/hp → ethanol, electrophilic addition', o.status === 'ok' && major(o) === 'ethanol' && o.mech.name === 'Electrophilic addition');
  o = R('propene', 'hbr', 'rt'); ok('F2 propene + HBr: 2-bromopropane major, 1-bromopropane minor', major(o) === '2-bromopropane' && role(o, '1-bromopropane') === 'minor');
  o = R('2-bromopropane', 'naoh', 'aq'); ok('F3 2-bromopropane + aqueous NaOH: propan-2-ol major, propene minor; nucleophilic substitution, scene ns-hydroxide', major(o) === 'propan-2-ol' && role(o, 'propene') === 'minor' && o.mech.name === 'Nucleophilic substitution' && o.mech.scene === 'ns-hydroxide' && !o.mech.exact);
  o = R('2-bromopropane', 'naoh', 'eth'); ok('F4 2-bromopropane + ethanolic NaOH: propene major, propan-2-ol minor; elimination, scene elim-koh', major(o) === 'propene' && role(o, 'propan-2-ol') === 'minor' && o.mech.name === 'Elimination' && o.mech.scene === 'elim-koh' && o.mech.exact);
  o = R('propan-1-ol', 'oxid', 'distil'); ok('F5 propan-1-ol + distil → propanal, orange to green', major(o) === 'propanal' && /orange/.test(o.observe) && /green/.test(o.observe));
  o = R('propan-1-ol', 'oxid', 'reflux'); ok('F6 propan-1-ol + reflux → propanoic acid', major(o) === 'propanoic-acid');
  ok('F7 propan-2-ol → propanone with distil and with reflux', major(R('propan-2-ol', 'oxid', 'distil')) === 'propanone' && major(R('propan-2-ol', 'oxid', 'reflux')) === 'propanone');
  o = R('methylpropan-2-ol', 'oxid', 'reflux'); ok('F8 2-methylpropan-2-ol + reflux → none, tertiary not easily oxidised', o.status === 'none' && /[Tt]ertiary/.test(o.explain) && /not easily oxidised/.test(o.explain));
  o = R('butanone', 'nabh4', 'aq'); ok('F9 butanone + NaBH₄ → butan-2-ol, racemic', major(o) === 'butan-2-ol' && o.racemic);
  o = R('propanone', 'kcn', 'acid'); ok('F10 propanone + KCN/H⁺ → 2-hydroxy-2-methylpropanenitrile, not racemic, C 3 → 4', major(o) === 'hn-propanone' && !o.racemic && E.carbons('propanone') === 3 && E.carbons('hn-propanone') === 4);
  o = R('bromoethane', 'kcn', 'eth'); ok('F11 bromoethane + KCN → propanenitrile, C 2 → 3', major(o) === 'propanenitrile' && E.carbons('bromoethane') === 2 && E.carbons('propanenitrile') === 3);
  ok('F12 propanenitrile → propylamine with LiAlH₄ and with H₂/Ni', major(R('propanenitrile', 'lialh4', 'ether')) === 'propylamine' && major(R('propanenitrile', 'h2', 'heat')) === 'propylamine');
  o = R('butan-2-ol', 'h2so4', 'hot'); ok('F13 butan-2-ol dehydration: three equal products', o.status === 'ok' && same(ids(o), ['but-1-ene', 'e-but-2-ene', 'z-but-2-ene']) && o.products.every(function (p) { return p.role === 'equal'; }));
  o = R('benzene', 'nitrating', 'cool'); ok('F14 benzene nitration → nitrobenzene, scene es-nitration', major(o) === 'nitrobenzene' && o.mech.scene === 'es-nitration' && o.mech.exact);
  o = R('benzene', 'acylcl', 'alcl3'); ok('F15 benzene + ethanoyl chloride/AlCl₃ → phenylethanone + HCl', major(o) === 'phenylethanone' && /HCl/.test(o.equation));
  ok('F16 nitrobenzene + Sn/HCl → phenylamine', major(R('nitrobenzene', 'snhcl', 'reflux')) === 'phenylamine');
  ok('F17 phenylamine + ethanoyl chloride → N-phenylethanamide', major(R('phenylamine', 'acylcl', 'rt')) === 'n-phenylethanamide');
  o = R('ethyl-ethanoate', 'naoh', 'aq'); ok('F18 ethyl ethanoate + NaOH → sodium ethanoate + ethanol', same(ids(o), ['sodium-ethanoate', 'ethanol']));
  o = R('ethanoic-acid', 'est-ethanol', 'warm'); ok('F19 ethanoic acid + ethanol/H₂SO₄ → ethyl ethanoate, reversible', major(o) === 'ethyl-ethanoate' && o.reversible && /⇌/.test(o.equation));
  o = R('glucose', 'yeast', 'anaerobic'); ok('F20 glucose + yeast → ethanol (+ CO₂)', major(o) === 'ethanol' && /CO₂/.test(o.equation));
  o = R('decane', 'crack', 'cat'); ok('F21 decane cracks to ethene + octane, C 10 → 2 + 8', same(ids(o), ['ethene', 'octane']) && E.carbons('decane') === 10 && E.carbons('ethene') + E.carbons('octane') === 10);
  o = R('ethane', 'br2', 'uv'); ok('F22 ethane + Br₂/UV → bromoethane, low yield', major(o) === 'bromoethane' && o.lowYield);
  o = R('bromoethane', 'nh3', 'excess'); ok('F23 bromoethane + excess NH₃ → ethylamine; equation has 2NH₃ and NH₄Br', major(o) === 'ethylamine' && /2NH₃/.test(o.equation) && /NH₄Br/.test(o.equation), o.equation);

  /* ---------- W: wrong reagent or conditions ---------- */
  group('W: wrong reagent or conditions');
  o = R('propene', 'nabh4', 'aq'); ok('W1 propene + NaBH₄ → none, mentions the nucleophile and C=C', o.status === 'none' && /nucleophile/.test(o.explain) && /C=C/.test(o.explain));
  eq('W2 ethanoic acid + NaBH₄ → none', R('ethanoic-acid', 'nabh4', 'aq').status, 'none');
  o = R('ethanal', 'oxid', 'distil'); ok('W3 ethanal + distil → wrong conditions, says reflux', o.status === 'wrongConditions' && /reflux/.test(o.explain));
  eq('W4 bromoethane + KCN/acid → wrong conditions', R('bromoethane', 'kcn', 'acid').status, 'wrongConditions');
  ok('W5 benzene + Br₂ and benzene + bromine water → none, stays orange', R('benzene', 'br2', 'dark').status === 'none' && R('benzene', 'brw', 'x').status === 'none' && /orange/.test(R('benzene', 'brw', 'x').explain));
  o = R('benzene', 'acylcl', 'rt'); ok('W6 benzene + ethanoyl chloride, no AlCl₃ → wrong conditions, mentions AlCl₃', o.status === 'wrongConditions' && /AlCl/.test(o.explain));
  o = R('benzene', 'nitrating', 'hot'); ok('W7 benzene nitration above 55 °C → mixture, the route cannot continue', o.status === 'mixture' && o.products.length === 0 && E.routes('benzene', 'phenylamine', Object.assign({ maxSteps: 3 }, A)).every(function (r) { return !(r[0].card === 'nitrating' && r[0].profile === 'hot'); }));
  eq('W8 bromoethane + limited NH₃ → mixture', R('bromoethane', 'nh3', 'limited').status, 'mixture');
  ok('W9 glucose + yeast at 70 °C or with air → wrong conditions', R('glucose', 'yeast', 'hot', G).status === 'wrongConditions' && R('glucose', 'yeast', 'air', G).status === 'wrongConditions');
  eq('W10 ethanol + ethanol/H₂SO₄ → none', R('ethanol', 'est-ethanol', 'warm').status, 'none');
  eq('W11 ethanol + HBr → beyond, not none', R('ethanol', 'hbr', 'rt').status, 'beyond');
  eq('W12 propanenitrile + NaBH₄ → none', R('propanenitrile', 'nabh4', 'aq').status, 'none');
  ok('W13 propanenitrile + dilute acid reflux: beyond with enrichment off, propanoic acid with it on', R('propanenitrile', 'dilacid', 'reflux', A).status === 'beyond' && major(R('propanenitrile', 'dilacid', 'reflux', AE)) === 'propanoic-acid');
  ok('W14 ethene + steam without catalyst, and ethene + H₂ at room temperature → wrong conditions', R('ethene', 'steam', 'nocat', G).status === 'wrongConditions' && R('ethene', 'h2', 'rt', G).status === 'wrongConditions');
  ok('W15 an observation: acid + sodium carbonate fizzes', R('ethanoic-acid', 'na2co3', 'x', G).status === 'observation' && /carbon dioxide/.test(R('ethanoic-acid', 'na2co3', 'x', G).explain));
  ok('W16 bromine water decolourises an alkene and not an alkane', R('ethene', 'brw', 'x', G).status === 'observation' && R('ethane', 'brw', 'x', G).status === 'none');
  // Real reactions the tool does not model must never be reported as "no reaction".
  ok('W17 ethanoyl chloride / ethanoic anhydride with an alcohol card → beyond, not none', R('ethanoyl-chloride', 'est-ethanol', 'warm').status === 'beyond' && R('ethanoic-anhydride', 'est-methanol', 'warm').status === 'beyond');
  ok('W18 amines are weak bases: water gives an alkaline solution, strong acids give salts (3.3.11.2)', R('ethylamine', 'water', 'rt').status === 'observation' && /alkaline/.test(R('ethylamine', 'water', 'rt').explain) && R('ethylamine', 'hbr', 'rt').status === 'beyond' && R('phenylamine', 'h2so4', 'coldwater').status === 'beyond');
  ok('W19 water hydrolyses a halogenoalkane slowly: not "no reaction"', R('bromoethane', 'water', 'rt').status === 'observation' && /slowly/.test(R('bromoethane', 'water', 'rt').explain));
  ok('W20 acyl chlorides are hydrolysed by aqueous reagents, alcohols react with SOCl₂, glucose with NaBH₄: beyond', R('ethanoyl-chloride', 'steam', 'hp').status === 'beyond' && R('ethanol', 'socl2', 'rt', AE).status === 'beyond' && R('glucose', 'nabh4', 'aq').status === 'beyond');
  ok('W21 the AlCl₃ note appears only when AlCl₃ is chosen', R('ethanol', 'acylcl', 'rt').notes.every(function (n) { return !/AlCl/.test(n); }) && R('ethanol', 'acylcl', 'alcl3').notes.some(function (n) { return /AlCl/.test(n); }) && R('ethylamine', 'acylcl', 'alcl3').notes.some(function (n) { return /AlCl/.test(n); }));

  /* ---------- R: routes ---------- */
  group('R: routes');
  var r1bad = [], r2bad = [];
  C.list.forEach(function (c) {
    var lv = c.level === 'gcse' ? G : (c.enrich ? AE : A), o2 = Object.assign({ maxSteps: c.maxSteps }, lv);
    var rs = E.routes(c.start, c.target, o2);
    if (c.impossible) { if (rs.length) r1bad.push(c.id + ' should have no route'); return; }
    if (!rs.length) r1bad.push(c.id + ' has no route');
    (c.routes || []).forEach(function (r) { var ck = E.checkRoute(c.start, r.map(C.parse), c.target, lv); if (!ck.solved) r1bad.push(c.id + ' listed route fails: ' + r.join(' > ') + ' ' + (ck.firstProblem && ck.firstProblem.text)); if (r.length > c.maxSteps) r1bad.push(c.id + ' route too long'); });
    (c.routesE || []).forEach(function (r) { var ck = E.checkRoute(c.start, r.map(C.parse), c.target, AE); if (!ck.solved) r1bad.push(c.id + ' enrichment route fails: ' + r.join(' > ')); });
    if (c.minRoutes && rs.length < c.minRoutes) r2bad.push(c.id + ' has ' + rs.length + ', wants ' + c.minRoutes);
  });
  ok('R1 every puzzle has a route within its step limit and every listed route passes checkRoute (' + C.list.length + ' puzzles)', r1bad.length === 0, r1bad.join(' | '));
  ok('R2 puzzles with minRoutes (g8, a4, a5, a6, a8, a13, a16, a17, e2) have at least that many routes', r2bad.length === 0, r2bad.join(' | '));
  var poor = E.checkRoute('propene', [{ card: 'hbr', profile: 'rt', pick: '1-bromopropane' }, { card: 'naoh', profile: 'aq' }], 'propan-1-ol', A);
  ok('R3 a route via a minor product reaches the target but is not solved: poor route', poor.reached && poor.poor && !poor.solved);
  ok('R4 a20 has no route to depth 4', E.routes('propan-2-ol', 'propan-1-ol', Object.assign({ maxSteps: 4 }, A)).length === 0);
  ok('R5 e1 has no route with enrichment off and one with it on', E.routes('ethene', 'propanoic-acid', Object.assign({ maxSteps: 4 }, A)).length === 0 && E.routes('ethene', 'propanoic-acid', Object.assign({ maxSteps: 3 }, AE)).length >= 1);
  var e2off = E.routes('ethanol', 'n-ethylethanamide', Object.assign({ maxSteps: 4 }, A)), e2on = E.routes('ethanol', 'n-ethylethanamide', Object.assign({ maxSteps: 4 }, AE));
  ok('R5 e2 has the 4-step AQA route with enrichment off, and the 3-step route as well with it on', e2off.length >= 1 && e2off.every(function (r) { return r.length === 4; }) && e2on.some(function (r) { return r.length === 3; }));
  function hasMaker(list, from, card, prof) { return list.some(function (m) { return m.from === from && m.card === card && (!prof || m.profile === prof); }); }
  var mk1 = E.makers('propanone', A), mk2 = E.makers('ethanol', A);
  ok('R6 makers(propanone) includes propan-2-ol with distil and with reflux', hasMaker(mk1, 'propan-2-ol', 'oxid', 'distil') && hasMaker(mk1, 'propan-2-ol', 'oxid', 'reflux'));
  ok('R6 makers(ethanol) includes ethene, glucose, ethanal, bromoethane and ethyl ethanoate', hasMaker(mk2, 'ethene', 'steam', 'hp') && hasMaker(mk2, 'glucose', 'yeast', 'anaerobic') && hasMaker(mk2, 'ethanal', 'nabh4', 'aq') && hasMaker(mk2, 'bromoethane', 'naoh', 'aq') && hasMaker(mk2, 'ethyl-ethanoate', 'naoh', 'aq'));
  var h1 = E.hint('ethene', 'propylamine', A, 3), h2 = E.hint('bromoethane', 'propylamine', A, 3);
  ok('R7 hint tier 3 on a12 from ethene names HBr; from bromoethane it names KCN', h1.step && h1.step.card === 'hbr' && h2.step && h2.step.card === 'kcn' && /Hydrogen bromide/.test(h1.text) && /Potassium cyanide/.test(h2.text));
  ok('R7 hints come in four tiers, each with text', [1, 2, 3, 4].every(function (t) { return E.hint('ethene', 'propylamine', A, t).text.length > 10; }));
  ok('R7 a hint never suggests a route longer than the steps left (a12 after ethene → ethanol, 2 left)', !E.hint('ethanol', 'propylamine', { level: 'alevel', maxSteps: 2 }, 3).step && /2 steps you have left/.test(E.hint('ethanol', 'propylamine', { level: 'alevel', maxSteps: 2 }, 3).text));
  var anyStep = E.routes('ethene', 'ethyl-ethanoate', Object.assign({ maxSteps: 3 }, G));
  ok('R8 GCSE routes carry only GCSE cards and profiles', anyStep.every(function (r) { return r.every(function (s) { return E.cards('gcse').some(function (c) { return c.id === s.card && c.profiles.some(function (p) { return p.id === s.profile; }); }); }); }));

  /* ---------- L: level separation ---------- */
  group('L: level separation');
  var g = E.cards('gcse');
  eq('L1 the GCSE shelf', g.map(function (c) { return c.id; }).sort().join(','), 'br2,brw,cl2,crack,est-ethanoic,est-ethanol,h2,i2,na,na2co3,oxid,steam,water,yeast');
  ok('L1 no GCSE card offers UV, distil, reflux or thermal cracking', g.every(function (c) { return c.profiles.every(function (p) { return ['uv', 'distil', 'reflux', 'thermal'].indexOf(p.id) < 0; }); }));
  eq('L2 ethanal + NaBH₄ at GCSE → notOffered', R('ethanal', 'nabh4', 'aq', G).status, 'notOffered');
  var l3 = C.list.filter(function (c) { return c.level === 'gcse'; }).filter(function (c) { return !E.routes(c.start, c.target, Object.assign({ maxSteps: c.maxSteps }, G)).length; });
  ok('L3 every GCSE puzzle is solvable with GCSE cards only', l3.length === 0, l3.map(function (c) { return c.id; }).join(','));
  ok('L3 a12 is not solvable at GCSE', E.routes('ethene', 'propylamine', Object.assign({ maxSteps: 4 }, G)).length === 0);
  var l4 = [];
  E.startables('alevel').forEach(function (id) {
    E.makers(id, A).forEach(function (m) { var r = D.RULES.filter(function (x) { return x.id === m.rule; })[0]; if (r.level === 'enrich') l4.push('makers ' + id); });
    E.combos('alevel', false).forEach(function (cp) { var rr = R(id, cp.card, cp.profile, A); if (rr.status === 'ok' && D.RULES.filter(function (x) { return x.id === rr.rule; })[0].level === 'enrich') l4.push('react ' + id); });
  });
  ok('L4 enrichment rules are never used when the switch is off (react, routes, makers, hint)', l4.length === 0 && E.routes('ethene', 'propanoic-acid', A).length === 0 && /no route/i.test(E.hint('ethene', 'propanoic-acid', A, 3).text), l4.slice(0, 3).join(','));
  ok('L4 enrichment cards are not on the A-level shelf until the switch is on', !E.cards('alevel').some(function (c) { return c.id === 'nabr' || c.id === 'socl2'; }) && E.cards('alevel', { enrich: true }).some(function (c) { return c.id === 'nabr'; }) && !E.cards('gcse', { enrich: true }).some(function (c) { return c.id === 'nabr'; }));
  var l5g = [], l5a = [];
  E.startables('gcse').forEach(function (id) { E.combos('gcse', false).forEach(function (cp) { var rr = R(id, cp.card, cp.profile, G); if (rr.mech) l5g.push(id + cp.card); }); });
  E.startables('alevel').forEach(function (id) { E.combos('alevel', true).forEach(function (cp) { var rr = R(id, cp.card, cp.profile, AE); if (rr.status === 'ok') { var rl = D.RULES.filter(function (x) { return x.id === rr.rule; })[0]; if (!!rl.mech !== !!rr.mech) l5a.push(rr.rule); } }); });
  ok('L5 GCSE outcomes have no mechanism', l5g.length === 0, l5g.slice(0, 3).join(','));
  ok('L5 A-level outcomes have a mechanism exactly where the rule has one', l5a.length === 0, l5a.slice(0, 3).join(','));
  var gm = [];
  E.startables('gcse').forEach(function (id) { E.combos('gcse', false).forEach(function (cp) { var rr = R(id, cp.card, cp.profile, G); if (rr.status === 'ok' && /\[O\]|\[H\]/.test(rr.equation || '')) gm.push(id + cp.card); }); });
  ok('L5 GCSE equations avoid [O] (word equation for oxidation)', gm.length === 0, gm.join(','));
  ok('L6 GCSE oxidation of propan-2-ol is A-level only', R('propan-2-ol', 'oxid', 'warm', G).status === 'beyond' && major(R('ethanol', 'oxid', 'warm', G)) === 'ethanoic-acid');
  ok('L6 GCSE propene + steam: either propanol is credited, minor becomes equal', R('propene', 'steam', 'hp', G).products.every(function (p) { return p.role !== 'minor'; }) && /either propanol/.test(R('propene', 'steam', 'hp', G).notes.join(' ')));
  ok('L6 GCSE names: propanol and butene', E.name('propan-1-ol', 'gcse') === 'propanol' && E.name('but-1-ene', 'gcse') === 'butene' && E.name('propan-1-ol', 'alevel') === 'propan-1-ol');

  /* ---------- M: mechanism consistency ---------- */
  group('M: mechanism consistency');
  var NAMES = ['Free-radical substitution', 'Electrophilic addition', 'Nucleophilic substitution', 'Elimination', 'Nucleophilic addition', 'Nucleophilic addition–elimination', 'Electrophilic substitution'];
  var mech = D.RULES.filter(function (r) { return r.mech; });
  ok('M1 every mechanism name is one of the seven AQA names', mech.every(function (r) { return NAMES.indexOf(r.mech.name) >= 0; }));
  var dump = JSON.stringify(D.RULES) + JSON.stringify(D.OBS) + JSON.stringify(D.NO) + JSON.stringify(D.NOP) + (CONTENT ? JSON.stringify(CONTENT) : '') + JSON.stringify(C.list);
  var bad1 = dump.match(/S[N]\s?[12]|\bE[12]\b/g);
  ok('M1 no SN1, SN2, E1 or E2 anywhere in the data or content', !bad1, bad1 && bad1.join(','));
  var fam = { 'subst-oh': 'Nucleophilic substitution', 'subst-cn': 'Nucleophilic substitution', 'subst-nh3': 'Nucleophilic substitution', 'subst-amine': 'Nucleophilic substitution',
    hydrate: 'Electrophilic addition', 'halogen-add': 'Electrophilic addition', 'hbr-add': 'Electrophilic addition', 'h2so4-add': 'Electrophilic addition',
    'nabh4-red': 'Nucleophilic addition', 'hcn-add': 'Nucleophilic addition', 'lialh4-carbonyl': 'Nucleophilic addition',
    'acyl-alc': 'Nucleophilic addition–elimination', 'anhyd-alc': 'Nucleophilic addition–elimination', 'acyl-water': 'Nucleophilic addition–elimination', 'acyl-nh3': 'Nucleophilic addition–elimination', 'acyl-amine': 'Nucleophilic addition–elimination', 'amine-acyl': 'Nucleophilic addition–elimination',
    nitration: 'Electrophilic substitution', 'fc-acyl': 'Electrophilic substitution', dehydrate: 'Elimination', elim: 'Elimination', frs: 'Free-radical substitution' };
  var m2 = Object.keys(fam).filter(function (id) { var r = D.RULES.filter(function (x) { return x.id === id; })[0]; return !r || !r.mech || r.mech.name !== fam[id] || !(r.type.indexOf(fam[id]) === 0 || (fam[id] === 'Electrophilic addition' && /^Addition/.test(r.type))); });
  ok('M2 each rule’s type matches the mechanism family', m2.length === 0, m2.join(','));
  ok('M2 non-mechanism rules (oxidation, reduction, esterification, hydrolysis, fermentation) carry none', ['ox-distil', 'ox-reflux', 'nitrile-red', 'nitro-red', 'esterify-alc', 'esterify-acid', 'hyd-alk', 'hyd-acid', 'ferment', 'neutralise', 'crack', 'hydrogenate'].every(function (id) { return !D.RULES.filter(function (x) { return x.id === id; })[0].mech; }));
  var exactOK = { 'ea-ethene-hbr': ['ethene|hbr'], 'ea-propene-hbr': ['propene|hbr'], 'ea-ethene-br2': ['ethene|br2'], 'ea-ethene-h2so4': ['ethene|h2so4'], 'ns-hydroxide': ['bromoethane|naoh'], 'ns-cyanide': ['bromoethane|kcn'], 'ns-ammonia': ['bromoethane|nh3'],
    'elim-koh': ['2-bromopropane|naoh'], 'elim-dehydration': ['propan-2-ol|h2so4'], 'na-ethanal-nabh4': ['ethanal|nabh4'], 'na-propanone-kcn': ['propanone|kcn'], 'ae-water': ['ethanoyl-chloride|water'], 'ae-ammonia': ['ethanoyl-chloride|nh3'],
    'es-nitration': ['benzene|nitrating'], 'es-acylation': ['benzene|acylcl'], 'frs-chlorination': ['methane|cl2'], 'ae-methylamine': ['ethylamine|acylcl'] };
  var m3 = [];
  mech.forEach(function (r) {
    var sc = typeof r.mech.scene === 'string' ? [r.mech.scene] : (r.mech.scene ? Object.keys(r.mech.scene).map(function (k) { return r.mech.scene[k]; }) : []);
    sc.forEach(function (s) { if (!D.SCENES[s]) m3.push(r.id + ' unknown scene ' + s); });
    r.mech.exactWhen.forEach(function (w) { var okp = sc.some(function (s) { return (exactOK[s] || []).indexOf(w) >= 0; }); if (!okp) m3.push(r.id + ' claims exact for ' + w); });
  });
  ok('M3 every scene is one of the 18 ids and exact is only claimed for the scene’s own reaction', Object.keys(D.SCENES).length === 18 && m3.length === 0, m3.join(' | '));
  var outl = ['hydrate', 'halogen-add', 'hbr-add', 'h2so4-add', 'subst-oh', 'elim', 'subst-cn', 'subst-nh3', 'subst-amine', 'dehydrate', 'acyl-alc', 'nabh4-red', 'hcn-add', 'acyl-water', 'acyl-nh3', 'acyl-amine', 'amine-acyl', 'nitration', 'fc-acyl'];
  var m4 = mech.filter(function (r) { return r.mech.outline !== (outl.indexOf(r.id) >= 0); }).map(function (r) { return r.id; });
  ok('M4 outline is true only for rules whose specification asks for the mechanism', m4.length === 0, m4.join(','));
  ok('M4 anhydride addition–elimination is not a required mechanism', R('ethanoic-anhydride', 'water', 'rt').mech.outline === false && R('ethanoyl-chloride', 'water', 'rt').mech.outline === true);
  ok('M5 steam hydration has no scene of its own: text steps and the nearest scene', R('ethene', 'steam', 'hp').mech.steps.length === 3 && !R('ethene', 'steam', 'hp').mech.exact);

  /* ---------- I: carbon count and formula notation ---------- */
  group('I: carbon count and formula notation');
  var i1 = [], i1n = 0;
  D.RULES.forEach(function (r) {
    Object.keys(r.edges).forEach(function (m) {
      r.use.forEach(function (u) {
        var rr = R(m, u[0], u[1], AE);
        if (rr.status !== 'ok') return;
        i1n++;
        var mj = rr.products.filter(function (p) { return p.role === 'major' || p.role === 'equal'; });
        var c = D.CARDS[u[0]], ed = D.EDGES[m][r.id];
        if (r.split) {
          var sum = 0; mj.forEach(function (p) { sum += E.carbons(p.id); });
          if (sum !== E.carbons(m)) i1.push(r.id + ' ' + m + ' split ' + sum);
          return;
        }
        if (r.id === 'ferment') { if (E.carbons(mj[0].id) * 2 + 2 !== E.carbons(m)) i1.push('ferment'); return; }
        var add = r.addC === 'partner' ? E.carbons(c.partner) : (r.addC || 0);
        var exp = E.carbons(m) + (r.dC || 0) + add;
        if (ed.w === 'CH3COOH') exp -= 2;              // anhydride: one ethanoyl group leaves as ethanoic acid
        if (r.id === 'acyl-water' || r.id === 'acyl-nh3' || r.id === 'acyl-amine') exp = E.carbons(m) + (r.id === 'acyl-amine' ? 2 : 0) - (ed.w === 'CH3COOH' ? 2 : 0);
        if (E.carbons(mj[0].id) !== exp) i1.push(r.id + ' ' + m + ' → ' + mj[0].id + ' has ' + E.carbons(mj[0].id) + ', want ' + exp);
      });
    });
  });
  ok('I1 carbon count: substrate + chain change + partner carbons, for ' + i1n + ' ok edges', i1.length === 0, i1.slice(0, 5).join(' | '));
  eq('I2 subscripts in formulae', E.fmt('(CH3)2CHCOOH'), '(CH₃)₂CHCOOH');
  eq('I2 subscripts after brackets', E.fmt('CH3(CH2)8CH3'), 'CH₃(CH₂)₈CH₃');
  eq('I2 equations use true subscripts and arrows', R('bromoethane', 'naoh', 'aq').equation, 'CH₃CH₂Br + NaOH → CH₃CH₂OH + NaBr');
  var css = '';
  try { css = isNode ? require('fs').readFileSync(require('path').join(__dirname, '..', 'synthesis.css'), 'utf8') : ''; } catch (e) { css = ''; }
  ok('I2 no CSS text-transform: uppercase anywhere (it mangles formulae)', !/uppercase/.test(css));

  /* ---------- S: structures ---------- */
  group('S: structures');
  var s1 = [], s1n = 0, s2 = [], s3 = [];
  SMILES.forEach(function (id) {
    var m = MOLS[id];
    ['displayed', 'skeletal'].forEach(function (st) {
      var geo = S.layout(id, st), labs = geo.atoms.filter(function (a) { return a.label; });
      for (var i = 0; i < labs.length; i++) for (var j = i + 1; j < labs.length; j++) { s1n++; var d = Math.hypot(labs[i].x - labs[j].x, labs[i].y - labs[j].y); if (d < 0.6) s1.push(id + ' ' + st + ' ' + labs[i].label + '/' + labs[j].label + ' ' + d.toFixed(2)); }
      geo.bonds.forEach(function (b) { if (!geo.atoms[b.a] || !geo.atoms[b.b]) s1.push(id + ' bond to nothing'); });
      geo.atoms.forEach(function (a) { if (a.x < geo.box.minx - 1e-6 || a.x > geo.box.maxx + 1e-6 || a.y < geo.box.miny - 1e-6 || a.y > geo.box.maxy + 1e-6) s1.push(id + ' ' + st + ' atom outside the viewBox'); });
      // every heavy atom is joined into one connected structure
      var seen = {}, st2 = [0]; seen[0] = 1; while (st2.length) { var c = st2.pop(); geo.bonds.forEach(function (b) { var o = b.a === c ? b.b : b.b === c ? b.a : -1; if (o >= 0 && !seen[o]) { seen[o] = 1; st2.push(o); } }); }
      if (Object.keys(seen).length !== geo.atoms.length && st === 'displayed') s1.push(id + ' ' + st + ' is not connected');
    });
    var hd = S.layout(id, 'displayed').atoms.filter(function (a) { return a.el === 'H'; }).length;
    if (hd !== counts(m.formula).H) s2.push(id + ' draws ' + hd + ' H, formula has ' + counts(m.formula).H);
    ['displayed', 'skeletal', 'structural'].forEach(function (st) { var svg = S.svg(id, st, {}); if (svg.indexOf('aria-label="' + m.name) < 0 || !/<svg/.test(svg)) s3.push(id + st); });
  });
  ok('S1 no two atom labels closer than 0.6 of a bond, every bond drawn, inside the viewBox: 82 molecules × 2 drawn styles (' + s1n + ' pairs)', s1.length === 0, s1.slice(0, 5).join(' | '));
  ok('S2 displayed formulae draw exactly as many H as the formula has', s2.length === 0, s2.slice(0, 5).join(' | '));
  ok('S3 every structure is an SVG with its name in the aria-label, in all three styles', s3.length === 0, s3.slice(0, 5).join(' | '));
  ok('S4 formula-only species draw as a formula', /<text/.test(S.svg('glucose', 'displayed', {})) && /C/.test(S.svg('glucose', 'displayed', {})));
  ok('S5 E and Z but-2-ene have different layouts', JSON.stringify(S.layout('e-but-2-ene', 'skeletal').atoms.map(function (a) { return a.y.toFixed(2); })) !== JSON.stringify(S.layout('z-but-2-ene', 'skeletal').atoms.map(function (a) { return a.y.toFixed(2); })));

  /* ---------- Content (worksheets and mark schemes) ---------- */
  if (CONTENT && CONTENT.check) {
    group('Q: questions and mark schemes');
    var q = CONTENT.check(E, D);
    q.forEach(function (x) { ok(x[0], x[1], x[2]); });
  }

  /* ---------- Report ---------- */
  var asyncRows = [];
  function report(done) {
    if (isNode) {
      if (done) {
        rows.concat(asyncRows).forEach(function (r) { if (r.head) console.log('\n' + r.head); else console.log((r.ok ? '  PASS ' : '  FAIL ') + r.name + (r.ok ? '' : '  → ' + r.detail)); });
        console.log('\n' + pass + ' passed, ' + fail + ' failed');
        if (fail) { console.log(failures.join('\n')); process.exitCode = 1; }
      }
      return;
    }
    var out = document.getElementById('out'), html = '<table>';
    rows.concat(asyncRows).forEach(function (r) {
      if (r.head) { html += '</table><h2>' + r.head + '</h2><table>'; return; }
      html += '<tr><td class="' + (r.ok ? 'pass' : 'fail') + '">' + (r.ok ? 'PASS' : 'FAIL') + '</td><td>' + r.name + '</td><td>' + (r.ok ? '' : r.detail) + '</td></tr>';
    });
    out.innerHTML = html + '</table>';
    var sum = document.getElementById('summary');
    sum.className = fail ? 'fail' : 'pass';
    sum.textContent = pass + ' passed, ' + fail + ' failed' + (done ? '' : ' (page tests running…)') + (fail ? ': ' + failures.join(' | ') : '');
    window.TEST_RESULT = { pass: pass, fail: fail, failures: failures, done: !!done };
  }
  report(false);
  if (isNode || location.protocol === 'file:' || !window.SynthPageTests) {
    if (!isNode) { rows.push({ head: 'Page tests' }); rows.push({ name: 'Skipped: serve the folder over http to run the page tests', ok: true }); }
    report(true); return;
  }
  window.SynthPageTests({
    group: function (n) { section = n; asyncRows.push({ head: n }); },
    ok: function (name, cond, detail) {
      if (cond) pass++; else { fail++; failures.push(section + ': ' + name + (detail ? ' — ' + detail : '')); }
      asyncRows.push({ name: name, ok: !!cond, detail: detail || '' });
    }
  }, function () { report(true); });
})();
