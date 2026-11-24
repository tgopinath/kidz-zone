import { ArrowRight, Check } from 'lucide-react'
import { useState } from 'react'
import { legacyName } from '../shared/import'
import { say } from '../shared/speech'
import { shared, type AgeBand } from '../shared/store'
import { AGE_BANDS, AVATAR_COLOURS, WORLDS } from '../shared/worlds'
import { Logo } from './Layout'
import { Avatar, WorldIcon } from './ui'

/** One profile for every world: name, age band and an initials avatar colour. */
export function Onboarding() {
  const [name, setName] = useState(() => legacyName())
  const [age, setAge] = useState<AgeBand>('7-9')
  const [avatar, setAvatar] = useState(AVATAR_COLOURS[0].id)
  const ready = name.trim().length > 0

  const start = () => {
    if (!ready) return
    shared.setProfile({ name: name.trim().slice(0, 20), ageBand: age, avatar })
    void say(`Welcome to KidZ Zone, ${name.trim()}!`)
  }

  return (
    <main id="main" className="min-h-dvh bg-white">
      <div className="mx-auto grid max-w-6xl gap-10 px-4 py-6 sm:px-6 lg:grid-cols-[1.1fr_1fr] lg:py-14">
        <section>
          <Logo />
          <p className="eyebrow mt-10">Eight worlds, one place</p>
          <h1 className="mt-2 text-4xl leading-[1.1] font-black tracking-tight sm:text-5xl">Where shall we play today?</h1>
          <p className="mt-4 max-w-xl text-lg text-ink-soft">
            Words, reading, money, puzzles, brain games, a pet to raise, maps of India and the world, and a supermarket. One profile, one set of stars.
          </p>
          <ul className="mt-8 grid grid-cols-2 gap-3 sm:grid-cols-4">
            {WORLDS.map((w) => (
              <li key={w.id} className="flex items-center gap-2.5 rounded-xl border border-line px-3 py-2.5">
                <WorldIcon world={w.id} size={16} tile />
                <span className="text-sm font-bold">{w.name}</span>
              </li>
            ))}
          </ul>
        </section>

        <form
          className="kz-card self-start rounded-2xl border border-line bg-white p-5 shadow-card sm:p-7"
          onSubmit={(e) => {
            e.preventDefault()
            start()
          }}
        >
          <h2 className="text-2xl font-black">Who is playing?</h2>
          <p className="mt-1 text-ink-soft">Stays on this device. No account, no email.</p>

          <label htmlFor="kz-name" className="mt-6 block font-bold">
            First name or nickname
          </label>
          <input
            id="kz-name"
            className="k-input mt-2 w-full"
            value={name}
            maxLength={20}
            autoComplete="off"
            spellCheck={false}
            placeholder="For example, Asha"
            onChange={(e) => setName(e.target.value)}
          />

          <fieldset className="mt-6">
            <legend className="font-bold">Age</legend>
            <div className="mt-2 grid grid-cols-3 gap-2" role="radiogroup" aria-label="Age">
              {AGE_BANDS.map((b) => (
                <button
                  key={b.id}
                  type="button"
                  role="radio"
                  aria-checked={age === b.id}
                  onClick={() => setAge(b.id)}
                  className={`min-h-16 rounded-xl border px-2 font-bold transition ${age === b.id ? 'border-brand bg-brand-soft text-brand' : 'border-line hover:border-ink/30'}`}
                >
                  {b.label}
                </button>
              ))}
            </div>
            <p className="mt-2 text-sm text-ink-soft">Sets where each world starts. Every world still adapts as they play.</p>
          </fieldset>

          <fieldset className="mt-6">
            <legend className="font-bold">Badge colour</legend>
            <div className="mt-2 flex flex-wrap gap-2" role="radiogroup" aria-label="Badge colour">
              {AVATAR_COLOURS.map((c) => (
                <button
                  key={c.id}
                  type="button"
                  role="radio"
                  aria-checked={avatar === c.id}
                  aria-label={c.name}
                  onClick={() => setAvatar(c.id)}
                  className={`relative grid size-12 place-items-center rounded-full ring-offset-2 transition ${avatar === c.id ? 'ring-2 ring-ink' : ''}`}
                  style={{ background: c.bg }}
                >
                  {avatar === c.id && <Check size={20} color={c.fg} aria-hidden />}
                </button>
              ))}
            </div>
          </fieldset>

          <div className="mt-7 flex items-center gap-3 rounded-xl bg-bg p-3">
            <Avatar name={name || 'K'} colour={avatar} size={48} />
            <div className="min-w-0">
              <p className="truncate font-black">{name.trim() || 'Your name'}</p>
              <p className="text-sm text-ink-soft">{AGE_BANDS.find((b) => b.id === age)!.label}</p>
            </div>
          </div>

          <button type="submit" disabled={!ready} className="mt-6 inline-flex min-h-16 w-full items-center justify-center gap-2 rounded-xl bg-brand px-6 text-lg font-black text-white transition hover:brightness-110 disabled:opacity-50">
            Start playing <ArrowRight size={20} aria-hidden />
          </button>
        </form>
      </div>
    </main>
  )
}
