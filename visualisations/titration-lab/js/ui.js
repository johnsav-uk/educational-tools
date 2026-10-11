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
  function buildPicker() {
    var prog = progress(), html = '';
    GROUPS.forEach(function (g) {
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
    $$('#pickerGroups .card-btn').forEach(function (b) { b.addEventListener('click', function () { openBrief(b.getAttribute('data-exp'), newSeed()); }); });
  }

  /* ---------- Brief ---------- */
  function openBrief(id, seed, sample) {
    var def = X.byId(id);
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
    if (run.mode === 'guided') h += '<h3>How this works</h3><p>The steps are listed beside the bench and tick off as you do them. Each one says why it matters. Read the burette yourself in the magnified view; you’ll get help if a reading is off.</p>';
    else h += '<h3>How this works</h3><p>Plan your own method. Every piece of apparatus is on the bench; choose what to do with it. Mistakes aren’t stopped, but they change your results the way they would in a real lab, and your report explains them. “What next?” gives a hint if you’re stuck.</p>';
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

  /* ---------- Starting the lab ---------- */
  function startLab() {
    var run = ui.run;
    var picked = $('#briefChoices input[name="aliquot"]:checked');
    if (picked) ui.choices.aliquot = picked.value;
    run.aliquotDeviceKind = E.APPARATUS[ui.choices.aliquot || 'pipette25'].kind;
    ui.lab = L.create(run, { choices: { aliquot: ui.choices.aliquot } });
    ui.hints = 0; ui.calc = {}; ui.submitted = null; ui.ticks = null; ui.prepCalc = {}; ui.lastColour = null;
    ui.inPrep = !!run.prep;
    buildScene();
    show('lab');
    feedback(null);
    refresh(true);
  }

  function buildScene() {
    var run = ui.run, svg = $('#benchSvg'), lens = $('#lensSvg');
    if (ui.inPrep) {
      ui.scene = new B.PrepScene(svg, run); ui.lens = new B.NeckLens(lens); ui.sceneKind = 'prep';
      $('#lensCap').textContent = 'Bottom of the meniscus on the mark';
      svg.setAttribute('aria-label', 'Balance with weighing bottle, beaker with glass rod, 250.0 cm³ volumetric flask, deionised water and dropper.');
      ui.tab = 'weigh';
    } else {
      ui.scene = new B.TitrationScene(svg, run); ui.lens = new B.BuretteLens(lens, run); ui.sceneKind = 'titration';
      $('#lensCap').innerHTML = run.titrant.id === 'KMnO4' ? '<span class="cap-long">Too dark to see through: </span>read the top of the meniscus' : 'Read the bottom of the meniscus';
      $('#lensBox').title = 'Magnified burette scale at the meniscus. Each small division is 0.10 cm³.';
      svg.setAttribute('aria-label', 'Clamp stand holding a 50 cm³ burette over a conical flask, with a white tile, waste beaker, reagent bottles, ' + (run.type === 'redox' ? 'acids' : 'indicators') + ', wash bottle, funnel and pipette.');
      ui.tab = 'burette';
    }
    svg.querySelectorAll('text').forEach(function (t) { t.setAttribute('data-fs', t.getAttribute('font-size') || '13'); });
    $('#clock').hidden = !(run.type === 'redox' && run.warm);
    buildDock();
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
      paintChip();
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
    return [b.reading === null, b.funnel, b.tap, b.pending > 0, b.jetAir > 0, b.reading !== null && b.reading < 0, s.flaskState, s.under, s.tile, s.keepSwirling,
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
    var label = 'Flask: ' + d.text + (s.flask.un.vol > 0.003 ? ' (not yet swirled)' : '');
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

  /* ---------- Feedback from each action ---------- */
  var KIND = { good: 'Good', mistake: 'Careful', invalid: 'Not yet', retry: 'Try again', harmless: 'Fine', alternative: 'That works', info: '' };
  function feedback(r) {
    var box = $('#feedback');
    if (!r || !r.msg) { box.textContent = ''; box.className = 'feedback'; return; }
    // In independent work, a mistake is allowed without comment: it shows in the report.
    var quiet = !ui.lab.guided && r.kind === 'mistake' && !/final|acid-|warm-hot|ind-two|fill-over/.test(r.code || '');
    var kind = quiet ? 'info' : r.kind;
    var msg = quiet ? quietMessage(r) : r.msg;
    box.className = 'feedback ' + kind;
    box.innerHTML = (KIND[kind] ? '<span class="tag">' + KIND[kind] + '.</span> ' : '') + msg;
  }
  function quietMessage(r) {
    if (r.code === 'pipette') return 'Portion pipetted into the flask.';
    if (r.code === 'rinse-flask-analyte') return 'Flask rinsed with the solution.';
    return r.msg.split('. ')[0] + '.';
  }
  function act(fn) {
    var r = fn();
    if (r) feedback(r);
    ui.lastKey = '';
    refresh();
    return r;
  }

  /* ---------- Dock ---------- */
  function buildDock() {
    var dock = $('#dock'), run = ui.run;
    if (ui.sceneKind === 'prep') {
      dock.innerHTML = '<div class="grp"><span class="lbl">Make up to the mark</span>' +
        '<button class="btn" type="button" data-prep="fill-bottle">Wash bottle: towards the mark</button>' +
        '<button class="btn" type="button" data-prep="fill-drop">Dropper: 1 drop</button></div>' +
        '<div class="grp"><span class="lbl">Mix</span><button class="btn" type="button" data-prep="stopper">Stopper</button>' +
        '<button class="btn" type="button" data-prep="invert">Invert the flask</button></div>' +
        '<div class="grp"><span class="lbl">Balance</span><span class="muted" id="balRead"></span></div>';
      $$('#dock [data-prep]').forEach(function (b) { b.addEventListener('click', function () { prepAction(b.getAttribute('data-prep')); }); });
      return;
    }
    dock.innerHTML =
      '<div class="grp"><span class="lbl" aria-hidden="true">Tap</span>' +
        '<button class="btn hold" type="button" id="holdBtn" aria-describedby="holdHelp">Hold to run</button>' +
        '<span class="seg" role="group" aria-label="Flow"><button type="button" data-flow="slow" aria-pressed="true">Drip</button><button type="button" data-flow="fast" aria-pressed="false">Stream</button></span>' +
        '<span id="holdHelp" class="sr-only">Press and hold, or hold the space bar, to keep the tap open. Release to close it.</span></div>' +
      '<div class="grp"><span class="lbl" aria-hidden="true">Add</span>' +
        '<button class="btn" type="button" data-add="1.0" title="About 1.0 cm³ (key 1)">+1.0</button><button class="btn" type="button" data-add="0.5" title="About 0.5 cm³ (key 2)">+0.5</button>' +
        '<button class="btn" type="button" data-add="0.1" title="About 0.1 cm³ (key 3)">+0.1</button><button class="btn" type="button" data-add="drop" title="One drop, about 0.05 cm³ (key 4)">1 drop</button></div>' +
      '<div class="grp"><span class="lbl" aria-hidden="true">Mix</span><button class="btn" type="button" id="swirlBtn" title="Swirl the flask (S)">Swirl</button>' +
        '<button class="btn" type="button" id="keepSwirl" aria-pressed="false">Keep swirling</button>' +
        (run.type === 'redox' ? '<button class="btn" type="button" id="waitBtn">Wait 30 s</button>' : '') + '</div>' +
      '<div class="grp reading"><span class="lbl" aria-hidden="true">Read</span>' +
        '<label class="sr-only" for="readingIn">Burette reading in cm³</label><input id="readingIn" title="Type the reading, to 2 decimal places (R to jump here)" type="text" inputmode="decimal" autocomplete="off" placeholder="0.00" maxlength="6"><span class="unit">cm³</span>' +
        '<button class="btn" type="button" id="recInit">Record initial</button><button class="btn" type="button" id="recFinal">Record final</button></div>';
    var hold = $('#holdBtn'), flow = 'slow';
    function open() { if (hold.classList.contains('down')) return; var r = ui.lab.tap(true, flow); if (r.ok) hold.classList.add('down'); else feedback(r); }
    function close() { if (!hold.classList.contains('down')) return; hold.classList.remove('down'); ui.lab.tap(false); announce('Tap closed.'); ui.lastKey = ''; }
    hold.addEventListener('pointerdown', function (e) { e.preventDefault(); hold.setPointerCapture && hold.setPointerCapture(e.pointerId); open(); });
    ['pointerup', 'pointercancel', 'lostpointercapture'].forEach(function (ev) { hold.addEventListener(ev, close); });
    hold.addEventListener('contextmenu', function (e) { e.preventDefault(); });
    hold.addEventListener('keydown', function (e) { if ((e.key === ' ' || e.key === 'Enter') && !e.repeat) { e.preventDefault(); open(); } });
    hold.addEventListener('keyup', function (e) { if (e.key === ' ' || e.key === 'Enter') { e.preventDefault(); close(); } });
    hold.addEventListener('blur', close);
    $$('#dock [data-flow]').forEach(function (b) {
      b.addEventListener('click', function () {
        flow = b.getAttribute('data-flow');
        $$('#dock [data-flow]').forEach(function (x) { x.setAttribute('aria-pressed', String(x === b)); });
        ui.lab.state.burette.flow = flow;
      });
    });
    $$('#dock [data-add]').forEach(function (b) { b.addEventListener('click', function () { act(function () { return addStep(b.getAttribute('data-add')); }); }); });
    $('#swirlBtn').addEventListener('click', function () { act(function () { return ui.lab.swirl(); }); });
    $('#keepSwirl').addEventListener('click', function () { act(function () { return ui.lab.setKeepSwirling(!ui.lab.state.keepSwirling); }); });
    if ($('#waitBtn')) $('#waitBtn').addEventListener('click', function () { act(function () { return ui.lab.wait(30); }); });
    $('#recInit').addEventListener('click', function () { record('initial'); });
    $('#recFinal').addEventListener('click', function () { record('final'); });
    $('#readingIn').addEventListener('keydown', function (e) {
      if (e.key === 'Enter') { e.preventDefault(); record(ui.lab.state.trial && ui.lab.state.trial.initialRec !== null ? 'final' : 'initial'); }
    });
  }
  function addStep(step) {
    var r = ui.lab.add(step);
    if (r.ok && step === 'drop' && ui.lab.state.keepSwirling && ui.lab.state.flask) ui.lab.state.flask.swirl();
    return r;
  }
  function record(which) {
    var input = $('#readingIn'), r;
    r = act(function () { return which === 'initial' ? ui.lab.recordInitial(input.value) : ui.lab.recordFinal(input.value); });
    if (r && r.ok) { input.value = ''; if (which === 'final') ui.lastColour = null; }
    else input.focus();
  }

  /* ---------- Apparatus actions ---------- */
  function tabsFor() {
    if (ui.sceneKind === 'prep') return [['weigh', 'Weigh'], ['dissolve', 'Dissolve'], ['transfer', 'Transfer'], ['makeup', 'Make up']];
    return [['burette', 'Burette'], ['flask', 'Pipette and flask']];
  }
  function btn(label, action, opts) {
    opts = opts || {};
    return '<button class="btn' + (opts.cls ? ' ' + opts.cls : '') + '" type="button" data-act="' + action + '"' + (opts.pressed !== undefined ? ' aria-pressed="' + opts.pressed + '"' : '') + (opts.disabled ? ' disabled' : '') + '>' + label + '</button>';
  }
  function renderActions() {
    var tabs = tabsFor(), lab = ui.lab, run = ui.run, s = lab.state;
    if (!tabs.some(function (t) { return t[0] === ui.tab; })) ui.tab = tabs[0][0];
    $('#actionTabs').innerHTML = tabs.map(function (t) {
      return '<button type="button" role="tab" id="tab-' + t[0] + '" aria-selected="' + (t[0] === ui.tab) + '" aria-controls="actionPanel" data-tab="' + t[0] + '">' + t[1] + '</button>';
    }).join('');
    $$('#actionTabs [data-tab]').forEach(function (b, i, all) {
      b.tabIndex = b.getAttribute('aria-selected') === 'true' ? 0 : -1;
      b.addEventListener('click', function () { ui.tab = b.getAttribute('data-tab'); renderActions(); });
      b.addEventListener('keydown', function (e) {
        var d = { ArrowRight: 1, ArrowLeft: -1 }[e.key];
        if (!d) return;
        e.preventDefault();
        ui.tab = all[(i + d + all.length) % all.length].getAttribute('data-tab'); renderActions();
        var now = $('#actionTabs [aria-selected="true"]'); if (now) now.focus();
      });
    });
    var h = '<div class="acts" role="tabpanel" aria-labelledby="tab-' + ui.tab + '">';
    var tName = nm(run.titrant.id), aName = run.prep ? 'standard solution' : nm(run.analyte.id);
    if (ui.tab === 'burette') {
      var b = s.burette;
      h += '<h4>Clean</h4>' + btn('Rinse with distilled water', 'rinseBurette:water') + btn('Rinse with ' + esc(tName), 'rinseBurette:titrant');
      h += '<h4>Fill</h4>' + btn(b.funnel ? 'Take the funnel out' : 'Put the funnel in', 'funnel', { pressed: b.funnel }) + btn('Fill through the funnel', 'fill') +
        btn('Run the burette empty', 'emptyBurette', { cls: 'full' });
      h += '<h4>Under the jet</h4>' + btn('Waste beaker', 'place:waste', { pressed: s.under === 'waste' }) + btn('Conical flask', 'place:flask', { pressed: s.under === 'flask' });
    } else if (ui.tab === 'flask') {
      var dev = s.device;
      if (dev.kind === 'pipette') h += '<h4>Pipette</h4>' + btn('Rinse with distilled water', 'rinsePipette:water') + btn('Rinse with the ' + esc(aName), 'rinsePipette:analyte');
      h += '<h4>Conical flask</h4>' + btn('Rinse with distilled water', 'rinseFlask:water') + btn('Rinse with the ' + esc(aName), 'rinseFlask:analyte') +
        btn('Empty it and wash it out', 'emptyFlask', { cls: 'full' });
      h += '<h4>Portion of ' + esc(aName) + '</h4>';
      if (dev.kind === 'pipette') {
        h += btn('Pipette 25.00 cm³, touch the tip on the flask', 'pipette:touch', { cls: lab.guided ? 'full' : '' });
        if (!lab.guided) h += btn('Pipette 25.00 cm³, blow out the last drop', 'pipette:blow');
      } else h += btn('Measure 25 cm³ with the measuring cylinder', 'pipette:touch', { cls: 'full' });
      if (run.type === 'acid-base') {
        var opts = run.chooseIndicator ? run.indicatorOptions : [run.indicator];
        h += '<h4>Indicator (3 drops)</h4>' + opts.map(function (id) { return btn(E.INDICATORS[id].name, 'indicator:' + id); }).join('');
      } else {
        h += '<h4>Acidify (10 cm³ from a measuring cylinder)</h4>' + btn('Dilute sulfuric acid', 'acid:H2SO4') + btn('Dilute hydrochloric acid', 'acid:HCl') + btn('Dilute nitric acid', 'acid:HNO3');
        h += '<h4>Warm in a water bath</h4>' + btn('40 °C', 'warm:40') + btn('60 °C', 'warm:60') + btn('80 °C', 'warm:80');
      }
      h += '<h4>Around the flask</h4>' + btn(s.tile ? 'Take the white tile away' : 'Put the white tile under it', 'tile', { pressed: s.tile }) +
        btn('Wash down the inside with distilled water', 'washSides');
    } else if (ui.tab === 'weigh') {
      var p = s.prep;
      h += massRows(p) + '<h4>Weigh by difference</h4>' + btn('Record the empty bottle', 'prep:m0') +
        btn('Add a spatula of solid', 'prep:scoop') + btn('Add a little', 'prep:small') + btn('Add a pinch', 'prep:pinch') + btn('Take a little out', 'prep:remove') +
        btn('Record the bottle + solid', 'prep:m1') + btn('Tip the solid into the beaker', 'prep:tip') + btn('Reweigh the bottle', 'prep:m2') +
        btn('Rinse the bottle into the beaker', 'prep:rinseBottle', { cls: 'full' });
    } else if (ui.tab === 'dissolve') {
      h += '<h4>Dissolve</h4>' + btn('Add about 100 cm³ deionised water', 'prep:water', { cls: 'full' }) + btn('Stir with the glass rod', 'prep:stir', { cls: 'full' });
    } else if (ui.tab === 'transfer') {
      var pp = s.prep;
      h += '<h4>Into the volumetric flask</h4>' + btn(pp.funnel ? 'Take the funnel out' : 'Put the funnel in the flask', 'prep:funnel', { pressed: pp.funnel, cls: 'full' }) +
        btn('Pour the solution in', 'prep:pour', { cls: 'full' }) +
        '<h4>Rinse into the flask (deionised water)</h4>' + btn('Rinse the beaker', 'prep:rinse:beaker') + btn('Rinse the glass rod', 'prep:rinse:rod') + btn('Rinse the funnel', 'prep:rinse:funnel', { cls: 'full' });
    } else if (ui.tab === 'makeup') {
      h += '<h4>To the mark</h4>' + btn('Wash bottle: towards the mark', 'prep:fill-bottle') + btn('Dropper: 1 drop', 'prep:fill-drop') +
        '<h4>Mix</h4>' + btn('Stopper', 'prep:stopper') + btn('Invert the flask', 'prep:invert') +
        '<h4>Finished?</h4>' + btn('The solution is made', 'prep:finish', { cls: 'full' }) + btn('Start the solution again', 'prep:restart', { cls: 'full' });
    }
    h += '</div>';
    $('#actionPanel').innerHTML = h;
    $$('#actionPanel [data-act]').forEach(function (b) { b.addEventListener('click', function () { doAction(b.getAttribute('data-act')); }); });
  }
  function massRows(p) {
    function row(label, v) { return '<div class="massrow"><span>' + label + '</span><b>' + (v === null ? '—' : v.toFixed(2) + ' g') + '</b></div>'; }
    return '<div class="full" style="grid-column:1/-1">' + row('Balance now', p.balance()) + row('Empty bottle (m₀)', p.m0) + row('Bottle + solid (m₁)', p.m1) + row('Bottle after tipping (m₂)', p.m2) + '</div>';
  }
  function doAction(code) {
    var lab = ui.lab, parts = code.split(':');
    if (parts[0] === 'prep') { prepAction(parts.slice(1).join(':')); return; }
    act(function () {
      switch (parts[0]) {
        case 'rinseBurette': return lab.rinseBurette(parts[1]);
        case 'funnel': return lab.setFunnel(!lab.state.burette.funnel);
        case 'fill': return lab.fillBurette();
        case 'emptyBurette': return lab.emptyBurette();
        case 'place': return lab.place(parts[1]);
        case 'rinsePipette': return lab.rinsePipette(parts[1]);
        case 'rinseFlask': return lab.rinseFlask(parts[1]);
        case 'emptyFlask': return lab.emptyFlask();
        case 'pipette': return lab.pipette(parts[1]);
        case 'indicator': return lab.addIndicator(parts[1]);
        case 'acid': return lab.addAcid(parts[1]);
        case 'warm': return lab.warm(+parts[1]);
        case 'tile': return lab.setTile(!lab.state.tile);
        case 'washSides': return lab.washSides();
      }
    });
  }
  function prepAction(code) {
    var p = ui.lab.state.prep, parts = code.split(':');
    if (!p) return;
    act(function () {
      switch (parts[0]) {
        case 'm0': case 'm1': case 'm2': return p.recordMass(parts[0]);
        case 'scoop': return p.addSolid('scoop');
        case 'small': return p.addSolid('small');
        case 'pinch': return p.addSolid('pinch');
        case 'remove': return p.addSolid('remove');
        case 'tip': return p.tip();
        case 'rinseBottle': return p.rinseBottle();
        case 'water': return p.addWater();
        case 'stir': return p.stir();
        case 'funnel': return p.setFunnel(!p.funnel);
        case 'pour': return p.pour();
        case 'rinse': return p.rinse(parts[1]);
        case 'fill-bottle': return p.fillWater('bottle');
        case 'fill-drop': return p.fillWater('drop');
        case 'stopper': return p.stopper();
        case 'invert': return p.invert();
        case 'finish': return p.finish();
        case 'restart': var rr = ui.lab.restartPrep(); if (rr.ok) ui.prepCalc = {}; return rr;
      }
    });
  }

  /* ---------- Method ---------- */
  function renderMethod() {
    var lab = ui.lab, run = ui.run, s = lab.state, h = '';
    var steps = ui.inPrep ? s.prep.steps() : lab.steps();
    var now = steps.filter(function (x) { return x.current; })[0];
    if (ui.inPrep) {
      $('#methodTitle').textContent = 'Make the standard solution';
      h += '<ol class="steps">' + steps.map(function (st) { return '<li class="' + (st.done ? 'done' : '') + (st.current ? ' now' : '') + '">' + st.text + '</li>'; }).join('') + '</ol>';
      h += prepCalcHtml();
    } else if (lab.guided) {
      $('#methodTitle').textContent = 'Method';
      h += '<ol class="steps">' + steps.map(function (st) {
        return '<li class="' + (st.done ? 'done' : '') + (st.current ? ' now' : '') + '">' + st.text + (st.current && st.why ? '<span class="why">' + st.why + '</span>' : '') + '</li>';
      }).join('') + '</ol>';
    } else {
      $('#methodTitle').textContent = 'Your task';
      var u = run.unknownSolution;
      h += '<p style="margin:0 0 8px">' + (run.prep ? 'Titrate 25.00 cm³ portions of your standard with the hydrochloric acid until you have concordant titres.' : 'Find the concentration of the ' + esc(nm(u.id)) + '. Do a rough titration, then repeat until you have concordant titres.') + '</p>';
      if (ui.showHint && now) h += '<div class="now-card"><b>Next: ' + now.text + '</b>' + (now.why ? '<p>' + now.why + '</p>' : '') + '</div>';
      var kn = function (sol) { return sol.fromPrep ? 'your standard, ' + sf(lab.state.prep.statedConc(), 4) + ' ' + run.units : sol.known ? E.fmtSig(sol.conc_M, 3) + ' ' + run.units : 'unknown'; };
      h += '<dl class="know small">' +
        '<dt>Burette</dt><dd>' + esc(nm(run.titrant.id)) + ', ' + kn(run.titrant) + '</dd>' +
        '<dt>Flask</dt><dd>' + s.device.recordAs + ' cm³ ' + esc(run.prep ? 'sodium carbonate' : nm(run.analyte.id)) + ', ' + kn(run.analyte) + '</dd>' +
        (run.type === 'acid-base' ? '<dt>Equation</dt><dd>' + run.eq.molecular + '</dd>' : '') +
        '<dt>Concordant</dt><dd>within ' + run.concordanceTol_cm3.toFixed(2) + ' cm³</dd></dl>';
      h += '<button class="btn sm" type="button" id="hintBtn">' + (ui.showHint ? 'Hide the hint' : 'What next?') + '</button>';
    }
    if (ui.run.mystery) h += '<p class="muted" style="margin:10px 0 0;font-size:.85rem">Challenge code <b>' + codeFor(ui.run) + '</b></p>';
    $('#methodBody').innerHTML = h;
    var nowLi = $('#methodBody li.now');
    if (nowLi && lab.guided) { var card = $('#method'), top = nowLi.offsetTop - card.offsetTop; if (top < card.scrollTop || top > card.scrollTop + card.clientHeight - 60) card.scrollTop = Math.max(0, top - 80); }
    if ($('#hintBtn')) $('#hintBtn').addEventListener('click', function () { ui.showHint = !ui.showHint; if (ui.showHint) ui.hints++; renderMethod(); });
    wirePrepCalc();
    // Slides for the board: the current step in words.
    var notes = $('#boardNotes');
    if (!notes) { notes = document.createElement('div'); notes.id = 'boardNotes'; notes.className = 'sr-only'; notes.setAttribute('aria-hidden', 'true'); document.body.appendChild(notes); }
    var colour = s.flask && !ui.inPrep ? s.flask.describe().text : '';
    var html = now ? '<h3>' + now.text + '</h3>' + (now.why ? '<p>' + now.why + '</p>' : '') : '<h3>' + esc(run.def.title) + '</h3><p>Record the readings and repeat until the titres are concordant.</p>';
    if (colour) html += '<p>The flask is ' + esc(colour) + '.</p>';
    if (notes.innerHTML !== html) notes.innerHTML = html;
  }

  // RP1: the calculations around the standard solution.
  function prepCalcHtml() {
    var p = ui.lab.state.prep, std = ui.run.standard, c = ui.prepCalc, h = '';
    h += '<div class="calc-step"><label for="pcMass">Mass of Na<sub>2</sub>CO<sub>3</sub> needed for 250.0 cm³ of ' + std.target_M.toFixed(3) + ' mol dm⁻³</label>' +
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
    if (!ui.inPrep) return;
    var p = ui.lab.state.prep, std = ui.run.standard, c = ui.prepCalc;
    var mg = $('#pcMassGo');
    if (mg) mg.addEventListener('click', function () {
      c.mass = $('#pcMass').value; var v = num(c.mass), want = std.target_M * 0.25 * std.Mr;
      if (closeTo(v, want, 0.01)) c.massV = { cls: 'good', msg: 'Right: 0.100 × 0.2500 = 0.0250 mol; × 106.0 = 2.65 g. Weigh close to this; the exact mass doesn’t matter as long as you record it.' };
      else if (closeTo(v, want * 1000, 0.01)) c.massV = { cls: 'bad', msg: 'Check the volume: 250.0 cm³ is 0.2500 dm³.' };
      else if (closeTo(v, 0.0250, 0.01)) c.massV = { cls: 'warn', msg: 'That’s the amount in moles. Multiply by M<sub>r</sub> to get the mass.' };
      else c.massV = { cls: 'bad', msg: 'Not quite. Moles = concentration × volume in dm³, then mass = moles × M<sub>r</sub>.' };
      renderMethod();
    });
    var cg = $('#pcConcGo');
    if (cg) cg.addEventListener('click', function () {
      c.conc = $('#pcConc').value; c.concTries = (c.concTries || 0) + 1;
      var v = num(c.conc), m = p.massUsed(), want = m / std.Mr / 0.25;
      if (closeTo(v, want, 0.006)) { c.concOk = true; c.concV = { cls: 'good', msg: 'Right: ' + m.toFixed(2) + ' ÷ 106.0 = ' + sci(m / std.Mr) + ' mol; ÷ 0.2500 dm³ = ' + sf(want, 4) + ' mol dm⁻³.' }; }
      else if (closeTo(v, m / std.Mr, 0.006)) c.concV = { cls: 'warn', msg: 'That’s the amount in moles. Divide by the volume in dm³ (0.2500).' };
      else if (closeTo(v, want / 1000, 0.006) || closeTo(v, want * 1000, 0.006)) c.concV = { cls: 'bad', msg: 'Check the volume: use 0.2500 dm³, not 250.0.' };
      else c.concV = { cls: 'bad', msg: 'Not quite: moles = mass ÷ M<sub>r</sub>, then concentration = moles ÷ 0.2500 dm³.' + (c.concTries >= 3 ? ' It is ' + sf(want, 4) + ' mol dm⁻³.' : '') };
      renderMethod();
    });
    var go = $('#toTitration');
    if (go) go.addEventListener('click', function () {
      ui.inPrep = false; buildScene(); ui.lastKey = '';
      feedback({ kind: 'info', msg: 'Your standard solution is on the bench. Titrate 25.00 cm³ portions of it with the hydrochloric acid.' });
      refresh(true);
    });
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
      var br = $('#balRead'); if (br) br.textContent = p.balance().toFixed(2) + ' g';
      return;
    }
    $('#resultsTitle').textContent = 'Results';
    var rows = s.trials.slice();
    if (s.trial) rows.push(s.trial);
    h += '<table class="res"><thead><tr><th>Titration</th><th>Initial / cm³</th><th>Final / cm³</th><th>Titre / cm³</th></tr></thead><tbody>';
    if (!rows.length) h += '<tr><td colspan="4" class="muted">No titrations yet.</td></tr>';
    rows.forEach(function (t) {
      var cur = t === s.trial;
      h += '<tr class="' + (t.kind === 'rough' ? 'rough' : '') + (cur ? ' current' : '') + '"><td>' + (t.kind === 'rough' ? 'Rough' : 'Titration ' + precNo(t)) + (cur ? ' (now)' : '') + '</td>' +
        '<td>' + (t.initialRec === null ? '—' : f2(t.initialRec)) + '</td><td>' + (t.finalRec === null ? '—' : f2(t.finalRec)) + '</td><td>' + (t.titre === undefined ? '—' : f2(t.titre)) + '</td></tr>';
    });
    h += '</tbody></table>';
    var t = s.trial || null;
    h += '<div class="res-actions">';
    if (!t || t.finalRec === null) {
      var kind = t ? t.kind : (s.trials.length ? 'precise' : 'rough');
      h += '<span class="seg" role="group" aria-label="This titration is"><button type="button" data-kind="rough" aria-pressed="' + (kind === 'rough') + '">Rough</button><button type="button" data-kind="precise" aria-pressed="' + (kind === 'precise') + '">Precise</button></span>';
    }
    h += '<button class="btn primary sm" type="button" id="toAnalyse"' + (s.trials.length ? '' : ' disabled') + '>Analyse results</button>';
    h += '<button class="btn sm" type="button" id="restartBtn">Start again</button></div>';
    $('#resultsBody').innerHTML = h;
    $$('#resultsBody [data-kind]').forEach(function (b) { b.addEventListener('click', function () { act(function () { return ui.lab.setTrialKind(b.getAttribute('data-kind')); }); }); });
    $('#toAnalyse').addEventListener('click', openAnalyse);
    $('#restartBtn').addEventListener('click', function () {
      // Once the answer has been revealed, starting again gets a new unknown.
      var fresh = !!ui.submitted;
      if (!confirm(fresh ? 'Start this experiment again with a new unknown? Your results so far will be cleared.' : 'Start this experiment again with the same unknown? Your results so far will be cleared.')) return;
      if (fresh) ui.run = X.instantiate(ui.run.id, newSeed(), ui.run.sample);
      startLab();
    });
  }
  function precNo(t) {
    var list = ui.lab.state.trials.concat(ui.lab.state.trial ? [ui.lab.state.trial] : []).filter(function (x) { return x.kind === 'precise'; });
    return list.indexOf(t) + 1;
  }

  function refresh(force) {
    if (!ui.lab || ui.view !== 'lab') return;
    renderMethod(); renderActions(); renderResults();
    var s = ui.lab.state;
    // Keep the hold button and the steppers honest about what's possible.
    if (ui.sceneKind === 'titration') {
      var busy = s.burette.pending > 0;
      $$('#dock [data-add]').forEach(function (b) { b.disabled = busy; });
      $('#keepSwirl').setAttribute('aria-pressed', String(s.keepSwirling));
      $('#recInit').disabled = !!(s.trial && s.trial.initialRec !== null);
      $('#recFinal').disabled = !(s.trial && s.trial.initialRec !== null);
    }
    if (force) sizeForBoard();
  }

  /* ---------- Clicking the bench ---------- */
  function onBenchClick(e) {
    var part = e.target.closest && e.target.closest('[data-part]');
    if (!part) return;
    var p = part.getAttribute('data-part');
    var map = { burette: 'burette', funnel: 'burette', titrant: 'burette', waste: 'burette', flask: 'flask', pipette: 'flask', analyte: 'flask', indicator: 'flask', acid: 'flask', wash: 'flask',
      balance: 'weigh', beaker: 'dissolve', vflask: 'makeup' };
    if (map[p]) { ui.tab = map[p]; renderActions(); var first = $('#actionPanel button'); if (first) first.focus({ preventScroll: true }); }
  }

  /* ---------- Analysis ---------- */
  function openAnalyse() {
    var lab = ui.lab, R = lab.results();
    if (!ui.ticks) { ui.ticks = {}; }
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
      '<button class="btn primary" type="button" id="submitAns"' + (ui.submitted ? ' disabled' : '') + '>' + (ui.submitted ? 'Answer submitted' : 'Submit answer') + '</button></div>';
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
    ui.submitted = { value: v, unitOk: unitOk, truth: truth, diag: d, pct: E.pctError(v, truth), abs: E.absError(v, truth), pctFromData: E.pctError(d.correct, truth), mean: m.V, gOk: gOk, gTrue: gTrue,
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
    if (!s.diag.ok) h += '<p class="verdict bad"><b>Calculation:</b> ' + s.diag.msg + ' From your mean titre the answer is ' + sf(s.diag.correct, 3) + ' ' + units + '.</p>';
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
  function sizeForBoard() {
    var presenting = document.body.classList.contains('presenting');
    // On a phone, the titration bench is cropped to the stand, burette and flask.
    var bsvg = $('#benchSvg'), crop = ui.sceneKind === 'titration' && !presenting && window.innerWidth < 560;
    if (bsvg && ui.sceneKind) {
      var vb = crop ? '100 0 640 600' : '0 0 960 600';
      if (bsvg.getAttribute('viewBox') !== vb) bsvg.setAttribute('viewBox', vb);
      $('#bench').classList.toggle('crop', crop);
    }
    [['#benchSvg', 1], ['#lensSvg', 1]].forEach(function (pair) {
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
    var level = ui.run && !ui.run.gcse ? 'alevel' : 'gcse';
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
    if (ui.view !== 'lab' || ui.sceneKind !== 'titration') return;
    var t = e.target;
    if (e.ctrlKey || e.metaKey || e.altKey || (t && t.closest && t.closest('input, textarea, select, [contenteditable="true"], dialog'))) return;
    var k = e.key.toLowerCase();
    var map = { '1': '1.0', '2': '0.5', '3': '0.1', '4': 'drop' };
    if (map[k]) { e.preventDefault(); act(function () { return addStep(map[k]); }); }
    else if (k === 's') { e.preventDefault(); act(function () { return ui.lab.swirl(); }); }
    else if (k === 'r') { e.preventDefault(); $('#readingIn').focus(); }
  }

  /* ---------- Start ---------- */
  function init() {
    buildPicker();
    worksheetCurve();
    $('#briefForm').addEventListener('submit', function (e) { e.preventDefault(); startLab(); });
    $('#btnChange').addEventListener('click', function () { if (ui.view === 'lab' && ui.lab && ui.lab.state.trials.length && !confirm('Leave this experiment? Your results will be lost.')) return; buildPicker(); show('picker'); try { history.replaceState(null, '', location.pathname); } catch (e) { /* file:// */ } });
    $('#backToBench').addEventListener('click', function () { show('lab'); refresh(true); });
    $('#btnPresent').addEventListener('click', function () { if (window.SST_PRESENTER) SST_PRESENTER.toggle(); });
    $('#btnAnnotate').addEventListener('click', function () { var n = document.querySelector('.sst-bar .sst-ink-nav:not(.sst-pres-nav)'); if (n) n.click(); });
    $('#btnPrint').addEventListener('click', function () { openPrint(null); });
    $('#printDlg').addEventListener('close', function () { if ($('#printDlg').returnValue === 'print') doPrint(); });
    $('#benchSvg').addEventListener('click', onBenchClick);
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
        stage: function () { return ui.view === 'lab' ? ['#bench', '#results'] : ui.view === 'analyse' ? '#analyse' : ui.view === 'brief' ? '#brief' : '#picker'; },
        side: function () { return ui.view === 'lab' ? ['#dock', '#actions'] : null; },
        notes: function () { return ui.view === 'lab' ? '#boardNotes' : null; },
        hide: '#srLive, #feedback',
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
