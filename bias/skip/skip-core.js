/* Over to You, Skip!: the daily puzzle's pure logic.
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
  const dateFor = (n, start = START) => addDays(start, n - 1);
  /* The rotation the first puzzles were served by: the hand-made list, round and round.
     Kept only as the back-fill rule, so #1… keep exactly the heads players saw on their day. */
  function puzzleIndex(date, count, start = START) {
    if (!count) return -1;
    const i = Math.max(0, daysBetween(start, date));
    return i % count;
  }

  /* ---------- the puzzle day: 06:00 to 06:00 London ----------
     A new puzzle comes out at 06:00 London time, so at 01:00 on the 20th the puzzle is still
     the 19th's. Worked out from London's own wall clock, never by taking six hours off UTC,
     which is an hour out on the two nights the clocks change. Until SWITCH the day changed
     at midnight: the puzzle released at midnight on the day before SWITCH runs to 06:00 on
     SWITCH, so no number ever goes backwards. */
  const RELEASE_HOUR = 6;
  const SWITCH = '2026-10-17';
  const fmtH = new Intl.DateTimeFormat('en-CA', { timeZone: TZ, year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', hourCycle: 'h23' });
  function londonParts(ms) {
    const p = {}; for (const x of fmtH.formatToParts(new Date(ms))) p[x.type] = x.value;
    return { date: `${p.year}-${p.month}-${p.day}`, hour: +p.hour % 24 };
  }
  function puzzleDay(ms) {
    const p = londonParts(ms);
    return p.hour < RELEASE_HOUR && p.date >= SWITCH ? addDays(p.date, -1) : p.date;
  }

  /* ---------- the catalogue: one puzzle per puzzle day, numbered by date ----------
     #N is released on START + (N − 1) days, so share links, stats and the archive always agree.
     skip/puzzles/index.json lists the released puzzles ({ n, date, id, title, … }), and
     skip/puzzles/NNNN.json holds each one in full. */
  const pad4 = n => String(n).padStart(4, '0');
  const puzzleFile = n => pad4(n) + '.json';
  const generatedId = n => 'skip-' + pad4(n);
  // Today's entry: the one dated `day`; if a day was missed, the last one released before it. Never a future one.
  function entryFor(list, day) {
    let best = null;
    for (const e of list || []) if (e.date <= day && (!best || e.date > best.date)) best = e;
    return best;
  }
  // An archive puzzle by number: only once its day has come.
  function entryByNumber(list, n, day) {
    const e = (list || []).find(x => x.n === n);
    return e && e.date <= day ? e : null;
  }
  /* The puzzles screen: today's first, then the last 7 days' puzzles this device has not
     played ("New"), newest first; everything else released is the archive, newest first. */
  function listSections(list, day, archive, recent = 7) {
    const today = entryFor(list, day), out = { today, fresh: [], archive: [] };
    const released = (list || []).filter(e => e.date <= day && e !== today).sort((a, b) => b.n - a.n);
    for (const e of released) {
      if (daysBetween(e.date, day) < recent && !(archive && archive[String(e.n)])) out.fresh.push(e);
      else out.archive.push(e);
    }
    return out;
  }
  // A share or deep link: ?skip opens today's puzzle, ?skip=12 opens #12.
  function linkNumber(param) {
    if (param == null) return null;
    const m = /^#?0*(\d{1,5})$/.exec(String(param).trim());
    return m && +m[1] >= 1 ? +m[1] : null;
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
     Matching or beating the tenth-best of a hundred (the top 10%) is five stars. Below that,
     half a star for every 9% of the field you match or beat, up to four and a half. Ties count
     in your favour, and so does a difference under 0.0001 (the stored benchmark is rounded). */
  const EPS = 1e-4;
  function beatShare(value, bench) {
    if (!bench || !bench.length) return 0;
    let n = 0; for (const b of bench) if (b <= value + EPS) n++;
    return n / bench.length;
  }
  const topCut = bench => bench.slice().sort((a, b) => b - a)[Math.max(0, Math.ceil(bench.length * 0.1) - 1)];
  function starsFor(value, bench) {
    if (!bench || !bench.length) return 0;
    if (value + EPS >= topCut(bench)) return 5;
    return Math.min(4.5, Math.floor(beatShare(value, bench) / 0.09 + 1e-9) * 0.5);
  }
  const isStars = s => typeof s === 'number' && s >= 0 && s <= 5 && Number.isInteger(s * 2);
  function starText(s) {
    const full = Math.floor(s), half = s - full >= 0.5;
    return '★'.repeat(full) + (half ? '½' : '') + '☆'.repeat(5 - full - (half ? 1 : 0));
  }
  const starWords = s => `${s} star${s === 1 ? '' : 's'} out of 5`;
  // The day's best, and how many goes it took: five stars first go reads differently from five in ten.
  const goesText = tries => !tries || tries <= 1 ? 'first go' : `in ${tries} goes`;
  const NAME = '“Over to You, Skip!”';   // the name in speech marks: it is what your third says, handing you the last bowl
  function shareText(issue, stars, url, tries) {
    return `${NAME} #${issue} ${starText(stars)}` + (tries ? ` ${goesText(tries)}` : '') + (url ? `\n${url}` : '');
  }

  /* A fingerprint of everything the benchmark depends on, so a puzzle edited without
     re-running tools/benchmark.cjs is noticed (the page warns in the console, the script re-runs it). */
  function headHash(pz) {
    const a = pz.advised || {};
    const s = JSON.stringify([pz.greenSpeed, pz.matRear || null, pz.you, pz.jack, pz.bowls.map(b => [b.team, b.x, b.y].concat(b.ditch ? ['ditch'] : [], b.toucher ? ['toucher'] : [])), pz.match || null,
      [a.hand, a.kind, a.target, a.extra || null, a.drive || null]]);
    let h = 0x811c9dc5;
    for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 0x01000193) >>> 0; }
    return h.toString(16).padStart(8, '0');
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
    if (s.today && isDate(s.today.date) && typeof s.today.puzzleId === 'string' && isStars(s.today.stars)) {
      const t = s.today, tries = Number.isInteger(t.tries) && t.tries >= 1 ? t.tries : 1 + (Number.isInteger(t.practice) ? t.practice : 0);
      f.today = { date: t.date, puzzleId: t.puzzleId, stars: t.stars, outcome: t.outcome, saved: !!t.saved, tries, firstStars: isStars(t.firstStars) ? t.firstStars : t.stars };
    }
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

  /* Every go of the London day counts toward the day's result, which is the best of them.
     The first go starts the day (streak, last played); a later go adds to the count of goes and,
     if it beats the best so far, replaces it. result: { stars, outcome, saved }.
     Returns { stats, first, improved, from } where from is the best before this go.
     Never mutates the input. */
  function recordAttempt(s, date, puzzleId, result) {
    const n = JSON.parse(JSON.stringify(s)), saved = !!result.saved;
    if (playedToday(n, date)) {
      const t = n.today, from = { stars: t.stars, saved: !!t.saved };
      t.tries = (t.tries || 1) + 1;
      const improved = result.stars > t.stars;
      if (improved) {
        const old = String(t.stars), k = String(result.stars);
        if (n.hist[old] > 1) n.hist[old]--; else delete n.hist[old];
        n.hist[k] = (n.hist[k] || 0) + 1;
        Object.assign(t, { stars: result.stars, outcome: result.outcome, saved });
      }
      return { stats: n, first: false, improved, from };
    }
    const gap = daysSinceLastPlay(n, date);
    n.streak = gap === 1 ? n.streak + 1 : 1;
    n.best = Math.max(n.best, n.streak);
    n.lastPlayed = date;
    const k = String(result.stars); n.hist[k] = (n.hist[k] || 0) + 1;
    n.today = { date, puzzleId, stars: result.stars, outcome: result.outcome, saved, tries: 1, firstStars: result.stars };
    return { stats: n, first: true, improved: false, from: null };
  }
  /* Archive puzzles: this device's best stars and goes for each number, kept apart from the
     daily stats so an archive puzzle never touches the streak. Today's puzzle is recorded here
     too, so its result is still shown once it has moved into the archive.
     { "12": { "stars": 4, "tries": 2 } } */
  const ARCHIVE_KEY = 'bias.skip.archive';
  function cleanArchive(a) {
    const out = {};
    if (!a || typeof a !== 'object' || Array.isArray(a)) return out;
    for (const k of Object.keys(a)) {
      const v = a[k];
      if (/^[1-9]\d{0,4}$/.test(k) && v && isStars(v.stars) && Number.isInteger(v.tries) && v.tries >= 1) out[k] = { stars: v.stars, tries: v.tries };
    }
    return out;
  }
  function loadArchive(storage) {
    try { return cleanArchive(JSON.parse(storage.getItem(ARCHIVE_KEY) || 'null')); } catch (e) { return {}; }
  }
  function saveArchive(storage, a) { try { storage.setItem(ARCHIVE_KEY, JSON.stringify(a)); return true; } catch (e) { return false; } }
  // One go at puzzle n. Returns { archive, first, improved, from }; never mutates the input.
  function recordArchive(a, n, stars) {
    const k = String(n), out = Object.assign({}, a), was = a[k];
    if (!was) { out[k] = { stars, tries: 1 }; return { archive: out, first: true, improved: false, from: null }; }
    const improved = stars > was.stars;
    out[k] = { stars: improved ? stars : was.stars, tries: was.tries + 1 };
    return { archive: out, first: false, improved, from: was.stars };
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
    puzzle_improved: { puzzleId: 'id', fromStars: 'stars', toStars: 'stars', wasSaved: 'bool', saved: 'bool' },
    result_shared: { puzzleId: 'id' },
    full_match_clicked: { puzzleId: 'id' },
    archive_played: { puzzleId: 'id', isFirstGo: 'bool' },
    puzzles_list_opened: {}
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
    if (e.name === 'puzzle_improved' && !(props.toStars > props.fromStars)) return { ok: false, why: 'not an improvement' };
    return { ok: true, event: { name: e.name, props: Object.assign({}, props) } };
  }
  function dslBucket(v) { return v == null ? 'new' : v === 0 ? '0' : v === 1 ? '1' : v <= 6 ? '2-6' : '7+'; }
  const DSL_BUCKETS = ['new', '0', '1', '2-6', '7+'];

  /* The counter one valid event adds 1 to. Only these dimensions are ever stored.
     stars are kept as half-stars (0..10). The first go of the day is puzzle_attempted: that is
     the fair measure of a puzzle's difficulty. A later go that beats a player's best is
     puzzle_improved, from one star level to another, so the best of the day can be counted
     without ever knowing who the player is. */
  function counterFor(ev, day) {
    const p = ev.props, c = { day, puzzle: p.puzzleId || '', event: ev.name, stars: -1, saved: -1, returning: -1, dsl: '', from: -1, wasSaved: -1 };
    if (ev.name === 'puzzle_improved') { c.stars = Math.round(p.toStars * 2); c.saved = p.saved ? 1 : 0; c.from = Math.round(p.fromStars * 2); c.wasSaved = p.wasSaved ? 1 : 0; }
    if (ev.name === 'puzzle_viewed') { c.returning = p.returning ? 1 : 0; c.dsl = dslBucket(p.daysSinceLastPlay); }
    if (ev.name === 'puzzle_attempted') {
      c.dsl = dslBucket(p.daysSinceLastPlay);
      if (p.isFirstAttemptOfDay) { c.stars = Math.round(p.stars * 2); c.saved = p.saved ? 1 : 0; }
      else c.event = 'puzzle_attempted_repeat';
    }
    if (ev.name === 'archive_played' && !p.isFirstGo) c.event = 'archive_played_repeat';
    return c;
  }
  const counterKey = c => [c.day, c.puzzle, c.event, c.stars, c.saved, c.returning, c.dsl, c.from, c.wasSaved].join('|');

  // ---------- reading the counters back: today's tile, and the dashboard ----------
  const TARGETS = {   // rough first guesses, to be edited once real numbers come in
    attemptRate: 0.5,          // attempted ÷ viewed, at least
    nextDayReturn: 0.2,        // today's attempts from yesterday's players ÷ yesterday's attempts, at least
    shareRate: 0.1,            // shares ÷ attempts, at least
    avgStars: [2.0, 3.7],      // average stars (0–5), between
    tooEasy: 0.7,              // a puzzle where more than this share get 5 stars first go
    tooHard: 0.1,              // a puzzle where fewer than this share get 5 stars first go
    savedTileMin: 30           // attempts today before the "Saved it, %" tile appears
  };

  // A row's effect on the best-of-day figures: a first go adds a player; an improvement moves one.
  const isFirst = r => r.event === 'puzzle_attempted' && r.stars >= 0;
  const isBetter = r => r.event === 'puzzle_improved' && r.stars >= 0 && r.from >= 0;
  // rows: [{ day, puzzle, event, stars, saved, returning, dsl, from, wasSaved, n }]
  // The tile: of today's players, the share whose best go saved the end.
  function todaySummary(rows, day, min = TARGETS.savedTileMin) {
    let attempts = 0, saved = 0;
    for (const r of rows) {
      if (r.day !== day) continue;
      if (isFirst(r)) { attempts += r.n; if (r.saved === 1) saved += r.n; }
      else if (isBetter(r)) saved += r.n * ((r.saved === 1) - (r.wasSaved === 1));
    }
    return { day, attempts, savedPct: attempts >= min ? Math.round(100 * saved / attempts) : null };
  }

  const ratio = (a, b) => b ? a / b : null;
  function dailyMetrics(rows, endDay, days = 14) {
    const out = [], by = new Map();
    const blank = () => ({ viewed: 0, attempts: 0, starSum: 0, saved: 0, five: 0, replays: 0, repeats: 0, shares: 0, full: 0, fromYesterday: 0, bestSum: 0, bestSaved: 0, archive: 0, archiveGoes: 0, lists: 0 });
    for (const r of rows) {
      if (!by.has(r.day)) by.set(r.day, blank());
      const d = by.get(r.day);
      if (r.event === 'puzzle_viewed') d.viewed += r.n;
      else if (r.event === 'puzzle_attempted' && r.stars >= 0) {
        d.attempts += r.n; d.starSum += r.n * r.stars / 2; d.bestSum += r.n * r.stars / 2;
        if (r.saved === 1) { d.saved += r.n; d.bestSaved += r.n; } if (r.stars === 10) d.five += r.n;
        if (r.dsl === '1') d.fromYesterday += r.n;
      }
      else if (isBetter(r)) { d.bestSum += r.n * (r.stars - r.from) / 2; d.bestSaved += r.n * ((r.saved === 1) - (r.wasSaved === 1)); }
      else if (r.event === 'puzzle_attempted_repeat') d.repeats += r.n;
      else if (r.event === 'puzzle_replayed') d.replays += r.n;
      else if (r.event === 'result_shared') d.shares += r.n;
      else if (r.event === 'full_match_clicked') d.full += r.n;
      else if (r.event === 'archive_played') { d.archive += r.n; d.archiveGoes += r.n; }
      else if (r.event === 'archive_played_repeat') d.archiveGoes += r.n;
      else if (r.event === 'puzzles_list_opened') d.lists += r.n;
    }
    for (let i = days - 1; i >= 0; i--) {
      const day = addDays(endDay, -i), d = by.get(day) || blank(), prev = by.get(addDays(day, -1)) || blank();
      out.push({ day, viewed: d.viewed, attempts: d.attempts,
        attemptRate: ratio(d.attempts, d.viewed), avgStars: ratio(d.starSum, d.attempts), savedRate: ratio(d.saved, d.attempts),
        avgBest: ratio(d.bestSum, d.attempts), bestSavedRate: ratio(d.bestSaved, d.attempts), goesPerPlayer: d.attempts ? 1 + d.replays / d.attempts : null,
        replaysPerAttempt: ratio(d.replays, d.attempts), sharesPerAttempt: ratio(d.shares, d.attempts), fullPerAttempt: ratio(d.full, d.attempts),
        nextDayReturn: ratio(d.fromYesterday, prev.attempts), archivePlays: d.archive, archiveGoes: d.archiveGoes, listsOpened: d.lists });
    }
    return out;
  }
  // Star bands for the per-puzzle table: 0–½, 1–1½, 2–2½, 3–3½, 4–4½, 5
  const BANDS = ['0', '1', '2', '3', '4', '5'];
  function puzzleMetrics(rows, targets = TARGETS) {
    const by = new Map();
    for (const r of rows) {
      if (!r.puzzle) continue;   // events about no one puzzle (the puzzles screen opened)
      if (!by.has(r.puzzle)) by.set(r.puzzle, { puzzle: r.puzzle, viewed: 0, attempted: 0, archive: 0, bands: [0, 0, 0, 0, 0, 0], starSum: 0, five: 0, saved: 0, bestSum: 0, bestFive: 0 });
      const p = by.get(r.puzzle);
      if (r.event === 'puzzle_viewed') p.viewed += r.n;
      if (r.event === 'archive_played') p.archive += r.n;
      if (r.event === 'puzzle_attempted' && r.stars >= 0) {
        p.attempted += r.n; p.bands[Math.floor(r.stars / 2)] += r.n; p.starSum += r.n * r.stars / 2; p.bestSum += r.n * r.stars / 2;
        if (r.stars === 10) { p.five += r.n; p.bestFive += r.n; } if (r.saved === 1) p.saved += r.n;
      }
      if (isBetter(r)) { p.bestSum += r.n * (r.stars - r.from) / 2; p.bestFive += r.n * ((r.stars === 10) - (r.from === 10)); }
    }
    return [...by.values()].map(p => {
      const fiveShare = ratio(p.five, p.attempted);
      return Object.assign(p, { avgStars: ratio(p.starSum, p.attempted), fiveShare, savedShare: ratio(p.saved, p.attempted),
        avgBest: ratio(p.bestSum, p.attempted), bestFiveShare: ratio(p.bestFive, p.attempted),
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
      { key: 'avgStars', label: 'Average stars, first go', value: w('avgStars'), target: `${targets.avgStars[0]}–${targets.avgStars[1]}`, ok: v => v >= targets.avgStars[0] && v <= targets.avgStars[1], fmt: v => v.toFixed(2) }
    ];
    return rows.map(r => ({ key: r.key, label: r.label, target: r.target, value: r.value, shown: r.value == null ? '–' : r.fmt(r.value), met: r.value == null ? null : r.ok(r.value) }));
  }
  function pct(v) { return v == null ? '–' : Math.round(v * 100) + '%'; }

  const COUNTER_COLUMNS = ['day', 'puzzle', 'event', 'stars', 'saved', 'returning', 'dsl', 'from', 'wasSaved', 'n'];
  function toCsv(rows) {
    const q = v => { const s = String(v == null ? '' : v); return /[",\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s; };
    const cell = (r, c) => (c === 'stars' || c === 'from') && r[c] >= 0 ? r[c] / 2 : r[c] == null ? -1 : r[c];
    return [COUNTER_COLUMNS.join(','), ...rows.map(r => COUNTER_COLUMNS.map(c => q(cell(r, c))).join(','))].join('\n') + '\n';
  }

  const api = {
    TZ, START, londonDate, addDays, daysBetween, isDate, issueNumber, dateFor, puzzleIndex, nextLondonMidnight, countdown,
    RELEASE_HOUR, SWITCH, londonParts, puzzleDay, pad4, puzzleFile, generatedId, entryFor, entryByNumber, listSections, linkNumber, NAME,
    OUTCOMES, OUTCOME_KEYS, outcomeOf, oppCount, isSaved, outcomeInfo,
    beatShare, topCut, starsFor, isStars, starText, starWords, goesText, shareText, headHash,
    STATS_KEY, freshStats, cleanStats, loadStats, saveStats, daysSinceLastPlay, currentStreak, playedToday, recordAttempt, recordView,
    ARCHIVE_KEY, cleanArchive, loadArchive, saveArchive, recordArchive,
    EVENTS, validateEvent, dslBucket, DSL_BUCKETS, counterFor, counterKey,
    TARGETS, todaySummary, dailyMetrics, puzzleMetrics, verdict, pct, BANDS, COUNTER_COLUMNS, toCsv
  };
  if (typeof module === 'object' && module && module.exports) module.exports = api;
  else root.SkipCore = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);
