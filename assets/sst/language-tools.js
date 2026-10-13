// Savage Language Tools catalogue: the sister site to Savage Science Tools.
// Same shape as tools.js, read by languages/index.html and by the site bar on
// every page under languages/. url is relative to the repo root, as in tools.js.
//
// kind:     "Revision Game" for games; anything else is an Explore tool.
// tags:     include the language ("French" | "German" | "Spanish"); it drives the
//           tile's pill and the homepage's language filter.
// levels:   "KS3" | "GCSE" | "A-Level", as in tools.js.
// keywords: hidden synonym string, never rendered: topic names, spec codes, the
//           words a teacher types in the target language.
// image:    16:10 screenshot under assets/img/tools/.
window.SLT_TOOLS = [
  { title: "French Connect 4", url: "languages/games/french-connect4.html",
    blurb: "Puissance 4: pick a GCSE topic, then answer French vocabulary questions to drop your counters.",
    kind: "Revision Game", levels: ["GCSE"], tags: ["French", "Revision Game", "Interactive"],
    image: "french-connect4.png", featured: true,
    keywords: "french francais français puissance 4 connect four vocabulary vocab mfl languages modern foreign aqa gcse 8652 team game starter plenary retrieval" },

  { title: "German Connect 4", url: "languages/games/german-connect4.html",
    blurb: "Vier gewinnt: pick a GCSE topic, then answer German vocabulary questions to drop your counters.",
    kind: "Revision Game", levels: ["GCSE"], tags: ["German", "Revision Game", "Interactive"],
    image: "german-connect4.png", featured: true,
    keywords: "german deutsch vier gewinnt connect four vocabulary vocab mfl languages modern foreign aqa gcse 8662 team game starter plenary retrieval" },

  { title: "Spanish Connect 4", url: "languages/games/spanish-connect4.html",
    blurb: "Conecta 4: pick a GCSE topic, then answer Spanish vocabulary questions to drop your counters.",
    kind: "Revision Game", levels: ["GCSE"], tags: ["Spanish", "Revision Game", "Interactive"],
    image: "spanish-connect4.png", featured: true,
    keywords: "spanish espanol español conecta 4 connect four vocabulary vocab mfl languages modern foreign edexcel pearson gcse 1sp1 team game starter plenary retrieval" },

  { title: "Language Jeopardy (beta)", url: "languages/games/language-jeopardy.html",
    blurb: "Pick six GCSE topics for AQA or Pearson Edexcel French, Spanish or German, then win points for translating, conjugating and decoding.",
    kind: "Revision Game", levels: ["GCSE"], tags: ["French", "German", "Spanish", "Revision Game", "Interactive"],
    image: "language-jeopardy.png",
    keywords: "jeopardy board quiz categories points team game starter plenary retrieval translation grammar vocabulary aqa 8652 8662 8692 edexcel pearson 1fr1 1gn1 1sp1 french francais german deutsch spanish espanol mfl languages modern foreign thematic contexts identity relationships healthy living education work free time customs festivals celebrity travel tourism media technology environment" },

  { title: "Who Wants to Be a Language Millionaire? (beta)", url: "languages/games/millionaire/",
    blurb: "Climb a fifteen-question prize ladder in GCSE French, German or Spanish for AQA or Pearson Edexcel, with 50:50, Ask the Audience and Phone a Friend.",
    kind: "Revision Game", levels: ["GCSE"], tags: ["French", "German", "Spanish", "Revision Game", "Interactive"],
    image: "language-millionaire.png",
    keywords: "who wants to be a millionaire language millionaire qui veut gagner des millions wer wird millionar millionär quien quiere ser millonario quiz game show multiple choice lifelines 50:50 fifty fifty ask the audience phone a friend safety net prize ladder starter plenary revision whiteboard class aqa 8652 8662 8692 edexcel pearson 1fr1 1gn1 1sp1 french francais français german deutsch spanish espanol español mfl languages modern foreign foundation higher vocabulary vocab grammar tenses translation identity relationships healthy living education work free time customs festivals celebrity travel tourism media technology environment shopping transport equality wellbeing" },

  { title: "Interleaved Grid Challenge", url: "languages/games/interleaved-grid.html",
    blurb: "Pick a card from a grid of French, Spanish or German translations, worth more points the longer ago the topic was taught, and push for the higher-tier bonus.",
    kind: "Revision Game", levels: ["GCSE"], tags: ["French", "German", "Spanish", "Revision Game", "Interactive"],
    image: "interleaved-grid.png",
    keywords: "interleaving interleaved spaced retrieval practice grid challenge translation english to target language sentence builder higher tier foundation bonus aqa 8652 8662 8692 edexcel pearson 1fr1 1gn1 1sp1 passe compose être avoir reflexive preterite imperfect preterito imperfecto subjunctive subjuntivo weil dass obwohl word order verb second inversion team game starter plenary text to speech" }
];
