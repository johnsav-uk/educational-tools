/* Savage Science Tools — presenter-mode helpers.
   Load after sst.js and before the tool's own script:
     <script src="../../assets/sst/present.js"></script>

   SST_PRESENT.px('--sst-pr-label')
     The token from sst.css resolved to pixels at the current viewport, for
     canvas, SVG and chart text that can't read a CSS variable directly.

   Slide decks (see .sst-deck in sst.css)
     Every .sst-deck on the page is wired up when this file runs, and again for
     any added later through SST_PRESENT.deck(el). Next and Back sit under the
     slides. While body.presenting is set, → / PageDown / ← / PageUp (what a
     presentation clicker sends) turn the page of the deck that's showing.
     Arrow keys typed into a field, slider or tab list are left alone.
     el.sstDeck exposes { go(i), next(), prev(), index, count, refresh() };
     refresh() re-reads the slides after a tool rewrites them. The deck fires
     a 'sst-slide' event with detail { index } whenever the slide changes.
     data-keys="page" on the deck leaves the arrow keys to the tool (a model
     that steps with ← →) and turns slides on PageUp / PageDown only.
     data-edges on the deck keeps Next and Back live at the ends: going past
     either end fires 'sst-deck-edge' with detail { dir } for the tool.

   SST_PRESENT.fill(deckEl, blocks)
     Builds the slides from blocks of text and splits them to fit the deck at
     its current size, so text is never shrunk to fit. See fill() below.

   SST_PRESENT.audit()
     Run in the console while presenting. Lists visible text below the
     --sst-pr-label size, skipping controls marked .sst-teacher and form
     controls, so a tool can be checked against the presenter standard. */
(function () {
  'use strict';
  if (window.SST_PRESENT) return;

  var probe;
  function px(token) {
    if (!probe) {
      probe = document.createElement('div');
      probe.setAttribute('aria-hidden', 'true');
      probe.style.cssText = 'position:absolute;visibility:hidden;pointer-events:none;left:-9999px;top:0;height:0;overflow:hidden';
      document.documentElement.appendChild(probe);
    }
    probe.style.width = 'var(' + token + ')';
    return parseFloat(getComputedStyle(probe).width) || 0;
  }

  var decks = [];
  function deck(el) {
    if (el.sstDeck) { el.sstDeck.refresh(); return el.sstDeck; }
    var box = el.querySelector(':scope > .sst-slides');
    if (!box) {
      box = document.createElement('div');
      box.className = 'sst-slides';
      while (el.firstChild) box.appendChild(el.firstChild);
      el.appendChild(box);
    }
    var nav = document.createElement('div');
    nav.className = 'sst-deck-nav';
    nav.innerHTML =
      '<span class="sst-deck-dots" aria-hidden="true"></span>' +
      '<button type="button" class="sst-deck-prev" title="Previous slide (← or Page Up)" aria-label="Previous slide">‹ Back</button>' +
      '<span class="sst-deck-count" aria-live="polite"></span>' +
      '<button type="button" class="sst-deck-next" title="Next slide (→ or Page Down)" aria-label="Next slide">Next ›</button>';
    el.appendChild(nav);
    var dots = nav.querySelector('.sst-deck-dots'), count = nav.querySelector('.sst-deck-count');
    var prevB = nav.querySelector('.sst-deck-prev'), nextB = nav.querySelector('.sst-deck-next');
    var api = { index: 0, count: 0 };
    var slides = [];

    api.refresh = function () {
      // Slides may sit inside wrappers (a grid, say) but not inside another deck.
      slides = Array.prototype.filter.call(box.querySelectorAll('.sst-slide'), function (x) { return x.closest('.sst-deck') === el; });
      api.count = slides.length;
      el.setAttribute('data-count', slides.length);
      dots.innerHTML = slides.map(function () { return '<i></i>'; }).join('');
      api.go(Math.min(api.index, Math.max(0, slides.length - 1)), true);
    };
    api.go = function (i, quiet) {
      if (!slides.length) return;
      i = Math.max(0, Math.min(slides.length - 1, i));
      var changed = i !== api.index;
      api.index = i;
      slides.forEach(function (s, k) { s.classList.toggle('is-on', k === i); });
      Array.prototype.forEach.call(dots.children, function (d, k) { d.classList.toggle('is-on', k === i); });
      count.textContent = (i + 1) + ' / ' + slides.length;
      var edges = el.hasAttribute('data-edges');
      prevB.disabled = i === 0 && !edges;
      nextB.disabled = i === slides.length - 1 && !edges;
      box.scrollTop = 0;
      if (changed && !quiet) el.dispatchEvent(new CustomEvent('sst-slide', { detail: { index: i } }));
    };
    // Past either end, the deck fires 'sst-deck-edge' (detail.dir -1 or 1),
    // so a tool can carry on into its own next step, as a PowerPoint build does.
    function step(dir) {
      var to = api.index + dir;
      if (to < 0 || to >= slides.length) el.dispatchEvent(new CustomEvent('sst-deck-edge', { detail: { dir: dir } }));
      else api.go(to);
    }
    api.next = function () { step(1); };
    api.prev = function () { step(-1); };
    prevB.addEventListener('click', api.prev);
    nextB.addEventListener('click', api.next);

    el.sstDeck = api;
    decks.push(el);
    api.refresh();
    // A deck filled from blocks is laid out again whenever its box changes
    // size, including when it first appears.
    // Debounced, so a resize in several steps (width, then height) settles
    // first. The window's resize event backs up the observer.
    var seen = '', timer = 0;
    function check() {
      clearTimeout(timer);
      timer = setTimeout(function () {
        var key = box.clientWidth + 'x' + box.clientHeight;
        if (key === seen || !box.clientHeight) return;
        seen = key;
        if (el.sstBlocks) layout(el);
      }, 80);
    }
    new ResizeObserver(check).observe(box);
    window.addEventListener('resize', check);
    return api;
  }

  /* SST_PRESENT.fill(deckEl, blocks)
     Lays out slides from blocks of content, so that nothing is shrunk to fit:
       blocks = [{ head: '<span class="sst-kicker">Step 1</span>', body: ['<p>…</p>', '<div class="eq">…</div>'], one: false }]
     Body items are packed onto a slide while they fit the deck at the current
     size. A <p> that won't fit is split between sentences, carrying on to a new
     slide under the same head, and a heading is never left at the foot of a
     slide. one: true starts every body item on a new slide.
     { slide: element } puts a ready-made slide (a live model, say) in the deck
     as it is. It keeps its place and state when the deck is laid out again.
     The layout is measured, so it is redone when the deck changes size, and a
     deck that is hidden gets one slide per block until it's shown. */
  function fill(el, blocks) {
    deck(el);
    el.sstBlocks = blocks;
    layout(el);
  }
  function sentences(html) {
    return html.replace(/([.!?]["”’)]?)\s+(?=[A-Z“"(<0-9])/g, '$1\u0000').split('\u0000');
  }
  function layout(el) {
    var api = el.sstDeck, blocks = el.sstBlocks, box = el.querySelector(':scope > .sst-slides');
    var keep = api.index;
    box.innerHTML = '';
    // Measure as the deck will look with several slides: Next and Back showing,
    // and no scrollbar narrowing the text.
    el.setAttribute('data-count', 'many');
    box.style.overflow = 'hidden';
    var tmp = document.createElement('div');
    function node(html) { tmp.innerHTML = html; return tmp.firstElementChild || document.createTextNode(html); }
    function slide(head) {
      var prev = box.lastElementChild;
      if (prev) prev.classList.remove('is-on');
      var s = document.createElement('section');
      s.className = 'sst-slide is-on';
      s.innerHTML = head || '';
      box.appendChild(s);
      return s;
    }
    var measured = box.clientHeight > 0;
    function fits() { return !measured || box.scrollHeight <= box.clientHeight + 1; }
    // Start a new slide, taking along a heading left stranded at the foot of the old one.
    function turn(cur, head, headN) {
      var last = cur.lastElementChild, carry = last && cur.childNodes.length > headN && /^H[2-6]$/.test(last.tagName) ? last : null;
      if (carry) cur.removeChild(carry);
      var next = slide(head);
      if (carry) next.appendChild(carry);
      return next;
    }
    blocks.forEach(function (b) {
      if (b.slide) {
        var prev = box.lastElementChild;
        if (prev) prev.classList.remove('is-on');
        b.slide.classList.add('sst-slide');
        box.appendChild(b.slide);
        return;
      }
      var cur = slide(b.head), headN = cur.childNodes.length;
      (b.body || []).forEach(function (html, k) {
        if (b.one && k && cur.childNodes.length > headN) { cur = slide(b.head); }
        var n = node(html);
        cur.appendChild(n);
        if (fits()) return;
        cur.removeChild(n);
        if (n.tagName === 'P') {
          var piece = n.cloneNode(false);
          sentences(n.innerHTML).forEach(function (sen) {
            var was = piece.innerHTML;
            piece.innerHTML = was ? was + ' ' + sen : sen;
            if (!piece.parentNode) cur.appendChild(piece);
            if (fits()) return;
            piece.innerHTML = was;
            if (!was) cur.removeChild(piece);
            if (cur.childNodes.length > headN) cur = turn(cur, b.head, headN);
            piece = n.cloneNode(false);
            piece.innerHTML = sen;
            cur.appendChild(piece);
          });
        } else {
          if (cur.childNodes.length > headN) cur = turn(cur, b.head, headN);
          cur.appendChild(n);
        }
      });
    });
    box.style.overflow = '';
    api.index = Math.min(keep, box.children.length - 1);
    api.refresh();
  }

  function visible(el) { return !!(el.offsetWidth || el.offsetHeight || el.getClientRects().length); }

  document.addEventListener('keydown', function (e) {
    if (e.defaultPrevented || e.ctrlKey || e.altKey || e.metaKey || !document.body.classList.contains('presenting')) return;
    var dir = { ArrowRight: 1, PageDown: 1, ArrowLeft: -1, PageUp: -1 }[e.key];
    if (!dir) return;
    var t = e.target;
    if (t && t.closest && t.closest('input, select, textarea, [contenteditable=""], [contenteditable="true"], [role="tablist"], [role="slider"], dialog, .sst-no-deck-keys')) return;
    for (var i = 0; i < decks.length; i++) {
      if (!document.contains(decks[i]) || !visible(decks[i])) continue;
      if (decks[i].getAttribute('data-keys') === 'page' && e.key.indexOf('Arrow') === 0) return;
      e.preventDefault();
      decks[i].sstDeck.go(decks[i].sstDeck.index + dir);
      return;
    }
  });

  function audit() {
    var min = px('--sst-pr-label'), out = [], seen = new Set();
    // With a full-screen presenter overlay open, only what's on it counts.
    var scope = document.querySelector('[aria-modal="true"]:not([hidden])') || document.body;
    var walker = document.createTreeWalker(scope, NodeFilter.SHOW_TEXT);
    for (var n = walker.nextNode(); n; n = walker.nextNode()) {
      var el = n.parentElement;
      if (!n.textContent.trim() || !el || seen.has(el)) continue;
      seen.add(el);
      if (el.closest('.sst-teacher, button, select, option, label, input, .sst-deck-nav, script, style, [aria-hidden="true"], .print-only')) continue;
      var r = el.getBoundingClientRect();
      if (!r.width || !r.height || r.bottom < 0 || r.top > innerHeight || getComputedStyle(el).visibility === 'hidden') continue;
      var size = parseFloat(getComputedStyle(el).fontSize);
      // SVG text is sized in the drawing's own units, and a scaled slide shrinks
      // everything in it: measure what reaches the screen.
      if (el instanceof SVGElement && el.getScreenCTM) { var m = el.getScreenCTM(); if (m) size *= Math.hypot(m.a, m.b); }
      else if (el.offsetWidth) size *= r.width / el.offsetWidth;
      // Sub- and superscripts sit inside text that is itself checked.
      if (el.closest('sub, sup, .nuc')) continue;
      if (size + 0.5 < min) out.push({ px: Math.round(size), text: n.textContent.trim().slice(0, 60), el: el });
    }
    console.log('Presenter floor at this viewport: ' + Math.round(min) + 'px. ' + out.length + ' text element(s) below it.');
    if (out.length) console.table(out.map(function (o) { return { px: o.px, text: o.text }; }));
    return out;
  }

  window.SST_PRESENT = { px: px, deck: deck, fill: fill, audit: audit };

  function init() { Array.prototype.forEach.call(document.querySelectorAll('.sst-deck'), deck); }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
