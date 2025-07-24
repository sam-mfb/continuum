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

    it('dbne should exit immediately when condition is true (Z=0)', () => {
      // DBNE = Decrement and Branch if Not Equal
      // When Z=0 (not equal), the condition is TRUE, so it should exit without decrementing
      registers.data.D0 = 3
      registers.flags.zeroFlag = false  // Not equal condition
      expect(instructions.dbne('D0')).toBe(false)  // Should NOT branch
      expect(registers.data.D0).toBe(3)  // Should NOT decrement
    })

    it('dbne should decrement and branch when condition is false (Z=1)', () => {
      // When Z=1 (equal), the condition is FALSE, so it should decrement and potentially branch
      registers.data.D0 = 3
      registers.flags.zeroFlag = true  // Equal condition (not equal is false)
      expect(instructions.dbne('D0')).toBe(true)  // Should branch (counter becomes 2, not -1)
      expect(registers.data.D0).toBe(2)  // Should decrement

      // Continue with Z=1, should keep decrementing
      expect(instructions.dbne('D0')).toBe(true)  // Should branch (counter becomes 1, not -1)
      expect(registers.data.D0).toBe(1)
      
      expect(instructions.dbne('D0')).toBe(true)  // Should branch (counter becomes 0, not -1)
      expect(registers.data.D0).toBe(0)
      
      expect(instructions.dbne('D0')).toBe(false)  // Should NOT branch (counter becomes -1/0xffff)
      expect(registers.data.D0).toBe(0xffff)
    })

    it('dbne complex control flow example from sseBlack', () => {
      // This tests the exact pattern used in sseBlack.ts @loop1
      // Pattern: tst.b D1, dbne len, @loop1, beq.s @doend
      
      // Case 1: D1 low byte is non-zero (Z=0 after tst.b)
      registers.data.D7 = 5  // len counter
      registers.flags.zeroFlag = false  // tst.b D1 found non-zero
      const dbneResult1 = instructions.dbne('D7')
      expect(dbneResult1).toBe(false)  // Should exit without branching
      expect(registers.data.D7).toBe(5)  // Should NOT decrement
      // The beq.s @doend would not branch here (Z=0), so it falls through to swap/dbra
      
      // Case 2: D1 low byte is zero (Z=1 after tst.b)
      registers.data.D7 = 5  // len counter
      registers.flags.zeroFlag = true  // tst.b D1 found zero
      const dbneResult2 = instructions.dbne('D7')
      expect(dbneResult2).toBe(true)  // Should decrement and branch
      expect(registers.data.D7).toBe(4)  // Should decrement
      // Loop would continue from @loop1
      
      // Case 3: Counter exhaustion with Z=1
      registers.data.D7 = 0  // len counter about to expire
      registers.flags.zeroFlag = true  // tst.b D1 found zero
      const dbneResult3 = instructions.dbne('D7')
      expect(dbneResult3).toBe(false)  // Should NOT branch (counter becomes -1)
      expect(registers.data.D7).toBe(0xffff)  // Should decrement to -1
      // The beq.s @doend would branch here (Z=1), going to @doend
    })

    it('dbcs should exit immediately when carry is set', () => {
      // DBCS = Decrement and Branch if Carry Set is false (i.e., Carry Clear)
      // When C=1 (carry set), the condition is TRUE, so it should exit without decrementing
      registers.data.D0 = 3
      registers.flags.carryFlag = true  // Carry set
      expect(instructions.dbcs('D0')).toBe(false)  // Should NOT branch
      expect(registers.data.D0).toBe(3)  // Should NOT decrement
    })

    it('dbcs should decrement and branch when carry is clear', () => {
      // When C=0 (carry clear), the condition is FALSE, so it should decrement and potentially branch
      registers.data.D0 = 2
      registers.flags.carryFlag = false  // Carry clear
      expect(instructions.dbcs('D0')).toBe(true)  // Should branch (counter becomes 1, not -1)
      expect(registers.data.D0).toBe(1)  // Should decrement
      
      expect(instructions.dbcs('D0')).toBe(true)  // Should branch (counter becomes 0, not -1)
      expect(registers.data.D0).toBe(0)
      
      expect(instructions.dbcs('D0')).toBe(false)  // Should NOT branch (counter becomes -1/0xffff)
      expect(registers.data.D0).toBe(0xffff)
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
