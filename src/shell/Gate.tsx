import { Lock } from 'lucide-react'
import { useMemo, useState } from 'react'
import { Card } from './ui'

let unlockedUntil = 0 // the gate stays open for 10 minutes in this tab
export const isUnlocked = () => Date.now() < unlockedUntil


/** A grown-up check: a two-digit multiplication most young children can't do yet. */
export function Gate({ onPass, title = 'Grown-ups only', lead = 'Progress for every world, settings and reset.' }: { onPass: () => void; title?: string; lead?: string }) {
  const q = useMemo(() => ({ a: 6 + Math.floor(Math.random() * 7), b: 12 + Math.floor(Math.random() * 8) }), [])
  const [ans, setAns] = useState('')
  const [err, setErr] = useState(false)
  return (
    <div className="mx-auto max-w-md px-4 pt-10">
      <Card className="p-6 text-center">
        <span className="mx-auto grid size-14 place-items-center rounded-full bg-brand-soft text-brand"><Lock size={26} aria-hidden /></span>
        <h1 className="mt-4 text-2xl font-black">{title}</h1>
        <p className="mt-1 text-ink-soft">{lead}</p>
        <form
          className="mt-5 flex flex-col gap-3"
          onSubmit={(e) => {
            e.preventDefault()
            if (Number(ans) === q.a * q.b) {
              unlockedUntil = Date.now() + 10 * 60_000
              onPass()
            } else {
              setErr(true)
              setAns('')
            }
          }}
        >
          <label htmlFor="gate" className="font-bold">What is {q.a} × {q.b}?</label>
          <input id="gate" className="k-input text-center text-xl" inputMode="numeric" autoComplete="off" value={ans} onChange={(e) => { setAns(e.target.value.replace(/\D/g, '').slice(0, 4)); setErr(false) }} aria-invalid={err} aria-describedby={err ? 'gate-err' : undefined} autoFocus />
          {err && <p id="gate-err" className="text-sm font-bold text-danger" role="alert">Not quite. Try again.</p>}
          <button className="min-h-16 rounded-xl bg-brand font-black text-white hover:brightness-110">Open</button>
        </form>
      </Card>
    </div>
  )
}

