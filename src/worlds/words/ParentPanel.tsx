import { Dashboard } from './screens/Parent'
import { ProgressProvider } from './state/ProgressProvider'

/** Word Wonders' own dashboard (words explored, mastered and tricky, minutes per day), in the grown-ups area. */
export default function WordsParentPanel() {
  return (
    <ProgressProvider>
      <Dashboard />
    </ProgressProvider>
  )
}
