/* Over to you, skip: the daily puzzle's briefing and verdict.
   bias/index.html loads this on demand (with skip-core.js and skip-sim.js) and calls
   SkipPage.open(). The shot itself is always played in the game: this card sets the head
   out on the green (host.setUp), steps aside while the player bowls with the game's own
   controls (host.play), and comes back when the game reports that everything has stopped
   (SkipPage.done). The head is then scored with the game's Rules.score and AI.value, the
   same measure the benchmark used, and the stars come from skip-core.js. */
(function () {
  'use strict';
  const C = window.SkipCore;
  const HERE = document.currentScript && document.currentScript.src ? new URL('.', document.currentScript.src).href : location.href;
  const SHARE_URL = 'https://www.johnsav.co.uk/bias/?skip';
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

  let E, Sim, host, root, $, S = null, puzzles = null, clockTimer = 0;
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
    <button class="sk-chip" id="skMenu">‹ Main menu</button>
    <span class="sk-fresh" id="skFresh" hidden>A new puzzle is ready.<button class="sk-chip" id="skReload">Open it</button></span>
  </div>
  <div class="sk-layout">
    <section class="sk-board" aria-label="Today's puzzle">
      <div class="sk-clip" aria-hidden="true"></div>
      <div class="sk-sheet">
        <header class="sk-head"><h1 id="skTitle">Over to you, skip</h1><p class="sk-meta" id="skMeta"></p></header>
        <div class="sk-plan"><canvas id="skPlan" role="img" aria-describedby="skHeadText"></canvas></div>
        <div class="sk-sr" id="skHeadText"></div>
        <p class="sk-advice" id="skAdvice"></p>
        <p class="sk-green" id="skGreen"></p>
        <div class="sk-actions">
          <button class="sk-enamel" id="skGo">Play the shot</button>
          <button class="sk-paperbtn" id="skAlt">Main menu</button>
        </div>
        <p class="sk-toast" id="skToast" role="status" aria-live="polite"></p>
        <p class="sk-help" id="skHelp"></p>
      </div>
    </section>
    <aside class="sk-rail">
      <div class="sk-note" id="skNote" aria-live="polite"></div>
      <div class="sk-score" role="group" aria-label="Scoreboard"><dl id="skBoard"></dl></div>
      <p class="sk-next" id="skNext"></p>
      <div class="sk-share" id="skShare" hidden></div>
    </aside>
  </div>
</div>`);
    document.body.appendChild(root);
    $ = id => root.querySelector('#' + id);
    $('skMenu').onclick = close;
    $('skReload').onclick = () => start();
    $('skGo').onclick = () => (S && S.phase === 'done' ? again() : play());
    $('skAlt').onclick = () => (S && S.phase === 'done' ? fullMatch() : close());
    window.addEventListener('keydown', onKey, true);
    new ResizeObserver(() => { if (!root.hidden && S) { sizePlan(); draw(); } }).observe(root);
  }
  function show(on) { root.hidden = !on; document.body.classList.toggle('skip-open', on); if (on) root.classList.toggle('sk-still', reduced()); }

  // ---------- opening, playing, closing ----------
  async function open(opts) {
    E = opts.engine; host = opts.host; Sim = window.SkipSim.create(E);
    if (!root) build();
    if (!puzzles && window.SKIP_PUZZLES) puzzles = window.SKIP_PUZZLES.puzzles;
    if (!puzzles) { const r = await fetch(HERE + 'puzzles.json', { cache: 'no-cache' }); if (!r.ok) throw new Error('puzzles ' + r.status); puzzles = (await r.json()).puzzles; }
    start();
  }
  // Today's puzzle: the head is set out on the green behind the briefing.
  function start() {
    // ?skipdate=YYYY-MM-DD shows another day's puzzle, on a local server only (for checking puzzles)
    const fake = /^(localhost|127\.0\.0\.1)$/.test(location.hostname) && new URLSearchParams(location.search).get('skipdate');
    const now = Date.now(), date = fake && C.isDate(fake) ? fake : C.londonDate(now), pz = puzzles[C.puzzleIndex(date, puzzles.length)];
    if (!pz.bench || pz.bench.head !== C.headHash(pz)) console.warn(`Over to you, skip: "${pz.id}" has changed since it was benchmarked. Run node bias/skip/tools/benchmark.cjs.`);
    let stats = C.loadStats(LS || NOSTORE);
    const dslBefore = C.daysSinceLastPlay(stats, date), returning = !!stats.lastPlayed && stats.lastPlayed !== date;
    const v = C.recordView(stats, date);
    if (v.first) { stats = v.stats; C.saveStats(LS || NOSTORE, stats); Metrics.send('puzzle_viewed', { puzzleId: pz.id, returning, daysSinceLastPlay: dslBefore }); }
    const arm = E.Settings.arm === 'L' ? 'L' : 'R';
    host.setUp(pz);
    S = { pz, date, issue: C.issueNumber(date), arm, stats, phase: 'brief', result: null, savedPct: S ? S.savedPct : null,
      before: Sim.scoreOf(host.world()), advicePath: advicePath(pz, arm) };
    show(true); $('skFresh').hidden = true;
    sizePlan(); paint(); draw();
    if (document.fonts) document.fonts.load('32px "Reenie Beanie"').then(() => document.fonts.load('italic 15px Newsreader')).then(draw, draw);
    clearInterval(clockTimer); clockTimer = setInterval(tickClock, 15000);
    toast(C.playedToday(stats, date) ? `You've played today's puzzle (${C.starWords(stats.today.stars)}). Shots now are practice and don't change your stats.` : '', true);
    $('skGo').focus({ preventScroll: true }); root.scrollTop = 0;
    Metrics.today().then(t => { if (S && t && t.day === S.date && t.savedPct != null) { S.savedPct = t.savedPct; paintBoard(); } });
  }
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
  function finishUp() { clearInterval(clockTimer); show(false); S = null; }

  /* The game reports that the shot is over. Judge the head as the game left it: Rules.afterDelivery
     marks dead bowls, AI.value measures it exactly as the benchmark did, Rules.score counts it. */
  function done(world, delivered) {
    if (!S || S.phase !== 'playing') return;
    const pz = S.pz, res = Sim.judge(world, pz, delivered, S.before), bench = pz.bench && pz.bench.values;
    const stars = bench ? C.starsFor(res.value, bench) : FALLBACK[res.outcome];
    const saved = C.isSaved(res.outcome), dsl = C.daysSinceLastPlay(S.stats, S.date);
    const rec = C.recordAttempt(S.stats, S.date, pz.id, { stars, outcome: res.outcome });
    S.stats = rec.stats; C.saveStats(LS || NOSTORE, S.stats);
    if (rec.first) Metrics.send('puzzle_attempted', { puzzleId: pz.id, stars, saved, isFirstAttemptOfDay: true, streak: S.stats.streak, daysSinceLastPlay: dsl });
    else Metrics.send('puzzle_replayed', { puzzleId: pz.id });
    S.result = Object.assign(res, { stars, saved, first: rec.first, delivered, world, trace: (host.trace ? host.trace() : []).slice(),
      beat: bench ? Math.round(C.beatShare(res.value, bench) * 100) : null });
    S.phase = 'done';
    show(true); paint(); draw();
    toast(''); $('skGo').focus({ preventScroll: true }); root.scrollTop = 0;
  }

  function onKey(e) {
    if (!root || root.hidden || !S) return;
    e.stopImmediatePropagation();   // the game underneath hears nothing while the card is up
    if (e.key === 'Escape') { e.preventDefault(); close(); }
  }

  // ---------- painting the card ----------
  function paint() { paintStatic(); paintNote(); paintBoard(); paintShare(); tickClock(); }
  function paintStatic() {
    const pz = S.pz, green = E.GreenSpeed.label(pz.greenSpeed).toLowerCase() + ' green', after = S.phase === 'done';
    $('skMeta').textContent = `No. ${S.issue} · ${pz.advised.hand === 'fore' ? 'forehand' : 'backhand'} advised · ${green}` + (pz.conditions ? ` · ${pz.conditions}` : '');
    $('skAdvice').innerHTML = `<b>${esc(cap(pz.advised.by || 'your third'))}:</b> “${esc(pz.advised.say)}”`;
    $('skGreen').innerHTML = `<strong>Green:</strong> ${pz.greenSpeed} seconds, ${green}${pz.conditions ? `, ${esc(pz.conditions)}` : ''}. ` +
      (pz.greenSpeed < 12 ? 'A heavy green: every bowl needs more weight.' : pz.greenSpeed > 14 ? 'A fast green: less weight than you think.' : 'A true, even green.');
    $('skGo').textContent = after ? 'Play it again' : 'Play the shot';
    $('skAlt').textContent = after ? 'Play a full match' : 'Main menu';
    $('skHelp').innerHTML = after ? 'Play it again for practice: only your first shot of the day counts.'
      : 'You play it on the green with the usual controls: set your line, pick forehand or backhand, then hold <b>Bowl</b> and let go at the weight you want. Your line starts on the advice.';
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
    const info = C.outcomeInfo(r.outcome, pz.verdicts), first = S.stats.today;
    const counted = r.first ? '' : `<p class="sk-small">Practice. Today's first shot (${C.starWords(first.stars)}) is the one that counts.</p>`;
    const beat = r.beat == null ? '' : ` You matched or beat ${r.beat} of the 100 bowlers who played this head in the benchmark.`;
    $('skNote').innerHTML = `<p class="sk-kicker">Skip's verdict</p>${stars(r.stars)}<h2 class="sk-verdict-title">${esc(info.title)}</h2>` +
      `<p>${esc(info.detail)}${beat}</p><p class="sk-hand">${esc(info.scribble)}</p>${counted}${headList()}`;
  }
  // The final head as a list: who lies where, and how far from the jack.
  function headList() {
    const r = S.result, pz = S.pz;
    if (r.jackDead) return `<p class="sk-small">Dead end: ${esc(r.jackDead.replace(/\.$/, ''))}. Nobody scores.</p>`;
    const rows = r.ranked.slice(0, 6).map((e, i) => `<li><span>${i + 1}. ${cap(teamOf(e.b, pz))}${e.b === r.delivered ? ' (your bowl)' : ''}${e.scores ? ' · scores' : ''}</span><span>${cm(e.d)}</span></li>`).join('');
    return `<ul class="sk-heads" aria-label="The head after your bowl, nearest first">${rows}</ul>`;
  }
  function paintBoard() {
    const st = S.stats, prev = S.shown || {};
    const tiles = (n, was) => String(n).split('').map(d => `<span class="sk-tile${was != null && was !== n ? ' flip' : ''}">${d}</span>`).join('');
    const streak = C.currentStreak(st, S.date), best = st.best;
    let h = `<div><dt>Streak</dt><dd aria-label="${streak} day${streak === 1 ? '' : 's'}">${tiles(streak, prev.streak)}</dd></div>` +
      `<div><dt>Best streak</dt><dd aria-label="${best} day${best === 1 ? '' : 's'}">${tiles(best, prev.best)}</dd></div>`;
    if (S.savedPct != null) h += `<div><dt>Saved it, %</dt><dd aria-label="${S.savedPct}% of today's players saved the end">${tiles(S.savedPct, prev.saved)}</dd></div>`;
    $('skBoard').innerHTML = h;
    S.shown = { streak, best, saved: S.savedPct };
  }
  function paintShare() {
    const t = S.stats.today && S.stats.today.date === S.date ? S.stats.today : null, box = $('skShare');
    box.hidden = !t;
    if (!t) return;
    const text = C.shareText(S.issue, t.stars, SHARE_URL);
    box.innerHTML = `<p class="sk-kicker">Share result</p><pre aria-label="${esc(C.shareText(S.issue, t.stars).replace(/[★½☆]+/, C.starWords(t.stars)))}">${esc(text)}</pre>` +
      `<div class="sk-actions"><button class="sk-paperbtn" id="skCopy">Copy</button>${navigator.share ? '<button class="sk-paperbtn" id="skNative">Share…</button>' : ''}</div>`;
    $('skCopy').onclick = async () => {
      let ok = false;
      try { await navigator.clipboard.writeText(text); ok = true; } catch (e) {
        const ta = document.createElement('textarea'); ta.value = text; ta.style.position = 'fixed'; ta.style.opacity = '0'; root.appendChild(ta); ta.select();
        try { ok = document.execCommand('copy'); } catch (x) { ok = false; } ta.remove();
      }
      $('skCopy').textContent = ok ? 'Copied' : 'Copy failed'; setTimeout(() => { const b = $('skCopy'); if (b) b.textContent = 'Copy'; }, 2000);
      if (ok) Metrics.send('result_shared', { puzzleId: S.pz.id });
    };
    if (navigator.share) $('skNative').onclick = () => navigator.share({ text }).then(() => Metrics.send('result_shared', { puzzleId: S.pz.id }), () => {});
  }
  function tickClock() {
    if (!S) return;
    const now = Date.now();
    $('skNext').textContent = `Next puzzle in ${C.countdown(now).text}`;
    if (C.londonDate(now) !== S.date && S.phase !== 'playing') $('skFresh').hidden = false;
  }
  let toastTimer = 0;
  function toast(msg, stay) { clearTimeout(toastTimer); $('skToast').textContent = msg; if (msg && !stay) toastTimer = setTimeout(() => { if ($('skToast')) $('skToast').textContent = ''; }, 5000); }

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
  /* The view: the head at true scale, centred on the bowls and at least 2 m across (a puzzle can set view.w). */
  function view() {
    const cv = $('skPlan'), w = cv.width / cv._dpr, h = cv.height / cv._dpr, m = S.arm === 'L' ? -1 : 1, pz = S.pz;
    const pts = [pz.jack, ...pz.bowls].map(p => ({ x: m * p.x, y: p.y }));
    const x0 = Math.min(...pts.map(p => p.x)), x1 = Math.max(...pts.map(p => p.x)), y0 = Math.min(...pts.map(p => p.y)), y1 = Math.max(...pts.map(p => p.y));
    const aspect = w / h, span = Math.max(pz.view && pz.view.w || (w < 500 ? 1.6 : 2.0), x1 - x0 + 0.7, (y1 - y0 + 0.8) * aspect), s = w / span;
    const cx = (pz.view && pz.view.dx != null) ? m * (pz.jack.x + pz.view.dx) : (x0 + x1) / 2, cy = (y0 + y1) / 2 + 0.08;
    return { w, h, s, cx, cy, T: (x, y) => ({ x: w / 2 + (x - cx) * s, y: h / 2 - (y - cy) * s }) };
  }
  function draw() {
    if (!S || !root || root.hidden) return;
    const cv = $('skPlan'), g = cv.getContext('2d'), v = view(), T = v.T, pz = S.pz, m = S.arm === 'L' ? -1 : 1, r = S.result, after = !!r;
    const world = after ? r.world : host.world();
    g.setTransform(cv._dpr, 0, 0, cv._dpr, 0, 0);
    const P = { wash: tok('wash'), grid: tok('grid'), bowl: tok('bowl'), red: tok('ring-red'), yellow: tok('ring-yellow'), jack: tok('chalk'), ink: tok('ink'), biro: tok('biro') };
    g.fillStyle = P.wash; g.fillRect(0, 0, v.w, v.h);
    // a faint grid of 25 cm squares, lined up on the jack
    const jx = m * pz.jack.x, jy = pz.jack.y, step = 0.25;
    g.strokeStyle = P.grid; g.lineWidth = 1;
    for (let k = Math.floor((v.cx - v.w / v.s / 2 - jx) / step); ; k++) { const x = T(jx + k * step, 0).x; if (x > v.w) break; g.beginPath(); g.moveTo(Math.round(x) + .5, 0); g.lineTo(Math.round(x) + .5, v.h); g.stroke(); }
    for (let k = Math.floor((v.cy - v.h / v.s / 2 - jy) / step); ; k++) { const y = T(0, jy + k * step).y; if (y < 0) break; g.beginPath(); g.moveTo(0, Math.round(y) + .5); g.lineTo(v.w, Math.round(y) + .5); g.stroke(); }
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
    // bowls: dark brown discs with a coloured ring; dead ones faded; yours outlined in blue
    for (const b of world.bodies) {
      if (b.kind !== 'bowl' || b.state === 'ditch') continue;
      const q = T(b.x, b.y), R = b.r * v.s, ring = teamOf(b, pz) === 'red' ? P.red : P.yellow;
      if (q.y < -R || q.y > v.h + R) continue;
      g.save(); g.globalAlpha = b.dead ? 0.35 : 1;
      g.fillStyle = P.bowl; g.beginPath(); g.arc(q.x, q.y, R, 0, Math.PI * 2); g.fill();
      g.strokeStyle = 'rgba(0,0,0,.45)'; g.lineWidth = 1.5; g.stroke();
      g.strokeStyle = ring; g.lineWidth = R * 0.26; g.beginPath(); g.arc(q.x, q.y, R * 0.55, 0, Math.PI * 2); g.stroke();
      if (after && b === r.delivered) { g.strokeStyle = P.biro; g.lineWidth = 3; g.beginPath(); g.arc(q.x, q.y, R + 4, 0, Math.PI * 2); g.stroke(); }
      g.restore();
    }
    // the jack: a white dot with a dark outline
    const J = world.jack;
    if (J && J.state !== 'ditch') { const q = T(J.x, J.y); g.fillStyle = P.jack; g.strokeStyle = P.ink; g.lineWidth = 2; g.beginPath(); g.arc(q.x, q.y, Math.max(6, J.r * v.s), 0, Math.PI * 2); g.fill(); g.stroke(); }
    if (!after) {
      // the handwritten notes on the plan, kept inside it on a narrow screen
      g.fillStyle = P.biro; g.textAlign = 'left'; g.textBaseline = 'alphabetic'; g.font = '32px "Reenie Beanie", cursive';
      for (const n of pz.annotations || []) {
        const q = T(m * (pz.jack.x + n.dx), pz.jack.y + n.dy), tw = g.measureText(n.text).width;
        const x = Math.max(8, Math.min(v.w - tw - 10, q.x)), y = Math.max(30, Math.min(v.h - 10, q.y));
        g.save(); g.translate(x, y); g.rotate((n.rot || -3) * DEG); g.fillText(n.text, 0, 0); g.restore();
      }
    } else {
      // distances, as a measure reads them
      g.font = 'italic 600 15px Newsreader, Georgia, serif'; g.textBaseline = 'middle';
      for (const e of r.ranked.slice(0, 6)) {
        const q = T(e.b.x, e.b.y), R = e.b.r * v.s, right = q.x < v.w - 70;
        g.textAlign = right ? 'left' : 'right'; const tx = q.x + (right ? R + 7 : -R - 7), tw = g.measureText(cm(e.d)).width;
        g.fillStyle = 'rgba(251,249,241,.85)'; g.fillRect(right ? tx - 2 : tx - tw - 2, q.y - 9, tw + 4, 18);
        g.fillStyle = P.ink; g.fillText(cm(e.d), tx, q.y);
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

  window.SkipPage = { open, done, close };
})();
