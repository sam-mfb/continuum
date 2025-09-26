/**
 * @fileoverview Middleware to persist control bindings to localStorage
 */

import type { Middleware } from '@reduxjs/toolkit'
import {
  setBinding,
  setBindings,
  resetBindings,
  getDefaultBindings
} from './controlsSlice'
import type { ControlBindings } from './types'

const CONTROLS_STORAGE_KEY = 'continuum_controls'

/**
 * Middleware to handle control bindings persistence to localStorage
 */
export const controlsMiddleware: Middleware = store => next => action => {
  // Let the action pass through first
  const result = next(action)

  // After the action has been processed, check if we need to save
  if (
    setBinding.match(action) ||
    setBindings.match(action) ||
    resetBindings.match(action)
  ) {
    const state = store.getState()
    try {
      localStorage.setItem(
        CONTROLS_STORAGE_KEY,
        JSON.stringify(state.controls.bindings)
      )
    } catch (error) {
      console.error('Failed to save control bindings to localStorage:', error)
    }
  }

  return result
}

/**
 * Load control bindings from localStorage
 * Call this when initializing the store
 */
export const loadControlBindings = (): ControlBindings => {
  try {
    const saved = localStorage.getItem(CONTROLS_STORAGE_KEY)
    if (saved) {
      const parsed = JSON.parse(saved)
      // Merge with defaults to handle any missing keys
      return {
        ...getDefaultBindings(),
        ...parsed
      }
    }
  } catch (error) {
    console.error('Failed to load control bindings from localStorage:', error)
  }
  return getDefaultBindings()
}
