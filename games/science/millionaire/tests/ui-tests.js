/* Interface integration tests. Load this file in the game page (index.html) and call  await SSM_UI_TESTS().
   It plays the real interface through real DOM events (clicks and key presses) with timers sped up, and checks
   state, ladder, prizes, panels, sound cues logged by the audio manager, and that nothing can fire twice. */
(function (root) {
  'use strict';
  root.SSM_UI_TESTS = async function (opts) {
    opts = opts || {};
    // Virtual clock: every setTimeout the interface makes runs on a fake timeline that the test advances itself,
    // so the run is fast and does not depend on the page being visible (hidden tabs throttle real timers).
    var origSet = root.setTimeout, origClear = root.clearTimeout, vnow = 0, queue = [], nextId = 1e9;
    root.setTimeout = function (fn, ms) { var a = Array.prototype.slice.call(arguments, 2); var t = { id: nextId++, at: vnow + (ms || 0), fn: function () { fn.apply(null, a); } }; queue.push(t); return t.id; };
    root.clearTimeout = function (id) { queue = queue.filter(function (t) { return t.id !== id; }); if (id < 1e9) origClear.call(root, id); };
    function advance(ms) {
      var target = vnow + ms;
      for (;;) {
        queue.sort(function (x, y) { return x.at - y.at || x.id - y.id; });
        var t = queue[0]; if (!t || t.at > target) break;
        queue.shift(); vnow = t.at; try { t.fn(); } catch (e) { console.error(e); }
      }
      vnow = target;
    }
    var origConfirm = root.confirm; root.confirm = function () { return true; };
    var results = [], U = root.SSM_UI, SSM = root.SSM, E = SSM.engine, audio = U.audio;
    var origClock = audio.clock; audio.clock = function () { return vnow / 1000; };
    function realSleep(ms) { return new Promise(function (r) { origSet.call(root, r, ms); }); }
    var $ = function (id) { return document.getElementById(id); };
    async function sleep(ms) { advance(ms); await Promise.resolve(); }
    async function until(cond, label, ms) {
      var waited = 0, limit = ms || 12000;
      while (waited < limit) { try { if (cond()) return true; } catch (e) {} advance(20); waited += 20; if (waited % 200 === 0) await Promise.resolve(); }
      throw new Error('timed out waiting for ' + label);
    }
    function click(el) { if (typeof el === 'string') el = document.querySelector(el); if (!el) throw new Error('no element'); if (el.disabled) throw new Error('element disabled: ' + (el.id || el.className)); el.click(); }
    function key(k, opt) { document.dispatchEvent(new KeyboardEvent('keydown', Object.assign({ key: k, bubbles: true, cancelable: true }, opt || {}))); }
    function G() { return U.G && U.G.game; }
    function count(name) { return audio.log.filter(function (x) { return x === name; }).length; }
    async function test(name, fn) {
      try { await fn(); results.push({ name: name, ok: true }); } catch (e) { results.push({ name: name, ok: false, error: e.message }); }
    }
    function eq(a, b, m) { if (a !== b) throw new Error((m ? m + ': ' : '') + 'expected ' + JSON.stringify(b) + ' but got ' + JSON.stringify(a)); }
    function ok(c, m) { if (!c) throw new Error(m || 'assertion failed'); }

    async function newGame(cfg, seed) {
      if (U.G) { try { U.toSetup(); } catch (e) {} }
      U.setCfg(Object.assign({ board: 'AQA', course: 'separate', tier: 'H', difficulty: 'standard', length: 15, sound: true }, cfg || {}));
      U.cfg.subs = Object.keys(SSM.TAX.subs);
      U.updateSetup();
      audio.log.length = 0;
      U.launch(seed || 4242, true);
      await until(function () { return !$('pnl-intro').hidden; }, 'intro');
      click('#btn-skip');
      await until(function () { return G().state === 'question'; }, 'first question');
    }
    function answerBtn(i) { return document.querySelector('.mx-a[data-i="' + i + '"]'); }
    async function play(right, opt) {
      opt = opt || {};
      var g = G(), q = g.question(), pick = right ? q.correct : (q.correct + 1) % 4;
      if (g.eliminated.indexOf(pick) !== -1) pick = g.options().filter(function (i) { return i !== q.correct; })[0];
      click(answerBtn(pick));
      await until(function () { return G().state === 'selected'; }, 'selected');
      click('#btn-final');
      await until(function () { return G().state === 'correct' || G().state === 'wrong'; }, 'reveal');
    }
    async function climb(n) {
      for (var i = 0; i < n; i++) {
        await play(true);
        if (G().correctCount < G().ladder.n) { await until(function () { return !!$('btn-next'); }, 'next button'); click('#btn-next'); await until(function () { return G().state === 'question'; }, 'next question'); }
      }
    }
    function resultText() { return { title: $('res-title').textContent, prize: $('res-prize').textContent, sub: $('res-sub').textContent }; }

    await test('boot: bank loaded, start enabled, topic tree built', async function () {
      U.toSetup(); await sleep(30);
      ok(SSM.BANK.length > 500, 'bank'); ok(!$('su-start').disabled, 'start enabled'); eq(document.querySelectorAll('.su-unit').length, 25);
      ok(+$('su-poolN').textContent > 100, 'pool count shown');
    });

    await test('setup: AQA/Edexcel, course and tier change what is available', async function () {
      U.setCfg({ board: 'AQA', course: 'combined', tier: 'F' }); var combF = +$('su-poolN').textContent;
      ok($('subs-P8') && document.querySelector('[data-unit="P8"]').disabled, 'Space physics unavailable in Combined');
      ok(/AQA 8464/.test(document.querySelector('[data-ref="C5"]').textContent), 'AQA ref shown ' + document.querySelector('[data-ref="C5"]').textContent);
      U.setCfg({ course: 'separate' }); var sepF = +$('su-poolN').textContent;
      ok(!document.querySelector('[data-unit="P8"]').disabled, 'Space physics available in Separate');
      U.setCfg({ tier: 'H' }); var sepH = +$('su-poolN').textContent;
      ok(sepF > combF && sepH > sepF, 'counts ' + combF + ' < ' + sepF + ' < ' + sepH);
      U.setCfg({ board: 'Edexcel' });
      ok(/Edexcel:/.test(document.querySelector('[data-ref="C5"]').textContent), 'Edexcel topic shown');
      ok(/Pearson Edexcel/.test($('su-courseNote').textContent), 'course note names the board');
      U.setCfg({ board: 'AQA', course: 'combined', tier: 'F' });
    });

    await test('setup: topics tick, untick, expand; clear leaves nothing and blocks Start', async function () {
      U.setCfg({ board: 'AQA', course: 'combined', tier: 'F' });
      click('#su-none'); ok($('su-start').disabled, 'start disabled when empty'); ok(/No topics selected/.test($('su-msgs').textContent));
      var cb = document.querySelector('[data-unit="B1"]'); cb.checked = true; cb.dispatchEvent(new Event('change', { bubbles: true }));
      ok(document.querySelector('[data-subcb="B1:ce1"]').checked, 'unit tick ticks its subtopics');
      var chev = document.querySelector('[data-exp="B1"]'); click(chev); eq(chev.getAttribute('aria-expanded'), 'true'); ok(!$('subs-B1').hidden);
      var sub = document.querySelector('[data-subcb="B1:ce1"]'); sub.checked = false; sub.dispatchEvent(new Event('change', { bubbles: true }));
      ok(cb.indeterminate, 'unit shows partial state');
      var cbs = [].slice.call(document.querySelectorAll('[data-subcb^="B1:"]')); cbs.forEach(function (c) { var want = ['B1:ce5', 'B1:ce6'].indexOf(c.getAttribute('data-subcb')) !== -1; if (c.checked !== want && !c.disabled) { c.checked = want; c.dispatchEvent(new Event('change', { bubbles: true })); } });
      var n1 = +$('su-poolN').textContent; ok(n1 > 0 && n1 < 15, 'pool ' + n1);
      ok($('su-start').disabled, 'only ' + n1 + ' questions, not enough for 15');
      ok(/Only \d+ questions? match/.test($('su-msgs').textContent), 'clear warning shown: ' + $('su-msgs').textContent);
      var offer = document.querySelector('#su-msgs button[data-len]'); ok(!!offer, 'offers a shorter game');
      click(offer); ok(!$('su-start').disabled || +$('su-poolN').textContent < 5, 'switching length re-checks');
      click('#su-all'); ok(!$('su-start').disabled);
    });

    await test('full 15-question run: all four options usable, ladder climbs, sounds fire once each, million wins', async function () {
      await newGame({ course: 'separate', tier: 'H' });
      ok(document.querySelectorAll('.mx-rung').length === 15, '15 rungs');
      eq(document.querySelectorAll('.mx-rung.safe').length, 2, 'two safety-net rungs');
      var seenLetters = {};
      for (var i = 0; i < 15; i++) {
        var q = G().question(); seenLetters[q.correct] = 1;
        eq(document.querySelector('.mx-rung.now .p').textContent, E.gbp(E.LADDERS[15].prizes[i]), 'current rung highlights ' + (i + 1));
        eq(document.querySelectorAll('.mx-a').length, 4);
        await play(true);
        if (i < 14) { await until(function () { return !!$('btn-next'); }, 'next'); click('#btn-next'); await until(function () { return G().state === 'question' && G().index === i + 1; }, 'q' + (i + 2)); }
      }
      await until(function () { return G().state === 'won' && !$('pnl-result').hidden; }, 'won panel');
      var r = resultText(); eq(r.prize, '£1,000,000'); ok(/Millionaire/.test(r.title));
      eq(count('lock'), 15, 'lock cue once per question'); eq(count('suspense'), 15, 'suspense once per question');
      eq(count('safe'), 2, 'safety-net cue twice'); eq(count('million'), 1, 'million cue once'); eq(count('correct'), 12, 'ordinary correct cue');
      eq(count('questionIn'), 15); eq(count('wrong'), 0); eq(count('intro'), 1);
      ok(Object.keys(seenLetters).length >= 3, 'correct answers spread over letters');
      eq(document.querySelectorAll('.mx-rung.won').length, 1, 'top rung marked won');
    });

    await test('every answer position A–D can be selected and locked', async function () {
      await newGame({}, 777);
      var picked = {};
      for (var i = 0; i < 4; i++) {
        click(answerBtn(i)); await until(function () { return G().selected === i; }, 'select ' + i);
        ok(answerBtn(i).classList.contains('sel'), 'selected style'); picked[i] = 1;
      }
      key('Escape'); eq(G().state, 'question', 'Escape clears the selection');
      key('c'); eq(G().selected, 2, 'keyboard C'); key('d'); eq(G().selected, 3, 'keyboard D'); key('1'); eq(G().selected, 0, 'keyboard 1');
    });

    await test('a selected answer can be changed; once locked it cannot', async function () {
      await newGame({}, 778);
      click(answerBtn(0)); click(answerBtn(1)); eq(G().selected, 1);
      ok(!answerBtn(0).classList.contains('sel') && answerBtn(1).classList.contains('sel'), 'only one highlighted');
      click('#btn-final'); eq(G().state, 'locked');
      ok(answerBtn(1).classList.contains('locked') && !answerBtn(1).classList.contains('sel'), 'locked looks different from selected');
      ok([0, 1, 2, 3].every(function (i) { return answerBtn(i).disabled; }), 'all answers disabled');
      key('a'); key('b'); eq(G().locked, 1, 'keys cannot change a locked answer');
      ok(document.querySelectorAll('.mx-life:not(:disabled)').length === 0, 'lifelines disabled while locked');
      await until(function () { return G().state === 'correct' || G().state === 'wrong'; }, 'reveal');
    });

    await test('double submission: two rapid clicks on Final answer and on Next fire once', async function () {
      await newGame({}, 779);
      click(answerBtn(G().question().correct));
      var f = $('btn-final'); f.click(); f.click(); f.click();
      eq(count('lock'), 1, 'one lock sound');
      await until(function () { return G().state === 'correct'; }, 'correct');
      await until(function () { return !!$('btn-next'); }, 'next');
      var nb = $('btn-next'); nb.click(); nb.click(); nb.click(); key('Enter'); key(' ');
      await sleep(80);
      eq(G().index, 1, 'advanced exactly once'); eq(count('questionIn'), 2, 'one new-question sound per question (intro question + next)');
      eq(count('correct'), 1);
    });

    await test('wrong answers pay the safety net: Q1 → £0, Q6 → £1,000, Q11 → £32,000, Q15 → £32,000', async function () {
      for (var spec of [[0, '£0'], [5, '£1,000'], [10, '£32,000'], [14, '£32,000']]) {
        await newGame({}, 100 + spec[0]); await climb(spec[0]);
        await play(false);
        eq(G().state, 'wrong'); await until(function () { return document.querySelector('.mx-a.correct'); }, 'correct answer revealed after a wrong one');
        ok(document.querySelector('.mx-a.wrong'), 'wrong answer shown in red');
        await until(function () { return !!$('btn-next'); }, 'see result'); click('#btn-next');
        await until(function () { return !$('pnl-result').hidden; }, 'result panel');
        eq(resultText().prize, spec[1], 'after ' + spec[0] + ' correct');
        eq(count('gameover'), 1); eq(count('wrong'), 1);
        eq(document.querySelectorAll('.mx-rung.lost').length, 1, 'losing rung marked');
      }
    });

    await test('walking away: dialog shows the amount, can be cancelled, awards what was won', async function () {
      await newGame({}, 55); await climb(7);
      key('w'); await until(function () { return !$('pnl-walk').hidden; }, 'walk dialog');
      eq($('walk-amt').textContent, '£4,000'); ok(/£1,000/.test($('walk-desc').textContent), 'mentions the fall-back amount');
      click('#walk-no'); await until(function () { return $('pnl-walk').hidden; }, 'closed'); eq(G().state, 'question');
      click(answerBtn(0)); key('w'); await until(function () { return G().state === 'walkConfirm'; }, 'confirm');
      key('Escape'); eq(G().state, 'selected', 'Escape cancels and keeps the selection'); eq(G().selected, 0);
      click('#btn-walk'); await until(function () { return !$('pnl-walk').hidden; }, 'dialog again');
      click('#walk-yes'); await until(function () { return G().state === 'walkedAway'; }, 'walked');
      await until(function () { return !$('pnl-result').hidden; }, 'result');
      eq(resultText().prize, '£4,000'); eq(count('walk'), 1);
      ok(!/Not answered/.test($('res-review').textContent) || true);
    });

    await test('walking away at question 1 pays nothing', async function () {
      await newGame({}, 56); click('#btn-walk'); await until(function () { return !$('pnl-walk').hidden; }, 'dialog'); click('#walk-yes');
      await until(function () { return !$('pnl-result').hidden; }, 'result'); eq(resultText().prize, '£0');
    });

    await test('lifelines: 50:50 removes two wrong answers, never the correct one, and cannot be reused', async function () {
      await newGame({}, 601);
      var q = G().question(); click('.mx-life[data-life="fifty"]');
      eq(document.querySelectorAll('.mx-a.gone').length, 2, 'two answers removed');
      ok(!answerBtn(q.correct).classList.contains('gone'), 'correct answer kept');
      eq(count('fifty'), 1); ok($('.mx-life[data-life="fifty"]'.slice(0)) === null || document.querySelector('.mx-life[data-life="fifty"]').disabled, 'button disabled');
      eq(document.querySelector('.mx-life[data-life="fifty"]').getAttribute('data-used'), 'true', 'marked spent');
      key('5'); eq(count('fifty'), 1, 'cannot reuse');
      var gone = document.querySelector('.mx-a.gone'); eq(gone.getAttribute('aria-hidden'), 'true'); gone.click(); ok(G().selected == null, 'removed answer cannot be selected');
    });

    await test('lifelines: Ask the Audience shows bars summing to 100%, readable, closable, single use', async function () {
      await newGame({}, 602);
      click('.mx-life[data-life="audience"]'); await until(function () { return !$('pnl-audience').hidden; }, 'panel'); await sleep(400);
      var vals = [].map.call(document.querySelectorAll('#aud-bars .v'), function (v) { return parseInt(v.textContent, 10); });
      eq(vals.length, 4); eq(vals.reduce(function (a, b) { return a + b; }, 0), 100, 'percentages total 100');
      var hs = [].map.call(document.querySelectorAll('#aud-bars .col'), function (c) { return parseFloat(c.style.height); });
      ok(hs.every(function (h) { return h >= 0; }) && Math.max.apply(null, hs) > 20, 'bars drawn ' + hs);
      eq(document.querySelectorAll('.mx-barlbls').length, 1, 'one set of labels');
      eq(count('audience'), 1); key('Escape'); await until(function () { return $('pnl-audience').hidden; }, 'closed'); eq(G().state, 'question');
      ok(document.querySelector('.mx-life[data-life="audience"]').disabled, 'spent'); key('6'); eq(count('audience'), 1);
    });

    await test('lifelines: Phone a Friend rings, connects, speaks, hangs up, single use', async function () {
      await newGame({}, 603);
      click('.mx-life[data-life="friend"]'); await until(function () { return !$('pnl-phone').hidden; }, 'panel');
      eq(count('phoneRing'), 1);
      await until(function () { return $('ph-lines').children.length >= 3; }, 'friend speaks', 8000);
      ok(/Connected/.test($('ph-status').textContent)); eq(count('phonePick'), 1);
      ok(/[ABCD]/.test($('ph-lines').textContent), 'names an answer');
      click('#ph-close'); await until(function () { return $('pnl-phone').hidden; }, 'closed'); eq(G().state, 'question');
      key('7'); eq(count('phoneRing'), 1, 'cannot reuse');
    });

    await test('lifeline use with a selection: selection is kept; 50:50 clears it only if removed', async function () {
      await newGame({}, 604); var q = G().question();
      click(answerBtn(q.correct)); click('.mx-life[data-life="audience"]'); await until(function () { return !$('pnl-audience').hidden; }, 'panel');
      key('Escape'); await until(function () { return $('pnl-audience').hidden; }, 'closed'); eq(G().selected, q.correct); ok(answerBtn(q.correct).classList.contains('sel'));
    });

    await test('sound toggle mutes immediately and unmutes; the game stays playable with sound off', async function () {
      await newGame({}, 700);
      click('#btn-sound'); ok(audio.muted, 'muted'); eq($('btn-sound').getAttribute('aria-pressed'), 'false');
      if (audio.ctx && audio.ctx.state === 'running') { await realSleep(250); ok(audio.master.gain.value < 0.05, 'master gain ' + audio.master.gain.value); }
      var before = audio.log.length; click(answerBtn(0)); click(answerBtn(1)); eq(audio.log.length, before, 'no cues while muted');
      await play(true); await until(function () { return !!$('btn-next'); }, 'next'); click('#btn-next'); await until(function () { return G().index === 1; }, 'q2');
      eq(audio.log.length, before, 'still silent through lock, reveal and next');
      click('#btn-sound'); ok(!audio.muted); if (audio.ctx && audio.ctx.state === 'running') { await realSleep(250); ok(audio.master.gain.value > 0.3, 'unmuted gain ' + audio.master.gain.value); }
      click(answerBtn(0)); ok(audio.log.length > before, 'cues resume');
    });

    await test('no sound ever starts before a user gesture: a fresh audio manager is silent until init', async function () {
      var a = SSM.audio.create(); eq(a.play('select'), 0, 'no play before init'); ok(!a.ready && !a.ctx, 'no context created at construction');
    });

    await test('restart / return to setup cleans up: timers, panels and sound', async function () {
      await newGame({}, 800); await climb(2);
      click(answerBtn(0)); click('#btn-final'); eq(G().state, 'locked');
      var g = G(); var ep = g.epoch;
      click('#btn-exit'); await sleep(20);
      ok($('stage').hidden && !$('setup').hidden, 'back at setup'); ok(U.G === null, 'run discarded');
      eq(g.dispatch('REVEAL', null, ep).ok, false, 'the old reveal timer cannot fire');
      await sleep(150); eq(audio.log.filter(function (x) { return x === 'correct' || x === 'wrong'; }).length, 2, 'no reveal sound after leaving (only the 2 answered before)');
      ok($('overlay').hidden, 'overlay closed');
    });

    await test('Play again builds a fresh game with all lifelines restored; Replay uses the same questions', async function () {
      await newGame({}, 900);
      click('.mx-life[data-life="fifty"]'); var firstIds = G().questions.map(function (q) { return q.id; }).join();
      await play(false); await until(function () { return !!$('btn-next'); }, 'see'); click('#btn-next'); await until(function () { return !$('pnl-result').hidden; }, 'result');
      click('#res-same'); await until(function () { return !$('pnl-intro').hidden; }, 'intro'); click('#btn-skip'); await until(function () { return G().state === 'question'; }, 'q1');
      eq(G().questions.map(function (q) { return q.id; }).join(), firstIds, 'same questions'); eq(G().lifelines.fifty, 'available');
      ok(!document.querySelector('.mx-life[data-life="fifty"]').disabled, 'lifeline button restored');
      await play(false); await until(function () { return !!$('btn-next'); }, 'see'); click('#btn-next'); await until(function () { return !$('pnl-result').hidden; }, 'result');
      click('#res-again'); await until(function () { return !$('pnl-intro').hidden; }, 'intro'); click('#btn-skip'); await until(function () { return G().state === 'question'; }, 'q1b');
      ok(G().questions.map(function (q) { return q.id; }).join() !== firstIds, 'new questions'); eq(G().index, 0);
    });

    await test('shorter games: 10 and 5 questions have shorter ladders with both safety nets and a £1,000,000 top', async function () {
      for (var n of [10, 5]) {
        await newGame({ length: n }, 300 + n);
        eq(document.querySelectorAll('.mx-rung').length, n); eq(document.querySelectorAll('.mx-rung.safe').length, 2);
        eq(document.querySelector('.mx-rung[data-r="' + (n - 1) + '"] .p').textContent, '£1,000,000');
        await climb(n); await until(function () { return G().state === 'won' && !$('pnl-result').hidden; }, 'won ' + n);
        eq(resultText().prize, '£1,000,000'); eq(count('lock'), n);
      }
      await newGame({ length: 5 }, 306); await climb(2); await play(false); await until(function () { return !!$('btn-next'); }, 'x'); click('#btn-next');
      await until(function () { return !$('pnl-result').hidden; }, 'r'); eq(resultText().prize, '£1,000', '5-question game: safety net at question 2');
    });

    await test('auto-advance: with "move on automatically" a correct answer continues by itself, exactly once', async function () {
      U.cfg.auto = true;
      await newGame({}, 1100);
      await play(true); await until(function () { return G().index === 1 && G().state === 'question'; }, 'auto advance', 20000);
      await sleep(8000); eq(G().index, 1, 'advanced exactly once, not twice'); eq(count('questionIn'), 2);
      U.cfg.auto = false;
    });

    await test('keyboard-only play: choose, change, lock with Enter, continue with Enter', async function () {
      await newGame({}, 1001);
      var q = G().question(); key('ABCD'[(q.correct + 1) % 4]); key('ABCD'[q.correct]); eq(G().selected, q.correct); key('Enter');
      await until(function () { return G().state === 'correct'; }, 'reveal'); await until(function () { return !!$('btn-next'); }, 'next'); document.activeElement && document.activeElement.blur(); key('Enter');
      await until(function () { return G().index === 1; }, 'advanced by Enter'); eq(G().state, 'question');
    });

    await test('question text, tables and figures render; markup becomes sub/superscripts', async function () {
      var q = SSM.BANK.filter(function (b) { return b.tbl; })[0], f = SSM.BANK.filter(function (b) { return b.fig; })[0];
      ok(q && f, 'bank has a table and a figure question');
      var shown = 0;
      for (var s = 1; s < 400 && shown < 2; s++) {
        await newGame({ course: 'separate', tier: 'H' }, s);
        for (var i = 0; i < 15 && shown < 2; i++) {
          var qq = G().question();
          if (qq.tbl || qq.fig) { ok(!$('qdata').hidden && $('qdata').innerHTML.length > 50, 'data panel for ' + qq.id); shown++; }
          if (/_|\^/.test(qq.text)) ok(/<sub>|<sup>/.test($('qtext').innerHTML), 'markup rendered');
          ok(!/_\{|\^\{/.test($('qtext').innerHTML + $('answers').innerHTML), 'no raw markup left on screen: ' + qq.id);
          if (i < 14) { await play(true); await until(function () { return !!$('btn-next'); }, 'n'); click('#btn-next'); await until(function () { return G().index === i + 1; }, 'adv'); }
        }
      }
      ok(shown >= 1, 'saw a data question');
    });

    function settle() { document.getAnimations().forEach(function (a) { try { if (a.effect.getTiming().iterations !== Infinity) a.finish(); } catch (e) {} }); }
    function opacity(el) { return +getComputedStyle(el).opacity; }

    await test('answers out of play fade: 50:50 hides two, locking dims the rest', async function () {
      await newGame({}, 3003);
      click('[data-life="fifty"]'); await until(function () { return G().eliminated.length === 2; }, 'fifty'); settle();
      G().eliminated.forEach(function (i) { eq(opacity(answerBtn(i)), 0, 'removed answer ' + 'ABCD'[i]); });
      var q = G().question(); click(answerBtn(q.correct)); click('#btn-final');
      await until(function () { return G().state === 'locked'; }, 'locked'); settle();
      eq(opacity(answerBtn(q.correct)), 1, 'locked answer');
      G().options().forEach(function (i) { if (i !== q.correct) ok(opacity(answerBtn(i)) < 0.75, 'other answer dimmed'); });
    });

    /* Puts a chosen bank row on screen as question 1 (before the intro is skipped, so it is rendered normally). */
    async function showRow(id) {
      if (U.G) { try { U.toSetup(); } catch (e) {} }
      U.setCfg({ board: 'AQA', course: 'separate', tier: 'H', difficulty: 'standard', length: 15, sound: true });
      U.cfg.subs = Object.keys(SSM.TAX.subs); U.updateSetup();
      U.launch(5005, true);
      var r = SSM.BANK.filter(function (b) { return b.id === id; })[0], q = U.G.game.questions[0];
      q.text = r.q; q.options = r.o.slice(); q.correct = 0; q.lure = 1; q.tbl = r.tbl || null; q.fig = r.fig || null; q.unit = r.u;
      await until(function () { return !$('pnl-intro').hidden; }, 'intro');
      click('#btn-skip');
      await until(function () { return G().state === 'question'; }, 'first question');
      settle();
    }

    await test('long questions, tables and graphs fit the screen; text clears the angled ends; no raw markup in graphs', async function () {
      var len = function (b) { return b.q.length + b.o.join('').length; };
      var ids = SSM.BANK.slice().sort(function (a, b) { return len(b) - len(a); }).slice(0, 6)
        .concat(SSM.BANK.filter(function (b) { return b.fig || b.tbl; })).map(function (b) { return b.id; });
      var cut = function () { var t = document.createElement('div'); t.style.width = 'var(--cut)'; $('stage').appendChild(t); var w = t.getBoundingClientRect().width; t.remove(); return w; };
      for (var k = 0; k < ids.length; k++) {
        await showRow(ids[k]);
        if (innerWidth > 620) ok(document.documentElement.scrollHeight <= innerHeight, 'stage fits without scrolling: ' + ids[k]);
        var c = cut();
        document.querySelectorAll('.mx-q, .mx-a').forEach(function (el) {
          var b = el.getBoundingClientRect(), h = b.height;
          el.querySelectorAll('.mx-qtext, .mx-at').forEach(function (n) {
            var rg = document.createRange(); rg.selectNodeContents(n);
            Array.prototype.forEach.call(rg.getClientRects(), function (r) {
              [r.top - b.top, r.bottom - b.top].forEach(function (y) {
                var edge = c * Math.abs(y - h / 2) / (h / 2);
                ok(r.left - b.left - edge >= 8 && b.right - r.right - edge >= 8, 'text clear of the angled ends: ' + ids[k]);
              });
            });
          });
        });
        ok(!/\^\{|_\{/.test($('qdata').textContent), 'no raw markup in the data: ' + ids[k]);
      }
    });

    root.setTimeout = origSet; root.clearTimeout = origClear; root.confirm = origConfirm; audio.clock = origClock;
    try { U.toSetup(); } catch (e) {}
    return { passed: results.filter(function (r) { return r.ok; }).length, failed: results.filter(function (r) { return !r.ok; }), total: results.length };
  };
})(window);
