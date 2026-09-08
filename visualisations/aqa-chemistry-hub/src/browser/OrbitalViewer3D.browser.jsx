/* ------------------------------------------------------------------ *
 * AQA A-Level Chemistry 7405 — 3.1.1.2 Atomic orbitals
 * BROWSER BUILD. Same physics, colours and copy as ../OrbitalViewer3D.jsx,
 * but written against plain three.js (r128 UMD) instead of react-three-fiber,
 * because R3F ships ESM only and the site vendors its libraries as scripts.
 * Keep the two in step when either changes.
 * ------------------------------------------------------------------ */

const ORBITALS = {
  '1s': { kind: 's', rMax: 8, extent: 3.5, radial: (r) => Math.exp(-r), label: '1s' },
  '2s': { kind: 's', rMax: 16, extent: 10, radial: (r) => (2 - r) * Math.exp(-r / 2), label: '2s' },
  '3s': { kind: 's', rMax: 30, extent: 20, radial: (r) => (27 - 18 * r + 2 * r * r) * Math.exp(-r / 3), label: '3s' },
  '2px': { kind: 'p', axis: 0, rMax: 13, extent: 9, radial: (r) => r * Math.exp(-r / 2), label: '2px' },
  '2py': { kind: 'p', axis: 1, rMax: 13, extent: 9, radial: (r) => r * Math.exp(-r / 2), label: '2py' },
  '2pz': { kind: 'p', axis: 2, rMax: 13, extent: 9, radial: (r) => r * Math.exp(-r / 2), label: '2pz' },
};
const PHASE_COLOURS = ['#f43f5e', '#38bdf8'];                                  // + lobe / − lobe
const MERGED_COLOURS = { 0: '#3b82f6', 1: '#22c55e', 2: '#ef4444' };          // px / py / pz
const S_COLOURS = ['#dc2626', '#fbbf24'];                                     // ψ + / ψ − (radial node)
const NODAL_PLANE = { 0: 'the yz-plane', 1: 'the xz-plane', 2: 'the xy-plane' };
const AXIS_NAME = { 0: 'x', 1: 'y', 2: 'z' };
const GRID_STEPS = 800;

function radialCdf(radial, rMax) {
  const cdf = new Float64Array(GRID_STEPS + 1), dr = rMax / GRID_STEPS;
  let total = 0;
  for (let i = 1; i <= GRID_STEPS; i += 1) { const r = i * dr, R = radial(r); total += r * r * R * R * dr; cdf[i] = total; }
  for (let i = 0; i <= GRID_STEPS; i += 1) cdf[i] /= total;
  return { cdf, dr };
}

/** Radius enclosing fraction p of the electron density — the boundary surface. */
function boundaryRadius(radial, rMax, p) {
  const { cdf, dr } = radialCdf(radial, rMax);
  for (let i = 0; i <= GRID_STEPS; i += 1) if (cdf[i] >= p) return i * dr;
  return rMax;
}

function radialSampler(radial, rMax) {
  const { cdf, dr } = radialCdf(radial, rMax);
  return () => {
    const u = Math.random();
    let lo = 0, hi = GRID_STEPS;
    while (lo < hi) { const mid = (lo + hi) >> 1; if (cdf[mid] < u) lo = mid + 1; else hi = mid; }
    return lo * dr;
  };
}
const hexToRgb = (hex) => { const v = parseInt(hex.slice(1), 16); return [((v >> 16) & 255) / 255, ((v >> 8) & 255) / 255, (v & 255) / 255]; };

function buildCloud(key, count, palette) {
  const orb = ORBITALS[key], sampleR = radialSampler(orb.radial, orb.rMax);
  const positions = new Float32Array(count * 3), colors = new Float32Array(count * 3);
  const [cA, cB] = palette || (orb.kind === 'p' ? PHASE_COLOURS : S_COLOURS);
  const tint = [hexToRgb(cA), hexToRgb(cB)];
  for (let i = 0; i < count; i += 1) {
    const r = sampleR();
    let ux, uy, uz;
    for (;;) {
      const cosT = 2 * Math.random() - 1, phi = 2 * Math.PI * Math.random(), sinT = Math.sqrt(1 - cosT * cosT);
      ux = sinT * Math.cos(phi); uy = sinT * Math.sin(phi); uz = cosT;
      if (orb.kind !== 'p') break;
      const c = [ux, uy, uz][orb.axis];
      if (Math.random() < c * c) break;
    }
    const px = ux * r, py = uy * r, pz = uz * r;
    positions[i * 3] = px; positions[i * 3 + 1] = py; positions[i * 3 + 2] = pz;
    const sign = orb.kind === 'p' ? [px, py, pz][orb.axis] >= 0 : orb.radial(r) >= 0;
    colors.set(tint[sign ? 0 : 1], i * 3);
  }
  return { positions, colors };
}

/**
 * One lobe of the traditional dumb-bell: the polar profile r(θ) = L·cos^k θ
 * lathed about its axis, so the lobe narrows to the nucleus exactly as it is
 * drawn in a textbook. k > 1 narrows it from two tangent spheres into the
 * elongated shape drawn in textbooks.
 */
function lobeGeometry(length) {
  const K = 1.5, N = 48, pts = [];
  for (let i = 0; i <= N; i += 1) {
    const t = (i / N) * (Math.PI / 2);
    const r = length * Math.pow(Math.cos(t), K);
    pts.push(new THREE.Vector2(Math.max(1e-4, r * Math.sin(t)), r * Math.cos(t)));
  }
  return new THREE.LatheGeometry(pts, 48);
}

const surfaceMaterial = (colour) => new THREE.MeshPhongMaterial({
  color: colour, transparent: true, opacity: 0.32, shininess: 40,
  side: THREE.DoubleSide, depthWrite: false,
});

/** The shape a student draws: sphere for s, two lobes for p. Units of a0. */
function buildSurface(key, palette) {
  const orb = ORBITALS[key];
  const group = new THREE.Group();
  const r90 = boundaryRadius(orb.radial, orb.rMax, 0.9);
  const [cA, cB] = palette || (orb.kind === 'p' ? PHASE_COLOURS : S_COLOURS);

  if (orb.kind === 's') {
    group.add(new THREE.Mesh(new THREE.SphereGeometry(r90, 48, 32), surfaceMaterial(cA)));
  } else {
    const geom = lobeGeometry(r90);
    const plus = new THREE.Mesh(geom, surfaceMaterial(cA));
    const minus = new THREE.Mesh(geom, surfaceMaterial(cB));
    minus.scale.y = -1;
    group.add(plus, minus);
    // the lathe builds along +y — turn it onto this orbital's axis
    if (orb.axis === 2) group.rotation.x = Math.PI / 2;
    else if (orb.axis === 0) group.rotation.z = -Math.PI / 2;
  }
  return group;
}

function axisSprite(text, colour) {
  const c = document.createElement('canvas');
  c.width = 64; c.height = 64;
  const g = c.getContext('2d');
  g.fillStyle = 'rgba(255,255,255,0.8)'; g.beginPath(); g.arc(32, 32, 26, 0, 7); g.fill();
  g.fillStyle = colour; g.font = 'bold 40px system-ui, sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle';
  g.fillText(text, 32, 34);
  const sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: new THREE.CanvasTexture(c), depthTest: false }));
  sprite.scale.set(0.9, 0.9, 1);
  return sprite;
}

const MODES = [
  { id: '1s', group: 's' }, { id: '2s', group: 's' }, { id: '3s', group: 's' },
  { id: '2px', group: 'p' }, { id: '2py', group: 'p' }, { id: '2pz', group: 'p' }, { id: 'merged', group: 'p' },
];
const DENSITIES = [{ label: 'Light', value: 3000 }, { label: 'Medium', value: 7000 }, { label: 'Dense', value: 14000 }];

function OrbitalViewer3D() {
  const mountRef = useRef(null);
  const sceneRef = useRef(null);
  const [mode, setMode] = useState('2pz');
  const [shellSize, setShellSize] = useState(1);
  const [count, setCount] = useState(7000);
  const [showPlane, setShowPlane] = useState(true);
  const [view, setView] = useState('both');   // cloud | shape | both

  const merged = mode === 'merged';
  const orb = merged ? ORBITALS['2pz'] : ORBITALS[mode];
  // One world unit ≈ 4 a0 at scale 1, shared by every orbital, so 1s → 3s
  // genuinely grows against the axes. `span` is how big this orbital actually is.
  const worldScale = 0.24 * shellSize;
  const span = orb.extent * worldScale;
  const axisLength = span * 0.95;
  const pointSize = Math.max(0.04, 0.03 * span);
  const spanRef = useRef(span);
  spanRef.current = span;

  // scene set-up (once)
  useEffect(() => {
    const mount = mountRef.current;
    const scene = new THREE.Scene();
    scene.background = new THREE.Color('#020617');
    const camera = new THREE.PerspectiveCamera(45, mount.clientWidth / mount.clientHeight, 0.1, 500);
    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
    renderer.setSize(mount.clientWidth, mount.clientHeight);
    mount.appendChild(renderer.domElement);

    const cloudGroup = new THREE.Group();
    const axisGroup = new THREE.Group();
    const planeGroup = new THREE.Group();
    const shapeGroup = new THREE.Group();
    scene.add(cloudGroup, axisGroup, planeGroup, shapeGroup);
    scene.add(new THREE.AmbientLight(0xffffff, 0.55));
    const key = new THREE.DirectionalLight(0xffffff, 0.85);
    key.position.set(6, 9, 7);
    scene.add(key);

    // minimal orbit controls
    const state = { theta: 0.9, phi: 1.1, radius: 9, dragging: false, lx: 0, ly: 0 };
    const applyCamera = () => {
      camera.position.set(
        state.radius * Math.sin(state.phi) * Math.sin(state.theta),
        state.radius * Math.cos(state.phi),
        state.radius * Math.sin(state.phi) * Math.cos(state.theta),
      );
      camera.lookAt(0, 0, 0);
    };
    const down = (e) => { state.dragging = true; state.lx = e.clientX; state.ly = e.clientY; };
    const move = (e) => {
      if (!state.dragging) return;
      state.theta -= (e.clientX - state.lx) * 0.008;
      state.phi = Math.min(Math.PI - 0.05, Math.max(0.05, state.phi - (e.clientY - state.ly) * 0.008));
      state.lx = e.clientX; state.ly = e.clientY; applyCamera();
    };
    const up = () => { state.dragging = false; };
    const wheel = (e) => { e.preventDefault(); state.radius = Math.min(60, Math.max(4, state.radius * (1 + Math.sign(e.deltaY) * 0.1))); applyCamera(); };
    renderer.domElement.addEventListener('pointerdown', down);
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', up);
    renderer.domElement.addEventListener('wheel', wheel, { passive: false });

    applyCamera();
    let raf;
    const loop = () => { renderer.render(scene, camera); raf = requestAnimationFrame(loop); };
    loop();

    // The Tailwind CDN applies h-[28rem] after mount, so the box can still be
    // 0px high here — size the renderer from a ResizeObserver instead.
    const resize = () => {
      const w = mount.clientWidth, h = mount.clientHeight;
      if (!w || !h) return;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };
    const ro = new ResizeObserver(resize);
    ro.observe(mount);
    resize();
    sceneRef.current = { scene, cloudGroup, axisGroup, planeGroup, shapeGroup, renderer, cam: state, applyCamera };

    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', up);
      renderer.dispose();
      mount.removeChild(renderer.domElement);
    };
  }, []);

  // frame the camera on the selected orbital (angles are left alone)
  useEffect(() => {
    const ctx = sceneRef.current;
    if (!ctx) return;
    ctx.cam.radius = Math.min(60, Math.max(2, spanRef.current * 3.3));
    ctx.applyCamera();
  }, [mode, merged]);

  // clouds — rebuilt only when the orbital or the density changes
  useEffect(() => {
    const ctx = sceneRef.current;
    if (!ctx) return;
    const keys = merged ? ['2px', '2py', '2pz'] : [mode];
    const n = merged ? Math.round(count * 0.6) : count;
    ctx.cloudGroup.clear();
    if (view === 'shape') return;
    for (const k of keys) {
      const one = MERGED_COLOURS[ORBITALS[k].axis];
      const { positions, colors } = buildCloud(k, n, merged ? [one, one] : null);
      const geom = new THREE.BufferGeometry();
      geom.setAttribute('position', new THREE.BufferAttribute(positions, 3));
      geom.setAttribute('color', new THREE.BufferAttribute(colors, 3));
      ctx.cloudGroup.add(new THREE.Points(geom, new THREE.PointsMaterial({
        vertexColors: true, size: 0.09, sizeAttenuation: true, transparent: true, opacity: 0.75, depthWrite: false,
      })));
    }
  }, [mode, count, merged, view]);

  // traditional boundary surfaces, sharing the cloud's origin
  useEffect(() => {
    const ctx = sceneRef.current;
    if (!ctx) return;
    ctx.shapeGroup.clear();
    if (view === 'cloud') return;
    const keys = merged ? ['2px', '2py', '2pz'] : [mode];
    for (const k of keys) {
      const one = MERGED_COLOURS[ORBITALS[k].axis];
      ctx.shapeGroup.add(buildSurface(k, merged ? [one, one] : null));
    }
  }, [mode, merged, view]);

  // scale, axes and nodal plane — cheap updates, no resampling
  useEffect(() => {
    const ctx = sceneRef.current;
    if (!ctx) return;
    ctx.cloudGroup.scale.setScalar(worldScale);
    ctx.shapeGroup.scale.setScalar(worldScale);
    ctx.cloudGroup.children.forEach((pts) => { pts.material.size = pointSize; });

    ctx.axisGroup.clear();
    [[[1,0,0],'#ef4444','x'], [[0,1,0],'#22c55e','y'], [[0,0,1],'#3b82f6','z']].forEach(([dir, colour, label]) => {
      const a = new THREE.Vector3(...dir).multiplyScalar(axisLength);
      const b = a.clone().negate();
      const geom = new THREE.BufferGeometry().setFromPoints([b, a]);
      ctx.axisGroup.add(new THREE.Line(geom, new THREE.LineBasicMaterial({ color: colour })));
      const sprite = axisSprite(label, colour);
      sprite.position.copy(a).multiplyScalar(1.08);
      ctx.axisGroup.add(sprite);
    });

    ctx.planeGroup.clear();
    if (orb.kind === 'p' && !merged && showPlane) {
      const mesh = new THREE.Mesh(
        new THREE.PlaneGeometry(axisLength * 1.8, axisLength * 1.8),
        new THREE.MeshBasicMaterial({ color: '#7c3aed', transparent: true, opacity: 0.14, side: THREE.DoubleSide, depthWrite: false }),
      );
      if (orb.axis === 2) mesh.rotation.x = -Math.PI / 2;
      else if (orb.axis === 0) mesh.rotation.y = Math.PI / 2;
      ctx.planeGroup.add(mesh);
    }
  }, [worldScale, pointSize, axisLength, orb, merged, showPlane]);

  const btn = (on) => `rounded-lg border px-3 py-2 text-sm font-semibold transition ${on ? 'border-red-600 bg-red-600 text-white' : 'border-slate-300 bg-white text-slate-700 hover:border-red-400'}`;

  return (
    <div className="grid gap-5 lg:grid-cols-[1fr_20rem]">
      <div className="space-y-4">
        <div className="flex flex-wrap items-end gap-4 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="flex flex-col gap-1 text-xs font-semibold uppercase tracking-wide text-slate-500">
            s orbitals
            <div className="flex gap-1.5">
              {MODES.filter((m) => m.group === 's').map((m) => (
                <button key={m.id} type="button" onClick={() => setMode(m.id)} className={btn(mode === m.id)}>{m.id}</button>
              ))}
            </div>
          </div>
          <div className="flex flex-col gap-1 text-xs font-semibold uppercase tracking-wide text-slate-500">
            2p orbitals
            <div className="flex gap-1.5">
              {MODES.filter((m) => m.group === 'p').map((m) => (
                <button key={m.id} type="button" onClick={() => setMode(m.id)} className={btn(mode === m.id)}>
                  {m.id === 'merged' ? 'all 3' : ORBITALS[m.id].label}
                </button>
              ))}
            </div>
          </div>
          <label className="flex min-w-[11rem] flex-col gap-1 text-xs font-semibold uppercase tracking-wide text-slate-500">
            Shell size ×{shellSize.toFixed(2)}
            <input type="range" min="0.4" max="2" step="0.05" value={shellSize}
              onChange={(e) => setShellSize(Number(e.target.value))} className="accent-red-600" />
          </label>
          <div className="flex flex-col gap-1 text-xs font-semibold uppercase tracking-wide text-slate-500">
            Show
            <div className="flex overflow-hidden rounded-lg border border-slate-300">
              {[['Cloud', 'cloud'], ['Shape', 'shape'], ['Both', 'both']].map(([label, val]) => (
                <button key={val} type="button" onClick={() => setView(val)}
                  className={`px-3 py-2 text-sm font-semibold transition ${view === val ? 'bg-red-600 text-white' : 'bg-white text-slate-600 hover:bg-slate-50'}`}>
                  {label}
                </button>
              ))}
            </div>
          </div>

          <div className="flex flex-col gap-1 text-xs font-semibold uppercase tracking-wide text-slate-500">
            Cloud density
            <div className="flex gap-1.5">
              {DENSITIES.map((d) => (
                <button key={d.value} type="button" onClick={() => setCount(d.value)} disabled={view === 'shape'}
                  className={`rounded-lg border px-3 py-2 text-sm font-semibold transition disabled:opacity-40 ${count === d.value ? 'border-slate-800 bg-slate-800 text-white' : 'border-slate-300 bg-white text-slate-700 hover:border-slate-500'}`}>
                  {d.label}
                </button>
              ))}
            </div>
          </div>
          {orb.kind === 'p' && !merged && (
            <label className="flex items-center gap-2 text-sm font-semibold text-slate-700">
              <input type="checkbox" checked={showPlane} onChange={(e) => setShowPlane(e.target.checked)} className="h-4 w-4 accent-purple-600" />
              Show nodal plane
            </label>
          )}
        </div>

        <div ref={mountRef} className="h-[28rem] overflow-hidden rounded-xl border border-slate-200 bg-slate-950 shadow-sm" />
        <p className="text-xs text-slate-500">
          Drag to rotate · scroll to zoom. Each dot is one possible position of the electron, so where the
          dots are dense the electron is more likely to be found. The solid shape is the <b>90% boundary
          surface</b> — the sphere or dumb-bell you draw in an exam — sharing the same origin, so you can
          see how much of the cloud it encloses. The two colours mark the two halves of the wave that are
          out of phase with each other; in “all 3” each colour is one orbital.
        </p>
      </div>

      <div className="space-y-4">
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <p className="text-xs font-bold uppercase tracking-wide text-slate-500">Now showing</p>
          <p className="mt-1 text-lg font-black text-slate-900">{merged ? '2px + 2py + 2pz' : orb.label}</p>
          <p className="mt-1 text-sm text-slate-600">
            {orb.kind === 's'
              ? 'Spherical — the electron density is the same in every direction, so an s orbital has no nodal plane through the nucleus.'
              : merged
                ? 'Three dumb-bells at right angles along x, y and z. Together they make up the 2p sub-level, which holds a maximum of 6 electrons.'
                : `A dumb-bell along the ${AXIS_NAME[orb.axis]}-axis, with one nodal plane (${NODAL_PLANE[orb.axis]}) through the nucleus where the electron is never found.`}
          </p>
        </div>
        <div className="rounded-xl border-l-4 border-purple-500 bg-purple-50 p-4">
          <p className="text-xs font-black uppercase tracking-wide text-purple-800">AQA definitions</p>
          <ul className="mt-2 space-y-2 text-sm leading-snug text-purple-900">
            <li><b>Orbital:</b> a region of space around the nucleus that can hold up to <b>two electrons, with opposite spins</b>.</li>
            <li><b>Capacities:</b> an s sub-level is a single orbital holding <b>2</b> electrons; a p sub-level is three orbitals (px, py, pz) holding <b>6</b> electrons in total.</li>
            <li><b>Shapes:</b> s orbitals are <b>spherical</b>; p orbitals are <b>dumb-bell shaped</b>, pointing along the x, y and z axes, at 90° to each other.</li>
            <li><b>Nodal plane:</b> every p orbital has <b>one</b> plane through the nucleus on which the probability of finding the electron is zero — that is what separates the two lobes.</li>
            <li><b>Size:</b> orbitals with a higher principal shell number are larger and, on average, hold the electron further from the nucleus (compare 1s, 2s and 3s above).</li>
            <li><b>Why the drawn shape is a boundary:</b> the electron has no edge — the sphere or dumb-bell you draw is simply the surface inside which the electron is found about <b>90%</b> of the time. Switch between “Cloud”, “Shape” and “Both” to see the two pictures of the same orbital.</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
