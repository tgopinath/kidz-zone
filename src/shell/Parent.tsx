import { RotateCcw } from 'lucide-react'
import { Gate, isUnlocked } from './Gate'
import { lazy, Suspense, useEffect, useMemo, useState, type ComponentType } from 'react'
import { deleteCloudCopy, signIn, signOut, startCloud, syncNow, useCloud } from '../shared/cloud'
import { KzButton } from '../play/ui'
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
              <button className="min-h-16 rounded-xl bg-danger px-4 font-bold text-white" onClick={() => doReset(r.id)}>Clear</button>
              <button className="min-h-16 rounded-xl border border-line px-4 font-bold" onClick={() => setConfirm(null)}>Cancel</button>
            </span>
          ) : (
            <button className="inline-flex min-h-16 items-center gap-2 rounded-xl border border-line px-4 font-bold hover:border-danger hover:text-danger" onClick={() => setConfirm(r.id)}>
              <RotateCcw size={16} aria-hidden /> Reset
            </button>
          )}
        </div>
      ))}
      {done && <p className="px-4 py-3 text-sm font-bold text-success" role="status">{done}</p>}
    </Card>
  )
}

function Account() {
  const c = useCloud()
  useEffect(() => {
    void startCloud()
  }, [])
  const busy = c.status === 'loading' || c.status === 'signing-in' || c.status === 'syncing'
  const when = c.lastSynced ? new Date(c.lastSynced).toLocaleString(undefined, { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' }) : 'Not yet'
  return (
    <div className="mb-6 grid gap-[var(--kz-gap)] lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
      <Card className="space-y-4 p-5 sm:p-6">
        <h2 className="text-2xl font-black">Save progress on all devices</h2>
        {c.user ? (
          <>
            <div className="flex items-center gap-4">
              {c.user.photo ? (
                <img src={c.user.photo} alt="" referrerPolicy="no-referrer" className="size-16 rounded-full object-cover" />
              ) : (
                <span className="grid size-16 place-items-center rounded-full bg-brand-soft text-2xl font-black text-brand" aria-hidden>{(c.user.name || c.user.email || '?')[0].toUpperCase()}</span>
              )}
              <div className="min-w-0">
                <p className="truncate text-lg font-black">{c.user.name || 'Signed in'}</p>
                <p className="truncate text-ink-soft">{c.user.email}</p>
              </div>
            </div>
            <p className="text-ink-soft" role="status">{c.status === 'syncing' ? 'Saving to your account…' : `Last saved to your account: ${when}`}</p>
            <div className="flex flex-wrap gap-3">
              <KzButton tone="primary" size="md" onClick={() => void syncNow()} disabled={busy}>Save now</KzButton>
              <KzButton tone="secondary" size="md" onClick={() => void signOut()}>Sign out</KzButton>
            </div>
            <p className="text-sm text-ink-soft">Signing out keeps all progress on this device.</p>
            <button type="button" className="text-left font-bold text-danger underline-offset-4 hover:underline" onClick={() => { if (confirm('Remove the copy saved in your account? Progress on this device stays.')) void deleteCloudCopy() }}>
              Remove the copy in my account
            </button>
          </>
        ) : c.status === 'unavailable' ? (
          <p className="text-ink-soft" role="status">{c.unavailable}</p>
        ) : (
          <>
            <p className="text-ink-soft">Sign in with Google to save progress on all devices. Children never need to sign in, and the app works fully without it.</p>
            <button type="button" onClick={() => void signIn()} disabled={busy} className="inline-flex min-h-16 items-center gap-3 rounded-2xl border-2 border-line bg-white px-6 text-lg font-black hover:border-ink/30 disabled:opacity-60">
              <svg width="24" height="24" viewBox="0 0 48 48" aria-hidden="true"><path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.7 29.2 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.4-.4-3.5z"/><path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z"/><path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.1 26.7 36 24 36c-5.2 0-9.6-3.3-11.3-7.9l-6.5 5C9.5 39.6 16.2 44 24 44z"/><path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.2-4.1 5.6l6.2 5.2C37 39.2 44 34 44 24c0-1.3-.1-2.4-.4-3.5z"/></svg>
              {c.status === 'signing-in' ? 'Signing in…' : c.status === 'loading' ? 'Getting ready…' : 'Sign in with Google'}
            </button>
          </>
        )}
        {c.error && <p className="rounded-2xl bg-[#fff4e5] p-3 font-bold text-[#8a5a00]" role="alert">{c.error}</p>}
      </Card>
      <Card className="space-y-3 p-5 sm:p-6">
        <h2 className="text-xl font-black">Privacy</h2>
        <ul className="list-disc space-y-2 pl-5 text-ink-soft">
          <li>Sign-in is for grown-ups only, and it is optional.</li>
          <li>Only progress is saved: the child’s first name and age band, stars, levels and settings. No photos, no recordings, no location.</li>
          <li>No ads and no tracking. Your Google name and picture are shown only here.</li>
          <li>Saved in Google Firebase under your account; only you can read it. Remove it here at any time.</li>
        </ul>
      </Card>
    </div>
  )
}

function About() {
  return (
    <Card className="mb-6 space-y-4 p-5 sm:p-6">
      <h2 className="text-2xl font-black">About KidZ Zone</h2>
      <p className="text-ink-soft">Eight learning worlds in one app for children aged 4 to 12. Progress stays on this device.</p>
      <h3 className="text-lg font-black">Pictures and data</h3>
      <ul className="list-disc space-y-2 pl-5 text-ink-soft">
        <li>3D pictures: Fluent Emoji © Microsoft, MIT licence (github.com/microsoft/fluentui-emoji).</li>
        <li>Money: Reserve Bank of India specimen notes and coins from Wikimedia Commons (GODL-India, CC0).</li>
        <li>Maps: Government of India Local Government Directory boundaries via datameet (CC0); Natural Earth (public domain); country facts from mledoze/countries (ODbL); photos from Wikimedia Commons, credited under each photo.</li>
        <li>Speech uses the device’s own voices.</li>
      </ul>
      <p className="text-sm text-ink-soft">Designed and built by Gopinath Thandapani.</p>
    </Card>
  )
}

export default function ParentArea() {
  const [open, setOpen] = useState(isUnlocked)
  if (!open) return <Gate onPass={() => setOpen(true)} />
  const tabs = [{ to: '/parent', label: 'Overview', end: true }, ...PANELS.map((p) => ({ to: `/parent/${p.id}`, label: p.label, end: false })), { to: '/parent/reset', label: 'Reset', end: false }, { to: '/parent/account', label: 'Account', end: false }, { to: '/parent/about', label: 'About', end: false }]
  return (
    <div className="mx-auto max-w-6xl px-4 pt-6 sm:px-6 sm:pt-10">
      <PageTitle eyebrow="Grown-ups" title="How it is going" lead="A summary across all eight worlds, then each world’s own dashboard." />
      <nav aria-label="Grown-ups sections" className="mb-6 flex gap-1 overflow-x-auto border-b border-line">
        {tabs.map((t) => (
          <NavLink key={t.to} to={t.to} end={t.end} className={({ isActive }) => `-mb-px flex min-h-16 shrink-0 items-center border-b-2 px-3 font-bold ${isActive ? 'border-brand text-brand' : 'border-transparent text-ink-soft hover:text-ink'}`}>
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
          <Route path="account" element={<Account />} />
          <Route path="about" element={<About />} />
        </Routes>
      </Suspense>
    </div>
  )
}
