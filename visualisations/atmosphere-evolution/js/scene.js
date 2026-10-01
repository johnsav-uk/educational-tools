/* The Evolution of the Earth's Atmosphere: THREE.JS SCENE
   One island volcano in an ocean. Everything responds to AE.Scene.update(v),
   where v is the interpolated state from AE.interp(s). The scene is built in
   sections: terrain, ocean, sky, particles, life, lightning, cut-away, then the
   render loop with adaptive quality.

   Needs three.min.js r128, OrbitControls, EffectComposer and UnrealBloomPass
   (all vendored in lib/). */
(function () {
  'use strict';
  var AE = window.AE = window.AE || {};

  /* world constants */
  var HALF = 55;            // terrain covers x,z in [-HALF, HALF]
  var WF = 0.3;             // final sea level
  var DRY = -3.6;           // "sea level" before the oceans exist (below the lowest ground)
  var H_MIN = -5, H_RANGE = 20;   // height-texture encoding

  var QUALITY = {
    low:    { pr: 0.75, parts: 0.35, bloom: false, trees: 0.4, clouds: 0.4, rain: 0.4, bubbles: 0.4 },
    medium: { pr: 1.0,  parts: 0.65, bloom: true,  trees: 0.7, clouds: 0.7, rain: 0.7, bubbles: 0.7 },
    high:   { pr: 2.0,  parts: 1.0,  bloom: true,  trees: 1.0, clouds: 1.0, rain: 1.0, bubbles: 1.0 }
  };
  var ORDER = ['low', 'medium', 'high'];

  /* ── terrain height field (JS side; the GPU only ever sees the result) ── */
  function h1(x, y) { var s = Math.sin(x * 127.1 + y * 311.7) * 43758.5453; return s - Math.floor(s); }
  function vn(x, y) {
    var ix = Math.floor(x), iy = Math.floor(y), fx = x - ix, fy = y - iy;
    fx = fx * fx * (3 - 2 * fx); fy = fy * fy * (3 - 2 * fy);
    var a = h1(ix, iy), b = h1(ix + 1, iy), c = h1(ix, iy + 1), d = h1(ix + 1, iy + 1);
    return a + (b - a) * fx + (c - a) * fy + (a - b - c + d) * fx * fy;
  }
  function fbm(x, y) { var a = 0.5, s = 0; for (var i = 0; i < 4; i++) { s += a * vn(x, y); x = x * 2.03 + 17.1; y = y * 2.03 + 9.2; a *= 0.5; } return s; }
  function sstep(a, b, x) { var t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); }
  /* Two landscapes share one mesh. The volcanic island belongs to the first
     billion years; after that the scene morphs (uRelief) to a low island with
     no volcano, which is where algae and plants appear. */
  function baseAt(r) { return 1.6 - sstep(10, 30, r) * 4.6; }
  function heightV(x, z) {
    var r = Math.sqrt(x * x + z * z);
    var cone = 9.5 * Math.exp(-Math.pow(r / 7.5, 1.5));
    var crater = -3.2 * Math.exp(-Math.pow(r / 1.5, 2));
    var n = (fbm(x * 0.12 + 5, z * 0.12 + 9) - 0.5) * 3.0 * sstep(40, 8, r) + (fbm(x * 0.4, z * 0.4) - 0.5) * 0.6 * sstep(30, 6, r);
    return baseAt(r) + cone + crater + n;
  }
  function heightL(x, z) {
    var r = Math.sqrt(x * x + z * z);
    var hills = 2.4 * Math.exp(-Math.pow(r / 10, 2));
    var n = (fbm(x * 0.1 + 2, z * 0.1 + 7) - 0.5) * 3.2 * sstep(34, 6, r) + (fbm(x * 0.35 + 4, z * 0.35) - 0.5) * 0.7 * sstep(30, 6, r);
    return baseAt(r) + hills + n;
  }
  function heightAt(x, z, relief) {
    if (relief === undefined) relief = 1;
    var l = heightL(x, z);
    return l + (heightV(x, z) - l) * relief;
  }

  function rng(seed) { var s = seed; return function () { s = (s * 16807) % 2147483647; return s / 2147483647; }; }
  function lerp(a, b, t) { return a + (b - a) * t; }

  AE.Scene = (function () {
    var S = null;                                   // latest interpolated state
    var renderer, composer, bloom, scene, camera, controls, clock, canvas, box, labelLayer;
    var U, TEX, quality = 'medium', auto = true, running = false, visible = true, dirty = true;
    var groups = {}, mats = {}, parts = {}, life = {}, labels = [];
    var view = 'island', showLabels = false, levelNow = DRY, spotsKey = '';
    var camTween = null, time = 0, flashT = 0, nextStrike = 2, strikeLife = 0, bolt, boltLight, flash = 0;
    var fps = { acc: 0, n: 0, low: 0, warm: 2.5 };
    var cbs = { quality: null, fallback: null };
    var reduced = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (window.matchMedia) {
      var mq = matchMedia('(prefers-reduced-motion: reduce)');
      var onMq = function () { reduced = mq.matches; if (controls) controls.autoRotate = false; };
      if (mq.addEventListener) mq.addEventListener('change', onMq); else if (mq.addListener) mq.addListener(onMq);
    }
    var dummy, tmpV, tmpC;

    /* ═══════════ INIT ═══════════ */
    function init(boxEl, canvasEl, labelEl) {
      box = boxEl; canvas = canvasEl; labelLayer = labelEl;
      try {
        renderer = new THREE.WebGLRenderer({ canvas: canvas, antialias: true, powerPreference: 'high-performance' });
        if (!renderer.getContext()) throw new Error('no context');
      } catch (e) { return false; }
      dummy = new THREE.Object3D(); tmpV = new THREE.Vector3(); tmpC = new THREE.Color();
      renderer.setClearColor(0x050e1a, 1);
      scene = new THREE.Scene();
      scene.fog = new THREE.FogExp2(0x888888, 0.01);
      camera = new THREE.PerspectiveCamera(50, 1.6, 0.5, 2500);
      controls = new THREE.OrbitControls(camera, canvas);
      controls.enableDamping = true; controls.dampingFactor = 0.08;
      controls.minDistance = 14; controls.maxDistance = 120; controls.maxPolarAngle = 1.52;
      controls.autoRotateSpeed = 0.6;
      if (controls.listenToKeyEvents) controls.listenToKeyEvents(canvas);
      controls.keyPanSpeed = 14;
      canvas.addEventListener('pointerdown', function () { camTween = null; });
      canvas.addEventListener('wheel', function () { camTween = null; }, { passive: true });

      U = {
        time: { value: 0 }, fogC: { value: new THREE.Color() }, fogD: { value: 0.01 },
        lightDir: { value: new THREE.Vector3(0.55, 0.55, 0.62).normalize() },
        sunDir: { value: new THREE.Vector3(-0.3, 0.3, -0.9).normalize() },
        sunC: { value: new THREE.Color(1, 0.9, 0.8) }, amb: { value: new THREE.Color(0.3, 0.3, 0.3) },
        flash: { value: 0 }, px: { value: 800 }, relief: { value: 1 }
      };
      TEX = AE.makeTextures();

      buildLights(); buildSky(); buildTerrain(); buildOcean(); buildParticles();
      buildClouds(); buildLife(); buildLightning(); buildCutaway(); buildLabels();
      setupPost();
      setCameraPreset(true);

      new ResizeObserver(resize).observe(box);
      if ('IntersectionObserver' in window) new IntersectionObserver(function (e) { visible = e[0].isIntersecting; }, { threshold: 0 }).observe(box);
      canvas.addEventListener('webglcontextlost', function (e) { e.preventDefault(); running = false; if (cbs.fallback) cbs.fallback('lost'); });
      resize();
      setQuality('medium', true);
      clock = new THREE.Clock();
      running = true;
      requestAnimationFrame(frame);
      return true;
    }

    /* ═══════════ LIGHTS ═══════════ */
    function buildLights() {
      mats.sun = new THREE.DirectionalLight(0xffffff, 1.0);
      mats.hemi = new THREE.HemisphereLight(0xffffff, 0x332211, 0.6);
      scene.add(mats.sun, mats.hemi);
      boltLight = new THREE.PointLight(0xaab0ff, 0, 60);
      scene.add(boltLight);
    }

    /* ═══════════ SKY, STARS, MOON, SUN GLOW ═══════════ */
    function buildSky() {
      var G = AE.GLSL.sky;
      mats.sky = new THREE.ShaderMaterial({
        vertexShader: G.vert, fragmentShader: G.frag, side: THREE.BackSide, depthWrite: false, fog: false,
        uniforms: {
          uTop: { value: new THREE.Color() }, uHor: { value: new THREE.Color() },
          uSunDir: U.sunDir, uSunC: U.sunC, uStars: { value: 0 }, uTime: U.time, uTwinkle: { value: 1 }, uFlash: U.flash
        }
      });
      groups.sky = new THREE.Mesh(new THREE.SphereGeometry(900, 32, 16), mats.sky);
      groups.sky.renderOrder = -10; groups.sky.frustumCulled = false;
      scene.add(groups.sky);
      mats.moon = new THREE.MeshBasicMaterial({ map: TEX.moon, fog: false });
      groups.moon = new THREE.Mesh(new THREE.SphereGeometry(1, 28, 20), mats.moon);
      groups.moon.renderOrder = -9; groups.moon.frustumCulled = false; groups.moon.material.depthWrite = false;
      scene.add(groups.moon);
    }

    /* ═══════════ TERRAIN ═══════════ */
    function buildTerrain() {
      var N = 176, size = HALF * 2;
      var geo = new THREE.PlaneGeometry(size, size, N, N);
      geo.rotateX(-Math.PI / 2);
      var p = geo.attributes.position, late = geo.clone(), lp = late.attributes.position, hl = new Float32Array(p.count), i;
      for (i = 0; i < p.count; i++) {
        p.setY(i, heightV(p.getX(i), p.getZ(i)));
        hl[i] = heightL(p.getX(i), p.getZ(i)); lp.setY(i, hl[i]);
      }
      geo.computeVertexNormals(); late.computeVertexNormals();
      geo.setAttribute('aHL', new THREE.BufferAttribute(hl, 1));
      geo.setAttribute('aNL', late.attributes.normal.clone());
      late.dispose();
      var G = AE.GLSL.terrain;
      mats.terrain = new THREE.ShaderMaterial({
        vertexShader: G.vert, fragmentShader: G.frag, fog: false,
        uniforms: {
          uTime: U.time, uLava: { value: 1 }, uGreen: { value: 0 }, uAlgae: { value: 0 }, uWater: { value: DRY }, uRelief: U.relief, uFogD: U.fogD, uFogC: U.fogC,
          uLightDir: U.lightDir, uSunC: U.sunC, uAmb: U.amb, uFlash: U.flash
        }
      });
      groups.terrain = new THREE.Mesh(geo, mats.terrain);
      scene.add(groups.terrain);
      /* a dark plain beyond the terrain tile, so the edge of the world never shows */
      var far = new THREE.Mesh(new THREE.CircleGeometry(1400, 48).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ color: 0x1f1411 }));
      far.position.y = -3.06; groups.terrain.add(far);

      /* height texture so the ocean can tell deep water from shallows and draw foam */
      var T = 128, data = new Uint8Array(T * T * 4);
      var enc = function (h) { return Math.min(255, Math.max(0, Math.round((h - H_MIN) / H_RANGE * 255))); };   // R: volcanic, G: later
      for (var j = 0; j < T; j++) for (var k = 0; k < T; k++) {
        var x = k / (T - 1) * size - HALF, z = j / (T - 1) * size - HALF;
        var o = (j * T + k) * 4; data[o] = enc(heightV(x, z)); data[o + 1] = enc(heightL(x, z)); data[o + 2] = 0; data[o + 3] = 255;
      }
      mats.hTex = new THREE.DataTexture(data, T, T, THREE.RGBAFormat);
      mats.hTex.minFilter = mats.hTex.magFilter = THREE.LinearFilter; mats.hTex.needsUpdate = true;
    }

    /* ═══════════ OCEAN ═══════════ */
    function buildOcean() {
      var G = AE.GLSL.ocean;
      mats.ocean = new THREE.ShaderMaterial({
        vertexShader: G.vert, fragmentShader: G.frag, transparent: true, depthWrite: false, fog: false,
        uniforms: {
          uHeight: { value: mats.hTex }, uHMin: { value: H_MIN }, uHRange: { value: H_RANGE }, uLevel: { value: DRY }, uHalf: { value: HALF },
          uDeep: { value: new THREE.Color() }, uShallow: { value: new THREE.Color() },
          uSkyTop: { value: new THREE.Color() }, uSkyHor: { value: new THREE.Color() },
          uSunDir: U.sunDir, uSunC: U.sunC, uFogC: U.fogC, uFogD: U.fogD, uTime: U.time,
          uLava: { value: 0 }, uGreen: { value: 0 }, uWave: { value: 1 }, uFlash: U.flash, uRelief: U.relief
        }
      });
      var geo = new THREE.PlaneGeometry(700, 700, 200, 200); geo.rotateX(-Math.PI / 2);
      groups.ocean = new THREE.Mesh(geo, mats.ocean);
      groups.ocean.frustumCulled = false; groups.ocean.renderOrder = 1;
      scene.add(groups.ocean);
    }

    /* ═══════════ PARTICLES: plume, embers, steam, rain ═══════════ */
    function pointsGeo(n, withGas, withSpot) {
      var g = new THREE.BufferGeometry(), r = rng(1234 + n), i;
      var seed = new Float32Array(n * 4), act = new Float32Array(n), gas = new Float32Array(n);
      for (i = 0; i < n; i++) { seed[i * 4] = r(); seed[i * 4 + 1] = r(); seed[i * 4 + 2] = r(); seed[i * 4 + 3] = r(); act[i] = i / n; gas[i] = r(); }
      g.setAttribute('position', new THREE.BufferAttribute(new Float32Array(n * 3), 3));
      g.setAttribute('aSeed', new THREE.BufferAttribute(seed, 4));
      g.setAttribute('aAct', new THREE.BufferAttribute(act, 1));
      if (withGas) g.setAttribute('aGas', new THREE.BufferAttribute(gas, 1));
      if (withSpot) g.setAttribute('aSpot', new THREE.BufferAttribute(new Float32Array(n * 3), 3));
      return g;
    }
    function buildParticles() {
      var crater = new THREE.Vector3(0, heightAt(0, 0) + 0.3, 0);
      parts.crater = crater;
      /* ash and gas plume */
      var Gp = AE.GLSL.plume;
      mats.plume = new THREE.ShaderMaterial({
        vertexShader: Gp.vert, fragmentShader: Gp.frag, transparent: true, depthWrite: false,
        uniforms: {
          uMap: { value: TEX.smoke }, uTime: U.time, uIntensity: { value: 1 }, uH: { value: 20 }, uPx: U.px, uFlash: U.flash,
          uGasMode: { value: 0 }, uSpeed: { value: 0.07 }, uOrigin: { value: crater }, uWind: { value: new THREE.Vector2(0.6, 0.25) },
          uC0: { value: new THREE.Color() }, uC1: { value: new THREE.Color() }, uC2: { value: new THREE.Color() },
          uC3: { value: new THREE.Color() }, uC4: { value: new THREE.Color() }, uCum: { value: new THREE.Vector4(0.25, 0.5, 0.75, 0.9) }
        }
      });
      parts.plumeN = 6000;
      parts.plume = new THREE.Points(pointsGeo(parts.plumeN, true), mats.plume);
      parts.plume.frustumCulled = false; parts.plume.renderOrder = 3;
      scene.add(parts.plume);

      /* embers and sparks: additive, so they bloom */
      var Ge = AE.GLSL.ember;
      mats.ember = new THREE.ShaderMaterial({
        vertexShader: Ge.vert, fragmentShader: Ge.frag, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
        uniforms: { uTime: U.time, uIntensity: { value: 1 }, uPx: U.px, uSpeed: { value: 0.35 }, uOrigin: { value: crater } }
      });
      parts.emberN = 1400;
      parts.ember = new THREE.Points(pointsGeo(parts.emberN), mats.ember);
      parts.ember.frustumCulled = false; parts.ember.renderOrder = 4;
      scene.add(parts.ember);

      /* steam where lava reaches the sea */
      var Gs = AE.GLSL.steam;
      mats.steam = new THREE.ShaderMaterial({
        vertexShader: Gs.vert, fragmentShader: Gs.frag, transparent: true, depthWrite: false,
        uniforms: { uMap: { value: TEX.smoke }, uTime: U.time, uAmount: { value: 0 }, uPx: U.px, uSpeed: { value: 0.22 }, uTint: { value: new THREE.Vector3(0.9, 0.9, 0.92) } }
      });
      parts.steamN = 2200;
      parts.steam = new THREE.Points(pointsGeo(parts.steamN, false, true), mats.steam);
      parts.steam.frustumCulled = false; parts.steam.renderOrder = 3;
      scene.add(parts.steam);
      parts.spots = [];

      /* rain */
      var Gr = AE.GLSL.rain, n = 1800, g = new THREE.BufferGeometry(), r = rng(99);
      var pos = new Float32Array(n * 2 * 3), sd = new Float32Array(n * 2 * 3), end = new Float32Array(n * 2), act = new Float32Array(n * 2);
      for (var i = 0; i < n; i++) {
        var a = r(), b = r(), c = r();
        for (var k = 0; k < 2; k++) { var o = i * 2 + k; sd[o * 3] = a; sd[o * 3 + 1] = b; sd[o * 3 + 2] = c; end[o] = k; act[o] = i / n; }
      }
      g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
      g.setAttribute('aSeed', new THREE.BufferAttribute(sd, 3));
      g.setAttribute('aEnd', new THREE.BufferAttribute(end, 1));
      g.setAttribute('aAct', new THREE.BufferAttribute(act, 1));
      mats.rain = new THREE.ShaderMaterial({ vertexShader: Gr.vert, fragmentShader: Gr.frag, transparent: true, depthWrite: false, uniforms: { uTime: U.time, uRain: { value: 0 } } });
      parts.rainN = n;
      parts.rain = new THREE.LineSegments(g, mats.rain);
      parts.rain.frustumCulled = false; parts.rain.renderOrder = 5;
      scene.add(parts.rain);
    }

    /* the places on the shore where lava meets water, for a given sea level */
    function updateSpots(level, relief) {
      var angs = [0.35, 1.15, 2.05, 2.95, 4.05, 5.05], spots = [], i, r, a;
      for (i = 0; i < angs.length; i++) {
        a = angs[i];
        for (r = 4; r < 45; r += 0.25) { if (heightAt(r * Math.cos(a), r * Math.sin(a), relief) < level) break; }
        spots.push(new THREE.Vector3(r * Math.cos(a), level, r * Math.sin(a)));
      }
      parts.spots = spots;
      var attr = parts.steam.geometry.attributes.aSpot, n = parts.steamN, arr = attr.array;
      for (i = 0; i < n; i++) {
        var s = spots[i % spots.length];
        arr[i * 3] = s.x; arr[i * 3 + 1] = s.y; arr[i * 3 + 2] = s.z;
      }
      attr.needsUpdate = true;
    }

    /* ═══════════ CLOUDS ═══════════ */
    function buildClouds() {
      groups.clouds = new THREE.Group();
      var r = rng(55), i;
      life.clouds = [];
      for (i = 0; i < 30; i++) {
        var m = new THREE.SpriteMaterial({ map: TEX.cloud, transparent: true, depthWrite: false, opacity: 0 });
        var sp = new THREE.Sprite(m), a = i % 3 ? -2.25 + (r() - 0.5) * 2.6 : r() * 6.283, d = 26 + r() * 60;   // most sit in front of the default camera
        sp.position.set(Math.cos(a) * d, 15 + r() * 12, Math.sin(a) * d);
        var w = 20 + r() * 26; sp.scale.set(w, w * 0.5, 1);
        sp.userData.th = r();
        groups.clouds.add(sp); life.clouds.push(sp);
      }
      scene.add(groups.clouds);
    }

    /* ═══════════ LIFE: algae, oxygen bubbles, plants ═══════════ */
    function buildLife() {
      var r = rng(777), i, tries;
      /* algae mats in the shallows of the later island */
      var sg = new THREE.SphereGeometry(1, 14, 10, 0, Math.PI * 2, 0, Math.PI / 2);
      life.stroN = 110; life.stro = []; tries = 0;
      while (life.stro.length < life.stroN && tries++ < 6000) {
        var a = r() * 6.283, d = 9 + r() * 24, x = Math.cos(a) * d, z = Math.sin(a) * d, h = heightL(x, z), depth = WF - h;
        if (depth > 0.08 && depth < 0.7) life.stro.push({ x: x, y: h, z: z, s: 0.3 + r() * 0.55, th: r(), ry: r() * 6 });
      }
      life.stroMesh = new THREE.InstancedMesh(sg, new THREE.MeshLambertMaterial({ map: TEX.stroma }), life.stroN);
      life.stroMesh.frustumCulled = false;
      scene.add(life.stroMesh);

      /* rising oxygen bubbles */
      life.bubN = 150; life.bub = [];
      for (i = 0; i < life.bubN && life.stro.length; i++) {
        var b = life.stro[Math.floor(r() * life.stro.length)];
        life.bub.push({ x: b.x + (r() - 0.5) * 0.6, y: b.y + 0.2, z: b.z + (r() - 0.5) * 0.6, r: 0.06 + r() * 0.1, sp: r(), ph: r() });
      }
      life.bubMesh = new THREE.InstancedMesh(new THREE.SphereGeometry(1, 8, 6),
        new THREE.MeshBasicMaterial({ color: 0xcdeeff, transparent: true, opacity: 0.42, depthWrite: false }), life.bubN);
      life.bubMesh.frustumCulled = false; life.bubMesh.renderOrder = 2;
      scene.add(life.bubMesh);

      /* trees and plants, placed once, grown by scale */
      life.treeN = 320; life.trees = []; tries = 0;
      while (life.trees.length < life.treeN && tries++ < 20000) {
        var a2 = r() * 6.283, d2 = 2 + r() * 17, tx = Math.cos(a2) * d2, tz = Math.sin(a2) * d2, th = heightL(tx, tz);
        var gx = heightL(tx + 0.6, tz) - heightL(tx - 0.6, tz), gz = heightL(tx, tz + 0.6) - heightL(tx, tz - 0.6);
        if (th > WF + 0.45 && th < 6.0 && Math.sqrt(gx * gx + gz * gz) < 0.85) {
          life.trees.push({ x: tx, y: th, z: tz, s: 0.75 + r() * 0.7, th: r(), broad: r() > 0.45, hue: r() });
        }
      }
      life.treeMeshes = makeTreeMeshes(life.treeN);
      life.treeMeshes.forEach(function (m) { scene.add(m); });
    }
    function makeTreeMeshes(n) {
      var trunkG = new THREE.CylinderGeometry(0.07, 0.12, 1, 5); trunkG.translate(0, 0.5, 0);
      var broadG = new THREE.IcosahedronGeometry(0.62, 0); broadG.translate(0, 1.45, 0);
      var coneG = new THREE.ConeGeometry(0.55, 1.6, 7); coneG.translate(0, 1.6, 0);
      var trunk = new THREE.InstancedMesh(trunkG, new THREE.MeshLambertMaterial({ color: 0x5a3d25 }), n);
      var broad = new THREE.InstancedMesh(broadG, new THREE.MeshLambertMaterial({ color: 0xffffff }), n);
      var cone = new THREE.InstancedMesh(coneG, new THREE.MeshLambertMaterial({ color: 0xffffff }), n);
      [trunk, broad, cone].forEach(function (m) { m.frustumCulled = false; });
      return [trunk, broad, cone];
    }
    /* write tree matrices for a list at the current growth; used by the island and the cut-away */
    function layoutTrees(meshes, list, growth, frac, offset, scaleAll) {
      var nb = 0, nc = 0, limit = Math.floor(list.length * frac), i, t, sc, g;
      for (i = 0; i < limit; i++) {
        t = list[i];
        g = sstep(t.th * 0.8, t.th * 0.8 + 0.25, growth) * (0.3 + 0.7 * growth) * t.s * (scaleAll || 1);
        dummy.position.set(t.x + (offset ? offset.x : 0), t.y + (offset ? offset.y : 0), t.z + (offset ? offset.z : 0));
        dummy.rotation.set(0, t.hue * 6.28, 0); dummy.scale.set(g, g * (0.9 + 0.3 * t.hue), g);
        dummy.updateMatrix();
        meshes[0].setMatrixAt(i, dummy.matrix);
        tmpC.setHSL(0.27 + t.hue * 0.06, 0.45, 0.22 + t.hue * 0.12);
        if (t.broad) { meshes[1].setMatrixAt(nb, dummy.matrix); meshes[1].setColorAt(nb, tmpC); nb++; }
        else { tmpC.offsetHSL(0.02, 0, -0.04); meshes[2].setMatrixAt(nc, dummy.matrix); meshes[2].setColorAt(nc, tmpC); nc++; }
      }
      meshes[0].count = limit; meshes[1].count = nb; meshes[2].count = nc;
      meshes.forEach(function (m) { m.instanceMatrix.needsUpdate = true; if (m.instanceColor) m.instanceColor.needsUpdate = true; });
    }
    function layoutStromatolites(growth, frac) {
      var limit = Math.floor(life.stro.length * frac), i, t, g;
      for (i = 0; i < limit; i++) {
        t = life.stro[i]; g = sstep(t.th * 0.7, t.th * 0.7 + 0.3, growth) * t.s * (0.4 + 0.6 * growth);
        dummy.position.set(t.x, t.y - 0.05, t.z); dummy.rotation.set(0, t.ry, 0); dummy.scale.set(g * 2.1, g * 0.3, g * 2.1);
        dummy.updateMatrix(); life.stroMesh.setMatrixAt(i, dummy.matrix);
      }
      life.stroMesh.count = limit; life.stroMesh.instanceMatrix.needsUpdate = true;
    }
    function animateBubbles(v, q) {
      var cnt = Math.floor(life.bub.length * q.bubbles * Math.min(1, v.bubbles * 1.2)), i, b, ph, y, sc;
      if (v.algae < 0.02) cnt = 0;
      var top = levelNow + 1.6;
      for (i = 0; i < cnt; i++) {
        b = life.bub[i]; ph = (time * 0.32 * (0.6 + 0.8 * b.sp) + b.ph) % 1;
        y = b.y + ph * (top - b.y);
        sc = b.r * (ph > 0.86 ? (1 - (ph - 0.86) / 0.14) : 1) * (0.55 + 0.45 * ph);
        dummy.position.set(b.x + Math.sin(time * 2 + b.ph * 9) * 0.1, y, b.z);
        dummy.rotation.set(0, 0, 0); dummy.scale.set(sc, sc, sc); dummy.updateMatrix();
        life.bubMesh.setMatrixAt(i, dummy.matrix);
      }
      life.bubMesh.count = cnt; life.bubMesh.instanceMatrix.needsUpdate = true;
      life.bubMesh.visible = cnt > 0 && view === 'island';
    }

    /* ═══════════ LIGHTNING ═══════════
       A jagged bolt and a flash inside the plume. Flashes are capped at about
       three a second; with prefers-reduced-motion there is no flash at all. */
    function buildLightning() {
      var g = new THREE.BufferGeometry();
      g.setAttribute('position', new THREE.BufferAttribute(new Float32Array(90 * 3), 3));
      g.setDrawRange(0, 0);
      bolt = new THREE.LineSegments(g, new THREE.LineBasicMaterial({ color: 0xdfe0ff, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false }));
      bolt.frustumCulled = false; bolt.renderOrder = 6;
      scene.add(bolt);
    }
    function strike() {
      var H = mats.plume.uniforms.uH.value, o = parts.crater;
      var cx = (Math.random() - 0.5) * 5, cz = (Math.random() - 0.5) * 5;
      var top = o.y + H * (0.55 + Math.random() * 0.4);
      var a = new THREE.Vector3(o.x + cx, top, o.z + cz);
      var b = new THREE.Vector3(a.x + (Math.random() - 0.5) * 9, top - 5 - Math.random() * 8, a.z + (Math.random() - 0.5) * 9);
      var pos = bolt.geometry.attributes.position.array, n = 0, segs = 12, i, prev = a.clone(), p = new THREE.Vector3();
      function push(v) { pos[n++] = v.x; pos[n++] = v.y; pos[n++] = v.z; }
      for (i = 1; i <= segs; i++) {
        p.lerpVectors(a, b, i / segs);
        if (i < segs) p.add(tmpV.set((Math.random() - 0.5) * 2.4, (Math.random() - 0.5) * 1.0, (Math.random() - 0.5) * 2.4));
        push(prev); push(p); prev.copy(p);
        if (i === 5 || i === 8) {                       // a short branch
          var br = p.clone(), k;
          for (k = 0; k < 3; k++) { var nx = br.clone().add(tmpV.set((Math.random() - 0.3) * 3.4, -1 - Math.random() * 1.8, (Math.random() - 0.5) * 3.4)); push(br); push(nx); br = nx; }
        }
      }
      bolt.geometry.setDrawRange(0, n / 3); bolt.geometry.attributes.position.needsUpdate = true;
      boltLight.position.copy(a).lerp(b, 0.5);
      strikeLife = reduced ? 0.6 : 0.16;
      flash = reduced ? 0 : 1;
    }
    function updateLightning(dt, v) {
      var on = v.lightning > 0.05 && view === 'island';
      if (on) {
        nextStrike -= dt;
        if (nextStrike <= 0 && strikeLife <= 0) { strike(); nextStrike = Math.max(0.45, lerp(6, 0.9, v.lightning) * (0.6 + Math.random() * 0.9)); if (reduced) nextStrike = 5; }
      }
      if (strikeLife > 0) {
        strikeLife -= dt;
        var f = Math.max(0, strikeLife / (reduced ? 0.6 : 0.16));
        bolt.material.opacity = on ? (reduced ? f * 0.6 : (Math.sin(strikeLife * 90) > -0.4 ? 1 : 0.25) * f + 0.15) : 0;
        boltLight.intensity = reduced ? 0 : f * 4.5;
        flash = reduced ? 0 : f * f;
        if (strikeLife <= 0) { bolt.geometry.setDrawRange(0, 0); boltLight.intensity = 0; flash = 0; }
      }
      U.flash.value = flash * v.lightning;
    }

    /* ═══════════ CUT-AWAY: the ground, layer by layer ═══════════ */
    var LAYERS = [
      { name: 'Older rock', note: '' },
      { name: 'Limestone', note: 'from carbonate sediments' },
      { name: 'Crude oil and natural gas', note: 'from plankton' },
      { name: 'Sedimentary rock', note: '' },
      { name: 'Coal', note: 'from plants' },
      null,
      { name: 'Soil', note: '' }
    ];
    function buildCutaway() {
      var G = AE.GLSL.strata;
      mats.strata = new THREE.ShaderMaterial({
        vertexShader: G.vert, fragmentShader: G.frag, fog: false,
        uniforms: {
          uB0: { value: new THREE.Vector4(0.2, 0.4, 0.6, 0.8) }, uB1: { value: new THREE.Vector3(0.9, 0.95, 1) },
          uTopCol: { value: new THREE.Color(0.3, 0.05, 0.02) }, uLightDir: U.lightDir, uSunC: U.sunC, uAmb: U.amb,
          uFogC: U.fogC, uFogD: U.fogD, uHot: { value: 1 }
        }
      });
      groups.cut = new THREE.Group();
      groups.cutBlock = new THREE.Mesh(new THREE.BoxGeometry(24, 12, 10), mats.strata);
      groups.cut.add(groups.cutBlock);
      life.cutTreeList = [];
      var r = rng(31), i;
      for (i = 0; i < 26; i++) life.cutTreeList.push({ x: (r() - 0.5) * 21, y: 0, z: (r() - 0.5) * 8, s: 0.9 + r() * 0.9, th: r(), broad: r() > 0.4, hue: r() });
      life.cutTrees = makeTreeMeshes(26);
      life.cutTrees.forEach(function (m) { groups.cut.add(m); });
      groups.cut.visible = false;
      scene.add(groups.cut);
      life.cutH = 6;
    }
    function updateCutaway(v) {
      var s = v.s;
      var T = [1.6, 2.2 * sstep(0.1, 0.75, s), 1.0 * sstep(0.45, 0.85, s), 2.0 * sstep(0.25, 0.95, s), 0.9 * sstep(0.55, 0.85, s), 1.0 * sstep(0.65, 0.95, s), 0.5 * sstep(0.5, 0.8, s)];
      var cum = [], tot = 0, i;
      for (i = 0; i < T.length; i++) { tot += T[i]; cum.push(tot); }
      life.cutH = tot; life.cutCum = cum; life.cutT = T;
      var u = mats.strata.uniforms;
      u.uB0.value.set(cum[0] / tot, cum[1] / tot, cum[2] / tot, cum[3] / tot);
      u.uB1.value.set(cum[4] / tot, cum[5] / tot, 1);
      u.uHot.value = v.lava;
      groups.cutBlock.scale.y = tot / 12; groups.cutBlock.position.y = tot / 2;
      var lavaTop = tmpC.setRGB(0.28, 0.05, 0.02), sea = new THREE.Color(0.10, 0.32, 0.42), grn = new THREE.Color(0.16, 0.40, 0.10);
      var c = lavaTop.clone().lerp(sea, v.ocean).lerp(grn, Math.min(1, v.veg * 1.1));
      u.uTopCol.value.copy(c);
      layoutTrees(life.cutTrees, life.cutTreeList, v.veg, 1, { x: 0, y: tot, z: 0 }, 1.25);
    }

    /* ═══════════ LABELS (HTML chips pinned to 3D points) ═══════════ */
    function buildLabels() {
      GASLAB.forEach(function (g) { labels.push(makeLabel(g.html, g.cls, g.col)); labels[labels.length - 1].gas = g.id; });
      ['steam', 'stro', 'bub'].forEach(function (id) {
        var t = { steam: 'Steam', stro: 'Algae', bub: 'O<sub>2</sub> from photosynthesis' }[id];
        var l = makeLabel(t, 'lbl-note'); l.note = id; labels.push(l);
      });
      life.layerLabels = LAYERS.map(function (ly, i) {
        if (!ly) return null;
        var l = makeLabel('<b>' + ly.name + '</b>' + (ly.note ? ' <span>' + ly.note + '</span>' : ''), 'lbl-layer');
        l.layer = i; labels.push(l); return l;
      });
    }
    /* what the volcanoes released, in the specification's words */
    var gasCol = function (id) { return AE.DATA.GASES.filter(function (g) { return g.id === id; })[0].col; };
    var GASLAB = [
      { id: 'co2', html: 'CO<sub>2</sub> carbon dioxide <small>mainly</small>', col: gasCol('co2') },
      { id: 'h2o', html: 'H<sub>2</sub>O water vapour', col: gasCol('h2o') },
      { id: 'n2', html: 'N<sub>2</sub> nitrogen', col: gasCol('n2') },
      { id: 'mna', html: 'CH<sub>4</sub> and NH<sub>3</sub> <small>maybe small amounts</small>', col: gasCol('mna') }
    ];
    var GAS_IDS = ['co2', 'h2o', 'n2', 'mna'];
    function makeLabel(html, cls, col) {
      var el = document.createElement('div');
      el.className = 'lbl ' + (cls || ''); el.hidden = true;
      el.innerHTML = (col ? '<i style="background:' + col + '"></i>' : '') + '<em>' + html + '</em>';
      labelLayer.appendChild(el);
      return { el: el, pos: new THREE.Vector3(), show: false };
    }
    function updateLabels(v) {
      var W = box.clientWidth, Hh = box.clientHeight, H = mats.plume.uniforms.uH.value, o = parts.crater, i, l, sh;
      var gasShare = gasShares(v), vis = [];
      for (i = 0; i < labels.length; i++) {
        l = labels[i]; sh = false;
        if (l.gas) {
          var k = GAS_IDS.indexOf(l.gas), share = gasShare.p[k];
          if (showLabels && view === 'island' && v.volcano > 0.12 && share > 0.01) {
            var side = k % 2 ? 1 : -1;
            l.pos.set(side * (5 + k * 1.5), o.y + H * (0.15 + 0.24 * k), (k % 3 - 1) * 3); sh = true;
          }
        } else if (l.note === 'steam') {
          if (showLabels && view === 'island' && v.steam > 0.3 && parts.spots.length) { l.pos.copy(parts.spots[1]); l.pos.y += 4.5; sh = true; }
        } else if (l.note === 'stro') {
          if (showLabels && view === 'island' && v.algae > 0.25 && life.stro.length) { var s0 = life.stro[3]; l.pos.set(s0.x, levelNow + 1.3, s0.z); sh = true; }
        } else if (l.note === 'bub') {
          if (showLabels && view === 'island' && v.bubbles > 0.25 && life.bub.length) { var b0 = life.bub[5]; l.pos.set(b0.x, levelNow + 2.4, b0.z); sh = true; }
        } else if (l.layer !== undefined) {
          var t = life.cutT && life.cutT[l.layer];
          if (view === 'cutaway' && t > (l.layer === 0 ? 0 : 0.35)) {
            var lo = l.layer ? life.cutCum[l.layer - 1] : 0;
            l.pos.set(12.6, (lo + life.cutCum[l.layer]) / 2, 5); sh = true;
          }
        }
        if (sh) {
          tmpV.copy(l.pos).project(camera);
          if (tmpV.z > 1 || tmpV.z < -1) sh = false;
          else { l.px = (tmpV.x * 0.5 + 0.5) * W; l.py = (-tmpV.y * 0.5 + 0.5) * Hh; vis.push(l); }
        }
        if (l.el.hidden === sh) l.el.hidden = !sh;
      }
      declutter(vis, W, Hh);
    }
    /* Place the visible labels so none overlaps another or the time box in
       the corner. Each starts just right of its point, kept inside the view;
       working down the screen, a label that would collide drops below
       whatever it hits. Labels keep their top-to-bottom order, so the layers
       of the cut-away still read in order. */
    function declutter(vis, W, Hh) {
      var hud = box.querySelector('.hud'), placed = [];
      if (hud && hud.offsetWidth) placed.push({ x: hud.offsetLeft - 6, y: hud.offsetTop - 6, w: hud.offsetWidth + 12, h: hud.offsetHeight + 12 });
      vis.forEach(function (l) {
        l.w = l.el.offsetWidth; l.h = l.el.offsetHeight;
        l.x = Math.max(6, Math.min(l.px + 10, W - l.w - 10));
        l.y = Math.max(6, l.py - l.h / 2);
      });
      vis.sort(function (a, b) { return a.y - b.y; });
      var top = placed.length ? placed[0].y + placed[0].h + 4 : 6;
      vis.forEach(function (l) {
        for (var k = 0; k < placed.length; k++) {
          var p = placed[k];
          if (l.x < p.x + p.w && l.x + l.w > p.x && l.y < p.y + p.h && l.y + l.h > p.y) { l.y = p.y + p.h + 4; k = -1; }
        }
        placed.push({ x: l.x, y: l.y, w: l.w, h: l.h });
      });
      /* If that ran off the bottom, slide the stack back up into the free space
         above it, each label staying above the one below and below the time box. */
      var floor = Hh - 6;
      for (var i = vis.length - 1; i >= 0; i--) {
        var l = vis[i], below = vis[i + 1];
        if (below && !(l.x < below.x + below.w && l.x + l.w > below.x)) continue;
        if (l.y + l.h > floor) l.y = Math.max(top, floor - l.h);
        floor = l.y - 4;
      }
      vis.forEach(function (l) { l.el.style.transform = 'translate(' + l.x.toFixed(1) + 'px,' + l.y.toFixed(1) + 'px)'; });
    }
    /* share of each gas the volcanoes released, normalised: sets the plume's tint mix */
    function gasShares(v) {
      var ids = GAS_IDS, p = ids.map(function (id) { return v.gas[id]; }), t = p.reduce(function (a, b) { return a + b; }, 0) || 1;
      return { p: p.map(function (x) { return x / t; }) };
    }

    /* ═══════════ POST-PROCESSING ═══════════ */
    function setupPost() {
      if (!THREE.EffectComposer || !THREE.UnrealBloomPass) { composer = null; return; }
      composer = new THREE.EffectComposer(renderer);
      composer.addPass(new THREE.RenderPass(scene, camera));
      bloom = new THREE.UnrealBloomPass(new THREE.Vector2(512, 512), 0.8, 0.55, 0.82);
      composer.addPass(bloom);
    }

    /* ═══════════ STATE → SCENE ═══════════ */
    function applyState(v) {
      var q = QUALITY[quality];
      levelNow = lerp(DRY, WF, v.ocean);
      U.relief.value = v.relief;
      mats.terrain.uniforms.uWater.value = levelNow;
      mats.terrain.uniforms.uLava.value = v.lava;
      mats.terrain.uniforms.uGreen.value = Math.min(1, v.veg * 1.15);
      mats.terrain.uniforms.uAlgae.value = Math.min(1, v.algae * 1.3);
      groups.ocean.position.y = levelNow; groups.ocean.visible = v.ocean > 0.02 && view === 'island';
      mats.ocean.uniforms.uLevel.value = levelNow;
      var ou = mats.ocean.uniforms;
      ou.uDeep.value.setRGB(v.oceanDeep[0], v.oceanDeep[1], v.oceanDeep[2]);
      ou.uShallow.value.setRGB(v.oceanShallow[0], v.oceanShallow[1], v.oceanShallow[2]);
      ou.uSkyTop.value.setRGB(v.skyTop[0], v.skyTop[1], v.skyTop[2]);
      ou.uSkyHor.value.setRGB(v.skyHor[0], v.skyHor[1], v.skyHor[2]);
      ou.uLava.value = v.lava; ou.uGreen.value = Math.min(1, v.algae);
      ou.uWave.value = reduced ? 0.5 : 1;

      /* sky, fog, lights */
      var su = mats.sky.uniforms;
      su.uTop.value.setRGB(v.skyTop[0], v.skyTop[1], v.skyTop[2]);
      su.uHor.value.setRGB(v.skyHor[0], v.skyHor[1], v.skyHor[2]);
      su.uStars.value = v.stars; su.uTwinkle.value = reduced ? 0 : 1;
      U.fogC.value.setRGB(v.skyHor[0] * 0.92, v.skyHor[1] * 0.92, v.skyHor[2] * 0.92);
      var fs = camera.aspect < 1 ? 0.75 : 1;   // the camera sits further back on a portrait screen
      U.fogD.value = v.fog * fs; scene.fog.color.copy(U.fogC.value); scene.fog.density = v.fog * fs;
      U.sunC.value.setRGB(v.sun[0], v.sun[1], v.sun[2]).multiplyScalar(lerp(0.75, 1.15, v.sunH / 0.55));
      U.amb.value.setRGB(lerp(v.skyHor[0], 0.5, 0.35) * 0.55 + 0.04, lerp(v.skyHor[1], 0.5, 0.35) * 0.55 + 0.04, lerp(v.skyHor[2], 0.5, 0.35) * 0.55 + 0.04);
      U.sunDir.value.set(-0.3, v.sunH, -0.9).normalize();
      U.lightDir.value.set(0.55, 0.35 + v.sunH, 0.62).normalize();
      mats.sun.color.copy(U.sunC.value); mats.sun.intensity = 0.9;
      mats.sun.position.copy(U.lightDir.value).multiplyScalar(100);
      mats.hemi.color.setRGB(v.skyTop[0] + 0.15, v.skyTop[1] + 0.15, v.skyTop[2] + 0.15);
      mats.hemi.groundColor.set(0x3a2a1c); mats.hemi.intensity = 0.55;

      /* moon: scenery only, dimmed by haze */
      groups.moon.scale.setScalar(8);
      mats.moon.color.setRGB(0.92, 0.92, 0.9).lerp(tmpC.setRGB(v.skyHor[0] * 1.2, v.skyHor[1] * 1.2, v.skyHor[2] * 1.2), 0.45 * v.ash);
      groups.moon.visible = view === 'island';

      /* plume: height, intensity and what the gases are */
      var pu = mats.plume.uniforms;
      pu.uIntensity.value = v.volcano; pu.uH.value = 4.5 + 16 * Math.pow(v.volcano, 0.85);
      pu.uSpeed.value = reduced ? 0.03 : 0.07;
      var sh = gasShares(v).p, cum = 0, cs = [];
      sh.forEach(function (x) { cum += x; cs.push(cum); });
      pu.uCum.value.set(cs[0], cs[1], cs[2], 1);
      GASLAB.forEach(function (g, i) { pu['uC' + i].value.set(g.col); });
      pu.uC4.value.set(GASLAB[3].col);
      parts.crater.y = heightAt(0, 0, v.relief) + 0.3;   // the vent sinks with the volcano
      var eu = mats.ember.uniforms;
      eu.uIntensity.value = Math.min(1, v.volcano * v.lava * 1.7); eu.uSpeed.value = reduced ? 0.15 : 0.35;
      mats.steam.uniforms.uAmount.value = v.steam; mats.steam.uniforms.uSpeed.value = reduced ? 0.1 : 0.22;
      mats.steam.uniforms.uTint.value.set(0.35 + v.skyHor[0] * 0.6, 0.35 + v.skyHor[1] * 0.6, 0.35 + v.skyHor[2] * 0.6);
      var key = levelNow.toFixed(2) + '|' + v.relief.toFixed(2);
      if (key !== spotsKey && v.ocean > 0.02 && v.steam > 0.01) { spotsKey = key; updateSpots(levelNow, v.relief); }
      parts.plume.visible = view === 'island' && v.volcano > 0.015;
      parts.ember.visible = view === 'island' && eu.uIntensity.value > 0.02;
      parts.steam.visible = view === 'island' && v.steam > 0.02 && v.ocean > 0.02;
      mats.rain.uniforms.uRain.value = v.rain * q.rain; parts.rain.visible = v.rain > 0.02 && view === 'island';

      /* clouds */
      var i, sp, dark = Math.min(1, v.ash * 1.2);
      for (i = 0; i < life.clouds.length; i++) {
        sp = life.clouds[i];
        var vis = (i / life.clouds.length) < q.clouds * Math.min(1, v.clouds + 0.05);
        sp.visible = vis && view === 'island';
        sp.material.opacity = Math.min(0.92, v.clouds * (0.55 + sp.userData.th * 0.5)) * (1 - 0.15 * dark);
        sp.material.color.setRGB(lerp(0.96, 0.22, dark), lerp(0.97, 0.18, dark), lerp(0.98, 0.17, dark)).multiply(tmpC.setRGB(0.55 + U.sunC.value.r * 0.45, 0.55 + U.sunC.value.g * 0.45, 0.55 + U.sunC.value.b * 0.45));
      }

      /* life */
      layoutStromatolites(v.algae, q.trees);
      life.stroMesh.visible = v.algae > 0.03 && view === 'island';
      layoutTrees(life.treeMeshes, life.trees, v.veg, q.trees);
      life.treeMeshes.forEach(function (m) { m.visible = v.veg > 0.02 && view === 'island'; });
      life.cutTrees.forEach(function (m) { m.visible = v.veg > 0.02; });

      /* groups by view */
      groups.terrain.visible = view === 'island';
      groups.cut.visible = view === 'cutaway';
      updateCutaway(v);

      /* bloom: strongest when the lava is */
      if (bloom) { bloom.strength = 0.22 + 0.7 * Math.min(1, v.lava + v.volcano * 0.3); bloom.threshold = 0.82; bloom.radius = 0.55; }
    }

    /* ═══════════ CAMERA ═══════════ */
    var PRESET = {
      island: { pos: [38, 12, 46], tgt: [0, 7.5, 0] },
      cutaway: { pos: [18, 7.5, 27], tgt: [5.5, 4.2, 0] }
    };
    function setCameraPreset(instant) {
      var p = PRESET[view], k = camera.aspect < 1 ? 1.15 : 1;
      var to = new THREE.Vector3(p.pos[0] * k, p.pos[1] + (k > 1 ? 4 : 0), p.pos[2] * k), tg = new THREE.Vector3(p.tgt[0], p.tgt[1], p.tgt[2]);
      if (instant || reduced) { camera.position.copy(to); controls.target.copy(tg); controls.update(); camTween = null; return; }
      camTween = { t: 0, fp: camera.position.clone(), ft: controls.target.clone(), tp: to, tt: tg };
    }
    function stepCamera(dt) {
      if (!camTween) return;
      camTween.t = Math.min(1, camTween.t + dt / 0.9);
      var e = camTween.t * camTween.t * (3 - 2 * camTween.t);
      camera.position.lerpVectors(camTween.fp, camTween.tp, e); controls.target.lerpVectors(camTween.ft, camTween.tt, e);
      if (camTween.t >= 1) camTween = null;
    }

    /* ═══════════ RESIZE / QUALITY ═══════════ */
    function resize() {
      var w = Math.max(2, box.clientWidth), h = Math.max(2, box.clientHeight);
      var pr = Math.min(window.devicePixelRatio || 1, QUALITY[quality].pr);
      renderer.setPixelRatio(pr); renderer.setSize(w, h, false);
      camera.aspect = w / h; camera.updateProjectionMatrix();
      if (composer) { composer.setPixelRatio(pr); composer.setSize(w, h); }
      U.px.value = (h * pr) / (2 * Math.tan(camera.fov * Math.PI / 360));
      dirty = true;
    }
    function setQuality(name, silent) {
      quality = name; var q = QUALITY[name];
      var drawN = function (n) { return Math.floor(n * q.parts); };
      parts.plume.geometry.setDrawRange(0, drawN(parts.plumeN));
      parts.ember.geometry.setDrawRange(0, drawN(parts.emberN));
      parts.steam.geometry.setDrawRange(0, drawN(parts.steamN));
      parts.rain.geometry.setDrawRange(0, Math.floor(parts.rainN * q.rain) * 2);
      resize(); dirty = true;
      if (!silent && cbs.quality) cbs.quality(name);
    }

    /* ═══════════ FRAME LOOP ═══════════ */
    function frame() {
      if (!running) return;
      requestAnimationFrame(frame);
      var dt = Math.min(clock.getDelta(), 0.1);
      if (document.hidden || !visible) return;
      step(dt);
    }
    function step(dt) {
      time += dt * (reduced ? 0.35 : 1);
      U.time.value = time;
      if (S) {
        if (dirty) { applyState(S); dirty = false; }
        updateLightning(dt, S);
        animateBubbles(S, QUALITY[quality]);
        groups.clouds.rotation.y += dt * (reduced ? 0.001 : 0.004);
      }
      stepCamera(dt);
      groups.sky.position.copy(camera.position);
      controls.update();
      groups.moon.position.set(-0.78 * 700 + camera.position.x, 0.30 * 700 + camera.position.y, -0.6 * 700 + camera.position.z);
      if (composer && QUALITY[quality].bloom) composer.render(); else renderer.render(scene, camera);
      if (S) updateLabels(S);
      watchFps(dt);
    }
    /* adaptive quality: below ~30fps for two seconds running, step down */
    function watchFps(dt) {
      if (dt > 0.25) return;
      fps.warm -= dt; if (fps.warm > 0) return;
      fps.acc += dt; fps.n++;
      if (fps.acc >= 1) {
        var f = fps.n / fps.acc; fps.acc = 0; fps.n = 0; AE.fps = f;
        fps.low = f < 30 ? fps.low + 1 : 0;
        if (auto && fps.low >= 2) {
          var i = ORDER.indexOf(quality);
          if (i > 0) { setQuality(ORDER[i - 1]); fps.low = 0; fps.warm = 2; }
        }
      }
    }

    /* ═══════════ PUBLIC API ═══════════ */
    return {
      init: init,
      update: function (v) { S = v; dirty = true; },
      setQuality: function (name) { auto = false; setQuality(name, true); },
      setAuto: function (on) { auto = on; },
      getQuality: function () { return quality; },
      setView: function (name) { view = name; setCameraPreset(false); dirty = true; },
      setLabels: function (on) { showLabels = on; mats.plume.uniforms.uGasMode.value = on ? 1 : 0; },
      resetCamera: function () { setCameraPreset(false); },
      setAutoRotate: function (on) { controls.autoRotate = on && !reduced; },
      onQuality: function (cb) { cbs.quality = cb; },
      onFallback: function (cb) { cbs.fallback = cb; },
      heightAt: heightAt, step: step,
      camera: function () { return { pos: camera.position.toArray(), tgt: controls.target.toArray(), tween: !!camTween }; }
    };
  })();
})();
