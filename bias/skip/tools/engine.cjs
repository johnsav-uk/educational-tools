/* The Bias engine in Node, for the benchmark and the tests.
   Rather than keep a copy of the physics, this reads it out of bias/index.html every time:
   sections 1–6 (utilities, geometry, green speed, bias, physics, rules), the bowl colours, and section 12
   (settings, the computer opponent, the Game state machine). Sound and the interface are
   replaced by silent stubs. If the game's physics changes, this picks it up; re-run the
   benchmark so the stored stars match. */
const fs = require('fs');
const path = require('path');

const HTML = path.join(__dirname, '..', '..', 'index.html');
const between = (src, a, b) => {
  const i = src.indexOf(a), j = src.indexOf(b, i + 1);
  if (i < 0 || j < 0) throw new Error(`engine.cjs: cannot find "${a}" … "${b}" in bias/index.html`);
  return src.slice(i, j);
};

function load() {
  const src = fs.readFileSync(HTML, 'utf8');
  const core = between(src, '// ======================= 1. Utilities', '// ======================= 7. Camera');
  const game = between(src, '// ======================= 12. Game state machine', '// ======================= 13. Interface');
  const colours = between(src, 'const COLOURS = [', 'const TEX = ');   // the bowl colours, puzzle sides included
  const build = (src.match(/const BUILD = '([^']+)'/) || [])[1] || 'unknown';
  const body = `'use strict';
    const Sound = new Proxy({}, { get: () => () => {} });
    const QuietUI = new Proxy({}, { get: () => () => {} });
    ${core}
    ${colours}
    ${game}
    return { W, GreenSpeed, Weight, Profiles, PROFILE_DEFAULTS, PhysicsWorld, Body, Rules, releasePoint, biasSide,
      AI, AI_LEVELS, aiLevel, Game, DISCIPLINES, meterFor, SWING_T, QuietUI, Settings,
      setSeed: s => { aiRand = mulberry32(s >>> 0); }, BUILD: ${JSON.stringify(build)} };`;
  return new Function(body)();
}

module.exports = { load };
