import React, { useState, useEffect } from 'react'
import GameRenderer from './components/GameRenderer'
import StartScreen from './components/StartScreen'
import HighScoreEntry from './components/HighScoreEntry'
import GameOverScreen from './components/GameOverScreen'
import SettingsModal from './components/SettingsModal'
import VolumeButton from './components/VolumeButton'
import FullscreenButton from './components/FullscreenButton'
import InGameControlsPanel from './components/InGameControlsPanel'
import { loadLevel } from './levelThunks'
import { startGame, setMode } from './appSlice'
import { setHighScore } from '@/core/highscore'
import { shipSlice } from '@/core/ship'
import { invalidateHighScore } from './gameSlice'
import { type SoundService } from '@/core/sound'
import { type SpriteService } from '@/core/sprites'
import { useAppDispatch, useAppSelector } from './store'
import type { GameRenderLoop } from './types'
import type { CollisionService } from '@/core/collision'
import { useResponsiveScale } from './hooks/useResponsiveScale'
import { BASE_GAME_WIDTH, BASE_TOTAL_HEIGHT } from './constants/dimensions'

type AppProps = {
  renderer: GameRenderLoop
  soundService: SoundService
  spriteService: SpriteService
  collisionService: CollisionService
}

export const App: React.FC<AppProps> = ({
  renderer,
  collisionService,
  soundService,
  spriteService
}) => {
  const dispatch = useAppDispatch()
  const gameMode = useAppSelector(state => state.app.mode)
  const currentGalaxyId = useAppSelector(state => state.app.currentGalaxyId)
  const volume = useAppSelector(state => state.app.volume)
  const soundMuted = useAppSelector(state => !state.app.soundOn)
  const showInGameControls = useAppSelector(
    state => state.app.showInGameControls
  )
  const mostRecentScore = useAppSelector(state => state.app.mostRecentScore)
  const highScoreEligible = useAppSelector(
    state => state.game.highScoreEligible
  )
  const scaleMode = useAppSelector(state => state.app.scaleMode)

  // Use responsive scale that adapts to viewport size or fixed scale from settings
  const { scale, dimensions } = useResponsiveScale(scaleMode)

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

      const availableWidth = window.innerWidth - VIEWPORT_PADDING * 2
      const availableHeight = window.innerHeight - VIEWPORT_PADDING * 2

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
  }, [scaleMode, scale])

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

              // Invalidate high score if starting at level > 1
              if (level > 1) {
                dispatch(invalidateHighScore())
              }

              // Reset sound service state for new game
              soundService.setVolume(volume)
              soundService.setMuted(soundMuted)

              // Load the selected level
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
              collisionService={collisionService}
              spriteService={spriteService}
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
        {!highScoreEligible && (
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
