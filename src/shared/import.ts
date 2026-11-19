import { useEffect } from 'react'
import { summarizeLegacy } from './legacy'
import { shared } from './store'

/** First run: summarise any progress the original apps left on this origin (see legacy.ts). */
export const IMPORT_DONE = '__first-run'

/** Runs once per device: later visits must not count the worlds' own saves again. */
export function importLegacy(get: (k: string) => string | null = (k) => localStorage.getItem(k)) {
  if (shared.get().imported.includes(IMPORT_DONE)) return []
  const found = summarizeLegacy(get)
  for (const f of found) shared.importSummary(f.key, f.world, f.summary)
  shared.markImported(IMPORT_DONE)
  return found
}

/** A name the child already typed into one of the original apps, to prefill onboarding. */
export function legacyName(): string {
  try {
    return summarizeLegacy((k) => localStorage.getItem(k)).find((f) => f.name)?.name ?? ''
  } catch {
    return ''
  }
}

export function useFirstRunImport() {
  useEffect(() => {
    try {
      importLegacy()
    } catch {
      /* storage blocked */
    }
  }, [])
}
