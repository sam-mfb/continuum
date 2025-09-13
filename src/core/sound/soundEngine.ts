/**
 * Core sound engine using Web Audio API
 */

import type { SoundEngine } from './types'
import { createBufferManager } from './bufferManager'
import { createAudioOutput } from './audioOutput'
import type { SampleGenerator } from './sampleGenerator'
import { createSilenceGenerator } from './generators-asm/silenceGenerator'
import { createFireGenerator } from './generators-asm/fireGenerator'
import {
  createExplosionGenerator,
  ExplosionType
} from './generators-asm/explosionGenerator'
import { createThrusterGenerator } from './generators-asm/thrusterGenerator'
import { createShieldGenerator } from './generators-asm/shieldGenerator'
import { createBunkerGenerator } from './generators-asm/bunkerGenerator'
import { createSoftGenerator } from './generators-asm/softGenerator'
import { createFuelGenerator } from './generators-asm/fuelGenerator'
import { createCrackGenerator } from './generators-asm/crackGenerator'
import { createFizzGenerator } from './generators-asm/fizzGenerator'
import { createEchoGenerator } from './generators-asm/echoGenerator'

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

  // Initialize buffer manager with silence
  const bufferManager = createBufferManager(generators.silence)

  // Initialize audio output
  const audioOutput = createAudioOutput(bufferManager)

  // Keep track of current generator
  let currentGenerator: SampleGenerator & {
    start?: () => void
    stop?: () => void
  } = generators.silence
  let currentSoundType: GameSoundType = 'silence'

  /**
   * Get audio context from the audio output
   */
  const getAudioContext = (): AudioContext | null => {
    return audioOutput.getContext()
  }

  /**
   * Create a dummy gain node for compatibility
   */
  const createMasterGain = (): GainNode | null => {
    const ctx = getAudioContext()
    if (!ctx) return null
    const gain = ctx.createGain()
    gain.connect(ctx.destination)
    return gain
  }

  /**
   * Set the master volume
   * @param volume - Volume level from 0 to 1
   */
  const setVolume = (volume: number): void => {
    bufferManager.setVolume(volume)
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
    Object.values(generators).forEach(generator => {
      if (generator && typeof generator.reset === 'function') {
        generator.reset()
      }
    })

    // Reset to silence
    currentGenerator = generators.silence
    currentSoundType = 'silence'
    bufferManager.setGenerator(currentGenerator)
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
    // This ensures interrupted sounds start from the beginning next time
    if (currentGenerator && currentGenerator !== generator) {
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

    // Reset/restart the new generator
    if ('start' in generator && typeof generator.start === 'function') {
      generator.start()
    } else if ('reset' in generator && typeof generator.reset === 'function') {
      generator.reset()
    }

    currentGenerator = generator
    currentSoundType = soundType
    bufferManager.setGenerator(currentGenerator, onEnded)
  }

  /**
   * Get the current sound type
   */
  const getCurrentSoundType = (): GameSoundType => {
    return currentSoundType
  }

  /**
   * Resume audio context if suspended
   */
  const resumeContext = async (): Promise<void> => {
    await audioOutput.resumeContext()
  }

  // Return public interface
  const ctx = getAudioContext()
  const engine: SoundEngine = {
    audioContext: ctx || new AudioContext(),
    masterGain:
      createMasterGain() ||
      (ctx ? ctx.createGain() : new AudioContext().createGain()),
    setVolume,
    start,
    stop,
    play,
    getCurrentSoundType,
    isPlaying: audioOutput.isPlaying,
    resumeContext
  }

  return engine
}
