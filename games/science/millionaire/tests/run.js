/* Headless test runner:  node tests/run.js */
const path = require('path'), root = path.join(__dirname, '..') + path.sep;
global.SSM = {};
['taxonomy.js', 'engine.js', 'lifelines.js', 'select.js'].forEach(f => require(root + f));
require(root + 'bank/helper.js');
const units = [...Array(7)].map((_, i) => 'B' + (i + 1)).concat([...Array(10)].map((_, i) => 'C' + (i + 1)), [...Array(8)].map((_, i) => 'P' + (i + 1)));
units.forEach(u => require(root + 'bank/' + u + '.js'));
let pass = 0, fail = 0;
const T = {
  test(name, fn) { try { fn(); pass++; console.log('  ok   ' + name); } catch (e) { fail++; console.log('  FAIL ' + name + '\n       ' + e.message); } },
  eq(a, b, m) { if (a !== b) throw new Error((m ? m + ': ' : '') + 'expected ' + JSON.stringify(b) + ' but got ' + JSON.stringify(a)); },
  ok(c, m) { if (!c) throw new Error(m || 'assertion failed'); }
};
require('./core-tests.js')(SSM, T);
console.log('\n' + pass + ' passed, ' + fail + ' failed');
process.exit(fail ? 1 : 0);
