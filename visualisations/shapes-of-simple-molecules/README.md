# Shapes of Simple Molecules and Ions

AQA A-Level Chemistry 3.1.3.5 — VSEPR theory. Three tabs: a Three.js visualiser,
revision notes, and a quiz with self-marked structured answers.

Unlike the other tools here this one is a folder rather than a lone `index.html`,
because it carries its own copy of everything it needs. Open `index.html` and it
works with the network unplugged.

## Editing it

**`app.jsx` is the source. `app.js` is generated — do not edit it by hand.**

`app.js` is `app.jsx` run through Babel with the `env` and `react` presets. The
page loads the compiled file, so the 2.9 MB Babel runtime never has to ship and
nothing is transpiled in the browser. After changing `app.jsx`, regenerate:

```bash
npx babel app.jsx --presets env,react --out-file app.js
```

There is no package.json and no node_modules; the command above pulls Babel on
demand. If you have no node available, any Babel 7 with those two presets gives
the same result — including `@babel/standalone` loaded into a scratch HTML page.

## What is vendored, and why

Everything is local so the page survives school filters that block CDNs, the
same reason the site index inlines its webfonts.

| Path | Version | Licence |
| --- | --- | --- |
| `lib/react.production.min.js` | React 18.3.1 | MIT |
| `lib/react-dom.production.min.js` | React DOM 18.3.1 | MIT |
| `lib/three.min.js` | three.js r128 | MIT |
| `lib/OrbitControls.js` | three.js r128 examples | MIT |
| `lib/tailwind.js` | Tailwind Play CDN 3.4.5 | MIT |
| `fonts/*.woff2` | Archivo Narrow, JetBrains Mono, Source Sans 3 | OFL |

The fonts are the latin subsets only, one variable file per family, matching
what Google's CSS served. Every latin character on the page is inside that
subset; subscripts, superscripts, arrows and emoji fall back to a system face,
exactly as they did before vendoring.

`lib/tailwind.js` is the Play CDN build, which generates the stylesheet in the
browser at load. That is the one piece still doing real work at runtime — about
400 KB. Freezing the generated CSS into a static stylesheet would drop it, but
it would also mean every future class change needs the CSS regenerating, so it
stays as it is for now.
