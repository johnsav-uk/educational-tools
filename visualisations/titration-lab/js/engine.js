/* Titration Laboratory — chemistry engine.

   Pure functions and small models with no DOM, so tests.html can check every
   number. Units are carried in the names: _cm3 and _dm3 for volumes, _mol for
   amounts, _M for mol dm⁻³, _C for °C and _s for seconds. The laboratory works in
   cm³; anything that turns a volume into an amount goes through cm3ToDm3.

   What is modelled, and how far:
   • Stoichiometry from the balanced equation's coefficients: n(B) = n(A) × b / a.
   • Acid–base: pH from the full charge balance, solved for [H⁺] by bisection.
     Strong acids and bases are spectator ions; weak acids, weak bases and
     polyprotic systems (HSO₄⁻, ethanoic acid, NH₄⁺, H₂CO₃) carry their Ka values.
     25 °C, activities taken as concentrations, CO₂ assumed to stay in solution.
   • Indicators: fraction in the alkaline form from pKIn (Henderson–Hasselbalch),
     colour from per-channel absorbance (Beer–Lambert), so the colour, and the
     volume at which it changes, come from the pH.
   • Manganate(VII): MnO₄⁻ is purple by Beer–Lambert on its excess
     concentration. With Fe²⁺ the reaction is instant; with ethanedioate it is a
     rate law that speeds up with temperature (Arrhenius) and with Mn²⁺
     (autocatalysis). Without enough H⁺ the remaining MnO₄⁻ takes 3 electrons
     and forms brown MnO₂ instead of 5 to Mn²⁺, which changes the titre.
     The kinetic constants are chosen to give classroom-realistic times; they
     are a teaching model, not measured values (see KINETICS).
   • Measurement: true volumes, what the burette shows and what the student
     records are kept apart. Random variation comes from a seeded generator. */
(function (root, factory) {
  var api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  root.TitrationEngine = api;
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  var KW = 1.0e-14;          // ionic product of water at 25 °C
  var R = 8.314;             // J K⁻¹ mol⁻¹
  var ROOM_C = 20;

  /* ---------- Validation ---------- */
  function finite(x, what) {
    if (typeof x !== 'number' || !isFinite(x)) throw new TypeError(what + ' must be a finite number');
    return x;
  }
  function positive(x, what) { finite(x, what); if (x <= 0) throw new RangeError(what + ' must be greater than zero'); return x; }
  function nonNegative(x, what) { finite(x, what); if (x < 0) throw new RangeError(what + ' cannot be negative'); return x; }

  /* ---------- Units and amounts ---------- */
  function cm3ToDm3(v_cm3) { return nonNegative(v_cm3, 'Volume') / 1000; }
  function dm3ToCm3(v_dm3) { return nonNegative(v_dm3, 'Volume') * 1000; }
  // n = c × V, with V in dm³.
  function amount(c_M, v_cm3) { return nonNegative(c_M, 'Concentration') * cm3ToDm3(v_cm3); }
  // c = n / V, with V in dm³.
  function concentration(n_mol, v_cm3) { nonNegative(n_mol, 'Amount'); positive(v_cm3, 'Volume'); return n_mol / cm3ToDm3(v_cm3); }
  // For aA + bB → products, n(A)/a = n(B)/b, so n(B) = n(A) × b / a.
  function convert(n_mol, fromCoeff, toCoeff) {
    nonNegative(n_mol, 'Amount'); positive(fromCoeff, 'Coefficient'); positive(toCoeff, 'Coefficient');
    return n_mol * toCoeff / fromCoeff;
  }

  // Volume of titrant needed to react exactly with the aliquot.
  function equivalenceVolume(o) {
    positive(o.titrantConc_M, 'Titrant concentration');
    var nA = amount(o.analyteConc_M, positive(o.aliquot_cm3, 'Aliquot volume'));
    var nT = convert(nA, o.analyteCoeff, o.titrantCoeff);
    return dm3ToCm3(nT / o.titrantConc_M);
  }

  /* The unknown concentration from a titre, with every step kept so a worked
     solution can show the student's own numbers.
       o.unknown: 'analyte' (in the flask) or 'titrant' (in the burette)
       o.titrantConc_M or o.analyteConc_M: whichever is known
       o.titre_cm3, o.aliquot_cm3, o.titrantCoeff, o.analyteCoeff */
  function solveConcentration(o) {
    positive(o.titre_cm3, 'Titre'); positive(o.aliquot_cm3, 'Aliquot volume');
    var a = o.titrantCoeff, b = o.analyteCoeff, s = { unknown: o.unknown };
    if (o.unknown === 'analyte') {
      s.knownConc_M = positive(o.titrantConc_M, 'Titrant concentration');
      s.knownVolume_cm3 = o.titre_cm3;
      s.knownAmount_mol = amount(s.knownConc_M, o.titre_cm3);
      s.ratio = b / a;
      s.unknownAmount_mol = convert(s.knownAmount_mol, a, b);
      s.unknownVolume_cm3 = o.aliquot_cm3;
    } else {
      s.knownConc_M = positive(o.analyteConc_M, 'Analyte concentration');
      s.knownVolume_cm3 = o.aliquot_cm3;
      s.knownAmount_mol = amount(s.knownConc_M, o.aliquot_cm3);
      s.ratio = a / b;
      s.unknownAmount_mol = convert(s.knownAmount_mol, b, a);
      s.unknownVolume_cm3 = o.titre_cm3;
    }
    s.value_M = concentration(s.unknownAmount_mol, s.unknownVolume_cm3);
    return s;
  }

  /* ---------- Rounding and results ---------- */
  // Rounds half away from zero in decimal, so 23.925 → 23.93 where toFixed
  // gives 23.92 (23.925 × 100 is 2392.4999… in binary).
  function round(x, dp) {
    if (!isFinite(x)) return x;
    var f = Math.pow(10, dp), y = x * f;
    y += (y >= 0 ? 1 : -1) * (Math.abs(y) * 1e-11 + 1e-11);
    return Math.round(y) / f;
  }
  function sigFig(x, n) {
    if (!x) return 0;
    var d = Math.ceil(Math.log10(Math.abs(x))), p = n - d, f = Math.pow(10, p);
    return Math.round(x * f) / f;
  }
  // Fixed significant figures as text, keeping trailing zeros: 0.0950, 25.0.
  function fmtSig(x, n) {
    if (x === null || x === undefined || !isFinite(x)) return '—';
    if (x === 0) return (0).toFixed(Math.max(0, n - 1));
    var d = Math.floor(Math.log10(Math.abs(x))) + 1, dp = Math.max(0, n - d);
    var v = sigFig(x, n);
    if (Math.abs(v) >= 1e6 || Math.abs(v) < 1e-4) return v.toExponential(n - 1);
    return v.toFixed(dp);
  }
  function titre(initial_cm3, final_cm3) {
    finite(initial_cm3, 'Initial reading'); finite(final_cm3, 'Final reading');
    if (final_cm3 < initial_cm3) throw new RangeError('The final reading cannot be smaller than the initial reading');
    return round(final_cm3 - initial_cm3, 2);
  }
  // A burette reading is recorded to the nearest 0.05 cm³: two decimal places, ending in 0 or 5.
  function validReadingFormat(text) {
    return /^\d{1,2}\.\d[05]$/.test(String(text).trim());
  }
  function nearestHalfTenth(x) { return round(Math.round(x * 20) / 20, 2); }

  /* The concordant titres: the largest set whose spread is within the
     tolerance (0.10 cm³ by default). Ties go to the smaller spread, then to
     the later trials. Fewer than two titres can't be concordant. Returns the
     indices into the array passed in. */
  function concordantSet(titres_cm3, tol_cm3) {
    var tol = tol_cm3 === undefined ? 0.10 : tol_cm3;
    var items = titres_cm3.map(function (v, i) { return { v: round(v, 2), i: i }; })
      .filter(function (x) { return isFinite(x.v); })
      .sort(function (p, q) { return p.v - q.v || p.i - q.i; });
    var best = null;
    for (var lo = 0; lo < items.length; lo++) {
      for (var hi = lo + 1; hi < items.length; hi++) {
        var spread = round(items[hi].v - items[lo].v, 2);
        if (spread > tol + 1e-9) break;
        var set = items.slice(lo, hi + 1);
        var last = Math.max.apply(null, set.map(function (x) { return x.i; }));
        if (!best || set.length > best.set.length ||
            (set.length === best.set.length && (spread < best.spread - 1e-9 ||
              (Math.abs(spread - best.spread) < 1e-9 && last > best.last)))) {
          best = { set: set, spread: spread, last: last };
        }
      }
    }
    return best ? best.set.map(function (x) { return x.i; }).sort(function (p, q) { return p - q; }) : [];
  }
  function mean(values) {
    if (!values.length) throw new RangeError('No values to average');
    values.forEach(function (v) { finite(v, 'Value'); });
    return values.reduce(function (s, v) { return s + v; }, 0) / values.length;
  }
  function absError(experimental, trueValue) { return Math.abs(finite(experimental, 'Value') - finite(trueValue, 'True value')); }
  // |experimental − true| / |true| × 100. Null when the true value is zero.
  function pctError(experimental, trueValue) {
    finite(experimental, 'Value'); finite(trueValue, 'True value');
    if (trueValue === 0) return null;
    return Math.abs(experimental - trueValue) / Math.abs(trueValue) * 100;
  }
  function pctUncertainty(uncertainty, measured) { positive(measured, 'Measurement'); return Math.abs(uncertainty) / measured * 100; }

  /* ---------- Chemicals ----------
     ab: how a chemical enters the charge balance, per mole dissolved.
       fixed: charge carried by spectator ions (Na⁺ +1, Cl⁻ −1, 2Na⁺ +2)
       systems: weak acid systems, each with the charge of its most protonated
       form (z0) and its Ka values in order. NH₃ is the NH₄⁺/NH₃ pair (z0 = +1,
       Ka = Kw/Kb). H₂SO₄ loses its first proton completely, so it enters as
       HSO₄⁻ (z0 = −1) with Ka2. */
  var CHEMICALS = {
    HCl:     { name: 'hydrochloric acid', formula: 'HCl', ab: { fixed: -1 }, look: 'clear' },
    HNO3:    { name: 'nitric acid', formula: 'HNO<sub>3</sub>', ab: { fixed: -1 }, look: 'clear' },
    KOH:     { name: 'potassium hydroxide', formula: 'KOH', ab: { fixed: 1 }, look: 'clear' },
    NaOH:    { name: 'sodium hydroxide', formula: 'NaOH', ab: { fixed: 1 }, look: 'clear' },
    H2SO4:   { name: 'sulfuric acid', formula: 'H<sub>2</sub>SO<sub>4</sub>', ab: { fixed: 0, systems: [{ z0: -1, kas: [1.0e-2] }] }, look: 'clear' },
    CH3COOH: { name: 'ethanoic acid', formula: 'CH<sub>3</sub>COOH', ab: { fixed: 0, systems: [{ z0: 0, kas: [1.74e-5] }] }, look: 'clear' },
    NH3:     { name: 'ammonia solution', formula: 'NH<sub>3</sub>', ab: { fixed: 0, systems: [{ z0: 1, kas: [KW / 1.8e-5] }] }, look: 'clear' },
    Na2CO3:  { name: 'sodium carbonate', formula: 'Na<sub>2</sub>CO<sub>3</sub>', ab: { fixed: 2, systems: [{ z0: 0, kas: [4.5e-7, 4.7e-11] }] }, look: 'clear' },
    KMnO4:   { name: 'potassium manganate(VII)', formula: 'KMnO<sub>4</sub>', ion: 'MnO<sub>4</sub><sup>−</sup>', look: 'purple' },
    Fe2:     { name: 'iron(II) sulfate', formula: 'FeSO<sub>4</sub>', ion: 'Fe<sup>2+</sup>', look: 'palegreen' },
    C2O4:    { name: 'sodium ethanedioate', formula: 'Na<sub>2</sub>C<sub>2</sub>O<sub>4</sub>', ion: 'C<sub>2</sub>O<sub>4</sub><sup>2−</sup>', look: 'clear' }
  };

  /* Relative formula masses from the relative atomic masses on the AQA data
     sheets, so g/dm³ answers match the mark schemes: the A-level sheet gives
     1 d.p.; the GCSE sheet gives whole numbers except Cl (35.5). */
  var AR = { H: 1.0, C: 12.0, N: 14.0, O: 16.0, Na: 23.0, S: 32.1, Cl: 35.5, K: 39.1, Mn: 54.9, Fe: 55.8 };
  var AR_GCSE = { H: 1, C: 12, N: 14, O: 16, Na: 23, S: 32, Cl: 35.5, K: 39, Mn: 55, Fe: 56 };
  var FORMULAE = {
    HCl: { H: 1, Cl: 1 }, HNO3: { H: 1, N: 1, O: 3 }, H2SO4: { H: 2, S: 1, O: 4 },
    NaOH: { Na: 1, O: 1, H: 1 }, KOH: { K: 1, O: 1, H: 1 }, Na2CO3: { Na: 2, C: 1, O: 3 },
    CH3COOH: { C: 2, H: 4, O: 2 }, NH3: { N: 1, H: 3 }, KMnO4: { K: 1, Mn: 1, O: 4 }
  };
  function relativeFormulaMass(id, level) {
    var f = FORMULAE[id]; if (!f) throw new RangeError('No formula for ' + id);
    var ar = level === 'GCSE' ? AR_GCSE : AR, m = 0;
    for (var el in f) m += ar[el] * f[el];
    return round(m, 1);
  }

  /* ---------- Acid–base: pH from the charge balance ---------- */
  // Mean charge per mole of a weak system at [H⁺] = h.
  function systemCharge(h, sys) {
    // Relative populations of each deprotonation state, scaled to the most protonated.
    var terms = [1], t = 1;
    for (var i = 0; i < sys.kas.length; i++) { t = t * sys.kas[i] / h; terms.push(t); }
    var total = 0, charged = 0;
    for (var j = 0; j < terms.length; j++) { total += terms[j]; charged += terms[j] * (sys.z0 - j); }
    return charged / total;
  }
  // concs: { chemicalId: mol dm⁻³ }. Returns the charge imbalance at [H⁺] = h.
  function chargeBalance(h, concs) {
    var f = h - KW / h;
    for (var id in concs) {
      var c = concs[id], ab = CHEMICALS[id] && CHEMICALS[id].ab;
      if (!c || !ab) continue;
      f += c * (ab.fixed || 0);
      (ab.systems || []).forEach(function (sys) { f += c * systemCharge(h, sys); });
    }
    return f;
  }
  // The imbalance rises with [H⁺], so bisection on log[H⁺] always converges.
  function pHFromConcs(concs) {
    var lo = -15.5, hi = 1.5;
    for (var k = 0; k < 80; k++) {
      var mid = (lo + hi) / 2;
      if (chargeBalance(Math.pow(10, mid), concs) > 0) hi = mid; else lo = mid;
    }
    return -(lo + hi) / 2;
  }
  function pHFromAmounts(amounts_mol, volume_cm3) {
    positive(volume_cm3, 'Volume');
    var concs = {};
    for (var id in amounts_mol) concs[id] = amounts_mol[id] / cm3ToDm3(volume_cm3);
    return pHFromConcs(concs);
  }
  /* pH after adding v_cm3 of titrant to an aliquot.
     sys: { analyte: id, analyteAmount_mol, aliquot_cm3, titrant: id, titrantConc_M, extraVolume_cm3 } */
  function pHAfter(sys, v_cm3) {
    var n = {};
    n[sys.analyte] = sys.analyteAmount_mol;
    n[sys.titrant] = (n[sys.titrant] || 0) + sys.titrantConc_M * cm3ToDm3(v_cm3);
    return pHFromAmounts(n, sys.aliquot_cm3 + (sys.extraVolume_cm3 || 0) + v_cm3);
  }
  function pHCurve(sys, maxV_cm3, step_cm3) {
    var out = [];
    for (var v = 0; v <= maxV_cm3 + 1e-9; v += step_cm3) out.push({ v: round(v, 3), pH: pHAfter(sys, v) });
    return out;
  }
  // Where the pH changes fastest: the equivalence point found from the chemistry,
  // which the tests compare with the stoichiometric volume.
  function steepestPoint(sys, from_cm3, to_cm3) {
    var best = from_cm3, bestSlope = -1, h = 0.002;
    for (var v = from_cm3; v <= to_cm3; v += 0.01) {
      var s = Math.abs(pHAfter(sys, v + h) - pHAfter(sys, Math.max(0, v - h))) / (2 * h);
      if (s > bestSlope) { bestSlope = s; best = v; }
    }
    for (var w = best - 0.01; w <= best + 0.01; w += 0.0005) {
      var s2 = Math.abs(pHAfter(sys, w + h / 4) - pHAfter(sys, Math.max(0, w - h / 4))) / (h / 2);
      if (s2 > bestSlope) { bestSlope = s2; best = w; }
    }
    return best;
  }

  /* ---------- Indicators ----------
     abs: absorbance per channel (R, G, B) of the fully acidic / fully alkaline
     form, for the standard 3 drops in 50 cm³ over the flask's path length. A
     colourless form has zero absorbance. endRising / endFalling: the fraction
     in the alkaline form at which a careful student sees the endpoint, going
     up (alkali added) or down (acid added): the first permanent tint for
     phenolphthalein, the first orange for methyl orange, the first green for
     bromothymol blue. describeFlask names colours at the same fractions, so
     what the student is told they see and where the endpoint is agree. Universal indicator is a mixture with no single pKIn, so
     its colour comes from a pH table and it has no sharp endpoint. */
  var INDICATORS = {
    phenolphthalein: { name: 'Phenolphthalein', pKIn: 9.3, range: [8.3, 10.0], acidColour: 'colourless', alkaliColour: 'pink',
      absAcid: [0, 0, 0], absAlkali: [0.12, 0.85, 0.22], endFraction: 0.04, endRising: 0.04, endFalling: 0.04 },
    methylOrange: { name: 'Methyl orange', pKIn: 3.7, range: [3.1, 4.4], acidColour: 'red', alkaliColour: 'yellow',
      absAcid: [0.04, 1.25, 1.05], absAlkali: [0.0, 0.22, 1.35], endFraction: 0.5, endRising: 0.5, endFalling: 0.75 },
    bromothymolBlue: { name: 'Bromothymol blue', pKIn: 7.1, range: [6.0, 7.6], acidColour: 'yellow', alkaliColour: 'blue',
      absAcid: [0.0, 0.12, 1.25], absAlkali: [1.35, 0.55, 0.10], endFraction: 0.5, endRising: 0.25, endFalling: 0.75 },
    universal: { name: 'Universal indicator', pKIn: null, range: [1, 14], acidColour: 'red', alkaliColour: 'purple',
      endFraction: null }
  };
  // Universal indicator: transmitted fraction per channel by pH.
  var UI_TABLE = [
    [1, [0.92, 0.18, 0.16]], [3, [0.95, 0.42, 0.14]], [5, [0.97, 0.78, 0.18]], [6, [0.86, 0.90, 0.22]],
    [7, [0.30, 0.78, 0.30]], [8, [0.20, 0.62, 0.62]], [9, [0.22, 0.42, 0.85]], [11, [0.45, 0.22, 0.80]], [14, [0.55, 0.15, 0.62]]
  ];
  function alkalineFraction(ind, pH) { return 1 / (1 + Math.pow(10, ind.pKIn - pH)); }
  /* Absorbance per channel of the indicator in the flask. Its concentration
     falls as the flask fills: drops/3 × 50/volume. */
  function indicatorAbsorbance(id, drops, pH, volume_cm3) {
    var ind = INDICATORS[id];
    if (!ind || !drops) return [0, 0, 0];
    var scale = (drops / 3) * (50 / Math.max(volume_cm3, 1));
    if (id === 'universal') {
      var t = interpTable(UI_TABLE, pH);
      return t.map(function (x) { return -Math.log10(x) * scale; });
    }
    var f = alkalineFraction(ind, pH);
    return [0, 1, 2].map(function (k) { return (ind.absAcid[k] * (1 - f) + ind.absAlkali[k] * f) * scale; });
  }
  function interpTable(table, x) {
    if (x <= table[0][0]) return table[0][1].slice();
    for (var i = 1; i < table.length; i++) {
      if (x <= table[i][0]) {
        var a = table[i - 1], b = table[i], u = (x - a[0]) / (b[0] - a[0]);
        return a[1].map(function (v, k) { return v + (b[1][k] - v) * u; });
      }
    }
    return table[table.length - 1][1].slice();
  }

  /* Volume of titrant at which the indicator's colour changes, found from the
     pH, not set in advance. Null if it never changes in range (universal
     indicator, or an indicator whose range the pH never crosses). */
  function indicatorEndpoint(sys, indicatorId, maxV_cm3) {
    var ind = INDICATORS[indicatorId];
    if (!ind || ind.endFraction === null) return null;
    var max = maxV_cm3 || 60;
    var f0 = alkalineFraction(ind, pHAfter(sys, 0)), rising = f0 < 0.5;
    var target = rising ? ind.endRising : ind.endFalling;
    function past(v) { var f = alkalineFraction(ind, pHAfter(sys, v)); return rising ? f >= target : f <= target; }
    if (past(0)) return 0;
    var prev = 0;
    for (var v = 0.05; v <= max + 1e-9; v += 0.05) {
      if (past(v)) {
        var lo = prev, hi = v;
        for (var k = 0; k < 40; k++) { var m = (lo + hi) / 2; if (past(m)) hi = m; else lo = m; }
        return hi;
      }
      prev = v;
    }
    return null;
  }
  /* Volume over which the colour goes from 10 % to 90 % of the way through its
     change: a few hundredths of a cm³ for a good indicator, several cm³ for a
     poor one. */
  function indicatorSharpness(sys, indicatorId, maxV_cm3) {
    var ind = INDICATORS[indicatorId];
    if (!ind || ind.endFraction === null) return null;
    var max = maxV_cm3 || 60;
    var f0 = alkalineFraction(ind, pHAfter(sys, 0)), rising = f0 < 0.5;
    function crossAt(target) {
      function past(v) { var f = alkalineFraction(ind, pHAfter(sys, v)); return rising ? f >= target : f <= target; }
      if (past(0)) return 0;
      var prev = 0;
      for (var v = 0.05; v <= max + 1e-9; v += 0.05) {
        if (past(v)) { var lo = prev, hi = v; for (var k = 0; k < 30; k++) { var m = (lo + hi) / 2; if (past(m)) hi = m; else lo = m; } return hi; }
        prev = v;
      }
      return null;
    }
    var a = crossAt(rising ? 0.1 : 0.9), b = crossAt(rising ? 0.9 : 0.1);
    if (a === null || b === null) return null;
    return b - a;
  }

  /* ---------- Colour ----------
     Molar absorptivity per channel (dm³ mol⁻¹ cm⁻¹). MnO₄⁻ absorbs green most
     strongly (λmax ≈ 525 nm, ε ≈ 2.4 × 10³), so it looks purple, and a
     slight excess (≈1 × 10⁻⁵ mol dm⁻³) is pale pink. Fe³⁺ is a faint
     yellow. MnO₂ is a brown suspension, given as absorbance per mol dm⁻³. */
  var EPS = {
    MnO4: [60, 2000, 320],
    Fe3: [0.01, 0.08, 0.35],
    Fe2: [0.25, 0.02, 0.18],
    MnO2: [2200, 2900, 3700]
  };
  var FLASK_PATH_cm = 4.5;
  function absorbanceOf(species, conc_M, path_cm) {
    var e = EPS[species];
    return [e[0] * conc_M * path_cm, e[1] * conc_M * path_cm, e[2] * conc_M * path_cm];
  }
  function addAbs(a, b) { return [a[0] + b[0], a[1] + b[1], a[2] + b[2]]; }
  // Fraction of light let through, per channel.
  function transmittance(abs) { return abs.map(function (A) { return Math.pow(10, -Math.max(0, A)); }); }

  /* ---------- Reaction kinetics (ethanedioate) ----------
     Rate of loss of MnO₄⁻ is first order in MnO₄⁻:
       k = k60 × exp(−Ea/R × (1/T − 1/333 K)) × (α + [Mn²⁺]/Mref) × [C₂O₄²⁻]/([C₂O₄²⁻] + Kox)
     Arrhenius for temperature, α + [Mn²⁺]/Mref for autocatalysis by Mn²⁺,
     and the last factor slows it only as the ethanedioate runs out. With these
     values (checked by the chemistry review) the first 1 cm³ takes about 15 s
     to decolourise at 60 °C and about 6 minutes at 20 °C; once [Mn²⁺] reaches
     2 × 10⁻³ mol dm⁻³ a 1 cm³ portion clears in about 2 s at 60 °C and 50 s
     at 20 °C. The stoichiometry never depends on them. */
  var KINETICS = { k60_per_s: 1.0, Ea_J: 65000, alpha: 0.05, Mref_M: 1.0e-3, Kox_M: 1.0e-4 };
  function oxalateRateConstant(T_C, Mn2_M, ox_M, K) {
    K = K || KINETICS;
    var T = T_C + 273.15;
    var arr = Math.exp(-K.Ea_J / R * (1 / T - 1 / 333.15));
    return K.k60_per_s * arr * (K.alpha + Mn2_M / K.Mref_M) * (ox_M / (ox_M + K.Kox_M));
  }

  /* ---------- The conical flask ----------
     One model for every experiment. Titrant from the burette lands in an
     unmixed pool where the drop falls; swirling (or, slowly, diffusion) mixes
     it into the bulk. The bulk is where the chemistry is judged. The pool is
     used only for the local flash of colour round the drop.
       acid-base: amounts of each chemical as added (n), pH from the charge balance.
       redox: amounts of each species (rx), reacting as they mix: Fe²⁺ at once,
       C₂O₄²⁻ by the rate law in KINETICS.
     Side reactions with the wrong acid, as fractions or rates (documented
     approximations, chosen to give the right direction and a plausible size):
       Cl⁻ is oxidised alongside the reductant (4 % of the MnO₄⁻ reacting) and
       slowly bleaches any excess (k = 0.004 s⁻¹), so the titre comes out high.
       NO₃⁻ oxidises Fe²⁺ (k = 1.5 × 10⁻⁴ s⁻¹ at 20 °C, doubling every 10 °C),
       so the titre comes out low. */
  var MIX_TAU_s = 15, ZONE_cm3 = 1.5, COOL_TAU_s = 1000;
  var SIDE = { clFraction: 0.04, clFade_per_s: 0.004, no3Fe_per_s: 1.5e-4 };

  function emptyRx() { return { Fe2: 0, Fe3: 0, C2O4: 0, MnO4: 0, Mn2: 0, MnO2: 0, H: 0, Cl: 0, NO3: 0, CO2: 0 }; }
  function cloneRx(rx) { var o = {}; for (var k in rx) o[k] = rx[k]; return o; }

  /* MnO₄⁻ reacting with a reductant. per5: reductant per MnO₄⁻ when it goes to
     Mn²⁺ (5 for Fe²⁺, 2.5 for C₂O₄²⁻); per3: when it can only go to MnO₂
     (3 and 1.5). Each MnO₄⁻ to Mn²⁺ uses 8 H⁺; with the acid used up, the rest
     goes to MnO₂. Returns the amount of MnO₄⁻ that reacted. */
  function reduceMnO4(rx, x, red, per5, per3) {
    x = Math.min(x, rx.MnO4);
    if (x <= 0 || rx[red] <= 0) return 0;
    // Induced oxidation of chloride: while the reductant is reacting, a share
    // of the MnO₄⁻ oxidises Cl⁻ instead (2MnO₄⁻ + 16H⁺ + 10Cl⁻ → 2Mn²⁺ + 5Cl₂ + 8H₂O).
    var c = 0;
    if (rx.Cl > 0) {
      c = Math.max(0, Math.min(x * SIDE.clFraction, rx.Cl / 5, rx.H / 8));
      rx.MnO4 -= c; rx.Cl -= 5 * c; rx.H -= 8 * c; rx.Mn2 += c; x -= c;
    }
    var a = Math.max(0, Math.min(x, rx.H / 8, rx[red] / per5));
    rx.MnO4 -= a; rx[red] -= a * per5; rx.H -= a * 8; rx.Mn2 += a;
    var b = 0;
    if (x - a > 1e-15 && rx[red] > 1e-15 && rx.H < 8e-12) {
      b = Math.min(x - a, rx[red] / per3);
      rx.MnO4 -= b; rx[red] -= b * per3; rx.MnO2 += b;
    }
    if (red === 'Fe2') rx.Fe3 += a * 5 + b * 3; else rx.CO2 += 2 * (a * 2.5 + b * 1.5);
    // Chloride that was oxidised while no reductant was left would have been
    // MnO₄⁻ left over; give back what didn't find a reductant.
    if (c > 0 && a + b < x - 1e-15 && rx[red] <= 1e-15) {
      var back = Math.min(c, (x - a - b) * SIDE.clFraction);
      rx.MnO4 += back; rx.Cl += 5 * back; rx.H += 8 * back; rx.Mn2 -= back; c -= back;
    }
    return a + b + c;
  }
  // Let everything react to completion, as if waited for indefinitely.
  function settleRx(rx, analyte) {
    var o = cloneRx(rx);
    for (var i = 0; i < 4; i++) {
      if (analyte === 'Fe2') reduceMnO4(o, o.MnO4, 'Fe2', 5, 3);
      else reduceMnO4(o, o.MnO4, 'C2O4', 2.5, 1.5);
    }
    return o;
  }

  function createFlask(kind, analyteId) {
    var f = {
      kind: kind, analyte: analyteId,
      vol: 0, n: {}, un: { vol: 0, n: {} },
      rx: emptyRx(),
      indicator: null, drops: 0, T: ROOM_C, t: 0, heatedTo: null
    };
    function into(target, id, mol) { target[id] = (target[id] || 0) + mol; }
    function warmMix(v) { if (v > 0) f.T = (f.T * f.vol + ROOM_C * v) / (f.vol + v); }

    f.totalVol = function () { return f.vol + f.un.vol; };
    // A solution poured or pipetted in: mixed straight into the bulk.
    f.addSolution = function (id, c_M, v_cm3) {
      nonNegative(v_cm3, 'Volume');
      var mol = amount(c_M, v_cm3);
      warmMix(v_cm3);
      if (kind === 'redox') into(f.rx, id === 'KMnO4' ? 'MnO4' : id, mol);
      else into(f.n, id, mol);
      f.vol += v_cm3;
      if (kind === 'redox') react();
    };
    // Titrant from the burette lands in the pool under the jet.
    f.addTitrant = function (id, c_M, v_cm3) {
      if (!(v_cm3 > 0)) return;
      var mol = amount(c_M, v_cm3);
      f.T = (f.T * f.totalVol() + ROOM_C * v_cm3) / (f.totalVol() + v_cm3);
      into(f.un.n, kind === 'redox' ? 'MnO4' : id, mol);
      f.un.vol += v_cm3;
    };
    f.addWater = function (v_cm3) { warmMix(v_cm3); f.vol += nonNegative(v_cm3, 'Volume'); };
    f.addAcidifier = function (acid, v_cm3) {
      var mol = amount(acid.conc_M, v_cm3);
      warmMix(v_cm3);
      f.rx.H += mol * acid.hPer;
      if (acid.anion) f.rx[acid.anion] += mol;
      f.vol += v_cm3;
    };
    f.addIndicator = function (id, drops) { f.indicator = id; f.drops += drops; };
    f.heat = function (T_C) { f.T = T_C; f.heatedTo = Math.max(f.heatedTo || 0, T_C); };

    // Mix a fraction of the pool into the bulk.
    function mix(frac) {
      if (f.un.vol <= 0) return;
      frac = Math.min(1, Math.max(0, frac));
      for (var id in f.un.n) {
        var m = f.un.n[id] * frac;
        if (kind === 'redox') f.rx[id] += m; else into(f.n, id, m);
        f.un.n[id] -= m;
      }
      f.vol += f.un.vol * frac; f.un.vol -= f.un.vol * frac;
      if (f.un.vol < 1e-9) { f.vol += f.un.vol; f.un.vol = 0; f.un.n = {}; }
      if (kind === 'redox') react();
    }
    f.swirl = function () { mix(1); };
    // Fast reactions on mixing: Fe²⁺ with MnO₄⁻ is instant.
    function react() { if (f.analyte === 'Fe2') reduceMnO4(f.rx, f.rx.MnO4, 'Fe2', 5, 3); }

    f.step = function (dt) {
      if (!(dt > 0)) return;
      f.t += dt;
      mix(1 - Math.exp(-dt / MIX_TAU_s));
      f.T = ROOM_C + (f.T - ROOM_C) * Math.exp(-dt / COOL_TAU_s);
      if (kind !== 'redox') return;
      var V = f.vol / 1000, rx = f.rx;
      if (V <= 0) return;
      // Ethanedioate: the rate law, in short sub-steps.
      if (f.analyte === 'C2O4' && rx.MnO4 > 0 && rx.C2O4 > 0) {
        var steps = Math.max(1, Math.ceil(dt / 0.05)), h = dt / steps;
        for (var i = 0; i < steps && rx.MnO4 > 0 && rx.C2O4 > 0; i++) {
          var k = oxalateRateConstant(f.T, rx.Mn2 / V, rx.C2O4 / V);
          reduceMnO4(rx, rx.MnO4 * (1 - Math.exp(-k * h)), 'C2O4', 2.5, 1.5);
        }
      }
      // Nitric acid oxidises iron(II) directly: 3Fe²⁺ + NO₃⁻ + 4H⁺ → 3Fe³⁺ + NO + 2H₂O.
      if (rx.NO3 > 0 && rx.Fe2 > 0) {
        var kN = SIDE.no3Fe_per_s * Math.pow(2, (f.T - ROOM_C) / 10);
        var dFe = Math.max(0, Math.min(rx.Fe2 * (1 - Math.exp(-kN * dt)), rx.NO3 * 3, rx.H * 0.75));
        rx.Fe2 -= dFe; rx.Fe3 += dFe; rx.NO3 -= dFe / 3; rx.H -= dFe * 4 / 3;
      }
      // Chloride slowly bleaches an excess of MnO₄⁻ once the reductant has gone.
      var reductant = f.analyte === 'Fe2' ? rx.Fe2 : rx.C2O4;
      if (rx.Cl > 0 && rx.MnO4 > 0 && reductant <= 1e-12 && rx.H > 0) {
        var d = Math.max(0, Math.min(rx.MnO4 * (1 - Math.exp(-SIDE.clFade_per_s * dt)), rx.Cl / 5, rx.H / 8));
        rx.MnO4 -= d; rx.Cl -= 5 * d; rx.H -= 8 * d; rx.Mn2 += d;
      }
    };

    f.pH = function () {
      if (kind !== 'acid-base' || f.vol <= 0) return null;
      return pHFromAmounts(f.n, f.vol);
    };
    // pH in the pool under the jet: the pool plus the bulk right round it.
    f.localPH = function () {
      if (kind !== 'acid-base' || f.un.vol <= 0 || f.vol <= 0) return f.pH();
      var frac = Math.min(1, ZONE_cm3 / f.vol), n = {};
      for (var id in f.n) n[id] = f.n[id] * frac;
      for (var u in f.un.n) n[u] = (n[u] || 0) + f.un.n[u];
      return pHFromAmounts(n, f.vol * frac + f.un.vol);
    };
    // What the eye sees: absorbance per channel of the bulk, the brown haze of
    // MnO₂, and the flash round the drop with how strongly it shows.
    f.appearance = function () {
      var total = f.totalVol();
      var out = { abs: [0, 0, 0], haze: 0, plume: null, empty: total <= 0 };
      if (total <= 0) return out;
      if (kind === 'acid-base') {
        if (f.indicator && f.vol > 0) out.abs = indicatorAbsorbance(f.indicator, f.drops, f.pH(), total);
        if (f.indicator && f.un.vol > 0.001 && f.vol > 0) {
          out.plume = { abs: indicatorAbsorbance(f.indicator, f.drops, f.localPH(), total), strength: f.un.vol / (f.un.vol + 0.15) };
        }
      } else {
        var V = total / 1000, rx = f.rx;
        out.abs = addAbs(addAbs(absorbanceOf('MnO4', rx.MnO4 / V, FLASK_PATH_cm), absorbanceOf('Fe3', rx.Fe3 / V, FLASK_PATH_cm)),
          absorbanceOf('Fe2', rx.Fe2 / V, FLASK_PATH_cm));
        out.haze = rx.MnO2 / V;
        var unMn = f.un.n.MnO4 || 0;
        if (unMn > 0) {
          var frac = Math.min(1, ZONE_cm3 / Math.max(f.vol, 0.001)), local = unMn;
          if (f.analyte === 'Fe2') local = Math.max(0, unMn - rx.Fe2 * frac / 5);
          var lv = (f.vol * frac + f.un.vol) / 1000;
          if (local > 0) out.plume = { abs: absorbanceOf('MnO4', local / lv, FLASK_PATH_cm), strength: f.un.vol / (f.un.vol + 0.15) };
        }
      }
      return out;
    };
    // The same state, with every reaction finished and every drop mixed in.
    f.settled = function () {
      var rx = cloneRx(f.rx);
      rx.MnO4 += f.un.n.MnO4 || 0;
      return settleRx(rx, f.analyte);
    };
    f.describe = function () { return describeFlask(f); };
    return f;
  }

  /* A colour in words, for the live region, the colour chip and feedback.
     From the chemistry, not from pixels: the indicator's alkaline fraction,
     or the concentration of excess MnO₄⁻. */
  function describeFlask(f) {
    var total = f.totalVol();
    if (total <= 0) return { text: 'empty', key: 'empty' };
    if (f.kind === 'acid-base') {
      if (!f.indicator) return { text: 'colourless (no indicator yet)', key: 'none' };
      var pH = f.pH(), ind = INDICATORS[f.indicator];
      if (f.indicator === 'universal') {
        var name = pH < 3 ? 'red' : pH < 5 ? 'orange' : pH < 6.5 ? 'yellow' : pH < 7.5 ? 'green' : pH < 10 ? 'blue' : 'purple';
        return { text: name, key: 'ui-' + name, pH: pH };
      }
      var fr = alkalineFraction(ind, pH), strength = (f.drops / 3) * (50 / total);
      if (f.indicator === 'phenolphthalein') {
        var vis = fr * strength;
        if (vis < 0.02) return { text: 'colourless', key: 'colourless', pH: pH };
        if (vis < 0.12) return { text: 'pale pink', key: 'pale-pink', pH: pH };
        if (vis < 0.45) return { text: 'pink', key: 'pink', pH: pH };
        return { text: 'deep pink', key: 'deep-pink', pH: pH };
      }
      if (f.indicator === 'methylOrange') {
        // Red turns visibly orange at about half and half; yellow shows orange sooner.
        if (fr < 0.5) return { text: 'red', key: 'red', pH: pH };
        if (fr < 0.75) return { text: 'orange', key: 'orange', pH: pH };
        return { text: 'yellow', key: 'yellow', pH: pH };
      }
      if (fr < 0.25) return { text: 'yellow', key: 'yellow', pH: pH };
      if (fr < 0.75) return { text: 'green', key: 'green', pH: pH };
      return { text: 'blue', key: 'blue', pH: pH };
    }
    var V = total / 1000, mn = f.rx.MnO4 / V, parts = [], key;
    if (mn < 3e-6) { key = 'colourless'; parts.push(f.rx.Fe3 / V > 0.012 ? 'pale yellow' : 'colourless'); }
    else if (mn < 3e-5) { key = 'pale-pink'; parts.push('pale pink'); }
    else if (mn < 1.2e-4) { key = 'pink'; parts.push('pink'); }
    else { key = 'purple'; parts.push('purple'); }
    if (f.rx.MnO2 / V > 2e-5) parts.push('with a brown precipitate');
    return { text: parts.join(' '), key: key, excessMnO4_M: mn };
  }

  /* ---------- Seeded random numbers ---------- */
  function rng(seed) {
    var a = (seed >>> 0) || 1;
    var f = function () {
      a = (a + 0x6D2B79F5) >>> 0;
      var t = a;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
    f.gauss = function () {
      var u = 1 - f(), v = f();
      return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
    };
    f.pick = function (arr) { return arr[Math.floor(f() * arr.length)]; };
    f.between = function (lo, hi) { return lo + (hi - lo) * f(); };
    return f;
  }
  function hashSeed(text) {
    var h = 2166136261;
    for (var i = 0; i < text.length; i++) { h ^= text.charCodeAt(i); h = Math.imul(h, 16777619); }
    return h >>> 0;
  }

  /* ---------- Apparatus and measurement ----------
     tolerance: the manufacturer's limit (Class B). sdRandom: the scatter from
     one use to the next in careful hands, which is smaller. readUnc: the
     uncertainty of one reading. */
  var APPARATUS = {
    pipette25: { kind: 'pipette', label: '25.00 cm³ volumetric pipette', nominal_cm3: 25.00, tolerance_cm3: 0.06, sdRandom_cm3: 0.015, residual_cm3: 0.10, recordAs: '25.00' },
    pipette10: { kind: 'pipette', label: '10.00 cm³ volumetric pipette', nominal_cm3: 10.00, tolerance_cm3: 0.04, sdRandom_cm3: 0.006, residual_cm3: 0.06, recordAs: '10.00' },
    cylinder25: { kind: 'cylinder', label: '25 cm³ measuring cylinder', nominal_cm3: 25.0, tolerance_cm3: 0.5, sdRandom_cm3: 0.20, residual_cm3: 0.30, recordAs: '25.0' },
    beaker50: { kind: 'beaker', label: '50 cm³ beaker (graduated)', nominal_cm3: 25, tolerance_cm3: 2.5, sdRandom_cm3: 1.2, residual_cm3: 0.5, recordAs: '25' },
    burette50: { kind: 'burette', label: '50.00 cm³ burette', capacity_cm3: 50, readUnc_cm3: 0.05, tolerance_cm3: 0.10, belowScale_cm3: 2.4, aboveScale_cm3: 3.0, jet_cm3: 0.30, residualWater_cm3: 0.50 },
    drop: { volume_cm3: 0.05, sd_cm3: 0.004 }
  };

  return {
    KW: KW, ROOM_C: ROOM_C,
    cm3ToDm3: cm3ToDm3, dm3ToCm3: dm3ToCm3, amount: amount, concentration: concentration, convert: convert,
    equivalenceVolume: equivalenceVolume, solveConcentration: solveConcentration,
    round: round, sigFig: sigFig, fmtSig: fmtSig, titre: titre, validReadingFormat: validReadingFormat, nearestHalfTenth: nearestHalfTenth,
    concordantSet: concordantSet, mean: mean, absError: absError, pctError: pctError, pctUncertainty: pctUncertainty,
    CHEMICALS: CHEMICALS, systemCharge: systemCharge, chargeBalance: chargeBalance,
    pHFromConcs: pHFromConcs, pHFromAmounts: pHFromAmounts, pHAfter: pHAfter, pHCurve: pHCurve, steepestPoint: steepestPoint,
    INDICATORS: INDICATORS, alkalineFraction: alkalineFraction, indicatorAbsorbance: indicatorAbsorbance,
    indicatorEndpoint: indicatorEndpoint, indicatorSharpness: indicatorSharpness,
    EPS: EPS, FLASK_PATH_cm: FLASK_PATH_cm, absorbanceOf: absorbanceOf, addAbs: addAbs, transmittance: transmittance,
    AR: AR, relativeFormulaMass: relativeFormulaMass,
    KINETICS: KINETICS, oxalateRateConstant: oxalateRateConstant,
    rng: rng, hashSeed: hashSeed, APPARATUS: APPARATUS,
    createFlask: createFlask, describeFlask: describeFlask, settleRx: settleRx, reduceMnO4: reduceMnO4, SIDE: SIDE, MIX_TAU_s: MIX_TAU_s
  };
});
