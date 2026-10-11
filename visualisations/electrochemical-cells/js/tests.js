/* Electrochemical Cell Builder — tests. Loaded by tests.html, which also runs headless:
     msedge --headless --disable-gpu --virtual-time-budget=20000 --dump-dom http://localhost:8765/visualisations/electrochemical-cells/tests.html
   Engine tests run at once; the page tests then load index.html in a frame
   and drive it (they need the page served over http, not file://).
   Results go in #summary and window.TEST_RESULT = { pass, fail, failures, done }.

   Values used: data-book standard reduction potentials to 2 d.p. (see
   HALF_CELLS in engine.js): Zn²⁺/Zn −0.76, Cu²⁺/Cu +0.34, Ag⁺/Ag +0.80,
   Al³⁺/Al −1.66, Mg²⁺/Mg −2.37, Fe²⁺/Fe −0.44, Fe³⁺/Fe²⁺ +0.77, I₂/I⁻ +0.54.
   EMFs are compared to ±0.005 V, i.e. exactly at 2 d.p. */
(function () {
  'use strict';
  var E = window.CellEngine;
  var pass = 0, fail = 0, failures = [], rows = [], section = '';

  function group(name) { section = name; rows.push({ head: name }); }
  function ok(name, cond, detail) {
    if (cond) pass++; else { fail++; failures.push(section + ': ' + name + (detail ? ' — ' + detail : '')); }
    rows.push({ name: name, ok: !!cond, detail: detail || '' });
  }
  function eq(name, got, want) { ok(name, got === want, 'got "' + got + '", want "' + want + '"'); }
  function near(name, got, want, tol) {
    var good = typeof got === 'number' && isFinite(got) && Math.abs(got - want) <= (tol === undefined ? 0.005 : tol);
    ok(name, good, 'got ' + got + ', want ' + want);
  }
  function txt(cell) { return E.overallEquation(cell, 'uni'); }

  /* ---------- Formulae ---------- */
  group('Formulae and balancing');
  eq('Zn²⁺ in Unicode', E.uni('Zn^2+'), 'Zn²⁺');
  eq('SO₄²⁻ in Unicode', E.uni('SO4^2-'), 'SO₄²⁻');
  eq('Cu²⁺ in HTML', E.html('Cu^2+'), 'Cu<sup>2+</sup>');
  eq('NO₃⁻ in HTML uses a true minus', E.html('NO3^-'), 'NO<sub>3</sub><sup>−</sup>');
  ok('atoms(Cr2O7^2-) = Cr2 O7, charge −2', (function () { var a = E.atoms('Cr2O7^2-'); return a.atoms.Cr === 2 && a.atoms.O === 7 && a.charge === -2; })());
  ok('atoms(e^-) has no atoms and charge −1', (function () { var a = E.atoms('e^-'); return Object.keys(a.atoms).length === 0 && a.charge === -1; })());
  ok('balanceCheck rejects Zn + Ag⁺ → Zn²⁺ + Ag (charge)', !E.balanceCheck([['Zn', 1], ['Ag^+', 1]], [['Zn^2+', 1], ['Ag', 1]]).ok);
  eq('signed(1.1) = +1.10', E.signed(1.1), '+1.10');
  eq('signed(-0.76) uses a true minus', E.signed(-0.76), '−0.76');

  /* ---------- Test A ---------- */
  group('Test A: zinc / copper (Daniell cell)');
  var A = E.buildCell('zn', 'cu');
  ok('valid', A.valid);
  eq('anode (oxidised, negative) is zinc', A.anode.id, 'zn');
  eq('cathode (reduced, positive) is copper', A.cathode.id, 'cu');
  eq('negative electrode is zinc', A.negative, 'zn');
  ok('electrons flow zinc → copper', A.electronsFrom === 'zn' && A.electronsTo === 'cu');
  near('E°cell = +1.10 V', A.emf, 1.10);
  eq('overall equation', txt(A), 'Zn + Cu²⁺ → Zn²⁺ + Cu');
  eq('cell notation', E.notation(A, 'uni'), 'Zn(s) | Zn²⁺(aq) || Cu²⁺(aq) | Cu(s)');
  eq('oxidation half-equation', E.halfEquation(A.anode, 'oxidation', 'uni'), 'Zn → Zn²⁺ + 2e⁻');
  eq('reduction half-equation', E.halfEquation(A.cathode, 'reduction', 'uni'), 'Cu²⁺ + 2e⁻ → Cu');
  eq('salt bridge: anions go to the anode compartment', A.bridge.toAnode, 'anion');
  eq('salt bridge: cations go to the cathode compartment', A.bridge.toCathode, 'cation');
  eq('anode compartment: Zn²⁺ is made', A.bridge.anode.made[0][0], 'Zn^2+');
  eq('cathode compartment: Cu²⁺ is used up', A.bridge.cathode.used[0][0], 'Cu^2+');

  /* ---------- Test B ---------- */
  group('Test B: the order of selection does not change the chemistry');
  var B = E.buildCell('cu', 'zn');
  eq('chosen copper first: anode still zinc', B.anode.id, 'zn');
  near('E°cell unchanged at +1.10 V', B.emf, 1.10);
  ok('electrons still zinc → copper', B.electronsFrom === 'zn' && B.electronsTo === 'cu');
  eq('notation still has zinc on the left', E.notation(B, 'uni'), 'Zn(s) | Zn²⁺(aq) || Cu²⁺(aq) | Cu(s)');
  eq('the order chosen is kept for the diagram (left = copper)', B.leftId, 'cu');
  var Brev = E.cellForDirection('cu', 'zn');
  near('stated reverse direction (Cu oxidised): E = −1.10 V', Brev.emf, -1.10);
  ok('…which is not feasible', Brev.feasible === false);
  eq('…equation for that direction', txt(Brev), 'Cu + Zn²⁺ → Cu²⁺ + Zn');
  near('stated forward direction: E = +1.10 V', E.cellForDirection('zn', 'cu').emf, 1.10);

  /* ---------- Test C ---------- */
  group('Test C: electron balancing without multiplying E°');
  var C1 = E.buildCell('ag', 'zn');
  near('Zn / Ag: E°cell = +1.56 V (not 0.80 × 2 + 0.76)', C1.emf, 1.56);
  eq('Zn / Ag: cathode is silver (more positive E°)', C1.cathode.id, 'ag');
  eq('Zn / Ag: 2 electrons transferred', C1.electrons, 2);
  eq('Zn / Ag: silver half-equation scaled ×2', C1.multipliers.cathode, 2);
  eq('Zn / Ag: overall', txt(C1), 'Zn + 2Ag⁺ → Zn²⁺ + 2Ag');
  var C2 = E.buildCell('al', 'cu');
  near('Al / Cu: E°cell = +2.00 V', C2.emf, 2.00);
  ok('Al / Cu: E° not multiplied (would give 3×0.34 + 2×1.66 = 4.34)', Math.abs(C2.emf - 4.34) > 0.5);
  eq('Al / Cu: 6 electrons transferred', C2.electrons, 6);
  eq('Al / Cu: overall', txt(C2), '2Al + 3Cu²⁺ → 2Al³⁺ + 3Cu');
  var C3 = E.buildCell('zn', 'fe3');
  near('Zn / Fe³⁺,Fe²⁺: +1.53 V', C3.emf, 1.53);
  eq('Zn / Fe³⁺,Fe²⁺: overall', txt(C3), 'Zn + 2Fe³⁺ → Zn²⁺ + 2Fe²⁺');
  eq('Zn / Fe³⁺,Fe²⁺: notation puts Pt outside', E.notation(C3, 'uni'), 'Zn(s) | Zn²⁺(aq) || Fe³⁺(aq), Fe²⁺(aq) | Pt(s)');
  var C4 = E.buildCell('fe', 'fe3');
  eq('Fe / Fe³⁺: Fe²⁺ on one side only', txt(C4), 'Fe + 2Fe³⁺ → 3Fe²⁺');
  near('Fe / Fe³⁺: +1.21 V', C4.emf, 1.21);
  var C5 = E.buildCell('she', 'cu');
  near('SHE / Cu: +0.34 V', C5.emf, 0.34);
  eq('SHE / Cu notation', E.notation(C5, 'uni'), 'Pt(s) | H₂(g) | H⁺(aq) || Cu²⁺(aq) | Cu(s)');
  eq('SHE / Cu overall', txt(C5), 'H₂ + Cu²⁺ → 2H⁺ + Cu');
  var C6 = E.buildCell('zn', 'she');
  near('Zn / SHE: +0.76 V', C6.emf, 0.76);
  eq('Zn / SHE notation', E.notation(C6, 'uni'), 'Zn(s) | Zn²⁺(aq) || H⁺(aq) | H₂(g) | Pt(s)');
  var C7 = E.buildCell('i2', 'fe3');
  near('I⁻ / Fe³⁺: +0.23 V', C7.emf, 0.23);
  eq('I⁻ / Fe³⁺ overall', txt(C7), '2I⁻ + 2Fe³⁺ → I₂ + 2Fe²⁺');
  eq('I⁻ / Fe³⁺ notation', E.notation(C7, 'uni'), 'Pt(s) | I⁻(aq), I₂(aq) || Fe³⁺(aq), Fe²⁺(aq) | Pt(s)');
  near('Mg / Cu: +2.71 V', E.buildCell('mg', 'cu').emf, 2.71);
  eq('Cu + 2Ag⁺ feasible (+0.46 V)', E.cellForDirection('cu', 'ag').feasible && E.round(E.cellForDirection('cu', 'ag').emf, 2) === 0.46, true);
  ok('Cu + 2H⁺ not feasible', E.cellForDirection('cu', 'she').feasible === false);

  group('Every pair: direction, sign and balance');
  var ids = E.HALF_CELLS.map(function (h) { return h.id; }), pairs = 0, bad = [];
  ids.forEach(function (a) { ids.forEach(function (b) {
    if (a === b) return;
    var c = E.buildCell(a, b); pairs++;
    if (!c.valid) { bad.push(a + '/' + b + ' invalid'); return; }
    if (c.emf <= 0) bad.push(a + '/' + b + ' emf ' + c.emf);
    if (c.cathode.E < c.anode.E) bad.push(a + '/' + b + ' cathode less positive');
    var bc = E.balanceCheck(c.overall.left, c.overall.right);
    if (!bc.ok) bad.push(a + '/' + b + ' ' + bc.why);
    var rb = E.balanceCheck(c.reduction.raw.left, c.reduction.raw.right), ob = E.balanceCheck(c.oxidation.raw.left, c.oxidation.raw.right);
    if (!rb.ok || !ob.ok) bad.push(a + '/' + b + ' half-equation');
    if (E.round(c.emf, 2) !== E.round(c.cathode.E - c.anode.E, 2)) bad.push(a + '/' + b + ' emf arithmetic');
    var r = E.cellForDirection(c.cathode.id, c.anode.id);
    if (E.round(r.emf, 2) !== -E.round(c.emf, 2) || r.feasible) bad.push(a + '/' + b + ' reverse sign');
    if (/e⁻/.test(txt(c))) bad.push(a + '/' + b + ' electrons left in equation');
  }); });
  ok(pairs + ' ordered pairs: all valid, positive, balanced, reverse = −E', bad.length === 0, bad.slice(0, 6).join('; '));

  group('Chemistry review fixes');
  var iodAn = E.buildCell('i2', 'fe3'), iodCa = E.buildCell('zn', 'i2');
  ok('I₂ is not counted as an ion (anode compartment: I⁻ used up only)', iodAn.bridge.anode.made.length === 0 && iodAn.bridge.anode.used[0][0] === 'I^-');
  ok('I₂ is not counted as an ion (cathode compartment: I⁻ produced only)', iodCa.bridge.cathode.used.length === 0 && iodCa.bridge.cathode.made[0][0] === 'I^-');
  var mgal = E.meterReading({ left: 'mg', right: 'al' });
  ok('Mg / Al with oxide layers: a real reading above zero, magnesium still negative', mgal.value > 0.2 && mgal.negative === 'mg', 'got ' + mgal.value);
  var mgcu = E.meterReading({ left: 'mg', right: 'cu' });
  near('Mg / Cu with the oxide layer reads about 2.16 V', mgcu.value, 2.16, 0.02);
  eq('molten zinc chloride: zinc forms as a solid', E.electrolysis('zncl2-l').cathode.half.right[0][2], 's');
  ok('molten lead bromide: bromine fumes, not an orange solution', /fumes/.test(E.electrolysis('pbbr2-l').anode.info.see) && /orange-brown colour/.test(E.electrolysis('kbr-aq').anode.info.see));

  /* ---------- Test F (A-level) ---------- */
  group('Test F: invalid or incomplete cells');
  var f1 = E.buildCell('zn', null);
  ok('one half-cell missing: invalid, no voltage', !f1.valid && f1.emf === undefined && /Choose/.test(f1.why));
  var f2 = E.buildCell('cu', 'cu');
  ok('identical half-cells: invalid with zero voltage, explained', !f2.valid && f2.zero && /zero/.test(f2.why));
  var f3 = E.buildCell('zn', 'unobtainium');
  ok('unsupported half-cell: no invented voltage', !f3.valid && f3.code === 'unsupported' && f3.emf === undefined);
  ok('no salt bridge: circuit incomplete', E.bridgeCheck('none', A.anode, A.cathode).code === 'no-bridge');
  ok('wire as a bridge: rejected, carries electrons not ions', E.bridgeCheck('wire', A.anode, A.cathode).code === 'not-ionic');
  ok('KCl bridge with Ag⁺: precipitate', E.bridgeCheck('kcl', E.halfCell('zn'), E.halfCell('ag')).code === 'precipitate');
  ok('KCl bridge with Zn / Cu: fine', E.bridgeCheck('kcl', A.anode, A.cathode).ok);
  ok('KNO₃ bridge with Zn / Ag: fine', E.bridgeCheck('kno3', E.halfCell('zn'), E.halfCell('ag')).ok);

  /* ---------- Simulated readings ---------- */
  group('Simulated meter readings (A-level)');
  var m0 = E.meterReading({ left: 'zn', right: 'cu', practical: false });
  near('Zn / Cu, standard, no scatter: reads +1.10', m0.value, 1.10);
  near('leads reversed: reads −1.10', E.meterReading({ left: 'zn', right: 'cu', vLead: 'left', practical: false }).value, -1.10);
  near('V lead on copper: positive', E.meterReading({ left: 'zn', right: 'cu', vLead: 'right', practical: false }).value, 1.10);
  var spread = [0, 1, 2, 3, 4, 5].map(function (t) { return E.meterReading({ left: 'zn', right: 'cu', seed: 42, trial: t }).value; });
  ok('scatter stays within ±0.01 V of E°cell', spread.every(function (v) { return Math.abs(v - 1.10) <= 0.0125; }), spread.join(', '));
  eq('same seed and trial gives the same reading', E.meterReading({ left: 'zn', right: 'cu', seed: 9, trial: 2 }).value, E.meterReading({ left: 'zn', right: 'cu', seed: 9, trial: 2 }).value);
  var mg = E.meterReading({ left: 'mg', right: 'cu' });
  ok('Mg / Cu reads well below 2.71 (oxide layer), and says why', mg.value < 2.4 && mg.practical && mg.notes.length > 0, 'got ' + mg.value);
  var lowCu = E.meterReading({ left: 'zn', right: 'cu', concRight: 0.01, practical: false });
  ok('lower [Cu²⁺]: reading falls', lowCu.value < 1.10 && lowCu.value > 0.9, 'got ' + lowCu.value);
  var lowZn = E.meterReading({ left: 'zn', right: 'cu', concLeft: 0.01, practical: false });
  ok('lower [Zn²⁺]: reading rises', lowZn.value > 1.10 && lowZn.value < 1.3, 'got ' + lowZn.value);
  ok('non-standard reading is flagged as non-standard', lowCu.standard === false && m0.standard === true);
  var ce = E.concentrationEffect(E.halfCell('cu'), 0.1);
  ok('Le Chatelier text: less Cu²⁺ → left, less positive', ce.shift === 'left' && !ce.morePositive && /less positive/.test(ce.text));
  ok('Le Chatelier text: more Zn²⁺ → right, more positive', E.concentrationEffect(E.halfCell('zn'), 2).morePositive);
  ok('I₂/I⁻: more I⁻ (reduced form) → left', E.concentrationEffect(E.halfCell('i2'), 2).shift === 'left');

  /* ---------- Test D ---------- */
  group('Test D: GCSE simple cells');
  var d1 = E.simpleCell('zn', 'cu', 'nacl');
  ok('zinc / copper in salt water: valid, illustrative', d1.valid && d1.illustrative);
  eq('negative electrode is the more reactive metal (zinc)', d1.negative.id, 'zn');
  ok('electrons flow from zinc to copper', d1.electronsFrom === 'zn' && d1.electronsTo === 'cu');
  ok('reading is plausible (0.3 – 1.2 V)', d1.reading > 0.3 && d1.reading < 1.2, 'got ' + d1.reading);
  var d2 = E.simpleCell('mg', 'cu', 'nacl'), d3 = E.simpleCell('fe', 'cu', 'nacl');
  ok('further apart in reactivity, bigger voltage (Mg > Zn > Fe with Cu)', d2.typical > d1.typical && d1.typical > d3.typical);
  ok('order of choosing does not matter', E.simpleCell('cu', 'zn', 'nacl').typical === d1.typical && E.simpleCell('cu', 'zn', 'nacl').negative.id === 'zn');
  ok('same metal twice: no voltage, explained', !E.simpleCell('cu', 'cu', 'nacl').valid && E.simpleCell('cu', 'cu', 'nacl').reading === 0);
  ok('distilled water: does not work, explained', E.simpleCell('zn', 'cu', 'water').code === 'no-ions');
  ok('no electrolyte chosen: invalid', !E.simpleCell('zn', 'cu', null).valid);
  ok('electrolyte changes the reading', E.simpleCell('zn', 'cu', 'h2so4').typical !== d1.typical);
  var reps = [0, 1, 2, 3].map(function (t) { return E.simpleCell('zn', 'cu', 'nacl', { seed: 5, trial: t }).reading; });
  ok('repeat readings vary a little (±0.03 V)', reps.every(function (v) { return Math.abs(v - d1.typical) <= 0.035; }) && reps.some(function (v) { return v !== reps[0]; }), reps.join(', '));
  near('battery: three 1.5 V cells in series = 4.5 V', E.battery([{ voltage: 1.5 }, { voltage: 1.5 }, { voltage: 1.5 }]), 4.5);
  near('battery: one cell turned round subtracts', E.battery([{ voltage: 1.5 }, { voltage: 1.5, flipped: true }, { voltage: 1.5 }]), 1.5);
  var fc = E.fuelCell({ h2: true, o2: true });
  ok('fuel cell runs with H₂ and O₂', fc.running);
  eq('fuel cell overall', E.equation(fc.overall.left, fc.overall.right, 'uni'), '2H₂ + O₂ → 2H₂O');
  ok('acidic fuel cell half-equations balance', E.balanceCheck(fc.negative.left, fc.negative.right).ok && E.balanceCheck(fc.positive.left, fc.positive.right).ok);
  var fa = E.fuelCell({ h2: true, o2: true, electrolyte: 'alkaline' });
  ok('alkaline fuel cell half-equations balance', E.balanceCheck(fa.negative.left, fa.negative.right).ok && E.balanceCheck(fa.positive.left, fa.positive.right).ok);
  eq('alkaline: OH⁻ moves to the negative electrode', fa.ion.to, 'negative');
  eq('acidic: H⁺ moves to the positive electrode', fc.ion.to, 'positive');
  ok('fuel cell stops without oxygen, explained', !E.fuelCell({ h2: true, o2: false }).running && /oxygen/.test(E.fuelCell({ h2: true }).why));

  /* ---------- Test E ---------- */
  group('Test E: GCSE electrolysis');
  function ely(id) { return E.electrolysis(id); }
  function prods(id) { var r = ely(id); return r.cathode.product + ' / ' + r.anode.product; }
  eq('molten lead bromide → Pb / Br₂', prods('pbbr2-l'), 'Pb / Br2');
  eq('molten sodium chloride → Na / Cl₂', prods('nacl-l'), 'Na / Cl2');
  eq('molten zinc chloride → Zn / Cl₂', prods('zncl2-l'), 'Zn / Cl2');
  eq('sodium chloride solution → H₂ / Cl₂', prods('nacl-aq'), 'H2 / Cl2');
  eq('copper sulfate solution → Cu / O₂', prods('cuso4-aq'), 'Cu / O2');
  eq('copper chloride solution → Cu / Cl₂', prods('cucl2-aq'), 'Cu / Cl2');
  eq('potassium bromide solution → H₂ / Br₂', prods('kbr-aq'), 'H2 / Br2');
  eq('sodium sulfate solution → H₂ / O₂', prods('na2so4-aq'), 'H2 / O2');
  eq('dilute sulfuric acid → H₂ / O₂', prods('h2so4-aq'), 'H2 / O2');
  var e1 = ely('nacl-aq');
  eq('electrolysis: cathode is negative', e1.cathode.sign, '−');
  eq('electrolysis: anode is positive', e1.anode.sign, '+');
  ok('electrolysis: every cation goes to the cathode, every anion to the anode', E.IONIC.filter(function (c) { return c.state !== 's'; }).every(function (c) {
    return ely(c.id).ions.every(function (i) { return (i.sign === '+') === (i.to === 'cathode'); });
  }));
  ok('aqueous solutions include H⁺ and OH⁻ from water', e1.ions.some(function (i) { return i.f === 'H^+' && i.from === 'water'; }) && e1.ions.some(function (i) { return i.f === 'OH^-'; }));
  ok('molten: no H⁺ or OH⁻', ely('pbbr2-l').ions.length === 2);
  eq('cathode half-equation, aqueous NaCl', E.equation(e1.cathode.half.left, e1.cathode.half.right, 'uni'), '2H⁺ + 2e⁻ → H₂');
  eq('anode half-equation, aqueous NaCl', E.equation(e1.anode.half.left, e1.anode.half.right, 'uni'), '2Cl⁻ → Cl₂ + 2e⁻');
  var e2 = ely('cuso4-aq');
  eq('anode half-equation for oxygen in the AQA form', E.equation(e2.anode.half.left, e2.anode.half.right, 'uni'), '4OH⁻ → O₂ + 2H₂O + 4e⁻');
  eq('cathode half-equation, copper', E.equation(e2.cathode.half.left, e2.cathode.half.right, 'uni'), 'Cu²⁺ + 2e⁻ → Cu');
  ok('every electrolysis half-equation balances', E.IONIC.filter(function (c) { return c.state !== 's'; }).every(function (c) {
    var r = ely(c.id); return E.balanceCheck(r.cathode.half.left, r.cathode.half.right).ok && E.balanceCheck(r.anode.half.left, r.anode.half.right).ok;
  }));
  ok('sulfate is never discharged', E.IONIC.filter(function (c) { return c.state !== 's'; }).every(function (c) {
    return !/SO4/.test(JSON.stringify(ely(c.id).anode.half.left));
  }));
  ok('reduction at the cathode, oxidation at the anode', e1.cathode.process === 'reduction' && e1.anode.process === 'oxidation');
  var es = E.electrolysis('pbbr2-s');
  ok('solid lead bromide: no electrolysis, explained (ions cannot move)', !es.valid && /cannot move/.test(es.why));
  ok('supply off: nothing happens', !E.electrolysis('nacl-aq', { supply: false }).valid);
  ok('no electrolyte: invalid', !E.electrolysis(null).valid);

  /* ---------- Page tests (Test G), in a frame ---------- */
  var asyncRows = [];
  function report(done) {
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
  if (location.protocol === 'file:' || !window.CellPageTests) {
    rows.push({ head: 'Page tests' }); rows.push({ name: 'Skipped: serve the folder over http to run the page tests', ok: true });
    report(true); return;
  }
  window.CellPageTests({ group: function (n) { section = n; asyncRows.push({ head: n }); },
    ok: function (name, cond, detail) {
      if (cond) pass++; else { fail++; failures.push(section + ': ' + name + (detail ? ' — ' + detail : '')); }
      asyncRows.push({ name: name, ok: !!cond, detail: detail || '' });
    } }, function () { report(true); });
})();
