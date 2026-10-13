# Who Wants to Be a Language Millionaire? (beta)

GCSE French, German and Spanish for AQA (8652 / 8662 / 8692) and Pearson Edexcel (1FR1 / 1GN1 / 1SP1),
both first taught September 2024, in the style of a televised million-pound quiz. The sister of
`games/science/millionaire/`: the same stage, prize ladder, safety nets, lifelines and sound.

## What is shared and what is this game's own

| File | Where | Job |
| --- | --- | --- |
| `engine.js`, `lifelines.js`, `select.js`, `audio.js`, `millionaire.css` | `games/science/millionaire/` | Loaded unchanged from the science game. A change there reaches both games. |
| `taxonomy.js` | here | Topics (`SSM.TAX`), the three languages and their spec codes, `SSM.specRef`, the Phone a Friend characters (`SSM.PERSONAS`). |
| `ui.js` | here | Fork of the science `ui.js`: a Language choice replaces Course, the bank is chosen by language, no sub/superscript markup (a gap is `___`). |
| `millionaire-lang.css` | here | Coral for the setup screen, the speech-bubble intro mark, the show's name in the target language. |
| `bank/helper.js`, `bank/french.js`, `german.js`, `spanish.js` | here | The questions. |
| `tests/validate-bank.js` | here | `node languages/games/millionaire/tests/validate-bank.js [french]` |

The selection engine is passed the language as its `course`; it only ever excludes on `course === 'combined'`,
so nothing is filtered by it, and `specRef` uses it to print the right spec code under each answer.

## Topics

Grouped as AQA's three themes plus grammar. Each unit also names its Pearson Edexcel thematic context, which is
shown instead when the board is Edexcel. The mapping follows Language Jeopardy (`../jeopardy-data/SPEC-MAPPING.md`).

| Unit | AQA | Pearson Edexcel |
| --- | --- | --- |
| P1 Identity and relationships | Theme 1, Topic 1 | 1 My personal world |
| P2 Healthy living and lifestyle | Theme 1, Topic 2 | 2 Lifestyle and wellbeing |
| P3 Education and work | Theme 1, Topic 3 | 5 Studying and my future |
| P4 Equality and respect | not in AQA | 1 My personal world |
| P5 Mental wellbeing | not in AQA | 2 Lifestyle and wellbeing |
| C1 Free-time activities | Theme 2, Topic 1 | 2 Lifestyle and wellbeing |
| C2 Customs, festivals and celebrations | Theme 2, Topic 2 | 1 My personal world |
| C3 Celebrity culture | Theme 2, Topic 3 | 4 Media and technology |
| W1 Travel and tourism | Theme 3, Topic 1 | 6 Travel and tourism |
| W2 Media and technology | Theme 3, Topic 2 | 4 Media and technology |
| W3 Environment and where people live | Theme 3, Topic 3 | 3 My neighbourhood |
| W4 Shopping | not in AQA | 3 My neighbourhood |
| W5 Transport | not in AQA | 6 Travel and tourism |
| G1 Verbs and tenses | Section 3.2 Grammar | Appendix 2 Grammar |
| G2 Nouns, adjectives, pronouns and word order | Section 3.2 Grammar | Appendix 2 Grammar |

Units marked `edxOnly` (P4, P5, W4, W5) are never offered in an AQA game.

## Question bank

`SSM.addBank('french', 'P1', [ row, … ])`, one call per unit. A row is
`[ sub, tier, difficulty, kind, question, [correct, best wrong, wrong, wrong], explanation, flags? ]`, as in the
science bank, with kinds `V` vocabulary, `T` translation, `G` grammar, `R` reading, `C` culture.

* Ten questions per subtopic (two at each difficulty 1–5), twelve in the single-subtopic Edexcel-only units.
* Difficulty 1–3 are Foundation; difficulty 4 has one Foundation and one Higher item per subtopic; 5 is Higher.
* Grammar stays inside both boards' 2024 lists: no subjunctive, no pluperfect.
* Ids are `fr-P1-07` (language code, unit, row). Append rows; never insert or reorder.

## Not yet verified

The questions were written and checked by reading, not by a languages specialist or against each board's
prescribed vocabulary list. A head of languages should look through them before the game leaves beta, and
it should be played in class.
