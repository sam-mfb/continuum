/**
 * @fileoverview Middleware to persist app settings to localStorage
 */

import type { Middleware } from '@reduxjs/toolkit'
import {
  setCollisionMode,
  toggleCollisionMode,
  setAlignmentMode,
  toggleAlignmentMode,
  toggleInGameControls,
  setScaleMode,
  setVolume,
  enableSound,
  disableSound,
  setTouchControlsOverride,
  type CollisionMode,
  type ScaleMode
} from './appSlice'
import type { AlignmentMode } from '@/core/shared'
import type { RootState } from './store'

const APP_SETTINGS_STORAGE_KEY = 'continuum_app_settings'

export type PersistedAppSettings = {
  collisionMode: CollisionMode
  alignmentMode: AlignmentMode
  showInGameControls: boolean
  scaleMode: ScaleMode
  volume: number
  soundOn: boolean
  touchControlsOverride: boolean | null
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
      setCollisionMode.match(action) ||
      toggleCollisionMode.match(action) ||
      setAlignmentMode.match(action) ||
      toggleAlignmentMode.match(action) ||
      toggleInGameControls.match(action) ||
      setScaleMode.match(action) ||
      setVolume.match(action) ||
      enableSound.match(action) ||
      disableSound.match(action) ||
      setTouchControlsOverride.match(action)
    ) {
      const state = store.getState()
      try {
        const settingsToSave: PersistedAppSettings = {
          collisionMode: state.app.collisionMode,
          alignmentMode: state.app.alignmentMode,
          showInGameControls: state.app.showInGameControls,
          scaleMode: state.app.scaleMode,
          volume: state.app.volume,
          soundOn: state.app.soundOn,
          touchControlsOverride: state.app.touchControlsOverride
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
        collisionMode: parsed.collisionMode,
        alignmentMode: parsed.alignmentMode,
        showInGameControls: parsed.showInGameControls,
        scaleMode: parsed.scaleMode,
        volume: parsed.volume,
        soundOn: parsed.soundOn,
        touchControlsOverride: parsed.touchControlsOverride
      }
    }
  } catch (error) {
    console.error('Failed to load app settings from localStorage:', error)
  }
  return {}
}
