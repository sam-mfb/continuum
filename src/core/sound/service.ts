/**
 * @fileoverview Sound service with singleton pattern
 *
 * Provides a clean, synchronous API for playing game sounds.
 * Handles sound engine initialization and high-priority sound blocking.
 */

import { createSoundEngine, type GameSoundType } from './soundEngine'
import { SoundType } from './constants'
import type { SoundEngine } from './types'

/**
 * Sound service interface
 * All methods are synchronous - async operations handled internally
 */
export type SoundService = {
  // Ship sounds
  playShipFire(options?: { highPriority?: boolean }): void
  playShipThrust(options?: { highPriority?: boolean }): void
  playShipShield(options?: { highPriority?: boolean }): void
  playShipExplosion(options?: { highPriority?: boolean }): void

  // Bunker sounds
  playBunkerShoot(options?: { highPriority?: boolean }): void
  playBunkerExplosion(options?: { highPriority?: boolean }): void
  playBunkerSoft(options?: { highPriority?: boolean }): void

  // Pickup sounds
  playFuelCollect(options?: { highPriority?: boolean }): void

  // Level sounds
  playLevelComplete(options?: { highPriority?: boolean }): void // Crack sound
  playLevelTransition(options?: { highPriority?: boolean }): void // Fizz sound
  playEcho(options?: { highPriority?: boolean }): void

  // Alien sounds
  playAlienExplosion(options?: { highPriority?: boolean }): void

  // Direct generator access for all sounds
  playSound(
    soundType: GameSoundType,
    options?: { highPriority?: boolean }
  ): void

  // Control methods
  stopAll(): void
  setVolume(volume: number): void
  setMuted(muted: boolean): void

  // Status methods
  isPlaying(): boolean
  getCurrentSound(): SoundType | null
  isHighPriorityPlaying(): boolean

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
let highPriorityPlaying = false

/**
 * Map SoundType enum to engine sound types
 */
const soundTypeToEngine: Partial<Record<SoundType, GameSoundType>> = {
  [SoundType.NO_SOUND]: 'silence',
  [SoundType.FIRE_SOUND]: 'fire',
  [SoundType.EXP1_SOUND]: 'explosionBunker',
  [SoundType.THRU_SOUND]: 'thruster',
  [SoundType.BUNK_SOUND]: 'bunker',
  [SoundType.SOFT_SOUND]: 'soft',
  [SoundType.SHLD_SOUND]: 'shield',
  [SoundType.FUEL_SOUND]: 'fuel',
  [SoundType.EXP2_SOUND]: 'explosionShip',
  [SoundType.EXP3_SOUND]: 'explosionAlien',
  [SoundType.CRACK_SOUND]: 'crack',
  [SoundType.FIZZ_SOUND]: 'fizz',
  [SoundType.ECHO_SOUND]: 'echo'
}

/**
 * Resume audio context on user interaction
 */
async function resumeAudioContext(): Promise<void> {
  if (soundEngine?.resumeContext) {
    await soundEngine.resumeContext()
  }
}

/**
 * Internal helper to play a sound by engine type
 */
function playSoundByType(
  soundType: GameSoundType,
  options?: { highPriority?: boolean }
): void {
  if (!soundEngine || !soundEngine.play) return

  // Try to resume audio context on any play attempt (in case it's suspended)
  resumeAudioContext()

  // Check if muted
  if (isMuted) {
    console.log(`Sound muted, not playing: ${soundType}`)
    return
  }

  // Check if high-priority sound is blocking
  // High-priority sounds block ALL other sounds (including other high-priority)
  // Exception: 'silence' is always allowed (used to stop sounds)
  if (highPriorityPlaying && soundType !== 'silence') {
    console.log(
      `[BLOCKED] High-priority sound is active, blocking: ${soundType}`
    )
    return
  }

  // If playing silence, clear the high-priority flag since we're stopping whatever was playing
  if (soundType === 'silence' && highPriorityPlaying) {
    highPriorityPlaying = false
    console.log('[HP STATE] Playing silence, clearing highPriorityPlaying flag')
  }

  console.log(
    `[PLAYING] ${soundType}${options?.highPriority ? ' (HIGH PRIORITY)' : ''} | HP Active: ${highPriorityPlaying}`
  )

  // Start the engine first if not already playing
  if (!isPlaying) {
    soundEngine.start()
    isPlaying = true
  }

  // Play the sound with appropriate callback
  if (options?.highPriority) {
    highPriorityPlaying = true
    console.log(`[HP STATE] Setting highPriorityPlaying = true`)
    soundEngine.play(soundType, () => {
      highPriorityPlaying = false
      console.log(
        '[HP STATE] High-priority sound completed, setting highPriorityPlaying = false'
      )
    })
  } else {
    soundEngine.play(soundType)
  }
}

/**
 * Internal helper to play a sound by SoundType enum
 */
function playSound(
  soundType: SoundType,
  options?: { highPriority?: boolean }
): void {
  const engineType = soundTypeToEngine[soundType]
  if (!engineType) {
    console.warn(`No engine mapping for sound type: ${SoundType[soundType]}`)
    return
  }

  playSoundByType(engineType, options)

  // Track current sound
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
  highPriorityPlaying = false
}

/**
 * Initialize the sound service
 * Should be called once at game start
 * @param initialSettings - Optional initial volume and mute settings
 */
export async function initializeSoundService(initialSettings?: {
  volume?: number
  enabled?: boolean
}): Promise<SoundService> {
  if (serviceInstance) {
    return serviceInstance
  }

  try {
    // Create and initialize the sound engine
    soundEngine = createSoundEngine()

    // Apply initial settings (defaults if not provided)
    currentVolume = initialSettings?.volume ?? 1.0
    isMuted = !(initialSettings?.enabled ?? true)

    // Apply initial volume
    if (soundEngine) {
      soundEngine.setVolume(currentVolume)
    }

    // Create the service instance
    serviceInstance = {
      // Ship sounds
      playShipFire: (options?): void =>
        playSound(SoundType.FIRE_SOUND, options),
      playShipThrust: (options?): void =>
        playSound(SoundType.THRU_SOUND, options),
      playShipShield: (options?): void =>
        playSound(SoundType.SHLD_SOUND, options),
      playShipExplosion: (options?): void =>
        playSound(SoundType.EXP2_SOUND, options),

      // Bunker sounds
      playBunkerShoot: (options?): void =>
        playSound(SoundType.BUNK_SOUND, options),
      playBunkerExplosion: (options?): void =>
        playSound(SoundType.EXP1_SOUND, options),
      playBunkerSoft: (options?): void =>
        playSound(SoundType.SOFT_SOUND, options),

      // Pickup sounds
      playFuelCollect: (options?): void =>
        playSound(SoundType.FUEL_SOUND, options),

      // Level sounds
      playLevelComplete: (options?): void =>
        playSound(SoundType.CRACK_SOUND, options),
      playLevelTransition: (options?): void =>
        playSound(SoundType.FIZZ_SOUND, options),
      playEcho: (options?): void => playSound(SoundType.ECHO_SOUND, options),

      // Alien sounds
      playAlienExplosion: (options?): void =>
        playSound(SoundType.EXP3_SOUND, options),

      // Direct engine access
      playSound: (soundType: GameSoundType, options?): void =>
        playSoundByType(soundType, options),

      // Control methods
      stopAll: (): void => stopAllSounds(),

      setVolume: (volume: number): void => {
        currentVolume = Math.max(0, Math.min(1, volume))
        if (soundEngine) {
          soundEngine.setVolume(currentVolume)
        }
      },

      setMuted: (muted: boolean): void => {
        isMuted = muted
        if (muted && isPlaying) {
          stopAllSounds()
        }
      },

      // Status methods
      isPlaying: (): boolean => isPlaying,
      getCurrentSound: (): SoundType | null => currentSound,
      isHighPriorityPlaying: (): boolean => highPriorityPlaying,

      // Engine access for test panel
      getEngine: (): SoundEngine | null => soundEngine
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
  highPriorityPlaying = false
}
