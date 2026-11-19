import { useEffect } from 'react'
import { WorldFrame } from '../../shell/WorldFrame'
import { shared, useShared, type AgeBand } from '../../shared/store'
import { App as ShopApp } from './App'
import type { AgeGroup } from './engine/challenges'
import { useProgress } from './store/progressStore'
import { useSession } from './store/sessionStore'
import './shop.css'

const SHOP_AGE: Record<AgeBand, AgeGroup> = { '4-6': 'little', '7-9': 'middle', '10-12': 'big' }
const JAR_SWAP = 50

/** My Supermarket inside KidZ Zone. The shopper is the KidZ Zone child; sound follows the shared Settings; the
 * play-money jar (filled in Money and here) can be swapped for shop coins to spend in the reward shop. */
export default function ShopWorld() {
  const sh = useShared()
  const hydrated = useProgress((s) => s.hydrated)
  const coins = useProgress((s) => s.coins)

  useEffect(() => {
    if (!hydrated || !sh.profile) return
    const p = useProgress.getState()
    const want = { nickname: sh.profile.name, avatar: p.profile?.avatar ?? '🧒', age: SHOP_AGE[sh.profile.ageBand] }
    if (!p.profile || p.profile.nickname !== want.nickname || p.profile.age !== want.age) p.setProfile(want)
    const sess = useSession.getState()
    if (['welcome', 'avatar', 'age'].includes(sess.screen)) sess.goto('modes')
  }, [hydrated, sh.profile])
  useEffect(() => {
    if (hydrated) useProgress.getState().updateSettings({ sound: sh.settings.sound, voice: sh.settings.sound })
  }, [hydrated, sh.settings.sound])

  return (
    <WorldFrame
      world="shop"
      fill
      actions={
        <button
          type="button"
          className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-line bg-white px-3 text-sm font-bold disabled:opacity-50"
          disabled={sh.wallet < JAR_SWAP}
          title="Play money earned in Money and here. Swap it for shop coins."
          onClick={() => {
            if (shared.spendMoney(JAR_SWAP)) useProgress.setState({ coins: useProgress.getState().coins + JAR_SWAP })
          }}
        >
          Jar ₹{sh.wallet}
          <span className="hidden text-ink-soft sm:inline">· swap ₹{JAR_SWAP} for {JAR_SWAP} coins ({coins})</span>
        </button>
      }
    >
      <div className="absolute inset-0 overflow-y-auto">
        <ShopApp />
      </div>
    </WorldFrame>
  )
}
