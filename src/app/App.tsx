import { useState } from 'react'
import { useSelector, useDispatch } from 'react-redux'
import type { RootState } from '../store/store'
import { setCurrentView, toggleDebugInfo } from '../store/uiSlice'
import { GalaxySelector } from './components/GalaxySelector'
import { PlanetList } from './components/PlanetList'
import { PlanetViewer } from './components/PlanetViewer'
import { GraphicsList } from './components/GraphicsList'
import { GraphicsViewer } from './components/GraphicsViewer'
import GameView, {
  type CanvasGameDefinition,
  type BitmapGameDefinition
} from './components/GameView'
import { SoundTest } from './components/SoundTest'
import { testGameLoop } from './games/testGame'
import { shipMoveGameLoop } from './games/shipMove'
import { bitmapTestRenderer } from './games/bitmapTest'
import { wallDrawingRenderer } from './games/wallDrawing'
import './App.css'

function App(): React.JSX.Element {
  const { currentView, showDebugInfo } = useSelector(
    (state: RootState) => state.ui
  )
  const dispatch = useDispatch()
  const [showGameStats, setShowGameStats] = useState(false)

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
            className={`menu-item ${currentView === 'galaxy' ? 'active' : ''}`}
            onClick={() => dispatch(setCurrentView('galaxy'))}
          >
            Galaxy
          </div>
          <div
            className={`menu-item ${currentView === 'game' ? 'active' : ''}`}
            onClick={() => dispatch(setCurrentView('game'))}
          >
            Game
          </div>
          <div
            className={`menu-item ${currentView === 'graphics' ? 'active' : ''}`}
            onClick={() => dispatch(setCurrentView('graphics'))}
          >
            Graphics
          </div>
          <div
            className={`menu-item ${currentView === 'sound' ? 'active' : ''}`}
            onClick={() => dispatch(setCurrentView('sound'))}
          >
            Sound
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

          {currentView === 'galaxy' && (
            <div className="galaxy-view">
              <GalaxySelector />
              <div className="galaxy-content">
                <PlanetList />
                <PlanetViewer />
              </div>
            </div>
          )}

          {currentView === 'game' && (
            <GameView
              games={[
                {
                  type: 'canvas',
                  name: 'Test Game',
                  gameLoop: testGameLoop
                } as CanvasGameDefinition,
                {
                  type: 'canvas',
                  name: 'Ship Move',
                  gameLoop: shipMoveGameLoop
                } as CanvasGameDefinition,
                {
                  type: 'bitmap',
                  name: 'Bitmap Test (Gray Pattern)',
                  bitmapRenderer: bitmapTestRenderer
                } as BitmapGameDefinition,
                {
                  type: 'bitmap',
                  name: 'Wall Drawing',
                  bitmapRenderer: wallDrawingRenderer
                } as BitmapGameDefinition
              ]}
              defaultGameIndex={0}
              scale={2} // Display at 2x size (1024x684)
              pixelated={true} // Keep pixels sharp
              statsConfig={
                showGameStats
                  ? {
                      showFps: true,
                      showFrameCount: true,
                      showTime: true,
                      showKeys: true,
                      position: 'top-right',
                      opacity: 0.8
                    }
                  : undefined
              }
              showGameStats={showGameStats}
              onShowGameStatsChange={setShowGameStats}
              onInit={(_ctx, env) => {
                console.log(
                  `Game initialized: ${env.width}x${env.height} @ ${env.fps}fps`
                )
              }}
            />
          )}

          {currentView === 'graphics' && (
            <div className="graphics-view">
              <div className="graphics-content">
                <GraphicsList />
                <GraphicsViewer />
              </div>
            </div>
          )}

          {currentView === 'sound' && <SoundTest />}

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
