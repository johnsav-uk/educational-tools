(function () {
  'use strict';

  var TOOLS = window.SST_TOOLS || [];
  var SCIENCES = ["Chemistry", "Physics", "Biology"];

  // Pill hue per subject label (oklch H). Pills render as oklch(0.3 0.06 H) on oklch(0.86 0.1 H).
  var HUE = { Chemistry: 185, Physics: 295, Biology: 145, Mixed: 75, Languages: 25 };

  var TYPES = [["all", "All"], ["explore", "Explore"], ["play", "Play"]];
  var SUBJECTS = [["all", "All subjects"], ["Chemistry", "Chemistry"], ["Physics", "Physics"],
                  ["Biology", "Biology"], ["Mixed", "Mixed"], ["Languages", "Languages"]];
  var LEVELS = [["all", "All levels"], ["KS3", "KS3"], ["GCSE", "GCSE"], ["A-Level", "A-Level"], ["Multi", "Multi"]];

  TOOLS.forEach(function (t) {
    t.type = t.kind === "Revision Game" ? "play" : "explore";
    var sciences = SCIENCES.filter(function (s) { return t.tags.indexOf(s) !== -1; });
    t.subject = sciences.length > 1 ? "Mixed"
      : sciences.length === 1 ? sciences[0]
      : t.tags.indexOf("Languages") !== -1 ? "Languages" : "Mixed";
    // Tolerate a cached tools.js from before levels became a list.
    t.levels = t.levels || (t.level ? [t.level] : []);
    t.levelLabel = t.levels.length > 1 ? "Multi" : t.levels[0];
    t.hay = (t.title + " " + t.blurb + " " + t.tags.join(" ") + " " + t.levels.join(" ") + " " + t.levelLabel + " " +
             t.subject + " " + (t.keywords || "")).toLowerCase();
  });

  var state = { query: "", type: "all", subject: "all", level: "all" };

  var $ = function (id) { return document.getElementById(id); };
  var grid = $('grid');
  var featuredGrid = $('featured-grid');
  var typeHost = $('type-filter');
  var subjectHost = $('subject-filter');
  var levelHost = $('level-filter');
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
    a.href = t.url;

    var media = el('div', 'tile-media');
    if (t.image) {
      var img = el('img');
      img.src = 'assets/img/tools/' + t.image;
      img.alt = '';
      img.loading = 'lazy';
      img.decoding = 'async';
      img.addEventListener('error', function () { img.remove(); });
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

  function render() {
    var list = matches();

    grid.textContent = '';
    list.forEach(function (t) { grid.appendChild(buildTile(t)); });

    countEl.textContent = list.length + ' of ' + TOOLS.length + ' shown';
    emptyEl.hidden = list.length !== 0;
    resetEl.hidden = !(state.query.trim() || state.type !== 'all' || state.subject !== 'all' || state.level !== 'all');

    syncPressed(typeHost, state.type);
    syncPressed(subjectHost, state.subject);
    syncPressed(levelHost, state.level);
  }

  function reset() {
    state.query = '';
    state.type = 'all';
    state.subject = 'all';
    state.level = 'all';
    searchEl.value = '';
    render();
  }

  searchEl.addEventListener('input', function (e) { state.query = e.target.value; render(); });
  resetEl.addEventListener('click', function () { reset(); searchEl.focus(); });
  $('empty-reset').addEventListener('click', function () { reset(); searchEl.focus(); });

  // Path cards, hero buttons and nav links drop into the catalogue with a type pre-selected.
  Array.prototype.forEach.call(document.querySelectorAll('[data-type-filter]'), function (link) {
    link.addEventListener('click', function () {
      state.type = link.dataset.typeFilter;
      state.subject = 'all';
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

  TOOLS.filter(function (t) { return t.featured; }).forEach(function (t) {
    featuredGrid.appendChild(buildTile(t));
  });

  // Tool pages link back with ?type=explore|play#all, so arrive pre-filtered.
  var wanted = /[?&]type=(explore|play)\b/.exec(location.search);
  if (wanted) state.type = wanted[1];

  buildChoices(typeHost, TYPES, 'type', 'seg');
  buildChoices(subjectHost, SUBJECTS, 'subject', 'chip');
  buildChoices(levelHost, LEVELS, 'level', 'chip');
  render();
})();
