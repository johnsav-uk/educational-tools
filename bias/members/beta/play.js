/* Bias beta games, for members. A page in members/beta/<game>/ loads the game from the site's root (index.html, so it
   always has today's physics and controls), with board.js and the game's own script ahead of it. The script tag names
   the game (data-game) and its title (data-title). The Members panel links here; nothing else on the site does.
   A visitor who is not signed in is sent back to the title, since these games are for members. */
(function () {
  'use strict';
  const me = document.currentScript, here = me.src, root = new URL('../../', here).href;
  const msg = document.getElementById('msg');
  // the same test as the Members panel: a sign-in token kept in this browser's storage
  const signedIn = () => { try { return !!JSON.parse(localStorage.getItem('bias.league.token') || 'null'); } catch (e) { return false; } };
  if (!signedIn()) { msg.innerHTML = `Beta games are for members. <a href="${root}">Back to Bias</a>, then sign in from Members.`; return; }
  fetch(root + 'index.html', { cache: 'no-cache' })
    .then(function (r) { if (!r.ok) throw new Error(r.status); return r.text(); })
    .then(function (html) {
      const head = `<base href="${root}"><meta name="robots" content="noindex, nofollow">` +
        `<script src="${new URL('board.js', here).href}"></script><script src="${new URL(me.dataset.game, here).href}"></script>`;
      html = html.replace(/<head>/i, '<head>' + head)
        .replace(/<title>[\s\S]*?<\/title>/i, `<title>${me.dataset.title}</title>`)
        .replace(/<link rel="canonical"[^>]*>/i, '');
      document.open(); document.write(html); document.close();
    })
    .catch(function () { msg.textContent = 'The game could not load. Check your connection, then reload the page.'; });
})();
