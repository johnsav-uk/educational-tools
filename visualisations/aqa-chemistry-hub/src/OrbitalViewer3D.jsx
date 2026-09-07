import { useEffect, useMemo, useState } from 'react';
import { Canvas, useThree } from '@react-three/fiber';
import { Html, Line, OrbitControls } from '@react-three/drei';
import { DoubleSide, Vector2 } from 'three';

/* ------------------------------------------------------------------ *
 * AQA A-Level Chemistry 7405 — 3.1.1.2 Atomic orbitals
 * Scope: s orbitals (spherical) and 2p orbitals (dumb-bell) only.
 * Deliberately excluded: quantum numbers (n, l, m) and d-orbital shapes.
 *
 * Clouds are sampled from the hydrogen-like radial functions with a0 = 1,
 * so a dot marks a position where the electron is likely to be found —
 * the density of dots IS |ψ|².
 *
 *   rMax   how far out dots are sampled (>98% of the density)
 *   extent how big the orbital reads on screen — used to frame the camera
 * ------------------------------------------------------------------ */

const ORBITALS = {
  '1s': { kind: 's', rMax: 8, extent: 3.5, radial: (r) => Math.exp(-r), label: '1s' },
  '2s': { kind: 's', rMax: 16, extent: 10, radial: (r) => (2 - r) * Math.exp(-r / 2), label: '2s' },
  '3s': { kind: 's', rMax: 30, extent: 20, radial: (r) => (27 - 18 * r + 2 * r * r) * Math.exp(-r / 3), label: '3s' },
  '2px': { kind: 'p', axis: 0, rMax: 13, extent: 9, radial: (r) => r * Math.exp(-r / 2), label: '2px' },
  '2py': { kind: 'p', axis: 1, rMax: 13, extent: 9, radial: (r) => r * Math.exp(-r / 2), label: '2py' },
  '2pz': { kind: 'p', axis: 2, rMax: 13, extent: 9, radial: (r) => r * Math.exp(-r / 2), label: '2pz' },
};

const PHASE_COLOURS = ['#f43f5e', '#38bdf8'];                        // + lobe / − lobe
const MERGED_COLOURS = { 0: '#3b82f6', 1: '#22c55e', 2: '#ef4444' };  // px / py / pz
const S_COLOURS = ['#dc2626', '#fbbf24'];                            // ψ + / ψ − (radial node)

const NODAL_PLANE = { 0: 'the yz-plane', 1: 'the xz-plane', 2: 'the xy-plane' };
const AXIS_NAME = { 0: 'x', 1: 'y', 2: 'z' };

const GRID_STEPS = 800;

/** Cumulative radial distribution P(r) ∝ r²·R(r)², on a fixed grid. */
function radialCdf(radial, rMax) {
  const cdf = new Float64Array(GRID_STEPS + 1);
  const dr = rMax / GRID_STEPS;
  let total = 0;
  for (let i = 1; i <= GRID_STEPS; i += 1) {
    const r = i * dr;
    const R = radial(r);
    total += r * r * R * R * dr;
    cdf[i] = total;
  }
  for (let i = 0; i <= GRID_STEPS; i += 1) cdf[i] /= total;
  return { cdf, dr };
}

/** Radius enclosing fraction p of the electron density — the boundary surface. */
function boundaryRadius(radial, rMax, p) {
  const { cdf, dr } = radialCdf(radial, rMax);
  for (let i = 0; i <= GRID_STEPS; i += 1) if (cdf[i] >= p) return i * dr;
  return rMax;
}

/** Inverse-CDF sampler for the radial distribution. */
function radialSampler(radial, rMax) {
  const { cdf, dr } = radialCdf(radial, rMax);

  return () => {
    const u = Math.random();
    let lo = 0;
    let hi = GRID_STEPS;
    while (lo < hi) {
      const mid = (lo + hi) >> 1;
      if (cdf[mid] < u) lo = mid + 1;
      else hi = mid;
    }
    return lo * dr;
  };
}

function hexToRgb(hex) {
  const v = parseInt(hex.slice(1), 16);
  return [((v >> 16) & 255) / 255, ((v >> 8) & 255) / 255, (v & 255) / 255];
}

/**
 * Build one point cloud. Radius comes from the radial distribution; direction is
 * isotropic for s, and rejection-sampled against cos²θ for p (that cos²θ factor
 * is exactly what creates the two lobes and the nodal plane between them).
 */
function buildCloud(key, count, palette) {
  const orb = ORBITALS[key];
  const sampleR = radialSampler(orb.radial, orb.rMax);
  const positions = new Float32Array(count * 3);
  const colors = new Float32Array(count * 3);

  const [cA, cB] = palette || (orb.kind === 'p' ? PHASE_COLOURS : S_COLOURS);
  const tint = [hexToRgb(cA), hexToRgb(cB)];

  for (let i = 0; i < count; i += 1) {
    const r = sampleR();

    // Uniform point on the unit sphere.
    let ux;
    let uy;
    let uz;
    for (;;) {
      const cosT = 2 * Math.random() - 1;
      const phi = 2 * Math.PI * Math.random();
      const sinT = Math.sqrt(1 - cosT * cosT);
      ux = sinT * Math.cos(phi);
      uy = sinT * Math.sin(phi);
      uz = cosT;
      if (orb.kind !== 'p') break;
      const c = [ux, uy, uz][orb.axis];
      if (Math.random() < c * c) break; // angular density ∝ cos²θ
    }

    const px = ux * r;
    const py = uy * r;
    const pz = uz * r;
    positions[i * 3] = px;
    positions[i * 3 + 1] = py;
    positions[i * 3 + 2] = pz;

    // Colour by the sign of ψ: the two lobes of a p orbital are out of phase,
    // and 2s / 3s change sign across their radial nodes.
    const sign = orb.kind === 'p' ? [px, py, pz][orb.axis] >= 0 : orb.radial(r) >= 0;
    colors.set(tint[sign ? 0 : 1], i * 3);
  }
  return { positions, colors };
}

function Cloud({ orbitalKey, count, scale, pointSize, palette }) {
  const { positions, colors } = useMemo(
    () => buildCloud(orbitalKey, count, palette),
    [orbitalKey, count, palette],
  );
  return (
    <points scale={scale}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[positions, 3]} />
        <bufferAttribute attach="attributes-color" args={[colors, 3]} />
      </bufferGeometry>
      <pointsMaterial
        vertexColors
        size={pointSize}
        sizeAttenuation
        transparent
        opacity={0.75}
        depthWrite={false}
      />
    </points>
  );
}

/**
 * One lobe of the traditional dumb-bell: the polar profile r(θ) = L·cos^k θ
 * lathed about its axis, so the lobe narrows to the nucleus exactly as it is
 * drawn in a textbook. k > 1 narrows it from two tangent spheres into the
 * elongated shape drawn in textbooks.
 */
function lobePoints(length) {
  const K = 1.5;
  const N = 48;
  const pts = [];
  for (let i = 0; i <= N; i += 1) {
    const t = (i / N) * (Math.PI / 2);
    const r = length * Math.pow(Math.cos(t), K);
    pts.push(new Vector2(Math.max(1e-4, r * Math.sin(t)), r * Math.cos(t)));
  }
  return pts;
}

/**
 * The shape a student draws: the 90% boundary surface — a sphere for s, two
 * lobes for p — sharing the cloud's origin so the two pictures overlay.
 */
function BoundarySurface({ orbitalKey, palette }) {
  const orb = ORBITALS[orbitalKey];
  const r90 = useMemo(() => boundaryRadius(orb.radial, orb.rMax, 0.9), [orb]);
  const pts = useMemo(() => lobePoints(r90), [r90]);
  const [cA, cB] = palette || (orb.kind === 'p' ? PHASE_COLOURS : S_COLOURS);
  const skin = { transparent: true, opacity: 0.32, shininess: 40, side: DoubleSide, depthWrite: false };

  if (orb.kind === 's') {
    return (
      <mesh>
        <sphereGeometry args={[r90, 48, 32]} />
        <meshPhongMaterial color={cA} {...skin} />
      </mesh>
    );
  }

  // the lathe builds along +y — turn it onto this orbital's axis
  const rotation =
    orb.axis === 2 ? [Math.PI / 2, 0, 0] : orb.axis === 0 ? [0, 0, -Math.PI / 2] : [0, 0, 0];
  return (
    <group rotation={rotation}>
      <mesh>
        <latheGeometry args={[pts, 48]} />
        <meshPhongMaterial color={cA} {...skin} />
      </mesh>
      <mesh scale={[1, -1, 1]}>
        <latheGeometry args={[pts, 48]} />
        <meshPhongMaterial color={cB} {...skin} />
      </mesh>
    </group>
  );
}

/**
 * Frames the camera on the selected orbital, keeping the angle the student has
 * dragged to. Mounted with key={mode} so it refits when the orbital changes and
 * not while the size slider is moving.
 */
function FitCamera({ distance }) {
  const camera = useThree((s) => s.camera);
  useEffect(() => {
    const dir = camera.position.clone();
    if (dir.lengthSq() < 1e-6) dir.set(0.7, 0.45, 0.55);
    camera.position.copy(dir.normalize().multiplyScalar(distance));
    camera.updateProjectionMatrix();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  return null;
}

function Axes({ length }) {
  const axes = [
    { dir: [1, 0, 0], color: '#ef4444', label: 'x' },
    { dir: [0, 1, 0], color: '#22c55e', label: 'y' },
    { dir: [0, 0, 1], color: '#3b82f6', label: 'z' },
  ];
  return (
    <group>
      {axes.map(({ dir, color, label }) => {
        const end = dir.map((d) => d * length);
        const start = dir.map((d) => -d * length);
        return (
          <group key={label}>
            <Line points={[start, end]} color={color} lineWidth={1.5} />
            <Html position={end} center distanceFactor={length * 2.5}>
              <span
                className="select-none rounded px-1 text-xs font-black"
                style={{ color, background: 'rgba(255,255,255,0.75)' }}
              >
                {label}
              </span>
            </Html>
          </group>
        );
      })}
    </group>
  );
}

/** The single nodal plane of a p orbital — the plane through the nucleus, ⟂ to its axis. */
function NodalPlane({ axis, size }) {
  const rotation =
    axis === 2 ? [-Math.PI / 2, 0, 0] : axis === 0 ? [0, Math.PI / 2, 0] : [0, 0, 0];
  return (
    <mesh rotation={rotation}>
      <planeGeometry args={[size, size]} />
      <meshBasicMaterial color="#7c3aed" transparent opacity={0.14} side={DoubleSide} depthWrite={false} />
    </mesh>
  );
}

const MODES = [
  { id: '1s', group: 's' },
  { id: '2s', group: 's' },
  { id: '3s', group: 's' },
  { id: '2px', group: 'p' },
  { id: '2py', group: 'p' },
  { id: '2pz', group: 'p' },
  { id: 'merged', group: 'p' },
];

const DENSITIES = [
  { label: 'Light', value: 3000 },
  { label: 'Medium', value: 7000 },
  { label: 'Dense', value: 14000 },
];

/** In merged mode colour identifies the orbital, not the phase. */
const MERGED_PALETTES = {
  '2px': [MERGED_COLOURS[0], MERGED_COLOURS[0]],
  '2py': [MERGED_COLOURS[1], MERGED_COLOURS[1]],
  '2pz': [MERGED_COLOURS[2], MERGED_COLOURS[2]],
};

export default function OrbitalViewer3D() {
  const [mode, setMode] = useState('2pz');
  const [shellSize, setShellSize] = useState(1);
  const [count, setCount] = useState(7000);
  const [showPlane, setShowPlane] = useState(true);
  const [view, setView] = useState('both');   // cloud | shape | both

  const merged = mode === 'merged';
  const keys = merged ? ['2px', '2py', '2pz'] : [mode];
  const orb = merged ? ORBITALS['2pz'] : ORBITALS[mode];

  // One world unit ≈ 4 a0 at scale 1, shared by every orbital, so 1s → 3s
  // genuinely grows against the axes. `span` is how big this orbital reads.
  const worldScale = 0.24 * shellSize;
  const span = orb.extent * worldScale;
  const axisLength = span * 0.95;
  const pointSize = Math.max(0.04, 0.03 * span);

  const btn = (on) =>
    `rounded-lg border px-3 py-2 text-sm font-semibold transition ${
      on ? 'border-red-600 bg-red-600 text-white' : 'border-slate-300 bg-white text-slate-700 hover:border-red-400'
    }`;

  return (
    <div className="grid gap-5 lg:grid-cols-[1fr_20rem]">
      <div className="space-y-4">
        <div className="flex flex-wrap items-end gap-4 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="flex flex-col gap-1 text-xs font-semibold uppercase tracking-wide text-slate-500">
            s orbitals
            <div className="flex gap-1.5">
              {MODES.filter((m) => m.group === 's').map((m) => (
                <button key={m.id} type="button" onClick={() => setMode(m.id)} className={btn(mode === m.id)}>
                  {m.id}
                </button>
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
            <input
              type="range"
              min="0.4"
              max="2"
              step="0.05"
              value={shellSize}
              onChange={(e) => setShellSize(Number(e.target.value))}
              className="accent-red-600"
            />
          </label>

          <div className="flex flex-col gap-1 text-xs font-semibold uppercase tracking-wide text-slate-500">
            Show
            <div className="flex overflow-hidden rounded-lg border border-slate-300">
              {[['Cloud', 'cloud'], ['Shape', 'shape'], ['Both', 'both']].map(([label, val]) => (
                <button
                  key={val}
                  type="button"
                  onClick={() => setView(val)}
                  className={`px-3 py-2 text-sm font-semibold transition ${
                    view === val ? 'bg-red-600 text-white' : 'bg-white text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          <div className="flex flex-col gap-1 text-xs font-semibold uppercase tracking-wide text-slate-500">
            Cloud density
            <div className="flex gap-1.5">
              {DENSITIES.map((d) => (
                <button
                  key={d.value}
                  type="button"
                  onClick={() => setCount(d.value)}
                  disabled={view === 'shape'}
                  className={`rounded-lg border px-3 py-2 text-sm font-semibold transition disabled:opacity-40 ${
                    count === d.value
                      ? 'border-slate-800 bg-slate-800 text-white'
                      : 'border-slate-300 bg-white text-slate-700 hover:border-slate-500'
                  }`}
                >
                  {d.label}
                </button>
              ))}
            </div>
          </div>

          {orb.kind === 'p' && !merged && (
            <label className="flex items-center gap-2 text-sm font-semibold text-slate-700">
              <input
                type="checkbox"
                checked={showPlane}
                onChange={(e) => setShowPlane(e.target.checked)}
                className="h-4 w-4 accent-purple-600"
              />
              Show nodal plane
            </label>
          )}
        </div>

        <div className="h-[28rem] overflow-hidden rounded-xl border border-slate-200 bg-slate-950 shadow-sm">
          <Canvas camera={{ position: [5, 3.2, 4], fov: 45, near: 0.1, far: 500 }} dpr={[1, 2]}>
            <color attach="background" args={['#020617']} />
            <ambientLight intensity={0.55} />
            <directionalLight position={[6, 9, 7]} intensity={0.85} />
            <FitCamera key={mode} distance={Math.min(60, Math.max(2, span * 3.3))} />
            <Axes length={axisLength} />
            {view !== 'shape' && keys.map((k) => (
              <Cloud
                key={k}
                orbitalKey={k}
                count={merged ? Math.round(count * 0.6) : count}
                scale={worldScale}
                pointSize={pointSize}
                palette={merged ? MERGED_PALETTES[k] : undefined}
              />
            ))}
            {view !== 'cloud' && (
              <group scale={worldScale}>
                {keys.map((k) => (
                  <BoundarySurface
                    key={k}
                    orbitalKey={k}
                    palette={merged ? MERGED_PALETTES[k] : undefined}
                  />
                ))}
              </group>
            )}
            {orb.kind === 'p' && !merged && showPlane && (
              <NodalPlane axis={orb.axis} size={axisLength * 1.8} />
            )}
            <OrbitControls enablePan={false} minDistance={1} maxDistance={80} />
          </Canvas>
        </div>
        <p className="text-xs text-slate-500">
          Drag to rotate · scroll to zoom. Each dot is one possible position of the electron, so
          where the dots are dense the electron is more likely to be found. The solid shape is the
          <b> 90% boundary surface</b> — the sphere or dumb-bell you draw in an exam — sharing the
          same origin, so you can see how much of the cloud it encloses. The two colours mark the
          two halves of the wave that are out of phase with each other; in “all 3” each colour is
          one orbital.
        </p>
      </div>

      {/* ---------------- AQA panel ---------------- */}
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
            <li>
              <b>Orbital:</b> a region of space around the nucleus that can hold up to
              <b> two electrons, with opposite spins</b>.
            </li>
            <li>
              <b>Capacities:</b> an s sub-level is a single orbital holding <b>2</b> electrons;
              a p sub-level is three orbitals (px, py, pz) holding <b>6</b> electrons in total.
            </li>
            <li>
              <b>Shapes:</b> s orbitals are <b>spherical</b>; p orbitals are <b>dumb-bell shaped</b>,
              pointing along the x, y and z axes, at 90° to each other.
            </li>
            <li>
              <b>Nodal plane:</b> every p orbital has <b>one</b> plane through the nucleus on which
              the probability of finding the electron is zero — that is what separates the two lobes.
            </li>
            <li>
              <b>Size:</b> orbitals with a higher principal shell number are larger and, on average,
              hold the electron further from the nucleus (compare 1s, 2s and 3s above).
            </li>
            <li>
              <b>Why the drawn shape is a boundary:</b> the electron has no edge — the sphere or
              dumb-bell you draw is simply the surface inside which the electron is found about
              <b> 90%</b> of the time. Switch between “Cloud”, “Shape” and “Both” to see the two
              pictures of the same orbital.
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
}
