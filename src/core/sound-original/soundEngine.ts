/**
 * Core sound engine using Web Audio API
 */

import type { SoundEngine } from './types'
import { createAudioOutput } from './audioOutput'
import type { SampleGenerator } from '@/core/sound-shared'
import {
  createSilenceGenerator,
  createFireGenerator,
  createExplosionGenerator,
  ExplosionType,
  createThrusterGenerator,
  createShieldGenerator,
  createBunkerGenerator,
  createSoftGenerator,
  createFuelGenerator,
  createCrackGenerator,
  createFizzGenerator,
  createEchoGenerator
} from '@/core/sound-shared'

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
  // Initialize all generators
  const generators: Record<
    GameSoundType,
    SampleGenerator & { start?: () => void; stop?: () => void }
  > = {
    silence: createSilenceGenerator(),
    fire: createFireGenerator(),
    thruster: createThrusterGenerator(),
    shield: createShieldGenerator(),
    explosionBunker: createExplosionGenerator(ExplosionType.BUNKER),
    explosionShip: createExplosionGenerator(ExplosionType.SHIP),
    explosionAlien: createExplosionGenerator(ExplosionType.ALIEN),
    bunker: createBunkerGenerator(),
    soft: createSoftGenerator(),
    fuel: createFuelGenerator(),
    crack: createCrackGenerator(),
    fizz: createFizzGenerator(),
    echo: createEchoGenerator()
  }

  // Initialize audio output (buffer manager is now inside the worklet)
  const audioOutput = createAudioOutput()

  // Keep track of current generator
  let currentGenerator: SampleGenerator & {
    start?: () => void
    stop?: () => void
  } = generators.silence

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
   * Stop audio playback and reset all generators
   */
  const stop = (): void => {
    audioOutput.stop()

    // Reset all generators to their initial state
    Object.values(generators).forEach(generator => {
      if (generator && typeof generator.reset === 'function') {
        generator.reset()
      }
    })

    // Reset to silence
    currentGenerator = generators.silence
    audioOutput.clearSound()
  }

  /**
   * Play a sound
   * @param soundType - Name of the sound to play
   * @param onEnded - Optional callback when the sound ends (for discrete sounds)
   */
  const play = (soundType: GameSoundType, onEnded?: () => void): void => {
    const generator = generators[soundType]

    if (!generator) {
      console.warn(`Unknown sound type: ${soundType}`)
      return
    }

    // Reset the previous generator when switching to a new sound
    // OR when restarting the same sound (for priority-based interruption)
    if (currentGenerator) {
      if (
        'stop' in currentGenerator &&
        typeof currentGenerator.stop === 'function'
      ) {
        currentGenerator.stop()
      } else if (
        'reset' in currentGenerator &&
        typeof currentGenerator.reset === 'function'
      ) {
        currentGenerator.reset()
      }
    }

    // Reset/restart the generator
    if ('start' in generator && typeof generator.start === 'function') {
      generator.start()
    } else if ('reset' in generator && typeof generator.reset === 'function') {
      generator.reset()
    }

    currentGenerator = generator

    // Send message to worklet to set generator with optional callback
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
