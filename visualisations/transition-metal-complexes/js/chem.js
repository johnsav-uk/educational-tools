/* Transition Metal Complexes — the chemistry.
   Everything a pupil reads about a reaction or a complex lives here, so it
   can be checked against the AQA A-level Chemistry specification (7405) in
   one place: 3.2.5.1–3.2.5.4 (transition metals) and 3.2.6 (reactions of
   ions in aqueous solution).

   Formulae are written in a light markup that TM.fmt() turns into HTML and
   draw.js turns into canvas text:
     digits after a letter or ")"  → subscript      H2O, (OH)2
     anything after "]"            → superscript    [Cu(H2O)6]2+
     ^ up to the next space        → superscript    Cu^2+, CO3^2−, Cl^−
   In prose, formulae go in {braces}: TM.tx('Add {NH3} to {[Cu(H2O)6]2+}'). */
(function () {
  'use strict';

  /* ---------- Formula markup ---------- */
  // Split one formula into runs of normal, subscript and superscript text.
  function runs(s) {
    var out = [], i = 0, prev = '';
    function push(t, m) {
      if (!t) return;
      var last = out[out.length - 1];
      if (last && last.m === m) last.t += t; else out.push({ t: t, m: m });
    }
    while (i < s.length) {
      var c = s[i];
      if (c === '^') {
        var j = i + 1;
        while (j < s.length && s[j] !== ' ') j++;
        push(s.slice(i + 1, j), 'sup'); prev = ''; i = j; continue;
      }
      if (c === ']') {
        push(']', 'n');
        var k = i + 1;
        while (k < s.length && /[0-9+−\-]/.test(s[k])) k++;
        push(s.slice(i + 1, k), 'sup'); prev = ''; i = k; continue;
      }
      if (/[0-9]/.test(c) && /[A-Za-z)]/.test(prev)) { push(c, 'sub'); i++; continue; }
      push(c, 'n');
      prev = /[0-9]/.test(c) && out[out.length - 1].m === 'sub' ? prev : c;
      i++;
    }
    return out;
  }
  function esc(t) { return t.replace(/&/g, '&amp;').replace(/</g, '&lt;'); }
  function fmt(s) {
    return runs(s).map(function (r) {
      return r.m === 'sub' ? '<sub>' + esc(r.t) + '</sub>' : r.m === 'sup' ? '<sup>' + esc(r.t) + '</sup>' : esc(r.t);
    }).join('');
  }
  function tx(s) { return s.replace(/\{([^}]+)\}/g, function (_, f) { return fmt(f); }); }

  /* ---------- Complexes (species) ----------
     model: how mol3d.js builds it. colour: what you see in the tube.
     d: number of d electrons in the metal ion. */
  var SP = {
    cu_aq:   { f: '[Cu(H2O)6]2+', name: 'hexaaquacopper(II) ion', colour: '#4aa3df', col: 'blue solution', shape: 'octahedral', cn: 6, ox: '+2', d: 9, model: { m: 'Cu', geo: 'oct', lig: ['H2O', 'H2O', 'H2O', 'H2O', 'H2O', 'H2O'] } },
    cu_oh2:  { f: '[Cu(H2O)4(OH)2]', name: 'copper(II) hydroxide (neutral complex)', colour: '#3d8fd1', col: 'blue precipitate', shape: 'octahedral', cn: 6, ox: '+2', d: 9, model: { m: 'Cu', geo: 'oct', lig: ['H2O', 'H2O', 'H2O', 'H2O', 'OH', 'OH'] } },
    cu_nh3:  { f: '[Cu(NH3)4(H2O)2]2+', name: 'tetraamminediaquacopper(II) ion', colour: '#2b3fc4', col: 'deep blue solution', shape: 'octahedral', cn: 6, ox: '+2', d: 9, model: { m: 'Cu', geo: 'oct', lig: ['NH3', 'NH3', 'NH3', 'NH3', 'H2O', 'H2O'] } },
    cu_cl4:  { f: '[CuCl4]2−', name: 'tetrachlorocuprate(II) ion', colour: '#cfc23c', col: 'yellow-green solution', shape: 'tetrahedral', cn: 4, ox: '+2', d: 9, model: { m: 'Cu', geo: 'tet', lig: ['Cl', 'Cl', 'Cl', 'Cl'] } },
    cu_en:   { f: '[Cu(en)3]2+', name: 'tris(ethane-1,2-diamine)copper(II) ion', colour: '#3a3cb4', col: 'deep blue-violet solution', shape: 'octahedral', cn: 6, ox: '+2', d: 9, model: { m: 'Cu', geo: 'tris', lig: 'en' } },
    cu_edta: { f: '[Cu(EDTA)]2−', name: 'copper(II)–EDTA complex', colour: '#3f7ed6', col: 'blue solution', shape: 'octahedral', cn: 6, ox: '+2', d: 9, model: { m: 'Cu', geo: 'edta' } },
    cuco3:   { f: 'CuCO3', name: 'copper(II) carbonate', colour: '#3fa89a', col: 'blue-green precipitate', shape: '—', cn: null, ox: '+2', d: 9, model: null, ionic: true },

    co_aq:   { f: '[Co(H2O)6]2+', name: 'hexaaquacobalt(II) ion', colour: '#e7a1ba', col: 'pink solution', shape: 'octahedral', cn: 6, ox: '+2', d: 7, model: { m: 'Co', geo: 'oct', lig: ['H2O', 'H2O', 'H2O', 'H2O', 'H2O', 'H2O'] } },
    co_oh2:  { f: '[Co(H2O)4(OH)2]', name: 'cobalt(II) hydroxide (neutral complex)', colour: '#4f78c0', col: 'blue precipitate', shape: 'octahedral', cn: 6, ox: '+2', d: 7, model: { m: 'Co', geo: 'oct', lig: ['H2O', 'H2O', 'H2O', 'H2O', 'OH', 'OH'] } },
    co_nh3:  { f: '[Co(NH3)6]2+', name: 'hexaamminecobalt(II) ion', colour: '#d8b977', col: 'pale straw (yellow-brown) solution', shape: 'octahedral', cn: 6, ox: '+2', d: 7, model: { m: 'Co', geo: 'oct', lig: ['NH3', 'NH3', 'NH3', 'NH3', 'NH3', 'NH3'] } },
    co_cl4:  { f: '[CoCl4]2−', name: 'tetrachlorocobaltate(II) ion', colour: '#2f5fd4', col: 'blue solution', shape: 'tetrahedral', cn: 4, ox: '+2', d: 7, model: { m: 'Co', geo: 'tet', lig: ['Cl', 'Cl', 'Cl', 'Cl'] } },

    fe2_aq:  { f: '[Fe(H2O)6]2+', name: 'hexaaquairon(II) ion', colour: '#b9d79f', col: 'pale green solution', shape: 'octahedral', cn: 6, ox: '+2', d: 6, model: { m: 'Fe', geo: 'oct', lig: ['H2O', 'H2O', 'H2O', 'H2O', 'H2O', 'H2O'] } },
    fe2_oh2: { f: '[Fe(H2O)4(OH)2]', name: 'iron(II) hydroxide (neutral complex)', colour: '#5f8a4c', col: 'green precipitate', shape: 'octahedral', cn: 6, ox: '+2', d: 6, model: { m: 'Fe', geo: 'oct', lig: ['H2O', 'H2O', 'H2O', 'H2O', 'OH', 'OH'] } },
    feco3:   { f: 'FeCO3', name: 'iron(II) carbonate', colour: '#7f9b62', col: 'green precipitate', shape: '—', cn: null, ox: '+2', d: 6, model: null, ionic: true },

    fe3_aq:  { f: '[Fe(H2O)6]3+', name: 'hexaaquairon(III) ion', colour: '#d9ab4c', col: 'yellow-brown solution', shape: 'octahedral', cn: 6, ox: '+3', d: 5, model: { m: 'Fe', geo: 'oct', lig: ['H2O', 'H2O', 'H2O', 'H2O', 'H2O', 'H2O'] } },
    fe3_oh3: { f: '[Fe(H2O)3(OH)3]', name: 'iron(III) hydroxide (neutral complex)', colour: '#9a5326', col: 'brown precipitate', shape: 'octahedral', cn: 6, ox: '+3', d: 5, model: { m: 'Fe', geo: 'oct', lig: ['H2O', 'OH', 'H2O', 'OH', 'H2O', 'OH'] } },
    fe_cl4:  { f: '[FeCl4]−', name: 'tetrachloroferrate(III) ion', colour: '#e4c437', col: 'yellow solution', shape: 'tetrahedral', cn: 4, ox: '+3', d: 5, model: { m: 'Fe', geo: 'tet', lig: ['Cl', 'Cl', 'Cl', 'Cl'] } },

    al_aq:   { f: '[Al(H2O)6]3+', name: 'hexaaquaaluminium ion', colour: null, col: 'colourless solution', shape: 'octahedral', cn: 6, ox: '+3', d: null, model: { m: 'Al', geo: 'oct', lig: ['H2O', 'H2O', 'H2O', 'H2O', 'H2O', 'H2O'] } },
    al_oh3:  { f: '[Al(H2O)3(OH)3]', name: 'aluminium hydroxide (neutral complex)', colour: '#f2f4f7', col: 'white precipitate', shape: 'octahedral', cn: 6, ox: '+3', d: null, model: { m: 'Al', geo: 'oct', lig: ['H2O', 'OH', 'H2O', 'OH', 'H2O', 'OH'] } },
    al_oh4:  { f: '[Al(H2O)2(OH)4]−', name: 'aluminate ion', colour: null, col: 'colourless solution', shape: 'octahedral', cn: 6, ox: '+3', d: null, model: { m: 'Al', geo: 'oct', lig: ['OH', 'OH', 'OH', 'OH', 'H2O', 'H2O'] } }
  };

  /* ---------- Metal ions and reagents for the test tubes ---------- */
  var IONS = [
    { id: 'cu', label: 'Copper(II)', f: 'Cu^2+', start: 'cu_aq', spec: '3.2.5.2, 3.2.6' },
    { id: 'co', label: 'Cobalt(II)', f: 'Co^2+', start: 'co_aq', spec: '3.2.5.2' },
    { id: 'fe2', label: 'Iron(II)', f: 'Fe^2+', start: 'fe2_aq', spec: '3.2.6' },
    { id: 'fe3', label: 'Iron(III)', f: 'Fe^3+', start: 'fe3_aq', spec: '3.2.5.2, 3.2.6' },
    { id: 'al', label: 'Aluminium', f: 'Al^3+', start: 'al_aq', spec: '3.2.6' }
  ];
  var REAGENTS = [
    { id: 'naoh', mk: '{NaOH(aq)}', label: 'NaOH(aq)', f: 'NaOH(aq)', what: 'sodium hydroxide', bottle: '#c9d3df' },
    { id: 'nh3', mk: '{NH3(aq)}', label: 'NH3(aq)', f: 'NH3(aq)', what: 'aqueous ammonia', bottle: '#c9d3df' },
    { id: 'co3', mk: '{Na2CO3(aq)}', label: 'Na2CO3(aq)', f: 'Na2CO3(aq)', what: 'sodium carbonate', bottle: '#c9d3df' },
    { id: 'hcl', mk: 'conc. HCl', label: 'conc. HCl', f: 'HCl (conc.)', what: 'concentrated hydrochloric acid', bottle: '#e8e2a8' },
    { id: 'en', mk: 'en', label: 'en', f: 'H2NCH2CH2NH2', what: 'ethane-1,2-diamine (en)', bottle: '#c9d3df' },
    { id: 'edta', mk: '{EDTA^4−}', label: 'EDTA⁴⁻', f: 'EDTA^4−', what: 'EDTA⁴⁻ solution', bottle: '#c9d3df' }
  ];

  /* Each reaction has two stages: a few drops, then excess.
     sol: solution colour (null = colourless), ppt: precipitate colour,
     gas: bubbles of CO2, sp: the species the 3D panel shows,
     kind: what sort of reaction it is. */
  var ACID_BASE = 'Acid–base (hydrolysis)';
  var LIG_SUB = 'Ligand substitution';
  var R = {
    cu: {
      naoh: {
        few: { sol: '#bcdcf2', ppt: '#3d8fd1', sp: 'cu_oh2', obs: 'Blue precipitate',
          eq: '[Cu(H2O)6]2+ + 2OH^− → [Cu(H2O)4(OH)2] + 2H2O', kind: ACID_BASE,
          why: '{OH^−} ions remove {H^+} from two of the water ligands. The complex left has no charge, so it is insoluble and precipitates.' },
        excess: { same: true, obs: 'Blue precipitate: no further change in excess {NaOH}' }
      },
      nh3: {
        few: { sol: '#bcdcf2', ppt: '#3d8fd1', sp: 'cu_oh2', obs: 'Blue precipitate',
          eq: '[Cu(H2O)6]2+ + 2NH3 → [Cu(H2O)4(OH)2] + 2NH4^+', kind: ACID_BASE,
          why: 'With a little ammonia, {NH3} acts as a base, not a ligand: it takes {H^+} from two water ligands and the neutral hydroxide precipitates.' },
        excess: { sol: '#2b3fc4', ppt: null, sp: 'cu_nh3', obs: 'Precipitate dissolves to give a deep blue solution',
          eq: '[Cu(H2O)4(OH)2] + 4NH3 → [Cu(NH3)4(H2O)2]2+ + 2H2O + 2OH^−', kind: LIG_SUB + ' (incomplete)',
          why: 'In excess, four {NH3} ligands replace ligands on the copper. {NH3} and {H2O} are similar in size and both uncharged, so the co-ordination number stays 6. The substitution is incomplete: two water ligands stay.',
          overall: '[Cu(H2O)6]2+ + 4NH3 → [Cu(NH3)4(H2O)2]2+ + 4H2O' }
      },
      co3: {
        few: { sol: '#c8e0ef', ppt: '#3fa89a', sp: 'cuco3', obs: 'Blue-green precipitate (no bubbles)',
          eq: '[Cu(H2O)6]2+ + CO3^2− → CuCO3 + 6H2O', kind: 'Precipitation',
          why: 'A 2+ aqua ion is not acidic enough to react with carbonate ions to release {CO2}, so the metal carbonate precipitates.' },
        excess: { same: true, obs: 'Blue-green precipitate: no further change' }
      },
      hcl: {
        few: { sol: '#4fb39a', ppt: null, sp: 'cu_aq', obs: 'Solution turns green',
          eq: '[Cu(H2O)6]2+ + 4Cl^− ⇌ [CuCl4]2− + 6H2O', kind: LIG_SUB,
          why: 'Some of the blue {[Cu(H2O)6]2+} has become yellow {[CuCl4]2−}: a mixture of the two looks green.' },
        excess: { sol: '#cfc23c', ppt: null, sp: 'cu_cl4', obs: 'Yellow-green solution',
          eq: '[Cu(H2O)6]2+ + 4Cl^− ⇌ [CuCl4]2− + 6H2O', kind: LIG_SUB + ' with a change of co-ordination number',
          why: '{Cl^−} ligands are larger than {H2O}, so only four fit round the copper. The co-ordination number falls from 6 to 4 and the shape changes from octahedral to tetrahedral. Adding water pushes the equilibrium back to the blue aqua ion.' }
      },
      en: {
        few: { sol: '#3a6fcf', ppt: null, sp: 'cu_aq', obs: 'The blue deepens',
          eq: '[Cu(H2O)6]2+ + 3H2NCH2CH2NH2 → [Cu(en)3]2+ + 6H2O', kind: LIG_SUB + ' by a bidentate ligand',
          why: 'Some water ligands have been replaced by ethane-1,2-diamine (en). Each en molecule forms two co-ordinate bonds, one from each nitrogen.' },
        excess: { sol: '#3a3cb4', ppt: null, sp: 'cu_en', obs: 'Deep blue-violet solution',
          eq: '[Cu(H2O)6]2+ + 3H2NCH2CH2NH2 → [Cu(en)3]2+ + 6H2O', kind: LIG_SUB + ': the chelate effect', chelate: [4, 7],
          why: 'Three bidentate en ligands replace six water ligands. Six Cu–O co-ordinate bonds break and six similar Cu–N bonds form, so ΔH is small. 4 particles become 7, so ΔS is positive, ΔG = ΔH − TΔS is negative and the chelate complex is favoured.' }
      },
      edta: {
        few: { sol: '#4a8cd8', ppt: null, sp: 'cu_aq', obs: 'Solution stays blue',
          eq: '[Cu(H2O)6]2+ + EDTA^4− → [Cu(EDTA)]2− + 6H2O', kind: LIG_SUB + ' by a multidentate ligand',
          why: 'EDTA⁴⁻ is hexadentate: one ion forms six co-ordinate bonds, two from nitrogen atoms and four from oxygen atoms.' },
        excess: { sol: '#3f7ed6', ppt: null, sp: 'cu_edta', obs: 'Blue solution of {[Cu(EDTA)]2−}',
          eq: '[Cu(H2O)6]2+ + EDTA^4− → [Cu(EDTA)]2− + 6H2O', kind: LIG_SUB + ': the chelate effect', chelate: [2, 7],
          why: 'One EDTA⁴⁻ ion replaces all six water ligands. 2 particles become 7, a large increase in entropy, so the reaction is feasible even though ΔH is small. The same idea explains haem: an iron(II) ion held by a multidentate ligand.' }
      }
    },
    co: {
      nh3: {
        few: { sol: '#ead0d8', ppt: '#4f78c0', sp: 'co_oh2', obs: 'Blue precipitate',
          eq: '[Co(H2O)6]2+ + 2NH3 → [Co(H2O)4(OH)2] + 2NH4^+', kind: ACID_BASE,
          why: 'A little ammonia acts as a base, removing {H^+} from two water ligands. The neutral hydroxide precipitates.' },
        excess: { sol: '#d8b977', ppt: null, sp: 'co_nh3', obs: 'Precipitate dissolves to give a pale straw-coloured solution',
          eq: '[Co(H2O)4(OH)2] + 6NH3 → [Co(NH3)6]2+ + 4H2O + 2OH^−', kind: LIG_SUB + ' (complete)',
          why: 'All six ligands are replaced by {NH3}. {NH3} and {H2O} are similar in size and uncharged, so the co-ordination number stays 6. On standing in air the solution darkens as cobalt(II) is oxidised to cobalt(III).',
          overall: '[Co(H2O)6]2+ + 6NH3 → [Co(NH3)6]2+ + 6H2O' }
      },
      hcl: {
        few: { sol: '#9a6cc0', ppt: null, sp: 'co_aq', obs: 'Solution turns purple',
          eq: '[Co(H2O)6]2+ + 4Cl^− ⇌ [CoCl4]2− + 6H2O', kind: LIG_SUB,
          why: 'A mixture of pink {[Co(H2O)6]2+} and blue {[CoCl4]2−} looks purple.' },
        excess: { sol: '#2f5fd4', ppt: null, sp: 'co_cl4', obs: 'Blue solution',
          eq: '[Co(H2O)6]2+ + 4Cl^− ⇌ [CoCl4]2− + 6H2O', kind: LIG_SUB + ' with a change of co-ordination number',
          why: '{Cl^−} is larger than {H2O}, so only four chloride ligands fit: octahedral (6) becomes tetrahedral (4). Adding water moves the equilibrium back and the pink colour returns.' }
      }
    },
    fe2: {
      naoh: {
        few: { sol: '#dfe9d2', ppt: '#5f8a4c', sp: 'fe2_oh2', obs: 'Green precipitate',
          eq: '[Fe(H2O)6]2+ + 2OH^− → [Fe(H2O)4(OH)2] + 2H2O', kind: ACID_BASE, darkens: true,
          why: '{OH^−} removes {H^+} from two water ligands, leaving the neutral, insoluble hydroxide. On standing in air it darkens and turns brown at the surface as iron(II) is oxidised to iron(III).' },
        excess: { same: true, obs: 'Green precipitate: no further change in excess {NaOH}' }
      },
      nh3: {
        few: { sol: '#dfe9d2', ppt: '#5f8a4c', sp: 'fe2_oh2', obs: 'Green precipitate',
          eq: '[Fe(H2O)6]2+ + 2NH3 → [Fe(H2O)4(OH)2] + 2NH4^+', kind: ACID_BASE, darkens: true,
          why: '{NH3} acts as a base. Unlike copper, iron(II) does not form an ammine complex in excess ammonia, so the precipitate stays.' },
        excess: { same: true, obs: 'Green precipitate: no further change in excess {NH3}' }
      },
      co3: {
        few: { sol: '#e2ead6', ppt: '#7f9b62', sp: 'feco3', obs: 'Green precipitate (no bubbles)',
          eq: '[Fe(H2O)6]2+ + CO3^2− → FeCO3 + 6H2O', kind: 'Precipitation',
          why: 'A 2+ aqua ion is not acidic enough to release {CO2} from carbonate, so iron(II) carbonate precipitates.' },
        excess: { same: true, obs: 'Green precipitate: no further change' }
      }
    },
    fe3: {
      naoh: {
        few: { sol: '#efe3c4', ppt: '#9a5326', sp: 'fe3_oh3', obs: 'Brown precipitate',
          eq: '[Fe(H2O)6]3+ + 3OH^− → [Fe(H2O)3(OH)3] + 3H2O', kind: ACID_BASE,
          why: 'Three {H^+} are removed from water ligands, leaving the neutral iron(III) hydroxide, which precipitates.' },
        excess: { same: true, obs: 'Brown precipitate: no further change in excess {NaOH}' }
      },
      nh3: {
        few: { sol: '#efe3c4', ppt: '#9a5326', sp: 'fe3_oh3', obs: 'Brown precipitate',
          eq: '[Fe(H2O)6]3+ + 3NH3 → [Fe(H2O)3(OH)3] + 3NH4^+', kind: ACID_BASE,
          why: '{NH3} acts as a base. The precipitate does not dissolve in excess ammonia.' },
        excess: { same: true, obs: 'Brown precipitate: no further change in excess {NH3}' }
      },
      co3: {
        few: { sol: '#efe3c4', ppt: '#9a5326', gas: true, sp: 'fe3_oh3', obs: 'Brown precipitate and bubbles of gas ({CO2})',
          eq: '2[Fe(H2O)6]3+ + 3CO3^2− → 2[Fe(H2O)3(OH)3] + 3CO2 + 3H2O', kind: 'Acid–base: carbonate reacts with the acidic aqua ion',
          why: 'A 3+ aqua ion is acidic enough to react with carbonate and release {CO2}. The precipitate is the hydroxide, not a carbonate: iron(III) carbonate does not form.' },
        excess: { same: true, gas: true, obs: 'Brown precipitate and effervescence' }
      },
      hcl: {
        few: { sol: '#e7b93f', ppt: null, sp: 'fe3_aq', obs: 'Solution turns a stronger yellow',
          eq: '[Fe(H2O)6]3+ + 4Cl^− → [FeCl4]− + 6H2O', kind: LIG_SUB,
          why: 'Some water ligands are being replaced by chloride ligands.' },
        excess: { sol: '#e4c437', ppt: null, sp: 'fe_cl4', obs: 'Yellow solution',
          eq: '[Fe(H2O)6]3+ + 4Cl^− → [FeCl4]− + 6H2O', kind: LIG_SUB + ' with a change of co-ordination number',
          why: 'Four larger {Cl^−} ligands replace six water ligands: the co-ordination number falls from 6 to 4 and the shape becomes tetrahedral.' }
      }
    },
    al: {
      naoh: {
        few: { sol: null, ppt: '#f2f4f7', sp: 'al_oh3', obs: 'White precipitate',
          eq: '[Al(H2O)6]3+ + 3OH^− → [Al(H2O)3(OH)3] + 3H2O', kind: ACID_BASE,
          why: 'Three {H^+} are removed from water ligands, leaving the neutral, insoluble aluminium hydroxide.' },
        excess: { sol: null, ppt: null, sp: 'al_oh4', obs: 'Precipitate dissolves to give a colourless solution',
          eq: '[Al(H2O)3(OH)3] + OH^− → [Al(H2O)2(OH)4]− + H2O', kind: 'Acid–base: aluminium hydroxide is amphoteric',
          why: 'Aluminium hydroxide is amphoteric. It reacts with excess base to give the soluble {[Al(H2O)2(OH)4]−} ion (also written {[Al(OH)4]−}), and it would also dissolve in acid: {[Al(H2O)3(OH)3]} + {3H^+} → {[Al(H2O)6]3+}.' }
      },
      nh3: {
        few: { sol: null, ppt: '#f2f4f7', sp: 'al_oh3', obs: 'White precipitate',
          eq: '[Al(H2O)6]3+ + 3NH3 → [Al(H2O)3(OH)3] + 3NH4^+', kind: ACID_BASE,
          why: 'Ammonia is a weak base: it removes three {H^+} but not a fourth, so the precipitate does not dissolve in excess.' },
        excess: { same: true, obs: 'White precipitate: no further change in excess {NH3}' }
      },
      co3: {
        few: { sol: null, ppt: '#f2f4f7', gas: true, sp: 'al_oh3', obs: 'White precipitate and bubbles of gas ({CO2})',
          eq: '2[Al(H2O)6]3+ + 3CO3^2− → 2[Al(H2O)3(OH)3] + 3CO2 + 3H2O', kind: 'Acid–base: carbonate reacts with the acidic aqua ion',
          why: 'A 3+ aqua ion is acidic enough to release {CO2} from carbonate. The hydroxide precipitates, not a carbonate.' },
        excess: { same: true, gas: true, obs: 'White precipitate and effervescence' }
      }
    }
  };
  // Fill in the "no further change" stages from the stage before.
  Object.keys(R).forEach(function (ion) {
    Object.keys(R[ion]).forEach(function (rg) {
      var r = R[ion][rg];
      if (r.excess.same) {
        var e = {};
        Object.keys(r.few).forEach(function (k) { e[k] = r.few[k]; });
        e.obs = r.excess.obs; e.gas = r.excess.gas || r.few.gas; e.nochange = true;
        r.excess = e;
      }
    });
  });

  /* ---------- Why are they coloured? ----------
     lam: the wavelength absorbed most strongly (nm), w: half-width of the
     absorption band (nm). One main band per complex, rounded: enough to
     show the idea, which is all AQA asks. */
  var COLOUR = [
    { id: 'ti', f: '[Ti(H2O)6]3+', ion: 'Ti^3+', ox: '+3', d: 1, geo: 'oct', lig: 'H2O', lam: 500, w: 75, colour: '#a46bd0', seen: 'purple' },
    { id: 'cu_aq', f: '[Cu(H2O)6]2+', ion: 'Cu^2+', ox: '+2', d: 9, geo: 'oct', lig: 'H2O', lam: 800, w: 170, colour: '#4aa3df', seen: 'blue' },
    { id: 'cu_nh3', f: '[Cu(NH3)4(H2O)2]2+', ion: 'Cu^2+', ox: '+2', d: 9, geo: 'oct', lig: 'NH3', lam: 600, w: 90, colour: '#2b3fc4', seen: 'deep blue' },
    { id: 'co_aq', f: '[Co(H2O)6]2+', ion: 'Co^2+', ox: '+2', d: 7, geo: 'oct', lig: 'H2O', lam: 510, w: 55, colour: '#e7a1ba', seen: 'pink' },
    { id: 'co_cl4', f: '[CoCl4]2−', ion: 'Co^2+', ox: '+2', d: 7, geo: 'tet', lig: 'Cl', lam: 690, w: 65, colour: '#2f5fd4', seen: 'blue' },
    { id: 'cr2', f: '[Cr(H2O)6]2+', ion: 'Cr^2+', ox: '+2', d: 4, geo: 'oct', lig: 'H2O', lam: 715, w: 95, colour: '#69b3e7', seen: 'sky blue' },
    { id: 'cr3', f: '[Cr(H2O)6]3+', ion: 'Cr^3+', ox: '+3', d: 3, geo: 'oct', lig: 'H2O', lam: 575, w: 65, colour: '#7c5aa8', seen: 'violet' },
    { id: 'sc', f: '[Sc(H2O)6]3+', ion: 'Sc^3+', ox: '+3', d: 0, geo: 'oct', lig: 'H2O', lam: null, colour: null, seen: 'colourless' },
    { id: 'zn', f: '[Zn(H2O)6]2+', ion: 'Zn^2+', ox: '+2', d: 10, geo: 'oct', lig: 'H2O', lam: null, colour: null, seen: 'colourless' }
  ];
  var COMPARE = [
    { id: 'lig', label: 'Change the ligand', a: 'cu_aq', b: 'cu_nh3',
      text: 'Same ion, Cu²⁺, same co-ordination number. Swapping {H2O} for {NH3} ligands changes ΔE, so a different wavelength is absorbed.' },
    { id: 'cn', label: 'Change the co-ordination number', a: 'co_aq', b: 'co_cl4',
      text: 'Co²⁺ goes from six ligands (octahedral) to four (tetrahedral). The ligand changes too. ΔE is smaller, so longer-wavelength light is absorbed: pink becomes blue.' },
    { id: 'ox', label: 'Change the oxidation state', a: 'cr2', b: 'cr3',
      text: 'Same metal, same ligands, same shape. Chromium(III) has a higher charge than chromium(II): ΔE is larger, so shorter-wavelength light is absorbed.' },
    { id: 'none', label: 'Colourless ions', a: 'sc', b: 'zn',
      text: 'Sc³⁺ has no d electrons (3d⁰) and Zn²⁺ has a full d sub-level (3d¹⁰). With nothing to promote, or nowhere to promote it to, no visible light is absorbed.' }
  ];

  /* Six-sector colour wheel: complementary colours sit opposite. */
  var WHEEL = [
    { name: 'red', from: 630, to: 750, hex: '#e8423a' },
    { name: 'orange', from: 590, to: 630, hex: '#f08a2c' },
    { name: 'yellow', from: 560, to: 590, hex: '#f3d23a' },
    { name: 'green', from: 490, to: 560, hex: '#43b45a' },
    { name: 'blue', from: 430, to: 490, hex: '#2f6fe0' },
    { name: 'violet', from: 380, to: 430, hex: '#8a4fd0' }
  ];

  /* Constants, as on the AQA data sheet. */
  var K = { h: 6.63e-34, c: 3.00e8, NA: 6.022e23 };

  window.TM = { fmt: fmt, tx: tx, runs: runs, SP: SP, IONS: IONS, REAGENTS: REAGENTS, R: R, COLOUR: COLOUR, COMPARE: COMPARE, WHEEL: WHEEL, K: K };
})();
