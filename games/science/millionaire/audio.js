/* Who Wants to Be a Science Millionaire? — original synthesised sound design (Web Audio API).
   No recordings, no samples and no files to go missing: every cue is built from oscillators and
   filtered noise, in D (minor for tension, major for triumph), and scaled by a 0–1 "level" that rises
   with the prize ladder so question 1 sounds approachable and the top of the ladder sounds weighty.

   Cue builders are pure functions  build(ctx, out, t0, opts) → { dur }  that work on a live
   AudioContext or an OfflineAudioContext, so tests can render every cue and measure it.
   The AudioManager owns the context, buses, bed, ducking, mute and clean-up.                     */
(function (root) {
  'use strict';
  var SSM = root.SSM = root.SSM || {};

  var NOTE = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };
  function hz(name) {            // 'F#4' → 369.99
    var m = /^([A-G])([#b]?)(-?\d)$/.exec(name);
    var semis = NOTE[m[1]] + (m[2] === '#' ? 1 : m[2] === 'b' ? -1 : 0);
    return 440 * Math.pow(2, ((semis + (+m[3] + 1) * 12) - 69) / 12);
  }
  function lcg(seed) { var s = seed >>> 0; return function () { s = (Math.imul(s, 1664525) + 1013904223) >>> 0; return s / 4294967296; }; }

  var noiseCache = new WeakMap();
  function noiseBuf(ctx) {
    var b = noiseCache.get(ctx);
    if (!b) {
      b = ctx.createBuffer(1, Math.floor(ctx.sampleRate * 2), ctx.sampleRate);
      var d = b.getChannelData(0), r = lcg(12345);
      for (var i = 0; i < d.length; i++) d[i] = r() * 2 - 1;
      noiseCache.set(ctx, b);
    }
    return b;
  }

  /* ---------- voices ---------- */
  /* A pitched voice: oscillator(s) → optional lowpass → ADSR-ish gain → out. */
  function voice(ctx, out, t, freq, dur, o) {
    o = o || {};
    var vol = o.vol == null ? 0.1 : o.vol, a = o.attack == null ? 0.01 : o.attack, rel = o.release == null ? 0.15 : o.release;
    var g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.linearRampToValueAtTime(vol, t + a);
    g.gain.setValueAtTime(vol, t + Math.max(a, dur));
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur + rel);
    var tail = g;
    if (o.lp) {
      var f = ctx.createBiquadFilter(); f.type = 'lowpass'; f.Q.value = o.q || 0.7;
      f.frequency.setValueAtTime(o.lp, t);
      if (o.lpTo) f.frequency.exponentialRampToValueAtTime(o.lpTo, t + dur);
      f.connect(g); tail = f;
    }
    g.connect(out);
    var dets = o.detune ? [-o.detune, o.detune] : [0];
    var stopAt = t + dur + rel + 0.05;
    dets.forEach(function (c) {
      var os = ctx.createOscillator();
      os.type = o.type || 'sine';
      os.detune.value = c;
      os.frequency.setValueAtTime(freq, t);
      if (o.slideTo) os.frequency.exponentialRampToValueAtTime(o.slideTo, t + (o.slideDur || dur));
      if (o.vib) {
        var lfo = ctx.createOscillator(), lg = ctx.createGain();
        lfo.frequency.value = o.vibRate || 5.5; lg.gain.value = freq * o.vib;
        lfo.connect(lg); lg.connect(os.frequency); lfo.start(t); lfo.stop(stopAt);
      }
      os.connect(tail); os.start(t); os.stop(stopAt);
    });
    return g;
  }
  /* Filtered noise burst or sweep. */
  function noise(ctx, out, t, dur, o) {
    o = o || {};
    var src = ctx.createBufferSource(); src.buffer = noiseBuf(ctx);
    var f = ctx.createBiquadFilter(); f.type = o.type || 'bandpass'; f.Q.value = o.q == null ? 0.8 : o.q;
    f.frequency.setValueAtTime(o.f0 || 1000, t);
    if (o.f1) f.frequency.exponentialRampToValueAtTime(o.f1, t + dur);
    var g = ctx.createGain(), vol = o.vol == null ? 0.1 : o.vol, a = o.attack == null ? 0.01 : o.attack;
    g.gain.setValueAtTime(0.0001, t);
    g.gain.linearRampToValueAtTime(vol, t + a);
    if (o.swell) { g.gain.linearRampToValueAtTime(vol, t + dur - 0.02); g.gain.linearRampToValueAtTime(0.0001, t + dur + (o.release || 0.05)); }
    else g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    src.connect(f); f.connect(g); g.connect(out);
    src.start(t, 0); src.stop(t + dur + (o.release || 0.05) + 0.02);
    return g;
  }
  function thump(ctx, out, t, vol, f0, f1, dur) {
    voice(ctx, out, t, f0 || 110, 0.02, { vol: vol, attack: 0.004, release: dur || 0.28, slideTo: f1 || 38, slideDur: dur || 0.28 });
  }
  /* Bell: inharmonic partials with separate decays. */
  function bell(ctx, out, t, freq, vol, dur) {
    dur = dur || 1.4;
    [[1, 1], [2.76, 0.45], [5.4, 0.22], [8.93, 0.1]].forEach(function (p, i) {
      voice(ctx, out, t, freq * p[0], 0.005, { vol: vol * p[1], attack: 0.003, release: dur / (1 + i * 0.7) });
    });
  }
  /* Brass-ish chord: detuned saws through a lowpass that opens. */
  function brass(ctx, out, t, notes, dur, vol, o) {
    o = o || {};
    notes.forEach(function (n) {
      voice(ctx, out, t, hz(n), dur, { type: 'sawtooth', vol: vol / Math.sqrt(notes.length), attack: o.attack == null ? 0.05 : o.attack, release: o.release || 0.5,
        detune: 6, lp: o.lp || 900, lpTo: o.lpTo || 2400, q: 0.9, vib: o.vib == null ? 0.004 : o.vib, vibRate: 5.2 });
    });
  }
  function pad(ctx, out, t, notes, dur, vol, type) {
    notes.forEach(function (n) { voice(ctx, out, t, hz(n), dur, { type: type || 'triangle', vol: vol / notes.length, attack: dur * 0.3, release: dur * 0.5, detune: 4, lp: 1800 }); });
  }

  /* ---------- cues ---------- */
  var CUES = {};

  CUES.intro = { channel: 'sting', duck: 1, build: function (c, out, t) {
    // a slow, rising dread: low drone, accelerating pulse, riser, then an ascending D minor figure and a big hit
    voice(c, out, t, hz('D2'), 6.0, { type: 'sawtooth', vol: 0.2, attack: 2.5, release: 0.8, lp: 140, lpTo: 900, detune: 5 });
    voice(c, out, t, hz('A2'), 6.0, { type: 'sawtooth', vol: 0.1, attack: 3, release: 0.8, lp: 140, lpTo: 1000, detune: 7 });
    noise(c, out, t + 1.0, 5.0, { f0: 300, f1: 5200, vol: 0.1, attack: 3.5, swell: true, release: 0.1, q: 1.2 });
    var beats = [], x = 0.5;
    while (x < 3.6) { beats.push(x); x += 0.5; }
    while (x < 5.8) { beats.push(x); x += 0.25; }
    beats.forEach(function (b, i) { thump(c, out, t + b, 0.16 + 0.22 * (i / beats.length), 100, 42, 0.22); });
    ['D4', 'F4', 'A4', 'D5'].forEach(function (n, i) { brass(c, out, t + 3.7 + i * 0.5, [n, i < 3 ? 'D3' : 'A3'], 0.4, 0.12 + i * 0.02, { lp: 700, lpTo: 1800, attack: 0.04 }); });
    brass(c, out, t + 6.0, ['D3', 'A3', 'D4', 'F4', 'A4'], 1.4, 0.34, { lp: 1200, lpTo: 3200, release: 1.2 });
    noise(c, out, t + 6.0, 1.6, { type: 'highpass', f0: 5000, vol: 0.06, attack: 0.02 });
    thump(c, out, t + 6.0, 0.55, 90, 36, 0.7);
    bell(c, out, t + 6.05, hz('D6'), 0.06, 2.2);
    return { dur: 8.2 };
  } };

  CUES.questionIn = { channel: 'ui', build: function (c, out, t, o) {
    var lv = o.level || 0;
    noise(c, out, t, 0.5, { f0: 500, f1: 2600, vol: 0.045, attack: 0.18, q: 0.9 });
    voice(c, out, t + 0.02, hz('A4') * (1 + lv * 0.06), 0.1, { type: 'triangle', vol: 0.09, release: 0.25 });
    voice(c, out, t + 0.14, hz('D5') * (1 + lv * 0.06), 0.1, { type: 'triangle', vol: 0.08, release: 0.35 });
    return { dur: 0.7 };
  } };

  CUES.select = { channel: 'ui', build: function (c, out, t) {
    voice(c, out, t, 720, 0.03, { type: 'triangle', vol: 0.15, attack: 0.003, release: 0.09 });
    voice(c, out, t, 1080, 0.02, { type: 'sine', vol: 0.09, attack: 0.003, release: 0.07 });
    return { dur: 0.15 };
  } };

  CUES.deselect = { channel: 'ui', build: function (c, out, t) {
    voice(c, out, t, 520, 0.03, { type: 'triangle', vol: 0.1, attack: 0.003, release: 0.08 });
    return { dur: 0.12 };
  } };

  CUES.lock = { channel: 'sting', duck: 1, build: function (c, out, t, o) {
    var lv = o.level || 0;
    thump(c, out, t, 0.36 + 0.24 * lv, 120, 36, 0.4);
    noise(c, out, t, 0.2, { type: 'lowpass', f0: 1800, f1: 300, vol: 0.14 + 0.08 * lv, attack: 0.004 });
    bell(c, out, t + 0.02, hz('D5'), 0.05 + 0.03 * lv, 1.0);
    bell(c, out, t + 0.02, hz('Ab4'), 0.03 + 0.03 * lv, 0.9);
    voice(c, out, t + 0.05, hz('D2'), 0.5, { type: 'sawtooth', vol: 0.08 + 0.08 * lv, attack: 0.05, release: 0.6, lp: 260 });
    return { dur: 1.3 };
  } };

  /* The build-up between locking and the reveal. opts.secs sets its length. */
  CUES.suspense = { channel: 'sting', build: function (c, out, t, o) {
    var lv = o.level || 0, d = o.secs || 2.4, vol = 0.1 + 0.1 * lv;
    // tense, slightly dissonant string cluster with accelerating tremolo and an opening filter
    ['D3', 'A3', 'Eb4'].forEach(function (n, i) {
      var g = c.createGain(); g.gain.setValueAtTime(0.0001, t);
      g.gain.linearRampToValueAtTime(vol / 2, t + d * 0.7);
      g.gain.setValueAtTime(vol / 2, t + d - 0.07); g.gain.linearRampToValueAtTime(0.0001, t + d);
      var f = c.createBiquadFilter(); f.type = 'lowpass'; f.Q.value = 1.2;
      f.frequency.setValueAtTime(380, t); f.frequency.exponentialRampToValueAtTime(2400 + 800 * lv, t + d);
      var trem = c.createGain(); trem.gain.value = 0.7;
      var lfo = c.createOscillator(), lg = c.createGain();
      lfo.frequency.setValueAtTime(5, t); lfo.frequency.linearRampToValueAtTime(15, t + d);
      lg.gain.value = 0.3; lfo.connect(lg); lg.connect(trem.gain); lfo.start(t); lfo.stop(t + d + 0.1);
      [-8, 8].forEach(function (cents) {
        var os = c.createOscillator(); os.type = 'sawtooth'; os.detune.value = cents; os.frequency.value = hz(n);
        os.connect(f); os.start(t); os.stop(t + d + 0.1);
      });
      f.connect(trem); trem.connect(g); g.connect(out);
    });
    var gap = 0.7, x = 0.15, k = 0;
    while (x < d - 0.2) { thump(c, out, t + x, 0.14 + 0.16 * (x / d) + 0.1 * lv, 90, 40, 0.18); x += gap; gap = Math.max(0.26, gap * 0.82); k++; }
    noise(c, out, t, d, { f0: 600, f1: 6000 + 2000 * lv, vol: 0.05 + 0.04 * lv, attack: d * 0.6, swell: true, release: 0.04, q: 1.5 });
    return { dur: d };
  } };

  CUES.correct = { channel: 'sting', duck: 1, build: function (c, out, t, o) {
    var lv = o.level || 0;
    ['D4', 'F#4', 'A4', 'D5'].forEach(function (n, i) {
      voice(c, out, t + i * 0.085, hz(n), 0.12, { type: 'triangle', vol: 0.11, release: 0.5 });
      voice(c, out, t + i * 0.085, hz(n) * 2, 0.06, { type: 'sine', vol: 0.03, release: 0.4 });
    });
    pad(c, out, t + 0.05, ['D3', 'A3', 'D4', 'F#4'], 1.0, 0.12 + 0.08 * lv);
    bell(c, out, t + 0.34, hz('A5'), 0.05 + 0.03 * lv, 1.2);
    if (lv > 0.25) brass(c, out, t + 0.12, ['D3', 'A3', 'D4', 'F#4'], 0.6 + lv * 0.5, 0.1 + 0.2 * lv, { attack: 0.05, lp: 700, lpTo: 2200 });
    if (lv > 0.6) {
      ['A4', 'D5', 'F#5', 'A5'].forEach(function (n, i) { voice(c, out, t + 0.45 + i * 0.07, hz(n), 0.1, { type: 'triangle', vol: 0.07, release: 0.6 }); });
      noise(c, out, t + 0.1, 1.0, { type: 'highpass', f0: 6000, vol: 0.04, attack: 0.3, swell: true, release: 0.4 });
    }
    thump(c, out, t, 0.2 + 0.2 * lv, 100, 45, 0.3);
    return { dur: 1.4 + lv * 0.9 };
  } };

  CUES.wrong = { channel: 'sting', duck: 1, build: function (c, out, t, o) {
    var lv = o.level || 0;
    thump(c, out, t, 0.42, 90, 32, 0.6);
    // a dull, low minor-second cluster that darkens and fades; then a falling line
    ['D2', 'Eb2'].forEach(function (n) { voice(c, out, t, hz(n), 1.2, { type: 'sawtooth', vol: 0.09 + 0.04 * lv, attack: 0.25, release: 1.0, lp: 300, lpTo: 160 }); });
    ['A3', 'F3', 'D3'].forEach(function (n, i) { voice(c, out, t + 0.15 + i * 0.5, hz(n), 0.35, { type: 'triangle', vol: 0.08, attack: 0.04, release: 0.8, lp: 900 }); });
    noise(c, out, t, 1.8, { type: 'lowpass', f0: 700, f1: 120, vol: 0.07, attack: 0.1 });
    return { dur: 2.6 };
  } };

  CUES.safe = { channel: 'sting', duck: 1, build: function (c, out, t, o) {
    var r = lcg(77);
    for (var i = 0; i < 9; i++) thump(c, out, t + i * 0.045, 0.1 + i * 0.012, 140, 70, 0.14);
    [['A4', 0], ['D5', 0.2], ['F#5', 0.4], ['A5', 0.62]].forEach(function (p, i) {
      brass(c, out, t + p[1], [p[0], i === 3 ? 'D5' : p[0]], i === 3 ? 1.2 : 0.2, 0.2, { lp: 1100, lpTo: 3600, attack: 0.03, release: 0.6 });
    });
    brass(c, out, t + 0.62, ['D3', 'A3', 'F#4'], 1.2, 0.28, { lp: 800, lpTo: 2400, release: 0.9 });
    thump(c, out, t + 0.62, 0.45, 100, 40, 0.5);
    noise(c, out, t + 0.6, 1.4, { type: 'highpass', f0: 5500, vol: 0.05, attack: 0.02 });
    for (var k = 0; k < 8; k++) bell(c, out, t + 0.7 + k * 0.1 + r() * 0.05, hz(['D6', 'F#6', 'A6', 'E6'][Math.floor(r() * 4)]), 0.035, 1.0);
    return { dur: 2.8 };
  } };

  CUES.walk = { channel: 'sting', duck: 1, build: function (c, out, t) {
    ['G4', 'B4', 'D5'].forEach(function (n, i) { voice(c, out, t + i * 0.12, hz(n), 0.15, { type: 'triangle', vol: 0.1, release: 0.5 }); });
    pad(c, out, t + 0.1, ['G3', 'B3', 'D4', 'G4'], 1.0, 0.16);
    pad(c, out, t + 1.0, ['D3', 'A3', 'D4', 'F#4'], 1.4, 0.18);
    voice(c, out, t + 1.0, hz('D2'), 1.2, { type: 'sine', vol: 0.12, attack: 0.1, release: 1.0 });
    bell(c, out, t + 1.05, hz('D5'), 0.06, 1.6);
    bell(c, out, t + 1.25, hz('A5'), 0.045, 1.6);
    return { dur: 3.0 };
  } };

  CUES.million = { channel: 'sting', duck: 1, build: function (c, out, t) {
    var r = lcg(2024);
    for (var i = 0; i < 24; i++) thump(c, out, t + i * 0.1, 0.08 + 0.012 * i, 140, 70, 0.12);        // timpani roll
    noise(c, out, t, 2.5, { f0: 400, f1: 7000, vol: 0.09, attack: 1.8, swell: true, release: 0.1, q: 1.0 });
    voice(c, out, t, hz('D2'), 2.6, { type: 'sawtooth', vol: 0.14, attack: 1.8, release: 0.3, lp: 180, lpTo: 1200 });
    // fanfare
    [['D5', 2.5, 0.3], ['F#5', 2.85, 0.3], ['A5', 3.2, 0.3], ['D6', 3.55, 1.5]].forEach(function (p, i) {
      brass(c, out, t + p[1], [p[0], i === 3 ? 'D5' : p[0]], p[2], 0.24, { lp: 1300, lpTo: 4200, attack: 0.03, release: 0.5 });
    });
    [['D3', 'A3', 'F#4'], ['G3', 'B3', 'D4'], ['A3', 'C#4', 'E4'], ['D3', 'A3', 'D4', 'F#4']].forEach(function (ch, i) {
      brass(c, out, t + 2.5 + i * 0.35, ch, i === 3 ? 1.5 : 0.32, 0.26, { lp: 900, lpTo: 2600, release: 0.7 });
    });
    thump(c, out, t + 2.5, 0.5, 100, 36, 0.6);
    thump(c, out, t + 3.55, 0.6, 100, 34, 0.9);
    // running arpeggio over a pedal
    var scale = ['D4', 'F#4', 'A4', 'D5', 'E5', 'F#5', 'A5', 'D6', 'F#6', 'A6'];
    for (var k = 0; k < 28; k++) {
      var idx = (k % 7) + Math.floor(k / 7);
      bell(c, out, t + 5.2 + k * 0.095, hz(scale[Math.min(idx, scale.length - 1)]), 0.045, 0.9);
    }
    pad(c, out, t + 5.0, ['D3', 'A3', 'D4', 'F#4'], 3.5, 0.2);
    noise(c, out, t + 5.0, 3.2, { type: 'highpass', f0: 6500, vol: 0.05, attack: 2.0, swell: true, release: 0.3 });
    // final chord
    brass(c, out, t + 8.4, ['D3', 'A3', 'D4', 'F#4', 'A4', 'D5'], 2.6, 0.42, { lp: 1500, lpTo: 4500, attack: 0.04, release: 1.6 });
    thump(c, out, t + 8.4, 0.65, 90, 32, 1.0);
    noise(c, out, t + 8.4, 2.4, { type: 'highpass', f0: 4800, vol: 0.07, attack: 0.02 });
    for (var j = 0; j < 22; j++) bell(c, out, t + 8.5 + j * 0.13 + r() * 0.06, hz(['D6', 'F#6', 'A6', 'E6', 'B5'][Math.floor(r() * 5)]), 0.032, 1.3);
    return { dur: 12.2 };
  } };

  CUES.gameover = { channel: 'sting', duck: 1, build: function (c, out, t) {
    voice(c, out, t, hz('D2'), 3.2, { type: 'sawtooth', vol: 0.14, attack: 1.0, release: 1.2, lp: 700, lpTo: 130, detune: 5 });
    voice(c, out, t, hz('A2'), 3.2, { type: 'sine', vol: 0.1, attack: 1.0, release: 1.2 });
    noise(c, out, t, 3.5, { type: 'lowpass', f0: 900, f1: 150, vol: 0.06, attack: 1.0, swell: true, release: 0.8 });
    [['F5', 0.5], ['D5', 1.3], ['A4', 2.1]].forEach(function (p) { bell(c, out, t + p[1], hz(p[0]), 0.05, 2.0); });
    return { dur: 5.2 };
  } };

  CUES.fifty = { channel: 'ui', build: function (c, out, t) {
    [0, 0.13].forEach(function (d, i) { voice(c, out, t + d, 1500 - i * 300, 0.05, { type: 'triangle', vol: 0.09, release: 0.12, slideTo: 380, slideDur: 0.16 }); });
    bell(c, out, t + 0.28, 1760, 0.04, 0.7);
    thump(c, out, t, 0.12, 120, 60, 0.15);
    return { dur: 1.0 };
  } };
  CUES.audience = { channel: 'ui', build: function (c, out, t) {
    ['C5', 'E5', 'G5', 'A5', 'D6'].forEach(function (n, i) { voice(c, out, t + i * 0.09, hz(n), 0.05, { type: 'triangle', vol: 0.07, release: 0.3 }); });
    noise(c, out, t, 0.6, { type: 'bandpass', f0: 1800, f1: 3500, vol: 0.03, attack: 0.3, q: 0.6 });
    return { dur: 0.9 };
  } };
  CUES.phoneRing = { channel: 'ui', build: function (c, out, t) {
    [0, 0.6].forEach(function (d) {
      [440, 480].forEach(function (f) {
        voice(c, out, t + d, f, 0.4, { type: 'sine', vol: 0.05, attack: 0.02, release: 0.03 });
        voice(c, out, t + d, f * 2, 0.4, { type: 'sine', vol: 0.012, attack: 0.02, release: 0.03 });
      });
    });
    return { dur: 1.3 };
  } };
  CUES.phonePick = { channel: 'ui', build: function (c, out, t) {
    noise(c, out, t, 0.04, { f0: 2500, vol: 0.09, q: 0.7 });
    thump(c, out, t, 0.14, 160, 80, 0.08);
    return { dur: 0.2 };
  } };
  CUES.phoneEnd = { channel: 'ui', build: function (c, out, t) {
    voice(c, out, t, 480, 0.1, { type: 'sine', vol: 0.05, release: 0.08 });
    voice(c, out, t + 0.14, 380, 0.12, { type: 'sine', vol: 0.05, release: 0.1 });
    return { dur: 0.4 };
  } };
  CUES.tick = { channel: 'ui', build: function (c, out, t) {
    voice(c, out, t, 1500, 0.01, { type: 'sine', vol: 0.035, attack: 0.002, release: 0.04 });
    return { dur: 0.1 };
  } };
  CUES.warn = { channel: 'ui', build: function (c, out, t) {   // walk-away prompt
    voice(c, out, t, hz('A3'), 0.1, { type: 'triangle', vol: 0.08, release: 0.3 });
    voice(c, out, t + 0.12, hz('D4'), 0.1, { type: 'triangle', vol: 0.07, release: 0.4 });
    return { dur: 0.6 };
  } };

  /* How long the build-up lasts for a given level: short and brisk early, a little longer near the top. */
  function suspenseSecs(level) { return 1.5 + 2.2 * Math.pow(Math.max(0, Math.min(1, level)), 1.3); }

  /* The shared output chain: three buses → compressor → master gain → limiter → destination.
     Used live by the manager and offline by the tests, so what is measured is what is heard. */
  function makeChain(c, volume) {
    var comp = c.createDynamicsCompressor();
    comp.threshold.value = -20; comp.knee.value = 14; comp.ratio.value = 4; comp.attack.value = 0.005; comp.release.value = 0.25;
    var limiter = c.createDynamicsCompressor();
    limiter.threshold.value = -3; limiter.knee.value = 0; limiter.ratio.value = 20; limiter.attack.value = 0.001; limiter.release.value = 0.1;
    var master = c.createGain(); master.gain.value = volume;
    var sting = c.createGain(), ui = c.createGain(), bed = c.createGain();
    sting.connect(comp); ui.connect(comp); bed.connect(comp);
    comp.connect(master); master.connect(limiter); limiter.connect(c.destination);
    return { comp: comp, limiter: limiter, master: master, sting: sting, ui: ui, bed: bed };
  }

  /* ---------- the manager ---------- */
  function AudioManager() {
    this.ctx = null; this.ready = false; this.muted = false; this.unavailable = false;
    this.active = [];               // { name, group, end }
    this.bed = null; this.bedWanted = null; this.bedLevel = 0;
    this.last = {};
    this.log = [];                  // cue names played, for tests
    this.volume = 0.62;
    this.clock = function () { return (root.performance && root.performance.now ? root.performance.now() : Date.now()) / 1000; };   // wall clock for double-fire protection (the audio clock stops while the tab is hidden)
  }
  var P = AudioManager.prototype;

  /* Create the context. Call from a user gesture (the Start button). Safe to call repeatedly. */
  P.init = function () {
    if (this.unavailable) return false;
    try {
      if (!this.ctx) {
        var AC = root.AudioContext || root.webkitAudioContext;
        if (!AC) { this.unavailable = true; return false; }
        var c = this.ctx = new AC();
        var ch = makeChain(c, this.muted ? 0 : this.volume);
        this.comp = ch.comp; this.limiter = ch.limiter; this.master = ch.master;
        this.analyser = c.createAnalyser(); this.analyser.fftSize = 1024;
        this.stingBus = ch.sting; this.uiBus = ch.ui; this.bedBus = ch.bed;
        this.limiter.connect(this.analyser);
      }
      if (this.ctx.state === 'suspended') { var p = this.ctx.resume(); if (p && p.catch) p.catch(function () {}); }
      this.ready = true;
      return true;
    } catch (e) { this.unavailable = true; this.ready = false; return false; }
  };

  P.peak = function () {         // current output peak 0–1, for tests
    if (!this.analyser) return 0;
    var d = new Float32Array(this.analyser.fftSize); this.analyser.getFloatTimeDomainData(d);
    var m = 0; for (var i = 0; i < d.length; i++) m = Math.max(m, Math.abs(d[i]));
    return m;
  };

  P.setMuted = function (m) {
    this.muted = !!m;
    if (!this.ctx) return;
    var t = this.ctx.currentTime;
    try {
      this.master.gain.cancelScheduledValues(t);
      this.master.gain.setTargetAtTime(this.muted ? 0 : this.volume, t, 0.012);
    } catch (e) {}
    if (this.muted) { this._killBed(0.02); this._stopCues(0.03); }
    else if (this.bedWanted != null) this.startBed(this.bedWanted);
  };

  /* Play a cue. Returns its duration in seconds, or 0 if nothing played. */
  P.play = function (name, opts) {
    opts = opts || {};
    var def = CUES[name];
    if (!def || !this.ready || this.muted || !this.ctx) return 0;
    try {
      var c = this.ctx, now = c.currentTime, wall = this.clock();
      if (this.last[name] != null && wall - this.last[name] < (opts.minGap == null ? 0.06 : opts.minGap)) return 0;   // no double-fires
      this.last[name] = wall;
      if (def.channel === 'sting' && !opts.layer) this._stopCues(0.1, 'sting');
      var group = c.createGain();
      group.connect(def.channel === 'sting' ? this.stingBus : this.uiBus);
      var info = def.build(c, group, now + 0.015, opts);
      var entry = { name: name, group: group, channel: def.channel, end: now + info.dur + 0.1 };
      this.active.push(entry);
      this.log.push(name);
      if (def.duck) this._duck(info.dur);
      this._gc();
      return info.dur;
    } catch (e) { return 0; }
  };

  P._gc = function () { var now = this.ctx.currentTime; this.active = this.active.filter(function (a) { return a.end > now; }); };

  /* Fade out every cue (or just one channel). */
  P._stopCues = function (fade, channel) {
    if (!this.ctx) return;
    var t = this.ctx.currentTime;
    this.active = this.active.filter(function (a) {
      if (channel && a.channel !== channel) return true;
      try { a.group.gain.cancelScheduledValues(t); a.group.gain.setValueAtTime(a.group.gain.value, t); a.group.gain.linearRampToValueAtTime(0, t + fade); } catch (e) {}
      return false;
    });
  };

  /* Lower the background bed while an important cue plays. */
  P._duck = function (dur) {
    if (!this.bedBus) return;
    var t = this.ctx.currentTime, g = this.bedBus.gain;
    try {
      g.cancelScheduledValues(t);
      g.setValueAtTime(g.value, t);
      g.linearRampToValueAtTime(0.18, t + 0.12);
      g.setValueAtTime(0.18, t + Math.max(0.15, dur - 0.2));
      g.linearRampToValueAtTime(1, t + dur + 0.9);
    } catch (e) {}
  };

  /* ---- Thinking bed: low drone + heartbeat pulse; gets faster, brighter and fuller with level (0–1). ---- */
  P.startBed = function (level) {
    this.bedWanted = level; this.bedLevel = level;
    if (!this.ready || this.muted) return;
    if (this.bed) { this.setBedLevel(level); return; }
    try {
      var c = this.ctx, t = c.currentTime, out = c.createGain();
      out.gain.setValueAtTime(0.0001, t); out.gain.linearRampToValueAtTime(0.5, t + 1.2);
      out.connect(this.bedBus);
      var lp = c.createBiquadFilter(); lp.type = 'lowpass'; lp.Q.value = 1.1; lp.frequency.value = 200 + 600 * level;
      lp.connect(out);
      var nodes = [];
      [['D2', 'sawtooth', 0], ['A2', 'sawtooth', 7], ['D1', 'sine', 0]].forEach(function (s) {
        var os = c.createOscillator(); os.type = s[1]; os.frequency.value = hz(s[0]); os.detune.value = s[2];
        var g = c.createGain(); g.gain.value = s[1] === 'sine' ? 0.5 : 0.22;
        os.connect(g); g.connect(lp); os.start(t); nodes.push(os);
      });
      var lfo = c.createOscillator(), lg = c.createGain(); lfo.frequency.value = 0.09; lg.gain.value = 110;
      lfo.connect(lg); lg.connect(lp.frequency); lfo.start(t); nodes.push(lfo);
      // upper strings arrive as the stakes rise
      var up = c.createGain(); up.gain.value = 0.0001; up.connect(out);
      var upf = c.createBiquadFilter(); upf.type = 'lowpass'; upf.frequency.value = 1100; upf.connect(up);
      var trem = c.createOscillator(), tg = c.createGain(); trem.frequency.value = 6; tg.gain.value = 0.35; trem.connect(tg); tg.connect(up.gain); trem.start(t); nodes.push(trem);
      ['F3', 'A3', 'D4'].forEach(function (n, i) {
        var os = c.createOscillator(); os.type = 'sawtooth'; os.frequency.value = hz(n); os.detune.value = (i - 1) * 6;
        os.connect(upf); os.start(t); nodes.push(os);
      });
      var bed = this.bed = { out: out, lp: lp, up: up, nodes: nodes, timer: null, nextBeat: t + 0.3, level: level, mgr: this, beat: 0 };
      this.setBedLevel(level);
      var mgr = this;
      bed.timer = setInterval(function () {      // schedule heartbeat pulses a little ahead of time
        if (mgr.bed !== bed) return;
        var now = mgr.ctx.currentTime;
        var bpm = 52 + 36 * bed.level, step = 60 / bpm;
        while (bed.nextBeat < now + 0.5) {
          var b = bed.nextBeat, v = 0.2 + 0.2 * bed.level;
          thump(mgr.ctx, bed.out, b, v, 80, 40, 0.2);
          thump(mgr.ctx, bed.out, b + step * 0.22, v * 0.55, 80, 40, 0.16);
          if (bed.level > 0.45) noise(mgr.ctx, bed.out, b + step * 0.5, 0.05, { type: 'highpass', f0: 7000, vol: 0.02 + 0.03 * bed.level });
          bed.nextBeat += step;
        }
      }, 120);
    } catch (e) { this.bed = null; }
  };
  P.setBedLevel = function (level) {
    this.bedLevel = level; this.bedWanted = level;
    var b = this.bed; if (!b) return;
    b.level = level;
    var t = this.ctx.currentTime;
    try {
      b.lp.frequency.setTargetAtTime(220 + 700 * level, t, 0.8);
      b.up.gain.setTargetAtTime(Math.max(0.0001, level > 0.3 ? (level - 0.3) * 0.16 : 0.0001), t, 0.8);
    } catch (e) {}
  };
  P._killBed = function (fade) {
    var b = this.bed; if (!b) return;
    this.bed = null;
    clearInterval(b.timer);
    try {
      var t = this.ctx.currentTime;
      b.out.gain.cancelScheduledValues(t); b.out.gain.setValueAtTime(b.out.gain.value, t); b.out.gain.linearRampToValueAtTime(0.0001, t + fade);
      b.nodes.forEach(function (n) { try { n.stop(t + fade + 0.05); } catch (e) {} });
    } catch (e) {}
  };
  P.stopBed = function (fade) { this.bedWanted = null; this._killBed(fade == null ? 0.6 : fade); };

  /* Quiet everything (game exit, restart, page hide). */
  P.stopAll = function (fade) {
    fade = fade == null ? 0.25 : fade;
    this.bedWanted = null;
    this._killBed(fade);
    this._stopCues(fade);
    if (this.bedBus && this.ctx) { try { var t = this.ctx.currentTime; this.bedBus.gain.cancelScheduledValues(t); this.bedBus.gain.setValueAtTime(1, t + fade); } catch (e) {} }
  };

  SSM.audio = { AudioManager: AudioManager, CUES: CUES, makeChain: makeChain, suspenseSecs: suspenseSecs, hz: hz, create: function () { return new AudioManager(); } };
})(typeof window !== 'undefined' ? window : globalThis);
