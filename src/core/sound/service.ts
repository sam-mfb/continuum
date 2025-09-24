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
  stopThrust(): void
  stopShield(): void
  setVolume(volume: number): void
  setMuted(muted: boolean): void

  // Status methods
  isPlaying(): boolean
  getCurrentSound(): SoundType | null
  getCurrentContinuous(): ContinuousSound

  // Engine access for test panel
  getEngine(): SoundEngine | null

  // Cleanup method
  cleanup(): void
}

// Track continuous sounds for resumption after interruption
export type ContinuousSound = 'thruster' | 'shield' | 'none'

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
  let currentContinuous: ContinuousSound = 'none'

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

      // Update continuous sound state
      if (soundType === 'thruster') {
        currentContinuous = 'thruster'
      } else if (soundType === 'shield') {
        currentContinuous = 'shield'
      } else if (soundType === 'silence') {
        currentContinuous = 'none'
      }

      // Start the engine first if not already playing
      if (!isPlaying) {
        soundEngine.start()
        isPlaying = true
      }

      // Determine if this is a discrete (interrupting) sound
      const isContinuous = soundType === 'thruster' || soundType === 'shield'
      const isDiscrete = !isContinuous && soundType !== 'silence'

      // Play the sound with appropriate callback
      if (isDiscrete) {
        // For discrete sounds, add callback to clear current sound and resume continuous
        soundEngine.play(soundType, () => {
          // Clear current sound when it completes
          currentSound = null
          currentSoundPriority = 0
          // After discrete sound completes, resume whatever continuous should be playing
          if (currentContinuous !== 'none' && soundEngine) {
            soundEngine.play(currentContinuous)
          }
        })
      } else {
        // Continuous sounds and silence don't need callbacks
        soundEngine.play(soundType)
      }
    }

    /**
     * Internal helper to play a sound by SoundType enum
     */
    function playSound(soundType: SoundType): void {
      const engineType = soundTypeToEngine[soundType]
      if (!engineType) {
        return
      }

      // Get the priority of the requested sound
      const requestedPriority = SOUND_PRIORITIES[soundType] || 0

      // Check if this is a discrete sound (not continuous)
      const isContinuous = soundType === SoundType.THRU_SOUND || soundType === SoundType.SHLD_SOUND

      // For discrete sounds, check priority
      if (!isContinuous && currentSound !== null && currentSoundPriority > 0) {
        // Only play if new sound has equal or higher priority
        if (requestedPriority < currentSoundPriority) {
          return // Don't play lower priority sounds
        }
      }

      // Play the sound
      playSoundByType(engineType)

      // Track current sound and priority for discrete sounds
      if (!isContinuous) {
        currentSound = soundType
        currentSoundPriority = requestedPriority
      }
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
      currentContinuous = 'none'
    }

    // Create the service instance
    const serviceInstance: SoundService = {
      // Ship sounds
      playShipFire: (): void => playSound(SoundType.FIRE_SOUND),
      playShipThrust: (): void => playSound(SoundType.THRU_SOUND),
      playShipShield: (): void => playSound(SoundType.SHLD_SOUND),
      playShipShieldDiscrete: (): void => {
        // Play shield sound but for a very short duration (30ms)
        // Used for auto-triggered shield (like self-hit feedback)
        if (!soundEngine) return

        // Check priority like a normal discrete sound
        const requestedPriority = SOUND_PRIORITIES[SoundType.SHLD_SOUND] || 0
        if (currentSound !== null && currentSoundPriority > 0) {
          if (requestedPriority < currentSoundPriority) {
            return // Don't play lower priority sounds
          }
        }

        // Save the current continuous state
        const savedContinuous = currentContinuous

        // Play shield as a "continuous" sound
        playSoundByType('shield')

        // Track as current sound
        currentSound = SoundType.SHLD_SOUND
        currentSoundPriority = requestedPriority

        // Stop it after 30ms and restore previous continuous state
        setTimeout(() => {
          if (soundEngine) {
            // Clear current sound
            currentSound = null
            currentSoundPriority = 0

            // Restore the previous continuous state
            currentContinuous = savedContinuous
            if (savedContinuous !== 'none') {
              // Resume the previous continuous sound
              soundEngine.play(savedContinuous)
            } else {
              // Stop playing
              soundEngine.play('silence')
            }
          }
        }, 30)
      },
      playShipExplosion: (): void => playSound(SoundType.EXP2_SOUND),

      // Bunker sounds
      playBunkerShoot: (): void => playSound(SoundType.BUNK_SOUND),
      playBunkerExplosion: (): void => playSound(SoundType.EXP1_SOUND),
      playBunkerSoft: (): void => playSound(SoundType.SOFT_SOUND),

      // Pickup sounds
      playFuelCollect: (): void => playSound(SoundType.FUEL_SOUND),

      // Level sounds
      playLevelComplete: (): void => playSound(SoundType.CRACK_SOUND),
      playLevelTransition: (): void => playSound(SoundType.FIZZ_SOUND),
      playEcho: (): void => playSound(SoundType.ECHO_SOUND),

      // Alien sounds
      playAlienExplosion: (): void => playSound(SoundType.EXP3_SOUND),

      // Control methods
      stopAll: (): void => stopAllSounds(),

      stopThrust: (): void => {
        if (currentContinuous === 'thruster') {
          currentContinuous = 'none'
          // Only stop if no discrete sound is playing
          if (currentSoundPriority === 0) {
            playSoundByType('silence')
          }
        }
      },

      stopShield: (): void => {
        if (currentContinuous === 'shield') {
          currentContinuous = 'none'
          // Only stop if no discrete sound is playing
          if (currentSoundPriority === 0) {
            playSoundByType('silence')
          }
        }
      },

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
      getCurrentContinuous: (): ContinuousSound => currentContinuous,

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
        currentContinuous = 'none'
      }
    }

    return serviceInstance
  } catch (error) {
    console.error('Failed to create sound service:', error)
    throw error
  }
}
