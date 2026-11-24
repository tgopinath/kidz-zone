import { Check, Play } from 'lucide-react'
import type { ReactNode } from 'react'
import { say } from '../shared/speech'
import { shared, useShared, type TextSize, type VoiceSpeed } from '../shared/store'
import { AGE_BANDS, AVATAR_COLOURS } from '../shared/worlds'
import { Card, Eyebrow, PageTitle } from './ui'

function Segmented<T extends string>({ label, value, options, onChange }: { label: string; value: T; options: { id: T; label: string }[]; onChange: (v: T) => void }) {
  return (
    <div className="k-tabs ios-seg flex flex-wrap gap-2" role="radiogroup" aria-label={label}>
      {options.map((o) => (
        <button
          key={o.id}
          type="button"
          role="radio"
          aria-checked={value === o.id}
          onClick={() => onChange(o.id)}
          className={`min-h-16 rounded-xl border px-4 font-bold transition ${value === o.id ? 'border-brand bg-brand-soft text-brand' : 'border-line bg-white hover:border-ink/30'}`}
        >
          {o.label}
        </button>
      ))}
    </div>
  )
}

function Row({ title, hint, children }: { title: string; hint?: string; children: ReactNode }) {
  return (
    <div className="grid gap-3 px-5 py-4 sm:grid-cols-[220px_1fr] sm:items-center">
      <div>
        <p className="font-black">{title}</p>
        {hint && <p className="text-sm text-ink-soft">{hint}</p>}
      </div>
      <div>{children}</div>
    </div>
  )
}

function Switch({ label, checked, onChange }: { label: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <label className="k-switch inline-flex min-h-16 cursor-pointer items-center gap-3 font-bold">
      <input type="checkbox" role="switch" className="peer sr-only" checked={checked} onChange={(e) => onChange(e.target.checked)} />
      <span className="relative h-7 w-12 rounded-full bg-black/15 transition peer-checked:bg-brand peer-focus-visible:outline-3 peer-focus-visible:outline-brand after:absolute after:top-1 after:left-1 after:size-5 after:rounded-full after:bg-white after:transition peer-checked:after:translate-x-5" aria-hidden />
      {label}
    </label>
  )
}

export function SettingsScreen() {
  const s = useShared()
  const p = s.profile!
  const set = shared.updateSettings
  return (
    <div className="mx-auto max-w-3xl px-4 pt-6 sm:px-6 sm:pt-10">
      <PageTitle eyebrow="For every world" title="Settings" lead="One profile and one set of choices, used by all eight worlds." />

      <Eyebrow className="mb-2">Profile</Eyebrow>
      <Card className="mb-8 divide-y divide-line">
        <Row title="Name">
          <input className="k-input w-full max-w-xs" aria-label="Name" value={p.name} maxLength={20} onChange={(e) => shared.setProfile({ ...p, name: e.target.value })} onBlur={(e) => !e.target.value.trim() && shared.setProfile({ ...p, name: 'Explorer' })} />
        </Row>
        <Row title="Age" hint="Each world starts at this level.">
          <Segmented label="Age" value={p.ageBand} options={AGE_BANDS} onChange={(ageBand) => shared.setProfile({ ...p, ageBand })} />
        </Row>
        <Row title="Badge colour">
          <div className="flex flex-wrap gap-2" role="radiogroup" aria-label="Badge colour">
            {AVATAR_COLOURS.map((c) => (
              <button key={c.id} type="button" role="radio" aria-checked={p.avatar === c.id} aria-label={c.name} onClick={() => shared.setProfile({ ...p, avatar: c.id })} className={`grid size-11 place-items-center rounded-full ring-offset-2 ${p.avatar === c.id ? 'ring-2 ring-ink' : ''}`} style={{ background: c.bg }}>
                {p.avatar === c.id && <Check size={18} color={c.fg} aria-hidden />}
              </button>
            ))}
          </div>
        </Row>
      </Card>

      <Eyebrow className="mb-2">Sound and reading</Eyebrow>
      <Card className="mb-8 divide-y divide-line">
        <Row title="Sound" hint="Chimes and effects in every world.">
          <Switch label={s.settings.sound ? 'On' : 'Off'} checked={s.settings.sound} onChange={(sound) => set({ sound })} />
        </Row>
        <Row title="Reading voice" hint="How fast words and instructions are read aloud.">
          <div className="flex flex-wrap items-center gap-2">
            <Segmented<VoiceSpeed> label="Reading voice" value={s.settings.voice} options={[{ id: 'slow', label: 'Slow' }, { id: 'normal', label: 'Normal' }, { id: 'fast', label: 'Fast' }]} onChange={(voice) => { set({ voice }); void say(`Hello ${p.name}. This is how I sound.`) }} />
            <button type="button" className="inline-flex min-h-16 items-center gap-1.5 rounded-xl px-3 font-bold text-brand hover:bg-brand-soft" onClick={() => void say(`Hello ${p.name}. This is how I sound.`)}>
              <Play size={16} aria-hidden /> Try it
            </button>
          </div>
        </Row>
        <Row title="Text size">
          <Segmented<TextSize> label="Text size" value={s.settings.textSize} options={[{ id: 'normal', label: 'Normal' }, { id: 'large', label: 'Large' }, { id: 'larger', label: 'Larger' }]} onChange={(textSize) => set({ textSize })} />
        </Row>
        <Row title="Reduce motion" hint="Fewer animations and no bouncing.">
          <Switch label={s.settings.reducedMotion ? 'On' : 'Off'} checked={s.settings.reducedMotion} onChange={(reducedMotion) => set({ reducedMotion })} />
        </Row>
      </Card>
      <p className="mb-8 text-sm text-ink-soft">Some worlds have a few options of their own (Word Garden’s buddy, Map Explorer’s Tamil voice) inside the world.</p>
    </div>
  )
}
