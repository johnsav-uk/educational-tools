/* Savage Science Tools — site bar.
   Load with a plain <script> as the first child of <body>:
     <script src="../../assets/sst/sst.js"></script>
   It inserts the bar before anything else on the page (so React mounting into
   #root can never remove it), then fills in the tool's name and kind from the
   shared catalogue in tools.js. Links are relative to wherever this file lives,
   so the bar works on localhost and on the domain at any folder depth.

   Pages under languages/ belong to the sister site, Savage Language Tools: the
   same bar in its coral identity, linking to languages/index.html and reading
   language-tools.js instead. Nothing on the page has to opt in.

   It also sets the colour theme before the page paints: dark unless the
   viewer chose light, one choice for the whole site. Pages with their own
   header (the homepages) load it with data-bar="none" to get the theme
   without the bar. The API, for tools that paint with JavaScript:
     SST_THEME.get()              'dark' or 'light'
     SST_THEME.set(t) / toggle()
     document 'sst-theme' event   fired after a change; e.detail.theme
   Any element with data-sst-theme-toggle becomes a Light / Dark button; a
   .sst-theme-label inside it shows the theme it switches to. */
(function () {
  'use strict';
  var me = document.currentScript;

  var KEY = 'sst-theme';
  var SUN = '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="4.2" fill="none" stroke="currentColor" stroke-width="2"/><path d="M12 2.5v2.2M12 19.3v2.2M2.5 12h2.2M19.3 12h2.2M5.3 5.3l1.6 1.6M17.1 17.1l1.6 1.6M5.3 18.7l1.6-1.6M17.1 6.9l1.6-1.6" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>';
  var MOON = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M20 14.6A8.3 8.3 0 0 1 9.4 4a8.3 8.3 0 1 0 10.6 10.6Z" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/></svg>';
  function stored() { try { return localStorage.getItem(KEY); } catch (e) { return null; } }
  function current() { return document.documentElement.classList.contains('theme-light') ? 'light' : 'dark'; }
  function paintButtons() {
    var next = current() === 'light' ? 'dark' : 'light';
    var word = next === 'light' ? 'Light' : 'Dark';
    var els = document.querySelectorAll('[data-sst-theme-toggle]');
    for (var i = 0; i < els.length; i++) {
      var b = els[i], label = b.querySelector('.sst-theme-label'), icon = b.querySelector('.sst-theme-icon');
      b.title = 'Switch to ' + next + ' mode';
      b.setAttribute('aria-label', 'Switch to ' + next + ' mode');
      if (icon) icon.innerHTML = next === 'light' ? SUN : MOON;
      if (label) label.textContent = word;
      else if (!b.children.length) b.textContent = word;
    }
  }
  function apply(t) {
    var light = t === 'light';
    [document.documentElement, document.body].forEach(function (el) {
      if (!el) return;
      el.classList.toggle('theme-light', light);
      el.classList.toggle('theme-dark', !light);
    });
    paintButtons();
  }
  function set(t, quiet) {
    t = t === 'light' ? 'light' : 'dark';
    var changed = t !== current();
    apply(t);
    if (!quiet) { try { localStorage.setItem(KEY, t); } catch (e) { /* storage blocked */ } }
    if (changed) document.dispatchEvent(new CustomEvent('sst-theme', { detail: { theme: t } }));
  }
  window.SST_THEME = {
    get: current,
    set: function (t) { set(t); },
    toggle: function () { set(current() === 'light' ? 'dark' : 'light'); },
    paint: paintButtons, sun: SUN, moon: MOON
  };
  apply(stored());
  document.addEventListener('click', function (e) {
    var b = e.target.closest && e.target.closest('[data-sst-theme-toggle]');
    if (b) { e.preventDefault(); window.SST_THEME.toggle(); }
  });
  // Buttons in markup further down the page, and choices made in another tab.
  document.addEventListener('DOMContentLoaded', paintButtons);
  window.addEventListener('storage', function (e) { if (e.key === KEY) set(e.newValue, true); });

  if (!me || me.getAttribute('data-bar') === 'none' || document.querySelector('.sst-bar')) return;
  var root = me.src.replace(/assets\/sst\/sst\.js(\?.*)?$/, '');
  var lang = location.href.indexOf(root + 'languages/') === 0;

  var bar = document.createElement('header');
  bar.className = 'sst-bar' + (lang ? ' sst-bar--lang' : '');
  if (lang) {
    var home = root + 'languages/index.html';
    bar.innerHTML =
      '<a class="sst-brand" href="' + home + '" aria-label="Savage Language Tools home">' +
        '<svg class="sst-bubbles" viewBox="0 0 30 30" aria-hidden="true">' +
          '<path d="M7 3h9a5 5 0 0 1 5 5v3a5 5 0 0 1-5 5H9.5L5 19.5v-4.1A5 5 0 0 1 2 11V8a5 5 0 0 1 5-5Z"/>' +
          '<path d="M14 12h9a5 5 0 0 1 5 5v2.5a5 5 0 0 1-3 4.6V28l-4.5-3.5H14a5 5 0 0 1-5-5V17a5 5 0 0 1 5-5Z"/>' +
        '</svg>' +
        '<span class="sst-word"><span>SAVAGE LANGUAGE</span><span>TOOLS</span></span>' +
      '</a>' +
      '<div class="sst-crumb"><span></span></div>' +
      '<nav class="sst-nav" aria-label="Site">' +
        '<a href="' + root + 'index.html">Science tools</a>' +
        '<a class="sst-keep" href="' + home + '#support">Support</a>' +
        '<a class="sst-keep" href="' + home + '#all">All tools</a>' +
      '</nav>';
  } else {
    bar.innerHTML =
      '<a class="sst-brand" href="' + root + 'index.html" aria-label="Savage Science Tools home">' +
        '<span class="sst-atom" aria-hidden="true"><i></i><i></i><i></i><i></i></span>' +
        '<span class="sst-word"><span>SAVAGE SCIENCE</span><span>TOOLS</span></span>' +
      '</a>' +
      '<div class="sst-crumb"><span></span></div>' +
      '<nav class="sst-nav" aria-label="Site">' +
        '<a href="' + root + 'index.html?type=explore#all">Explore</a>' +
        '<a href="' + root + 'index.html?type=play#all">Play</a>' +
        '<a class="sst-keep" href="' + root + 'index.html#support">Support</a>' +
        '<a class="sst-keep" href="' + root + 'index.html#all">All tools</a>' +
      '</nav>';
  }
  var themeBtn = document.createElement('button');
  themeBtn.type = 'button'; themeBtn.className = 'sst-theme-nav';
  themeBtn.setAttribute('data-sst-theme-toggle', '');
  themeBtn.innerHTML = '<i class="sst-theme-icon"></i><span class="sst-theme-label"></span>';
  bar.querySelector('.sst-nav').appendChild(themeBtn);
  document.body.insertBefore(bar, document.body.firstChild);
  paintButtons();

  var crumb = bar.querySelector('.sst-crumb');
  var fallback = (document.title || '').split(/\s[—|–-]\s/)[0];
  crumb.firstChild.textContent = fallback;

  var listName = lang ? 'SLT_TOOLS' : 'SST_TOOLS';

  function fill() {
    var here = location.pathname.replace(/index\.html$/, '');
    var tools = window[listName] || [];
    for (var i = 0; i < tools.length; i++) {
      var t = tools[i];
      if (here.slice(-t.url.length) !== t.url) continue;
      crumb.firstChild.textContent = t.title;
      var play = t.kind === 'Revision Game';
      var kind = document.createElement('span');
      kind.className = 'sst-kind' + (play ? ' sst-kind--play' : '');
      var levels = t.levels || [t.level];
      kind.textContent = (play ? 'Play' : 'Explore') + ' · ' + levels.join(' & ');
      crumb.appendChild(kind);
      return;
    }
  }

  // Explore tools get the shared annotation layer (annotate.js), unless the
  // tool draws its own.
  if (location.href.indexOf(root + 'visualisations/') === 0) {
    var ink = document.createElement('script');
    ink.src = root + 'assets/sst/annotate.js';
    document.head.appendChild(ink);
  }

  if (window[listName]) { fill(); return; }
  var s = document.createElement('script');
  s.src = root + 'assets/sst/' + (lang ? 'language-tools.js' : 'tools.js');
  s.onload = fill;
  document.head.appendChild(s);
})();
