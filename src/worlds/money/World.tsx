import { useCallback, useEffect, useMemo, useRef } from 'react';
import { AnimatePresence } from 'motion/react';
import { DENOMINATIONS, isCoin, sumValues, type Denomination } from './lib/currency';
import { say, setMuted, sfx, spokenRupees } from './lib/sound';
import { useMoney, type Point } from './state/useMoney';
import { useChallenges } from './state/useChallenges';
import { useMediaQuery } from './hooks/useMediaQuery';
import { DragProvider, type DragPayload, type DropInfo } from './drag/DragProvider';
import { ChallengeToggle, TableActions } from './components/Toolbar';
import { MoneyBank } from './components/MoneyBank';
import { MyMoney } from './components/MyMoney';
import { Converter } from './components/Converter';
import { ChallengeCard } from './components/ChallengeCard';
import { Celebration } from './components/Celebration';
import { moneyImage } from './components/money/Money';
import { useSearchParams } from 'react-router-dom';
import { WorldFrame } from '../../shell/WorldFrame';
import { record, shared, useShared } from '../../shared/store';
import { challengeAt } from './lib/challenges';
import './money.css';

/** Money Master inside KidZ Zone: the same table, bank and challenges; sound follows the shared setting and every
 * finished challenge adds stars and ₹20 of play money to the jar that the Shop world can spend. */
export default function MoneyWorld() {
  const money = useMoney();
  useEffect(() => DENOMINATIONS.forEach((d) => void (new Image().src = moneyImage(d))), []);
  const { items } = money;
  const values = useMemo(() => items.map((i) => i.value), [items]);
  const total = sumValues(values);

  const { settings, wallet } = useShared();
  useEffect(() => setMuted(!settings.sound), [settings.sound]);

  const levelRef = useRef(0);
  const onChallengeDone = useCallback(() => {
    sfx.win();
    const i = levelRef.current;
    record('money', { id: 'challenge', title: challengeAt(i).title, stars: 3, xp: 15, level: i + 1, levelLabel: `Challenge ${i + 1}` });
    shared.addMoney(20);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  // ?view=challenges (from Today's mix) opens straight into challenge mode
  const [q] = useSearchParams();
  const challenges = useChallenges(values, onChallengeDone, q.get('view') === 'challenges');
  levelRef.current = challenges.index;
  useEffect(() => {
    const onDismiss = () => challenges.dismiss();
    window.addEventListener('mm:dismiss', onDismiss);
    return () => window.removeEventListener('mm:dismiss', onDismiss);
  }, [challenges]);

  const bankSize = useMediaQuery('(min-width: 1280px)') ? 'lg' : 'md';

  const add = useCallback(
    (value: Denomination, at?: Point) => {
      money.add(value, at);
      (isCoin(value) ? sfx.coin : sfx.note)();
      say(`${spokenRupees(value)}. Total, ${spokenRupees(total + value)}.`);
    },
    [money, total],
  );

  const remove = useCallback(
    (id: string) => {
      money.remove(id);
      sfx.remove();
    },
    [money],
  );

  const handleDrop = useCallback(
    (payload: DragPayload, drop: DropInfo) => {
      if (payload.source === 'bank') {
        if (drop.target === 'table') add(payload.value, drop);
      } else if (payload.id) {
        if (drop.target === 'table') money.move(payload.id, drop);
        else remove(payload.id);
      }
    },
    [add, remove, money],
  );

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'z') {
        e.preventDefault();
        money.undo();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [money]);

  return (
    <WorldFrame
      world="money"
      actions={
        <>
          <span className="hidden items-center gap-1 rounded-full border border-line bg-white px-3 py-1.5 text-sm font-bold sm:inline-flex" title="Play money jar, spend it in the Shop">Jar ₹{wallet}</span>
          <ChallengeToggle on={challenges.on} stars={challenges.completed.length} onToggle={challenges.toggle} />
        </>
      }
    >
    <DragProvider onDrop={handleDrop}>
      <div className="flex flex-col xl:min-h-[720px]">

        <main className="mm-main grid min-h-0 flex-1 gap-4 p-4 sm:px-6 lg:grid-cols-[minmax(0,1.4fr)_minmax(340px,1fr)] xl:grid-cols-[minmax(320px,0.95fr)_minmax(0,1.45fr)_minmax(330px,1fr)]">
          <MoneyBank size={bankSize} onAdd={add} className="lg:col-span-2 xl:col-span-1" />
          <MyMoney
            items={items}
            total={total}
            onRemove={remove}
            onTapMoney={(value) => say(spokenRupees(value))}
            actions={
              <TableActions canUndo={money.canUndo} hasMoney={items.length > 0} onUndo={money.undo} onReset={money.reset} onTidy={money.tidy} />
            }
            banner={
              <AnimatePresence>
                {challenges.on && (
                  <ChallengeCard
                    challenge={challenges.challenge}
                    index={challenges.index}
                    status={challenges.status}
                    completed={challenges.completed}
                    onPrev={challenges.prev}
                    onNext={challenges.next}
                  />
                )}
              </AnimatePresence>
            }
          />
          <Converter items={items} total={total} />
        </main>

        <p className="px-4 pb-2 text-center text-[11px] font-semibold text-ink/35">
          Currency images: Reserve Bank of India specimens &amp; Wikimedia Commons (GODL-India, CC0)
        </p>
      </div>

      <AnimatePresence>
        {challenges.celebrating && (
          <Celebration
            challenge={challenges.celebrating}
            message={challenges.status?.message ?? ''}
            onStay={challenges.dismiss}
            onNext={() => {
              money.reset();
              challenges.next();
            }}
          />
        )}
      </AnimatePresence>
    </DragProvider>
    </WorldFrame>
  );
}
