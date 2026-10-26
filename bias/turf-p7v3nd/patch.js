/* Bias greens: the changes the beta makes to the game, applied to ../index.html's text as the page loads.
   The game file itself is never edited, so the game everywhere else is exactly as it was.

   Each patch finds one exact piece of the game's source and adds to it. If the game has changed so that
   a piece is missing (or appears twice), patchGame throws, naming it, and the page says the beta needs
   updating rather than playing a half-patched game. greens.test.mjs checks every patch against today's
   index.html: run it after a game change.

   What the patches add (all of it inert unless greens.js has set window.BiasGreens):
     - Terrain: the green being played (null: flat) and the end's direction. Each physics step a moving
       body's velocity gets −(5/7)·g·∇h·dt, read where it is at the start of the step. On the other end
       (x → −x, y → GREEN_LEN − y) the same green is read turned 180°, so the slope's sign flips.
     - the ground texture gets the green's light and shade (and the tester's contours);
     - which green each kind of game plays: practice, computer and two-player games the one chosen in
       Settings; an online game (the other browser has no greens) and the daily puzzle play flat. */
(function (root) {
  'use strict';
  const PATCHES = [
    ['the Variant line', `const Variant = typeof window === 'object' && window.BiasVariant || null;\n`, `
/* Uneven greens (the greens beta page): see greens.js and patch.js beside it. */
const Greens = typeof window === 'object' && window.BiasGreens || null;
const Terrain = {
  surface: null, dir: 0, g: [0, 0], G_SLOPE: 5 / 7 * 9.81,
  kick(b, dt) {
    const o = this.g;
    if (this.dir) this.surface.grad(-b.x, W.GREEN_LEN - b.y, o); else this.surface.grad(b.x, b.y, o);
    const k = this.G_SLOPE * dt * (this.dir ? 1 : -1);
    b.vx += k * o[0]; b.vy += k * o[1];
  }
};
`],
    ['the integrator', `    const p = this.gp, v = Math.hypot(b.vx, b.vy);\n`,
      `    const p = this.gp;\n    if (Terrain.surface) Terrain.kick(b, dt);\n    const v = Math.hypot(b.vx, b.vy);\n`, 'replace'],
    ['the ground texture', `    if (Variant && Variant.paintGround) Variant.paintGround(g, X, Y, S);   // markings on the green (absolute frame)\n`,
      `    if (Terrain.surface) Terrain.surface.paint(g, X, Y, Greens.contours);\n`],
    ['the title showcase', `this.clearTimers(); this.mode = 'title'; this.phase = 'idle'; this.dir = 0; this.world.clear(); this.matRear = W.MAT_MIN; this.link = null;`,
      ` this.setGreen(null);`],
    ['practice', `this.clearTimers(); this.mode = 'practice'; this.dir = 0; this.match = null; this.endNo = 1; this.paused = false; this.ai = null; this.link = null;`,
      `\n    this.setGreen(Greens && Greens.nextTerrain());`],
    ['setGreen', `  startMatch(cfg) {\n`, `  setGreen(terrain) {
    if (window.BiasGame && this !== window.BiasGame) return;   // the self-tests' own games leave the green alone
    const surface = Greens && terrain ? Greens.surfaceFor(terrain) : null;
    this.greenTerrain = surface ? terrain : null;
    if (Greens) Greens.playing(this.greenTerrain);
    if (!surface && !Terrain.surface) return;
    Terrain.surface = surface; Terrain.dir = this.dir;
    if (!Art.ready) return;
    // only the ground carries the green's shading: repaint it (from the same visual seed, so the grass is
    // unchanged) and swap it into the WebGL textures, rather than rebuilding the whole scene
    vrand = mulberry32(1897); Art.ground = Art.buildGround();
    scene.bgKey = '';
    if (scene.gl && scene.gl.groundTex) scene.gl.groundTex.forEach((t, d) => { t.image = Art.ground[d][0]; t.needsUpdate = true; });
  }
`, 'before'],
    ['a match', `this.clearTimers(); this.mode = 'match'; this.dir = 0; this.endNo = 1; this.paused = false;`,
      `\n    this.setGreen(cfg.link ? null : Greens && Greens.nextTerrain());`],
    ['the puzzle', `this.clearTimers(); this.mode = 'puzzle'; this.dir = 0; this.match = null; this.endNo = 1; this.paused = false; this.ai = null; this.link = null;`,
      `\n    this.setGreen(null);`],
    ['a variant', `this.clearTimers(); this.mode = 'variant'; this.dir = 0; this.match = null; this.endNo = 1; this.paused = false; this.link = null; this.netReset();`,
      `\n    this.setGreen(null);`],
    ['each jack', `  beginJack(p) {\n`, `    Terrain.dir = this.dir;\n`],
    ['the contour toggle', `const game = new Game(UI);\n`,
      `if (Greens) {
  window.addEventListener('bias-greens', () => game.setGreen(game.greenTerrain));
  // the self-tests are calibrated on the flat green: they run on it even mid-match (BiasTests is defined below)
  queueMicrotask(() => { const t = window.BiasTests, run = t && t.run; if (run) t.run = function () { const s = Terrain.surface; Terrain.surface = null; try { return run.apply(this, arguments); } finally { Terrain.surface = s; } }; });
}
`]
  ];

  // anchor: 'after' (default) adds the text after it, 'before' ahead of it, 'replace' in its place
  function patchGame(html) {
    for (const [name, anchor, text, how = 'after'] of PATCHES) {
      const i = html.indexOf(anchor);
      if (i < 0 || html.indexOf(anchor, i + 1) >= 0) throw new Error(`The game has changed: ${name} ${i < 0 ? 'is missing' : 'appears twice'}.`);
      const j = i + anchor.length;
      html = how === 'replace' ? html.slice(0, i) + text + html.slice(j)
        : how === 'before' ? html.slice(0, i) + text + html.slice(i)
        : html.slice(0, j) + text + html.slice(j);
    }
    return html;
  }

  if (typeof module === 'object' && module.exports) module.exports = { patchGame, PATCHES };
  else root.BiasGreensPatch = { patchGame, PATCHES };
})(typeof window === 'object' ? window : globalThis);
