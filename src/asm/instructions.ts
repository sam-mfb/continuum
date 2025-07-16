/**
 * @fileoverview 68K instruction implementations
 */

import type { AsmRegisters, RegisterName } from './registers'

/**
 * 68K instruction implementations
 */
export type InstructionSet = {
  // Arithmetic/Logic operations
  ror_l: (value: number, bits: number) => number
  lsr_w: (value: number, bits: number) => number
  swap: (value: number) => number

  // Test/Compare operations
  tst_b: (value: number) => void

  // Branch operations
  dbra: (counter: RegisterName) => boolean
  dbne: (counter: RegisterName) => boolean

  // Memory operations
  eor_l: (memory: Uint8Array, address: number, value: number) => void
  eor_w: (memory: Uint8Array, address: number, value: number) => void
  and_w: (memory: Uint8Array, address: number, value: number) => void

  // Register access
  getReg: (name: RegisterName) => number
  setReg: (name: RegisterName, value: number) => void

  // Flags
  getFlag: (flag: 'zero' | 'negative' | 'carry' | 'overflow') => boolean
}

/**
 * Creates a 68K instruction set with register state
 */
export const createInstructionSet = (
  registers: AsmRegisters
): InstructionSet => {
  // Helper to get register value
  const getReg = (name: RegisterName): number => {
    const upperName = name.toUpperCase()
    if (upperName in registers.data) {
      return registers.data[upperName as keyof typeof registers.data]
    }
    if (upperName in registers.address) {
      return registers.address[upperName as keyof typeof registers.address]
    }
    throw new Error(`Unknown register: ${name}`)
  }

  // Helper to set register value
  const setReg = (name: RegisterName, value: number): void => {
    const upperName = name.toUpperCase()
    if (upperName in registers.data) {
      registers.data[upperName as keyof typeof registers.data] = value
    } else if (upperName in registers.address) {
      registers.address[upperName as keyof typeof registers.address] = value
    } else {
      throw new Error(`Unknown register: ${name}`)
    }
  }

  // Helper to get flag
  const getFlag = (
    flag: 'zero' | 'negative' | 'carry' | 'overflow'
  ): boolean => {
    const flagMap = {
      zero: 'zeroFlag',
      negative: 'negativeFlag',
      carry: 'carryFlag',
      overflow: 'overflowFlag'
    }
    return registers.flags[flagMap[flag] as keyof typeof registers.flags]
  }

  // Helper to set flags
  const setFlags = (value: number, size: 'b' | 'w' | 'l'): void => {
    const mask = size === 'b' ? 0xff : size === 'w' ? 0xffff : 0xffffffff
    const maskedValue = value & mask

    registers.flags.zeroFlag = maskedValue === 0
    registers.flags.negativeFlag =
      size === 'b'
        ? (maskedValue & 0x80) !== 0
        : size === 'w'
          ? (maskedValue & 0x8000) !== 0
          : (maskedValue & 0x80000000) !== 0
  }

  return {
    // Rotate right long
    ror_l: (value: number, bits: number): number => {
      bits = bits & 31
      if (bits === 0) return value
      return ((value >>> bits) | (value << (32 - bits))) >>> 0
    },

    // Logical shift right word
    lsr_w: (value: number, bits: number): number => {
      return (value >>> bits) & 0xffff
    },

    // Swap high and low words
    swap: (value: number): number => {
      return ((value >>> 16) | ((value & 0xffff) << 16)) >>> 0
    },

    // Test byte and set flags
    tst_b: (value: number): void => {
      setFlags(value, 'b')
    },

    // Decrement and branch if not -1
    dbra: (counter: RegisterName): boolean => {
      const current = getReg(counter)
      if (current === 0) {
        setReg(counter, 0xffff)
        return false
      }
      const newValue = (current - 1) & 0xffff
      setReg(counter, newValue)
      return newValue !== 0xffff
    },

    // Decrement and branch if not equal and not -1
    dbne: (counter: RegisterName): boolean => {
      if (registers.flags.zeroFlag) return false
      const current = getReg(counter)
      const newValue = (current - 1) & 0xffff
      setReg(counter, newValue)
      return newValue !== 0xffff
    },

    // EOR long to screen memory
    eor_l: (memory: Uint8Array, address: number, value: number): void => {
      if (address >= 0 && address + 3 < memory.length) {
        memory[address]! ^= (value >>> 24) & 0xff
        memory[address + 1]! ^= (value >>> 16) & 0xff
        memory[address + 2]! ^= (value >>> 8) & 0xff
        memory[address + 3]! ^= value & 0xff
      }
    },

    // EOR word to screen memory
    eor_w: (memory: Uint8Array, address: number, value: number): void => {
      if (address >= 0 && address + 1 < memory.length) {
        memory[address]! ^= (value >>> 8) & 0xff
        memory[address + 1]! ^= value & 0xff
      }
    },

    // AND word to screen memory
    and_w: (memory: Uint8Array, address: number, value: number): void => {
      if (address >= 0 && address + 1 < memory.length) {
        memory[address]! &= (value >>> 8) & 0xff
        memory[address + 1]! &= value & 0xff
      }
    },

    getReg,
    setReg,
    getFlag
  }
}

