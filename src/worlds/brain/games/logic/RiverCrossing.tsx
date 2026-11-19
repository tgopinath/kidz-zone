import { motion } from 'framer-motion'
import { AlertTriangle, ArrowLeftRight, Check, RotateCcw, Undo2, ArrowRight } from 'lucide-react'
import { useEffect, useMemo, useRef, useState } from 'react'
import type { Difficulty } from '../../lib/difficulty'
import { pick, type Rng } from '../../lib/random'
import { play } from '../../lib/sound'
import type { GameDef, GameProps } from '../types'

type Side = 'L' | 'R'

interface Entity {
  id: string
  emoji: string
  name: string
  /** Can row the boat. */
  rower: boolean
  weight?: number
}

interface Conflict {
  /** `a` harms `b` when they share a bank without `guard`. */
  a: string
  b: string
  guard: string
  text: string
}

interface Puzzle {
  title: string
  goal: string
  entities: Entity[]
  /** Max people/items in the boat (including the rower). */
  capacity: number
  maxWeight?: number
  conflicts: Conflict[]
  /** Optional crossing limit (challenge mode). */
  limit?: number
}

interface State {
  pos: Record<string, Side>
  boat: Side
  aboard: string[]
  moves: number
}

const THEMES = [
  { pred: { id: 'cat', emoji: '🐱', name: 'cat' }, prey: { id: 'fish', emoji: '🐟', name: 'fish' }, safe: { id: 'wool', emoji: '🧶', name: 'wool' }, verb: 'eat' },
  { pred: { id: 'dog', emoji: '🐶', name: 'dog' }, prey: { id: 'bone', emoji: '🦴', name: 'bone' }, safe: { id: 'ball', emoji: '⚽', name: 'ball' }, verb: 'chew' },
  { pred: { id: 'rabbit', emoji: '🐰', name: 'rabbit' }, prey: { id: 'carrot', emoji: '🥕', name: 'carrot' }, safe: { id: 'bucket', emoji: '🪣', name: 'bucket' }, verb: 'eat' },
] as const

const CLASSIC = [
  { wolf: { id: 'wolf', emoji: '🐺', name: 'wolf' }, goat: { id: 'goat', emoji: '🐐', name: 'goat' }, veg: { id: 'cabbage', emoji: '🥬', name: 'cabbage' } },
  { wolf: { id: 'fox', emoji: '🦊', name: 'fox' }, goat: { id: 'hen', emoji: '🐔', name: 'hen' }, veg: { id: 'corn', emoji: '🌽', name: 'corn' } },
] as const

const FARMER: Entity = { id: 'farmer', emoji: '🧑‍🌾', name: 'farmer', rower: true }

function simplePuzzle(rng: Rng, withSafe: boolean): Puzzle {
  const t = pick(THEMES, rng)
  const entities: Entity[] = [FARMER, { ...t.pred, rower: false }, { ...t.prey, rower: false }]
  if (withSafe) entities.push({ ...t.safe, rower: false })
  return {
    title: withSafe ? 'Three things to carry' : 'A first crossing',
    goal: `Get everything to the right bank. The boat holds the farmer and one thing. The ${t.pred.name} will ${t.verb} the ${t.prey.name} if the farmer isn't there.`,
    entities,
    capacity: 2,
    conflicts: [{ a: t.pred.id, b: t.prey.id, guard: 'farmer', text: `The ${t.pred.name} can't be left with the ${t.prey.name} without the farmer – it would ${t.verb} it!` }],
  }
}

function classicPuzzle(rng: Rng, limit?: number): Puzzle {
  const c = pick(CLASSIC, rng)
  return {
    title: limit ? `Classic – in ${limit} crossings` : 'The classic puzzle',
    goal: `Get the farmer, ${c.wolf.name}, ${c.goat.name} and ${c.veg.name} across. The boat holds the farmer plus one. Never leave the ${c.goat.name} alone with the ${c.wolf.name} or the ${c.veg.name}.${limit ? ` You only have ${limit} crossings!` : ''}`,
    entities: [FARMER, { ...c.wolf, rower: false }, { ...c.goat, rower: false }, { ...c.veg, rower: false }],
    capacity: 2,
    conflicts: [
      { a: c.wolf.id, b: c.goat.id, guard: 'farmer', text: `The ${c.wolf.name} can't be left with the ${c.goat.name} without the farmer!` },
      { a: c.goat.id, b: c.veg.id, guard: 'farmer', text: `The ${c.goat.name} can't be left with the ${c.veg.name} without the farmer!` },
    ],
    limit,
  }
}

function familyPuzzle(): Puzzle {
  return {
    title: 'Family weight puzzle',
    goal: 'Get the whole family across. Anyone can row. The boat carries at most 2 people and 100 kg.',
    entities: [
      { id: 'dad', emoji: '👨', name: 'Dad', rower: true, weight: 90 },
      { id: 'mum', emoji: '👩', name: 'Mum', rower: true, weight: 80 },
      { id: 'boy', emoji: '👦', name: 'Leo', rower: true, weight: 45 },
      { id: 'girl', emoji: '👧', name: 'Mia', rower: true, weight: 40 },
    ],
    capacity: 2,
    maxWeight: 100,
    conflicts: [],
  }
}

function puzzlesFor(diff: Difficulty, rng: Rng): Puzzle[] {
  const d = diff.d
  if (d <= 2) return [simplePuzzle(rng, false)]
  if (d <= 5) return [simplePuzzle(rng, true)]
  if (d <= 8) return [classicPuzzle(rng)]
  if (d <= 10) return [classicPuzzle(rng, 7)]
  return [classicPuzzle(rng, 7), familyPuzzle()]
}

const other = (s: Side): Side => (s === 'L' ? 'R' : 'L')

function brokenRule(p: Puzzle, pos: Record<string, Side>): Conflict | null {
  for (const c of p.conflicts) if (pos[c.a] === pos[c.b] && pos[c.guard] !== pos[c.a]) return c
  return null
}

function startState(p: Puzzle): State {
  return { pos: Object.fromEntries(p.entities.map((e) => [e.id, 'L' as Side])), boat: 'L', aboard: [], moves: 0 }
}

/** Breadth-first search for the shortest list of crossings from a position. */
function solve(p: Puzzle, pos: Record<string, Side>, boat: Side): string[][] | null {
  const ids = p.entities.map((e) => e.id)
  const key = (ps: Record<string, Side>, b: Side) => b + ids.map((i) => ps[i]).join('')
  const start = key(pos, boat)
  const prev = new Map<string, { from: string; load: string[] } | null>([[start, null]])
  const queue: [Record<string, Side>, Side][] = [[pos, boat]]
  while (queue.length) {
    const [ps, b] = queue.shift()!
    const k = key(ps, b)
    if (ids.every((i) => ps[i] === 'R')) {
      const path: string[][] = []
      let cur = k
      while (prev.get(cur)) {
        const st = prev.get(cur)!
        path.unshift(st.load)
        cur = st.from
      }
      return path
    }
    const here = ids.filter((i) => ps[i] === b)
    for (let mask = 1; mask < 1 << here.length; mask++) {
      const load = here.filter((_, j) => mask & (1 << j))
      if (load.length > p.capacity) continue
      const ents = load.map((i) => p.entities.find((e) => e.id === i)!)
      if (!ents.some((e) => e.rower)) continue
      if (p.maxWeight && ents.reduce((s, e) => s + (e.weight ?? 0), 0) > p.maxWeight) continue
      const np = { ...ps }
      load.forEach((i) => (np[i] = other(b)))
      if (brokenRule(p, np)) continue
      const nk = key(np, other(b))
      if (prev.has(nk)) continue
      prev.set(nk, { from: k, load })
      queue.push([np, other(b)])
    }
  }
  return null
}

function RiverCrossing({ diff, rng, paused, api }: GameProps) {
  const [puzzles] = useState(() => puzzlesFor(diff, rng))
  const [pi, setPi] = useState(0)
  const puzzle = puzzles[pi]
  const optimal = useMemo(() => solve(puzzle, startState(puzzle).pos, 'L')?.length ?? 1, [puzzle])
  const [state, setState] = useState<State>(() => startState(puzzle))
  const [history, setHistory] = useState<State[]>([])
  const [msg, setMsg] = useState<{ kind: 'bad' | 'info' | 'good'; text: string } | null>(null)
  const [solved, setSolved] = useState(false)
  const finished = useRef(false)

  const ent = (id: string) => puzzle.entities.find((e) => e.id === id)!
  const load = state.aboard.map(ent)
  const loadWeight = load.reduce((s, e) => s + (e.weight ?? 0), 0)
  const rowerWord = puzzle.entities.every((e) => e.rower) ? 'someone' : 'the farmer'

  useEffect(() => {
    api.progress(pi + (solved ? 1 : 0), puzzles.length)
  }, [pi, solved, puzzles.length, api])

  useEffect(() => {
    api.onHint(() => {
      if (solved) return 'Solved!'
      const path = solve(puzzle, state.pos, state.boat)
      if (!path) return 'Try Reset and start again.'
      if (puzzle.limit && state.moves + path.length > puzzle.limit) return 'You can no longer finish within the limit from here – use Undo or Reset.'
      const names = path[0].map((i) => (ent(i).weight ? ent(i).name : `the ${ent(i).name}`))
      return `Next, take ${names.join(' and ')} ${state.boat === 'L' ? 'across to the right' : 'back to the left'}. (${path.length} crossing${path.length > 1 ? 's' : ''} left at best.)`
    })
    return () => api.onHint(null)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [puzzle, state, solved, api])

  const toggle = (id: string) => {
    if (paused || solved) return
    const e = ent(id)
    if (state.aboard.includes(id)) {
      play('tap')
      setState((s) => ({ ...s, aboard: s.aboard.filter((x) => x !== id) }))
      setMsg(null)
      return
    }
    if (state.pos[id] !== state.boat) {
      setMsg({ kind: 'info', text: `The boat is on the ${state.boat === 'L' ? 'left' : 'right'} bank. Only things on that side can get in.` })
      return
    }
    if (state.aboard.length >= puzzle.capacity) {
      setMsg({ kind: 'info', text: `The boat only holds ${puzzle.capacity}. Tap someone in the boat to take them out.` })
      return
    }
    if (puzzle.maxWeight && loadWeight + (e.weight ?? 0) > puzzle.maxWeight) {
      api.wrong()
      play('wrong')
      setMsg({ kind: 'bad', text: `Too heavy! ${loadWeight + (e.weight ?? 0)} kg is over the ${puzzle.maxWeight} kg limit.` })
      return
    }
    play('tap')
    setMsg(null)
    setState((s) => ({ ...s, aboard: [...s.aboard, id] }))
  }

  const cross = () => {
    if (paused || solved) return
    if (!load.some((e) => e.rower)) {
      api.wrong()
      play('wrong')
      setMsg({ kind: 'bad', text: `The boat can't move on its own – ${rowerWord} must be in it to row.` })
      return
    }
    const to = other(state.boat)
    const pos = { ...state.pos }
    state.aboard.forEach((i) => (pos[i] = to))
    const broken = brokenRule(puzzle, pos)
    if (broken) {
      api.wrong()
      play('wrong')
      setMsg({ kind: 'bad', text: `Rule broken: ${broken.text}` })
      return
    }
    const next: State = { pos, boat: to, aboard: state.aboard, moves: state.moves + 1 }
    const win = puzzle.entities.every((e) => pos[e.id] === 'R')
    play(win ? 'win' : 'flip')
    if (win) {
      setHistory((h) => [...h, state])
      setState(next)
      setSolved(true)
      const pts = Math.max(10, Math.round(40 * diff.d * Math.min(1, optimal / next.moves)))
      api.correct(pts)
      setMsg({ kind: 'good', text: next.moves === optimal ? `Perfect! Solved in the fewest possible crossings (${optimal}).` : `Solved in ${next.moves} crossings. The best is ${optimal}.` })
      if (pi + 1 >= puzzles.length && !finished.current) {
        finished.current = true
        window.setTimeout(() => {
          api.progress(puzzles.length, puzzles.length)
          api.finish({ completed: true })
        }, 1600)
      }
      return
    }
    if (puzzle.limit && next.moves >= puzzle.limit) {
      api.wrong()
      play('lose')
      setMsg({ kind: 'bad', text: `Out of crossings! You used all ${puzzle.limit}. The puzzle has been reset – try again.` })
      setState(startState(puzzle))
      setHistory([])
      return
    }
    setHistory((h) => [...h, state])
    setState(next)
    setMsg(null)
  }

  const undo = () => {
    if (paused || solved || !history.length) return
    play('tap')
    setState(history[history.length - 1])
    setHistory((h) => h.slice(0, -1))
    setMsg(null)
  }

  const reset = () => {
    if (paused || solved) return
    play('tap')
    setState(startState(puzzle))
    setHistory([])
    setMsg(null)
  }

  const nextPuzzle = () => {
    const n = pi + 1
    setPi(n)
    setState(startState(puzzles[n]))
    setHistory([])
    setSolved(false)
    setMsg(null)
  }

  const bank = (side: Side) => {
    const items = puzzle.entities.filter((e) => state.pos[e.id] === side && !state.aboard.includes(e.id))
    return (
      <div
        role="group"
        aria-label={`${side === 'L' ? 'Left' : 'Right'} bank: ${items.map((e) => e.name).join(', ') || 'empty'}`}
        className={`flex min-h-48 flex-col items-center gap-2 rounded-2xl p-2 sm:p-3 ${side === 'L' ? 'bg-[#e3f6d8]' : 'bg-[#dff1d2]'}`}
      >
        <span className="text-xs font-bold text-muted uppercase">{side === 'L' ? 'Start' : 'Goal'}</span>
        <div className="flex flex-wrap justify-center gap-2">
          {items.map((e) => (
            <button
              key={e.id}
              type="button"
              onClick={() => toggle(e.id)}
              aria-label={`${e.name}${e.weight ? `, ${e.weight} kilograms` : ''}, on the ${side === 'L' ? 'left' : 'right'} bank. ${state.boat === side ? 'Tap to put in the boat.' : ''}`}
              className="btile flex size-16 flex-col items-center justify-center text-3xl sm:size-20 sm:text-4xl"
            >
              <span aria-hidden>{e.emoji}</span>
              {e.weight && <span className="text-[10px] font-bold text-muted">{e.weight} kg</span>}
            </button>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-4">
      <div className="bcard px-4 py-3 text-center">
        <h3 className="font-display text-lg font-semibold">
          {puzzles.length > 1 && <span className="text-muted">Puzzle {pi + 1} of {puzzles.length} · </span>}
          {puzzle.title}
        </h3>
        <p className="text-sm text-muted">{puzzle.goal}</p>
        <div className="mt-2 flex flex-wrap justify-center gap-2">
          <span className="bchip bg-primary-soft text-primary">
            Crossings: {state.moves}
            {puzzle.limit ? ` / ${puzzle.limit}` : ''}
          </span>
          <span className="bchip bg-secondary/10 text-secondary">Best possible: {optimal}</span>
        </div>
      </div>

      <div className="grid grid-cols-[1fr_1.15fr_1fr] gap-2 sm:gap-3">
        {bank('L')}
        <div className="relative flex min-h-48 flex-col justify-center overflow-hidden rounded-2xl bg-gradient-to-b from-[#bfe3ff] to-[#8ccaf7] p-2">
          <span className="sr-only">River. The boat is on the {state.boat === 'L' ? 'left' : 'right'} side.</span>
          <div className={`flex ${state.boat === 'L' ? 'justify-start' : 'justify-end'}`}>
            <motion.div
              layout
              transition={{ type: 'spring', stiffness: 120, damping: 18 }}
              role="group"
              aria-label={`Boat: ${load.map((e) => e.name).join(', ') || 'empty'}`}
              className="flex min-h-20 min-w-[5.5rem] flex-col items-center justify-end rounded-b-[2rem] rounded-t-lg border-4 border-[#9a5b2c] bg-[#c47a3e] px-1 pt-1 pb-2 shadow-soft"
            >
              <div className="flex gap-1">
                {load.map((e) => (
                  <button
                    key={e.id}
                    type="button"
                    onClick={() => toggle(e.id)}
                    aria-label={`${e.name} in the boat. Tap to get out.`}
                    className="grid size-12 place-items-center rounded-xl bg-white/90 text-2xl transition hover:scale-105 sm:size-14 sm:text-3xl"
                  >
                    <span aria-hidden>{e.emoji}</span>
                  </button>
                ))}
                {load.length === 0 && <span className="px-2 py-3 text-xs font-bold text-white/90">empty</span>}
              </div>
              {puzzle.maxWeight && (
                <span className="mt-1 text-[10px] font-bold text-white">
                  {loadWeight}/{puzzle.maxWeight} kg
                </span>
              )}
            </motion.div>
          </div>
        </div>
        {bank('R')}
      </div>

      <div aria-live="polite" className="min-h-12">
        {msg && (
          <div
            role={msg.kind === 'bad' ? 'alert' : 'status'}
            className={`flex items-center justify-center gap-2 rounded-2xl px-4 py-3 text-center font-bold ${
              msg.kind === 'bad' ? 'bg-danger/10 text-[#c22d4b]' : msg.kind === 'good' ? 'bg-success/12 text-[#1d8a5c]' : 'bg-primary-soft text-primary-dark'
            }`}
          >
            {msg.kind === 'bad' ? <AlertTriangle size={20} aria-hidden /> : msg.kind === 'good' ? <Check size={20} aria-hidden /> : null}
            {msg.text}
          </div>
        )}
      </div>

      <div className="flex flex-wrap justify-center gap-3">
        {solved && pi + 1 < puzzles.length ? (
          <button type="button" className="bbtn-primary" onClick={nextPuzzle} autoFocus>
            Next puzzle <ArrowRight size={18} />
          </button>
        ) : (
          <>
            <button type="button" className="bbtn-primary min-w-40" onClick={cross} disabled={solved}>
              <ArrowLeftRight size={18} /> Cross {state.boat === 'L' ? '→' : '←'}
            </button>
            <button type="button" className="bbtn-ghost" onClick={undo} disabled={solved || !history.length}>
              <Undo2 size={18} /> Undo
            </button>
            <button type="button" className="bbtn-ghost" onClick={reset} disabled={solved}>
              <RotateCcw size={18} /> Reset
            </button>
          </>
        )}
      </div>
    </div>
  )
}

export const riverCrossing: GameDef = {
  id: 'river-crossing',
  category: 'logic',
  skill: 'logic',
  title: 'River Crossing',
  emoji: '⛵',
  blurb: 'Ferry everyone across without breaking the rules.',
  instructions: [
    'Tap things on the bank to put them in the boat; tap them again to take them out.',
    'Press Cross to row to the other side – someone who can row must be aboard.',
    'Never leave the wrong things alone together. Broken rules count as mistakes.',
    'Use Undo or Reset any time. Fewer crossings earn more points.',
  ],
  kidInstructions: ['Tap to put things in the boat.', 'Press Cross to sail.', "Don't leave hungry animals with their food!"],
  timeLimit: (d) => Math.round((d.d >= 11 ? 480 : 300) * d.time),
  timeoutCompletes: false,
  component: RiverCrossing,
}
