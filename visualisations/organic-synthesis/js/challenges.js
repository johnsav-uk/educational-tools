/* Organic Synthesis Pathways: the puzzles.

   { id, level, start, target, maxSteps, intro, routes: [[ 'card/profile', ... ]], routesE?, minRoutes?, impossible? }

   `routes` are some of the routes the engine accepts at this level with the
   AQA-only shelf; `routesE` need “Beyond AQA”. They are fixtures for the tests:
   the page accepts every valid route, not only these. `impossible` puzzles have
   no route and ask the student to explain why. */
(function (root, factory) {
  var api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  root.SYNTH_CHALLENGES = api;
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';
  var L = [
    // ---- GCSE ----
    { id: 'g1', level: 'gcse', start: 'ethene', target: 'ethanol', maxSteps: 1, intro: 'Ethene is made by cracking oil fractions. Turn it into ethanol, the alcohol used as a fuel and a solvent.', routes: [['steam/hp']] },
    { id: 'g2', level: 'gcse', start: 'ethene', target: 'ethane', maxSteps: 1, intro: 'Ethene is unsaturated. Make the saturated alkane with the same number of carbon atoms.', routes: [['h2/heat']] },
    { id: 'g3', level: 'gcse', start: 'propene', target: 'dibromopropane', maxSteps: 1, intro: 'Propene decolourises bromine water. Make the product that forms.', routes: [['br2/dark']] },
    { id: 'g4', level: 'gcse', start: 'glucose', target: 'ethanol', maxSteps: 1, intro: 'Ethanol for drinks and fuel can be made from sugar without any oil. What do you add, and what conditions does it need?', routes: [['yeast/anaerobic']] },
    { id: 'g5', level: 'gcse', start: 'ethanol', target: 'ethanoic-acid', maxSteps: 1, intro: 'Wine left open to the air turns sour. Make the carboxylic acid that is vinegar.', routes: [['oxid/warm']] },
    { id: 'g6', level: 'gcse', start: 'ethanoic-acid', target: 'ethyl-ethanoate', maxSteps: 1, intro: 'Esters give fruits and perfumes their smells. Make ethyl ethanoate from ethanoic acid.', routes: [['est-ethanol/warm']] },
    { id: 'g7', level: 'gcse', start: 'decane', target: 'ethanol', maxSteps: 2, intro: 'Crude oil has too much decane. Use it to make ethanol in two steps.', routes: [['crack/cat', 'steam/hp']] },
    { id: 'g8', level: 'gcse', start: 'ethene', target: 'ethyl-ethanoate', maxSteps: 3, minRoutes: 2, intro: 'Make an ester from ethene. There is more than one way to get there.', routes: [['steam/hp', 'est-ethanoic/warm'], ['steam/hp', 'oxid/warm', 'est-ethanol/warm']] },
    { id: 'g9', level: 'gcse', start: 'decane', target: 'dichloroethane', maxSteps: 2, intro: 'Crack decane, then use the alkene to make 1,2-dichloroethane.', routes: [['crack/cat', 'cl2/dark']] },
    { id: 'g10', level: 'gcse', start: 'glucose', target: 'ethanoic-acid', maxSteps: 2, intro: 'Make vinegar from sugar: ferment it, then oxidise the product.', routes: [['yeast/anaerobic', 'oxid/warm']] },
    // ---- A-level ----
    { id: 'a1', level: 'alevel', start: 'bromoethane', target: 'ethanol', maxSteps: 1, intro: 'Replace the halogen with OH. Choose the reagent and the solvent carefully.', routes: [['naoh/aq']] },
    { id: 'a2', level: 'alevel', start: '2-bromopropane', target: 'propene', maxSteps: 1, intro: 'The same two reagents as the last puzzle, in a different solvent, give a different type of reaction. Which one makes the alkene?', routes: [['naoh/eth']] },
    { id: 'a3', level: 'alevel', start: 'propan-1-ol', target: 'propanal', maxSteps: 1, intro: 'Stop the oxidation at the aldehyde. How do you stop it going further?', routes: [['oxid/distil']] },
    { id: 'a4', level: 'alevel', start: 'propan-1-ol', target: 'propanoic-acid', maxSteps: 2, minRoutes: 2, intro: 'Go all the way to the carboxylic acid. Examiners accept a one-step and a two-step answer.', routes: [['oxid/reflux'], ['oxid/distil', 'oxid/reflux']] },
    { id: 'a5', level: 'alevel', start: 'propene', target: 'propanone', maxSteps: 4, minRoutes: 2, intro: 'Which alcohol must you make first, and which way round does the addition go? Several routes work.', routes: [['steam/hp', 'oxid/reflux'], ['h2so4/coldwater', 'oxid/distil'], ['hbr/rt', 'naoh/aq', 'oxid/reflux']] },
    { id: 'a6', level: 'alevel', start: 'bromoethane', target: 'propylamine', maxSteps: 2, minRoutes: 2, intro: 'Lengthen the carbon chain by one carbon, then make the amine. Two different reagents will do the second step.', routes: [['kcn/eth', 'lialh4/ether'], ['kcn/eth', 'h2/heat']] },
    { id: 'a7', level: 'alevel', start: 'ethanal', target: 'hn-ethanal', maxSteps: 1, intro: 'Add a carbon to the carbonyl group. The product has a chiral centre: is it optically active?', routes: [['kcn/acid']] },
    { id: 'a8', level: 'alevel', start: 'propan-1-ol', target: 'propan-2-ol', maxSteps: 4, minRoutes: 2, intro: 'Move the OH from the end carbon to the middle carbon. Think about where the double bond goes.', routes: [['h2so4/hot', 'steam/hp'], ['h3po4/hot', 'h2so4/coldwater'], ['h2so4/hot', 'hbr/rt', 'naoh/aq']] },
    { id: 'a9', level: 'alevel', start: '1-bromopropane', target: '2-bromopropane', maxSteps: 2, intro: 'Move the bromine from the end carbon to the middle carbon.', routes: [['naoh/eth', 'hbr/rt']] },
    { id: 'a10', level: 'alevel', start: 'propanone', target: 'propene', maxSteps: 2, intro: 'Remove the oxygen from a ketone and make a C=C bond.', routes: [['nabh4/aq', 'h2so4/hot']] },
    { id: 'a11', level: 'alevel', start: 'ethene', target: 'ethylamine', maxSteps: 2, intro: 'Turn an alkene into a primary amine using a halogenoalkane.', routes: [['hbr/rt', 'nh3/excess']] },
    { id: 'a12', level: 'alevel', start: 'ethene', target: 'propylamine', maxSteps: 3, intro: 'The amine has one more carbon than the alkene. Extend the chain, then reduce.', routes: [['hbr/rt', 'kcn/eth', 'lialh4/ether']] },
    { id: 'a13', level: 'alevel', start: 'benzene', target: 'n-phenylethanamide', maxSteps: 3, minRoutes: 2, intro: 'Make an amide from benzene. Your last step can use either of two acylating agents.', routes: [['nitrating/cool', 'snhcl/reflux', 'acylcl/rt'], ['nitrating/cool', 'snhcl/reflux', 'anhyd/warm']] },
    { id: 'a14', level: 'alevel', start: 'benzene', target: 'phenylethene', maxSteps: 3, intro: 'Add a two-carbon side chain to benzene, then turn it into a C=C.', routes: [['acylcl/alcl3', 'nabh4/aq', 'h2so4/hot']] },
    { id: 'a15', level: 'alevel', start: 'ethane', target: 'n-ethylethanamide', maxSteps: 3, intro: 'Start from an unreactive alkane. Its first step has a poor yield, but it is the only way in.', routes: [['br2/uv', 'nh3/excess', 'acylcl/rt']] },
    { id: 'a16', level: 'alevel', start: 'ethanol', target: 'ethyl-ethanoate', maxSteps: 2, minRoutes: 4, intro: 'Make an ester from the alcohol. Find as many valid routes as you can.', routes: [['est-ethanoic/warm'], ['acylcl/rt'], ['anhyd/warm'], ['oxid/reflux', 'est-ethanol/warm']] },
    { id: 'a17', level: 'alevel', start: 'methyl-propanoate', target: 'propanoic-acid', maxSteps: 2, minRoutes: 2, intro: 'Hydrolyse the ester and end with the free carboxylic acid. Acid hydrolysis takes one step, but alkaline hydrolysis needs a second.', routes: [['dilacid/reflux'], ['naoh/aq', 'dilacid/rt']] },
    { id: 'a18', level: 'alevel', start: 'propanoyl-chloride', target: 'n-ethylpropanamide', maxSteps: 1, intro: 'Make an N-substituted amide. Which amine is needed?', routes: [['etnh2/rt']] },
    { id: 'a19', level: 'alevel', start: 'ethene', target: 'hn-ethanal', maxSteps: 3, intro: 'Make a hydroxynitrile from ethene: you need an alcohol, then a carbonyl compound.', routes: [['steam/hp', 'oxid/distil', 'kcn/acid']] },
    { id: 'a20', level: 'alevel', start: 'propan-2-ol', target: 'propan-1-ol', maxSteps: 4, impossible: true, intro: 'Can you turn propan-2-ol into propan-1-ol? Try, then explain why the tool will not let you.', routes: [],
      why: 'Every route from propan-2-ol gives propan-2-ol or 2-bromopropane as the major product, because the H adds to the carbon that already has more hydrogens (the more stable carbocation). Propan-1-ol only ever forms as a minor product, and a route cannot continue from a minor product.' },
    // ---- Beyond AQA ----
    { id: 'e1', level: 'alevel', enrich: true, start: 'ethene', target: 'propanoic-acid', maxSteps: 3, intro: 'Make a carboxylic acid with one more carbon than the alkene. Nitrile hydrolysis is not on the AQA specification, so this needs the Beyond AQA shelf.', routes: [], routesE: [['hbr/rt', 'kcn/eth', 'dilacid/reflux']] },
    { id: 'e2', level: 'alevel', enrich: true, start: 'ethanol', target: 'n-ethylethanamide', maxSteps: 4, minRoutes: 2, intro: 'Make an amide from ethanol. With the extra reagents you save a step; without them you still have a route.', routes: [['h2so4/hot', 'hbr/rt', 'nh3/excess', 'acylcl/rt']], routesE: [['nabr/reflux', 'nh3/excess', 'acylcl/rt']] }
  ];
  var TITLES = {};
  return { list: L, byId: function (id) { return L.filter(function (c) { return c.id === id; })[0] || null; }, forLevel: function (level) { return L.filter(function (c) { return level === 'gcse' ? c.level === 'gcse' : true; }); }, parse: function (s) { var p = s.split('/'); return { card: p[0], profile: p[1] }; } };
});
