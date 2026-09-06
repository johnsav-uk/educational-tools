# Organic Reaction Mechanisms

AQA A-Level Chemistry 3.3.2 – 3.3.13. Every curly-arrow mechanism on the
specification, drawn step by step, plus a rules guide and two practice modes.
One `index.html`, no build step — open it and it runs.

The specification's own names are used throughout. AQA never writes SN1, SN2,
E1 or E2, so neither does this tool; the footer says so, and the rules tab
makes the point explicitly, because candidates lose marks reaching for those
labels.

## The eighteen mechanisms

| Group | Mechanisms |
| --- | --- |
| Alkanes | Chlorination of methane (initiation, both propagation steps, termination, why the yield is poor) — answered with equations, not arrows |
| Alkenes | Ethene + HBr · propene + HBr (Markownikoff) · ethene + Br₂ · ethene + conc. H₂SO₄ |
| Halogenoalkanes | Bromoethane + aqueous KOH · + ethanolic KCN · + excess NH₃ · 2-bromopropane + ethanolic KOH |
| Alcohols | Propan-2-ol + conc. H₂SO₄ (elimination of water) |
| Carbonyls | Ethanal + NaBH₄ · propanone + KCN/H⁺ |
| Acyl chlorides | Ethanoyl chloride + water · + ammonia · + methanol · + methylamine |
| Aromatic | Nitration of benzene · Friedel–Crafts acylation |

## How a mechanism is described

Structures are data, not hand-drawn SVG. Each stage is a scene:

```js
{
  nodes:  [ N('c1', 'H₂C', 215, 250), N('h', 'H', 335, 125, { delta: 'δ+' }) ],
  bonds:  [ BD('c1', 'c2', 2) ],
  arrows: [ AR('c1|c2', 'h@155,22', -32) ]
}
```

`N` places an atom or group label, optionally with a formal charge (`chg`), a
dipole label (`delta`), lone-pair bearings (`lp`) or a radical dot (`rad`).
`BD` joins two nodes with a bond of a given order. `AR` draws a curly arrow
between two **anchors**, written as short strings so the chemistry stays
readable in the source:

| Anchor | Means |
| --- | --- |
| `c2` | the centre of node `c2` |
| `c2@-70,26` | 26 px from `c2` on bearing −70° (0° = right, positive = down) |
| `c1\|c2` | the midpoint of the `c1–c2` bond |
| `c1\|c2^9` | that midpoint, pushed 9 px along the bond normal |
| `330,167` | a raw scene coordinate |

The `bow` argument is signed, so the same two anchors can curve either way.
Arrows are cubic Béziers with the head angled to the tangent at the end point,
and they animate on by `stroke-dashoffset`. Every head is a full one, because
every curly arrow on the specification moves a pair of electrons.

A node can also carry `col` (used to paint a newly formed bond and the atom on
the end of it green), `rad` (a radical's unpaired electron, as a single dot),
`enter: [dx, dy]` (slide in from an offset — a radical arriving) and `at`
(delay in seconds before it appears). A scene may declare `uv: {x, y, tx, ty}`
for an ultraviolet lamp whose rays travel towards the bond it breaks.

Scene captions are never uppercased: `text-transform` would turn AlCl₃ into
ALCL₃ and NaBH₄ into NABH₄, so the style relies on colour and letter-spacing
instead. The benzene horseshoe derives its two ends from the ring vertex
angles, which pins it to positions 2 and 6 — drawn past them it claims the sp³
carbon is still delocalised, and that loses the mark.

Everything is drawn in an 880 × 400 coordinate space (430 for the acyl
chlorides and the acylium-ion step, which are taller). Keeping to that space is what makes the practice
modes work: the clickable hotspots and arrow-placement points are a second SVG
overlaid on the first with the same `viewBox`, so they line up at any size.

## Free-radical substitution has no arrows

AQA answer free-radical substitution with equations: one initiation step, two
propagation steps and the terminations, each with a dot on every radical.
Half-headed "fishhook" arrows are an other-board convention and earn nothing,
so none are drawn anywhere in this file. That mechanism is staged instead as
what physically happens — an ultraviolet lamp splitting Cl₂, then each radical
colliding with the next molecule — with the equation printed under every step.

## Practice modes

**Place the arrows** hides the arrows and offers labelled points — lone pairs,
bonds, atoms, and deliberate traps such as the charge symbol and empty space.
Picking a wrong pair returns a reason drawn from the point's `role`, so
starting an arrow at a negative sign gets told exactly why that scores nothing.
The arrow marking points tick themselves as each arrow lands; the rest are
self-assessed.

**Spot the error** shows six flawed answers with clickable regions over the
plausible culprits. Only one is the real fault, and every region — right or
wrong — explains itself.

## What it loads from the network

React 18.3.1, ReactDOM, Babel standalone, the Tailwind Play CDN, Lucide, and
three Google Fonts families. Babel compiles the JSX in the browser, which is
what keeps this a single file with no build step.

That is the same arrangement as `aromatic-benzene-delocalisation/`, and unlike
`shapes-of-simple-molecules/`, which vendors everything so it survives school
filters that block CDNs. If this tool needs the same treatment, the move is to
copy that folder's `lib/` and `fonts/`, precompile the JSX to `app.js`, and drop
the Babel tag — the page has no other runtime dependency. Icons already fail
soft: if Lucide does not load, every control still reads correctly from its
text label.
