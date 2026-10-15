# bias-stats: the stats Worker for "Over to you, skip"

A Cloudflare Worker with a D1 database. The daily puzzle sends it anonymous events and it keeps
**daily counters only**: no raw events, no IP addresses, no browser details, nothing that could
recognise a player. It also serves the "Saved it, %" tile and the private dashboard's data.

| Endpoint | Who uses it |
| --- | --- |
| `POST /e` | the game: one event, checked against the allowlist in `bias/skip/skip-core.js` |
| `GET /today` | the game: today's first attempts and the share who saved the end (hidden below 30) |
| `GET /admin/counters` and `/admin/counters.csv` | the dashboard, with `Authorization: Bearer <ADMIN_KEY>` |

The game sends to `https://bias-stats.bias-relay.workers.dev`. If your workers.dev subdomain is not
`bias-relay`, change `STATS_URL` in `bias/skip/skip.js` and `STATS` in `bias/admin/skip/index.html`.

## Deploying it, way 1: in the Cloudflare dashboard (no tools to install)

1. **Workers & Pages → Create → Create Worker.** Name it `bias-stats` and deploy the starter.
2. **Storage & databases → D1 → Create database**, named `bias-stats`. Open its **Console**, paste the
   contents of `schema.sql`, and run it.
3. Back on the `bias-stats` Worker: **Edit code**, replace everything with the contents of
   `dist/worker.js`, and **Deploy**.
4. **Settings → Bindings → Add → D1 database**: variable name `DB`, database `bias-stats`.
5. **Settings → Variables and secrets**:
   - add a **text** variable `ALLOWED_ORIGINS` = `https://www.johnsav.co.uk,https://johnsav.co.uk`
   - add a **secret** `ADMIN_KEY` = a long passphrase of your own. This is the dashboard key: keep it
     in your password manager, never in the code or a URL.
6. Optional, recommended: **Settings → Bindings → Add → Rate limiting**, name `LIMITER`,
   300 requests per 60 seconds. Without it the Worker still runs, just without a per-address limit.

## Deploying it, way 2: with wrangler (from a computer or a Claude Code session with Node)

```bash
cd bias/stats-worker
npx wrangler login                       # or set CLOUDFLARE_API_TOKEN
npx wrangler d1 create bias-stats        # copy the database_id into wrangler.toml
npx wrangler d1 execute bias-stats --remote --file schema.sql
npx wrangler secret put ADMIN_KEY        # type the dashboard key when asked
npx wrangler deploy
```

## Checking it

- `https://bias-stats.bias-relay.workers.dev/today` should answer with today's date and `"attempts":0`.
- Open `https://www.johnsav.co.uk/bias/admin/skip/` and enter the dashboard key.

## Changing it

The logic lives in `src/index.js`; the rules for events and counters live in `bias/skip/skip-core.js`,
shared with the game. Tests: `node bias/skip/tests/run.cjs`. After a change, rebuild `dist/worker.js`
(`npx wrangler deploy --dry-run --outdir dist`, then rename `dist/index.js` to `dist/worker.js`) or
deploy with wrangler.

Run it locally with `npx wrangler dev --local` (port 8788); the game and dashboard served from
`localhost:8765` talk to it automatically.
