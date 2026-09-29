/* Savage Science Tools — shared presenter mode.
   For Explore tools that don't build their own. The tool keeps its page as it
   is; in presenter mode its model is laid out large on the board, the
   teacher's controls sit in a column beside it, and the explanation text
   becomes slides in a caption band at the site's presenter sizes
   (--sst-pr-* in sst.css), split to fit rather than shrunk.

   Load after sst.js and present.js, then describe the page:

     <script src="../../assets/sst/present.js"></script>
     <script src="../../assets/sst/presenter.js"></script>
     <script>
       SST_PRESENTER.setup({
         stage: '#viewport',                 // the model: one element, or a list
         side:  '.controls',                  // optional: the teacher's controls
         notes: ['.explain', '#card'],        // optional: text to show as slides
         hide:  '.quiz',                      // optional: never shown on the board
         rows:  true, ratio: 0.65             // optional: with several stage elements,
       });                                    //   the model on top (rows) or left, and its share
     </script>

   Each entry is a selector, an element, a list of either, or a function
   returning them, read when presenter mode opens, so React pages can be
   described before they render. Nothing is moved: the chosen elements are
   pinned in place (position: fixed) over the board layout and everything
   else is hidden, so a React or three.js app keeps working. Notes are copied
   into the slides and re-copied as the tool changes them.

   Opens from Present in the site bar or P; Exit, or Esc, leaves. Quizzes and
   question sections are left off the board. */
(function () {
  'use strict';
  if (window.SST_PRESENTER) return;

  var lastNotes = '', cfg = null, on = false, pinned = [], unlocked = [], watch = null, refillTimer = 0;
  var top, deck, navBtn;

  function list(x) {
    if (!x) return [];
    if (typeof x === 'function') x = x();
    if (!x) return [];
    if (typeof x === 'string') return Array.prototype.slice.call(document.querySelectorAll(x));
    if (x.nodeType) return [x];
    var out = [];
    Array.prototype.forEach.call(x, function (y) { out = out.concat(list(y)); });
    return out.filter(function (e, i) { return e && out.indexOf(e) === i; });
  }

  function title() {
    var t = document.querySelector('.sst-crumb span');
    return (t && t.textContent) || document.title.split(/\s[—|–-]\s/)[0];
  }

  function chrome() {
    top = document.createElement('div');
    top.className = 'sst-pres-top sst-teacher';
    top.innerHTML = '<span class="sst-pres-title"></span>' +
      '<span class="sst-pres-keys">P or Esc to leave · D to annotate</span>' +
      '<button type="button" class="sst-pres-full" title="Full screen">Full screen</button>' +
      '<button type="button" class="sst-pres-exit" title="Leave presenter mode (Esc)">Exit</button>';
    top.querySelector('.sst-pres-title').textContent = title();
    top.querySelector('.sst-pres-exit').addEventListener('click', function () { toggle(false); });
    top.querySelector('.sst-pres-full').addEventListener('click', function () {
      if (document.fullscreenElement) document.exitFullscreen().catch(function () {});
      else if (document.documentElement.requestFullscreen) document.documentElement.requestFullscreen().catch(function () {});
    });
    deck = document.createElement('div');
    deck.className = 'sst-deck sst-deck--strip sst-pres-deck';
    deck.setAttribute('aria-label', 'Slides'); deck.setAttribute('aria-live', 'polite');
    document.body.appendChild(top); document.body.appendChild(deck);
  }

  // Fixed positioning escapes to the viewport unless an ancestor has a
  // transform, filter or backdrop blur, or an animation (a fade-in) that
  // moves it: switch those off while presenting.
  function unlock(el) {
    for (var a = el.parentElement; a && a !== document.documentElement; a = a.parentElement) {
      var cs = getComputedStyle(a);
      if (cs.transform !== 'none' || cs.filter !== 'none' || (cs.backdropFilter && cs.backdropFilter !== 'none') ||
          (cs.webkitBackdropFilter && cs.webkitBackdropFilter !== 'none') || /paint|layout|strict|content/.test(cs.contain) || /transform|filter/.test(cs.willChange) || cs.animationName !== 'none') {
        if (unlocked.some(function (u) { return u[0] === a; })) continue;
        unlocked.push([a, a.getAttribute('style')]);
        a.style.setProperty('transform', 'none', 'important');
        a.style.setProperty('filter', 'none', 'important');
        a.style.setProperty('backdrop-filter', 'none', 'important');
        a.style.setProperty('-webkit-backdrop-filter', 'none', 'important');
        a.style.setProperty('contain', 'none', 'important');
        a.style.setProperty('will-change', 'auto', 'important');
        a.style.setProperty('animation', 'none', 'important');
      }
    }
  }

  function pin(el, box, scroll) {
    if (!pinned.some(function (p) { return p[0] === el; })) { pinned.push([el, el.getAttribute('style')]); unlock(el); }
    el.classList.add('sst-pres-pin');
    var s = el.style;
    s.setProperty('transition', 'none', 'important');   // no sliding into place
    s.setProperty('position', 'fixed', 'important');
    s.setProperty('left', box.x + 'px', 'important');
    s.setProperty('top', box.y + 'px', 'important');
    s.setProperty('width', box.w + 'px', 'important');
    s.setProperty('height', box.h + 'px', 'important');
    s.setProperty('max-width', 'none', 'important');
    s.setProperty('max-height', 'none', 'important');
    s.setProperty('min-height', '0', 'important');
    s.setProperty('margin', '0', 'important');
    s.setProperty('box-sizing', 'border-box', 'important');
    s.setProperty('z-index', '2147482500', 'important');
    s.setProperty('overflow', scroll ? 'auto' : 'hidden', 'important');
  }

  function unpin(p) {
    if (p[1] === null) p[0].removeAttribute('style'); else p[0].setAttribute('style', p[1]);
    p[0].classList.remove('sst-pres-pin');
  }

  function layout() {
    if (!on) return;
    var W = innerWidth, H = innerHeight, g = Math.max(10, Math.round(W * 0.008));
    var th = top.offsetHeight, stage = list(cfg.stage), side = list(cfg.side), hasNotes = deck.classList.contains('has-slides');
    // A tool that swaps its content (a new tab, say) gets the new elements pinned and the old let go.
    var keep = stage.concat(side);
    pinned = pinned.filter(function (p) { if (keep.indexOf(p[0]) === -1) { unpin(p); return false; } return true; });
    list(cfg.hide).forEach(function (el) { el.classList.add('sst-pres-off'); });
    var sideW = side.length ? Math.round(Math.min(440, Math.max(290, W * 0.24))) : 0;
    var dh = hasNotes ? deck.offsetHeight : 0;
    var x0 = g, y0 = th + g, x1 = W - g - (sideW ? sideW + g : 0), y1 = H - g - (dh ? dh + g : 0);
    deck.style.left = x0 + 'px'; deck.style.width = (x1 - x0) + 'px'; deck.style.bottom = g + 'px';
    if (stage.length === 1) pin(stage[0], { x: x0, y: y0, w: x1 - x0, h: y1 - y0 });
    else if (stage.length > 1) {
      // The first element is the model, taking cfg.ratio of the space; the
      // others share the rest, beside it or (rows) below it.
      var ratio = cfg.ratio || 0.6, rest = stage.length - 1;
      if (cfg.rows) {
        var mh = Math.round((y1 - y0) * ratio), rw = (x1 - x0 - g * (rest - 1)) / rest;
        pin(stage[0], { x: x0, y: y0, w: x1 - x0, h: mh });
        stage.slice(1).forEach(function (el, i) { pin(el, { x: x0 + i * (rw + g), y: y0 + mh + g, w: rw, h: y1 - y0 - mh - g }); });
      } else {
        var mw = Math.round((x1 - x0) * ratio), rh = (y1 - y0 - g * (rest - 1)) / rest;
        pin(stage[0], { x: x0, y: y0, w: mw, h: y1 - y0 });
        stage.slice(1).forEach(function (el, i) { pin(el, { x: x0 + mw + g, y: y0 + i * (rh + g), w: x1 - x0 - mw - g, h: rh }); });
      }
    }
    if (side.length) {
      // Stacked down the column: each at its own height, the last taking what's left.
      var y = th + g, bottom = H - g;
      side.forEach(function (el, i) {
        var last = i === side.length - 1, h;
        if (last) h = bottom - y;
        else {
          pin(el, { x: W - g - sideW, y: y, w: sideW, h: 10 }, true);
          el.style.setProperty('height', 'auto', 'important');
          h = Math.min(el.offsetHeight, (bottom - y) / 2);
        }
        pin(el, { x: W - g - sideW, y: y, w: sideW, h: h }, true);
        y += h + g;
      });
    }
  }

  // Notes become slides: headings head the slides that follow them.
  function refill() {
    var blocks = [], cur = null;
    list(cfg.notes).forEach(function (el) {
      var walker = document.createTreeWalker(el, NodeFilter.SHOW_ELEMENT, {
        acceptNode: function (n) {
          if (n.closest('button, select, input, label, svg, canvas, table, [hidden], .sst-teacher') || !n.offsetParent && n.offsetWidth === 0) return NodeFilter.FILTER_REJECT;
          return /^(H[1-6]|P|LI|DT|DD|FIGCAPTION|BLOCKQUOTE)$/.test(n.tagName) ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_SKIP;
        }
      });
      for (var n = walker.nextNode(); n; n = walker.nextNode()) {
        var html = n.innerHTML.replace(/\s+/g, ' ').trim(), text = n.textContent.trim();
        if (!text) continue;
        if (/^H/.test(n.tagName)) { cur = { head: '<h3>' + html + '</h3>', body: [] }; blocks.push(cur); continue; }
        if (!cur) { cur = { head: '', body: [] }; blocks.push(cur); }
        cur.body.push('<p>' + html + '</p>');
      }
    });
    blocks = blocks.filter(function (b) { return b.body.length; });
    var key = JSON.stringify(blocks);
    if (key === lastNotes) return;
    lastNotes = key;
    // Lay the board out first, so the slides are measured at the band's real width.
    var had = deck.classList.contains('has-slides');
    deck.classList.toggle('has-slides', blocks.length > 0);
    if (had !== blocks.length > 0 || !deck.style.width) layout();
    if (blocks.length) SST_PRESENT.fill(deck, blocks);
  }

  function toggle(force) {
    if (!cfg) return;
    var want = force === undefined ? !on : force;
    if (want === on) return;
    on = want;
    if (on) {
      scrollTo(0, 0);
      document.body.classList.add('presenting', 'sst-pres');
      list(cfg.hide).forEach(function (el) { el.classList.add('sst-pres-off'); });
      top.hidden = false; deck.hidden = false;
      lastNotes = '';
      refill();
      layout();
      // Re-read the notes and re-pin as the tool changes: new slides, a new tab.
      watch = new MutationObserver(function (recs) {
        if (recs.every(function (r) { return r.target.closest && r.target.closest('.sst-pres-deck, .sst-pres-top, .sst-ink, .sst-inkbar'); })) return;
        // Throttled rather than debounced: a live readout changes every frame.
        if (!refillTimer) refillTimer = setTimeout(function () { refillTimer = 0; refill(); layout(); }, 250);
      });
      watch.observe(document.body, { childList: true, subtree: true, characterData: true });
      if (navBtn) navBtn.classList.add('is-on');
      top.querySelector('.sst-pres-exit').focus({ preventScroll: true });
    } else {
      if (watch) watch.disconnect();
      document.body.classList.remove('presenting', 'sst-pres');
      pinned.forEach(unpin);
      unlocked.forEach(function (u) { if (u[1] === null) u[0].removeAttribute('style'); else u[0].setAttribute('style', u[1]); });
      pinned = []; unlocked = [];
      Array.prototype.forEach.call(document.querySelectorAll('.sst-pres-off'), function (el) { el.classList.remove('sst-pres-off'); });
      top.hidden = true; deck.hidden = true;
      if (document.fullscreenElement) document.exitFullscreen().catch(function () {});
      if (navBtn) navBtn.classList.remove('is-on');
    }
    // Canvases and three.js renderers size themselves on resize.
    setTimeout(function () { window.dispatchEvent(new Event('resize')); }, 30);
  }

  function setup(options) {
    cfg = options;
    function ready() {
      chrome(); top.hidden = true; deck.hidden = true;
      var nav = document.querySelector('.sst-bar .sst-nav');
      if (nav) {
        navBtn = document.createElement('button');
        navBtn.type = 'button'; navBtn.className = 'sst-ink-nav sst-pres-nav'; navBtn.title = 'Presenter mode: the model on the board (P)';
        navBtn.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 4.5h18v12H3zM8.5 20.5h7M12 16.5v4" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round" stroke-linecap="round"/></svg>Present';
        nav.insertBefore(navBtn, nav.firstChild);
        navBtn.addEventListener('click', function () { toggle(); });
      }
      var t = 0;
      window.addEventListener('resize', function () {
        if (!on) return;
        clearTimeout(t);
        t = setTimeout(function () { layout(); if (deck.sstBlocks) SST_PRESENT.fill(deck, deck.sstBlocks); }, 60);
      });
      window.addEventListener('keydown', function (e) {
        var tg = e.target, typing = tg && tg.closest && tg.closest('input, textarea, select, [contenteditable=""], [contenteditable="true"]');
        if (typing || e.ctrlKey || e.metaKey || e.altKey) return;
        if (e.key === 'p' || e.key === 'P') { e.stopImmediatePropagation(); toggle(); }
        // Esc closes the annotation toolbar first, if it's open.
        else if (e.key === 'Escape' && on && !document.querySelector('.sst-inkbar:not([hidden])')) { e.stopImmediatePropagation(); toggle(false); }
      }, true);
      if (location.hash === '#present') setTimeout(function () { toggle(true); }, 400);
    }
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', ready); else ready();
  }

  window.SST_PRESENTER = { setup: setup, toggle: toggle, layout: layout };
})();
