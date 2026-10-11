/* Electrochemical Cell Builder — chemistry engine.

   Pure functions and data with no DOM, so tests.html can check every result.
   The diagram and the explanations only ever draw what these functions
   return: nothing about which electrode is oxidised, which way electrons go
   or what forms at an electrode is decided anywhere else.

   What is modelled, and how far:
   • A-level cells: standard reduction potentials, typical data-book values
     to 2 d.p. in V (the AQA data booklet has no E° table: exam questions give
     their own values). E°cell = E°(right) − E°(left) for the cell as written,
     AQA's form, which for the feasible direction is E°(positive electrode) −
     E°(negative electrode), both being tabulated reduction potentials. Potentials are never multiplied when half-equations are
     scaled to balance electrons.
   • Overall equations are built by scaling each half-equation to the lowest
     common multiple of electrons, adding, and cancelling species that appear
     on both sides. Every equation the engine writes is checked for atoms and
     charge (balanceCheck), and the tests run that check over every pair.
   • Simulated A-level meter readings: a high-resistance voltmeter across the
     cell. Under standard conditions it reads E°cell, plus a small seeded
     scatter and any known practical effect of an electrode (the oxide layer
     on magnesium and aluminium). Away from 1.00 mol dm⁻³ the electrode
     potentials are shifted with a thermodynamic model that is beyond the AQA
     specification: it is used only to produce a believable simulated reading
     and is never shown to students as a method or an equation. 298 K only.
   • GCSE simple cells: two metals in one electrolyte. The readings are
     illustrative values of the size a school experiment gives, labelled as
     such. They are not standard electrode potentials and cannot be.
   • Electrolysis: products from the GCSE rules (AQA 8462 4.4.3), derived
     from the reactivity series and the anion, not looked up per compound. */
(function (root, factory) {
  var api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  root.CellEngine = api;
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  var F = 96485, R = 8.314, T_STD = 298;

  /* ---------- Numbers ---------- */
  function round(x, dp) { var k = Math.pow(10, dp || 0); return Math.round(x * k + (x >= 0 ? 1e-9 : -1e-9)) / k; }
  // "+1.10 V" style: the sign is always written, with a proper minus.
  function signed(x, dp) {
    var v = round(x, dp === undefined ? 2 : dp);
    if (v === 0) return (0).toFixed(dp === undefined ? 2 : dp);
    return (v > 0 ? '+' : '−') + Math.abs(v).toFixed(dp === undefined ? 2 : dp);
  }
  function gcd(a, b) { return b ? gcd(b, a % b) : a; }
  function lcm(a, b) { return a / gcd(a, b) * b; }

  // Seeded generator (mulberry32), so a reading repeats for the same seed.
  function rng(seed) {
    var a = (seed >>> 0) || 1;
    return function () {
      a |= 0; a = a + 0x6D2B79F5 | 0;
      var t = Math.imul(a ^ a >>> 15, 1 | a);
      t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
      return ((t ^ t >>> 14) >>> 0) / 4294967296;
    };
  }

  /* ---------- Formulae ----------
     Species are written as plain text with the charge after a caret:
     'Zn^2+', 'H^+', 'I^-', 'H2O', 'e^-'. Digits in the formula are subscripts. */
  var SUB = { 0: '₀', 1: '₁', 2: '₂', 3: '₃', 4: '₄', 5: '₅', 6: '₆', 7: '₇', 8: '₈', 9: '₉' };
  var SUP = { 0: '⁰', 1: '¹', 2: '²', 3: '³', 4: '⁴', 5: '⁵', 6: '⁶', 7: '⁷', 8: '⁸', 9: '⁹', '+': '⁺', '-': '⁻' };
  function splitFormula(s) { var i = s.indexOf('^'); return i < 0 ? [s, ''] : [s.slice(0, i), s.slice(i + 1)]; }
  // HTML with <sub> and <sup>.
  function html(s) {
    var p = splitFormula(s);
    var b = p[0].replace(/([A-Za-z)\]])(\d+)/g, '$1<sub>$2</sub>');
    return b + (p[1] ? '<sup>' + p[1].replace('-', '−') + '</sup>' : '');
  }
  // Unicode sub- and superscripts, for SVG text and plain strings.
  function uni(s) {
    var p = splitFormula(s);
    var b = p[0].replace(/([A-Za-z)\]])(\d+)/g, function (m, a, d) { return a + d.split('').map(function (c) { return SUB[c]; }).join(''); });
    return b + p[1].split('').map(function (c) { return SUP[c] || c; }).join('');
  }
  // Atoms and charge, for checking that equations balance.
  function atoms(s) {
    var p = splitFormula(s), out = {}, m, re = /([A-Z][a-z]?)(\d*)/g;
    if (p[0] !== 'e') while ((m = re.exec(p[0]))) out[m[1]] = (out[m[1]] || 0) + (m[2] ? +m[2] : 1);
    var ch = 0;
    if (p[1]) { var n = parseInt(p[1], 10); ch = (isFinite(n) ? n : 1) * (p[1].indexOf('-') >= 0 ? -1 : 1); }
    return { atoms: out, charge: ch };
  }

  /* ---------- Equations ----------
     A side is a list of terms [formula, coefficient, state]. */
  function term(t, mode, states) {
    var f = mode === 'html' ? html(t[0]) : uni(t[0]);
    var st = states && t[2] && t[0] !== 'e^-' ? '(' + t[2] + ')' : '';
    return (t[1] !== 1 ? t[1] : '') + f + st;
  }
  function side(list, mode, states) { return list.map(function (t) { return term(t, mode, states); }).join(' + '); }
  function equation(left, right, mode, opts) {
    opts = opts || {};
    return side(left, mode, opts.states) + (opts.arrow || ' → ') + side(right, mode, opts.states);
  }
  function scale(list, k) { return list.map(function (t) { return [t[0], t[1] * k, t[2]]; }); }
  function balanceCheck(left, right) {
    function tally(list) {
      var a = {}, ch = 0;
      list.forEach(function (t) { var s = atoms(t[0]); for (var k in s.atoms) a[k] = (a[k] || 0) + s.atoms[k] * t[1]; ch += s.charge * t[1]; });
      return { a: a, ch: ch };
    }
    var L = tally(left), Rr = tally(right), keys = {}, k;
    for (k in L.a) keys[k] = 1; for (k in Rr.a) keys[k] = 1;
    for (k in keys) if ((L.a[k] || 0) !== (Rr.a[k] || 0)) return { ok: false, why: k + ' does not balance' };
    if (L.ch !== Rr.ch) return { ok: false, why: 'charge does not balance' };
    return { ok: true };
  }

  /* ---------- Standard electrode potentials ----------
     E° / V at 298 K, 100 kPa, 1.00 mol dm⁻³, as reduction potentials:
     standard data-book values to 2 d.p. AQA prints the values it needs in
     each question, so the page labels these as typical data.
       ox / red: the oxidised and reduced forms, [formula, coefficient, state]
       n: electrons in the half-equation as written (ox + n e⁻ → red)
       electrode: what dips into the solution ('pt' for an inert platinum electrode)
       solution: the electrolyte that makes the half-cell
       ion: the dissolved species whose concentration Activity J changes
       practical: an effect a real measurement shows that E° does not */
  var HALF_CELLS = [
    { id: 'mg', name: 'magnesium', symbol: 'Mg', ox: [['Mg^2+', 1, 'aq']], red: [['Mg', 1, 's']], n: 2, E: -2.37,
      electrode: 'Mg', solution: { name: 'magnesium sulfate solution', formula: 'MgSO4' }, ion: 'Mg^2+', tint: 'none',
      practical: { shift: -0.55, why: 'Magnesium is covered in an oxide layer and reacts slowly with water, so a real magnesium half-cell gives a reading well below the value predicted from E°.' } },
    { id: 'al', name: 'aluminium', symbol: 'Al', ox: [['Al^3+', 1, 'aq']], red: [['Al', 1, 's']], n: 3, E: -1.66,
      electrode: 'Al', solution: { name: 'aluminium sulfate solution', formula: 'Al2(SO4)3' }, ion: 'Al^3+', tint: 'none',
      practical: { shift: -0.95, why: 'Aluminium is protected by a thin, unreactive oxide layer, so a real aluminium half-cell behaves as if it were much less reactive and gives a reading far below the value predicted from E°.' } },
    { id: 'zn', name: 'zinc', symbol: 'Zn', ox: [['Zn^2+', 1, 'aq']], red: [['Zn', 1, 's']], n: 2, E: -0.76,
      electrode: 'Zn', solution: { name: 'zinc sulfate solution', formula: 'ZnSO4' }, ion: 'Zn^2+', tint: 'none' },
    { id: 'fe', name: 'iron', symbol: 'Fe', ox: [['Fe^2+', 1, 'aq']], red: [['Fe', 1, 's']], n: 2, E: -0.44,
      electrode: 'Fe', solution: { name: 'iron(II) sulfate solution', formula: 'FeSO4' }, ion: 'Fe^2+', tint: 'palegreen',
      practical: { shift: -0.03, why: 'Iron(II) ions are slowly oxidised by air to iron(III), and the iron surface may be rusty, so the reading drifts a little.' } },
    { id: 'ni', name: 'nickel', symbol: 'Ni', ox: [['Ni^2+', 1, 'aq']], red: [['Ni', 1, 's']], n: 2, E: -0.25,
      electrode: 'Ni', solution: { name: 'nickel(II) sulfate solution', formula: 'NiSO4' }, ion: 'Ni^2+', tint: 'green' },
    { id: 'pb', name: 'lead', symbol: 'Pb', ox: [['Pb^2+', 1, 'aq']], red: [['Pb', 1, 's']], n: 2, E: -0.13,
      electrode: 'Pb', solution: { name: 'lead(II) nitrate solution', formula: 'Pb(NO3)2' }, ion: 'Pb^2+', tint: 'none' },
    { id: 'she', name: 'standard hydrogen electrode', symbol: 'H₂', ox: [['H^+', 2, 'aq']], red: [['H2', 1, 'g']], n: 2, E: 0.00,
      electrode: 'Pt', gas: 'H2', solution: { name: 'hydrochloric acid, 1.00 mol dm⁻³ H⁺', formula: 'HCl' }, ion: 'H^+', tint: 'none',
      reference: true },
    { id: 'cu', name: 'copper', symbol: 'Cu', ox: [['Cu^2+', 1, 'aq']], red: [['Cu', 1, 's']], n: 2, E: 0.34,
      electrode: 'Cu', solution: { name: 'copper(II) sulfate solution', formula: 'CuSO4' }, ion: 'Cu^2+', tint: 'blue' },
    { id: 'i2', name: 'iodine / iodide', symbol: 'I₂', ox: [['I2', 1, 'aq']], red: [['I^-', 2, 'aq']], n: 2, E: 0.54,
      electrode: 'Pt', solution: { name: 'iodine in potassium iodide solution', formula: 'KI + I2' }, ion: 'I^-', tint: 'brown',
      note: 'Iodine dissolves in potassium iodide solution, not water alone.' },
    { id: 'fe3', name: 'iron(III) / iron(II)', symbol: 'Fe³⁺', ox: [['Fe^3+', 1, 'aq']], red: [['Fe^2+', 1, 'aq']], n: 1, E: 0.77,
      electrode: 'Pt', solution: { name: 'iron(II) and iron(III) sulfates, [Fe²⁺] = [Fe³⁺] = 1.00 mol dm⁻³', formula: 'FeSO4 + Fe2(SO4)3' }, ion: 'Fe^3+', tint: 'amber' },
    { id: 'ag', name: 'silver', symbol: 'Ag', ox: [['Ag^+', 1, 'aq']], red: [['Ag', 1, 's']], n: 1, E: 0.80,
      electrode: 'Ag', solution: { name: 'silver nitrate solution', formula: 'AgNO3' }, ion: 'Ag^+', tint: 'none' }
  ];
  var BY_ID = {}; HALF_CELLS.forEach(function (h) { BY_ID[h.id] = h; });
  function halfCell(id) { return BY_ID[id] || null; }

  // The reduction half-equation as tabulated, and the same reaction reversed.
  function reductionSides(h) { return { left: h.ox.concat([['e^-', h.n]]), right: h.red.slice() }; }
  function oxidationSides(h) { return { left: h.red.slice(), right: h.ox.concat([['e^-', h.n]]) }; }
  function halfEquation(h, which, mode, opts) {
    var s = which === 'oxidation' ? oxidationSides(h) : reductionSides(h);
    return equation(s.left, s.right, mode || 'html', opts);
  }
  function coupleLabel(h, mode) { return (mode === 'html' ? html : uni)(h.ox[0][0]) + '/' + (mode === 'html' ? html : uni)(h.red[0][0]); }

  /* Conventional cell representation, as AQA writes it: the oxidation
     half-cell on the left, its reduced form next to the electrode; the
     reduction half-cell on the right, its oxidised form next to the salt
     bridge; Pt at either end when neither form is a metal. Different phases
     are separated by |, species in the same solution by a comma. */
  function halfNotation(h, asAnode, mode) {
    var f = mode === 'html' ? html : uni, seq = [];
    var metal = h.electrode !== 'Pt';
    if (!metal) seq.push({ f: 'Pt', st: 's' });
    h.red.forEach(function (t) { seq.push({ f: t[0], st: t[2] }); });
    h.ox.forEach(function (t) { seq.push({ f: t[0], st: t[2] }); });
    if (!asAnode) seq.reverse();
    var out = '', prev = null;
    seq.forEach(function (s) {
      var txt = f(s.f) + '(' + s.st + ')';
      if (prev === null) out = txt;
      else out += (prev === 'aq' && s.st === 'aq' ? ', ' : ' | ') + txt;
      prev = s.st;
    });
    return out;
  }

  /* ---------- A galvanic cell from two half-cells ----------
     buildCell(leftId, rightId) works out the spontaneous direction under
     standard conditions, whatever order the half-cells were chosen in: the
     half-cell with the more positive E° is the cathode (reduction, positive
     electrode) and the other is the anode (oxidation, negative electrode). */
  function buildCell(aId, bId) {
    var a = halfCell(aId), b = halfCell(bId);
    if (!aId || !bId) return { valid: false, code: 'incomplete', why: 'Choose a half-cell for each side before connecting the cell.' };
    if (!a || !b) return { valid: false, code: 'unsupported', why: 'That half-cell is not in this simulator\'s data, so it cannot predict a voltage for it.' };
    if (a.id === b.id) return { valid: false, code: 'identical', zero: true, why: 'Both half-cells are the same, so there is no difference in electrode potential: the voltage is zero and there is no overall reaction.' };
    if (round(a.E, 2) === round(b.E, 2)) return { valid: false, code: 'equal', zero: true, why: 'These two half-cells have the same standard electrode potential, so under standard conditions there is no overall reaction.' };
    var cath = a.E > b.E ? a : b, an = cath === a ? b : a;
    return describe(an, cath, { leftId: aId, rightId: bId });
  }

  /* The cell for a stated direction: `oxId` is the half-cell the student says
     is oxidised. E for that direction can be negative, which means the
     reverse reaction is the feasible one. */
  function cellForDirection(oxId, redId) {
    var an = halfCell(oxId), cath = halfCell(redId);
    if (!an || !cath) return { valid: false, code: 'incomplete', why: 'Choose both half-cells.' };
    if (an.id === cath.id) return { valid: false, code: 'identical', zero: true, why: 'Both half-cells are the same, so there is no reaction.' };
    var d = describe(an, cath, {});
    d.feasible = d.emf > 0;
    return d;
  }

  function describe(an, cath, extra) {
    var L = lcm(an.n, cath.n), kAn = L / an.n, kCa = L / cath.n;
    var red = reductionSides(cath), ox = oxidationSides(an);
    // Signed totals: reactants count negative, products positive.
    var net = {}, order = [];
    function add(list, sign, k) {
      list.forEach(function (t) {
        var key = t[0] + '|' + (t[2] || '');
        if (!(key in net)) { net[key] = 0; order.push({ key: key, f: t[0], st: t[2] }); }
        net[key] += sign * t[1] * k;
      });
    }
    add(ox.left, -1, kAn); add(red.left, -1, kCa);
    add(ox.right, 1, kAn); add(red.right, 1, kCa);
    var left = [], right = [];
    order.forEach(function (o) {
      var v = net[o.key];
      if (o.f === 'e^-') { if (v !== 0) throw new Error('electrons did not cancel'); return; }
      if (v < 0) left.push([o.f, -v, o.st]); else if (v > 0) right.push([o.f, v, o.st]);
    });
    var emf = round(cath.E - an.E, 2);
    return {
      valid: true, anode: an, cathode: cath, emf: emf, feasible: emf > 0,
      // Electrons leave the anode and travel through the external circuit to the cathode.
      electronsFrom: an.id, electronsTo: cath.id,
      positive: cath.id, negative: an.id,
      electrons: L, multipliers: { anode: kAn, cathode: kCa },
      reduction: { left: scale(red.left, kCa), right: scale(red.right, kCa), raw: red },
      oxidation: { left: scale(ox.left, kAn), right: scale(ox.right, kAn), raw: ox },
      overall: { left: left, right: right },
      notation: { anode: halfNotation(an, true, 'uni'), cathode: halfNotation(cath, false, 'uni') },
      bridge: bridgeMigration(an, cath),
      leftId: extra.leftId, rightId: extra.rightId
    };
  }
  function notation(cell, mode) {
    if (!cell || !cell.valid) return '';
    return halfNotation(cell.anode, true, mode) + ' || ' + halfNotation(cell.cathode, false, mode);
  }
  function overallEquation(cell, mode, opts) { return equation(cell.overall.left, cell.overall.right, mode || 'html', opts); }

  /* What happens to the charge in each compartment, from that half-cell's own
     reaction. In the anode compartment the dissolved species gain n units of
     positive charge per half-equation (metal ions are made, or negative ions
     are used up); in the cathode compartment they lose it. Ions in the salt
     bridge move to keep each solution neutral. */
  function compartmentChange(h, role) {
    var made = role === 'anode' ? h.ox : h.red, used = role === 'anode' ? h.red : h.ox;
    // Only charged dissolved species change the charge balance (I₂ is not an ion).
    function ion(t) { return t[2] === 'aq' && atoms(t[0]).charge !== 0; }
    var madeIons = made.filter(ion), usedIons = used.filter(ion);
    return { made: madeIons, used: usedIons };
  }
  function bridgeMigration(an, cath) {
    return {
      toAnode: 'anion', toCathode: 'cation',
      anode: compartmentChange(an, 'anode'), cathode: compartmentChange(cath, 'cathode')
    };
  }

  /* ---------- Salt bridges ---------- */
  var BRIDGES = {
    kno3: { id: 'kno3', name: 'saturated potassium nitrate', short: 'KNO₃(aq)', cation: 'K^+', anion: 'NO3^-', ionic: true },
    kcl: { id: 'kcl', name: 'saturated potassium chloride', short: 'KCl(aq)', cation: 'K^+', anion: 'Cl^-', ionic: true,
      reactsWith: { 'Ag^+': 'silver chloride', 'Pb^2+': 'lead(II) chloride' } },
    wire: { id: 'wire', name: 'a copper wire', short: 'wire', ionic: false },
    none: { id: 'none', name: 'nothing', short: 'none', ionic: false }
  };
  // Is this connection between the solutions usable for these half-cells?
  function bridgeCheck(bridgeId, an, cath) {
    var b = BRIDGES[bridgeId || 'none'];
    if (!b || bridgeId === 'none') return { ok: false, code: 'no-bridge', why: 'There is no connection between the two solutions, so the circuit is incomplete. Ions must be able to move between the half-cells.' };
    if (!b.ionic) return { ok: false, code: 'not-ionic', why: 'A metal wire carries electrons, not ions. Dipping it into both solutions sets up two extra electrodes instead of letting ions move, so it does not work as a salt bridge.' };
    if (b.reactsWith) {
      var hit = [an, cath].filter(function (h) { return h && b.reactsWith[h.ox[0][0]]; })[0];
      if (hit) return { ok: false, code: 'precipitate', why: 'Chloride ions from the bridge would react with ' + uni(hit.ox[0][0]) + ' to form a precipitate of ' + b.reactsWith[hit.ox[0][0]] + ', changing the concentration in that half-cell. Use potassium nitrate instead.' };
    }
    return { ok: true, bridge: b };
  }

  /* ---------- Simulated A-level readings ----------
     The potential of one electrode at a concentration other than
     1.00 mol dm⁻³, at 298 K. A thermodynamic model beyond the AQA
     specification: used only for the simulated meter, never shown. */
  function electrodePotential(h, conc) {
    var c = conc && conc > 0 ? conc : 1;
    // Q for ox + n e⁻ → red, with only the varied ion away from 1.00 mol dm⁻³.
    var onOx = h.ox.some(function (t) { return t[0] === h.ion; });
    var coeff = (onOx ? h.ox : h.red).filter(function (t) { return t[0] === h.ion; })[0][1];
    var lnQ = (onOx ? -1 : 1) * coeff * Math.log(c);
    return h.E - R * T_STD / (h.n * F) * lnQ;
  }

  /* A reading on a high-resistance voltmeter. `vLead` is the half-cell on the
     V (red) terminal; the meter shows E(V lead) − E(COM lead), so it is
     negative when the leads are the wrong way round.
       o.left, o.right: half-cell ids; o.concLeft, o.concRight: mol dm⁻³
       o.vLead: 'left' or 'right' (default: whichever is positive)
       o.seed, o.trial: for a repeatable scatter of ±0.01 V
       o.practical: include known electrode effects (default true)
       o.uncleaned: metal electrodes not cleaned with emery paper */
  function meterReading(o) {
    var a = halfCell(o.left), b = halfCell(o.right);
    if (!a || !b) return { ok: false, code: 'incomplete' };
    var Ea = electrodePotential(a, o.concLeft), Eb = electrodePotential(b, o.concRight), notes = [];
    var idealConc = Math.abs(Ea - Eb);
    // An oxide layer makes a reactive metal behave as less reactive than E°
    // says: its potential is effectively more positive by |shift|.
    if (o.practical !== false && a.id !== b.id) {
      [[a, 'a'], [b, 'b']].forEach(function (p) {
        var h = p[0]; if (!h.practical) return;
        if (p[1] === 'a') Ea -= h.practical.shift; else Eb -= h.practical.shift;
        notes.push(h.practical.why);
      });
    }
    var Epos = Math.max(Ea, Eb), Eneg = Math.min(Ea, Eb);
    var negCell = Ea < Eb ? a : b, posCell = negCell === a ? b : a;
    var ideal = Epos - Eneg, practicalShift = 0;
    if (o.uncleaned && a.id !== b.id) {
      var metals = [a, b].filter(function (h) { return h.electrode !== 'Pt'; }).length;
      if (metals) { practicalShift -= 0.02 * metals; notes.push('The electrodes were not cleaned: an oxide layer or grease on a metal surface changes its potential, usually lowering the reading and making it unsteady.'); }
    }
    var scatter = 0;
    if (o.seed !== undefined && a.id !== b.id) { var r = rng((o.seed >>> 0) + 7919 * ((o.trial || 0) + 1)); scatter = round((r() - 0.5) * 0.024, 2); }
    var magnitude = Math.max(0, ideal + practicalShift + scatter);
    var vOnPositive = o.vLead === undefined || (o.vLead === 'left' ? Ea >= Eb : Eb >= Ea);
    var value = round(vOnPositive ? magnitude : -magnitude, 2);
    return {
      ok: true, value: value, magnitude: round(magnitude, 2), ideal: round(idealConc, 2),
      positive: posCell.id, negative: negCell.id, vOnPositive: vOnPositive,
      practical: notes.length > 0, notes: notes, scatter: scatter,
      standard: (o.concLeft || 1) === 1 && (o.concRight || 1) === 1
    };
  }

  /* How a concentration change moves an electrode potential, in words that
     A-level students are expected to give (Le Chatelier on the half-equation). */
  function concentrationEffect(h, conc) {
    if (!conc || conc === 1) return null;
    var onOx = h.ox.some(function (t) { return t[0] === h.ion; });
    var up = conc > 1, ionTxt = uni(h.ion);
    var shift = (onOx === up) ? 'right' : 'left';
    var more = shift === 'right';   // to the right: reduction favoured, E more positive
    return {
      ion: ionTxt, shift: shift, morePositive: more,
      text: (up ? 'Increasing' : 'Decreasing') + ' [' + ionTxt + '] shifts the equilibrium ' + halfEquation(h, 'reduction', 'uni', { arrow: ' ⇌ ' }) +
        ' to the ' + shift + ', so this electrode potential becomes ' + (more ? 'more positive' : 'less positive') + '.'
    };
  }

  /* ---------- GCSE simple cells ----------
     Two different metals in one electrolyte. The readings are illustrative:
     the size a school experiment typically gives, chosen so the pattern
     (further apart in reactivity, bigger voltage) is right. They are not
     standard electrode potentials, and real results vary with the surfaces,
     the concentration and the temperature.
     Values are a potential for each metal in that electrolyte against an
     arbitrary reference; only differences mean anything. */
  var METALS = [
    { id: 'mg', name: 'magnesium', symbol: 'Mg', reactivity: 1 },
    { id: 'zn', name: 'zinc', symbol: 'Zn', reactivity: 2 },
    { id: 'fe', name: 'iron', symbol: 'Fe', reactivity: 3 },
    { id: 'cu', name: 'copper', symbol: 'Cu', reactivity: 4 }
  ];
  var METAL = {}; METALS.forEach(function (m) { METAL[m.id] = m; });
  var ELECTROLYTES = [
    { id: 'nacl', name: 'sodium chloride solution', short: 'salt water', ions: true, acid: false, rest: { mg: -1.40, zn: -0.85, fe: -0.50, cu: -0.10 } },
    { id: 'h2so4', name: 'dilute sulfuric acid', short: 'dilute acid', ions: true, acid: true, rest: { mg: -1.65, zn: -0.80, fe: -0.45, cu: 0.10 } },
    { id: 'lemon', name: 'lemon juice', short: 'lemon juice', ions: true, acid: true, rest: { mg: -1.55, zn: -0.85, fe: -0.50, cu: 0.05 } },
    { id: 'water', name: 'distilled water', short: 'distilled water', ions: false, acid: false }
  ];
  var ELECTROLYTE = {}; ELECTROLYTES.forEach(function (e) { ELECTROLYTE[e.id] = e; });

  function simpleCell(m1, m2, elId, o) {
    o = o || {};
    var a = METAL[m1], b = METAL[m2], el = ELECTROLYTE[elId];
    if (!a || !b) return { valid: false, code: 'incomplete', why: 'Choose a metal for each electrode.' };
    if (!el) return { valid: false, code: 'no-electrolyte', why: 'The metals need to dip into an electrolyte: a solution containing ions.' };
    if (!el.ions) return { valid: false, code: 'no-ions', reading: 0, why: 'Distilled water contains almost no ions, so charge cannot flow through it and the cell does not work. An electrolyte is needed.' };
    if (a.id === b.id) return { valid: false, code: 'same-metal', reading: 0, why: 'Both electrodes are the same metal, so neither is more reactive than the other: there is no voltage.' };
    var neg = a.reactivity < b.reactivity ? a : b, pos = neg === a ? b : a;
    var base = round(el.rest[pos.id] - el.rest[neg.id], 2), scatter = 0;
    if (o.seed !== undefined) { var r = rng((o.seed >>> 0) + 104729 * ((o.trial || 0) + 1)); scatter = round((r() - 0.5) * 0.06, 2); }
    return {
      valid: true, negative: neg, positive: pos, electrolyte: el,
      typical: base, reading: round(base + scatter, 2), illustrative: true,
      electronsFrom: neg.id, electronsTo: pos.id, gap: pos.reactivity - neg.reactivity
    };
  }

  // Cells joined in series: voltages add, and a cell turned round subtracts.
  function battery(cells) {
    var total = 0;
    cells.forEach(function (c) { total += (c.flipped ? -1 : 1) * c.voltage; });
    return round(total, 2);
  }

  /* ---------- GCSE electrolysis ----------
     Inert (graphite) electrodes. The rules, as AQA 8462 4.4.3 states them:
       molten: the metal at the cathode, the non-metal at the anode;
       aqueous, cathode: hydrogen if the metal is more reactive than hydrogen,
         otherwise the metal;
       aqueous, anode: oxygen, unless halide ions are present, which give the
         halogen. */
  var REACTIVITY = ['K', 'Na', 'Li', 'Ca', 'Mg', 'Al', 'Zn', 'Fe', 'Pb', 'H', 'Cu', 'Ag'];
  function moreReactiveThanH(metal) { return REACTIVITY.indexOf(metal) < REACTIVITY.indexOf('H'); }
  var IONIC = [
    { id: 'pbbr2-l', name: 'lead(II) bromide', formula: 'PbBr2', state: 'l', cation: { f: 'Pb^2+', metal: 'Pb', n: 2 }, anion: { f: 'Br^-', halogen: 'Br2', name: 'bromide' } },
    { id: 'nacl-l', name: 'sodium chloride', formula: 'NaCl', state: 'l', cation: { f: 'Na^+', metal: 'Na', n: 1 }, anion: { f: 'Cl^-', halogen: 'Cl2', name: 'chloride' } },
    { id: 'zncl2-l', name: 'zinc chloride', formula: 'ZnCl2', state: 'l', cation: { f: 'Zn^2+', metal: 'Zn', n: 2 }, anion: { f: 'Cl^-', halogen: 'Cl2', name: 'chloride' } },
    { id: 'pbbr2-s', name: 'lead(II) bromide', formula: 'PbBr2', state: 's', cation: { f: 'Pb^2+', metal: 'Pb', n: 2 }, anion: { f: 'Br^-', halogen: 'Br2', name: 'bromide' } },
    { id: 'nacl-aq', name: 'sodium chloride', formula: 'NaCl', state: 'aq', cation: { f: 'Na^+', metal: 'Na', n: 1 }, anion: { f: 'Cl^-', halogen: 'Cl2', name: 'chloride' }, left: 'sodium hydroxide solution' },
    { id: 'cuso4-aq', name: 'copper(II) sulfate', formula: 'CuSO4', state: 'aq', cation: { f: 'Cu^2+', metal: 'Cu', n: 2 }, anion: { f: 'SO4^2-', name: 'sulfate' }, left: 'sulfuric acid (the blue colour fades as copper ions are used up)' },
    { id: 'cucl2-aq', name: 'copper(II) chloride', formula: 'CuCl2', state: 'aq', cation: { f: 'Cu^2+', metal: 'Cu', n: 2 }, anion: { f: 'Cl^-', halogen: 'Cl2', name: 'chloride' } },
    { id: 'kbr-aq', name: 'potassium bromide', formula: 'KBr', state: 'aq', cation: { f: 'K^+', metal: 'K', n: 1 }, anion: { f: 'Br^-', halogen: 'Br2', name: 'bromide' }, left: 'potassium hydroxide solution' },
    { id: 'na2so4-aq', name: 'sodium sulfate', formula: 'Na2SO4', state: 'aq', cation: { f: 'Na^+', metal: 'Na', n: 1 }, anion: { f: 'SO4^2-', name: 'sulfate' }, left: 'sodium sulfate solution (more concentrated, as water is used up)' },
    { id: 'h2so4-aq', name: 'dilute sulfuric acid', formula: 'H2SO4', state: 'aq', cation: { f: 'H^+', metal: 'H', n: 1 }, anion: { f: 'SO4^2-', name: 'sulfate' }, left: 'sulfuric acid (more concentrated, as water is used up)' }
  ];
  var IONIC_BY_ID = {}; IONIC.forEach(function (c) { IONIC_BY_ID[c.id] = c; });
  var PRODUCT = {
    Pb: { name: 'lead', f: 'Pb', st: 'l', kind: 'metal', see: 'beads of molten lead collect under the cathode' },
    Na: { name: 'sodium', f: 'Na', st: 'l', kind: 'metal', see: 'molten sodium forms at the cathode' },
    // Zinc melts at 420 °C, above a zinc chloride melt (about 300 °C), so it forms as a solid.
    Zn: { name: 'zinc', f: 'Zn', st: 's', kind: 'metal', see: 'grey solid zinc forms on the cathode' },
    Cu: { name: 'copper', f: 'Cu', st: 's', kind: 'metal', see: 'a pink-brown coating of copper forms on the cathode', test: null },
    H2: { name: 'hydrogen', f: 'H2', st: 'g', kind: 'gas', see: 'bubbles of colourless gas', test: 'burns with a squeaky pop when a lighted splint is held at the mouth of the tube' },
    O2: { name: 'oxygen', f: 'O2', st: 'g', kind: 'gas', see: 'bubbles of colourless gas', test: 'relights a glowing splint' },
    Cl2: { name: 'chlorine', f: 'Cl2', st: 'g', kind: 'gas', see: 'bubbles of pale green gas with a sharp smell', test: 'bleaches damp litmus paper white' },
    Br2: { name: 'bromine', f: 'Br2', st: null, kind: 'halogen', see: 'an orange-brown colour forms around the anode', seeMolten: 'brown fumes of bromine form at the anode' }
  };

  function electrolysis(id, o) {
    o = o || {};
    var c = IONIC_BY_ID[id];
    if (!c) return { valid: false, code: 'incomplete', why: 'Choose an electrolyte.' };
    if (o.supply === false) return { valid: false, code: 'off', why: 'The power supply is off, so nothing happens: electrolysis needs an external supply of electricity.' };
    if (c.state === 's') return { valid: false, code: 'solid', why: 'In solid ' + c.name + ' the ions are held in a lattice and cannot move, so it does not conduct and is not electrolysed. Heat it until it melts.' };
    var cathode, anode, ions = [];
    ions.push({ f: c.cation.f, sign: '+', to: 'cathode', from: c.formula });
    ions.push({ f: c.anion.f, sign: '−', to: 'anode', from: c.formula });
    if (c.state === 'aq') {
      if (c.cation.f !== 'H^+') ions.push({ f: 'H^+', sign: '+', to: 'cathode', from: 'water' });
      ions.push({ f: 'OH^-', sign: '−', to: 'anode', from: 'water' });
    }
    // Cathode (negative): positive ions gain electrons.
    var why = {};
    if (c.state === 'l') { cathode = c.cation.metal; why.cathode = 'molten'; }
    else if (c.cation.metal === 'H') { cathode = 'H2'; why.cathode = 'acid'; }
    else if (moreReactiveThanH(c.cation.metal)) { cathode = 'H2'; why.cathode = 'reactive'; }
    else { cathode = c.cation.metal; why.cathode = 'unreactive'; }
    // Anode (positive): negative ions lose electrons.
    if (c.anion.halogen) { anode = c.anion.halogen; why.anode = c.state === 'l' ? 'molten' : 'halide'; }
    else { anode = 'O2'; why.anode = 'no-halide'; }
    var cathEq, anEq;
    if (cathode === 'H2') cathEq = { left: [['H^+', 2, 'aq'], ['e^-', 2]], right: [['H2', 1, 'g']] };
    else cathEq = { left: [[c.cation.f, 1, c.state], ['e^-', c.cation.n]], right: [[cathode, 1, PRODUCT[cathode].st]] };
    if (anode === 'O2') anEq = { left: [['OH^-', 4, 'aq']], right: [['O2', 1, 'g'], ['H2O', 2, 'l'], ['e^-', 4]] };
    else anEq = { left: [[c.anion.f, 2, c.state]], right: [[anode, 1, c.state === 'l' || anode === 'Cl2' ? 'g' : 'aq'], ['e^-', 2]] };
    var cp = PRODUCT[cathode], ap = PRODUCT[anode];
    if (c.state === 'l' && ap.seeMolten) ap = Object.assign({}, ap, { see: ap.seeMolten });
    return {
      valid: true, compound: c, molten: c.state === 'l',
      cathode: { product: cathode, info: cp, half: cathEq, why: why.cathode, sign: '−', process: 'reduction' },
      anode: { product: anode, info: ap, half: anEq, why: why.anode, sign: '+', process: 'oxidation' },
      ions: ions, leftover: c.left || null
    };
  }

  /* ---------- Hydrogen fuel cell ----------
     AQA GCSE names no electrolyte, so both are supported and the
     half-equations always match the electrolyte shown. A-level (3.1.11.2)
     uses the alkaline cell.
       acidic (proton-exchange membrane): H⁺ moves through the electrolyte
         from the negative electrode to the positive;
       alkaline (potassium hydroxide): OH⁻ moves from the positive electrode
         to the negative. */
  function fuelCell(o) {
    o = o || {};
    var running = !!(o.h2 && o.o2), alkaline = o.electrolyte === 'alkaline';
    return {
      running: running, electrolyte: alkaline ? 'alkaline' : 'acidic',
      why: running ? '' : !o.h2 && !o.o2 ? 'No hydrogen and no oxygen: no reaction, so no electricity.' : !o.h2 ? 'Without hydrogen there is no fuel to be oxidised, so the cell stops.' : 'Without oxygen nothing takes the electrons at the positive electrode, so the cell stops.',
      overall: { left: [['H2', 2, 'g'], ['O2', 1, 'g']], right: [['H2O', 2, 'l']] },
      negative: alkaline ? { left: [['H2', 2, 'g'], ['OH^-', 4, 'aq']], right: [['H2O', 4, 'l'], ['e^-', 4]] }
                         : { left: [['H2', 2, 'g']], right: [['H^+', 4, 'aq'], ['e^-', 4]] },
      positive: alkaline ? { left: [['O2', 1, 'g'], ['H2O', 2, 'l'], ['e^-', 4]], right: [['OH^-', 4, 'aq']] }
                         : { left: [['O2', 1, 'g'], ['H^+', 4, 'aq'], ['e^-', 4]], right: [['H2O', 2, 'l']] },
      ion: alkaline ? { f: 'OH^-', sign: '−', from: 'positive', to: 'negative' } : { f: 'H^+', sign: '+', from: 'negative', to: 'positive' },
      water: alkaline ? 'negative' : 'positive',
      voltage: running ? 0.7 : 0   // a typical working voltage for one cell under load (illustrative)
    };
  }

  return {
    round: round, signed: signed, lcm: lcm, rng: rng,
    html: html, uni: uni, atoms: atoms, equation: equation, side: side, balanceCheck: balanceCheck,
    HALF_CELLS: HALF_CELLS, halfCell: halfCell, halfEquation: halfEquation, coupleLabel: coupleLabel,
    reductionSides: reductionSides, oxidationSides: oxidationSides, halfNotation: halfNotation,
    buildCell: buildCell, cellForDirection: cellForDirection, notation: notation, overallEquation: overallEquation,
    BRIDGES: BRIDGES, bridgeCheck: bridgeCheck,
    electrodePotential: electrodePotential, meterReading: meterReading, concentrationEffect: concentrationEffect,
    METALS: METALS, METAL: METAL, ELECTROLYTES: ELECTROLYTES, ELECTROLYTE: ELECTROLYTE, simpleCell: simpleCell, battery: battery,
    REACTIVITY: REACTIVITY, IONIC: IONIC, ionic: function (id) { return IONIC_BY_ID[id] || null; }, PRODUCT: PRODUCT, electrolysis: electrolysis,
    fuelCell: fuelCell, STANDARD: { T_K: 298, p_kPa: 100, c_M: 1.00 }
  };
});
