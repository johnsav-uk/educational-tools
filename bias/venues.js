/* Bias: the clubs beyond Ashcombe. Loaded by index.html a moment after the page; uses its drawing helpers
   through window.BiasVenueHost (makeCanvas, vr, rgba, PAL, Art and the seeded random numbers) and adds each club to VENUES. A venue gives:
   name, place, ends (what each end faces, for the end summary), about (a line for the first-visit card), pal (colours over Ashcombe's), trees (kind:
   how many variants), spots(add, R, r) (where the trees stand), pavilion() (drawn on the 24 m x 9.6 m frame
   Ashcombe's uses, ground at the bottom), band(seed) (the country beyond, 2400 x 140), far (a distant landmark,
   or {} for none), flag (the national flag on the pole by the pavilion), dress (what the
   crowd wears), birds and ambience (the club's sounds) and roses (flowers in the pavilion-side hedges). Optional: paintGreen and paintPath
   (marks on the green and the path, in Art's ground frame), marks (lines and dots drawn sharp on the green), tidy (false: no shrubs or planters), bench (drawn on the bench frame), blades and mottle (the near-field
   texture tiles), indoor ({ h, build }: a hall, with walls and a ceiling in place of the club outside; see Art.build), and
   dusk and dim (a game after dark: the evening's sky and light, see Weather.dusk, and the dimming of everything drawn in
   daylight, see Art.withHaze; a picture drawn lit sets c.lit).
   Looks only: nothing here touches the play. */
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
      bark: ['#7a7266', '#45403a', '#4a443c'], leaf: [[64, 74, 60], [112, 122, 98], [160, 168, 140], [200, 204, 182]] },
    sycamore: { w: 12, h: 15, crownY: .42, rx: .47, ry: .4, trunk: .26, clumps: 24, dense: .7,
      bark: ['#8c8478', '#4e4a42', '#5a544a'], leaf: [[36, 50, 30], [70, 90, 46], [122, 138, 74], [170, 176, 112]] },
    hawthorn: { w: 6, h: 5.5, crownY: .5, rx: .48, ry: .42, trunk: .14, clumps: 18, dense: .9,
      bark: ['#6e6254', '#3e362e', '#463c32'], leaf: [[34, 46, 28], [62, 80, 42], [108, 122, 66], [150, 156, 98]] }
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
  // ================= Fernley Indoor Bowls Centre, Leicestershire =================
  /* A five-rink hall under a steel portal frame: a blue carpet green, a grey carpet surround, maroon bank
     boards, clad walls between yellow columns, and lines of lights down the rink boundaries. Drawn as
     Art's indoor parts (see Art.build in index.html): four walls and seven roof beams as panels, and a ceiling. */
  const HALL = { x: 16.5, y0: -5.6, y1: 42, h: 6, bay: 5.95 };   // the walls' inside faces, the ceiling height, the side bays
  const WPX = 48;   // wall pictures: pixels a metre
  const SANS = 'Helvetica, Arial, sans-serif';
  const wall = len => {   // a wall picture len metres long and the hall's height: x(m) along it, y(m) up from the floor
    const c = makeCanvas(Math.round(len * WPX), Math.round(HALL.h * WPX)), g = c.getContext('2d');
    return { c, g, len, x: m => m * WPX, y: m => c.height - m * WPX };
  };
  const board = (Wl, x0, x1, z0, z1, fill, frame) => {   // a flat board on the wall, with a frame and a soft shadow below it
    const { g, x, y } = Wl;
    g.fillStyle = 'rgba(0,0,0,.12)'; g.fillRect(x(x0) + 3, y(z1) + 4, x(x1 - x0), y(z0) - y(z1));
    if (frame) { g.fillStyle = frame; g.fillRect(x(x0) - 3, y(z1) - 3, x(x1 - x0) + 6, y(z0) - y(z1) + 6); }
    g.fillStyle = fill; g.fillRect(x(x0), y(z1), x(x1 - x0), y(z0) - y(z1));
  };
  const text = (Wl, s, xm, zm, size, ink, weight = 700, font = SANS) => {
    const { g, x, y } = Wl; g.fillStyle = ink; g.font = `${weight} ${Math.round(size * WPX)}px ${font}`; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(s, x(xm), y(zm));
  };
  const cladding = Wl => {   // profiled steel sheet, lit from the lights above, over a navy kick strip
    const { g, c, x, y, len } = Wl;
    const bg = g.createLinearGradient(0, 0, 0, c.height); bg.addColorStop(0, '#f0f2f2'); bg.addColorStop(.75, '#dfe3e5'); bg.addColorStop(1, '#cdd2d5');
    g.fillStyle = bg; g.fillRect(0, 0, c.width, c.height);
    for (let m = 0; m < len; m += .25) { g.fillStyle = 'rgba(40,50,60,.07)'; g.fillRect(x(m), 0, 2, c.height); g.fillStyle = 'rgba(255,255,255,.5)'; g.fillRect(x(m) + 2, 0, 1, c.height); }
    for (const m of [1.25, 3.7]) { g.fillStyle = 'rgba(40,50,60,.12)'; g.fillRect(0, y(m), c.width, 2); }
    g.fillStyle = '#26365a'; g.fillRect(0, y(.22), c.width, y(0) - y(.22));
    g.fillStyle = 'rgba(255,255,255,.18)'; g.fillRect(0, y(.22), c.width, 2);
  };
  const column = (Wl, m) => {   // a yellow steel column, its flanges catching the light, with the knee brace up to the rafter
    const { g, c, x, y } = Wl, w = .38, l = x(m - w / 2), r = x(m + w / 2);
    const gr = g.createLinearGradient(l, 0, r, 0); gr.addColorStop(0, '#a88412'); gr.addColorStop(.18, '#f2c93c'); gr.addColorStop(.6, '#e2b62c'); gr.addColorStop(1, '#9c7a12');
    g.fillStyle = gr; g.fillRect(l, 0, r - l, c.height);
    g.fillStyle = 'rgba(0,0,0,.22)'; g.fillRect(l + (r - l) * .22, 0, 2, c.height); g.fillRect(l + (r - l) * .78, 0, 2, c.height);
    g.fillStyle = '#d9ad26'; for (const s of [-1, 1]) { g.beginPath(); g.moveTo(x(m + s * w / 2), y(HALL.h - .45)); g.lineTo(x(m + s * 1.3), y(HALL.h - .45)); g.lineTo(x(m + s * w / 2), y(HALL.h - 1.5)); g.closePath(); g.fill(); }
    g.fillStyle = '#7d6a3c'; g.fillRect(l - 3, y(.12), r - l + 6, y(0) - y(.12));   // the base plate
  };
  const eaves = Wl => {   // the eaves beam along the top of the wall
    const { g, c, y } = Wl, gr = g.createLinearGradient(0, y(HALL.h), 0, y(HALL.h - .45));
    gr.addColorStop(0, '#9c7a12'); gr.addColorStop(.3, '#f0c63a'); gr.addColorStop(1, '#b8901c');
    g.fillStyle = gr; g.fillRect(0, y(HALL.h), c.width, y(HALL.h - .45) - y(HALL.h));
    g.fillStyle = 'rgba(0,0,0,.18)'; g.fillRect(0, y(HALL.h - .45), c.width, 5);
  };
  const chairs = (Wl, m0, m1) => {   // blue stacking chairs along the foot of the wall
    const { g, x, y } = Wl;
    for (let m = m0; m + .5 <= m1; m += .58) {
      g.fillStyle = 'rgba(0,0,0,.14)'; g.beginPath(); g.ellipse(x(m + .25), y(.02), x(.3), 4, 0, 0, TAU); g.fill();
      g.strokeStyle = '#8a9097'; g.lineWidth = 2; g.beginPath(); for (const k of [.05, .45]) { g.moveTo(x(m + k), y(.45)); g.lineTo(x(m + k), y(0)); } g.stroke();
      const bk = g.createLinearGradient(0, y(.88), 0, y(.5)); bk.addColorStop(0, '#3d6fc0'); bk.addColorStop(1, '#244c92');
      g.fillStyle = bk; g.beginPath(); g.roundRect(x(m + .03), y(.88), x(.44), y(.52) - y(.88), 6); g.fill();
      g.fillStyle = '#2a58a6'; g.fillRect(x(m), y(.48), x(.5), y(.42) - y(.48));
    }
  };
  const lockers = (Wl, m0, m1) => {   // a bank of lockers in a yellow frame, numbered
    const { g, x, y } = Wl;
    board(Wl, m0, m1, 0, 1.95, '#c79a3e', '#e8bf35');
    let n = 1 + ((m0 * 7) | 0) % 40;
    for (let m = m0 + .04; m + .38 <= m1; m += .42) for (const [z0, z1] of [[.06, .95], [1.0, 1.9]]) {
      const dg = g.createLinearGradient(x(m), 0, x(m + .38), 0); dg.addColorStop(0, '#b98a3a'); dg.addColorStop(1, '#9a6f2c');
      g.fillStyle = dg; g.fillRect(x(m), y(z1), x(.38), y(z0) - y(z1));
      g.fillStyle = '#f2ede0'; g.fillRect(x(m + .12), y(z1 - .08), x(.14), y(z1 - .17) - y(z1 - .08));
      g.fillStyle = '#3a2c1c'; g.font = `700 ${Math.round(.07 * WPX)}px ${SANS}`; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(String(n++), x(m + .19), y(z1 - .125));
      g.fillStyle = '#d8d8d0'; g.fillRect(x(m + .3), y((z0 + z1) / 2 + .05), 3, x(.1));
    }
  };
  const honours = (Wl, m0, m1, title) => {   // dark wood, gilt lettering: the names of the club's champions
    const { g, x, y } = Wl, z0 = 1.5, z1 = 3.6;
    board(Wl, m0, m1, z0, z1, '#4a2c18', '#6e4426');
    text(Wl, title, (m0 + m1) / 2, z1 - .22, .17, '#d8b862', 700, 'Georgia, serif');
    g.fillStyle = '#c9a54e'; g.fillRect(x(m0 + .2), y(z1 - .38), x(m1 - m0 - .4), 2);
    for (let z = z1 - .55, i = 0; z > z0 + .15; z -= .14, i++) {
      g.fillStyle = 'rgba(214,184,104,.8)'; g.fillRect(x(m0 + .2), y(z), x(.32), 3);
      const w = (m1 - m0 - .9) * (.45 + .45 * Math.abs(Math.sin(i * 2.7 + m0))); g.fillRect(x(m0 + .65), y(z), x(w), 3);
    }
  };
  const notices = (Wl, m0, m1, title) => {   // a cork board of fixtures and rotas, a heading over it
    const { g, x, y } = Wl, z0 = 1.3, z1 = 2.6;
    board(Wl, m0, m1, z0, z1, '#b98c5c', '#7a5634');
    if (title) { board(Wl, m0, m1, z1 + .12, z1 + .45, '#1f3566'); text(Wl, title, (m0 + m1) / 2, z1 + .285, .2, '#ffffff'); }
    for (let i = 0, m = m0 + .1; m < m1 - .35; i++) {
      const w = .26 + (i * 37 % 10) / 50, hh = .32 + (i * 53 % 7) / 30, z = z1 - .1 - (i % 2) * .5;
      g.save(); g.translate(x(m + w / 2), y(z - hh / 2)); g.rotate(((i * 29) % 7 - 3) / 90);
      g.fillStyle = ['#fbfaf4', '#fff3a6', '#f6d0d8', '#fbfaf4', '#d6ecf8'][i % 5]; g.fillRect(-x(w) / 2, -x(hh) / 2, x(w), x(hh));
      g.fillStyle = 'rgba(40,40,60,.35)'; for (let k = 1; k < 6; k++) g.fillRect(-x(w) / 2 + 4, -x(hh) / 2 + k * x(hh) / 6.5, x(w) - 8 - (k * 7 % 5) * 2, 2);
      g.fillStyle = '#c03030'; g.beginPath(); g.arc(0, -x(hh) / 2 + 4, 2.5, 0, TAU); g.fill();
      g.restore(); m += w + .06;
    }
  };
  const fireExit = (Wl, m0) => {   // double doors with push bars, the green running man above
    const { g, x, y } = Wl;
    board(Wl, m0, m0 + 1.7, 0, 2.15, '#8c9893', '#5c6662');
    g.fillStyle = '#5c6662'; g.fillRect(x(m0 + .85) - 1, y(2.15), 3, y(0) - y(2.15));
    g.fillStyle = '#c8ccc9'; for (const k of [.1, .95]) g.fillRect(x(m0 + k), y(1.02), x(.65), 5);
    board(Wl, m0 + .35, m0 + 1.35, 2.35, 2.62, '#1d8a4a');
    text(Wl, 'FIRE EXIT', m0 + .97, 2.485, .14, '#ffffff');
    g.fillStyle = '#ffffff'; const fx = x(m0 + .5), fy = y(2.485); g.beginPath(); g.arc(fx, fy - 4, 2.5, 0, TAU); g.fill(); g.fillRect(fx - 2, fy - 1, 4, 6);
  };
  const heater = (Wl, m) => {   // a radiant heater panel high on the wall
    const { g, x, y } = Wl;
    board(Wl, m - 1.1, m + 1.1, 4.45, 4.75, '#5d6166', '#3e4246');
    g.fillStyle = 'rgba(255,255,255,.12)'; for (let k = -1; k < 1.05; k += .18) g.fillRect(x(m + k), y(4.72), 2, y(4.48) - y(4.72));
  };
  const clock = (Wl, m, z) => {
    const { g, x, y } = Wl, r = x(.32), cx = x(m), cy = y(z);
    g.fillStyle = 'rgba(0,0,0,.15)'; g.beginPath(); g.arc(cx + 3, cy + 4, r + 4, 0, TAU); g.fill();
    g.fillStyle = '#2b2f33'; g.beginPath(); g.arc(cx, cy, r + 4, 0, TAU); g.fill(); g.fillStyle = '#fbfbf6'; g.beginPath(); g.arc(cx, cy, r, 0, TAU); g.fill();
    g.strokeStyle = '#2b2f33'; g.lineWidth = 2; for (let k = 0; k < 12; k++) { const a = k * TAU / 12; g.beginPath(); g.moveTo(cx + Math.cos(a) * r * .8, cy + Math.sin(a) * r * .8); g.lineTo(cx + Math.cos(a) * r * .95, cy + Math.sin(a) * r * .95); g.stroke(); }
    g.lineWidth = 3; g.beginPath(); g.moveTo(cx, cy); g.lineTo(cx + r * .45, cy - r * .25); g.moveTo(cx, cy); g.lineTo(cx - r * .1, cy - r * .75); g.stroke();
  };
  // the far wall (toward the club's name): the results board, rink numbers over each rink, the league's boards
  const hallFarWall = () => {
    const len = 2 * HALL.x, Wl = wall(len), { g, x, y } = Wl, X = wx => wx + HALL.x;   // picture metres from the left (x = −16.5)
    cladding(Wl);
    board(Wl, X(-7.2), X(7.2), 4.95, 5.45, '#1f3566', '#14244a'); text(Wl, 'FERNLEY INDOOR BOWLS CENTRE', X(0), 5.2, .3, '#ffffff', 800);
    // the results board: white, ruled, with the rinks' scores
    board(Wl, X(-2.3), X(2.3), 3.15, 4.6, '#fbfbf6', '#2b2f33');
    text(Wl, 'RINK  ·  HOME  ·  AWAY', X(0), 4.42, .13, '#1f3566');
    for (let r = 0; r < 5; r++) {
      const z = 4.18 - r * .2; g.fillStyle = 'rgba(31,53,102,.25)'; g.fillRect(x(X(-2.1)), y(z - .1), x(4.2), 1);
      text(Wl, String(r + 1), X(-1.5), z, .14, '#1f3566'); text(Wl, String(4 + (r * 7) % 15), X(0), z, .14, '#a32a2a'); text(Wl, String(3 + (r * 11) % 14), X(1.5), z, .14, '#a32a2a');
    }
    for (const s of [-1, 1]) {   // the league's green boards either side
      board(Wl, X(s * 6.4 - 1.3), X(s * 6.4 + 1.3), 3.2, 4.35, '#1f6a46', '#e9e6dc');
      text(Wl, s < 0 ? 'FERNLEY & DISTRICT' : 'WINTER LEAGUE', X(s * 6.4), 3.98, .16, '#f2efe4'); text(Wl, s < 0 ? 'BOWLS LEAGUE' : '2026 – 27', X(s * 6.4), 3.66, .16, '#f2efe4');
      g.strokeStyle = '#f2efe4'; g.lineWidth = 2; g.beginPath(); g.arc(x(X(s * 6.4)), y(3.4), 5, 0, TAU); g.stroke();
    }
    board(Wl, X(9.6), X(11.8), 3.45, 3.95, '#c62828', '#ffffff'); text(Wl, 'NO OUTDOOR SHOES', X(10.7), 3.7, .14, '#ffffff', 800);
    board(Wl, X(-11.8), X(-9.6), 3.45, 3.95, '#ffffff', '#2b2f33'); text(Wl, 'RINKS 1 – 5', X(-10.7), 3.7, .15, '#1f3566', 800);
    for (const [k, rx] of [-10, -5, 0, 5, 10].entries()) {   // rink numbers, each with its status lights
      board(Wl, X(rx - .32), X(rx + .32), 2.3, 2.85, '#fbfbf6', '#2b2f33'); text(Wl, String(k + 1), X(rx), 2.6, .3, '#1a1a1a', 800);
      for (const [d, col] of [[-.12, '#e23b2e'], [.12, '#3a3a3a']]) { g.fillStyle = col; g.beginPath(); g.arc(x(X(rx + d)), y(2.38), 3, 0, TAU); g.fill(); }
    }
    chairs(Wl, .6, X(-6.8)); chairs(Wl, X(-4.2), X(4.2)); chairs(Wl, X(6.8), len - .6);
    for (let m = 0; m <= len + .01; m += len / 6) column(Wl, m);
    eaves(Wl); return Wl.c;
  };
  // the near wall: the viewing window into the bar and lounge, a clock, a fire exit
  const hallNearWall = () => {
    const len = 2 * HALL.x, Wl = wall(len), { g, x, y } = Wl;
    cladding(Wl);
    const w0 = 6.4, w1 = 22.4, z0 = 1.05, z1 = 2.75;   // the window
    g.fillStyle = '#9aa1a8'; g.fillRect(x(w0) - 6, y(z1) - 6, x(w1 - w0) + 12, y(z0) - y(z1) + 12);
    const lounge = g.createLinearGradient(0, y(z1), 0, y(z0)); lounge.addColorStop(0, '#d9b98a'); lounge.addColorStop(.55, '#b88d5e'); lounge.addColorStop(1, '#7a5638');
    g.fillStyle = lounge; g.fillRect(x(w0), y(z1), x(w1 - w0), y(z0) - y(z1));
    g.fillStyle = '#5a3b26'; g.fillRect(x(w0), y(z0 + .55), x(4.2), y(z0 + .05) - y(z0 + .55));   // the bar counter, bottles behind it
    for (let m = w0 + .1; m < w0 + 4; m += .09) { g.fillStyle = ['#3c6a3a', '#8a3a2a', '#d6c27a', '#2c4a6a'][(m * 31 | 0) % 4]; g.fillRect(x(m), y(z0 + 1.05), 3, x(.18)); }
    for (let m = w0 + .4; m < w1; m += 1.6) { g.fillStyle = '#fff4d6'; g.beginPath(); g.arc(x(m), y(z1 - .08), 4, 0, TAU); g.fill(); g.fillStyle = 'rgba(255,240,200,.25)'; g.beginPath(); g.arc(x(m), y(z1 - .08), 12, 0, TAU); g.fill(); }
    for (let m = w0 + 5; m < w1 - .6; m += 1.9) {   // tables, and the people at them
      g.fillStyle = '#4a3020'; g.fillRect(x(m), y(z0 + .48), x(.8), 4); g.fillRect(x(m + .38), y(z0 + .48), 3, y(z0) - y(z0 + .48));
      for (const d of [-.1, .9]) if ((m * 13 + d * 7 | 0) % 3) { g.fillStyle = ['#e8e4da', '#2e3a5c', '#7a2a34', '#5a6a4a'][(m * 7 + d * 3 | 0) % 4]; g.beginPath(); g.roundRect(x(m + d - .14), y(z0 + .78), x(.28), x(.42), 5); g.fill(); g.fillStyle = '#c8a088'; g.beginPath(); g.arc(x(m + d), y(z0 + .88), x(.09), 0, TAU); g.fill(); }
    }
    g.fillStyle = 'rgba(255,255,255,.16)'; for (let m = w0 + .5; m < w1; m += 2.3) { g.beginPath(); g.moveTo(x(m), y(z1)); g.lineTo(x(m + .5), y(z1)); g.lineTo(x(m - .2), y(z0)); g.lineTo(x(m - .7), y(z0)); g.closePath(); g.fill(); }
    g.fillStyle = '#9aa1a8'; for (let m = w0; m <= w1 + .01; m += 2) g.fillRect(x(m) - 3, y(z1), 6, y(z0) - y(z1));
    board(Wl, 10.4, 18.4, 3.05, 3.5, '#1f3566', '#14244a'); text(Wl, 'BAR  ·  LOUNGE  ·  VIEWING GALLERY', 14.4, 3.275, .2, '#ffffff', 700);
    clock(Wl, 14.4, 4.25);
    honours(Wl, 1.6, 5.2, 'CLUB CHAMPIONS'); honours(Wl, 27.8, 31.4, 'PAST PRESIDENTS');
    fireExit(Wl, 23.6);
    chairs(Wl, .6, 6.2); chairs(Wl, 6.6, 22.2);
    for (let m = 0; m <= len + .01; m += len / 6) column(Wl, m);
    eaves(Wl); return Wl.c;
  };
  // a side wall, bay by bay: what each of its eight bays holds
  const hallSideWall = side => {
    const len = HALL.y1 - HALL.y0, Wl = wall(len), b = HALL.bay;
    cladding(Wl);
    const L = side < 0
      ? [['lockers'], ['honours', 'LADIES’ CHAMPIONS'], ['exit'], ['notices', 'FIXTURES'], ['chairs'], ['honours', 'MEN’S CHAMPIONS'], ['notices', 'MATCH RESULTS'], ['lockers']]
      : [['lockers'], ['notices', 'COACHING'], ['honours', 'PAIRS WINNERS'], ['chairs'], ['exit'], ['notices', 'RINK BOOKINGS'], ['honours', 'TRIPLES WINNERS'], ['lockers']];
    L.forEach(([kind, title], i) => {
      const m0 = i * b + .45, m1 = (i + 1) * b - .45, mid = (m0 + m1) / 2;
      if (kind === 'lockers') lockers(Wl, m0 + .2, m1 - .2);
      else if (kind === 'honours') { honours(Wl, mid - 1.6, mid + 1.6, title); chairs(Wl, m0 + .2, m1 - .2); }
      else if (kind === 'notices') { notices(Wl, mid - 1.8, mid + 1.8, title); chairs(Wl, m0 + .2, m1 - .2); }
      else if (kind === 'exit') fireExit(Wl, mid - .85);
      else chairs(Wl, m0 + .2, m1 - .2);
      heater(Wl, mid);
    });
    for (let i = 0; i <= 8; i++) column(Wl, i * b);
    eaves(Wl); return Wl.c;
  };
  // a roof beam across the hall: a yellow I-section, deeper at the haunches where it meets the columns
  const hallBeam = () => {
    const len = 2 * HALL.x, d = .55, c = makeCanvas(Math.round(len * WPX), Math.round(d * WPX)), g = c.getContext('2d'), x = m => m * WPX;
    const gr = g.createLinearGradient(0, 0, 0, c.height); gr.addColorStop(0, '#8c6c10'); gr.addColorStop(.12, '#f0c63a'); gr.addColorStop(.85, '#d9ad26'); gr.addColorStop(1, '#7d600e');
    g.fillStyle = gr; g.fillRect(0, 0, c.width, c.height);
    g.fillStyle = 'rgba(0,0,0,.25)'; g.fillRect(0, 5, c.width, 2); g.fillRect(0, c.height - 7, c.width, 2);
    g.fillStyle = 'rgba(0,0,0,.18)'; for (let m = 4; m < len - 3; m += 5.5) g.fillRect(x(m), 0, 5, c.height);   // splice plates
    return c;
  };
  // the ceiling, seen from below over Art's ground frame: insulated roof panels, the light fittings down every rink
  // boundary, and the blue air ducts along the sides
  const hallCeiling = () => {
    const S2 = .1, X0 = -34, Y0 = -12, c = makeCanvas(680, 600), g = c.getContext('2d'), X = v => (v - X0) / S2, Y = v => (v - Y0) / S2;
    g.fillStyle = '#c3cad1'; g.fillRect(0, 0, c.width, c.height);
    for (let v = Y0; v < 48; v += .5) { g.fillStyle = 'rgba(255,255,255,.22)'; g.fillRect(0, Y(v), c.width, 1); g.fillStyle = 'rgba(40,50,64,.12)'; g.fillRect(0, Y(v) + 2, c.width, 1); }
    for (let v = HALL.y0; v <= HALL.y1; v += HALL.bay) { g.fillStyle = 'rgba(40,50,64,.18)'; g.fillRect(0, Y(v) - 4, c.width, 8); }   // the beams' shadow on the roof
    for (const s of [-1, 1]) {   // the ducts
      const x0 = X(s * 14.6 - .35), x1 = X(s * 14.6 + .35), dg = g.createLinearGradient(x0, 0, x1, 0);
      dg.addColorStop(0, '#1d4f8a'); dg.addColorStop(.45, '#5a98d6'); dg.addColorStop(1, '#1a477c');
      g.fillStyle = dg; g.fillRect(x0, Y(HALL.y0), x1 - x0, Y(HALL.y1) - Y(HALL.y0));
      g.fillStyle = 'rgba(10,30,60,.35)'; for (let v = HALL.y0; v < HALL.y1; v += 1.5) g.fillRect(x0, Y(v), x1 - x0, 1);
    }
    for (const lx of [-12.5, -7.5, -2.5, 2.5, 7.5, 12.5]) for (let v = HALL.y0 + 1.2; v < HALL.y1 - 1; v += 2.8) {   // the lights, with their glow
      const cx = X(lx), cy = Y(v + .8), gl = g.createRadialGradient(cx, cy, 0, cx, cy, 16);
      gl.addColorStop(0, 'rgba(255,252,240,.55)'); gl.addColorStop(1, 'rgba(255,252,240,0)'); g.fillStyle = gl; g.fillRect(cx - 16, cy - 16, 32, 32);
      g.fillStyle = '#ffffff'; g.fillRect(cx - 1.5, Y(v), 3, 16);
    }
    return c;
  };
  const hallBuild = () => {
    const { x: hx, y0, y1, h, bay } = HALL, beam = hallBeam(), side = [hallSideWall(-1), hallSideWall(1)];
    const panels = [
      { x0: -hx, y0: y1, x1: hx, y1, z0: 0, z1: h, img: hallFarWall() },
      { x0: hx, y0, x1: -hx, y1: y0, z0: 0, z1: h, img: hallNearWall() },
      { x0: -hx, y0, x1: -hx, y1, z0: 0, z1: h, img: side[0] },
      { x0: hx, y0: y1, x1: hx, y1: y0, z0: 0, z1: h, img: side[1] }
    ];
    for (let i = 1; i < 8; i++) { const by = y0 + i * bay; panels.push({ x0: -hx, y0: by, x1: hx, y1: by, z0: h - .55, z1: h - .02, img: beam, both: true }); }
    return { panels, ceiling: hallCeiling() };
  };
  // the carpet: no blades of grass near the camera, but a fine fleck of fibres
  const carpetTile = (n, a) => {
    const N = 256, c = makeCanvas(N, N), g = c.getContext('2d');
    for (let i = 0; i < n; i++) { g.fillStyle = vrand() < .5 ? `rgba(220,236,255,${a})` : `rgba(0,12,40,${a * 1.2})`; g.fillRect(vr(0, N), vr(0, N), vr(.8, 1.8), vr(.8, 1.8)); }
    return c;
  };
  // the lights in the carpet: soft bright lanes down the rink boundaries, under each line of fittings
  const hallSheen = (g, X, Y) => {
    for (const lx of [-7.5, -2.5, 2.5, 7.5]) {
      const gr = g.createLinearGradient(X(lx - 1.2), 0, X(lx + 1.2), 0);
      gr.addColorStop(0, 'rgba(210,232,255,0)'); gr.addColorStop(.5, 'rgba(210,232,255,.10)'); gr.addColorStop(1, 'rgba(210,232,255,0)');
      g.fillStyle = gr; g.fillRect(X(lx - 1.2), Y(0), X(lx + 1.2) - X(lx - 1.2), Y(36) - Y(0));
    }
  };
  /* The white T at each end of every rink, on the centre line 2 m from the ditch: the jack's maximum length, and the
     spot a jack knocked out of play goes back to; tape 25 mm wide, the bar across, the stem toward the middle of the
     green. Where the club beta plays side re-spots (window.BiasClub), a small spot 1.5 m either side of it on the same
     line. Art.marks: drawn sharp by the renderers, in the rink's frame (the same from either end). */
  const hallMarks = () => {
    const lines = [], dots = [], tape = .025, sides = window.BiasClub && window.BiasClub.sideSpots;
    for (const rx of [-10, -5, 0, 5, 10]) for (const [ty, k] of [[34, -1], [2, 1]]) {
      lines.push([rx - .15, ty, rx + .15, ty, tape], [rx, ty, rx, ty + k * .2, tape]);
      if (sides) for (const d of [-1.5, 1.5]) dots.push([rx + d, ty, .025]);
    }
    return { lines, dots };
  };
  // a row of three blue chairs, in place of a bench (the bench frame: 1.8 m by 0.95 m)
  const hallBench = () => {
    const PX = 60, wm = 1.8, hm = 0.95, c = makeCanvas(wm * PX, hm * PX), g = c.getContext('2d'), y = m => c.height - m * PX, x = m => m * PX;
    for (const m of [.05, .65, 1.25]) {
      g.strokeStyle = '#8a9097'; g.lineWidth = 2.5; g.beginPath(); for (const k of [.04, .46]) { g.moveTo(x(m + k), y(.45)); g.lineTo(x(m + k), y(0)); } g.stroke();
      const bk = g.createLinearGradient(0, y(.9), 0, y(.5)); bk.addColorStop(0, '#3d6fc0'); bk.addColorStop(1, '#244c92');
      g.fillStyle = bk; g.beginPath(); g.roundRect(x(m + .02), y(.9), x(.46), y(.5) - y(.9), 7); g.fill();
      g.fillStyle = '#2a58a6'; g.fillRect(x(m), y(.5), x(.5), y(.42) - y(.5));
    }
    c.wm = wm; c.hm = hm; return c;
  };

  // ================= Pitfold Park Bowling Club, Lancashire =================
  /* A park club that has seen better days: a flat-roofed hut with its paint coming off, a chain-link fence,
     a green worn brown in patches, cracked slabs with weeds in them, terraces and a gasholder beyond. */
  const pitfoldHut = () => {
    const F = frame(), { g, c, x, y, PX } = F;
    // the park's chain-link fence behind everything, on concrete posts, sagging between them
    g.strokeStyle = 'rgba(120,128,120,.55)'; g.lineWidth = 1;
    for (let m = 0; m < 24; m += .12) { g.beginPath(); g.moveTo(x(m), y(2.1)); g.lineTo(x(m + .9), y(0)); g.moveTo(x(m + .9), y(2.1)); g.lineTo(x(m), y(0)); g.stroke(); }
    g.fillStyle = '#9a9a92'; for (let m = .3; m < 24; m += 2.6) g.fillRect(x(m), y(2.25), 5, y(0) - y(2.25));
    g.strokeStyle = '#7d827c'; g.lineWidth = 2; g.beginPath(); for (let m = 0; m < 24; m += .2) g.lineTo(x(m), y(2.1 - .08 * Math.sin(((m - .3) % 2.6) / 2.6 * Math.PI))); g.stroke();
    // an overgrown elder at the left end, brambles along the fence
    for (let i = 0; i < 260; i++) { const a = vr(0, TAU), rr = Math.sqrt(vrand()); g.fillStyle = rgba(mixRgb(PAL.leafShadow, PAL.leafLit, vrand() * .8)); g.beginPath(); g.arc(x(3.2 + Math.cos(a) * rr * 2.4), y(2.2 + Math.sin(a) * rr * 1.7), vr(3, 6), 0, TAU); g.fill(); }
    for (let i = 0; i < 300; i++) { g.fillStyle = rgba(mixRgb(PAL.leafShadow, PAL.leafMid, vrand())); g.beginPath(); g.arc(x(vr(0, 24)), y(vr(0, .7)), vr(2, 4.5), 0, TAU); g.fill(); }
    // the hut: blockwork painted white long ago, grey where the paint has gone, green streaks under the sills
    const h0 = 6.2, h1 = 17.4, top = 3.5;
    const wg = g.createLinearGradient(0, y(top), 0, y(0)); wg.addColorStop(0, '#e2ded2'); wg.addColorStop(1, '#cfc9ba');
    g.fillStyle = wg; g.fillRect(x(h0), y(top), x(h1 - h0), y(0) - y(top));
    g.strokeStyle = 'rgba(90,84,70,.12)'; g.lineWidth = 1;
    for (let m = .22, r = 0; m < top; m += .22, r++) { g.beginPath(); g.moveTo(x(h0), y(m)); g.lineTo(x(h1), y(m)); g.stroke(); for (let k = h0 + (r % 2) * .22; k < h1; k += .44) { g.beginPath(); g.moveTo(x(k), y(m)); g.lineTo(x(k), y(m - .22)); g.stroke(); } }
    for (let i = 0; i < 22; i++) {   // flaking paint
      const px = vr(h0 + .2, h1 - .4), pz = vr(.2, top - .3), w = vr(.15, .7), hh = vr(.1, .4);
      g.fillStyle = 'rgba(150,146,134,.75)'; g.beginPath(); g.ellipse(x(px), y(pz), x(w) / 2, x(hh) / 2, vr(-.3, .3), 0, TAU); g.fill();
    }
    // the windows: dark frames, one boarded with plywood, grime below each
    const wins = [[7.0, 8.9], [9.4, 11.3], [11.8, 13.7]];
    wins.forEach(([a, b], i) => {
      g.fillStyle = 'rgba(70,90,50,.28)'; g.fillRect(x(a + .1), y(1.2), x(b - a - .2), y(.2) - y(1.2));
      g.fillStyle = '#4a3a2c'; g.fillRect(x(a) - 4, y(2.9) - 4, x(b - a) + 8, y(1.3) - y(2.9) + 8);
      if (i === 2) {
        g.fillStyle = '#b39a6e'; g.fillRect(x(a), y(2.9), x(b - a), y(1.3) - y(2.9));
        g.strokeStyle = 'rgba(80,60,40,.35)'; for (let k = 0; k < 6; k++) { g.beginPath(); g.moveTo(x(a), y(1.4 + k * .25)); g.lineTo(x(b), y(1.5 + k * .24)); g.stroke(); }
        g.fillStyle = '#6a6a66'; for (const [px, pz] of [[a + .1, 2.8], [b - .1, 2.8], [a + .1, 1.4], [b - .1, 1.4]]) { g.beginPath(); g.arc(x(px), y(pz), 2, 0, TAU); g.fill(); }
      } else {
        const gl = g.createLinearGradient(0, y(2.9), 0, y(1.3)); gl.addColorStop(0, '#5c6668'); gl.addColorStop(1, '#2a3032');
        g.fillStyle = gl; g.fillRect(x(a), y(2.9), x(b - a), y(1.3) - y(2.9));
        g.fillStyle = '#4a3a2c'; g.fillRect(x((a + b) / 2) - 2, y(2.9), 4, y(1.3) - y(2.9));
        g.fillStyle = 'rgba(255,255,255,.12)'; g.beginPath(); g.moveTo(x(a + .2), y(2.9)); g.lineTo(x(a + .6), y(2.9)); g.lineTo(x(a + .2), y(1.6)); g.closePath(); g.fill();
        if (i === 0) { g.strokeStyle = 'rgba(220,220,210,.6)'; g.lineWidth = 1; g.beginPath(); g.moveTo(x(a + .5), y(2.5)); g.lineTo(x(a + .7), y(2.2)); g.lineTo(x(a + .6), y(1.9)); g.moveTo(x(a + .7), y(2.2)); g.lineTo(x(a + .9), y(2.25)); g.stroke(); }   // a cracked pane
      }
      g.fillStyle = '#9c968a'; g.fillRect(x(a) - 6, y(1.3), x(b - a) + 12, 5);   // the sill
    });
    // the door, green paint gone grey-green, a step and a ramp of weathered boards
    g.fillStyle = '#4c6650'; g.fillRect(x(14.6), y(2.4), x(1.1), y(.15) - y(2.4));
    g.fillStyle = 'rgba(0,0,0,.18)'; g.fillRect(x(14.75), y(2.25), x(.8), y(1.4) - y(2.25)); g.fillRect(x(14.75), y(1.25), x(.8), y(.3) - y(1.25));
    g.fillStyle = '#c9b06a'; g.beginPath(); g.arc(x(15.5), y(1.2), 3, 0, TAU); g.fill();
    g.fillStyle = '#8e8676'; g.fillRect(x(14.4), y(.15), x(1.5), y(0) - y(.15));
    g.fillStyle = '#7a6a54'; g.beginPath(); g.moveTo(x(15.9), y(.4)); g.lineTo(x(19.6), y(0)); g.lineTo(x(15.9), y(0)); g.closePath(); g.fill();
    g.strokeStyle = '#5e6a5e'; g.lineWidth = 3; g.beginPath(); g.moveTo(x(15.9), y(1.3)); g.lineTo(x(19.6), y(.9)); for (const m of [15.9, 17.7, 19.6]) { g.moveTo(x(m), y(1.3 - (m - 15.9) * .11)); g.lineTo(x(m), y(.4 - (m - 15.9) * .11)); } g.stroke();
    // the felt roof, a shallow overhang, a sagging gutter, moss on the edge, and a downpipe that stops short
    g.fillStyle = '#4a3e34'; g.beginPath(); g.moveTo(x(h0 - .5), y(top)); g.lineTo(x(h0 - .2), y(top + .55)); g.lineTo(x(h1 + .2), y(top + .55)); g.lineTo(x(h1 + .5), y(top)); g.closePath(); g.fill();
    g.fillStyle = 'rgba(0,0,0,.25)'; g.fillRect(x(h0), y(top), x(h1 - h0), 6);
    for (let i = 0; i < 90; i++) { g.fillStyle = vrand() < .6 ? 'rgba(104,120,54,.85)' : 'rgba(140,146,70,.8)'; g.beginPath(); g.arc(x(vr(h0 - .3, h1 + .3)), y(top + vr(.4, .6)), vr(1.5, 4), 0, TAU); g.fill(); }
    g.strokeStyle = '#3a3632'; g.lineWidth = 4; g.beginPath(); g.moveTo(x(h0 - .5), y(top - .05)); g.quadraticCurveTo(x((h0 + h1) / 2), y(top - .35), x(h1 + .5), y(top - .05)); g.stroke();
    g.lineWidth = 5; g.beginPath(); g.moveTo(x(h1 + .3), y(top - .05)); g.lineTo(x(h1 + .3), y(1.1)); g.stroke();
    g.fillStyle = 'rgba(60,80,40,.3)'; g.fillRect(x(h1 + .1), y(1.0), x(.5), y(0) - y(1.0));
    // the club's board over the windows, its letters faded
    sign(F, 'PITFOLD PARK B.C.', 8.2, 12.6, 3.0, 3.4, '#3c5a3c', 'rgba(232,226,200,.85)', `700 ${Math.round(PX * .26)}px Georgia, serif`);
    g.fillStyle = 'rgba(200,200,190,.35)'; g.fillRect(x(9.3), y(3.32), x(.5), 4);
    // a wheelie bin, a picnic bench with a split plank, and a broken plastic chair
    g.fillStyle = '#2f4a38'; g.beginPath(); g.roundRect(x(4.9), y(1.15), x(.7), y(0) - y(1.15), 3); g.fill(); g.fillStyle = '#263c2e'; g.fillRect(x(4.85), y(1.2), x(.8), 6);
    g.fillStyle = '#7d6a50'; g.fillRect(x(19.9), y(.78), x(2.0), 6); g.fillRect(x(19.7), y(.45), x(2.4), 5);
    g.strokeStyle = '#6a5a44'; g.lineWidth = 4; g.beginPath(); g.moveTo(x(20.2), y(0)); g.lineTo(x(20.6), y(.78)); g.moveTo(x(20.9), y(0)); g.lineTo(x(20.5), y(.78)); g.moveTo(x(21.4), y(0)); g.lineTo(x(21.8), y(.78)); g.moveTo(x(22.1), y(0)); g.lineTo(x(21.7), y(.78)); g.stroke();
    g.fillStyle = 'rgba(40,30,20,.6)'; g.fillRect(x(20.8), y(.79), 3, 6);
    g.fillStyle = '#ece8de'; g.fillRect(x(5.9), y(.5), x(.45), 4); g.fillRect(x(5.95), y(.95), x(.35), y(.55) - y(.95));
    g.strokeStyle = '#ece8de'; g.lineWidth = 2; g.beginPath(); g.moveTo(x(5.95), y(.5)); g.lineTo(x(5.9), y(0)); g.moveTo(x(6.3), y(.5)); g.lineTo(x(6.45), y(.12)); g.stroke();
    sunWash(g, c); return c;
  };
  // the town beyond the park: terraces with their chimneys, a mill chimney, a tower block, pylons
  const townBand = seed => {
    const B = bandCanvas(seed), { g, cw, ch } = B;
    const far = ridge(ch * .5, ch * .08, TAU / 700, vr(0, 6));
    hill(B, far, 'rgb(136,144,150)');   // the moor, grey with distance
    clipHill(B, far); for (let i = 0; i < 120; i++) { g.fillStyle = 'rgba(160,150,120,.25)'; g.beginPath(); g.ellipse(vr(0, cw), ch - far(vr(0, cw)) + vr(4, 30), vr(20, 60), vr(3, 6), 0, 0, TAU); g.fill(); } g.restore();
    for (let px = vr(100, 400); px < cw; px += vr(700, 1100)) {   // a pylon line
      g.strokeStyle = 'rgba(96,100,104,.7)'; g.lineWidth = 1.2;
      const b = ch - 18, t = ch - 76;
      g.beginPath(); g.moveTo(px - 8, b); g.lineTo(px, t); g.lineTo(px + 8, b); g.moveTo(px - 14, t + 12); g.lineTo(px + 14, t + 12); g.moveTo(px - 11, t + 24); g.lineTo(px + 11, t + 24); g.stroke();
      g.strokeStyle = 'rgba(96,100,104,.35)'; g.beginPath(); g.moveTo(px + 14, t + 12); g.quadraticCurveTo(px + 300, t + 30, px + 700, t + 12); g.stroke();
    }
    for (let px = vr(200, 600); px < cw; px += vr(900, 1500)) {   // a tower block
      const w = vr(34, 48), hgt = vr(70, 90);
      g.fillStyle = 'rgb(150,150,148)'; g.fillRect(px, ch - hgt, w, hgt);
      g.fillStyle = 'rgba(60,66,74,.55)'; for (let yy = ch - hgt + 5; yy < ch - 10; yy += 5) for (let xx = px + 3; xx < px + w - 3; xx += 5) g.fillRect(xx, yy, 3, 2);
    }
    for (let px = vr(500, 900); px < cw; px += vr(1100, 1600)) {   // a mill chimney, and its mill
      g.fillStyle = 'rgb(128,86,70)'; g.beginPath(); g.moveTo(px - 7, ch - 30); g.lineTo(px - 4, ch - 118); g.lineTo(px + 4, ch - 118); g.lineTo(px + 7, ch - 30); g.closePath(); g.fill();
      g.fillStyle = 'rgb(100,70,58)'; g.fillRect(px - 5, ch - 122, 10, 5);
      g.fillStyle = 'rgb(122,84,68)'; g.fillRect(px + 10, ch - 60, 150, 60); g.fillStyle = 'rgba(40,40,40,.4)'; for (let xx = px + 16; xx < px + 155; xx += 10) for (let yy = ch - 54; yy < ch - 10; yy += 11) g.fillRect(xx, yy, 5, 6);
    }
    // terraces: long rows of slate roofs, brick between, the chimney stacks and their pots
    for (const [base, k] of [[54, .7], [40, .85], [26, 1]]) {
      for (let px = vr(-60, 0); px < cw; ) {
        const len = vr(160, 320), roofH = 9 * k, wallH = 6 * k, yb = ch - base;
        g.fillStyle = rgba(mixRgb([150, 94, 72], PAL.haze, 1 - k * .7)); g.fillRect(px, yb - wallH, len, wallH + base);
        g.fillStyle = rgba(mixRgb([84, 88, 96], PAL.haze, 1 - k * .7)); g.beginPath(); g.moveTo(px, yb - wallH); g.lineTo(px + 4, yb - wallH - roofH); g.lineTo(px + len - 4, yb - wallH - roofH); g.lineTo(px + len, yb - wallH); g.closePath(); g.fill();
        g.fillStyle = rgba(mixRgb([110, 72, 58], PAL.haze, 1 - k * .7));
        for (let cx0 = px + 10; cx0 < px + len - 8; cx0 += 18 * k + 6) { g.fillRect(cx0, yb - wallH - roofH - 6 * k, 5 * k, 6 * k + 1); g.fillRect(cx0 + 1, yb - wallH - roofH - 8 * k, 1.5, 2 * k); g.fillRect(cx0 + 3, yb - wallH - roofH - 8 * k, 1.5, 2 * k); }
        if (vrand() < .4) { g.strokeStyle = 'rgba(70,70,70,.6)'; g.lineWidth = 1; const ax = px + vr(10, len - 10), ay = yb - wallH - roofH - 6 * k; g.beginPath(); g.moveTo(ax, ay); g.lineTo(ax, ay - 8); g.moveTo(ax - 4, ay - 7); g.lineTo(ax + 4, ay - 7); g.stroke(); }
        px += len + vr(20, 90);
      }
    }
    treeLine(B, ch * .14, 'rgb(70,86,56)', 16);
    return airOver(B);
  };
  // the gasholder: a ring of lattice standards and girders, long empty
  const gasholder = () => {
    const PX = 8, wm = 44, hm = 26, c = makeCanvas(wm * PX, hm * PX), g = c.getContext('2d'), y = m => c.height - m * PX, x = m => m * PX;
    g.strokeStyle = '#6e5a50'; g.lineWidth = 2.5;
    const cols = 11;
    for (let i = 0; i <= cols; i++) { const a = Math.PI * i / cols, px = x(22 - Math.cos(a) * 20); g.beginPath(); g.moveTo(px, y(0)); g.lineTo(px, y(25)); g.stroke(); }
    g.lineWidth = 1.6;
    for (const m of [7, 13.5, 19.5, 25]) { g.beginPath(); g.moveTo(x(2), y(m)); g.lineTo(x(42), y(m)); g.stroke(); }
    g.strokeStyle = 'rgba(110,90,80,.55)'; g.lineWidth = 1;
    for (let i = 0; i < cols; i++) { const a = Math.PI * i / cols, b = Math.PI * (i + 1) / cols, p0 = x(22 - Math.cos(a) * 20), p1 = x(22 - Math.cos(b) * 20);
      for (const [lo, hi] of [[0, 7], [7, 13.5], [13.5, 19.5], [19.5, 25]]) { g.beginPath(); g.moveTo(p0, y(lo)); g.lineTo(p1, y(hi)); g.moveTo(p1, y(lo)); g.lineTo(p0, y(hi)); g.stroke(); } }
    c.wm = wm; c.hm = hm; return c;
  };
  /* A dead elm: bare limbs forking up from a split trunk. */
  const deadElm = variant => {
    reseed(900 + variant * 19);
    const PX = 24, w = 12, h = 15, c = makeCanvas(w * PX, h * PX), g = c.getContext('2d');
    g.lineCap = 'round';
    const limb = (x0, y0, a, len, wdt, depth) => {
      const x1 = x0 + Math.cos(a) * len, y1 = y0 + Math.sin(a) * len;
      const gr = g.createLinearGradient(x0 - wdt, 0, x0 + wdt, 0); gr.addColorStop(0, '#8a8278'); gr.addColorStop(1, '#4e4840');
      g.strokeStyle = gr; g.lineWidth = wdt; g.beginPath(); g.moveTo(x0, y0); g.quadraticCurveTo((x0 + x1) / 2 + vr(-6, 6), (y0 + y1) / 2, x1, y1); g.stroke();
      if (depth <= 0 || wdt < 1.2) return;
      const n = vrand() < .7 ? 2 : 3;
      for (let i = 0; i < n; i++) limb(x1, y1, a + vr(-.7, .7) + (i - (n - 1) / 2) * .45, len * vr(.6, .8), wdt * .62, depth - 1);
    };
    limb(c.width / 2, c.height, -Math.PI / 2 + vr(-.1, .1), h * PX * .32, 15, 6);
    // ivy up the trunk
    for (let i = 0; i < 70; i++) { g.fillStyle = vrand() < .5 ? 'rgba(40,62,34,.9)' : 'rgba(66,92,48,.9)'; g.beginPath(); g.arc(c.width / 2 + vr(-9, 9), c.height - vr(0, h * PX * .3), vr(2, 4), 0, TAU); g.fill(); }
    return c;
  };
  Art.treeSpecs.deadelm = { w: 12, h: 15, build: deadElm };
  // the green: patches burnt brown where the watering stopped, bare earth where the mats go, moss, clover
  const pitfoldWear = (g, X, Y, S) => {
    const blob = (cx, cy, r, inner, outer) => {
      for (let k = 0; k < 7; k++) {
        const ox = cx + vr(-r, r) * .6, oy = cy + vr(-r, r) * .6, rr = r * vr(.45, .8), gr = g.createRadialGradient(X(ox), Y(oy), 0, X(ox), Y(oy), rr / S);
        gr.addColorStop(0, inner); gr.addColorStop(.6, inner.replace(/[\d.]+\)$/, m => (parseFloat(m) * .7).toFixed(2) + ')')); gr.addColorStop(1, outer);
        g.fillStyle = gr; g.beginPath(); g.ellipse(X(ox), Y(oy), rr / S, rr / S * vr(.6, 1), vr(0, TAU), 0, TAU); g.fill();
      }
    };
    for (let i = 0; i < 16; i++) blob(vr(-12, 12), vr(1, 35), vr(.8, 2.6), vrand() < .5 ? 'rgba(164,134,78,.62)' : 'rgba(132,100,62,.58)', 'rgba(150,140,80,0)');
    blob(-8.5, 19, 3.6, 'rgba(158,128,74,.55)', 'rgba(150,140,80,0)'); blob(6.5, 27, 2.8, 'rgba(140,108,66,.5)', 'rgba(150,140,80,0)');   // two big ones
    for (const rx of [-10, -5, 0, 5, 10]) for (const my of [3.1, 32.9]) blob(rx, my, .8, 'rgba(116,90,62,.8)', 'rgba(120,100,70,0)');   // the mats' places, down to earth
    for (let i = 0; i < 14; i++) blob(vr(-12, 12), vr(0, 36), vr(.5, 1.4), 'rgba(122,136,58,.45)', 'rgba(122,136,58,0)');   // moss
    for (let i = 0; i < 900; i++) { g.fillStyle = vrand() < .5 ? 'rgba(40,74,30,.35)' : 'rgba(214,210,170,.25)'; g.beginPath(); g.arc(X(vr(-12.4, 12.4)), Y(vr(.1, 35.9)), vr(1, 3), 0, TAU); g.fill(); }   // clover and daisies
  };
  // the path: cracked slabs, a few sunk and darker, dandelions and grass in the joints, moss along the edges
  const pitfoldPath = (g, X, Y, S) => {
    for (let i = 0; i < 70; i++) { const sx = -15.2 + Math.floor(vr(0, 34)) * .9, sy = -2.6 + Math.floor(vr(0, 69)) * .6; g.fillStyle = vrand() < .5 ? 'rgba(60,56,46,.16)' : 'rgba(200,196,180,.14)'; g.fillRect(X(sx), Y(sy), .9 / S, .6 / S); }
    g.strokeStyle = 'rgba(40,36,30,.35)'; g.lineWidth = 1;
    for (let i = 0; i < 90; i++) { let px = vr(-15, 15), py = vr(-2.5, 38.5); g.beginPath(); g.moveTo(X(px), Y(py)); for (let k = 0; k < 4; k++) { px += vr(-.25, .25); py += vr(-.25, .25); g.lineTo(X(px), Y(py)); } g.stroke(); }
    for (let i = 0; i < 1800; i++) {
      const along = vrand() < .5, px = along ? -15.2 + Math.floor(vr(0, 34)) * .9 + vr(-.03, .03) : vr(-15.2, 15.2), py = along ? vr(-2.6, 38.6) : -2.6 + Math.floor(vr(0, 69)) * .6 + vr(-.03, .03);
      if (Math.abs(px) < 13.2 && py > -.7 && py < 36.7) continue;
      g.fillStyle = vrand() < .85 ? `rgba(${70 + vr(0, 30) | 0},${100 + vr(0, 30) | 0},50,.8)` : 'rgba(226,196,60,.9)'; g.beginPath(); g.arc(X(px), Y(py), vr(1, 2.6), 0, TAU); g.fill();
    }
  };
  // a weathered bench with a slat missing
  const pitfoldBench = () => {
    const PX = 60, wm = 1.8, hm = 0.95, c = makeCanvas(wm * PX, hm * PX), g = c.getContext('2d'), y = m => c.height - m * PX, x = m => m * PX;
    g.fillStyle = '#6e6658'; for (const m of [0.12, 1.6]) g.fillRect(x(m), y(0.85), 6, y(0) - y(0.85));
    g.fillStyle = '#8f877a'; for (const i of [0, 2]) g.fillRect(x(0.05), y(0.85 - i * 0.12), x(1.7), 5);
    g.fillStyle = '#8f877a'; g.fillRect(x(0.05), y(0.73), x(.7), 5);   // the middle slat, broken off
    g.fillStyle = '#7d7568'; g.fillRect(x(0.05), y(0.45), x(1.7), 7);
    g.fillStyle = 'rgba(80,100,50,.4)'; g.fillRect(x(.05), y(.45), x(1.7), 3);
    c.wm = wm; c.hm = hm; return c;
  };

  /* A cabbage tree (tī kōuka in New Zealand, the "Torbay palm" of English seafronts): a slim pale trunk forking
     once or twice, each branch ending in a mop of long narrow leaves, the dead ones hanging under it. */
  const cordyline = variant => {
    reseed(1000 + variant * 23);
    const PX = 30, w = 6, h = 9, c = makeCanvas(w * PX, h * PX), g = c.getContext('2d'), cw = c.width, ch = c.height, tips = [];
    const L = [[30, 52, 30], [70, 100, 52], [128, 150, 84], [182, 192, 128]];
    g.lineCap = 'round';
    const branch = (x0, y0, a, len, wd, depth) => {
      const x1 = x0 + Math.cos(a) * len, y1 = y0 + Math.sin(a) * len;
      const gr = g.createLinearGradient(x0 - wd, 0, x0 + wd, 0); gr.addColorStop(0, '#ab9c86'); gr.addColorStop(1, '#5f5446');
      g.strokeStyle = gr; g.lineWidth = wd; g.beginPath(); g.moveTo(x0, y0); g.quadraticCurveTo((x0 + x1) / 2 + vr(-4, 4), (y0 + y1) / 2, x1, y1); g.stroke();
      if (depth <= 0) { tips.push([x1, y1]); return; }
      const n = vrand() < .6 ? 2 : 3;
      for (let i = 0; i < n; i++) branch(x1, y1, a + (i - (n - 1) / 2) * vr(.45, .75), len * vr(.4, .6), wd * .7, depth - 1);
    };
    branch(cw / 2, ch, -Math.PI / 2 + vr(-.08, .08), ch * vr(.4, .52), 9, variant % 3 === 0 ? 1 : 2);
    for (const [tx, ty] of tips) for (let i = 0; i < 18; i++) {   // the dead skirt
      const a = Math.PI / 2 + vr(-.6, .6), l = vr(.5, .9) * PX;
      g.strokeStyle = `rgba(${150 + vr(-15, 15) | 0},${128 + vr(-10, 10) | 0},90,.85)`; g.lineWidth = vr(1.2, 2.2);
      g.beginPath(); g.moveTo(tx, ty + 4); g.quadraticCurveTo(tx + Math.cos(a) * l * .3, ty + l * .5, tx + Math.cos(a) * l * .5, ty + Math.sin(a) * l); g.stroke();
    }
    for (const [tx, ty] of tips) for (let i = 0; i < 48; i++) {   // the heads: blades radiating and arching, lit from the upper left
      const a = -Math.PI / 2 + vr(-1.9, 1.9), l = vr(.6, 1.1) * PX, ex = tx + Math.cos(a) * l, ey = ty + Math.sin(a) * l * .8 + l * .25 * Math.abs(Math.cos(a));
      const li = clamp(.5 - .35 * Math.cos(a) - .25 * Math.sin(a) + vr(-.15, .15), 0, 1);
      g.strokeStyle = rgba(leafCol(L, li), .95); g.lineWidth = vr(1.4, 2.6);
      g.beginPath(); g.moveTo(tx, ty); g.quadraticCurveTo(tx + Math.cos(a) * l * .6, ty + Math.sin(a) * l * .6 - 4, ex, ey); g.stroke();
    }
    return c;
  };
  /* A floodlight mast: a galvanised pole and a head frame of four lamps angled down at the green, each with
     its glare. Drawn lit (c.lit), so the evening doesn't dim it. */
  const mast = () => {
    const PX = 24, w = 5, h = 11, c = makeCanvas(w * PX, h * PX), g = c.getContext('2d'), cx = c.width / 2, y = m => c.height - m * PX, x = m => cx + m * PX;
    const pg = g.createLinearGradient(x(-.18), 0, x(.18), 0); pg.addColorStop(0, '#a6acb0'); pg.addColorStop(.5, '#7d8488'); pg.addColorStop(1, '#3e4448');
    g.fillStyle = pg; g.beginPath(); g.moveTo(x(-.17), y(0)); g.lineTo(x(-.08), y(9.0)); g.lineTo(x(.08), y(9.0)); g.lineTo(x(.17), y(0)); g.closePath(); g.fill();
    g.fillStyle = '#5a6064'; g.fillRect(x(-.22), y(.6), x(.44) - x(0), y(0) - y(.6));   // the base flange and door
    g.fillStyle = '#2e3236'; g.fillRect(x(-1.55), y(9.1), 3.1 * PX, 4); g.fillRect(x(-1.55), y(9.85), 3.1 * PX, 4); for (const m of [-1.55, 1.5]) g.fillRect(x(m), y(9.9), 4, .85 * PX);
    for (const lx of [-1.12, -.38, .38, 1.12]) {
      g.fillStyle = '#25292c'; g.fillRect(x(lx - .3), y(9.8), .6 * PX, .6 * PX);
      const gl = g.createRadialGradient(x(lx), y(9.42), 0, x(lx), y(9.42), 1.25 * PX);
      gl.addColorStop(0, 'rgba(255,250,232,.85)'); gl.addColorStop(.18, 'rgba(255,244,214,.45)'); gl.addColorStop(1, 'rgba(255,240,200,0)');
      g.fillStyle = gl; g.fillRect(x(lx - 1.25), y(10.7), 2.5 * PX, 2.5 * PX);
      g.fillStyle = '#fffbee'; g.fillRect(x(lx - .24), y(9.62), .48 * PX, .38 * PX);
    }
    c.lit = true; return c;
  };
  Object.assign(Art.treeSpecs, {
    cordyline: { w: 6, h: 9, build: cordyline },
    mast: { w: 5, h: 11, build: mast },
    holmoak: { w: 12, h: 12, crownY: .45, rx: .48, ry: .42, trunk: .24, clumps: 26, dense: .92,
      bark: ['#6e675c', '#3c3730', '#45403a'], leaf: [[20, 32, 24], [42, 60, 40], [86, 102, 70], [132, 142, 104]] },
    tamarisk: { w: 7, h: 6.5, crownY: .45, rx: .48, ry: .4, trunk: .14, clumps: 20, dense: .55, open: true,
      bark: ['#7a6a58', '#4a3e32', '#55473a'], leaf: [[62, 74, 58], [110, 122, 98], [168, 168, 150], [214, 186, 196]] },
    kowhai: { w: 7, h: 8, crownY: .4, rx: .46, ry: .38, trunk: .16, clumps: 20, dense: .6, open: true,
      bark: ['#8a7a64', '#4c4234', '#55493a'], leaf: [[64, 74, 32], [126, 134, 44], [204, 184, 52], [242, 216, 92]] },
    macrocarpa: { w: 16, h: 15, crownY: .44, rx: .49, ry: .42, trunk: .3, clumps: 30, dense: .95,
      bark: ['#7d6a56', '#3e3228', '#4a3c30'], leaf: [[14, 30, 22], [32, 56, 36], [70, 96, 56], [110, 132, 82]] },
    jacaranda: { w: 11, h: 10, crownY: .4, rx: .48, ry: .36, trunk: .22, clumps: 24, dense: .62, open: true,
      bark: ['#7a6e62', '#3e3830', '#4a4238'], leaf: [[62, 52, 96], [112, 96, 168], [150, 132, 210], [196, 182, 236]] },
    stonepine: { w: 13, h: 14, crownY: .22, rx: .49, ry: .19, trunk: .2, clumps: 22, dense: .85,
      bark: ['#9a6a4a', '#4e3424', '#5e4030'], leaf: [[22, 40, 26], [46, 72, 44], [92, 116, 70], [136, 152, 100]] }
  });

  // ================= Marram Bay, Norfolk =================
  /* A seafront club: an Edwardian pavilion with a clock turret and a striped canopy, deckchairs out front,
     beach huts either side on the promenade, and the North Sea beyond with the pier and a wind farm. */
  const marramPavilion = () => {
    const F = frame(), { g, c, x, y, PX } = F;
    // the beach huts along the promenade, either side
    const huts = [[0, '#7fb0d6'], [1.35, '#f2d25a'], [2.7, '#e45d4f'], [4.05, '#9ed0b4'], [19.25, '#f1a8b8'], [20.6, '#ffffff'], [21.95, '#5e8fc6'], [23.3, '#f2d25a']];
    huts.forEach(([m, col], i) => {
      g.fillStyle = col; g.fillRect(x(m + .05), y(2.25), x(1.2), y(0) - y(2.25));
      if (i % 3 === 1) { g.fillStyle = 'rgba(255,255,255,.75)'; for (let k = m + .12; k < m + 1.2; k += .24) g.fillRect(x(k), y(2.25), x(.12), y(0) - y(2.25)); }   // a striped one
      for (let z = .18; z < 2.2; z += .18) { g.fillStyle = 'rgba(0,0,0,.07)'; g.fillRect(x(m + .05), y(z), x(1.2), 1); }
      g.fillStyle = '#f2f0e8'; g.beginPath(); g.moveTo(x(m - .02), y(2.2)); g.lineTo(x(m + .65), y(2.85)); g.lineTo(x(m + 1.32), y(2.2)); g.closePath(); g.fill();
      g.fillStyle = 'rgba(0,0,0,.18)'; g.fillRect(x(m + .3), y(1.75), x(.7), y(.08) - y(1.75)); g.fillStyle = col; g.fillRect(x(m + .34), y(1.71), x(.3), y(.12) - y(1.71)); g.fillRect(x(m + .66), y(1.71), x(.3), y(.12) - y(1.71));
      g.fillStyle = '#d8d0b8'; g.fillRect(x(m), y(.08), x(1.3), y(0) - y(.08));
    });
    // the pavilion: white weatherboard under a verdigris roof
    const p0 = 5.6, p1 = 18.4, top = 3.4;
    g.fillStyle = '#7fa89a'; g.beginPath(); g.moveTo(x(p0 - .4), y(top)); g.lineTo(x(p0 + 1.8), y(5.2)); g.lineTo(x(p1 - 1.8), y(5.2)); g.lineTo(x(p1 + .4), y(top)); g.closePath(); g.fill();
    g.save(); g.clip(); for (let m = p0; m < p1; m += .3) { g.fillStyle = 'rgba(255,255,255,.08)'; g.fillRect(x(m), y(5.2), 2, y(top) - y(5.2)); } g.restore();   // the roll joints
    g.fillStyle = 'rgba(0,0,0,.12)'; g.beginPath(); g.moveTo(x(p1 - 1.8), y(5.2)); g.lineTo(x(p1 + .4), y(top)); g.lineTo(x(p1 - 2.4), y(top)); g.closePath(); g.fill();
    g.fillStyle = '#f6f4ee'; g.fillRect(x(p0), y(top), x(p1 - p0), y(0) - y(top));
    for (let z = .16; z < top; z += .16) { g.fillStyle = 'rgba(80,80,90,.10)'; g.fillRect(x(p0), y(z), x(p1 - p0), 1.5); }
    // the clock turret: a little white drum, its lead dome and the gilt fish on top
    g.fillStyle = '#f6f4ee'; g.fillRect(x(11.2), y(7.0), x(1.6), y(5.0) - y(7.0));
    g.fillStyle = '#6f9a8c'; g.beginPath(); g.moveTo(x(11.0), y(7.0)); g.quadraticCurveTo(x(12), y(8.5), x(13.0), y(7.0)); g.closePath(); g.fill();
    g.strokeStyle = '#c9a862'; g.lineWidth = 2; g.beginPath(); g.moveTo(x(12), y(8.0)); g.lineTo(x(12), y(8.6)); g.stroke();
    g.fillStyle = '#c9a862'; g.beginPath(); g.ellipse(x(12), y(8.7), x(.3), x(.09), 0, 0, TAU); g.fill(); g.beginPath(); g.moveTo(x(12.28), y(8.7)); g.lineTo(x(12.42), y(8.82)); g.lineTo(x(12.42), y(8.58)); g.closePath(); g.fill();
    const ccx = x(12), ccy = y(6.05), cr = x(.52) - x(0);
    g.fillStyle = '#1f2a2a'; g.beginPath(); g.arc(ccx, ccy, cr + 3, 0, TAU); g.fill(); g.fillStyle = '#fbfaf2'; g.beginPath(); g.arc(ccx, ccy, cr, 0, TAU); g.fill();
    g.strokeStyle = '#1f2a2a'; g.lineWidth = 2.5; g.beginPath(); g.moveTo(ccx, ccy); g.lineTo(ccx + cr * .5, ccy + cr * .2); g.moveTo(ccx, ccy); g.lineTo(ccx - cr * .1, ccy - cr * .78); g.stroke();
    // french doors along the front, the sea's light in them
    for (let m = p0 + .5; m < p1 - .9; m += 1.55) {
      const gl = g.createLinearGradient(0, y(2.7), 0, y(.15)); gl.addColorStop(0, '#a8c4d2'); gl.addColorStop(.5, '#5f7d8a'); gl.addColorStop(1, '#2e3c42');
      g.fillStyle = gl; g.fillRect(x(m), y(2.7), x(1.2), y(.15) - y(2.7));
      g.fillStyle = '#ffffff'; g.fillRect(x(m + .58), y(2.7), 3, y(.15) - y(2.7)); g.fillRect(x(m), y(1.7), x(1.2), 3);
      g.strokeStyle = '#ffffff'; g.lineWidth = 3; g.strokeRect(x(m), y(2.7), x(1.2), y(.15) - y(2.7));
    }
    // the canopy: green and white stripes, a scalloped valance, on thin iron posts
    for (let m = p0 - .3, i = 0; m < p1 + .3; m += .4, i++) {
      g.fillStyle = i % 2 ? '#f6f4ee' : '#2f7a5a';
      g.beginPath(); g.moveTo(x(m), y(3.25)); g.lineTo(x(m + .4), y(3.25)); g.lineTo(x(m + .46), y(2.75)); g.lineTo(x(m - .06), y(2.75)); g.closePath(); g.fill();
      g.beginPath(); g.arc(x(m + .2), y(2.75), x(.2) - x(0), 0, Math.PI); g.fill();
    }
    g.fillStyle = 'rgba(0,0,0,.16)'; g.fillRect(x(p0), y(2.5), x(p1 - p0), 8);
    g.fillStyle = '#2b3433'; for (let m = p0 - .2; m <= p1 + .3; m += 3.2) g.fillRect(x(m) - 2, y(2.7), 4, y(0) - y(2.7));
    sign(F, 'MARRAM BAY BOWLS CLUB', 8.2, 15.8, 3.62, 4.2, '#1f4a5a', '#f6f0d8', `700 ${Math.round(PX * .27)}px Georgia, serif`);
    // bunting from the turret down to the canopy's ends
    for (const [x0, x1] of [[11.2, p0 - .3], [12.8, p1 + .3]]) {
      const n = 13;
      for (let i = 0; i < n; i++) {
        const t = i / n, t1 = (i + 1) / n, sag = u => 1.0 * Math.sin(u * Math.PI);
        const ax = x0 + (x1 - x0) * t, az = 6.6 - (6.6 - 3.3) * t - sag(t) * .45, bx = x0 + (x1 - x0) * t1, bz = 6.6 - (6.6 - 3.3) * t1 - sag(t1) * .45;
        g.strokeStyle = 'rgba(60,60,60,.6)'; g.lineWidth = 1; g.beginPath(); g.moveTo(x(ax), y(az)); g.lineTo(x(bx), y(bz)); g.stroke();
        g.fillStyle = ['#d8352a', '#f6f4ee', '#1f4a8a', '#f2c230'][i % 4]; g.beginPath(); g.moveTo(x(ax + (bx - ax) * .15), y(az)); g.lineTo(x(ax + (bx - ax) * .85), y(bz)); g.lineTo(x((ax + bx) / 2), y((az + bz) / 2 - .32)); g.closePath(); g.fill();
      }
    }
    // a board for teas, and the deckchairs out on the grass
    g.fillStyle = '#2b3433'; g.fillRect(x(5.0), y(.9), 3, y(0) - y(.9)); g.fillStyle = '#1f4a5a'; g.fillRect(x(4.55), y(1.3), x(.9), y(.75) - y(1.3));
    g.fillStyle = '#f6f0d8'; g.font = `700 ${Math.round(PX * .17)}px Georgia, serif`; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('TEAS', x(5.0), y(1.03));
    for (const [m, cols] of [[6.6, ['#e45d4f', '#f6f4ee']], [8.0, ['#2f6ab0', '#f6f4ee']], [15.6, ['#f2c230', '#2f7a5a']], [17.0, ['#e45d4f', '#2f6ab0']]]) {
      g.fillStyle = '#9a7a50'; g.fillRect(x(m - .02), y(.9), 3, y(0) - y(.9)); g.fillRect(x(m + .58), y(.9), 3, y(0) - y(.9));
      for (let k = 0; k < 6; k++) { g.fillStyle = cols[k % 2]; g.beginPath(); const a = m + k * .1, b = a + .1; g.moveTo(x(a), y(.92)); g.lineTo(x(b), y(.92)); g.lineTo(x(b + .08), y(.38)); g.lineTo(x(a + .08), y(.38)); g.closePath(); g.fill(); }
      g.fillStyle = '#9a7a50'; g.fillRect(x(m + .02), y(.38), x(.7), 3);
    }
    sunWash(g, c); return c;
  };
  // looking toward the pavilion: the promenade railings, the beach, and the grey-green sea out to the wind farm
  const marramSea = seed => {
    const B = bandCanvas(seed), { g, cw, ch } = B, hzY = ch * .52;
    const sea = g.createLinearGradient(0, ch - hzY, 0, ch); sea.addColorStop(0, 'rgb(112,140,152)'); sea.addColorStop(.6, 'rgb(84,124,134)'); sea.addColorStop(1, 'rgb(96,134,138)');
    g.fillStyle = sea; g.fillRect(0, ch - hzY, cw, hzY);
    for (let i = 0; i < 1100; i++) { const yy = vr(ch - hzY + 2, ch - 10), k = 1 - (ch - yy) / hzY; g.fillStyle = `rgba(250,252,250,${vr(.1, .45) * k})`; g.fillRect(vr(0, cw), yy, vr(3, 14) * (.4 + k), 1); }
    g.fillStyle = 'rgba(255,255,255,.4)'; g.fillRect(0, ch - hzY, cw, 1);
    for (let px = vr(100, 500); px < cw; px += vr(900, 1300)) for (let k = 0; k < 9; k++) {   // the wind farm on the horizon
      const tx = px + k * vr(22, 34), tb = ch - hzY + 1, th = vr(11, 14), a = vr(0, TAU);
      g.strokeStyle = 'rgba(222,226,228,.85)'; g.lineWidth = 1.2; g.beginPath(); g.moveTo(tx, tb); g.lineTo(tx, tb - th); g.stroke();
      g.lineWidth = .9; g.beginPath(); for (let b = 0; b < 3; b++) { const ab = a + b * TAU / 3; g.moveTo(tx, tb - th); g.lineTo(tx + Math.cos(ab) * 5, tb - th + Math.sin(ab) * 5); } g.stroke();
    }
    // the pier, out into the sea on its iron legs, a domed pavilion at the end
    for (let px = vr(200, 700); px < cw; px += 2400) {
      const deck = ch - hzY * .55, len = 620;
      g.fillStyle = 'rgb(90,86,80)'; for (let k = 0; k < len; k += 14) g.fillRect(px + k, deck, 2, ch - hzY * .3 - deck + (k / len) * -hzY * .1);
      g.strokeStyle = 'rgba(80,76,70,.6)'; g.lineWidth = 1; for (let k = 0; k < len - 14; k += 14) { g.beginPath(); g.moveTo(px + k, deck + 3); g.lineTo(px + k + 14, deck + 12); g.moveTo(px + k + 14, deck + 3); g.lineTo(px + k, deck + 12); g.stroke(); }
      g.fillStyle = 'rgb(236,232,222)'; g.fillRect(px - 10, deck - 3, len + 10, 4);
      g.fillStyle = 'rgb(210,206,196)'; for (let k = 0; k < len; k += 40) g.fillRect(px + k, deck - 8, 1.5, 6);
      const ex = px + len;
      g.fillStyle = 'rgb(240,236,228)'; g.fillRect(ex - 6, deck - 22, 70, 20);
      g.fillStyle = 'rgb(112,150,140)'; g.beginPath(); g.moveTo(ex - 8, deck - 22); g.quadraticCurveTo(ex + 29, deck - 44, ex + 66, deck - 22); g.closePath(); g.fill();
      g.fillStyle = 'rgba(60,80,90,.6)'; for (let k = 0; k < 6; k++) g.fillRect(ex + k * 11, deck - 17, 6, 8);
    }
    // the shingle and groynes below the promenade
    const beach = ridge(ch * .2, ch * .02, TAU / 300, vr(0, 6));
    hill(B, beach, 'rgb(186,172,148)');
    clipHill(B, beach); for (let i = 0; i < 2200; i++) { g.fillStyle = vrand() < .5 ? 'rgba(120,108,92,.4)' : 'rgba(232,224,208,.5)'; g.fillRect(vr(0, cw), ch - vr(0, ch * .22), vr(1, 3), vr(1, 2)); } g.restore();
    g.fillStyle = 'rgba(250,250,246,.6)'; for (let px = 0; px < cw; px += 4) g.fillRect(px, ch - beach(px) - 1.5 + Math.sin(px * .05) * 1.2, 4, 2);   // the waves' edge
    for (let px = vr(40, 160); px < cw; px += vr(160, 260)) { g.fillStyle = 'rgb(96,80,64)'; g.beginPath(); g.moveTo(px, ch - beach(px) - 2); g.lineTo(px + 40, ch - beach(px) + 6); g.lineTo(px + 40, ch - beach(px) + 9); g.lineTo(px, ch - beach(px) + 2); g.closePath(); g.fill(); }
    // the promenade: its wall, the blue railings, a lamp now and then; tamarisk over the wall
    g.fillStyle = 'rgb(206,202,192)'; g.fillRect(0, ch - ch * .1, cw, ch * .1);
    g.strokeStyle = 'rgba(52,88,132,.85)'; g.lineWidth = 1.4; g.beginPath(); g.moveTo(0, ch - ch * .16); g.lineTo(cw, ch - ch * .16); g.moveTo(0, ch - ch * .12); g.lineTo(cw, ch - ch * .12); for (let px = 0; px < cw; px += 9) { g.moveTo(px, ch - ch * .1); g.lineTo(px, ch - ch * .16); } g.stroke();
    for (let px = vr(50, 200); px < cw; px += vr(180, 260)) { g.fillStyle = 'rgb(46,74,108)'; g.fillRect(px, ch - ch * .36, 2, ch * .26); g.beginPath(); g.arc(px + 1, ch - ch * .37, 3.5, 0, TAU); g.fill(); }
    for (let px = 0; px < cw; px += vr(30, 110)) { g.fillStyle = vrand() < .6 ? 'rgb(112,124,96)' : 'rgb(150,140,136)'; g.beginPath(); g.ellipse(px, ch - ch * .08, vr(14, 34), vr(6, 12), 0, 0, TAU); g.fill(); }
    return airOver(B);
  };
  // the other way: the town on the low cliff, its tall hotels, the church tower and the lighthouse
  const marramTown = seed => {
    const B = bandCanvas(seed), { g, cw, ch } = B;
    const cliff = ridge(ch * .34, ch * .05, TAU / 900, vr(0, 6));
    hill(B, cliff, 'rgb(164,170,132)');
    for (let px = vr(200, 600); px < cw; px += vr(1100, 1500)) {   // the church's flint tower
      const b = ch - cliff(px) + 10, tw = 22, th = 82;
      g.fillStyle = 'rgb(150,148,140)'; g.fillRect(px, b - th, tw, th); g.fillStyle = 'rgb(120,118,112)'; g.fillRect(px + tw * .65, b - th, tw * .35, th);
      g.fillStyle = 'rgb(150,148,140)'; for (let k = 0; k < 4; k++) g.fillRect(px - 2 + k * 7.3, b - th - 6, 4, 6);
      g.fillStyle = 'rgba(40,40,44,.6)'; g.fillRect(px + 7, b - th + 12, 7, 14);
      g.fillStyle = 'rgb(142,140,134)'; g.fillRect(px + tw, b - 40, 90, 40); g.fillStyle = 'rgb(96,98,104)'; g.beginPath(); g.moveTo(px + tw, b - 40); g.lineTo(px + tw + 45, b - 56); g.lineTo(px + tw + 90, b - 40); g.closePath(); g.fill();
    }
    for (let px = vr(900, 1300); px < cw; px += 2400) {   // the lighthouse on the cliff top
      const b = ch - cliff(px) + 4;
      g.fillStyle = 'rgb(244,242,236)'; g.beginPath(); g.moveTo(px - 7, b); g.lineTo(px - 5, b - 46); g.lineTo(px + 5, b - 46); g.lineTo(px + 7, b); g.closePath(); g.fill();
      g.fillStyle = 'rgba(0,0,0,.1)'; g.fillRect(px + 1, b - 46, 5, 46);
      g.fillStyle = 'rgb(40,44,46)'; g.fillRect(px - 6, b - 50, 12, 4); g.fillStyle = 'rgb(220,228,226)'; g.fillRect(px - 4, b - 57, 8, 7); g.fillStyle = 'rgb(40,44,46)'; g.beginPath(); g.moveTo(px - 5, b - 57); g.lineTo(px, b - 62); g.lineTo(px + 5, b - 57); g.closePath(); g.fill();
    }
    // the seafront: tall hotels and boarding houses, cream, white and red brick, bay windows, slate roofs
    for (let px = vr(-40, 0); px < cw; ) {
      const w = vr(40, 90), h = vr(36, 62), b = ch - ch * .14, col = [[238, 230, 210], [244, 242, 236], [176, 104, 82], [226, 214, 186], [206, 222, 226], [240, 220, 200]][(vrand() * 6) | 0];
      g.fillStyle = rgba(col); g.fillRect(px, b - h, w, h);
      g.fillStyle = 'rgb(86,90,100)'; g.beginPath(); g.moveTo(px - 2, b - h); g.lineTo(px + w * .2, b - h - vr(8, 14)); g.lineTo(px + w * .8, b - h - vr(8, 14)); g.lineTo(px + w + 2, b - h); g.closePath(); g.fill();
      g.fillStyle = 'rgba(46,52,62,.55)'; for (let yy = b - h + 6; yy < b - 6; yy += 9) for (let xx = px + 4; xx < px + w - 5; xx += 9) g.fillRect(xx, yy, 4, 5);
      if (vrand() < .5) { g.fillStyle = 'rgba(255,255,255,.35)'; for (let yy = b - h + 4; yy < b - 4; yy += 9) g.fillRect(px + w * .4, yy, w * .2, 7); }
      if (vrand() < .4) { g.fillStyle = rgba(shadeRgb(col, -.2)); g.fillRect(px + w * .6, b - h - 16, 6, 9); }
      px += w + vr(0, 8);
    }
    treeLine(B, ch * .12, 'rgb(52,72,50)', 12);
    return airOver(B);
  };

  // ================= Kōwhai Downs, Canterbury =================
  /* A villa clubhouse on the plains: white weatherboard under a red iron roof, a bay window in its own gable,
     a verandah with fretwork brackets, harakeke at the corners; the Southern Alps along the skyline. */
  const kowhaiPavilion = () => {
    const F = frame(), { g, c, x, y, PX } = F, top = 3.5;
    // the hipped roof, corrugated, red
    const rg = g.createLinearGradient(0, y(6.3), 0, y(top)); rg.addColorStop(0, '#b53a30'); rg.addColorStop(1, '#8e2a24');
    g.fillStyle = rg; g.beginPath(); g.moveTo(x(1.2), y(top)); g.lineTo(x(4.2), y(6.3)); g.lineTo(x(19.8), y(6.3)); g.lineTo(x(22.8), y(top)); g.closePath(); g.fill();
    for (let m = 1.4; m < 22.8; m += .14) { const t = Math.min(1, Math.min(m - 1.2, 22.8 - m) / 3); g.fillStyle = (m * 7 | 0) % 2 ? 'rgba(255,255,255,.07)' : 'rgba(0,0,0,.09)'; g.fillRect(x(m), y(top + (6.3 - top) * t), 2, y(top) - y(top + (6.3 - top) * t)); }
    g.fillStyle = '#e8e2d4'; for (const m of [6.5, 17.5]) { g.fillRect(x(m), y(7.2), x(.55), y(6.0) - y(7.2)); g.fillStyle = '#9a8a78'; g.fillRect(x(m - .05), y(7.3), x(.65), 5); g.fillStyle = '#e8e2d4'; }   // chimneys
    // the walls: white weatherboard
    g.fillStyle = '#f7f5ee'; g.fillRect(x(1.8), y(top), x(20.4), y(0) - y(top));
    for (let z = .2; z < top; z += .2) { g.fillStyle = 'rgba(90,90,100,.12)'; g.fillRect(x(1.8), y(z), x(20.4), 1.5); g.fillStyle = 'rgba(255,255,255,.5)'; g.fillRect(x(1.8), y(z) + 1.5, x(20.4), 1); }
    // the bay: its own gable, and a three-sided window
    g.fillStyle = '#f7f5ee'; g.beginPath(); g.moveTo(x(15.2), y(top + .2)); g.lineTo(x(18.2), y(6.7)); g.lineTo(x(21.2), y(top + .2)); g.closePath(); g.fill();
    g.fillStyle = '#9a2e26'; g.beginPath(); g.moveTo(x(14.9), y(top + .1)); g.lineTo(x(18.2), y(6.95)); g.lineTo(x(21.5), y(top + .1)); g.lineTo(x(21.2), y(top + .1)); g.lineTo(x(18.2), y(6.6)); g.lineTo(x(15.2), y(top + .1)); g.closePath(); g.fill();
    g.strokeStyle = '#f7f5ee'; g.lineWidth = 2; for (let k = 0; k < 7; k++) { const t = k / 6; g.beginPath(); g.moveTo(x(15.7 + 5 * t), y(top + .35)); g.lineTo(x(15.7 + 5 * t), y(top + .35 + (1 - Math.abs(t - .5) * 2) * 2.4)); g.stroke(); }   // the gable's battens
    g.fillStyle = '#e8e4da'; g.fillRect(x(15.6), y(3.0), x(5.2), y(.5) - y(3.0)); g.fillStyle = 'rgba(0,0,0,.08)'; g.fillRect(x(19.6), y(3.0), x(1.2), y(.5) - y(3.0));
    for (const [a, b] of [[15.8, 16.9], [17.1, 19.3], [19.5, 20.6]]) {
      const gl = g.createLinearGradient(0, y(2.8), 0, y(.8)); gl.addColorStop(0, '#9cb8cc'); gl.addColorStop(1, '#3a4a52');
      g.fillStyle = gl; g.fillRect(x(a), y(2.8), x(b - a), y(.8) - y(2.8)); g.fillStyle = '#f7f5ee'; g.fillRect(x(a), y(1.9), x(b - a), 4); g.strokeStyle = '#f7f5ee'; g.lineWidth = 3; g.strokeRect(x(a), y(2.8), x(b - a), y(.8) - y(2.8));
    }
    // the front door, with its fanlight, and sash windows along the verandah
    g.fillStyle = '#2c4a6a'; g.fillRect(x(8.1), y(2.6), x(1.3), y(.15) - y(2.6)); g.fillStyle = '#e8d8a0'; g.fillRect(x(8.1), y(3.0), x(1.3), y(2.65) - y(3.0)); g.fillStyle = '#c9a862'; g.beginPath(); g.arc(x(9.2), y(1.3), 3, 0, TAU); g.fill();
    for (const a of [3.0, 5.4, 11.0, 13.2]) { const gl = g.createLinearGradient(0, y(2.8), 0, y(.9)); gl.addColorStop(0, '#8aa6b8'); gl.addColorStop(1, '#344048'); g.fillStyle = gl; g.fillRect(x(a), y(2.8), x(1.15), y(.9) - y(2.8)); g.fillStyle = '#f7f5ee'; g.fillRect(x(a), y(1.85), x(1.15), 4); g.strokeStyle = '#f7f5ee'; g.lineWidth = 3; g.strokeRect(x(a), y(2.8), x(1.15), y(.9) - y(2.8)); }
    // the verandah: a bullnose of striped iron on white posts, fretwork brackets
    g.fillStyle = 'rgba(30,30,28,.25)'; g.fillRect(x(1.8), y(3.05), x(13.2), y(.1) - y(3.05));
    for (let m = 1.3; m < 15.2; m += .32) { g.fillStyle = (m / .32 | 0) % 2 ? '#f2eee4' : '#a8332a'; g.beginPath(); g.moveTo(x(m), y(3.6)); g.quadraticCurveTo(x(m + .1), y(3.0), x(m + .18), y(2.95)); g.lineTo(x(m + .5), y(2.95)); g.quadraticCurveTo(x(m + .42), y(3.0), x(m + .32), y(3.6)); g.closePath(); g.fill(); }
    for (let m = 1.5; m <= 15.1; m += 2.25) {
      g.fillStyle = '#f7f5ee'; g.fillRect(x(m) - 3, y(2.95), 6, y(0) - y(2.95)); g.fillStyle = 'rgba(0,0,0,.18)'; g.fillRect(x(m) + 3, y(2.95), 2, y(0) - y(2.95));
      g.strokeStyle = '#f7f5ee'; g.lineWidth = 1.5;
      for (const s of [-1, 1]) { if ((m < 1.6 && s < 0) || (m > 15 && s > 0)) continue; g.beginPath(); g.moveTo(x(m), y(2.4)); g.quadraticCurveTo(x(m + s * .1), y(2.85), x(m + s * .55), y(2.92)); g.stroke(); g.beginPath(); g.arc(x(m + s * .22), y(2.72), 3, 0, TAU); g.stroke(); }
    }
    sign(F, 'KŌWHAI DOWNS BOWLING CLUB', 4.3, 12.3, 3.12, 3.55, '#f7f5ee', '#8e2a24', `700 ${Math.round(PX * .26)}px Georgia, serif`);
    sign(F, 'Haere mai · Welcome', 9.7, 10.9, 1.5, 1.85, '#2c4a6a', '#f7f5ee', `600 ${Math.round(PX * .1)}px Georgia, serif`);
    // harakeke at the corners, its flower stalks up out of the fans of leaves
    for (const cx0 of [1.4, 22.4]) {
      for (let i = 0; i < 26; i++) { const a = -Math.PI / 2 + vr(-.9, .9), l = vr(1.0, 1.9); g.strokeStyle = rgba(leafCol([[24, 40, 28], [46, 70, 40], [90, 112, 62], [132, 146, 92]], clamp(.5 - Math.cos(a) * .5 + vr(-.2, .2), 0, 1))); g.lineWidth = vr(3, 5); g.beginPath(); g.moveTo(x(cx0), y(0)); g.quadraticCurveTo(x(cx0 + Math.cos(a) * l * .4), y(l * .7), x(cx0 + Math.cos(a) * l), y(-Math.sin(a) * l * .85)); g.stroke(); }
      g.strokeStyle = '#5a3a2a'; g.lineWidth = 2; for (const d of [-.25, .2]) { g.beginPath(); g.moveTo(x(cx0 + d * .3), y(1)); g.lineTo(x(cx0 + d), y(3.1)); g.stroke(); g.fillStyle = '#7a2a22'; for (let k = 0; k < 5; k++) { g.beginPath(); g.arc(x(cx0 + d * (.6 + k * .1)), y(2.2 + k * .2), 2.5, 0, TAU); g.fill(); } }
    }
    sunWash(g, c); return c;
  };
  // the Southern Alps, snow along their tops, over brown foothills and the patchwork of the plains
  const alpsBand = seed => {
    const B = bandCanvas(seed), { g, cw, ch } = B, high = seed !== 23;   // toward the pavilion the main range; the other way, the lower ranges
    const peaks = px => { const base = ch * (high ? .7 : .58), amp = ch * (high ? .26 : .16); let v = 0; for (const [f, a, ph] of [[1 / 230, .46, 1.3], [1 / 83, .3, .4], [1 / 31, .16, 2.2], [1 / 11, .08, .9]]) v += a * (1 - Math.abs(Math.sin(px * f * Math.PI + ph + seed))); return base + amp * (v - .5) * 2; };
    hill(B, peaks, 'rgb(118,134,168)');
    clipHill(B, peaks);   // snow above the line, its lower edge ragged
    const snowLine = ch * .6, ph = vr(0, 6);
    g.beginPath(); g.moveTo(0, ch);
    for (let px = 0; px <= cw; px += 2) { const top = peaks(px), d = Math.max(0, (top - snowLine) * (.8 + .35 * Math.sin(px * .045 + ph)) + 4 * Math.sin(px * .19 + ph)); g.lineTo(px, ch - top + d); }
    for (let px = cw; px >= 0; px -= 2) g.lineTo(px, ch - peaks(px));
    g.closePath(); g.fillStyle = 'rgba(244,246,250,.95)'; g.fill();
    g.restore();
    const foot = ridge(ch * .38, ch * .1, TAU / 600, vr(0, 6));
    hill(B, foot, 'rgb(158,140,98)');
    clipHill(B, foot); for (let i = 0; i < 300; i++) { const px = vr(0, cw); g.fillStyle = vrand() < .5 ? 'rgba(120,108,72,.4)' : 'rgba(186,168,118,.35)'; g.beginPath(); g.ellipse(px, ch - foot(px) + vr(4, 40), vr(20, 60), vr(3, 7), 0, 0, TAU); g.fill(); } g.restore();
    // the plains: paddocks in greens and golds, shelterbelts across them, poplars in rows
    const plain = ch * .22;
    g.fillStyle = 'rgb(128,138,74)'; g.fillRect(0, ch - plain, cw, plain);
    for (let row = 0; row < 6; row++) { const yy = ch - plain + row * plain / 6; for (let px = vr(-50, 0); px < cw; px += vr(60, 180)) { g.fillStyle = ['rgba(150,160,80,.6)', 'rgba(196,176,100,.55)', 'rgba(104,128,64,.6)', 'rgba(170,150,90,.5)'][(vrand() * 4) | 0]; g.fillRect(px, yy, vr(50, 170), plain / 6 + 1); } }
    for (let row = 0; row < 4; row++) { const yy = ch - plain + 3 + row * plain / 4.2; g.fillStyle = 'rgb(40,62,40)'; for (let px = vr(0, 200); px < cw; px += vr(300, 700)) g.fillRect(px, yy - 3 - row, vr(150, 400), 3 + row * .8); }
    for (let px = vr(0, 300); px < cw; px += vr(500, 900)) for (let k = 0; k < vr(5, 12); k++) { g.fillStyle = 'rgb(70,96,52)'; g.beginPath(); g.ellipse(px + k * 9, ch - plain - 6, 2.5, 12, 0, 0, TAU); g.fill(); }
    for (let i = 0; i < 160; i++) { g.fillStyle = 'rgba(240,238,228,.85)'; g.fillRect(vr(0, cw), ch - vr(4, plain - 4), 2, 1.5); }   // sheep
    treeLine(B, ch * .1, 'rgb(46,70,44)', 12);
    return airOver(B);
  };

  // ================= Rietvallei, Western Cape =================
  /* A Cape Dutch clubhouse: whitewashed walls under thatch, a curving holbol gable over the door, green shutters,
     a stoep along the front and agapanthus by the steps; vineyards and mountains beyond. */
  const capePavilion = () => {
    const F = frame(), { g, c, x, y, PX } = F, top = 3.3;
    // the thatch: thick, steep, combed, its ridge rounded
    const tg = g.createLinearGradient(0, y(7.2), 0, y(top)); tg.addColorStop(0, '#8a7048'); tg.addColorStop(1, '#5e4a30');
    g.fillStyle = tg; g.beginPath(); g.moveTo(x(1.0), y(top - .1)); g.lineTo(x(3.6), y(7.0)); g.quadraticCurveTo(x(12), y(7.35), x(20.4), y(7.0)); g.lineTo(x(23.0), y(top - .1)); g.closePath(); g.fill();
    for (let i = 0; i < 2600; i++) { const px = vr(1.2, 22.8), pz = vr(top, 7.0), edge = Math.min(px - 1, 23 - px); if (edge < 2.6 && pz > top + edge * 1.42) continue; g.strokeStyle = vrand() < .5 ? 'rgba(170,140,90,.45)' : 'rgba(50,38,24,.35)'; g.lineWidth = 1; g.beginPath(); g.moveTo(x(px), y(pz)); g.lineTo(x(px + vr(-.04, .04)), y(pz - vr(.15, .35))); g.stroke(); }
    g.fillStyle = '#4a3a26'; g.beginPath(); g.moveTo(x(3.6), y(7.0)); g.quadraticCurveTo(x(12), y(7.35), x(20.4), y(7.0)); g.lineTo(x(20.4), y(6.85)); g.quadraticCurveTo(x(12), y(7.2), x(3.6), y(6.85)); g.closePath(); g.fill();
    g.fillStyle = 'rgba(0,0,0,.25)'; g.fillRect(x(1.6), y(top), x(20.8), 7);
    // whitewashed walls
    g.fillStyle = '#faf8f2'; g.fillRect(x(1.6), y(top), x(20.8), y(0) - y(top));
    g.fillStyle = 'rgba(160,150,130,.06)'; for (let i = 0; i < 300; i++) g.fillRect(x(vr(1.6, 22.4)), y(vr(0, top)), vr(3, 10), vr(2, 6));
    // the holbol gable: curves and scrolls up to a rounded top, a moulding round it, the date in the middle
    const gab = () => { g.beginPath(); g.moveTo(x(9.0), y(top));
      g.bezierCurveTo(x(9.0), y(4.4), x(9.9), y(4.3), x(9.9), y(5.0)); g.bezierCurveTo(x(9.9), y(5.6), x(10.6), y(5.5), x(10.6), y(6.2));
      g.bezierCurveTo(x(10.6), y(7.2), x(11.2), y(7.6), x(12), y(7.75)); g.bezierCurveTo(x(12.8), y(7.6), x(13.4), y(7.2), x(13.4), y(6.2));
      g.bezierCurveTo(x(13.4), y(5.5), x(14.1), y(5.6), x(14.1), y(5.0)); g.bezierCurveTo(x(14.1), y(4.3), x(15.0), y(4.4), x(15.0), y(top)); g.closePath(); };
    gab(); g.fillStyle = '#faf8f2'; g.fill(); g.strokeStyle = 'rgba(120,110,96,.45)'; g.lineWidth = 3; g.stroke();
    g.save(); gab(); g.clip(); g.fillStyle = 'rgba(0,0,0,.06)'; g.fillRect(x(13.4), y(7.8), x(1.6), y(top) - y(7.8)); g.restore();   // its shaded return
    g.fillStyle = '#e9e2d2'; g.beginPath(); g.arc(x(12), y(6.6), x(.38) - x(0), 0, TAU); g.fill(); g.fillStyle = '#8a7a62'; g.font = `700 ${Math.round(PX * .18)}px Georgia, serif`; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('1912', x(12), y(6.6));
    sign(F, 'RIETVALLEI BOWLING CLUB', 10.2, 13.8, 4.6, 5.0, '#faf8f2', '#4d5d4f', `700 ${Math.round(PX * .15)}px Georgia, serif`);
    // the door under the gable, its fanlight, and small-paned windows with shutters
    g.fillStyle = '#4d5d4f'; g.fillRect(x(11.1), y(2.55), x(1.8), y(.45) - y(2.55)); g.fillStyle = 'rgba(0,0,0,.2)'; g.fillRect(x(12) - 1, y(2.55), 2, y(.45) - y(2.55));
    g.fillStyle = '#c8d2d6'; g.beginPath(); g.arc(x(12), y(2.55), x(.9) - x(0), Math.PI, 0); g.fill(); g.strokeStyle = '#4d5d4f'; g.lineWidth = 2; for (let k = 1; k < 5; k++) { const a = Math.PI + k * Math.PI / 5; g.beginPath(); g.moveTo(x(12), y(2.55)); g.lineTo(x(12) + Math.cos(a) * (x(.9) - x(0)), y(2.55) + Math.sin(a) * (x(.9) - x(0))); g.stroke(); }
    for (const a of [2.6, 5.2, 7.8, 15.4, 18.0, 20.6]) {
      const gl = g.createLinearGradient(0, y(2.8), 0, y(1.0)); gl.addColorStop(0, '#6a7c86'); gl.addColorStop(1, '#2c363c');
      g.fillStyle = gl; g.fillRect(x(a), y(2.8), x(1.0), y(1.0) - y(2.8));
      g.strokeStyle = '#faf8f2'; g.lineWidth = 2; for (const f of [1 / 3, 2 / 3]) { g.beginPath(); g.moveTo(x(a + f), y(2.8)); g.lineTo(x(a + f), y(1.0)); g.stroke(); } for (const f of [.25, .5, .75]) { g.beginPath(); g.moveTo(x(a), y(2.8 - 1.8 * f)); g.lineTo(x(a + 1), y(2.8 - 1.8 * f)); g.stroke(); }
      g.fillStyle = '#4d5d4f'; for (const s of [-.5, 1.0]) { g.fillRect(x(a + s), y(2.8), x(.5), y(1.0) - y(2.8)); g.fillStyle = 'rgba(0,0,0,.15)'; for (let z = 1.1; z < 2.8; z += .14) g.fillRect(x(a + s), y(z), x(.5), 1.5); g.fillStyle = '#4d5d4f'; }
    }
    // the stoep: a raised floor with a low white wall, steps down in the middle
    g.fillStyle = '#c9b8a0'; g.fillRect(x(1.2), y(.45), x(21.6), y(0) - y(.45));
    g.fillStyle = '#f2eee4'; g.fillRect(x(1.2), y(.75), x(8.9), y(.45) - y(.75)); g.fillRect(x(13.9), y(.75), x(8.9), y(.45) - y(.75));
    g.fillStyle = 'rgba(0,0,0,.12)'; g.fillRect(x(1.2), y(.45), x(21.6), 3); for (let k = 0; k < 3; k++) g.fillRect(x(10.6 + k * .1), y(.45 - k * .15), x(2.8 - k * .2), 2);
    // agapanthus either side of the steps
    for (const cx0 of [9.6, 14.4, 3.2, 20.8]) {
      for (let i = 0; i < 40; i++) { g.strokeStyle = rgba(mixRgb(PAL.leafShadow, PAL.leafLit, vrand())); g.lineWidth = 2; const a = -Math.PI / 2 + vr(-1.1, 1.1); g.beginPath(); g.moveTo(x(cx0), y(0)); g.lineTo(x(cx0) + Math.cos(a) * .55 * PX, y(0) + Math.sin(a) * .45 * PX); g.stroke(); }
      for (let k = 0; k < 4; k++) { const hx = cx0 + vr(-.4, .4), hz = vr(.8, 1.1); g.strokeStyle = '#5a7a44'; g.lineWidth = 1.5; g.beginPath(); g.moveTo(x(cx0), y(.2)); g.lineTo(x(hx), y(hz)); g.stroke(); for (let j = 0; j < 22; j++) { const a = vr(0, TAU), r = vr(0, .17); g.fillStyle = vrand() < .5 ? 'rgba(92,110,200,.95)' : 'rgba(130,146,226,.95)'; g.beginPath(); g.arc(x(hx + Math.cos(a) * r), y(hz + Math.sin(a) * r), 2.2, 0, TAU); g.fill(); } }
    }
    sunWash(g, c); return c;
  };
  // rugged sandstone mountains, vineyards up their lower slopes, white gabled farmsteads among oaks
  const capeBand = seed => {
    const B = bandCanvas(seed), { g, cw, ch } = B;
    const crag = px => { let v = 0; for (const [f, a, ph] of [[1 / 260, .45, .7], [1 / 70, .3, 2.1], [1 / 23, .16, 1.1], [1 / 9, .07, .3]]) v += a * Math.sin(px * f + ph + seed); return Math.min(ch * .88, ch * .62 + ch * .32 * v); };   // sandstone: steep sides, flat tops
    hill(B, crag, 'rgb(132,120,146)');
    clipHill(B, crag);
    for (let k = 1; k <= 5; k++) {   // the strata, following the line of the tops
      g.strokeStyle = `rgba(196,168,156,${.28 - k * .03})`; g.lineWidth = 1.4; g.beginPath();
      for (let px = 0; px <= cw; px += 6) g.lineTo(px, ch - crag(px) + k * 9 + 2 * Math.sin(px * .05 + k));
      g.stroke();
    }
    for (let px = vr(0, 40); px < cw; px += vr(26, 60)) {   // gullies cut down from the tops
      const top = ch - crag(px) + vr(0, 6), len = vr(14, 36), w = vr(1, 2.4);
      g.fillStyle = 'rgba(78,68,104,.24)'; g.beginPath(); g.moveTo(px - w, top); g.lineTo(px + w, top); g.lineTo(px + vr(-6, 6), top + len); g.closePath(); g.fill();
    }
    g.restore();
    const slope = ridge(ch * .4, ch * .1, TAU / 700, vr(0, 6));
    hill(B, slope, 'rgb(136,128,82)');
    clipHill(B, slope);   // the vineyards: rows across the slope, green on red-brown earth
    for (let px = vr(-100, 0); px < cw; px += vr(160, 320)) {
      const w = vr(120, 260), top = ch - slope(px + w / 2) + vr(4, 14), d = vr(18, 40);
      g.fillStyle = 'rgba(150,96,70,.55)'; g.fillRect(px, top, w, d);
      g.strokeStyle = 'rgba(70,106,52,.85)'; g.lineWidth = 1.6; for (let yy = top + 2; yy < top + d; yy += 3.2) { g.beginPath(); g.moveTo(px, yy); g.lineTo(px + w, yy + vr(-1, 1)); g.stroke(); }
    }
    for (let fx = vr(200, 500); fx < cw; fx += vr(600, 1000)) {   // a farmstead: a white gabled house among oaks
      const top = ch - slope(fx) + vr(5, 10);
      g.fillStyle = 'rgb(44,66,40)'; for (let k = 0; k < 6; k++) { g.beginPath(); g.ellipse(fx + vr(-40, 50), top + vr(-6, 2), vr(10, 18), vr(7, 11), 0, 0, TAU); g.fill(); }
      g.fillStyle = 'rgb(246,244,238)'; g.fillRect(fx, top, 36, 9); g.fillStyle = 'rgb(118,96,62)'; g.fillRect(fx - 1, top - 5, 38, 5);
      g.fillStyle = 'rgb(246,244,238)'; g.beginPath(); g.moveTo(fx + 13, top); g.quadraticCurveTo(fx + 13, top - 9, fx + 18, top - 11); g.quadraticCurveTo(fx + 23, top - 9, fx + 23, top); g.closePath(); g.fill();
    }
    g.restore();
    const near = ridge(ch * .2, ch * .04, TAU / 400, vr(0, 6));
    hill(B, near, 'rgb(118,124,70)');
    let px = 0;   // stone pines along the road, their flat tops against the slope
    while (px < cw) { const base = ch - ch * .12, w = vr(22, 40); g.fillStyle = 'rgb(46,66,42)'; g.beginPath(); g.ellipse(px, base - vr(20, 30), w, vr(6, 9), 0, 0, TAU); g.fill(); g.fillRect(px - 1.2, base - 22, 2.4, 22); px += vr(40, 110); }
    treeLine(B, ch * .09, 'rgb(64,84,50)', 10);
    return airOver(B);
  };
  // jacaranda blossom fallen on the paving round the green, thickest near the trees on the pavilion side
  const capePath = (g, X, Y, S) => {
    for (let i = 0; i < 2600; i++) {
      const north = vrand() < .55, px = north ? vr(-15.2, 15.2) : (vrand() < .5 ? vr(-15.2, -13.2) : vr(13.2, 15.2)), py = north ? vr(36.7, 38.6) : vr(-2.6, 38.6);
      g.fillStyle = vrand() < .6 ? 'rgba(150,124,206,.75)' : 'rgba(118,96,180,.7)'; g.beginPath(); g.arc(X(px), Y(py), vr(1, 2.4), 0, TAU); g.fill();
    }
  };

  // ================= Kilcarra, County Dublin =================
  /* An evening game under floodlights: the last of the light going over the city, the clubhouse windows warm,
     six masts round the green. Its sky and light are the venue's dusk (Weather.dusk); everything drawn in daylight
     is dimmed by dim, and what is drawn here is drawn lit, in the evening's own colours. */
  const kilcarraPavilion = () => {
    const F = frame(), { g, c, x, y, PX } = F, top = 3.6;
    // a flat-roofed brick clubhouse: dark above, lit from below by the floodlights' spill
    const wg = g.createLinearGradient(0, y(top), 0, y(0)); wg.addColorStop(0, '#2c2226'); wg.addColorStop(.6, '#4a3632'); wg.addColorStop(1, '#6a4c42');
    g.fillStyle = wg; g.fillRect(x(2.0), y(top), x(20), y(0) - y(top));
    for (let z = .08; z < top; z += .085) { g.fillStyle = 'rgba(0,0,0,.12)'; g.fillRect(x(2.0), y(z), x(20), 1); }
    g.fillStyle = '#1c1a1e'; g.fillRect(x(1.6), y(top + .5), x(20.8), y(top) - y(top + .5));   // the fascia
    g.fillStyle = 'rgba(255,255,255,.06)'; g.fillRect(x(1.6), y(top + .5), x(20.8), 2);
    // the bar's long window, warm, with people in it, and the trophy cabinet
    const w0 = 3.0, w1 = 15.6, z0 = .9, z1 = 2.9;
    const lg = g.createLinearGradient(0, y(z1), 0, y(z0)); lg.addColorStop(0, '#f6d48e'); lg.addColorStop(1, '#c88a48');
    g.fillStyle = lg; g.fillRect(x(w0), y(z1), x(w1 - w0), y(z0) - y(z1));
    for (let m = w0 + .6; m < w1; m += 2.1) { g.fillStyle = 'rgba(255,248,220,.7)'; g.beginPath(); g.arc(x(m), y(z1 - .12), 4, 0, TAU); g.fill(); }
    g.fillStyle = '#7a4a2a'; g.fillRect(x(w1 - 2.6), y(2.5), x(2.2), y(1.0) - y(2.5)); g.fillStyle = 'rgba(255,240,200,.5)'; g.fillRect(x(w1 - 2.5), y(2.4), x(2.0), y(1.1) - y(2.4));
    g.fillStyle = '#d8b050'; for (let k = 0; k < 7; k++) { const tx = w1 - 2.35 + k * .28; g.fillRect(x(tx), y(1.9 + (k % 2) * .2), 4, x(.22) - x(0)); g.fillRect(x(tx) - 3, y(1.68 + (k % 2) * .2), 10, 3); }
    for (let m = w0 + .4; m < w1 - 3; m += vr(.45, .8)) {   // people at the bar, in silhouette
      if (vrand() < .35) continue;
      const hgt = vr(.55, .8);
      g.fillStyle = 'rgba(40,26,20,.8)'; g.beginPath(); g.roundRect(x(m - .16), y(z0 + hgt), x(.32) - x(0), y(z0) - y(z0 + hgt), 6); g.fill();
      g.beginPath(); g.arc(x(m), y(z0 + hgt + .13), x(.11) - x(0), 0, TAU); g.fill();
    }
    g.fillStyle = '#1c1a1e'; for (let m = w0; m <= w1 + .01; m += 2.1) g.fillRect(x(m) - 3, y(z1), 6, y(z0) - y(z1));
    g.fillRect(x(w0) - 4, y(z1) - 4, x(w1 - w0) + 8, 5); g.fillRect(x(w0) - 4, y(z0), x(w1 - w0) + 8, 5);
    // the doors, a small window, and bulkhead lamps on the wall, each with its glow
    const dg = g.createLinearGradient(0, y(2.4), 0, y(.1)); dg.addColorStop(0, '#e8c27a'); dg.addColorStop(1, '#a87038');
    g.fillStyle = dg; g.fillRect(x(17.0), y(2.4), x(1.6), y(.1) - y(2.4)); g.fillStyle = '#1c1a1e'; g.fillRect(x(17.8) - 2, y(2.4), 4, y(.1) - y(2.4)); g.strokeStyle = '#1c1a1e'; g.lineWidth = 4; g.strokeRect(x(17.0), y(2.4), x(1.6), y(.1) - y(2.4));
    g.fillStyle = '#d8b878'; g.fillRect(x(19.8), y(2.6), x(1.2), y(1.6) - y(2.6)); g.strokeRect(x(19.8), y(2.6), x(1.2), y(1.6) - y(2.6));
    for (const m of [2.4, 16.4, 19.2, 21.6]) {
      const gl = g.createRadialGradient(x(m), y(3.0), 0, x(m), y(3.0), x(1.4) - x(0)); gl.addColorStop(0, 'rgba(255,236,190,.55)'); gl.addColorStop(1, 'rgba(255,236,190,0)');
      g.fillStyle = gl; g.fillRect(x(m - 1.4), y(4.4), x(2.8) - x(0), x(2.8) - x(0));
      g.fillStyle = '#fff4d8'; g.beginPath(); g.ellipse(x(m), y(3.0), 5, 4, 0, 0, TAU); g.fill();
    }
    // the club's name, lit from beneath by a strip light
    sign(F, 'KILCARRA BOWLING CLUB', 6.0, 18.0, 3.65, 4.05, '#22303c', '#f2ead2', `700 ${Math.round(PX * .27)}px Arial, sans-serif`);
    const sl = g.createLinearGradient(0, y(3.65), 0, y(4.05)); sl.addColorStop(0, 'rgba(255,250,230,.25)'); sl.addColorStop(1, 'rgba(255,250,230,0)'); g.fillStyle = sl; g.fillRect(x(6.0), y(4.05), x(12), y(3.65) - y(4.05));
    // a hedge in front in the dark, the floodlights catching its top
    for (let i = 0; i < 420; i++) { const px = vr(0, 24), pz = vr(0, .8); g.fillStyle = pz > .6 ? 'rgba(84,104,70,.9)' : rgba(mixRgb([12, 18, 14], [40, 52, 38], vrand()), .95); g.beginPath(); g.arc(x(px), y(pz), vr(3, 6), 0, TAU); g.fill(); }
    c.lit = true; return c;
  };
  // the city at dusk: the Dublin mountains dark against the afterglow, roofs and streetlights, a spire
  const duskBand = seed => {
    const B = bandCanvas(seed), { g, cw, ch } = B;
    const hills = ridge(ch * .46, ch * .12, TAU / 900, vr(0, 6));
    hill(B, hills, 'rgb(52,54,82)');
    clipHill(B, hills); for (let i = 0; i < 90; i++) { g.fillStyle = 'rgba(255,214,150,.7)'; g.fillRect(vr(0, cw), ch - hills(vr(0, cw)) + vr(10, 60), 1.5, 1.5); } g.restore();   // houses up on the hills
    for (let px = vr(300, 700); px < cw; px += vr(1100, 1600)) { g.fillStyle = 'rgb(30,30,42)'; g.beginPath(); g.moveTo(px - 5, ch - ch * .18); g.lineTo(px, ch - ch * .74); g.lineTo(px + 5, ch - ch * .18); g.closePath(); g.fill(); g.fillRect(px - 9, ch - ch * .3, 18, ch * .12); }   // a church spire
    for (const [base, col, lit] of [[ch * .3, [40, 40, 54], .25], [ch * .2, [30, 30, 40], .4]]) {   // two rows of roofs, the nearer darker, lit windows in them
      for (let px = vr(-40, 0); px < cw; ) {
        const len = vr(60, 160), h = vr(8, 14), b = ch - base + h;
        g.fillStyle = rgba(col); g.beginPath(); g.moveTo(px, b); g.lineTo(px, b - h); for (let k = 0; k < len; k += vr(18, 30)) { g.lineTo(px + k + 8, b - h - vr(4, 8)); g.lineTo(px + k + 16, b - h); } g.lineTo(px + len, b - h); g.lineTo(px + len, ch); g.lineTo(px, ch); g.closePath(); g.fill();
        for (let k = 0; k < len / 9; k++) if (vrand() < lit) { g.fillStyle = vrand() < .7 ? 'rgba(255,214,140,.9)' : 'rgba(200,220,255,.7)'; g.fillRect(px + vr(2, len - 4), b - vr(1, h - 2), 2.5, 2); }
        if (vrand() < .5) { g.fillStyle = rgba(col); g.fillRect(px + vr(5, len - 10), b - h - 10, 4, 10); }
        px += len + vr(0, 10);
      }
    }
    for (let px = vr(0, 60); px < cw; px += vr(40, 90)) {   // the streetlights, orange, each with a little glow
      const sy = ch - ch * vr(.14, .24), gl = g.createRadialGradient(px, sy, 0, px, sy, 8); gl.addColorStop(0, 'rgba(255,170,80,.8)'); gl.addColorStop(1, 'rgba(255,170,80,0)');
      g.fillStyle = gl; g.fillRect(px - 8, sy - 8, 16, 16); g.fillStyle = 'rgb(255,214,160)'; g.fillRect(px - 1, sy - 1, 2, 2);
    }
    treeLine(B, ch * .12, 'rgb(18,24,22)', 14);
    return airOver(B);
  };
  // the Poolbeg chimneys out by the bay, red and white, nearly lost in the dusk
  const chimneys = () => {
    const PX = 8, wm = 16, hm = 28, c = makeCanvas(wm * PX, hm * PX), g = c.getContext('2d'), y = m => c.height - m * PX, x = m => m * PX;
    for (const cx0 of [4, 11]) for (let k = 0; k < 9; k++) {
      const z0 = k * 3, z1 = z0 + 3, w0 = 1.6 - z0 * .025, w1 = 1.6 - z1 * .025;
      g.fillStyle = k % 2 ? '#c8c4c0' : '#9a3a34'; g.beginPath(); g.moveTo(x(cx0 - w0), y(z0)); g.lineTo(x(cx0 - w1), y(z1)); g.lineTo(x(cx0 + w1), y(z1)); g.lineTo(x(cx0 + w0), y(z0)); g.closePath(); g.fill();
      g.fillStyle = 'rgba(0,0,0,.25)'; g.fillRect(x(cx0), y(z1), x(w0), y(z0) - y(z1));
    }
    g.fillStyle = '#5a5458'; g.fillRect(x(1), y(4), x(14), y(0) - y(4));
    c.wm = wm; c.hm = hm; return c;
  };
  // the floodlights on the ground: a pool round each mast spilling onto the path and the grass beyond the green
  const MASTS = [[-16, -4.6], [16, -4.6], [-16, 18], [16, 18], [-16, 40.6], [16, 40.6]];
  const kilcarraPools = (g, X, Y, S) => {
    g.save(); g.globalCompositeOperation = 'lighter';
    for (const [mx, my] of MASTS) {
      const r = 9 / S, gr = g.createRadialGradient(X(mx * .8), Y(my), 0, X(mx * .8), Y(my), r);
      gr.addColorStop(0, 'rgba(96,94,84,.55)'); gr.addColorStop(.5, 'rgba(60,60,54,.3)'); gr.addColorStop(1, 'rgba(0,0,0,0)');
      g.fillStyle = gr; g.fillRect(X(mx * .8) - r, Y(my) - r, r * 2, r * 2);
    }
    g.restore();
  };
  // on the green: brightest under the lines of masts, a touch darker down the middle, and the masts' faint shadows
  const kilcarraGreen = (g, X, Y, S) => {
    for (const s of [-1, 1]) { const gr = g.createLinearGradient(X(s * 12.5), 0, X(0), 0); gr.addColorStop(0, 'rgba(255,250,230,.07)'); gr.addColorStop(1, 'rgba(255,250,230,0)'); g.fillStyle = gr; g.fillRect(Math.min(X(0), X(s * 12.5)), Y(0), Math.abs(X(s * 12.5) - X(0)), Y(36) - Y(0)); }
    for (const [mx, my] of MASTS) for (const [ox, oy] of MASTS) if (ox !== mx) {   // each mast's shadow, thrown by the lamps on the far side
      const dx = mx - ox, dy = my - oy, d = Math.hypot(dx, dy), ux = dx / d, uy = dy / d;
      g.strokeStyle = 'rgba(0,10,0,.05)'; g.lineWidth = .3 / S; g.beginPath(); g.moveTo(X(mx), Y(my)); g.lineTo(X(mx - ux * 30), Y(my - uy * 30)); g.stroke();
    }
  };

  const FLAG_UNION = { ratio: 2, draw: unionJack };
  const FLAG_NZ = { ratio: 2, draw(g, w, h) {
    g.fillStyle = '#012169'; g.fillRect(0, 0, w, h);
    unionJack(g, w / 2, h / 2);
    for (const [sx, sy, r] of [[.75, .2, .07], [.75, .8, .075], [.635, .45, .062], [.86, .405, .055]]) {   // the Southern Cross: red stars edged white
      g.fillStyle = '#ffffff'; starPath(g, w * sx, h * sy, 5, h * r * 1.25, h * r * .5);
      g.fillStyle = '#c8102e'; starPath(g, w * sx, h * sy, 5, h * r, h * r * .4);
    }
  } };
  const FLAG_SA = { ratio: 3 / 2, draw(g, w, h) {
    g.fillStyle = '#e03c31'; g.fillRect(0, 0, w, h / 2); g.fillStyle = '#001489'; g.fillRect(0, h / 2, w, h / 2);
    const cx = h * .555, Y = () => { g.beginPath(); g.moveTo(-h * .2, -h * .18); g.lineTo(cx, h / 2); g.lineTo(w + 10, h / 2); g.moveTo(-h * .2, h * 1.18); g.lineTo(cx, h / 2); };
    g.lineJoin = 'miter'; g.lineCap = 'butt';
    Y(); g.strokeStyle = '#ffffff'; g.lineWidth = h / 3; g.stroke();
    Y(); g.strokeStyle = '#007749'; g.lineWidth = h / 5; g.stroke();
    g.fillStyle = '#ffb81c'; g.beginPath(); g.moveTo(0, h * .225); g.lineTo(h * .305, h / 2); g.lineTo(0, h * .775); g.closePath(); g.fill();
    g.fillStyle = '#000000'; g.beginPath(); g.moveTo(0, h * .32); g.lineTo(h * .2, h / 2); g.lineTo(0, h * .68); g.closePath(); g.fill();
  } };
  const FLAG_IRELAND = { ratio: 2, draw(g, w, h) {
    g.fillStyle = '#169b62'; g.fillRect(0, 0, w / 3, h); g.fillStyle = '#ffffff'; g.fillRect(w / 3, 0, w / 3, h); g.fillStyle = '#ff883e'; g.fillRect(w * 2 / 3, 0, w / 3, h);
  } };

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
  const FLAG_FADED = { ratio: 5 / 3, draw(g, w, h) {   // St George's Cross left out in the weather, the fly end frayed
    g.fillStyle = '#e2dccb'; g.fillRect(0, 0, w, h); g.fillStyle = '#a5524e'; const t = h * .2; g.fillRect(0, (h - t) / 2, w, t); g.fillRect((w - t) / 2, 0, t, h);
    g.fillStyle = 'rgba(120,110,80,.15)'; g.fillRect(0, 0, w, h);
    g.globalCompositeOperation = 'destination-out'; g.beginPath(); g.moveTo(w, 0);
    for (let k = 0; k <= 12; k++) g.lineTo(w * (.86 + .1 * ((k * 7) % 5) / 4), h * k / 12);
    g.lineTo(w, h); g.closePath(); g.fill(); g.globalCompositeOperation = 'source-over';
  } };
  const FLAG_SPAIN = { ratio: 3 / 2, draw(g, w, h) {
    g.fillStyle = '#aa151b'; g.fillRect(0, 0, w, h); g.fillStyle = '#f1bf00'; g.fillRect(0, h * .25, w, h * .5);
  } };

  Object.assign(VENUES, {
    wattle: {
      id: 'wattle', name: 'Wattle Point Bowling Club', place: 'New South Wales, Australia', ends: ['the clubhouse', 'the gums'],
      about: 'A green above the Tasman, among gums and Norfolk pines, the lighthouse out on the point.',
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
      about: 'An old stone clubhouse under the bens, with Scots pines and birches round the green.',
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
      about: 'White arches and bougainvillea, palms round the green and the sierra behind.',
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
    },
    fernley: {
      id: 'fernley', name: 'Fernley Indoor Bowls Centre', place: 'Leicestershire, England', ends: ['the results board', 'the bar'],
      about: 'Five rinks of blue carpet under one roof: no weather in here.',
      // indoors: the 'sky' is the air under the roof (the env map and the fog read it), the green a blue carpet
      pal: { skyTop: [196, 202, 208], skyMid: [206, 211, 216], haze: [214, 218, 222], lawn: [146, 148, 152], path: [150, 152, 158], cap: [104, 50, 44], ditch: [38, 38, 44],
        green: [30, 108, 198], greenHi: [44, 124, 212], timber: [92, 38, 34], timberLit: [134, 62, 52] },
      indoor: { h: HALL.h, build: hallBuild },
      trees: {}, spots() {},
      blades: () => carpetTile(3000, .07), mottle: () => carpetTile(1200, .05), paintGreen: hallSheen, marks: hallMarks, bench: hallBench,
      // club whites and greys, a few club shirts; nobody wears a hat indoors
      dress: { tops: [[246, 245, 240], [246, 245, 240], [246, 245, 240], [236, 236, 232], [40, 58, 104], [120, 36, 48], [150, 152, 158]],
        lows: [[240, 239, 234], [240, 239, 234], [130, 132, 138], [52, 56, 66]], hats: ['none'], shorts: 0, shades: 0, patterns: { stripes: .03 } },
      // bowls knocking on the other rinks, now and then a ripple of applause; the hum of the hall
      birds: [['knock', .72], ['clap', .28]], ambience: ['hall'], far: {}
    },
    pitfold: {
      id: 'pitfold', name: 'Pitfold Park Bowling Club', place: 'Lancashire, England', ends: ['the hut', 'the gasworks'],
      about: 'A park green that has seen better days, the terraces and the gasworks beyond.',
      pal: { skyTop: [96, 128, 170], skyMid: [164, 182, 202], haze: [196, 202, 204], lawn: [104, 116, 62], path: [146, 142, 132], cap: [116, 110, 100], ditch: [56, 50, 42],
        green: [74, 110, 50], greenHi: [90, 124, 60], leafShadow: [32, 44, 28], leafMid: [64, 84, 44], leafLit: [124, 138, 76], leafHi: [170, 172, 108],
        timber: [98, 92, 82], timberLit: [134, 126, 112] },
      trees: { sycamore: 3, oak: 2, hawthorn: 2, deadelm: 1 },
      spots(add, R, r) {
        add(-19, -8.5, 15, 'sycamore'); add(-25, -12, 14, 'deadelm'); add(-29, 3, 16, 'sycamore');
        for (let x = -30; x <= 30; x += R(5, 10)) add(x, R(-11, -20), R(9, 16), r() < .3 ? 'hawthorn' : r() < .6 ? 'sycamore' : 'oak');
        for (let x = -32; x <= 32; x += R(6, 11)) if (Math.abs(x - 11) > 6) add(x, R(54, 64), R(12, 17), r() < .6 ? 'sycamore' : 'oak');
        for (let y = -2; y <= 40; y += R(5, 11)) { add(R(-31, -21), y, R(5, 15), r() < .4 ? 'hawthorn' : 'sycamore'); add(R(21, 31), y, R(5, 15), r() < .45 ? 'hawthorn' : r() < .9 ? 'oak' : 'deadelm'); }
      },
      pavilion: pitfoldHut, band: townBand, flag: FLAG_FADED, far: { x: 70, y: -260, h: 26, build: gasholder },
      paintGreen: pitfoldWear, paintPath: pitfoldPath, bench: pitfoldBench, tidy: false,
      // anoraks, fleeces and flat caps
      dress: { tops: [[40, 48, 70], [120, 120, 124], [110, 40, 48], [50, 70, 50], [190, 176, 150], [236, 234, 228], [70, 74, 80]],
        lows: [[60, 62, 70], [90, 86, 80], [44, 48, 60], [150, 140, 120]], hats: ['flat', 'flat', 'cap', 'none', 'none'],
        shorts: .02, shades: 0, patterns: { check: .06, stripes: .04 } },
      // crows and gulls off the tip, a woodpigeon, sparrows in the hedge; the ring road beyond the terraces
      birds: [['crow', .3], ['gull', .2], ['woodpigeon', .2], ['sparrow', .2], ['blackbird', .1]], ambience: ['traffic']
    },
    marram: {
      id: 'marram', name: 'Marram Bay Bowls Club', place: 'Norfolk, England', ends: ['the pavilion', 'the town'],
      about: 'A seafront green behind the beach huts, with the pier and the North Sea beyond the pavilion.',
      pal: { skyTop: [62, 122, 196], skyMid: [150, 190, 224], haze: [218, 224, 226], lawn: [112, 134, 66], path: [188, 182, 168], cap: [150, 144, 128],
        green: [62, 118, 50], greenHi: [80, 134, 60], timber: [196, 194, 186], timberLit: [236, 234, 228] },
      trees: { holmoak: 2, tamarisk: 2, cordyline: 3 },
      spots(add, R, r) {   // the town side is sheltered and wooded; on the sea side only low tamarisk and cabbage palms, so the sea shows over them
        add(-19, -8.5, 11, 'holmoak'); add(-25, -12, 12, 'holmoak'); add(-29, 3, 6.5, 'tamarisk');
        for (let x = -30; x <= 30; x += R(5, 8)) add(x, R(-13, -21), R(8, 12), r() < .6 ? 'holmoak' : 'tamarisk');
        for (let x = -32; x <= 32; x += R(8, 13)) add(x, R(53, 58), R(5.5, 8), r() < .6 ? 'cordyline' : 'tamarisk');
        for (let y = -2; y <= 40; y += R(6, 10)) { add(R(-31, -23), y, R(5, 7.5), r() < .5 ? 'tamarisk' : 'cordyline'); add(R(23, 31), y, R(5, 8), r() < .6 ? 'tamarisk' : 'cordyline'); }
      },
      pavilion: marramPavilion, band: seed => seed === 23 ? marramTown(seed) : marramSea(seed), flag: FLAG_UNION, far: {},
      // holidaymakers among the whites: Breton stripes, pastels, sun hats and caps
      dress: { tops: [[246, 245, 240], [246, 245, 240], [170, 206, 232], [244, 214, 120], [240, 170, 170], [40, 60, 104], [150, 210, 190]],
        lows: [[244, 243, 238], [214, 200, 168], [40, 52, 80], [190, 190, 186]], hats: ['sun', 'cap', 'none', 'panama', 'none', 'sun'],
        shorts: .3, shades: .35, patterns: { stripes: .2 } },
      // herring gulls and kittiwakes, oystercatchers on the beach, sparrows in the tamarisk; the waves on the shingle and the breeze
      birds: [['gull', .35], ['kittiwake', .22], ['oystercatcher', .15], ['sparrow', .28]], ambience: ['shingle', 'wind']
    },
    kowhai: {
      id: 'kowhai', name: 'Kōwhai Downs Bowling Club', place: 'Canterbury, New Zealand', ends: ['the clubhouse', 'the macrocarpas'],
      about: 'A villa clubhouse on the Canterbury Plains, the Southern Alps white along the skyline.',
      pal: { skyTop: [22, 92, 196], skyMid: [110, 168, 228], haze: [222, 230, 234], lawn: [132, 140, 72], path: [198, 192, 178], cap: [152, 142, 120],
        green: [60, 120, 48], greenHi: [80, 136, 58] },
      trees: { kowhai: 2, cordyline: 2, macrocarpa: 2, poplar: 1 },
      spots(add, R, r) {   // a macrocarpa shelterbelt to the south; kōwhai and the odd poplar on the pavilion side, low enough to see the Alps
        add(-19, -8.5, 13, 'macrocarpa'); add(-25, -12, 14, 'macrocarpa'); add(-29, 3, 8, 'kowhai');
        for (let x = -30; x <= 30; x += R(5, 7)) add(x, R(-14, -20), R(12, 15), 'macrocarpa');
        for (let x = -32; x <= 32; x += R(9, 14)) add(x, R(54, 62), r() < .2 ? R(15, 18) : R(6, 8.5), r() < .2 ? 'poplar' : r() < .6 ? 'kowhai' : 'cordyline');
        for (let y = -2; y <= 40; y += R(6, 10)) { add(R(-31, -23), y, R(6, 9), r() < .5 ? 'cordyline' : 'kowhai'); add(R(23, 31), y, R(6, 9), r() < .5 ? 'kowhai' : 'cordyline'); }
      },
      pavilion: kowhaiPavilion, band: alpsBand, flag: FLAG_NZ, far: {},
      // bowls whites, wide sun hats and bucket hats, shorts with long white socks, sunglasses against the glare
      dress: { tops: [[246, 245, 240], [246, 245, 240], [246, 245, 240], [246, 245, 240], [20, 30, 40], [170, 200, 228], [196, 60, 60]],
        lows: [[244, 243, 238], [244, 243, 238], [244, 243, 238], [40, 52, 80]], hats: ['sun', 'sun', 'bush', 'cap', 'none', 'panama'],
        shorts: .4, socks: [246, 245, 240], shades: .5, patterns: { stripes: .03 } },
      // tūī and bellbirds in the kōwhai, fantails flitting, paradise shelducks over; the nor'wester
      birds: [['tui', .3], ['bellbird', .25], ['fantail', .2], ['paradiseDuck', .1], ['sparrow', .15]], ambience: ['wind']
    },
    rietvallei: {
      id: 'rietvallei', name: 'Rietvallei Bowling Club', place: 'Western Cape, South Africa', ends: ['the clubhouse', 'the pines'],
      about: 'Cape Dutch gables and thatch, jacarandas in flower, and vineyards up to the mountains.',
      pal: { skyTop: [28, 100, 204], skyMid: [118, 178, 234], haze: [228, 226, 216], lawn: [126, 134, 62], path: [180, 128, 100], cap: [152, 134, 112],
        green: [62, 120, 46], greenHi: [82, 136, 56] },
      trees: { jacaranda: 3, stonepine: 2, oak: 2 },
      spots(add, R, r) {   // stone pines and oaks to the south; jacarandas round the sides and, spaced out, on the pavilion side
        add(-19, -8.5, 13, 'stonepine'); add(-25, -12, 14, 'oak'); add(-29, 3, 10, 'jacaranda');
        for (let x = -30; x <= 30; x += R(6, 9)) add(x, R(-13, -21), R(12, 15), r() < .55 ? 'stonepine' : 'oak');
        for (let x = -32; x <= 32; x += R(10, 16)) add(x, R(54, 61), R(6.5, 9), r() < .65 ? 'jacaranda' : 'stonepine');   // spaced out, so the mountains show between
        for (let y = -2; y <= 40; y += R(6, 10)) { add(R(-31, -23), y, R(9, 12), r() < .6 ? 'jacaranda' : 'oak'); add(R(23, 31), y, R(9, 13), r() < .5 ? 'jacaranda' : 'stonepine'); }
      },
      pavilion: capePavilion, band: capeBand, flag: FLAG_SA, far: {}, paintPath: capePath,
      // whites and club colours, broad hats against the sun, shorts, sunglasses
      dress: { tops: [[246, 245, 240], [246, 245, 240], [246, 245, 240], [0, 119, 73], [255, 184, 28], [170, 200, 228], [120, 40, 52]],
        lows: [[244, 243, 238], [244, 243, 238], [200, 186, 150], [40, 52, 80]], hats: ['bush', 'sun', 'panama', 'cap', 'none', 'bush'],
        shorts: .3, socks: [246, 245, 240], shades: .55, patterns: { stripes: .04 } },
      // hadedas shouting overhead, red-eyed doves, a Cape robin-chat and the sunbirds in the flowers; cicadas in the pines
      birds: [['hadeda', .22], ['redEyedDove', .26], ['robinChat', .26], ['sunbird', .26]], ambience: ['cicadas']
    },
    kilcarra: {
      id: 'kilcarra', name: 'Kilcarra Bowling Club', place: 'County Dublin, Ireland', ends: ['the clubhouse', 'the chimneys'],
      about: 'An evening game under the floodlights, the last of the light going over the city.',
      // after dark: the lit green bright, everything off it dark, a deep blue sky with the afterglow low down
      pal: { skyTop: [12, 20, 48], skyMid: [46, 56, 98], haze: [126, 104, 122], lawn: [44, 60, 38], path: [92, 92, 96], cap: [98, 92, 82], ditch: [30, 28, 26],
        green: [72, 132, 62], greenHi: [88, 148, 74], leafShadow: [10, 16, 14], leafMid: [24, 34, 28], leafLit: [50, 64, 46], leafHi: [78, 92, 66],
        timber: [76, 70, 62], timberLit: [104, 98, 86] },
      dusk: { sky: { skyTop: [12, 20, 48], skyMid: [46, 56, 98], haze: [126, 104, 122] }, gain: [216, 216, 230], glow: .3, cloud: .5, sun: .6 },
      dim: [138, 140, 168],
      trees: { sycamore: 2, lime: 2, mast: 1 },
      spots(add, R, r) {
        for (const [x, y] of MASTS) add(x, y, 11, 'mast');
        add(-21, -9, 14, 'sycamore'); add(-26, -12, 16, 'lime'); add(-29, 3, 15, 'sycamore');
        for (let x = -30; x <= 30; x += R(6, 9)) add(x, R(-13, -21), R(12, 16), r() < .5 ? 'sycamore' : 'lime');
        for (let x = -32; x <= 32; x += R(7, 11)) add(x, R(55, 63), R(13, 17), r() < .5 ? 'lime' : 'sycamore');
        for (let y = -2; y <= 40; y += R(7, 11)) { add(R(-31, -23), y, R(11, 15), r() < .5 ? 'sycamore' : 'lime'); add(R(23, 31), y, R(11, 15), r() < .5 ? 'lime' : 'sycamore'); }
      },
      pavilion: kilcarraPavilion, band: duskBand, flag: FLAG_IRELAND, far: { x: 60, y: 300, h: 26, build: chimneys },
      paintPath: kilcarraPools, paintGreen: kilcarraGreen,
      // fleeces and anoraks over the whites against the evening chill; no hats or sunglasses
      dress: { tops: [[246, 245, 240], [246, 245, 240], [36, 52, 86], [22, 110, 70], [120, 120, 124], [110, 40, 48], [60, 64, 70]],
        lows: [[240, 239, 234], [240, 239, 234], [52, 56, 66], [110, 104, 92]], hats: ['none', 'none', 'none', 'cap', 'flat'],
        shorts: 0, shades: 0, patterns: { stripes: .03, check: .03 } },
      // a robin singing under the lights, the blackbirds settling, a wren in the hedge, a dog somewhere in the houses; the lamps' hum
      birds: [['robin', .34], ['blackbird', .28], ['wren', .18], ['dog', .2]], ambience: ['floodlights']
    }
  });
})();
