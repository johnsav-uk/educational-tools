/* The stats Worker (bias/stats-worker/src/index.js), run against a real SQLite database
   through a small stand-in for Cloudflare D1. Checks the allowlist, the counters, that
   nothing identifying is stored, the rate limit, the scoreboard tile and the dashboard's
   key. Needs Node 22 (node:sqlite). */
const fs = require('fs');
const path = require('path');

function d1() {
  const { DatabaseSync } = require('node:sqlite');
  const db = new DatabaseSync(':memory:');
  db.exec(fs.readFileSync(path.join(__dirname, '..', '..', 'stats-worker', 'schema.sql'), 'utf8'));
  const stmt = (sql, args = []) => {
    const p = db.prepare(sql.replace(/\?(\d+)/g, '?'));   // D1's ?1 ?2 … become plain ? in order
    return {
      bind: (...a) => stmt(sql, a),
      run: async () => { p.run(...args); return { success: true }; },
      all: async () => ({ results: p.all(...args).map(r => ({ ...r })) }),
      first: async () => { const r = p.get(...args); return r ? { ...r } : null; }
    };
  };
  return { prepare: sql => stmt(sql), raw: db };
}

module.exports = async function (T) {
  const { test, eq, ok } = T;
  const W = await import(require('url').pathToFileURL(path.join(__dirname, '..', '..', 'stats-worker', 'src', 'index.js')).href);
  const ORIGIN = 'https://www.johnsav.co.uk';
  const mkEnv = (over = {}) => Object.assign({ DB: d1(), ALLOWED_ORIGINS: ORIGIN + ',http://localhost:8765', ADMIN_KEY: 'correct horse battery staple' }, over);
  const at = s => Date.parse(s);
  const post = (env, body, now = at('2026-10-15T12:00:00Z'), headers = {}) =>
    W.handle(new Request('https://stats.example/e', { method: 'POST', body: typeof body === 'string' ? body : JSON.stringify(body), headers: { 'Content-Type': 'text/plain', Origin: ORIGIN, 'CF-Connecting-IP': '203.0.113.9', 'User-Agent': 'Mozilla/5.0 test', ...headers } }), env, now);
  const get = (env, p, headers = {}, now = at('2026-10-15T12:00:00Z')) => W.handle(new Request('https://stats.example' + p, { headers: { Origin: ORIGIN, 'CF-Connecting-IP': '203.0.113.9', ...headers } }), env, now);
  const rows = env => env.DB.raw.prepare('SELECT * FROM counters ORDER BY event, stars').all().map(r => ({ ...r }));
  const attempt = (p = {}) => ({ name: 'puzzle_attempted', props: Object.assign({ puzzleId: 'red-lying-three', stars: 3.5, saved: true, isFirstAttemptOfDay: true, streak: 2, daysSinceLastPlay: 1 }, p) });

  test('worker: a valid event adds one to its daily counter', async () => {
    const env = mkEnv();
    eq((await post(env, attempt())).status, 204);
    eq((await post(env, attempt())).status, 204);
    eq(rows(env), [{ day: '2026-10-15', puzzle: 'red-lying-three', event: 'puzzle_attempted', stars: 7, saved: 1, ret: -1, dsl: '1', frm: -1, wsaved: -1, n: 2 }]);
  });
  test('worker: the day is the server\'s London date, not the client\'s', async () => {
    const env = mkEnv();
    await post(env, attempt(), at('2026-10-15T23:30:00Z'));   // 00:30 BST on the 16th
    eq(rows(env)[0].day, '2026-10-16');
  });
  test('worker: nothing that could recognise a player is stored', async () => {
    const env = mkEnv();
    await post(env, attempt()); await post(env, { name: 'puzzle_viewed', props: { puzzleId: 'p', returning: true, daysSinceLastPlay: 3 } });
    const cols = env.DB.raw.prepare('PRAGMA table_info(counters)').all().map(c => c.name);
    eq(cols, ['day', 'puzzle', 'event', 'stars', 'saved', 'ret', 'dsl', 'frm', 'wsaved', 'n']);
    const dump = JSON.stringify(env.DB.raw.prepare('SELECT * FROM counters').all());
    ok(!dump.includes('203.0.113.9') && !dump.includes('Mozilla'), 'no address or browser in the table');
    ok(!dump.includes('"streak"'), 'the streak is checked but not kept');
  });
  test('worker: events outside the allowlist are refused and not counted', async () => {
    const env = mkEnv();
    for (const bad of [attempt({ stars: 7 }), attempt({ userId: 'x' }), { name: 'page_view', props: { puzzleId: 'p' } }, Object.assign(attempt(), { day: '2020-01-01' })])
      eq((await post(env, bad)).status, 400, JSON.stringify(bad));
    eq((await post(env, 'not json')).status, 400);
    eq((await post(env, 'x'.repeat(2000))).status, 413);
    eq(rows(env).length, 0);
  });
  test('worker: a repeat attempt never reaches the star counts', async () => {
    const env = mkEnv();
    await post(env, attempt({ isFirstAttemptOfDay: false }));
    eq(rows(env).map(r => [r.event, r.stars, r.saved]), [['puzzle_attempted_repeat', -1, -1]]);
  });
  test('worker: a better go moves the player\'s best, and /today counts it', async () => {
    const env = mkEnv();
    for (let i = 0; i < 30; i++) await post(env, attempt({ saved: false, stars: 1 }));
    const up = { name: 'puzzle_improved', props: { puzzleId: 'red-lying-three', fromStars: 1, toStars: 4, wasSaved: false, saved: true } };
    for (let i = 0; i < 9; i++) eq((await post(env, up)).status, 204);
    eq(rows(env).find(r => r.event === 'puzzle_improved'), { day: '2026-10-15', puzzle: 'red-lying-three', event: 'puzzle_improved', stars: 8, saved: 1, ret: -1, dsl: '', frm: 2, wsaved: 0, n: 9 });
    eq(await (await get(env, '/today')).json(), { day: '2026-10-15', attempts: 30, savedPct: 30 }, '9 of 30 saved it at their best');
  });
  test('worker: over the rate limit, events are dropped', async () => {
    const env = mkEnv({ LIMITER: { limit: async () => ({ success: false }) } });
    eq((await post(env, attempt())).status, 429);
    eq(rows(env).length, 0);
    const seen = [], env2 = mkEnv({ LIMITER: { limit: async o => { seen.push(o.key); return { success: true }; } } });
    await post(env2, attempt());
    eq(seen, ['203.0.113.9'], 'limited per address, by Cloudflare, without storing it');
  });
  test('worker: /today hides the saved share until 30 first attempts', async () => {
    const env = mkEnv();
    for (let i = 0; i < 29; i++) await post(env, attempt({ saved: i < 20, stars: i < 20 ? 3 : 1 }));
    await post(env, attempt({ isFirstAttemptOfDay: false }));
    let r = await get(env, '/today'); eq(r.status, 200);
    eq(await r.json(), { day: '2026-10-15', attempts: 29, savedPct: null });
    await post(env, attempt({ saved: false, stars: 0 }));
    r = await get(env, '/today');
    eq(await r.json(), { day: '2026-10-15', attempts: 30, savedPct: 67 });
    eq(r.headers.get('Access-Control-Allow-Origin'), ORIGIN);
  });
  test('worker: the dashboard needs the key, and the key is never in the URL', async () => {
    const env = mkEnv(); await post(env, attempt());
    eq((await get(env, '/admin/counters')).status, 401);
    eq((await get(env, '/admin/counters', { Authorization: 'Bearer wrong' })).status, 401);
    eq((await get(env, '/admin/counters?key=correct%20horse%20battery%20staple')).status, 401, 'a key in the query string is ignored');
    const r = await get(env, '/admin/counters', { Authorization: 'Bearer correct horse battery staple' });
    eq(r.status, 200);
    eq((await r.json()).rows, [{ day: '2026-10-15', puzzle: 'red-lying-three', event: 'puzzle_attempted', stars: 7, saved: 1, returning: -1, dsl: '1', from: -1, wasSaved: -1, n: 1 }]);
    eq((await get(mkEnv({ ADMIN_KEY: '' }), '/admin/counters', { Authorization: 'Bearer x' })).status, 503, 'no key set: the dashboard is closed');
  });
  test('worker: CSV export of the counters', async () => {
    const env = mkEnv(); await post(env, attempt());
    const r = await get(env, '/admin/counters.csv', { Authorization: 'Bearer correct horse battery staple' });
    eq(r.headers.get('Content-Type'), 'text/csv; charset=utf-8');
    eq(await r.text(), 'day,puzzle,event,stars,saved,returning,dsl,from,wasSaved,n\n2026-10-15,red-lying-three,puzzle_attempted,3.5,1,-1,1,-1,-1,1\n');
  });
  test('worker: only the site\'s own pages get CORS access', async () => {
    const env = mkEnv();
    const r = await W.handle(new Request('https://stats.example/today', { headers: { Origin: 'https://evil.example' } }), env, Date.now());
    eq(r.headers.get('Access-Control-Allow-Origin'), null);
    const pre = await W.handle(new Request('https://stats.example/admin/counters', { method: 'OPTIONS', headers: { Origin: ORIGIN } }), env, Date.now());
    eq([pre.status, pre.headers.get('Access-Control-Allow-Origin'), pre.headers.get('Access-Control-Allow-Headers')], [204, ORIGIN, 'Authorization, Content-Type']);
    eq((await get(env, '/nothing')).status, 404);
  });
};
