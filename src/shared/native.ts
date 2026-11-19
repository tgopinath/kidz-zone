/**
 * Native looks inside the phone apps, from the shared Kolam kits (loaded in index.html):
 * - Android app (Capacitor shell, or ?app=android): Material Design 3 top app bar + navigation bar (KolamM3).
 * - iPhone app (KidzZone-iOS shell, or ?app=ios): Apple HIG navigation bar + Liquid Glass tab bar (KolamIOS).
 * In a normal browser both kits stay off and the website keeps its own header and tab bar.
 * The router calls syncNative(path) on every route change.
 */
import { useEffect, useRef } from 'react'

type Kit = Record<string, any> // eslint-disable-line @typescript-eslint/no-explicit-any
declare global {
  interface Window {
    KolamM3?: Kit
    KolamIOS?: Kit
  }
}

const svg = (inner: string) =>
  `<svg class="ios-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">${inner}</svg>`
const IOS_ICON = {
  learn: svg('<path d="M4 5.5A1.5 1.5 0 0 1 5.5 4H11v15H5.5A1.5 1.5 0 0 1 4 17.5z"/><path d="M20 5.5A1.5 1.5 0 0 0 18.5 4H13v15h5.5a1.5 1.5 0 0 0 1.5-1.5z"/>'),
  play: svg('<path d="M10 4.5a2 2 0 1 1 4 0V6h4v4h-1.5a2 2 0 1 0 0 4H18v4.5h-4.5V17a2 2 0 1 0-4 0v1.5H5.5V14H7a2 2 0 1 0 0-4H5.5V6H10z"/>'),
  explore: svg('<circle cx="12" cy="12" r="8.5"/><path d="m15.5 8.5-2 5-5 2 2-5z"/>'),
  progress: svg('<path d="M4 19V5M4 19h16M8 15l3-4 3 2 5-6"/>'),
}

export const TABS = [
  { id: 'home', label: 'Home', m3: 'home', ios: 'house', href: '#/' },
  { id: 'learn', label: 'Learn', m3: 'menu_book', ios: IOS_ICON.learn, href: '#/learn' },
  { id: 'play', label: 'Play', m3: 'extension', ios: IOS_ICON.play, href: '#/play' },
  { id: 'explore', label: 'Explore', m3: 'explore', ios: IOS_ICON.explore, href: '#/explore' },
  { id: 'progress', label: 'Progress', m3: 'insights', ios: IOS_ICON.progress, href: '#/progress' },
] as const
export type TabId = (typeof TABS)[number]['id']

/** Which tab a path belongs to. */
export function tabOf(path: string): TabId {
  const seg = path.split('/')[1] ?? ''
  if (['learn', 'words', 'garden', 'money'].includes(seg)) return 'learn'
  if (['play', 'puzzles', 'brain', 'pets'].includes(seg)) return 'play'
  if (['explore', 'maps', 'shop'].includes(seg)) return 'explore'
  if (['progress', 'parent', 'settings'].includes(seg)) return 'progress'
  return 'home'
}

/** Paths where a game owns the screen: no tab bar (web and app). */
export function isImmersive(path: string): boolean {
  return /^\/(brain\/play|puzzles\/play|words\/play|pets|shop)(\/|$)/.test(path) || /^\/maps\/(games\/|puzzle\/|quiz)/.test(path)
}

let mode: 'android' | 'ios' | null = null
let m3: Kit | null = null

export const nativeMode = () => mode

export function initNative() {
  const ios = window.KolamIOS
    ? window.KolamIOS.init({
        appName: 'KidZ Zone',
        uaTokens: ['KidzZone-iOS', 'KidZZone-iOS'],
        tint: { light: '#2E3A8C', dark: '#9AA6F0' },
        tabs: TABS.map((t) => ({ id: t.id, label: t.label, icon: t.ios, href: t.href })),
        currentTab: 'home',
        content: '#main',
      })
    : null
  if (ios) {
    mode = 'ios'
    document.documentElement.classList.remove('k-android', 'k-app')
  } else if (window.KolamM3?.isAndroid) {
    mode = 'android'
    m3 = window.KolamM3.init({
      primary: '#2E3A8C',
      title: 'KidZ Zone',
      home: '#/',
      destinations: TABS.map((t) => ({ id: t.id, label: t.label, icon: t.m3, href: t.href })),
      actions: [{ icon: 'settings', label: 'Settings', onClick: () => (window.location.hash = '#/settings') }],
      icons: ['arrow_back', 'settings', 'volume_up', 'volume_off'],
    })
  }
}

export interface NativeScreen {
  path: string
  title: string
  /** where Back goes when there is no in-app history; null on a top-level tab */
  back: { href: string; label: string } | null
}

export function syncNative({ path, title, back }: NativeScreen) {
  document.documentElement.classList.toggle('kz-immersive', isImmersive(path))
  if (!mode) return
  const tab = tabOf(path)
  if (mode === 'ios') {
    const K = window.KolamIOS!
    K.tabBar.select(tab)
    const actions = [{ icon: 'gearshape', label: 'Settings', onClick: () => (window.location.hash = '#/settings') }]
    if (back)
      K.navBar.set({ title, back: { label: back.label, onClick: () => (history.length > 1 ? history.back() : (window.location.hash = '#' + back.href)) }, actions: isImmersive(path) ? [] : actions })
    else K.navBar.set({ title, large: true, actions })
    setTimeout(() => K.enhance?.(document.getElementById('main')), 50)
  } else if (m3) {
    // The kit resets its overrides on every route change, so set ours just after it.
    setTimeout(() => {
      m3!.setTitle(title)
      m3!.setActive(tab)
      m3!.setBack(back ? '#' + back.href : false)
    })
  }
}

/**
 * Hardware Back (Android) for in-world overlays: the most recently mounted handler wins.
 * The M3 kit fires a cancelable `k-m3:back` event before its own Back handling.
 */
const stack: { current: () => void }[] = []
if (typeof window !== 'undefined') {
  window.addEventListener('k-m3:back', (e) => {
    const top = stack[stack.length - 1]
    if (top) {
      e.preventDefault()
      top.current()
    }
  })
}
export function useBackHandler(fn: (() => void) | undefined) {
  const ref = useRef(fn)
  ref.current = fn
  const enabled = !!fn
  useEffect(() => {
    if (!enabled) return
    const entry = { current: () => ref.current?.() }
    stack.push(entry)
    return () => {
      stack.splice(stack.indexOf(entry), 1)
    }
  }, [enabled])
}
