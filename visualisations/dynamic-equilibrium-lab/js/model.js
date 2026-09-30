/* Dynamic Equilibrium Lab — 1. the simulation model.

   This file is the chemistry. Everything the tool reports (concentrations,
   rates, Kc, Q, Kp, the graphs, the time to equilibrium) is read from here.

   The model is a mass-action kinetic model of one reversible reaction in a
   sealed gas vessel of volume V at temperature T:

     aA + bB ⇌ cC + dD
     rate_forward = kf [A]^a [B]^b        rate_reverse = kr [C]^c [D]^d

   integrated with fourth-order Runge-Kutta on the amounts n_i (mol), with an
   adaptive step so it stays stable after any change the teacher makes.
   Nothing steers it towards a pre-computed answer: equilibrium is simply
   where the two rates meet.

   The rate constants follow a simplified Arrhenius / van 't Hoff model:
     kf(T) = kf,ref · exp(−Ea,f/R · (1/T − 1/Tref))
     K(T)  = Kref   · exp(−ΔH/R  · (1/T − 1/Tref))
     kr(T) = kf(T) / K(T)                 (so Ea,r = Ea,f − ΔH)
   A catalyst lowers Ea by the same amount in both directions, so it
   multiplies kf and kr by the same factor and leaves K alone.

   Kc as the tool displays it is always calculated from the simulated
   equilibrium concentrations. K(T) above is only the model's rate-constant
   ratio; the Kc panel shows the two agreeing, which is the A-level point that
   Kc = kf/kr for a one-step reaction.

   Pressure is changed the way it is in a real sealed system: by changing the
   volume. Total pressure is p = n_total·R·T/V, so it also moves as the
   reaction changes the number of gas molecules.

   The particles in the chamber (particles.js) are a separate visual layer
   whose numbers are tied to these amounts (see that file). */
(function () {
'use strict';

const R = 8.314;            // J K⁻¹ mol⁻¹
const ATM = 101.325;        // kPa

/* ─── The reactions ────────────────────────────────────────────────────────
   species: key, display name, coefficient nu (negative for reactants).
   T in kelvin; kfRef is the uncatalysed forward rate constant at Tref;
   Kref is Kc at Tref; Ea, dH and catEa in J mol⁻¹.
   V0 in dm³; scale is particles drawn per mole, so the chamber holds one
   particle for every 1/scale mol.
   generic: the lettered reactions, where the teacher picks exothermic or
   endothermic; real ones carry their own ΔH.
   pressure: 'atm' for the real gases, 'rel' for the lettered ones.
   mixes: starting amounts in mol for the preset mixtures. */
const REACTIONS = {
  ab: {
    id: 'ab', name: 'A ⇌ B', short: 'A ⇌ B', generic: true, pressure: 'rel',
    species: [{ k: 'A', name: 'A', nu: -1 }, { k: 'B', name: 'B', nu: 1 }],
    Tref: 400, T0: 400, Tmin: 350, Tmax: 450, Tstep: 25,
    Kref: 3.0, kfRef: 0.18, EaLow: 20000, dHmag: 30000, catEa: 3500,
    V0: 1.0, scale: 80,
    mixes: { reactants: [0.9, 0], products: [0, 0.9], equal: [0.45, 0.45] },
    kind: 'Isomerisation-style: one particle changes into another.'
  },
  abcd: {
    id: 'abcd', name: 'A + B ⇌ C + D', short: 'A + B ⇌ C + D', generic: true, pressure: 'rel',
    species: [{ k: 'A', name: 'A', nu: -1 }, { k: 'B', name: 'B', nu: -1 }, { k: 'C', name: 'C', nu: 1 }, { k: 'D', name: 'D', nu: 1 }],
    Tref: 400, T0: 400, Tmin: 350, Tmax: 450, Tstep: 25,
    Kref: 4.0, kfRef: 0.6, EaLow: 20000, dHmag: 30000, catEa: 3500,
    V0: 1.0, scale: 80,
    mixes: { reactants: [0.8, 0.6, 0, 0], products: [0, 0, 0.7, 0.5], equal: [0.35, 0.35, 0.35, 0.35] },
    kind: 'Two particles collide and swap partners to make two new particles.'
  },
  hi: {
    id: 'hi', name: 'H₂(g) + I₂(g) ⇌ 2HI(g)', short: 'H₂ + I₂ ⇌ 2HI', generic: false, pressure: 'atm',
    species: [{ k: 'H2', name: 'H₂', nu: -1 }, { k: 'I2', name: 'I₂', nu: -1 }, { k: 'HI', name: 'HI', nu: 2 }],
    Tref: 700, T0: 700, Tmin: 650, Tmax: 800, Tstep: 25,
    Kref: 54.0, kfRef: 2.2, Ea: 100000, dH: -9600, catEa: 3500,
    V0: 1.0, scale: 80,
    mixes: { reactants: [0.5, 0.4, 0], products: [0, 0, 1.0], equal: [0.35, 0.35, 0.35] },
    kind: 'Hydrogen and iodine gases react to form hydrogen iodide.'
  },
  haber: {
    id: 'haber', name: 'N₂(g) + 3H₂(g) ⇌ 2NH₃(g)', short: 'N₂ + 3H₂ ⇌ 2NH₃', generic: false, pressure: 'atm',
    species: [{ k: 'N2', name: 'N₂', nu: -1 }, { k: 'H2', name: 'H₂', nu: -3 }, { k: 'NH3', name: 'NH₃', nu: 2 }],
    // Kc at 723 K from Kp ≈ 4.5 × 10⁻⁵ atm⁻² (the textbook order of magnitude at 450 °C).
    Tref: 723, T0: 723, Tmin: 623, Tmax: 823, Tstep: 25,
    Kref: 0.158, kfRef: 0.0054, Ea: 90000, dH: -92000, catEa: 9700,
    V0: 1.0, scale: 30,
    // Filled 1 : 3 to 200 atm at 450 °C in a 1.00 dm³ vessel: 3.37 mol of gas.
    mixes: { reactants: [0.8425, 2.5275, 0], products: [0, 0, 1.6842], equal: [0.5616, 1.1232, 1.1232] },
    kind: 'The Haber process: nitrogen and hydrogen make ammonia over an iron catalyst.'
  }
};

// Volume steps for the pressure buttons, as multiples of the starting volume:
// pressure × 0.8, × 1, × 1.33 and × 2 at the moment of the change.
const V_STEPS = [1.25, 1, 0.75, 0.5];

/* ─── Rate constants and K at temperature T ───────────────────────────── */
function eaForward(rx, exo) {
  if (!rx.generic) return rx.Ea;
  // Keep both activation energies positive: the endothermic direction has the higher barrier.
  return exo ? rx.EaLow : rx.EaLow + rx.dHmag;
}
function deltaH(rx, exo) { return rx.generic ? (exo ? -rx.dHmag : rx.dHmag) : rx.dH; }
function Kc_T(rx, T, exo) { return rx.Kref * Math.exp(-deltaH(rx, exo) / R * (1 / T - 1 / rx.Tref)); }
function kf_T(rx, T, exo, cat) {
  let k = rx.kfRef * Math.exp(-eaForward(rx, exo) / R * (1 / T - 1 / rx.Tref));
  if (cat) k *= Math.exp(rx.catEa / (R * T));
  return k;
}
function rateConstants(rx, T, exo, cat) {
  const kf = kf_T(rx, T, exo, cat), K = Kc_T(rx, T, exo);
  return { kf, kr: kf / K, K };
}
const dn = rx => rx.species.reduce((s, sp) => s + sp.nu, 0);   // change in moles of gas

/* ─── Mass-action rates ────────────────────────────────────────────────── */
function rates(rx, c, kf, kr) {
  let f = kf, r = kr;
  rx.species.forEach((sp, i) => {
    const ci = Math.max(0, c[i]);
    if (sp.nu < 0) f *= Math.pow(ci, -sp.nu); else r *= Math.pow(ci, sp.nu);
  });
  return { f, r };
}
// Q (or Kc, when the concentrations are at equilibrium): products over reactants.
function quotient(rx, c) {
  let num = 1, den = 1;
  rx.species.forEach((sp, i) => {
    if (sp.nu > 0) num *= Math.pow(c[i], sp.nu); else den *= Math.pow(c[i], -sp.nu);
  });
  return den > 0 ? num / den : Infinity;
}

/* ─── The simulation state ─────────────────────────────────────────────── */
class Sim {
  constructor(rxId) { this.load(rxId); }

  load(rxId, mix = 'reactants', opts = {}) {
    this.rx = REACTIONS[rxId];
    this.exo = opts.exo !== undefined ? opts.exo : (this.exo !== undefined ? this.exo : true);
    this.T = opts.T || this.rx.T0;
    this.cat = !!opts.cat;
    this.vStep = 1;
    this.V = this.rx.V0;
    const amounts = Array.isArray(mix) ? mix : this.rx.mixes[mix];
    this.n = amounts.slice();
    this.t = 0;
    this.xi = 0;               // extent of reaction since the last reset, mol (forward positive)
    this.addTotal = this.n.map(() => 0);
    this.onEqChange();
  }

  // Anything that moves the system away from equilibrium resets the clock
  // that times how long the system takes to get back.
  onEqChange() { this.segStart = this.t; this.segC0 = this.conc(); this.eqAt = null; this.eqSince = null; }

  conc() { return this.n.map(v => v / this.V); }
  k() { return rateConstants(this.rx, this.T, this.exo, this.cat); }
  rates() { const k = this.k(); return rates(this.rx, this.conc(), k.kf, k.kr); }
  Q() { return quotient(this.rx, this.conc()); }
  nTotal() { return this.n.reduce((a, b) => a + b, 0); }
  // Total pressure in kPa (V in dm³ → m³).
  pressure() { return this.nTotal() * R * this.T / (this.V / 1000) / 1000; }
  dH() { return deltaH(this.rx, this.exo); }

  // dn/dt for amounts n (mol) in volume V.
  deriv(n, kf, kr) {
    const c = n.map(v => v / this.V), r = rates(this.rx, c, kf, kr), net = (r.f - r.r) * this.V;
    return { d: this.rx.species.map(sp => sp.nu * net), net };
  }

  // Advance the model by dt seconds of simulated time. Returns the extent
  // advanced, in mol. The step shrinks while things change quickly, so no
  // amount can overshoot below zero or oscillate.
  step(dt) {
    const k = this.k();
    let left = dt, advanced = 0, guard = 0;
    while (left > 1e-9 && guard++ < 2000) {
      const d0 = this.deriv(this.n, k.kf, k.kr);
      let h = Math.min(left, 0.02);
      this.n.forEach((v, i) => {
        const rate = Math.abs(d0.d[i]);
        if (rate > 1e-12) h = Math.min(h, Math.max(1e-5, 0.02 * Math.max(v, 1e-4) / rate));
      });
      const n0 = this.n;
      const add = (a, b, s) => a.map((v, i) => v + b[i] * s);
      const k1 = d0, k2 = this.deriv(add(n0, k1.d, h / 2), k.kf, k.kr), k3 = this.deriv(add(n0, k2.d, h / 2), k.kf, k.kr), k4 = this.deriv(add(n0, k3.d, h), k.kf, k.kr);
      const net = (k1.net + 2 * k2.net + 2 * k3.net + k4.net) / 6;
      // Advance along the extent, so every species moves by exactly its coefficient:
      // atoms are conserved to rounding error however many steps are taken.
      const dxi = net * h;
      this.n = n0.map((v, i) => Math.max(0, v + this.rx.species[i].nu * dxi));
      this.xi += dxi; advanced += dxi;
      left -= h;
    }
    this.t += dt;
    return advanced;
  }

  // Teacher's changes.
  addSpecies(i, mol) {
    const was = this.n[i];
    this.n[i] = Math.max(0, this.n[i] + mol);
    this.addTotal[i] += this.n[i] - was;
    this.onEqChange();
    return this.n[i] - was;
  }
  setT(T) { this.T = Math.min(this.rx.Tmax, Math.max(this.rx.Tmin, T)); this.onEqChange(); }
  setCat(on) { this.cat = on; this.onEqChange(); }
  setExo(exo) { this.exo = exo; this.onEqChange(); }
  setVStep(i) {
    i = Math.max(0, Math.min(V_STEPS.length - 1, i));
    this.vStep = i; this.V = this.rx.V0 * V_STEPS[i];
    this.onEqChange();
  }
}

/* ─── Equilibrium, solved directly ─────────────────────────────────────────
   Used only for things the running simulation can't show on its own: the
   Haber yield-against-temperature chart, checking a challenge has a sensible
   answer, and printing worksheet data. It solves Q(ξ) = K by bisection on the
   extent ξ, for the same K the kinetic model uses, so it agrees with where
   the simulation ends up. */
function solveEq(rx, n0, V, K) {
  let lo = -Infinity, hi = Infinity;
  rx.species.forEach((sp, i) => {
    const lim = -n0[i] / sp.nu;        // ξ at which species i runs out
    if (sp.nu < 0) hi = Math.min(hi, lim); else lo = Math.max(lo, lim);
  });
  const f = xi => {
    const c = n0.map((v, i) => Math.max(1e-300, v + rx.species[i].nu * xi) / V);
    return Math.log(quotient(rx, c)) - Math.log(K);
  };
  let a = lo, b = hi;
  for (let it = 0; it < 200; it++) {
    const m = (a + b) / 2;
    if (f(m) > 0) b = m; else a = m;
  }
  const xi = (a + b) / 2;
  return n0.map((v, i) => Math.max(0, v + rx.species[i].nu * xi));
}

// Run a copy of the model from given conditions until the rates agree to
// within the same tolerance the live status uses; returns the time taken and
// the final concentrations. Used for the catalyst comparison.
const EQ_TOL = 0.03;
function timeToEq(rx, n0, V, T, exo, cat) {
  const s = Object.create(Sim.prototype);
  Object.assign(s, { rx, n: n0.slice(), V, T, exo, cat, t: 0, xi: 0, addTotal: n0.map(() => 0) });
  const trace = [];
  let tEq = null;
  for (let i = 0; i < 6000; i++) {
    if (i % 5 === 0) trace.push([s.t, s.conc()]);
    const r = s.rates();
    const imb = Math.abs(r.f - r.r) / Math.max(r.f, r.r, 1e-12);
    if (imb < EQ_TOL && tEq === null) tEq = s.t;
    if (tEq !== null && s.t > tEq * 1.8 + 2) break;
    s.step(0.05);
  }
  return { tEq, c: s.conc(), trace };
}

window.EQ_MODEL = { R, ATM, REACTIONS, V_STEPS, Sim, rates, quotient, Kc_T, kf_T, rateConstants, deltaH, dn, solveEq, timeToEq, EQ_TOL };
})();
