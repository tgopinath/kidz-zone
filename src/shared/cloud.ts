/**
 * Optional Google sign-in for grown-ups, to keep a child's progress on every device. Never needed to play.
 *
 * Same backend and schema as Kolam Auth (kolam-design-system/auth): Firebase project gopinath-apps, Google
 * provider, Firestore users/{uid}/apps/kidzzone = { data: { localStorageKey: value }, profile, updatedAt },
 * protected by firestore.rules (each user reads and writes only their own document). Unlike Kolam Auth there is
 * no sign-in wall: it is started from the grown-ups area only.
 *
 * - Web: pop-up sign-in (redirect breaks across domains). An address not yet authorised in Firebase gets a friendly
 *   "isn't set up for this address yet" message instead of an error.
 * - Android app: Google blocks sign-in inside web views, so the native @capacitor-firebase/authentication plugin is
 *   used when the shell has it; until then the button explains that sign-in works in a browser.
 * - iPhone app: hidden until the shell has native sign-in.
 * Only progress keys are synced (cloudMerge.ts SYNC_KEYS). Sign-out keeps everything on the device.
 */
import { useSyncExternalStore } from 'react'
import { isSynced, mergeAll } from './cloudMerge'
import { nativeMode } from './native'

// Public web config of the shared gopinath-apps project (same as kolam-design-system/auth/firebase-config.js).
const FIREBASE_CONFIG = {
  apiKey: 'AIzaSyAAfa2HyBS5G2Jduael4xCK-Dx2QNncWms',
  authDomain: 'gopinath-apps.firebaseapp.com',
  projectId: 'gopinath-apps',
  storageBucket: 'gopinath-apps.firebasestorage.app',
  messagingSenderId: '649205795156',
  appId: '1:649205795156:web:4c862128a89af5e98ae0c1',
}
const SDK = 'https://www.gstatic.com/firebasejs/11.0.2/'
const APP = 'kidzzone'
const FLAG = 'kidzzone:cloud' // "a grown-up signed in on this device" (so the session is restored on start)

export interface CloudUser {
  uid: string
  name: string
  email: string
  photo: string
}
export interface CloudState {
  status: 'off' | 'loading' | 'signed-out' | 'signing-in' | 'syncing' | 'signed-in' | 'unavailable'
  user: CloudUser | null
  lastSynced: number | null
  error: string | null
  /** why sign-in is not offered here (phone apps without native sign-in) */
  unavailable: string | null
}

type Any = any // eslint-disable-line @typescript-eslint/no-explicit-any
let fb: { a: Any; fs: Any } | null = null
let auth: Any = null
let db: Any = null
let started: Promise<void> | null = null
let pushTimer: ReturnType<typeof setTimeout> | null = null

let state: CloudState = { status: 'off', user: null, lastSynced: null, error: null, unavailable: null }
const subs = new Set<() => void>()
const set = (p: Partial<CloudState>) => {
  state = { ...state, ...p }
  subs.forEach((f) => f())
}
export const cloud = { get: () => state, subscribe: (f: () => void) => (subs.add(f), () => subs.delete(f)) }
export const useCloud = () => useSyncExternalStore(cloud.subscribe, cloud.get, cloud.get)

const nativeAuth = (): Any => (window as Any).Capacitor?.isNativePlatform?.() && (window as Any).Capacitor?.Plugins?.FirebaseAuthentication

/** Why sign-in cannot run here, or null when it can. */
export function unavailableReason(): string | null {
  const mode = nativeMode()
  if (mode === 'ios') return 'Signing in is not in the iPhone app yet. Sign in on kidz-zone-mu.vercel.app in Safari to keep progress in your account.'
  if (mode === 'android' && !nativeAuth()) return 'Signing in is not in the Android app yet. Sign in on kidz-zone-mu.vercel.app in Chrome to keep progress in your account.'
  return null
}

/** Friendly words for Firebase errors (exported for tests). */
export function friendly(err: { code?: string; message?: string } | null | undefined): string {
  const c = err?.code ?? ''
  if (c === 'auth/unauthorized-domain') return `Sign-in isn't set up for this address yet (${location.hostname}). Everything still works without it.`
  if (c === 'auth/popup-blocked') return 'The sign-in window was blocked. Allow pop-ups for this site and try again.'
  if (c === 'auth/network-request-failed') return 'No internet connection. Connect and try again.'
  if (c === 'auth/operation-not-allowed') return "Google sign-in isn't switched on for this app yet."
  return `Couldn't sign in right now${c ? ` (${c})` : ''}. Please try again.`
}

const origSet = Storage.prototype.setItem
const origRemove = Storage.prototype.removeItem

function localData(): Record<string, string> {
  const out: Record<string, string> = {}
  for (let i = 0; i < localStorage.length; i++) {
    const k = localStorage.key(i)
    if (k && isSynced(k)) out[k] = localStorage.getItem(k) ?? ''
  }
  return out
}
const docRef = () => fb!.fs.doc(db, 'users', state.user!.uid, 'apps', APP)

async function pushNow() {
  if (!fb || !state.user) return
  await fb.fs.setDoc(docRef(), { data: localData(), updatedAt: fb.fs.serverTimestamp() }, { merge: true })
  set({ lastSynced: Date.now() })
}

function watchStorage() {
  const schedule = (k: string) => {
    if (!state.user || !isSynced(k)) return
    if (pushTimer) clearTimeout(pushTimer)
    pushTimer = setTimeout(() => void pushNow().catch(() => {}), 1500)
  }
  Storage.prototype.setItem = function (k: string, v: string) {
    origSet.call(this, k, v)
    if (this === localStorage) schedule(String(k))
  }
  Storage.prototype.removeItem = function (k: string) {
    origRemove.call(this, k)
    if (this === localStorage) schedule(String(k))
  }
  addEventListener('pagehide', () => {
    if (pushTimer) {
      clearTimeout(pushTimer)
      void pushNow()
    }
  })
}

/** Pull the cloud copy, merge it with this device (keeping the higher progress), save both. */
async function pullAndMerge(): Promise<boolean> {
  set({ status: 'syncing' })
  const snap = await fb!.fs.getDoc(docRef())
  const cloudDoc = snap.exists() ? snap.data() : {}
  const { merged, changed } = mergeAll(localData(), cloudDoc.data ?? {})
  for (const [k, v] of Object.entries(merged)) if (localStorage.getItem(k) !== v) origSet.call(localStorage, k, v)
  await fb!.fs.setDoc(docRef(), { data: merged, profile: { memberSince: cloudDoc.profile?.memberSince ?? new Date().toISOString() }, updatedAt: fb!.fs.serverTimestamp() }, { merge: true })
  set({ status: 'signed-in', lastSynced: Date.now() })
  return changed
}

async function load() {
  const [app, a, fs] = await Promise.all(['firebase-app.js', 'firebase-auth.js', 'firebase-firestore.js'].map((f) => import(/* @vite-ignore */ SDK + f)))
  fb = { a, fs }
  const inst = app.initializeApp(FIREBASE_CONFIG, 'kidzzone')
  auth = a.getAuth(inst)
  db = fs.getFirestore(inst)
}

/** Start the cloud layer (loads Firebase). Safe to call many times. */
export function startCloud(): Promise<void> {
  const why = unavailableReason()
  if (why) {
    set({ status: 'unavailable', unavailable: why })
    return Promise.resolve()
  }
  started ??= (async () => {
    set({ status: 'loading' })
    try {
      await load()
    } catch {
      started = null
      set({ status: 'signed-out', error: 'Could not reach the sign-in service. Check the internet connection.' })
      return
    }
    watchStorage()
    await new Promise<void>((resolve) => {
      let first = true
      fb!.a.onAuthStateChanged(auth, async (u: Any) => {
        if (!u) {
          set({ status: 'signed-out', user: null })
        } else {
          set({ user: { uid: u.uid, name: u.displayName ?? '', email: u.email ?? '', photo: u.photoURL ?? '' }, error: null })
          try {
            origSet.call(localStorage, FLAG, '1')
            const changed = await pullAndMerge()
            if (changed) location.reload() // worlds read their saves when they open: reload to show the merged progress
          } catch (err) {
            set({ status: 'signed-in', error: 'Signed in, but saving to your account did not work. Check the internet connection.' })
            console.warn('KidZ Zone cloud: could not sync', err)
          }
        }
        if (first) {
          first = false
          resolve()
        }
      })
    })
  })()
  return started
}

/** Restore a grown-up's session on app start, if they signed in on this device before. */
export function resumeCloud() {
  try {
    if (localStorage.getItem(FLAG) === '1') void startCloud()
  } catch {
    /* storage blocked */
  }
}

export async function signIn() {
  await startCloud()
  if (!fb || state.status === 'unavailable') return
  set({ status: 'signing-in', error: null })
  try {
    const native = nativeAuth()
    if (native) {
      const res = await native.signInWithGoogle()
      const cred = fb.a.GoogleAuthProvider.credential(res.credential?.idToken, res.credential?.accessToken)
      await fb.a.signInWithCredential(auth, cred)
    } else {
      const provider = new fb.a.GoogleAuthProvider()
      provider.setCustomParameters({ prompt: 'select_account' })
      await fb.a.signInWithPopup(auth, provider)
    }
  } catch (err) {
    const code = (err as { code?: string })?.code
    const closed = code === 'auth/popup-closed-by-user' || code === 'auth/cancelled-popup-request'
    set({ status: state.user ? 'signed-in' : 'signed-out', error: closed ? null : friendly(err as { code?: string }) })
  }
}

export async function syncNow() {
  if (!state.user) return
  try {
    await pullAndMerge()
  } catch {
    set({ status: 'signed-in', error: 'Could not save right now. Check the internet connection.' })
  }
}

/** Sign out. Everything stays on this device. */
export async function signOut() {
  if (!fb) return
  await pushNow().catch(() => {})
  await fb.a.signOut(auth)
  origRemove.call(localStorage, FLAG)
  set({ status: 'signed-out', user: null, lastSynced: null })
}

/** Remove the copy in the grown-up's account (this device keeps its progress), then sign out. */
export async function deleteCloudCopy() {
  if (!fb || !state.user) return
  await fb.fs.deleteDoc(docRef())
  await fb.a.signOut(auth)
  origRemove.call(localStorage, FLAG)
  set({ status: 'signed-out', user: null, lastSynced: null })
}
