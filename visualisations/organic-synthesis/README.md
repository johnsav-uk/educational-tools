# Organic Synthesis Pathways (beta)

Students turn a starting molecule into a target by choosing a reagent and
conditions for each step. The page draws every product, explains why a step
worked or failed, and accepts any valid route. It covers AQA GCSE Chemistry 8462
(4.7) and AQA A-level Chemistry 7405 (3.3), and follows the specifications as
closely as AQA's pages and mark schemes allow.

It is an Explore tool: it has presenter mode, A4 worksheets with a separate mark
scheme (GCSE 25 marks, A-level 40 marks) and the site-wide annotation layer. There
is no build step and no runtime dependency beyond `assets/sst/`: open the page
over http and it runs.

## What students do

- Pick a puzzle (10 GCSE, 20 A-level, 2 "Beyond AQA") or **Free explore**.
- Choose a reagent card and its conditions, then press **React**. The reagent
  sits above the arrow and the conditions below it, as in an exam answer. Wrong
  choices are explained and listed as "tried"; they never join the pathway.
- Work **forwards** from the start or **backwards** from the target (pick the
  molecule that would make it). The puzzle is solved when the two chains meet.
- Any valid route counts. The banner shows how many routes the student has
  found of those that exist, and flags a route through a **minor product** as
  poor (it does not solve the puzzle).
- Four tiers of hints, from the target's functional group to the full step.
- A-level steps carry the AQA mechanism name, the attacking species, the key
  intermediate, whether AQA asks for the mechanism, and a link to the curly
  arrows in `../organic-reaction-mechanisms/#mech=<scene>`.
- `?print=ws-alevel,ms-alevel` (or ws/ms with `gcse`) prints the worksheet and
  mark scheme directly. A plain Ctrl+P prints the GCSE worksheet only.

## How the pieces fit

| File | What it does |
| --- | --- |
| `js/data.js` | Everything chemical, as plain data: 82 molecules (SMILES, names, formulae, Mr, groups) plus 3 formula-only species, the reagent cards and condition profiles, the 40 reaction rules with their edges (which molecule turns into which), and the tables of observations and clear non-reactions. |
| `js/engine.js` | Pure functions, no DOM: `react`, `routes`, `makers` (reverse planning), `checkRoute`, `hint`, `balance`, equation expansion. Deterministic: no run-time guessing and no library. |
| `js/structure.js` | SMILES reader and 2D layout (a simpler cousin of the molecule builder's, which is left untouched), SVG drawing in displayed, skeletal and structural styles, and a functional-group detector used to check the data. |
| `js/challenges.js` | The puzzles and, for each, routes the engine must accept (test fixtures). |
| `js/content.js` | The worksheet and mark-scheme questions, rendered from engine answers, plus `check()`, which runs every answer back through the engine. |
| `js/ui.js` | The page: pathway, reagent shelf, next-step panel (direction, reagent, conditions, React, product choice), explanation, hints, presenter sizing, printing. |
| `synthesis.css` | Styles. Colours come from the `--sst-*` tokens, so light and dark need no code. |
| `tests.html`, `js/tests.js`, `js/pagetests.js` | The acceptance tests (below). |

Every product is a catalogue molecule linked by an explicit edge, so an outcome
the engine returns can never be a structure the page cannot draw. A reaction
that is real but not in the table is reported as `beyond`, never `none`. Rules
supply the reaction type, specification reference, mechanism and explanation;
edges supply the products, major/minor roles and any notes.

## Levels

- GCSE shows 14 reagent cards and only GCSE conditions: no UV, distil, reflux or
  thermal cracking; no [O] equations (a word equation is used for oxidation); no
  mechanisms; "propanol" and "butene". Propene + steam gives either propanol, as
  GCSE credits, with propan-2-ol badged A-level.
- A-level adds the A-level cards, mechanisms, major and minor products and
  racemic products. 3.3.8 onwards is A-level only.
- **Beyond AQA** (A-level, off by default) adds three real reactions that are on
  neither specification: alcohol to bromoalkane (NaBr/H₂SO₄), carboxylic acid to
  acyl chloride (SOCl₂) and nitrile hydrolysis. They are badged wherever they show.

## Tests

```bash
node js/tests.js
```

runs the 138 engine, data, structure and question tests (sections D, C, F, W, R,
L, M, I, S and Q of the plan). `tests.html` runs the same tests and then 65
page tests that drive the real page in a hidden frame (section P: site bar,
solving puzzles by clicking, level separation, backward planning, light and
dark, presenter audit, the molecule builder as a name oracle, print setup). Serve
the repo, then open it, or run it headless:

```bash
python -m http.server 8765 --directory ../..
msedge --headless --disable-gpu --virtual-time-budget=60000 --dump-dom http://localhost:8765/visualisations/organic-synthesis/tests.html
```

`window.TEST_RESULT` holds `{ pass, fail, failures, done }`.

## Adding to it

A molecule needs a row in `MOLROWS` and, if it can react (`N`), an edge for every
rule whose group list matches it. Test C1 fails until every `N` molecule has an
answer for every card and condition on every shelf. A reaction is a rule (with
`use` card/profile pairs, `groups`, explanation, equation template and mechanism)
plus its edges. Equation templates use `{s}` substrate, `{p}` and `{q}` products,
`{pt}` the card's partner, `{X}` the halogen; every expanded equation is checked
for atom balance.

## Limitations

- **Closed world.** Only the 85 species in `data.js`. That is deliberate: it is
  what lets every outcome be checked.
- **Linear routes only.** A partner (ethanol, ethanoyl chloride, ethylamine)
  comes from the shelf, never from a branch the student made.
- **Major and minor products are qualitative.** No yields or ratios.
- **Not modelled:** polymers, amino acids, combustion, biodiesel and soaps,
  aspirin, Zaitsev ranking, E/Z products of additions, stereochemistry beyond
  "racemic", halogen carriers, substituted-ring chemistry.
- **Steam hydration** has no scene in the mechanisms tool. The page gives the
  mechanism in three text steps and links the nearest scene (ethene + H₂SO₄);
  a hydration scene is a candidate addition to `organic-reaction-mechanisms/`.
- **Presenter mode** draws structures at the board's label size, so a long
  chain such as displayed decane takes real room and the stage scrolls (the
  molecule being worked on is kept in view). Skeletal style is more compact.
- **Beta:** it comes out of beta once it has been through a lesson.
