/**
 * @fileoverview Middleware to persist app settings to localStorage
 */

import type { Middleware } from '@reduxjs/toolkit'
import {
  setAlignmentMode,
  toggleAlignmentMode,
  toggleInGameControls,
  setVolume,
  enableSound,
  disableSound
} from './appSlice'
import type { AlignmentMode } from '@/core/shared'
import type { RootState } from './store'

const APP_SETTINGS_STORAGE_KEY = 'continuum_app_settings'

export type PersistedAppSettings = {
  useOriginalCollisions: boolean
  alignmentMode: AlignmentMode
  showInGameControls: boolean
  volume: number
  soundOn: boolean
}

/**
 * Middleware to handle app settings persistence to localStorage
 */
export const appMiddleware: Middleware<{}, RootState> =
  store => next => action => {
    // Let the action pass through first
    const result = next(action)

    // After the action has been processed, check if we need to save
    if (
      setAlignmentMode.match(action) ||
      toggleAlignmentMode.match(action) ||
      toggleInGameControls.match(action) ||
      setVolume.match(action) ||
      enableSound.match(action) ||
      disableSound.match(action)
    ) {
      const state = store.getState()
      try {
        const settingsToSave: PersistedAppSettings = {
          useOriginalCollisions: state.app.useOriginalCollisions,
          alignmentMode: state.app.alignmentMode,
          showInGameControls: state.app.showInGameControls,
          volume: state.app.volume,
          soundOn: state.app.soundOn
        }
        localStorage.setItem(
          APP_SETTINGS_STORAGE_KEY,
          JSON.stringify(settingsToSave)
        )
      } catch (error) {
        console.error('Failed to save app settings to localStorage:', error)
      }
    }

    return result
  }

/**
 * Load app settings from localStorage
 * Call this when initializing the store
 */
export const loadAppSettings = (): Partial<PersistedAppSettings> => {
  try {
    const saved = localStorage.getItem(APP_SETTINGS_STORAGE_KEY)
    if (saved) {
      const parsed = JSON.parse(saved) as PersistedAppSettings
      return {
        useOriginalCollisions: parsed.useOriginalCollisions,
        alignmentMode: parsed.alignmentMode,
        showInGameControls: parsed.showInGameControls,
        volume: parsed.volume,
        soundOn: parsed.soundOn
      }
    }
  } catch (error) {
    console.error('Failed to load app settings from localStorage:', error)
  }
  return {}
}
