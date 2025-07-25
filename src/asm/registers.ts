/**
 * @fileoverview 68K processor register types and state management
 */

export type DataRegisterName =
  | 'D0'
  | 'D1'
  | 'D2'
  | 'D3'
  | 'D4'
  | 'D5'
  | 'D6'
  | 'D7'
export type AddressRegisterName =
  | 'A0'
  | 'A1'
  | 'A2'
  | 'A3'
  | 'A4'
  | 'A5'
  | 'A6'
  | 'A7'
export type RegisterName = DataRegisterName | AddressRegisterName

export type DataRegisters = {
  [key in DataRegisterName]: number
}

export type AddressRegisters = {
  [key in AddressRegisterName]: number
}

export type StatusFlags = {
  zeroFlag: boolean
  negativeFlag: boolean
  carryFlag: boolean
  overflowFlag: boolean
}

// 68K processor register state
export type AsmRegisters = {
  data: DataRegisters
  address: AddressRegisters
  flags: StatusFlags
}

/**
 * Creates initial register state
 */
export const createRegisters = (): AsmRegisters => ({
  data: {
    D0: 0,
    D1: 0,
    D2: 0,
    D3: 0,
    D4: 0,
    D5: 0,
    D6: 0,
    D7: 0
  },
  address: {
    A0: 0,
    A1: 0,
    A2: 0,
    A3: 0,
    A4: 0,
    A5: 0,
    A6: 0,
    A7: 0
  },
  flags: {
    zeroFlag: false,
    negativeFlag: false,
    carryFlag: false,
    overflowFlag: false
  }
})
