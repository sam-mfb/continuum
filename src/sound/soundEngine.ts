/**
 * Core sound engine using Web Audio API
 * Phase 6: Full implementation with new buffer-based audio system
 */

import type { SoundEngine } from './types'
import { createBufferManager } from './bufferManager'
import { createAudioOutput } from './audioOutput'
import { createTestSounds } from './generators/testSounds'
import { createGameSounds } from './generators/gameSounds'
import type { SampleGenerator } from './sampleGenerator'

/**
 * Factory function for creating the sound engine
 * Phase 6: Integrated with new audio pipeline
 */
export const createSoundEngine = (): SoundEngine => {
  // Initialize both test and game sound generators
  const testSounds = createTestSounds()
  const gameSounds = createGameSounds()

  // Combine all generators for easy access
  const allGenerators = { ...testSounds, ...gameSounds }

  // Initialize buffer manager with silence
  const bufferManager = createBufferManager(testSounds.silence)

  // Initialize audio output
  const audioOutput = createAudioOutput(bufferManager)

  // Keep track of current generator
  let currentGenerator: SampleGenerator = testSounds.silence

  /**
   * Get audio context from the audio output
   */
  const getAudioContext = (): AudioContext | null => {
    return audioOutput.getContext()
  }

  /**
   * Create a dummy gain node for compatibility
   * The new system handles volume differently, but we keep this for API compatibility
   */
  const createMasterGain = (): GainNode | null => {
    const ctx = getAudioContext()
    if (!ctx) return null
    const gain = ctx.createGain()
    gain.connect(ctx.destination)
    return gain
  }

  /**
   * Set the master volume (placeholder for now)
   * @param volume - Volume level from 0 to 1
   */
  const setVolume = (volume: number): void => {
    // TODO: Implement volume control in the generator/buffer system
    console.log('setVolume:', volume)
  }

  /**
   * Start audio playback
   */
  const start = (): void => {
    audioOutput.start()
  }

  /**
   * Stop audio playback and reset all generators
   */
  const stop = (): void => {
    audioOutput.stop()

    // Reset all generators to their initial state
    Object.values(allGenerators).forEach(generator => {
      if (generator && typeof generator.reset === 'function') {
        generator.reset()
      }
    })

    // Reset buffer manager to silence
    currentGenerator = testSounds.silence
    bufferManager.setGenerator(currentGenerator)
  }

  /**
   * Switch to a different test sound
   * @param soundType - Name of the test sound to play
   */
  const playTestSound = (soundType: keyof typeof allGenerators): void => {
    currentGenerator = allGenerators[soundType]
    bufferManager.setGenerator(currentGenerator)
  }

  /**
   * Get available test sounds
   */
  const getTestSounds = (): string[] => {
    return Object.keys(allGenerators)
  }

  /**
   * Get performance statistics
   */
  const getStats = () => {
    const audioStats = audioOutput.getStats()
    const bufferState = bufferManager.getBufferState()
    return {
      ...audioStats,
      bufferState
    }
  }

  // Return public interface with extensions for testing
  return {
    audioContext: getAudioContext() as AudioContext,
    masterGain: createMasterGain() as GainNode,
    setVolume,
    start,
    stop,
    // Additional methods for Phase 6 testing
    playTestSound,
    getTestSounds,
    getStats,
    isPlaying: audioOutput.isPlaying
  } as SoundEngine & {
    playTestSound: (soundType: keyof typeof allGenerators) => void
    getTestSounds: () => string[]
    getStats: () => {
      underruns: number
      totalCallbacks: number
      averageLatency: number
      bufferState: {
        writePosition: number
        readPosition: number
        available: number
      }
    }
    isPlaying: () => boolean
  }
}
