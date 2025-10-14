import { useSelector } from 'react-redux'
import type { RootState } from './store/store'
import { useAppDispatch } from './store/store'
import {
  setCurrentView,
  toggleDebugInfo,
  toggleGameStats,
  setSelectedGameIndex
} from './store/uiSlice'
import type { SpriteService } from '@core/sprites'
import { GalaxySelector } from './components/GalaxySelector'
import { PlanetList } from './components/PlanetList'
import { PlanetViewer } from './components/PlanetViewer'
import { GraphicsList } from './components/GraphicsList'
import { GraphicsViewer } from './components/GraphicsViewer'
import { SpritesList } from './components/SpritesList'
import { SpritesViewer } from './components/SpritesViewer'
import { SpritesControls } from './components/SpritesControls'
import GameView, {
  type CanvasGameDefinition,
  type BitmapGameDefinition
} from './components/GameView'
import { SoundTest } from './components/SoundTest'
import { testGameLoop } from './demos/testGame'
import { shipMoveGameLoop } from './demos/shipMove'
import { bitmapTestRenderer } from './demos/bitmapTest'
import {
  wallDrawingRenderer
  //wallDrawingRendererNew
} from './demos/wallDrawing'
import {
  wallDrawingModernRenderer,
  wallDrawingModernBitmapRenderer
} from './demos/wallDrawingModern'
import { planet3DrawingRenderer } from './demos/planet3Drawing'
import { junctionDrawRenderer } from './demos/junctionDraw'
import { createShipMoveBitmapRenderer } from './demos/shipMoveBitmap'
import {
  createBunkerDrawBitmapRenderer,
  createBunkerDrawFrameRenderer
} from './demos/bunkerDrawBitmap'
import { createFuelDrawBitmapRenderer } from './demos/fuelDrawBitmap'
import {
  createExplosionBitmapRenderer,
  createExplosionFrameRenderer
} from './demos/explosionBitmap'
import {
  createShardTestBitmapRenderer,
  createShardTestFrameRenderer
} from './demos/shardTestBitmap'
import {
  strafeTestBitmapRenderer,
  createStrafeTestFrameRenderer
} from './demos/strafeTestBitmap'
import { createStarBackgroundBitmapRenderer } from './demos/starBackgroundBitmap'
import { createStatusBarDemo } from './demos/statusBarDemo'
import { createShieldDemoRenderer } from './demos/shieldDemo'
import type { SpriteRegistry } from '@/lib/frame/types'
import './index.css'

type AppProps = {
  spriteService: SpriteService
  spriteRegistry: SpriteRegistry<ImageData>
}

function App({ spriteService, spriteRegistry }: AppProps): React.JSX.Element {
  const { currentView, showDebugInfo, showGameStats, selectedGameIndex } =
    useSelector((state: RootState) => state.ui)
  const dispatch = useAppDispatch()

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
            className={`menu-item ${currentView === 'sprites' ? 'active' : ''}`}
            onClick={() => dispatch(setCurrentView('sprites'))}
          >
            Sprites
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
                <PlanetViewer spriteService={spriteService} />
              </div>
            </div>
          )}

          {currentView === 'game' && (
            <GameView
              spriteRegistry={spriteRegistry}
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
                  //frameRenderer: wallDrawingRendererNew
                  // collisionService: {
                  //   getMap: () => collisionService.getMap(),
                  //   viewportOffset: viewportState,
                  //   statusBarHeight: 24
                  // }
                } as BitmapGameDefinition,
                {
                  type: 'bitmap',
                  name: 'Wall Drawing Modern (All 256 Junctions)',
                  bitmapRenderer: wallDrawingModernBitmapRenderer,
                  frameRenderer: wallDrawingModernRenderer
                } as BitmapGameDefinition,
                {
                  type: 'bitmap',
                  name: 'Planet 3 Drawing',
                  bitmapRenderer: planet3DrawingRenderer
                } as BitmapGameDefinition,
                {
                  type: 'bitmap',
                  name: 'Junction Draw (All 64 Combinations)',
                  bitmapRenderer: junctionDrawRenderer
                } as BitmapGameDefinition,
                {
                  type: 'bitmap',
                  name: 'Ship Move (Bitmap)',
                  bitmapRenderer: createShipMoveBitmapRenderer(spriteService)
                } as BitmapGameDefinition,
                {
                  type: 'bitmap',
                  name: 'Bunker Draw',
                  bitmapRenderer: createBunkerDrawBitmapRenderer(spriteService),
                  frameRenderer: createBunkerDrawFrameRenderer()
                } as BitmapGameDefinition,
                {
                  type: 'bitmap',
                  name: 'Fuel Draw',
                  bitmapRenderer: createFuelDrawBitmapRenderer(spriteService)
                } as BitmapGameDefinition,
                {
                  type: 'bitmap',
                  name: 'Explosion Test',
                  bitmapRenderer: createExplosionBitmapRenderer(spriteService),
                  frameRenderer: createExplosionFrameRenderer()
                } as BitmapGameDefinition,
                {
                  type: 'bitmap',
                  name: 'Shard Test',
                  bitmapRenderer: createShardTestBitmapRenderer(spriteService),
                  frameRenderer: createShardTestFrameRenderer()
                } as BitmapGameDefinition,
                {
                  type: 'bitmap',
                  name: 'Strafe Test',
                  bitmapRenderer: strafeTestBitmapRenderer,
                  frameRenderer: createStrafeTestFrameRenderer()
                } as BitmapGameDefinition,
                {
                  type: 'bitmap',
                  name: 'Star Background (Press SPACE)',
                  bitmapRenderer:
                    createStarBackgroundBitmapRenderer(spriteService)
                } as BitmapGameDefinition,
                {
                  type: 'bitmap',
                  name: 'Status Bar Demo (Type text, ↑↓ level, Enter resets)',
                  bitmapRenderer: createStatusBarDemo(spriteService)
                } as BitmapGameDefinition,
                {
                  type: 'bitmap',
                  name: 'Shield Demo (SPACE to activate, Z/X rotate)',
                  bitmapRenderer: createShieldDemoRenderer(spriteService)
                } as BitmapGameDefinition
              ]}
              selectedGameIndex={selectedGameIndex}
              onSelectedGameIndexChange={index =>
                dispatch(setSelectedGameIndex(index))
              }
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
              onShowGameStatsChange={() => dispatch(toggleGameStats())}
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

          {currentView === 'sprites' && (
            <div className="sprites-view">
              <div className="sprites-content">
                <SpritesList />
                <SpritesViewer spriteService={spriteService} />
                <SpritesControls />
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
