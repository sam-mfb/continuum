/**
 * Crack Sound Generator - Assembly Implementation
 *
 * Direct port of do_crack_sound() from Sound.c:271-296
 * Uses 68K assembly emulator to exactly match original behavior
 *
 * Creates crackling sound effect using hiss random values
 *
 * Original assembly code:
 * ```asm
 * move.l  soundbuffer(A5), A0
 * move.w  #SNDBUFLEN/2-1, D1
 * moveq   #0x20, D0
 * ror.w   #8, D0
 * @biglp  eori.w  #0xFF00, D0
 *         moveq   #0, D2
 *         move.b  (vals)+, D2
 *         asr.w   #2, D2
 * @loop   move.w  D0, (A0)+
 *         move.w  D0, (A0)+
 *         subq.w  #1, D1
 *         dblt    D2, @loop
 *         bge.s   @biglp
 * ```
 */

import type { SampleGenerator } from '../sampleGenerator'
import { CHUNK_SIZE, CENTER_VALUE } from '../sampleGenerator'
import { HISS_RANDS } from './hissRandsData'
import { build68kArch } from '@lib/asm/emulator'

// Constants from original
const SNDBUFLEN = 370
const CRACK_COUNT_START = 6 // From Sound.c:514

export const createCrackGenerator = (): SampleGenerator => {
  // Create 68K emulator context
  const asm = build68kArch()

  // State variables
  let crackcount = CRACK_COUNT_START
  let isActive = false

  // Simulated memory for sound buffer
  const soundbuffer = new Uint8Array(SNDBUFLEN * 2) // Stereo buffer

  // Auto-start on creation for testing
  let autoStart = false

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

    // Implementation of do_crack_sound
    crackcount--
    if (crackcount > 0) {
      // vals = hiss_rands + (Random() & 31)
      const valsIndex = Math.floor(Math.random() * 32) & 31
      let vals = valsIndex

      // move.l soundbuffer(A5), A0
      asm.A0 = 0

      // move.w #SNDBUFLEN/2-1, D1
      asm.D1 = Math.floor(SNDBUFLEN / 2) - 1 // 184

      // moveq #0x20, D0
      // ror.w #8, D0
      // 0x20 rotated right by 8 bits becomes 0x2000
      asm.D0 = 0x2000

      // Main loop - continues until D1 goes negative
      while (true) {
        // @biglp eori.w #0xFF00, D0
        asm.D0 = (asm.D0 ^ 0xff00) & 0xffff

        // moveq #0, D2
        // move.b (vals)+, D2
        asm.D2 = HISS_RANDS[vals & 31]!
        vals = (vals + 1) & 31

        // asr.w #2, D2 - arithmetic shift right by 2 (divide by 4)
        asm.D2 = asm.D2 >> 2

        // Inner loop @loop
        innerLoop: do {
          // move.w D0, (A0)+
          if (asm.A0 < soundbuffer.length - 1) {
            soundbuffer[asm.A0] = (asm.D0 >> 8) & 0xff
            soundbuffer[asm.A0 + 1] = asm.D0 & 0xff
          }
          asm.A0 += 2

          // move.w D0, (A0)+
          if (asm.A0 < soundbuffer.length - 1) {
            soundbuffer[asm.A0] = (asm.D0 >> 8) & 0xff
            soundbuffer[asm.A0 + 1] = asm.D0 & 0xff
          }
          asm.A0 += 2

          // subq.w #1, D1
          asm.D1 = (asm.D1 - 1) & 0xffff

          // dblt D2, @loop
          // If D1 >= 0, decrement D2 and branch if D2 != -1
          // If D1 < 0, fall through without decrementing
          if (!(asm.D1 & 0x8000)) {
            // D1 >= 0
            // Condition is false (not less than), so decrement D2 and branch
            asm.D2 = (asm.D2 - 1) & 0xffff
            if ((asm.D2 & 0xffff) !== 0xffff) {
              continue innerLoop
            }
          }
          // Either D1 went negative or D2 became -1, exit inner loop
          break
        } while (true)

        // bge.s @biglp - branch if D1 >= 0 (not negative)
        if (!(asm.D1 & 0x8000)) {
          continue // D1 still positive, continue outer loop
        }
        break // D1 is negative, we're done
      }
    } else {
      // clear_sound()
      isActive = false
    }

    // Convert buffer to mono output
    for (let i = 0; i < CHUNK_SIZE; i++) {
      const srcIndex = i * 2
      if (srcIndex < soundbuffer.length) {
        const value = soundbuffer[srcIndex]
        output[i] = value || CENTER_VALUE
      } else {
        output[i] = CENTER_VALUE
      }
    }

    return output
  }

  const reset = (): void => {
    crackcount = CRACK_COUNT_START
    isActive = true
    autoStart = false
  }

  const start = (): void => {
    // Only reset if not currently active (don't restart if already playing)
    if (!isActive) {
      reset()
    }
  }

  const stop = (): void => {
    isActive = false
    crackcount = 0
  }

  const hasEnded = (): boolean => {
    // Crack sound has ended when it's no longer active
    return !isActive
  }

  return {
    generateChunk,
    reset,
    hasEnded,
    start,
    stop
  } as SampleGenerator & { start: () => void; stop: () => void }
}
