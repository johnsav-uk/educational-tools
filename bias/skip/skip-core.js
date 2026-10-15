/* Over to you, skip: the daily puzzle's pure logic.
   No page, no physics: the page (skip.js), the tests, the benchmark script and the
   stats Worker all load this one file, so the rules for dates, stars, streaks and
   events are written once.

   Loaded as a plain script it sets window.SkipCore; required or imported (Node,
   the Worker's bundler) it is the module's export. */
(function (root) {
  'use strict';

  // ---------- dates: everyone in the UK gets the same puzzle ----------
  const TZ = 'Europe/London';
  const START = '2026-10-15';        // puzzle #1
  const DAY = 86400000;

  const fmt = new Intl.DateTimeFormat('en-CA', { timeZone: TZ, year: 'numeric', month: '2-digit', day: '2-digit' });
  // 'YYYY-MM-DD' for an instant, as a clock in London reads it
  function londonDate(ms) {
    const p = {}; for (const x of fmt.formatToParts(new Date(ms))) p[x.type] = x.value;
    return `${p.year}-${p.month}-${p.day}`;
  }
  const dayNum = d => { const [y, m, dd] = d.split('-').map(Number); return Math.round(Date.UTC(y, m - 1, dd) / DAY); };
  const daysBetween = (a, b) => dayNum(b) - dayNum(a);
  function addDays(d, n) { const t = new Date((dayNum(d) + n) * DAY); return t.toISOString().slice(0, 10); }
  const isDate = d => typeof d === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(d) && addDays(d, 0) === d;

  // The issue number printed on the sheet and in the share text: #1 on the start date.
  const issueNumber = (date, start = START) => daysBetween(start, date) + 1;
  // The day's puzzle: the list in order, round and round. Before the start date it shows #1.
  function puzzleIndex(date, count, start = START) {
    if (!count) return -1;
    const i = Math.max(0, daysBetween(start, date));
    return i % count;
  }
  // The instant the London date next changes. The clocks change at 01:00 UTC, never at midnight,
  // so every London midnight exists exactly once (whether the day is 23, 24 or 25 hours long).
  function nextLondonMidnight(ms) {
    const tomorrow = addDays(londonDate(ms), 1), base = dayNum(tomorrow) * DAY;
    for (const off of [0, 1, -1]) {   // London is UTC+0 or UTC+1
      const t = base - off * 3600000;
      if (londonDate(t) === tomorrow && londonDate(t - 1) !== tomorrow) return t;
    }
    return base;
  }
  function countdown(ms) {
    const left = Math.max(0, nextLondonMidnight(ms) - ms), mins = Math.ceil(left / 60000);
    const h = Math.floor(mins / 60), m = mins % 60;
    return { ms: left, h, m, text: h ? `${h}h ${String(m).padStart(2, '0')}m` : `${m}m` };
  }

  // ---------- outcomes: what the end looks like after your bowl ----------
  /* Worst to best. "Their count" is how many shots the other side holds. A dead end
     (the jack knocked out of play) is replayed, so nobody scores: it sits with a tie. */
  const OUTCOMES = [
    { key: 'up', label: 'Their count goes up', title: 'Made it worse', detail: 'Your bowl gave them another shot. Sometimes the brave shot does that.', scribble: "ouch. that's one more for them" },
    { key: 'same', label: 'Their count stays', title: 'No change', detail: 'They still hold the same count. Your bowl did not get in among them.', scribble: 'needed to be in there, skip' },
    { key: 'down', label: 'Their count comes down', title: 'Cut it down', detail: 'They still score, but fewer. That might be enough to stay in the match.', scribble: 'saved a couple. not bad.' },
    { key: 'level', label: 'Tied or dead end', title: 'End saved', detail: 'Nobody scores this end. From where you started, that is a rescue.', scribble: 'phew. live to fight on' },
    { key: 'win1', label: 'You score 1', title: 'Turned it round', detail: 'You hold shot. One down to one up with a single bowl.', scribble: "that's the shot!" },
    { key: 'win2', label: 'You score 2', title: 'Two for us', detail: 'You hold two shots after being down. The head is yours.', scribble: 'brilliant. two!' },
    { key: 'win3', label: 'You score 3', title: 'Three for us', detail: 'Three shots from a losing head. A skip remembers that one.', scribble: 'they will talk about that' },
    { key: 'win4', label: 'You score 4', title: 'Four for us', detail: 'Four or more shots with the last bowl. As good as it gets.', scribble: 'drinks are on you' }
  ];
  const OUTCOME_KEYS = OUTCOMES.map(o => o.key);
  const SAVED = new Set(['level', 'win1', 'win2', 'win3', 'win4']);

  /* before / after: { winner: 0 | 1 | null, shots, dead } as Rules.score reports it, with
     dead = true for a dead end. `me` is the player's side. */
  function oppCount(s, me) { return s && !s.dead && s.winner != null && s.winner !== me ? s.shots : 0; }
  function outcomeOf(before, after, me) {
    if (after.dead || after.winner == null) return 'level';
    if (after.winner === me) return 'win' + Math.min(4, Math.max(1, after.shots));
    const b = oppCount(before, me), a = after.shots;
    return a > b ? 'up' : a === b ? 'same' : 'down';
  }
  const isSaved = key => SAVED.has(key);
  const outcomeInfo = (key, overrides) => Object.assign({}, OUTCOMES.find(o => o.key === key) || OUTCOMES[0], overrides && overrides[key] || {});

  // ---------- stars: how you did against the benchmark's hundred bowlers ----------
  /* `bench` is the value of each of the benchmark's deliveries (higher is better for you).
     Matching or beating the top 10% is five stars; below that, half a star for every 9% of
     the field you match or beat. Ties count in your favour. */
  const EPS = 1e-6;
  function beatShare(value, bench) {
    if (!bench || !bench.length) return 0;
    let n = 0; for (const b of bench) if (b <= value + EPS) n++;
    return n / bench.length;
  }
  function starsFor(value, bench) {
    const p = beatShare(value, bench);
    if (p >= 0.9) return 5;
    return Math.floor(p / 0.09 + 1e-9) * 0.5;
  }
  const isStars = s => typeof s === 'number' && s >= 0 && s <= 5 && Number.isInteger(s * 2);
  function starText(s) {
    const full = Math.floor(s), half = s - full >= 0.5;
    return '★'.repeat(full) + (half ? '½' : '') + '☆'.repeat(5 - full - (half ? 1 : 0));
  }
  const starWords = s => `${s} star${s === 1 ? '' : 's'} out of 5`;
  function shareText(issue, stars, url) {
    return `Over to you skip #${issue} ${starText(stars)}` + (url ? `\n${url}` : '');
  }

  // ---------- local stats: kept on the player's device only ----------
  const STATS_KEY = 'bias.skip';
  function freshStats() { return { v: 1, lastPlayed: null, streak: 0, best: 0, hist: {}, today: null, viewed: null }; }
  function cleanStats(s) {
    const f = freshStats();
    if (!s || typeof s !== 'object' || s.v !== 1) return f;
    if (isDate(s.lastPlayed)) f.lastPlayed = s.lastPlayed;
    if (Number.isInteger(s.streak) && s.streak >= 0) f.streak = s.streak;
    if (Number.isInteger(s.best) && s.best >= 0) f.best = Math.max(s.best, f.streak);
    if (s.hist && typeof s.hist === 'object') for (const k of Object.keys(s.hist)) if (isStars(+k) && Number.isInteger(s.hist[k]) && s.hist[k] > 0) f.hist[String(+k)] = s.hist[k];
    if (s.today && isDate(s.today.date) && typeof s.today.puzzleId === 'string' && isStars(s.today.stars)) f.today = s.today;
    if (isDate(s.viewed)) f.viewed = s.viewed;
    return f;
  }
  function loadStats(storage) {
    try { return cleanStats(JSON.parse(storage.getItem(STATS_KEY) || 'null')); } catch (e) { return freshStats(); }
  }
  function saveStats(storage, s) { try { storage.setItem(STATS_KEY, JSON.stringify(s)); return true; } catch (e) { return false; } }

  // Days since the player last made a counting attempt, before today's is recorded (null: never).
  const daysSinceLastPlay = (s, date) => s.lastPlayed ? daysBetween(s.lastPlayed, date) : null;
  // The streak as it stands today: it survives until a whole day is missed.
  function currentStreak(s, date) {
    if (!s.lastPlayed) return 0;
    const d = daysBetween(s.lastPlayed, date);
    return d === 0 || d === 1 ? s.streak : 0;
  }
  const playedToday = (s, date) => !!(s.today && s.today.date === date);

  /* The first attempt of the London day counts; later ones are practice and change nothing
     but the practice count. Returns { stats, first }. Never mutates the input. */
  function recordAttempt(s, date, puzzleId, result) {
    const n = JSON.parse(JSON.stringify(s));
    if (playedToday(n, date)) { n.today.practice = (n.today.practice || 0) + 1; return { stats: n, first: false }; }
    const gap = daysSinceLastPlay(n, date);
    n.streak = gap === 1 ? n.streak + 1 : 1;
    n.best = Math.max(n.best, n.streak);
    n.lastPlayed = date;
    const k = String(result.stars); n.hist[k] = (n.hist[k] || 0) + 1;
    n.today = { date, puzzleId, stars: result.stars, outcome: result.outcome, practice: 0 };
    return { stats: n, first: true };
  }
  // A view is counted once per device per day.
  function recordView(s, date) {
    if (s.viewed === date) return { stats: s, first: false };
    return { stats: Object.assign({}, s, { viewed: date }), first: true };
  }

  // ---------- events: what the game may send, and how the server counts it ----------
  /* No names, accounts, ids or anything that recognises a player. The server adds its own
     London date; the client never sends one. Each spec lists the only fields allowed. */
  const PUZZLE_ID = /^[a-z0-9][a-z0-9-]{0,39}$/;
  const dsl = v => v === null || (Number.isInteger(v) && v >= 0 && v <= 3650);
  const EVENTS = {
    puzzle_viewed: { puzzleId: 'id', returning: 'bool', daysSinceLastPlay: 'dsl' },
    puzzle_attempted: { puzzleId: 'id', stars: 'stars', saved: 'bool', isFirstAttemptOfDay: 'bool', streak: 'streak', daysSinceLastPlay: 'dsl' },
    puzzle_replayed: { puzzleId: 'id' },
    result_shared: { puzzleId: 'id' },
    full_match_clicked: { puzzleId: 'id' }
  };
  const CHECK = {
    id: v => typeof v === 'string' && PUZZLE_ID.test(v),
    bool: v => typeof v === 'boolean',
    stars: isStars,
    streak: v => Number.isInteger(v) && v >= 0 && v <= 3650,
    dsl
  };
  function validateEvent(e) {
    if (!e || typeof e !== 'object' || Array.isArray(e)) return { ok: false, why: 'not an object' };
    const spec = EVENTS[e.name];
    if (!spec) return { ok: false, why: 'unknown event' };
    const props = e.props && typeof e.props === 'object' && !Array.isArray(e.props) ? e.props : null;
    if (!props) return { ok: false, why: 'no props' };
    for (const k of Object.keys(e)) if (k !== 'name' && k !== 'props') return { ok: false, why: 'extra field ' + k };
    for (const k of Object.keys(props)) if (!(k in spec)) return { ok: false, why: 'extra prop ' + k };
    for (const [k, type] of Object.entries(spec)) if (!(k in props) || !CHECK[type](props[k])) return { ok: false, why: 'bad ' + k };
    return { ok: true, event: { name: e.name, props: Object.assign({}, props) } };
  }
  function dslBucket(v) { return v == null ? 'new' : v === 0 ? '0' : v === 1 ? '1' : v <= 6 ? '2-6' : '7+'; }
  const DSL_BUCKETS = ['new', '0', '1', '2-6', '7+'];

  /* The counter one valid event adds 1 to. Only these dimensions are ever stored.
     stars are kept as half-stars (0..10). A repeat attempt (not the first of the day)
     is counted under its own name and never reaches the star statistics. */
  function counterFor(ev, day) {
    const p = ev.props, c = { day, puzzle: p.puzzleId, event: ev.name, stars: -1, saved: -1, returning: -1, dsl: '' };
    if (ev.name === 'puzzle_viewed') { c.returning = p.returning ? 1 : 0; c.dsl = dslBucket(p.daysSinceLastPlay); }
    if (ev.name === 'puzzle_attempted') {
      c.dsl = dslBucket(p.daysSinceLastPlay);
      if (p.isFirstAttemptOfDay) { c.stars = Math.round(p.stars * 2); c.saved = p.saved ? 1 : 0; }
      else c.event = 'puzzle_attempted_repeat';
    }
    return c;
  }
  const counterKey = c => [c.day, c.puzzle, c.event, c.stars, c.saved, c.returning, c.dsl].join('|');

  // ---------- reading the counters back: today's tile, and the dashboard ----------
  const TARGETS = {   // rough first guesses, to be edited once real numbers come in
    attemptRate: 0.5,          // attempted ÷ viewed, at least
    nextDayReturn: 0.2,        // today's attempts from yesterday's players ÷ yesterday's attempts, at least
    shareRate: 0.1,            // shares ÷ attempts, at least
    avgStars: [2.0, 3.7],      // average stars (0–5), between
    tooEasy: 0.7,              // a puzzle where more than this share get 5 stars
    tooHard: 0.1,              // a puzzle where fewer than this share get 5 stars
    savedTileMin: 30           // attempts today before the "Saved it, %" tile appears
  };

  // rows: [{ day, puzzle, event, stars, saved, returning, dsl, n }]
  function todaySummary(rows, day, min = TARGETS.savedTileMin) {
    let attempts = 0, saved = 0;
    for (const r of rows) if (r.day === day && r.event === 'puzzle_attempted' && r.stars >= 0) { attempts += r.n; if (r.saved === 1) saved += r.n; }
    return { day, attempts, savedPct: attempts >= min ? Math.round(100 * saved / attempts) : null };
  }

  const ratio = (a, b) => b ? a / b : null;
  function dailyMetrics(rows, endDay, days = 14) {
    const out = [], by = new Map();
    const blank = () => ({ viewed: 0, attempts: 0, starSum: 0, saved: 0, five: 0, replays: 0, repeats: 0, shares: 0, full: 0, fromYesterday: 0 });
    for (const r of rows) {
      if (!by.has(r.day)) by.set(r.day, blank());
      const d = by.get(r.day);
      if (r.event === 'puzzle_viewed') d.viewed += r.n;
      else if (r.event === 'puzzle_attempted' && r.stars >= 0) {
        d.attempts += r.n; d.starSum += r.n * r.stars / 2;
        if (r.saved === 1) d.saved += r.n; if (r.stars === 10) d.five += r.n;
        if (r.dsl === '1') d.fromYesterday += r.n;
      }
      else if (r.event === 'puzzle_attempted_repeat') d.repeats += r.n;
      else if (r.event === 'puzzle_replayed') d.replays += r.n;
      else if (r.event === 'result_shared') d.shares += r.n;
      else if (r.event === 'full_match_clicked') d.full += r.n;
    }
    for (let i = days - 1; i >= 0; i--) {
      const day = addDays(endDay, -i), d = by.get(day) || blank(), prev = by.get(addDays(day, -1)) || blank();
      out.push({ day, viewed: d.viewed, attempts: d.attempts,
        attemptRate: ratio(d.attempts, d.viewed), avgStars: ratio(d.starSum, d.attempts), savedRate: ratio(d.saved, d.attempts),
        replaysPerAttempt: ratio(d.replays, d.attempts), sharesPerAttempt: ratio(d.shares, d.attempts), fullPerAttempt: ratio(d.full, d.attempts),
        nextDayReturn: ratio(d.fromYesterday, prev.attempts) });
    }
    return out;
  }
  // Star bands for the per-puzzle table: 0–½, 1–1½, 2–2½, 3–3½, 4–4½, 5
  const BANDS = ['0', '1', '2', '3', '4', '5'];
  function puzzleMetrics(rows, targets = TARGETS) {
    const by = new Map();
    for (const r of rows) {
      if (!by.has(r.puzzle)) by.set(r.puzzle, { puzzle: r.puzzle, viewed: 0, attempted: 0, bands: [0, 0, 0, 0, 0, 0], starSum: 0, five: 0, saved: 0 });
      const p = by.get(r.puzzle);
      if (r.event === 'puzzle_viewed') p.viewed += r.n;
      if (r.event === 'puzzle_attempted' && r.stars >= 0) {
        p.attempted += r.n; p.bands[Math.floor(r.stars / 2)] += r.n; p.starSum += r.n * r.stars / 2;
        if (r.stars === 10) p.five += r.n; if (r.saved === 1) p.saved += r.n;
      }
    }
    return [...by.values()].map(p => {
      const fiveShare = ratio(p.five, p.attempted);
      return Object.assign(p, { avgStars: ratio(p.starSum, p.attempted), fiveShare, savedShare: ratio(p.saved, p.attempted),
        flag: fiveShare == null ? '' : fiveShare > targets.tooEasy ? 'too easy' : fiveShare < targets.tooHard ? 'too hard' : '' });
    }).sort((a, b) => b.attempted - a.attempted || (a.puzzle < b.puzzle ? -1 : 1));
  }
  // The verdict box: each headline number over the period against its target.
  function verdict(daily, targets = TARGETS) {
    const sum = k => daily.reduce((a, d) => a + (d[k] || 0), 0);
    const attempts = sum('attempts'), viewed = sum('viewed');
    const w = (k) => { let n = 0, t = 0; for (const d of daily) if (d[k] != null) { n += d[k] * d.attempts; t += d.attempts; } return t ? n / t : null; };
    let ret = 0, prev = 0;
    for (let i = 1; i < daily.length; i++) if (daily[i].nextDayReturn != null) { ret += daily[i].nextDayReturn * daily[i - 1].attempts; prev += daily[i - 1].attempts; }
    const rows = [
      { key: 'attemptRate', label: 'Attempt rate', value: ratio(attempts, viewed), target: `at least ${pct(targets.attemptRate)}`, ok: v => v >= targets.attemptRate, fmt: pct },
      { key: 'nextDayReturn', label: 'Next-day return', value: ratio(ret, prev), target: `at least ${pct(targets.nextDayReturn)}`, ok: v => v >= targets.nextDayReturn, fmt: pct },
      { key: 'shareRate', label: 'Share rate', value: w('sharesPerAttempt'), target: `at least ${pct(targets.shareRate)}`, ok: v => v >= targets.shareRate, fmt: pct },
      { key: 'avgStars', label: 'Average stars', value: w('avgStars'), target: `${targets.avgStars[0]}–${targets.avgStars[1]}`, ok: v => v >= targets.avgStars[0] && v <= targets.avgStars[1], fmt: v => v.toFixed(2) }
    ];
    return rows.map(r => ({ key: r.key, label: r.label, target: r.target, value: r.value, shown: r.value == null ? '–' : r.fmt(r.value), met: r.value == null ? null : r.ok(r.value) }));
  }
  function pct(v) { return v == null ? '–' : Math.round(v * 100) + '%'; }

  const COUNTER_COLUMNS = ['day', 'puzzle', 'event', 'stars', 'saved', 'returning', 'dsl', 'n'];
  function toCsv(rows) {
    const q = v => { const s = String(v == null ? '' : v); return /[",\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s; };
    return [COUNTER_COLUMNS.join(','), ...rows.map(r => COUNTER_COLUMNS.map(c => q(c === 'stars' && r.stars >= 0 ? r.stars / 2 : r[c])).join(','))].join('\n') + '\n';
  }

  const api = {
    TZ, START, londonDate, addDays, daysBetween, isDate, issueNumber, puzzleIndex, nextLondonMidnight, countdown,
    OUTCOMES, OUTCOME_KEYS, outcomeOf, oppCount, isSaved, outcomeInfo,
    beatShare, starsFor, isStars, starText, starWords, shareText,
    STATS_KEY, freshStats, cleanStats, loadStats, saveStats, daysSinceLastPlay, currentStreak, playedToday, recordAttempt, recordView,
    EVENTS, validateEvent, dslBucket, DSL_BUCKETS, counterFor, counterKey,
    TARGETS, todaySummary, dailyMetrics, puzzleMetrics, verdict, pct, BANDS, COUNTER_COLUMNS, toCsv
  };
  if (typeof module === 'object' && module && module.exports) module.exports = api;
  else root.SkipCore = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);
