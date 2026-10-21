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
  const $ = id => document.getElementById(id);
  const token = () => H.store.get('league.token', null);
  const signedOut = () => { H.store.set('league.token', null); H.store.set('member.name', null); H.paint(null, 0); };

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
    H.paint(r.user.username, 0);
    home();
  }

  // ---------- signed out: sign in, join, forgot ----------
  const TABS = [['signin', 'Sign in'], ['join', 'Join'], ['forgot', 'Forgot password']];
  function form() {
    H.head(view === 'join' ? 'Join Bias' : view === 'forgot' ? 'Forgot your password?' : 'Sign in', view === 'join' ? 'Free. For leagues against other members' : 'Members play in leagues');
    const has = (...v) => v.includes(view), esc = H.esc;
    H.body().innerHTML = `
      <div class="acct-tabs" role="group">${TABS.map(([v, l]) => `<button type="button" data-v="${v}" aria-pressed="${v === view}">${l}</button>`).join('')}</div>
      <form id="acF" autocomplete="on" novalidate>
        ${has('signin', 'join') ? '<div class="field"><label for="acU">Username</label><input class="input" id="acU" name="username" autocomplete="username" maxlength="16" autocapitalize="off" spellcheck="false" required></div>' : ''}
        ${has('join', 'forgot') ? '<div class="field"><label for="acE">Email</label><input class="input" id="acE" type="email" name="email" autocomplete="email" maxlength="254" spellcheck="false" required></div>' : ''}
        ${has('signin', 'join') ? `<div class="field"><label for="acP">${view === 'join' ? 'Choose a password (8 or more)' : 'Password'}</label><input class="input" id="acP" type="password" name="password" autocomplete="${view === 'join' ? 'new-password' : 'current-password'}" required></div>` : ''}
        ${has('join') ? '<label class="acct-tick"><input id="acAge" type="checkbox"> I’m 13 or over</label>' : ''}
        <p class="acct-note">${{
          signin: '',
          join: `Your username is your name in league tables: 3 to 16 letters, numbers or _, and not your real name. Your email is only for getting back in if you forget your password: we keep a scrambled form of it, never the address, and never email you anything else. <a href="${esc(API)}/join.html#privacy" target="_blank" rel="noopener">Privacy, in plain words</a>`,
          forgot: 'Type the email you joined with. We’ll send your username and a link to choose a new password. It’s the only email Bias ever sends.'
        }[view]}</p>
        <p class="acct-err" id="acErr" role="alert"></p>
        <button class="btn primary" type="submit">${view === 'join' ? 'Join' : view === 'forgot' ? 'Email me a link' : 'Sign in'}</button>
      </form>`;
    H.body().querySelectorAll('[data-v]').forEach(b => b.onclick = () => { view = b.dataset.v; form(); });
    $('acF').onsubmit = async e => {
      e.preventDefault();
      const val = id => $(id) ? $(id).value.trim() : '', btn = e.target.querySelector('[type=submit]');
      btn.disabled = true;
      let r;
      if (view === 'forgot') r = await call('/api/forgot', { email: val('acE') });
      else if (view === 'join') r = await call('/api/signup', { username: val('acU'), email: val('acE'), password: $('acP').value, ageOk: $('acAge').checked, bearer: true });
      else r = await call('/api/login', { username: val('acU'), password: $('acP').value, bearer: true });
      btn.disabled = false;
      if (r.error) { $('acErr').textContent = r.error; return; }
      if (view === 'forgot') { H.body().innerHTML = `<p>${H.esc(r.message)}</p><button class="btn" type="button" id="acBackIn">Back to sign in</button>`; $('acBackIn').onclick = () => { view = 'signin'; form(); }; return; }
      signedIn(r);
    };
    const first = H.body().querySelector('input'); if (first) first.focus();
  }

  // ---------- signed in ----------
  const plural = (n, one, many) => `${n} ${n === 1 ? one : many}`;
  const day = t => new Date(t).toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' });
  const waitingOf = s => (s.leagues || []).reduce((n, l) => n + l.waiting + l.confirm, 0);

  function leagueItem(l) {
    const esc = H.esc;
    const when = l.status === 'open' ? `Starts ${day(l.startAt)}` : l.status === 'running' ? `Play all fixtures by ${day(l.deadlineAt)}` : 'Finished';
    const place = l.state === 'reserve' ? 'Reserve list' : l.state === 'signed_up' ? 'Signed up' : l.removed ? 'Removed at the deadline' : '';
    // gold for what needs your answer, plain for what's still to play
    const chips = [[l.waiting, plural(l.waiting, 'proposal for you', 'proposals for you'), true], [l.confirm, plural(l.confirm, 'result to confirm', 'results to confirm'), true], [l.owed, plural(l.owed, 'fixture to play', 'fixtures to play'), false]].filter(c => c[0]);
    return `<li><div class="acct-lg"><b>${esc(l.name)}</b><span>${esc([when, place].filter(Boolean).join(' · '))}</span></div>
      ${chips.length ? `<div class="acct-chips">${chips.map(([, text, hot]) => `<span${hot ? ' class="hot"' : ''}>${esc(text)}</span>`).join('')}</div>` : ''}
      <button class="btn" type="button" data-board="${l.id}">Noticeboard</button></li>`;
  }

  /* Your Elo rating: only you see it, unless you choose to be on the ratings table. It comes from
     confirmed league results, so it starts at 1200 and moves after each one. */
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
        <p>${r.games ? `${plural(r.games, 'league game', 'league games')}${week}${r.best > r.rating && r.best > 1200 ? ` · best ${r.best}` : ''}.${r.provisional ? ' Settles after 10 games.' : ''}` : 'Starts at 1200 and moves with each confirmed league result.'} Only you see it unless you tick below.</p>
        ${rec.played ? `<p class="acct-dev">On this device: ${plural(rec.played, 'match', 'matches')} · ${rec.won} won · ${rec.drawn} drawn · ${rec.lost} lost</p>` : ''}
        <div class="acct-r-row"><label class="acct-tick"><input id="acPub" type="checkbox"${r.public ? ' checked' : ''}> Show me on the ratings table</label>
          <button class="acct-link" type="button" id="acTable" aria-expanded="false" aria-controls="acTableBody">See the ratings table</button></div>
        <div id="acTableBody"></div>
        </div>
      </div>`;
  }
  async function showTable() {
    const box = $('acTableBody'); box.innerHTML = '<p class="acct-note">Loading…</p>';
    const t = await call('/api/ratings');
    if (t.error) { box.innerHTML = `<p class="acct-err">${H.esc(t.error)}</p>`; return; }
    box.innerHTML = t.rows.length ? `<ol class="acct-table">${t.rows.map(r => `<li${r.me ? ' class="me"' : ''}><span>${H.esc(r.name)}</span><b>${r.rating}${r.provisional ? '<i title="Provisional: under 10 games">?</i>' : ''}</b></li>`).join('')}</ol>`
      : '<p class="acct-note">Nobody has chosen to be on the table yet.</p>';
  }

  async function home() {
    page = 'home';
    const s = await call('/api/summary');
    if (page !== 'home') return;
    if (s.loggedOut || !s.user) { view = 'signin'; form(); if (s.loggedOut) $('acErr').textContent = 'You’ve been signed out. Please sign in again.'; return; }
    if (s.error) { H.body().innerHTML = `<p>${H.esc(s.error)}</p>`; return; }
    H.store.set('member.name', s.user.username);
    H.paint(s.user.username, waitingOf(s));
    H.head(s.user.username, 'Signed in'); if (H.top) H.top();
    const rec = H.record(), esc = H.esc;
    H.body().innerHTML = `
      ${s.canCreate ? '<button class="btn primary" type="button" data-board="admin">Organiser page</button>' : ''}
      ${ratingBlock(s.rating, rec)}
      <h3>Your leagues</h3>
      ${s.leagues.length ? `<ul class="acct-list">${s.leagues.map(leagueItem).join('')}</ul>` : ''}
      ${s.openToJoin ? `<button class="btn primary" type="button" id="acFind">Open leagues · ${s.openToJoin}</button>` : ''}
      <p class="acct-note">${s.leagues.length ? 'Arrange games on the noticeboard. Bias never emails you about them, so look in here for what’s waiting.'
        : s.openToJoin ? 'You’re not in a league yet.' : 'You’re not in a league, and none are taking sign-ups just now.'}</p>
      <h3>Your account</h3>
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
      <div class="acct-foot"><button class="btn ghost" type="button" id="acOut">Sign out</button><a href="${esc(API)}/join.html#privacy" target="_blank" rel="noopener">Privacy</a></div>`;
    H.body().querySelectorAll('[data-board]').forEach(b => b.onclick = () => openBoard(b.dataset.board));
    if ($('acFind')) $('acFind').onclick = openLeagues;
    if ($('acPub')) $('acPub').onchange = async e => { const r = await call('/api/account/ratings-public', { public: e.target.checked }); if (r.error) e.target.checked = !e.target.checked; else if ($('acTableBody').innerHTML) showTable(); };
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
     joined has its own Sign up (or reserve list, when it's full); signing up says so in its place.
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
      const full = l.taken >= l.maxPlayers, st = l.settings || {};
      return `<li><div class="acct-lg"><b>${esc(l.name)}</b><span>${esc(`${day(l.startAt)} to ${day(l.deadlineAt)} · ${l.taken} of ${l.maxPlayers} places taken`)}</span>
        <span>${esc([st.ends && plural(st.ends, 'end', 'ends'), st.bowls && `${st.bowls} bowls each`].filter(Boolean).join(' · '))}</span></div>
        <div data-slot="${l.id}"><button class="btn primary" type="button" data-join="${l.id}">${full ? 'Join the reserve list' : 'Sign up'}</button></div>
        <p class="acct-err" role="alert"></p></li>`;
    }).join('')}</ul>`;
    box.querySelectorAll('[data-join]').forEach(b => b.onclick = async () => {
      const li = b.closest('li'); b.disabled = true; li.querySelector('.acct-err').textContent = '';
      const x = await call(`/api/leagues/${Number(b.dataset.join)}/join`, {});
      if (x.error) { b.disabled = false; li.querySelector('.acct-err').textContent = x.error; return; }
      li.querySelector('[data-slot]').innerHTML = `<p class="acct-done">${x.state === 'reserve' ? 'You’re on the reserve list: you’ll get a place if one comes free.' : 'You’re signed up. The organiser confirms places before the league starts.'}</p>`;
    });
  }

  // The noticeboard opens in a new tab, already signed in, through a one-minute ticket.
  async function openBoard(which) {
    const w = window.open('', '_blank');   // opened now, while it still counts as the player's click
    if (w) w.opener = null;
    const r = await call('/api/ticket', { to: which === 'join' ? '/join.html' : which === 'admin' ? '/admin.html' : `/?league=${Number(which)}` });
    if (r.error) { if (w) w.close(); if (r.loggedOut) { view = 'signin'; form(); } return; }
    if (w) w.location.href = r.url; else location.href = r.url;
  }

  window.BiasMembers = {
    API,
    open(host, want) {   // want 'join' (the title's Open To New Members): a visitor lands on Join
      H = host; page = 'home';
      if (token()) { H.body().innerHTML = '<p>Loading…</p>'; home(); }
      else { view = want === 'join' ? 'join' : 'signin'; form(); }
    },
    // the panel's Back: from a page inside Members (Open leagues) to the Members page. False on the
    // Members page itself, where Back leaves for the main menu.
    back() {
      if (page !== 'open') return false;
      home(); return true;
    },
    // just the menu button's name and count, after the page loads, for someone signed in
    async refresh(host) {
      H = host; if (!token()) return;
      const s = await call('/api/summary');
      if (s.user) H.paint(s.user.username, waitingOf(s));
    }
  };
})();
