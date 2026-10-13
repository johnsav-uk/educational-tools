/* Question bank helper. Each unit file calls SSM.addBank('B1', [ row, row, … ]).
   Row: [ sub, tier, difficulty, kind, question, [correct, best wrong answer, wrong, wrong], explanation, flags? ]
     sub        subtopic id within the unit (see taxonomy.js), e.g. 'ce1'
     tier       'F' = suitable for a Foundation game; 'H' = pitched at Higher tier (never offered in a Foundation game)
     difficulty 1 (quick recall) … 5 (hardest); the ladder climbs through these
     kind       R recall · P process · D data/graph · X practical · C calculation · M misconception · A application
     o[0]       the correct answer; o[1] is the most tempting wrong answer (the lure used by Ask the Audience and Phone a Friend)
     flags      { sep:1 separate-science only, bd:'A'|'E' one board only, ord:1 + a:index to keep options in written order, tbl, fig }
   Ids are  <unit>-<row number>  and so are stable only if rows are APPENDED, never inserted. */
(function (root) {
  'use strict';
  var SSM = root.SSM = root.SSM || {};
  SSM.BANK = SSM.BANK || [];
  SSM.addBank = function (u, rows) {
    rows.forEach(function (r, i) {
      var q = { id: u + '-' + (i < 9 ? '0' : '') + (i + 1), u: u, s: r[0], t: r[1], d: r[2], k: r[3], q: r[4], o: r[5], w: r[6] };
      var f = r[7]; if (f) for (var k in f) q[k] = f[k];
      SSM.BANK.push(q);
    });
  };
})(typeof window !== 'undefined' ? window : globalThis);
