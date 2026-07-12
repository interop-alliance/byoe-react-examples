/**
 * Entry point: mounts the app inside `WasSessionProvider`, which builds the
 * session/auth store once from the app config and store registry. The
 * provider sits ABOVE the router so every route (including /login) can reach
 * the session hooks.
 */
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { WasSessionProvider } from '@interop/was-react'
import { appConfig } from '@/app.config'
import { registry } from '@/stores/notes'
import { App } from '@/App'

const container = document.getElementById('root')
if (!container) {
  throw new Error('Root container #root not found.')
}
createRoot(container).render(
  <StrictMode>
    <WasSessionProvider config={appConfig} registry={registry}>
      <App />
    </WasSessionProvider>
  </StrictMode>
)
