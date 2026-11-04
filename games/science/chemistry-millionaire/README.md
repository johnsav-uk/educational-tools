# Who Wants to Be a Chemistry Millionaire? A-Level (beta)

AQA AS and A-level Chemistry (7404 / 7405) in the style of a televised million-pound quiz. The sister of
`games/science/millionaire/`: the same stage, prize ladder, safety nets, lifelines and sound.

## What is shared and what is this game's own

| File | Where | Job |
| --- | --- | --- |
| `engine.js`, `lifelines.js`, `select.js`, `audio.js`, `millionaire.css`, `bank/helper.js` | `games/science/millionaire/` | Loaded unchanged from the science game. A change there reaches this game too. |
| `taxonomy.js` | here | The 34 sections of the specification (`SSM.TAX`), `SSM.specRef`, and the A-level Phone a Friend characters (`SSM.PERSONAS`). |
| `ui.js` | here | Fork of the science `ui.js`: an AS / A-level choice replaces board, course and tier; spec references read `AQA 7405 · 3.1.9`. |
| `chem-millionaire.css` | here | Teal for all three branches on the setup screen; the benzene-ring intro mark. |
| `bank/physical.js`, `inorganic.js`, `organic.js` | here | The questions, one `SSM.addBank` call per spec section. |
| `tests/validate-bank.js` | here | `node games/science/chemistry-millionaire/tests/validate-bank.js [P|I|O|unit]` |

## How it maps onto the shared engine

* **Branches as subjects.** Unit ids start with `P` (3.1 Physical), `I` (3.2 Inorganic) or `O` (3.3 Organic), so the
  selection engine balances the three branches the way it balances Biology, Chemistry and Physics.
* **AS vs A-level.** A-level-only units (3.1.8–3.1.12, 3.2.4–3.2.6, 3.3.7–3.3.16) are flagged `sepOnly`. For an AS
  game `ui.js` passes the engine `course: 'combined'`, which leaves them out; for A-level it passes `'separate'`.
* **No tiers.** Every row is tier `H` and the game always runs as Higher, so difficulty 1–5 alone drives the ladder.

## Question bank

A row is `[ sub, 'H', difficulty, kind, question, [correct, best wrong, wrong, wrong], explanation, flags? ]`, as in
the science bank (kinds R P D X C M A; `tbl` and `fig` flags for tables and graphs; `_2`, `_{..}` and `^{..}` markup).
Write `E°` for standard electrode potentials. Multi-letter subscripts need braces (`ΔH_{at}`, `E_{cell}`): `_ab`
does not render, and the validator catches it.

399 questions: 154 Physical, 75 Inorganic, 170 Organic; 197 of them are in AS content. Ids are positional
(`P9-04`): append rows to the end of a unit, never insert or reorder.

## Not yet verified

The questions were written against the AQA 7405 specification and checked by reading. A chemistry teacher should
look through them before the game leaves beta, and it should be played in class.
