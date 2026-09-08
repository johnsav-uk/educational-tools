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
| `index.html` | The live page: vendored libraries, precompiled `app.js`, standard home button |
| `app.jsx` / `app.js` | Generated single-file build and its compiled output — never edit by hand |
| `src/browser/OrbitalViewer3D.browser.jsx` | The 3D viewer against plain three.js, for the site build |
| `build.py` / `build_writer.py` / `build.html` | The build: `src/` → `app.jsx` → `app.js` |

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

Then open <http://localhost:8765/visualisations/aqa-chemistry-hub/>.
Any file in the repo is reachable the same way — edit, refresh, and you are
looking at exactly what GitHub Pages will serve. `.claude/launch.json` starts the
same server from inside Claude Code.

**Edit the modules in `src/`, never `app.jsx` or `app.js`.** `build.py`
concatenates the four components into `app.jsx` with imports stripped, `ELEMENTS`
renamed to `IE_ELEMENTS` in the graph, and Recharts' `Line` aliased to `RLine`.

## Rebuilding app.js

The page ships precompiled — no Babel, no CDN, nothing loaded from outside the
repo. There is no node on this machine, so Babel runs in the browser instead:

```bash
python build.py                                    # src/ -> app.jsx
python build_writer.py                             # POST-to-file helper on :8766
# then open http://localhost:8765/visualisations/aqa-chemistry-hub/build.html
```

`build.html` fetches `app.jsx`, transforms it, and POSTs the result to the
writer, which saves `app.js`. It is a build-time page, never linked from the
site. If node is ever available, `npx babel app.jsx --presets react -o app.js`
does the same job.

The site build swaps `@react-three/fiber` for plain three.js (r128 UMD), because
R3F ships ESM only and cannot be loaded from a script tag. That variant lives in
`src/browser/OrbitalViewer3D.browser.jsx`; the sampling, colours, geometry and
copy are identical to the R3F module, so keep the two in step.

## Data

Ionisation energies are the **“use” column** of the Wikipedia
[ionisation energies data page](https://en.wikipedia.org/wiki/Ionization_energies_of_the_elements_(data_page)),
in kJ mol⁻¹, read straight off the table for Z = 1–20. Every series is checked to
be strictly increasing and to place its first shell-change jump at the group
number.
