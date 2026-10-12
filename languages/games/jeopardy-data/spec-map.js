/* Language Jeopardy: specification map.
   Records, for every exam board, which official topic each Jeopardy column stands for and which
   question strands (see french.js / spanish.js / german.js) feed it. The same table is written up
   in ../../../languages/games/jeopardy-data/SPEC-MAPPING.md.

   Sources (checked October 2026):
   - AQA GCSE French 8652 / German 8662 / Spanish 8692, "3.1 Themes" pages on aqa.org.uk and
     the specification "for first teaching in 2024". Nine topics in three themes, plus the
     prescribed grammar (section 3.2). The earlier 8658 / 8668 / 8698 course, with twelve topics,
     is NOT used here.
   - Pearson Edexcel GCSE (9-1) French 1FR1, German 1GN1, Spanish 1SP1, specification Issue 1
     (December 2023), "Thematic contexts" (page 7) and Appendix 2: Grammar. First teaching
     September 2024, first certification 2026. Pearson lists six broad contexts and an indicative
     (non-exhaustive) list of subjects, and no sub-topics, so each context here is mapped to the
     AQA-style strands by subject overlap. That mapping is a judgement, not a Pearson statement.

   About "strands": a strand is a bank of 15 questions (3 at each of 100-500 points). A column
   built from two strands has 6 questions per points tier and picks one at random for each game. */
window.LJ_SPEC = {
  languages: {
    french:  { name: "French",  code: "fr", html: "fr" },
    spanish: { name: "Spanish", code: "es", html: "es" },
    german:  { name: "German",  code: "de", html: "de" }
  },
  boards: {
    aqa: {
      name: "AQA",
      full: "AQA GCSE",
      cohort: "First teaching September 2024, first exams summer 2026",
      codes: { french: "8652", spanish: "8692", german: "8662" },
      note: "Nine topics in three themes, plus the prescribed grammar. Questions stay inside the Foundation and Higher grammar lists, which have no subjunctive.",
      categories: [
        { id: "a-t1-1", label: "Identity and relationships with others", short: "Identity & relationships", ref: "Theme 1: People and lifestyle, Topic 1", strands: ["identity"] },
        { id: "a-t1-2", label: "Healthy living and lifestyle", short: "Healthy living & lifestyle", ref: "Theme 1: People and lifestyle, Topic 2", strands: ["healthy"] },
        { id: "a-t1-3", label: "Education and work", short: "Education & work", ref: "Theme 1: People and lifestyle, Topic 3", strands: ["education"] },
        { id: "a-t2-1", label: "Free-time activities", short: "Free-time activities", ref: "Theme 2: Popular culture, Topic 1", strands: ["freetime"] },
        { id: "a-t2-2", label: "Customs, festivals and celebrations", short: "Customs & festivals", ref: "Theme 2: Popular culture, Topic 2", strands: ["customs"] },
        { id: "a-t2-3", label: "Celebrity culture", short: "Celebrity culture", ref: "Theme 2: Popular culture, Topic 3", strands: ["celebrity"] },
        { id: "a-t3-1", label: "Travel and tourism, including places of interest", short: "Travel & tourism", ref: "Theme 3: Communication and the world around us, Topic 1", strands: ["travel"] },
        { id: "a-t3-2", label: "Media and technology", short: "Media & technology", ref: "Theme 3: Communication and the world around us, Topic 2", strands: ["media"] },
        { id: "a-t3-3", label: "The environment and where people live", short: "Environment & where people live", ref: "Theme 3: Communication and the world around us, Topic 3", strands: ["environment"] },
        { id: "a-g-1", label: "Grammar: verbs and tenses", short: "Grammar: verbs & tenses", ref: "Section 3.2 Grammar (verb phrases)", strands: ["g-verbs"] },
        { id: "a-g-2", label: "Grammar: nouns, adjectives and word order", short: "Grammar: nouns, adjectives & word order", ref: "Section 3.2 Grammar (noun, adjectival and adverbial phrases)", strands: ["g-forms"] }
      ],
      defaults: ["a-t1-1", "a-t1-3", "a-t2-1", "a-t3-1", "a-t3-2", "a-g-1"]
    },
    edexcel: {
      name: "Pearson Edexcel",
      full: "Pearson Edexcel GCSE",
      cohort: "First teaching September 2024, first certification 2026 (Issue 1)",
      codes: { french: "1FR1", spanish: "1SP1", german: "1GN1" },
      note: "Pearson sets six broad thematic contexts and an indicative list of subjects, not sub-topics. Each column is one context; questions are drawn from the strands that cover its listed subjects.",
      categories: [
        { id: "e-c1", label: "My personal world", short: "My personal world", ref: "Thematic context 1 (family, friends, relationships; customs and celebrations)", strands: ["identity", "customs"] },
        { id: "e-c2", label: "Lifestyle and wellbeing", short: "Lifestyle & wellbeing", ref: "Thematic context 2 (food and drink, sports, physical and mental wellbeing; free time)", strands: ["healthy", "freetime"] },
        { id: "e-c3", label: "My neighbourhood", short: "My neighbourhood", ref: "Thematic context 3 (places in town, the natural world, environmental issues)", strands: ["environment"] },
        { id: "e-c4", label: "Media and technology", short: "Media & technology", ref: "Thematic context 4 (social media and gaming, music, TV and film)", strands: ["media", "celebrity"] },
        { id: "e-c5", label: "Studying and my future", short: "Studying & my future", ref: "Thematic context 5 (school, future opportunities such as work and travel)", strands: ["education"] },
        { id: "e-c6", label: "Travel and tourism", short: "Travel & tourism", ref: "Thematic context 6 (transport, tourist attractions, accommodation)", strands: ["travel"] },
        { id: "e-g-1", label: "Grammar: verbs and tenses", short: "Grammar: verbs & tenses", ref: "Appendix 2: Grammar (Verbs; Verbs: Tenses)", strands: ["g-verbs"] },
        { id: "e-g-2", label: "Grammar: nouns, adjectives and word order", short: "Grammar: nouns, adjectives & word order", ref: "Appendix 2: Grammar (Nouns, pronouns and determiners; Adjectives; Adverbs; Prepositions)", strands: ["g-forms"] }
      ],
      defaults: ["e-c1", "e-c2", "e-c3", "e-c4", "e-c5", "e-c6"]
    }
  }
};
