/* NMR Spectroscopy: shared helpers, progress, the formula renderer, the quiz runner, the router and the print builder.
   Sections register themselves with NMR.section({...}); boot.js starts the router once every script has loaded. */
(function () {
  'use strict';
  var NMR = window.NMR = window.NMR || {};

  /* ───────── DOM helpers ───────── */
  var U = NMR.U = {};
  U.$ = function (s, r) { return (r || document).querySelector(s); };
  U.$$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };
  U.el = function (tag, attrs, html) {
    var e = document.createElement(tag);
    if (attrs) Object.keys(attrs).forEach(function (k) {
      if (k === 'cls') e.className = attrs[k];
      else if (k === 'style') e.setAttribute('style', attrs[k]);
      else if (k.indexOf('on') === 0 && typeof attrs[k] === 'function') e.addEventListener(k.slice(2), attrs[k]);
      else if (attrs[k] !== null && attrs[k] !== undefined && attrs[k] !== false) e.setAttribute(k, attrs[k] === true ? '' : attrs[k]);
    });
    if (html !== undefined && html !== null) e.innerHTML = html;
    return e;
  };
  U.esc = function (s) { return String(s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); };
  U.fmt = function (x, d) { return (Math.round(x * Math.pow(10, d)) / Math.pow(10, d)).toFixed(d); };
  U.shuffle = function (a, seed) {
    a = a.slice(); var s = seed || Math.random() * 1e9;
    for (var i = a.length - 1; i > 0; i--) { s = (s * 9301 + 49297) % 233280; var j = Math.floor(s / 233280 * (i + 1)); var t = a[i]; a[i] = a[j]; a[j] = t; }
    return a;
  };
  U.CHIP = { spec: '<span class="chip spec">On the spec</span>', ctx: '<span class="chip ctx">Context</span>', ext: '<span class="chip ext">Extension</span>' };

  /* Segmented control: items [[value, label], ...]. */
  U.seg = function (items, cur, onChange, cls, label) {
    var s = U.el('div', { cls: 'seg ' + (cls || ''), role: 'group', 'aria-label': label || null });
    items.forEach(function (it) {
      var b = U.el('button', { type: 'button', 'aria-pressed': String(it[0] === cur), 'data-v': it[0] }, it[1]);
      b.addEventListener('click', function () {
        U.$$('button', s).forEach(function (x) { x.setAttribute('aria-pressed', String(x === b)); });
        onChange(it[0]);
      });
      s.appendChild(b);
    });
    s.set = function (v) { U.$$('button', s).forEach(function (x) { x.setAttribute('aria-pressed', String(x.dataset.v === String(v))); }); };
    return s;
  };
  /* Labelled range slider. */
  U.slider = function (label, o, onInput) {
    var w = U.el('div'), id = 'r' + Math.random().toString(36).slice(2, 8);
    w.innerHTML = '<label class="lbl" for="' + id + '"><span>' + label + '</span><span class="v"></span></label>' +
      '<input type="range" id="' + id + '" min="' + o.min + '" max="' + o.max + '" step="' + (o.step || 1) + '" value="' + o.value + '">';
    var inp = w.querySelector('input'), v = w.querySelector('.v');
    function show() { v.innerHTML = o.fmt ? o.fmt(+inp.value) : inp.value; }
    inp.addEventListener('input', function () { show(); onInput(+inp.value); });
    show(); w.input = inp; w.set = function (x) { inp.value = x; show(); };
    return w;
  };
  U.field = function (label, node) { var w = U.el('div'); w.appendChild(U.el('div', { cls: 'lbl' }, '<span>' + label + '</span>')); w.appendChild(node); return w; };

  /* A panel in the centre column. stage: true makes it a presenter stage (pinned on the board). */
  U.panel = function (title, o) {
    o = o || {};
    var p = U.el('section', { cls: 'panel' + (o.stage ? ' pstage' : '') + (o.cls ? ' ' + o.cls : '') });
    var head = U.el('div', { cls: 'panel-head' }, '<span class="eyebrow">' + title + '</span>');
    var right = U.el('div', { cls: 'row' }); head.appendChild(right);
    var body = U.el('div', { cls: o.bodyCls || 'stage-body' });
    p.appendChild(head); p.appendChild(body);
    return { el: p, head: head, right: right, body: body };
  };

  /* Molecule picker. */
  U.molSelect = function (cur, onChange, o) {
    o = o || {};
    var s = U.el('select', { cls: 'field', 'aria-label': 'Molecule' });
    var std = NMR.MOLS.filter(function (m) { return !m.ext; }), ext = NMR.MOLS.filter(function (m) { return m.ext; });
    var html = '<optgroup label="On the spec">' + std.map(function (m) { return '<option value="' + m.id + '">' + m.name + '</option>'; }).join('') + '</optgroup>';
    if (o.ext !== false) html += '<optgroup label="Extension: more than a quartet">' + ext.map(function (m) { return '<option value="' + m.id + '">' + m.name + '</option>'; }).join('') + '</optgroup>';
    s.innerHTML = html; s.value = cur;
    s.addEventListener('change', function () { onChange(s.value); });
    return s;
  };

  /* ───────── Progress (localStorage, per browser) ───────── */
  var KEY = 'nmr-progress';
  var P = NMR.progress = {
    d: (function () { try { return JSON.parse(localStorage.getItem(KEY)) || {}; } catch (e) { return {}; } })(),
    save: function () { try { localStorage.setItem(KEY, JSON.stringify(P.d)); } catch (e) { /* storage blocked */ } },
    seen: function (route) { P.d.seen = P.d.seen || {}; if (!P.d.seen[route]) { P.d.seen[route] = 1; P.save(); } },
    isSeen: function (route) { return !!(P.d.seen && P.d.seen[route]); },
    q: function (id, rec) { P.d.q = P.d.q || {}; if (rec === undefined) return P.d.q[id]; P.d.q[id] = rec; P.save(); },
    reset: function (what) { if (what === 'q') P.d.q = {}; else P.d = {}; P.save(); }
  };

  /* ───────── Environment colours and descriptions ───────── */
  NMR.envIndex = function (mol, nuc, id) { var L = nuc === 'C' ? mol.C : mol.H; for (var i = 0; i < L.length; i++) if (L[i].id === id) return i; return 0; };
  NMR.envVar = function (mol, nuc, id) { return 'var(--e' + (NMR.envIndex(mol, nuc, id) % 6) + ')'; };
  NMR.env = function (mol, nuc, id) { return (nuc === 'C' ? mol.C : mol.H).filter(function (e) { return e.id === id; })[0] || null; };
  NMR.hNum = function (n) { return n + ' H'; };
  NMR.splitText = function (e) {
    if (e.ex) return 'singlet (O–H: not split, and splits nothing)';
    if (e.lines) return 'multiplet (ring H: beyond the n + 1 rule)';
    var nb = e.nb || 0, pat = NMR.pattern(nb);
    var s = pat + ' · ' + (nb === 0 ? 'no H on the adjacent carbon(s)' : nb + ' H on the adjacent carbon' + (nb > 3 ? 's' : '') + ', so n + 1 = ' + (nb + 1));
    return s;
  };
  NMR.rowText = function (nuc, r) {
    var T = nuc === 'C' ? NMR.SHIFT_C : NMR.SHIFT_H, row = T[r];
    if (!row) return '';
    return row.off ? row.ex + ' (about ' + row.lo + '–' + row.hi + ')' : row.g + ' (' + row.lo + '–' + row.hi + '): ' + row.ex;
  };
  /* One line of assignment for an environment, for the readout under a spectrum. */
  NMR.assignHTML = function (mol, nuc, id) {
    var e = NMR.env(mol, nuc, id); if (!e) return '';
    var col = NMR.envVar(mol, nuc, id), row = e.r !== null && e.r !== undefined ? NMR.rowText(nuc, e.r) : '';
    if (nuc === 'H') {
      return '<span class="t" style="color:' + col + '">' + e.lab + '</span> · δ ' + e.d.toFixed(2) + ' · <b>' + e.n + ' H</b> · ' + NMR.splitText(e) +
        (e.nb > 3 ? ' ' + U.CHIP.ext : '') +
        (row ? '<br><span class="subtle">' + (NMR.SHIFT_H[e.r].off ? '' : 'Data sheet: ') + row + '</span>' : (mol.id === 'toluene' && id === 'a' ? '<br><span class="subtle">CH₃ on a benzene ring: about 2.3, between the alkyl and C=O ranges.</span>' : ''));
    }
    return '<span class="t" style="color:' + col + '">' + e.lab + '</span> · δ ' + e.d.toFixed(1) + ' · ' + e.n + ' carbon' + (e.n > 1 ? 's' : '') + ' in this environment' +
      (row ? '<br><span class="subtle">Data sheet: ' + row + '</span>' : '');
  };

  /* ───────── Formula renderer ─────────
     NMR.formula(mol, nuc, { onPick(id) }) → { el, set(id), mark(ids, cls) }
     Each group is a button with data-h / data-c, coloured like its peaks. Ring molecules are drawn as SVG.        */
  NMR.formula = function (mol, nuc, o) {
    o = o || {};
    var key = nuc === 'C' ? 'c' : 'h', wrap;
    if (mol.ring) wrap = ringSVG(mol, nuc);
    else {
      wrap = U.el('div', { cls: 'formula', role: 'group', 'aria-label': mol.name + ' structure' });
      mol.groups.forEach(function (g, i) {
        if (i) wrap.appendChild(U.el('span', { cls: 'bd', 'aria-hidden': 'true' }, '–'));
        var id = g[key];
        if (id) {
          var b = U.el('button', { type: 'button', cls: 'fg', 'data-id': id, title: 'Show this environment' }, g.t);
          b.setAttribute('data-' + key, id);
          b.style.setProperty('--ec', NMR.envVar(mol, nuc, id));
          wrap.appendChild(b);
        } else wrap.appendChild(U.el('span', { cls: 'fg plain' }, g.t));
      });
    }
    wrap.addEventListener('click', function (e) {
      var t = e.target.closest('[data-id]'); if (!t || !wrap.contains(t)) return;
      api.set(t.getAttribute('data-id'));
      if (o.onPick) o.onPick(api.cur);
    });
    var api = {
      el: wrap, cur: null,
      set: function (id) {
        api.cur = id;
        U.$$('[data-id]', wrap).forEach(function (b) { b.classList.toggle('on', !!id && b.getAttribute('data-id') === id); b.classList.toggle('dim', !!id && b.getAttribute('data-id') !== id && !b.classList.contains('nb')); });
      },
      mark: function (ids, cls) { U.$$('[data-id]', wrap).forEach(function (b) { b.classList.toggle(cls || 'nb', ids.indexOf(b.getAttribute('data-id')) >= 0); }); }
    };
    return api;
  };

  function ringSVG(mol, nuc) {
    var cx = 120, cy = 112, r = 46, pts = [], i, s = '';
    for (i = 0; i < 6; i++) { var a = -Math.PI / 2 + i * Math.PI / 3; pts.push([cx + r * Math.cos(a), cy + r * Math.sin(a)]); }
    var tol = mol.ring === 'toluene';
    s += '<polygon class="bond" points="' + pts.map(function (p) { return p[0].toFixed(1) + ',' + p[1].toFixed(1); }).join(' ') + '"/>';
    s += '<circle class="bond" cx="' + cx + '" cy="' + cy + '" r="' + (r * 0.58) + '"/>';
    function grp(id, inner) { return '<g data-id="' + id + '" style="--ec:' + NMR.envVar(mol, nuc, id) + '">' + inner + '</g>'; }
    // carbon ids around the ring for toluene: ipso, ortho, meta, para, meta, ortho
    var cIds = tol ? ['2', '3', '4', '5', '4', '3'] : ['1', '1', '1', '1', '1', '1'];
    for (i = 0; i < 6; i++) {
      var p = pts[i], dx = p[0] - cx, dy = p[1] - cy, L = Math.hypot(dx, dy), ux = dx / L, uy = dy / L;
      if (nuc === 'C') {
        s += grp(cIds[i], '<circle class="hit" cx="' + p[0].toFixed(1) + '" cy="' + p[1].toFixed(1) + '" r="13"/><circle cx="' + p[0].toFixed(1) + '" cy="' + p[1].toFixed(1) + '" r="6" fill="' + NMR.envVar(mol, 'C', cIds[i]) + '"/>');
      } else if (!(tol && i === 0)) {
        var hx = p[0] + ux * 24, hy = p[1] + uy * 24, hid = tol ? 'b' : 'a';
        s += '<line class="bond" x1="' + (p[0] + ux * 3).toFixed(1) + '" y1="' + (p[1] + uy * 3).toFixed(1) + '" x2="' + (p[0] + ux * 15).toFixed(1) + '" y2="' + (p[1] + uy * 15).toFixed(1) + '"/>';
        s += grp(hid, '<circle class="hit" cx="' + hx.toFixed(1) + '" cy="' + hy.toFixed(1) + '" r="12"/><text class="lbl-t" x="' + hx.toFixed(1) + '" y="' + (hy + 5).toFixed(1) + '" text-anchor="middle" style="fill:' + NMR.envVar(mol, 'H', hid) + '">H</text>');
      }
    }
    if (tol) {
      var t = pts[0];
      s += '<line class="bond" x1="' + t[0] + '" y1="' + t[1] + '" x2="' + t[0] + '" y2="' + (t[1] - 26) + '"/>';
      s += grp(nuc === 'C' ? '1' : 'a', '<rect class="hit" x="' + (t[0] - 26) + '" y="' + (t[1] - 52) + '" width="52" height="24" rx="6"/><text class="lbl-t" x="' + t[0] + '" y="' + (t[1] - 34) + '" text-anchor="middle" style="fill:' + NMR.envVar(mol, nuc, nuc === 'C' ? '1' : 'a') + '">CH<tspan font-size="11" dy="4">3</tspan></text>');
    }
    var svg = U.el('div', { cls: 'ring-wrap' }, '<svg class="ring-svg" viewBox="0 20 240 190" role="img" aria-label="' + mol.name + ' structure">' + s + '</svg>');
    return svg;
  }

  /* Link a formula and a spectrum view so tapping either highlights both, and report the assignment. */
  NMR.link = function (view, formula, out, mol, nuc) {
    function show(id) {
      formula.set(id); view.select(id);
      if (out) out.innerHTML = id ? NMR.assignHTML(mol, nuc, id) : '';
    }
    formula.el.addEventListener('click', function () { show(formula.cur); });
    view.o.onSelect = function (id) { show(id); };
    return show;
  };

  /* ───────── Teaching notes ─────────
     NMR.notes(ctx, { title, tag, body: [html...], list, tip, insight: 'D' })                                   */
  NMR.notes = function (ctx, o) {
    var h = '';
    if (o.title) h += '<h3>' + o.title + '</h3>';
    if (o.tag) h += '<div>' + U.CHIP[o.tag] + '</div>';
    (o.body || []).forEach(function (p) { h += /^\s*</.test(p) && !/^\s*<(b|i|span|sub|sup)\b/.test(p) ? p : '<p>' + p + '</p>'; });
    if (o.list) h += '<ul>' + o.list.map(function (li) { return '<li>' + li + '</li>'; }).join('') + '</ul>';
    if (o.tip) h += '<div class="tip"><b>' + (o.tipLabel || 'Exam tip') + '</b>' + o.tip + '</div>';
    if (o.insight && NMR.INSIGHTS[o.insight]) {
      h += '<div class="insight"><h4>Where marks are lost</h4><ul>' + NMR.INSIGHTS[o.insight].map(function (x) { return '<li>' + x + '</li>'; }).join('') + '</ul>' +
        '<div class="src">General patterns from AQA-style marking, not quotations from examiner reports.</div></div>';
    }
    ctx.notes.innerHTML = h;
  };

  /* ───────── Quiz runner ─────────
     NMR.quiz(host, q, { n, onDone(rec) }) renders one question. rec = { s: 'right'|'part'|'wrong', got, max }.  */
  NMR.quiz = function (host, q, o) {
    o = o || {};
    var card = U.el('div', { cls: 'qcard sst-teacher' }), max = q.max || q.marks || 1, done = false;
    var tag = (q.sec === 'A' || q.sec === 'B') ? U.CHIP.ctx : q.ext ? '' : '';
    card.innerHTML = '<div class="qhead"><span class="eyebrow">' + (o.n ? 'Question ' + o.n : 'Question') + ' ' + tag + '</span><span class="mk">[' + max + ' mark' + (max > 1 ? 's' : '') + ']</span></div>';
    var views = [];
    if (q.fig) {
      var fig = U.el('figure', { cls: 'qfig' }), host2 = U.el('div', { cls: 'nv short' });
      fig.appendChild(host2); card.appendChild(fig);
      var v = new NMR.View(host2, { nuc: q.fig.nuc, integ: !!q.fig.integ, steps: !!q.fig.steps, startFit: true, alt: 'Spectrum for the question' });
      v.setSpec(NMR.build(NMR.mol(q.fig.mol), q.fig.nuc, { tms: true, seed: q.id }));
      views.push(v);
    }
    card.appendChild(U.el('div', { cls: 'qstem' }, q.stem));
    var fb = U.el('div', { cls: 'verdict', hidden: true, 'aria-live': 'polite' });

    function finish(rec) {
      if (done) return; done = true;
      NMR.progress.q(q.id, rec);
      if (o.onDone) o.onDone(rec);
    }
    function tipHTML() { return q.tip ? '<div class="tip" style="margin-top:8px"><b>Exam tip</b>' + q.tip + '</div>' : ''; }

    if (q.type === 'mcq') {
      var opts = U.el('div', { cls: 'q-opts', role: 'group' });
      q.opts.forEach(function (op, i) {
        var b = U.el('button', { type: 'button', cls: 'q-opt' }, '<span class="lt">' + 'ABCD'[i] + '</span><span>' + op[0] + '<span class="q-why" hidden>' + op[1] + '</span></span>');
        b.addEventListener('click', function () {
          var right = i === q.ans;
          b.setAttribute('data-state', right ? 'right' : 'wrong');
          b.querySelector('.q-why').hidden = false;
          if (right) {
            U.$$('.q-opt', opts).forEach(function (x) { x.disabled = true; });
            fb.hidden = false; fb.setAttribute('data-ok', done ? '2' : '1');
            fb.innerHTML = '<b>' + (done ? 'Got there' : 'Correct') + '</b>' + (done ? 'Your first answer was recorded. Read why the other choice was wrong above.' : 'Well done.') + tipHTML();
            finish({ s: 'right', got: max, max: max });
          } else {
            b.disabled = true;
            fb.hidden = false; fb.setAttribute('data-ok', '0');
            fb.innerHTML = '<b>Not quite</b>' + op[1] + ' Try another option.';
            finish({ s: 'wrong', got: 0, max: max });
          }
        });
        opts.appendChild(b);
      });
      card.appendChild(opts);
    } else if (q.type === 'num') {
      var row = U.el('div', { cls: 'qnum' });
      var inp = U.el('input', { cls: 'field num', type: 'text', inputmode: 'decimal', 'aria-label': 'Your answer', autocomplete: 'off' });
      var go = U.el('button', { type: 'button', cls: 'btn btn-accent' }, 'Check');
      var show = U.el('button', { type: 'button', cls: 'btn', hidden: true }, 'Show answer');
      row.appendChild(inp); if (q.unit) row.appendChild(U.el('span', { cls: 'subtle' }, q.unit)); row.appendChild(go); row.appendChild(show);
      card.appendChild(row);
      var check = function () {
        var raw = inp.value.trim().replace(',', '.').replace('−', '-'); if (!raw) { inp.focus(); return; }
        var v = parseFloat(raw), tol = q.tolNum || 1e-6, right = Math.abs(v - q.ans) <= tol;
        fb.hidden = false;
        if (isNaN(v)) { fb.setAttribute('data-ok', '0'); fb.innerHTML = '<b>Enter a number</b>Type your answer as a number, for example 3.'; return; }
        if (right) {
          fb.setAttribute('data-ok', '1'); fb.innerHTML = '<b>Correct</b>' + (q.fbAny ? q.fbAny : '') + tipHTML();
          inp.disabled = true; go.disabled = true; show.hidden = true;
          finish({ s: done ? 'wrong' : 'right', got: max, max: max });
        } else {
          var why = null; if (q.fb) Object.keys(q.fb).forEach(function (k) { if (Math.abs(parseFloat(k) - v) <= tol) why = q.fb[k]; });
          fb.setAttribute('data-ok', '0');
          fb.innerHTML = '<b>Not quite</b>' + (why || 'Have another look. ' + (q.fbAny ? '<br><span class="subtle">Hint: ' + q.fbAny.split('. ')[0] + '.</span>' : '')) + ' Try again.';
          show.hidden = false;
          finish({ s: 'wrong', got: 0, max: max });
        }
      };
      go.addEventListener('click', check);
      inp.addEventListener('keydown', function (e) { if (e.key === 'Enter') check(); });
      show.addEventListener('click', function () {
        fb.setAttribute('data-ok', '2'); fb.innerHTML = '<b>Answer: ' + q.ans + (q.unit ? ' ' + q.unit : '') + '</b>' + (q.fbAny || '') + tipHTML();
        inp.disabled = true; go.disabled = true; show.hidden = true;
      });
    } else if (q.type === 'self') {
      var ta = U.el('textarea', { cls: 'self-ans', 'aria-label': 'Your answer', placeholder: 'Write your answer as you would in the exam, then mark it against the mark scheme.' });
      var reveal = U.el('button', { type: 'button', cls: 'btn btn-accent' }, 'Mark my answer');
      var ms = U.el('div', { hidden: true });
      card.appendChild(ta); card.appendChild(U.el('div', { cls: 'row' })).appendChild(reveal); card.appendChild(ms);
      var saved = NMR.progress.q(q.id); if (saved && saved.txt) ta.value = saved.txt;
      reveal.addEventListener('click', function () {
        reveal.hidden = true; ms.hidden = false;
        var h = '<div class="eyebrow" style="margin:4px 0 6px">Mark scheme: tick each point your answer makes</div><div class="pts">';
        q.pts.forEach(function (p, i) { h += '<label class="pt"><input type="checkbox" data-i="' + i + '"><span>' + p[0] + ' <b>(' + p[1] + ')</b></span></label>'; });
        h += '</div>';
        if (q.dna && q.dna.length) h += '<p class="dna" style="margin:8px 0 0"><b>Do not accept:</b> ' + q.dna.join('; ') + '</p>';
        h += '<div class="row" style="margin-top:10px"><button type="button" class="btn btn-accent" data-a="save">Save my mark</button><span class="subtle" data-a="score"></span></div>';
        ms.innerHTML = h;
        var score = U.$('[data-a="score"]', ms);
        function count() { var n = 0; U.$$('input', ms).forEach(function (c) { c.closest('.pt').classList.toggle('on', c.checked); if (c.checked) n += q.pts[+c.dataset.i][1]; }); return Math.min(max, n); }
        ms.addEventListener('change', function () { score.textContent = count() + ' / ' + max; });
        score.textContent = '0 / ' + max;
        U.$('[data-a="save"]', ms).addEventListener('click', function () {
          var got = count();
          fb.hidden = false; fb.setAttribute('data-ok', got === max ? '1' : got ? '2' : '0');
          fb.innerHTML = '<b>' + got + ' / ' + max + ' marks</b>' + (got < max ? 'Compare the points you missed with what you wrote. Each mark needs a specific idea.' : 'Every marking point made.') + tipHTML();
          done = false; finish({ s: got === max ? 'right' : got ? 'part' : 'wrong', got: got, max: max, txt: ta.value });
          this.disabled = true;
        });
      });
    }
    card.appendChild(fb);
    host.appendChild(card);
    return { el: card, views: views };
  };

  /* ───────── Super- and subscript digits ─────────
     Plus Jakarta Sans has ¹ ² ³ but no other super- or subscript digits, so ¹⁴N or CH₃ would mix in a fallback
     font. Text written with those characters is rewritten as <sup>/<sub> in the page font as it reaches the page.
     SVG and canvas text is left alone.                                                                         */
  var SUPS = '⁰¹²³⁴⁵⁶⁷⁸⁹', SUBS = '₀₁₂₃₄₅₆₇₈₉', SCRIPT_RE = /[⁰¹²³⁴⁵⁶⁷⁸⁹]+|[₀₁₂₃₄₅₆₇₈₉]+/g;
  function digits(run, set) { return run.split('').map(function (c) { return set.indexOf(c); }).join(''); }
  function fixText(n) {
    var t = n.nodeValue; SCRIPT_RE.lastIndex = 0; if (!SCRIPT_RE.test(t)) return;
    var p = n.parentNode; if (!p || !p.closest || p.closest('svg, script, style, textarea, option, select, title, sup, sub')) return;
    var frag = document.createDocumentFragment(), last = 0;
    t.replace(SCRIPT_RE, function (run, i) {
      if (i > last) frag.appendChild(document.createTextNode(t.slice(last, i)));
      var sup = SUPS.indexOf(run[0]) >= 0, el = document.createElement(sup ? 'sup' : 'sub');
      el.className = 'sc'; el.textContent = digits(run, sup ? SUPS : SUBS); frag.appendChild(el);
      last = i + run.length; return run;
    });
    if (last < t.length) frag.appendChild(document.createTextNode(t.slice(last)));
    p.replaceChild(frag, n);
  }
  NMR.scripts = function (root) {
    if (!root) return;
    if (root.nodeType === 3) { fixText(root); return; }
    if (root.nodeType !== 1 || root.closest('svg')) return;
    var w = document.createTreeWalker(root, NodeFilter.SHOW_TEXT), list = [];
    for (var n = w.nextNode(); n; n = w.nextNode()) list.push(n);
    list.forEach(fixText);
  };
  NMR.watchScripts = function () {
    NMR.scripts(document.body);
    new MutationObserver(function (recs) {
      recs.forEach(function (r) {
        if (r.type === 'characterData') fixText(r.target);
        else Array.prototype.forEach.call(r.addedNodes, function (x) { NMR.scripts(x); });
      });
    }).observe(document.body, { childList: true, subtree: true, characterData: true });
  };

  /* ───────── Router and section registry ───────── */
  NMR.sections = [];
  NMR.section = function (s) { NMR.sections.push(s); NMR.sections.sort(function (a, b) { return a.n < b.n ? -1 : 1; }); };
  var R = NMR.router = { cur: null, ctx: null };

  function parse(hash) {
    var m = /^#([a-g])(?:-([\w-]+))?$/.exec(hash || ''), sec = null, sub = null;
    if (m) sec = NMR.sections.filter(function (s) { return s.id === m[1]; })[0];
    if (!sec) sec = NMR.sections[0];
    sub = sec.subs.filter(function (x) { return m && x.id === m[2]; })[0] || sec.subs[0];
    return { sec: sec, sub: sub };
  }

  R.go = function (hash, push) {
    var r = parse(hash), route = '#' + r.sec.id + '-' + r.sub.id;
    if (push !== false && location.hash !== route) history.replaceState(null, '', route);
    if (R.ctx) R.ctx.destroy();
    var vis = U.$('#vis'), ctl = U.$('#ctl'), notes = U.$('#notes');
    vis.innerHTML = ''; ctl.innerHTML = ''; notes.innerHTML = '';
    var ctx = R.ctx = {
      sec: r.sec, sub: r.sub, vis: vis, ctl: ctl, notes: notes, _views: [], _clean: [],
      view: function (host, o) { var v = new NMR.View(host, o); this._views.push(v); return v; },
      cleanup: function (fn) { this._clean.push(fn); },
      every: function (fn, ms) { var t = setInterval(fn, ms); this._clean.push(function () { clearInterval(t); }); return t; },
      later: function (fn, ms) { var t = setTimeout(fn, ms); this._clean.push(function () { clearTimeout(t); }); return t; },
      raf: function (fn) {
        var alive = true, self = this;
        function loop(t) { if (!alive) return; fn(t); requestAnimationFrame(loop); }
        requestAnimationFrame(loop); self._clean.push(function () { alive = false; });
      },
      destroy: function () { this._views.forEach(function (v) { v.destroy(); }); this._clean.forEach(function (f) { try { f(); } catch (e) { /* ignore */ } }); }
    };
    // Section heading and sub-tabs
    var head = U.el('div', { cls: 'sec-head' });
    var tag = r.sub.tag || r.sec.tag;
    head.innerHTML = '<div><span class="kick">Section ' + r.sec.n + ' · ' + r.sec.name + '</span><h2>' + r.sub.name + ' ' + (tag ? U.CHIP[tag] : '') + '</h2></div>';
    if (r.sec.subs.length > 1) {
      var tabs = U.el('div', { cls: 'tabs sst-teacher', role: 'tablist', 'aria-label': r.sec.name });
      r.sec.subs.forEach(function (s) {
        var b = U.el('button', { type: 'button', role: 'tab', 'aria-selected': String(s === r.sub) }, s.name);
        b.addEventListener('click', function () { R.go('#' + r.sec.id + '-' + s.id); });
        tabs.appendChild(b);
      });
      head.appendChild(tabs);
    }
    vis.appendChild(head);
    U.$('#ctlTitle').textContent = r.sub.ctlTitle || 'Controls';
    U.$('#notesTitle').textContent = r.sub.notesTitle || 'Teaching notes';
    r.sec.render(r.sub.id, ctx);
    // Presenter mode shows one stage panel at a time, like a slide; a section can ask for a pair (two isomers).
    var stages = U.$$('.pstage', vis);
    NMR.board = { list: stages, cur: 0, pair: ctx.pair || false };
    if (stages.length > 1 && !ctx.pair) {
      var bw = U.el('div', { cls: 'molpick' });
      stages.forEach(function (st, i) {
        var t = (U.$('.panel-head .eyebrow', st) || st).innerHTML;
        var b = U.el('button', { type: 'button', cls: 'btn board-pick' + (i ? '' : ' btn-accent') }, '<span>' + t + '</span>');
        b.addEventListener('click', function () {
          NMR.board.cur = i;
          U.$$('button', bw).forEach(function (x) { x.classList.toggle('btn-accent', x === b); });
          if (window.SST_PRESENTER) SST_PRESENTER.layout();
          setTimeout(function () { window.dispatchEvent(new Event('resize')); }, 30);
        });
        bw.appendChild(b);
      });
      var f = U.field('On the board', bw); f.classList.add('pres-only');
      ctl.insertBefore(f, ctl.firstChild);
    }
    var ctlP = U.$('#ctlPanel'); ctlP.hidden = false;
    ctlP.classList.toggle('ctl-empty', !U.$$(':scope > :not(.pres-only)', ctl).length);
    NMR.progress.seen(route);
    R.cur = route;
    paintSteps();
    var cc = U.$('.col-c'); if (cc) cc.scrollTop = 0;
    if (window.innerWidth <= 1100 && push !== 'init') { var rp = U.$('#routePanel'); window.scrollTo({ top: Math.max(0, (rp ? rp.offsetTop : 0) - 4), behavior: 'auto' }); }
    var cur = U.$('.step[aria-current="true"]'); if (cur && cur.scrollIntoView && window.innerWidth <= 1100) cur.scrollIntoView({ block: 'nearest', inline: 'center' });
  };

  function paintSteps() {
    var box = U.$('#steps'); if (!box) return;
    var cur = R.cur ? R.cur.charAt(1) : 'a', started = 0;
    if (!box.children.length) {
      NMR.sections.forEach(function (s) {
        var b = U.el('button', { type: 'button', cls: 'step', 'data-s': s.id },
          '<span class="num">' + s.n + '</span><span><span class="nm">' + s.name + (s.tag ? ' ' + U.CHIP[s.tag] : '') + '</span><span class="ds">' + s.ds + '</span></span>');
        b.addEventListener('click', function () { R.go('#' + s.id + '-' + s.subs[0].id); });
        box.appendChild(b);
      });
    }
    U.$$('.step', box).forEach(function (b) {
      var s = NMR.sections.filter(function (x) { return x.id === b.dataset.s; })[0];
      var seen = s.subs.filter(function (x) { return NMR.progress.isSeen('#' + s.id + '-' + x.id); }).length;
      if (seen) started++;
      b.setAttribute('aria-current', String(s.id === cur));
      b.setAttribute('data-done', seen === s.subs.length ? '1' : '0');
      b.title = seen + ' of ' + s.subs.length + ' parts visited';
    });
    var rc = U.$('#routeCount'); if (rc) rc.textContent = started + ' of ' + NMR.sections.length + ' started';
  }
  R.paint = paintSteps;

  /* ───────── Print builder ───────── */
  NMR.buildPrint = function () {
    var doc = U.$('#printDoc'); if (!doc) return;
    var Q = NMR.PRINTQ, total = Q.reduce(function (a, q) { return a + q.total; }, 0);
    function mk(n) { return '[' + n + ' mark' + (n > 1 ? 's' : '') + ']'; }
    function fig(q) {
      if (!q.mol) return '';
      var mol = NMR.mol(q.mol), spec = NMR.build(mol, q.nuc, { tms: true, seed: 'print' + q.n, solvent: q.nuc === 'C' ? null : null });
      var hi = q.nuc === 'H' ? Math.ceil(Math.max.apply(null, spec.envs.map(function (e) { return e.hi; })) + 0.9) : 220, lo = q.nuc === 'H' ? -0.4 : -5;
      return '<figure>' + NMR.svg(spec, { w: 640, h: q.integ ? 250 : 210, lo: lo, hi: hi, integ: !!q.integ, steps: !!q.steps }) +
        '<figcaption>' + (q.nuc === 'H' ? '¹H' : '¹³C') + ' NMR spectrum' + (q.integ ? ' with integration trace' : '') + '</figcaption></figure>';
    }
    function part(p, j) {
      var h = '<div class="part"><div class="qt"><span>(' + 'abcdef'[j] + ')</span><span>' + p.t + '</span><span class="mk">' + mk(p.m) + '</span></div>';
      if (p.table) {
        h += '<table><tr>' + p.head.map(function (x) { return '<th>' + x + '</th>'; }).join('') + '</tr>' +
          p.rows.map(function (r) { return '<tr>' + r.map(function (c) { return c ? '<td>' + c + '</td>' : '<td class="blank"></td>'; }).join('') + '</tr>'; }).join('') + '</table>';
      }
      if (p.lines) h += '<div class="lines">' + new Array(p.lines + 1).join('<i></i>') + '</div>';
      return h + '</div>';
    }
    var ws = '<section id="pWs"><div class="phead"><h1>NMR spectroscopy: exam practice</h1><div class="sub">AQA A-level Chemistry 3.3.15 · ' + total + ' marks · use the Chemistry Data Booklet</div></div>' +
      '<div class="fill"><span>Name</span><span>Class</span><span>Date</span></div>' +
      Q.map(function (q) { return '<div class="q"><div class="qt"><span class="qn">' + q.n + '</span><div>' + q.stem + '</div><span class="mk">' + mk(q.total) + '</span></div>' + fig(q) + q.parts.map(part).join('') + '</div>'; }).join('') +
      '</section>';
    var msq = Q.map(function (q) {
      return '<div class="mq"><b>Question ' + q.n + '</b>' + q.parts.map(function (p, j) {
        var tab = p.ans ? '<table><tr>' + p.head.map(function (x) { return '<th>' + x + '</th>'; }).join('') + '</tr>' + p.ans.map(function (r) { return '<tr>' + r.map(function (c) { return '<td>' + c + '</td>'; }).join('') + '</tr>'; }).join('') + '</table>' : '';
        return '<div class="mq"><span class="pm">' + p.m + '</span><b>(' + 'abcdef'[j] + ')</b><ul>' + p.ms.map(function (m) { return '<li>' + m + '</li>'; }).join('') + '</ul>' + tab +
          (p.work ? '<div class="work">' + p.work + '</div>' : '') + (p.no ? '<p class="no">' + p.no + '</p>' : '') + '</div>';
      }).join('') + '</div>';
    }).join('');
    var ms = '<section id="pMs" class="ms"><div class="phead"><h1>NMR spectroscopy: mark scheme</h1><div class="sub">Teacher copy · ' + total + ' marks</div></div>' + msq +
      '<p class="note">One mark per marking point unless shown otherwise. Shift values in the questions are typical literature values; ranges quoted are from the AQA Data Booklet, Tables B and C.</p></section>';
    function tab(T, unit) { return '<table><tr><th>Type of ' + unit + '</th><th>δ / ppm</th></tr>' + T.filter(function (r) { return !r.off; }).map(function (r) { return '<tr><td>' + r.g + '</td><td>' + r.lo + '–' + r.hi + '</td></tr>'; }).join('') + '</table>'; }
    var card = '<section id="pCard"><div class="phead"><h1>NMR spectroscopy: revision card</h1><div class="sub">AQA A-level Chemistry 3.3.15</div></div><div class="card2"><div>' +
      '<h3>¹H shifts (as on the data sheet)</h3>' + tab(NMR.SHIFT_H, 'proton') + '</div><div><h3>¹³C shifts (as on the data sheet)</h3>' + tab(NMR.SHIFT_C, 'carbon') +
      '<h3>Reading a ¹H spectrum</h3><ol class="chk"><li>Number of signals = number of proton environments.</li><li>Shift δ: which group (data sheet Table B).</li><li>Integration: ratio of H; scale it to the formula.</li><li>Splitting: n + 1 peaks, n = H on the adjacent carbon(s). Singlet, doublet, triplet, quartet.</li><li>Fit the fragments together; check every H in the formula is used.</li></ol>' +
      '<h3>Solvents and TMS</h3><p>Use CDCl₃ or CCl₄: no ¹H, so no solvent peak. TMS, Si(CH₃)₄: one sharp peak (12 equivalent H), defined as δ = 0, inert, volatile.</p>' +
      '<h3>¹³C</h3><p>One line per carbon environment, no splitting; heights do not count carbons. Symmetry reduces the number of signals.</p></div></div>' +
      '<p class="note">Shift ranges from Tables B and C of the AQA A-level Chemistry (7405) Data Booklet.</p></section>';
    doc.innerHTML = card + ws + ms;
  };
})();
