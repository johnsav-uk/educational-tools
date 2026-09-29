# Savage Science Tools — conventions

Site conventions for anything added to this repo. Read before adding a tool.

## One design system

Every page shares one look: a dark navy palette, Plus Jakarta Sans, flat
surfaces (no gradients, glows or drop shadows), hairline borders, blue for
Explore tools and violet for Play tools. The tokens live in
`assets/sst/sst.css` as `--sst-*` custom properties. Tools map their own
variables onto those tokens rather than inventing colours.

Where a canvas or three.js reads a colour through `getPropertyValue`, write it
as hex: three.js r128 cannot parse `oklch()`. The hex equivalents of the main
tokens are `#050e1a` (page), `#091321` (panel), `#0d1928` (card), `#182535`
(line), `#edf2f8` (text), `#8693a5` (muted), `#47b5fa` / `#0086dd` (blue) and
`#b199f4` / `#734dbe` (violet).

Some tools keep a light theme as an explicit choice from their own toggle. Dark
is always the default.

Fonts are vendored in `assets/sst/fonts/` (Plus Jakarta Sans, variable woff2,
OFL) and declared in `assets/sst/fonts.css`, which `sst.css` imports. Don't link
fonts.googleapis.com: school filters often block it, and the site has to keep
its typography there.

One typeface everywhere, counters and readouts included: no monospace, pixel or
seven-segment fonts, because their dotted or slashed zero reads badly. Where
digits change live, add `font-variant-numeric: tabular-nums` so they don't
jitter. `--sst-mono` survives only as an alias for the page font, and `sst.css`
maps Tailwind's `font-mono` onto the page font too.

## Every page carries the site bar

**Any new page in `visualisations/` or `games/` must load the site bar.** It
is the header across the top of every tool: logo home, the tool's name and
kind, and Explore / Play / Support / All tools (Support links to the homepage's
feedback form and Ko-fi). Without it a tool is a dead end: pupils
reach it from a link, a QR code or a shared URL, and there is nothing to
click to see everything else.

Two lines, adjusting the number of `../` to the page's depth:

```html
<link rel="stylesheet" href="../../assets/sst/sst.css">   <!-- last thing in <head> -->
<script src="../../assets/sst/sst.js"></script>            <!-- first thing in <body> -->
```

The script inserts the bar before anything else in `<body>`, so React mounting
into `#root` cannot remove it, and it reads the tool's title and kind from
`assets/sst/tools.js`. The bar is `var(--sst-bar-h)` (52px) tall, in flow: a
tool that fills the viewport sizes itself to `calc(100dvh - var(--sst-bar-h))`,
and a body laid out as a grid needs a row for it.

Shared skins sit beside the pages they serve, linked after `sst.css`:
`assets/sst/skin.css` for the dark "glass" template tools,
`games/science/gameshow-sst.css` for Jeopardy, Blockbusters and Who Dares Wins,
`languages/games/connect4-sst.css` for the Connect 4 games, plus
`tenable-sst.css` and `retrieval-sst.css`.

## Every new model has presenter mode, questions and annotation

**Every new Explore tool (`kind` `"3D Model"` or `"Interactive"`) ships with
all three of these.** Teachers use the tools at the front of the room, then
set work from them. `visualisations/radioactivity/` does all three and is
the pattern to copy.

**Presenter mode**, from a button in the tool's header. A tool can build its
own (Radioactivity) or describe itself to the shared one in
`assets/sst/presenter.js`: which element is the model, which are the teacher's
controls and which text becomes slides. It pins those over the board and hides
the rest without moving anything, so React and three.js apps keep working
(`visualisations/time-of-flight-mass-spectrometer/` is a short example). Quiz
games and quiz sections stay off the board. Either way:
- The tool fills the screen: the site bar and page header are hidden, and the
  model and its controls take the whole viewport.
- It keeps the site's normal colours. It is not a separate high-contrast
  theme. Text, readouts and canvas or chart labels get larger so they read
  from the back of the room.
- There's an Exit button, and Esc leaves presenter mode. A full-screen button
  is optional.
- `P` toggles it, unless focus is in a text field.

**Readable from the back of the room.** Presenter mode is for the board, so text
pupils read is sized like a PowerPoint slide and never shrunk to fit:
- Use the `--sst-pr-*` tokens in `sst.css`, which scale with the viewport:
  `--sst-pr-text` for body text (about 24pt on a slide), `--sst-pr-title` for
  headings, `--sst-pr-label` as the floor for anything a pupil reads (legends,
  axis labels, table cells, readout labels) and `--sst-pr-figure` for live
  readouts. Canvas, SVG and chart text get the size from
  `SST_PRESENT.px('--sst-pr-label')` in `assets/sst/present.js`.
- Too much text to fit? Split it into slides with `.sst-deck` from
  `present.js`: a caption band (`.sst-deck--strip`) under a model, a
  full-size deck, or `SST_PRESENT.fill()`, which measures and splits between
  sentences at whatever size the board is. PageUp/PageDown (a clicker) and the
  arrow keys turn the page. Never make the text smaller to fit.
- Controls only the teacher uses (mode buttons, sliders, keyboard hints) are
  exempt: mark them `.sst-teacher` and size them with `--sst-pr-control`.
- Check with `SST_PRESENT.audit()` in the console while presenting, at
  1920×1080, 1280×720 and 1024×768. It lists pupil-facing text under the
  floor. No slide should scroll.

**Questions**, exam-style for the tool's spec and level:
- A printable A4 student worksheet with marks shown per part and space to
  write. A graph, table or diagram to read from goes in as inline SVG or HTML.
- A separate teacher mark scheme with the marking points, the working for
  calculations, and "do not accept" notes where examiners use them.
- Printing goes through a small dialog of checkboxes, using `@media print`
  and `@page { size: A4 }`. Questions and their parts don't split across
  pages. A plain Ctrl+P must never print the mark scheme.

**Annotation**, a drawing layer over the whole page, from a button in the
header and in presenter mode. Every page in `visualisations/` gets it for free:
`sst.js` loads `assets/sst/annotate.js`, which puts an Annotate button in the
site bar and a round pen button in the corner whenever the bar is hidden
(presenter mode, full screen). A tool with its own layer (a `#inkCv` canvas, as
in Radioactivity) is left alone. Whichever you use, it must have:
- Pen, highlighter, eraser, undo, clear, a row of colour swatches plus a
  colour picker, and a thickness slider.
- A "use page" tool leaves the ink on screen while the model underneath
  stays clickable.
- `D` toggles it, and Esc closes the toolbar. Closing keeps the ink until
  Clear.
- Strokes are stored as points and redrawn on resize, so the ink survives
  going full screen.

## Subject and level colours

Carried in `assets/sst/sst.css` and on the homepage pills, by oklch hue:

| | |
| --- | --- |
| Chemistry | `--sst-chem` teal (hue 185) |
| Physics | `--sst-phys` violet (hue 295) |
| Biology | `--sst-bio` green (hue 145) |
| Mixed | amber (hue 75) |
| Languages | coral (hue 25) |

Keep the meaning consistent inside tools too.

## Adding a tool to the index

Add one entry to `assets/sst/tools.js`. The homepage catalogue, its counts and
filters, the featured row and every tool's site bar all read from this one list:

```js
{ title: "...", url: "visualisations/<folder>/",
  blurb: "One sentence, active voice, what the reader will actually do.",
  kind: "Interactive", levels: ["A-Level"], tags: ["AQA Chemistry", "Chemistry", "Interactive"],
  image: "<folder>.png",
  keywords: "hidden synonym string — exam language, spec codes, common misspellings" },
```

- `kind` is `"Revision Game"` (a Play tool) or `"3D Model"` / `"Interactive"`
  (Explore tools).
- `levels` lists every key stage the tool genuinely serves: `"KS3"`, `"GCSE"`,
  `"A-Level"`. One level shows on its tile as that level; two or more show as
  **Multi**, and the tool appears under each of its levels in the homepage's
  level filter as well as under Multi.
- `keywords` is never rendered. It is what makes exam-language searches land
  ("mass spec", "crude oil", "plum pudding"), so make it generous and include
  spec references.
- `image` is a 1600×1000 screenshot in `assets/img/tools/`, taken with the site
  bar cropped off. A missing file falls back to a striped placeholder.
- `featured: true` puts it in the homepage's "Featured tools" row.
- Label a tool that is not finished `(beta)` in its title.

## Savage Language Tools (the sister site)

Language tools live in `languages/`, with their own homepage at
`languages/index.html`: the science homepage's layout, header, Ko-fi, feedback
form and footer, in **coral** (`--sst-coral`, hue 32; hex `#f8907c`, button
`#d24f39`) where science is blue, with a two-speech-bubble mark in place of the
atom. The two homepages link to each other in the header, a "sister site" strip
and the footer.

- Catalogue: `assets/sst/language-tools.js` (`window.SLT_TOOLS`), same shape as
  `tools.js`, with the language (`"French"`, `"German"`, `"Spanish"`) in `tags`.
  Language tools do not go in `tools.js`.
- Pages sit at `languages/<kind>/<page>` so the usual two `../` reach `assets/`.
  They load the same `sst.css` / `sst.js`; the bar sees the `languages/` path and
  switches to the language brand and catalogue on its own.
- Language pill hues on that site: French 255, German 75, Spanish 340.
- The homepage reuses `assets/home/home.js`, configured by `window.SST_HOME`
  in `languages/index.html`, and `home.css` recoloured by `languages/languages.css`.
- `games/languages/*.html` are redirect stubs for old links and QR codes; leave them.

## Tools that need a build step

There is no node on this machine. Vendor libraries into the tool's own `lib/`
rather than loading from a CDN, and commit compiled output alongside its source.
`visualisations/aqa-chemistry-hub/` shows the pattern, including how to run Babel
through the browser when a JSX tool needs compiling.

## Previewing before pushing

Serve the repo and open the page you changed:

```bash
python -m http.server 8765 --directory .
```

`visualisations/.claude/launch.json` starts the same server from inside Claude
Code. What you see is what GitHub Pages will serve.
