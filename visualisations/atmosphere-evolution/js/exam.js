/* The Evolution of the Earth's Atmosphere: AQA EXAM FOCUS
   Key-term tooltips, phase equations, flip cards with a "hide the answer"
   practice mode, the self-marking quiz (multiple choice plus a drag-to-order
   task) and the theory-vs-evidence card. Content lives in data.js. */
(function () {
  'use strict';
  var AE = window.AE, D = AE.DATA;
  var $ = function (id) { return document.getElementById(id); };
  var icon = function (n) { return '<svg class="i" aria-hidden="true"><use href="#i-' + n + '"/></svg>'; };

  /* ═══════════ GLOSSARY: highlight terms inside any HTML string ═══════════ */
  var termRe = new RegExp('\\b(' + D.GLOSSARY.map(function (g) { return '(?:' + g.match + ')'; }).join('|') + ')\\b', 'gi');
  var own = D.GLOSSARY.map(function (g) { return { id: g.id, re: new RegExp('^(?:' + g.match + ')$', 'i') }; });
  function glossify(html) {
    return String(html).split(/(<[^>]+>)/).map(function (seg) {
      if (seg.charAt(0) === '<') return seg;
      return seg.replace(termRe, function (m) {
        for (var i = 0; i < own.length; i++) if (own[i].re.test(m)) return '<span class="term" tabindex="0" role="button" data-term="' + own[i].id + '">' + m + '</span>';
        return m;
      });
    }).join('');
  }

  /* one shared tooltip: hover, keyboard focus, or tap (tap again or Esc to close) */
  var tip, tipFor = null, pinned = false;
  function gloss(id) { return D.GLOSSARY.filter(function (g) { return g.id === id; })[0]; }
  function showTip(el) {
    var g = gloss(el.dataset.term); if (!g) return;
    tip.innerHTML = '<b>' + g.term + '</b>' + g.def; tip.hidden = false; tipFor = el;
    el.setAttribute('aria-describedby', 'tip');
    var r = el.getBoundingClientRect(), w = tip.offsetWidth, h = tip.offsetHeight;
    var x = Math.min(window.innerWidth - w - 8, Math.max(8, r.left + r.width / 2 - w / 2));
    var y = r.top - h - 8; if (y < 8) y = r.bottom + 8;
    tip.style.left = x + 'px'; tip.style.top = y + 'px';
  }
  function hideTip() { if (tipFor) tipFor.removeAttribute('aria-describedby'); tip.hidden = true; tipFor = null; pinned = false; }
  function setupTips() {
    tip = $('tip');
    var term = function (e) { return e.target.closest && e.target.closest('.term[data-term]'); };
    document.addEventListener('mouseover', function (e) { var t = term(e); if (t && !pinned) showTip(t); });
    document.addEventListener('mouseout', function (e) { var t = term(e); if (t && !pinned) hideTip(); });
    document.addEventListener('focusin', function (e) { var t = term(e); if (t && !pinned) showTip(t); });
    document.addEventListener('focusout', function (e) { if (term(e) && !pinned) hideTip(); });
    document.addEventListener('click', function (e) {
      var t = term(e);
      if (t) { if (pinned && tipFor === t) hideTip(); else { showTip(t); pinned = true; } }
      else if (pinned) hideTip();
    });
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && !tip.hidden) hideTip();
      var t = term(e);
      if (t && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); t.click(); }
    });
    window.addEventListener('scroll', function () { if (!pinned) hideTip(); }, { passive: true });
  }

  /* ═══════════ TERMS ═══════════ */
  function buildTerms() {
    $('termList').innerHTML = D.GLOSSARY.map(function (g) {
      return '<div><dt>' + g.term + '</dt><dd>' + g.def + '</dd></div>';
    }).join('');
  }

  /* ═══════════ EQUATIONS ═══════════ */
  /* an equation card, or a sequence card where the specification describes the change in words */
  function eqCard(e, now) {
    var body = e.steps
      ? '<p class="eq-lab">What happens</p><ol class="eq-steps">' + e.steps.map(function (t) { return '<li>' + glossify(t) + '</li>'; }).join('') + '</ol>'
      : '<p class="eq-lab">Word equation</p><p class="eq-word">' + glossify(e.word) + '</p>' +
        '<p class="eq-lab">Balanced symbol equation</p><p class="eq-sym">' + e.sym + '</p>';
    return '<article class="eq' + (now ? ' now' : '') + '"><h4>' + glossify(e.title) + '</h4>' + body +
      (e.note ? '<p class="eq-note">' + glossify(e.note) + '</p>' : '') + '</article>';
  }
  var eqPhase = -1;
  function setPhase(p) {
    if (p === eqPhase) return; eqPhase = p;
    $('eqPhase').textContent = D.PHASES[p].title.toLowerCase();
    var now = D.EQUATIONS.filter(function (e) { return e.phases.indexOf(p) > -1; });
    $('eqNow').innerHTML = now.length ? now.map(function (e) { return eqCard(e, true); }).join('')
      : '<p class="eq-none">Nothing to write for this phase. Learn the proportions: about four-fifths (80%) nitrogen and about one-fifth (20%) oxygen, with small proportions of carbon dioxide, water vapour and noble gases.</p>';
    $('eqAll').innerHTML = D.EQUATIONS.map(function (e) { return eqCard(e, false); }).join('');
  }

  /* ═══════════ FLIP CARDS + HIDE THE ANSWER ═══════════ */
  function practice() { return $('swHide').checked; }
  function buildCards() {
    var pr = practice();
    $('cardLead').textContent = pr
      ? 'Exam practice: write your answer first, then turn the card over and tick each marking point you included.'
      : 'Select a card to turn it over for the mark-scheme answer. Every marking point is a separate mark.';
    $('cards').innerHTML = D.CARDS.map(function (c, i) {
      var pts = c.points.map(function (p, k) {
        return '<li>' + (pr ? '<label><input type="checkbox" data-card="' + i + '"><span>' + glossify(p) + '</span></label>' : icon('check') + '<span>' + glossify(p) + '</span>') + '</li>';
      }).join('');
      return '<div class="card" data-i="' + i + '">' +
        '<div class="face front"><p class="marks">[' + c.marks + ' marks]</p><h3>' + c.q + '</h3>' +
        (pr ? '<label class="write"><span class="sr-only">Write your answer</span><textarea rows="3" placeholder="Write or say your answer here first…"></textarea></label>' : '') +
        '<button class="btn primary flip" type="button">' + (pr ? 'Show the mark scheme' : 'Turn over for the answer') + '</button></div>' +
        '<div class="face back" aria-hidden="true" inert><p class="marks">Mark scheme [' + c.marks + ' marks]</p><ul class="mp">' + pts + '</ul>' +
        '<p class="tip-line"><b>Examiner tip:</b> ' + glossify(c.tip) + '</p>' +
        (pr ? '<p class="self" role="status">Tick what you included: 0 / ' + c.marks + ' marks</p>' : '') +
        '<button class="btn flip" type="button">Turn back</button></div></div>';
    }).join('');
  }
  function setupCards() {
    $('cards').addEventListener('click', function (e) {
      var b = e.target.closest('.flip'); if (!b) return;
      var card = b.closest('.card'), flipped = card.classList.toggle('flipped');
      var front = card.querySelector('.front'), back = card.querySelector('.back');
      back.setAttribute('aria-hidden', !flipped); front.setAttribute('aria-hidden', flipped);
      back.inert = !flipped; front.inert = flipped;
      (flipped ? back : front).querySelector('.flip').focus({ preventScroll: true });
    });
    $('cards').addEventListener('change', function (e) {
      if (!e.target.matches('input[type=checkbox]')) return;
      var card = e.target.closest('.card'), n = card.querySelectorAll('input:checked').length, tot = D.CARDS[+card.dataset.i].marks;
      card.querySelector('.self').textContent = 'You scored ' + Math.min(n, tot) + ' / ' + tot + ' marks' + (n >= tot ? '. Full marks!' : '.');
    });
    $('swHide').addEventListener('change', buildCards);
    buildCards();
  }

  /* ═══════════ QUIZ ═══════════ */
  var quiz = { res: [], exam: false, done: false };
  function shuffle(a) { a = a.slice(); for (var i = a.length - 1; i > 0; i--) { var j = Math.floor(Math.random() * (i + 1)); var t = a[i]; a[i] = a[j]; a[j] = t; } return a; }

  function buildQuiz() {
    quiz.exam = $('swExam').checked; quiz.done = false;
    quiz.items = D.QUIZ.map(function (q) {
      if (q.type === 'mc') {
        var order = shuffle(q.opts.map(function (_, i) { return i; }));
        return { q: q, order: order, picked: null, marked: false };
      }
      var ord = shuffle(q.items.map(function (_, i) { return i; }));
      while (ord.join() === q.items.map(function (_, i) { return i; }).join()) ord = shuffle(ord);
      return { q: q, order: ord, marked: false };
    });
    $('quiz').innerHTML = quiz.items.map(function (it, n) {
      var q = it.q, body;
      if (q.type === 'mc') {
        body = '<div class="opts" role="group" aria-label="Answers">' + it.order.map(function (oi, k) {
          return '<button type="button" class="opt" data-q="' + n + '" data-o="' + oi + '"><span class="key">' + 'ABCD'[k] + '</span><span class="t">' + q.opts[oi] + '</span><span class="res" aria-hidden="true"></span></button>';
        }).join('') + '</div>';
      } else {
        body = '<ul class="order" data-q="' + n + '">' + it.order.map(function (oi) { return orderItem(q, oi); }).join('') + '</ul>' +
          '<div class="order-act"><button type="button" class="btn primary chk" data-q="' + n + '">Check the order</button></div>';
      }
      return '<div class="qa" id="qa' + n + '"><p class="qn">Question ' + (n + 1) + ' of ' + quiz.items.length + '</p><h3>' + glossify(q.q) + '</h3>' + body +
        '<p class="fb" role="status" hidden></p></div>';
    }).join('') + '<div class="quiz-end"><button type="button" class="btn primary" id="qSubmit"' + (quiz.exam ? '' : ' hidden') + '>Submit all answers</button>' +
      '<button type="button" class="btn" id="qAgain" hidden>Start again</button></div>';
    updateScore();
  }
  function orderItem(q, oi) {
    return '<li data-i="' + oi + '"><button type="button" class="grip" aria-label="Drag to reorder: ' + q.items[oi].replace(/"/g, '') + '. Or use the arrow keys.">' + icon('grip') + '</button>' +
      '<span class="t">' + q.items[oi] + '</span><span class="ord-btns"><button type="button" class="up" aria-label="Move up">' + icon('up') + '</button><button type="button" class="dn" aria-label="Move down">' + icon('down') + '</button></span><span class="res" aria-hidden="true"></span></li>';
  }

  function score() {
    var s = 0, done = 0;
    quiz.items.forEach(function (it) { if (it.marked) { done++; if (it.correct) s++; } });
    return { s: s, done: done };
  }
  function updateScore() {
    var r = score(), n = quiz.items.length, el = $('quizScore');
    if (quiz.exam && !quiz.done) el.textContent = 'Answered ' + quiz.items.filter(function (i) { return i.picked !== null && i.picked !== undefined || i.touched; }).length + ' of ' + n;
    else el.textContent = r.done ? 'Score: ' + r.s + ' / ' + n + (r.done === n ? ' — ' + (r.s === n ? 'perfect!' : r.s >= n - 2 ? 'strong work.' : r.s >= n / 2 ? 'good start; check the explanations.' : 'have another go after the exam questions.') : '') : 'Score: 0 / ' + n;
  }
  function markItem(n) {
    var it = quiz.items[n], q = it.q, box = $('qa' + n), fb = box.querySelector('.fb');
    if (it.marked) return;
    it.marked = true;
    if (q.type === 'mc') {
      it.correct = it.picked === q.ans;
      box.querySelectorAll('.opt').forEach(function (b) {
        var o = +b.dataset.o; b.disabled = true; b.classList.remove('sel');
        if (o === q.ans) { b.classList.add('right'); b.querySelector('.res').innerHTML = icon('check') + 'Correct'; }
        else if (o === it.picked) { b.classList.add('wrong'); b.querySelector('.res').innerHTML = icon('x') + 'Not quite'; }
      });
    } else {
      var lis = box.querySelectorAll('.order > li'), good = 0;
      lis.forEach(function (li, pos) {
        var ok = +li.dataset.i === pos; if (ok) good++;
        li.classList.add(ok ? 'right' : 'wrong'); li.querySelector('.res').innerHTML = icon(ok ? 'check' : 'x') + (ok ? 'Correct place' : 'Wrong place');
        li.querySelectorAll('button').forEach(function (b) { b.disabled = true; });
      });
      it.correct = good === lis.length;
      it.partial = good;
      box.querySelector('.chk').hidden = true;
    }
    fb.hidden = false;
    fb.innerHTML = (it.correct ? '<b class="ok">' + icon('check') + 'Correct.</b> ' : '<b class="no">' + icon('x') + (q.type === 'order' ? 'Not quite (' + it.partial + ' of ' + q.items.length + ' in the right place).' : 'Not quite.') + '</b> ') + glossify(q.why) +
      (q.type === 'order' && !it.correct ? '<ol class="ans-order">' + q.items.map(function (t) { return '<li>' + t + '</li>'; }).join('') + '</ol>' : '');
  }
  function moveOrder(li, dir) {
    var sib = dir < 0 ? li.previousElementSibling : li.nextElementSibling; if (!sib) return;
    if (dir < 0) li.parentNode.insertBefore(li, sib); else li.parentNode.insertBefore(sib, li);
    var n = +li.parentNode.dataset.q; quiz.items[n].touched = true; updateScore();
    $('quizScore').setAttribute('aria-live', 'off');
  }
  function setupQuiz() {
    var root = $('quiz');
    root.addEventListener('click', function (e) {
      var opt = e.target.closest('.opt');
      if (opt) {
        var n = +opt.dataset.q, it = quiz.items[n]; if (it.marked) return;
        it.picked = +opt.dataset.o;
        root.querySelectorAll('#qa' + n + ' .opt').forEach(function (b) { b.classList.toggle('sel', b === opt); b.setAttribute('aria-pressed', b === opt); });
        if (!quiz.exam) markItem(n);
        updateScore(); return;
      }
      var up = e.target.closest('.up'), dn = e.target.closest('.dn');
      if (up || dn) { var li = e.target.closest('li'); moveOrder(li, up ? -1 : 1); (up || dn).focus(); return; }
      var chk = e.target.closest('.chk'); if (chk) { markItem(+chk.dataset.q); updateScore(); return; }
      if (e.target.closest('#qSubmit')) {
        quiz.items.forEach(function (it, n) { if (!it.marked) { if (it.q.type === 'mc' && it.picked === null) it.picked = -1; markItem(n); } });
        quiz.done = true; updateScore(); $('qSubmit').hidden = true; $('qAgain').hidden = false; return;
      }
      if (e.target.closest('#qAgain')) { buildQuiz(); root.scrollIntoView({ behavior: 'smooth', block: 'start' }); }
    });
    /* keyboard and pointer dragging for the order task */
    root.addEventListener('keydown', function (e) {
      var g = e.target.closest('.grip'); if (!g) return;
      if (e.key === 'ArrowUp' || e.key === 'ArrowDown') { e.preventDefault(); moveOrder(g.closest('li'), e.key === 'ArrowUp' ? -1 : 1); g.focus(); }
    });
    var drag = null;
    root.addEventListener('pointerdown', function (e) {
      var g = e.target.closest('.grip'); if (!g || g.disabled) return;
      var li = g.closest('li'); drag = { li: li, list: li.parentNode, id: e.pointerId };
      li.classList.add('dragging'); g.setPointerCapture(e.pointerId); e.preventDefault();
    });
    root.addEventListener('pointermove', function (e) {
      if (!drag) return;
      var sibs = Array.prototype.slice.call(drag.list.children), y = e.clientY;
      for (var i = 0; i < sibs.length; i++) {
        var s = sibs[i]; if (s === drag.li) continue;
        var r = s.getBoundingClientRect(), mid = r.top + r.height / 2;
        if (sibs.indexOf(drag.li) < i && y > mid) drag.list.insertBefore(drag.li, s.nextSibling);
        else if (sibs.indexOf(drag.li) > i && y < mid) { drag.list.insertBefore(drag.li, s); break; }
      }
    });
    function end() { if (!drag) return; drag.li.classList.remove('dragging'); quiz.items[+drag.list.dataset.q].touched = true; updateScore(); drag = null; }
    root.addEventListener('pointerup', end); root.addEventListener('pointercancel', end);
    $('swExam').addEventListener('change', buildQuiz);
    buildQuiz();
  }

  /* ═══════════ THEORY VS EVIDENCE ═══════════ */
  function buildEvidence() {
    var E = D.EVIDENCE, li = function (a) { return a.map(function (t) { return '<li>' + glossify(t) + '</li>'; }).join(''); };
    $('evidence').innerHTML =
      '<div class="ev-cols"><section class="ev-col use"><h3>The theory</h3><ul>' + li(E.theory) + '</ul></section>' +
      '<section class="ev-col cant"><h3>Why it is not certain</h3><ul>' + li(E.limits) + '</ul></section></div>' +
      '<p class="verdict">' + glossify(E.skill) + '</p>' +
      '<p class="tip-line"><b>Exam wording:</b> “Suggest why scientists are not certain about the Earth’s early atmosphere.” The answer: evidence is limited because of the time scale of 4.6 billion years.</p>';
  }

  /* ═══════════ TABS ═══════════ */
  function setupTabs() {
    var tabs = Array.prototype.slice.call(document.querySelectorAll('#examTabs [role=tab]'));
    function select(t, focus) {
      tabs.forEach(function (x) {
        var on = x === t; x.setAttribute('aria-selected', on); x.tabIndex = on ? 0 : -1;
        $(x.getAttribute('aria-controls')).hidden = !on;
      });
      if (focus) t.focus();
    }
    tabs.forEach(function (t, i) {
      t.addEventListener('click', function () { select(t, false); });
      t.addEventListener('keydown', function (e) {
        var k = e.key, j = -1;
        if (k === 'ArrowRight') j = (i + 1) % tabs.length; else if (k === 'ArrowLeft') j = (i + tabs.length - 1) % tabs.length;
        else if (k === 'Home') j = 0; else if (k === 'End') j = tabs.length - 1;
        if (j > -1) { e.preventDefault(); select(tabs[j], true); }
      });
    });
  }

  AE.Exam = {
    glossify: glossify, setPhase: setPhase,
    init: function () { setupTips(); buildTerms(); buildEvidence(); setupTabs(); setupCards(); setupQuiz(); }
  };
})();
