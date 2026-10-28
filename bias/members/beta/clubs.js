/* Bias club betas, for members: the game played at one club, on that club's own green. A page in
   members/beta/<club>/ loads this with data-club naming the club in CLUBS below. Like play.js it loads the game from
   the site's root (index.html, so it always has today's physics and controls), but it also patches that copy as it
   loads, as the greens beta does: the club is fixed, every game is played at the club's green speed, and the
   controls for choosing the club or the speed are hidden. A club with greens: true is played on an uneven green,
   with turf-p7v3nd/patch.js and greens.js applied too. The game file itself is never changed.

   Testing only: online play, the daily puzzle and the other beta games are hidden here. If the game has changed
   so a patch no longer fits, the page says so instead of playing half-patched (clubs.test.mjs checks the patches
   against today's index.html: node --test members/beta/clubs.test.mjs).

   The same file runs twice: on the club's page it is the loader (data-club), and in the game's head it sets
   window.BiasClub and tidies the menus (data-run). */
(function (root) {
  'use strict';
  const CLUBS = {
    pitfold: { venue: 'pitfold', T: 12, greens: true, title: 'Bias · Pitfold Park (beta)',
      head: 'Pitfold Park (beta)', blurb: 'A tired park green in Lancashire: heavy (12 s), uneven and patchy. Play the computer, Practice and Custom match are all played here. Choose the green in Help &amp; settings.' },
    fernley: { venue: 'fernley', T: 17, greens: false, title: 'Bias · Fernley Indoor (beta)',
      head: 'Fernley Indoor (beta)', blurb: 'An indoor hall in Leicestershire: a flat blue carpet at 17 s, faster than any green outdoors, and no weather. Play the computer, Practice and Custom match are all played here.' }
  };

  // anchor: 'after' (default) adds the text after it, 'replace' puts it in place of the anchor
  const PATCHES = [
    ['the club', `param: new URLSearchParams(location.search).get('venue'),`, `param: window.BiasClub.venue,`, 'replace'],
    ['the other clubs, loaded at once', `paintVenue(); setTimeout(() => Venue.load().catch(() => {}), 800);`, `paintVenue(); Venue.load().catch(() => {});`, 'replace'],
    // the club's own green speed (the self-tests' own games keep theirs)
    ['practice', `    const pr = this.practice;\n`, `    if (this === window.BiasGame) pr.T = window.BiasClub.T;\n`],
    ['a match', `  startMatch(cfg) {\n`, `    if (this === window.BiasGame) cfg = { ...cfg, T: window.BiasClub.T, secret: false };\n`]
  ];
  function patchGame(html) {
    for (const [name, anchor, text, how = 'after'] of PATCHES) {
      const i = html.indexOf(anchor);
      if (i < 0 || html.indexOf(anchor, i + 1) >= 0) throw new Error(`The game has changed: ${name} ${i < 0 ? 'is missing' : 'appears twice'}.`);
      const j = i + anchor.length;
      html = how === 'replace' ? html.slice(0, i) + text + html.slice(j) : html.slice(0, j) + text + html.slice(j);
    }
    return html;
  }
  if (typeof module === 'object' && module.exports) { module.exports = { CLUBS, PATCHES, patchGame }; return; }

  const me = document.currentScript;

  // ---- in the game: the club, and menus without what this beta doesn't offer ----
  if (me.dataset.run) {
    const club = root.BiasClub = CLUBS[me.dataset.run];
    document.addEventListener('DOMContentLoaded', () => {
      const css = document.createElement('style');
      css.textContent = '#mOnline,#mSkip,#mBeta,#mLeagueNote,.venue-row,#bowlsSpeedField{display:none!important}' +
        '.club-beta{margin:10px 0 0;padding:10px 12px;border:1px solid rgba(201,168,98,.75);border-radius:10px;background:rgba(201,168,98,.12);font-size:13.5px;line-height:1.45;max-width:272px;box-sizing:border-box}' +
        '.club-beta b{display:block;font-size:15px;margin-bottom:2px}';
      document.head.appendChild(css);
      const gm = document.getElementById('greenMode'); if (gm && gm.closest('.field')) gm.closest('.field').style.display = 'none';
      // runs after greens.js (loaded first), so its beta note is replaced by the club's
      const old = document.querySelector('.greens-beta'); if (old) old.remove();
      const sub = document.querySelector('#titleScrim .sub');
      if (sub) { sub.textContent = club.head.replace(' (beta)', '') + ': a members’ beta'; sub.insertAdjacentHTML('afterend', `<div class="club-beta"><b>${club.head}</b>${club.blurb}</div>`); }
    });
    return;
  }

  // ---- on the club's page: load the game, patch it, and hand over ----
  const club = CLUBS[me.dataset.club], here = me.src, site = new URL('../../', here).href, msg = document.getElementById('msg');
  const signedIn = () => { try { return !!JSON.parse(localStorage.getItem('bias.league.token') || 'null'); } catch (e) { return false; } };
  if (!signedIn()) { msg.innerHTML = `Beta games are for members. <a href="${site}">Back to Bias</a>, then sign in from Members.`; return; }
  const turf = site + 'turf-p7v3nd/';
  const script = src => new Promise((ok, no) => { const s = document.createElement('script'); s.src = src; s.onload = ok; s.onerror = no; document.head.appendChild(s); });
  const v = new URL(here).search;   // the page's cache-buster, passed on
  Promise.all([fetch(site + 'index.html', { cache: 'no-cache' }).then(r => { if (!r.ok) throw new Error(r.status); return r.text(); }),
    club.greens ? script(turf + 'patch.js' + v) : null])
    .then(([html]) => {
      try { if (club.greens) html = root.BiasGreensPatch.patchGame(html); html = patchGame(html); }
      catch (e) { msg.textContent = 'This beta needs updating for today’s game. ' + e.message; return; }
      const head = `<style>html,body{background:#16201b}</style><base href="${site}"><meta name="robots" content="noindex, nofollow">` +
        (club.greens ? `<script src="${turf}greens.js${v}"><\/script>` : '') + `<script src="${here}" data-run="${me.dataset.club}"><\/script>`;   // greens.js first, so its title note is the one replaced
      html = html.replace(/<head>/i, '<head>' + head)
        .replace(/<title>[\s\S]*?<\/title>/i, `<title>${club.title}</title>`)
        .replace(/<link rel="canonical"[^>]*>/i, '');
      document.open(); document.write(html); document.close();
    })
    .catch(() => { msg.textContent = 'The game could not load. Check your connection, then reload the page.'; });
})(typeof window === 'object' ? window : globalThis);
