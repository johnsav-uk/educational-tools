// GENERATED: src/index.js and bias/skip/skip-core.js bundled into one file, for pasting into the
// Cloudflare dashboard. Rebuild with:  npx wrangler deploy --dry-run --outdir dist  (then rename index.js).
// Do not edit by hand.
var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });
var __commonJS = (cb, mod) => function __require() {
  return mod || (0, cb[__getOwnPropNames(cb)[0]])((mod = { exports: {} }).exports, mod), mod.exports;
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));

// ../skip/skip-core.js
var require_skip_core = __commonJS({
  "../skip/skip-core.js"(exports, module) {
    (function(root) {
      "use strict";
      const TZ = "Europe/London";
      const START = "2026-10-15";
      const DAY = 864e5;
      const fmt = new Intl.DateTimeFormat("en-CA", { timeZone: TZ, year: "numeric", month: "2-digit", day: "2-digit" });
      function londonDate(ms) {
        const p = {};
        for (const x of fmt.formatToParts(new Date(ms))) p[x.type] = x.value;
        return `${p.year}-${p.month}-${p.day}`;
      }
      __name(londonDate, "londonDate");
      const dayNum = /* @__PURE__ */ __name((d) => {
        const [y, m, dd] = d.split("-").map(Number);
        return Math.round(Date.UTC(y, m - 1, dd) / DAY);
      }, "dayNum");
      const daysBetween = /* @__PURE__ */ __name((a, b) => dayNum(b) - dayNum(a), "daysBetween");
      function addDays(d, n) {
        const t = new Date((dayNum(d) + n) * DAY);
        return t.toISOString().slice(0, 10);
      }
      __name(addDays, "addDays");
      const isDate = /* @__PURE__ */ __name((d) => typeof d === "string" && /^\d{4}-\d{2}-\d{2}$/.test(d) && addDays(d, 0) === d, "isDate");
      const issueNumber = /* @__PURE__ */ __name((date, start = START) => daysBetween(start, date) + 1, "issueNumber");
      function puzzleIndex(date, count, start = START) {
        if (!count) return -1;
        const i = Math.max(0, daysBetween(start, date));
        return i % count;
      }
      __name(puzzleIndex, "puzzleIndex");
      function nextLondonMidnight(ms) {
        const tomorrow = addDays(londonDate(ms), 1), base = dayNum(tomorrow) * DAY;
        for (const off of [0, 1, -1]) {
          const t = base - off * 36e5;
          if (londonDate(t) === tomorrow && londonDate(t - 1) !== tomorrow) return t;
        }
        return base;
      }
      __name(nextLondonMidnight, "nextLondonMidnight");
      function countdown(ms) {
        const left = Math.max(0, nextLondonMidnight(ms) - ms), mins = Math.ceil(left / 6e4);
        const h = Math.floor(mins / 60), m = mins % 60;
        return { ms: left, h, m, text: h ? `${h}h ${String(m).padStart(2, "0")}m` : `${m}m` };
      }
      __name(countdown, "countdown");
      const OUTCOMES = [
        { key: "up", label: "Their count goes up", title: "Made it worse", detail: "Your bowl gave them another shot. Sometimes the brave shot does that.", scribble: "ouch. that's one more for them" },
        { key: "same", label: "Their count stays", title: "No change", detail: "They still hold the same count. Your bowl did not get in among them.", scribble: "needed to be in there, skip" },
        { key: "down", label: "Their count comes down", title: "Cut it down", detail: "They still score, but fewer. That might be enough to stay in the match.", scribble: "saved a couple. not bad." },
        { key: "level", label: "Tied or dead end", title: "End saved", detail: "Nobody scores this end. From where you started, that is a rescue.", scribble: "phew. live to fight on" },
        { key: "win1", label: "You score 1", title: "Turned it round", detail: "You hold shot. One down to one up with a single bowl.", scribble: "that's the shot!" },
        { key: "win2", label: "You score 2", title: "Two for us", detail: "You hold two shots after being down. The head is yours.", scribble: "brilliant. two!" },
        { key: "win3", label: "You score 3", title: "Three for us", detail: "Three shots from a losing head. A skip remembers that one.", scribble: "they will talk about that" },
        { key: "win4", label: "You score 4", title: "Four for us", detail: "Four or more shots with the last bowl. As good as it gets.", scribble: "drinks are on you" }
      ];
      const OUTCOME_KEYS = OUTCOMES.map((o) => o.key);
      const SAVED = /* @__PURE__ */ new Set(["level", "win1", "win2", "win3", "win4"]);
      function oppCount(s, me) {
        return s && !s.dead && s.winner != null && s.winner !== me ? s.shots : 0;
      }
      __name(oppCount, "oppCount");
      function outcomeOf(before, after, me) {
        if (after.dead || after.winner == null) return "level";
        if (after.winner === me) return "win" + Math.min(4, Math.max(1, after.shots));
        const b = oppCount(before, me), a = after.shots;
        return a > b ? "up" : a === b ? "same" : "down";
      }
      __name(outcomeOf, "outcomeOf");
      const isSaved = /* @__PURE__ */ __name((key) => SAVED.has(key), "isSaved");
      const outcomeInfo = /* @__PURE__ */ __name((key, overrides) => Object.assign({}, OUTCOMES.find((o) => o.key === key) || OUTCOMES[0], overrides && overrides[key] || {}), "outcomeInfo");
      const EPS = 1e-4;
      function beatShare(value, bench) {
        if (!bench || !bench.length) return 0;
        let n = 0;
        for (const b of bench) if (b <= value + EPS) n++;
        return n / bench.length;
      }
      __name(beatShare, "beatShare");
      const topCut = /* @__PURE__ */ __name((bench) => bench.slice().sort((a, b) => b - a)[Math.max(0, Math.ceil(bench.length * 0.1) - 1)], "topCut");
      function starsFor(value, bench) {
        if (!bench || !bench.length) return 0;
        if (value + EPS >= topCut(bench)) return 5;
        return Math.min(4.5, Math.floor(beatShare(value, bench) / 0.09 + 1e-9) * 0.5);
      }
      __name(starsFor, "starsFor");
      const isStars = /* @__PURE__ */ __name((s) => typeof s === "number" && s >= 0 && s <= 5 && Number.isInteger(s * 2), "isStars");
      function starText(s) {
        const full = Math.floor(s), half = s - full >= 0.5;
        return "\u2605".repeat(full) + (half ? "\xBD" : "") + "\u2606".repeat(5 - full - (half ? 1 : 0));
      }
      __name(starText, "starText");
      const starWords = /* @__PURE__ */ __name((s) => `${s} star${s === 1 ? "" : "s"} out of 5`, "starWords");
      function shareText(issue, stars, url) {
        return `Over to you skip #${issue} ${starText(stars)}` + (url ? `
${url}` : "");
      }
      __name(shareText, "shareText");
      function headHash(pz) {
        const a = pz.advised || {};
        const s = JSON.stringify([
          pz.greenSpeed,
          pz.matRear || null,
          pz.you,
          pz.jack,
          pz.bowls.map((b) => [b.team, b.x, b.y]),
          pz.match || null,
          [a.hand, a.kind, a.target, a.extra || null, a.drive || null]
        ]);
        let h = 2166136261;
        for (let i = 0; i < s.length; i++) {
          h ^= s.charCodeAt(i);
          h = Math.imul(h, 16777619) >>> 0;
        }
        return h.toString(16).padStart(8, "0");
      }
      __name(headHash, "headHash");
      const STATS_KEY = "bias.skip";
      function freshStats() {
        return { v: 1, lastPlayed: null, streak: 0, best: 0, hist: {}, today: null, viewed: null };
      }
      __name(freshStats, "freshStats");
      function cleanStats(s) {
        const f = freshStats();
        if (!s || typeof s !== "object" || s.v !== 1) return f;
        if (isDate(s.lastPlayed)) f.lastPlayed = s.lastPlayed;
        if (Number.isInteger(s.streak) && s.streak >= 0) f.streak = s.streak;
        if (Number.isInteger(s.best) && s.best >= 0) f.best = Math.max(s.best, f.streak);
        if (s.hist && typeof s.hist === "object") {
          for (const k of Object.keys(s.hist)) if (isStars(+k) && Number.isInteger(s.hist[k]) && s.hist[k] > 0) f.hist[String(+k)] = s.hist[k];
        }
        if (s.today && isDate(s.today.date) && typeof s.today.puzzleId === "string" && isStars(s.today.stars)) f.today = s.today;
        if (isDate(s.viewed)) f.viewed = s.viewed;
        return f;
      }
      __name(cleanStats, "cleanStats");
      function loadStats(storage) {
        try {
          return cleanStats(JSON.parse(storage.getItem(STATS_KEY) || "null"));
        } catch (e) {
          return freshStats();
        }
      }
      __name(loadStats, "loadStats");
      function saveStats(storage, s) {
        try {
          storage.setItem(STATS_KEY, JSON.stringify(s));
          return true;
        } catch (e) {
          return false;
        }
      }
      __name(saveStats, "saveStats");
      const daysSinceLastPlay = /* @__PURE__ */ __name((s, date) => s.lastPlayed ? daysBetween(s.lastPlayed, date) : null, "daysSinceLastPlay");
      function currentStreak(s, date) {
        if (!s.lastPlayed) return 0;
        const d = daysBetween(s.lastPlayed, date);
        return d === 0 || d === 1 ? s.streak : 0;
      }
      __name(currentStreak, "currentStreak");
      const playedToday = /* @__PURE__ */ __name((s, date) => !!(s.today && s.today.date === date), "playedToday");
      function recordAttempt(s, date, puzzleId, result) {
        const n = JSON.parse(JSON.stringify(s));
        if (playedToday(n, date)) {
          n.today.practice = (n.today.practice || 0) + 1;
          return { stats: n, first: false };
        }
        const gap = daysSinceLastPlay(n, date);
        n.streak = gap === 1 ? n.streak + 1 : 1;
        n.best = Math.max(n.best, n.streak);
        n.lastPlayed = date;
        const k = String(result.stars);
        n.hist[k] = (n.hist[k] || 0) + 1;
        n.today = { date, puzzleId, stars: result.stars, outcome: result.outcome, practice: 0 };
        return { stats: n, first: true };
      }
      __name(recordAttempt, "recordAttempt");
      function recordView(s, date) {
        if (s.viewed === date) return { stats: s, first: false };
        return { stats: Object.assign({}, s, { viewed: date }), first: true };
      }
      __name(recordView, "recordView");
      const PUZZLE_ID = /^[a-z0-9][a-z0-9-]{0,39}$/;
      const dsl = /* @__PURE__ */ __name((v) => v === null || Number.isInteger(v) && v >= 0 && v <= 3650, "dsl");
      const EVENTS = {
        puzzle_viewed: { puzzleId: "id", returning: "bool", daysSinceLastPlay: "dsl" },
        puzzle_attempted: { puzzleId: "id", stars: "stars", saved: "bool", isFirstAttemptOfDay: "bool", streak: "streak", daysSinceLastPlay: "dsl" },
        puzzle_replayed: { puzzleId: "id" },
        result_shared: { puzzleId: "id" },
        full_match_clicked: { puzzleId: "id" }
      };
      const CHECK = {
        id: /* @__PURE__ */ __name((v) => typeof v === "string" && PUZZLE_ID.test(v), "id"),
        bool: /* @__PURE__ */ __name((v) => typeof v === "boolean", "bool"),
        stars: isStars,
        streak: /* @__PURE__ */ __name((v) => Number.isInteger(v) && v >= 0 && v <= 3650, "streak"),
        dsl
      };
      function validateEvent(e) {
        if (!e || typeof e !== "object" || Array.isArray(e)) return { ok: false, why: "not an object" };
        const spec = EVENTS[e.name];
        if (!spec) return { ok: false, why: "unknown event" };
        const props = e.props && typeof e.props === "object" && !Array.isArray(e.props) ? e.props : null;
        if (!props) return { ok: false, why: "no props" };
        for (const k of Object.keys(e)) if (k !== "name" && k !== "props") return { ok: false, why: "extra field " + k };
        for (const k of Object.keys(props)) if (!(k in spec)) return { ok: false, why: "extra prop " + k };
        for (const [k, type] of Object.entries(spec)) if (!(k in props) || !CHECK[type](props[k])) return { ok: false, why: "bad " + k };
        return { ok: true, event: { name: e.name, props: Object.assign({}, props) } };
      }
      __name(validateEvent, "validateEvent");
      function dslBucket(v) {
        return v == null ? "new" : v === 0 ? "0" : v === 1 ? "1" : v <= 6 ? "2-6" : "7+";
      }
      __name(dslBucket, "dslBucket");
      const DSL_BUCKETS = ["new", "0", "1", "2-6", "7+"];
      function counterFor(ev, day) {
        const p = ev.props, c = { day, puzzle: p.puzzleId, event: ev.name, stars: -1, saved: -1, returning: -1, dsl: "" };
        if (ev.name === "puzzle_viewed") {
          c.returning = p.returning ? 1 : 0;
          c.dsl = dslBucket(p.daysSinceLastPlay);
        }
        if (ev.name === "puzzle_attempted") {
          c.dsl = dslBucket(p.daysSinceLastPlay);
          if (p.isFirstAttemptOfDay) {
            c.stars = Math.round(p.stars * 2);
            c.saved = p.saved ? 1 : 0;
          } else c.event = "puzzle_attempted_repeat";
        }
        return c;
      }
      __name(counterFor, "counterFor");
      const counterKey = /* @__PURE__ */ __name((c) => [c.day, c.puzzle, c.event, c.stars, c.saved, c.returning, c.dsl].join("|"), "counterKey");
      const TARGETS = {
        // rough first guesses, to be edited once real numbers come in
        attemptRate: 0.5,
        // attempted ÷ viewed, at least
        nextDayReturn: 0.2,
        // today's attempts from yesterday's players ÷ yesterday's attempts, at least
        shareRate: 0.1,
        // shares ÷ attempts, at least
        avgStars: [2, 3.7],
        // average stars (0–5), between
        tooEasy: 0.7,
        // a puzzle where more than this share get 5 stars
        tooHard: 0.1,
        // a puzzle where fewer than this share get 5 stars
        savedTileMin: 30
        // attempts today before the "Saved it, %" tile appears
      };
      function todaySummary(rows, day, min = TARGETS.savedTileMin) {
        let attempts = 0, saved = 0;
        for (const r of rows) if (r.day === day && r.event === "puzzle_attempted" && r.stars >= 0) {
          attempts += r.n;
          if (r.saved === 1) saved += r.n;
        }
        return { day, attempts, savedPct: attempts >= min ? Math.round(100 * saved / attempts) : null };
      }
      __name(todaySummary, "todaySummary");
      const ratio = /* @__PURE__ */ __name((a, b) => b ? a / b : null, "ratio");
      function dailyMetrics(rows, endDay, days = 14) {
        const out = [], by = /* @__PURE__ */ new Map();
        const blank = /* @__PURE__ */ __name(() => ({ viewed: 0, attempts: 0, starSum: 0, saved: 0, five: 0, replays: 0, repeats: 0, shares: 0, full: 0, fromYesterday: 0 }), "blank");
        for (const r of rows) {
          if (!by.has(r.day)) by.set(r.day, blank());
          const d = by.get(r.day);
          if (r.event === "puzzle_viewed") d.viewed += r.n;
          else if (r.event === "puzzle_attempted" && r.stars >= 0) {
            d.attempts += r.n;
            d.starSum += r.n * r.stars / 2;
            if (r.saved === 1) d.saved += r.n;
            if (r.stars === 10) d.five += r.n;
            if (r.dsl === "1") d.fromYesterday += r.n;
          } else if (r.event === "puzzle_attempted_repeat") d.repeats += r.n;
          else if (r.event === "puzzle_replayed") d.replays += r.n;
          else if (r.event === "result_shared") d.shares += r.n;
          else if (r.event === "full_match_clicked") d.full += r.n;
        }
        for (let i = days - 1; i >= 0; i--) {
          const day = addDays(endDay, -i), d = by.get(day) || blank(), prev = by.get(addDays(day, -1)) || blank();
          out.push({
            day,
            viewed: d.viewed,
            attempts: d.attempts,
            attemptRate: ratio(d.attempts, d.viewed),
            avgStars: ratio(d.starSum, d.attempts),
            savedRate: ratio(d.saved, d.attempts),
            replaysPerAttempt: ratio(d.replays, d.attempts),
            sharesPerAttempt: ratio(d.shares, d.attempts),
            fullPerAttempt: ratio(d.full, d.attempts),
            nextDayReturn: ratio(d.fromYesterday, prev.attempts)
          });
        }
        return out;
      }
      __name(dailyMetrics, "dailyMetrics");
      const BANDS = ["0", "1", "2", "3", "4", "5"];
      function puzzleMetrics(rows, targets = TARGETS) {
        const by = /* @__PURE__ */ new Map();
        for (const r of rows) {
          if (!by.has(r.puzzle)) by.set(r.puzzle, { puzzle: r.puzzle, viewed: 0, attempted: 0, bands: [0, 0, 0, 0, 0, 0], starSum: 0, five: 0, saved: 0 });
          const p = by.get(r.puzzle);
          if (r.event === "puzzle_viewed") p.viewed += r.n;
          if (r.event === "puzzle_attempted" && r.stars >= 0) {
            p.attempted += r.n;
            p.bands[Math.floor(r.stars / 2)] += r.n;
            p.starSum += r.n * r.stars / 2;
            if (r.stars === 10) p.five += r.n;
            if (r.saved === 1) p.saved += r.n;
          }
        }
        return [...by.values()].map((p) => {
          const fiveShare = ratio(p.five, p.attempted);
          return Object.assign(p, {
            avgStars: ratio(p.starSum, p.attempted),
            fiveShare,
            savedShare: ratio(p.saved, p.attempted),
            flag: fiveShare == null ? "" : fiveShare > targets.tooEasy ? "too easy" : fiveShare < targets.tooHard ? "too hard" : ""
          });
        }).sort((a, b) => b.attempted - a.attempted || (a.puzzle < b.puzzle ? -1 : 1));
      }
      __name(puzzleMetrics, "puzzleMetrics");
      function verdict(daily, targets = TARGETS) {
        const sum = /* @__PURE__ */ __name((k) => daily.reduce((a, d) => a + (d[k] || 0), 0), "sum");
        const attempts = sum("attempts"), viewed = sum("viewed");
        const w = /* @__PURE__ */ __name((k) => {
          let n = 0, t = 0;
          for (const d of daily) if (d[k] != null) {
            n += d[k] * d.attempts;
            t += d.attempts;
          }
          return t ? n / t : null;
        }, "w");
        let ret = 0, prev = 0;
        for (let i = 1; i < daily.length; i++) if (daily[i].nextDayReturn != null) {
          ret += daily[i].nextDayReturn * daily[i - 1].attempts;
          prev += daily[i - 1].attempts;
        }
        const rows = [
          { key: "attemptRate", label: "Attempt rate", value: ratio(attempts, viewed), target: `at least ${pct(targets.attemptRate)}`, ok: /* @__PURE__ */ __name((v) => v >= targets.attemptRate, "ok"), fmt: pct },
          { key: "nextDayReturn", label: "Next-day return", value: ratio(ret, prev), target: `at least ${pct(targets.nextDayReturn)}`, ok: /* @__PURE__ */ __name((v) => v >= targets.nextDayReturn, "ok"), fmt: pct },
          { key: "shareRate", label: "Share rate", value: w("sharesPerAttempt"), target: `at least ${pct(targets.shareRate)}`, ok: /* @__PURE__ */ __name((v) => v >= targets.shareRate, "ok"), fmt: pct },
          { key: "avgStars", label: "Average stars", value: w("avgStars"), target: `${targets.avgStars[0]}\u2013${targets.avgStars[1]}`, ok: /* @__PURE__ */ __name((v) => v >= targets.avgStars[0] && v <= targets.avgStars[1], "ok"), fmt: /* @__PURE__ */ __name((v) => v.toFixed(2), "fmt") }
        ];
        return rows.map((r) => ({ key: r.key, label: r.label, target: r.target, value: r.value, shown: r.value == null ? "\u2013" : r.fmt(r.value), met: r.value == null ? null : r.ok(r.value) }));
      }
      __name(verdict, "verdict");
      function pct(v) {
        return v == null ? "\u2013" : Math.round(v * 100) + "%";
      }
      __name(pct, "pct");
      const COUNTER_COLUMNS = ["day", "puzzle", "event", "stars", "saved", "returning", "dsl", "n"];
      function toCsv(rows) {
        const q = /* @__PURE__ */ __name((v) => {
          const s = String(v == null ? "" : v);
          return /[",\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
        }, "q");
        return [COUNTER_COLUMNS.join(","), ...rows.map((r) => COUNTER_COLUMNS.map((c) => q(c === "stars" && r.stars >= 0 ? r.stars / 2 : r[c])).join(","))].join("\n") + "\n";
      }
      __name(toCsv, "toCsv");
      const api = {
        TZ,
        START,
        londonDate,
        addDays,
        daysBetween,
        isDate,
        issueNumber,
        puzzleIndex,
        nextLondonMidnight,
        countdown,
        OUTCOMES,
        OUTCOME_KEYS,
        outcomeOf,
        oppCount,
        isSaved,
        outcomeInfo,
        beatShare,
        topCut,
        starsFor,
        isStars,
        starText,
        starWords,
        shareText,
        headHash,
        STATS_KEY,
        freshStats,
        cleanStats,
        loadStats,
        saveStats,
        daysSinceLastPlay,
        currentStreak,
        playedToday,
        recordAttempt,
        recordView,
        EVENTS,
        validateEvent,
        dslBucket,
        DSL_BUCKETS,
        counterFor,
        counterKey,
        TARGETS,
        todaySummary,
        dailyMetrics,
        puzzleMetrics,
        verdict,
        pct,
        BANDS,
        COUNTER_COLUMNS,
        toCsv
      };
      if (typeof module === "object" && module && module.exports) module.exports = api;
      else root.SkipCore = api;
    })(typeof globalThis !== "undefined" ? globalThis : exports);
  }
});

// src/index.js
var import_skip_core = __toESM(require_skip_core(), 1);
var MAX_BODY = 1024;
var index_default = {
  async fetch(req, env) {
    try {
      return await handle(req, env, Date.now());
    } catch (e) {
      return reply(req, env, 500, { error: "Something went wrong." });
    }
  }
};
async function handle(req, env, now) {
  const url = new URL(req.url), path = url.pathname.replace(/\/+$/, "") || "/";
  if (req.method === "OPTIONS") return reply(req, env, 204, null, { "Access-Control-Allow-Methods": "GET, POST", "Access-Control-Allow-Headers": "Authorization, Content-Type", "Access-Control-Max-Age": "86400" });
  if (path === "/e" && req.method === "POST") return event(req, env, now);
  if (path === "/today" && req.method === "GET") return today(req, env, now);
  if (path.startsWith("/admin/") && req.method === "GET") return admin(req, env, path, url);
  return reply(req, env, 404, { error: "Not found." });
}
__name(handle, "handle");
async function event(req, env, now) {
  if (!await allowed(env, ip(req))) return reply(req, env, 429, { error: "Too many events." });
  const text = await req.text();
  if (text.length > MAX_BODY) return reply(req, env, 413, { error: "Too large." });
  let body;
  try {
    body = JSON.parse(text);
  } catch (e) {
    return reply(req, env, 400, { error: "Not JSON." });
  }
  const v = import_skip_core.default.validateEvent(body);
  if (!v.ok) return reply(req, env, 400, { error: v.why });
  const c = import_skip_core.default.counterFor(v.event, import_skip_core.default.londonDate(now));
  await env.DB.prepare(
    `INSERT INTO counters (day, puzzle, event, stars, saved, ret, dsl, n) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, 1)
     ON CONFLICT (day, puzzle, event, stars, saved, ret, dsl) DO UPDATE SET n = n + 1`
  ).bind(c.day, c.puzzle, c.event, c.stars, c.saved, c.returning, c.dsl).run();
  return reply(req, env, 204, null);
}
__name(event, "event");
async function today(req, env, now) {
  const day = import_skip_core.default.londonDate(now);
  const { results } = await env.DB.prepare(`SELECT * FROM counters WHERE day = ?1 AND event = 'puzzle_attempted'`).bind(day).all();
  return reply(req, env, 200, import_skip_core.default.todaySummary(results.map(row), day), { "Cache-Control": "public, max-age=60" });
}
__name(today, "today");
async function admin(req, env, path, url) {
  if (!env.ADMIN_KEY) return reply(req, env, 503, { error: "The dashboard key has not been set. Run: npx wrangler secret put ADMIN_KEY" });
  const given = (req.headers.get("Authorization") || "").replace(/^Bearer\s+/i, "");
  if (!await allowed(env, "admin:" + ip(req)) || !given || !await sameSecret(given, env.ADMIN_KEY)) return reply(req, env, 401, { error: "That key was not accepted." });
  const from = import_skip_core.default.isDate(url.searchParams.get("from")) ? url.searchParams.get("from") : "2000-01-01";
  const { results } = await env.DB.prepare(`SELECT * FROM counters WHERE day >= ?1 ORDER BY day, puzzle, event, stars, saved, ret, dsl`).bind(from).all();
  const rows = results.map(row);
  if (path === "/admin/counters.csv") return reply(req, env, 200, import_skip_core.default.toCsv(rows), { "Content-Type": "text/csv; charset=utf-8", "Content-Disposition": 'attachment; filename="skip-counters.csv"', "Cache-Control": "no-store" });
  if (path === "/admin/counters") return reply(req, env, 200, { rows }, { "Cache-Control": "no-store" });
  return reply(req, env, 404, { error: "Not found." });
}
__name(admin, "admin");
var row = /* @__PURE__ */ __name((r) => ({ day: r.day, puzzle: r.puzzle, event: r.event, stars: r.stars, saved: r.saved, returning: r.ret, dsl: r.dsl, n: r.n }), "row");
var ip = /* @__PURE__ */ __name((req) => req.headers.get("CF-Connecting-IP") || "unknown", "ip");
async function allowed(env, key) {
  if (!env.LIMITER) return true;
  try {
    return (await env.LIMITER.limit({ key })).success;
  } catch (e) {
    return true;
  }
}
__name(allowed, "allowed");
async function sameSecret(a, b) {
  const enc = new TextEncoder(), [x, y] = await Promise.all([a, b].map((s) => crypto.subtle.digest("SHA-256", enc.encode(s))));
  const p = new Uint8Array(x), q = new Uint8Array(y);
  let d = 0;
  for (let i = 0; i < p.length; i++) d |= p[i] ^ q[i];
  return d === 0;
}
__name(sameSecret, "sameSecret");
function reply(req, env, status, body, extra = {}) {
  const origin = req.headers.get("Origin"), ok = (env.ALLOWED_ORIGINS || "").split(",").map((s) => s.trim()).filter(Boolean);
  const headers = { Vary: "Origin", "X-Content-Type-Options": "nosniff", ...extra };
  if (origin && ok.includes(origin)) headers["Access-Control-Allow-Origin"] = origin;
  if (body == null) return new Response(null, { status, headers });
  if (typeof body === "string") return new Response(body, { status, headers });
  return new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json; charset=utf-8", ...headers } });
}
__name(reply, "reply");
export {
  index_default as default,
  handle
};
