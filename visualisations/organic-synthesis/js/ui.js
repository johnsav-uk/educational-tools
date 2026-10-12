/* Organic Synthesis Pathways: the page.

   Plain DOM and inline SVG. Every chemistry decision (what a step makes, why a
   step fails, whether a route is valid, what a hint says) comes from SynthEngine;
   this file only draws what it returns and keeps the student's pathway.

   The pathway has two chains: a forward chain that grows from the start molecule,
   and a backward chain that grows leftwards from the target (reverse planning).
   The puzzle is solved when they meet. */
(function () {
  'use strict';
  var E = window.SynthEngine, S = window.Structure, C = window.SYNTH_CHALLENGES, K = window.SYNTH_CONTENT, D = window.SYNTH_DATA;
  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };
  function esc(s) { return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/"/g, '&quot;'); }

  var st = {
    level: 'gcse', style: 'displayed', enrich: false, puzzle: null, start: 'ethene',
    fwd: [], back: [], card: null, profile: null, mode: 'fwd', pre: null, search: '',
    pending: null, shown: null, tried: [], hintTier: 0, hintText: '', failed: 0, hints: 0, found: {}, revealed: false, solvedNow: false
  };
  var STORE = 'sst-organic-solved', solvedStore = {};
  try { solvedStore = JSON.parse(localStorage.getItem(STORE) || '{}') || {}; } catch (e) { solvedStore = {}; }
  function saveSolved() { try { localStorage.setItem(STORE, JSON.stringify(solvedStore)); } catch (e) { /* private window: the page still works */ } }

  function opts() { return { level: st.level, enrich: st.level === 'alevel' && st.enrich }; }
  function nm(id) { return E.name(id, st.level); }
  function isFree() { return !st.puzzle; }
  function target() { return st.puzzle ? st.puzzle.target : null; }
  function fwdEnd() { return st.fwd.length ? st.fwd[st.fwd.length - 1].pick : st.start; }
  function backFront() { return st.back.length ? st.back[st.back.length - 1].from : target(); }
  function steps() { return st.fwd.length + st.back.length; }
  function merged() { return !isFree() && fwdEnd() === backFront(); }
  function poor() { return st.fwd.concat(st.back).some(function (s) { return s.poor; }); }
  function maxSteps() { return st.puzzle ? st.puzzle.maxSteps : 99; }
  function say(t) { var n = $('#srLive'); if (n) n.textContent = t; }
  function shortest() {
    if (!st.puzzle || st.puzzle.impossible) return null;
    var r = E.routes(st.puzzle.start, st.puzzle.target, Object.assign({ maxSteps: st.puzzle.maxSteps }, opts()));
    return r.length ? r[0].length : null;
  }
  var routeCount = {};
  function totalRoutes() {
    var p = st.puzzle, key = p.id + '|' + st.enrich + '|' + st.level;
    if (routeCount[key] === undefined) routeCount[key] = E.routes(p.start, p.target, Object.assign({ maxSteps: p.maxSteps }, opts())).length;
    return routeCount[key];
  }

  /* ---------- Structures at the right size ---------- */
  function presenting() { return document.body.classList.contains('presenting'); }
  function unit(id) {
    var m = D.MOLS[id];
    if (st.style === 'structural' || !m.smiles) return 38;
    var b = S.layout(id, st.style).box, wu = b.maxx - b.minx + 0.7;
    if (presenting() && window.SST_PRESENT) { var want = SST_PRESENT.px('--sst-pr-label') / 0.44, avail = Math.max(260, ($('#pathway') || document.body).clientWidth - 40); return Math.max(want, Math.min(want * 1.25, avail / wu)); }
    return Math.max(20, Math.min(42, 330 / wu));
  }
  function struct(id, size) { return S.svg(id, st.style, { size: size || unit(id) }); }
  function badgeA(id) { return st.level === 'gcse' && D.MOLS[id].level === 'alevel' ? '<span class="badge a" title="Met at A-level">A-level</span>' : ''; }

  /* ---------- Rendering: pathway ---------- */
  function molCard(id, role) {
    var m = D.MOLS[id], alt = '';
    if (m.groups.some(function (g) { return g === 'amine1' || g === 'amine2'; }) && m.alt.length && st.level === 'alevel') alt = '<small>(' + esc(m.alt[0]) + ')</small>';
    var cls = 'pw-mol' + (role === 'start' ? ' start' : '') + (role === 'target' ? ' target' : '') + (role === 'end' ? ' end' : '');
    var tag = role === 'start' ? 'Start' : role === 'target' ? 'Target' : role === 'end' ? 'You are here' : '';
    return '<div class="' + cls + '" role="listitem" data-mol="' + id + '">' + (tag ? '<span class="tag">' + tag + '</span>' : '') +
      '<div class="mol-struct">' + struct(id) + '</div><div class="mol-name">' + esc(nm(id)) + alt + '</div>' +
      '<div class="mol-meta">' + E.fmt(D.MOLS[id].formula) + ' · M<sub>r</sub> ' + E.mr(id).toFixed(1) + '</div>' +
      '<div class="mol-badges">' + badgeA(id) + '</div></div>';
  }
  var ARROW = '<svg class="arr" viewBox="0 0 120 22" preserveAspectRatio="xMidYMid meet" aria-hidden="true"><line x1="2" y1="11" x2="108" y2="11" stroke="currentColor" stroke-width="2.6" stroke-linecap="round"/><path d="M100 3.5 L113 11 L100 18.5" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"/></svg>';
  function stepHtml(chain, i, s) {
    var o = s.outcome, on = st.shown && st.shown.chain === chain && st.shown.i === i;
    var b = '';
    if (o.rule && D.RULES.filter(function (r) { return r.id === o.rule; })[0].level === 'enrich') b += '<span class="badge e">Beyond AQA</span>';
    if (o.racemic) b += '<span class="badge r">racemic</span>';
    if (o.lowYield) b += '<span class="badge m">low yield</span>';
    if (s.poor) b += '<span class="badge m">minor product</span>';
    var last = chain === 'f' ? i === st.fwd.length - 1 : i === st.back.length - 1;
    return '<div class="pw-step" role="listitem"><button type="button" class="step-btn' + (on ? ' on' : '') + (s.poor ? ' poor' : '') + (chain === 'b' ? ' back' : '') + '" data-act="show" data-chain="' + chain + '" data-i="' + i + '" aria-label="Step ' + (i + 1) + ': ' + esc(E.cardLabel(o.card, st.level)) + ', ' + esc(E.profileText(o.card, o.profile)) + '. Show the explanation.">' +
      '<span class="reagent">' + esc(E.cardLabel(o.card, st.level)) + '</span>' + ARROW + '<span class="cond">' + esc(E.profileText(o.card, o.profile)) + '</span></button>' +
      (b ? '<div class="step-badges">' + b + '</div>' : '') +
      (last ? '<button type="button" class="undo sst-teacher" data-act="undo" data-chain="' + chain + '" data-i="' + i + '" title="Undo this step">Undo</button>' : '') + '</div>';
  }
  function renderPathway() {
    var h = '', pm = merged(), end = fwdEnd(), t = target();
    h += molCard(st.start, 'start');
    st.fwd.forEach(function (s, i) {
      h += stepHtml('f', i, s);
      var isEnd = i === st.fwd.length - 1;
      h += molCard(s.pick, isEnd ? (pm && !st.back.length ? 'target' : 'end') : '');
    });
    if (!isFree()) {
      if (!st.fwd.length && st.start === t) { /* start is the target: nothing to draw */ }
      if (!pm) {
        var left = st.back.length ? st.back.length : 0;
        h += '<div class="pw-gap" role="listitem"><div class="dash"></div><span><b>' + (st.puzzle.maxSteps - steps() > 0 ? st.puzzle.maxSteps - steps() : 0) + '</b> step' + (st.puzzle.maxSteps - steps() === 1 ? '' : 's') + ' to spare</span></div>';
        for (var j = st.back.length - 1; j >= 0; j--) { h += molCard(st.back[j].from, j === st.back.length - 1 ? 'end' : ''); h += stepHtml('b', j, st.back[j]); }
        h += molCard(t, 'target');
      } else if (st.back.length) {
        for (var k = st.back.length - 1; k >= 0; k--) { h += stepHtml('b', k, st.back[k]); h += molCard(k === 0 ? t : st.back[k - 1].from, k === 0 ? 'target' : ''); }
      } else if (!st.fwd.length) h += molCard(t, 'target');
    }
    $('#pathway').innerHTML = h;
    // The molecule where the forward chain stops is highlighted only when it isn't also the start.
    if (!st.fwd.length) { var f = $('.pw-mol.start'); if (f) f.classList.add('end'); }
    // On the board the pathway can be taller than the stage: keep the molecule being worked on in view.
    if (presenting()) { var cur = $('#pathway .pw-mol.end') || $('#pathway .pw-mol.target'); if (cur && cur.scrollIntoView) cur.scrollIntoView({ block: 'nearest', inline: 'nearest' }); }
  }
  function renderIntro() {
    var p = st.puzzle;
    if (!p) { $('#puzzleIntro').innerHTML = '<b>Free explore.</b> Choose a molecule, then try reagents one step at a time. Wrong choices are explained and never join the pathway.'; return; }
    var lim = p.impossible ? 'Is there a route? Try, then explain why not.' : 'Reach the target in at most <b>' + p.maxSteps + '</b> step' + (p.maxSteps === 1 ? '' : 's') + '.';
    $('#puzzleIntro').innerHTML = '<b>' + esc(nm(p.start)) + ' → ' + esc(nm(p.target)) + '.</b> ' + esc(p.intro) + '<span class="goal">' + lim + (isFree() ? '' : ' Any valid route counts.') + '</span>';
  }
  function renderTried() {
    var tr = $('#tried'), list = st.tried;
    if (!list.length) { tr.innerHTML = ''; return; }
    tr.innerHTML = '<span>Tried from ' + esc(nm(st.mode === 'back' ? backFront() : fwdEnd())) + ':</span>' + list.map(function (t) {
      var k = t.status === 'none' || t.status === 'wrongProduct' ? 'none' : 'warn';
      return '<button type="button" class="tr ' + k + '" data-act="tried" data-i="' + list.indexOf(t) + '" style="font:inherit;color:inherit;cursor:pointer">' + esc(t.label) + '</button>';
    }).join('');
  }
  function renderBoardMsg() {
    var h = '', p = st.puzzle, spare = p ? p.maxSteps - steps() : 99;
    if (p && !p.impossible && merged() && steps() > 0) {
      if (poor()) h += '<p class="status-line warn">You reached the target, but through a minor product. That is a poor route: undo the step marked “minor product” and choose another.</p>';
      else if (steps() > p.maxSteps) h += '<p class="status-line warn">That works, but it uses ' + steps() + ' steps and the limit is ' + p.maxSteps + '. Can you do it in fewer?</p>';
      else h += solvedHtml();
    } else if (p && !p.impossible && spare <= 0 && steps() > 0) {
      h += '<p class="status-line warn">You have used all ' + p.maxSteps + ' steps without reaching the target. Undo a step and try a different route.</p>';
    }
    if (p && p.impossible) {
      h += '<div class="hint-box"><p><b>Is it possible?</b> The engine has searched every route of up to ' + p.maxSteps + ' steps from ' + esc(nm(p.start)) + ' to ' + esc(nm(p.target)) + ': ' + (E.routes(p.start, p.target, Object.assign({ maxSteps: p.maxSteps }, opts())).length ? 'it found one.' : 'there is none.') + '</p>' +
        (st.revealed ? '<p>' + esc(p.why) + '</p>' : '<p><button type="button" class="btn sm" data-act="reveal">Show the explanation</button></p>') + '</div>';
    }
    if (st.hintText) h += '<div class="hint-box" role="note"><p><b>Hint ' + st.hintTier + ' of 4.</b> ' + esc(st.hintText) + '</p></div>';
    $('#boardMsg').innerHTML = h;
  }
  function routeKey() { return st.fwd.map(function (s) { return s.card + '/' + s.profile + '>' + s.pick; }).concat(st.back.slice().reverse().map(function (s) { return s.card + '/' + s.profile + '>' + s.pick; })).join(' ; '); }
  function routeText(arr) {
    return arr.map(function (s) { return E.cardLabel(s.card, st.level) + ' (' + E.lc1(E.profileText(s.card, s.profile)) + ') → ' + nm(s.pick); }).join(', then ');
  }
  function solvedHtml() {
    var p = st.puzzle, n = steps(), sh = shortest(), total = totalRoutes(), key = routeKey();
    if (!st.found[p.id]) st.found[p.id] = {};
    var fresh = !st.found[p.id][key]; st.found[p.id][key] = true;
    var nFound = Object.keys(st.found[p.id]).length;
    var stars = (n === sh && !st.hints) ? 3 : (st.hints <= 2 ? 2 : 1);
    if (fresh) {
      var prev = solvedStore[p.id];
      if (!prev || stars > prev.stars) solvedStore[p.id] = { stars: stars, steps: n };
      saveSolved(); buildPuzzleSelect(true); say('Solved in ' + n + ' steps.');
    }
    var all = st.fwd.concat(st.back.slice().reverse());
    return '<div class="solved" role="status"><h2>Solved in ' + n + ' step' + (n === 1 ? '' : 's') + ' ' + '★'.repeat(stars) + '☆'.repeat(3 - stars) + '</h2>' +
      '<p>' + esc(routeText(all)) + '.</p>' +
      '<p>' + (sh && n > sh ? 'A shorter route exists: ' + sh + ' step' + (sh === 1 ? '' : 's') + '. ' : (n === sh ? 'That is the shortest possible route. ' : '')) + 'Routes you have found: <b>' + nFound + '</b> of <b>' + total + '</b>' + (total > 1 ? '. Every valid route counts: can you find another?' : '.') + '</p>' +
      '<div class="row sst-teacher"><button type="button" class="btn sm" data-act="again">Try another route</button>' + nextPuzzle() + '</div></div>';
  }
  function nextPuzzle() {
    var list = puzzles(), i = list.indexOf(st.puzzle);
    return i >= 0 && i < list.length - 1 ? '<button type="button" class="btn sm primary" data-act="next">Next puzzle</button>' : '';
  }

  /* ---------- Rendering: shelf (the reagent cards) ---------- */
  function renderShelf() {
    var cards = E.cards(st.level, opts()), h = '<div class="shelf-head"><h2>Reagent shelf</h2><span>Pick a reagent, then choose its conditions under Next step.</span></div><div class="groups">';
    D.CARD_GROUPS.forEach(function (g) {
      var list = cards.filter(function (c) { return c.group === g; });
      if (!list.length) return;
      h += '<div class="cardgroup' + (g === 'Tests' ? ' tests' : '') + '"><h3>' + g + '</h3><div class="cards">' + list.map(function (c) {
        return '<button type="button" class="rcard' + (c.kind === 'test' ? ' test' : '') + '" data-act="card" data-card="' + c.id + '" data-key="card-' + c.id + '" aria-pressed="' + (st.card === c.id) + '">' + esc(c.label) + (c.enrich ? '<span class="badge e">Beyond AQA</span>' : '') + (c.hazard ? '<span class="badge m">hazard</span>' : '') + '</button>';
      }).join('') + '</div></div>';
    });
    $('#shelf').innerHTML = h + '</div>';
  }

  /* ---------- Rendering: the next-step panel ----------
     Everything about the step being built sits together: direction, the molecule
     it starts from (or, backwards, the molecule that would make the target), the
     reagent, its conditions, the React button and any choice of product. */
  function renderComposer() {
    var cards = E.cards(st.level, opts()), back = st.mode === 'back' && !isFree(), h = '';
    var c = st.card && cards.filter(function (x) { return x.id === st.card; })[0];
    var counted = st.puzzle && !st.puzzle.impossible;
    h += '<div class="cmp-head"><h2>Next step</h2>' + (counted ? '<span class="cmp-count">' + steps() + ' of ' + maxSteps() + ' step' + (maxSteps() === 1 ? '' : 's') + ' used</span>' : '') + '</div>';
    if (!isFree() && !st.pending && !(merged() && steps() > 0)) h += '<div class="seg modes" role="tablist" aria-label="Direction"><button type="button" role="tab" data-act="mode" data-mode="fwd" aria-selected="' + (st.mode === 'fwd') + '">Forwards from ' + esc(nm(fwdEnd())) + '</button><button type="button" role="tab" data-act="mode" data-mode="back" aria-selected="' + (st.mode === 'back') + '">Backwards to ' + esc(nm(backFront())) + '</button></div>';
    if (st.pending) {
      // Several products form: the student chooses here, where they pressed React.
      h += '<div class="choice"><p>Several products form. Which one do you want to carry on with?</p><div class="row">' + st.pending.o.products.map(function (p) {
        return '<button type="button" class="btn sm" data-act="pick" data-id="' + p.id + '">' + esc(nm(p.id)) + (p.role === 'minor' ? ' (minor)' : '') + '</button>';
      }).join('') + '</div></div>';
      $('#composer').innerHTML = h; return;
    }
    if (!isFree() && merged() && steps() > 0) {
      $('#composer').innerHTML = h + '<p class="cmp-note">The pathway is joined up. Undo a step, or press “Try another route”, to look for a different one.</p>'; return;
    }
    h += '<ol class="cmp-steps">';
    if (back) {
      h += '<li class="' + (st.pre ? 'done' : 'now') + '"><span class="cmp-k">Which molecule would make ' + esc(nm(backFront())) + '?</span>' + (st.pre ? '<b class="cmp-pre">' + esc(nm(st.pre)) + '</b>' : '') +
        '<input type="text" id="preSearch" placeholder="Search molecules" value="' + esc(st.search) + '" aria-label="Search molecules" autocomplete="off"><div class="precursor-list" id="preList">' + preList() + '</div></li>';
    } else {
      h += '<li class="done start"><span class="cmp-k">Starting from</span><b>' + esc(nm(fwdEnd())) + '</b></li>';
    }
    h += '<li class="' + (c ? 'done' : 'now') + '"><span class="cmp-k">Reagent</span>' + (c ? '<b>' + esc(c.label) + '</b>' : '<span class="cmp-wait">Choose one from the shelf</span>') + '</li>';
    h += '<li class="' + (!c ? 'later' : st.profile ? 'done' : 'now') + '"><span class="cmp-k">Conditions</span>';
    if (c) {
      h += '<div class="profiles" role="radiogroup" aria-label="Conditions">' + c.profiles.map(function (p) {
        return '<label class="prof"><input type="radio" name="prof" value="' + p.id + '" data-key="prof-' + p.id + '"' + (st.profile === p.id ? ' checked' : '') + '><span>' + esc(p.text) + '</span></label>';
      }).join('') + '</div>';
      if (c.partner) h += '<p class="partner">The ' + esc(nm(c.partner)) + ' comes from the shelf, not from your pathway.</p>';
      if (c.hazard) h += '<p class="warn-note">Hazard: potassium cyanide is highly toxic. This is a simulation: the real reaction is done only in a controlled laboratory.</p>';
    } else h += '<span class="cmp-wait">After the reagent</span>';
    h += '</li></ol>';
    var can = canGo();
    h += '<div class="go">' + (back
      ? '<button type="button" class="btn primary" data-act="go" id="goBtn"' + (can ? '' : ' disabled') + '>Make ' + esc(nm(backFront())) + (st.pre ? ' from ' + esc(nm(st.pre)) : '') + '</button>'
      : '<button type="button" class="btn primary" data-act="go" id="goBtn"' + (can ? '' : ' disabled') + '>React ' + esc(nm(fwdEnd())) + '</button>') + '</div>';
    if (!isFree() && steps() >= maxSteps() && !merged()) h += '<p class="partner">You have used every step. Undo one to try another.</p>';
    $('#composer').innerHTML = h;
    var list = $('#preList'), sel = list && $('#preList [aria-pressed="true"]');
    if (sel) list.scrollTop = Math.max(0, sel.offsetTop - 40);   // keep the chosen molecule in view in the list
  }
  function canGo() {
    if (!st.card || !st.profile || st.pending) return false;
    if (!isFree() && steps() >= maxSteps()) return false;
    if (!isFree() && merged()) return false;
    if (st.mode === 'back' && !isFree() && !st.pre) return false;
    return true;
  }
  function preList() {
    var q = st.search.trim().toLowerCase(), front = backFront();
    var list = E.startables(st.level).filter(function (id) { return id !== front; }).filter(function (id) {
      if (!q) return true;
      var m = D.MOLS[id];
      return (E.name(id, st.level) + ' ' + m.name + ' ' + m.alt.join(' ') + ' ' + m.formula + ' ' + m.cf).toLowerCase().indexOf(q) >= 0;
    });
    if (!list.length) return '<p class="partner" style="padding:8px">No molecule matches.</p>';
    return list.map(function (id) { return '<button type="button" data-act="pre" data-mol="' + id + '" data-key="pre-' + id + '" aria-pressed="' + (st.pre === id) + '">' + esc(nm(id)) + ' <small>' + E.fmt(D.MOLS[id].formula) + '</small></button>'; }).join('');
  }

  /* ---------- Rendering: explanation ---------- */
  var STATUS = {
    ok: ['s-ok', 'This works.'], mixture: ['s-warn', 'This gives a mixture.'], none: ['s-bad', 'No reaction.'], wrongConditions: ['s-warn', 'Right reagent, wrong conditions.'],
    beyond: ['s-info', 'Not covered by this tool.'], notOffered: ['s-info', 'Not on this shelf.'], observation: ['s-info', 'What you would see.'], wrongProduct: ['s-bad', 'That does not make the molecule you need.']
  };
  function specFor(o) {
    if (!o.spec) return '';
    if (/Beyond/.test(o.spec)) return 'Beyond the AQA specification';
    var parts = o.spec.split(' · ').filter(function (x) { return st.level === 'gcse' ? /^4\./.test(x) : /^3\./.test(x); });
    return parts.length ? 'AQA ' + (st.level === 'gcse' ? 'GCSE ' : 'A-level ') + parts.join(', ') : '';
  }
  function roleWord(r) { return r === 'major' ? 'major' : r === 'minor' ? 'minor' : r === 'equal' ? 'equal' : ''; }
  function explainHtml() {
    var sh = st.shown;
    if (!sh) return '<h3>Explanation</h3><p class="ex-empty">Choose a reagent and conditions on the shelf, then press React. Why a step works or fails is explained here.</p>';
    var o = sh.o, h = '', stt = STATUS[o.status] || STATUS.none, subj = D.MOLS[o.mol] ? nm(o.mol) : '';
    var cond = o.card && D.CARDS[o.card] ? E.profileText(o.card, o.profile) : '';
    h += '<h3>' + esc(subj) + ' + ' + esc(E.cardLabel(o.card, st.level)) + '</h3>' + (cond ? '<p class="ex-cond">Conditions: ' + esc(cond) + '</p>' : '');
    var verdict = stt[1];
    if (o.status === 'ok' && o.products.length) verdict += ' It makes ' + o.products.filter(function (p) { return p.role !== 'minor'; }).map(function (p) { return nm(p.id); }).join(' and ') + '.';
    h += '<p class="status ' + stt[0] + '">' + esc(verdict) + '</p>';
    if (o.equation) h += '<p class="eq">' + esc(o.equation) + '</p>';
    if (o.status === 'ok') {
      h += '<div class="prods">' + o.products.map(function (p) { return '<div class="prod">' + struct(p.id, 26) + '<div class="pn">' + esc(nm(p.id)) + '</div>' + (roleWord(p.role) && o.products.length > 1 ? '<span class="badge ' + (p.role === 'minor' ? 'm' : 'g') + '">' + roleWord(p.role) + '</span> ' : '') + badgeA(p.id) + '</div>'; }).join('') + '</div>';
      var min = o.products.filter(function (p) { return p.role === 'minor'; });
      if (min.length) h += '<p>Minor product' + (min.length > 1 ? 's' : '') + ': ' + min.map(function (p) { return esc(nm(p.id)); }).join(', ') + '.</p>';
      if (o.type) h += '<p class="ex-cond">Reaction type: ' + esc(o.type) + (specFor(o) ? ' · ' + esc(specFor(o)) : '') + (o.reversible ? ' · reversible' : '') + '</p>';
    }
    if (o.status === 'ok' && sh.chain === 'f') {
      var s0 = st.fwd[sh.i], min2 = s0 ? o.products.filter(function (p) { return p.role === 'minor'; }) : [];
      if (min2.length && sh.i === st.fwd.length - 1 && !s0.poor) {
        h += '<div class="choice minor-choice sst-teacher"><p>Choosing a minor product is allowed, but it makes a poor route.</p><div class="row">' + min2.map(function (p) { return '<button type="button" class="btn sm" data-act="minor" data-id="' + p.id + '">Carry on from ' + esc(nm(p.id)) + ' (minor)</button>'; }).join('') + '</div></div>';
      }
    }
    if (sh.chain && sh.i < (sh.chain === 'f' ? st.fwd : st.back).length - 1) {
      h += '<p class="ex-undo sst-teacher"><button type="button" class="btn sm" data-act="undo" data-chain="' + sh.chain + '" data-i="' + sh.i + '">Undo this step and the ones after it</button></p>';
    }
    if (o.status === 'mixture' && o.mixtureOf && o.mixtureOf.length) h += '<p>The mixture contains: ' + o.mixtureOf.map(esc).join('; ') + '.</p>';
    h += '<p>' + esc(o.explain) + '</p>';
    if (o.observe && o.status === 'ok') h += '<p><b>You would see:</b> ' + esc(o.observe) + '</p>';
    if (o.notes && o.notes.length) h += '<ul>' + o.notes.map(function (n) { return '<li>' + esc(n) + '</li>'; }).join('') + '</ul>';
    if (o.mech) h += mechHtml(o);
    return h;
  }
  function mechHtml(o) {
    var m = o.mech, h = '<div class="mechbox"><h3>Mechanism: ' + esc(m.name) + '</h3>';
    h += '<p><b>Attacking species:</b> ' + esc(m.who) + '</p><p><b>Key intermediate:</b> ' + esc(m.inter) + '</p>';
    h += '<p>' + (m.outline ? 'AQA asks you to outline this mechanism.' : 'AQA does not ask you to draw this mechanism with curly arrows.') + '</p>';
    if (m.note) h += '<p>' + esc(m.note) + '</p>';
    if (m.steps) h += '<ol>' + m.steps.map(function (x) { return '<li>' + esc(x) + '</li>'; }).join('') + '</ol>';
    if (m.scene) h += '<p><a href="../organic-reaction-mechanisms/#mech=' + m.scene + '" target="_blank" rel="noopener">See the curly arrows</a>' + (m.exact ? '' : ' (shown for ' + esc(m.example) + (m.steps ? ', the nearest scene' : '') + ')') + '</p>';
    return h + '</div>';
  }
  function renderExplain() { $('#explain').innerHTML = explainHtml(); }

  /* ---------- Puzzle menu ---------- */
  function puzzles() { return C.list.filter(function (c) { return st.level === 'gcse' ? c.level === 'gcse' : true; }); }
  function buildPuzzleSelect(keep) {
    var sel = $('#puzzleSel'), cur = st.puzzle ? st.puzzle.id : 'free', h = '<option value="free">Free explore</option>';
    function grp(label, list) {
      if (!list.length) return '';
      return '<optgroup label="' + label + '">' + list.map(function (c) {
        var done = solvedStore[c.id];
        return '<option value="' + c.id + '">' + (done ? '✓ ' : '') + c.id + ': ' + esc(nm0(c.start) + ' → ' + nm0(c.target)) + (c.impossible ? ' (can it be done?)' : '') + '</option>';
      }).join('') + '</optgroup>';
    }
    var list = puzzles();
    h += grp('GCSE', list.filter(function (c) { return c.level === 'gcse'; })) + grp('A-level', list.filter(function (c) { return c.level === 'alevel' && !c.enrich; })) + grp('Beyond AQA', list.filter(function (c) { return c.enrich; }));
    sel.innerHTML = h; sel.value = cur;
  }
  function nm0(id) { return E.name(id, st.level === 'gcse' ? 'gcse' : 'alevel'); }
  function buildStartSelect() {
    var h = E.startables(st.level).map(function (id) { return '<option value="' + id + '">' + esc(nm(id)) + ' (' + E.fmt(D.MOLS[id].formula) + ')</option>'; }).join('');
    $('#startSel').innerHTML = h; $('#startSel').value = st.start;
  }

  /* ---------- State changes ---------- */
  function render() {
    $('#startField').hidden = !isFree();
    $('#puzzleSel').value = st.puzzle ? st.puzzle.id : 'free';
    $$('#levelSeg button').forEach(function (b) { b.setAttribute('aria-selected', String(b.dataset.level === st.level)); });
    $$('#styleSeg button').forEach(function (b) { b.setAttribute('aria-pressed', String(b.dataset.style === st.style)); });
    $('#enrichWrap').hidden = st.level !== 'alevel'; $('#enrich').checked = st.enrich;
    $('#btnHint').disabled = isFree() || (st.puzzle && st.puzzle.impossible) || merged();
    renderIntro(); renderPathway(); renderTried(); renderBoardMsg(); renderShelf(); renderComposer(); renderExplain();
  }
  function renderKeep() {
    var a = document.activeElement, key = a && a.getAttribute && a.getAttribute('data-key'), pos = a && a.id === 'preSearch' ? a.selectionStart : null;
    render();
    if (key) { var n = $('[data-key="' + key + '"]'); if (n) n.focus({ preventScroll: true }); }
  }
  function resetChain() {
    st.fwd = []; st.back = []; st.card = null; st.profile = null; st.pre = null; st.pending = null; st.shown = null; st.tried = [];
    st.hintTier = 0; st.hintText = ''; st.failed = 0; st.hints = 0; st.revealed = false; st.mode = 'fwd';
  }
  function load(id) {
    var p = id === 'free' ? null : C.byId(id);
    if (p && p.level === 'alevel' && st.level === 'gcse') { st.level = 'alevel'; st.style = 'skeletal'; }
    if (p && p.enrich) st.enrich = true;
    st.puzzle = p; if (p) st.start = p.start;
    else if (E.startables(st.level).indexOf(st.start) < 0) st.start = E.startables(st.level)[0];
    resetChain(); buildPuzzleSelect(); buildStartSelect(); render();
    try { history.replaceState(null, '', p ? '#' + p.id : location.pathname + location.search); } catch (e) { /* file:// */ }
  }
  function setLevel(l) {
    if (l === st.level) return;
    st.level = l; st.style = l === 'gcse' ? 'displayed' : 'skeletal'; if (l === 'gcse') st.enrich = false;
    var first = C.list.filter(function (c) { return l === 'gcse' ? c.level === 'gcse' : c.level === 'alevel' && !c.enrich; })[0];
    st.puzzle = first; st.start = first.start;
    resetChain(); buildPuzzleSelect(); buildStartSelect(); render();
  }
  function revalidate() {
    for (var i = 0; i < st.fwd.length; i++) { var s = st.fwd[i], o = E.react(i ? st.fwd[i - 1].pick : st.start, s.card, s.profile, opts()); if (o.status !== 'ok' || !o.products.some(function (p) { return p.id === s.pick; })) { st.fwd.length = i; break; } s.outcome = o; }
    for (var j = 0; j < st.back.length; j++) { var b = st.back[j], front = j ? st.back[j - 1].from : target(), ob = E.react(b.from, b.card, b.profile, opts()); if (ob.status !== 'ok' || !ob.products.some(function (p) { return p.id === front; })) { st.back.length = j; break; } b.outcome = ob; }
  }

  function selectedLabel() { return E.cardLabel(st.card, st.level) + ' (' + E.lc1(E.profileText(st.card, st.profile)) + ')'; }
  function addTried(o, label, from) {
    var key = o.card + '/' + o.profile + '/' + from;
    if (st.tried.some(function (t) { return t.key === key; })) return;
    st.tried.push({ key: key, label: label, status: o.status, o: o });
  }
  function goForward() {
    var from = fwdEnd(), o = E.react(from, st.card, st.profile, opts());
    if (o.status !== 'ok') {
      st.failed++; st.shown = { o: o }; addTried(o, E.cardLabel(st.card, st.level) + ' (' + E.lc1(E.profileText(st.card, st.profile)) + ')', from);
      say(STATUS[o.status][1] + ' ' + o.explain); renderKeep(); return;
    }
    var good = o.products.filter(function (p) { return p.role === 'major' || p.role === 'equal'; });
    if (good.length > 1 || (good.length === 1 && good[0].role === 'equal' && o.products.length > 1)) {
      st.pending = { o: o, from: from }; st.shown = { o: o, pending: true }; say('Several products form. Choose which to carry on with.'); renderKeep(); return;
    }
    pushForward(o, good[0].id);
  }
  function pushForward(o, pick) {
    var role = o.products.filter(function (p) { return p.id === pick; })[0].role;
    st.fwd.push({ card: o.card, profile: o.profile, pick: pick, outcome: o, poor: role === 'minor' });
    st.pending = null; st.card = null; st.profile = null; st.tried = []; st.hintText = ''; st.hintTier = 0;
    st.shown = { o: o, chain: 'f', i: st.fwd.length - 1 };
    say('Step added: ' + o.products.map(function (p) { return nm(p.id); }).join(', ')); renderKeep();
  }
  function goBackward() {
    var front = backFront(), pre = st.pre, o = E.react(pre, st.card, st.profile, opts()), lab = nm(pre) + ' + ' + E.cardLabel(st.card, st.level);
    if (o.status !== 'ok') { st.failed++; st.shown = { o: o }; addTried(o, lab, front); say(STATUS[o.status][1] + ' ' + o.explain); renderKeep(); return; }
    var p = o.products.filter(function (x) { return x.id === front; })[0];
    if (!p) {
      var wrong = Object.assign({}, o, { status: 'wrongProduct', explain: nm(pre) + ' + ' + E.cardLabel(st.card, st.level) + ' under these conditions makes ' + o.products.map(function (x) { return nm(x.id); }).join(' and ') + ', not ' + nm(front) + '. Try a different molecule, reagent or conditions.' });
      st.failed++; st.shown = { o: wrong }; addTried(wrong, lab, front); say(wrong.explain); renderKeep(); return;
    }
    st.back.push({ from: pre, card: o.card, profile: o.profile, pick: front, outcome: o, poor: p.role === 'minor' });
    st.card = null; st.profile = null; st.pre = null; st.search = ''; st.tried = []; st.hintText = ''; st.hintTier = 0;
    st.shown = { o: o, chain: 'b', i: st.back.length - 1 };
    say('Step added backwards: ' + nm(pre)); renderKeep();
  }
  function undo(chain, i) {
    if (chain === 'f') st.fwd.length = i; else st.back.length = i;
    st.pending = null; st.shown = null; st.tried = []; st.hintText = ''; st.hintTier = 0; st.card = null; st.profile = null; st.pre = null;
    say('Step undone.'); renderKeep();
  }
  function hint() {
    if (isFree() || merged()) return;
    st.hintTier = Math.min(4, st.hintTier + 1); st.hints++;
    // Only suggest a route that fits in the steps left, so a hint never leads past the limit.
    var left = Math.min(4, maxSteps() - steps());
    var h = left > 0 ? E.hint(fwdEnd(), backFront(), Object.assign({ maxSteps: left }, opts()), st.hintTier) : { text: 'You have used every step. Undo one and try a different route.' };
    st.hintText = h.text; renderBoardMsg(); say(h.text);
  }

  /* ---------- Events ---------- */
  function onClick(e) {
    var t = e.target.closest('[data-act]'); if (!t) return;
    var act = t.dataset.act;
    if (act === 'card') { st.card = t.dataset.card === st.card ? null : t.dataset.card; var c = st.card && E.cards(st.level, opts()).filter(function (x) { return x.id === st.card; })[0]; st.profile = c && c.profiles.length === 1 ? c.profiles[0].id : null; renderShelf(); renderComposer(); keepKey('card-' + t.dataset.card); showComposer(); }
    else if (act === 'go') { if (st.mode === 'back' && !isFree()) goBackward(); else goForward(); }
    else if (act === 'show') { var ch = t.dataset.chain, i = +t.dataset.i, s = (ch === 'f' ? st.fwd : st.back)[i]; st.shown = { o: s.outcome, chain: ch, i: i }; st.pending = null; renderPathway(); renderExplain(); }
    else if (act === 'undo') undo(t.dataset.chain, +t.dataset.i);
    else if (act === 'pick') { var pe = st.pending; if (pe) pushForward(pe.o, t.dataset.id); }
    else if (act === 'minor') { var sh = st.shown, step = st.fwd[sh.i]; step.pick = t.dataset.id; step.poor = true; renderKeep(); }
    else if (act === 'mode') { st.mode = t.dataset.mode; st.card = null; st.profile = null; st.pre = null; st.pending = null; st.tried = []; renderKeep(); }
    else if (act === 'pre') { st.pre = t.dataset.mol; renderComposer(); keepKey('pre-' + t.dataset.mol); }
    else if (act === 'tried') { var tr = st.tried[+t.dataset.i]; if (tr) { st.shown = { o: tr.o }; renderExplain(); } }
    else if (act === 'again') { var p0 = st.puzzle; var found = st.found; resetChain(); st.found = found; render(); }
    else if (act === 'next') { var list = puzzles(), idx = list.indexOf(st.puzzle); if (idx >= 0 && idx < list.length - 1) load(list[idx + 1].id); }
    else if (act === 'reveal') { st.revealed = true; if (st.puzzle) { solvedStore[st.puzzle.id] = { stars: 1, steps: 0 }; saveSolved(); buildPuzzleSelect(); $('#puzzleSel').value = st.puzzle.id; } renderBoardMsg(); }
  }
  // On a narrow screen the panel sits below the shelf: bring it into view when a reagent is picked.
  function showComposer() { var c = $('#composer'); if (c && window.matchMedia && matchMedia('(max-width: 899px)').matches && !presenting() && c.scrollIntoView) c.scrollIntoView({ block: 'nearest' }); }
  function keepKey(k) { var n = $('[data-key="' + k + '"]'); if (n) n.focus({ preventScroll: true }); }
  function onChange(e) {
    var t = e.target;
    if (t.name === 'prof') { st.profile = t.value; renderComposer(); keepKey('prof-' + t.value); }
  }

  /* ---------- Printing ---------- */
  function fillDocs() {
    [['gcse', 'ws', '#wsGcse'], ['gcse', 'ms', '#msGcse'], ['alevel', 'ws', '#wsAlevel'], ['alevel', 'ms', '#msAlevel']].forEach(function (d) { $(d[2]).innerHTML = K.render(d[0], d[1], E, S); });
  }
  function openPrint() {
    $$('#printDlg input[name="pLevel"]').forEach(function (r) { r.checked = r.value === st.level; });
    $('#pWs').checked = true; $('#pMs').checked = false;
    if (window.SST_PRESENTER) SST_PRESENTER.toggle(false);
    $('#printDlg').returnValue = '';   // Esc keeps the old value: never let it mean "print"
    $('#printDlg').showModal();
  }
  function doPrint() {
    var b = document.body, level = ($('#printDlg input[name="pLevel"]:checked') || {}).value || 'gcse', cls = ['print-custom'];
    if ($('#pWs').checked) cls.push('p-ws-' + level);
    if ($('#pMs').checked) cls.push('p-ms-' + level);
    if (cls.length === 1) return;
    cls.forEach(function (c) { b.classList.add(c); });
    var title = document.title;
    document.title = 'Organic synthesis: ' + (level === 'gcse' ? 'GCSE' : 'A-level');
    function done() { document.title = title; cls.forEach(function (c) { b.classList.remove(c); }); window.removeEventListener('afterprint', done); }
    window.addEventListener('afterprint', done);
    setTimeout(function () { window.print(); }, 60);
  }

  /* ---------- Start ---------- */
  function init() {
    fillDocs();
    document.addEventListener('click', onClick);
    document.addEventListener('change', onChange);
    $('#composer').addEventListener('input', function (e) { if (e.target.id === 'preSearch') { st.search = e.target.value; $('#preList').innerHTML = preList(); } });
    $('#levelSeg').addEventListener('click', function (e) { var b = e.target.closest('button'); if (b) setLevel(b.dataset.level); });
    $('#levelSeg').addEventListener('keydown', function (e) {
      if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') return;
      e.preventDefault(); setLevel(st.level === 'gcse' ? 'alevel' : 'gcse'); $('#levelSeg [aria-selected="true"]').focus();
    });
    $('#styleSeg').addEventListener('click', function (e) { var b = e.target.closest('button'); if (b) { st.style = b.dataset.style; render(); } });
    $('#puzzleSel').addEventListener('change', function (e) { load(e.target.value); });
    $('#startSel').addEventListener('change', function (e) { st.start = e.target.value; resetChain(); render(); });
    $('#enrich').addEventListener('change', function (e) { st.enrich = e.target.checked; revalidate(); st.card = null; st.profile = null; st.shown = null; render(); });
    $('#btnHint').addEventListener('click', hint);
    $('#btnReset').addEventListener('click', function () { var f = st.found; resetChain(); st.found = f; render(); say('Pathway cleared.'); });
    $('#btnPresent').addEventListener('click', function () { if (window.SST_PRESENTER) SST_PRESENTER.toggle(); });
    $('#btnPrint').addEventListener('click', openPrint);
    $('#printDlg').addEventListener('close', function () { if ($('#printDlg').returnValue === 'print') doPrint(); });
    // Structures redraw at the board sizes when presenter mode opens or closes, and when the board changes size.
    var was = false, t = 0;
    new MutationObserver(function () { var now = presenting(); if (now !== was) { was = now; setTimeout(function () { renderPathway(); renderExplain(); }, 40); } }).observe(document.body, { attributes: true, attributeFilter: ['class'] });
    window.addEventListener('resize', function () { if (!presenting()) return; clearTimeout(t); t = setTimeout(function () { renderPathway(); renderExplain(); }, 120); });
    if (window.SST_PRESENTER) SST_PRESENTER.setup({ stage: '#pathway', side: ['#shelf', '#composer'], notes: '#explain', hide: '#tried, #puzzleIntro' });
    var pr = /[?&]print=([a-z,-]+)/.exec(location.search);
    if (pr) pr[1].split(',').forEach(function (k) { if (/^(ws|ms)-(gcse|alevel)$/.test(k)) document.body.classList.add('print-custom', 'p-' + k); });
    var hash = /^#([ae]\d+|g\d+)$/.exec(location.hash), p = hash && C.byId(hash[1]);
    buildPuzzleSelect(); buildStartSelect();
    if (p) { st.level = p.level === 'gcse' ? 'gcse' : 'alevel'; st.style = st.level === 'gcse' ? 'displayed' : 'skeletal'; }
    load(p ? p.id : 'g1');
  }
  // For the page tests in tests.html. Nothing here is secret: it is all in the page.
  window.SynthPage = {
    st: st, load: load, setLevel: setLevel, render: render,
    choose: function (card, profile) { st.card = card; st.profile = profile; renderShelf(); renderComposer(); },
    react: function () { if (st.mode === 'back' && !isFree()) goBackward(); else goForward(); },
    pick: function (id) { if (st.pending) pushForward(st.pending.o, id); },
    mode: function (m) { st.mode = m; st.card = null; st.profile = null; st.pre = null; renderKeep(); },
    pre: function (id) { st.pre = id; renderComposer(); },
    undo: undo, hint: hint
  };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
})();
