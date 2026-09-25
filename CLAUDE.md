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

Fonts are vendored in `assets/sst/fonts/` (Plus Jakarta Sans and JetBrains Mono,
variable woff2, OFL) and declared in `assets/sst/fonts.css`, which `sst.css`
imports. Don't link fonts.googleapis.com: school filters often block it, and
the site has to keep its typography there.

## Every page carries the site bar

**Any new page in `visualisations/` or `games/` must load the site bar.** It
is the header across the top of every tool: logo home, the tool's name and
kind, and Explore / Play / All tools. Without it a tool is a dead end: pupils
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
`games/languages/connect4-sst.css` for the Connect 4 games, plus
`tenable-sst.css` and `retrieval-sst.css`.

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
