/**
 * Soft Sound Generator - Assembly Implementation
 *
 * Uses the same do_bunk_sound() from Sound.c:208-234 as bunker sound
 * but with different initial parameters for a softer effect
 *
 * From Sound.c:483-486:
 * - period = 2
 * - amp = 120 (vs 104 for bunker)
 * - ampchange = 1 (vs 3 for bunker)
 *
 * This creates a softer, less harsh version of the bunker destruction sound
 */

import type { SampleGenerator } from '../sampleGenerator'
import { CHUNK_SIZE, CENTER_VALUE } from '../sampleGenerator'
import { build68kArch } from '@lib/asm/emulator'

// Constants from original
const SNDBUFLEN = 370
const SOFT_AMP = 120 // Initial amplitude from Sound.c:484
const SOFT_AMPCHANGE = 1 // Amplitude change rate from Sound.c:485

export const createSoftGenerator = (): SampleGenerator => {
  // Create 68K emulator context
  const asm = build68kArch()

  // State variables (simulating A5-relative storage)
  let amp = SOFT_AMP
  let ampchange = SOFT_AMPCHANGE
  let period = 2 // Starting period from Sound.c:483
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

    // Implementation of the assembly code (same as bunker)
    // move.l D3, -(SP) - save D3
    const savedD3 = asm.D3

    // move.l soundbuffer(A5), A0
    asm.A0 = 0 // Points to start of soundbuffer

    // move.b amp+1(A5), D0 - load amp into low byte
    // asl.w #8, D0 - shift to high byte
    asm.D0 = (amp & 0xff) << 8

    // moveq #4, D3
    asm.D3 = 4

    // move.w #SNDBUFLEN/5, D2
    asm.D2 = Math.floor(SNDBUFLEN / 5) // 74

    // Main loop - emulating the exact flow including the dbra D3,@loop at line 227
    let jumpToLoop = false

    // Outer loop controlled by D3 (runs 5 times)
    outerLoop: do {
      // @biglp - only execute if not jumping directly to @loop
      if (!jumpToLoop) {
        // move.w period(A5), D1
        asm.D1 = period & 0xffff

        // asr.w #1, D1 - arithmetic shift right (divide by 2)
        asm.D1 = asm.D1 >> 1

        // eor.w #0xFF00, D0
        asm.D0 = (asm.D0 ^ 0xff00) & 0xffff
      }

      jumpToLoop = false // Reset flag

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

        // subq.w #2, D2
        asm.D2 = (asm.D2 - 2) & 0xffff

        // dble D1, @loop
        // "decrement and branch if less than or equal"
        // This is a DBcc instruction where cc = "le" (less than or equal)
        // If condition is FALSE (D2 > 0), decrement D1 and branch if D1 != -1
        // If condition is TRUE (D2 <= 0), fall through without decrementing
        if (!(asm.D2 & 0x8000) && asm.D2 !== 0) {
          // D2 > 0
          // Condition is false, so decrement D1 and branch
          asm.D1 = (asm.D1 - 1) & 0xffff
          if ((asm.D1 & 0xffff) !== 0xffff) {
            continue innerLoop
          }
        }
        // Either D2 <= 0 (condition true) or D1 became -1, exit inner loop
        break
      } while (true)

      // bgt.s @biglp - branch if D2 > 0
      if (!(asm.D2 & 0x8000) && asm.D2 !== 0) {
        // D2 is still positive, go back to start of outer loop
        continue outerLoop
      }

      // If we get here, D2 <= 0, so we've completed this chunk
      // move.w #SNDBUFLEN/5, D2
      asm.D2 = Math.floor(SNDBUFLEN / 5) // 74

      // addq.w #1, period(A5)
      period = (period + 1) & 0xffff

      // dbra D3, @loop - NOTE: This jumps to @loop, not @biglp!
      // This means we skip the period/D1 reload and D0 flip
      asm.D3 = (asm.D3 - 1) & 0xffff
      if ((asm.D3 & 0xffff) !== 0xffff) {
        jumpToLoop = true // Set flag to skip @biglp setup
        continue outerLoop
      }
      break
    } while (true)

    // move.l (SP)+, D3 - restore D3
    asm.D3 = savedD3

    // C code after assembly
    // priority -= 1 (removed since priority not used)
    amp += ampchange

    // if (period > 40) clear_sound()
    if (period > 40) {
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
    amp = SOFT_AMP
    ampchange = SOFT_AMPCHANGE
    period = 2 // Starting period from Sound.c:483
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
    amp = 0
    period = 0
  }

  return {
    generateChunk,
    reset,
    start,
    stop
  } as SampleGenerator & { start: () => void; stop: () => void }
}
