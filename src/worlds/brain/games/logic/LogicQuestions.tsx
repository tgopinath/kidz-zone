import type { Difficulty } from '../../lib/difficulty'
import { pick, randInt, sample, shuffle, type Rng } from '../../lib/random'
import { createQuizGame, type QuizQuestion } from '../shared/QuizEngine'
import type { GameDef } from '../types'
import { textOptions } from './quizUtil'

type Tier = 'young' | 'mid' | 'adult'

interface BankQ {
  t: Tier
  q: string
  a: string
  w: string[]
  why: string
  hint?: string
}

/** Hand-written reasoning questions. Every wrong option is genuinely wrong. */
const BANK: BankQ[] = [
  // ---------- young ----------
  { t: 'young', q: 'All cats have whiskers. Tom is a cat. Does Tom have whiskers?', a: 'Yes', w: ['No', 'Only on Sundays'], why: 'Every cat has whiskers, and Tom is a cat – so Tom has whiskers too.' },
  { t: 'young', q: 'Which one can fly? 🐦 🐟 🐢 🐌', a: '🐦 Bird', w: ['🐟 Fish', '🐢 Turtle', '🐌 Snail'], why: 'Birds have wings to fly. Fish swim, turtles and snails crawl.' },
  { t: 'young', q: 'A dog has 4 legs. How many legs do 2 dogs have?', a: '8', w: ['4', '6', '10'], why: '4 legs + 4 legs = 8 legs.' },
  { t: 'young', q: 'Sam is taller than Lily. Who is shorter?', a: 'Lily', w: ['Sam', 'They are the same'], why: 'If Sam is taller than Lily, then Lily must be the shorter one.' },
  { t: 'young', q: 'What happens to ice if you leave it in the hot sun?', a: 'It melts', w: ['It grows', 'It gets colder', 'It turns into a rock'], why: 'Heat turns ice back into water – it melts.' },
  { t: 'young', q: 'Which is bigger? 🐘 or 🐭', a: '🐘 Elephant', w: ['🐭 Mouse', 'They are the same size'], why: 'An elephant is one of the biggest animals; a mouse is tiny.' },
  { t: 'young', q: 'There are 5 birds on a tree. 2 fly away. How many are left?', a: '3', w: ['7', '2', '5'], why: '5 take away 2 leaves 3 birds.' },
  { t: 'young', q: 'If it is raining, what is best to take outside?', a: '☂️ Umbrella', w: ['🕶️ Sunglasses', '🏖️ Beach ball', '🧤 Oven gloves'], why: 'An umbrella keeps the rain off you.' },
  { t: 'young', q: 'Ben has more sweets than Ana. Ana has more sweets than Zoe. Who has the most?', a: 'Ben', w: ['Ana', 'Zoe'], why: 'Ben has more than Ana, and Ana has more than Zoe, so Ben has the most.' },
  { t: 'young', q: 'How many days are in one week?', a: '7', w: ['5', '10', '12'], why: 'Monday to Sunday makes 7 days.' },
  { t: 'young', q: 'What is the opposite of hot?', a: 'Cold', w: ['Warm', 'Sunny', 'Big'], why: 'Hot and cold are opposites.' },
  { t: 'young', q: 'I am round and you kick me in a game. What am I?', a: '⚽ A ball', w: ['📚 A book', '🍌 A banana', '🪑 A chair'], why: 'You kick a ball in football.' },
  { t: 'young', q: 'You have 2 hands with 5 fingers each. How many fingers is that?', a: '10', w: ['5', '7', '12'], why: '5 + 5 = 10 fingers.' },
  { t: 'young', q: 'Which season comes after winter?', a: 'Spring', w: ['Autumn', 'Summer', 'Winter again'], why: 'The order is winter, spring, summer, autumn.' },
  { t: 'young', q: 'All my toys are in the red box. My teddy is one of my toys. Where is my teddy?', a: 'In the red box', w: ['In the blue box', 'Under the bed', 'We cannot know'], why: 'All the toys are in the red box, and teddy is a toy – so teddy is in the red box.' },
  { t: 'young', q: 'Mia is older than Leo. Is Leo older than Mia?', a: 'No', w: ['Yes', 'Sometimes'], why: 'If Mia is older, Leo must be younger – not older.' },
  { t: 'young', q: 'You put on socks and shoes. Which goes on first?', a: '🧦 Socks', w: ['👟 Shoes', 'Both at the same time'], why: 'Socks go on first, then shoes go over them.' },
  // ---------- mid ----------
  { t: 'mid', q: 'A farmer has 17 sheep. All but 9 run away. How many are left?', a: '9', w: ['8', '17', '0'], why: '"All but 9" means 9 did not run away.', hint: 'Read "all but 9" slowly.' },
  { t: 'mid', q: 'How many months of the year have 28 days?', a: 'All 12', w: ['1', '2', '6'], why: 'Every month has at least 28 days – February just stops there.' },
  { t: 'mid', q: 'Some dogs are brown. Rex is a dog. Is Rex brown?', a: "Can't tell", w: ['Yes', 'No'], why: 'Only some dogs are brown, so Rex may or may not be brown.' },
  { t: 'mid', q: 'In a race you overtake the person in 2nd place. What place are you in now?', a: '2nd', w: ['1st', '3rd', 'Last'], why: 'You take their spot – 2nd. The leader is still ahead of you.' },
  { t: 'mid', q: "Tom's mother has three children: April, May and …?", a: 'Tom', w: ['June', 'July', 'March'], why: "It is Tom's mother, so Tom is the third child." },
  { t: 'mid', q: 'Which weighs more: 1 kg of feathers or 1 kg of iron?', a: 'They weigh the same', w: ['The iron', 'The feathers'], why: '1 kg is 1 kg – only the size is different.' },
  { t: 'mid', q: 'A clock shows exactly 3:00. What angle is between the hands?', a: '90°', w: ['45°', '120°', '180°'], why: 'Each hour mark is 30° apart; 3 hours × 30° = 90°.' },
  { t: 'mid', q: 'A cat sits in each corner of a square room. Each cat sees 3 other cats. How many cats are there?', a: '4', w: ['12', '16', '3'], why: 'One cat per corner = 4 cats; each sees the other 3.' },
  { t: 'mid', q: 'A rooster lays an egg on top of a pointed roof. Which side does it roll down?', a: 'Neither – roosters don’t lay eggs', w: ['The left side', 'The right side', 'It stays on top'], why: 'Roosters are male chickens and never lay eggs.' },
  { t: 'mid', q: 'What is half of 2 plus 2?', a: '3', w: ['2', '4', '1'], why: 'Half of 2 is 1, then 1 + 2 = 3.' },
  { t: 'mid', q: "Mary's father has five daughters: Nana, Nene, Nini, Nono and …?", a: 'Mary', w: ['Nunu', 'Nina', 'Nell'], why: "They are Mary's father's daughters, so Mary is the fifth." },
  { t: 'mid', q: 'A train leaves at 10:45 and the trip takes 50 minutes. When does it arrive?', a: '11:35', w: ['11:25', '11:45', '10:95'], why: '10:45 + 15 min = 11:00, plus the remaining 35 min = 11:35.' },
  { t: 'mid', q: '2 pencils cost 30p. How much do 6 pencils cost?', a: '90p', w: ['60p', '180p', '36p'], why: '6 pencils is 3 lots of 2 pencils, so 3 × 30p = 90p.' },
  { t: 'mid', q: 'A red house is made of red bricks and a blue house of blue bricks. What is a greenhouse made of?', a: 'Glass', w: ['Green bricks', 'Leaves', 'Grass'], why: 'A greenhouse is a glass building for growing plants.' },
  { t: 'mid', q: 'How many times can you take 5 away from 25?', a: 'Once', w: ['5 times', '4 times', '25 times'], why: 'After the first time it is no longer 25 – it is 20.' },
  { t: 'mid', q: 'If it takes 6 minutes to boil 1 egg, how long to boil 3 eggs together in one pot?', a: '6 minutes', w: ['18 minutes', '12 minutes', '2 minutes'], why: 'They boil at the same time, so it still takes 6 minutes.' },
  { t: 'mid', q: 'No fish can climb trees. Goldie is a fish. Can Goldie climb trees?', a: 'No', w: ['Yes', "Can't tell"], why: 'No fish can climb trees, and Goldie is a fish.' },
  // ---------- adult ----------
  { t: 'adult', q: 'A bat and a ball cost $1.10 in total. The bat costs $1.00 more than the ball. How much is the ball?', a: '5 cents', w: ['10 cents', '1 cent', '15 cents'], why: 'Ball = x, bat = x + 1.00, so 2x + 1.00 = 1.10 → x = 0.05.', hint: 'If the ball were 10¢ the bat would be $1.10.' },
  { t: 'adult', q: '5 machines make 5 widgets in 5 minutes. How long do 100 machines take to make 100 widgets?', a: '5 minutes', w: ['100 minutes', '20 minutes', '1 minute'], why: 'Each machine makes one widget in 5 minutes, working in parallel.' },
  { t: 'adult', q: 'A patch of lily pads doubles in size every day. It covers the lake on day 48. When did it cover half?', a: 'Day 47', w: ['Day 24', 'Day 46', 'Day 36'], why: 'It doubles daily, so the day before full it was half.' },
  { t: 'adult', q: 'All roses are flowers. Some flowers fade quickly. Must some roses fade quickly?', a: 'No – it doesn’t follow', w: ['Yes, always', 'Yes, most roses'], why: 'The quick-fading flowers might all be non-roses.' },
  { t: 'adult', q: 'It takes 6 minutes to saw a log into 3 pieces. How long to saw it into 4 pieces?', a: '9 minutes', w: ['8 minutes', '12 minutes', '6 minutes'], why: '3 pieces need 2 cuts (3 min each); 4 pieces need 3 cuts = 9 minutes.' },
  { t: 'adult', q: '"Brothers and sisters I have none, but that man’s father is my father’s son." Who is in the portrait?', a: 'The speaker’s son', w: ['The speaker himself', 'The speaker’s father', 'The speaker’s brother'], why: '"My father’s son" (no brothers) is the speaker, so the man’s father is the speaker.' },
  { t: 'adult', q: 'All A are B. No B are C. What must be true?', a: 'No A are C', w: ['Some A are C', 'All C are A', 'Some C are B'], why: 'Every A sits inside B, and B never overlaps C – so A can’t either.' },
  { t: 'adult', q: 'No politicians are honest. Some lawyers are politicians. What follows?', a: 'Some lawyers are not honest', w: ['No lawyers are honest', 'All lawyers are honest', 'Some politicians are honest'], why: 'The lawyers who are politicians cannot be honest; we know nothing about the rest.' },
  { t: 'adult', q: 'A fair coin lands heads 5 times in a row. What is the chance the next flip is heads?', a: '1/2', w: ['1/32', '1/64', '1/6'], why: 'Each flip is independent – past results do not change the odds.' },
  { t: 'adult', q: 'Cards have a letter on one side and a number on the other. Rule: "If a bcard has a vowel, its other side is even." Cards show E, K, 4, 7. Which must you turn to test the rule?', a: 'E and 7', w: ['E and 4', 'E only', 'All four'], why: 'E could hide an odd number; 7 could hide a vowel. K and 4 cannot break the rule.' },
  { t: 'adult', q: 'Five people meet and each shakes hands once with every other person. How many handshakes?', a: '10', w: ['20', '25', '5'], why: '5 × 4 ÷ 2 = 10 (each handshake involves two people).' },
  { t: 'adult', q: 'A doctor gives you 3 pills and says take one every half hour. How long do they last?', a: '1 hour', w: ['1.5 hours', '2 hours', '30 minutes'], why: 'Take one now, one at 30 min, one at 60 min – done after 1 hour.' },
  { t: 'adult', q: 'A snail climbs 3 m up a 10 m well each day and slips back 2 m each night. On which day does it get out?', a: 'Day 8', w: ['Day 10', 'Day 7', 'Day 9'], why: 'After 7 nights it is at 7 m; on day 8 it climbs 3 m and reaches the top.' },
  { t: 'adult', q: 'A is B’s sister. C is B’s mother. D is C’s father. What is D to A?', a: 'Grandfather', w: ['Father', 'Uncle', 'Great-grandfather'], why: 'C is A’s mother too, and D is C’s father – A’s grandfather.' },
  { t: 'adult', q: 'Which is larger: 2¹⁰ or 10³?', a: '2¹⁰', w: ['10³', 'They are equal'], why: '2¹⁰ = 1024 and 10³ = 1000.' },
  { t: 'adult', q: 'How many squares of any size are on a 3×3 grid?', a: '14', w: ['9', '10', '13'], why: '9 small squares + 4 two-by-two squares + 1 big square = 14.' },
  { t: 'adult', q: 'If you flip two fair coins, what is the chance both are heads?', a: '1/4', w: ['1/2', '1/3', '3/4'], why: 'Outcomes HH, HT, TH, TT are equally likely – only 1 of 4 is HH.' },
]

const NAMES_YOUNG = ['Ana', 'Ben', 'Cy', 'Dot', 'Eli', 'Fay', 'Gus', 'Ivy', 'Max', 'Zoe']
const NAMES = ['Ana', 'Ben', 'Cyrus', 'Dana', 'Elias', 'Farah', 'Gita', 'Hugo', 'Imani', 'Jonas', 'Kofi', 'Lena', 'Mateo', 'Nia', 'Omar', 'Priya', 'Ravi', 'Sofia']
const ATTRS = [
  { more: 'taller', most: 'tallest', least: 'shortest' },
  { more: 'older', most: 'oldest', least: 'youngest' },
  { more: 'faster', most: 'fastest', least: 'slowest' },
] as const
const NONSENSE = ['bloops', 'razzies', 'lazzles', 'snorks', 'quibs', 'flinks', 'zorbs', 'mibbles', 'wugs', 'tazzles']
const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']

function tierFor(diff: Difficulty): Tier {
  if (diff.young || diff.d <= 3) return 'young'
  if (diff.d <= 7) return 'mid'
  return 'adult'
}

function fromBank(diff: Difficulty, rng: Rng): QuizQuestion {
  const tier = tierFor(diff)
  // Older players sometimes get a question from the tier below for variety.
  const lower: Tier | null = tier === 'adult' ? 'mid' : tier === 'mid' ? 'young' : null
  const useLower = lower && rng() < 0.2
  const pool = BANK.map((b, i) => [b, i] as const).filter(([b]) => b.t === (useLower ? lower : tier))
  const [b, i] = pick(pool, rng)
  const { options, answerId } = textOptions(b.a, b.w, rng)
  return { key: `bank-${i}`, prompt: b.q, options, answerId, explanation: b.why, hint: b.hint, columns: options.length <= 3 ? options.length : 2 }
}

function ordering(diff: Difficulty, rng: Rng): QuizQuestion {
  const tier = tierFor(diff)
  const n = tier === 'adult' ? 4 : 3
  const names = sample(tier === 'young' ? NAMES_YOUNG : NAMES, n, rng) // ranked: names[0] is most
  const attr = pick(ATTRS, rng)
  const facts = shuffle(
    names.slice(0, -1).map((nm, i) => `${nm} is ${attr.more} than ${names[i + 1]}.`),
    rng,
  )
  const kind = tier === 'adult' ? pick(['most', 'least', 'second'] as const, rng) : pick(['most', 'least'] as const, rng)
  const answer = kind === 'most' ? names[0] : kind === 'least' ? names[n - 1] : names[1]
  const question = kind === 'most' ? `Who is the ${attr.most}?` : kind === 'least' ? `Who is the ${attr.least}?` : `Who is the second ${attr.most}?`
  const order = names.join(' > ')
  const { options, answerId } = textOptions(answer, names, rng, n)
  return {
    key: `ord-${names.join('')}-${attr.more}-${kind}`,
    prompt: (
      <span className="flex flex-col gap-2">
        {facts.map((f) => (
          <span key={f}>{f}</span>
        ))}
        <span className="text-primary">{question}</span>
      </span>
    ),
    promptAria: `${facts.join(' ')} ${question}`,
    options,
    answerId,
    explanation: `Putting them in order (${attr.most} first): ${order}. So the answer is ${answer}.`,
    hint: 'Line them up from most to least, one fact at a time.',
    columns: n === 4 ? 2 : 3,
  }
}

function syllogism(rng: Rng): QuizQuestion {
  const [x, y, z] = sample(NONSENSE, 3, rng)
  const forms = [
    { text: `All ${x} are ${y}. All ${y} are ${z}. Are all ${x} ${z}?`, a: 'Yes', why: `Every ${x} is a ${y.slice(0, -1)}, and every ${y.slice(0, -1)} is a ${z.slice(0, -1)} – so yes.` },
    { text: `All ${x} are ${y}. Some ${y} are ${z}. Must some ${x} be ${z}?`, a: "Can't tell", why: `The ${y} that are ${z} might not include any ${x}.` },
    { text: `No ${x} are ${y}. All ${z} are ${x}. Can any ${z} be ${y}?`, a: 'No', why: `Every ${z.slice(0, -1)} is a ${x.slice(0, -1)}, and no ${x.slice(0, -1)} is a ${y.slice(0, -1)}.` },
    { text: `All ${x} are ${y}. No ${y} are ${z}. Can a ${x.slice(0, -1)} be a ${z.slice(0, -1)}?`, a: 'No', why: `${x} sit inside ${y}, and ${y} never overlap ${z}.` },
    { text: `Some ${x} are ${y}. All ${y} are ${z}. Are some ${x} ${z}?`, a: 'Yes', why: `The ${x} that are ${y} must also be ${z}.` },
    { text: `All ${x} are ${y}. Is every ${y.slice(0, -1)} a ${x.slice(0, -1)}?`, a: "Can't tell", why: `"All ${x} are ${y}" works one way only – there may be ${y} that aren't ${x}.` },
  ]
  const fi = randInt(0, forms.length - 1, rng)
  const f = forms[fi]
  const { options, answerId } = textOptions(f.a, ['Yes', 'No', "Can't tell"], rng, 3)
  return {
    key: `syl-${fi}-${x}${y}${z}`,
    prompt: f.text,
    options,
    answerId,
    explanation: f.why,
    hint: 'Draw circles: one group inside another, or apart.',
    columns: 3,
  }
}

function days(diff: Difficulty, rng: Rng): QuizQuestion {
  const tier = tierFor(diff)
  const start = randInt(0, 6, rng)
  let shift: number
  let text: string
  if (tier === 'young') {
    shift = pick([1, -1, 2], rng)
    text = shift === 1 ? `Today is ${DAYS[start]}. What day is tomorrow?` : shift === -1 ? `Today is ${DAYS[start]}. What day was yesterday?` : `Today is ${DAYS[start]}. What day is the day after tomorrow?`
  } else if (tier === 'mid') {
    shift = pick([3, 4, 5, 8, 10, -2, -3, -9], rng)
    text = shift > 0 ? `Today is ${DAYS[start]}. What day will it be in ${shift} days?` : `Today is ${DAYS[start]}. What day was it ${-shift} days ago?`
  } else {
    shift = randInt(15, 100, rng) * (rng() < 0.25 ? -1 : 1)
    if (shift % 7 === 0) shift += 1
    text = shift > 0 ? `Today is ${DAYS[start]}. What day of the week will it be in ${shift} days?` : `Today is ${DAYS[start]}. What day of the week was it ${-shift} days ago?`
  }
  const ans = DAYS[(((start + shift) % 7) + 7) % 7]
  const wrongs = [-1, 1, 2, -2].map((o) => DAYS[(((start + shift + o) % 7) + 7) % 7])
  const { options, answerId } = textOptions(ans, wrongs, rng)
  const n = Math.abs(shift)
  const weeks = Math.floor(n / 7)
  const rest = n % 7
  const dir = shift > 0 ? 'forward' : 'back'
  return {
    key: `day-${start}-${shift}`,
    prompt: text,
    options,
    answerId,
    explanation:
      weeks > 0
        ? `${n} days = ${weeks} week${weeks > 1 ? 's' : ''} and ${rest} day${rest === 1 ? '' : 's'}. Whole weeks land on the same weekday, so count ${rest} ${dir} from ${DAYS[start]}: ${ans}.`
        : `Count ${n} day${n === 1 ? '' : 's'} ${dir} from ${DAYS[start]}: ${ans}.`,
    hint: 'Every 7 days is the same weekday again.',
  }
}

function ages(diff: Difficulty, rng: Rng): QuizQuestion {
  const tier = tierFor(diff)
  const [p, q2] = sample(tier === 'young' ? NAMES_YOUNG : NAMES, 2, rng)
  let text: string
  let ans: number
  let why: string
  if (tier === 'young') {
    const a = randInt(4, 9, rng)
    const k = randInt(1, 4, rng)
    const older = rng() < 0.5
    ans = older ? a + k : a - k
    text = `${p} is ${a} years old. ${q2} is ${k} year${k > 1 ? 's' : ''} ${older ? 'older' : 'younger'}. How old is ${q2}?`
    why = `${a} ${older ? '+' : '−'} ${k} = ${ans}.`
  } else if (tier === 'mid') {
    const future = randInt(2, 6, rng)
    const now = randInt(8, 20, rng)
    const past = randInt(1, 5, rng)
    ans = now - past
    text = `In ${future} years, ${p} will be ${now + future}. How old was ${p} ${past} years ago?`
    why = `Now ${p} is ${now + future} − ${future} = ${now}. ${past} years ago: ${now} − ${past} = ${ans}.`
  } else {
    const k = pick([3, 4], rng)
    const s = randInt(4, 12, rng)
    const y = s * (k - 2)
    ans = s
    text = `${p} is ${k} times as old as ${q2}. In ${y} years, ${p} will be twice as old as ${q2}. How old is ${q2} now?`
    why = `Let ${q2} = x. Then ${k}x + ${y} = 2(x + ${y}) → ${k - 2}x = ${y} → x = ${s}. (${p} is ${k * s}.)`
  }
  const wrongs = [ans + 1, ans - 1, ans + 2, ans - 2, ans + 3].filter((n) => n > 0).map(String)
  const { options, answerId } = textOptions(String(ans), wrongs, rng)
  return { key: `age-${tier}-${text}`, prompt: text, options, answerId, explanation: why, hint: tier === 'adult' ? 'Write both ages now and in the future, then compare.' : 'Work out the age today first.' }
}

function generate(diff: Difficulty, rng: Rng): QuizQuestion {
  const tier = tierFor(diff)
  const r = rng()
  if (r < 0.45) return fromBank(diff, rng)
  if (r < 0.62) return ordering(diff, rng)
  if (r < 0.77) return tier === 'young' ? fromBank(diff, rng) : syllogism(rng)
  if (r < 0.9) return days(diff, rng)
  return ages(diff, rng)
}

export const logicQuestions: GameDef = {
  id: 'logic-questions',
  category: 'logic',
  skill: 'logic',
  title: 'Logic Questions',
  emoji: '💡',
  blurb: 'Reasoning riddles with a clear "why" after each answer.',
  instructions: [
    'Read each question carefully – some are tricky!',
    'Pick the answer that must be true.',
    'After a right answer, read why. The next question comes by itself.',
  ],
  kidInstructions: ['Read the question.', 'Tap the best answer.', 'Then see why it is right!'],
  component: createQuizGame('logic-questions', { rounds: (d) => 6 + Math.min(4, Math.floor(d.d / 3)), generate, explain: true }),
}
