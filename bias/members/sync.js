/* Members: carrying a browser's things into the account, and keeping signed-in browsers in step.
   Pure functions only (no page, no network), so league/tests/sync.test.js can check the rules;
   members.js does the asking and the calls.

   What travels, and how it merges (notes/roadmap-handoffs.md, Stage 2):
   - profile: the name, bowls and colour used in matches and online, the settings and bowl tuning.
     One per account. The account's copy wins when a browser first joins it; after that the
     browser where it last changed wins.
   - stats: each browser's match record, kept per browser and added up for the account, so a
     record is never counted twice however often it's sent.
   - skip: each browser's daily-puzzle streak. The account's streak is the one played most
     recently (the longer one on a tie), its best the best anywhere. Star counts stay per browser.
   - archive: the best stars for each archive puzzle, from any browser. */
(function (root) {
  'use strict';
  // the game's store keys (store.get(k) reads localStorage 'bias.' + k as JSON)
  const PROFILE_KEYS = ['m.name0', 'on.name', 'm.prof0', 'on.prof', 'm.col0', 'on.col', 'settings', 'profiles'];
  const SKIP_KEY = 'skip', ARCHIVE_KEY = 'skip.archive', STATS_KEY = 'stats';
  const isObj = v => !!v && typeof v === 'object' && !Array.isArray(v);
  const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);

  // This browser's things, as they would be sent. Missing ones are null.
  function snapshot(store) {
    const profile = {};
    for (const k of PROFILE_KEYS) { const v = store.get(k, null); if (v != null && v !== '') profile[k] = v; }
    const stats = store.get(STATS_KEY, null), skip = store.get(SKIP_KEY, null), archive = store.get(ARCHIVE_KEY, null);
    return {
      profile: Object.keys(profile).length ? profile : null,
      stats: isObj(stats) && isObj(stats.online) ? stats : null,
      skip: isObj(skip) && skip.v === 1 ? skip : null,
      archive: isObj(archive) && Object.keys(archive).length ? archive : null
    };
  }

  // The account's rows ({ kind, browser, json, updatedAt }) by kind, leaving this browser out:
  // its own copy is always the one in front of us.
  function others(rows, kind, browser) { return (rows || []).filter(r => r.kind === kind && r.browser !== browser && isObj(r.json)).map(r => r.json); }
  const profileRow = rows => (rows || []).find(r => r.kind === 'profile' && isObj(r.json)) || null;

  // ---------- match record: added up across browsers ----------
  const tally = () => ({ played: 0, won: 0, drawn: 0, lost: 0, shotsFor: 0, shotsAgainst: 0 });
  function addTally(into, t) { if (isObj(t)) for (const k in into) into[k] += Number(t[k]) || 0; }
  function statsTotal(local, rows, browser) {
    const all = others(rows, 'stats', browser).concat(local ? [local] : []), sum = tally();
    let first = null, last = null;
    for (const s of all) {
      if (isObj(s.computer)) for (const lv in s.computer) addTally(sum, s.computer[lv]);
      addTally(sum, s.online); addTally(sum, s.league);
      if (s.first && (!first || s.first < first)) first = s.first;
      if (s.last && (!last || s.last > last)) last = s.last;
    }
    return Object.assign(sum, { first, last, browsers: all.filter(s => s.first).length });
  }

  // ---------- daily puzzle: the most recently played streak, the best anywhere ----------
  function mergedSkip(local, rows, browser) {
    const all = others(rows, 'skip', browser).filter(s => s.v === 1);
    if (!all.length) return null;
    let top = local && local.lastPlayed ? local : null, best = local ? local.best || 0 : 0;
    for (const s of all) {
      best = Math.max(best, s.best || 0, s.streak || 0);
      if (!s.lastPlayed) continue;
      if (!top || s.lastPlayed > top.lastPlayed || (s.lastPlayed === top.lastPlayed && (s.streak || 0) > (top.streak || 0))) top = s;
    }
    if (!top) return null;
    return { lastPlayed: top.lastPlayed, streak: top.streak || 0, best: Math.max(best, top.streak || 0), today: top === local ? local.today : top.today || null };
  }
  // local, with the account's streak if it's newer or longer. Stars per browser stay as they were.
  function applySkip(local, m) {
    if (!m) return null;
    const base = local || { v: 1, lastPlayed: null, streak: 0, best: 0, hist: {}, today: null, viewed: null };
    const newer = !base.lastPlayed || m.lastPlayed > base.lastPlayed || (m.lastPlayed === base.lastPlayed && m.streak > base.streak);
    const out = Object.assign({}, base, { best: Math.max(base.best || 0, m.best) });
    if (newer) Object.assign(out, { lastPlayed: m.lastPlayed, streak: m.streak, today: m.lastPlayed === base.lastPlayed ? base.today : m.today });
    return same(out, base) ? null : out;
  }

  // ---------- archive: the best stars for each puzzle ----------
  function applyArchive(local, rows, browser) {
    const base = isObj(local) ? local : {}, out = Object.assign({}, base);
    for (const a of others(rows, 'archive', browser)) for (const k of Object.keys(a)) {
      const v = a[k]; if (!isObj(v) || !(v.stars >= 0)) continue;
      if (!out[k]) out[k] = { stars: v.stars, tries: v.tries || 1 };
      else if (v.stars > out[k].stars) out[k] = { stars: v.stars, tries: out[k].tries };
    }
    return same(out, base) ? null : out;
  }

  /* What joining this browser to the account would do: what goes up, what comes down (each with
     the store writes it makes), for the player to see before agreeing. */
  function plan(local, rows, browser) {
    const up = [], down = [], acct = profileRow(rows), writes = {};
    const name = p => p && (p['on.name'] || p['m.name0']) || '';
    if (acct && local.profile && !same(acct.json, local.profile)) {
      down.push(name(acct.json) && name(acct.json) !== name(local.profile)
        ? `Your account’s name “${name(acct.json)}”, bowls, colour and settings, in place of “${name(local.profile) || 'none'}” here`
        : 'Your account’s bowls, colour and settings, in place of this browser’s');
      Object.assign(writes, acct.json);
    } else if (acct && !local.profile) { down.push(`Your account’s name${name(acct.json) ? ` “${name(acct.json)}”` : ''}, bowls, colour and settings`); Object.assign(writes, acct.json); }
    else if (local.profile) up.push(`Your name${name(local.profile) ? ` “${name(local.profile)}”` : ''}, bowls, colour and settings`);
    if (local.stats) { const t = statsTotal(local.stats, [], browser); if (t.played) up.push(`Your match record here: ${t.played} match${t.played === 1 ? '' : 'es'}, ${t.won} won`); }
    if (local.skip && local.skip.lastPlayed) up.push(`Your daily-puzzle streak here: ${local.skip.streak} day${local.skip.streak === 1 ? '' : 's'}, best ${local.skip.best}`);
    if (local.archive) up.push(`Your stars on ${Object.keys(local.archive).length} archive puzzle${Object.keys(local.archive).length === 1 ? '' : 's'}`);
    const sk = applySkip(local.skip, mergedSkip(local.skip, rows, browser));
    if (sk) { down.push(`Your streak from your other browsers: ${sk.streak} day${sk.streak === 1 ? '' : 's'}, best ${sk.best}`); writes[SKIP_KEY] = sk; }
    const ar = applyArchive(local.archive, rows, browser);
    if (ar) { const n = Object.keys(ar).filter(k => !local.archive || !same(ar[k], local.archive[k])).length; down.push(`Better stars on ${n} archive puzzle${n === 1 ? '' : 's'} from your other browsers`); writes[ARCHIVE_KEY] = ar; }
    const t = statsTotal(local.stats, rows, browser);
    if (t.browsers > 1) down.push(`Your Members record will add up all your browsers: ${t.played} matches so far`);
    return { up, down, writes };
  }

  /* After joining: one quiet round of keeping in step. syncedProfile is the profile as last sent or
     taken. Returns { writes, send } where send is what to post (profile only if it changed here). */
  function step(local, rows, browser, syncedProfile, syncedAt) {
    const writes = {}, acct = profileRow(rows);
    let profile;
    if (local.profile && !same(local.profile, syncedProfile)) profile = local.profile;                // changed here: this one wins
    else if (acct && acct.updatedAt > syncedAt && !same(acct.json, local.profile)) Object.assign(writes, acct.json);  // changed elsewhere
    const sk = applySkip(local.skip, mergedSkip(local.skip, rows, browser)); if (sk) writes[SKIP_KEY] = sk;
    const ar = applyArchive(local.archive, rows, browser); if (ar) writes[ARCHIVE_KEY] = ar;
    const send = { browser };
    if (profile) send.profile = profile;
    const after = k => (k in writes ? writes[k] : local[k === SKIP_KEY ? 'skip' : 'archive']);
    if (local.stats) send.stats = local.stats;
    if (after(SKIP_KEY)) send.skip = after(SKIP_KEY);
    if (after(ARCHIVE_KEY)) send.archive = after(ARCHIVE_KEY);
    return { writes, send };
  }

  const api = { PROFILE_KEYS, snapshot, statsTotal, mergedSkip, applySkip, applyArchive, plan, step };
  if (typeof module === 'object' && module.exports) module.exports = api; else root.BiasSync = api;
})(typeof window === 'object' ? window : globalThis);
