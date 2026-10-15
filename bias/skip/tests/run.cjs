/* Runs the puzzle's tests in Node:  node bias/skip/tests/run.cjs
   (Without Node, open bias/skip/tests/ in a browser instead.) */
const path = require('path');
require('./harness.js');
globalThis.SkipCore = require('../skip-core.js');
const fs = require('fs');
const files = ['skip-core.test.js', 'game-puzzle.test.cjs', 'stats-worker.test.cjs'].filter(f => fs.existsSync(path.join(__dirname, f)));
(async () => {
  for (const f of files) {
    const mod = require(path.join(__dirname, f));
    if (typeof mod === 'function') await mod(globalThis.T);
  }
  const r = await globalThis.T.run();
  process.exit(r.fails.length ? 1 : 0);
})();
