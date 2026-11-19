import { Check, Target, X } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { pick, randInt, shuffle } from '../../lib/random'
import type { Rng } from '../../lib/random'
import { play } from '../../lib/sound'
import type { GameDef, GameProps } from '../types'

const BOARDS = 3

/** Groups of look-alike symbols. Distractors come from other groups at low levels and the same group at high levels. */
const GROUPS: string[][] = [
  ['🐱', '😺', '🐈', '🦁', '🐯'],
  ['🍎', '🍅', '🍒', '🍓', '🌶️'],
  ['⭐', '🌟', '✨', '💫', '🌠'],
  ['🔵', '🟣', '🟦', '🔷', '🫐'],
  ['🚗', '🚙', '🚕', '🚓', '🛻'],
  ['🌲', '🌳', '🌴', '🎄', '🌵'],
  ['😀', '😃', '😄', '😁', '😆'],
  ['🐶', '🐕', '🐩', '🦮', '🐺'],
  ['⚽', '🏀', '🏐', '⚾', '🎾'],
  ['🌸', '🌺', '🌷', '🌹', '💮'],
]

interface Board {
  target: string
  cells: string[]
  key: string
}

function makeBoard(d: number, rng: Rng, avoid: string): Board {
  const cols = d <= 3 ? 4 : d <= 7 ? 5 : 6
  const rows = d <= 2 ? 4 : d <= 5 ? 5 : d <= 9 ? 6 : 7
  const total = cols * rows
  const targets = Math.min(Math.floor(total / 3), 3 + Math.floor(d / 2))
  let gi = randInt(0, GROUPS.length - 1, rng)
  if (GROUPS[gi].includes(avoid)) gi = (gi + 1) % GROUPS.length
  const group = GROUPS[gi]
  const target = pick(group, rng)
  const sameGroup = group.filter((g) => g !== target)
  const others = GROUPS.filter((_, i) => i !== gi).flat()
  // Share of distractors that are look-alikes grows with d.
  const lookAlike = d <= 3 ? 0 : Math.min(0.85, (d - 3) * 0.1)
  const cells: string[] = []
  for (let i = 0; i < targets; i++) cells.push(target)
  while (cells.length < total) cells.push(rng() < lookAlike ? pick(sameGroup, rng) : pick(others, rng))
  return { target, cells: shuffle(cells, rng), key: target }
}

function TargetFinder({ diff, rng, paused, api }: GameProps) {
  const [boardNo, setBoardNo] = useState(0)
  const [board, setBoard] = useState<Board>(() => makeBoard(diff.d, rng, ''))
  const [found, setFound] = useState<Set<number>>(new Set())
  const [wrongIdx, setWrongIdx] = useState<number | null>(null)
  const [peek, setPeek] = useState<number | null>(null)
  const finished = useRef(false)
  const lock = useRef(false)

  const totalTargets = board.cells.filter((c) => c === board.target).length
  const left = totalTargets - found.size
  const cols = diff.d <= 3 ? 4 : diff.d <= 7 ? 5 : 6

  useEffect(() => api.progress(boardNo, BOARDS), [boardNo, api])

  useEffect(() => {
    api.onHint(() => {
      const idx = board.cells.findIndex((c, i) => c === board.target && !found.has(i))
      if (idx < 0) return 'All found!'
      setPeek(idx)
      window.setTimeout(() => setPeek(null), 1000)
      return `One ${board.target} is glowing. Scan row by row, left to right.`
    })
    return () => api.onHint(null)
  }, [api, board, found])

  const tap = (i: number) => {
    if (paused || lock.current || found.has(i)) return
    if (board.cells[i] !== board.target) {
      play('wrong')
      api.wrong()
      setWrongIdx(i)
      window.setTimeout(() => setWrongIdx((x) => (x === i ? null : x)), 500)
      return
    }
    play('correct')
    api.correct(5 * diff.d)
    api.found(1)
    const nf = new Set(found).add(i)
    setFound(nf)
    if (nf.size < totalTargets) return
    lock.current = true
    window.setTimeout(() => {
      const nb = boardNo + 1
      if (nb >= BOARDS) {
        if (!finished.current) {
          finished.current = true
          api.progress(BOARDS, BOARDS)
          api.finish({ completed: true })
        }
        return
      }
      setBoard(makeBoard(diff.d, rng, board.target))
      setBoardNo(nb)
      setFound(new Set())
      lock.current = false
    }, 700)
  }

  return (
    <div className="mx-auto flex w-full max-w-lg flex-col items-center gap-4">
      <div className="bcard flex w-full items-center justify-between gap-3 px-4 py-3" role="status" aria-live="polite">
        <span className="flex items-center gap-2 font-display text-lg font-bold">
          <Target size={20} className="text-primary" /> {diff.young ? 'Find all' : 'Find every'}
          <span className="grid size-12 place-items-center rounded-2xl bg-primary-soft text-3xl" aria-label={`target ${board.target}`}>
            {board.target}
          </span>
        </span>
        <span className="text-right text-sm font-bold text-muted">
          Board {boardNo + 1}/{BOARDS}
          <br />
          {left === 0 ? (
            <span className="flex items-center justify-end gap-1 text-[#1d8a5c]">
              <Check size={14} /> All found!
            </span>
          ) : (
            <span>{left} left</span>
          )}
        </span>
      </div>
      <div className="grid w-full gap-1.5 sm:gap-2" style={{ gridTemplateColumns: `repeat(${cols}, minmax(0,1fr))` }} role="group" aria-label="Symbols board">
        {board.cells.map((c, i) => {
          const isFound = found.has(i)
          return (
            <button
              key={`${boardNo}-${i}`}
              type="button"
              onClick={() => tap(i)}
              aria-label={`${c}${isFound ? ', found' : ''}${wrongIdx === i ? ', not the target' : ''}`}
              className={`btile relative grid aspect-square place-items-center text-3xl sm:text-4xl ${isFound ? '!border-success bg-success/10' : ''} ${
                wrongIdx === i ? 'animate-shake !border-danger bg-danger/10' : ''
              } ${peek === i ? 'animate-pop ring-4 ring-accent' : ''}`}
            >
              <span className={isFound ? 'opacity-40' : ''}>{c}</span>
              {isFound && (
                <span className="absolute inset-0 grid place-items-center">
                  <span className="grid size-8 place-items-center rounded-full bg-success text-white shadow-soft">
                    <Check size={18} strokeWidth={3} />
                  </span>
                </span>
              )}
              {wrongIdx === i && (
                <span className="absolute top-1 right-1 grid size-5 place-items-center rounded-full bg-danger text-white">
                  <X size={12} strokeWidth={3} />
                </span>
              )}
            </button>
          )
        })}
      </div>
    </div>
  )
}

export const targetFinder: GameDef = {
  id: 'target-finder',
  category: 'focus',
  skill: 'attention',
  title: 'Target Finder',
  emoji: '🎯',
  blurb: 'Find every copy of the target symbol before time runs out.',
  instructions: [
    'The target symbol is shown at the top.',
    'Tap every matching symbol on the board.',
    'Tapping a different symbol counts as a mistake.',
    'Clear all three boards before the timer runs out.',
  ],
  kidInstructions: ['Look at the picture at the top.', 'Tap all the same pictures on the board!', 'Be quick!'],
  timeLimit: (d) => Math.round((60 + d.d * 3) * d.time),
  timeoutCompletes: true,
  component: TargetFinder,
}
