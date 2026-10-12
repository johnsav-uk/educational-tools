/* Who Wants to Be a Science Millionaire? — question selection engine.
   Separate from the interface and fully deterministic for a given seed.

   Bank entry (compact; see bank/README.md):
     { id, u:'B1', s:'ce1', t:'F'|'H', d:1–5, k:'recall'|…, q:'…', o:[correct, best wrong, wrong, wrong], w:'explanation',
       sep:true?  (separate-science only),  bd:'A'|'E'? (one board only; omitted = both),
       ord:true? (keep options in the order written; then a = index of the correct one),  tbl?, fig? }
   By default options are shuffled at game time, and o[1] is always the most tempting wrong answer (the
   "lure" that Ask the Audience and Phone a Friend lean on).

   config: { board:'AQA'|'Edexcel', course:'combined'|'separate', tier:'F'|'H', difficulty:'gentle'|'standard'|'challenge',
             length:5|10|15, subs:[full sub ids e.g. 'B1:ce1'], seed }                                              */
(function (root) {
  'use strict';
  var SSM = root.SSM = root.SSM || {};
  var TAX = function () { return SSM.TAX; };

  /* 15-rung target difficulty curve (1 = easy recall, 5 = hardest). Shorter games sample it. */
  var CURVE15 = [1, 1, 1.3, 1.6, 2, 2.2, 2.5, 2.8, 3, 3.3, 3.6, 4, 4.3, 4.6, 5];
  var SHIFT = { gentle: -0.7, standard: 0, challenge: 0.8 };

  function targets(length, difficulty, tier) {
    var out = [];
    for (var i = 0; i < length; i++) {
      var pos = length === 1 ? 0 : i / (length - 1) * 14;
      var lo = Math.floor(pos), hi = Math.min(14, lo + 1), f = pos - lo;
      var v = CURVE15[lo] * (1 - f) + CURVE15[hi] * f + (SHIFT[difficulty] || 0);
      v = Math.max(1, Math.min(5, v));
      if (tier === 'F') v = 1 + (v - 1) * 0.8;      // Foundation items top out around difficulty 4, so the ladder is squeezed into 1–4
      out.push(v);
    }
    return out;
  }

  function subId(q) { return q.u + ':' + q.s; }
  function isSep(q) { var sb = TAX().subs[subId(q)]; return !!(q.sep || (sb && sb.sepOnly) || (TAX().units[q.u] || {}).sepOnly); }
  function isHtOnly(q) { var sb = TAX().subs[subId(q)]; return q.t === 'H' || !!(sb && sb.htOnly); }

  /* Why a question is excluded, or null if it is eligible. (Selection of subtopics is checked separately.) */
  function exclusion(q, cfg) {
    if (q.bd && q.bd !== (cfg.board === 'Edexcel' ? 'E' : 'A')) return 'board';
    if (cfg.course === 'combined' && isSep(q)) return 'course';
    if (cfg.tier === 'F' && isHtOnly(q)) return 'tier';
    return null;
  }

  function normText(s) { return String(s).toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim(); }

  /* Eligible questions for the config: spec/course/tier filters, selected subtopics, duplicates removed. */
  function pool(bank, cfg) {
    var chosen = {};
    (cfg.subs || []).forEach(function (s) { chosen[s] = true; });
    var seenId = {}, seenText = {}, out = [];
    for (var i = 0; i < bank.length; i++) {
      var q = bank[i];
      if (!chosen[subId(q)]) continue;
      if (exclusion(q, cfg)) continue;
      var nt = normText(q.q);
      if (seenId[q.id] || seenText[nt]) continue;
      seenId[q.id] = seenText[nt] = true;
      out.push(q);
    }
    return out;
  }

  /* Counts for the setup screen: how many questions each subtopic / unit / subject has under the course,
     board and tier filters (whether or not it is currently ticked), plus difficulty histogram of the ticked pool. */
  function availability(bank, cfg) {
    var all = {};
    (cfg.subs || []).length; // (touch)
    var base = {}, bySub = {}, byUnit = {}, bySubj = {};
    var seenId = {}, seenText = {};
    bank.forEach(function (q) {
      if (exclusion(q, cfg)) return;
      var nt = normText(q.q);
      if (seenId[q.id] || seenText[nt]) return;
      seenId[q.id] = seenText[nt] = true;
      var sid = subId(q);
      bySub[sid] = (bySub[sid] || 0) + 1;
      byUnit[q.u] = (byUnit[q.u] || 0) + 1;
      var subj = q.u.charAt(0);
      bySubj[subj] = (bySubj[subj] || 0) + 1;
    });
    var chosen = pool(bank, cfg);
    var hist = [0, 0, 0, 0, 0, 0];
    var chosenBySubj = {}, chosenByUnit = {};
    chosen.forEach(function (q) {
      hist[q.d]++;
      chosenBySubj[q.u.charAt(0)] = (chosenBySubj[q.u.charAt(0)] || 0) + 1;
      chosenByUnit[q.u] = (chosenByUnit[q.u] || 0) + 1;
    });
    return { bySub: bySub, byUnit: byUnit, bySubj: bySubj, chosen: chosen.length, hist: hist, chosenBySubj: chosenBySubj, chosenByUnit: chosenByUnit };
  }

  /* ---------- building a game ---------- */
  function shuffleInPlace(a, rng) {
    for (var i = a.length - 1; i > 0; i--) {
      var j = Math.floor(rng() * (i + 1));
      var t = a[i]; a[i] = a[j]; a[j] = t;
    }
    return a;
  }

  /* Plan where the correct answer sits: each of A–D roughly equally often, never three in a row. */
  function planPositions(n, rng) {
    var seq = [];
    while (seq.length < n) shuffleInPlace([0, 1, 2, 3].slice(), rng).forEach(function (x) { seq.push(x); });
    seq = seq.slice(0, n);
    for (var i = 2; i < n; i++) {
      if (seq[i] === seq[i - 1] && seq[i] === seq[i - 2]) {
        var j = i + 1;
        while (j < n && seq[j] === seq[i]) j++;
        if (j < n) { var t = seq[i]; seq[i] = seq[j]; seq[j] = t; }
        else { seq[i] = (seq[i] + 1) % 4; }
      }
    }
    return seq;
  }

  /* Turn a bank entry into a playable question with options shuffled around a planned correct position. */
  function prepare(q, pos, rng, cfg) {
    var options, correct, lure;
    if (q.ord) {
      options = q.o.slice(); correct = q.a; lure = null;
      // best wrong answer is whichever the author listed as o[lure]; fall back to nothing
      if (q.lure != null) lure = q.lure;
    } else {
      var wrongs = q.o.slice(1);
      var lureText = wrongs[0];
      shuffleInPlace(wrongs, rng);
      options = [];
      var wi = 0;
      for (var i = 0; i < 4; i++) options.push(i === pos ? q.o[0] : wrongs[wi++]);
      correct = pos;
      lure = options.indexOf(lureText);
    }
    var ref = SSM.specRef ? SSM.specRef(q.u, cfg.board, cfg.course) : '';
    return {
      id: q.id, unit: q.u, sub: subId(q), subLabel: (TAX().subs[subId(q)] || {}).label || '', text: q.q, options: options,
      correct: correct, lure: lure, diff: q.d, tier: q.t, kind: q.k, expl: q.w || '', ref: ref,
      tbl: q.tbl || null, fig: q.fig || null
    };
  }

  /* Build the question sequence. Returns { ok, questions, errors, warnings, info, stats }. */
  function build(bank, cfg) {
    var length = cfg.length || 15;
    var rng = SSM.rand.rngFor(cfg.seed == null ? 1 : cfg.seed, 'select');
    var P = pool(bank, cfg);
    var res = { ok: false, questions: [], errors: [], warnings: [], info: [], stats: {} };
    var tg = targets(length, cfg.difficulty || 'standard', cfg.tier);

    if (!(cfg.subs && cfg.subs.length)) { res.errors.push('No topics selected. Tick at least one topic to build a game.'); return res; }
    if (P.length < length) {
      res.errors.push('Only ' + P.length + ' question' + (P.length === 1 ? '' : 's') + ' match this selection, but a ' + length + '-question game needs ' + length + '.');
      res.stats.pool = P.length;
      return res;
    }

    // remaining questions, grouped by unit
    var byUnit = {};
    P.forEach(function (q) { (byUnit[q.u] = byUnit[q.u] || []).push(q); });
    var units = Object.keys(byUnit);
    var subjWeight = {};
    units.forEach(function (u) { var s = u.charAt(0); subjWeight[s] = (subjWeight[s] || 0) + 1; });
    Object.keys(subjWeight).forEach(function (s) { subjWeight[s] = Math.min(3, subjWeight[s]); });
    var subjCount = {}, unitCount = {}, subCount = {};
    var chosen = [], prevUnit = null;

    function cost(q, target) {
      var c = Math.abs(q.d - target);
      if (cfg.tier === 'H' && target >= 3 && q.t === 'F') c += 0.4;      // Higher game: prefer higher-tier items up the ladder
      if (cfg.tier === 'H' && target >= 2.2 && q.t === 'F' && q.d <= 2) c += 0.3;
      c += (subCount[subId(q)] || 0) * 0.35;                              // spread across subtopics
      return c + rng() * 0.25;
    }

    for (var i = 0; i < length; i++) {
      var target = tg[i];
      var subjs = Object.keys(subjWeight).filter(function (s) {
        return units.some(function (u) { return u.charAt(0) === s && byUnit[u].length; });
      });
      // subject with the lowest count relative to its weight
      var bestS = null, bestSv = Infinity;
      subjs.forEach(function (s) {
        var v = (subjCount[s] || 0) / subjWeight[s] + rng() * 0.01;
        if (v < bestSv) { bestSv = v; bestS = s; }
      });
      var bestU = null, bestQ = null, bestScore = Infinity;
      units.forEach(function (u) {
        if (u.charAt(0) !== bestS || !byUnit[u].length) return;
        var qBest = null, cBest = Infinity;
        byUnit[u].forEach(function (q) { var c = cost(q, target); if (c < cBest) { cBest = c; qBest = q; } });
        var score = (unitCount[u] || 0) * 0.7 + cBest + (u === prevUnit ? 0.6 : 0);
        if (score < bestScore) { bestScore = score; bestU = u; bestQ = qBest; }
      });
      byUnit[bestU] = byUnit[bestU].filter(function (q) { return q !== bestQ; });
      chosen.push(bestQ);
      prevUnit = bestU;
      subjCount[bestS] = (subjCount[bestS] || 0) + 1;
      unitCount[bestU] = (unitCount[bestU] || 0) + 1;
      subCount[subId(bestQ)] = (subCount[subId(bestQ)] || 0) + 1;
    }

    // Difficulty must never fall as the player climbs: stable sort by difficulty, then break up same-unit neighbours.
    chosen = chosen.map(function (q, i) { return { q: q, i: i }; })
      .sort(function (a, b) { return a.q.d - b.q.d || a.i - b.i; })
      .map(function (x) { return x.q; });
    function clash(arr, i) {
      return (i > 0 && arr[i].u === arr[i - 1].u ? 1 : 0) + (i < arr.length - 1 && arr[i].u === arr[i + 1].u ? 1 : 0);
    }
    for (var a = 1; a < chosen.length; a++) {
      if (chosen[a].u !== chosen[a - 1].u) continue;
      for (var b = 0; b < chosen.length; b++) {
        if (b === a || chosen[b].d !== chosen[a].d) continue;   // same difficulty keeps the order monotone
        var before = clash(chosen, a) + clash(chosen, b);
        var tmp = chosen[a]; chosen[a] = chosen[b]; chosen[b] = tmp;
        if (clash(chosen, a) + clash(chosen, b) < before) break;
        tmp = chosen[a]; chosen[a] = chosen[b]; chosen[b] = tmp;
      }
    }

    var pos = planPositions(length, SSM.rand.rngFor(cfg.seed == null ? 1 : cfg.seed, 'positions'));
    var orng = SSM.rand.rngFor(cfg.seed == null ? 1 : cfg.seed, 'options');
    res.questions = chosen.map(function (q, i) { return prepare(q, pos[i], orng, cfg); });

    // statistics + warnings
    var dev = 0, worst = 0;
    chosen.forEach(function (q, i) { var d = Math.abs(q.d - tg[i]); dev += d; worst = Math.max(worst, d); });
    var topCount = Math.max(1, Math.round(length / 3));
    var topDiff = chosen.slice(-topCount).reduce(function (a, q) { return a + q.d; }, 0) / topCount;
    var topTarget = tg.slice(-topCount).reduce(function (a, b) { return a + b; }, 0) / topCount;
    var subjUsed = {}; chosen.forEach(function (q) { subjUsed[q.u.charAt(0)] = (subjUsed[q.u.charAt(0)] || 0) + 1; });
    res.stats = { pool: P.length, meanDeviation: dev / length, worstDeviation: worst, subjects: subjUsed, units: unitCount, targets: tg };

    if (topDiff < topTarget - 0.9) res.warnings.push('This selection has few hard questions, so the top of the ladder will be easier than usual. Add more topics for a tougher finish.');
    if (P.length < length * 2) res.warnings.push('Only ' + P.length + ' questions match, so replaying this selection will repeat most of them. Add topics for more variety.');
    var wantSubj = Object.keys(subjWeight).length;
    if (wantSubj > 1) {
      var minS = Math.min.apply(null, Object.keys(subjWeight).map(function (s) { return subjUsed[s] || 0; }));
      if (minS === 0) res.warnings.push('One of the chosen subjects has no questions under these settings, so it will not appear.');
    }
    var picked = {}; (cfg.subs || []).forEach(function (s) { picked[SSM.TAX.subs[s] ? SSM.TAX.subs[s].unit.charAt(0) : '?'] = true; });
    Object.keys(picked).forEach(function (s) { if (!subjUsed[s]) res.warnings.push((s === 'B' ? 'Biology' : s === 'C' ? 'Chemistry' : 'Physics') + ' topics are selected but none have questions for this board, course and tier, so they will not appear.'); });
    res.ok = true;
    return res;
  }

  SSM.select = { targets: targets, pool: pool, availability: availability, build: build, exclusion: exclusion, isSep: isSep, planPositions: planPositions, subId: subId, CURVE15: CURVE15 };
})(typeof window !== 'undefined' ? window : globalThis);
