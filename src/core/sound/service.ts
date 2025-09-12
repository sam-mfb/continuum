/**
 * @fileoverview Sound service with singleton pattern
 *
 * Provides a clean, synchronous API for playing game sounds.
 * Handles sound engine initialization and automatic sound cancellation.
 * Follows the same pattern as the sprites service.
 */

import { createSoundEngine } from './soundEngine'
import { SoundType } from './constants'
import type { SoundEngine } from './types'
import { store } from '@dev/store'

/**
 * Sound service interface
 * All methods are synchronous - async operations handled internally
 */
export type SoundService = {
  // Ship sounds
  playShipFire(): void
  playShipThrust(): void
  playShipShield(): void
  playShipExplosion(): void

  // Bunker sounds
  playBunkerShoot(): void
  playBunkerExplosion(): void
  playBunkerSoft(): void // Soft bunker collision

  // Pickup sounds
  playFuelCollect(): void

  // Level sounds
  playLevelComplete(): void // Crack sound
  playLevelTransition(): void // Fizz sound
  playEcho(): void // Echo sound for transitions

  // Alien sounds
  playAlienExplosion(): void

  // Direct generator access for all sounds
  playSound(generatorName: string): void

  // Test sounds
  playSilence(): void
  playSine440(): void
  playSine880(): void
  playSine220(): void
  playWhiteNoise(): void
  playMajorChord(): void
  playOctaves(): void

  // Control methods
  stopAll(): void
  setVolume(volume: number): void
  setMuted(muted: boolean): void

  // Status methods
  isPlaying(): boolean
  getCurrentSound(): SoundType | null

  // Engine access for test panel
  getEngine(): SoundEngine | null
}

// Internal state
let serviceInstance: SoundService | null = null
let soundEngine: SoundEngine | null = null
let currentSound: SoundType | null = null
let isPlaying = false
let isMuted = false
let currentVolume = 1.0

/**
 * Map SoundType enum to generator names
 * Note: 'silence' is from testSounds, all others from gameSounds
 */
const soundTypeToGenerator: Partial<Record<SoundType, string>> = {
  [SoundType.NO_SOUND]: 'silence',
  [SoundType.FIRE_SOUND]: 'fire',
  [SoundType.EXP1_SOUND]: 'explosionBunker',
  [SoundType.THRU_SOUND]: 'thruster',
  [SoundType.BUNK_SOUND]: 'bunkerNormal',
  [SoundType.SOFT_SOUND]: 'bunkerSoft',
  [SoundType.SHLD_SOUND]: 'shield',
  [SoundType.FUEL_SOUND]: 'fuel',
  [SoundType.EXP2_SOUND]: 'explosionShip',
  [SoundType.EXP3_SOUND]: 'explosionAlien',
  [SoundType.CRACK_SOUND]: 'crack',
  [SoundType.FIZZ_SOUND]: 'fizz',
  [SoundType.ECHO_SOUND]: 'echo'
}

/**
 * Internal helper to play a sound by generator name
 */
function playSoundByGenerator(generatorName: string): void {
  if (!soundEngine) return

  // Check if muted BEFORE doing anything
  if (isMuted) {
    console.log(`Sound muted, not playing: ${generatorName}`)
    return
  }

  console.log(`Playing sound generator: ${generatorName}`)

  // Start the engine first if not already playing
  if (!isPlaying) {
    soundEngine.start()
    isPlaying = true
  }

  // Then play the sound using the engine's playTestSound method
  const engineWithTestMethod = soundEngine as any
  if (engineWithTestMethod.playTestSound) {
    engineWithTestMethod.playTestSound(generatorName)
  } else {
    console.error('Engine does not have playTestSound method')
    return
  }

  // Clear current sound type since this is a direct generator call
  currentSound = null

  // Update Redux state for UI
  store.dispatch({
    type: 'sound/stopSound' // Clear the sound type display
  })
}

/**
 * Internal helper to play a sound by SoundType
 */
function playSound(soundType: SoundType): void {
  if (!soundEngine) return

  // Check if muted BEFORE doing anything
  if (isMuted) {
    console.log(`Sound muted, not playing: ${SoundType[soundType]}`)
    return
  }

  // Get the generator name for this sound type
  const generatorName = soundTypeToGenerator[soundType]
  if (!generatorName) {
    console.warn(`No generator for sound type: ${soundType}`)
    return
  }

  console.log(`Playing sound: ${SoundType[soundType]} -> ${generatorName}`)

  // Start the engine first if not already playing
  if (!isPlaying) {
    soundEngine.start()
    isPlaying = true
  }

  // Then play the sound using the engine's playTestSound method
  const engineWithTestMethod = soundEngine as any
  if (engineWithTestMethod.playTestSound) {
    engineWithTestMethod.playTestSound(generatorName)
  } else {
    console.error('Engine does not have playTestSound method')
    return
  }

  // Update current sound in Redux for UI
  store.dispatch({
    type: 'sound/startSound',
    payload: soundType
  })

  // Update our local tracking
  currentSound = soundType
}

/**
 * Stop all sounds
 */
function stopAllSounds(): void {
  if (!soundEngine || !isPlaying) return

  soundEngine.stop()
  isPlaying = false
  currentSound = null

  // Update Redux state
  store.dispatch({
    type: 'sound/stopSound'
  })
}

/**
 * Initialize the sound service
 * Should be called once at game start
 */
export async function initializeSoundService(): Promise<SoundService> {
  if (serviceInstance) {
    return serviceInstance
  }

  try {
    // Create and initialize the sound engine
    soundEngine = createSoundEngine()

    // Get initial settings from Redux
    const soundState = store.getState().sound
    currentVolume = soundState.volume ?? 1.0
    isMuted = !soundState.enabled

    // Apply initial volume
    if (soundEngine) {
      soundEngine.setVolume(currentVolume)
    }

    // Create the service instance
    serviceInstance = {
      // Ship sounds
      playShipFire: () => playSound(SoundType.FIRE_SOUND),
      playShipThrust: () => playSound(SoundType.THRU_SOUND),
      playShipShield: () => playSound(SoundType.SHLD_SOUND),
      playShipExplosion: () => playSound(SoundType.EXP2_SOUND),

      // Bunker sounds
      playBunkerShoot: () => playSound(SoundType.BUNK_SOUND),
      playBunkerExplosion: () => playSound(SoundType.EXP1_SOUND),
      playBunkerSoft: () => playSound(SoundType.SOFT_SOUND),

      // Pickup sounds
      playFuelCollect: () => playSound(SoundType.FUEL_SOUND),

      // Level sounds
      playLevelComplete: () => playSound(SoundType.CRACK_SOUND),
      playLevelTransition: () => playSound(SoundType.FIZZ_SOUND),
      playEcho: () => playSound(SoundType.ECHO_SOUND),

      // Alien sounds
      playAlienExplosion: () => playSound(SoundType.EXP3_SOUND),

      // Direct generator access
      playSound: (generatorName: string) => playSoundByGenerator(generatorName),

      // Test sounds
      playSilence: () => playSoundByGenerator('silence'),
      playSine440: () => playSoundByGenerator('sine440'),
      playSine880: () => playSoundByGenerator('sine880'),
      playSine220: () => playSoundByGenerator('sine220'),
      playWhiteNoise: () => playSoundByGenerator('whiteNoise'),
      playMajorChord: () => playSoundByGenerator('majorChord'),
      playOctaves: () => playSoundByGenerator('octaves'),

      // Control methods
      stopAll: () => stopAllSounds(),

      setVolume: (volume: number) => {
        currentVolume = Math.max(0, Math.min(1, volume))
        if (soundEngine) {
          soundEngine.setVolume(currentVolume)
        }
      },

      setMuted: (muted: boolean) => {
        isMuted = muted
        if (muted && isPlaying) {
          stopAllSounds()
        }
      },

      // Status methods
      isPlaying: () => isPlaying,
      getCurrentSound: () => currentSound,

      // Engine access for test panel
      getEngine: () => soundEngine
    }

    return serviceInstance
  } catch (error) {
    console.error('Failed to initialize sound service:', error)
    throw error
  }
}

/**
 * Get the sound service instance
 * Throws if not initialized
 */
export function getSoundService(): SoundService {
  if (!serviceInstance) {
    throw new Error(
      'Sound service not initialized. Call initializeSoundService() first.'
    )
  }
  return serviceInstance
}

/**
 * Clean up the sound service
 * Should be called when game is unmounted
 */
export function cleanupSoundService(): void {
  if (soundEngine) {
    if (isPlaying) {
      soundEngine.stop()
    }
    soundEngine = null
  }

  serviceInstance = null
  currentSound = null
  isPlaying = false
}
