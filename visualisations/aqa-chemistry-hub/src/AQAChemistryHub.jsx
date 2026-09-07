import { Suspense, lazy, useState } from 'react';
import ElectronConfigBuilder from './ElectronConfigBuilder.jsx';
import IonisationEnergyGraph from './IonisationEnergyGraph.jsx';

// three.js is heavy — only pull it in when the 3D tab is actually opened.
const OrbitalViewer3D = lazy(() => import('./OrbitalViewer3D.jsx'));

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

function Loading() {
  return (
    <div className="flex h-64 items-center justify-center text-sm font-semibold text-slate-500">
      Loading 3D viewer…
    </div>
  );
}

export default function AQAChemistryHub() {
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
        <Suspense fallback={<Loading />}>
          <Component />
        </Suspense>
      </main>

      <footer className="mx-auto max-w-6xl px-4 pb-8 text-xs text-slate-400">
        Content limited to the AQA A-Level Chemistry (7405) specification: no quantum numbers,
        no d-orbital shapes.
      </footer>
    </div>
  );
}
