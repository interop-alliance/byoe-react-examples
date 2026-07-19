/**
 * Entry point: mounts the game inside `WasSessionProvider`, fed by the config
 * and registry `defineDocumentApp` built in app.config.ts.
 */
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { WasSessionProvider } from '@interop/was-react'
import { config, registry } from '@/app.config'
import { App } from '@/App'

const container = document.getElementById('root')
if (!container) {
  throw new Error('Root container #root not found.')
}
createRoot(container).render(
  <StrictMode>
    <WasSessionProvider config={config} registry={registry}>
      <App />
    </WasSessionProvider>
  </StrictMode>
)
