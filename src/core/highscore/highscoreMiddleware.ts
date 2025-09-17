import type { Middleware } from '@reduxjs/toolkit'
import {
  setHighScore,
  resetHighScores,
  getDefaultHighScores
} from './highscoreSlice'
import type { HighScoreState } from './highscoreSlice'

const HIGHSCORE_STORAGE_KEY = 'continuum_highscores'

/**
 * Middleware to handle high score persistence to localStorage
 * Saves high scores whenever they are updated
 */
export const highscoreMiddleware: Middleware = store => next => action => {
  // Let the action pass through first
  const result = next(action)

  // After the action has been processed, check if we need to save
  if (setHighScore.match(action)) {
    const state = store.getState()
    try {
      localStorage.setItem(
        HIGHSCORE_STORAGE_KEY,
        JSON.stringify(state.highscore)
      )
    } catch (error) {
      console.error('Failed to save high scores to localStorage:', error)
    }
  } else if (resetHighScores.match(action)) {
    // When resetting, clear localStorage
    try {
      localStorage.removeItem(HIGHSCORE_STORAGE_KEY)
    } catch (error) {
      console.error('Failed to clear high scores from localStorage:', error)
    }
  }

  return result
}

/**
 * Load high scores from localStorage
 * Call this when initializing the store
 */
export const loadHighScores = (): HighScoreState => {
  try {
    const saved = localStorage.getItem(HIGHSCORE_STORAGE_KEY)
    if (saved) {
      return JSON.parse(saved)
    }
  } catch (error) {
    console.error('Failed to load high scores from localStorage:', error)
  }
  return getDefaultHighScores()
}
