import { useCallback, useMemo, useState } from 'react';

/* ------------------------------------------------------------------ *
 * AQA A-Level Chemistry 7405 — 3.1.1.2 Electron configuration
 * Scope: Aufbau, Hund, Pauli, s/p/d sub-levels to Z=36.
 * Deliberately excluded: quantum numbers (n, l, m), d-orbital shapes.
 * ------------------------------------------------------------------ */

const SUBSHELLS = [
  { id: '1s', n: 1, l: 's', boxes: 1 },
  { id: '2s', n: 2, l: 's', boxes: 1 },
  { id: '2p', n: 2, l: 'p', boxes: 3 },
  { id: '3s', n: 3, l: 's', boxes: 1 },
  { id: '3p', n: 3, l: 'p', boxes: 3 },
  { id: '3d', n: 3, l: 'd', boxes: 5 },
  { id: '4s', n: 4, l: 's', boxes: 1 },
  { id: '4p', n: 4, l: 'p', boxes: 3 },
];

const CAP = Object.fromEntries(SUBSHELLS.map((s) => [s.id, s.boxes * 2]));
const BY_ID = Object.fromEntries(SUBSHELLS.map((s) => [s.id, s]));

/** Order electrons are ADDED (Aufbau: 4s below 3d on the way in). */
const FILL_ORDER = ['1s', '2s', '2p', '3s', '3p', '4s', '3d', '4p'];
/** Order electrons are REMOVED (4s is emptied BEFORE 3d — the AQA ion rule). */
const STRIP_ORDER = ['4p', '4s', '3d', '3p', '3s', '2p', '2s', '1s'];
/** Order electrons are WRITTEN (by shell, then sub-level — AQA convention). */
const WRITE_ORDER = ['1s', '2s', '2p', '3s', '3p', '3d', '4s', '4p'];
/**
 * Top-to-bottom order for the stacked diagram: highest energy at the top, 1s at
 * the bottom, as on an energy-level diagram. Note 4s sits BELOW 3d — which is
 * exactly why 4s fills first.
 */
const DISPLAY_ORDER = [...FILL_ORDER].reverse();

/**
 * Relative energies for the spread-out diagram (arbitrary units, spaced as they
 * are drawn in textbooks). The point of this layout is the overlap: 4s lies
 * below 3d even though it belongs to the shell above.
 */
const SUBLEVEL_ENERGY = { '1s': 0, '2s': 22, '2p': 28, '3s': 42, '3p': 48, '4s': 58, '3d': 62, '4p': 68 };
const ENERGY_TOP = 68;
const COLUMNS = ['s', 'p', 'd'];

const ELEMENTS = [
  'H', 'He', 'Li', 'Be', 'B', 'C', 'N', 'O', 'F', 'Ne',
  'Na', 'Mg', 'Al', 'Si', 'P', 'S', 'Cl', 'Ar', 'K', 'Ca',
  'Sc', 'Ti', 'V', 'Cr', 'Mn', 'Fe', 'Co', 'Ni', 'Cu', 'Zn',
  'Ga', 'Ge', 'As', 'Se', 'Br', 'Kr',
];

const NAMES = [
  'Hydrogen', 'Helium', 'Lithium', 'Beryllium', 'Boron', 'Carbon', 'Nitrogen',
  'Oxygen', 'Fluorine', 'Neon', 'Sodium', 'Magnesium', 'Aluminium', 'Silicon',
  'Phosphorus', 'Sulfur', 'Chlorine', 'Argon', 'Potassium', 'Calcium',
  'Scandium', 'Titanium', 'Vanadium', 'Chromium', 'Manganese', 'Iron',
  'Cobalt', 'Nickel', 'Copper', 'Zinc', 'Gallium', 'Germanium', 'Arsenic',
  'Selenium', 'Bromine', 'Krypton',
];

/** The only two neutral-atom exceptions in the AQA specification. */
const ANOMALIES = {
  24: { '3d': 5, '4s': 1 },  // Cr — half-filled 3d is lower in energy
  29: { '3d': 10, '4s': 1 }, // Cu — fully-filled 3d is lower in energy
};

const NOBLE_CORES = [
  { z: 36, symbol: 'Kr' },
  { z: 18, symbol: 'Ar' },
  { z: 10, symbol: 'Ne' },
  { z: 2, symbol: 'He' },
];

const SUPS = { 0: '⁰', 1: '¹', 2: '²', 3: '³', 4: '⁴', 5: '⁵', 6: '⁶', 7: '⁷', 8: '⁸', 9: '⁹' };
const sup = (n) => String(n).split('').map((d) => SUPS[d]).join('');

const emptyConfig = () => Object.fromEntries(SUBSHELLS.map((s) => [s.id, 0]));

/** Fill `count` electrons using the Aufbau order. */
function aufbau(count) {
  const cfg = emptyConfig();
  let left = count;
  for (const id of FILL_ORDER) {
    if (left <= 0) break;
    const put = Math.min(CAP[id], left);
    cfg[id] = put;
    left -= put;
  }
  return cfg;
}

/** Neutral atom, with the Cr / Cu anomalies applied. */
function neutralConfig(z) {
  const cfg = aufbau(z);
  if (ANOMALIES[z]) Object.assign(cfg, ANOMALIES[z]);
  return cfg;
}

/**
 * Configuration of a species.
 *   charge === 0 → the neutral atom, including the Cr / Cu anomalies.
 *   charge  >  0 → build the neutral atom, then strip in STRIP_ORDER (4s before 3d).
 *   charge  <  0 → Aufbau fill of (z - charge) electrons.
 */
function speciesConfig(z, charge) {
  if (charge === 0) return neutralConfig(z);
  if (charge < 0) return aufbau(z - charge);
  const cfg = neutralConfig(z);
  let toRemove = charge;
  for (const id of STRIP_ORDER) {
    if (toRemove <= 0) break;
    const take = Math.min(cfg[id], toRemove);
    cfg[id] -= take;
    toRemove -= take;
  }
  return cfg;
}

/** Hund's rule: one ↑ in every box first, then pair with ↓. */
function boxesFor(count, boxCount) {
  const singles = Math.min(count, boxCount);
  const pairs = Math.max(0, count - boxCount);
  return Array.from({ length: boxCount }, (_, i) => (i < pairs ? 2 : i < singles ? 1 : 0));
}

const fullString = (cfg) =>
  WRITE_ORDER.filter((id) => cfg[id] > 0).map((id) => `${id}${sup(cfg[id])}`).join(' ');

/**
 * Noble-gas shorthand. A species may equal a full core (Cl⁻ and Sc³⁺ are both
 * [Ar]) — but an atom is never abbreviated to its own symbol, so Ar itself
 * falls back to [Ne]3s²3p⁶.
 */
function shorthandString(cfg, z) {
  const total = Object.values(cfg).reduce((a, b) => a + b, 0);
  const core = NOBLE_CORES.find((c) => {
    if (c.z > total || c.z === z) return false;
    const coreCfg = aufbau(c.z);
    return SUBSHELLS.every((s) => cfg[s.id] >= coreCfg[s.id]);
  });
  if (!core) return fullString(cfg);
  const coreCfg = aufbau(core.z);
  const rest = WRITE_ORDER
    .map((id) => [id, cfg[id] - coreCfg[id]])
    .filter(([, n]) => n > 0)
    .map(([id, n]) => `${id}${sup(n)}`)
    .join(' ');
  return `[${core.symbol}]${rest ? ` ${rest}` : ''}`;
}

/** Ion charges are always written as superscripts: Fe²⁺, Cu⁺, Cl⁻. */
const chargeLabel = (c) =>
  c === 0 ? '' : `${Math.abs(c) === 1 ? '' : sup(Math.abs(c))}${c > 0 ? '⁺' : '⁻'}`;

const PRESETS = [
  { label: 'Fe²⁺', z: 26, charge: 2 },
  { label: 'Fe³⁺', z: 26, charge: 3 },
  { label: 'Cu⁺', z: 29, charge: 1 },
  { label: 'Cu²⁺', z: 29, charge: 2 },
  { label: 'Cr³⁺', z: 24, charge: 3 },
];

const CHARGES = [-2, -1, 0, 1, 2, 3];

const SHELL_TINT = {
  1: 'border-red-300 bg-red-50',
  2: 'border-orange-300 bg-orange-50',
  3: 'border-rose-300 bg-rose-50',
  4: 'border-amber-300 bg-amber-50',
};

/** Sub-levels in energy order, low → high, and the reverse for the stacked view. */
const ENERGY_SUBSHELLS = FILL_ORDER.map((id) => BY_ID[id]);
const DISPLAY_SUBSHELLS = DISPLAY_ORDER.map((id) => BY_ID[id]);

const blankDraft = () =>
  Object.fromEntries(SUBSHELLS.map((s) => [s.id, Array(s.boxes).fill(0)]));

function OrbitalBox({ state, onClick, interactive, small }) {
  const arrows = state === 2 ? '↑↓' : state === 1 ? '↑' : '';
  return (
    <button
      type="button"
      disabled={!interactive}
      onClick={onClick}
      aria-label={`${state} electron${state === 1 ? '' : 's'}`}
      className={`rounded border-2 font-bold tracking-tighter transition
        ${small ? 'h-8 w-8 text-xs' : 'h-10 w-9 text-sm'}
        ${state ? 'border-slate-700 bg-white text-slate-900' : 'border-slate-300 bg-white/60 text-transparent'}
        ${interactive ? 'cursor-pointer hover:border-red-500 hover:bg-red-50' : 'cursor-default'}`}
    >
      {arrows || '·'}
    </button>
  );
}

/** One sub-level as a labelled row of boxes — used by the stacked layout. */
function SubshellRow({ subshell, boxes, interactive, onBoxClick }) {
  return (
    <div className={`flex items-center gap-3 rounded-lg border px-3 py-2 ${SHELL_TINT[subshell.n]}`}>
      <span className="w-8 font-mono text-sm font-bold text-slate-800">{subshell.id}</span>
      <div className="flex gap-1">
        {boxes.map((state, i) => (
          <OrbitalBox
            key={i}
            state={state}
            interactive={interactive}
            onClick={() => onBoxClick(subshell.id, i)}
          />
        ))}
      </div>
      <span className="ml-auto font-mono text-xs text-slate-500">
        {boxes.reduce((a, b) => a + b, 0)}/{subshell.boxes * 2}
      </span>
    </div>
  );
}

/**
 * s, p and d spread across the page with energy up the y-axis. Drawn this way
 * the overlap between shells is obvious: 4s sits below 3d, so it fills first —
 * and empties first when the ion forms.
 */
function EnergyDiagram({ boxes, interactive, onBoxClick, showFillOrder }) {
  const y = (id) => 4 + (SUBLEVEL_ENERGY[id] / ENERGY_TOP) * 80;
  // the d column needs room for five boxes
  const flex = { s: 1, p: 1.3, d: 1.9 };
  return (
    <div className="pl-8 pr-2">
      <div className="mb-2 flex gap-3">
        {COLUMNS.map((col) => (
          <div
            key={col}
            style={{ flex: flex[col] }}
            className="text-center text-xs font-black uppercase tracking-widest text-slate-400"
          >
            {col} sub-levels
          </div>
        ))}
      </div>

      <div className="relative h-[26rem]">
        {/* energy axis */}
        <div className="absolute -left-7 bottom-0 top-0 flex flex-col items-center justify-center gap-1 text-[10px] font-bold uppercase tracking-widest text-slate-400">
          <span className="text-sm leading-none">↑</span>
          <span style={{ writingMode: 'vertical-rl' }} className="rotate-180">Energy</span>
        </div>

        {/* faint guide line at every sub-level, so 4s and 3d can be compared */}
        {SUBSHELLS.map((sub) => (
          <div
            key={`guide-${sub.id}`}
            className="absolute inset-x-0 border-t border-dashed border-slate-200"
            style={{ bottom: `${y(sub.id)}%` }}
          />
        ))}

        <div className="flex h-full gap-3">
          {COLUMNS.map((col) => (
            <div key={col} style={{ flex: flex[col] }} className="relative">
              {SUBSHELLS.filter((sub) => sub.l === col).map((sub) => (
                <div
                  key={sub.id}
                  className={`absolute left-0 flex -translate-y-1/2 items-center gap-2 rounded-lg border px-2 py-1 ${SHELL_TINT[sub.n]}`}
                  style={{ bottom: `${y(sub.id)}%` }}
                >
                  <span className="font-mono text-sm font-bold text-slate-800">{sub.id}</span>
                  <div className="flex gap-1">
                    {boxes[sub.id].map((state, i) => (
                      <OrbitalBox
                        key={i}
                        state={state}
                        small
                        interactive={interactive}
                        onClick={() => onBoxClick(sub.id, i)}
                      />
                    ))}
                  </div>
                  {showFillOrder && (
                    <span className="ml-1 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-slate-800 text-[10px] font-black text-white">
                      {FILL_ORDER.indexOf(sub.id) + 1}
                    </span>
                  )}
                </div>
              ))}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/** A small, non-interactive row of boxes used to illustrate a rule. */
function MiniRow({ label, states, verdict }) {
  const tone =
    verdict === 'yes' ? 'border-emerald-300 bg-emerald-50' : verdict === 'no' ? 'border-red-300 bg-red-50' : 'border-slate-200 bg-white';
  return (
    <div className={`flex items-center gap-2 rounded-lg border px-2 py-1.5 ${tone}`}>
      <span className="w-8 font-mono text-xs font-bold text-slate-700">{label}</span>
      <div className="flex gap-1">
        {states.map((state, i) => <OrbitalBox key={i} state={state} small />)}
      </div>
      {verdict && (
        <span className={`ml-1 text-sm font-black ${verdict === 'yes' ? 'text-emerald-700' : 'text-red-700'}`}>
          {verdict === 'yes' ? '✔' : '✘'}
        </span>
      )}
    </div>
  );
}

function RuleCard({ title, subtitle, children }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <h4 className="text-sm font-black text-slate-900">{title}</h4>
      {subtitle && <p className="mt-0.5 text-xs font-semibold uppercase tracking-wide text-red-700">{subtitle}</p>}
      <div className="mt-2 space-y-2 text-sm leading-snug text-slate-700">{children}</div>
    </div>
  );
}

/** The reference tab: the three rules, the 4s/3d overlap, and the exceptions. */
function FillingRules() {
  // A neutral iron atom is the clearest single example of every rule at once.
  const example = useMemo(() => {
    const cfg = neutralConfig(26);
    return Object.fromEntries(SUBSHELLS.map((s) => [s.id, boxesFor(cfg[s.id], s.boxes)]));
  }, []);

  return (
    <div className="space-y-5">
      <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <h3 className="text-sm font-bold text-slate-700">
          <span className="uppercase tracking-wide">Order of filling</span> — iron, Fe
        </h3>
        <p className="mt-1 text-xs text-slate-500">
          Numbers show the order the sub-levels fill. Follow them and you cross from shell 3 into
          shell 4 and back again — 4s fills before 3d because it is lower in energy.
        </p>
        <EnergyDiagram boxes={example} interactive={false} onBoxClick={() => {}} showFillOrder />
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <RuleCard title="1. Aufbau principle" subtitle="lowest energy first">
          <p>
            Electrons fill the <b>lowest-energy sub-level available</b> before going into a higher
            one. Read the diagram from the bottom up: 1s, 2s, 2p, 3s, 3p, then <b>4s before 3d</b>.
          </p>
          <p>
            <b>The overlap is the thing to notice.</b> The sub-levels of one shell are not all below
            the sub-levels of the next: 4s is <i>lower</i> in energy than 3d, so it fills first even
            though it belongs to shell 4. This is why potassium is [Ar]4s¹ and not [Ar]3d¹.
          </p>
        </RuleCard>

        <RuleCard title="2. Pauli exclusion principle" subtitle="two per orbital, opposite spins">
          <p>
            An orbital holds a <b>maximum of two electrons</b>, and they must have{' '}
            <b>opposite spins</b> — drawn ↑↓. Two electrons in the same orbital with the same spin
            is not allowed.
          </p>
          <div className="flex flex-wrap gap-2 pt-1">
            <MiniRow label="ok" states={[2]} verdict="yes" />
            <MiniRow label="no" states={[1]} verdict="no" />
          </div>
          <p className="text-xs text-slate-500">
            The second box shows what you must never draw: two arrows pointing the same way in one
            orbital. (Here the tool only ever lets you place ↑ then ↑↓.)
          </p>
        </RuleCard>

        <RuleCard title="3. Hund's rule" subtitle="spread out before pairing up">
          <p>
            Within a sub-level, electrons occupy <b>separate orbitals with parallel spins</b> before
            any orbital gets a second electron. They repel each other, so staying apart is lower in
            energy.
          </p>
          <div className="flex flex-wrap gap-2 pt-1">
            <MiniRow label="2p³" states={[1, 1, 1]} verdict="yes" />
            <MiniRow label="2p³" states={[2, 1, 0]} verdict="no" />
          </div>
          <p>
            Only once every orbital in the sub-level holds one electron does pairing start —
            2p⁴ is ↑↓ ↑ ↑.
          </p>
        </RuleCard>

        <RuleCard title="4. Forming ions" subtitle="4s empties before 3d">
          <p>
            Once 3d contains electrons it drops <i>below</i> 4s, so when a transition metal forms an
            ion the <b>4s electrons leave first</b>. Iron is [Ar]3d⁶4s², so Fe²⁺ is <b>[Ar]3d⁶</b> —
            not [Ar]3d⁴4s².
          </p>
          <p>Losing electrons always starts from the outside: 4p, then 4s, then 3d.</p>
        </RuleCard>

        <RuleCard title="5. The two exceptions" subtitle="chromium and copper">
          <p>
            <b>Cr is [Ar]3d⁵4s¹</b> and <b>Cu is [Ar]3d¹⁰4s¹</b>. A half-filled or completely filled
            3d sub-level is lower in energy, so one 4s electron promotes into 3d. These are the only
            two you need for AQA.
          </p>
        </RuleCard>
      </div>
    </div>
  );
}

const VIEWS = [
  { id: 'build', label: 'Build a configuration' },
  { id: 'rules', label: 'The filling rules' },
];

const LAYOUTS = [
  { id: 'diagram', label: 'Energy diagram' },
  { id: 'stacked', label: 'Stacked list' },
];

export default function ElectronConfigBuilder() {
  const [view, setView] = useState('build');
  const [layout, setLayout] = useState('diagram');
  const [z, setZ] = useState(26);
  const [charge, setCharge] = useState(2);
  const [manual, setManual] = useState(false);
  const [draft, setDraft] = useState(blankDraft);
  const [checked, setChecked] = useState(false);

  const target = useMemo(() => speciesConfig(z, charge), [z, charge]);
  const targetBoxes = useMemo(
    () => Object.fromEntries(SUBSHELLS.map((s) => [s.id, boxesFor(target[s.id], s.boxes)])),
    [target],
  );

  const shown = manual ? draft : targetBoxes;
  const electrons = z - charge;
  const placed = useMemo(
    () => Object.values(shown).flat().reduce((a, b) => a + b, 0),
    [shown],
  );

  const resetDraft = useCallback(() => {
    setDraft(blankDraft());
    setChecked(false);
  }, []);

  const selectSpecies = useCallback((nextZ, nextCharge) => {
    setZ(nextZ);
    setCharge(nextCharge);
    resetDraft();
  }, [resetDraft]);

  // Pauli is enforced structurally: a box cycles empty → ↑ → ↑↓ → empty.
  const handleBoxClick = useCallback((id, index) => {
    setChecked(false);
    setDraft((prev) => {
      const row = [...prev[id]];
      row[index] = (row[index] + 1) % 3;
      return { ...prev, [id]: row };
    });
  }, []);

  const verdict = useMemo(() => {
    if (!manual || !checked) return null;
    const wrong = ENERGY_SUBSHELLS.filter((s) => draft[s.id].join() !== targetBoxes[s.id].join());
    if (!wrong.length) return { ok: true, msg: 'Correct — Aufbau, Hund and Pauli all satisfied.' };
    if (placed !== electrons) {
      return {
        ok: false,
        msg: `You have placed ${placed} electrons; ${ELEMENTS[z - 1]}${chargeLabel(charge)} has ${electrons}.`,
      };
    }
    const s = wrong[0];
    const draftTotal = draft[s.id].reduce((a, b) => a + b, 0);
    const targetTotal = target[s.id];
    return {
      ok: false,
      msg: draftTotal === targetTotal
        ? `${s.id} has the right number of electrons but the wrong arrangement — Hund's rule: put ↑ in every box before pairing.`
        : `${s.id} should hold ${targetTotal} electron${targetTotal === 1 ? '' : 's'}, not ${draftTotal}.`,
    };
  }, [manual, checked, draft, targetBoxes, target, placed, electrons, z, charge]);

  const symbol = `${ELEMENTS[z - 1]}${chargeLabel(charge)}`;
  const isAnomaly = charge === 0 && Boolean(ANOMALIES[z]);
  const isTMIon = charge > 0 && z >= 21 && z <= 30;

  return (
    <div className="space-y-5">
      {/* ---------------- View tabs ---------------- */}
      <div className="flex gap-1 border-b border-slate-200">
        {VIEWS.map((v) => (
          <button
            key={v.id}
            type="button"
            onClick={() => setView(v.id)}
            className={`-mb-px border-b-2 px-4 py-2 text-sm font-bold transition ${
              view === v.id
                ? 'border-red-600 text-red-700'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            {v.label}
          </button>
        ))}
      </div>

      {view === 'rules' ? <FillingRules /> : (
        <>
          {/* ---------------- Controls ---------------- */}
          <div className="flex flex-wrap items-end gap-4 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <label className="flex flex-col gap-1 text-xs font-semibold uppercase tracking-wide text-slate-500">
              Element (Z = 1–36)
              <select
                value={z}
                onChange={(e) => selectSpecies(Number(e.target.value), charge)}
                className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-900 focus:border-red-500 focus:outline-none focus:ring-2 focus:ring-red-200"
              >
                {ELEMENTS.map((sym, i) => (
                  <option key={sym} value={i + 1}>{i + 1} — {sym} ({NAMES[i]})</option>
                ))}
              </select>
            </label>

            <label className="flex flex-col gap-1 text-xs font-semibold uppercase tracking-wide text-slate-500">
              Charge
              <select
                value={charge}
                onChange={(e) => selectSpecies(z, Number(e.target.value))}
                className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-900 focus:border-red-500 focus:outline-none focus:ring-2 focus:ring-red-200"
              >
                {CHARGES.filter((c) => z - c >= 1 && z - c <= 36).map((c) => (
                  <option key={c} value={c}>{c === 0 ? 'neutral atom' : chargeLabel(c)}</option>
                ))}
              </select>
            </label>

            <div className="flex flex-col gap-1 text-xs font-semibold uppercase tracking-wide text-slate-500">
              Common ions
              <div className="flex flex-wrap gap-1.5">
                {PRESETS.map((p) => {
                  const active = p.z === z && p.charge === charge;
                  return (
                    <button
                      key={p.label}
                      type="button"
                      onClick={() => selectSpecies(p.z, p.charge)}
                      className={`rounded-lg border px-3 py-2 text-sm font-semibold transition ${
                        active
                          ? 'border-red-600 bg-red-600 text-white'
                          : 'border-slate-300 bg-white text-slate-700 hover:border-red-400 hover:text-red-700'
                      }`}
                    >
                      {p.label}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="flex flex-col gap-1 text-xs font-semibold uppercase tracking-wide text-slate-500">
              Layout
              <div className="flex overflow-hidden rounded-lg border border-slate-300">
                {LAYOUTS.map((l) => (
                  <button
                    key={l.id}
                    type="button"
                    onClick={() => setLayout(l.id)}
                    className={`px-3 py-2 text-sm font-semibold transition ${
                      layout === l.id ? 'bg-red-600 text-white' : 'bg-white text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    {l.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="ml-auto flex flex-col gap-1 text-xs font-semibold uppercase tracking-wide text-slate-500">
              Mode
              <div className="flex overflow-hidden rounded-lg border border-slate-300">
                {[['Auto', false], ['Manual', true]].map(([label, val]) => (
                  <button
                    key={label}
                    type="button"
                    onClick={() => { setManual(val); setChecked(false); }}
                    className={`px-4 py-2 text-sm font-semibold transition ${
                      manual === val ? 'bg-red-600 text-white' : 'bg-white text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* ---------------- Diagram + written strings ---------------- */}
          <div className="grid gap-5 lg:grid-cols-[1fr_20rem]">
            <div className="space-y-2 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
              <div className="mb-1 flex items-baseline justify-between">
                <h3 className="text-sm font-bold text-slate-700">
                  <span className="uppercase tracking-wide">Orbital diagram</span> — {symbol}
                </h3>
                <span className="text-xs text-slate-500">
                  {manual ? `${placed} / ${electrons} electrons placed` : `${electrons} electrons`}
                </span>
              </div>

              {layout === 'diagram' ? (
                <EnergyDiagram boxes={shown} interactive={manual} onBoxClick={handleBoxClick} />
              ) : (
                <div className="flex gap-2">
                  <div className="flex w-5 flex-col items-center justify-center gap-1 pb-1 text-[10px] font-bold uppercase tracking-widest text-slate-400">
                    <span className="text-sm leading-none">↑</span>
                    <span style={{ writingMode: 'vertical-rl' }} className="rotate-180">Energy</span>
                  </div>
                  <div className="flex-1 space-y-2">
                    {DISPLAY_SUBSHELLS.map((s) => (
                      <SubshellRow
                        key={s.id}
                        subshell={s}
                        boxes={shown[s.id]}
                        interactive={manual}
                        onBoxClick={handleBoxClick}
                      />
                    ))}
                  </div>
                </div>
              )}

              {manual && (
                <div className="flex flex-wrap items-center gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setChecked(true)}
                    className="rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700"
                  >
                    Check my answer
                  </button>
                  <button
                    type="button"
                    onClick={resetDraft}
                    className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-50"
                  >
                    Clear
                  </button>
                  <span className="text-xs text-slate-500">Click a box: empty → ↑ → ↑↓ → empty</span>
                </div>
              )}

              {verdict && (
                <p className={`rounded-lg px-3 py-2 text-sm font-medium ${
                  verdict.ok ? 'bg-emerald-50 text-emerald-800' : 'bg-amber-50 text-amber-900'
                }`}>
                  {verdict.ok ? '✔ ' : '✘ '}{verdict.msg}
                </p>
              )}
            </div>

            <div className="space-y-4">
              <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
                <p className="text-xs font-bold uppercase tracking-wide text-slate-500">Full configuration</p>
                <p className="mt-1 break-words font-mono text-base font-semibold text-slate-900">
                  {fullString(target)}
                </p>
                <p className="mt-3 text-xs font-bold uppercase tracking-wide text-slate-500">Noble-gas shorthand</p>
                <p className="mt-1 font-mono text-base font-semibold text-red-700">
                  {shorthandString(target, z)}
                </p>
              </div>

              <div className="rounded-xl border-l-4 border-purple-500 bg-purple-50 p-4">
                <p className="text-xs font-black uppercase tracking-wide text-purple-800">AQA Exam Tip</p>
                <ul className="mt-2 space-y-2 text-sm leading-snug text-purple-900">
                  <li>
                    <b>4s fills first, but empties first.</b> 4s is below 3d on the way in, yet once 3d
                    is occupied it sits <i>above</i> 3d — so when a transition metal forms an ion you
                    remove the <b>4s electrons before any 3d electrons</b>. Fe is [Ar]3d⁶4s², so Fe²⁺ is
                    [Ar]3d⁶ (not [Ar]3d⁴4s²) and Fe³⁺ is [Ar]3d⁵.
                  </li>
                  <li>
                    <b>Two exceptions to learn:</b> Cr is [Ar]3d⁵4s¹ and Cu is [Ar]3d¹⁰4s¹ — a
                    half-filled or filled 3d sub-level is more stable, so one 4s electron promotes into 3d.
                  </li>
                  <li>
                    The <b>filling rules</b> tab above explains Aufbau, Pauli and Hund in full.
                  </li>
                </ul>
              </div>

              {isAnomaly && (
                <p className="rounded-lg bg-red-50 px-3 py-2 text-sm font-medium text-red-800">
                  ⚠ {ELEMENTS[z - 1]} is one of the two anomalies — note the single 4s electron.
                </p>
              )}
              {isTMIon && (
                <p className="rounded-lg bg-red-50 px-3 py-2 text-sm font-medium text-red-800">
                  ⚠ Transition metal ion — 4s was emptied before any 3d electron was removed.
                </p>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
