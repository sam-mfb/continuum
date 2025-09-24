/**
 * Shield Discrete Sound Generator
 *
 * A time-limited version of the shield sound for auto-triggered shield events
 * (like self-hit feedback). Plays the same alternating square wave as normal
 * shield but automatically ends after 30ms.
 */

import type { SampleGenerator } from '../sampleGenerator'
import { CHUNK_SIZE, CENTER_VALUE } from '../sampleGenerator'
import { build68kArch } from '@lib/asm/emulator'

// Constants from original
const SNDBUFLEN = 370
const SHLD_FREQ = 50 // Base frequency of shield sound

// Duration in samples (30ms at 22.2kHz - original game sample rate)
const DISCRETE_DURATION_SAMPLES = Math.floor(22200 * 0.030) // ~666 samples

export const createShieldDiscreteGenerator = (): SampleGenerator & { start: () => void } => {
  // Create 68K emulator context
  const asm = build68kArch()

  // State variables
  let isActive = false
  let hi = false // Alternating flag for frequency modulation
  let samplesGenerated = 0 // Track total samples generated
  let hasCompleted = false // Track if sound has completed

  // Simulated memory for sound buffer
  const soundbuffer = new Uint8Array(SNDBUFLEN) // Use single channel buffer for chunk generation
  const outputChunk = new Uint8Array(CHUNK_SIZE) // Output buffer

  // Implementation of unclear_tone (same as shield)
  const unclear_tone = (freq: number, vol: number): void => {
    // move.l soundbuffer(A5), A0
    asm.A0 = 0

    // move.w #SNDBUFLEN-1, D2
    asm.D2 = SNDBUFLEN - 1

    // move.w vol(A6), D0
    asm.D0 = vol

    // Main loop
    let bufferIndex = 0
    while (asm.D2 >= 0) {
      // @biglp neg.b D0
      asm.D0 = (asm.D0 & 0xff00) | ((256 - (asm.D0 & 0xff)) & 0xff)

      // move.w freq(A6), D1
      asm.D1 = freq

      // Inner loop
      do {
        // @loop move.b D0, (A0)
        if (bufferIndex < SNDBUFLEN) {
          soundbuffer[bufferIndex] = asm.D0 & 0xff
        }

        // addq.w #2, A0 - Skip stereo channel
        bufferIndex++

        // subq.w #1, D2
        asm.D2 = (asm.D2 - 1) & 0xffff

        // dblt D1, @loop
        asm.D1 = (asm.D1 - 1) & 0xffff
        if (asm.D1 === 0xffff) break
      } while (asm.D2 < 0x8000) // While D2 is positive (bit 15 clear)

      // bge.s @biglp
      if (asm.D2 < 0x8000) continue
      else break
    }
  }

  const do_shld_sound = (): void => {
    // Same as regular shield but we don't check shielding flag
    let freq = SHLD_FREQ
    hi = !hi
    if (hi) freq += 2

    // Generate the tone
    unclear_tone(freq, 96)
  }

  const generateChunk = (): Uint8Array => {
    if (!isActive || hasCompleted) {
      // Return silence if not active or completed
      outputChunk.fill(CENTER_VALUE)
      return outputChunk
    }

    // Generate sound buffer if needed
    do_shld_sound()

    // Copy the generated sound to the output chunk
    // Track how many total samples we've generated across all chunks
    for (let i = 0; i < CHUNK_SIZE; i++) {
      if (samplesGenerated >= DISCRETE_DURATION_SAMPLES) {
        // We've reached the duration limit, fill rest with silence
        outputChunk[i] = CENTER_VALUE
        hasCompleted = true
      } else {
        // Use modulo to repeat the pattern if needed
        const bufIndex = samplesGenerated % SNDBUFLEN
        outputChunk[i] = soundbuffer[bufIndex] || CENTER_VALUE
        samplesGenerated++
      }
    }

    return outputChunk
  }

  const hasEnded = (): boolean => {
    return hasCompleted
  }

  const reset = (): void => {
    isActive = true
    samplesGenerated = 0
    hasCompleted = false
    hi = false
    soundbuffer.fill(CENTER_VALUE)
  }

  const start = (): void => {
    reset()
  }

  return {
    generateChunk,
    reset,
    hasEnded,
    start
  }
}