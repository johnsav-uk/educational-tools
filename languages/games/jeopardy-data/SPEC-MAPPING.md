# Language Jeopardy: specification mapping and how to extend it

Page: `languages/games/language-jeopardy.html` (beta). Reference for look and behaviour:
`games/science/science-jeopardy.html`, which is untouched.

## Files

| File | Role |
| --- | --- |
| `language-jeopardy.html` | The game. Its inline CSS is a verbatim copy of the Science page's; the script is the Science script with a setup step (board, language, six topics) in front and a loader that turns the data below into the Science `DATA` shape. |
| `language-jeopardy-sst.css` | Copy of `games/science/gameshow-sst.css` in Savage Language Tools' coral, plus focus rings and the topic chips. Kept separate so Science changes never reach this page. |
| `jeopardy-data/spec-map.js` | Which official topic each column is, per board, and which question strands feed it. |
| `jeopardy-data/french.js`, `spanish.js`, `german.js` | The question banks, one file per language. |

## Specifications used

| Board | Specification | Cohort | Source |
| --- | --- | --- | --- |
| AQA | GCSE French 8652, German 8662, Spanish 8692 | First teaching Sept 2024, first exams summer 2026 | AQA "3.1 Themes" pages and the "first teaching in 2024" specification, aqa.org.uk |
| Pearson Edexcel | GCSE (9-1) French 1FR1, German 1GN1, Spanish 1SP1 | First teaching Sept 2024, first certification 2026 (Issue 1, Dec 2023) | Pearson specification PDF: "Thematic contexts" (p.7) and Appendix 2: Grammar |

The older AQA courses (8658 / 8668 / 8698, twelve topics) are not used. Note that
the Connect 4 games elsewhere on the site still quote older topic lists.

## Column mapping

Each column shows a short heading; its tooltip and its setup chip carry the official wording.

**AQA** (nine official topics, plus two grammar columns; choose any six):

| Column | Official reference | Strand |
| --- | --- | --- |
| Identity and relationships with others | Theme 1 People and lifestyle, Topic 1 | `identity` |
| Healthy living and lifestyle | Theme 1, Topic 2 | `healthy` |
| Education and work | Theme 1, Topic 3 | `education` |
| Free-time activities | Theme 2 Popular culture, Topic 1 | `freetime` |
| Customs, festivals and celebrations | Theme 2, Topic 2 | `customs` |
| Celebrity culture | Theme 2, Topic 3 | `celebrity` |
| Travel and tourism, including places of interest | Theme 3 Communication and the world around us, Topic 1 | `travel` |
| Media and technology | Theme 3, Topic 2 | `media` |
| The environment and where people live | Theme 3, Topic 3 | `environment` |
| Grammar: verbs and tenses | Section 3.2 Grammar | `g-verbs` |
| Grammar: nouns, adjectives and word order | Section 3.2 Grammar | `g-forms` |

**Pearson Edexcel** (six official thematic contexts, plus the same two grammar columns). Pearson gives
contexts and an indicative, non-exhaustive list of subjects but no sub-topics, so each context takes the
strands that cover its listed subjects. The strand-to-context assignment is a judgement made for this
game, not something Pearson states.

| Column | Subjects Pearson lists | Strands |
| --- | --- | --- |
| My personal world | family, friends, relationships | `identity`, `customs` |
| Lifestyle and wellbeing | food and drink, sports, physical and mental wellbeing | `healthy`, `freetime` |
| My neighbourhood | places in town, the natural world, environmental issues | `environment` |
| Media and technology | social media and gaming, music, TV and film | `media`, `celebrity` |
| Studying and my future | school, future opportunities | `education` |
| Travel and tourism | transport, tourist attractions, accommodation | `travel` |
| Grammar (two columns) | Appendix 2: Grammar | `g-verbs`, `g-forms` |

## Content: what exists, honestly

- 165 questions per language (11 strands x 5 tiers x 3 questions), 495 in total.
  Each board/language combination can reach all 165 of its language's questions, so each of the six
  combinations has more than 100 questions.
- **The two boards share one pool per language.** A question is filed under a topic strand, and each
  board's columns are built from the strands, so many questions appear under both boards. This is
  accurate where the topics overlap, but there are no Edexcel-only or AQA-only items yet. Board-specific
  questions (for example Edexcel's picture-task contexts, or AQA's "Celebrity culture" depth) are the
  obvious next addition.
- Tiers: 100 single words, 200 short phrases, 300 a grammar form, 400 a sentence, 500 an extended or
  multi-tense sentence. "Higher" in a note marks a structure from the Higher-only grammar lists.
- Grammar limited to what both specifications' current lists allow. No subjunctive, pluperfect or
  imperfect-subjunctive "if" clauses (so no Spanish or German "if I had" questions). French uses si + imperfect + conditional (not a
  subjunctive), flagged Higher.
- Each question has a stable ID built from its place in the bank: `fr-travel-300-2`
  (language code, strand, points, position within that tier). Never reorder or delete; only add.
- Fields per question: points, question, answer, alternatives (`" | "` separated, shown as "Also accept"),
  and a teacher note (rule, marking point or "Higher" flag). The page marks the answer with the
  language's `lang` code for screen readers where the answer is target-language text.

## Not yet verified (gaps)

- Questions were written and checked by reading, not by a language specialist or against each
  specification's prescribed vocabulary list (Pearson Appendix 1; AQA's list). Some words may fall
  outside a given board's list. A teacher or head of languages should review before it leaves beta.
- The Spanish and German Pearson and AQA specification PDFs were not read in full; their themes and
  contexts were confirmed from the official AQA theme pages and Pearson's published context list.
  French was checked in more depth (Pearson spec PDF text, AQA grammar page).
- Coverage of every sub-topic is not claimed; 15 questions per topic is a sample.
- No `assets/img/tools/language-jeopardy.png` thumbnail yet (1600x1000, site bar cropped). The tile
  falls back to the striped placeholder.

## Adding questions

Append a row to the right strand array in the language file, as
`[points, "question", "answer", "alt one | alt two", "note"]`. Currently the loader and the checks expect
exactly three per tier per strand, so to add more than three, change the loader in `variantsFor` as well
(it already picks randomly among however many it finds) and keep IDs stable. To add a column, add an
entry to `spec-map.js` (and a strand to each language file) and the setup chips pick it up.
