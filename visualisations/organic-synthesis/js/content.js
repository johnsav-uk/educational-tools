/* Organic Synthesis Pathways: worksheets and mark schemes.

   Exam-style questions for AQA GCSE Chemistry 8462 (about 25 marks) and AQA A-level
   Chemistry 7405 (about 40 marks), each with a printable A4 student worksheet and a
   separate teacher mark scheme. The answers are taken from the engine where the
   engine decides them (products, reagents, conditions, routes), and `check()` runs
   them back through the engine so a question and the tool cannot disagree.
   Structures are drawn by Structure.svg into the print document.

     SYNTH_CONTENT.render(level, kind, E, S)   level: 'gcse' | 'alevel' · kind: 'ws' | 'ms' → HTML
     SYNTH_CONTENT.check(E, D)                  → [[name, ok, detail], ...] for tests.js              */
(function (root, factory) {
  var api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  root.SYNTH_CONTENT = api;
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  var C = (typeof module === 'object' && module.exports) ? require('./challenges.js') : (typeof window !== 'undefined' ? window.SYNTH_CHALLENGES : null);

  /* Question = { n, title, stem, parts: [{ k, t, m, lines, figs, ans: { pts: [..], dna: [..], figs: [molId] } }] } */
  function questions(E) {
    var gcse = [
      { title: 'Making alcohols', stem: 'Ethanol can be made in two different ways.', parts: [
        { k: 'a', t: 'Ethanol is made from ethene by reacting it with steam. State the catalyst and two conditions used.', m: 3, lines: 3,
          ans: { pts: ['phosphoric acid (catalyst) (1)', 'high temperature (typically about 300 °C) (1)', 'high pressure (typically 60–70 atm) (1)'], dna: ['nickel as the catalyst', 'room temperature'], note: 'Credit sensible values for the temperature and pressure, or “high temperature” and “high pressure” in general terms.' } },
        { k: 'b', t: 'Ethanol is also made by fermentation of glucose. Give <b>three</b> conditions needed for fermentation.', m: 3, lines: 3,
          ans: { pts: ['yeast (1)', 'warm temperature, about 30–35 °C (1)', 'no air / anaerobic conditions (1)'], dna: ['“oxygen” or “air” present', 'a high temperature such as 70 °C or above (the enzymes are denatured)'] } }
      ] },
      { title: 'Reactions of alkenes', stem: 'Draw the displayed formula of the organic product of each reaction. Show every atom and every bond.', parts: [
        { k: 'a', t: 'Ethene reacts with bromine.', m: 2, lines: 0, box: true, ans: { pts: ['carbon–carbon single bond with each carbon bonded to one Br and two H (1)', 'all atoms and bonds shown (1)'], figs: ['dibromoethane'], dna: ['a skeletal formula', 'a structure with the C=C double bond still present'] } },
        { k: 'b', t: 'Propene reacts with hydrogen.', m: 2, lines: 0, box: true, ans: { pts: ['three carbons joined in a chain by single bonds (1)', 'all eight hydrogen atoms shown with all bonds (1)'], figs: ['propane'], dna: ['a skeletal formula', 'a structure with a double bond'] } }
      ] },
      { title: 'Testing for alkenes', stem: 'A student has two colourless gases, propane and propene.', parts: [
        { k: '', t: 'Describe how bromine water can be used to tell the gases apart. Give the result for each gas.', m: 3, lines: 4,
          ans: { pts: ['shake / bubble each gas with bromine water (1)', 'propene: the orange bromine water turns colourless (1)', 'propane: it stays orange (1)'], dna: ['“clear” in place of “colourless”', 'bromine water “goes clear” alone, without the starting colour'] } }
      ] },
      { title: 'A route from crude oil', stem: 'Ethyl ethanoate can be made from decane, C₁₀H₂₂, in four steps.', route: ['decane', 'ethene', 'ethanol', 'ethanoic-acid', 'ethyl-ethanoate'], parts: [
        { k: 'a', t: 'Give a reagent or conditions for each of the four steps.', m: 4, lines: 4,
          ans: { pts: ['step 1: cracking: heat with a catalyst (such as a zeolite), or steam at a very high temperature (1)', 'step 2: steam with a phosphoric acid catalyst at high temperature and pressure (1)', 'step 3: an oxidising agent, such as acidified potassium dichromate, warm (1)', 'step 4: ethanol with a concentrated sulfuric acid catalyst, warm (1)'], dna: ['step 3: “oxygen” on its own', 'step 4: ethanoic acid only, with no catalyst'] } },
        { k: 'b', t: 'Name the three molecules formed in steps 1, 2 and 3.', m: 2, lines: 2,
          ans: { pts: ['ethene (1)', 'ethanol and ethanoic acid, in the right order (1)'], dna: [] } }
      ] },
      { title: 'Carboxylic acids', stem: 'Ethanoic acid is added to sodium carbonate solution.', parts: [
        { k: '', t: 'Describe what you would see, name the gas formed and give a test for the gas.', m: 3, lines: 4,
          ans: { pts: ['bubbles / fizzing / effervescence (1)', 'carbon dioxide (1)', 'it turns limewater cloudy / milky (1)'], dna: ['hydrogen', '“oxygen”'] } }
      ] },
      { title: 'Esters', stem: 'Ethanoic acid reacts with ethanol to make ethyl ethanoate.', parts: [
        { k: 'a', t: 'Name the catalyst for this reaction.', m: 1, lines: 1, ans: { pts: ['concentrated sulfuric acid (1)'], dna: ['dilute sulfuric acid'] } },
        { k: 'b', t: 'Describe the smell of an ester.', m: 1, lines: 1, ans: { pts: ['sweet / fruity (1)'], dna: [] } },
        { k: 'c', t: 'Name the homologous series that ethyl ethanoate belongs to.', m: 1, lines: 1, ans: { pts: ['esters (1)'], dna: [] } }
      ] }
    ];

    var alevel = [
      { title: 'Benzene to an amide', stem: 'N-phenylethanamide, C₆H₅NHCOCH₃, can be made from benzene in three steps, through nitrobenzene and phenylamine.', route: ['benzene', 'nitrobenzene', 'phenylamine', 'n-phenylethanamide'], parts: [
        { k: 'a', t: 'Give the reagents and conditions for step 1, benzene to nitrobenzene. Name the electrophile formed.', m: 3, lines: 3,
          ans: { pts: ['concentrated nitric acid and concentrated sulfuric acid (1)', 'temperature kept below 55 °C (1)', 'NO₂⁺ / nitronium ion (1)'], dna: ['above 55 °C', '“HNO₃” on its own', 'nitric acid with dilute sulfuric acid'], note: 'Above 55 °C a second nitro group substitutes: AQA keeps to monosubstitution.' } },
        { k: 'b', t: 'Give the reagents and conditions for step 2, nitrobenzene to phenylamine.', m: 2, lines: 2,
          ans: { pts: ['tin and concentrated hydrochloric acid (1)', 'heat under reflux (then add sodium hydroxide solution to release the amine) (1)'], dna: [] } },
        { k: 'c', t: 'Give the reagent and conditions for step 3, phenylamine to N-phenylethanamide.', m: 2, lines: 2,
          ans: { pts: ['ethanoyl chloride (or ethanoic anhydride) (1)', 'room temperature (or warm for the anhydride) (1)'], dna: ['ethanoic acid'] } },
        { k: 'd', t: 'Write an equation for step 3 using structural formulae.', m: 1, lines: 2, ans: { pts: ['C₆H₅NH₂ + CH₃COCl → C₆H₅NHCOCH₃ + HCl (1)'], dna: [] } }
      ] },
      { title: 'Substitution or elimination?', stem: '2-bromopropane reacts with hydroxide ions in two different ways, depending on the solvent.', parts: [
        { k: 'a', t: 'Name the main organic product when 2-bromopropane is heated under reflux with <b>aqueous</b> potassium hydroxide, and when it is heated under reflux with potassium hydroxide dissolved in <b>ethanol</b>.', m: 2, lines: 3,
          ans: { pts: ['aqueous: propan-2-ol (1)', 'ethanolic: propene (1)'], dna: ['“KOH” without saying aqueous or ethanolic'] } },
        { k: 'b', t: 'Name the mechanism in each case.', m: 2, lines: 2, ans: { pts: ['aqueous: nucleophilic substitution (1)', 'ethanolic: elimination (1)'], dna: ['mechanism labels from other specifications in place of the full names'] } },
        { k: 'c', t: 'State the role of the hydroxide ion in each case.', m: 2, lines: 2, ans: { pts: ['aqueous: nucleophile (1)', 'ethanolic: base (1)'], dna: ['“catalyst”'] } },
        { k: 'd', t: 'Write an equation for the reaction in ethanol.', m: 1, lines: 2, ans: { pts: ['CH₃CHBrCH₃ + KOH → CH₃CH=CH₂ + KBr + H₂O (1)'], dna: [] } }
      ] },
      { title: 'Controlling oxidation', stem: 'Propan-1-ol can be oxidised using acidified potassium dichromate(VI) to give propanal or propanoic acid.', parts: [
        { k: 'a', t: 'State the conditions that give propanal, and the conditions that give propanoic acid.', m: 2, lines: 3,
          ans: { pts: ['propanal: distil off the product as it forms (1)', 'propanoic acid: excess oxidising agent and heat under reflux (1)'], dna: ['“reflux” for the aldehyde', 'H₂SO₄ alone as the oxidising agent: the oxidising agent is acidified potassium dichromate(VI)'] } },
        { k: 'b', t: 'Explain why propanal is distilled off as it forms.', m: 1, lines: 2, ans: { pts: ['it has a lower boiling point than the alcohol (no hydrogen bonding between aldehyde molecules), so it leaves before it can be oxidised further (1)'], dna: [] } },
        { k: 'c', t: 'Name the piece of apparatus fitted to the flask for the second set of conditions, and state the colour change seen in the flask.', m: 2, lines: 2, ans: { pts: ['(Liebig / reflux) condenser (1)', 'orange to green (1)'], dna: ['“blue”', 'purple to green'] } }
      ] },
      { title: 'Major and minor products', stem: 'Propene reacts with hydrogen bromide to give mainly 2-bromopropane.', parts: [
        { k: '', t: 'Explain why 2-bromopropane is the major product. Use the idea of carbocation stability.', m: 4, lines: 5,
          ans: { pts: ['the double bond attacks the Hδ⁺ of HBr: electrophilic addition forms a carbocation (1)', 'two carbocations are possible: primary and secondary (1)', 'the secondary carbocation is more stable (two alkyl groups with a positive inductive effect) (1)', 'so more of it forms and gives 2-bromopropane as the major product (1)'], dna: ['“Markownikoff’s rule” as the only explanation'] } }
      ] },
      { title: 'Optical activity', stem: 'Ethanal reacts with potassium cyanide, followed by dilute acid, to form 2-hydroxypropanenitrile.', parts: [
        { k: 'a', t: 'Name the reagents and the mechanism.', m: 1, lines: 1, ans: { pts: ['KCN then dilute acid (H⁺): nucleophilic addition (1)'], dna: ['HCN on its own as the reagent'], note: 'AQA’s reagent is potassium cyanide followed by dilute acid. HCN is the overall species added, but the specification gives KCN then acid.' } },
        { k: 'b', t: 'The product is optically inactive even though it contains a chiral carbon. Explain why.', m: 4, lines: 5,
          ans: { pts: ['the C=O group is planar (1)', 'the cyanide ion can attack from either side with equal probability (1)', 'so two enantiomers form in equal amounts: a racemic mixture (1)', 'each rotates plane-polarised light by the same amount in opposite directions, so there is no net rotation (1)'], dna: ['“no chiral carbon”'] } }
      ] },
      { title: 'Planning a synthesis', stem: 'Propan-2-ol is needed, and the only starting material is propan-1-ol.', route: ['propan-1-ol', 'propene', 'propan-2-ol'], parts: [
        { k: '', t: 'Outline a two-step synthesis of propan-2-ol from propan-1-ol. Give reagents, conditions and the intermediate.', m: 4, lines: 5,
          ans: { pts: ['step 1: heat with concentrated sulfuric (or phosphoric) acid: elimination / dehydration (1)', 'intermediate: propene (1)', 'step 2: steam with a phosphoric acid catalyst (or cold concentrated sulfuric acid, then water) (1)', 'propan-2-ol is the major product because the more stable secondary carbocation forms (1)'], dna: ['step 1: dilute acid', 'step 1: “heat with water”'] } }
      ] },
      { title: 'Lengthening a carbon chain', stem: 'Propylamine, CH₃CH₂CH₂NH₂, has one more carbon atom than ethanol. Use potassium cyanide to make propylamine from ethanol in four steps.', route: ['ethanol', 'ethene', 'bromoethane', 'propanenitrile', 'propylamine'], parts: [
        { k: 'a', t: 'Give the reagent and conditions for each of the four steps.', m: 4, lines: 5,
          ans: { pts: ['ethanol to ethene: heat with concentrated sulfuric or phosphoric acid (1)', 'ethene to bromoethane: hydrogen bromide at room temperature (1)', 'bromoethane to propanenitrile: KCN in aqueous ethanol, heat under reflux (1)', 'propanenitrile to propylamine: LiAlH₄ in dry ether then dilute acid (or hydrogen with a nickel catalyst) (1)'], dna: ['NaBH₄ for the nitrile: it is not a strong enough reducing agent', 'KCN with dilute acid (that is the hydroxynitrile reaction)'] } },
        { k: 'b', t: 'Name the three intermediate molecules.', m: 2, lines: 2, ans: { pts: ['ethene and bromoethane (1)', 'propanenitrile (1)'], dna: [] } }
      ] },
      { title: 'Safety', stem: 'Potassium cyanide is used in this synthesis.', parts: [
        { k: '', t: 'State one hazard of potassium cyanide.', m: 1, lines: 1, ans: { pts: ['toxic / poisonous (releases toxic HCN gas with acid) (1)'], dna: [] } }
      ] }
    ];
    [gcse, alevel].forEach(function (list) { list.forEach(function (q, i) { q.n = i + 1; q.marks = q.parts.reduce(function (s, p) { return s + p.m; }, 0); }); });
    return { gcse: gcse, alevel: alevel };
  }

  /* ---------- Rendering ---------- */
  function figs(ids, S) { return '<div class="fig-row">' + ids.map(function (id) { return '<figure class="fig">' + S.svg(id, 'displayed', { size: 34 }) + '<figcaption>' + id + '</figcaption></figure>'; }).join('') + '</div>'; }
  function routeBoxes(q, E, S, level) {
    // A route diagram: the molecules drawn, with empty boxes for the student to write the step conditions on each arrow.
    var out = '<div class="route-fig">';
    q.route.forEach(function (id, i) {
      out += '<div class="rf-mol">' + (i === 0 || i === q.route.length - 1 ? S.svg(id, level === 'gcse' ? 'displayed' : 'skeletal', { size: 30 }) + '<div class="rf-name">' + E.name(id, level) + '</div>' : '<div class="rf-q">?</div>') + '</div>';
      if (i < q.route.length - 1) out += '<div class="rf-arrow"><span>step ' + (i + 1) + '</span>→</div>';
    });
    return out + '</div>';
  }
  function lines(n) { var s = '<div class="ws-lines" aria-hidden="true">'; for (var i = 0; i < n; i++) s += '<i></i>'; return s + '</div>'; }
  function render(level, kind, E, S) {
    var qs = questions(E)[level], total = qs.reduce(function (s, q) { return s + q.marks; }, 0);
    var lv = level === 'gcse' ? 'GCSE' : 'A-level', spec = level === 'gcse' ? 'AQA GCSE Chemistry 8462 (4.7 Organic chemistry)' : 'AQA A-level Chemistry 7405 (3.3 Organic chemistry)';
    var head = '<div class="print-head"><div><h1>Organic synthesis: ' + (kind === 'ws' ? 'questions' : 'mark scheme') + ' (' + lv + ')</h1><div class="sub">Savage Science Tools · ' + spec + '</div></div><div class="sub">Total: ' + total + ' marks</div></div>';
    var h = head;
    if (kind === 'ws') h += '<div class="fill-in"><span>Name</span><span>Class</span><span>Date</span></div>';
    qs.forEach(function (q) {
      if (kind === 'ws') {
        h += '<div class="q"><h3><span class="n">' + q.n + '</span> ' + q.title + '</h3><p>' + q.stem + '</p>';
        if (q.route) h += routeBoxes(q, E, S, level);
        q.parts.forEach(function (p) {
          h += '<div class="part"><p>' + (p.k ? '<b>(' + p.k + ')</b> ' : '') + p.t + ' <span class="mk">[' + p.m + (p.m === 1 ? ' mark' : ' marks') + ']</span></p>' + (p.box ? '<div class="draw-box"></div>' : lines(p.lines)) + '</div>';
        });
        h += '</div>';
      } else {
        h += '<div class="ms-q"><h4>' + q.n + '. ' + q.title + ' <span class="mk">[' + q.marks + ']</span></h4>';
        q.parts.forEach(function (p) {
          var a = p.ans;
          h += '<div class="ms-part"><b>' + (p.k ? '(' + p.k + ') ' : '') + '[' + p.m + ']</b><ul>' + a.pts.map(function (x) { return '<li>' + x + '</li>'; }).join('') + '</ul>';
          if (a.figs) h += figs(a.figs, S);
          if (a.note) h += '<p class="note">' + a.note + '</p>';
          if (a.dna && a.dna.length) h += '<p class="dna">Do not accept: ' + a.dna.join('; ') + '.</p>';
          h += '</div>';
        });
        h += '</div>';
      }
    });
    if (kind === 'ms') h += '<p class="dna">Credit any other valid route or method that follows the specification. Allow ecf (error carried forward) where a later answer follows correctly from an earlier error.</p>';
    return h;
  }

  /* ---------- Checks against the engine ---------- */
  function check(E, D) {
    var out = [], Qs = questions(E), G = { level: 'gcse' }, A = { level: 'alevel' };
    function t(n, c, d) { out.push([n, !!c, d || '']); }
    t('GCSE worksheet is 25 marks', Qs.gcse.reduce(function (s, q) { return s + q.marks; }, 0) === 25);
    t('A-level worksheet is 40 marks', Qs.alevel.reduce(function (s, q) { return s + q.marks; }, 0) === 40);
    ['gcse', 'alevel'].forEach(function (lv) {
      var bad = [];
      Qs[lv].forEach(function (q) { q.parts.forEach(function (p) { var n = p.ans.pts.reduce(function (s, x) { var m = /\((\d)\)\s*$/.exec(x); return s + (m ? +m[1] : 0); }, 0); if (n !== p.m) bad.push(q.n + (p.k || '') + ' has ' + n + ' marking points for ' + p.m + ' marks'); }); });
      t(lv + ': every part has exactly as many marking points as marks', bad.length === 0, bad.join('; '));
    });
    [['gcse', G], ['alevel', A]].forEach(function (x) {
      Qs[x[0]].forEach(function (q) {
        if (!q.route) return;
        var ck = routeOK(E, q.route, x[1]);
        t(x[0] + ' Q' + q.n + ': the route is valid in the engine at this level', ck.ok, ck.why);
      });
    });
    t('GCSE Q2a answer matches the engine: ethene + Br₂ → 1,2-dibromoethane', E.react('ethene', 'br2', 'dark', G).products[0].id === 'dibromoethane');
    t('GCSE Q2b answer matches the engine: propene + H₂ → propane', E.react('propene', 'h2', 'heat', G).products[0].id === 'propane');
    t('GCSE Q3 matches the engine: bromine water decolourised by an alkene only', E.react('propene', 'brw', 'x', G).status === 'observation' && E.react('propane', 'brw', 'x', G).status === 'none');
    t('GCSE Q5 matches the engine: effervescence with sodium carbonate', /carbon dioxide/.test(E.react('ethanoic-acid', 'na2co3', 'x', G).explain));
    t('A-level Q2 matches the engine: aqueous gives propan-2-ol, ethanolic gives propene', E.react('2-bromopropane', 'naoh', 'aq', A).products[0].id === 'propan-2-ol' && E.react('2-bromopropane', 'naoh', 'eth', A).products[0].id === 'propene');
    t('A-level Q2 mechanisms match the engine', E.react('2-bromopropane', 'naoh', 'aq', A).mech.name === 'Nucleophilic substitution' && E.react('2-bromopropane', 'naoh', 'eth', A).mech.name === 'Elimination');
    t('A-level Q3 matches the engine: distil gives propanal, reflux gives propanoic acid', E.react('propan-1-ol', 'oxid', 'distil', A).products[0].id === 'propanal' && E.react('propan-1-ol', 'oxid', 'reflux', A).products[0].id === 'propanoic-acid');
    t('A-level Q4 matches the engine: 2-bromopropane is the major product', E.react('propene', 'hbr', 'rt', A).products[0].id === '2-bromopropane');
    t('A-level Q5 matches the engine: ethanal + KCN is racemic', E.react('ethanal', 'kcn', 'acid', A).racemic === true);
    var ms = render('alevel', 'ms', E, { svg: function () { return ''; } });
    ['KOH” without saying aqueous', 'reflux” for the aldehyde', 'H₂SO₄ alone', 'NaBH₄ for the nitrile', 'HCN on its own', 'above 55 °C'].forEach(function (s) { t('A-level mark scheme carries the do-not-accept note: ' + s, ms.indexOf(s) >= 0); });
    ['gcse', 'alevel'].forEach(function (lv) { var w = render(lv, 'ws', E, { svg: function () { return ''; } }); t(lv + ' worksheet never contains a mark scheme', !/Do not accept/.test(w)); });
    return out;
  }
  function routeOK(E, route, opt) {
    // Every consecutive pair in the route must be reachable in one ok step.
    for (var i = 0; i < route.length - 1; i++) {
      var rs = E.routes(route[i], route[i + 1], Object.assign({ maxSteps: 1 }, opt));
      if (!rs.length) return { ok: false, why: route[i] + ' → ' + route[i + 1] + ' has no one-step route' };
    }
    return { ok: true };
  }

  return { questions: questions, render: render, check: check };
});
