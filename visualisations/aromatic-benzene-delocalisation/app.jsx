const { useState, useEffect, useRef, useMemo, useCallback } = React;

/* ═══════════════════════════════════════════════════════════════════════
   CHEMISTRY CONSTANTS  (AQA 3.3.10)
   ═══════════════════════════════════════════════════════════════════════ */
const PM = {
  cSingle: 154,   // C–C in cyclohexane / alkanes
  cDouble: 134,   // C=C in alkenes
  benzene: 140,   // every C–C in benzene (X-ray diffraction)
  cH:      109
};
const HYD = {
  cyclohexene:  -120,
  diene:        -240,   // 2 x -120 (predicted from an isolated C=C)
  trienePred:   -360,   // 3 x -120  (Kekulé cyclohexa-1,3,5-triene)
  benzeneReal:  -208,   // measured
  delocEnergy:   152    // 360 - 208
};

/* ═══════════════════════════════════════════════════════════════════════
   SMALL UI PRIMITIVES
   ═══════════════════════════════════════════════════════════════════════ */
const TONES = {
  cyan:    'bg-cyan-500/15 text-cyan-300 ring-cyan-400/30',
  violet:  'bg-violet-500/15 text-violet-200 ring-violet-400/30',
  amber:   'bg-amber-500/15 text-amber-200 ring-amber-400/30',
  emerald: 'bg-emerald-500/15 text-emerald-200 ring-emerald-400/30',
  rose:    'bg-rose-500/15 text-rose-200 ring-rose-400/30',
  slate:   'bg-slate-500/15 text-slate-300 ring-slate-400/30'
};

function Badge({ tone = 'cyan', children, className = '' }) {
  return (
    <span className={'inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-[0.09em] ring-1 ' + TONES[tone] + ' ' + className}>
      {children}
    </span>
  );
}

function Card({ children, className = '' }) {
  return <div className={'glass rounded-2xl ' + className}>{children}</div>;
}

function Seg({ active, onClick, children, title }) {
  return (
    <button
      title={title}
      onClick={onClick}
      className={'px-3 py-2 rounded-xl text-sm font-semibold transition-all border ' +
        (active
          ? 'bg-cyan-400/20 border-cyan-300/50 text-cyan-100 shadow-[0_0_18px_-4px_rgba(34,211,238,.7)]'
          : 'bg-white/[.03] border-white/10 text-slate-300 hover:bg-white/[.08] hover:text-white')}>
      {children}
    </button>
  );
}

function Switch({ on, onChange, label, hint }) {
  return (
    <button
      onClick={() => onChange(!on)}
      className="w-full flex items-center justify-between gap-3 rounded-xl border border-white/10 bg-white/[.03] px-3 py-2 text-left hover:bg-white/[.07] transition">
      <span>
        <span className="block text-sm font-semibold text-slate-100">{label}</span>
        {hint && <span className="block text-[11px] text-slate-400 leading-tight">{hint}</span>}
      </span>
      <span className={'relative shrink-0 w-10 h-[22px] rounded-full transition ' + (on ? 'bg-cyan-400/80' : 'bg-slate-600/70')}>
        <span className={'absolute top-[3px] w-4 h-4 rounded-full bg-white transition-all ' + (on ? 'left-[21px]' : 'left-[3px]')}></span>
      </span>
    </button>
  );
}

/* ═══════════════════════════════════════════════════════════════════════
   MINIMAL ORBIT CONTROLS  (fallback if the CDN OrbitControls fails)
   ═══════════════════════════════════════════════════════════════════════ */
class MiniOrbit {
  constructor(cam, dom) {
    this.cam = cam; this.dom = dom;
    this.target = new THREE.Vector3();
    this.autoRotate = false; this.autoRotateSpeed = 1.0;
    this.enableDamping = true;
    this.minDistance = 3; this.maxDistance = 16;
    this._drag = null; this._px = 0; this._py = 0;
    this.dTheta = 0; this.dPhi = 0; this.dR = 0;
    this.panOff = new THREE.Vector3();
    this.syncFromCamera();
    this._down = e => {
      this._drag = (e.button === 2 || e.shiftKey) ? 'pan' : 'rot';
      this._px = e.clientX; this._py = e.clientY;
      dom.setPointerCapture(e.pointerId);
    };
    this._move = e => {
      if (!this._drag) return;
      const dx = e.clientX - this._px, dy = e.clientY - this._py;
      this._px = e.clientX; this._py = e.clientY;
      if (this._drag === 'rot') { this.dTheta -= dx * 0.006; this.dPhi -= dy * 0.006; }
      else {
        const s = this.r * 0.0016;
        const right = new THREE.Vector3().setFromMatrixColumn(this.cam.matrix, 0);
        const up    = new THREE.Vector3().setFromMatrixColumn(this.cam.matrix, 1);
        this.panOff.add(right.multiplyScalar(-dx * s)).add(up.multiplyScalar(dy * s));
      }
    };
    this._up = e => { this._drag = null; try { dom.releasePointerCapture(e.pointerId); } catch (_) {} };
    this._wheel = e => { e.preventDefault(); this.dR += e.deltaY * 0.0007; };
    this._ctx = e => e.preventDefault();
    dom.addEventListener('pointerdown', this._down);
    dom.addEventListener('pointermove', this._move);
    dom.addEventListener('pointerup', this._up);
    dom.addEventListener('pointercancel', this._up);
    dom.addEventListener('wheel', this._wheel, { passive: false });
    dom.addEventListener('contextmenu', this._ctx);
  }
  syncFromCamera() {
    const off = new THREE.Vector3().subVectors(this.cam.position, this.target);
    this.r = Math.max(0.001, off.length());
    this.theta = Math.atan2(off.x, off.z);
    this.phi = Math.acos(Math.max(-1, Math.min(1, off.y / this.r)));
  }
  update() {
    if (this.autoRotate) this.theta -= this.autoRotateSpeed * 0.0042;
    this.theta += this.dTheta; this.phi += this.dPhi; this.r *= (1 + this.dR);
    this.phi = Math.max(0.14, Math.min(Math.PI - 0.14, this.phi));
    this.r = Math.max(this.minDistance, Math.min(this.maxDistance, this.r));
    this.target.add(this.panOff);
    const d = this.enableDamping ? 0.84 : 0;
    this.dTheta *= d; this.dPhi *= d; this.dR *= d; this.panOff.multiplyScalar(d);
    const sp = Math.sin(this.phi);
    this.cam.position.set(
      this.target.x + this.r * sp * Math.sin(this.theta),
      this.target.y + this.r * Math.cos(this.phi),
      this.target.z + this.r * sp * Math.cos(this.theta)
    );
    this.cam.lookAt(this.target);
  }
  dispose() {
    const d = this.dom;
    d.removeEventListener('pointerdown', this._down);
    d.removeEventListener('pointermove', this._move);
    d.removeEventListener('pointerup', this._up);
    d.removeEventListener('pointercancel', this._up);
    d.removeEventListener('wheel', this._wheel);
    d.removeEventListener('contextmenu', this._ctx);
  }
}

/* ═══════════════════════════════════════════════════════════════════════
   SECTION 1 — 3D BENZENE VIEWER
   ═══════════════════════════════════════════════════════════════════════ */
const S = 0.01;                       // 1 pm  ->  0.01 scene units
const UP = () => new THREE.Vector3(0, 1, 0);

function disposeTree(obj) {
  obj.traverse(o => {
    if (o.geometry) o.geometry.dispose();
    if (o.material) (Array.isArray(o.material) ? o.material : [o.material]).forEach(m => m.dispose());
  });
}

/* Hexagon whose interior angles are all 120 deg but whose sides may alternate.
   Walking round with edge directions 0,60,120,180,240,300 deg always closes,
   because (u0+u2+u4) = (u1+u3+u5) = 0 — so the Kekule ring is still planar
   with 120 deg angles, just not equilateral. */
function ringPoints(lengths) {
  const pts = []; let x = 0, z = 0;
  for (let i = 0; i < 6; i++) {
    pts.push(new THREE.Vector3(x, 0, z));
    const a = i * Math.PI / 3;
    x += lengths[i] * Math.cos(a);
    z += lengths[i] * Math.sin(a);
  }
  const c = new THREE.Vector3();
  pts.forEach(p => c.add(p));
  c.multiplyScalar(1 / 6);
  pts.forEach(p => p.sub(c));
  return pts;
}

function cylinder(a, b, radius, mat, shrink = 1) {
  const dir = new THREE.Vector3().subVectors(b, a);
  const len = dir.length() * shrink;
  const g = new THREE.CylinderGeometry(radius, radius, len, 18, 1);
  const m = new THREE.Mesh(g, mat);
  m.position.copy(a).add(b).multiplyScalar(0.5);
  m.quaternion.setFromUnitVectors(UP(), dir.clone().normalize());
  return m;
}

/* local basis: X along the bond, Y = world up, Z = in-plane normal */
function bondFrame(a, b) {
  const mid = new THREE.Vector3().copy(a).add(b).multiplyScalar(0.5);
  const xA = new THREE.Vector3().subVectors(b, a).normalize();
  const yA = UP();
  const zA = new THREE.Vector3().crossVectors(xA, yA);
  const g = new THREE.Group();
  g.position.copy(mid);
  g.quaternion.setFromRotationMatrix(new THREE.Matrix4().makeBasis(xA, yA, zA));
  return g;
}

function buildMolecule(mode, opts) {
  const kek = mode === 'kekule';
  const orb = mode === 'porbital';
  const lengths = kek
    ? [PM.cDouble, PM.cSingle, PM.cDouble, PM.cSingle, PM.cDouble, PM.cSingle].map(v => v * S)
    : [PM.benzene, PM.benzene, PM.benzene, PM.benzene, PM.benzene, PM.benzene].map(v => v * S);
  const P = ringPoints(lengths);

  const M = {
    carbon: new THREE.MeshStandardMaterial({ color: 0x303d4f, roughness: 0.42, metalness: 0.22 }),
    hydro:  new THREE.MeshStandardMaterial({ color: 0xe2e8f0, roughness: 0.32, metalness: 0.05 }),
    sigma:  new THREE.MeshStandardMaterial({ color: 0x7c8da3, roughness: 0.45, metalness: 0.3 }),
    pi:     new THREE.MeshStandardMaterial({ color: 0x22d3ee, roughness: 0.35, metalness: 0.15,
              emissive: 0x0e7490, emissiveIntensity: 0.35 }),
    cloud:  new THREE.MeshStandardMaterial({ color: 0x38bdf8, transparent: true, opacity: 0.2,
              roughness: 0.9, metalness: 0, side: THREE.DoubleSide, depthWrite: false,
              emissive: 0x0ea5e9, emissiveIntensity: 0.14 }),
    lobeUp: new THREE.MeshStandardMaterial({ color: 0x60a5fa, transparent: true, opacity: 0.55,
              roughness: 0.5, side: THREE.DoubleSide, depthWrite: false,
              emissive: 0x1d4ed8, emissiveIntensity: 0.3 }),
    lobeDn: new THREE.MeshStandardMaterial({ color: 0xf472b6, transparent: true, opacity: 0.55,
              roughness: 0.5, side: THREE.DoubleSide, depthWrite: false,
              emissive: 0x9d174d, emissiveIntensity: 0.3 }),
    disc:   new THREE.MeshBasicMaterial({ color: 0x64748b, transparent: true, opacity: 0.07,
              side: THREE.DoubleSide, depthWrite: false })
  };

  const g = new THREE.Group();
  const labels = [];

  /* ── ring plane hint ─────────────────────────────────────────────── */
  const disc = new THREE.Mesh(new THREE.CircleGeometry(2.15, 64), M.disc);
  disc.rotation.x = -Math.PI / 2;
  disc.position.y = -0.002;
  g.add(disc);

  /* ── carbons + hydrogens ─────────────────────────────────────────── */
  const cGeo = new THREE.SphereGeometry(0.25, 32, 24);
  const hGeo = new THREE.SphereGeometry(0.155, 24, 18);
  P.forEach((p, i) => {
    const c = new THREE.Mesh(cGeo, M.carbon);
    c.position.copy(p);
    g.add(c);
    if (opts.showH) {
      const out = p.clone().normalize();
      const h = p.clone().addScaledVector(out, PM.cH * S);
      const hm = new THREE.Mesh(hGeo, M.hydro);
      hm.position.copy(h);
      g.add(hm);
      g.add(cylinder(p, h, 0.048, M.sigma));
      if (i === 3) labels.push({ text: PM.cH + ' pm', kind: 'ch', pos: p.clone().lerp(h, 1.08).setY(-0.3) });
    }
  });

  /* ── sigma skeleton ──────────────────────────────────────────────── */
  for (let i = 0; i < 6; i++) {
    const a = P[i], b = P[(i + 1) % 6];
    g.add(cylinder(a, b, 0.075, M.sigma));

    const isDouble = kek && i % 2 === 0;
    if (isDouble) {
      /* second (pi) line drawn inside the ring */
      const mid = new THREE.Vector3().copy(a).add(b).multiplyScalar(0.5);
      const inward = mid.clone().normalize().multiplyScalar(-0.155);
      g.add(cylinder(a.clone().add(inward), b.clone().add(inward), 0.055, M.pi, 0.78));
    }

    /* bond-length label pushed outwards from the centre */
    const mid = new THREE.Vector3().copy(a).add(b).multiplyScalar(0.5);
    labels.push({
      text: (kek ? (isDouble ? PM.cDouble : PM.cSingle) : PM.benzene) + ' pm',
      kind: 'bond',
      pos: mid.clone().multiplyScalar(1.95).setY(0.34)
    });
  }

  /* ── 120 deg bond angles ─────────────────────────────────────────── */
  [1, 3, 5].forEach(i => {
    labels.push({ text: '120°', kind: 'angle', pos: P[i].clone().multiplyScalar(0.58).setY(0.05) });
  });

  /* ── localised pi clouds on each Kekule C=C ──────────────────────── */
  if (kek) {
    for (let i = 0; i < 6; i += 2) {
      const a = P[i], b = P[(i + 1) % 6];
      const len = a.distanceTo(b);
      const fr = bondFrame(a, b);
      [1, -1].forEach(sgn => {
        const lobe = new THREE.Mesh(new THREE.SphereGeometry(1, 28, 20), M.cloud);
        lobe.scale.set(len * 0.46, 0.16, 0.3);
        lobe.position.set(0, sgn * 0.3, -0.06);
        fr.add(lobe);
      });
      g.add(fr);
    }
  }

  /* ── delocalised doughnut clouds ─────────────────────────────────── */
  if (mode === 'delocalised' || (orb && opts.overlap)) {
    const op = orb ? 0.13 : 0.2;
    [1, -1].forEach(sgn => {
      const mat = M.cloud.clone();
      mat.opacity = op;
      const t = new THREE.Mesh(new THREE.TorusGeometry(PM.benzene * S, 0.19, 24, 72), mat);
      t.rotation.x = -Math.PI / 2;
      t.position.y = sgn * 0.36;
      g.add(t);
    });
  }

  /* ── unhybridised p-orbitals ─────────────────────────────────────── */
  if (orb) {
    const w = opts.overlap ? 0.36 : 0.2;
    P.forEach(p => {
      [[1, M.lobeUp], [-1, M.lobeDn]].forEach(([sgn, mat]) => {
        const lobe = new THREE.Mesh(new THREE.SphereGeometry(1, 24, 18), mat);
        lobe.scale.set(w, 0.4, w);
        lobe.position.copy(p).setY(sgn * 0.46);
        g.add(lobe);
      });
    });
  }

  return { group: g, labels };
}

const VIEWS = {
  angled: { name: 'Angled',   pos: [0, 2.7, 5.1] },
  edge:   { name: 'Edge-on',  pos: [0, 0.22, 5.6] },
  top:    { name: 'Top-down', pos: [0, 5.6, 0.02] }
};

function Viewer({ mode, showLabels, showH, overlap, autoRotate, view, viewNonce }) {
  const mountRef = useRef(null);
  const layerRef = useRef(null);
  const R = useRef({ labels: [], showLabels: true });

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount || typeof THREE === 'undefined') return;

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(45, 1, 0.1, 100);
    camera.position.set(0, 2.7, 5.1);

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.setSize(mount.clientWidth || 600, mount.clientHeight || 400);
    mount.appendChild(renderer.domElement);
    renderer.domElement.style.touchAction = 'none';
    renderer.domElement.style.display = 'block';

    let controls;
    if (THREE.OrbitControls) {
      controls = new THREE.OrbitControls(camera, renderer.domElement);
      controls.enableDamping = true;
      controls.dampingFactor = 0.09;
      controls.minDistance = 3;
      controls.maxDistance = 16;
    } else {
      controls = new MiniOrbit(camera, renderer.domElement);
    }
    controls.autoRotateSpeed = 1.1;

    scene.add(new THREE.AmbientLight(0xffffff, 0.55));
    scene.add(new THREE.HemisphereLight(0x93c5fd, 0x0b1220, 0.55));
    const key = new THREE.DirectionalLight(0xffffff, 0.85); key.position.set(4, 7, 5);
    const fill = new THREE.DirectionalLight(0x7dd3fc, 0.45); fill.position.set(-5, -3, -4);
    scene.add(key, fill);

    Object.assign(R.current, { scene, camera, renderer, controls, mount, running: true });

    const onResize = () => {
      const w = mount.clientWidth, h = mount.clientHeight;
      if (!w || !h) return;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };
    onResize();
    const ro = new ResizeObserver(onResize);
    ro.observe(mount);

    const tick = () => {
      if (!R.current.running) return;
      R.current.raf = requestAnimationFrame(tick);
      controls.update();
      renderer.render(scene, camera);
      const w = mount.clientWidth, h = mount.clientHeight;
      const show = R.current.showLabels;
      R.current.labels.forEach(l => {
        if (!show) { l.el.style.display = 'none'; return; }
        const v = l.pos.clone().project(camera);
        if (v.z > 1) { l.el.style.display = 'none'; return; }
        l.el.style.display = 'block';
        l.el.style.transform =
          'translate(-50%,-50%) translate(' + ((v.x * 0.5 + 0.5) * w).toFixed(1) + 'px,' +
          ((-v.y * 0.5 + 0.5) * h).toFixed(1) + 'px)';
      });
    };
    tick();

    return () => {
      R.current.running = false;
      cancelAnimationFrame(R.current.raf);
      ro.disconnect();
      if (controls.dispose) controls.dispose();
      if (R.current.group) disposeTree(R.current.group);
      renderer.dispose();
      if (renderer.domElement.parentNode) renderer.domElement.parentNode.removeChild(renderer.domElement);
    };
  }, []);

  useEffect(() => {
    const st = R.current;
    if (!st.scene) return;
    if (st.group) { st.scene.remove(st.group); disposeTree(st.group); }
    st.labels.forEach(l => l.el.remove());
    const built = buildMolecule(mode, { showH: showH, overlap: overlap });
    st.group = built.group;
    st.scene.add(built.group);
    const layer = layerRef.current;
    st.labels = built.labels.map(l => {
      const el = document.createElement('div');
      el.className = 'lbl lbl-' + l.kind;
      el.textContent = l.text;
      el.style.display = 'none';
      layer.appendChild(el);
      return { el: el, pos: l.pos };
    });
  }, [mode, showH, overlap]);

  useEffect(() => { R.current.showLabels = showLabels; }, [showLabels]);
  useEffect(() => { if (R.current.controls) R.current.controls.autoRotate = autoRotate; }, [autoRotate]);
  useEffect(() => {
    const st = R.current;
    if (!st.camera) return;
    const p = VIEWS[view].pos;
    st.camera.position.set(p[0], p[1], p[2]);
    if (st.controls.target) st.controls.target.set(0, 0, 0);
    if (st.controls.syncFromCamera) st.controls.syncFromCamera();
    st.camera.lookAt(0, 0, 0);
  }, [view, viewNonce]);

  return (
    <div className="relative w-full h-full">
      <div ref={mountRef} className="absolute inset-0 viewport rounded-xl overflow-hidden"></div>
      <div ref={layerRef} className="absolute inset-0 pointer-events-none overflow-hidden rounded-xl"></div>
    </div>
  );
}

const MODEL_INFO = {
  kekule: {
    tone: 'rose', tag: 'Predicted', title: 'Kekulé model — cyclohexa-1,3,5-triene',
    blurb: 'Three localised C=C bonds (134 pm) alternating with three C–C single bonds (154 pm). The π electrons are trapped in pairs between specific pairs of carbon atoms.',
    bullets: [
      'Predicts two different C–C bond lengths: 134 pm and 154 pm.',
      'Predicts benzene should decolourise bromine water by electrophilic addition.',
      'Predicts an enthalpy of hydrogenation of 3 × (−120) = −360 kJ mol⁻¹.',
      'All three predictions are contradicted by experiment.'
    ]
  },
  delocalised: {
    tone: 'cyan', tag: 'Observed', title: 'Delocalised model — real benzene',
    blurb: 'A planar, regular hexagon. Every C–C bond is 140 pm — between a single (154) and a double (134) bond — and the six π electrons spread into ring-shaped clouds of charge density above and below the plane.',
    bullets: [
      'X-ray diffraction: all six C–C bonds are identical at 140 pm.',
      'All bond angles are exactly 120° and all 12 atoms lie in one plane.',
      'Each carbon donates one p electron to a delocalised π system of 6 electrons.',
      'Delocalisation lowers the energy by 152 kJ mol⁻¹ — the delocalisation energy.'
    ]
  },
  porbital: {
    tone: 'violet', tag: 'Bonding', title: 'p-orbital model — before sideways overlap',
    blurb: 'Each carbon uses three of its four outer electrons in σ bonds (to two carbons and one hydrogen), leaving one electron in an unhybridised p orbital perpendicular to the ring.',
    bullets: [
      'The σ framework is planar with 120° angles at every carbon.',
      'Six p orbitals stand at 90° to the plane of the ring.',
      'Sideways overlap of all six merges them into one delocalised π system.',
      'Lobes are colour-coded by phase — blue above the plane, pink below.'
    ]
  }
};

function Tab3D() {
  const [mode, setMode] = useState('delocalised');
  const [showLabels, setShowLabels] = useState(true);
  const [showH, setShowH] = useState(true);
  const [overlap, setOverlap] = useState(false);
  const [autoRotate, setAutoRotate] = useState(true);
  const [view, setView] = useState('angled');
  const [nonce, setNonce] = useState(0);
  const info = MODEL_INFO[mode];

  return (
    <div className="grid lg:grid-cols-[minmax(0,1fr)_330px] gap-4 fadein">
      <Card className="p-3 flex flex-col">
        <div className="flex flex-wrap items-center gap-2 pb-3">
          <Seg active={mode === 'kekule'} onClick={() => setMode('kekule')}>Kekulé model</Seg>
          <Seg active={mode === 'delocalised'} onClick={() => setMode('delocalised')}>Real delocalised benzene</Seg>
          <Seg active={mode === 'porbital'} onClick={() => setMode('porbital')}>p-orbital overlay</Seg>
        </div>
        <div className="relative w-full rounded-xl border border-white/10 overflow-hidden"
             style={{ height: 'clamp(340px, 56vh, 620px)' }}>
          <Viewer mode={mode} showLabels={showLabels} showH={showH} overlap={overlap}
                  autoRotate={autoRotate} view={view} viewNonce={nonce} />
          <div className="absolute left-3 bottom-3 flex flex-wrap gap-1.5">
            {Object.keys(VIEWS).map(k => (
              <button key={k}
                onClick={() => { setView(k); setNonce(n => n + 1); }}
                className={'px-2.5 py-1 rounded-lg text-[11px] font-semibold border transition ' +
                  (view === k ? 'bg-cyan-400/25 border-cyan-300/50 text-cyan-100'
                              : 'bg-black/40 border-white/10 text-slate-300 hover:bg-black/60')}>
                {VIEWS[k].name}
              </button>
            ))}
          </div>
          <div className="absolute right-3 bottom-3 hidden sm:block text-[10px] font-mono text-slate-400/80 bg-black/40 rounded-md px-2 py-1 border border-white/5">
            drag rotate · wheel zoom · shift-drag pan
          </div>
        </div>
      </Card>

      <div className="flex flex-col gap-3">
        <Card className="p-4">
          <Badge tone={info.tone}>{info.tag}</Badge>
          <h3 className="font-display text-xl mt-2 mb-1 text-white leading-snug">{info.title}</h3>
          <p className="text-sm text-slate-300 leading-relaxed">{info.blurb}</p>
          <ul className="mt-3 space-y-1.5">
            {info.bullets.map((b, i) => (
              <li key={i} className="flex gap-2 text-[13px] text-slate-300 leading-snug">
                <span className="text-cyan-400 mt-[2px]">▸</span><span>{b}</span>
              </li>
            ))}
          </ul>
        </Card>

        <Card className="p-3 space-y-2">
          <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-slate-400 px-1">Display options</p>
          <Switch on={showLabels} onChange={setShowLabels} label="Measurement overlay" hint="Bond lengths in pm and 120° angles" />
          <Switch on={showH} onChange={setShowH} label="Show hydrogen atoms" hint="C–H bonds, 109 pm" />
          <Switch on={autoRotate} onChange={setAutoRotate} label="Auto-rotate" hint="Spin the model slowly" />
          {mode === 'porbital' &&
            <Switch on={overlap} onChange={setOverlap} label="Sideways overlap"
                    hint="Merge the six p orbitals into one π system" />}
        </Card>

        <Card className="p-3">
          <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-slate-400 mb-2 px-1">Key bond lengths</p>
          <div className="grid grid-cols-3 gap-2 text-center">
            <div className="rounded-xl border border-white/10 bg-white/[.03] py-2">
              <div className="font-mono text-lg font-bold text-slate-300">154</div>
              <div className="text-[10px] uppercase tracking-wider text-slate-400">C–C / pm</div>
            </div>
            <div className="rounded-xl border border-cyan-400/30 bg-cyan-400/10 py-2">
              <div className="font-mono text-lg font-bold text-cyan-300">140</div>
              <div className="text-[10px] uppercase tracking-wider text-cyan-200/80">benzene</div>
            </div>
            <div className="rounded-xl border border-white/10 bg-white/[.03] py-2">
              <div className="font-mono text-lg font-bold text-rose-300">134</div>
              <div className="text-[10px] uppercase tracking-wider text-slate-400">C=C / pm</div>
            </div>
          </div>
          <p className="text-[12px] text-slate-400 mt-2 leading-snug">
            Benzene sits <strong className="text-cyan-300">between</strong> the two — the single clearest piece of
            structural evidence against the Kekulé model.
          </p>
        </Card>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════
   SECTION 2 — ENTHALPY OF HYDROGENATION DIAGRAM
   ═══════════════════════════════════════════════════════════════════════ */
const DW = 800, DH = 500, BASE = 412, PXK = 0.83;
const yFor = e => BASE - e * PXK;

function hexPts(cx, cy, r) {
  const p = [];
  for (let i = 0; i < 6; i++) {
    const a = (-90 + i * 60) * Math.PI / 180;
    p.push([cx + r * Math.cos(a), cy + r * Math.sin(a)]);
  }
  return p;
}

/* small skeletal glyph: doubles = which edges carry a second line, ring = aromatic circle */
function HexGlyph({ cx, cy, r, doubles = [], ring = false, colour = '#94a3b8', dashed = false }) {
  const p = hexPts(cx, cy, r);
  const poly = p.map(q => q[0].toFixed(1) + ',' + q[1].toFixed(1)).join(' ');
  const inner = doubles.map(i => {
    const a = p[i], b = p[(i + 1) % 6];
    const mx = (a[0] + b[0]) / 2 - cx, my = (a[1] + b[1]) / 2 - cy;
    const L = Math.hypot(mx, my) || 1;
    const ox = -mx / L * r * 0.22, oy = -my / L * r * 0.22;
    const ax = a[0] + (b[0] - a[0]) * 0.18, ay = a[1] + (b[1] - a[1]) * 0.18;
    const bx = a[0] + (b[0] - a[0]) * 0.82, by = a[1] + (b[1] - a[1]) * 0.82;
    return <line key={i} x1={ax + ox} y1={ay + oy} x2={bx + ox} y2={by + oy}
                 stroke={colour} strokeWidth="1.7" strokeLinecap="round" />;
  });
  return (
    <g>
      <polygon points={poly} fill="none" stroke={colour} strokeWidth="1.7"
               strokeDasharray={dashed ? '3 2.5' : undefined} strokeLinejoin="round" />
      {inner}
      {ring && <circle cx={cx} cy={cy} r={r * 0.52} fill="none" stroke={colour} strokeWidth="1.7" />}
    </g>
  );
}

const COLS = {
  ene:  { cx: 140, label: 'cyclohexene',        sub: '+ H₂',   colour: '#34d399', dh: HYD.cyclohexene, e: 120, doubles: [0] },
  dien: { cx: 355, label: 'cyclohexa-1,3-diene', sub: '+ 2H₂',  colour: '#fbbf24', dh: HYD.diene,       e: 240, doubles: [0, 2] },
  benz: { cx: 605, label: 'benzene',            sub: '+ 3H₂',  colour: '#22d3ee', dh: HYD.benzeneReal, e: 208, doubles: [] }
};

const DETAIL = {
  ene:  { tone: 'emerald', title: 'Cyclohexene + H₂ → cyclohexane',
          body: 'One isolated C=C. The measured enthalpy change is −120 kJ mol⁻¹. This is the benchmark: it is the energy released when one ordinary double bond is hydrogenated.' },
  dien: { tone: 'amber', title: 'Cyclohexa-1,3-diene + 2H₂ → cyclohexane',
          body: 'Two C=C bonds, so we predict 2 × (−120) = −240 kJ mol⁻¹. The measured value is very close to this, showing that two isolated double bonds simply add up — there is no large extra stability here.' },
  kek:  { tone: 'rose', title: 'Kekulé cyclohexa-1,3,5-triene (theoretical)',
          body: 'If benzene really were a triene with three isolated C=C bonds, hydrogenation would release 3 × (−120) = −360 kJ mol⁻¹. This level is theoretical — no such molecule exists.' },
  benz: { tone: 'cyan', title: 'Benzene + 3H₂ → cyclohexane (measured)',
          body: 'The measured value is only −208 kJ mol⁻¹ — 152 kJ mol⁻¹ less exothermic than predicted. Benzene starts 152 kJ mol⁻¹ lower in energy than the Kekulé structure, so it is that much more stable. That is the delocalisation (resonance) energy.' }
};

function TabEnergy() {
  const [reveal, setReveal] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [focus, setFocus] = useState('benz');

  useEffect(() => {
    if (!playing) return;
    let raf, last = performance.now();
    const step = t => {
      const dt = t - last; last = t;
      setReveal(r => Math.min(100, r + dt * 0.075));
      raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [playing]);
  useEffect(() => { if (playing && reveal >= 100) setPlaying(false); }, [reveal, playing]);

  const benzE = 360 - (360 - 208) * reveal / 100;      // 360 -> 208
  const gap = HYD.delocEnergy * reveal / 100;          // 0 -> 152
  const benzY = yFor(benzE);
  const kekY = yFor(360);
  const half = 78, halfB = 92;
  const det = DETAIL[focus];

  const tick = e => (
    <g key={e}>
      <line x1="46" y1={yFor(e)} x2="52" y2={yFor(e)} stroke="#64748b" strokeWidth="1.4" />
      <text x="42" y={yFor(e) + 4} textAnchor="end" fontSize="11" fill="#94a3b8" fontFamily="JetBrains Mono, monospace">{e}</text>
    </g>
  );

  const col = (k, y, doubles, ring) => {
    const c = COLS[k];
    const hw = k === 'benz' ? halfB : half;
    return (
      <g key={k} onMouseEnter={() => setFocus(k)} onClick={() => setFocus(k)} style={{ cursor: 'pointer' }}>
        <rect x={c.cx - hw} y={y - 62} width={hw * 2} height={BASE - y + 62} fill="transparent" />
        <line x1={c.cx - hw} y1={y} x2={c.cx + hw} y2={y} stroke={c.colour} strokeWidth="4.5" strokeLinecap="round" />
        <HexGlyph cx={c.cx} cy={y - 45} r={16} doubles={doubles} ring={ring} colour={c.colour} />
        <text x={c.cx} y={y - 16} textAnchor="middle" fontSize="12.5" fill="#e2e8f0" fontWeight="600">{c.label}</text>
        <text x={c.cx} y={y - 4} textAnchor="middle" fontSize="11" fill={c.colour} opacity="0.9">{c.sub}</text>
      </g>
    );
  };

  const dhArrow = (k, y, dh, side) => {
    const c = COLS[k];
    const mid = (y + BASE) / 2;
    return (
      <g key={k + '-dh'}>
        <line x1={c.cx} y1={y + 7} x2={c.cx} y2={BASE - 9} stroke={c.colour} strokeWidth="1.8"
              markerEnd={'url(#ah-' + k + ')'} opacity="0.9" />
        <text x={side === 'left' ? c.cx - 10 : c.cx + 10} y={mid - 4}
              textAnchor={side === 'left' ? 'end' : 'start'} fontSize="13" fontWeight="700"
              fill={c.colour} fontFamily="JetBrains Mono, monospace">
          {dh} kJ mol⁻¹
        </text>
      </g>
    );
  };

  return (
    <div className="grid xl:grid-cols-[minmax(0,1fr)_330px] gap-4 fadein">
      <Card className="p-3 sm:p-4">
        <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
          <div>
            <Badge tone="amber">Thermochemical evidence</Badge>
            <h3 className="font-display text-xl text-white mt-1.5">Enthalpies of hydrogenation → cyclohexane</h3>
          </div>
          <span className="text-[11px] text-slate-400">click a species for detail</span>
        </div>

        <div className="rounded-xl border border-white/10 bg-[#080d16]/70 p-1">
          <svg viewBox={'0 0 ' + DW + ' ' + DH} className="w-full h-auto" preserveAspectRatio="xMidYMid meet">
            <defs>
              {[['ene', '#34d399'], ['dien', '#fbbf24'], ['benz', '#22d3ee']].map(m => (
                <marker key={m[0]} id={'ah-' + m[0]} markerWidth="9" markerHeight="9" refX="8" refY="4.5" orient="auto">
                  <path d="M0,0 L9,4.5 L0,9 Z" fill={m[1]} />
                </marker>
              ))}
              <marker id="ah-gap" markerWidth="9" markerHeight="9" refX="8" refY="4.5" orient="auto">
                <path d="M0,0 L9,4.5 L0,9 Z" fill="#fb7185" />
              </marker>
              <marker id="ah-gap2" markerWidth="9" markerHeight="9" refX="1" refY="4.5" orient="auto">
                <path d="M9,0 L0,4.5 L9,9 Z" fill="#fb7185" />
              </marker>
            </defs>

            {/* energy axis */}
            <line x1="52" y1="70" x2="52" y2={BASE} stroke="#475569" strokeWidth="1.4" />
            {[0, 100, 200, 300, 400].map(tick)}
            <text x="18" y="240" fontSize="11.5" fill="#94a3b8" textAnchor="middle"
                  transform="rotate(-90 18 240)">Energy / kJ mol⁻¹</text>

            {/* stabilisation band */}
            {reveal > 1 &&
              <rect x={COLS.benz.cx - 92} y={kekY} width="184" height={Math.max(0, benzY - kekY)}
                    fill="#f43f5e" opacity="0.12" />}

            {/* baseline: the common product */}
            <line x1="52" y1={BASE} x2="760" y2={BASE} stroke="#cbd5e1" strokeWidth="4" strokeLinecap="round" />
            <HexGlyph cx={706} cy={BASE + 30} r={15} colour="#cbd5e1" />
            <text x="52" y={BASE + 26} fontSize="12.5" fill="#e2e8f0" fontWeight="600">cyclohexane</text>
            <text x="52" y={BASE + 41} fontSize="11" fill="#94a3b8">the common product of all four reactions — the shared zero</text>

            {/* Kekulé theoretical guide */}
            <line x1="52" y1={kekY} x2={COLS.benz.cx + 92} y2={kekY} stroke="#fb7185" strokeWidth="2.4"
                  strokeDasharray="9 6" opacity="0.85" />
            <text x="58" y={kekY - 9} fontSize="12" fill="#fda4af" fontWeight="600">
              Kekulé prediction — cyclohexa-1,3,5-triene: 3 × (−120) = −360 kJ mol⁻¹
            </text>
            <g onMouseEnter={() => setFocus('kek')} onClick={() => setFocus('kek')} style={{ cursor: 'pointer' }}>
              <rect x="52" y={kekY - 24} width={COLS.benz.cx + 40} height="26" fill="transparent" />
              <HexGlyph cx={470} cy={kekY - 34} r={15} doubles={[0, 2, 4]} colour="#fb7185" dashed />
            </g>

            {col('ene', yFor(120), [0], false)}
            {col('dien', yFor(240), [0, 2], false)}
            {col('benz', benzY, [], true)}

            {dhArrow('ene', yFor(120), '−120', 'right')}
            {dhArrow('dien', yFor(240), '−240', 'right')}
            {dhArrow('benz', benzY, '−' + Math.round(benzE), 'left')}

            {/* delocalisation energy gap */}
            {reveal > 2 && (
              <g>
                <line x1="668" y1={kekY + 4} x2="668" y2={benzY - 4} stroke="#fb7185" strokeWidth="2"
                      markerEnd="url(#ah-gap)" markerStart="url(#ah-gap2)" />
                <text x="680" y={(kekY + benzY) / 2 - 12} fontSize="11" fill="#fda4af" fontWeight="700">delocalisation</text>
                <text x="680" y={(kekY + benzY) / 2 + 1} fontSize="11" fill="#fda4af" fontWeight="700">energy</text>
                <text x="680" y={(kekY + benzY) / 2 + 17} fontSize="14" fill="#fecdd3" fontWeight="700"
                      fontFamily="JetBrains Mono, monospace">{Math.round(gap)}</text>
                <text x="680" y={(kekY + benzY) / 2 + 30} fontSize="10" fill="#fda4af">kJ mol⁻¹</text>
              </g>
            )}
          </svg>
        </div>

        {/* reveal control */}
        <div className="mt-4 rounded-xl border border-rose-400/25 bg-rose-500/[.07] p-3 sm:p-4">
          <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
            <p className="text-sm font-bold text-rose-200">
              Reveal the stabilisation — drag benzene from its predicted level down to the measured one
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => { if (reveal >= 100) setReveal(0); setPlaying(p => !p); }}
                className="px-3 py-1.5 rounded-lg text-xs font-bold bg-rose-400/20 border border-rose-300/40 text-rose-100 hover:bg-rose-400/30 transition">
                {playing ? '❚❚ Pause' : '▶ Animate'}
              </button>
              <button
                onClick={() => { setPlaying(false); setReveal(0); }}
                className="px-3 py-1.5 rounded-lg text-xs font-bold bg-white/[.06] border border-white/15 text-slate-200 hover:bg-white/[.12] transition">
                Reset
              </button>
            </div>
          </div>
          <input type="range" min="0" max="100" step="0.5" value={reveal}
                 onChange={e => { setPlaying(false); setReveal(parseFloat(e.target.value)); }}
                 className="w-full"
                 style={{ background: 'linear-gradient(90deg,#fb7185 ' + reveal + '%, rgba(148,163,184,.25) ' + reveal + '%)' }} />
          <div className="grid grid-cols-3 gap-2 mt-3 text-center">
            <div className="rounded-xl border border-rose-400/25 bg-black/25 py-2">
              <div className="font-mono text-lg font-bold text-rose-300">−360</div>
              <div className="text-[10px] uppercase tracking-wider text-slate-400">predicted</div>
            </div>
            <div className="rounded-xl border border-cyan-400/30 bg-black/25 py-2">
              <div className="font-mono text-lg font-bold text-cyan-300">−{Math.round(benzE)}</div>
              <div className="text-[10px] uppercase tracking-wider text-slate-400">measured ΔH</div>
            </div>
            <div className="rounded-xl border border-amber-400/30 bg-black/25 py-2">
              <div className="font-mono text-lg font-bold text-amber-300">{Math.round(gap)}</div>
              <div className="text-[10px] uppercase tracking-wider text-slate-400">stabilisation</div>
            </div>
          </div>
          <p className="text-[12.5px] text-slate-300 mt-3 leading-relaxed">
            {reveal < 5
              ? 'At the top, benzene sits where the Kekulé structure predicts. Drag or animate to move it to where it really is.'
              : reveal < 99
                ? 'Benzene is ' + Math.round(gap) + ' kJ mol⁻¹ lower in energy than the Kekulé structure would be — so ' + Math.round(gap) + ' kJ mol⁻¹ less energy is released on hydrogenation.'
                : 'Benzene is 152 kJ mol⁻¹ more stable than cyclohexa-1,3,5-triene would be. Less energy is stored in the molecule to begin with, so less is released — ΔH is less exothermic than predicted.'}
          </p>
        </div>
      </Card>

      <div className="flex flex-col gap-3">
        <Card className="p-4">
          <Badge tone={det.tone}>Selected</Badge>
          <h3 className="font-display text-lg mt-2 mb-1 text-white leading-snug">{det.title}</h3>
          <p className="text-sm text-slate-300 leading-relaxed">{det.body}</p>
        </Card>

        <Card className="p-4">
          <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-slate-400 mb-2">Why this works</p>
          <ol className="space-y-2 text-[13px] text-slate-300 leading-snug list-none">
            {[
              'Every reaction in the diagram makes the same product — cyclohexane. That shared product is the fixed reference point.',
              'A less exothermic ΔH therefore means the reactant started lower in energy.',
              'Cyclohexene (−120) fixes the cost of one isolated C=C; the diene (−240) confirms that isolated double bonds simply add up.',
              'Benzene releases only −208 instead of −360, so it must begin 152 kJ mol⁻¹ lower than three isolated C=C bonds would.',
              'That extra stability comes from delocalising the six π electrons over all six carbons.'
            ].map((t, i) => (
              <li key={i} className="flex gap-2.5">
                <span className="shrink-0 w-5 h-5 rounded-full bg-amber-400/20 text-amber-200 text-[11px] font-bold grid place-items-center border border-amber-300/30">{i + 1}</span>
                <span>{t}</span>
              </li>
            ))}
          </ol>
        </Card>

        <Card className="p-4 border-emerald-400/25">
          <Badge tone="emerald">Exam tip</Badge>
          <p className="text-[13px] text-slate-300 leading-relaxed mt-2">
            Always quote the sign correctly. Benzene's enthalpy of hydrogenation is
            <strong className="text-white"> less exothermic</strong> than predicted (−208 vs −360), which means benzene is
            <strong className="text-white"> more stable</strong>. Writing "lower" without saying lower <em>in energy</em>
            loses marks.
          </p>
        </Card>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════
   SECTION 3 — AQA NOTES + EXAM PRACTICE
   ═══════════════════════════════════════════════════════════════════════ */
const PILLARS = [
  {
    n: 1, tone: 'amber', icon: '🔥', title: 'Thermochemical data',
    lead: 'Enthalpies of hydrogenation show benzene is more stable than the Kekulé model predicts.',
    points: [
      'Cyclohexene + H₂ → cyclohexane, ΔH = −120 kJ mol⁻¹ (one isolated C=C).',
      'Kekulé cyclohexa-1,3,5-triene would therefore give 3 × (−120) = −360 kJ mol⁻¹.',
      'Benzene actually gives only −208 kJ mol⁻¹.',
      'The difference, 360 − 208 = 152 kJ mol⁻¹, is the delocalisation (resonance) energy.',
      'Benzene is 152 kJ mol⁻¹ lower in energy — i.e. more stable — than the Kekulé structure.'
    ],
    ms: 'MS wording: "benzene is more stable / lower in energy than the theoretical Kekulé structure by 152 kJ mol⁻¹, so less energy is released on hydrogenation."'
  },
  {
    n: 2, tone: 'cyan', icon: '📐', title: 'X-ray diffraction data',
    lead: 'Every carbon–carbon bond in benzene is identical and intermediate in length.',
    points: [
      'All six C–C bond lengths are equal at 140 pm.',
      'This lies between a C–C single bond (154 pm) and a C=C double bond (134 pm).',
      'The Kekulé model requires two alternating lengths — this is not observed.',
      'The molecule is planar with all bond angles exactly 120°.',
      'Equal bond lengths mean the π electrons are shared equally around the whole ring.'
    ],
    ms: 'MS wording: "all C–C bonds are the same length (140 pm), between the length of a single and a double bond, so there are no alternating single and double bonds."'
  },
  {
    n: 3, tone: 'violet', icon: '🧪', title: 'Resistance to addition',
    lead: 'Benzene substitutes rather than adds, because addition would destroy the delocalised ring.',
    points: [
      'Benzene does not decolourise bromine water under normal conditions; an alkene does.',
      'It needs a halogen carrier catalyst (e.g. AlCl₃ / FeBr₃) to react with bromine at all.',
      'It then undergoes electrophilic substitution, not electrophilic addition.',
      'Substitution keeps the delocalised π system intact, so the 152 kJ mol⁻¹ of extra stability is retained.',
      'Addition would break the delocalisation and give a less stable, non-aromatic product.'
    ],
    ms: 'MS wording: "the delocalised π system is stable / has lower energy; addition would disrupt (destroy) the delocalisation, so substitution occurs and the ring is preserved."'
  }
];

const MCQ = [
  {
    q: 'X-ray diffraction shows that all six carbon–carbon bonds in benzene are 140 pm long. What does this demonstrate?',
    opts: [
      'Benzene contains three C=C and three C–C bonds arranged alternately',
      'All the C–C bonds are identical, with a length between a single and a double bond',
      'Benzene has a puckered, non-planar ring',
      'The carbon atoms in benzene are joined by single bonds only'
    ],
    a: 1,
    why: 'A single C–C is 154 pm and a C=C is 134 pm. One identical intermediate value of 140 pm rules out alternating single and double bonds and supports delocalisation.'
  },
  {
    q: 'The enthalpy of hydrogenation of cyclohexene is −120 kJ mol⁻¹. What value does the Kekulé structure predict for cyclohexa-1,3,5-triene?',
    opts: ['−120 kJ mol⁻¹', '−208 kJ mol⁻¹', '−360 kJ mol⁻¹', '−152 kJ mol⁻¹'],
    a: 2,
    why: 'Three isolated C=C bonds should each release the same energy as the one in cyclohexene: 3 × (−120) = −360 kJ mol⁻¹.'
  },
  {
    q: 'The measured enthalpy of hydrogenation of benzene is −208 kJ mol⁻¹. Which statement is correct?',
    opts: [
      'Benzene is 152 kJ mol⁻¹ less stable than the Kekulé structure',
      'Benzene is 152 kJ mol⁻¹ more stable than the Kekulé structure',
      'Benzene is 208 kJ mol⁻¹ more stable than cyclohexane',
      'Benzene and the Kekulé structure have identical stabilities'
    ],
    a: 1,
    why: 'Less energy released (208 rather than 360) with the same product means benzene started lower in energy, by 360 − 208 = 152 kJ mol⁻¹.'
  },
  {
    q: 'Why does benzene undergo electrophilic substitution rather than electrophilic addition?',
    opts: [
      'Benzene has no π electrons available to attack an electrophile',
      'Addition is kinetically impossible for any cyclic molecule',
      'Substitution preserves the stable delocalised π system, whereas addition would destroy it',
      'The C–H bonds in benzene are unusually weak'
    ],
    a: 2,
    why: 'Delocalisation gives benzene 152 kJ mol⁻¹ of extra stability. Substitution restores the delocalised ring; addition would permanently break it, so it is energetically unfavourable.'
  },
  {
    q: 'Which statement correctly describes bonding in a benzene molecule?',
    opts: [
      'Each carbon uses all four outer electrons in σ bonds',
      'Each carbon uses three outer electrons in σ bonds; the fourth is in a p orbital that overlaps sideways to form a delocalised π ring',
      'Each carbon has a lone pair that is delocalised around the ring',
      'The π electrons lie in the plane of the ring, between the carbon atoms'
    ],
    a: 1,
    why: 'Each carbon forms σ bonds to two carbons and one hydrogen. The remaining electron sits in an unhybridised p orbital perpendicular to the ring; sideways overlap of all six gives rings of delocalised charge above and below the plane.'
  }
];

const MARKSCHEME = [
  'Benzene has a ring of delocalised π electrons above and below the plane of the ring (all six C–C bonds equal at 140 pm).',
  'Delocalisation makes benzene more stable / lower in energy than the theoretical Kekulé structure, so addition is avoided because it would destroy the delocalised system — substitution keeps the ring intact.',
  'Hydrogenation of benzene releases only 208 kJ mol⁻¹, compared with the 360 kJ mol⁻¹ predicted from 3 × cyclohexene (−120 kJ mol⁻¹).',
  'The difference of 152 kJ mol⁻¹ is the delocalisation energy: benzene begins 152 kJ mol⁻¹ lower in energy, so less energy is released.'
];

function Notes() {
  return (
    <div className="space-y-4 fadein">
      <Card className="p-4">
        <Badge tone="slate">AQA 3.3.10 · Aromatic chemistry</Badge>
        <h3 className="font-display text-2xl text-white mt-2 mb-1">Three pillars of evidence for delocalisation</h3>
        <p className="text-sm text-slate-300 leading-relaxed max-w-3xl">
          AQA mark schemes accept evidence from three areas. A full-mark answer normally quotes at least two of them
          with numbers attached. Learn the figures — <span className="font-mono text-cyan-300">140 pm</span>,
          <span className="font-mono text-rose-300"> −360</span>,
          <span className="font-mono text-cyan-300"> −208</span> and
          <span className="font-mono text-amber-300"> 152 kJ mol⁻¹</span> — because unquantified answers are usually capped.
        </p>
      </Card>

      <div className="grid lg:grid-cols-3 gap-4">
        {PILLARS.map(p => (
          <Card key={p.n} className="p-4 flex flex-col">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-xl">{p.icon}</span>
              <Badge tone={p.tone}>Pillar {p.n}</Badge>
            </div>
            <h4 className="font-display text-lg text-white leading-snug">{p.title}</h4>
            <p className="text-[13px] text-slate-300 mt-1 mb-3 leading-snug">{p.lead}</p>
            <ul className="space-y-1.5 flex-1">
              {p.points.map((t, i) => (
                <li key={i} className="flex gap-2 text-[13px] text-slate-300 leading-snug">
                  <span className="text-cyan-400 mt-[2px] shrink-0">▸</span><span>{t}</span>
                </li>
              ))}
            </ul>
            <p className="mt-3 rounded-lg border border-white/10 bg-black/25 p-2.5 text-[12px] text-slate-300 italic leading-snug">
              {p.ms}
            </p>
          </Card>
        ))}
      </div>

      <Card className="p-4">
        <Badge tone="emerald">Quick recall table</Badge>
        <div className="overflow-x-auto mt-3">
          <table className="w-full text-[13px] border-collapse min-w-[640px]">
            <thead>
              <tr className="text-left text-slate-400 border-b border-white/10">
                <th className="py-2 pr-3 font-semibold">Observation</th>
                <th className="py-2 pr-3 font-semibold">Kekulé model predicts</th>
                <th className="py-2 font-semibold">Actually observed</th>
              </tr>
            </thead>
            <tbody className="text-slate-300">
              {[
                ['C–C bond lengths', 'Two values: 134 pm and 154 pm', 'One value: 140 pm for all six bonds'],
                ['Enthalpy of hydrogenation', '−360 kJ mol⁻¹', '−208 kJ mol⁻¹ (152 less exothermic)'],
                ['Reaction with bromine water', 'Decolourised rapidly by addition', 'No reaction without a halogen carrier'],
                ['Typical reaction', 'Electrophilic addition', 'Electrophilic substitution'],
                ['Shape', 'Planar but irregular hexagon', 'Planar, regular hexagon, all angles 120°']
              ].map((r, i) => (
                <tr key={i} className="border-b border-white/5">
                  <td className="py-2 pr-3 font-semibold text-slate-200">{r[0]}</td>
                  <td className="py-2 pr-3 text-rose-200/90">{r[1]}</td>
                  <td className="py-2 text-cyan-200/90">{r[2]}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}

function Quiz() {
  const [picked, setPicked] = useState({});
  const [checked, setChecked] = useState(false);
  const [answer, setAnswer] = useState('');
  const [showMS, setShowMS] = useState(false);
  const [ticks, setTicks] = useState([false, false, false, false]);

  const score = MCQ.reduce((s, q, i) => s + (picked[i] === q.a ? 1 : 0), 0);
  const done = Object.keys(picked).length === MCQ.length;
  const selfScore = ticks.filter(Boolean).length;
  const band = selfScore === 4 ? ['emerald', 'Full marks — every AQA marking point is present.']
    : selfScore === 3 ? ['cyan', 'Strong answer. Add the missing point to secure all four marks.']
    : selfScore === 2 ? ['amber', 'Half marks. You are missing either the structural reason or the numerical evidence.']
    : ['rose', 'Not yet. Re-read the three pillars, then rewrite the answer using the numbers.'];

  return (
    <div className="space-y-4 fadein">
      <Card className="p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <Badge tone="violet">Part A · Multiple choice</Badge>
            <h3 className="font-display text-xl text-white mt-1.5">Five questions on structure and delocalisation</h3>
          </div>
          {checked &&
            <div className={'rounded-xl px-4 py-2 border text-center ' +
              (score >= 4 ? 'border-emerald-400/40 bg-emerald-400/10' : score >= 3 ? 'border-amber-400/40 bg-amber-400/10' : 'border-rose-400/40 bg-rose-400/10')}>
              <div className="font-mono text-2xl font-bold text-white">{score}<span className="text-slate-400 text-base">/5</span></div>
              <div className="text-[10px] uppercase tracking-wider text-slate-400">score</div>
            </div>}
        </div>
      </Card>

      {MCQ.map((q, qi) => (
        <Card key={qi} className="p-4">
          <p className="text-[13px] font-bold text-slate-100 mb-3">
            <span className="text-cyan-400 font-mono mr-2">Q{qi + 1}</span>{q.q}
          </p>
          <div className="grid sm:grid-cols-2 gap-2">
            {q.opts.map((o, oi) => {
              const sel = picked[qi] === oi;
              let cls = 'border-white/10 bg-white/[.03] hover:bg-white/[.08] text-slate-300';
              if (checked && oi === q.a) cls = 'border-emerald-400/50 bg-emerald-400/15 text-emerald-100';
              else if (checked && sel) cls = 'border-rose-400/50 bg-rose-400/15 text-rose-100';
              else if (sel) cls = 'border-cyan-400/50 bg-cyan-400/15 text-cyan-100';
              return (
                <button key={oi} disabled={checked}
                  onClick={() => setPicked(p => Object.assign({}, p, { [qi]: oi }))}
                  className={'text-left rounded-xl border px-3 py-2.5 text-[13px] leading-snug transition ' + cls}>
                  <span className="font-mono font-bold mr-2 opacity-70">{'ABCD'[oi]}</span>{o}
                  {checked && oi === q.a && <span className="ml-2">✓</span>}
                </button>
              );
            })}
          </div>
          {checked &&
            <p className="mt-3 rounded-lg border border-cyan-400/20 bg-cyan-400/[.07] p-3 text-[12.5px] text-slate-200 leading-relaxed">
              <strong className="text-cyan-300">Why: </strong>{q.why}
            </p>}
        </Card>
      ))}

      <div className="flex flex-wrap gap-2">
        <button disabled={!done || checked} onClick={() => setChecked(true)}
          className={'px-4 py-2.5 rounded-xl font-bold text-sm transition border ' +
            (!done || checked ? 'bg-white/[.03] border-white/10 text-slate-500 cursor-not-allowed'
                              : 'bg-cyan-400/20 border-cyan-300/50 text-cyan-100 hover:bg-cyan-400/30')}>
          {checked ? 'Answers shown' : done ? 'Check my answers' : 'Answer all 5 to check (' + Object.keys(picked).length + '/5)'}
        </button>
        <button onClick={() => { setPicked({}); setChecked(false); }}
          className="px-4 py-2.5 rounded-xl font-bold text-sm bg-white/[.05] border border-white/15 text-slate-200 hover:bg-white/[.1] transition">
          Reset part A
        </button>
      </div>

      <Card className="p-4 border-amber-400/25">
        <Badge tone="amber">Part B · Structured question · 4 marks</Badge>
        <p className="text-[14px] font-semibold text-white mt-2.5 leading-snug">
          Explain why benzene undergoes substitution rather than addition reactions, and why its enthalpy of
          hydrogenation is less exothermic than expected.
        </p>
        <p className="text-[12px] text-slate-400 mt-1">Use data in your answer. <span className="font-mono">[4 marks]</span></p>
        <textarea value={answer} onChange={e => setAnswer(e.target.value)} rows="7"
          placeholder="Write your full answer here before revealing the mark scheme…"
          className="mt-3 w-full rounded-xl bg-black/35 border border-white/12 p-3 text-[13.5px] text-slate-100 leading-relaxed outline-none focus:border-amber-300/50 resize-y" />
        <div className="flex flex-wrap items-center gap-2 mt-2">
          <button onClick={() => setShowMS(s => !s)}
            className="px-4 py-2 rounded-xl font-bold text-sm bg-amber-400/20 border border-amber-300/45 text-amber-100 hover:bg-amber-400/30 transition">
            {showMS ? 'Hide mark scheme' : 'Reveal mark scheme & self-assess'}
          </button>
          <span className="text-[11px] text-slate-500 font-mono">
            {answer.trim() ? answer.trim().split(/\s+/).length : 0} words
          </span>
        </div>

        {showMS && (
          <div className="mt-4 fadein">
            <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-slate-400 mb-2">
              Tick each marking point your answer actually contains
            </p>
            <div className="space-y-2">
              {MARKSCHEME.map((m, i) => (
                <button key={i}
                  onClick={() => setTicks(t => t.map((v, j) => j === i ? !v : v))}
                  className={'w-full flex gap-3 text-left rounded-xl border px-3 py-2.5 transition ' +
                    (ticks[i] ? 'border-emerald-400/45 bg-emerald-400/12' : 'border-white/10 bg-white/[.03] hover:bg-white/[.07]')}>
                  <span className={'shrink-0 mt-[1px] w-5 h-5 rounded-md grid place-items-center text-[12px] font-bold border ' +
                    (ticks[i] ? 'bg-emerald-400 text-emerald-950 border-emerald-300' : 'border-white/25 text-transparent')}>✓</span>
                  <span className="text-[13px] text-slate-200 leading-snug">
                    <span className="font-mono text-[11px] text-slate-400 mr-2">M{i + 1}</span>{m}
                  </span>
                </button>
              ))}
            </div>
            <div className={'mt-3 rounded-xl border p-3 flex items-center gap-4 ' +
              (band[0] === 'emerald' ? 'border-emerald-400/40 bg-emerald-400/10'
                : band[0] === 'cyan' ? 'border-cyan-400/40 bg-cyan-400/10'
                : band[0] === 'amber' ? 'border-amber-400/40 bg-amber-400/10'
                : 'border-rose-400/40 bg-rose-400/10')}>
              <div className="font-mono text-3xl font-bold text-white">
                {selfScore}<span className="text-slate-400 text-lg">/4</span>
              </div>
              <p className="text-[13px] text-slate-200 leading-snug">{band[1]}</p>
            </div>
            <p className="mt-3 text-[12.5px] text-slate-400 leading-relaxed">
              <strong className="text-slate-300">Examiner note:</strong> the two halves of the question need different
              evidence. The substitution half needs the <em>stability of the delocalised ring</em>; the enthalpy half
              needs the <em>numbers</em> −360, −208 and 152 kJ mol⁻¹. Answers that describe delocalisation without
              quoting data rarely score more than 2.
            </p>
          </div>
        )}
      </Card>
    </div>
  );
}

function TabNotes() {
  const [pane, setPane] = useState('notes');
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        <Seg active={pane === 'notes'} onClick={() => setPane('notes')}>📖 Evidence notes</Seg>
        <Seg active={pane === 'quiz'} onClick={() => setPane('quiz')}>✍️ Exam practice</Seg>
      </div>
      {pane === 'notes' ? <Notes /> : <Quiz />}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════
   APP SHELL
   ═══════════════════════════════════════════════════════════════════════ */
const TABS = [
  { id: '3d',     icon: '🧪', label: '3D structural comparison', short: '3D model' },
  { id: 'energy', icon: '📉', label: 'Hydrogenation energy diagram', short: 'Energy' },
  { id: 'notes',  icon: '📚', label: 'Mark scheme notes & practice', short: 'Notes' }
];

function App() {
  const [tab, setTab] = useState('3d');
  const noThree = typeof THREE === 'undefined';

  return (
    <div className="min-h-full">
      <header className="border-b border-white/10 bg-black/25 backdrop-blur-xl sticky top-0 z-20">
        <div className="max-w-[1400px] mx-auto px-4 sm:px-6 py-3">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 shrink-0 rounded-xl grid place-items-center border border-cyan-300/30 bg-cyan-400/10">
                <svg viewBox="0 0 40 40" className="w-7 h-7">
                  <polygon points="20,5 33,12.5 33,27.5 20,35 7,27.5 7,12.5" fill="none" stroke="#22d3ee" strokeWidth="2.4" strokeLinejoin="round" />
                  <circle cx="20" cy="20" r="7.5" fill="none" stroke="#22d3ee" strokeWidth="2.4" opacity="0.85" />
                </svg>
              </div>
              <div>
                <h1 className="font-display text-xl sm:text-2xl text-white leading-tight tracking-wide">
                  Benzene — Structure &amp; Delocalisation
                </h1>
                <p className="text-[12px] text-slate-400 leading-tight">
                  AQA A-level Chemistry · 3.3.10 Aromatic chemistry
                </p>
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              <Badge tone="cyan">140 pm</Badge>
              <Badge tone="rose">−360 predicted</Badge>
              <Badge tone="amber">152 kJ mol⁻¹</Badge>
            </div>
          </div>

          <nav className="flex gap-2 mt-3 overflow-x-auto pb-0.5">
            {TABS.map(t => (
              <button key={t.id} onClick={() => setTab(t.id)}
                className={'shrink-0 px-4 py-2.5 rounded-t-xl text-sm font-semibold border-b-2 transition ' +
                  (tab === t.id
                    ? 'border-cyan-400 text-white bg-white/[.06]'
                    : 'border-transparent text-slate-400 hover:text-slate-200 hover:bg-white/[.03]')}>
                <span className="mr-1.5">{t.icon}</span>
                <span className="hidden sm:inline">{t.label}</span>
                <span className="sm:hidden">{t.short}</span>
              </button>
            ))}
          </nav>
        </div>
      </header>

      <main className="max-w-[1400px] mx-auto px-4 sm:px-6 py-5">
        {tab === '3d' && (noThree
          ? <Card className="p-6 text-center text-slate-300">
              <p className="font-display text-lg text-white mb-1">3D viewer unavailable</p>
              <p className="text-sm">Three.js did not load, so WebGL rendering is unavailable. Check that the <span className="font-mono">lib</span> folder sits next to <span className="font-mono">index.html</span>, then reload. The other two tabs are unaffected.</p>
            </Card>
          : <Tab3D />)}
        {tab === 'energy' && <TabEnergy />}
        {tab === 'notes' && <TabNotes />}
      </main>

      <footer className="max-w-[1400px] mx-auto px-4 sm:px-6 pb-8 pt-2">
        <p className="text-[11.5px] text-slate-500 leading-relaxed">
          Bond lengths and enthalpy values follow the standard AQA specification data (C–C 154 pm, C=C 134 pm,
          benzene 140 pm; ΔH<sub>hyd</sub> cyclohexene −120, benzene −208 kJ mol⁻¹). Values are rounded as they appear
          in AQA mark schemes.
        </p>
      </footer>
    </div>
  );
}

ReactDOM.createRoot(document.getElementById('root')).render(<App />);
