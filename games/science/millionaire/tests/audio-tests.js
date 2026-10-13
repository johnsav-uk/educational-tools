/* Audio tests (browser only): render every cue offline through the same output chain the game uses,
   then measure it. Returns a promise of  { results: [...], table: [...] }. */
(function (root) {
  'use strict';
  var SSM = root.SSM;
  var SR = 44100;

  function analyse(buf) {
    var d = buf.getChannelData(0), n = d.length, peak = 0, sum = 0, nan = 0, firstSound = -1, lastSound = -1;
    for (var i = 0; i < n; i++) {
      var v = d[i];
      if (v !== v) { nan++; continue; }
      var a = Math.abs(v); if (a > peak) peak = a; sum += v * v;
      if (a > 0.005) { if (firstSound < 0) firstSound = i; lastSound = i; }
    }
    // rms over the audible span only, and of the last 150 ms
    var span = Math.max(1, lastSound - firstSound), tailN = Math.floor(SR * 0.15), ts = 0;
    for (var j = Math.max(0, n - tailN); j < n; j++) ts += d[j] * d[j];
    var tailRms = Math.sqrt(ts / tailN);
    var spanSum = 0; for (var k = Math.max(0, firstSound); k <= lastSound; k++) spanSum += d[k] * d[k];
    return { peak: peak, rms: Math.sqrt(spanSum / span), tailRms: tailRms, nan: nan, seconds: lastSound < 0 ? 0 : (lastSound - firstSound) / SR, firstSound: firstSound / SR, rawRms: Math.sqrt(sum / n) };
  }
  function db(x) { return x > 0 ? 20 * Math.log10(x) : -Infinity; }

  function render(name, opts, secs) {
    var ctx = new OfflineAudioContext(2, Math.ceil(SR * secs), SR);
    var chain = SSM.audio.makeChain(ctx, 0.85);
    var def = SSM.audio.CUES[name];
    var g = ctx.createGain(); g.connect(def.channel === 'sting' ? chain.sting : chain.ui);
    var info = def.build(ctx, g, 0.015, opts || {});
    return ctx.startRendering().then(function (buf) { var a = analyse(buf); a.dur = info.dur; return a; });
  }

  root.SSM_AUDIO_TESTS = function (T) {
    var names = Object.keys(SSM.audio.CUES), out = {};
    var chain = Promise.resolve();
    names.forEach(function (n) {
      chain = chain.then(function () { return render(n, { level: 0.5, secs: 3 }, (n === 'million' ? 13.5 : n === 'intro' ? 9 : 5)); }).then(function (a) { out[n] = a; });
    });
    var levels = {};
    chain = chain.then(function () { return render('correct', { level: 0 }, 4); }).then(function (a) { levels.c0 = a; })
      .then(function () { return render('correct', { level: 1 }, 4); }).then(function (a) { levels.c1 = a; })
      .then(function () { return render('lock', { level: 0 }, 3); }).then(function (a) { levels.l0 = a; })
      .then(function () { return render('lock', { level: 1 }, 3); }).then(function (a) { levels.l1 = a; })
      .then(function () { return render('suspense', { level: 0, secs: SSM.audio.suspenseSecs(0) }, 6); }).then(function (a) { levels.s0 = a; })
      .then(function () { return render('suspense', { level: 1, secs: SSM.audio.suspenseSecs(1) }, 6); }).then(function (a) { levels.s1 = a; });
    // the thinking bed, rendered through the bed bus at the same 0.4 level the manager uses
    function renderBed(level, rush, secs) {
      var ctx = new OfflineAudioContext(2, Math.ceil(SR * secs), SR);
      var chain = SSM.audio.makeChain(ctx, 0.85);
      var g = ctx.createGain(); g.gain.value = 0.4; g.connect(chain.bed);
      SSM.audio.renderBed(ctx, g, 0.015, secs - 0.4, level, rush);
      return ctx.startRendering().then(function (buf) {
        var a = analyse(buf), d = buf.getChannelData(0), zc = 0;
        for (var i = 1; i < d.length; i++) if ((d[i - 1] < 0) !== (d[i] < 0)) zc++;
        a.brightness = zc / (d.length / SR);    // zero crossings per second: a rough measure of brightness
        return a;
      });
    }
    var bed = {};
    chain = chain.then(function () { return renderBed(0, 0, 6); }).then(function (a) { bed.b0 = a; })
      .then(function () { return renderBed(0.5, 0, 6); }).then(function (a) { bed.b5 = a; })
      .then(function () { return renderBed(1, 0, 6); }).then(function (a) { bed.b1 = a; })
      .then(function () { return renderBed(1, 1, 5); }).then(function (a) { bed.rush = a; });

    return chain.then(function () {
      T.test('the thinking bed plays cleanly at every level and sits under the stingers', function () {
        ['b0', 'b5', 'b1', 'rush'].forEach(function (k) {
          var a = bed[k];
          T.ok(a.nan === 0, k + ' NaN');
          T.ok(a.rms > 0.004, k + ' bed is silent (rms ' + a.rms.toFixed(4) + ')');
          T.ok(a.peak < 0.98, k + ' bed clips (peak ' + a.peak.toFixed(3) + ')');
          T.ok(a.tailRms < 0.01, k + ' bed does not stop cleanly');
        });
        var loudestSting = Math.max.apply(null, names.filter(function (n) { return SSM.audio.CUES[n].channel === 'sting'; }).map(function (n) { return db(out[n].rms); }));
        T.ok(db(bed.b1.rms) < loudestSting - 4, 'bed at the top ' + db(bed.b1.rms).toFixed(1) + ' dB is not well under the stingers (' + loudestSting.toFixed(1) + ')');
      });
      T.test('the bed tightens up the ladder: faster, brighter and fuller at the top, and again in the run-up to a reveal', function () {
        T.ok(SSM.audio.bedBpm(1) > SSM.audio.bedBpm(0) && SSM.audio.bedBpm(1, 1) > SSM.audio.bedBpm(1), 'tempo rises');
        T.ok(bed.b1.brightness > bed.b0.brightness, 'brighter at the top (' + Math.round(bed.b0.brightness) + ' → ' + Math.round(bed.b1.brightness) + ' crossings/s)');
        T.ok(bed.b1.rms > bed.b0.rms && bed.b5.rms > bed.b0.rms, 'fuller at the top (' + db(bed.b0.rms).toFixed(1) + ' → ' + db(bed.b5.rms).toFixed(1) + ' → ' + db(bed.b1.rms).toFixed(1) + ' dB)');
        T.ok(bed.rush.rms > bed.b1.rms, 'the run-up to a reveal is bigger than the bed at rest');
      });

      var table = names.map(function (n) { var a = out[n]; return { cue: n, channel: SSM.audio.CUES[n].channel, seconds: +a.seconds.toFixed(2), peakDb: +db(a.peak).toFixed(1), rmsDb: +db(a.rms).toFixed(1), tailDb: +db(a.tailRms).toFixed(1), nan: a.nan }; });

      T.test('every cue makes sound, with no NaN samples', function () {
        names.forEach(function (n) { T.ok(out[n].nan === 0, n + ' NaN'); T.ok(out[n].rms > 0.003, n + ' is silent (rms ' + out[n].rms + ')'); });
      });
      T.test('no cue clips after the compressor and limiter', function () {
        names.forEach(function (n) { T.ok(out[n].peak < 0.98, n + ' peak ' + out[n].peak.toFixed(3)); });
      });
      T.test('every cue ends cleanly (no abrupt cut-off into silence-level click)', function () {
        names.forEach(function (n) { T.ok(out[n].tailRms < 0.01, n + ' tail rms ' + out[n].tailRms.toFixed(4)); });
      });
      T.test('stingers sit within a sensible loudness range; interface sounds are quieter than stingers', function () {
        var st = names.filter(function (n) { return SSM.audio.CUES[n].channel === 'sting'; }).map(function (n) { return db(out[n].rms); });
        var ui = names.filter(function (n) { return SSM.audio.CUES[n].channel === 'ui'; }).map(function (n) { return db(out[n].rms); });
        var max = Math.max.apply(null, st), min = Math.min.apply(null, st);
        T.ok(max - min < 14, 'sting spread ' + (max - min).toFixed(1) + ' dB');
        T.ok(max < -8, 'loudest sting rms ' + max.toFixed(1) + ' dBFS is too hot');
        T.ok(Math.max.apply(null, ui) < max, 'interface cues are quieter than the loudest sting');
      });
      T.test('durations: the million-pound cue is extended; ordinary cues are short', function () {
        T.ok(out.million.dur > 10, 'million ' + out.million.dur);
        T.ok(out.correct.dur < 3 && out.select.dur < 0.3 && out.questionIn.dur < 1, 'short cues');
        T.ok(out.million.dur > 3 * out.safe.dur, 'million is much longer than a safety-net cue');
      });
      T.test('intensity rises with the ladder: correct, lock and suspense are heavier near the top', function () {
        T.ok(levels.c1.rms > levels.c0.rms, 'correct ' + db(levels.c0.rms).toFixed(1) + ' → ' + db(levels.c1.rms).toFixed(1));
        T.ok(levels.l1.rms > levels.l0.rms, 'lock');
        T.ok(levels.s1.rms > levels.s0.rms, 'suspense');
        T.ok(SSM.audio.suspenseSecs(1) > SSM.audio.suspenseSecs(0), 'suspense lasts longer near the top');
        T.ok(SSM.audio.suspenseSecs(1) <= 4.2 && SSM.audio.suspenseSecs(0) >= 1.5, 'suspense stays within brisk limits ' + SSM.audio.suspenseSecs(0).toFixed(1) + '–' + SSM.audio.suspenseSecs(1).toFixed(1) + ' s');
      });
      T.test('the safety-net cue is a distinct, bigger cue than an ordinary correct answer', function () {
        T.ok(out.safe.dur > out.correct.dur, 'safe longer than correct');
      });
      return table;
    });
  };
})(window);
