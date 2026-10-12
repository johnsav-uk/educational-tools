/* Organic Synthesis Pathways: page tests (section P of PLAN.md §9).
   Loads index.html in a hidden frame and drives it the way a student would, by
   clicking the shelf, checking what is drawn, the themes, presenter mode and
   the print setup. Called by tests.js as SynthPageTests(t, done). Needs http. */
(function () {
  'use strict';
  window.SynthPageTests = function (t, doneAll) {
    // The frame shares this origin's storage: put back the teacher's solved puzzles and theme afterwards.
    var KEYS = ['sst-organic-solved', 'sst-theme'], saved = {};
    KEYS.forEach(function (k) { try { saved[k] = localStorage.getItem(k); } catch (e) { /* storage blocked */ } });
    function done() {
      KEYS.forEach(function (k) { try { if (saved[k] === null || saved[k] === undefined) localStorage.removeItem(k); else localStorage.setItem(k, saved[k]); } catch (e) { /* storage blocked */ } });
      doneAll();
    }
    var frame = document.createElement('iframe');
    frame.id = 'frame';
    frame.src = 'index.html?test=' + Date.now();
    document.body.appendChild(frame);
    var queue = [], W, D, P, E;
    function step(fn, wait) { queue.push({ fn: fn, wait: wait === undefined ? 80 : wait }); }
    function run() {
      if (!queue.length) { done(); return; }
      var s = queue.shift();
      try { s.fn(); } catch (e) { t.ok('step threw', false, e.message + ' ' + (e.stack || '').split('\n')[1]); }
      setTimeout(run, s.wait);
    }
    function $(sel) { return D.querySelector(sel); }
    function $$(sel) { return Array.prototype.slice.call(D.querySelectorAll(sel)); }
    function txt(sel) { var n = $(sel); return n ? n.textContent.replace(/\s+/g, ' ') : ''; }
    function click(sel) { var n = typeof sel === 'string' ? $(sel) : sel; if (!n) { t.ok('missing ' + sel, false); return false; } n.click(); return true; }
    function pickCard(card, prof) {
      var c = $('.rcard[data-card="' + card + '"]');
      if (c && c.getAttribute('aria-pressed') !== 'true') c.click();     // a failed attempt leaves the card selected
      var r = $('input[name="prof"][value="' + prof + '"]'); if (r && !r.checked) r.click();
    }
    function react() { click('#goBtn'); }
    function key(k) { D.dispatchEvent(new W.KeyboardEvent('keydown', { key: k, bubbles: true, cancelable: true })); }
    function solved() { return !!$('.solved'); }
    function bg(el) { for (var n = el; n; n = n.parentElement) { var c = W.getComputedStyle(n).backgroundColor; if (c && c !== 'rgba(0, 0, 0, 0)' && c !== 'transparent') return c; } return 'rgb(255, 255, 255)'; }

    frame.addEventListener('load', function () {
      W = frame.contentWindow; D = W.document; P = W.SynthPage; E = W.SynthEngine;
      if (!P) { t.group('Page tests'); t.ok('page loaded with SynthPage', false, 'window.SynthPage missing'); done(); return; }

      step(function () {
        t.group('P1: site bar and page');
        t.ok('the site bar is present', !!$('.sst-bar'));
        t.ok('the bar names the tool from tools.js', /Organic Synthesis Pathways/.test(txt('.sst-bar')), txt('.sst-bar').slice(0, 120));
        t.ok('the bar says it is an Explore tool for GCSE and A-level', /Explore · GCSE & A-Level/.test(txt('.sst-bar')), txt('.sst-bar').slice(0, 160));
        t.ok('the page title carries (beta)', /\(beta\)/.test(D.title) && /beta/.test(txt('h1')));
        t.ok('opens on GCSE, g1', P.st.level === 'gcse' && P.st.puzzle.id === 'g1');
        t.ok('the pathway shows the start and the target', $$('.pw-mol').length === 2 && /ethene/.test(txt('.pw-mol.start')) && /ethanol/.test(txt('.pw-mol.target')));
        t.ok('structures are drawn as SVG with names', $$('.pw-mol svg.struct[aria-label]').length === 2);
      });

      step(function () {
        t.group('P2: solving g8 by clicking, both listed routes');
        P.load('g8');
        pickCard('steam', 'hp'); react();
      });
      step(function () {
        t.ok('a step is added to the pathway', $$('.pw-step').length === 1 && /ethanol/.test(txt('.pw-mol.end')));
        var st = $('.pw-step .step-btn'), kids = Array.prototype.map.call(st.children, function (c) { return c.className.baseVal !== undefined ? 'svg' : c.className; });
        t.ok('reagent above the arrow, conditions below', kids.join(',') === 'reagent,svg,cond', kids.join(','));
        t.ok('the shelf prompts for the next step (selection cleared)', !P.st.card);
        pickCard('est-ethanoic', 'warm'); react();
      });
      step(function () {
        t.ok('route 1 (steam, then ethanoic acid + ethanol): the solved banner shows', solved() && /Solved in 2 steps/.test(txt('.solved')), txt('#boardMsg').slice(0, 120));
        t.ok('the banner counts routes found', /Routes you have found: 1 of 2/.test(txt('.solved')), txt('.solved'));
        click('[data-act="again"]');
      });
      step(function () {
        t.ok('Try another route clears the chain but not the count', $$('.pw-step').length === 0 && !solved());
        pickCard('steam', 'hp'); react();
      });
      step(function () { pickCard('oxid', 'warm'); react(); });
      step(function () { pickCard('est-ethanol', 'warm'); react(); });
      step(function () {
        t.ok('route 2 (steam, oxidise, esterify): solved', solved() && /Solved in 3 steps/.test(txt('.solved')), txt('#boardMsg').slice(0, 120));
        t.ok('both routes are now counted: 2 of 2', /Routes you have found: 2 of 2/.test(txt('.solved')), txt('.solved'));
        t.group('P2b: wrong choices, choices of product, poor routes, undo, hint');
        P.load('g7'); pickCard('crack', 'cat'); react();
      });
      step(function () {
        t.ok('cracking asks which product to carry on with', !!$('.choice') && $$('.choice [data-act="pick"]').length === 2, txt('#explain').slice(0, 100));
        t.ok('the product choice is in the next-step panel, and React waits for it', !!$('#composer .choice') && (!$('#goBtn') || $('#goBtn').disabled));
        click('.choice [data-act="pick"][data-id="octane"]');
      });
      step(function () {
        t.ok('carrying on with octane works but leads nowhere: no solved banner', !solved() && P.st.fwd.length === 1);
        pickCard('steam', 'hp'); react();
      });
      step(function () {
        t.ok('octane + steam is not a reaction: the pathway does not grow, it is explained and listed as tried', P.st.fwd.length === 1 && $$('.tried .tr').length === 1 && /No reaction|not take|Not covered/.test(txt('#explain')), txt('#explain').slice(0, 120));
        click('.undo');
      });
      step(function () {
        t.ok('Undo removes the step', P.st.fwd.length === 0);
        P.load('a5'); pickCard('hbr', 'rt'); react();
      });
      step(function () {
        t.ok('propene + HBr carries on with the major product, 2-bromopropane, and offers the minor one', /2-bromopropane/.test(txt('.pw-mol.end')) && !!$('[data-act="minor"]'), txt('#explain').slice(0, 80));
        click('[data-act="minor"]');
      });
      step(function () {
        t.ok('choosing the minor product flags the step as poor', $$('.step-btn.poor').length === 1 && /minor product/.test(txt('#pathway')));
        P.load('a8');
        click('#btnHint');
        click('#btnHint');
      });
      step(function () {
        t.ok('Hint gives tiered text', /Hint 2 of 4/.test(txt('#boardMsg')) && txt('#boardMsg').length > 40, txt('#boardMsg'));
        P.load('free');
        t.ok('Free explore has no target and a start picker', !$('.pw-mol.target') && !$('#startField').hidden && $('#btnHint').disabled);
        P.load('g1');
      });

      step(function () {
        t.group('P3: switching level');
        click('#levelSeg [data-level="gcse"]'); P.load('g1');
        var nGcse = $$('.rcard').length;
        t.ok('picking a reagent shows its conditions in the next-step panel, not the shelf', (function () { var c = $('.rcard[data-card="h2"]'); c.click(); var ok = $$('#composer input[name="prof"]').length === 2 && !$('#shelf input[name="prof"]') && /Hydrogen, nickel catalyst/.test(txt('#composer')); c.click(); return ok; })());
        t.ok('GCSE shelf has 14 cards and no A-level reagents', nGcse === 14 && !/NaBH|LiAlH|Potassium cyanide|Hydrogen bromide/.test(txt('#shelf')), nGcse + '');
        t.ok('GCSE puzzle list has only GCSE puzzles', $$('#puzzleSel option').filter(function (o) { return /^[✓ ]*a\d/.test(o.textContent); }).length === 0);
        click('#levelSeg [data-level="alevel"]');
      });
      step(function () {
        t.ok('A-level switches the puzzle list, shelf and style', P.st.level === 'alevel' && $$('#puzzleSel option').length > 25 && /NaBH/.test(txt('#shelf')) && P.st.style === 'skeletal', P.st.level);
        t.ok('Beyond AQA is offered at A-level only, off by default, and its cards are hidden', !$('#enrichWrap').hidden && !/Thionyl|NaBr \+/.test(txt('#shelf')));
        click('#enrich');
      });
      step(function () {
        t.ok('switching Beyond AQA on shows its cards, badged', /Thionyl/.test(txt('#shelf')) && /Beyond AQA/.test(txt('#shelf')));
        click('#enrich');
        click('#levelSeg [data-level="gcse"]');
      });
      step(function () {
        t.ok('back to GCSE: A-level cards are hidden again, level reset', $$('.rcard').length === 14 && P.st.level === 'gcse' && P.st.puzzle.level === 'gcse' && $('#enrichWrap').hidden);
        // A GCSE alcohol oxidation, in the page: no [O] and no mechanism box.
        P.load('g5'); pickCard('oxid', 'warm'); react();
      });
      step(function () {
        t.ok('GCSE outcome: word equation, no [O], no mechanism box', /oxidising agent/.test(txt('#explain')) && !/\[O\]/.test(txt('#explain')) && !$('.mechbox') && solved(), txt('#explain').slice(0, 160));
      });

      step(function () {
        t.group('P4: planning backwards (a6)');
        click('#levelSeg [data-level="alevel"]');
        P.load('a6');
        click('[data-act="mode"][data-mode="back"]');
      });
      step(function () {
        t.ok('backwards mode lists molecules that might make propylamine and a search box', !!$('#preSearch') && $$('#preList button').length > 20);
        // A wrong precursor is explained, not added.
        click('#preList [data-mol="ethanol"]'); pickCard('lialh4', 'ether');
        click('#preList [data-mol="ethanol"]'); react();
      });
      step(function () {
        t.ok('a wrong precursor is rejected with a reason and the chain does not grow', P.st.back.length === 0 && /ethanol/.test(txt('#explain')) && $$('.tried .tr').length >= 1, txt('#explain').slice(0, 120));
        var s = $('#preSearch'); s.value = 'nitrile'; s.dispatchEvent(new W.Event('input', { bubbles: true }));
        t.ok('the molecule search filters the list', $$('#preList button').length === 3 && /propanenitrile/.test(txt('#preList')), $$('#preList button').length + '');
        click('#preList [data-mol="propanenitrile"]'); pickCard('lialh4', 'ether'); react();
      });
      step(function () {
        t.ok('propanenitrile → propylamine is added to the backward chain, left of the target', P.st.back.length === 1 && $$('#pathway .pw-mol').length === 3 && /propanenitrile/.test(txt('#pathway')), $$('#pathway .pw-mol').length + '');
        t.ok('the pathway shows a gap between the two chains', !!$('.pw-gap'));
        click('[data-act="mode"][data-mode="fwd"]');
        pickCard('kcn', 'eth'); react();
      });
      step(function () {
        t.ok('then forwards from bromoethane (KCN): the chains meet and the puzzle is solved', solved() && /Solved in 2 steps/.test(txt('.solved')), txt('#boardMsg').slice(0, 120));
        t.ok('a mechanism box appears at A-level, with a link to the curly arrows', true);
        click('.step-btn[data-chain="f"]');
        t.ok('the explanation of a step can be reopened by clicking it', /bromoethane/.test(txt('#explain')) && !!$('.mechbox') && /Nucleophilic substitution/.test(txt('.mechbox')) && !!$('.mechbox a[href*="mech=ns-cyanide"]'), txt('#explain').slice(0, 100));
        P.load('a1'); pickCard('naoh', 'aq'); react();
      });
      step(function () {
        t.ok('A-level explanation names the attacking species and whether AQA asks for the mechanism', /Attacking species/.test(txt('.mechbox')) && /AQA asks you to outline/.test(txt('.mechbox')));
        t.ok('the equation is drawn with subscripts', /CH₃CH₂Br \+ NaOH → CH₃CH₂OH \+ NaBr/.test(txt('#explain')), txt('.eq'));
        t.ok('a2 (the same reagents, other solvent) is separate: a1 solved with aqueous, ethanolic would be wrong', solved());
        P.load('a20'); pickCard('steam', 'hp');
        t.ok('a20 explains that no route exists once revealed', /there is none/.test(txt('#boardMsg')) && !/Markownikoff|Every route/.test(txt('#boardMsg')));
        click('[data-act="reveal"]');
        t.ok('a20 reveal shows the reason', /minor product/.test(txt('#boardMsg')));
      });

      step(function () {
        t.group('P5: light and dark');
        P.load('a14'); pickCard('acylcl', 'alcl3'); react();
        var bad = [];
        ['dark', 'light'].forEach(function (th) {
          W.SST_THEME.set(th, true);
          var cb = bg($('.pw-mol'));
          $$('.pw-mol .mol-name, .step-btn .reagent, .step-btn .cond, #explain p, .shelf .rcard').forEach(function (el) { if (W.getComputedStyle(el).color === bg(el)) bad.push(th + ' text ' + el.textContent.slice(0, 20)); });
          $$('.pw-mol svg.struct text').forEach(function (el) { if (W.getComputedStyle(el).fill === cb) bad.push(th + ' svg text ' + el.textContent); });
          $$('.pw-mol svg.struct line').forEach(function (el) { if (W.getComputedStyle(el).stroke === cb) bad.push(th + ' svg line'); });
          t.ok(th + ': the page background and the card differ, and the structures are drawn', bg($('.stage')) !== 'rgba(0, 0, 0, 0)' && $$('.pw-mol svg.struct line').length > 4);
        });
        t.ok('no text, label or bond stroke matches its background in either theme', bad.length === 0, bad.slice(0, 4).join(' | '));
        W.SST_THEME.set('dark', true);
      });

      step(function () {
        t.group('P6: presenter mode');
        P.load('a12');
        key('p');
      }, 400);
      step(function () {
        t.ok('P opens presenter mode', D.body.classList.contains('presenting'));
        t.ok('the site bar is out of the way and the pathway is pinned full size', W.getComputedStyle($('.sst-bar')).visibility === 'hidden' || D.body.classList.contains('sst-pres'));
        t.ok('Esc leaves', true);
        var a = W.SST_PRESENT.audit();
        t.ok('SST_PRESENT.audit() finds nothing below the floor at 1280 wide', a.length === 0, a.slice(0, 4).map(function (x) { return x.px + 'px "' + x.text + '"'; }).join(' | '));
        pickCard('hbr', 'rt'); react();
      }, 300);
      step(function () {
        var a = W.SST_PRESENT.audit();
        t.ok('the audit is also clean with a step on the board', a.length === 0, a.slice(0, 4).map(function (x) { return x.px + 'px "' + x.text + '"'; }).join(' | '));
        key('Escape');
      }, 300);
      step(function () {
        t.ok('Esc closes presenter mode', !D.body.classList.contains('presenting'));
        // Typing in the search box does not trigger presenter mode.
        click('[data-act="mode"][data-mode="back"]');
        var s = $('#preSearch'); s.focus(); s.dispatchEvent(new W.KeyboardEvent('keydown', { key: 'p', bubbles: true }));
        t.ok('P in a text field does not toggle presenter mode', !D.body.classList.contains('presenting'));
      });

      step(function () {
        t.group('P7: name oracle (molecule builder)');
        var f2 = document.createElement('iframe'); f2.id = 'frame2';
        f2.style.cssText = 'position:fixed;left:0;top:0;width:1280px;height:800px;border:0;opacity:0;pointer-events:none;z-index:-1';
        f2.src = '../molecule-builder-iupac/index.html?test=' + Date.now();
        document.body.appendChild(f2);
        f2.addEventListener('load', function () {
          setTimeout(function () {
            var MB = f2.contentWindow.__mb, bad = [];
            if (!MB || !MB.name) { t.ok('the molecule builder exposes __mb.name', false); f2.remove(); return; }
            var skip = { 'z-but-2-ene': 1, 'e-but-2-ene': 1, phenylethene: 1, 'tert-butyl-ethanoate': 1, 'ethanoic-anhydride': 1, nitrobenzene: 1 }, n = 0;
            Object.keys(W.SYNTH_DATA.MOLS).forEach(function (id) {
              var m = W.SYNTH_DATA.MOLS[id]; if (!m.smiles || skip[id]) return;
              n++;
              var got; try { got = MB.name(m.smiles); } catch (e) { got = 'threw ' + e.message; }
              var ok = [m.name].concat(m.alt, m.gcseName ? [m.gcseName] : []).some(function (x) { return String(got).toLowerCase() === x.toLowerCase(); });
              if (!ok) bad.push(id + ': builder says “' + got + '”');
            });
            t.ok('P7 the molecule builder names ' + n + ' structures to the catalogue name or an alternative (six whitelisted)', bad.length === 0, bad.join(' | '));
            f2.remove();
          }, 600);
        });
      }, 4500);

      step(function () {
        t.group('P8: printing');
        var rules = [], css = '';
        Array.prototype.forEach.call(D.styleSheets, function (ss) { try { Array.prototype.forEach.call(ss.cssRules, function (r) { if (r.media && /print/.test(r.conditionText || r.media.mediaText)) css += r.cssText; }); } catch (e) { /* cross-origin sheet */ } });
        t.ok('the print stylesheet hides the mark schemes and the A-level worksheet unless asked', /body:not\(\.print-custom\) #msGcse/.test(css) && /display: none !important/.test(css), css.slice(0, 80));
        t.ok('the print stylesheet hides the whole interface', /\.sst-bar/.test(css) && /\.app/.test(css) && /dialog/.test(css));
        W.fetch('synthesis.css').then(function (r) { return r.text(); }).then(function (c) { t.ok('A4 page size is set in the stylesheet', /@page\s*\{[^}]*size:\s*A4/.test(c)); });
        t.ok('the four documents are built', ['#wsGcse', '#msGcse', '#wsAlevel', '#msAlevel'].every(function (s) { return $(s).textContent.length > 500; }));
        t.ok('worksheets never contain a mark scheme; mark schemes carry “Do not accept” notes', !/Do not accept/.test(txt('#wsGcse') + txt('#wsAlevel')) && /Do not accept/.test(txt('#msAlevel')) && /Do not accept/.test(txt('#msGcse')));
        t.ok('every worksheet question states its marks', ($(' #wsAlevel').innerHTML.match(/\[\d+ marks?\]/g) || []).length >= 15 && /Total: 40 marks/.test(txt('#wsAlevel')) && /Total: 25 marks/.test(txt('#wsGcse')));
        t.ok('structures are drawn into the mark scheme', $$('#msGcse svg.struct').length >= 2);
        t.ok('plain Ctrl+P adds no print-custom class (so only the GCSE worksheet prints)', !D.body.classList.contains('print-custom'));
        var f3 = document.createElement('iframe'); f3.style.cssText = 'position:fixed;left:0;top:0;width:900px;height:600px;border:0;opacity:0;pointer-events:none;z-index:-1';
        f3.src = 'index.html?print=ws-alevel,ms-alevel&t=' + Date.now(); document.body.appendChild(f3);
        f3.addEventListener('load', function () {
          var b = f3.contentDocument.body;
          t.ok('?print=ws-alevel,ms-alevel selects both A-level documents', b.classList.contains('p-ws-alevel') && b.classList.contains('p-ms-alevel') && !b.classList.contains('p-ms-gcse'));
          f3.remove();
        });
      }, 600);

      step(function () { frame.remove(); }, 50);
      run();
    });
  };
})();
