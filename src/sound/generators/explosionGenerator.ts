/**
 * Explosion Sound Generator
 *
 * Recreates the three explosion sounds from the original Continuum game.
 * Based on do_expl_sound() in Sound.c:153-177
 *
 * The original implementation:
 * - Uses a pre-generated table of 128 random period values (expl_rands)
 * - Each value is between 50-255 (EXPL_LO_PER to EXPL_LO_PER + EXPL_ADD_PER)
 * - Picks a random starting position in the table
 * - Generates pulses with random periods, creating an explosion effect
 * - Amplitude increases over time until it reaches 127 (fading out)
 *
 * Three explosion types:
 * - EXP1 (Bunker): amp=16, ampchange=2, priority=90
 * - EXP2 (Ship): amp=1, ampchange=1, priority=100 (highest)
 * - EXP3 (Alien): amp=64, ampchange=3, priority=50
 */

import type { SampleGenerator } from '../sampleGenerator'

// Constants from original GW.h
const EXPL_LO_PER = 50 // Minimum period value
const EXPL_ADD_PER = 206 // Range of random values
const CHUNK_SIZE = 370 // Samples per chunk (matches original)

// Explosion types with their initial parameters
export enum ExplosionType {
  BUNKER = 'bunker', // EXP1_SOUND
  SHIP = 'ship', // EXP2_SOUND
  ALIEN = 'alien' // EXP3_SOUND
}

type ExplosionParams = {
  initialAmp: number
  ampChange: number
  priority: number
}

const EXPLOSION_PARAMS: Record<ExplosionType, ExplosionParams> = {
  [ExplosionType.BUNKER]: { initialAmp: 16, ampChange: 2, priority: 90 },
  [ExplosionType.SHIP]: { initialAmp: 1, ampChange: 1, priority: 100 },
  [ExplosionType.ALIEN]: { initialAmp: 64, ampChange: 3, priority: 50 }
}

// Generate random table like the original init_sound()
const generateRandomTable = (): Uint8Array => {
  const table = new Uint8Array(128)
  for (let i = 0; i < 128; i++) {
    // Random value between EXPL_LO_PER and EXPL_LO_PER + EXPL_ADD_PER - 1
    table[i] = EXPL_LO_PER + Math.floor(Math.random() * EXPL_ADD_PER)
  }
  return table
}

export const createExplosionGenerator = (
  type: ExplosionType
): SampleGenerator => {
  // Pre-generate random table like the original
  const explRands = generateRandomTable()

  // Get parameters for this explosion type
  const params = EXPLOSION_PARAMS[type]

  // Current amplitude (increases over time)
  let amp = params.initialAmp

  // Position in random table
  let tablePosition = 0

  // Whether explosion is still playing
  let isPlaying = true

  const generateChunk = (): Uint8Array => {
    const buffer = new Uint8Array(CHUNK_SIZE)

    if (!isPlaying || amp > 127) {
      // Explosion has finished, fill with silence
      buffer.fill(0x80)
      isPlaying = false
      return buffer
    }

    // Start at a random position in the table (like Random() & 63 in original)
    tablePosition = Math.floor(Math.random() * 64)

    let bufferIndex = 0
    let currentPolarity = true // true = positive, false = negative

    // Original processes 370 bytes in groups, alternating polarity
    while (bufferIndex < CHUNK_SIZE) {
      // Toggle polarity (eor.w #0xFF00, D0)
      currentPolarity = !currentPolarity

      // Get period from random table
      let period =
        explRands[tablePosition + Math.floor(bufferIndex / 74)] ?? EXPL_LO_PER
      period = period >> 1 // Original divides by 2 (asr.w #1, D2)

      // Fill samples for this period
      const samplesToWrite = Math.min(period * 4, CHUNK_SIZE - bufferIndex)
      const amplitudeValue = currentPolarity ? amp : -amp

      for (let i = 0; i < samplesToWrite && bufferIndex < CHUNK_SIZE; i++) {
        // Convert signed amplitude to unsigned 8-bit
        buffer[bufferIndex] = 128 + amplitudeValue
        bufferIndex++
      }
    }

    // Increase amplitude for next chunk (explosion gets louder/fades)
    // Note: This seems counterintuitive but matches the original
    amp += params.ampChange

    return buffer
  }

  const reset = (): void => {
    amp = params.initialAmp
    tablePosition = 0
    isPlaying = true
  }

  return {
    generateChunk,
    reset
  }
}
