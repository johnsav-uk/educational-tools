/* Bias: the clubs beyond Ashcombe. Loaded by index.html a moment after the page; uses its drawing helpers
   through window.BiasVenueHost (makeCanvas, vr, rgba, PAL, Art and the seeded random numbers) and adds each club to VENUES. A venue gives:
   name, place, ends (what each end faces, for the end summary), pal (colours over Ashcombe's), trees (kind:
   how many variants), spots(add, R, r) (where the trees stand), pavilion() (drawn on the 24 m x 9.6 m frame
   Ashcombe's uses, ground at the bottom), band(seed) (the country beyond, 2400 x 140), far (a distant landmark,
   or {} for none), flag (the national flag on the pole by the pavilion), dress (what the
   crowd wears), birds and ambience (the club's sounds) and roses (flowers in the pavilion-side hedges). Optional: paintGreen and paintPath
   (marks on the green and the path, in Art's ground frame), marks (lines and dots drawn sharp on the green), tidy (false: no shrubs or planters), bench (drawn on the bench frame), blades and mottle (the near-field
   texture tiles), and indoor ({ h, build }: a hall, with walls and a ceiling in place of the club outside; see Art.build).
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
    },
    fernley: {
      id: 'fernley', name: 'Fernley Indoor Bowls Centre', place: 'Leicestershire, England', ends: ['the results board', 'the bar'],
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
    }
  });
})();
