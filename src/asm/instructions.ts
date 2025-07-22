/**
 * @fileoverview 68K instruction implementations
 */

import type { AsmRegisters, RegisterName } from './registers'

/**
 * 68K instruction implementations
 */
export type InstructionSet = {
  // Data movement
  move_b: (dest: RegisterName, src: number) => void
  move_w: (dest: RegisterName, src: number) => void
  move_l: (dest: RegisterName, src: number) => void

  // Arithmetic/Logic operations
  ror_l: (value: number, bits: number) => number
  ror_w: (value: number, bits: number) => number
  rol_w: (value: number, bits: number) => number
  lsr_w: (value: number, bits: number) => number
  lsr_l: (value: number, bits: number) => number
  lsr_b: (value: number, bits: number) => number
  asr_w: (value: number, bits: number) => number
  asr_l: (value: number, bits: number) => number
  swap: (value: number) => number
  neg_w: (value: number) => number
  addq_w: (dest: RegisterName, value: number) => void
  subq_w: (dest: RegisterName, value: number) => void
  adda_w: (dest: RegisterName, value: number) => void
  andi_w: (dest: RegisterName, value: number) => void

  // Test/Compare operations
  tst_b: (value: number) => void
  tst_w: (value: number) => void
  cmp_b: (reg: RegisterName, value: number) => void

  // Branch operations
  dbra: (counter: RegisterName) => boolean
  dbne: (counter: RegisterName) => boolean
  dbcs: (counter: RegisterName) => boolean
  bgt: () => boolean
  blt: () => boolean
  beq: () => boolean
  bra: () => boolean

  // Bit manipulation
  bset_b: (memory: Uint8Array, address: number, bit: number) => void

  // Memory operations
  eor_l: (memory: Uint8Array, address: number, value: number) => void
  eor_w: (memory: Uint8Array, address: number, value: number) => void
  and_w: (memory: Uint8Array, address: number, value: number) => void
  and_l: (memory: Uint8Array, address: number, value: number) => void
  or_l: (memory: Uint8Array, address: number, value: number) => void
  or_w: (memory: Uint8Array, address: number, value: number) => void
  or_b: (memory: Uint8Array, address: number, value: number) => void

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
    // Move byte
    move_b: (dest: RegisterName, src: number): void => {
      setReg(dest, src & 0xff)
    },

    // Move word
    move_w: (dest: RegisterName, src: number): void => {
      setReg(dest, src & 0xffff)
    },

    // Move long
    move_l: (dest: RegisterName, src: number): void => {
      setReg(dest, src)
    },

    // Rotate right long
    ror_l: (value: number, bits: number): number => {
      bits = bits & 31
      if (bits === 0) return value
      const result = ((value >>> bits) | (value << (32 - bits))) >>> 0
      // Set carry flag to the last bit rotated out
      registers.flags.carryFlag = bits > 0 && ((value >> (bits - 1)) & 1) === 1
      return result
    },

    // Rotate right word
    ror_w: (value: number, bits: number): number => {
      bits = bits & 15
      if (bits === 0) return value & 0xffff
      const word = value & 0xffff
      const result = ((word >>> bits) | (word << (16 - bits))) & 0xffff
      // Set carry flag to the last bit rotated out
      registers.flags.carryFlag = bits > 0 && ((word >> (bits - 1)) & 1) === 1
      return result
    },

    // Rotate left word
    rol_w: (value: number, bits: number): number => {
      bits = bits & 15
      if (bits === 0) return value & 0xffff
      const word = value & 0xffff
      const result = ((word << bits) | (word >>> (16 - bits))) & 0xffff
      // Set carry flag to the last bit rotated out
      registers.flags.carryFlag =
        bits > 0 && ((word >> (16 - bits)) & 1) === 1
      return result
    },

    // Logical shift right word
    lsr_w: (value: number, bits: number): number => {
      return (value >>> bits) & 0xffff
    },

    // Logical shift right long
    lsr_l: (value: number, bits: number): number => {
      bits = bits & 31
      if (bits === 0) return value
      return value >>> bits
    },

    // Logical shift right byte
    lsr_b: (value: number, bits: number): number => {
      return (value >>> bits) & 0xff
    },

    // Arithmetic shift right word (sign-extend)
    asr_w: (value: number, bits: number): number => {
      bits = bits & 15
      if (bits === 0) return value & 0xffff
      // Sign extend to 32-bit, shift, then mask back to 16-bit
      const signExtended = (value & 0xffff) | (value & 0x8000 ? 0xffff0000 : 0)
      return (signExtended >> bits) & 0xffff
    },

    // Arithmetic shift right long (sign-extend)
    asr_l: (value: number, bits: number): number => {
      bits = bits & 31
      if (bits === 0) return value
      // JavaScript >> operator already does arithmetic shift for 32-bit values
      return value >> bits
    },

    // Swap high and low words
    swap: (value: number): number => {
      return ((value >>> 16) | ((value & 0xffff) << 16)) >>> 0
    },

    // Negate word (2's complement)
    neg_w: (value: number): number => {
      return (~(value & 0xffff) + 1) & 0xffff
    },

    // Add quick word
    addq_w: (dest: RegisterName, value: number): void => {
      const current = getReg(dest)
      setReg(dest, (current + value) & 0xffff)
    },

    // Subtract quick word
    subq_w: (dest: RegisterName, value: number): void => {
      const current = getReg(dest)
      setReg(dest, (current - value) & 0xffff)
    },

    // Add address word
    adda_w: (dest: RegisterName, value: number): void => {
      const current = getReg(dest)
      setReg(dest, current + value) // No mask, affects full 32-bit address
    },

    // AND immediate word
    andi_w: (dest: RegisterName, value: number): void => {
      const current = getReg(dest)
      const result = current & value
      setReg(dest, result)
      setFlags(result, 'w')
    },

    // Test byte and set flags
    tst_b: (value: number): void => {
      setFlags(value, 'b')
    },

    // Test word and set flags
    tst_w: (value: number): void => {
      setFlags(value, 'w')
    },

    // Compare byte
    cmp_b: (reg: RegisterName, value: number): void => {
      const regValue = getReg(reg) & 0xff
      const result = regValue - value
      setFlags(result, 'b')
      // Note: More complex flag logic for V and C is omitted for now
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

    // Decrement and branch if carry set is false
    dbcs: (counter: RegisterName): boolean => {
      if (registers.flags.carryFlag) return false
      const current = getReg(counter)
      const newValue = (current - 1) & 0xffff
      setReg(counter, newValue)
      return newValue !== 0xffff
    },

    // Branch if greater than
    bgt: (): boolean => {
      return (
        !registers.flags.negativeFlag &&
        !registers.flags.zeroFlag &&
        !registers.flags.overflowFlag
      )
    },

    // Branch if less than
    blt: (): boolean => {
      return (
        (registers.flags.negativeFlag && !registers.flags.overflowFlag) ||
        (!registers.flags.negativeFlag && registers.flags.overflowFlag)
      )
    },

    // Branch if equal
    beq: (): boolean => {
      return registers.flags.zeroFlag
    },

    // Branch always
    bra: (): boolean => {
      return true
    },

    // Set bit in byte
    bset_b: (memory: Uint8Array, address: number, bit: number): void => {
      if (address >= 0 && address < memory.length) {
        memory[address]! |= 1 << (bit & 7)
      }
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

    // AND long to screen memory
    and_l: (memory: Uint8Array, address: number, value: number): void => {
      if (address >= 0 && address + 3 < memory.length) {
        memory[address]! &= (value >>> 24) & 0xff
        memory[address + 1]! &= (value >>> 16) & 0xff
        memory[address + 2]! &= (value >>> 8) & 0xff
        memory[address + 3]! &= value & 0xff
      }
    },

    // OR long to screen memory
    or_l: (memory: Uint8Array, address: number, value: number): void => {
      if (address >= 0 && address + 3 < memory.length) {
        memory[address]! |= (value >>> 24) & 0xff
        memory[address + 1]! |= (value >>> 16) & 0xff
        memory[address + 2]! |= (value >>> 8) & 0xff
        memory[address + 3]! |= value & 0xff
      }
    },

    // OR word to screen memory
    or_w: (memory: Uint8Array, address: number, value: number): void => {
      if (address >= 0 && address + 1 < memory.length) {
        memory[address]! |= (value >>> 8) & 0xff
        memory[address + 1]! |= value & 0xff
      }
    },

    // OR byte to screen memory
    or_b: (memory: Uint8Array, address: number, value: number): void => {
      if (address >= 0 && address < memory.length) {
        memory[address]! |= value & 0xff
      }
    },

    getReg,
    setReg,
    getFlag
  }
}
