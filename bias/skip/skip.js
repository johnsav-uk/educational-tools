/* Over to You, Skip!: the daily puzzle's briefing and verdict, and the puzzles screen.
   bias/index.html loads this on demand (with skip-core.js and skip-sim.js) and calls
   SkipPage.open(). Puzzles come from the catalogue: puzzles/index.json lists every released
   puzzle (one a day, numbered by date, out at 06:00 London) and puzzles/NNNN.json holds each.
   Today's puzzle counts for the streak; an archive puzzle keeps its own best and never touches
   it. The shot itself is always played in the game: this card sets the head
   out on the green (host.setUp), steps aside while the player bowls with the game's own
   controls (host.play), and comes back when the game reports that everything has stopped
   (SkipPage.done). The head is then scored with the game's Rules.score and AI.value, the
   same measure the benchmark used, and the stars come from skip-core.js. */
(function () {
  'use strict';
  const C = window.SkipCore;
  const HERE = document.currentScript && document.currentScript.src ? new URL('.', document.currentScript.src).href : location.href;
  const SHARE_URL = n => 'https://www.johnsav.co.uk/bias/?skip=' + n;   // a share opens that puzzle, by number
  // The stats Worker (bias/stats-worker/). ?stats=<url> points at another one; ?stats=off sends nothing.
  const STATS_URL = (() => {
    const q = new URLSearchParams(location.search).get('stats');
    if (q) return q === 'off' ? '' : q.replace(/\/$/, '');
    if (location.protocol === 'file:') return '';
    if (/^(localhost|127\.0\.0\.1)$/.test(location.hostname)) return 'http://localhost:8788';
    return 'https://bias-stats.bias-relay.workers.dev';
  })();
  const LS = (() => { try { return window.localStorage; } catch (e) { return null; } })();
  const NOSTORE = { getItem() { return null; }, setItem() {} };
  const DEG = Math.PI / 180;
  // Fallback stars by outcome, only if a puzzle was published without its benchmark.
  const FALLBACK = { up: 0, same: 0.5, down: 1.5, level: 2.5, win1: 3, win2: 4, win3: 4.5, win4: 5 };

  // ---------- metrics: fire and forget; nothing waits for them ----------
  const Metrics = {
    send(name, props) {
      if (!STATS_URL) return;
      const v = C.validateEvent({ name, props }); if (!v.ok) return;
      try {
        const body = JSON.stringify(v.event), url = STATS_URL + '/e';
        const sent = navigator.sendBeacon && navigator.sendBeacon(url, new Blob([body], { type: 'text/plain' }));
        if (!sent) fetch(url, { method: 'POST', body, keepalive: true, mode: 'no-cors', headers: { 'content-type': 'text/plain' } }).catch(() => {});
      } catch (e) { /* dropped */ }
    },
    async today() {
      if (!STATS_URL) return null;
      try {
        const ctl = new AbortController(), t = setTimeout(() => ctl.abort(), 4000);
        const r = await fetch(STATS_URL + '/today', { signal: ctl.signal }); clearTimeout(t);
        return r.ok ? await r.json() : null;
      } catch (e) { return null; }
    }
  };

  let E, Sim, host, root, $, S = null, index = null, clockTimer = 0;
  const cache = new Map();
  const store = () => LS || NOSTORE;
  const el = html => { const t = document.createElement('template'); t.innerHTML = html.trim(); return t.content.firstChild; };
  const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
  const tokens = {};
  const tok = n => tokens[n] || (tokens[n] = getComputedStyle(root).getPropertyValue('--sk-' + n).trim());
  const reduced = () => E.reduced() || matchMedia('(prefers-reduced-motion: reduce)').matches;
  const cm = m => Math.round(m * 100) + ' cm';
  const other = team => team === 'red' ? 'yellow' : 'red';
  const teamOf = (b, pz) => b.kind === 'jack' ? 'jack' : b.owner === Sim.ME ? pz.you : other(pz.you);
  const cap = s => s.charAt(0).toUpperCase() + s.slice(1);

  // ---------- building the card ----------
  function build() {
    root = el(`
<div id="skip" role="dialog" aria-modal="true" aria-labelledby="skTitle" hidden>
  <div class="sk-top">
    <div class="sk-topleft">
      <button class="sk-chip" id="skMenu" aria-label="Main menu">‹ <span class="sk-long">Main </span>menu</button>
      <button class="sk-chip sk-allbtn" id="skAll" aria-label="All puzzles"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8 6h12M8 12h12M8 18h12"/><path d="M4 6h.01M4 12h.01M4 18h.01"/></svg><span class="sk-alltext"><span class="sk-long">All </span>puzzles</span></button>
      <button class="sk-chip" id="skToday" hidden>Today<span class="sk-long">'s puzzle</span></button>
    </div>
    <div class="sk-topright" id="skTopRight">
      <span class="sk-fresh" id="skFresh" hidden>A new puzzle is ready.<button class="sk-chip" id="skReload">Open it</button></span>
    </div>
  </div>
  <div class="sk-layout">
    <section class="sk-board" aria-label="Today's puzzle">
      <div class="sk-clip" aria-hidden="true"></div>
      <div class="sk-sheet">
        <header class="sk-head"><h1 id="skTitle">“Over to You, Skip!”</h1><p class="sk-meta" id="skMeta"></p></header>
        <div class="sk-plan"><canvas id="skPlan" role="img" aria-describedby="skHeadText"></canvas></div>
        <div class="sk-sr" id="skHeadText"></div>
        <p class="sk-advice" id="skAdvice"></p>
        <div class="sk-actions">
          <button class="sk-enamel" id="skGo">Play the shot</button>
          <button class="sk-brass" id="skShareBtn" hidden><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 15V4M8 7.5 12 3.5l4 4"/><path d="M6 11v8.5h12V11"/></svg>Share<span class="sk-long"> your result</span></button>
          <button class="sk-paperbtn" id="skAlt">Main menu</button>
        </div>
        <p class="sk-toast" id="skToast" role="status" aria-live="polite"></p>
        <p class="sk-help" id="skHelp"></p>
      </div>
    </section>
    <aside class="sk-rail">
      <div class="sk-note" id="skNote" aria-live="polite"></div>
      <div class="sk-score" id="skScore" role="group" aria-label="Scoreboard"><dl id="skBoard"></dl></div>
      <div class="sk-share" id="skShare" hidden></div>
    </aside>
  </div>
  <div class="sk-listwrap" id="skList" hidden>
    <section class="sk-listsheet" aria-labelledby="skListTitle">
      <header class="sk-head"><h1 id="skListTitle" tabindex="-1">All puzzles</h1><p class="sk-meta">“Over to You, Skip!” · a new one every morning at 6</p></header>
      <p class="sk-toast" id="skListToast" role="status" aria-live="polite"></p>
      <div id="skListBody"></div>
    </section>
  </div>
</div>`);
    document.body.appendChild(root);
    $ = id => root.querySelector('#' + id);
    $('skMenu').onclick = close;
    $('skReload').onclick = () => run(start());
    $('skAll').onclick = () => run(openList());
    $('skToday').onclick = () => run(S && !S.archive && S.day === today() ? backToCard() : start());
    $('skGo').onclick = () => (S && S.phase === 'done' ? again() : play());
    $('skAlt').onclick = () => (S && S.phase === 'done' ? fullMatch() : close());
    window.addEventListener('keydown', onKey, true);
    for (const q of [PHONE, FLAT]) q.addEventListener('change', () => { place(); if (!root.hidden && S) { sizePlan(); draw(); } });
    place();
    new ResizeObserver(() => { if (!root.hidden && S) { sizePlan(); draw(); } }).observe($('skPlan').parentNode);
    const fit = new ResizeObserver(fitTop); for (const n of root.querySelectorAll('.sk-top, .sk-topleft, .sk-score, .sk-fresh')) fit.observe(n);
  }
  /* The top bar on a phone is one line: Menu and Puzzles on the left, the streak tiles on the right.
     When they do not fit (a narrow phone, or the third tile, Saved it, %), Puzzles goes down to its
     icon (sk-tight), and if that is still not enough the tiles take a line of their own (sk-stack). */
  function fitTop() {
    if (!root || root.hidden) return;
    const top = root.querySelector('.sk-top'), l = root.querySelector('.sk-topleft'), r = $('skTopRight');
    root.classList.remove('sk-tight', 'sk-stack');
    if (!root.classList.contains('sk-compact')) return;
    const cs = getComputedStyle(top), room = top.clientWidth - parseFloat(cs.paddingLeft) - parseFloat(cs.paddingRight);
    const over = () => l.scrollWidth + r.scrollWidth + parseFloat(cs.columnGap || 0) > room;
    if (over()) root.classList.add('sk-tight');
    if (over()) root.classList.add('sk-stack');
  }
  /* Phones get a compact card. Upright (sk-phone): one column, the note in the sheet under the
     plan. On its side (sk-flat): two columns. Either way (sk-compact) the streak tiles go in the
     top bar and the share line becomes a button in the row. The queries match skip.css. */
  const PHONE = matchMedia('(max-width: 700px) and (orientation: portrait), (max-width: 520px)');
  const FLAT = matchMedia('(max-height: 520px) and (orientation: landscape)');
  function place() {
    const note = $('skNote'), score = $('skScore'), share = $('skShare'), rail = root.querySelector('.sk-rail');
    const phone = PHONE.matches, flat = !phone && FLAT.matches;
    root.classList.toggle('sk-phone', phone); root.classList.toggle('sk-flat', flat); root.classList.toggle('sk-compact', phone || flat);
    if (phone) $('skAdvice').before(note); else rail.prepend(note);
    if (phone || flat) $('skTopRight').append(score);
    else rail.append(score, share);
  }
  function show(on) { root.hidden = !on; document.body.classList.toggle('skip-open', on); if (on) root.classList.toggle('sk-still', reduced()); }

  // ---------- opening, playing, closing ----------
  // opts.number: a puzzle by number (a share link, ?skip=12); otherwise today's.
  async function open(opts) {
    E = opts.engine; host = opts.host; Sim = window.SkipSim.create(E);
    if (!root) build();
    await loadIndex();
    const n = opts.number, e = n != null ? C.entryByNumber(index, n, today()) : null;
    await start(e);
    if (n != null && !e) toast(`No. ${n} is not out yet. Here is today's puzzle.`, true);
  }
  // ?skipdate=YYYY-MM-DD pretends it is another puzzle day, on a local server only (for checking puzzles)
  const FAKE = (() => { const f = /^(localhost|127\.0\.0\.1)$/.test(location.hostname) && new URLSearchParams(location.search).get('skipdate'); return f && C.isDate(f) ? f : null; })();
  const today = () => FAKE || C.puzzleDay(Date.now());

  // ---------- the catalogue ----------
  async function loadIndex(force) {
    if (index && !force) return index;
    const r = await fetch(HERE + 'puzzles/index.json', { cache: 'no-cache' });
    if (!r.ok) throw new Error('puzzles ' + r.status);
    index = (await r.json()).puzzles;
    return index;
  }
  function loadPuzzle(e) {
    if (!cache.has(e.n)) cache.set(e.n, fetch(HERE + 'puzzles/' + C.puzzleFile(e.n), { cache: 'no-cache' })
      .then(r => { if (!r.ok) throw new Error('puzzle ' + e.n + ': ' + r.status); return r.json(); })
      .catch(x => { cache.delete(e.n); throw x; }));
    return cache.get(e.n);
  }
  // Today's entry; a page left open overnight fetches the catalogue again for the new day's puzzle.
  async function todayEntry() {
    const day = today();
    let e = C.entryFor(index, day);
    if (!e || e.date !== day) { try { await loadIndex(true); e = C.entryFor(index, day); } catch (x) { /* keep the last one */ } }
    return e;
  }
  /* This device's results by number. Today's puzzle is kept there too (so it still shows once it is
     in the archive); a best from before the archive existed is copied in the first time. */
  function loadArchive(stats) {
    let a = C.loadArchive(store());
    const t = stats.today, e = t && index && index.find(x => x.id === t.puzzleId && x.date <= t.date);
    if (e && !a[String(e.n)]) { a = Object.assign({}, a, { [e.n]: { stars: t.stars, tries: t.tries } }); C.saveArchive(store(), a); }
    return a;
  }
  // A step that may fetch: a failure is a message on the card, never a stuck screen.
  function run(p) { Promise.resolve(p).catch(() => toast('That puzzle could not load. Check your connection and try again.')); }

  // A puzzle on the green, the briefing in front of it: today's (entry null), or one from the archive.
  async function start(entry) {
    const tday = await todayEntry(), e = entry || tday;
    if (!e) throw new Error('no puzzle released yet');
    const pz = await loadPuzzle(e), day = today(), archive = !!tday ? e.n !== tday.n : true;
    if (!pz.bench || pz.bench.head !== C.headHash(pz)) console.warn(`Over to You, Skip!: No. ${e.n} ("${pz.id}") has changed since it was benchmarked. Run node skip/tools/benchmark.cjs.`);
    let stats = C.loadStats(store());
    const arch = loadArchive(stats);
    if (!archive) {
      const dslBefore = C.daysSinceLastPlay(stats, day), returning = !!stats.lastPlayed && stats.lastPlayed !== day;
      const v = C.recordView(stats, day);
      if (v.first) { stats = v.stats; C.saveStats(store(), stats); Metrics.send('puzzle_viewed', { puzzleId: pz.id, returning, daysSinceLastPlay: dslBefore }); }
    }
    const arm = E.Settings.arm === 'L' ? 'L' : 'R';
    host.setUp(pz);
    S = { pz, entry: e, archive, day, date: e.date, issue: e.n, arm, stats, arch, phase: 'brief', result: null,
      savedPct: S && !archive && !S.archive && S.day === day ? S.savedPct : null, best: S && S.issue === e.n && S.pz.id === pz.id && S.day === day ? S.best : null,
      before: Sim.scoreOf(host.world()), advicePath: advicePath(pz, arm) };
    show(true); showList(false); $('skFresh').hidden = true;
    sizePlan(); paint(); draw();
    if (document.fonts) document.fonts.load('32px "Reenie Beanie"').then(() => document.fonts.load('italic 15px Newsreader')).then(draw, draw);
    clearInterval(clockTimer); clockTimer = setInterval(tickClock, 15000);
    const t = bestOf();
    toast(t ? `Your best ${archive ? 'at No. ' + e.n : 'today'}: ${C.starWords(t.stars)}, ${C.goesText(t.tries)}. Have another go to beat it.` : '', true);
    $('skGo').focus({ preventScroll: true }); root.scrollTop = 0;
    if (!archive) Metrics.today().then(t => { if (S && !S.archive && t && t.day === S.day && t.savedPct != null) { S.savedPct = t.savedPct; paintBoard(); } });
  }
  // The best go that counts for this card: today's (the streak's day) or this archive puzzle's.
  function bestOf() {
    if (!S) return null;
    if (S.archive) return S.arch[String(S.issue)] || null;
    const t = S.stats.today;
    return t && t.date === S.day && t.puzzleId === S.pz.id ? t : null;
  }
  function backToCard() { showList(false); sizePlan(); paint(); draw(); $('skGo').focus({ preventScroll: true }); }
  // Out to the mat: the game takes over until the bowls stop.
  function play() { if (!S) return; S.phase = 'playing'; show(false); host.play(); }
  // Another go at the same head, straight onto the green. Only the day's first shot counts.
  function again() {
    if (!S) return;
    host.setUp(S.pz); S.before = Sim.scoreOf(host.world()); S.result = null;
    play();
  }
  function fullMatch() { const h = host; Metrics.send('full_match_clicked', { puzzleId: S.pz.id }); finishUp(); h.fullMatch(); }
  function close() { if (!root || root.hidden) return; const h = host; finishUp(); h.menu(); }
  function finishUp() { clearInterval(clockTimer); show(false); showList(false); S = null; }

  /* The game reports that the shot is over. Judge the head as the game left it: Rules.afterDelivery
     marks dead bowls, AI.value measures it exactly as the benchmark did, Rules.score counts it. */
  function done(world, delivered) {
    if (!S || S.phase !== 'playing') return;
    const pz = S.pz, res = Sim.judge(world, pz, delivered, S.before), bench = pz.bench && pz.bench.values;
    const stars = bench ? C.starsFor(res.value, bench) : FALLBACK[res.outcome];
    const saved = C.isSaved(res.outcome);
    // every go is kept by number on this device, today's puzzle included
    const ar = C.recordArchive(S.arch, S.issue, stars);
    S.arch = ar.archive; C.saveArchive(store(), S.arch);
    let rec;
    if (S.archive) {   // an archive puzzle: its own best, and the streak is left alone
      rec = { first: ar.first, improved: ar.improved, from: ar.first ? null : { stars: ar.from } };
      Metrics.send('archive_played', { puzzleId: pz.id, isFirstGo: ar.first });
    } else {
      const dsl = C.daysSinceLastPlay(S.stats, S.day);
      rec = C.recordAttempt(S.stats, S.day, pz.id, { stars, outcome: res.outcome, saved });
      S.stats = rec.stats; C.saveStats(store(), S.stats);
      // the first go of the day is the fair measure of the puzzle; a later go that beats the best moves the player up
      if (rec.first) Metrics.send('puzzle_attempted', { puzzleId: pz.id, stars, saved, isFirstAttemptOfDay: true, streak: S.stats.streak, daysSinceLastPlay: dsl });
      else {
        Metrics.send('puzzle_replayed', { puzzleId: pz.id });
        if (rec.improved) Metrics.send('puzzle_improved', { puzzleId: pz.id, fromStars: rec.from.stars, toStars: stars, wasSaved: rec.from.saved, saved });
      }
    }
    S.result = Object.assign(res, { stars, saved, first: rec.first, improved: rec.improved, from: rec.from, delivered, world, trace: (host.trace ? host.trace() : []).slice(),
      beat: bench ? Math.round(C.beatShare(res.value, bench) * 100) : null });
    if (rec.first || rec.improved) S.best = { world: snapshot(world, delivered), stars, tries: bestOf().tries };   // the share picture shows this head
    S.phase = 'done';
    show(true); paint(); sizePlan(); draw();
    toast(''); $('skGo').focus({ preventScroll: true }); root.scrollTop = 0;
  }

  function onKey(e) {
    if (!root || root.hidden) return;
    e.stopImmediatePropagation();   // the game underneath hears nothing while the card is up
    if (e.key === 'Escape') { e.preventDefault(); close(); }
  }

  // ---------- painting the card ----------
  function paint() { paintStatic(); paintNote(); paintBoard(); paintShare(); tickClock(); }
  function paintStatic() {
    const pz = S.pz, after = S.phase === 'done';
    root.classList.toggle('sk-done', after);
    if (after) $('skGo').before($('skShareBtn')); else $('skGo').after($('skShareBtn'));   // after a go, Share comes first
    $('skMeta').textContent = `No. ${S.issue}${S.archive ? ' · from the archive' : ''} · ${pz.advised.hand === 'fore' ? 'forehand' : 'backhand'} advised · ${pz.greenSpeed} s ${E.GreenSpeed.label(pz.greenSpeed).toLowerCase()} green` + (pz.conditions ? ` · ${pz.conditions}` : '');
    $('skAdvice').innerHTML = `<b>${esc(cap(pz.advised.by || 'your third'))}:</b> “${esc(pz.advised.say)}”`;
    $('skGo').innerHTML = after ? 'Play<span class="sk-long"> it</span> again' : 'Play the shot';
    $('skAlt').textContent = after ? 'Full match' : 'Main menu';
    $('skAlt').setAttribute('aria-label', after ? 'Play a full match' : 'Main menu');
    $('skHelp').textContent = after ? (S.archive ? 'Play it again as often as you like: your best go is kept. Archive puzzles never change your streak.' : 'Play it again as often as you like: your best go of the day is the one that counts.')
      : 'You play it on the green with the usual controls: line, hand, then hold Bowl. Your line starts on the advice. Go up and look, on the green, walks you up to the head, once a go.';
  }
  function stars(n) {
    const pts = '12,1.8 14.9,8.6 22.2,9.2 16.6,14 18.3,21.2 12,17.4 5.7,21.2 7.4,14 1.8,9.2 9.1,8.6';
    let h = '';
    for (let i = 0; i < 5; i++) {
      const f = Math.max(0, Math.min(1, n - i)), id = 'skh' + i + Math.random().toString(36).slice(2, 6);
      h += `<svg viewBox="0 0 24 24" aria-hidden="true"><defs><clipPath id="${id}"><rect x="0" y="0" width="${24 * f}" height="24"/></clipPath></defs>` +
        `<polygon points="${pts}" fill="${tok('paper')}"/>` + (f ? `<polygon points="${pts}" fill="${tok('brass')}" clip-path="url(#${id})"/>` : '') +
        `<polygon points="${pts}" fill="none" stroke="${tok('ink')}" stroke-width="1.6" stroke-linejoin="round"/></svg>`;
    }
    return `<div class="sk-stars" role="img" aria-label="${C.starWords(n)}">${h}</div>`;
  }
  function paintNote() {
    const pz = S.pz, r = S.result;
    if (!r) {
      $('skNote').innerHTML = `<p class="sk-kicker">The situation</p><p>${esc(pz.situation)}</p><p class="sk-hand">${esc(pz.hint || 'pick your weight, then play the shot')}</p>`;
      return;
    }
    const info = C.outcomeInfo(r.outcome, pz.verdicts), t = bestOf(), when = S.archive ? '' : ' today';
    const counted = r.first ? '' : r.improved
      ? `<p class="sk-small"><strong>New best${when}</strong> (was ${C.starWords(r.from.stars).replace(' out of 5', '')}), ${C.goesText(t.tries)}.</p>`
      : `<p class="sk-small">Your best${when} is still ${C.starWords(t.stars).replace(' out of 5', '')} (${t.tries} goes so far).</p>`;
    const beat = r.beat == null ? '' : ` Better than or level with ${r.beat} of the 100 benchmark bowlers.`;
    const dead = r.jackDead ? ` Dead end: ${esc(r.jackDead.replace(/\.$/, '').toLowerCase())}.` : '';
    $('skNote').innerHTML = `<p class="sk-kicker">Skip's verdict</p><div class="sk-vrow">${stars(r.stars)}<h2 class="sk-verdict-title">${esc(info.title)}</h2></div>` +
      `<p>${esc(info.detail)}${dead}${beat}</p><p class="sk-hand">${esc(info.scribble)}</p>${counted}`;
  }
  function paintBoard() {
    const st = S.stats, prev = S.shown || {};
    const tiles = (n, was) => String(n).split('').map(d => `<span class="sk-tile${was != null && was !== n ? ' flip' : ''}">${d}</span>`).join('');
    const streak = C.currentStreak(st, S.day), best = st.best;
    let h = `<div><dt>Streak</dt><dd aria-label="${streak} day${streak === 1 ? '' : 's'}">${tiles(streak, prev.streak)}</dd></div>` +
      `<div><dt>Best<span class="sk-long"> streak</span></dt><dd aria-label="${best} day${best === 1 ? '' : 's'}">${tiles(best, prev.best)}</dd></div>`;
    if (S.savedPct != null && !S.archive) h += `<div><dt>Saved it, %</dt><dd aria-label="${S.savedPct}% of today's players saved the end">${tiles(S.savedPct, prev.saved)}</dd></div>`;
    $('skBoard').innerHTML = h;
    S.shown = { streak, best, saved: S.savedPct };
  }
  /* Sharing. The brass Share button on the card is the main way: it opens the share sheet with a
     square picture of the result (the card below), the thing that shows up well on social media,
     or copies the text where there is no share sheet. Beside the card (wide screens only) the
     text line, Copy and Picture (saves the picture) are there for anyone who wants them.
     The picture is made as soon as the share line appears, so the share sheet can open straight
     from the tap (Safari refuses one that waits on anything). */
  function paintShare() {
    const t = bestOf(), box = $('skShare');
    box.hidden = !t; $('skShareBtn').hidden = !t;
    if (!t) return;
    const text = C.shareText(S.issue, t.stars, SHARE_URL(S.issue), t.tries);
    box.innerHTML = `<p><span aria-hidden="true">${esc(C.shareText(S.issue, t.stars, '', t.tries))}</span><span class="sk-sr">Your best${S.archive ? '' : ' today'} to share: puzzle ${S.issue}, ${C.starWords(t.stars)}, ${C.goesText(t.tries)}.</span></p>` +
      '<button class="sk-paperbtn" id="skCopy" aria-label="Copy your result to share">Copy</button>' +
      '<button class="sk-paperbtn sk-pic" id="skPic" aria-label="Save a picture of your result">Picture</button>';
    const shared = () => Metrics.send('result_shared', { puzzleId: S.pz.id });
    const copy = async () => {
      let ok = false;
      try { await navigator.clipboard.writeText(text); ok = true; } catch (e) {
        const ta = document.createElement('textarea'); ta.value = text; ta.style.position = 'fixed'; ta.style.opacity = '0'; root.appendChild(ta); ta.select();
        try { ok = document.execCommand('copy'); } catch (x) { ok = false; } ta.remove();
      }
      toast(ok ? 'Copied. Paste it wherever you like.' : 'Could not copy: select the result and copy it yourself.');
      if (ok) shared();
    };
    // the share sheet: with the picture where the browser can share files, the text alone where it cannot
    /* the share sheet: on phones and tablets, with the picture where the browser can share files, the text alone where it
       cannot, and a copy if the sheet fails. A computer's share sheet (Windows, macOS) often refuses or hides, so there
       Share copies the result, and the Picture button beside it saves the picture. */
    const sheet = () => {
      const card = S.card && S.card.key === cardKey(t) ? S.card : null, files = card && card.canShare ? [card.file] : null;
      navigator.share(files ? { files, text } : { text }).then(shared, e => {
        if (e && e.name === 'AbortError') return;   // the player closed the sheet
        if (files) navigator.share({ text }).then(shared, x => { if (!x || x.name !== 'AbortError') copy(); });
        else copy();
      });
    };
    const useSheet = !!navigator.share && matchMedia('(pointer: coarse)').matches;
    $('skShareBtn').onclick = useSheet ? sheet : copy;
    $('skShareBtn').setAttribute('aria-label', useSheet ? 'Share your result' : 'Copy your result to share');
    $('skCopy').onclick = copy;
    $('skPic').onclick = async () => {
      const card = await makeCard(t);
      if (!card) { toast('Could not make the picture, sorry.'); return; }
      const a = document.createElement('a'), url = URL.createObjectURL(card.file);
      a.href = url; a.download = card.file.name; root.appendChild(a); a.click(); a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 10000);
      toast('Picture saved. Post it with your result.'); shared();
    };
    makeCard(t);
  }
  // The game clears and reuses its world for the next go, so the best go's head is kept as a copy.
  function snapshot(world, delivered) {
    const copy = b => b && { kind: b.kind, owner: b.owner, x: b.x, y: b.y, r: b.r, state: b.state, dead: b.dead };
    const bodies = world.bodies.map(copy);
    return { bodies, jack: copy(world.jack), mine: bodies[world.bodies.indexOf(delivered)] || null };
  }
  // The head the card shows: the finished head of the day's best go, if it was played since the page opened.
  const bestHead = t => S.best && S.best.stars === t.stars && S.best.tries === t.tries ? S.best : null;
  const cardKey = t => [S.date, S.pz.id, S.arm, t.stars, t.tries, bestHead(t) ? 'end' : 'set'].join('|');
  /* The picture: a 1080 px square score card with the finished head of your best go (your bowl
     ringed in biro, its path left off so it does not hand friends the line), the stars and how
     many goes they took. A best go from an earlier visit is not kept, so then it shows the head as set. */
  async function makeCard(t) {
    const key = cardKey(t);
    if (S.card && S.card.key === key) return S.card;
    if (S.cardBusy && S.cardBusy.key === key) return S.cardBusy.p;
    const mine = S, p = (async () => {
      try {
        if (document.fonts) await Promise.all(['700 80px "Big Shoulders Display"', 'italic 34px Newsreader', '600 40px Newsreader', '64px "Reenie Beanie"'].map(f => document.fonts.load(f))).catch(() => {});
        if (S !== mine) return null;
        const cv = document.createElement('canvas'); cv.width = cv.height = 1080;
        drawCard(cv.getContext('2d'), t);
        const blob = await new Promise(res => cv.toBlob(res, 'image/png'));
        if (!blob || S !== mine) return null;
        const file = new File([blob], `over-to-you-skip-${S.issue}.png`, { type: 'image/png' });
        let canShare = false; try { canShare = !!(navigator.canShare && navigator.canShare({ files: [file] })); } catch (e) { /* no file sharing */ }
        return (S.card = { key, file, canShare });
      } catch (e) { return null; }
    })();
    S.cardBusy = { key, p };
    return p;
  }
  function drawCard(g, t) {
    const W = 1080, P = palette(), ink = tok('ink'), muted = tok('muted'), paper = tok('paper'), brass = tok('brass'), best = bestHead(t);
    // the lawn, mown in stripes, and the score sheet on it
    g.fillStyle = tok('lawn'); g.fillRect(0, 0, W, W);
    g.fillStyle = tok('stripe'); for (let x = 0; x < W; x += 180) g.fillRect(x, 0, 90, W);
    const sx = 56, sy = 56, sw = W - 112, sh = W - 112;
    g.save(); g.shadowColor = 'rgba(0,0,0,.22)'; g.shadowBlur = 24; g.shadowOffsetY = 8; g.fillStyle = paper; g.fillRect(sx, sy, sw, sh); g.restore();
    g.strokeStyle = ink; g.lineWidth = 4; g.strokeRect(sx, sy, sw, sh);
    g.textAlign = 'center'; g.textBaseline = 'alphabetic'; g.fillStyle = ink;
    g.font = '700 84px "Big Shoulders Display", "Arial Narrow", sans-serif';
    g.fillText('“OVER TO YOU, SKIP!”', W / 2, 172);
    const day = new Date(S.date + 'T12:00:00Z').toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', timeZone: 'UTC' });
    g.fillStyle = muted; g.font = 'italic 34px Newsreader, Georgia, serif';
    g.fillText(`No. ${S.issue} · ${day}`, W / 2, 222);
    // the plan of the head
    const px = 120, py = 258, pw = W - 240, ph = 420;
    g.save(); g.translate(px, py); g.beginPath(); g.rect(0, 0, pw, ph); g.clip();
    const v = view(pw, ph, best ? best.world : null);
    paintGround(g, v, P);
    paintBowls(g, v, best ? best.world : Sim.world(S.pz, S.arm), P, best ? best.world.mine : null, 6);
    g.restore();
    g.strokeStyle = ink; g.lineWidth = 3; g.strokeRect(px, py, pw, ph);
    // the stars: brass, half a star where it is half
    const pts = [12, 1.8, 14.9, 8.6, 22.2, 9.2, 16.6, 14, 18.3, 21.2, 12, 17.4, 5.7, 21.2, 7.4, 14, 1.8, 9.2, 9.1, 8.6], k = 4.2, gap = 22, size = 24 * k;
    const x0 = W / 2 - (5 * size + 4 * gap) / 2, y0 = 708;
    const star = () => { g.beginPath(); for (let j = 0; j < pts.length; j += 2) j ? g.lineTo(pts[j], pts[j + 1]) : g.moveTo(pts[j], pts[j + 1]); g.closePath(); };
    for (let i = 0; i < 5; i++) {
      const f = Math.max(0, Math.min(1, t.stars - i));
      g.save(); g.translate(x0 + i * (size + gap), y0); g.scale(k, k);
      star(); g.fillStyle = paper; g.fill();
      if (f) { g.save(); g.beginPath(); g.rect(0, 0, 24 * f, 24); g.clip(); star(); g.fillStyle = brass; g.fill(); g.restore(); }
      star(); g.strokeStyle = ink; g.lineWidth = 1.5; g.lineJoin = 'round'; g.stroke();
      g.restore();
    }
    g.fillStyle = ink; g.font = '600 44px Newsreader, Georgia, serif';
    g.fillText(`${cap(C.starWords(t.stars).replace(' out of 5', ''))}, ${C.goesText(t.tries)}`, W / 2, 872);
    g.save(); g.fillStyle = P.biro; g.font = '64px "Reenie Beanie", "Comic Sans MS", cursive'; g.translate(W / 2, 946); g.rotate(-2 * DEG);
    g.fillText('Can you save the end?', 0, 0); g.restore();
    g.fillStyle = muted; g.font = '700 30px "Big Shoulders Display", "Arial Narrow", sans-serif';
    g.fillText('JOHNSAV.CO.UK/BIAS', W / 2, 1002);
  }
  // A new puzzle comes out at 06:00 London: a card left open says so (no countdown, on purpose).
  function tickClock() {
    if (!S || FAKE) return;
    if (C.puzzleDay(Date.now()) !== S.day && S.phase !== 'playing' && $('skList').hidden) $('skFresh').hidden = false;
  }
  let toastTimer = 0;
  function toast(msg, stay) { clearTimeout(toastTimer); $('skToast').textContent = msg; if (msg && !stay) toastTimer = setTimeout(() => { if ($('skToast')) $('skToast').textContent = ''; }, 5000); }

  // ---------- the puzzles screen: today's and the new ones first, then the archive ----------
  function showList(on) {
    $('skList').hidden = !on; root.querySelector('.sk-layout').hidden = on; root.classList.toggle('sk-listing', on);
    $('skAll').hidden = on; $('skToday').hidden = !on;
    if (on) $('skFresh').hidden = true;
  }
  const dayText = d => new Date(d + 'T12:00:00Z').toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short', timeZone: 'UTC' });
  const monthText = d => new Date(d + 'T12:00:00Z').toLocaleDateString('en-GB', { month: 'long', year: 'numeric', timeZone: 'UTC' });
  async function openList() {
    try { await loadIndex(true); } catch (e) { if (!index) throw e; }
    const day = today(), stats = C.loadStats(store()), arch = loadArchive(stats), sec = C.listSections(index, day, arch);
    const res = e => { const a = arch[String(e.n)]; return e === sec.today && C.playedToday(stats, day) && stats.today.puzzleId === e.id ? stats.today : a || null; };
    const row = (e, badge) => {
      const r = res(e), green = `${e.green} s ${E.GreenSpeed.label(e.green).toLowerCase()}` + (e.conditions ? ` · ${e.conditions}` : '');
      const result = r ? `<span class="sk-rowstars" aria-hidden="true">${C.starText(r.stars)}</span><span class="sk-rowgoes">${r.tries === 1 ? '1 go' : r.tries + ' goes'}</span>` : '<span class="sk-rowgoes">Not played</span>';
      const said = `No. ${e.n}, ${dayText(e.date)}: ${e.title}. ${r ? `Your best: ${C.starWords(r.stars)}, ${C.goesText(r.tries)}` : 'Not played'}.${badge ? ' ' + badge + '.' : ''}`;
      return `<li><button class="sk-row${badge === 'Today' ? ' sk-row-today' : ''}" data-n="${e.n}" aria-label="${esc(said)}"><span class="sk-no">No. ${e.n}</span>` +
        `<span class="sk-rowmain"><span class="sk-rowtitle">${esc(e.title)}${badge ? ` <span class="sk-badge${badge === 'Today' ? ' sk-badge-today' : ''}">${badge}</span>` : ''}</span><span class="sk-rowmeta">${esc(dayText(e.date))} · ${esc(green)}</span></span>` +
        `<span class="sk-rowres">${result}</span></button></li>`;
    };
    let h = '<h2 class="sk-listh">New</h2>';
    h += sec.today ? `<ul class="sk-rows">${row(sec.today, 'Today')}${sec.fresh.map(e => row(e, 'New')).join('')}</ul>` : '<p class="sk-small">The first puzzle comes out soon.</p>';
    if (sec.archive.length) {
      const grouped = sec.archive.length > 14;
      h += `<div class="sk-archhead"><h2 class="sk-listh">Archive</h2>${grouped ? '<button class="sk-paperbtn sk-jump" id="skJump">Jump to No. 1</button>' : ''}</div>`;
      if (!grouped) h += `<ul class="sk-rows">${sec.archive.map(e => row(e)).join('')}</ul>`;
      else {
        let month = '';
        for (const e of sec.archive) {
          const m = monthText(e.date);
          if (m !== month) { h += (month ? '</ul>' : '') + `<h3 class="sk-month">${esc(m)}</h3><ul class="sk-rows">`; month = m; }
          h += row(e);
        }
        h += '</ul>';
      }
    }
    $('skListBody').innerHTML = h;
    $('skListToast').textContent = '';
    for (const b of $('skListBody').querySelectorAll('.sk-row')) b.onclick = () => {
      const n = +b.dataset.n, e = index.find(x => x.n === n);
      if (S && S.issue === n && S.day === day) run(backToCard());
      else run(start(e === sec.today ? null : e).catch(x => { $('skListToast').textContent = 'That puzzle could not load. Check your connection and try again.'; throw x; }));
    };
    if ($('skJump')) $('skJump').onclick = () => { const last = [...$('skListBody').querySelectorAll('.sk-row')].pop(); last.scrollIntoView({ block: 'center' }); last.focus({ preventScroll: true }); };
    showList(true); show(true);
    $('skList').scrollTop = 0; $('skListTitle').focus({ preventScroll: true });
    Metrics.send('puzzles_list_opened', {});
  }

  // ---------- the plan of the head ----------
  /* The advice drawn into the head. A draw shows where it would stop; a yard on or a drive is
     drawn as far as the bowl it is aimed at, with an arrow, since it is meant to hit something. */
  function advicePath(pz, arm) {
    const p = Sim.lonePath(pz, pz.advised, arm);
    if (pz.advised.kind === 'draw') return p;
    const ty = pz.advised.target.y, pts = [];
    for (const q of p.pts) { pts.push(q); if (q.y >= ty) break; }
    return { pts, state: 'through' };
  }
  function sizePlan() {
    const cv = $('skPlan'), r = cv.getBoundingClientRect(), dpr = Math.min(window.devicePixelRatio || 1, 2);
    cv.width = Math.max(10, Math.round(r.width * dpr)); cv.height = Math.max(10, Math.round(r.height * dpr)); cv._dpr = dpr;
  }
  /* The view: true scale, at least 2 m across. Before the shot it is the head as it was set (a puzzle can set
     view.w and view.dx); once a world is given (after the shot), it is where the jack finished and the live
     bowls within 2.5 m of it, the ditch included, so a jack that was moved takes the plan with it. */
  const AROUND = 2.5;
  function view(w, h, world) {
    const m = S.arm === 'L' ? -1 : 1, pz = S.pz, J = world && world.jack;
    let pts = J ? world.bodies.filter(b => !b.dead && (b === J || (b.kind === 'bowl' && Math.hypot(b.x - J.x, b.y - J.y) < AROUND))).map(b => ({ x: b.x, y: b.y })) : null;
    const set = !pts;
    if (set) pts = [pz.jack, ...pz.bowls].map(p => ({ x: m * p.x, y: p.y }));
    const x0 = Math.min(...pts.map(p => p.x)), x1 = Math.max(...pts.map(p => p.x)), y0 = Math.min(...pts.map(p => p.y)), y1 = Math.max(...pts.map(p => p.y));
    const aspect = w / h, span = Math.max(set && pz.view && pz.view.w || (w < 500 ? 1.6 : 2.0), x1 - x0 + 0.7, (y1 - y0 + 0.8) * aspect), s = w / span;
    const cx = set && pz.view && pz.view.dx != null ? m * (pz.jack.x + pz.view.dx) : (x0 + x1) / 2;
    // never more than a strip of bank beyond the ditch: a jack in the ditch sits near the top of the plan
    const far = E.W.GREEN_LEN + E.W.DITCH_W + 0.35, cy = Math.min((y0 + y1) / 2 + 0.08, far - h / 2 / s);
    return { w, h, s, cx, cy, T: (x, y) => ({ x: w / 2 + (x - cx) * s, y: h / 2 - (y - cy) * s }) };
  }
  const palette = () => ({ wash: tok('wash'), grid: tok('grid'), bowl: tok('bowl'), red: tok('ring-red'), yellow: tok('ring-yellow'), jack: tok('chalk'), ink: tok('ink'), biro: tok('biro'), ditch: tok('ditch'), bank: tok('bank') });
  // The green under the head: the wash and a faint grid of 25 cm squares, lined up on the jack.
  function paintGround(g, v, P) {
    const T = v.T, m = S.arm === 'L' ? -1 : 1, jx = m * S.pz.jack.x, jy = S.pz.jack.y, step = 0.25;
    g.fillStyle = P.wash; g.fillRect(0, 0, v.w, v.h);
    g.strokeStyle = P.grid; g.lineWidth = 1;
    for (let k = Math.floor((v.cx - v.w / v.s / 2 - jx) / step); ; k++) { const x = T(jx + k * step, 0).x; if (x > v.w) break; g.beginPath(); g.moveTo(Math.round(x) + .5, 0); g.lineTo(Math.round(x) + .5, v.h); g.stroke(); }
    for (let k = Math.floor((v.cy - v.h / v.s / 2 - jy) / step); ; k++) { const y = T(0, jy + k * step).y; if (y < 0) break; g.beginPath(); g.moveTo(0, Math.round(y) + .5); g.lineTo(v.w, Math.round(y) + .5); g.stroke(); }
    // the front ditch and the bank beyond it, when the plan reaches that far
    const W = E.W, edge = T(0, W.GREEN_LEN).y, back = T(0, W.GREEN_LEN + W.DITCH_W).y;
    if (edge > 0) {
      g.fillStyle = P.bank; g.fillRect(0, 0, v.w, Math.max(0, back));
      g.fillStyle = P.ditch; g.fillRect(0, back, v.w, edge - back);
      g.strokeStyle = P.ink; g.lineWidth = 2; g.beginPath(); g.moveTo(0, Math.round(edge) + .5); g.lineTo(v.w, Math.round(edge) + .5); g.stroke();
      if (edge - back >= 16) { g.save(); g.fillStyle = P.ink; g.globalAlpha = .7; g.font = 'italic 13px Newsreader, Georgia, serif'; g.textBaseline = 'middle'; g.fillText('ditch', 6, (edge + back) / 2); g.restore(); }
    }
  }
  /* Bowls: dark brown discs with a coloured ring; dead ones faded; a toucher carries a chalk cross, as on the
     green; yours (mine) outlined in blue. Then the jack. Anything in the front ditch is drawn where it lies in it. */
  function paintBowls(g, v, world, P, mine, ring = 3) {
    const T = v.T, pz = S.pz;
    for (const b of world.bodies) {
      if (b.kind !== 'bowl') continue;
      const q = T(b.x, b.y), R = b.r * v.s, ring = teamOf(b, pz) === 'red' ? P.red : P.yellow;
      if (q.y < -R || q.y > v.h + R) continue;
      g.save(); g.globalAlpha = b.dead ? 0.35 : 1;
      g.fillStyle = P.bowl; g.beginPath(); g.arc(q.x, q.y, R, 0, Math.PI * 2); g.fill();
      g.strokeStyle = 'rgba(0,0,0,.45)'; g.lineWidth = 1.5; g.stroke();
      g.strokeStyle = ring; g.lineWidth = R * 0.26; g.beginPath(); g.arc(q.x, q.y, R * 0.55, 0, Math.PI * 2); g.stroke();
      if (b.toucher && !b.dead) {
        const k = Math.max(3, R * 0.32), cx = q.x + R * 0.62, cy = q.y - R * 0.62;
        g.strokeStyle = '#FBFAF4'; g.lineWidth = Math.max(1.6, R * 0.14); g.lineCap = 'round';
        g.beginPath(); g.moveTo(cx - k, cy - k); g.lineTo(cx + k, cy + k); g.moveTo(cx - k, cy + k); g.lineTo(cx + k, cy - k); g.stroke();
      }
      if (b === mine) { g.strokeStyle = P.biro; g.lineWidth = ring; g.beginPath(); g.arc(q.x, q.y, R + 1 + ring, 0, Math.PI * 2); g.stroke(); }
      g.restore();
    }
    const J = world.jack;
    if (J) { const q = T(J.x, J.y); g.fillStyle = P.jack; g.strokeStyle = P.ink; g.lineWidth = 2; g.beginPath(); g.arc(q.x, q.y, Math.max(6, J.r * v.s), 0, Math.PI * 2); g.fill(); g.stroke(); }
  }
  function draw() {
    if (!S || !root || root.hidden) return;
    const cv = $('skPlan'), g = cv.getContext('2d'), r = S.result, after = !!r, v = view(cv.width / cv._dpr, cv.height / cv._dpr, after ? r.world : null), T = v.T, pz = S.pz, m = S.arm === 'L' ? -1 : 1;
    const world = after ? r.world : host.world();
    g.setTransform(cv._dpr, 0, 0, cv._dpr, 0, 0);
    const P = palette();
    paintGround(g, v, P);
    const path = (pts, dash, alpha, width) => {
      g.save(); g.globalAlpha = alpha; g.strokeStyle = P.biro; g.lineWidth = width; g.lineCap = 'round'; g.setLineDash(dash);
      g.beginPath(); pts.forEach((p, i) => { const q = T(p.x, p.y); i ? g.lineTo(q.x, q.y) : g.moveTo(q.x, q.y); }); g.stroke(); g.restore();
    };
    // the advice: dashed biro, half strength; fainter once you have played
    const a = S.advicePath;
    path(a.pts, [10, 9], after ? 0.28 : 0.5, 3.5);
    if (a.state === 'through' && a.pts.length > 2) {
      const q1 = T(a.pts[a.pts.length - 1].x, a.pts[a.pts.length - 1].y), q0 = T(a.pts[a.pts.length - 3].x, a.pts[a.pts.length - 3].y), ang = Math.atan2(q1.y - q0.y, q1.x - q0.x);
      g.save(); g.globalAlpha = after ? 0.3 : 0.6; g.fillStyle = P.biro; g.beginPath(); g.moveTo(q1.x + Math.cos(ang) * 4, q1.y + Math.sin(ang) * 4);
      g.lineTo(q1.x + Math.cos(ang + 2.6) * 14, q1.y + Math.sin(ang + 2.6) * 14); g.lineTo(q1.x + Math.cos(ang - 2.6) * 14, q1.y + Math.sin(ang - 2.6) * 14); g.closePath(); g.fill(); g.restore();
    }
    if (a.state === 'rest') { const q = T(a.rest.x, a.rest.y); g.save(); g.globalAlpha = after ? 0.3 : 0.55; g.strokeStyle = P.biro; g.lineWidth = 3; g.setLineDash([5, 4]); g.beginPath(); g.arc(q.x, q.y, E.W.BOWL_R * v.s + 2, 0, Math.PI * 2); g.stroke(); g.restore(); }
    // after the shot: the path your bowl took on the green, solid
    if (after && r.trace.length > 1) path(r.trace.concat([{ x: r.delivered.x, y: r.delivered.y }]), [], 0.9, 3.5);
    paintBowls(g, v, world, P, after ? r.delivered : null);
    if (!after && v.h >= 200) {
      // the handwritten notes on the plan, kept inside it; left off a plan too small to hold them (they are in the screen-reader text)
      /* Each note starts where the puzzle puts it and moves to the nearest spot, inside the plan, that covers no bowl,
         no jack and no other note; a note with nowhere to go is left off (it is in the screen-reader text). */
      g.fillStyle = P.biro; g.textAlign = 'left'; g.textBaseline = 'alphabetic'; g.font = '32px "Reenie Beanie", cursive';
      const hit = (a, b) => a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h;
      const placed = world.bodies.filter(b => !b.dead && (b.kind === 'bowl' || b === world.jack)).map(b => {
        const q = T(b.x, b.y), R = (b.kind === 'jack' ? Math.max(6, b.r * v.s) : b.r * v.s) + 5;
        return { x: q.x - R, y: q.y - R, w: 2 * R, h: 2 * R };
      });
      const moves = [];
      for (const dy of [0, -36, 36, -72, 72, -108, 108, -144, 144]) for (const dx of [0, -70, 70, -140, 140, -210, 210]) moves.push([dx, dy]);
      moves.sort((a, b) => Math.hypot(a[0], a[1] * 1.6) - Math.hypot(b[0], b[1] * 1.6));
      for (const n of pz.annotations || []) {
        const q = T(m * (pz.jack.x + n.dx), pz.jack.y + n.dy), tw = g.measureText(n.text).width, rot = (n.rot || -3) * DEG, lean = Math.abs(Math.sin(rot)) * tw;
        let spot = null;
        for (const [dx, dy] of moves) {
          const x = q.x + dx, y = q.y + dy, box = { x: x - 2, y: y - 27 - lean, w: tw + 4, h: 34 + lean };
          if (box.x < 4 || box.x + box.w > v.w - 4 || box.y < 2 || box.y + box.h > v.h - 2) continue;
          if (!placed.some(b => hit(box, b))) { spot = { x, y, box }; break; }
        }
        if (!spot) continue;
        placed.push(spot.box);
        g.save(); g.translate(spot.x, spot.y); g.rotate(rot); g.fillText(n.text, 0, 0); g.restore();
      }
    } else if (after && v.h >= 140) {
      /* distances, as a measure reads them: the nearest few on a small plan, none on a tiny one (they are in the screen-reader text).
         Each label tries beside its bowl (right, left), then above and below; it takes the first spot inside the plan that covers
         no other label and, if it can, no bowl or the jack. Nearest first, so a label with nowhere to go is a far one, left off. */
      g.font = 'italic 600 15px Newsreader, Georgia, serif'; g.textBaseline = 'middle'; g.textAlign = 'left';
      const hit = (a, b) => a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h;
      const discs = world.bodies.filter(b => b.kind === 'bowl' || b === world.jack).map(b => {
        const q = T(b.x, b.y), R = b.kind === 'jack' ? Math.max(6, b.r * v.s) : b.r * v.s;
        return { b, x: q.x - R, y: q.y - R, w: 2 * R, h: 2 * R };
      });
      const placed = [];
      for (const e of r.ranked.slice(0, v.h >= 200 ? 6 : 3)) {
        const q = T(e.b.x, e.b.y), R = e.b.r * v.s, text = cm(e.d), w = g.measureText(text).width + 4, h = 18;
        const spots = [[q.x + R + 5, q.y - h / 2], [q.x - R - 5 - w, q.y - h / 2], [q.x - w / 2, q.y - R - 3 - h], [q.x - w / 2, q.y + R + 3]]
          .map(([x, y]) => ({ x, y, w, h })).filter(a => a.x >= 2 && a.x + a.w <= v.w - 2 && a.y >= 2 && a.y + a.h <= v.h - 2)
          .filter(a => !placed.some(b => hit(a, b)));
        const spot = spots.find(a => !discs.some(d => d.b !== e.b && hit(a, d))) || spots[0];
        if (!spot) continue;
        placed.push(spot);
        g.fillStyle = 'rgba(251,249,241,.85)'; g.fillRect(spot.x, spot.y, spot.w, spot.h);
        g.fillStyle = P.ink; g.fillText(text, spot.x + 2, spot.y + h / 2);
      }
    }
    describeHead(world);
  }
  // The head in words, for screen readers: kept beside the canvas and updated with it.
  function describeHead(world) {
    const pz = S.pz, J = world.jack, bits = [], r = S.result;
    const where = b => { const dx = b.x - J.x, dy = b.y - J.y, ud = Math.abs(dy) < 0.05 ? 'level with the jack' : dy < 0 ? `${cm(-dy)} short` : `${cm(dy)} behind`, lr = Math.abs(dx) < 0.05 ? '' : `, ${cm(Math.abs(dx))} to the ${dx < 0 ? 'left' : 'right'}`; return ud + lr; };
    if (J && J.state !== 'ditch') {
      const sc = E.Rules.score(world.bodies.filter(b => !b.dead), J);
      for (const e of sc.ranked) bits.push(`${cap(teamOf(e.b, pz))} bowl${r && e.b === r.delivered ? ' (yours)' : ''}: ${cm(e.d)} from the jack, ${where(e.b)}${e.scores ? ', scoring' : ''}.`);
    }
    const notes = !r && pz.annotations && pz.annotations.length ? ` Notes on the plan: ${pz.annotations.map(n => n.text).join('; ')}.` : '';
    $('skHeadText').textContent = `Plan of the head, nearest bowl first. ${bits.join(' ')}${notes} The advised line comes in on the ${pz.advised.hand}hand.`;
  }

  window.SkipPage = { open, done, close, list: () => run(openList()) };
})();
