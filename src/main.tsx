import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App'
import './index.css'
import { initNative } from './shared/native'

initNative()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)

if ('serviceWorker' in navigator && location.protocol === 'https:' && !location.hostname.endsWith('localhost')) {
  addEventListener('load', () => navigator.serviceWorker.register('/sw.js').catch(() => {}))
}
