import { useSelector, useDispatch } from 'react-redux'
import type { RootState } from '../store/store'
import { setCurrentView, toggleDebugInfo } from '../store/uiSlice'
import './App.css'

function App(): React.JSX.Element {
  const { currentView, showDebugInfo } = useSelector((state: RootState) => state.ui)
  const dispatch = useDispatch()

  return (
    <div className="app">
      <header className="app-header">
        <h1>Continuum</h1>
        <nav>
          <button 
            onClick={() => dispatch(setCurrentView('menu'))}
            className={currentView === 'menu' ? 'active' : ''}
          >
            Menu
          </button>
          <button 
            onClick={() => dispatch(setCurrentView('game'))}
            className={currentView === 'game' ? 'active' : ''}
          >
            Game
          </button>
          <button 
            onClick={() => dispatch(setCurrentView('settings'))}
            className={currentView === 'settings' ? 'active' : ''}
          >
            Settings
          </button>
        </nav>
      </header>

      <main className="app-content">
        {currentView === 'menu' && (
          <div className="menu-view">
            <h2>Main Menu</h2>
            <p>Welcome to Continuum - A recreation of the classic 68K Mac game</p>
            <button onClick={() => dispatch(setCurrentView('game'))}>
              Start Game
            </button>
          </div>
        )}

        {currentView === 'game' && (
          <div className="game-view">
            <h2>Game View</h2>
            <div className="game-viewport">
              <p>Game canvas will go here (512x342)</p>
            </div>
          </div>
        )}

        {currentView === 'settings' && (
          <div className="settings-view">
            <h2>Settings</h2>
            <label>
              <input
                type="checkbox"
                checked={showDebugInfo}
                onChange={() => dispatch(toggleDebugInfo())}
              />
              Show Debug Info
            </label>
            {showDebugInfo && (
              <div className="debug-info">
                <p>Debug mode enabled</p>
                <p>Current view: {currentView}</p>
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  )
}

export default App