/**
 * Thruster Sound Generator
 * 
 * Recreates the thruster sound from the original Continuum game.
 * Based on do_thru_sound() in Sound.c:179-206
 * 
 * The original implementation:
 * - Uses a pre-generated table of 128 random values (thru_rands)
 * - Each value is between 64-191 (THRU_LO_AMP to THRU_LO_AMP + THRU_ADD_AMP)
 * - Picks a random starting position in the table
 * - For each chunk, reads sequential values from the table
 * - Each value is used to generate a constant amplitude for multiple samples
 * - Creates a "white noise" effect with varying amplitudes
 */

import type { SampleGenerator } from '../sampleGenerator'

// Constants from original GW.h
const THRU_LO_AMP = 64    // Minimum amplitude
const THRU_ADD_AMP = 128  // Range of random values
const CHUNK_SIZE = 370    // Samples per chunk (matches original)

// Generate random table like the original init_sound()
const generateRandomTable = (): Uint8Array => {
  const table = new Uint8Array(128)
  for (let i = 0; i < 128; i++) {
    // Random value between THRU_LO_AMP and THRU_LO_AMP + THRU_ADD_AMP - 1
    table[i] = THRU_LO_AMP + Math.floor(Math.random() * THRU_ADD_AMP)
  }
  return table
}

export const createThrusterGenerator = (): SampleGenerator => {
  // Pre-generate random table like the original
  const thruRands = generateRandomTable()
  
  // Current position in the random table
  let tablePosition = 0
  
  // Whether thruster is active (would be controlled by game state)
  let isThrusting = true
  
  const generateChunk = (): Uint8Array => {
    const buffer = new Uint8Array(CHUNK_SIZE)
    
    if (!isThrusting) {
      // Fill with silence (0x80 center value)
      buffer.fill(0x80)
      return buffer
    }
    
    // Start at a random position in the table (like Random() & 63 in original)
    // Note: original uses & 63 to ensure it stays within first 64 positions
    // leaving room to read sequential values without wrapping
    tablePosition = Math.floor(Math.random() * 64)
    
    let bufferIndex = 0
    
    // Original processes 370 bytes in groups of 37
    // Each group uses one random value from the table
    const groupsPerChunk = Math.floor(CHUNK_SIZE / 37)
    
    for (let group = 0; group < groupsPerChunk; group++) {
      // Get next random value from table
      const index = tablePosition + group
      if (index >= thruRands.length) {
        console.error(`Thruster generator: index ${index} out of bounds (table size: ${thruRands.length})`)
        break
      }
      const randomValue = thruRands[index]!
      
      // Original shifts right by 1 (divide by 2) to reduce amplitude
      const amplitude = randomValue >> 1
      
      // Fill 37 samples with this amplitude
      // Original uses assembly to quickly fill memory
      const samplesInGroup = Math.min(37, buffer.length - bufferIndex)
      for (let i = 0; i < samplesInGroup; i++) {
        buffer[bufferIndex++] = amplitude
      }
    }
    
    // Fill any remaining samples
    while (bufferIndex < buffer.length) {
      buffer[bufferIndex++] = 0x80
    }
    
    return buffer
  }
  
  const reset = (): void => {
    tablePosition = 0
    isThrusting = true
  }
  
  // Additional methods for game control
  const setThrusting = (thrusting: boolean): void => {
    isThrusting = thrusting
  }
  
  return {
    generateChunk,
    reset,
    // Extended interface for game integration
    setThrusting
  } as SampleGenerator & { setThrusting: (thrusting: boolean) => void }
}