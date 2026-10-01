/* The Evolution of the Earth's Atmosphere: APP
   Wires the timeline to everything else. One function, setS(), moves the whole
   tool: scene, charts, sound, caption, equations. Sections: timeline UI, caption,
   2D fallback, controls, boot. */
(function () {
  'use strict';
  var AE = window.AE, D = AE.DATA;
  var $ = function (id) { return document.getElementById(id); };
  var reduced = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;

  var state = { s: 0, v: null, playing: false, speed: 1, tween: null, phase: -1, webgl: false };
  var PLAY_SECONDS = 60;                 // one full run at 1×

  /* ═══════════ TIMELINE UI ═══════════ */
  var slider = $('slider'), track = $('track'), fill = $('fill'), thumb = $('thumb');
  var msS = D.MILESTONES.map(function (m) { return m.key / (D.KEYS.length - 1); });

  function buildTimeline() {
    var n = D.NODES.length - 1, segs = $('segs'), marks = $('marks'), list = $('msList'), i;
    /* the five equal-width sections, each labelled with the span of time it holds */
    for (i = 0; i < n; i++) {
      var span = D.NODES[i] - D.NODES[i + 1], d = document.createElement('div');
      d.className = 'seg';
      d.innerHTML = '<span>' + (span >= 0.995 ? span.toFixed(1) + ' bn yrs' : Math.round(span * 1000) + 'M yrs') + '</span>';
      segs.appendChild(d);
    }
    D.MILESTONES.forEach(function (m, k) {
      var dot = document.createElement('button');
      dot.type = 'button'; dot.className = 'mark'; dot.tabIndex = -1; dot.style.left = (msS[k] * 100) + '%';
      dot.setAttribute('aria-hidden', 'true'); dot.dataset.k = k;
      marks.appendChild(dot);
      dot.parentNode.style.pointerEvents = 'none'; dot.style.pointerEvents = 'auto';
      dot.addEventListener('click', function (e) { e.stopPropagation(); goMilestone(k); });
      dot.addEventListener('pointerdown', function (e) { e.stopPropagation(); });

      var li = document.createElement('li'), b = document.createElement('button');
      b.type = 'button'; b.dataset.k = k;
      b.innerHTML = '<span class="ms-when">' + m.when + '</span><span class="ms-name">' + m.label + '</span>';
      b.title = m.text;
      b.addEventListener('click', function () { goMilestone(k); });
      li.appendChild(b); list.appendChild(li);
    });
    /* axis labels under the track, in billions of years ago */
  }

  function clamp(x) { return Math.min(1, Math.max(0, x)); }
  function nearestMilestone(s) {
    var best = 0, bd = 9;
    msS.forEach(function (x, k) { var d = Math.abs(x - s); if (d < bd) { bd = d; best = k; } });
    return { k: best, d: bd };
  }

  /* ═══════════ THE ONE UPDATE ═══════════ */
  function setS(s) {
    s = clamp(s); state.s = s;
    var v = state.v = AE.interp(s);
    AE.Scene.update(v);
    AE.Charts.update(v);
    AE.Audio.update(v);
    if (state.fallback) drawFallback(v);

    var pct = s * 100;
    thumb.style.left = pct + '%'; fill.style.width = pct + '%';
    var txt = D.formatBya(v.bya);
    slider.setAttribute('aria-valuenow', pct.toFixed(1));
    slider.setAttribute('aria-valuetext', txt);
    $('tlTime').textContent = txt; $('hudTime').textContent = txt;
    $('tlMs').textContent = v.bya < 0.005 ? 'now' : Math.round(v.bya * 1000).toLocaleString('en-GB') + ' million years ago';

    var near = nearestMilestone(s), atMs = near.d < 0.012;
    document.querySelectorAll('#msList button').forEach(function (b) { b.classList.toggle('on', atMs && +b.dataset.k === near.k); b.setAttribute('aria-current', atMs && +b.dataset.k === near.k ? 'true' : 'false'); });
    document.querySelectorAll('#marks .mark').forEach(function (b) { b.classList.toggle('on', atMs && +b.dataset.k === near.k); });
    $('hudPhase').textContent = D.PHASES[v.phase].title;
    showCaption(v, near);
    AE.Exam.setPhase(v.phase);
  }

  var lastCap = '';
  function showCaption(v, near) {
    var ph = D.PHASES[v.phase], ms = near.d < 0.03 ? D.MILESTONES[near.k] : null;
    var key = v.phase + '|' + (ms ? near.k : -1);
    if (key === lastCap) return; lastCap = key;
    $('capTitle').innerHTML = ph.title + ' <span class="spec">AQA ' + ph.spec + '</span>';
    var msEl = $('capMs'); msEl.hidden = !ms;
    if (ms) msEl.innerHTML = '<strong>' + ms.when + '</strong>: ' + AE.Exam.glossify(ms.text);
    $('capWhat').innerHTML = AE.Exam.glossify(ph.what);
    $('capWhy').innerHTML = AE.Exam.glossify(ph.why);
  }

  /* ═══════════ MOVING THE SLIDER: drag, keys, tween, play ═══════════ */
  function fromPointer(e) {
    var r = track.getBoundingClientRect();
    return clamp((e.clientX - r.left) / r.width);
  }
  var dragging = false;
  slider.addEventListener('pointerdown', function (e) {
    if (e.button !== undefined && e.button > 0) return;
    dragging = true; stopPlay(); state.tween = null;
    slider.setPointerCapture(e.pointerId); slider.focus({ preventScroll: true });
    setS(fromPointer(e)); e.preventDefault();
  });
  slider.addEventListener('pointermove', function (e) { if (dragging) setS(fromPointer(e)); });
  ['pointerup', 'pointercancel', 'lostpointercapture'].forEach(function (t) { slider.addEventListener(t, function () { dragging = false; }); });

  function stepMilestone(dir) {
    stopPlay();
    var s = state.s, i, target = null;
    if (dir > 0) { for (i = 0; i < msS.length; i++) if (msS[i] > s + 0.004) { target = msS[i]; break; } if (target === null) target = 1; }
    else { for (i = msS.length - 1; i >= 0; i--) if (msS[i] < s - 0.004) { target = msS[i]; break; } if (target === null) target = 0; }
    tweenTo(target);
  }
  function goMilestone(k) { stopPlay(); tweenTo(msS[k]); }
  slider.addEventListener('keydown', function (e) {
    var fine = e.shiftKey ? 0.01 : 0, handled = true;
    if (e.key === 'ArrowRight' || e.key === 'ArrowUp') { if (fine) { stopPlay(); setS(state.s + fine); } else stepMilestone(1); }
    else if (e.key === 'ArrowLeft' || e.key === 'ArrowDown') { if (fine) { stopPlay(); setS(state.s - fine); } else stepMilestone(-1); }
    else if (e.key === 'Home') { stopPlay(); tweenTo(0); }
    else if (e.key === 'End') { stopPlay(); tweenTo(1); }
    else if (e.key === 'PageUp') stepMilestone(1);
    else if (e.key === 'PageDown') stepMilestone(-1);
    else handled = false;
    if (handled) e.preventDefault();
  });
  $('btnPrev').addEventListener('click', function () { stepMilestone(-1); });
  $('btnNext').addEventListener('click', function () { stepMilestone(1); });

  function tweenTo(target) {
    if (reduced) { state.tween = null; setS(target); return; }
    state.tween = { from: state.s, to: target, t: 0, dur: Math.min(1.4, 0.5 + Math.abs(target - state.s) * 2.2) };
  }

  function setPlaying(on) {
    state.playing = on;
    var b = $('btnPlay');
    b.setAttribute('aria-label', on ? 'Pause' : (state.s >= 1 ? 'Replay' : 'Play'));
    b.querySelector('use').setAttribute('href', on ? '#i-pause' : '#i-play');
    b.querySelector('span').textContent = on ? 'Pause' : (state.s >= 1 ? 'Replay' : 'Play');
  }
  function stopPlay() { if (state.playing) setPlaying(false); }
  $('btnPlay').addEventListener('click', function () {
    if (state.playing) { setPlaying(false); return; }
    state.tween = null;
    if (state.s >= 0.999) setS(0);
    setPlaying(true);
  });
  $('selSpeed').addEventListener('change', function (e) { state.speed = parseFloat(e.target.value); });

  var last = 0;
  function tick(now) {
    requestAnimationFrame(tick);
    var dt = Math.min(0.1, (now - last) / 1000); last = now;
    if (state.tween) {
      var t = state.tween; t.t += dt / t.dur;
      var e = t.t >= 1 ? 1 : t.t * t.t * (3 - 2 * t.t);
      setS(t.from + (t.to - t.from) * e);
      if (t.t >= 1) state.tween = null;
    } else if (state.playing) {
      var ns = state.s + dt * state.speed / PLAY_SECONDS;
      if (ns >= 1) { setS(1); setPlaying(false); } else setS(ns);
    }
  }

  /* ═══════════ 2D FALLBACK (no WebGL) ═══════════ */
  var fcv = $('fallback2d'), fctx = null;
  function drawFallback(v) {
    var box = $('sceneBox'), W = box.clientWidth, H = box.clientHeight, dpr = Math.min(2, window.devicePixelRatio || 1);
    if (!W || !H) return;
    if (fcv.width !== Math.round(W * dpr)) { fcv.width = Math.round(W * dpr); fcv.height = Math.round(H * dpr); }
    var g = fctx = fctx || fcv.getContext('2d'); g.setTransform(dpr, 0, 0, dpr, 0, 0);
    var rgb = function (c, k) { k = k || 1; return 'rgb(' + Math.round(Math.min(1, c[0] * k) * 255) + ',' + Math.round(Math.min(1, c[1] * k) * 255) + ',' + Math.round(Math.min(1, c[2] * k) * 255) + ')'; };
    var hor = H * 0.68, cx = W * 0.5, i;
    var sk = g.createLinearGradient(0, 0, 0, hor); sk.addColorStop(0, rgb(v.skyTop)); sk.addColorStop(1, rgb(v.skyHor));
    g.fillStyle = sk; g.fillRect(0, 0, W, H);
    if (v.stars > 0.05) { g.fillStyle = 'rgba(255,255,255,' + (v.stars * 0.8) + ')'; for (i = 0; i < 60; i++) g.fillRect((i * 97.3) % W, (i * 53.1) % (hor * 0.7), 1.6, 1.6); }
    g.fillStyle = 'rgba(225,222,215,0.9)'; g.beginPath(); g.arc(W * 0.16, H * 0.2, 14, 0, 7); g.fill();
    var sea = g.createLinearGradient(0, hor, 0, H); sea.addColorStop(0, rgb(v.oceanShallow)); sea.addColorStop(1, rgb(v.oceanDeep));
    g.fillStyle = v.ocean > 0.05 ? sea : '#2a1510'; g.fillRect(0, hor, W, H - hor);
    if (v.ocean < 0.95) { g.fillStyle = 'rgba(255,90,20,' + (0.5 * (1 - v.ocean) * v.lava) + ')'; g.fillRect(0, hor, W, H - hor); }
    /* island: a volcano in the first billion years, low land after */
    var vh = H * (0.1 + 0.26 * v.relief), bw = W * 0.36, top = 18 + (1 - v.relief) * bw * 0.5;
    g.fillStyle = '#2b2522'; g.beginPath(); g.moveTo(cx - bw, hor + 6); g.lineTo(cx - top, hor - vh); g.lineTo(cx + top, hor - vh); g.lineTo(cx + bw, hor + 6); g.closePath(); g.fill();
    g.fillStyle = 'rgba(40,110,40,' + Math.min(0.9, v.veg) + ')'; g.beginPath(); g.moveTo(cx - bw, hor + 6); g.lineTo(cx - bw * 0.55, hor - vh * 0.35); g.lineTo(cx + bw * 0.55, hor - vh * 0.35); g.lineTo(cx + bw, hor + 6); g.closePath(); g.fill();
    if (v.lava > 0.05) { g.fillStyle = 'rgba(255,120,30,' + v.lava + ')'; g.fillRect(cx - 18, hor - vh - 2, 36, 5); g.fillRect(cx - 4, hor - vh, 8, vh * 0.5 * v.lava); }
    /* plume */
    for (i = 0; i < 26 * v.volcano; i++) {
      var t = i / 26, px = cx + Math.sin(i * 2.3) * (10 + t * 80), py = hor - vh - t * H * 0.42 * v.volcano;
      g.fillStyle = 'rgba(' + (40 + t * 90) + ',' + (36 + t * 85) + ',' + (34 + t * 85) + ',' + (0.55 - t * 0.3) + ')';
      g.beginPath(); g.arc(px, py, 10 + t * 38, 0, 7); g.fill();
    }
    for (i = 0; i < 18 * v.veg; i++) { g.fillStyle = '#2f7a35'; var tx = cx - bw * 0.7 + (i * 53 % (bw * 1.4)), ty = hor - 4 - (i % 3) * 6; g.beginPath(); g.moveTo(tx, ty - 16); g.lineTo(tx - 7, ty); g.lineTo(tx + 7, ty); g.fill(); }
    for (i = 0; i < 9 * v.algae; i++) { g.fillStyle = '#4f8d3f'; g.beginPath(); g.ellipse(cx + bw + 20 + i * 18, hor + 14 + (i % 3) * 8, 11, 5, 0, 0, 7); g.fill(); }
    for (i = 0; i < 6 * v.clouds; i++) { g.fillStyle = 'rgba(' + (250 - v.ash * 190) + ',' + (250 - v.ash * 190) + ',' + (250 - v.ash * 195) + ',0.55)'; g.beginPath(); g.ellipse(W * (0.15 + i * 0.16), H * (0.16 + (i % 2) * 0.1), 50, 14, 0, 0, 7); g.fill(); }
  }
  function useFallback(why) {
    state.fallback = true;
    $('glcanvas').hidden = true; fcv.hidden = false;
    var msg = $('sceneMsg'); msg.hidden = false;
    msg.textContent = why === 'lost' ? 'The 3D view stopped (the graphics driver reset). Showing a simple picture instead. Reload the page to try 3D again.'
      : '3D graphics are not available on this device, so here is a simple picture instead. Everything else works as normal.';
    ['btnLabels', 'btnCut', 'btnRotate', 'btnReset', 'selQuality'].forEach(function (id) { $(id).disabled = true; });
    if (state.v) drawFallback(state.v);
  }
  new ResizeObserver(function () { if (state.fallback && state.v) drawFallback(state.v); }).observe($('sceneBox'));

  /* ═══════════ SCENE CONTROLS ═══════════ */
  function toggleBtn(id, cb) {
    var b = $(id);
    b.addEventListener('click', function () { var on = b.getAttribute('aria-pressed') !== 'true'; b.setAttribute('aria-pressed', on); cb(on); });
  }
  toggleBtn('btnLabels', function (on) { AE.Scene.setLabels(on); });
  toggleBtn('btnCut', function (on) { AE.Scene.setView(on ? 'cutaway' : 'island'); $('sceneBox').classList.toggle('is-cutaway', on); });
  toggleBtn('btnRotate', function (on) { AE.Scene.setAutoRotate(on); });
  $('btnReset').addEventListener('click', function () { AE.Scene.resetCamera(); });

  $('btnSound').addEventListener('click', function () {
    var on = AE.Audio.toggle();
    this.setAttribute('aria-pressed', on);
    this.querySelector('use').setAttribute('href', on ? '#i-vol' : '#i-mute');
    this.querySelector('span').textContent = on ? 'Sound on' : 'Sound off';
  });

  $('selQuality').addEventListener('change', function (e) {
    var v = e.target.value;
    if (v === 'auto') AE.Scene.setAuto(true); else AE.Scene.setQuality(v);
    $('qNote').textContent = '';
  });

  /* ═══════════ BOOT ═══════════ */
  function boot() {
    buildTimeline();
    AE.Charts.init({ doughnut: $('cvDonut'), line: $('cvLine'), gauges: $('gauges'), summary: $('chartSummary') });
    AE.Exam.init();
    AE.Print.init();

    var ok = false;
    try { ok = !/[?&]no3d/.test(location.search) && AE.Scene.init($('sceneBox'), $('glcanvas'), $('sceneLabels')); } catch (err) { if (window.console) console.warn('3D scene failed to start:', err); ok = false; }
    state.webgl = ok;
    if (ok) {
      AE.Scene.onFallback(useFallback);
      AE.Scene.onQuality(function (q) {
        $('qNote').textContent = 'Auto quality lowered to ' + q + ' to keep it smooth.';
        $('selQuality').value = 'auto';
      });
    } else useFallback();

    setS(0);
    requestAnimationFrame(function (t) { last = t; tick(t); });

    /* presenter mode (assets/sst/presenter.js): scene left, charts right, timeline in the column, caption as slides */
    if (window.SST_PRESENTER) {
      SST_PRESENTER.setup({
        stage: ['#sceneCard', '#liveCard'], ratio: 0.6,
        side: '#timelineCard', notes: '#captionCard', hide: '#exam'
      });
    }
    new MutationObserver(function () {
      var pres = document.body.classList.contains('sst-pres');
      AE.Charts.setFont(pres && window.SST_PRESENT ? SST_PRESENT.px('--sst-pr-label') : 11);
    }).observe(document.body, { attributes: true, attributeFilter: ['class'] });
    /* a link like #t=2.7 jumps to that time (for bookmarks and QR codes) */
    var m = /t=([\d.]+)/.exec(location.hash);
    if (m) setS(D.posOf(parseFloat(m[1])));
  }
  boot();

  AE.app = { setS: setS, state: state, stopPlay: stopPlay };
})();
