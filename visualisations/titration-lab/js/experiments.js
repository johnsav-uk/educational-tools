/* Titration Laboratory — experiment definitions.

   Every experiment is data: what is in the burette and the flask, the balanced
   equation and its coefficients, what the student may choose, and how much
   guidance they get. make(rng) turns a definition into one run, picking the
   unknown concentration from a seeded generator so a challenge code replays
   the same experiment. The laboratory and the calculations read only these
   fields, so there is one interface for every experiment.

   Scope follows the AQA specifications:
     GCSE Chemistry 8462 — 4.4.2.5 Titrations (chemistry only): strong acids
       (hydrochloric, sulfuric, nitric) and strong alkalis only; Required
       practical 2. (HT) concentrations in mol/dm³ and g/dm³ (4.3.4).
     A-level Chemistry 7405 — 3.1.2.5 and Required practical 1 (a volumetric
       solution and a simple acid–base titration); 3.1.12.5 pH curves,
       titrations and indicators; 3.2.5.5 redox titrations of Fe²⁺ and C₂O₄²⁻
       with MnO₄⁻; 3.2.5.6 autocatalysis by Mn²⁺. */
(function (root) {
  'use strict';
  var E = root.TitrationEngine;

  // Unknown concentration chosen so the titre lands between 18 and 32 cm³,
  // then rounded to 3 s.f. as a real stock solution would be labelled.
  function unknownFor(rng, o) {
    var target = rng.between(18, 32);
    var nT = o.knownConc_M * target / 1000;
    var c;
    if (o.unknown === 'analyte') c = E.convert(nT, o.titrantCoeff, o.analyteCoeff) / (o.aliquot_cm3 / 1000);
    else c = E.convert(o.knownConc_M * o.aliquot_cm3 / 1000, o.analyteCoeff, o.titrantCoeff) / (target / 1000);
    return E.sigFig(c, 3);
  }

  var EQ = {
    HCl_NaOH:   { molecular: 'HCl + NaOH → NaCl + H<sub>2</sub>O', ionic: 'H<sup>+</sup> + OH<sup>−</sup> → H<sub>2</sub>O' },
    HCl_KOH:    { molecular: 'HCl + KOH → KCl + H<sub>2</sub>O', ionic: 'H<sup>+</sup> + OH<sup>−</sup> → H<sub>2</sub>O' },
    HNO3_NaOH:  { molecular: 'HNO<sub>3</sub> + NaOH → NaNO<sub>3</sub> + H<sub>2</sub>O', ionic: 'H<sup>+</sup> + OH<sup>−</sup> → H<sub>2</sub>O' },
    HNO3_KOH:   { molecular: 'HNO<sub>3</sub> + KOH → KNO<sub>3</sub> + H<sub>2</sub>O', ionic: 'H<sup>+</sup> + OH<sup>−</sup> → H<sub>2</sub>O' },
    H2SO4_NaOH: { molecular: 'H<sub>2</sub>SO<sub>4</sub> + 2NaOH → Na<sub>2</sub>SO<sub>4</sub> + 2H<sub>2</sub>O', ionic: 'H<sup>+</sup> + OH<sup>−</sup> → H<sub>2</sub>O' },
    H2SO4_KOH:  { molecular: 'H<sub>2</sub>SO<sub>4</sub> + 2KOH → K<sub>2</sub>SO<sub>4</sub> + 2H<sub>2</sub>O', ionic: 'H<sup>+</sup> + OH<sup>−</sup> → H<sub>2</sub>O' },
    CH3COOH_NaOH: { molecular: 'CH<sub>3</sub>COOH + NaOH → CH<sub>3</sub>COONa + H<sub>2</sub>O', ionic: 'CH<sub>3</sub>COOH + OH<sup>−</sup> → CH<sub>3</sub>COO<sup>−</sup> + H<sub>2</sub>O' },
    NH3_HCl:    { molecular: 'NH<sub>3</sub> + HCl → NH<sub>4</sub>Cl', ionic: 'NH<sub>3</sub> + H<sup>+</sup> → NH<sub>4</sub><sup>+</sup>' },
    Na2CO3_HCl: { molecular: 'Na<sub>2</sub>CO<sub>3</sub> + 2HCl → 2NaCl + H<sub>2</sub>O + CO<sub>2</sub>', ionic: 'CO<sub>3</sub><sup>2−</sup> + 2H<sup>+</sup> → H<sub>2</sub>O + CO<sub>2</sub>' },
    Fe:         { molecular: null, ionic: 'MnO<sub>4</sub><sup>−</sup> + 8H<sup>+</sup> + 5Fe<sup>2+</sup> → Mn<sup>2+</sup> + 4H<sub>2</sub>O + 5Fe<sup>3+</sup>' },
    C2O4:       { molecular: null, ionic: '2MnO<sub>4</sub><sup>−</sup> + 16H<sup>+</sup> + 5C<sub>2</sub>O<sub>4</sub><sup>2−</sup> → 2Mn<sup>2+</sup> + 8H<sub>2</sub>O + 10CO<sub>2</sub>' }
  };
  // Half-equations for the redox calculations and the A-level equation check.
  var HALF = {
    MnO4: 'MnO<sub>4</sub><sup>−</sup> + 8H<sup>+</sup> + 5e<sup>−</sup> → Mn<sup>2+</sup> + 4H<sub>2</sub>O',
    Fe: 'Fe<sup>2+</sup> → Fe<sup>3+</sup> + e<sup>−</sup>',
    C2O4: 'C<sub>2</sub>O<sub>4</sub><sup>2−</sup> → 2CO<sub>2</sub> + 2e<sup>−</sup>'
  };

  var GCSE_INDICATORS = ['phenolphthalein', 'methylOrange', 'universal'];
  var ALEVEL_INDICATORS = ['phenolphthalein', 'methylOrange', 'bromothymolBlue'];
  var REDOX_ACIDS = ['H2SO4', 'HCl', 'HNO3'];

  // The acid the flask is acidified with: 10 cm³ from a measuring cylinder.
  var ACIDIFIERS = {
    H2SO4: { name: 'dilute sulfuric acid', formula: 'H<sub>2</sub>SO<sub>4</sub>', conc_M: 1.0, hPer: 2, anion: null, label: '1.0 mol dm⁻³ H₂SO₄' },
    HCl:   { name: 'dilute hydrochloric acid', formula: 'HCl', conc_M: 2.0, hPer: 1, anion: 'Cl', label: '2.0 mol dm⁻³ HCl' },
    HNO3:  { name: 'dilute nitric acid', formula: 'HNO<sub>3</sub>', conc_M: 2.0, hPer: 1, anion: 'NO3', label: '2.0 mol dm⁻³ HNO₃' }
  };

  function acidBase(o) {
    o.type = 'acid-base';
    o.indicatorOptions = o.indicatorOptions || GCSE_INDICATORS;
    return o;
  }

  var LIST = [
    /* ---------------- GCSE ---------------- */
    { id: 'gcse-guided', num: 1, pathway: 'gcse', level: 'GCSE', mode: 'guided',
      title: 'Guided neutralisation',
      blurb: 'Titrate sodium hydroxide with hydrochloric acid step by step, from rinsing the burette to a worked calculation.',
      spec: ['AQA GCSE Chemistry 4.4.2.5', 'Required practical 2', '4.3.4 (HT)'],
      prereq: 'None. Start here.',
      make: function (rng) {
        var cAnalyte = E.sigFig(rng.between(0.085, 0.118), 3);
        return acidBase({
          titrant: { id: 'HCl', conc_M: 0.100, known: true },
          analyte: { id: 'NaOH', conc_M: cAnalyte, known: false },
          unknown: 'analyte', coeff: { titrant: 1, analyte: 1 }, eq: EQ.HCl_NaOH,
          indicator: 'phenolphthalein', indicatorOptions: ['phenolphthalein'], chooseIndicator: false, chooseAliquot: false
        });
      } },

    { id: 'gcse-independent', num: 2, pathway: 'gcse', level: 'GCSE', mode: 'independent',
      title: 'Independent neutralisation',
      blurb: 'Choose your own apparatus and indicator, then find the concentration of sulfuric acid from repeat titrations.',
      spec: ['AQA GCSE Chemistry 4.4.2.5', 'Required practical 2', '4.3.4 (HT)'],
      prereq: 'Experiment 1, or a titration done in class.',
      make: function (rng) {
        var c = unknownFor(rng, { unknown: 'titrant', knownConc_M: 0.100, aliquot_cm3: 25, titrantCoeff: 1, analyteCoeff: 2 });
        return acidBase({
          titrant: { id: 'H2SO4', conc_M: c, known: false },
          analyte: { id: 'NaOH', conc_M: 0.100, known: true },
          unknown: 'titrant', coeff: { titrant: 1, analyte: 2 }, eq: EQ.H2SO4_NaOH,
          indicator: null, chooseIndicator: true, chooseAliquot: true
        });
      } },

    { id: 'gcse-mystery', num: 3, pathway: 'gcse', level: 'GCSE', mode: 'mystery',
      title: 'Mystery acid or alkali',
      blurb: 'A new unknown every time. Get concordant titres, work out the concentration, then see how close you were.',
      spec: ['AQA GCSE Chemistry 4.4.2.5', '4.3.4 (HT)'],
      prereq: 'Experiments 1 and 2.',
      mystery: true,
      make: function (rng) {
        var acid = rng.pick(['HCl', 'HNO3', 'H2SO4']), alkali = rng.pick(['NaOH', 'KOH']);
        var acidCoeff = 1, alkaliCoeff = acid === 'H2SO4' ? 2 : 1;
        var eq = EQ[acid + '_' + alkali];
        if (rng() < 0.5) {
          // Unknown alkali in the flask; known acid in the burette.
          var cAcid = acid === 'H2SO4' ? 0.0500 : 0.100;
          var cAlk = unknownFor(rng, { unknown: 'analyte', knownConc_M: cAcid, aliquot_cm3: 25, titrantCoeff: acidCoeff, analyteCoeff: alkaliCoeff });
          return acidBase({ titrant: { id: acid, conc_M: cAcid, known: true }, analyte: { id: alkali, conc_M: cAlk, known: false },
            unknown: 'analyte', coeff: { titrant: acidCoeff, analyte: alkaliCoeff }, eq: eq, indicator: null, chooseIndicator: true, chooseAliquot: true });
        }
        // Unknown acid in the burette; known alkali in the flask.
        var cA = unknownFor(rng, { unknown: 'titrant', knownConc_M: 0.100, aliquot_cm3: 25, titrantCoeff: acidCoeff, analyteCoeff: alkaliCoeff });
        return acidBase({ titrant: { id: acid, conc_M: cA, known: false }, analyte: { id: alkali, conc_M: 0.100, known: true },
          unknown: 'titrant', coeff: { titrant: acidCoeff, analyte: alkaliCoeff }, eq: eq, indicator: null, chooseIndicator: true, chooseAliquot: true });
      } },

    /* ---------------- A-level acid–base ---------------- */
    { id: 'alevel-rp1', num: 4, pathway: 'alevel-ab', level: 'A-level', mode: 'independent',
      title: 'Required practical 1: standard solution',
      blurb: 'Weigh anhydrous sodium carbonate, make it up to 250.0 cm³ in a volumetric flask, then use it to find the concentration of hydrochloric acid.',
      spec: ['AQA A-level Chemistry 3.1.2.5', 'Required practical 1'],
      prereq: 'Moles, mass and concentration (3.1.2). Separate from the GCSE practical.',
      prep: true,
      make: function (rng) {
        // HCl about 0.2 mol dm⁻³, so 25.00 cm³ of ~0.100 mol dm⁻³ Na₂CO₃ needs ~25 cm³.
        var cHCl = E.sigFig(rng.between(0.170, 0.230), 3);
        return acidBase({
          titrant: { id: 'HCl', conc_M: cHCl, known: false },
          analyte: { id: 'Na2CO3', conc_M: null, known: true, fromPrep: true },
          unknown: 'titrant', coeff: { titrant: 2, analyte: 1 }, eq: EQ.Na2CO3_HCl,
          indicator: null, indicatorOptions: ALEVEL_INDICATORS, chooseIndicator: true, chooseAliquot: false,
          standard: { id: 'Na2CO3', name: 'anhydrous sodium carbonate', formula: 'Na<sub>2</sub>CO<sub>3</sub>', Mr: E.relativeFormulaMass('Na2CO3'),
            target_M: 0.100, flask_cm3: 250.0, flaskTol_cm3: 0.30 }
        });
      } },

    { id: 'alevel-curves', num: 5, pathway: 'alevel-ab', level: 'A-level', mode: 'independent',
      title: 'Weak acids, weak bases and indicators',
      blurb: 'Titrate ethanoic acid or ammonia, choose an indicator from its pH range, then compare its endpoint with the equivalence point on the pH curve.',
      spec: ['AQA A-level Chemistry 3.1.12.5', 'Required practical 9 (pH curves)'],
      prereq: 'pH of strong and weak acids (3.1.12.2–3.1.12.4).',
      samples: [
        { key: 'weak-acid', label: 'Ethanoic acid with sodium hydroxide (weak acid, strong base)' },
        { key: 'weak-base', label: 'Ammonia with hydrochloric acid (strong acid, weak base)' },
        { key: 'strong', label: 'Hydrochloric acid with sodium hydroxide (strong acid, strong base)' }
      ],
      make: function (rng, sample) {
        sample = sample || 'weak-acid';
        var c = E.sigFig(rng.between(0.078, 0.122), 3);
        if (sample === 'weak-base') return acidBase({
          titrant: { id: 'HCl', conc_M: 0.100, known: true }, analyte: { id: 'NH3', conc_M: c, known: false },
          unknown: 'analyte', coeff: { titrant: 1, analyte: 1 }, eq: EQ.NH3_HCl, sample: sample,
          indicator: null, indicatorOptions: ALEVEL_INDICATORS, chooseIndicator: true, chooseAliquot: true, curve: true });
        if (sample === 'strong') return acidBase({
          titrant: { id: 'NaOH', conc_M: 0.100, known: true }, analyte: { id: 'HCl', conc_M: c, known: false },
          unknown: 'analyte', coeff: { titrant: 1, analyte: 1 }, eq: EQ.HCl_NaOH, sample: sample,
          indicator: null, indicatorOptions: ALEVEL_INDICATORS, chooseIndicator: true, chooseAliquot: true, curve: true });
        return acidBase({
          titrant: { id: 'NaOH', conc_M: 0.100, known: true }, analyte: { id: 'CH3COOH', conc_M: c, known: false },
          unknown: 'analyte', coeff: { titrant: 1, analyte: 1 }, eq: EQ.CH3COOH_NaOH, sample: sample,
          indicator: null, indicatorOptions: ALEVEL_INDICATORS, chooseIndicator: true, chooseAliquot: true, curve: true });
      } },

    /* ---------------- A-level redox ---------------- */
    { id: 'alevel-fe', num: 6, pathway: 'alevel-redox', level: 'A-level', mode: 'independent',
      title: 'Iron(II) with manganate(VII)',
      blurb: 'Acidify an iron(II) solution, titrate with potassium manganate(VII) to the first permanent pale pink, and use the 1 : 5 ratio.',
      spec: ['AQA A-level Chemistry 3.2.5.5'],
      prereq: 'Redox half-equations (3.1.7) and oxidation states.',
      make: function (rng) {
        var c = unknownFor(rng, { unknown: 'analyte', knownConc_M: 0.0200, aliquot_cm3: 25, titrantCoeff: 1, analyteCoeff: 5 });
        return redox({ analyte: 'Fe2', cAnalyte: c, cMn: 0.0200, known: false });
      } },

    { id: 'alevel-oxalate', num: 7, pathway: 'alevel-redox', level: 'A-level', mode: 'independent',
      title: 'Ethanedioate with manganate(VII)',
      blurb: 'Warm the acidified ethanedioate, watch the reaction start slowly then speed up as Mn²⁺ catalyses it, and use the 2 : 5 ratio.',
      spec: ['AQA A-level Chemistry 3.2.5.5', '3.2.5.6 autocatalysis'],
      prereq: 'Experiment 6.',
      make: function (rng) {
        var c = unknownFor(rng, { unknown: 'analyte', knownConc_M: 0.0200, aliquot_cm3: 25, titrantCoeff: 2, analyteCoeff: 5 });
        return redox({ analyte: 'C2O4', cAnalyte: c, cMn: 0.0200, known: false });
      } },

    { id: 'alevel-mystery-redox', num: 8, pathway: 'alevel-redox', level: 'A-level', mode: 'mystery',
      title: 'Mystery redox challenge',
      blurb: 'An unknown iron(II) or ethanedioate solution and a new manganate(VII) concentration. Choose the equation, find the ratio, get the concentration.',
      spec: ['AQA A-level Chemistry 3.2.5.5'],
      prereq: 'Experiments 6 and 7.',
      mystery: true,
      make: function (rng) {
        var analyte = rng.pick(['Fe2', 'C2O4']), cMn = rng.pick([0.0200, 0.0150, 0.0100, 0.0250]);
        var a = analyte === 'Fe2' ? 1 : 2, b = 5;
        var c = unknownFor(rng, { unknown: 'analyte', knownConc_M: cMn, aliquot_cm3: 25, titrantCoeff: a, analyteCoeff: b });
        return redox({ analyte: analyte, cAnalyte: c, cMn: cMn, known: false });
      } }
  ];

  function redox(o) {
    var fe = o.analyte === 'Fe2';
    return {
      type: 'redox',
      titrant: { id: 'KMnO4', conc_M: o.cMn, known: true },
      analyte: { id: o.analyte, conc_M: o.cAnalyte, known: o.known },
      unknown: 'analyte', coeff: { titrant: fe ? 1 : 2, analyte: 5 }, eq: fe ? EQ.Fe : EQ.C2O4,
      // Iron(II) stock is made up in a little dilute sulfuric acid to slow its
      // oxidation by air; it is nowhere near enough for the titration.
      stockAcid_M: fe ? 0.020 : 0,
      acidOptions: REDOX_ACIDS, warm: !fe,
      indicator: null, chooseIndicator: false, chooseAliquot: true
    };
  }

  // Equations offered when an A-level student picks the one to use: the right
  // one, the other analyte's, and two plausible wrong balances.
  var EQUATION_CHOICES = {
    Fe2: [
      { html: EQ.Fe.ionic, ratio: 5, right: true },
      { html: 'MnO<sub>4</sub><sup>−</sup> + 4H<sup>+</sup> + 3Fe<sup>2+</sup> → MnO<sub>2</sub> + 2H<sub>2</sub>O + 3Fe<sup>3+</sup>', ratio: 3, why: 'This is the reaction when there isn’t enough acid: brown MnO₂ forms. In the titration the flask is acidified so Mn²⁺ forms.' },
      { html: 'MnO<sub>4</sub><sup>−</sup> + 8H<sup>+</sup> + Fe<sup>2+</sup> → Mn<sup>2+</sup> + 4H<sub>2</sub>O + Fe<sup>3+</sup>', ratio: 1, why: 'Not balanced for charge: MnO₄⁻ gains five electrons and each Fe²⁺ loses only one.' },
      { html: EQ.C2O4.ionic, ratio: 2.5, why: 'That equation is for ethanedioate, not iron(II).' }
    ],
    C2O4: [
      { html: EQ.C2O4.ionic, ratio: 2.5, right: true },
      { html: 'MnO<sub>4</sub><sup>−</sup> + 8H<sup>+</sup> + C<sub>2</sub>O<sub>4</sub><sup>2−</sup> → Mn<sup>2+</sup> + 4H<sub>2</sub>O + 2CO<sub>2</sub>', ratio: 1, why: 'Not balanced for electrons: MnO₄⁻ gains five, each C₂O₄²⁻ loses two, so the ratio is 2 : 5.' },
      { html: '5MnO<sub>4</sub><sup>−</sup> + 16H<sup>+</sup> + 2C<sub>2</sub>O<sub>4</sub><sup>2−</sup> → …', ratio: 0.4, why: 'The ratio is the wrong way round: it is two MnO₄⁻ to five C₂O₄²⁻.' },
      { html: EQ.Fe.ionic, ratio: 5, why: 'That equation is for iron(II), not ethanedioate.' }
    ]
  };

  // Display names and labels used on the bench and in the brief.
  var LABELS = {
    HCl: { name: 'hydrochloric acid', formula: 'HCl' },
    HNO3: { name: 'nitric acid', formula: 'HNO<sub>3</sub>' },
    H2SO4: { name: 'sulfuric acid', formula: 'H<sub>2</sub>SO<sub>4</sub>' },
    NaOH: { name: 'sodium hydroxide', formula: 'NaOH' },
    KOH: { name: 'potassium hydroxide', formula: 'KOH' },
    CH3COOH: { name: 'ethanoic acid', formula: 'CH<sub>3</sub>COOH' },
    NH3: { name: 'ammonia', formula: 'NH<sub>3</sub>' },
    Na2CO3: { name: 'sodium carbonate', formula: 'Na<sub>2</sub>CO<sub>3</sub>' },
    KMnO4: { name: 'potassium manganate(VII)', formula: 'KMnO<sub>4</sub>' },
    Fe2: { name: 'iron(II) sulfate', formula: 'Fe<sup>2+</sup>' },
    C2O4: { name: 'sodium ethanedioate', formula: 'C<sub>2</sub>O<sub>4</sub><sup>2−</sup>' }
  };

  function byId(id) { for (var i = 0; i < LIST.length; i++) if (LIST[i].id === id) return LIST[i]; return null; }

  /* One run of an experiment. Fills in the fields every run carries. */
  function instantiate(id, seed, sample) {
    var def = byId(id);
    if (!def) throw new RangeError('No experiment ' + id);
    var r = E.rng(seed);
    var run = def.make(r, sample);
    run.def = def; run.id = def.id; run.seed = seed; run.level = def.level; run.mode = def.mode;
    run.mystery = !!def.mystery; run.prep = !!def.prep;
    run.gcse = def.level === 'GCSE';
    run.units = run.gcse ? 'mol/dm³' : 'mol dm⁻³';
    run.concordanceTol_cm3 = 0.10;
    run.tolerancePct = run.gcse ? 2.0 : 1.5;
    run.aliquot = 'pipette25';
    run.aliquotOptions = ['pipette25', 'cylinder25'];
    run.indicatorOptions = run.indicatorOptions || [];
    // The known solution's concentration and the true value of the unknown.
    run.unknownSolution = run.unknown === 'analyte' ? run.analyte : run.titrant;
    run.knownSolution = run.unknown === 'analyte' ? run.titrant : run.analyte;
    run.Mr = {};
    [run.titrant.id, run.analyte.id].forEach(function (cid) { try { run.Mr[cid] = E.relativeFormulaMass(cid, run.level); } catch (e) { /* ions */ } });
    return run;
  }

  // Theoretical titre for a run, from the stoichiometry alone.
  function expectedTitre(run, analyteConc_M, aliquot_cm3) {
    return E.equivalenceVolume({ titrantConc_M: run.titrant.conc_M, analyteConc_M: analyteConc_M === undefined ? run.analyte.conc_M : analyteConc_M,
      aliquot_cm3: aliquot_cm3 || 25, titrantCoeff: run.coeff.titrant, analyteCoeff: run.coeff.analyte });
  }

  root.TitrationExperiments = {
    LIST: LIST, byId: byId, instantiate: instantiate, expectedTitre: expectedTitre,
    EQ: EQ, HALF: HALF, ACIDIFIERS: ACIDIFIERS, EQUATION_CHOICES: EQUATION_CHOICES, LABELS: LABELS,
    GCSE_INDICATORS: GCSE_INDICATORS, ALEVEL_INDICATORS: ALEVEL_INDICATORS, unknownFor: unknownFor
  };
})(typeof self !== 'undefined' ? self : this);
