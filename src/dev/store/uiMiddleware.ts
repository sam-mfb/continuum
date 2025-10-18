/**
 * @fileoverview Middleware to persist UI settings to localStorage
 */

import type { Middleware } from '@reduxjs/toolkit'
import {
  setCurrentView,
  toggleDebugInfo,
  toggleGameStats,
  setSelectedGameIndex
} from './uiSlice'

const UI_SETTINGS_STORAGE_KEY = 'continuum_dev_ui_settings'

export type PersistedUISettings = {
  currentView:
    | 'menu'
    | 'game'
    | 'settings'
    | 'galaxy'
    | 'graphics'
    | 'sound'
    | 'sprites'
  showDebugInfo: boolean
  showGameStats: boolean
  selectedGameIndex: number
}

/**
 * Middleware to handle UI settings persistence to localStorage
 */
export const uiMiddleware: Middleware = store => next => action => {
  // Let the action pass through first
  const result = next(action)

  // After the action has been processed, check if we need to save
  if (
    setCurrentView.match(action) ||
    toggleDebugInfo.match(action) ||
    toggleGameStats.match(action) ||
    setSelectedGameIndex.match(action)
  ) {
    const state = store.getState()
    try {
      const settingsToSave: PersistedUISettings = {
        currentView: state.ui.currentView,
        showDebugInfo: state.ui.showDebugInfo,
        showGameStats: state.ui.showGameStats,
        selectedGameIndex: state.ui.selectedGameIndex
      }
      localStorage.setItem(
        UI_SETTINGS_STORAGE_KEY,
        JSON.stringify(settingsToSave)
      )
    } catch (error) {
      console.error('Failed to save UI settings to localStorage:', error)
    }
  }

  return result
}

/**
 * Load UI settings from localStorage
 * Call this when initializing the store
 */
export const loadUISettings = (): Partial<PersistedUISettings> => {
  try {
    const saved = localStorage.getItem(UI_SETTINGS_STORAGE_KEY)
    if (saved) {
      const parsed = JSON.parse(saved) as PersistedUISettings
      return {
        currentView: parsed.currentView,
        showDebugInfo: parsed.showDebugInfo,
        showGameStats: parsed.showGameStats,
        selectedGameIndex: parsed.selectedGameIndex
      }
    }
  } catch (error) {
    console.error('Failed to load UI settings from localStorage:', error)
  }
  return {}
}
