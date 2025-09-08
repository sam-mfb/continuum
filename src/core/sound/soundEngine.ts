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
import { createFireGenerator as createFireGeneratorAsm } from './generators-asm/fireGenerator'
import { createExplosionGenerator as createExplosionGeneratorAsm, ExplosionType } from './generators-asm/explosionGenerator'
import { createThrusterGenerator as createThrusterGeneratorAsm } from './generators-asm/thrusterGenerator'
import { createShieldGenerator as createShieldGeneratorAsm } from './generators-asm/shieldGenerator'
import { createBunkerGenerator as createBunkerGeneratorAsm } from './generators-asm/bunkerGenerator'
import { createFuelGenerator as createFuelGeneratorAsm } from './generators-asm/fuelGenerator'
import { createCrackGenerator as createCrackGeneratorAsm } from './generators-asm/crackGenerator'
import { createFizzGenerator as createFizzGeneratorAsm } from './generators-asm/fizzGenerator'
import { createEchoGenerator as createEchoGeneratorAsm } from './generators-asm/echoGenerator'

/**
 * Factory function for creating the sound engine
 * Phase 6: Integrated with new audio pipeline
 */
export const createSoundEngine = (): SoundEngine => {
  // Initialize both test and game sound generators
  const testSounds = createTestSounds()
  const gameSounds = createGameSounds()

  // Add assembly implementations for testing
  const asmGenerators = {
    fireAsm: createFireGeneratorAsm(),
    thrusterAsm: createThrusterGeneratorAsm(),
    shieldAsm: createShieldGeneratorAsm(),
    explosionBunkerAsm: createExplosionGeneratorAsm(ExplosionType.BUNKER),
    explosionShipAsm: createExplosionGeneratorAsm(ExplosionType.SHIP),
    explosionAlienAsm: createExplosionGeneratorAsm(ExplosionType.ALIEN),
    bunkerAsm: createBunkerGeneratorAsm(),
    fuelAsm: createFuelGeneratorAsm(),
    crackAsm: createCrackGeneratorAsm(),
    fizzAsm: createFizzGeneratorAsm(),
    echoAsm: createEchoGeneratorAsm()
  }

  // Combine all generators for easy access
  const allGenerators = { ...testSounds, ...gameSounds, ...asmGenerators }

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
  const playTestSound = (
    soundType: keyof typeof allGenerators | 'fizzEcho'
  ): void => {
    if (soundType === 'fizzEcho') {
      // Special case: play fizz sound followed by echo
      playFizzEchoSequence()
    } else {
      const generator = allGenerators[soundType]
      
      // Reset/restart the generator if it has a start or reset method
      if (generator) {
        if ('start' in generator && typeof generator.start === 'function') {
          generator.start()
        } else if ('reset' in generator && typeof generator.reset === 'function') {
          generator.reset()
        }
      }
      
      currentGenerator = generator
      bufferManager.setGenerator(currentGenerator)
    }
  }

  /**
   * Play fizz sound followed by echo sound (like planet completion)
   */
  const playFizzEchoSequence = (): void => {
    // Start with fizz sound
    const fizzGen = allGenerators.fizz
    if (fizzGen && 'start' in fizzGen && typeof fizzGen.start === 'function') {
      fizzGen.start()
    }
    currentGenerator = fizzGen
    bufferManager.setGenerator(currentGenerator)

    // Set up a timer to switch to echo when fizz completes
    // Fizz lasts 80 cycles, at ~16.67ms per cycle = ~1333ms
    const fizzDuration = 80 * 16.67
    setTimeout(() => {
      const echoGen = allGenerators.echo
      if (
        echoGen &&
        'start' in echoGen &&
        typeof echoGen.start === 'function'
      ) {
        echoGen.start()
      }
      currentGenerator = echoGen
      bufferManager.setGenerator(currentGenerator)
    }, fizzDuration)
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
  const getStats = (): {
    underruns: number
    totalCallbacks: number
    averageLatency: number
    bufferState: {
      writePosition: number
      readPosition: number
      available: number
    }
  } => {
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
