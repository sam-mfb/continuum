import type { Middleware } from '@reduxjs/toolkit'
import {
  setHighScore,
  resetHighScores,
  resetGalaxyHighScores,
  getDefaultHighScores
} from './highscoreSlice'
import type { HighScoreState, HighScoreTable } from './highscoreSlice'

const HIGHSCORE_STORAGE_KEY = 'continuum_highscores_v2'
const LEGACY_HIGHSCORE_STORAGE_KEY = 'continuum_highscores'

/**
 * Middleware to handle high score persistence to localStorage
 * Saves high scores whenever they are updated
 */
export const highscoreMiddleware: Middleware<
  {},
  { highscore: HighScoreState }
> = store => next => action => {
  // Let the action pass through first
  const result = next(action)

  // After the action has been processed, check if we need to save
  if (
    setHighScore.match(action) ||
    resetGalaxyHighScores.match(action) ||
    resetHighScores.match(action)
  ) {
    const state = store.getState()
    try {
      localStorage.setItem(
        HIGHSCORE_STORAGE_KEY,
        JSON.stringify(state.highscore)
      )
    } catch (error) {
      console.error('Failed to save high scores to localStorage:', error)
    }
  }

  return result
}

/**
 * Migrate legacy high scores (single table) to new format (per-galaxy)
 */
const migrateLegacyHighScores = (
  legacyScores: HighScoreTable
): HighScoreState => {
  // Put legacy scores under 'release' galaxy ID
  return {
    release: legacyScores
  }
}

/**
 * Load high scores from localStorage
 * Call this when initializing the store
 * Handles migration from v1 format to v2 format
 */
export const loadHighScores = (): HighScoreState => {
  try {
    // Try loading v2 format first
    const savedV2 = localStorage.getItem(HIGHSCORE_STORAGE_KEY)
    if (savedV2) {
      return JSON.parse(savedV2)
    }

    // Try migrating from v1 format
    const savedV1 = localStorage.getItem(LEGACY_HIGHSCORE_STORAGE_KEY)
    if (savedV1) {
      const legacyScores = JSON.parse(savedV1) as HighScoreTable
      const migratedScores = migrateLegacyHighScores(legacyScores)

      // Save migrated scores to v2 storage
      try {
        localStorage.setItem(
          HIGHSCORE_STORAGE_KEY,
          JSON.stringify(migratedScores)
        )
        // Optionally remove the old key
        localStorage.removeItem(LEGACY_HIGHSCORE_STORAGE_KEY)
      } catch (saveError) {
        console.error('Failed to save migrated high scores:', saveError)
      }

      return migratedScores
    }
  } catch (error) {
    console.error('Failed to load high scores from localStorage:', error)
  }
  return getDefaultHighScores()
}
