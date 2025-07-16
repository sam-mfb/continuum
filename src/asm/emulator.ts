/**
 * @fileoverview 68K assembler emulator builder
 */

import { createRegisters, type AsmRegisters } from './registers'
import { createInstructionSet, type InstructionSet } from './instructions'
import { findWAddress, jsrWAddress } from './assemblyMacros'

/**
 * 68K assembler emulator context
 */
export type Asm68k = {
  registers: AsmRegisters
  instructions: InstructionSet
  
  // Convenience methods
  findWAddress: (offset: number, x: number, y: number) => number
  jsrWAddress: (offset: number, x: number, y: number) => number
  
  // Register shortcuts
  D0: number
  D1: number
  D2: number
  D3: number
  A0: number
  A1: number
  len: number
  x: number
  y: number
}

/**
 * Creates a 68K assembler emulator instance
 */
export const build68kArch = (initialState?: Partial<AsmRegisters>): Asm68k => {
  const registers = createRegisters()
  
  // Apply initial state if provided
  if (initialState) {
    Object.assign(registers, initialState)
  }
  
  const instructions = createInstructionSet(registers)
  
  // Create proxy for convenient register access
  const context: Asm68k = {
    registers,
    instructions,
    findWAddress,
    jsrWAddress,
    
    // Register shortcuts with getters/setters
    get D0() { return registers.D0 },
    set D0(val: number) { registers.D0 = val },
    
    get D1() { return registers.D1 },
    set D1(val: number) { registers.D1 = val },
    
    get D2() { return registers.D2 },
    set D2(val: number) { registers.D2 = val },
    
    get D3() { return registers.D3 },
    set D3(val: number) { registers.D3 = val },
    
    get A0() { return registers.A0 },
    set A0(val: number) { registers.A0 = val },
    
    get A1() { return registers.A1 },
    set A1(val: number) { registers.A1 = val },
    
    // Convenience aliases for common variables
    get len() { return registers.D7 },
    set len(val: number) { registers.D7 = val },
    
    get x() { return registers.D6 },
    set x(val: number) { registers.D6 = val },
    
    get y() { return registers.D5 },
    set y(val: number) { registers.D5 = val }
  }
  
  return context
}