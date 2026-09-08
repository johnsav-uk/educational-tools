/* ------------------------------------------------------------------ *
 * GENERATED FILE — do not edit.
 * Run `python build.py` to rebuild it from the modules in src/.
 * ------------------------------------------------------------------ */

const { useCallback, useEffect, useMemo, useRef, useState } = React;
const { CartesianGrid, Label, Line: RLine, LineChart, ReferenceLine,
        ResponsiveContainer, Tooltip, XAxis, YAxis } = Recharts;


/* ===== 1 — electron configurations ===== */
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

function ElectronConfigBuilder() {
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

/* ===== 2 — orbital shapes ===== */
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

/* ===== 3 — ionisation energies ===== */
/* ------------------------------------------------------------------ *
 * AQA A-Level Chemistry 7405 — 3.1.1.3 Ionisation energies
 * Two views of the same data set:
 *   successive — every IE of one element; the big jumps give the group
 *   trend      — first IE across a period; the dips give sub-level and
 *                spin-pairing evidence (s² → p¹ and p³ → p⁴)
 * Deliberately excluded: quantum numbers (n, l, m), d-orbital geometry.
 *
 * Values in kJ mol⁻¹, the "use" column of
 * https://en.wikipedia.org/wiki/Ionization_energies_of_the_elements_(data_page)
 * ------------------------------------------------------------------ */

const IE_ELEMENTS = [
  { z: 1, symbol: 'H', name: 'Hydrogen', group: 1, ie: [1312] },
  { z: 2, symbol: 'He', name: 'Helium', group: 0, ie: [2372.3, 5250.5] },
  { z: 3, symbol: 'Li', name: 'Lithium', group: 1, ie: [520.2, 7298.1, 11815] },
  { z: 4, symbol: 'Be', name: 'Beryllium', group: 2, ie: [899.5, 1757.1, 14848.7, 21006.6] },
  { z: 5, symbol: 'B', name: 'Boron', group: 3, ie: [800.6, 2427.1, 3659.7, 25025.8, 32826.7] },
  { z: 6, symbol: 'C', name: 'Carbon', group: 4, ie: [1086.5, 2352.6, 4620.5, 6222.7, 37831, 47277] },
  { z: 7, symbol: 'N', name: 'Nitrogen', group: 5, ie: [1402.3, 2856, 4578.1, 7475, 9444.9, 53266.6, 64360] },
  { z: 8, symbol: 'O', name: 'Oxygen', group: 6, ie: [1313.9, 3388.3, 5300.5, 7469.2, 10989.5, 13326.5, 71330, 84078] },
  { z: 9, symbol: 'F', name: 'Fluorine', group: 7, ie: [1681, 3374.2, 6050.4, 8407.7, 11022.7, 15164.1, 17868, 92038.1, 106434.3] },
  { z: 10, symbol: 'Ne', name: 'Neon', group: 0, ie: [2080.7, 3952.3, 6122, 9371, 12177, 15238, 19999, 23069.5, 115379.5, 131432] },
  { z: 11, symbol: 'Na', name: 'Sodium', group: 1, ie: [495.8, 4562, 6910.3, 9543, 13354, 16613, 20117, 25496, 28932, 141362, 159076] },
  { z: 12, symbol: 'Mg', name: 'Magnesium', group: 2, ie: [737.7, 1450.7, 7732.7, 10542.5, 13630, 18020, 21711, 25661, 31653, 35458, 169988, 189368] },
  { z: 13, symbol: 'Al', name: 'Aluminium', group: 3, ie: [577.5, 1816.7, 2744.8, 11577, 14842, 18379, 23326, 27465, 31853, 38473, 42647, 201266, 222316] },
  { z: 14, symbol: 'Si', name: 'Silicon', group: 4, ie: [786.5, 1577.1, 3231.6, 4355.5, 16091, 19805, 23780, 29287, 33878, 38726, 45962, 50502, 235196, 257923] },
  { z: 15, symbol: 'P', name: 'Phosphorus', group: 5, ie: [1011.8, 1907, 2914.1, 4963.6, 6273.9, 21267, 25431, 29872, 35905, 40950, 46261, 54110, 59024, 271791, 296195] },
  { z: 16, symbol: 'S', name: 'Sulfur', group: 6, ie: [999.6, 2252, 3357, 4556, 7004.3, 8495.8, 27107, 31719, 36621, 43177, 48710, 54460, 62930, 68216, 311048, 337138] },
  { z: 17, symbol: 'Cl', name: 'Chlorine', group: 7, ie: [1251.2, 2298, 3822, 5158.6, 6542, 9362, 11018, 33604, 38600, 43961, 51068, 57119, 63363, 72341, 78095, 352994, 380760] },
  { z: 18, symbol: 'Ar', name: 'Argon', group: 0, ie: [1520.6, 2665.8, 3931, 5771, 7238, 8781, 11995, 13842, 40760, 46186, 52002, 59653, 66199, 72918, 82473, 88576, 397605, 427066] },
  { z: 19, symbol: 'K', name: 'Potassium', group: 1, ie: [418.8, 3052, 4420, 5877, 7975, 9590, 11343, 14944, 16963.7, 48610, 54490, 60730, 68950, 75900, 83080, 93400, 99710, 444880, 476063] },
  { z: 20, symbol: 'Ca', name: 'Calcium', group: 2, ie: [589.8, 1145.4, 4912.4, 6491, 8153, 10496, 12270, 14206, 18191, 20385, 57110, 63410, 70110, 78890, 86310, 94000, 104900, 111711, 494850, 527762] },
];

const SHELL_COLOUR = { 1: '#7f1d1d', 2: '#dc2626', 3: '#f59e0b', 4: '#8b5cf6' };
/** A period is the outer shell being filled, so periods share the shell palette. */
const PERIOD_COLOUR = SHELL_COLOUR;
const GROUP_OPTIONS = [1, 2, 3, 4, 5, 6, 7, 0];
const UNKNOWN = '#475569';

const CHART_MODES = [
  { id: 'successive', label: 'Successive IEs (one element)' },
  { id: 'trend', label: 'First IE across a period' },
];

/** Electrons per shell for Z ≤ 20 (2, 8, 8, 2). */
function shellPopulations(z) {
  return [
    Math.min(z, 2),
    Math.min(Math.max(z - 2, 0), 8),
    Math.min(Math.max(z - 10, 0), 8),
    Math.max(z - 18, 0),
  ];
}

/** Which shell the k-th removed electron (1-indexed) comes from — outermost first. */
function shellOfRemoval(z) {
  const pops = shellPopulations(z);
  const shells = [];
  for (let n = 4; n >= 1; n -= 1) {
    for (let i = 0; i < pops[n - 1]; i += 1) shells.push(n);
  }
  return shells;
}

/** The sub-level the outermost electron sits in — 1s, 2s, 2p, 3s, 3p or 4s. */
function outerSubLevel(z) {
  if (z <= 2) return '1s';
  if (z <= 4) return '2s';
  if (z <= 10) return '2p';
  if (z <= 12) return '3s';
  if (z <= 18) return '3p';
  return '4s';
}

const outerShell = (z) => shellPopulations(z).filter((n) => n > 0).length;

function buildSeries(element) {
  const shells = shellOfRemoval(element.z);
  return element.ie.map((ie, i) => ({
    k: i + 1,
    ie,
    shell: shells[i],
  }));
}

/** A jump is where the next electron comes from a shell closer to the nucleus. */
function findJumps(series) {
  const jumps = [];
  for (let i = 0; i < series.length - 1; i += 1) {
    if (series[i].shell !== series[i + 1].shell) {
      jumps.push({
        at: i + 1.5,
        after: i + 1,
        from: series[i].shell,
        to: series[i + 1].shell,
        factor: series[i + 1].ie / series[i].ie,
      });
    }
  }
  return jumps;
}

/** First IE of every element, tagged with its period. */
function buildTrend() {
  return IE_ELEMENTS.map((el) => ({
    z: el.z,
    symbol: el.symbol,
    name: el.name,
    group: el.group,
    ie: el.ie[0],
    sub: outerSubLevel(el.z),
    period: outerShell(el.z),
  }));
}

/**
 * Every place the first IE falls instead of rising. Each has one of three
 * causes, and all three are AQA explanations in their own right.
 */
function findDips(trend) {
  const dips = [];
  for (let i = 1; i < trend.length; i += 1) {
    const prev = trend[i - 1];
    const el = trend[i];
    if (el.ie >= prev.ie) continue;
    let tag;
    let why;
    if (outerShell(el.z) > outerShell(prev.z)) {
      tag = 'new shell';
      why = `${el.symbol} starts a new shell, so its outer electron is further from the nucleus and shielded by all the filled inner shells — much easier to remove.`;
    } else if (el.sub.endsWith('p') && prev.sub.endsWith('s')) {
      tag = 's² → p¹';
      why = `${el.symbol} is the first element to put an electron in the ${el.sub} sub-level. A ${el.sub} electron is higher in energy than the ${prev.sub} pair below it and is shielded by it, so it comes off more easily than in ${prev.symbol}.`;
    } else {
      tag = 'p³ → p⁴';
      why = `${prev.symbol} has three ${prev.sub} electrons, one in each orbital. ${el.symbol} has to pair the fourth one up, and the two electrons sharing an orbital repel each other — so one is easier to remove despite the extra proton.`;
    }
    dips.push({ z: el.z, from: prev.symbol, to: el.symbol, tag, why, drop: prev.ie - el.ie });
  }
  return dips;
}

const fmt = (v) => v.toLocaleString('en-GB');

/** Round tick values (1/2/2.5/5 × a power of ten) so a linear axis reads cleanly. */
function niceTicks(max, target = 7) {
  const raw = max / target;
  const mag = 10 ** Math.floor(Math.log10(raw));
  const step = [1, 2, 2.5, 5, 10].map((m) => m * mag).find((v) => v >= raw) ?? 10 * mag;
  const top = Math.ceil(max / step) * step;
  return Array.from({ length: Math.round(top / step) + 1 }, (_, i) => i * step);
}

function ChartDot({ cx, cy, payload, hideShells, colourKey }) {
  if (cx == null || cy == null) return null;
  const fill = hideShells
    ? UNKNOWN
    : colourKey === 'period'
      ? PERIOD_COLOUR[payload.period]
      : SHELL_COLOUR[payload.shell];
  return <circle cx={cx} cy={cy} r={5} fill={fill} stroke="#fff" strokeWidth={1.5} />;
}

function SuccessiveTooltip({ active, payload, hideShells }) {
  if (!active || !payload?.length) return null;
  const d = payload[0].payload;
  return (
    <div className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs shadow-lg">
      <p className="font-bold text-slate-900">Electron {d.k} removed</p>
      <p className="text-slate-700">IE = {fmt(d.ie)} kJ mol⁻¹</p>
      {!hideShells && (
        <p className="font-semibold" style={{ color: SHELL_COLOUR[d.shell] }}>
          from shell n = {d.shell}
        </p>
      )}
    </div>
  );
}

function TrendTooltip({ active, payload }) {
  if (!active || !payload?.length) return null;
  const d = payload[0].payload;
  return (
    <div className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs shadow-lg">
      <p className="font-bold text-slate-900">{d.name} ({d.symbol})</p>
      <p className="text-slate-700">1st IE = {fmt(d.ie)} kJ mol⁻¹</p>
      <p className="font-semibold" style={{ color: PERIOD_COLOUR[d.period] }}>
        period {d.period} · outer electron in {d.sub}
      </p>
    </div>
  );
}

function IonisationEnergyGraph() {
  const [chartMode, setChartMode] = useState('successive');
  const [z, setZ] = useState(11);
  const [quizMode, setQuizMode] = useState(false);
  const [quizZ, setQuizZ] = useState(() => 3 + Math.floor(Math.random() * 18));
  const [answer, setAnswer] = useState(null);
  const [score, setScore] = useState({ right: 0, asked: 0 });

  const trendView = chartMode === 'trend' && !quizMode;

  const element = IE_ELEMENTS[(quizMode ? quizZ : z) - 1];
  const series = useMemo(() => buildSeries(element), [element]);
  const jumps = useMemo(() => findJumps(series), [series]);

  const firstJump = jumps[0];
  const trend = useMemo(() => buildTrend(), []);
  const dips = useMemo(() => findDips(trend), [trend]);

  // Before the student answers, the shell colouring would give the game away.
  const hideShells = quizMode && answer === null;

  const nextQuestion = useCallback(() => {
    setQuizZ((prev) => {
      let next = prev;
      while (next === prev) next = 3 + Math.floor(Math.random() * 18);
      return next;
    });
    setAnswer(null);
  }, []);

  const enterQuiz = useCallback(() => {
    setChartMode('successive');
    setQuizMode(true);
    setAnswer(null);
    setScore({ right: 0, asked: 0 });
  }, []);

  const submit = useCallback((choice) => {
    if (answer !== null) return;
    setAnswer(choice);
    setScore((s) => ({ right: s.right + (choice === element.group ? 1 : 0), asked: s.asked + 1 }));
  }, [answer, element.group]);

  const outerCount = firstJump ? firstJump.after : element.ie.length;
  const symbolOf = useMemo(() => Object.fromEntries(trend.map((d) => [d.z, d.symbol])), [trend]);

  const trendTicks = useMemo(() => niceTicks(Math.max(...trend.map((d) => d.ie))), [trend]);
  const successiveTicks = useMemo(() => niceTicks(Math.max(...series.map((d) => d.ie))), [series]);

  // On one linear axis the inner-shell values dwarf the outer ones, so the
  // group-defining first jump can be a pixel high. This is the same linear
  // plot over a smaller range — no log scale, just a closer look.
  const zoom = useMemo(() => {
    if (!firstJump) return null;
    const rows = series.slice(0, Math.min(series.length, firstJump.after + 2));
    return { rows, ticks: niceTicks(Math.max(...rows.map((d) => d.ie)), 5) };
  }, [series, firstJump]);

  return (
    <div className="space-y-5">
      {/* ---------------- Controls ---------------- */}
      <div className="flex flex-wrap items-end gap-4 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="flex flex-col gap-1 text-xs font-semibold uppercase tracking-wide text-slate-500">
          Graph
          <div className="flex overflow-hidden rounded-lg border border-slate-300">
            {CHART_MODES.map((m) => (
              <button
                key={m.id}
                type="button"
                onClick={() => { setChartMode(m.id); if (m.id === 'trend') setQuizMode(false); }}
                className={`px-3 py-2 text-sm font-semibold transition ${
                  chartMode === m.id ? 'bg-red-600 text-white' : 'bg-white text-slate-600 hover:bg-slate-50'
                }`}
              >
                {m.label}
              </button>
            ))}
          </div>
        </div>

        {!trendView && (
          <div className="flex flex-col gap-1 text-xs font-semibold uppercase tracking-wide text-slate-500">
            Element (Z = 1–20)
            {/* Naming the element here would give the quiz answer away. */}
            {quizMode ? (
              <span className="rounded-lg border border-dashed border-slate-300 bg-slate-100 px-3 py-2 text-sm font-bold normal-case tracking-normal text-slate-400">
                ? — hidden until you answer
              </span>
            ) : (
              <select
                value={z}
                onChange={(e) => setZ(Number(e.target.value))}
                className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-900 focus:border-red-500 focus:outline-none focus:ring-2 focus:ring-red-200"
              >
                {IE_ELEMENTS.map((el) => (
                  <option key={el.z} value={el.z}>{el.z} — {el.symbol} ({el.name})</option>
                ))}
              </select>
            )}
          </div>
        )}

        <div className="ml-auto flex items-end gap-3">
          {quizMode && (
            <span className="rounded-lg bg-purple-100 px-3 py-2 text-sm font-bold text-purple-800">
              Score {score.right} / {score.asked}
            </span>
          )}
          <button
            type="button"
            onClick={() => (quizMode ? setQuizMode(false) : enterQuiz())}
            className={`rounded-lg px-4 py-2 text-sm font-bold transition ${
              quizMode
                ? 'border border-slate-300 bg-white text-slate-700 hover:bg-slate-50'
                : 'bg-purple-600 text-white hover:bg-purple-700'
            }`}
          >
            {quizMode ? 'Exit quiz' : '🎯 Predict the Group'}
          </button>
        </div>
      </div>

      {/* ---------------- Graph ---------------- */}
      <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="mb-2 flex items-baseline justify-between">
          <h3 className="text-sm font-bold text-slate-700">
            {trendView
              ? 'First ionisation energy — hydrogen to calcium'
              : hideShells
                ? 'Unknown element — successive ionisation energies'
                : `${element.name} (${element.symbol}) — successive ionisation energies`}
          </h3>
          <span className="text-xs text-slate-500">IE / kJ mol⁻¹</span>
        </div>

        <div className={`w-full ${trendView ? 'h-[26rem]' : 'h-[34rem]'}`}>
          <ResponsiveContainer width="100%" height="100%">
            {trendView ? (
              <LineChart data={trend} margin={{ top: 28, right: 24, bottom: 34, left: 12 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis
                  dataKey="z"
                  type="number"
                  domain={[0.5, 20.5]}
                  ticks={trend.map((d) => d.z)}
                  tickFormatter={(v) => symbolOf[v] ?? v}
                  tick={{ fontSize: 12 }}
                  stroke="#64748b"
                >
                  <Label value="Element (increasing atomic number)" position="bottom" offset={12} fontSize={12} />
                </XAxis>
                <YAxis
                  tick={{ fontSize: 12 }}
                  stroke="#64748b"
                  width={64}
                  tickFormatter={fmt}
                  ticks={trendTicks}
                  domain={[0, trendTicks[trendTicks.length - 1]]}
                />
                <Tooltip content={<TrendTooltip />} />
                {dips.map((d) => (
                  <ReferenceLine key={d.z} x={d.z} stroke="#7c3aed" strokeDasharray="6 4" strokeWidth={2}>
                    <Label value={`▼ ${d.tag}`} position="top" fill="#6d28d9" fontSize={11} fontWeight={700} />
                  </ReferenceLine>
                ))}
                <RLine
                  type="linear"
                  dataKey="ie"
                  stroke="#94a3b8"
                  strokeWidth={2}
                  isAnimationActive={false}
                  dot={<ChartDot colourKey="period" />}
                  activeDot={{ r: 7 }}
                />
              </LineChart>
            ) : (
              <LineChart data={series} margin={{ top: 24, right: 24, bottom: 34, left: 12 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis
                  dataKey="k"
                  type="number"
                  domain={[0.5, series.length + 0.5]}
                  ticks={series.map((d) => d.k)}
                  tick={{ fontSize: 12 }}
                  stroke="#64748b"
                >
                  <Label value="Number of electrons removed" position="bottom" offset={12} fontSize={12} />
                </XAxis>
                <YAxis
                  tick={{ fontSize: 12 }}
                  stroke="#64748b"
                  width={78}
                  tickFormatter={fmt}
                  ticks={successiveTicks}
                  domain={[0, successiveTicks[successiveTicks.length - 1]]}
                />
                <Tooltip content={<SuccessiveTooltip hideShells={hideShells} />} />
                {!hideShells && jumps.map((j) => (
                  <ReferenceLine key={j.at} x={j.at} stroke="#7c3aed" strokeDasharray="6 4" strokeWidth={2}>
                    <Label
                      value={`shell change n=${j.from} → n=${j.to} (×${j.factor.toFixed(1)})`}
                      position="top"
                      fill="#6d28d9"
                      fontSize={11}
                      fontWeight={700}
                    />
                  </ReferenceLine>
                ))}
                <RLine
                  type="linear"
                  dataKey="ie"
                  stroke={hideShells ? UNKNOWN : '#94a3b8'}
                  strokeWidth={2}
                  isAnimationActive={false}
                  dot={<ChartDot hideShells={hideShells} />}
                  activeDot={{ r: 7 }}
                />
              </LineChart>
            )}
          </ResponsiveContainer>
        </div>

        {!trendView && zoom && (
          <div className="mt-4 border-t border-slate-200 pt-3">
            <p className="mb-1 text-xs font-bold uppercase tracking-wide text-slate-500">
              Closer look at the first jump — same kJ mol⁻¹ axis, smaller range
            </p>
            <div className="h-[14rem] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={zoom.rows} margin={{ top: 18, right: 24, bottom: 26, left: 12 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis
                    dataKey="k"
                    type="number"
                    domain={[0.5, zoom.rows.length + 0.5]}
                    ticks={zoom.rows.map((d) => d.k)}
                    tick={{ fontSize: 12 }}
                    stroke="#64748b"
                  >
                    <Label value="Number of electrons removed" position="bottom" offset={8} fontSize={11} />
                  </XAxis>
                  <YAxis
                    tick={{ fontSize: 12 }}
                    stroke="#64748b"
                    width={78}
                    tickFormatter={fmt}
                    ticks={zoom.ticks}
                    domain={[0, zoom.ticks[zoom.ticks.length - 1]]}
                  />
                  <Tooltip content={<SuccessiveTooltip hideShells={hideShells} />} />
                  <ReferenceLine x={firstJump.at} stroke="#7c3aed" strokeDasharray="6 4" strokeWidth={2}>
                    <Label
                      value={`first jump ×${firstJump.factor.toFixed(1)}`}
                      position="top"
                      fill="#6d28d9"
                      fontSize={11}
                      fontWeight={700}
                    />
                  </ReferenceLine>
                  <RLine
                    type="linear"
                    dataKey="ie"
                    stroke={hideShells ? UNKNOWN : '#94a3b8'}
                    strokeWidth={2}
                    isAnimationActive={false}
                    dot={<ChartDot hideShells={hideShells} />}
                    activeDot={{ r: 7 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}

        {trendView ? (
          <div className="mt-2 flex flex-wrap gap-4 text-xs font-semibold text-slate-600">
            {[1, 2, 3, 4].map((n) => (
              <span key={n} className="flex items-center gap-1.5">
                <span className="h-3 w-3 rounded-full" style={{ background: PERIOD_COLOUR[n] }} />
                period {n}
              </span>
            ))}
          </div>
        ) : !hideShells && (
          <div className="mt-2 flex flex-wrap gap-4 text-xs font-semibold text-slate-600">
            {[...new Set(series.map((d) => d.shell))].sort().map((n) => (
              <span key={n} className="flex items-center gap-1.5">
                <span className="h-3 w-3 rounded-full" style={{ background: SHELL_COLOUR[n] }} />
                shell n = {n}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* ---------------- Values ---------------- */}
      {!hideShells && (
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <p className="mb-2 text-xs font-bold uppercase tracking-wide text-slate-500">
            {trendView
              ? 'First ionisation energies / kJ mol⁻¹'
              : `Successive ionisation energies of ${element.name} / kJ mol⁻¹`}
          </p>
          <div className="max-h-72 overflow-auto rounded-lg border border-slate-200">
            <table className="w-full border-collapse text-left text-sm">
              <thead className="sticky top-0 bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                {trendView ? (
                  <tr>
                    <th className="px-3 py-2 font-bold">Z</th>
                    <th className="px-3 py-2 font-bold">Element</th>
                    <th className="px-3 py-2 font-bold">Period</th>
                    <th className="px-3 py-2 font-bold">Outer sub-level</th>
                    <th className="px-3 py-2 text-right font-bold">1st IE</th>
                    <th className="px-3 py-2 text-right font-bold">Change</th>
                  </tr>
                ) : (
                  <tr>
                    <th className="px-3 py-2 font-bold">Electron removed</th>
                    <th className="px-3 py-2 font-bold">Ion formed</th>
                    <th className="px-3 py-2 font-bold">From shell</th>
                    <th className="px-3 py-2 text-right font-bold">IE</th>
                    <th className="px-3 py-2 text-right font-bold">× previous</th>
                  </tr>
                )}
              </thead>
              <tbody className="divide-y divide-slate-100">
                {trendView
                  ? trend.map((d, i) => {
                      const change = i === 0 ? null : d.ie - trend[i - 1].ie;
                      return (
                        <tr key={d.z} className={change !== null && change < 0 ? 'bg-purple-50' : undefined}>
                          <td className="px-3 py-1.5 font-mono text-slate-500">{d.z}</td>
                          <td className="px-3 py-1.5 font-semibold text-slate-800">
                            <span className="mr-2 inline-block h-2.5 w-2.5 rounded-full align-middle" style={{ background: PERIOD_COLOUR[d.period] }} />
                            {d.symbol} <span className="font-normal text-slate-500">{d.name}</span>
                          </td>
                          <td className="px-3 py-1.5 text-slate-600">{d.period}</td>
                          <td className="px-3 py-1.5 font-mono text-slate-600">{d.sub}</td>
                          <td className="px-3 py-1.5 text-right font-mono font-semibold text-slate-900">{fmt(d.ie)}</td>
                          <td className={`px-3 py-1.5 text-right font-mono ${change !== null && change < 0 ? 'font-bold text-purple-700' : 'text-slate-500'}`}>
                            {change === null ? '—' : `${change > 0 ? '+' : '−'}${fmt(Math.abs(Math.round(change * 10) / 10))}`}
                          </td>
                        </tr>
                      );
                    })
                  : series.map((d, i) => {
                      const ratio = i === 0 ? null : d.ie / series[i - 1].ie;
                      const jumped = i > 0 && series[i - 1].shell !== d.shell;
                      return (
                        <tr key={d.k} className={jumped ? 'bg-purple-50' : undefined}>
                          <td className="px-3 py-1.5 font-mono text-slate-500">{d.k}</td>
                          <td className="px-3 py-1.5 font-semibold text-slate-800">
                            {element.symbol}{d.k === 1 ? '⁺' : `${sup(d.k)}⁺`}
                          </td>
                          <td className="px-3 py-1.5">
                            <span className="mr-2 inline-block h-2.5 w-2.5 rounded-full align-middle" style={{ background: SHELL_COLOUR[d.shell] }} />
                            <span className="text-slate-600">n = {d.shell}</span>
                          </td>
                          <td className="px-3 py-1.5 text-right font-mono font-semibold text-slate-900">{fmt(d.ie)}</td>
                          <td className={`px-3 py-1.5 text-right font-mono ${jumped ? 'font-bold text-purple-700' : 'text-slate-500'}`}>
                            {ratio === null ? '—' : `×${ratio.toFixed(2)}`}
                          </td>
                        </tr>
                      );
                    })}
              </tbody>
            </table>
          </div>
          <p className="mt-2 text-xs text-slate-500">
            Highlighted rows are the {trendView ? 'dips' : 'shell changes'}. Data: the “use” column of the
            Wikipedia ionisation-energy data page.
          </p>
        </div>
      )}

      {/* ---------------- Explanation / quiz ---------------- */}
      {trendView ? (
        <div className="grid gap-4 md:grid-cols-2">
          <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <p className="text-xs font-bold uppercase tracking-wide text-slate-500">The dips — and why they matter</p>
            <ul className="mt-2 space-y-2 text-sm text-slate-700">
              <li>
                Across a period the first IE <b>rises overall</b>: the nuclear charge increases while
                electrons go into the <b>same shell</b>, so shielding barely changes and the outer
                electron is held more tightly.
              </li>
              {dips.map((d) => (
                <li key={d.z}>
                  <b>{d.from} → {d.to} ({d.tag}, down {fmt(Math.round(d.drop))} kJ mol⁻¹):</b> {d.why}
                </li>
              ))}
            </ul>
          </div>
          <div className="rounded-xl border-l-4 border-purple-500 bg-purple-50 p-4">
            <p className="text-xs font-black uppercase tracking-wide text-purple-800">AQA Exam Tip</p>
            <ul className="mt-2 space-y-2 text-sm leading-snug text-purple-900">
              <li>
                The two dips in each period are the <b>experimental evidence for sub-levels</b> —
                they are the reason we say electrons occupy s and p sub-levels rather than one
                smooth shell.
              </li>
              <li>
                For the <b>p³ → p⁴</b> dip say <b>repulsion between the paired electrons</b> in the
                same p orbital. Do not say the half-filled sub-level is "extra stable" on its own —
                mark schemes want the repulsion.
              </li>
              <li>
                For the <b>s² → p¹</b> dip say the p electron is in a <b>higher-energy sub-level</b>
                and is <b>shielded by the s² pair</b>.
              </li>
            </ul>
          </div>
        </div>
      ) : quizMode ? (
        <div className="rounded-xl border-l-4 border-purple-500 bg-purple-50 p-4">
          <p className="text-xs font-black uppercase tracking-wide text-purple-800">
            AQA Predict the Group
          </p>
          <p className="mt-1 text-sm text-purple-900">
            Find the <b>first big jump</b> in the graph. The number of electrons removed
            <i> before</i> that jump is the number of electrons in the outer shell — which gives you
            the group. Which group is this element in?
          </p>

          <div className="mt-3 flex flex-wrap gap-2">
            {GROUP_OPTIONS.map((g) => {
              const chosen = answer === g;
              const isRight = g === element.group;
              const revealed = answer !== null;
              return (
                <button
                  key={g}
                  type="button"
                  onClick={() => submit(g)}
                  disabled={revealed}
                  className={`h-11 w-14 rounded-lg border-2 text-sm font-bold transition ${
                    revealed && isRight
                      ? 'border-emerald-600 bg-emerald-600 text-white'
                      : chosen
                        ? 'border-red-600 bg-red-600 text-white'
                        : 'border-slate-300 bg-white text-slate-700 hover:border-purple-500 disabled:opacity-50'
                  }`}
                >
                  {g === 0 ? '0/8' : g}
                </button>
              );
            })}
          </div>

          {answer !== null && (
            <div className="mt-3 space-y-2 rounded-lg bg-white p-3 text-sm">
              <p className={answer === element.group ? 'font-bold text-emerald-700' : 'font-bold text-red-700'}>
                {answer === element.group ? '✔ Correct' : `✘ Not quite — it is group ${element.group === 0 ? '0' : element.group}`}
                {' — '}the element is {element.name} ({element.symbol}).
              </p>
              <p className="text-slate-700">
                {firstJump ? (
                  <>
                    The first large jump comes between electron {firstJump.after} and electron{' '}
                    {firstJump.after + 1} (IE rises by a factor of {firstJump.factor.toFixed(1)}).
                    So {outerCount} electron{outerCount === 1 ? '' : 's'} sit in the outer shell,
                    and the next electron has to be pulled out of the shell below — closer to the
                    nucleus, less shielded and therefore much harder to remove.
                  </>
                ) : (
                  <>There is no jump to find: every electron comes from the same shell.</>
                )}
              </p>
              <button
                type="button"
                onClick={nextQuestion}
                className="rounded-lg bg-purple-600 px-4 py-2 text-sm font-bold text-white hover:bg-purple-700"
              >
                Next element →
              </button>
            </div>
          )}
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <p className="text-xs font-bold uppercase tracking-wide text-slate-500">What the graph shows</p>
            <ul className="mt-2 space-y-1.5 text-sm text-slate-700">
              <li>
                Each successive IE is larger: the ion left behind is more positive, so the remaining
                electrons are held more strongly.
              </li>
              <li>
                {firstJump
                  ? `The first big jump is after ${outerCount} electron${outerCount === 1 ? '' : 's'} — ${element.symbol} has ${outerCount} electron${outerCount === 1 ? '' : 's'} in its outer shell, so it is in group ${element.group === 0 ? '0' : element.group}.`
                  : `${element.symbol} has only one shell of electrons, so there is no jump to see.`}
              </li>
              <li>
                Configuration by shell: {shellPopulations(element.z).filter(Boolean).join(', ')}.
              </li>
            </ul>
          </div>

          <div className="rounded-xl border-l-4 border-purple-500 bg-purple-50 p-4">
            <p className="text-xs font-black uppercase tracking-wide text-purple-800">AQA Exam Tip</p>
            <ul className="mt-2 space-y-2 text-sm leading-snug text-purple-900">
              <li>
                Define it precisely: the <b>first ionisation energy</b> is the energy needed to remove
                one mole of electrons from one mole of gaseous atoms to form one mole of gaseous 1+ ions.
              </li>
              <li>
                A <b>large jump</b> means the next electron is being removed from a shell <b>closer to
                the nucleus</b>, with <b>less shielding</b> — count the electrons before the jump to get
                the group.
              </li>
              <li>
                On this linear scale the inner-shell electrons tower over the outer ones — that
                compression <i>is</i> the point: electrons closer to the nucleus are held
                enormously more strongly.
              </li>
            </ul>
          </div>
        </div>
      )}
    </div>
  );
}

/* ===== hub ===== */

const TABS = [
  {
    id: 'config',
    label: 'Electron Configurations',
    spec: '3.1.1.2',
    blurb: 'Build configurations with Aufbau, Hund and Pauli — including the Cr/Cu anomalies and transition metal ions.',
    Component: ElectronConfigBuilder,
  },
  {
    id: 'orbitals',
    label: 'Orbital Shapes (3D)',
    spec: '3.1.1.2',
    blurb: 'Rotate the s and 2p probability clouds and find the nodal plane.',
    Component: OrbitalViewer3D,
  },
  {
    id: 'ionisation',
    label: 'Ionisation Energies',
    spec: '3.1.1.3',
    blurb: 'Successive IEs and the shell jumps that give the group — or first IEs across a period and the sub-level dips.',
    Component: IonisationEnergyGraph,
  },
];

function AQAChemistryHub() {
  const [active, setActive] = useState('config');
  const tab = TABS.find((t) => t.id === active) ?? TABS[0];
  const { Component } = tab;

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <header className="border-b-4 border-red-600 bg-white">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-3 px-4 py-4">
          <span className="rounded-lg bg-red-600 px-2.5 py-1 text-sm font-black text-white">Chemistry</span>
          <span className="rounded-lg bg-purple-600 px-2.5 py-1 text-sm font-black text-white">A-Level</span>
          <h1 className="text-xl font-black tracking-tight">Atomic Structure Toolkit</h1>
          <span className="text-sm font-semibold text-slate-500">AQA 7405 · 3.1.1</span>
        </div>

        <nav className="mx-auto flex max-w-6xl gap-1 px-4" aria-label="Tools">
          {TABS.map((t) => {
            const on = t.id === active;
            return (
              <button
                key={t.id}
                type="button"
                onClick={() => setActive(t.id)}
                aria-current={on ? 'page' : undefined}
                className={`-mb-px rounded-t-lg border border-b-0 px-4 py-2.5 text-sm font-bold transition ${
                  on
                    ? 'border-slate-200 bg-slate-50 text-red-700'
                    : 'border-transparent text-slate-500 hover:bg-slate-100 hover:text-slate-800'
                }`}
              >
                {t.label}
                <span className="ml-2 hidden text-xs font-semibold text-slate-400 sm:inline">{t.spec}</span>
              </button>
            );
          })}
        </nav>
      </header>

      <main className="mx-auto max-w-6xl px-4 py-6">
        <p className="mb-4 text-sm text-slate-600">{tab.blurb}</p>
        <Component />
      </main>

      <footer className="mx-auto max-w-6xl px-4 pb-8 text-xs text-slate-400">
        Content limited to the AQA A-Level Chemistry (7405) specification: no quantum numbers,
        no d-orbital shapes.
      </footer>
    </div>
  );
}

ReactDOM.createRoot(document.getElementById('root')).render(<AQAChemistryHub />);
