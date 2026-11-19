import { useEffect } from 'react'
import { ParentDashboard } from './ui/screens/Dashboards'
import { useProgress } from './store/progressStore'
import './shop.css'

/** My Supermarket's parent dashboard (sessions, products identified, accuracy per skill, budgets). */
export default function ShopParentPanel() {
  const hydrated = useProgress((s) => s.hydrated)
  useEffect(() => { void useProgress.persist?.rehydrate?.() }, [])
  return hydrated ? <div className="relative"><ParentDashboard preUnlocked /></div> : null
}
