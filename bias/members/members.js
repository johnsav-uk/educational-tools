/* Members: the panel behind the Members button on the title menu (FEATURES.accounts in index.html).
   Loaded only when it's opened, or shortly after the page loads for someone already signed in.

   Accounts live in the bias-league Worker, which also runs the league pages. This page is on
   another site, so it signs in with a bearer token (kept in store 'league.token', never a cookie)
   and sends it in an Authorization header. The noticeboard is reached with a one-minute ticket the
   Worker swaps for its own sign-in, so nobody signs in twice.

   Nothing here is sent anywhere until the player signs in or joins. No chat, no free text: the
   only things typed are a username, an email and a password. */
(function () {
  'use strict';
  const local = ['localhost', '127.0.0.1'].includes(location.hostname);
  const override = local && new URLSearchParams(location.search).get('leagueApi');   // a local copy may point at its own wrangler dev
  const API = override && /^http:\/\/(localhost|127\.0\.0\.1):\d+$/.test(override) ? override
    : local ? 'http://127.0.0.1:8790' : 'https://bias-league.bias-relay.workers.dev';

  let H = null, view = 'signin', page = 'home';   // page: which signed-in page is showing
  let resetToken = null;                          // from an emailed link (#reset=<token>): view 'reset'
  const $ = id => document.getElementById(id);
  const token = () => H.store.get('league.token', null);
  const signedOut = () => { H.store.set('league.token', null); H.store.set('member.name', null); creator(false); H.paint(null, 0); };
  const CREATOR_COLOURS = ['lfc'];   // the game's COLOURS with creator: true (and league/site/shared/bowls.js)
  /* The creator's own bowl colour (the game's COLOURS, creator: true) is offered only while the creator is
     signed in here; anyone else, or nobody, has it put back to claret wherever this browser chose it. */
  function creator(on) {
    H.store.set('member.creator', !!on);
    if (on) return;
    for (const k of ['on.col', 'm.col0', 'm.col1', 'pr.colour']) if (CREATOR_COLOURS.includes(H.store.get(k, null))) H.store.set(k, 'claret');
  }

  // POST JSON when there's a body, GET otherwise. Resolves to the JSON, with .error on failure.
  async function call(path, body) {
    const headers = { 'content-type': 'application/json' }, t = token();
    if (t) headers.authorization = 'Bearer ' + t;
    try {
      const r = await fetch(API + path, { method: body === undefined ? 'GET' : 'POST', headers, body: body === undefined ? undefined : JSON.stringify(body), credentials: 'omit', cache: 'no-store' });
      const j = await r.json().catch(() => ({ error: 'Unexpected reply.' }));
      if (r.status === 401 && t && !/^\/api\/(login|signup)/.test(path)) { signedOut(); j.loggedOut = true; }
      return j;
    } catch (e) { return { error: 'You seem to be offline. Try again in a moment.' }; }
  }

  function signedIn(r) {
    H.store.set('league.token', r.token); H.store.set('member.name', r.user.username);
    H.paint(r.user.username, 0); if (H.club) clubStart();
    if (linked(r.user.id) || declined(r.user.id)) home(); else carry(r.user.id);
  }

  /* ---------- this browser and the account (the rules are in sync.js) ----------
     The first time an account signs in here, carry() shows what would move each way and does
     nothing until the player agrees. After that, syncNow() keeps the two in step whenever the
     Members panel looks in: store 'member.sync' is the account this browser is joined to (minus
     it for "Not now"). */
  const S = () => window.BiasSync;
  const linked = uid => H.store.get('member.sync', null) === uid;
  const declined = uid => H.store.get('member.sync', null) === -uid;
  function browserId() {
    let b = H.store.get('member.browser', null);
    if (!/^[a-z0-9]{6,24}$/.test(b || '')) { b = Date.now().toString(36) + Math.random().toString(36).slice(2, 8); H.store.set('member.browser', b); }
    return b;
  }
  const writeAll = w => { for (const k in w) H.store.set(k, w[k]); };
  async function syncNow(uid) {
    if (!linked(uid) || !S()) return null;
    const d = await call('/api/data'); if (d.error) return null;
    const b = browserId(), acct = d.rows.find(r => r.kind === 'profile');
    const { writes, send } = S().step(S().snapshot(H.store), d.rows, b, H.store.get('member.syncedProfile', null), H.store.get('member.syncedAt', 0));
    writeAll(writes);
    if (acct && S().PROFILE_KEYS.some(k => k in writes)) { H.store.set('member.syncedProfile', acct.json); H.store.set('member.syncedAt', acct.updatedAt); }
    // sent only when it differs from what was last sent (a short hash of it, in 'member.sent')
    let h = 0x811c9dc5; const sig = uid + JSON.stringify(send);
    for (let i = 0; i < sig.length; i++) { h ^= sig.charCodeAt(i); h = Math.imul(h, 0x01000193) >>> 0; }
    if (send.profile || H.store.get('member.sent', null) !== h) {
      const r = await call('/api/data', send);
      if (!r.error) H.store.set('member.sent', h);
      if (!r.error && send.profile) { H.store.set('member.syncedProfile', send.profile); H.store.set('member.syncedAt', r.at); }
    }
    return { rows: d.rows, local: S().snapshot(H.store), browser: b };
  }
  async function carry(uid) {
    page = 'carry';
    H.head('This browser and your account', 'Nothing moves until you say so'); if (H.top) H.top();
    H.body().innerHTML = '<p class="acct-note">Loading…</p>';
    const d = await call('/api/data');
    if (page !== 'carry') return;
    if (d.error || !S()) { H.body().innerHTML = `<p class="acct-err">${H.esc(d.error || 'This could not load.')}</p><button class="btn ghost" type="button" id="acBackHome">‹ Back to Members</button>`; $('acBackHome').onclick = home; return; }
    const b = browserId(), p = S().plan(S().snapshot(H.store), d.rows, b), acct = d.rows.find(r => r.kind === 'profile');
    const join = async () => {
      writeAll(p.writes); H.store.set('member.sync', uid);
      H.store.set('member.syncedProfile', acct ? acct.json : null); H.store.set('member.syncedAt', acct ? acct.updatedAt : 0);
      await syncNow(uid);
    };
    if (!p.up.length && !p.down.length) { await join(); home(); return; }   // nothing either way: just join
    const list = items => `<ul class="acct-carry">${items.map(t => `<li>${H.esc(t)}</li>`).join('')}</ul>`;
    H.body().innerHTML = `
      ${p.up.length ? `<h3>From this browser to your account</h3>${list(p.up)}` : ''}
      ${p.down.length ? `<h3>From your account to this browser</h3>${list(p.down)}` : ''}
      <p class="acct-note">After this, while you’re signed in here, this browser keeps your account up to date: your record, streak and stars. Only you can see it, and it goes if you delete your account.</p>
      <div class="acct-confirm-btns"><button class="btn primary" type="button" id="acCarryYes">Carry it over</button><button class="btn" type="button" id="acCarryNo">Not now</button></div>`;
    $('acCarryNo').onclick = () => { H.store.set('member.sync', -uid); home(); };
    $('acCarryYes').onclick = async () => {
      $('acCarryYes').disabled = true;
      await join();
      if (!Object.keys(p.writes).length) { home(); return; }
      H.head('Carried over', 'This browser is joined to your account');
      H.body().innerHTML = `<p>Done. What came from your account shows when the game next opens.</p>
        <div class="acct-confirm-btns"><button class="btn primary" type="button" id="acReload">Open the game again now</button><button class="btn ghost" type="button" id="acBackHome">‹ Back to Members</button></div>`;
      $('acReload').onclick = () => location.reload(); $('acBackHome').onclick = home;
    };
  }

  // ---------- signed out: sign in, join, forgot, and a new password from an emailed link ----------
  const TABS = [['signin', 'Sign in'], ['join', 'Join'], ['forgot', 'Forgot password']];
  function form() {
    H.head(view === 'join' ? 'Join Bias' : view === 'forgot' ? 'Forgot your password?' : view === 'reset' ? 'Choose a new password' : 'Sign in',
      view === 'join' ? 'Free. For leagues against other members' : view === 'reset' ? 'From the link in your email' : 'Members play in leagues');
    const has = (...v) => v.includes(view), esc = H.esc;
    H.body().innerHTML = `
      ${view === 'reset' ? '' : `<div class="acct-tabs" role="group">${TABS.map(([v, l]) => `<button type="button" data-v="${v}" aria-pressed="${v === view}">${l}</button>`).join('')}</div>`}
      <form id="acF" autocomplete="on" novalidate>
        ${has('signin', 'join') ? '<div class="field"><label for="acU">Username</label><input class="input" id="acU" name="username" autocomplete="username" maxlength="16" autocapitalize="off" spellcheck="false" required></div>' : ''}
        ${has('join', 'forgot') ? '<div class="field"><label for="acE">Email</label><input class="input" id="acE" type="email" name="email" autocomplete="email" maxlength="254" spellcheck="false" required></div>' : ''}
        ${has('signin', 'join') ? `<div class="field"><label for="acP">${view === 'join' ? 'Choose a password (8 or more)' : 'Password'}</label><input class="input" id="acP" type="password" name="password" autocomplete="${view === 'join' ? 'new-password' : 'current-password'}" required></div>` : ''}
        ${has('reset') ? '<div class="field"><label for="acP">New password (8 or more)</label><input class="input" id="acP" type="password" name="password" autocomplete="new-password" required></div>' : ''}
        ${has('join') ? '<label class="acct-tick"><input id="acAge" type="checkbox"> I’m 13 or over</label>' : ''}
        <p class="acct-note">${{
          signin: '',
          join: `Your username is your name in league tables: 3 to 16 letters, numbers or _, and not your real name. Your email is only for getting back in if you forget your password: we keep a scrambled form of it, never the address, and never email you anything else. <a href="privacy/" target="_blank" rel="noopener">Privacy, in plain words</a>`,
          forgot: 'Type the email you joined with. We’ll send your username and a link to choose a new password. It’s the only email Bias ever sends.',
          reset: 'You’ll be signed in here, and signed out everywhere else.'
        }[view]}</p>
        <p class="acct-err" id="acErr" role="alert"></p>
        <button class="btn primary" type="submit">${view === 'join' ? 'Join' : view === 'forgot' ? 'Email me a link' : view === 'reset' ? 'Set my new password' : 'Sign in'}</button>
      </form>`;
    H.body().querySelectorAll('[data-v]').forEach(b => b.onclick = () => { view = b.dataset.v; form(); });
    $('acF').onsubmit = async e => {
      e.preventDefault();
      const val = id => $(id) ? $(id).value.trim() : '', btn = e.target.querySelector('[type=submit]');
      btn.disabled = true;
      let r;
      if (view === 'forgot') r = await call('/api/forgot', { email: val('acE') });
      else if (view === 'reset') r = await call('/api/reset-link', { token: resetToken, password: $('acP').value, bearer: true });
      else if (view === 'join') r = await call('/api/signup', { username: val('acU'), email: val('acE'), password: $('acP').value, ageOk: $('acAge').checked, bearer: true });
      else r = await call('/api/login', { username: val('acU'), password: $('acP').value, bearer: true });
      btn.disabled = false;
      if (r.error) {
        $('acErr').textContent = r.error;
        if (view === 'reset' && /used or has run out/.test(r.error)) { view = 'forgot'; resetToken = null; form(); $('acErr').textContent = r.error; }
        return;
      }
      if (view === 'reset') { resetToken = null; view = 'signin'; }
      if (view === 'forgot') { H.body().innerHTML = `<p>${H.esc(r.message)}</p><button class="btn" type="button" id="acBackIn">Back to sign in</button>`; $('acBackIn').onclick = () => { view = 'signin'; form(); }; return; }
      signedIn(r);
    };
    const first = H.body().querySelector('input'); if (first) first.focus();
  }

  // ---------- signed in ----------
  const plural = (n, one, many) => `${n} ${n === 1 ? one : many}`;
  const day = t => new Date(t).toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' });
  const waitingOf = s => (s.leagues || []).reduce((n, l) => n + l.waiting + l.confirm, 0) + (s.challenges ? s.challenges.incoming + s.challenges.confirm : 0);
  const eloTag = r => r ? ` (${r.rating}${r.provisional ? '?' : ''})` : '';
  // the Golden Wood (beat Walter, the top bot) beside a member's name
  const gwTag = r => r && r.gw ? ' <img class="gw" src="img/golden-wood.png" width="16" height="16" alt="Golden Wood" title="Golden Wood: beat Walter Pennick, the Legend of Fernley">' : '';

  function leagueItem(l) {
    const esc = H.esc;
    const when = l.status === 'open' ? `Starts ${day(l.startAt)}` : l.status === 'running' ? `Play all fixtures by ${day(l.deadlineAt)}` : 'Finished';
    const place = l.status === 'open' ? 'Signed up' : l.state === 'reserve' ? 'No place this time' : l.removed ? 'Removed at the deadline' : '';   // before the draw everyone is just signed up
    // gold for what needs your answer, plain for what's still to play
    const chips = [[l.waiting, plural(l.waiting, 'proposal for you', 'proposals for you'), true], [l.confirm, plural(l.confirm, 'result to confirm', 'results to confirm'), true], [l.owed, plural(l.owed, 'fixture to play', 'fixtures to play'), false]].filter(c => c[0]);
    return `<li><div class="acct-lg"><b>${esc(l.name)}</b><span>${esc([when, place].filter(Boolean).join(' · '))}</span></div>
      ${chips.length ? `<div class="acct-chips">${chips.map(([, text, hot]) => `<span${hot ? ' class="hot"' : ''}>${esc(text)}</span>`).join('')}</div>` : ''}
      <button class="btn" type="button" data-board="${l.id}">Noticeboard</button></li>`;
  }

  /* Challenges: one match against any member, rated or casual, on the league site's Challenges page
     (league/site/challenges.html). Here only the counts: challenges for you, accepted ones to play,
     results to confirm. */
  function challengeBlock(c) {
    const esc = H.esc;
    const chips = c ? [[c.incoming, plural(c.incoming, 'challenge for you', 'challenges for you'), true], [c.confirm, plural(c.confirm, 'result to confirm', 'results to confirm'), true], [c.ready, plural(c.ready, 'game to play', 'games to play'), false]].filter(x => x[0]) : [];
    return `<h3>Challenges</h3>
      <ul class="acct-list"><li><div class="acct-lg"><b>Challenge a member</b><span>One match of 5 ends, rated or casual</span></div>
        ${chips.length ? `<div class="acct-chips">${chips.map(([, text, hot]) => `<span${hot ? ' class="hot"' : ''}>${esc(text)}</span>`).join('')}</div>` : ''}
        <button class="btn" type="button" data-board="challenges">Challenges</button></li>
      <li><div class="acct-lg"><b>Rated game now</b><span>Paired at once with a member near your rating. Wins move your Elo</span></div>
        <button class="btn primary" type="button" data-board="live">Find a rated game</button></li></ul>`;
  }

  /* Your Elo rating, from confirmed league games and rated challenges: it starts at 1200 and moves
     after each one. Other members see it in brackets after your name. */
  /* What's new: a note for members until they press Got it (store 'member.news'). Change NEWS_ID
     when it changes. The league noticeboard (league/site/board/board.js) has its own copy. */
  const NEWS_ID = '2026-10-30', newsSeen = () => H.store.get('member.news', null) === NEWS_ID;
  const NEWS_HTML = `<div class="acct-news" id="acNews"><h3>What’s new</h3><ul>
      <li><b>Rated games now.</b> In Play online, or below, press Find a rated game: you’re paired at once with a member near your rating, for 5 ends, and wins move your Elo.</li>
      <li><b>Challenges.</b> Challenge any member to a single match, rated or casual, from Challenges below. You see what a win, draw or loss would do to your rating before you send it.</li>
      <li><b>Ratings beside every name.</b> Every member’s Elo now shows in brackets after their name: “Sam (1234)”. A ? means provisional (under 10 rated games).</li>
      <li><b>New leagues, one for each night.</b> From Monday 2 November, leagues are arranged by the evening you can play. The Monday night league takes sign-ups on Monday from 6 to 10pm (UK time), and its fixtures are played the following Monday. Tuesday’s league works the same way, and so on through the week.</li>
      <li><b>An Aussie league.</b> For players in Australia, an Aussie league will take sign-ups at the same times of day, in Adelaide time.</li>
      <li><b>Two new clubs to try.</b> Pitfold Park, a tired park green that is heavy and uneven, and Fernley Indoor, a flat blue carpet at 17 s. Find them under Beta games below, or on the title menu.</li>
      <li><b>Beta games are here.</b> Darts and round the clock, against the computer. Find them below, or under Beta games on the title menu.</li>
    </ul><button class="acct-link" type="button" id="acNewsOk">Got it</button></div>`;
  const recLine = t => `${plural(t.played, 'match', 'matches')} · ${t.won} won · ${t.drawn} drawn · ${t.lost} lost`;
  // with this browser's own record of finished matches underneath, when there is one. Only the
  // number shows until the arrow is pressed; the box remembers being open (store 'member.ratingOpen').
  function ratingBlock(r, rec) {
    if (!r) return '';
    const week = r.week ? ` · <span class="${r.week > 0 ? 'up' : 'down'}">${r.week > 0 ? '▲' : '▼'} ${Math.abs(r.week)} this week</span>` : '';
    const open = !!H.store.get('member.ratingOpen', false);
    return `<div class="acct-rating">
        <button class="acct-r-head" type="button" id="acRTog" aria-expanded="${open}" aria-controls="acRMore" aria-label="Rating ${r.rating}${r.provisional ? ', provisional' : ''}: ${open ? 'hide' : 'show'} the details">
          <span class="acct-r-num"><b>${r.rating}</b><span>Rating${r.provisional ? ' · provisional' : ''}</span></span>
          <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 9l6 6 6-6"/></svg></button>
        <div class="acct-r-more" id="acRMore"${open ? '' : ' hidden'}>
        <p>${r.games ? `${plural(r.games, 'rated game', 'rated games')}${week}${r.best > r.rating && r.best > 1200 ? ` · best ${r.best}` : ''}.${r.provisional ? ' Settles after 10 games.' : ''}` : 'Starts at 1200 and moves with each confirmed league game and rated challenge.'} Other members see it in brackets after your name.</p>
        <p class="acct-dev" id="acDev">${rec.played ? `On this device: ${recLine(rec)}` : ''}</p>
        <div class="acct-r-row"><button class="acct-link" type="button" id="acTable" aria-expanded="false" aria-controls="acTableBody">See the ratings table</button></div>
        <div id="acTableBody"></div>
        </div>
      </div>`;
  }
  async function showTable() {
    const box = $('acTableBody'); box.innerHTML = '<p class="acct-note">Loading…</p>';
    const t = await call('/api/ratings');
    if (t.error) { box.innerHTML = `<p class="acct-err">${H.esc(t.error)}</p>`; return; }
    box.innerHTML = t.rows.length ? `<ol class="acct-table">${t.rows.map(r => `<li${r.me ? ' class="me"' : ''}><span>${H.esc(r.name)}${gwTag(r)}</span><b>${r.rating}${r.provisional ? '<i title="Provisional: under 10 games">?</i>' : ''}</b></li>`).join('')}</ol>`
      : '<p class="acct-note">No rated games yet.</p>';
  }

  async function home() {
    page = 'home';
    const s = await call('/api/summary');
    if (page !== 'home') return;
    if (s.loggedOut || !s.user) { view = 'signin'; form(); if (s.loggedOut) $('acErr').textContent = 'You’ve been signed out. Please sign in again.'; return; }
    if (s.error) { H.body().innerHTML = `<p>${H.esc(s.error)}</p>`; return; }
    creator(s.creator);
    H.store.set('member.name', s.user.username);
    H.paint(s.user.username, waitingOf(s), s.openToJoin);
    H.head(s.user.username + eloTag(s.rating), 'Signed in', !!(s.rating && s.rating.gw)); if (H.top) H.top();
    const rec = H.record(), esc = H.esc;
    H.body().innerHTML = `
      ${newsSeen() ? '' : NEWS_HTML}
      ${s.canCreate ? '<button class="btn primary" type="button" data-board="admin">Organiser page</button>' : ''}
      ${ratingBlock(s.rating, rec)}
      ${challengeBlock(s.challenges)}
      <h3>Your leagues</h3>
      ${s.leagues.length ? `<ul class="acct-list">${s.leagues.map(leagueItem).join('')}</ul>` : ''}
      ${s.openToJoin ? `<button class="btn primary" type="button" id="acFind">Open leagues · ${s.openToJoin}</button>` : ''}
      <p class="acct-note">${s.leagues.length ? 'Arrange games on the noticeboard. Bias never emails you about them, so look in here for what’s waiting.'
        : s.openToJoin ? 'You’re not in a league yet.' : 'You’re not in a league, and none are taking sign-ups just now.'}</p>
      <h3>Beta games</h3>
      <ul class="acct-list acct-beta">
        <li><div class="acct-lg"><b>Darts</b><span>501 · against the computer</span></div><a class="btn ghost" href="members/beta/darts/" target="_blank" rel="noopener">Play</a></li>
        <li><div class="acct-lg"><b>Round the clock</b><span>1 to 20, then the bull · against the computer</span></div><a class="btn ghost" href="members/beta/round-the-clock/" target="_blank" rel="noopener">Play</a></li>
        <li><div class="acct-lg"><b>Pitfold Park</b><span>a tired park green · heavy (12 s) and uneven</span></div><a class="btn ghost" href="members/beta/pitfold/" target="_blank" rel="noopener">Play</a></li>
        <li><div class="acct-lg"><b>Fernley Indoor</b><span>a blue carpet · 17 s, no weather</span></div><a class="btn ghost" href="members/beta/fernley/" target="_blank" rel="noopener">Play</a></li>
      </ul>
      <p class="acct-note">Beta games open in a new tab, so a game you have on here carries on.</p>
      <h3>Your account</h3>
      ${linked(s.user.id) ? '' : `<button class="${declined(s.user.id) ? 'acct-link' : 'btn primary'}" type="button" id="acCarry">Bring this browser’s name, record and puzzle streak into your account</button>`}
      ${s.hasEmail ? '' : '<p class="acct-note"><b>No email on your account.</b> Add one so you can get back in if you forget your password.</p>'}
      <details class="acct-more"${s.hasEmail ? '' : ' open'}><summary>${s.hasEmail ? 'Change my email' : 'Add my email'}</summary>
        <form id="acEm" novalidate>
          <div class="field"><label for="acEmE">Email</label><input class="input" id="acEmE" type="email" autocomplete="email" maxlength="254" spellcheck="false"></div>
          <div class="field"><label for="acEmP">Your password</label><input class="input" id="acEmP" type="password" autocomplete="current-password"></div>
          <p class="acct-err" id="acEmErr" role="alert"></p>
          <button class="btn" type="submit">Save</button>
        </form></details>
      <details class="acct-more"><summary>Delete my account</summary>
        <form id="acDel" novalidate>
          <p class="acct-note">This wipes your username, password and email, and takes you off any league that hasn’t started. Results you’ve played stay in tables as “Former player”. It can’t be undone.</p>
          <div class="field"><label for="acDelP">Your password</label><input class="input" id="acDelP" type="password" autocomplete="current-password"></div>
          <p class="acct-err" id="acDelErr" role="alert"></p>
          <button class="btn acct-warn" type="submit" id="acDelGo">Delete my account</button>
          <div class="acct-confirm" id="acDelAsk" role="alertdialog" aria-labelledby="acDelQ" hidden>
            <p id="acDelQ"><b>Delete ${esc(s.user.username)} for good?</b> Your username, password and email are wiped straight away, and this can’t be undone.</p>
            <div class="acct-confirm-btns"><button class="btn acct-warn" type="button" id="acDelYes">Yes, delete it</button><button class="btn" type="button" id="acDelNo">Keep my account</button></div>
          </div>
        </form></details>
      <div class="acct-foot"><button class="btn ghost" type="button" id="acOut">Sign out</button><a href="privacy/" target="_blank" rel="noopener">Privacy</a></div>`;
    H.body().querySelectorAll('[data-board]').forEach(b => b.onclick = () => openBoard(b.dataset.board));
    if ($('acFind')) $('acFind').onclick = openLeagues;
    if ($('acNewsOk')) $('acNewsOk').onclick = () => { H.store.set('member.news', NEWS_ID); $('acNews').remove(); };
    if ($('acCarry')) $('acCarry').onclick = () => carry(s.user.id);
    // joined: keep in step, and show the record of all this account's browsers
    if (linked(s.user.id)) syncNow(s.user.id).then(x => {
      if (!x || page !== 'home' || !$('acDev')) return;
      const t = S().statsTotal(x.local.stats, x.rows, x.browser);
      if (t.played && t.browsers > 1) $('acDev').textContent = `All your browsers: ${recLine(t)}`;
    });
    if ($('acRTog')) $('acRTog').onclick = () => {
      const open = $('acRMore').hidden;
      $('acRMore').hidden = !open; H.store.set('member.ratingOpen', open);
      $('acRTog').setAttribute('aria-expanded', String(open));
      $('acRTog').setAttribute('aria-label', $('acRTog').getAttribute('aria-label').replace(/(show|hide) the details$/, open ? 'hide the details' : 'show the details'));
    };
    // the button opens the table and shuts it again
    if ($('acTable')) $('acTable').onclick = () => {
      const open = !!$('acTableBody').innerHTML;
      $('acTable').textContent = open ? 'See the ratings table' : 'Hide the ratings table'; $('acTable').setAttribute('aria-expanded', String(!open));
      if (open) $('acTableBody').innerHTML = ''; else showTable();
    };
    $('acOut').onclick = async () => { await call('/api/logout', {}); signedOut(); view = 'signin'; form(); };
    $('acEm').onsubmit = async e => {
      e.preventDefault();
      const r = await call('/api/account/email', { email: $('acEmE').value.trim(), password: $('acEmP').value });
      if (r.error) { $('acEmErr').textContent = r.error; return; }
      home();
    };
    // Delete asks first: the button only brings up a warning, and only its Yes deletes
    const asking = on => { $('acDelAsk').hidden = !on; $('acDelGo').hidden = on; (on ? $('acDelNo') : $('acDelGo')).focus(); };
    $('acDel').onsubmit = e => {
      e.preventDefault(); $('acDelErr').textContent = '';
      if (!$('acDelP').value) { $('acDelErr').textContent = 'Type your password first.'; $('acDelP').focus(); return; }
      asking(true);
    };
    $('acDelNo').onclick = () => asking(false);
    $('acDelYes').onclick = async () => {
      $('acDelYes').disabled = true;
      const r = await call('/api/account/delete', { password: $('acDelP').value });
      if (r.error) { $('acDelYes').disabled = false; asking(false); $('acDelErr').textContent = r.error; return; }
      signedOut();
      H.head('Account deleted', 'Your details are wiped');
      H.body().innerHTML = '<p>Your username, password and email have gone. Your record on this browser stays here, and you can keep playing as before.</p>';
    };
  }

  /* Open leagues: a page of its own inside the panel. Each league taking sign-ups that you haven't
     joined has its own Sign up; signing up says so in its place. A weeknight league's button opens the
     league site's sign-up sheet instead, where its rules are shown and must be ticked first. Places are drawn when the window
     closes (the league Worker's drawLeague), so there is no reserve list to join.
     Back, at the top or the foot, returns to the Members page (BiasMembers.back). Withdrawing is
     on the league pages. */
  async function openLeagues() {
    page = 'open';
    const esc = H.esc;
    H.head('Open leagues', 'Taking sign-ups now'); if (H.top) H.top();
    H.body().innerHTML = '<div id="acOpen"><p class="acct-note">Loading…</p></div><button class="btn ghost" type="button" id="acBackHome">‹ Back to Members</button>';
    $('acBackHome').onclick = home;
    const r = await call('/api/leagues'), box = $('acOpen');
    if (page !== 'open' || !box) return;
    if (r.loggedOut) { view = 'signin'; form(); return; }
    if (r.error) { box.innerHTML = `<p class="acct-err">${esc(r.error)}</p>`; return; }
    const ls = (r.leagues || []).filter(l => l.status === 'open' && (!l.mine || l.mine === 'withdrawn'));
    if (!ls.length) { box.innerHTML = '<p class="acct-note">No leagues are taking sign-ups just now.</p>'; return; }
    box.innerHTML = `<ul class="acct-list">${ls.map(l => {
      const st = l.settings || {};
      const when = 'Open for sign-ups';   // no count: how many have signed up isn't shown to players
      return `<li><div class="acct-lg"><b>${esc(l.name)}</b><span>${esc(when)}</span>
        <span>${esc([st.ends && plural(st.ends, 'end', 'ends'), st.bowls && `${st.bowls} bowls each`].filter(Boolean).join(' · '))}</span></div>
        <div data-slot="${l.id}">${l.series
          ? `<button class="btn primary" type="button" data-rules="${l.id}">Read the rules and sign up</button>`
          : `<button class="btn primary" type="button" data-join="${l.id}">Sign up</button>`}</div>
        <p class="acct-err" role="alert"></p></li>`;
    }).join('')}</ul>`;
    // A weeknight league takes sign-ups only from a player who has read and ticked its rules, which the
    // league site's sign-up sheet shows; the Worker refuses a sign-up from here without them.
    box.querySelectorAll('[data-rules]').forEach(b => b.onclick = () => openBoard('join'));
    box.querySelectorAll('[data-join]').forEach(b => b.onclick = async () => {
      const li = b.closest('li'); b.disabled = true; li.querySelector('.acct-err').textContent = '';
      const x = await call(`/api/leagues/${Number(b.dataset.join)}/join`, {});
      if (x.error) { b.disabled = false; li.querySelector('.acct-err').textContent = x.error; return; }
      li.querySelector('[data-slot]').innerHTML = `<p class="acct-done">You’re signed up. When sign-ups close, places go first to players in the fewest leagues already under way, at random among equals; if enough sign up, there will be more than one league.</p>`;
    });
  }

  // The noticeboard opens in a new tab, already signed in, through a one-minute ticket. w: a tab the
  // caller has already opened (Play online opens it on the click, before this file has loaded).
  async function openBoard(which, w) {
    w = w || window.open('', '_blank');   // opened now, while it still counts as the player's click
    if (w) w.opener = null;
    const to = String(which).startsWith('/') ? which    // a path on the league site: the Clubhouse, or a match (/play/?f=…)
      : which === 'join' ? '/join.html' : which === 'admin' ? '/admin.html' : which === 'challenges' ? '/challenges.html' : which === 'live' ? '/live.html' : `/?league=${Number(which)}`;
    const r = await call('/api/ticket', { to });
    if (r.error) { if (w) w.close(); if (r.loggedOut) { view = 'signin'; form(); } return; }
    if (w) w.location.href = r.url; else location.href = r.url;
  }


  /* ---------- the Clubhouse on the title page ----------
     For a signed-in member, like the Clubhouse's own Play page: what's waiting (challenges to accept,
     accepted games to start or resume, a league game whose opponent is on the green), then Find a game
     with how many are on the green, and the way into the Clubhouse for everything else (players to
     challenge, leagues, rankings, your bowls). One read, /api/clubhouse, every 20 seconds while the page
     is in view, which once a minute is also the "on the green" heartbeat, unless the member hides
     themself. Games are played on the league site, opened in a new tab already signed in (openBoard). */
  const Club = { d: null, timer: 0, beatAt: 0, busy: false, seen: null };
  const nm = p => `${H.esc(p.name)}${gwTag(p.elo || p)} <span class="elo">${eloTag(p).trim()}</span>`;
  function clubStart() {
    if (Club.timer) return;
    Club.timer = setInterval(clubPoll, 20000);
    document.addEventListener('visibilitychange', () => { if (!document.hidden) clubPoll(); });
    clubPoll();
  }
  async function clubPoll() {
    if (!token() || document.hidden || Club.busy) return;
    const here = Date.now() - Club.beatAt > 55e3;
    const r = await call('/api/clubhouse', { here });
    if (r.error) { if (r.loggedOut) { clearInterval(Club.timer); Club.timer = 0; } return; }
    if (here) Club.beatAt = Date.now();
    // a new challenge for me, or one of mine accepted: say so, wherever in the game they are
    const keys = r.incoming.map(c => 'c' + c.id).concat(r.toPlay.map(f => 'f' + f.id));
    if (Club.seen) {
      const c = r.incoming.find(x => !Club.seen.has('c' + x.id)), f = r.toPlay.find(x => !Club.seen.has('f' + x.id));
      if (c) H.toast(`${c.from.name} challenges you. Answer in the Clubhouse on the main menu.`);
      else if (f) H.toast(`Your game with ${f.opp.name} is ready: Start game is in the Clubhouse on the main menu.`);
    }
    Club.seen = new Set(keys);
    Club.d = r; clubPaint();
  }
  function clubPaint() {
    const d = Club.d, el = H.club(), esc = H.esc;
    if (!d) return;
    const chips = [[d.incoming.length, plural(d.incoming.length, 'challenge to answer', 'challenges to answer'), true],
      [d.toPlay.length, plural(d.toPlay.length, 'game to start', 'games to start'), true],
      [d.leagueOwed, plural(d.leagueOwed, 'league game to play', 'league games to play'), false]].filter(x => x[0]);
    el.chips.hidden = !chips.length;
    el.chips.innerHTML = chips.map(([, t, hot]) => `<span${hot ? ' class="hot"' : ''}>${esc(t)}</span>`).join('');
    const rows = [];
    for (const f of d.toPlay) rows.push(`<div class="ci-row"><span class="ci-who"><b>${nm(f.opp)}</b><span>Your ${f.rated ? 'rated' : 'casual'} game${f.inProgress ? ' · under way' : f.here ? ' · <span class="hot">on the green</span>' : ''}</span></span>
      <span class="ci-acts"><button class="ci-btn go" type="button" data-play="${f.id}">${f.inProgress ? 'Resume game' : 'Start game'}</button></span></div>`);
    for (const c of d.incoming) rows.push(`<div class="ci-row"><span class="ci-who"><b>${nm(c.from)}</b><span><span class="hot">challenges you</span> · ${c.rated ? 'rated' : 'casual'}${c.here ? ' · on the green' : ''}</span></span>
      <span class="ci-acts"><button class="ci-btn go" type="button" data-accept="${c.id}">Accept</button><button class="ci-btn" type="button" data-decline="${c.id}">Decline</button></span></div>`);
    // a league game I owe someone who's on the green now
    for (const p of d.green.filter(p => p.league)) rows.push(`<div class="ci-row"><span class="ci-who"><b>${nm(p)}</b><span><span class="hot">${p.league.inProgress ? 'Under way' : 'On the green'}</span> · your ${esc(p.league.name)} game</span></span>
      <span class="ci-acts"><button class="ci-btn go" type="button" data-play="${p.league.fixtureId}">${p.league.inProgress ? 'Resume game' : 'Start game'}</button></span></div>`);
    const on = d.green.filter(p => p.status === 'now').length;
    el.green.innerHTML = (rows.length ? `<p class="ci-k">Waiting for you</p>${rows.join('')}` : '')
      + `<div class="ci-find"><button class="ci-btn gold" type="button" data-live>Find a game</button>
        <span class="ci-count"><span class="ci-dot"></span>${on ? plural(on, 'member', 'members') + ' on the green' : 'Paired with the next member who looks'}</span></div>`
      + `<div class="ci-foot"><button class="ci-link" type="button" data-house>Players, leagues, rankings and your bowls →</button>
        <button class="ci-link quiet" type="button" data-shown="${d.me.shown ? 0 : 1}">${d.me.shown ? 'Hide me' : 'You’re hidden · Show me'}</button></div>`;
    const on_ = (sel, fn) => el.green.querySelectorAll(sel).forEach(b => b.onclick = () => fn(b));
    on_('[data-decline]', b => clubAct(call(`/api/challenges/${b.dataset.decline}/respond`, { action: 'decline', note: 'busy' }), () => H.toast('Declined.')));
    on_('[data-accept]', b => {   // the tab opens on the click, while it still counts as the player's
      const w = window.open('', '_blank');
      clubAct(call(`/api/challenges/${b.dataset.accept}/respond`, { action: 'accept' }), r => openBoard(`/play/?f=${Number(r.fixtureId)}`, w), () => { if (w) w.close(); });
    });
    on_('[data-play]', b => openBoard(`/play/?f=${Number(b.dataset.play)}`));
    on_('[data-live]', () => openBoard('live'));
    on_('[data-house]', () => openBoard('/'));
    on_('[data-shown]', b => clubAct(call('/api/presence', { status: b.dataset.shown === '1' ? 'now' : 'away' }), () => {}));
  }
  async function clubAct(p, then, failed) {
    Club.busy = true; const r = await p; Club.busy = false;
    if (r.error) { H.toast(r.error); if (failed) failed(); } else then(r);
    Club.beatAt = 0; clubPoll();
  }

  window.BiasMembers = {
    API,
    // Play online's Find a rated game: the members' quick match, on the league site, in the tab w
    rated(host, w) { H = H || host; if (token()) openBoard('live', w); else if (w) w.close(); },
    // the title's Clubhouse button: the Clubhouse page on the league site, in the tab w
    clubhouse(host, w) { H = H || host; if (token()) openBoard('/', w); else if (w) w.close(); },
    // want 'join' (the title's Open To New Members): a visitor lands on Join. want 'leagues' (the notice
    // above Play online): a member lands on Open leagues, Back taking them to the Members page. want { reset: token }
    // (an emailed link): the new-password form, signed in or not.
    open(host, want) {
      H = host; page = 'home';
      if (want && want.reset) { resetToken = want.reset; view = 'reset'; form(); }
      else if (token() && want === 'leagues') openLeagues();
      else if (token()) { H.body().innerHTML = '<p>Loading…</p>'; home(); }
      else { view = want === 'join' ? 'join' : 'signin'; form(); }
    },
    // the panel's Back: from a page inside Members (Open leagues, carrying over) to the Members page. False on the
    // Members page itself, where Back leaves for the main menu.
    back() {
      if (page === 'home') return false;
      home(); return true;
    },
    // just the menu button's name and count, after the page loads, for someone signed in
    async refresh(host) {
      H = host; if (!token()) return;
      const s = await call('/api/summary');
      if (s.user) { creator(s.creator); H.paint(s.user.username, waitingOf(s), s.openToJoin); syncNow(s.user.id); if (H.club) clubStart(); }
    }
  };
})();
