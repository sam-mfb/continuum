import { describe, it, expect } from 'vitest'
import { createRegisters } from '../registers'
import { createInstructionSet } from '../instructions'

describe('68k instruction emulation', () => {
  describe('muls - signed multiply (16x16->32)', () => {
    it('multiplies two positive 16-bit values', () => {
      const registers = createRegisters()
      const instructions = createInstructionSet(registers)

      registers.data.D0 = 10
      registers.data.D1 = 20

      // muls D1, D0 - should multiply D0 by D1
      instructions.muls('D0', 'D1')

      expect(registers.data.D0).toBe(200) // 10 * 20 = 200
    })

    it('multiplies two negative 16-bit values', () => {
      const registers = createRegisters()
      const instructions = createInstructionSet(registers)

      registers.data.D0 = 0xfff6 // -10 in 16-bit two's complement
      registers.data.D1 = 0xffec // -20 in 16-bit two's complement

      // muls D1, D0 - should do signed multiply
      instructions.muls('D0', 'D1')

      expect(registers.data.D0).toBe(200) // (-10) * (-20) = 200
    })

    it('multiplies positive and negative values', () => {
      const registers = createRegisters()
      const instructions = createInstructionSet(registers)

      registers.data.D0 = 10
      registers.data.D1 = 0xffec // -20 in 16-bit two's complement

      instructions.muls('D0', 'D1')

      expect(registers.data.D0).toBe(-200) // 10 * (-20) = -200
      // In 32-bit two's complement: 0xFFFFFF38
    })

    it('squares a negative value correctly', () => {
      const registers = createRegisters()
      const instructions = createInstructionSet(registers)

      registers.data.D0 = 0xfff6 // -10 in 16-bit two's complement

      // muls D0, D0 - square the value
      instructions.muls('D0', 'D0')

      expect(registers.data.D0).toBe(100) // (-10) * (-10) = 100
    })

    it('handles large values that would overflow 16 bits', () => {
      const registers = createRegisters()
      const instructions = createInstructionSet(registers)

      registers.data.D0 = 300
      registers.data.D1 = 300

      instructions.muls('D0', 'D1')

      expect(registers.data.D0).toBe(90000) // 300 * 300 = 90000 (exceeds 16-bit)
    })
  })

  describe('neg.w - negate word', () => {
    it('negates a positive value', () => {
      const registers = createRegisters()
      const instructions = createInstructionSet(registers)

      registers.data.D0 = 10

      instructions.neg_w('D0')

      // Result should be -10, but stored as signed in JavaScript
      expect(registers.data.D0).toBe(-10)
    })

    it('negates a negative value', () => {
      const registers = createRegisters()
      const instructions = createInstructionSet(registers)

      registers.data.D0 = -10 // 0xFFFFFFF6 in 32-bit

      instructions.neg_w('D0')

      expect(registers.data.D0).toBe(10)
    })

    it('handles zero', () => {
      const registers = createRegisters()
      const instructions = createInstructionSet(registers)

      registers.data.D0 = 0

      instructions.neg_w('D0')

      expect(registers.data.D0).toBe(0)
    })

    it('only affects lower 16 bits of a 32-bit value', () => {
      const registers = createRegisters()
      const instructions = createInstructionSet(registers)

      registers.data.D0 = 0x12340010 // Upper bits should be cleared

      instructions.neg_w('D0')

      // Should negate lower 16 bits (0x0010 = 16)
      // Result: -16 (which is 0xFFFFFFF0 in unsigned representation)
      expect(registers.data.D0).toBe(-16)
    })
  })

  describe('add.w - add word preserving upper bits', () => {
    it('adds two 16-bit values', () => {
      const registers = createRegisters()
      const instructions = createInstructionSet(registers)

      registers.data.D0 = 100
      registers.data.D1 = 200

      instructions.add_w('D1', 'D0') // D0 = D0 + D1 (lower 16 bits)

      expect(registers.data.D0).toBe(300)
    })

    it('handles overflow to bit 16 correctly', () => {
      const registers = createRegisters()
      const instructions = createInstructionSet(registers)

      registers.data.D0 = 40000
      registers.data.D1 = 40000

      instructions.add_w('D1', 'D0')

      // 40000 + 40000 = 80000 = 0x13880
      // Lower 16 bits: 0x3880 = 14464
      expect(registers.data.D0 & 0xffff).toBe(14464)
    })

    it('preserves upper 16 bits of destination', () => {
      const registers = createRegisters()
      const instructions = createInstructionSet(registers)

      registers.data.D0 = 0x12340100 // Upper: 0x1234, Lower: 0x0100
      registers.data.D1 = 0x5678 // Will add this

      instructions.add_w('D1', 'D0')

      // Should preserve upper bits of D0, only modify lower 16
      // 0x0100 + 0x5678 = 0x5778
      expect(registers.data.D0).toBe(0x12345778)
    })
  })

  describe('cmp.w - signed word comparison', () => {
    it('compares equal values', () => {
      const registers = createRegisters()
      const instructions = createInstructionSet(registers)

      registers.data.D0 = 100
      registers.data.D1 = 100

      instructions.cmp_w('D0', 'D1') // Compare D1 - D0

      expect(registers.flags.zeroFlag).toBe(true)
      expect(registers.flags.negativeFlag).toBe(false)
    })

    it('compares D1 > D0 (positive values)', () => {
      const registers = createRegisters()
      const instructions = createInstructionSet(registers)

      registers.data.D0 = 50
      registers.data.D1 = 100

      instructions.cmp_w('D0', 'D1') // Compare D1 - D0

      expect(registers.flags.zeroFlag).toBe(false)
      expect(registers.flags.negativeFlag).toBe(false) // Result is positive
    })

    it('compares D1 < D0 (positive values)', () => {
      const registers = createRegisters()
      const instructions = createInstructionSet(registers)

      registers.data.D0 = 100
      registers.data.D1 = 50

      instructions.cmp_w('D0', 'D1') // Compare D1 - D0

      expect(registers.flags.zeroFlag).toBe(false)
      expect(registers.flags.negativeFlag).toBe(true) // Result is negative
    })

    it('handles signed comparison correctly', () => {
      const registers = createRegisters()
      const instructions = createInstructionSet(registers)

      registers.data.D0 = 0xfff6 // -10 as 16-bit signed
      registers.data.D1 = 10

      instructions.cmp_w('D0', 'D1') // Compare 10 - (-10) = 20

      expect(registers.flags.zeroFlag).toBe(false)
      expect(registers.flags.negativeFlag).toBe(false) // 20 is positive

      // Now compare the other way
      instructions.cmp_w('D1', 'D0') // Compare (-10) - 10 = -20

      expect(registers.flags.zeroFlag).toBe(false)
      expect(registers.flags.negativeFlag).toBe(true) // -20 is negative
    })

    it('compares negative values correctly', () => {
      const registers = createRegisters()
      const instructions = createInstructionSet(registers)

      registers.data.D0 = 0xffec // -20 as 16-bit signed
      registers.data.D1 = 0xfff6 // -10 as 16-bit signed

      instructions.cmp_w('D0', 'D1') // Compare (-10) - (-20) = 10

      expect(registers.flags.zeroFlag).toBe(false)
      expect(registers.flags.negativeFlag).toBe(false) // 10 is positive
    })
  })

  describe('bgt - branch if greater than (signed)', () => {
    it('returns true when value is greater (positive)', () => {
      const registers = createRegisters()
      const instructions = createInstructionSet(registers)

      // Set up flags as if we just compared 100 with 50
      registers.flags.zeroFlag = false
      registers.flags.negativeFlag = false
      registers.flags.overflowFlag = false

      expect(instructions.bgt()).toBe(true)
    })

    it('returns false when value is less (negative result)', () => {
      const registers = createRegisters()
      const instructions = createInstructionSet(registers)

      // Set up flags as if we just compared 50 with 100
      registers.flags.zeroFlag = false
      registers.flags.negativeFlag = true
      registers.flags.overflowFlag = false

      expect(instructions.bgt()).toBe(false)
    })

    it('returns false when values are equal', () => {
      const registers = createRegisters()
      const instructions = createInstructionSet(registers)

      // Set up flags as if we just compared equal values
      registers.flags.zeroFlag = true
      registers.flags.negativeFlag = false
      registers.flags.overflowFlag = false

      expect(instructions.bgt()).toBe(false)
    })
  })
})
