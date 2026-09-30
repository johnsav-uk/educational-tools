/* Dynamic Equilibrium Lab — 5. educational content.

   Words only: the explanations that follow a change, the misconceptions, the
   presenter slides, the "what is dynamic equilibrium" text, and the printable
   questions with their mark scheme. The explanations are built from the
   reaction in front of the class (its species, ΔH and gas moles) and from
   what the model actually did, so they never describe a shift that didn't
   happen. */
(function () {
'use strict';
const M = window.EQ_MODEL;

const sideNames = (rx, sign) => rx.species.filter(s => Math.sign(s.nu) === sign).map(s => (Math.abs(s.nu) > 1 ? Math.abs(s.nu) : '') + s.name).join(' + ');
const gasMoles = (rx, sign) => rx.species.filter(s => Math.sign(s.nu) === sign).reduce((a, s) => a + Math.abs(s.nu), 0);
const firstR = rx => rx.species.find(s => s.nu < 0);
const firstP = rx => rx.species.find(s => s.nu > 0);

/* ─── The changes a teacher can make, and what they do ────────────────── */
const CHANGES = {
  addR: { label: 'Increase reactant concentration', short: t => `+ ${t}` },
  remR: { label: 'Decrease reactant concentration', short: t => `− ${t}` },
  addP: { label: 'Increase product concentration', short: t => `+ ${t}` },
  remP: { label: 'Decrease product concentration', short: t => `− ${t}` },
  heat: { label: 'Increase temperature', short: () => 'Hotter' },
  cool: { label: 'Decrease temperature', short: () => 'Cooler' },
  pUp: { label: 'Increase pressure', short: () => 'Pressure up' },
  pDown: { label: 'Decrease pressure', short: () => 'Pressure down' },
  cat: { label: 'Add a catalyst', short: () => 'Catalyst' }
};
// The seven the prediction mode offers.
const PREDICT_CHANGES = ['addR', 'remP', 'heat', 'cool', 'pUp', 'pDown', 'cat'];

/* Explain a change. o: { rx, exo, level, dir ('f' | 'r' | 'none'), Kbefore, Kafter } */
function explain(key, o) {
  const rx = o.rx, A = o.level === 'alevel', R = firstR(rx).name, P = firstP(rx).name;
  const fwdExo = M.deltaH(rx, o.exo) < 0;
  const endoDir = fwdExo ? 'reverse' : 'forward';
  const nL = gasMoles(rx, -1), nR = gasMoles(rx, 1);
  const K = (a, b) => A && a && b ? ` Kc ${Math.abs(b / a - 1) < 0.005 ? 'stays at' : 'changes from ' + sig(a) + ' to'} ${sig(b)}.` : '';
  const Qline = { f: 'Q is now smaller than Kc, so there is a net forward reaction until Q = Kc again.', r: 'Q is now bigger than Kc, so there is a net reverse reaction until Q = Kc again.' };
  switch (key) {
    case 'addR': return {
      head: `More ${R}: the equilibrium shifts to the right`,
      body: [`Adding ${R} raises its concentration, so ${R} particles collide and react more often: the forward rate jumps above the reverse rate.`,
        `More products form until the two rates are equal again. Some of the added ${R} is used up, but not all of it.`,
        A ? `${Qline.f} Kc does not change: only temperature changes Kc.` : 'The system has partly opposed the change.']
    };
    case 'remR': return {
      head: `Less ${R}: the equilibrium shifts to the left`,
      body: [`Taking ${R} away lowers the forward rate, so the reverse reaction is now faster.`,
        `Products turn back into reactants until the rates are equal again, replacing some of the ${R} that was removed.`,
        A ? `${Qline.r} Kc does not change.` : 'The system has partly opposed the change.']
    };
    case 'addP': return {
      head: `More ${P}: the equilibrium shifts to the left`,
      body: [`Adding ${P} speeds up the reverse reaction, so it is now faster than the forward reaction.`,
        `Some of the added ${P} turns back into reactants until the rates are equal again.`,
        A ? `${Qline.r} Kc does not change.` : 'The system has partly opposed the change.']
    };
    case 'remP': return {
      head: `Less ${P}: the equilibrium shifts to the right`,
      body: [`Removing ${P} slows the reverse reaction, so the forward reaction is now faster.`,
        `More ${P} is made until the rates are equal again. Industry does this on purpose: ammonia is cooled and removed as a liquid.`,
        A ? `${Qline.f} Kc does not change.` : 'The system has partly opposed the change.']
    };
    case 'heat': case 'cool': {
      const up = key === 'heat';
      const favoured = up ? endoDir : (endoDir === 'forward' ? 'reverse' : 'forward');
      const more = favoured === 'forward' ? 'products' : 'reactants';
      return {
        head: `${up ? 'Hotter' : 'Cooler'}: the ${favoured} reaction is favoured, giving more ${more}`,
        body: [`The forward reaction is ${fwdExo ? 'exothermic' : 'endothermic'} (ΔH = ${fmtdH(M.deltaH(rx, o.exo))}), so the reverse reaction is ${fwdExo ? 'endothermic' : 'exothermic'}.`,
          up ? `Raising the temperature favours the endothermic direction, the ${endoDir} reaction. Both rates go up, but the ${endoDir} rate goes up more.`
             : `Lowering the temperature favours the exothermic direction, the ${endoDir === 'forward' ? 'reverse' : 'forward'} reaction. Both rates go down, but the endothermic ${endoDir} rate goes down more.`,
          (up ? 'Equilibrium is reached sooner, because every reaction is faster when it is hotter.' : 'Equilibrium is reached more slowly, because every reaction is slower when it is cooler.') + K(o.Kbefore, o.Kafter),
          A ? `Temperature is the only change that alters Kc. For an ${fwdExo ? 'exothermic' : 'endothermic'} forward reaction, Kc ${(up === fwdExo) ? 'decreases' : 'increases'} as the temperature ${up ? 'rises' : 'falls'}.` : '']
      };
    }
    case 'pUp': case 'pDown': {
      const up = key === 'pUp';
      if (nL === nR) return {
        head: 'Pressure: no shift, because there are the same number of gas molecules on each side',
        body: [`${sideNames(rx, -1)} has ${nL} molecule${nL > 1 ? 's' : ''} of gas; ${sideNames(rx, 1)} has ${nR}. A reaction in either direction leaves the number of molecules, and so the pressure, the same.`,
          `${up ? 'Squeezing' : 'Expanding'} the gas makes every concentration ${up ? 'higher' : 'lower'} by the same factor, so the forward and reverse rates ${up ? 'rise' : 'fall'} together and stay equal.`,
          `The position of equilibrium does not change. It is reached ${up ? 'sooner' : 'more slowly'}, because the particles are ${up ? 'closer together' : 'further apart'}.` + (A ? ' Q is unchanged by the volume, so it still equals Kc.' : '')]
      };
      const fewer = nR < nL ? 'right' : 'left', fewerSide = nR < nL ? 'products' : 'reactants';
      const goes = up ? fewer : (fewer === 'right' ? 'left' : 'right');
      const gets = up ? fewerSide : (fewerSide === 'products' ? 'reactants' : 'products');
      return {
        head: `${up ? 'Higher' : 'Lower'} pressure: the equilibrium shifts to the ${goes}, giving more ${gets}`,
        body: [`Count the gas molecules: ${sideNames(rx, -1)} is ${nL} molecules; ${sideNames(rx, 1)} is ${nR}.`,
          up ? `The same molecules are squeezed into a smaller volume, so the pressure jumps. Each ${fewer === 'right' ? 'forward' : 'reverse'} reaction turns ${Math.max(nL, nR)} molecules into ${Math.min(nL, nR)}, which lowers the pressure, so that direction is favoured. Watch the pressure reading fall after the jump.`
             : `The same molecules now have more room, so the pressure drops. The direction that makes more molecules raises the pressure again, so it is favoured.`,
          `It is not that molecules "want" to be on the side with fewer. ${up ? 'Squeezing speeds up' : 'Expanding slows down'} the reaction of the side with more molecules the most, because its rate depends on more concentrations multiplied together.` + (A ? ' Kc and Kp do not change: the composition changes until Q equals them again.' : '')]
      };
    }
    case 'cat': return {
      head: 'Catalyst: equilibrium is reached sooner, in exactly the same position',
      body: ['A catalyst gives both the forward and the reverse reaction a route with a lower activation energy, so it speeds them up by the same factor.',
        'Both rates rise, and they stay equal. The equilibrium concentrations and the yield are unchanged.',
        A ? 'Kc is unchanged, because kf and kr are both multiplied by the same factor and Kc = kf / kr.' : 'A catalyst does not increase the yield. It gets you to the same yield sooner.']
    };
  }
  return { head: '', body: [] };
}

function sig(v, n = 3) {
  if (!isFinite(v)) return '∞';
  if (v === 0) return '0';
  const a = Math.abs(v);
  if (a >= 1e5 || a < 1e-3) {
    const e = Math.floor(Math.log10(a)), m = v / Math.pow(10, e);
    return `${(+m.toPrecision(n)).toFixed(n - 1)} × 10${sup(e)}`;
  }
  const d = Math.max(0, n - 1 - Math.floor(Math.log10(a)));
  return v.toFixed(d);
}
const SUP = { '-': '⁻', 0: '⁰', 1: '¹', 2: '²', 3: '³', 4: '⁴', 5: '⁵', 6: '⁶', 7: '⁷', 8: '⁸', 9: '⁹' };
const sup = n => String(n).replace('−', '-').split('').map(c => SUP[c] || c).join('');
const fmtdH = dH => `${dH < 0 ? '−' : '+'}${Math.abs(Math.round(dH / 100) / 10)} kJ mol⁻¹`;

/* ─── Misconceptions ──────────────────────────────────────────────────── */
const MISCONCEPTIONS = [
  { claim: 'At equilibrium the reaction stops.', demo: 'running', demoLabel: 'Show me: run to equilibrium, then pause',
    text: 'False. Both reactions carry on. At equilibrium the forward and reverse reactions happen at the same rate, so each change is undone as fast as it happens. Pause the chamber at equilibrium: the marked rings show forward (solid) and reverse (dashed) reactions from the last few seconds, and both rate bars are well above zero.' },
  { claim: 'At equilibrium there are equal amounts of reactants and products.', demo: 'unequal', demoLabel: 'Show me an equilibrium mixture',
    text: 'False. "Equal" describes the rates, not the amounts. Look at the composition bar under the chamber: at equilibrium the amounts are constant, but they are rarely equal. Where equilibrium lies depends on the reaction and the temperature.' },
  { claim: 'A catalyst increases the equilibrium yield.', demo: 'catalyst', demoLabel: 'Show me the comparison',
    text: 'False. A catalyst speeds up the forward and reverse reactions equally. It gets the system to equilibrium sooner, but the final concentrations are the same. The comparison graph shows both runs levelling off at the same height.' },
  { claim: 'Changing the concentration changes Kc.', demo: 'kc', demoLabel: 'Show me: add reactant and watch Kc', alevel: true,
    text: 'False. Adding or removing a substance changes the equilibrium concentrations, but they rearrange until [products]/[reactants] is back to the same value. At a fixed temperature Kc is constant. The Kc log records each equilibrium the chamber reaches, so you can check.' },
  { claim: 'Equilibrium means 50% reactants and 50% products.', demo: 'unequal', demoLabel: 'Show me the percentages',
    text: 'False. An equilibrium mixture can be almost all products, almost all reactants, or anywhere between. The composition bar shows the percentage of each substance. Heat or cool an exothermic reaction and the equilibrium mixture changes, though it is still an equilibrium.' },
  { claim: 'Increasing the temperature always increases Kc.', demo: 'temp', demoLabel: 'Show me with an exothermic reaction', alevel: true,
    text: 'False. Raising the temperature favours the endothermic direction. If the forward reaction is endothermic, Kc increases; if it is exothermic, as in the Haber process, Kc decreases.' }
];

/* ─── Presenter slides: the teaching narrative ────────────────────────── */
const NARRATIVE = [
  ['Particles react', 'Reactant particles collide. Some collisions have enough energy to react: each solid ring is a forward reaction.'],
  ['Forward reaction dominates', 'At the start there are lots of reactants and no products, so the forward rate is high and the reverse rate is zero.'],
  ['The reverse reaction begins', 'As products build up, they start to react back into reactants: each dashed ring is a reverse reaction.'],
  ['The rates converge', 'Fewer reactants: the forward rate falls. More products: the reverse rate rises. Watch the two bars meet.'],
  ['Dynamic equilibrium', 'Forward rate = reverse rate. The concentrations stop changing and the graph lines go flat.'],
  ['Still reacting', 'Pause now. Solid and dashed rings from the last few seconds: both reactions are still happening, at the same rate.'],
  ['Change a condition', 'Add a substance, change the temperature or pressure, or add a catalyst. What do you predict?'],
  ['The system responds', 'One rate is now faster than the other, so the concentrations change until the rates are equal again.'],
  ['Why?', 'Le Chatelier: the system shifts to oppose the change. A catalyst speeds both reactions equally, so nothing shifts.']
];
const NARRATIVE_A = [
  ['Kc from the chamber', 'At equilibrium, Kc = [products]^coefficients / [reactants]^coefficients, using the equilibrium concentrations.'],
  ['Q tells you which way', 'Q has the same form, using the concentrations now. Q < Kc: net forward. Q > Kc: net reverse. Q = Kc: equilibrium.'],
  ['Only temperature changes Kc', 'Concentration, pressure and a catalyst change the concentrations or the speed, never Kc. Temperature changes Kc and Kp.']
];

/* ─── What is dynamic equilibrium? ─────────────────────────────────────── */
const WHAT_IS = {
  gcse: [
    'Dynamic equilibrium is reached in a reversible reaction when the forward and reverse reactions happen at the same rate. The concentrations of the reactants and products remain constant, but particles continue to react.',
    'It can only happen in a <b>closed system</b>, where nothing can get in or out. In an open flask a gas would escape and the reaction would never settle.',
    '<b>Le Chatelier\'s principle</b> (Higher Tier): if a system at equilibrium is subjected to a change in conditions, the system responds to counteract the change.',
    'The same amount of energy is transferred in each direction: if the forward reaction is exothermic, the reverse is endothermic by the same amount.'
  ],
  alevel: [
    'At equilibrium the rate of the forward reaction equals the rate of the reverse reaction, so the concentrations of every substance stay constant while both reactions continue.',
    'For a reaction that happens in one step, rate<sub>f</sub> = k<sub>f</sub>[A][B] and rate<sub>r</sub> = k<sub>r</sub>[C][D]. Setting them equal gives [C][D] / [A][B] = k<sub>f</sub> / k<sub>r</sub>: a constant at a given temperature. That constant is <b>Kc</b>.',
    'For aA + bB ⇌ cC + dD, Kc = [C]<sup>c</sup>[D]<sup>d</sup> / [A]<sup>a</sup>[B]<sup>b</sup>, with equilibrium concentrations in mol dm⁻³. Its units depend on the equation.',
    'For gases, Kp uses partial pressures: p<sub>A</sub> = mole fraction of A × total pressure. The partial pressures add up to the total pressure.',
    'Changing a concentration or the pressure moves the composition, but the system rearranges until the ratio is back to Kc (or Kp). A catalyst changes neither. Only a change in temperature changes the value of Kc or Kp: it rises with temperature for an endothermic forward reaction and falls for an exothermic one.'
  ]
};

/* ─── Printable questions ─────────────────────────────────────────────────
   Each part: t (text), marks, and the space to write (lines, ans or html);
   ms (marking points), work (working for calculations), no (do not accept). */
function productGraphSVG() {
  const W = 520, H = 330, l = 62, r = 16, t = 14, b = 48, pw = W - l - r, ph = H - t - b;
  const X = s => l + s / 60 * pw, Y = c => t + ph - c / 0.8 * ph;
  let s = `<svg viewBox="0 0 ${W} ${H}" xmlns="http://www.w3.org/2000/svg" font-family="Plus Jakarta Sans, Arial, sans-serif" font-size="12" role="img" aria-label="Graph of product concentration against time">`;
  for (let x = 0; x <= 60; x += 2) s += `<line x1="${X(x)}" y1="${t}" x2="${X(x)}" y2="${t + ph}" stroke="${x % 10 ? '#d6d6d6' : '#a8a8a8'}" stroke-width="${x % 10 ? 0.5 : 0.8}"/>`;
  for (let c = 0; c <= 0.8001; c += 0.02) s += `<line x1="${l}" y1="${Y(c)}" x2="${l + pw}" y2="${Y(c)}" stroke="${Math.round(c * 100) % 10 ? '#d6d6d6' : '#a8a8a8'}" stroke-width="${Math.round(c * 100) % 10 ? 0.5 : 0.8}"/>`;
  s += `<path d="M${l} ${t}V${t + ph}H${l + pw}" fill="none" stroke="#000" stroke-width="1.4"/>`;
  for (let x = 0; x <= 60; x += 10) s += `<text x="${X(x)}" y="${t + ph + 17}" text-anchor="middle">${x}</text>`;
  for (let c = 0; c <= 0.8001; c += 0.1) s += `<text x="${l - 7}" y="${Y(c) + 4}" text-anchor="end">${c.toFixed(1)}</text>`;
  s += `<text x="${l + pw / 2}" y="${H - 6}" text-anchor="middle" font-weight="600">Time in seconds</text>`;
  s += `<text transform="translate(15 ${t + ph / 2}) rotate(-90)" text-anchor="middle" font-weight="600">Concentration of product in mol/dm³</text>`;
  let d = '';
  for (let x = 0; x <= 60.001; x += 0.5) {
    const c = x < 40 ? 0.6 * (1 - Math.exp(-x / 9)) / (1 - Math.exp(-40 / 9)) : 0.6;
    d += `${x ? 'L' : 'M'}${X(x).toFixed(1)} ${Y(c).toFixed(1)}`;
  }
  return s + `<path d="${d}" fill="none" stroke="#000" stroke-width="2"/></svg>`;
}
function rateAxesSVG() {
  const W = 440, H = 250, l = 52, r = 16, t = 14, b = 40, pw = W - l - r, ph = H - t - b;
  return `<svg viewBox="0 0 ${W} ${H}" xmlns="http://www.w3.org/2000/svg" font-family="Plus Jakarta Sans, Arial, sans-serif" font-size="12" role="img" aria-label="Blank axes: rate against time">
    <path d="M${l} ${t}V${t + ph}H${l + pw}" fill="none" stroke="#000" stroke-width="1.4"/>
    <text x="${l + pw / 2}" y="${H - 8}" text-anchor="middle" font-weight="600">Time</text>
    <text transform="translate(18 ${t + ph / 2}) rotate(-90)" text-anchor="middle" font-weight="600">Rate</text>
    <text x="${l - 6}" y="${t + ph + 4}" text-anchor="end">0</text><text x="${l}" y="${t + ph + 16}" text-anchor="middle">0</text></svg>`;
}

// Haber yields for the GCSE table, from the same K(T) the simulation uses:
// a 1 : 3 mixture held at constant total pressure (the industrial convention).
function haberYield(Tk, Patm) {
  const rx = M.REACTIONS.haber, Kc = M.Kc_T(rx, Tk, true);
  const Kp = Kc / Math.pow(0.082057 * Tk, 2);         // atm⁻²
  const g = xi => Math.log(4 * xi * xi * Math.pow(4 - 2 * xi, 2) / (27 * Math.pow(1 - xi, 4))) - Math.log(Kp * Patm * Patm);
  let a = 1e-9, b = 1 - 1e-9;
  for (let i = 0; i < 100; i++) { const m = (a + b) / 2; if (g(m) > 0) b = m; else a = m; }
  const xi = (a + b) / 2;
  return 100 * 2 * xi / (4 - 2 * xi);
}
function haberTable() {
  const P = [100, 200, 300], T = [350, 450, 550];
  const rows = T.map(tc => `<tr><td>${tc}</td>${P.map(p => `<td>${Math.round(haberYield(tc + 273, p))}</td>`).join('')}</tr>`).join('');
  return `<table class="dtab"><tr><th>Temperature in °C</th>${P.map(p => `<th>${p} atm</th>`).join('')}</tr>${rows}</table>`;
}

function questions() {
  const y = (tc, p) => Math.round(haberYield(tc + 273, p));
  const GCSE = [
    { stem: 'Ammonium chloride decomposes when it is heated. The reaction is reversible.<p class="nq">NH<sub>4</sub>Cl(s) ⇌ NH<sub>3</sub>(g) + HCl(g)</p>',
      parts: [
        { t: 'What does the symbol ⇌ show about this reaction?', marks: 1, lines: 1, ms: ['the reaction is reversible / can go in both directions'] },
        { t: 'The forward reaction is endothermic. What type of energy change happens in the reverse reaction? Give a reason for your answer.', marks: 2, lines: 2,
          ms: ['exothermic', 'the same amount of energy is transferred in each direction (but in the opposite direction)'] }
      ] },
    { stem: 'A reversible reaction was carried out in a sealed container at a constant temperature. The graph shows how the concentration of the product changed.',
      figure: productGraphSVG(),
      parts: [
        { t: 'Give the concentration of the product at equilibrium.', marks: 1, ans: 'Concentration = ____________ mol/dm³', ms: ['0.60 mol/dm³'] },
        { t: 'Describe how the rate of the forward reaction changes between 0 and 40 seconds. Give a reason for your answer.', marks: 2, lines: 2,
          ms: ['the rate decreases', 'because the concentration of the reactants decreases (so there are fewer collisions per second)'] },
        { t: 'After 40 seconds the concentration of the product stays the same. Explain why, even though the reaction has not stopped.', marks: 2, lines: 3,
          ms: ['the forward and reverse reactions happen at the same rate', 'so the product is made as fast as it is used up / the concentrations do not change'],
          no: 'Do not accept "the reaction has stopped" or "the reactants have run out".' },
        { t: 'The experiment is repeated with a catalyst. Draw a line on the graph to show the result.', marks: 2,
          ms: ['line steeper at the start, levelling off earlier than 40 s', 'levelling off at the same concentration, 0.60 mol/dm³'] },
        { t: 'A student says "at equilibrium there are equal amounts of reactants and products". Is the student correct? Explain your answer.', marks: 2, lines: 2,
          ms: ['no', 'at equilibrium the rates are equal; the amounts stay constant but are not usually equal'] }
      ] },
    { stem: `Ammonia is made by the Haber process.<p class="nq">N<sub>2</sub>(g) + 3H<sub>2</sub>(g) ⇌ 2NH<sub>3</sub>(g) &nbsp; ΔH = −92 kJ/mol</p>
        The table shows the percentage of ammonia in the equilibrium mixture under different conditions.${haberTable()}`,
      parts: [
        { t: 'Use the table to describe the effect of increasing the pressure on the percentage of ammonia at equilibrium.', marks: 1, lines: 1,
          ms: ['the percentage of ammonia increases as the pressure increases'] },
        { t: '<span class="tag">HT</span> Explain this effect.', marks: 2, lines: 3,
          ms: ['increasing pressure shifts the equilibrium to the side with fewer molecules of gas', 'there are 2 molecules of gas on the right and 4 on the left, so it shifts to the right'] },
        { t: '<span class="tag">HT</span> Explain why the percentage of ammonia decreases as the temperature increases.', marks: 2, lines: 3,
          ms: ['the forward reaction is exothermic', 'increasing the temperature shifts the equilibrium in the endothermic direction / to the left'] },
        { t: '<span class="tag">HT</span> The process uses a temperature of about 450 °C. Explain why a temperature of 350 °C is not used, even though it gives a higher yield.', marks: 3, lines: 4,
          ms: [`at 350 °C the yield is higher (${y(350, 200)}% compared with ${y(450, 200)}% at 200 atm)`, 'but the rate of reaction is too slow', '450 °C is a compromise: a reasonable yield produced quickly enough'] },
        { t: 'Suggest one reason why a pressure of about 200 atm is used rather than a much higher pressure.', marks: 1, lines: 2,
          ms: ['higher pressures need stronger, more expensive equipment / use more energy for the compressors / are more dangerous'] },
        { t: 'An iron catalyst is used. Give its effect on (i) the rate of reaction and (ii) the percentage of ammonia at equilibrium.', marks: 2, lines: 2,
          ms: ['(i) increases the rate / equilibrium is reached faster', '(ii) no effect'] }
      ] },
    { stem: '<span class="tag">HT</span> Iodine monochloride is a brown liquid. It reacts with chlorine to form a yellow solid, iodine trichloride.<p class="nq">ICl(l) + Cl<sub>2</sub>(g) ⇌ ICl<sub>3</sub>(s)</p>The mixture is at equilibrium in a sealed tube.',
      parts: [
        { t: 'More chlorine is added to the tube. Describe what you would see, and explain why.', marks: 2, lines: 3,
          ms: ['more yellow solid forms / the brown liquid decreases', 'the equilibrium shifts to the right to reduce the concentration of chlorine'] },
        { t: 'Chlorine is removed from the tube. Describe what you would see.', marks: 1, lines: 2,
          ms: ['the yellow solid turns back into the brown liquid (equilibrium shifts to the left)'] }
      ] }
  ];

  const ALEVEL = [
    { stem: 'Hydrogen reacts with iodine in a reversible reaction.<p class="nq">H<sub>2</sub>(g) + I<sub>2</sub>(g) ⇌ 2HI(g) &nbsp; ΔH = −9.6 kJ mol<sup>−1</sup></p>1.00 mol of hydrogen and 1.00 mol of iodine were sealed in a vessel of volume 2.00 dm<sup>3</sup> and heated to 764 K. At equilibrium the mixture contained 1.54 mol of hydrogen iodide.',
      parts: [
        { t: 'Write an expression for the equilibrium constant, Kc, for this reaction.', marks: 1, lines: 2, ms: ['Kc = [HI]<sup>2</sup> / [H<sub>2</sub>][I<sub>2</sub>]'], no: 'Do not accept round brackets or an expression using amounts in mol.' },
        { t: 'Calculate the value of Kc at 764 K.', marks: 4, lines: 4, ans: 'Kc = ____________',
          ms: ['amounts at equilibrium: H<sub>2</sub> = I<sub>2</sub> = 1.00 − 0.77 = 0.23 mol', 'concentrations: [H<sub>2</sub>] = [I<sub>2</sub>] = 0.115 mol dm<sup>−3</sup>, [HI] = 0.770 mol dm<sup>−3</sup>',
            'Kc = 0.770<sup>2</sup> / (0.115 × 0.115)', '= 44.8 (accept 44.8 to 45)'],
          work: 'HI formed = 1.54 mol, so H₂ and I₂ used = 1.54 ÷ 2 = 0.77 mol each\nH₂ = I₂ = 1.00 − 0.77 = 0.23 mol → 0.23 ÷ 2.00 = 0.115 mol dm⁻³\n[HI] = 1.54 ÷ 2.00 = 0.770 mol dm⁻³\nKc = 0.770² / (0.115 × 0.115) = 0.5929 / 0.013225 = 44.8',
          no: 'Allow the final mark for a correct answer from an error carried forward in the amounts.' },
        { t: 'Explain why Kc has no units for this reaction.', marks: 1, lines: 2, ms: ['the units cancel: (mol dm<sup>−3</sup>)<sup>2</sup> / (mol dm<sup>−3</sup>)<sup>2</sup> / there are equal powers of concentration on the top and bottom'] },
        { t: 'State and explain the effect on the value of Kc of increasing the temperature.', marks: 2, lines: 3,
          ms: ['Kc decreases', 'the forward reaction is exothermic, so the equilibrium shifts to the left (in the endothermic direction), lowering [HI] relative to [H<sub>2</sub>][I<sub>2</sub>]'] },
        { t: 'A different mixture at 764 K contains 0.20 mol dm<sup>−3</sup> H<sub>2</sub>, 0.20 mol dm<sup>−3</sup> I<sub>2</sub> and 1.60 mol dm<sup>−3</sup> HI. Calculate the reaction quotient, Q, and deduce the direction in which the reaction will go.', marks: 3, lines: 3,
          ms: ['Q = 1.60<sup>2</sup> / (0.20 × 0.20)', '= 64', 'Q > Kc, so there is a net reverse reaction / more H<sub>2</sub> and I<sub>2</sub> form'], work: 'Q = 2.56 / 0.040 = 64\n64 > 44.8, so the mixture moves to the left until Q = Kc' },
        { t: 'State the effect of adding a catalyst on (i) the value of Kc and (ii) the time taken to reach equilibrium.', marks: 2, lines: 2,
          ms: ['(i) no effect', '(ii) the time decreases (both forward and reverse rates increase equally)'] }
      ] },
    { stem: 'Ethanoic acid reacts with ethanol to form ethyl ethanoate and water.<p class="nq">CH<sub>3</sub>COOH(l) + C<sub>2</sub>H<sub>5</sub>OH(l) ⇌ CH<sub>3</sub>COOC<sub>2</sub>H<sub>5</sub>(l) + H<sub>2</sub>O(l)</p>0.40 mol of ethanoic acid and 0.40 mol of ethanol were mixed with a small amount of acid catalyst. At equilibrium the mixture contained 0.27 mol of ethyl ethanoate.',
      parts: [
        { t: 'Give the amounts, in mol, of ethanoic acid, ethanol and water in the equilibrium mixture.', marks: 2, lines: 2,
          ms: ['ethanoic acid = ethanol = 0.13 mol', 'water = 0.27 mol'] },
        { t: 'Calculate the value of Kc for this reaction.', marks: 2, lines: 3, ans: 'Kc = ____________',
          ms: ['Kc = (0.27 × 0.27) / (0.13 × 0.13)', '= 4.3 (accept 4.31)'], work: 'Kc = 0.0729 / 0.0169 = 4.31' },
        { t: 'Explain why the total volume of the mixture is not needed to calculate Kc.', marks: 1, lines: 2,
          ms: ['the volume cancels, because there are the same number of moles (terms) on the top and bottom of the expression'] }
      ] },
    { stem: 'Ammonia is made by the Haber process.<p class="nq">N<sub>2</sub>(g) + 3H<sub>2</sub>(g) ⇌ 2NH<sub>3</sub>(g) &nbsp; ΔH = −92 kJ mol<sup>−1</sup></p>At equilibrium, a mixture contained 0.60 mol of N<sub>2</sub>, 1.80 mol of H<sub>2</sub> and 0.80 mol of NH<sub>3</sub>. The total pressure was 20 000 kPa.',
      parts: [
        { t: 'Write an expression for the equilibrium constant, Kp, for this reaction.', marks: 1, lines: 2, ms: ['Kp = p(NH<sub>3</sub>)<sup>2</sup> / p(N<sub>2</sub>) × p(H<sub>2</sub>)<sup>3</sup>'], no: 'Do not accept square brackets.' },
        { t: 'Calculate the partial pressure of each gas.', marks: 3, lines: 4,
          ms: ['total amount = 3.20 mol', 'mole fractions: N<sub>2</sub> 0.1875, H<sub>2</sub> 0.5625, NH<sub>3</sub> 0.25', 'partial pressures: N<sub>2</sub> 3750 kPa, H<sub>2</sub> 11 250 kPa, NH<sub>3</sub> 5000 kPa'],
          work: 'n(total) = 0.60 + 1.80 + 0.80 = 3.20 mol\nx(N₂) = 0.60 / 3.20 = 0.1875 → p = 0.1875 × 20 000 = 3750 kPa\nx(H₂) = 1.80 / 3.20 = 0.5625 → p = 11 250 kPa\nx(NH₃) = 0.80 / 3.20 = 0.25 → p = 5000 kPa' },
        { t: 'Calculate the value of Kp and give its units.', marks: 3, lines: 3, ans: 'Kp = ____________ units ________',
          ms: ['Kp = 5000<sup>2</sup> / (3750 × 11 250<sup>3</sup>)', '= 4.68 × 10<sup>−9</sup>', 'kPa<sup>−2</sup>'],
          work: 'Kp = 2.5 × 10⁷ / (3750 × 1.424 × 10¹²) = 2.5 × 10⁷ / 5.339 × 10¹⁵ = 4.68 × 10⁻⁹ kPa⁻²\nUnits: kPa² / (kPa × kPa³) = kPa⁻²', no: 'Allow the units mark independently of the value.' },
        { t: 'The total pressure is increased at constant temperature. State and explain the effect on the yield of ammonia and on the value of Kp.', marks: 3, lines: 4,
          ms: ['the yield of ammonia increases', 'the equilibrium shifts to the side with fewer moles of gas (2 mol on the right, 4 mol on the left)', 'Kp does not change: it depends only on temperature'] },
        { t: 'State and explain the effect of increasing the temperature on the value of Kp.', marks: 2, lines: 3,
          ms: ['Kp decreases', 'the forward reaction is exothermic, so the equilibrium shifts to the left (endothermic direction)'] }
      ] },
    { stem: 'Hydrogen and iodine are sealed in a flask and heated. No hydrogen iodide is present at the start.',
      parts: [
        { t: 'Explain what is meant by dynamic equilibrium.', marks: 2, lines: 3,
          ms: ['the forward and reverse reactions happen at the same rate', 'the concentrations of reactants and products stay constant (in a closed system)'] },
        { t: 'On the axes, sketch how the rate of the forward reaction and the rate of the reverse reaction change with time, from the start until after equilibrium is reached. Label each line.', marks: 2,
          html: `<figure>${rateAxesSVG()}</figure>`,
          ms: ['forward rate starts high and decreases; reverse rate starts at zero and increases', 'the two lines meet and then stay level at the same rate'] }
      ] }
  ];
  return { GCSE, ALEVEL };
}

const AQA = {
  gcse: 'GCSE, AQA Chemistry 8462: 4.6.2 Reversible reactions and dynamic equilibrium (4.6.2.1 – 4.6.2.7), with the Higher Tier content on equilibrium and Le Chatelier\'s principle. The Haber process is 4.10.4.1 (Chemistry only).',
  alevel: 'A-level, AQA Chemistry 7405: 3.1.6 Chemical equilibria, Le Chatelier\'s principle and Kc; 3.1.10 Equilibrium constant Kp for homogeneous systems.'
};

window.EQ_CONTENT = { CHANGES, PREDICT_CHANGES, explain, MISCONCEPTIONS, NARRATIVE, NARRATIVE_A, WHAT_IS, questions, AQA, sig, sup, fmtdH, sideNames, gasMoles, haberYield };
})();
