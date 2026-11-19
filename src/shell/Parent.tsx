import { RotateCcw } from 'lucide-react'
import { Gate, isUnlocked } from './Gate'
import { lazy, Suspense, useMemo, useState, type ComponentType } from 'react'
import { NavLink, Route, Routes } from 'react-router-dom'
import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { dailyCounts, shared, streak, totals, useShared, WORLD_IDS, type WorldId } from '../shared/store'
import { worldMeta, WORLDS } from '../shared/worlds'
import { Card, Eyebrow, Loading, PageTitle, WorldIcon } from './ui'

// Each world's own detailed dashboard, reused from the original apps (loaded only when opened).
const PANELS: { id: WorldId; label: string; load: () => Promise<{ default: ComponentType }> }[] = [
  { id: 'words', label: 'Words', load: () => import('../worlds/words/ParentPanel') },
  { id: 'puzzles', label: 'Puzzles', load: () => import('../worlds/puzzles/ParentPanel') },
  { id: 'brain', label: 'Brain Gym', load: () => import('../worlds/brain/ParentPanel') },
  { id: 'maps', label: 'Maps', load: () => import('../worlds/maps/ParentPanel') },
  { id: 'shop', label: 'Shop', load: () => import('../worlds/shop/ParentPanel') },
]
const LAZY = Object.fromEntries(PANELS.map((p) => [p.id, lazy(p.load)])) as Record<string, ComponentType>

function Overview() {
  const s = useShared()
  const rows = useMemo(() => dailyCounts(s, 14), [s])
  const t = totals(s)
  const activeDays = new Set(s.log.map((a) => a.day)).size
  return (
    <>
      <div className="mb-6 grid gap-3 sm:grid-cols-4">
        {[
          ['Finished activities', t.plays],
          ['Stars', t.stars],
          ['Days played', activeDays],
          ['Current streak', streak(s)],
        ].map(([k, v]) => (
          <Card key={k} className="p-4">
            <Eyebrow>{k}</Eyebrow>
            <p className="mt-1 text-3xl font-black">{v}</p>
          </Card>
        ))}
      </div>
      <Card className="mb-6 p-4 sm:p-5">
        <h2 className="font-black">Activities per day, last 14 days</h2>
        <p className="text-sm text-ink-soft">One bar per day, split by world.</p>
        <div className="mt-4 h-64" role="img" aria-label={`Bar chart of finished activities per day for the last 14 days. Total ${rows.reduce((n, r) => n + WORLD_IDS.reduce((m, w) => m + r[w], 0), 0)}.`}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={rows} margin={{ top: 4, right: 4, left: -24, bottom: 0 }}>
              <CartesianGrid vertical={false} stroke="#E2E3E8" />
              <XAxis dataKey="label" tick={{ fontSize: 11, fill: '#586074' }} tickLine={false} axisLine={false} interval="preserveStartEnd" />
              <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: '#586074' }} tickLine={false} axisLine={false} />
              <Tooltip cursor={{ fill: 'rgba(31,36,51,.04)' }} />
              <Legend wrapperStyle={{ fontSize: 12 }} />
              {WORLDS.map((w, i) => (
                <Bar key={w.id} dataKey={w.id} name={w.name} stackId="a" fill={w.accent} radius={i === WORLDS.length - 1 ? [4, 4, 0, 0] : 0} />
              ))}
            </BarChart>
          </ResponsiveContainer>
        </div>
      </Card>
      <Card className="mb-6 overflow-x-auto">
        <table className="w-full min-w-[560px] text-left text-sm">
          <caption className="sr-only">Progress in each world</caption>
          <thead className="text-ink-soft">
            <tr className="border-b border-line">
              <th scope="col" className="px-4 py-3 font-bold">World</th>
              <th scope="col" className="px-4 py-3 font-bold">Where they are</th>
              <th scope="col" className="px-4 py-3 text-right font-bold">Finished</th>
              <th scope="col" className="px-4 py-3 text-right font-bold">Stars</th>
              <th scope="col" className="px-4 py-3 text-right font-bold">XP</th>
              <th scope="col" className="px-4 py-3 font-bold">Last played</th>
            </tr>
          </thead>
          <tbody>
            {WORLDS.map((m) => {
              const w = s.worlds[m.id]
              return (
                <tr key={m.id} className="border-b border-line last:border-0">
                  <th scope="row" className="px-4 py-3"><span className="flex items-center gap-2 font-black"><WorldIcon world={m.id} size={14} tile />{m.name}</span></th>
                  <td className="px-4 py-3">{w.levelLabel || '–'}</td>
                  <td className="px-4 py-3 text-right font-mono">{w.plays}</td>
                  <td className="px-4 py-3 text-right font-mono">{w.stars}</td>
                  <td className="px-4 py-3 text-right font-mono">{w.xp}</td>
                  <td className="px-4 py-3">{w.lastAt ? new Date(w.lastAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }) : '–'}</td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </Card>
      <p className="text-sm text-ink-soft">What each world teaches: {WORLDS.map((w) => `${w.name}: ${w.skill.toLowerCase()}`).join('; ')}.</p>
    </>
  )
}

function Reset() {
  const [confirm, setConfirm] = useState<WorldId | 'all' | null>(null)
  const [done, setDone] = useState('')
  const doReset = (what: WorldId | 'all') => {
    const keys: Record<WorldId, string[]> = {
      words: ['wordwonders:v1'],
      garden: ['word-garden-v2'],
      money: ['money-master:stars', 'money-master:level'],
      puzzles: ['puzzle-quest/v1'],
      brain: ['braingym:v1'],
      pets: ['vpu-save-v1'],
      maps: ['imx-progress-v1'],
      shop: [],
    }
    const worlds = what === 'all' ? WORLD_IDS : [what]
    for (const w of worlds) {
      for (const k of keys[w]) localStorage.removeItem(k)
      if (w === 'shop') void import('idb-keyval').then((m) => m.del('virtual-supermarket-progress'))
      shared.resetWorld(w)
    }
    if (what === 'all') shared.resetAll()
    setConfirm(null)
    setDone(what === 'all' ? 'All progress was cleared. The profile and settings stay.' : `${worldMeta(what).name} progress was cleared.`)
  }
  return (
    <Card className="divide-y divide-line">
      {[...WORLDS.map((w) => ({ id: w.id as WorldId | 'all', name: w.name })), { id: 'all' as const, name: 'Every world' }].map((r) => (
        <div key={r.id} className="flex min-h-16 flex-wrap items-center justify-between gap-3 px-4 py-3">
          <span className="font-bold">{r.name}</span>
          {confirm === r.id ? (
            <span className="flex flex-wrap items-center gap-2">
              <span className="text-sm">Clear {r.id === 'all' ? 'everything' : 'this world'}? This can’t be undone.</span>
              <button className="min-h-11 rounded-xl bg-danger px-4 font-bold text-white" onClick={() => doReset(r.id)}>Clear</button>
              <button className="min-h-11 rounded-xl border border-line px-4 font-bold" onClick={() => setConfirm(null)}>Cancel</button>
            </span>
          ) : (
            <button className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-line px-4 font-bold hover:border-danger hover:text-danger" onClick={() => setConfirm(r.id)}>
              <RotateCcw size={16} aria-hidden /> Reset
            </button>
          )}
        </div>
      ))}
      {done && <p className="px-4 py-3 text-sm font-bold text-success" role="status">{done}</p>}
    </Card>
  )
}

export default function ParentArea() {
  const [open, setOpen] = useState(isUnlocked)
  if (!open) return <Gate onPass={() => setOpen(true)} />
  const tabs = [{ to: '/parent', label: 'Overview', end: true }, ...PANELS.map((p) => ({ to: `/parent/${p.id}`, label: p.label, end: false })), { to: '/parent/reset', label: 'Reset', end: false }]
  return (
    <div className="mx-auto max-w-6xl px-4 pt-6 sm:px-6 sm:pt-10">
      <PageTitle eyebrow="Grown-ups" title="How it is going" lead="A summary across all eight worlds, then each world’s own dashboard." />
      <nav aria-label="Grown-ups sections" className="mb-6 flex gap-1 overflow-x-auto border-b border-line">
        {tabs.map((t) => (
          <NavLink key={t.to} to={t.to} end={t.end} className={({ isActive }) => `-mb-px flex min-h-11 shrink-0 items-center border-b-2 px-3 font-bold ${isActive ? 'border-brand text-brand' : 'border-transparent text-ink-soft hover:text-ink'}`}>
            {t.label}
          </NavLink>
        ))}
      </nav>
      <Suspense fallback={<Loading />}>
        <Routes>
          <Route index element={<Overview />} />
          {PANELS.map((p) => {
            const C = LAZY[p.id]
            return <Route key={p.id} path={p.id} element={<div className={`w-${p.id}`}><C /></div>} />
          })}
          <Route path="reset" element={<Reset />} />
        </Routes>
      </Suspense>
    </div>
  )
}
