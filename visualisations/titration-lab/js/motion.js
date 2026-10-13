/* Titration Lab — the apparatus in motion.

   Each step of the method has a choreography: a short list of phases, each
   with a duration, a caption (the technique point) and a function that poses
   the apparatus at a fraction p of the way through it. The lab works out the
   chemistry as before; a step's animation runs between two snapshots of the
   lab, the state before the step and the state after it, so levels and
   colours come from variables (a burette reading, a pipette volume, a flask
   volume and its absorbances) and never from drawn frames. When a step ends
   the pose is dropped and the bench is drawn from the lab's state again, so
   whatever the animation shows, the bench always ends on the real state.

   The scene's update() draws the end state every frame; render() then poses
   the moving parts over it. Phases set values that carry on into the next
   phase (levels, positions, the tap), except the momentary ones listed in
   TRANSIENT, which only last for the phase that sets them. */
(function (root) {
  'use strict';
  var B = root.TitrationBench;
  var el = B.el, set = B.set, C = B.C, f1 = B.f1, BU = B.BU, FL = B.FL;

  var EMPTY = 56;                  // a burette "reading" below the jet: nothing in the tube
  var LOW = 120;                   // how far the burette is lowered in the clamp to fill it
  var TOP = BU.top + LOW;          // the top of the burette when it is lowered
  var FX = { park: 130, under: 380 }, WX = { park: 510, under: 380 };
  var WATER = C.clear, WATER_TOP = C.clearTop;
  var POUR_COL = 'rgba(159,180,204,0.55)';
  var PIP_LIQ = 'rgba(159,180,204,0.45)';
  // The pipette, tip down at (0, 0): its mark and top, and its volume up to a height.
  var PIP = { mark: -243, top: -273 };
  var PIP_VOL = [[0, 0], [-75, 0.6], [-107, 3.5], [-149, 21.5], [-181, 24.4], [-243, 25], [-273, 25.4]];
  // Where the pipette and its filler lie on the bench.
  var PIP_BENCH = { x: 557, y: 569, a: 90 }, FILLER_BENCH = { x: 830, y: 569, a: 90 };
  var TRANSIENT = ['stream', 'drops', 'plume', 'eye', 'swirl', 'bottle', 'pip', 'filler', 'dropper', 'caps'];

  function clamp(p) { return p < 0 ? 0 : p > 1 ? 1 : p; }
  function lerp(a, b, p) { return a + (b - a) * p; }
  function ease(p) { p = clamp(p); return p < 0.5 ? 4 * p * p * p : 1 - Math.pow(-2 * p + 2, 3) / 2; }
  function seg(p, a, b) { return clamp((p - a) / (b - a)); }
  function mixAbs(a, b, p) { return [0, 1, 2].map(function (i) { return a[i] + (b[i] - a[i]) * p; }); }
  function f2(x) { return (Math.round(x * 100 + 1e-7) / 100).toFixed(2); }
  // A pose between two places, lifted on an arc on the way.
  function between(a, b, p, arc) {
    var e = ease(p);
    return { x: lerp(a.x, b.x, e), y: lerp(a.y, b.y, e) - (arc || 0) * Math.sin(Math.PI * e), a: lerp(a.a || 0, b.a || 0, e) };
  }
  // Through several places in turn, each leg an equal share of p.
  function via(list, p) {
    var n = list.length - 1, i = Math.min(n - 1, Math.floor(clamp(p) * n));
    return between(list[i], list[i + 1], clamp(p) * n - i);
  }
  function pipLevel(v) {
    if (v <= 0) return 2;
    for (var i = 1; i < PIP_VOL.length; i++) {
      var a = PIP_VOL[i - 1], b = PIP_VOL[i];
      if (v <= b[1]) return lerp(a[0], b[0], (v - a[1]) / (b[1] - a[1]));
    }
    return PIP.top;
  }
  function ph(d, cap, fn) { return { d: d, cap: cap, fn: fn }; }

  /* ---------- What the lab looks like, as numbers ---------- */
  function snap(lab) {
    var s = lab.state, b = s.burette, f = s.flask, ap = f && f.totalVol() > 0 ? f.appearance() : null;
    var t = s.trial || s.trials[s.trials.length - 1] || null;
    return { reading: b.reading, jetFull: b.reading !== null && b.jetAir <= 0, funnel: b.funnel, tap: b.tap || b.pending > 0,
      tile: s.tile, under: s.under, fx: s.under === 'flask' ? FX.under : FX.park, wx: s.under === 'waste' ? WX.under : WX.park,
      vol: f ? f.totalVol() : 0, abs: ap ? ap.abs.slice() : [0, 0, 0], haze: ap ? ap.haze : 0, T: f ? f.T : 20,
      wasteVol: s.waste_cm3, ind: f ? f.indicator : null, acid: t ? t.acid : null,
      initial: t ? t.initialRec : null, final: t ? t.finalRec : null, titre: t && t.titre !== undefined ? t.titre : null };
  }
  function base(a) {
    return { reading: a.reading === null ? EMPTY : a.reading, liq: 'titrant', jetFull: a.jetFull, tap: a.tap ? 90 : 0, rig: 0,
      funnel: a.funnel ? 1 : 0, fx: a.fx, fy: 0, wx: a.wx, wy: 0, tile: a.tile ? 1 : 0,
      vol: a.vol, abs: a.abs, haze: a.haze, T: a.T, thermo: false, pipVol: 0 };
  }
  function flaskTop(v) { return 505 + v.fy - B.flaskHeight(v.vol); }
  function wasteTop(k) { return 505 - Math.min(70, 4 + k.a.wasteVol * 0.6); }
  function jetTo(v, y) { return { d: 'M' + BU.x + ',' + (BU.jetEnd + v.rig) + ' L' + BU.x + ',' + f1(y) }; }

  /* ---------- The choreographies, by the id of the method's step ---------- */
  var CH = {};

  // Rinse the burette from the wash bottle or the titrant bottle, then run it to waste.
  function rinse(k, water) {
    var pour = water ? { key: 'wash', x: 400, y: TOP - 12, a: -150 } : { key: 'titrant', x: 388, y: TOP - 18, a: -105 };
    var stream = water ? 'M400,' + (TOP - 12) + ' Q386,' + (TOP - 15) + ' 381,' + (TOP + 4) : 'M388,' + (TOP - 18) + ' Q382,' + (TOP - 14) + ' 381,' + (TOP + 2), lvl = 46;
    var liq = water ? 'water' : 'titrant';
    return [
      ph(0.8, 'Lower the burette in the clamp, so its top is below eye level.', function (p, v) { v.rig = LOW * ease(p); }),
      ph(1.1, water ? 'Rinse it with distilled water from the wash bottle.' : 'Rinse it with a little of the titrant, so no water is left to dilute it.',
        function (p, v) { v.bottle = { to: pour, p: ease(p), cap: 1 }; }),
      ph(1.4, null, function (p, v) {
        v.bottle = { to: pour, p: 1, cap: 1 }; v.liq = liq;
        v.stream = { d: stream, col: water ? POUR_COL : 'titrant', w: water ? 1.6 : 2.5 };
        v.reading = lerp(EMPTY, lvl, ease(p));
      }),
      ph(0.9, null, function (p, v) { v.bottle = { to: pour, p: 1 - ease(p), cap: 1 }; }),
      ph(0.7, null, function (p, v) { v.rig = LOW * (1 - ease(p)); }),
      ph(0.8, 'Run it out through the tap into the waste beaker.', function (p, v) { v.wx = lerp(k.a.wx, WX.under, ease(seg(p, 0, 0.7))); v.tap = 90 * ease(seg(p, 0.6, 1)); }),
      ph(1.3, null, function (p, v) { v.jetFull = true; v.reading = lerp(lvl, EMPTY, ease(p)); v.stream = jetTo(v, wasteTop(k)); }),
      ph(0.8, null, function (p, v) { v.jetFull = k.b.jetFull; v.tap = 90 * (1 - ease(seg(p, 0, 0.4))); v.wx = lerp(WX.under, k.b.wx, ease(seg(p, 0.3, 1))); })
    ];
  }
  CH['rinse-water'] = function (k) { return rinse(k, true); };
  CH['rinse-titrant'] = function (k) { return rinse(k, false); };

  // The funnel: up from the bench and into the top of the burette, or back.
  function funnelPos(p) { return p <= 0 ? 0 : p >= 1 ? 1 : Math.max(0.001, Math.min(0.999, p)); }
  CH['funnel-in'] = function () {
    return [ph(1.6, 'Close the tap and put a small funnel in the top of the burette.', function (p, v) { v.funnel = funnelPos(p); })];
  };
  CH['funnel-out'] = function () {
    return [ph(1.5, 'Take the funnel out: drops left in it could drip in later and change the reading.', function (p, v) { v.funnel = funnelPos(1 - p); })];
  };

  CH.fill = function (k) {
    var pour = { key: 'titrant', x: 393, y: TOP - 32, a: -105 }, lvl = k.b.reading === null ? 0 : k.b.reading;
    return [
      ph(0.8, 'Lower the burette, so you fill it below eye level.', function (p, v) { v.rig = LOW * ease(p); }),
      ph(1.1, 'Check the tap is closed, then pour the titrant in through the funnel.', function (p, v) { v.bottle = { to: pour, p: ease(p), cap: 1 }; }),
      ph(2.6, lvl < 0 ? 'Fill it to just above the 0.00 mark.' : 'Fill it to near the 0.00 mark.', function (p, v) {
        v.bottle = { to: pour, p: 1, cap: 1 };
        v.stream = { d: 'M393,' + (TOP - 32) + ' Q384,' + (TOP - 27) + ' 382,' + (TOP + 6) + ' L381,' + f1(Math.max(TOP + 12, B.buretteY(lerp(EMPTY, lvl, ease(p))) + LOW - 6)), col: 'titrant', w: 2.5 };
        v.reading = lerp(EMPTY, lvl, ease(p));
      }),
      ph(1.0, null, function (p, v) { v.bottle = { to: pour, p: 1 - ease(p), cap: 1 }; }),
      ph(0.8, 'Raise the burette back up in the clamp.', function (p, v) { v.rig = LOW * (1 - ease(p)); })
    ];
  };

  CH.waste = function (k) {
    return [ph(1.3, 'Put the waste beaker under the burette.', function (p, v) { v.wx = lerp(k.a.wx, k.b.wx, ease(p)); v.wy = -26 * Math.sin(Math.PI * ease(p)); })];
  };

  CH.jet = function (k) {
    var r0 = k.a.reading === null ? EMPTY : k.a.reading, r1 = k.b.reading === null ? EMPTY : k.b.reading;
    return [
      ph(0.5, 'Open the tap.', function (p, v) { v.tap = 90 * ease(p); }),
      ph(1.6, 'Run a little out, so the jet below the tap fills with liquid and the level is on the scale.', function (p, v) {
        v.tap = 90; if (p > 0.12) v.jetFull = true;
        v.reading = lerp(r0, r1, ease(p)); v.stream = jetTo(v, wasteTop(k));
      }),
      ph(0.5, 'Close the tap. No air is left in the jet to add to the titre.', function (p, v) { v.tap = 90 * (1 - ease(p)); })
    ];
  };

  // Pipette poses: on the bench, upright over the solution, and dipped in it.
  function pipPlaces(sc) {
    var ab = sc.analyteBottle;
    return { up: { x: ab.x, y: 372, a: 0 }, dip: { x: ab.x, y: 478, a: 0 } };
  }

  CH['rinse-pipette'] = function (k) {
    var P = pipPlaces(k.sc), w = { x: k.a.wx + 18, y: 452, a: 0 }, over = { x: k.a.wx + 18, y: 380, a: 0 };
    return [
      ph(1.3, 'Rinse the pipette with the solution it will measure.', function (p, v) { v.pip = between(PIP_BENCH, P.up, p, 40); v.filler = 'on'; v.caps = { analyte: ease(p) }; }),
      ph(0.6, null, function (p, v) { v.pip = between(P.up, P.dip, p); v.filler = 'on'; v.caps = { analyte: 1 }; }),
      ph(0.5, null, function (p, v) { v.pip = P.dip; v.filler = 'on'; v.sq = ease(p); v.caps = { analyte: 1 }; }),
      ph(0.9, 'Draw up a little of the solution with the filler.', function (p, v) { v.pip = P.dip; v.filler = 'on'; v.sq = 1 - ease(seg(p, 0, 0.4)); v.pipVol = 6 * ease(p); v.caps = { analyte: 1 }; }),
      ph(1.6, 'Tilt and turn it, so the solution wets the whole of the inside.', function (p, v) {
        var lift = between(P.dip, P.up, seg(p, 0, 0.3));
        lift.a = -62 * Math.sin(Math.PI * seg(p, 0.3, 1));
        v.pip = lift; v.filler = 'on'; v.caps = { analyte: 1 - seg(p, 0, 0.3) };
      }),
      ph(1.0, null, function (p, v) { v.pip = between(P.up, over, p, 30); v.filler = 'on'; }),
      ph(0.4, null, function (p, v) { v.pip = between(over, w, p); v.filler = 'on'; }),
      ph(1.0, 'Run it into the waste beaker.', function (p, v) { v.pip = w; v.filler = 'on'; v.pipVol = 6 * (1 - ease(p)); v.stream = { d: 'M' + w.x + ',' + (w.y + 3) + ' L' + w.x + ',' + f1(wasteTop(k)), col: PIP_LIQ, w: 1.4 }; }),
      ph(1.3, null, function (p, v) { v.pip = between(w, PIP_BENCH, p, 60); v.filler = 'on'; v.pipVol = 0; })
    ];
  };

  CH.portion = function (k) {
    if (k.cylinder) return cylinderPour(k);
    var P = pipPlaces(k.sc), fx = k.a.fx, filled = 25.7;
    var top = { x: P.dip.x, y: P.dip.y + PIP.top, a: 0 };
    var inFlask = { x: fx, y: 422, a: 0 }, touch = { x: fx - 14, y: 396, a: 6 };
    var eye = { x: P.dip.x + 44, y: P.dip.y + PIP.mark, len: 32 };
    return [
      ph(1.6, 'Lower the tip of the pipette into the solution.', function (p, v) {
        v.pip = p < 0.7 ? between(PIP_BENCH, P.up, p / 0.7, 40) : between(P.up, P.dip, (p - 0.7) / 0.3);
        v.filler = FILLER_BENCH; v.caps = { analyte: ease(seg(p, 0, 0.5)) };
      }),
      ph(1.2, 'Attach the pipette filler to the top. Never use your mouth.', function (p, v) {
        v.pip = P.dip; v.filler = p < 1 ? between(FILLER_BENCH, top, p, 50) : 'on'; v.caps = { analyte: 1 };
      }),
      ph(0.7, 'Squeeze the bulb of the filler.', function (p, v) { v.pip = P.dip; v.filler = 'on'; v.sq = ease(p); v.caps = { analyte: 1 }; }),
      ph(1.7, 'Release it slowly: the solution rises past the line.', function (p, v) {
        v.pip = P.dip; v.filler = 'on'; v.sq = 1 - ease(seg(p, 0, 0.35)); v.pipVol = filled * ease(p); v.caps = { analyte: 1 };
      }),
      ph(2.0, 'Let it down until the bottom of the meniscus sits on the line, at eye level.', function (p, v) {
        v.pip = P.dip; v.filler = 'on'; v.pipVol = lerp(filled, 25, ease(seg(p, 0.2, 0.85))); v.caps = { analyte: 1 };
        v.eye = { x: eye.x + 30 * (1 - ease(seg(p, 0, 0.25))), y: eye.y, len: eye.len, o: seg(p, 0, 0.2) };
      }),
      ph(1.7, 'Lift it out and move it over the conical flask.', function (p, v) {
        v.pip = via([P.dip, { x: P.dip.x, y: 330, a: 0 }, { x: fx, y: 330, a: 0 }, inFlask], p);
        v.filler = 'on'; v.pipVol = 25; v.caps = { analyte: 1 - ease(seg(p, 0, 0.4)) };
      }),
      ph(2.2, 'Let it drain into the flask.', function (p, v) {
        var e = ease(p);
        v.pip = inFlask; v.filler = 'on'; v.pipVol = lerp(25, 0.05, e);
        v.vol = lerp(k.a.vol, k.b.vol, e); v.abs = mixAbs(k.a.abs, k.b.abs, e);
        v.stream = { d: 'M' + fx + ',' + 424 + ' L' + fx + ',' + f1(flaskTop(v)), col: PIP_LIQ, w: 1.4 };
      }),
      ph(1.5, 'Touch the tip on the inside of the flask. Don’t blow out the last drop: the pipette is calibrated to leave it.', function (p, v) {
        v.pip = between(inFlask, touch, seg(p, 0, 0.45)); v.filler = 'on'; v.pipVol = 0.05;
      }),
      ph(1.4, null, function (p, v) { v.pip = between(touch, PIP_BENCH, p, 70); v.filler = 'on'; v.pipVol = p < 0.5 ? 0.05 : 0; })
    ];
  };
  // A measuring cylinder: tip it into the flask.
  function cylinderPour(k) {
    var fx = k.a.fx, pour = { key: 'cylinder', x: fx + 12, y: 352, a: -100 };
    return [
      ph(1.2, 'Pour the measured solution into the conical flask.', function (p, v) { v.bottle = { to: pour, p: ease(p) }; }),
      ph(2.0, null, function (p, v) {
        var e = ease(p);
        v.bottle = { to: pour, p: 1 }; v.vol = lerp(k.a.vol, k.b.vol, e); v.abs = mixAbs(k.a.abs, k.b.abs, e);
        v.stream = { d: 'M' + (fx + 12) + ',352 Q' + (fx + 3) + ',358 ' + fx + ',' + f1(flaskTop(v)), col: PIP_LIQ, w: 2.5 };
      }),
      ph(1.1, null, function (p, v) { v.bottle = { to: pour, p: 1 - ease(p) }; })
    ];
  }

  CH.indicator = function (k) {
    var ib = (k.sc.indBottles || {})[k.b.ind] || { x: 782 }, fx = k.a.fx;
    var rest = { x: ib.x, y: 456, a: 0 }, up = { x: ib.x, y: 392, a: 0 }, over = { x: fx, y: 304, a: 0 };
    var name = k.b.ind && root.TitrationEngine.INDICATORS[k.b.ind] ? root.TitrationEngine.INDICATORS[k.b.ind].name.toLowerCase() : 'indicator';
    var n = 3;
    return [
      ph(0.9, 'Take the dropper out of the ' + name + ' bottle.', function (p, v) { v.dropper = { pose: between(rest, up, p), ind: ib }; }),
      ph(1.1, null, function (p, v) { v.dropper = { pose: between(up, over, p, 30), ind: ib }; }),
      ph(0.8 * n, 'Add 2 or 3 drops of ' + name + '. Only a few: indicators are weak acids themselves.', function (p, v) {
        var q = p * n, i = Math.min(n - 1, Math.floor(q)), f = q - i, fall = seg(f, 0.25, 0.7);
        var spread = fall >= 1 ? ease(seg(f, 0.7, 1)) : 0;
        v.dropper = { pose: over, ind: ib, sq: Math.sin(Math.PI * seg(f, 0, 0.35)) };
        v.abs = mixAbs(k.a.abs, k.b.abs, (i + spread) / n);
        if (fall > 0 && fall < 1) v.drops = [{ x: fx, y: lerp(350, flaskTop(v), fall * fall) }];
      }),
      ph(0.9, 'Swirl the flask to mix it.', function (p, v) { v.dropper = { pose: over, ind: ib }; v.swirl = Math.sin(Math.PI * p); }),
      ph(1.3, null, function (p, v) { v.dropper = { pose: via([over, up, rest], p), ind: ib }; })
    ];
  };

  CH.acid = function (k) {
    var ab = (k.sc.acidBottles || {})[k.b.acid || 'H2SO4'], fx = k.a.fx;
    if (!ab) return null;
    var pour = { key: 'acid:' + (k.b.acid || 'H2SO4'), x: fx + 10, y: 348, a: -105 };
    return [
      ph(1.1, 'Add about 10 cm³ of dilute sulfuric acid to the flask.', function (p, v) { v.bottle = { to: pour, p: ease(p), cap: 1 }; }),
      ph(1.6, null, function (p, v) {
        var e = ease(p);
        v.bottle = { to: pour, p: 1, cap: 1 }; v.vol = lerp(k.a.vol, k.b.vol, e); v.abs = mixAbs(k.a.abs, k.b.abs, e);
        v.stream = { d: 'M' + (fx + 10) + ',348 Q' + (fx + 2) + ',354 ' + fx + ',' + f1(flaskTop(v)), col: POUR_COL, w: 2.5 };
      }),
      ph(1.0, null, function (p, v) { v.bottle = { to: pour, p: 1 - ease(p), cap: 1 }; })
    ];
  };

  CH.warm = function (k) {
    return [ph(2.6, 'Warm the flask to about 60 °C in a water bath.', function (p, v) { v.thermo = true; v.T = lerp(k.a.T, k.b.T, ease(p)); })];
  };

  CH.tile = function () {
    return [ph(1.4, 'Put the white tile on the base of the stand, under the burette.', function (p, v) { v.tile = p >= 1 ? 1 : Math.max(0.001, ease(p)); })];
  };

  CH.under = function (k) {
    var list = [];
    if (k.a.under === 'waste') list.push(ph(1.0, 'Move the waste beaker out of the way.', function (p, v) { v.wx = lerp(k.a.wx, k.b.wx, ease(p)); v.wy = -20 * Math.sin(Math.PI * ease(p)); }));
    list.push(ph(1.6, 'Stand the conical flask on the white tile, under the burette.', function (p, v) {
      v.fx = lerp(k.a.fx, k.b.fx, ease(p)); v.fy = -34 * Math.sin(Math.PI * ease(p));
    }));
    return list;
  };

  // The eye at the meniscus.
  function eyeAt(v, reading, p) {
    var y = B.buretteY(reading) + v.rig;
    return { x: BU.x + 36 + 40 * (1 - ease(seg(p, 0, 0.3))), y: f1(y), len: 26, o: seg(p, 0, 0.2) };
  }

  CH.initial = function (k) {
    var r = k.b.reading, t = k.txt;
    return [ph(3.2, 'Read the ' + t.where + ' of the meniscus at eye level: the initial reading is ' + f2(k.b.initial) + ' cm³.', function (p, v) { v.eye = eyeAt(v, r, p); })];
  };

  // Titrant from the jet into the flask, the level and the flask's volume moving together.
  function flowTo(k, v, reading) {
    var r0 = k.a.reading, r1 = k.b.reading, f = r1 > r0 ? (reading - r0) / (r1 - r0) : 1;
    v.reading = reading; v.vol = lerp(k.a.vol, k.b.vol, f);
    return f;
  }
  function dropFall(v, f) { return { x: v.fx, y: lerp(BU.jetEnd + 4, flaskTop(v), f * f) }; }

  CH.run = function (k) {
    var r0 = k.a.reading, r1 = k.b.reading, rm = Math.max(r0, r1 - 0.2), n = 4, t = k.txt;
    return [
      ph(0.5, 'Open the tap.', function (p, v) { v.tap = 90 * ease(p); }),
      ph(4.8, 'Run the ' + t.titrant + ' in, swirling the flask all the time.', function (p, v) {
        v.tap = 90; flowTo(k, v, lerp(r0, rm, p)); v.abs = mixAbs(k.a.abs, k.b.abs, p * 0.6);
        v.stream = { d: 'M' + BU.x + ',' + BU.jetEnd + ' L' + BU.x + ',' + f1(flaskTop(v)), col: 'titrant', w: 2.5 };
        v.swirl = 0.6 * ease(seg(p, 0, 0.1)); v.plume = 0.55;
      }),
      ph(0.6, 'Near the endpoint, turn the tap down to a drip.', function (p, v) { v.tap = lerp(90, 35, ease(p)); v.swirl = 0.6; }),
      ph(0.7 * n, 'Add it drop by drop, swirling after each drop.', function (p, v) {
        var q = p * n, i = Math.min(n - 1, Math.floor(q)), f = q - i, fall = seg(f, 0, 0.45);
        v.tap = 35; v.swirl = 0.6;
        flowTo(k, v, lerp(rm, r1, (i + (fall >= 1 ? 1 : 0)) / n)); v.abs = mixAbs(k.a.abs, k.b.abs, 0.6 + 0.4 * p);
        if (fall < 1) v.drops = [dropFall(v, fall)];
        else v.plume = 0.6 * (1 - seg(f, 0.45, 1));
      }),
      ph(0.4, null, function (p, v) { v.tap = 35 * (1 - ease(p)); v.swirl = 0.6 * (1 - p); })
    ];
  };

  CH.end = function (k) {
    var r0 = k.a.reading, r1 = k.b.reading, n = Math.max(1, Math.min(8, Math.round((r1 - r0) / 0.05))), t = k.txt;
    return [
      ph(0.4, 'Open the tap to a drip again.', function (p, v) { v.tap = 35 * ease(p); }),
      ph(0.75 * n, 'Swirl after each drop and watch for the first colour change that lasts.', function (p, v) {
        var q = p * n, i = Math.min(n - 1, Math.floor(q)), f = q - i, fall = seg(f, 0, 0.45);
        v.tap = 35; v.swirl = 0.5;
        flowTo(k, v, lerp(r0, r1, (i + (fall >= 1 ? 1 : 0)) / n));
        if (fall < 1) v.drops = [dropFall(v, fall)];
        else v.plume = 0.6 * (1 - seg(f, 0.45, 1)) * (i < n - 1 ? 1 : 0.4);
        if (i === n - 1 && fall >= 1) v.abs = mixAbs(k.a.abs, k.b.abs, 0.25 * seg(f, 0.45, 1));
      }),
      ph(2.0, 'The endpoint: the flask turns ' + t.to + ' and stays ' + t.to + ' when swirled.', function (p, v) {
        v.tap = 35; v.swirl = 0.5 * (1 - seg(p, 0.6, 1)); v.abs = mixAbs(k.a.abs, k.b.abs, 0.25 + 0.75 * ease(p)); v.plume = 0.3 * (1 - p);
      }),
      ph(0.5, 'Close the tap.', function (p, v) { v.tap = 35 * (1 - ease(p)); }),
      ph(3.0, 'Read the ' + t.where + ' of the meniscus at eye level: the final reading is ' + f2(k.b.final) + ' cm³.', function (p, v) { v.eye = eyeAt(v, r1, p); }),
      ph(3.4, 'Titre = final reading − initial reading = ' + f2(k.b.final) + ' − ' + f2(k.b.initial) + ' = ' + f2(k.b.titre) + ' cm³.', function (p, v) { v.eye = eyeAt(v, r1, 1); })
    ];
  };

  /* ---------- The moving parts ---------- */
  function Motion(scene, run) {
    this.sc = scene; this.run = run; this.cur = null; this.paused = false;
    this.funnelLabel = scene.funnelOut.querySelector('text');
    this.reduced = root.matchMedia && root.matchMedia('(prefers-reduced-motion: reduce)').matches;
    var g = scene.actors;
    g.innerHTML = '';
    this.stream = el('path', { d: '', fill: 'none', stroke: 'none', 'stroke-width': 2.5, 'stroke-linecap': 'round' }, g);
    this.drop = el('circle', { r: 2.8, cx: 0, cy: 0, fill: 'none' }, g);
    // Volumetric pipette, upright with its tip at (0, 0).
    var pip = this.pip = el('g', { display: 'none' }, g);
    var clipId = 'pipClip' + Math.floor(Math.random() * 1e6);
    this.pipClip = el('rect', { x: -15, width: 30, y: 2, height: 0 }, el('clipPath', { id: clipId }, el('defs', {}, pip)));
    this.pipLiq = el('path', { d: 'M-1.8,-3 L-1.8,-75 C-1.8,-88 -11.8,-89 -11.8,-107 L-11.8,-149 C-11.8,-167 -1.8,-168 -1.8,-181 L-1.8,-273 L1.8,-273 L1.8,-181 C1.8,-168 11.8,-167 11.8,-149 L11.8,-107 C11.8,-89 1.8,-88 1.8,-75 L1.8,-3 Q0,0 -1.8,-3 Z',
      fill: PIP_LIQ, 'clip-path': 'url(#' + clipId + ')' }, pip);
    el('path', { d: 'M-3,-4 L-3,-75 C-3,-89 -13,-89 -13,-107 L-13,-149 C-13,-167 -3,-167 -3,-181 L-3,-273 M3,-4 L3,-75 C3,-89 13,-89 13,-107 L13,-149 C13,-167 3,-167 3,-181 L3,-273 M-3,-4 Q0,1 3,-4',
      fill: 'none', stroke: C.glass, 'stroke-width': 1.6, 'stroke-linecap': 'round' }, pip);
    el('line', { x1: -6, x2: 6, y1: PIP.mark, y2: PIP.mark, stroke: C.text, 'stroke-width': 1 }, pip);
    this.pipBead = el('circle', { cx: 0, cy: 2.5, r: 2, fill: 'none' }, pip);
    // Pipette filler: a rubber bulb on a short neck that fits the top of the pipette.
    var fl = this.filler = el('g', { display: 'none' }, g);
    el('rect', { x: -4.5, y: -16, width: 9, height: 18, rx: 2.5, fill: C.rubber }, fl);
    this.fillerBulb = el('ellipse', { cx: 0, cy: -31, rx: 12, ry: 16, fill: C.rubber }, fl);
    // Dropper: a rubber teat on a glass tube, tip at y = 44.
    var dr = this.dropper = el('g', { display: 'none' }, g);
    el('rect', { x: -1.3, y: 24, width: 2.6, height: 16, fill: PIP_LIQ }, dr);
    el('path', { d: 'M-2.4,0 L-2.4,36 L-1,44 L1,44 L2.4,36 L2.4,0', fill: C.glassFill, stroke: C.glass, 'stroke-width': 1.2 }, dr);
    this.teat = el('path', { d: 'M-5,0 L-5,-15 Q0,-30 5,-15 L5,0 Z', fill: C.rubber }, dr);
    // The eye: reading a scale level with it.
    var eye = this.eye = el('g', { display: 'none' }, g);
    this.eyeLine = el('line', { x1: -15, x2: -40, y1: 0, y2: 0, stroke: C.blue, 'stroke-width': 1.4, 'stroke-dasharray': '4 3' }, eye);
    el('path', { d: 'M-12,0 Q0,-10 12,0 Q0,10 -12,0 Z', fill: '#0d1928', stroke: C.text, 'stroke-width': 1.6 }, eye);
    el('circle', { cx: -3, cy: 0, r: 3.8, fill: C.blue }, eye);
  }
  Motion.has = function (id) { return !!CH[id]; };
  Motion.snap = snap;

  // Start a step's animation between two snapshots. Returns false if it has none.
  Motion.prototype.start = function (id, from, to, opts) {
    this.stop();
    opts = opts || {};
    if (!CH[id] || this.reduced) return false;
    var k = this.context(from, to, opts);
    var phases = CH[id](k);
    if (!phases || !phases.length) return false;
    var dur = phases.reduce(function (s, x) { return s + x.d; }, 0);
    this.cur = { id: id, k: k, phases: phases, dur: dur, t: 0, rate: opts.rate || 1 };
    this.paused = false;
    this.sc.hold = true;
    this.sc.cueG.innerHTML = '';
    return true;
  };
  Motion.prototype.context = function (from, to, opts) {
    opts = opts || {};
    return { sc: this.sc, a: from, b: to, txt: opts.txt || {}, endAbs: opts.endAbs || null, cylinder: this.run.aliquotDeviceKind === 'cylinder' };
  };
  // Every caption of a step, in order: the whole technique, for reduced motion.
  Motion.prototype.captions = function (id, from, to, opts) {
    var phases = CH[id] && CH[id](this.context(from, to, opts));
    return phases ? phases.map(function (x) { return x.cap; }).filter(Boolean) : [];
  };
  Motion.prototype.active = function () { return !!this.cur; };
  Motion.prototype.tick = function (dt) {
    var c = this.cur;
    if (!c || this.paused) return false;
    c.t += dt * c.rate;
    if (c.t >= c.dur) { this.stop(); return true; }
    return false;
  };
  // Jump to the end: the bench is drawn from the lab's state again.
  Motion.prototype.stop = function () {
    if (!this.cur) return;
    this.cur = null;
    this.clear();
  };
  Motion.prototype.progress = function () { return this.cur ? this.cur.t / this.cur.dur : 1; };
  // The caption of the phase now playing (or the last one that had one).
  Motion.prototype.caption = function () {
    var c = this.cur;
    if (!c) return null;
    var t = 0, cap = null;
    for (var i = 0; i < c.phases.length; i++) { if (c.phases[i].cap) cap = c.phases[i].cap; t += c.phases[i].d; if (c.t < t) break; }
    return cap;
  };
  Motion.prototype.pose = function () {
    var c = this.cur, v = base(c.k.a), t = 0;
    for (var i = 0; i < c.phases.length; i++) {
      var x = c.phases[i];
      TRANSIENT.forEach(function (n) { v[n] = null; }); v.sq = 0;
      if (c.t < t + x.d) { x.fn((c.t - t) / x.d, v); v.clock = c.t; return v; }
      x.fn(1, v); t += x.d;
    }
    v.clock = c.t;
    return v;
  };
  // The burette level the lens should show while the animation runs.
  Motion.prototype.lensLab = function () {
    var v = this.cur ? this.pose() : null;
    return { state: { burette: { reading: !v || v.reading > 50.5 ? null : v.reading } } };
  };

  // Every moving group, back where the bench draws it.
  Motion.prototype.clear = function () {
    var sc = this.sc;
    sc.hold = false;
    this.groups().forEach(function (x) { set(x.g, { transform: '' }); if (x.cap) set(x.cap, { opacity: 1 }); if (x.label) set(x.label, { opacity: 1 }); });
    set(sc.rig, { transform: '' }); set(sc.funnelOut, { transform: '' }); set(this.funnelLabel, { opacity: 1 }); set(sc.tileParked, { transform: '' }); set(sc.tileLabel, { opacity: 1 });
    set(sc.pipG, { display: 'inline' });
    Object.keys(sc.indBottles || {}).forEach(function (id) { set(sc.indBottles[id].teat, { display: 'inline' }); });
    [this.pip, this.filler, this.dropper, this.eye].forEach(function (n) { set(n, { display: 'none' }); });
    set(this.stream, { stroke: 'none' }); set(this.drop, { fill: 'none' });
    if (sc.eased) { sc.eased.fx = undefined; sc.eased.wx = undefined; sc.eased.tap = undefined; }
  };
  Motion.prototype.groups = function () {
    var sc = this.sc, out = [];
    function add(key, b, mx, my, label) { if (b) out.push({ key: key, g: b.g || b, cap: b.cap, mx: mx, my: my, label: label }); }
    add('titrant', sc.titrantBottle, sc.titrantBottle.x, sc.titrantBottle.mouth);
    add('analyte', sc.analyteBottle, sc.analyteBottle.x, sc.analyteBottle.mouth);
    add('wash', sc.washG, 946, 410);
    Object.keys(sc.acidBottles || {}).forEach(function (id) { var a = sc.acidBottles[id]; add('acid:' + id, a, a.x, a.mouth); });
    if (this.run.aliquotDeviceKind === 'cylinder') add('cylinder', sc.pipG, 620, 430, sc.pipG.querySelector('text'));
    return out;
  };

  // Pose the apparatus over the bench as drawn from the end state.
  Motion.prototype.render = function () {
    if (!this.cur) return;
    var sc = this.sc, v = this.pose(), k = this.cur.k, run = this.run;
    var purple = run.titrant.id === 'KMnO4';
    var liq = v.liq === 'water' ? WATER : purple ? C.purple : C.clear, liqTop = v.liq === 'water' ? WATER_TOP : purple ? C.purpleTop : C.clearTop;
    // Burette, tap and funnel.
    set(sc.rig, { transform: v.rig ? 'translate(0,' + f1(v.rig) + ')' : '' });
    sc.paintBurette(v.reading >= EMPTY - 0.01 ? null : v.reading, liq, liqTop, v.jetFull);
    sc.setTap(v.tap);
    set(sc.funnelIn, { display: v.funnel >= 1 ? 'inline' : 'none' });
    set(sc.funnelOut, { display: v.funnel >= 1 ? 'none' : 'inline' });
    if (v.funnel > 0 && v.funnel < 1) {
      var fxp = ease(seg(v.funnel, 0.2, 1)), fyp = ease(seg(v.funnel, 0, 0.85));
      set(sc.funnelOut, { transform: 'translate(' + f1(-196 * fxp) + ',' + f1((-465 + v.rig) * fyp - 30 * Math.sin(Math.PI * fyp)) + ')' });
    } else set(sc.funnelOut, { transform: '' });
    set(this.funnelLabel, { opacity: v.funnel > 0 && v.funnel < 1 ? Math.max(0, 1 - v.funnel * 4).toFixed(2) : 1 });
    // Tile.
    if (v.tile > 0 && v.tile < 1) {
      var e = v.tile, tx = 256 * e, ty = -56 * e - 46 * Math.sin(Math.PI * e), sx = 1 + (188 / 150 - 1) * e, sy = 1 + (7 / 9 - 1) * e;
      set(sc.tile, { display: 'none' }); set(sc.tileParked, { display: 'inline', transform: 'translate(' + f1(30 + tx) + ',' + f1(560 + ty) + ') scale(' + sx.toFixed(3) + ',' + sy.toFixed(3) + ') translate(-30,-560)' });
      set(sc.tileLabel, { opacity: (1 - e).toFixed(2) });
    } else {
      set(sc.tile, { display: v.tile >= 1 ? 'inline' : 'none', x: 286 }); set(sc.tileParked, { display: v.tile >= 1 ? 'none' : 'inline', transform: '' }); set(sc.tileLabel, { opacity: 1 });
    }
    // Waste beaker and flask.
    set(sc.waste, { transform: 'translate(' + f1(v.wx) + ',' + f1(505 + v.wy) + ')' });
    set(sc.flaskG, { transform: 'translate(' + f1(v.fx) + ',' + f1(505 + v.fy) + ')' });
    this.paintFlask(v, k);
    // Streams and drops.
    if (v.stream) {
      var sc_ = v.stream.col === 'titrant' ? (liq === C.clear ? POUR_COL : liq) : v.stream.col;
      set(this.stream, { d: v.stream.d, stroke: sc_, 'stroke-width': v.stream.w || 2.5 });
    } else set(this.stream, { stroke: 'none' });
    set(sc.stream, { stroke: 'none' }); set(sc.drop, { fill: 'none' });
    if (v.drops && v.drops.length) {
      var dc = v.dropper ? PIP_LIQ : liq === C.clear ? 'rgba(207,224,242,0.85)' : liq;
      set(this.drop, { cx: f1(v.drops[0].x), cy: f1(v.drops[0].y), fill: dc });
    } else set(this.drop, { fill: 'none' });
    // Bottles and the wash bottle: lifted, tipped about the mouth.
    var moving = v.bottle && v.bottle.to, caps = v.caps || {};
    this.groups().forEach(function (x) {
      var b = moving && moving.key === x.key ? v.bottle : null;
      if (b) {
        var e = clamp(b.p), tx = lerp(x.mx, b.to.x, e), ty = lerp(x.my, b.to.y, e) - 40 * Math.sin(Math.PI * e), a = lerp(0, b.to.a, e);
        set(x.g, { transform: 'translate(' + f1(tx - x.mx) + ',' + f1(ty - x.my) + ') rotate(' + f1(a) + ' ' + x.mx + ' ' + x.my + ')' });
        if (x.label) set(x.label, { opacity: (1 - e).toFixed(2) });
      } else { set(x.g, { transform: '' }); if (x.label) set(x.label, { opacity: 1 }); }
      if (x.cap) set(x.cap, { opacity: (1 - clamp(b ? (b.cap ? clamp(b.p * 3) : 0) : (caps[x.key] || 0))).toFixed(2) });
    });
    // Pipette and filler.
    var pipShow = !!v.pip;
    set(sc.pipG, { display: pipShow ? 'none' : 'inline' });
    if (pipShow) {
      var P = v.pip, tr = 'translate(' + f1(P.x) + ',' + f1(P.y) + ') rotate(' + f1(P.a) + ')';
      set(this.pip, { display: 'inline', transform: tr });
      var lvl = pipLevel(v.pipVol);
      set(this.pipClip, { y: f1(lvl), height: f1(Math.max(0, 2 - lvl)) });
      set(this.pipBead, { fill: v.pipVol > 0 && v.pipVol < 0.2 ? PIP_LIQ : 'none' });
      var F = v.filler === 'on' ? null : v.filler;
      set(this.filler, { display: v.filler ? 'inline' : 'none', transform: F ? 'translate(' + f1(F.x) + ',' + f1(F.y) + ') rotate(' + f1(F.a) + ')' : tr + ' translate(0,' + PIP.top + ')' });
      set(this.fillerBulb, { transform: v.sq ? 'translate(0,-31) scale(' + (1 - 0.38 * v.sq).toFixed(3) + ',' + (1 + 0.06 * v.sq).toFixed(3) + ') translate(0,31)' : '' });
    } else { set(this.pip, { display: 'none' }); set(this.filler, { display: 'none' }); }
    // Dropper.
    Object.keys(sc.indBottles || {}).forEach(function (id) { set(sc.indBottles[id].teat, { display: v.dropper && v.dropper.ind === sc.indBottles[id] ? 'none' : 'inline' }); });
    if (v.dropper) {
      var D = v.dropper.pose;
      set(this.dropper, { display: 'inline', transform: 'translate(' + f1(D.x) + ',' + f1(D.y) + ')' });
      set(this.teat, { transform: v.dropper.sq ? 'translate(0,-12) scale(' + (1 - 0.4 * v.dropper.sq).toFixed(3) + ',1) translate(0,12)' : '' });
    } else set(this.dropper, { display: 'none' });
    // Eye.
    if (v.eye) {
      set(this.eye, { display: 'inline', transform: 'translate(' + f1(v.eye.x) + ',' + f1(v.eye.y) + ')', opacity: (v.eye.o === undefined ? 1 : v.eye.o).toFixed(2) });
      set(this.eyeLine, { x2: -15 - v.eye.len });
    } else set(this.eye, { display: 'none' });
  };

  // The flask's contents at a volume and absorbance, swirling if asked.
  Motion.prototype.paintFlask = function (v, k) {
    var sc = this.sc;
    if (v.vol <= 0.001) {
      set(sc.flLiquid, { fill: 'none', d: '' }); set(sc.flHaze, { 'fill-opacity': 0 }); set(sc.flPlume, { opacity: 0 }); set(sc.flSurface, { stroke: 'none' });
      set(sc.flaskBody, { transform: '' }); set(sc.thermo, { opacity: 0 }); set(sc.swirlMark, { opacity: 0 });
      return;
    }
    var h = B.flaskHeight(v.vol), onTile = v.tile >= 1 && Math.abs(v.fx - FX.under) < 2;
    var bg = onTile ? C.white : B.lightTheme() ? C.bgLight : C.bg;
    var clear = v.abs[0] + v.abs[1] + v.abs[2] < 0.03, col = B.liquidColour(v.abs, bg);
    var fill = clear ? (onTile ? 'rgba(200,214,230,0.55)' : C.clear) : B.rgb(col);
    var sw = v.swirl || 0, slosh = 0;
    if (sw > 0) {
      var a = v.clock / 1.2 * Math.PI * 4;
      set(sc.flaskBody, { transform: 'translate(' + (Math.cos(a) * 9 * sw).toFixed(1) + ',' + (Math.sin(a) * 2 * sw).toFixed(1) + ') rotate(' + (Math.sin(a) * 5 * sw).toFixed(1) + ' 0 -40)' });
      slosh = Math.sin(a + Math.PI / 2) * 7 * sw;
    } else set(sc.flaskBody, { transform: '' });
    set(sc.swirlMark, { opacity: sw > 0 ? (0.25 + 0.5 * sw).toFixed(2) : 0 });
    var st = slosh ? 'rotate(' + slosh.toFixed(1) + ' 0 ' + f1(-h) + ')' : '';
    set(sc.flLiquid, { d: B.flaskBand(h), fill: fill, transform: st });
    set(sc.flHaze, { d: B.flaskBand(h), transform: st, 'fill-opacity': Math.min(0.85, (v.haze || 0) * 2500).toFixed(3) });
    var r = FL.base - (FL.base - FL.neck) * h / FL.body;
    set(sc.flSurface, { x1: f1(-r + 2), x2: f1(r - 2), y1: f1(-h), y2: f1(-h), stroke: clear ? C.clearTop : B.rgb(col.map(function (c) { return c * 0.8; })) });
    if (v.plume > 0 && k.endAbs) {
      var pc = B.liquidColour(k.endAbs.map(function (x) { return Math.min(x * 3, 0.9); }), bg);
      set(sc.flPlume, { cx: 0, cy: f1(-h + 8), rx: f1(10 + 16 * v.plume), ry: f1(4 + 5 * v.plume), fill: B.rgb(pc), opacity: (0.3 + 0.6 * v.plume).toFixed(2) });
    } else set(sc.flPlume, { opacity: 0 });
    if (v.thermo) { set(sc.thermo, { opacity: 1 }); if (sc.thermoText.textContent !== Math.round(v.T) + ' °C') sc.thermoText.textContent = Math.round(v.T) + ' °C'; }
  };

  root.TitrationMotion = Motion;
})(typeof self !== 'undefined' ? self : this);
