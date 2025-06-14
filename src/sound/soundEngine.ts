/**
 * Core sound engine using Web Audio API
 * Phase 6: Full implementation with new buffer-based audio system
 */

import type { SoundEngine } from './types'
import { createBufferManager } from './bufferManager'
import { createAudioOutput } from './audioOutput'
import { createTestGenerators } from './sampleGenerator'
import type { SampleGenerator } from './sampleGenerator'

/**
 * Factory function for creating the sound engine
 * Phase 6: Integrated with new audio pipeline
 */
export const createSoundEngine = (): SoundEngine => {
  // Initialize test generators
  const generators = createTestGenerators()
  
  // Initialize buffer manager with silence
  const bufferManager = createBufferManager(generators.silence)
  
  // Initialize audio output
  const audioOutput = createAudioOutput(bufferManager)
  
  // Keep track of current generator
  let currentGenerator: SampleGenerator = generators.silence
  
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
   * Stop audio playback
   */
  const stop = (): void => {
    audioOutput.stop()
  }
  
  /**
   * Switch to a different test sound
   * @param soundType - Name of the test sound to play
   */
  const playTestSound = (soundType: keyof typeof generators): void => {
    currentGenerator = generators[soundType]
    bufferManager.setGenerator(currentGenerator)
  }
  
  /**
   * Get available test sounds
   */
  const getTestSounds = (): string[] => {
    return Object.keys(generators)
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
    playTestSound: (soundType: keyof typeof generators) => void
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
