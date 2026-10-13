/* Electrochemical Cell Builder — challenges.

   Short questions in order of difficulty, written for this tool. Each one is
   generated from the engine with a seeded generator, so the answer, the
   distractors and the worked explanation all come from the same chemistry.
   make(rnd) returns:
     q: the question (HTML)      kind: 'mcq' | 'num' | 'build'
     options: [{ html, right, why }] for mcq (shuffled by the page)
     answer, tol, unit: for num  check(state): for build
     hint, worked: HTML           scene: what the diagram shows while answering
     ht: true for a GCSE Higher Tier question */
(function (root) {
  'use strict';
  var E = root.CellEngine, K = root.CellContent, h = E.html;

  function pick(rnd, arr) { return arr[Math.floor(rnd() * arr.length)]; }
  function v(x) { return E.signed(x) + ' V'; }
  function eqHtml(s) { return E.equation(s.left, s.right, 'html'); }
  // A pair of different half-cells, optionally with different electron counts.
  function pair(rnd, needDiffN, pool) {
    var ids = pool || E.HALF_CELLS.map(function (x) { return x.id; }), a, b, n = 0;
    do { a = pick(rnd, ids); b = pick(rnd, ids); n++; }
    while ((a === b || (needDiffN && E.halfCell(a).n === E.halfCell(b).n)) && n < 200);
    // Negative electrode (more negative E°) on the left, as the bench draws it.
    return E.halfCell(a).E <= E.halfCell(b).E ? [a, b] : [b, a];
  }

  /* ---------- GCSE ---------- */
  var GCSE = [
    { id: 'g-build', title: 'Build a bigger voltage', make: function (rnd) {
      var el = pick(rnd, ['nacl', 'h2so4', 'lemon']), base = pick(rnd, [['fe', 'cu'], ['zn', 'cu'], ['zn', 'fe']]);
      var ref = E.simpleCell(base[0], base[1], el), elName = E.ELECTROLYTE[el].name;
      return {
        kind: 'build',
        q: 'A cell made from <b>' + E.METAL[base[0]].name + ' and ' + E.METAL[base[1]].name + '</b> in ' + elName + ' gives about ' + ref.typical.toFixed(2) + ' V. Use the controls to build a cell <b>in the same electrolyte</b> that gives a <b>higher</b> voltage, then press Check.',
        setup: { m1: base[0], m2: base[1], el: el },
        check: function (s) {
          if (s.el !== el) return { ok: false, msg: 'Keep the electrolyte as ' + elName + ': change only the metals, so the comparison is fair.' };
          var r = E.simpleCell(s.m1, s.m2, s.el);
          if (!r.valid) return { ok: false, msg: r.why };
          if (r.typical > ref.typical) return { ok: true, msg: 'Yes: ' + r.negative.name + ' and ' + r.positive.name + ' are further apart in reactivity, so this cell gives about ' + r.typical.toFixed(2) + ' V.' };
          return { ok: false, msg: 'This cell gives about ' + r.typical.toFixed(2) + ' V, which is not higher. Choose two metals that are further apart in the reactivity series.' };
        },
        hint: 'The further apart the metals are in the reactivity series, the bigger the voltage. Magnesium is the most reactive metal here and copper the least.',
        worked: 'Magnesium and copper are the furthest apart in reactivity of the metals here, so they give the biggest voltage in any electrolyte.'
      };
    } },
    { id: 'g-compare', title: 'Use the data', make: function (rnd) {
      var el = E.ELECTROLYTE[pick(rnd, ['nacl', 'h2so4'])];
      var vs = ['mg', 'zn', 'fe'].map(function (m) { return { m: m, v: E.simpleCell(m, 'cu', el.id).typical }; });
      var designs = pick(rnd, [[['mg', 'fe'], ['zn', 'fe']], [['mg', 'zn'], ['zn', 'fe']], [['mg', 'fe'], ['mg', 'zn']]]);
      var vA = E.simpleCell(designs[0][0], designs[0][1], el.id).typical, vB = E.simpleCell(designs[1][0], designs[1][1], el.id).typical;
      function nm(d) { return E.METAL[d[0]].name + ' and ' + E.METAL[d[1]].name; }
      var bigger = vA > vB ? 0 : 1;
      return {
        kind: 'mcq', scene: { type: 'simple', m1: designs[0][0], m2: designs[0][1], el: el.id },
        q: 'A student measured these voltages for cells in ' + el.name + ', each with copper as the other electrode:' +
          '<table class="mini"><thead><tr><th>Metal with copper</th><th>Voltage / V</th></tr></thead><tbody>' +
          vs.map(function (x) { return '<tr><td>' + E.METAL[x.m].name + '</td><td>' + x.v.toFixed(2) + '</td></tr>'; }).join('') + '</tbody></table>' +
          'Which cell should give the greater voltage?',
        options: [
          { html: nm(designs[0]), right: bigger === 0, why: 'About ' + vA.toFixed(2) + ' V: the difference between their readings against copper.' },
          { html: nm(designs[1]), right: bigger === 1, why: 'About ' + vB.toFixed(2) + ' V: the difference between their readings against copper.' },
          { html: 'They give the same voltage', right: false, why: 'The metals are different distances apart in reactivity, so the voltages differ.' }
        ],
        hint: 'The bigger the reading against copper, the more reactive the metal. Which pair is further apart?',
        worked: 'Against copper: ' + vs.map(function (x) { return E.METAL[x.m].name + ' ' + x.v.toFixed(2) + ' V'; }).join(', ') + '. ' + nm(designs[0]) + ': ' + vA.toFixed(2) + ' V; ' + nm(designs[1]) + ': ' + vB.toFixed(2) + ' V. The pair further apart in reactivity gives the greater voltage.'
      };
    } },
    { id: 'g-electrodes', title: 'Name the electrodes', make: function (rnd) {
      var id = pick(rnd, ['cuso4-aq', 'nacl-aq', 'pbbr2-l', 'cucl2-aq']);
      return {
        kind: 'mcq', scene: { type: 'electrolysis', id: id, roles: false },
        q: 'In the diagram, the left electrode is connected to the <b>negative</b> terminal of the power supply. What is it called, and which ions move towards it?',
        options: [
          { html: 'The cathode; positive ions move towards it', right: true, why: 'The negative electrode in electrolysis is the cathode. Opposite charges attract, so positive ions move to it.' },
          { html: 'The anode; positive ions move towards it', right: false, why: 'In electrolysis the anode is the positive electrode.' },
          { html: 'The cathode; negative ions move towards it', right: false, why: 'Negative ions are repelled by a negative electrode; they move to the anode.' },
          { html: 'The anode; negative ions move towards it', right: false, why: 'This describes the other electrode, the positive one.' }
        ],
        hint: 'Opposite charges attract. In electrolysis, the electrode connected to the negative terminal is the cathode.',
        worked: 'Negative electrode = cathode; positive ions (cations) move to it and gain electrons (reduction).'
      };
    } },
    { id: 'g-products', title: 'Predict the products', make: function (rnd) {
      var id = pick(rnd, ['nacl-aq', 'cuso4-aq', 'cucl2-aq', 'kbr-aq', 'na2so4-aq', 'pbbr2-l', 'zncl2-l', 'h2so4-aq']);
      var r = E.electrolysis(id), c = r.compound;
      var cat = r.cathode.info.name, an = r.anode.info.name;
      var metal = K.metalName(c.cation.metal);
      var opts = [
        { html: 'Cathode: ' + cat + '; anode: ' + an, right: true, why: 'Correct.' },
        { html: 'Cathode: ' + an + '; anode: ' + cat, right: false, why: 'The electrodes are swapped: positive ions go to the cathode, negative ions to the anode.' }
      ];
      if (c.state === 'aq' && c.cation.metal !== 'H') opts.push({ html: 'Cathode: ' + (r.cathode.product === 'H2' ? metal : 'hydrogen') + '; anode: ' + an, right: false,
        why: r.cathode.product === 'H2' ? K.cap(metal) + ' is more reactive than hydrogen, so hydrogen forms instead.' : K.cap(metal) + ' is less reactive than hydrogen, so ' + metal + ' forms, not hydrogen.' });
      else if (c.state === 'l') opts.push({ html: 'Cathode: hydrogen; anode: ' + an, right: false, why: 'A molten compound contains no water, so there are no hydrogen ions: the metal forms.' });
      if (r.anode.product !== 'O2') opts.push({ html: 'Cathode: ' + cat + '; anode: oxygen', right: false, why: c.state === 'l' ? 'A molten compound has no water, so the only negative ions are ' + c.anion.name + ' ions: ' + an + ' forms.' : 'The compound contains halide ions, so the halogen forms, not oxygen.' });
      else opts.push({ html: 'Cathode: ' + cat + '; anode: sulfur dioxide', right: false, why: 'Sulfate ions are not discharged; oxygen is produced.' });
      return {
        kind: 'mcq', scene: { type: 'electrolysis', id: id, roles: true, products: false },
        q: 'Predict the products of the electrolysis of <b>' + (c.state === 'l' ? 'molten ' : '') + c.name + (c.state === 'aq' ? ' solution' : '') + '</b> with inert electrodes.',
        options: opts,
        hint: c.state === 'l' ? 'In a molten compound: metal at the cathode, non-metal at the anode.' : 'Cathode: hydrogen if the metal is more reactive than hydrogen. Anode: oxygen unless there are halide ions.',
        worked: K.electrolysis(r, { ht: false }).replace(/<h4>What you would see[\s\S]*$/, '')
      };
    } },
    { id: 'g-series', title: 'Why cells in series?', make: function () {
      return {
        kind: 'mcq', scene: { type: 'battery', n: 3 },
        q: 'Why does a battery contain two or more cells connected in series?',
        options: [
          { html: 'To give a bigger voltage than one cell can', right: true, why: 'Cells in series add their voltages.' },
          { html: 'So the battery never runs out', right: false, why: 'A non-rechargeable battery stops working when a reactant is used up, however many cells it has.' },
          { html: 'So that electrons can flow through the electrolyte', right: false, why: 'Electrons flow through the external circuit; ions move in the electrolyte.' },
          { html: 'To make each cell give a higher voltage', right: false, why: 'Each cell gives the same voltage as before; the voltages add up.' }
        ],
        hint: 'Look at what happens to the voltmeter reading as cells are added.',
        worked: 'A battery is two or more cells in series. The voltages add, so the battery gives a greater voltage than one cell.'
      };
    } },
    { id: 'g-half', title: 'Half-equations', ht: true, make: function (rnd) {
      var id = pick(rnd, ['nacl-aq', 'cuso4-aq', 'pbbr2-l', 'kbr-aq', 'cucl2-aq']), r = E.electrolysis(id), c = r.compound;
      var at = pick(rnd, ['cathode', 'anode']), side = r[at], other = r[at === 'cathode' ? 'anode' : 'cathode'];
      var wrongRev = E.equation(side.half.right, side.half.left, 'html');
      var badBal = at === 'cathode' && side.product !== 'H2' ? E.equation([[c.cation.f, 1], ['e^-', 1]], side.half.right, 'html') : at === 'anode' && side.product !== 'O2' ? E.equation([[c.anion.f, 1]], [[side.product, 1], ['e^-', 1]], 'html') : E.equation([['H^+', 1], ['e^-', 1]], [['H2', 1]], 'html');
      return {
        kind: 'mcq', ht: true, scene: { type: 'electrolysis', id: id, roles: true },
        q: 'Which half-equation shows the reaction at the <b>' + at + '</b> in the electrolysis of ' + (c.state === 'l' ? 'molten ' : '') + c.name + (c.state === 'aq' ? ' solution' : '') + '?',
        options: [
          { html: eqHtml(side.half), right: true, why: at === 'cathode' ? 'Reduction: positive ions gain electrons at the cathode.' : 'Oxidation: negative ions lose electrons at the anode.' },
          { html: eqHtml(other.half), right: false, why: 'That reaction happens at the other electrode.' },
          { html: wrongRev, right: false, why: 'This is written the wrong way round for this electrode.' },
          { html: badBal, right: false, why: 'This does not balance: check the atoms and the charges.' }
        ],
        hint: 'Cathode: reduction, gain of electrons. Anode: oxidation, loss of electrons. Check the charges balance.',
        worked: 'At the cathode: ' + eqHtml(r.cathode.half) + '. At the anode: ' + eqHtml(r.anode.half) + '.'
      };
    } }
  ];

  /* ---------- A-level ---------- */
  var ALEVEL = [
    { id: 'a-electrons', title: 'Electron flow', make: function (rnd) {
      var p = pair(rnd), c = E.buildCell(p[0], p[1]), L = E.halfCell(p[0]), R = E.halfCell(p[1]);
      var lr = c.anode.id === L.id;
      return {
        kind: 'mcq', scene: { type: 'galvanic', left: p[0], right: p[1], roles: false, values: true },
        q: 'The diagram shows a cell made from the <b>' + L.name + '</b> half-cell (left) and the <b>' + R.name + '</b> half-cell (right). In which direction do electrons flow?',
        options: [
          { html: 'From the ' + L.name + ' electrode to the ' + R.name + ' electrode, through the wire', right: lr, why: lr ? 'The ' + L.name + ' half-cell has the less positive E°, so it is oxidised and releases electrons.' : 'The ' + L.name + ' half-cell has the more positive E°, so it gains electrons: they flow towards it.' },
          { html: 'From the ' + R.name + ' electrode to the ' + L.name + ' electrode, through the wire', right: !lr, why: !lr ? 'The ' + R.name + ' half-cell has the less positive E°, so it is oxidised and releases electrons.' : 'The ' + R.name + ' half-cell has the more positive E°, so electrons flow towards it, not away.' },
          { html: 'Through the salt bridge, from the negative half-cell to the positive half-cell', right: false, why: 'The salt bridge carries ions, never electrons.' }
        ],
        hint: 'The half-cell with the less positive E° is oxidised: electrons leave that electrode.',
        worked: 'E°: ' + L.name + ' ' + v(L.E) + ', ' + R.name + ' ' + v(R.E) + '. The ' + c.anode.name + ' half-cell is oxidised, so electrons flow through the external circuit from the ' + c.anode.name + ' electrode to the ' + c.cathode.name + ' electrode.'
      };
    } },
    { id: 'a-half', title: 'Oxidation half-equation', make: function (rnd) {
      var p = pair(rnd), c = E.buildCell(p[0], p[1]);
      return {
        kind: 'mcq', scene: { type: 'galvanic', left: p[0], right: p[1], roles: false, values: true },
        q: 'Which half-equation shows the reaction at the <b>negative electrode</b> of this cell?',
        options: [
          { html: E.halfEquation(c.anode, 'oxidation'), right: true, why: 'The negative electrode is where oxidation happens: the half-cell with the less positive E° releases electrons.' },
          { html: E.halfEquation(c.anode, 'reduction'), right: false, why: 'Right half-cell, but this is the reduction as tabulated. At the negative electrode it runs the other way.' },
          { html: E.halfEquation(c.cathode, 'reduction'), right: false, why: 'This happens at the positive electrode.' },
          { html: E.halfEquation(c.cathode, 'oxidation'), right: false, why: 'This half-cell has the more positive E°, so it is reduced, not oxidised.' }
        ],
        hint: 'Negative electrode: oxidation. Which half-cell has the less positive E°?',
        worked: 'Negative electrode (oxidation): ' + E.halfEquation(c.anode, 'oxidation') + '. Positive electrode (reduction): ' + E.halfEquation(c.cathode, 'reduction') + '.'
      };
    } },
    { id: 'a-emf', title: 'Calculate E°cell', make: function (rnd) {
      var p = pair(rnd), c = E.buildCell(p[0], p[1]);
      return {
        kind: 'num', answer: c.emf, tol: 0.005, unit: 'V', scene: { type: 'galvanic', left: p[0], right: p[1], roles: false, values: true },
        q: 'Calculate the standard EMF of the cell made from the <b>' + E.coupleLabel(c.anode, 'html') + '</b> and <b>' + E.coupleLabel(c.cathode, 'html') + '</b> half-cells. Give your answer to 2 decimal places.',
        hint: 'E°cell = E°right − E°left, with the more negative half-cell on the left. Use the values exactly as tabulated.',
        worked: K.emfWorking(c),
        diagnose: function (x) {
          if (Math.abs(x + c.emf) < 0.006) return 'That has the right size but the wrong sign: you took E°left − E°right. With the negative electrode on the left, E°cell is positive.';
          if (Math.abs(x - E.round(c.cathode.E + c.anode.E, 2)) < 0.006) return 'You added the potentials. Subtract: E°right − E°left.';
          var mult = E.round(c.multipliers.cathode * c.cathode.E - c.multipliers.anode * c.anode.E, 2);
          if ((c.multipliers.cathode !== 1 || c.multipliers.anode !== 1) && Math.abs(x - mult) < 0.006) return 'You multiplied the potentials by the balancing numbers. Electrode potentials are never multiplied.';
          return null;
        }
      };
    } },
    { id: 'a-overall', title: 'Overall equation', make: function (rnd) {
      var p = pair(rnd, true), c = E.buildCell(p[0], p[1]);
      // The half-equations added without balancing electrons (1 : 1).
      function noE(l) { return l.filter(function (t) { return t[0] !== 'e^-'; }); }
      function merge(l) { var out = []; l.forEach(function (t) { var m = out.filter(function (o) { return o[0] === t[0]; })[0]; if (m) m[1] += t[1]; else out.push([t[0], t[1], t[2]]); }); return out; }
      var unbal = E.equation(merge(noE(c.oxidation.raw.left).concat(noE(c.reduction.raw.left))), merge(noE(c.oxidation.raw.right).concat(noE(c.reduction.raw.right))), 'html');
      var rev = E.cellForDirection(c.cathode.id, c.anode.id);
      var withE = E.equation(c.oxidation.left.concat(c.reduction.left), c.oxidation.right.concat(c.reduction.right), 'html');
      return {
        kind: 'mcq', scene: { type: 'galvanic', left: p[0], right: p[1], roles: false, values: true },
        q: 'Which is the overall equation for the reaction when this cell (' + E.coupleLabel(c.anode, 'html') + ' and ' + E.coupleLabel(c.cathode, 'html') + ') produces a current?',
        options: [
          { html: E.overallEquation(c, 'html'), right: true, why: 'Electrons balanced (' + c.electrons + ' transferred), in the feasible direction.' },
          { html: unbal, right: false, why: 'The electrons do not balance: the charges on each side are different.' },
          { html: E.overallEquation(rev, 'html'), right: false, why: 'Balanced, but this is the reverse reaction, with a negative E°cell.' },
          { html: withE, right: false, why: 'Electrons should cancel and not appear in an overall equation.' }
        ],
        hint: 'Multiply the half-equations so the electrons are equal, add them, and cancel the electrons.',
        worked: K.equationsHtml(c)
      };
    } },
    { id: 'a-notation', title: 'Cell representation', make: function (rnd) {
      var p = pair(rnd), c = E.buildCell(p[0], p[1]);
      var right = E.notation(c, 'html');
      var swapped = E.halfNotation(c.cathode, true, 'html') + ' || ' + E.halfNotation(c.anode, false, 'html');
      var mirrored = E.halfNotation(c.anode, false, 'html') + ' || ' + E.halfNotation(c.cathode, true, 'html');
      var single = E.halfNotation(c.anode, true, 'html') + ' | ' + E.halfNotation(c.cathode, false, 'html');
      return {
        kind: 'mcq', scene: { type: 'galvanic', left: p[0], right: p[1], roles: false, values: true },
        q: 'Which is the conventional representation of the cell made from the ' + c.anode.name + ' and ' + c.cathode.name + ' half-cells?',
        options: [
          { html: right, right: true, why: 'Negative electrode on the left; reduced | oxidised || oxidised | reduced.' },
          { html: swapped, right: false, why: 'This puts the positive electrode on the left, so E°cell for the cell as written would be negative. The convention for a cell producing a current writes the negative electrode (oxidation) on the left.' },
          { html: mirrored, right: false, why: 'Each half-cell is the wrong way round: the oxidised forms go next to the salt bridge (||).' },
          { html: single, right: false, why: 'The salt bridge is shown by a double line, ||.' }
        ],
        hint: 'Left: the half-cell that is oxidised. Read it as reduced form | oxidised form || oxidised form | reduced form.',
        worked: '<p class="notation">' + right + '</p><p>E°cell = E°right − E°left = ' + v(c.emf) + '.</p>'
      };
    } },
    { id: 'a-bridge', title: 'The salt bridge', make: function (rnd) {
      var p = pick(rnd, [['zn', 'ag'], ['cu', 'ag'], ['fe', 'ag']]);
      return {
        kind: 'mcq', scene: { type: 'galvanic', left: p[0], right: p[1], roles: true, values: true },
        q: 'This cell uses a salt bridge of filter paper soaked in saturated potassium nitrate. Which statement is correct?',
        options: [
          { html: 'It lets ions move between the solutions, completing the circuit and keeping them neutral.', right: true, why: 'Correct, and potassium nitrate is chosen because it does not react with either solution.' },
          { html: 'It carries electrons from one half-cell to the other.', right: false, why: 'Electrons travel only through the external wire.' },
          { html: 'Potassium chloride would work just as well here.', right: false, why: 'Chloride ions would precipitate silver chloride with the Ag⁺ ions, changing the concentration.' },
          { html: 'It lets the two solutions mix so that they can react.', right: false, why: 'If the solutions mixed, the reaction would happen directly with no current in the wire.' }
        ],
        hint: 'What carries charge in a solution, and what carries it in a wire?',
        worked: 'The salt bridge provides a path for ions, so the circuit is complete and each solution stays electrically neutral. It must not react with either half-cell: potassium nitrate, not potassium chloride, with silver ions.'
      };
    } },
    { id: 'a-error', title: 'Spot the error', make: function (rnd) {
      var p = pair(rnd, true, ['al', 'ag', 'zn', 'mg', 'cu', 'fe3', 'fe', 'ni']), c = E.buildCell(p[0], p[1]);
      var kc = c.multipliers.cathode, ka = c.multipliers.anode;
      var wrong = E.round(kc * c.cathode.E - ka * c.anode.E, 2);
      return {
        kind: 'mcq', scene: { type: 'galvanic', left: c.anode.id, right: c.cathode.id, roles: false, values: true },
        q: 'A student worked out E°cell for the cell made from ' + E.coupleLabel(c.anode, 'html') + ' (E° = ' + v(c.anode.E) + ') and ' + E.coupleLabel(c.cathode, 'html') + ' (E° = ' + v(c.cathode.E) + '):' +
          '<p class="working">The equation needs ' + (ka !== 1 ? ka + ' × the ' + c.anode.name + ' half-equation' : '') + (ka !== 1 && kc !== 1 ? ' and ' : '') + (kc !== 1 ? kc + ' × the ' + c.cathode.name + ' half-equation' : '') + ', so<br>E°cell = ' + (kc !== 1 ? kc + ' × ' : '') + '(' + v(c.cathode.E) + ') − ' + (ka !== 1 ? ka + ' × ' : '') + '(' + v(c.anode.E) + ') = ' + v(wrong) + '</p>What is wrong?',
        options: [
          { html: 'The electrode potentials should not be multiplied by the balancing numbers.', right: true, why: 'Correct. E° does not depend on how many moles react: E°cell = ' + v(c.emf) + '.' },
          { html: 'The subtraction is the wrong way round.', right: false, why: 'The order is right: E°(positive) − E°(negative).' },
          { html: 'The sign of the ' + c.anode.name + ' potential should be changed first.', right: false, why: 'Tabulated values are used as they are: changing a sign and then subtracting counts the oxidation twice.' },
          { html: 'Nothing: the working is correct.', right: false, why: 'The answer should be ' + v(c.emf) + '.' }
        ],
        hint: 'What happens to E° when you double a half-equation?',
        worked: K.emfWorking(c)
      };
    } },
    { id: 'a-measure', title: 'Measured or standard?', make: function (rnd) {
      var p = pick(rnd, [['zn', 'cu'], ['cu', 'ag'], ['fe', 'cu'], ['zn', 'ag']]), c = E.buildCell(p[0], p[1]);
      var conc = pick(rnd, [0.1, 0.05, 0.5]), dilute = pick(rnd, ['anode', 'cathode']);
      var m = E.meterReading({ left: c.anode.id, right: c.cathode.id, concLeft: dilute === 'anode' ? conc : 1, concRight: dilute === 'cathode' ? conc : 1, practical: false });
      var dilH = dilute === 'anode' ? c.anode : c.cathode;
      return {
        kind: 'mcq', scene: { type: 'galvanic', left: c.anode.id, right: c.cathode.id, roles: true, values: true },
        q: 'E°cell for the ' + c.anode.name + ' / ' + c.cathode.name + ' cell is ' + v(c.emf) + '. A student\'s cell, with a high-resistance voltmeter, read <b>' + m.value.toFixed(2) + ' V</b>. The ' + dilH.name + ' solution turned out to be ' + conc.toFixed(2) + ' mol dm⁻³. Which is the best explanation?',
        options: [
          { html: 'The conditions were not standard: a lower ' + E.html(dilH.ion) + ' concentration shifts that electrode potential.', right: true, why: E.concentrationEffect(dilH, conc).text + ' So the reading is ' + (m.value > c.emf ? 'higher' : 'lower') + ' than E°cell.' },
          { html: 'Electrons were lost through the salt bridge.', right: false, why: 'Electrons do not pass through the salt bridge.' },
          { html: 'The electrodes were too small.', right: false, why: 'Electrode size does not change the EMF.' },
          { html: 'E°cell is wrong: it should always equal the measured value.', right: false, why: 'E°cell applies only under standard conditions; a measurement under other conditions can differ.' }
        ],
        hint: 'Standard conditions include 1.00 mol dm⁻³ for each solution of ions.',
        worked: 'E° values are for 298 K, 100 kPa and 1.00 mol dm⁻³. ' + E.concentrationEffect(dilH, conc).text
      };
    } },
    { id: 'a-feasible', title: 'Is it feasible?', make: function (rnd) {
      var cases = [['i2', 'fe3'], ['fe', 'cu'], ['cu', 'fe3'], ['cu', 'she'], ['ag', 'cu'], ['fe3', 'she'], ['fe3', 'ag'], ['zn', 'fe']];
      // Not Cu²⁺ with I⁻: E° says no, but it does react, because CuI precipitates.
      var cs = pick(rnd, cases), red = E.halfCell(cs[0]), ox = E.halfCell(cs[1]);
      var d = E.cellForDirection(red.id, ox.id);
      var agentOx = E.html(ox.ox[0][0]), agentRed = E.html(red.red[0][0]);
      return {
        kind: 'mcq', scene: { type: 'galvanic', left: red.id, right: ox.id, roles: false, values: true },
        q: 'Use the data to decide: under standard conditions, will ' + agentOx + ' oxidise ' + agentRed + '?<table class="mini"><tbody><tr><td>' + E.halfEquation(ox, 'reduction', 'html', { arrow: ' ⇌ ' }) + '</td><td>' + v(ox.E) + '</td></tr><tr><td>' + E.halfEquation(red, 'reduction', 'html', { arrow: ' ⇌ ' }) + '</td><td>' + v(red.E) + '</td></tr></tbody></table>',
        options: [
          { html: 'Yes', right: d.feasible, why: d.feasible ? 'E°cell = ' + v(ox.E) + ' − (' + v(red.E) + ') = ' + v(d.emf) + ', which is positive.' : 'E°cell for this direction would be ' + v(d.emf) + ', which is negative.' },
          { html: 'No', right: !d.feasible, why: !d.feasible ? 'E°cell = ' + v(ox.E) + ' − (' + v(red.E) + ') = ' + v(d.emf) + ': negative, so not feasible.' : 'E°cell for this direction is ' + v(d.emf) + ', which is positive, so it is feasible.' }
        ],
        hint: 'The oxidising agent is reduced. E°cell = E°(half-cell reduced) − E°(half-cell oxidised). Positive means feasible.',
        worked: K.direction(d, red, ox)
      };
    } }
  ];

  root.CellChallenges = { gcse: GCSE, alevel: ALEVEL };
})(typeof self !== 'undefined' ? self : this);
