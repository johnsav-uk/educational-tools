/* Savage Science Tools — annotation layer.
   A drawing layer over the whole page, for teachers at the board. sst.js
   loads it on every page in visualisations/, so an Explore tool gets it
   without doing anything. A tool that builds its own (a #inkCv canvas) is
   left alone.

   - An Annotate button in the site bar, and a round pen button in the corner
     whenever the bar is hidden (presenter mode, full screen).
   - Pen, highlighter, eraser, undo, clear, colour swatches and a picker, and a
     thickness slider. "Use page" leaves the ink on screen with the page still
     clickable underneath.
   - D toggles it (not while typing), Esc closes the toolbar, Ctrl+Z undoes.
     Closing keeps the ink until Clear.
   - Strokes are stored as points in window coordinates and redrawn on
     resize, so the ink survives going into presenter mode and full screen.
     When one element goes full screen, the layer moves inside it so it still
     shows. */
(function () {
  'use strict';
  if (window.SST_INK) return;
  window.SST_INK = true;

  var COLOURS = ['#ffd84d', '#ff5a5a', '#47b5fa', '#6fe3a3', '#b199f4', '#ffffff', '#000000'];
  function icon(d) { return '<svg viewBox="0 0 24 24" aria-hidden="true">' + d + '</svg>'; }
  var I = {
    pen: icon('<path d="M4 20l1-4.5L16 4.5l3.5 3.5-11 11zM14 7l3 3" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/>'),
    hl: icon('<path d="M5 19.5h14" stroke="currentColor" stroke-width="3" stroke-linecap="round" opacity=".55"/><path d="M8 15l-1.5-3L14 4.5l4 4L10.5 16zM6.5 12L4 16h4" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/>'),
    erase: icon('<path d="M9 20h11M4.5 15.5l9-9 5 5-8.5 8.5H8.5z" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round" stroke-linecap="round"/>'),
    cursor: icon('<path d="M5.5 3.5l13 7-5.5 1.5 3.5 6.5-2.5 1.5-3.5-6.5-4 4z" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/>'),
    undo: icon('<path d="M4.5 12a7.5 7.5 0 1 0 2.2-5.3M4.5 3.5v4h4" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/>'),
    bin: icon('<path d="M4.5 6.5h15M9.5 6.5V4h5v2.5M6.5 6.5l1 13.5h9l1-13.5M10 10.5v6M14 10.5v6" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round" stroke-linecap="round"/>'),
    close: icon('<path d="M6 6l12 12M18 6L6 18" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"/>')
  };

  function start() {
    if (document.getElementById('inkCv')) return;   // the tool has its own

    var cv = document.createElement('canvas');
    cv.className = 'sst-ink'; cv.setAttribute('aria-hidden', 'true');
    var bar = document.createElement('div');
    bar.className = 'sst-inkbar'; bar.hidden = true;
    bar.setAttribute('role', 'toolbar'); bar.setAttribute('aria-label', 'Annotation tools');
    bar.innerHTML =
      '<button type="button" data-tool="cursor" title="Use the page (the ink stays)">' + I.cursor + '<span>Use page</span></button>' +
      '<button type="button" data-tool="pen" title="Pen">' + I.pen + '<span>Pen</span></button>' +
      '<button type="button" data-tool="hl" title="Highlighter">' + I.hl + '<span>Highlight</span></button>' +
      '<button type="button" data-tool="erase" title="Eraser">' + I.erase + '<span>Erase</span></button>' +
      '<span class="sst-ink-sep"></span>' +
      '<span class="sst-ink-sw">' + COLOURS.map(function (c) {
        return '<button type="button" data-c="' + c + '" style="background:' + c + '" aria-label="Colour ' + c + '"></button>';
      }).join('') + '</span>' +
      '<label class="sst-ink-pick" title="Pick any colour"><input type="color" value="#ffd84d" aria-label="Ink colour"></label>' +
      '<label class="sst-ink-size" title="Line thickness"><input type="range" min="1" max="10" value="3" aria-label="Line thickness"></label>' +
      '<span class="sst-ink-sep"></span>' +
      '<button type="button" data-act="undo" title="Undo (Ctrl+Z)">' + I.undo + '<span>Undo</span></button>' +
      '<button type="button" data-act="clear" title="Clear all ink">' + I.bin + '<span>Clear</span></button>' +
      '<button type="button" data-act="close" title="Close the toolbar; the ink stays until Clear (D)">' + I.close + '<span>Close</span></button>';
    var fab = document.createElement('button');
    fab.type = 'button'; fab.className = 'sst-ink-fab'; fab.hidden = true;
    fab.title = 'Annotate (D)'; fab.setAttribute('aria-label', 'Annotate');
    fab.innerHTML = I.pen;
    document.body.appendChild(cv); document.body.appendChild(bar); document.body.appendChild(fab);

    var nav = document.querySelector('.sst-bar .sst-nav'), navBtn = null;
    if (nav) {
      navBtn = document.createElement('button');
      navBtn.type = 'button'; navBtn.className = 'sst-ink-nav'; navBtn.title = 'Draw over the page (D)';
      navBtn.innerHTML = I.pen + 'Annotate';
      nav.insertBefore(navBtn, nav.firstChild);
    }

    var ink = { strokes: [], cur: null, tool: 'pen', color: '#ffd84d', size: 3, open: false };
    var picker = bar.querySelector('input[type=color]'), sizer = bar.querySelector('input[type=range]');

    function resize() {
      var dpr = Math.min(window.devicePixelRatio || 1, 2.5);
      cv.width = Math.max(1, Math.round(innerWidth * dpr)); cv.height = Math.max(1, Math.round(innerHeight * dpr));
      cv.getContext('2d').setTransform(dpr, 0, 0, dpr, 0, 0);
      redraw();
    }
    function redraw() {
      var c = cv.getContext('2d');
      c.clearRect(0, 0, innerWidth, innerHeight);
      ink.strokes.concat(ink.cur ? [ink.cur] : []).forEach(function (s) { paint(c, s); });
    }
    // Each stroke is one path, so a highlighter stays evenly see-through where it crosses itself.
    function paint(c, s) {
      c.save();
      c.lineCap = 'round'; c.lineJoin = 'round';
      c.globalCompositeOperation = s.tool === 'erase' ? 'destination-out' : 'source-over';
      c.globalAlpha = s.tool === 'hl' ? 0.35 : 1;
      c.strokeStyle = s.color; c.fillStyle = s.color;
      c.lineWidth = s.tool === 'pen' ? s.size * 1.4 : s.size * 7;
      var p = s.pts;
      c.beginPath();
      if (p.length === 1) { c.arc(p[0][0], p[0][1], c.lineWidth / 2, 0, 7); c.fill(); }
      else {
        c.moveTo(p[0][0], p[0][1]);
        for (var i = 1; i < p.length - 1; i++) c.quadraticCurveTo(p[i][0], p[i][1], (p[i][0] + p[i + 1][0]) / 2, (p[i][1] + p[i + 1][1]) / 2);
        c.lineTo(p[p.length - 1][0], p[p.length - 1][1]); c.stroke();
      }
      c.restore();
    }
    function setTool(t) {
      ink.tool = t;
      Array.prototype.forEach.call(bar.querySelectorAll('[data-tool]'), function (b) { b.setAttribute('aria-pressed', b.getAttribute('data-tool') === t); });
      document.body.classList.toggle('sst-inking', ink.open && t !== 'cursor');
      document.body.classList.toggle('sst-ink-erase', t === 'erase');
    }
    function setColor(c) {
      ink.color = c; picker.value = c;
      Array.prototype.forEach.call(bar.querySelectorAll('[data-c]'), function (b) { b.setAttribute('aria-pressed', b.getAttribute('data-c') === c); });
      if (ink.tool === 'erase' || ink.tool === 'cursor') setTool('pen');
    }
    function toggle(force) {
      ink.open = force === undefined ? !ink.open : force;
      bar.hidden = !ink.open;
      if (navBtn) navBtn.classList.toggle('is-on', ink.open);
      fab.classList.toggle('is-on', ink.open);
      setTool(ink.open && ink.tool === 'cursor' ? 'pen' : ink.tool);
      if (ink.open) resize();
    }
    function undo() { ink.strokes.pop(); redraw(); }

    bar.addEventListener('click', function (e) {
      var b = e.target.closest('button'); if (!b) return;
      if (b.hasAttribute('data-tool')) setTool(b.getAttribute('data-tool'));
      else if (b.hasAttribute('data-c')) setColor(b.getAttribute('data-c'));
      else if (b.getAttribute('data-act') === 'undo') undo();
      else if (b.getAttribute('data-act') === 'clear') { ink.strokes = []; redraw(); }
      else if (b.getAttribute('data-act') === 'close') toggle(false);
    });
    picker.addEventListener('input', function () { setColor(picker.value); });
    sizer.addEventListener('input', function () { ink.size = +sizer.value; });
    fab.addEventListener('click', function () { toggle(); });
    if (navBtn) navBtn.addEventListener('click', function () { toggle(); });

    cv.addEventListener('pointerdown', function (e) {
      if (ink.tool === 'cursor') return;
      cv.setPointerCapture(e.pointerId);
      ink.cur = { tool: ink.tool, color: ink.color, size: ink.size, pts: [[e.clientX, e.clientY]] };
      redraw();
    });
    cv.addEventListener('pointermove', function (e) {
      if (!ink.cur) return;
      var evs = e.getCoalescedEvents ? e.getCoalescedEvents() : null;
      if (!evs || !evs.length) evs = [e];
      evs.forEach(function (ev) { ink.cur.pts.push([ev.clientX, ev.clientY]); });
      redraw();
    });
    function end() { if (ink.cur) { ink.strokes.push(ink.cur); ink.cur = null; redraw(); } }
    cv.addEventListener('pointerup', end);
    cv.addEventListener('pointercancel', end);

    // Keys are caught before the tool's own handlers, so Esc closes the
    // toolbar rather than leaving presenter mode.
    window.addEventListener('keydown', function (e) {
      var t = e.target, typing = t && t.closest && t.closest('input, textarea, select, [contenteditable=""], [contenteditable="true"]');
      if (ink.open && e.key === 'Escape') { e.preventDefault(); e.stopImmediatePropagation(); toggle(false); return; }
      if (ink.open && (e.ctrlKey || e.metaKey) && !e.shiftKey && (e.key === 'z' || e.key === 'Z') && !typing) { e.preventDefault(); e.stopImmediatePropagation(); undo(); return; }
      if ((e.key === 'd' || e.key === 'D') && !typing && !e.ctrlKey && !e.metaKey && !e.altKey) { e.stopImmediatePropagation(); toggle(); }
    }, true);

    // The corner button stands in for the site bar whenever the bar is out of sight.
    function place() {
      var host = document.fullscreenElement && document.fullscreenElement !== document.documentElement ? document.fullscreenElement : document.body;
      [cv, bar, fab].forEach(function (el) { if (el.parentNode !== host) host.appendChild(el); });
      var sb = document.querySelector('.sst-bar');
      var barShown = sb && sb.offsetParent !== null && host === document.body && !document.body.classList.contains('presenting');
      fab.hidden = !!barShown;
      resize();
    }
    new MutationObserver(function () { setTimeout(place, 0); }).observe(document.body, { attributes: true, attributeFilter: ['class'] });
    document.addEventListener('fullscreenchange', function () { setTimeout(place, 50); });
    window.addEventListener('resize', resize);

    setColor(ink.color); setTool('pen');
    place();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start);
  else start();
})();
