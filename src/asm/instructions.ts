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
      if (bits === 0) {
        registers.flags.carryFlag = false
        setFlags(value, 'l')
        registers.flags.overflowFlag = false
        return value
      }
      const result = ((value >>> bits) | (value << (32 - bits))) >>> 0
      // Set carry flag to the last bit rotated out
      registers.flags.carryFlag = ((value >> (bits - 1)) & 1) === 1
      setFlags(result, 'l')
      registers.flags.overflowFlag = false // V is always cleared
      return result
    },

    // Rotate right word
    ror_w: (value: number, bits: number): number => {
      bits = bits & 15
      const word = value & 0xffff
      if (bits === 0) {
        registers.flags.carryFlag = false
        setFlags(word, 'w')
        registers.flags.overflowFlag = false
        return word
      }
      const result = ((word >>> bits) | (word << (16 - bits))) & 0xffff
      // Set carry flag to the last bit rotated out
      registers.flags.carryFlag = ((word >> (bits - 1)) & 1) === 1
      setFlags(result, 'w')
      registers.flags.overflowFlag = false // V is always cleared
      return result
    },

    // Rotate left word
    rol_w: (value: number, bits: number): number => {
      bits = bits & 15
      const word = value & 0xffff
      if (bits === 0) {
        registers.flags.carryFlag = false
        setFlags(word, 'w')
        registers.flags.overflowFlag = false
        return word
      }
      const result = ((word << bits) | (word >>> (16 - bits))) & 0xffff
      // Set carry flag to the last bit rotated out
      registers.flags.carryFlag = ((word >> (16 - bits)) & 1) === 1
      setFlags(result, 'w')
      registers.flags.overflowFlag = false // V is always cleared
      return result
    },

    // Logical shift right word
    lsr_w: (value: number, bits: number): number => {
      bits = bits & 15
      const word = value & 0xffff
      if (bits === 0) {
        registers.flags.carryFlag = false
        setFlags(word, 'w')
        registers.flags.overflowFlag = false
        return word
      }
      const result = word >>> bits
      registers.flags.carryFlag = ((word >> (bits - 1)) & 1) === 1
      setFlags(result, 'w')
      registers.flags.overflowFlag = false // V is always cleared
      return result
    },

    // Logical shift right long
    lsr_l: (value: number, bits: number): number => {
      bits = bits & 31
      if (bits === 0) {
        registers.flags.carryFlag = false
        setFlags(value, 'l')
        registers.flags.overflowFlag = false
        return value
      }
      const result = value >>> bits
      registers.flags.carryFlag = ((value >> (bits - 1)) & 1) === 1
      setFlags(result, 'l')
      registers.flags.overflowFlag = false // V is always cleared
      return result
    },

    // Logical shift right byte
    lsr_b: (value: number, bits: number): number => {
      bits = bits & 7
      const byte = value & 0xff
      if (bits === 0) {
        registers.flags.carryFlag = false
        setFlags(byte, 'b')
        registers.flags.overflowFlag = false
        return byte
      }
      const result = byte >>> bits
      registers.flags.carryFlag = ((byte >> (bits - 1)) & 1) === 1
      setFlags(result, 'b')
      registers.flags.overflowFlag = false // V is always cleared
      return result
    },

    // Arithmetic shift right word (sign-extend)
    asr_w: (value: number, bits: number): number => {
      bits = bits & 15
      const word = value & 0xffff
      if (bits === 0) {
        registers.flags.carryFlag = false
        setFlags(word, 'w')
        registers.flags.overflowFlag = false
        return word
      }
      // Sign extend to 32-bit, shift, then mask back to 16-bit
      const signExtended = word | (word & 0x8000 ? 0xffff0000 : 0)
      const result = (signExtended >> bits) & 0xffff
      registers.flags.carryFlag = ((word >> (bits - 1)) & 1) === 1
      setFlags(result, 'w')
      registers.flags.overflowFlag = false // V is always cleared
      return result
    },

    // Arithmetic shift right long (sign-extend)
    asr_l: (value: number, bits: number): number => {
      bits = bits & 31
      if (bits === 0) {
        registers.flags.carryFlag = false
        setFlags(value, 'l')
        registers.flags.overflowFlag = false
        return value
      }
      // JavaScript >> operator already does arithmetic shift for 32-bit values
      const result = value >> bits
      registers.flags.carryFlag = ((value >> (bits - 1)) & 1) === 1
      setFlags(result, 'l')
      registers.flags.overflowFlag = false // V is always cleared
      return result
    },

    // Swap high and low words
    swap: (value: number): number => {
      const result = ((value >>> 16) | ((value & 0xffff) << 16)) >>> 0
      setFlags(result, 'l')
      registers.flags.carryFlag = false
      registers.flags.overflowFlag = false
      return result
    },

    // Negate word (2's complement)
    neg_w: (value: number): number => {
      const word = value & 0xffff
      const result = (~word + 1) & 0xffff

      setFlags(result, 'w')

      // V is set if negating the most negative number
      registers.flags.overflowFlag = word === 0x8000

      // C is set if the result is non-zero (i.e., a borrow occurred)
      // This is the same as the logical NOT of the Z flag.
      registers.flags.carryFlag = !registers.flags.zeroFlag

      return result
    },

    // Add quick word
    addq_w: (dest: RegisterName, value: number): void => {
      const current = getReg(dest) & 0xffff
      const operand = value & 0xffff
      const result = (current + operand) & 0xffff

      setReg(dest, result)
      setFlags(result, 'w')

      const srcN = (current & 0x8000) !== 0
      const opN = (operand & 0x8000) !== 0
      const resN = (result & 0x8000) !== 0

      // V is set if we add two numbers of the same sign and the result's sign is different.
      registers.flags.overflowFlag = srcN === opN && srcN !== resN
      // C is set if the unsigned result is smaller than an operand.
      registers.flags.carryFlag = result < current
    },

    // Subtract quick word
    subq_w: (dest: RegisterName, value: number): void => {
      const current = getReg(dest) & 0xffff
      const operand = value & 0xffff
      const result = (current - operand) & 0xffff

      setReg(dest, result)
      setFlags(result, 'w')

      const dstN = (current & 0x8000) !== 0
      const srcN = (operand & 0x8000) !== 0
      const resN = (result & 0x8000) !== 0

      // V is set if we subtract a number from one of an opposite sign and the result has the same sign as the source.
      registers.flags.overflowFlag = dstN !== srcN && resN === srcN
      // C is set if a borrow was needed (unsigned).
      registers.flags.carryFlag = operand > current
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
      const newValue = (current - 1) & 0xffff
      setReg(counter, newValue)
      return newValue !== 0xffff
    },

    // Decrement and branch if not equal
    // DBNE has "opposite sense" - it exits when condition is TRUE (Z=0)
    // When Z=0 (not equal), exit without decrementing
    // When Z=1 (equal), decrement and potentially branch
    dbne: (counter: RegisterName): boolean => {
      if (!registers.flags.zeroFlag) {
        // Condition is true (not equal), exit immediately without decrementing
        return false
      }
      // Condition is false (equal), decrement and check
      const current = getReg(counter)
      const newValue = (current - 1) & 0xffff
      setReg(counter, newValue)
      return newValue !== 0xffff  // Branch if not -1
    },

    // Decrement and branch if carry clear
    // DBCS actually means "Decrement and Branch if Carry Clear" (CS = Carry Set is the exit condition)
    // When C=1 (carry set), exit without decrementing
    // When C=0 (carry clear), decrement and potentially branch
    dbcs: (counter: RegisterName): boolean => {
      if (registers.flags.carryFlag) {
        // Condition is true (carry set), exit immediately without decrementing
        return false
      }
      // Condition is false (carry clear), decrement and check
      const current = getReg(counter)
      const newValue = (current - 1) & 0xffff
      setReg(counter, newValue)
      return newValue !== 0xffff  // Branch if not -1
    },

    // Branch if greater than
    bgt: (): boolean => {
      const { negativeFlag, zeroFlag, overflowFlag } = registers.flags
      // Condition for signed greater than is (N=V) and Z=0
      return negativeFlag === overflowFlag && !zeroFlag
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
