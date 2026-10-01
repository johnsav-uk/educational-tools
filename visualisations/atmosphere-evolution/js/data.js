/* The Evolution of the Earth's Atmosphere: DATA
   Everything the tool says lives here: the time scale, the keyframes every
   other part blends between, the captions, glossary, equations, exam cards
   and quiz. Change it here and the scene, charts and text follow.

   The content is held to the AQA specification and goes no further:
   GCSE Chemistry 8462, 4.9.1.1 to 4.9.1.4 (Combined Science: Trilogy 5.9.1).
   The early atmosphere is "one theory", as the specification says, and it
   gives words rather than numbers for it, so the tool does too. */
(function () {
  'use strict';
  var AE = window.AE = window.AE || {};

  /* ── TIME SCALE ─────────────────────────────────────────────────────────
     The slider runs 0..1 and is deliberately NOT linear in time: each gap
     between two keyframes gets one fifth of it, so the last 200 million
     years are as easy to reach as the first billion. NODES are the keyframe
     times in billions of years ago (bya), each taken from the specification:
     4.6 Earth forms; 3.6 end of the first billion years; 2.7 algae first
     produce oxygen; 1.7 the "next billion years" in which plants evolved;
     0.2 the last 200 million years, much the same as today. */
  var NODES = [4.6, 3.6, 2.7, 1.7, 0.2, 0.0];

  /* slider position (0..1) -> billion years ago, piecewise linear */
  function byaAt(s) {
    s = Math.min(1, Math.max(0, s));
    var n = NODES.length - 1, f = s * n, i = Math.min(n - 1, Math.floor(f)), t = f - i;
    return NODES[i] + (NODES[i + 1] - NODES[i]) * t;
  }
  /* billion years ago -> slider position */
  function posOf(bya) {
    var n = NODES.length - 1;
    for (var i = 0; i < n; i++) {
      if (bya <= NODES[i] && bya >= NODES[i + 1]) return (i + (NODES[i] - bya) / (NODES[i] - NODES[i + 1])) / n;
    }
    return bya > NODES[0] ? 0 : 1;
  }
  /* "3.6 billion years ago", "200 million years ago", "Today" */
  function formatBya(bya) {
    if (bya < 0.005) return 'Today';
    if (bya >= 1) return bya.toFixed(1) + ' billion years ago';
    return Math.round(bya * 100) * 10 + ' million years ago';
  }

  /* ── GASES ──────────────────────────────────────────────────────────────
     In the order of the doughnut, gauges and legend. The specification groups
     methane and ammonia ("small proportions of methane and ammonia"), so the
     tool does too. Solid colours chosen to contrast with their neighbours on
     the doughnut and with the dark panel; every gas is also named in text, so
     colour is never the only signal. The charts and scene labels read these. */
  var GASES = [
    { id: 'n2',    name: 'Nitrogen',             f: 'N<sub>2</sub>',  col: '#3d7dff' },   // blue
    { id: 'o2',    name: 'Oxygen',               f: 'O<sub>2</sub>',  col: '#ff4d5e' },   // red
    { id: 'co2',   name: 'Carbon dioxide',       f: 'CO<sub>2</sub>', col: '#e6e9ee' },   // white-grey
    { id: 'h2o',   name: 'Water vapour',         f: 'H<sub>2</sub>O', col: '#e35ce0' },   // magenta: well clear of nitrogen's blue
    { id: 'mna',   name: 'Methane and ammonia',  f: 'CH<sub>4</sub>, NH<sub>3</sub>', col: '#ffb020' },   // amber
    { id: 'noble', name: 'Noble gases',          f: 'Ar',             col: '#7ed957' }    // green
  ];

  /* ── KEYFRAMES ──────────────────────────────────────────────────────────
     One per node; the tool blends smoothly between them.
     gas: a simplified model that draws the bars, doughnut and graph. Only its
       shape is meant (mainly CO2 at first; about 80% N2 and 20% O2 for the last
       200 million years). Pupils are shown the WORDS in PHASES instead.
     relief: 1 = volcanic island, 0 = the low island of later times. The
       volcanoes belong to the first billion years; after that the scene has none.
     Colours are [r,g,b] in 0..1. Fields in LAG are eased late, so algae and
     plants arrive as their milestone is reached, not halfway before it. */
  var TODAY = { n2: 78, o2: 21, co2: 0.04, h2o: 0.5, mna: 0, noble: 0.9 };
  var KEYS = [
    { bya: 4.6,
      gas: { n2: 8, o2: 0, co2: 62, h2o: 26, mna: 3, noble: 1 },
      relief: 1, volcano: 1.0, lava: 1.0, ash: 1.0, lightning: 1.0, ocean: 0, steam: 0, rain: 0,
      algae: 0, bubbles: 0, veg: 0, clouds: 0.25, stars: 0.8, sunH: 0.10,
      skyTop: [0.09, 0.04, 0.03], skyHor: [0.72, 0.26, 0.07], fog: 0.017,
      sun: [1.0, 0.5, 0.2], oceanDeep: [0.05, 0.10, 0.13], oceanShallow: [0.16, 0.30, 0.30] },
    { bya: 3.6,
      gas: { n2: 30, o2: 0, co2: 60, h2o: 5, mna: 3, noble: 2 },
      relief: 1, volcano: 0.7, lava: 0.55, ash: 0.6, lightning: 0.45, ocean: 1, steam: 0.9, rain: 0.7,
      algae: 0, bubbles: 0, veg: 0, clouds: 1.0, stars: 0.6, sunH: 0.2,
      skyTop: [0.13, 0.11, 0.14], skyHor: [0.50, 0.36, 0.25], fog: 0.015,
      sun: [1.0, 0.62, 0.34], oceanDeep: [0.07, 0.12, 0.13], oceanShallow: [0.22, 0.34, 0.28] },
    { bya: 2.7,
      gas: { n2: 62, o2: 0, co2: 31, h2o: 3, mna: 2, noble: 2 },
      relief: 0, volcano: 0, lava: 0, ash: 0.15, lightning: 0, ocean: 1, steam: 0, rain: 0.05,
      algae: 0.6, bubbles: 0.85, veg: 0, clouds: 0.6, stars: 0.3, sunH: 0.30,
      skyTop: [0.17, 0.30, 0.33], skyHor: [0.56, 0.64, 0.50], fog: 0.012,
      sun: [1.0, 0.80, 0.55], oceanDeep: [0.05, 0.16, 0.16], oceanShallow: [0.16, 0.42, 0.34] },
    { bya: 1.7,
      gas: { n2: 77, o2: 13, co2: 7, h2o: 1.5, mna: 0.5, noble: 1 },
      relief: 0, volcano: 0, lava: 0, ash: 0.05, lightning: 0, ocean: 1, steam: 0, rain: 0,
      algae: 0.9, bubbles: 0.7, veg: 0.65, clouds: 0.5, stars: 0.1, sunH: 0.42,
      skyTop: [0.14, 0.38, 0.62], skyHor: [0.58, 0.74, 0.80], fog: 0.007,
      sun: [1.0, 0.92, 0.78], oceanDeep: [0.04, 0.17, 0.26], oceanShallow: [0.13, 0.46, 0.50] },
    { bya: 0.2, gas: TODAY,
      relief: 0, volcano: 0, lava: 0, ash: 0, lightning: 0, ocean: 1, steam: 0, rain: 0,
      algae: 0.85, bubbles: 0.3, veg: 1.0, clouds: 0.55, stars: 0, sunH: 0.55,
      skyTop: [0.10, 0.45, 0.88], skyHor: [0.70, 0.85, 0.95], fog: 0.003,
      sun: [1.0, 0.96, 0.88], oceanDeep: [0.03, 0.20, 0.36], oceanShallow: [0.12, 0.50, 0.60] },
    { bya: 0.0, gas: TODAY,
      relief: 0, volcano: 0, lava: 0, ash: 0, lightning: 0, ocean: 1, steam: 0, rain: 0,
      algae: 0.85, bubbles: 0.3, veg: 1.0, clouds: 0.55, stars: 0, sunH: 0.55,
      skyTop: [0.10, 0.45, 0.88], skyHor: [0.70, 0.85, 0.95], fog: 0.003,
      sun: [1.0, 0.96, 0.88], oceanDeep: [0.03, 0.20, 0.36], oceanShallow: [0.12, 0.50, 0.60] }
  ];
  var LAG = { algae: 3, bubbles: 3, veg: 2 };

  /* ── MILESTONES: the clickable markers; `key` indexes KEYS ── */
  var MILESTONES = [
    { key: 0, label: 'Earth forms', when: '4.6 bya',
      text: 'The Earth forms. One theory: intense volcanic activity for the first billion years.' },
    { key: 1, label: 'Oceans have formed', when: '3.6 bya',
      text: 'By the end of the first billion years, water vapour has condensed to form the oceans.' },
    { key: 2, label: 'Algae make oxygen', when: '2.7 bya',
      text: 'Algae first produce oxygen. Soon after, oxygen appears in the atmosphere.' },
    { key: 3, label: 'Plants have evolved', when: '1.7 bya',
      text: 'Over the billion years after algae, plants evolved and oxygen gradually increased.' },
    { key: 4, label: 'Much like today', when: '200 mya',
      text: 'For the last 200 million years, the proportions of gases have been much the same as today.' },
    { key: 5, label: 'Today', when: 'now',
      text: 'About four-fifths nitrogen and one-fifth oxygen, with small proportions of other gases.' }
  ];

  /* ── PHASES ─────────────────────────────────────────────────────────────
     Phase i runs from KEYS[i] to KEYS[i+1]; phase 5 is Today. `what` and
     `why` follow the specification's wording. `words` are what the gauges say
     for each gas in that phase: the specification's own terms, not numbers. */
  var PHASES = [
    { title: 'The first billion years: volcanoes', spec: '4.9.1.2',
      what: 'One theory suggests there was intense volcanic activity. It released the gases that formed the early atmosphere. It was probably mainly carbon dioxide, with little or no oxygen, like the atmospheres of Mars and Venus today.',
      why: 'Volcanoes also released nitrogen, which gradually built up, and water vapour. There may have been small proportions of methane and ammonia. As the Earth cooled, the water vapour condensed to form the oceans.',
      words: { n2: 'Building up', o2: 'Little or none', co2: 'Mainly', h2o: 'Condensing', mna: 'Maybe small', noble: 'Small' } },
    { title: 'The oceans take in carbon dioxide', spec: '4.9.1.2',
      what: 'Carbon dioxide is decreasing, and nitrogen is still building up. There is still little or no oxygen.',
      why: 'When the oceans formed, carbon dioxide dissolved in the water. Carbonates were precipitated, producing sediments. This reduced the amount of carbon dioxide in the atmosphere.',
      words: { n2: 'Building up', o2: 'Little or none', co2: 'Decreasing', h2o: 'Small', mna: 'Maybe small', noble: 'Small' } },
    { title: 'Algae and plants make oxygen', spec: '4.9.1.3',
      what: 'Algae first produced oxygen about 2.7 billion years ago, and soon after this oxygen appeared in the atmosphere. Over the next billion years plants evolved. The percentage of oxygen gradually increased, to a level that enabled animals to evolve.',
      why: 'Algae and plants produced the oxygen by photosynthesis. Photosynthesis also uses carbon dioxide, so the percentage of carbon dioxide went down.',
      words: { n2: 'Building up', o2: 'Increasing', co2: 'Decreasing', h2o: 'Small', mna: 'Very little', noble: 'Small' } },
    { title: 'Carbon is locked away', spec: '4.9.1.4',
      what: 'Carbon dioxide keeps decreasing. Oxygen keeps increasing.',
      why: 'Algae and plants decreased the carbon dioxide by photosynthesis. The formation of sedimentary rocks, such as limestone, also decreased carbon dioxide. So did the formation of fossil fuels that contain carbon: coal, crude oil and natural gas.',
      words: { n2: 'Most of the air', o2: 'Increasing', co2: 'Decreasing', h2o: 'Small', mna: 'Very little', noble: 'Small' } },
    { title: 'Much the same as today', spec: '4.9.1.1',
      what: 'For the last 200 million years, the proportions of gases have stayed much the same as today.',
      why: 'About four-fifths (approximately 80%) nitrogen, about one-fifth (approximately 20%) oxygen, and small proportions of various other gases, including carbon dioxide, water vapour and noble gases.',
      words: { n2: 'About 80%', o2: 'About 20%', co2: 'Small', h2o: 'Small', mna: 'Very little', noble: 'Small' } },
    { title: 'The atmosphere today', spec: '4.9.1.1',
      what: 'About four-fifths (approximately 80%) nitrogen, and about one-fifth (approximately 20%) oxygen.',
      why: 'Small proportions of various other gases, including carbon dioxide, water vapour and noble gases. The proportions have been much the same for 200 million years.',
      words: { n2: 'About 80%', o2: 'About 20%', co2: 'Small', h2o: 'Small', mna: 'Very little', noble: 'Small' } }
  ];

  /* ── EQUATIONS AND PROCESSES ────────────────────────────────────────────
     Only what the specification asks for. `steps` is a sequence, for the
     changes it describes in words rather than with an equation. */
  var EQUATIONS = [
    { id: 'cond', title: 'The oceans form', phases: [0],
      steps: ['The Earth cools', 'water vapour condenses', 'liquid water forms the oceans'] },
    { id: 'dissolve', title: 'Carbon dioxide dissolves in the oceans', phases: [0, 1],
      steps: ['carbon dioxide dissolves in the oceans', 'carbonates are precipitated', 'sediments form'],
      note: 'This reduced the amount of carbon dioxide in the atmosphere.' },
    { id: 'photo', title: 'Photosynthesis', phases: [2, 3],
      word: 'carbon dioxide + water <span class="arr"><small>light</small><span>→</span></span> glucose + oxygen',
      sym: '6CO<sub>2</sub> + 6H<sub>2</sub>O → C<sub>6</sub>H<sub>12</sub>O<sub>6</sub> + 6O<sub>2</sub>',
      note: 'Algae and plants produced the oxygen that is now in the atmosphere, and used up carbon dioxide.' },
    { id: 'rocks', title: 'Carbon locked in sedimentary rocks and fossil fuels', phases: [3],
      steps: ['carbon dioxide is taken in by living things', 'their remains are buried', 'sedimentary rocks and fossil fuels that contain carbon'],
      note: 'Limestone is a sedimentary rock. Coal, crude oil and natural gas are fossil fuels.' }
  ];

  /* ── GLOSSARY: matching words in the text become tooltip buttons ── */
  var GLOSSARY = [
    { id: 'condensed', match: 'condens(?:ed|es|e|ing|ation)', term: 'Condensed',
      def: 'Changed from a gas to a liquid on cooling. Water vapour condensed to form the oceans.' },
    { id: 'dissolved', match: 'dissolv(?:ed|es|e|ing)', term: 'Dissolved',
      def: 'Mixed into a liquid to make a solution. Carbon dioxide dissolved in the oceans.' },
    { id: 'carbonates', match: 'carbonates?', term: 'Carbonates',
      def: 'Compounds that contain carbon and oxygen, such as calcium carbonate. They are solids that do not dissolve in water.' },
    { id: 'precipitated', match: 'precipitat(?:ed|es|e|ing)', term: 'Precipitated',
      def: 'Formed as an insoluble solid from a solution. The solid settles out of the water.' },
    { id: 'sedimentary rock', match: 'sedimentary rocks?', term: 'Sedimentary rock',
      def: 'Rock made from layers of sediment pressed together over a long time. Limestone is a sedimentary rock.' },
    { id: 'sediments', match: 'sediments?', term: 'Sediments',
      def: 'Solid bits that settle at the bottom of water and build up in layers.' },
    { id: 'algae', match: 'algae', term: 'Algae',
      def: 'Simple living things that live in water and carry out photosynthesis. They first produced oxygen about 2.7 billion years ago.' },
    { id: 'photosynthesis', match: 'photosynthesi[sz]e?(?:d|s)?', term: 'Photosynthesis',
      def: 'The reaction in algae and plants that uses light to turn carbon dioxide and water into glucose and oxygen.' },
    { id: 'fossil fuels', match: 'fossil fuels?', term: 'Fossil fuels',
      def: 'Coal, crude oil and natural gas. They formed from the remains of living things and contain carbon.' }
  ];

  /* ── FLIP-CARD QUESTIONS (marking points follow the specification) ── */
  var CARDS = [
    { q: 'Describe how the percentage of carbon dioxide in the atmosphere decreased.', marks: 4,
      points: [
        'Carbon dioxide dissolved in the oceans',
        'Carbonates were precipitated, producing sediments',
        'Algae and plants used carbon dioxide in photosynthesis',
        'Sedimentary rocks and fossil fuels that contain carbon were formed'
      ],
      tip: 'Four different ideas for four marks. Saying the carbon dioxide “disappeared” gains nothing.' },
    { q: 'Describe how oxygen came to be in the atmosphere.', marks: 3,
      points: [
        'Algae (and later plants) produced oxygen by photosynthesis',
        'Algae first produced oxygen about 2.7 billion years ago',
        'Plants evolved and the percentage of oxygen gradually increased'
      ],
      tip: 'Name the process: photosynthesis, not “breathing out oxygen”.' },
    { q: 'Explain how the oceans formed.', marks: 2,
      points: [
        'Volcanoes released water vapour, and the Earth cooled',
        'The water vapour condensed to form the oceans'
      ],
      tip: 'Condensed is the key word. Don’t say the water “evaporated”.' },
    { q: 'Describe the formation of limestone, coal, crude oil and natural gas.', marks: 4,
      points: [
        'Limestone: carbonates and the shells and skeletons of sea creatures settled as sediment and formed sedimentary rock',
        'Coal: from the remains of plants that were buried',
        'Crude oil and natural gas: from the remains of plankton that were buried in mud',
        'Over millions of years, locking up carbon from the atmosphere'
      ],
      tip: 'Coal comes from plants; crude oil and natural gas from plankton. Say that the carbon is locked up.' },
    { q: 'Suggest why scientists are not certain about the Earth’s early atmosphere.', marks: 2,
      points: [
        'Evidence is limited',
        'because of the time scale: the Earth is 4.6 billion years old'
      ],
      tip: 'The specification wording: evidence is limited because of the time scale of 4.6 billion years.' }
  ];

  /* ── THEORY VS EVIDENCE ──────────────────────────────────────────────── */
  var EVIDENCE = {
    theory: [
      'During the first billion years there was intense volcanic activity.',
      'The volcanoes released the gases that formed the early atmosphere, and water vapour that condensed to form the oceans.',
      'At first the atmosphere may have been like Mars and Venus today: mainly carbon dioxide with little or no oxygen.'
    ],
    limits: [
      'Evidence for the early atmosphere is limited because of the time scale of 4.6 billion years.',
      'Theories about the early atmosphere, and how it formed, have changed and developed over time.',
      'So this is one theory, not a certainty.'
    ],
    skill: 'In the exam you may be given information to interpret, and asked to evaluate a theory. You do not need to know other theories.'
  };

  /* ── QUIZ ────────────────────────────────────────────────────────────── */
  var QUIZ = [
    { type: 'mc', q: 'One theory says the early atmosphere was mainly which gas?',
      opts: ['Nitrogen', 'Oxygen', 'Carbon dioxide', 'Methane'], ans: 2,
      why: 'Mainly carbon dioxide with little or no oxygen, like Mars and Venus today.' },
    { type: 'mc', q: 'How did the oceans form?',
      opts: ['Water vapour condensed as the Earth cooled', 'Carbon dioxide condensed', 'Algae produced the water', 'Nitrogen dissolved in rain'], ans: 0,
      why: 'Volcanoes released water vapour. As the Earth cooled it condensed to form the oceans.' },
    { type: 'mc', q: 'What happened when carbon dioxide dissolved in the oceans?',
      opts: ['It made oxygen', 'Carbonates were precipitated, producing sediments', 'It turned into nitrogen', 'It evaporated again'], ans: 1,
      why: 'Carbonates were precipitated, producing sediments. This reduced the carbon dioxide in the atmosphere.' },
    { type: 'mc', q: 'About when did algae first produce oxygen?',
      opts: ['4.6 billion years ago', '2.7 billion years ago', '200 million years ago', '1 million years ago'], ans: 1,
      why: 'About 2.7 billion years ago. Soon after this, oxygen appeared in the atmosphere.' },
    { type: 'mc', q: 'Which process produced the oxygen now in the atmosphere?',
      opts: ['Respiration', 'Combustion', 'Photosynthesis', 'Condensation'], ans: 2,
      why: 'Algae and plants produced it by photosynthesis.' },
    { type: 'mc', q: 'About how much of today’s atmosphere is nitrogen?',
      opts: ['About one-fifth (20%)', 'About half (50%)', 'About four-fifths (80%)', 'Nearly all (99%)'], ans: 2,
      why: 'About four-fifths nitrogen and about one-fifth oxygen.' },
    { type: 'mc', q: 'Why is evidence for the early atmosphere limited?',
      opts: ['Volcanoes no longer erupt', 'Because of the time scale of 4.6 billion years', 'There was no oxygen', 'The oceans hide it'], ans: 1,
      why: 'The time scale of 4.6 billion years limits the evidence, so we have theories rather than certainty.' },
    { type: 'order', q: 'Put the events in the order they happened, oldest at the top.',
      items: ['Intense volcanic activity forms the early atmosphere', 'Water vapour condenses to form the oceans', 'Algae first produce oxygen', 'Plants evolve and oxygen gradually increases', 'Proportions of gases much the same as today'],
      why: 'Volcanoes, then oceans, then algae (2.7 billion years ago), then plants, then the last 200 million years.' }
  ];

  AE.DATA = {
    NODES: NODES, byaAt: byaAt, posOf: posOf, formatBya: formatBya,
    GASES: GASES, KEYS: KEYS, LAG: LAG, MILESTONES: MILESTONES, PHASES: PHASES,
    EQUATIONS: EQUATIONS, GLOSSARY: GLOSSARY, CARDS: CARDS, EVIDENCE: EVIDENCE, QUIZ: QUIZ
  };

  /* ── INTERPOLATION ──────────────────────────────────────────────────────
     interp(s) returns every value at slider position s, with the model gases
     re-normalised to 100. Smoothstep easing means values settle at keyframes. */
  function smooth(t) { return t * t * (3 - 2 * t); }
  function mix(a, b, e) { return a + (b - a) * e; }
  function mixVal(a, b, e) {
    if (Array.isArray(a)) return a.map(function (v, i) { return mix(v, b[i], e); });
    return mix(a, b, e);
  }
  AE.interp = function (s) {
    s = Math.min(1, Math.max(0, s));
    var n = KEYS.length - 1, f = s * n, i = Math.min(n - 1, Math.floor(f)), t = f - i;
    var a = KEYS[i], b = KEYS[i + 1], e = smooth(t), out = { s: s, seg: i, t: t };
    Object.keys(a).forEach(function (k) {
      if (k === 'gas' || k === 'bya') return;
      var ee = LAG[k] ? Math.pow(e, LAG[k]) : e;
      out[k] = mixVal(a[k], b[k], ee);
    });
    var gas = {}, tot = 0;
    GASES.forEach(function (g) { gas[g.id] = Math.max(0, mix(a.gas[g.id], b.gas[g.id], e)); tot += gas[g.id]; });
    GASES.forEach(function (g) { gas[g.id] = gas[g.id] / tot * 100; });
    out.gas = gas;
    out.bya = byaAt(s);
    out.phase = s > 0.985 ? n : i;         // the last phase once we are at Today
    out.words = PHASES[out.phase].words;
    return out;
  };
})();
