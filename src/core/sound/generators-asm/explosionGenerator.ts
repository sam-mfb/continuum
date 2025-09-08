/**
 * Explosion Sound Generator - Assembly Implementation
 *
 * Direct port of do_expl_sound() from Sound.c:153-177
 * Uses 68K assembly emulator to exactly match original behavior
 *
 * Supports three explosion types:
 * - EXP1_SOUND: Bunker explosion (medium intensity)
 * - EXP2_SOUND: Ship explosion (slow fade, highest priority) 
 * - EXP3_SOUND: Alien explosion (loud start, fast fade)
 *
 * Original assembly code:
 * ```asm
 * move.l  soundbuffer(A5), A0
 * move.w  #SNDBUFLEN/2-1, D1
 * move.b  amp+1(A5), D0
 * asl.w   #8, D0
 * @biglp  eor.w   #0xFF00, D0
 *         moveq   #0, D2
 *         move.b  (pers)+, D2
 *         asr.w   #1, D2
 * @loop   move.w  D0, (A0)+
 *         move.w  D0, (A0)+
 *         subq.w  #1, D1
 *         dblt    D2, @loop
 *         bge.s   @biglp
 * ```
 */

import type { SampleGenerator } from '../sampleGenerator'
import { CHUNK_SIZE, CENTER_VALUE } from '../sampleGenerator'
import { build68kArch } from '@lib/asm/emulator'

// Constants from original
const SNDBUFLEN = 370
const EXPL_LO_PER = 50  // Lowest period in an explosion
const EXPL_ADD_PER = 206 // Random amount to add

// Explosion types from constants.ts
export enum ExplosionType {
  BUNKER = 2,  // EXP1_SOUND
  SHIP = 8,    // EXP2_SOUND
  ALIEN = 9    // EXP3_SOUND
}

// Parameters for each explosion type
const EXPLOSION_PARAMS = {
  [ExplosionType.BUNKER]: { 
    initialAmp: 16, 
    ampChange: 2,
    priority: 90  // EXP1_PRIOR
  },
  [ExplosionType.SHIP]: { 
    initialAmp: 1, 
    ampChange: 1,
    priority: 100 // EXP2_PRIOR (highest)
  },
  [ExplosionType.ALIEN]: { 
    initialAmp: 64, 
    ampChange: 3,
    priority: 50  // EXP3_PRIOR
  }
}

export const createExplosionGenerator = (type: ExplosionType): SampleGenerator => {
  // Create 68K emulator context
  const asm = build68kArch()
  
  // Get parameters for this explosion type
  const params = EXPLOSION_PARAMS[type]
  
  // State variables (simulating A5-relative storage)
  let amp = 0          // Amplitude tracker
  let ampchange = 0    // Rate of amplitude change
  let priority = 0
  let isActive = false
  const currentsound = type // Track current sound type
  
  // Simulated memory for sound buffer
  const soundbuffer = new Uint8Array(SNDBUFLEN * 2) // Stereo buffer
  
  // Random explosion periods (simulating expl_rands array)
  // Original generates 64 random values between EXPL_LO_PER and EXPL_LO_PER+EXPL_ADD_PER
  const expl_rands = new Uint8Array(64)
  for (let i = 0; i < 64; i++) {
    expl_rands[i] = EXPL_LO_PER + Math.floor(Math.random() * EXPL_ADD_PER)
  }
  
  // Auto-start on creation for testing
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
    // pers = expl_rands + (Random() & 63)
    const persIndex = Math.floor(Math.random() * 64) & 63
    let pers = persIndex
    
    // move.l soundbuffer(A5), A0
    asm.A0 = 0 // Points to start of soundbuffer
    
    // move.w #SNDBUFLEN/2-1, D1
    asm.D1 = Math.floor(SNDBUFLEN / 2) - 1  // 184
    
    // move.b amp+1(A5), D0
    // asl.w #8, D0
    asm.D0 = (amp & 0xff) << 8
    
    // Main loop
    while (true) {
      // @biglp eor.w #0xFF00, D0
      asm.D0 = (asm.D0 ^ 0xFF00) & 0xffff
      
      // moveq #0, D2
      // move.b (pers)+, D2
      asm.D2 = expl_rands[pers & 63]!
      pers = (pers + 1) & 63
      
      // asr.w #1, D2
      asm.D2 = asm.D2 >> 1
      
      // Inner loop @loop
      do {
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
        // dblt: decrement D2 and branch if previous comparison was "less than"
        // The comparison is based on D1 from "subq.w #1, D1"
        // If D1 < 0 (after the subtraction), decrement D2 and loop if D2 != -1
        if ((asm.D1 & 0x8000)) { // D1 is negative
          asm.D2 = (asm.D2 - 1) & 0xffff
          if ((asm.D2 & 0xffff) !== 0xffff) {
            continue // Continue looping
          }
        }
        break
      } while (true)
      
      // bge.s @biglp - branch if D1 >= 0
      if (!(asm.D1 & 0x8000)) {
        continue
      }
      break
    }
    
    // C code after assembly
    // Don't decrease priority for ship explosion
    if (currentsound !== ExplosionType.SHIP) {
      priority -= ampchange
    }
    
    // Increase amplitude and check if done
    amp += ampchange
    console.log(`Explosion ${ExplosionType[type]}: amp=${amp}, ampchange=${ampchange}`)
    if (amp > 127) {
      console.log(`Explosion ${ExplosionType[type]} ending: amp > 127`)
      isActive = false
    }
    
    // Convert buffer to mono output, centering around 128
    for (let i = 0; i < CHUNK_SIZE; i++) {
      const srcIndex = i * 2
      if (srcIndex < soundbuffer.length) {
        // Take high byte and center it
        const value = soundbuffer[srcIndex]
        output[i] = value || CENTER_VALUE
      } else {
        output[i] = CENTER_VALUE
      }
    }
    
    return output
  }

  const reset = (): void => {
    amp = params.initialAmp
    ampchange = params.ampChange
    priority = params.priority
    isActive = true
    autoStart = false
  }

  const start = (): void => {
    reset()
  }

  const stop = (): void => {
    isActive = false
    amp = 0
  }

  return {
    generateChunk,
    reset,
    start,
    stop
  } as SampleGenerator & { start: () => void; stop: () => void }
}