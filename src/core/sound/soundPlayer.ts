/**
 * Sound playback function for end-of-frame sound processing
 *
 * Takes accumulated sound state from Redux and plays all sounds
 * through the sound service at the end of each game loop frame
 */

import type { SoundUIState } from './soundSlice'
import { getSoundService } from './service'
import { SoundType } from './constants'

// Identify which sounds are high-priority and cannot be interrupted
const HIGH_PRIORITY_SOUNDS = new Set([
  SoundType.EXP2_SOUND,
  SoundType.FIZZ_SOUND,
  SoundType.ECHO_SOUND
])

// Priority order for discrete sounds when multiple accumulate in one frame
// Higher priority (earlier in list) wins
const DISCRETE_SOUND_PRIORITY: SoundType[] = [
  SoundType.ECHO_SOUND,
  SoundType.FIZZ_SOUND,
  SoundType.EXP2_SOUND,
  SoundType.EXP1_SOUND,
  SoundType.EXP3_SOUND,
  SoundType.FUEL_SOUND,
  SoundType.SHLD_SOUND,
  SoundType.FIRE_SOUND,
  SoundType.BUNK_SOUND,
  SoundType.SOFT_SOUND,
  SoundType.CRACK_SOUND
]

/**
 * Play all accumulated sounds for the current frame
 *
 * @param soundState - Current sound state from Redux
 */
export function playSounds(soundState: SoundUIState): void {
  // Don't play sounds if disabled
  if (!soundState.enabled) {
    return
  }

  try {
    const soundService = getSoundService()

    // When multiple discrete sounds accumulate in one frame, play only the highest priority
    let soundToPlay: SoundType | null = null
    if (soundState.discrete.length > 0) {
      // Find the highest priority sound in the accumulated list
      for (const prioritySound of DISCRETE_SOUND_PRIORITY) {
        if (soundState.discrete.includes(prioritySound)) {
          soundToPlay = prioritySound
          break
        }
      }
    }

    // Play the selected discrete sound (if any)
    if (soundToPlay !== null) {
      // Only certain sounds are high-priority (can't be interrupted by normal sounds)
      const isHighPriority: boolean = HIGH_PRIORITY_SOUNDS.has(soundToPlay)

      // Map SoundType to the service methods
      switch (soundToPlay) {
        case SoundType.FIRE_SOUND:
          soundService.playShipFire({ highPriority: isHighPriority })
          break
        case SoundType.EXP1_SOUND:
          soundService.playBunkerExplosion({ highPriority: isHighPriority })
          break
        case SoundType.EXP2_SOUND:
          soundService.playShipExplosion({ highPriority: isHighPriority })
          break
        case SoundType.EXP3_SOUND:
          soundService.playAlienExplosion({ highPriority: isHighPriority })
          break
        case SoundType.BUNK_SOUND:
          soundService.playBunkerShoot({ highPriority: isHighPriority })
          break
        case SoundType.SOFT_SOUND:
          soundService.playBunkerSoft({ highPriority: isHighPriority })
          break
        case SoundType.FUEL_SOUND:
          soundService.playFuelCollect({ highPriority: isHighPriority })
          break
        case SoundType.FIZZ_SOUND:
          soundService.playLevelTransition({ highPriority: isHighPriority })
          break
        case SoundType.CRACK_SOUND:
          soundService.playLevelComplete({ highPriority: isHighPriority })
          break
        case SoundType.ECHO_SOUND:
          soundService.playEcho({ highPriority: isHighPriority })
          break
        case SoundType.SHLD_SOUND:
          // When used as discrete (e.g., self-hit feedback)
          soundService.playShipShield({ highPriority: isHighPriority })
          break
      }
      // no handling a continuos sound if a discrete one is queued
      // it will get picked up in the next frame
      return
    }

    // Handle continuous sound transitions
    // These also just get sent - service will drop them if high-priority is playing

    // Thrust sound
    if (
      soundState.continuous.thrusting &&
      !soundState.lastContinuous.thrusting
    ) {
      // Start thrust
      soundService.playShipThrust()
    } else if (
      !soundState.continuous.thrusting &&
      soundState.lastContinuous.thrusting
    ) {
      // Stop thrust
      soundService.stopThrust()
    }

    // Shield sound
    if (
      soundState.continuous.shielding &&
      !soundState.lastContinuous.shielding
    ) {
      // Start shield
      soundService.playShipShield()
    } else if (
      !soundState.continuous.shielding &&
      soundState.lastContinuous.shielding
    ) {
      // Stop shield
      soundService.stopShield()
    }
  } catch (error) {
    // Silently fail if sound service is not initialized
    // This allows the game to run without sound
    console.debug('Sound service not initialized:', error)
  }
}
