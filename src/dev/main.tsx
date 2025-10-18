import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { Provider } from 'react-redux'
import { store } from './store/store'
import { createSpriteService } from '@core/sprites'
import { ASSET_PATHS } from './constants'
import { initializeSpriteRegistry } from '@/lib/frame/initializeSpriteRegistry'
import App from './App'
import './index.css'

// Initialize app asynchronously to load sprites first
async function initializeApp(): Promise<void> {
  try {
    // Load sprites before initializing Redux
    const spriteService = await createSpriteService({
      spriteResource: ASSET_PATHS.SPRITE_RESOURCE,
      statusBarResource: ASSET_PATHS.STATUS_BAR_RESOURCE
    })

    // Initialize sprite registry
    const spriteRegistry = await initializeSpriteRegistry()
    console.log('Sprite registry initialized')

    // Now render the app with sprites loaded
    createRoot(document.getElementById('root')!).render(
      <StrictMode>
        <Provider store={store}>
          <App spriteService={spriteService} spriteRegistry={spriteRegistry} />
        </Provider>
      </StrictMode>
    )
  } catch (error) {
    console.error('Failed to initialize app:', error)
    // Could render an error state here
  }
}

// Start the app
initializeApp()
