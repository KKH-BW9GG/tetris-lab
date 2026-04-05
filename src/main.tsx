import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { inject } from '@vercel/analytics'
import { unlockAudio } from './shared/sound'

inject()

// モバイル: 最初のタッチでAudioContextをunlock
document.addEventListener('pointerdown', unlockAudio, { once: true })

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
