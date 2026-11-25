import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App'
import './index.css'
import './motion-kit/motion-kit.js'
import { initNative } from './shared/native'

initNative()

// After a new version goes live, a page shell from the cache may ask for a chunk that no longer exists: reload once.
addEventListener('vite:preloadError', (e) => {
  try {
    if (sessionStorage.getItem('kz-reloaded') !== '1') {
      sessionStorage.setItem('kz-reloaded', '1')
      e.preventDefault()
      location.reload()
    }
  } catch {
    /* storage blocked */
  }
})
addEventListener('load', () => setTimeout(() => { try { sessionStorage.removeItem('kz-reloaded') } catch { /* */ } }, 10000))

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)

if ('serviceWorker' in navigator && location.protocol === 'https:' && !location.hostname.endsWith('localhost')) {
  addEventListener('load', () => navigator.serviceWorker.register('/sw.js').catch(() => {}))
}
