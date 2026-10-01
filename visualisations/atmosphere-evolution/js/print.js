/* The Evolution of the Earth's Atmosphere: PRINTABLE WORKSHEET AND MARK SCHEME
   Exam-style questions for AQA GCSE Chemistry 4.9.1, built into #printDoc.
   Every question and marking point comes from the specification's content or
   its "students should be able to" statements; nothing goes beyond it.
   Marks are shown per part, with space to write. The mark scheme is a separate
   section that only prints when the teacher ticks it in the dialog: a plain
   Ctrl+P never prints it (see the @media print rules in styles.css). */
(function () {
  'use strict';
  var AE = window.AE;
  var $ = function (id) { return document.getElementById(id); };

  /* ── the questions. `ms` are marking points, `dna` are "do not accept" notes,
        `levels` a levels-of-response scheme for the extended answer. ── */
  var Q = [
    { title: 'The atmosphere today', spec: '4.9.1.1',
      parts: [
        { t: 'About what fraction of the atmosphere today is nitrogen?', m: 1, lines: 1, ms: ['About four-fifths / approximately 80%'] },
        { t: 'About what fraction of the atmosphere today is oxygen?', m: 1, lines: 1, ms: ['About one-fifth / approximately 20%'] },
        { t: 'The rest of the atmosphere is small proportions of other gases. Name <b>two</b> of them.', m: 2, lines: 2,
          ms: ['Any two from: carbon dioxide; water vapour; noble gases (1 each)'], dna: ['Nitrogen or oxygen', 'A named noble gas such as argon is acceptable for noble gases'] },
        { t: 'For how long have the proportions of gases in the atmosphere been much the same as they are today?', m: 1, lines: 1, ms: ['About 200 million years'] }
      ] },
    { title: 'The early atmosphere', spec: '4.9.1.2',
      parts: [
        { t: 'One theory suggests there was intense volcanic activity during the Earth’s first billion years. What did this volcanic activity release?', m: 1, lines: 1,
          ms: ['Gases (that formed the early atmosphere) / water vapour'] },
        { t: 'Name the gas that the early atmosphere was mainly made of.', m: 1, lines: 1, ms: ['Carbon dioxide'], dna: ['Oxygen', 'Nitrogen'] },
        { t: 'Name <b>two</b> other gases that may have been in the early atmosphere.', m: 2, lines: 2,
          ms: ['Any two from: nitrogen; water vapour; methane; ammonia (1 each)'], dna: ['Oxygen: there was little or no oxygen'] },
        { t: 'Explain how the oceans formed.', m: 2, lines: 3,
          ms: ['The Earth cooled (1)', 'water vapour (released by volcanoes) condensed (1)'], dna: ['“The water evaporated”'] },
        { t: 'The atmospheres of Mars and Venus today are mainly carbon dioxide, with little or no oxygen.<br>Suggest how this information supports the theory about the Earth’s early atmosphere.', m: 1, lines: 2,
          ms: ['The Earth’s early atmosphere may have been like theirs / planets can have atmospheres that are mainly carbon dioxide'] },
        { t: 'Suggest why scientists cannot be certain about what was in the Earth’s early atmosphere.', m: 1, lines: 2,
          ms: ['Evidence is limited because of the time scale (of 4.6 billion years)'] }
      ] },
    { title: 'How oxygen increased and carbon dioxide decreased', spec: '4.9.1.3, 4.9.1.4',
      parts: [
        { t: 'Complete the word equation for photosynthesis.<div class="eqn">carbon dioxide + ______________ → ______________ + ______________</div>', m: 2, lines: 0,
          ms: ['water (1)', 'glucose and oxygen, in either order (1)'], dna: ['Two correct = 1 mark; all three = 2 marks'] },
        { t: 'Balance the symbol equation for photosynthesis.<div class="eqn">___ CO<sub>2</sub> + ___ H<sub>2</sub>O → C<sub>6</sub>H<sub>12</sub>O<sub>6</sub> + ___ O<sub>2</sub></div>', m: 1, lines: 0,
          ms: ['6, 6, 6 (all three needed for the mark)'] },
        { t: 'Algae first produced oxygen. About how long ago was this?', m: 1, lines: 1, ms: ['About 2.7 billion years ago'] },
        { t: 'Describe what happened to carbon dioxide when the oceans formed, and how this changed the atmosphere.', m: 3, lines: 4,
          ms: ['Carbon dioxide dissolved in the water (1)', 'carbonates were precipitated, producing sediments (1)', 'this reduced the amount of carbon dioxide in the atmosphere (1)'] }
      ] },
    { title: 'Limestone and fossil fuels', spec: '4.9.1.4',
      parts: [
        { t: 'Describe how deposits of limestone formed.', m: 2, lines: 3,
          ms: ['From carbonates / the shells and skeletons of sea creatures (1)', 'that settled as sediment and formed sedimentary rock (1)'] },
        { t: 'Describe how coal formed.', m: 2, lines: 3,
          ms: ['From the remains of plants (1)', 'that were buried (and compressed) over millions of years (1)'], dna: ['“From dead animals”: coal is from plants'] },
        { t: 'Describe how crude oil and natural gas formed.', m: 2, lines: 3,
          ms: ['From the remains of plankton (1)', 'that were buried in mud (over millions of years) (1)'] },
        { t: 'Explain why the formation of sedimentary rocks and fossil fuels decreased the percentage of carbon dioxide in the atmosphere.', m: 2, lines: 3,
          ms: ['They contain carbon (1)', 'that came from carbon dioxide in the atmosphere, so it is locked up / no longer in the air (1)'] }
      ] },
    { title: 'Extended response', spec: '4.9.1',
      parts: [
        { t: 'Describe the main changes in the Earth’s atmosphere over the last 4.6 billion years, and the likely causes of these changes.', m: 6, lines: 12,
          levels: [
            ['Level 3 (5–6 marks)', 'A detailed, logically ordered description of changes to carbon dioxide, oxygen and nitrogen, each linked to a likely cause.'],
            ['Level 2 (3–4 marks)', 'Describes several changes, with some causes. The order may not be fully clear.'],
            ['Level 1 (1–2 marks)', 'Simple statements about some changes or causes, not linked together.'],
            ['0 marks', 'No relevant content.']
          ],
          ms: [
            'Intense volcanic activity in the first billion years released gases that formed the early atmosphere',
            'Mainly carbon dioxide, with little or no oxygen (like Mars and Venus today)',
            'Volcanoes also released nitrogen, which gradually built up, and water vapour; there may have been small proportions of methane and ammonia',
            'The Earth cooled and water vapour condensed to form the oceans',
            'Carbon dioxide dissolved in the oceans; carbonates were precipitated, producing sediments',
            'Algae first produced oxygen about 2.7 billion years ago, by photosynthesis',
            'Plants evolved and oxygen gradually increased, to a level that enabled animals to evolve',
            'Photosynthesis by algae and plants decreased carbon dioxide',
            'Carbon dioxide was also decreased by the formation of sedimentary rocks and fossil fuels that contain carbon',
            'For the last 200 million years: about 80% nitrogen, about 20% oxygen, small proportions of other gases'
          ] }
      ] }
  ];

  function qMarks(q) { return q.parts.reduce(function (a, p) { return a + p.m; }, 0); }
  function total() { return Q.reduce(function (s, q) { return s + qMarks(q); }, 0); }
  function lines(n) { var s = ''; for (var i = 0; i < n; i++) s += '<div class="wl"></div>'; return s ? '<div class="wlines">' + s + '</div>' : ''; }

  function worksheet() {
    var out = '<div class="phead"><h1>The evolution of the Earth’s atmosphere: exam practice</h1><div class="sub">AQA GCSE Chemistry 4.9.1 · ' + total() + ' marks</div></div>' +
      '<div class="nmrow"><span>Name</span><span>Class</span><span>Date</span></div>';
    Q.forEach(function (q, qi) {
      out += '<div class="q"><div class="qh"><span class="pqn">' + (qi + 1) + '</span><span class="qt">' + q.title + '</span><span class="qm">[' + qMarks(q) + ' marks]</span></div>';
      q.parts.forEach(function (p, pi) {
        out += '<div class="part"><div class="pl">' + (qi + 1) + '.' + (pi + 1) + '</div><div class="pb"><div class="pt">' + p.t + '</div>' + lines(p.lines) + '</div><div class="pm">[' + p.m + ' mark' + (p.m > 1 ? 's' : '') + ']</div></div>';
      });
      out += '</div>';
    });
    return out + '<p class="end">End of questions</p>';
  }
  function markscheme() {
    var out = '<div class="phead"><h1>The evolution of the Earth’s atmosphere: mark scheme</h1><div class="sub">For teachers · ' + total() + ' marks · every point is from AQA 8462 section 4.9.1</div></div>';
    Q.forEach(function (q, qi) {
      out += '<div class="q ms"><div class="qh"><span class="pqn">' + (qi + 1) + '</span><span class="qt">' + q.title + '</span><span class="qm">Spec ' + q.spec + '</span></div><table class="mst"><tr><th>Part</th><th>Marking points</th><th>Marks</th></tr>';
      q.parts.forEach(function (p, pi) {
        var body = p.levels
          ? '<table class="lvl">' + p.levels.map(function (l) { return '<tr><th>' + l[0] + '</th><td>' + l[1] + '</td></tr>'; }).join('') + '</table><p class="ind"><b>Indicative content</b></p>'
          : '';
        out += '<tr><td>' + (qi + 1) + '.' + (pi + 1) + '</td><td>' + body + '<ul>' + p.ms.map(function (m) { return '<li>' + m + '</li>'; }).join('') + '</ul>' +
          (p.dna ? '<p class="dna"><b>Do not accept / notes:</b> ' + p.dna.join('; ') + '</p>' : '') + '</td><td>' + p.m + '</td></tr>';
      });
      out += '</table></div>';
    });
    return out;
  }

  AE.Print = {
    init: function () {
      $('pWs').innerHTML = worksheet(); $('pMs').innerHTML = markscheme();
      var dlg = $('printDlg');
      $('btnPrint').addEventListener('click', function () { if (dlg.showModal) dlg.showModal(); else dlg.setAttribute('open', ''); });
      $('pCancel').addEventListener('click', function () { dlg.close(); });
      $('pGo').addEventListener('click', function () {
        var ws = $('pOptWs').checked, ms = $('pOptMs').checked;
        if (!ws && !ms) return;
        dlg.close();
        document.body.classList.toggle('print-ws', ws); document.body.classList.toggle('print-ms', ms);
        document.body.classList.add('printing');
        setTimeout(function () { window.print(); }, 60);
      });
      window.addEventListener('afterprint', function () { document.body.classList.remove('printing', 'print-ws', 'print-ms'); });
    }
  };
})();
