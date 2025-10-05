import React from 'react'
import GameRenderer from './components/GameRenderer'
import StartScreen from './components/StartScreen'
import HighScoreEntry from './components/HighScoreEntry'
import GameOverScreen from './components/GameOverScreen'
import SettingsModal from './components/SettingsModal'
import VolumeButton from './components/VolumeButton'
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
import { DEFAULT_SCALE, getScaledDimensions } from './constants/dimensions'

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

  // Use default scale for now (will be made dynamic in Phase 1)
  const scale = DEFAULT_SCALE
  const dimensions = getScaledDimensions(scale)

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
            {showInGameControls && <InGameControlsPanel />}
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
            padding: '8px',
            background: 'black'
          }}
        >
          {renderGameContent()}
        </div>
        {!highScoreEligible && (
          <div
            style={{
              position: 'fixed',
              top: '20px',
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
      </div>
      <SettingsModal spriteService={spriteService} scale={scale} />
      <VolumeButton scale={scale} />
    </>
  )
}
