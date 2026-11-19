import { Stats } from './screens/Stats'
import { AppProvider } from './store/AppContext'
import { useBrainProfileSync } from './World'

function Inner() {
  const active = useBrainProfileSync()
  return active ? <Stats /> : null
}

/** Brain Gym's own progress analytics (skill scores, charts), shown in the KidZ Zone grown-ups area. */
export default function BrainParentPanel() {
  return (
    <AppProvider>
      <Inner />
    </AppProvider>
  )
}
