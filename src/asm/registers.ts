/**
 * @fileoverview 68K processor register types and state management
 */

// 68K processor register state
export type AsmRegisters = {
  // Data registers
  D0: number
  D1: number
  D2: number
  D3: number
  D4: number
  D5: number
  D6: number
  D7: number
  
  // Address registers
  A0: number
  A1: number
  A2: number
  A3: number
  A4: number
  A5: number
  A6: number
  A7: number
  
  // Status flags
  zeroFlag: boolean
  negativeFlag: boolean
  carryFlag: boolean
  overflowFlag: boolean
}

/**
 * Creates initial register state
 */
export const createRegisters = (): AsmRegisters => ({
  D0: 0,
  D1: 0,
  D2: 0,
  D3: 0,
  D4: 0,
  D5: 0,
  D6: 0,
  D7: 0,
  A0: 0,
  A1: 0,
  A2: 0,
  A3: 0,
  A4: 0,
  A5: 0,
  A6: 0,
  A7: 0,
  zeroFlag: false,
  negativeFlag: false,
  carryFlag: false,
  overflowFlag: false
})