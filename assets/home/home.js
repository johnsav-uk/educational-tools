(function () {
  'use strict';

  // The science homepage runs on the defaults below. A sister site (languages/)
  // sets window.SST_HOME first with its own catalogue, subjects and hues, and
  // root: the path from its page back to the repo root, which tile links and
  // screenshots are relative to.
  var CFG = window.SST_HOME || {};
  var TOOLS = CFG.tools || window.SST_TOOLS || [];
  var ROOT = CFG.root || '';
  var SCIENCES = ["Chemistry", "Physics", "Biology"];
  // Topic shelves (science only for now). With none, the catalogue is the flat grid alone.
  var TOPICS = (CFG.topics || (CFG.tools ? [] : window.SST_TOPICS) || []).slice();

  // Pill hue per subject label (oklch H). Pills render as oklch(0.3 0.06 H) on oklch(0.86 0.1 H).
  var HUE = CFG.hue || { Chemistry: 185, Physics: 295, Biology: 145, Mixed: 75 };

  var TYPES = [["all", "All"], ["explore", "Explore"], ["play", "Play"]];
  var SUBJECTS = CFG.subjects || [["all", "All subjects"], ["Chemistry", "Chemistry"], ["Physics", "Physics"],
                  ["Biology", "Biology"], ["Mixed", "Mixed"]];
  var LEVELS = [["all", "All levels"], ["KS3", "KS3"], ["GCSE", "GCSE"], ["A-Level", "A-Level"], ["Multi", "Multi"]];

  function scienceOf(t) {
    var sciences = SCIENCES.filter(function (s) { return t.tags.indexOf(s) !== -1; });
    return sciences.length === 1 ? sciences[0] : "Mixed";
  }

  TOOLS.forEach(function (t) {
    t.type = t.kind === "Revision Game" ? "play" : "explore";
    t.subject = (CFG.subjectOf || scienceOf)(t);
    // Tolerate a cached tools.js from before levels became a list.
    t.levels = t.levels || (t.level ? [t.level] : []);
    t.levelLabel = t.levels.length > 1 ? "Multi" : t.levels[0];
    t.hay = (t.title + " " + t.blurb + " " + t.tags.join(" ") + " " + t.levels.join(" ") + " " + t.levelLabel + " " +
             t.subject + " " + (t.keywords || "")).toLowerCase();
  });

  if (TOPICS.length) {
    var known = {};
    TOPICS.forEach(function (tp) { known[tp.id] = true; });
    if (TOOLS.some(function (t) { return !known[t.topic]; })) {
      TOPICS.push({ id: "more", label: "More", title: "More tools" });
      TOOLS.forEach(function (t) { if (!known[t.topic]) t.topic = "more"; });
    }
  }

  var state = { query: "", type: "all", topic: "all", subject: "all", level: "all", open: {} };

  var $ = function (id) { return document.getElementById(id); };
  var grid = $('grid');
  var featuredGrid = $('featured-grid');
  var typeHost = $('type-filter');
  var subjectHost = $('subject-filter');
  var levelHost = $('level-filter');
  var topicHost = $('topic-filter');
  var shelvesHost = $('shelves');
  var moreFilters = $('more-filters');
  var filterToggle = $('filter-toggle');
  var filterBadge = $('filter-badge');
  var countEl = $('count');
  var emptyEl = $('empty');
  var searchEl = $('search');
  var resetEl = $('reset');

  // Subject chips match on tags, so a multi-subject science game still turns up under
  // Physics. "Mixed" is the one exception: it picks out the multi-subject tools themselves.
  function subjectMatches(t, subject) {
    if (subject === "all") return true;
    if (subject === "Mixed") return t.subject === "Mixed";
    return t.tags.indexOf(subject) !== -1;
  }

  // Levels work the same way: a KS3-and-GCSE game turns up under both KS3 and GCSE,
  // and "Multi" picks out the tools that span more than one key stage.
  function levelMatches(t, level) {
    if (level === "all") return true;
    if (level === "Multi") return t.levels.length > 1;
    return t.levels.indexOf(level) !== -1;
  }

  // Search logic from the live site: every term must hit title, blurb, tags, level
  // or the hidden keywords, with a light plural stem as a fallback.
  function queryMatches(t, q) {
    if (!q) return true;
    return q.split(/\s+/).every(function (term) {
      if (t.hay.indexOf(term) !== -1) return true;
      var stem = term.replace(/(ies|es|s)$/, "");
      return stem.length > 2 && t.hay.indexOf(stem) !== -1;
    });
  }

  function matches() {
    var q = state.query.trim().toLowerCase();
    return TOOLS.filter(function (t) {
      return (state.type === "all" || t.type === state.type) &&
             (state.topic === "all" || t.topic === state.topic) &&
             subjectMatches(t, state.subject) && levelMatches(t, state.level) && queryMatches(t, q);
    });
  }

  function el(tag, className, text) {
    var n = document.createElement(tag);
    if (className) n.className = className;
    if (text != null) n.textContent = text;
    return n;
  }

  function buildTile(t) {
    var a = el('a', 'tile');
    a.href = ROOT + t.url;

    var media = el('div', 'tile-media');
    if (t.image) {
      var img = el('img');
      // Tiles load the small WebP from thumbs/ (make-thumbs.py writes them); a tool
      // without one falls back to its full screenshot, then to the striped placeholder.
      var full = ROOT + 'assets/img/tools/' + t.image;
      img.src = ROOT + 'assets/img/tools/thumbs/' + t.image.replace(/\.\w+$/, '.webp');
      img.alt = '';
      img.width = 800;
      img.height = 500;
      img.loading = 'lazy';
      img.decoding = 'async';
      img.addEventListener('error', function () {
        if (img.src.indexOf('/thumbs/') !== -1) img.src = full;
        else img.remove();
      });
      media.appendChild(img);
    }

    var body = el('div', 'tile-body');
    body.appendChild(el('h3', 'tile-title', t.title));
    body.appendChild(el('p', 'tile-blurb', t.blurb));

    var foot = el('div', 'tile-foot');
    var pill = el('span', 'pill', t.subject);
    pill.style.setProperty('--h', HUE[t.subject]);
    var pills = el('span', 'tile-pills');
    pills.appendChild(pill);
    var lvl = el('span', 'pill pill--level', t.levelLabel);
    if (t.levels.length > 1) {
      lvl.title = t.levels.join(' and ');
      lvl.setAttribute('aria-label', 'Multi-level: ' + t.levels.join(' and '));
    }
    pills.appendChild(lvl);
    foot.appendChild(pills);
    foot.appendChild(el('span', 'tile-go tile-go--' + t.type,
      (t.type === 'play' ? 'Play' : 'Explore') + ' →'));
    body.appendChild(foot);

    a.appendChild(media);
    a.appendChild(body);
    return a;
  }

  function buildChoices(host, options, key, className) {
    options.forEach(function (o) {
      var b = el('button', className, o[1]);
      b.type = 'button';
      b.dataset.value = o[0];
      b.addEventListener('click', function () { state[key] = o[0]; render(); });
      host.appendChild(b);
    });
  }

  function syncPressed(host, value) {
    Array.prototype.forEach.call(host.children, function (b) {
      b.setAttribute('aria-pressed', String(b.dataset.value === value));
    });
  }

  // Shelves are the resting view: one row per topic, opened in place with "Show all".
  // Searching, picking a topic, subject or level swaps them for the flat grid of matches.
  function shelvesMode() {
    return TOPICS.length > 0 && state.topic === 'all' && !state.query.trim() &&
           state.subject === 'all' && state.level === 'all';
  }

  function buildShelf(id, title, tools) {
    var sec = el('section', 'shelf');
    sec.dataset.shelf = id;
    var head = el('div', 'shelf-head');
    var h = el('h3', 'shelf-title');
    var name = el('span', null, title);
    h.appendChild(name);
    h.appendChild(el('span', 'shelf-count', String(tools.length)));
    head.appendChild(h);
    var more = el('button', 'shelf-more');
    more.type = 'button';
    more.hidden = true;
    var open = !!state.open[id];
    more.textContent = open ? 'Show fewer' : 'Show all ' + tools.length + ' →';
    more.setAttribute('aria-expanded', String(open));
    more.addEventListener('click', function () {
      state.open[id] = !state.open[id];
      render();
      if (!state.open[id]) sec.scrollIntoView({ block: 'nearest' });
    });
    head.appendChild(more);
    sec.appendChild(head);
    var tiles = el('div', 'tiles');
    tools.forEach(function (t) { tiles.appendChild(buildTile(t)); });
    sec.appendChild(tiles);
    if (open) sec.classList.add('is-open');
    shelvesHost.appendChild(sec);
  }

  // A closed shelf shows as many tiles as fit on one row of the grid at this width.
  function clampShelves() {
    if (!shelvesHost) return;
    Array.prototype.forEach.call(shelvesHost.querySelectorAll('.shelf'), function (sec) {
      var tiles = sec.querySelector('.tiles');
      var cols = getComputedStyle(tiles).gridTemplateColumns.split(' ').filter(Boolean).length || 1;
      var open = sec.classList.contains('is-open');
      Array.prototype.forEach.call(tiles.children, function (tile, i) { tile.hidden = !open && i >= cols; });
      sec.querySelector('.shelf-more').hidden = tiles.children.length <= cols;
    });
  }

  function renderShelves() {
    shelvesHost.textContent = '';
    var ofType = TOOLS.filter(function (t) { return state.type === 'all' || t.type === state.type; });
    var featured = ofType.filter(function (t) { return t.featured; });
    if (featured.length) buildShelf('featured', 'Featured', featured);
    TOPICS.forEach(function (tp) {
      var list = ofType.filter(function (t) { return t.topic === tp.id; });
      if (list.length) buildShelf(tp.id, tp.title, list);
    });
    clampShelves();
    return ofType.length;
  }

  function render() {
    // A topic with nothing of the chosen type (Revision games under Explore) falls back to all.
    if (state.topic !== 'all' && !TOOLS.some(function (t) {
      return t.topic === state.topic && (state.type === 'all' || t.type === state.type);
    })) state.topic = 'all';
    var shelves = shelvesMode();
    var list = shelves ? [] : matches();

    grid.textContent = '';
    list.forEach(function (t) { grid.appendChild(buildTile(t)); });
    grid.hidden = shelves;
    if (shelvesHost) {
      shelvesHost.hidden = !shelves;
      if (shelves) {
        var n = renderShelves();
        countEl.textContent = n + ' tools, grouped by topic';
      } else {
        shelvesHost.textContent = '';
      }
    }

    if (!shelves) countEl.textContent = list.length + ' of ' + TOOLS.length + ' shown';
    emptyEl.hidden = shelves || list.length !== 0;
    var extra = (state.subject !== 'all' ? 1 : 0) + (state.level !== 'all' ? 1 : 0);
    resetEl.hidden = !(state.query.trim() || state.type !== 'all' || state.topic !== 'all' || extra);

    if (typeHost) syncPressed(typeHost, state.type);
    if (topicHost) {
      syncPressed(topicHost, state.topic);
      // Only offer topics that have tools of the chosen type.
      Array.prototype.forEach.call(topicHost.children, function (b) {
        b.hidden = b.dataset.value !== 'all' && !TOOLS.some(function (t) {
          return t.topic === b.dataset.value && (state.type === 'all' || t.type === state.type);
        });
      });
    }
    syncPressed(subjectHost, state.subject);
    syncPressed(levelHost, state.level);
    if (filterBadge) {
      filterBadge.hidden = !extra;
      filterBadge.textContent = extra;
    }
  }

  function reset() {
    state.query = '';
    state.type = 'all';
    state.topic = 'all';
    state.subject = 'all';
    state.level = 'all';
    searchEl.value = '';
    render();
  }

  if (filterToggle) filterToggle.addEventListener('click', function () {
    var show = moreFilters.hidden;
    moreFilters.hidden = !show;
    filterToggle.setAttribute('aria-expanded', String(show));
  });

  if (shelvesHost && window.ResizeObserver) {
    var lastW = 0;
    new ResizeObserver(function (entries) {
      var w = Math.round(entries[0].contentRect.width);
      if (w !== lastW) { lastW = w; clampShelves(); }
    }).observe(shelvesHost);
  }

  searchEl.addEventListener('input', function (e) { state.query = e.target.value; render(); });
  resetEl.addEventListener('click', function () { reset(); searchEl.focus(); });
  $('empty-reset').addEventListener('click', function () { reset(); searchEl.focus(); });

  // Path cards, hero buttons and nav links drop into the catalogue with a type pre-selected.
  Array.prototype.forEach.call(document.querySelectorAll('[data-type-filter]'), function (link) {
    link.addEventListener('click', function () {
      state.type = link.dataset.typeFilter;
      state.topic = 'all';
      state.subject = 'all';
      state.level = 'all';
      state.query = '';
      searchEl.value = '';
      render();
    });
  });

  // Language cards and the like drop in with one subject chip pressed.
  Array.prototype.forEach.call(document.querySelectorAll('[data-subject-filter]'), function (link) {
    link.addEventListener('click', function () {
      state.type = 'all';
      state.topic = 'all';
      state.subject = link.dataset.subjectFilter;
      state.level = 'all';
      state.query = '';
      searchEl.value = '';
      render();
    });
  });

  // Header search icon: jump to the catalogue and put the cursor in the search box.
  $('search-jump').addEventListener('click', function (e) {
    e.preventDefault();
    $('all').scrollIntoView({ behavior: 'smooth', block: 'start' });
    searchEl.focus({ preventScroll: true });
  });

  // Counts are written from the data so a new tool never needs a copy edit.
  Array.prototype.forEach.call(document.querySelectorAll('[data-tool-count]'), function (n) {
    n.textContent = TOOLS.length + ' tools';
  });

  if (featuredGrid) TOOLS.filter(function (t) { return t.featured; }).forEach(function (t) {
    featuredGrid.appendChild(buildTile(t));
  });

  // Tool pages link back with ?type=explore|play#all, so arrive pre-filtered.
  var wanted = /[?&]type=(explore|play)\b/.exec(location.search);
  if (wanted) state.type = wanted[1];
  var wantedTopic = /[?&]topic=([\w-]+)/.exec(location.search);
  if (wantedTopic && TOPICS.some(function (tp) { return tp.id === wantedTopic[1]; })) state.topic = wantedTopic[1];

  if (typeHost) buildChoices(typeHost, TYPES, 'type', 'seg');
  if (topicHost && TOPICS.length) {
    buildChoices(topicHost, [["all", "All topics"]].concat(TOPICS.map(function (tp) { return [tp.id, tp.label]; })),
      'topic', 'chip');
  } else if (topicHost) {
    topicHost.hidden = true;
  }
  // Without shelves there is nothing to tidy away, so subject and level stay out in the open.
  if (filterToggle && !TOPICS.length) { filterToggle.hidden = true; moreFilters.hidden = false; }
  buildChoices(subjectHost, SUBJECTS, 'subject', 'chip');
  buildChoices(levelHost, LEVELS, 'level', 'chip');
  render();

  // Feedback form: opens in a dialog, posts to Formspree without leaving the page.
  var dialog = $('feedback-dialog');
  var form = dialog.querySelector('form');
  var status = dialog.querySelector('.feedback-status');
  var send = form.querySelector('[type=submit]');
  Array.prototype.forEach.call(document.querySelectorAll('[data-feedback]'), function (b) {
    b.addEventListener('click', function (e) {
      e.preventDefault();
      status.textContent = '';
      form.hidden = false;
      dialog.showModal();
    });
  });
  Array.prototype.forEach.call(dialog.querySelectorAll('[data-close]'), function (b) {
    b.addEventListener('click', function () { dialog.close(); });
  });
  // Clicking the backdrop closes it too.
  dialog.addEventListener('click', function (e) { if (e.target === dialog) dialog.close(); });

  form.addEventListener('submit', function (e) {
    e.preventDefault();
    form.elements.page.value = location.href;
    send.disabled = true;
    status.textContent = 'Sending…';
    fetch(form.action, { method: 'POST', body: new FormData(form), headers: { Accept: 'application/json' } })
      .then(function (r) {
        if (!r.ok) throw new Error(r.status);
        form.reset();
        status.textContent = 'Thank you, your message has been sent.';
        setTimeout(function () { dialog.close(); }, 2200);
      })
      .catch(function () {
        status.textContent = 'Sorry, that didn’t send. Please try again in a moment.';
      })
      .then(function () { send.disabled = false; });
  });
})();
