# 3D Molecule Builder & IUPAC Naming (beta)

Draw an organic molecule in 2D, and the page names it, gives its formula and
M<sub>r</sub>, tags its functional groups and builds a 3D ball-and-stick model.
In A-Level mode it also marks chiral centres, shows the enantiomer beside the
original across a mirror plane, and gives E/Z for C=C bonds.

Everything is in `index.html`. There is no build step: open the page and it runs.

## How the pieces fit

| Section in the script | What it does |
| --- | --- |
| Molecule store | Atoms with sketch coordinates, bonds with orders (1.5 = aromatic). Undo/redo snapshots. |
| Perception | Folds hydrogens into counts, finds rings, treats a Kekulé benzene as aromatic. |
| Functional groups | Pattern-matches acids, esters, acyl chlorides, amides, nitriles, aldehydes, ketones, alcohols, phenols, amines, alkenes, arenes, ethers, halogenoalkanes. |
| Naming | Rule-based IUPAC: principal group → parent chain or ring → lowest locants → alphabetical prefixes. Handles esters, N-substituents, benzene special names (phenol, phenylamine, benzoic acid…) and E/Z. |
| 3D geometry | VSEPR angles (109.5°, 120°, 180°) and bond lengths turned into distance constraints and relaxed from the 2D drawing, so cis/trans and the drawing's orientation carry over. |
| Viewers | Three.js, one per pane. The mirror pane holds the reflected model and a reflected camera, so it always shows a true mirror image while "Linked". |

The naming engine covers what UK GCSE and A-Level ask for. Fused rings, rings
with O or N in them and cyclic esters are reported as beyond the tool rather than
given a wrong name. `__mb.name('CC(O)C')` in the console names a SMILES string,
which is the quickest way to check a change to the rules.

## Levels

GCSE mode limits the presets to the four GCSE homologous series plus ethyl
ethanoate, draws presets as displayed formulae, and badges anything beyond GCSE.
Optical isomerism is A-Level only. R/S is shown as an extra and labelled as
beyond AQA.

## What is vendored

| Path | Version | Licence |
| --- | --- | --- |
| `lib/three.min.js` | three.js r128 | MIT |
| `lib/OrbitControls.js` | three.js r128 examples | MIT |
| `fonts/*.woff2` | Archivo Narrow, JetBrains Mono, Source Sans 3 | OFL |

Same copies as `shapes-of-simple-molecules/`, local so the page survives school
filters that block CDNs.
