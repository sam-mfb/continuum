/**
 * @fileoverview 68K assembler emulator builder
 */

import { createRegisters, type AsmRegisters } from './registers'
import { createInstructionSet, type InstructionSet } from './instructions'
import type { DeepPartial } from '../shared/types'

/**
 * 68K assembler emulator context
 */
export type Asm68k = {
  registers: AsmRegisters
  instructions: InstructionSet
  
  // Register shortcuts
  D0: number
  D1: number
  D2: number
  D3: number
  A0: number
  A1: number
}

/**
 * Creates a 68K assembler emulator instance
 */
export const build68kArch = (initialState?: DeepPartial<AsmRegisters>): Asm68k => {
  const registers = createRegisters()

  // Apply initial state if provided
  if (initialState) {
    if (initialState.data) {
      Object.assign(registers.data, initialState.data)
    }
    if (initialState.address) {
      Object.assign(registers.address, initialState.address)
    }
    if (initialState.flags) {
      Object.assign(registers.flags, initialState.flags)
    }
  }

  const instructions = createInstructionSet(registers)

  // Create proxy for convenient register access
  const context: Asm68k = {
    registers,
    instructions,

    // Register shortcuts with getters/setters
    get D0() { return registers.data.D0 },
    set D0(val: number) { registers.data.D0 = val },

    get D1() { return registers.data.D1 },
    set D1(val: number) { registers.data.D1 = val },

    get D2() { return registers.data.D2 },
    set D2(val: number) { registers.data.D2 = val },

    get D3() { return registers.data.D3 },
    set D3(val: number) { registers.data.D3 = val },

    get A0() { return registers.address.A0 },
    set A0(val: number) { registers.address.A0 = val },

    get A1() { return registers.address.A1 },
    set A1(val: number) { registers.address.A1 = val }
  }

  return context
}
