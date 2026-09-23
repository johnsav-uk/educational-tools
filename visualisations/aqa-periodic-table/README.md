# Periodic Table Explorer (beta)

A single-file periodic table for AQA GCSE and A-Level Chemistry. No build step and no libraries.

- **GCSE table**: laid out like the AQA GCSE data sheet (A<sub>r</sub> at the top, Z at the bottom, Cu and Cl to 0.5, lanthanides and actinides left out). Family chips and group/period spotlights. The element drawer shows protons, neutrons and electrons, a shell diagram, and the reactions and tests AQA asks for.
- **A-Level table**: A<sub>r</sub> to 1 d.p. with f-block rows. Colour by family or by block, outline the s/p/d/f blocks, and overlay electronegativity, first ionisation energy, atomic radius or ionic radius. A bar chart follows whichever group or period is spotlit. The drawer gives the full and shorthand configuration (including the Cr/Cu anomalies), ion configurations, oxidation states and spec notes. There is also a Period 3 summary (elements, oxides, chlorides).
- **Wide table** (for illustration): the 32-column layout, with the lanthanides and actinides in line between Groups 2 and 3 in atomic-number order. It scrolls sideways. La and Ac stay in Group 3, as on the AQA GCSE sheet. Colour by family or block, or show it plain, and outline the blocks.
- **History**: a 13-slide deck on 16:9 slides that scale to fit, like PowerPoint. It covers Dalton, Newlands, Mendeleev and Moseley, then the modern table, a comparison and a 4-mark exam question with its marking points. Each click, `→`, `Space` or `PageDown` (so a clicker works) builds in the next point. Going back shows the previous slide in full. "Show all points at once" turns the builds off, and "Present full screen" runs the deck in presenter mode, where `B`/`W` blank the screen black or white. On phones the slides reflow into a scrolling page.
- **Presenter mode** (`P`, or the Present button, which opens the history deck when you are on the History tab): full-screen slides for the tables. `←`/`→`/`Space` move between slides, `1`–`7`/`0` spotlight a group, `Shift`+digit spotlights a period, `T` spotlights the transition metals, `C` clears the spotlight. On the last slide, `N`/`S`/`Z`/`M` hide names, symbols, atomic numbers or masses, clicking a tile reveals it, `R` resets and `L` switches between GCSE and A-Level. `H` lists every shortcut.

Both tables follow the AQA data sheets: hydrogen floats on its own over the transition metals, and the key sits around it with arrows to each line (relative atomic mass, atomic symbol, name, atomic (proton) number). The page is set in Arial, as AQA papers are. **Plain (exam sheet)** removes the colours from either table, and the presenter has its own **Plain** button. **Dark mode** is in the header and the presenter bar, and the choice is remembered.

Deep links: `#gcse`, `#alevel`, `#long`, `#history`, `#present` (table slides), `#present-history` (history deck).

## Data sources

Standard atomic weights come from IUPAC. Bracketed values are the mass numbers of the longest-lived isotopes. Electronegativities are Pauling values, first ionisation energies are from NIST (kJ mol⁻¹), atomic radii are covalent radii (Cordero et al., 2008) and ionic radii are Shannon's 6-coordinate values. Portraits are public-domain images hotlinked from Wikimedia Commons. If one fails to load, the scientist's initials show instead.

## Still to check (why it's beta)

- A teacher should proofread the element notes and the Period 3 tables.
- Newlands' octave grid is simplified and uses modern symbols.
