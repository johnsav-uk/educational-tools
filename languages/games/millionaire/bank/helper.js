/* Question bank helper. Each language file calls SSM.addBank('french', 'P1', [ row, row, … ]) once per unit.
   Row: [ sub, tier, difficulty, kind, question, [correct, best wrong answer, wrong, wrong], explanation, flags? ]
     sub        subtopic id within the unit (see taxonomy.js), e.g. 'id1'
     tier       'F' = suitable for a Foundation game; 'H' = Higher-tier vocabulary or grammar (never in a Foundation game)
     difficulty 1 (single word) … 5 (hardest: Higher grammar, longer sentences); the ladder climbs through these
     kind       V vocabulary · T translation · G grammar · R reading a short text · C culture
     o[0]       the correct answer; o[1] is the most tempting wrong answer (the lure Ask the Audience and Phone a Friend lean on)
     flags      { bd:'A'|'E' one board only }. Units marked edxOnly in taxonomy.js are Edexcel-only automatically.
   Ids are  <language code>-<unit>-<row number within that unit>  and stay stable only if rows are APPENDED. */
(function (root) {
  'use strict';
  var SSM = root.SSM = root.SSM || {};
  SSM.BANKS = SSM.BANKS || {};
  SSM.addBank = function (lang, u, rows) {
    var B = SSM.BANKS[lang] = SSM.BANKS[lang] || [];
    var L = SSM.TAX.langs[lang], unit = SSM.TAX.units[u];
    rows.forEach(function (r, i) {
      var q = { id: L.code + '-' + u + '-' + (i < 9 ? '0' : '') + (i + 1), lang: lang, u: u, s: r[0], t: r[1], d: r[2], k: r[3], q: r[4], o: r[5], w: r[6] };
      if (unit && unit.edxOnly) q.bd = 'E';
      var f = r[7]; if (f) for (var k in f) q[k] = f[k];
      B.push(q);
    });
  };
})(typeof window !== 'undefined' ? window : globalThis);
