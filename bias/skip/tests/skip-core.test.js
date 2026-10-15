/* Tests for skip-core.js: dates, puzzle choice, outcomes, stars, local stats, events, counters, dashboard maths. */
(function () {
  const C = SkipCore, { test, eq, ok } = T, at = s => Date.parse(s);

  // ---------- dates ----------
  test('London date follows British Summer Time', () => {
    eq(C.londonDate(at('2026-10-15T22:59:59Z')), '2026-10-15');
    eq(C.londonDate(at('2026-10-15T23:00:00Z')), '2026-10-16', 'midnight BST is 23:00 UTC');
  });
  test('London date at midnight after the autumn clock change (25 Oct 2026)', () => {
    eq(C.londonDate(at('2026-10-24T22:59:59Z')), '2026-10-24');
    eq(C.londonDate(at('2026-10-24T23:00:00Z')), '2026-10-25', 'still BST at this midnight');
    eq(C.londonDate(at('2026-10-25T23:59:59Z')), '2026-10-25', 'GMT from 01:00 UTC');
    eq(C.londonDate(at('2026-10-26T00:00:00Z')), '2026-10-26');
  });
  test('London date at midnight around the spring clock change (28 Mar 2027)', () => {
    eq(C.londonDate(at('2027-03-27T23:59:59Z')), '2027-03-27');
    eq(C.londonDate(at('2027-03-28T00:00:00Z')), '2027-03-28', 'GMT at this midnight');
    eq(C.londonDate(at('2027-03-28T22:59:59Z')), '2027-03-28');
    eq(C.londonDate(at('2027-03-28T23:00:00Z')), '2027-03-29', 'BST from 01:00 UTC');
  });
  test('next London midnight, including the 25-hour and 23-hour days', () => {
    eq(new Date(C.nextLondonMidnight(at('2026-10-15T12:00:00Z'))).toISOString(), '2026-10-15T23:00:00.000Z');
    const a = C.nextLondonMidnight(at('2026-10-24T23:00:00Z')), b = C.nextLondonMidnight(a);
    eq(new Date(a).toISOString(), '2026-10-26T00:00:00.000Z', 'the day of the autumn change ends at 00:00 GMT');
    eq((a - at('2026-10-24T23:00:00Z')) / 3600000, 25, 'that day is 25 hours long');
    eq((b - a) / 3600000, 24);
    const s = C.nextLondonMidnight(at('2027-03-28T00:00:00Z'));
    eq((s - at('2027-03-28T00:00:00Z')) / 3600000, 23, 'the spring change day is 23 hours long');
    eq(C.nextLondonMidnight(at('2026-10-15T22:59:59.999Z')), at('2026-10-15T23:00:00Z'), 'one millisecond before');
  });
  test('countdown text', () => {
    eq(C.countdown(at('2026-10-15T16:48:00Z')).text, '6h 12m');
    eq(C.countdown(at('2026-10-15T22:30:00Z')).text, '30m');
    eq(C.countdown(at('2026-10-15T22:59:30Z')).text, '1m', 'rounds up so it never shows 0m early');
  });
  test('issue number: today (15 Oct 2026) is #1', () => {
    eq(C.START, '2026-10-15');
    eq(C.issueNumber('2026-10-15'), 1);
    eq(C.issueNumber('2026-10-16'), 2);
    eq(C.issueNumber('2027-10-15'), 366);
  });
  test('daily puzzle goes round the list, and changes at London midnight', () => {
    eq(C.puzzleIndex('2026-10-15', 5), 0);
    eq(C.puzzleIndex('2026-10-19', 5), 4);
    eq(C.puzzleIndex('2026-10-20', 5), 0);
    eq(C.puzzleIndex('2026-10-01', 5), 0, 'before the start date it shows #1');
    eq(C.puzzleIndex('2026-10-15', 0), -1);
    const before = C.londonDate(at('2026-10-15T22:59:59Z')), after = C.londonDate(at('2026-10-15T23:00:00Z'));
    eq([C.puzzleIndex(before, 5), C.puzzleIndex(after, 5)], [0, 1]);
    // across the autumn change: Saturday 24th → Sunday 25th → Monday 26th, one puzzle each
    const days = ['2026-10-24T22:30:00Z', '2026-10-24T23:30:00Z', '2026-10-25T23:30:00Z', '2026-10-26T00:30:00Z'].map(s => C.londonDate(at(s)));
    eq(days, ['2026-10-24', '2026-10-25', '2026-10-25', '2026-10-26']);
    eq(days.map(d => C.issueNumber(d)), [10, 11, 11, 12]);
  });
  test('date helpers', () => {
    eq(C.addDays('2026-12-31', 1), '2027-01-01');
    eq(C.addDays('2028-03-01', -1), '2028-02-29');
    eq(C.daysBetween('2026-10-24', '2026-10-26'), 2);
    ok(C.isDate('2026-10-15')); ok(!C.isDate('2026-02-30')); ok(!C.isDate('15/10/2026'));
  });

  // ---------- outcomes ----------
  test('outcome classes, worst to best', () => {
    const before = { winner: 1, shots: 3 };
    eq(C.outcomeOf(before, { winner: 1, shots: 4 }, 0), 'up');
    eq(C.outcomeOf(before, { winner: 1, shots: 3 }, 0), 'same');
    eq(C.outcomeOf(before, { winner: 1, shots: 1 }, 0), 'down');
    eq(C.outcomeOf(before, { winner: null, shots: 0 }, 0), 'level', 'measured tie');
    eq(C.outcomeOf(before, { winner: 1, shots: 3, dead: true }, 0), 'level', 'dead end');
    eq(C.outcomeOf(before, { winner: 0, shots: 1 }, 0), 'win1');
    eq(C.outcomeOf(before, { winner: 0, shots: 3 }, 0), 'win3');
    eq(C.outcomeOf(before, { winner: 0, shots: 6 }, 0), 'win4', 'four or more');
    eq(C.outcomeOf({ winner: 0, shots: 1 }, { winner: 1, shots: 1 }, 0), 'up', 'from holding shot to losing one');
    eq(C.OUTCOME_KEYS, ['up', 'same', 'down', 'level', 'win1', 'win2', 'win3', 'win4']);
  });
  test('saved means they no longer score', () => {
    eq(C.OUTCOME_KEYS.filter(C.isSaved), ['level', 'win1', 'win2', 'win3', 'win4']);
  });
  test('outcome wording can be overridden per puzzle', () => {
    eq(C.outcomeInfo('win1').title, 'Turned it round');
    eq(C.outcomeInfo('win1', { win1: { title: 'Wicked it in' } }).title, 'Wicked it in');
    eq(C.outcomeInfo('win1', { win1: { title: 'Wicked it in' } }).scribble, "that's the shot!", 'unset fields keep the default');
  });

  // ---------- stars ----------
  const bench = Array.from({ length: 100 }, (_, i) => i);   // values 0..99
  test('five stars for matching or beating the top 10%', () => {
    eq(C.starsFor(99, bench), 5);
    eq(C.starsFor(89, bench), 5, 'equal to the 10th best: beats or matches 90 of 100');
    eq(C.starsFor(1000, bench), 5);
  });
  test('half a star for each 9% of the field below that', () => {
    eq(C.starsFor(88, bench), 4.5);
    eq(C.starsFor(44, bench), 2.5, 'beats 45%');
    eq(C.starsFor(8, bench), 0.5, 'beats 9%');
    eq(C.starsFor(7, bench), 0, 'beats 8%');
    eq(C.starsFor(-1, bench), 0);
  });
  test('ties with the benchmark count in your favour', () => {
    eq(C.starsFor(0, Array(100).fill(0)), 5, 'everyone gets the same: matching it is top 10%');
    const lumpy = [...Array(50).fill(-3), ...Array(50).fill(1)];
    eq(C.starsFor(-3, lumpy), 2.5, 'matches half the field');
    eq(C.starsFor(1, lumpy), 5);
    eq(C.starsFor(-3 + 5e-7, lumpy), 2.5, 'floating-point noise is not a different result');
  });
  test('every result is a whole or half star', () => {
    for (let v = -2; v <= 101; v += 0.37) ok(C.isStars(C.starsFor(v, bench)), 'value ' + v);
  });
  test('star text and share text', () => {
    eq(C.starText(3.5), '★★★½☆');
    eq(C.starText(0), '☆☆☆☆☆');
    eq(C.starText(5), '★★★★★');
    eq(C.starText(0.5), '½☆☆☆☆');
    eq(C.shareText(1, 2), 'Over to you skip #1 ★★☆☆☆');
    eq(C.shareText(214, 4.5, 'https://x/'), 'Over to you skip #214 ★★★★½\nhttps://x/');
  });

  // ---------- local stats ----------
  const res = (stars, outcome = 'down') => ({ stars, outcome });
  test('first attempt of the day counts; later ones are practice', () => {
    let s = C.freshStats(), r = C.recordAttempt(s, '2026-10-15', 'p1', res(3));
    ok(r.first); eq(r.stats.streak, 1); eq(r.stats.best, 1); eq(r.stats.hist, { 3: 1 }); eq(r.stats.lastPlayed, '2026-10-15');
    const again = C.recordAttempt(r.stats, '2026-10-15', 'p1', res(5));
    ok(!again.first); eq(again.stats.hist, { 3: 1 }, 'practice does not change the star counts'); eq(again.stats.today.stars, 3, 'the first result stands');
    eq(again.stats.today.practice, 1); eq(again.stats.streak, 1);
    eq(s, C.freshStats(), 'the input is not changed');
  });
  test('streak grows day by day, breaks after a missed day, best is kept', () => {
    let s = C.freshStats();
    for (const d of ['2026-10-15', '2026-10-16', '2026-10-17']) s = C.recordAttempt(s, d, 'p', res(1)).stats;
    eq([s.streak, s.best], [3, 3]);
    eq(C.currentStreak(s, '2026-10-18'), 3, 'still alive the next day before playing');
    eq(C.currentStreak(s, '2026-10-19'), 0, 'gone after a whole missed day');
    s = C.recordAttempt(s, '2026-10-19', 'p', res(1)).stats;
    eq([s.streak, s.best], [1, 3]);
    eq(s.hist, { 1: 4 });
  });
  test('streak continues across the clock change', () => {
    let s = C.freshStats();
    s = C.recordAttempt(s, C.londonDate(at('2026-10-24T22:30:00Z')), 'p', res(2)).stats;   // Sat 23:30 BST
    s = C.recordAttempt(s, C.londonDate(at('2026-10-25T23:30:00Z')), 'p', res(2)).stats;   // Sun 23:30 GMT
    eq(s.streak, 2);
  });
  test('days since last play and returning', () => {
    let s = C.freshStats();
    eq(C.daysSinceLastPlay(s, '2026-10-15'), null);
    s = C.recordAttempt(s, '2026-10-15', 'p', res(2)).stats;
    eq(C.daysSinceLastPlay(s, '2026-10-15'), 0);
    eq(C.daysSinceLastPlay(s, '2026-10-16'), 1);
    eq(C.daysSinceLastPlay(s, '2026-10-25'), 10);
  });
  test('a view is counted once a day', () => {
    let s = C.freshStats(), r = C.recordView(s, '2026-10-15');
    ok(r.first); r = C.recordView(r.stats, '2026-10-15'); ok(!r.first);
    ok(C.recordView(r.stats, '2026-10-16').first);
  });
  test('stored stats are checked and junk is thrown away', () => {
    eq(C.cleanStats(null), C.freshStats());
    eq(C.cleanStats({ v: 2 }), C.freshStats());
    const c = C.cleanStats({ v: 1, lastPlayed: '2026-13-40', streak: -2, best: 'x', hist: { 3: 2, 7: 1, 2.5: 1.5, 1: 1 }, today: { date: 'nope' } });
    eq(c, Object.assign(C.freshStats(), { hist: { 1: 1, 3: 2 } }));
  });
  test('storage that throws (private mode, blocked) never breaks the game', () => {
    const bad = { getItem() { throw new Error('denied'); }, setItem() { throw new Error('denied'); } };
    eq(C.loadStats(bad), C.freshStats());
    eq(C.saveStats(bad, C.freshStats()), false);
    const mem = { v: {}, getItem(k) { return this.v[k] || null; }, setItem(k, x) { this.v[k] = x; } };
    const s = C.recordAttempt(C.freshStats(), '2026-10-15', 'p', res(4.5)).stats;
    ok(C.saveStats(mem, s)); eq(C.loadStats(mem), s);
    mem.v[C.STATS_KEY] = '{not json'; eq(C.loadStats(mem), C.freshStats());
  });

  // ---------- events ----------
  const ev = (name, props) => ({ name, props });
  const attempt = (p = {}) => ev('puzzle_attempted', Object.assign({ puzzleId: 'rescue-three', stars: 3.5, saved: true, isFirstAttemptOfDay: true, streak: 4, daysSinceLastPlay: 1 }, p));
  test('allowlist accepts each event in its exact shape', () => {
    ok(C.validateEvent(ev('puzzle_viewed', { puzzleId: 'rescue-three', returning: false, daysSinceLastPlay: null })).ok);
    ok(C.validateEvent(attempt()).ok);
    for (const n of ['puzzle_replayed', 'result_shared', 'full_match_clicked']) ok(C.validateEvent(ev(n, { puzzleId: 'p1' })).ok, n);
  });
  test('allowlist rejects anything else', () => {
    const bad = [
      null, [], 'puzzle_viewed', {}, ev('page_view', { puzzleId: 'p' }), ev('puzzle_replayed'),
      ev('puzzle_replayed', { puzzleId: 'p', userId: 'abc' }),                        // no identifiers, ever
      Object.assign(ev('puzzle_replayed', { puzzleId: 'p' }), { date: '2020-01-01' }), // the server sets the date
      ev('puzzle_replayed', { puzzleId: 'Rescue' }), ev('puzzle_replayed', { puzzleId: 'x'.repeat(41) }), ev('puzzle_replayed', { puzzleId: '../etc' }),
      attempt({ stars: 6 }), attempt({ stars: 2.3 }), attempt({ stars: -0.5 }), attempt({ stars: '3' }),
      attempt({ saved: 'yes' }), attempt({ streak: -1 }), attempt({ streak: 1.5 }), attempt({ streak: 99999 }),
      attempt({ daysSinceLastPlay: 1.5 }), attempt({ daysSinceLastPlay: -1 }), attempt({ isFirstAttemptOfDay: 1 }),
      ev('puzzle_viewed', { puzzleId: 'p', returning: true })                          // missing a field
    ];
    for (const b of bad) ok(!C.validateEvent(b).ok, JSON.stringify(b));
  });
  test('days-since buckets', () => {
    eq([null, 0, 1, 2, 6, 7, 400].map(C.dslBucket), ['new', '0', '1', '2-6', '2-6', '7+', '7+']);
  });
  test('each event maps to one counter with only the allowed dimensions', () => {
    const v = C.counterFor(C.validateEvent(ev('puzzle_viewed', { puzzleId: 'p', returning: true, daysSinceLastPlay: 3 })).event, '2026-10-15');
    eq(v, { day: '2026-10-15', puzzle: 'p', event: 'puzzle_viewed', stars: -1, saved: -1, returning: 1, dsl: '2-6' });
    const a = C.counterFor(C.validateEvent(attempt()).event, '2026-10-15');
    eq(a, { day: '2026-10-15', puzzle: 'rescue-three', event: 'puzzle_attempted', stars: 7, saved: 1, returning: -1, dsl: '1' });
    const r = C.counterFor(C.validateEvent(attempt({ isFirstAttemptOfDay: false })).event, '2026-10-15');
    eq([r.event, r.stars, r.saved], ['puzzle_attempted_repeat', -1, -1], 'repeats never reach the star statistics');
    eq(C.counterKey(a), '2026-10-15|rescue-three|puzzle_attempted|7|1|-1|1');
    eq(Object.keys(a).sort(), ['day', 'dsl', 'event', 'puzzle', 'returning', 'saved', 'stars'], 'no streak, no ip, no agent');
  });

  // ---------- reading the counters ----------
  const row = (day, event, n, more = {}) => Object.assign({ day, puzzle: 'p', event, stars: -1, saved: -1, returning: -1, dsl: '', n }, more);
  test('Saved it % appears only from 30 first attempts', () => {
    const rows = [row('2026-10-15', 'puzzle_attempted', 20, { stars: 10, saved: 1 }), row('2026-10-15', 'puzzle_attempted', 9, { stars: 2, saved: 0 }),
      row('2026-10-15', 'puzzle_attempted_repeat', 50), row('2026-10-14', 'puzzle_attempted', 100, { stars: 10, saved: 1 })];
    eq(C.todaySummary(rows, '2026-10-15'), { day: '2026-10-15', attempts: 29, savedPct: null });
    rows.push(row('2026-10-15', 'puzzle_attempted', 1, { stars: 0, saved: 0 }));
    eq(C.todaySummary(rows, '2026-10-15'), { day: '2026-10-15', attempts: 30, savedPct: 67 });
  });
  test('daily metrics: rates, average stars and next-day return', () => {
    const rows = [
      row('2026-10-15', 'puzzle_viewed', 10, { returning: 0, dsl: 'new' }),
      row('2026-10-15', 'puzzle_attempted', 6, { stars: 6, saved: 1, dsl: 'new' }), row('2026-10-15', 'puzzle_attempted', 2, { stars: 0, saved: 0, dsl: 'new' }),
      row('2026-10-15', 'puzzle_replayed', 4), row('2026-10-15', 'result_shared', 2), row('2026-10-15', 'full_match_clicked', 1),
      row('2026-10-16', 'puzzle_viewed', 5, { returning: 1, dsl: '1' }),
      row('2026-10-16', 'puzzle_attempted', 2, { stars: 10, saved: 1, dsl: '1' }), row('2026-10-16', 'puzzle_attempted', 2, { stars: 4, saved: 0, dsl: 'new' })
    ];
    const d = C.dailyMetrics(rows, '2026-10-16', 3);
    eq(d.map(x => x.day), ['2026-10-14', '2026-10-15', '2026-10-16']);
    eq(d[0].attempts, 0); eq(d[0].attemptRate, null, 'no division by zero');
    eq([d[1].viewed, d[1].attempts, d[1].attemptRate, d[1].avgStars], [10, 8, 0.8, 2.25]);
    eq([d[1].replaysPerAttempt, d[1].sharesPerAttempt, d[1].fullPerAttempt], [0.5, 0.25, 0.125]);
    eq(d[2].nextDayReturn, 0.25, '2 came back of yesterday\'s 8');
    const v = C.verdict(d);
    eq(v.map(x => x.key), ['attemptRate', 'nextDayReturn', 'shareRate', 'avgStars']);
    eq(v[0].shown, '80%', '12 attempts from 15 views'); eq(v[0].met, true);
    eq(v[1].shown, '25%'); eq(v[1].met, true);
    eq(v[3].met, true, '(6*3 + 2*0 + 2*5 + 2*2) / 12 = 2.67');
  });
  test('per-puzzle table and too easy / too hard flags', () => {
    const rows = [
      row('2026-10-15', 'puzzle_viewed', 12, { puzzle: 'easy' }), row('2026-10-15', 'puzzle_attempted', 8, { puzzle: 'easy', stars: 10, saved: 1 }), row('2026-10-15', 'puzzle_attempted', 2, { puzzle: 'easy', stars: 3, saved: 0 }),
      row('2026-10-16', 'puzzle_attempted', 19, { puzzle: 'hard', stars: 1, saved: 0 }), row('2026-10-16', 'puzzle_attempted', 1, { puzzle: 'hard', stars: 10, saved: 1 }),
      row('2026-10-17', 'puzzle_attempted', 5, { puzzle: 'mid', stars: 10, saved: 1 }), row('2026-10-17', 'puzzle_attempted', 5, { puzzle: 'mid', stars: 8, saved: 1 })
    ];
    const p = C.puzzleMetrics(rows), by = Object.fromEntries(p.map(x => [x.puzzle, x]));
    eq(by.easy.bands, [0, 2, 0, 0, 0, 8]); eq(by.easy.viewed, 12); eq(by.easy.flag, 'too easy');
    eq(by.hard.flag, 'too hard', '1 in 20 is 5%');
    eq(by.mid.flag, ''); eq(by.mid.avgStars, 4.5); eq(by.mid.savedShare, 1);
    eq(p.map(x => x.puzzle), ['hard', 'easy', 'mid'], 'most attempted first');
  });
  test('CSV export', () => {
    const csv = C.toCsv([row('2026-10-15', 'puzzle_attempted', 3, { stars: 7, saved: 1, dsl: '2-6' })]);
    eq(csv, 'day,puzzle,event,stars,saved,returning,dsl,n\n2026-10-15,p,puzzle_attempted,3.5,1,-1,2-6,3\n');
  });
})();
