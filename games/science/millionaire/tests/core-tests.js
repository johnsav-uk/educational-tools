/* Core tests for Who Wants to Be a Science Millionaire? — engine, lifelines, selection and bank.
   Run headless with:  node tests/run.js      or in the browser with  tests/index.html.
   Exports a function  run(SSM, T)  where T = { test(name, fn), eq, ok } supplied by the runner. */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.SSM_CORE_TESTS = factory();
})(typeof window !== 'undefined' ? window : globalThis, function () {
  'use strict';
  return function run(SSM, T) {
    var E = SSM.engine, L = SSM.lifelines, SEL = SSM.select, TAX = SSM.TAX, BANK = SSM.BANK;
    var test = T.test, eq = T.eq, ok = T.ok;

    function fakeQs(n, diffs) {
      var qs = [];
      for (var i = 0; i < n; i++) qs.push({ id: 'q' + i, text: 'Q' + i, options: ['a', 'b', 'c', 'd'], correct: i % 4, lure: (i + 1) % 4, diff: diffs ? diffs[i] : 1 + Math.floor(i / 3), expl: 'Because ' + i + '. More.' });
      return qs;
    }
    function newGame(n, seed) { var g = E.createGame({ ladder: n, questions: fakeQs(n), seed: seed || 7 }); g.dispatch('START'); return g; }
    function answer(g, right) {          // play one question to its reveal
      var q = g.question(), pick = right ? q.correct : (q.correct + 1) % 4;
      ok(g.dispatch('SELECT', { index: pick }).ok, 'select');
      ok(g.dispatch('LOCK').ok, 'lock');
      return g.dispatch('REVEAL', null, g.epoch);
    }
    function climb(g, correct) {
      for (var i = 0; i < correct; i++) {
        ok(answer(g, true).ok, 'reveal correct');
        if (g.correctCount < g.ladder.n) ok(g.dispatch('ADVANCE', null, g.epoch).ok, 'advance');
      }
    }

    // ---------------- ladder and prizes ----------------
    test('15-question ladder matches the brief', function () {
      eq(E.LADDERS[15].prizes.join(','), '100,200,300,500,1000,2000,4000,8000,16000,32000,64000,125000,250000,500000,1000000');
      eq(E.LADDERS[15].safe.join(','), '5,10');
    });
    [15, 10, 5].forEach(function (n) {
      test(n + '-question ladder: safety nets are £1,000 and £32,000, top is £1,000,000', function () {
        var l = E.LADDERS[n];
        eq(l.prizes.length, n); eq(l.prizes[n - 1], 1000000);
        eq(l.safe.map(function (q) { return l.prizes[q - 1]; }).join(','), '1000,32000');
        for (var i = 1; i < n; i++) ok(l.prizes[i] > l.prizes[i - 1], 'prizes rise');
      });
      test(n + '-question ladder: a wrong answer never drops below a reached safety net', function () {
        var l = E.LADDERS[n], floor = 0;
        for (var c = 0; c < n; c++) {
          if (l.safe.indexOf(c) !== -1) floor = l.prizes[c - 1];
          eq(E.wrongValue(l, c), floor, 'wrong after ' + c + ' correct');
          ok(E.wrongValue(l, c) <= E.walkValue(l, c), 'walking never worth less than falling');
        }
      });
    });
    test('wrong answers at key points (15-question game)', function () {
      [[0, 0], [4, 0], [5, 1000], [9, 1000], [10, 32000], [13, 32000], [14, 32000]].forEach(function (p) {
        var g = newGame(15); climb(g, p[0]);
        var r = answer(g, false); eq(g.state, 'wrong'); ok(r.ok);
        eq(g.result.prize, p[1], 'after ' + p[0] + ' correct');
        eq(g.result.reason, 'wrong');
      });
    });
    test('walking away awards everything won so far, not just the safety net', function () {
      [[0, 0], [1, 100], [4, 500], [5, 1000], [7, 4000], [8, 8000], [10, 32000], [12, 125000], [13, 250000], [14, 500000]].forEach(function (p) {
        var g = newGame(15); climb(g, p[0]);
        ok(g.dispatch('WALK_REQUEST').ok); eq(g.state, 'walkConfirm');
        ok(g.dispatch('WALK_CONFIRM').ok); eq(g.state, 'walkedAway');
        eq(g.result.prize, p[1], 'walk after ' + p[0]);
      });
    });
    test('walk-away can be cancelled and the question resumes with the selection intact', function () {
      var g = newGame(15); g.dispatch('SELECT', { index: 2 });
      g.dispatch('WALK_REQUEST'); ok(!g.dispatch('LOCK').ok, 'cannot lock during confirmation');
      g.dispatch('WALK_CANCEL'); eq(g.state, 'selected'); eq(g.selected, 2);
    });
    test('the top prize can be won', function () {
      [15, 10, 5].forEach(function (n) {
        var g = newGame(n); climb(g, n);
        eq(g.state, 'correct'); ok(g.dispatch('FINISH', null, g.epoch).ok);
        eq(g.state, 'won'); eq(g.result.prize, 1000000); ok(g.isTerminal());
      });
    });

    // ---------------- state machine ----------------
    test('answers can be changed before locking, not after', function () {
      var g = newGame(15);
      g.dispatch('SELECT', { index: 1 }); g.dispatch('SELECT', { index: 3 }); eq(g.selected, 3);
      ok(g.dispatch('DESELECT').ok); eq(g.state, 'question'); eq(g.selected, null);
      g.dispatch('SELECT', { index: 0 }); g.dispatch('LOCK'); eq(g.state, 'locked');
      ok(!g.dispatch('SELECT', { index: 1 }).ok, 'cannot change after lock'); eq(g.locked, 0);
      ok(!g.dispatch('DESELECT').ok); ok(!g.dispatch('LOCK').ok, 'cannot lock twice');
      ok(!g.dispatch('USE_LIFELINE', { kind: 'fifty' }).ok, 'no lifeline once locked');
      ok(!g.dispatch('WALK_REQUEST').ok, 'no walking away once locked');
    });
    test('cannot lock without a selection', function () {
      var g = newGame(15); ok(!g.dispatch('LOCK').ok); eq(g.state, 'question');
    });
    test('a correct answer advances exactly once, however often the timer fires', function () {
      var g = newGame(15); answer(g, true); var ep = g.epoch;
      ok(g.dispatch('ADVANCE', null, ep).ok); eq(g.index, 1);
      ok(!g.dispatch('ADVANCE', null, ep).ok, 'second ADVANCE with the old epoch is rejected');
      ok(!g.dispatch('ADVANCE', null, g.epoch).ok, 'ADVANCE is not allowed from a fresh question');
      eq(g.index, 1);
    });
    test('REVEAL is applied once', function () {
      var g = newGame(15); g.dispatch('SELECT', { index: g.question().correct }); g.dispatch('LOCK');
      var ep = g.epoch; ok(g.dispatch('REVEAL', null, ep).ok);
      ok(!g.dispatch('REVEAL', null, ep).ok); eq(g.correctCount, 1);
    });
    test('stale timers from an earlier state are rejected', function () {
      var g = newGame(15); g.dispatch('SELECT', { index: g.question().correct }); g.dispatch('LOCK');
      var stale = g.epoch - 1; ok(!g.dispatch('REVEAL', null, stale).ok); eq(g.state, 'locked');
      ok(!g.dispatch('REVEAL').ok, 'a timed event with no epoch is rejected');
    });
    test('restart invalidates every earlier timer and resets lifelines', function () {
      var g = newGame(15); g.dispatch('USE_LIFELINE', { kind: 'fifty' });
      g.dispatch('SELECT', { index: g.question().correct }); g.dispatch('LOCK'); var ep = g.epoch;
      g.dispatch('RESTART'); eq(g.state, 'ready'); eq(g.index, 0);
      eq(g.lifelines.fifty, 'available');
      ok(!g.dispatch('REVEAL', null, ep).ok, 'old reveal timer is dead');
      g.dispatch('START'); eq(g.state, 'question'); eq(g.eliminated.length, 0);
    });
    test('wrong answer ends the game and cannot be continued', function () {
      var g = newGame(15); answer(g, false); eq(g.state, 'wrong');
      ok(!g.dispatch('ADVANCE', null, g.epoch).ok, 'cannot advance after a wrong answer');
      ok(g.dispatch('FINISH', null, g.epoch).ok); eq(g.state, 'gameOver'); ok(g.isTerminal());
      ok(!g.dispatch('SELECT', { index: 0 }).ok);
    });
    test('FINISH is rejected after a correct non-final answer', function () {
      var g = newGame(15); answer(g, true); ok(!g.dispatch('FINISH', null, g.epoch).ok); eq(g.state, 'correct');
    });
    test('listeners hear every accepted transition exactly once', function () {
      var g = E.createGame({ ladder: 5, questions: fakeQs(5), seed: 3 }), heard = [];
      g.on(function (i) { heard.push(i.type); });
      g.dispatch('START'); g.dispatch('SELECT', { index: 0 }); g.dispatch('SELECT', { index: 0 }); g.dispatch('LOCK'); g.dispatch('LOCK');
      eq(heard.join(','), 'START,SELECT,SELECT,LOCK');
    });

    // ---------------- lifelines ----------------
    test('each lifeline can only be used once per game', function () {
      var g = newGame(15);
      ok(g.dispatch('USE_LIFELINE', { kind: 'fifty' }).ok); ok(!g.dispatch('USE_LIFELINE', { kind: 'fifty' }).ok);
      ok(g.dispatch('USE_LIFELINE', { kind: 'audience' }).ok); eq(g.state, 'lifeline');
      ok(!g.dispatch('SELECT', { index: 0 }).ok, 'cannot answer while the audience panel is open');
      ok(g.dispatch('CLOSE_LIFELINE').ok);
      ok(!g.dispatch('USE_LIFELINE', { kind: 'audience' }).ok);
      ok(g.dispatch('USE_LIFELINE', { kind: 'friend' }).ok); g.dispatch('CLOSE_LIFELINE');
      ok(!g.dispatch('USE_LIFELINE', { kind: 'friend' }).ok);
      ok(!g.dispatch('USE_LIFELINE', { kind: 'nonsense' }).ok);
      eq(g.lifelineLog.length, 3);
      // still spent on later questions
      g.dispatch('SELECT', { index: g.question().correct }); g.dispatch('LOCK'); g.dispatch('REVEAL', null, g.epoch); g.dispatch('ADVANCE', null, g.epoch);
      ok(!g.dispatch('USE_LIFELINE', { kind: 'fifty' }).ok);
    });
    test('50:50 always keeps the correct answer and exactly one wrong answer, over many seeds', function () {
      for (var s = 0; s < 400; s++) {
        var qs = fakeQs(15), g = E.createGame({ ladder: 15, questions: qs, seed: s }); g.dispatch('START');
        g.dispatch('USE_LIFELINE', { kind: 'fifty' });
        var q = g.question(); eq(g.eliminated.length, 2); ok(g.eliminated.indexOf(q.correct) === -1, 'correct survived');
        eq(g.options().length, 2); ok(g.options().indexOf(q.correct) !== -1);
        ok(!g.dispatch('SELECT', { index: g.eliminated[0] }).ok, 'eliminated option cannot be chosen');
      }
    });
    test('50:50 clears a selection that it removes', function () {
      var found = false;
      for (var s = 0; s < 60 && !found; s++) {
        var g = E.createGame({ ladder: 15, questions: fakeQs(15), seed: s }); g.dispatch('START');
        var q = g.question(), wrong = (q.correct + 2) % 4;     // not the lure
        g.dispatch('SELECT', { index: wrong });
        g.dispatch('USE_LIFELINE', { kind: 'fifty' });
        if (g.eliminated.indexOf(wrong) !== -1) { found = true; eq(g.selected, null); eq(g.state, 'question'); }
        else { eq(g.selected, wrong); eq(g.state, 'selected'); }
      }
      ok(found, 'exercised removal of the selected answer');
    });
    test('Ask the Audience always totals 100% and gives eliminated answers 0%', function () {
      for (var s = 0; s < 1500; s++) {
        var d = 1 + (s % 5), q = { id: 'x' + s, options: ['a', 'b', 'c', 'd'], correct: s % 4, lure: (s + 1) % 4, diff: d };
        var rng = SSM.rand.rngFor(s, 'aud');
        var elim = s % 3 === 0 ? L.fifty(q, SSM.rand.rngFor(s, 'f')) : [];
        var r = L.audience(q, elim, rng);
        eq(r.shares.reduce(function (a, b) { return a + b; }, 0), 100, 'sum seed ' + s);
        elim.forEach(function (i) { eq(r.shares[i], 0); });
        r.shares.forEach(function (p) { ok(p >= 0 && p <= 100 && p === Math.floor(p)); });
      }
    });
    test('Ask the Audience is plausible: reliable when easy, unreliable when hard, sometimes wrong', function () {
      var stats = {};
      for (var d = 1; d <= 5; d++) {
        var top = 0, mislead = 0, mean = 0, N = 2000;
        for (var s = 0; s < N; s++) {
          var q = { id: 'y' + s, options: ['a', 'b', 'c', 'd'], correct: s % 4, lure: (s + 1) % 4, diff: d };
          var r = L.audience(q, [], SSM.rand.rngFor(s * 7 + d, 'a'));
          var max = Math.max.apply(null, r.shares);
          if (r.shares[q.correct] === max && r.shares.filter(function (x) { return x === max; }).length === 1) top++;
          if (r.misleading) mislead++;
          mean += r.shares[q.correct];
        }
        stats[d] = { top: top / N, mislead: mislead / N, mean: mean / N };
      }
      ok(stats[1].top > 0.97, 'easy: correct tops the poll ' + stats[1].top);
      ok(stats[1].mean > stats[2].mean && stats[2].mean > stats[3].mean && stats[3].mean > stats[4].mean && stats[4].mean > stats[5].mean, 'mean share falls with difficulty');
      ok(stats[5].top < 0.85, 'hard: audience is not reliable ' + stats[5].top);
      ok(stats[5].top > 0.45, 'hard: audience is not useless ' + stats[5].top);
      ok(stats[5].mislead > 0.12, 'hard: audience is sometimes misleading ' + stats[5].mislead);
      ok(stats[1].mislead < 0.03, 'easy: audience rarely misleading');
    });
    test('Phone a Friend: deterministic, never reveals an eliminated answer, less reliable on hard questions', function () {
      var acc = {};
      for (var d = 1; d <= 5; d++) {
        var right = 0, N = 2000;
        for (var s = 0; s < N; s++) {
          var q = { id: 'z' + s, options: ['alpha', 'beta', 'gamma', 'delta'], correct: s % 4, lure: (s + 2) % 4, diff: d, expl: 'It is so. Because reasons.' };
          var elim = s % 4 === 0 ? L.fifty(q, SSM.rand.rngFor(s, 'f2')) : [];
          var r1 = L.friend(q, elim, SSM.rand.rngFor(s, 'fr')), r2 = L.friend(q, elim, SSM.rand.rngFor(s, 'fr'));
          eq(JSON.stringify(r1), JSON.stringify(r2), 'deterministic');
          ok(elim.indexOf(r1.answer) === -1, 'friend picks a live answer');
          ok(r1.lines.length >= 3 && r1.lines.join(' ').indexOf(L.LETTERS[r1.answer]) !== -1, 'friend names their answer');
          if (r1.answer === q.correct) right++;
          else ok(r1.lines.join(' ').indexOf('Because reasons') === -1, 'a wrong friend does not recite the explanation');
        }
        acc[d] = right / N;
      }
      ok(acc[1] > 0.9, 'd1 ' + acc[1]); ok(acc[5] < 0.6 && acc[5] > 0.3, 'd5 ' + acc[5]);
      ok(acc[1] > acc[3] && acc[3] > acc[5], 'friend accuracy falls with difficulty');
    });
    test('lifeline results are reproducible from the game seed', function () {
      function once() { var g = E.createGame({ ladder: 15, questions: fakeQs(15), seed: 99 }); g.dispatch('START'); g.dispatch('USE_LIFELINE', { kind: 'audience' }); return JSON.stringify(g.lifelineResult); }
      eq(once(), once());
    });

    // ---------------- selection engine ----------------
    function cfg(o) { return Object.assign({ board: 'AQA', course: 'combined', tier: 'F', difficulty: 'standard', length: 15, subs: Object.keys(TAX.subs), seed: 1 }, o || {}); }
    function subsOf(units) { return Object.keys(TAX.subs).filter(function (k) { return units.indexOf(TAX.subs[k].unit) !== -1; }); }

    test('bank integrity: ids unique, valid taxonomy, four distinct options, explanation present', function () {
      var ids = {}, texts = {};
      ok(BANK.length > 500, 'bank size ' + BANK.length);
      BANK.forEach(function (q) {
        ok(!ids[q.id], 'dup id ' + q.id); ids[q.id] = 1;
        ok(TAX.subs[q.u + ':' + q.s], q.id + ' sub');
        ok(q.t === 'F' || q.t === 'H', q.id + ' tier'); ok(q.d >= 1 && q.d <= 5, q.id + ' diff');
        eq(q.o.length, 4, q.id + ' options'); eq(new Set(q.o).size, 4, q.id + ' distinct options');
        ok(q.w && q.w.length > 10, q.id + ' explanation');
        var nt = q.q.toLowerCase().replace(/[^a-z0-9]+/g, ' '); ok(!texts[nt], 'dup text ' + q.id); texts[nt] = 1;
        if (q.ord) ok(q.a >= 0 && q.a < 4, q.id + ' ord index');
      });
    });
    test('filters: Foundation games never contain Higher-tier questions; Combined never contains separate-only content', function () {
      ['AQA', 'Edexcel'].forEach(function (board) { ['combined', 'separate'].forEach(function (course) { ['F', 'H'].forEach(function (tier) {
        var P = SEL.pool(BANK, cfg({ board: board, course: course, tier: tier }));
        ok(P.length > 100, board + course + tier + ' pool ' + P.length);
        P.forEach(function (q) {
          if (tier === 'F') { ok(q.t === 'F', q.id + ' is Higher but offered in Foundation'); ok(!(TAX.subs[q.u + ':' + q.s].htOnly), q.id + ' htOnly sub'); }
          if (course === 'combined') ok(!SEL.isSep(q), q.id + ' is separate-only but offered in Combined');
          if (q.bd) ok(q.bd === (board === 'Edexcel' ? 'E' : 'A'), q.id + ' wrong board');
        });
      }); }); });
    });
    test('separate course pools are larger than combined, and Higher larger than Foundation', function () {
      var c = SEL.pool(BANK, cfg({ course: 'combined' })).length, s = SEL.pool(BANK, cfg({ course: 'separate' })).length;
      ok(s > c, 'separate ' + s + ' > combined ' + c);
      var f = SEL.pool(BANK, cfg({ tier: 'F' })).length, h = SEL.pool(BANK, cfg({ tier: 'H' })).length;
      ok(h > f, 'higher ' + h + ' > foundation ' + f);
    });
    test('excluded topics never appear, across many seeds, boards, courses, tiers and lengths', function () {
      var selections = [['B1'], ['B2', 'C3'], ['C1', 'C2', 'P1', 'P2'], ['P5', 'P6', 'P7'], ['B7', 'C10', 'P3', 'P4', 'B4'], ['B1', 'B2', 'B3', 'B4', 'B5', 'B6', 'B7', 'C1', 'C2', 'C3', 'C4', 'C5', 'C6', 'C7', 'C8', 'C9', 'C10', 'P1', 'P2', 'P3', 'P4', 'P5', 'P6', 'P7']];
      var ran = 0;
      selections.forEach(function (units) {
        var subs = subsOf(units);
        for (var s = 0; s < 40; s++) {
          var c = cfg({ subs: subs, seed: s, board: s % 2 ? 'Edexcel' : 'AQA', course: s % 3 ? 'combined' : 'separate', tier: s % 4 < 2 ? 'F' : 'H', length: [5, 10, 15][s % 3], difficulty: ['gentle', 'standard', 'challenge'][s % 3] });
          var r = SEL.build(BANK, c);
          if (!r.ok) continue;
          ran++;
          r.questions.forEach(function (q) {
            ok(units.indexOf(q.unit) !== -1, 'unit ' + q.unit + ' not in selection ' + units.join());
            ok(subs.indexOf(q.sub) !== -1, 'sub');
          });
        }
      });
      ok(ran > 100, 'games built ' + ran);
    });
    test('only ticked subtopics are used when a unit is partly selected', function () {
      var subs = ['B1:ce1', 'B1:ce5', 'B2:or4', 'B2:or1', 'B2:or2'];
      for (var s = 0; s < 30; s++) {
        var r = SEL.build(BANK, cfg({ subs: subs, length: 10, seed: s }));
        ok(r.ok, 'built');
        r.questions.forEach(function (q) { ok(subs.indexOf(q.sub) !== -1, q.sub + ' not selected'); });
      }
    });
    test('games contain the right number of unique questions, rising in difficulty', function () {
      [5, 10, 15].forEach(function (n) {
        for (var s = 0; s < 60; s++) {
          var r = SEL.build(BANK, cfg({ length: n, seed: s, tier: s % 2 ? 'H' : 'F', course: s % 3 === 0 ? 'separate' : 'combined', difficulty: ['gentle', 'standard', 'challenge'][s % 3] }));
          ok(r.ok, 'ok'); eq(r.questions.length, n);
          eq(new Set(r.questions.map(function (q) { return q.id; })).size, n, 'unique ids');
          eq(new Set(r.questions.map(function (q) { return q.text; })).size, n, 'unique text');
          for (var i = 1; i < n; i++) ok(r.questions[i].diff >= r.questions[i - 1].diff, 'difficulty never falls (' + r.questions.map(function (q) { return q.diff; }).join('') + ')');
        }
      });
    });
    test('difficulty profile moves the ladder: challenge is harder than gentle', function () {
      var gen = 0, chal = 0, N = 40;
      for (var s = 0; s < N; s++) {
        var g = SEL.build(BANK, cfg({ tier: 'H', course: 'separate', difficulty: 'gentle', seed: s })), c = SEL.build(BANK, cfg({ tier: 'H', course: 'separate', difficulty: 'challenge', seed: s }));
        gen += g.questions.reduce(function (a, q) { return a + q.diff; }, 0); chal += c.questions.reduce(function (a, q) { return a + q.diff; }, 0);
      }
      ok(chal / N > gen / N + 5, 'mean total difficulty gentle ' + gen / N + ' vs challenge ' + chal / N);
    });
    test('Higher games lean on Higher-tier items near the top of the ladder', function () {
      var hi = 0, tot = 0;
      for (var s = 0; s < 50; s++) {
        var r = SEL.build(BANK, cfg({ tier: 'H', course: 'separate', seed: s }));
        r.questions.slice(-5).forEach(function (q) { tot++; if (q.tier === 'H') hi++; });
      }
      ok(hi / tot > 0.5, 'share of Higher-tier items in last five rungs ' + hi / tot);
    });
    test('multi-subject games are balanced across the chosen subjects', function () {
      var bad = 0;
      for (var s = 0; s < 60; s++) {
        var r = SEL.build(BANK, cfg({ seed: s, subs: Object.keys(TAX.subs) }));
        var cnt = { B: 0, C: 0, P: 0 }; r.questions.forEach(function (q) { cnt[q.unit.charAt(0)]++; });
        ['B', 'C', 'P'].forEach(function (k) { if (cnt[k] < 4 || cnt[k] > 6) bad++; });
      }
      eq(bad, 0, 'every subject gets 4–6 of 15 questions');
    });
    test('topics are spread: no unit dominates and neighbours rarely come from the same unit', function () {
      var maxShare = 0, adjacent = 0, n = 0;
      for (var s = 0; s < 60; s++) {
        var r = SEL.build(BANK, cfg({ seed: s, subs: subsOf(['B1', 'B2', 'B3', 'C1', 'C2', 'P1', 'P2']), length: 15 }));
        var cnt = {}; r.questions.forEach(function (q) { cnt[q.unit] = (cnt[q.unit] || 0) + 1; });
        maxShare = Math.max(maxShare, Math.max.apply(null, Object.keys(cnt).map(function (k) { return cnt[k]; })));
        for (var i = 1; i < 15; i++) { n++; if (r.questions[i].unit === r.questions[i - 1].unit) adjacent++; }
      }
      ok(maxShare <= 3, 'max questions from one unit ' + maxShare);
      ok(adjacent / n < 0.12, 'adjacent same-unit rate ' + adjacent / n);
    });
    test('uneven topic sizes: a tiny topic is not exhausted or over-used', function () {
      var r = SEL.build(BANK, cfg({ subs: subsOf(['C9', 'B1']).concat(['B2:or7']), length: 15, seed: 3 }));
      ok(r.ok); var cnt = {}; r.questions.forEach(function (q) { cnt[q.sub] = (cnt[q.sub] || 0) + 1; });
      var tinySize = SEL.pool(BANK, cfg({ subs: ['B2:or7'] })).length;
      ok((cnt['B2:or7'] || 0) <= Math.min(tinySize, 3), 'tiny topic (' + tinySize + ' questions) used ' + cnt['B2:or7'] + ' times');
      eq(Object.keys(cnt).length >= 3, true, 'game still spans several subtopics');
    });
    test('insufficient pools are refused with a clear message and nothing is inserted from excluded topics', function () {
      var r = SEL.build(BANK, cfg({ subs: ['C9:am1'], length: 15 }));
      ok(!r.ok); ok(/Only \d+ questions? match/.test(r.errors[0]), r.errors[0]); eq(r.questions.length, 0);
      var none = SEL.build(BANK, cfg({ subs: [] })); ok(!none.ok); ok(/No topics selected/.test(none.errors[0]));
      var hi = SEL.build(BANK, cfg({ subs: ['P3:pa5'], tier: 'F', length: 5 })); ok(!hi.ok, 'Higher-only topic gives no Foundation questions');
    });
    test('warnings: a missing subject is reported', function () {
      var r = SEL.build(BANK, cfg({ subs: subsOf(['B1']).concat(subsOf(['P8'])), length: 10 }));   // P8 is separate-only
      ok(r.ok); ok(r.warnings.join(' ').indexOf('Physics') !== -1, 'physics warning: ' + r.warnings.join('|'));
    });
    test('selection is deterministic for a seed and varies between seeds', function () {
      var a = SEL.build(BANK, cfg({ seed: 5 })), b = SEL.build(BANK, cfg({ seed: 5 })), c = SEL.build(BANK, cfg({ seed: 6 }));
      eq(JSON.stringify(a.questions), JSON.stringify(b.questions));
      ok(JSON.stringify(a.questions) !== JSON.stringify(c.questions));
    });
    test('answer positions: correct letter is spread over A–D with no run of three', function () {
      var cnt = [0, 0, 0, 0], runs = 0, total = 0;
      for (var s = 0; s < 200; s++) {
        var r = SEL.build(BANK, cfg({ seed: s }));
        r.questions.forEach(function (q, i) { cnt[q.correct]++; total++; if (i >= 2 && q.correct === r.questions[i - 1].correct && q.correct === r.questions[i - 2].correct) runs++; });
      }
      cnt.forEach(function (c) { ok(Math.abs(c / total - 0.25) < 0.03, 'position share ' + c / total); });
      eq(runs, 0, 'runs of three');
    });
    test('prepared questions are well formed: four options, correct index valid, lure is a wrong answer', function () {
      for (var s = 0; s < 40; s++) SEL.build(BANK, cfg({ seed: s, course: 'separate', tier: 'H' })).questions.forEach(function (q) {
        eq(q.options.length, 4); ok(q.correct >= 0 && q.correct < 4); ok(q.lure !== q.correct, 'lure differs from correct');
        var src = BANK.filter(function (b) { return b.id === q.id; })[0];
        eq(q.options[q.correct], src.ord ? src.o[src.a] : src.o[0], 'correct option text preserved');
        if (!src.ord) eq(q.options[q.lure], src.o[1], 'lure is the author’s best wrong answer');
        ok(q.ref && q.ref.length > 3, 'has a specification reference');
      });
    });
    test('specification references follow the board and course', function () {
      eq(SSM.specRef('C5', 'AQA', 'combined'), 'AQA 8464 · 4.12');
      eq(SSM.specRef('C5', 'AQA', 'separate'), 'AQA 8462 · 4.5');
      eq(SSM.specRef('B2', 'Edexcel', 'combined').indexOf('Edexcel 1SC0'), 0);
      eq(SSM.specRef('P2', 'Edexcel', 'separate').indexOf('Edexcel 1PH0'), 0);
      eq(SSM.specRef('P2', 'AQA', 'combined'), 'AQA 8464 · 4.19');
    });
    test('board filter: single-board questions only appear for that board', function () {
      SEL.pool(BANK, cfg({ board: 'Edexcel' })).forEach(function (q) { ok(q.bd !== 'A'); });
      SEL.pool(BANK, cfg({ board: 'AQA' })).forEach(function (q) { ok(q.bd !== 'E'); });
    });
    test('availability counts agree with the pool', function () {
      var c = cfg({ subs: subsOf(['B1', 'C1']) }), av = SEL.availability(BANK, c);
      eq(av.chosen, SEL.pool(BANK, c).length);
      eq(Object.keys(av.chosenByUnit).sort().join(), 'B1,C1');
    });
  };
});
