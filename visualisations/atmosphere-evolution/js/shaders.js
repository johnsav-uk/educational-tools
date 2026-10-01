/* The Evolution of the Earth's Atmosphere: SHADERS AND PROCEDURAL TEXTURES
   All GLSL and every texture the scene uses. Nothing is loaded from a file:
   sprites, the Moon and the algae-mat texture are painted onto canvases here. */
(function () {
  'use strict';
  var AE = window.AE = window.AE || {};

  /* Shared GLSL: value noise + fbm. */
  var NOISE = [
    'float hash(vec2 p){ p = fract(p * vec2(123.34, 456.21)); p += dot(p, p + 45.32); return fract(p.x * p.y); }',
    'float vnoise(vec2 p){ vec2 i = floor(p), f = fract(p); f = f * f * (3.0 - 2.0 * f);',
    '  return mix(mix(hash(i), hash(i + vec2(1.0, 0.0)), f.x), mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), f.x), f.y); }',
    'float fbm(vec2 p){ float a = 0.5, s = 0.0; for (int i = 0; i < 5; i++) { s += a * vnoise(p); p = p * 2.03 + vec2(17.1, 9.2); a *= 0.5; } return s; }'
  ].join('\n');

  var FOG = [
    'vec3 applyFog(vec3 col, float dist){ float f = 1.0 - exp(-pow(uFogD * dist, 2.0)); return mix(col, uFogC, clamp(f, 0.0, 1.0)); }'
  ].join('\n');

  /* ── TERRAIN: displaced mesh, lit rock, moss, and animated lava cracks.
        position.y is the volcanic island and aHL the later low island; uRelief
        blends them, so the volcano is gone after the first billion years. ── */
  var terrain = {
    vert: [
      'attribute float aHL; attribute vec3 aNL; uniform float uRelief;',
      'varying vec3 vWorld; varying vec3 vNormalW; varying float vH;',
      'void main(){',
      '  vec3 p = position; p.y = mix(aHL, position.y, uRelief);',
      '  vec3 nn = normalize(mix(aNL, normal, uRelief));',
      '  vec4 w = modelMatrix * vec4(p, 1.0);',
      '  vWorld = w.xyz; vNormalW = normalize(mat3(modelMatrix) * nn); vH = p.y;',
      '  gl_Position = projectionMatrix * viewMatrix * w;',
      '}'
    ].join('\n'),
    frag: [
      'uniform float uTime, uLava, uGreen, uWater, uFogD, uFlash, uAlgae;',
      'uniform vec3 uFogC, uLightDir, uSunC, uAmb;',
      'varying vec3 vWorld; varying vec3 vNormalW; varying float vH;',
      NOISE, FOG,
      'void main(){',
      '  vec3 n = normalize(vNormalW);',
      '  float nd = fbm(vWorld.xz * 0.35);',
      '  vec3 rock = mix(vec3(0.085, 0.072, 0.068), vec3(0.23, 0.195, 0.175), nd);',
      '  rock = mix(rock, rock * vec3(1.15, 0.95, 0.8), smoothstep(0.4, 0.8, fbm(vWorld.xz * 1.1)));',
      '  float slope = 1.0 - n.y;',
      '  float land = smoothstep(uWater + 0.15, uWater + 0.9, vH);',
      '  float moss = uGreen * land * (1.0 - smoothstep(0.12, 0.42, slope)) * smoothstep(0.25, 0.65, fbm(vWorld.xz * 0.5 + 3.0) + 0.25) * (1.0 - smoothstep(6.5, 10.0, vH));',
      '  vec3 grass = mix(vec3(0.07, 0.25, 0.06), vec3(0.22, 0.38, 0.11), nd);',
      '  vec3 col = mix(rock, grass, clamp(moss, 0.0, 1.0));',
      '  float sand = smoothstep(uWater + 0.55, uWater + 0.1, vH) * smoothstep(uWater - 0.6, uWater, vH);',
      '  col = mix(col, vec3(0.42, 0.37, 0.27), sand * 0.6 * (1.0 - moss));',
      /* algae on the seabed of the shallows, seen through the water */
      '  float shallow = smoothstep(uWater - 2.2, uWater - 0.4, vH) * (1.0 - smoothstep(uWater - 0.1, uWater + 0.15, vH));',
      '  col = mix(col, mix(vec3(0.10, 0.36, 0.10), vec3(0.22, 0.52, 0.16), fbm(vWorld.xz * 0.9)), uAlgae * shallow * smoothstep(0.3, 0.6, fbm(vWorld.xz * 0.45 + 5.0) + 0.2));',
      '  float diff = max(dot(n, uLightDir), 0.0);',
      '  col *= uAmb + uSunC * diff;',
      /* lava: bright where fbm crosses 0.5 (thin lines), hottest near the crater */
      '  float r = length(vWorld.xz);',
      '  float c1 = abs(fbm(vWorld.xz * 0.50 + vec2(0.0, uTime * 0.02)) - 0.5);',
      '  float c2 = abs(fbm(vWorld.xz * 1.35 + 7.0) - 0.5);',
      '  float crack = max(1.0 - smoothstep(0.0, 0.05, c1), (1.0 - smoothstep(0.0, 0.03, c2)) * 0.65);',
      '  float hot = uLava * (1.0 - clamp(moss * 1.5, 0.0, 1.0)) * (0.55 + 0.45 * exp(-r * 0.05));',
      '  float pulse = 0.78 + 0.22 * sin(uTime * 1.3 + fbm(vWorld.xz * 0.3) * 6.283);',
      '  vec3 lavaCol = mix(vec3(0.75, 0.07, 0.0), vec3(1.0, 0.72, 0.22), crack * pulse);',
      '  col += lavaCol * crack * hot * 1.25;',
      /* lava lake in the crater */
      '  float pool = (1.0 - smoothstep(1.3, 1.9, r)) * smoothstep(0.02, 0.15, uLava);',
      '  float swirl = fbm(vWorld.xz * 2.2 + vec2(uTime * 0.12, -uTime * 0.09));',
      '  col = mix(col, mix(vec3(0.9, 0.18, 0.02), vec3(1.0, 0.85, 0.35), swirl), pool);',
      '  col += vec3(1.0, 0.3, 0.05) * uLava * exp(-r * r * 0.012) * 0.22;',
      '  col += uFlash * vec3(0.30, 0.30, 0.42) * (0.4 + diff);',
      '  col = applyFog(col, length(cameraPosition - vWorld));',
      '  gl_FragColor = vec4(col, 1.0);',
      '}'
    ].join('\n')
  };

  /* ── OCEAN: waves, fresnel sky reflection, sun glitter, foam, lava glow ── */
  var ocean = {
    vert: [
      'uniform float uTime, uWave;',
      'varying vec3 vWorld; varying vec3 vN; varying float vCrest;',
      'void main(){',
      '  vec4 w = modelMatrix * vec4(position, 1.0);',
      '  vec2 p = w.xz; float h = 0.0; vec2 d = vec2(0.0);',
      '  vec2 d1 = normalize(vec2(1.0, 0.4));  float f1 = 0.21, a1 = 0.26; float ph1 = dot(d1, p) * f1 + uTime * 0.9;',
      '  vec2 d2 = normalize(vec2(-0.6, 1.0)); float f2 = 0.35, a2 = 0.16; float ph2 = dot(d2, p) * f2 + uTime * 1.2;',
      '  vec2 d3 = normalize(vec2(0.3, -1.0)); float f3 = 0.60, a3 = 0.08; float ph3 = dot(d3, p) * f3 + uTime * 1.7;',
      '  vec2 d4 = normalize(vec2(-1.0, -0.2)); float f4 = 1.10, a4 = 0.035; float ph4 = dot(d4, p) * f4 + uTime * 2.3;',
      '  h = a1 * sin(ph1) + a2 * sin(ph2) + a3 * sin(ph3) + a4 * sin(ph4);',
      '  d = a1 * f1 * d1 * cos(ph1) + a2 * f2 * d2 * cos(ph2) + a3 * f3 * d3 * cos(ph3) + a4 * f4 * d4 * cos(ph4);',
      '  w.y += h * uWave;',
      '  vN = normalize(vec3(-d.x * uWave, 1.0, -d.y * uWave));',
      '  vCrest = h; vWorld = w.xyz;',
      '  gl_Position = projectionMatrix * viewMatrix * w;',
      '}'
    ].join('\n'),
    frag: [
      'uniform sampler2D uHeight; uniform float uHMin, uHRange, uLevel, uHalf, uRelief;',
      'uniform vec3 uDeep, uShallow, uSkyTop, uSkyHor, uSunDir, uSunC, uFogC;',
      'uniform float uFogD, uTime, uLava, uGreen, uWave, uFlash;',
      'varying vec3 vWorld; varying vec3 vN; varying float vCrest;',
      NOISE, FOG,
      'void main(){',
      '  vec2 uv = (vWorld.xz + uHalf) / (2.0 * uHalf);',
      '  float th = -12.0;',
      '  if (uv.x > 0.0 && uv.x < 1.0 && uv.y > 0.0 && uv.y < 1.0) { vec2 hh = texture2D(uHeight, uv).rg; th = mix(hh.g, hh.r, uRelief) * uHRange + uHMin; }',
      '  float depth = uLevel - th;',
      '  vec3 n = vN;',
      '  n.xz += (vec2(vnoise(vWorld.xz * 1.3 + vec2(uTime * 0.3, 0.0)), vnoise(vWorld.xz * 1.3 + vec2(9.0, uTime * 0.25))) - 0.5) * 0.30 * uWave;',
      '  n = normalize(n);',
      '  vec3 V = normalize(cameraPosition - vWorld);',
      '  float fres = 0.05 + 0.95 * pow(1.0 - max(dot(n, V), 0.0), 4.0);',
      '  vec3 R = reflect(-V, n);',
      '  vec3 sky = mix(uSkyHor, uSkyTop, smoothstep(0.0, 0.6, R.y));',
      '  vec3 water = mix(uShallow, uDeep, smoothstep(0.0, 3.5, depth));',
      '  water = mix(water, vec3(0.16, 0.50, 0.14), uGreen * 0.7 * smoothstep(3.2, 0.2, depth));',   /* algae colour the shallows */
      '  vec3 col = mix(water, sky, fres);',
      '  col += uSunC * pow(max(dot(R, uSunDir), 0.0), 110.0) * 1.3;',
      /* foam: a moving line along the shore plus crests */
      '  float foam = smoothstep(0.5, 0.0, depth + 0.16 * sin(uTime * 1.3 + th * 5.0)) * (0.55 + 0.45 * vnoise(vWorld.xz * 2.2 + uTime * 0.5));',
      '  foam += smoothstep(0.30, 0.46, vCrest * uWave) * 0.35;',
      '  foam = clamp(foam, 0.0, 1.0);',
      '  col = mix(col, vec3(0.9, 0.93, 0.95), foam * 0.85);',
      /* lava glow in the water near the island */
      '  float glow = uLava * (smoothstep(2.6, 0.0, depth) * 0.9 + exp(-dot(vWorld.xz, vWorld.xz) / 700.0) * 0.35);',
      '  glow *= 0.6 + 0.4 * vnoise(vWorld.xz * 0.9 + uTime * 0.3);',
      '  col += vec3(1.0, 0.33, 0.06) * glow * 1.1;',
      '  col += uFlash * 0.07;',
      '  col = applyFog(col, length(cameraPosition - vWorld));',
      '  float a = mix(0.30, 0.94, smoothstep(0.0, 2.6, depth));',
      '  a = clamp(a + foam * 0.5, 0.0, 1.0);',
      '  if (depth < -0.4) discard;',
      '  gl_FragColor = vec4(col, a);',
      '}'
    ].join('\n')
  };

  /* ── SKY: gradient, haze, sun, stars ── */
  var sky = {
    vert: [
      'varying vec3 vDir;',
      'void main(){ vDir = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }'
    ].join('\n'),
    frag: [
      'uniform vec3 uTop, uHor, uSunDir, uSunC; uniform float uStars, uTime, uTwinkle, uFlash;',
      'varying vec3 vDir;',
      'float hash3(vec3 p){ return fract(sin(dot(p, vec3(12.9898, 78.233, 37.719))) * 43758.5453); }',
      'void main(){',
      '  float h = vDir.y;',
      '  vec3 col = mix(uHor, uTop, pow(smoothstep(0.0, 0.75, h), 0.7));',
      '  if (h < 0.0) col = mix(uHor, uHor * 0.85, smoothstep(0.0, -0.3, h));',
      '  col = mix(col, uHor * 1.05, exp(-abs(h) * 7.0) * 0.35);',
      '  float sd = max(dot(normalize(vDir), uSunDir), 0.0);',
      '  col += uSunC * (pow(sd, 6.0) * 0.22 + pow(sd, 70.0) * 0.30 + smoothstep(0.99935, 0.99975, sd) * 1.4);',
      '  vec3 sp = vDir * 95.0; vec3 cell = floor(sp); float hs = hash3(cell);',
      '  float star = step(0.990, hs) * smoothstep(0.40, 0.0, length(fract(sp) - 0.5));',
      '  star *= uStars * smoothstep(0.03, 0.35, h) * (1.0 - uTwinkle + uTwinkle * (0.55 + 0.45 * sin(uTime * 2.0 + hs * 60.0)));',
      '  col += vec3(0.85, 0.9, 1.0) * star * 0.9;',
      '  col += uFlash * vec3(0.10, 0.10, 0.16) * smoothstep(0.0, 0.5, h);',
      '  gl_FragColor = vec4(col, 1.0);',
      '}'
    ].join('\n')
  };

  /* ── ASH / GAS PLUME: a GPU particle system. Each point is placed
        analytically from its seed and the clock, so the CPU never touches it.
        Height follows a rising jet, the radius widens with height, and two
        layers of swirl (a cheap stand-in for curl noise) give it turbulence.
        Points expand, cool (orange to dark grey to pale) and fade as they rise. ── */
  var plume = {
    vert: [
      'attribute vec4 aSeed; attribute float aGas; attribute float aAct;',
      'uniform float uTime, uIntensity, uH, uPx, uFlash, uGasMode, uSpeed;',
      'uniform vec3 uOrigin, uC0, uC1, uC2, uC3, uC4; uniform vec4 uCum; uniform vec2 uWind;',
      'varying vec4 vCol;',
      'void main(){',
      '  float on = step(aAct, uIntensity);',
      '  float life = fract(uTime * uSpeed * (0.55 + aSeed.x * 0.9) + aSeed.y);',
      '  float hgt = pow(life, 0.72) * uH * (0.62 + 0.38 * aSeed.z);',
      '  float ang = aSeed.x * 62.83 + aSeed.w * 6.283;',
      '  float rad = (0.25 + life * life * uH * 0.32) * sqrt(aSeed.w) * 1.1;',   /* sqrt fills the disc, so the cloud is not hollow */
      '  vec3 p = vec3(cos(ang) * rad, hgt, sin(ang) * rad);',
      '  float t = uTime * 0.35;',
      '  vec2 sw = vec2(sin(p.y * 0.7 + t + aSeed.x * 20.0) + 0.5 * sin(p.y * 1.9 - t * 1.3 + aSeed.y * 30.0),',
      '                 cos(p.y * 0.6 - t * 0.9 + aSeed.z * 25.0) + 0.5 * cos(p.y * 2.1 + t * 1.1 + aSeed.w * 31.0)) * (0.25 + life * 1.5);',
      '  p.xz += sw + uWind * life * life * uH * 0.45;',
      '  vec4 mv = modelViewMatrix * vec4(uOrigin + p, 1.0);',
      '  float sz = (1.4 + life * 6.5) * (0.65 + aSeed.z * 0.7);',
      '  gl_PointSize = on * sz * uPx / max(-mv.z, 0.5);',
      '  gl_Position = projectionMatrix * mv;',
      '  vec3 hotc = vec3(0.62, 0.26, 0.07);',
      '  vec3 ash = mix(vec3(0.085, 0.075, 0.07), vec3(0.40, 0.38, 0.37), life);',
      '  vec3 col = mix(hotc, ash, smoothstep(0.0, 0.22, life));',
      '  col += uFlash * vec3(0.55, 0.52, 0.75) * (1.1 - life);',
      '  vec3 gc = uC4;',
      '  if (aGas < uCum.x) gc = uC0; else if (aGas < uCum.y) gc = uC1; else if (aGas < uCum.z) gc = uC2; else if (aGas < uCum.w) gc = uC3;',
      '  col = mix(col, gc, uGasMode * 0.8);',
      '  float fade = smoothstep(0.0, 0.05, life) * (1.0 - smoothstep(0.55, 1.0, life));',
      '  vCol = vec4(col, fade * 0.62);',
      '}'
    ].join('\n'),
    frag: [
      'uniform sampler2D uMap; varying vec4 vCol;',
      'void main(){ float a = texture2D(uMap, gl_PointCoord).a * vCol.a; if (a < 0.01) discard; gl_FragColor = vec4(vCol.rgb, a); }'
    ].join('\n')
  };

  /* ── EMBERS AND SPARKS: additive, ballistic arcs that bloom ── */
  var ember = {
    vert: [
      'attribute vec4 aSeed; attribute float aAct;',
      'uniform float uTime, uIntensity, uPx, uSpeed; uniform vec3 uOrigin;',
      'varying vec4 vCol;',
      'void main(){',
      '  float on = step(aAct, uIntensity);',
      '  float life = fract(uTime * uSpeed * (0.5 + aSeed.x) + aSeed.y);',
      '  float tt = life * 2.6;',
      '  float ang = aSeed.z * 6.283; float sp = 1.0 + aSeed.w * 5.0;',
      '  vec3 v = vec3(cos(ang) * sp, 6.0 + aSeed.x * 10.0 * (0.4 + uIntensity), sin(ang) * sp);',
      '  vec3 p = uOrigin + v * tt + vec3(0.0, -0.5 * 9.0 * tt * tt, 0.0);',
      '  vec4 mv = modelViewMatrix * vec4(p, 1.0);',
      '  gl_PointSize = on * (0.35 + aSeed.w * 0.3) * (1.0 - life * 0.6) * uPx / max(-mv.z, 0.5);',
      '  gl_Position = projectionMatrix * mv;',
      '  vCol = vec4(mix(vec3(1.0, 0.75, 0.3), vec3(0.85, 0.12, 0.02), life), (1.0 - life) * on);',
      '}'
    ].join('\n'),
    frag: [
      'varying vec4 vCol;',
      'void main(){ float d = length(gl_PointCoord - 0.5) * 2.0; float a = (1.0 - smoothstep(0.0, 1.0, d)) * vCol.a; if (a < 0.02) discard; gl_FragColor = vec4(vCol.rgb * 1.4, a); }'
    ].join('\n')
  };

  /* ── STEAM: white billows at the spots where lava reaches the sea ── */
  var steam = {
    vert: [
      'attribute vec4 aSeed; attribute vec3 aSpot; attribute float aAct;',
      'uniform float uTime, uAmount, uPx, uSpeed; uniform vec3 uTint;',
      'varying vec4 vCol;',
      'void main(){',
      '  float on = step(aAct, uAmount);',
      '  float life = fract(uTime * uSpeed * (0.6 + aSeed.x * 0.6) + aSeed.y);',
      '  float hgt = pow(life, 0.8) * (3.5 + 6.0 * aSeed.z) * (0.4 + uAmount);',
      '  vec3 p = aSpot + vec3((aSeed.w - 0.5) * 2.4 * (0.4 + life * 2.0), hgt, (aSeed.x - 0.5) * 2.4 * (0.4 + life * 2.0));',
      '  p.x += sin(hgt * 0.9 + uTime * 0.6 + aSeed.y * 30.0) * 0.6 * life;',
      '  vec4 mv = modelViewMatrix * vec4(p, 1.0);',
      '  gl_PointSize = on * (1.2 + life * 4.2) * uPx / max(-mv.z, 0.5);',
      '  gl_Position = projectionMatrix * mv;',
      '  vCol = vec4(uTint, smoothstep(0.0, 0.1, life) * (1.0 - life) * 0.5);',
      '}'
    ].join('\n'),
    frag: plume.frag
  };

  /* ── RAIN: streaks falling through the whole scene ── */
  var rain = {
    vert: [
      'attribute vec3 aSeed; attribute float aEnd; attribute float aAct;',
      'uniform float uTime, uRain;',
      'varying float vA;',
      'void main(){',
      '  float on = step(aAct, uRain);',
      '  vec3 p = vec3((aSeed.x * 2.0 - 1.0) * 55.0, 34.0 - fract(uTime * 1.6 + aSeed.z) * 38.0, (aSeed.y * 2.0 - 1.0) * 55.0);',
      '  p += aEnd * vec3(0.25, 1.6, 0.0);',
      '  vA = on * (1.0 - aEnd * 0.6) * 0.42;',
      '  gl_Position = projectionMatrix * viewMatrix * modelMatrix * vec4(p, 1.0);',
      '}'
    ].join('\n'),
    frag: 'varying float vA; void main(){ gl_FragColor = vec4(0.72, 0.8, 0.9, vA); }'
  };

  /* ── CUT-AWAY: the layered ground of the carbon lock-up view ── */
  var strata = {
    vert: [
      'varying vec3 vWorld; varying float vU; varying vec3 vNormalW;',
      'void main(){',
      '  vec4 w = modelMatrix * vec4(position, 1.0);',
      '  vWorld = w.xyz; vU = position.y / 12.0 + 0.5; vNormalW = normalize(mat3(modelMatrix) * normal);',
      '  gl_Position = projectionMatrix * viewMatrix * w;',
      '}'
    ].join('\n'),
    frag: [
      'uniform vec4 uB0; uniform vec3 uB1;',   /* cumulative layer tops as fractions of the height */
      'uniform vec3 uTopCol, uLightDir, uSunC, uAmb, uFogC; uniform float uFogD, uHot;',
      'varying vec3 vWorld; varying float vU; varying vec3 vNormalW;',
      NOISE, FOG,
      'float specks(vec2 p, float dens){ vec2 g = floor(p); vec2 f = fract(p) - 0.5; float h = hash(g); return step(1.0 - dens, h) * smoothstep(0.22, 0.05, length(f)); }',
      'void main(){',
      '  vec3 n = normalize(vNormalW);',
      '  vec2 q = vec2(vWorld.x + vWorld.z, vWorld.y);',
      '  float warp = (fbm(q * vec2(0.18, 0.6) + 3.0) - 0.5) * 0.06;',
      '  float u = vU + warp;',
      '  vec3 col;',
      '  if (n.y > 0.5) { col = uTopCol * (0.85 + 0.3 * fbm(vWorld.xz * 0.8)); }',
      '  else {',
      '    float grain = fbm(q * vec2(1.4, 3.0));',
      '    if (u < uB0.x) { col = mix(vec3(0.26, 0.25, 0.27), vec3(0.45, 0.43, 0.44), grain); col += specks(q * 3.0, 0.25) * 0.15; col = mix(col, vec3(0.9, 0.25, 0.04) * (0.35 + grain), uHot * smoothstep(0.35, 0.0, u)); }',
      '    else if (u < uB0.y) { col = mix(vec3(0.74, 0.70, 0.58), vec3(0.88, 0.85, 0.74), grain); col = mix(col, vec3(0.96, 0.95, 0.9), specks(q * 4.0, 0.22)); col *= 1.0 - 0.12 * smoothstep(0.45, 0.5, fract(q.y * 2.3)); }',
      '    else if (u < uB0.z) { col = mix(vec3(0.20, 0.13, 0.09), vec3(0.34, 0.22, 0.13), grain); col += vec3(0.45, 0.30, 0.05) * specks(q * 5.0, 0.12); col += vec3(0.12, 0.10, 0.2) * smoothstep(0.9, 1.0, sin(q.y * 9.0 + grain * 4.0)) * 0.5; }',
      '    else if (u < uB0.w) { col = mix(vec3(0.66, 0.46, 0.27), vec3(0.80, 0.60, 0.38), grain); col *= 0.86 + 0.14 * sin(q.y * 13.0 + grain * 6.0); }',
      '    else if (u < uB1.x) { col = mix(vec3(0.03, 0.03, 0.035), vec3(0.10, 0.10, 0.12), grain); col += vec3(0.25, 0.26, 0.30) * specks(q * 6.0, 0.10); col += vec3(0.05, 0.12, 0.05) * smoothstep(0.93, 1.0, sin(q.x * 7.0 + q.y * 4.0)); }',
      '    else if (u < uB1.y) { col = mix(vec3(0.68, 0.50, 0.30), vec3(0.78, 0.60, 0.40), grain); col *= 0.88 + 0.12 * sin(q.y * 11.0 + grain * 5.0); }',
      '    else { col = mix(vec3(0.17, 0.11, 0.07), vec3(0.30, 0.20, 0.11), grain); }',
      /* thin dark seam at each layer boundary so the layers read in greyscale too */
      '    float seam = min(min(min(abs(u - uB0.x), abs(u - uB0.y)), min(abs(u - uB0.z), abs(u - uB0.w))), min(abs(u - uB1.x), abs(u - uB1.y)));',
      '    col *= 0.55 + 0.45 * smoothstep(0.0, 0.006, seam);',
      '  }',
      '  col *= uAmb + uSunC * max(dot(n, uLightDir), 0.0);',
      '  col = applyFog(col, length(cameraPosition - vWorld));',
      '  gl_FragColor = vec4(col, 1.0);',
      '}'
    ].join('\n')
  };

  /* ── PROCEDURAL TEXTURES (canvas, no files) ── */
  function canvas(w, h) { var c = document.createElement('canvas'); c.width = w; c.height = h; return c; }
  function rnd(seed) { var s = seed; return function () { s = (s * 16807) % 2147483647; return s / 2147483647; }; }

  /* soft smoke/ash puff: overlapping radial blobs, faded to nothing at the rim */
  function smokeTexture() {
    var c = canvas(128, 128), g = c.getContext('2d'), r = rnd(7);
    for (var i = 0; i < 22; i++) {
      var x = 64 + (r() - 0.5) * 50, y = 64 + (r() - 0.5) * 50, rad = 18 + r() * 26;
      var gr = g.createRadialGradient(x, y, 0, x, y, rad);
      gr.addColorStop(0, 'rgba(255,255,255,0.30)'); gr.addColorStop(1, 'rgba(255,255,255,0)');
      g.fillStyle = gr; g.fillRect(0, 0, 128, 128);
    }
    g.globalCompositeOperation = 'destination-in';
    var m = g.createRadialGradient(64, 64, 0, 64, 64, 64);
    m.addColorStop(0, 'rgba(0,0,0,1)'); m.addColorStop(0.6, 'rgba(0,0,0,0.7)'); m.addColorStop(1, 'rgba(0,0,0,0)');
    g.fillStyle = m; g.fillRect(0, 0, 128, 128);
    return new THREE.CanvasTexture(c);
  }

  /* cumulus: a flat-bottomed heap of white puffs */
  function cloudTexture() {
    var c = canvas(256, 128), g = c.getContext('2d'), r = rnd(21);
    for (var i = 0; i < 46; i++) {
      var x = 30 + r() * 196, hump = Math.sin((x - 30) / 196 * Math.PI);
      var y = 88 - r() * 46 * hump, rad = 14 + r() * 24 * (0.5 + hump);
      var gr = g.createRadialGradient(x, y, 0, x, y, rad);
      gr.addColorStop(0, 'rgba(255,255,255,0.55)'); gr.addColorStop(1, 'rgba(255,255,255,0)');
      g.fillStyle = gr; g.fillRect(0, 0, 256, 128);
    }
    g.globalCompositeOperation = 'destination-in';
    var m = g.createLinearGradient(0, 0, 0, 128);
    m.addColorStop(0, 'rgba(0,0,0,1)'); m.addColorStop(0.72, 'rgba(0,0,0,1)'); m.addColorStop(1, 'rgba(0,0,0,0)');
    g.fillStyle = m; g.fillRect(0, 0, 256, 128);
    return new THREE.CanvasTexture(c);
  }

  /* the Moon: maria and craters */
  function moonTexture() {
    var c = canvas(256, 128), g = c.getContext('2d'), r = rnd(3);
    g.fillStyle = '#b9b5ad'; g.fillRect(0, 0, 256, 128);
    for (var i = 0; i < 14; i++) {
      var x = r() * 256, y = 20 + r() * 88, rad = 10 + r() * 26;
      var gr = g.createRadialGradient(x, y, 0, x, y, rad);
      gr.addColorStop(0, 'rgba(90,88,92,0.55)'); gr.addColorStop(1, 'rgba(90,88,92,0)');
      g.fillStyle = gr; g.fillRect(0, 0, 256, 128);
    }
    for (var k = 0; k < 90; k++) {
      var cx = r() * 256, cy = r() * 128, cr = 1.5 + r() * r() * 9;
      g.beginPath(); g.arc(cx, cy, cr, 0, 6.283);
      g.fillStyle = 'rgba(70,68,72,0.45)'; g.fill();
      g.beginPath(); g.arc(cx - cr * 0.15, cy - cr * 0.15, cr * 0.75, 0, 6.283);
      g.fillStyle = 'rgba(200,197,190,0.35)'; g.fill();
    }
    return new THREE.CanvasTexture(c);
  }

  /* algae mat: mottled greens */
  function stromaTexture() {
    var c = canvas(64, 128), g = c.getContext('2d'), r = rnd(11);
    var cols = ['#3f7a3a', '#4f8d3f', '#2f6a34', '#5d9a45', '#44803b', '#6aa24c'];
    for (var y = 0; y < 128; y += 4) { g.fillStyle = cols[Math.floor(r() * cols.length)]; g.fillRect(0, y, 64, 4); }
    var t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; return t;
  }

  AE.GLSL = { terrain: terrain, ocean: ocean, sky: sky, plume: plume, ember: ember, steam: steam, rain: rain, strata: strata, NOISE: NOISE };
  AE.makeTextures = function () {
    return { smoke: smokeTexture(), cloud: cloudTexture(), moon: moonTexture(), stroma: stromaTexture() };
  };
})();
