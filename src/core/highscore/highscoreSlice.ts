import type { PayloadAction } from '@reduxjs/toolkit'
import { createSlice } from '@reduxjs/toolkit'

// LocalStorage key for high scores
const HIGH_SCORES_KEY = 'continuum_highscores'

export type HighScore = {
  user: string
  planet: number
  score: number
  fuel: number
  date: string
}

export type HighScoreState = {
  1: HighScore
  2: HighScore
  3: HighScore
  4: HighScore
  5: HighScore
  6: HighScore
  7: HighScore
  8: HighScore
  9: HighScore
  10: HighScore
}

// Default high scores
const getDefaultHighScores = (): HighScoreState => ({
  1: { user: 'Randy', planet: 3, score: 11145, fuel: 0, date: '' },
  2: { user: 'Brian', planet: 3, score: 9590, fuel: 0, date: '' },
  3: { user: 'Sam', planet: 2, score: 256, fuel: 0, date: '' },
  4: { user: '', planet: 0, score: 0, fuel: 0, date: '' },
  5: { user: '', planet: 0, score: 0, fuel: 0, date: '' },
  6: { user: '', planet: 0, score: 0, fuel: 0, date: '' },
  7: { user: '', planet: 0, score: 0, fuel: 0, date: '' },
  8: { user: '', planet: 0, score: 0, fuel: 0, date: '' },
  9: { user: '', planet: 0, score: 0, fuel: 0, date: '' },
  10: { user: '', planet: 0, score: 0, fuel: 0, date: '' }
})

// Load high scores from localStorage or use defaults
const loadHighScores = (): HighScoreState => {
  try {
    const saved = localStorage.getItem(HIGH_SCORES_KEY)
    if (saved) {
      return JSON.parse(saved)
    }
  } catch (e) {
    console.error('Failed to load high scores from localStorage:', e)
  }

  return getDefaultHighScores()
}

// Save high scores to localStorage
const saveHighScores = (state: HighScoreState): void => {
  try {
    localStorage.setItem(HIGH_SCORES_KEY, JSON.stringify(state))
  } catch (e) {
    console.error('Failed to save high scores to localStorage:', e)
  }
}

const initialState: HighScoreState = loadHighScores()

export const highscoreSlice = createSlice({
  name: 'highscore',
  initialState,
  reducers: {
    setHighScore: (state, action: PayloadAction<HighScore>) => {
      const newScore = action.payload
      const slots = Object.keys(state)
        .map(Number)
        .sort((a, b) => a - b)
      const maxSlot = slots[slots.length - 1]!

      // Find the position where this score should be inserted
      let insertPosition = -1
      for (const slot of slots) {
        const key = slot as keyof HighScoreState
        if (newScore.score > state[key].score) {
          insertPosition = slot
          break
        }
      }

      // If score qualifies for the high score table
      if (insertPosition !== -1) {
        // Shift lower scores down
        for (let i = maxSlot; i > insertPosition; i--) {
          const currentSlot = i as keyof HighScoreState
          const previousSlot = (i - 1) as keyof HighScoreState
          if (currentSlot in state && previousSlot in state) {
            state[currentSlot] = state[previousSlot]
          }
        }

        // Insert the new high score
        const insertSlot = insertPosition as keyof HighScoreState
        state[insertSlot] = newScore

        // Save to localStorage after updating
        saveHighScores(state)
      }
    },
    resetHighScores: () => {
      const newState = getDefaultHighScores()
      // Clear localStorage to ensure defaults are used
      try {
        localStorage.removeItem(HIGH_SCORES_KEY)
      } catch (e) {
        console.error('Failed to clear high scores from localStorage:', e)
      }
      return newState
    }
  }
})

export const { setHighScore, resetHighScores } = highscoreSlice.actions
