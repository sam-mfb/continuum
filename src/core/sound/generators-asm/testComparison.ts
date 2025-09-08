/**
 * Test comparison between regular and assembly implementations
 */

import { createFireGenerator as createFireRegular } from '../generators/fireGenerator'
import { createFireGenerator as createFireAsm } from './fireGenerator'

export const testFireGenerators = () => {
  console.log('=== Fire Generator Comparison ===')
  
  const regular = createFireRegular()
  const asm = createFireAsm()
  
  // Start both generators
  regular.start()
  asm.start()
  
  // Generate and compare first few chunks
  for (let i = 0; i < 10; i++) {
    const regularChunk = regular.generateChunk()
    const asmChunk = asm.generateChunk()
    
    // Compare first few samples
    let differences = 0
    for (let j = 0; j < 20; j++) {
      if (regularChunk[j] !== asmChunk[j]) {
        differences++
      }
    }
    
    console.log(`Chunk ${i}: ${differences}/20 differences in first 20 samples`)
    
    // Show if sounds have ended
    const regularSilent = regularChunk.every(v => v === 128)
    const asmSilent = asmChunk.every(v => v === 128)
    
    if (regularSilent || asmSilent) {
      console.log(`  Regular ended: ${regularSilent}, ASM ended: ${asmSilent}`)
    }
  }
}