/* Who Wants to Be a Science Millionaire? — game engine.
   Pure logic, no DOM and no timers, so it can be tested headless (see tests.html / tests/run.js).
   The UI owns the clock: it schedules timed events (REVEAL, ADVANCE, FINISH) carrying the epoch it saw
   when it scheduled them. Any event whose epoch is stale is rejected, so a duplicate click, a double
   timer or a late timer can never submit twice, advance twice or replay a sound.

   States:  ready → question ⇄ selected → locked → correct → question … → won
                    question|selected ⇄ lifeline | walkConfirm → walkedAway
                    locked → wrong → gameOver
   Terminal states: won, walkedAway, gameOver (RESTART returns to ready). */
(function (root) {
  'use strict';
  var SSM = root.SSM = root.SSM || {};

  /* ---------- Prize ladders ----------
     "safe" lists question numbers (1-based) whose prize is guaranteed once that question has been
     answered correctly. Shorter games keep the £1,000 and £32,000 safety nets and the £1,000,000 top. */
  var LADDERS = {
    15: { n: 15, prizes: [100, 200, 300, 500, 1000, 2000, 4000, 8000, 16000, 32000, 64000, 125000, 250000, 500000, 1000000], safe: [5, 10] },
    10: { n: 10, prizes: [100, 200, 500, 1000, 4000, 16000, 32000, 125000, 500000, 1000000], safe: [4, 7] },
    5:  { n: 5,  prizes: [100, 1000, 8000, 32000, 1000000], safe: [2, 4] }
  };

  function gbp(n) { return '£' + String(n).replace(/\B(?=(\d{3})+(?!\d))/g, ','); }

  /* Prize guaranteed after nCorrect correct answers: the highest safety net reached, else nothing. */
  function guaranteed(ladder, nCorrect) {
    var best = 0;
    for (var i = 0; i < ladder.safe.length; i++) {
      if (ladder.safe[i] <= nCorrect) best = ladder.prizes[ladder.safe[i] - 1];
    }
    return best;
  }
  /* Prize taken home by walking away: everything won so far. */
  function walkValue(ladder, nCorrect) { return nCorrect > 0 ? ladder.prizes[nCorrect - 1] : 0; }
  /* Prize taken home after a wrong answer: the safety net only. */
  function wrongValue(ladder, nCorrect) { return guaranteed(ladder, nCorrect); }

  /* ---------- Seeded randomness ---------- */
  function hashStr(s) {
    var h = 2166136261 >>> 0;
    for (var i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619) >>> 0; }
    return h >>> 0;
  }
  function mulberry32(a) {
    a = a >>> 0;
    return function () {
      a = (a + 0x6D2B79F5) >>> 0;
      var t = a;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
  function rngFor(seed, label) { return mulberry32(hashStr(String(seed) + '|' + label)); }

  /* ---------- Game ---------- */
  var EVENTS = {
    START:        { from: ['ready'] },
    SELECT:       { from: ['question', 'selected'] },
    DESELECT:     { from: ['selected'] },
    LOCK:         { from: ['selected'] },
    REVEAL:       { from: ['locked'], timed: true },
    ADVANCE:      { from: ['correct'], timed: true },
    FINISH:       { from: ['correct', 'wrong'], timed: true },
    USE_LIFELINE: { from: ['question', 'selected'] },
    CLOSE_LIFELINE: { from: ['lifeline'] },
    WALK_REQUEST: { from: ['question', 'selected'] },
    WALK_CANCEL:  { from: ['walkConfirm'] },
    WALK_CONFIRM: { from: ['walkConfirm'] },
    RESTART:      { from: ['ready', 'question', 'selected', 'locked', 'correct', 'wrong', 'lifeline', 'walkConfirm', 'won', 'walkedAway', 'gameOver'] }
  };

  /* questions: prepared questions (see select.js): { id, text, options: [..4 strings..], correct: 0-3, diff, ... }
     opts.lifelines: the lifeline module (defaults to SSM.lifelines). */
  function createGame(opts) {
    var ladder = LADDERS[opts.ladder];
    if (!ladder) throw new Error('Unknown ladder ' + opts.ladder);
    if (opts.questions.length !== ladder.n) throw new Error('Need ' + ladder.n + ' questions, got ' + opts.questions.length);
    var LL = opts.lifelines || SSM.lifelines;
    var listeners = [];
    var g = {
      ladder: ladder, questions: opts.questions, seed: opts.seed == null ? 1 : opts.seed,
      history: [], rejected: 0
    };
    reset();

    function reset() {
      g.state = 'ready';
      g.epoch = 0;
      g.index = 0;               // 0-based index of the question on screen
      g.correctCount = 0;        // questions answered correctly so far
      g.selected = null;         // display index 0-3 of the highlighted answer
      g.locked = null;           // display index 0-3 of the locked answer
      g.eliminated = [];         // option indices removed by 50:50 (this question)
      g.lifelines = { fifty: 'available', audience: 'available', friend: 'available' };
      g.lifelineResult = null;   // { kind, ... } while a lifeline panel is open, and kept for the question
      g.lifelineLog = [];        // [{ kind, qIndex }]
      g.activeLifeline = null;
      g.resume = null;           // state to return to after a lifeline / walk confirmation
      g.outcome = null;          // set at LOCK: { correct, chosen }
      g.result = null;           // set when the game ends: { reason, prize, guaranteed, answered }
    }

    function snapshot() {
      return {
        state: g.state, epoch: g.epoch, index: g.index, selected: g.selected, locked: g.locked,
        eliminated: g.eliminated.slice(), correctCount: g.correctCount
      };
    }

    function emit(type, from, payload) {
      var info = { type: type, from: from, to: g.state, payload: payload, game: g };
      g.history.push({ type: type, from: from, to: g.state, epoch: g.epoch });
      for (var i = 0; i < listeners.length; i++) listeners[i](info);
    }

    function enter(state) { g.state = state; g.epoch++; }

    function currentQuestion() { return g.questions[g.index]; }
    function currentPrize() { return ladder.prizes[g.index]; }
    function isSafeRung(i) { return ladder.safe.indexOf(i + 1) !== -1; }

    /* dispatch(type, payload, epoch?). Timed events must pass the epoch they were scheduled in. */
    function dispatch(type, payload, atEpoch) {
      var def = EVENTS[type];
      var from = g.state;
      if (!def || def.from.indexOf(from) === -1) { g.rejected++; return { ok: false, reason: 'bad-state', from: from }; }
      if (def.timed && atEpoch !== g.epoch) { g.rejected++; return { ok: false, reason: 'stale', from: from }; }
      payload = payload || {};

      switch (type) {
        case 'START':
          enter('question');
          break;

        case 'SELECT': {
          var i = payload.index;
          if (!(i >= 0 && i < 4) || g.eliminated.indexOf(i) !== -1) { g.rejected++; return { ok: false, reason: 'bad-option', from: from }; }
          g.selected = i;
          enter('selected');
          break;
        }
        case 'DESELECT':
          g.selected = null;
          enter('question');
          break;

        case 'LOCK':
          if (g.selected == null) { g.rejected++; return { ok: false, reason: 'no-selection', from: from }; }
          g.locked = g.selected;
          g.outcome = { correct: g.locked === currentQuestion().correct, chosen: g.locked };
          enter('locked');
          break;

        case 'REVEAL':
          if (g.outcome.correct) {
            g.correctCount++;
            enter('correct');
          } else {
            enter('wrong');
            g.result = { reason: 'wrong', prize: wrongValue(ladder, g.correctCount), guaranteed: guaranteed(ladder, g.correctCount), answered: g.correctCount };
          }
          break;

        case 'ADVANCE':
          if (g.correctCount >= ladder.n) { g.rejected++; return { ok: false, reason: 'no-more-questions', from: from }; }
          g.index++;
          g.selected = null; g.locked = null; g.outcome = null; g.eliminated = []; g.lifelineResult = null;
          enter('question');
          break;

        case 'FINISH':
          if (from === 'correct') {
            if (g.correctCount < ladder.n) { g.rejected++; return { ok: false, reason: 'not-finished', from: from }; }
            g.result = { reason: 'won', prize: ladder.prizes[ladder.n - 1], guaranteed: ladder.prizes[ladder.n - 1], answered: g.correctCount };
            enter('won');
          } else {
            enter('gameOver');
          }
          break;

        case 'USE_LIFELINE': {
          var kind = payload.kind;
          if (!g.lifelines.hasOwnProperty(kind) || g.lifelines[kind] !== 'available') { g.rejected++; return { ok: false, reason: 'lifeline-spent', from: from }; }
          var q = currentQuestion();
          g.lifelines[kind] = 'used';
          g.lifelineLog.push({ kind: kind, qIndex: g.index });
          var rng = rngFor(g.seed, q.id + '|' + kind);
          if (kind === 'fifty') {
            g.eliminated = LL.fifty(q, rng);
            g.lifelineResult = { kind: kind, eliminated: g.eliminated.slice() };
            if (g.eliminated.indexOf(g.selected) !== -1) { g.selected = null; g.resume = 'question'; } else { g.resume = from; }
            g.state = g.resume; g.epoch++;   // applied instantly: back to the question
            g.activeLifeline = null;
            emit(type, from, payload);
            return { ok: true, from: from, to: g.state };
          }
          g.resume = from;
          g.activeLifeline = kind;
          g.lifelineResult = kind === 'audience'
            ? { kind: kind, result: LL.audience(q, g.eliminated, rng, g.index) }
            : { kind: kind, result: LL.friend(q, g.eliminated, rng, g.index) };
          enter('lifeline');
          break;
        }
        case 'CLOSE_LIFELINE':
          g.activeLifeline = null;
          enter(g.resume);
          break;

        case 'WALK_REQUEST':
          g.resume = from;
          enter('walkConfirm');
          break;
        case 'WALK_CANCEL':
          enter(g.resume);
          break;
        case 'WALK_CONFIRM':
          g.result = { reason: 'walked', prize: walkValue(ladder, g.correctCount), guaranteed: guaranteed(ladder, g.correctCount), answered: g.correctCount };
          enter('walkedAway');
          break;

        case 'RESTART':
          reset();
          g.epoch = (g.restarts = (g.restarts || 0) + 1) * 1000;   // invalidates every earlier timer
          break;
      }
      emit(type, from, payload);
      return { ok: true, from: from, to: g.state };
    }

    g.dispatch = dispatch;
    g.on = function (fn) { listeners.push(fn); return function () { listeners.splice(listeners.indexOf(fn), 1); }; };
    g.snapshot = snapshot;
    g.question = currentQuestion;
    g.currentPrize = currentPrize;
    g.isSafeRung = isSafeRung;
    g.walkValue = function () { return walkValue(ladder, g.correctCount); };
    g.wrongValue = function () { return wrongValue(ladder, g.correctCount); };
    g.guaranteedNow = function () { return guaranteed(ladder, g.correctCount); };
    g.isFinal = function () { return g.index === ladder.n - 1; };
    g.isTerminal = function () { return g.state === 'won' || g.state === 'walkedAway' || g.state === 'gameOver'; };
    g.options = function () {   // indices of options still in play
      return [0, 1, 2, 3].filter(function (i) { return g.eliminated.indexOf(i) === -1; });
    };
    return g;
  }

  SSM.engine = { LADDERS: LADDERS, createGame: createGame, guaranteed: guaranteed, walkValue: walkValue, wrongValue: wrongValue, gbp: gbp, EVENTS: EVENTS };
  SSM.rand = { hashStr: hashStr, mulberry32: mulberry32, rngFor: rngFor };
})(typeof window !== 'undefined' ? window : globalThis);
