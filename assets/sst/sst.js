/* Savage Science Tools — site bar.
   Load with a plain <script> as the first child of <body>:
     <script src="../../assets/sst/sst.js"></script>
   It inserts the bar before anything else on the page (so React mounting into
   #root can never remove it), then fills in the tool's name and kind from the
   shared catalogue in tools.js. Links are relative to wherever this file lives,
   so the bar works on localhost and on the domain at any folder depth. */
(function () {
  'use strict';
  var me = document.currentScript;
  if (!me || document.querySelector('.sst-bar')) return;
  var root = me.src.replace(/assets\/sst\/sst\.js(\?.*)?$/, '');

  var bar = document.createElement('header');
  bar.className = 'sst-bar';
  bar.innerHTML =
    '<a class="sst-brand" href="' + root + 'index.html" aria-label="Savage Science Tools home">' +
      '<span class="sst-atom" aria-hidden="true"><i></i><i></i><i></i><i></i></span>' +
      '<span class="sst-word"><span>SAVAGE SCIENCE</span><span>TOOLS</span></span>' +
    '</a>' +
    '<div class="sst-crumb"><span></span></div>' +
    '<nav class="sst-nav" aria-label="Site">' +
      '<a href="' + root + 'index.html?type=explore#all">Explore</a>' +
      '<a href="' + root + 'index.html?type=play#all">Play</a>' +
      '<a href="' + root + 'index.html#all">All tools</a>' +
    '</nav>';
  document.body.insertBefore(bar, document.body.firstChild);

  var crumb = bar.querySelector('.sst-crumb');
  var fallback = (document.title || '').split(/\s[—|–-]\s/)[0];
  crumb.firstChild.textContent = fallback;

  function fill() {
    var here = location.pathname.replace(/index\.html$/, '');
    var tools = window.SST_TOOLS || [];
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

  if (window.SST_TOOLS) { fill(); return; }
  var s = document.createElement('script');
  s.src = root + 'assets/sst/tools.js';
  s.onload = fill;
  document.head.appendChild(s);
})();
