import React from 'react'
import GameRenderer from './components/GameRenderer'
import StartScreen from './components/StartScreen'
import HighScoreEntry from './components/HighScoreEntry'
import GameOverScreen from './components/GameOverScreen'
import { loadLevel } from './levelThunks'
import { startGame, setMode } from './gameSlice'
import { setHighScore } from '@/core/highscore'
import { shipSlice } from '@/core/ship'
import { invalidateHighScore } from '@/core/status'
import { resetSounds, type SoundService } from '@/core/sound'
import type { BitmapRenderer } from '@lib/bitmap'
import { useAppDispatch, useAppSelector } from './store'

type AppProps = {
  renderer: BitmapRenderer
  totalLevels: number
  soundService: SoundService
}

export const App: React.FC<AppProps> = ({
  renderer,
  totalLevels,
  soundService
}) => {
  const dispatch = useAppDispatch()
  const gameMode = useAppSelector(state => state.game.mode)
  const soundState = useAppSelector(state => state.sound)
  const pendingHighScore = useAppSelector(state => state.game.pendingHighScore)

  // Handle different game modes
  switch (gameMode) {
    case 'start':
      return (
        <StartScreen
          onStartGame={(level: number) => {
            // Reset ship and sound to clean state
            dispatch(shipSlice.actions.resetShip())
            dispatch(resetSounds())

            // Invalidate high score if starting at level > 1
            if (level > 1) {
              dispatch(invalidateHighScore())
            }

            // Reset sound service state for new game
            soundService.setVolume(soundState.volume)
            soundService.setMuted(!soundState.enabled)

            // Load the selected level
            dispatch(loadLevel(level))

            // Start the game
            dispatch(startGame())
          }}
          totalLevels={totalLevels}
        />
      )

    case 'playing':
      return (
        <GameRenderer
          renderer={renderer}
          width={512}
          height={342}
          scale={2} // Pixel-doubled
          fps={20} // Original Continuum runs at 20 FPS
        />
      )

    case 'highScoreEntry':
      if (!pendingHighScore) {
        // Shouldn't happen, but handle gracefully
        dispatch(setMode('start'))
        return null
      }
      return (
        <HighScoreEntry
          score={pendingHighScore.score}
          planet={pendingHighScore.planet}
          fuel={pendingHighScore.fuel}
          onSubmit={(name: string) => {
            dispatch(
              setHighScore({
                user: name,
                score: pendingHighScore.score,
                planet: pendingHighScore.planet,
                fuel: pendingHighScore.fuel,
                date: new Date().toISOString()
              })
            )
            dispatch(setMode('start'))
          }}
        />
      )

    case 'gameOver':
      return <GameOverScreen onContinue={() => dispatch(setMode('start'))} />

    default:
      gameMode satisfies never
      return
  }
}
