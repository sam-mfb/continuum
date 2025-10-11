/**
 * @fileoverview Modern multi-channel sound service implementation
 *
 * Provides the same synchronous API as the original sound service,
 * but internally uses a multi-channel mixer for simultaneous sounds.
 *
 * Key improvements over single-channel service:
 * - Up to 8 simultaneous sounds (all SFX in Phase 2)
 * - Priority-based channel allocation
 * - Multiple bunker shots, explosions can play at same time
 * - Backward compatible API (implements exact same SoundService interface)
 *
 * Traced from: orig/Sources/Sound.c (adapted for multi-channel)
 */

import { createAudioOutput, type AudioOutput } from './audioOutput'
import { createMixer } from './mixer'
import type { SoundService } from '@/core/sound/types'
import {
  SoundType,
  type SampleGenerator,
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

// Vertical blanking interval for screen interrupts on original Mac
const VERT_BLANK_PER_SEC = 60

/**
 * Create a generator for a given sound type
 */
function createGeneratorForSound(soundType: SoundType): SampleGenerator {
  switch (soundType) {
    case SoundType.FIRE_SOUND:
      return createFireGenerator()
    case SoundType.EXP1_SOUND:
      return createExplosionGenerator(ExplosionType.BUNKER)
    case SoundType.THRU_SOUND:
      return createThrusterGenerator()
    case SoundType.BUNK_SOUND:
      return createBunkerGenerator()
    case SoundType.SOFT_SOUND:
      return createSoftGenerator()
    case SoundType.SHLD_SOUND:
      return createShieldGenerator()
    case SoundType.FUEL_SOUND:
      return createFuelGenerator()
    case SoundType.EXP2_SOUND:
      return createExplosionGenerator(ExplosionType.SHIP)
    case SoundType.EXP3_SOUND:
      return createExplosionGenerator(ExplosionType.ALIEN)
    case SoundType.CRACK_SOUND:
      return createCrackGenerator()
    case SoundType.FIZZ_SOUND:
      return createFizzGenerator()
    case SoundType.ECHO_SOUND:
      return createEchoGenerator()
    default:
      throw new Error(`Unknown sound type: ${soundType}`)
  }
}

/**
 * Create a new modern sound service instance with multi-channel mixing
 * @param initialSettings - Optional initial volume and mute settings
 */
export async function createModernSoundService(initialSettings: {
  volume: number
  muted: boolean
}): Promise<SoundService> {
  // Create mixer for channel management
  const mixer = createMixer()

  // Internal state for this instance
  let audioOutput: AudioOutput
  let isEngineRunning = false
  let isMuted = initialSettings.muted
  let currentVolume = initialSettings.volume
  let decayIntervalId: NodeJS.Timeout | null = null

  try {
    // Create and initialize the audio output
    audioOutput = createAudioOutput()

    // Apply initial volume
    audioOutput.setVolume(currentVolume)

    // Handle sound ended events from worklet
    audioOutput.onSoundEnded((channelId, _soundType) => {
      // Notify mixer that this channel has ended
      mixer.markChannelEnded(channelId)
    })

    // Handle underrun events for debugging
    audioOutput.onUnderrun((channelId, available, needed) => {
      console.warn(
        `[ModernSoundService] Underrun on channel ${channelId}: ${available}/${needed} samples`
      )
    })

    /**
     * Internal helper to play a sound
     * @returns true if sound was played, false if blocked/dropped
     */
    function playSound(soundType: SoundType): boolean {
      // Ensure the decay timer is running when sounds are being played
      ensureDecayTimer()

      // Check if muted
      if (isMuted) {
        return false
      }

      // Start the engine if not already running
      if (!isEngineRunning) {
        // Lazy start on first sound
        audioOutput
          .start()
          .then(() => {
            audioOutput.setVolume(currentVolume)
            isEngineRunning = true
          })
          .catch(err => {
            console.error(
              '[ModernSoundService] Failed to start audio engine:',
              err
            )
          })
        return false // Don't play this time, will work next time
      }

      // Create generator for this sound
      const generator = createGeneratorForSound(soundType)

      // Try to allocate a channel from the mixer
      const request = mixer.allocateChannel(soundType, generator)

      if (!request) {
        // No channel available (all busy with higher priority sounds)
        return false
      }

      // Send PLAY message to worklet
      audioOutput.playOnChannel({
        channelId: request.channelId,
        soundType: request.soundType,
        priority: request.priority
      })

      return true
    }

    /**
     * Decay all channel priorities
     * Matches the VBL-based priority decay from Sound.c do_*_sound() functions
     */
    function decayPriorities(): void {
      mixer.updatePriorities()
    }

    /**
     * Ensure the decay timer is running
     * Starts a 60Hz timer if not already running (matches VBL timing from Sound.c:92-104)
     */
    function ensureDecayTimer(): void {
      if (decayIntervalId === null) {
        // VBL on classic Macs runs at 60.15Hz ≈ 16.67ms per tick
        decayIntervalId = setInterval(() => {
          decayPriorities()
        }, 1000 / VERT_BLANK_PER_SEC) // ~16.67ms
      }
    }

    // Create the service instance
    const serviceInstance: SoundService = {
      // Engine lifecycle
      startEngine: async (): Promise<void> => {
        // Don't start if muted (audio will start when unmuted)
        if (isMuted) {
          return
        }

        // Resume context if suspended (user gesture requirement)
        await audioOutput.resumeContext()

        // Start the engine if not already running
        if (!isEngineRunning) {
          await audioOutput.start()
          audioOutput.setVolume(currentVolume)
          isEngineRunning = true
        }
      },

      // Ship sounds
      playShipFire: (): void => {
        playSound(SoundType.FIRE_SOUND)
      },

      playShipThrust: (): void => {
        playSound(SoundType.THRU_SOUND)
      },

      stopShipThrust: (): void => {
        // Stop the sound if it's playing
        const stopRequest = mixer.stopSound(SoundType.THRU_SOUND)
        if (stopRequest) {
          audioOutput.stopSound({ soundType: SoundType.THRU_SOUND })
        }
      },

      playShipShield: (): void => {
        playSound(SoundType.SHLD_SOUND)
      },

      stopShipShield: (): void => {
        // Stop the sound if it's playing
        const stopRequest = mixer.stopSound(SoundType.SHLD_SOUND)
        if (stopRequest) {
          audioOutput.stopSound({ soundType: SoundType.SHLD_SOUND })
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
      clearSound: (): void => {
        // Clear all channels
        audioOutput.clearAllSounds()
        mixer.clearAll()
      },

      setVolume: (volume: number): void => {
        currentVolume = volume
        audioOutput.setVolume(volume)
      },

      setMuted: (muted: boolean): void => {
        isMuted = muted
        if (muted && isEngineRunning) {
          // Stop all sounds when muting
          audioOutput.stop()
          isEngineRunning = false
          mixer.clearAll()
        } else if (!muted) {
          // When unmuting, clear state so new sounds can play
          mixer.clearAll()
        }
      },

      // Cleanup method - stops sounds and timer but keeps audio output alive for reuse
      cleanup: (): void => {
        // Clear the decay timer
        if (decayIntervalId) {
          clearInterval(decayIntervalId)
          decayIntervalId = null
        }

        if (isEngineRunning) {
          audioOutput.stop()
        }

        // Clear all channels
        mixer.clearAll()

        // Don't null out audioOutput - keep it alive for next game
        isEngineRunning = false
      }
    }

    return serviceInstance
  } catch (error) {
    console.error('[ModernSoundService] Failed to create sound service:', error)
    throw error
  }
}
