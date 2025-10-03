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
import {
  setHighScore,
  type HighScoreTable,
  getDefaultHighScoreTable
} from '@/core/highscore'
import { shipSlice } from '@/core/ship'
import { invalidateHighScore } from './gameSlice'
import { type SoundService } from '@/core/sound'
import { type SpriteService } from '@/core/sprites'
import { useAppDispatch, useAppSelector } from './store'
import type { GameRenderLoop } from './types'
import type { CollisionService } from '@/core/collision'

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
  const allHighScores = useAppSelector(state => state.highscore)
  const highScores: HighScoreTable =
    allHighScores[currentGalaxyId] ?? getDefaultHighScoreTable()

  // Render the game content based on mode
  const renderGameContent = (): React.ReactElement | null => {
    switch (gameMode) {
      case 'start':
        return (
          <StartScreen
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
            style={{ width: '1024px', height: '684px', position: 'relative' }}
          >
            <GameRenderer
              renderer={renderer}
              collisionService={collisionService}
              width={512}
              height={342}
              scale={2} // Pixel-doubled
              fps={20} // Original Continuum runs at 20 FPS
            />
            {showInGameControls && <InGameControlsPanel />}
          </div>
        )

      case 'highScoreEntry':
        if (!mostRecentScore) {
          // Shouldn't happen, but handle gracefully
          dispatch(setMode('start'))
          return null
        }

        // Check if score is eligible and qualifies for high score table
        const lowestScore = Math.min(
          ...Object.values(highScores).map(
            (hs: { score: number }) => hs.score || 0
          )
        )

        if (highScoreEligible && mostRecentScore.score > lowestScore) {
          // Score qualifies - show name entry
          return (
            <HighScoreEntry
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
        } else {
          // Score doesn't qualify - go to game over
          dispatch(setMode('gameOver'))
          return null
        }

      case 'gameOver':
        return <GameOverScreen onContinue={() => dispatch(setMode('start'))} />

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
      <SettingsModal spriteService={spriteService} />
      <VolumeButton />
    </>
  )
}
