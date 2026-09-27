/* Savage Science Tools — site bar.
   Load with a plain <script> as the first child of <body>:
     <script src="../../assets/sst/sst.js"></script>
   It inserts the bar before anything else on the page (so React mounting into
   #root can never remove it), then fills in the tool's name and kind from the
   shared catalogue in tools.js. Links are relative to wherever this file lives,
   so the bar works on localhost and on the domain at any folder depth.

   Pages under languages/ belong to the sister site, Savage Language Tools: the
   same bar in its coral identity, linking to languages/index.html and reading
   language-tools.js instead. Nothing on the page has to opt in. */
(function () {
  'use strict';
  var me = document.currentScript;
  if (!me || document.querySelector('.sst-bar')) return;
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
  document.body.insertBefore(bar, document.body.firstChild);

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

  if (window[listName]) { fill(); return; }
  var s = document.createElement('script');
  s.src = root + 'assets/sst/' + (lang ? 'language-tools.js' : 'tools.js');
  s.onload = fill;
  document.head.appendChild(s);
})();
