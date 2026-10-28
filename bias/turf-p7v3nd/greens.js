/* Bias greens: uneven outdoor greens. A closed beta on its own unlisted page (index.html beside this
   file), as darts is: the page loads the game with patch.js applied and this file ahead of it. The game
   itself (../index.html) is never changed, so everywhere else the flat green is untouched.

   A green is three height layers, summed. Metres, in the absolute frame: x across the rink (0 is the
   centre line), y along it (0 at the rear edge, 36 at the front).
     tilt   a plane: its slope (rise per metre) in x and y
     bumps  Gaussian humps (h > 0) and hollows (h < 0): x, y, height h, and width w (the 1σ radius, metres)
     noise  smooth value noise, fixed by a seed: amplitude (metres) and cell size (metres)
   The game reads the slope only: a bowl's acceleration is −(5/7)·g·∇h (see Terrain.kick in index.html).

   Determinism. A green is rebuilt on every browser from its seed (or its named JSON), so the same
   seed and the same shot give the same result everywhere. Only + − × ÷, Math.imul and Math.sqrt are
   used here: each is exact under IEEE 754, so no browser can round them differently. Math.exp,
   Math.sin and Math.cos are not, so detExp replaces exp, and random directions come from rejection
   sampling rather than trigonometry. Nothing here calls Math.random.

   Terrain (what a match or game is played on): { seed } or { name }, and { gains }, the strength of
   each layer: 1 is the default, 0 switches the layer off. Practice, computer and two-player games
   play the green chosen in Settings (a named one, a fixed seed, or a fresh random seed each game).
   Online games and the daily puzzle stay flat. */
(function (root) {
  'use strict';

  const GREEN = { X0: -12.5, X1: 12.5, Y0: 0, Y1: 36 };
  // Default layer shape (gain 1). Chosen so a bowl on a typical outdoor green drifts by a few tens of
  // centimetres over a full run, a hollow by the jack is clearly felt, and roughness is only felt slow.
  const LAYER = {
    tiltDrop: 0.035, tiltMin: 0.5,               // tilt: up to 3.5 cm across the 25 m width (half to all of that)
    bumpMin: 4, bumpMax: 6,                      // humps and hollows per random green
    bumpH: [0.015, 0.035], bumpW: [1.5, 3.5],    // height 1.5–3.5 cm, width (1σ) 1.5–3.5 m
    noiseAmp: [0.005, 0.007], noiseCell: 1.5     // roughness ±5–7 mm, cells 1.5 m
  };
  const SUN = { x: -0.72, y: -0.69 };            // the sun's ground direction (the game's south-west), absolute frame
  const SHADE = { k: 35, max: 0.28, step: 0.1, contour: 0.005 };   // light/shade gain, its cap, sample spacing, contour interval (m)
  const DEFAULT_GAINS = { tilt: 1, bumps: 1, noise: 1 };
  const STORE = 'bias.greens';   // the Settings choices, kept between visits (Greens.remember / restore)

  // e^z for z ≤ 0, from + − × ÷ only: a short Taylor series on z/2¹⁶, squared back up 16 times.
  function detExp(z) {
    if (z < -60) return 0;
    const u = z / 65536;
    let e = 1 + u * (1 + u * (0.5 + u / 6));
    for (let i = 0; i < 16; i++) e *= e;
    return e;
  }
  // The same generator the game uses for its visual randomness (index.html, mulberry32).
  function mulberry32(seed) {
    return function () {
      seed |= 0; seed = seed + 0x6D2B79F5 | 0;
      let t = Math.imul(seed ^ seed >>> 15, 1 | seed);
      t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
      return ((t ^ t >>> 14) >>> 0) / 4294967296;
    };
  }
  // Lattice value in [−1, 1) for integer cell (i, j) under a seed.
  function lattice(seed, i, j) {
    let h = Math.imul(i, 0x27d4eb2d) ^ Math.imul(j, 0x165667b1) ^ Math.imul(seed, 0x9e3779b1);
    h = Math.imul(h ^ h >>> 15, 0x85ebca6b);
    h = Math.imul(h ^ h >>> 13, 0xc2b2ae35);
    h ^= h >>> 16;
    return (h >>> 0) / 4294967296 * 2 - 1;
  }
  const fade = t => t * t * t * (t * (t * 6 - 15) + 10);     // quintic: smooth slope at every cell edge
  const dfade = t => 30 * t * t * (t - 1) * (t - 1);

  // A random green from a seed. Drawn in a fixed order, so one seed always gives one green.
  function generate(seed) {
    const rnd = mulberry32(seed >>> 0);
    let ux, uy, n2;
    do { ux = 2 * rnd() - 1; uy = 2 * rnd() - 1; n2 = ux * ux + uy * uy; } while (n2 > 1 || n2 < 0.01);
    const n = Math.sqrt(n2), size = LAYER.tiltDrop / (GREEN.X1 - GREEN.X0) * (LAYER.tiltMin + (1 - LAYER.tiltMin) * rnd());
    const slope = { x: ux / n * size, y: uy / n * size };
    const bumps = [], count = LAYER.bumpMin + Math.floor(rnd() * (LAYER.bumpMax - LAYER.bumpMin + 1));
    for (let i = 0; i < count; i++) {
      const x = (2 * rnd() - 1) * 10, y = 14 + rnd() * 18, sign = rnd() < 0.5 ? -1 : 1;   // the jack's end, where bowls slow and stop
      const h = sign * (LAYER.bumpH[0] + (LAYER.bumpH[1] - LAYER.bumpH[0]) * rnd());
      const w = LAYER.bumpW[0] + (LAYER.bumpW[1] - LAYER.bumpW[0]) * rnd();
      bumps.push({ x: round(x), y: round(y), h: round(h, 4), w: round(w) });
    }
    const amp = LAYER.noiseAmp[0] + (LAYER.noiseAmp[1] - LAYER.noiseAmp[0]) * rnd();
    const noise = { seed: Math.floor(rnd() * 2147483647), amp: round(amp, 4), cell: LAYER.noiseCell };
    return { slope: { x: round(slope.x, 6), y: round(slope.y, 6) }, bumps, noise };
  }
  // rounded to 1 mm (or 0.1 mm / 1 µm) so the named and random greens print the same numbers everywhere
  function round(v, dp = 3) { const f = dp === 6 ? 1e6 : dp === 4 ? 1e4 : 1e3; return Math.round(v * f) / f; }

  /* A surface for a spec (the shape generate() and greens.json share) at the given gains.
     grad(X, Y, out) writes ∇h, in absolute metres, into out[0], out[1]. height(X, Y) is for drawing. */
  function surface(spec, gains) {
    const gt = gains.tilt, gb = gains.bumps, gn = gains.noise, cy = (GREEN.Y0 + GREEN.Y1) / 2;
    const sx = spec.slope.x * gt, sy = spec.slope.y * gt;
    const bumps = spec.bumps.map(b => ({ x: b.x, y: b.y, h: b.h * gb, k: 1 / (2 * b.w * b.w) }));
    const amp = spec.noise.amp * gn, cell = spec.noise.cell, seed = spec.noise.seed | 0, noisy = amp !== 0;

    function grad(X, Y, out) {
      let gx = sx, gy = sy;
      for (let i = 0; i < bumps.length; i++) {
        const b = bumps[i], dx = X - b.x, dy = Y - b.y;
        const e = b.h * detExp(-(dx * dx + dy * dy) * b.k);
        gx -= 2 * e * dx * b.k; gy -= 2 * e * dy * b.k;
      }
      if (noisy) {
        const u = X / cell, v = Y / cell, i0 = Math.floor(u), j0 = Math.floor(v), tx = u - i0, ty = v - j0;
        const a = lattice(seed, i0, j0), b = lattice(seed, i0 + 1, j0), c = lattice(seed, i0, j0 + 1), d = lattice(seed, i0 + 1, j0 + 1);
        const m = a - b - c + d, fx = fade(tx), fy = fade(ty);
        gx += amp * dfade(tx) * ((b - a) + m * fy) / cell;
        gy += amp * dfade(ty) * ((c - a) + m * fx) / cell;
      }
      out[0] = gx; out[1] = gy;
    }
    function height(X, Y) {
      let h = sx * X + sy * (Y - cy);
      for (let i = 0; i < bumps.length; i++) {
        const b = bumps[i], dx = X - b.x, dy = Y - b.y;
        h += b.h * detExp(-(dx * dx + dy * dy) * b.k);
      }
      if (noisy) {
        const u = X / cell, v = Y / cell, i0 = Math.floor(u), j0 = Math.floor(v), tx = u - i0, ty = v - j0;
        const a = lattice(seed, i0, j0), b = lattice(seed, i0 + 1, j0), c = lattice(seed, i0, j0 + 1), d = lattice(seed, i0 + 1, j0 + 1);
        const fx = fade(tx), fy = fade(ty);
        h += amp * (a + (b - a) * fx + (c - a) * fy + (a - b - c + d) * fx * fy);
      }
      return h;
    }

    /* Light and shade, and optional contours, painted on the ground texture. X and Y map metres to
       texels. A slope facing the sun is a touch lighter, one facing away a touch darker; contours mark
       every 5 mm of height. Sampled every 10 cm and stretched, so it reads as soft shading. */
    function paint(g, X, Y, contours) {
      const st = SHADE.step, nx = Math.round((GREEN.X1 - GREEN.X0) / st), ny = Math.round((GREEN.Y1 - GREEN.Y0) / st);
      const cv = document.createElement('canvas'); cv.width = nx; cv.height = ny;
      const cx = cv.getContext('2d'), img = cx.createImageData(nx, ny), px = img.data, o = [0, 0];
      const hs = contours ? new Float64Array(nx * ny) : null;
      for (let j = 0; j < ny; j++) for (let i = 0; i < nx; i++) {
        const x = GREEN.X0 + (i + 0.5) * st, y = GREEN.Y0 + (j + 0.5) * st, p = (j * nx + i) * 4;
        grad(x, y, o);
        const lit = -(o[0] * SUN.x + o[1] * SUN.y) * SHADE.k;
        const a = Math.min(SHADE.max, Math.abs(lit));
        if (a > 0.002) { const c = lit > 0 ? 255 : 0; px[p] = c; px[p + 1] = c; px[p + 2] = c; px[p + 3] = Math.round(a * 255); }
        if (hs) hs[j * nx + i] = height(x, y);
      }
      if (hs) for (let j = 0; j < ny; j++) for (let i = 0; i < nx; i++) {
        const q = j * nx + i, band = Math.floor(hs[q] / SHADE.contour);
        const right = i + 1 < nx && Math.floor(hs[q + 1] / SHADE.contour) !== band;
        const below = j + 1 < ny && Math.floor(hs[q + nx] / SHADE.contour) !== band;
        if (right || below) { const p = q * 4; px[p] = 40; px[p + 1] = 28; px[p + 2] = 12; px[p + 3] = 150; }
      }
      cx.putImageData(img, 0, 0);
      g.save(); g.imageSmoothingEnabled = true; g.imageSmoothingQuality = 'high';
      g.drawImage(cv, X(GREEN.X0), Y(GREEN.Y0), X(GREEN.X1) - X(GREEN.X0), Y(GREEN.Y1) - Y(GREEN.Y0));
      g.restore();
    }
    return { spec, gains, grad, height, paint };
  }

  const Greens = {
    DEFAULT_GAINS, LAYER, GREEN,
    gains: { ...DEFAULT_GAINS },   // the Settings sliders (from the next game)
    choice: 'random',              // the Settings choice: 'random', 'seed' (fixedSeed) or a named green's id
    fixedSeed: null,
    current: null,                 // the terrain of the game being played, for Settings to show
    contours: false,               // the tester's contour overlay
    named: null,                   // greens.json, once loaded
    ready: null,                   // a promise, resolved once the named greens are loaded (browser)
    generate,
    surface,
    load(list) { this.named = list; return this; },
    // a spec for a terrain: a named green from the JSON, or the random green for a seed
    resolve(terrain) {
      if (terrain.name) {
        const n = (this.named || []).find(g => g.id === terrain.name);
        if (!n) throw new Error('Unknown green: ' + terrain.name);
        return { name: n.name, slope: n.slope, bumps: n.bumps, noise: n.noise };
      }
      return generate(terrain.seed);
    },
    // the surface a terrain is played on: { seed | name, gains }
    surfaceFor(terrain) { return surface(this.resolve(terrain), terrain.gains || DEFAULT_GAINS); },
    // the next game's green, from Settings: a named green, a fixed seed, or a fresh seed (crypto picks the
    // seed only; the green itself is built from it deterministically)
    nextTerrain() {
      const gains = { ...this.gains };
      if (this.choice !== 'random' && this.choice !== 'seed' && (this.named || []).some(g => g.id === this.choice)) return { name: this.choice, gains };
      if (this.choice === 'seed' && this.fixedSeed != null) return { seed: this.fixedSeed, gains };
      const a = new Uint32Array(1); crypto.getRandomValues(a);
      return { seed: a[0] & 0x7fffffff, gains };
    },
    playing(terrain) { this.current = terrain; if (this.onPlaying) this.onPlaying(terrain); },
    /* The Settings choices are kept in this browser (localStorage 'bias.greens'), so a tester's green, seed, sliders and
       contours are as they left them next time. Anything unreadable falls back to the defaults. */
    remember() {
      try { localStorage.setItem(STORE, JSON.stringify({ choice: this.choice, fixedSeed: this.fixedSeed, gains: this.gains, contours: this.contours })); } catch (e) { /* storage unavailable */ }
    },
    restore() {
      let o = null; try { o = JSON.parse(localStorage.getItem(STORE) || 'null'); } catch (e) { return; }
      if (!o || typeof o !== 'object') return;
      if (typeof o.choice === 'string') this.choice = o.choice;
      if (Number.isInteger(o.fixedSeed) && o.fixedSeed >= 0) this.fixedSeed = o.fixedSeed % 2147483648;
      for (const k in DEFAULT_GAINS) { const v = o.gains && o.gains[k]; if (typeof v === 'number' && v >= 0 && v <= 3) this.gains[k] = v; }
      this.contours = o.contours === true;
    },
    label(terrain) {
      if (terrain.name) { const n = (this.named || []).find(g => g.id === terrain.name); return n ? n.name : terrain.name; }
      return 'Random green ' + (terrain.seed >>> 0).toString(16).toUpperCase().padStart(8, '0');
    }
  };

  if (typeof module === 'object' && module.exports) module.exports = Greens;
  else if (typeof window === 'object') {
    window.BiasGreens = Greens;
    Greens.restore();
    // the page runs under <base href="../">, so greens.json is found beside this script, not the page
    if (typeof fetch === 'function') Greens.ready = fetch(new URL('greens.json', document.currentScript ? document.currentScript.src : location.href), { cache: 'no-cache' }).then(r => { if (!r.ok) throw new Error('greens.json ' + r.status); return r.json(); }).then(list => Greens.load(list));
    if (typeof document === 'object') document.addEventListener('DOMContentLoaded', () => { title(); panel(Greens); });
  }

  /* The title screen says this is the greens beta, and offers only games played on an uneven green:
     online play and the daily puzzle (flat), and the members' beta games, are hidden. CSS rather than
     the hidden attribute, which the game sets itself (on signing in, for example). */
  function title() {
    const css = document.createElement('style');
    css.textContent = '#mOnline,#mSkip,#mBeta,#mLeagueNote{display:none!important}' +
      '.greens-beta{margin:10px 0 0;padding:10px 12px;border:1px solid rgba(201,168,98,.75);border-radius:10px;background:rgba(201,168,98,.12);font-size:13.5px;line-height:1.45;max-width:272px;box-sizing:border-box}' +
      '.greens-beta b{display:block;font-size:15px;margin-bottom:2px}';
    document.head.appendChild(css);
    const sub = document.querySelector('#titleScrim .sub');
    if (!sub) return;
    sub.textContent = 'Uneven greens: a closed beta';
    sub.insertAdjacentHTML('afterend', '<div class="greens-beta"><b>Uneven greens (beta)</b>Play the computer, Practice and Custom match are played on an uneven green: a tilt, bumps and hollows, and some roughness. Choose the green, or a named one, in Help &amp; settings.</div>');
  }

  /* The Settings block: which green, three layer sliders, and for testers a contour toggle. The green and
     the sliders apply from the next game; the contours redraw the green at once. */
  function panel(G) {
    const sheet = document.querySelector('#settingsScrim .sheet'), h2 = document.getElementById('setH');
    if (!sheet || !h2) return;
    const tester = (() => {
      try {
        if (new URLSearchParams(location.search).has('tester')) localStorage.setItem('bias.greenTester', '1');
        return localStorage.getItem('bias.greenTester') === '1';
      } catch (e) { return false; }
    })();
    const box = document.createElement('div');
    box.className = 'greens-set';
    box.innerHTML = `
      <div class="toggle-row"><div><div class="tl">Uneven greens (beta)</div><div class="td">Slope, bumps and roughness, from the next game. Online games and the daily puzzle stay flat. <span id="gr-now"></span></div></div></div>
      <div class="field"><label for="gr-choice">Green</label><div class="range-row"><select id="gr-choice" class="select">
        <option value="random">A new random green each game</option><option value="seed">This seed every game</option></select>
        <input id="gr-seed" inputmode="numeric" placeholder="seed" style="width:9em;display:none"></div></div>
      ${[['tilt', 'Tilt'], ['bumps', 'Bumps and hollows'], ['noise', 'Roughness']].map(([k, l]) => `
      <div class="field"><label for="gr-${k}">${l}</label><div class="range-row"><input type="range" id="gr-${k}" min="0" max="300" step="10" value="${Math.round(G.gains[k] * 100)}"><output id="gr-${k}-out" class="num">${Math.round(G.gains[k] * 100)}%</output></div></div>`).join('')}
      <div class="toggle-row" id="gr-contour-row" style="${tester ? '' : 'display:none'}"><div><div class="tl">Contours (testers)</div><div class="td">A line every 5 mm of height, drawn on the green.</div></div>
        <div class="seg"><button type="button" id="gr-c-on" aria-pressed="false">On</button><button type="button" id="gr-c-off" aria-pressed="true">Off</button></div></div>`;
    h2.after(box);
    const choice = document.getElementById('gr-choice'), seed = document.getElementById('gr-seed'), now = document.getElementById('gr-now');
    const showNow = t => { now.textContent = t ? 'This game: ' + G.label(t) + (t.seed != null ? ' (seed ' + t.seed + ')' : '') + '.' : ''; };
    G.onPlaying = showNow; showNow(G.current);
    // the remembered choice: shown at once, or once the named greens are in the list
    const showChoice = () => { if ([...choice.options].some(o => o.value === G.choice)) choice.value = G.choice; seed.style.display = choice.value === 'seed' ? '' : 'none'; };
    if (G.fixedSeed != null) seed.value = G.fixedSeed;
    showChoice();
    Promise.resolve(G.ready).then(() => { for (const g of G.named || []) choice.insertAdjacentHTML('beforeend', `<option value="${g.id}">${g.name}: ${g.blurb}</option>`); showChoice(); }).catch(() => {});
    const syncSeed = () => {
      seed.style.display = choice.value === 'seed' ? '' : 'none';
      const n = Number(seed.value);
      G.choice = choice.value; G.fixedSeed = seed.value.trim() !== '' && Number.isInteger(n) && n >= 0 ? n % 2147483648 : null;
      G.remember();
    };
    choice.addEventListener('change', () => { if (choice.value === 'seed' && seed.value === '' && G.current && G.current.seed != null) seed.value = G.current.seed; syncSeed(); });
    seed.addEventListener('input', syncSeed);
    for (const k of ['tilt', 'bumps', 'noise']) {
      const input = document.getElementById('gr-' + k), out = document.getElementById('gr-' + k + '-out');
      input.addEventListener('input', () => { G.gains[k] = input.value / 100; out.textContent = input.value + '%'; G.remember(); });
    }
    const setContours = on => {
      G.contours = on; G.remember();
      document.getElementById('gr-c-on').setAttribute('aria-pressed', String(on));
      document.getElementById('gr-c-off').setAttribute('aria-pressed', String(!on));
      window.dispatchEvent(new Event('bias-greens'));
    };
    document.getElementById('gr-c-on').onclick = () => setContours(true);
    document.getElementById('gr-c-off').onclick = () => setContours(false);
    if (!tester) G.contours = false;   // contours only for testers, whatever was remembered
    document.getElementById('gr-c-on').setAttribute('aria-pressed', String(G.contours));
    document.getElementById('gr-c-off').setAttribute('aria-pressed', String(!G.contours));
  }
})(typeof window === 'object' ? window : globalThis);
