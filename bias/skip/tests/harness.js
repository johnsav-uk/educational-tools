/* A tiny test harness that runs the same test files in Node (run.cjs) and in a browser (index.html). */
(function (root) {
  const tests = [];
  const show = v => { try { return JSON.stringify(v); } catch (e) { return String(v); } };
  const T = {
    test(name, fn) { tests.push({ name, fn }); },
    ok(v, msg) { if (!v) throw new Error(msg || 'expected a true value'); },
    eq(a, b, msg) { if (show(a) !== show(b)) throw new Error(`${msg ? msg + ': ' : ''}got ${show(a)}, expected ${show(b)}`); },
    near(a, b, e, msg) { if (!(Math.abs(a - b) <= e)) throw new Error(`${msg ? msg + ': ' : ''}got ${a}, expected ${b} ± ${e}`); },
    async run(log = console.log) {
      let pass = 0; const fails = [];
      for (const t of tests) {
        try { await t.fn(); pass++; } catch (e) { fails.push({ name: t.name, error: e.message }); log(`✗ ${t.name}\n    ${e.message}`); }
      }
      log(`${pass}/${tests.length} passed`);
      return { pass, total: tests.length, fails };
    }
  };
  root.T = T;
})(typeof globalThis !== 'undefined' ? globalThis : this);
