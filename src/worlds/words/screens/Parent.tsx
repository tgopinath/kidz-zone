import { useMemo, useState } from 'react'
import { Button, Card } from '../components/ui'
import { categoryById } from '../data/categories'
import { VOCABULARY, wordById } from '../data/vocabulary'
import { statusOf, today } from '../services/progress'
import { useProgress } from '../state/ProgressProvider'


/** Simple grown-up gate: a multiplication question young children can't easily answer. */
function Gate({ onPass }: { onPass: () => void }) {
  const q = useMemo(() => {
    const a = 3 + Math.floor(Math.random() * 6), b = 4 + Math.floor(Math.random() * 6)
    return { a, b }
  }, [])
  const [v, setV] = useState('')
  const [err, setErr] = useState(false)
  return (
    <Card className="mx-auto max-w-md p-8 text-center">
      <p className="text-6xl" aria-hidden>🔒</p>
      <h1 className="mt-3 font-display text-3xl font-bold text-ink">For grown-ups</h1>
      <p className="mt-1 text-ink-soft">Please answer to continue.</p>
      <form className="mt-6 space-y-4" onSubmit={(e) => { e.preventDefault(); if (Number(v) === q.a * q.b) onPass(); else { setErr(true); setV('') } }}>
        <label className="block font-display text-2xl font-bold text-ink" htmlFor="gate">What is {q.a} × {q.b}?</label>
        <input id="gate" inputMode="numeric" value={v} onChange={(e) => { setV(e.target.value.replace(/\D/g, '')); setErr(false) }} autoFocus
          className="min-h-14 w-40 rounded-2xl bg-primary-soft text-center font-display text-2xl outline-none focus-visible:outline-4 focus-visible:outline-primary" />
        {err && <p className="font-semibold text-[#C2410C]" role="alert">That’s not right. Try again.</p>}
        <div><Button tone="grape" type="submit">Continue</Button></div>
      </form>
    </Card>
  )
}

export function Parent() {
  const [ok, setOk] = useState(false)
  if (!ok) return <Gate onPass={() => setOk(true)} />
  return <Dashboard />
}

export function Dashboard() {
  const { state, profile, progress, updateSettings, resetProgress } = useProgress()
  const [confirmReset, setConfirmReset] = useState(false)
  const s = state.settings

  const words = Object.entries(progress.words)
  const explored = words.filter(([, w]) => w.explored).length
  const mastered = words.filter(([, w]) => statusOf(w) === 'mastered').map(([id]) => wordById(id)).filter((w) => !!w)
  const difficult = words.filter(([, w]) => w.incorrect > 0).sort(([, a], [, b]) => b.incorrect - a.incorrect).slice(0, 12)
  const acc = progress.quiz.total ? Math.round((progress.quiz.correct / progress.quiz.total) * 100) : null
  const last7 = Array.from({ length: 7 }).map((_, i) => {
    const d = new Date(Date.now() - (6 - i) * 86_400_000)
    return { day: d.toLocaleDateString(undefined, { weekday: 'short' }), min: Math.round((progress.secondsByDay[today(d)] ?? 0) / 60) }
  })
  const maxMin = Math.max(5, ...last7.map((d) => d.min))

  return (
    <div className="space-y-6">
      <h2 className="font-display text-2xl font-bold text-ink">Word Wonders dashboard</h2>

      <div className="grid gap-4 lg:grid-cols-2">
        {/* Settings */}
        <Card className="space-y-4 p-5">
          <h2 className="font-display text-xl font-bold text-ink">Learning preferences</h2>
          <Toggle label="Sound effects" checked={s.soundEffects} onChange={(v) => updateSettings({ soundEffects: v })} />
          <Toggle label="Slow pronunciation by default" checked={s.slowSpeech} onChange={(v) => updateSettings({ slowSpeech: v })} />
          <label className="flex items-center justify-between gap-3">
            <span className="font-semibold text-ink-2">Daily learning limit</span>
            <select value={s.dailyLimitMin} onChange={(e) => updateSettings({ dailyLimitMin: Number(e.target.value) })}
              className="min-h-12 rounded-xl bg-primary-soft px-3 font-semibold focus-visible:outline-4 focus-visible:outline-primary">
              {[0, 10, 15, 20, 30, 45, 60].map((m) => <option key={m} value={m}>{m === 0 ? 'No limit' : `${m} minutes`}</option>)}
            </select>
          </label>
          <div className="border-t border-line pt-4">
            {!confirmReset
              ? <Button size="sm" tone="white" onClick={() => setConfirmReset(true)}>Reset {profile.name}’s progress…</Button>
              : (
                <div className="flex flex-wrap items-center gap-3" role="alert">
                  <span className="font-semibold text-[#C2410C]">This erases stars, badges and words for {profile.name}. It can’t be undone.</span>
                  <Button size="sm" tone="berry" onClick={() => { resetProgress(); setConfirmReset(false) }}>Yes, reset</Button>
                  <Button size="sm" tone="white" onClick={() => setConfirmReset(false)}>Cancel</Button>
                </div>
              )}
          </div>
        </Card>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[
          ['Words explored', `${explored}/${VOCABULARY.length}`],
          ['Mastered', mastered.length],
          ['Quiz accuracy', acc === null ? '—' : `${acc}%`],
          ['Lessons completed', Object.keys(progress.lessons).length],
        ].map(([l, v]) => (
          <Card key={l} className="p-4"><p className="font-display text-3xl font-bold text-ink">{v}</p><p className="text-sm text-ink-soft">{l}</p></Card>
        ))}
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="p-5">
          <h2 className="font-display text-xl font-bold text-ink">Time spent (minutes)</h2>
          <div className="mt-4 flex h-40 items-end gap-3" role="img" aria-label={`Minutes per day: ${last7.map((d) => `${d.day} ${d.min}`).join(', ')}`}>
            {last7.map((d) => (
              <div key={d.day} className="flex flex-1 flex-col items-center gap-1">
                <span className="text-xs font-semibold text-ink-soft">{d.min}</span>
                <div className="w-full rounded-t-lg bg-primary" style={{ height: `${(d.min / maxMin) * 110 + 2}px` }} />
                <span className="text-xs text-ink-soft">{d.day}</span>
              </div>
            ))}
          </div>
        </Card>
        <Card className="p-5">
          <h2 className="font-display text-xl font-bold text-ink">Words that need practice</h2>
          {difficult.length === 0 ? <p className="mt-3 text-ink-soft">No tricky words yet.</p> : (
            <ul className="mt-3 divide-y divide-line">
              {difficult.map(([id, w]) => {
                const item = wordById(id)
                if (!item) return null
                return (
                  <li key={id} className="flex items-center gap-3 py-2">
                    <span className="text-2xl" aria-hidden>{item.emoji ?? item.glyph}</span>
                    <span className="flex-1 font-semibold">{item.word} <span className="text-sm font-normal text-ink-soft">· {categoryById(item.categoryId)?.name}</span></span>
                    <span className="text-sm text-ink-soft">✓ {w.correct} · ✗ {w.incorrect}</span>
                  </li>
                )
              })}
            </ul>
          )}
        </Card>
      </div>

      <Card className="p-5">
        <h2 className="font-display text-xl font-bold text-ink">Mastered words</h2>
        <p className="mt-2 text-ink-2">{mastered.length ? mastered.map((w) => w.word).join(', ') : 'Words answered correctly several times in a row will appear here.'}</p>
      </Card>
    </div>
  )
}

function Toggle({ label, checked, onChange }: { label: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <label className="flex cursor-pointer items-center justify-between gap-3">
      <span className="font-semibold text-ink-2">{label}</span>
      <button type="button" role="switch" aria-checked={checked} aria-label={label} onClick={() => onChange(!checked)}
        className={`relative h-9 w-16 rounded-full transition-colors focus-visible:outline-4 focus-visible:outline-primary ${checked ? 'bg-[#4CC26B]' : 'bg-line'}`}>
        <span className={`absolute top-1 h-7 w-7 rounded-full bg-white shadow transition-all ${checked ? 'left-8' : 'left-1'}`} />
      </button>
    </label>
  )
}
