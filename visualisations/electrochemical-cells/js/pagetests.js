/* Electrochemical Cell Builder — page tests (Test G and the UI side of D–F).
   Loads index.html in a hidden frame and drives it through window.CellPage,
   checking what a student would see: the readout, the explanations, the
   diagram's markers and labels, the layout and the presenter text sizes.
   Called by tests.js as CellPageTests(t, done). */
(function () {
  'use strict';
  window.CellPageTests = function (t, done) {
    var frame = document.createElement('iframe');
    frame.id = 'frame';
    frame.src = 'index.html?test=' + Date.now();
    document.body.appendChild(frame);
    var queue = [], W, D, P, E;
    function step(fn, wait) { queue.push({ fn: fn, wait: wait === undefined ? 60 : wait }); }
    function run() {
      if (!queue.length) { done(); return; }
      var s = queue.shift();
      try { s.fn(); } catch (e) { t.ok('step threw', false, e.message + ' ' + (e.stack || '').split('\n')[1]); }
      setTimeout(run, s.wait);
    }
    function txt(sel) { var n = D.querySelector(sel); return n ? n.textContent : ''; }
    function visibleText(sel) { var n = D.querySelector(sel); return n && !n.hidden ? n.textContent : ''; }
    function svgText() { return Array.prototype.map.call(D.querySelectorAll('#cellSvg text'), function (n) { return n.textContent; }).join(' | '); }
    function markers(kind) { return D.querySelectorAll('#cellSvg .pt').length; }
    function gcseView() { return visibleText('#readout') + visibleText('#predictCard') + visibleText('#explainBody') + visibleText('#resultsCard') + svgText() + txt('#actHead'); }

    frame.addEventListener('load', function () {
      W = frame.contentWindow; D = W.document; P = W.CellPage; E = W.CellEngine;
      if (!P) { t.group('Page tests'); t.ok('page loaded with CellPage', false, 'window.CellPage missing'); done(); return; }

      step(function () {
        t.group('Test G: levels and curriculum boundaries');
        t.ok('opens on GCSE, activity A', P.ui.level === 'gcse' && P.ui.act === 'simple');
        t.ok('GCSE menu lists A–E and challenges only', D.querySelectorAll('#acts .act').length === 6 && /Build a simple cell/.test(txt('#acts')) && !/Daniell/.test(txt('#acts')));
        D.querySelector('.levels [data-level="alevel"]').click();
      });
      step(function () {
        t.ok('the A-level tab switches level and menu', P.ui.level === 'alevel' && /Daniell/.test(txt('#acts')) && !/simple cell/.test(txt('#acts')));
        var ev = new W.KeyboardEvent('keydown', { key: 'ArrowLeft', bubbles: true });
        D.querySelector('.levels [aria-selected="true"]').dispatchEvent(ev);
      });
      step(function () {
        t.ok('arrow keys move between the level tabs', P.ui.level === 'gcse');
        // Every GCSE activity, in every state reachable from its controls, stays inside GCSE.
        var leaks = [];
        [['simple', { connected: true }], ['simple', { connected: true, m1: 'mg', el: 'h2so4' }], ['variables', { connected: true }], ['battery', {}],
         ['electrolysis', { supply: true }], ['electrolysis', { supply: true, ht: true, id: 'nacl-aq' }], ['fuel', { ht: true }], ['fuel', { ht: true, electrolyte: 'alkaline' }]].forEach(function (c) {
          P.go('gcse', c[0]); P.set(c[1]);
          var s = gcseView();
          [/E°/, /E°cell/, /\|\|/, /standard electrode potential(?![\s\S]*beyond GCSE)/i, /Nernst/i, /salt bridge/i, /hydrogen electrode/i].forEach(function (re) { if (re.test(s.replace(/Going further \(beyond GCSE\)[\s\S]*$/, ''))) leaks.push(c[0] + ': ' + re); });
          if (c[0] !== 'electrolysis' && /anode|cathode/i.test(s)) leaks.push(c[0] + ': anode/cathode in a cell activity');
        });
        t.ok('no A-level content (E°, notation, SHE, salt bridge, Nernst) in GCSE activities', leaks.length === 0, leaks.join('; '));
        P.go('gcse', 'simple'); P.set({ connected: true });
        t.ok('GCSE beyond-the-spec note is labelled as such', /Going further \(beyond GCSE\)/.test(txt('#explainBody')));
        t.ok('GCSE reading is labelled illustrative', /Illustrative/i.test(txt('#readout')));
        var all = '';
        ['daniell', 'series', 'emf', 'rp8', 'conditions'].forEach(function (id) { P.go('alevel', id); all += txt('#explainBody') + txt('#readout') + txt('#predictCard'); });
        t.ok('Nernst never appears, even at A-level', !/Nernst/i.test(all));
      });

      step(function () {
        t.group('Test D in the page: GCSE simple cell');
        P.go('gcse', 'simple'); P.set({ m1: 'cu', m2: 'zn', el: 'nacl', connected: false, pred: {} });
        t.ok('before connecting: no reading, no moving markers', /—/.test(txt('#readout .ro-value')) && markers() === 0);
        P.set({ pred: { neg: 'm2', e: '21' } });
        D.getElementById('c-connect').click();
      });
      step(function () {
        var r = E.simpleCell('cu', 'zn', 'nacl', { seed: P.ui.seed, trial: 0 });
        t.ok('connected: readout shows the engine reading', txt('#readout .ro-value') === r.reading.toFixed(2) + ' V', txt('#readout .ro-value'));
        t.ok('the meter in the diagram shows the same reading', D.getElementById('meterText').textContent === r.reading.toFixed(2) + ' V');
        t.ok('zinc is labelled negative in the diagram', /negative \(−\)/.test(svgText()));
        t.ok('both predictions get explained feedback', D.querySelectorAll('#predictCard .fb.good').length === 2 && /more reactive/.test(txt('#predictCard')));
        // Electrons start at zinc (right, x = 570) and the chevron points left.
        var chev = D.querySelector('#cellSvg path[transform*="rotate(180)"]');
        t.ok('electron chevrons point from zinc (right) to copper (left)', !!chev);
        t.ok('electrons are drawn (markers present)', markers() > 0);
        P.set({ m2: 'cu' });
        t.ok('two copper electrodes: 0.00 V and an explanation, no electrons', /0\.00 V/.test(txt('#readout')) && /same metal/.test(txt('#readout')) && markers() === 0);
        P.set({ m2: 'zn', el: 'water' });
        t.ok('distilled water: explained, no invented voltage', /almost no ions/.test(txt('#readout')) && markers() === 0);
      });

      step(function () {
        t.group('Test E in the page: electrolysis');
        P.go('gcse', 'electrolysis'); P.set({ id: 'nacl-aq', supply: false, pred: { cath: 'metal', an: 'halogen' } });
        t.ok('supply off: nothing moves', markers() === 0);
        D.getElementById('c-supply').click();
      });
      step(function () {
        t.ok('products read hydrogen and chlorine', /Cathode \(−\)\s*hydrogen/.test(txt('#readout')) && /Anode \(\+\)\s*chlorine/.test(txt('#readout')), txt('#readout'));
        t.ok('a wrong prediction is explained', /Not quite/.test(txt('#predictCard')) && /Yes/.test(txt('#predictCard')));
        t.ok('diagram labels: power supply, cathode (−), anode (+)', /d\.c\. power supply/.test(svgText()) && /Cathode \(−\)/.test(svgText()) && /Anode \(\+\)/.test(svgText()));
        t.ok('the explanation contrasts electrolysis with a chemical cell', /external power supply to drive a reaction[\s\S]*produces electricity/.test(txt('#explainBody')));
        t.ok('ions are animated (markers present)', markers() > 8);
        P.set({ id: 'pbbr2-s', supply: true });
        t.ok('solid lead bromide: no electrolysis, explained', /cannot move/.test(txt('#readout')) && markers() === 0);
        P.set({ id: 'cuso4-aq', supply: true, ht: true });
        t.ok('HT half-equations shown when asked (4OH⁻ form)', /4OH−\s*→\s*O2 \+ 2H2O \+ 4e−/.test(txt('#explainBody').replace(/\s+/g, ' ')), txt('#explainBody').slice(0, 200));
      });

      step(function () {
        t.group('Test A/B/C in the page: A-level cells');
        P.go('alevel', 'daniell'); P.set({ pred: { ox: 'left', pos: 'right', e: 'bridge' } });
        D.getElementById('c-connect').click();
      });
      step(function () {
        t.ok('Daniell: E°cell +1.10 V in the readout', /\+1\.10 V/.test(txt('#readout')));
        t.ok('Daniell: notation in the explanation', txt('#explainBody').indexOf('Zn(s) | Zn2+(aq) || Cu2+(aq) | Cu(s)') >= 0, txt('.notation'));
        t.ok('Daniell: "through the salt bridge" is corrected', /does not carry electrons/.test(txt('#predictCard')));
        t.ok('Daniell: zinc labelled negative / anode in the diagram', /Negative electrode/.test(svgText()) && /oxidation · anode/.test(svgText()));
        t.ok('Daniell: salt bridge ions labelled, NO₃⁻ towards zinc', /← NO₃⁻/.test(svgText()) && /K⁺ →/.test(svgText()));
        P.set({ bridge: 'none' });
        t.ok('no salt bridge: meter reads 0.00 V and explains', D.getElementById('meterText').textContent === '0.00 V' && /incomplete/.test(txt('#readout')) && markers() === 0);
        P.set({ bridge: 'wire' });
        t.ok('a wire as the bridge: rejected with a reason', /carries electrons, not ions/.test(txt('#readout')));
        P.go('alevel', 'series'); P.set({ left: 'cu', right: 'zn', connected: true });
        var chev = D.querySelector('#cellSvg path[transform*="rotate(180)"]');
        t.ok('Test B: copper on the left: still +1.10 V, electrons right → left', /\+1\.10 V/.test(txt('#readout')) && !!chev);
        t.ok('Test B: notation still puts zinc on the left', txt('#explainBody').indexOf('Zn(s) | Zn2+(aq) || Cu2+(aq) | Cu(s)') >= 0);
        P.go('alevel', 'emf'); P.set({ left: 'cu', right: 'zn', asWritten: true, guess: '' });
        D.getElementById('emfIn').value = '-1.10'; D.querySelector('[data-act="check-emf"]').click();
      });
      step(function () {
        t.ok('Test B: reverse as written: −1.10 V accepted, not feasible explained', /Yes/.test(txt('#predictCard')) && /not feasible/.test(txt('#explainBody')));
        P.set({ left: 'zn', right: 'ag', asWritten: false, verdict: null, connected: false });
        D.getElementById('emfIn').value = '2.36'; D.querySelector('[data-act="check-emf"]').click();
      });
      step(function () {
        t.ok('Test C: multiplied potentials (2.36) diagnosed', /never multiplied/.test(txt('#predictCard')));
        t.ok('Test C: working says the silver E° is not multiplied', /its E° is not/.test(txt('#explainBody')));
        t.ok('Test C: overall equation balanced in the page', /Zn \+ 2Ag\+ → Zn2\+ \+ 2Ag/.test(txt('#explainBody')));
        P.go('alevel', 'conditions'); P.set({ left: 'zn', right: 'cu', concR: 0.01 });
        t.ok('changing conditions: reading hidden until predicted', D.getElementById('meterText').textContent === '?');
        D.querySelector('[data-pred="cond"][data-v="down"]').click();
      });
      step(function () {
        t.ok('changing conditions: lower [Cu²⁺] lowers the reading, explained with Le Chatelier', /lower than E°cell/.test(txt('#predictCard')) && /to the left/.test(txt('#explainBody')));
        t.ok('changing conditions: simulated reading labelled not standard', /not a standard value/.test(txt('#readout')));
      });

      step(function () {
        t.group('Test F in the page: RP8 and invalid set-ups');
        P.go('alevel', 'rp8');
        t.ok('nothing chosen: no reading', /—/.test(txt('#readout .ro-value')));
        P.set({ lEl: 'zn', lSol: 'cu', rEl: 'cu', rSol: 'cu' });
        t.ok('zinc in copper sulfate: displacement explained, no reading', /displace/.test(txt('#readout')) && /—/.test(txt('#readout .ro-value')));
        P.set({ lSol: 'zn', bridge: 'kcl', rEl: 'ag', rSol: 'ag' });
        t.ok('KCl bridge with silver: precipitate explained', /silver chloride/.test(txt('#readout') + txt('#predictCard')));
        P.set({ bridge: 'kno3', vLead: 'left', cleaned: true });
        var v = txt('#readout .ro-value');
        t.ok('red lead on zinc (negative): reading is negative', /^−1\.5\d V$/.test(v), v);
        P.set({ vLead: 'right' });
        t.ok('leads swapped: reading positive', /^1\.5\d V$/.test(txt('#readout .ro-value')), txt('#readout .ro-value'));
        t.ok('animation waits until the student has identified the electrodes', markers() === 0);
        P.set({ cleaned: false });
        var dirty = parseFloat(txt('#readout .ro-value'));
        t.ok('uncleaned electrodes read lower', dirty < 1.56, dirty);
        D.querySelector('#btnReset').click();
      });
      step(function () {
        var s = P.state();
        t.ok('Reset clears the set-up and answers', s.lEl === '' && s.bridge === 'none' && s.vLead === '' && !s.cleaned);
        P.go('gcse', 'variables'); P.set({ connected: true });
        D.querySelector('[data-act="record"]').click(); P.set({ m1: 'mg', el: 'h2so4' }); D.querySelector('[data-act="record"]').click();
      });
      step(function () {
        t.ok('fair test: changing two things at once is flagged', /at once/.test(txt('#resultsCard')));
        D.querySelector('#btnReset').click();
      });
      step(function () {
        t.ok('Reset keeps the results table but resets the cell', D.querySelectorAll('#resultsCard tbody tr').length === 2 && P.state().m1 === 'zn' && !P.state().connected);
      });

      step(function () {
        t.group('Challenges');
        P.go('alevel', 'alevel-challenge');
        var c = P.state(); c.i = 2; c.cur = null; P.set({});
        var ans = c.cur.answer;
        t.ok('E°cell challenge: diagram meter hidden while answering', D.getElementById('meterText').textContent === '?');
        D.getElementById('chIn').value = String(ans); D.querySelector('[data-act="ch-num"]').click();
      });
      step(function () {
        t.ok('E°cell challenge: correct answer scores and shows working', P.state().score === 1 && /E°cell = E°right − E°left|E°cell = E°/.test(txt('#predictCard')));
        var bad = [];
        ['gcse', 'alevel'].forEach(function (lv) {
          W.CellChallenges[lv].forEach(function (d) {
            for (var k = 1; k < 25; k++) {
              var q = d.make(E.rng(k * 7919));
              if (q.kind === 'mcq') {
                var rights = q.options.filter(function (o) { return o.right; }).length;
                var texts = q.options.map(function (o) { return o.html; });
                if (rights !== 1) bad.push(d.id + ' has ' + rights + ' right answers (seed ' + k + ')');
                if (texts.some(function (x, i) { return texts.indexOf(x) !== i; })) bad.push(d.id + ' repeats an option (seed ' + k + ')');
              }
              if (q.kind === 'num' && !isFinite(q.answer)) bad.push(d.id + ' answer not a number');
            }
          });
        });
        t.ok('every challenge, 24 seeds each: exactly one right option, no repeated options', bad.length === 0, bad.slice(0, 5).join('; '));
      });

      step(function () {
        t.group('Review fixes: focus, typing, stale state');
        P.go('gcse', 'simple'); P.set({ connected: false });
        var b = D.getElementById('c-connect'); b.focus(); b.click();
        t.ok('focus stays on the connect button after it re-renders', D.activeElement && D.activeElement.id === 'c-connect');
        var lv = D.querySelector('.levels [data-level="alevel"]'); lv.focus(); lv.click();
        t.ok('focus stays on the level tab after switching', D.activeElement && D.activeElement.dataset && D.activeElement.dataset.level === 'alevel');
        P.go('alevel', 'emf'); P.set({ left: 'zn', right: 'cu', verdict: null, guess: '' });
        var inp = D.getElementById('emfIn'); inp.value = '1.10'; inp.dispatchEvent(new W.Event('input', { bubbles: true }));
        D.getElementById('btnPlay').click(); D.getElementById('btnPlay').click();
        t.ok('a typed answer survives a re-render', D.getElementById('emfIn').value === '1.10');
        P.go('alevel', 'conditions'); P.set({ left: 'zn', right: 'cu', concL: 0.1 }); P.set({ concL: 0.01 });
        t.ok('the beaker label follows the concentration chosen', /0\.010 mol dm⁻³/.test(svgText()));
        P.go('alevel', 'rp8'); P.set({ lEl: 'zn', lSol: 'zn', rEl: 'cu', rSol: 'cu', bridge: 'kno3', cleaned: true, vLead: 'right' });
        t.ok('RP8: no E° values on the beakers before the electrodes are identified', !/E° =/.test(svgText()));
        P.ui.results.rp8.push({ v: 1.1, cell: 'Zn | Cu', lead: 'Cu' });
        D.getElementById('btnReset').click();
      });
      step(function () {
        t.ok('RP8: Reset clears its readings too', P.ui.results.rp8.length === 0);
        P.go('gcse', 'simple'); P.set({ m1: 'zn', m2: 'cu', connected: true, pred: { neg: 'm1' } });
        var sel = D.getElementById('c-m1'); sel.value = 'mg'; sel.dispatchEvent(new W.Event('change', { bubbles: true }));
        t.ok('changing a metal clears predictions made for the old cell', !P.state().pred.neg);
      });

      step(function () {
        t.group('Layout and presenter mode');
        P.go('alevel', 'daniell'); P.set({ connected: true });
        frame.style.width = '375px'; frame.style.height = '800px';
      }, 300);
      step(function () {
        t.ok('375 px wide: no horizontal scrolling', D.documentElement.scrollWidth <= W.innerWidth + 1, D.documentElement.scrollWidth + ' > ' + W.innerWidth);
        var b = D.getElementById('build').getBoundingClientRect(), s = D.getElementById('stage').getBoundingClientRect(), i = D.getElementById('info').getBoundingClientRect();
        t.ok('375 px wide: build, then the cell, then results, in one column', b.top < s.top && s.top < i.top && Math.abs(b.left - s.left) < 2);
        frame.style.width = '1920px'; frame.style.height = '1080px';
      }, 300);
      step(function () {
        t.ok('1920 px: three columns side by side', D.getElementById('build').getBoundingClientRect().right < D.getElementById('stage').getBoundingClientRect().left);
        W.SST_PRESENTER.toggle(true);
      }, 700);
      step(function () {
        var under = W.SST_PRESENT.audit();
        t.ok('presenter mode at 1920×1080: no pupil-facing text under the floor', under.length === 0, under.slice(0, 6).map(function (o) { return o.px + 'px "' + o.text + '"'; }).join('; '));
        frame.style.width = '1280px'; frame.style.height = '720px';
      }, 700);
      step(function () {
        var under = W.SST_PRESENT.audit();
        t.ok('presenter mode at 1280×720: nothing under the floor', under.length === 0, under.slice(0, 6).map(function (o) { return o.px + 'px "' + o.text + '"'; }).join('; '));
        P.go('gcse', 'electrolysis'); P.set({ supply: true });
      }, 700);
      step(function () {
        var under = W.SST_PRESENT.audit();
        t.ok('presenter mode, electrolysis at 1280×720: nothing under the floor', under.length === 0, under.slice(0, 6).map(function (o) { return o.px + 'px "' + o.text + '"'; }).join('; '));
        frame.style.width = '1024px'; frame.style.height = '768px';
        P.go('gcse', 'fuel');
      }, 700);
      step(function () {
        var under = W.SST_PRESENT.audit();
        t.ok('presenter mode, fuel cell at 1024×768: nothing under the floor', under.length === 0, under.slice(0, 6).map(function (o) { return o.px + 'px "' + o.text + '"'; }).join('; '));
        var k = new W.KeyboardEvent('keydown', { key: 'Escape', bubbles: true });
        W.dispatchEvent(k);
      }, 400);
      step(function () {
        t.ok('Esc leaves presenter mode', !D.body.classList.contains('presenting'));
        var rules = Array.prototype.map.call(D.styleSheets, function (ss) { try { return Array.prototype.map.call(ss.cssRules, function (r) { return r.cssText; }).join('\n'); } catch (e) { return ''; } }).join('\n');
        t.ok('a plain Ctrl+P can never print a mark scheme', /body:not\(\.print-custom\) #msGcse/.test(rules) && /body:not\(\.print-custom\) #msAlevel/.test(rules));
        t.ok('page has the site bar', !!D.querySelector('.sst-bar'));
      });
      run();
    });
  };
})();
