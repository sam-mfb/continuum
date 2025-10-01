import type { PayloadAction } from '@reduxjs/toolkit'
import { createSlice } from '@reduxjs/toolkit'

export type HighScore = {
  user: string
  planet: number
  score: number
  fuel: number
  date: string
}

export type HighScoreTable = {
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

// High scores are now per-galaxy
export type HighScoreState = Record<string, HighScoreTable>

// Default high score table for a single galaxy
export const getDefaultHighScoreTable = (): HighScoreTable => ({
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

// Default high scores - empty object, tables created on demand
export const getDefaultHighScores = (): HighScoreState => ({})

// Initial state - will be loaded from localStorage via middleware if available
const initialState: HighScoreState = getDefaultHighScores()

export const highscoreSlice = createSlice({
  name: 'highscore',
  initialState,
  reducers: {
    setHighScore: (
      state,
      action: PayloadAction<{ galaxyId: string; score: HighScore }>
    ) => {
      const { galaxyId, score: newScore } = action.payload

      // Ensure galaxy table exists
      if (!state[galaxyId]) {
        state[galaxyId] = getDefaultHighScoreTable()
      }

      const galaxyTable = state[galaxyId]!
      const slots = Object.keys(galaxyTable)
        .map(Number)
        .sort((a, b) => a - b)
      const maxSlot = slots[slots.length - 1]!

      // Find the position where this score should be inserted
      let insertPosition = -1
      for (const slot of slots) {
        const key = slot as keyof HighScoreTable
        if (newScore.score > galaxyTable[key].score) {
          insertPosition = slot
          break
        }
      }

      // If score qualifies for the high score table
      if (insertPosition !== -1) {
        // Shift lower scores down
        for (let i = maxSlot; i > insertPosition; i--) {
          const currentSlot = i as keyof HighScoreTable
          const previousSlot = (i - 1) as keyof HighScoreTable
          if (currentSlot in galaxyTable && previousSlot in galaxyTable) {
            galaxyTable[currentSlot] = galaxyTable[previousSlot]
          }
        }

        // Insert the new high score
        const insertSlot = insertPosition as keyof HighScoreTable
        galaxyTable[insertSlot] = newScore
      }
    },
    resetHighScores: () => {
      return getDefaultHighScores()
    },
    resetGalaxyHighScores: (state, action: PayloadAction<string>) => {
      const galaxyId = action.payload
      state[galaxyId] = getDefaultHighScoreTable()
    }
  }
})

export const { setHighScore, resetHighScores, resetGalaxyHighScores } =
  highscoreSlice.actions
