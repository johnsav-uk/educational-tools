/* Organic Synthesis Pathways: chemistry engine.

   Pure functions over the tables in data.js, with no DOM, so tests.html (and
   node) can check every result. The page only ever draws what these functions
   return. Nothing is guessed at run time: every product is a catalogue molecule
   linked by an explicit edge, and rules supply the type, mechanism, conditions
   and explanation. A reaction that is real but not in the table is reported as
   "beyond" (never "none"), and the engine never makes a product that is not in
   the catalogue.

   Outcome = { status, mol, card, profile, level, rule?, products: [{ id, role }], equation?,
               type?, spec?, mech?, racemic?, lowYield?, reversible?, observe?, hazard?, mixtureOf?, notes: [], explain }
   status: ok · mixture · none · wrongConditions · beyond · notOffered · observation · unsupported */
(function (root, factory) {
  var data = (typeof module === 'object' && module.exports) ? require('./data.js') : root.SYNTH_DATA;
  var api = factory(data);
  if (typeof module === 'object' && module.exports) module.exports = api;
  root.SynthEngine = api;
})(typeof self !== 'undefined' ? self : this, function (D) {
  'use strict';

  var MOLS = D.MOLS, CARDS = D.CARDS, RULES = D.RULES, EDGES = D.EDGES, OBS = D.OBS, NO = D.NO, NOP = D.NOP;
  var MASS = { C: 12.0, H: 1.0, O: 16.0, N: 14.0, Cl: 35.5, Br: 79.9, I: 126.9, Na: 23.0, K: 39.1, S: 32.1, Li: 6.9, Al: 27.0, P: 31.0, Sn: 118.7 };

  /* ---------- Formulae ---------- */
  var SUB = '₀₁₂₃₄₅₆₇₈₉';
  // "CH3CH2OH" → "CH₃CH₂OH". Subscript only digits that follow a letter, ) or ].
  function fmt(cf) {
    return String(cf).replace(/([A-Za-z)\]])(\d+)/g, function (_, a, d) { return a + d.replace(/\d/g, function (x) { return SUB[+x]; }); });
  }
  // Atom counts of a condensed formula, with brackets and multipliers; [O] and [H] count as O and H.
  function atoms(f) {
    var s = String(f).replace(/\[([A-Z][a-z]?)\]/g, '$1'), i = 0;
    function num() { var m = /^\d+/.exec(s.slice(i)); if (!m) return 1; i += m[0].length; return +m[0]; }
    function group() {
      var out = {};
      while (i < s.length) {
        var ch = s[i];
        if (ch === '(') { i++; var inner = group(); var k = num(); for (var a in inner) out[a] = (out[a] || 0) + inner[a] * k; }
        else if (ch === ')') { i++; return out; }
        else {
          var m = /^[A-Z][a-z]?/.exec(s.slice(i));
          if (!m) { i++; continue; }
          i += m[0].length; out[m[0]] = (out[m[0]] || 0) + num();
        }
      }
      return out;
    }
    return group();
  }
  function massOf(f) { var a = atoms(f), t = 0; for (var k in a) t += a[k] * (MASS[k] || 0); return Math.round(t * 10) / 10; }

  /* ---------- Molecule accessors ---------- */
  function mol(id) { return MOLS[id] || null; }
  function formula(id) { return MOLS[id].formula; }
  function cf(id) { return MOLS[id].cf; }
  function mr(id) { return massOf(MOLS[id].formula); }
  function carbons(id) { return atoms(MOLS[id].formula).C || 0; }
  function name(id, level) { var m = MOLS[id]; if (!m) return String(id); return level === 'gcse' && m.gcseName ? m.gcseName : m.name; }
  function hasGroup(id, g) { return MOLS[id].groups.indexOf(g) >= 0; }
  function groupList(id) { return MOLS[id].groups.map(function (g) { return D.GROUP_NAMES[g]; }); }

  /* ---------- The shelf ---------- */
  function lvl(opt) { return opt && opt.level === 'gcse' ? 'gcse' : 'alevel'; }
  function cardOffered(card, level, enrich) { return card.lv === 'G' || (card.lv === 'A' && level === 'alevel') || (card.lv === 'E' && level === 'alevel' && !!enrich); }
  function profileOffered(p, level) { return p.lv === 'G' || (p.lv === 'A' && level === 'alevel') || (p.lv === 'g' && level === 'gcse'); }
  function cards(level, opt) {
    level = level === 'gcse' ? 'gcse' : 'alevel';
    var out = [];
    for (var id in CARDS) {
      var c = CARDS[id];
      if (!cardOffered(c, level, opt && opt.enrich)) continue;
      out.push({
        id: id, label: level === 'gcse' && c.gcseLabel ? c.gcseLabel : c.label, group: c.group, kind: c.kind || 'synth', partner: c.partner || null, hazard: !!c.hazard, enrich: c.lv === 'E',
        profiles: c.profiles.filter(function (p) { return profileOffered(p, level); }).map(function (p) { return { id: p.id, text: p.text }; })
      });
    }
    return out;
  }
  function cardLabel(cardId, level) { var c = CARDS[cardId]; return level === 'gcse' && c.gcseLabel ? c.gcseLabel : c.label; }
  function lc1(t) { return t.charAt(0).toLowerCase() + t.slice(1); }
  function profileText(cardId, profId) { var c = CARDS[cardId], p = c && c.profiles.filter(function (x) { return x.id === profId; })[0]; return p ? p.text : ''; }
  function startables(level, opt) {
    return D.MOL_ORDER.filter(function (id) { var m = MOLS[id]; return m.role === 'N' && (level === 'alevel' || m.level === 'gcse'); });
  }

  /* ---------- Equations ---------- */
  function splitSide(str) {
    return str.split(' + ').map(function (t) { var m = /^(\d*)(.+)$/.exec(t.trim()); return [m[1] ? +m[1] : 1, m[2]]; });
  }
  function halogenOf(f) { var m = /Cl|Br|I/.exec(f); return m ? m[0] : ''; }
  function expandEq(tpl, ctx) {
    var out = tpl.replace(/\{(\w+)\}/g, function (_, k) { return ctx[k] === undefined ? '' : ctx[k]; });
    var rev = out.indexOf(' <=> ') >= 0, parts = out.split(rev ? ' <=> ' : ' -> ');
    return { L: splitSide(parts[0]), R: splitSide(parts[1]), reversible: rev };
  }
  function balance(L, R) {
    function tally(list) { var t = {}; list.forEach(function (x) { var a = atoms(x[1]); for (var k in a) t[k] = (t[k] || 0) + a[k] * x[0]; }); return t; }
    var l = tally(L), r = tally(R), diff = [], keys = {}, k;
    for (k in l) keys[k] = 1; for (k in r) keys[k] = 1;
    for (k in keys) if ((l[k] || 0) !== (r[k] || 0)) diff.push(k);
    return { ok: !diff.length, diff: diff };
  }
  function eqString(e) {
    function side(l) { return l.map(function (x) { return (x[0] > 1 ? x[0] : '') + fmt(x[1]); }).join(' + '); }
    return side(e.L) + (e.reversible ? ' ⇌ ' : ' → ') + side(e.R);
  }
  var HAL2 = { cl2: 'Cl2', br2: 'Br2', i2: 'I2' }, HHAL = { cl2: 'HCl', br2: 'HBr', i2: 'HI' };
  function eqContext(rule, subId, prods, cardId, edge) {
    var c = CARDS[cardId], ctx = { s: cf(subId), X: halogenOf(cf(subId)), H2: HAL2[cardId] || '', HX: HHAL[cardId] || '', w: edge && edge.w || '' };
    if (prods[0]) ctx.p = cf(prods[0].id);
    if (prods[1]) ctx.q = cf(prods[1].id);
    if (c.partner) ctx.pt = cf(c.partner);
    return ctx;
  }
  function pickEq(rule, subId, cardId, edge) {
    var e = edge && edge.eq || rule.eq;
    if (!e) return null;
    if (typeof e === 'string') return e;
    if (e['card:' + cardId]) return e['card:' + cardId];
    var gs = MOLS[subId].groups;
    for (var i = 0; i < gs.length; i++) if (e[gs[i]]) return e[gs[i]];
    return e['default'] || null;
  }
  function pickExplain(rule, subId, level) {
    var e = level === 'gcse' && rule.explainG ? rule.explainG : rule.explain;
    if (typeof e === 'string') return e;
    var gs = MOLS[subId].groups;
    for (var i = 0; i < gs.length; i++) if (e[gs[i]]) return e[gs[i]];
    return e['default'] || '';
  }

  /* ---------- Indexes (rebuilt if the tables are changed, as the tests do) ---------- */
  var byUse, byCard, cache;
  function rebuild() {
    byUse = {}; byCard = {}; cache = {};
    RULES.forEach(function (r) {
      r.use.forEach(function (u) {
        (byUse[u[0] + '/' + u[1]] = byUse[u[0] + '/' + u[1]] || []).indexOf(r) < 0 && byUse[u[0] + '/' + u[1]].push(r);
        (byCard[u[0]] = byCard[u[0]] || []).indexOf(r) < 0 && byCard[u[0]].push(r);
      });
    });
  }
  rebuild();
  function firstGroupMatch(m, groups) { for (var i = 0; i < m.groups.length; i++) if (groups.indexOf(m.groups[i]) >= 0) return m.groups[i]; return null; }
  function lookupGroup(table, m) {
    if (!table) return null;
    for (var i = 0; i < m.groups.length; i++) if (table[m.groups[i]]) return table[m.groups[i]];
    return table['*'] || null;
  }

  function resolveMech(rule, subId, cardId, edge) {
    if (!rule.mech) return null;
    var mm = rule.mech, scene = mm.scene;
    if (scene && typeof scene === 'object') scene = scene[subId] || scene['default'] || null;
    var exact = !!scene && mm.exactWhen.indexOf(subId + '|' + cardId) >= 0;
    return {
      name: mm.name, outline: edge && edge.mechOutline === false ? false : mm.outline, scene: scene, exact: exact,
      example: scene ? D.SCENES[scene] : null, who: mm.who, inter: mm.inter, note: mm.note || null, steps: mm.steps || null
    };
  }

  function make(status, subId, cardId, profId, level, explain, extra) {
    var o = { status: status, mol: subId, card: cardId, profile: profId, level: level, products: [], notes: [], explain: explain };
    if (extra) for (var k in extra) o[k] = extra[k];
    return o;
  }

  function react(subId, cardId, profId, opt) {
    var level = lvl(opt), enrich = !!(opt && opt.enrich), key = [subId, cardId, profId, level, enrich].join('|');
    if (cache[key]) return cache[key];
    return (cache[key] = doReact(subId, cardId, profId, level, enrich));
  }

  function doReact(subId, cardId, profId, level, enrich) {
    var m = MOLS[subId], card = CARDS[cardId];
    if (!m || !card) return make('unsupported', subId, cardId, profId, level, 'This tool does not know that molecule or reagent.');
    var prof = card.profiles.filter(function (p) { return p.id === profId; })[0];
    if (!prof) return make('unsupported', subId, cardId, profId, level, 'This tool does not know those conditions.');
    var nm = name(subId, level), cl = cardLabel(cardId, level);

    // 1. Not on this level's shelf.
    if (!cardOffered(card, level, enrich)) {
      return make('notOffered', subId, cardId, profId, level, card.lv === 'E' ? cl + ' is real chemistry but it is not on either AQA specification. Switch on “Beyond AQA” to use it.' : cl + ' is A-level content. It is not in AQA GCSE Chemistry.');
    }
    if (!profileOffered(prof, level)) {
      return make('notOffered', subId, cardId, profId, level, level === 'gcse' ? 'Those conditions are A-level content.' : 'At A-level, choose distil or reflux for this oxidation: the GCSE “warm” conditions are not specific enough.');
    }

    // 2. Chemical tests: what you would see.
    if (card.kind === 'test') return observation(m, cardId, profId, level, nm, cl);

    // 3. A rule that matches this card, these conditions and a group of the molecule.
    var cp = cardId + '/' + profId, nop = NOP[cp];
    if (nop && nop[firstKey(nop, m)]) return statusOutcome(nop[firstKey(nop, m)], m, cardId, profId, level);
    var cands = (byUse[cp] || []).filter(function (r) { return firstGroupMatch(m, r.groups); });
    if (cands.length) {
      var rule = cands.filter(function (r) { return EDGES[subId] && EDGES[subId][r.id]; })[0] || cands[0], edge = EDGES[subId] && EDGES[subId][rule.id];
      if (rule.level === 'enrich' && !enrich) {
        return make('beyond', subId, cardId, profId, level, 'This is real chemistry, but it is not on the AQA specification, so the tool does not offer it. Switch on “Beyond AQA” to see it.', { rule: rule.id, type: rule.type });
      }
      if (rule.level === 'alevel' && level === 'gcse') {
        return make('beyond', subId, cardId, profId, level, 'This reaction is A-level content. It is not in AQA GCSE Chemistry.', { rule: rule.id });
      }
      if (!edge) {
        return m.role === 'N'
          ? make('unsupported', subId, cardId, profId, level, 'This tool does not have a product for that reaction.', { rule: rule.id })
          : make('beyond', subId, cardId, profId, level, 'This tool does not take ' + nm + ' any further.');
      }
      if (edge.a && level === 'gcse') {
        return make('beyond', subId, cardId, profId, level, 'This reaction is A-level content. At GCSE you only need the reactions of the alcohols, acids and alkenes on the specification.', { rule: rule.id });
      }
      if (edge.status === 'beyond' || edge.status === 'none') {
        return make(edge.status, subId, cardId, profId, level, edge.why, { rule: rule.id });
      }
      if (edge.status === 'mixture') {
        return make('mixture', subId, cardId, profId, level, edge.why, { rule: rule.id, type: rule.type, spec: rule.spec, mixtureOf: edge.mixture || [], mech: level === 'alevel' ? resolveMech(rule, subId, cardId, edge) : null });
      }
      return okOutcome(rule, edge, m, cardId, profId, level, nm, cl);
    }

    // 4. The right reagent but the wrong conditions.
    var near = (byCard[cardId] || []).filter(function (r) {
      return firstGroupMatch(m, r.groups) && !(r.level === 'alevel' && level === 'gcse') && !(r.level === 'enrich' && !enrich) && (m.role === 'N' || (EDGES[subId] && EDGES[subId][r.id]));
    })[0];
    if (near) {
      var good = near.use.filter(function (u) { return u[0] === cardId; }).map(function (u) { return profileText(cardId, u[1]); });
      var why = near.wrong && near.wrong[cp];
      var txt = why || (cl + ' does react with ' + D.GROUP_NAMES[firstGroupMatch(m, near.groups)] + ', but not under these conditions. The conditions needed are: ' + good.map(lc1).join(' or ') + '.');
      return make('wrongConditions', subId, cardId, profId, level, txt, { rule: near.id, type: near.type, spec: near.spec });
    }

    // 5. Described observations (water), then the table of known non-reactions.
    if (OBS[cardId]) return observation(m, cardId, profId, level, nm, cl);
    var no = lookupGroup(NO[cardId], m);
    if (no) return statusOutcome(no, m, cardId, profId, level);

    // 6. Nothing here reacts.
    if (m.role !== 'N') return make('beyond', subId, cardId, profId, level, 'This tool does not take ' + nm + ' any further.');
    var tgt = D.CARD_TARGETS[cardId] || 'other functional groups';
    return make('none', subId, cardId, profId, level, 'No reaction. ' + cl + ' reacts with ' + tgt + '; ' + nm + ' is ' + groupList(subId).join(' and ') + ', so there is nothing for it to attack under these conditions.');
  }
  function firstKey(table, m) { for (var i = 0; i < m.groups.length; i++) if (table[m.groups[i]]) return m.groups[i]; return '*'; }
  function statusOutcome(e, m, cardId, profId, level) {
    return make(e.status, m.id, cardId, profId, level, e.why);
  }
  function observation(m, cardId, profId, level, nm, cl) {
    var e = lookupGroup(OBS[cardId], m);
    if (!e) return make('none', m.id, cardId, profId, level, 'Nothing to observe.');
    if (e.status === 'beyond') return make('beyond', m.id, cardId, profId, level, cl + ' does react with ' + D.GROUP_NAMES[m.groups[0]] + ', but that is not an AQA test for it, and the tool does not model it.');
    return make(e.change ? 'observation' : 'none', m.id, cardId, profId, level, e.t, { observe: e.t });
  }

  function okOutcome(rule, edge, m, cardId, profId, level, nm, cl) {
    var prods = (edge.byCard && edge.byCard[cardId]) || edge.products;
    prods = prods.map(function (p) { return { id: p.id, role: level === 'gcse' && p.role === 'minor' ? 'equal' : p.role }; });
    var eqT = pickEq(rule, m.id, cardId, edge), eq = null, text = null;
    if (level === 'gcse' && rule.eqG) {
      text = rule.eqG.replace('{sn}', nm).replace('{pn}', name(prods[0].id, level));
    } else if (eqT) {
      eq = expandEq(eqT, eqContext(rule, m.id, prods, cardId, edge));
      if (level === 'gcse') eq.reversible = false;   // a reversible arrow is not GCSE notation here
      text = eqString(eq);
    }
    var notes = [];
    if (rule.note) notes.push(rule.note);
    if (rule.noteFor && rule.noteFor[cardId + '/' + profId]) notes.push(rule.noteFor[cardId + '/' + profId]);   // a note only for these conditions
    var en = level === 'gcse' && edge.noteG ? edge.noteG : edge.note;
    if (en) notes.push(en);
    if (edge.racemic) notes.push(RACEMIC_TEXT);
    if (edge.low) notes.push('Low yield: the halogenoalkane formed can be substituted again, giving di-, tri- and tetra-substituted products. This is a poor way to make one pure compound, but AQA still expects you to know the reaction.');
    if (level === 'gcse' && prods.some(function (p) { return MOLS[p.id].level === 'alevel'; }) && !edge.noteG) notes.push('This product is mostly met at A-level.');
    if (rule.hazard && level === 'alevel') notes.push(rule.hazard);
    var obs = rule.observe;
    if (obs && typeof obs === 'object') obs = obs[cardId];
    var hs = rule.level === 'gcse' ? 'gcse' : 'alevel';
    var o = make('ok', m.id, cardId, profId, level, pickExplain(rule, m.id, level), {
      rule: rule.id, products: prods, equation: text, eq: eq, type: rule.type, spec: rule.spec, racemic: !!edge.racemic, lowYield: !!edge.low,
      reversible: level === 'alevel' && !!(edge.reversible || rule.reversible), observe: obs || null, hazard: !!rule.hazard, minLevel: hs, dC: rule.dC || 0, notes: notes,
      mech: level === 'alevel' ? resolveMech(rule, m.id, cardId, edge) : null
    });
    if (level === 'gcse' && rule.type && /Oxidation|Cracking|Addition|Esterification|Fermentation/.test(rule.type)) o.type = rule.type.replace(/ \(.*\)$/, '');
    return o;
  }
  var RACEMIC_TEXT = 'Racemic product: the C=O group is planar, so the nucleophile attacks from either face with equal probability. The two enantiomers form in equal amounts, so the product is optically inactive.';

  /* ---------- Search: forwards, backwards, whole routes ---------- */
  function combos(level, enrich) {
    var out = [];
    cards(level, { enrich: enrich }).forEach(function (c) { c.profiles.forEach(function (p) { out.push({ card: c.id, profile: p.id }); }); });
    return out;
  }
  function nextSteps(subId, opt) {
    var level = lvl(opt), enrich = !!(opt && opt.enrich), out = [];
    combos(level, enrich).forEach(function (cp) {
      var o = react(subId, cp.card, cp.profile, opt);
      if (o.status === 'ok') out.push(o);
    });
    return out;
  }
  function good(p) { return p.role === 'major' || p.role === 'equal'; }

  // Every simple route from start to target of at most maxSteps steps, following only major / equal products of ok steps.
  function routes(startId, targetId, opt) {
    opt = opt || {}; var max = opt.maxSteps || 4, found = [];
    (function walk(cur, path, seen) {
      nextSteps(cur, opt).forEach(function (o) {
        o.products.filter(good).forEach(function (p) {
          if (seen[p.id]) return;
          var step = { from: cur, card: o.card, profile: o.profile, to: p.id, role: p.role, rule: o.rule, lowYield: o.lowYield };
          if (p.id === targetId) { found.push(path.concat([step])); return; }
          if (path.length + 1 < max && MOLS[p.id].role === 'N') {
            var s2 = Object.assign({}, seen); s2[p.id] = 1;
            walk(p.id, path.concat([step]), s2);
          }
        });
      });
    })(startId, [], (function () { var s = {}; s[startId] = 1; return s; })());
    found.sort(function (a, b) { return a.length - b.length; });
    return found;
  }
  // Which molecule + card + conditions make the target as a major or equal product?
  function makers(targetId, opt) {
    var level = lvl(opt), enrich = !!(opt && opt.enrich), out = [], cs = combos(level, enrich);
    startables(level).forEach(function (id) {
      if (id === targetId) return;
      cs.forEach(function (cp) {
        var o = react(id, cp.card, cp.profile, opt);
        if (o.status === 'ok' && o.products.some(function (p) { return p.id === targetId && good(p); })) out.push({ from: id, card: cp.card, profile: cp.profile, rule: o.rule });
      });
    });
    return out;
  }
  // Check a student's route. steps: [{ card, profile, pick? }]. A pick is the product carried on; without one, any major / equal product may be.
  function checkRoute(startId, steps, targetId, opt) {
    var best = null;
    (function walk(cur, i, outs, poor) {
      if (i === steps.length) {
        var r = { solved: cur === targetId && !poor, reached: cur === targetId, poor: !!poor, final: cur, steps: outs, firstProblem: poor ? { index: i - 1, text: 'The route passes through a minor product, so it is not a good route.' } : (cur === targetId ? null : { index: i - 1, text: 'The route does not end at the target.' }) };
        if (!best || (r.solved && !best.solved) || (!best.solved && r.reached && !best.reached)) best = r;
        return;
      }
      var s = steps[i], o = react(cur, s.card, s.profile, opt);
      if (o.status !== 'ok') { if (!best) best = { solved: false, reached: false, poor: false, final: cur, steps: outs.concat([o]), firstProblem: { index: i, text: o.explain, status: o.status } }; return; }
      var cand = s.pick ? o.products.filter(function (p) { return p.id === s.pick; }) : o.products.filter(good);
      if (!cand.length) { if (!best) best = { solved: false, reached: false, poor: false, final: cur, steps: outs.concat([o]), firstProblem: { index: i, text: 'That is not a product of this step.' } }; return; }
      cand.forEach(function (p) { walk(p.id, i + 1, outs.concat([o]), poor || p.role === 'minor'); });
    })(startId, 0, [], false);
    return best || { solved: false, steps: [], firstProblem: { index: 0, text: 'No steps.' } };
  }

  /* ---------- Hints ---------- */
  function routeText(step, level) {
    return cardLabel(step.card, level) + ' (' + lc1(profileText(step.card, step.profile)) + ')';
  }
  function hint(curId, targetId, opt, tier) {
    opt = opt || {}; var level = lvl(opt);
    if (curId === targetId) return { tier: tier, text: 'You are already at the target.' };
    var lim = opt.maxSteps || 4, rs = routes(curId, targetId, Object.assign({ maxSteps: 4 }, opt));
    var tgt = MOLS[targetId];
    if (tier <= 1) {
      var types = {};
      makers(targetId, opt).forEach(function (mk) { var r = RULES.filter(function (x) { return x.id === mk.rule; })[0]; if (r) types[level === 'gcse' ? r.type.replace(/ \(.*\)$/, '') : r.type] = 1; });
      var ks = Object.keys(types);
      return { tier: 1, text: 'The target is ' + tgt.groups.map(function (g) { return D.GROUP_NAMES[g]; }).filter(function (x) { return x !== 'a benzene ring'; }).join(' and ') + '.' + (ks.length ? ' The kinds of reaction that make it here: ' + ks.join(', ').toLowerCase() + '.' : '') };
    }
    if (!rs.length) return { tier: tier, text: 'There is no route from here within ' + (lim === 4 ? 'four steps' : lim === 1 ? 'the one step you have left' : 'the ' + lim + ' steps you have left') + '. Try undoing a step, or work backwards from the target.' };
    var best = rs[0];
    if (tier === 2) {
      var last = best[best.length - 1];
      return { tier: 2, text: best.length === 1 ? 'You are one step away: the target can be made directly from ' + name(curId, level) + '.' : 'A molecule one step before the target, reachable from where you are, is ' + name(last.from, level) + '.', step: last };
    }
    if (tier === 3) return { tier: 3, text: 'Your next reagent: ' + cardLabel(best[0].card, level) + '.', step: best[0] };
    return { tier: 4, text: 'Use ' + routeText(best[0], level) + ' to make ' + name(best[0].to, level) + '.', step: best[0] };
  }

  return {
    data: D, mol: mol, formula: formula, cf: cf, mr: mr, massOf: massOf, carbons: carbons, name: name, hasGroup: hasGroup, atoms: atoms, fmt: fmt,
    cards: cards, lc1: lc1, cardLabel: cardLabel, profileText: profileText, startables: startables, react: react, routes: routes, makers: makers,
    checkRoute: checkRoute, hint: hint, balance: balance, expandEq: expandEq, eqString: eqString, rebuild: rebuild, combos: combos
  };
});
