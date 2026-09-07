import { useCallback, useMemo, useState } from 'react';
import {
  CartesianGrid,
  Label,
  Line,
  LineChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';

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

const ELEMENTS = [
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
  return ELEMENTS.map((el) => ({
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

const SUPS = { 0: '⁰', 1: '¹', 2: '²', 3: '³', 4: '⁴', 5: '⁵', 6: '⁶', 7: '⁷', 8: '⁸', 9: '⁹' };
const sup = (n) => String(n).split('').map((d) => SUPS[d]).join('');

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

export default function IonisationEnergyGraph() {
  const [chartMode, setChartMode] = useState('successive');
  const [z, setZ] = useState(11);
  const [quizMode, setQuizMode] = useState(false);
  const [quizZ, setQuizZ] = useState(() => 3 + Math.floor(Math.random() * 18));
  const [answer, setAnswer] = useState(null);
  const [score, setScore] = useState({ right: 0, asked: 0 });

  const trendView = chartMode === 'trend' && !quizMode;

  const element = ELEMENTS[(quizMode ? quizZ : z) - 1];
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
                {ELEMENTS.map((el) => (
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
                <Line
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
                <Line
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
                  <Line
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
