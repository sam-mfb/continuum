import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { Provider } from 'react-redux'
import { store } from './store/store'
import { createSpriteService } from './sprites/service'
import { SpriteServiceProvider } from './sprites/provider'
import App from './app/App'
import './index.css'

// Initialize app asynchronously to load sprites first
async function initializeApp(): Promise<void> {
  try {
    // Load sprites before initializing Redux
    const spriteService = await createSpriteService()

    // Now render the app with sprites loaded
    createRoot(document.getElementById('root')!).render(
      <StrictMode>
        <SpriteServiceProvider service={spriteService}>
          <Provider store={store}>
            <App />
          </Provider>
        </SpriteServiceProvider>
      </StrictMode>
    )
  } catch (error) {
    console.error('Failed to initialize app:', error)
    // Could render an error state here
  }
}

// Start the app
initializeApp()
