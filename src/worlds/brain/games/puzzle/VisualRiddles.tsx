import type { Difficulty } from '../../lib/difficulty'
import { numericOptions, pick, randInt, shuffle, type Rng } from '../../lib/random'
import { createQuizGame, type QuizQuestion } from '../shared/QuizEngine'
import type { GameDef } from '../types'

/* ------------------------------------------------------------------ */
/* Hand-written riddles. Options are "emoji name"; the first is right. */
/* ------------------------------------------------------------------ */

interface Riddle {
  q: string
  kid?: string
  opts: [string, string, string, string]
  why: string
  min: number // minimum difficulty
}

const RIDDLES: Riddle[] = [
  { q: 'What has hands but cannot clap?', opts: ['⏰ clock', '🧤 glove', '🐒 monkey', '🤖 robot'], why: 'A clock has hands that point to the time.', min: 1 },
  { q: 'What has keys but cannot open locks?', opts: ['🎹 piano', '🚪 door', '🔐 padlock', '🚗 car'], why: 'A piano has black and white keys.', min: 1 },
  { q: 'What gets wetter the more it dries?', opts: ['🧻 towel', '☀️ sun', '🔥 fire', '🌵 cactus'], why: 'A towel gets wet as it dries you.', min: 3 },
  { q: 'What has one eye but cannot see?', opts: ['🪡 needle', '🐙 octopus', '🌀 storm', '🔭 telescope'], why: 'A needle has an “eye” for the thread.', min: 3 },
  { q: 'What goes up but never comes down?', opts: ['🎂 your age', '🎈 balloon', '🚀 rocket', '🐦 bird'], why: 'Your age only goes up every birthday.', min: 4 },
  { q: 'What has a neck but no head?', opts: ['🍾 bottle', '🦒 giraffe', '👕 shirt', '🦢 swan'], why: 'A bottle has a narrow neck at the top.', min: 2 },
  { q: 'What runs but has no legs?', opts: ['🚰 water', '🐆 cheetah', '🏃 runner', '🐌 snail'], why: 'Water runs from a tap or down a river.', min: 2 },
  { q: 'What can you catch but not throw?', opts: ['🤧 a cold', '⚾ ball', '🐟 fish', '🥏 frisbee'], why: 'You can catch a cold, but you cannot throw it.', min: 4 },
  { q: 'What has many teeth but cannot bite?', opts: ['🪮 comb', '🦈 shark', '🐊 crocodile', '🦷 tooth'], why: 'A comb has lots of “teeth”.', min: 2 },
  { q: 'What is full of holes but still holds water?', opts: ['🧽 sponge', '🪣 bucket', '🥛 glass', '🛁 bath'], why: 'A sponge is full of holes and soaks up water.', min: 3 },
  { q: 'What has legs but cannot walk?', opts: ['🪑 chair', '🐕 dog', '🦀 crab', '🕷️ spider'], why: 'A chair has legs but stays still.', min: 1 },
  { q: 'What do you break by saying its name?', opts: ['🤫 silence', '🥚 egg', '🍪 cookie', '🪟 window'], why: 'Saying “silence” breaks the silence!', min: 6 },
  { q: 'What has a face and two hands but no arms?', opts: ['🕰️ clock', '🤡 clown', '🧸 teddy', '🌻 sunflower'], why: 'A clock has a face and hands.', min: 1 },
  { q: 'What falls but never gets hurt?', opts: ['🌧️ rain', '🍎 apple', '🧗 climber', '🍂 leaf'], why: 'Rain falls from the sky all the time.', min: 2 },
  { q: 'I am yellow, I peel, and monkeys love me. What am I?', kid: 'Yellow, peel it, monkeys love it!', opts: ['🍌 banana', '🍋 lemon', '🌽 corn', '🧀 cheese'], why: 'A banana is yellow and you peel it.', min: 1 },
  { q: 'I have a shell and move very slowly. What am I?', opts: ['🐌 snail', '🐇 rabbit', '🦅 eagle', '🐎 horse'], why: 'A snail carries its shell and moves slowly.', min: 1 },
  { q: 'What has stripes and lives in Africa?', opts: ['🦓 zebra', '🐧 penguin', '🐻‍❄️ polar bear', '🐨 koala'], why: 'Zebras have black and white stripes.', min: 1 },
  { q: 'What shines in the sky at night?', opts: ['🌙 moon', '☀️ sun', '🌈 rainbow', '☁️ cloud'], why: 'The moon shines at night.', min: 1 },
  { q: 'What has a thumb and four fingers but is not alive?', opts: ['🧤 glove', '✋ hand', '🦶 foot', '🐾 paw'], why: 'A glove has a thumb and fingers.', min: 3 },
  { q: 'What can travel around the world while staying in a corner?', opts: ['📮 stamp', '✈️ plane', '🌍 globe', '🧭 compass'], why: 'A stamp sits in the corner of a letter.', min: 7 },
  { q: 'What has words but never speaks?', opts: ['📖 book', '🦜 parrot', '📞 phone', '📻 radio'], why: 'A book is full of words but is silent.', min: 3 },
  { q: 'The more you take, the more you leave behind. What are they?', opts: ['👣 footsteps', '🍪 cookies', '📸 photos', '💰 coins'], why: 'Every step you take leaves a footprint behind.', min: 6 },
  { q: 'What can fill a room but takes up no space?', opts: ['💡 light', '🎈 balloon', '🛋️ sofa', '📦 box'], why: 'Light fills a room but takes no space.', min: 5 },
  { q: 'What has a bark but no bite?', opts: ['🌳 tree', '🐶 dog', '🐺 wolf', '🦭 seal'], why: 'Trees are covered in bark.', min: 4 },
  { q: 'What goes up when rain comes down?', opts: ['☂️ umbrella', '🌡️ temperature', '🪁 kite', '🌻 sunflower'], why: 'You open an umbrella when it rains.', min: 2 },
  { q: 'What has an eye but cannot see, and spins very fast?', opts: ['🌀 hurricane', '🪡 needle', '🎡 wheel', '🧿 charm'], why: 'A hurricane spins around a calm “eye”.', min: 8 },
  { q: 'What belongs to you, but others use it more than you do?', opts: ['📛 your name', '🚲 your bike', '🧸 your toy', '🏠 your house'], why: 'Other people say your name more than you do.', min: 8 },
  { q: 'What month has 28 days?', opts: ['📅 all of them', '❄️ February', '🌸 April', '🎃 October'], why: 'Every month has at least 28 days!', min: 9 },
]

/** "Which emoji continues the story?" */
const STORIES: { seq: string[]; opts: [string, string, string, string]; why: string; min: number }[] = [
  { seq: ['🥚', '🐣', '🐥'], opts: ['🐔 hen', '🐟 fish', '🥚 egg', '🐸 frog'], why: 'An egg hatches into a chick that grows into a hen.', min: 1 },
  { seq: ['🌱', '🌿', '🌳'], opts: ['🍎 apples on the tree', '🌱 seed', '🔥 fire', '🌵 cactus'], why: 'A seedling grows into a tree that gives fruit.', min: 1 },
  { seq: ['🐛', '🛌', '🫘'], opts: ['🦋 butterfly', '🐝 bee', '🐞 ladybird', '🐜 ant'], why: 'A caterpillar makes a cocoon and becomes a butterfly.', min: 2 },
  { seq: ['🌑', '🌒', '🌓'], opts: ['🌔 bigger moon', '🌑 new moon', '☀️ sun', '⭐ star'], why: 'The moon grows a little more each night.', min: 3 },
  { seq: ['🌅', '☀️', '🌇'], opts: ['🌃 night', '🌅 sunrise', '🌈 rainbow', '❄️ snow'], why: 'Sunrise, midday, sunset… then night.', min: 2 },
  { seq: ['🥛', '🍫', '🥄'], opts: ['☕ hot chocolate', '🍞 bread', '🍕 pizza', '🧃 juice box'], why: 'Milk + chocolate, stirred → hot chocolate.', min: 3 },
  { seq: ['☁️', '🌧️', '☀️'], opts: ['🌈 rainbow', '❄️ snow', '🌪️ tornado', '🌙 moon'], why: 'Rain followed by sunshine makes a rainbow.', min: 2 },
  { seq: ['🌾', '🏭', '🍞'], opts: ['🥪 sandwich', '🌾 wheat', '🐄 cow', '🍇 grapes'], why: 'Wheat becomes flour, then bread, then a sandwich.', min: 5 },
  { seq: ['😴', '⏰', '🪥'], opts: ['🥣 breakfast', '🛌 bed', '🌙 moon', '🦉 owl'], why: 'Wake up, brush your teeth, then breakfast.', min: 2 },
  { seq: ['🐸🥚', '🐟', '🐸'], opts: ['🐸 jumping frog', '🦎 lizard', '🐍 snake', '🐢 turtle'], why: 'Frogspawn → tadpole → young frog → grown frog.', min: 6 },
  { seq: ['🧊', '💧', '♨️'], opts: ['☁️ steam cloud', '🧊 ice', '🔥 fire', '🪨 rock'], why: 'Ice melts to water, then boils into steam.', min: 6 },
  { seq: ['🎂', '🕯️', '🌬️'], opts: ['🎉 party', '🧁 cupcake', '🎈 balloon pop', '😢 sad'], why: 'Cake, candles, blow them out – then celebrate!', min: 3 },
]

function splitOpt(s: string) {
  const i = s.indexOf(' ')
  return { e: s.slice(0, i), name: s.slice(i + 1) }
}

function emojiOptions(opts: readonly string[], rng: Rng, showName: boolean) {
  const answer = splitOpt(opts[0])
  const options = shuffle(
    opts.map((o, i) => {
      const { e, name } = splitOpt(o)
      return {
        id: `o${i}`,
        label: (
          <span className="flex flex-col items-center gap-1">
            <span className="text-4xl sm:text-5xl">{e}</span>
            {showName && <span className="text-sm font-semibold text-muted">{name}</span>}
          </span>
        ),
        aria: name,
      }
    }),
    rng,
  )
  return { options, answerId: 'o0', answer }
}

function riddleQ(diff: Difficulty, rng: Rng): QuizQuestion {
  const pool = RIDDLES.filter((r) => r.min <= diff.d + 1)
  const r = pick(pool, rng)
  const { options, answerId } = emojiOptions(r.opts, rng, true)
  return {
    key: `r-${r.q}`,
    prompt: <span>🤔 {diff.young && r.kid ? r.kid : r.q}</span>,
    options,
    answerId,
    explanation: r.why,
    hint: 'Think about other meanings of the words.',
    columns: 2,
  }
}

function storyQ(diff: Difficulty, rng: Rng): QuizQuestion {
  const pool = STORIES.filter((s) => s.min <= diff.d + 1)
  const s = pick(pool, rng)
  const { options, answerId } = emojiOptions(s.opts, rng, true)
  return {
    key: `s-${s.seq.join('')}`,
    prompt: (
      <span className="flex flex-col items-center gap-3">
        <span>{diff.young ? 'What comes next?' : 'Which picture continues the story?'}</span>
        <span className="flex items-center gap-2 text-5xl">
          {s.seq.map((x, i) => (
            <span key={i} className="flex items-center gap-2">
              {x}
              <span className="text-2xl text-muted">→</span>
            </span>
          ))}
          <span className="text-primary">?</span>
        </span>
      </span>
    ),
    promptAria: `Which picture continues the story: ${s.seq.join(', then ')}?`,
    options,
    answerId,
    explanation: s.why,
    hint: 'Think about what happens over time.',
    columns: 2,
  }
}

const FRUITS = ['🍎', '🍌', '🍇', '🍓', '🍊', '🍒', '🥝', '🍍']
const FRUIT_NAMES: Record<string, string> = { '🍎': 'apple', '🍌': 'banana', '🍇': 'grapes', '🍓': 'strawberry', '🍊': 'orange', '🍒': 'cherries', '🥝': 'kiwi', '🍍': 'pineapple' }

function emojiMathQ(diff: Difficulty, rng: Rng): QuizQuestion {
  const three = diff.d >= 7
  const [x, y, z] = shuffle(FRUITS, rng)
  const max = diff.d <= 3 ? 5 : diff.d <= 6 ? 10 : 15
  const a = randInt(1, max, rng)
  let b = randInt(1, max, rng)
  if (b === a) b = a + 1
  const c = randInt(1, max, rng)
  const lines: { eq: string; aria: string }[] = []
  let ans: number
  let why: string
  const X = FRUIT_NAMES[x]
  const Y = FRUIT_NAMES[y]
  const Z = FRUIT_NAMES[z]
  if (!three) {
    lines.push({ eq: `${x} + ${x} = ${2 * a}`, aria: `${X} plus ${X} equals ${2 * a}` })
    lines.push({ eq: `${x} + ${y} = ${a + b}`, aria: `${X} plus ${Y} equals ${a + b}` })
    lines.push({ eq: `${y} = ?`, aria: `What is ${Y}?` })
    ans = b
    why = `${X} = ${2 * a} ÷ 2 = ${a}, so ${Y} = ${a + b} − ${a} = ${b}.`
  } else {
    lines.push({ eq: `${x} + ${x} + ${x} = ${3 * a}`, aria: `three ${X} equal ${3 * a}` })
    lines.push({ eq: `${x} + ${y} = ${a + b}`, aria: `${X} plus ${Y} equals ${a + b}` })
    lines.push({ eq: `${y} + ${z} = ${b + c}`, aria: `${Y} plus ${Z} equals ${b + c}` })
    if (diff.d >= 10) {
      lines.push({ eq: `${x} + ${y} × ${z} = ?`, aria: `What is ${X} plus ${Y} times ${Z}?` })
      ans = a + b * c
      why = `${X}=${a}, ${Y}=${b}, ${Z}=${c}. Multiply first: ${a} + ${b}×${c} = ${ans}.`
    } else {
      lines.push({ eq: `${z} = ?`, aria: `What is ${Z}?` })
      ans = c
      why = `${X} = ${3 * a} ÷ 3 = ${a}, ${Y} = ${a + b} − ${a} = ${b}, ${Z} = ${b + c} − ${b} = ${c}.`
    }
  }
  return {
    key: `m-${lines.map((l) => l.eq).join()}`,
    prompt: (
      <span className="flex flex-col items-center gap-2 text-3xl sm:text-4xl">
        {lines.map((l, i) => (
          <span key={i}>{l.eq}</span>
        ))}
      </span>
    ),
    promptAria: lines.map((l) => l.aria).join('. '),
    options: numericOptions(ans, 4, Math.max(3, Math.round(ans * 0.3)), rng).map((v) => ({ id: String(v), label: v, aria: String(v) })),
    answerId: String(ans),
    explanation: why,
    hint: 'Solve the first line to find the first fruit, then use it in the next line.',
  }
}

function countSquares(n: number, m: number) {
  let t = 0
  for (let k = 1; k <= Math.min(n, m); k++) t += (n - k + 1) * (m - k + 1)
  return t
}

function squaresQ(diff: Difficulty, rng: Rng): QuizQuestion {
  const dims: [number, number][] =
    diff.d <= 3 ? [[2, 2], [1, 3], [2, 3]] : diff.d <= 6 ? [[2, 3], [3, 3], [2, 4]] : diff.d <= 9 ? [[3, 3], [3, 4], [2, 5]] : [[4, 4], [3, 5], [4, 5]]
  const [rows, cols] = pick(dims, rng)
  const ans = countSquares(rows, cols)
  const s = 40
  const parts: string[] = []
  for (let k = 1; k <= Math.min(rows, cols); k++) parts.push(`${(rows - k + 1) * (cols - k + 1)} of size ${k}×${k}`)
  return {
    key: `sq-${rows}x${cols}`,
    prompt: (
      <span className="flex flex-col items-center gap-3">
        <span>How many squares can you find? (Count big ones too!)</span>
        <svg viewBox={`-4 -4 ${cols * s + 8} ${rows * s + 8}`} width={Math.min(260, cols * 56)} aria-hidden>
          {Array.from({ length: rows + 1 }, (_, i) => (
            <line key={`h${i}`} x1={0} y1={i * s} x2={cols * s} y2={i * s} stroke="#7557f6" strokeWidth="3" strokeLinecap="round" />
          ))}
          {Array.from({ length: cols + 1 }, (_, i) => (
            <line key={`v${i}`} x1={i * s} y1={0} x2={i * s} y2={rows * s} stroke="#7557f6" strokeWidth="3" strokeLinecap="round" />
          ))}
        </svg>
      </span>
    ),
    promptAria: `A grid of ${rows} rows and ${cols} columns of small squares. How many squares in total, counting bigger squares made of smaller ones?`,
    options: numericOptions(ans, 4, Math.max(2, Math.round(ans * 0.3)), rng).map((v) => ({ id: String(v), label: v, aria: String(v) })),
    answerId: String(ans),
    explanation: `${parts.join(' + ')} = ${ans} squares.`,
    hint: 'Count the small squares first, then the 2×2 squares, and so on.',
  }
}

function trianglesQ(diff: Difficulty, rng: Rng): QuizQuestion {
  // Fan: lines from the apex to the base split it into p parts → p(p+1)/2 triangles.
  // Grid: triangle subdivided into rows of side k → floor(k(k+2)(2k+1)/8).
  const useGrid = diff.d >= 6 && rng() < 0.6
  const W = 200
  const H = 174
  if (!useGrid) {
    const p = diff.d <= 3 ? randInt(2, 3, rng) : randInt(3, 5, rng)
    const ans = (p * (p + 1)) / 2
    return {
      key: `tf-${p}`,
      prompt: (
        <span className="flex flex-col items-center gap-3">
          <span>How many triangles are there?</span>
          <svg viewBox={`-6 -6 ${W + 12} ${H + 12}`} width="220" aria-hidden>
            <path d={`M${W / 2} 0 L${W} ${H} L0 ${H}Z`} fill="#ece8ff" stroke="#7557f6" strokeWidth="3" strokeLinejoin="round" />
            {Array.from({ length: p - 1 }, (_, i) => (
              <line key={i} x1={W / 2} y1={0} x2={((i + 1) * W) / p} y2={H} stroke="#7557f6" strokeWidth="3" />
            ))}
          </svg>
        </span>
      ),
      promptAria: `A triangle with ${p - 1} lines from the top corner to the bottom edge, splitting it into ${p} thin parts. How many triangles in total?`,
      options: numericOptions(ans, 4, 3, rng).map((v) => ({ id: String(v), label: v, aria: String(v) })),
      answerId: String(ans),
      explanation: `Any two of the ${p + 1} lines from the top make a triangle: ${Array.from({ length: p }, (_, i) => p - i).join(' + ')} = ${ans}.`,
      hint: 'Count single parts, then pairs of neighbouring parts, then three together…',
    }
  }
  const k = diff.d <= 9 ? 2 : pick([2, 3], rng)
  const ans = Math.floor((k * (k + 2) * (2 * k + 1)) / 8)
  // Lattice point (row, col) of the subdivided triangle.
  const pt = (row: number, col: number): [number, number] => [W / 2 - (W / 2) * (row / k) + (W / k) * col, (H * row) / k]
  const segs: [number, number, number, number][] = []
  for (let i = 1; i < k; i++) {
    const [ax, ay] = pt(i, 0)
    const [bx, by] = pt(i, i)
    segs.push([ax, ay, bx, by])
    const [cx, cy] = pt(k, i)
    const [dx, dy] = pt(i, i) // parallel to left side: from (k,i) up to (i,i)
    segs.push([cx, cy, dx, dy])
    const [ex, ey] = pt(k - i, 0) // parallel to right side: from (k,i) up to (k-i,0)
    segs.push([cx, cy, ex, ey])
  }
  return {
    key: `tg-${k}`,
    prompt: (
      <span className="flex flex-col items-center gap-3">
        <span>How many triangles are there? (Big ones count too!)</span>
        <svg viewBox={`-6 -6 ${W + 12} ${H + 12}`} width="220" aria-hidden>
          <path d={`M${W / 2} 0 L${W} ${H} L0 ${H}Z`} fill="#ece8ff" stroke="#7557f6" strokeWidth="3" strokeLinejoin="round" />
          {segs.map(([x1, y1, x2, y2], i) => (
            <line key={i} x1={x1} y1={y1} x2={x2} y2={y2} stroke="#7557f6" strokeWidth="3" />
          ))}
        </svg>
      </span>
    ),
    promptAria: `A big triangle divided into ${k * k} small triangles, ${k} rows high. How many triangles in total, of all sizes and directions?`,
    options: numericOptions(ans, 4, 4, rng).map((v) => ({ id: String(v), label: v, aria: String(v) })),
    answerId: String(ans),
    explanation:
      k === 2
        ? '4 small triangles + 1 big one = 5.'
        : '9 small (6 pointing up, 3 down) + 3 medium + 1 big = 13.',
    hint: 'Count small triangles, including upside-down ones, then bigger ones.',
  }
}

function gen(diff: Difficulty, rng: Rng, round: number): QuizQuestion {
  const kinds = diff.d <= 2 ? ['riddle', 'story', 'math', 'tri'] : ['riddle', 'story', 'math', 'squares', 'tri']
  const kind = kinds[(round + Math.floor(rng() * kinds.length)) % kinds.length]
  switch (kind) {
    case 'riddle':
      return riddleQ(diff, rng)
    case 'story':
      return storyQ(diff, rng)
    case 'math':
      return emojiMathQ(diff, rng)
    case 'squares':
      return squaresQ(diff, rng)
    default:
      return trianglesQ(diff, rng)
  }
}

export const visualRiddles: GameDef = {
  id: 'visual-riddles',
  category: 'puzzle',
  skill: 'logic',
  title: 'Picture Riddles',
  emoji: '🤔',
  blurb: 'Emoji maths, shape counting and brain-teasing riddles.',
  instructions: [
    'Solve each picture puzzle or riddle.',
    'Emoji maths: work out what each picture is worth.',
    'Counting puzzles: remember bigger shapes made of smaller ones.',
    'Read the explanation after each answer.',
  ],
  kidInstructions: ['Look at the pictures.', 'Pick the right answer!', 'Some are tricky – think carefully.'],
  timeLimit: (d) => Math.round(150 * d.time),
  component: createQuizGame('visual-riddles', { rounds: (d) => 6 + Math.min(4, Math.floor(d.d / 3)), generate: gen, explain: true }),
}
