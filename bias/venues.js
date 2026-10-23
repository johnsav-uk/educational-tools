/* Bias: the clubs beyond Ashcombe. Loaded by index.html a moment after the page; uses its drawing helpers
   through window.BiasVenueHost (makeCanvas, vr, rgba, PAL, Art and the seeded random numbers) and adds each club to VENUES. A venue gives:
   name, place, ends (what each end faces, for the end summary), pal (colours over Ashcombe's), trees (kind:
   how many variants), spots(add, R, r) (where the trees stand), pavilion() (drawn on the 24 m x 9.6 m frame
   Ashcombe's uses, ground at the bottom), band(seed) (the country beyond, 2400 x 140), far (a distant landmark,
   or {} for none), flag (the national flag on the pole by the pavilion), dress (what the
   crowd wears), birds and ambience (the club's sounds) and roses (flowers in the pavilion-side hedges). Looks only: nothing here touches the play. */
(() => {
  const H = window.BiasVenueHost, { VENUES, Art, PAL, starPath, makeCanvas, vr, rgba, mixRgb, shadeRgb, clamp, TAU } = H, vrand = H.rand, reseed = H.seed;
  // ---- shared drawing ----
  const frame = () => {   // the pavilion frame: x(m), y(m) in metres from the bottom-left
    const PX = 46, wm = 24, hm = 9.6, c = makeCanvas(wm * PX, hm * PX), g = c.getContext('2d');
    c.wm = wm; c.hm = hm;
    return { c, g, PX, x: m => m * PX, y: m => c.height - m * PX };
  };
  const sunWash = (g, c) => {   // the afternoon light from the left, as on Ashcombe's pavilion
    const sg = g.createLinearGradient(0, 0, c.width, 0); sg.addColorStop(0, 'rgba(255,236,190,.10)'); sg.addColorStop(1, 'rgba(0,0,0,.08)');
    g.globalCompositeOperation = 'source-atop'; g.fillStyle = sg; g.fillRect(0, 0, c.width, c.height); g.globalCompositeOperation = 'source-over';
  };
  const sign = (F, text, x0, x1, y0, y1, board, ink, font) => {
    const { g, x, y, PX } = F;
    g.fillStyle = board; g.fillRect(x(x0), y(y1), x(x1 - x0), y(y0) - y(y1));
    g.fillStyle = ink; g.font = font || `600 ${Math.round(PX * 0.30)}px Georgia, serif`; g.textAlign = 'center'; g.textBaseline = 'middle';
    g.fillText(text, x((x0 + x1) / 2), y((y0 + y1) / 2) + 1);
  };
  const ridge = (base, amp, f, ph) => px => base + amp * (0.6 * Math.sin(px * f + ph) + 0.3 * Math.sin(px * f * 2.3 + ph * 1.7) + 0.1 * Math.sin(px * f * 5.1 + ph * .3));
  const bandCanvas = seed => { reseed(seed); const cw = 2400, ch = 140, c = makeCanvas(cw, ch); return { c, g: c.getContext('2d'), cw, ch }; };
  const hill = (B, fn, fill) => { const { g, cw, ch } = B; g.beginPath(); g.moveTo(0, ch); for (let px = 0; px <= cw; px += 8) g.lineTo(px, ch - fn(px)); g.lineTo(cw, ch); g.closePath(); g.fillStyle = fill; g.fill(); };
  const clipHill = (B, fn) => { const { g, cw, ch } = B; g.save(); g.beginPath(); g.moveTo(0, ch); for (let px = 0; px <= cw; px += 8) g.lineTo(px, ch - fn(px)); g.lineTo(cw, ch); g.closePath(); g.clip(); };
  const treeLine = (B, base, col, bump) => {   // a ragged line of near trees along the bottom
    const { g, cw, ch } = B; g.fillStyle = col; g.beginPath(); g.moveTo(0, ch);
    let h = base;
    for (let px = 0; px <= cw; px += 5) { h += vr(-4, 4) + (base - h) * 0.06; if (vrand() < .025) h += vr(6, bump); g.lineTo(px, ch - Math.max(8, h + Math.sin(px * .03) * 3)); }
    g.lineTo(cw, ch); g.closePath(); g.fill();
  };
  const airOver = B => {   // the air between here and there
    const { g, cw, ch } = B, hz = g.createLinearGradient(0, 0, 0, ch);
    hz.addColorStop(0, rgba(PAL.haze, .35)); hz.addColorStop(.7, rgba(PAL.haze, .12)); hz.addColorStop(1, rgba(PAL.haze, 0));
    g.globalCompositeOperation = 'source-atop'; g.fillStyle = hz; g.fillRect(0, 0, cw, ch); g.globalCompositeOperation = 'source-over';
    return B.c;
  };
  const leafCol = (L, li) => li < .45 ? mixRgb(L[0], L[1], li / .45) : li < .8 ? mixRgb(L[1], L[2], (li - .45) / .35) : mixRgb(L[2], L[3], Math.min(1, (li - .8) / .2));

  // ---- trees drawn their own way ----
  /* A palm: a ringed trunk with a slight lean, a crown of arching fronds lit from the upper left, and a
     skirt of dead fronds under it. */
  const palm = (variant, opt) => {
    reseed(700 + variant * 13);
    const PX = 30, w = opt.w, h = opt.h, c = makeCanvas(w * PX, h * PX), g = c.getContext('2d'), cw = c.width, ch = c.height;
    const lean = vr(-.6, .6) * PX, topX = cw / 2 + lean, topY = ch * opt.crown, tw = opt.trunk * PX;
    // trunk: a curve from the ground to the crown, banded
    const tx = t => cw / 2 + lean * t * t, ty = t => ch - (ch - topY) * t;
    for (let t = 0; t <= 1; t += .004) {
      const r = tw * (1 - .25 * t), x = tx(t), y = ty(t), band = Math.sin(t * opt.rings) > .6;
      const gr = g.createLinearGradient(x - r, 0, x + r, 0); gr.addColorStop(0, band ? '#a58f72' : '#bba584'); gr.addColorStop(1, band ? '#5d4c3b' : '#6f5c47');
      g.fillStyle = gr; g.fillRect(x - r, y - 2, r * 2, 3);
    }
    // the skirt of dead fronds
    for (let i = 0; i < opt.skirt; i++) {
      const a = Math.PI / 2 + vr(-1.1, 1.1), L = vr(1.2, 2.2) * PX;
      g.strokeStyle = `rgba(${120 + vr(-15, 15) | 0},${96 + vr(-10, 10) | 0},${66 | 0},.9)`; g.lineWidth = vr(2, 4);
      g.beginPath(); g.moveTo(topX, topY + 6); g.quadraticCurveTo(topX + Math.cos(a) * L * .5, topY + L * .3, topX + Math.cos(a) * L * .7, topY + Math.sin(a) * L); g.stroke();
    }
    // fronds: darker ones behind, lighter in front
    const L = opt.leaf;
    for (const pass of [0, 1]) for (let i = 0; i < opt.fronds; i++) {
      const a = -Math.PI / 2 + vr(-1.55, 1.55) + (pass ? 0 : vr(-.3, .3)), len = vr(.75, 1) * opt.frond * PX;
      const ex = topX + Math.cos(a) * len, ey = topY + Math.sin(a) * len * .55 + len * opt.droop * (0.4 + Math.abs(Math.cos(a)));
      const mx = topX + Math.cos(a) * len * .55, my = topY + Math.sin(a) * len * .8 - len * .12;
      const side = -Math.cos(a), base = pass ? .55 + .35 * Math.max(0, side) + vr(-.1, .1) : .25 + vr(0, .15);
      g.strokeStyle = rgba(leafCol(L, base * .8)); g.lineWidth = 2;
      g.beginPath(); g.moveTo(topX, topY); g.quadraticCurveTo(mx, my, ex, ey); g.stroke();
      for (let t = .12; t < 1; t += .045) {
        const u = 1 - t, px = u * u * topX + 2 * u * t * mx + t * t * ex, py = u * u * topY + 2 * u * t * my + t * t * ey;
        const dx = 2 * u * (mx - topX) + 2 * t * (ex - mx), dy = 2 * u * (my - topY) + 2 * t * (ey - my), d = Math.hypot(dx, dy) || 1;
        const ll = (1 - t * .6) * opt.leaflet * PX;
        for (const s of [-1, 1]) {
          const ang = Math.atan2(dy, dx) + s * 0.9, lx = px + Math.cos(ang) * ll, ly = py + Math.sin(ang) * ll + ll * .5;
          const li = clamp(base + (s * side > 0 ? .12 : -.12) + vr(-.12, .12), 0, 1);
          g.strokeStyle = rgba(leafCol(L, li), .95); g.lineWidth = vr(1.2, 2.2);
          g.beginPath(); g.moveTo(px, py); g.lineTo(lx, ly); g.stroke();
        }
      }
    }
    return c;
  };
  /* A Norfolk Island pine: a straight trunk carrying level tiers of branches with gaps of sky between, the
     tiers widest a third of the way up. */
  const norfolk = variant => {
    reseed(800 + variant * 17);
    const PX = 24, w = 10, h = 26, c = makeCanvas(w * PX, h * PX), g = c.getContext('2d'), cw = c.width, ch = c.height, cx = cw / 2;
    const L = [[22, 44, 30], [40, 72, 44], [84, 112, 66], [138, 156, 98]];
    g.fillStyle = '#6b5644'; g.beginPath(); g.moveTo(cx - 6, ch); g.lineTo(cx - 1.5, ch * .02); g.lineTo(cx + 1.5, ch * .02); g.lineTo(cx + 6, ch); g.closePath(); g.fill();
    const top = ch * .03, bottom = ch * .78, n = Math.round((bottom - top) / (1.05 * PX));
    for (let i = 0; i <= n; i++) {
      const t = i / n, y = top + (bottom - top) * t, span = (0.25 + 4.4 * Math.sin(Math.min(1, t * 1.25) * Math.PI / 2) * (1 - .18 * Math.max(0, t - .8) / .2)) * PX * vr(.85, 1.08);
      for (const s of [-1, 1]) {
        const len = span * vr(.8, 1.1), droop = len * .12, lift = len * .1;
        const ex = cx + s * len, ey = y + droop - lift;
        // needles in clumps along the arm, darker underneath
        for (let k = 0; k < len / 2.2; k++) {
          const u = vrand(), px = cx + s * len * u, py = y + droop * Math.sin(u * Math.PI * .9) - lift * u * u + vr(-3, 3);
          const r = (1 - u * .5) * vr(3, 6.5), li = clamp(.55 - .45 * s * .4 + (vrand() - .5) * .35 - (py > y + 2 ? .25 : 0), 0, 1);
          g.fillStyle = rgba(leafCol(L, li), .92); g.beginPath(); g.ellipse(px, py, r * 1.5, r, 0, 0, TAU); g.fill();
        }
        g.fillStyle = rgba(leafCol(L, .55)); g.beginPath(); g.ellipse(ex, ey, 5, 3.5, 0, 0, TAU); g.fill();
      }
      g.fillStyle = rgba(leafCol(L, .5)); g.beginPath(); g.ellipse(cx, y, 5, 4, 0, 0, TAU); g.fill();
    }
    return c;
  };
  Object.assign(Art.treeSpecs, {
    gum: { w: 11, h: 19, crownY: .3, rx: .48, ry: .27, trunk: .32, clumps: 22, dense: .5, open: true,
      bark: ['#f1ebdf', '#b5a892', '#d9cfbe'], leaf: [[46, 54, 40], [92, 104, 72], [150, 158, 114], [200, 202, 160]] },
    norfolk: { w: 10, h: 26, build: norfolk },
    palm: { w: 8, h: 14, build: v => palm(v, { w: 8, h: 14, crown: .2, trunk: .36, rings: 160, fronds: 26, frond: 3.6, droop: .55, leaflet: .55, skirt: 10,
      leaf: [[34, 54, 30], [70, 98, 50], [130, 152, 82], [184, 194, 124]] }) },
    fan: { w: 6, h: 18, build: v => palm(v, { w: 6, h: 18, crown: .1, trunk: .2, rings: 260, fronds: 20, frond: 2.2, droop: .35, leaflet: .4, skirt: 16,
      leaf: [[40, 62, 34], [78, 108, 56], [138, 160, 92], [190, 200, 134]] }) },
    scotspine: { w: 10, h: 16, crownY: .3, rx: .46, ry: .22, trunk: .2, clumps: 20, dense: .8,
      bark: ['#c07a4e', '#6e3f28', '#7a4a30'], leaf: [[22, 40, 32], [44, 72, 52], [92, 118, 78], [140, 156, 104]] },
    birch: { w: 6, h: 15, crownY: .4, rx: .42, ry: .38, trunk: .12, clumps: 18, dense: .65, open: true, marks: true,
      bark: ['#f0ece3', '#b9b3a7', '#8d867a'], leaf: [[52, 70, 36], [100, 124, 56], [164, 178, 92], [210, 214, 138]] },
    cypress: { w: 2.8, h: 13, crownY: .5, rx: .46, ry: .48, trunk: .06, clumps: 16,
      leaf: [[16, 32, 22], [34, 58, 38], [70, 94, 56], [108, 128, 78]] },
    olive: { w: 7.5, h: 7, crownY: .42, rx: .48, ry: .36, trunk: .32, clumps: 22, dense: .85,
      bark: ['#7a7266', '#45403a', '#4a443c'], leaf: [[64, 74, 60], [112, 122, 98], [160, 168, 140], [200, 204, 182]] }
  });

  // ================= Wattle Point, New South Wales =================
  const wattlePavilion = () => {
    const F = frame(), { g, c, x, y, PX } = F;
    // a rainwater tank at the far end, corrugated
    const tk = g.createLinearGradient(x(21.6), 0, x(23.6), 0); tk.addColorStop(0, '#c9ccc6'); tk.addColorStop(1, '#7f847e');
    g.fillStyle = tk; g.fillRect(x(21.6), y(2.6), x(2), y(0) - y(2.6));
    for (let m = .1; m < 2.6; m += .14) { g.fillStyle = 'rgba(0,0,0,.12)'; g.fillRect(x(21.6), y(m), x(2), 2); }
    // low gable roof of green corrugated iron
    g.fillStyle = '#3d5a4a'; g.beginPath(); g.moveTo(x(1.0), y(3.7)); g.lineTo(x(12), y(5.5)); g.lineTo(x(23), y(3.7)); g.closePath(); g.fill();
    for (let m = 1.1; m < 23; m += .13) { g.fillStyle = m % .26 < .13 ? 'rgba(255,255,255,.07)' : 'rgba(0,0,0,.10)'; const t = 1 - Math.abs(m - 12) / 11; g.fillRect(x(m), y(3.7 + 1.8 * t), 2, y(3.7) - y(3.7 + 1.8 * t)); }
    // gable face: cream weatherboard with the club's name
    g.fillStyle = '#efe6cf'; g.beginPath(); g.moveTo(x(8.2), y(3.7)); g.lineTo(x(12), y(5.05)); g.lineTo(x(15.8), y(3.7)); g.closePath(); g.fill();
    // walls: cream face brick
    g.fillStyle = '#e3cfa8'; g.fillRect(x(1.6), y(3.7), x(20.8), y(0) - y(3.7));
    for (let m = .08; m < 3.7; m += .09) { g.fillStyle = 'rgba(120,90,60,.10)'; g.fillRect(x(1.6), y(m), x(20.8), 1); }
    // big sliding glass doors, the sky in them
    for (const [a, b] of [[2.2, 9.6], [14.4, 21.8]]) {
      const gl = g.createLinearGradient(0, y(3.0), 0, y(.2)); gl.addColorStop(0, '#9fb9cc'); gl.addColorStop(.45, '#5e7787'); gl.addColorStop(1, '#2d3a40');
      g.fillStyle = gl; g.fillRect(x(a), y(3.0), x(b - a), y(.2) - y(3.0));
      g.fillStyle = '#d8d9d4'; for (let m = a; m <= b + .01; m += (b - a) / 4) g.fillRect(x(m) - 2, y(3.0), 4, y(.2) - y(3.0));
      g.fillRect(x(a), y(3.0) - 2, x(b - a), 4); g.fillRect(x(a), y(.2) - 2, x(b - a), 4);
    }
    // the bar door
    g.fillStyle = '#2f3f3a'; g.fillRect(x(10.6), y(2.7), x(2.8), y(.2) - y(2.7)); g.fillStyle = '#d8d9d4'; g.fillRect(x(12) - 1.5, y(2.7), 3, y(.2) - y(2.7));
    // deep veranda: a skillion of iron on thin white posts, its shade on the wall
    g.fillStyle = 'rgba(28,30,26,.30)'; g.fillRect(x(1.6), y(3.25), x(20.8), y(.15) - y(3.25));
    g.fillStyle = '#4a6a58'; g.fillRect(x(.4), y(3.45), x(23.2), y(3.15) - y(3.45));
    g.fillStyle = '#f2f0ea'; g.fillRect(x(.4), y(3.15), x(23.2), 5);
    for (let m = .7; m <= 23.4; m += 3.8) { g.fillStyle = '#f2f0ea'; g.fillRect(x(m) - 3, y(3.15), 6, y(0) - y(3.15)); g.fillStyle = 'rgba(0,0,0,.2)'; g.fillRect(x(m) + 3, y(3.15), 3, y(0) - y(3.15)); }
    sign(F, 'WATTLE POINT BOWLING CLUB', 7.6, 16.4, 3.55, 4.25, '#f7f4ea', '#2c5a3e', `700 ${Math.round(PX * .30)}px Arial, sans-serif`);
    // shade sails over the front seats: taut sand-coloured triangles on poles
    for (const [a, b, h0, h1] of [[.2, 6.8, 2.2, 3.1], [17.2, 23.8, 3.1, 2.2]]) {
      g.fillStyle = '#e9dcbc'; g.beginPath(); g.moveTo(x(a), y(h0)); g.lineTo(x(b), y(h1)); g.lineTo(x((a + b) / 2 + (h0 > h1 ? 1 : -1)), y(1.75)); g.closePath(); g.fill();
      g.fillStyle = 'rgba(0,0,0,.10)'; g.beginPath(); g.moveTo(x(a), y(h0)); g.lineTo(x(b), y(h1)); g.lineTo(x((a + b) / 2), y((h0 + h1) / 2 - .25)); g.closePath(); g.fill();
      g.fillStyle = '#9a9c98'; for (const m of [a, b]) g.fillRect(x(m) - 2, y(Math.max(h0, h1) + .1), 4, y(0) - y(Math.max(h0, h1) + .1));
    }
    // bottlebrush and wattle in flower by the steps
    for (const [cx0, col] of [[8.8, [196, 46, 44]], [15.2, [232, 196, 52]]]) for (let i = 0; i < 160; i++) {
      const a = vr(0, TAU), rr = Math.sqrt(vrand()) * .9;
      g.fillStyle = vrand() < .45 ? rgba(mixRgb(PAL.leafShadow, PAL.leafLit, vrand())) : rgba(shadeRgb(col, vr(-.2, .15)), .95);
      g.beginPath(); g.arc(x(cx0 + Math.cos(a) * rr), y(.75 + Math.sin(a) * rr * .7), vr(2, 3.6), 0, TAU); g.fill();
    }
    sunWash(g, c); return c;
  };
  const seaBand = seed => {   // the Tasman: headlands, a blue sea to the horizon, and the scrub and roofs of the point
    const B = bandCanvas(seed), { g, cw, ch } = B, hzY = ch * .40;
    // headlands rising out of the sea here and there
    const head = ridge(ch * .30, ch * .22, TAU / 1100, vr(0, 6));
    hill(B, px => Math.max(0, head(px)) > hzY * .95 ? head(px) : 0, 'rgb(142,150,128)');
    // the sea
    const sea = g.createLinearGradient(0, ch - hzY, 0, ch); sea.addColorStop(0, 'rgb(64,104,150)'); sea.addColorStop(.5, 'rgb(40,94,140)'); sea.addColorStop(1, 'rgb(40,120,150)');
    g.fillStyle = sea; g.fillRect(0, ch - hzY, cw, hzY);
    for (let i = 0; i < 900; i++) { const yy = vr(ch - hzY + 2, ch - 14); g.fillStyle = `rgba(255,255,250,${vr(.12, .4) * (1 - (ch - yy) / hzY)})`; g.fillRect(vr(0, cw), yy, vr(3, 12), 1); }
    g.fillStyle = 'rgba(255,255,255,.35)'; g.fillRect(0, ch - hzY, cw, 1);
    // sandstone cliffs where the headlands meet the water
    g.save(); g.beginPath(); g.rect(0, 0, cw, ch - hzY + 6); g.clip();
    hill(B, px => { const v = head(px); return v > hzY * .95 ? v : 0; }, 'rgb(120,136,104)');
    g.restore();
    for (let px = 0; px < cw; px += 4) { const v = head(px); if (v > hzY * .95) { g.fillStyle = 'rgba(206,170,120,.75)'; g.fillRect(px, ch - hzY - 4, 4, 6); } }
    // the near point: banksia scrub with red roofs among it
    const near = ridge(ch * .17, ch * .05, TAU / 500, vr(0, 6));
    hill(B, near, 'rgb(86,98,64)');
    for (let i = 0; i < 70; i++) {
      const px = vr(0, cw), top = ch - near(px), w = vr(8, 18);
      g.fillStyle = vrand() < .7 ? 'rgb(178,92,64)' : 'rgb(120,124,126)'; g.beginPath(); g.moveTo(px - w / 2, top + 7); g.lineTo(px, top + 2); g.lineTo(px + w / 2, top + 7); g.closePath(); g.fill();
      g.fillStyle = 'rgb(236,228,212)'; g.fillRect(px - w / 2 + 1, top + 7, w - 2, 5);
    }
    treeLine(B, ch * .12, 'rgb(78,92,60)', 10);
    return airOver(B);
  };
  const lighthouse = () => {
    const PX = 8, wm = 12, hm = 30, c = makeCanvas(wm * PX, hm * PX), g = c.getContext('2d'), y = m => c.height - m * PX, x = m => m * PX;
    g.fillStyle = '#e8e6e0'; g.fillRect(x(.5), y(3), x(5), y(0) - y(3)); g.fillRect(x(7), y(2.6), x(4.5), y(0) - y(2.6));   // keepers' cottages
    g.fillStyle = '#9a8f80'; g.fillRect(x(.3), y(3.6), x(5.4), y(3) - y(3.6)); g.fillRect(x(6.8), y(3.2), x(4.9), y(2.6) - y(3.2));
    g.fillStyle = '#f2f0ea'; g.beginPath(); g.moveTo(x(3.6), y(0)); g.lineTo(x(4.6), y(24)); g.lineTo(x(7.4), y(24)); g.lineTo(x(8.4), y(0)); g.closePath(); g.fill();
    g.fillStyle = 'rgba(0,0,0,.10)'; g.beginPath(); g.moveTo(x(6.6), y(0)); g.lineTo(x(6.6), y(24)); g.lineTo(x(7.4), y(24)); g.lineTo(x(8.4), y(0)); g.closePath(); g.fill();
    g.fillStyle = '#3a3c3a'; g.fillRect(x(4.2), y(24.6), x(3.6), y(24) - y(24.6)); g.fillStyle = '#c9d4d8'; g.fillRect(x(4.8), y(26.6), x(2.4), y(24.6) - y(26.6));
    g.fillStyle = '#3a3c3a'; g.beginPath(); g.moveTo(x(4.5), y(26.6)); g.lineTo(x(6), y(28)); g.lineTo(x(7.5), y(26.6)); g.closePath(); g.fill();
    c.wm = wm; c.hm = hm; return c;
  };

  // ================= Glenmorran, Perthshire =================
  const stoneWall = (g, x0, y0, w, h, base) => {   // random rubble: grey-brown stones, pointed with paler lime
    g.fillStyle = '#b8b0a2'; g.fillRect(x0, y0, w, h);
    for (let yy = y0; yy < y0 + h; yy += vr(9, 14)) {
      const rh = Math.min(vr(9, 14), y0 + h - yy);
      for (let xx = x0 + vr(-10, 0); xx < x0 + w; xx += vr(14, 28)) {
        const sw = vr(12, 26), t = vrand();
        g.fillStyle = rgba(shadeRgb(base, (t - .5) * .35)); g.fillRect(Math.max(x0, xx + 1), yy + 1, Math.min(sw, x0 + w - xx) - 2, rh - 2);
      }
    }
  };
  const glenPavilion = () => {
    const F = frame(), { g, c, x, y, PX } = F, stone = [128, 120, 106];
    // slate roof between crow-stepped gables
    const rg = g.createLinearGradient(0, y(6.9), 0, y(3.4)); rg.addColorStop(0, '#4c5156'); rg.addColorStop(1, '#353a3f');
    g.fillStyle = rg; g.fillRect(x(2.2), y(6.9), x(19.6), y(3.4) - y(6.9));
    g.strokeStyle = 'rgba(255,255,255,.05)'; g.lineWidth = 1; for (let m = 3.5; m < 6.9; m += .2) { g.beginPath(); g.moveTo(x(2.2), y(m)); g.lineTo(x(21.8), y(m)); g.stroke(); }
    for (const [a, s] of [[1.4, 1], [22.6, -1]]) {   // the gable ends, stepped up to the chimney
      g.save(); g.beginPath(); g.moveTo(x(a), y(0));
      const steps = [[0, 3.6], [.45, 3.6], [.45, 4.3], [.9, 4.3], [.9, 5.0], [1.35, 5.0], [1.35, 5.7], [1.8, 5.7], [1.8, 7.6]];
      for (const [dx, h] of steps) g.lineTo(x(a + s * dx), y(h));
      g.lineTo(x(a + s * 2.8), y(7.6)); g.lineTo(x(a + s * 2.8), y(0)); g.closePath(); g.clip();
      stoneWall(g, Math.min(x(a), x(a + s * 2.8)), y(7.6), Math.abs(x(2.8)), y(0) - y(7.6), shadeRgb(stone, s > 0 ? .06 : -.06)); g.restore();
      g.fillStyle = '#6b5a4c'; for (const k of [0, 1, 2]) g.fillRect(x(a + s * (1.95 + k * .25)) - 4, y(8.05), 8, y(7.6) - y(8.05));   // chimney pots
    }
    // the long wall
    stoneWall(g, x(4.0), y(3.5), x(16), y(0) - y(3.5), stone);
    // dressed sandstone quoins and a plinth
    g.fillStyle = '#c2b49a'; for (let m = 0; m < 3.5; m += .5) { g.fillRect(x(4.0), y(m + .4), (m / .5) % 2 ? 18 : 30, y(m) - y(m + .4) - 2); g.fillRect(x(20) - ((m / .5) % 2 ? 18 : 30), y(m + .4), (m / .5) % 2 ? 18 : 30, y(m) - y(m + .4) - 2); }
    // sash windows with stone surrounds
    const sash = (xm, w, top, bot) => {
      g.fillStyle = '#cfc3aa'; g.fillRect(x(xm) - 5, y(top) - 5, x(w) + 10, y(bot) - y(top) + 10);
      const gl = g.createLinearGradient(0, y(top), 0, y(bot)); gl.addColorStop(0, '#5a6a70'); gl.addColorStop(1, '#262f33');
      g.fillStyle = gl; g.fillRect(x(xm), y(top), x(w), y(bot) - y(top));
      g.fillStyle = '#f1efe8'; g.fillRect(x(xm), y((top + bot) / 2) - 2, x(w), 4); for (const f of [1 / 3, 2 / 3]) g.fillRect(x(xm + w * f) - 1, y(top), 2, y(bot) - y(top));
      g.strokeStyle = '#f1efe8'; g.lineWidth = 3; g.strokeRect(x(xm), y(top), x(w), y(bot) - y(top));
    };
    for (const xm of [2.0, 5.0, 7.6, 15.3, 17.9, 21.0]) sash(xm, 1.05, 2.9, .9);
    // the porch: its own little crow-stepped gable, the door and a datestone
    g.save(); g.beginPath(); g.moveTo(x(9.8), y(0)); g.lineTo(x(9.8), y(3.9)); g.lineTo(x(10.4), y(3.9)); g.lineTo(x(10.4), y(4.5)); g.lineTo(x(11.0), y(4.5)); g.lineTo(x(11.0), y(5.1));
    g.lineTo(x(13.0), y(5.1)); g.lineTo(x(13.0), y(4.5)); g.lineTo(x(13.6), y(4.5)); g.lineTo(x(13.6), y(3.9)); g.lineTo(x(14.2), y(3.9)); g.lineTo(x(14.2), y(0)); g.closePath(); g.clip();
    stoneWall(g, x(9.8), y(5.1), x(4.4), y(0) - y(5.1), shadeRgb(stone, .1)); g.restore();
    g.fillStyle = '#c2b49a'; g.beginPath(); g.arc(x(12), y(2.5), x(.85), Math.PI, 0); g.fill(); g.fillRect(x(11.05), y(2.5), x(1.9), y(.1) - y(2.5));
    g.fillStyle = '#1f3a5c'; g.beginPath(); g.arc(x(12), y(2.5), x(.7), Math.PI, 0); g.fill(); g.fillRect(x(11.3), y(2.5), x(1.4), y(.1) - y(2.5));
    g.fillStyle = '#c9a862'; g.beginPath(); g.arc(x(12.45), y(1.3), 3, 0, TAU); g.fill();
    g.fillStyle = '#c2b49a'; g.fillRect(x(11.4), y(4.3), x(1.2), y(3.8) - y(4.3)); g.fillStyle = '#5d5345'; g.font = `600 ${Math.round(PX * .2)}px Georgia, serif`; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('1894', x(12), y(4.05));
    sign(F, 'GLENMORRAN BOWLING CLUB', 4.6, 9.4, 3.05, 3.45, '#1d2420', '#d9bd78', `600 ${Math.round(PX * .21)}px Georgia, serif`);
    // a bench of heather and hydrangea at the door
    for (const cx0 of [9.2, 14.8]) for (let i = 0; i < 120; i++) {
      const a = vr(0, TAU), rr = Math.sqrt(vrand()) * .7;
      g.fillStyle = vrand() < .45 ? rgba(mixRgb(PAL.leafShadow, PAL.leafLit, vrand())) : vrand() < .6 ? 'rgba(150,96,150,.95)' : 'rgba(120,150,200,.95)';
      g.beginPath(); g.arc(x(cx0 + Math.cos(a) * rr), y(.55 + Math.sin(a) * rr * .6), vr(2, 3.4), 0, TAU); g.fill();
    }
    sunWash(g, c); return c;
  };
  const highlandBand = seed => {   // bens blue with distance, heather on the braes, a plantation, walled fields
    const B = bandCanvas(seed), { g, cw, ch } = B;
    const far = ridge(ch * .78, ch * .16, TAU / 620, vr(0, 6));
    hill(B, far, 'rgb(134,150,172)');
    clipHill(B, far); for (let px = 0; px < cw; px += 6) { const top = ch - far(px); if (far(px) > ch * .86) { g.fillStyle = 'rgba(220,226,232,.35)'; g.fillRect(px, top, 6, vr(3, 9)); } } g.restore();
    const mid = ridge(ch * .55, ch * .15, TAU / 480, vr(0, 6));
    hill(B, mid, 'rgb(122,108,124)');
    clipHill(B, mid);
    for (let i = 0; i < 260; i++) { const px = vr(0, cw), top = ch - mid(px); g.fillStyle = vrand() < .5 ? 'rgba(146,104,140,.5)' : 'rgba(110,128,88,.45)'; g.beginPath(); g.ellipse(px, top + vr(4, 40), vr(10, 40), vr(3, 8), 0, 0, TAU); g.fill(); }
    // a dark plantation of spruce across the brae
    for (let px = vr(0, 300); px < cw; px += vr(500, 900)) { const w = vr(160, 360); for (let k = 0; k < w; k += 4) { const top = ch - mid(px + k) + vr(10, 16); g.fillStyle = 'rgb(38,58,46)'; g.beginPath(); g.moveTo(px + k - 3, top + 22); g.lineTo(px + k, top + vr(-2, 4)); g.lineTo(px + k + 3, top + 22); g.closePath(); g.fill(); } }
    g.restore();
    const near = ridge(ch * .3, ch * .07, TAU / 420, vr(0, 6));
    hill(B, near, 'rgb(106,140,84)');
    clipHill(B, near);
    for (let fx = 0; fx < cw; fx += vr(70, 150)) { const top = ch - near(fx); g.fillStyle = 'rgba(70,70,62,.55)'; g.fillRect(fx, top + vr(8, 20), vr(60, 150), 1.5); g.fillRect(fx, top + 4, 1.5, 30); if (vrand() < .12) { g.fillStyle = 'rgb(236,234,226)'; g.fillRect(fx + 20, top + 6, 10, 6); g.fillStyle = 'rgb(70,74,78)'; g.fillRect(fx + 19, top + 4, 12, 3); } }
    g.restore();
    treeLine(B, ch * .16, 'rgb(62,90,60)', 18);
    return airOver(B);
  };
  const towerHouse = () => {
    const PX = 8, wm = 10, hm = 20, c = makeCanvas(wm * PX, hm * PX), g = c.getContext('2d'), y = m => c.height - m * PX, x = m => m * PX;
    g.fillStyle = '#8f8a80'; g.fillRect(x(2.5), y(15), x(5), y(0) - y(15));
    g.fillStyle = '#7c776e'; g.fillRect(x(5.5), y(15), x(2), y(0) - y(15));
    g.fillStyle = '#8f8a80'; for (const m of [2.5, 7.5]) { g.fillRect(x(m) - x(.8), y(17), x(1.6), y(14) - y(17)); g.beginPath(); g.moveTo(x(m) - x(.9), y(17)); g.lineTo(x(m), y(19)); g.lineTo(x(m) + x(.9), y(17)); g.closePath(); g.fill(); }
    g.fillStyle = '#4a4740'; g.beginPath(); g.moveTo(x(3.2), y(15)); g.lineTo(x(5), y(17.6)); g.lineTo(x(6.8), y(15)); g.closePath(); g.fill();
    g.fillStyle = '#2e2c28'; for (const [a, b] of [[4, 11], [5.6, 8], [4, 5]]) g.fillRect(x(a), y(b + 1), x(.5), x(1));
    c.wm = wm; c.hm = hm; return c;
  };

  // ================= Las Brisas, Costa del Sol =================
  const brisasPavilion = () => {
    const F = frame(), { g, c, x, y, PX } = F;
    // a bell gable on the ridge
    g.fillStyle = '#f6f2ea'; g.beginPath(); g.moveTo(x(11), y(5.4)); g.lineTo(x(11), y(7.4)); g.quadraticCurveTo(x(12), y(8.3), x(13), y(7.4)); g.lineTo(x(13), y(5.4)); g.closePath(); g.fill();
    g.fillStyle = '#3a3330'; g.beginPath(); g.arc(x(12), y(6.9), x(.35), Math.PI, 0); g.fill(); g.fillRect(x(11.65), y(6.9), x(.7), y(6.3) - y(6.9));
    g.fillStyle = '#b58a3c'; g.beginPath(); g.arc(x(12), y(6.6), x(.22), 0, TAU); g.fill();
    // terracotta pantiles, a low hipped roof
    const rg = g.createLinearGradient(0, y(6.0), 0, y(3.9)); rg.addColorStop(0, '#c4673f'); rg.addColorStop(1, '#a24f2f');
    g.fillStyle = rg; g.beginPath(); g.moveTo(x(.9), y(3.9)); g.lineTo(x(3.8), y(6.0)); g.lineTo(x(20.2), y(6.0)); g.lineTo(x(23.1), y(3.9)); g.closePath(); g.fill();
    for (let m = 4.0; m < 6.0; m += .2) { const t = (m - 3.9) / 2.1; g.fillStyle = 'rgba(70,24,10,.25)'; g.fillRect(x(.9 + 2.9 * t), y(m), x(22.2 - 5.8 * t), 2.5); }
    for (let m = 1.2; m < 22.8; m += .26) { g.fillStyle = 'rgba(255,220,180,.10)'; g.fillRect(x(m), y(6.0), 2, y(3.9) - y(6.0)); }
    // white stucco, an arcade along the front in deep shade
    g.fillStyle = '#f6f2ea'; g.fillRect(x(1.4), y(3.95), x(21.2), y(0) - y(3.95));
    g.fillStyle = 'rgba(120,100,80,.06)'; for (let i = 0; i < 400; i++) g.fillRect(x(vr(1.4, 22.6)), y(vr(0, 3.9)), vr(2, 8), vr(1, 4));
    const arches = [3.0, 6.0, 9.0, 12.0, 15.0, 18.0, 21.0];
    for (const m of arches) {
      g.fillStyle = '#4a3b30'; g.beginPath(); g.moveTo(x(m - 1.15), y(0)); g.lineTo(x(m - 1.15), y(2.4)); g.arc(x(m), y(2.4), x(1.15), Math.PI, 0); g.lineTo(x(m + 1.15), y(0)); g.closePath(); g.fill();
      // through the arch: a shaded wall, a window with green shutters
      g.fillStyle = 'rgba(255,240,220,.12)'; g.fillRect(x(m - .5), y(2.2), x(1), y(.9) - y(2.2));
      g.fillStyle = '#2f6a4e'; g.fillRect(x(m - .85), y(2.2), x(.32), y(.9) - y(2.2)); g.fillRect(x(m + .53), y(2.2), x(.32), y(.9) - y(2.2));
    }
    g.fillStyle = 'rgba(0,0,0,.10)'; g.fillRect(x(1.4), y(3.95), x(21.2), 8);
    // the name in blue and white tiles
    g.fillStyle = '#f9f7f2'; g.fillRect(x(7.4), y(3.85), x(9.2), y(3.15) - y(3.85));
    g.strokeStyle = '#2a5a9a'; g.lineWidth = 3; g.strokeRect(x(7.4), y(3.85), x(9.2), y(3.15) - y(3.85));
    g.fillStyle = '#2a5a9a'; g.font = `700 ${Math.round(PX * .28)}px Georgia, serif`; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('LAS BRISAS BOWLS CLUB', x(12), y(3.5) + 1);
    // bougainvillea over the corners and along the eaves
    for (const [cx0, cy0, rx0, ry0] of [[1.8, 2.6, 1.0, 2.2], [22.2, 2.4, 1.0, 2.0], [7, 3.9, 1.8, .35], [17, 3.9, 1.8, .35]]) for (let i = 0; i < 260; i++) {
      const a = vr(0, TAU), rr = Math.sqrt(vrand());
      g.fillStyle = vrand() < .35 ? rgba(mixRgb(PAL.leafShadow, PAL.leafLit, vrand())) : `rgba(${196 + vr(-20, 30) | 0},${34 + vr(0, 30) | 0},${120 + vr(-10, 30) | 0},.95)`;
      g.beginPath(); g.arc(x(cx0 + Math.cos(a) * rr * rx0), y(cy0 + Math.sin(a) * rr * ry0), vr(2, 3.6), 0, TAU); g.fill();
    }
    // café parasols on the terrace
    for (const m of [4.4, 19.6]) {
      g.fillStyle = '#8a7a66'; g.fillRect(x(m) - 2, y(2.3), 4, y(0) - y(2.3));
      g.fillStyle = '#efe5cf'; g.beginPath(); g.moveTo(x(m - 1.5), y(2.0)); g.quadraticCurveTo(x(m), y(2.9), x(m + 1.5), y(2.0)); g.closePath(); g.fill();
      g.fillStyle = 'rgba(0,0,0,.12)'; g.beginPath(); g.moveTo(x(m), y(2.0)); g.quadraticCurveTo(x(m + .8), y(2.6), x(m + 1.5), y(2.0)); g.closePath(); g.fill();
      g.fillStyle = '#c8bca6'; g.fillRect(x(m - .6), y(.75), x(1.2), 4); g.fillRect(x(m - .05), y(.75), 3, y(0) - y(.75));
    }
    sunWash(g, c); return c;
  };
  const sierraBand = seed => {   // a dry sierra, a white village on its slope, olive groves and a line of pines
    const B = bandCanvas(seed), { g, cw, ch } = B;
    const far = ridge(ch * .74, ch * .17, TAU / 700, vr(0, 6));
    hill(B, far, 'rgb(170,160,160)');
    const mid = ridge(ch * .52, ch * .14, TAU / 520, vr(0, 6));
    hill(B, mid, 'rgb(176,150,112)');
    clipHill(B, mid);
    for (let i = 0; i < 500; i++) { const px = vr(0, cw), top = ch - mid(px); g.fillStyle = 'rgba(96,104,70,.55)'; g.beginPath(); g.arc(px, top + vr(6, 70), vr(1.5, 3), 0, TAU); g.fill(); }
    // white villages on the slope
    for (let vx = vr(100, 500); vx < cw; vx += vr(700, 1100)) for (let k = 0; k < 40; k++) {
      const px = vx + vr(-60, 60), top = ch - mid(px) + vr(6, 26) + Math.abs(px - vx) * .12, w = vr(5, 11), h = vr(4, 7);
      g.fillStyle = 'rgb(244,240,232)'; g.fillRect(px, top, w, h); g.fillStyle = 'rgb(176,92,60)'; g.fillRect(px - 1, top - 2, w + 2, 2.5); g.fillStyle = 'rgba(0,0,0,.12)'; g.fillRect(px + w * .6, top, w * .4, h);
    }
    g.restore();
    const near = ridge(ch * .28, ch * .06, TAU / 400, vr(0, 6));
    hill(B, near, 'rgb(160,146,98)');
    clipHill(B, near); for (let i = 0; i < 600; i++) { const px = vr(0, cw), top = ch - near(px); g.fillStyle = 'rgba(104,116,82,.75)'; g.beginPath(); g.arc(px, top + vr(4, 30), vr(2, 3.5), 0, TAU); g.fill(); } g.restore();
    // umbrella pines and cypresses
    const { g: gg } = B; let px = 0;
    while (px < cw) {
      const base = ch - ch * .1;
      if (vrand() < .6) { const w = vr(18, 34); gg.fillStyle = 'rgb(54,74,48)'; gg.beginPath(); gg.ellipse(px, base - vr(14, 22), w, vr(5, 8), 0, 0, TAU); gg.fill(); gg.fillRect(px - 1, base - 16, 2, 16); }
      else { gg.fillStyle = 'rgb(40,58,40)'; gg.beginPath(); gg.ellipse(px, base - 14, 3, vr(12, 18), 0, 0, TAU); gg.fill(); }
      px += vr(20, 60);
    }
    treeLine(B, ch * .08, 'rgb(74,90,56)', 8);
    return airOver(B);
  };

  // ---- national flags: draw(g, w, h) paints the flag flat; the game ripples it on the club's pole ----
  const unionJack = (g, w, h) => {   // the Union Flag, filling w x h
    g.save(); g.beginPath(); g.rect(0, 0, w, h); g.clip();
    g.fillStyle = '#012169'; g.fillRect(0, 0, w, h);
    const diag = (lw, col, off) => { g.strokeStyle = col; g.lineWidth = lw; g.beginPath(); g.moveTo(0, 0 + off); g.lineTo(w, h + off); g.moveTo(0, h - off); g.lineTo(w, 0 - off); g.stroke(); };
    diag(h * .2, '#ffffff', 0); diag(h * .067, '#c8102e', h * .033);   // the red saltire, set off-centre (counterchanged)
    g.fillStyle = '#ffffff'; g.fillRect(0, h * .333, w, h * .333); g.fillRect(w / 2 - h * .167, 0, h * .333, h);
    g.fillStyle = '#c8102e'; g.fillRect(0, h * .4, w, h * .2); g.fillRect(w / 2 - h * .1, 0, h * .2, h);
    g.restore();
  };
  const FLAG_AUSTRALIA = { ratio: 2, draw(g, w, h) {
    g.fillStyle = '#012169'; g.fillRect(0, 0, w, h);
    unionJack(g, w / 2, h / 2);
    g.fillStyle = '#ffffff';
    starPath(g, w * .25, h * .75, 7, h * .15, h * .065);                        // the Commonwealth Star
    for (const [sx, sy] of [[.75, .8333], [.6333, .4583], [.75, .1667], [.8653, .3667]]) starPath(g, w * sx, h * sy, 7, h * .075, h * .032);   // the Southern Cross
    starPath(g, w * .8, h * .5625, 5, h * .04, h * .017);
  } };
  const FLAG_SCOTLAND = { ratio: 5 / 3, draw(g, w, h) {
    g.fillStyle = '#005eb8'; g.fillRect(0, 0, w, h);
    g.strokeStyle = '#ffffff'; g.lineWidth = h * .2; g.beginPath(); g.moveTo(0, 0); g.lineTo(w, h); g.moveTo(0, h); g.lineTo(w, 0); g.stroke();
  } };
  const FLAG_SPAIN = { ratio: 3 / 2, draw(g, w, h) {
    g.fillStyle = '#aa151b'; g.fillRect(0, 0, w, h); g.fillStyle = '#f1bf00'; g.fillRect(0, h * .25, w, h * .5);
  } };

  Object.assign(VENUES, {
    wattle: {
      id: 'wattle', name: 'Wattle Point Bowling Club', place: 'New South Wales, Australia', ends: ['the clubhouse', 'the gums'],
      pal: { skyTop: [30, 100, 206], skyMid: [116, 176, 236], haze: [226, 228, 220], lawn: [128, 138, 66], path: [204, 198, 182], cap: [164, 154, 132],
        green: [64, 122, 46], greenHi: [84, 140, 56], leafShadow: [40, 50, 34], leafMid: [84, 98, 58], leafLit: [146, 154, 98], leafHi: [196, 196, 146] },
      trees: { gum: 3, norfolk: 2, palm: 1 },
      spots(add, R, r) {
        add(-20, -9, 19, 'gum'); add(-26, -13, 20, 'gum'); add(-29, 4, 18, 'gum');
        for (let x = -30; x <= 30; x += R(7, 11)) add(x, R(-13, -21), R(15, 20), r() < .85 ? 'gum' : 'palm');
        for (let x = -34; x <= 34; x += R(11, 17)) add(x, R(56, 66), R(23, 28), 'norfolk');
        for (let x = -28; x <= 28; x += R(13, 19)) add(x, R(53, 58), R(15, 19), 'gum');
        for (let y = -2; y <= 40; y += R(7, 11)) { add(R(-31, -23), y, R(14, 19), r() < .8 ? 'gum' : 'palm'); add(R(23, 31), y, R(14, 19), r() < .7 ? 'gum' : 'palm'); }
      },
      pavilion: wattlePavilion, band: seaBand, flag: FLAG_AUSTRALIA,
      // bowls whites and club polos, broad hats, shorts with long white socks, sunglasses
      dress: { tops: [[246, 245, 240], [246, 245, 240], [246, 245, 240], [30, 90, 60], [232, 190, 60], [170, 200, 228], [236, 150, 130]],
        lows: [[244, 243, 238], [244, 243, 238], [190, 176, 140], [40, 52, 80]], hats: ['bush', 'bush', 'bush', 'cap', 'none', 'panama'],
        shorts: .35, socks: [246, 245, 240], shades: .5, patterns: { stripes: .04 } },
      // magpies carolling, lorikeets screeching, now and then a kookaburra; cicadas, and the sea below the point
      birds: [['magpie', .42], ['lorikeet', .3], ['kookaburra', .1], ['sparrow', .18]], ambience: ['cicadas', 'surf'], far: { x: -80, y: 320, h: 18, build: lighthouse }
    },
    glenmorran: {
      id: 'glenmorran', name: 'Glenmorran Bowling Club', place: 'Perthshire, Scotland', ends: ['the clubhouse', 'the pines'],
      pal: { skyTop: [84, 124, 178], skyMid: [162, 188, 212], haze: [204, 212, 216], lawn: [84, 124, 60], path: [150, 148, 140], cap: [118, 112, 100],
        green: [56, 110, 50], greenHi: [74, 126, 60], leafShadow: [26, 42, 30], leafMid: [54, 84, 50], leafLit: [118, 142, 82], leafHi: [172, 180, 112] },
      trees: { scotspine: 2, birch: 2, oak: 2 },
      spots(add, R, r) {
        add(-19, -8.5, 14, 'scotspine'); add(-25, -12, 15, 'scotspine'); add(-29, 3, 16, 'oak');
        for (let x = -30; x <= 30; x += R(6, 9)) add(x, R(-13, -21), R(12, 15), r() < .65 ? 'scotspine' : 'birch');
        for (let x = -32; x <= 32; x += R(5, 8)) add(x, R(54, 62), R(13, 18), r() < .5 ? 'birch' : r() < .6 ? 'oak' : 'scotspine');
        for (let y = -2; y <= 40; y += R(6, 10)) { add(R(-31, -23), y, R(12, 16), r() < .5 ? 'birch' : 'oak'); add(R(23, 31), y, R(12, 15), r() < .6 ? 'scotspine' : 'birch'); }
      },
      pavilion: glenPavilion, band: highlandBand, flag: FLAG_SCOTLAND,
      // jumpers and cardigans, tweed flat caps, the odd tartan
      dress: { tops: [[40, 52, 84], [36, 70, 52], [110, 40, 52], [130, 110, 140], [214, 204, 182], [140, 140, 140], [240, 238, 230]],
        lows: [[96, 96, 100], [110, 92, 70], [40, 46, 62], [190, 180, 156]], hats: ['flat', 'flat', 'none', 'none', 'cap'],
        shorts: .03, shades: .03, patterns: { tartan: .16, check: .06 } },
      // chaffinches and blackbirds in the trees, oystercatchers and a curlew off the hill; a breeze
      birds: [['chaffinch', .3], ['blackbird', .2], ['robin', .12], ['oystercatcher', .22], ['curlew', .16]], ambience: ['wind'], far: { x: -60, y: -280, h: 22, build: towerHouse }
    },
    brisas: {
      id: 'brisas', name: 'Las Brisas Bowls Club', place: 'Costa del Sol, Spain', ends: ['the clubhouse', 'the palms'],
      pal: { skyTop: [36, 104, 210], skyMid: [128, 184, 238], haze: [232, 228, 214], lawn: [140, 142, 78], path: [210, 188, 154], cap: [176, 154, 124],
        green: [66, 118, 48], greenHi: [86, 134, 58], leafShadow: [28, 46, 28], leafMid: [60, 90, 46], leafLit: [118, 146, 72], leafHi: [176, 184, 104] },
      trees: { palm: 2, fan: 2, cypress: 2, olive: 2 },
      spots(add, R, r) {
        add(-20, -9, 10, 'palm'); add(-26, -13, 12, 'fan'); add(-29, 4, 7.5, 'olive');
        for (let x = -30; x <= 30; x += R(5, 8)) add(x, R(-13, -21), R(9, 12), r() < .5 ? 'cypress' : r() < .6 ? 'palm' : 'olive');
        for (let x = -32; x <= 32; x += R(6, 10)) add(x, R(54, 62), R(9, 12.5), r() < .55 ? 'fan' : 'palm');
        for (let y = -2; y <= 40; y += R(6, 10)) { add(R(-31, -23), y, R(7, 11), r() < .5 ? 'olive' : 'cypress'); add(R(23, 31), y, R(9, 12), r() < .6 ? 'palm' : 'cypress'); }
      },
      pavilion: brisasPavilion, band: sierraBand, flag: FLAG_SPAIN,
      // linen and pastels, straw hats, shorts and sunglasses
      dress: { tops: [[246, 244, 238], [246, 244, 238], [240, 196, 206], [170, 206, 236], [244, 230, 150], [236, 140, 120], [90, 180, 190]],
        lows: [[244, 242, 236], [222, 206, 170], [190, 190, 186], [40, 52, 80]], hats: ['panama', 'panama', 'sun', 'none', 'cap', 'bush'],
        shorts: .3, shades: .55, patterns: { stripes: .12 } },
      // swifts screaming overhead, collared doves, sparrows, a hoopoe; cicadas in the pines
      birds: [['swift', .3], ['collaredDove', .25], ['sparrow', .25], ['hoopoe', .2]], ambience: ['cicadasHigh'], far: {}, roses: true
    }
  });
})();
