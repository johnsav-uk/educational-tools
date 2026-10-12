# Who Wants to Be a Science Millionaire? (beta)

A GCSE science game in the style of a televised million-pound quiz: fifteen four-option questions, a prize ladder
with safety nets at £1,000 and £32,000, and three lifelines (50:50, Ask the Audience, Phone a Friend). Teachers choose
board, course, tier, difficulty, game length and topics before the game starts.

Static page, no build step, no backend, no external services. Plain scripts (no modules) so it works from
`file://` as well as GitHub Pages. Original artwork and original synthesised audio only.

## Files

| File | Job |
| --- | --- |
| `index.html` | Page: teacher setup, stage, panels. Loads the site bar (`assets/sst/sst.js`). |
| `millionaire.css` | Setup uses the site's `--sst-*` tokens (light and dark). The stage has its own dark navy / blue / amber set and stays dark in both site themes. |
| `taxonomy.js` | Units (B1–B7, C1–C10, P1–P8, AQA order), subtopics (reused from the Science Retrieval Presenter), Edexcel nearest topics, `specRef()`. `sepOnly` / `htOnly` flags decide what Combined and Foundation games may contain. |
| `engine.js` | Pure rules + explicit state machine, ladders (15 / 10 / 5), seeded RNG. No DOM, no timers. |
| `lifelines.js` | 50:50, Ask the Audience, Phone a Friend. Local, seeded, difficulty-aware. |
| `select.js` | Question selection: filters, de-duplication, difficulty ladder, subject/topic balance, warnings. Separate from the UI. |
| `audio.js` | Web Audio sound design: 19 synthesised cues, thinking bed, ducking, mute, clean-up. No audio files. |
| `ui.js` | Setup screen and stage. All sound and timing is triggered from one engine listener. |
| `bank/` | Question bank, one file per unit (see below). |
| `tests/` | Node and browser tests (see below). |

## State machine

`ready → question ⇄ selected → locked → correct → question … → won`
`question | selected ⇄ lifeline`, `question | selected ⇄ walkConfirm → walkedAway`, `locked → wrong → gameOver`.

Timed events (`REVEAL`, `ADVANCE`, `FINISH`) must carry the epoch they were scheduled in. A stale epoch, a
repeat, or an event from the wrong state is rejected, so a double click or a late timer can never submit twice,
advance twice or replay a sound.

Prize rules: walking away pays everything won so far; a wrong answer pays the safety net only; a safety net is
guaranteed once the question carrying it has been answered correctly.

## Question bank

`bank/<unit>.js` calls `SSM.addBank('B1', [ row, … ])`. A row is
`[ sub, tier, difficulty, kind, question, [correct, best wrong, wrong, wrong], explanation, flags? ]`.

* `tier` `F` is suitable for a Foundation game; `H` is pitched at Higher (never shown in Foundation).
* `difficulty` 1–5 drives the ladder (and how reliable Audience and Friend are).
* `o[0]` is always the correct answer and `o[1]` the most tempting wrong answer; options are shuffled at run time
  so the right answer is spread over A–D with no run of three.
* `flags`: `{sep:1}` separate-science only; `{bd:'A'}` or `{bd:'E'}` one board only; `{tbl}` a table; `{fig}` a
  line or bar graph. Graph axes tick on round numbers automatically; `fig.xstep` / `fig.ystep` force a step
  (e.g. 6 for a half-life read off in hours).
* Ids are positional (`B1-07`): append new rows at the end, never insert or reorder.
* Text markup is shared with the Interleaved Grid: `_2` or `_{2n+2}` subscript, `^{2-}` superscript.

Check a change with `node tests/validate-bank.js` (structure, per-unit tier/difficulty coverage, answer-length bias).

## Layout on the board

Above 620px wide the stage must fit the window without scrolling. `fitStage()` in `ui.js` steps the text scale
`--ts` (font sizes, tile heights, graph height) down from 1 until it fits, about 0.6 at worst; it resets for each
question and on resize. Answers longer than 70 characters stack in one column. Phones scroll, with a sticky footer.

## Selection

`SSM.select.build(bank, config)` where config is `{ board, course, tier, difficulty, length, subs, seed }`.

1. Keep questions for the board, course and tier whose subtopic is ticked; drop duplicates.
2. Refuse (with the count) if fewer than `length` remain. Nothing is ever borrowed from unticked topics.
3. For each rung take a target difficulty (rising curve; Gentle −0.7, Challenge +0.8; squeezed for Foundation),
   pick the subject that is furthest behind its share (share grows with the number of topics ticked, up to three),
   then the best-fitting question in the least-used unit, avoiding the unit just used.
4. Sort so difficulty never falls, then break up same-unit neighbours.
5. Shuffle answer positions from the seed.

Same seed and settings give the same game (shown as the "game code").

## Tests

```bash
node tests/run.js              # engine, lifelines, selection, bank (46 checks)
node tests/validate-bank.js    # bank structure and coverage
```

Browser: serve the repo (`python -m http.server 8765`) and open `games/science/millionaire/tests/index.html`
(core tests plus an offline render of every audio cue, measuring level, clipping and tails). The interface suite,
`tests/ui-tests.js`, drives the real page with DOM events on a virtual clock: load it in `index.html` and run
`await SSM_UI_TESTS()`.
