/**
 * Sound manager that bridges Redux state with the sound engine
 * Phase 6: Full implementation with new audio system
 */

import { store } from '@dev/store'
import { SoundType } from './constants'
import { createSoundEngine } from './soundEngine'
import {
  startSound as startSoundAction,
  stopSound as stopSoundAction
} from './soundSlice'
import type { SoundEngine } from './types'

/**
 * Manages sound playback and lifecycle
 * Phase 6: Integrated with new buffer-based audio system
 */
export const createSoundManager = (): {
  initialize: () => void
  startSound: (soundType: SoundType) => void
  stopSound: () => void
  setVolume: (volume: number) => void
  cleanup: () => void
  getEngine: () => SoundEngine | null
  start: () => void
  stop: () => void
} => {
  let engine: SoundEngine | null = null
  let isInitialized = false

  /**
   * Initialize the sound system
   */
  const initialize = (): void => {
    if (isInitialized) return

    try {
      engine = createSoundEngine()
      isInitialized = true

      // Apply initial volume from Redux state
      const initialVolume = store.getState().sound.volume
      engine.setVolume(initialVolume)
    } catch (error) {
      console.error('Failed to initialize sound engine:', error)
      engine = null
      isInitialized = false
    }
  }

  /**
   * Start playing a sound
   * Phase 6: Updates Redux state and starts audio
   */
  const startSound = (soundType: SoundType): void => {
    // Update Redux state
    store.dispatch(startSoundAction(soundType))

    // Start audio playback
    if (engine) {
      engine.start()
    }
  }

  /**
   * Stop the current sound
   * Phase 6: Updates Redux state and stops audio
   */
  const stopSound = (): void => {
    store.dispatch(stopSoundAction())

    // Stop audio playback
    if (engine) {
      engine.stop()
    }
  }

  /**
   * Start audio engine (for test panel)
   */
  const start = (): void => {
    if (engine) {
      engine.start()
    }
  }

  /**
   * Stop audio engine (for test panel)
   */
  const stop = (): void => {
    if (engine) {
      engine.stop()
    }
  }

  /**
   * Get the sound engine instance (for test panel)
   */
  const getEngine = (): SoundEngine | null => {
    return engine
  }

  /**
   * Set the master volume
   */
  const setVolume = (volume: number): void => {
    if (engine) {
      engine.setVolume(volume)
    }
  }

  /**
   * Clean up the sound system
   */
  const cleanup = (): void => {
    stopSound()
    engine = null
    isInitialized = false
  }

  // Subscribe to volume changes in Redux
  let lastVolume = store.getState().sound.volume
  store.subscribe(() => {
    const state = store.getState()
    if (state.sound.volume !== lastVolume) {
      lastVolume = state.sound.volume
      setVolume(lastVolume)
    }

    // Handle sound being disabled
    if (
      !state.sound.enabled &&
      state.sound.currentSound !== SoundType.NO_SOUND
    ) {
      stopSound()
    }
  })

  return {
    initialize,
    startSound,
    stopSound,
    setVolume,
    cleanup,
    getEngine,
    start,
    stop
  }
}

// Create a singleton instance
export const soundManager = createSoundManager()
