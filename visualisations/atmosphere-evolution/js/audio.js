/* The Evolution of the Earth's Atmosphere: PROCEDURAL AUDIO
   Web Audio only, no sound files. Four layers follow the scene: volcanic
   rumble, steam hiss, waves, and birdsong. Sound is OFF until the student turns
   it on (browsers also require a click before audio can start). */
(function () {
  'use strict';
  var AE = window.AE = window.AE || {};

  AE.Audio = (function () {
    var ctx = null, master, on = false, layers = {}, birdTimer = 0, last = null;

    function noiseBuffer(type) {
      var len = ctx.sampleRate * 3, buf = ctx.createBuffer(1, len, ctx.sampleRate), d = buf.getChannelData(0), i, b = 0, w;
      for (i = 0; i < len; i++) {
        w = Math.random() * 2 - 1;
        if (type === 'brown') { b = (b + 0.02 * w) / 1.02; d[i] = b * 3.5; } else d[i] = w;
      }
      return buf;
    }
    function loop(type, filterType, freq, q) {
      var src = ctx.createBufferSource(), f = ctx.createBiquadFilter(), g = ctx.createGain();
      src.buffer = noiseBuffer(type); src.loop = true;
      f.type = filterType; f.frequency.value = freq; if (q) f.Q.value = q;
      g.gain.value = 0;
      src.connect(f); f.connect(g); g.connect(master); src.start();
      return { src: src, filter: f, gain: g };
    }
    function lfo(target, rate, depth) {
      var o = ctx.createOscillator(), g = ctx.createGain();
      o.frequency.value = rate; g.gain.value = depth; o.connect(g); g.connect(target); o.start();
    }
    function build() {
      var AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return false;
      ctx = new AC();
      master = ctx.createGain(); master.gain.value = 0.9; master.connect(ctx.destination);
      layers.rumble = loop('brown', 'lowpass', 140, 0.7);
      lfo(layers.rumble.gain.gain, 0.17, 0.06);
      layers.hiss = loop('white', 'bandpass', 4200, 0.6);
      layers.waves = loop('brown', 'lowpass', 520, 0.4);
      lfo(layers.waves.gain.gain, 0.11, 0.05);
      lfo(layers.waves.filter.frequency, 0.09, 180);
      layers.wind = loop('white', 'bandpass', 700, 0.5);
      lfo(layers.wind.filter.frequency, 0.05, 250);
      return true;
    }
    function chirp() {
      if (!ctx || !on || !last || last.phase < 4) return;   // birdsong only in the last 200 million years
      var t = ctx.currentTime, n = 2 + Math.floor(Math.random() * 4), base = 2400 + Math.random() * 1800, i;
      for (i = 0; i < n; i++) {
        var o = ctx.createOscillator(), g = ctx.createGain(), st = t + i * 0.11;
        o.type = 'sine';
        o.frequency.setValueAtTime(base, st); o.frequency.exponentialRampToValueAtTime(base * (1.3 + Math.random() * 0.5), st + 0.08);
        g.gain.setValueAtTime(0, st); g.gain.linearRampToValueAtTime(0.05 * Math.min(1, last.veg), st + 0.02); g.gain.linearRampToValueAtTime(0, st + 0.09);
        o.connect(g); g.connect(master); o.start(st); o.stop(st + 0.12);
      }
    }
    function schedule() {
      clearTimeout(birdTimer);
      if (!on) return;
      chirp();
      birdTimer = setTimeout(schedule, 900 + Math.random() * 2600);
    }
    function set(v) {
      last = v;
      if (!ctx) return;
      var t = ctx.currentTime, k = 0.25, vol = function (l, x) { l.gain.gain.setTargetAtTime(on ? x : 0, t, k); };
      vol(layers.rumble, 0.55 * v.volcano);
      vol(layers.hiss, 0.05 * (v.steam * 1.2 + v.volcano * 0.4 + v.rain * 0.6));
      vol(layers.waves, 0.22 * v.ocean * (0.5 + 0.5 * (1 - v.volcano * 0.4)));
      vol(layers.wind, 0.03 + 0.06 * v.ash);
      layers.hiss.filter.frequency.setTargetAtTime(3000 + 2500 * v.steam, t, k);
    }
    return {
      /* turn sound on or off; returns true if on. Must be called from a click. */
      toggle: function (want) {
        if (want === undefined) want = !on;
        if (want && !ctx && !build()) return false;
        on = want;
        if (ctx) { if (on && ctx.state === 'suspended') ctx.resume(); master.gain.setTargetAtTime(on ? 0.9 : 0, ctx.currentTime, 0.1); }
        if (last) set(last);
        schedule();
        return on;
      },
      update: set,
      isOn: function () { return on; }
    };
  })();
})();
