/* Dynamic Equilibrium Lab — 2. the particle chamber (rendering).

   A visual layer over the model in model.js, not a molecular-dynamics
   simulation. The model decides how much reaction happens; this file shows it
   happening as particles.

   How the two stay tied together:
   - The chamber holds one particle for every 1/scale mol of each species, so
     particle numbers are the model's amounts, rounded.
   - Reaction events are drawn as a random (Poisson) process at the model's
     forward and reverse rates, converted to events per second:
       events/s = rate (mol dm⁻³ s⁻¹) × V (dm³) × scale (particles mol⁻¹).
     Because real events arrive at random, the counts fluctuate: at
     equilibrium the forward and reverse counts agree on average, not every
     frame, which is what the rate readouts are meant to show.
   - A gentle feedback keeps the net number of events locked to the model's
     extent of reaction: if the drawn particles run ahead of the model, forward
     events are made a little less likely and reverse ones a little more
     likely, and the other way round. It never forces an event, so the gross
     counts stay honest, and particle numbers stay within a particle or two of
     the model.

   The chamber is the vessel: its right-hand wall is a piston, so changing the
   pressure (the volume) visibly crowds or spreads the same particles. */
(function () {
'use strict';

// Species colours. Hex, not oklch: canvas reads them directly (see CLAUDE.md).
const COL = {
  A: '#47b5fa', B: '#f5b14c', C: '#6fe3a3', D: '#b199f4',
  N2: '#47b5fa', H2: '#dfe6ee', NH3: '#6fe3a3', I2: '#b199f4', HI: '#f5b14c'
};
const EVENT = { f: '#edf2f8', r: '#ff8a7a' };      // forward: solid light ring; reverse: dashed coral ring
const INK = '#07111d';                             // letters on the particles

// Each species is drawn as a small molecule: a list of atoms [dx, dy, radius]
// in units of the base radius, plus an optional letter. Shapes differ as well
// as colours, so nothing depends on colour alone.
const SHAPES = {
  A: { atoms: [[0, 0, 1]], letter: 'A' },
  B: { atoms: 'square', letter: 'B' },
  C: { atoms: [[-0.62, 0, 0.8], [0.62, 0, 0.8]], letter: 'C' },
  D: { atoms: [[0, -0.6, 0.66], [-0.56, 0.36, 0.66], [0.56, 0.36, 0.66]], letter: 'D' },
  N2: { atoms: [[-0.52, 0, 0.78], [0.52, 0, 0.78]] },
  H2: { atoms: [[-0.33, 0, 0.5], [0.33, 0, 0.5]] },
  NH3: { atoms: [[0, 0, 0.8], [0, -0.95, 0.46], [-0.82, 0.5, 0.46], [0.82, 0.5, 0.46]] },
  I2: { atoms: [[-0.72, 0, 1.0], [0.72, 0, 1.0]] },
  HI: { atoms: [[-0.62, 0, 0.5], [0.34, 0, 0.95]] }
};

function shade(hex, f) {
  const n = parseInt(hex.slice(1), 16);
  const ch = s => Math.round(Math.min(255, Math.max(0, ((n >> s) & 255) * f)));
  return `rgb(${ch(16)},${ch(8)},${ch(0)})`;
}

// Draw one molecule of species k centred at x, y.
function drawMolecule(ctx, k, x, y, r, ang, alpha = 1, letters = true) {
  const sh = SHAPES[k], col = COL[k];
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.translate(x, y);
  ctx.rotate(ang);
  ctx.lineWidth = Math.max(1, r * 0.14);
  ctx.strokeStyle = shade(col, 0.45);
  ctx.fillStyle = col;
  if (sh.atoms === 'square') {
    const s = r * 0.9, q = r * 0.3;
    ctx.beginPath();
    if (ctx.roundRect) ctx.roundRect(-s, -s, 2 * s, 2 * s, q); else ctx.rect(-s, -s, 2 * s, 2 * s);
    ctx.fill(); ctx.stroke();
  } else {
    sh.atoms.forEach(([dx, dy, rr]) => { ctx.beginPath(); ctx.arc(dx * r, dy * r, rr * r, 0, 7); ctx.fill(); ctx.stroke(); });
    // A small highlight gives the atoms some form without a gradient.
    ctx.fillStyle = 'rgba(255,255,255,.28)';
    sh.atoms.forEach(([dx, dy, rr]) => { ctx.beginPath(); ctx.arc(dx * r - rr * r * 0.32, dy * r - rr * r * 0.32, rr * r * 0.3, 0, 7); ctx.fill(); });
  }
  if (sh.letter && letters) {
    ctx.rotate(-ang);
    ctx.fillStyle = INK;
    ctx.font = `800 ${Math.round(r * 1.05)}px 'Plus Jakarta Sans', system-ui, sans-serif`;
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText(sh.letter, 0, r * 0.06);
  }
  ctx.restore();
}

function poisson(mean) {
  if (mean <= 0) return 0;
  if (mean > 25) return Math.max(0, Math.round(mean + Math.sqrt(mean) * gauss()));
  const L = Math.exp(-mean); let k = 0, p = 1;
  do { k++; p *= Math.random(); } while (p > L);
  return k - 1;
}
function gauss() { let u = 0, v = 0; while (!u) u = Math.random(); while (!v) v = Math.random(); return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v); }

class Chamber {
  constructor(canvas) {
    this.cv = canvas;
    this.parts = [];
    this.rings = [];
    this.due = [];
    this.events = [];           // [simTime, 'f'|'r'] for the rate readouts
    this.xiVis = 0;             // net events drawn since reset (forward positive)
    this.piston = 1;            // drawn fraction of the full width, eased towards the model's
    this.reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
    this.flash = { f: 0, r: 0 };
    this.zoom = 1;
    this.w = 1; this.h = 1;
  }

  /* Layout: the vessel spans the canvas; the piston sits at V / Vmax of its width. */
  geom() {
    const pad = 12 * this.zoom, left = pad, top = pad + this.headH, bottom = this.h - pad;
    const full = this.w - 2 * pad - 14 * this.zoom;
    return { left, top, bottom, full, right: left + full * this.piston };
  }

  resize(zoom = 1) {
    const r = this.cv.getBoundingClientRect(), dpr = Math.min(window.devicePixelRatio || 1, 2.5);
    const W = Math.max(1, Math.round(r.width * dpr)), H = Math.max(1, Math.round(r.height * dpr));
    if (this.cv.width !== W || this.cv.height !== H) { this.cv.width = W; this.cv.height = H; }
    this.ctx = this.cv.getContext('2d');
    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    const ow = this.w, oh = this.h;
    this.w = r.width; this.h = r.height; this.zoom = zoom;
    this.headH = 0;
    // Particle size from the room available, so a board and a phone both look full but not packed.
    const area = Math.max(1, (this.w - 40) * (this.h - 30));
    this.baseR = Math.max(4.5, Math.min(15 * Math.max(1, zoom * 0.8), Math.sqrt(area / Math.max(1, this.target || 120) / Math.PI) * 0.38));
    // Keep the picture when the box changes size. A box that had no size (a
    // hidden tab, say) has no picture to keep: scatter the particles afresh.
    if (ow > 60 && oh > 60) this.parts.forEach(p => { p.x *= this.w / ow; p.y *= this.h / oh; });
    else if (this.w > 60 && this.h > 60) { const g = this.geom(); this.parts.forEach(p => { const q = this.make(p.k, g); p.x = q.x; p.y = q.y; }); }
  }

  sizeFor(total) { this.target = total; this.resize(this.zoom); }

  /* Build the particles from scratch to match the model's amounts. */
  rebuild(sim) {
    this.sim = sim;
    this.parts = []; this.rings = []; this.due = []; this.events = [];
    this.xiVis = 0;
    this.piston = this.pistonTarget(sim);
    const counts = sim.n.map(v => Math.round(v * sim.rx.scale));
    this.sizeFor(Math.max(80, counts.reduce((a, b) => a + b, 0)));
    const g = this.geom();
    sim.rx.species.forEach((sp, i) => { for (let j = 0; j < counts[i]; j++) this.parts.push(this.make(sp.k, g)); });
    this.base = counts.slice();      // particles present when the extent was zero
  }

  pistonTarget(sim) { return sim.V / (sim.rx.V0 * EQ_MODEL.V_STEPS[0]); }

  speed() {
    // Particles move faster when it's hotter (speed ∝ √T), slower when reduced motion is asked for.
    const T = this.sim ? this.sim.T / this.sim.rx.Tref : 1;
    return (this.reduced ? 14 : 62) * Math.sqrt(T) * Math.max(0.8, this.zoom * 0.9);
  }

  make(k, g, x, y) {
    g = g || this.geom();
    const r = this.baseR, a = Math.random() * Math.PI * 2, v = this.speed() * (0.6 + Math.random() * 0.8);
    return {
      k, x: x !== undefined ? x : g.left + r + Math.random() * Math.max(1, g.right - g.left - 2 * r),
      y: y !== undefined ? y : g.top + r + Math.random() * Math.max(1, g.bottom - g.top - 2 * r),
      vx: Math.cos(a) * v, vy: Math.sin(a) * v, ang: Math.random() * 7, spin: (Math.random() - 0.5) * 1.2,
      busy: false, born: 0
    };
  }

  count(k) { let n = 0; for (const p of this.parts) if (p.k === k && !p.gone) n++; return n; }
  free(k) { return this.parts.filter(p => p.k === k && !p.busy && !p.gone); }

  /* Particles added or taken out by the teacher (amounts already changed in the model). */
  add(k, num) {
    const g = this.geom();
    for (let j = 0; j < num; j++) {
      // In through the left wall, so the change can be seen arriving.
      const p = this.make(k, g, g.left + this.baseR + Math.random() * 20, g.top + this.baseR + Math.random() * (g.bottom - g.top - 2 * this.baseR));
      p.vx = Math.abs(p.vx) + 20; p.born = 1;
      this.parts.push(p);
    }
    const i = this.sim.rx.species.findIndex(sp => sp.k === k);
    this.base[i] += num;
  }
  remove(k, num) {
    const pool = this.free(k);
    let done = 0;
    for (; done < num && pool.length; done++) {
      const p = pool.splice(Math.floor(Math.random() * pool.length), 1)[0];
      p.gone = 1; p.busy = true;       // fades out, then is dropped
    }
    const i = this.sim.rx.species.findIndex(sp => sp.k === k);
    this.base[i] -= done;
    return done;
  }

  /* One reaction event, forward or reverse. Reactions only happen where
     particles are already touching, so nothing is pulled across the chamber:
     the event waits for a collision of the right particles. The reach grows
     slowly the longer it waits, so a rare pairing (two of the last few I₂
     molecules, say) is never held up for long. Returns false to keep waiting. */
  react(dir, simT, wait) {
    const rx = this.sim.rx, r = this.baseR;
    const need = [], make = [];
    rx.species.forEach(sp => {
      const into = dir === 'f' ? sp.nu < 0 : sp.nu > 0;
      for (let j = 0; j < Math.abs(sp.nu); j++) (into ? need : make).push(sp.k);
    });
    const pool0 = this.free(need[0]);
    if (!pool0.length) return false;
    let a, b = null;
    if (need.length === 1) a = pool0[Math.floor(Math.random() * pool0.length)];   // A → B needs no partner
    else {
      // The closest touching pair of the two kinds needed.
      const reach = r * (2.6 + Math.max(0, wait - 0.4) * 5), pool1 = need[1] === need[0] ? pool0 : this.free(need[1]);
      let bd = reach * reach;
      for (const p of pool0) for (const q of pool1) {
        if (p === q) continue;
        const d = (p.x - q.x) ** 2 + (p.y - q.y) ** 2;
        if (d < bd) { bd = d; a = p; b = q; }
      }
      if (!a) return false;
    }
    const chosen = b ? [a, b] : [a];
    // A third or fourth reactant (the other H₂ in the Haber process) is taken
    // from nearby and fades out where it is, rather than flying in.
    for (let j = chosen.length; j < need.length; j++) {
      let best = null, bd = Infinity;
      for (const p of this.parts) {
        if (p.k !== need[j] || p.busy || p.gone || chosen.includes(p)) continue;
        const d = (p.x - a.x) ** 2 + (p.y - a.y) ** 2;
        if (d < bd) { bd = d; best = p; }
      }
      if (!best) return false;
      chosen.push(best);
    }
    const cx = b ? (a.x + b.x) / 2 : a.x, cy = b ? (a.y + b.y) / 2 : a.y;
    const g = this.geom();
    chosen.forEach((p, j) => { if (j < 2) p.gone = 2; else { p.gone = 1; p.busy = true; } });
    // Products start where the colliding particles were and carry on outwards.
    make.forEach((k, j) => {
      // Extra products (the four molecules from 2NH₃) spread out from the collision point.
      const spread = Math.random() * 7, from = j < 2 && chosen[j] ? chosen[j] : { x: cx + Math.cos(spread) * r, y: cy + Math.sin(spread) * r };
      const ang = !b ? Math.random() * 7 : j < 2 ? Math.atan2(from.y - cy, from.x - cx) : spread;
      // Born inside the walls, so a molecule made against a wall doesn't hop.
      const m = r * 1.6, x = Math.min(g.right - m, Math.max(g.left + m, from.x)), y = Math.min(g.bottom - m, Math.max(g.top + m, from.y));
      const q = this.make(k, g, x, y), v = this.speed();
      const dx = Math.cos(ang) || 0.01, dy = Math.sin(ang);
      q.vx = dx * v; q.vy = dy * v;
      if (!b) { q.vx = a.vx; q.vy = a.vy; q.ang = a.ang; }
      this.parts.push(q);
    });
    this.rings.push({ x: cx, y: cy, dir, life: 1 });
    this.events.push([simT, dir, cx, cy]);
    this.xiVis += dir === 'f' ? 1 : -1;
    this.flash[dir] = 1;
    return true;
  }

  /* Advance the chamber by dt of simulated time, given the model's rates now. */
  tick(dt, simT, rf, rr) {
    const sim = this.sim;
    // New events for this interval, with the feedback that ties the drawn extent
    // to the model's. Events still waiting for a collision count as done here.
    const scaleEv = sim.V * sim.rx.scale;
    const queued = this.due.reduce((s, e) => s + (e.dir === 'f' ? 1 : -1), 0);
    const d = this.xiVis + queued - sim.xi * sim.rx.scale;
    const g = Math.max(-4, Math.min(4, 0.9 * d));
    const nf = poisson(rf * scaleEv * dt * Math.exp(-g)), nr = poisson(rr * scaleEv * dt * Math.exp(g));
    for (let i = 0; i < nf; i++) this.due.push({ dir: 'f', wait: 0 });
    for (let i = 0; i < nr; i++) this.due.push({ dir: 'r', wait: 0 });
    // Try the waiting events in random order, so neither direction always goes first.
    for (let i = this.due.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [this.due[i], this.due[j]] = [this.due[j], this.due[i]]; }
    this.due = this.due.filter(e => { e.wait += dt; return !this.react(e.dir, simT, e.wait) && e.wait < 8; });
    this.events = this.events.filter(e => e[0] > simT - 12);
    this.move(dt);
  }

  // Motion, rings and fades. Runs on real time scaled by the speed, so
  // STEP and PAUSE freeze it with the model.
  move(dt) {
    const g = this.geom();
    // Ease the piston; particles caught outside are carried in with it.
    const want = this.pistonTarget(this.sim);
    if (Math.abs(this.piston - want) > 1e-4) {
      const old = this.piston;
      this.piston += (want - this.piston) * Math.min(1, dt * 6);
      if (Math.abs(this.piston - want) < 0.002) this.piston = want;
      const ng = this.geom(), k = (ng.right - ng.left) / Math.max(1, g.right - g.left);
      if (this.piston < old) this.parts.forEach(p => { p.x = ng.left + (p.x - ng.left) * k; });
    }
    const G = this.geom(), r = this.baseR, sp = this.speed();
    for (const p of this.parts) {
      if (p.busy && !p.gone) continue;
      p.x += p.vx * dt; p.y += p.vy * dt; p.ang += p.spin * dt;
      const m = r * (p.k === 'I2' ? 1.6 : p.k === 'C' ? 1.4 : 1.1);
      if (p.x < G.left + m) { p.x = G.left + m; p.vx = Math.abs(p.vx); }
      if (p.x > G.right - m) { p.x = G.right - m; p.vx = -Math.abs(p.vx); }  // the piston face
      if (p.y < G.top + m) { p.y = G.top + m; p.vy = Math.abs(p.vy); }
      if (p.y > G.bottom - m) { p.y = G.bottom - m; p.vy = -Math.abs(p.vy); }
      // Drift the speed towards the temperature's, so heating visibly speeds them up.
      const v = Math.hypot(p.vx, p.vy) || 1, f = 1 + (sp / v - 1) * Math.min(1, dt * 0.5);
      if (v < sp * 0.5 || v > sp * 1.6) { p.vx *= f; p.vy *= f; }
      if (p.born) p.born = Math.max(0, p.born - dt * 2);
    }
    this.parts = this.parts.filter(p => p.gone !== 2 && !(p.gone === 1 && (p.fade = (p.fade || 1) - dt * 2.5) <= 0));
    this.rings.forEach(q => { q.life -= dt * (this.reduced ? 1.2 : 1.6); });
    this.rings = this.rings.filter(q => q.life > 0);
    this.flash.f = Math.max(0, this.flash.f - dt * 3); this.flash.r = Math.max(0, this.flash.r - dt * 3);
  }

  // Forward and reverse events over the last `win` seconds of simulated time.
  recent(simT, win) {
    let f = 0, r = 0;
    for (const e of this.events) if (e[0] > simT - win) { if (e[1] === 'f') f++; else r++; }
    return { f, r };
  }

  /* Draw. opts.paused shows the last few seconds of events frozen as markers. */
  draw(opts = {}) {
    const ctx = this.ctx; if (!ctx) return;
    const z = this.zoom, G = this.geom();
    ctx.clearRect(0, 0, this.w, this.h);
    // Vessel walls, with the piston on the right.
    ctx.fillStyle = '#0b1726';
    ctx.fillRect(G.left, G.top, G.right - G.left, G.bottom - G.top);
    // Behind the piston: hatched, so it reads as outside the gas.
    const xEnd = G.left + G.full + 14 * z, pw = 8 * z;
    ctx.save();
    ctx.beginPath(); ctx.rect(G.right, G.top, xEnd - G.right, G.bottom - G.top); ctx.clip();
    ctx.fillStyle = '#070f1a'; ctx.fillRect(G.right, G.top, xEnd - G.right, G.bottom - G.top);
    ctx.strokeStyle = '#122033'; ctx.lineWidth = 1;
    for (let x = G.right - (G.bottom - G.top); x < xEnd; x += 12 * z) { ctx.beginPath(); ctx.moveTo(x, G.bottom); ctx.lineTo(x + (G.bottom - G.top), G.top); ctx.stroke(); }
    ctx.restore();
    ctx.strokeStyle = '#2c3d52'; ctx.lineWidth = 1.5;
    ctx.strokeRect(G.left + 0.5, G.top + 0.5, xEnd - G.left - 1, G.bottom - G.top - 1);
    // The piston: a plate across the vessel and its rod out to the right.
    const mid = (G.top + G.bottom) / 2;
    ctx.fillStyle = '#3a4a60';
    ctx.fillRect(G.right + pw, mid - 3.5 * z, xEnd - G.right - pw, 7 * z);
    ctx.fillStyle = '#8b9bb0';
    ctx.fillRect(G.right, G.top + 1, pw, G.bottom - G.top - 2);
    ctx.fillStyle = '#56657a';
    ctx.fillRect(G.right + pw * 0.35, G.top + 1, pw * 0.3, G.bottom - G.top - 2);

    // Rings where reactions happened: solid for forward, dashed for reverse.
    for (const q of this.rings) {
      ctx.save();
      ctx.globalAlpha = Math.max(0, q.life) * (opts.paused ? 0.9 : 0.85);
      ctx.strokeStyle = EVENT[q.dir]; ctx.lineWidth = 2 * Math.max(1, z * 0.8);
      if (q.dir === 'r') ctx.setLineDash([4 * z, 3 * z]);
      const rad = this.baseR * (this.reduced ? 1.9 : 1.3 + (1 - q.life) * 1.6);
      ctx.beginPath(); ctx.arc(q.x, q.y, rad, 0, 7); ctx.stroke();
      ctx.restore();
    }
    // Paused: every event in the last few seconds stays marked, so the class can
    // see both reactions were still going on at the moment it stopped.
    if (opts.paused && opts.simT !== undefined) {
      for (const e of this.events) {
        const age = opts.simT - e[0];
        if (age > 4 || age < 0) continue;
        ctx.save();
        ctx.globalAlpha = 0.9 - age * 0.18;
        ctx.strokeStyle = EVENT[e[1]]; ctx.lineWidth = 2 * Math.max(1, z * 0.8);
        if (e[1] === 'r') ctx.setLineDash([4 * z, 3 * z]);
        ctx.beginPath(); ctx.arc(e[2], e[3], this.baseR * 1.9, 0, 7); ctx.stroke();
        ctx.restore();
      }
    }
    const letters = this.baseR >= 6.5;
    for (const p of this.parts) {
      const a = p.gone === 1 ? Math.max(0, p.fade || 1) : 1;
      drawMolecule(ctx, p.k, p.x, p.y, this.baseR, p.ang, a, letters);
    }
  }
}

window.EQ_PARTICLES = { Chamber, drawMolecule, COL, EVENT, SHAPES };
})();
