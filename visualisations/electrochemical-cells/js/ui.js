/* Electrochemical Cell Builder — the page.

   Wires the engine (engine.js), the words (content.js), the challenges
   (challenges.js) and the bench (cell.js) to the controls: the level and
   activity menus, building and connecting a cell, predictions with feedback,
   results tables, Required practical 8, presenter mode and printing.
   Every reading, label and explanation comes from an engine result for the
   current configuration; the animation only shows that result. */
(function () {
  'use strict';
  var E = window.CellEngine, K = window.CellContent, S = window.CellScene, CH = window.CellChallenges;

  function $(sel, root) { return (root || document).querySelector(sel); }
  function $$(sel, root) { return Array.prototype.slice.call((root || document).querySelectorAll(sel)); }
  function esc(s) { return String(s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  function v(x) { return E.signed(x) + ' V'; }
  function v2(x) { return (x < 0 ? '−' : '') + Math.abs(E.round(x, 2)).toFixed(2) + ' V'; }
  function num(t) { var x = parseFloat(String(t).replace(/\s/g, '').replace('−', '-').replace(/v$/i, '')); return isFinite(x) ? x : null; }
  function newSeed() { return (Math.floor(Math.random() * 0x7fffffff) ^ (Date.now() & 0xffff)) >>> 0 || 1; }
  function shuffle(arr, rnd) { var a = arr.slice(); for (var i = a.length - 1; i > 0; i--) { var j = Math.floor(rnd() * (i + 1)), t = a[i]; a[i] = a[j]; a[j] = t; } return a; }
  var reduce = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ---------- Options ---------- */
  var METAL_OPTS = E.METALS.map(function (m) { return [m.id, K.cap(m.name)]; });
  var ELYTE_OPTS = E.ELECTROLYTES.map(function (e) { return [e.id, K.cap(e.name)]; });
  var HALF_OPTS = E.HALF_CELLS.slice().sort(function (a, b) { return a.E - b.E; }).map(function (h) { return [h.id, E.coupleLabel(h, 'uni') + '  (' + h.name + ')']; });
  var RP8_METALS = ['mg', 'zn', 'fe', 'ni', 'pb', 'cu', 'ag'];
  var RP8_EL_OPTS = [['', 'Choose…']].concat(RP8_METALS.map(function (id) { return [id, K.cap(E.halfCell(id).name) + ' (' + E.halfCell(id).symbol + ')']; }));
  var RP8_SOL_OPTS = [['', 'Choose…']].concat(RP8_METALS.map(function (id) { var h = E.halfCell(id); return [id, K.cap(h.solution.name)]; }));
  var CONC_OPTS = [[0.01, '0.010 mol dm⁻³'], [0.1, '0.10 mol dm⁻³'], [1, '1.00 mol dm⁻³ (standard)'], [2, '2.00 mol dm⁻³']];
  var BRIDGE_OPTS = [['kno3', 'Salt bridge: saturated KNO₃'], ['kcl', 'Salt bridge: saturated KCl'], ['wire', 'A copper wire'], ['none', 'Nothing']];
  var ELY_GROUPS = [['Molten (heated)', 'l'], ['Aqueous solutions', 'aq'], ['Solid', 's']];

  /* ---------- State ---------- */
  function defaults(id) {
    switch (id) {
      case 'simple': case 'variables': return { m1: 'zn', m2: 'cu', el: 'nacl', connected: false, pred: {}, trial: 0 };
      case 'battery': return { pair: 'zn-cu', el: 'lemon', cells: [{ flipped: false }], check: null };
      case 'electrolysis': return { id: 'cuso4-aq', supply: false, pred: {}, ht: false };
      case 'fuel': return { h2: true, o2: true, electrolyte: 'acidic', ht: false };
      case 'daniell': return { left: 'zn', right: 'cu', bridge: 'kno3', connected: false, pred: {} };
      case 'series': return { left: 'zn', right: 'ag', bridge: 'kno3', connected: false, pred: {} };
      case 'emf': return { left: 'mg', right: 'ag', bridge: 'kno3', connected: false, guess: '', verdict: null, asWritten: false };
      case 'rp8': return { lEl: '', lSol: '', rEl: '', rSol: '', cleaned: false, bridge: 'none', vLead: '', trial: 0, ans: {}, readIn: '', readV: null, predIn: '', predV: null, reasons: {}, reasonsChecked: false };
      case 'conditions': return { left: 'zn', right: 'cu', bridge: 'kno3', concL: 1, concR: 1, pred: null, predFor: '' };
      default: return { i: 0, cur: null, answer: null, showHint: false, score: 0, tried: 0, status: {}, build: { m1: 'zn', m2: 'cu', el: 'nacl' } };
    }
  }
  var ui = {
    level: 'gcse', act: 'simple', playing: !reduce, t: 0, last: 0, raf: 0, seed: newSeed(), st: {}, scene: null, sceneKey: '',
    results: { variables: [], rp8: [], conditions: [] }, pattern: null
  };
  function st() { if (!ui.st[ui.act]) ui.st[ui.act] = defaults(ui.act); return ui.st[ui.act]; }
  function act() { return K.activity(ui.act); }
  /* The bench follows the convention: the half-cell with the more negative E°
     (the negative electrode) goes on the left. Not in the required practical,
     where pupils set the cell up and find the positive terminal themselves, nor
     for the EMF of a cell "as written", which is about the order chosen. */
  function conventional(s) {
    if (!/^(series|emf|conditions|daniell)$/.test(ui.act) || (ui.act === 'emf' && s.asWritten)) return false;
    var L = E.halfCell(s.left), R = E.halfCell(s.right);
    if (!L || !R || L.E <= R.E) return false;
    var t = s.left; s.left = s.right; s.right = t;
    t = s.concL; s.concL = s.concR; s.concR = t;
    return true;
  }

  /* ---------- Engine results for the current activity ---------- */
  function galvanicHalf(id) { return E.halfCell(id); }
  function rp8Half(elId, solId) {
    if (!elId || !solId) return null;
    var sol = E.halfCell(solId), m = E.halfCell(elId);
    if (elId === solId) return sol;
    var hc = Object.assign({}, sol, { electrode: m.symbol, symbol: m.symbol, practical: null });
    hc.mismatch = m.symbol + ' in ' + E.uni(sol.ion) + '(aq): not a half-cell';
    return hc;
  }
  function rp8Mismatch(elId, solId) {
    if (!elId || !solId || elId === solId) return null;
    var m = E.halfCell(elId), sol = E.halfCell(solId);
    if (m.E < sol.E) return K.cap(m.name) + ' is more reactive than ' + sol.name + ', so it would displace ' + sol.name + ' from the solution and become coated in it. A half-cell is a metal in a solution of its own ions.';
    return K.cap(m.name) + ' in ' + sol.solution.name + ' is not a half-cell: a half-cell is a metal in a solution of its own ions.';
  }
  function galvanicState() {
    var s = st(), id = ui.act;
    var o = { left: null, right: null, cell: null, bridgeOk: null, reading: null, message: '' };
    if (id === 'rp8') {
      o.left = rp8Half(s.lEl, s.lSol); o.right = rp8Half(s.rEl, s.rSol);
      var mm = rp8Mismatch(s.lEl, s.lSol) || rp8Mismatch(s.rEl, s.rSol);
      if (mm) { o.message = mm; o.invalid = true; return o; }
      if (!o.left || !o.right) { o.message = ''; o.incomplete = true; return o; }
    } else { o.left = galvanicHalf(s.left); o.right = galvanicHalf(s.right); }
    o.cell = E.buildCell(o.left && o.left.id, o.right && o.right.id);
    if (!o.cell.valid) { o.message = o.cell.why; return o; }
    o.bridgeOk = E.bridgeCheck(s.bridge, o.cell.anode, o.cell.cathode);
    if (!o.bridgeOk.ok) { o.message = o.bridgeOk.why; return o; }
    var mr = { left: o.left.id, right: o.right.id };
    if (id === 'conditions') { mr.concLeft = s.concL; mr.concRight = s.concR; mr.practical = false; }
    else if (id === 'rp8') { mr.seed = ui.seed; mr.trial = s.trial; mr.vLead = s.vLead || undefined; mr.uncleaned = !s.cleaned; }
    else { mr.seed = ui.seed; mr.trial = 0; mr.practical = false; }
    o.reading = E.meterReading(mr);
    return o;
  }

  /* ---------- Scene models ---------- */
  function sceneModel() {
    var a = act(), s = st();
    if (a.scene === 'challenge') return challengeModel();
    if (a.scene === 'simple') {
      var r = E.simpleCell(s.m1, s.m2, s.el, { seed: ui.seed, trial: s.trial });
      return { type: 'simple', m1: s.m1, m2: s.m2, electrolyte: s.el, result: r, connected: s.connected,
        meterText: !s.connected ? '—' : r.valid ? r.reading.toFixed(2) + ' V' : r.reading === 0 ? '0.00 V' : '—',
        show: { roles: true, flow: true }, message: s.connected && !r.valid ? r.why : '', label: 'Simple cell: ' + s.m1 + ' and ' + s.m2 };
    }
    if (a.scene === 'battery') {
      var b = batteryState();
      return { type: 'battery', cells: s.cells, neg: b.neg, pos: b.pos, electrolyte: s.el, single: b.single, total: b.total, meterText: v2(b.total), flow: true, label: 'Cells in series' };
    }
    if (a.scene === 'electrolysis') {
      var er = E.electrolysis(s.id, { supply: s.supply });
      return { type: 'electrolysis', compound: E.ionic(s.id), result: er, supply: s.supply, show: { roles: true }, message: s.supply && !er.valid ? er.why : '', label: 'Electrolysis' };
    }
    if (a.scene === 'fuel') return { type: 'fuel', result: E.fuelCell(s), h2: s.h2, o2: s.o2, flow: true, label: 'Hydrogen fuel cell' };
    // Galvanic activities.
    var g = galvanicState(), connected = ui.act === 'rp8' || ui.act === 'conditions' ? true : s.connected;
    var meterText = '—', meterOn = connected && g.reading;
    if (ui.act === 'rp8') meterOn = g.reading && s.vLead;
    if (ui.act === 'conditions' && g.reading && needsPrediction()) meterText = '?';
    else if (meterOn) meterText = v2(g.reading.value);
    else if (connected && g.cell && !g.cell.valid && g.cell.zero) meterText = '0.00 V';
    else if (connected && g.bridgeOk && !g.bridgeOk.ok && (ui.act !== 'rp8' || s.vLead)) meterText = '0.00 V';
    var showRoles = ui.act === 'rp8' ? !!s.ans.checked : connected;
    return { type: 'galvanic', left: g.left, right: g.right, concLeft: s.concL, concRight: s.concR, bridge: s.bridge, cell: g.cell,
      connected: connected && !!g.cell, wires: ui.act !== 'rp8' || !!s.vLead, circuitOk: !!(g.bridgeOk && g.bridgeOk.ok) && (ui.act !== 'rp8' || !!s.vLead), meter: true, meterText: meterText, vLead: ui.act === 'rp8' ? (s.vLead || 'left') : (g.cell && g.cell.valid && g.cell.cathode.id === (g.left && g.left.id) ? 'left' : 'right'),
      show: { roles: showRoles, flow: ui.act === 'rp8' ? !!s.ans.checked : true, values: ui.act === 'rp8' ? !!s.ans.checked : (ui.act !== 'daniell' || connected) },
      message: (connected || ui.act === 'rp8') ? g.message : '', label: 'Electrochemical cell' };
  }
  function batteryState() {
    var s = st(), p = s.pair.split('-'), r = E.simpleCell(p[0], p[1], s.el);
    var cells = s.cells.map(function (c) { return { voltage: r.typical, flipped: c.flipped }; });
    return { neg: p[0], pos: p[1], single: r.typical, total: E.battery(cells), result: r };
  }

  /* ---------- Controls (left panel) ---------- */
  function select(key, label, opts, value, attrs) {
    return '<label class="field"><span>' + label + '</span><select data-k="' + key + '" id="c-' + key + '"' + (attrs || '') + '>' +
      opts.map(function (o) { return '<option value="' + o[0] + '"' + (String(o[0]) === String(value) ? ' selected' : '') + '>' + esc(o[1]) + '</option>'; }).join('') + '</select></label>';
  }
  function toggle(key, label, on, extra) {
    return '<label class="check"><input type="checkbox" data-k="' + key + '" id="c-' + key + '"' + (on ? ' checked' : '') + '> <span>' + label + '</span></label>' + (extra || '');
  }
  function seg(key, opts, value, label) {
    return '<div class="seg" role="group" aria-label="' + (label || key) + '">' + opts.map(function (o) { return '<button type="button" data-seg="' + key + '" data-v="' + o[0] + '" aria-pressed="' + (String(o[0]) === String(value)) + '">' + o[1] + '</button>'; }).join('') + '</div>';
  }
  function buildControls() {
    var a = act(), s = st(), h = '';
    if (a.scene === 'simple') {
      h += '<h3>Build your cell</h3>' + select('m1', 'Electrode 1', METAL_OPTS, s.m1) + select('m2', 'Electrode 2', METAL_OPTS, s.m2) + select('el', 'Electrolyte', ELYTE_OPTS, s.el);
      h += '<button class="btn primary wide" type="button" data-act="connect" id="c-connect">' + (s.connected ? 'Disconnect and predict again' : 'Connect the voltmeter') + '</button>';
      h += '<p class="hint-line">Change one thing at a time and watch the reading.</p>';
    } else if (a.scene === 'battery') {
      h += '<h3>Each cell</h3>' + select('pair', 'Metals', [['zn-cu', 'Zinc and copper'], ['mg-cu', 'Magnesium and copper'], ['fe-cu', 'Iron and copper']], s.pair) + select('el', 'Electrolyte', ELYTE_OPTS.filter(function (o) { return o[0] !== 'water'; }), s.el);
      h += '<h3>The battery</h3><div class="stepper"><button class="btn" type="button" data-act="cell-" aria-label="Remove a cell"' + (s.cells.length < 2 ? ' disabled' : '') + '>−</button><span><b>' + s.cells.length + '</b> cell' + (s.cells.length > 1 ? 's' : '') + ' in series</span><button class="btn" type="button" data-act="cell+" aria-label="Add a cell"' + (s.cells.length > 3 ? ' disabled' : '') + '>+</button></div>';
      h += '<div class="flips">' + s.cells.map(function (c, i) { return '<button class="btn sm" type="button" data-act="flip" data-i="' + i + '" aria-pressed="' + c.flipped + '">Turn cell ' + (i + 1) + ' round</button>'; }).join('') + '</div>';
    } else if (a.scene === 'electrolysis') {
      h += '<h3>Electrolyte</h3><label class="field"><span>Ionic compound (inert graphite electrodes)</span><select data-k="id" id="c-id">' + ELY_GROUPS.map(function (gp) {
        return '<optgroup label="' + gp[0] + '">' + E.IONIC.filter(function (c) { return c.state === gp[1]; }).map(function (c) {
          return '<option value="' + c.id + '"' + (c.id === s.id ? ' selected' : '') + '>' + K.cap(c.name) + (gp[1] === 'aq' ? ' solution' : '') + '</option>'; }).join('') + '</optgroup>'; }).join('') + '</select></label>';
      h += '<button class="btn primary wide" type="button" data-act="supply" id="c-supply">' + (s.supply ? 'Switch the power supply off' : 'Switch the power supply on') + '</button>';
      h += toggle('ht', 'Show half-equations (Higher Tier)', s.ht);
    } else if (a.scene === 'fuel') {
      h += '<h3>Supplies</h3>' + toggle('h2', 'Hydrogen supply on', s.h2) + toggle('o2', 'Oxygen (air) supply on', s.o2);
      h += '<h3>Electrolyte</h3>' + seg('electrolyte', [['acidic', 'Acidic'], ['alkaline', 'Alkaline']], s.electrolyte, 'Electrolyte');
      h += toggle('ht', 'Show half-equations (Higher Tier)', s.ht);
    } else if (ui.act === 'daniell') {
      h += '<h3>The cell</h3><p class="hint-line">Zinc in 1.00 mol dm⁻³ zinc sulfate; copper in 1.00 mol dm⁻³ copper(II) sulfate.</p>';
      h += select('bridge', 'Connection between the solutions', BRIDGE_OPTS, s.bridge);
      h += '<button class="btn primary wide" type="button" data-act="connect" id="c-connect">' + (s.connected ? 'Disconnect and predict again' : 'Connect the voltmeter') + '</button>';
    } else if (ui.act === 'series' || ui.act === 'emf') {
      h += '<h3>Choose two half-cells</h3>' + select('left', 'Left half-cell', HALF_OPTS, s.left) + select('right', 'Right half-cell', HALF_OPTS, s.right);
      if (ui.act === 'emf') h += toggle('asWritten', 'Treat the cell as written: the left half-cell is oxidised', s.asWritten);
      if (ui.act === 'emf' && s.asWritten) h += '<button class="btn sm" type="button" data-act="swap">Swap left and right</button>';
      else h += '<p class="hint-line">The more negative half-cell (the negative electrode) always goes on the left.</p>';
      h += '<button class="btn primary wide" type="button" data-act="connect" id="c-connect">' + (s.connected ? 'Disconnect and predict again' : 'Connect the voltmeter') + '</button>';
    } else if (ui.act === 'rp8') {
      h += '<h3>Left half-cell</h3>' + select('lEl', 'Electrode', RP8_EL_OPTS, s.lEl) + select('lSol', 'Solution (1.00 mol dm⁻³)', RP8_SOL_OPTS, s.lSol);
      h += '<h3>Right half-cell</h3>' + select('rEl', 'Electrode', RP8_EL_OPTS, s.rEl) + select('rSol', 'Solution (1.00 mol dm⁻³)', RP8_SOL_OPTS, s.rSol);
      h += '<button class="btn wide" type="button" data-act="clean" aria-pressed="' + s.cleaned + '" id="c-clean">' + (s.cleaned ? 'Electrodes cleaned ✓' : 'Clean the electrodes with emery paper') + '</button>';
      h += select('bridge', 'Salt bridge (filter paper soaked in…)', BRIDGE_OPTS, s.bridge);
      h += '<h3>Voltmeter</h3><p class="hint-line">Red (V) lead on:</p>' + seg('vLead', [['left', 'Left electrode'], ['right', 'Right electrode']], s.vLead, 'Red (V) lead on');
    } else if (ui.act === 'conditions') {
      h += '<h3>Half-cells</h3>' + select('left', 'Left half-cell', HALF_OPTS, s.left) + select('concL', 'Left concentration of ' + E.uni(E.halfCell(s.left).ion), CONC_OPTS, s.concL);
      h += select('right', 'Right half-cell', HALF_OPTS, s.right) + select('concR', 'Right concentration of ' + E.uni(E.halfCell(s.right).ion), CONC_OPTS, s.concR);
      h += '<p class="hint-line">The more negative half-cell (the negative electrode) always goes on the left.</p>';
      h += '<p class="hint-line">Temperature: 298 K. Temperature also changes a cell\'s voltage, but this simulator does not model it, so it stays at 298 K.</p>';
    } else if (a.scene === 'challenge') {
      h += challengeControls();
    }
    $('#controls').innerHTML = h;
  }

  /* ---------- Activity menu ---------- */
  function buildMenu() {
    $$('.levels button').forEach(function (b) { b.setAttribute('aria-selected', String(b.dataset.level === ui.level)); b.tabIndex = b.dataset.level === ui.level ? 0 : -1; });
    $('#acts').innerHTML = K.ACTIVITIES.filter(function (a) { return a.level === ui.level; }).map(function (a) {
      return '<button type="button" class="act' + (a.id === ui.act ? ' on' : '') + '" data-goto="' + a.id + '" aria-current="' + (a.id === ui.act) + '"><span class="letter">' + a.letter + '</span><span>' + a.title + '</span></button>';
    }).join('');
  }
  function go(level, id) {
    if (level && level !== ui.level) { ui.level = level; if (!id) id = level === 'gcse' ? 'simple' : 'daniell'; }
    if (id) ui.act = id;
    document.body.dataset.level = ui.level;
    buildMenu(); buildControls(); refresh(true);
    try { history.replaceState(null, '', '#act=' + ui.act); } catch (e) { /* file:// */ }
    if (window.SST_PRESENTER) setTimeout(function () { SST_PRESENTER.layout(); }, 30);
  }

  /* ---------- Right panel ---------- */
  function readoutHtml() {
    var a = act(), s = st(), h = '';
    function big(label, value, chip, sub) { return '<p class="ro-label">' + label + '</p><p class="ro-value">' + value + '</p>' + (chip ? '<p class="ro-chip">' + chip + '</p>' : '') + (sub ? '<p class="ro-sub">' + sub + '</p>' : ''); }
    if (a.scene === 'simple') {
      var r = E.simpleCell(s.m1, s.m2, s.el, { seed: ui.seed, trial: s.trial });
      if (!s.connected) return big('Voltmeter reading', '—', '', 'Make your predictions, then connect the voltmeter.');
      if (!r.valid) return big('Voltmeter reading', r.reading === 0 ? '0.00 V' : '—', '', r.why);
      return big('Voltmeter reading', r.reading.toFixed(2) + ' V', 'Illustrative reading', 'Typical for these metals in ' + r.electrolyte.name + ': about ' + r.typical.toFixed(2) + ' V. Real results vary.');
    }
    if (a.scene === 'battery') { var b = batteryState(); return big('Total voltage', v2(b.total), 'Illustrative', s.cells.length + ' × ' + b.single.toFixed(2) + ' V cells' + (s.cells.some(function (c) { return c.flipped; }) ? ', one or more turned round' : '')); }
    if (a.scene === 'electrolysis') {
      var er = E.electrolysis(s.id, { supply: s.supply });
      if (!er.valid) return big('Products', '—', '', er.why);
      return '<p class="ro-label">Products</p><dl class="prods"><dt>Cathode (−)</dt><dd>' + er.cathode.info.name + '</dd><dt>Anode (+)</dt><dd>' + er.anode.info.name + '</dd></dl>';
    }
    if (a.scene === 'fuel') { var f = E.fuelCell(s); return big('Lamp', f.running ? 'On' : 'Off', f.running ? 'About 0.7 V per cell in use (typical)' : '', f.running ? 'A fuel cell keeps working while hydrogen and oxygen are supplied.' : f.why); }
    if (a.scene === 'challenge') { var c = cs(); return big('Challenge', (c.i + 1) + ' of ' + list().length, '', 'Score: ' + c.score + ' / ' + c.tried + ' answered'); }
    var g = galvanicState();
    if (ui.act === 'rp8') {
      if (!g.reading) return big('Voltmeter reading', '—', '', g.message || 'Set up both half-cells and a salt bridge.');
      if (!s.vLead) return big('Voltmeter reading', '—', '', 'Connect the voltmeter: choose which electrode has the red (V) lead.');
      return big('Voltmeter reading', v2(g.reading.value), 'Simulated high-resistance voltmeter', 'Red (V) lead on the ' + (s.vLead === 'left' ? g.left.name : g.right.name) + ' electrode.');
    }
    if (!g.cell || !g.cell.valid) return big('E°cell', '—', '', g.message || (g.cell && g.cell.why) || '');
    if (ui.act === 'conditions') {
      var pred = needsPrediction();
      return big('Simulated reading', pred ? '?' : v2(g.reading ? g.reading.value : 0), pred ? 'Predict first' : 'Simulated: not a standard value', 'E°cell (standard conditions) = ' + v(g.cell.emf));
    }
    var hidden = (ui.act === 'emf' && !s.connected && !s.verdict);
    if (g.bridgeOk && !g.bridgeOk.ok) return big('Voltmeter reading', s.connected ? '0.00 V' : '—', '', g.message);
    return big('Standard cell EMF, E°cell', hidden ? '?' : v(g.cell.emf), hidden ? 'Calculate it first' : 'Calculated from E° values',
      hidden ? '' : 'Simulated voltmeter: ' + (s.connected && g.reading ? v2(g.reading.value) : 'not connected'));
  }

  // Predictions and the feedback that explains them.
  function q(id, text, opts, chosen, locked) {
    return '<fieldset class="pq"><legend>' + text + '</legend><div class="pq-opts">' + opts.map(function (o) {
      return '<button type="button" class="opt-btn' + (chosen === o[0] ? ' chosen' : '') + '" data-pred="' + id + '" data-v="' + o[0] + '" aria-pressed="' + (chosen === o[0]) + '"' + (locked ? ' disabled' : '') + '>' + o[1] + '</button>';
    }).join('') + '</div></fieldset>';
  }
  function fb(good, html) { return '<p class="fb ' + (good ? 'good' : 'bad') + '"><b>' + (good ? 'Yes. ' : 'Not quite. ') + '</b>' + html + '</p>'; }
  function predictHtml() {
    var a = act(), s = st(), h = '';
    if (a.scene === 'simple') {
      var m1 = E.METAL[s.m1], m2 = E.METAL[s.m2], r = E.simpleCell(s.m1, s.m2, s.el);
      h += '<h3>Predict first</h3>';
      if (s.m1 === s.m2) return h + '<p>Both electrodes are ' + m1.name + '. What do you think the voltmeter will read? Connect it and see.</p>';
      h += q('neg', 'Which metal will be the negative electrode?', [['m1', K.cap(m1.name)], ['m2', K.cap(m2.name)]], s.pred.neg, s.connected);
      h += q('e', 'Which way will electrons flow through the wire?', [['12', 'From ' + m1.name + ' to ' + m2.name], ['21', 'From ' + m2.name + ' to ' + m1.name]], s.pred.e, s.connected);
      if (s.connected && r.valid) {
        var negIs = r.negative.id === s.m1 ? 'm1' : 'm2';
        if (s.pred.neg) h += fb(s.pred.neg === negIs, K.cap(r.negative.name) + ' is more reactive than ' + r.positive.name + ', so ' + r.negative.name + ' atoms lose electrons: ' + r.negative.name + ' is the negative electrode.');
        if (s.pred.e) h += fb(s.pred.e === (negIs === 'm1' ? '12' : '21'), 'The electrons flow through the wire from the more reactive metal, ' + r.negative.name + ', to the ' + r.positive.name + '.');
        if (!s.pred.neg && !s.pred.e) h += '<p class="muted small">Next time, predict before you connect.</p>';
      }
      return h;
    }
    if (a.scene === 'battery') {
      h += '<h3>Check yourself</h3>' + q('bq', 'Why does an alkaline battery stop working in the end?', [['used', 'One of the reactants has been used up'], ['electrons', 'It has run out of electrons'], ['charge', 'Its charge has leaked away through the case']], s.check, !!s.check);
      if (s.check) h += fb(s.check === 'used', s.check === 'used' ? 'The chemical reactions stop when one of the reactants has been used up. Alkaline batteries are non-rechargeable.' : 'A cell does not store electrons or charge. The chemical reactions stop when one of the reactants has been used up.');
      return h;
    }
    if (a.scene === 'electrolysis') {
      var er = E.electrolysis(s.id, { supply: true });
      if (!er.valid) return '<h3>Predict first</h3><p>' + er.why + '</p>';
      h += '<h3>Predict first</h3>';
      h += q('cath', 'What forms at the cathode (−)?', K.PRODUCT_CHOICES.cathode, s.pred.cath, s.supply);
      h += q('an', 'What forms at the anode (+)?', K.PRODUCT_CHOICES.anode, s.pred.an, s.supply);
      if (s.supply) {
        var kc = K.productKind(er.cathode.product), ka = K.productKind(er.anode.product);
        if (s.pred.cath) h += fb(s.pred.cath === kc, 'At the cathode: ' + er.cathode.info.name + '.');
        if (s.pred.an) h += fb(s.pred.an === ka, 'At the anode: ' + er.anode.info.name + '.');
      }
      return h;
    }
    if (a.scene === 'fuel') return '';
    if (a.scene === 'challenge') return challengeHtml();
    var g = galvanicState();
    if (ui.act === 'rp8') return rp8Html(g);
    if (ui.act === 'conditions') {
      if (!g.reading) return '';
      h += '<h3>Predict</h3>';
      if (s.concL === 1 && s.concR === 1) return h + '<p>Both solutions are at the standard concentration. Change one concentration, then predict how the reading compares with E°cell.</p>';
      var key = s.concL + '|' + s.concR + '|' + s.left + '|' + s.right;
      h += q('cond', 'Compared with E°cell (' + v(g.cell.emf) + '), the reading will be…', [['up', 'higher'], ['down', 'lower'], ['same', 'the same']], s.predFor === key ? s.pred : null, s.predFor === key);
      if (s.predFor === key) {
        var d = E.round(g.reading.value - g.cell.emf, 2), right = d > 0 ? 'up' : d < 0 ? 'down' : 'same';
        h += fb(s.pred === right, 'The simulated reading is ' + v2(g.reading.value) + ', which is ' + (right === 'same' ? 'the same as' : right === 'up' ? 'higher than' : 'lower than') + ' E°cell. See the explanation for why.');
      }
      return h;
    }
    if (!g.cell || !g.cell.valid) return '';
    var L = g.left, R = g.right;
    if (ui.act === 'emf') {
      h += '<h3>Your calculation</h3><div class="calc-row"><label for="emfIn">E°cell =</label><input id="emfIn" type="text" inputmode="text" value="' + esc(s.guess) + '" autocomplete="off" placeholder="e.g. +1.10"><span>V</span><button class="btn sm" type="button" data-act="check-emf">Check</button></div>';
      if (s.verdict) h += s.verdict;
      return h;
    }
    h += '<h3>Predict first</h3>';
    // By name, in alphabetical order: the sides would give the answer away.
    var byName = [L, R].slice().sort(function (a, b) { return a.name < b.name ? -1 : 1; }).map(function (h) { return [h.id, K.cap(h.name)]; });
    h += q('ox', 'Which half-cell will be oxidised?', byName, s.pred.ox, s.connected);
    h += q('pos', 'Which electrode will be positive?', byName, s.pred.pos, s.connected);
    h += q('e', 'How do electrons travel?', [['lr', 'Through the wire, left to right'], ['rl', 'Through the wire, right to left'], ['bridge', 'Through the salt bridge']], s.pred.e, s.connected);
    if (s.connected && g.bridgeOk && g.bridgeOk.ok) {
      var c = g.cell, anSide = c.anode.id === L.id ? 'left' : 'right';
      if (s.pred.ox) h += fb(s.pred.ox === c.anode.id, s.pred.ox === c.anode.id ? 'The ' + c.anode.name + ' half-cell has the less positive E° (' + v(c.anode.E) + '), so it loses electrons: oxidation.' : 'The ' + c.cathode.name + ' half-cell has the more positive E°, so it is reduced. The half-cell with the less positive E° is oxidised.');
      if (s.pred.pos) h += fb(s.pred.pos === c.cathode.id, s.pred.pos === c.cathode.id ? 'You chose the more positive reduction potential as the positive electrode. Reduction happens at this electrode.' : 'The positive electrode is the one where reduction happens: the half-cell with the more positive E°, ' + c.cathode.name + '.');
      if (s.pred.e) h += s.pred.e === 'bridge' ? fb(false, 'The salt bridge completes the ionic pathway and keeps the charges balanced; it does not carry electrons. Electrons travel through the external wire.') :
        fb(s.pred.e === (anSide === 'left' ? 'lr' : 'rl'), 'The electrons travel from the negative electrode (' + c.anode.name + ') to the positive electrode (' + c.cathode.name + ') through the external circuit.');
    }
    return h;
  }

  function explainHtml() {
    var a = act(), s = st();
    if (a.scene === 'simple') { if (!st().connected) return ''; var r = E.simpleCell(s.m1, s.m2, s.el); return K.simpleCell(r); }
    if (a.scene === 'battery') { var b = batteryState(); return K.battery(s.cells, b.single, b.total) + K.RECHARGE; }
    if (a.scene === 'electrolysis') { if (!s.supply) return '<p>Make your predictions, then switch on the power supply.</p>'; return K.electrolysis(E.electrolysis(s.id, { supply: true }), { ht: s.ht }); }
    if (a.scene === 'fuel') return K.fuelCell(E.fuelCell(s), { ht: s.ht }) + K.FUEL_EVALUATE;
    if (a.scene === 'challenge') return '';
    var g = galvanicState();
    if (ui.act === 'series') {
      var tbl = K.seriesTable(g.cell && g.cell.valid ? [g.left.id, g.right.id] : []);
      return (s.connected && g.cell && g.cell.valid ? K.galvanic(g.cell, { bridge: s.bridge }) : '') + '<h4>The electrochemical series</h4>' + tbl +
        '<p class="muted small">The standard hydrogen electrode (Pt | H₂(g), 100 kPa | H⁺(aq), 1.00 mol dm⁻³, 298 K) is the reference: its E° is 0.00 V by definition. Every other E° is the EMF of a cell with the SHE on the left.</p>';
    }
    if (!g.cell || !g.cell.valid) return g.message ? '<p>' + g.message + '</p>' : '';
    if (ui.act === 'rp8') return s.ans.checked ? K.galvanic(g.cell, { bridge: s.bridge }) : '<p>Work through the method. The explanation opens when you have identified the electrodes.</p>';
    if (ui.act === 'conditions') {
      var effects = [];
      if (s.concL !== 1) effects.push(E.concentrationEffect(g.left, s.concL));
      if (s.concR !== 1) effects.push(E.concentrationEffect(g.right, s.concR));
      if (needsPrediction()) return '<p>Make your prediction first.</p>';
      return K.conditions(g.cell, g.reading || { value: 0 }, effects);
    }
    if (g.bridgeOk && !g.bridgeOk.ok) return '<p>' + g.message + '</p>' + (ui.act === 'daniell' ? '<p>Choose filter paper soaked in saturated potassium nitrate.</p>' : '');
    if (ui.act === 'emf') {
      if (!s.connected && !s.verdict) return '<p>Work out E°cell from the data, then check it or connect the voltmeter.</p>' + K.seriesTable([g.left.id, g.right.id]);
      var x = K.galvanic(g.cell, { bridge: s.bridge });
      if (s.asWritten) x = '<h4>The reaction as written</h4>' + K.direction(E.cellForDirection(g.left.id, g.right.id), g.left, g.right) + x;
      return x;
    }
    if (!s.connected) return ui.act === 'daniell' ? '<p>Make your predictions, then connect the voltmeter.</p>' : '';
    return K.galvanic(g.cell, { bridge: s.bridge });
  }
  function needsPrediction() {
    var s = st();
    if (ui.act !== 'conditions' || (s.concL === 1 && s.concR === 1)) return false;
    return s.predFor !== s.concL + '|' + s.concR + '|' + s.left + '|' + s.right;
  }

  /* ---------- Results tables ---------- */
  function resultsHtml() {
    if (ui.act === 'variables') {
      var rows = ui.results.variables, s = st(), h = '<h3>Results</h3>';
      h += '<div class="res-actions"><button class="btn sm primary" type="button" data-act="record"' + (s.connected ? '' : ' disabled') + '>Record the reading</button><button class="btn sm" type="button" data-act="clear-results"' + (rows.length ? '' : ' disabled') + '>Clear the table</button></div>';
      if (ui.lastRecordNote) h += '<p class="fb ' + ui.lastRecordNote.cls + '">' + ui.lastRecordNote.msg + '</p>';
      if (rows.length) h += '<table class="res"><thead><tr><th>#</th><th>Metals</th><th>Electrolyte</th><th>Reading / V</th></tr></thead><tbody>' +
        rows.map(function (r, i) { return '<tr><td>' + (i + 1) + '</td><td>' + r.metals + '</td><td>' + r.el + '</td><td>' + (r.reading === null ? '—' : r.reading.toFixed(2)) + '</td></tr>'; }).join('') + '</tbody></table>';
      var distinct = {}; rows.forEach(function (r) { if (r.reading) distinct[r.key] = 1; });
      if (Object.keys(distinct).length >= 3) {
        h += '<fieldset class="pq"><legend>What pattern do your results show?</legend><div class="pq-opts col">' + K.PATTERN_OPTIONS.map(function (o) {
          return '<button type="button" class="opt-btn' + (ui.pattern === o.id ? ' chosen' : '') + '" data-pattern="' + o.id + '" aria-pressed="' + (ui.pattern === o.id) + '">' + o.text + '</button>'; }).join('') + '</div></fieldset>';
        var po = K.PATTERN_OPTIONS.filter(function (o) { return o.id === ui.pattern; })[0];
        if (po) h += fb(po.right, po.why);
      } else if (rows.length) h += '<p class="muted small">Record at least three different cells to look for a pattern.</p>';
      return h;
    }
    if (ui.act === 'rp8') {
      var rr = ui.results.rp8;
      if (!rr.length) return '';
      var mags = rr.map(function (r) { return Math.abs(r.v); }), mean = mags.reduce(function (a, b) { return a + b; }, 0) / mags.length;
      return '<h3>Readings</h3><table class="res"><thead><tr><th>#</th><th>Cell</th><th>Red lead on</th><th>Reading / V</th></tr></thead><tbody>' +
        rr.map(function (r, i) { return '<tr><td>' + (i + 1) + '</td><td>' + r.cell + '</td><td>' + r.lead + '</td><td>' + v2(r.v) + '</td></tr>'; }).join('') + '</tbody></table>' +
        (rr.length > 1 ? '<p>Mean size of the reading: <b>' + mean.toFixed(2) + ' V</b></p>' : '') +
        '<div class="res-actions"><button class="btn sm" type="button" data-act="repeat">Take a repeat reading</button><button class="btn sm" type="button" data-act="clear-results">Clear</button></div>';
    }
    return '';
  }

  /* ---------- Required practical 8 ---------- */
  function rp8Progress(g) {
    var s = st(), done = {};
    done.choose = !!(g.left && g.right && !g.invalid && g.cell && g.cell.valid);
    done.clean = s.cleaned;
    done.bridge = !!(done.choose && g.bridgeOk && g.bridgeOk.ok);
    done.meter = !!(done.bridge && s.vLead);
    done.read = done.meter && ui.results.rp8.length > 0;
    done.identify = !!s.ans.checked;
    done.compare = s.predV !== null && done.identify;
    done.explain = s.reasonsChecked;
    return done;
  }
  function rp8Html(g) {
    var s = st(), done = rp8Progress(g), now = null, h = '<h3>Method</h3><ol class="steps">';
    K.RP8_STEPS.forEach(function (stp) {
      var cls = done[stp.id] ? 'done' : (!now ? 'now' : '');
      if (!done[stp.id] && !now) now = stp.id;
      h += '<li class="' + cls + '">' + stp.text + (cls === 'now' ? '<span class="why">' + stp.why + '</span>' : '') + '</li>';
    });
    h += '</ol>';
    if (g.message && (g.invalid || (g.bridgeOk && !g.bridgeOk.ok) || (g.cell && !g.cell.valid))) h += '<p class="fb bad">' + g.message + '</p>';
    if (done.meter && g.reading) {
      h += '<div class="calc-step"><label for="readIn">What does the voltmeter read?</label><div class="calc-row"><input id="readIn" type="text" inputmode="text" value="' + esc(s.readIn) + '" placeholder="include the sign" autocomplete="off"><span>V</span><button class="btn sm" type="button" data-act="rp8-read">Record</button></div>';
      if (s.readNote) h += s.readNote;
      h += '</div>';
    }
    if (done.read) {
      var L = g.left, R = g.right;
      h += '<div class="calc-step">' + q('rpPos', 'Which electrode is positive?', [['left', K.cap(L.name)], ['right', K.cap(R.name)]], s.ans.rpPos, s.ans.checked);
      h += q('rpE', 'Which way do electrons flow in the wire?', [['lr', 'From the ' + L.name + ' to the ' + R.name], ['rl', 'From the ' + R.name + ' to the ' + L.name]], s.ans.rpE, s.ans.checked);
      if (!s.ans.checked) h += '<button class="btn sm primary" type="button" data-act="rp8-identify"' + (s.ans.rpPos && s.ans.rpE ? '' : ' disabled') + '>Check</button>';
      else {
        var posSide = g.cell.cathode.id === L.id ? 'left' : 'right';
        h += fb(s.ans.rpPos === posSide, 'The ' + g.cell.cathode.name + ' electrode is positive. ' +
          'A positive reading means the red (V) lead is on the positive electrode; a negative reading means it is on the negative one.');
        h += fb(s.ans.rpE === (posSide === 'right' ? 'lr' : 'rl'), 'Electrons flow through the wire from the negative electrode (' + g.cell.anode.name + ') to the positive electrode (' + g.cell.cathode.name + ').');
      }
      h += '</div>';
    }
    if (done.identify) {
      h += '<div class="calc-step"><label for="predIn">E°cell from the data</label><div class="calc-row"><input id="predIn" type="text" inputmode="text" value="' + esc(s.predIn) + '" placeholder="e.g. +1.10" autocomplete="off"><span>V</span><button class="btn sm" type="button" data-act="rp8-pred">Check</button></div>';
      if (s.predNote) h += s.predNote;
      h += '<details class="hint"><summary>Data</summary>' + K.seriesTable([g.left.id, g.right.id]) + '</details></div>';
    }
    if (done.compare) {
      var mean = ui.results.rp8.reduce(function (a, r) { return a + Math.abs(r.v); }, 0) / ui.results.rp8.length;
      h += '<div class="calc-step"><p>Your mean reading is <b>' + mean.toFixed(2) + ' V</b>; E°cell is <b>' + v(g.cell.emf) + '</b>, a difference of ' + Math.abs(E.round(mean - g.cell.emf, 2)).toFixed(2) + ' V.</p>';
      h += '<fieldset class="pq"><legend>Which of these could explain a difference? Choose all that apply.</legend><div class="pq-opts col">' + K.RP8_REASONS.map(function (r) {
        return '<label class="check"><input type="checkbox" data-reason="' + r.id + '"' + (s.reasons[r.id] ? ' checked' : '') + (s.reasonsChecked ? ' disabled' : '') + '> <span>' + r.text + '</span></label>'; }).join('') + '</div></fieldset>';
      if (!s.reasonsChecked) h += '<button class="btn sm primary" type="button" data-act="rp8-reasons">Check</button>';
      else {
        K.RP8_REASONS.forEach(function (r) { if (s.reasons[r.id] || r.right) h += '<p class="fb ' + (r.right === !!s.reasons[r.id] ? 'good' : 'bad') + '"><b>' + (s.reasons[r.id] ? 'You chose: ' : 'You missed: ') + '</b>' + r.text + ' ' + r.why + '</p>'; });
        if (g.reading.notes.length) h += '<p class="fb note"><b>In this simulation:</b> ' + g.reading.notes.join(' ') + '</p>';
        h += '<p class="muted small">This simulation models the principles of Required practical 8. It does not reproduce every experimental effect and does not replace doing the practical, which is what counts towards the practical endorsement.</p>';
      }
      h += '</div>';
    }
    return h;
  }

  /* ---------- Challenges ---------- */
  function list() { return CH[ui.level === 'gcse' ? 'gcse' : 'alevel']; }
  function cs() { return st(); }
  function curChallenge() {
    var c = cs();
    if (!c.cur) {
      var def = list()[c.i], rnd = E.rng(ui.seed + 977 * (c.i + 1) + 31 * (c.tried + 1));
      c.cur = def.make(rnd); c.cur.def = def; c.answer = null; c.showHint = false;
      if (c.cur.kind === 'mcq') c.cur.options = shuffle(c.cur.options, rnd);
      if (c.cur.setup) c.build = Object.assign({}, c.cur.setup);
    }
    return c.cur;
  }
  function challengeControls() {
    var c = cs(), cur = curChallenge(), h = '<h3>Challenges</h3><ol class="ch-list">';
    list().forEach(function (d, i) {
      var stt = c.status[d.id];
      h += '<li><button type="button" class="act' + (i === c.i ? ' on' : '') + '" data-ch="' + i + '"><span class="letter">' + (stt === 'right' ? '✓' : stt === 'wrong' ? '•' : i + 1) + '</span><span>' + d.title + (d.ht ? ' <span class="tag ht">HT</span>' : '') + '</span></button></li>';
    });
    h += '</ol>';
    if (cur.kind === 'build') {
      var b = c.build;
      h += '<h3>Your cell</h3>' + select('b-m1', 'Electrode 1', METAL_OPTS, b.m1) + select('b-m2', 'Electrode 2', METAL_OPTS, b.m2) + select('b-el', 'Electrolyte', ELYTE_OPTS, b.el);
    }
    return h;
  }
  function challengeHtml() {
    var c = cs(), cur = curChallenge(), h = '<h3>' + cur.def.title + (cur.ht ? ' <span class="tag ht">HT</span>' : '') + '</h3><div class="ch-q">' + cur.q + '</div>';
    var answered = c.answer !== null;
    if (cur.kind === 'mcq') {
      h += '<div class="pq-opts col">' + cur.options.map(function (o, i) {
        var cls = answered ? (o.right ? ' right' : c.answer === i ? ' wrong' : '') : '';
        return '<button type="button" class="opt-btn' + cls + '" data-ans="' + i + '"' + (answered ? ' disabled' : '') + '>' + o.html + '</button>'; }).join('') + '</div>';
      if (answered) {
        var ch = cur.options[c.answer];
        h += fb(ch.right, ch.why);
        if (!ch.right) { var r = cur.options.filter(function (o) { return o.right; })[0]; h += '<p class="fb note"><b>Answer:</b> ' + r.html + '. ' + r.why + '</p>'; }
      }
    } else if (cur.kind === 'num') {
      h += '<div class="calc-row"><input id="chIn" type="text" inputmode="text" autocomplete="off" placeholder="e.g. +0.46" value="' + esc(c.numIn || '') + '"' + (answered ? ' disabled' : '') + '><span>' + cur.unit + '</span>' + (answered ? '' : '<button class="btn sm primary" type="button" data-act="ch-num">Check</button>') + '</div>';
      if (answered) h += c.numFb; else if (c.numMsg) h += c.numMsg;
    } else if (cur.kind === 'build') {
      h += answered ? c.buildFb : '<button class="btn sm primary" type="button" data-act="ch-build">Check my cell</button>' + (c.buildFb || '');
    }
    if (!answered) h += '<button class="btn sm" type="button" data-act="ch-hint">' + (c.showHint ? 'Hide the hint' : 'Hint') + '</button>' + (c.showHint ? '<p class="hint-box">' + cur.hint + '</p>' : '');
    else h += '<details class="worked" open><summary>Worked explanation</summary><div>' + cur.worked + '</div></details><div class="res-actions"><button class="btn sm" type="button" data-act="ch-again">Another like this</button>' +
      (c.i < list().length - 1 ? '<button class="btn sm primary" type="button" data-act="ch-next">Next challenge</button>' : '<button class="btn sm primary" type="button" data-act="ch-first">Back to the first</button>') + '</div>';
    return h;
  }
  function challengeModel() {
    var c = cs(), cur = curChallenge(), sc = cur.scene || {}, answered = c.answer !== null;
    if (cur.kind === 'build') {
      var b = c.build, r = E.simpleCell(b.m1, b.m2, b.el);
      return { type: 'simple', m1: b.m1, m2: b.m2, electrolyte: b.el, result: r, connected: true, meterText: r.valid ? r.typical.toFixed(2) + ' V' : '0.00 V', show: { roles: true, flow: true }, message: r.valid ? '' : r.why };
    }
    if (sc.type === 'electrolysis') {
      var er = E.electrolysis(sc.id, { supply: answered });
      return { type: 'electrolysis', compound: E.ionic(sc.id), result: er, supply: answered, show: { roles: answered || sc.roles }, message: '' };
    }
    if (sc.type === 'battery') return { type: 'battery', cells: [{}, {}, {}], neg: 'zn', pos: 'cu', electrolyte: 'lemon', single: E.simpleCell('zn', 'cu', 'lemon').typical, total: E.round(3 * E.simpleCell('zn', 'cu', 'lemon').typical, 2), meterText: (3 * E.simpleCell('zn', 'cu', 'lemon').typical).toFixed(2) + ' V', flow: true };
    if (sc.type === 'simple') { var rs = E.simpleCell(sc.m1, sc.m2, sc.el); return { type: 'simple', m1: sc.m1, m2: sc.m2, electrolyte: sc.el, result: rs, connected: answered, meterText: answered ? rs.typical.toFixed(2) + ' V' : '—', show: { roles: true, flow: true } }; }
    if (sc.type === 'galvanic') {
      var cell = E.buildCell(sc.left, sc.right), L = E.halfCell(sc.left), R = E.halfCell(sc.right);
      if (L && R && L.E > R.E) { var tl = L; L = R; R = tl; }
      return { type: 'galvanic', left: L, right: R, bridge: 'kno3', cell: cell, connected: true, circuitOk: true, meter: true,
        meterText: answered ? v2(cell.emf) : '?', vLead: cell.cathode.id === L.id ? 'left' : 'right', show: { roles: answered || sc.roles, flow: answered, values: sc.values } };
    }
    return { type: 'galvanic', left: E.halfCell('zn'), right: E.halfCell('cu'), bridge: 'kno3', cell: E.buildCell('zn', 'cu'), connected: true, circuitOk: true, meter: true, meterText: '—', show: { roles: answered, flow: answered, values: true } };
  }
  function answerChallenge(right, extra) {
    var c = cs(), id = c.cur.def.id;
    c.tried++; if (right) c.score++;
    c.status[id] = right ? 'right' : (c.status[id] === 'right' ? 'right' : 'wrong');
    if (extra) extra(c);
    buildControls(); refresh();
    say(right ? 'Correct.' : 'Not quite. See the explanation.');
  }

  /* ---------- Board notes (presenter slides) ---------- */
  function boardNotes() {
    var a = act(), s = st(), n = $('#boardNotes'), h = '<h3>' + a.title + '</h3>';
    if (a.scene === 'simple') {
      var r = E.simpleCell(s.m1, s.m2, s.el);
      if (s.connected && r.valid) h += '<p>' + K.cap(r.negative.name) + ' is more reactive than ' + r.positive.name + ', so ' + r.negative.name + ' is the negative electrode. Electrons flow through the wire from the ' + r.negative.name + ' to the ' + r.positive.name + '.</p><p>Further apart in reactivity: bigger voltage.</p>';
      else h += '<p>' + (s.connected && !r.valid ? r.why : 'Which metal will be the negative electrode? Which way will the electrons flow?') + '</p>';
    } else if (a.scene === 'battery') { var b = batteryState(); h += '<p>Cells in series: the voltages add. ' + s.cells.length + ' cell' + (s.cells.length > 1 ? 's' : '') + ' give ' + v2(b.total) + '.</p>'; }
    else if (a.scene === 'electrolysis') {
      var er = E.electrolysis(s.id, { supply: s.supply });
      if (er.valid) h += '<p>Cathode (−), reduction: ' + er.cathode.info.name + (s.ht ? '. ' + E.equation(er.cathode.half.left, er.cathode.half.right, 'html') : '') + '</p><p>Anode (+), oxidation: ' + er.anode.info.name + (s.ht ? '. ' + E.equation(er.anode.half.left, er.anode.half.right, 'html') : '') + '</p>';
      else h += '<p>' + (s.supply ? er.why : 'Predict the products at each electrode, then switch on.') + '</p>';
    } else if (a.scene === 'fuel') { var f = E.fuelCell(s); h += '<p>' + (f.running ? 'Overall: ' + E.equation(f.overall.left, f.overall.right, 'html') + '. The only product is water.' : f.why) + '</p>' + (s.ht ? '<p>Negative: ' + E.equation(f.negative.left, f.negative.right, 'html') + '</p><p>Positive: ' + E.equation(f.positive.left, f.positive.right, 'html') + '</p>' : ''); }
    else if (a.scene === 'challenge') { var cur = curChallenge(); h = '<h3>' + cur.def.title + '</h3><p>' + cur.q.replace(/<table[\s\S]*?<\/table>/g, ' (see the table) ').replace(/<p class="working">([\s\S]*?)<\/p>/, ' $1 ') + '</p>'; }
    else {
      var g = galvanicState(), connected = ui.act === 'rp8' ? !!s.ans.checked : ui.act === 'conditions' ? !needsPrediction() : s.connected;
      if (g.cell && g.cell.valid && connected && (!g.bridgeOk || g.bridgeOk.ok)) {
        h += '<p>Oxidation, negative electrode: ' + E.halfEquation(g.cell.anode, 'oxidation') + '</p><p>Reduction, positive electrode: ' + E.halfEquation(g.cell.cathode, 'reduction') + '</p>' +
          '<p>Overall: ' + E.overallEquation(g.cell, 'html') + '</p><p>E°cell = (' + v(g.cell.cathode.E) + ') − (' + v(g.cell.anode.E) + ') = ' + v(g.cell.emf) + '</p><p>' + E.notation(g.cell, 'html') + '</p>';
      } else h += '<p>' + (g.message || 'Which half-cell is oxidised? Which electrode is positive? Which way do the electrons go?') + '</p>';
    }
    if (n.innerHTML !== h) n.innerHTML = h;
  }

  /* ---------- Refresh ---------- */
  function legendHtml(m) {
    var items = [];
    var dot = function (fill, sign) { return '<svg viewBox="-10 -10 20 20" aria-hidden="true"><circle r="8" fill="' + fill + '"/>' + (sign === '+' ? '<path d="M-4,0H4M0,-4V4" stroke="#050e1a" stroke-width="2.2"/>' : '<path d="M-4,0H4" stroke="#050e1a" stroke-width="2.2"/>') + '</svg>'; };
    if (m.type !== 'electrolysis' || (m.result && m.result.valid)) items.push(dot('#f2c94c', '−') + 'electron (e⁻), only in wires');
    if (m.type === 'galvanic') items.push(dot('#b199f4', '+') + 'positive ion', dot('#5fd3a8', '−') + 'negative ion');
    if (m.type === 'electrolysis' && m.result && m.result.valid) items.push(dot('#b199f4', '+') + 'positive ions: ' + m.result.ions.filter(function (i) { return i.sign === '+'; }).map(function (i) { return E.uni(i.f); }).join(', '), dot('#5fd3a8', '−') + 'negative ions: ' + m.result.ions.filter(function (i) { return i.sign !== '+'; }).map(function (i) { return E.uni(i.f); }).join(', '));
    if (m.type === 'simple') items.push(dot('#b199f4', '+') + 'metal ion');
    if (m.type === 'fuel') items.push(dot(m.result.electrolyte === 'alkaline' ? '#5fd3a8' : '#b199f4', m.result.electrolyte === 'alkaline' ? '−' : '+') + (m.result.electrolyte === 'alkaline' ? 'OH⁻ ion' : 'H⁺ ion'));
    var note = (m.type === 'galvanic' || m.type === 'simple' || m.type === 'battery') ? '<span class="lg-note">The markers show the direction of flow. Through a high-resistance voltmeter the actual current is tiny.</span>' : '';
    return items.map(function (i) { return '<span class="lg">' + i + '</span>'; }).join('') + note;
  }
  // Re-rendering replaces the controls; put focus back on the matching one.
  function focusSel(el) {
    if (!el || el === document.body) return '';
    if (el.id) return '#' + (window.CSS && CSS.escape ? CSS.escape(el.id) : el.id);
    var s = '';
    Array.prototype.forEach.call(el.attributes, function (a) { if (/^data-/.test(a.name)) s += '[' + a.name + '="' + a.value.replace(/"/g, '\\"') + '"]'; });
    return s ? el.tagName.toLowerCase() + s : '';
  }
  function keepFocus(fn) {
    var el = document.activeElement, s = focusSel(el);
    fn();
    if (s && el !== document.activeElement && !document.contains(el)) {
      var n = document.querySelector(s);
      if (n && !n.disabled) n.focus({ preventScroll: true }); else if (n) { var f = n.closest('.card, .build'); if (f) { f.tabIndex = -1; f.focus({ preventScroll: true }); } }
    }
  }
  function say(msg) { var l = $('#srLive'); l.textContent = ''; setTimeout(function () { l.textContent = msg; }, 30); }

  function refresh(newScene) {
    var a = act(), openDetails = $$('#info details[open] > summary').map(function (n) { return n.textContent; });
    var m = sceneModel();
    m.presenting = document.body.classList.contains('presenting');
    var key = JSON.stringify([ui.act, m.type, m.meterText, m.connected, m.supply, m.show, m.left && m.left.id, m.right && m.right.id, m.bridge, m.m1, m.m2, m.electrolyte, m.h2, m.o2, m.result && m.result.electrolyte, m.cells, m.vLead, m.compound && m.compound.id, m.message, m.concLeft, m.concRight, m.show && m.show.values, document.body.classList.contains('presenting')]);
    if (key !== ui.sceneKey || newScene) {
      ui.scene.draw(m); ui.sceneKey = key; ui.t = 0; ui.scene.tick(ui.playing ? 0 : 18); sizeForBoard();
      // On a phone the drawing scrolls sideways: start from its middle.
      var stg = $('#stage'); if (stg.scrollWidth > stg.clientWidth) stg.scrollLeft = (stg.scrollWidth - stg.clientWidth) / 2;
    }
    $('#legend').innerHTML = legendHtml(m);
    var ro = readoutHtml(); if (ui.lastRo !== ro) { $('#readout').innerHTML = ro; ui.lastRo = ro; }
    var p = predictHtml(); $('#predictCard').innerHTML = p; $('#predictCard').hidden = !p;
    var x = explainHtml(); $('#explainBody').innerHTML = x; $('#explainCard').hidden = !x;
    var r = resultsHtml(); $('#resultsCard').innerHTML = r; $('#resultsCard').hidden = !r;
    $('#actHead').innerHTML = '<span class="kicker">' + (ui.level === 'gcse' ? 'GCSE' : 'A-level') + ' · ' + a.spec.join(' · ') + '</span><h2 id="actTitle">' + (a.letter !== '★' ? a.letter + '. ' : '') + a.title + '</h2><ul class="objs">' + a.objectives.map(function (o) { return '<li>' + o + '</li>'; }).join('') + '</ul>';
    $('#btnPlay').textContent = ui.playing ? 'Pause animation' : 'Start animation';
    boardNotes();
    // On the board the slides re-flow about 250 ms after a change, resizing the stage.
    if (document.body.classList.contains('presenting')) { clearTimeout(ui.sz1); clearTimeout(ui.sz2); ui.sz1 = setTimeout(sizeForBoard, 120); ui.sz2 = setTimeout(sizeForBoard, 450); }
    // Details the student opened stay open across a re-render.
    $$('#info details > summary').forEach(function (n) { if (openDetails.indexOf(n.textContent) >= 0) n.parentNode.open = true; });
  }

  /* ---------- Animation ---------- */
  function loop(ts) {
    ui.raf = requestAnimationFrame(loop);
    var dt = ui.last ? Math.min(0.1, (ts - ui.last) / 1000) : 0; ui.last = ts;
    if (!ui.playing || document.hidden) return;
    ui.t += dt; ui.scene.tick(ui.t);
  }

  /* ---------- Events ---------- */
  function onControl(e) {
    var t = e.target, s = st(), k = t.dataset.k;
    if (!k) return;
    var val = t.type === 'checkbox' ? t.checked : t.value;
    if (/^conc/.test(k)) val = +val;
    if (k.indexOf('b-') === 0) { cs().build[k.slice(2)] = val; cs().buildFb = ''; refresh(); return; }
    s[k] = val;
    if (ui.act === 'emf' && (k === 'left' || k === 'right')) { s.verdict = null; s.connected = false; s.guess = ''; }
    if (ui.act === 'emf' && k === 'asWritten') { s.verdict = null; s.guess = ''; }
    if ((ui.act === 'simple' || ui.act === 'variables') && (k === 'm1' || k === 'm2')) s.pred = {};
    if (ui.act === 'series' && (k === 'left' || k === 'right')) { s.connected = false; s.pred = {}; }
    if (ui.act === 'rp8' && /^(lEl|lSol|rEl|rSol|bridge)$/.test(k)) { s.ans = {}; s.readIn = ''; s.readNote = ''; s.predV = null; s.predIn = ''; s.predNote = ''; s.reasons = {}; s.reasonsChecked = false; ui.results.rp8 = []; s.trial = 0; }
    if (ui.act === 'electrolysis' && k === 'id') { s.supply = false; s.pred = {}; buildControls(); }
    if (ui.act === 'conditions' && (k === 'left' || k === 'right')) buildControls();
    if (ui.act === 'emf' && k === 'asWritten') buildControls();
    if ((k === 'left' || k === 'right' || k === 'asWritten') && conventional(s)) { buildControls(); say('Half-cells swapped: the negative electrode goes on the left.'); }
    refresh();
  }
  function onClick(e) {
    var b = e.target.closest('button, [data-reason]'); if (!b) return;
    var s = st(), d = b.dataset;
    if (d.goto) { go(null, d.goto); return; }
    if (d.level) { go(d.level); return; }
    if (d.seg) { s[d.seg] = d.v; if (ui.act === 'rp8') { s.ans = {}; s.readNote = ''; s.readIn = ''; } buildControls(); refresh(); return; }
    if (d.pred) {
      if (ui.act === 'battery') s.check = d.v;
      else if (ui.act === 'conditions') { s.pred = d.v; s.predFor = s.concL + '|' + s.concR + '|' + s.left + '|' + s.right; }
      else if (ui.act === 'rp8') s.ans[d.pred] = d.v;
      else s.pred[d.pred] = d.v;
      refresh(); return;
    }
    if (d.pattern) { ui.pattern = d.pattern; refresh(); return; }
    if (d.ch !== undefined) { var c = cs(); c.i = +d.ch; c.cur = null; c.buildFb = ''; c.numIn = ''; c.numMsg = ''; buildControls(); refresh(true); return; }
    if (d.ans !== undefined) { var cur = curChallenge(); var i = +d.ans; answerChallenge(cur.options[i].right, function (c) { c.answer = i; }); return; }
    var a = d.act; if (!a) return;
    var cc;
    switch (a) {
      case 'connect': s.connected = !s.connected; if (!s.connected) s.pred = {}; buildControls(); refresh(); say(s.connected ? 'Connected.' : 'Disconnected.'); break;
      case 'supply': s.supply = !s.supply; if (!s.supply) s.pred = {}; buildControls(); refresh(true); break;
      case 'cell+': if (s.cells.length < 4) s.cells.push({ flipped: false }); buildControls(); refresh(); break;
      case 'cell-': if (s.cells.length > 1) s.cells.pop(); buildControls(); refresh(); break;
      case 'flip': s.cells[+d.i].flipped = !s.cells[+d.i].flipped; buildControls(); refresh(); break;
      case 'swap': var tmp = s.left; s.left = s.right; s.right = tmp; s.connected = false; s.pred = {}; s.verdict = null; buildControls(); refresh(); break;
      case 'clean': s.cleaned = !s.cleaned; ui.results.rp8 = []; s.trial = 0; s.readNote = ''; buildControls(); refresh(); break;
      case 'check-emf': checkEmf(); break;
      case 'record': recordVariables(); break;
      case 'clear-results': ui.results[ui.act] = []; ui.lastRecordNote = null; ui.pattern = null; refresh(); break;
      case 'repeat': s.trial++; s.readIn = ''; s.readNote = '<p class="fb note">Read the meter again: it may differ slightly.</p>'; refresh(); break;
      case 'rp8-read': rp8Read(); break;
      case 'rp8-identify': s.ans.checked = true; refresh(); break;
      case 'rp8-pred': rp8Pred(); break;
      case 'rp8-reasons': $$('[data-reason]').forEach(function (c) { s.reasons[c.dataset.reason] = c.checked; }); s.reasonsChecked = true; refresh(); break;
      case 'ch-hint': cc = cs(); cc.showHint = !cc.showHint; refresh(); break;
      case 'ch-next': cc = cs(); cc.i++; cc.cur = null; cc.buildFb = ''; cc.numIn = ''; cc.numMsg = ''; buildControls(); refresh(true); break;
      case 'ch-first': cc = cs(); cc.i = 0; cc.cur = null; cc.buildFb = ''; buildControls(); refresh(true); break;
      case 'ch-again': cc = cs(); cc.cur = null; cc.buildFb = ''; cc.numIn = ''; cc.numMsg = ''; ui.seed = newSeed(); buildControls(); refresh(true); break;
      case 'ch-num': checkChallengeNum(); break;
      case 'ch-build': checkChallengeBuild(); break;
    }
  }
  function checkEmf() {
    var s = st(), g = galvanicState(), x = num($('#emfIn').value), c = g.cell;
    s.guess = $('#emfIn').value;
    if (x === null) { s.verdict = '<p class="fb bad">Enter a number in volts, for example +0.46.</p>'; refresh(); return; }
    var target = s.asWritten ? E.cellForDirection(g.left.id, g.right.id).emf : c.emf, msg;
    if (Math.abs(x - target) < 0.006) msg = fb(true, 'E°cell = ' + v(target) + (s.asWritten && target < 0 ? '. It is negative, so the reaction as written is not feasible: the reverse reaction is.' : '.'));
    else if (Math.abs(x + target) < 0.006) msg = fb(false, 'Your predicted standard EMF has the wrong sign. ' + (s.asWritten ? 'As written, the left half-cell is oxidised: E°cell = E°right − E°left.' : 'Reconsider which half-cell is oxidised: for the feasible direction E°cell is positive.'));
    else if (Math.abs(x - E.round(c.cathode.E + c.anode.E, 2)) < 0.006) msg = fb(false, 'You added the two potentials. Subtract: E°cell = E°right − E°left.');
    else if ((c.multipliers.cathode !== 1 || c.multipliers.anode !== 1) && Math.abs(Math.abs(x) - Math.abs(E.round(c.multipliers.cathode * c.cathode.E - c.multipliers.anode * c.anode.E, 2))) < 0.006) msg = fb(false, 'You multiplied the electrode potentials by the balancing numbers. Electrode potentials are never multiplied: they do not depend on how many moles react.');
    else msg = fb(false, 'Check your subtraction. Use E°cell = E°right − E°left, with each value exactly as tabulated.');
    s.verdict = msg; s.connected = true;
    buildControls(); refresh();
  }
  function recordVariables() {
    var s = st(), r = E.simpleCell(s.m1, s.m2, s.el, { seed: ui.seed, trial: s.trial }), rows = ui.results.variables;
    var key = [s.m1, s.m2].sort().join('-') + '|' + s.el, last = rows[rows.length - 1], note = null;
    var row = { key: key, m1: s.m1, m2: s.m2, elId: s.el, metals: K.cap(E.METAL[s.m1].name) + ' | ' + E.METAL[s.m2].name, el: E.ELECTROLYTE[s.el].short, reading: r.valid ? r.reading : (r.reading === 0 ? 0 : null) };
    if (last) {
      var changed = [];
      if (last.m1 !== s.m1) changed.push('electrode 1'); if (last.m2 !== s.m2) changed.push('electrode 2'); if (last.elId !== s.el) changed.push('the electrolyte');
      if (!changed.length) note = { cls: 'note', msg: 'A repeat reading. Repeats vary a little, which is why you take several and find a mean.' };
      else if (changed.length > 1) note = { cls: 'bad', msg: 'You changed ' + changed.join(' and ') + ' at once. If the reading changes, you cannot tell which change caused it. Change one thing at a time.' };
      else note = { cls: 'good', msg: 'You changed only ' + changed[0] + ': a fair test.' };
    }
    rows.push(row); s.trial++; ui.lastRecordNote = note;
    refresh(); say('Recorded ' + (row.reading === null ? 'no reading' : row.reading.toFixed(2) + ' volts'));
  }
  function rp8Read() {
    var s = st(), g = galvanicState(), x = num($('#readIn').value);
    s.readIn = $('#readIn').value;
    if (x === null) { s.readNote = '<p class="fb bad">Enter the reading shown on the voltmeter, with its sign.</p>'; refresh(); return; }
    var val = g.reading.value;
    if (Math.abs(x - val) > 0.006) {
      s.readNote = Math.abs(x + val) < 0.006 ? '<p class="fb bad">Check the sign: the meter shows ' + v2(val) + '.</p>' : '<p class="fb bad">That is not what the meter shows. Read it again, to 2 decimal places.</p>';
      refresh(); return;
    }
    ui.results.rp8.push({ v: val, cell: g.left.symbol + ' | ' + g.right.symbol, lead: (s.vLead === 'left' ? g.left : g.right).symbol });
    s.readNote = val < 0 ? '<p class="fb note">The reading is negative, so the red (V) lead is on the <b>negative</b> electrode. Swap the leads to read a positive value, or use the sign to identify the electrodes.</p>' : '<p class="fb good">Recorded. A positive reading means the red (V) lead is on the positive electrode.</p>';
    s.readIn = ''; refresh();
  }
  function rp8Pred() {
    var s = st(), g = galvanicState(), x = num($('#predIn').value);
    s.predIn = $('#predIn').value;
    if (x === null) { s.predNote = '<p class="fb bad">Enter a value in volts.</p>'; refresh(); return; }
    if (Math.abs(x - g.cell.emf) < 0.006) { s.predV = x; s.predNote = fb(true, 'E°cell = ' + v(g.cell.cathode.E) + ' − (' + v(g.cell.anode.E) + ') = ' + v(g.cell.emf) + '.'); }
    else if (Math.abs(x + g.cell.emf) < 0.006) s.predNote = fb(false, 'Right size, wrong sign: E°cell = E°(positive electrode) − E°(negative electrode) is positive for a working cell.');
    else s.predNote = fb(false, 'Use E°cell = E°right − E°left with the negative electrode on the left. Open the data below.');
    refresh();
  }
  function checkChallengeNum() {
    var cur = curChallenge(), raw = $('#chIn').value, x = num(raw), c0 = cs();
    if (x === null) { c0.numIn = raw; c0.numMsg = '<p class="fb bad">Enter a number in volts, for example +0.46.</p>'; refresh(); return; }
    c0.numMsg = '';
    var right = Math.abs(x - cur.answer) <= cur.tol, why = right ? 'E°cell = ' + v(cur.answer) + '.' : (cur.diagnose && cur.diagnose(x)) || 'The answer is ' + v(cur.answer) + '.';
    answerChallenge(right, function (c) { c.answer = 0; c.numIn = raw; c.numFb = fb(right, why); });
  }
  function checkChallengeBuild() {
    var c = cs(), res = curChallenge().check(c.build);
    if (res.ok) answerChallenge(true, function (cc) { cc.answer = 0; cc.buildFb = fb(true, res.msg); });
    else { c.buildFb = fb(false, res.msg); refresh(); }
  }

  /* ---------- Presenter mode: SVG text sized for the board ---------- */
  function sizeForBoard() {
    var presenting = document.body.classList.contains('presenting'), svg = $('#cellSvg');
    var ctm = svg.getScreenCTM && svg.getScreenCTM(), k = ctm ? Math.hypot(ctm.a, ctm.b) : 1;
    var floor = presenting && window.SST_PRESENT ? SST_PRESENT.px('--sst-pr-label') / (k || 1) : 0;
    svg.querySelectorAll('text').forEach(function (t) {
      var base = parseFloat(t.getAttribute('data-fs') || t.getAttribute('font-size') || '15');
      if (!t.hasAttribute('data-fs')) t.setAttribute('data-fs', base);
      t.style.display = presenting && t.classList.contains('minor') ? 'none' : '';
      t.setAttribute('font-size', presenting ? Math.max(base, floor).toFixed(1) : base);
      if (t.hasAttribute('data-line')) t.setAttribute('y', +t.getAttribute('data-y0') + (+t.getAttribute('data-line')) * Math.max(19, (presenting ? Math.max(16, floor) : 16) * 1.2));
    });
  }

  /* ---------- Printing ---------- */
  function openPrint() {
    $$('#printDlg input[name="pLevel"]').forEach(function (r) { r.checked = r.value === ui.level; });
    $('#pWs').checked = true; $('#pMs').checked = false;
    var has = ui.results.variables.length || ui.results.rp8.length;
    $('#pRes').checked = false; $('#pRes').disabled = !has;
    if (window.SST_PRESENTER) SST_PRESENTER.toggle(false);
    $('#printDlg').returnValue = '';   // Esc keeps the old value: never let it mean "print"
    $('#printDlg').showModal();
  }
  function buildResultsPrint() {
    var h = '<div class="print-head"><div><h1>My results: Electrochemical Cell Builder</h1><div class="sub">Savage Science Tools</div></div><div class="sub">' + new Date().toLocaleDateString('en-GB') + '</div></div>';
    if (ui.results.variables.length) h += '<h3>Simple cells (illustrative readings)</h3><table class="ws-table"><thead><tr><th>#</th><th>Metals</th><th>Electrolyte</th><th>Reading / V</th></tr></thead><tbody>' + ui.results.variables.map(function (r, i) { return '<tr><td>' + (i + 1) + '</td><td>' + r.metals + '</td><td>' + r.el + '</td><td>' + (r.reading === null ? '—' : r.reading.toFixed(2)) + '</td></tr>'; }).join('') + '</tbody></table>';
    if (ui.results.rp8.length) h += '<h3>Required practical 8 (simulated readings)</h3><table class="ws-table"><thead><tr><th>#</th><th>Cell</th><th>Red lead on</th><th>Reading / V</th></tr></thead><tbody>' + ui.results.rp8.map(function (r, i) { return '<tr><td>' + (i + 1) + '</td><td>' + r.cell + '</td><td>' + r.lead + '</td><td>' + v2(r.v) + '</td></tr>'; }).join('') + '</tbody></table>';
    $('#printResults').innerHTML = h;
  }
  function doPrint() {
    var b = document.body, level = ($('#printDlg input[name="pLevel"]:checked') || {}).value || 'gcse', cls = ['print-custom'];
    if ($('#pWs').checked) cls.push('p-ws-' + level);
    if ($('#pMs').checked) cls.push('p-ms-' + level);
    if ($('#pRes').checked && !$('#pRes').disabled) { buildResultsPrint(); cls.push('p-results'); }
    if (cls.length === 1) return;
    cls.forEach(function (c) { b.classList.add(c); });
    var title = document.title;
    document.title = 'Electrochemical cells — ' + (level === 'gcse' ? 'GCSE' : 'A-level');
    function done() { document.title = title; cls.forEach(function (c) { b.classList.remove(c); }); window.removeEventListener('afterprint', done); }
    window.addEventListener('afterprint', done);
    setTimeout(function () { window.print(); }, 60);
  }

  /* ---------- Start ---------- */
  function init() {
    ui.scene = S.create($('#cellSvg'));
    $('#build').addEventListener('change', function (e) { keepFocus(function () { onControl(e); }); });
    document.addEventListener('click', function (e) { keepFocus(function () { onClick(e); }); });
    // Keep what a student has typed, so a re-render never wipes it.
    $('#info').addEventListener('input', function (e) {
      var s = st(), id = e.target.id;
      if (id === 'emfIn') s.guess = e.target.value; else if (id === 'readIn') s.readIn = e.target.value;
      else if (id === 'predIn') s.predIn = e.target.value; else if (id === 'chIn') cs().numIn = e.target.value;
    });
    $('#info').addEventListener('keydown', function (e) {
      if (e.key !== 'Enter') return;
      if (e.target.id === 'emfIn') { e.preventDefault(); checkEmf(); }
      else if (e.target.id === 'readIn') { e.preventDefault(); rp8Read(); }
      else if (e.target.id === 'predIn') { e.preventDefault(); rp8Pred(); }
      else if (e.target.id === 'chIn') { e.preventDefault(); checkChallengeNum(); }
    });
    $('.levels').addEventListener('keydown', function (e) {
      if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') return;
      e.preventDefault(); go(ui.level === 'gcse' ? 'alevel' : 'gcse'); $('.levels [aria-selected="true"]').focus();
    });
    $('#btnPlay').addEventListener('click', function () { ui.playing = !ui.playing; if (!ui.playing) ui.scene.tick(Math.max(ui.t, 18)); refresh(); });
    $('#btnReset').addEventListener('click', function () { ui.st[ui.act] = defaults(ui.act); if (ui.act === 'variables') ui.lastRecordNote = null; if (ui.act === 'rp8') ui.results.rp8 = []; buildControls(); refresh(true); say('Reset.'); });
    $('#btnPresent').addEventListener('click', function () { if (window.SST_PRESENTER) SST_PRESENTER.toggle(); });
    $('#btnAnnotate').addEventListener('click', function () { var n = document.querySelector('.sst-bar .sst-ink-nav:not(.sst-pres-nav)'); if (n) n.click(); });
    $('#btnPrint').addEventListener('click', openPrint);
    $('#printDlg').addEventListener('close', function () { if ($('#printDlg').returnValue === 'print') doPrint(); });
    window.addEventListener('resize', function () { clearTimeout(ui.rs); ui.rs = setTimeout(sizeForBoard, 80); });
    new MutationObserver(function () {
      var p = document.body.classList.contains('presenting');
      if (p !== ui.wasPresenting) { ui.wasPresenting = p; refresh(true); }
      setTimeout(sizeForBoard, 60);
    }).observe(document.body, { attributes: true, attributeFilter: ['class'] });
    // The presenter re-lays out the board as its slides change, which resizes the stage.
    if (window.ResizeObserver) new ResizeObserver(function () { sizeForBoard(); }).observe($('#stage'));
    if (window.SST_PRESENTER) SST_PRESENTER.setup({ stage: '#stage', side: '#build', notes: '#boardNotes', hide: '#srLive' });
    var pr = /[?&]print=([a-z,-]+)/.exec(location.search);
    if (pr) pr[1].split(',').forEach(function (k) { if (/^(ws|ms)-(gcse|alevel)$/.test(k)) document.body.classList.add('print-custom', 'p-' + k); });
    var m = /act=([a-z0-9-]+)/.exec(location.hash), a = m && K.activity(m[1]);
    go(a ? a.level : 'gcse', a ? a.id : 'simple');
    ui.raf = requestAnimationFrame(loop);
  }
  // For the page tests in tests.html. Nothing here is secret: it is all in the page.
  window.CellPage = {
    ui: ui, go: go, refresh: refresh, state: st,
    set: function (patch) { Object.assign(st(), patch); buildControls(); refresh(); },
    click: function (selector) { var b = $(selector); if (b) b.click(); return !!b; }
  };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
})();
