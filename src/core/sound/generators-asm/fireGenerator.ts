/**
 * Fire Sound Generator - Assembly Implementation
 *
 * Direct port of do_fire_sound() from Sound.c:124-151
 * Uses 68K assembly emulator to exactly match original behavior
 *
 * Original assembly code:
 * ```asm
 * movem.l D3, -(SP)
 * move.l  soundbuffer(A5), A0
 * moveq   #5, D3
 * bra.s   @enter
 * @biglp  move.w  freq(A5), D1
 * @loop   move.b  0(wave, pos), (A0)
 *         addq.w  #2, A0
 *         add.b   D1, pos
 *         dbf     D2, @loop
 * @enter  move.w  #SNDBUFLEN/5-1, D2
 *         subq.w  #1, freq(A5)
 *         dbf     D3, @biglp
 *         addq.w  #1, freq(A5)
 * movem.l (SP)+, D3
 * ```
 */

import type { SampleGenerator } from '../sampleGenerator'
import { CHUNK_SIZE, CENTER_VALUE } from '../sampleGenerator'
import { SINE_TABLE } from '../generators/sineTableData'
import { build68kArch } from '@lib/asm/emulator'

// Constants from original
const START_FREQ = 27
const MIN_FREQ = 5
const SNDBUFLEN = 370

export const createFireGenerator = (): SampleGenerator => {
  // Create 68K emulator context
  const asm = build68kArch()

  // State variables (simulating A5-relative storage)
  let freq = 0 // freq(A5)
  let phase = 0 // phase variable in original
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

    if (!isActive || freq < MIN_FREQ) {
      output.fill(CENTER_VALUE)
      return output
    }

    // Clear buffer for new generation
    soundbuffer.fill(0)

    // Implementation of the assembly code
    // movem.l D3, -(SP) - save D3 (handled by local variable)
    const savedD3 = asm.D3

    // move.l soundbuffer(A5), A0
    asm.A0 = 0 // Points to start of soundbuffer

    // moveq #5, D3
    asm.D3 = 5

    // Initialize pos register (using as byte index into sine table)
    let pos = phase & 0xff

    // Jump to @enter first (bra.s @enter)
    let firstIteration = true

    // Main loop - emulating dbf D3 which loops 6 times (5,4,3,2,1,0)
    while (true) {
      if (!firstIteration) {
        // @biglp move.w freq(A5), D1
        asm.D1 = freq & 0xffff

        // Inner loop - @loop
        // D2 contains loop counter (SNDBUFLEN/5-1 = 73)
        for (let i = 0; i <= asm.D2; i++) {
          // move.b 0(wave, pos), (A0)
          const sineValue = SINE_TABLE[pos & 0xff]!
          if (asm.A0 < soundbuffer.length) {
            soundbuffer[asm.A0] = sineValue
          }

          // addq.w #2, A0 (skip every other byte for stereo)
          asm.A0 = (asm.A0 + 2) & 0xffff

          // add.b D1, pos (byte addition, wraps at 256)
          pos = (pos + (asm.D1 & 0xff)) & 0xff
        }
      }

      // @enter move.w #SNDBUFLEN/5-1, D2
      asm.D2 = Math.floor(SNDBUFLEN / 5) - 1 // 73

      // subq.w #1, freq(A5)
      freq = (freq - 1) & 0xffff

      firstIteration = false

      // dbf D3, @biglp
      if (asm.D3 === 0) {
        break
      }
      asm.D3--
    }

    // addq.w #1, freq(A5)
    freq = (freq + 1) & 0xffff

    // movem.l (SP)+, D3 - restore D3
    asm.D3 = savedD3

    // Save phase for next call
    phase = pos

    // priority -= 5 (from C code after asm block) - removed since priority not used

    // if (freq < 5) clear_sound() (from C code)
    if (freq < MIN_FREQ) {
      isActive = false
    }

    // Convert stereo buffer to mono output
    // Take only the left channel (every other byte)
    for (let i = 0; i < CHUNK_SIZE; i++) {
      const srcIndex = i * 2
      if (srcIndex < soundbuffer.length) {
        output[i] = soundbuffer[srcIndex] || CENTER_VALUE
      } else {
        output[i] = CENTER_VALUE
      }
    }

    return output
  }

  const reset = (): void => {
    freq = START_FREQ
    phase = 0
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
    freq = 0
    phase = 0
  }

  return {
    generateChunk,
    reset,
    start,
    stop
  } as SampleGenerator & { start: () => void; stop: () => void }
}
