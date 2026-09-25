/* Mass vs Weight across the Solar System — calculator, spring balance, jump
   and drop simulator, planet cards, worked examples, quiz and presenter mode.
   No dependencies. Canvas colours are hex (see CLAUDE.md). */
(function(){
  'use strict';

  /* ── Data ────────────────────────────────────────────────────────── */
  var G_EARTH = 9.8;
  // Surface gravity in N/kg (cloud tops for the gas and ice giants).
  var BODIES = [
    { id:'sun', name:'Sun', on:'at the Sun’s surface', type:'Star', g:274, col:'#f6b73c', ground:'#f0a02c', sky:'#1a1206', surface:'Visible surface (plasma)',
      fact:'You could never stand here: it is about 5,500 °C. Its pull is 28 times Earth’s, so a spring balance would be stretched far past its limit.' },
    { id:'mercury', name:'Mercury', on:'on Mercury', type:'Rocky planet', g:3.7, col:'#9c948c', ground:'#7d766f', sky:'#050e1a',
      fact:'The smallest planet. Its g matches Mars even though Mars is bigger, because Mercury has a huge iron core.' },
    { id:'venus', name:'Venus', on:'on Venus', type:'Rocky planet', g:8.9, col:'#e3c07a', ground:'#b98f4a', sky:'#3a2c1a',
      fact:'Gravity almost like Earth’s, but the thick air pushes 90 times harder than ours and it is hot enough to melt lead.' },
    { id:'earth', name:'Earth', on:'on Earth', type:'Rocky planet (home)', g:9.8, col:'#3b82c4', ground:'#4f8f4a', sky:'#0f2a45',
      fact:'Every kilogram is pulled down with 9.8 N. Many KS3 questions round this to 10 N/kg.' },
    { id:'moon', name:'Moon', on:'on the Moon', type:'Earth’s moon', g:1.6, col:'#b8bcc2', ground:'#9aa0a8', sky:'#050e1a',
      fact:'About one sixth of Earth’s gravity. Apollo astronauts found it easier to hop like kangaroos than to walk.' },
    { id:'mars', name:'Mars', on:'on Mars', type:'Rocky planet', g:3.7, col:'#c8603a', ground:'#b0522f', sky:'#3b2420',
      fact:'About three eighths of Earth’s gravity. Rovers here weigh far less than they did on the launch pad, but keep all their mass.' },
    { id:'jupiter', name:'Jupiter', on:'on Jupiter', type:'Gas giant', g:24.8, col:'#d6a878', ground:'#c9956a', sky:'#1b140e', surface:'Cloud tops (no solid surface)', bands:['#b07a52','#e8cfae'],
      fact:'The biggest planet, with the strongest pull of any planet. There is no solid surface: g is measured at the cloud tops.' },
    { id:'saturn', name:'Saturn', on:'on Saturn', type:'Gas giant', g:10.4, col:'#e2c98a', ground:'#cfb477', sky:'#17140b', surface:'Cloud tops (no solid surface)', ring:'#b7a06a', bands:['#c9ae6c'],
      fact:'Saturn is 95 times Earth’s mass, yet g at its cloud tops is only a little more than ours because it is so wide.' },
    { id:'uranus', name:'Uranus', on:'on Uranus', type:'Ice giant', g:8.7, col:'#8fd3dc', ground:'#7fc2cb', sky:'#0b1a1d', surface:'Cloud tops (no solid surface)',
      fact:'An ice giant that spins on its side. Its g is a little less than Earth’s.' },
    { id:'neptune', name:'Neptune', on:'on Neptune', type:'Ice giant', g:11.2, col:'#4a6fd8', ground:'#4262c0', sky:'#070d22', surface:'Cloud tops (no solid surface)',
      fact:'The windiest planet, with storms faster than 2,000 km/h. g is a bit more than Earth’s.' },
    { id:'pluto', name:'Pluto', on:'on Pluto', type:'Dwarf planet', g:0.6, col:'#c9b39a', ground:'#d8cbb8', sky:'#050e1a',
      fact:'A dwarf planet since 2006. You would weigh about one sixteenth of your Earth weight.' }
  ];
  var byId = {}; BODIES.forEach(function(b){ byId[b.id] = b; });

  var PRESETS = [
    { label:'Bag of sugar', m:1 },
    { label:'Cat', m:4 },
    { label:'A KS3 student', m:45 },
    { label:'An astronaut', m:80 },
    { label:'An elephant', m:6000 },
    { label:'A school bus', m:12000 }
  ];

  var state = { m:45, body:'earth' };

  /* ── Helpers ─────────────────────────────────────────────────────── */
  function $(id){ return document.getElementById(id); }
  function fmt(n){
    var a = Math.abs(n), d = a >= 100 ? 0 : a >= 10 ? 1 : 2;
    return Number(n.toFixed(d)).toLocaleString('en-GB', { maximumFractionDigits:d });
  }
  function fmtG(g){ return g.toLocaleString('en-GB'); }
  function weight(b){ return state.m * b.g; }
  function relText(b){
    if (b.id === 'earth') return 'same as on Earth';
    var r = b.g / G_EARTH;
    if (r >= 1) return (r >= 10 ? Math.round(r) : r.toFixed(1)) + ' × your Earth weight';
    return Math.round(r * 100) + '% of your Earth weight';
  }
  function niceCeil(v){
    var p = Math.pow(10, Math.floor(Math.log10(v))), n = v / p;
    return (n <= 1 ? 1 : n <= 1.5 ? 1.5 : n <= 2 ? 2 : n <= 3 ? 3 : n <= 5 ? 5 : 10) * p;
  }
  function esc(s){ return String(s).replace(/[&<>"]/g, function(c){ return { '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;' }[c]; }); }

  // Flat SVG planet: disc, optional bands, ring, craters or continents.
  function planetSVG(b){
    var s = '<svg viewBox="-50 -50 100 100" aria-hidden="true">';
    if (b.ring) s += '<ellipse rx="47" ry="11" fill="none" stroke="' + b.ring + '" stroke-width="5" transform="rotate(-18)"/>';
    var r = b.id === 'sun' ? 40 : b.id === 'pluto' || b.id === 'moon' || b.id === 'mercury' ? 26 : b.ring ? 30 : 34;
    s += '<circle r="' + r + '" fill="' + b.col + '"/>';
    if (b.bands){
      var ys = b.id === 'jupiter' ? [-16, -4, 9, 20] : [-10, 6];
      ys.forEach(function(y, i){
        var w = Math.sqrt(Math.max(0, r*r - y*y));
        s += '<rect x="' + (-w) + '" y="' + (y - 2.5) + '" width="' + (2*w) + '" height="5" rx="2.5" fill="' + b.bands[i % b.bands.length] + '"/>';
      });
      if (b.id === 'jupiter') s += '<ellipse cx="10" cy="12" rx="6" ry="3.6" fill="#c0563a"/>';
    }
    if (b.ring) s += '<path d="M-44.7 14.5 A47 11 -18 0 0 44.7 -14.5" transform="rotate(0)" fill="none" stroke="' + b.ring + '" stroke-width="5"/>';
    if (b.id === 'earth') s += '<path d="M-18 -18c8 4 10 12 2 18s-3 14 8 16M12 -26c-6 9 3 15 12 18M16 8c6 2 8 8 4 14" fill="none" stroke="#5fae6e" stroke-width="7" stroke-linecap="round"/>';
    if (b.id === 'moon' || b.id === 'mercury'){
      var cr = b.id === 'moon' ? '#9aa0a8' : '#80786f';
      s += '<circle cx="-8" cy="-9" r="5" fill="' + cr + '"/><circle cx="9" cy="6" r="4" fill="' + cr + '"/><circle cx="-6" cy="12" r="2.6" fill="' + cr + '"/>';
    }
    if (b.id === 'mars') s += '<ellipse cx="0" cy="-30" rx="10" ry="3" fill="#edf2f8"/><path d="M-20 4c8-3 18 2 28-2" stroke="#9a4428" stroke-width="4" fill="none" stroke-linecap="round"/>';
    if (b.id === 'venus') s += '<path d="M-26 -8c14-6 30 4 50-4M-24 10c14-4 26 4 46-2" stroke="#c9a262" stroke-width="4" fill="none" stroke-linecap="round"/>';
    if (b.id === 'neptune') s += '<ellipse cx="-8" cy="6" rx="7" ry="4" fill="#2c4696"/>';
    if (b.id === 'pluto') s += '<path d="M-4 2c6-8 16-6 18 2s-6 14-12 10-10-6-6-12z" fill="#ece3d4"/>';
    if (b.id === 'sun') s += '<circle cx="-12" cy="-8" r="4" fill="#e08c1e"/><circle cx="14" cy="10" r="3" fill="#e08c1e"/>';
    return s + '</svg>';
  }

  /* ── Explorer controls ───────────────────────────────────────────── */
  var LOG_MIN = 0, LOG_MAX = Math.log10(20000);
  var massRange = $('massRange'), massNum = $('massNum');
  function rangeToMass(v){
    var m = Math.pow(10, LOG_MIN + (LOG_MAX - LOG_MIN) * v / 1000);
    return m < 10 ? Math.round(m * 10) / 10 : m < 1000 ? Math.round(m) : Math.round(m / 10) * 10;
  }
  function massToRange(m){
    return Math.round(1000 * (Math.log10(Math.max(1, Math.min(20000, m))) - LOG_MIN) / (LOG_MAX - LOG_MIN));
  }

  var presetsEl = $('presets');
  PRESETS.forEach(function(p){
    var b = document.createElement('button');
    b.type = 'button'; b.className = 'preset'; b.dataset.m = p.m;
    b.innerHTML = esc(p.label) + ' · <b>' + p.m.toLocaleString('en-GB') + ' kg</b>';
    b.addEventListener('click', function(){ setMass(p.m, true); });
    presetsEl.appendChild(b);
  });

  var bodiesEl = $('bodies');
  BODIES.forEach(function(b){
    var el = document.createElement('button');
    el.type = 'button'; el.className = 'body-b'; el.dataset.id = b.id;
    el.setAttribute('role', 'radio');
    el.innerHTML = planetSVG(b) + '<span>' + b.name + '</span><span class="bg">' + fmtG(b.g) + '</span>';
    el.setAttribute('aria-label', b.name + ', g = ' + fmtG(b.g) + ' newtons per kilogram');
    el.addEventListener('click', function(){ setBody(b.id); });
    bodiesEl.appendChild(el);
  });
  // Arrow keys move round the radio group.
  bodiesEl.addEventListener('keydown', function(e){
    var k = e.key, i = BODIES.findIndex(function(b){ return b.id === state.body; });
    if (k !== 'ArrowRight' && k !== 'ArrowLeft' && k !== 'ArrowDown' && k !== 'ArrowUp') return;
    e.preventDefault(); e.stopPropagation();
    i = (i + (k === 'ArrowRight' || k === 'ArrowDown' ? 1 : -1) + BODIES.length) % BODIES.length;
    setBody(BODIES[i].id);
    bodiesEl.querySelector('[data-id="' + BODIES[i].id + '"]').focus();
  });

  massRange.addEventListener('input', function(){ setMass(rangeToMass(+massRange.value), false); });
  massNum.addEventListener('input', function(){
    var v = parseFloat(massNum.value);
    if (!(v > 0)) return;
    setMass(Math.min(v, 1e6), false, true);
  });
  massNum.addEventListener('change', function(){ massNum.value = state.m; });

  function setMass(m, fromPreset, fromNum){
    state.m = m;
    if (!fromNum) massNum.value = m;
    massRange.value = massToRange(m);
    render(true);
  }
  function setBody(id){
    if (state.body === id) return;
    state.body = id;
    render(true);
    spring.kick();
    jump.reset();
  }

  /* ── Render text outputs, cards and bars ─────────────────────────── */
  var cardsEl = $('cards'), barsEl = $('bars');
  BODIES.forEach(function(b){
    var c = document.createElement('button');
    c.type = 'button'; c.className = 'pcard'; c.dataset.id = b.id;
    c.innerHTML = '<div class="pcard-top">' + planetSVG(b) + '<div><h3>' + b.name + '</h3><div class="pc-type">' + b.type + '</div></div></div>' +
      '<dl><dt>g</dt><dd class="g">' + fmtG(b.g) + ' N/kg</dd><dt>Weight</dt><dd class="w"></dd><dt>vs Earth</dt><dd class="r"></dd></dl>' +
      '<p>' + b.fact + '</p>';
    c.addEventListener('click', function(){
      setBody(b.id);
      $('explore').scrollIntoView({ behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' });
    });
    cardsEl.appendChild(c);

    var l = document.createElement('div'); l.className = 'bar-l'; l.textContent = b.name; l.dataset.id = b.id;
    var t = document.createElement('div'); t.className = 'bar-track'; t.dataset.id = b.id;
    t.innerHTML = '<div class="bar"></div>' + (b.id === 'sun' ? '<span class="bar-break" aria-hidden="true"></span>' : '') + '<span class="bar-v"></span>';
    t.addEventListener('click', function(){ setBody(b.id); });
    barsEl.appendChild(l); barsEl.appendChild(t);
  });

  var lastW = null;
  function render(bump){
    var b = byId[state.body], w = weight(b), mTxt = fmt(state.m) + ' kg';
    presetsEl.querySelectorAll('.preset').forEach(function(p){ p.classList.toggle('on', +p.dataset.m === state.m); });
    bodiesEl.querySelectorAll('.body-b').forEach(function(el){
      var on = el.dataset.id === state.body;
      el.setAttribute('aria-checked', on); el.tabIndex = on ? 0 : -1;
    });
    $('resPlanetArt').innerHTML = planetSVG(b);
    $('resWhere').textContent = b.on.charAt(0).toUpperCase() + b.on.slice(1);
    $('resG').textContent = fmtG(b.g);
    $('calc').innerHTML = '<span class="v-w">W</span> <span class="op">=</span> <span class="v-m">m</span> <span class="op">×</span> <span class="v-g">g</span><br>' +
      '<span class="v-w">W</span> <span class="op">=</span> <span class="v-m">' + fmt(state.m) + ' kg</span> <span class="op">×</span> <span class="v-g">' + fmtG(b.g) + ' N/kg</span><br>' +
      '<span class="v-w">W</span> <span class="op">=</span> <span class="v-w">' + fmt(w) + ' N</span>';
    $('resMass').textContent = mTxt;
    var wEl = $('resWeight');
    wEl.textContent = fmt(w) + ' N';
    if (bump && lastW !== null && lastW !== w){ wEl.classList.remove('bump'); void wEl.offsetWidth; wEl.classList.add('bump'); }
    lastW = w;
    $('resRel').textContent = relText(b);
    $('resFact').textContent = b.fact;
    $('resScales').textContent = b.id === 'earth'
      ? 'Bathroom scales read ' + fmt(state.m) + ' kg here because they are set up for Earth’s g.'
      : 'Bathroom scales set up for Earth would read ' + fmt(w / G_EARTH) + ' kg here, yet the mass is still ' + mTxt + '. Scales really measure weight.';

    $('cardsMass').textContent = mTxt; $('chartMass').textContent = mTxt;
    cardsEl.querySelectorAll('.pcard').forEach(function(c){
      var cb = byId[c.dataset.id];
      c.classList.toggle('on', cb.id === state.body);
      c.querySelector('.w').textContent = fmt(weight(cb)) + ' N';
      c.querySelector('.r').textContent = cb.id === 'earth' ? '1 ×' : (cb.g / G_EARTH).toFixed(2) + ' ×';
    });
    var max = weight(byId.jupiter) * 1.1;
    barsEl.querySelectorAll('.bar-track').forEach(function(t){
      var tb = byId[t.dataset.id], tw = weight(tb), on = tb.id === state.body;
      t.querySelector('.bar').style.width = Math.min(100, tw / max * 100) * 0.78 + '%';
      t.querySelector('.bar').classList.toggle('on', on);
      t.querySelector('.bar-v').textContent = fmt(tw) + ' N';
      t.classList.toggle('on', on);
      t.title = tb.name + ': ' + fmt(state.m) + ' kg × ' + fmtG(tb.g) + ' N/kg = ' + fmt(tw) + ' N';
    });
    barsEl.querySelectorAll('.bar-l').forEach(function(l){ l.classList.toggle('on', l.dataset.id === state.body); });

    spring.update(); jump.update();
  }

  /* ── Canvas plumbing ─────────────────────────────────────────────── */
  var W0 = 600, H0 = 440;
  function setupCanvas(cv){
    var o = { cv:cv, ctx:cv.getContext('2d'), dirty:true };
    function size(){
      var r = cv.getBoundingClientRect(); if (!r.width) return;
      var dpr = Math.min(2, window.devicePixelRatio || 1);
      cv.width = Math.round(r.width * dpr); cv.height = Math.round(r.width * H0 / W0 * dpr);
      o.k = cv.width / W0; o.dirty = true;
    }
    if (window.ResizeObserver) new ResizeObserver(size).observe(cv); else window.addEventListener('resize', size);
    size();
    return o;
  }
  var STARS = [];
  (function(){ var s = 7; function rnd(){ s = (s * 16807) % 2147483647; return s / 2147483647; }
    for (var i = 0; i < 70; i++) STARS.push([rnd() * W0, rnd() * H0, rnd() < 0.2 ? 1.4 : 0.8, rnd() < 0.5 ? '#8693a5' : '#edf2f8']); })();
  function stars(ctx, maxY){
    STARS.forEach(function(s){ if (s[1] < maxY){ ctx.fillStyle = s[3]; ctx.beginPath(); ctx.arc(s[0], s[1], s[2], 0, 7); ctx.fill(); } });
  }
  function arrow(ctx, x, y1, y2, col, w){
    var dir = y2 > y1 ? 1 : -1, hl = Math.min(12, Math.abs(y2 - y1) * 0.6);
    ctx.strokeStyle = col; ctx.fillStyle = col; ctx.lineWidth = w;
    ctx.beginPath(); ctx.moveTo(x, y1); ctx.lineTo(x, y2 - dir * hl); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(x, y2); ctx.lineTo(x - 7, y2 - dir * hl); ctx.lineTo(x + 7, y2 - dir * hl); ctx.closePath(); ctx.fill();
  }
  function rr(ctx, x, y, w, h, r){ ctx.beginPath(); ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r); ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath(); }
  var FONT = getComputedStyle(document.documentElement).getPropertyValue('--sst-font') || 'sans-serif';
  var MONO = getComputedStyle(document.documentElement).getPropertyValue('--sst-mono') || 'monospace';

  /* ── Spring balance ──────────────────────────────────────────────── */
  var spring = (function(){
    var c = setupCanvas($('springCv'));
    var TOP = 64, L0 = 64, MAXEXT = 160, CX = 250;
    var x = 0, v = 0, target = 0, full = 1000, over = false;
    function update(){
      var b = byId[state.body];
      full = niceCeil(state.m * G_EARTH * 2.6);   // Jupiter fits; the Sun never does
      var w = weight(b);
      over = w > full;
      target = Math.min(w / full, 1.06);
      $('springRange').textContent = 'Scale 0–' + full.toLocaleString('en-GB') + ' N';
      c.dirty = true;
    }
    function kick(){ v -= 0.6; }
    function step(dt){
      if (Math.abs(x - target) < 1e-4 && Math.abs(v) < 1e-4){ if (x !== target){ x = target; c.dirty = true; } return; }
      var a = -140 * (x - target) - 7 * v;
      v += a * dt; x += v * dt; c.dirty = true;
    }
    function draw(){
      var ctx = c.ctx, b = byId[state.body], w = weight(b);
      ctx.setTransform(c.k, 0, 0, c.k, 0, 0);
      ctx.fillStyle = '#050e1a'; ctx.fillRect(0, 0, W0, H0);
      stars(ctx, H0);
      // Stand
      ctx.fillStyle = '#182535'; ctx.fillRect(CX - 110, TOP - 22, 220, 12);
      ctx.fillStyle = '#8693a5'; ctx.fillRect(CX - 3, TOP - 10, 6, 10);
      // Scale
      var y0 = TOP + L0, sx = CX + 70;
      ctx.fillStyle = '#091321'; ctx.strokeStyle = '#182535'; ctx.lineWidth = 1;
      rr(ctx, sx - 6, y0 - 16, 96, MAXEXT + 32, 8); ctx.fill(); ctx.stroke();
      ctx.font = '600 11px ' + MONO; ctx.textBaseline = 'middle'; ctx.textAlign = 'left';
      for (var i = 0; i <= 20; i++){
        var ty = y0 + MAXEXT * i / 20, big = i % 4 === 0;
        ctx.strokeStyle = big ? '#8693a5' : '#2a3a4e'; ctx.lineWidth = big ? 1.5 : 1;
        ctx.beginPath(); ctx.moveTo(sx, ty); ctx.lineTo(sx + (big ? 16 : 9), ty); ctx.stroke();
        if (big){ ctx.fillStyle = '#8693a5'; ctx.fillText(fmt(full * i / 20), sx + 22, ty); }
      }
      ctx.fillStyle = '#edf2f8'; ctx.font = '700 12px ' + FONT; ctx.fillText('newtons (N)', sx - 4, y0 - 30);
      // Spring
      var ext = Math.max(-0.1, x) * MAXEXT, yEnd = TOP + L0 + ext, coils = 14;
      ctx.strokeStyle = over ? '#f0655a' : '#c7d1de'; ctx.lineWidth = 2.5; ctx.lineJoin = 'round';
      ctx.beginPath(); ctx.moveTo(CX, TOP); ctx.lineTo(CX, TOP + 8);
      var sy0 = TOP + 8, sy1 = yEnd - 8;
      for (var k = 0; k <= coils * 2; k++){
        var yy = sy0 + (sy1 - sy0) * k / (coils * 2);
        ctx.lineTo(CX + (k === 0 || k === coils * 2 ? 0 : (k % 2 ? 18 : -18)), yy);
      }
      ctx.lineTo(CX, yEnd); ctx.stroke();
      // Pointer
      ctx.strokeStyle = over ? '#f0655a' : '#47b5fa'; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(CX, yEnd); ctx.lineTo(sx - 2, yEnd); ctx.stroke();
      ctx.fillStyle = ctx.strokeStyle; ctx.beginPath(); ctx.moveTo(sx + 2, yEnd); ctx.lineTo(sx - 8, yEnd - 5); ctx.lineTo(sx - 8, yEnd + 5); ctx.fill();
      // Hook and mass block (the block never changes: mass is the same)
      ctx.strokeStyle = '#8693a5'; ctx.lineWidth = 2.5;
      ctx.beginPath(); ctx.moveTo(CX, yEnd); ctx.lineTo(CX, yEnd + 12); ctx.arc(CX - 6, yEnd + 12, 6, 0, Math.PI); ctx.stroke();
      var by = yEnd + 16, bw = 96, bh = 58;
      ctx.fillStyle = '#f0b44c'; rr(ctx, CX - bw / 2, by, bw, bh, 8); ctx.fill();
      ctx.fillStyle = '#1f1606'; ctx.textAlign = 'center';
      ctx.font = '800 17px ' + FONT; ctx.fillText(fmt(state.m) + ' kg', CX, by + 24);
      ctx.font = '600 10px ' + FONT; ctx.fillText('MASS', CX, by + 43);
      // Weight arrow, length follows W
      var al = Math.min(18 + 60 * Math.min(1.2, w / full), H0 - 10 - (by + bh + 4));
      arrow(ctx, CX, by + bh + 4, by + bh + 4 + al, '#47b5fa', 4);
      ctx.fillStyle = '#47b5fa'; ctx.textAlign = 'right'; ctx.font = '700 13px ' + FONT;
      ctx.fillText('W = ' + fmt(w) + ' N', CX - 14, by + bh + 4 + al / 2 + 4);
      // Labels
      ctx.textAlign = 'left'; ctx.fillStyle = '#edf2f8'; ctx.font = '700 16px ' + FONT;
      ctx.fillText(b.name, 16, 22);
      ctx.fillStyle = '#7ddc9c'; ctx.font = '600 13px ' + MONO; ctx.fillText('g = ' + fmtG(b.g) + ' N/kg', 16, 42);
      ctx.textAlign = 'right'; ctx.fillStyle = '#8693a5'; ctx.font = '600 11px ' + FONT; ctx.fillText('READING', W0 - 16, 20);
      ctx.fillStyle = over ? '#f0655a' : '#edf2f8'; ctx.font = '800 24px ' + FONT;
      ctx.fillText(over ? 'OVER RANGE' : fmt(w) + ' N', W0 - 16, 44);
      if (over){
        ctx.fillStyle = '#f0655a'; ctx.font = '600 12px ' + FONT;
        ctx.fillText('Weight ' + fmt(w) + ' N: the spring is', W0 - 16, 66);
        ctx.fillText('stretched past its limit!', W0 - 16, 82);
      }
    }
    return { c:c, update:update, kick:kick, step:step, draw:draw, settle:function(){ x = target; v = 0; } };
  })();

  /* ── Jump & drop ─────────────────────────────────────────────────── */
  var jump = (function(){
    var c = setupCanvas($('jumpCv'));
    var H_EARTH = 0.5, V0 = Math.sqrt(2 * G_EARTH * H_EARTH), DROP_H = 2;
    var GROUND = 392, TOPPAD = 40, AX = 250, HX = 460;
    var mode = null, t = 0, y = 0, hy = DROP_H, done = { jump:false, drop:false }, peak = 0, landT = 0;
    var view = 3.2;
    function hJump(b){ return V0 * V0 / (2 * b.g); }
    function targetView(){ var b = byId[state.body]; return Math.max(3.2, hJump(b) + 2.4); }
    function reset(){ mode = null; t = 0; y = 0; hy = DROP_H; done = { jump:false, drop:false }; c.dirty = true; }
    function start(m){ reset(); mode = m; }
    function update(){
      var b = byId[state.body], hj = hJump(b), air = 2 * V0 / b.g, fall = Math.sqrt(2 * DROP_H / b.g);
      var hE = H_EARTH, fE = Math.sqrt(2 * DROP_H / G_EARTH);
      $('jumpRead').innerHTML =
        '<span>Jump height: <b>' + (hj < 0.1 ? (hj * 100).toFixed(1) + ' cm' : hj.toFixed(2) + ' m') + '</b> <span class="muted">(Earth ' + hE.toFixed(2) + ' m)</span></span>' +
        '<span>Time in the air: <b>' + air.toFixed(2) + ' s</b></span>' +
        '<span>Hammer falls 2 m in: <b>' + fall.toFixed(2) + ' s</b> <span class="muted">(Earth ' + fE.toFixed(2) + ' s)</span></span>' +
        '<span class="muted">Same leg push as a 0.5 m jump on Earth.</span>';
      c.dirty = true;
    }
    function step(dt){
      var tv = targetView();
      if (Math.abs(view - tv) > 0.001){ view += (tv - view) * Math.min(1, dt * 4); c.dirty = true; }
      if (!mode) return;
      var b = byId[state.body];
      t += dt; c.dirty = true;
      if (mode === 'jump'){
        y = V0 * t - 0.5 * b.g * t * t;
        if (y <= 0 && t > 0.01){ y = 0; landT = 2 * V0 / b.g; mode = null; done.jump = true; }
      } else {
        hy = DROP_H - 0.5 * b.g * t * t;
        if (hy <= 0){ hy = 0; landT = Math.sqrt(2 * DROP_H / b.g); mode = null; done.drop = true; }
      }
    }
    function astronaut(ctx, x, feet, s){
      // Drawn in metres: 1.8 m tall.
      ctx.save(); ctx.translate(x, feet); ctx.scale(s, s);
      var leg = mode === 'jump' && y > 0.02 ? 0.06 : 0;
      ctx.fillStyle = '#d7dee8';
      rr(ctx, -0.2, -0.78 + leg, 0.16, 0.78 - leg, 0.07); ctx.fill();
      rr(ctx, 0.04, -0.78 + leg, 0.16, 0.78 - leg, 0.07); ctx.fill();
      ctx.fillStyle = '#edf2f8'; rr(ctx, -0.26, -1.4, 0.52, 0.7, 0.16); ctx.fill();
      ctx.fillStyle = '#d7dee8';
      var arm = mode === 'jump' ? -0.25 : 0;
      rr(ctx, -0.38, -1.36 + arm, 0.13, 0.55, 0.06); ctx.fill();
      rr(ctx, 0.25, -1.36 + arm, 0.13, 0.55, 0.06); ctx.fill();
      ctx.fillStyle = '#b199f4'; rr(ctx, -0.1, -1.2, 0.2, 0.14, 0.03); ctx.fill();
      ctx.fillStyle = '#edf2f8'; ctx.beginPath(); ctx.arc(0, -1.6, 0.24, 0, 7); ctx.fill();
      ctx.fillStyle = '#182535'; rr(ctx, -0.17, -1.72, 0.34, 0.2, 0.09); ctx.fill();
      ctx.restore();
    }
    function hammer(ctx, x, yPx, s){
      ctx.save(); ctx.translate(x, yPx); ctx.scale(s, s);
      ctx.fillStyle = '#a5763f'; ctx.fillRect(-0.025, -0.3, 0.05, 0.3);
      ctx.fillStyle = '#8693a5'; rr(ctx, -0.12, -0.36, 0.24, 0.09, 0.02); ctx.fill();
      ctx.restore();
    }
    function draw(){
      var ctx = c.ctx, b = byId[state.body], s = (GROUND - TOPPAD) / view;
      ctx.setTransform(c.k, 0, 0, c.k, 0, 0);
      ctx.fillStyle = b.sky; ctx.fillRect(0, 0, W0, H0);
      if (b.sky === '#050e1a' || b.id === 'jupiter' || b.id === 'saturn' || b.id === 'uranus' || b.id === 'neptune') stars(ctx, GROUND);
      // Ground
      ctx.fillStyle = b.ground; ctx.fillRect(0, GROUND, W0, H0 - GROUND);
      if (b.surface){
        ctx.fillStyle = b.bands ? b.bands[0] : b.col;
        for (var i = 0; i < 12; i++){ ctx.beginPath(); ctx.arc(i * 56 + 20, GROUND + 3, 22, Math.PI, 0); ctx.fill(); }
        ctx.fillStyle = '#050e1a'; ctx.globalAlpha = 0.7; ctx.fillRect(0, GROUND + 14, W0, 30); ctx.globalAlpha = 1;
        ctx.fillStyle = '#edf2f8'; ctx.font = '600 12px ' + FONT; ctx.textAlign = 'center';
        ctx.fillText(b.surface + (b.id === 'sun' ? ': you would be vaporised!' : ': imagine a floating platform'), W0 / 2, GROUND + 32);
      } else if (b.id === 'moon' || b.id === 'mercury' || b.id === 'pluto' || b.id === 'mars'){
        ctx.fillStyle = 'rgba(5,14,26,0.18)';
        [[80, 410, 18], [380, 420, 12], [540, 405, 10]].forEach(function(cr){ ctx.beginPath(); ctx.ellipse(cr[0], cr[1], cr[2], cr[2] * 0.35, 0, 0, 7); ctx.fill(); });
      }
      // Ruler
      var stepM = view > 12 ? 2 : view > 5 ? 1 : 0.5;
      ctx.strokeStyle = '#8693a5'; ctx.lineWidth = 1; ctx.fillStyle = '#c7d1de'; ctx.font = '600 11px ' + MONO; ctx.textAlign = 'right'; ctx.textBaseline = 'middle';
      ctx.beginPath(); ctx.moveTo(46, GROUND); ctx.lineTo(46, TOPPAD - 10); ctx.stroke();
      for (var m = 0; m <= view + 0.001; m += stepM){
        var ry = GROUND - m * s;
        ctx.beginPath(); ctx.moveTo(40, ry); ctx.lineTo(52, ry); ctx.stroke();
        ctx.fillText(m + ' m', 36, ry);
      }
      // Reference lines
      function dash(h, col, label, right){
        var ly = GROUND - h * s;
        ctx.setLineDash([6, 5]); ctx.strokeStyle = col; ctx.lineWidth = 1.5;
        ctx.beginPath(); ctx.moveTo(56, ly); ctx.lineTo(W0 - 12, ly); ctx.stroke(); ctx.setLineDash([]);
        ctx.fillStyle = col; ctx.font = '700 12px ' + FONT; ctx.textAlign = right ? 'right' : 'left'; ctx.textBaseline = 'bottom';
        ctx.fillText(label, right ? W0 - 14 : 60, ly - 3);
      }
      var hj = V0 * V0 / (2 * b.g);
      if (b.id !== 'earth') dash(H_EARTH, '#8693a5', 'Earth jump 0.5 m', false);
      if (done.jump || mode === 'jump' || b.id === 'earth') dash(hj, '#47b5fa', b.name + ' jump ' + (hj < 0.1 ? (hj * 100).toFixed(1) + ' cm' : hj.toFixed(2) + ' m'), true);
      // Figures
      astronaut(ctx, AX, GROUND - y * s, s);
      if (mode === 'drop' || done.drop || !mode){
        hammer(ctx, HX, GROUND - hy * s, s);
        if (!done.drop && mode !== 'drop'){
          ctx.fillStyle = '#8693a5'; ctx.font = '600 11px ' + FONT; ctx.textAlign = 'center'; ctx.textBaseline = 'bottom';
          ctx.fillText('hammer, 2 m up', HX, GROUND - DROP_H * s - 0.4 * s);
        }
      }
      // Labels
      ctx.textBaseline = 'alphabetic'; ctx.textAlign = 'left';
      ctx.fillStyle = '#edf2f8'; ctx.font = '700 16px ' + FONT; ctx.fillText(b.name, 70, 24);
      ctx.fillStyle = '#7ddc9c'; ctx.font = '600 13px ' + MONO; ctx.fillText('g = ' + fmtG(b.g) + ' N/kg', 70, 42);
      ctx.textAlign = 'right'; ctx.fillStyle = '#edf2f8'; ctx.font = '700 20px ' + MONO;
      if (mode) ctx.fillText('t = ' + t.toFixed(2) + ' s', W0 - 16, 30);
      else if (done.jump || done.drop) ctx.fillText((done.jump ? 'in the air ' : 'fell in ') + landT.toFixed(2) + ' s', W0 - 16, 30);
    }
    $('jumpBtn').addEventListener('click', function(){ start('jump'); });
    $('dropBtn').addEventListener('click', function(){ start('drop'); });
    return { c:c, update:update, step:step, draw:draw, reset:reset };
  })();

  /* ── Animation loop ──────────────────────────────────────────────── */
  var last = performance.now();
  function loop(now){
    var dt = Math.min(0.05, (now - last) / 1000); last = now;
    spring.step(dt); jump.step(dt);
    if (spring.c.dirty && spring.c.cv.offsetParent){ spring.draw(); spring.c.dirty = false; }
    if (jump.c.dirty && jump.c.cv.offsetParent){ jump.draw(); jump.c.dirty = false; }
    requestAnimationFrame(loop);
  }

  /* ── Worked examples ─────────────────────────────────────────────── */
  var THINGS = ['An astronaut', 'A Mars rover', 'A space probe', 'A crate of supplies', 'A robot explorer', 'A moon buggy'];
  var MASSES = [2, 5, 10, 20, 25, 40, 50, 60, 75, 80, 100, 120, 150, 200, 250, 500];
  var wType = 'W', wEx = null, wShown = 0;
  function pick(a){ return a[Math.floor(Math.random() * a.length)]; }
  function newExample(){
    var b = pick(BODIES.filter(function(x){ return x.id !== 'sun'; })), m = pick(MASSES), th = pick(THINGS);
    var w = Math.round(m * b.g * 100) / 100, W = fmt(w), G = fmtG(b.g);
    var q, steps;
    if (wType === 'W'){
      q = th + ' with a mass of <b>' + m + ' kg</b> is ' + b.on + ', where <b>g = ' + G + ' N/kg</b>. Calculate its weight.';
      steps = ['Write the equation: <span class="eqn">W = m × g</span>',
               'Substitute the values: <span class="eqn">W = ' + m + ' × ' + G + '</span>',
               'Calculate: <span class="eqn">W = ' + W + '</span>',
               'Add the unit. Weight is a force, so it is in newtons: <span class="eqn">W = ' + W + ' N</span>'];
    } else if (wType === 'm'){
      q = th + ' has a weight of <b>' + W + ' N</b> ' + b.on + ', where <b>g = ' + G + ' N/kg</b>. Calculate its mass.';
      steps = ['Start from <span class="eqn">W = m × g</span> and rearrange: <span class="eqn">m = W ÷ g</span>',
               'Substitute the values: <span class="eqn">m = ' + W + ' ÷ ' + G + '</span>',
               'Calculate: <span class="eqn">m = ' + m + '</span>',
               'Add the unit: <span class="eqn">m = ' + m + ' kg</span>. It would have this mass on any world.'];
    } else {
      q = th + ' with a mass of <b>' + m + ' kg</b> has a weight of <b>' + W + ' N</b> ' + b.on + '. Calculate g there.';
      steps = ['Start from <span class="eqn">W = m × g</span> and rearrange: <span class="eqn">g = W ÷ m</span>',
               'Substitute the values: <span class="eqn">g = ' + W + ' ÷ ' + m + '</span>',
               'Calculate: <span class="eqn">g = ' + G + '</span>',
               'Add the unit: <span class="eqn">g = ' + G + ' N/kg</span>. Every kilogram ' + b.on + ' is pulled with ' + G + ' N.'];
    }
    wEx = { q:q, steps:steps }; wShown = 0; drawExample();
  }
  function drawExample(){
    $('wQ').innerHTML = wEx.q;
    $('wSteps').innerHTML = wEx.steps.slice(0, wShown).map(function(s, i){
      return '<li' + (i === wEx.steps.length - 1 ? ' class="final"' : '') + '>' + s + '</li>';
    }).join('');
    var nb = $('wNext');
    nb.disabled = wShown >= wEx.steps.length;
    nb.textContent = wShown >= wEx.steps.length ? 'All steps shown' : wShown ? 'Show next step' : 'Show the first step';
  }
  $('wNext').addEventListener('click', function(){ if (wShown < wEx.steps.length){ wShown++; drawExample(); } });
  $('wNew').addEventListener('click', newExample);
  document.querySelectorAll('.seg-b').forEach(function(b){
    b.addEventListener('click', function(){
      wType = b.dataset.wtype;
      document.querySelectorAll('.seg-b').forEach(function(x){ x.classList.toggle('on', x === b); x.setAttribute('aria-pressed', x === b); });
      newExample();
    });
  });

  /* ── Quiz ────────────────────────────────────────────────────────── */
  var QUIZ = [
    { q:'What is the unit of weight?', o:['kilograms (kg)', 'newtons (N)', 'newtons per kilogram (N/kg)', 'metres (m)'], a:1,
      why:'Weight is a force, and all forces are measured in newtons.' },
    { q:'What is mass?', o:['The force of gravity on an object', 'How big an object is', 'The amount of matter in an object', 'How fast an object falls'], a:2,
      why:'Mass is the amount of matter (stuff) in an object, measured in kg.' },
    { q:'An astronaut has a mass of 70 kg on Earth. What is their mass on the Moon?', o:['11.2 kg', '0 kg', '112 N', '70 kg'], a:3,
      why:'Mass does not change from place to place. Only weight changes.' },
    { q:'A 10 kg bag is on Earth. Using g = 10 N/kg, what is its weight?', o:['1 N', '100 N', '10 N', '100 kg'], a:1,
      why:'W = m × g = 10 × 10 = 100 N.' },
    { q:'Which instrument measures weight?', o:['A newtonmeter (spring balance)', 'A ruler', 'A thermometer', 'A stopwatch'], a:0,
      why:'A newtonmeter measures force. Its spring stretches more when the pull is bigger.' },
    { q:'Why would you weigh less on the Moon than on Earth?', o:['There is no air on the Moon', 'The Moon’s gravitational field strength is smaller', 'Your mass is smaller on the Moon', 'The Moon is further from the Sun'], a:1,
      why:'The Moon has less mass than Earth, so its g is only 1.6 N/kg. Air has nothing to do with weight.' },
    { q:'A 50 kg student stands on Jupiter, where g = 24.8 N/kg. What is their weight?', o:['50 N', '490 N', '1,240 N', '2 N'], a:2,
      why:'W = m × g = 50 × 24.8 = 1,240 N, about two and a half times their Earth weight.' },
    { q:'Where would a 1 kg mass have the greatest weight?', o:['Mars', 'Earth', 'Neptune', 'Jupiter'], a:3,
      why:'Jupiter has the largest g of these (24.8 N/kg), so 1 kg weighs 24.8 N there.' },
    { q:'Deep in space, far from any star or planet, an astronaut would have…', o:['no mass and no weight', 'mass but almost no weight', 'weight but no mass', 'the same weight as on Earth'], a:1,
      why:'With almost no gravity there is almost no weight, but the astronaut is still made of the same matter.' },
    { q:'What does g = 9.8 N/kg mean?', o:['Each kilogram is pulled by a force of 9.8 N', 'Objects fall 9.8 m every second', 'Earth has a mass of 9.8 kg', 'You weigh 9.8 kg'], a:0,
      why:'Gravitational field strength is the force on each kilogram of mass.' }
  ];
  var qList = $('qList'), score = 0, answered = 0;
  function buildQuiz(){
    qList.innerHTML = ''; score = 0; answered = 0;
    QUIZ.forEach(function(item){
      var li = document.createElement('li'); li.className = 'qq';
      li.innerHTML = '<p class="qq-q">' + item.q + '</p><div class="qq-opts"></div>';
      var opts = li.querySelector('.qq-opts');
      item.o.forEach(function(o, i){
        var b = document.createElement('button'); b.type = 'button'; b.className = 'qq-opt';
        b.innerHTML = '<span class="l">' + 'ABCD'[i] + '</span><span>' + o + '</span>';
        b.addEventListener('click', function(){
          var all = opts.querySelectorAll('.qq-opt');
          all.forEach(function(x, k){ x.disabled = true; if (k === item.a) x.classList.add('right'); });
          var ok = i === item.a;
          if (!ok) b.classList.add('wrong');
          if (ok) score++; answered++;
          var p = document.createElement('p'); p.className = 'qq-why' + (ok ? '' : ' miss');
          p.innerHTML = '<strong>' + (ok ? 'Correct. ' : 'Not quite. ') + '</strong>' + item.why;
          li.appendChild(p);
          $('qScore').textContent = score;
        });
        opts.appendChild(b);
      });
      qList.appendChild(li);
    });
    $('qScore').textContent = 0; $('qTotal').textContent = QUIZ.length;
  }
  $('qReset').addEventListener('click', buildQuiz);

  /* ── Presenter mode ──────────────────────────────────────────────── */
  var pres = $('presenter'), slides = pres.querySelectorAll('.pslide');
  var pDots = $('pDots'), cur = 0, borrowed = [], wentFs = false, opener = null;
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
    $('pCount').textContent = (cur + 1) + ' / ' + slides.length;
    $('pTitle').textContent = 'Mass vs Weight · ' + slides[cur].dataset.title;
    $('pPrev').disabled = cur === 0;
    $('pNext').disabled = cur === slides.length - 1;
    $('pStage').scrollTop = 0;
    spring.c.dirty = jump.c.dirty = true;
  }
  // Slides reuse the live page elements, moved in while presenting and put
  // back afterwards, so the chosen mass, world and quiz answers carry across.
  function borrow(){
    pres.querySelectorAll('[data-borrow]').forEach(function(slot){
      var el = $(slot.dataset.borrow);
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
    $('pNext').focus();
  }
  function closePresenter(){
    if (pres.hidden) return;
    pres.hidden = true; document.body.classList.remove('presenting');
    giveBack();
    if (document.fullscreenElement) document.exitFullscreen().catch(function(){});
    spring.c.dirty = jump.c.dirty = true;
    if (opener && opener.focus) opener.focus();
  }
  $('presentBtn').addEventListener('click', openPresenter);
  $('pExit').addEventListener('click', closePresenter);
  $('pPrev').addEventListener('click', function(){ go(cur - 1); });
  $('pNext').addEventListener('click', function(){ go(cur + 1); });
  $('hookReveal').addEventListener('click', function(){ $('hookAns').hidden = false; this.hidden = true; });
  document.addEventListener('fullscreenchange', function(){
    // Esc in full screen is taken by the browser; leaving full screen ends the show.
    if (!document.fullscreenElement && wentFs && !pres.hidden) closePresenter();
  });
  document.addEventListener('keydown', function(e){
    if (pres.hidden) return;
    var tg = e.target, tag = tg && tg.tagName;
    if (e.key === 'Escape'){ e.preventDefault(); closePresenter(); return; }
    if (tag === 'SELECT' || tag === 'TEXTAREA') return;
    var field = tag === 'INPUT';   // mass slider and number box keep their own keys
    if ((e.key === 'ArrowRight' && !field) || e.key === 'PageDown' || (e.key === ' ' && !field)){ e.preventDefault(); go(cur + 1); }
    else if ((e.key === 'ArrowLeft' && !field) || e.key === 'PageUp'){ e.preventDefault(); go(cur - 1); }
    else if (e.key === 'Home' && !field){ e.preventDefault(); go(0); }
    else if (e.key === 'End' && !field){ e.preventDefault(); go(slides.length - 1); }
  });
  // Swipe between slides on a tablet or touch whiteboard.
  var sx = null;
  pres.addEventListener('touchstart', function(e){ sx = e.target.closest('canvas,input,.bodies,.presets') ? null : e.touches[0].clientX; }, { passive:true });
  pres.addEventListener('touchend', function(e){
    if (sx === null) return;
    var dx = e.changedTouches[0].clientX - sx; sx = null;
    if (Math.abs(dx) > 70) go(cur + (dx < 0 ? 1 : -1));
  });

  /* ── Start ───────────────────────────────────────────────────────── */
  massNum.value = state.m; massRange.value = massToRange(state.m);
  render(false); spring.settle();
  newExample(); buildQuiz();
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(function(){ spring.c.dirty = jump.c.dirty = true; });
  requestAnimationFrame(loop);
})();
