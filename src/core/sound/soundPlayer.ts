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
const HIGH_PRIORITY_SOUNDS = new Set([SoundType.EXP2_SOUND])

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

    // Check if both fuel sound and shield are in the same frame
    const hasFuelSound = soundState.discrete.includes(SoundType.FUEL_SOUND)
    const hasShield = soundState.continuous.shielding

    // If fuel is being collected while shield is active,
    // play fuel at high priority (it will naturally interrupt shield)
    if (hasFuelSound && hasShield) {
      // Play fuel sound at high priority - this will interrupt shield
      // but NOT clear the continuous state, so shield will resume after
      soundService.playFuelCollect({ highPriority: true })

      // Play other discrete sounds (except fuel since we already played it)
      const otherDiscreteSounds = soundState.discrete.filter(s => s !== SoundType.FUEL_SOUND)
      for (const sound of otherDiscreteSounds) {
        const isHighPriority = HIGH_PRIORITY_SOUNDS.has(sound)

        // Map SoundType to the service methods
        switch (sound) {
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
      }

      // Still need to process continuous sound state updates so the service knows shield should be on
      // The high-priority fuel sound will block it from actually playing, but the state needs to be set

      // Thrust sound
      if (
        soundState.continuous.thrusting &&
        !soundState.lastContinuous.thrusting
      ) {
        // Start thrust (will be blocked by high-priority fuel)
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
        // Start shield (will be blocked by high-priority fuel, but sets the continuous state)
        soundService.playShipShield()
      } else if (
        !soundState.continuous.shielding &&
        soundState.lastContinuous.shielding
      ) {
        // Stop shield
        soundService.stopShield()
      }

      return
    }

    // Normal sound processing when fuel/shield conflict doesn't exist

    // Play discrete sounds - just pass them all to the service
    // The service will internally drop sounds if a high-priority sound is playing
    const discreteSounds = soundState.discrete

    for (const sound of discreteSounds) {
      const isHighPriority = HIGH_PRIORITY_SOUNDS.has(sound)

      // Map SoundType to the service methods
      switch (sound) {
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
