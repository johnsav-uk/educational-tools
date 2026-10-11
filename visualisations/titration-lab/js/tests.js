/* Titration Laboratory — tests. Loaded by tests.html, which also runs headless:
     msedge --headless --disable-gpu --dump-dom file:///…/tests.html
   Results go in #summary and window.TEST_RESULT = { pass, fail, failures }. */
(function () {
  'use strict';
  var E = window.TitrationEngine, X = window.TitrationExperiments, L = window.TitrationLab;
  var pass = 0, fail = 0, failures = [], rows = [], section = '';

  function group(name) { section = name; rows.push({ head: name }); }
  function ok(name, cond, detail) {
    if (cond) pass++; else { fail++; failures.push(section + ': ' + name + (detail ? ' — ' + detail : '')); }
    rows.push({ name: name, ok: !!cond, detail: detail || '' });
  }
  function near(name, got, want, tol) {
    var good = typeof got === 'number' && isFinite(got) && Math.abs(got - want) <= tol;
    ok(name, good, 'got ' + (typeof got === 'number' ? +got.toPrecision(6) : got) + ', want ' + want + ' ± ' + tol);
  }
  function throws(name, fn) { var t = false; try { fn(); } catch (e) { t = true; } ok(name, t, 'should throw'); }

  /* ---------- Units and stoichiometry ---------- */
  group('Units and amounts');
  near('cm3ToDm3(25.00) = 0.02500', E.cm3ToDm3(25), 0.025, 1e-12);
  near('cm3ToDm3(0) = 0', E.cm3ToDm3(0), 0, 0);
  near('dm3ToCm3(0.02500) = 25.00', E.dm3ToCm3(0.025), 25, 1e-12);
  near('amount(0.100 M, 25.00 cm³) = 2.500e-3 mol', E.amount(0.100, 25.00), 2.5e-3, 1e-15);
  near('amount(0.1, 0) = 0 (legitimate)', E.amount(0.1, 0), 0, 0);
  near('concentration(2.5e-3 mol, 25.00 cm³) = 0.100', E.concentration(2.5e-3, 25), 0.1, 1e-12);
  near('convert 1 mol MnO₄⁻ → 5 mol Fe²⁺', E.convert(1, 1, 5), 5, 0);
  near('convert 5e-4 mol MnO₄⁻ → C₂O₄²⁻ (2:5) = 1.25e-3', E.convert(5e-4, 2, 5), 1.25e-3, 1e-15);
  throws('negative volume throws', function () { E.amount(0.1, -1); });
  throws('NaN volume throws', function () { E.cm3ToDm3(NaN); });
  throws('text volume throws', function () { E.cm3ToDm3('abc'); });
  throws('zero titrant concentration throws (equivalence)', function () { E.equivalenceVolume({ titrantConc_M: 0, analyteConc_M: 0.1, aliquot_cm3: 25, titrantCoeff: 1, analyteCoeff: 1 }); });
  throws('zero aliquot throws', function () { E.equivalenceVolume({ titrantConc_M: 0.1, analyteConc_M: 0.1, aliquot_cm3: 0, titrantCoeff: 1, analyteCoeff: 1 }); });
  throws('zero titre throws in solve', function () { E.solveConcentration({ unknown: 'analyte', titrantConc_M: 0.1, titre_cm3: 0, aliquot_cm3: 25, titrantCoeff: 1, analyteCoeff: 1 }); });
  near('AQA Mr Na₂CO₃ = 106.0', E.relativeFormulaMass('Na2CO3'), 106.0, 1e-9);
  near('AQA Mr NaOH = 40.0', E.relativeFormulaMass('NaOH'), 40.0, 1e-9);
  near('AQA Mr H₂SO₄ = 98.1', E.relativeFormulaMass('H2SO4'), 98.1, 1e-9);
  near('AQA Mr HCl = 36.5', E.relativeFormulaMass('HCl'), 36.5, 1e-9);

  group('Known-answer cases (brief, Phase 14)');
  function eqv(cT, cA, a, b, v) { return E.equivalenceVolume({ titrantConc_M: cT, analyteConc_M: cA, aliquot_cm3: v || 25, titrantCoeff: a, analyteCoeff: b }); }
  near('Test A: 25.00 cm³ 0.100 NaOH vs 0.100 HCl → 25.00 cm³', eqv(0.100, 0.100, 1, 1), 25.00, 1e-9);
  near('Test B: 25.00 cm³ 0.100 Fe²⁺ vs 0.0200 MnO₄⁻ (1:5) → 25.00 cm³', eqv(0.0200, 0.100, 1, 5), 25.00, 1e-9);
  near('Test C: 25.00 cm³ 0.0500 C₂O₄²⁻ vs 0.0200 MnO₄⁻ (2:5) → 25.00 cm³', eqv(0.0200, 0.0500, 2, 5), 25.00, 1e-9);
  near('Fe²⁺ 0.0800 → 20.00 cm³ (not a 25.00 coincidence)', eqv(0.0200, 0.0800, 1, 5), 20.00, 1e-9);
  near('C₂O₄²⁻ 0.0420 → 21.00 cm³', eqv(0.0200, 0.0420, 2, 5), 21.00, 1e-9);
  near('Na₂CO₃ 0.0600 vs HCl 0.100 (1:2) → 30.00 cm³', eqv(0.100, 0.0600, 2, 1), 30.00, 1e-9);
  near('H₂SO₄ 0.0400 in flask vs NaOH 0.100 (1:2) → 20.00 cm³', eqv(0.100, 0.0400, 2, 1), 20.00, 1e-9);
  near('NaOH 0.100 in flask vs H₂SO₄ 0.0400 (2:1) → 31.25 cm³', eqv(0.0400, 0.100, 1, 2), 31.25, 1e-9);
  var sB = E.solveConcentration({ unknown: 'analyte', titrantConc_M: 0.0200, titre_cm3: 25.00, aliquot_cm3: 25.00, titrantCoeff: 1, analyteCoeff: 5 });
  near('Test B steps: n(MnO₄⁻) = 5.000e-4', sB.knownAmount_mol, 5e-4, 1e-15);
  near('Test B steps: n(Fe²⁺) = 2.500e-3', sB.unknownAmount_mol, 2.5e-3, 1e-15);
  near('Test B steps: c(Fe²⁺) = 0.100', sB.value_M, 0.100, 1e-12);
  var sC = E.solveConcentration({ unknown: 'analyte', titrantConc_M: 0.0200, titre_cm3: 25.00, aliquot_cm3: 25.00, titrantCoeff: 2, analyteCoeff: 5 });
  near('Test C steps: n(C₂O₄²⁻) = 1.250e-3', sC.unknownAmount_mol, 1.25e-3, 1e-15);
  near('Test C: c(C₂O₄²⁻) = 0.0500', sC.value_M, 0.0500, 1e-12);
  near('Back-calc: NaOH 0.100, titre 23.90, HCl aliquot 25.00 → 0.0956', E.solveConcentration({ unknown: 'analyte', titrantConc_M: 0.1, titre_cm3: 23.90, aliquot_cm3: 25, titrantCoeff: 1, analyteCoeff: 1 }).value_M, 0.0956, 1e-9);
  near('Back-calc: MnO₄⁻ 0.0200, titre 23.90 → Fe²⁺ 0.0956', E.solveConcentration({ unknown: 'analyte', titrantConc_M: 0.02, titre_cm3: 23.90, aliquot_cm3: 25, titrantCoeff: 1, analyteCoeff: 5 }).value_M, 0.0956, 1e-9);
  near('Unknown titrant: 25.00 NaOH 0.100, titre 20.00 H₂SO₄ → 0.0625', E.solveConcentration({ unknown: 'titrant', analyteConc_M: 0.1, titre_cm3: 20.00, aliquot_cm3: 25, titrantCoeff: 1, analyteCoeff: 2 }).value_M, 0.0625, 1e-12);
  near('RP1: 25.00 Na₂CO₃ 0.100, titre 25.00 → HCl 0.200', E.solveConcentration({ unknown: 'titrant', analyteConc_M: 0.1, titre_cm3: 25.00, aliquot_cm3: 25, titrantCoeff: 2, analyteCoeff: 1 }).value_M, 0.200, 1e-12);

  group('Rounding, concordance and errors');
  near('round(23.925, 2) = 23.93 (toFixed gives 23.92)', E.round(23.925, 2), 23.93, 1e-12);
  near('round(1.005, 2) = 1.01', E.round(1.005, 2), 1.01, 1e-12);
  near('round(1.5e-7, 2) = 0', E.round(1.5e-7, 2), 0, 0);
  ok('fmtSig(0.0950, 3) = "0.0950"', E.fmtSig(0.095, 3) === '0.0950', E.fmtSig(0.095, 3));
  ok('fmtSig(25, 4) = "25.00"', E.fmtSig(25, 4) === '25.00', E.fmtSig(25, 4));
  near('titre(0.35, 24.30) = 23.95', E.titre(0.35, 24.30), 23.95, 1e-12);
  throws('titre with final < initial throws', function () { E.titre(10, 5); });
  ok('reading "23.85" valid', E.validReadingFormat('23.85'));
  ok('reading "0.00" valid', E.validReadingFormat('0.00'));
  ok('reading "23.83" invalid (not 0 or 5)', !E.validReadingFormat('23.83'));
  ok('reading "23.8" invalid (1 dp)', !E.validReadingFormat('23.8'));
  ok('reading "abc" invalid', !E.validReadingFormat('abc'));
  near('nearestHalfTenth(23.82) = 23.80', E.nearestHalfTenth(23.82), 23.80, 1e-12);
  near('nearestHalfTenth(23.88) = 23.90', E.nearestHalfTenth(23.88), 23.90, 1e-12);
  near('nearestHalfTenth(49.99) = 50.00', E.nearestHalfTenth(49.99), 50.00, 1e-12);
  function cs(arr) { return JSON.stringify(E.concordantSet(arr, 0.10)); }
  ok('[23.85, 23.95, 23.90] all concordant', cs([23.85, 23.95, 23.90]) === '[0,1,2]', cs([23.85, 23.95, 23.90]));
  ok('[23.50, 23.90, 23.95] → {23.90, 23.95}', cs([23.50, 23.90, 23.95]) === '[1,2]', cs([23.50, 23.90, 23.95]));
  near('mean of 23.90, 23.95 shown as 23.93', E.round(E.mean([23.90, 23.95]), 2), 23.93, 1e-12);
  ok('[23.95, 24.05] concordant despite float (24.05 − 23.95 = 0.1000000000000014)', cs([23.95, 24.05]) === '[0,1]', cs([23.95, 24.05]));
  ok('[23.20, 23.60, 24.00] → none concordant', cs([23.20, 23.60, 24.00]) === '[]', cs([23.20, 23.60, 24.00]));
  ok('policy: largest set first — [23.80, 23.85, 23.90, 24.00, 24.05] → first three', cs([23.80, 23.85, 23.90, 24.00, 24.05]) === '[0,1,2]', cs([23.80, 23.85, 23.90, 24.00, 24.05]));
  ok('policy: then smallest spread — [23.80, 23.90, 23.95, 24.05] → {23.90, 23.95}', cs([23.80, 23.90, 23.95, 24.05]) === '[1,2]', cs([23.80, 23.90, 23.95, 24.05]));
  ok('one titre is not concordant', cs([23.9]) === '[]');
  near('absError(0.100, 0.0956) = 0.0044', E.absError(0.100, 0.0956), 0.0044, 1e-12);
  near('pctError(0.100, 0.0956) = 4.60 %', E.pctError(0.100, 0.0956), 4.6025, 0.001);
  near('pctError(x, x) = 0', E.pctError(0.0956, 0.0956), 0, 0);
  ok('pctError with true value 0 → null, not Infinity', E.pctError(1, 0) === null);
  near('% uncertainty burette 0.10 / 25.00 = 0.40 %', E.pctUncertainty(0.10, 25), 0.4, 1e-12);

  /* ---------- pH ---------- */
  group('pH from the charge balance');
  function sys(an, cA, tit, cT) { return { analyte: an, analyteAmount_mol: E.amount(cA, 25), aliquot_cm3: 25, titrant: tit, titrantConc_M: cT }; }
  var ss = sys('HCl', 0.1, 'NaOH', 0.1);
  near('HCl/NaOH, 0 cm³: pH 1.00', E.pHAfter(ss, 0), 1.00, 0.01);
  near('HCl/NaOH, 12.50: pH 1.48', E.pHAfter(ss, 12.5), 1.48, 0.01);
  near('HCl/NaOH, 24.00: pH 2.69', E.pHAfter(ss, 24), 2.69, 0.01);
  near('HCl/NaOH, 24.95: pH 4.00', E.pHAfter(ss, 24.95), 4.00, 0.01);
  near('HCl/NaOH, 25.00: pH 7.00', E.pHAfter(ss, 25), 7.00, 0.01);
  near('HCl/NaOH, 25.05: pH 10.00', E.pHAfter(ss, 25.05), 10.00, 0.01);
  near('HCl/NaOH, 26.00: pH 11.29', E.pHAfter(ss, 26), 11.29, 0.01);
  near('HCl/NaOH, 50.00: pH 12.52', E.pHAfter(ss, 50), 12.52, 0.01);
  near('NaOH 0.100 alone: pH 13.00', E.pHAfter(sys('NaOH', 0.1, 'HCl', 0.1), 0), 13.00, 0.01);
  var wa = sys('CH3COOH', 0.1, 'NaOH', 0.1);
  near('Ethanoic acid 0 cm³: pH 2.88', E.pHAfter(wa, 0), 2.88, 0.01);
  near('Ethanoic acid half-equivalence: pH = pKa 4.76', E.pHAfter(wa, 12.5), 4.76, 0.02);
  near('Ethanoic acid 24.00: pH 6.14', E.pHAfter(wa, 24), 6.14, 0.02);
  near('Ethanoic acid equivalence: pH 8.73', E.pHAfter(wa, 25), 8.73, 0.02);
  var wb = sys('NH3', 0.1, 'HCl', 0.1);
  near('Ammonia 0 cm³: pH 11.13', E.pHAfter(wb, 0), 11.13, 0.02);
  near('Ammonia half-equivalence: pH 9.26', E.pHAfter(wb, 12.5), 9.26, 0.02);
  near('Ammonia equivalence: pH 5.28', E.pHAfter(wb, 25), 5.28, 0.02);
  var mono = true, inRange = true, prev = -1;
  for (var v = 0; v <= 50.0001; v += 0.05) { var p = E.pHAfter(ss, v); if (p < prev - 1e-9) mono = false; if (!(p >= 0 && p <= 14)) inRange = false; prev = p; }
  ok('HCl/NaOH pH never falls as NaOH is added (0–50 cm³)', mono);
  ok('pH stays within 0–14 and is never NaN', inRange);
  near('Steepest point of HCl/NaOH = stoichiometric 25.00', E.steepestPoint(ss, 20, 30), 25.00, 0.02);
  near('Steepest point of ethanoic acid/NaOH = 25.00', E.steepestPoint(wa, 20, 30), 25.00, 0.03);
  var carb = sys('Na2CO3', 0.06, 'HCl', 0.1);
  near('Na₂CO₃/HCl second equivalence (steepest, 20–40) = 30.00', E.steepestPoint(carb, 22, 38), 30.00, 0.1);

  group('Indicators: endpoint from the pH');
  near('Phenolphthalein, NaOH in flask (HCl added): endpoint ≈ 25.00', E.indicatorEndpoint(sys('NaOH', 0.1, 'HCl', 0.1), 'phenolphthalein'), 25.00, 0.05);
  near('Methyl orange, NaOH in flask: endpoint ≈ 25.00–25.10', E.indicatorEndpoint(sys('NaOH', 0.1, 'HCl', 0.1), 'methylOrange'), 25.05, 0.06);
  near('Phenolphthalein, ethanoic acid: endpoint ≈ 25.00', E.indicatorEndpoint(wa, 'phenolphthalein'), 25.00, 0.05);
  var moWA = E.indicatorEndpoint(wa, 'methylOrange');
  ok('Methyl orange with ethanoic acid changes far too early (< 10 cm³)', moWA !== null && moWA < 10, 'endpoint ' + moWA);
  var ppNH = E.indicatorEndpoint(wb, 'phenolphthalein');
  ok('Phenolphthalein with ammonia changes well before equivalence', ppNH !== null && ppNH < 24, 'endpoint ' + ppNH);
  near('Methyl orange with ammonia: ≈ 25.00', E.indicatorEndpoint(wb, 'methylOrange'), 25.05, 0.1);
  near('Phenolphthalein with Na₂CO₃ stops at the first equivalence (15.00 of 30.00)', E.indicatorEndpoint(carb, 'phenolphthalein'), 15.0, 0.8);
  near('Methyl orange with Na₂CO₃ ≈ 30.00', E.indicatorEndpoint(carb, 'methylOrange'), 30.0, 0.15);
  // The colour the student is told they see must change where the endpoint is.
  function describedChange(an, cA, tit, cT, ind) {
    var f = E.createFlask('acid-base', an); f.addSolution(an, cA, 25); f.addIndicator(ind, 3);
    var start = f.describe().key, v = 0;
    while (v < 60) { f.addTitrant(tit, cT, 0.01); f.swirl(); v += 0.01; if (f.describe().key !== start) return v; }
    return null;
  }
  [['NaOH', 0.1, 'HCl', 0.1, 'methylOrange'], ['Na2CO3', 0.06, 'HCl', 0.1, 'methylOrange'], ['NaOH', 0.1, 'HCl', 0.1, 'phenolphthalein'],
   ['HCl', 0.1, 'NaOH', 0.1, 'phenolphthalein'], ['CH3COOH', 0.1, 'NaOH', 0.1, 'phenolphthalein'], ['NH3', 0.1, 'HCl', 0.1, 'methylOrange'], ['HCl', 0.1, 'NaOH', 0.1, 'bromothymolBlue']].forEach(function (c) {
    var seen = describedChange(c[0], c[1], c[2], c[3], c[4]);
    var ep = E.indicatorEndpoint({ analyte: c[0], analyteAmount_mol: E.amount(c[1], 25), aliquot_cm3: 25, titrant: c[2], titrantConc_M: c[3] }, c[4]);
    near(c[4] + ' with ' + c[0] + ': first described colour change matches the endpoint (±0.06 cm³)', seen, ep, 0.06);
  });
  ok('Universal indicator has no endpoint', E.indicatorEndpoint(ss, 'universal') === null);
  var sharpPP = E.indicatorSharpness(sys('NaOH', 0.1, 'HCl', 0.1), 'phenolphthalein');
  ok('Phenolphthalein strong/strong change is sharp (< 0.1 cm³)', sharpPP !== null && sharpPP < 0.1, 'width ' + sharpPP);
  var sharpMOwa = E.indicatorSharpness(wa, 'methylOrange');
  ok('Methyl orange with ethanoic acid is gradual (> 1 cm³)', sharpMOwa !== null && sharpMOwa > 1, 'width ' + sharpMOwa);

  /* ---------- Redox ---------- */
  group('Manganate(VII): stoichiometry and colour');
  function feFlask(cFe, vMn, acid) {
    var f = E.createFlask('redox', 'Fe2');
    f.addSolution('Fe2', cFe, 25);
    if (acid !== false) f.addAcidifier(X.ACIDIFIERS.H2SO4, 10);
    f.addTitrant('KMnO4', 0.0200, vMn); f.swirl();
    return f;
  }
  near('Fe²⁺: excess MnO₄⁻ at 24.95 cm³ = 0', feFlask(0.1, 24.95).rx.MnO4, 0, 1e-12);
  var f2505 = feFlask(0.1, 25.05);
  near('Fe²⁺: excess MnO₄⁻ at 25.05 = 1.0e-6 mol', f2505.rx.MnO4, 1.0e-6, 1e-9);
  ok('Fe²⁺ at 24.95: colourless or pale yellow', /colourless|yellow/.test(feFlask(0.1, 24.95).describe().text), feFlask(0.1, 24.95).describe().text);
  ok('Fe²⁺ at 25.05 (one drop past): pale pink', f2505.describe().key === 'pale-pink', f2505.describe().text);
  ok('Fe²⁺ at 26.00: pink or purple', /pink|purple/.test(feFlask(0.1, 26).describe().key), feFlask(0.1, 26).describe().text);
  var noAcid = feFlask(0.1, 25.0, false);
  ok('No acid added: brown MnO₂ forms', noAcid.rx.MnO2 > 0, 'MnO2 ' + noAcid.rx.MnO2);
  ok('No acid: Fe²⁺ left at the acid-route equivalence (titre would be high)', noAcid.rx.Fe2 > 1e-5, 'Fe2 ' + noAcid.rx.Fe2);
  var cl = E.createFlask('redox', 'Fe2'); cl.addSolution('Fe2', 0.1, 25); cl.addAcidifier(X.ACIDIFIERS.HCl, 10); cl.addTitrant('KMnO4', 0.02, 25); cl.swirl();
  ok('HCl acidified: Fe²⁺ remains at 25.00 (chloride used some titrant)', cl.rx.Fe2 > 1e-6, 'Fe2 ' + cl.rx.Fe2);
  var no3 = E.createFlask('redox', 'Fe2'); no3.addSolution('Fe2', 0.1, 25); no3.addAcidifier(X.ACIDIFIERS.HNO3, 10); no3.step(300);
  ok('HNO₃ acidified: Fe²⁺ oxidised before titration (titre low)', no3.rx.Fe2 < 2.5e-3 * 0.99, 'Fe2 ' + no3.rx.Fe2);
  var plume = E.createFlask('redox', 'Fe2'); plume.addSolution('Fe2', 0.1, 25); plume.addAcidifier(X.ACIDIFIERS.H2SO4, 10); plume.addTitrant('KMnO4', 0.02, 24.9); plume.swirl(); plume.addTitrant('KMnO4', 0.02, 0.05);
  ok('Near the endpoint an unswirled drop shows a local flash', !!plume.appearance().plume);
  plume.swirl();
  ok('…which goes when swirled (still before the endpoint)', !plume.appearance().plume && plume.rx.MnO4 === 0);

  group('Ethanedioate kinetics (3.2.5.6)');
  near('k rises with temperature: k(60)/k(20) ≈ 24.6', E.oxalateRateConstant(60, 0, 0.03) / E.oxalateRateConstant(20, 0, 0.03), 24.6, 1.0);
  ok('k rises with Mn²⁺ (autocatalysis)', E.oxalateRateConstant(60, 2e-3, 0.03) > 10 * E.oxalateRateConstant(60, 0, 0.03));
  function clearTime(T, mn2Mol) {
    var f = E.createFlask('redox', 'C2O4'); f.addSolution('C2O4', 0.05, 25); f.addAcidifier(X.ACIDIFIERS.H2SO4, 10);
    f.rx.Mn2 = mn2Mol || 0; f.heat(T); f.addTitrant('KMnO4', 0.02, 1.0); f.swirl();
    for (var t = 0; t < 2000; t += 0.25) { f.step(0.25); if (f.rx.MnO4 / (f.totalVol() / 1000) < 3e-6) return t; }
    return Infinity;
  }
  var t60 = clearTime(60), t20 = clearTime(20), t60cat = clearTime(60, 1e-4);
  ok('First 1 cm³ at 60 °C clears in 5–60 s', t60 > 5 && t60 < 60, t60 + ' s');
  ok('First 1 cm³ at 20 °C takes minutes (> 150 s)', t20 > 150, t20 + ' s');
  ok('With Mn²⁺ already present it clears much faster', t60cat < t60 / 3, t60cat + ' s vs ' + t60 + ' s');
  function oxalateFinal(T) {
    var f = E.createFlask('redox', 'C2O4'); f.addSolution('C2O4', 0.05, 25); f.addAcidifier(X.ACIDIFIERS.H2SO4, 10); f.heat(T);
    for (var v = 0; v < 25.0; v += 0.5) { f.addTitrant('KMnO4', 0.02, 0.5); f.swirl(); f.step(60); }
    f.step(3000);
    return f;
  }
  [20, 40, 60].forEach(function (T) {
    var f = oxalateFinal(T);
    ok('At ' + T + ' °C, 25.00 cm³ leaves no ethanedioate and no excess (ratio fixed by temperature-independent stoichiometry)', f.rx.C2O4 < 1e-8 && f.rx.MnO4 < 1e-8, 'C2O4 ' + f.rx.C2O4 + ' MnO4 ' + f.rx.MnO4);
  });
  var slow = E.createFlask('redox', 'C2O4'); slow.addSolution('C2O4', 0.05, 25); slow.addAcidifier(X.ACIDIFIERS.H2SO4, 10);
  slow.addTitrant('KMnO4', 0.02, 1); slow.swirl(); slow.step(5);
  ok('Cold, early: the flask is pink but ethanedioate remains (transient pink)', slow.describe().key !== 'colourless' && slow.settled().C2O4 > 1e-4);

  /* ---------- RNG and generators ---------- */
  group('Seeded randomness and mystery challenges');
  var r1 = E.rng(12345), r2 = E.rng(12345), same = true, inUnit = true;
  for (var i = 0; i < 100; i++) { var a = r1(), b = r2(); if (a !== b) same = false; if (!(a >= 0 && a < 1)) inUnit = false; }
  ok('Same seed, same 100 numbers', same);
  ok('All in [0, 1)', inUnit);
  ok('Different seed, different sequence', E.rng(12345)() !== E.rng(12346)());
  ['gcse-mystery', 'alevel-mystery-redox'].forEach(function (id) {
    var bad = [], kinds = {};
    for (var seed = 1; seed <= 1000; seed++) {
      var run = X.instantiate(id, seed);
      var veq = X.expectedTitre(run);
      kinds[run.analyte.id + '/' + run.titrant.id] = 1;
      var fine = veq >= 15 && veq <= 40 && run.titrant.conc_M > 0 && run.analyte.conc_M > 0 && isFinite(veq);
      if (run.type === 'acid-base') fine = fine && ['HCl', 'HNO3', 'H2SO4'].indexOf(run.titrant.id) >= 0 && ['NaOH', 'KOH'].indexOf(run.analyte.id) >= 0;
      if (!fine) bad.push(seed + ':' + veq);
    }
    ok(id + ': 1000 seeds all give titres in 15–40 cm³ and valid, on-spec chemicals', bad.length === 0, bad.slice(0, 5).join(', '));
    ok(id + ': several different reactions appear', Object.keys(kinds).length >= 2, Object.keys(kinds).join(' '));
  });
  ok('Same seed, same challenge', JSON.stringify(X.instantiate('gcse-mystery', 77).titrant) === JSON.stringify(X.instantiate('gcse-mystery', 77).titrant));
  var gc = X.LIST.filter(function (d) { return d.level === 'GCSE'; }).every(function (d) {
    var run = X.instantiate(d.id, 5); return run.type === 'acid-base' && ['HCl', 'HNO3', 'H2SO4'].indexOf(run.titrant.id) >= 0 || ['HCl', 'HNO3', 'H2SO4'].indexOf(run.analyte.id) >= 0;
  });
  ok('GCSE experiments use strong acids only (AQA 4.4.2.5)', gc);
  X.LIST.forEach(function (d) {
    var run = X.instantiate(d.id, 3);
    if (!run.prep) { var veq = X.expectedTitre(run); ok(d.title + ': expected titre in 15–40 cm³', veq >= 15 && veq <= 40, veq); }
  });

  /* ---------- The procedure ---------- */
  group('Procedure: invalid, mistake, harmless, alternative');
  function fresh(id, seed, choices) { var run = X.instantiate(id || 'gcse-guided', seed || 11); return L.create(run, { choices: choices || {} }); }
  var lab = fresh();
  var snap = lab.snapshotForTests();
  ok('Titrate before filling: invalid', lab.tap(true).kind === 'invalid');
  ok('…and nothing changed', JSON.stringify(lab.snapshotForTests()) === JSON.stringify(snap));
  ok('Fill without the funnel: invalid', lab.fillBurette().kind === 'invalid');
  ok('Record final before initial: invalid', lab.recordFinal('10.00').kind === 'invalid');
  ok('Add indicator with no portion in the flask: invalid', lab.addIndicator('phenolphthalein').kind === 'invalid');
  ok('Rinse burette with titrant: good', lab.rinseBurette('titrant').kind === 'good');
  lab.setFunnel(true);
  ok('Fill with the tap open: invalid', (lab.tap(false), lab.state.burette.tap = true, lab.fillBurette().kind === 'invalid'));
  lab.state.burette.tap = false;
  ok('Fill with funnel, tap closed: good', lab.fillBurette().kind === 'good');
  ok('Run with nothing underneath: invalid', lab.tap(true).kind === 'invalid');
  ok('Rinse the flask with water: harmless', lab.rinseFlask('water').kind === 'harmless');
  lab.rinsePipette('analyte');
  ok('Pipette a portion: good', lab.pipette('touch').kind === 'good');
  ok('A second portion into the same flask: invalid', lab.pipette('touch').kind === 'invalid');
  lab.place('flask');
  ok('Titrate before the initial reading: invalid', lab.add('1.0').kind === 'invalid');
  ok('Add the redox acid to an acid–base titration: invalid', lab.addAcid('H2SO4').kind === 'invalid');

  group('Procedure: a full correct titration (guided GCSE)');
  function fmt(x) { return E.nearestHalfTenth(x).toFixed(2); }
  function settle(l) { var n = 0; while ((l.state.burette.pending > 0 || l.state.burette.tap) && n++ < 2000) l.tick(0.05); }
  // An ideal student: fast to 1.5 cm³ short, then drop by drop, swirling, watching the colour.
  function titrateTo(l, expected, opts) {
    opts = opts || {};
    var start = l.state.flask.describe().key, guard = 0;
    while (l.state.trial.delivered < expected - 1.5 && guard++ < 100) { l.add('1.0'); settle(l); l.swirl(); if (opts.wait) l.wait(opts.wait); }
    guard = 0;
    while (guard++ < 200) {
      l.add('drop'); l.swirl(); if (opts.wait) l.wait(opts.wait);
      var k = l.state.flask.describe().key;
      if (k !== start) break;
    }
  }
  function fullTitration(l, opts) {
    opts = opts || {};
    var run = l.run;
    if (!l.state.burette.everFilled) {
      l.rinseBurette('titrant'); l.setFunnel(true); l.fillBurette(); l.setFunnel(false);
      l.place('waste'); l.tap(true, 'fast');
      var g = 0; while ((l.state.burette.reading < 0.3 || l.state.burette.jetAir > 0) && g++ < 400) l.tick(0.05);
      l.tap(false); l.rinsePipette('analyte');
    }
    if (l.state.flaskState === 'done') l.emptyFlask();
    if (l.state.burette.reading > 20) {
      l.setFunnel(true); l.fillBurette(); l.setFunnel(false); l.place('waste'); l.tap(true, 'fast');
      var g2 = 0; while (l.state.burette.reading < 0.3 && g2++ < 400) l.tick(0.05);
      l.tap(false);
    }
    l.pipette('touch');
    if (run.type === 'redox') { l.addAcid(opts.acid || 'H2SO4'); if (run.warm) l.warm(opts.T || 60); }
    else l.addIndicator(opts.indicator || run.indicator || 'phenolphthalein');
    l.setTile(true); l.place('flask');
    var r = l.recordInitial(fmt(l.state.burette.reading));
    var expected = run.prep ? 25 : X.expectedTitre(run);
    titrateTo(l, expected, opts);
    var fr = l.recordFinal(fmt(l.state.burette.reading));
    return { init: r, final: fr };
  }
  var g1 = fresh('gcse-guided', 21);
  var out1 = fullTitration(g1);
  ok('Initial reading accepted', out1.init.ok, out1.init.msg);
  ok('Final reading accepted', out1.final.ok, out1.final.msg);
  var t1 = g1.state.trials[0];
  ok('First titration is the rough one', t1.kind === 'rough');
  near('Titre = final − initial (recorded)', t1.titre, E.round(t1.finalRec - t1.initialRec, 2), 1e-9);
  near('Burette: reading change = liquid delivered (jet filled first)', t1.readingChange, t1.delivered, 1e-9);
  ok('Recorded readings within 0.05 of the true level', Math.abs(t1.initialRec - t1.initialTrue) <= 0.0501 && Math.abs(t1.finalRec - t1.finalTrue) <= 0.0501);
  var veq1 = X.expectedTitre(g1.run, g1.run.analyte.conc_M, t1.aliquot_cm3);
  near('Ideal student stops within 0.15 cm³ of the equivalence point', t1.delivered, veq1, 0.15);
  ok('Endpoint status: endpoint', t1.end.status === 'endpoint', JSON.stringify(t1.end));
  for (var k = 0; k < 3; k++) fullTitration(g1);
  var R = g1.results();
  ok('Three precise titrations recorded', R.precise.length === 3);
  ok('Rough titre excluded from the concordant set', R.concordantNs.indexOf(1) === -1);
  ok('Careful precise titres are concordant (within 0.10)', R.concordant.length >= 2, R.precise.map(function (t) { return t.titre; }).join(', '));
  var sol = g1.solve(R.mean || R.precise[R.precise.length - 1].titre);
  near('Calculated NaOH concentration within 1 % of the true value', sol.value_M, g1.run.analyte.conc_M, g1.run.analyte.conc_M * 0.01);
  var steps = g1.steps();
  ok('Method steps all done except titrate/final (between trials)', steps.filter(function (x) { return x.id === 'rinse-burette' || x.id === 'fill' || x.id === 'jet'; }).every(function (x) { return x.done; }));

  group('Procedure: mistakes and their direction');
  function mistakeRun(setup) {
    var l = fresh('gcse-guided', 31);
    setup(l);
    return l;
  }
  // Burette not rinsed with titrant → titrant diluted → titre high.
  var l1 = fresh('gcse-guided', 41);
  l1.setFunnel(true); l1.fillBurette(); l1.setFunnel(false); l1.place('waste'); l1.tap(true, 'fast');
  var gg = 0; while ((l1.state.burette.reading < 0.3 || l1.state.burette.jetAir > 0) && gg++ < 400) l1.tick(0.05); l1.tap(false);
  l1.rinsePipette('analyte');
  fullTitration(l1);
  var l1t = l1.state.trials[0];
  ok('Burette not rinsed with titrant: flagged', l1.allIssues().some(function (x) { return x.code === 'burette-water'; }));
  ok('…titrant diluted, so the endpoint needs more (titre high)', l1t.delivered > X.expectedTitre(l1.run, l1.run.analyte.conc_M, l1t.aliquot_cm3) + 0.1, l1t.delivered + ' vs ' + X.expectedTitre(l1.run, l1.run.analyte.conc_M, l1t.aliquot_cm3));
  // Air in the jet: reading change exceeds delivery.
  var l2 = fresh('gcse-guided', 42);
  l2.rinseBurette('titrant'); l2.setFunnel(true); l2.fillBurette(); l2.setFunnel(false); l2.rinsePipette('analyte');
  l2.place('waste'); l2.tap(true, 'fast'); gg = 0; while (l2.state.burette.reading < 0.02 && gg++ < 400) l2.tick(0.01); l2.tap(false);
  l2.state.burette.jetAir = 0.3; // as if only brought onto scale with the jet still full of air
  l2.pipette('touch'); l2.addIndicator('phenolphthalein'); l2.setTile(true); l2.place('flask');
  l2.recordInitial(fmt(l2.state.burette.reading));
  titrateTo(l2, X.expectedTitre(l2.run)); l2.recordFinal(fmt(l2.state.burette.reading));
  var l2t = l2.state.trials[0];
  near('Air in the jet: reading change − liquid delivered = 0.30 cm³', l2t.readingChange - l2t.delivered, 0.30, 1e-9);
  ok('…flagged as a mistake', l2.allIssues().some(function (x) { return x.code === 'jet-air'; }));
  // Funnel left in: drips raise the level, so the titre reads low.
  var l3 = fresh('gcse-guided', 43);
  l3.rinseBurette('titrant'); l3.setFunnel(true); l3.fillBurette(); l3.place('waste'); l3.tap(true, 'fast');
  gg = 0; while ((l3.state.burette.reading < 0.3 || l3.state.burette.jetAir > 0) && gg++ < 400) l3.tick(0.05); l3.tap(false);
  l3.rinsePipette('analyte'); l3.pipette('touch'); l3.addIndicator('phenolphthalein'); l3.setTile(true); l3.place('flask');
  l3.recordInitial(fmt(l3.state.burette.reading));
  titrateTo(l3, X.expectedTitre(l3.run)); l3.wait(20); l3.recordFinal(fmt(l3.state.burette.reading));
  var l3t = l3.state.trials[0];
  ok('Funnel left in: true reading change < liquid delivered (titre low)', (l3t.finalTrue - l3t.initialTrue) < l3t.delivered - 0.05, (l3t.finalTrue - l3t.initialTrue) + ' vs ' + l3t.delivered);
  ok('…flagged', l3.allIssues().some(function (x) { return x.code === 'funnel-in' || x.code === 'funnel-reading'; }));
  // Pipette wet with water → less analyte → titre low.
  var l4 = fresh('gcse-guided', 44);
  l4.rinseBurette('titrant'); l4.setFunnel(true); l4.fillBurette(); l4.setFunnel(false); l4.place('waste'); l4.tap(true, 'fast');
  gg = 0; while ((l4.state.burette.reading < 0.3 || l4.state.burette.jetAir > 0) && gg++ < 400) l4.tick(0.05); l4.tap(false);
  var p4 = l4.pipette('touch');
  ok('Pipette wet with water: mistake', p4.kind === 'mistake');
  ok('…fewer moles in the flask than 25.00 cm³ of the solution', l4.state.trial.analyteMol < E.amount(l4.run.analyte.conc_M, l4.state.trial.aliquot_cm3) - 1e-7);
  // Flask rinsed with analyte → more moles → titre high.
  var l5 = fresh('gcse-guided', 45);
  ok('Rinse the flask with the analyte: mistake', l5.rinseFlask('analyte').kind === 'mistake');
  l5.rinsePipette('analyte'); l5.pipette('touch');
  ok('…more moles in the flask', l5.state.trial.analyteMol > E.amount(l5.run.analyte.conc_M, l5.state.trial.aliquot_cm3) + 1e-6);
  // Blow-out.
  var l6 = fresh('gcse-guided', 46); l6.rinsePipette('analyte'); var p6 = l6.pipette('blow');
  ok('Blowing out the pipette: mistake, portion too big', p6.kind === 'mistake' && l6.state.trial.analyteMol > E.amount(l6.run.analyte.conc_M, l6.state.trial.aliquot_cm3));
  // Overshoot.
  var l7 = fresh('gcse-guided', 47);
  l7.rinseBurette('titrant'); l7.setFunnel(true); l7.fillBurette(); l7.setFunnel(false); l7.place('waste'); l7.tap(true, 'fast');
  gg = 0; while ((l7.state.burette.reading < 0.3 || l7.state.burette.jetAir > 0) && gg++ < 400) l7.tick(0.05); l7.tap(false);
  l7.rinsePipette('analyte'); l7.pipette('touch'); l7.addIndicator('phenolphthalein'); l7.setTile(true); l7.place('flask');
  l7.recordInitial(fmt(l7.state.burette.reading)); l7.setTrialKind('precise');
  var exp7 = X.expectedTitre(l7.run);
  while (l7.state.trial.delivered < exp7 + 1.0) { l7.add('1.0'); settle(l7); }
  l7.swirl(); var f7 = l7.recordFinal(fmt(l7.state.burette.reading));
  ok('Overshot precise titration: flagged as overshot', l7.state.trials[0].end.status === 'overshot' && f7.kind === 'mistake', JSON.stringify(l7.state.trials[0].end));
  // Not swirling: stop on a local flash.
  ok('Running to the 50.00 mark stops the tap', (function () {
    var l = fresh('gcse-guided', 48); l.rinseBurette('titrant'); l.setFunnel(true); l.fillBurette(); l.setFunnel(false); l.place('waste'); l.tap(true, 'fast');
    for (var i = 0; i < 4000; i++) l.tick(0.05);
    return !l.state.burette.tap && Math.abs(l.state.burette.reading - 50) < 1e-9;
  })());

  group('Procedure: redox');
  var fe = fresh('alevel-fe', 51);
  fullTitration(fe);
  for (var k2 = 0; k2 < 3; k2++) fullTitration(fe);
  var feR = fe.results();
  ok('Fe²⁺: concordant precise titres', feR.concordant.length >= 2, feR.precise.map(function (t) { return t.titre; }).join(', '));
  near('Fe²⁺: calculated concentration within 1 % (1 : 5 ratio)', fe.solve(feR.mean || feR.precise[0].titre).value_M, fe.run.analyte.conc_M, fe.run.analyte.conc_M * 0.01);
  ok('Fe²⁺: flask pale pink at the endpoint', fe.state.trials[3].observed.indexOf('pink') >= 0, fe.state.trials[3].observed);
  var feCl = fresh('alevel-fe', 51); fullTitration(feCl, { acid: 'HCl' });
  ok('HCl as the acid: titre higher than with sulfuric acid', feCl.state.trials[0].delivered > fe.state.trials[0].delivered + 0.3, feCl.state.trials[0].delivered + ' vs ' + fe.state.trials[0].delivered);
  var ox = fresh('alevel-oxalate', 52);
  fullTitration(ox, { T: 60, wait: 3 });
  for (var k3 = 0; k3 < 3; k3++) fullTitration(ox, { T: 60, wait: 3 });
  var oxR = ox.results();
  near('Ethanedioate at 60 °C: concentration within 1.5 % (2 : 5 ratio)', ox.solve(oxR.mean || oxR.precise[0].titre).value_M, ox.run.analyte.conc_M, ox.run.analyte.conc_M * 0.015);
  var cold = fresh('alevel-oxalate', 52);
  cold.rinseBurette('titrant'); cold.setFunnel(true); cold.fillBurette(); cold.setFunnel(false); cold.place('waste'); cold.tap(true, 'fast');
  gg = 0; while ((cold.state.burette.reading < 0.3 || cold.state.burette.jetAir > 0) && gg++ < 400) cold.tick(0.05); cold.tap(false);
  cold.rinsePipette('analyte'); cold.pipette('touch'); cold.addAcid('H2SO4'); cold.setTile(true); cold.place('flask');
  cold.recordInitial(fmt(cold.state.burette.reading)); cold.add('1.0'); settle(cold); cold.swirl();
  var cf = cold.recordFinal(fmt(cold.state.burette.reading));
  ok('Cold ethanedioate: stopping at the first lingering pink is judged early, with the temperature named', cold.state.trials[0].end.status === 'early' && /°C/.test(cf.msg), cf.msg);

  group('Required practical 1: standard solution');
  function prepRun(opts) {
    opts = opts || {};
    var l = fresh('alevel-rp1', 61, { indicator: 'methylOrange' }), p = l.state.prep;
    p.recordMass('m0');
    while (p.balance() - p.bottle_g < 2.55) p.addSolid('scoop');
    while (p.balance() - p.bottle_g > 2.75) p.addSolid('remove');
    p.recordMass('m1'); p.tip();
    if (!opts.skipReweigh) p.recordMass('m2');
    p.addWater(); p.stir(); p.stir(); p.stir();
    p.setFunnel(true); p.pour();
    if (!opts.skipRinse) { p.rinse('beaker'); p.rinse('beaker'); p.rinse('rod'); p.rinse('funnel'); }
    p.setFunnel(false);
    p.fillWater('bottle');
    var gx = 0; while (p.flaskWater_cm3 < 250 - 0.03 - (opts.under || 0) && gx++ < 200) p.fillWater('drop');
    if (opts.over) { p.fillWater('bottle'); }
    p.stopper();
    for (var i = 0; i < (opts.inversions === undefined ? 10 : opts.inversions); i++) p.invert();
    p.finish();
    return l;
  }
  var good = prepRun();
  var pg = good.state.prep;
  ok('Good technique: no mistakes recorded', pg.issues.length === 0, pg.issues.map(function (x) { return x.code; }).join(', '));
  near('Good technique: true and stated concentrations agree within 0.3 %', pg.trueConc(), pg.statedConc(), pg.statedConc() * 0.003);
  near('Stated concentration = (m1 − m2)/106.0/0.2500', pg.statedConc(), (pg.m1 - pg.m2) / 106.0 / 0.25, 1e-12);
  var unr = prepRun({ skipRinse: true }).state.prep;
  ok('Not rinsing beaker/rod/funnel: real concentration lower than calculated (≈3 %)', unr.trueConc() < unr.statedConc() * 0.985, unr.trueConc() + ' vs ' + unr.statedConc());
  ok('…flagged', unr.issues.some(function (x) { return /unrinsed/.test(x.code); }));
  var noRw = prepRun({ skipReweigh: true }).state.prep;
  ok('Not reweighing the bottle: real concentration lower than the masses say', noRw.trueConc() < noRw.statedConc(), noRw.trueConc() + ' vs ' + noRw.statedConc());
  var over = prepRun({ over: true }).state.prep;
  ok('Over the mark: more dilute than calculated, flagged', over.trueConc() < over.statedConc() && over.issues.some(function (x) { return x.code === 'over-mark'; }));
  var under = prepRun({ under: 0.6 }).state.prep;
  ok('Below the mark: more concentrated than calculated, flagged', under.trueConc() > under.statedConc() && under.issues.some(function (x) { return x.code === 'under-mark'; }));
  var unmixed = prepRun({ inversions: 1 });
  ok('Not mixed: flagged', unmixed.state.prep.issues.some(function (x) { return x.code === 'not-mixed'; }));
  var c1 = unmixed.state.prep.aliquotConc(), c2 = unmixed.state.prep.aliquotConc(), c3 = unmixed.state.prep.aliquotConc();
  ok('Not mixed: successive portions differ by more than 1 %', Math.abs(c3 - c1) / c1 > 0.01, [c1, c2, c3].map(function (x) { return x.toPrecision(4); }).join(', '));
  var rp = prepRun();
  fullTitration(rp, { indicator: 'methylOrange' });
  for (var k4 = 0; k4 < 3; k4++) fullTitration(rp, { indicator: 'methylOrange' });
  var rpR = rp.results();
  [['GCSE guided', g1], ['Fe²⁺', fe], ['Ethanedioate', ox], ['RP1', rp]].forEach(function (pair) {
    var st = pair[1].state.trials.map(function (t) { return t.end.status; });
    ok(pair[0] + ': an ideal student’s titrations are all judged “endpoint”', st.every(function (x) { return x === 'endpoint'; }), st.join(', '));
  });
  near('RP1: HCl concentration from the student’s standard within 1 %', rp.solve(rpR.mean || rpR.precise[0].titre).value_M, rp.run.titrant.conc_M, rp.run.titrant.conc_M * 0.01);

  group('Review fixes');
  // Initial reading recorded before pipetting (a natural order) must not crash.
  var o1 = fresh('gcse-guided', 71);
  o1.rinseBurette('titrant'); o1.setFunnel(true); o1.fillBurette(); o1.setFunnel(false); o1.place('waste'); o1.tap(true, 'fast');
  gg = 0; while ((o1.state.burette.reading < 0.3 || o1.state.burette.jetAir > 0) && gg++ < 400) o1.tick(0.05); o1.tap(false);
  o1.rinsePipette('analyte');
  var ri = o1.recordInitial(fmt(o1.state.burette.reading));
  ok('Initial reading before pipetting is accepted', ri.ok, ri.msg);
  o1.place('flask');
  ok('Running titrant into an empty flask position is blocked', o1.add('1.0').kind === 'invalid');
  o1.pipette('touch'); o1.addIndicator('phenolphthalein'); o1.setTile(true); o1.place('flask');
  var threw = null, ff;
  try { titrateTo(o1, X.expectedTitre(o1.run)); ff = o1.recordFinal(fmt(o1.state.burette.reading)); } catch (e) { threw = e.message; }
  ok('…and the titration then records without an error', !threw && ff && ff.ok, threw || (ff && ff.msg));
  ok('…judged at the endpoint', o1.state.trials.length === 1 && o1.state.trials[0].end.status === 'endpoint', o1.state.trials[0] && JSON.stringify(o1.state.trials[0].end));
  // Indicator choice, as AQA marks it.
  function verdict(id, seed, sample, ind) { var l = L.create(X.instantiate(id, seed, sample), {}); return l.indicatorVerdict(ind).suitable; }
  ok('Methyl orange suits strong acid/strong alkali (GCSE)', verdict('gcse-guided', 3, null, 'methylOrange'));
  ok('Phenolphthalein suits strong acid/strong alkali (GCSE)', verdict('gcse-guided', 3, null, 'phenolphthalein'));
  ok('Methyl orange suits ammonia with HCl', verdict('alevel-curves', 3, 'weak-base', 'methylOrange'));
  ok('Phenolphthalein does not suit ammonia with HCl', !verdict('alevel-curves', 3, 'weak-base', 'phenolphthalein'));
  ok('Phenolphthalein suits ethanoic acid with NaOH', verdict('alevel-curves', 3, 'weak-acid', 'phenolphthalein'));
  ok('Methyl orange does not suit ethanoic acid with NaOH', !verdict('alevel-curves', 3, 'weak-acid', 'methylOrange'));
  ok('Methyl orange suits HCl with NaOH (A-level, NaOH into HCl)', verdict('alevel-curves', 3, 'strong', 'methylOrange'));
  near('GCSE Mr of KOH = 56 (GCSE data sheet)', E.relativeFormulaMass('KOH', 'GCSE'), 56, 1e-9);
  near('GCSE Mr of H₂SO₄ = 98', E.relativeFormulaMass('H2SO4', 'GCSE'), 98, 1e-9);
  near('A-level Mr of H₂SO₄ = 98.1', E.relativeFormulaMass('H2SO4'), 98.1, 1e-9);
  // RP1: adding solid after recording m1 clears it.
  var rp2 = fresh('alevel-rp1', 72), pp = rp2.state.prep;
  pp.addSolid('scoop'); pp.recordMass('m1'); pp.addSolid('small');
  ok('RP1: adding solid after recording the mass clears the stale mass', pp.m1 === null);

  /* ---------- Report ---------- */
  var out = document.getElementById('out'), html = '<table>';
  rows.forEach(function (r) {
    if (r.head) { html += '</table><h2>' + r.head + '</h2><table>'; return; }
    html += '<tr><td class="' + (r.ok ? 'pass' : 'fail') + '">' + (r.ok ? 'PASS' : 'FAIL') + '</td><td>' + r.name + '</td><td>' + (r.ok ? '' : r.detail) + '</td></tr>';
  });
  out.innerHTML = html + '</table>';
  var sum = document.getElementById('summary');
  sum.className = fail ? 'fail' : 'pass';
  sum.textContent = pass + ' passed, ' + fail + ' failed' + (fail ? ': ' + failures.join(' | ') : '');
  window.TEST_RESULT = { pass: pass, fail: fail, failures: failures };
})();
