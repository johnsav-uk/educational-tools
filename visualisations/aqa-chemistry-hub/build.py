"""Assemble app.jsx for the static site build from the React modules in src/.

    python build.py            # regenerate app.jsx
    python build.py --compile  # also print how to refresh app.js

app.jsx is the concatenation of the four components with their imports removed,
so src/ stays the single source of truth. app.js is app.jsx run through Babel —
there is no node on this machine, so that step happens in the browser: serve the
folder, open build.html, and it writes app.js back through a small local writer
(see the comment at the bottom of this file).
"""
import io
import os
import re
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
SRC = os.path.join(HERE, 'src')


def read(*parts):
    return io.open(os.path.join(SRC, *parts), encoding='utf-8').read()


def strip_imports(text):
    """Drop ES imports and the default export keyword — the build is one scope."""
    text = re.sub(r"^import[\s\S]*?from '[^']+';\n", '', text, flags=re.M)
    text = re.sub(r"^import '[^']+';\n", '', text, flags=re.M)
    return text.replace('export default function', 'function')


def body_of(text):
    """Everything from the module's own doc comment onwards, imports removed."""
    marker = text.find('/* ---')
    return strip_imports(text[marker:] if marker != -1 else text).lstrip().rstrip()


def build():
    config = body_of(read('ElectronConfigBuilder.jsx'))

    viewer = body_of(read('browser', 'OrbitalViewer3D.browser.jsx'))

    # `ELEMENTS` is an element-symbol list in the config builder and a data table
    # in the graph, so one of them has to be renamed in a single scope. Recharts'
    # `Line` would shadow drei's, so it is aliased too.
    graph = body_of(read('IonisationEnergyGraph.jsx'))
    graph = re.sub(r'\bELEMENTS\b', 'IE_ELEMENTS', graph)
    graph = graph.replace('<Line\n', '<RLine\n').replace('<Line ', '<RLine ')
    graph = graph.replace(
        "const SUPS = { 0: '⁰', 1: '¹', 2: '²', 3: '³', 4: '⁴', 5: '⁵', 6: '⁶', 7: '⁷', 8: '⁸', 9: '⁹' };\n"
        "const sup = (n) => String(n).split('').map((d) => SUPS[d]).join('');\n\n",
        '',  # already declared by the configuration builder
    )

    # The hub lazy-loads the 3D tab through a dynamic import; in a single-file
    # build every component is already present, so that indirection goes away.
    hub = body_of(read('AQAChemistryHub.jsx'))
    hub = re.sub(r'^// three\.js is heavy.*\nconst OrbitalViewer3D = lazy\([^\n]*\n', '', hub, flags=re.M)
    hub = hub.replace('<Suspense fallback={<Loading />}>\n          <Component />\n        </Suspense>',
                      '<Component />')
    hub = re.sub(r'function Loading\(\) \{[\s\S]*?\n\}\n\n', '', hub)

    parts = [
        "/* ------------------------------------------------------------------ *\n"
        " * GENERATED FILE — do not edit.\n"
        " * Run `python build.py` to rebuild it from the modules in src/.\n"
        " * ------------------------------------------------------------------ */\n\n"
        "const { useCallback, useEffect, useMemo, useRef, useState } = React;\n"
        "const { CartesianGrid, Label, Line: RLine, LineChart, ReferenceLine,\n"
        "        ResponsiveContainer, Tooltip, XAxis, YAxis } = Recharts;\n",
        '/* ===== 1 — electron configurations ===== */\n' + config,
        '/* ===== 2 — orbital shapes ===== */\n' + viewer,
        '/* ===== 3 — ionisation energies ===== */\n' + graph,
        '/* ===== hub ===== */\n' + hub,
        "ReactDOM.createRoot(document.getElementById('root')).render(<AQAChemistryHub />);",
    ]
    out = '\n\n'.join(parts) + '\n'
    io.open(os.path.join(HERE, 'app.jsx'), 'w', encoding='utf-8', newline='\n').write(out)
    return out


if __name__ == '__main__':
    text = build()
    print(f'app.jsx: {len(text.splitlines())} lines')
    if '--compile' in sys.argv:
        print('\nTo refresh app.js (no node on this machine):')
        print('  1. python -m http.server 8765 --directory ../..')
        print('  2. python build_writer.py            # tiny POST-to-file server on 8766')
        print('  3. open http://localhost:8765/visualisations/aqa-chemistry-hub/build.html')
        print('  4. delete build.html and lib/babel.min.js before committing')
