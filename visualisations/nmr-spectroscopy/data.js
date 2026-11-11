/* NMR Spectroscopy: the chemistry data. Edit this file to change content; no code lives here.

   SHIFT_H and SHIFT_C are the chemical-shift ranges as printed in the AQA A-level Chemistry data sheet
   (Table B for 1H, Table C for 13C). They were entered from the data sheet as the author knew it, NOT
   copied from the current PDF: check them against your copy before relying on them in class.

   Every molecule below lists its real proton and carbon-13 environments. Shifts are typical literature
   values for a CDCl3 solution, nudged inside the AQA range where the two differ slightly.
     H env:  id, d (shift, ppm), n (number of H), nb (H on ADJACENT carbons, which sets the n+1 pattern),
             ex (exchanging O-H: always a broad singlet), J (Hz, default 7), p (the coupled partner, for roofing),
             lines (custom multiplet: [[dppm, weight], ...]) for aromatic H.
     C env:  id, d (shift, ppm), n (carbons in that environment), q (1 = no H attached: weaker line).        */
(function () {
  'use strict';
  var NMR = window.NMR = window.NMR || {};

  NMR.SPEC_REF = '3.3.15';

  /* ───────── AQA data-sheet shift ranges ───────── */
  NMR.SHIFT_H = [
    { g: 'R–CH₃',                    lo: 0.7,  hi: 1.2,  ex: 'CH₃ on a carbon chain' },
    { g: 'R–CH₂–R',                  lo: 1.2,  hi: 1.4,  ex: 'CH₂ in a chain' },
    { g: 'R₃CH',                     lo: 1.4,  hi: 1.6,  ex: 'CH with three carbon neighbours' },
    { g: 'R–CO–CH₃, R–CO–CH₂–R',     lo: 2.1,  hi: 2.6,  ex: 'H on the carbon next to C=O' },
    { g: 'R–O–CH₃, R–O–CH₂–R',       lo: 3.1,  hi: 3.9,  ex: 'H on the carbon bonded to an ether or alcohol O' },
    { g: 'R–CH₂–Hal',                lo: 3.1,  hi: 4.2,  ex: 'H on the carbon bonded to Cl, Br or I' },
    { g: 'R–COO–CH₃, R–COO–CH₂–R',   lo: 3.7,  hi: 4.1,  ex: 'H on the carbon bonded to the ester O' },
    { g: 'R–OH',                     lo: 0.5,  hi: 5.0,  ex: 'alcohol O–H (position varies)' },
    { g: 'R–CH=CH₂',                 lo: 4.5,  hi: 6.0,  ex: 'H on an alkene carbon' },
    { g: 'Ar–H',                     lo: 6.0,  hi: 9.0,  ex: 'H on a benzene ring' },
    { g: 'R–CHO',                    lo: 9.0,  hi: 10.0, ex: 'aldehyde H' },
    { g: 'R–COOH',                   lo: 10.0, hi: 12.0, ex: 'carboxylic acid O–H' }
  ];
  NMR.SHIFT_C = [
    { g: 'C–C',                      lo: 5,   hi: 40,  ex: 'alkyl carbon' },
    { g: 'R–C–Cl, R–C–Br',          lo: 10,  hi: 70,  ex: 'carbon bonded to a halogen' },
    { g: 'R–C–N',                    lo: 25,  hi: 60,  ex: 'carbon bonded to nitrogen' },
    { g: 'R–C–O',                    lo: 50,  hi: 90,  ex: 'carbon bonded to oxygen (alcohol, ether, ester)' },
    { g: 'C=C',                      lo: 90,  hi: 150, ex: 'alkene carbon' },
    { g: 'Aromatic C',               lo: 110, hi: 160, ex: 'carbon in a benzene ring' },
    { g: 'R–COO–, R–COOH',           lo: 160, hi: 185, ex: 'ester or acid C=O' },
    { g: 'Aldehyde / ketone C=O',    lo: 190, hi: 220, ex: 'C=O of an aldehyde or ketone' }
  ];

  /* ───────── Molecules ───────── */
  function g(t, h, c) { return { t: t, h: h || null, c: c || null }; }
  var CH3 = 'CH<sub>3</sub>', CH2 = 'CH<sub>2</sub>';

  NMR.MOLS = [
    { id: 'ethanol', name: 'Ethanol', formula: 'C<sub>2</sub>H<sub>6</sub>O', mf: 'C2H6O',
      groups: [g(CH3, 'a', '1'), g(CH2, 'b', '2'), g('OH', 'c')],
      H: [{ id: 'a', d: 1.22, n: 3, nb: 2, p: 'b', lab: 'CH₃' }, { id: 'b', d: 3.69, n: 2, nb: 3, p: 'a', lab: 'CH₂' }, { id: 'c', d: 2.6, n: 1, nb: 0, ex: true, lab: 'OH' }],
      C: [{ id: '1', d: 18.3, n: 1, lab: 'CH₃' }, { id: '2', d: 58.3, n: 1, lab: 'CH₂' }] },

    { id: 'propanone', name: 'Propanone', formula: 'C<sub>3</sub>H<sub>6</sub>O', mf: 'C3H6O',
      groups: [g(CH3, 'a', '1'), g('C(=O)', null, '2'), g(CH3, 'a', '1')],
      H: [{ id: 'a', d: 2.17, n: 6, nb: 0, lab: 'both CH₃' }],
      C: [{ id: '1', d: 30.8, n: 2, lab: 'CH₃' }, { id: '2', d: 206.7, n: 1, q: 1, lab: 'C=O' }] },

    { id: 'butanone', name: 'Butanone', formula: 'C<sub>4</sub>H<sub>8</sub>O', mf: 'C4H8O',
      groups: [g(CH3, 'a', '1'), g(CH2, 'c', '2'), g('C(=O)', null, '4'), g(CH3, 'b', '3')],
      H: [{ id: 'a', d: 1.06, n: 3, nb: 2, p: 'c', lab: 'CH₃ (ethyl)' }, { id: 'b', d: 2.14, n: 3, nb: 0, lab: 'CH₃C=O' }, { id: 'c', d: 2.46, n: 2, nb: 3, p: 'a', lab: 'CH₂' }],
      C: [{ id: '1', d: 7.4, n: 1, lab: 'CH₃ (ethyl)' }, { id: '2', d: 36.8, n: 1, lab: 'CH₂' }, { id: '3', d: 29.4, n: 1, lab: 'CH₃C=O' }, { id: '4', d: 209.3, n: 1, q: 1, lab: 'C=O' }] },

    { id: 'pentan-3-one', name: 'Pentan-3-one', formula: 'C<sub>5</sub>H<sub>10</sub>O', mf: 'C5H10O',
      groups: [g(CH3, 'a', '1'), g(CH2, 'b', '2'), g('C(=O)', null, '3'), g(CH2, 'b', '2'), g(CH3, 'a', '1')],
      H: [{ id: 'a', d: 1.05, n: 6, nb: 2, p: 'b', lab: 'both CH₃' }, { id: 'b', d: 2.43, n: 4, nb: 3, p: 'a', lab: 'both CH₂' }],
      C: [{ id: '1', d: 7.8, n: 2, lab: 'CH₃' }, { id: '2', d: 35.5, n: 2, lab: 'CH₂' }, { id: '3', d: 211.9, n: 1, q: 1, lab: 'C=O' }] },

    { id: 'ethyl-ethanoate', name: 'Ethyl ethanoate', formula: 'C<sub>4</sub>H<sub>8</sub>O<sub>2</sub>', mf: 'C4H8O2',
      groups: [g(CH3, 'a', '1'), g('C(=O)O', null, '2'), g(CH2, 'b', '3'), g(CH3, 'c', '4')],
      H: [{ id: 'a', d: 2.10, n: 3, nb: 0, lab: 'CH₃C=O' }, { id: 'b', d: 4.10, n: 2, nb: 3, p: 'c', lab: 'OCH₂' }, { id: 'c', d: 1.25, n: 3, nb: 2, p: 'b', lab: 'CH₃ (ethyl)' }],
      C: [{ id: '1', d: 21.0, n: 1, lab: 'CH₃C=O' }, { id: '2', d: 171.1, n: 1, q: 1, lab: 'C=O' }, { id: '3', d: 60.4, n: 1, lab: 'OCH₂' }, { id: '4', d: 14.2, n: 1, lab: 'CH₃ (ethyl)' }] },

    { id: 'methyl-propanoate', name: 'Methyl propanoate', formula: 'C<sub>4</sub>H<sub>8</sub>O<sub>2</sub>', mf: 'C4H8O2',
      groups: [g(CH3, 'a', '1'), g(CH2, 'b', '2'), g('C(=O)O', null, '3'), g(CH3, 'c', '4')],
      H: [{ id: 'a', d: 1.14, n: 3, nb: 2, p: 'b', lab: 'CH₃ (ethyl)' }, { id: 'b', d: 2.32, n: 2, nb: 3, p: 'a', lab: 'CH₂C=O' }, { id: 'c', d: 3.70, n: 3, nb: 0, lab: 'OCH₃' }],
      C: [{ id: '1', d: 9.1, n: 1, lab: 'CH₃ (ethyl)' }, { id: '2', d: 27.4, n: 1, lab: 'CH₂' }, { id: '3', d: 174.9, n: 1, q: 1, lab: 'C=O' }, { id: '4', d: 51.5, n: 1, lab: 'OCH₃' }] },

    { id: 'propanoic-acid', name: 'Propanoic acid', formula: 'C<sub>3</sub>H<sub>6</sub>O<sub>2</sub>', mf: 'C3H6O2',
      groups: [g(CH3, 'a', '1'), g(CH2, 'b', '2'), g('COOH', 'c', '3')],
      H: [{ id: 'a', d: 1.17, n: 3, nb: 2, p: 'b', lab: 'CH₃' }, { id: 'b', d: 2.38, n: 2, nb: 3, p: 'a', lab: 'CH₂' }, { id: 'c', d: 11.5, n: 1, nb: 0, ex: true, lab: 'COOH' }],
      C: [{ id: '1', d: 9.0, n: 1, lab: 'CH₃' }, { id: '2', d: 27.6, n: 1, lab: 'CH₂' }, { id: '3', d: 180.6, n: 1, q: 1, lab: 'COOH' }] },

    { id: 'ethanoic-acid', name: 'Ethanoic acid', formula: 'C<sub>2</sub>H<sub>4</sub>O<sub>2</sub>', mf: 'C2H4O2',
      groups: [g(CH3, 'a', '1'), g('COOH', 'b', '2')],
      H: [{ id: 'a', d: 2.10, n: 3, nb: 0, lab: 'CH₃' }, { id: 'b', d: 11.5, n: 1, nb: 0, ex: true, lab: 'COOH' }],
      C: [{ id: '1', d: 20.8, n: 1, lab: 'CH₃' }, { id: '2', d: 178.1, n: 1, q: 1, lab: 'COOH' }] },

    { id: 'methyl-ethanoate', name: 'Methyl ethanoate', formula: 'C<sub>3</sub>H<sub>6</sub>O<sub>2</sub>', mf: 'C3H6O2',
      groups: [g(CH3, 'a', '1'), g('C(=O)O', null, '2'), g(CH3, 'b', '3')],
      H: [{ id: 'a', d: 2.10, n: 3, nb: 0, lab: 'CH₃C=O' }, { id: 'b', d: 3.70, n: 3, nb: 0, lab: 'OCH₃' }],
      C: [{ id: '1', d: 20.6, n: 1, lab: 'CH₃C=O' }, { id: '2', d: 171.5, n: 1, q: 1, lab: 'C=O' }, { id: '3', d: 51.5, n: 1, lab: 'OCH₃' }] },

    { id: 'ethanal', name: 'Ethanal', formula: 'C<sub>2</sub>H<sub>4</sub>O', mf: 'C2H4O',
      groups: [g(CH3, 'a', '1'), g('CHO', 'b', '2')],
      H: [{ id: 'a', d: 2.20, n: 3, nb: 1, J: 2.9, lab: 'CH₃' }, { id: 'b', d: 9.80, n: 1, nb: 3, J: 2.9, lab: 'CHO' }],
      C: [{ id: '1', d: 31.2, n: 1, lab: 'CH₃' }, { id: '2', d: 200.5, n: 1, q: 1, lab: 'CHO' }] },

    { id: 'diethyl-ether', name: 'Ethoxyethane', formula: 'C<sub>4</sub>H<sub>10</sub>O', mf: 'C4H10O',
      groups: [g(CH3, 'a', '1'), g(CH2, 'b', '2'), g('O'), g(CH2, 'b', '2'), g(CH3, 'a', '1')],
      H: [{ id: 'a', d: 1.21, n: 6, nb: 2, p: 'b', lab: 'both CH₃' }, { id: 'b', d: 3.48, n: 4, nb: 3, p: 'a', lab: 'both CH₂' }],
      C: [{ id: '1', d: 15.4, n: 2, lab: 'CH₃' }, { id: '2', d: 65.9, n: 2, lab: 'CH₂' }] },

    { id: 'tbutanol', name: '2-methylpropan-2-ol', formula: 'C<sub>4</sub>H<sub>10</sub>O', mf: 'C4H10O',
      groups: [g('(' + CH3 + ')<sub>3</sub>', 'a', '1'), g('C', null, '2'), g('OH', 'b')],
      H: [{ id: 'a', d: 1.28, n: 9, nb: 0, lab: 'three CH₃' }, { id: 'b', d: 1.9, n: 1, nb: 0, ex: true, lab: 'OH' }],
      C: [{ id: '1', d: 31.2, n: 3, lab: 'CH₃' }, { id: '2', d: 69.0, n: 1, q: 1, lab: 'C–OH' }] },

    { id: 'toluene', name: 'Methylbenzene', formula: 'C<sub>7</sub>H<sub>8</sub>', mf: 'C7H8', ring: 'toluene',
      H: [{ id: 'a', d: 2.34, n: 3, nb: 0, lab: 'CH₃' },
          { id: 'b', d: 7.2, n: 5, nb: 0, lab: 'ring H', lines: [[7.30, 1.0], [7.27, 1.3], [7.20, 1.6], [7.17, 1.2], [7.15, 0.9]] }],
      C: [{ id: '1', d: 21.4, n: 1, lab: 'CH₃' }, { id: '2', d: 137.9, n: 1, q: 1, lab: 'ring C–CH₃' }, { id: '3', d: 129.0, n: 2, lab: 'ortho' }, { id: '4', d: 128.2, n: 2, lab: 'meta' }, { id: '5', d: 125.3, n: 1, lab: 'para' }] },

    { id: 'benzene', name: 'Benzene', formula: 'C<sub>6</sub>H<sub>6</sub>', mf: 'C6H6', ring: 'benzene',
      H: [{ id: 'a', d: 7.34, n: 6, nb: 0, lab: 'all six H' }],
      C: [{ id: '1', d: 128.4, n: 6, lab: 'all six C' }] },

    /* Beyond the AQA limit (more than a quartet): used only where flagged as extension. */
    { id: 'propan-2-ol', name: 'Propan-2-ol', formula: 'C<sub>3</sub>H<sub>8</sub>O', mf: 'C3H8O', ext: true,
      groups: [g(CH3, 'a', '1'), g('CH', 'b', '2'), g(CH3, 'a', '1'), g('OH', 'c')],
      H: [{ id: 'a', d: 1.22, n: 6, nb: 1, p: 'b', lab: 'both CH₃' }, { id: 'b', d: 4.00, n: 1, nb: 6, p: 'a', lab: 'CH' }, { id: 'c', d: 2.2, n: 1, nb: 0, ex: true, lab: 'OH' }],
      C: [{ id: '1', d: 25.3, n: 2, lab: 'CH₃' }, { id: '2', d: 64.0, n: 1, lab: 'CH–OH' }] },

    { id: 'propan-1-ol', name: 'Propan-1-ol', formula: 'C<sub>3</sub>H<sub>8</sub>O', mf: 'C3H8O', ext: true,
      groups: [g(CH3, 'a', '1'), g(CH2, 'b', '2'), g(CH2, 'c', '3'), g('OH', 'd')],
      H: [{ id: 'a', d: 0.94, n: 3, nb: 2, p: 'b', lab: 'CH₃' }, { id: 'b', d: 1.59, n: 2, nb: 5, lab: 'middle CH₂' }, { id: 'c', d: 3.60, n: 2, nb: 2, p: 'b', lab: 'CH₂OH' }, { id: 'd', d: 2.3, n: 1, nb: 0, ex: true, lab: 'OH' }],
      C: [{ id: '1', d: 10.3, n: 1, lab: 'CH₃' }, { id: '2', d: 25.9, n: 1, lab: 'middle CH₂' }, { id: '3', d: 64.2, n: 1, lab: 'CH₂OH' }] }
  ];

  NMR.mol = function (id) { for (var i = 0; i < NMR.MOLS.length; i++) if (NMR.MOLS[i].id === id) return NMR.MOLS[i]; return null; };
  NMR.molsStd = function () { return NMR.MOLS.filter(function (m) { return !m.ext; }); };

  /* Nuclides for Section B: [symbol, name, protons, neutrons, note] */
  NMR.NUCLIDES = [
    { s: '¹H',  p: 1,  n: 0,  name: 'hydrogen-1',  use: 'The nucleus behind proton NMR. 99.98% of all hydrogen.' },
    { s: '²H',  p: 1,  n: 1,  name: 'deuterium',   use: 'Has spin, but absorbs at a very different frequency from ¹H, so it never appears in a proton spectrum.' },
    { s: '¹²C', p: 6,  n: 6,  name: 'carbon-12',   use: '98.9% of carbon, but invisible to NMR.' },
    { s: '¹³C', p: 6,  n: 7,  name: 'carbon-13',   use: 'The nucleus behind carbon-13 NMR. Only 1.1% of carbon.' },
    { s: '¹⁶O', p: 8,  n: 8,  name: 'oxygen-16',   use: 'Almost all oxygen is ¹⁶O: invisible, so O never shows directly.' },
    { s: '¹⁴N', p: 7,  n: 7,  name: 'nitrogen-14', use: 'Spin 1: broad signals, rarely used in school-level NMR.' },
    { s: '¹⁹F', p: 9,  n: 10, name: 'fluorine-19', use: 'Odd number of nucleons: NMR active (used in ¹⁹F NMR).' },
    { s: '³¹P', p: 15, n: 16, name: 'phosphorus-31', use: 'Odd number of nucleons: NMR active (used in ³¹P NMR).' },
    { s: '³⁵Cl', p: 17, n: 18, name: 'chlorine-35', use: 'Odd number of nucleons: has spin, but gives very broad signals so is not used for organic structure work.' },
    { s: '²⁸Si', p: 14, n: 14, name: 'silicon-28', use: 'Even number of protons and neutrons: no spin. (The Si in TMS is invisible.)' }
  ];

  /* ───────── Section A: the five stages ───────── */
  NMR.STAGES = [
    { id: 1, t: 'Nuclei are tiny magnets', pin: 'Spin',
      body: ['Some nuclei have <b>nuclear spin</b>. A spinning charged nucleus behaves like a tiny bar magnet, so each ¹H nucleus (a proton) has its own small magnetic field.',
             'With no external field, the tiny magnets in a sample point every which way. Nothing to measure.'],
      q: 'Switch the magnet off and on. What changes about the way the nuclei point?' },
    { id: 2, t: 'A strong field splits the energy', pin: 'Field',
      body: ['In a strong external magnetic field each ¹H or ¹³C nucleus can only line up in one of <b>two ways</b>: <b>with</b> the field (lower energy) or <b>against</b> it (higher energy).',
             'The two states differ in energy by <b>ΔE</b>. A stronger field makes the gap wider.',
             'Slightly more nuclei sit in the lower state. (In a real sample the excess is only a few in 100 000: the picture exaggerates it.)'],
      q: 'Increase the field strength. What happens to ΔE?' },
    { id: 3, t: 'Radio waves make the nuclei flip', pin: 'Radio',
      body: ['A nucleus can absorb radiofrequency radiation and flip from the lower to the higher state, but only if the photon energy matches the gap exactly: <b>hf = ΔE</b>. This is <b>resonance</b>.',
             'Use the frequency slider. Away from resonance nothing happens. At the right frequency, nuclei flip and absorb energy.',
             'Different environments need slightly different frequencies, so each group of nuclei flips at its own frequency.'],
      q: 'Find the frequency at which the CH₃ hydrogens flip, then the CH₂ hydrogens.' },
    { id: 4, t: 'The detector draws the spectrum', pin: 'Spectrum',
      body: ['The spectrometer records how much radio energy is absorbed at each frequency. Plot absorption against frequency and each group of nuclei appears as a peak.',
             'Frequencies depend on the magnet, so they are converted to a <b>chemical shift, δ</b>, in parts per million (ppm) from TMS. The ppm values are the same on every spectrometer.',
             '<b>Not the same thing:</b> the nuclei flipping is the physical process. The spectrum is the instrument\'s record of it.'],
      q: 'Press Sweep and watch the spectrum build as the frequency rises.' },
    { id: 5, t: 'Why environments differ', pin: 'Shielding',
      body: ['Electrons around a nucleus circulate in the magnetic field and produce a tiny opposing field. The nucleus feels slightly <b>less</b> than the full field: it is <b>shielded</b>.',
             'An electronegative atom (O, Cl) pulls electrons away from nearby hydrogens. They are <b>deshielded</b>: they feel more of the field, need a higher frequency to flip, and have a <b>larger δ</b>.',
             'So hydrogens in different environments absorb at different frequencies and give separate peaks.'],
      q: 'Which hydrogens are more deshielded, the CH₃ or the CH₂ next to oxygen? How can you tell?' }
  ];

  /* ───────── Worked examples (Section D) ─────────
     Each step reveals a line of reasoning and highlights the environments (ids) it is about. */
  NMR.WORKED = [
    { mol: 'ethyl-ethanoate', title: 'Worked example 1 · an ester, C₄H₈O₂',
      intro: 'A compound with formula C₄H₈O₂ gives this ¹H NMR spectrum. Deduce its structure.',
      steps: [
        { h: [], t: '<b>Count the signals.</b> There are <b>3</b> signals, so 3 different proton environments.' },
        { h: ['c'], t: '<b>δ ≈ 1.25.</b> In the R–CH₃ region (0.7–1.2, just above). Integration 3: a CH₃. A <b>triplet</b>: 2 H on the adjacent carbon, so CH₃–CH₂–.' },
        { h: ['a'], t: '<b>δ ≈ 2.1.</b> In the 2.1–2.6 range for H on a carbon next to C=O. Integration 3, a <b>singlet</b>: a CH₃ with no H on the adjacent carbon: CH₃–C(=O)–.' },
        { h: ['b'], t: '<b>δ ≈ 4.1.</b> In the 3.7–4.1 range for H on the carbon bonded to an <b>ester</b> oxygen. Integration 2, a <b>quartet</b>: 3 H on the adjacent carbon, so –O–CH₂–CH₃.' },
        { h: [], t: '<b>Ratio 3 : 2 : 3 = 8 H</b>, matching C₄H₈O₂. Assemble the fragments: CH₃C(=O)–O–CH₂CH₃, <b>ethyl ethanoate</b>.' },
        { h: [], t: '<b>Check the isomer.</b> Methyl propanoate has the same formula, but its CH₃O would be a 3 H <i>singlet</i> near 3.7 and its CH₂ a quartet near 2.3. Those do not match, so it is ruled out.' }
      ] },
    { mol: 'butanone', title: 'Worked example 2 · a ketone, C₄H₈O',
      intro: 'A compound C₄H₈O has signals at δ 1.06, 2.14 and 2.46. Deduce its structure.',
      steps: [
        { h: [], t: '<b>Count the signals.</b> 3 environments.' },
        { h: ['b'], t: '<b>δ 2.14, integration 3, singlet.</b> A CH₃ next to C=O (2.1–2.6) with no H on the adjacent atom: CH₃–C(=O)–.' },
        { h: ['c'], t: '<b>δ 2.46, integration 2, quartet.</b> A CH₂ also next to C=O, with 3 H on the next carbon: –C(=O)–CH₂–CH₃.' },
        { h: ['a'], t: '<b>δ 1.06, integration 3, triplet.</b> A CH₃ next to a CH₂ (2 H): –CH₂–CH₃.' },
        { h: [], t: 'Ratio 3 : 3 : 2 = 8 H. CH₃C(=O)CH₂CH₃ is <b>butanone</b>. Its <sup>13</sup>C spectrum would show 4 signals; the C=O appears at about 209.' }
      ] },
    { mol: 'ethanol', title: 'Worked example 3 · an alcohol, C₂H₆O',
      intro: 'C₂H₆O could be ethanol or methoxymethane (CH₃OCH₃). Use the spectrum to decide.',
      steps: [
        { h: [], t: '<b>Predict first.</b> Methoxymethane is symmetrical: both CH₃ equivalent, so just <b>one</b> singlet (6 H). This spectrum has 3 signals, so it is not methoxymethane.' },
        { h: ['b'], t: '<b>δ 3.69, integration 2, quartet.</b> In the 3.1–3.9 range for H on a carbon bonded to O. Quartet: 3 H next door, –CH₂–CH₃.' },
        { h: ['a'], t: '<b>δ 1.22, integration 3, triplet.</b> The CH₃ at the other end of the ethyl group.' },
        { h: ['c'], t: '<b>δ ≈ 2.6, integration 1, singlet.</b> The O–H hydrogen: its position varies (0.5–5.0 on the data sheet) and it is not split. The compound is <b>ethanol</b>.' }
      ] }
  ];

  /* Examiner-style notes by topic. These summarise the kinds of slips AQA examiners keep reporting; they are
     not quotations from any report. */
  NMR.INSIGHTS = {
    A: ['“Radio waves” are absorbed when their energy matches the gap between the two spin states. Answers that say the nuclei “emit” or “are ionised” lose the mark.',
        'Keep the process and the picture apart: the nuclei flip; the <i>spectrum</i> is the instrument\'s record of that.'],
    B: ['The rule is about the <b>number of nucleons</b> (protons + neutrons), not just protons. ¹²C has 12, an even number, and no spin; ¹³C has 13.',
        'Do not write that carbon-12 is “not magnetic because it has no neutrons”. It has six.'],
    C: ['TMS: give a <b>property</b>, not just “it is a standard”. Good answers: single sharp peak (12 equivalent H); δ = 0 by definition, away from other peaks; inert; non-toxic; volatile so easily removed.',
        'Solvent: say the solvent has <b>no ¹H</b>, so it gives no peaks that would swamp or overlap the sample\'s. Do not say deuterium “is not magnetic” (it has spin, but absorbs at a very different frequency).'],
    D: ['<b>Signals ≠ protons.</b> The number of signals is the number of proton <i>environments</i>, not the number of H atoms.',
        'Integration gives a <b>ratio</b>. Reduce to the simplest whole numbers, then use the molecular formula to scale it to the real number of H.',
        'Name the group when you quote a shift: “2.1–2.6: H on carbon next to C=O”, not just “2.3 is a carbonyl”.',
        'In exam spectra, O–H and N–H signals are shown as singlets.'],
    E: ['<b>Peaks vs heights.</b> n + 1 tells you how many peaks. Pascal\'s triangle tells you how tall they are relative to each other. Do not mix them up.',
        'n counts only H on <b>adjacent</b> carbons, never the H on the same carbon, and only if they are <b>non-equivalent</b> to it.',
        'A CH₃ next to C=O is a singlet: the carbonyl carbon has no H to split it.',
        'Say “one H on the adjacent carbon”, not “one neighbouring H” alone: the mark is for the carbon.'],
    F: ['Count <b>environments</b>, not carbons. Symmetry is the whole game: pentan-3-one has five carbons but gives <b>three</b> signals.',
        '¹³C signals are singlets with no splitting at this level. Their heights do <b>not</b> tell you how many carbons there are.',
        'Use Table C: C=O of a ketone/aldehyde is 190–220; of an ester or acid 160–185.']
  };
})();
