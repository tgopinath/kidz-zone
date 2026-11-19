import type { ProfileData, Settings } from '../types'

/**
 * Persistence adapter. Everything goes through this interface so a cloud
 * backend (with auth) can replace LocalStorage later without touching the UI.
 */
export interface StorageAdapter {
  loadProfiles(): ProfileData[]
  saveProfiles(data: ProfileData[]): void
  loadActiveId(): string | null
  saveActiveId(id: string | null): void
  loadSettings(): Settings | null
  saveSettings(s: Settings): void
}

const KEY = 'braingym:v1'

interface Blob {
  profiles: ProfileData[]
  activeId: string | null
  settings: Settings | null
}

function read(): Blob {
  try {
    const raw = localStorage.getItem(KEY)
    if (raw) return JSON.parse(raw) as Blob
  } catch {
    /* storage unavailable or corrupt – start fresh */
  }
  return { profiles: [], activeId: null, settings: null }
}

function write(b: Blob) {
  try {
    localStorage.setItem(KEY, JSON.stringify(b))
  } catch {
    /* quota or private mode – keep running in memory */
  }
}

export const localAdapter: StorageAdapter = {
  loadProfiles: () => read().profiles,
  saveProfiles: (profiles) => write({ ...read(), profiles }),
  loadActiveId: () => read().activeId,
  saveActiveId: (activeId) => write({ ...read(), activeId }),
  loadSettings: () => read().settings,
  saveSettings: (settings) => write({ ...read(), settings }),
}

export const storage: StorageAdapter = localAdapter
