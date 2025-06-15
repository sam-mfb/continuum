/**
 * Explosion Sound Generator
 *
 * Recreates the three explosion sounds from the original Continuum game.
 * Based on do_expl_sound() in Sound.c:153-177
 *
 * The original implementation:
 * - Uses a pre-generated table of 128 random period values (expl_rands)
 * - Each value is between 50-255 (EXPL_LO_PER to EXPL_LO_PER + EXPL_ADD_PER)
 * - Picks a random starting position in the table (Random() & 63)
 * - Generates noise bursts with periods from the table
 * - Amplitude starts low and increases over time (explosion fading out)
 * - Special case: EXP2 (ship) explosion cannot be interrupted
 *
 * Assembly logic:
 * - Loads amp into high byte (asl.w #8)
 * - Alternates between amp and 255-amp (eor.w #0xFF00)
 * - Period values are divided by 2 (asr.w #1)
 * - Each inner loop iteration writes 4 bytes
 *
 * Three explosion types:
 * - EXP1 (Bunker): amp=16, ampchange=2, priority=90
 * - EXP2 (Ship): amp=1, ampchange=1, priority=100 (highest)
 * - EXP3 (Alien): amp=64, ampchange=3, priority=50
 */

import type { SampleGenerator } from '../sampleGenerator'
import { CHUNK_SIZE, CENTER_VALUE } from '../sampleGenerator'

// Constants from original GW.h
const EXPL_LO_PER = 50 // Minimum period value
const EXPL_ADD_PER = 206 // Range of random values

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
  soundId: string // For debugging
}

const EXPLOSION_PARAMS: Record<ExplosionType, ExplosionParams> = {
  [ExplosionType.BUNKER]: {
    initialAmp: 16,
    ampChange: 2,
    priority: 90,
    soundId: 'EXP1_SOUND'
  },
  [ExplosionType.SHIP]: {
    initialAmp: 1,
    ampChange: 1,
    priority: 100,
    soundId: 'EXP2_SOUND'
  },
  [ExplosionType.ALIEN]: {
    initialAmp: 64,
    ampChange: 3,
    priority: 50,
    soundId: 'EXP3_SOUND'
  }
}

// Generate expl_rands table like the original init_sound()
const generateExplRands = (): Uint8Array => {
  const table = new Uint8Array(128)

  // Use a seeded random for consistency
  let seed = 0x5678
  const random = (): number => {
    seed = (seed * 1103515245 + 12345) & 0x7fffffff
    return seed / 0x7fffffff
  }

  for (let i = 0; i < 128; i++) {
    // Original: (char) EXPL_LO_PER + rint(EXPL_ADD_PER)
    // rint() returns 0 to EXPL_ADD_PER-1
    table[i] = EXPL_LO_PER + Math.floor(random() * EXPL_ADD_PER)
  }

  return table
}

// Pre-generate the explosion random table
const EXPL_RANDS = generateExplRands()

export const createExplosionGenerator = (
  type: ExplosionType = ExplosionType.BUNKER
): SampleGenerator => {
  const params = EXPLOSION_PARAMS[type]

  // State variables (matching original)
  let amp = 0 // Current amplitude
  let ampchange = 0 // Amplitude change per cycle
  let priority = 0 // Sound priority
  let currentsound = '' // Current sound type
  let isActive = false

  // Auto-start on creation for testing
  let autoStart = true

  const generateChunk = (): Uint8Array => {
    const buffer = new Uint8Array(CHUNK_SIZE)

    // Auto-start on first generation if enabled
    if (autoStart && !isActive) {
      start()
      autoStart = false
    }

    if (!isActive) {
      // Fill with silence
      buffer.fill(CENTER_VALUE)
      return buffer
    }

    // Get random offset into expl_rands (Random() & 63 gives 0-63)
    const randOffset = Math.floor(Math.random() * 64)

    // Fill buffer using assembly logic
    let bufferIndex = 0
    let randIndex = randOffset
    let currentValue = amp // Start with amp value

    while (bufferIndex < CHUNK_SIZE) {
      // Toggle between amp and 255-amp (eor.w #0xFF00)
      currentValue = currentValue === amp ? 255 - amp : amp

      // Get period from table and divide by 2 (asr.w #1)
      const period = EXPL_RANDS[randIndex & 0x7f]! >> 1

      // Each iteration in original writes 4 bytes (2 move.w instructions)
      // But we write 1 byte at a time, so multiply by 2 for same effect
      const samplesPerPeriod = (period + 1) * 2

      // Fill with current value for this period
      const count = Math.min(samplesPerPeriod, CHUNK_SIZE - bufferIndex)
      for (let i = 0; i < count; i++) {
        buffer[bufferIndex++] = currentValue
      }

      randIndex++
    }

    // Update amplitude after filling buffer
    // Special case: don't update priority for ship explosion
    if (currentsound !== params.soundId || type !== ExplosionType.SHIP) {
      priority -= ampchange
    }

    amp += ampchange
    if (amp > 127) {
      // Explosion complete
      console.log(`${params.soundId} complete`)
      isActive = false
    }

    return buffer
  }

  const reset = (): void => {
    amp = params.initialAmp
    ampchange = params.ampChange
    priority = params.priority
    currentsound = params.soundId
    isActive = true
    autoStart = false
    console.log(
      `Explosion generator (${type}) reset:`,
      `amp=${amp}, ampchange=${ampchange}, priority=${priority}`
    )
  }

  const start = (): void => {
    console.log(`Starting ${type} explosion (${params.soundId})`)
    reset()
  }

  const stop = (): void => {
    isActive = false
    amp = 0
  }

  return {
    generateChunk,
    reset,
    // Extended interface
    start,
    stop
  } as SampleGenerator & { start: () => void; stop: () => void }
}
