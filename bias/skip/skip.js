/* Over to you, skip: the daily puzzle screen.
   bias/index.html loads this on demand (with skip-core.js and skip-sim.js) and calls
   SkipPage.open(). The shot runs on the game's own physics through window.BiasEngine;
   the stars, streaks and events come from skip-core.js. */
(function () {
  'use strict';
  const C = window.SkipCore;
  const HERE = new URL('.', document.currentScript.src).href;
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
  const RULER_SPAN = 3.2;      // metres either side of the jack on the line ruler
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

  let E, Sim, root, $, S = null, puzzles = null, raf = 0, clockTimer = 0, onClose = null, onFullMatch = null;
  const el = (html) => { const t = document.createElement('template'); t.innerHTML = html.trim(); return t.content.firstChild; };
  const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
  const tokens = {};
  const tok = n => tokens[n] || (tokens[n] = getComputedStyle(root).getPropertyValue('--sk-' + n).trim());
  const reduced = () => E.reduced() || matchMedia('(prefers-reduced-motion: reduce)').matches;
  const cm = m => Math.round(m * 100) + ' cm';
  const other = team => team === 'red' ? 'yellow' : 'red';
  const teamOf = (b, pz) => b.kind === 'jack' ? 'jack' : b.owner === Sim.ME ? pz.you : other(pz.you);
  const cap = s => s.charAt(0).toUpperCase() + s.slice(1);

  // ---------- building the screen ----------
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
        <div class="sk-controls" id="skControls">
          <div class="sk-row"><span class="sk-label" id="skHandL">Hand</span>
            <div class="sk-pair" role="group" aria-labelledby="skHandL">
              <button class="sk-opt" id="skFore" aria-pressed="true"><b>Forehand</b><span>key F</span></button>
              <button class="sk-opt" id="skBack" aria-pressed="false"><b>Backhand</b><span>key B</span></button>
            </div></div>
          <div class="sk-row"><span class="sk-label" id="skLineL">Your line<small>your aiming point, level with the jack</small></span>
            <div><div class="sk-line">
              <button class="sk-nudge" id="skAimL" aria-label="Aim further left">‹</button>
              <div class="sk-ruler" id="skRuler" tabindex="0" role="slider" aria-labelledby="skLineL" aria-valuemin="-${RULER_SPAN}" aria-valuemax="${RULER_SPAN}"><canvas id="skRulerCv" aria-hidden="true"></canvas></div>
              <button class="sk-nudge" id="skAimR" aria-label="Aim further right">›</button>
            </div><p class="sk-readout" id="skAimOut"></p></div></div>
          <div class="sk-row"><span class="sk-label" id="skWeightL">Weight<small>hold Play, then let go</small></span>
            <div><div class="sk-meter" id="skMeter" role="meter" aria-labelledby="skWeightL" aria-valuemin="0" aria-valuemax="100" aria-valuenow="0">
              <div class="zone drive"></div><div class="fill" id="skFill"></div>
              <div class="tick" id="skTickAdv" title="The advice"></div><div class="tick last" id="skTickLast" title="Your last shot" hidden></div>
              <span class="zl" style="left:8px">Draw</span><span class="zl" style="left:calc(80% + 8px)">Drive</span>
            </div><p class="sk-readout" id="skWeightOut"></p></div></div>
          <p class="sk-green" id="skGreen"></p>
        </div>
        <div class="sk-actions" id="skActions">
          <button class="sk-enamel" id="skPlay" aria-describedby="skHelp">Play the shot</button>
          <button class="sk-paperbtn" id="skBackBtn">Take it back</button>
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
    $('skFore').onclick = () => setHand('fore');
    $('skBack').onclick = () => setHand('back');
    $('skAimL').onclick = e => nudge(e.shiftKey ? -1 : -0.1);
    $('skAimR').onclick = e => nudge(e.shiftKey ? 1 : 0.1);
    $('skBackBtn').onclick = takeBack;
    const play = $('skPlay');
    play.addEventListener('pointerdown', e => { if (e.button) return; E.Sound.init(); play.setPointerCapture(e.pointerId); startCharge(); });
    play.addEventListener('pointerup', () => releaseCharge());
    play.addEventListener('pointercancel', () => cancelCharge());
    play.addEventListener('click', e => { if (e.detail === 0 && S && S.phase === 'aim') toast('Hold Play the shot (or Space) to build weight, then let go.'); });
    play.addEventListener('contextmenu', e => e.preventDefault());
    const ruler = $('skRuler');
    const fromRuler = e => { const r = ruler.getBoundingClientRect(); setOffset((e.clientX - r.left - r.width / 2) / (r.width / 2) * RULER_SPAN); };
    ruler.addEventListener('pointerdown', e => { if (!canAim()) return; ruler.setPointerCapture(e.pointerId); ruler._drag = true; fromRuler(e); });
    ruler.addEventListener('pointermove', e => { if (ruler._drag && canAim()) fromRuler(e); });
    ruler.addEventListener('pointerup', () => { ruler._drag = false; });
    $('skPlan').addEventListener('pointerdown', () => { if (S && S.phase === 'rolling') S.hurry = true; });
    $('skPlan').addEventListener('pointerup', () => { if (S) S.hurry = false; });
    window.addEventListener('keydown', onKey, true);
    window.addEventListener('keyup', onKeyUp, true);
    window.addEventListener('blur', () => { if (S && S.phase === 'charge') cancelCharge(); });
    new ResizeObserver(() => { if (!root.hidden && S) { sizeCanvases(); draw(); drawRuler(); } }).observe(root);
    $('skHelp').innerHTML = matchMedia('(pointer: coarse)').matches
      ? 'Press and hold <b>Play the shot</b>; let go when the weight is right. Drag the ruler to set your line.'
      : 'Hold <b>Play the shot</b> or <kbd>Space</kbd>, and let go at the weight you want. <kbd>←</kbd> <kbd>→</kbd> move your line (<kbd>Shift</kbd> for bigger steps), <kbd>F</kbd> / <kbd>B</kbd> change hand, <kbd>Esc</kbd> back to the menu.';
  }

  // ---------- opening and closing ----------
  async function open(opts) {
    E = opts.engine; Sim = window.SkipSim.create(E); onClose = opts.close; onFullMatch = opts.fullMatch;
    if (!root) build();
    root.hidden = false; document.body.classList.add('skip-open');
    root.classList.toggle('sk-still', reduced());
    if (!puzzles) {
      try { const r = await fetch(HERE + 'puzzles.json', { cache: 'no-cache' }); if (!r.ok) throw new Error(r.status); puzzles = (await r.json()).puzzles; }
      catch (e) { root.hidden = true; document.body.classList.remove('skip-open'); throw e; }
    }
    start();
    $('skMenu').focus();
  }
  function close() {
    if (!root || root.hidden) return;
    cancelAnimationFrame(raf); raf = 0; clearInterval(clockTimer);
    if (S && S.phase === 'rolling') E.Sound.roll(0);
    root.hidden = true; document.body.classList.remove('skip-open');
    S = null;
    if (onClose) onClose();
  }

  // A fresh look at today's puzzle (also after midnight, when "Open it" is pressed).
  function start() {
    cancelAnimationFrame(raf); raf = 0;
    // ?skipdate=YYYY-MM-DD shows another day's puzzle, on a local server only (for checking puzzles)
    const fake = /^(localhost|127\.0\.0\.1)$/.test(location.hostname) && new URLSearchParams(location.search).get('skipdate');
    const now = Date.now(), date = fake && C.isDate(fake) ? fake : C.londonDate(now), idx = C.puzzleIndex(date, puzzles.length), pz = puzzles[idx];
    const arm = E.Settings.arm === 'L' ? 'L' : 'R';
    if (!pz.bench || pz.bench.head !== C.headHash(pz)) console.warn(`Over to you, skip: "${pz.id}" has changed since it was benchmarked. Run node bias/skip/tools/benchmark.cjs.`);
    let stats = C.loadStats(LS || NOSTORE);
    const dslBefore = C.daysSinceLastPlay(stats, date), returning = !!stats.lastPlayed && stats.lastPlayed !== date;
    const v = C.recordView(stats, date);
    if (v.first) { stats = v.stats; C.saveStats(LS || NOSTORE, stats); Metrics.send('puzzle_viewed', { puzzleId: pz.id, returning, daysSinceLastPlay: dslBefore }); }
    const adv = Sim.shotFor({ hand: pz.advised.hand, aim: pz.advised.aim, weight: pz.advised.weight }, arm);
    S = { pz, date, issue: C.issueNumber(date), arm, stats, phase: 'aim', hand: adv.hand, aim: adv.aim, weight: 0, lastWeight: null,
      advice: adv, advicePath: advicePath(pz, arm), world: Sim.world(pz, arm), trace: [], result: null, hurry: false, savedPct: null };
    S.before = Sim.scoreOf(S.world);
    $('skFresh').hidden = true;
    sizeCanvases();
    paintStatic(); paintControls(); paintNote(); paintBoard(); paintShare(); tickClock();
    clearInterval(clockTimer); clockTimer = setInterval(tickClock, 15000);
    (document.fonts ? document.fonts.load('32px "Reenie Beanie"').then(() => document.fonts.load('italic 15px Newsreader')) : Promise.resolve()).then(() => { draw(); drawRuler(); }, draw);
    draw();
    if (C.playedToday(stats, date)) toast(`You've played today's puzzle (${C.starWords(stats.today.stars)}). Shots now are practice and don't change your stats.`, true);
    Metrics.today().then(t => { if (S && t && t.day === S.date && t.savedPct != null) { S.savedPct = t.savedPct; paintBoard(); } });
  }

  /* The advice drawn into the head. A draw shows where it would stop; a yard on or a drive is
     drawn as far as the bowl it is aimed at, with an arrow, since it is meant to hit something. */
  function advicePath(pz, arm) {
    const p = Sim.lonePath(pz, pz.advised, arm);
    if (pz.advised.kind === 'draw') return p;
    const ty = pz.advised.target.y, pts = [];
    for (const q of p.pts) { pts.push(q); if (q.y >= ty) break; }
    return { pts, state: 'through' };
  }

  // ---------- aiming ----------
  const canAim = () => S && S.phase === 'aim';
  const rel = (hand = S.hand) => E.releasePoint(Sim.matRear(S.pz), hand, S.arm);
  const jackPos = () => S.world.jack ? { x: S.world.jack.x, y: S.world.jack.y } : { x: S.arm === 'L' ? -S.pz.jack.x : S.pz.jack.x, y: S.pz.jack.y };
  function offsetOf(aim, hand) { const r = rel(hand), j = jackPos(); return r.x + Math.tan(aim) * (j.y - r.y) - j.x; }
  function aimFor(off, hand) { const r = rel(hand), j = jackPos(); return Math.atan((j.x + off - r.x) / (j.y - r.y)); }
  function setAim(a) { if (!canAim()) return; S.aim = Math.max(-0.45, Math.min(0.45, a)); paintControls(); draw(); }
  function setOffset(off) { setAim(aimFor(off, S.hand)); }
  function nudge(deg) { setAim(S.aim + deg * DEG); }
  function setHand(h) {
    if (!canAim() || h === S.hand) return;
    const off = offsetOf(S.aim, S.hand);
    S.hand = h; S.aim = aimFor(-off, h);   // the same line mirrored about the jack, as the game flips the aim
    paintControls(); draw();
  }
  function takeBack() {
    if (S.phase === 'done') { practice(); return; }
    if (!canAim()) return;
    S.hand = S.advice.hand; S.aim = S.advice.aim; toast('Back to the advised line.');
    paintControls(); draw();
  }

  // ---------- the swing meter: the game's own, one sweep up and back every 2 × 1.9 s ----------
  function startCharge() {
    if (!canAim()) return;
    S.phase = 'charge'; S.charge = { t0: performance.now() }; S.weight = 0; toast('');
    $('skPlay').classList.add('charging'); $('skPlay').textContent = 'Let go to bowl';
    loop();
  }
  function meterNow() { const u = ((performance.now() - S.charge.t0) / 1000 / E.SWING_T) % 2; return u <= 1 ? u : 2 - u; }
  function releaseCharge() {
    if (!S || S.phase !== 'charge') return;
    const held = (performance.now() - S.charge.t0) / 1000, w = meterNow();
    $('skPlay').classList.remove('charging');
    if (held < 0.12) { cancelCharge('Hold to build weight, then let go.'); return; }
    deliver(w);
  }
  function cancelCharge(msg) {
    if (!S || S.phase !== 'charge') return;
    S.phase = 'aim'; S.charge = null; S.weight = 0; $('skPlay').classList.remove('charging');
    paintControls(); if (msg) toast(msg);
  }

  // ---------- the delivery ----------
  function deliver(weight) {
    S.weight = weight; S.lastWeight = weight; S.phase = 'rolling'; S.charge = null;
    const w = Sim.world(S.pz, S.arm); S.world = w; S.before = Sim.scoreOf(w);
    S.delivered = Sim.launch(w, S.pz, { hand: S.hand, aim: S.aim, weight }, S.arm);
    S.trace = [{ x: S.delivered.x, y: S.delivered.y }]; S.traceAcc = 0; S.acc = 0;
    E.Sound.init(); E.Sound.release();
    paintControls(); toast('');
    if (reduced()) { while (w.anyMoving()) step(); finish(); return; }
    loop();
  }
  function step() {
    const w = S.world, d = S.delivered, DT = E.W.DT;
    w.step(DT);
    S.traceAcc += DT; if (d.state === 'moving' && S.traceAcc >= 0.06) { S.traceAcc = 0; S.trace.push({ x: d.x, y: d.y }); }
  }
  function sounds() {
    for (const e of S.world.events) {
      if (e.type === 'hit' && e.speed >= 0.03) E.Sound.clack(e.speed / 2.5, e.jack);
      else if (e.type === 'ditch') E.Sound.thud(e.speed / 3);
    }
    S.world.events.length = 0;
    E.Sound.roll(S.delivered.state === 'moving' ? S.delivered.speed() / 5 : 0);
  }
  function loop() {
    cancelAnimationFrame(raf);
    let last = performance.now();
    const frame = now => {
      if (!S) return;
      const dt = Math.min(0.1, (now - last) / 1000); last = now;
      if (S.phase === 'charge') { S.weight = meterNow(); paintMeter(); raf = requestAnimationFrame(frame); return; }
      if (S.phase !== 'rolling') return;
      // the long run up the green goes quickly; the last few metres into the head play at life speed
      const v = view(), far = S.delivered.state === 'moving' && S.delivered.y < v.y0 - 1.5;
      S.acc += dt * (far ? 7 : S.hurry ? 4 : 1.25);
      let n = 0; while (S.acc >= E.W.DT && n < 4000) { step(); S.acc -= E.W.DT; n++; }
      sounds(); draw();
      if (!S.world.anyMoving()) { E.Sound.roll(0); finish(); return; }
      raf = requestAnimationFrame(frame);
    };
    raf = requestAnimationFrame(frame);
  }
  function finish() {
    S.trace.push({ x: S.delivered.x, y: S.delivered.y });
    const pz = S.pz, res = Sim.judge(S.world, pz, S.delivered, S.before);
    const bench = pz.bench && pz.bench.values;
    const stars = bench ? C.starsFor(res.value, bench) : FALLBACK[res.outcome];
    const saved = C.isSaved(res.outcome), dsl = C.daysSinceLastPlay(S.stats, S.date);
    const rec = C.recordAttempt(S.stats, S.date, pz.id, { stars, outcome: res.outcome });
    S.stats = rec.stats; C.saveStats(LS || NOSTORE, S.stats);
    if (rec.first) Metrics.send('puzzle_attempted', { puzzleId: pz.id, stars, saved, isFirstAttemptOfDay: true, streak: S.stats.streak, daysSinceLastPlay: dsl });
    else Metrics.send('puzzle_replayed', { puzzleId: pz.id });
    const adv = Sim.play(pz, pz.advised, S.arm);
    S.result = Object.assign(res, { stars, saved, first: rec.first, beat: bench ? Math.round(C.beatShare(res.value, bench) * 100) : null,
      advice: { outcome: adv.outcome, stars: bench ? C.starsFor(adv.value, bench) : FALLBACK[adv.outcome] } });
    S.phase = 'done';
    E.Sound.chime(stars >= 3);
    paintControls(); paintNote(); paintBoard(); paintShare(); draw();
  }
  // Another go at the same head, as practice.
  function practice() {
    S.world = Sim.world(S.pz, S.arm); S.before = Sim.scoreOf(S.world); S.trace = []; S.result = null; S.phase = 'aim'; S.weight = 0;
    paintControls(); paintNote(); paintShare(); draw();
    toast('Practice: today\'s first shot is the one that counts.', true);
    $('skPlay').focus();
  }

  // ---------- keys (captured while the puzzle is open, so the game underneath hears nothing) ----------
  function onKey(e) {
    if (!root || root.hidden || !S) return;
    e.stopImmediatePropagation();
    const t = e.target, onButton = t && t.tagName === 'BUTTON' && t.id !== 'skPlay';
    if (e.key === 'Escape') { e.preventDefault(); if (S.phase === 'charge') cancelCharge('Delivery cancelled.'); else close(); return; }
    if (e.key === ' ' || (e.key === 'Enter' && t && t.id === 'skPlay')) {
      if (onButton || S.phase === 'done') return;   // Space and Enter press the focused button as usual
      e.preventDefault();
      if (S.phase === 'rolling') S.hurry = true;
      else if (!e.repeat && S.phase === 'aim') { E.Sound.init(); startCharge(); }
      return;
    }
    if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') { e.preventDefault(); nudge((e.key === 'ArrowLeft' ? -1 : 1) * (e.shiftKey ? 1 : 0.1)); return; }
    const k = e.key.toLowerCase();
    if (k === 'f' && !e.ctrlKey && !e.metaKey) setHand('fore');
    else if (k === 'b' && !e.ctrlKey && !e.metaKey) setHand('back');
  }
  function onKeyUp(e) {
    if (!root || root.hidden || !S) return;
    e.stopImmediatePropagation();
    if (e.key === ' ' || e.key === 'Enter') { S.hurry = false; if (S.phase === 'charge') { e.preventDefault(); releaseCharge(); } }
  }

  // ---------- painting the page ----------
  function paintStatic() {
    const pz = S.pz, green = E.GreenSpeed.label(pz.greenSpeed).toLowerCase() + ' green';
    $('skMeta').textContent = `No. ${S.issue} · ${pz.advised.hand === 'fore' ? 'forehand' : 'backhand'} advised · ${green}` + (pz.conditions ? ` · ${pz.conditions}` : '');
    $('skAdvice').innerHTML = `<b>${esc(cap(pz.advised.by || 'your third'))}:</b> “${esc(pz.advised.say)}” <button class="sk-linkbtn" id="skTake">Take the advice</button>`;
    $('skTake').onclick = () => { if (canAim()) { S.hand = S.advice.hand; S.aim = S.advice.aim; paintControls(); draw(); toast('Line set to the advice. The weight is up to you.'); } };
    $('skGreen').innerHTML = `<strong>Green:</strong> ${pz.greenSpeed} seconds, ${green}${pz.conditions ? `, ${esc(pz.conditions)}` : ''}. ` +
      (pz.greenSpeed < 12 ? 'A heavy green: every bowl needs more weight.' : pz.greenSpeed > 14 ? 'A fast green: less weight than you think.' : 'A true, even green.');
    $('skTickAdv').style.left = (S.advice.weight * 100) + '%';
  }
  function paintControls() {
    const busy = S.phase === 'rolling', done = S.phase === 'done', aiming = S.phase === 'aim';
    $('skFore').setAttribute('aria-pressed', String(S.hand === 'fore')); $('skBack').setAttribute('aria-pressed', String(S.hand === 'back'));
    for (const id of ['skFore', 'skBack', 'skAimL', 'skAimR']) $(id).disabled = !aiming;
    const off = offsetOf(S.aim, S.hand), side = Math.abs(off) < 0.005 ? 'straight at the jack' : `${(Math.abs(off)).toFixed(2)} m ${off < 0 ? 'left' : 'right'} of the jack`;
    const advOff = offsetOf(S.advice.aim, S.advice.hand);
    $('skAimOut').innerHTML = `<strong>${S.hand === 'fore' ? 'Forehand' : 'Backhand'}, ${side}</strong> (${(Math.abs(S.aim) / DEG).toFixed(1)}° ${S.aim < 0 ? 'left' : 'right'}). Advice: ${S.advice.hand}hand, ${Math.abs(advOff).toFixed(2)} m ${advOff < 0 ? 'left' : 'right'}.`;
    const ruler = $('skRuler');
    ruler.setAttribute('aria-valuenow', off.toFixed(2)); ruler.setAttribute('aria-valuetext', `${S.hand}hand, ${side}`);
    const play = $('skPlay'), back = $('skBackBtn');
    if (done) { play.textContent = 'Play a full match'; play.disabled = false; back.textContent = 'Play it again'; back.disabled = false; }
    else { if (S.phase !== 'charge') play.textContent = 'Play the shot'; play.disabled = busy; back.textContent = 'Take it back'; back.disabled = !aiming; }
    play.onclick = done ? () => { Metrics.send('full_match_clicked', { puzzleId: S.pz.id }); const f = onFullMatch; close(); if (f) f(); } : null;
    paintMeter(); drawRuler();
  }
  function paintMeter() {
    const w = S.phase === 'charge' || S.phase === 'rolling' || S.phase === 'done' ? S.weight : 0, pct = Math.round(w * 100);
    $('skFill').style.width = pct + '%';
    $('skMeter').setAttribute('aria-valuenow', String(pct));
    const lt = $('skTickLast'); lt.hidden = S.lastWeight == null || S.phase === 'charge'; if (S.lastWeight != null) lt.style.left = (S.lastWeight * 100) + '%';
    const adv = Math.round(S.advice.weight * 100);
    $('skWeightOut').innerHTML = S.phase === 'aim' ? `The advice is about <strong>${adv}%</strong> (the blue mark)${S.lastWeight != null ? `; your last shot was ${Math.round(S.lastWeight * 100)}%` : ''}.`
      : `<strong>${pct}%</strong>${w > 0.8 ? ', drive weight' : ''}${S.phase === 'charge' ? '' : ` (advice ${adv}%)`}`;
  }
  function stars(n) {
    const pts = '12,1.8 14.9,8.6 22.2,9.2 16.6,14 18.3,21.2 12,17.4 5.7,21.2 7.4,14 1.8,9.2 9.1,8.6';
    let h = '';
    for (let i = 0; i < 5; i++) {
      const f = Math.max(0, Math.min(1, n - i)), id = 'skh' + i + Math.random().toString(36).slice(2, 6);
      h += `<svg viewBox="0 0 24 24" aria-hidden="true"><defs><clipPath id="${id}"><rect x="0" y="0" width="${12 * 2 * f}" height="24"/></clipPath></defs>` +
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
    const advice = `<p class="sk-small">${esc(cap(pz.advised.by || 'your third'))}'s advice, played perfectly: ${esc(C.outcomeInfo(r.advice.outcome).label.toLowerCase())}, ${C.starWords(r.advice.stars)}.</p>`;
    $('skNote').innerHTML = `<p class="sk-kicker">Skip's verdict</p>${stars(r.stars)}<h2 class="sk-verdict-title">${esc(info.title)}</h2>` +
      `<p>${esc(info.detail)}${beat}</p><p class="sk-hand">${esc(info.scribble)}</p>${counted}${advice}${headList()}`;
  }
  // The final head as a list: who lies where, and how far from the jack.
  function headList() {
    const r = S.result, pz = S.pz;
    if (r.jackDead) return `<p class="sk-small">Dead end: ${esc(r.jackDead.replace(/\.$/, ''))}. Nobody scores.</p>`;
    const rows = r.ranked.slice(0, 6).map((e, i) => `<li><span>${i + 1}. ${cap(teamOf(e.b, pz))}${e.b === S.delivered ? ' (your bowl)' : ''}${e.scores ? ' · scores' : ''}</span><span>${cm(e.d)}</span></li>`).join('');
    return `<ul class="sk-heads" aria-label="The head after your bowl, nearest first">${rows}</ul>`;
  }
  function paintBoard() {
    const st = S.stats, tiles = (n, prev) => String(n).split('').map(d => `<span class="sk-tile${prev != null && prev !== n ? ' flip' : ''}">${d}</span>`).join('');
    const streak = C.currentStreak(st, S.date), best = st.best, prev = S.shown || {};
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
    if (C.londonDate(now) !== S.date && S.phase !== 'rolling' && S.phase !== 'charge') $('skFresh').hidden = false;
  }
  let toastTimer = 0;
  function toast(msg, stay) { clearTimeout(toastTimer); $('skToast').textContent = msg; if (msg && !stay) toastTimer = setTimeout(() => { if ($('skToast')) $('skToast').textContent = ''; }, 5000); }

  // ---------- the plan of the head ----------
  function sizeCanvases() {
    for (const cv of [$('skPlan'), $('skRulerCv')]) {
      const r = cv.getBoundingClientRect(), dpr = Math.min(window.devicePixelRatio || 1, 2);
      cv.width = Math.max(10, Math.round(r.width * dpr)); cv.height = Math.max(10, Math.round(r.height * dpr)); cv._dpr = dpr;
    }
  }
  /* The view: the head at true scale, centred on the bowls and at least 2 m across (a puzzle can set view.w). */
  function view() {
    const cv = $('skPlan'), w = cv.width / cv._dpr, h = cv.height / cv._dpr, m = S.arm === 'L' ? -1 : 1, pz = S.pz;
    const pts = [pz.jack, ...pz.bowls].map(p => ({ x: m * p.x, y: p.y }));
    const x0 = Math.min(...pts.map(p => p.x)), x1 = Math.max(...pts.map(p => p.x)), y0 = Math.min(...pts.map(p => p.y)), y1 = Math.max(...pts.map(p => p.y));
    const aspect = w / h, span = Math.max(pz.view && pz.view.w || (w < 500 ? 1.6 : 2.0), x1 - x0 + 0.7, (y1 - y0 + 0.8) * aspect), s = w / span;
    const cx = (pz.view && pz.view.dx != null) ? m * (pz.jack.x + pz.view.dx) : (x0 + x1) / 2, cy = (y0 + y1) / 2 + 0.08;
    return { w, h, s, cx, cy, y0: cy - h / 2 / s, T: (x, y) => ({ x: w / 2 + (x - cx) * s, y: h / 2 - (y - cy) * s }) };
  }
  function draw() {
    if (!S || !root || root.hidden) return;
    const cv = $('skPlan'), g = cv.getContext('2d'), v = view(), T = v.T, pz = S.pz, m = S.arm === 'L' ? -1 : 1;
    g.setTransform(cv._dpr, 0, 0, cv._dpr, 0, 0);
    const P = { wash: tok('wash'), grid: tok('grid'), bowl: tok('bowl'), red: tok('ring-red'), yellow: tok('ring-yellow'), jack: tok('chalk'), ink: tok('ink'), biro: tok('biro'), muted: tok('muted'), paper: tok('paper') };
    g.fillStyle = P.wash; g.fillRect(0, 0, v.w, v.h);
    // a faint grid of 25 cm squares, lined up on the jack
    const jx = m * pz.jack.x, jy = pz.jack.y, step = 0.25;
    g.strokeStyle = P.grid; g.lineWidth = 1;
    for (let k = Math.floor((v.cx - v.w / v.s / 2 - jx) / step); ; k++) { const x = T(jx + k * step, 0).x; if (x > v.w) break; g.beginPath(); g.moveTo(Math.round(x) + .5, 0); g.lineTo(Math.round(x) + .5, v.h); g.stroke(); }
    for (let k = Math.floor((v.y0 - jy) / step); ; k++) { const y = T(0, jy + k * step).y; if (y < 0) break; g.beginPath(); g.moveTo(0, Math.round(y) + .5); g.lineTo(v.w, Math.round(y) + .5); g.stroke(); }
    const r = b => b.r * v.s;
    const path = (pts, dash, alpha, width) => {
      g.save(); g.globalAlpha = alpha; g.strokeStyle = P.biro; g.lineWidth = width; g.lineCap = 'round'; g.setLineDash(dash);
      g.beginPath(); pts.forEach((p, i) => { const q = T(p.x, p.y); i ? g.lineTo(q.x, q.y) : g.moveTo(q.x, q.y); }); g.stroke(); g.restore();
    };
    // the advice: dashed biro, and where it would stop
    const a = S.advicePath, done = S.phase === 'done', moving = S.phase === 'rolling';
    path(a.pts, [10, 9], done || moving ? 0.28 : 0.5, 3.5);
    if (a.state === 'through' && a.pts.length > 2) {   // an arrowhead where the advice means to strike
      const q1 = T(a.pts[a.pts.length - 1].x, a.pts[a.pts.length - 1].y), q0 = T(a.pts[a.pts.length - 3].x, a.pts[a.pts.length - 3].y), ang = Math.atan2(q1.y - q0.y, q1.x - q0.x);
      g.save(); g.globalAlpha = done || moving ? 0.3 : 0.6; g.fillStyle = P.biro; g.beginPath(); g.moveTo(q1.x + Math.cos(ang) * 4, q1.y + Math.sin(ang) * 4);
      g.lineTo(q1.x + Math.cos(ang + 2.6) * 14, q1.y + Math.sin(ang + 2.6) * 14); g.lineTo(q1.x + Math.cos(ang - 2.6) * 14, q1.y + Math.sin(ang - 2.6) * 14); g.closePath(); g.fill(); g.restore();
    }
    if (a.state === 'rest') { const q = T(a.rest.x, a.rest.y); g.save(); g.globalAlpha = done || moving ? 0.3 : 0.55; g.strokeStyle = P.biro; g.lineWidth = 3; g.setLineDash([5, 4]); g.beginPath(); g.arc(q.x, q.y, E.W.BOWL_R * v.s + 2, 0, Math.PI * 2); g.stroke(); g.restore(); }
    // your bowl's path, solid
    if (S.trace.length > 1) path(S.trace.concat(moving ? [{ x: S.delivered.x, y: S.delivered.y }] : []), [], 0.9, 3.5);
    // bowls: dark brown discs with a coloured ring; dead ones faded
    for (const b of S.world.bodies) {
      if (b.kind !== 'bowl' || b.state === 'ditch') continue;
      const q = T(b.x, b.y), R = r(b), ring = teamOf(b, pz) === 'red' ? P.red : P.yellow;
      if (q.y < -R || q.y > v.h + R) continue;
      g.save(); g.globalAlpha = b.dead ? 0.35 : 1;
      g.fillStyle = P.bowl; g.beginPath(); g.arc(q.x, q.y, R, 0, Math.PI * 2); g.fill();
      g.strokeStyle = 'rgba(0,0,0,.45)'; g.lineWidth = 1.5; g.stroke();
      g.strokeStyle = ring; g.lineWidth = R * 0.26; g.beginPath(); g.arc(q.x, q.y, R * 0.55, 0, Math.PI * 2); g.stroke();
      if (b === S.delivered) { g.strokeStyle = P.biro; g.lineWidth = 3; g.beginPath(); g.arc(q.x, q.y, R + 4, 0, Math.PI * 2); g.stroke(); }
      g.restore();
    }
    // the jack: a white dot with a dark outline
    const J = S.world.jack;
    if (J && J.state !== 'ditch') { const q = T(J.x, J.y); g.fillStyle = P.jack; g.strokeStyle = P.ink; g.lineWidth = 2; g.beginPath(); g.arc(q.x, q.y, Math.max(6, r(J)), 0, Math.PI * 2); g.fill(); g.stroke(); }
    // a bowl still on its way up the green: an arrow on the bottom edge
    if (moving && S.delivered.y < v.y0) {
      const x = Math.max(14, Math.min(v.w - 14, T(S.delivered.x, 0).x));
      g.fillStyle = P.biro; g.beginPath(); g.moveTo(x, v.h - 22); g.lineTo(x - 9, v.h - 8); g.lineTo(x + 9, v.h - 8); g.closePath(); g.fill();
      g.font = 'italic 15px Newsreader, Georgia, serif'; g.textAlign = x > v.w / 2 ? 'right' : 'left';
      g.fillText(`${Math.max(0, J ? J.y - S.delivered.y : 0).toFixed(0)} m to go`, x + (x > v.w / 2 ? -14 : 14), v.h - 10);
    }
    if (!done && !moving) {
      // the handwritten notes on the plan
      g.fillStyle = P.biro; g.textAlign = 'left'; g.textBaseline = 'alphabetic'; g.font = '32px "Reenie Beanie", cursive';
      for (const n of pz.annotations || []) {   // kept inside the plan on a narrow screen
        const q = T(m * (pz.jack.x + n.dx), pz.jack.y + n.dy), tw = g.measureText(n.text).width;
        const x = Math.max(8, Math.min(v.w - tw - 10, q.x)), y = Math.max(30, Math.min(v.h - 10, q.y));
        g.save(); g.translate(x, y); g.rotate((n.rot || -3) * DEG); g.fillText(n.text, 0, 0); g.restore();
      }
    } else if (done) {
      // distances, as a measure reads them
      g.font = 'italic 600 15px Newsreader, Georgia, serif'; g.textBaseline = 'middle';
      for (const e of S.result.ranked.slice(0, 6)) {
        const q = T(e.b.x, e.b.y), R = r(e.b), right = q.x < v.w - 70;
        g.textAlign = right ? 'left' : 'right'; const tx = q.x + (right ? R + 7 : -R - 7);
        g.fillStyle = 'rgba(251,249,241,.85)'; const tw = g.measureText(cm(e.d)).width; g.fillRect(right ? tx - 2 : tx - tw - 2, q.y - 9, tw + 4, 18);
        g.fillStyle = P.ink; g.fillText(cm(e.d), tx, q.y);
      }
    }
    describeHead();
  }
  // The head in words, for screen readers: kept beside the canvas and updated with it.
  function describeHead() {
    if (S.phase === 'rolling') return;
    const pz = S.pz, J = S.world.jack, bits = [];
    const where = b => { const dx = b.x - J.x, dy = b.y - J.y, ud = Math.abs(dy) < 0.05 ? 'level with the jack' : dy < 0 ? `${cm(-dy)} short` : `${cm(dy)} behind`, lr = Math.abs(dx) < 0.05 ? '' : `, ${cm(Math.abs(dx))} to the ${dx < 0 ? 'left' : 'right'}`; return ud + lr; };
    if (J && J.state !== 'ditch') {
      const sc = E.Rules.score(S.world.bodies.filter(b => !b.dead), J);
      for (const e of sc.ranked) bits.push(`${cap(teamOf(e.b, pz))} bowl${e.b === S.delivered ? ' (yours)' : ''}: ${cm(e.d)} from the jack, ${where(e.b)}${e.scores ? ', scoring' : ''}.`);
    }
    const notes = S.phase === 'aim' && pz.annotations && pz.annotations.length ? ` Notes on the plan: ${pz.annotations.map(n => n.text).join('; ')}.` : '';
    $('skHeadText').textContent = `Plan of the head, nearest bowl first. ${bits.join(' ')}${notes} The advised line comes in on the ${pz.advised.hand}hand.`;
  }
  // The line ruler: the jack in the middle, your aiming point and the advice's, in metres either side.
  function drawRuler() {
    const cv = $('skRulerCv'); if (!cv._dpr) return;
    const g = cv.getContext('2d'), w = cv.width / cv._dpr, h = cv.height / cv._dpr, X = off => w / 2 + off / RULER_SPAN * (w / 2 - 12);
    g.setTransform(cv._dpr, 0, 0, cv._dpr, 0, 0); g.clearRect(0, 0, w, h);
    const ink = tok('ink'), biro = tok('biro'), muted = tok('muted'), crimson = tok('crimson'), base = 26;
    g.strokeStyle = ink; g.lineWidth = 2; g.beginPath(); g.moveTo(X(-RULER_SPAN), base); g.lineTo(X(RULER_SPAN), base); g.stroke();
    g.font = 'italic 13px Newsreader, Georgia, serif'; g.textAlign = 'center'; g.fillStyle = muted; g.lineWidth = 1.5;
    for (let k = -6; k <= 6; k++) {
      const x = X(k * 0.5), big = k % 2 === 0;
      g.beginPath(); g.moveTo(x, base - (big ? 9 : 5)); g.lineTo(x, base); g.stroke();
      if (big && k) g.fillText(`${Math.abs(k / 2)} m`, x, base + 16);
    }
    const jx = X(0); g.fillStyle = tok('chalk'); g.strokeStyle = ink; g.lineWidth = 2; g.beginPath(); g.arc(jx, base, 5.5, 0, Math.PI * 2); g.fill(); g.stroke();
    g.fillStyle = muted; g.fillText('jack', jx, base + 16);
    const at = off => X(Math.max(-RULER_SPAN, Math.min(RULER_SPAN, off)));
    const marker = (off, fill, stroke) => {
      const x = at(off);
      g.beginPath(); g.moveTo(x, base - 3); g.lineTo(x - 8, base - 17); g.lineTo(x + 8, base - 17); g.closePath();
      g.lineWidth = 2; if (fill) { g.fillStyle = fill; g.fill(); } g.strokeStyle = stroke; g.stroke();
    };
    const label = (off, text, colour) => {
      const out = Math.abs(off) > RULER_SPAN, t = (out && off < 0 ? '‹ ' : '') + text + (out && off > 0 ? ' ›' : '');
      g.font = '700 14px "Big Shoulders Display", sans-serif'; g.fillStyle = colour; g.textAlign = 'center';
      g.fillText(t, Math.max(34, Math.min(w - 34, at(off))), base + 35);
    };
    const adv = offsetOf(S.advice.aim, S.advice.hand), you = offsetOf(S.aim, S.hand);
    marker(adv, null, biro); marker(you, crimson, crimson);
    if (Math.abs(at(adv) - at(you)) < 70) label(you, Math.abs(adv - you) < 0.01 ? 'YOU = ADVICE' : 'YOU · ADVICE', crimson);
    else { label(adv, 'ADVICE', biro); label(you, 'YOU', crimson); }
  }

  window.SkipPage = { open, close, get open_() { return !!(root && !root.hidden); } };
})();
