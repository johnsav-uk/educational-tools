/* Who Wants to Be a Science Millionaire? — lifeline simulations.
   Everything is local and seeded: the same game seed gives the same audience and the same friend,
   and nothing calls out to a service. Each function takes the prepared question (options shuffled,
   q.correct = index of the right answer, q.lure = index of its most tempting wrong answer, q.diff 1–5),
   the options 50:50 has already removed, and a seeded rng. */
(function (root) {
  'use strict';
  var SSM = root.SSM = root.SSM || {};

  function clamp(x, lo, hi) { return Math.max(lo, Math.min(hi, x)); }
  function alive(elim) { return [0, 1, 2, 3].filter(function (i) { return elim.indexOf(i) === -1; }); }
  function wrongAlive(q, elim) { return alive(elim).filter(function (i) { return i !== q.correct; }); }
  function pick(arr, rng) { return arr[Math.floor(rng() * arr.length)]; }
  function normal(rng) { return (rng() + rng() + rng() + rng() - 2) / 0.5774; }   // ≈ N(0,1)·~1

  /* ---------- 50:50 ----------
     Keeps the correct answer and one wrong answer. The tempting wrong answer is kept 70% of the time,
     so on a hard question the choice that is left is a genuine dilemma. */
  function fifty(q, rng) {
    var wrong = [0, 1, 2, 3].filter(function (i) { return i !== q.correct; });
    var keep;
    if (q.lure != null && q.lure !== q.correct && rng() < 0.7) keep = q.lure;
    else keep = pick(wrong, rng);
    return wrong.filter(function (i) { return i !== keep; });
  }

  /* ---------- Ask the Audience ----------
     The correct answer's share falls as difficulty rises, with noise; some of the time on harder questions
     the room is led astray by the tempting wrong answer. Shares are whole percentages summing to 100. */
  var AUD_BASE = [0, 0.82, 0.72, 0.60, 0.50, 0.42];
  var AUD_MISLEAD = [0, 0.01, 0.03, 0.07, 0.13, 0.20];

  function toPercent(weights) {
    // largest-remainder rounding so the total is exactly 100
    var sum = weights.reduce(function (a, b) { return a + b; }, 0);
    var raw = weights.map(function (w) { return sum ? w / sum * 100 : 0; });
    var floor = raw.map(Math.floor);
    var left = 100 - floor.reduce(function (a, b) { return a + b; }, 0);
    var order = raw.map(function (r, i) { return { i: i, f: r - Math.floor(r) }; }).sort(function (a, b) { return b.f - a.f || a.i - b.i; });
    for (var k = 0; k < left; k++) floor[order[k].i]++;
    return floor;
  }

  function audience(q, elim, rng) {
    var d = clamp(q.diff || 3, 1, 5);
    var liveWrong = wrongAlive(q, elim);
    var nAlive = liveWrong.length + 1;
    var p = AUD_BASE[d] + normal(rng) * 0.06;
    if (nAlive === 2) p = p + (1 - p) * 0.45;           // fewer options: the room converges
    var misleading = rng() < AUD_MISLEAD[d] * (nAlive === 2 ? 0.8 : 1);
    var lure = (q.lure != null && liveWrong.indexOf(q.lure) !== -1) ? q.lure : pick(liveWrong, rng);
    if (misleading) p = 0.14 + rng() * 0.14;
    p = clamp(p, 0.1, 0.94);

    var w = [0, 0, 0, 0];
    w[q.correct] = p;
    var rest = 1 - p;
    // the tempting wrong answer takes the lion's share of the remainder; the rest is shared with noise
    var lureShare = liveWrong.length === 1 ? 1 : (misleading ? 0.72 : 0.5) + (rng() - 0.5) * 0.1;
    var others = liveWrong.filter(function (i) { return i !== lure; });
    w[lure] = rest * lureShare;
    var remainder = rest - w[lure];
    var noise = others.map(function () { return 0.6 + rng() * 0.8; });
    var nsum = noise.reduce(function (a, b) { return a + b; }, 0) || 1;
    others.forEach(function (i, k) { w[i] = remainder * noise[k] / nsum; });
    if (misleading && w[lure] <= w[q.correct]) { var t = w[lure]; w[lure] = w[q.correct] + 0.04; w[q.correct] = t; }

    var pct = toPercent(w);
    return { shares: pct, misleading: !!(misleading && pct[lure] > pct[q.correct]) };
  }

  /* ---------- Phone a Friend ---------- */
  var PERSONAS = [
    { name: 'Priya', role: 'a Year 11 who runs the science club' },
    { name: 'Marcus', role: 'your cousin, a first-year biochemist' },
    { name: 'Ms Okafor', role: 'a retired science technician' },
    { name: 'Jamie', role: 'a friend from the school quiz team' },
    { name: 'Dr Lindqvist', role: 'a neighbour who works in a lab' }
  ];
  var FR_BASE = [0, 0.95, 0.86, 0.72, 0.56, 0.42];
  var LETTERS = ['A', 'B', 'C', 'D'];

  function firstSentence(s) {
    s = String(s || '').replace(/\s+/g, ' ').trim();
    var m = s.match(/^.*?[.!?](?=\s|$)/);
    return (m ? m[0] : s);
  }
  function lc(s) { return s ? s.charAt(0).toLowerCase() + s.slice(1) : s; }

  function friend(q, elim, rng) {
    var d = clamp(q.diff || 3, 1, 5);
    var persona = pick(PERSONAS, rng);
    var liveWrong = wrongAlive(q, elim);
    var nAlive = liveWrong.length + 1;
    var p = FR_BASE[d];
    if (nAlive === 2) p = p + (1 - p) * 0.4;
    var right = rng() < p;
    var lure = (q.lure != null && liveWrong.indexOf(q.lure) !== -1) ? q.lure : pick(liveWrong, rng);
    var answer = right ? q.correct : lure;

    // confidence: usually tracks difficulty, but a friend can be confidently wrong
    var confScore = (right ? 0.9 : 0.5) - d * 0.12 + (rng() - 0.5) * 0.3;
    var confidence = confScore > 0.5 ? 'high' : confScore > 0.2 ? 'medium' : 'low';
    var letter = LETTERS[answer];
    var text = q.options[answer];
    var expl = firstSentence(q.expl);
    var lines = [];
    var open = pick(['Hi, it’s ' + persona.name + '.', persona.name + ' here.', 'Hello? It’s ' + persona.name + '.'], rng);
    lines.push(open + ' Let me have a look at this one.');
    if (confidence === 'high') {
      lines.push(pick(['I know this one. It’s ' + letter + ': ' + text + '.', 'That’s ' + letter + ', ' + text + '. I’m confident.'], rng));
      if (right && expl) lines.push('The way I remember it: ' + lc(expl));
      else lines.push('We went over exactly this in revision. Go with ' + letter + '.');
    } else if (confidence === 'medium') {
      lines.push(pick(['I’m leaning towards ' + letter + ', ' + text + '.', 'I think it’s ' + letter + ': ' + text + '. Probably.'], rng));
      if (right && expl) lines.push('That matches what I remember: ' + lc(expl));
      else lines.push('The others don’t ring a bell, but I wouldn’t bet the house on it.');
    } else {
      lines.push(pick(['Ooh, that’s a tricky one. If I had to guess, ' + letter + ', ' + text + '.', 'I’m really not sure. My gut says ' + letter + ': ' + text + '.'], rng));
      lines.push('Maybe 50-50 on that. Don’t take my word as gospel.');
    }
    lines.push(pick(['Good luck!', 'Hope that helps. Good luck!', 'Sorry I can’t be more certain. Good luck!'], rng));
    if (confidence === 'high') lines[lines.length - 1] = 'Good luck!';
    return { persona: persona, answer: answer, confidence: confidence, lines: lines, correct: right };
  }

  SSM.lifelines = { fifty: fifty, audience: audience, friend: friend, toPercent: toPercent, PERSONAS: PERSONAS, LETTERS: LETTERS };
})(typeof window !== 'undefined' ? window : globalThis);
