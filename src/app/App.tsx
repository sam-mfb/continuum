import { useSelector, useDispatch } from 'react-redux'
import type { RootState } from '../store/store'
import { setCurrentView, toggleDebugInfo } from '../store/uiSlice'
import './App.css'

function App(): React.JSX.Element {
  const { currentView, showDebugInfo } = useSelector(
    (state: RootState) => state.ui
  )
  const dispatch = useDispatch()

  return (
    <div className="app">
      <div className="mac-window">
        <div className="window-title-bar">
          <div className="window-controls">
            <div className="window-control close"></div>
          </div>
          <div className="window-title">CONTINUUM</div>
        </div>

        <div className="menu-bar">
          <div
            className={`menu-item ${currentView === 'menu' ? 'active' : ''}`}
            onClick={() => dispatch(setCurrentView('menu'))}
          >
            Menu
          </div>
          <div
            className={`menu-item ${currentView === 'game' ? 'active' : ''}`}
            onClick={() => dispatch(setCurrentView('game'))}
          >
            Game
          </div>
          <div
            className={`menu-item ${currentView === 'settings' ? 'active' : ''}`}
            onClick={() => dispatch(setCurrentView('settings'))}
          >
            Settings
          </div>
        </div>

        <div className="window-content">
          {currentView === 'menu' && (
            <div className="menu-view">
              <h2>CONTINUUM</h2>
              <p>A recreation of the classic 68000 Macintosh game</p>
              <p>Experience the original gravity-based space combat</p>
              <button
                className="mac-button"
                onClick={() => dispatch(setCurrentView('game'))}
              >
                START GAME
              </button>
            </div>
          )}

          {currentView === 'game' && (
            <div className="game-view">
              <h2>GAME</h2>
              <div className="game-viewport">
                GAME CANVAS (512x342)
                <br />
                LOADING...
              </div>
            </div>
          )}

          {currentView === 'settings' && (
            <div className="settings-view">
              <h2>SETTINGS</h2>
              <div className="mac-checkbox">
                <input
                  type="checkbox"
                  checked={showDebugInfo}
                  onChange={() => dispatch(toggleDebugInfo())}
                />
                <span>Show Debug Information</span>
              </div>
              {showDebugInfo && (
                <div className="debug-info">
                  <div>DEBUG MODE: ENABLED</div>
                  <div>CURRENT VIEW: {currentView.toUpperCase()}</div>
                  <div>SYSTEM: MAC PLUS EMULATION</div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default App
