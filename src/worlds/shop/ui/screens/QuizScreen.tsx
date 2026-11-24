import { useEffect, useState } from 'react'
import { DENOMINATIONS } from '../../data/currency'
import { purseTotal } from '../../engine/money'
import { quizDone, useSession } from '../../store/sessionStore'
import { BuddyBubble, Keypad, ScreenShell } from '../components/Kit'
import { DraggableMoney, MoneyPiece, MoneyTray } from '../components/Money'
import { useAutoAdvance } from '../../../../play/roundFlow'
import { RoundCheer, RoundProgress } from '../../../../play/ui'
import { exposeAnswer } from '../../../../play/testMode'

const TITLES = { identify: 'Identify Products', prices: 'Learn Prices', totals: 'Calculate Totals', math: 'Maths Challenge', currency: 'Understand Currency', change: 'Calculate Change', money: 'Money Learning' }

export function QuizScreen() {
  const quiz = useSession((s) => s.quiz)
  const { answerQuiz, goto, quizTrayAdd, quizTrayRemove } = useSession.getState()
  const [typed, setTyped] = useState('')
  useEffect(() => setTyped(''), [quiz?.index])
  const done = quiz ? quizDone(quiz) : false
  const right = !!quiz?.feedback?.correct
  // the next question loads by itself after the cheer (shared play kit: no Next button)
  const phase = useAutoAdvance(done, () => useSession.getState().nextQuestion(), { ms: right ? 1800 : 3200, cheer: right })
  useEffect(() => {
    const cur = quiz?.questions[quiz.index]
    return exposeAnswer(quiz && cur && !done ? () => useSession.getState().answerQuiz(cur.answer as never) : null)
  })
  if (!quiz) return null
  const q = quiz.questions[quiz.index]
  const made = purseTotal(quiz.makeTray)

  return (
    <ScreenShell title={`${TITLES[quiz.kind]}${quiz.level ? ` · Level ${quiz.level}` : ''}`} back={() => window.confirm('Stop this quiz?') && goto(quiz.level ? 'levels' : 'modes')}>
      <RoundCheer phase={right ? phase : 'play'} round={quiz.index} />
      <div className="mt-4 flex items-center gap-3">
        <RoundProgress round={quiz.index} total={quiz.questions.length} done={done && quiz.index + 1 >= quiz.questions.length} />
        <div className="flex-1" />
        <span className="flex gap-0.5">{quiz.answers.map((a, i) => <span key={i} className={`h-3 w-3 rounded-full ${a === true ? 'bg-emerald-500' : a === false ? 'bg-rose-400' : 'bg-black/15'}`} />)}</span>
      </div>

      <div className="spanel mt-4 p-5 anim-rise" key={q.id}>
        {q.visual?.images && <div className="mb-3 flex flex-wrap justify-center gap-3 text-[clamp(4rem,14vmin,9rem)]" aria-hidden>{q.visual.images.map((im, i) => <span key={i}>{im}</span>)}</div>}
        {q.visual?.denomination && <div className="mb-3 flex justify-center"><MoneyPiece value={q.visual.denomination} size={1.6} /></div>}
        <h2 className="text-center text-3xl font-black leading-snug sm:text-4xl">{q.prompt}</h2>

        <div className="mt-5">
          {q.input === 'choice' && (
            <div className="grid gap-2 sm:grid-cols-2">
              {q.choices!.map((c) => {
                const isAnswer = done && c === String(q.answer)
                return (
                  <button key={c} disabled={done} onClick={() => answerQuiz(c)}
                    className={`sbtn min-h-24 text-3xl ${isAnswer ? 'bg-emerald-500 text-white' : 'bg-white ring-1 ring-black/10 hover:bg-orange-50'}`}>{c}</button>
                )
              })}
            </div>
          )}
          {q.input === 'number' && !done && <Keypad value={typed} onChange={setTyped} onSubmit={() => typed && answerQuiz(Number(typed))} />}
          {q.input === 'make-amount' && (
            <div className="space-y-3">
              {/* For change questions the amount is the answer, so the tray must not reveal it. */}
              <MoneyTray purse={quiz.makeTray} dropName="quiz-tray" onRemove={quizTrayRemove}
                label={q.skill === 'change' ? 'Your change' : `Make ₹${q.answer}`}
                highlight={q.skill === 'change' && !done ? null : made === q.answer ? 'ok' : made > Number(q.answer) ? 'bad' : null} />
              <div className="flex flex-wrap justify-center gap-1">
                {DENOMINATIONS.slice().reverse().map((d) => <DraggableMoney key={d} value={d} dropName="quiz-tray" onDrop={quizTrayAdd} disabled={done} size={0.85} />)}
              </div>
              {!done && <button className="sbtn-green w-full" disabled={!made} onClick={() => answerQuiz(made)}>Check ₹{made}</button>}
            </div>
          )}
        </div>

        {quiz.feedback && (
          <div className={`mt-4 rounded-2xl p-3 text-lg font-bold ${quiz.feedback.correct ? 'bg-emerald-50 text-emerald-800' : 'bg-amber-50 text-amber-900'}`} role="status">
            {quiz.feedback.correct ? '🎉 ' : '💡 '}{quiz.feedback.text}
          </div>
        )}
        {done && <p className="mt-4 text-center text-xl font-bold text-ink/60" role="status">{quiz.index + 1 < quiz.questions.length ? 'Next question coming…' : 'Your score is coming…'}</p>}
      </div>
      <div className="mt-4"><BuddyBubble /></div>
    </ScreenShell>
  )
}
