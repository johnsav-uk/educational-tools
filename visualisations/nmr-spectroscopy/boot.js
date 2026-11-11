/* NMR Spectroscopy: start-up. Router, print dialog and presenter mode. */
(function () {
  'use strict';
  var NMR = window.NMR, U = NMR.U;

  NMR.watchScripts();
  NMR.router.go(location.hash, 'init');
  window.addEventListener('hashchange', function () { if (location.hash !== NMR.router.cur) NMR.router.go(location.hash); });

  // Print: a plain Ctrl+P prints the worksheet only; the dialog adds the revision card and mark scheme.
  NMR.buildPrint();
  var dlg = U.$('#printDlg');
  U.$('#printBtn').addEventListener('click', function () { dlg.showModal(); });
  U.$('#pCancel').addEventListener('click', function () { dlg.close(); });
  U.$('#pGo').addEventListener('click', function () {
    var ws = U.$('#pOptWs').checked, card = U.$('#pOptCard').checked, ms = U.$('#pOptMs').checked, b = document.body.classList;
    if (!ws && !card && !ms) return;
    b.toggle('p-no-ws', !ws); b.toggle('p-card', card); b.toggle('p-ms', ms);
    dlg.close();
    setTimeout(function () { window.print(); }, 60);
  });
  window.addEventListener('afterprint', function () { document.body.classList.remove('p-no-ws', 'p-card', 'p-ms'); });

  // Presenter mode (assets/sst/presenter.js): the section's stage panels on the board, its controls beside them,
  // and the teaching notes as slides. Quiz blocks are .sst-teacher and stay off the board.
  var PRES = {
    stage: function () {
      var b = NMR.board; if (!b) return [];
      var vis = b.list.filter(function (e) { return !e.hidden && document.contains(e); });
      PRES.rows = b.pair !== 'cols';
      if (b.pair) return vis.slice(0, 2);
      return vis[b.cur] ? [vis[b.cur]] : vis.slice(0, 1);
    },
    rows: true, ratio: 0.5,
    side: function () { var c = U.$('#ctlPanel'); return c && U.$('#ctl').children.length ? [c] : []; },
    notes: '#notes',
    hide: '#vis .qcard'
  };
  if (window.SST_PRESENTER) SST_PRESENTER.setup(PRES);
})();
