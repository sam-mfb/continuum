import React, { useState, useEffect } from 'react'
import GameRenderer from './components/GameRenderer'
import StartScreen from './components/StartScreen'
import HighScoreEntry from './components/HighScoreEntry'
import GameOverScreen from './components/GameOverScreen'
import SettingsModal from './components/SettingsModal'
import VolumeButton from './components/VolumeButton'
import FullscreenButton from './components/FullscreenButton'
import InGameControlsPanel from './components/InGameControlsPanel'
import ReplaySelectionScreen from './components/ReplaySelectionScreen'
import ReplayRenderer from './components/ReplayRenderer'
import { loadLevel } from '@core/game'
import {
  startGame,
  setMode,
  enableTouchControls,
  disableTouchControls
} from './appSlice'
import { isTouchDevice } from './mobile/deviceDetection'
import { setHighScore } from '@/core/highscore'
import { shipSlice, TOTAL_INITIAL_LIVES } from '@/core/ship'
import { statusSlice } from '@/core/status'
import { markCheatUsed } from '@core/game'
import { clearExplosions } from '@/core/explosions'
import { type SpriteService } from '@/core/sprites'
import { useAppDispatch, useAppSelector, getStoreServices } from './store'
import { GAME_ENGINE_VERSION } from './version'
import type {
  GameRenderLoop,
  GameSoundService,
  NewGameRenderLoop
} from './types'
import type { CollisionService } from '@/core/collision'
import { useResponsiveScale } from './hooks/useResponsiveScale'
import { BASE_GAME_WIDTH, BASE_TOTAL_HEIGHT } from './constants/dimensions'
import type { SpriteRegistry } from '@/lib/frame/types'
import { getDebug } from './debug'

type AppProps = {
  renderer: GameRenderLoop
  rendererNew: NewGameRenderLoop
  soundService: GameSoundService
  spriteService: SpriteService
  collisionService: CollisionService
  spriteRegistry: SpriteRegistry<ImageData>
}

export const App: React.FC<AppProps> = ({
  renderer,
  rendererNew,
  collisionService,
  soundService,
  spriteService,
  spriteRegistry
}) => {
  const dispatch = useAppDispatch()
  const gameMode = useAppSelector(state => state.app.mode)
  const currentGalaxyId = useAppSelector(state => state.app.currentGalaxyId)
  const volume = useAppSelector(state => state.app.volume)
  const soundMuted = useAppSelector(state => !state.app.soundOn)
  const renderMode = useAppSelector(state => state.app.renderMode)
  const collisionMode = useAppSelector(state => state.app.collisionMode)
  const currentLives = useAppSelector(state => state.ship.lives)
  const showInGameControls = useAppSelector(
    state => state.app.showInGameControls
  )
  const mostRecentScore = useAppSelector(state => state.app.mostRecentScore)
  const cheatUsed = useAppSelector(state => state.game.cheatUsed)
  const scaleMode = useAppSelector(state => state.app.scaleMode)
  const touchControlsOverride = useAppSelector(
    state => state.app.touchControlsOverride
  )

  // Use responsive scale that adapts to viewport size or fixed scale from settings
  const { scale, dimensions } = useResponsiveScale(scaleMode)

  // Re-evaluate touch controls when override setting changes
  useEffect(() => {
    const shouldEnableTouchControls =
      touchControlsOverride !== null ? touchControlsOverride : isTouchDevice()

    if (shouldEnableTouchControls) {
      dispatch(enableTouchControls())
    } else {
      dispatch(disableTouchControls())
    }
  }, [touchControlsOverride, dispatch])

  // Manage sprite registry loading based on render mode
  useEffect(() => {
    const loadOrUnloadSprites = async (): Promise<void> => {
      if (renderMode === 'modern') {
        // Load sprites for modern renderer
        try {
          await spriteRegistry.loadSprites()
          console.log('Sprites loaded for modern renderer')
        } catch (error) {
          console.error('Failed to load sprites:', error)
        }
      } else {
        // Unload sprites when switching back to original renderer
        spriteRegistry.unloadSprites()
        console.log('Sprites unloaded for original renderer')
      }
    }

    loadOrUnloadSprites()
  }, [renderMode, spriteRegistry])

  // Track if we should show the resize hint
  const [showResizeHint, setShowResizeHint] = useState(false)

  // Viewport padding from useResponsiveScale hook
  const VIEWPORT_PADDING = 0

  // Check if user has expanded window 15% toward 2x scale
  useEffect(() => {
    const checkResizeHint = (): void => {
      // Only show hint in auto mode when at 1x scale
      if (scaleMode !== 'auto' || scale !== 1) {
        setShowResizeHint(false)
        return
      }

      // Don't show on mobile devices where window resizing isn't possible
      const isTouchDevice =
        'ontouchstart' in window || navigator.maxTouchPoints > 0
      const isSmallScreen =
        window.screen.width < 768 || window.screen.height < 768
      const isMobile = isTouchDevice && isSmallScreen

      if (isMobile) {
        setShowResizeHint(false)
        return
      }

      const availableWidth = window.innerWidth - VIEWPORT_PADDING * 2
      const availableHeight = window.innerHeight - VIEWPORT_PADDING * 2

      // Don't show if there isn't enough vertical space below the game for the hint
      // Calculate space below the game canvas
      const spaceBelow = availableHeight - dimensions.totalHeight
      // The hint needs about 120px of clearance (bottom: 20px + sufficient space for hint with padding/text)
      const hasVerticalSpace = spaceBelow >= 120

      if (!hasVerticalSpace) {
        setShowResizeHint(false)
        return
      }

      // 25% of the way from 1x to 2x
      const widthThreshold = BASE_GAME_WIDTH * 1.25
      const heightThreshold = BASE_TOTAL_HEIGHT * 1.25

      // Show hint if viewport has expanded 25% toward 2x in either dimension
      const shouldShow =
        availableWidth >= widthThreshold || availableHeight >= heightThreshold

      setShowResizeHint(shouldShow)
    }

    // Check immediately
    checkResizeHint()

    // Check on resize
    window.addEventListener('resize', checkResizeHint)
    window.addEventListener('orientationchange', checkResizeHint)

    return (): void => {
      window.removeEventListener('resize', checkResizeHint)
      window.removeEventListener('orientationchange', checkResizeHint)
    }
  }, [scaleMode, scale, dimensions.totalHeight])

  // Render the game content based on mode
  const renderGameContent = (): React.ReactElement | null => {
    switch (gameMode) {
      case 'start':
        return (
          <StartScreen
            scale={scale}
            onStartGame={(level: number) => {
              // Reset ship and sound to clean state
              dispatch(shipSlice.actions.resetShip())
              dispatch(shipSlice.actions.resetLives(TOTAL_INITIAL_LIVES))
              dispatch(shipSlice.actions.resetFuel())

              // Reset score and status for new game
              dispatch(statusSlice.actions.initStatus(level))

              // Mark cheat used if starting at level > 1
              if (level > 1) {
                dispatch(markCheatUsed())
              }

              // Reset sound service state for new game
              soundService.setVolume(volume)
              soundService.setMuted(soundMuted)

              // Clear explosions state from any previous game
              dispatch(clearExplosions())

              // Start audio engine proactively to avoid first-sound delay
              if (!soundMuted) {
                soundService.startEngine().catch(err => {
                  console.warn('Failed to start audio engine:', err)
                  // Non-fatal: engine will lazy-start on first sound
                })
              }

              // Start recording BEFORE loading level (only if modern collision mode)
              // This ensures the first level seed is captured
              if (collisionMode === 'modern') {
                const recordingService = getStoreServices().recordingService
                const debug = getDebug()
                const enableFullSnapshots =
                  debug?.ENABLE_FULL_SNAPSHOTS ?? false

                recordingService.startRecording(
                  {
                    engineVersion: GAME_ENGINE_VERSION,
                    galaxyId: currentGalaxyId,
                    startLevel: level,
                    timestamp: Date.now(),
                    initialState: {
                      lives: currentLives
                    }
                  },
                  enableFullSnapshots
                )
                console.log(
                  `Started recording game (full snapshots: ${enableFullSnapshots})`
                )
              }

              // Load the selected level (this will record the seed if recording is active)
              dispatch(loadLevel(level))

              // Start the game
              dispatch(startGame())
            }}
          />
        )

      case 'playing':
        return (
          <div
            style={{
              width: `${dimensions.gameWidth}px`,
              height: `${dimensions.totalHeight}px`,
              position: 'relative'
            }}
          >
            <GameRenderer
              renderer={renderer}
              rendererNew={rendererNew}
              collisionService={collisionService}
              spriteService={spriteService}
              spriteRegistry={spriteRegistry}
              renderMode={renderMode}
              width={512}
              height={342}
              scale={scale}
              fps={20} // Original Continuum runs at 20 FPS
            />
            {showInGameControls && <InGameControlsPanel scale={scale} />}
          </div>
        )

      case 'highScoreEntry':
        if (!mostRecentScore) {
          // Shouldn't happen, but handle gracefully - just show nothing
          console.warn(
            "[App] Entered 'highScoreEntry' mode with no mostRecentScore. This should not happen. Rendering nothing."
          )
          return null
        }

        // At this point we know the score qualifies (checked in game loop)
        return (
          <HighScoreEntry
            scale={scale}
            score={mostRecentScore.score}
            planet={mostRecentScore.planet}
            fuel={mostRecentScore.fuel}
            onSubmit={(name: string) => {
              dispatch(
                setHighScore({
                  galaxyId: currentGalaxyId,
                  score: {
                    user: name,
                    score: mostRecentScore.score,
                    planet: mostRecentScore.planet,
                    fuel: mostRecentScore.fuel,
                    date: new Date().toISOString()
                  }
                })
              )
              dispatch(setMode('start'))
            }}
          />
        )

      case 'gameOver':
        return (
          <GameOverScreen
            scale={scale}
            onContinue={() => dispatch(setMode('start'))}
          />
        )

      case 'replaySelection':
        return <ReplaySelectionScreen scale={scale} />

      case 'replay':
        return (
          <ReplayRenderer
            renderer={renderer}
            rendererNew={rendererNew}
            collisionService={collisionService}
            spriteService={spriteService}
            spriteRegistry={spriteRegistry}
            renderMode={renderMode}
            width={512}
            height={342}
            scale={scale}
            fps={20}
          />
        )

      default:
        gameMode satisfies never
        return null
    }
  }

  return (
    <>
      <div
        style={{
          background: 'black',
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          position: 'relative'
        }}
      >
        <div
          style={{
            background: 'black'
          }}
        >
          {renderGameContent()}
        </div>
        {cheatUsed && (
          <div
            style={{
              position: 'fixed',
              bottom: '20px',
              right: '20px',
              color: '#AA0000',
              fontSize: '28px',
              opacity: 0.8
            }}
            title="High scores disabled"
          >
            ⚠
          </div>
        )}
        {showResizeHint && (
          <div
            style={{
              position: 'fixed',
              bottom: '20px',
              left: '50%',
              transform: 'translateX(-50%)',
              background: 'rgba(0, 0, 0, 0.8)',
              color: 'white',
              padding: `${8 * scale}px ${16 * scale}px`,
              borderRadius: `${4 * scale}px`,
              fontSize: `${12 * scale}px`,
              fontFamily: 'sans-serif',
              textAlign: 'center',
              maxWidth: '80%',
              border: '1px solid rgba(255, 255, 255, 0.3)',
              pointerEvents: 'none'
            }}
          >
            Increase your window size or press the fullscreen button ⛶ to make
            the game bigger
          </div>
        )}
      </div>
      <FullscreenButton scale={scale} />
      <SettingsModal spriteService={spriteService} scale={scale} />
      <VolumeButton scale={scale} />
    </>
  )
}
