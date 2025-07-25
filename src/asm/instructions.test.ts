/**
 * Tests for 68K instruction implementations
 */

import { describe, it, expect } from 'vitest'
import { createInstructionSet } from './instructions'
import { createRegisters } from './registers'

describe('68K Instructions', () => {
  describe('Shift and Rotate Instructions', () => {
    it('ror_w rotates word right and sets carry flag', () => {
      const registers = createRegisters()
      const instructions = createInstructionSet(registers)

      // Test rotating 0xF000 right by 2
      const result = instructions.ror_w(0xf000, 2)
      expect(result).toBe(0x3c00)
      expect(registers.flags.carryFlag).toBe(false) // bit 1 was 0

      // Test rotating 0x0003 right by 1
      const result2 = instructions.ror_w(0x0003, 1)
      expect(result2).toBe(0x8001)
      expect(registers.flags.carryFlag).toBe(true) // bit 0 was 1
    })

    it('ror_l rotates long right and sets carry flag', () => {
      const registers = createRegisters()
      const instructions = createInstructionSet(registers)

      // Test rotating
      const result = instructions.ror_l(0x80000001, 1)
      expect(result).toBe(0xc0000000)
      expect(registers.flags.carryFlag).toBe(true) // bit 0 was 1
    })

    it('asr_w performs arithmetic shift right on word', () => {
      const registers = createRegisters()
      const instructions = createInstructionSet(registers)

      // Test positive number
      expect(instructions.asr_w(0x4000, 2)).toBe(0x1000)

      // Test negative number (sign bit set)
      expect(instructions.asr_w(0x8000, 1)).toBe(0xc000) // Sign extended
      expect(instructions.asr_w(0xf000, 4)).toBe(0xff00) // Sign extended
    })

    it('asr_l performs arithmetic shift right on long', () => {
      const registers = createRegisters()
      const instructions = createInstructionSet(registers)

      // Test negative number - JavaScript >> returns signed result
      // 0x80000000 >> 1 = -1073741824 (0xc0000000 as signed)
      expect(instructions.asr_l(0x80000000, 1)).toBe(-1073741824)

      // For unsigned comparison, convert to unsigned
      expect(instructions.asr_l(0x80000000, 1) >>> 0).toBe(0xc0000000)
      expect(instructions.asr_l(0xf0000000, 4) >>> 0).toBe(0xff000000)
    })

    it('lsr_l performs logical shift right on long', () => {
      const registers = createRegisters()
      const instructions = createInstructionSet(registers)

      expect(instructions.lsr_l(0x80000000, 1)).toBe(0x40000000)
      expect(instructions.lsr_l(0xf0000000, 4)).toBe(0x0f000000)
    })
  })

  describe('Branch Instructions', () => {
    it('dbcs decrements and branches if carry is clear', () => {
      const registers = createRegisters()
      const instructions = createInstructionSet(registers)

      // Set D7 to 5
      registers.data.D7 = 5

      // With carry clear, should decrement and return true
      registers.flags.carryFlag = false
      expect(instructions.dbcs('D7')).toBe(true)
      expect(registers.data.D7).toBe(4)

      // With carry set, should return false without decrementing
      registers.flags.carryFlag = true
      expect(instructions.dbcs('D7')).toBe(false)
      expect(registers.data.D7).toBe(4) // Unchanged

      // Test wrap around at 0
      registers.data.D7 = 0
      registers.flags.carryFlag = false
      expect(instructions.dbcs('D7')).toBe(false)
      expect(registers.data.D7).toBe(0xffff)
    })
  })

  describe('Memory Operations', () => {
    it('and_l performs AND on long word in memory', () => {
      const registers = createRegisters()
      const instructions = createInstructionSet(registers)
      const memory = new Uint8Array([0xff, 0xff, 0xff, 0xff, 0x00])

      instructions.and_l(memory, 0, 0xf0f0f0f0)
      expect(memory[0]).toBe(0xf0)
      expect(memory[1]).toBe(0xf0)
      expect(memory[2]).toBe(0xf0)
      expect(memory[3]).toBe(0xf0)
      expect(memory[4]).toBe(0x00) // Unchanged
    })

    it('or_l performs OR on long word in memory', () => {
      const registers = createRegisters()
      const instructions = createInstructionSet(registers)
      const memory = new Uint8Array([0x0f, 0x0f, 0x0f, 0x0f, 0x00])

      instructions.or_l(memory, 0, 0xf0f0f0f0)
      expect(memory[0]).toBe(0xff)
      expect(memory[1]).toBe(0xff)
      expect(memory[2]).toBe(0xff)
      expect(memory[3]).toBe(0xff)
      expect(memory[4]).toBe(0x00) // Unchanged
    })

    it('or_w performs OR on word in memory', () => {
      const registers = createRegisters()
      const instructions = createInstructionSet(registers)
      const memory = new Uint8Array([0x0f, 0x0f, 0x00])

      instructions.or_w(memory, 0, 0xf0f0)
      expect(memory[0]).toBe(0xff)
      expect(memory[1]).toBe(0xff)
      expect(memory[2]).toBe(0x00) // Unchanged
    })

    it('or_b performs OR on byte in memory', () => {
      const registers = createRegisters()
      const instructions = createInstructionSet(registers)
      const memory = new Uint8Array([0x0f, 0x00])

      instructions.or_b(memory, 0, 0xf0)
      expect(memory[0]).toBe(0xff)
      expect(memory[1]).toBe(0x00) // Unchanged
    })

    it('respects memory bounds', () => {
      const registers = createRegisters()
      const instructions = createInstructionSet(registers)
      const memory = new Uint8Array([0xff, 0xff])

      // Should not crash when accessing out of bounds
      instructions.and_l(memory, 0, 0x00000000) // Would need 4 bytes
      expect(memory[0]).toBe(0xff) // Unchanged
      expect(memory[1]).toBe(0xff) // Unchanged
    })
  })
})
