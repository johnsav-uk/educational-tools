/* Online, both computers play every delivery themselves and must agree to the last bit. Math.exp, log, pow, sin,
   cos, atan2, asin and hypot may round differently in different browsers (the standard allows it), so the physics
   and the rules use DM (index.html, section 1), built from + − × ÷ and Math.sqrt, which every browser rounds
   exactly. These tests read the game straight out of bias/index.html. */
module.exports = function (T) {
  const { test, eq, ok } = T;
  const E = require('../tools/engine.cjs').load();
  const Sim = require('../skip-sim.js').create(E);
  const L = require('../tools/lib.cjs');
  const puzzles = L.readIndex().puzzles.map(e => L.readJson(L.puzzlePath(e.n)));
  const FN = ['exp', 'log', 'pow', 'sin', 'cos', 'atan2', 'asin', 'hypot'];

  test('DM agrees with Math to about 1e-15', () => {
    let s = 99; const r = () => (s = (s * 16807) % 2147483647) / 2147483647, worst = {};
    const near = (f, a, b) => { const e = Math.abs(a - b) / Math.max(1, Math.abs(b)); worst[f] = Math.max(worst[f] || 0, e); };
    for (let i = 0; i < 20000; i++) {
      const x = (r() - .5) * 60, y = (r() - .5) * 60, p = r() * 50 + 1e-9, u = r() * 2 - 1;
      near('exp', E.DM.exp(x / 4) , Math.exp(x / 4)); near('log', E.DM.log(p), Math.log(p)); near('pow', E.DM.pow(p, x / 20), Math.pow(p, x / 20));
      near('sin', E.DM.sin(x), Math.sin(x)); near('cos', E.DM.cos(x), Math.cos(x)); near('atan2', E.DM.atan2(y, x), Math.atan2(y, x));
      near('asin', E.DM.asin(u), Math.asin(u)); near('hypot', E.DM.hypot(x, y), Math.hypot(x, y));
    }
    for (const f of FN) ok(worst[f] < 1e-14, `${f}: ${worst[f]}`);
    eq([E.DM.exp(0), E.DM.log(1), E.DM.pow(3, 2), E.DM.sin(0), E.DM.cos(0), E.DM.atan2(0, 1)], [1, 0, 9, 0, 1, 0]);
  });

  test('a delivery never calls the browser\'s own exp, log, pow, sin, cos, atan2, asin or hypot', () => {
    const saved = FN.map(f => Math[f]), used = new Set();
    FN.forEach((f, i) => { Math[f] = (...a) => { used.add(f); return saved[i](...a); }; });
    try {
      for (const pz of puzzles) for (const hand of ['fore', 'back']) Sim.play(pz, { hand, aim: hand === 'fore' ? 0.05 : -0.05, weight: 0.8 });
    } finally { FN.forEach((f, i) => { Math[f] = saved[i]; }); }
    eq([...used], [], 'Math functions the physics or the rules called');
  });

  test('a delivery comes out the same whichever way the browser rounds its own maths', () => {
    const saved = FN.map(f => Math[f]), buf = new Float64Array(1), bits = new BigInt64Array(buf.buffer);
    const run = nudge => {
      if (nudge) FN.forEach((f, i) => { Math[f] = (...a) => { buf[0] = saved[i](...a); if (buf[0]) bits[0] += 1n; return buf[0]; }; });
      try { return puzzles.map(pz => Sim.play(pz, { hand: 'fore', aim: 0.04, weight: 0.9 }).world.bodies.map(b => [b.x, b.y, b.state, !!b.toucher])); }
      finally { FN.forEach((f, i) => { Math[f] = saved[i]; }); }
    };
    eq(JSON.stringify(run(true)), JSON.stringify(run(false)));
  });
};
