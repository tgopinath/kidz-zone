import { motion } from 'framer-motion'
import { Check, Delete, SkipForward, X } from 'lucide-react'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { sample, shuffle, type Rng } from '../../lib/random'
import { play } from '../../lib/sound'
import type { GameDef, GameProps } from '../types'

interface Entry {
  word: string
  cat: string
  emoji?: string
}

/** Compact lists: WORD:Category[:emoji]. Words chosen to avoid common anagrams so only one answer fits. */
const RAW: string[] = [
  // Tier 0 – 3 letters (young)
  'PIG:Animal:🐷|COW:Animal:🐮|BEE:Animal:🐝|FOX:Animal:🦊|YAK:Animal:🐃|HEN:Animal:🐔|SUN:Sky:☀️|HAT:Clothes:🎩|CUP:Kitchen:☕|BED:Bedroom:🛏️|KEY:Thing:🔑|EGG:Food:🥚|PEN:School:🖊️|BOX:Thing:📦|JET:Vehicle:✈️|VAN:Vehicle:🚐|ICE:Cold:🧊|TOY:Play:🧸|BAG:Thing:👜|LIP:Body:👄|EYE:Body:👁️|FAN:Thing:🪭|PIE:Food:🥧|NUT:Food:🥜|JAR:Kitchen:🫙|WEB:Spider:🕸️|SKI:Sport:🎿|GEM:Treasure:💎',
  // Tier 1 – 4 letters (young)
  'FROG:Animal:🐸|DUCK:Animal:🦆|FISH:Animal:🐟|BIRD:Animal:🐦|SWAN:Animal:🦢|WORM:Animal:🪱|CAKE:Food:🎂|MILK:Drink:🥛|CORN:Food:🌽|KIWI:Fruit:🥝|MOON:Sky:🌙|RAIN:Weather:🌧️|TREE:Nature:🌳|BOOK:School:📚|BALL:Toy:⚽|DRUM:Music:🥁|BIKE:Vehicle:🚲|KITE:Toy:🪁|BELL:Thing:🔔|SOCK:Clothes:🧦|BOOT:Clothes:👢|DOLL:Toy:🪆|HAND:Body:✋|FOOT:Body:🦶|BABY:People:👶|TENT:Camping:⛺|GIFT:Party:🎁|KING:People:🤴|FORK:Kitchen:🍴|SOAP:Bathroom:🧼',
  // Tier 2 – 5 letters
  'TIGER:Animal|ZEBRA:Animal|SHEEP:Animal|MOUSE:Animal|PANDA:Animal|KOALA:Animal|WHALE:Sea animal|EAGLE:Bird|CAMEL:Desert animal|LLAMA:Animal|ROBOT:Machine|APPLE:Fruit|PIZZA:Food|HONEY:Food|CANDY:Sweet|JUICE:Drink|CHAIR:Furniture|CLOCK:Time|PHONE:Gadget|TRAIN:Vehicle|TRUCK:Vehicle|PLANT:Nature|BEACH:Place|RIVER:Nature|MUSIC:Art|PIANO:Instrument|CHESS:Game|SHIRT:Clothes|GLOVE:Clothes|SPOON:Kitchen',
  // Tier 3 – 6 letters
  'PLANET:Space|ROCKET:Space|BUTTER:Food|PENCIL:School|MONKEY:Animal|RABBIT:Animal|TURTLE:Animal|DONKEY:Animal|KITTEN:Baby animal|DRAGON:Legend|JUNGLE:Place|ISLAND:Place|WINTER:Season|SUMMER:Season|SPRING:Season|CHEESE:Food|BANANA:Fruit|CARROT:Vegetable|POTATO:Vegetable|GUITAR:Instrument|VIOLIN:Instrument|BASKET:Thing|BRIDGE:Building|WINDOW:House|SCHOOL:Place|DOCTOR:Job|PIRATE:Story|PUZZLE:Game|CIRCLE:Shape|PURPLE:Colour',
  // Tier 4 – 7 letters
  'DOLPHIN:Sea animal|PENGUIN:Bird|GIRAFFE:Animal|OCTOPUS:Sea animal|CHICKEN:Farm animal|LEOPARD:Big cat|HAMSTER:Pet|BALLOON:Party|BICYCLE:Vehicle|CAPTAIN:Job|CRYSTAL:Mineral|DIAMOND:Gem|HARMONY:Music|JOURNEY:Travel|KITCHEN:Room|LIBRARY:Place|MACHINE:Technology|MORNING:Time of day|MYSTERY:Story|PICTURE:Art|PYRAMID:Shape|RAINBOW:Weather|SCIENCE:School subject|THUNDER:Weather|TORNADO:Weather|VOLCANO:Nature|BLANKET:Bedroom|COMPASS:Navigation|LANTERN:Light',
  // Tier 5 – 8–9 letters
  'ELEPHANT:Animal|KANGAROO:Animal|DINOSAUR:Prehistoric|BUTTERFLY:Insect|CROCODILE:Reptile|MOUNTAIN:Nature|UMBRELLA:Rain gear|SANDWICH:Food|CHOCOLATE:Sweet|PINEAPPLE:Fruit|COMPUTER:Technology|KEYBOARD:Technology|TELESCOPE:Science|HOSPITAL:Place|AIRPLANE:Vehicle|SUBMARINE:Vehicle|BIRTHDAY:Celebration|CALENDAR:Time|NOTEBOOK:School|TREASURE:Pirates|ADVENTURE:Story|CHAMPION:Sport|LANGUAGE:Words|UNIVERSE:Space|SQUIRREL:Animal|FLAMINGO:Bird|SNOWFLAKE:Weather|FIREWORK:Celebration|HEDGEHOG:Animal',
]
const TIERS: Entry[][] = RAW.map((block) =>
  block.split('|').map((s) => {
    const [word, cat, emoji] = s.split(':')
    return { word, cat, emoji }
  }),
)

function tierFor(d: number, young: boolean): number {
  if (young) return d <= 4 ? 0 : 1
  if (d <= 2) return 1
  if (d <= 4) return 2
  if (d <= 6) return 3
  if (d <= 9) return 4
  return 5
}

const ROUNDS = 6

interface Tile {
  id: number
  ch: string
}

function scramble(word: string, rng: Rng): Tile[] {
  let letters = shuffle(word.split(''), rng)
  for (let i = 0; i < 20 && letters.join('') === word; i++) letters = shuffle(word.split(''), rng)
  if (letters.join('') === word) letters = [...letters.slice(1), letters[0]]
  return letters.map((ch, id) => ({ id, ch }))
}

function WordPuzzle({ diff, rng, paused, api }: GameProps) {
  const words = useMemo(() => sample(TIERS[tierFor(diff.d, diff.young)], ROUNDS, rng), []) // eslint-disable-line react-hooks/exhaustive-deps
  const [round, setRound] = useState(0)
  const [tiles, setTiles] = useState<Tile[]>(() => scramble(words[0].word, rng))
  const [answer, setAnswer] = useState<number[]>([])
  const [state, setState] = useState<'play' | 'right' | 'wrong' | 'skipped'>('play')
  const [hints, setHints] = useState(0)
  const finished = useRef(false)
  const entry = words[round]
  const word = entry.word
  const typed = answer.map((id) => tiles.find((t) => t.id === id)!.ch).join('')

  useEffect(() => api.progress(round, ROUNDS), [round, api])

  const nextRound = useCallback(() => {
    const r = round + 1
    if (r >= ROUNDS) {
      if (!finished.current) {
        finished.current = true
        api.progress(ROUNDS, ROUNDS)
        play('win')
        api.finish({ completed: true })
      }
      return
    }
    setRound(r)
    setTiles(scramble(words[r].word, rng))
    setAnswer([])
    setHints(0)
    setState('play')
  }, [round, api, words, rng])

  const check = useCallback(
    (ans: number[]) => {
      const guess = ans.map((id) => tiles.find((t) => t.id === id)!.ch).join('')
      if (guess === word) {
        play('correct')
        api.correct(Math.round(10 * diff.d * (hints ? 0.6 : 1) + word.length * 2))
        setState('right')
        window.setTimeout(nextRound, 900)
      } else {
        play('wrong')
        api.wrong()
        setState('wrong')
        window.setTimeout(() => {
          setAnswer([])
          setState('play')
        }, 800)
      }
    },
    [tiles, word, api, diff.d, hints, nextRound],
  )

  const add = useCallback(
    (id: number) => {
      if (paused || state !== 'play' || answer.includes(id)) return
      play('tap')
      const next = [...answer, id]
      setAnswer(next)
      if (next.length === word.length) check(next)
    },
    [paused, state, answer, word.length, check],
  )

  const backspace = useCallback(() => {
    if (paused || state !== 'play') return
    setAnswer((a) => a.slice(0, -1))
  }, [paused, state])

  const skip = () => {
    if (paused || state !== 'play') return
    play('wrong')
    api.wrong()
    setState('skipped')
    window.setTimeout(nextRound, 1500)
  }

  useEffect(() => {
    if (paused) return
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement | null
      if (t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA')) return
      if (e.metaKey || e.ctrlKey || e.altKey) return
      if (e.key === 'Backspace') {
        e.preventDefault()
        backspace()
        return
      }
      const k = e.key.toUpperCase()
      if (k.length === 1 && k >= 'A' && k <= 'Z') {
        const tile = tiles.find((tl) => tl.ch === k && !answer.includes(tl.id))
        if (tile) add(tile.id)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [paused, tiles, answer, add, backspace])

  useEffect(() => {
    api.onHint(() => {
      if (state !== 'play') return 'Get ready for the next word…'
      let prefix = 0
      while (prefix < answer.length && typed[prefix] === word[prefix]) prefix++
      if (prefix >= word.length - 1) return `The word is ${word.slice(0, -1)}…`
      const kept = answer.slice(0, prefix)
      const need = word[prefix]
      const tile = tiles.find((t) => t.ch === need && !kept.includes(t.id))
      if (!tile) return `Starts with “${word.slice(0, prefix + 1)}”.`
      setAnswer([...kept, tile.id])
      setHints((h) => h + 1)
      return `Letter ${prefix + 1} is “${need}”.`
    })
    return () => api.onHint(null)
  }, [api, state, answer, typed, word, tiles])

  const status =
    state === 'right' ? 'Correct!' : state === 'wrong' ? 'Not quite – try again.' : state === 'skipped' ? `Skipped. The word was ${word}.` : ''

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col items-center gap-5">
      <div className="bcard flex w-full flex-col items-center gap-2 px-4 py-5 text-center">
        <span className="bchip bg-primary-soft text-primary">
          Word {round + 1} of {ROUNDS}
        </span>
        {diff.young && entry.emoji && (
          <span className="text-6xl" role="img" aria-label="Picture clue">
            {entry.emoji}
          </span>
        )}
        <p className="font-display text-lg font-semibold">
          {diff.young ? 'Clue' : 'Category'}: <span className="text-primary">{entry.cat}</span> · {word.length} letters
        </p>
      </div>

      <motion.div
        animate={state === 'wrong' ? { x: [0, -8, 8, -6, 6, 0] } : { x: 0 }}
        transition={{ duration: 0.4 }}
        className="flex flex-wrap justify-center gap-1.5 sm:gap-2"
        aria-label={`Your answer: ${typed || 'empty'}`}
        role="group"
      >
        {word.split('').map((ch, i) => {
          const id = answer[i]
          const letter = state === 'skipped' ? ch : id !== undefined ? tiles.find((t) => t.id === id)!.ch : ''
          return (
            <button
              key={i}
              type="button"
              onClick={() => {
                if (id === undefined || state !== 'play' || paused) return
                setAnswer((a) => a.filter((x) => x !== id))
              }}
              aria-label={letter ? `Slot ${i + 1}: ${letter}. Tap to remove.` : `Slot ${i + 1}: empty`}
              className={`grid size-11 place-items-center rounded-xl border-2 font-display text-2xl font-bold sm:size-14 sm:text-3xl ${
                state === 'right'
                  ? 'border-success bg-success/15 text-ink'
                  : state === 'wrong'
                    ? 'border-danger bg-danger/10 text-ink'
                    : state === 'skipped'
                      ? 'border-accent bg-accent/15 text-ink'
                      : letter
                        ? 'border-primary bg-primary-soft text-primary'
                        : 'border-dashed border-line bg-white'
              }`}
            >
              {letter}
            </button>
          )
        })}
      </motion.div>

      <p role="status" aria-live="polite" className="flex min-h-7 items-center gap-2 font-bold">
        {state === 'right' && <Check size={20} className="text-success" />}
        {state === 'wrong' && <X size={20} className="text-danger" />}
        {status}
      </p>

      <div role="group" aria-label="Letter tiles" className="flex flex-wrap justify-center gap-2">
        {tiles.map((t) => {
          const used = answer.includes(t.id)
          return (
            <motion.button
              key={`${round}-${t.id}`}
              type="button"
              initial={{ scale: 0.5, opacity: 0 }}
              animate={{ scale: 1, opacity: used ? 0.25 : 1 }}
              disabled={used || state !== 'play' || paused}
              onClick={() => add(t.id)}
              aria-label={`Letter ${t.ch}${used ? ', used' : ''}`}
              className="btile grid size-14 place-items-center text-3xl sm:size-16"
            >
              {t.ch}
            </motion.button>
          )
        })}
      </div>

      <div className="flex gap-3">
        <button type="button" className="bbtn-ghost" onClick={backspace} disabled={!answer.length || state !== 'play'}>
          <Delete size={18} /> Back
        </button>
        <button type="button" className="bbtn-ghost" onClick={skip} disabled={state !== 'play'}>
          <SkipForward size={18} /> Skip
        </button>
      </div>
    </div>
  )
}

export const wordPuzzle: GameDef = {
  id: 'word-scramble',
  category: 'puzzle',
  skill: 'pattern',
  title: 'Word Scramble',
  emoji: '🔤',
  blurb: 'Unscramble the letters to find the hidden word.',
  instructions: [
    'Tap the letters in the right order to spell the word (or type them).',
    'Use the category as a clue. Backspace removes a letter.',
    'Skipping a word counts as a miss.',
    `Solve all ${ROUNDS} words to finish.`,
  ],
  kidInstructions: ['Look at the picture.', 'Tap the letters to spell the word!', 'Tap Back to fix a mistake.'],
  timeLimit: (d) => {
    const len = [3, 4, 5, 6, 7, 8.5][tierFor(d.d, d.young)]
    return Math.round(ROUNDS * (25 + len * 6) * d.time)
  },
  timeoutCompletes: false,
  component: WordPuzzle,
}
