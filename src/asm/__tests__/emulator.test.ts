import { describe, it, expect, beforeEach } from 'vitest'
import { createRegisters } from '../registers'
import { build68kArch } from '../emulator'
import { createInstructionSet } from '../instructions'
import type {
  AsmRegisters,
  RegisterName,
  DataRegisterName,
  AddressRegisterName
} from '../registers'

describe('ASM Emulator', () => {
  describe('createRegisters', () => {
    it('should initialize all data and address registers to 0', () => {
      const registers = createRegisters()
      for (let i = 0; i < 8; i++) {
        expect(registers.data[`D${i}` as DataRegisterName]).toBe(0)
        expect(registers.address[`A${i}` as AddressRegisterName]).toBe(0)
      }
    })

    it('should initialize all flags to false', () => {
      const registers = createRegisters()
      expect(registers.flags.zeroFlag).toBe(false)
      expect(registers.flags.negativeFlag).toBe(false)
      expect(registers.flags.carryFlag).toBe(false)
      expect(registers.flags.overflowFlag).toBe(false)
    })
  })

  describe('build68kArch', () => {
    it('should create an emulator with default registers', () => {
      const asm = build68kArch()
      expect(asm).toBeDefined()
      expect(asm.registers).toBeDefined()
      expect(asm.instructions).toBeDefined()
    })

    it('should apply an initial state', () => {
      const asm = build68kArch({
        data: { D0: 123, D1: 456 },
        address: { A0: 789 },
        flags: { zeroFlag: true }
      })
      expect(asm.registers.data.D0).toBe(123)
      expect(asm.registers.data.D1).toBe(456)
      expect(asm.registers.address.A0).toBe(789)
      expect(asm.registers.flags.zeroFlag).toBe(true)
    })

    it('should provide working register shortcuts', () => {
      const asm = build68kArch()
      asm.D0 = 123
      expect(asm.registers.data.D0).toBe(123)
      expect(asm.D0).toBe(123)
    })
  })

  describe('InstructionSet', () => {
    let registers: AsmRegisters
    let instructions: ReturnType<typeof createInstructionSet>

    beforeEach(() => {
      registers = createRegisters()
      instructions = createInstructionSet(registers)
    })

    it('ror_l should rotate right long', () => {
      expect(instructions.ror_l(0b10000000000000000000000000000001, 1)).toBe(
        0b11000000000000000000000000000000
      )
      expect(instructions.ror_l(0x1, 1)).toBe(0x80000000)
      expect(instructions.ror_l(0x12345678, 4)).toBe(0x81234567)
      expect(instructions.ror_l(0x12345678, 0)).toBe(0x12345678)
      expect(instructions.ror_l(0x12345678, 32)).toBe(0x12345678)
    })

    it('lsr_w should logical shift right word', () => {
      expect(instructions.lsr_w(0b1111000011110000, 4)).toBe(0b0000111100001111)
      expect(instructions.lsr_w(0x1000, 1)).toBe(0x0800)
      expect(instructions.lsr_w(0x1, 1)).toBe(0x0)
    })

    it('swap should swap high and low words', () => {
      expect(instructions.swap(0x12345678)).toBe(0x56781234)
      expect(instructions.swap(0x0000ffff)).toBe(0xffff0000)
    })

    it('tst_b should set flags correctly', () => {
      instructions.tst_b(0)
      expect(registers.flags.zeroFlag).toBe(true)
      expect(registers.flags.negativeFlag).toBe(false)

      instructions.tst_b(10)
      expect(registers.flags.zeroFlag).toBe(false)
      expect(registers.flags.negativeFlag).toBe(false)

      instructions.tst_b(0b10000000)
      expect(registers.flags.zeroFlag).toBe(false)
      expect(registers.flags.negativeFlag).toBe(true)
    })

    it('dbra should decrement and branch', () => {
      registers.data.D0 = 2
      expect(instructions.dbra('D0')).toBe(true) // counter becomes 1, returns true
      expect(registers.data.D0).toBe(1)
      expect(instructions.dbra('D0')).toBe(true) // counter becomes 0, returns true
      expect(registers.data.D0).toBe(0)
      expect(instructions.dbra('D0')).toBe(false) // counter becomes -1 (0xffff), returns false
      expect(registers.data.D0).toBe(0xffff)
      expect(instructions.dbra('D0')).toBe(true) // counter was -1, becomes -2, returns true
      expect(registers.data.D0).toBe(0xfffe)
    })

    it('dbne should decrement and branch if not equal', () => {
      registers.data.D0 = 3
      registers.flags.zeroFlag = false
      expect(instructions.dbne('D0')).toBe(true)
      expect(registers.data.D0).toBe(2)

      registers.flags.zeroFlag = true
      expect(instructions.dbne('D0')).toBe(false)
      expect(registers.data.D0).toBe(2) // Should not decrement
    })

    it('memory operations should work correctly', () => {
      const memory = new Uint8Array([0, 0, 0, 0, 0, 0, 0, 0])

      instructions.eor_l(memory, 0, 0xffffffff)
      expect(memory).toEqual(
        new Uint8Array([0xff, 0xff, 0xff, 0xff, 0, 0, 0, 0])
      )

      instructions.eor_w(memory, 4, 0xffff)
      expect(memory).toEqual(
        new Uint8Array([0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0, 0])
      )

      instructions.and_w(memory, 0, 0x00ff)
      expect(memory).toEqual(
        new Uint8Array([0x00, 0xff, 0xff, 0xff, 0xff, 0xff, 0, 0])
      )
    })

    it('getReg and setReg should work correctly', () => {
      instructions.setReg('D1', 999)
      expect(instructions.getReg('D1')).toBe(999)
      instructions.setReg('A2', 888)
      expect(instructions.getReg('A2')).toBe(888)
      expect(() => instructions.getReg('Invalid' as RegisterName)).toThrow()
    })
  })
})
