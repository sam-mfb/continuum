/**
 * @fileoverview Sound service with singleton pattern
 *
 * Provides a clean, synchronous API for playing game sounds.
 * Handles sound engine initialization and high-priority sound blocking.
 */

import { createSoundEngine, type GameSoundType } from './soundEngine'
import { SoundType, SOUND_PRIORITIES } from './constants'
import type { SoundEngine } from './types'

/**
 * Sound service interface
 * All methods are synchronous - async operations handled internally
 */
export type SoundService = {
  // Ship sounds
  playShipFire(): void
  playShipThrust(): void
  playShipShield(): void
  playShipShieldDiscrete(): void // Short discrete version for auto-trigger
  playShipExplosion(): void

  // Bunker sounds
  playBunkerShoot(): void
  playBunkerExplosion(): void
  playBunkerSoft(): void

  // Pickup sounds
  playFuelCollect(): void

  // Level sounds
  playLevelComplete(): void // Crack sound
  playLevelTransition(): void // Fizz sound
  playEcho(): void

  // Alien sounds
  playAlienExplosion(): void

  // Control methods
  stopAll(): void
  clearSound(): void // Matches original game's clear_sound()
  setVolume(volume: number): void
  setMuted(muted: boolean): void

  // Status methods
  isPlaying(): boolean
  getCurrentSound(): SoundType | null

  // Engine access for test panel
  getEngine(): SoundEngine | null

  // Cleanup method
  cleanup(): void
}


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
 * Create a new sound service instance
 * @param initialSettings - Optional initial volume and mute settings
 */
export async function createSoundService(initialSettings: {
  volume: number
  muted: boolean
}): Promise<SoundService> {
  // Internal state for this instance
  let soundEngine: SoundEngine | null = null
  let currentSound: SoundType | null = null
  let currentSoundPriority = 0
  let isPlaying = false
  let isMuted = false
  let currentVolume = 1.0

  try {
    // Create and initialize the sound engine
    soundEngine = createSoundEngine()

    // Apply initial settings (defaults if not provided)
    currentVolume = initialSettings.volume
    isMuted = initialSettings.muted

    // Apply initial volume
    if (soundEngine) {
      soundEngine.setVolume(currentVolume)
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
    function playSoundByType(soundType: GameSoundType): void {
      if (!soundEngine) return

      // Try to resume audio context on any play attempt (in case it's suspended)
      resumeAudioContext()

      // Check if muted
      if (isMuted) {
        return
      }

      // Start the engine first if not already playing
      if (!isPlaying) {
        soundEngine.start()
        isPlaying = true
      }

      // Determine if this sound needs a callback to clear state when it ends
      // Continuous sounds (thrust/shield) and silence don't need callbacks
      const needsCallback = soundType !== 'thruster' &&
                           soundType !== 'shield' &&
                           soundType !== 'silence'

      if (needsCallback) {
        // Add callback to clear state when sound ends (like original's clear_sound())
        soundEngine.play(soundType, () => {
          currentSound = null
          currentSoundPriority = 0
        })
      } else {
        // Continuous sounds and silence play without callbacks
        soundEngine.play(soundType)
      }
    }

    /**
     * Internal helper to play a sound by SoundType enum
     * @returns true if sound was played, false if blocked by priority
     */
    function playSound(soundType: SoundType): boolean {
      const engineType = soundTypeToEngine[soundType]
      if (!engineType) {
        return false
      }

      // Get the priority of the requested sound
      const requestedPriority = SOUND_PRIORITIES[soundType] || 0

      // Check priority for ALL sounds uniformly
      if (currentSound !== null && currentSoundPriority > 0) {
        // Only play if new sound has higher priority (matches original's > check)
        if (requestedPriority <= currentSoundPriority) {
          return false // Don't play lower or equal priority sounds
        }
      }

      // Play the sound
      playSoundByType(engineType)

      // Track current sound and priority for ALL sounds
      currentSound = soundType
      currentSoundPriority = requestedPriority
      return true // Sound played successfully
    }

    /**
     * Stop all sounds
     */
    function stopAllSounds(): void {
      if (!soundEngine || !isPlaying) return

      soundEngine.stop()
      isPlaying = false
      currentSound = null
      currentSoundPriority = 0
    }

    /**
     * Clear the current sound (matches original game's clear_sound())
     */
    function clearCurrentSound(): void {
      if (!soundEngine) return

      // Play silence to stop current sound
      playSoundByType('silence')

      // Reset state
      currentSound = null
      currentSoundPriority = 0
    }

    // Create the service instance
    const serviceInstance: SoundService = {
      // Ship sounds
      playShipFire: (): void => {
        playSound(SoundType.FIRE_SOUND)
      },
      playShipThrust: (): void => {
        playSound(SoundType.THRU_SOUND)
      },
      playShipShield: (): void => {
        playSound(SoundType.SHLD_SOUND)
      },
      playShipShieldDiscrete: (): void => {
        // Play shield sound but for a very short duration (30ms)
        // Used for auto-triggered shield (like self-hit feedback)
        if (playSound(SoundType.SHLD_SOUND)) {
          // Only set timeout if sound actually played
          setTimeout(() => {
            // Only clear if shield is still the current sound
            if (currentSound === SoundType.SHLD_SOUND) {
              clearCurrentSound()
            }
          }, 30)
        }
      },
      playShipExplosion: (): void => {
        playSound(SoundType.EXP2_SOUND)
      },

      // Bunker sounds
      playBunkerShoot: (): void => {
        playSound(SoundType.BUNK_SOUND)
      },
      playBunkerExplosion: (): void => {
        playSound(SoundType.EXP1_SOUND)
      },
      playBunkerSoft: (): void => {
        playSound(SoundType.SOFT_SOUND)
      },

      // Pickup sounds
      playFuelCollect: (): void => {
        playSound(SoundType.FUEL_SOUND)
      },

      // Level sounds
      playLevelComplete: (): void => {
        playSound(SoundType.CRACK_SOUND)
      },
      playLevelTransition: (): void => {
        playSound(SoundType.FIZZ_SOUND)
      },
      playEcho: (): void => {
        playSound(SoundType.ECHO_SOUND)
      },

      // Alien sounds
      playAlienExplosion: (): void => {
        playSound(SoundType.EXP3_SOUND)
      },

      // Control methods
      stopAll: (): void => stopAllSounds(),
      clearSound: (): void => clearCurrentSound(),

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

      // Engine access for test panel
      getEngine: (): SoundEngine | null => soundEngine,

      // Cleanup method - stops sounds but keeps engine alive for reuse
      cleanup: (): void => {
        if (soundEngine && isPlaying) {
          soundEngine.stop()
        }
        // Don't null out soundEngine - keep it alive for next game
        currentSound = null
        currentSoundPriority = 0
        isPlaying = false
      }
    }

    return serviceInstance
  } catch (error) {
    console.error('Failed to create sound service:', error)
    throw error
  }
}
