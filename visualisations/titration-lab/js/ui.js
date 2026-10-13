/* Titration Lab — the page.

   Wires the lab (lab.js) to the bench (bench.js) and the controls: choosing
   an experiment, the brief, the dock and apparatus actions, the method,
   results, the calculation with error-carried-forward checking, the reveal
   and the practical report, presenter mode and printing. Feedback is built
   from the lab's actual state and the student's own numbers. */
(function () {
  'use strict';
  var E = window.TitrationEngine, X = window.TitrationExperiments, L = window.TitrationLab, B = window.TitrationBench;

  function $(sel, root) { return (root || document).querySelector(sel); }
  function $$(sel, root) { return Array.prototype.slice.call((root || document).querySelectorAll(sel)); }
  function esc(s) { return String(s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  function f2(x) { return (Math.round(x * 100 + (x >= 0 ? 1e-7 : -1e-7)) / 100).toFixed(2); }
  function sf(x, n) { return E.fmtSig(x, n || 3); }
  // 2.39 × 10⁻³ style, for amounts.
  function sci(x, n) {
    if (x === null || !isFinite(x)) return '—';
    if (x === 0) return '0';
    var e = Math.floor(Math.log10(Math.abs(x))), m = x / Math.pow(10, e);
    if (Math.abs(+m.toFixed((n || 4) - 1)) >= 10) { e++; m /= 10; }
    if (e >= -2 && e <= 3) return E.fmtSig(x, n || 4);
    return m.toFixed((n || 4) - 1) + ' × 10<sup>' + (e < 0 ? '−' + (-e) : e) + '</sup>';
  }
  function num(text) { var v = parseFloat(String(text).replace(/\s/g, '').replace('×10^', 'e').replace(/x10\^/i, 'e')); return isFinite(v) ? v : null; }
  function closeTo(a, b, rel) { return a !== null && b !== null && isFinite(a) && isFinite(b) && Math.abs(a - b) <= Math.abs(b) * (rel || 0.005) + 1e-12; }
  function fm(id) { return (X.LABELS[id] || {}).formula || id; }
  function nm(id) { return (X.LABELS[id] || {}).name || id; }

  var ui = {
    view: 'picker', run: null, lab: null, scene: null, lens: null, sceneKind: null, choices: {},
    tab: null, hints: 0, lastKey: '', lastColour: null, raf: 0, last: 0, calc: {}, submitted: null, ticks: null, prepCalc: {}
  };

  /* ---------- Progress, kept in this browser only ---------- */
  var STORE = 'sst-titration-progress';
  function progress() { try { return JSON.parse(localStorage.getItem(STORE)) || {}; } catch (e) { return {}; } }
  function saveProgress(id, pct) {
    try {
      var p = progress(), r = p[id] || { attempts: 0, best: null };
      r.attempts++; if (pct !== null && (r.best === null || pct < r.best)) r.best = pct;
      p[id] = r; localStorage.setItem(STORE, JSON.stringify(p));
    } catch (e) { /* storage blocked: nothing to keep */ }
  }

  /* ---------- Challenge codes ---------- */
  function codeFor(run) { return run.def.num + '-' + run.seed.toString(36).toUpperCase(); }
  function parseCode(text) {
    var m = /^\s*(\d)\s*-\s*([0-9a-z]{1,8})\s*$/i.exec(text || '');
    if (!m) return null;
    var def = X.LIST.filter(function (d) { return d.num === +m[1]; })[0];
    var seed = parseInt(m[2], 36);
    return def && isFinite(seed) ? { id: def.id, seed: seed } : null;
  }
  function newSeed() { return (Math.floor(Math.random() * 0x7fffffff) ^ (Date.now() & 0xffff)) >>> 0 || 1; }

  /* ---------- Views ---------- */
  function show(view) {
    ui.view = view;
    $('#picker').hidden = view !== 'picker';
    $('#brief').hidden = view !== 'brief';
    $('#lab').hidden = view !== 'lab';
    $('#analyse').hidden = view !== 'analyse';
    document.body.classList.toggle('in-lab', view === 'lab');
    document.body.classList.toggle('in-analyse', view === 'analyse');
    $('#btnChange').hidden = view === 'picker';
    $('#hTitle').textContent = view === 'picker' || !ui.run ? 'Titration Lab' : 'Titration Lab: ' + ui.run.def.title;
    if (view !== 'lab') stopLoop(); else startLoop();
    if (view === 'lab' || view === 'analyse') renderStages();
    window.scrollTo(0, 0);
    if (window.SST_PRESENTER) setTimeout(function () { SST_PRESENTER.layout(); }, 30);
  }

  /* ---------- Picker ---------- */
  var GROUPS = [
    { key: 'gcse', title: 'GCSE: acid–alkali titrations', text: 'AQA GCSE Chemistry 4.4.2.5 and Required practical 2: strong acids and strong alkalis. Calculations in mol/dm³ and g/dm³ are Higher Tier (4.3.4).' },
    { key: 'alevel-ab', title: 'A-level: acid–base', text: 'AQA A-level Chemistry: Required practical 1, making a standard solution (3.1.2.5), and pH curves, titrations and indicators (3.1.12.5).' },
    { key: 'alevel-redox', title: 'A-level: redox with potassium manganate(VII)', text: 'AQA A-level Chemistry 3.2.5.5 redox titrations of Fe²⁺ and C₂O₄²⁻ with MnO₄⁻, and 3.2.5.6 autocatalysis by Mn²⁺.' }
  ];
  var MODE = { guided: 'Guided', independent: 'Independent', mystery: 'Mystery' };
  // GCSE or A-level first, so each level sees only its own experiments.
  var LEVELS = {
    gcse: { name: 'GCSE', groups: ['gcse'], spec: 'AQA GCSE Chemistry 4.4.2.5 · Required practical 2',
      what: ['Strong acid with strong alkali, with one indicator', 'Rough titration, then repeats to concordant titres', 'Concentration in mol/dm³, and g/dm³ at Higher Tier'] },
    alevel: { name: 'A-level', groups: ['alevel-ab', 'alevel-redox'], spec: 'AQA A-level Chemistry RP1 · 3.1.12.5 · 3.2.5.5 · 3.2.5.6',
      what: ['Required practical 1: make a standard solution', 'Weak acids and bases: choose the indicator from the pH curve', 'Redox titrations with potassium manganate(VII)'] }
  };
  var LEVEL_KEY = 'sst-titration-level';
  function savedLevel() { try { var v = localStorage.getItem(LEVEL_KEY); return LEVELS[v] ? v : null; } catch (e) { return null; } }
  function setLevel(v) { ui.level = v; try { if (v) localStorage.setItem(LEVEL_KEY, v); else localStorage.removeItem(LEVEL_KEY); } catch (e) { /* storage blocked */ } }
  function buildPicker() {
    var prog = progress(), html = '';
    if (ui.level === undefined) ui.level = savedLevel();
    if (!ui.level) {
      html += '<h2 class="level-q">Which course are you studying?</h2><div class="levels">' + Object.keys(LEVELS).map(function (k) {
        var L = LEVELS[k], n = X.LIST.filter(function (d) { return L.groups.indexOf(d.pathway) >= 0; }).length;
        return '<button type="button" class="level-btn" data-level="' + k + '"><span class="pill level">' + L.name + '</span><b>' + L.name + ' titrations</b><span class="spec">' + L.spec + '</span>' +
          '<ul>' + L.what.map(function (w) { return '<li>' + w + '</li>'; }).join('') + '</ul><span class="foot">' + n + ' experiments <span aria-hidden="true">→</span></span></button>';
      }).join('') + '</div>';
      $('#pickerGroups').innerHTML = html;
      $$('#pickerGroups [data-level]').forEach(function (b) { b.addEventListener('click', function () { setLevel(b.getAttribute('data-level')); buildPicker(); }); });
      return;
    }
    html += '<div class="level-bar"><span class="seg" role="group" aria-label="Course">' + Object.keys(LEVELS).map(function (k) {
      return '<button type="button" data-level="' + k + '" aria-pressed="' + (k === ui.level) + '">' + LEVELS[k].name + '</button>';
    }).join('') + '</span><span class="muted">' + LEVELS[ui.level].spec + '</span></div>';
    GROUPS.filter(function (g) { return LEVELS[ui.level].groups.indexOf(g.key) >= 0; }).forEach(function (g) {
      html += '<section class="group"><h2>' + g.title + '</h2><p>' + g.text + '</p><div class="cards">';
      X.LIST.filter(function (d) { return d.pathway === g.key; }).forEach(function (d) {
        var p = prog[d.id];
        var foot = d.pathway === 'alevel-redox' ? '<span class="swatch" style="background:#5d1d8f"></span> KMnO₄ · self-indicating' : d.prep ? 'Na₂CO₃ standard · HCl' : d.id === 'alevel-curves' ? 'weak acids and bases · choose an indicator' : 'strong acid · strong alkali';
        html += '<button type="button" class="card-btn" data-exp="' + d.id + '">' +
          '<span class="num">EXPERIMENT ' + d.num + '</span><b>' + d.title + '</b><span class="d">' + d.blurb + '</span>' +
          '<span class="meta"><span class="pill chem">Chemistry</span><span class="pill level">' + d.level + '</span><span class="pill mode">' + MODE[d.mode] + '</span></span>' +
          '<span class="foot">' + foot + (p ? ' · <span class="done">Done' + (p.best !== null ? ', best ' + p.best.toFixed(1) + ' % off' : '') + '</span>' : '') + '</span></button>';
      });
      html += '</div></section>';
    });
    $('#pickerGroups').innerHTML = html;
    $$('#pickerGroups .level-bar [data-level]').forEach(function (b) { b.addEventListener('click', function () { setLevel(b.getAttribute('data-level')); buildPicker(); }); });
    $$('#pickerGroups .card-btn').forEach(function (b) { b.addEventListener('click', function () { openBrief(b.getAttribute('data-exp'), newSeed()); }); });
  }

  /* ---------- Brief ---------- */
  function openBrief(id, seed, sample) {
    var def = X.byId(id);
    ui.level = def.pathway === 'gcse' ? 'gcse' : 'alevel';
    ui.setupMode = null;
    ui.run = X.instantiate(id, seed, sample || (def.samples ? ui.choices.sample || def.samples[0].key : undefined));
    ui.choices = { aliquot: 'pipette25', sample: ui.run.sample };
    renderBrief();
    show('brief');
    try { history.replaceState(null, '', '#exp=' + id + (ui.run.mystery ? '&code=' + codeFor(ui.run) : '')); } catch (e) { /* file:// */ }
  }

  function knownLine(sol, role, run) {
    var units = run.units;
    var where = role === 'titrant' ? 'In the burette' : (run.prep ? 'In the flask (25.00 cm³ portions)' : 'In the flask');
    var what = esc(nm(sol.id)) + ' (' + fm(sol.id) + ')';
    var c = sol.fromPrep ? 'your standard solution (you make it first)' : sol.known ? E.fmtSig(sol.conc_M, 3) + ' ' + units : '<b>unknown</b>';
    return '<dt>' + where + '</dt><dd>' + what + ', ' + c + (role === 'analyte' && !run.prep ? ', a 25.00 cm³ portion' : '') + '</dd>';
  }
  function renderBrief() {
    var run = ui.run, def = run.def, units = run.units;
    $('#briefKicker').textContent = 'Experiment ' + def.num + ' · ' + def.level + ' · ' + MODE[def.mode];
    $('#briefTitle').textContent = def.title;
    $('#briefChips').innerHTML = def.spec.map(function (s) { return '<span class="chip chem">' + esc(s) + '</span>'; }).join('') +
      '<span class="pill level">' + def.level + '</span>' + (def.prereq ? '<span class="muted" style="font-size:.85rem">Before this: ' + esc(def.prereq) + '</span>' : '');
    var u = run.unknownSolution, task;
    if (run.prep) task = 'Make 250.0 cm³ of a standard solution of anhydrous sodium carbonate, about 0.100 mol dm⁻³. Then titrate 25.00 cm³ portions of it with the hydrochloric acid to find the acid’s concentration.';
    else task = 'Find the concentration of the ' + esc(nm(u.id)) + ' in ' + units + (run.gcse ? ' and, at Higher Tier, in g/dm³' : '') + '.';
    var h = '<h3>Your task</h3><p>' + task + '</p>';
    h += '<h3>What you have</h3><dl class="know">' + knownLine(run.titrant, 'titrant', run) + knownLine(run.analyte, 'analyte', run);
    if (run.type === 'acid-base') h += '<dt>Indicator</dt><dd>' + (run.chooseIndicator ? 'your choice, from the bottles on the bench' : E.INDICATORS[run.indicator].name) + '</dd>';
    else h += '<dt>Indicator</dt><dd>none needed: manganate(VII) is self-indicating</dd><dt>Acids on the bench</dt><dd>dilute sulfuric, hydrochloric and nitric acid: choose one to acidify the flask</dd>';
    h += '</dl>';
    if (run.type === 'acid-base') h += '<p>Equation: <span class="eqn">' + run.eq.molecular + '</span></p>';
    else h += '<details class="hint"><summary>Half-equations (if you need them)</summary><p><span class="eqn">' + X.HALF.MnO4 + '</span></p><p><span class="eqn">' + (run.analyte.id === 'Fe2' ? X.HALF.Fe : X.HALF.C2O4) + '</span></p><p class="muted">You’ll choose the overall ionic equation when you calculate.</p></details>';
    if (run.prep) {
      var std = run.standard;
      h += '<h3>The standard solution</h3><p>Anhydrous sodium carbonate is a primary standard: it can be bought very pure, it is stable, and (dried in an oven and kept in a desiccator) it doesn’t take in water from the air, so the mass you weigh is the mass of Na<sub>2</sub>CO<sub>3</sub>. M<sub>r</sub>(Na<sub>2</sub>CO<sub>3</sub>) = ' + std.Mr.toFixed(1) + ' (Na 23.0, C 12.0, O 16.0). The balance reads to 0.01 g.</p>';
    }
    if (run.type === 'acid-base' && !run.gcse) {
      h += '<h3>Indicator data</h3><table class="mini"><thead><tr><th>Indicator</th><th>pH range</th><th>Colour: acid → alkali</th></tr></thead><tbody>' +
        run.indicatorOptions.map(function (id) { var i = E.INDICATORS[id]; return '<tr><td>' + i.name + '</td><td>' + i.range[0].toFixed(1) + ' – ' + i.range[1].toFixed(1) + '</td><td>' + i.acidColour + ' → ' + i.alkaliColour + '</td></tr>'; }).join('') + '</tbody></table>';
    }
    h += '<h3>How this works</h3><ol class="howto">' + (run.prep ? '<li><b>Make the standard solution</b> of sodium carbonate.</li>' : '') +
      '<li><b>Set up.</b> Click the apparatus on the bench, one step at a time. In <i>Learn</i> the next piece is highlighted and the method writes itself beside the bench; <i>Test me</i> asks for the same clicks from memory.</li>' +
      '<li><b>Titrate.</b> Read the burette, add the titrant and swirl until the colour changes, then read it again. Repeat until your titres are concordant.</li>' +
      '<li><b>Calculate</b> the concentration from the mean of your concordant titres, step by step or worked out for you.</li></ol>' +
      (run.mode === 'guided' ? '' : '<p class="muted">Readings are checked only for format: misread the burette and it shows in your results.</p>');
    if (run.mystery) h += '<h3>Challenge code</h3><p><b class="bigfig">' + codeFor(run) + '</b><br><span class="muted">Share it so others get the same unknown. The answer is worked out in your browser, so it isn’t hidden from anyone who reads the page’s code: it’s a practice challenge, not a test.</span></p>';
    $('#briefBody').innerHTML = h;

    var c = '';
    if (run.def.samples) {
      c += '<fieldset><legend>Sample to titrate</legend>' + run.def.samples.map(function (s) {
        return '<label class="opt"><input type="radio" name="sample" value="' + s.key + '"' + (s.key === run.sample ? ' checked' : '') + '><span>' + esc(s.label) + '</span></label>';
      }).join('') + '</fieldset>';
    }
    if (run.chooseAliquot) {
      c += '<fieldset><legend>Measure the 25 cm³ portion with</legend>' + run.aliquotOptions.map(function (k) {
        var a = E.APPARATUS[k];
        return '<label class="opt"><input type="radio" name="aliquot" value="' + k + '"' + (k === ui.choices.aliquot ? ' checked' : '') + '><span>' + a.label + '<small>Class B, ±' + a.tolerance_cm3 + ' cm³</small></span></label>';
      }).join('') + '</fieldset>';
    } else c += '<p class="muted">The apparatus is set out for you: a 50.00 cm³ burette, a 25.00 cm³ volumetric pipette with a filler, conical flasks, a funnel, a white tile and distilled water.</p>';
    $('#briefChoices').innerHTML = c;
    $$('#briefChoices input[name="sample"]').forEach(function (r) {
      r.addEventListener('change', function () { ui.choices.sample = r.value; openBrief(run.id, run.seed, r.value); });
    });
    var safety = ['Wear eye protection.'];
    if (run.type === 'acid-base') safety.push(run.gcse ? 'Dilute acids and alkalis are irritants; sodium hydroxide is especially harmful to eyes. Wash spills off skin with plenty of water.' : 'Sodium hydroxide and the acids are irritants or corrosive at higher concentrations; ammonia solution gives off an irritating vapour.');
    else safety.push('Potassium manganate(VII) is an oxidising agent and stains skin and clothes. Dilute sulfuric acid is an irritant.');
    if (run.warm) safety.push('Warm the flask in a water bath to about 60 °C. Don’t boil it, and hold the hot flask with a cloth or tongs.');
    safety.push('Always use a pipette filler: never pipette by mouth. Fill the burette below eye level, with the funnel, and remove the funnel afterwards.');
    $('#briefSafety').innerHTML = safety.map(function (s) { return '<li>' + s + '</li>'; }).join('');
  }

  /* ---------- Starting the lab ----------
     Three stages, one clear action at a time:
       setup     each step of the method is one click on the apparatus. Learn
                 highlights it and writes the method up as you go; Test me
                 asks for the same clicks from memory.
       titrate   the side panel becomes the titration: read, add, read again,
                 repeat until the titres are concordant.
       calc      the analyse view: the mean of the concordant titres and the
                 calculation, step by step or worked out.
     RP1 makes its standard solution first, with its own panel of actions. */
  function startLab() {
    var run = ui.run;
    var picked = $('#briefChoices input[name="aliquot"]:checked');
    if (picked) ui.choices.aliquot = picked.value;
    run.aliquotDeviceKind = E.APPARATUS[ui.choices.aliquot || 'pipette25'].kind;
    ui.lab = L.create(run, { choices: { aliquot: ui.choices.aliquot } });
    ui.hints = 0; ui.calc = {}; ui.submitted = null; ui.ticks = null; ui.prepCalc = {}; ui.lastColour = null;
    ui.tickV = null; ui.meanV = null; ui.reading = false; ui.auto = false;
    // Learn first for the guided experiment and for RP1, whose solution is new to
    // everyone; Test me for the rest. Chosen afresh for each experiment opened.
    if (!ui.setupMode) ui.setupMode = run.mode === 'guided' || run.prep ? 'learn' : 'test';
    ui.inPrep = !!run.prep;
    ui.stage = ui.inPrep ? 'prep' : 'setup';
    newSetup();
    buildScene();
    show('lab');
    feedback(null);
    refresh(true);
  }
  function newSetup() { ui.setup = { done: {}, log: [], mistakes: 0, hints: 0, wrong: 0, showNext: false, last: null, note: null }; }
  // Learn and Test me each start the set-up from a clean bench.
  function restartSetup(mode) {
    ui.setupMode = mode;
    var prep = ui.lab.state.prep;
    ui.lab = L.create(ui.run, { choices: { aliquot: ui.choices.aliquot } });
    if (prep && ui.stage !== 'prep') ui.lab.state.prep = prep;
    if (ui.stage === 'prep') ui.prepCalc = {};
    newSetup(); ui.lastColour = null; ui.reading = false;
    buildScene();
    feedback(null);
    refresh(true);
  }

  function buildScene() {
    var run = ui.run, svg = $('#benchSvg'), lens = $('#lensSvg');
    if (ui.inPrep) {
      ui.scene = new B.PrepScene(svg, run); ui.lens = new B.NeckLens(lens); ui.sceneKind = 'prep';
      $('#lensCap').textContent = 'Bottom of the meniscus on the mark';
      svg.setAttribute('aria-label', 'Balance with weighing bottle, beaker with glass rod, 250.0 cm³ volumetric flask, deionised water and dropper.');
    } else {
      ui.scene = new B.TitrationScene(svg, run); ui.lens = new B.BuretteLens(lens, run); ui.sceneKind = 'titration';
      $('#lensCap').innerHTML = run.titrant.id === 'KMnO4' ? '<span class="cap-long">Too dark to see through: </span>read the top of the meniscus' : 'Read the bottom of the meniscus';
      $('#lensBox').title = 'Magnified burette scale at the meniscus. Each small division is 0.10 cm³.';
      svg.setAttribute('aria-label', 'Clamp stand holding a 50 cm³ burette, with a conical flask, white tile, waste beaker, reagent bottles, ' + (run.type === 'redox' ? 'acids' : 'indicators') + ', wash bottle, funnel and pipette. Click the apparatus to use it.');
    }
    svg.querySelectorAll('text').forEach(function (t) { t.setAttribute('data-fs', t.getAttribute('font-size') || '13'); });
    $('#clock').hidden = !(run.type === 'redox' && run.warm);
    buildTitrate();
    sizeForBoard();
  }

  /* ---------- The animation loop ---------- */
  function frame(t) {
    var dt = ui.last ? Math.min(0.1, (t - ui.last) / 1000) : 0;
    ui.last = t;
    var lab = ui.lab;
    if (lab) {
      lab.tick(dt);
      if (lab.state.stopMsg) { feedback({ kind: 'info', msg: lab.state.stopMsg }); lab.state.stopMsg = null; }
      ui.scene.update(lab, dt);
      ui.lens.update(lab);
      // New scale numbers in the lens need their board size.
      if (ui.lens.redrawn) { ui.lens.redrawn = false; if (document.body.classList.contains('presenting')) sizeForBoard(['#lensSvg']); }
      paintChip();
      liveAmount();
      var key = stateKey();
      if (key !== ui.lastKey) { ui.lastKey = key; refresh(); }
    }
    ui.raf = requestAnimationFrame(frame);
  }
  function startLoop() { if (!ui.raf) { ui.last = 0; ui.raf = requestAnimationFrame(frame); } }
  function stopLoop() { if (ui.raf) cancelAnimationFrame(ui.raf); ui.raf = 0; }
  // What, if it changed, means the panels need redrawing.
  function stateKey() {
    var s = ui.lab.state, b = s.burette, t = s.trial, p = s.prep;
    return [ui.stage, ui.reading, b.reading === null, b.funnel, b.tap, b.pending > 0, b.jetAir > 0, b.reading !== null && b.reading < 0, s.flaskState, s.under, s.tile, s.keepSwirling,
      t ? [t.initialRec, t.kind, t.acid, t.warmedTo, s.flask && s.flask.indicator].join('/') : '-', s.trials.length, s.flask ? s.flask.describe().key : '',
      p ? [p.m0, p.m1, p.m2, p.tipped, p.dissolved, p.poured, p.funnel, p.stoppered, p.inversions, p.finished, p.rinses.beaker, p.rinses.rod, p.rinses.funnel, p.bottleRinsed, Math.round(p.flaskWater_cm3 * 20)].join('/') : ''].join('|');
  }

  /* ---------- Colour chip and live announcements ---------- */
  function paintChip() {
    var s = ui.lab.state, chip = $('#colourChip');
    if (ui.sceneKind !== 'titration' || !s.flask || s.flask.totalVol() <= 0) { chip.classList.add('off'); return; }
    chip.classList.remove('off');
    var d = s.flask.describe(), ap = s.flask.appearance();
    var col = B.liquidColour(ap.abs, B.C.white);
    var clear = ap.abs[0] + ap.abs[1] + ap.abs[2] < 0.03;
    var label = 'Flask: ' + d.text + (s.swirlAnim > 0 ? ' (swirling)' : s.flask.un.vol > 0.003 ? ' (not yet swirled)' : '');
    var span = chip.querySelector('span');
    if (span.textContent !== label) span.textContent = label;
    chip.querySelector('i').style.background = clear ? 'transparent' : 'rgb(' + col.map(Math.round).join(',') + ')';
    if (d.key !== ui.lastColour) {
      if (ui.lastColour !== null) announce('The flask is now ' + d.text + '.');
      ui.lastColour = d.key;
    }
    if (!$('#clock').hidden) {
      var tt = Math.floor(s.time), txt = 'Time ' + Math.floor(tt / 60) + ':' + ('0' + tt % 60).slice(-2) + (s.flask ? ' · ' + Math.round(s.flask.T) + ' °C' : '');
      if ($('#clock').textContent !== txt) $('#clock').textContent = txt;
    }
  }
  var liveTimer = 0;
  function announce(text) { clearTimeout(liveTimer); liveTimer = setTimeout(function () { $('#srLive').textContent = text; }, 150); }

  /* ---------- The prompt: what just happened, big, above the bench ---------- */
  var KIND = { good: 'Good', mistake: 'Careful', invalid: 'Not yet', retry: 'Try again', harmless: 'Fine', alternative: 'That works', info: '' };
  function say(text, cls) {
    var p = $('#promptSay'), h = text ? (cls === 'done' ? '<span class="tick" aria-hidden="true">✓</span> ' : '') + text : '';
    if (p.innerHTML !== h) p.innerHTML = h;
    p.className = 'prompt-say' + (cls ? ' ' + cls : '');
  }
  function feedback(r) {
    var box = $('#feedback');
    if (!r || !r.msg) { box.textContent = ''; box.className = 'feedback'; return; }
    var kind = r.kind;
    box.className = 'feedback ' + kind;
    box.innerHTML = (KIND[kind] ? '<span class="tag">' + KIND[kind] + '.</span> ' : '') + r.msg;
  }
  function act(fn) {
    var r = fn();
    if (r) feedback(r);
    ui.lastKey = '';
    refresh();
    return r;
  }

  /* ---------- Stage strip ---------- */
  function stageList() {
    var l = [];
    if (ui.run && ui.run.prep) l.push(['prep', 'Make the standard']);
    return l.concat([['setup', 'Set up'], ['titrate', 'Titrate'], ['calc', 'Calculate']]);
  }
  function renderStages() {
    var cur = ui.view === 'analyse' ? 'calc' : ui.stage, list = stageList();
    var idx = list.map(function (x) { return x[0]; }).indexOf(cur);
    var h = list.map(function (st, i) {
      return '<li class="' + (i < idx ? 'done' : i === idx ? 'now' : '') + '"' + (i === idx ? ' aria-current="step"' : '') + '><span class="n" aria-hidden="true">' + (i < idx ? '✓' : i + 1) + '</span>' + st[1] + '</li>';
    }).join('');
    ['#stages', '#stagesAn'].forEach(function (sel) { var e = $(sel); if (e && e.innerHTML !== h) e.innerHTML = h; });
  }

  /* ---------- Stage 1: set up, one click on the apparatus per step ---------- */
  var ACIDS = { HCl: 1, H2SO4: 1, HNO3: 1, CH3COOH: 1 };
  // How the endpoint looks, in words, for the method.
  function endpointWords() {
    var run = ui.run, s = ui.lab.state;
    if (run.type === 'redox') return 'until the first pale pink colour stays';
    var id = (s.flask && s.flask.indicator) || (s.trials[0] || {}).indicator || run.indicator;
    var ind = E.INDICATORS[id];
    if (!ind) return 'until the indicator just changes colour';
    var acidIn = !!ACIDS[run.titrant.id];
    var from = acidIn ? ind.alkaliColour : ind.acidColour;
    var to = id === 'methylOrange' ? 'orange' : id === 'bromothymolBlue' ? 'green' : acidIn ? ind.acidColour : 'pale ' + ind.alkaliColour;
    return 'until the indicator just changes from ' + from + ' to ' + to;
  }
  function setupSteps() {
    if (ui.stage === 'prep') return prepSteps();
    var run = ui.run, lab = ui.lab, s = lab.state, redox = run.type === 'redox';
    var tN = nm(run.titrant.id), aN = run.prep ? 'sodium carbonate solution' : nm(run.analyte.id);
    if (!/solution|sample/.test(aN)) aN += ' solution';
    var pip = s.device.kind === 'pipette';
    var L = [
      { id: 'rinse-water', part: 'wash', needs: [], say: 'Rinse the burette with distilled water',
        method: 'Rinse the burette with distilled water.', why: 'It washes out anything left from before.',
        act: function () { return lab.rinseBurette('water'); } },
      { id: 'rinse-titrant', part: 'titrant', needs: ['rinse-water'], say: 'Rinse the burette with a little ' + tN,
        method: 'Rinse it again with a little of the ' + tN + ', and run this to waste.', why: 'Water left inside would dilute the ' + tN + ', so the titre would come out too big.',
        act: function () { return lab.rinseBurette('titrant'); } },
      { id: 'funnel-in', part: 'funnel', needs: ['rinse-titrant'], say: 'Put the funnel in the top of the burette',
        method: 'Close the tap and put a small funnel in the top of the burette.', why: 'The top is too narrow to pour into safely.',
        act: function () { return lab.setFunnel(true); } },
      { id: 'fill', part: 'titrant', needs: ['funnel-in'], say: 'Fill the burette with ' + tN,
        method: 'Fill the burette with the ' + tN + ' through the funnel, with the burette below eye level.', why: 'Below eye level, so a splash can’t reach your eyes.',
        act: function () { return lab.fillBurette(); } },
      { id: 'funnel-out', part: 'funnel', needs: ['fill'], say: 'Take the funnel out of the burette',
        method: 'Remove the funnel.', why: 'Drops left in it could drip in later and change the reading.',
        act: function () { return lab.setFunnel(false); } },
      { id: 'waste', part: 'waste', needs: ['fill'], say: 'Put the waste beaker under the burette',
        method: 'Put a beaker under the burette to catch waste.', why: 'The next step runs a little ' + tN + ' out.',
        act: function () { return lab.place('waste'); } },
      { id: 'jet', part: 'tap', needs: ['waste'], say: 'Open the tap to fill the jet below it',
        method: 'Open the tap and run a little out, so the jet below the tap is full and the level is on the scale.', why: 'Air left in the jet would come out during the titration and make the titre too big.',
        act: function () { return lab.primeJet(); } }
    ];
    if (pip) L.push({ id: 'rinse-pipette', part: 'pipette', needs: [], say: 'Rinse the pipette with the ' + aN,
      method: 'Rinse a 25.00 cm³ volumetric pipette with a little of the ' + aN + '.', why: 'Water left inside would dilute the portion you measure.',
      act: function () { return lab.rinsePipette('analyte'); } });
    L.push({ id: 'portion', part: 'flask', needs: pip ? ['rinse-pipette'] : [], say: (pip ? 'Pipette 25.00 cm³ of ' : 'Measure 25 cm³ of ') + aN + ' into the conical flask',
      method: pip ? 'Use the pipette and a pipette filler to transfer 25.00 cm³ of the ' + aN + ' into a conical flask. Let it drain and touch the tip on the flask.' : 'Measure 25 cm³ of the ' + aN + ' with the measuring cylinder and pour it into a conical flask.',
      why: pip ? 'The pipette is calibrated to leave the last drop in its tip: don’t blow it out.' : 'A pipette would measure it twenty times more precisely.',
      act: function () { return lab.pipette('touch'); } });
    var last = 'portion';
    if (!redox) {
      var opts = run.chooseIndicator ? run.indicatorOptions : [run.indicator];
      var right = run.chooseIndicator ? opts.filter(function (id) { var v = lab.indicatorVerdict(id); return v && v.suitable; }) : opts;
      L.push({ id: 'indicator', part: 'indicator', needs: ['portion'], right: right,
        say: right.length === 1 ? 'Add a few drops of ' + E.INDICATORS[right[0]].name.toLowerCase() : 'Add a few drops of indicator',
        sayFor: function (id) { return 'Add a few drops of ' + E.INDICATORS[id].name.toLowerCase(); },
        methodFor: function (id) { var i = E.INDICATORS[id]; return 'Add 2 or 3 drops of ' + i.name.toLowerCase() + ' indicator.' + (run.chooseIndicator ? ' Its colour change (pH ' + i.range[0].toFixed(1) + '–' + i.range[1].toFixed(1) + ') is in the steep part of the pH curve for this titration.' : ''); },
        why: 'The indicator shows the endpoint. Only a few drops: indicators are weak acids themselves.',
        wrongWhy: function (id) { var v = lab.indicatorVerdict(id); return v ? v.why : 'That indicator isn’t suitable here.'; },
        act: function (id) { return lab.addIndicator(id); } });
      last = 'indicator';
    } else {
      L.push({ id: 'acid', part: 'acid', needs: ['portion'], right: ['H2SO4'], say: 'Add about 10 cm³ of dilute sulfuric acid',
        method: 'Add about 10 cm³ of dilute sulfuric acid to the flask.', why: 'MnO₄⁻ needs H⁺ ions to be reduced all the way to Mn²⁺.',
        wrongWhy: function (id) { return id === 'HCl' ? 'Not hydrochloric acid: manganate(VII) oxidises chloride ions to chlorine, so some titrant would be used up and the titre would come out too big.' : 'Not nitric acid: it is an oxidising agent itself, so it would react with what you are titrating.'; },
        act: function (id) { return lab.addAcid(id); } });
      last = 'acid';
      if (run.warm) {
        L.push({ id: 'warm', part: 'flask', needs: ['acid'], say: 'Warm the flask to about 60 °C',
          method: 'Warm the flask to about 60 °C in a water bath.', why: 'The reaction is slow at room temperature until Mn²⁺ builds up and catalyses it.',
          act: function () { return lab.warm(60); } });
        last = 'warm';
      }
    }
    L.push({ id: 'tile', part: 'tile', needs: [], say: 'Put the white tile under the burette',
      method: 'Put a white tile on the base of the stand, under the burette.', why: 'The first faint colour change shows up clearly against white.',
      act: function () { return lab.setTile(true); } });
    L.push({ id: 'under', part: 'flask', needs: ['jet', 'funnel-out', 'tile', last], say: 'Stand the flask on the tile under the burette',
      method: 'Stand the conical flask on the white tile under the burette.', why: 'Now the titration can start.',
      act: function () { return lab.place('flask'); } });
    return L;
  }
  // The rest of the method, for the end of the set-up.
  function methodTail() {
    if (ui.stage === 'prep') return ['Calculate the concentration from the mass used: amount = mass ÷ ' + ui.run.standard.Mr.toFixed(1) + ' g mol⁻¹, then concentration = amount ÷ 0.2500 dm³.'];
    var run = ui.run, tN = nm(run.titrant.id), redox = run.type === 'redox';
    return [
      'Read the burette at eye level, from the ' + (redox ? 'top' : 'bottom') + ' of the meniscus, and record the initial reading to 2 decimal places.',
      'Add the ' + tN + ' from the burette, swirling the flask, ' + endpointWords() + '. Record the final reading. Titre = final reading − initial reading.',
      'This first, rough titration shows roughly where the endpoint is. Repeat: add quickly to about 1 cm³ before it, then drop by drop, swirling after each drop.',
      'Repeat until you have concordant titres, within ' + run.concordanceTol_cm3.toFixed(2) + ' cm³ of each other, and take their mean.'
    ];
  }
  var PART_NAME = { balance: 'balance', beaker: 'beaker', rod: 'glass rod', vflask: 'volumetric flask', stopper: 'stopper', dropper: 'dropper', solid: 'jar of sodium carbonate', wash: 'wash bottle', funnel: 'funnel', waste: 'waste beaker', tap: 'tap on the burette', pipette: 'pipette', flask: 'conical flask', tile: 'white tile', burette: 'burette' };
  function partName(st) {
    var run = ui.run;
    if (st.part === 'titrant') return 'bottle of ' + nm(run.titrant.id);
    if (st.part === 'indicator') return st.right.length === 1 ? E.INDICATORS[st.right[0]].name.toLowerCase() + ' bottle' : 'indicator';
    if (st.part === 'acid') return 'dilute sulfuric acid';
    return PART_NAME[st.part] || st.part;
  }
  function setupState() {
    var st = ui.setup, steps = setupSteps();
    var left = steps.filter(function (x) { return !st.done[x.id]; });
    return { steps: steps, next: left[0] || null, left: left,
      avail: left.filter(function (x) { return x.needs.every(function (n) { return st.done[n]; }); }) };
  }
  function cueFor(step) {
    if (!step) return [];
    if (step.right) return step.right.map(function (id) { return { part: step.part, id: id }; });
    return [{ part: step.part }];
  }
  function setupClick(part, id) {
    var st = ui.setup, ss = setupState(), learn = ui.setupMode === 'learn';
    if (!ss.next) return;
    var cand = learn ? (ss.next.part === part ? ss.next : null) : ss.avail.filter(function (x) { return x.part === part; })[0];
    if (!cand) {
      if (learn) { st.note = { kind: 'info', msg: 'Click the highlighted ' + partName(ss.next) + '.' }; return renderSetup(); }
      st.mistakes++; st.wrong++;
      var later = ss.left.filter(function (x) { return x.part === part; })[0];
      st.note = { kind: 'invalid', msg: later ? 'Something else has to be done before that.' : 'That isn’t part of the next step.' };
      return renderSetup();
    }
    if (cand.right && cand.right.indexOf(id) < 0) {
      if (!learn) { st.mistakes++; st.wrong++; }
      st.note = { kind: 'mistake', msg: cand.wrongWhy(id) };
      return renderSetup();
    }
    var r = cand.act(id);
    if (!r.ok) { st.note = { kind: r.kind, msg: r.msg }; return renderSetup(); }
    st.done[cand.id] = true;
    st.log.push({ id: cand.id, method: cand.methodFor ? cand.methodFor(id) : cand.method, why: cand.why });
    st.last = cand.sayFor ? cand.sayFor(id) : cand.say;
    st.wrong = 0; st.showNext = false;
    st.note = r.kind === 'mistake' ? { kind: 'mistake', msg: r.msg } : null;
    announce(st.last + '.');
    ui.lastKey = '';
    refresh();
  }
  // Teacher's shortcut: do every remaining step.
  function skipSetup() {
    var st = ui.setup, guard = 0, ss;
    while ((ss = setupState()).next && guard++ < 40) {
      var x = ss.next, id = x.right ? x.right[0] : undefined, r = x.act(id);
      if (!r.ok) break;
      st.done[x.id] = true;
      st.log.push({ id: x.id, method: x.methodFor ? x.methodFor(id) : x.method, why: x.why });
    }
    st.last = 'Set up for you'; st.skipped = true; st.note = null;
    ui.lastKey = ''; refresh();
  }
  function renderSetup() {
    var st = ui.setup, ss = setupState(), learn = ui.setupMode === 'learn', total = ss.steps.length, n = total - ss.left.length;
    // Mode switch.
    var mode = '<span class="seg" role="group" aria-label="Set-up mode"><button type="button" data-mode="learn" aria-pressed="' + learn + '">Learn</button><button type="button" data-mode="test" aria-pressed="' + !learn + '">Test me</button></span>' +
      (ss.next ? '<button class="btn sm ghost" type="button" id="skipSetup" title="Do the remaining steps for me">Skip set-up</button>' : '');
    if ($('#setupMode').innerHTML !== mode) {
      $('#setupMode').innerHTML = mode;
      $$('#setupMode [data-mode]').forEach(function (b) {
        b.addEventListener('click', function () {
          var m = b.getAttribute('data-mode');
          if (m === ui.setupMode) return;
          if (n > 0 && !confirm('Start the set-up again in ' + (m === 'learn' ? 'Learn' : 'Test me') + ' mode?')) return;
          restartSetup(m);
        });
      });
      if ($('#skipSetup')) $('#skipSetup').addEventListener('click', skipSetup);
    }
    // The prompt above the bench.
    var counter = '<span class="count">' + (!ss.next ? 'All ' + total + ' steps' : st.last ? 'Step ' + n + ' of ' + total : total + ' steps') + '</span>';
    var prep = ui.stage === 'prep', task = prep ? 'make the standard solution' : 'set up the titration';
    if (!ss.next) say(counter + (prep ? 'Standard solution made: now work out its concentration' : st.skipped ? 'Set up for you: ready to titrate' : 'Set-up complete: ready to titrate'), 'done');
    else if (st.last) say(counter + st.last, 'done');
    else say(counter + (learn ? (prep ? 'Make the standard solution' : 'Set up the titration') + ': click the highlighted apparatus' : 'Test me: ' + task + ' from memory'), 'start');
    if (st.note) feedback(st.note);
    else if (!ss.next) feedback({ kind: 'good', msg: prep ? 'Calculate the concentration of your solution in the panel, then go on to the titration.' : 'Everything is ready. Start the titration from the panel.' });
    else if (learn) feedback({ kind: 'info', msg: 'Next: click the highlighted <b>' + partName(ss.next) + '</b>.' });
    else feedback({ kind: 'info', msg: 'Click the apparatus in the order you would use it.' + (st.mistakes ? ' Mistakes so far: ' + st.mistakes + '.' : '') });
    // The cue on the bench.
    ui.scene.setCue(ss.next && (learn || st.showNext) ? cueFor(st.showNext ? ss.avail[0] || ss.next : ss.next) : []);
    // The method, written up as it is done; once it is complete, the way on first.
    var h = '';
    if (!ss.next) {
      if (!learn && !st.skipped) h += '<p class="verdict ' + (st.mistakes ? 'warn' : 'good') + '">' + (prep ? 'Made' : 'Set up') + (st.mistakes ? ' with ' + st.mistakes + ' mistake' + (st.mistakes === 1 ? '' : 's') : ' with no mistakes') + (st.hints ? ' and ' + st.hints + ' hint' + (st.hints === 1 ? '' : 's') : '') + '.</p>';
      if (prep) h += prepCalcHtml('conc');
      else h += '<button class="btn primary wide" type="button" id="toTitrate">Start the titration</button>';
      if (learn) h += '<button class="btn sm wide" type="button" id="toTest">Now test me on ' + (prep ? 'making the solution' : 'the set-up') + '</button>';
      h += '<hr class="sep">';
    }
    if (learn || !ss.next) {
      $('#methodTitle').textContent = ss.next ? 'Method' : (learn ? 'Your method' : 'The method');
      if (prep && !st.log.length) h += prepCalcHtml('mass');
      if (!st.log.length) h += '<p class="muted">Each step appears here as you click it. By the end you’ll have the whole method.</p>';
      h += '<ol class="steps method">' + st.log.map(function (x, i) {
        return '<li class="done' + (i === st.log.length - 1 && ss.next ? ' now' : '') + '">' + x.method + (learn && x.why ? '<span class="why">' + x.why + '</span>' : '') + '</li>';
      }).join('');
      if (!ss.next) h += methodTail().map(function (x) { return '<li class="tail">' + x + '</li>'; }).join('');
      h += '</ol>';
    } else {
      $('#methodTitle').textContent = 'Test me';
      h += '<p>' + (prep ? 'Make the standard solution' : 'Set up the titration') + ' from memory: click each piece of apparatus in the order you would use it. There’s no method to follow and nothing is highlighted.</p>';
      h += '<div class="score"><div><b>' + n + '</b><span>of ' + total + ' steps</span></div><div><b>' + st.mistakes + '</b><span>mistake' + (st.mistakes === 1 ? '' : 's') + '</span></div><div><b>' + st.hints + '</b><span>hint' + (st.hints === 1 ? '' : 's') + '</span></div></div>';
      h += '<button class="btn sm" type="button" id="hintNext"' + (st.showNext ? ' disabled' : '') + '>' + (st.showNext ? 'Highlighted on the bench' : 'Show me the next step') + '</button>';
    }
    $('#methodBody').innerHTML = h;
    if (prep) wirePrepCalc();
    var hn = $('#hintNext');
    if (hn) hn.addEventListener('click', function () { st.showNext = true; st.hints++; ui.hints++; renderSetup(); });
    if ($('#toTitrate')) $('#toTitrate').addEventListener('click', function () { ui.stage = 'titrate'; feedback(null); refresh(true); });
    if ($('#toTest')) $('#toTest').addEventListener('click', function () { restartSetup('test'); });
    var list = $('#methodBody ol.method'), card = $('#method');
    if (!ss.next) card.scrollTop = 0;
    else if (list && list.lastElementChild) { var li = list.lastElementChild; card.scrollTop = Math.max(0, li.offsetTop - card.offsetTop - card.clientHeight + li.offsetHeight + 20); }
    boardNotes();
  }

  /* ---------- Stage 2: the titration ---------- */
  function titrateState() {
    var s = ui.lab.state, t = s.trial;
    if (!t && s.flaskState === 'done') return 'done';
    if (!t || t.initialRec === null) return 'initial';
    return ui.reading ? 'final' : 'add';
  }
  function trialName(t) {
    if (!t) return '';
    if (t.kind === 'rough') return 'Rough titration';
    var list = ui.lab.state.trials.concat(ui.lab.state.trial ? [ui.lab.state.trial] : []).filter(function (x) { return x.kind === 'precise'; });
    return 'Titration ' + (list.indexOf(t) + 1);
  }
  // The panel is built once per bench, so the hold button keeps its pointer.
  function buildTitrate() {
    var run = ui.run, redox = run.type === 'redox';
    $('#titrateBody').innerHTML =
      '<p class="step-text" id="tStep"></p><p class="hint" id="tHint"></p>' +
      '<div class="t-read" id="tRead"><label for="readingIn">Burette reading</label><div class="reading"><input id="readingIn" type="text" inputmode="decimal" autocomplete="off" placeholder="0.00" maxlength="6" title="To 2 decimal places, ending in 0 or 5 (R to jump here)"><span class="unit">cm³</span>' +
        '<button class="btn primary" type="button" id="recBtn">Record</button></div></div>' +
      '<div class="t-add sst-teacher" id="tAdd">' +
        '<p class="live" id="tLive" aria-hidden="true"></p>' +
        '<div class="grp"><span class="lbl">Tap</span><button class="btn hold" type="button" id="holdBtn" aria-describedby="holdHelp">Hold to run</button>' +
          '<span class="seg" role="group" aria-label="Flow"><button type="button" data-flow="slow" aria-pressed="true">Drip</button><button type="button" data-flow="fast" aria-pressed="false">Stream</button></span>' +
          '<span id="holdHelp" class="sr-only">Press and hold, or hold the space bar, to keep the tap open. Release to close it. You can also press and hold the tap on the burette.</span></div>' +
        '<div class="grp"><span class="lbl">Add</span><button class="btn" type="button" data-add="1.0" title="About 1.0 cm³ (key 1)">+1.0</button><button class="btn" type="button" data-add="0.5" title="About 0.5 cm³ (key 2)">+0.5</button>' +
          '<button class="btn" type="button" data-add="0.1" title="About 0.1 cm³ (key 3)">+0.1</button><button class="btn" type="button" data-add="drop" title="One drop, about 0.05 cm³ (key 4)">1 drop</button></div>' +
        '<div class="grp"><span class="lbl">Mix</span><button class="btn swirl" type="button" id="swirlBtn" title="Swirl the flask (S), or click the flask">Swirl</button>' +
          '<button class="btn" type="button" id="keepSwirl" aria-pressed="false" title="Swirl with one hand while the other works the tap">Keep swirling</button>' +
          (redox ? '<button class="btn" type="button" id="waitBtn">Wait 30 s</button>' : '') + '</div>' +
        '<button class="btn primary wide" type="button" id="stopBtn">Stop: read the final volume</button>' +
      '</div>' +
      '<div class="t-done" id="tDone"></div>';
    var hold = $('#holdBtn');
    function open() { if (hold.classList.contains('down')) return; var r = ui.lab.tap(true, ui.lab.state.burette.flow); if (r.ok) hold.classList.add('down'); else feedback(r); }
    function close() { if (!hold.classList.contains('down')) return; hold.classList.remove('down'); ui.lab.tap(false); announce('Tap closed.'); ui.lastKey = ''; }
    ui.tapOpen = open; ui.tapClose = close;
    hold.addEventListener('pointerdown', function (e) { e.preventDefault(); hold.setPointerCapture && hold.setPointerCapture(e.pointerId); open(); });
    ['pointerup', 'pointercancel', 'lostpointercapture'].forEach(function (ev) { hold.addEventListener(ev, close); });
    hold.addEventListener('contextmenu', function (e) { e.preventDefault(); });
    hold.addEventListener('keydown', function (e) { if ((e.key === ' ' || e.key === 'Enter') && !e.repeat) { e.preventDefault(); open(); } });
    hold.addEventListener('keyup', function (e) { if (e.key === ' ' || e.key === 'Enter') { e.preventDefault(); close(); } });
    hold.addEventListener('blur', close);
    $$('#tAdd [data-flow]').forEach(function (b) {
      b.addEventListener('click', function () {
        ui.lab.state.burette.flow = b.getAttribute('data-flow');
        $$('#tAdd [data-flow]').forEach(function (x) { x.setAttribute('aria-pressed', String(x === b)); });
      });
    });
    $$('#tAdd [data-add]').forEach(function (b) { b.addEventListener('click', function () { act(function () { return ui.lab.add(b.getAttribute('data-add')); }); }); });
    $('#swirlBtn').addEventListener('click', swirl);
    $('#keepSwirl').addEventListener('click', function () { act(function () { return ui.lab.setKeepSwirling(!ui.lab.state.keepSwirling); }); });
    if ($('#waitBtn')) $('#waitBtn').addEventListener('click', function () { act(function () { return ui.lab.wait(30); }); });
    $('#stopBtn').addEventListener('click', function () {
      if (ui.lab.state.burette.pending > 0) return;
      close(); ui.lab.tap(false); ui.reading = true; feedback(null); refresh(); $('#readingIn').focus();
    });
    $('#recBtn').addEventListener('click', record);
    $('#readingIn').addEventListener('keydown', function (e) { if (e.key === 'Enter') { e.preventDefault(); record(); } });
  }
  function swirl() { act(function () { return ui.lab.swirl(); }); }
  function record() {
    var input = $('#readingIn'), which = titrateState() === 'initial' ? 'initial' : 'final', r;
    r = act(function () { return which === 'initial' ? ui.lab.recordInitial(input.value) : ui.lab.recordFinal(input.value); });
    if (r && r.ok) { input.value = ''; if (which === 'final') { ui.lastColour = null; ui.reading = false; } refresh(); }
    else input.focus();
  }
  // Set up the next titration in one go: the steps were learnt in stage 1.
  function nextTitration() {
    var lab = ui.lab, s = lab.state, run = ui.run, first = s.trials[s.trials.length - 1] || {}, extra = '';
    var rough = s.trials[0] && s.trials[0].titre ? s.trials[0].titre : 25;
    act(function () {
      lab.emptyFlask();
      if (s.burette.reading === null || 50 - s.burette.reading < rough + 3) {
        lab.setFunnel(true); lab.fillBurette(); lab.setFunnel(false); lab.place('waste'); lab.primeJet();
        extra = ' The burette was topped up and run onto the scale.';
      }
      lab.pipette('touch');
      var what = '';
      if (run.type === 'redox') { lab.addAcid(first.acid || 'H2SO4'); what = 'dilute sulfuric acid'; if (first.warmedTo) { lab.warm(first.warmedTo); what += ', warmed to ' + first.warmedTo + ' °C'; } }
      else { var id = first.indicator || run.indicator; lab.addIndicator(id); what = '3 drops of ' + E.INDICATORS[id].name.toLowerCase(); }
      lab.place('flask');
      return { ok: true, kind: 'good', msg: 'Flask washed out with distilled water, a fresh ' + s.device.recordAs + ' cm³ portion in, with ' + what + ', and back on the tile.' + extra };
    });
    ui.reading = false; ui.lastColour = null;
    refresh();
  }
  function liveAmount() {
    if (ui.stage !== 'titrate') return;
    var t = ui.lab.state.trial, el = $('#tLive');
    if (!el) return;
    var txt = t && t.initialRec !== null ? 'Run in so far: about ' + (Math.floor(t.readingChange * 10) / 10).toFixed(1) + ' cm³' : '';
    if (el.textContent !== txt) el.textContent = txt;
  }
  function renderTitrate() {
    var lab = ui.lab, s = lab.state, run = ui.run, st = titrateState(), R = lab.results();
    var t = s.trial, lastT = s.trials[s.trials.length - 1], rough = s.trials[0];
    var redox = run.type === 'redox', tN = nm(run.titrant.id);
    $('#tRead').hidden = st !== 'initial' && st !== 'final';
    $('#tAdd').hidden = st !== 'add';
    $('#tDone').hidden = st !== 'done';
    var title = st === 'done' ? trialName(lastT) + ': done' : (t ? trialName(t) : (s.trials.length ? 'Titration ' + (R.precise.length + 1) : 'Rough titration'));
    $('#titrateTitle').textContent = title;
    var step = '', hint = '';
    if (st === 'initial') {
      step = 'Read the burette and record the initial reading';
      hint = 'Use the magnified view: read the ' + (redox ? 'top' : 'bottom') + ' of the meniscus, to 2 decimal places ending in 0 or 5, such as 0.35.';
      $('#recBtn').textContent = 'Record initial reading';
    } else if (st === 'add') {
      step = 'Add the ' + tN + ', swirling, ' + endpointWords();
      if (t.kind === 'rough') hint = 'This is the rough titration: add about 1 cm³ at a time, swirling after each, until the colour changes. It shows roughly where the endpoint is.';
      else if (rough && rough.titre) hint = 'Add quickly to about ' + Math.max(0, Math.floor(rough.titre - 1)) + ' cm³ (1 cm³ before your rough titre of ' + f2(rough.titre) + '), then drop by drop, swirling after each drop. Stop at the first permanent change.';
      else hint = 'Add drop by drop near the endpoint, swirling after each drop.';
      hint += ' Click the flask to swirl it; press and hold the tap to run.';
    } else if (st === 'final') {
      step = 'Read the burette and record the final reading';
      hint = 'Read the ' + (redox ? 'top' : 'bottom') + ' of the meniscus in the magnified view. Changed your mind? <button class="linkbtn" type="button" id="moreBtn">Add more ' + esc(tN) + '</button>';
      $('#recBtn').textContent = 'Record final reading';
    } else {
      step = 'Titre ' + f2(lastT.titre) + ' cm³';
    }
    // The instruction itself is in the prompt above the bench.
    $('#tStep').innerHTML = st === 'done' ? step : '';
    $('#tHint').innerHTML = hint;
    if ($('#moreBtn')) $('#moreBtn').addEventListener('click', function () { ui.reading = false; refresh(); });
    if (st === 'add') {
      var busy = s.burette.pending > 0;
      $$('#tAdd [data-add]').forEach(function (b) { b.disabled = busy; });
      $('#stopBtn').disabled = busy;
      $('#keepSwirl').setAttribute('aria-pressed', String(s.keepSwirling));
    }
    if (st === 'done') {
      var h = '', conc = R.concordant.length >= 2;
      if (lastT.kind === 'rough') h += '<p>That was the rough titration. Now do accurate ones: add quickly to about 1 cm³ before ' + f2(lastT.titre) + ' cm³, then drop by drop.</p>';
      else if (conc) h += '<p class="verdict good">Concordant: ' + R.concordant.map(function (x) { return trialName(x).toLowerCase(); }).join(' and ').replace(/titration (\d+) and titration/g, 'titrations $1 and') + ' agree within ' + run.concordanceTol_cm3.toFixed(2) + ' cm³.</p>';
      else h += '<p class="verdict warn">Not concordant yet: you need two accurate titres within ' + run.concordanceTol_cm3.toFixed(2) + ' cm³ of each other.</p>';
      if (conc) h += '<button class="btn primary wide" type="button" id="toCalc">Calculate the concentration</button><button class="btn wide" type="button" id="nextBtn">Do another titration</button>';
      else {
        h += '<button class="btn primary wide" type="button" id="nextBtn">Next titration</button>';
        if (R.precise.length >= 3) h += '<button class="btn sm wide" type="button" id="toCalc">Calculate anyway</button>';
      }
      $('#tDone').innerHTML = h;
      $('#nextBtn').addEventListener('click', nextTitration);
      if ($('#toCalc')) $('#toCalc').addEventListener('click', openAnalyse);
    }
    ui.scene.setCue(st === 'add' && !s.trials.length && !t.readingChange ? [{ part: 'tap' }] : []);
    // The prompt: the one thing to do now.
    say(st === 'done' ? (lastT.kind === 'rough' ? 'Rough titre ' : 'Titre ') + f2(lastT.titre) + ' cm³' + (conc ? ': concordant results' : '') : step, st === 'done' ? 'done' : '');
    boardNotes();
  }

  /* ---------- Results ---------- */
  function renderResults() {
    var lab = ui.lab, s = lab.state, h = '';
    if (ui.inPrep) {
      var p = s.prep;
      h = '<table class="res"><tbody>' +
        '<tr><td>Bottle + solid (m₁)</td><td>' + (p.m1 === null ? '—' : p.m1.toFixed(2) + ' g') + '</td></tr>' +
        '<tr><td>Bottle after tipping (m₂)</td><td>' + (p.m2 === null ? '—' : p.m2.toFixed(2) + ' g') + '</td></tr>' +
        '<tr><td>Empty bottle (m₀)</td><td>' + (p.m0 === null ? '—' : p.m0.toFixed(2) + ' g') + '</td></tr>' +
        '<tr><td>Mass transferred</td><td>' + (p.massUsed() === null ? '—' : p.massUsed().toFixed(2) + ' g') + '</td></tr>' +
        '<tr><td>Inversions</td><td>' + p.inversions + '</td></tr></tbody></table>';
      $('#resultsTitle').textContent = 'Weighing';
      $('#resultsBody').innerHTML = h;
      return;
    }
    $('#resultsTitle').textContent = 'Results';
    var R = lab.results(), rows = s.trials.slice();
    if (s.trial) rows.push(s.trial);
    h += '<table class="res"><thead><tr><th>Titration</th><th>Initial / cm³</th><th>Final / cm³</th><th>Titre / cm³</th><th><span class="sr-only">Concordant</span></th></tr></thead><tbody>';
    if (!rows.length) h += '<tr><td colspan="5" class="muted">No titrations yet.</td></tr>';
    rows.forEach(function (t) {
      var cur = t === s.trial, conc = R.concordantNs.indexOf(t.n) >= 0 && R.concordant.length >= 2;
      h += '<tr class="' + (t.kind === 'rough' ? 'rough' : '') + (cur ? ' current' : '') + (conc ? ' conc' : '') + '"><td>' + (t.kind === 'rough' ? 'Rough' : trialName(t).replace('Titration ', '')) + '</td>' +
        '<td>' + (t.initialRec === null ? '—' : f2(t.initialRec)) + '</td><td>' + (t.finalRec === null ? '—' : f2(t.finalRec)) + '</td><td>' + (t.titre === undefined ? '—' : f2(t.titre)) + '</td><td>' + (conc ? '<span title="Concordant">✓</span>' : '') + '</td></tr>';
    });
    h += '</tbody></table>';
    h += '<div class="res-actions"><button class="btn sm ghost" type="button" id="restartBtn">Start again</button></div>';
    $('#resultsBody').innerHTML = h;
    $('#restartBtn').addEventListener('click', function () {
      // Once the answer has been revealed, starting again gets a new unknown.
      var fresh = !!ui.submitted;
      if (!confirm(fresh ? 'Start this experiment again with a new unknown? Your results so far will be cleared.' : 'Start this experiment again with the same unknown? Your results so far will be cleared.')) return;
      if (fresh) ui.run = X.instantiate(ui.run.id, newSeed(), ui.run.sample);
      startLab();
    });
  }

  /* ---------- RP1: the standard solution, one click per step ---------- */
  function prepSteps() {
    var p = ui.lab.state.prep, std = ui.run.standard, want = std.target_M * 0.25 * std.Mr;
    function all(list) { var r; for (var i = 0; i < list.length; i++) { r = list[i](); if (!r.ok) return r; } return r; }
    return [
      { id: 'solid', part: 'solid', needs: [], say: 'Add about ' + want.toFixed(2) + ' g of sodium carbonate to the weighing bottle',
        method: 'Add about ' + want.toFixed(2) + ' g of anhydrous sodium carbonate to a weighing bottle on the balance.',
        why: std.target_M.toFixed(3) + ' mol dm⁻³ × 0.2500 dm³ = ' + (std.target_M * 0.25).toFixed(4) + ' mol; × ' + std.Mr.toFixed(1) + ' g mol⁻¹ = ' + want.toFixed(2) + ' g.',
        act: function () {
          var r, g = 0;
          while (p.bottleSolid_g < want - 0.6 && g++ < 20) r = p.addSolid('scoop');
          while (p.bottleSolid_g < want - 0.08 && g++ < 40) r = p.addSolid('small');
          while (p.bottleSolid_g < want - 0.02 && g++ < 60) r = p.addSolid('pinch');
          return r || p.addSolid('pinch');
        } },
      { id: 'm1', part: 'balance', needs: ['solid'], say: 'Record the mass of the bottle and solid',
        method: 'Record the mass of the weighing bottle and solid.', why: 'The balance reads to 0.01 g.',
        act: function () { return p.recordMass('m1'); } },
      { id: 'tip', part: 'beaker', needs: ['m1'], say: 'Tip the solid into the beaker',
        method: 'Tip the solid into a clean beaker.', why: 'A few grains always stay behind in the bottle.',
        act: function () { return p.tip(); } },
      { id: 'm2', part: 'balance', needs: ['tip'], say: 'Reweigh the weighing bottle',
        method: 'Reweigh the bottle. Mass of solid used = (bottle + solid) − (bottle after tipping).', why: 'Weighing by difference counts only the solid that reached the beaker.',
        act: function () { return p.recordMass('m2'); } },
      { id: 'water', part: 'wash', needs: ['tip'], say: 'Add about 100 cm³ of deionised water to the beaker',
        method: 'Add about 100 cm³ of deionised water to the beaker.', why: 'Less than 250 cm³, so there is room for the washings later.',
        act: function () { return p.addWater(); } },
      { id: 'stir', part: 'rod', needs: ['water'], say: 'Stir with the glass rod until the solid dissolves',
        method: 'Stir with a glass rod until all the solid has dissolved.', why: 'Undissolved solid would be left behind in the beaker.',
        act: function () { var r, g = 0; while (!p.dissolved && g++ < 10) r = p.stir(); return r; } },
      { id: 'funnel-in', part: 'funnel', needs: [], say: 'Put the funnel in the volumetric flask',
        method: 'Put a funnel in the neck of a 250.0 cm³ volumetric flask.', why: 'The neck is too narrow to pour into without spilling.',
        act: function () { return p.setFunnel(true); } },
      { id: 'pour', part: 'beaker', needs: ['stir', 'funnel-in'], say: 'Pour the solution into the volumetric flask',
        method: 'Pour the solution through the funnel into the volumetric flask.', why: 'A film of solution still coats the beaker, the rod and the funnel.',
        act: function () { return p.pour(); } },
      { id: 'rinse', part: 'wash', needs: ['pour'], say: 'Rinse the beaker, rod and funnel into the flask',
        method: 'Rinse the beaker and glass rod twice with deionised water, and the funnel, adding all the washings to the flask.', why: 'Solution left on the glass would be lost, and the concentration would come out low.',
        act: function () { return all([function () { return p.rinse('beaker'); }, function () { return p.rinse('beaker'); }, function () { return p.rinse('rod'); }, function () { return p.rinse('funnel'); }]); } },
      { id: 'funnel-out', part: 'funnel', needs: ['rinse'], say: 'Take the funnel out of the flask',
        method: 'Remove the funnel.', why: 'Water left in the funnel could run in after you have reached the mark.',
        act: function () { return p.setFunnel(false); } },
      { id: 'fill', part: 'wash', needs: ['funnel-out'], say: 'Fill with deionised water to just below the mark',
        method: 'Add deionised water until the level is just below the mark.', why: 'Stop short: water can’t be taken back out.',
        act: function () { return p.fillWater('bottle'); } },
      { id: 'drops', part: 'dropper', needs: ['fill'], say: 'Add water drop by drop until the meniscus sits on the mark',
        method: 'Add deionised water drop by drop with a dropper until the bottom of the meniscus sits on the mark, viewed at eye level.', why: 'The magnified view shows the neck and the mark.',
        act: function () { var r, g = 0; while (p.flaskWater_cm3 < p.PREP.flaskVolume_cm3 - 0.025 && g++ < 80) r = p.fillWater('drop'); return r || { ok: true, kind: 'good', msg: 'On the mark.' }; } },
      { id: 'stopper', part: 'stopper', needs: ['drops'], say: 'Stopper the flask',
        method: 'Put the stopper in the flask.', why: 'So nothing spills when you mix it.',
        act: function () { return p.stopper(); } },
      { id: 'invert', part: 'vflask', needs: ['stopper', 'm2'], say: 'Invert the flask several times to mix',
        method: 'Invert the flask several times to mix the solution.', why: 'Unmixed, the water added last stays at the top, so portions pipetted from it would differ.',
        act: function () { var r; for (var i = 0; i < p.PREP.inversionsNeeded + 2; i++) { r = p.invert(); if (!r.ok) return r; } return p.finish(); } }
    ];
  }

  // RP1: the calculations around the standard solution.
  function prepCalcHtml(which) {
    var p = ui.lab.state.prep, std = ui.run.standard, c = ui.prepCalc, h = '';
    if (which === 'mass') return '<div class="calc-step"><label for="pcMass">Mass of Na<sub>2</sub>CO<sub>3</sub> needed for 250.0 cm³ of ' + std.target_M.toFixed(3) + ' mol dm⁻³</label>' +
      '<div class="calc-row"><input id="pcMass" type="text" inputmode="decimal" value="' + esc(c.mass || '') + '"><span>g</span><button class="btn sm" type="button" id="pcMassGo">Check</button></div>' +
      '<div class="verdict ' + (c.massV ? c.massV.cls : '') + '">' + (c.massV ? c.massV.msg : '') + '</div></div>';
    if (p.finished) {
      var m = p.massUsed();
      h += '<div class="calc-step"><label for="pcConc">Concentration of your solution (mass used ' + m.toFixed(2) + ' g)</label>' +
        '<div class="calc-row"><input id="pcConc" type="text" inputmode="decimal" value="' + esc(c.conc || '') + '"><span>mol dm⁻³</span><button class="btn sm" type="button" id="pcConcGo">Check</button></div>' +
        '<div class="verdict ' + (c.concV ? c.concV.cls : '') + '">' + (c.concV ? c.concV.msg : '') + '</div></div>';
      if (c.concOk || c.concTries >= 3) h += '<button class="btn primary wide" type="button" id="toTitration">Go to the titration</button>';
    }
    return h;
  }
  function wirePrepCalc() {
    var p = ui.lab.state.prep, std = ui.run.standard, c = ui.prepCalc;
    var mg = $('#pcMassGo');
    if (mg) mg.addEventListener('click', function () {
      c.mass = $('#pcMass').value; var v = num(c.mass), want = std.target_M * 0.25 * std.Mr;
      if (closeTo(v, want, 0.01)) c.massV = { cls: 'good', msg: 'Right: 0.100 × 0.2500 = 0.0250 mol; × 106.0 = 2.65 g. Weigh close to this; the exact mass doesn’t matter as long as you record it.' };
      else if (closeTo(v, want * 1000, 0.01)) c.massV = { cls: 'bad', msg: 'Check the volume: 250.0 cm³ is 0.2500 dm³.' };
      else if (closeTo(v, 0.0250, 0.01)) c.massV = { cls: 'warn', msg: 'That’s the amount in moles. Multiply by M<sub>r</sub> to get the mass.' };
      else c.massV = { cls: 'bad', msg: 'Not quite. Moles = concentration × volume in dm³, then mass = moles × M<sub>r</sub>.' };
      renderSetup();
    });
    var cg = $('#pcConcGo');
    if (cg) cg.addEventListener('click', function () {
      c.conc = $('#pcConc').value; c.concTries = (c.concTries || 0) + 1;
      var v = num(c.conc), m = p.massUsed(), want = m / std.Mr / 0.25;
      if (closeTo(v, want, 0.006)) { c.concOk = true; c.concV = { cls: 'good', msg: 'Right: ' + m.toFixed(2) + ' ÷ 106.0 = ' + sci(m / std.Mr) + ' mol; ÷ 0.2500 dm³ = ' + sf(want, 4) + ' mol dm⁻³.' }; }
      else if (closeTo(v, m / std.Mr, 0.006)) c.concV = { cls: 'warn', msg: 'That’s the amount in moles. Divide by the volume in dm³ (0.2500).' };
      else if (closeTo(v, want / 1000, 0.006) || closeTo(v, want * 1000, 0.006)) c.concV = { cls: 'bad', msg: 'Check the volume: use 0.2500 dm³, not 250.0.' };
      else c.concV = { cls: 'bad', msg: 'Not quite: moles = mass ÷ M<sub>r</sub>, then concentration = moles ÷ 0.2500 dm³.' + (c.concTries >= 3 ? ' It is ' + sf(want, 4) + ' mol dm⁻³.' : '') };
      renderSetup();
    });
    var go = $('#toTitration');
    if (go) go.addEventListener('click', function () {
      ui.inPrep = false; ui.stage = 'setup'; newSetup(); buildScene(); ui.lastKey = '';
      feedback(null);
      refresh(true);
    });
  }

  /* ---------- Slides for the board: the prompt and the next thing to do ---------- */
  function boardNotes() {
    var notes = $('#boardNotes');
    if (!notes) { notes = document.createElement('div'); notes.id = 'boardNotes'; notes.className = 'sr-only'; notes.setAttribute('aria-hidden', 'true'); document.body.appendChild(notes); }
    var s = ui.lab.state, html = '<h3>' + $('#promptSay').innerHTML.replace(/<span class="(count|tick)"[^>]*>.*?<\/span>\s*/g, '') + '</h3>';
    var fb = $('#feedback').innerHTML;
    if (fb) html += '<p>' + fb + '</p>';
    if (s.flask && ui.sceneKind === 'titration' && ui.stage === 'titrate') html += '<p>The flask is ' + esc(s.flask.describe().text) + '.</p>';
    if (notes.innerHTML !== html) notes.innerHTML = html;
  }

  function refresh(force) {
    if (!ui.lab || ui.view !== 'lab') return;
    var titr = ui.sceneKind === 'titration', stage = ui.inPrep ? 'prep' : ui.stage;
    ui.stage = stage;
    document.body.classList.toggle('stage-setup', stage === 'setup');
    document.body.classList.toggle('stage-titrate', stage === 'titrate');
    document.body.classList.toggle('stage-prep', stage === 'prep');
    $('#method').hidden = stage === 'titrate';
    $('#titrate').hidden = stage !== 'titrate';
    $('#results').hidden = stage === 'setup';
    renderStages();
    if (stage === 'prep') { renderSetup(); renderResults(); }
    else if (stage === 'setup' && titr) renderSetup();
    else if (titr) { renderTitrate(); renderResults(); }
    if (force) { sizeForBoard(); if (window.SST_PRESENTER) setTimeout(function () { SST_PRESENTER.layout(); }, 30); }
  }

  /* ---------- Clicking the bench: the apparatus is the interface ---------- */
  function benchPart(e) {
    var part = e.target.closest && e.target.closest('[data-part]');
    return part ? { part: part.getAttribute('data-part'), id: part.getAttribute('data-id') || undefined } : null;
  }
  function onBenchClick(e) {
    var p = benchPart(e);
    if (!p) return;
    if (ui.stage === 'setup' || ui.stage === 'prep') return setupClick(p.part, p.id);
    if (ui.stage === 'titrate') {
      var st = titrateState();
      if (p.part === 'flask' && st === 'add') swirl();
      else if ((p.part === 'burette' || p.part === 'tap') && (st === 'initial' || st === 'final')) $('#readingIn').focus();
    }
  }
  // Press and hold the tap on the burette to run the titrant.
  function onBenchDown(e) {
    var p = benchPart(e);
    if (!p || p.part !== 'tap' || ui.stage !== 'titrate' || titrateState() !== 'add') return;
    e.preventDefault();
    ui.svgTap = true;
    var r = ui.lab.tap(true, ui.lab.state.burette.flow);
    if (!r.ok) { feedback(r); ui.svgTap = false; }
    else $('#holdBtn').classList.add('down');
  }
  function onBenchUp() {
    if (!ui.svgTap) return;
    ui.svgTap = false;
    $('#holdBtn').classList.remove('down');
    ui.lab.tap(false); announce('Tap closed.'); ui.lastKey = '';
  }

  /* ---------- Analysis ---------- */
  function openAnalyse() {
    var lab = ui.lab, R = lab.results();
    if (!ui.ticks) { ui.ticks = {}; }
    if (ui.calc.showSteps === undefined) ui.calc.showSteps = true;
    show('analyse');
    renderAnalyse();
  }
  function studentMean() {
    var lab = ui.lab, R = lab.results();
    var picked = R.precise.filter(function (t) { return ui.ticks[t.n]; });
    return picked.length ? E.mean(picked.map(function (t) { return t.titre; })) : null;
  }
  function renderAnalyse() {
    var lab = ui.lab, run = ui.run, R = lab.results(), h = '';
    h += '<h3>Your results</h3><table class="res"><thead><tr><th>Titration</th><th>Initial / cm³</th><th>Final / cm³</th><th>Titre / cm³</th><th>Use in mean</th></tr></thead><tbody>';
    R.trials.forEach(function (t) {
      var rough = t.kind === 'rough';
      h += '<tr class="' + (rough ? 'rough' : '') + '"><td>' + (rough ? 'Rough' : 'Titration ' + (R.precise.indexOf(t) + 1)) + '</td><td>' + f2(t.initialRec) + '</td><td>' + f2(t.finalRec) + '</td><td>' + f2(t.titre) + '</td>' +
        '<td>' + (rough ? '<span class="muted">not used</span>' : '<input type="checkbox" data-tick="' + t.n + '"' + (ui.ticks[t.n] ? ' checked' : '') + ' aria-label="Use titration ' + (R.precise.indexOf(t) + 1) + ' in the mean">') + '</td></tr>';
    });
    h += '</tbody></table>';
    h += '<p class="muted" style="font-size:.88rem">Tick the concordant titres: precise titres within ' + run.concordanceTol_cm3.toFixed(2) + ' cm³ of each other. The rough titration only tells you roughly where the endpoint is.</p>';
    h += '<div class="calc-row"><button class="btn sm" type="button" id="checkTicks">Check my choice</button></div><div class="verdict ' + (ui.tickV ? ui.tickV.cls : '') + '" id="tickV">' + (ui.tickV ? ui.tickV.msg : '') + '</div>';
    h += '<div class="calc-step"><label for="meanIn">Mean titre</label><div class="calc-row"><input id="meanIn" type="text" inputmode="decimal" value="' + esc(ui.calc.mean || '') + '"><span>cm³</span><button class="btn sm" type="button" id="meanGo">Check</button></div><div class="verdict ' + (ui.meanV ? ui.meanV.cls : '') + '">' + (ui.meanV ? ui.meanV.msg : '') + '</div></div>';
    if (R.precise.length < 2 || !R.concordant.length) h += '<p class="verdict warn">' + (R.precise.length < 2 ? 'You need at least two precise titrations.' : 'None of your precise titres are concordant yet.') + ' Go back to the bench and do another titration.</p>';
    $('#anResults').innerHTML = h;
    $$('#anResults [data-tick]').forEach(function (c) { c.addEventListener('change', function () { ui.ticks[+c.getAttribute('data-tick')] = c.checked; }); });
    $('#checkTicks').addEventListener('click', function () {
      var mine = R.precise.filter(function (t) { return ui.ticks[t.n]; }).map(function (t) { return t.n; }).sort().join(',');
      var want = R.concordantNs.slice().sort().join(',');
      if (!R.concordant.length) ui.tickV = { cls: 'warn', msg: 'There isn’t a concordant pair yet: no two precise titres are within ' + run.concordanceTol_cm3.toFixed(2) + ' cm³. Do another titration.' };
      else if (mine === want || isLargestConcordant(R)) ui.tickV = { cls: 'good', msg: 'Yes: those titres are within ' + run.concordanceTol_cm3.toFixed(2) + ' cm³ of each other. Your precise titres are concordant; calculate their mean.' };
      else if (!mine) ui.tickV = { cls: 'bad', msg: 'Tick the titres you will use.' };
      else {
        var picked = R.precise.filter(function (t) { return ui.ticks[t.n]; });
        var spread = Math.max.apply(null, picked.map(function (t) { return t.titre; })) - Math.min.apply(null, picked.map(function (t) { return t.titre; }));
        ui.tickV = { cls: 'bad', msg: spread > run.concordanceTol_cm3 + 1e-9 ? 'Those aren’t all within ' + run.concordanceTol_cm3.toFixed(2) + ' cm³ of each other (spread ' + f2(spread) + ' cm³). Leave out the one that doesn’t agree.' : 'Those agree, but there’s a larger concordant set: include every precise titre within ' + run.concordanceTol_cm3.toFixed(2) + ' cm³.' };
      }
      renderAnalyse();
    });
    $('#meanGo').addEventListener('click', function () {
      ui.calc.mean = $('#meanIn').value;
      var v = num(ui.calc.mean), sm = studentMean(), all = E.mean(R.trials.map(function (t) { return t.titre; }));
      if (sm === null) ui.meanV = { cls: 'bad', msg: 'Tick the titres you are using first.' };
      else if (v !== null && Math.abs(v - E.round(sm, 2)) <= 0.0051) ui.meanV = { cls: 'good', msg: 'Right: ' + f2(sm) + ' cm³, to 2 decimal places like the readings.' };
      else if (v !== null && Math.abs(v - all) <= 0.006) ui.meanV = { cls: 'bad', msg: 'That includes the rough titre. Use only the concordant precise titres.' };
      else ui.meanV = { cls: 'bad', msg: 'Add the titres you ticked and divide by how many there are.' };
      renderAnalyse();
    });
    renderCalc();
    if (ui.submitted) renderReveal();
  }

  // The ticked titres are concordant and there's no larger concordant set.
  function isLargestConcordant(R) {
    var picked = R.precise.filter(function (t) { return ui.ticks[t.n]; }).map(function (t) { return t.titre; });
    if (picked.length !== R.concordant.length || picked.length < 2) return false;
    return E.round(Math.max.apply(null, picked) - Math.min.apply(null, picked), 2) <= ui.run.concordanceTol_cm3 + 1e-9;
  }

  /* The calculation, with each step checked against the student's own
     previous answers (error carried forward). */
  function calcModel() {
    var lab = ui.lab, run = ui.run, mean = num(ui.calc.mean), sm = studentMean();
    var V = mean !== null ? mean : sm;
    var known = run.knownSolution, unk = run.unknownSolution;
    var knownConc = run.prep ? lab.state.prep.statedConc() : known.conc_M;
    var knownIsTitrant = run.unknown === 'analyte';
    var aliquot = lab.state.device.nominal_cm3;
    var kc = knownIsTitrant ? run.coeff.titrant : run.coeff.analyte, uc = knownIsTitrant ? run.coeff.analyte : run.coeff.titrant;
    return { V: V, known: known, unk: unk, knownConc: knownConc, knownVol: knownIsTitrant ? V : aliquot, unkVol: knownIsTitrant ? aliquot : V,
      kc: kc, uc: uc, ratio: uc / kc, aliquot: aliquot, knownIsTitrant: knownIsTitrant };
  }
  var RATIOS = [[1, 1], [1, 2], [2, 1], [1, 5], [5, 1], [2, 5], [5, 2]];
  function renderCalc() {
    var run = ui.run, c = ui.calc, m = calcModel(), lab = ui.lab, units = run.units, h = '';
    var steps = lab.guided || c.showSteps;
    var kF = fm(m.known.id), uF = fm(m.unk.id);
    h += '<h3>Calculate</h3>';
    if (run.prep) h += '<p class="muted">Your standard: ' + sf(m.knownConc, 4) + ' mol dm⁻³ Na<sub>2</sub>CO<sub>3</sub>, from your masses.</p>';
    if (run.type === 'redox' && !run.gcse) {
      var choices = X.EQUATION_CHOICES[run.analyte.id];
      h += '<div class="calc-step"><label>Which ionic equation is the reaction in the flask?</label><div class="eqopts">' + choices.map(function (q, i) {
        return '<label><input type="radio" name="eqpick" value="' + i + '"' + (c.eq === i ? ' checked' : '') + '><span class="eqn">' + q.html + '</span></label>';
      }).join('') + '</div><div class="verdict ' + (c.eqV ? c.eqV.cls : '') + '">' + (c.eqV ? c.eqV.msg : '') + '</div></div>';
    } else h += '<p><span class="eqn">' + (run.eq.molecular || run.eq.ionic) + '</span></p>';
    if (steps) {
      h += step('nKnown', 'Amount of ' + kF + ' = concentration × volume', 'mol', 'Use ' + (m.knownIsTitrant ? 'your mean titre' : 'the ' + m.aliquot.toFixed(2) + ' cm³ portion') + ', converted to dm³ (÷ 1000).');
      h += '<div class="calc-step"><label for="c_ratio">Mole ratio ' + kF + ' : ' + uF + ' from the equation</label><div class="calc-row"><select id="c_ratio"><option value="">Choose…</option>' +
        RATIOS.map(function (r) { var v = r[0] + ':' + r[1]; return '<option value="' + v + '"' + (c.ratio === v ? ' selected' : '') + '>' + r[0] + ' : ' + r[1] + '</option>'; }).join('') +
        '</select><button class="btn sm" type="button" data-go="ratio">Check</button></div><div class="verdict ' + (c.ratioV ? c.ratioV.cls : '') + '">' + (c.ratioV ? c.ratioV.msg : '') + '</div></div>';
      h += step('nUnk', 'Amount of ' + uF, 'mol', 'Use the ratio on your amount of ' + kF + '.');
      h += step('conc', 'Concentration of ' + uF + ' = amount ÷ volume', units, 'Volume of ' + uF + ': ' + (m.knownIsTitrant ? m.aliquot.toFixed(2) + ' cm³' : 'your mean titre') + ', in dm³.');
    }
    h += '<div class="calc-step"><label for="c_final">Your answer: the concentration of the ' + esc(nm(m.unk.id)) + '</label><div class="calc-row"><input id="c_final" type="text" inputmode="decimal" value="' + esc(c.final || '') + '">' +
      '<select id="c_unit" aria-label="Units">' + unitOptions().map(function (u) { return '<option' + (c.unit === u ? ' selected' : '') + '>' + u + '</option>'; }).join('') + '</select></div></div>';
    if (run.gcse) h += '<div class="calc-step"><label for="c_g">Higher Tier: the concentration in g/dm³ (M<sub>r</sub> of ' + uF + ' = ' + (run.Mr[m.unk.id] || 0).toFixed(1).replace(/\.0$/, '') + ')</label><div class="calc-row"><input id="c_g" type="text" inputmode="decimal" value="' + esc(c.g || '') + '"><span>g/dm³</span></div></div>';
    h += '<div class="calc-row" style="margin-top:8px">' + (lab.guided ? '' : '<button class="btn sm" type="button" id="toggleSteps">' + (c.showSteps ? 'Hide the steps' : 'Show the steps') + '</button>') +
      '<button class="btn primary" type="button" id="submitAns"' + (ui.submitted ? ' disabled' : '') + '>' + (ui.submitted ? 'Answer submitted' : 'Submit answer') + '</button>' +
      (ui.submitted ? '' : '<button class="btn" type="button" id="autoAns" title="Use the mean of your concordant titres and show every step">Work it out for me</button>') + '</div>';
    $('#anCalc').innerHTML = h;
    $$('#anCalc input[name="eqpick"]').forEach(function (r) {
      r.addEventListener('change', function () {
        c.eq = +r.value; var q = X.EQUATION_CHOICES[run.analyte.id][c.eq];
        c.eqV = q.right ? { cls: 'good', msg: 'Yes. ' + (run.analyte.id === 'Fe2' ? 'One MnO₄⁻ takes five electrons and each Fe²⁺ gives one, so MnO₄⁻ : Fe²⁺ = 1 : 5.' : 'Each MnO₄⁻ takes five electrons and each C₂O₄²⁻ gives two, so MnO₄⁻ : C₂O₄²⁻ = 2 : 5.') } : { cls: 'bad', msg: q.why };
        renderCalc();
      });
    });
    $$('#anCalc [data-go]').forEach(function (b) { b.addEventListener('click', function () { checkStep(b.getAttribute('data-go')); }); });
    if ($('#toggleSteps')) $('#toggleSteps').addEventListener('click', function () { saveInputs(); c.showSteps = !c.showSteps; if (c.showSteps) ui.hints++; renderCalc(); });
    $('#submitAns').addEventListener('click', submit);
    if ($('#autoAns')) $('#autoAns').addEventListener('click', autoSolve);
  }
  // Stage 3 done for the student: the concordant titres, their mean and the
  // answer they give, with the worked solution in the reveal.
  function autoSolve() {
    var run = ui.run, R = ui.lab.results(), c = ui.calc;
    if (R.mean === null) { ui.tickV = { cls: 'warn', msg: 'There isn’t a concordant pair to work from yet. Go back to the titration and do another one.' }; renderAnalyse(); return; }
    ui.ticks = {}; R.concordantNs.forEach(function (n) { ui.ticks[n] = true; });
    ui.tickV = { cls: 'good', msg: 'Concordant titres: ' + R.concordant.map(function (t) { return f2(t.titre); }).join(', ') + ' cm³.' };
    c.mean = f2(R.meanRaw); ui.meanV = { cls: 'good', msg: 'Mean of the concordant titres: ' + f2(R.meanRaw) + ' cm³.' };
    if (run.type === 'redox' && !run.gcse) X.EQUATION_CHOICES[run.analyte.id].forEach(function (q, i) { if (q.right) c.eq = i; });
    var m = calcModel(), v = ui.lab.solve(m.V).value_M;
    var nK = m.knownConc * m.knownVol / 1000, nU = nK * m.ratio;
    c.showSteps = true;
    c.nKnown = E.fmtSig(nK, 4); c.nKnownV = { cls: 'good', msg: sf(m.knownConc, 3) + ' × ' + f2(m.knownVol) + ' ÷ 1000 = ' + sci(nK) + ' mol' };
    c.ratio = m.kc + ':' + m.uc; c.ratioV = { cls: 'good', msg: 'From the equation: ' + m.kc + ' ' + fm(m.known.id) + ' to ' + m.uc + ' ' + fm(m.unk.id) + '.' };
    c.nUnk = E.fmtSig(nU, 4); c.nUnkV = { cls: 'good', msg: (m.kc === m.uc ? 'A 1 : 1 ratio, so the same: ' : sci(nK) + ' × ' + m.uc + ' ÷ ' + m.kc + ' = ') + sci(nU) + ' mol' };
    c.conc = sf(v, 3); c.concV = { cls: 'good', msg: sci(nU) + ' ÷ ' + E.fmtSig(m.unkVol / 1000, 4) + ' dm³ = ' + sf(v, 3) + ' ' + run.units };
    c.final = sf(v, 3); c.unit = unitOptions()[0];
    if (run.gcse && run.Mr[m.unk.id]) c.g = sf(v * run.Mr[m.unk.id], 3);
    ui.auto = true;
    renderAnalyse();
    submit();
  }
  function unitOptions() {
    var u = ui.run.units;
    return ui.run.gcse ? [u, 'g/dm³', 'mol', 'cm³', 'mol/cm³'] : [u, 'g dm⁻³', 'mol', 'cm³', 'mol cm⁻³'];
  }
  function step(key, label, unit, hint) {
    var c = ui.calc, v = c[key + 'V'];
    return '<div class="calc-step"><label for="c_' + key + '">' + label + '</label><p class="hint">' + hint + '</p><div class="calc-row"><input id="c_' + key + '" type="text" inputmode="decimal" value="' + esc(c[key] || '') + '"><span>' + unit + '</span>' +
      '<button class="btn sm" type="button" data-go="' + key + '">Check</button></div><div class="verdict ' + (v ? v.cls : '') + '">' + (v ? v.msg : '') + '</div></div>';
  }
  function saveInputs() {
    var c = ui.calc;
    ['nKnown', 'nUnk', 'conc', 'final', 'g'].forEach(function (k) { var i = $('#c_' + k); if (i) c[k] = i.value; });
    var r = $('#c_ratio'); if (r) c.ratio = r.value;
    var u = $('#c_unit'); if (u) c.unit = u.value;
  }
  function checkStep(key) {
    saveInputs();
    var c = ui.calc, m = calcModel();
    if (m.V === null) { c[key + 'V'] = { cls: 'bad', msg: 'Work out your mean titre first.' }; renderCalc(); return; }
    var nK = m.knownConc * m.knownVol / 1000;
    if (key === 'nKnown') {
      var v = num(c.nKnown);
      if (closeTo(v, nK)) c.nKnownV = { cls: 'good', msg: 'Right: ' + sf(m.knownConc, 3) + ' × ' + f2(m.knownVol) + ' ÷ 1000 = ' + sci(nK) + ' mol.' };
      else if (closeTo(v, nK * 1000)) c.nKnownV = { cls: 'bad', msg: 'Your method is sound, but check the conversion from cm³ to dm³: divide the volume by 1000.' };
      else if (!m.knownIsTitrant && closeTo(v, m.knownConc * m.V / 1000)) c.nKnownV = { cls: 'bad', msg: 'That uses the titre, but the ' + esc(nm(m.known.id)) + ' is the ' + m.aliquot.toFixed(2) + ' cm³ portion in the flask.' };
      else c.nKnownV = { cls: 'bad', msg: 'Amount = concentration × volume in dm³.' };
    } else if (key === 'ratio') {
      var want = m.kc + ':' + m.uc;
      var red = function (s) { var p = s.split(':').map(Number); var g = gcd(p[0], p[1]); return (p[0] / g) + ':' + (p[1] / g); };
      if (c.ratio && red(c.ratio) === red(want)) c.ratioV = { cls: 'good', msg: 'Right: the equation gives ' + m.kc + ' ' + fm(m.known.id) + ' to ' + m.uc + ' ' + fm(m.unk.id) + '.' };
      else if (c.ratio && red(c.ratio) === red(m.uc + ':' + m.kc)) c.ratioV = { cls: 'bad', msg: 'That’s the right pair of numbers the wrong way round. Read the coefficients from the equation in the order ' + fm(m.known.id) + ' : ' + fm(m.unk.id) + '.' };
      else c.ratioV = { cls: 'bad', msg: 'Look at the numbers in front of each formula in the balanced equation.' };
    } else if (key === 'nUnk') {
      var base = num(c.nKnown) !== null ? num(c.nKnown) : nK;
      var r = c.ratio ? c.ratio.split(':').map(Number) : [m.kc, m.uc];
      var wantU = base * r[1] / r[0], v2 = num(c.nUnk);
      if (closeTo(v2, wantU)) c.nUnkV = { cls: 'good', msg: (closeTo(wantU, nK * m.ratio) ? 'Right: ' : 'That follows from your previous lines: ') + (r[0] === r[1] ? 'a 1 : 1 ratio, so the same, ' + sci(wantU) : sci(base) + ' × ' + r[1] + ' ÷ ' + r[0] + ' = ' + sci(wantU)) + ' mol.' };
      else if (closeTo(v2, base * r[0] / r[1])) c.nUnkV = { cls: 'bad', msg: 'The ratio has been applied the wrong way: multiply by ' + r[1] + ' and divide by ' + r[0] + '.' };
      else c.nUnkV = { cls: 'bad', msg: 'Multiply your amount of ' + fm(m.known.id) + ' by the ratio.' };
    } else if (key === 'conc') {
      var nU = num(c.nUnk) !== null ? num(c.nUnk) : nK * m.ratio;
      var wantC = nU / (m.unkVol / 1000), v3 = num(c.conc);
      if (closeTo(v3, wantC)) c.concV = { cls: 'good', msg: 'Right: ' + sci(nU) + ' ÷ ' + E.fmtSig(m.unkVol / 1000, 4) + ' dm³ = ' + sf(wantC, 3) + ' ' + ui.run.units + '.' };
      else if (closeTo(v3, nU / m.unkVol)) c.concV = { cls: 'bad', msg: 'Your method is sound, but check the conversion from cm³ to dm³: ' + f2(m.unkVol) + ' cm³ = ' + E.fmtSig(m.unkVol / 1000, 4) + ' dm³.' };
      else c.concV = { cls: 'bad', msg: 'Concentration = amount ÷ volume in dm³.' };
    }
    renderCalc();
  }
  function gcd(a, b) { return b ? gcd(b, a % b) : a; }

  /* Diagnosis of a final answer against what the student's own mean titre gives. */
  function diagnose(v, m) {
    var run = ui.run, lab = ui.lab, R = lab.results(), correct = lab.solve(m.V).value_M;
    if (closeTo(v, correct, 0.006)) return { ok: true, correct: correct };
    var alt = [
      [correct * 1000, 'Your method is sound, but check the conversion from cm³ to dm³: your answer is 1000 times too big.'],
      [correct / 1000, 'Check the conversion from cm³ to dm³: your answer is 1000 times too small.']
    ];
    if (m.ratio !== 1) {
      alt.push([correct / m.ratio, 'Your volume is correct, but your calculation uses a 1 : 1 ratio. The equation gives ' + m.kc + ' : ' + m.uc + '.']);
      alt.push([correct / m.ratio / m.ratio, 'Your volume is correct, but your calculation uses the mole ratio the wrong way round.']);
    }
    if (run.Mr[m.unk.id]) alt.push([correct * run.Mr[m.unk.id], 'That is the concentration in grams per dm³. The answer asked for is in ' + run.units + '.']);
    var allMean = E.mean(R.trials.map(function (t) { return t.titre; }));
    alt.push([lab.solve(allMean).value_M, 'That uses the mean of every titre, including the rough one. Use only the concordant titres.']);
    var precMean = R.precise.length ? E.mean(R.precise.map(function (t) { return t.titre; })) : null;
    if (precMean) alt.push([lab.solve(precMean).value_M, 'That uses every precise titre. Leave out any that aren’t concordant.']);
    // Volumes swapped: titre where the portion should be.
    alt.push([m.knownIsTitrant ? m.knownConc * m.aliquot / 1000 * m.ratio / (m.V / 1000) : m.knownConc * m.V / 1000 * m.ratio / (m.aliquot / 1000), 'You’ve swapped the two volumes: check which solution was in the burette and which was pipetted.']);
    for (var i = 0; i < alt.length; i++) if (closeTo(v, alt[i][0], 0.006)) return { ok: false, correct: correct, msg: alt[i][1] };
    return { ok: false, correct: correct, msg: 'That isn’t what your mean titre gives. Work through the steps: amount of the known solution, mole ratio, amount of the unknown, concentration.' };
  }

  function submit() {
    saveInputs();
    var c = ui.calc, run = ui.run, lab = ui.lab, m = calcModel(), R = lab.results();
    var v = num(c.final);
    if (m.V === null) { alert('Tick your concordant titres and work out the mean titre first.'); return; }
    if (v === null || v <= 0) { alert('Enter your answer for the concentration.'); return; }
    if (run.type === 'redox' && !run.gcse && c.eq === undefined) { alert('Choose the ionic equation first.'); return; }
    var truth = lab.trueValue();
    var d = diagnose(v, m);
    var unitOk = c.unit === unitOptions()[0] || (!c.unit);
    var gTrue = null, gOk = null;
    if (run.gcse && run.Mr[m.unk.id]) { var gv = num(c.g); gTrue = d.correct * run.Mr[m.unk.id]; gOk = gv === null ? null : closeTo(gv, v * run.Mr[m.unk.id], 0.01) || closeTo(gv, gTrue, 0.01); }
    ui.submitted = { auto: !!ui.auto, value: v, unitOk: unitOk, truth: truth, diag: d, pct: E.pctError(v, truth), abs: E.absError(v, truth), pctFromData: E.pctError(d.correct, truth), mean: m.V, gOk: gOk, gTrue: gTrue,
      concordant: R.concordant.length >= 2, eqOk: run.type !== 'redox' || run.gcse || (X.EQUATION_CHOICES[run.analyte.id][c.eq] || {}).right };
    saveProgress(run.id, ui.submitted.pct);
    renderCalc();
    renderReveal();
    $('#anReveal').scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  /* ---------- Reveal, worked solution and report ---------- */
  function uncertainty() {
    var lab = ui.lab, s = ui.submitted, dev = lab.state.device, out = [];
    var R = lab.results(), m = R.mean !== null ? R.mean : s.mean;
    out.push(['Burette (2 readings × ±0.05 cm³ on ' + f2(m) + ' cm³)', 2 * 0.05 / m * 100]);
    out.push([dev.label + ' (±' + dev.tolerance_cm3 + ' cm³)', dev.tolerance_cm3 / dev.nominal_cm3 * 100]);
    if (ui.run.prep) {
      var p = lab.state.prep, mass = p.massUsed();
      out.push(['Balance (2 readings × ±0.005 g on ' + mass.toFixed(2) + ' g)', 0.01 / mass * 100]);
      out.push(['250.0 cm³ volumetric flask (±0.30 cm³)', 0.3 / 250 * 100]);
    }
    return out;
  }
  function workedHtml() {
    var m = calcModel(), run = ui.run, units = run.units, lab = ui.lab;
    var nK = m.knownConc * m.knownVol / 1000, nU = nK * m.ratio, c = nU / (m.unkVol / 1000);
    var kF = fm(m.known.id), uF = fm(m.unk.id);
    var h = '<div class="working">';
    if (run.prep) { var p = lab.state.prep; h += '<p>Standard: ' + p.massUsed().toFixed(2) + ' g ÷ 106.0 = ' + sci(p.massUsed() / 106) + ' mol; ÷ 0.2500 dm³ = ' + sf(m.knownConc, 4) + ' mol dm⁻³</p>'; }
    h += '<p>Mean titre = ' + f2(m.V) + ' cm³ (concordant titres only)</p>';
    h += '<p>Amount of ' + kF + ' = ' + sf(m.knownConc, 3) + ' × ' + f2(m.knownVol) + ' ÷ 1000 = ' + sci(nK) + ' mol</p>';
    h += '<p>Equation: <span class="eqn">' + (run.type === 'redox' ? run.eq.ionic : run.eq.molecular) + '</span>, so ' + kF + ' : ' + uF + ' = ' + m.kc + ' : ' + m.uc + '</p>';
    h += '<p>Amount of ' + uF + ' = ' + (m.uc !== m.kc ? sci(nK) + ' × ' + m.uc + ' ÷ ' + m.kc + ' = ' : '') + sci(nU) + ' mol</p>';
    h += '<p>Concentration of ' + uF + ' = ' + sci(nU) + ' ÷ ' + E.fmtSig(m.unkVol / 1000, 4) + ' dm³ = <b>' + sf(c, 3) + ' ' + units + '</b></p>';
    if (run.gcse && run.Mr[m.unk.id]) h += '<p>In g/dm³: ' + sf(c, 3) + ' × ' + run.Mr[m.unk.id] + ' = <b>' + sf(c * run.Mr[m.unk.id], 3) + ' g/dm³</b></p>';
    return h + '</div>';
  }
  var IMPROVE = {
    'burette-water': 'Rinse the burette with a little of the titrant before filling it.',
    'pipette-water': 'Rinse the pipette with the solution it will measure.',
    'flask-analyte': 'Rinse the conical flask with distilled water only.',
    'blow-out': 'Let the pipette drain and touch the tip on the flask; don’t blow out the last drop.',
    'jet-air': 'Run a little titrant through the tap into a waste beaker before taking the initial reading.',
    'funnel-in': 'Remove the funnel after filling the burette.', 'funnel-reading': 'Remove the funnel before taking a reading.',
    'not-swirled': 'Swirl after each addition, and judge the colour of the whole flask.',
    'cylinder': 'Use a volumetric pipette for the portion: ±0.06 cm³ instead of ±0.5 cm³.',
    'universal': 'Use an indicator with a sharp colour change, such as phenolphthalein or methyl orange.',
    'indicator-unsuitable': 'Choose an indicator whose pH range lies in the steep part of the pH curve.',
    'two-indicators': 'Use one indicator.',
    'acid-hcl': 'Acidify with dilute sulfuric acid, not hydrochloric acid.', 'acid-hno3': 'Acidify with dilute sulfuric acid, not nitric acid.',
    'no-acid': 'Add about 10 cm³ of dilute sulfuric acid before titrating.', 'mno2': 'Use enough dilute sulfuric acid that no brown MnO₂ forms.',
    'too-hot': 'Warm to about 60 °C in a water bath; don’t heat close to boiling.',
    'misread-initial': 'Read the burette at eye level, at the ' + 'meniscus, to the nearest 0.05 cm³.', 'misread-final': 'Read the burette at eye level, at the meniscus, to the nearest 0.05 cm³.',
    'unrinsed-beaker': 'Rinse the beaker into the volumetric flask, twice.', 'unrinsed-rod': 'Rinse the glass rod into the flask.', 'unrinsed-funnel': 'Rinse the funnel into the flask before removing it.',
    'bottle-residue': 'Weigh by difference: reweigh the bottle after tipping.', 'over-mark': 'Add the last few cm³ with a dropper, watching the meniscus at eye level.',
    'under-mark': 'Make up until the bottom of the meniscus sits on the mark.', 'not-mixed': 'Stopper and invert the flask at least eight times.',
    'funnel-makeup': 'Remove the funnel before making up to the mark.', 'undissolved': 'Stir until all the solid has dissolved before transferring.'
  };
  function revealHtml(forPrint) {
    var s = ui.submitted, run = ui.run, lab = ui.lab, R = lab.results(), units = run.units, h = '';
    var within = s.pct !== null && s.pct <= run.tolerancePct;
    var unc = uncertainty(), uTot = unc.reduce(function (a, x) { return a + x[1]; }, 0);
    h += '<h3>' + (forPrint ? 'Result' : 'How did you do?') + '</h3><div class="reveal-grid">' +
      '<div class="stat"><span>Your answer</span><b>' + esc(sf(s.value, 3)) + ' ' + (s.unitOk ? units : '<span class="muted">(check units)</span>') + '</b></div>' +
      '<div class="stat"><span>True concentration</span><b>' + sf(s.truth, 3) + ' ' + units + '</b></div>' +
      '<div class="stat"><span>Absolute error</span><b>' + (s.abs < 5e-7 ? '0' : sci(s.abs, 2)) + ' ' + units + '</b></div>' +
      '<div class="stat ' + (within ? 'good' : 'bad') + '"><span>Percentage error</span><b>' + (s.pct === null ? '—' : s.pct.toFixed(1) + ' %') + '</b></div>' +
      '<div class="stat"><span>Expected uncertainty of the apparatus</span><b>± ' + uTot.toFixed(2) + ' %</b></div>' +
      '<div class="stat ' + (s.concordant ? 'good' : 'bad') + '"><span>Concordant titres</span><b>' + (s.concordant ? 'Yes' : 'No') + '</b></div></div>';
    h += '<p>' + (within ? 'Within the ' + run.tolerancePct + ' % this challenge accepts.' : 'Outside the ' + run.tolerancePct + ' % this challenge accepts.') +
      ' percentage error = |' + sf(s.value, 3) + ' − ' + sf(s.truth, 3) + '| ÷ ' + sf(s.truth, 3) + ' × 100 = ' + (s.pct === null ? '—' : s.pct.toFixed(1) + ' %') + '.</p>';
    // Calculation and measurement, separately.
    if (s.auto) h += '<p class="verdict"><b>Calculation:</b> worked out for you from the mean of your concordant titres: see the worked solution below.</p>';
    else if (!s.diag.ok) h += '<p class="verdict bad"><b>Calculation:</b> ' + s.diag.msg + ' From your mean titre the answer is ' + sf(s.diag.correct, 3) + ' ' + units + '.</p>';
    else h += '<p class="verdict good"><b>Calculation:</b> correct for your mean titre.' + (s.unitOk ? '' : ' Check the units: concentration is in ' + units + '.') + '</p>';
    if (s.gOk !== null && ui.run.gcse) h += '<p class="verdict ' + (s.gOk ? 'good' : 'bad') + '"><b>g/dm³:</b> ' + (s.gOk ? 'correct.' : 'multiply the concentration in mol/dm³ by M<sub>r</sub>: ' + sf(s.gTrue, 3) + ' g/dm³ from your mean titre.') + '</p>';
    if (run.type === 'redox' && !run.gcse) h += '<p class="verdict ' + (s.eqOk ? 'good' : 'bad') + '"><b>Equation:</b> ' + (s.eqOk ? 'correct ionic equation and mole ratio.' : 'the equation you chose isn’t the reaction in the flask: ' + run.eq.ionic + '.') + '</p>';
    // Practical technique is judged from the titres as recorded, not from the mean typed in.
    var recC = R.mean !== null ? lab.solve(R.meanRaw).value_M : null;
    var measErr = recC === null ? null : E.pctError(recC, s.truth);
    if (recC === null) h += '<p><b>Measurement:</b> your precise titres weren’t concordant, so they can’t be judged against the uncertainty of the apparatus. Do more titrations until two agree within ' + run.concordanceTol_cm3.toFixed(2) + ' cm³.</p>';
    else h += '<p><b>Measurement:</b> your concordant titres give ' + sf(recC, 3) + ' ' + units + ', ' + measErr.toFixed(2) + ' % from the true value. ' +
      (measErr <= uTot ? 'That is inside the uncertainty of the apparatus (± ' + uTot.toFixed(2) + ' %), so your practical technique was accurate.' :
        'That is more than the apparatus uncertainty (± ' + uTot.toFixed(2) + ' %), so something in the method added an error: see below.') + '</p>';
    h += '<h3>Uncertainty</h3><table class="mini"><tbody>' + unc.map(function (u) { return '<tr><td>' + u[0] + '</td><td>± ' + u[1].toFixed(2) + ' %</td></tr>'; }).join('') +
      '<tr><th>Total (sum of percentage uncertainties)</th><th>± ' + uTot.toFixed(2) + ' %</th></tr></tbody></table>';
    h += '<p class="muted" style="font-size:.88rem">Precision is how closely repeat titres agree (concordance). Accuracy is how close the result is to the true value. Resolution is the smallest division you can read (0.10 cm³ on the burette, so readings are given to ±0.05 cm³). The percentage uncertainty of the result comes from all of these readings together; a systematic error, like a diluted titrant, shifts every result the same way and isn’t reduced by repeating.</p>';
    var issues = lab.allIssues();
    h += '<h3>Your method</h3>';
    if (!issues.length) h += '<ul class="issues"><li class="good">No procedural mistakes recorded.</li></ul>';
    else {
      // The same mistake in several titrations is listed once, with where it happened.
      var grouped = [];
      issues.forEach(function (i) {
        var g = grouped.filter(function (x) { return x.msg === i.msg; })[0];
        if (!g) grouped.push(g = { msg: i.msg, trials: [] });
        if (i.trial) g.trials.push(i.trial);
      });
      var label = function (n) { var t = R.trials.filter(function (x) { return x.n === n; })[0]; return t && t.kind === 'rough' ? 'rough' : String(R.precise.indexOf(t) + 1); };
      h += '<ul class="issues">' + grouped.map(function (g) {
        return '<li class="mistake">' + (g.trials.length ? '<b>Titration' + (g.trials.length > 1 ? 's ' : ' ') + g.trials.map(label).join(', ') + ':</b> ' : '') + g.msg + '</li>';
      }).join('') + '</ul>';
    }
    var imp = [];
    issues.forEach(function (i) { if (IMPROVE[i.code] && imp.indexOf(IMPROVE[i.code]) < 0) imp.push(IMPROVE[i.code]); });
    var overs = R.precise.filter(function (t) { return t.end && t.end.status === 'overshot'; });
    if (overs.length) imp.push('Approach the endpoint drop by drop: ' + overs.length + ' precise titration' + (overs.length > 1 ? 's' : '') + ' went past it.');
    var earlies = R.precise.filter(function (t) { return t.end && t.end.status === 'early'; });
    if (earlies.length) imp.push('Make sure the colour change is permanent through the whole flask before stopping: ' + earlies.length + ' precise titration' + (earlies.length > 1 ? 's' : '') + ' stopped before the endpoint.');
    if (!s.concordant) imp.push('Repeat until two precise titres agree within ' + run.concordanceTol_cm3.toFixed(2) + ' cm³.');
    if (imp.length) h += '<h3>Improvements</h3><ul>' + imp.map(function (x) { return '<li>' + x + '</li>'; }).join('') + '</ul>';
    h += '<h3>Worked solution, with your results</h3>' + workedHtml();
    if (run.def.id === 'alevel-curves') h += '<h3>The pH curve for this titration</h3><div class="curve">' + curveSvg(forPrint) + '</div><p class="muted" style="font-size:.88rem">The shaded band is the range of the indicator you used. A suitable indicator changes colour inside the steep section, so its endpoint matches the equivalence point.</p>';
    if (!forPrint) h += '<div class="calc-row" style="margin-top:14px"><button class="btn primary" type="button" id="againBtn">' + (run.mystery ? 'New challenge' : 'Try again with a new unknown') + '</button><button class="btn" type="button" id="reportBtn">Print my report</button><button class="btn" type="button" id="otherBtn">Choose another experiment</button></div>';
    return h;
  }
  function renderReveal() {
    var box = $('#anReveal');
    box.hidden = false;
    box.innerHTML = revealHtml(false);
    $('#againBtn').addEventListener('click', function () { openBrief(ui.run.id, newSeed(), ui.run.sample); });
    $('#reportBtn').addEventListener('click', function () { openPrint(['report']); });
    $('#otherBtn').addEventListener('click', function () { buildPicker(); show('picker'); });
    buildReport();
  }
  function buildReport() {
    if (!ui.submitted) { $('#printReport').innerHTML = '<p>Finish a titration and submit an answer to make a report.</p>'; return; }
    var run = ui.run, R = ui.lab.results(), d = new Date();
    var h = '<div class="print-head"><div><h1>Practical report: ' + esc(run.def.title) + '</h1><div class="sub">' + run.def.spec.join(' · ') + (run.mystery ? ' · challenge ' + codeFor(run) : '') + '</div></div><div class="sub">' + d.toLocaleDateString('en-GB') + ' · Savage Science Tools</div></div>';
    h += '<p>Titrant: ' + esc(nm(run.titrant.id)) + (run.titrant.known ? ', ' + sf(run.titrant.conc_M, 3) + ' ' + run.units : '') + '. In the flask: ' + ui.lab.state.device.recordAs + ' cm³ of ' + esc(run.prep ? 'the standard sodium carbonate' : nm(run.analyte.id)) + '.</p>';
    h += '<table><thead><tr><th>Titration</th><th>Initial / cm³</th><th>Final / cm³</th><th>Titre / cm³</th><th>Concordant</th></tr></thead><tbody>' + R.trials.map(function (t) {
      return '<tr><td>' + (t.kind === 'rough' ? 'Rough' : 'Titration ' + (R.precise.indexOf(t) + 1)) + '</td><td>' + f2(t.initialRec) + '</td><td>' + f2(t.finalRec) + '</td><td>' + f2(t.titre) + '</td><td>' + (R.concordantNs.indexOf(t.n) >= 0 ? '✓' : '') + '</td></tr>';
    }).join('') + '</tbody></table>';
    h += revealHtml(true);
    $('#printReport').innerHTML = h;
  }

  /* ---------- pH curve ---------- */
  function curveSvg(print) {
    var run = ui.run, lab = ui.lab, ink = print ? '#000' : '#edf2f8', grid = print ? '#ccc' : '#182535', muted = print ? '#444' : '#8693a5', line = print ? '#0b5394' : '#47b5fa';
    var sys = lab.curveSystem(25), veq = X.expectedTitre(run, run.analyte.conc_M, 25), max = Math.ceil(veq * 2 / 5) * 5;
    var pts = E.pHCurve(sys, max, 0.1);
    var W = 560, H = 340, l = 48, r = 16, t = 14, b = 40, x = function (v) { return l + v / max * (W - l - r); }, y = function (p) { return t + (14 - p) / 14 * (H - t - b); };
    var s = '<svg viewBox="0 0 ' + W + ' ' + H + '" role="img" aria-label="pH against volume of titrant added">';
    var ind = (ui.lab.state.trials[ui.lab.state.trials.length - 1] || {}).indicator;
    if (ind && E.INDICATORS[ind] && E.INDICATORS[ind].pKIn) {
      var rg = E.INDICATORS[ind].range;
      s += '<rect x="' + l + '" y="' + y(rg[1]) + '" width="' + (W - l - r) + '" height="' + (y(rg[0]) - y(rg[1])) + '" fill="' + (print ? '#e6eef8' : 'rgba(71,181,250,0.16)') + '"/>';
      s += '<text x="' + (W - r - 4) + '" y="' + (y(rg[1]) - 4) + '" fill="' + muted + '" font-size="12" text-anchor="end">' + E.INDICATORS[ind].name + '</text>';
    }
    for (var p = 0; p <= 14; p += 2) s += '<line x1="' + l + '" x2="' + (W - r) + '" y1="' + y(p) + '" y2="' + y(p) + '" stroke="' + grid + '"/><text x="' + (l - 6) + '" y="' + (y(p) + 4) + '" fill="' + muted + '" font-size="12" text-anchor="end">' + p + '</text>';
    for (var v = 0; v <= max; v += 5) s += '<line y1="' + t + '" y2="' + (H - b) + '" x1="' + x(v) + '" x2="' + x(v) + '" stroke="' + grid + '"/><text x="' + x(v) + '" y="' + (H - b + 16) + '" fill="' + muted + '" font-size="12" text-anchor="middle">' + v + '</text>';
    s += '<path d="' + pts.map(function (q, i) { return (i ? 'L' : 'M') + x(q.v).toFixed(1) + ',' + y(q.pH).toFixed(1); }).join('') + '" fill="none" stroke="' + line + '" stroke-width="2"/>';
    s += '<line x1="' + x(veq) + '" x2="' + x(veq) + '" y1="' + t + '" y2="' + (H - b) + '" stroke="' + ink + '" stroke-dasharray="4 4"/><text x="' + (x(veq) + 4) + '" y="' + (t + 12) + '" fill="' + ink + '" font-size="12">equivalence</text>';
    if (ui.submitted && ui.submitted.mean && ui.submitted.mean <= max) {
      var sx = x(ui.submitted.mean), warn = print ? '#9a5b00' : '#f2c94c';
      s += '<line x1="' + sx + '" x2="' + sx + '" y1="' + (t + 18) + '" y2="' + (H - b) + '" stroke="' + warn + '" stroke-width="2"/><text x="' + (sx + 4) + '" y="' + (t + 30) + '" fill="' + warn + '" font-size="12">your endpoint</text>';
    }
    s += '<text x="' + ((l + W - r) / 2) + '" y="' + (H - 6) + '" fill="' + ink + '" font-size="13" text-anchor="middle">Volume of ' + esc(nm(run.titrant.id)) + ' added / cm³</text>';
    s += '<text transform="translate(14 ' + ((t + H - b) / 2) + ') rotate(-90)" fill="' + ink + '" font-size="13" text-anchor="middle">pH</text></svg>';
    return s;
  }
  // The worksheet's ethanoic acid curve, drawn from the engine with a reading grid.
  function worksheetCurve() {
    var sys = { analyte: 'CH3COOH', analyteAmount_mol: 0.0025, aliquot_cm3: 25, titrant: 'NaOH', titrantConc_M: 0.1 };
    var pts = E.pHCurve(sys, 50, 0.1), W = 520, H = 360, l = 46, r = 14, t = 12, b = 42, max = 50;
    var x = function (v) { return l + v / max * (W - l - r); }, y = function (p) { return t + (14 - p) / 14 * (H - t - b); };
    var s = '<svg viewBox="0 0 ' + W + ' ' + H + '" role="img" aria-label="pH curve: ethanoic acid titrated with sodium hydroxide">';
    for (var p = 0; p <= 14; p += 0.5) s += '<line x1="' + l + '" x2="' + (W - r) + '" y1="' + y(p) + '" y2="' + y(p) + '" stroke="' + (p % 1 ? '#e2e2e2' : '#b5b5b5') + '"/>';
    for (var v = 0; v <= max; v += 2.5) s += '<line y1="' + t + '" y2="' + (H - b) + '" x1="' + x(v) + '" x2="' + x(v) + '" stroke="' + (v % 5 ? '#e2e2e2' : '#b5b5b5') + '"/>';
    for (var q = 0; q <= 14; q += 2) s += '<text x="' + (l - 6) + '" y="' + (y(q) + 4) + '" font-size="12" text-anchor="end">' + q + '</text>';
    for (var w = 0; w <= max; w += 10) s += '<text x="' + x(w) + '" y="' + (H - b + 16) + '" font-size="12" text-anchor="middle">' + w + '</text>';
    s += '<path d="' + pts.map(function (pt, i) { return (i ? 'L' : 'M') + x(pt.v).toFixed(1) + ',' + y(pt.pH).toFixed(1); }).join('') + '" fill="none" stroke="#000" stroke-width="2"/>';
    s += '<text x="' + ((l + W - r) / 2) + '" y="' + (H - 6) + '" font-size="13" text-anchor="middle">Volume of NaOH added / cm³</text><text transform="translate(13 ' + ((t + H - b) / 2) + ') rotate(-90)" font-size="13" text-anchor="middle">pH</text></svg>';
    $('#wsCurve').innerHTML = s;
  }

  /* ---------- Presenter mode: text on the bench sized for the board ---------- */
  function sizeForBoard(only) {
    var presenting = document.body.classList.contains('presenting');
    // On a phone, the titration bench is cropped to the stand, burette and flask.
    // Not while setting up: every piece of apparatus has to be there to click.
    var bsvg = $('#benchSvg'), crop = ui.sceneKind === 'titration' && ui.stage === 'titrate' && !presenting && window.innerWidth < 560;
    if (bsvg && ui.sceneKind) {
      var vb = crop ? '100 0 640 600' : '0 0 960 600';
      if (bsvg.getAttribute('viewBox') !== vb) bsvg.setAttribute('viewBox', vb);
      $('#bench').classList.toggle('crop', crop);
    }
    (only ? only.map(function (x) { return [x, 1]; }) : [['#benchSvg', 1], ['#lensSvg', 1]]).forEach(function (pair) {
      var svg = $(pair[0]); if (!svg) return;
      var ctm = svg.getScreenCTM && svg.getScreenCTM(), k = ctm ? Math.hypot(ctm.a, ctm.b) : 1;
      var floor = presenting && window.SST_PRESENT ? SST_PRESENT.px('--sst-pr-label') / (k || 1) : 0;
      svg.querySelectorAll('text').forEach(function (t) {
        var base = parseFloat(t.getAttribute('data-fs') || t.getAttribute('font-size') || '13');
        if (!t.hasAttribute('data-fs')) t.setAttribute('data-fs', base);
        // Labels inside the bottles are too small to enlarge in place; on the
        // board the brief's slide carries what they say.
        var tiny = base < 11 && pair[0] === '#benchSvg';
        // On the board, burette numbers every 10 cm³ (the lens has the fine scale).
        var crowded = t.classList.contains('scale') && +t.textContent % 10 !== 0;
        t.style.display = presenting && (tiny || crowded || t.classList.contains('cap')) ? 'none' : '';
        t.setAttribute('font-size', presenting ? Math.max(base, floor).toFixed(1) : base);
      });
    });
  }

  /* ---------- Printing ---------- */
  function openPrint(preset) {
    var dlg = $('#printDlg');
    var level = ui.run ? (ui.run.gcse ? 'gcse' : 'alevel') : ui.level || 'gcse';
    $$('#printDlg input[name="pLevel"]').forEach(function (r) { r.checked = r.value === level; });
    $('#pWs').checked = !preset; $('#pMs').checked = false;
    $('#pReport').checked = !!(preset && preset.indexOf('report') >= 0) || (!preset && !!ui.submitted);
    $('#pReport').disabled = !ui.submitted;
    $('#pBlank').checked = false;
    if (window.SST_PRESENTER) SST_PRESENTER.toggle(false);
    dlg.returnValue = '';   // Esc keeps the old value: never let it mean "print"
    dlg.showModal();
  }
  function doPrint() {
    var b = document.body, level = ($('#printDlg input[name="pLevel"]:checked') || {}).value || 'gcse';
    var cls = ['print-custom'];
    if ($('#pWs').checked) cls.push('p-ws-' + level);
    if ($('#pMs').checked) cls.push('p-ms-' + level);
    if ($('#pReport').checked && ui.submitted) { buildReport(); cls.push('p-report'); }
    if ($('#pBlank').checked) cls.push('p-blank');
    if (cls.length === 1) return;
    cls.forEach(function (c) { b.classList.add(c); });
    var title = document.title;
    document.title = 'Titration Lab — ' + (level === 'gcse' ? 'GCSE' : 'A-level');
    function done() { document.title = title; cls.forEach(function (c) { b.classList.remove(c); }); window.removeEventListener('afterprint', done); }
    window.addEventListener('afterprint', done);
    setTimeout(function () { window.print(); }, 60);
  }

  /* ---------- Keys ---------- */
  function onKey(e) {
    if (ui.view !== 'lab' || ui.sceneKind !== 'titration' || ui.stage !== 'titrate') return;
    var t = e.target;
    if (e.ctrlKey || e.metaKey || e.altKey || (t && t.closest && t.closest('input, textarea, select, [contenteditable="true"], dialog'))) return;
    var k = e.key.toLowerCase(), st = titrateState();
    var map = { '1': '1.0', '2': '0.5', '3': '0.1', '4': 'drop' };
    if (map[k] && st === 'add') { e.preventDefault(); act(function () { return ui.lab.add(map[k]); }); }
    else if (k === 's' && st === 'add') { e.preventDefault(); swirl(); }
    else if (k === 'r' && (st === 'initial' || st === 'final')) { e.preventDefault(); $('#readingIn').focus(); }
  }

  /* ---------- Start ---------- */
  function init() {
    buildPicker();
    worksheetCurve();
    $('#briefForm').addEventListener('submit', function (e) { e.preventDefault(); startLab(); });
    $('#btnChange').addEventListener('click', function () { if (ui.view === 'lab' && ui.lab && ui.lab.state.trials.length && !confirm('Leave this experiment? Your results will be lost.')) return; buildPicker(); show('picker'); try { history.replaceState(null, '', location.pathname); } catch (e) { /* file:// */ } });
    $('#backToBench').addEventListener('click', function () { ui.stage = 'titrate'; show('lab'); refresh(true); });
    $('#btnPresent').addEventListener('click', function () { if (window.SST_PRESENTER) SST_PRESENTER.toggle(); });
    $('#btnAnnotate').addEventListener('click', function () { var n = document.querySelector('.sst-bar .sst-ink-nav:not(.sst-pres-nav)'); if (n) n.click(); });
    $('#btnPrint').addEventListener('click', function () { openPrint(null); });
    $('#printDlg').addEventListener('close', function () { if ($('#printDlg').returnValue === 'print') doPrint(); });
    $('#benchSvg').addEventListener('click', onBenchClick);
    $('#benchSvg').addEventListener('pointerdown', onBenchDown);
    $('#benchSvg').addEventListener('keydown', function (e) {
      if ((e.key === 'Enter' || e.key === ' ') && e.target.closest && e.target.closest('[data-part]')) { e.preventDefault(); onBenchClick(e); }
    });
    ['pointerup', 'pointercancel', 'blur'].forEach(function (ev) { window.addEventListener(ev, onBenchUp); });
    $('#codeGo').addEventListener('click', function () {
      var c = parseCode($('#codeIn').value);
      if (!c) { $('#codeMsg').textContent = 'That isn’t a code from this page: it looks like 3-K7Q2.'; return; }
      $('#codeMsg').textContent = ''; openBrief(c.id, c.seed);
    });
    $('#codeIn').addEventListener('keydown', function (e) { if (e.key === 'Enter') { e.preventDefault(); $('#codeGo').click(); } });
    document.addEventListener('keydown', onKey);
    window.addEventListener('resize', function () { clearTimeout(ui.rs); ui.rs = setTimeout(sizeForBoard, 80); });
    new MutationObserver(function () { setTimeout(sizeForBoard, 60); }).observe(document.body, { attributes: true, attributeFilter: ['class'] });
    if (window.SST_PRESENTER) {
      SST_PRESENTER.setup({
        stage: function () { return ui.view === 'lab' ? (ui.stage === 'titrate' ? ['#bench', '#results'] : '#bench') : ui.view === 'analyse' ? '#analyse' : ui.view === 'brief' ? '#brief' : '#picker'; },
        side: function () { return ui.view !== 'lab' ? null : ui.stage === 'titrate' ? '#titrate' : '#method'; },
        notes: function () { return ui.view === 'lab' ? '#boardNotes' : null; },
        hide: '#srLive, #prompt',
        rows: true, ratio: 0.62
      });
    }
    // ?print=ws-alevel,ms-alevel lays the page out for that printout (for a
    // link a teacher can share, and for checking layouts). The mark scheme is
    // only ever included when asked for by name.
    var pr = /[?&]print=([a-z,-]+)/.exec(location.search);
    if (pr) pr[1].split(',').forEach(function (k) {
      if (/^(ws|ms)-(gcse|alevel)$|^blank$/.test(k)) { document.body.classList.add('print-custom', 'p-' + k); }
    });
    // Deep links: #exp=alevel-fe, or a challenge code.
    var m = /exp=([a-z0-9-]+)/.exec(location.hash), code = /code=([0-9]-[0-9A-Z]+)/i.exec(location.hash);
    if (code && parseCode(code[1])) { var c = parseCode(code[1]); openBrief(c.id, c.seed); }
    else if (m && X.byId(m[1])) openBrief(m[1], newSeed());
  }
  // For the browser checks in tests.html and for anyone curious. The answer is
  // in here too: nothing in a page that runs in the browser can be hidden.
  window.TitrationPage = ui;
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
})();
