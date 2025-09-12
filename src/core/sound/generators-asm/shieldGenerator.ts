/**
 * Shield Sound Generator - Assembly Implementation
 *
 * Direct port of do_shld_sound() and unclear_tone() from Sound.c
 * Uses 68K assembly emulator to exactly match original behavior
 *
 * Creates alternating square wave for shield activation
 *
 * unclear_tone assembly code:
 * ```asm
 * move.l  soundbuffer(A5), A0
 * move.w  #SNDBUFLEN-1, D2
 * move.w  vol(A6), D0
 * @biglp  neg.b   D0
 *         move.w  freq(A6), D1
 * @loop   move.b  D0, (A0)
 *         addq.w  #2, A0
 *         subq.w  #1, D2
 *         dblt    D1, @loop
 *         bge.s   @biglp
 * ```
 */

import type { SampleGenerator } from '../sampleGenerator'
import { CHUNK_SIZE, CENTER_VALUE } from '../sampleGenerator'
import { build68kArch } from '@lib/asm/emulator'

// Constants from original
const SNDBUFLEN = 370
const SHLD_FREQ = 50 // Base frequency of shield sound

export const createShieldGenerator = (): SampleGenerator => {
  // Create 68K emulator context
  const asm = build68kArch()

  // State variables
  let isActive = false
  let shielding = false // Flag to track if still shielding
  let hi = false // Alternating flag for frequency modulation

  // Simulated memory for sound buffer
  const soundbuffer = new Uint8Array(SNDBUFLEN * 2) // Stereo buffer

  // Auto-start on creation for testing (shield should repeat while held)
  let autoStart = true

  // Implementation of unclear_tone
  const unclear_tone = (freq: number, vol: number): void => {
    // move.l soundbuffer(A5), A0
    asm.A0 = 0

    // move.w #SNDBUFLEN-1, D2
    asm.D2 = SNDBUFLEN - 1

    // move.w vol(A6), D0
    asm.D0 = vol & 0xffff

    // Main loop - continues until all samples written
    while ((asm.D2 & 0xffff) < 0x8000) {
      // While D2 >= 0
      // @biglp neg.b D0 (negate the low byte to flip between 96 and 160)
      const lowByte = asm.D0 & 0xff
      const negated = (~lowByte + 1) & 0xff
      asm.D0 = (asm.D0 & 0xff00) | negated
      const currentValue = asm.D0 & 0xff

      // move.w freq(A6), D1
      asm.D1 = freq & 0xffff

      // Inner loop @loop - writes the same value multiple times
      // The loop continues for freq+1 iterations OR until D2 goes negative
      while (true) {
        // move.b D0, (A0)
        if (asm.A0 < soundbuffer.length) {
          soundbuffer[asm.A0] = currentValue
        }

        // addq.w #2, A0 (skip every other byte for stereo)
        asm.A0 = (asm.A0 + 2) & 0xffff

        // subq.w #1, D2
        asm.D2 = (asm.D2 - 1) & 0xffff

        // Check if D2 went negative
        if (asm.D2 & 0x8000) {
          // D2 is negative, we're done with the entire buffer
          break
        }

        // dbf D1, @loop (decrement D1 and loop unless it becomes -1)
        asm.D1 = (asm.D1 - 1) & 0xffff
        if ((asm.D1 & 0xffff) === 0xffff) {
          // D1 underflowed, exit inner loop
          break
        }
      }

      // Check if we're done (D2 negative)
      if (asm.D2 & 0x8000) {
        break
      }
    }
  }

  const generateChunk = (): Uint8Array => {
    const output = new Uint8Array(CHUNK_SIZE)

    // Auto-start on first generation if enabled
    if (autoStart && !isActive) {
      start()
      autoStart = false
    }

    if (!isActive) {
      output.fill(CENTER_VALUE)
      return output
    }

    // Clear buffer for new generation
    soundbuffer.fill(0)

    // Implementation of do_shld_sound
    let freq = SHLD_FREQ

    // Toggle hi flag and adjust frequency
    hi = !hi
    if (hi) {
      freq += 2
    }

    // Call unclear_tone with frequency and volume
    unclear_tone(freq, 96)

    // Check if still shielding
    if (!shielding) {
      isActive = false
    }

    // Keep shielding active for continuous sound
    // In the real game, this would be controlled by player input

    // Convert buffer to mono output
    // The buffer already contains unsigned values (96 and 160 alternating)
    for (let i = 0; i < CHUNK_SIZE; i++) {
      const srcIndex = i * 2
      if (srcIndex < soundbuffer.length) {
        const value = soundbuffer[srcIndex]
        // Use the value directly - it's already in the right range
        output[i] = value || CENTER_VALUE
      } else {
        output[i] = CENTER_VALUE
      }
    }

    return output
  }

  const reset = (): void => {
    isActive = true
    shielding = true
    hi = false
    autoStart = false
  }

  const start = (): void => {
    reset()
  }

  const stop = (): void => {
    isActive = false
    shielding = false
  }

  return {
    generateChunk,
    reset,
    start,
    stop
  } as SampleGenerator & { start: () => void; stop: () => void }
}
