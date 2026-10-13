/* Who Wants to Be a Science Millionaire? — interface.
   Teacher setup, then the stage. All game rules live in engine.js; this file draws the engine's state,
   turns its transitions into sound and timing, and nothing else. Every sound and every timed step is
   triggered from the single engine listener (onGame), so a transition the engine rejects can never
   play a second sound or advance a second time. */
(function () {
  'use strict';
  var SSM = window.SSM, TAX = SSM.TAX, E = SSM.engine, SEL = SSM.select;
  var BANK = SSM.BANK || [];

  /* ---------- tiny helpers ---------- */
  function $(id) { return document.getElementById(id); }
  function qs(sel, el) { return (el || document).querySelector(sel); }
  function qsa(sel, el) { return Array.prototype.slice.call((el || document).querySelectorAll(sel)); }
  function esc(s) { return String(s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  /* Markup shared with the Interleaved Grid: _2 / _{2n+2} subscript, ^{2−} superscript, [[mass|atomic|X]] nuclide */
  function fmt(s) {
    return esc(s)
      .replace(/\[\[([^|\]]+)\|([^|\]]+)\|([^\]]+)\]\]/g, '<sup>$1</sup><sub style="margin-left:-.6em">$2</sub>$3')
      .replace(/\^\{([^}]*)\}/g, function (m, x) { return '<sup>' + x.replace(/-/g, '−') + '</sup>'; })
      .replace(/_\{([^}]*)\}/g, '<sub>$1</sub>')
      .replace(/_([0-9]+|[a-z]\b)/g, '<sub>$1</sub>');
  }
  function plain(s) { return String(s).replace(/\[\[([^|\]]+)\|([^|\]]+)\|([^\]]+)\]\]/g, '$1$3').replace(/\^\{([^}]*)\}/g, '^$1').replace(/_\{([^}]*)\}/g, '$1').replace(/_([0-9]+|[a-z]\b)/g, '$1'); }
  var gbp = E.gbp;
  var LETTERS = ['A', 'B', 'C', 'D'];
  var KEY = 'sst-millionaire-v1';
  function lsGet(k) { try { return window.localStorage.getItem(k); } catch (e) { return null; } }
  function lsSet(k, v) { try { window.localStorage.setItem(k, v); } catch (e) {} }
  var reduceMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ============================================================
     SETUP
     ============================================================ */
  var cfg = { board: 'AQA', course: 'combined', tier: 'F', difficulty: 'standard', length: 15, subs: [], sound: true, auto: false };
  var expanded = {};
  var allSubs = Object.keys(TAX.subs);

  function loadCfg() {
    cfg.subs = allSubs.slice();
    var raw = lsGet(KEY);
    if (!raw) return;
    try {
      var s = JSON.parse(raw);
      if (s.board === 'AQA' || s.board === 'Edexcel') cfg.board = s.board;
      if (s.course === 'combined' || s.course === 'separate') cfg.course = s.course;
      if (s.tier === 'F' || s.tier === 'H') cfg.tier = s.tier;
      if (['gentle', 'standard', 'challenge'].indexOf(s.difficulty) !== -1) cfg.difficulty = s.difficulty;
      if ([5, 10, 15].indexOf(s.length) !== -1) cfg.length = s.length;
      if (Array.isArray(s.subs)) cfg.subs = s.subs.filter(function (x) { return TAX.subs[x]; });
      cfg.sound = s.sound !== false; cfg.auto = !!s.auto;
    } catch (e) {}
  }
  function saveCfg() { lsSet(KEY, JSON.stringify(cfg)); }

  function selCfg(extra) {
    return Object.assign({ board: cfg.board, course: cfg.course, tier: cfg.tier, difficulty: cfg.difficulty, length: cfg.length, subs: cfg.subs, seed: 1 }, extra || {});
  }

  /* Why a subtopic is greyed out, given the filters and its availability. */
  function whyOff(sid, avail) {
    if (avail.bySub[sid]) return '';
    var sb = TAX.subs[sid];
    if (cfg.course === 'combined' && sb.sepOnly) return 'Separate Sciences only';
    if (cfg.tier === 'F' && sb.htOnly) return 'Higher tier only';
    return 'No questions yet for this board, course and tier';
  }

  var SUBJ_CHEV = '<svg class="su-schev" width="18" height="18" viewBox="0 0 16 16" aria-hidden="true"><path d="m3 5.5 5 5 5-5" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>';
  function buildTopics() {
    var host = $('su-topics');
    var html = '';
    TAX.subjects.forEach(function (S) {
      html += '<div class="su-subj" data-s="' + S.id + '"><div class="su-subjhead">' +
        '<button type="button" class="su-subjbtn" aria-expanded="false" aria-controls="su-panel-' + S.id + '"><span class="su-dot" aria-hidden="true"></span><span class="su-sname">' + S.name + '</span><span class="su-subjcount" data-subjcount="' + S.id + '"></span>' + SUBJ_CHEV + '</button>' +
        '<label class="su-subjtick"><input type="checkbox" data-subjcb="' + S.id + '" aria-label="Tick all ' + S.name + ' topics"></label></div>' +
        '<div class="su-panel" id="su-panel-' + S.id + '" hidden>';
      S.units.forEach(function (uid) {
        var u = TAX.units[uid];
        html += '<div class="su-unit" data-u="' + uid + '"><div class="su-urow">' +
          '<label><input type="checkbox" data-unit="' + uid + '"><span class="su-uname"><b>' + esc(u.name) + '</b><small data-ref="' + uid + '"></small></span></label>' +
          '<span class="su-ucount" data-ucount="' + uid + '"></span>' +
          '<button type="button" class="su-chev" data-exp="' + uid + '" aria-expanded="false" aria-controls="subs-' + uid + '" aria-label="Show subtopics of ' + esc(u.name) + '"><svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true"><path d="m5.5 3 5 5-5 5"fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg></button></div>' +
          '<ul class="su-subs" id="subs-' + uid + '" hidden>';
        Object.keys(TAX.subs).filter(function (k) { return TAX.subs[k].unit === uid; }).forEach(function (sid) {
          html += '<li class="su-sub" data-sub="' + sid + '"><label><input type="checkbox" data-subcb="' + sid + '"><span>' + esc(TAX.subs[sid].label) + '</span></label><span class="su-ucount" data-scount="' + sid + '"></span><span class="su-why" data-why="' + sid + '"></span></li>';
        });
        html += '</ul></div>';
      });
      html += '</div></div>';
    });
    host.innerHTML = html;
  }

  function setRadio(name, val) { qsa('input[name=' + name + ']').forEach(function (r) { r.checked = (r.value === String(val)); }); }

  function updateSetup() {
    var avail = SEL.availability(BANK, selCfg());
    var chosen = {}; cfg.subs.forEach(function (s) { chosen[s] = true; });

    // course note
    var note = SSM.specRef('B1', cfg.board, cfg.course);
    var codes = TAX.courses[cfg.course].codes[cfg.board];
    var codeTxt = typeof codes === 'string' ? codes : codes.B + ' · ' + codes.C + ' · ' + codes.P;
    $('su-courseNote').textContent = (cfg.board === 'AQA' ? 'AQA ' : 'Pearson Edexcel ') + codeTxt + (cfg.course === 'combined' ? '. Combined Science leaves out content that is only in the Separate Sciences.' : '. Includes the Separate Sciences extension content.') + (cfg.tier === 'F' ? ' Foundation games leave out Higher-tier-only content.' : ' Higher games draw on Foundation and Higher content, weighted towards Higher as the ladder climbs.') + ' Topics follow AQA order; most questions test content shared by both boards.';

    TAX.subjects.forEach(function (S) {
      var subjTotal = 0, subjSel = 0, subjUse = 0, subjOn = 0;
      S.units.forEach(function (uid) {
        var subIds = Object.keys(TAX.subs).filter(function (k) { return TAX.subs[k].unit === uid; });
        var usable = subIds.filter(function (s) { return avail.bySub[s]; });
        var onCount = usable.filter(function (s) { return chosen[s]; }).length;
        var cb = qs('[data-unit="' + uid + '"]');
        cb.disabled = usable.length === 0;
        cb.checked = usable.length > 0 && onCount === usable.length;
        cb.indeterminate = onCount > 0 && onCount < usable.length;
        var unitEl = qs('[data-u="' + uid + '"]');
        unitEl.classList.toggle('is-off', usable.length === 0);
        var u = TAX.units[uid];
        qs('[data-ref="' + uid + '"]').textContent = cfg.board === 'Edexcel' ? 'Edexcel: ' + u.edx : SSM.specRef(uid, 'AQA', cfg.course);
        var total = avail.byUnit[uid] || 0;
        var sel = 0; usable.forEach(function (s) { if (chosen[s]) sel += avail.bySub[s]; });
        subjTotal += total; subjSel += sel; subjUse += usable.length; subjOn += onCount;
        qs('[data-ucount="' + uid + '"]').textContent = usable.length ? total : '–';
        subIds.forEach(function (sid) {
          var n = avail.bySub[sid] || 0, el = qs('[data-sub="' + sid + '"]');
          var cbs = qs('[data-subcb="' + sid + '"]');
          cbs.disabled = n === 0; cbs.checked = n > 0 && !!chosen[sid];
          el.classList.toggle('is-off', n === 0);
          qs('[data-scount="' + sid + '"]').textContent = n || '–';
          qs('[data-why="' + sid + '"]').textContent = n ? '' : whyOff(sid, avail);
        });
      });
      qs('[data-subjcount="' + S.id + '"]').textContent = subjSel + ' of ' + subjTotal;
      var scb = qs('[data-subjcb="' + S.id + '"]');
      scb.disabled = subjUse === 0; scb.checked = subjUse > 0 && subjOn === subjUse; scb.indeterminate = subjOn > 0 && subjOn < subjUse;
    });

    // summary
    var trial = SEL.build(BANK, selCfg());
    var pool = avail.chosen;
    $('su-poolN').textContent = pool;
    $('su-poolLbl').textContent = pool === 1 ? 'question matches' : 'questions match';
    var hist = avail.hist, hmax = Math.max.apply(null, hist.slice(1).concat([1]));
    $('su-hist').innerHTML = [1, 2, 3, 4, 5].map(function (d) { return '<i style="height:' + Math.max(3, Math.round(hist[d] / hmax * 54)) + 'px" title="Difficulty ' + d + ': ' + hist[d] + '"></i>'; }).join('');
    $('su-histLbl').textContent = pool ? 'By difficulty, easiest to hardest (' + hist.slice(1).join(' · ') + ')' : '';

    var msgs = [];
    if (!trial.ok) {
      trial.errors.forEach(function (m) { msgs.push({ c: 'err', t: m }); });
      var offers = [10, 5].filter(function (n) { return n < cfg.length && pool >= n; });
      if (pool && offers.length) msgs.push({ c: 'warn', t: 'You can still play a shorter game with this selection.', btn: offers.map(function (n) { return { t: 'Switch to ' + n + ' questions', len: n }; }) });
      else if (pool) msgs.push({ c: 'warn', t: 'Tick more topics to reach ' + cfg.length + ' questions.' });
    } else {
      var sp = trial.stats.subjects, names = { B: 'Biology', C: 'Chemistry', P: 'Physics' };
      var parts = Object.keys(sp).sort().map(function (k) { return names[k] + ' ' + sp[k]; });
      msgs.push({ c: 'ok', t: 'Ready: ' + cfg.length + ' questions' + (parts.length > 1 ? ' (' + parts.join(' · ') + ')' : ' of ' + names[Object.keys(sp)[0]]) + ', rising in difficulty.' });
      trial.warnings.forEach(function (m) { msgs.push({ c: 'warn', t: m }); });
    }
    var ul = $('su-msgs'); ul.innerHTML = '';
    msgs.forEach(function (m) {
      var li = document.createElement('li'); li.className = m.c; li.textContent = m.t;
      (m.btn || []).forEach(function (b) {
        var bt = document.createElement('button'); bt.type = 'button'; bt.textContent = b.t; bt.setAttribute('data-len', b.len); li.appendChild(document.createElement('br')); li.appendChild(bt);
      });
      ul.appendChild(li);
    });
    $('su-start').disabled = !trial.ok;
    saveCfg();
  }

  function bindSetup() {
    $('setup-form').addEventListener('change', function (e) {
      var t = e.target;
      if (t.name === 'board' || t.name === 'course' || t.name === 'tier' || t.name === 'difficulty') { cfg[t.name] = t.value; }
      else if (t.name === 'length') { cfg.length = +t.value; }
      else if (t.hasAttribute('data-unit')) {
        var uid = t.getAttribute('data-unit'), av = SEL.availability(BANK, selCfg());
        Object.keys(TAX.subs).filter(function (k) { return TAX.subs[k].unit === uid && av.bySub[k]; }).forEach(function (s) { setSub(s, t.checked); });
      } else if (t.hasAttribute('data-subjcb')) {
        var sid = t.getAttribute('data-subjcb'), av2 = SEL.availability(BANK, selCfg());
        Object.keys(TAX.subs).filter(function (k) { return TAX.subs[k].unit.charAt(0) === sid && av2.bySub[k]; }).forEach(function (s) { setSub(s, t.checked); });
      } else if (t.hasAttribute('data-subcb')) { setSub(t.getAttribute('data-subcb'), t.checked); }
      else if (t.id === 'su-sound') cfg.sound = t.checked;
      else if (t.id === 'su-auto') cfg.auto = t.checked;
      else return;
      updateSetup();
    });
    $('setup-form').addEventListener('click', function (e) {
      var b = e.target.closest('button'); if (!b) return;
      if (b.hasAttribute('data-exp')) {
        var uid = b.getAttribute('data-exp'), open = b.getAttribute('aria-expanded') !== 'true';
        b.setAttribute('aria-expanded', open); $('subs-' + uid).hidden = !open; expanded[uid] = open;
      } else if (b.classList.contains('su-subjbtn')) {
        var pid = b.getAttribute('aria-controls'), op = b.getAttribute('aria-expanded') !== 'true';
        b.setAttribute('aria-expanded', op); $(pid).hidden = !op;
      } else if (b.getAttribute('data-act')) {
        var S = b.getAttribute('data-s'), on = b.getAttribute('data-act') === 'all';
        Object.keys(TAX.subs).filter(function (k) { return TAX.subs[k].unit.charAt(0) === S; }).forEach(function (s) { setSub(s, on); });
        updateSetup();
      } else if (b.hasAttribute('data-len')) { cfg.length = +b.getAttribute('data-len'); setRadio('length', cfg.length); updateSetup(); }
    });
    $('su-all').addEventListener('click', function () { cfg.subs = allSubs.slice(); updateSetup(); });
    $('su-none').addEventListener('click', function () { cfg.subs = []; updateSetup(); });
    $('su-start').addEventListener('click', function () { startGame(); });
    $('setup-form').addEventListener('submit', function (e) { e.preventDefault(); });
  }
  function setSub(sid, on) {
    var i = cfg.subs.indexOf(sid);
    if (on && i === -1) cfg.subs.push(sid);
    if (!on && i !== -1) cfg.subs.splice(i, 1);
  }

  /* ============================================================
     THE GAME
     ============================================================ */
  var audio = SSM.audio.create();
  var G = null;               // current run: { game, built, seed, cfg, timers, ... }
  var usedKeyboard = false;

  function level(i) { var n = G.game.ladder.n; return n > 1 ? i / (n - 1) : 0; }

  function startGame() {
    var seedTxt = ($('su-seed').value || '').replace(/\D/g, '');
    var seed = seedTxt ? +seedTxt : Math.floor(Math.random() * 900000) + 100000;
    launch(seed, true);
  }

  /* seed: game code. fresh: first launch from setup (plays the intro). */
  function launch(seed, fresh) {
    var c = selCfg({ seed: seed });
    var built = SEL.build(BANK, c);
    if (!built.ok) { updateSetup(); return; }
    teardown();
    var game = E.createGame({ ladder: c.length, questions: built.questions, seed: seed });
    G = { game: game, built: built, seed: seed, cfg: c, timers: [], introDone: false, nextReady: false, calm: false, auto: cfg.auto };
    game.on(onGame);
    // audio is created here, from the Start click (a user gesture), never before
    audio.setMuted(!cfg.sound);
    if (cfg.sound) audio.init();
    $('btn-sound').setAttribute('aria-pressed', String(cfg.sound));
    paintSoundBtn();
    buildLadder();
    $('setup').hidden = true; $('stage').hidden = false;
    $('stage').setAttribute('data-state', 'ready');
    $('stage').removeAttribute('data-ladder');
    window.scrollTo(0, 0);
    clearQuestion();
    updateLadder(); updateLifelines();
    runIntro();
  }

  function teardown() {
    if (G) { G.timers.forEach(clearTimeout); G.timers = []; (G.phoneTimers || []).forEach(clearTimeout); G.phoneTimers = []; G.dead = true; }
    audio.stopAll(0.12);
    hideOverlay();
    $('confetti').innerHTML = '';
  }

  function later(ms, fn) {
    var id = setTimeout(function () { if (G && !G.dead) fn(); }, ms);
    G.timers.push(id); return id;
  }
  /* A timed engine event: carries the epoch it was scheduled in, so a stale one is rejected by the engine. */
  function laterEvent(ms, type) {
    var g = G.game, ep = g.epoch;
    return later(ms, function () { g.dispatch(type, null, ep); });
  }

  /* ---------- intro ---------- */
  function runIntro() {
    var g = G.game;
    $('intro-sub').textContent = g.ladder.n + ' questions · ' + gbp(g.ladder.prizes[g.ladder.n - 1]) + ' to play for · ' + (cfg.board === 'AQA' ? 'AQA' : 'Pearson Edexcel') + ' ' + TAX.courses[cfg.course].name + ' · ' + (cfg.tier === 'F' ? 'Foundation' : 'Higher');
    showPanel('pnl-intro');
    audio.play('intro');
    later(audio.ready && !audio.muted ? 6900 : 3400, finishIntro);
    $('btn-skip').focus();
  }
  function finishIntro() {
    if (!G || G.introDone) return;
    G.introDone = true;
    hideOverlay();
    G.game.dispatch('START');
  }

  /* ---------- rendering ---------- */
  function buildLadder() {
    var g = G.game, html = '';
    for (var i = g.ladder.n - 1; i >= 0; i--) {
      html += '<li class="mx-rung" data-r="' + i + '"><span class="n">' + (i + 1) + '</span><span class="p">' + gbp(g.ladder.prizes[i]) + '</span><span class="m" aria-hidden="true"></span></li>';
    }
    $('ladder').innerHTML = html;
    qsa('.mx-rung').forEach(function (el) { var i = +el.getAttribute('data-r'); if (g.isSafeRung(i)) { el.classList.add('safe'); el.title = 'Safety net'; } });
  }

  function updateLadder() {
    var g = G.game, st = g.state;
    qsa('.mx-rung').forEach(function (el) {
      var i = +el.getAttribute('data-r');
      el.classList.remove('done', 'now', 'won', 'lost', 'floor', 'pulse');
      el.removeAttribute('aria-current');
      if (st === 'ready') return;
      if (i < g.correctCount) el.classList.add('done');
      if (st === 'won') { if (i === g.ladder.n - 1) el.classList.add('won'); return; }
      if (st === 'walkedAway') { if (i === g.correctCount - 1) el.classList.add('won'); return; }
      if (st === 'gameOver' || st === 'wrong') {
        if (i === g.index) el.classList.add('lost');
        var floorIdx = g.result && g.result.guaranteed ? g.ladder.prizes.indexOf(g.result.guaranteed) : -1;
        if (i === floorIdx) el.classList.add('floor');
        return;
      }
      if (i === g.index) { if (st === 'correct') { el.classList.remove('done'); el.classList.add('won'); } else { el.classList.add('now'); el.setAttribute('aria-current', 'step'); if (st === 'locked') el.classList.add('pulse'); } }
    });
    var rungEl = qs('.mx-rung.now') || qs('.mx-rung.won');
  }

  function clearQuestion() {
    $('qtext').textContent = ''; $('qdata').hidden = true; $('qdata').innerHTML = '';
    $('answers').innerHTML = ''; $('info').innerHTML = ''; $('actions').innerHTML = '';
    $('bq').textContent = ''; $('bp').textContent = ''; $('bt').textContent = '';
  }

  function showQuestion() {
    var g = G.game, q = g.question(), i = g.index, n = g.ladder.n;
    G.nextReady = false;
    $('bq').textContent = 'Question ' + (i + 1) + ' of ' + n;
    $('bp').textContent = gbp(g.currentPrize()) + (g.isSafeRung(i) ? ' · safety net' : '');
    var S = TAX.subjects.filter(function (s) { return s.id === q.unit.charAt(0); })[0];
    $('bt').textContent = S.name + ' · ' + TAX.units[q.unit].short;
    var panel = $('qpanel');
    panel.style.animation = 'none'; void panel.offsetWidth; panel.style.animation = '';
    $('qtext').innerHTML = fmt(q.text);
    var dataEl = $('qdata'), hasData = !!(q.tbl || q.fig);
    dataEl.hidden = !hasData; dataEl.innerHTML = '';
    if (q.tbl) dataEl.appendChild(tableEl(q.tbl));
    if (q.fig) dataEl.appendChild(figureEl(q.fig));
    panel.classList.toggle('has-data', hasData);
    var html = '';
    q.options.forEach(function (o, k) {
      html += '<button type="button" class="mx-a" data-i="' + k + '" style="--i:' + k + '" aria-label="' + LETTERS[k] + ': ' + esc(plain(o)) + '">' +
        '<span><b class="mx-al" aria-hidden="true">' + LETTERS[k] + ':</b><span class="mx-at">' + fmt(o) + '</span><i class="mx-ai" aria-hidden="true"></i></span></button>';
    });
    $('answers').innerHTML = html;
    $('answers').classList.toggle('is-long', q.options.some(function (o) { return plain(o).length > LONG_ANSWER; }));
    paintAnswers(); renderFoot();
    fitStage(true);
    announce('Question ' + (i + 1) + ' for ' + gbp(g.currentPrize()) + '. ' + plain(q.text) + ' ' + q.options.map(function (o, k) { return LETTERS[k] + ', ' + plain(o) + '.'; }).join(' '));
    if (usedKeyboard) { var first = qs('.mx-a'); if (first) first.focus({ preventScroll: true }); }
  }

  /* Fit to the screen. On a board-sized layout the stage must not scroll, so step the text scale (--ts) down
     until it fits the window. reset (a new question, a resize) starts again from full size; a footer change only
     ever shrinks, so the question does not jump about while it is being played. Phones scroll instead. */
  var LONG_ANSWER = 70;
  function fitStage(reset) {
    var st = $('stage');
    if (st.hidden) return;
    var ts = reset ? 1 : (+st.style.getPropertyValue('--ts') || 1);
    st.style.setProperty('--ts', ts);
    if (window.innerWidth <= 620) return;
    var avail = Math.max(window.innerHeight - (st.getBoundingClientRect().top + window.scrollY), parseFloat(getComputedStyle(st).minHeight) || 0);
    while (st.offsetHeight > avail + 1 && ts > 0.62) { ts = Math.round((ts - 0.04) * 100) / 100; st.style.setProperty('--ts', ts); }
  }

  var ICON = {
    lock: '<svg viewBox="0 0 24 24"><rect x="5" y="11" width="14" height="9" rx="1.5" fill="currentColor" stroke="none"/><path d="M8 11V8a4 4 0 0 1 8 0v3"/></svg>',
    check: '<svg viewBox="0 0 24 24"><path d="m4 12.5 5 5L20 6.5"/></svg>',
    cross: '<svg viewBox="0 0 24 24"><path d="m6 6 12 12M18 6 6 18"/></svg>',
    dot: '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="6"/></svg>'
  };
  function setIcon(btn, kind) { qs('.mx-ai', btn).innerHTML = ICON[kind] || ''; }

  /* Answer button classes follow the engine state: sel (highlighted, changeable) → locked → correct / wrong. */
  function paintAnswers() {
    var g = G.game, st = g.state, q = g.question();
    qsa('.mx-a').forEach(function (b) {
      var i = +b.getAttribute('data-i');
      var gone = g.eliminated.indexOf(i) !== -1;
      b.classList.remove('sel', 'locked', 'correct', 'wrong', 'dim', 'flash');
      b.classList.toggle('gone', gone);
      b.setAttribute('aria-hidden', gone ? 'true' : 'false');
      b.tabIndex = gone ? -1 : 0;
      b.setAttribute('aria-pressed', 'false');
      b.disabled = !(st === 'question' || st === 'selected') || gone;
      setIcon(b, '');
      if (gone) return;
      if (st === 'selected' && g.selected === i) { b.classList.add('sel'); b.setAttribute('aria-pressed', 'true'); setIcon(b, 'dot'); }
      if (st === 'lifeline' || st === 'walkConfirm') { if (g.selected === i) { b.classList.add('sel'); setIcon(b, 'dot'); } }
      if (st === 'locked') { if (g.locked === i) { b.classList.add('locked'); setIcon(b, 'lock'); } else b.classList.add('dim'); }
      if (st === 'correct') { if (i === q.correct) { b.classList.add('correct'); setIcon(b, 'check'); } else b.classList.add('dim'); }
      if (st === 'wrong') {
        if (i === g.locked) { b.classList.add('wrong'); setIcon(b, 'cross'); }
        else if (i === q.correct && G.showCorrect) { b.classList.add('correct', 'flash'); setIcon(b, 'check'); }
        else b.classList.add('dim');
      }
    });
    if (st === 'correct') { var cb = qs('.mx-a.correct'); if (cb && !reduceMotion) cb.classList.add('flash'); }
  }

  function renderFoot() { fillFoot(); fitStage(false); }
  function fillFoot() {
    var g = G.game, st = g.state, q = g.question(), info = $('info'), act = $('actions');
    act.innerHTML = ''; info.innerHTML = '';
    function btn(txt, cls, fn, id) {
      var b = document.createElement('button'); b.type = 'button'; b.className = 'mx-btn ' + (cls || ''); b.textContent = txt; if (id) b.id = id;
      b.addEventListener('click', fn); act.appendChild(b); return b;
    }
    var inPlay = (st === 'question' || st === 'selected' || st === 'lifeline' || st === 'walkConfirm');
    if (st === 'ready') return;
    if (inPlay) {
      var active = (st === 'question' || st === 'selected');
      var walkTxt = 'Walk away with ' + gbp(g.walkValue());
      var wrongTxt = gbp(g.wrongValue());
      if (st === 'selected' || ((st === 'lifeline' || st === 'walkConfirm') && g.selected != null)) {
        info.innerHTML = '<b>' + LETTERS[g.selected] + ':</b> ' + fmt(q.options[g.selected]) + ' — is that your final answer?';
      } else {
        info.innerHTML = 'If you are wrong you leave with <b>' + wrongTxt + '</b>. Walking away takes <b>' + gbp(g.walkValue()) + '</b>.' + (g.index === 0 ? '<br><small>Keys: A–D choose · Enter final answer · 5 6 7 lifelines · W walk away</small>' : '');
      }
      var w = btn(walkTxt, 'mx-btn--ghost', function () { requestWalk(); }, 'btn-walk'); w.disabled = !active;
      if (st === 'selected' || g.selected != null) { var f = btn('Final answer', 'mx-btn--amber mx-btn--big', function () { lockIn(); }, 'btn-final'); f.disabled = st !== 'selected'; }
      return;
    }
    if (st === 'locked') { info.innerHTML = '<b>Final answer:</b> ' + LETTERS[g.locked] + ': ' + fmt(q.options[g.locked]); return; }
    if (st === 'correct') {
      var final = g.correctCount >= g.ladder.n;
      var banner = final ? '<b>Correct! ' + gbp(g.ladder.prizes[g.ladder.n - 1]) + '!</b>' : '<b>Correct!</b> You have ' + gbp(g.walkValue()) + (g.isSafeRung(g.index) ? ' — and it is safe.' : '.');
      info.innerHTML = '<div class="why">' + banner + (q.expl ? ' ' + fmt(q.expl) : '') + '<small>' + esc(q.ref) + (q.subLabel ? ' · ' + esc(q.subLabel) : '') + '</small></div>';
      if (G.nextReady && !final) btn('Next question', 'mx-btn--amber mx-btn--big pop', function () { next(); }, 'btn-next');
      return;
    }
    if (st === 'wrong') {
      if (G.showCorrect) {
        info.innerHTML = '<div class="why"><b>The correct answer was ' + LETTERS[q.correct] + ': ' + fmt(q.options[q.correct]) + '.</b> ' + (q.expl ? fmt(q.expl) : '') + '<small>' + esc(q.ref) + (q.subLabel ? ' · ' + esc(q.subLabel) : '') + '</small></div>';
      } else info.innerHTML = '<b>Not that one…</b>';
      if (G.nextReady) btn('See your result', 'mx-btn--amber mx-btn--big pop', function () { G.game.dispatch('FINISH', null, G.game.epoch); }, 'btn-next');
      return;
    }
  }

  function updateLifelines() {
    var g = G.game, active = (g.state === 'question' || g.state === 'selected');
    qsa('.mx-life').forEach(function (b) {
      var k = b.getAttribute('data-life'), used = g.lifelines[k] === 'used';
      b.setAttribute('data-used', String(used));
      b.disabled = used || !active;
      var base = { fifty: '50:50, removes two wrong answers', audience: 'Ask the Audience', friend: 'Phone a Friend' }[k];
      b.setAttribute('aria-label', base + (used ? ' (already used)' : ''));
    });
  }

  function announce(t) { var l = $('live'); l.textContent = ''; setTimeout(function () { l.textContent = t; }, 40); }

  /* ---------- data: tables and figures ---------- */
  function tableEl(t) {
    var el = document.createElement('table');
    var h = '<thead><tr>' + t.h.map(function (c) { return '<th scope="col">' + fmt(c) + '</th>'; }).join('') + '</tr></thead><tbody>';
    t.r.forEach(function (r) { h += '<tr>' + r.map(function (c, i) { return (i === 0 && t.rowHead ? '<th scope="row">' : '<td>') + fmt(String(c)) + (i === 0 && t.rowHead ? '</th>' : '</td>'); }).join('') + '</tr>'; });
    el.innerHTML = h + '</tbody>';
    if (t.cap) { var c = document.createElement('caption'); c.className = 'mx-sr'; c.textContent = t.cap; el.insertBefore(c, el.firstChild); }
    return el;
  }
  /* Axis on round numbers: a step that divides the range exactly into 4-8 parts (closest to 6 wins), otherwise
     the axis runs on to the next multiple of a 1-2-5 step. f.xstep / f.ystep override (e.g. a half-life axis in 6s). */
  function niceMax(v) { var e = Math.pow(10, Math.floor(Math.log10(v))), f = v / e; return (f <= 1 ? 1 : f <= 2 ? 2 : f <= 5 ? 5 : 10) * e; }
  function axis(lo, hi, step) {
    var span = hi - lo;
    if (!step) {
      var e = Math.pow(10, Math.floor(Math.log10(span)) - 1), score = 1e9;
      [1, 2, 2.5, 3, 4, 5, 6, 10, 20, 25, 30, 40, 50, 60].forEach(function (m) {
        var n = span / (m * e);
        if (Math.abs(n - Math.round(n)) < 1e-9 && n >= 4 && n <= 8 && Math.abs(n - 6) < score) { step = m * e; score = Math.abs(n - 6); }
      });
      if (!step) [1, 2, 5, 10, 20, 50].some(function (m) { step = m * e; return Math.ceil(span / step - 1e-9) <= 8; });
    }
    var n = Math.ceil(span / step - 1e-9);
    return { lo: lo, hi: lo + n * step, step: step, n: n };
  }
  /* the same markup as fmt(), as SVG text: superscripts and subscripts become shifted tspans */
  function svgFmt(s) {
    return esc(s)
      .replace(/\^\{([^}]*)\}/g, function (m, x) { return '<tspan baseline-shift="super" font-size="70%">' + x.replace(/-/g, '−') + '</tspan>'; })
      .replace(/_\{([^}]*)\}|_([0-9]+)/g, function (m, a, b) { return '<tspan baseline-shift="sub" font-size="70%">' + (a || b) + '</tspan>'; });
  }
  /* for the accessible name: Unicode superscript digits, so a screen reader says "cubic centimetres", not "caret" */
  function speakFmt(s) {
    var SUP = { '0': '⁰', '1': '¹', '2': '²', '3': '³', '4': '⁴', '5': '⁵', '6': '⁶', '7': '⁷', '8': '⁸', '9': '⁹', '+': '⁺', '-': '⁻' };
    return plain(String(s).replace(/\^\{([0-9+-]+)\}/g, function (m, x) { return x.split('').map(function (c) { return SUP[c]; }).join(''); }));
  }
  function figureEl(f) {
    // a y label longer than the axis breaks before its bracket onto a second line, with the plot moved right to make room
    var yl = f.y || '', cut = plain(yl).length > 26 ? yl.indexOf(' (') : -1;
    var yLines = cut > 0 ? [yl.slice(0, cut), yl.slice(cut + 1)] : [yl];
    var W = 400, H = 270, L = 62 + 17 * (yLines.length - 1), B = 52, T = 14, R = 16, pw = W - L - R, ph = H - T - B;
    var ys = f.t === 'bar' ? f.vals : f.pts.map(function (p) { return p[1]; });
    var xs = f.t === 'bar' ? null : f.pts.map(function (p) { return p[0]; });
    var ya = axis(f.ymin || 0, f.ymax || niceMax(Math.max.apply(null, ys)), f.ystep);
    var xa = axis(f.xmin || 0, f.xmax || (xs ? niceMax(Math.max.apply(null, xs)) : 1), f.xstep);
    var ymin = ya.lo, ymax = ya.hi, xmin = xa.lo, xmax = xa.hi;
    function X(v) { return L + (v - xmin) / (xmax - xmin) * pw; }
    function Y(v) { return T + ph - (v - ymin) / (ymax - ymin) * ph; }
    var s = '<svg viewBox="0 0 ' + W + ' ' + H + '" role="img" aria-label="' + esc(speakFmt(f.alt || 'Graph')) + '" font-family="inherit">';
    for (var i = 0; i <= ya.n; i++) {
      var yv = ymin + ya.step * i, yy = Y(yv);
      s += '<line x1="' + L + '" x2="' + (W - R) + '" y1="' + yy + '" y2="' + yy + '" stroke="#223a78" stroke-width="1"/><text x="' + (L - 8) + '" y="' + (yy + 5) + '" text-anchor="end" fill="#dbe6ff" font-size="15">' + +yv.toFixed(2) + '</text>';
    }
    if (f.t !== 'bar') {
      for (var j = 0; j <= xa.n; j++) {
        var xv = xmin + xa.step * j, xx = X(xv);
        s += '<line x1="' + xx + '" x2="' + xx + '" y1="' + T + '" y2="' + (T + ph) + '" stroke="#16295e" stroke-width="1"/><text x="' + xx + '" y="' + (T + ph + 20) + '" text-anchor="middle" fill="#dbe6ff" font-size="15">' + +xv.toFixed(2) + '</text>';
      }
    }
    s += '<path d="M' + L + ' ' + T + 'V' + (T + ph) + 'H' + (W - R) + '" fill="none" stroke="#9fb2dc" stroke-width="2"/>';
    if (f.t === 'bar') {
      var bw = pw / f.cats.length;
      f.cats.forEach(function (c, k) {
        var x0 = L + k * bw + bw * 0.2, h = (f.vals[k] - ymin) / (ymax - ymin) * ph;
        s += '<rect x="' + x0 + '" y="' + (T + ph - h) + '" width="' + (bw * 0.6) + '" height="' + h + '" fill="#f6b52e"/><text x="' + (L + k * bw + bw / 2) + '" y="' + (T + ph + 20) + '" text-anchor="middle" fill="#dbe6ff" font-size="14">' + svgFmt(c) + '</text>';
      });
    } else {
      if (f.line !== false) s += '<polyline fill="none" stroke="#f6b52e" stroke-width="3" stroke-linejoin="round" points="' + f.pts.map(function (p) { return X(p[0]) + ',' + Y(p[1]); }).join(' ') + '"/>';
      if (f.dots !== false) f.pts.forEach(function (p) { s += '<circle cx="' + X(p[0]) + '" cy="' + Y(p[1]) + '" r="4.5" fill="#f6b52e"/>'; });
    }
    s += '<text x="' + (L + pw / 2) + '" y="' + (H - 8) + '" text-anchor="middle" fill="#dbe6ff" font-size="15">' + svgFmt(f.x || '') + '</text>';
    yLines.forEach(function (ln, k) { s += '<text transform="translate(' + (16 + 17 * k) + ' ' + (T + ph / 2) + ') rotate(-90)" text-anchor="middle" fill="#dbe6ff" font-size="15">' + svgFmt(ln) + '</text>'; });
    s += '</svg>';
    var fig = document.createElement('figure'); fig.style.margin = '0'; fig.innerHTML = s;
    if (f.cap) { var c = document.createElement('figcaption'); c.textContent = f.cap; fig.appendChild(c); }
    return fig;
  }

  /* ---------- panels ---------- */
  var openPanel = null, panelReturn = null;
  function showPanel(id) {
    var ov = $('overlay');
    qsa('.mx-panel', ov).forEach(function (p) { p.hidden = p.id !== id; });
    ov.hidden = false; ov.classList.remove('clear');
    openPanel = id;
    panelReturn = document.activeElement;
  }
  function hideOverlay() {
    $('overlay').hidden = true; qsa('.mx-panel').forEach(function (p) { p.hidden = true; });
    openPanel = null;
  }
  function focusIn(id, sel) { var el = qs(sel || 'button', $(id)); if (el) el.focus({ preventScroll: true }); }

  /* ---------- player actions (all go through the engine) ---------- */
  function choose(i) { var g = G.game; if (g.state === 'question' || g.state === 'selected') { if (g.selected !== i) g.dispatch('SELECT', { index: i }); } }
  function lockIn() { var g = G.game; if (g.state === 'selected') g.dispatch('LOCK'); }
  function next() { var g = G.game; if (g.state === 'correct' && G.nextReady) g.dispatch('ADVANCE', null, g.epoch); }
  function useLife(k) { var g = G.game; if (g.state === 'question' || g.state === 'selected') g.dispatch('USE_LIFELINE', { kind: k }); }
  function requestWalk() { var g = G.game; if (g.state === 'question' || g.state === 'selected') g.dispatch('WALK_REQUEST'); }

  /* ---------- the engine listener: every sound and every timed step starts here ---------- */
  function onGame(info) {
    var g = info.game, t = info.type, st = g.state, lv = level(g.index);
    $('stage').setAttribute('data-state', st);
    $('stage').setAttribute('data-tension', lv > 0.66 ? 'high' : 'low');
    switch (t) {
      case 'START':
        showQuestion();
        audio.play('questionIn', { level: lv });
        audio.startBed(lv);
        break;

      case 'SELECT':
        paintAnswers(); renderFoot();
        audio.play('select');
        announce(LETTERS[g.selected] + ' selected: ' + plain(g.question().options[g.selected]) + '. Press Enter for final answer, or choose a different answer.');
        break;

      case 'DESELECT':
        paintAnswers(); renderFoot(); audio.play('deselect'); break;

      case 'LOCK': {
        paintAnswers(); renderFoot();
        audio.play('lock', { level: lv });
        announce('Final answer locked: ' + LETTERS[g.locked] + '.');
        var S = SSM.audio.suspenseSecs(lv);
        audio.rushBed(0.65 + S);   // the bed speeds up and brightens all the way to the reveal
        later(650, function () { audio.play('suspense', { level: lv, secs: S, layer: true }); });
        laterEvent(650 + S * 1000, 'REVEAL');
        break;
      }

      case 'REVEAL': {
        var q = g.question();
        audio.stopBed(0.5);
        if (st === 'correct') {
          var final = g.correctCount >= g.ladder.n;
          audio.play(final ? 'million' : g.isSafeRung(g.index) ? 'safe' : 'correct', { level: lv });
          paintAnswers(); updateLadder(); updateLifelines(); renderFoot();
          announce('Correct! ' + (final ? 'You have won ' + gbp(g.ladder.prizes[g.ladder.n - 1]) + '.' : 'You have ' + gbp(g.walkValue()) + '.'));
          if (final) { laterEvent(2600, 'FINISH'); }
          else {
            later(900, function () { if (G.game.state === 'correct') { G.nextReady = true; renderFoot(); var nb = $('btn-next'); if (nb) nb.focus({ preventScroll: true }); } });
            if (G.auto) laterEvent(900 + 3600, 'ADVANCE');
          }
        } else {
          G.showCorrect = false;
          audio.play('wrong', { level: lv });
          paintAnswers(); updateLadder(); updateLifelines(); renderFoot();
          announce('Sorry, that is incorrect.');
          later(1000, function () { if (G.game.state === 'wrong') { G.showCorrect = true; paintAnswers(); renderFoot(); announce('The correct answer was ' + LETTERS[q.correct] + ': ' + plain(q.options[q.correct]) + '.'); } });
          later(1900, function () { if (G.game.state === 'wrong') { G.nextReady = true; renderFoot(); var nb = $('btn-next'); if (nb) nb.focus({ preventScroll: true }); } });
        }
        break;
      }

      case 'ADVANCE':
        G.showCorrect = false;
        showQuestion(); updateLadder(); updateLifelines();
        audio.play('questionIn', { level: lv });
        audio.startBed(lv);
        break;

      case 'FINISH':
        if (st === 'won') { showResult(); confetti(); }
        else { audio.play('gameover'); updateLadder(); later(1400, showResult); }
        break;

      case 'USE_LIFELINE': {
        updateLifelines();
        var k = info.payload.kind;
        if (k === 'fifty') {
          audio.play('fifty'); paintAnswers(); renderFoot();
          announce('50:50. Two wrong answers have been removed.');
        } else if (k === 'audience') {
          audio.play('audience'); openAudience(g.lifelineResult.result);
        } else {
          openPhone(g.lifelineResult.result);
        }
        break;
      }
      case 'CLOSE_LIFELINE':
        hideOverlay(); updateLifelines(); paintAnswers(); renderFoot();
        if (G.phoneTimers) { G.phoneTimers.forEach(clearTimeout); G.phoneTimers = []; }
        audio.play('phoneEnd');
        focusAfterPanel();
        break;

      case 'WALK_REQUEST':
        audio.play('warn');
        $('walk-amt').textContent = gbp(g.walkValue());
        $('walk-desc').textContent = g.walkValue() > 0 ? 'Walk away now and you take ' + gbp(g.walkValue()) + ' home. Answer and be wrong, and you take home ' + gbp(g.wrongValue()) + '.' : 'You have not won anything yet, so you would leave with nothing.';
        showPanel('pnl-walk'); focusIn('pnl-walk', '#walk-no');
        updateLifelines(); paintAnswers(); renderFoot();
        break;
      case 'WALK_CANCEL':
        hideOverlay(); updateLifelines(); paintAnswers(); renderFoot(); focusAfterPanel(); break;
      case 'WALK_CONFIRM':
        hideOverlay(); audio.stopBed(0.4); audio.play('walk'); updateLadder(); updateLifelines(); paintAnswers();
        later(1200, showResult);
        break;

      case 'RESTART':
        break;
    }
    if (t !== 'REVEAL' && t !== 'FINISH') { updateLadder(); }
    updateLifelines();
  }

  function focusAfterPanel() {
    var g = G.game;
    var target = qs('.mx-a.sel') || qs('.mx-a:not(.gone):not(:disabled)');
    if (usedKeyboard && target) target.focus({ preventScroll: true });
  }

  /* ---------- lifeline panels ---------- */
  function openAudience(res) {
    var g = G.game;
    var html = '', lbls = '';
    res.shares.forEach(function (pct, i) {
      var out = g.eliminated.indexOf(i) !== -1;
      html += '<div class="mx-bar' + (out ? ' out' : '') + '"><span class="v" data-v="' + pct + '">&nbsp;</span><div class="col" data-h="' + pct + '"></div></div>';
      lbls += '<div class="mx-bar-l">' + LETTERS[i] + '</div>';
    });
    $('aud-bars').innerHTML = html + '</div>';
    var l = document.createElement('div'); l.className = 'mx-barlbls'; l.innerHTML = lbls;
    $('aud-bars').parentNode.insertBefore(l, $('aud-bars').nextSibling);
    var old = qsa('.mx-barlbls', $('pnl-audience')); if (old.length > 1) old[0].remove();
    showPanel('pnl-audience'); focusIn('pnl-audience', '#aud-close');
    var maxPct = Math.max.apply(null, res.shares);
    later(250, function () {
      qsa('#aud-bars .col').forEach(function (c) { c.style.height = (+c.getAttribute('data-h') / Math.max(maxPct, 40) * 100 * 0.82) + '%'; });
      qsa('#aud-bars .v').forEach(function (v) { v.textContent = v.getAttribute('data-v') + '%'; });
    });
    announce('The audience says: ' + res.shares.map(function (p, i) { return LETTERS[i] + ' ' + p + ' percent'; }).join(', ') + '.');
  }

  function openPhone(res) {
    var p = res.persona;
    $('ph-avatar').textContent = p.name.replace(/^(Dr|Ms|Mr) /, '').charAt(0);
    $('ph-avatar').classList.add('ring');
    $('ph-status').textContent = 'Calling ' + p.name + ', ' + p.role + '…';
    $('ph-lines').innerHTML = '';
    $('ph-close').textContent = 'Hang up';
    showPanel('pnl-phone'); focusIn('pnl-phone', '#ph-close');
    audio.play('phoneRing');
    G.phoneTimers = [];
    function t(ms, fn) { var id = setTimeout(function () { if (G && !G.dead && G.game.state === 'lifeline') fn(); }, ms); G.phoneTimers.push(id); }
    var start = reduceMotion ? 300 : 1500;
    t(start, function () { audio.play('phonePick'); $('ph-avatar').classList.remove('ring'); $('ph-status').textContent = 'Connected: ' + p.name; });
    res.lines.forEach(function (line, i) {
      t(start + 600 + i * (reduceMotion ? 200 : 1500), function () {
        var el = document.createElement('p'); el.textContent = line; $('ph-lines').appendChild(el);
        if (i === res.lines.length - 1) $('ph-close').textContent = 'Thanks, hang up';
      });
    });
    announce('Phoning ' + p.name + '.');
  }

  /* ---------- results ---------- */
  function showResult() {
    if (!G) return;
    var g = G.game, r = g.result; if (!r) return;
    var top = g.ladder.prizes[g.ladder.n - 1];
    var kicker, title, sub;
    if (r.reason === 'won') { kicker = 'Congratulations'; title = 'You are a Science Millionaire!'; sub = 'Every question answered correctly.'; }
    else if (r.reason === 'walked') { kicker = 'You walked away'; title = 'You take home'; sub = r.prize ? 'A sensible decision, with ' + gbp(r.prize) + ' banked.' : 'You left before winning anything.'; }
    else { kicker = 'Game over'; title = r.prize ? 'You leave with' : 'You leave with nothing'; sub = r.prize ? 'Your safety net at ' + gbp(r.guaranteed) + ' kept your winnings safe.' : 'No safety net had been reached.'; }
    $('res-kicker').textContent = kicker; $('res-title').textContent = title;
    $('res-prize').textContent = (r.reason === 'gameOver' && !r.prize) ? gbp(0) : gbp(r.prize);
    $('res-sub').textContent = sub;
    var used = g.lifelineLog.length;
    $('res-stats').innerHTML = '<div><dt>Correct</dt><dd>' + r.answered + ' of ' + g.ladder.n + '</dd></div><div><dt>Lifelines used</dt><dd>' + used + ' of 3</dd></div><div><dt>Game code</dt><dd>' + G.seed + '</dd></div>';
    var rows = '';
    for (var i = 0; i <= g.index; i++) {        // every question reached, including the one on screen when the game ended
      var q = g.questions[i];
      var answeredRight = i < g.correctCount;
      var status = answeredRight ? '<span class="ok">Correct</span>' : (r.reason === 'walked' && i === g.index ? '<span class="no">Not answered</span>' : '<span class="no">Incorrect</span>');
      rows += '<li><b>' + fmt(q.text) + '</b> ' + status + '<small>Answer: ' + fmt(q.options[q.correct]) + '</small><small>' + fmt(q.expl) + '</small><small>' + esc(q.ref) + ' · ' + esc(q.subLabel) + '</small></li>';
    }
    $('res-review').innerHTML = rows;
    showPanel('pnl-result'); focusIn('pnl-result', '#res-again');
    announce(kicker + '. ' + title + ' ' + gbp(r.prize) + '.');
  }

  function confetti() {
    if (reduceMotion) return;
    var host = $('confetti'), cols = ['#f6b52e', '#ffd470', '#6ff0a8', '#3a6bdc', '#ffffff'], h = '';
    for (var i = 0; i < 90; i++) {
      h += '<i style="left:' + (Math.random() * 100) + '%;background:' + cols[i % cols.length] + ';--dx:' + (Math.random() * 160 - 80) + 'px;--rot:' + (Math.random() * 900 - 450) + 'deg;animation-duration:' + (3 + Math.random() * 3.5) + 's;animation-delay:' + (Math.random() * 1.8) + 's"></i>';
    }
    host.innerHTML = h;
    setTimeout(function () { host.innerHTML = ''; }, 9000);
  }

  /* ---------- wiring ---------- */
  function paintSoundBtn() {
    var on = !audio.muted && cfg.sound;
    $('btn-sound').setAttribute('aria-pressed', String(on));
    $('btn-sound').setAttribute('aria-label', on ? 'Sound on (M)' : 'Sound off (M)');
    $('btn-sound').innerHTML = on
      ? '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 9.5v5h3.5L12 18.5v-13L7.5 9.5z"/><path d="M15.5 9a4 4 0 0 1 0 6M18 6.5a8 8 0 0 1 0 11"/></svg>'
      : '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 9.5v5h3.5L12 18.5v-13L7.5 9.5z"/><path d="m16 9.5 5 5m0-5-5 5"/></svg>';
  }
  function toggleSound() {
    cfg.sound = audio.muted;           // currently muted → turn on
    if (cfg.sound && !audio.ready) audio.init();
    audio.setMuted(!cfg.sound);
    if (cfg.sound && G && G.game && (G.game.state === 'question' || G.game.state === 'selected')) audio.startBed(level(G.game.index));
    paintSoundBtn(); $('su-sound').checked = cfg.sound; saveCfg();
  }
  function toggleFull() {
    var d = document;
    if (d.fullscreenElement) d.exitFullscreen && d.exitFullscreen();
    else if (d.documentElement.requestFullscreen) d.documentElement.requestFullscreen().catch(function () {});
  }
  function toSetup() {
    if (G && G.game && !G.game.isTerminal() && G.game.state !== 'ready' && !window.confirm('Leave this game and go back to setup? Your progress will be lost.')) return;
    if (G && G.game) G.game.dispatch('RESTART');
    teardown(); G = null;
    $('stage').hidden = true; $('setup').hidden = false;
    updateSetup();
    if (document.fullscreenElement) document.exitFullscreen();
  }

  function bindStage() {
    $('answers').addEventListener('click', function (e) {
      var b = e.target.closest('.mx-a'); if (!b || b.disabled) return;
      choose(+b.getAttribute('data-i'));
    });
    qsa('.mx-life').forEach(function (b) { b.addEventListener('click', function () { useLife(b.getAttribute('data-life')); }); });
    $('btn-exit').addEventListener('click', toSetup);
    $('btn-sound').addEventListener('click', toggleSound);
    $('btn-full').addEventListener('click', toggleFull);
    $('btn-ladder').addEventListener('click', function () { var s = $('stage'); if (s.getAttribute('data-ladder') === 'open') s.removeAttribute('data-ladder'); else s.setAttribute('data-ladder', 'open'); });
    $('btn-skip').addEventListener('click', finishIntro);
    $('aud-close').addEventListener('click', function () { G.game.dispatch('CLOSE_LIFELINE'); });
    $('ph-close').addEventListener('click', function () { G.game.dispatch('CLOSE_LIFELINE'); });
    $('walk-no').addEventListener('click', function () { G.game.dispatch('WALK_CANCEL'); });
    $('walk-yes').addEventListener('click', function () { G.game.dispatch('WALK_CONFIRM'); });
    $('res-again').addEventListener('click', function () { launch(Math.floor(Math.random() * 900000) + 100000, false); });
    $('res-same').addEventListener('click', function () { launch(G.seed, false); });
    $('res-setup').addEventListener('click', toSetup);
    document.addEventListener('fullscreenchange', function () {
      $('btn-full').setAttribute('aria-label', document.fullscreenElement ? 'Exit full screen (F)' : 'Full screen (F)');
      if (G) fitStage(true);
    });
    var fitT = 0;
    window.addEventListener('resize', function () { clearTimeout(fitT); fitT = setTimeout(function () { if (G) fitStage(true); }, 120); });
    window.addEventListener('pagehide', function () { audio.stopAll(0.03); });
    document.addEventListener('visibilitychange', function () {
      if (!audio.ctx) return;
      if (document.hidden) { audio.ctx.suspend && audio.ctx.suspend(); } else if (!audio.muted) { audio.ctx.resume && audio.ctx.resume(); }
    });
    document.addEventListener('pointerdown', function () { usedKeyboard = false; }, true);
    document.addEventListener('keydown', onKey, true);
    $('btn-full').innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5"/></svg>';
    $('btn-ladder').innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 6h14M5 12h14M5 18h14"/></svg>';
  }

  function onKey(e) {
    if (e.ctrlKey || e.metaKey || e.altKey) return;
    var tag = (e.target && e.target.tagName) || '';
    if (!G || $('stage').hidden) return;
    if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;
    usedKeyboard = true;
    var g = G.game, k = e.key, K = k.length === 1 ? k.toUpperCase() : k;

    // Tab trap inside an open panel
    if (k === 'Tab' && openPanel) {
      var f = qsa('button:not([disabled]), summary, input', $(openPanel)).filter(function (x) { return x.offsetParent !== null; });
      if (f.length) {
        var i = f.indexOf(document.activeElement);
        if (e.shiftKey && i <= 0) { f[f.length - 1].focus(); e.preventDefault(); }
        else if (!e.shiftKey && (i === f.length - 1 || i === -1)) { f[0].focus(); e.preventDefault(); }
      }
      return;
    }
    if (K === 'M') { toggleSound(); e.preventDefault(); return; }
    if (K === 'F') { toggleFull(); e.preventDefault(); return; }

    switch (openPanel) {
      case 'pnl-intro':
        if (k === 'Enter' || k === ' ' || k === 'Escape') { finishIntro(); e.preventDefault(); }
        return;
      case 'pnl-audience': case 'pnl-phone':
        if (k === 'Escape' || (k === 'Enter' && document.activeElement && document.activeElement.tagName !== 'BUTTON')) { g.dispatch('CLOSE_LIFELINE'); e.preventDefault(); }
        return;
      case 'pnl-walk':
        if (k === 'Escape') { g.dispatch('WALK_CANCEL'); e.preventDefault(); }
        return;
      case 'pnl-result':
        return;
    }

    var st = g.state;
    if (st === 'question' || st === 'selected') {
      var idx = 'ABCD'.indexOf(K);
      if (idx === -1 && /^[1-4]$/.test(k)) idx = +k - 1;
      if (idx !== -1) { choose(idx); e.preventDefault(); return; }
      if (k === 'Enter') {
        if (document.activeElement && document.activeElement.tagName === 'BUTTON' && document.activeElement.id !== 'btn-final' && !document.activeElement.classList.contains('mx-a')) return;
        if (st === 'selected') { lockIn(); e.preventDefault(); }
        return;
      }
      if (k === 'Escape' && st === 'selected') { g.dispatch('DESELECT'); e.preventDefault(); return; }
      if (k === '5') { useLife('fifty'); e.preventDefault(); return; }
      if (k === '6') { useLife('audience'); e.preventDefault(); return; }
      if (k === '7') { useLife('friend'); e.preventDefault(); return; }
      if (K === 'W') { requestWalk(); e.preventDefault(); return; }
    }
    if (st === 'correct' && (k === 'Enter' || k === ' ') && G.nextReady) { if (!document.activeElement || document.activeElement.id !== 'btn-next') { next(); e.preventDefault(); } return; }
    if (st === 'wrong' && (k === 'Enter' || k === ' ') && G.nextReady) { if (!document.activeElement || document.activeElement.id !== 'btn-next') { g.dispatch('FINISH', null, g.epoch); e.preventDefault(); } return; }
  }

  /* ---------- boot ---------- */
  function boot() {
    loadCfg();
    buildTopics();
    setRadio('board', cfg.board); setRadio('course', cfg.course); setRadio('tier', cfg.tier); setRadio('difficulty', cfg.difficulty); setRadio('length', cfg.length);
    $('su-sound').checked = cfg.sound; $('su-auto').checked = cfg.auto;
    bindSetup(); bindStage(); updateSetup();
    if (!BANK.length) { var li = document.createElement('li'); li.className = 'err'; li.textContent = 'The question bank did not load. Check that the bank files are present.'; $('su-msgs').appendChild(li); $('su-start').disabled = true; }
    // test hook: lets the test page drive the same code the pupils use
    window.SSM_UI = { get G() { return G; }, audio: audio, launch: launch, cfg: cfg, finishIntro: finishIntro, choose: choose, lockIn: lockIn, next: next, useLife: useLife, requestWalk: requestWalk, toSetup: toSetup, showResult: showResult, updateSetup: updateSetup, setCfg: function (o) { Object.assign(cfg, o); setRadio('board', cfg.board); setRadio('course', cfg.course); setRadio('tier', cfg.tier); setRadio('difficulty', cfg.difficulty); setRadio('length', cfg.length); updateSetup(); } };
  }
  boot();
})();
