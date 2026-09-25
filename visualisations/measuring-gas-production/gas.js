/* Measuring Gas in Reactions — simulators, graphs, quiz, exam questions,
   presenter mode and print. No dependencies. */
(function(){
  'use strict';

  var W = 720, H = 400;           // logical size of every apparatus drawing
  var T_END = 120;                // seconds of reaction time shown

  /* Canvas colours are written as hex/rgba (see CLAUDE.md). */
  var PAL = {
    dark: {
      bg:'#091321', bench:'#182535', benchTop:'#26364a', text:'#edf2f8', muted:'#8693a5',
      glass:'#9fb4cc', glassFill:'rgba(159,180,204,0.07)', liquid:'rgba(71,181,250,0.20)', liquidTop:'rgba(71,181,250,0.65)',
      water:'rgba(71,181,250,0.16)', gas:'rgba(237,242,248,0.07)', bubble:'rgba(237,242,248,0.85)', bubbleFill:'rgba(237,242,248,0.12)',
      rubber:'#5b4b45', metal:'#56657a', metalLight:'#8693a5', plunger:'#2b3a4d', accent:'#47b5fa', ht:'#b199f4',
      balance:'#132033', balanceEdge:'#26364a', lcdBg:'#07161a', lcd:'#5cd5c7', lcdDim:'rgba(92,213,199,0.12)',
      cotton:'#e9eef5', cottonShade:'#b8c3d1', puff:'226,234,244', mg:'#c9d2dc', chip:'#e6dfcf', chipEdge:'#a79f8e',
      mno2:'#2a2f36', mno2Edge:'#6b7480', leader:'#4a5a70', clockBg:'#0d1928'
    },
    print: {
      bg:'#ffffff', bench:'#d6d6d6', benchTop:'#9a9a9a', text:'#000000', muted:'#333333',
      glass:'#222222', glassFill:'rgba(0,0,0,0.02)', liquid:'rgba(40,120,200,0.16)', liquidTop:'rgba(20,90,170,0.8)',
      water:'rgba(40,120,200,0.14)', gas:'rgba(0,0,0,0.0)', bubble:'rgba(0,0,0,0.75)', bubbleFill:'rgba(255,255,255,0.6)',
      rubber:'#8b7b73', metal:'#9a9a9a', metalLight:'#666666', plunger:'#b8b8b8', accent:'#0b5394', ht:'#5b3f9e',
      balance:'#f1f1f1', balanceEdge:'#555555', lcdBg:'#e8efe9', lcd:'#0f5132', lcdDim:'rgba(0,0,0,0.05)',
      cotton:'#ffffff', cottonShade:'#777777', puff:'120,120,120', mg:'#8a8f96', chip:'#eeeeee', chipEdge:'#555555',
      mno2:'#222222', mno2Edge:'#000000', leader:'#555555', clockBg:'#ffffff'
    }
  };

  function sf(x, n){
    if (!isFinite(x)) return '—';
    if (x === 0) return '0';
    var s = Number(x.toPrecision(n));
    var d = Math.max(0, n - 1 - Math.floor(Math.log10(Math.abs(s))));
    return s.toFixed(Math.min(d, 6));
  }

  /* ── Reaction models ───────────────────────────────────────────────
     Every curve is  Q(t) = Qmax (1 − e^(−kt)) : fast at first, then levelling
     off as the limiting reactant runs out. */
  var METHODS = {
    syringe: {
      name:'Gas syringe', k:0.034, max:62,
      value:function(t){ return this.max * (1 - Math.exp(-this.k * t)); },
      slope:function(t){ return this.max * this.k * Math.exp(-this.k * t); },
      qLabel:'Volume of H₂', unit:'cm³', dp:1, rateUnit:'cm³/s',
      graph:{ yMin:0, yMax:70, yStep:10, yLabel:'Volume of gas (cm³)' },
      aria:'Conical flask of magnesium and hydrochloric acid joined by a delivery tube to a gas syringe. The plunger moves out as hydrogen is made.'
    },
    mass: {
      name:'Mass loss', k:0.03, m0:125.40, dm:0.88,
      value:function(t){ return this.m0 - this.dm * (1 - Math.exp(-this.k * t)); },
      slope:function(t){ return -this.dm * this.k * Math.exp(-this.k * t); },
      qLabel:'Balance reading', unit:'g', dp:2, rateUnit:'g/s',
      graph:{ yMin:124.4, yMax:125.6, yStep:0.2, yLabel:'Mass of flask + contents (g)' },
      aria:'Conical flask of marble chips and hydrochloric acid, plugged with cotton wool, on a digital balance. The reading falls as carbon dioxide escapes.'
    },
    water: {
      name:'Over water', k:0.03, max:78,
      value:function(t){ return this.max * (1 - Math.exp(-this.k * t)); },
      slope:function(t){ return this.max * this.k * Math.exp(-this.k * t); },
      qLabel:'Volume of O₂', unit:'cm³', dp:1, rateUnit:'cm³/s',
      graph:{ yMin:0, yMax:90, yStep:10, yLabel:'Volume of gas (cm³)' },
      aria:'Flask of hydrogen peroxide and manganese dioxide with a delivery tube under an upturned measuring cylinder in a trough. Bubbles of oxygen push the water level down.'
    }
  };

  /* Apparatus geometry, shared by drawing and bubbles. */
  var GEO = {
    syringe:{ flask:{ cx:150, base:360 }, x0:320, pxPer:2.1 },
    mass:{ flask:{ cx:320, base:288 } },
    water:{ flask:{ cx:120, base:360 }, cyl:{ x0:450, x1:516, top:46, mouth:330, zeroY:56, pxPer:2.4 } }
  };
  function flaskSurface(f){ return f.base - 55; }
  function flaskHalfW(f, y){
    var sh = f.base - 105;
    if (y <= sh) return 17;
    return 17 + 53 * Math.min(1, (y - sh) / 97);
  }
  function cylLevel(v){ var c = GEO.water.cyl; return c.zeroY + v * c.pxPer; }

  /* Bubble zones: where bubbles are born and where they burst. */
  function zones(id){
    var f = GEO[id].flask, z = [
      { x:f.cx, spread:40, y0:f.base - 8, top:function(){ return flaskSurface(f) + 2; }, rate:44, r0:1.6, r1:4, dens:16, flask:f }
    ];
    if (id === 'water'){
      var c = GEO.water.cyl;
      z.push({ x:(c.x0 + c.x1) / 2, spread:5, y0:c.mouth - 12, top:function(v){ return cylLevel(v) + 3; }, rate:14, r0:2.5, r1:5.5, dens:9, cyl:true });
    }
    return z;
  }

  function newBubble(z, y){
    var r = z.r0 + Math.random() * (z.r1 - z.r0);
    return { z:z, x:z.x + (Math.random() * 2 - 1) * z.spread, y:y, r:r,
             vy:(z.cyl ? 70 : 50) + r * 10 + Math.random() * 30, ph:Math.random() * 6.28 };
  }

  function seedParticles(id, t){
    var m = METHODS[id], v = id === 'mass' ? 0 : m.value(t);
    var r = Math.exp(-m.k * t), out = { bubbles:[], puffs:[] };
    if (t <= 0) return out;           // nothing has reacted yet
    zones(id).forEach(function(z){
      var n = Math.round(z.dens * r), top = z.top(v);
      for (var i = 0; i < n; i++) out.bubbles.push(newBubble(z, top + Math.random() * (z.y0 - top)));
    });
    if (id === 'mass'){
      var np = Math.round(7 * r);
      for (var j = 0; j < np; j++){ var p = newPuff(); p.age = Math.random() * p.life; out.puffs.push(p); }
    }
    return out;
  }
  function newPuff(){
    var f = GEO.mass.flask;
    return { x:f.cx + (Math.random() * 2 - 1) * 8, y:f.base - 172, vx:(Math.random() * 2 - 1) * 9, vy:-(24 + Math.random() * 18),
             age:0, life:2.2 + Math.random() * 1.2, r:3 + Math.random() * 2 };
  }

  /* ── Drawing helpers ─────────────────────────────────────────────── */
  function rr(ctx, x, y, w, h, r){
    ctx.beginPath();
    ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath();
  }
  function font(ctx, size, weight, mono){
    ctx.font = (weight || 600) + ' ' + size + 'px ' + (mono ? '"JetBrains Mono", ui-monospace, monospace' : '"Plus Jakarta Sans", system-ui, sans-serif');
  }
  function label(ctx, P, text, x, y, align, to){
    font(ctx, 12.5, 600);
    ctx.fillStyle = P.muted; ctx.textAlign = align || 'left'; ctx.textBaseline = 'middle';
    ctx.fillText(text, x, y);
    if (!to) return;
    // leader line from the side of the text nearest the thing it names
    var sx = align === 'right' ? x + 5 : align === 'center' ? x : x - 5;
    var sy = align === 'center' ? y + (to[1] > y ? 9 : -9) : y;
    ctx.strokeStyle = P.leader; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(sx, sy); ctx.lineTo(to[0], to[1]); ctx.stroke();
    ctx.fillStyle = P.leader; ctx.beginPath(); ctx.arc(to[0], to[1], 2, 0, 6.29); ctx.fill();
  }
  function bench(ctx, P, y){
    ctx.fillStyle = P.bench; ctx.fillRect(0, y, W, 8);
    ctx.fillStyle = P.benchTop; ctx.fillRect(0, y, W, 1.5);
  }
  function tube(ctx, P, pts){
    ctx.lineJoin = 'round'; ctx.lineCap = 'round';
    ctx.beginPath(); pts.forEach(function(p, i){ i ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1]); });
    ctx.strokeStyle = P.glass; ctx.lineWidth = 7; ctx.stroke();
    ctx.strokeStyle = P.bg; ctx.lineWidth = 3.5; ctx.stroke();
  }
  function clock(ctx, P, t){
    rr(ctx, 14, 14, 108, 34, 8); ctx.fillStyle = P.clockBg; ctx.fill();
    ctx.strokeStyle = P.benchTop; ctx.lineWidth = 1; ctx.stroke();
    // stopwatch glyph
    ctx.strokeStyle = P.accent; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.arc(32, 32, 8, 0, 6.29); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(32, 32); var a = (t % 60) / 60 * 6.283 - 1.571; ctx.lineTo(32 + Math.cos(a) * 6, 32 + Math.sin(a) * 6); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(32, 21); ctx.lineTo(32, 18); ctx.stroke();
    font(ctx, 16, 600, true); ctx.fillStyle = P.text; ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
    ctx.fillText(t.toFixed(0).padStart(3, ' ') + ' s', 46, 32);
  }

  /* Conical flask; returns after drawing glass, contents drawn via callback. */
  function flask(ctx, P, f, contents){
    var cx = f.cx, b = f.base;
    function outline(){
      ctx.beginPath();
      ctx.moveTo(cx - 20, b - 152); ctx.lineTo(cx - 17, b - 149);
      ctx.lineTo(cx - 17, b - 105); ctx.lineTo(cx - 70, b - 8);
      ctx.quadraticCurveTo(cx - 72, b, cx - 62, b); ctx.lineTo(cx + 62, b);
      ctx.quadraticCurveTo(cx + 72, b, cx + 70, b - 8); ctx.lineTo(cx + 17, b - 105);
      ctx.lineTo(cx + 17, b - 149); ctx.lineTo(cx + 20, b - 152);
    }
    outline(); ctx.fillStyle = P.glassFill; ctx.fill();
    // liquid
    var s = flaskSurface(f), hw = flaskHalfW(f, s);
    ctx.beginPath();
    ctx.moveTo(cx - hw, s); ctx.lineTo(cx - 70, b - 8); ctx.quadraticCurveTo(cx - 72, b, cx - 62, b);
    ctx.lineTo(cx + 62, b); ctx.quadraticCurveTo(cx + 72, b, cx + 70, b - 8); ctx.lineTo(cx + hw, s); ctx.closePath();
    ctx.fillStyle = P.liquid; ctx.fill();
    ctx.strokeStyle = P.liquidTop; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(cx - hw + 1, s); ctx.lineTo(cx + hw - 1, s); ctx.stroke();
    if (contents) contents();
    outline(); ctx.strokeStyle = P.glass; ctx.lineWidth = 2.2; ctx.lineJoin = 'round'; ctx.stroke();
  }
  function bung(ctx, P, f){
    var cx = f.cx, b = f.base;
    ctx.beginPath(); ctx.moveTo(cx - 22, b - 166); ctx.lineTo(cx + 22, b - 166); ctx.lineTo(cx + 16, b - 136); ctx.lineTo(cx - 16, b - 136); ctx.closePath();
    ctx.fillStyle = P.rubber; ctx.fill();
  }
  function drawBubbles(ctx, P, list){
    ctx.lineWidth = 1.2;
    list.forEach(function(p){
      ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, 6.29);
      ctx.fillStyle = P.bubbleFill; ctx.fill(); ctx.strokeStyle = P.bubble; ctx.stroke();
    });
  }
  function stand(ctx, P, x, top, baseY, baseW){
    ctx.fillStyle = P.metal;
    rr(ctx, x - baseW / 2, baseY - 8, baseW, 8, 2); ctx.fill();
    ctx.fillRect(x - 3, top, 6, baseY - 8 - top);
  }

  /* ── Method 1: gas syringe ───────────────────────────────────────── */
  function drawSyringe(ctx, P, st){
    var g = GEO.syringe, f = g.flask, v = st.v, prog = v / METHODS.syringe.max;
    bench(ctx, P, 360);
    stand(ctx, P, 505, 76, 360, 90);
    flask(ctx, P, f, function(){
      // magnesium ribbon shrinks as it reacts
      var L = 34 * Math.max(0, 1 - prog * 1.02);
      ctx.strokeStyle = P.mg; ctx.lineWidth = 3; ctx.lineCap = 'round';
      [[-34, 351, .3], [6, 354, -.15], [-8, 346, .05]].forEach(function(s){
        if (L < 1) return;
        ctx.beginPath(); ctx.moveTo(f.cx + s[0], s[1]); ctx.lineTo(f.cx + s[0] + L * Math.cos(s[2]), s[1] + L * Math.sin(s[2])); ctx.stroke();
      });
      drawBubbles(ctx, P, st.bubbles);
    });
    tube(ctx, P, [[f.cx, f.base - 132], [f.cx, 110], [306, 110]]);
    bung(ctx, P, f);
    tube(ctx, P, [[f.cx, f.base - 132], [f.cx, f.base - 170]]);

    // barrel
    var bx0 = 312, bx1 = 540, by0 = 88, by1 = 132, head = g.x0 + v * g.pxPer;
    ctx.fillStyle = P.glassFill; rr(ctx, bx0, by0, bx1 - bx0, by1 - by0, 5); ctx.fill();
    ctx.fillStyle = P.gas; ctx.fillRect(bx0 + 2, by0 + 2, head - bx0 - 2, by1 - by0 - 4);
    // nozzle
    ctx.strokeStyle = P.glass; ctx.lineWidth = 2;
    ctx.strokeRect(300, 104, 12, 12);
    // scale
    ctx.strokeStyle = P.muted; ctx.lineWidth = 1; font(ctx, 10.5, 600); ctx.fillStyle = P.muted; ctx.textAlign = 'center'; ctx.textBaseline = 'alphabetic';
    for (var c = 0; c <= 100; c += 5){
      var x = g.x0 + c * g.pxPer, len = c % 10 ? 5 : 10;
      ctx.beginPath(); ctx.moveTo(x, by0); ctx.lineTo(x, by0 + len); ctx.stroke();
      if (c % 20 === 0) ctx.fillText(String(c), x, by0 - 5);
    }
    // plunger
    ctx.fillStyle = P.plunger; ctx.fillRect(head, by0 + 2, 9, by1 - by0 - 4);
    ctx.fillStyle = P.metalLight; ctx.fillRect(head + 9, 106, 214, 8);
    rr(ctx, head + 221, 80, 9, 60, 2); ctx.fill();
    // barrel outline and flange (over the rod)
    ctx.strokeStyle = P.glass; ctx.lineWidth = 2.2; rr(ctx, bx0, by0, bx1 - bx0, by1 - by0, 5); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(bx1, by0 - 10); ctx.lineTo(bx1, by1 + 10); ctx.lineWidth = 4; ctx.stroke();
    // reading marker
    ctx.strokeStyle = P.accent; ctx.lineWidth = 2; ctx.setLineDash([4, 3]);
    ctx.beginPath(); ctx.moveTo(head, by1 + 2); ctx.lineTo(head, by1 + 16); ctx.stroke(); ctx.setLineDash([]);
    font(ctx, 13, 700, true); ctx.fillStyle = P.accent; ctx.textAlign = 'center'; ctx.textBaseline = 'top';
    ctx.fillText(v.toFixed(0) + ' cm³', Math.max(346, head), by1 + 18);
    // clamp (drawn last so it sits on the barrel)
    ctx.fillStyle = P.metal; ctx.fillRect(498, by0 - 6, 14, by1 - by0 + 12);

    label(ctx, P, 'gas syringe', 426, 56, 'center');
    label(ctx, P, 'delivery tube', 228, 96, 'center');
    label(ctx, P, 'bung', f.cx + 44, f.base - 152, 'left', [f.cx + 20, f.base - 152]);
    label(ctx, P, 'conical flask', f.cx + 80, f.base - 70, 'left', [f.cx + 52, f.base - 44]);
    label(ctx, P, 'magnesium + dilute hydrochloric acid', f.cx + 30, 384, 'left');
    label(ctx, P, 'clamp stand', 560, 300, 'left', [509, 300]);
    clock(ctx, P, st.t);
  }

  /* ── Method 2: mass loss ─────────────────────────────────────────── */
  var CHIPS = [[-44, 347, 9], [-26, 351, 10], [-8, 348, 8], [10, 351, 10], [28, 349, 9], [44, 351, 7], [-16, 339, 7], [18, 340, 7]];
  function chip(ctx, P, x, y, r, seed){
    ctx.beginPath();
    for (var i = 0; i < 7; i++){
      var a = i / 7 * 6.283 + seed, rad = r * (0.78 + 0.22 * Math.sin(seed * 3 + i * 2.1));
      var px = x + Math.cos(a) * rad, py = y + Math.sin(a) * rad * 0.72;
      i ? ctx.lineTo(px, py) : ctx.moveTo(px, py);
    }
    ctx.closePath(); ctx.fillStyle = P.chip; ctx.fill(); ctx.strokeStyle = P.chipEdge; ctx.lineWidth = 1; ctx.stroke();
  }
  function drawMass(ctx, P, st){
    var m = METHODS.mass, f = GEO.mass.flask, reading = m.value(st.t), prog = (m.m0 - reading) / m.dm;
    bench(ctx, P, 360);
    // balance
    rr(ctx, 170, 300, 300, 60, 8); ctx.fillStyle = P.balance; ctx.fill(); ctx.strokeStyle = P.balanceEdge; ctx.lineWidth = 1.5; ctx.stroke();
    ctx.fillStyle = P.metal; rr(ctx, 200, 289, 240, 9, 3); ctx.fill(); ctx.fillRect(312, 297, 16, 4);
    rr(ctx, 236, 312, 168, 38, 5); ctx.fillStyle = P.lcdBg; ctx.fill();
    font(ctx, 24, 600, true); ctx.textAlign = 'right'; ctx.textBaseline = 'middle';
    ctx.fillStyle = P.lcdDim; ctx.fillText('888.88 g', 392, 332);
    ctx.fillStyle = P.lcd; ctx.fillText(reading.toFixed(2) + ' g', 392, 332);
    ctx.fillStyle = P.metalLight; ctx.beginPath(); ctx.arc(438, 331, 7, 0, 6.29); ctx.fill();
    font(ctx, 8, 700); ctx.fillStyle = P.muted; ctx.textAlign = 'center'; ctx.fillText('TARE', 438, 346);

    var sc = 1 - 0.45 * prog;
    var g0 = { cx:f.cx, base:f.base };
    flask(ctx, P, g0, function(){
      CHIPS.forEach(function(c, i){ chip(ctx, P, f.cx + c[0], c[1] - 72, c[2] * sc, i * 1.7); });
      drawBubbles(ctx, P, st.bubbles);
    });
    // cotton wool plug
    var top = f.base - 150;
    [[-9, 8, 9], [6, 6, 10], [-2, 16, 8], [10, -4, 8], [-10, -4, 8], [0, -10, 9], [-14, 6, 6], [15, 10, 6]].forEach(function(c){
      ctx.beginPath(); ctx.arc(f.cx + c[0], top + c[1], c[2], 0, 6.29);
      ctx.fillStyle = P.cotton; ctx.fill(); ctx.strokeStyle = P.cottonShade; ctx.lineWidth = .8; ctx.stroke();
    });
    // escaping gas
    st.puffs.forEach(function(p){
      var k = p.age / p.life, a = Math.max(0, 0.55 * (1 - k));
      ctx.beginPath(); ctx.arc(p.x, p.y, p.r + k * 12, 0, 6.29);
      ctx.fillStyle = 'rgba(' + P.puff + ',' + (a * 0.35).toFixed(3) + ')'; ctx.fill();
      ctx.strokeStyle = 'rgba(' + P.puff + ',' + a.toFixed(3) + ')'; ctx.lineWidth = 1; ctx.stroke();
    });

    label(ctx, P, 'carbon dioxide escapes', 206, 70, 'right', [f.cx - 22, 94]);
    label(ctx, P, 'cotton wool', f.cx + 70, top - 4, 'left', [f.cx + 20, top]);
    label(ctx, P, 'conical flask', f.cx + 90, f.base - 64, 'left', [f.cx + 54, f.base - 40]);
    label(ctx, P, 'digital balance', 150, 330, 'right', [172, 330]);
    label(ctx, P, 'marble chips + dilute hydrochloric acid', f.cx, 384, 'center');
    font(ctx, 13, 700, true); ctx.fillStyle = P.accent; ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
    ctx.fillText('mass lost: ' + (m.m0 - reading).toFixed(2) + ' g', 500, 330);
    clock(ctx, P, st.t);
  }

  /* ── Method 3: downward displacement of water ────────────────────── */
  function drawWater(ctx, P, st){
    var f = GEO.water.flask, c = GEO.water.cyl, v = st.v, lvl = cylLevel(v);
    var tx0 = 290, tx1 = 640, tTop = 240, wTop = 268, tBot = 358;
    bench(ctx, P, 360);
    stand(ctx, P, 680, 60, 360, 70);
    ctx.fillStyle = P.metal; ctx.fillRect(c.x1, 126, 680 - c.x1, 6);
    // trough water
    ctx.fillStyle = P.water; ctx.fillRect(tx0 + 2, wTop, tx1 - tx0 - 4, tBot - wTop);
    ctx.strokeStyle = P.liquidTop; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(tx0 + 2, wTop); ctx.lineTo(c.x0, wTop); ctx.moveTo(c.x1, wTop); ctx.lineTo(tx1 - 2, wTop); ctx.stroke();

    // cylinder contents: gas above, water below
    ctx.fillStyle = P.bg; ctx.fillRect(c.x0, c.top, c.x1 - c.x0, c.mouth - c.top);
    ctx.fillStyle = P.gas; ctx.fillRect(c.x0, c.top, c.x1 - c.x0, lvl - c.top);
    ctx.fillStyle = P.water; ctx.fillRect(c.x0, lvl, c.x1 - c.x0, c.mouth - lvl);
    if (lvl < wTop) { ctx.fillStyle = P.water; ctx.fillRect(c.x0, wTop, c.x1 - c.x0, c.mouth - wTop); }

    flask(ctx, P, f, function(){
      // MnO2 catalyst: fine black powder, not used up
      ctx.fillStyle = P.mno2;
      for (var i = 0; i < 46; i++){
        var px = f.cx - 56 + ((i * 37) % 112), py = f.base - 3 - ((i * 13) % 7);
        ctx.beginPath(); ctx.arc(px, py, 2.2, 0, 6.29); ctx.fill();
      }
      drawBubbles(ctx, P, st.bubbles.filter(function(b){ return !b.z.cyl; }));
    });
    drawBubbles(ctx, P, st.bubbles.filter(function(b){ return b.z.cyl; }));

    // water surface inside cylinder
    ctx.strokeStyle = P.liquidTop; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(c.x0 + 2, lvl - 2); ctx.quadraticCurveTo((c.x0 + c.x1) / 2, lvl + 3, c.x1 - 2, lvl - 2); ctx.stroke();

    // cylinder glass (upside down: its base is at the top)
    ctx.strokeStyle = P.glass; ctx.lineWidth = 2.2;
    ctx.beginPath(); ctx.moveTo(c.x0, c.mouth); ctx.lineTo(c.x0, c.top); ctx.lineTo(c.x1, c.top); ctx.lineTo(c.x1, c.mouth); ctx.stroke();
    ctx.fillStyle = P.glass; rr(ctx, c.x0 - 12, c.top - 10, c.x1 - c.x0 + 24, 10, 3); ctx.fill();
    // scale runs downwards from the closed end
    ctx.strokeStyle = P.muted; ctx.lineWidth = 1; font(ctx, 10.5, 600); ctx.fillStyle = P.muted; ctx.textAlign = 'right'; ctx.textBaseline = 'middle';
    for (var s = 0; s <= 100; s += 5){
      var y = c.zeroY + s * c.pxPer, len = s % 10 ? 6 : 12;
      ctx.beginPath(); ctx.moveTo(c.x0, y); ctx.lineTo(c.x0 + len, y); ctx.stroke();
      if (s % 20 === 0) ctx.fillText(String(s), c.x0 - 5, y);
    }
    // clamp on cylinder
    ctx.fillStyle = P.metal; ctx.fillRect(c.x0 - 4, 122, c.x1 - c.x0 + 8, 14);

    // trough glass
    ctx.strokeStyle = P.glass; ctx.lineWidth = 2.2;
    ctx.beginPath(); ctx.moveTo(tx0, tTop); ctx.lineTo(tx0, tBot + 1); ctx.lineTo(tx1, tBot + 1); ctx.lineTo(tx1, tTop); ctx.stroke();

    // delivery tube: out of the flask, over the trough wall, up under the cylinder
    tube(ctx, P, [[f.cx, f.base - 132], [f.cx, 160], [360, 160], [360, 344], [483, 344], [483, c.mouth - 8]]);
    bung(ctx, P, f);
    tube(ctx, P, [[f.cx, f.base - 132], [f.cx, f.base - 170]]);

    // reading marker
    ctx.strokeStyle = P.accent; ctx.lineWidth = 2; ctx.setLineDash([4, 3]);
    ctx.beginPath(); ctx.moveTo(c.x1 + 2, lvl); ctx.lineTo(c.x1 + 18, lvl); ctx.stroke(); ctx.setLineDash([]);
    font(ctx, 13, 700, true); ctx.fillStyle = P.accent; ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
    ctx.fillText(v.toFixed(0) + ' cm³', c.x1 + 22, Math.min(Math.max(lvl, 150), 250));

    label(ctx, P, 'upturned measuring cylinder', c.x1 + 16, 26, 'left');
    label(ctx, P, 'oxygen', c.x1 + 22, 80, 'left', [c.x1 - 12, 70]);
    label(ctx, P, 'trough of water', 560, 384, 'center');
    label(ctx, P, 'delivery tube', 250, 148, 'center');
    label(ctx, P, 'hydrogen peroxide + MnO₂', f.cx, 384, 'center');
    clock(ctx, P, st.t);
  }

  var DRAW = { syringe:drawSyringe, mass:drawMass, water:drawWater };

  /* ── Mini graph ──────────────────────────────────────────────────── */
  function drawGraph(ctx, w, h, id, t, showTan, P){
    var m = METHODS[id], G = m.graph;
    var L = 52, R = 12, Tp = 14, B = 40, pw = w - L - R, ph = h - Tp - B;
    function X(s){ return L + s / T_END * pw; }
    function Y(q){ return Tp + (1 - (q - G.yMin) / (G.yMax - G.yMin)) * ph; }
    ctx.fillStyle = P.bg; ctx.fillRect(0, 0, w, h);
    ctx.lineWidth = 1; font(ctx, 10.5, 500); ctx.fillStyle = P.muted;
    // grid
    ctx.strokeStyle = P.bench;
    ctx.textAlign = 'right'; ctx.textBaseline = 'middle';
    var nY = Math.round((G.yMax - G.yMin) / G.yStep);
    for (var i = 0; i <= nY; i++){
      var q = G.yMin + i * G.yStep, y = Math.round(Y(q)) + .5;
      ctx.beginPath(); ctx.moveTo(L, y); ctx.lineTo(L + pw, y); ctx.stroke();
      if (i % (nY > 6 ? 2 : 1) === 0) ctx.fillText(G.yStep < 1 ? q.toFixed(1) : String(q), L - 6, y);
    }
    ctx.textAlign = 'center'; ctx.textBaseline = 'top';
    for (var s = 0; s <= T_END; s += 20){
      var x = Math.round(X(s)) + .5;
      ctx.beginPath(); ctx.moveTo(x, Tp); ctx.lineTo(x, Tp + ph); ctx.stroke();
      ctx.fillText(String(s), x, Tp + ph + 5);
    }
    ctx.strokeStyle = P.muted; ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.moveTo(L, Tp); ctx.lineTo(L, Tp + ph); ctx.lineTo(L + pw, Tp + ph); ctx.stroke();
    font(ctx, 11, 600); ctx.fillStyle = P.text;
    ctx.fillText('Time (s)', L + pw / 2, h - 16);
    ctx.save(); ctx.translate(13, Tp + ph / 2); ctx.rotate(-Math.PI / 2); ctx.textBaseline = 'middle'; ctx.fillText(G.yLabel, 0, 0); ctx.restore();

    // data so far
    ctx.save(); ctx.beginPath(); ctx.rect(L, Tp - 2, pw + 2, ph + 4); ctx.clip();
    ctx.strokeStyle = P.accent; ctx.lineWidth = 2.4; ctx.lineJoin = 'round';
    ctx.beginPath(); ctx.moveTo(X(0), Y(m.value(0)));
    for (var k = 0.5; k <= t; k += 0.5) ctx.lineTo(X(k), Y(m.value(k)));
    ctx.lineTo(X(t), Y(m.value(t))); ctx.stroke();
    ctx.fillStyle = P.text;
    for (var r = 0; r <= t + 1e-6; r += 10){ ctx.beginPath(); ctx.arc(X(r), Y(m.value(r)), 3, 0, 6.29); ctx.fill(); }
    // tangent at the current time
    if (showTan && t > 0.5){
      var q0 = m.value(t), sl = m.slope(t), d = 30;
      ctx.strokeStyle = P.ht; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(X(t - d), Y(q0 - sl * d)); ctx.lineTo(X(t + d), Y(q0 + sl * d)); ctx.stroke();
      ctx.fillStyle = P.ht; ctx.beginPath(); ctx.arc(X(t), Y(q0), 4.5, 0, 6.29); ctx.fill();
    }
    ctx.restore();
  }

  /* ── Simulator widget ────────────────────────────────────────────── */
  var sims = [];
  function Sim(root){
    var id = root.dataset.method, m = METHODS[id], self = this;
    this.id = id; this.m = m; this.root = root;
    this.t = 0; this.playing = false; this.speed = 5; this.dirty = true;
    this.acc = []; this.puffAcc = 0;
    var ps = seedParticles(id, 0); this.bubbles = ps.bubbles; this.puffs = ps.puffs;

    root.innerHTML =
      '<div class="sim-body graph-on">' +
        '<canvas class="stage" role="img" aria-label="' + m.aria + '"></canvas>' +
        '<div class="sim-graph">' +
          '<canvas class="graph" role="img" aria-label="Live graph of ' + m.graph.yLabel.toLowerCase() + ' against time"></canvas>' +
          '<div class="gopt"><label><input type="checkbox" class="tan"> Tangent at current time <span class="tag ht">HT</span></label></div>' +
        '</div>' +
      '</div>' +
      '<div class="sim-ctrl">' +
        '<button class="btn primary play" type="button" aria-pressed="false">' + ICON.play + '<span>Play</span></button>' +
        '<button class="btn reset" type="button">' + ICON.reset + '<span>Reset</span></button>' +
        '<label class="scrub">Time <input type="range" min="0" max="' + T_END + '" step="0.5" value="0" aria-label="Reaction time (seconds)"></label>' +
        '<label>Speed <select aria-label="Playback speed"><option value="1">1×</option><option value="2">2×</option><option value="5" selected>5×</option><option value="10">10×</option></select></label>' +
        '<label><input type="checkbox" class="showGraph" checked> Live graph</label>' +
      '</div>' +
      '<div class="stats" aria-live="off">' +
        '<div class="stat"><span>Time</span><b data-k="t">0 s</b></div>' +
        '<div class="stat"><span>' + m.qLabel + '</span><b data-k="q"></b></div>' +
        '<div class="stat"><span>Mean rate since start</span><b data-k="mean">—</b></div>' +
        '<div class="stat ht"><span>Rate now (tangent) · HT</span><b data-k="now"></b></div>' +
      '</div>';

    this.cv = root.querySelector('canvas.stage'); this.ctx = this.cv.getContext('2d');
    this.gv = root.querySelector('canvas.graph'); this.gctx = this.gv.getContext('2d');
    this.body = root.querySelector('.sim-body'); this.graphBox = root.querySelector('.sim-graph');
    this.playBtn = root.querySelector('.play'); this.slider = root.querySelector('input[type=range]');
    this.tanBox = root.querySelector('.tan');
    this.out = {}; root.querySelectorAll('[data-k]').forEach(function(b){ self.out[b.dataset.k] = b; });

    this.playBtn.addEventListener('click', function(){ self.setPlaying(!self.playing); });
    root.querySelector('.reset').addEventListener('click', function(){ self.reset(); });
    this.slider.addEventListener('input', function(){ self.seek(parseFloat(self.slider.value)); });
    root.querySelector('select').addEventListener('change', function(e){ self.speed = parseFloat(e.target.value); });
    root.querySelector('.showGraph').addEventListener('change', function(e){
      self.graphBox.hidden = !e.target.checked; self.body.classList.toggle('graph-on', e.target.checked); self.dirty = true;
    });
    this.tanBox.addEventListener('change', function(){ self.dirty = true; });

    if (window.ResizeObserver){
      new ResizeObserver(function(){ self.dirty = true; }).observe(root);
    } else {
      window.addEventListener('resize', function(){ self.dirty = true; });
    }
    this.readouts();
  }
  var ICON = {
    play:'<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M7 4.5v15l13-7.5z"/></svg>',
    pause:'<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><rect x="6" y="4.5" width="4" height="15" rx="1"/><rect x="14" y="4.5" width="4" height="15" rx="1"/></svg>',
    reset:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M3 12a9 9 0 1 0 3-6.7"/><path d="M3 4v5h5"/></svg>'
  };
  Sim.prototype.setPlaying = function(on){
    if (on && this.t >= T_END) this.seek(0);
    this.playing = on;
    this.playBtn.setAttribute('aria-pressed', on);
    this.playBtn.classList.toggle('primary', !on);
    this.playBtn.innerHTML = (on ? ICON.pause : ICON.play) + '<span>' + (on ? 'Pause' : (this.t > 0 && this.t < T_END ? 'Resume' : 'Play')) + '</span>';
    this.dirty = true;
  };
  Sim.prototype.reset = function(){ this.seek(0); this.setPlaying(false); };
  Sim.prototype.seek = function(t){
    this.t = Math.max(0, Math.min(T_END, t));
    var ps = seedParticles(this.id, this.t); this.bubbles = ps.bubbles; this.puffs = ps.puffs;
    this.slider.value = this.t; this.readouts(); this.dirty = true;
    if (!this.playing) this.setPlaying(false);
  };
  Sim.prototype.readouts = function(){
    var m = this.m, t = this.t, q = m.value(t), o = this.out;
    o.t.textContent = t.toFixed(0) + ' s';
    o.q.textContent = q.toFixed(m.dp === 2 ? 2 : 0) + ' ' + m.unit;
    var d = this.id === 'mass' ? m.m0 - q : q;
    o.mean.textContent = t < 1 ? '—' : sf(d / t, 2) + ' ' + m.rateUnit;
    o.now.textContent = sf(Math.abs(m.slope(t)), 2) + ' ' + m.rateUnit;
  };
  Sim.prototype.state = function(){
    return { t:this.t, v:this.id === 'mass' ? 0 : this.m.value(this.t), bubbles:this.bubbles, puffs:this.puffs };
  };
  Sim.prototype.step = function(dt){
    if (!this.playing) return;
    var m = this.m;
    this.t = Math.min(T_END, this.t + dt * this.speed);
    var r = Math.exp(-m.k * this.t), v = this.id === 'mass' ? 0 : m.value(this.t), self = this;
    zones(this.id).forEach(function(z, i){
      self.acc[i] = (self.acc[i] || 0) + z.rate * r * dt;
      while (self.acc[i] >= 1){ self.acc[i] -= 1; self.bubbles.push(newBubble(z, z.y0)); }
    });
    this.bubbles = this.bubbles.filter(function(b){
      b.y -= b.vy * dt; b.ph += dt * 6;
      b.x += Math.sin(b.ph) * 0.35;
      if (b.z.flask){ var hw = flaskHalfW(b.z.flask, b.y) - b.r - 2; b.x = Math.max(b.z.flask.cx - hw, Math.min(b.z.flask.cx + hw, b.x)); }
      if (b.z.cyl){ var c = GEO.water.cyl; b.x = Math.max(c.x0 + b.r + 2, Math.min(c.x1 - b.r - 2, b.x)); }
      return b.y > b.z.top(v);
    });
    if (this.id === 'mass'){
      this.puffAcc += 7 * r * dt;
      while (this.puffAcc >= 1){ this.puffAcc -= 1; this.puffs.push(newPuff()); }
      this.puffs = this.puffs.filter(function(p){ p.age += dt; p.x += p.vx * dt; p.y += p.vy * dt; return p.age < p.life; });
    }
    this.slider.value = this.t; this.readouts(); this.dirty = true;
    if (this.t >= T_END) this.setPlaying(false);
  };
  function fit(cv, ctx){
    var dpr = Math.min(window.devicePixelRatio || 1, 2), w = cv.clientWidth, h = cv.clientHeight;
    if (!w || !h) return null;
    var bw = Math.round(w * dpr), bh = Math.round(h * dpr);
    if (cv.width !== bw || cv.height !== bh){ cv.width = bw; cv.height = bh; }
    return { w:w, h:h, dpr:dpr };
  }
  Sim.prototype.draw = function(){
    if (!this.dirty) return;
    var s = fit(this.cv, this.ctx);
    if (!s) return;
    this.dirty = false;
    var ctx = this.ctx, k = s.w / W * s.dpr;
    ctx.setTransform(k, 0, 0, k, 0, 0);
    ctx.fillStyle = PAL.dark.bg; ctx.fillRect(0, 0, W, H);
    DRAW[this.id](ctx, PAL.dark, this.state());
    if (!this.graphBox.hidden){
      var g = fit(this.gv, this.gctx);
      if (g){
        this.gctx.setTransform(g.dpr, 0, 0, g.dpr, 0, 0);
        drawGraph(this.gctx, g.w, g.h, this.id, this.t, this.tanBox.checked, PAL.dark);
      }
    }
  };

  document.querySelectorAll('.sim[data-method]').forEach(function(el){ sims.push(new Sim(el)); });

  var last = 0;
  function frame(ts){
    var dt = last ? Math.min(0.05, (ts - last) / 1000) : 0; last = ts;
    for (var i = 0; i < sims.length; i++){ sims[i].step(dt); sims[i].draw(); }
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(function(){ sims.forEach(function(s){ s.dirty = true; }); renderPrintFigures(); });
  else renderPrintFigures();

  /* Print figures: the same drawings in black on white, frozen mid-reaction. */
  function renderPrintFigures(){
    document.querySelectorAll('img[data-fig]').forEach(function(img){
      var id = img.dataset.fig, c = document.createElement('canvas'), k = 2.2;
      c.width = W * k; c.height = H * k;
      var ctx = c.getContext('2d'); ctx.setTransform(k, 0, 0, k, 0, 0);
      ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, W, H);
      var t = 35, ps = seedParticles(id, t);
      DRAW[id](ctx, PAL.print, { t:t, v:id === 'mass' ? 0 : METHODS[id].value(t), bubbles:ps.bubbles, puffs:ps.puffs });
      img.src = c.toDataURL('image/png');
    });
  }

  /* ── Static SVG graphs (notes, exam, worksheet) ───────────────────── */
  function svgGraph(o){
    var w = 540, h = 350, L = 62, R = 18, Tp = 16, B = 52, pw = w - L - R, ph = h - Tp - B;
    function X(s){ return L + s / o.xMax * pw; }
    function Y(q){ return Tp + (1 - q / o.yMax) * ph; }
    var p = ['<svg class="gsvg" viewBox="0 0 ' + w + ' ' + h + '" role="img" aria-label="' + o.aria + '">'];
    for (var s = 0; s <= o.xMax; s += o.xMinor || 5) p.push('<line class="grid' + (s % o.xStep ? ' minor' : '') + '" x1="' + X(s) + '" y1="' + Tp + '" x2="' + X(s) + '" y2="' + (Tp + ph) + '"/>');
    for (var q = 0; q <= o.yMax; q += o.yMinor || 5) p.push('<line class="grid' + (q % o.yStep ? ' minor' : '') + '" x1="' + L + '" y1="' + Y(q) + '" x2="' + (L + pw) + '" y2="' + Y(q) + '"/>');
    p.push('<path class="axis" d="M' + L + ' ' + Tp + 'V' + (Tp + ph) + 'H' + (L + pw) + '"/>');
    if (!o.blank){
      for (s = 0; s <= o.xMax; s += o.xStep) p.push('<text x="' + X(s) + '" y="' + (Tp + ph + 18) + '" text-anchor="middle">' + s + '</text>');
      for (q = 0; q <= o.yMax; q += o.yStep) p.push('<text x="' + (L - 8) + '" y="' + (Y(q) + 4) + '" text-anchor="end">' + q + '</text>');
      p.push('<text class="lbl" x="' + (L + pw / 2) + '" y="' + (h - 10) + '" text-anchor="middle">Time (s)</text>');
      p.push('<text class="lbl" transform="translate(16 ' + (Tp + ph / 2) + ') rotate(-90)" text-anchor="middle">Volume of oxygen (cm³)</text>');
    }
    if (o.f){
      var d = 'M' + X(0) + ' ' + Y(o.f(0));
      for (s = 1; s <= o.xMax; s++) d += 'L' + X(s).toFixed(1) + ' ' + Y(o.f(s)).toFixed(1);
      p.push('<path class="curve" d="' + d + '"/>');
    }
    if (o.tanAt != null){
      var t0 = o.tanAt, q0 = o.f(t0), m = o.df(t0), a = o.tanFrom, b = o.tanTo;
      p.push('<line class="tan" x1="' + X(a) + '" y1="' + Y(q0 + m * (a - t0)) + '" x2="' + X(b) + '" y2="' + Y(q0 + m * (b - t0)) + '"/>');
      p.push('<circle class="pt" cx="' + X(t0) + '" cy="' + Y(q0) + '" r="4"/>');
      if (o.triangle){
        var ya = q0 + m * (a - t0), yb = q0 + m * (b - t0);
        p.push('<path class="tri" d="M' + X(a) + ' ' + Y(ya) + 'H' + X(b) + 'V' + Y(yb) + '"/>');
        p.push('<text class="tl" x="' + ((X(a) + X(b)) / 2) + '" y="' + (Y(ya) + 18) + '" text-anchor="middle">Δx = ' + (b - a) + ' s</text>');
        p.push('<text class="tl" x="' + (X(b) + 8) + '" y="' + ((Y(ya) + Y(yb)) / 2) + '">Δy = ' + Math.round(yb - ya) + ' cm³</text>');
      }
    }
    p.push('</svg>');
    return p.join('');
  }
  var O2 = { f:function(t){ return 80 * (1 - Math.exp(-0.035 * t)); }, df:function(t){ return 80 * 0.035 * Math.exp(-0.035 * t); } };
  document.getElementById('tangentFig').innerHTML = svgGraph({
    xMax:120, xStep:20, yMax:90, yStep:10, f:O2.f, df:O2.df, tanAt:20, tanFrom:0, tanTo:40, triangle:true,
    aria:'Curve of oxygen volume against time with a tangent drawn at 20 seconds and a triangle under it'
  });
  document.getElementById('blankGrid').innerHTML = svgGraph({
    xMax:100, xStep:10, xMinor:2, yMax:70, yStep:10, yMinor:2, blank:true, aria:'Blank graph grid'
  });

  /* ── Quick quiz ──────────────────────────────────────────────────── */
  var QUIZ = [
    { q:'Which method is <b>least</b> suitable for following a reaction that makes hydrogen?',
      o:['Gas syringe', 'Mass loss on a balance', 'Collecting over water', 'Upturned burette over water'], a:1,
      e:'Hydrogen is so light (M<sub>r</sub> = 2) that the mass barely changes, so the balance can’t measure it accurately.' },
    { q:'Carbon dioxide collected over water gives a smaller volume than in a gas syringe. Why?',
      o:['The water cools the gas', 'Some carbon dioxide dissolves in the water', 'The measuring cylinder leaks', 'Carbon dioxide is denser than air'], a:1,
      e:'CO<sub>2</sub> is slightly soluble in water, so some of it is never collected.' },
    { q:'Volume is measured in cm³ and time in seconds. What is the unit of rate?',
      o:['cm³ s', 's/cm³', 'cm³/s', 'cm³'], a:2,
      e:'Rate = volume ÷ time, so the unit is cm³ ÷ s = cm³/s.' },
    { q:'What is the cotton wool in the neck of the flask for, in the mass-loss method?',
      o:['To stop any gas escaping', 'To let gas out but stop acid spray escaping', 'To speed up the reaction', 'To absorb the carbon dioxide'], a:1,
      e:'Gas must escape for the mass to fall, but acid spray would add to the mass lost and make it too big.' },
    { q:'A gas syringe collects 60 cm³ of gas in the first 20 s. What is the mean rate?',
      o:['0.33 cm³/s', '3 cm³/s', '40 cm³/s', '1200 cm³/s'], a:1,
      e:'Mean rate = 60 ÷ 20 = 3 cm³/s.' },
    { q:'How do you find the rate at one particular time from a volume–time curve?',
      o:['Read the volume at that time', 'Find the area under the curve', 'Find the gradient of a tangent at that time', 'Divide the final volume by the total time'], a:2,
      e:'The gradient of the tangent is the rate at that instant (Higher Tier).' }
  ];
  var quizList = document.getElementById('quizList'), quizScore = document.getElementById('quizScore');
  function buildQuiz(){
    quizList.innerHTML = '';
    var got = 0, done = 0;
    function upd(){ quizScore.textContent = got + ' / ' + QUIZ.length + (done === QUIZ.length ? (got === QUIZ.length ? ' · full marks!' : ' · done') : ''); }
    QUIZ.forEach(function(item, n){
      var card = document.createElement('div'); card.className = 'qq';
      card.innerHTML = '<p class="qq-stem"><span class="n">' + (n + 1) + '.</span>' + item.q + '</p><div class="qq-opts"></div><p class="qq-exp" hidden aria-live="polite"></p>';
      var opts = card.querySelector('.qq-opts'), exp = card.querySelector('.qq-exp');
      item.o.forEach(function(txt, i){
        var b = document.createElement('button'); b.type = 'button'; b.className = 'qq-opt';
        b.innerHTML = '<span class="L">' + 'ABCD'[i] + '</span><span>' + txt + '</span>';
        b.addEventListener('click', function(){
          var all = opts.querySelectorAll('.qq-opt');
          all.forEach(function(x){ x.disabled = true; });
          all[item.a].classList.add('right');
          var ok = i === item.a;
          if (!ok) b.classList.add('wrong');
          exp.hidden = false; exp.classList.toggle('no', !ok);
          exp.innerHTML = '<b>' + (ok ? 'Correct.' : 'Not quite: the answer is ' + 'ABCD'[item.a] + '.') + '</b> ' + item.e;
          if (ok) got++; done++; upd();
        });
        opts.appendChild(b);
      });
      quizList.appendChild(card);
    });
    upd();
  }
  document.getElementById('quizReset').addEventListener('click', buildQuiz);
  buildQuiz();

  /* ── Exam questions ──────────────────────────────────────────────── */
  var t30 = svgGraph({ xMax:120, xStep:20, yMax:90, yStep:10, f:O2.f, df:O2.df, tanAt:30, tanFrom:0, tanTo:60,
    aria:'Curve of oxygen volume against time with a tangent drawn at 30 seconds' });
  var EXAM = [
    { intro:'<h3>Question 1</h3><p>A student reacted magnesium ribbon with dilute hydrochloric acid and collected the hydrogen in a gas syringe.</p>' +
        '<div class="tablewrap datawrap"><table class="data"><tr><th>Time (s)</th><td>0</td><td>10</td><td>20</td><td>30</td><td>40</td><td>50</td><td>60</td><td>70</td></tr>' +
        '<tr><th>Volume (cm³)</th><td>0</td><td>22</td><td>34</td><td>40</td><td>44</td><td>46</td><td>46</td><td>46</td></tr></table></div>',
      parts:[
        { n:'1.1', q:'Name the piece of apparatus used to measure the volume of gas.', m:1, lines:1,
          ms:['Gas syringe (allow upturned measuring cylinder / burette over water)'] },
        { n:'1.2', q:'Calculate the mean rate of reaction over the first 30 seconds. Give the unit.', m:3, lines:3,
          ms:['40 ÷ 30', '= 1.3 (allow 1.33)', 'cm³/s (allow cm³ s⁻¹)'] },
        { n:'1.3', q:'Explain why the volume of gas stops increasing after 50 seconds.', m:2, lines:2,
          ms:['The magnesium (a reactant) has been used up / the reaction has finished', 'So there are no more particles to collide and react'] },
        { n:'1.4', q:'Suggest why the student’s first readings could be lower than the true values.', m:1, lines:2,
          ms:['Some gas escaped before the bung was put in (allow timer started late)'] }
      ] },
    { intro:'<h3>Question 2</h3><p>Marble chips (calcium carbonate) react with hydrochloric acid in a conical flask on a digital balance. The neck of the flask is loosely plugged with cotton wool.</p>',
      parts:[
        { n:'2.1', q:'Explain why cotton wool is used rather than a rubber bung.', m:2, lines:2,
          ms:['Cotton wool lets the carbon dioxide escape (a bung would stop the mass changing)', 'But stops acid spray / liquid escaping, which would add to the mass lost'] },
        { n:'2.2', q:'The mass fell from 125.40 g to 124.76 g in the first 60 seconds. Calculate the mean rate of reaction in g/s.', m:2, lines:2,
          ms:['Mass lost = 0.64 g', '0.64 ÷ 60 = 0.011 g/s (allow 0.0107)'] },
        { n:'2.3', q:'A student wants to use the same method to follow the reaction between magnesium and acid. Explain why this would not work well.', m:2, lines:3,
          ms:['Hydrogen is produced, which has a very low mass / density (M<sub>r</sub> = 2)', 'So the change in mass is too small to measure accurately'] }
      ] },
    { intro:'<h3>Question 3</h3><p>Two students measure the carbon dioxide made in identical reactions. Student A uses a gas syringe. Student B collects the gas over water in an upturned measuring cylinder.</p>',
      parts:[
        { n:'3.1', q:'Student B’s final volume is smaller. Explain why.', m:2, lines:2,
          ms:['Carbon dioxide is (slightly) soluble in water', 'So some dissolves and is not collected / measured'] },
        { n:'3.2', q:'Give <b>two</b> things student B must do when setting up the measuring cylinder.', m:2, lines:2,
          ms:['Fill it completely with water / no air bubbles at the start', 'Turn it upside down with the open end under water (and clamp it)', 'Put the end of the delivery tube under the mouth of the cylinder', 'Any two'] }
      ] },
    { intro:'<h3>Question 4</h3><p>Hydrogen peroxide decomposes using a manganese(IV) oxide catalyst. The graph shows the volume of oxygen collected. A tangent has been drawn at 30 seconds.</p><div class="keep">' + t30 + '</div>',
      parts:[
        { n:'4.1', ht:true, q:'Use the tangent to find the rate of reaction at 30 seconds. Show your working.', m:3, lines:3,
          ms:['Gradient = change in y ÷ change in x, from a large triangle on the tangent', 'e.g. (81 − 23) ÷ (60 − 0)', '= 1.0 cm³/s (accept 0.8–1.2)'] },
        { n:'4.2', q:'Explain, in terms of particles, why the rate at 30 seconds is lower than the rate at the start.', m:2, lines:3,
          ms:['The concentration of hydrogen peroxide is lower (fewer particles per unit volume)', 'So collisions are less frequent / fewer successful collisions per second'] },
        { n:'4.3', q:'What is the total volume of oxygen when the reaction finishes? Use the graph.', m:1, lines:1,
          ms:['About 79–80 cm³'] }
      ] },
    { intro:'<h3>Question 5</h3><p>This question is about planning the rates required practical.</p>',
      parts:[
        { n:'5.1', q:'Describe a method to investigate how the concentration of hydrochloric acid affects the rate of its reaction with magnesium ribbon. Use a gas syringe in your method.', m:6, lines:14, lor:true,
          ms:[
            'Level 3 (5–6): a coherent, logically ordered method that would give valid results, with the variables controlled.',
            'Level 2 (3–4): a method that would give some results, with some control variables; steps may be in the wrong order.',
            'Level 1 (1–2): simple relevant statements; the method would not work as described.',
            'Indicative content: measure a fixed volume of acid with a measuring cylinder into a conical flask · add a fixed length / mass of magnesium · insert bung connected to gas syringe immediately and start timer · record volume every 10 s (or time to collect a set volume) · repeat for different concentrations · same volume of acid, same length of ribbon, same temperature · repeat and calculate a mean · plot volume against time and compare gradients / calculate mean rates.'
          ] }
      ] }
  ];
  var total = 0; EXAM.forEach(function(b){ b.parts.forEach(function(p){ total += p.m; }); });
  var examList = document.getElementById('examList'), examScore = document.getElementById('examScore');
  document.getElementById('totalMarksPrint').textContent = total;
  function examUpd(){
    var got = 0;
    examList.querySelectorAll('.q').forEach(function(q){
      var m = +q.dataset.m, ticks = q.querySelectorAll('details.ms input:checked').length;
      var g = q.dataset.lor ? +q.querySelector('select.lor-mark').value : Math.min(m, ticks);
      q.querySelector('.q-got').textContent = g ? g + ' / ' + m : '';
      got += g;
    });
    examScore.textContent = 'Score: ' + got + ' / ' + total;
  }
  function buildExam(){
    examList.innerHTML = '';
    var ms = [];
    EXAM.forEach(function(b){
      var wrap = document.createElement('div'); wrap.className = 'qblock';
      if (b.intro) wrap.innerHTML = '<div class="qintro">' + b.intro + '</div>';
      b.parts.forEach(function(p){
        var el = document.createElement('div'); el.className = 'q'; el.dataset.m = p.m;
        if (p.lor) el.dataset.lor = '1';
        var lines = ''; for (var i = 0; i < p.lines; i++) lines += '<div class="ln"></div>';
        var msHtml = p.lor
          ? '<ul>' + p.ms.map(function(s){ return '<li>' + s + '</li>'; }).join('') + '</ul>' +
            '<label style="margin-top:6px">Your level mark: <select class="lor-mark">' + [0,1,2,3,4,5,6].map(function(v){ return '<option>' + v + '</option>'; }).join('') + '</select></label>'
          : '<ul>' + p.ms.map(function(s){ return s === 'Any two' ? '<li class="ms-note">Any two points for 2 marks.</li>' : '<li><label><input type="checkbox"> <span>' + s + ' (1)</span></label></li>'; }).join('') + '</ul>';
        el.innerHTML =
          '<div class="q-head"><span class="q-num">' + p.n + '</span><div class="q-stem"><p>' + (p.ht ? '<span class="tag ht">HT</span> ' : '') + p.q + '</p></div><span class="q-marks">[' + p.m + ' mark' + (p.m > 1 ? 's' : '') + ']</span></div>' +
          '<textarea aria-label="Your answer to ' + p.n + '" rows="' + Math.min(6, p.lines + 1) + '"></textarea>' +
          '<div class="q-lines">' + lines + '</div><div class="q-typed"></div>' +
          '<details class="ms"><summary>Mark scheme<span class="q-got"></span></summary>' + msHtml + '</details>';
        wrap.appendChild(el);
        ms.push('<div class="ms-q"><h4>' + p.n + ' [' + p.m + ']</h4><ul>' + p.ms.map(function(s){ return '<li>' + (s === 'Any two' ? '<i>Any two points, 1 mark each.</i>' : s) + '</li>'; }).join('') + '</ul></div>');
      });
      examList.appendChild(wrap);
    });
    document.getElementById('msPrintList').innerHTML = ms.join('');
    examList.addEventListener('change', examUpd);
    examUpd();
  }
  buildExam();
  document.getElementById('openAll').addEventListener('click', function(){
    var all = examList.querySelectorAll('details.ms'), open = Array.prototype.some.call(all, function(d){ return !d.open; });
    all.forEach(function(d){ d.open = open; });
    this.textContent = open ? 'Close all mark schemes' : 'Open all mark schemes';
  });
  document.getElementById('resetExam').addEventListener('click', function(){
    examList.querySelectorAll('textarea').forEach(function(t){ t.value = ''; });
    examList.querySelectorAll('input[type=checkbox]').forEach(function(c){ c.checked = false; });
    examList.querySelectorAll('select.lor-mark').forEach(function(s){ s.value = '0'; });
    examUpd();
  });

  /* ── Presenter mode ──────────────────────────────────────────────── */
  var pres = document.getElementById('presenter'), slides = pres.querySelectorAll('.pslide');
  var pDots = document.getElementById('pDots'), cur = 0, borrowed = [], wentFs = false, opener = null;
  slides.forEach(function(s, i){
    var d = document.createElement('button'); d.type = 'button'; d.className = 'p-dot';
    d.setAttribute('aria-label', 'Slide ' + (i + 1) + ': ' + s.dataset.title);
    d.addEventListener('click', function(){ go(i); });
    pDots.appendChild(d);
  });
  function go(i){
    cur = Math.max(0, Math.min(slides.length - 1, i));
    slides.forEach(function(s, k){ s.classList.toggle('on', k === cur); });
    pDots.querySelectorAll('.p-dot').forEach(function(d, k){ d.classList.toggle('on', k === cur); if (k === cur) d.setAttribute('aria-current', 'step'); else d.removeAttribute('aria-current'); });
    document.getElementById('pCount').textContent = (cur + 1) + ' / ' + slides.length;
    document.getElementById('pTitle').textContent = 'Measuring Gas in Reactions · ' + slides[cur].dataset.title;
    document.getElementById('pPrev').disabled = cur === 0;
    document.getElementById('pNext').disabled = cur === slides.length - 1;
    document.getElementById('pStage').scrollTop = 0;
    sims.forEach(function(s){ s.dirty = true; });
  }
  // The slides reuse the live page elements (simulators, table, quiz), moved in
  // while presenting and put back afterwards, so state carries across.
  function borrow(){
    pres.querySelectorAll('[data-borrow]').forEach(function(slot){
      var el = document.getElementById(slot.dataset.borrow);
      if (!el) return;
      var mark = document.createComment('presenter:' + el.id);
      el.parentNode.replaceChild(mark, el); slot.appendChild(el);
      borrowed.push([el, mark]);
    });
  }
  function giveBack(){
    borrowed.forEach(function(p){ p[1].parentNode.replaceChild(p[0], p[1]); });
    borrowed = [];
  }
  function openPresenter(){
    if (!pres.hidden) return;
    opener = document.activeElement;
    borrow(); pres.hidden = false; document.body.classList.add('presenting');
    go(cur);
    wentFs = false;
    if (pres.requestFullscreen){
      pres.requestFullscreen().then(function(){ wentFs = true; }).catch(function(){});
    }
    document.getElementById('pNext').focus();
  }
  function closePresenter(){
    if (pres.hidden) return;
    pres.hidden = true; document.body.classList.remove('presenting');
    giveBack();
    if (document.fullscreenElement) document.exitFullscreen().catch(function(){});
    sims.forEach(function(s){ s.dirty = true; });
    if (opener && opener.focus) opener.focus();
  }
  document.getElementById('presentBtn').addEventListener('click', openPresenter);
  document.getElementById('pExit').addEventListener('click', closePresenter);
  document.getElementById('pPrev').addEventListener('click', function(){ go(cur - 1); });
  document.getElementById('pNext').addEventListener('click', function(){ go(cur + 1); });
  document.addEventListener('fullscreenchange', function(){
    // Esc in full screen is taken by the browser; leaving full screen ends the show.
    if (!document.fullscreenElement && wentFs && !pres.hidden) closePresenter();
  });
  document.addEventListener('keydown', function(e){
    if (pres.hidden) return;
    var tg = e.target, tag = tg && tg.tagName;
    if (e.key === 'Escape'){ e.preventDefault(); closePresenter(); return; }
    if (tag === 'TEXTAREA' || tag === 'SELECT') return;
    var isRange = tag === 'INPUT' && tg.type === 'range', isBox = tag === 'INPUT' && tg.type === 'checkbox';
    if ((e.key === 'ArrowRight' && !isRange) || e.key === 'PageDown' || (e.key === ' ' && !isBox)){ e.preventDefault(); go(cur + 1); }
    else if ((e.key === 'ArrowLeft' && !isRange) || e.key === 'PageUp'){ e.preventDefault(); go(cur - 1); }
    else if (e.key === 'Home'){ e.preventDefault(); go(0); }
    else if (e.key === 'End'){ e.preventDefault(); go(slides.length - 1); }
  });
  // Swipe between slides on a tablet or touch whiteboard.
  var sx = null;
  pres.addEventListener('touchstart', function(e){ sx = e.target.closest('canvas,input,select,.sim-ctrl,.tablewrap') ? null : e.touches[0].clientX; }, { passive:true });
  pres.addEventListener('touchend', function(e){
    if (sx === null) return;
    var dx = e.changedTouches[0].clientX - sx; sx = null;
    if (Math.abs(dx) > 70) go(cur + (dx < 0 ? 1 : -1));
  });

  /* ── PDF downloads (browser print, A4) ───────────────────────────── */
  var dlg = document.getElementById('printDlg'), mode = 'notes';
  function askPrint(which){
    mode = which;
    document.getElementById('optNotes').hidden = which !== 'notes';
    document.getElementById('optExam').hidden = which !== 'exam';
    document.getElementById('printDlgTitle').textContent = which === 'notes' ? 'Revision worksheet & notes' : 'Exam questions & mark scheme';
    if (dlg.showModal) dlg.showModal(); else doPrint();
  }
  function doPrint(){
    closePresenter();
    var b = document.body, title = document.title;
    b.classList.toggle('print-exam', mode === 'exam');
    b.classList.toggle('print-ms', mode === 'exam' && document.getElementById('pMs').checked);
    b.classList.toggle('print-ws-ans', mode === 'notes' && document.getElementById('pWsAns').checked);
    examList.querySelectorAll('.q').forEach(function(q){
      var v = q.querySelector('textarea').value.trim();
      q.classList.toggle('has-typed', !!v); q.querySelector('.q-typed').textContent = v;
    });
    // The browser names the PDF after the page title.
    document.title = mode === 'exam' ? 'Measuring gas - exam questions and mark scheme' : 'Measuring gas - revision notes and worksheet';
    function done(){ document.title = title; b.classList.remove('print-exam', 'print-ms', 'print-ws-ans'); window.removeEventListener('afterprint', done); }
    window.addEventListener('afterprint', done);
    setTimeout(function(){ window.print(); }, 60);
  }
  document.getElementById('pdfNotes').addEventListener('click', function(){ askPrint('notes'); });
  document.getElementById('pdfExam').addEventListener('click', function(){ askPrint('exam'); });
  dlg.addEventListener('close', function(){ if (dlg.returnValue === 'print') doPrint(); });
})();
