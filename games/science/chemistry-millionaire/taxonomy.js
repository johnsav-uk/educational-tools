/* Savage Science Tools — Who Wants to Be an A-Level Chemistry Millionaire?
   Topic taxonomy for AQA AS and A-level Chemistry (7404 / 7405), in specification order.
   Three branches stand in for the science game's three subjects, so the shared selection engine
   balances Physical, Inorganic and Organic the way it balances Biology, Chemistry and Physics:
   unit ids start with P (3.1 Physical), I (3.2 Inorganic) or O (3.3 Organic).
   sepOnly marks A-level-only content (not in AS 7404). The shared select.js leaves sepOnly content out
   when it is passed course 'combined', so ui.js passes 'combined' for an AS game. */
(function (root) {
  'use strict';
  var SSM = root.SSM = root.SSM || {};
  function U(id, n, name, short, a) { return { id: id, subj: id.charAt(0), n: n, name: name, short: short, sepOnly: !!a }; }
  var units = {}, subs = {};
  [
    U('P1', 1, 'Atomic structure', 'Atomic structure'),
    U('P2', 2, 'Amount of substance', 'Amount of substance'),
    U('P3', 3, 'Bonding', 'Bonding'),
    U('P4', 4, 'Energetics', 'Energetics'),
    U('P5', 5, 'Kinetics', 'Kinetics'),
    U('P6', 6, 'Chemical equilibria, Le Chatelier’s principle and K_c', 'Equilibria and K_c'),
    U('P7', 7, 'Oxidation, reduction and redox equations', 'Redox'),
    U('P8', 8, 'Thermodynamics', 'Thermodynamics', 1),
    U('P9', 9, 'Rate equations', 'Rate equations', 1),
    U('P10', 10, 'Equilibrium constant K_p for homogeneous systems', 'K_p', 1),
    U('P11', 11, 'Electrode potentials and electrochemical cells', 'Electrode potentials', 1),
    U('P12', 12, 'Acids and bases', 'Acids and bases', 1),
    U('I1', 1, 'Periodicity', 'Periodicity'),
    U('I2', 2, 'Group 2, the alkaline earth metals', 'Group 2'),
    U('I3', 3, 'Group 7 (17), the halogens', 'Group 7'),
    U('I4', 4, 'Properties of Period 3 elements and their oxides', 'Period 3', 1),
    U('I5', 5, 'Transition metals', 'Transition metals', 1),
    U('I6', 6, 'Reactions of ions in aqueous solution', 'Ions in solution', 1),
    U('O1', 1, 'Introduction to organic chemistry', 'Intro to organic'),
    U('O2', 2, 'Alkanes', 'Alkanes'),
    U('O3', 3, 'Halogenoalkanes', 'Halogenoalkanes'),
    U('O4', 4, 'Alkenes', 'Alkenes'),
    U('O5', 5, 'Alcohols', 'Alcohols'),
    U('O6', 6, 'Organic analysis', 'Organic analysis'),
    U('O7', 7, 'Optical isomerism', 'Optical isomerism', 1),
    U('O8', 8, 'Aldehydes and ketones', 'Aldehydes and ketones', 1),
    U('O9', 9, 'Carboxylic acids and derivatives', 'Carboxylic acids', 1),
    U('O10', 10, 'Aromatic chemistry', 'Aromatic chemistry', 1),
    U('O11', 11, 'Amines', 'Amines', 1),
    U('O12', 12, 'Polymers', 'Polymers', 1),
    U('O13', 13, 'Amino acids, proteins and DNA', 'Amino acids and DNA', 1),
    U('O14', 14, 'Organic synthesis', 'Organic synthesis', 1),
    U('O15', 15, 'Nuclear magnetic resonance spectroscopy', 'NMR', 1),
    U('O16', 16, 'Chromatography', 'Chromatography', 1)
  ].forEach(function (u) { units[u.id] = u; });

  /* subtopics: [unit, short id, label] */
  [
    ['P1', 'a1', 'Fundamental particles, isotopes and mass spectrometry'],
    ['P1', 'a2', 'Electron configuration and ionisation energies'],
    ['P2', 'm1', 'Relative mass, the mole and the ideal gas equation'],
    ['P2', 'm2', 'Empirical formulae, equations, yield and atom economy'],
    ['P2', 'm3', 'Solutions and titration calculations'],
    ['P3', 'b1', 'Ionic, covalent, dative and metallic bonding'],
    ['P3', 'b2', 'Shapes of molecules and ions'],
    ['P3', 'b3', 'Electronegativity and intermolecular forces'],
    ['P4', 'e1', 'Enthalpy change and calorimetry'],
    ['P4', 'e2', 'Hess’s law and mean bond enthalpies'],
    ['P5', 'k1', 'Collision theory, Maxwell–Boltzmann and catalysts'],
    ['P6', 'q1', 'Le Chatelier’s principle and industrial conditions'],
    ['P6', 'q2', 'The equilibrium constant K_c'],
    ['P7', 'r1', 'Oxidation states and half-equations'],
    ['P8', 't1', 'Born–Haber cycles and enthalpies of solution'],
    ['P8', 't2', 'Entropy and Gibbs free energy'],
    ['P9', 'n1', 'Orders, rate equations and the rate constant'],
    ['P9', 'n2', 'Determining orders and rate-determining steps'],
    ['P10', 'p1', 'Partial pressures and K_p'],
    ['P11', 'c1', 'Electrode potentials and cell e.m.f.'],
    ['P11', 'c2', 'Commercial cells and fuel cells'],
    ['P12', 'h1', 'Brønsted–Lowry acids, pH and K_w'],
    ['P12', 'h2', 'Weak acids, K_a and titration curves'],
    ['P12', 'h3', 'Buffer solutions'],
    ['I1', 'y1', 'Classification and trends across Period 3'],
    ['I2', 'g1', 'Trends and reactions of Group 2'],
    ['I2', 'g2', 'Uses of Group 2 compounds and sulfate tests'],
    ['I3', 'x1', 'Trends in the halogens and displacement'],
    ['I3', 'x2', 'Halide ions, silver nitrate tests and chlorine in water'],
    ['I4', 'd1', 'Period 3 elements and their oxides'],
    ['I5', 'z1', 'General properties, ligands and complex shapes'],
    ['I5', 'z2', 'Colour, substitution and variable oxidation states'],
    ['I5', 'z3', 'Catalysts and redox titrations'],
    ['I6', 'w1', 'Metal–aqua ions, acidity and precipitates'],
    ['O1', 'f1', 'Formulae, nomenclature and functional groups'],
    ['O1', 'f2', 'Reaction mechanisms and isomerism'],
    ['O2', 'l1', 'Crude oil, cracking and combustion'],
    ['O2', 'l2', 'Free-radical substitution'],
    ['O3', 's1', 'Nucleophilic substitution and elimination'],
    ['O3', 's2', 'Ozone depletion'],
    ['O4', 'v1', 'Electrophilic addition'],
    ['O4', 'v2', 'Addition polymers'],
    ['O5', 'o1', 'Alcohol production, classification and oxidation'],
    ['O5', 'o2', 'Elimination and tests'],
    ['O6', 'i1', 'Identifying functional groups and mass spectrometry'],
    ['O6', 'i2', 'Infrared spectroscopy'],
    ['O7', 'j1', 'Chirality and enantiomers'],
    ['O8', 'k1', 'Tests, reduction and nucleophilic addition'],
    ['O9', 'c1', 'Carboxylic acids and esters'],
    ['O9', 'c2', 'Acylation and acyl chlorides'],
    ['O10', 'r1', 'Benzene and electrophilic substitution'],
    ['O11', 'n1', 'Preparation, basicity and reactions of amines'],
    ['O12', 'p1', 'Condensation polymers and biodegradability'],
    ['O13', 'a1', 'Amino acids and proteins'],
    ['O13', 'a2', 'DNA and cisplatin'],
    ['O14', 'y1', 'Synthetic routes and reagents'],
    ['O15', 'h1', '^{13}C and ^{1}H NMR'],
    ['O16', 'g1', 'TLC, column and gas chromatography']
  ].forEach(function (r) { var id = r[0] + ':' + r[1]; subs[id] = { id: id, unit: r[0], label: r[2] }; });

  SSM.TAX = {
    subjects: [
      { id: 'P', name: 'Physical', units: ['P1', 'P2', 'P3', 'P4', 'P5', 'P6', 'P7', 'P8', 'P9', 'P10', 'P11', 'P12'] },
      { id: 'I', name: 'Inorganic', units: ['I1', 'I2', 'I3', 'I4', 'I5', 'I6'] },
      { id: 'O', name: 'Organic', units: ['O1', 'O2', 'O3', 'O4', 'O5', 'O6', 'O7', 'O8', 'O9', 'O10', 'O11', 'O12', 'O13', 'O14', 'O15', 'O16'] }
    ],
    units: units,
    subs: subs,
    courses: {
      as: { name: 'AS', code: '7404' },
      alevel: { name: 'A-level', code: '7405' }
    }
  };
  var SECTION = { P: 1, I: 2, O: 3 };
  /* "AQA 7405 · 3.1.9" (A-level game) or "AQA 7404 · 3.3.2" (AS game). The selection engine passes
     'combined' for an AS game (see the note at the top). */
  SSM.specRef = function (unitId, board, course) {
    var u = SSM.TAX.units[unitId];
    var as = course === 'combined' || course === 'as';
    return 'AQA ' + (as ? '7404' : '7405') + ' · 3.' + SECTION[u.subj] + '.' + u.n;
  };
})(typeof window !== 'undefined' ? window : globalThis);
/* Phone a Friend: A-level friends (lifelines.js picks one when SSM.PERSONAS is set) */
(function (root) {
  root.SSM.PERSONAS = [
    { name: 'Priya', role: 'a Year 13 who is applying for chemistry at university' },
    { name: 'Marcus', role: 'your cousin, a second-year chemistry undergraduate' },
    { name: 'Ms Okafor', role: 'a retired chemistry technician' },
    { name: 'Dr Lindqvist', role: 'a neighbour who runs an analytical lab' },
    { name: 'Tom', role: 'a friend who came top in the Chemistry Olympiad round' }
  ];
})(typeof window !== 'undefined' ? window : globalThis);
