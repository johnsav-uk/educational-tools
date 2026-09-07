# AQA A-Level Chemistry (7405) — Atomic Structure Toolkit

Three self-contained React components plus a parent hub with a tab bar.
Spec coverage: **3.1.1.2** (electron configuration, orbital shapes) and
**3.1.1.3** (ionisation energies).

Out of scope by design and deliberately absent: quantum numbers (n, l, m),
d-orbital geometry.

## Files

| File | What it does |
| --- | --- |
| `src/AQAChemistryHub.jsx` | Parent shell, tab bar, lazy-loads the 3D tab |
| `src/ElectronConfigBuilder.jsx` | Two tabs: build a configuration, and the filling rules |
| `src/OrbitalViewer3D.jsx` | s and 2p orbitals as a \|ψ\|² point cloud, a 90% boundary surface, or both |
| `src/IonisationEnergyGraph.jsx` | Two graphs: successive IEs of one element, or first IEs H → Ca |
| `demo.html` | Standalone preview of all three, no build step (React + Recharts + three.js from CDN) |

Each module is a default export with no props and no shared state, so any one of
them can be dropped into another page on its own.

### Electron configurations

- **Build** — Z = 1–36, charges 2− to 3+, the five common transition-metal ion
  presets, Auto/Manual. Two layouts: an **energy diagram** with s, p and d spread
  across the page (so the 4s/3d overlap between shells is visible) and a
  **stacked list**. Manual mode diagnoses the lowest-energy mistake first and
  distinguishes a wrong count from a Hund's-rule violation.
- **Filling rules** — Aufbau, Pauli and Hund with worked box diagrams, plus the
  4s-before-3d ion rule and the Cr/Cu exceptions. The order-of-filling diagram
  numbers the sub-levels 1–8 so the crossover into shell 4 and back is explicit.

### Orbital shapes

Cloud / Shape / Both. The cloud is sampled from the hydrogen-like radial
functions (inverse-CDF on P(r) ∝ r²R², cos²θ rejection for p), so the dot density
*is* |ψ|². The solid shape is the **90% boundary surface** — the sphere or
dumb-bell drawn in an exam — on the same origin, so students can see what the
drawn shape actually means.

### Ionisation energies

- **Successive** — every IE of one element, coloured by shell, with the shell
  jumps marked. A second linear panel zooms in on the first jump, which would
  otherwise be a pixel high next to the inner-shell values.
- **First IE, H → Ca** — the saw-tooth across periods, coloured by period, with
  every dip annotated and explained: `new shell`, `s² → p¹`, and the
  `p³ → p⁴` spin-pairing dip.
- Both views have a table of the underlying values; dips and shell changes are
  highlighted rows.
- **Predict the Group** quiz hides the element, the shell colours and the
  callouts until the student answers.

## Dependencies

```bash
npm i react react-dom recharts three @react-three/fiber @react-three/drei
```

Tailwind must be configured for the project, and the content globs must include
this folder so the utility classes are not purged:

```js
// tailwind.config.js
content: ['./src/**/*.{js,jsx}']
```

## Previewing before you push

There is no node/npm on this machine, so the repo is served as static files with
Python:

```bash
python -m http.server 8765 --directory H:/Claude/educational-tools
```

Then open <http://localhost:8765/visualisations/aqa-chemistry-hub/demo.html>.
Any file in the repo is reachable the same way — edit, refresh, and you are
looking at exactly what GitHub Pages will serve. `.claude/launch.json` starts the
same server from inside Claude Code.

**Edit the modules in `src/`, not `demo.html`.** Sections 1 and 3 of the demo are
generated verbatim from `ElectronConfigBuilder.jsx` and `IonisationEnergyGraph.jsx`
(imports stripped, `ELEMENTS` renamed to `IE_ELEMENTS`, Recharts' `Line` aliased
to `RLine`), so hand-edits there are lost on the next sync.

The demo compiles JSX in the browser with Babel standalone — fine for previewing,
slower to start than a built bundle, and it needs an internet connection for the
CDN scripts. It also swaps `@react-three/fiber` for plain three.js (r128 UMD),
because R3F ships ESM only and cannot be loaded from a script tag; the sampling,
colours, geometry and copy are identical to the module.

## Data

Ionisation energies are the **“use” column** of the Wikipedia
[ionisation energies data page](https://en.wikipedia.org/wiki/Ionization_energies_of_the_elements_(data_page)),
in kJ mol⁻¹, read straight off the table for Z = 1–20. Every series is checked to
be strictly increasing and to place its first shell-change jump at the group
number.
