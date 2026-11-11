/* NMR Spectroscopy: questions.
   Q      the interactive bank (Practice section). Four levels, rising in difficulty.
          mcq   opts: [[text, why-this-option], ...], ans: index of the right one
          num   ans (number), fb: { wrongValue: explanation }, fbAny: fallback explanation
          self  a written answer the pupil marks against the marking points (pts), with the "do not accept" list
   fig    { mol, nuc, integ, steps } draws a real simulated spectrum above the question.
   PRINTQ the structured questions for the A4 worksheet and teacher mark scheme.                          */
(function () {
  'use strict';
  var NMR = window.NMR = window.NMR || {};

  var Q = [
    /* ───────── Level 1: the ideas ───────── */
    { id: 'q1', lvl: 1, sec: 'A', type: 'mcq', marks: 1,
      stem: 'A sample is placed in a strong magnetic field. What happens to a ¹H nucleus?',
      opts: [['It can line up with the field or against it: two energy states.', 'Correct. The two states differ in energy by ΔE.'],
             ['It loses its electron and becomes ionised.', 'No electrons are removed. NMR does not ionise the sample (that is mass spectrometry).'],
             ['It emits radio waves straight away.', 'Nuclei <i>absorb</i> radio waves. Nothing is emitted until after they have been excited.'],
             ['It splits into two smaller nuclei.', 'The nucleus is unchanged. Only its orientation in the field changes.']],
      ans: 0, tip: 'Always say “two energy states” or “aligned with / against the field”.' },

    { id: 'q2', lvl: 1, sec: 'A', type: 'mcq', marks: 1,
      stem: 'Which type of radiation do nuclei absorb in NMR spectroscopy?',
      opts: [['Ultraviolet', 'UV promotes electrons to higher levels. The gap between nuclear spin states is far smaller.'],
             ['Infrared', 'Infrared makes bonds vibrate (IR spectroscopy).'],
             ['Radio waves', 'Correct. The spin-state gap is tiny, so only low-energy radio-frequency photons match it.'],
             ['X-rays', 'X-rays are far too energetic: they would eject inner electrons.']],
      ans: 2 },

    { id: 'q3', lvl: 1, sec: 'B', type: 'mcq', marks: 1,
      stem: 'Which nucleus is NMR active?',
      opts: [['¹²C', 'Six protons and six neutrons: 12 nucleons, an even number. All paired, no net spin.'],
             ['¹³C', 'Correct. 13 nucleons is odd, so one nucleon is unpaired and the nucleus has spin.'],
             ['¹⁶O', '16 nucleons: even, with 8 protons and 8 neutrons, all paired. No spin.'],
             ['²⁸Si', '14 protons and 14 neutrons: all paired. No spin. (This is why the silicon in TMS is invisible.)']],
      ans: 1 },

    { id: 'q4', lvl: 1, sec: 'B', type: 'mcq', marks: 1,
      stem: 'Why can carbon-12 not be detected by NMR?',
      opts: [['It has no neutrons.', 'It has six neutrons. The reason is that its protons and neutrons are all paired up.'],
             ['It has an even number of nucleons, so there is no net nuclear spin.', 'Correct.'],
             ['It is radioactive.', '¹²C is stable. Radioactivity has nothing to do with NMR activity.'],
             ['It is too abundant.', 'It is 98.9% of carbon. Abundance affects how strong a signal is, not whether the nucleus can give one.']],
      ans: 1, tip: 'Talk about nucleons (protons + neutrons), not “even number of protons”.' },

    { id: 'q5', lvl: 1, sec: 'C', type: 'mcq', marks: 1,
      stem: 'Why is CDCl₃ used as a solvent for ¹H NMR rather than CHCl₃?',
      opts: [['CDCl₃ has no ¹H, so it gives no large solvent peaks to swamp the sample\'s.', 'Correct. A solvent is in huge excess, so its protons would give enormous peaks.'],
             ['Deuterium is not magnetic.', 'A common error. Deuterium <i>does</i> have spin, but it absorbs at a completely different frequency, so it never appears in a ¹H spectrum.'],
             ['CDCl₃ dissolves organic compounds better.', 'Both dissolve organics equally well. The difference is the nucleus.'],
             ['CDCl₃ is less toxic.', 'Not the reason, and not true.']],
      ans: 0 },

    { id: 'q6', lvl: 1, sec: 'C', type: 'num', marks: 1,
      stem: 'What chemical shift, δ, is assigned to the TMS peak?', ans: 0, unit: 'ppm',
      fbAny: 'TMS is the reference. Its single peak is defined as δ = 0 ppm, and every other shift is measured from it.' },

    { id: 'q7', lvl: 1, sec: 'D', type: 'num', marks: 1,
      stem: 'How many peaks (signals) are in the ¹H NMR spectrum of ethanol, CH₃CH₂OH?', ans: 3,
      fb: { 6: 'You counted hydrogen <i>atoms</i> (6). Signals count different <b>environments</b>: CH₃, CH₂ and OH.', 2: 'You counted carbons. The O–H hydrogen is a third environment, on oxygen.', 9: 'Check the formula: ethanol has 6 hydrogens, in 3 environments.' },
      fbAny: 'Count the groups of equivalent hydrogens: the CH₃ (3 H), the CH₂ (2 H) and the OH (1 H). That is 3 environments.' },

    /* ───────── Level 2: reading spectra ───────── */
    { id: 'q8', lvl: 2, sec: 'D', type: 'num', marks: 1, fig: { mol: 'propanone', nuc: 'H', integ: true },
      stem: 'Propanone, (CH₃)₂C=O, gives the spectrum above. How many signals are there, and why?', ans: 1,
      fb: { 2: 'The two CH₃ groups are in the <b>same</b> environment: each is bonded to the C=O carbon. Equivalent hydrogens give one signal.', 6: 'You counted atoms. All six H are equivalent, so there is a single signal (of integration 6).' },
      fbAny: 'Both CH₃ groups are bonded to the same C=O carbon: they are equivalent. One environment, one signal.' },

    { id: 'q9', lvl: 2, sec: 'D', type: 'mcq', marks: 1, fig: { mol: 'ethyl-ethanoate', nuc: 'H', integ: true, steps: true },
      stem: 'Measure the step heights on the integration trace (in mm, marked on the figure). What is the ratio of hydrogen atoms in the three environments?',
      opts: [['3 : 2 : 3', 'Correct: divide by the smallest (12) to get 1.5 : 1 : 1.5, then multiply by 2 to clear the decimal.'],
             ['18 : 12 : 18', 'That is the measurement, not the ratio. Divide to get simple whole numbers.'],
             ['1 : 1 : 1', 'The steps are clearly not the same height.'],
             ['2 : 3 : 2', 'The wrong way round: the tall steps are the larger H counts.']],
      ans: 0, tip: 'Integration gives a ratio. Check that it adds up to the number of H in the formula (C₄H₈O₂ has 8 H: 3 + 2 + 3).' },

    { id: 'q10', lvl: 2, sec: 'D', type: 'mcq', marks: 1, fig: { mol: 'ethyl-ethanoate', nuc: 'H', integ: true },
      stem: 'In the spectrum of ethyl ethanoate (above), which hydrogens give the singlet at δ 2.1?',
      opts: [['The CH₃ bonded directly to C=O', 'Correct. The shift is in the 2.1–2.6 range for H next to C=O, and the adjacent carbon (C=O) has no H, so it is a singlet.'],
             ['The CH₂ bonded to oxygen', 'That CH₂ is nearer 4.1 and is a quartet.'],
             ['The CH₃ of the ethyl group', 'That one is at about 1.25 and is a triplet (two H next door).'],
             ['The O–H hydrogen', 'Ethyl ethanoate has no O–H.']],
      ans: 0 },

    { id: 'q11', lvl: 2, sec: 'E', type: 'num', marks: 1,
      stem: 'A signal is split by <b>three</b> equivalent hydrogens on the adjacent carbon. How many peaks does it have?', ans: 4,
      fb: { 3: 'That is the number of neighbours (n). The rule is <b>n + 1</b> peaks.', 2: 'That is n − 1. The rule is n + 1.', 1: 'A singlet has no neighbours. Use n + 1 with n = 3.' },
      fbAny: 'n + 1 = 3 + 1 = 4 peaks: a quartet.' },

    { id: 'q12', lvl: 2, sec: 'E', type: 'mcq', marks: 1,
      stem: 'Which are the relative heights of the peaks in a <b>triplet</b>?',
      opts: [['1 : 1 : 1', 'Equal heights would mean no pattern at all. Use row 2 of Pascal\'s triangle.'],
             ['1 : 2 : 1', 'Correct: row 2 of Pascal\'s triangle (two neighbouring H).'],
             ['1 : 3 : 3 : 1', 'That is a quartet (row 3), and it has four peaks.'],
             ['2 : 1 : 2', 'The middle peak is the tallest.']],
      ans: 1, tip: 'Number of peaks = n + 1. Relative heights = row n of Pascal\'s triangle. Two different questions.' },

    { id: 'q13', lvl: 2, sec: 'E', type: 'mcq', marks: 1, fig: { mol: 'ethanol', nuc: 'H', integ: false },
      stem: 'In ethanol (above) the CH₂ signal at δ 3.7 is a quartet. Why?',
      opts: [['The CH₂ has two hydrogens, so 2 + 1 = 3 peaks.', 'It would be a triplet, and this reasoning counts the wrong hydrogens. Only hydrogens on the <b>adjacent</b> carbon split a signal.'],
             ['There are three hydrogens on the adjacent carbon (CH₃), so 3 + 1 = 4 peaks.', 'Correct.'],
             ['It is next to an O–H hydrogen, which splits it into four.', 'O–H hydrogens exchange rapidly and do not split their neighbours (and the O–H is not on the adjacent <i>carbon</i>).'],
             ['The CH₂ and CH₃ have a total of 5 hydrogens.', 'Not what the rule counts. Count only the H on the carbon next door.']],
      ans: 1 },

    { id: 'q14', lvl: 2, sec: 'F', type: 'num', marks: 1,
      stem: 'How many peaks are in the ¹³C NMR spectrum of <b>pentan-3-one</b>, CH₃CH₂C(=O)CH₂CH₃?', ans: 3,
      fb: { 5: 'You counted carbon atoms. The molecule is symmetrical: the two CH₃ are equivalent and so are the two CH₂.', 2: 'There are 3 environments: CH₃, CH₂ and C=O.', 1: 'More than one: CH₃, CH₂ and C=O are all different.' },
      fbAny: 'Environments: the two equivalent CH₃, the two equivalent CH₂, and the C=O. Three signals.' },

    { id: 'q15', lvl: 2, sec: 'F', type: 'mcq', marks: 1, fig: { mol: 'butanone', nuc: 'C' },
      stem: 'Which carbon gives the peak at about δ 209?',
      opts: [['The CH₃ of the ethyl group', 'Alkyl carbons are at 5–40.'],
             ['The CH₂', 'Also an alkyl carbon, 5–40.'],
             ['The C=O carbon', 'Correct. A ketone C=O is in the 190–220 range.'],
             ['There is no way to tell', 'Table C in the data sheet gives the ranges.']],
      ans: 2 },

    /* ───────── Level 3: interpretation ───────── */
    { id: 'q16', lvl: 3, sec: 'D', type: 'mcq', marks: 2,
      stem: 'A compound has the formula C₃H₆O₂. Its ¹H NMR spectrum has three signals:<table class="dt"><tr><th>δ / ppm</th><th>integration</th><th>splitting</th></tr><tr><td>1.17</td><td>3</td><td>triplet</td></tr><tr><td>2.38</td><td>2</td><td>quartet</td></tr><tr><td>11.5</td><td>1</td><td>singlet</td></tr></table>What is the compound?',
      opts: [['Methyl ethanoate, CH₃COOCH₃', 'It would give two singlets, each of integration 3.'],
             ['Propanoic acid, CH₃CH₂COOH', 'Correct. 11.5 is a carboxylic acid O–H (10–12, singlet); the triplet 3 + quartet 2 pattern is an ethyl group; the CH₂ at 2.38 is next to C=O.'],
             ['Propan-1-ol, CH₃CH₂CH₂OH', 'The formula is C₃H₈O, with no C=O, and it would not have a signal at 11.5.'],
             ['Ethyl methanoate, HCOOCH₂CH₃', 'The CH₂ would be a quartet near 4.1 (next to the ester O), not 2.38, and there would be no signal at 11.5.']],
      ans: 1 },

    { id: 'q17', lvl: 3, sec: 'D', type: 'mcq', marks: 2, fig: { mol: 'methyl-propanoate', nuc: 'H', integ: true },
      stem: 'The spectrum above is of one of two esters of formula C₄H₈O₂: <b>ethyl ethanoate</b> or <b>methyl propanoate</b>. Which is it?',
      opts: [['Ethyl ethanoate', 'It would have a CH₂ <i>quartet</i> near 4.1 and a CH₃ <i>singlet</i> near 2.1. Neither is seen.'],
             ['Methyl propanoate', 'Correct. A 3 H singlet at 3.7 is OCH₃ (no neighbouring H). The quartet at 2.3 is a CH₂ next to C=O, and 1.14 is its CH₃ triplet.'],
             ['Either: they give the same spectrum', 'They are isomers, but different structures give different spectra. That is the point of NMR.'],
             ['Neither', 'It must be one of the two: the formula fits both.']],
      ans: 1, tip: 'When two isomers are offered, find a feature present in one and absent in the other.' },

    { id: 'q18', lvl: 3, sec: 'D', type: 'mcq', marks: 2,
      stem: 'A compound of formula C₄H₈O has a ¹H spectrum with signals at δ 1.06 (3H, triplet), 2.14 (3H, singlet) and 2.46 (2H, quartet). Which structure fits?',
      opts: [['Butanal, CH₃CH₂CH₂CHO', 'Would show a signal at 9–10 for the aldehyde H.'],
             ['Butanone, CH₃COCH₂CH₃', 'Correct. 2.14 singlet: CH₃ next to C=O with no neighbouring H. 2.46 quartet and 1.06 triplet: CH₂CH₃, with the CH₂ next to C=O.'],
             ['Cyclobutanol', 'Would have a CH–O signal near 4 and no 3H singlet.'],
             ['2-methylpropanal, (CH₃)₂CHCHO', 'Would show an aldehyde H at 9–10 and a 6 H doublet.']],
      ans: 1 },

    { id: 'q19', lvl: 3, sec: 'F', type: 'mcq', marks: 2,
      stem: 'Propan-1-ol and propan-2-ol are isomers (C₃H₈O). One gives <b>three</b> signals in its ¹³C spectrum and the other gives <b>two</b>. Which gives two, and why?',
      opts: [['Propan-1-ol, because it has fewer carbon atoms.', 'Both have three carbon atoms.'],
             ['Propan-2-ol, because its two CH₃ groups are equivalent.', 'Correct. Propan-2-ol is symmetrical about the carbon bearing the OH: CH₃, CH₃ (equivalent) and CH–OH give 2 environments.'],
             ['Propan-2-ol, because the O–H carbon is not detected.', 'Every carbon is detected. Equivalence is the reason.'],
             ['Propan-1-ol, because the O–H hydrogen is not a carbon.', 'The H is irrelevant in ¹³C NMR. Propan-1-ol has three different carbons.']],
      ans: 1 },

    { id: 'q20', lvl: 3, sec: 'C', type: 'num', marks: 1,
      stem: 'A spectrometer is slightly out of calibration. The TMS peak is found at δ 0.30 instead of 0, and a sample peak is read as δ 3.99. What is its true chemical shift?', ans: 3.69,
      fb: { 4.29: 'You added the offset. The whole spectrum is shifted <i>up</i> by 0.30, so subtract it.' },
      fbAny: 'Set TMS back to 0 by subtracting 0.30 from every reading: 3.99 − 0.30 = 3.69.', tolNum: 0.011 },

    { id: 'q21', lvl: 3, sec: 'D', type: 'mcq', marks: 2, ext: true,
      stem: '<span class="chip ext">Extension</span> A few drops of D₂O are added to a sample of ethanol and the ¹H spectrum is run again. The signal at δ ≈ 2.6 disappears. Which hydrogen gave that signal?',
      opts: [['The O–H hydrogen', 'Correct. It exchanges with deuterium (O–D), and ²H does not appear in a ¹H spectrum.'],
             ['The CH₃ hydrogens', 'C–H hydrogens do not exchange with D₂O.'],
             ['The CH₂ hydrogens', 'C–H hydrogens do not exchange with D₂O.'],
             ['All of them', 'Only O–H (and N–H) exchange.']],
      ans: 0 },

    { id: 'q22', lvl: 3, sec: 'D', type: 'num', marks: 2,
      stem: 'The integration steps for a compound of formula C₂H₆O measure 36 mm, 24 mm and 12 mm. How many hydrogen atoms are in the environment that gave the <b>tallest</b> step?', ans: 3,
      fb: { 36: 'That is the step height. Convert: 36 : 24 : 12 = 3 : 2 : 1, which adds to 6 H, matching C₂H₆O.' },
      fbAny: '36 : 24 : 12 simplifies to 3 : 2 : 1 (÷12). That totals 6, so the formula\'s 6 H are shared 3, 2 and 1.' },

    /* ───────── Level 4: exam answers (self-marked) ───────── */
    { id: 'q23', lvl: 4, sec: 'C', type: 'self', marks: 2,
      stem: 'Explain why tetramethylsilane (TMS) is used as the standard in NMR spectroscopy.',
      pts: [['It gives a single (sharp) peak / signal because all 12 hydrogens are equivalent', 1],
            ['Its peak is at δ = 0 / is a reference point, away from the peaks of most other protons / carbons', 1],
            ['(Alternative) It is inert, non-toxic, or volatile so is easily removed from the sample', 1]],
      max: 2, dna: ['“It is a standard” (repeats the question)', '“It is a good reference” with no property'],
      tip: 'A property of TMS is needed for each mark. Two clear properties get both marks.' },

    { id: 'q24', lvl: 4, sec: 'C', type: 'self', marks: 2,
      stem: 'Explain why a deuterated solvent such as CDCl₃ is used when recording a ¹H NMR spectrum.',
      pts: [['The solvent contains no ¹H (hydrogen) atoms / the hydrogen is replaced by deuterium', 1],
            ['So it does not give peaks / signals that would obscure, swamp or overlap the sample\'s peaks', 1]],
      max: 2, dna: ['“Deuterium is not magnetic / has no spin”', '“So it does not react with the sample”'],
      tip: 'The solvent is present in vast excess: say that a protonated solvent would give large peaks that hide the sample.' },

    { id: 'q25', lvl: 4, sec: 'E', type: 'self', marks: 3, fig: { mol: 'ethyl-ethanoate', nuc: 'H', integ: true },
      stem: 'In the ¹H NMR spectrum of ethyl ethanoate (above) the signal at δ 4.1 is a quartet. Explain this splitting and name the hydrogens responsible for the signal.',
      pts: [['The signal is from the CH₂ hydrogens (the OCH₂ / next to the ester oxygen)', 1],
            ['There are three hydrogens on the adjacent carbon (the CH₃)', 1],
            ['n + 1 rule: 3 + 1 = 4 peaks', 1]],
      max: 3, dna: ['“three neighbouring hydrogens” without saying they are on the <b>adjacent carbon</b>', 'Using the number of hydrogens on the CH₂ itself'],
      tip: 'Name the carbon the neighbours are on, state n, and apply n + 1.' },

    { id: 'q26', lvl: 4, sec: 'D', type: 'self', marks: 2,
      stem: 'In ethanol, the CH₂ hydrogens have δ = 3.7 but the CH₃ hydrogens have δ = 1.2. Explain why.',
      pts: [['Oxygen is electronegative, and withdraws electron density from the CH₂ hydrogens (deshielding them)', 1],
            ['The CH₃ hydrogens are further from oxygen, so are more shielded / have more electron density, so a lower δ', 1]],
      max: 2, dna: ['“Oxygen is bigger”', '“The CH₂ has fewer hydrogens”'],
      tip: 'Link electronegativity → electron density → shielding → δ.' },

    { id: 'q27', lvl: 4, sec: 'F', type: 'self', marks: 3,
      stem: 'Pentan-3-one, CH₃CH₂COCH₂CH₃, and pentan-2-one, CH₃COCH₂CH₂CH₃, are isomers. State how many peaks each gives in its ¹³C NMR spectrum and explain how this distinguishes them.',
      pts: [['Pentan-3-one gives 3 peaks', 1], ['Pentan-2-one gives 5 peaks', 1], ['Pentan-3-one is symmetrical: carbons come in equivalent pairs (two CH₃, two CH₂), but there is no symmetry in pentan-2-one so all five carbons are different', 1]],
      max: 3, dna: ['Counting hydrogen environments', '“Fewer peaks because fewer carbons”'],
      tip: 'Quote the numbers and the reason: symmetry makes carbons equivalent.' },

    { id: 'q28', lvl: 4, sec: 'D', type: 'self', marks: 6, fig: { mol: 'methyl-propanoate', nuc: 'H', integ: true },
      stem: 'A compound has the molecular formula C₄H₈O₂. Its ¹H NMR spectrum is shown above (signals at δ 1.14, 2.32 and 3.70, integration ratio 3 : 2 : 3). Deduce its structure, using the data to explain each part of your reasoning.',
      pts: [['Three signals, so three different proton environments', 1],
            ['δ 3.70, singlet, 3 H: CH₃ attached to oxygen of an ester (3.7–4.1), with no H on the adjacent atom', 1],
            ['δ 2.32, quartet, 2 H: CH₂ next to C=O, with 3 H on the adjacent carbon', 1],
            ['δ 1.14, triplet, 3 H: CH₃ with 2 H on the adjacent carbon', 1],
            ['Ratio 3 : 2 : 3 adds to 8 H, matching C₄H₈O₂', 1],
            ['Structure CH₃CH₂COOCH₃, methyl propanoate', 1]],
      max: 6, dna: ['Ethyl ethanoate (would have a quartet at about 4.1 and a 3 H singlet near 2.1)'],
      tip: 'Walk through each signal: shift, integration, splitting. Then name the structure.' },

    { id: 'q29', lvl: 4, sec: 'A', type: 'self', marks: 3,
      stem: 'Describe how nuclei in a sample absorb energy in an NMR spectrometer.',
      pts: [['Nuclei with spin (¹H or ¹³C) in a strong magnetic field can be aligned with or against the field: two energy states, with a small energy gap', 1],
            ['Radio-frequency radiation is applied', 1],
            ['Nuclei absorb energy when the radiation frequency matches the energy gap (hf = ΔE) and flip to the higher energy state (resonance)', 1]],
      max: 3, dna: ['“Electrons are promoted”', '“The nuclei emit radio waves”'],
      tip: 'Mention the magnetic field, the two states, and the radio frequency that matches the gap.' }
  ];
  NMR.Q = Q;

  /* ───────── Structured printed questions ─────────
     parts: { t, m (marks), lines (answer lines), ms: [marking points], no: "do not accept" } */
  NMR.PRINTQ = [
    { n: 1, mol: null, stem: 'This question is about how nuclear magnetic resonance (NMR) spectroscopy works.',
      parts: [
        { t: 'Nuclei with an odd number of nucleons can be detected by NMR. Explain why carbon-12 gives no signal but carbon-13 does.', m: 2, lines: 3,
          ms: ['¹²C has an even number of nucleons (6 protons + 6 neutrons), so no net nuclear spin', '¹³C has an odd number of nucleons (13), so it has nuclear spin'], no: 'Do not accept “¹²C has no neutrons”.' },
        { t: 'Describe what happens to nuclei with spin when they are placed in a strong magnetic field and then exposed to radio waves.', m: 3, lines: 4,
          ms: ['In the field the nuclei line up with or against the field, giving two energy states (a small gap)', 'They absorb radio-frequency energy when its frequency matches the gap between the states (hf = ΔE)', 'The nuclei flip to the higher energy state (resonance)'], no: '' },
        { t: 'Explain why a sample is dissolved in CDCl₃, not CHCl₃, for ¹H NMR, and why TMS is added.', m: 3, lines: 4,
          ms: ['CDCl₃ contains no ¹H, so gives no peaks that would obscure the sample\'s peaks', 'TMS gives a single peak (all 12 H equivalent) at δ = 0', 'TMS is the reference/standard from which all other shifts are measured (or: it is inert, volatile, non-toxic)'], no: 'Do not accept “deuterium is not magnetic”.' }
      ] },
    { n: 2, mol: 'ethyl-ethanoate', nuc: 'H', integ: true, steps: true,
      stem: 'The ¹H NMR spectrum of ethyl ethanoate, CH₃COOCH₂CH₃, is shown in the figure. The heights of the steps on the integration trace are marked in mm.',
      parts: [
        { t: 'How many different proton environments are in ethyl ethanoate?', m: 1, lines: 1, ms: ['3'], no: '' },
        { t: 'Use the step heights to deduce the ratio of the numbers of hydrogen atoms in the three environments.', m: 2, lines: 3, work: 'step heights ≈ 18 : 12 : 18 mm → ÷ 12 → 1.5 : 1 : 1.5 → × 2 → 3 : 2 : 3 (total 8 H = C₄H₈O₂)',
          ms: ['Division of the step heights to give a simple ratio (1.5 : 1 : 1.5 or equivalent)', '3 : 2 : 3'], no: '' },
        { t: 'The signal at δ = 4.1 is a quartet. Explain why, and state which hydrogens give this signal.', m: 3, lines: 4,
          ms: ['The OCH₂ hydrogens give the signal', 'There are three hydrogens on the adjacent carbon (the CH₃)', 'n + 1 = 3 + 1 = 4 peaks'], no: 'Do not accept “three neighbouring hydrogens” with no mention of the adjacent carbon.' },
        { t: 'The signal at δ = 2.1 is a singlet. Explain why.', m: 1, lines: 2,
          ms: ['The adjacent carbon (C=O) has no hydrogen atoms attached, so there is no splitting'], no: '' }
      ] },
    { n: 3, mol: 'butanone', nuc: 'H', integ: true,
      stem: 'A compound has the molecular formula C₄H₈O. Its ¹H NMR spectrum is shown in the figure, with the signals at δ = 1.06, 2.14 and 2.46.',
      parts: [
        { t: 'Complete the table.', m: 3, table: true, lines: 0,
          rows: [['1.06', '3', '', ''], ['2.14', '3', '', ''], ['2.46', '2', '', '']], head: ['δ / ppm', 'Number of H', 'Splitting pattern', 'Number of H on adjacent carbon'],
          ans: [['1.06', '3', 'triplet', '2'], ['2.14', '3', 'singlet', '0'], ['2.46', '2', 'quartet', '3']],
          ms: ['1.06: triplet, 2', '2.14: singlet, 0', '2.46: quartet, 3'], no: '' },
        { t: 'Use the data sheet to identify the type of hydrogen at δ = 2.14.', m: 1, lines: 2,
          ms: ['H on a carbon next to C=O (R–CO–CH₃), range 2.1–2.6'], no: '' },
        { t: 'Deduce the structure of the compound and give its name.', m: 2, lines: 3,
          ms: ['CH₃COCH₂CH₃', 'Butanone'], no: '' },
        { t: 'State the number of peaks in the ¹³C NMR spectrum of this compound.', m: 1, lines: 1, ms: ['4'], no: '' }
      ] },
    { n: 4, mol: 'pentan-3-one', nuc: 'C',
      stem: 'The ¹³C NMR spectrum of pentan-3-one, CH₃CH₂COCH₂CH₃, is shown in the figure.',
      parts: [
        { t: 'Explain why the spectrum has three peaks although the molecule has five carbon atoms.', m: 2, lines: 3,
          ms: ['The molecule is symmetrical, so the two CH₃ carbons are in the same environment and so are the two CH₂ carbons', 'Three different carbon environments (CH₃, CH₂, C=O)'], no: '' },
        { t: 'Identify, with a reason, the carbon that gives the peak at δ ≈ 212.', m: 2, lines: 3,
          ms: ['The C=O carbon', 'It lies in the 190–220 range for a ketone C=O (data sheet)'], no: '' },
        { t: 'Pentan-2-one is an isomer of pentan-3-one. State how many peaks its ¹³C spectrum has.', m: 1, lines: 1, ms: ['5'], no: '' }
      ] },
    { n: 5, mol: 'methyl-propanoate', nuc: 'H', integ: true,
      stem: 'Compound X has the molecular formula C₄H₈O₂. Its ¹H NMR spectrum is shown in the figure, with the signals at δ = 1.14, 2.32 and 3.70 and an integration ratio 3 : 2 : 3. Its ¹³C NMR spectrum has four peaks, at δ = 9.1, 27.4, 51.5 and 174.9.',
      parts: [
        { t: 'Use the ¹³C data and the data sheet to identify two functional-group features of X.', m: 2, lines: 3,
          ms: ['174.9: ester (or acid) C=O (160–185)', '51.5: carbon bonded to oxygen (R–C–O, 50–90)'], no: '' },
        { t: 'Deduce the structure of X. Explain how the ¹H NMR spectrum supports your answer, referring to the splitting pattern and the integration of each signal.', m: 6, lines: 9,
          ms: ['3 signals so 3 proton environments', '3.70, singlet, 3 H: OCH₃ with no H on adjacent atom (3.7–4.1, ester)', '2.32, quartet, 2 H: CH₂ next to C=O with 3 H on adjacent carbon', '1.14, triplet, 3 H: CH₃ next to CH₂', 'Ratio 3 : 2 : 3 = 8 H matches formula', 'CH₃CH₂COOCH₃, methyl propanoate'], no: '' },
        { t: 'Ethyl ethanoate is an isomer of X. Describe two differences between its ¹H NMR spectrum and the spectrum of X.', m: 2, lines: 3,
          ms: ['Singlet at about 2.1 (3 H) instead of 3.7', 'Quartet (2 H) at about 4.1 instead of 2.3 (OCH₂ rather than CH₂C=O); the 3.7 singlet absent'], no: 'Accept any two correct differences in shift or splitting.' }
      ] }
  ];
  NMR.PRINTQ.forEach(function (q) { q.total = q.parts.reduce(function (a, p) { return a + p.m; }, 0); });
})();
