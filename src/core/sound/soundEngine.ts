/**
 * Core sound engine using Web Audio API
 */

import type { SoundEngine } from './types'
import { createAudioOutput } from './audioOutput'

/**
 * Sound types available in the engine
 */
export type GameSoundType =
  | 'silence'
  | 'fire'
  | 'thruster'
  | 'shield'
  | 'explosionBunker'
  | 'explosionShip'
  | 'explosionAlien'
  | 'bunker'
  | 'soft'
  | 'fuel'
  | 'crack'
  | 'fizz'
  | 'echo'

/**
 * Factory function for creating the sound engine
 */
export const createSoundEngine = (): SoundEngine => {
  // Initialize audio output (generators are created inside the worklet)
  const audioOutput = createAudioOutput()

  /**
   * Set the master volume
   * @param volume - Volume level between 0.0 (muted) and 1.0 (full volume)
   */
  const setVolume = (volume: number): void => {
    // Validate input
    if (typeof volume !== 'number' || isNaN(volume)) {
      console.error(
        `[SoundEngine] Invalid volume value: ${volume}. Volume must be a number between 0.0 and 1.0`
      )
      return
    }

    if (volume < 0 || volume > 1) {
      console.error(
        `[SoundEngine] Volume out of range: ${volume}. Volume must be between 0.0 and 1.0`
      )
    }

    audioOutput.setVolume(volume)
  }

  /**
   * Start audio playback
   */
  const start = async (): Promise<void> => {
    await audioOutput.start()
  }

  /**
   * Stop audio playback
   */
  const stop = (): void => {
    audioOutput.stop()
    audioOutput.clearSound()
  }

  /**
   * Play a sound
   * @param soundType - Name of the sound to play
   * @param onEnded - Optional callback when the sound ends (for discrete sounds)
   */
  const play = (soundType: GameSoundType, onEnded?: () => void): void => {
    // Send message to worklet to set generator with optional callback
    // The worklet will create and manage the generator
    audioOutput.setGenerator(soundType, 0, onEnded)
  }

  /**
   * Resume audio context if suspended
   */
  const resumeContext = async (): Promise<void> => {
    await audioOutput.resumeContext()
  }

  // Return public interface
  const engine: SoundEngine = {
    setVolume,
    start,
    stop,
    play,
    resumeContext
  }

  return engine
}
