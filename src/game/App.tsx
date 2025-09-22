import React from 'react'
import { useStore, useSelector, useDispatch } from 'react-redux'
import GameRenderer from './components/GameRenderer'
import StartScreen from './components/StartScreen'
import HighScoreEntry from './components/HighScoreEntry'
import GameOverScreen from './components/GameOverScreen'
import { loadLevel } from './levelManager'
import { startGame, setMode } from './gameSlice'
import { setHighScore } from '@/core/highscore'
import { shipSlice } from '@/core/ship'
import { invalidateHighScore } from '@/core/status'
import { initializeSoundService, resetSounds } from '@/core/sound'
import type { BitmapRenderer } from '@lib/bitmap'
import type { GalaxyService } from '@core/galaxy'
import type { GameStore, RootState } from './store'

type AppProps = {
  renderer: BitmapRenderer
  totalLevels: number
  galaxyService: GalaxyService
}

const App: React.FC<AppProps> = ({ renderer, totalLevels, galaxyService }) => {
  const store = useStore() as GameStore
  const dispatch = useDispatch()
  const gameMode = useSelector((state: RootState) => state.game.mode)
  const pendingHighScore = useSelector(
    (state: RootState) => state.game.pendingHighScore
  )

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

            // Reinitialize sound service for new game
            initializeSoundService()

            // Load the selected level
            loadLevel(store, level, galaxyService)

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
          scale={2} // Pixel-doubled like the demos
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
      // Shouldn't happen, but handle gracefully
      return null
  }
}

export default App