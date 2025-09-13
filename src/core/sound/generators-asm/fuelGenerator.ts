/**
 * Fuel Sound Generator - Assembly Implementation
 *
 * Direct port of do_fuel_sound() from Sound.c:248-256
 * Uses clear_tone() to generate beeping sound
 *
 * Creates alternating beep pattern for low fuel warning
 */

import type { SampleGenerator } from '../sampleGenerator'
import { CHUNK_SIZE, CENTER_VALUE } from '../sampleGenerator'
import { SINE_TABLE } from '../generators/sineTableData'
import { build68kArch } from '@lib/asm/emulator'

// Constants from original
const SNDBUFLEN = 370
const FUELBEEPFREQ = 26 // From Sound.c:33
const FUELBEEPS = 3 // Number of beeps
const FUEL_COUNT_START = (FUELBEEPS * 2) << 2 // 3 * 2 * 4 = 24

export const createFuelGenerator = (): SampleGenerator => {
  // Create 68K emulator context
  const asm = build68kArch()

  // State variables
  let fuelcount = FUEL_COUNT_START
  let phase = 0
  let isActive = false

  // Simulated memory for sound buffer
  const soundbuffer = new Uint8Array(SNDBUFLEN * 2) // Stereo buffer

  // Auto-start on creation for testing
  let autoStart = false

  // Implementation of clear_tone (simplified version)
  const clear_tone = (freq: number): void => {
    // move.w freq(A6), D1
    asm.D1 = freq & 0xffff

    // move.l soundbuffer(A5), A0
    asm.A0 = 0

    // move.w #SNDBUFLEN-1, D2
    asm.D2 = SNDBUFLEN - 1

    // Using pos as byte index into sine table
    let pos = phase & 0xff

    // @loop move.b 0(Wave, pos), (A0)
    //       addq.l #2, A0
    //       add.b D1, pos
    //       dbf D2, @loop
    for (let i = 0; i <= SNDBUFLEN - 1; i++) {
      const sineValue = SINE_TABLE[pos & 0xff]!
      if (asm.A0 < soundbuffer.length) {
        soundbuffer[asm.A0] = sineValue
      }
      asm.A0 += 2
      pos = (pos + (asm.D1 & 0xff)) & 0xff
    }

    // Save phase for next call
    phase = pos
  }

  const do_no_sound = (): void => {
    // Fill buffer with silence (center value)
    soundbuffer.fill(CENTER_VALUE)
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

    // Implementation of do_fuel_sound
    // if ((--fuelcount >> 2) & 1)
    fuelcount--
    if ((fuelcount >> 2) & 1) {
      // Play tone
      clear_tone(FUELBEEPFREQ)
    } else {
      // Silent
      do_no_sound()
    }

    // if (!fuelcount) clear_sound()
    if (fuelcount <= 0) {
      isActive = false
    }

    // Convert buffer to mono output
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
    fuelcount = FUEL_COUNT_START
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
    fuelcount = 0
  }

  return {
    generateChunk,
    reset,
    start,
    stop
  } as SampleGenerator & { start: () => void; stop: () => void }
}
