/* Electrochemical Cell Builder — learning content.

   The activities for each level and the words that explain a result. Every
   explanation is built from an engine result (engine.js), so it always says
   what the engine worked out for that configuration. GCSE text stays inside
   AQA 8462 (4.5.2 cells, batteries and fuel cells; 4.4.3 electrolysis), with
   Higher Tier points tagged HT. A-level text follows AQA 7405 3.1.11 and
   Required practical 8. Nothing beyond the specification is presented as
   required: where something goes further it says so. */
(function (root) {
  'use strict';
  var E = root.CellEngine, h = E.html;

  function cap(s) { return s.charAt(0).toUpperCase() + s.slice(1); }
  function eqn(sides, mode, opts) { return E.equation(sides.left, sides.right, mode || 'html', opts); }
  function list(terms) { return terms.map(function (t) { return h(t[0]); }).join(' and '); }
  function v(x) { return E.signed(x) + ' V'; }
  var HT = '<span class="tag ht" title="Higher Tier only">HT</span> ';

  /* ---------- Activities ---------- */
  var ACTIVITIES = [
    { id: 'simple', level: 'gcse', letter: 'A', title: 'Build a simple cell', scene: 'simple',
      spec: ['AQA GCSE 4.5.2.1'], objectives: ['Chemical reactions can produce electricity.', 'Find out how the choice of metals affects the voltage.', 'Compare results from different cells.'] },
    { id: 'variables', level: 'gcse', letter: 'B', title: 'Investigate the variables', scene: 'simple',
      spec: ['AQA GCSE 4.5.2.1'], objectives: ['Change one thing at a time and record the voltage.', 'Spot the pattern linking reactivity and voltage.', 'See why repeat readings differ a little.'] },
    { id: 'battery', level: 'gcse', letter: 'C', title: 'Cells and batteries', scene: 'battery',
      spec: ['AQA GCSE 4.5.2.1'], objectives: ['A battery is two or more cells in series.', 'Cells in series give a bigger voltage.', 'Rechargeable and non-rechargeable cells.'] },
    { id: 'electrolysis', level: 'gcse', letter: 'D', title: 'Electrolysis laboratory', scene: 'electrolysis',
      spec: ['AQA GCSE 4.4.3.1–4.4.3.5', 'Required practical 3'], objectives: ['Ions move to the oppositely charged electrode.', 'Predict the products for molten and aqueous compounds.', 'Write half-equations (Higher Tier).'] },
    { id: 'fuel', level: 'gcse', letter: 'E', title: 'Hydrogen fuel cells', scene: 'fuel',
      spec: ['AQA GCSE 4.5.2.2'], objectives: ['Fuel cells are supplied with hydrogen and oxygen.', 'The overall reaction makes water.', 'Compare fuel cells with rechargeable batteries.'] },
    { id: 'gcse-challenge', level: 'gcse', letter: '★', title: 'Challenges', scene: 'challenge',
      spec: ['AQA GCSE 4.4.3, 4.5.2'], objectives: ['Short questions that get harder.', 'Hints and a worked explanation for each.'] },

    { id: 'daniell', level: 'alevel', letter: 'F', title: 'The Daniell cell', scene: 'galvanic',
      spec: ['AQA A-level 3.1.11.1'], objectives: ['Identify oxidation, reduction and each electrode\'s sign.', 'Follow the electrons and the ions.', 'Write the conventional cell representation.'] },
    { id: 'series', level: 'alevel', letter: 'G', title: 'The electrochemical series', scene: 'galvanic',
      spec: ['AQA A-level 3.1.11.1'], objectives: ['Read standard electrode potentials as reduction potentials.', 'Predict which half-cell is oxidised.', 'Use the standard hydrogen electrode as the reference.'] },
    { id: 'emf', level: 'alevel', letter: 'H', title: 'Predict the cell EMF', scene: 'galvanic',
      spec: ['AQA A-level 3.1.11.1'], objectives: ['Calculate E°cell = E°right − E°left.', 'Balance electrons, not potentials.', 'Predict whether a redox reaction is feasible.'] },
    { id: 'rp8', level: 'alevel', letter: 'I', title: 'Required practical 8: measuring EMF', scene: 'galvanic',
      spec: ['AQA A-level Required practical 8', 'AT j'], objectives: ['Set up two half-cells, a salt bridge and a voltmeter.', 'Use the polarity of the reading.', 'Compare a measurement with E°cell and explain the difference.'] },
    { id: 'conditions', level: 'alevel', letter: 'J', title: 'Changing the conditions', scene: 'galvanic',
      spec: ['AQA A-level 3.1.11.1'], objectives: ['Standard potentials are defined at 298 K, 100 kPa, 1.00 mol dm⁻³.', 'Predict how concentration changes move a cell voltage.', 'Tell standard values apart from measured ones.'] },
    { id: 'alevel-challenge', level: 'alevel', letter: '★', title: 'Challenges', scene: 'challenge',
      spec: ['AQA A-level 3.1.11'], objectives: ['Electron flow, half-equations, EMF, equations and notation.', 'Spot the error in a calculation.'] }
  ];
  function activity(id) { return ACTIVITIES.filter(function (a) { return a.id === id; })[0] || null; }

  /* ---------- GCSE: simple cells ---------- */
  function simpleCell(r, o) {
    o = o || {};
    if (!r.valid) return '<p>' + r.why + '</p>';
    var n = r.negative, p = r.positive, el = r.electrolyte, s = '';
    s += '<h4>What is happening</h4>';
    s += '<p><b>' + cap(n.name) + ' is more reactive than ' + p.name + '</b>, so ' + n.name + ' is the <b>negative electrode</b>. ' +
      cap(n.name) + ' atoms lose electrons and become ' + n.name + ' ions, which go into the electrolyte.</p>';
    s += '<p>The electrons flow through the wire and the voltmeter, from the ' + n.name + ' to the ' + p.name + '.</p>';
    s += el.acid
      ? '<p>At the ' + p.name + ' electrode, hydrogen ions from the acid gain the electrons: you would see bubbles of hydrogen.' + (n.id === 'mg' ? ' Magnesium also reacts with the acid directly, so it fizzes too.' : '') + '</p>'
      : '<p>At the ' + p.name + ' electrode, particles in the electrolyte take the electrons.</p>';
    s += '<p>' + HT + cap(n.name) + ' is oxidised: it loses electrons. ' + h(n.symbol) + ' → ' + h(n.symbol + '^2+') + ' + 2e<sup>−</sup></p>';
    s += '<h4>What affects the voltage</h4>';
    s += '<p>The bigger the difference in reactivity between the two metals, the bigger the voltage. The electrolyte matters too: try another one with the same metals.</p>';
    s += '<p class="muted small">Readings here are illustrative: the size a school experiment gives. Real readings depend on the surfaces of the metals, the concentration and the temperature, so yours will differ.</p>';
    if (!o.brief) s += '<details class="beyond"><summary>Going further (beyond GCSE)</summary><p>At A-level you meet <i>standard electrode potentials</i>, measured for cells set up in an exactly defined way. A simple cell like this one is not set up that way, so its voltage cannot be calculated from them: it has to be measured.</p></details>';
    return s;
  }

  // The pattern question after a few results, from the student's own table.
  var PATTERN_OPTIONS = [
    { id: 'gap', text: 'The further apart the two metals are in the reactivity series, the bigger the voltage.', right: true,
      why: 'Yes. Your table shows it: the pairs with the biggest difference in reactivity give the biggest readings. The electrolyte changes the readings too.' },
    { id: 'heavy', text: 'The heavier the metals, the bigger the voltage.', right: false,
      why: 'Not this. Look at the reactivity of the metals instead of their mass: magnesium is light but gives the biggest voltages.' },
    { id: 'same', text: 'Every pair of metals gives the same voltage.', right: false,
      why: 'Not this. Compare the readings for different pairs in the same electrolyte: they are clearly different.' },
    { id: 'size', text: 'The voltage depends on how much metal is in the electrolyte.', right: false,
      why: 'Not this. The size of the electrodes changes how much current a cell can give, not its voltage. The metals chosen and the electrolyte set the voltage.' }
  ];

  /* ---------- GCSE: batteries ---------- */
  function battery(cells, single, total) {
    var n = cells.length, flipped = cells.filter(function (c) { return c.flipped; }).length, s = '';
    s += '<h4>Cells in series</h4>';
    if (n === 1) s += '<p>One cell on its own gives about <b>' + single.toFixed(2) + ' V</b>. Add another cell in series and see what happens.</p>';
    else if (!flipped) s += '<p>A <b>battery</b> is two or more cells connected in series. Their voltages add: ' + n + ' × ' + single.toFixed(2) + ' V = <b>' + total.toFixed(2) + ' V</b>.</p>';
    else s += '<p>' + (flipped === 1 ? 'One cell is' : flipped + ' cells are') + ' connected the wrong way round. A reversed cell pushes against the others, so its voltage is <b>subtracted</b>: the total is ' + total.toFixed(2) + ' V. This is why batteries must go into a device the right way round.</p>';
    s += '<p>Batteries contain cells in series because one cell does not give a big enough voltage for most devices.</p>';
    return s;
  }
  var RECHARGE = '<h4>Rechargeable or not?</h4>' +
    '<p>In a <b>non-rechargeable</b> cell or battery, the chemical reactions stop when one of the reactants has been used up. Alkaline batteries are non-rechargeable.</p>' +
    '<p><b>Rechargeable</b> cells and batteries can be recharged because the chemical reactions are reversed when an external electrical current is supplied.</p>';

  /* ---------- GCSE: electrolysis ---------- */
  var PRODUCT_CHOICES = {
    cathode: [['metal', 'the metal'], ['H2', 'hydrogen'], ['O2', 'oxygen'], ['halogen', 'the halogen']],
    anode: [['halogen', 'the halogen'], ['O2', 'oxygen'], ['H2', 'hydrogen'], ['metal', 'the metal']]
  };
  function productKind(p) { return p === 'H2' || p === 'O2' ? p : /^(Cl2|Br2|I2)$/.test(p) ? 'halogen' : 'metal'; }
  function metalName(sym) { return { Pb: 'lead', Na: 'sodium', Zn: 'zinc', Cu: 'copper', K: 'potassium', H: 'hydrogen' }[sym] || sym; }

  function electrolysis(r, o) {
    o = o || {};
    if (!r.valid) return '<p>' + r.why + '</p>';
    var c = r.compound, s = '', cat = c.cation, an = c.anion;
    s += '<h4>Why the ions move</h4>';
    s += '<p>' + (r.molten ? 'When the compound is molten' : 'When the compound is dissolved in water') + ', its ions are free to move. ' +
      'Positive ions move to the <b>negative electrode (cathode)</b>; negative ions move to the <b>positive electrode (anode)</b>.' +
      (r.molten ? '' : ' Water also provides a few hydrogen ions (H<sup>+</sup>) and hydroxide ions (OH<sup>−</sup>).') + '</p>';
    s += '<h4>At the cathode (−): ' + r.cathode.info.name + '</h4><p>';
    if (r.cathode.why === 'molten') s += 'In the molten compound the only positive ions are ' + metalName(cat.metal) + ' ions, so ' + metalName(cat.metal) + ' forms.';
    else if (r.cathode.why === 'acid') s += 'The positive ions are hydrogen ions, so hydrogen is produced.';
    else if (r.cathode.why === 'reactive') s += cap(metalName(cat.metal)) + ' is more reactive than hydrogen, so hydrogen is produced, not ' + metalName(cat.metal) + '.';
    else s += cap(metalName(cat.metal)) + ' is less reactive than hydrogen, so ' + metalName(cat.metal) + ' is produced.';
    s += '</p><h4>At the anode (+): ' + r.anode.info.name + '</h4><p>';
    if (r.anode.why === 'molten') s += 'The negative ions are ' + an.name + ' ions. They lose electrons and ' + r.anode.info.name + ' forms.';
    else if (r.anode.why === 'halide') s += cap(an.name) + ' ions are halide ions, so the halogen, ' + r.anode.info.name + ', is produced.';
    else s += 'There are no halide ions, so oxygen is produced.';
    s += '</p>';
    if (o.ht) {
      s += '<h4>' + HT + 'Half-equations</h4>';
      s += '<p>Cathode, <b>reduction</b> (gain of electrons): ' + eqn(r.cathode.half) + '</p>';
      s += '<p>Anode, <b>oxidation</b> (loss of electrons): ' + eqn(r.anode.half) + '</p>';
    }
    s += '<h4>What you would see</h4><p>Cathode: ' + r.cathode.info.see + '. Anode: ' + r.anode.info.see + '.</p>';
    var tests = [r.cathode.info, r.anode.info].filter(function (i) { return i.test; });
    if (tests.length) s += '<p>' + tests.map(function (i) { return 'Test for ' + i.name + ': it ' + i.test + '.'; }).join(' ') + '</p>';
    if (r.leftover) s += '<p>Left in the beaker: ' + r.leftover + '.</p>';
    s += '<p class="muted small">Electrolysis uses an external power supply to drive a reaction that would not happen on its own. A chemical cell does the reverse: a reaction that happens by itself produces electricity.</p>';
    return s;
  }

  /* ---------- GCSE: fuel cells ---------- */
  function fuelCell(r, o) {
    o = o || {};
    var s = '';
    if (!r.running) s += '<p class="warnline">' + r.why + '</p>';
    s += '<h4>How it works</h4>';
    s += '<p>A fuel cell is supplied with a fuel, here <b>hydrogen</b>, and with <b>oxygen</b> or air. The hydrogen is oxidised electrochemically, which produces a potential difference. Unlike a battery, it keeps working as long as the fuel is supplied.</p>';
    s += '<p>Overall: ' + eqn(r.overall) + '. The only product is water.</p>';
    if (o.ht) {
      s += '<h4>' + HT + 'Half-equations (' + (r.electrolyte === 'alkaline' ? 'alkaline electrolyte' : 'acidic electrolyte') + ')</h4>';
      s += '<p>Negative electrode, hydrogen is oxidised: ' + eqn(r.negative) + '</p>';
      s += '<p>Positive electrode, oxygen is reduced: ' + eqn(r.positive) + '</p>';
      s += '<p class="muted small">Textbooks show the cell with an acidic or an alkaline electrolyte; the half-equations depend on which. Use the ones that match the electrolyte in the question.</p>';
    }
    return s;
  }
  var FUEL_EVALUATE = '<h4>Fuel cells or rechargeable batteries?</h4>' +
    '<table class="mini"><thead><tr><th></th><th>Hydrogen fuel cell</th><th>Rechargeable battery</th></tr></thead><tbody>' +
    '<tr><th>Product</th><td>only water</td><td>no waste while in use, but toxic chemicals to dispose of at the end</td></tr>' +
    '<tr><th>Running out</th><td>refuelled quickly with hydrogen</td><td>recharged from the mains, which takes time</td></tr>' +
    '<tr><th>Lifetime</th><td>keeps working while fuel is supplied</td><td>holds less charge after many recharges</td></tr>' +
    '<tr><th>Problems</th><td>hydrogen is a flammable gas that is hard to store; it is often made using fossil fuels</td><td>the electricity may come from fossil fuels</td></tr>' +
    '</tbody></table>';

  /* ---------- A-level: galvanic cells ---------- */
  function ions(terms) { return terms.map(function (t) { return h(t[0]); }).join(' and '); }
  function compartment(hc, ch, role) {
    var made = ch.made, used = ch.used, what;
    if (made.length && used.length) what = ions(used) + ' ions are converted into ' + ions(made) + ' ions';
    else if (made.length) what = ions(made) + ' ions are produced';
    else what = ions(used) + ' ions are used up';
    return 'In the ' + hc.name + ' half-cell ' + what + ', so the solution would become ' + (role === 'anode' ? 'positively' : 'negatively') + ' charged.';
  }
  function rolesHtml(cell) {
    var an = cell.anode, ca = cell.cathode;
    return '<p><b>' + E.coupleLabel(ca, 'html') + '</b> has the more positive E° (' + v(ca.E) + '), so this half-cell gains electrons: <b>reduction</b>. ' +
      'It is the <b>positive electrode</b> (the cathode).</p>' +
      '<p><b>' + E.coupleLabel(an, 'html') + '</b> has the less positive E° (' + v(an.E) + '), so this half-cell loses electrons: <b>oxidation</b>. ' +
      'It is the <b>negative electrode</b> (the anode).</p>';
  }
  function equationsHtml(cell) {
    var s = '<p class="eq-line"><span>Oxidation (−)</span> ' + eqn(cell.oxidation.raw) + '</p>' +
      '<p class="eq-line"><span>Reduction (+)</span> ' + eqn(cell.reduction.raw) + '</p>';
    if (cell.multipliers.anode !== 1 || cell.multipliers.cathode !== 1) {
      var parts = [];
      if (cell.multipliers.anode !== 1) parts.push('oxidation × ' + cell.multipliers.anode);
      if (cell.multipliers.cathode !== 1) parts.push('reduction × ' + cell.multipliers.cathode);
      s += '<p class="eq-line"><span>Balance e<sup>−</sup></span> ' + parts.join(', ') + ', so ' + cell.electrons + ' electrons are transferred</p>';
    }
    s += '<p class="eq-line"><span>Overall</span> <b>' + E.overallEquation(cell, 'html') + '</b></p>';
    return s;
  }
  function emfWorking(cell) {
    var s = '<p>E°<sub>cell</sub> = E°<sub>right</sub> − E°<sub>left</sub> = (' + v(cell.cathode.E) + ') − (' + v(cell.anode.E) + ') = <b>' + v(cell.emf) + '</b></p>' +
      '<p class="muted small">With the negative electrode written on the left, E°<sub>right</sub> is the positive electrode (reduction) and E°<sub>left</sub> the negative electrode (oxidation). Both values are reduction potentials, used exactly as tabulated.</p>';
    if (cell.multipliers.anode !== 1 || cell.multipliers.cathode !== 1) {
      var parts = [];
      if (cell.multipliers.anode !== 1) parts.push('the ' + cell.anode.name + ' half-equation by ' + cell.multipliers.anode);
      if (cell.multipliers.cathode !== 1) parts.push('the ' + cell.cathode.name + ' half-equation by ' + cell.multipliers.cathode);
      s += '<p>To cancel the electrons, ' + parts.join(' and ') + ' ' + (parts.length > 1 ? 'are' : 'is') + ' multiplied, but <b>' + (parts.length > 1 ? 'their E° values are not' : 'its E° is not') + '</b>. An electrode potential does not depend on how many moles react.</p>';
    }
    return s;
  }
  function bridgeHtml(cell, bridge) {
    var b = E.BRIDGES[bridge] || E.BRIDGES.kno3;
    return '<p>' + compartment(cell.anode, cell.bridge.anode, 'anode') + ' Negative ions (' + h(b.anion) + ') move out of the salt bridge into it.</p>' +
      '<p>' + compartment(cell.cathode, cell.bridge.cathode, 'cathode') + ' Positive ions (' + h(b.cation) + ') move out of the salt bridge into it.</p>' +
      '<p>The salt bridge lets ions move between the half-cells, completing the circuit and keeping each solution neutral. <b>It does not carry electrons</b>: electrons only travel through the external wire.</p>';
  }
  function galvanic(cell, o) {
    o = o || {};
    var s = '<h4>Which electrode is which</h4>' + rolesHtml(cell);
    s += '<p>Electrons released at the ' + cell.anode.name + ' electrode travel through the external circuit to the ' + cell.cathode.name + ' electrode.</p>';
    s += '<h4>Half-equations</h4>' + equationsHtml(cell);
    s += '<h4>EMF</h4>' + emfWorking(cell);
    s += '<h4>Cell representation</h4><p class="notation">' + E.notation(cell, 'html') + '</p>' +
      '<p class="muted small">Negative electrode on the left. Each side reads reduced | oxidised || oxidised | reduced; | is a phase boundary, || the salt bridge' +
      (cell.anode.electrode === 'Pt' || cell.cathode.electrode === 'Pt' ? ', and Pt, the inert electrode, goes on the outside' : '') + '.</p>';
    s += '<h4>The salt bridge</h4>' + bridgeHtml(cell, o.bridge);
    return s;
  }

  // Activity H: a stated direction (left oxidised, as written).
  function direction(d, leftH, rightH) {
    var s = '<p>As written, ' + leftH.name + ' is oxidised and ' + rightH.name + ' is reduced:</p>' +
      '<p>E°<sub>cell</sub> = E°<sub>right</sub> − E°<sub>left</sub> = (' + v(rightH.E) + ') − (' + v(leftH.E) + ') = <b>' + v(d.emf) + '</b></p>';
    if (d.feasible) s += '<p>E°<sub>cell</sub> is positive, so <b>' + E.overallEquation(d, 'html') + '</b> is feasible under standard conditions.</p>';
    else s += '<p>E°<sub>cell</sub> is negative, so the reaction as written, ' + E.overallEquation(d, 'html') + ', is <b>not feasible</b> under standard conditions. The reverse reaction is feasible, with E°<sub>cell</sub> = ' + v(-d.emf) + '. The diagram shows the cell discharging the feasible way.</p>';
    s += '<p class="muted small">"Feasible" means thermodynamically favourable. A reaction with a positive E°<sub>cell</sub> may still be too slow to see, because E° says nothing about the rate.</p>';
    return s;
  }

  /* ---------- A-level: Required practical 8 ---------- */
  var RP8_STEPS = [
    { id: 'choose', text: 'Choose two half-cells: each metal in a 1.00 mol dm⁻³ solution of its own ions.', why: 'A half-cell is a metal in contact with its own ions, so the electrode and solution must match.' },
    { id: 'clean', text: 'Clean the metal electrodes with emery paper.', why: 'An oxide layer or dirt on the surface changes the potential and lowers the reading.' },
    { id: 'bridge', text: 'Join the solutions with a salt bridge: filter paper soaked in saturated potassium nitrate.', why: 'The bridge lets ions move, completing the circuit, without reacting with either solution.' },
    { id: 'meter', text: 'Connect a high-resistance voltmeter across the two electrodes.', why: 'A high resistance means almost no current flows, so the concentrations do not change and the reading is the EMF.' },
    { id: 'read', text: 'Record the reading and its sign. Swap the leads if it is negative.', why: 'A positive reading means the electrode on the red (V) lead is the positive one.' },
    { id: 'identify', text: 'Identify the positive and negative electrodes and the direction of electron flow.', why: 'Electrons flow in the external circuit from the negative electrode to the positive one.' },
    { id: 'compare', text: 'Calculate E°cell from data and compare it with your reading.', why: 'E°cell is the value under standard conditions; a real measurement can differ.' },
    { id: 'explain', text: 'Explain any difference between your reading and E°cell.', why: 'Think about the conditions and the electrode surfaces.' }
  ];
  var RP8_REASONS = [
    { id: 'conc', text: 'The solutions were not exactly 1.00 mol dm⁻³.', right: true, why: 'Yes: E° is defined at 1.00 mol dm⁻³, and a different concentration shifts each electrode potential.' },
    { id: 'temp', text: 'The lab was not at 298 K.', right: true, why: 'Yes: E° values are for 298 K. A different temperature changes the reading slightly.' },
    { id: 'surface', text: 'An oxide layer or dirt on an electrode.', right: true, why: 'Yes: it changes the potential of that electrode, which is why the electrodes are cleaned first.' },
    { id: 'bigger', text: 'The electrodes were too small.', right: false, why: 'No: the size of an electrode does not change its potential, so it does not change the EMF.' },
    { id: 'bridgeE', text: 'Some electrons were lost in the salt bridge.', right: false, why: 'No: electrons never travel through the salt bridge. It carries ions.' },
    { id: 'current', text: 'A small current flowed through the voltmeter.', right: true, why: 'Partly: a high-resistance voltmeter keeps the current tiny, but any current means the reading is slightly below the EMF.' }
  ];

  /* ---------- A-level: changing conditions ---------- */
  function conditions(cell, reading, effects) {
    var s = '';
    if (!effects.length) s += '<p>Both solutions are at 1.00 mol dm⁻³ and 298 K: standard conditions. A high-resistance voltmeter reads close to E°<sub>cell</sub> = ' + v(cell.emf) + '.</p>';
    else {
      s += '<h4>What the change does</h4>';
      effects.forEach(function (e) { s += '<p>' + e.text + '</p>'; });
      s += '<p>The cell voltage is the difference between the two electrode potentials, so making the positive electrode more positive, or the negative electrode more negative, increases it.</p>';
      s += '<p>Simulated reading: <b>' + v(reading.value) + '</b>; E°<sub>cell</sub> is still ' + v(cell.emf) + ', because E° always refers to standard conditions.</p>';
    }
    s += '<p class="muted small">AQA expects you to predict the <i>direction</i> of a change like this, using the half-equation equilibria. The size of the simulated change comes from a model beyond the specification and is not something you need to calculate.</p>';
    return s;
  }

  /* ---------- The data table ---------- */
  function seriesTable(highlight) {
    var rows = E.HALF_CELLS.slice().sort(function (a, b) { return a.E - b.E; });
    var s = '<table class="series"><caption>Standard electrode potentials at 298 K (typical data-book values)</caption><thead><tr><th scope="col">Half-equation</th><th scope="col">E° / V</th></tr></thead><tbody>';
    rows.forEach(function (r) {
      var cls = highlight && highlight.indexOf(r.id) >= 0 ? ' class="hl"' : '';
      s += '<tr' + cls + ' data-id="' + r.id + '"><td>' + E.halfEquation(r, 'reduction', 'html', { arrow: ' ⇌ ' }) + '</td><td>' + E.signed(r.E) + '</td></tr>';
    });
    s += '</tbody></table><p class="muted small">All the values are <b>reduction</b> potentials. More positive: the oxidised form is a stronger oxidising agent. More negative: the reduced form is a stronger reducing agent. Exam questions give you the values to use.</p>';
    return s;
  }

  root.CellContent = {
    ACTIVITIES: ACTIVITIES, activity: activity,
    simpleCell: simpleCell, PATTERN_OPTIONS: PATTERN_OPTIONS,
    battery: battery, RECHARGE: RECHARGE,
    electrolysis: electrolysis, PRODUCT_CHOICES: PRODUCT_CHOICES, productKind: productKind, metalName: metalName,
    fuelCell: fuelCell, FUEL_EVALUATE: FUEL_EVALUATE,
    galvanic: galvanic, rolesHtml: rolesHtml, equationsHtml: equationsHtml, emfWorking: emfWorking, bridgeHtml: bridgeHtml, direction: direction,
    RP8_STEPS: RP8_STEPS, RP8_REASONS: RP8_REASONS, conditions: conditions, seriesTable: seriesTable,
    HT: HT, cap: cap
  };
})(typeof self !== 'undefined' ? self : this);
