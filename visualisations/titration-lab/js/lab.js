/* Titration Laboratory — the procedure.

   The apparatus, the student's actions and the trials, with no DOM. Every
   action is checked against the current state and answers with one of:
     invalid      blocked: it can't be done now (nothing changes)
     mistake      allowed, and it introduces an error with a known direction
     harmless     allowed, and it changes nothing that matters
     alternative  allowed, and it is a reasonable way of doing it
     good         the expected step
     retry        a reading that needs another look (guided only)
     info         a note, no judgement
   The chemistry is delegated to the engine's flask. Three quantities are kept
   apart throughout: what is true (volumes delivered, amounts in the flask),
   what the burette shows (the true level, read to the nearest 0.05 cm³), and
   what the student records. */
(function (root) {
  'use strict';
  var E = root.TitrationEngine, X = root.TitrationExperiments;
  var A = E.APPARATUS;

  var STREAM_cm3_s = { fast: 1.5, slow: 0.15 };  // tap fully open; tap cracked to a steady drip
  var DRIP_s = 1 / 3;                             // in a drip, one drop every third of a second
  var POUR_cm3_s = 1.6;                           // the step buttons let their volume run at this rate
  var FUNNEL_RESIDUE_cm3 = 0.25, FUNNEL_DRIP_cm3_s = 0.004;
  var FLASK_RINSE_ANALYTE_cm3 = 0.40, FLASK_WET_WATER_cm3 = 0.5;
  var BLOW_OUT_cm3 = 0.04;
  var ACID_VOLUME_cm3 = 10;
  var SWIRL_s = 1.4;                              // one swirl of the flask, for the drawing
  var ENDPOINT_WINDOW = { early: -0.03, late: 0.12 };   // cm³ either side of the indicator's (or the first excess's) endpoint

  function res(kind, msg, code, extra) {
    var r = { ok: kind !== 'invalid' && kind !== 'retry', kind: kind, msg: msg, code: code || null };
    if (extra) for (var k in extra) r[k] = extra[k];
    return r;
  }

  function create(run, opts) {
    opts = opts || {};
    var rng = E.rng((run.seed ^ 0x5bd1e995) >>> 0);
    var choices = opts.choices || {};
    var device = A[choices.aliquot || run.aliquot] || A.pipette25;
    var guided = run.mode === 'guided';
    var redox = run.type === 'redox';
    var titrant = run.titrant, analyte = run.analyte;

    // Hidden calibration of this pipette, within its tolerance: the same every use.
    var deviceOffset = (rng() - 0.5) * device.tolerance_cm3;

    var s = {
      time: 0, device: device, indicatorChoice: choices.indicator || run.indicator || null,
      burette: { wet: 'water', conc_M: 0, reading: null, jetAir: 0, funnel: false, funnelDrip: 0,
        tap: false, flow: 'slow', pending: 0, everFilled: false, rinsedWithTitrant: false, diluted: false },
      pipette: { wet: 'water' },
      flask: null, flaskState: 'clean', flaskWet: 'water',
      under: null, tile: false, keepSwirling: false, swirlAnim: 0, dropAnim: 0,
      trial: null, trials: [], issues: [], waste_cm3: 0, events: [],
      prep: run.prep ? createPrep(run, rng, guided) : null
    };

    var lab = { run: run, state: s, guided: guided };

    function note(code, kind, msg, scope) {
      var t = scope === 'trial' && s.trial ? s.trial : null;
      var list = t ? t.issues : s.issues;
      if (list.some(function (x) { return x.code === code; })) return;
      list.push({ code: code, kind: kind, msg: msg, trial: t ? t.n : null, time: s.time });
    }
    function event(r) { s.events.push({ t: s.time, kind: r.kind, msg: r.msg, code: r.code }); if (s.events.length > 200) s.events.shift(); return r; }

    function newTrial() {
      var n = s.trials.length + 1;
      s.trial = { n: n, kind: s.trials.length === 0 ? 'rough' : 'precise', issues: [],
        initialTrue: null, initialRec: null, finalTrue: null, finalRec: null,
        readingChange: 0, delivered: 0, airDelivered: 0, funnelDripped: 0,
        aliquot_cm3: null, analyteMol: null, flaskVolBefore: null, titrantConc_M: null,
        acid: null, attempts: { initial: 0, final: 0 } };
      return s.trial;
    }
    function ensureTrial() { return s.trial || newTrial(); }
    function aliquotIn() { return s.flaskState === 'aliquot'; }
    function midTitration() { return s.trial && s.trial.initialRec !== null && s.trial.finalRec === null; }

    /* ---------- The burette ---------- */
    lab.rinseBurette = function (withWhat) {
      var b = s.burette;
      if (b.reading !== null) return event(res('invalid', 'Empty the burette into the waste beaker before rinsing it.', 'rinse-full'));
      if (withWhat === 'titrant') {
        b.wet = 'titrant'; b.rinsedWithTitrant = true;
        return event(res('good', 'Rinsed with a little ' + X.LABELS[titrant.id].name + ' and run to waste. The water film is gone, so it can’t dilute the titrant.', 'rinse-titrant'));
      }
      b.wet = 'water';
      return event(res('info', 'Rinsed with distilled water. It’s clean, but wet: rinse it with the titrant too, or the film of water will dilute it.', 'rinse-water'));
    };

    lab.setFunnel = function (on) {
      var b = s.burette;
      if (b.funnel === on) return event(res('harmless', on ? 'The funnel is already in.' : 'The funnel is already out.', 'funnel-same'));
      b.funnel = on;
      if (!on) {
        var msg = 'Funnel removed.' + (b.funnelDrip > 0 ? ' Drops left in it can no longer drip into the burette and change the reading.' : '');
        b.funnelDrip = 0;
        return event(res('good', msg, 'funnel-out'));
      }
      return event(res('good', 'Funnel in the top of the burette.', 'funnel-in'));
    };

    lab.fillBurette = function () {
      var b = s.burette;
      if (!b.funnel) return event(res('invalid', 'Put the funnel in first: the top of the burette is too narrow to pour into safely.', 'fill-no-funnel'));
      if (b.tap) return event(res('invalid', 'Close the tap first, or the titrant runs straight out.', 'fill-tap-open'));
      if (midTitration()) return event(res('invalid', 'You’ve recorded an initial reading for this titration. Finish it, or record it and start a new one, before refilling.', 'fill-mid'));
      var target = E.round(rng.between(-1.6, 0.7), 3);
      if (b.reading === null) {
        var V = 50 - target + A.burette50.belowScale_cm3;
        var c = titrant.conc_M;
        if (b.wet === 'water') {
          c = c * V / (V + A.burette50.residualWater_cm3);
          b.diluted = true;
          note('burette-water', 'mistake', 'The burette was wet with water when you filled it, so the titrant is slightly diluted (about 1 %). More of it is needed to reach the endpoint, so titres come out high.');
        }
        b.conc_M = c; b.reading = target; b.jetAir = A.burette50.jet_cm3;
      } else {
        if (target >= b.reading) target = Math.max(-1.6, b.reading - 0.4);
        var Vold = 50 - b.reading + A.burette50.belowScale_cm3, added = b.reading - target;
        b.conc_M = (b.conc_M * Vold + titrant.conc_M * added) / (Vold + added);
        b.reading = target;
      }
      b.wet = 'titrant'; b.everFilled = true; b.funnelDrip = FUNNEL_RESIDUE_cm3;
      var above = target < 0;
      return event(res('good', 'Filled through the funnel.' + (above ? ' The meniscus is above the 0.00 mark: run a little into the waste beaker to bring it onto the scale.' : '') +
        (b.jetAir > 0 ? ' The jet below the tap is still full of air.' : ''), 'fill'));
    };

    lab.emptyBurette = function () {
      var b = s.burette;
      if (b.reading === null) return event(res('harmless', 'The burette is already empty.', 'empty-empty'));
      if (midTitration()) return event(res('invalid', 'Finish this titration first: running titrant out now would count as titre.', 'empty-mid'));
      s.waste_cm3 += 50 - b.reading + A.burette50.belowScale_cm3;
      b.reading = null; b.tap = false; b.pending = 0; b.jetAir = 0;
      return event(res('info', 'Burette run empty into the waste beaker.', 'empty'));
    };

    lab.place = function (where) {
      if (where === s.under) return event(res('harmless', 'It’s already there.', 'place-same'));
      if (s.burette.tap || s.burette.pending > 0) return event(res('invalid', 'Close the tap before moving anything under the burette.', 'place-tap'));
      if (where === 'waste' && midTitration()) return event(res('invalid', 'You’ve recorded an initial reading: anything run out now counts as titre. Finish this titration first.', 'waste-mid'));
      s.under = where;
      if (where === 'flask') return event(res('good', 'Conical flask under the burette' + (s.tile ? ', on the white tile.' : '.') + (s.tile ? '' : ' A white tile underneath makes the colour change easier to see.'), 'under-flask'));
      if (where === 'waste') return event(res('info', 'Waste beaker under the burette.', 'under-waste'));
      return event(res('info', 'Nothing under the burette.', 'under-none'));
    };

    function canRun() {
      var b = s.burette;
      if (b.reading === null) return res('invalid', 'The burette is empty. Fill it first.', 'run-empty');
      if (!s.under) return res('invalid', 'Put the conical flask or the waste beaker under the burette first.', 'run-nothing-under');
      if (b.reading >= 50 - 1e-9) return res('invalid', 'The level is at the 50.00 cm³ mark: there’s no scale below it. Refill the burette.', 'run-bottom');
      if (s.under === 'flask') {
        if (s.flaskState === 'done') return res('invalid', 'This flask holds a finished titration. Empty and wash it, then pipette a new portion.', 'run-done');
        if (s.flaskState === 'clean') return res('invalid', 'The flask is empty. Pipette the portion into it first, or put the waste beaker under the burette.', 'run-empty-flask');
        if (aliquotIn() && (!s.trial || s.trial.initialRec === null)) return res('invalid', 'Record the initial burette reading first: you need it to work out the titre.', 'run-no-initial');
      }
      return null;
    }

    // Let a volume of the burette's contents out. The reading rises by the
    // volume that leaves the burette; air in the jet leaves first and adds
    // nothing to the flask.
    function runOut(v) {
      var b = s.burette;
      if (v <= 0 || b.reading === null) return 0;
      var room = 50 - b.reading;
      var stopped = false;
      if (v >= room) { v = Math.max(0, room); stopped = true; }
      var air = Math.min(b.jetAir, v), liquid = v - air;
      b.jetAir -= air; b.reading += v;
      if (s.under === 'flask' && s.flask) {
        s.flask.addTitrant(titrant.id, b.conc_M, liquid);
        if (s.trial && s.trial.initialRec !== null) {
          s.trial.readingChange += v; s.trial.delivered += liquid; s.trial.airDelivered += air;
          if (air > 0) note('jet-air', 'mistake', 'There was air in the jet when you took the initial reading. It came out first, so the reading went up without any titrant reaching the flask: this titre is about ' + E.round(A.burette50.jet_cm3, 2) + ' cm³ too high.', 'trial');
          if (b.funnel) note('funnel-in', 'mistake', 'The funnel was still in the burette while you titrated. Drops from it can run into the burette, so the reading changes less than the volume delivered and the titre comes out low.', 'trial');
        }
      } else if (s.under === 'waste') s.waste_cm3 += liquid;
      if (stopped) { b.tap = false; b.pending = 0; s.stopMsg = 'The level reached the 50.00 cm³ mark, the bottom of the scale, so the tap was closed.'; }
      s.dropAnim = 0.35;
      return liquid;
    }

    // Run a little to waste: fills the jet below the tap and brings the
    // meniscus onto the scale, just below 0.00.
    lab.primeJet = function () {
      var b = s.burette;
      if (b.reading === null) return event(res('invalid', 'Fill the burette first.', 'prime-empty'));
      if (s.under !== 'waste') return event(res('invalid', 'Put the waste beaker under the burette first.', 'prime-no-waste'));
      if (midTitration()) return event(res('invalid', 'Finish this titration first.', 'prime-mid'));
      var v = b.jetAir + Math.max(0, -b.reading) + E.round(rng.between(0.1, 0.6), 2);
      runOut(v); b.tap = false; b.pending = 0;
      return event(res('good', 'A little run into the waste beaker: the jet below the tap is full and the level is on the scale.', 'prime'));
    };

    lab.tap = function (open, flow) {
      var b = s.burette;
      if (flow) b.flow = flow;
      if (!open) { b.tap = false; return event(res('info', 'Tap closed.', 'tap-closed')); }
      var no = canRun();
      if (no) return event(no);
      b.tap = true; b.dripT = DRIP_s * 0.7;
      return event(res('info', 'Tap open' + (b.flow === 'fast' ? '.' : ', running drop by drop.'), 'tap-open'));
    };
    // A step: about 1.0, 0.5 or 0.1 cm³, or one drop. Real taps don't deliver
    // an exact volume, so each varies a little; the burette shows what went.
    lab.add = function (step) {
      var b = s.burette;
      var no = canRun();
      if (no) return event(no);
      if (b.tap) return event(res('invalid', 'The tap is already open.', 'add-tap-open'));
      if (b.pending > 0) return event(res('invalid', 'Wait for the last addition to finish.', 'add-pending'));
      var v;
      if (step === 'drop') {
        v = Math.max(0.03, A.drop.volume_cm3 + rng.gauss() * A.drop.sd_cm3);
        runOut(v);
        if (s.keepSwirling && s.flask) s.flask.swirl();
        return event(res('info', 'One drop added.', 'add-drop', { volume: v }));
      }
      var nominal = { '1.0': 1.0, '0.5': 0.5, '0.1': 0.1 }[step];
      if (!nominal) return event(res('invalid', 'Unknown step.', 'add-unknown'));
      v = nominal * (1 + rng.gauss() * (nominal >= 0.5 ? 0.03 : 0.06));
      b.pending = Math.max(0.02, v);
      return event(res('info', 'Adding about ' + nominal.toFixed(1) + ' cm³.', 'add-step', { volume: v }));
    };

    lab.swirl = function () {
      if (!s.flask || s.flask.totalVol() <= 0) return event(res('harmless', 'The flask is empty.', 'swirl-empty'));
      s.flask.swirl(); s.swirlAnim = SWIRL_s;
      return event(res('good', 'Swirled. The flask is ' + s.flask.describe().text + '.', 'swirl'));
    };
    lab.setKeepSwirling = function (on) {
      s.keepSwirling = !!on;
      return event(res('info', on ? 'Swirling continuously with one hand while the other works the tap.' : 'Stopped swirling continuously.', 'keep-swirling'));
    };

    /* ---------- Pipette, flask and what goes in it ---------- */
    lab.rinsePipette = function (withWhat) {
      if (device.kind !== 'pipette') return event(res('harmless', 'This experiment uses a ' + device.label + ' for the portion.', 'rinse-pipette-none'));
      s.pipette.wet = withWhat === 'analyte' ? 'analyte' : 'water';
      if (withWhat === 'analyte') return event(res('good', 'Pipette rinsed with the solution it will measure. No water left to dilute it.', 'rinse-pipette'));
      return event(res('info', 'Pipette rinsed with distilled water: clean, but wet. Rinse it with the solution next, or the first portion will be diluted.', 'rinse-pipette-water'));
    };

    lab.rinseFlask = function (withWhat) {
      if (s.flaskState !== 'clean') return event(res('invalid', 'Empty the flask first.', 'rinse-flask-full'));
      if (withWhat === 'analyte') {
        s.flaskWet = 'analyte';
        return event(res('mistake', 'Rinsed with the solution to be pipetted. What stays on the glass adds to the portion, so there is more to react and the titre comes out high. Rinse a conical flask with distilled water only.', 'rinse-flask-analyte'));
      }
      s.flaskWet = 'water';
      return event(res('harmless', 'Rinsed with distilled water. Water left in the flask doesn’t change the amount you pipette in, so it doesn’t change the titre.', 'rinse-flask-water'));
    };

    lab.emptyFlask = function () {
      if (s.flaskState === 'clean' && !s.flask) return event(res('harmless', 'The flask is already empty and clean.', 'empty-flask-clean'));
      if (s.burette.tap || s.burette.pending > 0) return event(res('invalid', 'Close the tap first.', 'empty-flask-tap'));
      var abandoned = s.trial && s.flaskState === 'aliquot';
      s.flask = null; s.flaskState = 'clean'; s.flaskWet = 'water';
      if (abandoned) { s.trial = null; }
      return event(res('info', abandoned ? 'Flask emptied and washed with distilled water. That titration was abandoned; start a new one.' : 'Flask emptied and washed with distilled water, ready for the next portion.', 'empty-flask'));
    };

    // The concentration of the solution being pipetted, for this portion.
    function analyteConcNow() {
      if (s.prep) return s.prep.aliquotConc();
      return analyte.conc_M;
    }

    lab.pipette = function (finish) {
      if (s.flaskState === 'done') return event(res('invalid', 'The flask still holds the last titration. Empty and wash it first.', 'pip-done'));
      if (s.flaskState === 'aliquot') return event(res('invalid', 'There’s already a portion in the flask. A second one would double the amount to titrate.', 'pip-twice'));
      if (s.burette.tap || s.burette.pending > 0) return event(res('invalid', 'Close the burette tap first.', 'pip-tap'));
      if (s.prep && !s.prep.ready()) return event(res('invalid', 'Make up the standard solution first.', 'pip-no-standard'));
      var t = ensureTrial();
      var V = device.nominal_cm3 + deviceOffset + rng.gauss() * device.sdRandom_cm3;
      var water = 0, msgs = [], kind = 'good';
      if (device.kind === 'pipette' && s.pipette.wet === 'water') {
        water = device.residual_cm3;
        note('pipette-water', 'mistake', 'The pipette was wet with water for this portion, so it held a little less of the solution: less to react, so the titre comes out low.', 'trial');
        msgs.push('The pipette was wet with water, so this portion is slightly diluted.');
        kind = 'mistake';
      }
      var analyteV = V - water;
      if (device.kind === 'pipette' && finish === 'blow') {
        analyteV += BLOW_OUT_cm3;
        note('blow-out', 'mistake', 'You blew out the last drop. A volumetric pipette is calibrated to leave it in the tip, so the portion was too big and the titre comes out high.', 'trial');
        msgs.push('Blowing out the last drop adds more than the pipette is calibrated to deliver.');
        kind = 'mistake';
      }
      if (device.kind !== 'pipette') {
        note('cylinder', 'mistake', 'A measuring cylinder measures 25 cm³ to only about ±0.5 cm³, twenty times worse than a pipette, so the amount in each portion varies and the titres scatter.', 'session');
      }
      var extra = s.flaskWet === 'analyte' ? FLASK_RINSE_ANALYTE_cm3 : 0;
      if (extra) note('flask-analyte', 'mistake', 'The flask had been rinsed with the solution, so extra was already in it: the titre comes out high.', 'trial');
      var c = analyteConcNow();
      var f = E.createFlask(redox ? 'redox' : 'acid-base', analyte.id);
      if (s.flaskWet === 'water') f.addWater(FLASK_WET_WATER_cm3);
      f.addSolution(analyte.id, c, analyteV + extra);
      if (water) f.addWater(water);
      if (run.stockAcid_M) f.addAcidifier({ conc_M: run.stockAcid_M, hPer: 2 }, V);
      s.flask = f; s.flaskState = 'aliquot'; s.flaskWet = 'water';
      if (device.kind === 'pipette') s.pipette.wet = 'analyte';
      t.aliquot_cm3 = V; t.analyteMol = E.amount(c, analyteV + extra);
      if (guided && !msgs.length) msgs.push('Filled above the line with the pipette filler, let down until the bottom of the meniscus sat on the line, and ran it into the flask. Touching the tip on the inside of the flask leaves the last drop where the pipette was calibrated to leave it.');
      else if (!msgs.length) msgs.push(device.kind === 'pipette' ? device.recordAs + ' cm³ pipetted into the flask.' : 'About ' + device.recordAs + ' cm³ measured into the flask.');
      return event(res(kind, msgs.join(' '), 'pipette'));
    };

    lab.addIndicator = function (id) {
      if (!aliquotIn()) return event(res('invalid', 'Pipette the solution into the flask first.', 'ind-no-aliquot'));
      if (redox) return event(res('harmless', 'No indicator is needed: potassium manganate(VII) is self-indicating. Its purple disappears while it reacts, and the first permanent pale pink is the endpoint.', 'ind-redox'));
      var f = s.flask, ind = E.INDICATORS[id];
      if (!ind) return event(res('invalid', 'Unknown indicator.', 'ind-unknown'));
      if (f.indicator && f.indicator !== id) {
        note('two-indicators', 'mistake', 'Two indicators in one flask give a muddled colour change.', 'trial');
        f.addIndicator(id, 3);
        return event(res('mistake', 'A second indicator muddles the colour change. Empty the flask and start this one again.', 'ind-two'));
      }
      if (f.indicator === id) { f.addIndicator(id, 1); return event(res('harmless', 'More indicator: one or two drops are enough.', 'ind-more')); }
      f.addIndicator(id, 3);
      s.trial.indicator = id;
      var verdict = indicatorVerdict(id);
      if (id === 'universal') note('universal', 'mistake', 'Universal indicator changes colour gradually across the whole pH range, so there’s no sharp endpoint to stop at.', 'trial');
      else if (verdict && !verdict.suitable) note('indicator-unsuitable', 'mistake', verdict.why, 'trial');
      return event(res('good', ind.name + ' added (3 drops). The flask is ' + f.describe().text + '.', 'ind'));
    };

    // Whether an indicator suits this titration, worked out from the pH curve.
    function indicatorVerdict(id) {
      var ind = E.INDICATORS[id];
      if (!ind || ind.endFraction === null) return { suitable: false, why: 'Universal indicator has no sharp colour change.' };
      var sys = curveSystem(25);
      var veq = X.expectedTitre(run, analyte.conc_M || 0.1, 25);
      if (s.prep) veq = E.equivalenceVolume({ titrantConc_M: titrant.conc_M, analyteConc_M: s.prep.trueConc() || 0.1, aliquot_cm3: 25, titrantCoeff: run.coeff.titrant, analyteCoeff: run.coeff.analyte });
      var ve = E.indicatorEndpoint(sys, id, veq * 1.6);
      if (ve === null) return { suitable: false, why: ind.name + ' doesn’t change colour in this titration: the pH never passes through its range.' };
      // Suitable when its colour change comes at the equivalence point, which
      // happens when its range lies inside the steep part of the pH curve.
      if (Math.abs(ve - veq) > 0.15) {
        var early = ve < veq, width = E.indicatorSharpness(sys, id, veq * 1.6);
        return { suitable: false, endpoint: ve, why: ind.name + ' changes colour ' + (width !== null && width > 1 ? 'gradually, over about ' + E.round(width, 1) + ' cm³, ' : '') +
          (early ? 'before' : 'after') + ' the equivalence point, at about ' + E.round(ve, 1) + ' cm³ instead of ' + E.round(veq, 1) + ' cm³: its range (pH ' + ind.range[0].toFixed(1) + '–' + ind.range[1].toFixed(1) + ') isn’t in the steep part of the pH curve for this titration.' };
      }
      return { suitable: true, endpoint: ve };
    }
    function curveSystem(aliquot) {
      var c = s.prep ? (s.prep.trueConc() || 0.1) : (analyte.conc_M || 0.1);
      return { analyte: analyte.id, analyteAmount_mol: E.amount(c, aliquot), aliquot_cm3: aliquot + FLASK_WET_WATER_cm3, titrant: titrant.id, titrantConc_M: titrant.conc_M };
    }
    lab.indicatorVerdict = indicatorVerdict;
    lab.curveSystem = curveSystem;

    lab.addAcid = function (id) {
      if (!redox) return event(res('invalid', 'Adding acid would change the amount of acid or alkali you are titrating.', 'acid-ab'));
      if (!aliquotIn()) return event(res('invalid', 'Pipette the solution into the flask first.', 'acid-no-aliquot'));
      var acid = X.ACIDIFIERS[id];
      if (!acid) return event(res('invalid', 'Unknown acid.', 'acid-unknown'));
      s.flask.addAcidifier(acid, ACID_VOLUME_cm3);
      s.trial.acid = s.trial.acid || id;
      if (id === 'HCl') {
        note('acid-hcl', 'mistake', 'Hydrochloric acid is unsuitable: manganate(VII) oxidises chloride ions to chlorine. Some of the titrant is used up on the chloride, so the titre comes out high and so does the concentration you calculate.', 'trial');
        return event(res('mistake', '10 cm³ of dilute hydrochloric acid added. Chloride ions can be oxidised by manganate(VII): some titrant will be used on them.', 'acid-hcl'));
      }
      if (id === 'HNO3') {
        note('acid-hno3', 'mistake', 'Nitric acid is unsuitable: it is an oxidising agent itself.' + (analyte.id === 'Fe2' ? ' It oxidises some Fe²⁺ to Fe³⁺ before the manganate(VII) can, so the titre comes out low and so does the concentration you calculate.' : ' It can react with the substance being titrated, so it is the wrong choice. (With ethanedioate the effect is small, and this simulation doesn’t change the result for it.)'), 'trial');
        return event(res('mistake', '10 cm³ of dilute nitric acid added. Nitric acid is an oxidising agent itself.', 'acid-hno3'));
      }
      return event(res('good', '10 cm³ of dilute sulfuric acid added: plenty of H⁺ for MnO₄⁻ to be reduced all the way to Mn²⁺. Sulfate ions aren’t oxidised by manganate(VII).', 'acid'));
    };

    lab.warm = function (T) {
      if (!aliquotIn()) return event(res('invalid', 'Pipette the solution into the flask first.', 'warm-no-aliquot'));
      s.flask.heat(T);
      s.trial.warmedTo = T;
      if (analyte.id === 'Fe2') return event(res('harmless', 'Warmed to ' + T + ' °C. It isn’t needed: manganate(VII) reacts with iron(II) quickly at room temperature.', 'warm-fe'));
      if (T >= 80) {
        // Some ethanedioic acid decomposes near boiling (approximate: 1.5 %).
        s.flask.rx.C2O4 *= 0.985;
        note('too-hot', 'mistake', 'Heated to ' + T + ' °C, close to boiling. Some ethanedioic acid decomposes when it’s this hot, so there is less to titrate and the titre comes out low. About 60 °C is enough.', 'trial');
        return event(res('mistake', 'Heated to ' + T + ' °C. That’s hotter than needed, and the flask is hard to hold. Some ethanedioic acid decomposes near boiling. About 60 °C is enough.', 'warm-hot'));
      }
      if (T < 55) return event(res('alternative', 'Warmed to ' + T + ' °C. The reaction will go, but slowly at first: about 60 °C makes it start faster.', 'warm-low'));
      return event(res('good', 'Warmed to ' + T + ' °C in a water bath. The reaction is slow at room temperature, and warming speeds up the first part until Mn²⁺ builds up and catalyses it.', 'warm'));
    };

    lab.setTile = function (on) {
      s.tile = !!on;
      return event(res(on ? 'good' : 'harmless', on ? 'White tile under the flask: the faint first colour change shows up clearly against it.' : 'Tile moved away. The endpoint is harder to see on a dark bench.', 'tile'));
    };

    lab.washSides = function () {
      if (!s.flask || s.flaskState !== 'aliquot') return event(res('invalid', 'There’s nothing to wash down.', 'wash-none'));
      s.flask.addWater(3); s.flask.swirl();
      return event(res('alternative', 'Washed the inside of the flask with a little distilled water. That brings splashes back into the reaction without changing the number of moles, so it’s fine near the endpoint.', 'wash-sides'));
    };

    /* ---------- Readings ---------- */
    function readingCheck(text, trueReading, which) {
      var t = s.trial;
      text = String(text || '').trim();
      if (!E.validReadingFormat(text)) {
        return res(guided ? 'retry' : 'invalid', 'Write the reading to 2 decimal places, ending in 0 or 5: for example 0.35 or 23.80.', 'reading-format');
      }
      var v = parseFloat(text), off = Math.abs(v - trueReading);
      if (off > 0.05 + 1e-6 && guided) {
        t.attempts[which] += 1;
        var low = Math.floor(trueReading * 10) / 10, hint;
        if (t.attempts[which] === 1) hint = redox ? 'Not quite. Manganate(VII) is too dark to see through, so read the top of the meniscus. Use the magnified view.' : 'Not quite. Read the bottom of the meniscus at eye level. Use the magnified view.';
        else hint = 'Closer look: the ' + (redox ? 'top' : 'bottom') + ' of the meniscus is between ' + low.toFixed(2) + ' and ' + (low + 0.1).toFixed(2) + '. Each small division is 0.10 cm³; give it to the nearest 0.05.';
        return res('retry', hint, 'reading-off');
      }
      return { ok: true, value: E.round(v, 2), off: off };
    }

    lab.recordInitial = function (text) {
      var b = s.burette;
      if (b.reading === null) return event(res('invalid', 'Fill the burette first.', 'init-empty'));
      if (b.tap || b.pending > 0) return event(res('invalid', 'Close the tap and let the level settle before reading.', 'init-tap'));
      if (b.reading < 0) return event(res('invalid', 'The meniscus is above the 0.00 mark, off the scale. Run a little into the waste beaker first.', 'init-above'));
      var t = ensureTrial();
      if (t.initialRec !== null) return event(res('invalid', 'You’ve already recorded the initial reading for this titration.', 'init-twice'));
      var c = readingCheck(text, b.reading, 'initial');
      if (!c.ok) return event(c);
      t.initialRec = c.value; t.initialTrue = b.reading; t.titrantConc_M = b.conc_M;
      if (c.off > 0.05 + 1e-6) note('misread-initial', 'mistake', 'Your initial reading (' + c.value.toFixed(2) + ') was more than 0.05 cm³ from where the meniscus was (' + E.nearestHalfTenth(b.reading).toFixed(2) + ').', 'trial');
      if (b.funnel) note('funnel-reading', 'mistake', 'The funnel was still in when you took the initial reading. Titrant left in it can drip in and change the level.', 'trial');
      var left = 50 - b.reading;
      return event(res('good', 'Initial reading recorded: ' + c.value.toFixed(2) + ' cm³.' +
        (left < 15 ? ' Only about ' + Math.floor(left) + ' cm³ is left above the 50.00 mark: you may run out before the endpoint. Refilling first is safer.' : ''), 'init'));
    };

    lab.recordFinal = function (text) {
      var b = s.burette, t = s.trial;
      if (!t || t.initialRec === null) return event(res('invalid', 'Record the initial reading first.', 'final-no-initial'));
      if (b.tap || b.pending > 0) return event(res('invalid', 'Close the tap and let the level settle before reading.', 'final-tap'));
      if (!aliquotIn()) return event(res('invalid', 'There’s nothing in the flask to titrate.', 'final-no-aliquot'));
      if (t.readingChange <= 0) return event(res('invalid', 'You haven’t added any titrant yet.', 'final-nothing'));
      var c = readingCheck(text, b.reading, 'final');
      if (!c.ok) return event(c);
      if (c.value < t.initialRec) return event(res(guided ? 'retry' : 'invalid', 'The final reading must be bigger than the initial reading: the scale counts down the burette.', 'final-small'));
      // Everything is worked out before anything is changed, so a failure leaves the trial as it was.
      var end = endpointStatus();
      t.finalRec = c.value; t.finalTrue = b.reading;
      if (c.off > 0.05 + 1e-6) note('misread-final', 'mistake', 'Your final reading (' + c.value.toFixed(2) + ') was more than 0.05 cm³ from where the meniscus was (' + E.nearestHalfTenth(b.reading).toFixed(2) + ').', 'trial');
      t.titre = E.titre(t.initialRec, t.finalRec);
      t.unswirled = s.flask.un.vol > 0.005;
      if (t.unswirled) note('not-swirled', 'mistake', 'The last addition hadn’t been swirled in when you stopped, so the colour you saw was only round the drop, not the whole flask.', 'trial');
      t.end = end;
      t.observed = s.flask.describe().text;
      t.indicator = s.flask.indicator;
      t.temperature = s.flask.T;
      t.mnO2 = redox && s.flask.rx.MnO2 > 1e-7;
      if (redox && t.mnO2) note('mno2', 'mistake', 'A brown precipitate of MnO₂ formed: there wasn’t enough acid, so some MnO₄⁻ was reduced only to MnO₂, taking 3 electrons instead of 5. More titrant is needed, so the titre comes out high, and the brown hides the endpoint.', 'trial');
      if (redox && !t.acid) note('no-acid', 'mistake', 'No dilute sulfuric acid was added. Each MnO₄⁻ needs 8 H⁺ to be reduced to Mn²⁺.', 'trial');
      s.flaskState = 'done';
      s.trials.push(t); s.trial = null;
      var msg = 'Final reading recorded: ' + c.value.toFixed(2) + ' cm³. Titre = ' + t.finalRec.toFixed(2) + ' − ' + t.initialRec.toFixed(2) + ' = ' + t.titre.toFixed(2) + ' cm³.';
      var kind = 'good';
      if (t.end.status === 'overshot' && t.kind === 'precise') { kind = 'mistake'; msg += ' ' + overshootText(t); }
      else if (t.end.status === 'early') { kind = 'mistake'; msg += ' ' + earlyText(t); }
      else if (t.end.status === 'no-endpoint') { kind = 'mistake'; msg += ' There was no sharp colour change to stop at.'; }
      else if (t.kind === 'rough') msg += ' Use it as a guide: in the next titrations, add quickly to about 1 cm³ below it, then drop by drop.';
      return event(res(kind, msg, 'final', { trial: t }));
    };
    function overshootText(t) {
      var by = E.round(t.end.past_cm3, 2);
      var visible = redox || (t.indicator === 'phenolphthalein' && titrant.id !== 'HCl' && titrant.id !== 'HNO3' && titrant.id !== 'H2SO4');
      return 'You went past the endpoint by about ' + by.toFixed(2) + ' cm³' + (visible ? ' (the colour is deeper than the faint first tint)' : '') +
        ', so this titre is too big to use. Repeat it, adding drop by drop near the end.';
    }
    function earlyText(t) {
      if (redox && analyte.id === 'C2O4') return 'The pink didn’t last: there was still ethanedioate left, and the colour was manganate(VII) that hadn’t reacted yet. ' +
        (t.temperature < 50 ? 'The flask was only ' + Math.round(t.temperature) + ' °C, so the reaction was slow. Warm it to about 60 °C. ' : '') + 'This titre is too small.';
      var short = Math.abs(E.round(t.end.past_cm3, 2)).toFixed(2);
      if (t.unswirled) return 'The colour you saw was only round the last drop: it hadn’t been swirled through the whole flask, and the endpoint was about ' + short + ' cm³ further on. Swirl after each addition. This titre is too small.';
      return 'The colour hadn’t changed permanently yet: the endpoint was about ' + short + ' cm³ further on. This titre is too small.';
    }

    /* Where the student stopped, relative to the endpoint the chemistry
       gives for what is actually in the flask: the indicator's colour change
       from the pH, or the first excess of MnO₄⁻ once the reductant has all
       reacted (judged after every reaction finishes, so slow pink doesn't count). */
    function endpointStatus() {
      var t = s.trial, f = s.flask, out = {};
      var V = t.delivered;
      // Everything in the flask except the titrant: right whichever order the steps were done in.
      t.flaskVolBefore = Math.max(1, f.totalVol() - V);
      if (!redox) {
        if (!f.indicator) return { status: 'no-endpoint', past_cm3: 0, reason: 'no indicator' };
        var sys = { analyte: analyte.id, analyteAmount_mol: t.analyteMol, aliquot_cm3: t.flaskVolBefore, titrant: titrant.id, titrantConc_M: t.titrantConc_M };
        var veq = E.dm3ToCm3(E.convert(t.analyteMol, run.coeff.analyte, run.coeff.titrant) / t.titrantConc_M);
        out.equivalence_cm3 = veq;
        var ve = f.indicator === 'universal' ? null : E.indicatorEndpoint(sys, f.indicator, Math.max(60, veq * 2));
        if (ve === null) return { status: 'no-endpoint', past_cm3: V - veq, equivalence_cm3: veq };
        out.endpoint_cm3 = ve; out.past_cm3 = V - ve;
      } else {
        var settled = f.settled(), c = t.titrantConc_M;
        var left = analyte.id === 'Fe2' ? settled.Fe2 / 5 : settled.C2O4 / 2.5;
        if (left > 1e-10) out.past_cm3 = -E.dm3ToCm3(left / c);
        else out.past_cm3 = E.dm3ToCm3(settled.MnO4 / c);
        out.endpoint_cm3 = V - out.past_cm3;
        out.pinkNow = f.describe().key !== 'colourless';
      }
      out.status = out.past_cm3 < ENDPOINT_WINDOW.early ? 'early' : out.past_cm3 <= ENDPOINT_WINDOW.late ? 'endpoint' : 'overshot';
      return out;
    }

    // Where the flask stands against the endpoint now, without recording anything.
    lab.endpointNow = function () { return s.trial && s.trial.initialRec !== null && s.flask ? endpointStatus() : null; };

    lab.setTrialKind = function (kind) {
      var t = ensureTrial();
      t.kind = kind === 'rough' ? 'rough' : 'precise';
      return event(res('info', 'This titration is ' + (t.kind === 'rough' ? 'a rough one, to find roughly where the endpoint is.' : 'a precise one.'), 'kind'));
    };

    /* ---------- Time ---------- */
    lab.tick = function (dt) {
      if (!(dt > 0)) return;
      dt = Math.min(dt, 5);
      s.time += dt;
      var b = s.burette;
      if (b.tap) {
        var no = canRun();
        if (no) b.tap = false;
        else if (b.flow === 'slow') {
          // Drop by drop: whole drops, not a trickle.
          b.dripT = (b.dripT || 0) + dt;
          while (b.dripT >= DRIP_s && b.tap) { b.dripT -= DRIP_s; runOut(Math.max(0.03, A.drop.volume_cm3 + rng.gauss() * A.drop.sd_cm3)); }
        } else runOut(STREAM_cm3_s[b.flow] * dt);
      }
      if (b.pending > 0) {
        var no2 = canRun();
        if (no2) b.pending = 0;
        else { var v = Math.min(b.pending, POUR_cm3_s * dt); b.pending -= v; runOut(v); if (b.pending < 1e-9) b.pending = 0; }
      }
      if (b.funnel && b.funnelDrip > 0 && b.reading !== null) {
        var d = Math.min(b.funnelDrip, FUNNEL_DRIP_cm3_s * dt);
        b.funnelDrip -= d; b.reading -= d;
        if (s.trial && s.trial.initialRec !== null) s.trial.funnelDripped += d;
      }
      if (s.flask) {
        // While the flask is being swirled, drops that land are mixed in too.
        if ((s.keepSwirling || s.swirlAnim > 0) && s.flask.un.vol > 0) s.flask.swirl();
        s.flask.step(dt);
      }
      s.swirlAnim = Math.max(0, s.swirlAnim - dt);
      s.dropAnim = Math.max(0, s.dropAnim - dt);
    };
    // Waiting: the reaction carries on, in small steps.
    lab.wait = function (seconds) {
      var b = s.burette;
      if (b.tap || b.pending > 0) return event(res('invalid', 'Close the tap before waiting.', 'wait-tap'));
      for (var tt = 0; tt < seconds; tt += 0.5) lab.tick(0.5);
      return event(res('info', 'Waited ' + seconds + ' s.' + (s.flask ? ' The flask is ' + s.flask.describe().text + '.' : ''), 'wait'));
    };

    /* ---------- Results ---------- */
    lab.results = function () {
      var precise = s.trials.filter(function (t) { return t.kind === 'precise'; });
      var idx = E.concordantSet(precise.map(function (t) { return t.titre; }), run.concordanceTol_cm3);
      var conc = idx.map(function (i) { return precise[i]; });
      return {
        trials: s.trials.slice(), precise: precise, concordant: conc,
        concordantNs: conc.map(function (t) { return t.n; }),
        mean: conc.length >= 2 ? E.round(E.mean(conc.map(function (t) { return t.titre; })), 2) : null,
        meanRaw: conc.length >= 2 ? E.mean(conc.map(function (t) { return t.titre; })) : null
      };
    };

    // The value of the unknown from a mean titre, and every step, using what the
    // student knows (their standard solution's calculated value in RP1).
    lab.solve = function (meanTitre) {
      var o = { unknown: run.unknown, titre_cm3: meanTitre, aliquot_cm3: device.nominal_cm3,
        titrantCoeff: run.coeff.titrant, analyteCoeff: run.coeff.analyte };
      if (run.unknown === 'analyte') o.titrantConc_M = titrant.conc_M;
      else o.analyteConc_M = s.prep ? s.prep.statedConc() : analyte.conc_M;
      return E.solveConcentration(o);
    };
    lab.trueValue = function () { return run.unknownSolution.conc_M; };

    // Every issue raised, session-wide and per titration.
    lab.allIssues = function () {
      var out = s.issues.slice();
      s.trials.forEach(function (t) { t.issues.forEach(function (i) { out.push(i); }); });
      if (s.trial) s.trial.issues.forEach(function (i) { out.push(i); });
      if (s.prep) s.prep.issues.forEach(function (i) { out.push(i); });
      return out;
    };

    /* ---------- The method, as steps ----------
       Worked out from the state, so it is always right whatever order the
       student has done things in. */
    lab.steps = function () {
      var b = s.burette, t = s.trial, out = [];
      var setup = [
        { id: 'rinse-burette', text: 'Rinse the burette with the titrant', why: 'Water left inside would dilute the titrant, so more of it would be needed.', done: b.rinsedWithTitrant || (b.everFilled && !b.diluted) },
        { id: 'fill', text: 'Put the funnel in and fill the burette', why: 'A funnel stops spills. Close the tap first.', done: b.everFilled },
        { id: 'funnel-out', text: 'Take the funnel out', why: 'Drops left in the funnel can drip in later and change the reading.', done: b.everFilled && !b.funnel },
        { id: 'jet', text: 'Run a little into the waste beaker to fill the jet, and bring the level onto the scale', why: 'Air in the jet below the tap would come out during the titration and make the titre too big.', done: b.everFilled && b.jetAir <= 0 && b.reading !== null && b.reading >= 0 }
      ];
      if (device.kind === 'pipette') setup.push({ id: 'rinse-pipette', text: 'Rinse the pipette with the solution it will measure', why: 'Water left inside would dilute the first portion.', done: s.pipette.wet === 'analyte' });
      out = out.concat(setup);
      var firstDone = s.trials.length > 0;
      var inFlask = s.flaskState === 'aliquot';
      var per = [];
      if (s.flaskState === 'done') per.push({ id: 'empty', text: 'Empty and wash the flask with distilled water', why: 'Each titration starts with a fresh portion.', done: false });
      per.push({ id: 'aliquot', text: 'Pipette ' + device.recordAs + ' cm³ into the conical flask', why: 'Fill above the line with the filler, let the bottom of the meniscus down to the line, and touch the tip on the flask at the end.', done: inFlask });
      if (redox) per.push({ id: 'acid', text: 'Add about 10 cm³ of dilute sulfuric acid', why: 'MnO₄⁻ needs H⁺ to be reduced to Mn²⁺.', done: inFlask && !!(t && t.acid) });
      else per.push({ id: 'indicator', text: 'Add a few drops of indicator', why: 'The indicator shows the endpoint.', done: inFlask && !!(s.flask && s.flask.indicator) });
      if (run.warm) per.push({ id: 'warm', text: 'Warm the flask to about 60 °C', why: 'The reaction is slow at room temperature.', done: inFlask && !!(t && t.warmedTo >= 55) });
      per.push({ id: 'under', text: 'Stand the flask on the white tile under the burette', why: 'The first faint colour change shows up against white.', done: inFlask && s.tile && s.under === 'flask' });
      per.push({ id: 'initial', text: 'Read and record the initial burette reading', why: redox ? 'Read the top of the meniscus: manganate(VII) is too dark to see the bottom.' : 'Read the bottom of the meniscus at eye level, to 2 decimal places.', done: !!(t && t.initialRec !== null) });
      per.push({ id: 'titrate', text: firstDone ? 'Add quickly to about 1 cm³ before your rough titre, then drop by drop, swirling' : 'Add the titrant in steps, swirling, until the colour changes', why: redox ? 'The endpoint is the first pale pink that lasts.' : 'The endpoint is the first permanent colour change.', done: false });
      per.push({ id: 'final', text: 'Read and record the final reading', why: 'Titre = final − initial.', done: false });
      out = out.concat(per);
      var r = lab.results();
      out.push({ id: 'repeat', text: 'Repeat until you have concordant titres (within ' + run.concordanceTol_cm3.toFixed(2) + ' cm³)', why: 'The rough titration is not used in the mean.', done: r.concordant.length >= 2 });
      var current = null;
      out.forEach(function (st) { if (!current && !st.done) current = st.id; st.current = st.id === current; });
      return out;
    };

    // Start the standard solution again (after going over the mark, say).
    lab.restartPrep = function () {
      if (!s.prep) return event(res('invalid', 'This experiment has no preparation stage.', 'no-prep'));
      if (s.trials.length || s.trial) return event(res('invalid', 'You have started titrating with this solution.', 'prep-in-use'));
      s.prep = createPrep(run, rng, guided);
      return event(res('info', 'Started the standard solution again with a clean, dry beaker and flask.', 'prep-restart'));
    };

    lab.snapshotForTests = function () { return JSON.parse(JSON.stringify({ b: s.burette, fs: s.flaskState, trials: s.trials.length, t: !!s.trial })); };
    return lab;
  }

  /* ---------- Required practical 1: the standard solution ----------
     Weigh anhydrous sodium carbonate by difference, dissolve it, transfer it
     to a 250.0 cm³ volumetric flask with the washings, make up to the mark and
     mix. What can go wrong, and how it is modelled:
       solid left on the weighing bottle: dealt with by reweighing it (weighing
         by difference) or rinsing it into the beaker; otherwise less is
         transferred than the masses say.
       solution left on the beaker, glass rod and funnel: films of 2.0 %, 0.3 %
         and 0.8 % of the solute; each rinse into the flask carries 90 % of
         what is left across.
       the meniscus: the volume is whatever the student makes it; the neck holds
         about 0.125 cm³ per mm (1.26 cm² cross-section).
       mixing: fewer than 8 inversions leave the solution layered, so portions
         pipetted from it differ (the top is more dilute) and titres drift. */
  var PREP = { films: { beaker: 0.020, rod: 0.003, funnel: 0.008 }, rinseCarry: 0.90, rinseWater_cm3: 10,
    bottleResidue_g: [0.008, 0.020], inversionsNeeded: 8, neck_cm3_per_mm: 0.126, flaskVolume_cm3: 250.0 };

  function createPrep(run, rng, guided) {
    var std = run.standard;
    var p = {
      stage: 'weigh', std: std, issues: [],
      bottle_g: E.round(rng.between(7.6, 9.4), 4), bottleSolid_g: 0, onPan: 'bottle',
      m0: null, m1: null, m2: null, tipped: false, bottleRinsed: false,
      beakerSolid_g: 0, beakerWater_cm3: 0, stirs: 0, dissolved: false, rodUsed: false,
      funnel: false, poured: false, flaskSolute_g: 0, flaskWater_cm3: 0,
      residue: { beaker: 0, rod: 0, funnel: 0 }, rinses: { beaker: 0, rod: 0, funnel: 0 },
      funnelDuringMakeUp: false, stoppered: false, inversions: 0, aliquots: 0,
      studentConc: null, finished: false, level_cm3: 0
    };
    function note(code, kind, msg) { if (!p.issues.some(function (x) { return x.code === code; })) p.issues.push({ code: code, kind: kind, msg: msg, trial: null }); }

    p.balance = function () { return E.round((p.onPan === 'bottle' ? p.bottle_g + p.bottleSolid_g : 0) + 1e-9, 2); };
    p.recordMass = function (which) {
      if (p.finished) return res('invalid', 'The solution is made.', 'prep-done');
      if (which === 'm0') {
        if (p.bottleSolid_g > 0 || p.tipped) return res('invalid', 'Weigh the empty bottle before adding any solid.', 'm0-late');
        p.m0 = p.balance(); return res('good', 'Mass of empty weighing bottle recorded: ' + p.m0.toFixed(2) + ' g.', 'm0');
      }
      if (which === 'm1') {
        if (p.tipped) return res('invalid', 'The solid has already been tipped out.', 'm1-late');
        if (p.bottleSolid_g <= 0) return res('invalid', 'Add the solid to the weighing bottle first.', 'm1-empty');
        p.m1 = p.balance(); return res('good', 'Mass of weighing bottle + solid recorded: ' + p.m1.toFixed(2) + ' g.', 'm1');
      }
      if (which === 'm2') {
        if (!p.tipped) return res('invalid', 'Tip the solid into the beaker first, then reweigh the bottle.', 'm2-early');
        if (p.bottleRinsed) return res('invalid', 'You rinsed the bottle out, so it’s wet: its mass now includes water. Use the mass of the empty bottle instead.', 'm2-wet');
        p.m2 = p.balance(); return res('good', 'Mass of weighing bottle after tipping recorded: ' + p.m2.toFixed(2) + ' g. Mass transferred = ' + (p.m1 !== null ? (p.m1 - p.m2).toFixed(2) + ' g (weighing by difference).' : 'needs the mass with the solid in.'), 'm2');
      }
      return res('invalid', 'Unknown mass.', 'mass-unknown');
    };
    p.addSolid = function (size) {
      if (p.tipped) return res('invalid', 'You’ve already tipped the solid into the beaker. Carry on with that portion.', 'solid-late');
      var g = size === 'scoop' ? rng.between(0.45, 0.75) : size === 'small' ? rng.between(0.07, 0.13) : rng.between(0.012, 0.03);
      if (size === 'remove') {
        g = -Math.min(p.bottleSolid_g, rng.between(0.07, 0.13));
        p.bottleSolid_g += g;
        if (p.m1 !== null) { p.m1 = null; return res('info', 'Solid taken out (into the waste, not back into the stock bottle). Record the bottle + solid again: the old mass is out of date.', 'solid-remove-stale'); }
        return res('info', 'A little solid taken out with the spatula (put it in the waste, not back in the stock bottle).', 'solid-remove');
      }
      p.bottleSolid_g += g;
      if (p.m1 !== null) { p.m1 = null; return res('info', 'Solid added. The mass you recorded is now out of date, so it has been cleared: record the bottle + solid again.', 'solid-add-stale'); }
      return res('info', 'Solid added. The balance reads ' + p.balance().toFixed(2) + ' g.', 'solid-add');
    };
    p.tip = function () {
      if (p.tipped) return res('invalid', 'Already tipped.', 'tip-twice');
      if (p.bottleSolid_g <= 0) return res('invalid', 'There’s no solid in the bottle.', 'tip-empty');
      if (p.m1 === null) return res('invalid', 'Record the mass of the bottle with the solid in it first.', 'tip-no-m1');
      var left = Math.min(p.bottleSolid_g, rng.between(PREP.bottleResidue_g[0], PREP.bottleResidue_g[1]));
      p.beakerSolid_g += p.bottleSolid_g - left; p.bottleSolid_g = left; p.tipped = true;
      return res('good', 'Tipped into the beaker. A few grains (' + left.toFixed(3) + ' g) cling to the bottle: reweigh it so you know how much really went in.', 'tip');
    };
    p.rinseBottle = function () {
      if (!p.tipped) return res('invalid', 'Tip the solid out first.', 'rbottle-early');
      if (p.bottleRinsed) return res('harmless', 'Already rinsed.', 'rbottle-twice');
      p.beakerSolid_g += p.bottleSolid_g; p.bottleSolid_g = 0; p.bottleRinsed = true; p.beakerWater_cm3 += 5;
      return res('alternative', 'Rinsed the bottle into the beaker with deionised water, so every grain is in the beaker. Use the mass of the bottle with the solid minus the mass of the empty bottle.', 'rbottle');
    };
    p.addWater = function () {
      if (p.poured) return res('invalid', 'The solution is already in the volumetric flask.', 'water-late');
      p.beakerWater_cm3 += 100;
      return res('good', 'About 100 cm³ of deionised water added to the beaker. Less than the final volume, so there is room for the washings.', 'water');
    };
    p.stir = function () {
      if (p.beakerWater_cm3 <= 0) return res('invalid', 'Add deionised water first.', 'stir-dry');
      if (p.beakerSolid_g <= 0) return res('invalid', 'There’s no solid in the beaker yet.', 'stir-empty');
      p.stirs++; p.rodUsed = true;
      if (p.stirs >= 3) p.dissolved = true;
      return res(p.dissolved ? 'good' : 'info', p.dissolved ? 'Stirred with a glass rod until all the solid has dissolved.' : 'Stirring… some solid is still undissolved.', 'stir');
    };
    p.setFunnel = function (on) {
      if (p.funnel === on) return res('harmless', on ? 'The funnel is already in the flask.' : 'The funnel is already out.', 'pfunnel-same');
      p.funnel = on;
      return res(on ? 'good' : 'info', on ? 'Funnel in the neck of the volumetric flask.' : 'Funnel removed.', on ? 'pfunnel-in' : 'pfunnel-out');
    };
    p.pour = function () {
      if (p.poured) return res('invalid', 'Already transferred.', 'pour-twice');
      if (!p.funnel) return res('invalid', 'Use a funnel: the neck of a volumetric flask is too narrow to pour into without spilling.', 'pour-no-funnel');
      if (p.beakerWater_cm3 <= 0 || p.beakerSolid_g <= 0) return res('invalid', 'Dissolve the solid in the beaker first.', 'pour-nothing');
      var total = p.beakerSolid_g;
      var films = PREP.films.beaker + (p.rodUsed ? PREP.films.rod : 0) + PREP.films.funnel;
      var undissolved = p.dissolved ? 0 : total * 0.25;
      if (!p.dissolved) note('undissolved', 'mistake', 'Poured before all the solid had dissolved. Undissolved solid stays in the beaker, so less ends up in the flask.');
      p.residue.beaker = total * PREP.films.beaker + undissolved;
      p.residue.rod = p.rodUsed ? total * PREP.films.rod : 0;
      p.residue.funnel = total * PREP.films.funnel;
      p.flaskSolute_g = total * (1 - films) - undissolved;
      p.flaskWater_cm3 = p.beakerWater_cm3 * (1 - films);
      p.beakerSolid_g = 0; p.poured = true;
      return res('good', 'Solution poured into the volumetric flask through the funnel. A film of it still coats the beaker, the rod and the funnel.', 'pour');
    };
    p.rinse = function (item) {
      if (!p.poured) return res('invalid', 'Transfer the solution first.', 'prinse-early');
      if (p.level_cm3 > 0 || p.stoppered) return res('invalid', 'Rinse before making up to the mark.', 'prinse-late');
      if (!p.funnel) return res('invalid', 'Put the funnel back in to rinse into the flask.', 'prinse-no-funnel');
      if (item === 'rod' && !p.rodUsed) return res('harmless', 'The rod wasn’t used.', 'prinse-rod-unused');
      var moved = p.residue[item] * PREP.rinseCarry;
      p.residue[item] -= moved; p.flaskSolute_g += moved; p.flaskWater_cm3 += PREP.rinseWater_cm3; p.rinses[item]++;
      var name = { beaker: 'beaker', rod: 'glass rod', funnel: 'funnel' }[item];
      return res('good', 'Rinsed the ' + name + ' with deionised water into the flask (rinse ' + p.rinses[item] + '). The washings carry the solution clinging to it into the flask.', 'prinse-' + item);
    };
    p.fillWater = function (how) {
      if (!p.poured) return res('invalid', 'Transfer the solution first.', 'fill-early');
      if (p.stoppered) return res('invalid', 'Take the stopper out first.', 'fill-stoppered');
      if (p.funnel) { p.funnelDuringMakeUp = true; }
      var v = p.flaskWater_cm3, mark = PREP.flaskVolume_cm3;
      if (how === 'bottle') {
        if (v < mark - 5) v = mark - rng.between(1.2, 2.4);
        else v += rng.between(0.35, 0.9);
      } else {
        v += Math.max(0.03, 0.05 + rng.gauss() * 0.006);
      }
      p.flaskWater_cm3 = v; p.level_cm3 = v;
      var off = v - mark;
      if (off > 0.05) {
        note('over-mark', 'mistake', 'Filled past the mark. The volume is ' + off.toFixed(2) + ' cm³ more than 250.0 cm³, so the solution is more dilute than you calculate. Water can’t be taken out again: start the solution again.');
        return res('mistake', 'Over the mark. The bottom of the meniscus is above the line: the solution is too dilute. Start again.', 'fill-over');
      }
      if (how === 'bottle' && off > -0.6) return res('info', 'Close to the line now: use the dropper for the last part.', 'fill-close');
      return res('info', how === 'bottle' ? 'Filled with deionised water to just below the mark. Use the dropper for the last part.' : 'One drop added.', 'fill-' + how);
    };
    p.stopper = function () {
      if (!p.poured) return res('invalid', 'There’s nothing in the flask yet.', 'stopper-early');
      if (p.funnel) return res('invalid', 'Take the funnel out first.', 'stopper-funnel');
      if (p.stoppered) return res('harmless', 'Already stoppered.', 'stopper-twice');
      if (p.funnelDuringMakeUp && !p.funnelDrained) {
        // Water left in the funnel stem ran in after the level was set.
        p.flaskWater_cm3 += 0.30; p.level_cm3 = p.flaskWater_cm3; p.funnelDrained = true;
        note('funnel-makeup', 'mistake', 'The funnel was still in while making up to the mark. Water left in its stem ran in afterwards, about 0.3 cm³ past the line, so the solution is more dilute than you calculate.');
      }
      var off = p.flaskWater_cm3 - PREP.flaskVolume_cm3;
      if (off < -0.05) note('under-mark', 'mistake', 'The bottom of the meniscus was ' + Math.abs(off).toFixed(2) + ' cm³ below the mark, so the volume is less than 250.0 cm³ and the solution is more concentrated than you calculate.');
      p.stoppered = true; p.level_cm3 = p.flaskWater_cm3;
      return res('good', 'Stoppered. Now invert the flask several times to mix it.', 'stopper');
    };
    p.invert = function () {
      if (!p.stoppered) return res('invalid', 'Stopper the flask first.', 'invert-open');
      p.inversions++;
      return res(p.inversions >= PREP.inversionsNeeded ? 'good' : 'info', 'Inverted ' + p.inversions + ' time' + (p.inversions === 1 ? '' : 's') + '.' + (p.inversions >= PREP.inversionsNeeded ? ' Thoroughly mixed.' : ''), 'invert');
    };
    p.massUsed = function () {
      if (p.m1 === null) return null;
      if (p.m2 !== null) return E.round(p.m1 - p.m2, 2);
      if (p.m0 !== null) return E.round(p.m1 - p.m0, 2);
      return null;
    };
    p.finish = function () {
      if (!p.stoppered) return res('invalid', 'Stopper the flask first.', 'finish-open');
      if (p.massUsed() === null) return res('invalid', 'You need the mass transferred: record the bottle after tipping (weighing by difference), or the empty bottle if you rinsed it out.', 'finish-no-mass');
      if (p.inversions < PREP.inversionsNeeded) note('not-mixed', 'mistake', 'The flask was inverted only ' + p.inversions + ' time' + (p.inversions === 1 ? '' : 's') + '. The water added last sits at the top, so portions pipetted from it differ in concentration and titres drift.');
      if (p.m2 === null && !p.bottleRinsed) note('bottle-residue', 'mistake', 'The bottle wasn’t reweighed or rinsed out after tipping, so ' + p.bottleSolid_g.toFixed(3) + ' g left on it is counted in your mass but isn’t in the flask: the real concentration is lower than your calculated one.');
      ['beaker', 'rod', 'funnel'].forEach(function (it) {
        if (it === 'rod' && !p.rodUsed) return;
        if (p.rinses[it] === 0) note('unrinsed-' + it, 'mistake', 'The ' + (it === 'rod' ? 'glass rod' : it) + ' wasn’t rinsed into the flask, so the solution clinging to it was lost (about ' + (PREP.films[it] * 100).toFixed(1) + ' % of the sodium carbonate). The real concentration is lower than your calculated one.');
      });
      p.finished = true; p.stage = 'done';
      return res('good', 'Standard solution made.', 'finish');
    };
    p.ready = function () { return p.finished; };
    // What the student believes: their mass over Mr, in 250.0 cm³.
    p.statedConc = function () { var m = p.massUsed(); return m === null ? null : m / std.Mr / (PREP.flaskVolume_cm3 / 1000); };
    // What is really in the flask.
    p.trueConc = function () { return p.finished || p.stoppered ? p.flaskSolute_g / std.Mr / (p.flaskWater_cm3 / 1000) : null; };
    // Each portion pipetted out. Unmixed, the top is dilute and lower layers
    // stronger, so successive portions drift upwards.
    p.aliquotConc = function () {
      var c = p.trueConc(), m = Math.min(1, p.inversions / PREP.inversionsNeeded);
      p.aliquots++;
      if (m >= 1) return c;
      return c * (1 + (1 - m) * (-0.06 + 0.025 * p.aliquots + rng.gauss() * 0.01));
    };
    p.steps = function () {
      var list = [
        { id: 'calc-mass', text: 'Work out the mass needed for 250.0 cm³ of about ' + std.target_M.toFixed(3) + ' mol dm⁻³', done: p.bottleSolid_g > 0 || p.tipped },
        { id: 'weigh', text: 'Add the solid to the weighing bottle on the balance; record the mass', done: p.m1 !== null },
        { id: 'tip', text: 'Tip the solid into a beaker', done: p.tipped },
        { id: 'reweigh', text: 'Reweigh the bottle (weighing by difference)', done: p.m2 !== null || p.bottleRinsed },
        { id: 'dissolve', text: 'Add about 100 cm³ of deionised water and stir until it dissolves', done: p.dissolved },
        { id: 'transfer', text: 'Pour into the volumetric flask through a funnel', done: p.poured },
        { id: 'rinse', text: 'Rinse the beaker, rod and funnel into the flask', done: p.rinses.beaker > 0 && (p.rinses.rod > 0 || !p.rodUsed) && p.rinses.funnel > 0 },
        { id: 'makeup', text: 'Remove the funnel; make up to the mark, using a dropper at the end', done: p.level_cm3 >= PREP.flaskVolume_cm3 - 0.05 },
        { id: 'mix', text: 'Stopper and invert the flask several times', done: p.inversions >= PREP.inversionsNeeded },
        { id: 'done', text: 'Calculate the concentration', done: p.finished }
      ];
      var cur = null;
      list.forEach(function (st) { if (!cur && !st.done) cur = st.id; st.current = st.id === cur; });
      return list;
    };
    p.PREP = PREP;
    return p;
  }

  root.TitrationLab = { create: create, SWIRL_s: SWIRL_s, STREAM_cm3_s: STREAM_cm3_s, ENDPOINT_WINDOW: ENDPOINT_WINDOW, PREP: PREP };
})(typeof self !== 'undefined' ? self : this);
