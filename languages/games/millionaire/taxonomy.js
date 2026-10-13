/* Savage Language Tools — Who Wants to Be a Language Millionaire?
   Topic taxonomy for GCSE French, German and Spanish, AQA (8652 / 8662 / 8692) and Pearson Edexcel
   (1FR1 / 1GN1 / 1SP1), both first taught September 2024. The same topic strands as Language Jeopardy
   (../jeopardy-data/spec-map.js).

   Groups follow AQA's three themes plus grammar. Each unit also names the Pearson Edexcel thematic context
   it belongs to (edx). Pearson lists subjects AQA's nine topics do not name (equality, mental wellbeing,
   shopping, transport): those units carry edxOnly and are never offered in an AQA game.

   The science game's engine, lifelines, selection and audio are reused unchanged from
   games/science/millionaire/. This file stands in for its taxonomy: SSM.TAX, SSM.specRef, and the
   Phone a Friend personas (SSM.PERSONAS). */
(function (root) {
  'use strict';
  var SSM = root.SSM = root.SSM || {};

  var LANGS = {
    french:  { id: 'french',  name: 'French',  code: 'fr', show: 'Qui veut gagner des millions ?', codes: { AQA: '8652', Edexcel: '1FR1' } },
    german:  { id: 'german',  name: 'German',  code: 'de', show: 'Wer wird Millionär?', codes: { AQA: '8662', Edexcel: '1GN1' } },
    spanish: { id: 'spanish', name: 'Spanish', code: 'es', show: '¿Quién quiere ser millonario?', codes: { AQA: '8692', Edexcel: '1SP1' } }
  };

  var EDX = {
    1: 'Thematic context 1 · My personal world',
    2: 'Thematic context 2 · Lifestyle and wellbeing',
    3: 'Thematic context 3 · My neighbourhood',
    4: 'Thematic context 4 · Media and technology',
    5: 'Thematic context 5 · Studying and my future',
    6: 'Thematic context 6 · Travel and tourism',
    G: 'Appendix 2 · Grammar'
  };

  function U(id, name, short, aqa, edx, extra) {
    var u = { id: id, subj: id.charAt(0), name: name, short: short, aqa: aqa, edx: edx };
    if (extra) for (var k in extra) u[k] = extra[k];
    return u;
  }

  var units = {
    P1: U('P1', 'Identity and relationships with others', 'Identity & relationships', 'Theme 1, Topic 1', EDX[1]),
    P2: U('P2', 'Healthy living and lifestyle', 'Healthy living', 'Theme 1, Topic 2', EDX[2]),
    P3: U('P3', 'Education and work', 'Education & work', 'Theme 1, Topic 3', EDX[5]),
    P4: U('P4', 'Equality and respect', 'Equality', '', EDX[1], { edxOnly: true }),
    P5: U('P5', 'Mental wellbeing', 'Wellbeing', '', EDX[2], { edxOnly: true }),
    C1: U('C1', 'Free-time activities', 'Free time', 'Theme 2, Topic 1', EDX[2]),
    C2: U('C2', 'Customs, festivals and celebrations', 'Festivals', 'Theme 2, Topic 2', EDX[1]),
    C3: U('C3', 'Celebrity culture', 'Celebrity culture', 'Theme 2, Topic 3', EDX[4]),
    W1: U('W1', 'Travel and tourism, including places of interest', 'Travel & tourism', 'Theme 3, Topic 1', EDX[6]),
    W2: U('W2', 'Media and technology', 'Media & technology', 'Theme 3, Topic 2', EDX[4]),
    W3: U('W3', 'The environment and where people live', 'Environment & home', 'Theme 3, Topic 3', EDX[3]),
    W4: U('W4', 'Shopping', 'Shopping', '', EDX[3], { edxOnly: true }),
    W5: U('W5', 'Transport', 'Transport', '', EDX[6], { edxOnly: true }),
    G1: U('G1', 'Verbs and tenses', 'Verbs & tenses', 'Section 3.2 Grammar', EDX.G),
    G2: U('G2', 'Nouns, adjectives, pronouns and word order', 'Nouns & word order', 'Section 3.2 Grammar', EDX.G)
  };

  var SUBS = [
    ['P1', 'id1', 'Family and describing people'],
    ['P1', 'id2', 'Friends, relationships and getting on'],
    ['P2', 'he1', 'Food, drink and diet'],
    ['P2', 'he2', 'Sport, exercise and healthy habits'],
    ['P3', 'ed1', 'School subjects and school life'],
    ['P3', 'ed2', 'Jobs, work and future plans'],
    ['P4', 'eq1', 'Equality, inclusion and respect'],
    ['P5', 'wb1', 'Mental wellbeing and stress'],
    ['C1', 'ft1', 'Hobbies, sport and going out'],
    ['C1', 'ft2', 'Music, film, TV and reading'],
    ['C2', 'cu1', 'Festivals and special days'],
    ['C2', 'cu2', 'Celebrating with family and friends'],
    ['C3', 'ce1', 'Famous people and fame'],
    ['C3', 'ce2', 'Influencers and role models'],
    ['W1', 'tr1', 'Holidays and places of interest'],
    ['W1', 'tr2', 'Accommodation, booking and holiday problems'],
    ['W2', 'me1', 'Social media and the internet'],
    ['W2', 'me2', 'Phones, gaming and technology'],
    ['W3', 'en1', 'Home, town and region'],
    ['W3', 'en2', 'Environmental problems and solutions'],
    ['W4', 'sh1', 'Shopping for food, clothes and presents'],
    ['W5', 'tp1', 'Getting around: transport'],
    ['G1', 'gv1', 'Present tense'],
    ['G1', 'gv2', 'Past tenses'],
    ['G1', 'gv3', 'Future and conditional'],
    ['G2', 'gf1', 'Gender, articles and adjective agreement'],
    ['G2', 'gf2', 'Pronouns, negatives, questions and word order']
  ];
  var subs = {};
  SUBS.forEach(function (s) { subs[s[0] + ':' + s[1]] = { id: s[0] + ':' + s[1], unit: s[0], label: s[2] }; });

  SSM.TAX = {
    langs: LANGS,
    subjects: [
      { id: 'P', name: 'People and lifestyle', units: ['P1', 'P2', 'P3', 'P4', 'P5'] },
      { id: 'C', name: 'Popular culture', units: ['C1', 'C2', 'C3'] },
      { id: 'W', name: 'The world around us', units: ['W1', 'W2', 'W3', 'W4', 'W5'] },
      { id: 'G', name: 'Grammar', units: ['G1', 'G2'] }
    ],
    units: units,
    subs: subs
  };

  /* Reference line shown under each answer. The selection engine passes the language as "course". */
  SSM.specRef = function (u, board, lang) {
    var unit = units[u]; if (!unit) return '';
    var L = LANGS[lang] || LANGS.french;
    if (board === 'Edexcel') return 'Pearson Edexcel ' + L.codes.Edexcel + ' · ' + unit.edx;
    return 'AQA ' + L.codes.AQA + ' · ' + (unit.aqa || 'Pearson Edexcel only');
  };

  SSM.PERSONAS = [
    { name: 'Amélie', role: 'your French exchange partner' },
    { name: 'Jonas', role: 'a friend who spent a year in Berlin' },
    { name: 'Lucía', role: 'a Year 12 studying Spanish A level' },
    { name: 'Mr Okoye', role: 'a retired languages teacher' },
    { name: 'Sam', role: 'a friend from the school quiz team' }
  ];
})(typeof window !== 'undefined' ? window : globalThis);
