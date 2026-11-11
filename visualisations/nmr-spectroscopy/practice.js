/* NMR Spectroscopy, Section G: exam practice.
   Four levels from NMR.Q, one question at a time, with progress saved in this browser. Level 4 answers are
   written, then ticked off against the mark scheme.                                                          */
(function () {
  'use strict';
  var NMR = window.NMR, U = NMR.U;
  var LV = [
    { n: 1, t: 'The ideas', s: 'Spin, solvents, TMS, counting signals' },
    { n: 2, t: 'Reading spectra', s: 'Integration, splitting, ¹³C' },
    { n: 3, t: 'Interpretation', s: 'Deduce structures, isomers' },
    { n: 4, t: 'Exam answers', s: 'Written answers, self-marked' }
  ];
  var pos = { 1: 0, 2: 0, 3: 0, 4: 0 };

  function qs(n) { return NMR.Q.filter(function (q) { return q.lvl === n; }); }
  function score(n) {
    var got = 0, max = 0, done = 0;
    qs(n).forEach(function (q) { var r = NMR.progress.q(q.id), m = q.max || q.marks || 1; max += m; if (r) { done++; got += r.got; } });
    return { got: got, max: max, done: done, total: qs(n).length };
  }

  function levelPicker(ctx, cur) {
    var w = U.el('div', { cls: 'molpick' });
    LV.forEach(function (L) {
      var s = score(L.n), b = U.el('button', { type: 'button', cls: 'lvl', 'aria-pressed': String(L.n === cur) },
        '<span class="t">Level ' + L.n + ': ' + L.t + '</span><span class="s">' + L.s + '</span><span class="s">' + s.done + ' of ' + s.total + ' answered · ' + s.got + ' / ' + s.max + ' marks</span><span class="bar-p"><i style="width:' + Math.round(100 * s.got / s.max) + '%"></i></span>');
      b.addEventListener('click', function () { NMR.router.go('#g-l' + L.n); });
      w.appendChild(b);
    });
    ctx.ctl.appendChild(U.field('Levels', w));
    var pr = U.el('button', { type: 'button', cls: 'btn' }, 'Print worksheet');
    pr.addEventListener('click', function () { var d = U.$('#printDlg'); if (d && d.showModal) d.showModal(); });
    var rs = U.el('button', { type: 'button', cls: 'btn' }, 'Reset my answers');
    rs.addEventListener('click', function () { if (confirm('Clear your saved answers on this device?')) { NMR.progress.reset('q'); NMR.router.go(location.hash); } });
    var row = U.el('div', { cls: 'row' }); row.appendChild(pr); row.appendChild(rs); ctx.ctl.appendChild(row);
  }

  function level(n, ctx) {
    var list = qs(n), i = Math.min(pos[n], list.length - 1), q = list[i];
    levelPicker(ctx, n);
    var top = U.el('div', { cls: 'panel' }), head = U.el('div', { cls: 'panel-head' });
    var dots = U.el('div', { cls: 'dots', 'aria-label': 'Questions in this level' });
    list.forEach(function (x, k) {
      var r = NMR.progress.q(x.id), d = U.el('i', { 'data-s': k === i ? 'now' : r ? r.s : '' , title: 'Question ' + (k + 1) });
      if (r && k === i) d.setAttribute('data-s', r.s);
      if (k === i) d.style.boxShadow = '0 0 0 2px var(--accent-text)';
      dots.appendChild(d);
    });
    head.innerHTML = '<span class="eyebrow">Level ' + n + ': ' + LV[n - 1].t + ' · question ' + (i + 1) + ' of ' + list.length + '</span>';
    head.appendChild(dots); top.appendChild(head);
    var body = U.el('div', { cls: 'stage-body' }); top.appendChild(body);
    ctx.vis.appendChild(top);
    var made = NMR.quiz(body, q, { n: i + 1, onDone: function () { ctx.later(function () { refreshDots(); }, 10); } });
    made.views.forEach(function (v) { ctx._views.push(v); });
    var prev = U.$('[data-r]', body);
    if (prev) prev.remove();
    var r = NMR.progress.q(q.id);
    if (r && q.type !== 'self') {
      var note = U.el('p', { cls: 'subtle', style: 'margin:0' }, 'Answered before: ' + (r.s === 'right' ? 'right first time' : r.s === 'part' ? 'part marks' : 'not right first time') + '. Have another go.');
      body.insertBefore(note, body.firstChild);
    }
    var nav = U.el('div', { cls: 'row', style: 'justify-content:space-between' });
    var back = U.el('button', { type: 'button', cls: 'btn' }, '‹ Previous'), next = U.el('button', { type: 'button', cls: 'btn btn-accent' }, i === list.length - 1 ? (n < 4 ? 'Next level ›' : 'Finish') : 'Next question ›');
    back.disabled = i === 0;
    back.addEventListener('click', function () { pos[n] = i - 1; NMR.router.go(location.hash); });
    next.addEventListener('click', function () {
      if (i < list.length - 1) { pos[n] = i + 1; NMR.router.go(location.hash); }
      else if (n < 4) NMR.router.go('#g-l' + (n + 1));
      else NMR.router.go('#g-review');
    });
    nav.appendChild(back); nav.appendChild(next); body.appendChild(nav);
    function refreshDots() {
      U.$$('i', dots).forEach(function (d, k) { var rr = NMR.progress.q(list[k].id); if (rr) d.setAttribute('data-s', rr.s); });
    }
    NMR.notes(ctx, { title: 'Level ' + n + ': ' + LV[n - 1].t, tag: 'spec',
      body: [
        ['Short questions on the ideas. Questions marked Context (spin and radio waves) are background, not on the AQA specification.', 'Each wrong option explains the misconception behind it, so read the feedback even when you get it right.'],
        ['Read the spectrum above each question. Zoom in on a signal to count its peaks.', 'The integration steps are marked in mm on the trace. Divide by the smallest.'],
        ['Questions in the style of the 2- and 3-mark structure questions. Use the data sheet ranges in Section D.'],
        ['Write your answer first, as you would in the exam. Then open the mark scheme and tick each point you made. Be strict: if a point is only implied, it does not get the mark.', 'Your written answers are saved in this browser only.']][n - 1],
      tip: n === 4 ? 'Key words examiners look for: “environment”, “adjacent carbon”, “n + 1”, “ratio”, and a data-sheet range with the group named.' : null,
      insight: n === 3 ? 'D' : n === 2 ? 'E' : null });
    ctx.notes.insertAdjacentHTML('beforeend', '<p class="subtle">Exam tips and the “where marks are lost” notes describe general patterns in AQA-style marking. They are not quotations from examiner reports.</p>');
  }

  function review(ctx) {
    levelPicker(ctx, 0);
    var p = U.panel('Your progress on this device', { stage: true });
    var h = '<div class="lvls">';
    var all = { got: 0, max: 0 };
    LV.forEach(function (L) { var s = score(L.n); all.got += s.got; all.max += s.max; h += '<button type="button" class="lvl" data-l="' + L.n + '"><span class="t">Level ' + L.n + '</span><span class="s">' + L.t + '</span><span class="big">' + s.got + '<span class="subtle"> / ' + s.max + '</span></span><span class="bar-p"><i style="width:' + Math.round(100 * s.got / s.max) + '%"></i></span></button>'; });
    h += '</div>';
    p.body.innerHTML = h + '<p class="stage-cap">Total: <b>' + all.got + ' / ' + all.max + '</b> marks. Marks count first attempts at levels 1–3 and your own marking at level 4.</p>';
    U.$$('[data-l]', p.body).forEach(function (b) { b.addEventListener('click', function () { NMR.router.go('#g-l' + b.dataset.l); }); });
    ctx.vis.appendChild(p.el);
    // Weak spots by section
    var by = {}, names = { A: 'How NMR works', B: 'Active nuclei', C: 'Solvents and TMS', D: '¹H spectra', E: 'Splitting', F: '¹³C spectra' };
    NMR.Q.forEach(function (q) { var r = NMR.progress.q(q.id); if (!r) return; by[q.sec] = by[q.sec] || { got: 0, max: 0 }; by[q.sec].got += r.got; by[q.sec].max += r.max; });
    var w = U.panel('Where to go next', {});
    var rows = Object.keys(names).filter(function (k) { return by[k]; }).map(function (k) { var b = by[k], pc = Math.round(100 * b.got / b.max); return '<tr data-click="' + k.toLowerCase() + '"><td>' + k + '. ' + names[k] + '</td><td>' + b.got + ' / ' + b.max + '</td><td class="' + (pc >= 70 ? 'ok-t' : pc >= 40 ? 'warn-t' : 'bad-t') + '"><b>' + pc + '%</b></td></tr>'; }).join('');
    w.body.innerHTML = rows ? '<div class="tw"><table class="dt"><tr><th>Section</th><th>Marks</th><th></th></tr>' + rows + '</table></div><p class="subtle" style="margin:0">Tap a section to revise it.</p>' : '<p class="stage-cap">Answer some questions and your strongest and weakest sections show here.</p>';
    U.$$('tr[data-click]', w.body).forEach(function (tr) { tr.addEventListener('click', function () { NMR.router.go('#' + tr.dataset.click); }); });
    ctx.vis.appendChild(w.el);
    NMR.notes(ctx, { title: 'Exam practice', tag: 'spec',
      body: ['Work up through the four levels. Levels 1–3 are marked for you; level 4 is written answers you mark against the mark scheme.', 'Print the worksheet for five longer structured questions, with a separate teacher mark scheme.'],
      list: ['Count signals = environments.', 'Shift: name the group and quote the range.', 'Integration: a ratio, scaled to the formula.', 'Splitting: n + 1, n = H on the adjacent carbon.', '¹³C: count environments; use symmetry.'] });
  }

  NMR.section({ id: 'g', n: 'G', name: 'Exam practice', ds: 'Four levels, saved progress, worksheet',
    subs: [{ id: 'l1', name: 'Level 1: the ideas' }, { id: 'l2', name: 'Level 2: reading spectra' }, { id: 'l3', name: 'Level 3: interpretation' }, { id: 'l4', name: 'Level 4: exam answers' }, { id: 'review', name: 'Progress' }],
    render: function (sub, ctx) { if (sub === 'review') review(ctx); else level(+sub.slice(1) || 1, ctx); } });
})();
