import { StrictMode, lazy, Suspense } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import './flagship.css'
import './mobile.css'
import App from './App.tsx'

const VoiceChatPiP = lazy(() => import('./components/VoiceChat/VoiceChatPiP.tsx'))

// ?pip=1 → 独立画中画窗口，透明叠加层
const isPip = new URLSearchParams(window.location.search).has('pip')

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    {isPip ? (
      <Suspense fallback={<div style={{ color: 'rgba(255,255,255,.3)', padding: 20 }}>加载中…</div>}>
        <VoiceChatPiP />
      </Suspense>
    ) : (
      <App />
    )}
  </StrictMode>,
)
