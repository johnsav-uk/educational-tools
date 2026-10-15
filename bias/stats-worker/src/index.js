/* Over to you, skip: the stats Worker.
   Three jobs, and nothing kept that could recognise a player:
     POST /e              one event from the game; checked against the allowlist in
                          skip-core.js and added to a daily counter (London date)
     GET  /today          today's first attempts and the share who saved the end
                          (null below 30 attempts), for the scoreboard tile
     GET  /admin/counters      every counter row, for the dashboard   } need
     GET  /admin/counters.csv  the same as a spreadsheet              } Authorization: Bearer ADMIN_KEY
   No raw events, IP addresses or browser details are stored. The rate limiter is
   Cloudflare's: it sees the address for a minute, the database never does. */
import Core from '../../skip/skip-core.js';

const MAX_BODY = 1024;

export default {
  async fetch(req, env) {
    try { return await handle(req, env, Date.now()); }
    catch (e) { return reply(req, env, 500, { error: 'Something went wrong.' }); }
  }
};

export async function handle(req, env, now) {
  const url = new URL(req.url), path = url.pathname.replace(/\/+$/, '') || '/';
  if (req.method === 'OPTIONS') return reply(req, env, 204, null, { 'Access-Control-Allow-Methods': 'GET, POST', 'Access-Control-Allow-Headers': 'Authorization, Content-Type', 'Access-Control-Max-Age': '86400' });
  if (path === '/e' && req.method === 'POST') return event(req, env, now);
  if (path === '/today' && req.method === 'GET') return today(req, env, now);
  if (path.startsWith('/admin/') && req.method === 'GET') return admin(req, env, path, url);
  return reply(req, env, 404, { error: 'Not found.' });
}

// ---------- one event ----------
async function event(req, env, now) {
  if (!(await allowed(env, ip(req)))) return reply(req, env, 429, { error: 'Too many events.' });
  const text = await req.text();
  if (text.length > MAX_BODY) return reply(req, env, 413, { error: 'Too large.' });
  let body; try { body = JSON.parse(text); } catch (e) { return reply(req, env, 400, { error: 'Not JSON.' }); }
  const v = Core.validateEvent(body);
  if (!v.ok) return reply(req, env, 400, { error: v.why });
  const c = Core.counterFor(v.event, Core.londonDate(now));
  await env.DB.prepare(
    `INSERT INTO counters (day, puzzle, event, stars, saved, ret, dsl, n) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, 1)
     ON CONFLICT (day, puzzle, event, stars, saved, ret, dsl) DO UPDATE SET n = n + 1`
  ).bind(c.day, c.puzzle, c.event, c.stars, c.saved, c.returning, c.dsl).run();
  return reply(req, env, 204, null);
}

// ---------- the scoreboard tile ----------
async function today(req, env, now) {
  const day = Core.londonDate(now);
  const { results } = await env.DB.prepare(`SELECT * FROM counters WHERE day = ?1 AND event = 'puzzle_attempted'`).bind(day).all();
  return reply(req, env, 200, Core.todaySummary(results.map(row), day), { 'Cache-Control': 'public, max-age=60' });
}

// ---------- the dashboard's data ----------
async function admin(req, env, path, url) {
  if (!env.ADMIN_KEY) return reply(req, env, 503, { error: 'The dashboard key has not been set. Run: npx wrangler secret put ADMIN_KEY' });
  const given = (req.headers.get('Authorization') || '').replace(/^Bearer\s+/i, '');
  if (!(await allowed(env, 'admin:' + ip(req))) || !given || !(await sameSecret(given, env.ADMIN_KEY))) return reply(req, env, 401, { error: 'That key was not accepted.' });
  const from = Core.isDate(url.searchParams.get('from')) ? url.searchParams.get('from') : '2000-01-01';
  const { results } = await env.DB.prepare(`SELECT * FROM counters WHERE day >= ?1 ORDER BY day, puzzle, event, stars, saved, ret, dsl`).bind(from).all();
  const rows = results.map(row);
  if (path === '/admin/counters.csv') return reply(req, env, 200, Core.toCsv(rows), { 'Content-Type': 'text/csv; charset=utf-8', 'Content-Disposition': 'attachment; filename="skip-counters.csv"', 'Cache-Control': 'no-store' });
  if (path === '/admin/counters') return reply(req, env, 200, { rows }, { 'Cache-Control': 'no-store' });
  return reply(req, env, 404, { error: 'Not found.' });
}

// ---------- helpers ----------
const row = r => ({ day: r.day, puzzle: r.puzzle, event: r.event, stars: r.stars, saved: r.saved, returning: r.ret, dsl: r.dsl, n: r.n });
const ip = req => req.headers.get('CF-Connecting-IP') || 'unknown';
async function allowed(env, key) {
  if (!env.LIMITER) return true;
  try { return (await env.LIMITER.limit({ key })).success; } catch (e) { return true; }
}
// Compare two secrets without leaking, through timing, how much of the guess was right.
async function sameSecret(a, b) {
  const enc = new TextEncoder(), [x, y] = await Promise.all([a, b].map(s => crypto.subtle.digest('SHA-256', enc.encode(s))));
  const p = new Uint8Array(x), q = new Uint8Array(y); let d = 0;
  for (let i = 0; i < p.length; i++) d |= p[i] ^ q[i];
  return d === 0;
}
function reply(req, env, status, body, extra = {}) {
  const origin = req.headers.get('Origin'), ok = (env.ALLOWED_ORIGINS || '').split(',').map(s => s.trim()).filter(Boolean);
  const headers = { Vary: 'Origin', 'X-Content-Type-Options': 'nosniff', ...extra };
  if (origin && ok.includes(origin)) headers['Access-Control-Allow-Origin'] = origin;
  if (body == null) return new Response(null, { status, headers });
  if (typeof body === 'string') return new Response(body, { status, headers });
  return new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json; charset=utf-8', ...headers } });
}
