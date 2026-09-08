# Savage Science Tools — conventions

Site conventions for anything added to this repo. Read before adding a tool.

## Every page links back to the index

**Any new page in `visualisations/` or `games/` must carry the home button.**
It is a small fixed icon in the bottom-left that returns the reader to the site
index. Without it a tool is a dead end: pupils reach it from a link, a QR code or
a shared URL, and there is nothing to click to see everything else.

Copy the block verbatim from any existing page — for example
`visualisations/rate-of-reaction-simulator/index.html`. It is self-contained: a
scoped `.sv-home` class so it cannot collide with the page's own CSS or Tailwind,
a high `z-index` so it stays reachable under a full-screen overlay, and a
relative `href` so it works locally as well as on the domain. Adjust only the
number of `../` segments to suit the page's depth.

On a React page put the anchor **outside `#root`**, so mounting cannot remove it.

## Subject and level colours

Defined once as custom properties in `index.html` and applied through the
`.subj-*` / `.lvl-*` classes:

| | |
| --- | --- |
| Chemistry | `--chem` red |
| Physics | `--phys` blue |
| Biology | `--bio` green |
| A-Level | `--alevel` purple |
| GCSE | `--gcse` orange |

Each class sets `--accent` as well as `color`, so the same class works on a plain
text label and on a chip that fills with the colour when pressed. Keep the
meaning consistent inside tools too.

## Adding a tool to the index

Add one entry to the `RESOURCES` array in `index.html`:

```js
{ title: "...", url: "visualisations/<folder>/",
  blurb: "One sentence, active voice, what the reader will actually do.",
  kind: "Interactive", level: "A-Level", tags: ["AQA Chemistry", "Chemistry", "Interactive"],
  keywords: "hidden synonym string — exam language, spec codes, common misspellings" },
```

- `kind` is `"Revision Game"`, `"3D Model"` or `"Interactive"`, and drives the
  card's accent colour.
- `keywords` is never rendered. It is what makes exam-language searches land
  ("mass spec", "crude oil", "plum pudding"), so make it generous and include
  spec references.
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
