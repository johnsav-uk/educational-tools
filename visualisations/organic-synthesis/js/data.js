/* Organic Synthesis Pathways: chemistry data.

   Everything the engine knows lives here, as plain data with no DOM: the
   molecules (a closed set, so every outcome can be checked), the reagent
   cards and their condition profiles, the reaction rules and the explicit
   edges that say which molecule turns into which. Nothing is looked up from a
   library and nothing is decided at run time by anything but this table.

   Levels: AQA GCSE Chemistry 8462 (gcse) and AQA A-level Chemistry 7405 (alevel),
   plus a small "Beyond AQA" enrichment set that is hidden unless switched on.
   Atomic masses are AQA's: C 12.0, H 1.0, O 16.0, N 14.0, Cl 35.5, Br 79.9, I 126.9. */
(function (root, factory) {
  var api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  root.SYNTH_DATA = api;
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  /* ---------- Molecules ----------
     id | SMILES | name (alternative names) | condensed formula | molecular formula | Mr | level | role | [chiral] | groups
     role: N reacts on the network · T terminal (only explicit edges) · S shelf partner only · F formula-only species */
  var MOLROWS = [
    'methane | C | methane | CH4 | CH4 | 16.0 | gcse | N | alkane',
    'ethane | CC | ethane | CH3CH3 | C2H6 | 30.0 | gcse | N | alkane',
    'propane | CCC | propane | CH3CH2CH3 | C3H8 | 44.0 | gcse | N | alkane',
    'decane | CCCCCCCCCC | decane | CH3(CH2)8CH3 | C10H22 | 142.0 | gcse | N | alkane',
    'octane | CCCCCCCC | octane | CH3(CH2)6CH3 | C8H18 | 114.0 | gcse | T | alkane',
    'ethene | C=C | ethene | CH2=CH2 | C2H4 | 28.0 | gcse | N | alkene',
    'propene | C=CC | propene | CH2=CHCH3 | C3H6 | 42.0 | gcse | N | alkene',
    'but-1-ene | C=CCC | but-1-ene (butene (GCSE)) | CH2=CHCH2CH3 | C4H8 | 56.0 | gcse | T | alkene',
    'e-but-2-ene | C/C=C/C | (E)-but-2-ene (trans-but-2-ene) | CH3CH=CHCH3 | C4H8 | 56.0 | alevel | T | alkene',
    'z-but-2-ene | C/C=C\\C | (Z)-but-2-ene (cis-but-2-ene) | CH3CH=CHCH3 | C4H8 | 56.0 | alevel | T | alkene',
    'methylpropene | C=C(C)C | 2-methylpropene (methylpropene) | CH2=C(CH3)2 | C4H8 | 56.0 | alevel | T | alkene',
    'phenylethene | C=Cc1ccccc1 | phenylethene (ethenylbenzene, styrene) | C6H5CH=CH2 | C8H8 | 104.0 | alevel | T | alkene arylring',
    'chloromethane | CCl | chloromethane | CH3Cl | CH3Cl | 50.5 | alevel | T | halo',
    'bromomethane | CBr | bromomethane | CH3Br | CH3Br | 94.9 | alevel | T | halo',
    'chloroethane | CCCl | chloroethane | CH3CH2Cl | C2H5Cl | 64.5 | alevel | N | halo',
    'bromoethane | CCBr | bromoethane | CH3CH2Br | C2H5Br | 108.9 | alevel | N | halo',
    '1-bromopropane | CCCBr | 1-bromopropane | CH3CH2CH2Br | C3H7Br | 122.9 | alevel | N | halo',
    '2-bromopropane | CC(C)Br | 2-bromopropane | CH3CHBrCH3 | C3H7Br | 122.9 | alevel | N | halo',
    '1-chloropropane | CCCCl | 1-chloropropane | CH3CH2CH2Cl | C3H7Cl | 78.5 | alevel | T | halo',
    '2-chloropropane | CC(C)Cl | 2-chloropropane | CH3CHClCH3 | C3H7Cl | 78.5 | alevel | T | halo',
    'dichloroethane | ClCCCl | 1,2-dichloroethane | CH2ClCH2Cl | C2H4Cl2 | 99.0 | gcse | T | halo',
    'dibromoethane | BrCCBr | 1,2-dibromoethane | CH2BrCH2Br | C2H4Br2 | 187.8 | gcse | T | halo',
    'diiodoethane | ICCI | 1,2-diiodoethane | CH2ICH2I | C2H4I2 | 281.8 | gcse | T | halo',
    'dichloropropane | CC(Cl)CCl | 1,2-dichloropropane | CH3CHClCH2Cl | C3H6Cl2 | 113.0 | gcse | T | halo',
    'dibromopropane | CC(Br)CBr | 1,2-dibromopropane | CH3CHBrCH2Br | C3H6Br2 | 201.8 | gcse | T | halo',
    'diiodopropane | CC(I)CI | 1,2-diiodopropane | CH3CHICH2I | C3H6I2 | 295.8 | gcse | T | halo',
    'methanol | CO | methanol | CH3OH | CH4O | 32.0 | gcse | S | alcohol1',
    'ethanol | CCO | ethanol | CH3CH2OH | C2H6O | 46.0 | gcse | N | alcohol1',
    'propan-1-ol | CCCO | propan-1-ol (propanol (GCSE)) | CH3CH2CH2OH | C3H8O | 60.0 | gcse | N | alcohol1',
    'propan-2-ol | CC(C)O | propan-2-ol | CH3CH(OH)CH3 | C3H8O | 60.0 | alevel | N | alcohol2',
    'butan-2-ol | CCC(C)O | butan-2-ol | CH3CH2CH(OH)CH3 | C4H10O | 74.0 | alevel | N | chiral | alcohol2',
    'methylpropan-2-ol | CC(C)(C)O | 2-methylpropan-2-ol (methylpropan-2-ol) | (CH3)3COH | C4H10O | 74.0 | alevel | N | alcohol3',
    'phenylethanol | CC(O)c1ccccc1 | 1-phenylethanol | C6H5CH(OH)CH3 | C8H10O | 122.0 | alevel | N | chiral | alcohol2 arylring',
    'ethanal | CC=O | ethanal | CH3CHO | C2H4O | 44.0 | alevel | N | aldehyde',
    'propanal | CCC=O | propanal | CH3CH2CHO | C3H6O | 58.0 | alevel | N | aldehyde',
    'propanone | CC(C)=O | propanone | CH3COCH3 | C3H6O | 58.0 | alevel | N | ketone',
    'butanone | CCC(C)=O | butanone (butan-2-one) | CH3CH2COCH3 | C4H8O | 72.0 | alevel | N | ketone',
    'phenylethanone | CC(=O)c1ccccc1 | phenylethanone (1-phenylethanone) | C6H5COCH3 | C8H8O | 120.0 | alevel | N | ketone arylring',
    'ethanoic-acid | CC(=O)O | ethanoic acid | CH3COOH | C2H4O2 | 60.0 | gcse | N | acid',
    'propanoic-acid | CCC(=O)O | propanoic acid | CH3CH2COOH | C3H6O2 | 74.0 | gcse | N | acid',
    'butanoic-acid | CCCC(=O)O | butanoic acid | CH3CH2CH2COOH | C4H8O2 | 88.0 | gcse | T | acid',
    'methylpropanoic-acid | CC(C)C(=O)O | 2-methylpropanoic acid (methylpropanoic acid) | (CH3)2CHCOOH | C4H8O2 | 88.0 | alevel | T | acid',
    'ethyl-ethanoate | CCOC(C)=O | ethyl ethanoate | CH3COOCH2CH3 | C4H8O2 | 88.0 | gcse | N | ester',
    'methyl-ethanoate | COC(C)=O | methyl ethanoate | CH3COOCH3 | C3H6O2 | 74.0 | alevel | N | ester',
    'methyl-propanoate | CCC(=O)OC | methyl propanoate | CH3CH2COOCH3 | C4H8O2 | 88.0 | alevel | N | ester',
    'ethyl-propanoate | CCOC(=O)CC | ethyl propanoate | CH3CH2COOCH2CH3 | C5H10O2 | 102.0 | alevel | N | ester',
    'propyl-ethanoate | CCCOC(C)=O | propyl ethanoate | CH3COOCH2CH2CH3 | C5H10O2 | 102.0 | alevel | N | ester',
    'isopropyl-ethanoate | CC(C)OC(C)=O | 1-methylethyl ethanoate (propan-2-yl ethanoate) | CH3COOCH(CH3)2 | C5H10O2 | 102.0 | alevel | N | ester',
    'butan-2-yl-ethanoate | CCC(C)OC(C)=O | 1-methylpropyl ethanoate (butan-2-yl ethanoate) | CH3COOCH(CH3)CH2CH3 | C6H12O2 | 116.0 | alevel | N | chiral | ester',
    'tert-butyl-ethanoate | CC(=O)OC(C)(C)C | 1,1-dimethylethyl ethanoate (2-methylpropan-2-yl ethanoate) | CH3COOC(CH3)3 | C6H12O2 | 116.0 | alevel | N | ester',
    'phenylethyl-ethanoate | CC(OC(C)=O)c1ccccc1 | 1-phenylethyl ethanoate | CH3COOCH(CH3)C6H5 | C10H12O2 | 164.0 | alevel | N | chiral | ester arylring',
    'ethanoyl-chloride | CC(Cl)=O | ethanoyl chloride | CH3COCl | C2H3ClO | 78.5 | alevel | N | acylCl',
    'propanoyl-chloride | CCC(Cl)=O | propanoyl chloride | CH3CH2COCl | C3H5ClO | 92.5 | alevel | N | acylCl',
    'ethanoic-anhydride | CC(=O)OC(C)=O | ethanoic anhydride | (CH3CO)2O | C4H6O3 | 102.0 | alevel | N | anhydride',
    'propanenitrile | CCC#N | propanenitrile | CH3CH2CN | C3H5N | 55.0 | alevel | N | nitrile',
    'butanenitrile | CCCC#N | butanenitrile | CH3CH2CH2CN | C4H7N | 69.0 | alevel | N | nitrile',
    'methylpropanenitrile | CC(C)C#N | 2-methylpropanenitrile (methylpropanenitrile) | (CH3)2CHCN | C4H7N | 69.0 | alevel | N | nitrile',
    'hn-ethanal | CC(O)C#N | 2-hydroxypropanenitrile | CH3CH(OH)CN | C3H5NO | 71.0 | alevel | T | chiral | nitrile alcohol2',
    'hn-propanal | CCC(O)C#N | 2-hydroxybutanenitrile | CH3CH2CH(OH)CN | C4H7NO | 85.0 | alevel | T | chiral | nitrile alcohol2',
    'hn-propanone | CC(C)(O)C#N | 2-hydroxy-2-methylpropanenitrile | (CH3)2C(OH)CN | C4H7NO | 85.0 | alevel | T | nitrile alcohol3',
    'hn-butanone | CCC(C)(O)C#N | 2-hydroxy-2-methylbutanenitrile | CH3CH2C(CH3)(OH)CN | C5H9NO | 99.0 | alevel | T | chiral | nitrile alcohol3',
    'hn-phenylethanone | CC(O)(C#N)c1ccccc1 | 2-hydroxy-2-phenylpropanenitrile | C6H5C(CH3)(OH)CN | C9H9NO | 147.0 | alevel | T | chiral | nitrile alcohol3 arylring',
    'ethylamine | CCN | ethylamine (ethanamine) | CH3CH2NH2 | C2H7N | 45.0 | alevel | N | amine1',
    'propylamine | CCCN | propylamine (propan-1-amine, 1-aminopropane) | CH3CH2CH2NH2 | C3H9N | 59.0 | alevel | N | amine1',
    'isopropylamine | CC(C)N | propan-2-amine (2-aminopropane) | CH3CH(NH2)CH3 | C3H9N | 59.0 | alevel | N | amine1',
    'butylamine | CCCCN | butylamine (butan-1-amine, 1-aminobutane) | CH3CH2CH2CH2NH2 | C4H11N | 73.0 | alevel | N | amine1',
    'methylpropylamine | CC(C)CN | 2-methylpropylamine (2-methylpropan-1-amine) | (CH3)2CHCH2NH2 | C4H11N | 73.0 | alevel | N | amine1',
    'diethylamine | CCNCC | diethylamine (N-ethylethanamine) | (CH3CH2)2NH | C4H11N | 73.0 | alevel | T | amine2',
    'ethylpropylamine | CCCNCC | N-ethylpropylamine (N-ethylpropan-1-amine) | CH3CH2CH2NHCH2CH3 | C5H13N | 87.0 | alevel | T | amine2',
    'ethylisopropylamine | CCNC(C)C | N-ethylpropan-2-amine | (CH3)2CHNHCH2CH3 | C5H13N | 87.0 | alevel | T | amine2',
    'phenylamine | Nc1ccccc1 | phenylamine (aniline) | C6H5NH2 | C6H7N | 93.0 | alevel | N | arylamine arylring',
    'ethanamide | CC(N)=O | ethanamide | CH3CONH2 | C2H5NO | 59.0 | alevel | T | amide',
    'propanamide | CCC(N)=O | propanamide | CH3CH2CONH2 | C3H7NO | 73.0 | alevel | T | amide',
    'n-ethylethanamide | CCNC(C)=O | N-ethylethanamide | CH3CONHCH2CH3 | C4H9NO | 87.0 | alevel | T | amide',
    'n-ethylpropanamide | CCNC(=O)CC | N-ethylpropanamide | CH3CH2CONHCH2CH3 | C5H11NO | 101.0 | alevel | T | amide',
    'n-propylethanamide | CCCNC(C)=O | N-propylethanamide | CH3CONHCH2CH2CH3 | C5H11NO | 101.0 | alevel | T | amide',
    'n-isopropylethanamide | CC(C)NC(C)=O | N-(1-methylethyl)ethanamide (N-(propan-2-yl)ethanamide) | CH3CONHCH(CH3)2 | C5H11NO | 101.0 | alevel | T | amide',
    'n-butylethanamide | CCCCNC(C)=O | N-butylethanamide | CH3CONHCH2CH2CH2CH3 | C6H13NO | 115.0 | alevel | T | amide',
    'n-methylpropylethanamide | CC(C)CNC(C)=O | N-(2-methylpropyl)ethanamide | CH3CONHCH2CH(CH3)2 | C6H13NO | 115.0 | alevel | T | amide',
    'n-phenylethanamide | CC(=O)Nc1ccccc1 | N-phenylethanamide | CH3CONHC6H5 | C8H9NO | 135.0 | alevel | T | amide arylring',
    'benzene | c1ccccc1 | benzene | C6H6 | C6H6 | 78.0 | alevel | N | benzene arylring',
    'nitrobenzene | O=N(=O)c1ccccc1 | nitrobenzene | C6H5NO2 | C6H5NO2 | 123.0 | alevel | N | nitro arylring',
  ];

  /* ---------- Formula-only species (drawn as a formula, not a structure) ---------- */
  var FORMULA_ONLY = [
    { id: 'glucose', name: 'glucose', cf: 'C6H12O6', formula: 'C6H12O6', mr: 180.0, level: 'gcse', role: 'N', groups: ['sugar'] },
    { id: 'sodium-ethanoate', name: 'sodium ethanoate', cf: 'CH3COONa', formula: 'C2H3NaO2', mr: 82.0, level: 'alevel', role: 'N', groups: ['salt'] },
    { id: 'sodium-propanoate', name: 'sodium propanoate', cf: 'CH3CH2COONa', formula: 'C3H5NaO2', mr: 96.0, level: 'alevel', role: 'N', groups: ['salt'] }
  ];

  /* ---------- Readable names for the group tokens ---------- */
  var GROUP_NAMES = {
    alkane: 'an alkane', alkene: 'an alkene (C=C)', benzene: 'benzene', arylring: 'a benzene ring', halo: 'a halogenoalkane',
    alcohol1: 'a primary alcohol', alcohol2: 'a secondary alcohol', alcohol3: 'a tertiary alcohol', aldehyde: 'an aldehyde',
    ketone: 'a ketone', acid: 'a carboxylic acid', ester: 'an ester', acylCl: 'an acyl chloride', anhydride: 'an acid anhydride',
    nitrile: 'a nitrile', amine1: 'a primary amine', amine2: 'a secondary amine', arylamine: 'a primary aromatic amine', amide: 'an amide',
    nitro: 'a nitro compound', salt: 'a carboxylate salt', sugar: 'a sugar'
  };

  /* ---------- Cards (the reagent shelf) and their condition profiles ----------
     lv: G = GCSE and A-level, A = A-level only, E = enrichment only.
     Profile lv: G = both, A = A-level only, g = GCSE only. */
  function P(id, text, lv) { return { id: id, text: text, lv: lv || 'G' }; }
  var CARDS = {
    crack: { label: 'Cracking', group: 'Processes and catalysts', lv: 'G', profiles: [P('cat', 'Hot (about 550 °C), zeolite catalyst'), P('steam', 'Very high temperature, with steam'), P('thermal', 'High temperature, high pressure', 'A')] },
    yeast: { label: 'Yeast in sugar solution', group: 'Processes and catalysts', lv: 'G', profiles: [P('anaerobic', 'About 30–35 °C, no air'), P('hot', 'About 70 °C'), P('air', 'About 30–35 °C, open to the air')] },
    h2: { label: 'Hydrogen, nickel catalyst', group: 'Oxidising and reducing agents', lv: 'G', profiles: [P('heat', 'Heat'), P('rt', 'Room temperature')] },
    steam: { label: 'Steam, phosphoric acid catalyst', group: 'Acids and catalysts', lv: 'G', profiles: [P('hp', 'About 300 °C, 60–70 atm'), P('nocat', '300 °C, 60–70 atm, no catalyst')] },
    cl2: { label: 'Chlorine', group: 'Halogens and hydrogen halides', lv: 'G', profiles: [P('dark', 'Room temperature, in the dark'), P('uv', 'Ultraviolet light', 'A')] },
    br2: { label: 'Bromine', group: 'Halogens and hydrogen halides', lv: 'G', profiles: [P('dark', 'Room temperature, in the dark'), P('uv', 'Ultraviolet light', 'A')] },
    i2: { label: 'Iodine', group: 'Halogens and hydrogen halides', lv: 'G', profiles: [P('dark', 'Room temperature, in the dark')] },
    oxid: { label: 'Acidified potassium dichromate(VI)', gcseLabel: 'An oxidising agent: acidified potassium dichromate', group: 'Oxidising and reducing agents', lv: 'G',
      profiles: [P('warm', 'Warm', 'g'), P('distil', 'Warm, distil the product off as it forms', 'A'), P('reflux', 'Excess oxidant, heat under reflux', 'A')] },
    'est-ethanoic': { label: 'Ethanoic acid + conc. H₂SO₄', group: 'Organic partners', lv: 'G', partner: 'ethanoic-acid', profiles: [P('warm', 'Warm'), P('nocat', 'Warm, no sulfuric acid')] },
    'est-ethanol': { label: 'Ethanol + conc. H₂SO₄', group: 'Organic partners', lv: 'G', partner: 'ethanol', profiles: [P('warm', 'Warm'), P('nocat', 'Warm, no sulfuric acid')] },
    'est-methanol': { label: 'Methanol + conc. H₂SO₄', group: 'Organic partners', lv: 'A', partner: 'methanol', profiles: [P('warm', 'Warm'), P('nocat', 'Warm, no sulfuric acid')] },
    water: { label: 'Water', group: 'Bases and nucleophiles', lv: 'G', profiles: [P('rt', 'Room temperature')] },
    h2so4: { label: 'Concentrated sulfuric acid', group: 'Acids and catalysts', lv: 'A', profiles: [P('coldwater', 'Cold, then add water and warm'), P('hot', 'Heat (about 170 °C)')] },
    h3po4: { label: 'Concentrated phosphoric acid', group: 'Acids and catalysts', lv: 'A', profiles: [P('hot', 'Heat')] },
    hbr: { label: 'Hydrogen bromide', group: 'Halogens and hydrogen halides', lv: 'A', profiles: [P('rt', 'Room temperature')] },
    naoh: { label: 'Sodium hydroxide (or KOH)', group: 'Bases and nucleophiles', lv: 'A', profiles: [P('aq', 'Aqueous, warm (heat under reflux)'), P('eth', 'Dissolved in ethanol, heat under reflux')] },
    kcn: { label: 'Potassium cyanide', group: 'Bases and nucleophiles', lv: 'A', hazard: true, profiles: [P('eth', 'In aqueous ethanol, heat under reflux'), P('acid', 'Aqueous, then add dilute acid')] },
    nh3: { label: 'Ammonia', group: 'Bases and nucleophiles', lv: 'A', profiles: [P('excess', 'Excess, in ethanol, heated in a sealed tube'), P('limited', 'Limited amount, in ethanol, sealed tube'), P('conc', 'Concentrated aqueous, room temperature')] },
    etnh2: { label: 'Ethylamine', group: 'Organic partners', lv: 'A', partner: 'ethylamine', profiles: [P('excess', 'Excess, in ethanol, sealed tube'), P('rt', 'Room temperature')] },
    acylcl: { label: 'Ethanoyl chloride', group: 'Organic partners', lv: 'A', partner: 'ethanoyl-chloride', profiles: [P('rt', 'Room temperature'), P('alcl3', 'AlCl₃ catalyst, dry, heat under reflux')] },
    anhyd: { label: 'Ethanoic anhydride', group: 'Organic partners', lv: 'A', partner: 'ethanoic-anhydride', profiles: [P('warm', 'Warm')] },
    dilacid: { label: 'Dilute hydrochloric acid', group: 'Acids and catalysts', lv: 'A', profiles: [P('reflux', 'Heat under reflux'), P('rt', 'Room temperature')] },
    nabh4: { label: 'NaBH₄ (sodium tetrahydridoborate)', group: 'Oxidising and reducing agents', lv: 'A', profiles: [P('aq', 'In aqueous solution, room temperature')] },
    lialh4: { label: 'LiAlH₄', group: 'Oxidising and reducing agents', lv: 'A', profiles: [P('ether', 'In dry ether, then dilute acid')] },
    nitrating: { label: 'Conc. HNO₃ + conc. H₂SO₄', group: 'Acids and catalysts', lv: 'A', profiles: [P('cool', 'Below 55 °C'), P('hot', 'Above 55 °C')] },
    snhcl: { label: 'Tin + conc. HCl', group: 'Oxidising and reducing agents', lv: 'A', profiles: [P('reflux', 'Heat under reflux, then add NaOH(aq)')] },
    brw: { label: 'Bromine water', group: 'Tests', lv: 'G', kind: 'test', profiles: [P('x', 'Shake with the sample')] },
    na: { label: 'Sodium metal', group: 'Tests', lv: 'G', kind: 'test', profiles: [P('x', 'Add a small piece')] },
    na2co3: { label: 'Sodium carbonate solution', group: 'Tests', lv: 'G', kind: 'test', profiles: [P('x', 'Add the solution')] },
    tollens: { label: 'Tollens’ reagent', group: 'Tests', lv: 'A', kind: 'test', profiles: [P('x', 'Warm in a water bath')] },
    fehling: { label: 'Fehling’s solution', group: 'Tests', lv: 'A', kind: 'test', profiles: [P('x', 'Warm in a water bath')] },
    nabr: { label: 'NaBr + conc. H₂SO₄', group: 'Halogens and hydrogen halides', lv: 'E', profiles: [P('reflux', 'Heat under reflux')] },
    socl2: { label: 'Thionyl chloride, SOCl₂', group: 'Organic partners', lv: 'E', profiles: [P('rt', 'Room temperature')] }
  };
  var CARD_GROUPS = ['Acids and catalysts', 'Oxidising and reducing agents', 'Halogens and hydrogen halides', 'Bases and nucleophiles', 'Organic partners', 'Processes and catalysts', 'Tests'];

  /* ---------- Mechanism helper ---------- */
  var MN = { fr: 'Free-radical substitution', ea: 'Electrophilic addition', ns: 'Nucleophilic substitution', el: 'Elimination', na: 'Nucleophilic addition', ae: 'Nucleophilic addition–elimination', es: 'Electrophilic substitution' };
  function mech(k, outline, scene, exactWhen, who, inter, extra) {
    var m = { name: MN[k], outline: outline, scene: scene, exactWhen: exactWhen || [], who: who, inter: inter };
    if (extra) for (var x in extra) m[x] = extra[x];
    return m;
  }

  /* ---------- Shared edge sets ---------- */
  var CARBONYL_RED = {
    ethanal: 'ethanol', propanal: 'propan-1-ol', propanone: 'propan-2-ol',
    butanone: { p: 'butan-2-ol', racemic: true }, phenylethanone: { p: 'phenylethanol', racemic: true }
  };
  var ESTERS_FROM_ALCOHOL = {
    ethanol: 'ethyl-ethanoate', 'propan-1-ol': 'propyl-ethanoate', 'propan-2-ol': 'isopropyl-ethanoate',
    'butan-2-ol': 'butan-2-yl-ethanoate', 'methylpropan-2-ol': 'tert-butyl-ethanoate', phenylethanol: 'phenylethyl-ethanoate'
  };
  var HYDROLYSIS_ALK = {
    'ethyl-ethanoate': ['=sodium-ethanoate', '=ethanol'], 'methyl-ethanoate': ['=sodium-ethanoate', '=methanol'],
    'ethyl-propanoate': ['=sodium-propanoate', '=ethanol'], 'methyl-propanoate': ['=sodium-propanoate', '=methanol'],
    'propyl-ethanoate': ['=sodium-ethanoate', '=propan-1-ol'], 'isopropyl-ethanoate': ['=sodium-ethanoate', '=propan-2-ol'],
    'butan-2-yl-ethanoate': ['=sodium-ethanoate', '=butan-2-ol'], 'tert-butyl-ethanoate': ['=sodium-ethanoate', '=methylpropan-2-ol'],
    'phenylethyl-ethanoate': ['=sodium-ethanoate', '=phenylethanol']
  };
  var HYDROLYSIS_ACID = {
    'ethyl-ethanoate': ['=ethanoic-acid', '=ethanol'], 'methyl-ethanoate': ['=ethanoic-acid', '=methanol'],
    'ethyl-propanoate': ['=propanoic-acid', '=ethanol'], 'methyl-propanoate': ['=propanoic-acid', '=methanol'],
    'propyl-ethanoate': ['=ethanoic-acid', '=propan-1-ol'], 'isopropyl-ethanoate': ['=ethanoic-acid', '=propan-2-ol'],
    'butan-2-yl-ethanoate': ['=ethanoic-acid', '=butan-2-ol'], 'tert-butyl-ethanoate': ['=ethanoic-acid', '=methylpropan-2-ol'],
    'phenylethyl-ethanoate': ['=ethanoic-acid', '=phenylethanol']
  };
  var KCN_HAZARD = 'Hazard: potassium cyanide is highly toxic, and acid must never be added to it except in a fume cupboard, because HCN gas is released. This is why the reaction is only ever done in a controlled laboratory.';
  var RACEMIC = 'Racemic product: the C=O group is planar, so the nucleophile attacks from either face with equal probability. The two enantiomers form in equal amounts, so the product is optically inactive.';

  /* ---------- Rules ----------
     use: [card, profile] pairs · groups: the functional groups it acts on · edges: substrate → product(s).
     An edge is 'id' (major product), ['id', '~minor', '=equal'] or { p: ..., racemic, low, a, note, status, why, w, eq, by: {card: ...} }.
     a: true = A-level only inside an otherwise GCSE rule. */
  var RULES = [
    { id: 'crack', use: [['crack', 'cat'], ['crack', 'steam'], ['crack', 'thermal']], groups: ['alkane'], level: 'gcse', type: 'Cracking (thermal decomposition)', spec: '4.7.1.4 · 3.3.2.2',
      explain: 'Cracking breaks a long alkane into a shorter alkane and a more reactive alkene. Decane splits into octane and ethene, and the alkene is the starting point for most of the chemistry in this tool.',
      eq: '{s} -> {p} + {q}',
      edges: {
        decane: ['=ethene', '=octane'],
        methane: { status: 'beyond', why: 'Small alkanes can be cracked too, but this tool models the cracking of decane only.' },
        ethane: { status: 'beyond', why: 'Small alkanes can be cracked too, but this tool models the cracking of decane only.' },
        propane: { status: 'beyond', why: 'Small alkanes can be cracked too, but this tool models the cracking of decane only.' }
      } },
    { id: 'frs', use: [['cl2', 'uv'], ['br2', 'uv']], groups: ['alkane'], level: 'alevel', type: 'Free-radical substitution', spec: '3.3.2.4',
      mech: mech('fr', false, 'frs-chlorination', ['methane|cl2'], 'The halogen radical (Cl• or Br•), made when ultraviolet light splits the halogen molecule.', 'Alkyl radical (CH₃•, C₂H₅• and so on)', { note: 'AQA asks for equations for initiation, propagation and termination here, not curly arrows.' }),
      explain: 'In ultraviolet light the halogen molecule splits into radicals. A halogen radical removes a hydrogen atom from the alkane, and the alkyl radical formed then reacts with another halogen molecule, so a chain reaction runs (initiation, propagation, termination).',
      eq: '{s} + {H2} -> {p} + {HX}',
      edges: {
        methane: { by: { cl2: 'chloromethane', br2: 'bromomethane' }, low: true },
        ethane: { by: { cl2: 'chloroethane', br2: 'bromoethane' }, low: true },
        propane: { status: 'mixture', why: 'Propane has two different kinds of C–H bond, so UV substitution gives a mixture: 1-substituted and 2-substituted products, and further substitution too. A route cannot continue from a mixture.', mixture: ['1- and 2-halogenopropane', 'more highly substituted products'] },
        decane: { status: 'mixture', why: 'Decane has many different C–H positions, so UV substitution gives a complicated mixture of positional isomers and more highly substituted products. A route cannot continue from a mixture.', mixture: ['isomeric halogenodecanes', 'more highly substituted products'] }
      } },
    { id: 'hydrogenate', use: [['h2', 'heat']], groups: ['alkene'], level: 'gcse', type: 'Addition (hydrogenation)', spec: '4.7.2.2',
      explain: 'Hydrogen adds across the C=C double bond when heated with a nickel catalyst. The alkene becomes the saturated alkane with the same number of carbon atoms.',
      eq: '{s} + H2 -> {p}',
      wrong: { 'h2/rt': 'Hydrogen adds across C=C only when heated with a nickel catalyst. At room temperature the reaction is far too slow.' },
      edges: { ethene: 'ethane', propene: 'propane' } },
    { id: 'hydrate', use: [['steam', 'hp']], groups: ['alkene'], level: 'gcse', type: 'Addition (hydration)', spec: '4.7.2.2 · 3.3.5.1',
      mech: mech('ea', true, 'ea-ethene-h2so4', [], 'The H⁺ from the acid catalyst. The electron-rich C=C attacks it, so H⁺ is the electrophile.', 'Carbocation, which is then attacked by water; H⁺ is lost to regenerate the catalyst',
        { steps: ['The C=C double bond attacks H⁺ from the phosphoric acid catalyst, forming a carbocation.', 'A lone pair on the oxygen of a water molecule attacks the carbocation, giving a protonated alcohol.', 'The protonated alcohol loses H⁺, giving the alcohol and regenerating the catalyst.'], nearest: true }),
      explain: 'Steam adds across the C=C bond (hydration), using a phosphoric acid catalyst at about 300 °C and 60–70 atm. Ethene gives ethanol. Propene gives mainly propan-2-ol and a little propan-1-ol.',
      explainG: 'Steam adds across the C=C double bond, using a phosphoric acid catalyst at about 300 °C and a high pressure of 60–70 atm. An alkene becomes an alcohol.',
      eq: '{s} + H2O -> {p}',
      wrong: { 'steam/nocat': 'Without the phosphoric acid catalyst the reaction is far too slow, even at 300 °C and high pressure.' },
      edges: {
        ethene: 'ethanol',
        propene: { p: ['propan-2-ol', '~propan-1-ol'], note: 'Propene is not symmetrical, so two alcohols can form. The H adds to the carbon that already has more hydrogens, because the secondary carbocation is more stable than the primary one. Propan-2-ol is the major product.', noteG: 'Propene can give either propanol, and GCSE credits either one. In fact propan-2-ol is the main product.' }
      } },
    { id: 'halogen-add', use: [['cl2', 'dark'], ['cl2', 'uv'], ['br2', 'dark'], ['br2', 'uv'], ['i2', 'dark']], groups: ['alkene'], level: 'gcse', type: 'Addition', spec: '4.7.2.2 · 3.3.4.2',
      mech: mech('ea', true, 'ea-ethene-br2', ['ethene|br2'], 'The halogen molecule, which becomes polarised as it approaches the electron-rich C=C. The δ+ end is the electrophile.', 'Carbocation (or a bridged halonium ion)'),
      explain: 'The halogen adds across the C=C bond at room temperature, with no catalyst, to give a 1,2-dihalogenoalkane. The halogen is used up, so its colour disappears.',
      explainG: 'Halogens add across the C=C double bond at room temperature to make a dihalogenoalkane. The same reaction with bromine is the test for an alkene: the orange colour disappears.',
      eq: '{s} + {H2} -> {p}',
      observe: { br2: 'The orange-brown bromine colour disappears.', cl2: 'The pale green chlorine colour disappears.', i2: 'The brown iodine colour fades.' },
      edges: {
        ethene: { by: { cl2: 'dichloroethane', br2: 'dibromoethane', i2: 'diiodoethane' } },
        propene: { by: { cl2: 'dichloropropane', br2: 'dibromopropane', i2: 'diiodopropane' } }
      } },
    { id: 'hbr-add', use: [['hbr', 'rt']], groups: ['alkene'], level: 'alevel', type: 'Electrophilic addition', spec: '3.3.4.2',
      mech: mech('ea', true, { ethene: 'ea-ethene-hbr', propene: 'ea-propene-hbr', default: 'ea-ethene-hbr' }, ['ethene|hbr', 'propene|hbr'], 'The H of H–Br (δ+) is the electrophile: the C=C electron pair attacks it and the H–Br bond breaks.', 'Carbocation, attacked by Br⁻'),
      explain: 'Hydrogen bromide adds across the C=C bond at room temperature to give a bromoalkane. The δ+ hydrogen is attacked by the electron-rich double bond, forming a carbocation that then bonds to Br⁻.',
      eq: '{s} + HBr -> {p}',
      edges: {
        ethene: 'bromoethane',
        propene: { p: ['2-bromopropane', '~1-bromopropane'], note: 'Propene is not symmetrical, so two products are possible. The more stable secondary carbocation forms preferentially, so 2-bromopropane is the major product and 1-bromopropane the minor one.' }
      } },
    { id: 'h2so4-add', use: [['h2so4', 'coldwater']], groups: ['alkene'], level: 'alevel', type: 'Electrophilic addition', spec: '3.3.4.2',
      mech: mech('ea', true, 'ea-ethene-h2so4', ['ethene|h2so4'], 'The H of concentrated H₂SO₄ (δ+), attacked by the C=C electron pair.', 'Carbocation, then an alkyl hydrogensulfate'),
      explain: 'The alkene is absorbed into cold concentrated sulfuric acid, forming an alkyl hydrogensulfate. Adding water and warming hydrolyses it to the alcohol and regenerates the sulfuric acid.',
      eq: '{s} + H2O -> {p}',
      edges: {
        ethene: { p: 'ethanol', note: 'Overall the alkene has gained H and OH. The H₂SO₄ is regenerated in the second stage, so it behaves as a catalyst overall.' },
        propene: { p: ['propan-2-ol', '~propan-1-ol'], note: 'Overall the alkene has gained H and OH. The more stable secondary carbocation forms preferentially, so propan-2-ol is the major product.' }
      } },
    { id: 'subst-oh', use: [['naoh', 'aq']], groups: ['halo'], level: 'alevel', type: 'Nucleophilic substitution', spec: '3.3.3.1',
      mech: mech('ns', true, 'ns-hydroxide', ['bromoethane|naoh'], 'The hydroxide ion, OH⁻, is the nucleophile: it uses a lone pair to attack the δ+ carbon.', 'Single step, with the C–X bond breaking as the C–O bond forms'),
      explain: 'Heated under reflux with aqueous sodium (or potassium) hydroxide, the halogenoalkane is hydrolysed. The hydroxide ion is a nucleophile: it attacks the δ+ carbon and the halide ion leaves, so the halogen is replaced by OH.',
      eq: '{s} + NaOH -> {p} + Na{X}',
      edges: {
        chloroethane: { p: 'ethanol', note: 'The C–Cl bond is stronger than the C–Br bond, so chloroethane reacts more slowly than bromoethane. The product is the same.' },
        bromoethane: 'ethanol',
        '1-bromopropane': 'propan-1-ol',
        '2-bromopropane': { p: ['propan-2-ol', '~propene'], note: 'Substitution and elimination compete for this secondary halogenoalkane. In aqueous hydroxide substitution is the major route and some propene also forms.' }
      } },
    { id: 'elim', use: [['naoh', 'eth']], groups: ['halo'], level: 'alevel', type: 'Elimination', spec: '3.3.3.2',
      mech: mech('el', true, 'elim-koh', ['2-bromopropane|naoh'], 'Here hydroxide acts as a base: it removes an H⁺ from the carbon next to the C–X bond.', 'Single step: the double bond forms as the halide leaves'),
      explain: 'Heated under reflux with hydroxide dissolved in ethanol, the hydroxide ion acts as a base and removes a hydrogen from the carbon next to the C–X. The halide leaves and a C=C bond forms, so HX is eliminated.',
      eq: '{s} + NaOH -> {p} + Na{X} + H2O',
      edges: {
        chloroethane: { p: 'ethene', note: 'AQA accepts this route. For a primary halogenoalkane substitution competes strongly, and elimination works best for secondary ones.' },
        bromoethane: { p: 'ethene', note: 'AQA accepts this route. For a primary halogenoalkane substitution competes strongly, and elimination works best for secondary ones.' },
        '1-bromopropane': { p: 'propene', note: 'AQA accepts this route. For a primary halogenoalkane substitution competes strongly, and elimination works best for secondary ones.' },
        '2-bromopropane': { p: ['propene', '~propan-2-ol'], note: 'Substitution and elimination compete. In ethanolic hydroxide elimination is the major route and some propan-2-ol also forms.' }
      } },
    { id: 'subst-cn', use: [['kcn', 'eth']], groups: ['halo'], level: 'alevel', type: 'Nucleophilic substitution', spec: '3.3.3.1', dC: 1,
      mech: mech('ns', true, 'ns-cyanide', ['bromoethane|kcn'], 'The cyanide ion, CN⁻, is the nucleophile: it attacks the δ+ carbon with the lone pair on carbon.', 'Single step, with the C–X bond breaking as the new C–C bond forms'),
      explain: 'Heated under reflux with potassium cyanide in aqueous ethanol, the cyanide ion substitutes for the halogen. This forms a new C–C bond, so the carbon chain is one carbon longer.',
      eq: '{s} + KCN -> {p} + K{X}', hazard: KCN_HAZARD,
      wrong: { 'kcn/acid': 'For a halogenoalkane, potassium cyanide must be heated under reflux in ethanol. Adding dilute acid belongs to the reaction of KCN with an aldehyde or ketone.' },
      edges: { chloroethane: 'propanenitrile', bromoethane: 'propanenitrile', '1-bromopropane': 'butanenitrile', '2-bromopropane': 'methylpropanenitrile' } },
    { id: 'subst-nh3', use: [['nh3', 'excess']], groups: ['halo'], level: 'alevel', type: 'Nucleophilic substitution', spec: '3.3.3.1 · 3.3.11.1',
      mech: mech('ns', true, 'ns-ammonia', ['bromoethane|nh3'], 'Ammonia is the nucleophile: its lone pair on nitrogen attacks the δ+ carbon.', 'A protonated amine, then a second NH₃ removes H⁺ to give the amine'),
      explain: 'Heated with excess ammonia dissolved in ethanol in a sealed tube, ammonia acts as a nucleophile and replaces the halogen, giving a primary amine. A second molecule of ammonia removes H⁺ to give the amine and an ammonium halide.',
      eq: '{s} + 2NH3 -> {p} + NH4{X}',
      wrong: { 'nh3/conc': 'Concentrated aqueous ammonia at room temperature is too slow, and water competes. AQA’s conditions are excess ammonia in ethanol, heated in a sealed tube.' },
      edges: { chloroethane: 'ethylamine', bromoethane: 'ethylamine', '1-bromopropane': 'propylamine', '2-bromopropane': 'isopropylamine' } },
    { id: 'subst-nh3-lim', use: [['nh3', 'limited']], groups: ['halo'], level: 'alevel', type: 'Nucleophilic substitution', spec: '3.3.11.3',
      explain: 'With only a limited amount of ammonia, the primary amine that forms is itself a nucleophile and competes with ammonia for the remaining halogenoalkane.',
      edges: (function () {
        var e = { status: 'mixture', why: 'With a limited amount of ammonia the amine formed is itself a nucleophile, so it reacts again. Secondary and tertiary amines and a quaternary ammonium salt also form. Excess ammonia is needed to make the primary amine. A route cannot continue from a mixture.', mixture: ['primary amine', 'secondary and tertiary amines', 'quaternary ammonium salt'] };
        return { chloroethane: e, bromoethane: e, '1-bromopropane': e, '2-bromopropane': e };
      })() },
    { id: 'subst-amine', use: [['etnh2', 'excess']], groups: ['halo'], level: 'alevel', type: 'Nucleophilic substitution', spec: '3.3.11.3',
      mech: mech('ns', true, 'ns-ammonia', [], 'Ethylamine is the nucleophile: its lone pair on nitrogen attacks the δ+ carbon.', 'A protonated secondary amine, then H⁺ is removed'),
      explain: 'A primary amine is a nucleophile too. It attacks the halogenoalkane and, because the amine is in excess, excess amine makes further substitution of the secondary amine less likely.',
      eq: '{s} + {pt} -> {p} + H{X}',
      wrong: { 'etnh2/rt': 'A halogenoalkane reacts with an amine only when heated, with the amine in excess, in a sealed tube.' },
      edges: { chloroethane: 'diethylamine', bromoethane: 'diethylamine', '1-bromopropane': 'ethylpropylamine', '2-bromopropane': 'ethylisopropylamine' } },

    { id: 'ox-distil', use: [['oxid', 'distil']], groups: ['alcohol1', 'alcohol2'], level: 'alevel', type: 'Oxidation', spec: '3.3.5.2',
      explain: {
        alcohol1: 'Warming a primary alcohol with acidified potassium dichromate(VI) oxidises it to an aldehyde. The aldehyde boils at a lower temperature than the alcohol (there is no hydrogen bonding between aldehyde molecules), so it is distilled off as soon as it forms, before it can be oxidised further to the carboxylic acid.',
        alcohol2: 'A secondary alcohol is oxidised to a ketone. A ketone is not oxidised further by dichromate, so distilling it off or heating under reflux gives the same product.'
      },
      eq: '{s} + [O] -> {p} + H2O', observe: 'The orange dichromate(VI) ions turn green as they are reduced to chromium(III).',
      edges: { ethanol: 'ethanal', 'propan-1-ol': 'propanal', 'propan-2-ol': 'propanone', 'butan-2-ol': 'butanone', phenylethanol: 'phenylethanone' } },
    { id: 'ox-reflux', use: [['oxid', 'reflux'], ['oxid', 'warm']], groups: ['alcohol1', 'alcohol2', 'aldehyde'], level: 'gcse', type: 'Oxidation', spec: '4.7.2.3 · 3.3.5.2 · 3.3.8',
      explain: {
        alcohol1: 'Heating under reflux with excess acidified potassium dichromate(VI) oxidises a primary alcohol all the way to the carboxylic acid, through the aldehyde. The condenser returns any vapour to the flask so nothing escapes before it is fully oxidised.',
        alcohol2: 'A secondary alcohol is oxidised to a ketone. A ketone is not oxidised further by dichromate, so the reaction stops there.',
        aldehyde: 'An aldehyde is easily oxidised to the carboxylic acid. Heating under reflux with excess oxidising agent keeps it in the flask until it has reacted.'
      },
      explainG: 'An oxidising agent such as acidified potassium dichromate oxidises an alcohol to a carboxylic acid. The orange solution turns green.',
      eq: { alcohol1: '{s} + 2[O] -> {p} + H2O', alcohol2: '{s} + [O] -> {p} + H2O', aldehyde: '{s} + [O] -> {p}' },
      eqG: '{sn} + oxidising agent → {pn} + water', observe: 'The orange dichromate(VI) ions turn green as they are reduced to chromium(III).',
      wrong: { 'oxid/distil': 'An aldehyde has a low boiling point, so distilling it off would remove it from the oxidising agent. To oxidise an aldehyde you must heat under reflux with excess oxidising agent.' },
      edges: {
        ethanol: 'ethanoic-acid', 'propan-1-ol': 'propanoic-acid',
        'propan-2-ol': { p: 'propanone', a: true }, 'butan-2-ol': { p: 'butanone', a: true }, phenylethanol: { p: 'phenylethanone', a: true },
        ethanal: { p: 'ethanoic-acid', a: true }, propanal: { p: 'propanoic-acid', a: true }
      } },
    { id: 'dehydrate', use: [['h2so4', 'hot'], ['h3po4', 'hot']], groups: ['alcohol1', 'alcohol2', 'alcohol3'], level: 'alevel', type: 'Elimination (dehydration)', spec: '3.3.5.3',
      mech: mech('el', true, 'elim-dehydration', ['propan-2-ol|h2so4'], 'The acid catalyst protonates the OH group (H⁺ is an electrophile), then water leaves.', 'Carbocation, then H⁺ is lost to form the C=C bond'),
      explain: 'Heated with a concentrated acid catalyst (sulfuric or phosphoric acid), an alcohol loses a molecule of water, a dehydration. A C=C bond forms, so the alcohol becomes an alkene.',
      eq: '{s} -> {p} + H2O',
      wrong: { 'h2so4/coldwater': 'Dehydration of an alcohol needs the concentrated acid to be heated (to about 170 °C). Cold sulfuric acid followed by water is the method for adding water to an alkene.' },
      edges: {
        ethanol: 'ethene', 'propan-1-ol': 'propene', 'propan-2-ol': 'propene',
        'butan-2-ol': { p: ['=but-1-ene', '=e-but-2-ene', '=z-but-2-ene'], note: 'Three alkenes can form, because the double bond can go either side of the carbon with the OH. but-2-ene has E and Z isomers (stereoisomers). AQA credits any of them, so all three are shown as equal products (in practice but-2-ene is the main product).' },
        'methylpropan-2-ol': 'methylpropene', phenylethanol: 'phenylethene'
      } },
    { id: 'esterify-alc', use: [['est-ethanoic', 'warm']], groups: ['alcohol1', 'alcohol2', 'alcohol3'], level: 'gcse', type: 'Esterification', spec: '4.7.2.4 · 3.3.9.1',
      explain: 'An alcohol and a carboxylic acid, warmed with a few drops of concentrated sulfuric acid as a catalyst, form an ester and water. The reaction is reversible, so the yield is not 100%. Esters have a sweet, fruity smell.',
      explainG: 'A carboxylic acid reacts with an alcohol, with a few drops of concentrated sulfuric acid as a catalyst, to make an ester and water. Esters smell sweet and fruity. Ethanoic acid and ethanol make ethyl ethanoate.',
      eq: '{pt} + {s} <=> {p} + H2O', reversible: true, observe: 'A sweet, fruity smell.',
      wrong: { 'est-ethanoic/nocat': 'Without the concentrated sulfuric acid catalyst the reaction is far too slow to be useful.' },
      edges: {
        ethanol: 'ethyl-ethanoate',
        'propan-1-ol': { p: 'propyl-ethanoate', a: true }, 'propan-2-ol': { p: 'isopropyl-ethanoate', a: true },
        'butan-2-ol': { p: 'butan-2-yl-ethanoate', a: true }, phenylethanol: { p: 'phenylethyl-ethanoate', a: true },
        'methylpropan-2-ol': { status: 'beyond', why: 'Tertiary alcohols esterify poorly with a carboxylic acid and acid catalyst, and the real reaction is not modelled here. Ethanoyl chloride is the reagent to use.' }
      } },
    { id: 'esterify-acid', use: [['est-ethanol', 'warm'], ['est-methanol', 'warm']], groups: ['acid'], level: 'gcse', type: 'Esterification', spec: '4.7.2.4 · 3.3.9.1',
      explain: 'A carboxylic acid and an alcohol, warmed with a few drops of concentrated sulfuric acid as a catalyst, form an ester and water. The reaction is reversible, so the yield is not 100%.',
      explainG: 'A carboxylic acid reacts with an alcohol, with a few drops of concentrated sulfuric acid as a catalyst, to make an ester and water. Ethanoic acid and ethanol make ethyl ethanoate.',
      eq: '{s} + {pt} <=> {p} + H2O', reversible: true, observe: 'A sweet, fruity smell.',
      wrong: { 'est-ethanol/nocat': 'Without the concentrated sulfuric acid catalyst the reaction is far too slow to be useful.', 'est-methanol/nocat': 'Without the concentrated sulfuric acid catalyst the reaction is far too slow to be useful.' },
      edges: {
        'ethanoic-acid': { by: { 'est-ethanol': 'ethyl-ethanoate', 'est-methanol': 'methyl-ethanoate' } },
        'propanoic-acid': { by: { 'est-ethanol': 'ethyl-propanoate', 'est-methanol': 'methyl-propanoate' }, a: true }
      } },
    { id: 'acyl-alc', use: [['acylcl', 'rt'], ['acylcl', 'alcl3']], groups: ['alcohol1', 'alcohol2', 'alcohol3'], level: 'alevel', type: 'Nucleophilic addition–elimination', spec: '3.3.9.2',
      mech: mech('ae', true, 'ae-methanol', [], 'The alcohol’s oxygen lone pair is the nucleophile, attacking the δ+ carbon of the C=O in the acyl chloride.', 'Tetrahedral intermediate, which loses Cl⁻ and H⁺ (as HCl)'),
      explain: 'Ethanoyl chloride reacts with an alcohol at room temperature to make an ester. The carbonyl carbon is attached to two electronegative atoms (O and Cl), so it is very δ+ and the reaction is fast, goes to completion and is not reversible, unlike esterification with a carboxylic acid.',
      eq: '{pt} + {s} -> {p} + HCl', observe: 'Steamy fumes of hydrogen chloride.',
      noteFor: { 'acylcl/alcl3': 'AlCl₃ is not needed here: it is the catalyst for the Friedel–Crafts reaction with benzene. The ester still forms.' },
      edges: ESTERS_FROM_ALCOHOL },
    { id: 'anhyd-alc', use: [['anhyd', 'warm']], groups: ['alcohol1', 'alcohol2', 'alcohol3'], level: 'alevel', type: 'Nucleophilic addition–elimination', spec: '3.3.9.2',
      mech: mech('ae', false, 'ae-methanol', [], 'The alcohol’s oxygen lone pair is the nucleophile, attacking the δ+ carbon of a C=O.', 'Tetrahedral intermediate, which loses ethanoate (CH₃COO⁻)'),
      explain: 'Ethanoic anhydride reacts with an alcohol when warmed, giving an ester and ethanoic acid. It is less reactive than ethanoyl chloride but cheaper and safer to handle, with no HCl formed.',
      eq: '{pt} + {s} -> {p} + CH3COOH',
      edges: ESTERS_FROM_ALCOHOL },

    { id: 'nabh4-red', use: [['nabh4', 'aq']], groups: ['aldehyde', 'ketone'], level: 'alevel', type: 'Nucleophilic addition (reduction)', spec: '3.3.8',
      mech: mech('na', true, 'na-ethanal-nabh4', ['ethanal|nabh4'], 'The hydride ion, H⁻ (from NaBH₄), is the nucleophile: it attacks the δ+ carbon of the C=O.', 'Alkoxide ion, which is protonated by water'),
      explain: 'NaBH₄ in aqueous solution is a reducing agent that supplies hydride ions, H⁻. The hydride attacks the δ+ carbon of the C=O, and the oxygen is then protonated by water. An aldehyde becomes a primary alcohol and a ketone becomes a secondary alcohol.',
      eq: '{s} + 2[H] -> {p}', edges: CARBONYL_RED },
    { id: 'lialh4-carbonyl', use: [['lialh4', 'ether']], groups: ['aldehyde', 'ketone'], level: 'alevel', type: 'Nucleophilic addition (reduction)', spec: '3.3.8',
      mech: mech('na', false, 'na-ethanal-nabh4', [], 'The hydride ion, H⁻ (from LiAlH₄), is the nucleophile: it attacks the δ+ carbon of the C=O.', 'Alkoxide ion, which is protonated by the dilute acid'),
      explain: 'LiAlH₄ in dry ether also reduces aldehydes and ketones. AQA uses NaBH₄ for this. LiAlH₄ works too, but it reacts violently with water, so it needs dry ether and a careful dilute-acid work-up.',
      eq: '{s} + 2[H] -> {p}', edges: CARBONYL_RED },
    { id: 'hcn-add', use: [['kcn', 'acid']], groups: ['aldehyde', 'ketone'], level: 'alevel', type: 'Nucleophilic addition', spec: '3.3.8', dC: 1,
      mech: mech('na', true, 'na-propanone-kcn', ['propanone|kcn'], 'The cyanide ion, CN⁻, is the nucleophile: it attacks the δ+ carbon of the C=O.', 'Alkoxide ion, which is protonated by H⁺ from the dilute acid'),
      explain: 'Potassium cyanide followed by dilute acid adds HCN across the C=O. The cyanide ion attacks the δ+ carbon, forming a new C–C bond, and the oxygen is then protonated. The product is a hydroxynitrile with one more carbon.',
      eq: '{s} + HCN -> {p}', hazard: KCN_HAZARD,
      wrong: { 'kcn/eth': 'AQA’s conditions for the reaction with a carbonyl are potassium cyanide, then dilute acid. The acid supplies the H⁺ that protonates the O⁻ in the intermediate.' },
      edges: {
        ethanal: { p: 'hn-ethanal', racemic: true }, propanal: { p: 'hn-propanal', racemic: true }, propanone: 'hn-propanone',
        butanone: { p: 'hn-butanone', racemic: true }, phenylethanone: { p: 'hn-phenylethanone', racemic: true }
      } },

    { id: 'neutralise', use: [['naoh', 'aq'], ['naoh', 'eth']], groups: ['acid'], level: 'alevel', type: 'Acid–base (neutralisation)', spec: '3.3.9.1',
      explain: 'A carboxylic acid is a weak acid that is neutralised by sodium hydroxide to form the sodium salt of the acid and water.',
      eq: '{s} + NaOH -> {p} + H2O', edges: { 'ethanoic-acid': 'sodium-ethanoate', 'propanoic-acid': 'sodium-propanoate' } },
    { id: 'salt-acid', use: [['dilacid', 'rt'], ['dilacid', 'reflux']], groups: ['salt'], level: 'alevel', type: 'Acid–base', spec: '3.3.9.1',
      explain: 'The carboxylate ion is the conjugate base of a weak acid, so a strong acid protonates it and the carboxylic acid is released again.',
      eq: '{s} + HCl -> {p} + NaCl', edges: { 'sodium-ethanoate': 'ethanoic-acid', 'sodium-propanoate': 'propanoic-acid' } },
    { id: 'hyd-alk', use: [['naoh', 'aq']], groups: ['ester'], level: 'alevel', type: 'Hydrolysis (alkaline)', spec: '3.3.9.1',
      explain: 'Heated with aqueous sodium hydroxide the ester is hydrolysed to the sodium salt of the carboxylic acid and an alcohol. The reaction goes to completion, because the carboxylate salt cannot react with the alcohol to re-form the ester.',
      eq: '{s} + NaOH -> {p} + {q}',
      wrong: { 'naoh/eth': 'Hydrolysis of an ester needs aqueous sodium hydroxide, because water is a reactant. Ethanolic hydroxide is the reagent for eliminating HX from a halogenoalkane.' },
      edges: HYDROLYSIS_ALK },
    { id: 'hyd-acid', use: [['dilacid', 'reflux']], groups: ['ester'], level: 'alevel', type: 'Hydrolysis (acid)', spec: '3.3.9.1',
      explain: 'Heated under reflux with a dilute acid catalyst, the ester is hydrolysed to a carboxylic acid and an alcohol. This is the reverse of esterification, so the reaction is reversible and does not go to completion.',
      eq: '{s} + H2O <=> {p} + {q}', reversible: true,
      wrong: { 'dilacid/rt': 'Acid hydrolysis of an ester is slow, so it needs heating under reflux with the dilute acid catalyst.' },
      edges: HYDROLYSIS_ACID },

    { id: 'acyl-water', use: [['water', 'rt']], groups: ['acylCl', 'anhydride'], level: 'alevel', type: 'Nucleophilic addition–elimination', spec: '3.3.9.2',
      mech: mech('ae', true, 'ae-water', ['ethanoyl-chloride|water'], 'Water is the nucleophile: the oxygen lone pair attacks the δ+ carbon of the C=O.', 'Tetrahedral intermediate, which loses Cl⁻ and H⁺ (as HCl)', {}),
      explain: 'Acyl chlorides and acid anhydrides react with water at room temperature to give the carboxylic acid. The reaction is vigorous with an acyl chloride, which fumes in moist air as HCl forms; an anhydride reacts more slowly.',
      eq: '{s} + H2O -> {p} + {w}', observe: 'Steamy fumes of hydrogen chloride (acyl chloride).',
      edges: {
        'ethanoyl-chloride': { p: 'ethanoic-acid', w: 'HCl' }, 'propanoyl-chloride': { p: 'propanoic-acid', w: 'HCl' },
        'ethanoic-anhydride': { p: 'ethanoic-acid', w: 'CH3COOH', mechOutline: false }
      } },
    { id: 'acyl-nh3', use: [['nh3', 'excess'], ['nh3', 'limited'], ['nh3', 'conc']], groups: ['acylCl', 'anhydride'], level: 'alevel', type: 'Nucleophilic addition–elimination', spec: '3.3.9.2',
      mech: mech('ae', true, 'ae-ammonia', ['ethanoyl-chloride|nh3'], 'Ammonia is the nucleophile: the nitrogen lone pair attacks the δ+ carbon of the C=O.', 'Tetrahedral intermediate, which loses Cl⁻ and H⁺'),
      explain: 'Acyl chlorides and acid anhydrides react with ammonia to give an amide. The reaction with an acyl chloride is vigorous.',
      eq: '{s} + NH3 -> {p} + {w}', note: 'The 1:1 equation is usually accepted. In practice excess ammonia (or amine) is used to take up the HCl, forming NH₄Cl.',
      edges: {
        'ethanoyl-chloride': { p: 'ethanamide', w: 'HCl' }, 'propanoyl-chloride': { p: 'propanamide', w: 'HCl' },
        'ethanoic-anhydride': { p: 'ethanamide', w: 'CH3COOH', mechOutline: false }
      } },
    { id: 'acyl-amine', use: [['etnh2', 'excess'], ['etnh2', 'rt']], groups: ['acylCl', 'anhydride'], level: 'alevel', type: 'Nucleophilic addition–elimination', spec: '3.3.9.2',
      mech: mech('ae', true, 'ae-methylamine', [], 'The amine is the nucleophile: the nitrogen lone pair attacks the δ+ carbon of the C=O.', 'Tetrahedral intermediate, which loses Cl⁻ and H⁺'),
      explain: 'Acyl chlorides and acid anhydrides react with a primary amine at room temperature to give an N-substituted amide.',
      eq: '{s} + {pt} -> {p} + {w}', note: 'The 1:1 equation is usually accepted. In practice excess amine is used to take up the HCl.',
      edges: {
        'ethanoyl-chloride': { p: 'n-ethylethanamide', w: 'HCl' }, 'propanoyl-chloride': { p: 'n-ethylpropanamide', w: 'HCl' },
        'ethanoic-anhydride': { p: 'n-ethylethanamide', w: 'CH3COOH', mechOutline: false }
      } },

    { id: 'nitrile-red', use: [['lialh4', 'ether'], ['h2', 'heat']], groups: ['nitrile'], level: 'alevel', type: 'Reduction', spec: '3.3.11.1',
      explain: 'The C≡N group of a nitrile is reduced to CH₂NH₂, giving a primary amine, using LiAlH₄ in dry ether or hydrogen with a nickel catalyst. The carbon count is unchanged.',
      eq: '{s} + 4[H] -> {p}', note: 'AQA does not name a reducing agent for this step, so either reagent is credited. Nitrile then amine is the standard way to lengthen a chain by one carbon and then form an amine.',
      wrong: { 'h2/rt': 'Hydrogen reduces the nitrile only when heated with a nickel catalyst.' },
      edges: { propanenitrile: 'propylamine', butanenitrile: 'butylamine', methylpropanenitrile: 'methylpropylamine' } },
    { id: 'nitrile-hyd', use: [['dilacid', 'reflux']], groups: ['nitrile'], level: 'enrich', type: 'Hydrolysis', spec: 'Beyond AQA',
      explain: 'Heating a nitrile under reflux with dilute acid hydrolyses it to the carboxylic acid (and an ammonium salt). Real chemistry, but not on the AQA specification.',
      eq: '{s} + 2H2O + HCl -> {p} + NH4Cl',
      edges: { propanenitrile: 'propanoic-acid', butanenitrile: 'butanoic-acid', methylpropanenitrile: 'methylpropanoic-acid' } },
    { id: 'amine-acyl', use: [['acylcl', 'rt'], ['acylcl', 'alcl3'], ['anhyd', 'warm']], groups: ['amine1', 'arylamine'], level: 'alevel', type: 'Nucleophilic addition–elimination', spec: '3.3.9.2 · 3.3.11.3',
      mech: mech('ae', true, 'ae-methylamine', ['ethylamine|acylcl'], 'The amine is the nucleophile: the nitrogen lone pair attacks the δ+ carbon of the C=O.', 'Tetrahedral intermediate, which loses Cl⁻ and H⁺', {}),
      explain: 'A primary amine reacts with ethanoyl chloride (or ethanoic anhydride) at room temperature to give an N-substituted amide. The nitrogen lone pair attacks the δ+ carbonyl carbon.',
      eq: { 'card:acylcl': '{pt} + {s} -> {p} + HCl', 'card:anhyd': '{pt} + {s} -> {p} + CH3COOH' },
      note: 'The 1:1 equation is usually accepted. In practice excess amine is used to take up the HCl.',
      noteFor: { 'acylcl/alcl3': 'AlCl₃ is not needed here, and it ties up the amine’s lone pair: it is the catalyst for the Friedel–Crafts reaction with benzene. Use ethanoyl chloride at room temperature.' },
      edges: {
        ethylamine: 'n-ethylethanamide', propylamine: 'n-propylethanamide', isopropylamine: 'n-isopropylethanamide', butylamine: 'n-butylethanamide',
        methylpropylamine: 'n-methylpropylethanamide', phenylamine: 'n-phenylethanamide'
      } },

    { id: 'nitration', use: [['nitrating', 'cool']], groups: ['benzene'], level: 'alevel', type: 'Electrophilic substitution', spec: '3.3.10.2',
      mech: mech('es', true, 'es-nitration', ['benzene|nitrating'], 'The nitronium ion, NO₂⁺, is the electrophile. It is made from the two acids: HNO₃ + 2H₂SO₄ → NO₂⁺ + 2HSO₄⁻ + H₃O⁺.', 'Positively charged intermediate in which the delocalisation is partly lost; H⁺ is then lost to restore the ring'),
      explain: 'Benzene reacts with a mixture of concentrated nitric and sulfuric acids, kept below 55 °C, to give nitrobenzene. The sulfuric acid is a catalyst: it helps make the electrophile NO₂⁺, and it is regenerated.',
      eq: '{s} + HNO3 -> {p} + H2O', note: 'Keeping the temperature below 55 °C prevents a second nitro group going on (AQA keeps to monosubstitution).',
      edges: { benzene: 'nitrobenzene' } },
    { id: 'nitration-hot', use: [['nitrating', 'hot']], groups: ['benzene'], level: 'alevel', type: 'Electrophilic substitution', spec: '3.3.10.2',
      explain: 'Above 55 °C a second nitro group can substitute onto the ring.',
      edges: { benzene: { status: 'mixture', why: 'Above 55 °C more than one nitro group goes onto the ring, so you get a mixture containing dinitrobenzene. AQA keeps to monosubstitution, so keep the temperature below 55 °C. A route cannot continue from a mixture.', mixture: ['nitrobenzene', 'dinitrobenzene'] } } },
    { id: 'fc-acyl', use: [['acylcl', 'alcl3']], groups: ['benzene'], level: 'alevel', type: 'Electrophilic substitution', spec: '3.3.10.2',
      mech: mech('es', true, 'es-acylation', ['benzene|acylcl'], 'The acylium ion, CH₃CO⁺, is the electrophile. AlCl₃ takes Cl⁻ from the acyl chloride to make it.', 'Positively charged intermediate in which the delocalisation is partly lost; H⁺ is then lost and AlCl₃ is regenerated'),
      explain: 'Benzene reacts with ethanoyl chloride in the presence of an AlCl₃ catalyst (dry, heated under reflux) to give phenylethanone. This is a Friedel–Crafts acylation. A new C–C bond forms to the ring.',
      eq: '{pt} + {s} -> {p} + HCl',
      wrong: { 'acylcl/rt': 'Benzene is too stable to react with ethanoyl chloride on its own. It needs the AlCl₃ catalyst to make the acylium ion, CH₃CO⁺, which is a strong enough electrophile.' },
      edges: { benzene: 'phenylethanone' } },
    { id: 'nitro-red', use: [['snhcl', 'reflux']], groups: ['nitro'], level: 'alevel', type: 'Reduction', spec: '3.3.11.1',
      explain: 'Nitrobenzene is reduced to phenylamine by heating under reflux with tin and concentrated hydrochloric acid. The product at this stage is the phenylammonium salt, so sodium hydroxide is added to release the free amine.',
      eq: '{s} + 6[H] -> {p} + 2H2O', edges: { nitrobenzene: 'phenylamine' } },
    { id: 'ferment', use: [['yeast', 'anaerobic']], groups: ['sugar'], level: 'gcse', type: 'Fermentation', spec: '4.7.2.3 · 3.3.5.1',
      explain: 'Yeast contains enzymes that convert glucose into ethanol and carbon dioxide. It needs a warm temperature (about 30–35 °C) and no air.',
      explainG: 'Yeast contains enzymes that turn the sugar glucose into ethanol and carbon dioxide. It works best at about 30–35 °C and with no air.',
      eq: '{s} -> 2C2H5OH + 2CO2', observe: 'Bubbles of carbon dioxide gas.',
      wrong: {
        'yeast/hot': 'At about 70 °C the yeast’s enzymes are denatured, so fermentation stops.',
        'yeast/air': 'With air present the ethanol is oxidised further (to ethanoic acid), and the yeast respires aerobically instead. Fermentation needs anaerobic conditions.'
      },
      edges: { glucose: 'ethanol' } },

    /* Enrichment: real chemistry that is not on either AQA specification. */
    { id: 'bromo-from-alcohol', use: [['nabr', 'reflux']], groups: ['alcohol1', 'alcohol2', 'alcohol3'], level: 'enrich', type: 'Nucleophilic substitution', spec: 'Beyond AQA',
      explain: 'Heating an alcohol under reflux with sodium bromide and concentrated sulfuric acid forms hydrogen bromide in situ, which replaces the OH with Br. Real chemistry, but not on the AQA specification.',
      eq: '{s} + NaBr + H2SO4 -> {p} + NaHSO4 + H2O',
      edges: {
        ethanol: 'bromoethane', 'propan-1-ol': '1-bromopropane', 'propan-2-ol': '2-bromopropane',
        'butan-2-ol': { status: 'beyond', why: 'This works in real life but the tool does not model it for this alcohol.' },
        'methylpropan-2-ol': { status: 'beyond', why: 'This works in real life but the tool does not model it for this alcohol.' },
        phenylethanol: { status: 'beyond', why: 'This works in real life but the tool does not model it for this alcohol.' }
      } },
    { id: 'acylcl-from-acid', use: [['socl2', 'rt']], groups: ['acid'], level: 'enrich', type: 'Nucleophilic substitution', spec: 'Beyond AQA',
      explain: 'Thionyl chloride, SOCl₂, replaces the OH of a carboxylic acid with Cl, giving the acyl chloride with SO₂ and HCl as gaseous by-products. Real chemistry, but not on the AQA specification.',
      eq: '{s} + SOCl2 -> {p} + SO2 + HCl',
      edges: { 'ethanoic-acid': 'ethanoyl-chloride', 'propanoic-acid': 'propanoyl-chloride' } }
  ];

  /* ---------- Test cards: what you would see ---------- */
  function ob(t, change, status) { return { t: t, change: change !== false, status: status }; }
  var NOCHANGE = function (what) { return ob(what, false); };
  var OBS = {
    brw: {
      alkene: ob('The orange bromine water is decolourised (orange → colourless), because the bromine adds across the C=C bond. This is the test for an alkene.'),
      arylring: NOCHANGE('The bromine water stays orange. The delocalised ring is too stable for bromine to add (3.3.10.1).'),
      aldehyde: ob('', true, 'beyond'), arylamine: ob('', true, 'beyond'),
      '*': NOCHANGE('The bromine water stays orange: there is no C=C to add to, so there is no reaction.')
    },
    na: {
      alcohol1: ob('Sodium fizzes steadily and dissolves; hydrogen gas is given off, leaving the sodium alkoxide.'),
      alcohol2: ob('Sodium fizzes and dissolves, more slowly; hydrogen gas is given off, leaving the sodium alkoxide.'),
      alcohol3: ob('Sodium fizzes only slowly; hydrogen gas is given off, leaving the sodium alkoxide.'),
      acid: ob('Sodium fizzes vigorously; hydrogen gas is given off, leaving the sodium salt of the carboxylic acid.'),
      acylCl: ob('', true, 'beyond'), anhydride: ob('', true, 'beyond'), sugar: ob('', true, 'beyond'),
      '*': NOCHANGE('Nothing happens: there is no O–H group for sodium to react with.')
    },
    na2co3: {
      acid: ob('Effervescence: carbon dioxide gas is given off (it turns limewater cloudy). Carboxylic acids react with carbonates; alcohols do not.'),
      acylCl: ob('', true, 'beyond'), anhydride: ob('', true, 'beyond'),
      '*': NOCHANGE('No effervescence: nothing reacts with the carbonate.')
    },
    tollens: {
      aldehyde: ob('A silver mirror forms on the inside of the test tube. The aldehyde is oxidised and the silver ions are reduced to silver.'),
      ketone: NOCHANGE('No change. A ketone is not oxidised, so there is no silver mirror.'),
      sugar: ob('', true, 'beyond'),
      '*': NOCHANGE('No change: only aldehydes give a silver mirror.')
    },
    fehling: {
      aldehyde: ob('The blue solution forms a brick-red precipitate of copper(I) oxide. The aldehyde is oxidised.'),
      ketone: NOCHANGE('No change: the solution stays blue. A ketone is not oxidised.'),
      sugar: ob('', true, 'beyond'),
      '*': NOCHANGE('No change: the solution stays blue. Only aldehydes give the brick-red precipitate.')
    },
    water: {
      alcohol1: ob('A small alcohol mixes completely with water (it is miscible) to give a neutral solution. There is no reaction.'),
      alcohol2: ob('Smaller alcohols mix with water, larger ones such as butan-2-ol are only partly soluble; the solution is neutral. There is no reaction.'),
      alcohol3: ob('The alcohol dissolves in or mixes with water to a limited extent, forming a neutral solution. There is no reaction.'),
      acid: ob('The carboxylic acid dissolves, forming a weakly acidic solution (the acid partly ionises).'),
      sugar: ob('The glucose dissolves in water to make a solution, with no reaction.'),
      amine1: ob('A small amine dissolves to give an alkaline solution. Amines are weak bases: the lone pair on nitrogen accepts H⁺ from water (RNH₂ + H₂O ⇌ RNH₃⁺ + OH⁻), and only a small fraction reacts (3.3.11.2).'),
      amine2: ob('The amine dissolves to give an alkaline solution. Amines are weak bases: the lone pair on nitrogen accepts H⁺ from water, and only a small fraction reacts (3.3.11.2).'),
      arylamine: ob('Phenylamine is only slightly soluble and is a much weaker base than ammonia: the nitrogen lone pair is partly delocalised into the ring, so it accepts H⁺ less readily and the solution is barely alkaline (3.3.11.2).'),
      halo: ob('Water hydrolyses a halogenoalkane only very slowly, because water is a much weaker nucleophile than OH⁻. The rate is fastest for C–I and slowest for C–Cl, following the carbon–halogen bond enthalpy (3.3.3.1). To make the alcohol, use warm aqueous sodium hydroxide.'),
      '*': NOCHANGE('No reaction: water reacts with acyl chlorides and acid anhydrides in this tool, but not with this molecule.')
    }
  };

  /* ---------- Real but unmodelled, and clear non-reactions ---------- */
  function nb(why) { return { status: 'beyond', why: why }; }
  function nn(why) { return { status: 'none', why: why }; }
  var ALCOHOLS = ['alcohol1', 'alcohol2', 'alcohol3'];
  var AMINES = ['amine1', 'amine2', 'arylamine'];
  var ACYL = ['acylCl', 'anhydride'];
  var AMINE_SALT = nb('An amine is a weak base, so a strong acid protonates it to give an ammonium salt (3.3.11.2). The tool does not model that.');
  var SALT_ACID = nb('A strong acid protonates the carboxylate ion and releases the carboxylic acid. The tool models this with dilute hydrochloric acid.');
  var ACYL_HYD = nb('The water here hydrolyses an acyl chloride or acid anhydride to the carboxylic acid. The tool models that with the water card.');
  var SUGAR_BEYOND = nb('Glucose does react here (its open-chain form has an aldehyde group and it has several OH groups), but this tool does not model it.');
  var CARBONYL_N = nb('Ammonia and amines do react with aldehydes and ketones (to form imines), but that is beyond A-level and the tool does not model it.');
  function spread(groups, v) { var o = {}; groups.forEach(function (g) { o[g] = v; }); return o; }
  function merge() { var o = {}; for (var i = 0; i < arguments.length; i++) for (var k in arguments[i]) o[k] = arguments[i][k]; return o; }
  var NO = {
    hbr: merge(spread(ALCOHOLS, nb('Hydrogen bromide does react with alcohols to make bromoalkanes, but that reaction is not on the AQA specification and this tool does not model it.')),
      spread(AMINES, AMINE_SALT), { salt: SALT_ACID, alkane: nn('Alkanes are saturated: there is no C=C for HBr to add to.') }),
    h2so4: merge(spread(AMINES, AMINE_SALT), spread(ACYL, ACYL_HYD), { salt: SALT_ACID, sugar: nb('Concentrated sulfuric acid removes water from glucose and chars it to carbon. The tool does not model that.') }),
    h3po4: merge(spread(AMINES, AMINE_SALT), { salt: SALT_ACID, alkene: nb('Phosphoric acid is the catalyst for adding steam to an alkene. Use the steam card, which includes the catalyst.') }),
    steam: spread(ACYL, ACYL_HYD),
    naoh: merge(spread(ALCOHOLS, nn('Alcohols are not acidic enough to react with sodium hydroxide, so there is no reaction.')),
      { alkene: nn('Hydroxide does not attack the electron-rich C=C bond, so there is no reaction.'), alkane: nn('Alkanes have no polar bond for hydroxide to attack, so there is no reaction.'), benzene: nn('Hydroxide does not attack the electron-rich benzene ring, so there is no reaction.'),
        nitrile: nb('Nitriles can be hydrolysed by hot aqueous alkali, but this tool does not model that.'), amide: nb('Amides can be hydrolysed by hot aqueous alkali, but this tool does not model that.'),
        acylCl: nb('Acyl chlorides react vigorously with hydroxide, but this tool does not model that.'), anhydride: nb('Anhydrides react with hydroxide, but this tool does not model that.'),
        aldehyde: nb('Aldehydes can undergo further reactions with alkali (such as aldol reactions) that are beyond A-level.'), ketone: nb('Ketones can undergo further reactions with alkali (such as aldol reactions) that are beyond A-level.'),
        sugar: nb('Glucose reacts with hot alkali in complicated ways that this tool does not model.') }),
    oxid: { acylCl: ACYL_HYD, anhydride: ACYL_HYD, alkene: nb('Strong oxidising agents can cleave C=C bonds, but this tool does not model that.'),
      alcohol3: nn('Tertiary alcohols are not easily oxidised: the carbon with the OH has no hydrogen atom to lose. The orange dichromate stays orange.'),
      ketone: nn('Ketones are not oxidised by acidified dichromate(VI) under these conditions. The solution stays orange.'),
      arylamine: nb('Aromatic amines are easily oxidised in complicated ways that this tool does not model.'), sugar: nb('Glucose is oxidised in ways that this tool does not model.') },
    nabh4: { sugar: SUGAR_BEYOND, alkene: nn('NaBH₄ is a source of the nucleophile H⁻, which attacks a δ+ carbon such as the carbon of C=O. The electron-rich C=C of an alkene has no δ+ carbon to attack, so there is no reaction.'),
      acid: nn('NaBH₄ is not a strong enough reducing agent to reduce a carboxylic acid.'), ester: nn('NaBH₄ is not a strong enough reducing agent to reduce an ester.'),
      nitrile: nn('NaBH₄ is not a strong enough reducing agent to reduce a nitrile (C≡N).'), amide: nn('NaBH₄ is not a strong enough reducing agent to reduce an amide.'),
      acylCl: nb('NaBH₄ in water would react with an acyl chloride in ways that this tool does not model.'), anhydride: nb('NaBH₄ in water would react with an anhydride in ways that this tool does not model.') },
    lialh4: { sugar: SUGAR_BEYOND, acid: nb('LiAlH₄ reduces carboxylic acids to primary alcohols. This is real, but the tool does not model it.'), ester: nb('LiAlH₄ reduces esters to alcohols. This is real, but the tool does not model it.'),
      acylCl: nb('LiAlH₄ reduces acyl chlorides. This is real, but the tool does not model it.'), anhydride: nb('LiAlH₄ reduces anhydrides. This is real, but the tool does not model it.'),
      halo: nb('LiAlH₄ reduces halogenoalkanes to alkanes. This is real, but the tool does not model it.'), amide: nb('LiAlH₄ reduces amides to amines. This is real, but the tool does not model it.'),
      alkene: nn('LiAlH₄ does not reduce an isolated C=C bond.'), alkane: nn('There is nothing for LiAlH₄ to reduce in an alkane.') },
    h2: { sugar: SUGAR_BEYOND, benzene: nb('Benzene can be hydrogenated to cyclohexane, but only under severe conditions. The tool does not model it.'),
      aldehyde: nb('Hydrogen and a nickel catalyst can reduce a C=O group, but this tool does not model it.'), ketone: nb('Hydrogen and a nickel catalyst can reduce a C=O group, but this tool does not model it.'),
      nitro: nb('Nitro groups can be reduced by catalytic hydrogenation, but this tool uses tin and hydrochloric acid.') },
    cl2: { aldehyde: nb('Chlorine oxidises aldehydes and can substitute next to the C=O, but the tool does not model it.'), benzene: nn('Benzene does not react with chlorine without a halogen carrier: its delocalised ring is more stable than a normal C=C, so it does not undergo addition. There is no reaction.'), arylamine: nb('Aromatic amines react with halogens very readily, but this tool does not model it.') },
    br2: { aldehyde: nb('Bromine oxidises an aldehyde to the carboxylic acid (so the colour can fade), but this is not an AQA test and the tool does not model it.'), benzene: nn('Benzene does not decolourise bromine. Its delocalised ring is more stable than a normal C=C, so it does not undergo addition. There is no reaction (3.3.10.1).'), arylamine: nb('Aromatic amines react with halogens very readily, but this tool does not model it.') },
    i2: { benzene: nn('Benzene does not react with iodine. Its delocalised ring is too stable.'), arylamine: nb('Aromatic amines react with halogens very readily, but this tool does not model it.') },
    nitrating: { alkene: nb('Nitrating mixture attacks alkenes in ways that this tool does not model.'), alcohol1: nb('Alcohols are esterified by the nitrating mixture. The tool does not model that.'), alcohol2: nb('Alcohols are esterified by the nitrating mixture. The tool does not model that.'), alcohol3: nb('Alcohols are esterified by the nitrating mixture. The tool does not model that.'), arylring: nb('A benzene ring that already carries a group substitutes in a position that depends on that group. AQA keeps to monosubstitution of benzene, so this tool does not model it.') },
    kcn: { acid: nb('A carboxylic acid would release toxic hydrogen cyanide gas from cyanide. The tool does not model that: it is a reason cyanide is never mixed with acids.'), alkene: nn('Cyanide does not attack the electron-rich C=C bond, so there is no reaction.'), acylCl: nb('Acyl chlorides react with cyanide, but this tool does not model it.'), anhydride: nb('Anhydrides react with cyanide, but this tool does not model it.') },
    dilacid: merge({ amine1: nb('A dilute acid just protonates an amine to give an ammonium salt. The tool does not model that.'), amine2: nb('A dilute acid just protonates an amine to give an ammonium salt. The tool does not model that.'),
      arylamine: nb('A dilute acid just protonates an amine to give an ammonium salt. The tool does not model that.'), amide: nb('Amides are hydrolysed by hot aqueous acid, but this tool does not model it.'),
      acylCl: nb('Acyl chlorides react with the water in the acid, but this tool does not model it.'), anhydride: nb('Anhydrides react with the water in the acid, but this tool does not model it.') }),
    nh3: { aldehyde: CARBONYL_N, ketone: CARBONYL_N, acid: nb('Ammonia is a base, so it neutralises a carboxylic acid to give an ammonium salt. The tool does not model that.'), ester: nb('Ammonia slowly converts esters to amides. The tool does not model that.') },
    etnh2: { aldehyde: CARBONYL_N, ketone: CARBONYL_N, acid: nb('An amine is a base, so it neutralises a carboxylic acid to give a salt. The tool does not model that.'), ester: nb('Amines slowly convert esters to amides. The tool does not model that.') },
    acylcl: { acid: nb('An acyl chloride and a carboxylic acid can make an anhydride, but this tool does not model it.'), salt: nb('An acyl chloride and a carboxylate salt make an acid anhydride, but this tool does not model it.'), sugar: SUGAR_BEYOND },
    anhyd: { sugar: SUGAR_BEYOND },
    nabr: { alkene: nb('Sodium bromide and concentrated sulfuric acid make hydrogen bromide, which would add across the C=C. Use the hydrogen bromide card.') },
    socl2: spread(ALCOHOLS, nb('Thionyl chloride also replaces the OH of an alcohol with Cl, giving a chloroalkane, SO₂ and HCl. The tool does not model that.')),
    'est-ethanoic': merge(spread(AMINES, nb('Ethanoic acid neutralises an amine to give a salt. The tool does not model that.')),
      { acid: nn('An esterification needs an alcohol as well as the carboxylic acid. This molecule is already an acid.') }),
    'est-ethanol': merge(spread(ALCOHOLS, nn('An esterification needs a carboxylic acid as well as the alcohol. This molecule is already an alcohol.')),
      spread(ACYL, nb('The alcohol on this card does react with an acyl chloride or anhydride to make an ester (no sulfuric acid is needed). The tool models that reaction from the alcohol: start from the alcohol and use the ethanoyl chloride or ethanoic anhydride card.'))),
    'est-methanol': merge(spread(ALCOHOLS, nn('An esterification needs a carboxylic acid as well as the alcohol. This molecule is already an alcohol.')),
      spread(ACYL, nb('Methanol does react with an acyl chloride or anhydride to make an ester (no sulfuric acid is needed), but the tool models that reaction from the alcohol side only.')))
  };
  /* Profile-specific cases, checked before “wrong conditions”. */
  var NOP = {
    'cl2/dark': { alkane: nn('Alkanes are saturated, so there is no C=C to add to, and substitution needs ultraviolet light to start the radical chain. In the dark there is no reaction.') },
    'br2/dark': { alkane: nn('Alkanes are saturated, so there is no C=C to add to, and substitution needs ultraviolet light to start the radical chain. In the dark there is no reaction.') },
    'i2/dark': { alkane: nn('Alkanes are saturated, so there is no C=C to add to. In the dark there is no reaction.') },
    'cl2/uv': { benzene: nb('With UV light chlorine can add to benzene, but this tool does not model it.') },
    'br2/uv': { benzene: nb('With UV light bromine can add to benzene, but this tool does not model it.') },
    'h2so4/hot': { benzene: nb('Hot concentrated sulfuric acid sulfonates benzene (to benzenesulfonic acid). Real chemistry, but not on the AQA specification, and the tool does not model it.'), alkene: nb('Hot concentrated sulfuric acid reacts with alkenes in several ways (including forming polymers). The tool does not model it.') }
  };
  /* The condition text each card is “for”, used in the generic “no reaction” explanation. */
  var CARD_TARGETS = {
    crack: 'long alkanes', yeast: 'sugars such as glucose', h2: 'C=C bonds (and C≡N)', steam: 'C=C bonds', cl2: 'C=C bonds (and alkanes in UV light)', br2: 'C=C bonds (and alkanes in UV light)', i2: 'C=C bonds',
    oxid: 'primary and secondary alcohols and aldehydes', 'est-ethanoic': 'alcohols', 'est-ethanol': 'carboxylic acids', 'est-methanol': 'carboxylic acids', water: 'acyl chlorides and acid anhydrides',
    h2so4: 'alkenes and alcohols', h3po4: 'alcohols', hbr: 'C=C bonds', naoh: 'halogenoalkanes, esters and carboxylic acids', kcn: 'halogenoalkanes, aldehydes and ketones', nh3: 'halogenoalkanes, acyl chlorides and acid anhydrides',
    etnh2: 'halogenoalkanes, acyl chlorides and acid anhydrides', acylcl: 'alcohols, amines and benzene', anhyd: 'alcohols and amines', dilacid: 'esters, nitriles and carboxylate salts', nabh4: 'aldehydes and ketones',
    lialh4: 'aldehydes, ketones and nitriles', nitrating: 'benzene', snhcl: 'nitrobenzene', nabr: 'alcohols', socl2: 'carboxylic acids'
  };

  function parseRow(line) {
    var f = line.split(' | '), o = { id: f[0], smiles: f[1] }, nm = f[2], i = nm.indexOf(' (');
    o.name = i < 0 ? nm : nm.slice(0, i); o.alt = []; o.gcseName = null;
    if (i >= 0) {
      var inner = nm.slice(i + 2, -1), parts = [], depth = 0, cur = '';
      for (var k = 0; k < inner.length; k++) {   // split on ", " outside brackets
        var ch = inner[k];
        if (ch === '(') depth++;
        if (ch === ')') depth--;
        if (ch === ',' && depth === 0 && inner[k + 1] === ' ') { parts.push(cur); cur = ''; k++; } else cur += ch;
      }
      parts.push(cur);
      parts.forEach(function (p) { var m = /^(.*) \(GCSE\)$/.exec(p); if (m) o.gcseName = m[1]; else o.alt.push(p); });
    }
    o.cf = f[3]; o.formula = f[4]; o.mr = parseFloat(f[5]); o.level = f[6]; o.role = f[7];
    o.chiral = f[8] === 'chiral' && f.length === 10;
    o.groups = f[f.length - 1].split(' ');
    if (o.id === 'e-but-2-ene') o.stereo = 'E';
    if (o.id === 'z-but-2-ene') o.stereo = 'Z';
    return o;
  }
  var MOLS = {}, MOL_ORDER = [];
  MOLROWS.forEach(function (l) { var m = parseRow(l); MOLS[m.id] = m; MOL_ORDER.push(m.id); });
  FORMULA_ONLY.forEach(function (m) { m.alt = []; m.gcseName = null; m.smiles = null; m.chiral = false; m.show = 'formula'; MOLS[m.id] = m; MOL_ORDER.push(m.id); });

  /* ---------- Carbon bookkeeping for the tests ----------
     Carbons added by the partner molecule (a number, or 'partner' = the card's partner molecule),
     and the rules whose products simply split the substrate's carbons between them. */
  var ADDC = { 'esterify-alc': 2, 'esterify-acid': 'partner', 'acyl-alc': 2, 'anhyd-alc': 2, 'subst-amine': 2, 'acyl-amine': 2, 'amine-acyl': 2, 'fc-acyl': 2 };
  var SPLIT = { crack: 1, 'hyd-alk': 1, 'hyd-acid': 1 };
  RULES.forEach(function (r) { if (ADDC[r.id] !== undefined) r.addC = ADDC[r.id]; if (SPLIT[r.id]) r.split = true; });

  /* ---------- The scenes in the curly-arrow mechanisms tool (organic-reaction-mechanisms/#mech=<id>) ---------- */
  var SCENES = {
    'ea-ethene-hbr': 'Ethene + HBr', 'ea-propene-hbr': 'Propene + HBr', 'ea-ethene-br2': 'Ethene + Br₂', 'ea-ethene-h2so4': 'Ethene + concentrated H₂SO₄',
    'ns-hydroxide': 'Bromoethane + aqueous KOH', 'ns-cyanide': 'Bromoethane + ethanolic KCN', 'ns-ammonia': 'Bromoethane + excess NH₃',
    'elim-koh': '2-bromopropane + ethanolic KOH', 'elim-dehydration': 'Propan-2-ol + concentrated H₂SO₄', 'na-ethanal-nabh4': 'Ethanal + NaBH₄',
    'na-propanone-kcn': 'Propanone + KCN / H⁺', 'ae-water': 'Ethanoyl chloride + water', 'ae-ammonia': 'Ethanoyl chloride + ammonia',
    'ae-methanol': 'Ethanoyl chloride + methanol', 'ae-methylamine': 'Ethanoyl chloride + methylamine', 'es-nitration': 'Nitration of benzene',
    'es-acylation': 'Friedel–Crafts acylation of benzene', 'frs-chlorination': 'Chlorination of methane'
  };

  /* ---------- Edges ---------- */
  function parseP(x) {
    var list = Array.isArray(x) ? x : [x], out = [];
    list.forEach(function (s, i) {
      var role = 'major', id = s;
      if (s.charAt(0) === '~') { role = 'minor'; id = s.slice(1); }
      else if (s.charAt(0) === '=') { role = 'equal'; id = s.slice(1); }
      else if (i > 0) role = 'equal';
      out.push({ id: id, role: role });
    });
    return out;
  }
  function normEdge(spec) {
    var e = { status: 'ok', products: [], byCard: null };
    var o = (typeof spec === 'string' || Array.isArray(spec)) ? { p: spec } : spec;
    ['status', 'why', 'racemic', 'low', 'a', 'note', 'noteG', 'w', 'eq', 'mixture', 'mechOutline'].forEach(function (k) { if (o[k] !== undefined) e[k] = o[k]; });
    if (o.p) e.products = parseP(o.p);
    if (o.by) { e.byCard = {}; for (var c in o.by) e.byCard[c] = parseP(o.by[c]); }
    return e;
  }
  var EDGES = {};
  RULES.forEach(function (r) {
    for (var m in r.edges) { (EDGES[m] = EDGES[m] || {})[r.id] = normEdge(r.edges[m]); }
  });

  return {
    MOLS: MOLS, MOL_ORDER: MOL_ORDER, CARDS: CARDS, CARD_GROUPS: CARD_GROUPS, RULES: RULES, EDGES: EDGES,
    OBS: OBS, NO: NO, NOP: NOP, GROUP_NAMES: GROUP_NAMES, CARD_TARGETS: CARD_TARGETS, MECH_NAMES: MN, SCENES: SCENES, normEdge: normEdge
  };
});
