/* Moving a browser's saved things from www.johnsav.co.uk/bias to www.biasbowls.com.
   Browser storage belongs to the address, so without this a player would arrive with no record,
   streak or settings. One file does both halves:

   - On the old site each page is a stub that loads this with data-send: it packs the bias.* keys
     into the URL fragment, which browsers never send to a server, and goes to the new address.
   - On the new site the game loads this first, ahead of anything that reads storage: it copies
     the keys in, wipes the fragment, and puts back whatever the old address had in its own.

   The sign-in token never travels (members sign in again). member.browser does: sync.js adds up
   records once per browser, so a new id would count this browser's record twice. An incoming
   key never replaces one already here, and only a page arriving from the old site can import,
   so a crafted link can't plant anything. Tests: site-worker/handover.test.cjs. */
(function (root) {
  'use strict';
  const NEW = 'https://www.biasbowls.com', OLD = 'https://www.johnsav.co.uk', OLD_BASE = '/bias';
  const MARK = 'bias.moved', LIMIT = 36000;   // bytes before encoding: about 48 KB of URL, which every browser takes
  const NEVER = new Set(['bias.league.token', 'bias.member.name', 'bias.member.creator', 'bias.member.flag', MARK]);
  const KEY = /^bias\.[A-Za-z0-9_.-]+$/;
  const portable = k => KEY.test(k) && !NEVER.has(k);
  // kept first if a save is too big for a URL: what a player would miss, then the membership link
  const rank = k => /^bias\.(skip|stats|bots\.won|clubs\.)/.test(k) ? 0 : /^bias\.(settings|profiles|member\.)/.test(k) ? 1 : 2;
  const bytes = s => new TextEncoder().encode(s).length;

  function encode(obj) {
    const b = new TextEncoder().encode(JSON.stringify(obj));
    let s = ''; for (let i = 0; i < b.length; i++) s += String.fromCharCode(b[i]);
    return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  }
  function decode(data) {
    const s = atob(data.replace(/-/g, '+').replace(/_/g, '/'));
    const b = new Uint8Array(s.length);
    for (let i = 0; i < s.length; i++) b[i] = s.charCodeAt(i);
    const o = JSON.parse(new TextDecoder().decode(b));
    if (!o || typeof o !== 'object' || Array.isArray(o)) throw new Error('not an object');
    return o;
  }

  // The keys worth carrying, as fragment text; '' if there are none.
  function pack(storage) {
    const keys = [];
    for (let i = 0; i < storage.length; i++) { const k = storage.key(i); if (portable(k)) keys.push(k); }
    keys.sort((a, b) => rank(a) - rank(b) || a.localeCompare(b));
    const out = {}; let used = 2, any = false;
    for (const k of keys) {
      const v = storage.getItem(k), size = bytes(JSON.stringify(k) + JSON.stringify(v)) + 2;
      if (v == null || used + size > LIMIT) continue;
      out[k] = v; used += size; any = true;
    }
    return any ? encode(out) : '';
  }

  // Where a page on the old site should send its visitor. A page other than the game goes via the game, which alone imports.
  function destination(loc, data, target) {
    const base = target || NEW;
    const path = (loc.pathname.indexOf(OLD_BASE + '/') === 0 ? loc.pathname.slice(OLD_BASE.length) : loc.pathname === OLD_BASE ? '/' : loc.pathname);
    if (!data) return base + path + loc.search + loc.hash;
    if (path === '/' || path === '/index.html') return base + '/' + loc.search + '#bias-move=' + data + (loc.hash ? '&was=' + encodeURIComponent(loc.hash.slice(1)) : '');
    return base + '/#bias-move=' + data + '&to=' + encodeURIComponent(path + loc.search + loc.hash);
  }

  function parse(hash) {
    const m = /^#bias-move=([A-Za-z0-9_-]+)(?:&was=([^&]*))?(?:&to=([^&]*))?$/.exec(hash || '');
    if (!m) return null;
    try { return { data: m[1], was: m[2] ? decodeURIComponent(m[2]) : '', to: m[3] ? decodeURIComponent(m[3]) : '' }; } catch (e) { return null; }
  }

  // Copies the keys in, once per browser, never over one already here. Returns how many it wrote.
  function absorb(storage, data) {
    if (storage.getItem(MARK) != null) return 0;
    const o = decode(data); let n = 0;
    for (const k of Object.keys(o)) {
      const v = o[k];
      if (!portable(k) || typeof v !== 'string' || storage.getItem(k) != null) continue;
      try { JSON.parse(v); } catch (e) { continue; }
      storage.setItem(k, v); n++;
    }
    storage.setItem(MARK, '1');
    return n;
  }

  const isLocal = host => /^(localhost|127\.0\.0\.1)$/.test(host);
  function fromOldSite(referrer, hostname) {
    if (isLocal(hostname)) return /^http:\/\/(localhost|127\.0\.0\.1)[:/]/.test(referrer || '');
    return (referrer || '').indexOf(OLD + '/') === 0;
  }
  // only a path on this site, so a crafted link can't send anyone elsewhere
  const safePath = to => /^\/(?![/\\])[^\\]*$/.test(to || '');

  // Runs on the new site, before the game. Returns where to go next, if the visitor came for another page.
  function receive(win) {
    const got = parse(win.location.hash);
    if (!got) return '';
    if (fromOldSite(win.document.referrer, win.location.hostname)) {
      try { absorb(win.localStorage, got.data); } catch (e) { /* storage blocked, or a bad fragment: start afresh */ }
    }
    win.history.replaceState(null, '', win.location.pathname + win.location.search + (got.was ? '#' + got.was : ''));
    return safePath(got.to) ? got.to : '';
  }

  function send(win, target) {
    let data = '';
    try { data = pack(win.localStorage); } catch (e) { /* storage blocked: just go */ }
    win.location.replace(destination(win.location, data, target));
  }

  const api = { pack, destination, parse, absorb, fromOldSite, safePath, receive, send, encode, LIMIT };
  if (typeof module === 'object' && module.exports) { module.exports = api; return; }

  const script = root.document.currentScript, sending = !!script && script.hasAttribute('data-send');
  const here = root.location, local = isLocal(here.hostname);
  if (sending) {
    send(root, local ? script.getAttribute('data-new') || undefined : undefined);
  } else if (here.origin === NEW || local) {
    const next = receive(root);
    if (next) here.replace(next);
  }
})(typeof window === 'undefined' ? globalThis : window);
