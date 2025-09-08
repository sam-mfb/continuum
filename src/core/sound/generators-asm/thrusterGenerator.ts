/**
 * Thruster Sound Generator - Assembly Implementation
 *
 * Direct port of do_thru_sound() from Sound.c:179-206
 * Uses 68K assembly emulator to exactly match original behavior
 *
 * Creates random noise pulses for ship thruster effect
 *
 * Original assembly code:
 * ```asm
 * move.l  soundbuffer(A5), A0
 * move.w  #SNDBUFLEN/37-1, count
 * @biglp  moveq   #0, D0
 *         move.b  (pers)+, D0
 *         lsr.w   #1, D0
 *         lsl.w   #8, D0
 *         move.w  D0, D1
 *         swap    D0
 *         move.w  D1, D0
 *         move.w  #(37-1)/6-1, D2
 * @loop   move.l  D0, (A0)+
 *         move.l  D0, (A0)+
 *         move.l  D0, (A0)+
 *         dbf     D2, @loop
 *         move.w  D0, (A0)+
 *         dbf     count, @biglp
 * ```
 */

import type { SampleGenerator } from '../sampleGenerator'
import { CHUNK_SIZE, CENTER_VALUE } from '../sampleGenerator'
import { build68kArch } from '@lib/asm/emulator'

// Constants from original
const SNDBUFLEN = 370
const THRU_LO_AMP = 64
const THRU_ADD_AMP = 128

export const createThrusterGenerator = (): SampleGenerator => {
  // Create 68K emulator context
  const asm = build68kArch()
  
  // State variables
  let isActive = false
  let thrusting = false // Flag to track if still thrusting
  
  // Simulated memory for sound buffer
  const soundbuffer = new Uint8Array(SNDBUFLEN * 2) // Stereo buffer
  
  // Random thruster amplitudes (simulating thru_rands array)
  // Original generates 64 random values between THRU_LO_AMP and THRU_LO_AMP+THRU_ADD_AMP
  const thru_rands = new Uint8Array(64)
  for (let i = 0; i < 64; i++) {
    thru_rands[i] = THRU_LO_AMP + Math.floor(Math.random() * THRU_ADD_AMP)
  }
  
  // Auto-start on creation for testing (thruster should repeat while held)
  let autoStart = true

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
    
    // Implementation of the assembly code
    // pers = thru_rands + (Random() & 63)
    const persIndex = Math.floor(Math.random() * 64) & 63
    let pers = persIndex
    
    // Save count register
    const savedCount = asm.registers.data.D4 // Using D4 for count
    
    // move.l soundbuffer(A5), A0
    asm.A0 = 0 // Points to start of soundbuffer
    
    // move.w #SNDBUFLEN/37-1, count
    asm.registers.data.D4 = Math.floor(SNDBUFLEN / 37) - 1  // 9
    
    // Main loop @biglp
    do {
      // moveq #0, D0
      asm.D0 = 0
      
      // move.b (pers)+, D0
      const randByte = thru_rands[pers & 63]!
      asm.D0 = randByte
      pers = (pers + 1) & 63
      
      // lsr.w #1, D0 (logical shift right by 1, word operation)
      asm.D0 = (asm.D0 >> 1) & 0xffff
      
      // lsl.w #8, D0 (logical shift left by 8, word operation)
      asm.D0 = (asm.D0 << 8) & 0xffff
      
      // move.w D0, D1
      asm.D1 = asm.D0 & 0xffff
      
      // swap D0 (swap upper and lower words of the full 32-bit register)
      // Since we only have data in the lower word, after swap it goes to upper word
      const lower = asm.D0 & 0xffff
      asm.D0 = (lower << 16) | 0  // Lower word becomes upper, lower word becomes 0
      
      // move.w D1, D0 (copy D1 to lower word of D0)
      asm.D0 = (asm.D0 & 0xffff0000) | (asm.D1 & 0xffff)
      
      // Now D0 has the same value in both upper and lower words
      
      // move.w #(37-1)/6-1, D2
      asm.D2 = Math.floor((37 - 1) / 6) - 1  // 5
      
      // Inner loop @loop
      do {
        // move.l D0, (A0)+ (three times)
        // Each move.l writes 4 bytes in big-endian order
        for (let i = 0; i < 3; i++) {
          if (asm.A0 < soundbuffer.length - 3) {
            // Big-endian: most significant byte first
            soundbuffer[asm.A0] = (asm.D0 >> 24) & 0xff
            soundbuffer[asm.A0 + 1] = (asm.D0 >> 16) & 0xff
            soundbuffer[asm.A0 + 2] = (asm.D0 >> 8) & 0xff
            soundbuffer[asm.A0 + 3] = asm.D0 & 0xff
          }
          asm.A0 += 4
        }
        
        // dbf D2, @loop
        asm.D2 = (asm.D2 - 1) & 0xffff
      } while ((asm.D2 & 0xffff) !== 0xffff)
      
      // move.w D0, (A0)+
      if (asm.A0 < soundbuffer.length - 1) {
        // Write lower word in big-endian
        soundbuffer[asm.A0] = (asm.D0 >> 8) & 0xff
        soundbuffer[asm.A0 + 1] = asm.D0 & 0xff
      }
      asm.A0 += 2
      
      // dbf count, @biglp
      asm.registers.data.D4 = (asm.registers.data.D4 - 1) & 0xffff
    } while ((asm.registers.data.D4 & 0xffff) !== 0xffff)
    
    // Restore count register
    asm.registers.data.D4 = savedCount
    
    // C code after assembly
    if (!thrusting) {
      isActive = false
    }
    
    // Keep thrusting active for continuous sound
    // In the real game, this would be controlled by player input
    
    // Convert buffer to mono output
    // The original writes the same pattern to stereo, so just take left channel
    for (let i = 0; i < CHUNK_SIZE; i++) {
      const srcIndex = i * 2
      if (srcIndex < soundbuffer.length) {
        const value = soundbuffer[srcIndex]
        // The thruster creates values centered around the byte from the random table
        // which was shifted to create the audio pattern
        output[i] = value || CENTER_VALUE
      } else {
        output[i] = CENTER_VALUE
      }
    }
    
    return output
  }

  const reset = (): void => {
    isActive = true
    thrusting = true
    autoStart = false
  }

  const start = (): void => {
    reset()
  }

  const stop = (): void => {
    isActive = false
    thrusting = false
  }

  return {
    generateChunk,
    reset,
    start,
    stop
  } as SampleGenerator & { start: () => void; stop: () => void }
}